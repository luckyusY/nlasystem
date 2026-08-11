import { NextResponse } from "next/server";
import { RWANDA_ONLINE_MAP_LAYERS } from "@/lib/rwanda-map-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckedService = {
  id: string;
  name: string;
  status: "Available" | "Unavailable";
  latencyMs: number | null;
  detail: string;
};

async function checkService(id: string, name: string, url: string, detail: string): Promise<CheckedService> {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      headers: { Accept: "*/*", "User-Agent": "NLA-GeoAI-Demonstration/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    return {
      id,
      name,
      status: response.ok ? "Available" : "Unavailable",
      latencyMs: Math.round(performance.now() - started),
      detail,
    };
  } catch {
    return { id, name, status: "Unavailable", latencyMs: null, detail };
  }
}

export async function GET() {
  const services = await Promise.all([
    checkService("photon", "Photon OSM search", "https://photon.komoot.io/api/?q=Kigali&limit=1", "Live Rwanda place geocoding"),
    checkService("overpass", "Overpass API", "https://overpass.kumi.systems/api/status", "Live OpenStreetMap feature queries"),
    checkService("openfreemap", "OpenFreeMap", "https://tiles.openfreemap.org/styles/liberty", "Open vector style for the 3D map"),
    checkService("rsa-maps", "Rwanda Space Agency maps", "https://gh.space.gov.rw/server/rest/services?f=pjson", `${RWANDA_ONLINE_MAP_LAYERS.length} curated Rwanda map integrations`),
    checkService("esa-worldcover", "ESA WorldCover WMS", "https://titiler.terrascope.be/wms?service=WMS&request=GetCapabilities", "Open 10 m global land-cover service"),
    checkService("rwb-geoportal", "Rwanda Water Geoportal", "https://www.geoportal.rwb.rw/geoserver/ows?service=WMS&request=GetCapabilities", "Public-domain rivers, lakes and catchments"),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services,
    engines: [
      { name: "Turf.js", detail: "Browser spatial analysis", status: "Available" },
      { name: "Proj4js", detail: "WGS84 ↔ UTM 36S transformation", status: "Available" },
      { name: "Leaflet", detail: "Interactive 2D map", status: "Available" },
      { name: "MapLibre GL", detail: "Interactive 3D terrain and buildings", status: "Available" },
      { name: "Transformers.js", detail: "Optional no-key browser AI", status: "On demand" },
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}
