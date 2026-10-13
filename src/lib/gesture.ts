/**
 * Gesture classification from MediaPipe hand landmarks.
 *
 * All math uses landmark-relative distances, which makes the classifier
 * invariant to hand orientation, distance from the camera and scale.
 * Runs fully on-device, no data leaves the browser.
 */

export type Gesture = "rock" | "paper" | "scissors";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** MediaPipe 21-point hand landmark indices. */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/** Skeleton connections used for drawing the hand overlay. */
export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

function dist3(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * A finger counts as extended when its tip sits clearly farther from the
 * wrist than its PIP joint. A curled finger always folds the tip back
 * towards the palm, regardless of how the hand is rotated.
 */
function fingerExtended(lm: Landmark[], tipIdx: number, pipIdx: number): boolean {
  const wrist = lm[LM.WRIST];
  return dist3(lm[tipIdx], wrist) > dist3(lm[pipIdx], wrist) * 1.08;
}

/**
 * Thumb: compare tip vs IP joint distance to the pinky MCP. Works for both
 * hands and every orientation (thumb out = tip far, thumb tucked = tip near).
 */
function thumbExtended(lm: Landmark[]): boolean {
  const ref = lm[LM.PINKY_MCP];
  return dist3(lm[LM.THUMB_TIP], ref) > dist3(lm[LM.THUMB_IP], ref) * 1.12;
}

/**
 * Classify a hand into rock / paper / scissors.
 * Returns null when the pose matches none of them (so accidental poses
 * never register as a move).
 */
export function classifyGesture(lm: Landmark[] | null | undefined): Gesture | null {
  if (!lm || lm.length < 21) return null;

  const index = fingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP);
  const middle = fingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP);
  const ring = fingerExtended(lm, LM.RING_TIP, LM.RING_PIP);
  const pinky = fingerExtended(lm, LM.PINKY_TIP, LM.PINKY_PIP);
  const thumb = thumbExtended(lm);

  const allFolded = !index && !middle && !ring && !pinky;
  const allExtended = index && middle && ring && pinky;

  // Rock (Чулуу): closed fist — four fingers folded, thumb ignored
  // (players make fists with the thumb wrapped in or out).
  if (allFolded) return "rock";

  // Paper (Даавуу): open hand — four fingers extended, thumb ignored.
  if (allExtended) return "paper";

  // Scissors (Хайч): index + middle in a V, ring + pinky folded.
  if (index && middle && !ring && !pinky) return "scissors";

  // Thumb state kept for future extensions; unused today.
  void thumb;

  return null;
}

export const GESTURE_EMOJI: Record<Gesture, string> = {
  rock: "✊",
  paper: "✋",
  scissors: "✌️",
};

export const GESTURE_LABEL: Record<Gesture, string> = {
  rock: "Чулуу",
  paper: "Даавуу",
  scissors: "Хайч",
};

/** Returns "win" | "lose" | "draw" from the player's perspective. */
export function decideRound(
  player: Gesture,
  ai: Gesture
): "win" | "lose" | "draw" {
  if (player === ai) return "draw";
  const beats: Record<Gesture, Gesture> = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };
  return beats[player] === ai ? "win" : "lose";
}

export function randomAiGesture(): Gesture {
  const options: Gesture[] = ["rock", "paper", "scissors"];
  return options[Math.floor(Math.random() * options.length)];
}
