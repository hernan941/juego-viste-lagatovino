// Pure TS, no Phaser (ADR 0010). The first-use hint: no tutorial, a ghost garment travels from the grid to the cat.
// It shows after 4 s without a drop, repeats every 5 s and is turned off for good by the first drop.
export const FIRST_HINT_MS = 4000;
export const REPEAT_HINT_MS = 5000;

export class HintPlanner {
  private elapsed = 0;
  private nextAt = FIRST_HINT_MS;
  private off = false;

  /** True once the first drop has happened: the hint never shows again. */
  get done(): boolean {
    return this.off;
  }

  /** The first drop: the player already knows what to do. */
  dropped(): void {
    this.off = true;
  }

  /** Advances the clock; true when the hint should play now. `paused` (a drag, a gift) does not count the time. */
  update(deltaMs: number, paused = false): boolean {
    if (this.off || paused) return false;
    this.elapsed += deltaMs;
    if (this.elapsed < this.nextAt) return false;
    this.nextAt = this.elapsed + REPEAT_HINT_MS;
    return true;
  }
}
