import type { NextRequest } from "next/server";

import { fetchWithTimeout } from "@/lib/network";
import { RWANDA_ONLINE_MAP_LAYERS } from "@/lib/rwanda-map-catalog";

export const dynamic = "force-dynamic";

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function tags(xml: string, name: string) {
  return unique([...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([^<\\]]+)`, "gi"))].map((match) => match[1]));
}

function wmsBounds(xml: string) {
  const west = xml.match(/<westBoundLongitude>([^<]+)/i)?.[1];
  const east = xml.match(/<eastBoundLongitude>([^<]+)/i)?.[1];
  const south = xml.match(/<southBoundLatitude>([^<]+)/i)?.[1];
  const north = xml.match(/<northBoundLatitude>([^<]+)/i)?.[1];
  return west && east && south && north ? { west: Number(west), south: Number(south), east: Number(east), north: Number(north) } : null;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const layer = RWANDA_ONLINE_MAP_LAYERS.find((candidate) => candidate.id === id);
  if (!layer) return Response.json({ error: "Unknown map layer." }, { status: 404 });

  try {
    if (layer.kind === "wms") {
      const endpoint = new URL(layer.serviceUrl);
      endpoint.searchParams.set("service", "WMS");
      endpoint.searchParams.set("request", "GetCapabilities");
      endpoint.searchParams.set("version", "1.3.0");
      const response = await fetchWithTimeout(endpoint, { headers: { Accept: "application/xml,text/xml,*/*", "User-Agent": "NLA-GeoAI-Demonstration/1.0" }, cache: "no-store" }, { timeoutMs: 4_500, retries: 1 });
      if (!response.ok) throw new Error(`WMS returned ${response.status}`);
      const xml = await response.text();
      return Response.json({ id, protocol: "OGC WMS", liveStatus: "Available", checkedAt: new Date().toISOString(), serviceTitle: tags(xml, "Title")[0] ?? layer.provider, layers: tags(xml, "Name").filter((name) => !/^WMS$/i.test(name)).slice(0, 60), crs: unique([...tags(xml, "CRS"), ...tags(xml, "SRS")]).slice(0, 30), formats: tags(xml, "Format").filter((format) => /image|json|xml/i.test(format)).slice(0, 20), bounds: wmsBounds(xml), operations: ["GetCapabilities", "GetMap", "GetFeatureInfo"], licence: layer.licence });
    }

    const serviceEndpoint = `${layer.serviceUrl}?f=pjson`;
    const detailLayerId = layer.layerIds?.[0] ?? 0;
    const [serviceResponse, detailResponse] = await Promise.all([
      fetchWithTimeout(serviceEndpoint, { headers: { Accept: "application/json", "User-Agent": "NLA-GeoAI-Demonstration/1.0" }, cache: "no-store" }, { timeoutMs: 4_500, retries: 1 }),
      fetchWithTimeout(`${layer.serviceUrl}/${detailLayerId}?f=pjson`, { headers: { Accept: "application/json", "User-Agent": "NLA-GeoAI-Demonstration/1.0" }, cache: "no-store" }, { timeoutMs: 4_500, retries: 1 }),
    ]);
    if (!serviceResponse.ok) throw new Error(`ArcGIS service returned ${serviceResponse.status}`);
    const service = await serviceResponse.json() as { mapName?: string; serviceDescription?: string; layers?: Array<{ id: number; name: string }>; capabilities?: string; copyrightText?: string; supportedImageFormatTypes?: string; fullExtent?: unknown; spatialReference?: { wkid?: number; latestWkid?: number } };
    const detail = detailResponse.ok ? await detailResponse.json() as { fields?: Array<{ name: string; alias?: string; type?: string }>; extent?: unknown; capabilities?: string } : {};
    return Response.json({ id, protocol: "ArcGIS REST", liveStatus: "Available", checkedAt: new Date().toISOString(), serviceTitle: service.mapName ?? layer.title, description: service.serviceDescription ?? layer.description, layers: (service.layers ?? []).slice(0, 60), crs: service.spatialReference ? [`EPSG:${service.spatialReference.latestWkid ?? service.spatialReference.wkid ?? "unknown"}`] : [], formats: (service.supportedImageFormatTypes ?? "").split(",").filter(Boolean), bounds: detail.extent ?? service.fullExtent ?? null, fields: (detail.fields ?? []).slice(0, 40), operations: unique(`${service.capabilities ?? ""},${detail.capabilities ?? ""}`.split(",")), copyright: service.copyrightText || "Not stated by service", licence: layer.licence });
  } catch (error) {
    const configuredLayers = layer.kind === "wms" ? [layer.wmsLayer ?? layer.title] : (layer.layerIds ?? [0]).map((layerId) => ({ id: layerId, name: `Configured layer ${layerId}` }));
    return Response.json({ id, protocol: layer.kind === "wms" ? "OGC WMS" : "ArcGIS REST", liveStatus: "Unavailable", checkedAt: new Date().toISOString(), serviceTitle: layer.title, description: layer.description, layers: configuredLayers, crs: ["Live endpoint did not publish CRS during this check"], formats: layer.kind === "wms" ? ["image/png (configured map request)"] : ["PNG32 (configured export request)"], bounds: null, operations: layer.kind === "wms" ? ["GetCapabilities", "GetMap", "GetFeatureInfo"] : ["Map export", "Service metadata"], copyright: "Live endpoint unavailable", licence: layer.licence, warning: `Live inspection failed after timeout and retry: ${error instanceof Error ? error.message : "source unavailable"}. Showing the checked-in request configuration, not verified capabilities.` });
  }
}
