// Pure TS, no Phaser (ADR 0010). How the cat poses in the Showcase without tiring the player.
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
