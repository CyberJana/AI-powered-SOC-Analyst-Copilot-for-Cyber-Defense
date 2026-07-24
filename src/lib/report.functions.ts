import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Msg = { role: string; content: string; parts: unknown };

export const generateThreadReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { threadId: string }) =>
    z.object({ threadId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: thread, error: tErr } = await supabase
      .from("threads")
      .select("id,title,created_at,updated_at")
      .eq("id", data.threadId)
      .single();
    if (tErr || !thread) throw new Error(tErr?.message ?? "Thread not found");

    const { data: rows, error: mErr } = await supabase
      .from("messages")
      .select("role,content,parts,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    const messages = (rows ?? []) as (Msg & { created_at: string })[];

    if (messages.length === 0) {
      return {
        thread: { id: thread.id, title: thread.title, generated_at: new Date().toISOString() },
        summary: "No investigation activity yet.",
        ttps: [] as { id: string; name: string; rationale: string }[],
        detections: [] as { name: string; logic: string; data_source: string }[],
        iocs: [] as { type: string; value: string }[],
        recommendations: [] as string[],
        transcript: [] as { role: string; text: string }[],
      };
    }

    // Build transcript text (plain text only)
    const transcript = messages.map((m) => {
      let text = m.content ?? "";
      if (!text && Array.isArray(m.parts)) {
        text = (m.parts as { type?: string; text?: string }[])
          .filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n");
      }
      return { role: m.role, text };
    });

    const transcriptForAI = transcript
      .map((t) => `[${t.role.toUpperCase()}]\n${t.text}`)
      .join("\n\n---\n\n")
      .slice(0, 24000);

    const prompt = `You are a senior SOC analyst. Read the following investigation transcript and produce a structured incident report.

Return ONLY valid JSON matching this exact shape, no prose, no code fences:
{
  "summary": "string — 2-4 sentence executive summary of what was investigated and key findings",
  "ttps": [{ "id": "MITRE technique ID like T1003.001 or empty", "name": "technique name", "rationale": "why it applies (1 sentence)" }],
  "detections": [{ "name": "short detection name", "logic": "concrete detection logic / query / rule sketch", "data_source": "e.g. Sysmon EID 10, Zeek conn.log, EDR process events" }],
  "iocs": [{ "type": "ip|domain|hash|file|user|other", "value": "the indicator" }],
  "recommendations": ["actionable recommendation 1", "..."]
}

Investigation title: ${thread.title}

Transcript:
${transcriptForAI}`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You produce concise, technically precise SOC incident reports as strict JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`AI gateway error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      summary?: string;
      ttps?: { id?: string; name?: string; rationale?: string }[];
      detections?: { name?: string; logic?: string; data_source?: string }[];
      iocs?: { type?: string; value?: string }[];
      recommendations?: string[];
    } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to salvage JSON between first { and last }
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(content.slice(start, end + 1)); } catch { /* ignore */ }
      }
    }

    return {
      thread: { id: thread.id, title: thread.title, generated_at: new Date().toISOString() },
      summary: parsed.summary ?? "No summary produced.",
      ttps: (parsed.ttps ?? []).map((t) => ({
        id: t.id ?? "",
        name: t.name ?? "",
        rationale: t.rationale ?? "",
      })),
      detections: (parsed.detections ?? []).map((d) => ({
        name: d.name ?? "",
        logic: d.logic ?? "",
        data_source: d.data_source ?? "",
      })),
      iocs: (parsed.iocs ?? []).map((i) => ({ type: i.type ?? "other", value: i.value ?? "" })),
      recommendations: parsed.recommendations ?? [],
      transcript,
    };
  });
