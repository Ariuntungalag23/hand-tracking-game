"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { GESTURE_EMOJI, GESTURE_LABEL, type Gesture } from "@/lib/gesture";

interface GestureCardProps {
  side: "player" | "ai";
  gesture: Gesture | null;
  locked?: boolean;
  hidden?: boolean; // AI hides its move until reveal
  stability?: number; // 0..1 (player card only)
  hint?: string;
}

export function GestureCard({
  side,
  gesture,
  locked = false,
  hidden = false,
  stability,
  hint,
}: GestureCardProps) {
  const isPlayer = side === "player";
  const emoji = gesture ? GESTURE_EMOJI[gesture] : null;
  const label = gesture ? GESTURE_LABEL[gesture] : null;

  return (
    <motion.div
      animate={
        locked
          ? { boxShadow: "0 0 42px -14px rgba(56,189,248,0.6)" }
          : { boxShadow: "0 0 0px 0px rgba(0,0,0,0)" }
      }
      transition={{ duration: 0.4 }}
      className={`relative flex flex-col items-center rounded-2xl border p-4 text-center transition-colors duration-300 sm:p-5 ${
        locked
          ? isPlayer
            ? "border-sky-400/60 bg-sky-400/[0.08]"
            : "border-violet-400/60 bg-violet-400/[0.08]"
          : "border-white/10 bg-white/[0.04]"
      }`}
      aria-live={isPlayer ? "polite" : undefined}
    >
      <div className="flex w-full items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {isPlayer ? (
          <User className="h-3.5 w-3.5 text-sky-400" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-violet-400" />
        )}
        {isPlayer ? "Таны хөдөлгөөн" : "AI-ийн хөдөлгөөн"}
      </div>

      <div className="my-2 flex h-16 items-center justify-center sm:h-20">
        {hidden ? (
          <span className="select-none text-5xl text-zinc-600 sm:text-6xl" aria-label="Нууцлалтай">
            ?
          </span>
        ) : emoji ? (
          <motion.span
            key={emoji}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="select-none text-5xl leading-none sm:text-6xl"
          >
            {emoji}
          </motion.span>
        ) : (
          <span className="select-none text-5xl leading-none text-zinc-700 sm:text-6xl" aria-hidden="true">
            ✊
          </span>
        )}
      </div>

      <div className="min-h-5 text-sm font-semibold">
        {hidden ? (
          <span className="text-zinc-500">Нууц</span>
        ) : label ? (
          <span className={locked ? (isPlayer ? "text-sky-300" : "text-violet-300") : "text-zinc-200"}>
            {label}
          </span>
        ) : (
          <span className="text-zinc-500">Танигдаагүй</span>
        )}
      </div>

      {locked && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            isPlayer ? "bg-sky-400/15 text-sky-300" : "bg-violet-400/15 text-violet-300"
          }`}
        >
          Тогтсон
        </motion.span>
      )}

      {isPlayer && stability !== undefined && gesture && !locked && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.round(stability * 100)}%` }}
          />
        </div>
      )}

      {hint && (
        <p className="mt-2 text-[11px] leading-snug text-zinc-500">{hint}</p>
      )}
    </motion.div>
  );
}
