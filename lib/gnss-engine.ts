export type GnssConstellation = "GPS" | "Galileo" | "GLONASS" | "BeiDou";
export type ObserverKey = "kigali" | "musanze" | "rusizi" | "huye" | "nyagatare";

export type GnssObserver = {
  key: ObserverKey;
  name: string;
  code: string;
  lat: number;
  lon: number;
  elevationM: number;
};

export type GnssSatellite = {
  id: string;
  constellation: GnssConstellation;
  azimuth: number;
  elevation: number;
  signal: string;
  cn0: number;
  visible: boolean;
  used: boolean;
  x: number;
  y: number;
};

export type DopMetrics = {
  hdop: number | null;
  vdop: number | null;
  pdop: number | null;
  gdop: number | null;
  quality: "Excellent" | "Good" | "Moderate" | "Weak" | "Unavailable";
};

export const GNSS_OBSERVERS: Record<ObserverKey, GnssObserver> = {
  kigali: { key: "kigali", name: "Kigali demonstration observer", code: "KGLI", lat: -1.9536, lon: 30.0606, elevationM: 1567 },
  musanze: { key: "musanze", name: "Musanze demonstration observer", code: "MUSN", lat: -1.4997, lon: 29.6349, elevationM: 1850 },
  rusizi: { key: "rusizi", name: "Rusizi demonstration observer", code: "RUSZ", lat: -2.4846, lon: 28.9075, elevationM: 1470 },
  huye: { key: "huye", name: "Huye demonstration observer", code: "HUYE", lat: -2.5967, lon: 29.7394, elevationM: 1768 },
  nyagatare: { key: "nyagatare", name: "Nyagatare demonstration observer", code: "NYAG", lat: -1.2942, lon: 30.2977, elevationM: 1430 },
};

export const CONSTELLATION_META: Record<GnssConstellation, { colour: string; signals: string[]; prefix: string }> = {
  GPS: { colour: "#1f9fd1", signals: ["L1", "L2C", "L5"], prefix: "G" },
  Galileo: { colour: "#6e5ac7", signals: ["E1", "E5a", "E5b"], prefix: "E" },
  GLONASS: { colour: "#e77817", signals: ["G1", "G2"], prefix: "R" },
  BeiDou: { colour: "#228454", signals: ["B1C", "B2a", "B2b"], prefix: "C" },
};

const CONSTELLATIONS = Object.keys(CONSTELLATION_META) as GnssConstellation[];
const toRad = (degrees: number) => degrees * Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function invertMatrix(source: number[][]) {
  const size = source.length;
  const matrix = source.map((row, rowIndex) => [...row, ...Array.from({ length: size }, (_, columnIndex) => rowIndex === columnIndex ? 1 : 0)]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    if (Math.abs(matrix[pivot][column]) < 1e-10) return null;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    matrix[column] = matrix[column].map((value) => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = matrix[row][column];
      matrix[row] = matrix[row].map((value, index) => value - factor * matrix[column][index]);
    }
  }
  return matrix.map((row) => row.slice(size));
}

export function calculateDop(satellites: GnssSatellite[]): DopMetrics {
  const used = satellites.filter((satellite) => satellite.used);
  if (used.length < 4) return { hdop: null, vdop: null, pdop: null, gdop: null, quality: "Unavailable" };
  const rows = used.map((satellite) => {
    const azimuth = toRad(satellite.azimuth);
    const elevation = toRad(satellite.elevation);
    const east = Math.cos(elevation) * Math.sin(azimuth);
    const north = Math.cos(elevation) * Math.cos(azimuth);
    const up = Math.sin(elevation);
    return [-east, -north, -up, 1];
  });
  const normal = Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, column) => rows.reduce((sum, values) => sum + values[row] * values[column], 0)));
  const inverse = invertMatrix(normal);
  if (!inverse) return { hdop: null, vdop: null, pdop: null, gdop: null, quality: "Unavailable" };
  const hdop = Math.sqrt(Math.max(0, inverse[0][0] + inverse[1][1]));
  const vdop = Math.sqrt(Math.max(0, inverse[2][2]));
  const pdop = Math.sqrt(Math.max(0, inverse[0][0] + inverse[1][1] + inverse[2][2]));
  const gdop = Math.sqrt(Math.max(0, inverse[0][0] + inverse[1][1] + inverse[2][2] + inverse[3][3]));
  const quality = pdop < 2 ? "Excellent" : pdop < 3 ? "Good" : pdop < 5 ? "Moderate" : "Weak";
  return { hdop, vdop, pdop, gdop, quality };
}

export function skyPosition(azimuth: number, elevation: number) {
  const radius = (90 - clamp(elevation, 0, 90)) / 90;
  const azimuthRadians = toRad(azimuth);
  return {
    x: radius * Math.sin(azimuthRadians),
    y: -radius * Math.cos(azimuthRadians),
  };
}

export function generateGnssEpoch({
  observer,
  epochMinutes,
  elevationMask,
  selectedConstellations,
}: {
  observer: ObserverKey;
  epochMinutes: number;
  elevationMask: number;
  selectedConstellations: GnssConstellation[];
}) {
  const observerOffset = Object.keys(GNSS_OBSERVERS).indexOf(observer) * 17;
  const satellites = CONSTELLATIONS.flatMap((constellation, constellationIndex) => {
    const meta = CONSTELLATION_META[constellation];
    return Array.from({ length: 8 }, (_, index): GnssSatellite => {
      const azimuth = (index * 45 + constellationIndex * 19 + observerOffset + epochMinutes * (0.16 + constellationIndex * 0.018)) % 360;
      const elevationWave = Math.sin(toRad(index * 51 + constellationIndex * 38 + observerOffset + epochMinutes * 0.44));
      const elevation = clamp(37 + elevationWave * 34 + ((index + constellationIndex) % 3) * 4, 3, 86);
      const signal = meta.signals[(index + constellationIndex) % meta.signals.length];
      const cn0 = clamp(27 + elevation * 0.24 + 3 * Math.sin(toRad(azimuth * 1.7)), 24, 52);
      const visible = elevation >= elevationMask;
      const used = visible && selectedConstellations.includes(constellation);
      const position = skyPosition(azimuth, elevation);
      return {
        id: `${meta.prefix}${String(index + 1 + constellationIndex * 3).padStart(2, "0")}`,
        constellation,
        azimuth,
        elevation,
        signal,
        cn0,
        visible,
        used,
        ...position,
      };
    });
  });
  return { satellites, dop: calculateDop(satellites) };
}
