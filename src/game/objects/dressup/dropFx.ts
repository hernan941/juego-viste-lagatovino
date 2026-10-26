// The burst where a garment lands on the cat (moved out of DressUp in F11.14).
import type Phaser from 'phaser';
import { DROP_BURST } from '../../domain/petHearts';
import type { Point } from '../../domain/types';
import { profileOf } from '../../systems/motion';
import { TextureKeys } from '../../constants';
import { hex } from '../ui';

/** A ring that "pops" at the anchor (scale 0 to 1.4, alpha 1 to 0, 180 ms); reduced motion only fades it. */
function popRing(scene: Phaser.Scene, at: Point, power: number): void {
  const ring = scene.add.graphics().setDepth(3990).setPosition(at.x, at.y);
  ring.lineStyle(7, hex('rosa400'), 1).strokeCircle(0, 0, 46 * (power > 1 ? 1.3 : 1));
  const calm = profileOf(scene).reduced;
  ring.setScale(calm ? 1 : 0);
  scene.tweens.add({ targets: ring, scale: calm ? 1 : 1.4, alpha: 0, duration: 180, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
}

/** Hearts and sparkles where the item lands; combos get a bigger burst. */
export function celebrate(
  scene: Phaser.Scene, hearts: Phaser.GameObjects.Particles.ParticleEmitter, sparkles: Phaser.GameObjects.Particles.ParticleEmitter, at: Point, power: number,
): void {
  const p = profileOf(scene);
  hearts.explode(p.count(DROP_BURST.hearts * power), at.x, at.y);
  sparkles.explode(p.count(DROP_BURST.sparkles * power), at.x, at.y);
  popRing(scene, at, power);
}

/** The two particle emitters of the scene (hearts and sparkles), silent until someone explodes them. */
export function createBursts(scene: Phaser.Scene): { hearts: Phaser.GameObjects.Particles.ParticleEmitter; sparkles: Phaser.GameObjects.Particles.ParticleEmitter } {
  const spin = profileOf(scene).spin;
  const hearts = scene.add
    .particles(0, 0, TextureKeys.Heart, {
      emitting: false, speed: { min: 80, max: 200 }, angle: { min: -120, max: -60 }, gravityY: -40,
      lifespan: { min: 900, max: 1400 }, scale: { start: 1.4, end: 0.3 }, alpha: { start: 1, end: 0 }, rotate: { min: -40 * spin, max: 40 * spin },
    })
    .setDepth(4000);
  const sparkles = scene.add
    .particles(0, 0, TextureKeys.Sparkle, {
      emitting: false, speed: { min: 60, max: 240 }, angle: { min: 0, max: 360 }, gravityY: 80,
      lifespan: { min: 500, max: 900 }, scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 },
    })
    .setDepth(4000);
  return { hearts, sparkles };
}

/** A click on a cell answers with a pulse of the hint text (the text grows, settles and calms down). */
export function pulse(scene: Phaser.Scene, text: Phaser.GameObjects.Text): void {
  scene.tweens.killTweensOf(text);
  text.setScale(1).setAlpha(1);
  scene.tweens.chain({
    targets: text,
    tweens: [
      { scale: 1 + 0.15 * profileOf(scene).squash, duration: 110, ease: 'Sine.easeOut' },
      { scale: 1, duration: 220, ease: profileOf(scene).ease('Back.easeOut') },
      { alpha: 0.7, duration: 500 },
    ],
  });
}
