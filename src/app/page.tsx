"use client";

import dynamic from "next/dynamic";

// The game uses MediaPipe WASM + webcam APIs, so it must run client-side only.
const GameClient = dynamic(() => import("@/components/game/GameClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0e14]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-sky-400" />
        <p className="text-sm text-zinc-500">Ачаалж байна…</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <GameClient />;
}
