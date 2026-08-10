import {
  area,
  booleanIntersects,
  buffer,
  centroid,
  circle,
  featureCollection,
  lineString,
  nearestPointOnLine,
  polygon,
} from "@turf/turf";
import type { Feature, FeatureCollection, LineString, Polygon, Position } from "geojson";
import proj4 from "proj4";
import { parcels, type Parcel } from "@/lib/data";

export type SpatialOperationSource = "road" | "wetland" | "area" | "attribute" | "intersection";

export type SpatialMetric = {
  areaM2: number;
  roadDistanceM: number;
  wetlandDistanceM: number;
  centroidWgs84: [number, number];
  centroidUtm36S: [number, number];
};

export type SpatialAnalysisResult = {
  matches: Parcel[];
  metrics: Record<string, SpatialMetric>;
  engine: "Turf.js";
  calculationCrs: "EPSG:4326 geodesic";
  projectedCrs: "EPSG:32736";
};

export const KIGALI_CENTER_LATLNG: [number, number] = [-1.9536, 30.0606];
export const KIGALI_CENTER_LNGLAT: [number, number] = [30.0606, -1.9536];
export const RWANDA_BOUNDS: [[number, number], [number, number]] = [[-2.85, 28.86], [-1.05, 30.9]];

export const DISTRICT_CENTERS_LATLNG: Record<string, [number, number]> = {
  Gasabo: [-1.9325, 30.1015],
  Kicukiro: [-1.9858, 30.1072],
  Nyarugenge: [-1.9598, 30.0436],
  Musanze: [-1.4998, 29.6344],
  Huye: [-2.5967, 29.7398],
  Bugesera: [-2.1412, 30.0804],
};

const ROAD_LINES: Record<string, Feature<LineString>> = {
  "KN 5 Road": lineString([[30.034, -1.964], [30.068, -1.947], [30.108, -1.931], [30.143, -1.907]], { name: "KN 5 Road" }),
  "KK 15 Road": lineString([[30.025, -2.014], [30.065, -2.001], [30.106, -1.983], [30.151, -1.963]], { name: "KK 15 Road" }),
  "NR 4 Corridor": lineString([[29.611, -1.474], [29.6344, -1.4998], [30.0606, -1.9536], [29.7398, -2.5967]], { name: "NR 4 Corridor" }),
};

const WETLAND_POLYGONS = Object.entries(DISTRICT_CENTERS_LATLNG).map(([district, [lat, lng]], index) =>
  circle([lng + 0.006 + (index % 2) * 0.003, lat - 0.004], 0.55 + (index % 3) * 0.12, { units: "kilometers", steps: 32, properties: { district, name: `${district} demo wetland` } }),
);

function rotatePoint(x: number, y: number, angleDegrees: number) {
  const angle = angleDegrees * Math.PI / 180;
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)] as const;
}

export function parcelCenterLatLng(parcel: Parcel, index = parcels.findIndex((candidate) => candidate.upi === parcel.upi)): [number, number] {
  const safeIndex = Math.max(0, index);
  const base = DISTRICT_CENTERS_LATLNG[parcel.district] ?? KIGALI_CENTER_LATLNG;
  const column = (safeIndex % 7) - 3;
  const row = (Math.floor(safeIndex / 7) % 7) - 3;
  return [base[0] + row * 0.0037 + (safeIndex % 3) * 0.0007, base[1] + column * 0.0042 + (safeIndex % 4) * 0.0005];
}

export function parcelCenterLngLat(parcel: Parcel, index?: number): [number, number] {
  const [lat, lng] = parcelCenterLatLng(parcel, index);
  return [lng, lat];
}

export function parcelRingLngLat(parcel: Parcel, index?: number): Position[] {
  const [lng, lat] = parcelCenterLngLat(parcel, index);
  const halfSide = Math.sqrt(parcel.area) / 2;
  const widthFactor = 1 + ((parcel.upi.length + parcel.area) % 9) / 45;
  const heightFactor = 1 / widthFactor;
  const corners = [
    [-halfSide * widthFactor, -halfSide * heightFactor],
    [halfSide * widthFactor, -halfSide * heightFactor * 0.92],
    [halfSide * widthFactor * 0.94, halfSide * heightFactor],
    [-halfSide * widthFactor, halfSide * heightFactor * 0.9],
  ];
  const converted = corners.map(([x, y]) => {
    const [rotatedX, rotatedY] = rotatePoint(x, y, parcel.rotation);
    const latitude = lat + rotatedY / 110_574;
    const longitude = lng + rotatedX / (111_320 * Math.cos(lat * Math.PI / 180));
    return [longitude, latitude];
  });
  return [...converted, converted[0]];
}

