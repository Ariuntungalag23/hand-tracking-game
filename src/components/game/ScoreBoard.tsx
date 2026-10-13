"use client";

interface ScoreBoardProps {
  playerScore: number;
  aiScore: number;
  round: number;
}

export function ScoreBoard({ playerScore, aiScore, round }: ScoreBoardProps) {
  return (
    <div className="grid grid-cols-3 items-stretch rounded-2xl border border-white/10 bg-white/[0.04] p-1">
      <div className="flex flex-col items-center justify-center rounded-xl py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Таны оноо
        </span>
        <span className="mt-0.5 bg-gradient-to-r from-sky-300 to-cyan-300 bg-clip-text text-3xl font-black text-transparent tabular-nums">
          {playerScore}
        </span>
      </div>

      <div className="relative flex flex-col items-center justify-center py-3">
        <span className="absolute inset-y-2 left-0 w-px bg-white/10" aria-hidden="true" />
        <span className="absolute inset-y-2 right-0 w-px bg-white/10" aria-hidden="true" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Тойрог
        </span>
        <span className="mt-0.5 text-2xl font-bold tabular-nums text-zinc-100">
          {round}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          AI-ийн оноо
        </span>
        <span className="mt-0.5 bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-3xl font-black text-transparent tabular-nums">
          {aiScore}
        </span>
      </div>
    </div>
  );
}
