/**
 * HandLandmarker factory with resilient loading:
 *  - tries GPU delegate first, falls back to CPU
 *  - tries the self-hosted model in /public first, falls back to Google CDN
 * Everything is processed locally in the browser via WebAssembly.
 */
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM_LOCAL = "/mediapipe/wasm";
const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm";

const MODEL_LOCAL = "/mediapipe/models/hand_landmarker.task";
const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let cached: HandLandmarker | null = null;

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (cached) return cached;

  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
  } catch {
    fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
  }

  const build = (modelAssetPath: string, delegate: "GPU" | "CPU") =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });

  const attempts: Array<[string, "GPU" | "CPU"]> = [
    [MODEL_LOCAL, "GPU"],
    [MODEL_LOCAL, "CPU"],
    [MODEL_CDN, "GPU"],
    [MODEL_CDN, "CPU"],
  ];

  let lastError: unknown = null;
  for (const [model, delegate] of attempts) {
    try {
      cached = await build(model, delegate);
      return cached;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("HandLandmarker initialization failed");
}

export function disposeHandLandmarker(): void {
  try {
    cached?.close();
  } catch {
    // ignore
  }
  cached = null;
}
