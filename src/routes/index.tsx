import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Shield, Brain, Database, Network, Workflow, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-mono">
          <Shield className="h-5 w-5 text-primary" />
          <span className="tracking-wider">SENTINEL</span>
          <span className="text-xs text-muted-foreground">// SOC.AI</span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
          <Button asChild className="bg-primary text-primary-foreground glow"><Link to="/console">Launch console</Link></Button>
        </div>
      </nav>
      <section className="px-6 pt-16 pb-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          AI-powered SOC automation · MITRE ATT&amp;CK · RAG
        </div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight font-mono">
          AI agents for <span className="text-gradient">cyber defense</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          A SOC analyst copilot that hunts threats, triages incidents, and maps activity to MITRE ATT&amp;CK — grounded in a curated threat-intelligence knowledge base.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground glow">
            <Link to="/console">Open SENTINEL</Link>
          </Button>
          <Button asChild size="lg" variant="outline"><Link to="/login">Create account</Link></Button>
        </div>
      </section>
      <section className="px-6 pb-24 max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
        {[
          { icon: Brain, t: "LLM reasoning", d: "Gemini-class model with SOC-tuned system prompts." },
          { icon: Database, t: "RAG over MITRE", d: "Retrieves ATT&CK techniques + IR playbooks per query." },
          { icon: Search, t: "Threat hunting", d: "Beaconing patterns, IOCs, KQL/Sigma suggestions." },
          { icon: Workflow, t: "IR playbooks", d: "Triage → Contain → Eradicate → Recover, on demand." },
          { icon: Network, t: "Detection eng.", d: "Generates detection logic mapped to data sources." },
          { icon: Shield, t: "Custom intel", d: "Upload your own threat intel into the vector KB." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-xl border bg-card/60 backdrop-blur p-5 panel">
            <Icon className="h-5 w-5 text-primary mb-3" />
            <div className="font-mono text-sm">{t}</div>
            <div className="text-sm text-muted-foreground mt-1">{d}</div>
          </div>
        ))}
      </section>
      <footer className="px-6 py-8 text-center text-xs text-muted-foreground font-mono">
        SENTINEL · AI Agent-Based Cyber Defense &amp; SOC Automation
      </footer>
    </div>
  );
}
