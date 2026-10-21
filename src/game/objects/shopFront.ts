// The boutique facade (art-direction section 7): striped awning, window with a sweater, door with a bell and the sign.
// The still parts are drawn once into a texture; the door, the bell and the sweater are separate so they can move.
import Phaser from 'phaser';
import { FONT_FAMILY, Palette } from '../constants';
import type { Point } from '../domain/types';
import { opaqueBounds } from './alphaMap';
import { hex } from './ui';

const W = 520;
const H = 520;
const INK = hex('contorno');
const STRIPES = 8;
const DOOR = { x: 312, y: 247, width: 126, height: 223 };

export interface ShopFront {
  container: Phaser.GameObjects.Container;
  /** Center of the doorway in world coordinates (where the camera zooms in). */
  doorCenter: Point;
  /** Where the cat stops, on the sidewalk in front of the door. */
  doorStep: Point;
  /** The door leaf: scaleX goes from 1 (closed) to 0.12 (open), hinged on the left. */
  door: Phaser.GameObjects.Container;
  bell: Phaser.GameObjects.Container;
}

function paintFront(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  const outline = (w = 5) => g.lineStyle(w, INK, 1);
  // Wall with a lavender plinth.
  g.fillStyle(hex('rosa200'), 1).fillRoundedRect(20, 70, 480, 440, 22);
  g.fillStyle(0xffffff, 0.35);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) g.fillRoundedRect(36 + c * 58 + (r % 2) * 29, 150 + r * 46, 46, 8, 4);
  outline().strokeRoundedRect(20, 70, 480, 440, 22);
  g.fillStyle(hex('lavanda'), 1).fillRoundedRect(20, 472, 480, 38, { tl: 0, tr: 0, bl: 22, br: 22 });
  outline().strokeRoundedRect(20, 472, 480, 38, { tl: 0, tr: 0, bl: 22, br: 22 });
  // Cornice and the sign plaque on it.
  g.fillStyle(hex('lavanda'), 1).fillRoundedRect(0, 44, W, 52, 20);
  outline().strokeRoundedRect(0, 44, W, 52, 20);
  g.fillStyle(hex('mantequilla'), 1).fillRoundedRect(86, 6, 348, 78, 30);
  outline(6).strokeRoundedRect(86, 6, 348, 78, 30);
  g.fillStyle(0xffffff, 0.6).fillRoundedRect(112, 14, 120, 8, 4);
  // Awning: stripes of rosa and crema that flare outward, with scalloped edges.
  const sw = 460 / STRIPES;
  for (let i = 0; i < STRIPES; i++) {
    const x0 = 30 + i * sw;
    g.fillStyle(i % 2 === 0 ? hex('rosa400') : hex('crema'), 1);
    g.fillPoints([new Phaser.Math.Vector2(x0 + 6, 138), new Phaser.Math.Vector2(x0 + sw - 6, 138), new Phaser.Math.Vector2(x0 + sw + 3, 206), new Phaser.Math.Vector2(x0 - 3, 206)], true);
    g.fillCircle(x0 + sw / 2, 206, sw / 2 - 1);
  }
  g.fillStyle(0x000000, 0.06).fillRect(30, 138, 460, 10);
  outline(4);
  for (let i = 0; i < STRIPES; i++) {
    const x0 = 30 + i * sw;
    g.beginPath().arc(x0 + sw / 2, 206, sw / 2 - 1, 0, Math.PI).strokePath();
    g.beginPath().moveTo(x0 + 6, 138).lineTo(x0 - 3, 206).strokePath();
  }
  g.beginPath().moveTo(30 + 460 - 6 + 6, 138).lineTo(30 + 460 + 3, 206).strokePath();
  g.beginPath().moveTo(36, 138).lineTo(484, 138).strokePath();
  // Window (vitrina).
  g.fillStyle(hex('mantequilla'), 1).fillRoundedRect(44, 238, 216, 206, 26);
  outline().strokeRoundedRect(44, 238, 216, 206, 26);
  g.fillStyle(hex('cielo'), 0.75).fillRoundedRect(58, 252, 188, 178, 18);
  g.fillStyle(0xffffff, 0.5).fillRoundedRect(72, 262, 22, 90, 11).fillRoundedRect(102, 262, 10, 44, 5);
  outline(4).strokeRoundedRect(58, 252, 188, 178, 18);
  g.fillStyle(hex('menta'), 1).fillRoundedRect(40, 444, 224, 26, 12);
  outline(4).strokeRoundedRect(40, 444, 224, 26, 12);
  g.fillStyle(0x6cc9a0, 1).fillCircle(70, 440, 11).fillCircle(96, 436, 9).fillCircle(228, 438, 11).fillCircle(200, 436, 8);
  // Doorway with its frame and a warm, lit inside.
  g.fillStyle(hex('lavanda'), 1).fillRoundedRect(DOOR.x - 14, DOOR.y - 14, DOOR.width + 28, DOOR.height + 28, 22);
  outline().strokeRoundedRect(DOOR.x - 14, DOOR.y - 14, DOOR.width + 28, DOOR.height + 28, 22);
  g.fillStyle(hex('crema'), 1).fillRect(DOOR.x, DOOR.y, DOOR.width, DOOR.height);
  g.fillStyle(hex('rosa200'), 0.8).fillRect(DOOR.x, DOOR.y + 120, DOOR.width, DOOR.height - 120);
  g.fillStyle(hex('mantequilla'), 1).fillCircle(DOOR.x + DOOR.width / 2, DOOR.y + 36, 22);
  g.fillStyle(0xffffff, 0.8).fillCircle(DOOR.x + DOOR.width / 2 - 6, DOOR.y + 30, 8);
  g.fillStyle(hex('rosa400'), 1).fillRoundedRect(DOOR.x + 18, DOOR.y + 108, 90, 14, 7);
  g.fillStyle(hex('lavanda'), 1).fillRoundedRect(DOOR.x + 28, DOOR.y + 70, 24, 38, 8).fillRoundedRect(DOOR.x + 72, DOOR.y + 70, 24, 38, 8);
  g.fillStyle(0x000000, 0.1).fillRect(DOOR.x, DOOR.y, DOOR.width, 10);
  // Doorstep.
  g.fillStyle(hex('rosa50'), 1).fillRoundedRect(DOOR.x - 26, DOOR.y + DOOR.height - 2, DOOR.width + 52, 26, 10);
  outline(4).strokeRoundedRect(DOOR.x - 26, DOOR.y + DOOR.height - 2, DOOR.width + 52, 26, 10);
  g.generateTexture(key, W, H);
  g.destroy();
}

