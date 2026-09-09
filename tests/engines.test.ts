import { describe, expect, it } from "vitest";

import { runConstructionChangeDetection, type ChangeDetectionConfig } from "@/lib/change-detection-engine";
import { fromUtm36S, parseRwandaCoordinate, toUtm36S } from "@/lib/geospatial-engine";
import { calculateDop, generateGnssEpoch, skyPosition } from "@/lib/gnss-engine";

const baseConfig: ChangeDetectionConfig = {
  area: "kigali-fringe",
  beforeDate: "2025-06-01",
  afterDate: "2026-06-01",
  threshold: 58,
  minimumFootprintM2: 100,
  cloudCoverPercent: 8,
  registrationErrorM: 1.2,
};

describe("construction-change engine", () => {
  it("is deterministic for identical inputs", () => {
    expect(runConstructionChangeDetection(baseConfig)).toEqual(runConstructionChangeDetection(baseConfig));
  });

  it("does not create more candidates when the threshold rises", () => {
    const lower = runConstructionChangeDetection({ ...baseConfig, threshold: 40 });
    const higher = runConstructionChangeDetection({ ...baseConfig, threshold: 82 });
    expect(higher.candidateCount).toBeLessThanOrEqual(lower.candidateCount);
  });

  it("reduces confidence when cloud and registration penalties rise", () => {
    const clear = runConstructionChangeDetection({ ...baseConfig, cloudCoverPercent: 0, registrationErrorM: 0 });
    const poor = runConstructionChangeDetection({ ...baseConfig, cloudCoverPercent: 45, registrationErrorM: 6 });
    expect(poor.qualityFactor).toBeLessThan(clear.qualityFactor);
    expect(poor.meanConfidence).toBeLessThanOrEqual(clear.meanConfidence);
  });
});

describe("coordinate and GNSS mathematics", () => {
  it("round-trips Kigali through Rwanda UTM zone 36S", () => {
    const original: [number, number] = [30.0606, -1.9536];
    const roundTrip = fromUtm36S(toUtm36S(original));
    expect(roundTrip[0]).toBeCloseTo(original[0], 6);
    expect(roundTrip[1]).toBeCloseTo(original[1], 6);
    expect(parseRwandaCoordinate(`${toUtm36S(original)[0]}, ${toUtm36S(original)[1]} UTM 36S`)).not.toBeNull();
  });

  it("uses the correct polar sky transform", () => {
    expect(skyPosition(0, 0).x).toBeCloseTo(0, 8);
    expect(skyPosition(0, 0).y).toBeCloseTo(-1, 8);
    expect(skyPosition(90, 0).x).toBeCloseTo(1, 8);
    expect(skyPosition(90, 90)).toEqual({ x: 0, y: -0 });
  });

  it("computes DOP from at least four usable satellites", () => {
    const epoch = generateGnssEpoch({ observer: "kigali", epochMinutes: 630, elevationMask: 15, selectedConstellations: ["GPS", "Galileo", "GLONASS", "BeiDou"] });
    expect(epoch.satellites.filter((satellite) => satellite.used).length).toBeGreaterThan(4);
    expect(calculateDop(epoch.satellites).pdop).not.toBeNull();
    const masked = epoch.satellites.map((satellite) => ({ ...satellite, used: false }));
    expect(calculateDop(masked).quality).toBe("Unavailable");
  });
});
