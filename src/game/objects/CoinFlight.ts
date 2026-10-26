import type Phaser from 'phaser';
import { SfxKeys, TextureKeys } from '../constants';
import type { Point } from '../domain/types';
import { arcControl, bezierPoint, flightPlan, type FlightButton } from '../domain/wallet';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';

const BUTTON_SIZE = 32;
/** Above the dragged garment (5000), so a button never hides behind it. */
const DEFAULT_DEPTH = 5200;
/** How much the curve bows up, in game px. */
const ARC_LIFT = 90;

export interface CoinFlightOptions {
  from: Point;
  to: Point;
  /** Coins the buttons stand for: one button per 5, 12 at most (3 with reduced motion). */
  coins: number;
  depth?: number;
  /** A button took off (after its delay): its share of the coins and its number. For the flights that leave the purse. */
  onLaunch?(credit: number, index: number): void;
  /** A button arrived: its share of the coins and its number (0 first). */
  onLand?(credit: number, index: number): void;
  /** The last button arrived (also right away when there is nothing to fly). */
  onDone?(): void;
}

/**
 * Buttons that fly along a curve from one point to another, staggered (S3). The same object serves both ways: into the
 * purse when the player earns, out of it when the player pays; and the Showcase. It does not touch the number: the caller
 * adds each `credit` to the wallet when its button lands. Reduced motion: 3 buttons that fade in place at the end point.
 */
export class CoinFlight {
  private readonly plan: FlightButton[];
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly flights: Phaser.Tweens.Tween[] = [];
  private pending = new Set<number>();
  private ended = false;

  constructor(private readonly scene: Phaser.Scene, private readonly options: CoinFlightOptions) {
    const profile = profileOf(scene);
    this.plan = flightPlan(options.coins, profile.reduced);
    this.pending = new Set(this.plan.map((_, i) => i));
    if (this.plan.length === 0) {
      this.finish();
      return;
    }
    const { from, to, depth = DEFAULT_DEPTH } = options;
    const control = arcControl(from, to, ARC_LIFT);
    this.plan.forEach((button, i) => {
      const start = button.arc ? from : to;
      const image = scene.add.image(start.x, start.y, TextureKeys.Coin).setDisplaySize(BUTTON_SIZE, BUTTON_SIZE).setDepth(depth).setAlpha(0);
      this.images.push(image);
      this.flights.push(scene.tweens.addCounter({
        from: 0, to: 1, duration: button.ms, delay: button.delay, ease: button.arc ? 'Sine.easeInOut' : 'Sine.easeOut',
        onStart: () => {
          image.setAlpha(button.arc ? 1 : 0.2);
          options.onLaunch?.(button.credit, i);
        },
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const t = tween.getValue() ?? 0;
          if (button.arc) {
            const p = bezierPoint(from, control, to, t);
            image.setPosition(p.x, p.y).setAngle(360 * t * profile.spin);
          } else {
            image.setAlpha(Math.sin(Math.PI * t));
          }
        },
        onComplete: () => this.land(i),
      }));
    });
  }

  /** True until the last button has landed (or the flight was cancelled). */
  get active(): boolean {
    return !this.ended;
  }

  /** Lands every button that is still in the air right now, with its credit (a tap that skips the ceremony). */
  finishNow(): void {
    for (const i of [...this.pending]) this.land(i);
  }

  /** Stops everything; nothing more is credited. */
  cancel(): void {
    this.ended = true;
    this.pending.clear();
    for (const tween of this.flights) tween.remove();
    for (const image of this.images) {
      this.scene.tweens.killTweensOf(image);
      image.destroy();
    }
    this.images.length = 0;
  }

  private land(i: number): void {
    if (!this.pending.delete(i)) return;
    const image = this.images[i];
    this.flights[i]?.remove();
    // A tiny pop and out, so the button lands instead of vanishing.
    if (image) {
      this.scene.tweens.add({
        targets: image, scale: image.scale * 1.5, alpha: 0, duration: 120, ease: 'Sine.easeOut',
        onComplete: () => image.destroy(),
      });
    }
    getAudio(this.scene).play(SfxKeys.Clink, { volume: 0.8 });
    this.options.onLand?.(this.plan[i].credit, i);
    if (this.pending.size === 0) this.finish();
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.options.onDone?.();
  }
}
