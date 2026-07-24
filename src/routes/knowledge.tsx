import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listKb, addKb } from "@/lib/kb.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/knowledge")({ component: KbPage });

function KbPage() {
  const nav = useNavigate();
  const fnList = useServerFn(listKb);
  const fnAdd = useServerFn(addKb);
  const [docs, setDocs] = useState<Array<{ id: string; title: string; mitre_id: string | null; tactic: string | null; is_global: boolean }>>([]);
  const [form, setForm] = useState({ title: "", content: "", mitre_id: "", tactic: "", source: "" });

  async function refresh() {
    try { const { docs } = await fnList({}); setDocs(docs); } catch { /* ignore */ }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (!data.session) nav({ to: "/login" }); else refresh(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fnAdd({ data: form });
      toast.success("Added to knowledge base");
      setForm({ title: "", content: "", mitre_id: "", tactic: "", source: "" });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/console" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Console
          </Link>
          <div className="flex items-center gap-2 font-mono">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm tracking-wider">KNOWLEDGE BASE</span>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card/60 panel p-5">
            <h2 className="text-lg font-semibold mb-3 font-mono">Add custom intel</h2>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>MITRE ID</Label><Input placeholder="T1234" value={form.mitre_id} onChange={(e) => setForm({ ...form, mitre_id: e.target.value })} /></div>
                <div><Label>Tactic</Label><Input placeholder="Defense Evasion" value={form.tactic} onChange={(e) => setForm({ ...form, tactic: e.target.value })} /></div>
              </div>
              <div><Label>Source</Label><Input placeholder="Internal report / vendor" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              <div><Label>Content</Label><Textarea required rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <Button type="submit" className="bg-primary text-primary-foreground glow"><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </form>
          </div>
          <div className="rounded-xl border bg-card/60 panel p-5">
            <h2 className="text-lg font-semibold mb-3 font-mono">Indexed documents ({docs.length})</h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {docs.map((d) => (
                <div key={d.id} className="rounded-md border bg-background/40 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    {d.mitre_id && <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary">{d.mitre_id}</span>}
                    {d.is_global && <span className="text-[10px] uppercase tracking-wider text-accent">global</span>}
                  </div>
                  <div className="font-medium mt-1">{d.title}</div>
                  {d.tactic && <div className="text-xs text-muted-foreground mt-0.5">{d.tactic}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}