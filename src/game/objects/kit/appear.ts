import type Phaser from 'phaser';
import { profileOf } from '../../systems/motion';

/** Extra degrees a polaroid or card falls with before it settles (art-direction section 8). */
const FALL_DEGREES = 6;
const FALL_DISTANCE = 30;

export interface AppearOptions {
  /** Grows from 0.8 to 1.05 to 1 (250 ms, Back.easeOut). Cards and bubbles do; the paper only fades. */
  pop?: boolean;
  /** Falls in with `FALL_DEGREES` extra and settles at this angle (280 ms, Back.easeOut). */
  fallTo?: number;
}

/**
 * Nothing in the kit appears all at once. Normal: pop or fall in with Back.easeOut. Reduced motion: only a fade, with no scale,
 * angle or movement (ADR 0013). Returns the tween so a caller can chain a decoration (the washi sticking down).
 */
export function appear(scene: Phaser.Scene, target: Phaser.GameObjects.Container, { pop = false, fallTo }: AppearOptions = {}): Phaser.Tweens.Tween {
  const profile = profileOf(scene);
  const restY = target.y;
  target.setAlpha(0);
  if (profile.reduced) {
    if (fallTo !== undefined) target.setAngle(fallTo);
    return scene.tweens.add({ targets: target, alpha: 1, duration: 200 });
  }
  const config: Phaser.Types.Tweens.TweenBuilderConfig = { targets: target, alpha: 1, duration: 250, ease: profile.ease('Back.easeOut') };
  if (pop) {
    target.setScale(0.8);
    config.scale = 1;
  }
  if (fallTo !== undefined) {
    target.setAngle(fallTo + FALL_DEGREES * (fallTo < 0 ? -1 : 1));
    target.y = restY - FALL_DISTANCE;
    config.angle = fallTo;
    config.y = restY;
    config.duration = 280;
  }
  return scene.tweens.add(config);
}

/** Stops every tween of an object and of its children (call it from `destroy`). */
export function killTweensDeep(scene: Phaser.Scene | undefined, target: Phaser.GameObjects.Container): void {
  if (!scene?.tweens) return;
  scene.tweens.killTweensOf(target);
  for (const child of target.list) scene.tweens.killTweensOf(child);
}
