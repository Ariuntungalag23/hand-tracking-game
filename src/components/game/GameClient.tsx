"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CameraOff,
  Check,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CameraPreview } from "./CameraPreview";
import { GestureCard } from "./GestureCard";
import { ScoreBoard } from "./ScoreBoard";
import { useHandTracking } from "@/hooks/useHandTracking";
import { decideRound, randomAiGesture, type Gesture } from "@/lib/gesture";

type Phase = "idle" | "playing" | "countdown" | "result";
type RoundResult = "win" | "lose" | "draw";

const COUNTDOWN_STEP_MS = 700;

const RESULT_TEXT: Record<RoundResult, string> = {
  win: "Та хожлоо!",
  lose: "AI хожлоо!",
  draw: "Тэнцлээ!",
};

export default function GameClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [round, setRound] = useState(1);
  const [playerMove, setPlayerMove] = useState<Gesture | null>(null);
  const [aiMove, setAiMove] = useState<Gesture | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const playerMoveRef = useRef<Gesture | null>(null);
  const revealTimerRef = useRef<number | null>(null);

  const tracking = useHandTracking({ videoRef, canvasRef });

  // clear pending reveal timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    };
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  /** Camera + model startup from a user gesture; flips phase on success. */
  const beginCamera = useCallback(async () => {
    const ok = await tracking.start();
    if (ok) setPhase("playing");
  }, [tracking]);

  /** Countdown → AI reveal → result. Runs entirely off timers (no effects). */
  const runRoundSequence = useCallback(() => {
    setCountdown(3);
    window.setTimeout(() => setCountdown(2), COUNTDOWN_STEP_MS);
    window.setTimeout(() => setCountdown(1), COUNTDOWN_STEP_MS * 2);
    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      setCountdown(null);
      const ai = randomAiGesture();
      const move = playerMoveRef.current;
      setAiMove(ai);
      if (move) {
        const r = decideRound(move, ai);
        setResult(r);
        if (r === "win") setPlayerScore((s) => s + 1);
        else if (r === "lose") setAiScore((s) => s + 1);
      }
      setRound((r0) => r0 + 1);
      setPhase("result");
    }, COUNTDOWN_STEP_MS * 3);
  }, []);

  const handleStart = useCallback(() => {
    void beginCamera();
  }, [beginCamera]);

  const handleConfirm = useCallback(() => {
    if (phase !== "playing" || !tracking.lockedGesture) return;
    const move = tracking.lockedGesture;
    playerMoveRef.current = move;
    setPlayerMove(move);
    tracking.resetStability(); // next round requires a fresh hold
    setPhase("countdown");
    runRoundSequence();
  }, [phase, runRoundSequence, tracking]);

  const handleRestart = useCallback(() => {
    clearRevealTimer();
    setPlayerScore(0);
    setAiScore(0);
    setRound(1);
    setPlayerMove(null);
    setAiMove(null);
    setResult(null);
    setCountdown(null);
    playerMoveRef.current = null;
    tracking.resetStability();
    setPhase(tracking.cameraStatus === "on" ? "playing" : "idle");
  }, [clearRevealTimer, tracking]);

  const handleCameraToggle = useCallback(() => {
    if (tracking.cameraStatus === "on") {
      clearRevealTimer();
      tracking.stop();
      setCountdown(null);
      setAiMove(null);
      setResult(null);
      setPhase("idle");
    } else if (tracking.cameraStatus === "off" || tracking.cameraStatus === "error") {
      void beginCamera();
    }
  }, [beginCamera, clearRevealTimer, tracking]);

  const cameraOn = tracking.cameraStatus === "on";
  const startLabel =
    playerScore + aiScore === 0 && round === 1 ? "Тоглоом эхлүүлэх" : "Камер асаах";

  const hint = (() => {
    if (tracking.cameraStatus === "starting") return "Камер асааж байна…";
    if (tracking.cameraStatus === "error")
      return "Камерын тохиргоог шалгаад дахин оролдоно уу.";
    if (phase === "idle") return "Тоглоом эхлүүлэх товчийг даран камераа идэвхжүүлнэ үү.";
    if (phase === "countdown") return "AI хөдөлгөөнөө сонгож байна…";
    if (phase === "result")
      return "Дараагийн тойрог — шинэ хөдөлгөөн хийгээд баталгаажуулна уу.";
    if (!tracking.handPresent)
      return "Гараа камерын өмнө харуулан ✊ ✋ ✌️ хөдөлгөөний нэгийг хийнэ үү.";
    if (tracking.lockedGesture)
      return "Хөдөлгөөн тогтлоо! Баталгаажуулах товчийг дарна уу.";
    return "Хөдөлгөөнөө ойролцоогоор 0.8 секундын турш тогтвортой барина уу.";
  })();

  const confirmDisabled = phase !== "playing" || !tracking.lockedGesture;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b0e14] text-zinc-100">
      {/* ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-500/[0.13] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-violet-500/[0.12] blur-[120px]"
      />

      <header className="relative mx-auto w-full max-w-6xl px-4 pb-2 pt-10 text-center sm:pt-14">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-zinc-300">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          AI гар хяналттай тоглоом
        </div>
        <h1 className="bg-gradient-to-r from-sky-300 via-sky-400 to-violet-400 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
          Хайч, чулуу, даавуу
        </h1>
        <p className="mt-3 text-sm text-zinc-400 sm:text-base">
          Гараа ашиглан AI-тай тогло!
        </p>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
          {/* camera column */}
          <div className="flex flex-col gap-4">
            <CameraPreview
              videoRef={videoRef}
              canvasRef={canvasRef}
              cameraStatus={tracking.cameraStatus}
              statusMessage={tracking.statusMessage}
              errorMessage={tracking.errorMessage}
              handPresent={tracking.handPresent}
              countdown={countdown}
              startLabel={startLabel}
              onStartCamera={handleStart}
            />
            <p className="flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              Видео бүх боловсруулалт зөвхөн таны хөтөчинд локал орчинд явагдна — сервер рүү дамжихгүй.
            </p>
          </div>

          {/* game panel column */}
          <div className="flex flex-col gap-4">
            <ScoreBoard playerScore={playerScore} aiScore={aiScore} round={round} />

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <GestureCard
                side="player"
                gesture={
                  phase === "countdown" || phase === "result"
                    ? playerMove
                    : tracking.detectedGesture
                }
                locked={phase === "playing" && tracking.lockedGesture !== null}
                stability={tracking.stability}
                hint={
                  phase === "playing" && tracking.handPresent && !tracking.lockedGesture
                    ? "Тогтворжилт"
                    : undefined
                }
              />
              <GestureCard
                side="ai"
                gesture={aiMove}
                hidden={phase !== "result"}
              />
            </div>

            {/* round result banner */}
            <div className="min-h-[76px]">
              <AnimatePresence mode="wait">
                {phase === "result" && result && (
                  <motion.div
                    key={`${round}-${result}`}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                    className={`flex h-full flex-col items-center justify-center rounded-2xl border p-4 text-center ${
                      result === "win"
                        ? "border-sky-400/40 bg-sky-400/[0.09]"
                        : result === "lose"
                          ? "border-violet-400/40 bg-violet-400/[0.09]"
                          : "border-white/15 bg-white/[0.05]"
                    }`}
                  >
                    <p
                      className={`text-xl font-black sm:text-2xl ${
                        result === "win"
                          ? "text-sky-300"
                          : result === "lose"
                            ? "text-violet-300"
                            : "text-zinc-200"
                      }`}
                    >
                      {RESULT_TEXT[result]}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Дараагийн тойрог — шинэ хөдөлгөөн хийнэ үү
                    </p>
                  </motion.div>
                )}
                {phase !== "result" && (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm leading-relaxed text-zinc-400"
                  >
                    {hint}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* controls */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {!cameraOn && tracking.cameraStatus !== "starting" ? (
                <button
                  onClick={handleStart}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Camera className="h-4 w-4" />
                  {startLabel}
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={confirmDisabled}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
                >
                  <Check className="h-4 w-4" />
                  Баталгаажуулах
                </button>
              )}

              <button
                onClick={handleRestart}
                disabled={phase === "countdown"}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw className="h-4 w-4" />
                Дахин эхлүүлэх
              </button>

              <button
                onClick={handleCameraToggle}
                disabled={tracking.cameraStatus === "starting"}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40 ${
                  cameraOn ? "" : "hidden"
                }`}
                aria-label={cameraOn ? "Камер унтраах" : "Камер асаах"}
              >
                {cameraOn ? (
                  <CameraOff className="h-4 w-4" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {cameraOn ? "Камер унтраах" : "Камер асаах"}
              </button>
            </div>

            {/* how to play */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Хэрхэн тоглох вэ?
              </p>
              <ol className="space-y-2.5 text-xs leading-relaxed text-zinc-400">
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-[10px] font-bold text-sky-300">
                    1
                  </span>
                  Камераа асааж, гараа камерын өмнө барина уу.
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-[10px] font-bold text-sky-300">
                    2
                  </span>
                  ✊ Чулуу, ✋ Даавуу, ✌️ Хайч хөдөлгөөний нэгийг ~0.8 секундын турш тогтвортой хийнэ үү.
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-400/15 text-[10px] font-bold text-violet-300">
                    3
                  </span>
                  Хөдөлгөөн тогтсоны дараа «Баталгаажуулах» товчийг даран AI-тай өрсөлдөөрэй!
                </li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative mt-auto border-t border-white/[0.06] py-5 text-center text-xs text-zinc-600">
        MediaPipe Hand Landmarker · Бүх боловсруулалт хөтчийн дотор локал явагдана
      </footer>
    </div>
  );
}
