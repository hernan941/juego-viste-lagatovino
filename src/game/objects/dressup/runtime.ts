// The part of the controller contract that has no Phaser in it (ADR 0019): creation, attach, destroy, beforeLeave and the
// e2e state. DressUp.ts only wires it to the scene.
import type { DressUpContext, DressUpController, DressUpControllerFactory, LeaveAction } from './DressUpController';

/** Adds the state of the controllers to the scene state. What the scene already reports always wins. */
export function mergeControllerState<T extends object>(base: T, extra: Record<string, unknown>): T & Record<string, unknown> {
  return { ...extra, ...base };
}

export class ControllerHost {
  private controllers: DressUpController[] = [];

  constructor(private readonly factories: readonly DressUpControllerFactory[]) {}

  attach(ctx: DressUpContext): void {
    this.controllers = this.factories.map((make) => make());
    for (const c of this.controllers) c.attach(ctx);
  }

  /** Last attached first. Safe to call twice. */
  destroy(): void {
    const list = this.controllers;
    this.controllers = [];
    for (const c of [...list].reverse()) c.destroy();
  }

  /** True when the player may leave; a promise when a controller needs time; false when one says no. */
  beforeLeave(action: LeaveAction): boolean | Promise<boolean> {
    const from = (start: number): boolean | Promise<boolean> => {
      for (let i = start; i < this.controllers.length; i++) {
        const verdict = this.controllers[i].beforeLeave?.(action);
        if (verdict === false) return false;
        if (verdict instanceof Promise) return verdict.then((ok) => (ok ? from(i + 1) : false));
      }
      return true;
    };
    return from(0);
  }

  e2eState(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const c of this.controllers) if (c.e2eState) out[c.key] = c.e2eState();
    return out;
  }
}
