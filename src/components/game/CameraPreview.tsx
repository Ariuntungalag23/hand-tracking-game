"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Camera, CameraOff, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import type { CameraStatus } from "@/hooks/useHandTracking";

interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cameraStatus: CameraStatus;
  statusMessage: string;
  errorMessage: string | null;
  handPresent: boolean;
  countdown: number | null;
  startLabel: string;
  onStartCamera: () => void;
}

export function CameraPreview({
  videoRef,
  canvasRef,
  cameraStatus,
  statusMessage,
  errorMessage,
  handPresent,
  countdown,
  startLabel,
  onStartCamera,
}: CameraPreviewProps) {
  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-3xl border bg-[#0c0f16] transition-all duration-500 sm:aspect-video ${
        cameraStatus === "on" && handPresent
          ? "border-sky-400/50 shadow-[0_0_60px_-16px_rgba(56,189,248,0.55)]"
          : "border-white/10"
      }`}
      role="region"
      aria-label="Камерын харагдац"
    >
      {/* live feed + skeleton overlay (mirrored for natural interaction) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
        aria-hidden="true"
      />

      {/* hand-tracking status indicator */}
      {cameraStatus === "on" && (
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md">
          <span
            className={`relative flex h-2 w-2 ${
              handPresent ? "text-emerald-400" : "text-zinc-500"
            }`}
          >
            {handPresent && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                handPresent ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
          </span>
          <span className={handPresent ? "text-emerald-300" : "text-zinc-300"}>
            {handPresent ? "Гар илрүүлэгдсэн" : "Гар олдсонгүй"}
          </span>
        </div>
      )}

      {/* AI badge */}
      {cameraStatus === "on" && (
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 backdrop-blur-md">
          <SparkleIcon />
          AI хяналт
        </div>
      )}

      {/* countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
            <motion.span
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="bg-gradient-to-br from-sky-300 via-sky-400 to-violet-400 bg-clip-text text-[7rem] font-black leading-none text-transparent sm:text-[9rem]"
            >
              {countdown}
            </motion.span>
          </div>
        )}
      </AnimatePresence>

      {/* camera off placeholder */}
      {cameraStatus === "off" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c0f16] p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <CameraOff className="h-7 w-7 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">Камер идэвхгүй байна</p>
            <p className="mt-1 text-xs text-zinc-500">
              Тоглоом эхлүүлэхдээ камерын зөвшөөрөл шаардлагатай
            </p>
          </div>
          <button
            onClick={onStartCamera}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" />
            {startLabel}
          </button>
        </div>
      )}

      {/* starting placeholder */}
      {cameraStatus === "starting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c0f16]/95 p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-sm text-zinc-300">{statusMessage}</p>
        </div>
      )}

      {/* error state */}
      {cameraStatus === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0c0f16]/95 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-300">{errorMessage}</p>
          <button
            onClick={onStartCamera}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.12]"
          >
            <Camera className="h-4 w-4" />
            Дахин оролдох
          </button>
        </div>
      )}
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" />
    </svg>
  );
}
