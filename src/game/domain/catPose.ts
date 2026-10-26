// Pure TS, no Phaser (ADR 0010). The photo poses of the cat (S6, docs/design/segunda-etapa.md): transformations of the
// render and a face, with no new body art. `domain/pose.ts` is the Showcase's own (flourishes), a different thing.
import type { Expression } from './expressions';

export const CAT_POSE_IDS = ['sentadito', 'coqueto', 'saltito', 'dormilon'] as const;
export type CatPoseId = (typeof CAT_POSE_IDS)[number];

export interface CatPose {
  id: CatPoseId;
  /** Tilt in degrees, around the feet. */
  angle: number;
  /** Px (of the 512 canvas) the cat is frozen above the floor. */
  lift: number;
  scaleX: number;
  scaleY: number;
  /** Factor for the shadow under the cat (1 = normal): the scene that draws the shadow reads it. */
  shadow: number;
  expression: Expression;
}

const POSES: Record<CatPoseId, CatPose> = {
  // The current pose: sitting.
  sentadito: { id: 'sentadito', angle: 0, lift: 0, scaleX: 1, scaleY: 1, shadow: 1, expression: 'normal' },
  coqueto: { id: 'coqueto', angle: 8, lift: 0, scaleX: 1, scaleY: 1, shadow: 1, expression: 'amor' },
  saltito: { id: 'saltito', angle: 0, lift: 24, scaleX: 1, scaleY: 1, shadow: 0.7, expression: 'feliz' },
  // The "zzz" sticker is drawn by the photo scene.
  dormilon: { id: 'dormilon', angle: 0, lift: 0, scaleX: 1.03, scaleY: 0.97, shadow: 1, expression: 'parpadeo' },
};

/** The pose with that id, or null when there is none. */
export function catPose(id: string): CatPose | null {
  return (CAT_POSE_IDS as readonly string[]).includes(id) ? POSES[id as CatPoseId] : null;
}

/** Degrees of the "no" shake of the head. */
export const HEAD_NO_ANGLE = 4;

/** Angles of the head, in order, for the "no": side to side twice and back to rest. `k` scales them (0 = no movement). */
export function headNoSteps(k: number): number[] {
  const a = HEAD_NO_ANGLE * k;
  return [-a, a, -a, a, 0].map((v) => v || 0);
}

/**
 * The chill of "puaj" (F12.R A1): the head moves in x by `px` side to side `cycles` times (`stepMs` per half swing, 180 ms in all)
 * and rests at 0. With reduced motion there are no steps: only the doodle cloud shows.
 */
export function puajShiver(reduced: boolean): { steps: number[]; stepMs: number } {
  const px = 3;
  const cycles = 3;
  const swings = Array.from({ length: cycles * 2 }, (_, i) => (i % 2 === 0 ? px : -px));
  return { steps: reduced ? [] : [...swings, 0], stepMs: 30 };
}
