// The visual feedback of a drag in DressUp (moved out of the scene in F11.14): the half transparent preview on the cat while
// the magnet holds the item, the little ring on the anchor and the glow of the drop zone. No game rules here.
import Phaser from 'phaser';
import type { AnchorsDef, ClothingDef, Point, Rect } from '../../domain/types';
import { anchorForSlot } from '../../domain/slots';
import { profileOf } from '../../systems/motion';
import type { Cat } from '../Cat';
import { getAudio } from '../../plugins/AudioPlugin';
import { Ink, SfxKeys, colorToNumber } from '../../constants';
import type { ClothingItem } from '../ClothingItem';
import type { ItemGrid } from '../ItemGrid';

/** The item in the player's hand. */
export interface DragLike {
  item: ClothingDef;
  fromEquipped: boolean;
  ghost: Phaser.GameObjects.Image;
  /** Scale of the ghost in the hand. */
  ghostScale: number;
  /** The cell it came from, if it came from the grid. */
  cell?: ClothingItem;
  /** Scale it has when it flies back home. */
  homeScale: number;
  /** Half transparent preview of the item worn by the cat while the magnet holds it. */
  preview?: Phaser.GameObjects.Image;
}

export interface DragFxDeps {
  scene: Phaser.Scene;
  /** The cat does not exist yet when the glow is created (the glow must be drawn behind it), so it is asked for when needed. */
  cat(): Cat;
  anchors: AnchorsDef;
  /** Scale of the cat at rest. */
  baseCatScale(): number;
  dropZone(): Rect;
  /** True while the dragged item is over the drop zone. */
  isOverZone(): boolean;
}

export class DragFx {
  private anchorDot: Phaser.GameObjects.Graphics | null = null;
  private readonly zoneGlow: Phaser.GameObjects.Graphics;

  constructor(private readonly deps: DragFxDeps) {
    // Created before the cat, so it is drawn behind it (the display order of the scene).
    this.zoneGlow = deps.scene.add.graphics().setAlpha(0);
  }

  /**
   * While the magnet holds the item: only the half transparent preview on the cat is seen (the ghost steps aside, so there is
   * no double image) and it breathes; a small ring marks the anchor. Letting go of the magnet brings the ghost back.
   */
  setPreview(d: DragLike, on: boolean): void {
    if (on === (d.preview !== undefined)) return;
    const { scene, anchors } = this.deps;
    const cat = this.deps.cat();
    const baseCatScale = this.deps.baseCatScale();
    const p = profileOf(scene);
    scene.tweens.killTweensOf(d.ghost);
    if (on) {
      scene.tweens.add({ targets: d.ghost, alpha: 0, scale: d.ghostScale * 0.8, duration: 100 });
      const c = cat.canvasToWorld({ x: anchors.canvas.width / 2, y: anchors.canvas.height / 2 });
      const size = anchors.canvas.width * baseCatScale;
      const preview = scene.add.image(c.x, c.y, d.item.texture).setDisplaySize(size, size).setDepth(4500).setAlpha(0);
      d.preview = preview;
      scene.tweens.add({
        targets: preview, alpha: 0.5, duration: 100,
        onComplete: () => {
          // The preview breathes (0.45 to 0.6); reduced motion keeps it still.
          if (p.loops && d.preview === preview) scene.tweens.add({ targets: preview, alpha: { from: 0.45, to: 0.6 }, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
      this.showAnchorDot(cat.getAnchorWorld(anchorForSlot(d.item.slot)));
    } else {
      scene.tweens.add({ targets: d.ghost, alpha: 1, scale: d.ghostScale, duration: 200, ease: p.ease('Back.easeOut') });
      this.fadePreview(d);
      this.hideAnchorDot();
    }
  }

  /** A small ring where the magnet holds the item (the slot anchor). */
  private showAnchorDot(at: Point): void {
    const { scene } = this.deps;
    this.hideAnchorDot();
    const dot = scene.add.graphics().setDepth(4600).setPosition(at.x, at.y);
    dot.lineStyle(4, colorToNumber(Ink.lapiz), 1).strokeCircle(0, 0, 16);
    dot.fillStyle(colorToNumber(Ink.sol), 0.55).fillCircle(0, 0, 16);
    dot.setScale(profileOf(scene).reduced ? 1 : 0.2).setAlpha(0);
    this.anchorDot = dot;
    scene.tweens.add({ targets: dot, scale: 1, alpha: 1, duration: 140, ease: profileOf(scene).ease('Back.easeOut') });
  }

  hideAnchorDot(): void {
    const { scene } = this.deps;
    const dot = this.anchorDot;
    this.anchorDot = null;
    if (!dot) return;
    scene.tweens.killTweensOf(dot);
    scene.tweens.add({ targets: dot, alpha: 0, duration: 100, onComplete: () => dot.destroy() });
  }

  fadePreview(d: DragLike): void {
    const { scene } = this.deps;
    const preview = d.preview;
    d.preview = undefined;
    if (!preview) return;
    scene.tweens.killTweensOf(preview);
    scene.tweens.add({ targets: preview, alpha: 0, duration: 100, onComplete: () => preview.destroy() });
  }

  /** On drop the preview becomes solid with a little pop, and leaves once the real layer has popped in. */
  settlePreview(d: DragLike): void {
    const { scene } = this.deps;
    const preview = d.preview;
    d.preview = undefined;
    if (!preview) return;
    scene.tweens.killTweensOf(preview);
    const s = preview.scaleX;
    scene.tweens.chain({
      targets: preview,
      tweens: [
        { alpha: 1, scaleX: s * 1.04, scaleY: s * 1.04, duration: 100, ease: 'Sine.easeOut' },
        { scaleX: s, scaleY: s, duration: 160, ease: profileOf(scene).ease('Back.easeOut') },
      ],
      onComplete: () => preview.destroy(),
    });
  }

  /** Item that was let go outside the cat: back to its cell with a bounce (250 ms, Back.easeOut). */
  returnGhost({ ghost, item, cell, homeScale }: DragLike, grid: ItemGrid): void {
    const { scene } = this.deps;
    const cat = this.deps.cat();
    const home = grid.getCellPositions()[item.id];
    getAudio(scene).play(SfxKeys.Return);
    scene.tweens.killTweensOf(ghost);
    ghost.setAlpha(1);
    const done = () => {
      ghost.destroy();
      const target = cell ?? grid.getCell(item.id);
      target?.setLifted(false);
      // The cell pops as it gets the garment back, and the cat watched it go ("no?").
      target?.receivePop();
      cat.lookAt(null);
    };
    if (home) cat.lookAt(home);
    if (home) {
      scene.tweens.add({ targets: ghost, x: home.x, y: home.y, scale: homeScale, angle: 0, duration: 250, ease: profileOf(scene).ease('Back.easeOut'), onComplete: done });
    } else {
      scene.tweens.add({ targets: ghost, alpha: 0, scale: ghost.scale * 0.6, duration: 200, onComplete: done });
    }
  }

  setZoneHighlight(on: boolean): void {
    const { scene } = this.deps;
    const z = this.deps.dropZone();
    this.zoneGlow.clear();
    this.zoneGlow.fillStyle(colorToNumber(Ink.sol), 0.14).fillRoundedRect(z.x - 8, z.y - 8, z.width + 16, z.height + 16, 48);
    this.zoneGlow.lineStyle(5, colorToNumber(Ink.lapiz), 0.9).strokeRoundedRect(z.x - 8, z.y - 8, z.width + 16, z.height + 16, 48);
    scene.tweens.killTweensOf(this.zoneGlow);
    scene.tweens.add({
      targets: this.zoneGlow, alpha: on ? 1 : 0, duration: 140,
      // The zone that waits for the item beats softly (0.7 to 1, 600 ms); reduced motion keeps it still.
      onComplete: () => {
        if (on && profileOf(scene).loops && this.deps.isOverZone()) scene.tweens.add({ targets: this.zoneGlow, alpha: { from: 1, to: 0.7 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
  }

  destroy(): void {
    this.anchorDot?.destroy();
    this.anchorDot = null;
  }
}

/** Everything about the item in the player's hand (the scene keeps one of these while a drag lasts). */
export interface DragState extends DragLike {
  target: Point;
  /** The pointer that grabbed the item (a second finger is ignored) and how far above it the item is held (touch only). */
  pointerId: number;
  lift: Point;
  /** Where the item is held now (the pointer plus the lift): what the drop zone and the magnet look at. */
  held: Point;
  overZone: boolean;
  lastLook: number;
  /** True during the first 150 ms (the grab tween owns the angle); afterwards the tilt follows the speed. */
  grabbing: boolean;
}
