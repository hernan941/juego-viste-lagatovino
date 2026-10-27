// The sweep of a new color over a worn item (F16.4, S4). A copy of the item with the new texture is laid right over the
// layer (same container, same place) and shown from the bottom edge upward with a crop, so the color "climbs" the sweater.
// With reduced motion there is no mask: the copy fades in (ADR 0013). When it ends, `done` swaps the real texture (it looks
// the same) and the copy goes away.
import type Phaser from 'phaser';
import { sweepCrop, sweepPlan } from '../domain/dyeSweep';
import { profileOf } from '../systems/motion';

export interface SweepHandle {
  /** Ends it now (a new dye came, or the controller is leaving): calls `done` once and removes the copy. */
  finish(): void;
}

export function startSweep(scene: Phaser.Scene, layer: Phaser.GameObjects.Image, textureKey: string, done: () => void): SweepHandle {
  const plan = sweepPlan(profileOf(scene).reduced);
  const overlay = scene.add.image(layer.x, layer.y, textureKey)
    .setOrigin(layer.originX, layer.originY).setScale(layer.scaleX, layer.scaleY).setAngle(layer.angle).setDepth(layer.depth);
  const parent = layer.parentContainer;
  if (parent) parent.addAt(overlay, parent.getIndex(layer) + 1);
  const { width, height } = overlay.frame;
  let tween: Phaser.Tweens.Tween | null = null;
  let ended = false;

  const finish = () => {
    if (ended) return;
    ended = true;
    tween?.remove();
    overlay.destroy();
    done();
  };

  if (plan.mode === 'sweep') {
    const first = sweepCrop(0.02, height, width);
    overlay.setCrop(first.x, first.y, first.width, first.height);
    tween = scene.tweens.addCounter({
      from: 0, to: 1, duration: plan.ms, ease: 'Sine.easeInOut',
      onUpdate: (t: Phaser.Tweens.Tween) => {
        // The garment can be taken off while the color climbs: nothing to paint any more.
        if (layer.active === false) return finish();
        const r = sweepCrop(t.getValue() ?? 0, height, width);
        overlay.setCrop(r.x, r.y, r.width, r.height);
      },
      onComplete: finish,
    });
  } else {
    overlay.setAlpha(0);
    tween = scene.tweens.add({ targets: overlay, alpha: 1, duration: plan.ms, ease: 'Sine.easeOut', onComplete: finish });
  }
  return { finish };
}
