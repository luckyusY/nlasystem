"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Braces, Database, ExternalLink, RefreshCw, Server, ShieldCheck, X } from "lucide-react";

import type { RwandaOnlineMapLayer } from "@/lib/rwanda-map-catalog";

type Inspection = {
  protocol: string;
  liveStatus?: "Available" | "Unavailable";
  checkedAt: string;
  serviceTitle: string;
  description?: string;
  layers?: Array<string | { id: number; name: string }>;
  crs?: string[];
  formats?: string[];
  bounds?: unknown;
  fields?: Array<{ name: string; alias?: string; type?: string }>;
  operations?: string[];
  copyright?: string;
  licence?: string;
  warning?: string;
};

function values(items: Inspection["layers"]) {
  return (items ?? []).map((item) => typeof item === "string" ? item : `${item.id} · ${item.name}`);
}

export default function SourceMetadataDialog({ layer, onClose }: { layer: RwandaOnlineMapLayer; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12_000);
    void fetch(`/api/sources/inspect?id=${encodeURIComponent(layer.id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as Inspection & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Source metadata inspection failed");
        setInspection(data); setError("");
      })
      .catch((reason: unknown) => setError(reason instanceof Error && reason.name !== "AbortError" ? reason.message : "The source did not respond before the 12 second timeout."))
      .finally(() => window.clearTimeout(timer));
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attempt, layer.id]);

  return createPortal(<div className="modal-backdrop source-inspector-backdrop" role="presentation">
    <section className="source-inspector" role="dialog" aria-modal="true" aria-labelledby="source-inspector-title">
      <header><span><Server size={19} aria-hidden /></span><div><p>{layer.kind === "wms" ? "OGC service inspection" : "ArcGIS REST inspection"}</p><h2 id="source-inspector-title">{layer.title}</h2></div><button onClick={onClose} aria-label="Close source metadata"><X size={18} aria-hidden /></button></header>
      {!inspection && !error && <div className="source-inspector-loading" role="status"><RefreshCw className="spin" size={22} aria-hidden /><b>Reading live service metadata…</b><span>Timeout and one controlled retry are enabled.</span></div>}
      {error && <div className="source-inspector-error" role="alert"><ShieldCheck size={22} aria-hidden /><h3>Metadata temporarily unavailable</h3><p>{error}</p><button onClick={() => { setInspection(null); setError(""); setAttempt((value) => value + 1); }}><RefreshCw size={14} aria-hidden />Try again</button></div>}
      {inspection && <div className="source-inspector-body">
        <div className={`source-inspector-summary ${inspection.liveStatus === "Unavailable" ? "degraded" : ""}`}><span><Database size={17} aria-hidden /></span><p><b>{inspection.serviceTitle}</b><small>{inspection.protocol} · {inspection.liveStatus === "Unavailable" ? "configured fallback" : "live metadata"} · checked {new Date(inspection.checkedAt).toLocaleString("en-RW", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" })}</small></p></div>
        {inspection.warning && <p className="source-inspector-warning" role="status">{inspection.warning}</p>}
        {inspection.description && <p className="source-inspector-description">{inspection.description}</p>}
        <div className="source-inspector-grid"><article><h3>Supported layers <em>{values(inspection.layers).length}</em></h3><div>{values(inspection.layers).slice(0, 14).map((item) => <code key={item}>{item}</code>)}{!values(inspection.layers).length && <span>Not published by the endpoint</span>}</div></article><article><h3>CRS and formats</h3><dl><div><dt>CRS</dt><dd>{inspection.crs?.join(", ") || "Not stated"}</dd></div><div><dt>Formats</dt><dd>{inspection.formats?.join(", ") || "Not stated"}</dd></div><div><dt>Operations</dt><dd>{inspection.operations?.join(", ") || "Not stated"}</dd></div></dl></article></div>
        {inspection.fields?.length ? <article className="source-fields"><h3>Published fields <em>{inspection.fields.length}</em></h3><div>{inspection.fields.slice(0, 18).map((field) => <code key={field.name}><b>{field.alias ?? field.name}</b><span>{field.name} · {field.type ?? "type not stated"}</span></code>)}</div></article> : null}
        <details><summary><Braces size={14} aria-hidden />Extent and rights metadata</summary><pre>{JSON.stringify({ bounds: inspection.bounds, copyright: inspection.copyright ?? "Not stated", licenceNote: inspection.licence }, null, 2)}</pre></details>
      </div>}
      <footer><ShieldCheck size={15} aria-hidden /><p>Live service metadata helps technical review; it does not override the provider’s licence, currency statement or authoritative publication.</p><a href={layer.sourceUrl} target="_blank" rel="noreferrer">Provider source<ExternalLink size={12} aria-hidden /></a></footer>
    </section>
  </div>, document.body);
}
