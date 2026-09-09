import { bbox, bboxPolygon, booleanIntersects, booleanPointInPolygon, centroid, convex, distance, featureCollection, lineString, nearestPointOnLine, point, union } from "@turf/turf";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Point, Polygon } from "geojson";

import { parcels, type Parcel } from "@/lib/data";
import { getReferenceLayers, parcelCenterLngLat, parcelFeature } from "@/lib/geospatial-engine";

export type ParcelNeighbour = { parcel: Parcel; distanceM: number; relationship: "Touches" | "Nearby" };
export type PointScreeningResult = {
  point: Feature<Point>;
  containing: Parcel[];
  nearestParcel: Parcel | null;
  nearestParcelDistanceM: number;
  nearestRoad: { name: string; distanceM: number };
  nearestWetland: { name: string; distanceM: number };
  nearestService: { name: string; type: string; distanceM: number };
};

const SERVICE_POINTS = [
  { name: "Kigali public service hub", type: "Government", coordinates: [30.0619, -1.9499] as [number, number] },
  { name: "Remera health centre", type: "Health", coordinates: [30.1054, -1.9508] as [number, number] },
  { name: "Huye district office", type: "Government", coordinates: [29.7398, -2.5964] as [number, number] },
  { name: "Musanze public service point", type: "Government", coordinates: [29.6346, -1.4993] as [number, number] },
];

export function findParcelNeighbours(parcel: Parcel, limit = 6): ParcelNeighbour[] {
  const parcelIndex = parcels.findIndex((candidate) => candidate.upi === parcel.upi);
  const feature = parcelFeature(parcel, parcelIndex);
  const centre = centroid(feature);
  return parcels.flatMap((candidate, index) => {
    if (candidate.upi === parcel.upi) return [];
    const candidateFeature = parcelFeature(candidate, index);
    const distanceM = distance(centre, centroid(candidateFeature), { units: "meters" });
    const touches = booleanIntersects(feature, candidateFeature);
    if (!touches && distanceM > 5_000) return [];
    return [{ parcel: candidate, distanceM, relationship: touches ? "Touches" as const : "Nearby" as const }];
  }).sort((a, b) => a.distanceM - b.distanceM).slice(0, limit);
}

export function screenPoint(lat: number, lng: number): PointScreeningResult {
  const inputPoint = point([lng, lat], { type: "screening-point", provenance: "User-entered WGS84 coordinate" });
  const containing = parcels.filter((parcel, index) => booleanPointInPolygon(inputPoint, parcelFeature(parcel, index)));
  const parcelDistances = parcels.map((parcel, index) => ({ parcel, distanceM: distance(inputPoint, point(parcelCenterLngLat(parcel, index)), { units: "meters" }) })).sort((a, b) => a.distanceM - b.distanceM);
  const references = getReferenceLayers();
  const roadCandidates = references.roads.features.map((road) => {
    const snapped = nearestPointOnLine(road, inputPoint, { units: "meters" });
    return { name: String(road.properties?.name ?? "Demonstration road"), distanceM: Number(snapped.properties.dist ?? Number.POSITIVE_INFINITY) };
  }).sort((a, b) => a.distanceM - b.distanceM);
  const wetlandCandidates = references.wetlands.features.map((wetland) => {
    if (booleanPointInPolygon(inputPoint, wetland)) return { name: String(wetland.properties?.name ?? "Demonstration wetland"), distanceM: 0 };
    const boundary = lineString(wetland.geometry.coordinates[0]);
    const snapped = nearestPointOnLine(boundary, inputPoint, { units: "meters" });
    return { name: String(wetland.properties?.name ?? "Demonstration wetland"), distanceM: Number(snapped.properties.dist ?? Number.POSITIVE_INFINITY) };
  }).sort((a, b) => a.distanceM - b.distanceM);
  const services = SERVICE_POINTS.map((service) => ({ ...service, distanceM: distance(inputPoint, point(service.coordinates), { units: "meters" }) })).sort((a, b) => a.distanceM - b.distanceM);
  return {
    point: inputPoint,
    containing,
    nearestParcel: parcelDistances[0]?.parcel ?? null,
    nearestParcelDistanceM: parcelDistances[0]?.distanceM ?? Number.POSITIVE_INFINITY,
    nearestRoad: roadCandidates[0],
    nearestWetland: wetlandCandidates[0],
    nearestService: services[0],
  };
}

export function aggregateParcelGeometry(upis: string[], operation: "union" | "hull" | "envelope"): FeatureCollection<Geometry, Record<string, unknown>> {
  const selected = parcels.flatMap((parcel, index) => upis.includes(parcel.upi) ? [parcelFeature(parcel, index)] : []);
  if (!selected.length) return featureCollection([]);
  let result: Feature<Polygon | MultiPolygon> | null = null;
  if (operation === "union") result = selected.length === 1 ? selected[0] : union(featureCollection(selected));
  if (operation === "hull") result = convex(featureCollection(selected.map((feature) => centroid(feature)))) ?? bboxPolygon(bbox(featureCollection(selected)));
  if (operation === "envelope") result = bboxPolygon(bbox(featureCollection(selected)));
  if (!result) return featureCollection([]);
  result.properties = { operation, parcelCount: selected.length, sourceUpis: upis.join(","), provenance: "Synthetic parcel geometry · browser-side Turf.js" };
  return featureCollection([result]) as FeatureCollection<Geometry, Record<string, unknown>>;
}