export function parcelRingLatLng(parcel: Parcel, index?: number): [number, number][] {
  return parcelRingLngLat(parcel, index).map(([lng, lat]) => [lat, lng]);
}

export function parcelFeature(parcel: Parcel, index?: number): Feature<Polygon> {
  return polygon([parcelRingLngLat(parcel, index)], {
    upi: parcel.upi,
    district: parcel.district,
    sector: parcel.sector,
    landUse: parcel.landUse,
    zoning: parcel.zoning,
    status: parcel.status,
    synthetic: true,
  });
}

export function parcelFeatureCollection(list: Parcel[] = parcels): FeatureCollection<Polygon> {
  return featureCollection(list.map((parcel) => parcelFeature(parcel)));
}

export function toUtm36S([lng, lat]: [number, number]): [number, number] {
  const [easting, northing] = proj4("EPSG:4326", "EPSG:32736", [lng, lat]);
  return [easting, northing];
}

export function calculatePolygonArea(points: { lat: number; lng: number }[]) {
  if (points.length < 3) return 0;
  const ring = points.map(({ lat, lng }) => [lng, lat] as Position);
  ring.push(ring[0]);
  return area(polygon([ring]));
}

function distanceToWetlands(parcelPolygon: Feature<Polygon>) {
  const parcelCentroid = centroid(parcelPolygon);
  let minimum = Number.POSITIVE_INFINITY;
  for (const wetland of WETLAND_POLYGONS) {
    if (booleanIntersects(parcelPolygon, wetland)) return 0;
    const boundary = lineString(wetland.geometry.coordinates[0], wetland.properties);
    const snapped = nearestPointOnLine(boundary, parcelCentroid, { units: "meters" });
    minimum = Math.min(minimum, Number(snapped.properties.dist ?? Number.POSITIVE_INFINITY));
  }
  return minimum;
}

export function analyzeParcels({
  source,
  threshold,
  road,
  district,
  landUse,
  zoning,
}: {
  source: SpatialOperationSource;
  threshold: number;
  road: string;
  district: string;
  landUse: "All categories" | Parcel["landUse"];
  zoning: string;
}): SpatialAnalysisResult {
  const roadLine = ROAD_LINES[road] ?? ROAD_LINES["KN 5 Road"];
  const roadArea = buffer(roadLine, Math.max(0, threshold), { units: "meters", steps: 12 });
  const wetlandAreas = WETLAND_POLYGONS.map((wetland) => buffer(wetland, Math.max(0, threshold), { units: "meters", steps: 12 })).filter(Boolean);
  const metrics: Record<string, SpatialMetric> = {};

  const matches = parcels.filter((parcel, index) => {
    if (district !== "All districts" && parcel.district !== district) return false;
    if (landUse !== "All categories" && parcel.landUse !== landUse) return false;
    if (zoning !== "All zones" && parcel.zoning !== zoning) return false;

    const geometry = parcelFeature(parcel, index);
    const center = centroid(geometry);
    const centerCoordinates = center.geometry.coordinates as [number, number];
    const snappedRoad = nearestPointOnLine(roadLine, center, { units: "meters" });
    const roadDistanceM = Number(snappedRoad.properties.dist ?? Number.POSITIVE_INFINITY);
    const wetlandDistanceM = distanceToWetlands(geometry);
    const areaM2 = area(geometry);
    metrics[parcel.upi] = {
      areaM2,
      roadDistanceM,
      wetlandDistanceM,
      centroidWgs84: centerCoordinates,
      centroidUtm36S: toUtm36S(centerCoordinates),
    };

    const intersectsRoad = Boolean(roadArea && booleanIntersects(geometry, roadArea));
    const intersectsWetland = wetlandAreas.some((wetland) => wetland && booleanIntersects(geometry, wetland));
    if (source === "road") return intersectsRoad;
    if (source === "wetland") return intersectsWetland;
    if (source === "intersection") return intersectsRoad && intersectsWetland;
    if (source === "area") return areaM2 >= threshold;
    return areaM2 >= threshold;
  });

  return {
    matches,
    metrics,
    engine: "Turf.js",
    calculationCrs: "EPSG:4326 geodesic",
    projectedCrs: "EPSG:32736",
  };
}

export function getReferenceLayers() {
  return {
    roads: featureCollection(Object.values(ROAD_LINES)),
    wetlands: featureCollection(WETLAND_POLYGONS),
  };
}
