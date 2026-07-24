import { jsPDF } from "jspdf";

type Report = {
  thread: { id: string; title: string; generated_at: string };
  summary: string;
  ttps: { id: string; name: string; rationale: string }[];
  detections: { name: string; logic: string; data_source: string }[];
  iocs: { type: string; value: string }[];
  recommendations: string[];
  transcript: { role: string; text: string }[];
};

const MARGIN = 48;
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Crimson palette to match the "Blood Red Ops" theme
const COLORS = {
  bg: [10, 0, 0] as [number, number, number],
  panel: [26, 5, 5] as [number, number, number],
  accent: [230, 57, 70] as [number, number, number],
  text: [240, 235, 235] as [number, number, number],
  muted: [170, 150, 150] as [number, number, number],
};

export function buildReportPdf(r: Report): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  const drawPageBg = () => {
    doc.setFillColor(...COLORS.bg);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    // accent bar
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, 4, PAGE_H, "F");
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      drawPageBg();
      y = MARGIN;
    }
  };

  const setText = (rgb: [number, number, number], size: number, weight: "normal" | "bold" = "normal") => {
    doc.setTextColor(...rgb);
    doc.setFontSize(size);
    doc.setFont("helvetica", weight);
  };

  const writeWrapped = (text: string, size: number, rgb: [number, number, number], weight: "normal" | "bold" = "normal", indent = 0) => {
    setText(rgb, size, weight);
    const lines = doc.splitTextToSize(text || "—", CONTENT_W - indent);
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, MARGIN + indent, y);
      y += size + 4;
    }
  };

  const heading = (text: string) => {
    ensureSpace(40);
    y += 6;
    setText(COLORS.accent, 13, "bold");
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 6;
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 14;
  };

  drawPageBg();

  // Header
  setText(COLORS.muted, 9, "normal");
  doc.text("SENTINEL // AI SOC REPORT", MARGIN, y);
  doc.text(
    new Date(r.thread.generated_at).toLocaleString(),
    PAGE_W - MARGIN,
    y,
    { align: "right" },
  );
  y += 22;

  setText(COLORS.text, 22, "bold");
  const titleLines = doc.splitTextToSize(r.thread.title, CONTENT_W);
  for (const l of titleLines) {
    ensureSpace(28);
    doc.text(l, MARGIN, y);
    y += 26;
  }
  setText(COLORS.muted, 9, "normal");
  doc.text(`Thread ID: ${r.thread.id}`, MARGIN, y);
  y += 18;

  heading("Executive Summary");
  writeWrapped(r.summary, 11, COLORS.text);

  heading("Key TTPs (MITRE ATT&CK)");
  if (r.ttps.length === 0) writeWrapped("None identified.", 10, COLORS.muted);
  for (const t of r.ttps) {
    ensureSpace(40);
    const label = [t.id, t.name].filter(Boolean).join(" — ") || "Technique";
    writeWrapped(`• ${label}`, 11, COLORS.accent, "bold");
    if (t.rationale) writeWrapped(t.rationale, 10, COLORS.text, "normal", 12);
    y += 4;
  }

  heading("Recommended Detections");
  if (r.detections.length === 0) writeWrapped("None proposed.", 10, COLORS.muted);
  for (const d of r.detections) {
    ensureSpace(50);
    writeWrapped(`• ${d.name || "Detection"}`, 11, COLORS.accent, "bold");
    if (d.data_source) writeWrapped(`Data source: ${d.data_source}`, 9, COLORS.muted, "normal", 12);
    if (d.logic) writeWrapped(d.logic, 10, COLORS.text, "normal", 12);
    y += 4;
  }

  heading("Indicators of Compromise");
  if (r.iocs.length === 0) writeWrapped("None extracted.", 10, COLORS.muted);
  for (const i of r.iocs) {
    writeWrapped(`• [${i.type}] ${i.value}`, 10, COLORS.text);
  }

  heading("Recommendations");
  if (r.recommendations.length === 0) writeWrapped("No recommendations.", 10, COLORS.muted);
  r.recommendations.forEach((rec, idx) => {
    writeWrapped(`${idx + 1}. ${rec}`, 10, COLORS.text);
  });

  heading("Investigation Transcript");
  if (r.transcript.length === 0) writeWrapped("Empty transcript.", 10, COLORS.muted);
  for (const m of r.transcript) {
    ensureSpace(30);
    writeWrapped(m.role.toUpperCase(), 9, COLORS.accent, "bold");
    writeWrapped(m.text || "(no text)", 9, COLORS.text);
    y += 6;
  }

  // Footer page numbers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    setText(COLORS.muted, 8, "normal");
    doc.text(`Page ${p} / ${total}`, PAGE_W - MARGIN, PAGE_H - 20, { align: "right" });
    doc.text("CONFIDENTIAL — SENTINEL SOC", MARGIN, PAGE_H - 20);
  }

  return doc;
}

export function downloadReportPdf(r: Report) {
  const doc = buildReportPdf(r);
  const safe = (r.thread.title || "investigation").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
  doc.save(`sentinel_${safe}_${r.thread.id.slice(0, 8)}.pdf`);
}
