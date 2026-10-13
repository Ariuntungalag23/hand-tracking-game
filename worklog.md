# Worklog

---
Task ID: 1
Agent: main (Super Z)
Task: Build "Хайч, чулуу, даавуу" — browser-based Rock Paper Scissors with real-time webcam hand tracking (MediaPipe), React/TypeScript/Tailwind, all UI text in Mongolian.

Work Log:
- Initialized fullstack environment (init-fullstack.sh), verified Next.js 16 scaffold on port 3000.
- Installed `@mediapipe/tasks-vision@1.1.0`; copied WASM runtime to `public/mediapipe/wasm/`; downloaded float16 hand_landmarker.task (7.8 MB) to `public/mediapipe/models/` — fully self-hosted, no CDN dependency at runtime.
- `src/lib/gesture.ts`: orientation-invariant gesture classifier. Finger extended = dist3(tip, wrist) > dist3(pip, wrist)×1.08; thumb via pinky-MCP reference. Rock = 4 fingers folded, Paper = 4 extended, Scissors = index+middle extended & ring+pinky folded; thumb ignored for robustness. Plus decideRound(), randomAiGesture(), HAND_CONNECTIONS.
- `src/lib/handLandmarkerClient.ts`: HandLandmarker factory — GPU→CPU delegate fallback, local model→Google CDN fallback, singleton + dispose.
- `src/hooks/useHandTracking.ts`: camera lifecycle (getUserMedia 1280×720), Mongolian error mapping (NotAllowedError/NotFoundError/NotReadableError/InsecureContext/model fail), RAF detection loop with `detectForVideo`, canvas skeleton overlay (object-cover crop math, mirrored, glow joints, blue→violet when locked), 800 ms stability tracker with flicker tolerance (≤4 lost frames, ≤6 invalid-pose frames), start()/stop()/resetStability() API.
- `src/components/game/CameraPreview.tsx`: video+canvas mirrored, status pill (Гар илрүүлэгдсэн/Гар олдсонгүй), AI badge, countdown overlay (framer-motion), off/starting/error placeholders with retry.
- `src/components/game/GestureCard.tsx`: player (real-time gesture + stability progress bar + ТОГТСОН badge) / AI (hidden until reveal) cards.
- `src/components/game/ScoreBoard.tsx`: Таны оноо | Тойрог | AI-ийн оноо with gradient numerals.
- `src/components/game/GameClient.tsx`: game orchestrator — idle/playing/countdown/result phases, event-driven (no setState-in-effect lint violations): beginCamera flips phase on success, runRoundSequence drives 3-2-1 countdown via timers, reveal + scoring + round increment, restart, camera toggle; controls, how-to-play, privacy note.
- `src/app/page.tsx`: dynamic import ssr:false (webcam + WASM are client-only). `layout.tsx`: Mongolian metadata, lang="mn".
- Fixed ESLint: ignored `public/mediapipe/**` vendor bundles; refactored effects → event handlers for react-hooks/set-state-in-effect.
- Unit tests (scripts/test-gesture.ts, bun): 12/12 pass — paper/rock/scissors with thumb variations + invalid poses + edge inputs.
- Agent Browser E2E with Chrome fake-media flags + synthetic hand streams (real palm/scissors photos + AI-generated fist drawn to canvas.captureStream, getUserMedia patched): verified idle render, NotFoundError path with Mongolian message, GPU graph start ("Graph successfully started running"), hand detection, all 3 gestures classified correctly E2E (Даавуу/Хайч/Чулуу), 800 ms lock → confirm → countdown → AI reveal → results (AI хожлоо!, Тэнцлээ!, Та хожлоо! — all logically correct), score/round tracking, re-stabilization after result, restart reset, camera toggle, mobile 390×844 responsive layout, skeleton overlay drawn on landmarks. No page errors, lint clean, dev.log clean.

Stage Summary:
- Deliverable: runnable Next.js 16 app at `/` — complete webcam hand-tracking RPS game, all UI text Mongolian, dark charcoal + electric blue/soft purple design.
- Key files: src/lib/gesture.ts, src/lib/handLandmarkerClient.ts, src/hooks/useHandTracking.ts, src/components/game/{CameraPreview,GestureCard,ScoreBoard,GameClient}.tsx, src/app/{page,layout}.tsx, public/mediapipe/{wasm,models}/.
- Test artifacts: scripts/test-gesture.ts (unit), scripts/*.png (verification screenshots). Test images removed from public/.
