import type { Feature, FeatureCollection, Polygon } from "geojson";
import { booleanIntersects } from "@turf/turf";

import { parcels } from "@/lib/data";
import { getReferenceLayers, parcelCenterLatLng, parcelFeature } from "@/lib/geospatial-engine";

export type ChangeAreaKey = "kigali-fringe" | "gasabo-corridor" | "bugesera-growth";

export type ChangeDetectionConfig = {
  area: ChangeAreaKey;
  beforeDate: string;
  afterDate: string;
  threshold: number;
  minimumFootprintM2: number;
  cloudCoverPercent: number;
  registrationErrorM: number;
};

export type ChangeCandidateProperties = {
  id: string;
  type: "candidate-construction";
  sourceUpi: string;
  district: string;
  areaM2: number;
  score: number;
  confidence: number;
  edgeDelta: number;
  builtUpDelta: number;
  textureDelta: number;
  vegetationDelta: number;
  compactness: number;
  review: "Pending";
  provenance: "Deterministic synthetic observation";
};

export type ChangeDetectionResult = {
  candidates: FeatureCollection<Polygon, ChangeCandidateProperties>;
  observations: Array<ChangeCandidateProperties & { detected: boolean }>;
  affectedUpis: string[];
  candidateCount: number;
  totalAreaM2: number;
  meanScore: number;
  meanConfidence: number;
  roadLikeCandidates: number;
  vegetationLossHa: number;
  wetlandAlerts: number;
  qualityFactor: number;
  qualityFlags: string[];
};

