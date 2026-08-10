export type LocalGeoIntent =
  | "parcel_lookup"
  | "road_proximity"
  | "wetland_screening"
  | "land_use"
  | "dataset_search"
  | "document_search";

export type LocalGeoAIResult = {
  intent: LocalGeoIntent;
  label: string;
  confidence: number;
  runtime: "Transformers.js · browser WASM";
  model: "all-MiniLM-L6-v2 · q4";
};

const INTENTS: { intent: LocalGeoIntent; label: string; example: string }[] = [
  { intent: "parcel_lookup", label: "Parcel lookup", example: "find a cadastral parcel by UPI, district, sector, registration status, area or zoning" },
  { intent: "road_proximity", label: "Road proximity", example: "find parcels near a road, calculate a road buffer or measure distance to transport infrastructure" },
  { intent: "wetland_screening", label: "Wetland screening", example: "check parcel intersection with wetlands, environmental buffers or conservation constraints" },
  { intent: "land_use", label: "Land-use analysis", example: "analyse land use, zoning, development controls, planning classification or parcel area" },
  { intent: "dataset_search", label: "NSDI dataset search", example: "search an open geospatial catalogue for roads, imagery, boundaries, elevation or map layers" },
  { intent: "document_search", label: "Knowledge search", example: "search institutional documents, manuals, procedures, survey guidance or subdivision requirements" },
];

type Extractor = (input: string | string[], options: { pooling: "mean"; normalize: true }) => Promise<{ tolist: () => unknown }>;
type ProgressUpdate = { progress?: number; status?: string; file?: string };

let extractorPromise: Promise<Extractor> | null = null;
let referenceEmbeddingsPromise: Promise<number[][]> | null = null;

function dot(left: number[], right: number[]) {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

async function getExtractor(onProgress?: (percent: number, detail: string) => void) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const extractor = await pipeline("feature-extraction", "onnx-community/all-MiniLM-L6-v2-ONNX", {
        dtype: "q4",
        device: "wasm",
        progress_callback: (update: ProgressUpdate) => {
          const percent = typeof update.progress === "number" ? Math.round(update.progress) : 0;
          onProgress?.(percent, update.file ?? update.status ?? "Preparing local model");
        },
      });
      return extractor as unknown as Extractor;
    })();
  }
  try {
    return await extractorPromise;
  } catch (error) {
    extractorPromise = null;
    referenceEmbeddingsPromise = null;
    throw error;
  }
}

async function getReferenceEmbeddings(onProgress?: (percent: number, detail: string) => void) {
  if (!referenceEmbeddingsPromise) {
    referenceEmbeddingsPromise = (async () => {
      const extractor = await getExtractor(onProgress);
      const output = await extractor(INTENTS.map((item) => item.example), { pooling: "mean", normalize: true });
      return output.tolist() as number[][];
    })();
  }
  return referenceEmbeddingsPromise;
}

export async function warmLocalGeoAI(onProgress?: (percent: number, detail: string) => void) {
  await getReferenceEmbeddings(onProgress);
}

export async function inferLocalGeoIntent(question: string): Promise<LocalGeoAIResult> {
  const extractor = await getExtractor();
  const references = await getReferenceEmbeddings();
  const output = await extractor(question, { pooling: "mean", normalize: true });
  const vector = (output.tolist() as number[][])[0];
  const ranked = INTENTS.map((item, index) => ({ ...item, score: dot(vector, references[index]) })).sort((left, right) => right.score - left.score);
  const best = ranked[0];
  return {
    intent: best.intent,
    label: best.label,
    confidence: Math.max(0, Math.min(1, best.score)),
    runtime: "Transformers.js · browser WASM",
    model: "all-MiniLM-L6-v2 · q4",
  };
}
