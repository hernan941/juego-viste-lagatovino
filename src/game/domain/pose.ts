// Pure TS, no Phaser (ADR 0010). How the cat poses in the Showcase without tiring the player, and the photo poses.
import type { Expression } from './expressions';

/** The purr plays on the first two in-love poses, and after that one time in four. `n` counts the in-love poses. */
export function shouldPurr(n: number, rng: () => number): boolean {
  return n < 2 || rng() < 0.25;
}

export type Flourish = 'squash' | 'wiggle' | 'glance';
const FLOURISHES: readonly Flourish[] = ['squash', 'wiggle', 'glance'];

/** What the cat does on its `n`-th pose besides the expression: it rotates, so the pose never looks mechanical. */
export function flourishFor(n: number): Flourish {
  return FLOURISHES[((n % 3) + 3) % 3];
}

// ---- Photo mode poses (second stage, S6): no new body art, only a transformation and a face ----

export const POSE_IDS = ['sentadito', 'coqueto', 'saltito', 'dormilon'] as const;
export type PoseId = (typeof POSE_IDS)[number];

export interface PoseDef {
  id: PoseId;
  expression: Expression;
  /** Head tilt in degrees. */
  headTilt: number;
  /** How many px the frozen cat floats up. */
  lift: number;
  /** Scale of the shadow under the cat. */
  shadowScale: number;
  /** Body squash. */
  squash: { x: number; y: number };
  /** Sticker id that comes with the pose. */
  sticker?: string;
}

export const POSES: readonly PoseDef[] = [
  { id: 'sentadito', expression: 'feliz', headTilt: 0, lift: 0, shadowScale: 1, squash: { x: 1, y: 1 } },
  { id: 'coqueto', expression: 'amor', headTilt: 8, lift: 0, shadowScale: 1, squash: { x: 1, y: 1 } },
  { id: 'saltito', expression: 'feliz', headTilt: 0, lift: 24, shadowScale: 0.6, squash: { x: 1, y: 1 } },
  { id: 'dormilon', expression: 'parpadeo', headTilt: 0, lift: 0, shadowScale: 1, squash: { x: 1.04, y: 0.95 }, sticker: 'zzz' },
];

export function poseById(id: string): PoseDef {
  const pose = POSES.find((p) => p.id === id);
  if (!pose) throw new Error(`Unknown pose "${id}"`);
  return pose;
}
