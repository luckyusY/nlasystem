import type { NextRequest } from "next/server";
import { fetchWithTimeout } from "@/lib/network";

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  const requestedRadius = Number(request.nextUrl.searchParams.get("radius") ?? 1600);
  const radius = Math.min(2500, Math.max(400, Number.isFinite(requestedRadius) ? requestedRadius : 1600));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -3.1 || lat > -0.8 || lon < 28.7 || lon > 31.2) {
    return Response.json({ features: [], error: "Choose a location within Rwanda." }, { status: 400 });
  }

  const overpassQuery = `[out:json][timeout:18];
(
  nwr(around:${Math.round(radius)},${lat.toFixed(6)},${lon.toFixed(6)})["amenity"~"hospital|clinic|pharmacy|school|university|college|police|fire_station|marketplace|bank|post_office"];
  nwr(around:${Math.round(radius)},${lat.toFixed(6)},${lon.toFixed(6)})["office"="government"];
  nwr(around:${Math.round(radius)},${lat.toFixed(6)},${lon.toFixed(6)})["tourism"~"museum|viewpoint|attraction"];
);
out center tags 80;`;
  try {
    const response = await fetchWithTimeout("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "NLA-GeoAI-Demo/1.0 (+https://nla-geoai.vercel.app)",
      },
      body: new URLSearchParams({ data: overpassQuery }),
      next: { revalidate: 900 },
    }, { timeoutMs: 12_000, retries: 1, retryDelayMs: 400 });
    if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
    const data = await response.json() as { elements?: OverpassElement[] };
    const features = (data.elements ?? []).flatMap((element) => {
      const featureLat = element.lat ?? element.center?.lat;
      const featureLon = element.lon ?? element.center?.lon;
      if (typeof featureLat !== "number" || typeof featureLon !== "number") return [];
      const tags = element.tags ?? {};
      return [{
        id: `${element.type}/${element.id}`,
        name: tags.name ?? tags.amenity ?? tags.office ?? tags.tourism ?? "Mapped place",
        category: tags.amenity ?? tags.office ?? tags.tourism ?? "place",
        lat: featureLat,
        lon: featureLon,
      }];
    }).slice(0, 80);

    return Response.json({ features, source: "OpenStreetMap contributors via Overpass API" }, {
      headers: { "Cache-Control": "public, max-age=180, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("OSM feature provider error", error);
    return Response.json({ features: [], error: "Live OpenStreetMap places are temporarily unavailable." }, { status: 503 });
  }
}
