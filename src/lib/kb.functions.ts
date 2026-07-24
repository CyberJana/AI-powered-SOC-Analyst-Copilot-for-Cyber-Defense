import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const searchKb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; limit?: number }) =>
    z.object({ query: z.string().min(1).max(500), limit: z.number().min(1).max(10).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 5;
    const tokens = data.query
      .toLowerCase()
      .replace(/[^a-z0-9\s.-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .slice(0, 8)
      .join(" | ");
    if (!tokens) return { results: [] };
    const { data: rows, error } = await context.supabase
      .from("kb_documents")
      .select("id,title,mitre_id,tactic,technique,source,content")
      .textSearch("tsv", tokens, { type: "websearch", config: "english" })
      .limit(limit);
    if (error) {
      // fallback to ilike
      const { data: rows2 } = await context.supabase
        .from("kb_documents")
        .select("id,title,mitre_id,tactic,technique,source,content")
        .or(`title.ilike.%${data.query}%,content.ilike.%${data.query}%,mitre_id.ilike.%${data.query}%`)
        .limit(limit);
      return { results: rows2 ?? [] };
    }
    return { results: rows ?? [] };
  });

export const listKb = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("kb_documents")
      .select("id,title,mitre_id,tactic,technique,source,is_global,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { docs: data ?? [] };
  });

export const addKb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; content: string; source?: string; mitre_id?: string; tactic?: string; technique?: string }) =>
    z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1).max(20000),
      source: z.string().max(200).optional(),
      mitre_id: z.string().max(20).optional(),
      tactic: z.string().max(100).optional(),
      technique: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("kb_documents").insert({
      user_id: context.userId,
      is_global: false,
      title: data.title,
      content: data.content,
      source: data.source ?? null,
      mitre_id: data.mitre_id ?? null,
      tactic: data.tactic ?? null,
      technique: data.technique ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });