import Phaser from 'phaser';
import { ObjectEvents } from '../constants';
import type { ClothingDef } from '../domain/types';
import { addHover, hex } from './ui';

export const CELL_SIZE = 104;

/** A wardrobe cell: the item icon, draggable. Emits ItemDragStart / ItemDrag / ItemDragEnd. */
export class ClothingItem extends Phaser.GameObjects.Container {
  readonly item: ClothingDef;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly wornRing: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, item: ClothingDef) {
    super(scene, x, y);
    this.item = item;
    this.icon = scene.add.image(0, 0, item.icon).setDisplaySize(CELL_SIZE, CELL_SIZE);
    this.wornRing = scene.add.graphics().setAlpha(0);
    this.wornRing.lineStyle(5, hex('menta'), 1).strokeRoundedRect(-CELL_SIZE / 2 - 2, -CELL_SIZE / 2 - 2, CELL_SIZE + 4, CELL_SIZE + 4, 16);
    this.add([this.icon, this.wornRing]);

    this.setSize(CELL_SIZE, CELL_SIZE);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, CELL_SIZE, CELL_SIZE),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      draggable: true,
      useHandCursor: true,
    });
    addHover(this);
    this.on('dragstart', (p: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDragStart, this, p));
    this.on('drag', (p: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDrag, this, p));
    this.on('dragend', (p: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDragEnd, this, p));
  }

  /** The cell looks empty while its item is in the player's hand. */
  setLifted(lifted: boolean): void {
    this.scene.tweens.add({ targets: this.icon, alpha: lifted ? 0.3 : 1, duration: 120 });
  }

  /** A mint ring marks the items that are being worn. */
  setWorn(worn: boolean): void {
    this.scene.tweens.add({ targets: this.wornRing, alpha: worn ? 1 : 0, duration: 150 });
  }

  /** Pop-in used when the grid fills (0.8 to 1.05 to 1, 250 ms). */
  popIn(delay: number): void {
    this.setScale(0.8).setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 120, delay });
    this.scene.tweens.chain({
      targets: this,
      delay,
      tweens: [{ scale: 1.05, duration: 150, ease: 'Sine.easeOut' }, { scale: 1, duration: 100, ease: 'Back.easeOut' }],
    });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf([this, this.icon, this.wornRing]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