export const CHANGE_AREAS: Record<ChangeAreaKey, { label: string; detail: string; parcelOffset: number }> = {
  "kigali-fringe": { label: "Kigali urban fringe", detail: "Demonstration parcels across the Kigali growth edge", parcelOffset: 0 },
  "gasabo-corridor": { label: "Gasabo development corridor", detail: "Synthetic road-oriented development screening", parcelOffset: 9 },
  "bugesera-growth": { label: "Bugesera growth area", detail: "Synthetic peri-urban construction screening", parcelOffset: 18 },
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function hashNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function metric(seed: number, phase: number, low: number, high: number) {
  const wave = (Math.sin(seed * 0.000019 + phase * 2.413) + 1) / 2;
  return low + wave * (high - low);
}

function rectangleAround(lat: number, lng: number, widthM: number, heightM: number, skew: number): Polygon {
  const halfLat = heightM / 2 / 111_320;
  const halfLng = widthM / 2 / (111_320 * Math.cos(lat * Math.PI / 180));
  const offset = halfLng * skew * 0.28;
  return {
    type: "Polygon",
    coordinates: [[
      [lng - halfLng + offset, lat - halfLat],
      [lng + halfLng + offset, lat - halfLat],
      [lng + halfLng - offset, lat + halfLat],
      [lng - halfLng - offset, lat + halfLat],
      [lng - halfLng + offset, lat - halfLat],
    ]],
  };
}

export function runConstructionChangeDetection(config: ChangeDetectionConfig): ChangeDetectionResult {
  const area = CHANGE_AREAS[config.area];
  const qualityFactor = clamp(
    1 - config.cloudCoverPercent * 0.0055 - config.registrationErrorM * 0.026,
    0.35,
    1,
  );
  const qualityFlags: string[] = [];
  if (config.cloudCoverPercent >= 20) qualityFlags.push("Cloud cover may hide or imitate surface change");
  if (config.registrationErrorM >= 3) qualityFlags.push("Co-registration error may displace candidate edges");
  if (!qualityFlags.length) qualityFlags.push("Synthetic observation quality is within the demonstration screening range");

  const observations = Array.from({ length: 16 }, (_, index) => {
    const parcelIndex = (area.parcelOffset + index) % parcels.length;
    const parcel = parcels[parcelIndex];
    const seed = hashNumber(`${config.area}:${config.beforeDate}:${config.afterDate}:${index}`);
    const edgeDelta = metric(seed, index + 1, 25, 96);
    const builtUpDelta = metric(seed, index + 7, 18, 98);
    const textureDelta = metric(seed, index + 13, 15, 92);
    const redBefore = metric(seed, index + 34, 0.12, 0.38);
    const nirBefore = metric(seed, index + 39, 0.34, 0.78);
    const vegetationShock = metric(seed, index + 45, 0.02, 0.38);
    const redAfter = Math.min(0.78, redBefore + vegetationShock * 0.22);
    const nirAfter = Math.max(0.08, nirBefore - vegetationShock);
    const ndviBefore = (nirBefore - redBefore) / (nirBefore + redBefore);
    const ndviAfter = (nirAfter - redAfter) / (nirAfter + redAfter);
    const vegetationDelta = clamp((ndviBefore - ndviAfter) * 100);
    const score = clamp(0.45 * edgeDelta + 0.35 * builtUpDelta + 0.20 * textureDelta);
    const widthM = metric(seed, index + 21, 8, 34);
    const heightM = metric(seed, index + 29, 7, 29);
    const areaM2 = widthM * heightM;
    const compactness = Math.min(widthM, heightM) / Math.max(widthM, heightM);
    const confidence = clamp(score * qualityFactor);
    return {
      id: `NLA-CHG-${String(index + 1).padStart(3, "0")}`,
      type: "candidate-construction" as const,
      sourceUpi: parcel.upi,
      district: parcel.district,
      areaM2,
      score,
      confidence,
      edgeDelta,
      builtUpDelta,
      textureDelta,
      vegetationDelta,
      compactness,
      review: "Pending" as const,
      provenance: "Deterministic synthetic observation" as const,
      detected: score >= config.threshold && areaM2 >= config.minimumFootprintM2,
    };
  });

  const detected = observations.filter((observation) => observation.detected);
  const features: Array<Feature<Polygon, ChangeCandidateProperties>> = detected.map((observation, index) => {
    const parcel = parcels.find((candidate) => candidate.upi === observation.sourceUpi) ?? parcels[index];
    const parcelIndex = parcels.findIndex((candidate) => candidate.upi === parcel.upi);
    const [lat, lng] = parcelCenterLatLng(parcel, parcelIndex);
    const widthM = Math.sqrt(observation.areaM2 / Math.max(observation.compactness, 0.25));
    const heightM = observation.areaM2 / widthM;
    return {
      type: "Feature",
      id: observation.id,
      properties: {
        id: observation.id,
        type: observation.type,
        sourceUpi: observation.sourceUpi,
        district: observation.district,
        areaM2: Number(observation.areaM2.toFixed(1)),
        score: Number(observation.score.toFixed(1)),
        confidence: Number(observation.confidence.toFixed(1)),
        edgeDelta: Number(observation.edgeDelta.toFixed(1)),
        builtUpDelta: Number(observation.builtUpDelta.toFixed(1)),
        textureDelta: Number(observation.textureDelta.toFixed(1)),
        vegetationDelta: Number(observation.vegetationDelta.toFixed(1)),
        compactness: Number(observation.compactness.toFixed(2)),
        review: "Pending",
        provenance: "Deterministic synthetic observation",
      },
      geometry: rectangleAround(lat, lng, widthM, heightM, (index % 3) - 1),
    };
  });

  const totalAreaM2 = detected.reduce((sum, candidate) => sum + candidate.areaM2, 0);
  const meanScore = detected.length ? detected.reduce((sum, candidate) => sum + candidate.score, 0) / detected.length : 0;
  const meanConfidence = detected.length ? detected.reduce((sum, candidate) => sum + candidate.confidence, 0) / detected.length : 0;
  const vegetationLossHa = observations
    .filter((observation) => observation.vegetationDelta >= Math.max(25, config.threshold - 20))
    .reduce((sum, observation) => sum + observation.areaM2, 0) / 10_000;
  const affectedUpis = parcels.flatMap((parcel, parcelIndex) => {
    const boundary = parcelFeature(parcel, parcelIndex);
    return features.some((feature) => booleanIntersects(feature, boundary)) ? [parcel.upi] : [];
  });
  const wetlandReferences = getReferenceLayers().wetlands;
  const wetlandAlerts = features.filter((feature) => wetlandReferences.features.some((wetland) => booleanIntersects(feature, wetland))).length;

  return {
    candidates: { type: "FeatureCollection", features },
    observations,
    affectedUpis,
    candidateCount: detected.length,
    totalAreaM2,
    meanScore,
    meanConfidence,
    roadLikeCandidates: detected.filter((candidate) => candidate.compactness < 0.45).length,
    vegetationLossHa,
    wetlandAlerts,
    qualityFactor,
    qualityFlags,
  };
}
