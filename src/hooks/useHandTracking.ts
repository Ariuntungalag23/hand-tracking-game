"use client";

/**
 * useHandTracking — real-time webcam hand tracking with MediaPipe.
 *
 * Responsibilities:
 *  - camera lifecycle (permission, stream, teardown) with Mongolian error mapping
 *  - HandLandmarker init (GPU with CPU fallback, local model with CDN fallback)
 *  - requestAnimationFrame detection loop + skeleton canvas overlay
 *  - gesture stabilisation: a gesture must hold steady for ~800 ms before it
 *    is reported as "locked", preventing flicker between gestures
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { getHandLandmarker, disposeHandLandmarker } from "@/lib/handLandmarkerClient";
import {
  classifyGesture,
  HAND_CONNECTIONS,
  LM,
  type Gesture,
  type Landmark,
} from "@/lib/gesture";

export type CameraStatus = "off" | "starting" | "on" | "error";

/** Time (ms) the same gesture must persist before it locks in. */
export const STABILIZE_MS = 800;

const MESSAGES = {
  cameraOff: "Камер идэвхгүй",
  starting: "Камер асааж байна…",
  loadingModel: "AI модел ачаалж байна…",
  handFound: "Гар илрүүлэгдсэн",
  handLost: "Гар олдсонгүй",
  error: "Алдаа гарлаа",
  insecure:
    "Камер ажиллахын тулд аюулгүй (HTTPS) холболт шаардлагатай байна.",
  permission:
    "Камерын зөвшөөрөл олгогдсонгүй. Браузерын тохиргооноос камерын эрхийг зөвшөөрч, дахин оролдоно уу.",
  notFound:
    "Камер олдсонгүй. Төхөөрөмжинд камер холбогдсон эсэхийг шалгана уу.",
  busy: "Камерыг нээх боломжгүй байна. Өөр програм камер ашиглаж байж магадгүй.",
  generic: "Камерыг асаахад алдаа гарлаа. Дахин оролдоно уу.",
  modelFail: "AI моделийг ачаалж чадсангүй. Дахин оролдоно уу.",
} as const;

interface UseHandTrackingOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onLocked?: (gesture: Gesture) => void;
}

