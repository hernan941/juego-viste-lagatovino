// The snow of "¡Look Navidad!" (F9): where it falls and how long it lives, apart from Phaser so it can be tested.

/** Half of the inner width of the mirror (the frame is 428 px of glass), minus a margin so no flake lands on the frame. */
const MIRROR_HALF_GLASS = 214;
const MARGIN = 10;

export const SNOW = {
  speedY: { min: 90, max: 140 },
  gravityY: 60,
  /** Ms. About 3 s: the flake falls to the rug and fades out there. */
  lifespan: 3000,
  /** Ms the emitter keeps releasing flakes. */
  runMs: 1500,
  /** Y where the flakes are born, just under the top of the glass. */
  startY: 90,
  /** Extra ms before the emitter is destroyed, after the last flake is gone. */
  slackMs: 100,
};

/** Horizontal range of the flakes for a cat at `catX`: inside the glass of the mirror. */
export function snowSpan(catX: number): { min: number; max: number } {
  return { min: catX - MIRROR_HALF_GLASS + MARGIN, max: catX + MIRROR_HALF_GLASS - MARGIN };
}

/** True when the slowest flake gets from `startY` to `floorY` before it dies (kinematics with the gravity). */
export function snowReachesFloor(floorY: number): boolean {
  const t = SNOW.lifespan / 1000;
  return SNOW.speedY.min * t + 0.5 * SNOW.gravityY * t * t >= floorY - SNOW.startY;
}

/** From the combo until the emitter is destroyed. */
export function snowTotalMs(): number {
  return SNOW.runMs + SNOW.lifespan + SNOW.slackMs;
}
