import { fetchWithTimeout } from "@/lib/network";
import { OFFICIAL_DOCUMENTS } from "@/lib/official-document-catalog";

export const dynamic = "force-dynamic";

type LinkKind = "PDF" | "Source";

async function checkLink(documentId: string, title: string, kind: LinkKind, url: string) {
  const started = performance.now();
  try {
    const response = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": "NLA-GeoAI-Demonstration/1.0" }, cache: "no-store" }, { timeoutMs: 4_500, retries: 0 });
    const status = response.status === 404 || response.status === 410 ? "Broken" : response.ok || response.status === 401 || response.status === 403 || response.status === 405 ? "Reachable" : "Unavailable";
    return { documentId, title, kind, url, status, httpStatus: response.status, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { documentId, title, kind, url, status: "Unavailable", httpStatus: null, latencyMs: null };
  }
}

export async function GET() {
  const checks = await Promise.all(OFFICIAL_DOCUMENTS.flatMap((document) => [
    checkLink(document.id, document.title, "PDF", document.pdfUrl),
    checkLink(document.id, document.title, "Source", document.sourceUrl),
  ]));
  return Response.json({
    checkedAt: new Date().toISOString(),
    documentCount: OFFICIAL_DOCUMENTS.length,
    linkCount: checks.length,
    reachable: checks.filter((check) => check.status === "Reachable").length,
    broken: checks.filter((check) => check.status === "Broken"),
    unavailable: checks.filter((check) => check.status === "Unavailable"),
    checks,
  }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
