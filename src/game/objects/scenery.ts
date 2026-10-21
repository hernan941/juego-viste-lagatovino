// Backdrops shared by the outdoor scenes (art-direction section 7): soft sky, drifting clouds and hills.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { hex } from './ui';

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
function mix(from: number, to: number, t: number): number {
  const c = (shift: number) => lerp((from >> shift) & 255, (to >> shift) & 255, t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
}

/** Sky from `cielo` at the top to a warm cream at the horizon, drawn once into a texture. */
export function addSky(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const key = 'sky-bg';
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const strip = 8;
    for (let y = 0; y < GAME_HEIGHT; y += strip) {
      g.fillStyle(mix(0x9fd6ff, hex('crema'), Math.pow(y / GAME_HEIGHT, 1.3)), 1).fillRect(0, y, GAME_WIDTH, strip);
    }
    g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(0).setDepth(-100);
}

/** Soft sun with short rays in the corner. */
export function addSun(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(hex('mantequilla'), 0.45).fillCircle(0, 0, 92);
  g.fillStyle(hex('mantequilla'), 1).fillCircle(0, 0, 62);
  g.lineStyle(5, 0xf5d86a, 1).strokeCircle(0, 0, 62);
  g.lineStyle(8, hex('mantequilla'), 1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.beginPath().moveTo(Math.cos(a) * 100, Math.sin(a) * 100).lineTo(Math.cos(a) * 116, Math.sin(a) * 116).strokePath();
  }
  const sun = scene.add.container(x, y, [g]).setDepth(-90);
  scene.tweens.add({ targets: sun, angle: 360, duration: 60000, repeat: -1 });
  return sun;
}

function cloudTexture(scene: Phaser.Scene): string {
  const key = 'cloud';
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(70, 80, 44).fillCircle(130, 60, 56).fillCircle(190, 80, 44).fillRoundedRect(40, 76, 190, 48, 24);
  g.fillStyle(hex('cielo'), 0.5).fillRoundedRect(50, 112, 170, 12, 6);
  g.generateTexture(key, 270, 140);
  g.destroy();
  return key;
}

/** Clouds that drift to the right at different speeds and come back from the left. */
export function addClouds(scene: Phaser.Scene, specs: { x: number; y: number; scale: number; speed: number }[]): Phaser.GameObjects.Image[] {
  const key = cloudTexture(scene);
  return specs.map(({ x, y, scale, speed }) => {
    const cloud = scene.add.image(x, y, key).setScale(scale).setAlpha(0.95).setDepth(-80);
    const width = cloud.displayWidth;
    const loop = (from: number) => {
      scene.tweens.add({
        targets: cloud, x: GAME_WIDTH + width / 2, duration: ((GAME_WIDTH + width / 2 - from) / speed) * 1000, ease: 'Linear',
        onComplete: () => {
          cloud.x = -width / 2;
          loop(cloud.x);
        },
      });
    };
    loop(x);
    return cloud;
  });
}

/** Two rolling hills along the bottom (menta and lavanda), as a texture. */
export function addHills(scene: Phaser.Scene, top: number, depth = 10): Phaser.GameObjects.Image {
  const key = `hills-${top}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const h = GAME_HEIGHT - top + 60;
    g.fillStyle(hex('lavanda'), 1).fillEllipse(260, 150, 900, 220).fillEllipse(1060, 140, 760, 200);
    g.fillStyle(hex('menta'), 1).fillEllipse(640, 190, 1500, 240);
    g.fillStyle(0xffffff, 0.35).fillEllipse(520, 120, 420, 14).fillEllipse(900, 140, 220, 10);
    g.generateTexture(key, GAME_WIDTH, h);
    g.destroy();
  }
  return scene.add.image(0, top - 60, key).setOrigin(0).setDepth(depth);
}
