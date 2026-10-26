// The street of ShopEntrance in the Lagatovino style (art-direction sections 3 and 7): flat `cielo`, clouds and houses in ink.
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, Ink, colorToNumber } from '../constants';
import { profileOf } from '../systems/motion';

const c = (token: keyof typeof Ink) => colorToNumber(Ink[token]);

export const SIDEWALK_Y = 604;

/** Flat `cielo` over the whole canvas, with a few pencil dashes so it does not feel empty. */
export function addInkSky(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(c('cielo'), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  g.lineStyle(3, c('lineaLapiz'), 0.5);
  for (const [x, y, w] of [[420, 70, 70], [880, 110, 50], [60, 250, 60], [1180, 60, 60]] as const) g.lineBetween(x, y, x + w, y);
  return g;
}

/** A `sol` sun with ink outline and short rays; it turns slowly (not with reduced motion). */
export function addInkSun(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.lineStyle(5, c('tinta'), 1);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.lineBetween(Math.cos(a) * 76, Math.sin(a) * 76, Math.cos(a) * 98, Math.sin(a) * 98);
  }
  g.fillStyle(c('sol'), 1).fillCircle(0, 0, 58);
  g.lineStyle(6, c('tinta'), 1).strokeCircle(0, 0, 58);
  g.fillStyle(0xffffff, 0.5).fillEllipse(-20, -28, 22, 12);
  const sun = scene.add.container(x, y, [g]);
  if (profileOf(scene).loops) scene.tweens.add({ targets: sun, angle: 360, duration: 60000, repeat: -1 });
  return sun;
}

function cloudTexture(scene: Phaser.Scene): string {
  const key = 'cloud-ink';
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  // The silhouette grown by 7 px in ink, and the white cloud on top: an even outline all around.
  const silhouette = (grow: number) => {
    g.fillCircle(70, 86, 40 + grow).fillCircle(130, 66, 52 + grow).fillCircle(192, 86, 40 + grow);
    g.fillRoundedRect(46 - grow, 84 - grow, 170 + grow * 2, 42 + grow * 2, 20 + grow);
  };
  g.fillStyle(c('tinta'), 1);
  silhouette(7);
  g.fillStyle(0xffffff, 1);
  silhouette(0);
  g.generateTexture(key, 270, 140);
  g.destroy();
  return key;
}

/** Ink clouds that drift to the right at different speeds and come back from the left. */
export function addInkClouds(scene: Phaser.Scene, specs: { x: number; y: number; scale: number; speed: number }[]): Phaser.GameObjects.Image[] {
  const key = cloudTexture(scene);
  return specs.map(({ x, y, scale, speed }) => {
    const cloud = scene.add.image(x, y, key).setScale(scale);
    const width = cloud.displayWidth;
    if (!profileOf(scene).loops) return cloud;
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

/** Houses far away and the sidewalk, drawn once into a texture. */
export function addInkStreet(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const key = 'street-ink-bg';
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const blocks: [number, number, number, keyof typeof Ink][] = [
      [-10, 150, 190, 'lila'], [190, 90, 150, 'rosa'], [350, 180, 240, 'sol'],
      [1130, 120, 190, 'rosa'], [1250, 140, 200, 'lila'],
    ];
    for (const [x, w, h, color] of blocks) {
      g.fillStyle(c(color), 1).fillRoundedRect(x, SIDEWALK_Y - h, w, h + 10, 14);
      g.lineStyle(5, c('tinta'), 1).strokeRoundedRect(x, SIDEWALK_Y - h, w, h + 10, 14);
      for (let wy = SIDEWALK_Y - h + 26; wy < SIDEWALK_Y - 50; wy += 56) {
        for (let wx = x + 20; wx < x + w - 36; wx += 46) {
          g.fillStyle(c('tarjeta'), 1).fillRoundedRect(wx, wy, 26, 32, 8);
          g.lineStyle(3, c('tinta'), 1).strokeRoundedRect(wx, wy, 26, 32, 8);
        }
      }
    }
    // Sidewalk of kraft paper with an ink edge and pencil joints.
    g.fillStyle(c('kraft'), 1).fillRect(0, SIDEWALK_Y, GAME_WIDTH, GAME_HEIGHT - SIDEWALK_Y);
    g.fillStyle(c('durazno'), 1).fillRect(0, SIDEWALK_Y, GAME_WIDTH, 14);
    g.lineStyle(6, c('tinta'), 1).lineBetween(0, SIDEWALK_Y + 14, GAME_WIDTH, SIDEWALK_Y + 14);
    g.lineStyle(3, c('lineaLapiz'), 0.8);
    for (let x = -40; x < GAME_WIDTH + 100; x += 110) g.lineBetween(x + 60, SIDEWALK_Y + 14, x - 40, GAME_HEIGHT);
    g.lineBetween(0, 670, GAME_WIDTH, 670);
    g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(0);
}
