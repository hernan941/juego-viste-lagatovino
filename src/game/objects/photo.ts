// Draws the souvenir photo of the cat (F7): a cute card with the logo, the live cat and its name, rendered
// off-screen into a RenderTexture and read back as a PNG. The layout comes from domain/photo.ts.
import Phaser from 'phaser';
import { FONT_FAMILY, Palette, TextureKeys } from '../constants';
import { photoLayout } from '../domain/photo';
import type { AnchorsDef } from '../domain/types';
import type { Expression } from '../domain/expressions';
import type { Cat } from './Cat';
import { hex } from './ui';

export const PHOTO_LOGO = 'Viste Lagato';

/** The finished photo as a data URL (image/png). The RenderTexture and the helper objects are destroyed. */
/** The cat poses with love eyes (what the player sees when pressing the button), at rest: never caught mid-squash. */
export const PHOTO_POSE: Expression = 'amor';

export function takePhoto(scene: Phaser.Scene, cat: Cat, anchors: AnchorsDef, catName: string, pose: Expression = PHOTO_POSE): Promise<string> {
  const l = photoLayout();
  const rt = scene.make.renderTexture({ x: 0, y: 0, width: l.width, height: l.height }, false);
  const temp: Phaser.GameObjects.GameObject[] = [];
  const make = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    temp.push(o);
    return o;
  };

  // Soft pink backdrop in bands, with lavender paw prints like the cat gallery.
  const bg = make(scene.make.graphics({}, false));
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(hex('rosa200')), Phaser.Display.Color.ValueToColor(hex('rosa50')), 100, Math.round(t * 100),
    );
    bg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1).fillRect(0, (i * l.height) / bands, l.width, l.height / bands + 1);
  }
  bg.fillStyle(hex('lavanda'), 0.5);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 9; col++) {
      const x = col * 140 + (row % 2 === 0 ? 40 : 110);
      const y = row * 120 + 40;
      bg.fillEllipse(x, y + 6, 18, 14).fillCircle(x - 11, y - 6, 5).fillCircle(x - 4, y - 12, 5).fillCircle(x + 4, y - 12, 5).fillCircle(x + 11, y - 6, 5);
    }
  }
  // The card: cream, with a thick pink border and a soft shadow.
  const { frame } = l;
  bg.fillStyle(hex('rosa600'), 0.18).fillRoundedRect(frame.x + 4, frame.y + 14, frame.width, frame.height, frame.radius);
  bg.fillStyle(hex('crema'), 1).fillRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.radius);
  bg.lineStyle(14, hex('rosa400'), 1).strokeRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.radius);
  bg.lineStyle(4, hex('rosa200'), 1).strokeRoundedRect(frame.x + 22, frame.y + 22, frame.width - 44, frame.height - 44, frame.radius - 22);
  // Warm glow behind the cat and its shadow on the floor.
  bg.fillStyle(hex('mantequilla'), 0.55).fillEllipse(l.width / 2, l.cat.y + l.cat.height * 0.5, l.cat.size * 0.82, l.cat.size * 0.95);
  bg.fillStyle(hex('rosa600'), 0.16).fillEllipse(l.feet.x, l.feet.y + 6, l.cat.size * 0.5, 40);
  rt.draw(bg);

  // Sparkles and hearts around the cat.
  l.sparkles.forEach((p, i) => rt.stamp(i % 3 === 2 ? TextureKeys.Heart : TextureKeys.Sparkle, undefined, p.x, p.y, { scale: 1.3 + (i % 2) * 0.4 }));

  // Logo on top, with the same outline-and-shadow look as the plaque of the Showcase.
  const logo = make(scene.make.text({
    x: l.logo.x + l.logo.width / 2, y: l.logo.y + l.logo.height / 2, text: PHOTO_LOGO, add: false,
    style: { fontFamily: FONT_FAMILY, fontSize: '104px', color: '#FFFFFF', fontStyle: '700', stroke: Palette.rosa600, strokeThickness: 18, padding: { x: 10, y: 14 } },
  }).setOrigin(0.5));
  rt.draw(logo);

  // The live cat, with its pose and clothes, bigger and with its feet at `feet`. The drawing runs on `render()`,
  // and `capture` puts the cat back as it was right after.
  const scale = l.cat.size / anchors.canvas.width;
  const release = cat.freezeForPhoto(pose);
  rt.capture(cat, { x: l.feet.x, y: l.feet.y, scaleX: scale, scaleY: scale });

  // Name plaque at the bottom.
  const n = l.name;
  const plaque = make(scene.make.graphics({}, false));
  plaque.fillStyle(hex('rosa600'), 0.2).fillRoundedRect(n.x + 3, n.y + 10, n.width, n.height, n.height / 2);
  plaque.fillStyle(hex('rosa600'), 1).fillRoundedRect(n.x, n.y + 8, n.width, n.height, n.height / 2);
  plaque.fillStyle(hex('rosa400'), 1).fillRoundedRect(n.x, n.y, n.width, n.height, n.height / 2);
  plaque.fillStyle(0xffffff, 0.55).fillRoundedRect(n.x + 40, n.y + 12, n.width * 0.3, 10, 5);
  rt.draw(plaque);
  const name = make(scene.make.text({
    x: n.x + n.width / 2, y: n.y + n.height / 2 - 2, text: catName, add: false,
    style: { fontFamily: FONT_FAMILY, fontSize: '76px', color: '#FFFFFF', fontStyle: '700', stroke: Palette.rosa600, strokeThickness: 10, padding: { x: 6, y: 12 } },
  }).setOrigin(0.5));
  if (name.width > n.width - 60) name.setScale((n.width - 60) / name.width);
  rt.draw(name);

  rt.render();
  release();
  return new Promise((resolve) => {
    rt.snapshot((image) => {
      const url = (image as HTMLImageElement).src;
      for (const o of temp) o.destroy();
      rt.destroy();
      resolve(url);
    }, 'image/png');
  });
}
