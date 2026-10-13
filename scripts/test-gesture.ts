/**
 * Unit test for gesture classification with synthetic hand landmarks.
 * Run: bun scripts/test-gesture.ts
 */
import { classifyGesture, type Landmark } from "../src/lib/gesture";

function makeHand(opts: {
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  thumb?: boolean;
}): Landmark[] {
  const { index = false, middle = false, ring = false, pinky = false, thumb = false } = opts;

  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8, z: 0 }));
  // wrist
  lm[0] = { x: 0.5, y: 0.9, z: 0 };

  // finger chains: [mcp, pip, dip, tip] x-offsets
  const fingers: Array<[number, number, number, number, number, boolean]> = [
    [5, 6, 7, 8, 0.42, index],   // index
    [9, 10, 11, 12, 0.5, middle], // middle
    [13, 14, 15, 16, 0.58, ring], // ring
    [17, 18, 19, 20, 0.66, pinky], // pinky
  ];

  for (const [mcp, pip, dip, tip, x, extended] of fingers) {
    if (extended) {
      lm[mcp] = { x, y: 0.7, z: 0 };
      lm[pip] = { x, y: 0.58, z: 0 };
      lm[dip] = { x, y: 0.48, z: 0 };
      lm[tip] = { x, y: 0.38, z: 0 };
    } else {
      // curled: pip bends, tip folds back toward the palm near the wrist
      lm[mcp] = { x, y: 0.7, z: 0 };
      lm[pip] = { x, y: 0.6, z: 0 };
      lm[dip] = { x: x + 0.01, y: 0.68, z: 0.02 };
      lm[tip] = { x: x, y: 0.78, z: 0.04 };
    }
  }

  // thumb chain 1..4
  if (thumb) {
    lm[1] = { x: 0.36, y: 0.82, z: 0 };
    lm[2] = { x: 0.3, y: 0.74, z: 0 };
    lm[3] = { x: 0.26, y: 0.66, z: 0 };
    lm[4] = { x: 0.22, y: 0.58, z: 0 };
  } else {
    // tucked across the palm
    lm[1] = { x: 0.36, y: 0.82, z: 0 };
    lm[2] = { x: 0.38, y: 0.74, z: 0 };
    lm[3] = { x: 0.42, y: 0.72, z: 0 };
    lm[4] = { x: 0.46, y: 0.74, z: 0 };
  }

  return lm;
}

let pass = 0;
let fail = 0;

function expect(name: string, actual: string | null, expected: string | null) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: expected=${expected} actual=${actual}`);
}

// Paper — full open hand (thumb both up and tucked are still paper)
expect("paper (thumb out)", classifyGesture(makeHand({ index: true, middle: true, ring: true, pinky: true, thumb: true })), "paper");
expect("paper (thumb in)", classifyGesture(makeHand({ index: true, middle: true, ring: true, pinky: true, thumb: false })), "paper");

// Rock — fist (thumb variations)
expect("rock (thumb in)", classifyGesture(makeHand({})), "rock");
expect("rock (thumb out)", classifyGesture(makeHand({ thumb: true })), "rock");

// Scissors — V sign with thumb variations
expect("scissors (thumb out)", classifyGesture(makeHand({ index: true, middle: true, thumb: true })), "scissors");
expect("scissors (thumb in)", classifyGesture(makeHand({ index: true, middle: true })), "scissors");

// Invalid poses must not register
expect("pointing (index only)", classifyGesture(makeHand({ index: true })), null);
// thumb-only pose reads as a fist — intentional: real players make fists with
// the thumb out, and ignoring the thumb keeps rock detection robust
expect("thumb only (fist variant)", classifyGesture(makeHand({ thumb: true })), "rock");
expect("three fingers", classifyGesture(makeHand({ index: true, middle: true, ring: true })), null);
expect("ring+pinky", classifyGesture(makeHand({ ring: true, pinky: true })), null);

// Edge inputs
expect("empty input", classifyGesture(null), null);
expect("short array", classifyGesture(makeHand({}).slice(0, 10)), null);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
