// Pure TS, no Phaser (ADR 0010). A reaction that must not repeat too fast (petting the cat, a meow).
export class Cooldown {
  private last = -Infinity;

  constructor(private readonly ms: number) {}

  /** True when the wait is over (it does not use it up). */
  ready(now: number): boolean {
    return now - this.last >= this.ms;
  }

  /** Lets the call through (true) and starts the wait, or blocks it (false) without extending the wait. */
  try(now: number): boolean {
    if (!this.ready(now)) return false;
    this.last = now;
    return true;
  }

  reset(): void {
    this.last = -Infinity;
  }
}
