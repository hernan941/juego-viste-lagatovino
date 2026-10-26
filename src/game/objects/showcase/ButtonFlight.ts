import type Phaser from 'phaser';
import { SfxKeys, TextureKeys } from '../../constants';
import { arcControl, quadBezier } from '../../domain/curve';
import type { Point } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import { TweenBag } from './TweenBag';

export interface FlightOptions {
  index: number;
  /** Where it leaves (the notebook) and where it lands (the purse). */
  from: Point;
  to: Point;
  /** Duration of the flight, in ms. */
  ms: number;
  /** Buttons this one adds to the counter when it lands. */
  credit: number;
  /** False with reduced motion: it does not travel, it only blinks into the purse. */
  fly: boolean;
}

const BUTTON_SCALE = 0.5;
const CLINK_RATE_STEP = 0.04;
const CLINK_MAX_STEPS = 10;
const DEPTH = 4000;

/**
 * Buttons (the coins of the game) that fly from the judge's notebook to the purse along an arc, spinning, and click against
 * each other when they land. Reusable for the payout of any scene. It owns its sprites and tweens; `destroy()` removes them.
 */
export class ButtonFlight {
  private readonly bag: TweenBag;
  private readonly sprites = new Set<Phaser.GameObjects.Image>();
  private landed = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.bag = new TweenBag(scene);
  }

  /** Throws one button. `onLand(credit)` runs when it arrives, and that is when the counter should go up. */
  fly({ index, from, to, ms, credit, fly }: FlightOptions, onLand: (credit: number) => void): void {
    const scene = this.scene;
    const p = profileOf(scene);
    const sprite = scene.add.image(fly ? from.x : to.x, fly ? from.y : to.y, TextureKeys.Coin).setScale(BUTTON_SCALE).setDepth(DEPTH).setAlpha(0);
    this.sprites.add(sprite);
    const land = () => {
      this.sprites.delete(sprite);
      sprite.destroy();
      getAudio(scene).play(SfxKeys.Clink, { rate: 1 + Math.min(CLINK_MAX_STEPS, this.landed++) * CLINK_RATE_STEP, volume: 0.7 });
      onLand(credit);
    };
    if (!fly) {
      // Reduced motion: the button only shows up in the purse for a moment, it does not travel.
      this.bag.add({ targets: sprite, alpha: 1, duration: ms * 0.4, hold: ms * 0.2, yoyo: true, onComplete: land });
      return;
    }
    const control = arcControl(from, to, index);
    const state = { t: 0 };
    sprite.setAlpha(1);
    this.bag.add({
      targets: state,
      t: 1,
      duration: ms,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const at = quadBezier(from, control, to, state.t);
        sprite.setPosition(at.x, at.y);
        sprite.setAngle(state.t * 540 * p.spin);
        sprite.setScale(BUTTON_SCALE * (1 + Math.sin(state.t * Math.PI) * 0.35));
      },
      onComplete: land,
    });
  }

  speedUp(factor: number): void {
    this.bag.speedUp(factor);
  }

  destroy(): void {
    this.bag.clear();
    for (const s of this.sprites) s.destroy();
    this.sprites.clear();
  }
}
