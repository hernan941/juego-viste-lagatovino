import Phaser from 'phaser';
import { Fonts, Ink, SfxKeys, colorToNumber } from '../constants';
import type { ChipKind, ChipText } from '../domain/catSheet';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { appear, killTweensDeep } from './kit/appear';

export interface TasteChipOptions {
  /** False: a chip of a taste that is still hidden (a "?" in the color of its kind). Default true. */
  found?: boolean;
  /** Size of the chip in game px. The sheet needs 80 high at least (ADR 0014); the flying one is smaller. */
  width?: number;
  /** The chip grows to fit a long name up to this width, and the name shrinks beyond it (default: `width`, a fixed size). */
  maxWidth?: number;
  height?: number;
  /** Pops in when created (default). */
  animate?: boolean;
}

/** Fill and glyph color of each kind (art-direction v2: brand colors, 3 px ink border). */
const KIND: Record<ChipKind, { fill: string; glyph: string }> = {
  love: { fill: Ink.rosa, glyph: Ink.frambuesa },
  dislike: { fill: Ink.lila, glyph: Ink.lapiz },
  favorite: { fill: Ink.sol, glyph: Ink.tinta },
  color: { fill: Ink.cielo, glyph: Ink.lapiz },
};
const INK = colorToNumber(Ink.tinta);
const HIDDEN_FILL = colorToNumber(Ink.cremaPapel);
const FLY_MS = 560;
const LAND_POP_MS = 130;

/**
 * A taste as a chip (S2): a pill with the glyph of its kind (heart, cross, star, dot) drawn in code and what the cat likes next
 * to it. In the cat sheet there is one per taste (a "?" while it is hidden); when a taste is discovered one flies from the cat to
 * the name sign and pops like a piece of paper. Centered on (x, y).
 */
export class TasteChip extends Phaser.GameObjects.Container {
  readonly kind: ChipKind;
  readonly found: boolean;
  private flight?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, chip: ChipText, { found = true, width: minWidth = 190, maxWidth = minWidth, height = 80, animate = true }: TasteChipOptions = {}) {
    super(scene, x, y);
    this.kind = chip.kind;
    this.found = found;
    const colors = KIND[chip.kind];
    const fill = found ? colorToNumber(colors.fill) : HIDDEN_FILL;
    // The name first, so the pill can be as wide as it needs.
    const label = scene.add.text(0, 1, found ? chip.label : '???', {
      fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '30px', color: found ? Ink.tinta : Ink.mutedTexto, padding: { x: 2, y: 6 },
    }).setOrigin(0.5);
    const glyphR = height * 0.34;
    const chrome = height / 2 + glyphR + 10 + 18;
    const width = Math.min(maxWidth, Math.max(minWidth, label.width + chrome));
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-width / 2 + 3, -height / 2 + 4, width, height, height / 2);
    g.fillStyle(fill, 1).fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    g.lineStyle(3, found ? INK : colorToNumber(Ink.lineaLapiz), 1).strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    this.add(g);
    const icon = scene.add.graphics();
    const cx = -width / 2 + height / 2;
    // A hidden taste has the same glyph, washed out (a flat lighter color: a see-through one would show the overlaps).
    drawGlyph(icon, chip.kind, cx, 0, glyphR, glyphColorFor(chip, found), 1);
    this.add(icon);
    const textX = cx + glyphR + 10;
    const room = width / 2 - 18 - textX;
    label.setX(textX + room / 2);
    if (label.width > room) label.setScale(room / label.width);
    this.add(label);
    this.setSize(width, height);
    scene.add.existing(this);
    if (animate) appear(scene, this, { pop: true });
  }

  /**
   * The discovery: it waits a beat over the cat so it is seen, then travels along an arc to `target` shrinking, and lands with a
   * pop of paper (a quick grow and out). `onLand` runs at the pop; the chip destroys itself right after.
   * Reduced motion: it fades in place and the same pop becomes a fade, with no travel.
   */
  flyTo(target: Point, onLand: () => void): void {
    const { scene } = this;
    const p = profileOf(scene);
    const land = () => {
      getAudio(scene).play(SfxKeys.Paper, { volume: 0.8, rate: 1.3 });
      onLand();
      scene.tweens.add({
        targets: this, scale: p.reduced ? 1 : this.scale * 1.35, alpha: 0, duration: p.reduced ? 200 : LAND_POP_MS, ease: 'Sine.easeOut',
        onComplete: () => this.destroy(),
      });
    };
    if (p.reduced) {
      this.flight = scene.tweens.add({ targets: this, alpha: 1, duration: 500, onComplete: land });
      return;
    }
    const from = { x: this.x, y: this.y };
    // The arc bows up, like the buttons do.
    const lift = 70;
    this.flight = scene.tweens.addCounter({
      from: 0, to: 1, duration: FLY_MS, delay: 380, ease: 'Sine.easeInOut',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const t = tween.getValue() ?? 0;
        this.setPosition(from.x + (target.x - from.x) * t, from.y + (target.y - from.y) * t - Math.sin(Math.PI * t) * lift);
        this.setScale(1 - 0.4 * t);
        this.setAngle(-8 * Math.sin(Math.PI * t) * p.shake);
      },
      onComplete: land,
    });
  }

  destroy(fromScene?: boolean): void {
    this.flight?.remove();
    killTweensDeep(this.scene, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}

/**
 * The color of the glyph: the one of its kind, except the dot of the favorite color, which wears the dye itself (an orange cat
 * with a blue dot would teach something false). A hidden taste has the same color, washed out.
 */
export function glyphColorFor(chip: ChipText, found: boolean): number {
  const own = chip.kind === 'color' && chip.swatch ? colorToNumber(chip.swatch) : colorToNumber(KIND[chip.kind].glyph);
  return found ? own : lighten(own, 0.6);
}

/** `color` moved `amount` (0..1) toward white. */
function lighten(color: number, amount: number): number {
  const channel = (shift: number) => Math.round(((color >> shift) & 0xff) * (1 - amount) + 255 * amount);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** The glyph of a kind, drawn with shapes (no font needed): heart, cross, five-point star and dot. */
function drawGlyph(g: Phaser.GameObjects.Graphics, kind: ChipKind, cx: number, cy: number, r: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha).lineStyle(Math.max(4, r * 0.4), color, alpha);
  switch (kind) {
    case 'love':
      g.fillCircle(cx - r * 0.5, cy - r * 0.3, r * 0.58).fillCircle(cx + r * 0.5, cy - r * 0.3, r * 0.58);
      g.fillTriangle(cx - r * 1.04, cy - r * 0.05, cx + r * 1.04, cy - r * 0.05, cx, cy + r * 1.05);
      break;
    case 'dislike':
      g.lineBetween(cx - r * 0.75, cy - r * 0.75, cx + r * 0.75, cy + r * 0.75).lineBetween(cx + r * 0.75, cy - r * 0.75, cx - r * 0.75, cy + r * 0.75);
      break;
    case 'favorite': {
      const points: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r * 1.1 : r * 0.48;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
      }
      g.fillPoints(points, true);
      break;
    }
    case 'color':
      // A pale dye on the pale pill needs an outline to be seen.
      g.fillCircle(cx, cy, r * 0.85).lineStyle(3, colorToNumber(Ink.tinta), alpha).strokeCircle(cx, cy, r * 0.85);
      break;
  }
}
