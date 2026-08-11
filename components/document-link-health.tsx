"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, FileSearch, LoaderCircle, RefreshCw, XCircle } from "lucide-react";

type LinkCheck = { documentId: string; title: string; kind: "PDF" | "Source"; url: string; status: "Reachable" | "Broken" | "Unavailable"; httpStatus: number | null; latencyMs: number | null };
type LinkHealth = { checkedAt: string; documentCount: number; linkCount: number; reachable: number; broken: LinkCheck[]; unavailable: LinkCheck[] };

export default function DocumentLinkHealth() {
  const [health, setHealth] = useState<LinkHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runCheck() {
    setLoading(true); setError("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/documents/health", { cache: "no-store", signal: controller.signal });
      const data = await response.json() as LinkHealth & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Document link check failed");
      setHealth(data);
    } catch (reason) {
      setError(reason instanceof Error && reason.name !== "AbortError" ? reason.message : "The document check exceeded its 15 second client timeout.");
    } finally {
      window.clearTimeout(timer); setLoading(false);
    }
  }

  const issues = [...(health?.broken ?? []), ...(health?.unavailable ?? [])];
  return <section className="document-health panel" aria-labelledby="document-health-title">
    <header><span><FileSearch size={20} aria-hidden /></span><div><p>Official catalogue QA</p><h2 id="document-health-title">Document link health</h2></div><button onClick={() => void runCheck()} disabled={loading}>{loading ? <LoaderCircle className="spin" size={14} aria-hidden /> : <RefreshCw size={14} aria-hidden />}{loading ? "Checking catalogue links…" : health ? "Check again" : "Check PDF and source links"}</button></header>
    {!health && !error && <p className="document-health-empty">Run an on-demand check against every PDF and provider-source URL in the curated catalogue. Requests use a short timeout and results are never treated as proof of legal currency.</p>}
    {error && <div className="document-health-error" role="alert"><XCircle size={16} aria-hidden /><p><b>Link check did not complete</b><span>{error}</span></p><button onClick={() => void runCheck()}>Retry</button></div>}
    {health && <><div className="document-health-summary"><article><CheckCircle2 size={17} aria-hidden /><b>{health.reachable}/{health.linkCount}</b><span>reachable links</span></article><article className={health.broken.length ? "bad" : "good"}><XCircle size={17} aria-hidden /><b>{health.broken.length}</b><span>confirmed broken</span></article><article><RefreshCw size={17} aria-hidden /><b>{health.unavailable.length}</b><span>temporarily unavailable</span></article><time>Checked {new Date(health.checkedAt).toLocaleString("en-RW", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" })}</time></div>{issues.length ? <div className="document-health-issues">{issues.slice(0, 12).map((issue) => <article key={`${issue.documentId}-${issue.kind}`}><span className={issue.status === "Broken" ? "bad" : "warning"}>{issue.status}</span><p><b>{issue.title}</b><small>{issue.kind} · {issue.httpStatus ?? "timeout/network"}</small></p><a href={issue.url} target="_blank" rel="noreferrer" aria-label={`Open ${issue.kind} for ${issue.title}`}><ExternalLink size={14} aria-hidden /></a></article>)}</div> : <p className="document-health-clear"><CheckCircle2 size={16} aria-hidden />No broken or unavailable catalogue links were observed during this check.</p>}</>}
  </section>;
}
