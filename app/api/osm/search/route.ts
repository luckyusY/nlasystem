import type { NextRequest } from "next/server";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.replace(/[^\p{L}\p{N}\s'.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 64);
  if (query.length < 2) return Response.json({ results: [], error: "Enter at least two characters." }, { status: 400 });

  const endpoint = new URL("https://photon.komoot.io/api/");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("limit", "12");
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("bbox", "28.8,-2.9,30.9,-1.0");

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "NLA-GeoAI-Demo/1.0 (+https://nla-geoai.vercel.app)",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Photon returned ${response.status}`);
    const data = await response.json() as { features?: PhotonFeature[] };
    const results = (data.features ?? []).flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties;
      if (!coordinates || !properties?.name || properties.countrycode?.toLowerCase() !== "rw") return [];
      const [lon, lat] = coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
      const location = [properties.street, properties.district, properties.city, properties.state].filter((value, index, all) => value && all.indexOf(value) === index).join(" · ");
      return [{
        id: `${properties.osm_type ?? "OSM"}/${properties.osm_id ?? `${lat}-${lon}`}`,
        name: properties.name,
        description: location || `${properties.osm_key ?? "place"} · Rwanda`,
        category: properties.osm_value ?? properties.type ?? properties.osm_key ?? "place",
        lat,
        lon,
      }];
    }).slice(0, 8);

    return Response.json({ results, source: "OpenStreetMap data via the open-source Photon geocoder" }, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("OSM search provider error", error);
    return Response.json({ results: [], error: "Open map search is temporarily unavailable. Try again shortly." }, { status: 503 });
  }
}