/** The door leaf: hinge on the left edge of its container, so scaleX swings it open. */
function createDoorLeaf(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(hex('rosa400'), 1).fillRect(0, 0, DOOR.width, DOOR.height);
  g.fillStyle(hex('rosa600'), 0.35).fillRoundedRect(14, 112, DOOR.width - 28, DOOR.height - 130, 14);
  g.fillStyle(hex('cielo'), 0.9).fillRoundedRect(14, 16, DOOR.width - 28, 84, 26);
  g.fillStyle(0xffffff, 0.6).fillRoundedRect(24, 24, 14, 50, 7);
  g.lineStyle(4, INK, 1).strokeRoundedRect(14, 16, DOOR.width - 28, 84, 26);
  g.fillStyle(hex('mantequilla'), 1).fillCircle(DOOR.width - 18, DOOR.height * 0.55, 8);
  g.lineStyle(3, INK, 1).strokeCircle(DOOR.width - 18, DOOR.height * 0.55, 8);
  g.lineStyle(5, INK, 1).strokeRect(0, 0, DOOR.width, DOOR.height);
  return scene.add.container(0, 0, [g]);
}

/** Golden bell on a bracket above the door; its container pivots at the bracket. */
function createBell(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0xf5c542, 1).fillPoints([new Phaser.Math.Vector2(-5, 0), new Phaser.Math.Vector2(5, 0), new Phaser.Math.Vector2(16, 24), new Phaser.Math.Vector2(-16, 24)], true);
  g.fillRoundedRect(-18, 20, 36, 9, 4).fillCircle(0, 33, 5);
  g.fillStyle(0xffffff, 0.5).fillRoundedRect(-8, 4, 4, 14, 2);
  g.lineStyle(3.5, INK, 1).strokeRoundedRect(-18, 20, 36, 9, 4).strokeCircle(0, 33, 5);
  g.beginPath().moveTo(-5, 0).lineTo(-16, 24).moveTo(5, 0).lineTo(16, 24).strokePath();
  return scene.add.container(0, 0, [g]);
}

/** Builds the facade, scaled by `scale`, with its top left at (x, y). `sweaterTexture` is shown on a hanger in the window. */
export function createShopFront(scene: Phaser.Scene, x: number, y: number, sweaterTexture: string, scale = 1): ShopFront {
  const key = 'shop-front';
  paintFront(scene, key);
  const front = scene.add.image(0, 0, key).setOrigin(0);
  const sign = scene.add
    .text(W / 2, 45, 'Viste Lagato', { fontFamily: FONT_FAMILY, fontSize: '46px', color: Palette.rosa600, fontStyle: '700', stroke: '#FFFFFF', strokeThickness: 6, padding: { x: 4, y: 8 } })
    .setOrigin(0.5);

  // Sweater on a hanger, centered on its own visible pixels.
  const b = opaqueBounds(scene, sweaterTexture);
  const hanger = scene.add.graphics();
  hanger.lineStyle(4, INK, 1).beginPath().moveTo(152, 262).lineTo(152, 282).strokePath();
  hanger.fillStyle(0xf5c542, 1).fillCircle(152, 262, 6);
  const sweater = scene.add.image(152, 352, sweaterTexture);
  if (b) sweater.setOrigin(b.x + b.width / 2, b.y + b.height / 2).setScale(150 / (Math.max(b.width, b.height) * sweater.width));
  scene.tweens.add({ targets: sweater, angle: { from: -2.5, to: 2.5 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const door = createDoorLeaf(scene);
  door.setPosition(DOOR.x, DOOR.y);
  const bell = createBell(scene);
  bell.setPosition(DOOR.x + DOOR.width / 2, DOOR.y - 38);

  const container = scene.add.container(x, y, [front, sign, hanger, sweater, door, bell]).setScale(scale);
  return {
    container,
    doorCenter: { x: x + (DOOR.x + DOOR.width / 2) * scale, y: y + (DOOR.y + DOOR.height * 0.55) * scale },
    doorStep: { x: x + (DOOR.x + DOOR.width / 2) * scale, y: y + (DOOR.y + DOOR.height + 14) * scale },
    door,
    bell,
  };
}
