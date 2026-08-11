"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, CloudSun, Download, ExternalLink, FileDown, FileSpreadsheet, Route, ScanLine, ShieldCheck, SlidersHorizontal, Sprout, Waves } from "lucide-react";

import OpenStreetMap from "@/components/open-street-map";
import { CHANGE_AREAS, runConstructionChangeDetection, type ChangeAreaKey, type ChangeDetectionConfig } from "@/lib/change-detection-engine";

type ReviewState = "Pending" | "Accepted" | "Rejected";

const DEFAULT_CONFIG: ChangeDetectionConfig = {
  area: "kigali-fringe",
  beforeDate: "2026-03-15",
  afterDate: "2026-08-02",
  threshold: 62,
  minimumFootprintM2: 100,
  cloudCoverPercent: 8,
  registrationErrorM: 1.2,
};

function downloadBlob(filename: string, body: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadChangePdf(lines: string[]) {
  const safeLines = lines.map((line) => line.replace(/[()\\]/g, (character) => `\\${character}`));
  let content = "BT /F1 11 Tf 48 780 Td";
  safeLines.forEach((line, index) => { content += `${index ? " 0 -18 Td" : ""} (${line}) Tj`; });
  content += " ET";
  const objects = ["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj", "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj", "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj", `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => { offsets.push(pdf.length); pdf += `${object}\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  downloadBlob("nla-construction-change-report-demo.pdf", pdf, "application/pdf");
}

export default function ChangeDetectionPage({ notify }: { notify: (message: string) => void }) {
  const [draft, setDraft] = useState(DEFAULT_CONFIG);
  const [active, setActive] = useState(DEFAULT_CONFIG);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const result = useMemo(() => runConstructionChangeDetection(active), [active]);

  function runComparison(event: FormEvent) {
    event.preventDefault();
    if (draft.afterDate <= draft.beforeDate) {
      notify("The after date must be later than the before date");
      return;
    }
    setActive({ ...draft });
    setReviews({});
    setReviewNotes({});
    notify("Synthetic change comparison recalculated in the browser");
  }

  function exportGeoJson() {
    const collection = {
      ...result.candidates,
      metadata: {
        tool: "NLA GeoAI deterministic change demonstration",
        parameters: active,
        equation: "score = 0.45 × edge delta + 0.35 × built-up delta + 0.20 × texture delta",
        qualityFactor: result.qualityFactor,
        generatedAt: new Date().toISOString(),
        disclaimer: "Synthetic demonstration observations. Officer verification and authoritative imagery are required.",
      },
      features: result.candidates.features.map((feature) => ({ ...feature, properties: { ...feature.properties, review: reviews[feature.properties.id] ?? "Pending", reviewerNote: reviewNotes[feature.properties.id] ?? "" } })),
    };
    downloadBlob("nla-change-candidates-demo.geojson", JSON.stringify(collection, null, 2), "application/geo+json");
    notify(`${result.candidateCount} candidate polygons exported as GeoJSON`);
  }

  function exportCsv() {
    const header = ["candidate_id", "parcel_upi", "district", "area_m2", "score", "confidence", "edge_delta", "built_up_delta", "texture_delta", "ndvi_loss_delta", "review", "reviewer_note", "provenance"];
    const rows = result.candidates.features.map(({ properties }) => [properties.id, properties.sourceUpi, properties.district, properties.areaM2, properties.score, properties.confidence, properties.edgeDelta, properties.builtUpDelta, properties.textureDelta, properties.vegetationDelta, reviews[properties.id] ?? "Pending", reviewNotes[properties.id] ?? "", properties.provenance]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadBlob("nla-change-candidates-demo.csv", csv, "text/csv;charset=utf-8");
    notify(`${result.candidateCount} candidate records exported as CSV`);
  }

  function exportPdf() {
    const candidateLines = result.candidates.features.slice(0, 12).map(({ properties }) => `${properties.id} | ${properties.sourceUpi} | ${properties.areaM2.toFixed(0)} m2 | score ${properties.score.toFixed(0)} | ${reviews[properties.id] ?? "Pending"}`);
    downloadChangePdf([
      "NLA GEOAI - CONSTRUCTION CHANGE SCREENING",
      "PROTOTYPE / SYNTHETIC OBSERVATIONS",
      "",
      `Area: ${CHANGE_AREAS[active.area].label}`,
      `Epochs: ${active.beforeDate} to ${active.afterDate}`,
      `Threshold: ${active.threshold}; minimum footprint: ${active.minimumFootprintM2} m2`,
      `Quality: cloud ${active.cloudCoverPercent}%; registration ${active.registrationErrorM.toFixed(1)} m`,
      `Candidates: ${result.candidateCount}; mapped footprint: ${result.totalAreaM2.toFixed(0)} m2`,
      "",
      "REVIEW QUEUE",
      ...candidateLines,
      "",
      "Equation: 0.45 edge + 0.35 built-up + 0.20 texture delta.",
      "Sources: ESA Sentinel-2 method guidance; synthetic parcel/wetland GeoJSON.",
      "DISCLAIMER: Demonstration output only. Verify with authoritative imagery,",
      "field evidence and an authorized NLA officer before any administrative action.",
    ]);
    notify("Traceable construction-change PDF downloaded");
  }

  const beforeCells = result.observations;

  return <div className="change-monitor">
    <section className="science-banner">
      <span><ShieldCheck size={19} aria-hidden /></span>
      <div><b>Functional scientific demonstration</b><p>Results are deterministic synthetic observations—not current satellite detections, legal evidence or an enforcement trigger.</p></div>
      <em>Runs locally · no API key</em>
    </section>

    <section className="change-workbench">
      <form className="change-controls panel" onSubmit={runComparison}>
        <div className="change-section-title"><span><SlidersHorizontal size={17} aria-hidden /></span><div><h2>Comparison setup</h2><p>Set the area, dates and screening sensitivity.</p></div></div>
        <label>Monitoring area<select value={draft.area} onChange={(event) => setDraft((current) => ({ ...current, area: event.target.value as ChangeAreaKey }))}>{Object.entries(CHANGE_AREAS).map(([key, area]) => <option value={key} key={key}>{area.label}</option>)}</select><small>{CHANGE_AREAS[draft.area].detail}</small></label>
        <div className="change-date-grid"><label>Before date<input type="date" value={draft.beforeDate} onChange={(event) => setDraft((current) => ({ ...current, beforeDate: event.target.value }))} /></label><label>After date<input type="date" value={draft.afterDate} onChange={(event) => setDraft((current) => ({ ...current, afterDate: event.target.value }))} /></label></div>
        <label>Detection threshold <output>{draft.threshold}/100</output><input aria-label="Detection threshold" type="range" min="35" max="85" value={draft.threshold} onChange={(event) => setDraft((current) => ({ ...current, threshold: Number(event.target.value) }))} /><small>Higher values return fewer, stronger candidates.</small></label>
        <label>Minimum footprint<select value={draft.minimumFootprintM2} onChange={(event) => setDraft((current) => ({ ...current, minimumFootprintM2: Number(event.target.value) }))}><option value="60">60 m²</option><option value="100">100 m²</option><option value="200">200 m²</option><option value="400">400 m²</option></select></label>
        <div className="change-date-grid"><label>Cloud estimate <output>{draft.cloudCoverPercent}%</output><input aria-label="Cloud estimate" type="range" min="0" max="45" value={draft.cloudCoverPercent} onChange={(event) => setDraft((current) => ({ ...current, cloudCoverPercent: Number(event.target.value) }))} /></label><label>Registration error <output>{draft.registrationErrorM.toFixed(1)} m</output><input aria-label="Registration error" type="range" min="0" max="6" step="0.2" value={draft.registrationErrorM} onChange={(event) => setDraft((current) => ({ ...current, registrationErrorM: Number(event.target.value) }))} /></label></div>
        <button className="primary-button change-run" type="submit"><ScanLine size={17} aria-hidden /> Run comparison</button>
      </form>

      <section className="change-output">
        <div className="epoch-comparison" aria-label="Synthetic before and after observation grid">
          <article><header><span>Before</span><b>{new Date(`${active.beforeDate}T12:00:00`).toLocaleDateString("en-RW", { dateStyle: "medium" })}</b></header><div className="observation-grid before-grid">{beforeCells.map((cell) => <i key={cell.id} style={{ opacity: 0.28 + cell.edgeDelta / 180 }} />)}</div><small>Synthetic baseline texture</small></article>
          <div className="epoch-arrow">→</div>
          <article><header><span>After</span><b>{new Date(`${active.afterDate}T12:00:00`).toLocaleDateString("en-RW", { dateStyle: "medium" })}</b></header><div className="observation-grid after-grid">{beforeCells.map((cell) => <i key={cell.id} className={cell.detected ? "detected" : ""} style={{ opacity: 0.28 + cell.builtUpDelta / 180 }} />)}</div><small>Orange cells exceed the active threshold</small></article>
        </div>
        <div className="change-map panel"><OpenStreetMap analysisFeatures={result.candidates} analysisLabelProperty="id" analysisColour="#e77817" visibleLayers={{ parcels: true, roads: true, wetlands: false, zoning: false, boundaries: false, osmPlaces: false }} highlightedUpis={result.affectedUpis} onNotify={notify} /></div>
      </section>
    </section>

    <section className="change-metrics" aria-label="Change analysis summary">
      <article><span><Building2 size={18} aria-hidden /></span><div><b>{result.candidateCount}</b><p>construction candidates</p></div><small>{result.affectedUpis.length} parcels flagged</small></article>
      <article><span><ScanLine size={18} aria-hidden /></span><div><b>{result.totalAreaM2.toFixed(0)} m²</b><p>candidate footprint</p></div><small>Geometry-derived total</small></article>
      <article><span><CheckCircle2 size={18} aria-hidden /></span><div><b>{result.meanConfidence.toFixed(0)}%</b><p>mean confidence</p></div><small>After quality penalties</small></article>
      <article><span><CloudSun size={18} aria-hidden /></span><div><b>{(result.qualityFactor * 100).toFixed(0)}%</b><p>quality factor</p></div><small>{active.cloudCoverPercent}% cloud estimate</small></article>
    </section>
    <section className="change-secondary-metrics" aria-label="Additional change screening indicators"><article><Sprout size={17} aria-hidden /><span><b>{result.vegetationLossHa.toFixed(2)} ha</b><small>NDVI-style vegetation-loss candidates</small></span></article><article><Route size={17} aria-hidden /><span><b>{result.roadLikeCandidates}</b><small>elongated / road-like candidates</small></span></article><article><Waves size={17} aria-hidden /><span><b>{result.wetlandAlerts}</b><small>wetland-reference intersections</small></span></article></section>

    <section className="change-science-grid">
      <article className="panel formula-card"><div className="change-section-title"><span>ƒx</span><div><h2>Transparent scoring model</h2><p>Every candidate uses the same published weighting.</p></div></div><code>score = 0.45 × Δedge + 0.35 × Δbuilt-up + 0.20 × Δtexture</code><p>Detected when <b>score ≥ {active.threshold}</b> and footprint <b>≥ {active.minimumFootprintM2} m²</b>.</p><p>Vegetation loss uses ΔNDVI = NDVI(before) − NDVI(after). Road-like screening flags rectangles with compactness = short side / long side &lt; 0.45.</p><p>Confidence = score × quality factor. Quality factor is reduced by the entered cloud cover and co-registration error.</p></article>
      <article className="panel quality-card"><div className="change-section-title"><span><AlertTriangle size={17} aria-hidden /></span><div><h2>Quality and limits</h2><p>Review these flags before interpreting results.</p></div></div>{result.qualityFlags.map((flag) => <p key={flag}><i />{flag}</p>)}<p><i />A 10 m open satellite pixel cannot by itself prove a small building or a legal violation.</p><p><i />Season, shadows, roof material and earthworks can produce false positives.</p></article>
    </section>

    <section className="method-sources" aria-label="Change detection method sources"><span>Method references</span><a href="https://sentinels.copernicus.eu/documents/247904/685211/Sentinel-2_User_Handbook" target="_blank" rel="noreferrer">ESA Sentinel-2 User Handbook <ExternalLink size={13} aria-hidden /></a><a href="https://pubs.usgs.gov/publication/70043719" target="_blank" rel="noreferrer">USGS multi-index change method <ExternalLink size={13} aria-hidden /></a><em>References guide a future imagery pipeline; current values remain synthetic.</em></section>

    <section className="panel candidate-panel">
      <div className="candidate-head"><div><h2>Officer review queue</h2><p>Candidate geometry and metrics are ready for human screening.</p></div><div><button onClick={exportPdf} disabled={!result.candidateCount}><FileDown size={15} aria-hidden /> PDF</button><button onClick={exportCsv} disabled={!result.candidateCount}><FileSpreadsheet size={15} aria-hidden /> CSV</button><button onClick={exportGeoJson} disabled={!result.candidateCount}><Download size={15} aria-hidden /> GeoJSON</button></div></div>
      <div className="candidate-table-wrap"><table><thead><tr><th>Candidate</th><th>Parcel</th><th>Area</th><th>Score</th><th>Confidence</th><th>Decision</th><th>Reviewer note</th></tr></thead><tbody>{result.candidates.features.map(({ properties }) => <tr key={properties.id}><td><b>{properties.id}</b><small>{properties.district}</small></td><td>{properties.sourceUpi}</td><td>{properties.areaM2.toFixed(0)} m²</td><td><span className="score-pill">{properties.score.toFixed(0)}</span></td><td>{properties.confidence.toFixed(0)}%</td><td><select aria-label={`Review decision for ${properties.id}`} value={reviews[properties.id] ?? "Pending"} onChange={(event) => setReviews((current) => ({ ...current, [properties.id]: event.target.value as ReviewState }))}><option>Pending</option><option>Accepted</option><option>Rejected</option></select></td><td><input aria-label={`Reviewer note for ${properties.id}`} value={reviewNotes[properties.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [properties.id]: event.target.value }))} placeholder="Add note…" /></td></tr>)}{!result.candidateCount && <tr><td colSpan={7} className="empty-candidates">No observations meet this threshold. Lower the threshold or minimum footprint to explore the model.</td></tr>}</tbody></table></div>
      <footer><AlertTriangle size={15} aria-hidden /> An accepted candidate is still only a screening result. Verify against authoritative imagery, field evidence and applicable NLA procedures.</footer>
    </section>
  </div>;
}
