import Phaser from 'phaser';
import { GAME_WIDTH, SfxKeys, TextureKeys } from '../../constants';
import { stableTilt } from '../../domain/stableTilt';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import { TweenBag } from './TweenBag';

export interface StarStampsOptions {
  /** How many slots (stars out of five): the empty ones stay as faint ghosts until they are stamped. */
  total?: number;
  /** Distance between the centers of two stars. */
  gap?: number;
}

export interface StampOptions {
  /** Duration of the stamp, in ms. */
  ms: number;
  /** Camera shake of 2 px on impact (off with reduced motion). */
  shake: boolean;
  /** The 5th star: `sol` color and a burst of sparkles. */
  golden: boolean;
}

const STAMP_SCALE = 0.5;
const GOLDEN_SCALE = 0.58;
const GHOST_ALPHA = 0.16;
const SHAKE_PX = 2;
const SHAKE_MS = 90;

/**
 * A row of rating stars that are stamped one by one: scale 1.6 to 1 (Back.easeOut), a soft "tump" on impact and a 2 px camera
 * shake. The 5th goes in `sol` with a burst of sparkles. With reduced motion the star only fades in and nothing shakes.
 * Centered on (x, y).
 */
export class StarStamps extends Phaser.GameObjects.Container {
  private readonly bag: TweenBag;
  private readonly total: number;
  private readonly gap: number;
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, { total = 5, gap = 76 }: StarStampsOptions = {}) {
    super(scene, x, y);
    this.bag = new TweenBag(scene);
    this.total = total;
    this.gap = gap;
    for (let i = 0; i < total; i++) {
      this.add(scene.add.image(this.slotX(i), 0, TextureKeys.Stamp).setScale(STAMP_SCALE).setAlpha(GHOST_ALPHA));
    }
    this.setSize(gap * total, 80);
    scene.add.existing(this);
  }

  private slotX(index: number): number {
    return (index - (this.total - 1) / 2) * this.gap;
  }

  stamp(index: number, { ms, shake, golden }: StampOptions): void {
    const scene = this.scene;
    const p = profileOf(scene);
    const holder = scene.add.container(this.slotX(index), 0);
    holder.add(scene.add.image(0, 0, golden ? TextureKeys.StampSol : TextureKeys.Stamp).setScale(golden ? GOLDEN_SCALE : STAMP_SCALE));
    holder.setAngle(stableTilt(`stamp-${index}`) / 2);
    holder.setAlpha(0);
    this.add(holder);
    const config: Phaser.Types.Tweens.TweenBuilderConfig = { targets: holder, alpha: 1, duration: ms, onComplete: () => this.impact(index, holder, shake, golden) };
    if (p.reduced) {
      this.bag.add(config);
      return;
    }
    holder.setScale(1.6);
    this.bag.add({ ...config, scale: 1, ease: 'Back.easeOut' });
  }

  /** The stamp touches the paper: "tump", the camera shakes 2 px and the golden star bursts. */
  private impact(index: number, holder: Phaser.GameObjects.Container, shake: boolean, golden: boolean): void {
    const scene = this.scene;
    const p = profileOf(scene);
    getAudio(scene).play(SfxKeys.Stamp, { rate: 1 + index * 0.05, volume: golden ? 1 : 0.8 });
    if (shake && p.shake > 0) scene.cameras.main.shake(SHAKE_MS, (SHAKE_PX * p.shake) / GAME_WIDTH);
    if (!golden) return;
    const emitter = scene.add
      .particles(0, 0, TextureKeys.InkSparkle, {
        emitting: false, speed: { min: 120, max: 340 }, angle: { min: 0, max: 360 }, lifespan: { min: 500, max: 900 },
        scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { start: 0, end: 180 * p.spin },
      })
      .setDepth(this.depth + 1);
    emitter.explode(p.count(18), this.x + holder.x, this.y);
    this.emitters.push(emitter);
    this.timers.push(scene.time.delayedCall(1000, () => emitter.destroy()));
    // The golden star also takes a second, small bounce: the "ta-da".
    if (p.squash > 0.5) this.bag.add({ targets: holder, scale: 1.18, duration: 120, yoyo: true, ease: 'Sine.easeOut' });
  }

  speedUp(factor: number): void {
    this.bag.speedUp(factor);
  }

  destroy(fromScene?: boolean): void {
    this.bag.clear();
    for (const t of this.timers) t.remove();
    for (const e of this.emitters) e.destroy();
    this.timers.length = 0;
    this.emitters.length = 0;
    super.destroy(fromScene);
  }
}
