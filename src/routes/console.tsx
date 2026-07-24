import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread, deleteThread, getMessages } from "@/lib/threads.functions";
import { generateThreadReport } from "@/lib/report.functions";
import { downloadReportPdf } from "@/lib/report-pdf";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Plus, Trash2, LogOut, Send, Loader2, Wrench, BookOpen, FileDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/console")({ component: ConsolePage });

type Thread = { id: string; title: string; updated_at: string };

function ConsolePage() {
  const nav = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialMsgs, setInitialMsgs] = useState<UIMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const fnList = useServerFn(listThreads);
  const fnCreate = useServerFn(createThread);
  const fnDelete = useServerFn(deleteThread);
  const fnGetMsgs = useServerFn(getMessages);
  const fnReport = useServerFn(generateThreadReport);
  const [reporting, setReporting] = useState(false);

  const activeThread = threads.find((t) => t.id === activeId);

  async function handleGenerateReport() {
    if (!activeId) return;
    setReporting(true);
    const tid = toast.loading("Generating SOC report…");
    try {
      const report = await fnReport({ data: { threadId: activeId } });
      downloadReportPdf(report);
      toast.success("Report downloaded", { id: tid });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report failed", { id: tid });
    } finally {
      setReporting(false);
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      setToken(session?.access_token ?? null);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setToken(data.session?.access_token ?? null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authReady && !signedIn) nav({ to: "/login" });
  }, [authReady, signedIn, nav]);

  async function refreshThreads(selectFirst = false) {
    try {
      const { threads } = await fnList({});
      setThreads(threads);
      if (selectFirst && threads[0]) setActiveId(threads[0].id);
      if (selectFirst && !threads[0]) {
        const { id } = await fnCreate({ data: {} });
        await refreshThreads();
        setActiveId(id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (signedIn) refreshThreads(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    fnGetMsgs({ data: { threadId: activeId } })
      .then(({ messages }) => {
        setInitialMsgs(
          messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            parts: (m.parts as UIMessage["parts"]) ?? [{ type: "text", text: m.content }],
          })),
        );
      })
      .finally(() => setLoadingMsgs(false));
  }, [activeId, fnGetMsgs]);

  if (!authReady) return <div className="min-h-screen grid place-items-center text-muted-foreground">Authenticating…</div>;
  if (!signedIn) return null;

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <aside className="w-72 border-r bg-sidebar flex flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div className="font-mono text-sm tracking-wider">SENTINEL</div>
        </div>
        <div className="p-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-primary text-primary-foreground"
            onClick={async () => {
              const { id } = await fnCreate({ data: {} });
              await refreshThreads();
              setActiveId(id);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
          <Button asChild size="sm" variant="outline" title="Knowledge base">
            <Link to="/knowledge"><BookOpen className="h-4 w-4" /></Link>
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-2 text-sm cursor-pointer ${
                  activeId === t.id ? "bg-sidebar-accent text-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
                onClick={() => setActiveId(t.id)}
              >
                <span className="flex-1 truncate">{t.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await fnDelete({ data: { id: t.id } });
                    if (activeId === t.id) setActiveId(null);
                    refreshThreads(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        {activeId && token ? (
          <>
            <div className="border-b bg-background/60 backdrop-blur px-4 py-2 flex items-center justify-between">
              <div className="text-sm font-mono text-muted-foreground truncate">
                {activeThread?.title ?? "Investigation"}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateReport}
                disabled={reporting}
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                {reporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                Generate PDF report
              </Button>
            </div>
            <ChatWindow key={activeId} threadId={activeId} token={token} initialMessages={initialMsgs} loading={loadingMsgs} />
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-muted-foreground">Select or create an investigation</div>
        )}
      </main>
    </div>
  );
}

function ChatWindow({ threadId, token, initialMessages, loading }: { threadId: string; token: string; initialMessages: UIMessage[]; loading: boolean }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      headers: () => ({ Authorization: `Bearer ${token}` }),
      body: () => ({ threadId }),
    }),
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: transport.current,
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { inputRef.current?.focus(); }, [threadId, status]);

  const isLoading = status === "submitted" || status === "streaming";

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto scanline">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {loading && <div className="text-muted-foreground text-sm">Loading transcript…</div>}
          {!loading && messages.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 mb-4 glow">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-gradient font-mono">SENTINEL ready</h2>
              <p className="text-muted-foreground mt-2 text-sm">Ask about MITRE techniques, IR procedures, threat hunts, or paste an alert.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-2 text-left text-sm">
                {[
                  "Triage a suspected phishing email with .iso attachment",
                  "Detect T1003 LSASS dumping with Sysmon",
                  "Hunt for C2 beaconing in proxy logs",
                  "IR plan for ransomware (T1486) on a file server",
                ].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-md border bg-card/50 px-3 py-2 hover:bg-card text-muted-foreground hover:text-foreground transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Thinking…
            </div>
          )}
          {error && <div className="text-destructive text-sm">{error.message}</div>}
        </div>
      </div>
      <form onSubmit={submit} className="border-t bg-background/80 backdrop-blur p-4">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e as unknown as React.FormEvent); }}
            rows={2}
            placeholder="Ask SENTINEL anything about the threat…"
            className="flex-1 resize-none rounded-md border bg-input/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground glow">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
}

function Message({ m }: { m: UIMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : ""}>
      <div className={isUser ? "max-w-[80%] rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm" : "max-w-full"}>
        {m.parts.map((p, i) => {
          if (p.type === "text") {
            return isUser ? (
              <div key={i} className="whitespace-pre-wrap">{p.text}</div>
            ) : (
              <div key={i} className="prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1 prose-code:rounded">
                <ReactMarkdown>{p.text}</ReactMarkdown>
              </div>
            );
          }
          // tool parts
          const type = p.type as string;
          if (type.startsWith("tool-")) {
            const tp = p as unknown as { type: string; state?: string; input?: unknown; output?: { results?: { title: string; mitre_id?: string }[]; count?: number } };
            const name = type.replace("tool-", "");
            return (
              <details key={i} className="my-2 rounded-md border bg-card/50 px-3 py-2 text-xs">
                <summary className="cursor-pointer flex items-center gap-2 text-muted-foreground">
                  <Wrench className="h-3 w-3 text-accent" />
                  <span className="font-mono">{name}</span>
                  <span className="text-primary">{tp.output?.count !== undefined ? `${tp.output.count} hits` : tp.state}</span>
                </summary>
                <pre className="mt-2 overflow-auto text-[11px] text-muted-foreground">{JSON.stringify({ input: tp.input, output: tp.output }, null, 2)}</pre>
              </details>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}