export function useHandTracking({ videoRef, canvasRef, onLocked }: UseHandTrackingOptions) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("off");
  const [statusMessage, setStatusMessage] = useState<string>(MESSAGES.cameraOff);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [handPresent, setHandPresent] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<Gesture | null>(null);
  const [stability, setStability] = useState(0); // 0..1
  const [lockedGesture, setLockedGesture] = useState<Gesture | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  // stability tracker refs
  const gestureRef = useRef<Gesture | null>(null);
  const sinceRef = useRef(0);
  const missRef = useRef(0);
  const lockedRef = useRef<Gesture | null>(null);
  const stabilityStepRef = useRef(-1);

  const onLockedRef = useRef(onLocked);
  onLockedRef.current = onLocked;

  const resetDetection = useCallback(() => {
    gestureRef.current = null;
    sinceRef.current = 0;
    missRef.current = 0;
    lockedRef.current = null;
    stabilityStepRef.current = -1;
    setDetectedGesture(null);
    setStability(0);
    setLockedGesture(null);
    setHandPresent(false);
  }, []);

  /** Force the player to re-hold their gesture before the next round. */
  const resetStability = useCallback(() => {
    sinceRef.current = performance.now();
    if (lockedRef.current) {
      lockedRef.current = null;
      setLockedGesture(null);
    }
    stabilityStepRef.current = -1;
    setStability(0);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [videoRef]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopLoop();
    stopStream();
    lastVideoTimeRef.current = -1;
    resetDetection();
    setCameraStatus("off");
    setStatusMessage(MESSAGES.cameraOff);
    setErrorMessage(null);
  }, [resetDetection, stopLoop, stopStream]);

  useEffect(() => {
    return () => {
      stopLoop();
      stopStream();
      disposeHandLandmarker();
      landmarkerRef.current = null;
    };
  }, [stopLoop, stopStream]);

  const drawOverlay = useCallback(
    (canvas: HTMLCanvasElement, video: HTMLVideoElement, lm: Landmark[] | null) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(canvas.clientWidth * dpr);
      const ch = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.clearRect(0, 0, cw, ch);
      if (!lm) return;

      // object-cover crop math so landmarks align with the displayed video
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const ox = (cw - dw) / 2;
      const oy = (ch - dh) / 2;

      const px = (p: Landmark) => p.x * dw + ox;
      const py = (p: Landmark) => p.y * dh + oy;

      const locked = lockedRef.current !== null;
      const lineColor = locked ? "rgba(167,139,250,0.85)" : "rgba(56,189,248,0.8)";
      const jointColor = locked ? "#c4b5fd" : "#7dd3fc";
      const glowColor = locked ? "rgba(167,139,250,0.9)" : "rgba(56,189,248,0.9)";

      ctx.lineWidth = Math.max(2, 2.6 * dpr);
      ctx.lineCap = "round";
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.moveTo(px(lm[a]), py(lm[a]));
        ctx.lineTo(px(lm[b]), py(lm[b]));
      }
      ctx.stroke();

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8 * dpr;
      ctx.fillStyle = jointColor;
      for (let i = 0; i < lm.length; i++) {
        const r = (i === LM.WRIST ? 5 : i % 4 === 0 ? 4 : 3) * dpr;
        ctx.beginPath();
        ctx.arc(px(lm[i]), py(lm[i]), r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    },
    []
  );

  const processFrame = useCallback(
    (lm: Landmark[] | null, now: number) => {
      if (!lm) {
        // hand lost — allow a couple of dropped frames before resetting
        missRef.current += 1;
        if (missRef.current > 4 || gestureRef.current === null) {
          if (gestureRef.current !== null || lockedRef.current !== null) resetDetection();
          else setHandPresent((p) => (p ? false : p));
        }
        return;
      }

      const g = classifyGesture(lm);

      if (g && g === gestureRef.current) {
        missRef.current = 0;
        const progress = Math.min(1, (now - sinceRef.current) / STABILIZE_MS);
        const step = Math.round(progress * 20);
        if (step !== stabilityStepRef.current) {
          stabilityStepRef.current = step;
          setStability(progress);
        }
        if (progress >= 1 && lockedRef.current === null) {
          lockedRef.current = g;
          setLockedGesture(g);
          onLockedRef.current?.(g);
        }
      } else if (g) {
        // a different valid gesture appeared — restart the stability timer
        gestureRef.current = g;
        sinceRef.current = now;
        missRef.current = 0;
        lockedRef.current = null;
        stabilityStepRef.current = 0;
        setLockedGesture(null);
        setStability(0);
        setDetectedGesture(g);
        setHandPresent(true);
      } else {
        // landmarks but no valid pose — tolerate brief transitions
        missRef.current += 1;
        if (missRef.current > 6) {
          gestureRef.current = null;
          lockedRef.current = null;
          stabilityStepRef.current = -1;
          setDetectedGesture(null);
          setLockedGesture(null);
          setStability(0);
        }
      }
    },
    [resetDetection]
  );

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const loop = () => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(loop);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker || video.readyState < 2) return;
      if (video.currentTime === lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = video.currentTime;

      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const lm = (result.landmarks?.[0] as Landmark[] | undefined) ?? null;
        processFrame(lm, performance.now());
        drawOverlay(canvas, video, lm);
      } catch {
        // transient inference error — skip frame
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [drawOverlay, processFrame, canvasRef, videoRef]);

  /** Starts camera + model. Resolves to true when tracking is live. */
  const start = useCallback(async (): Promise<boolean> => {
    if (cameraStatus === "starting" || cameraStatus === "on") return false;
    setErrorMessage(null);
    setCameraStatus("starting");
    setStatusMessage(MESSAGES.starting);
    resetDetection();

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("insecure"), { name: "InsecureContext" });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // autoplay may resolve late; the loop guards on readyState
        }
      }

      setStatusMessage(MESSAGES.loadingModel);
      if (!landmarkerRef.current) {
        landmarkerRef.current = await getHandLandmarker();
      }

      setCameraStatus("on");
      setStatusMessage(MESSAGES.handLost);
      lastVideoTimeRef.current = -1;
      startLoop();
      return true;
    } catch (err) {
      stopStream();
      const name = err instanceof Error ? (err as DOMException).name : "";
      let msg: string = MESSAGES.generic;
      if (name === "InsecureContext") msg = MESSAGES.insecure;
      else if (name === "NotAllowedError" || name === "PermissionDeniedError") msg = MESSAGES.permission;
      else if (name === "NotFoundError" || name === "DevicesNotFoundError") msg = MESSAGES.notFound;
      else if (name === "NotReadableError" || name === "TrackStartError") msg = MESSAGES.busy;
      else if (name === "AbortError") msg = MESSAGES.generic;
      else {
        // model load failure surfaces as a generic Error
        if (!(err instanceof DOMException)) msg = MESSAGES.modelFail;
      }
      setErrorMessage(msg);
      setStatusMessage(MESSAGES.error);
      setCameraStatus("error");
      return false;
    }
  }, [cameraStatus, resetDetection, startLoop, stopStream, videoRef]);

  return {
    cameraStatus,
    statusMessage,
    errorMessage,
    handPresent,
    detectedGesture,
    stability,
    lockedGesture,
    start,
    stop,
    resetStability,
  };
}
