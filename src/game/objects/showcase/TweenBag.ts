import type Phaser from 'phaser';

/**
 * The tweens of one ceremony object, kept together so a tap can make them all faster (`timeScale`, also for the ones that were
 * already running) and so `destroy()` leaves nothing behind. Tweens created after `speedUp` start fast too.
 */
export class TweenBag {
  private readonly tweens = new Set<Phaser.Tweens.Tween>();
  private factor = 1;

  constructor(private readonly scene: Phaser.Scene) {}

  add(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const tween = this.scene.tweens.add(config);
    tween.timeScale = this.factor;
    this.tweens.add(tween);
    return tween;
  }

  speedUp(factor: number): void {
    this.factor = factor;
    for (const t of this.tweens) t.timeScale = factor;
  }

  clear(): void {
    for (const t of this.tweens) t.remove();
    this.tweens.clear();
  }
}
