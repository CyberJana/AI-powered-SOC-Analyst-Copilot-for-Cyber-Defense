import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are SENTINEL, an AI cyber-defense analyst built for SOC operations.
You help with threat hunting, incident response, MITRE ATT&CK mapping, detection engineering, digital forensics, and SOC automation.

RULES:
- Always think like a SOC L2/L3 analyst. Be precise, technical, and operational.
- Whenever the user mentions a TTP, technique, IOC, attacker behavior, MITRE technique, malware family, or asks "how do I detect/respond to X" — call the search_knowledge_base tool to retrieve relevant intelligence BEFORE answering.
- Cite retrieved knowledge inline like [T1566] or [Source: SANS FOR508].
- Structure incident-response answers with: Triage → Containment → Eradication → Recovery → Lessons Learned.
- For detections, propose KQL/SPL/Sigma logic where useful.
- Never invent CVEs or MITRE IDs. If unsure, say so.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        const body = (await request.json()) as { messages: UIMessage[]; threadId: string };
        const { messages, threadId } = body;
        if (!threadId || !Array.isArray(messages)) {
          return new Response("Bad request", { status: 400 });
        }

        // Verify thread ownership
        const { data: thread } = await userClient.from("threads").select("id,title").eq("id", threadId).single();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Persist last user message
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const text = lastUser.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          await userClient.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "user",
            parts: lastUser.parts as never,
            content: text,
          });
          // Auto-title on first user message
          if (thread.title === "New investigation" && text.length > 0) {
            await userClient
              .from("threads")
              .update({ title: text.slice(0, 80) })
              .eq("id", threadId);
          }
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const tools = {
          search_knowledge_base: tool({
            description:
              "Search the cyber threat intelligence knowledge base (MITRE ATT&CK, SOC playbooks, IR procedures, DFIR artifacts, IOCs). Use whenever the user asks about a technique, threat, detection, or response procedure.",
            inputSchema: z.object({
              query: z.string().describe("Threat / technique / TTP / keyword to search"),
            }),
            execute: async ({ query }) => {
              const tokens = query
                .toLowerCase()
                .replace(/[^a-z0-9\s.-]/g, " ")
                .split(/\s+/)
                .filter((t) => t.length > 1)
                .slice(0, 8)
                .join(" | ");
              const { data, error } = await supabaseAdmin
                .from("kb_documents")
                .select("title,mitre_id,tactic,technique,source,content")
                .or(`is_global.eq.true,user_id.eq.${userId}`)
                .textSearch("tsv", tokens || query, { type: "websearch", config: "english" })
                .limit(5);
              if (error || !data || data.length === 0) {
                const { data: fb } = await supabaseAdmin
                  .from("kb_documents")
                  .select("title,mitre_id,tactic,technique,source,content")
                  .or(`is_global.eq.true,user_id.eq.${userId}`)
                  .or(`title.ilike.%${query}%,content.ilike.%${query}%,mitre_id.ilike.%${query}%`)
                  .limit(5);
                return { results: fb ?? [], count: fb?.length ?? 0 };
              }
              return { results: data, count: data.length };
            },
          }),
        };

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          tools,
          stopWhen: stepCountIs(50),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            try {
              const text = responseMessage.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              await userClient.from("messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                parts: responseMessage.parts as never,
                content: text,
              });
              await userClient.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
            } catch (e) {
              console.error("persist assistant failed", e);
            }
          },
        });
      },
    },
  },
});