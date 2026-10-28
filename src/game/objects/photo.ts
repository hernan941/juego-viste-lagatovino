// Draws the souvenir photo of the cat (F7): a cute card with the logo, the live cat and its name, rendered
// off-screen into a RenderTexture and read back as a PNG. The layout comes from domain/photo.ts.
import Phaser from 'phaser';
import { Fonts, Ink, TextureKeys, colorToNumber, type InkToken } from '../constants';
import { photoLayout } from '../domain/photo';
import { PHOTO_SIZE } from '../domain/photoComposition';
import { CARD_SIZE } from '../domain/keychainPackage';
import type { SheetOp } from '../domain/photoSheet';
import type { AnchorsDef } from '../domain/types';
import type { Expression } from '../domain/expressions';
import type { Cat } from './Cat';
import type { Keychain } from './keychain/Keychain';

const ink = (token: InkToken) => colorToNumber(Ink[token]);

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
      Phaser.Display.Color.ValueToColor(ink('cielo')), Phaser.Display.Color.ValueToColor(ink('cremaPapel')), 100, Math.round(t * 100),
    );
    bg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1).fillRect(0, (i * l.height) / bands, l.width, l.height / bands + 1);
  }
  bg.fillStyle(ink('lila'), 0.5);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 9; col++) {
      const x = col * 140 + (row % 2 === 0 ? 40 : 110);
      const y = row * 120 + 40;
      bg.fillEllipse(x, y + 6, 18, 14).fillCircle(x - 11, y - 6, 5).fillCircle(x - 4, y - 12, 5).fillCircle(x + 4, y - 12, 5).fillCircle(x + 11, y - 6, 5);
    }
  }
  // The card: cream, with a thick pink border and a soft shadow.
  const { frame } = l;
  bg.fillStyle(ink('tinta'), 0.14).fillRoundedRect(frame.x + 4, frame.y + 14, frame.width, frame.height, frame.radius);
  bg.fillStyle(ink('tarjeta'), 1).fillRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.radius);
  bg.lineStyle(10, ink('tinta'), 1).strokeRoundedRect(frame.x, frame.y, frame.width, frame.height, frame.radius);
  bg.lineStyle(3, ink('borde'), 1).strokeRoundedRect(frame.x + 22, frame.y + 22, frame.width - 44, frame.height - 44, frame.radius - 22);
  // Warm glow behind the cat and its shadow on the floor.
  bg.fillStyle(ink('sol'), 0.35).fillEllipse(l.width / 2, l.cat.y + l.cat.height * 0.5, l.cat.size * 0.82, l.cat.size * 0.95);
  bg.fillStyle(ink('tinta'), 0.12).fillEllipse(l.feet.x, l.feet.y + 6, l.cat.size * 0.5, 40);
  rt.draw(bg);

  // Sparkles and hearts around the cat.
  l.sparkles.forEach((p, i) => rt.stamp(i % 3 === 2 ? TextureKeys.Heart : TextureKeys.Sparkle, undefined, p.x, p.y, { scale: 1.3 + (i % 2) * 0.4 }));

  // Logo on top, with the same outline-and-shadow look as the plaque of the Showcase.
  const logo = make(scene.make.text({
    x: l.logo.x + l.logo.width / 2, y: l.logo.y + l.logo.height / 2, text: PHOTO_LOGO, add: false,
    style: { fontFamily: Fonts.Title, fontSize: '104px', color: Ink.tinta, fontStyle: '900', stroke: Ink.rosa, strokeThickness: 18, padding: { x: 10, y: 14 } },
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
  plaque.fillStyle(ink('sombraTarjeta'), 1).fillRoundedRect(n.x + 3, n.y + 8, n.width, n.height, n.height / 2);
  plaque.fillStyle(ink('tinta'), 1).fillRoundedRect(n.x, n.y, n.width, n.height, n.height / 2);
  rt.draw(plaque);
  const name = make(scene.make.text({
    x: n.x + n.width / 2, y: n.y + n.height / 2 - 2, text: catName, add: false,
    style: { fontFamily: Fonts.Title, fontSize: '76px', color: Ink.cremaPapel, fontStyle: '900', padding: { x: 6, y: 12 } },
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

// ---- The photo of the scrapbook (F18.5): the composition of the table, drawn from the operations of domain/photoSheet.ts ----

export interface SheetPlace {
  /** Where the middle of the sheet goes in the render, and how many render px one px of the sheet is. */
  x: number;
  y: number;
  scale: number;
}

/**
 * The paper label of the caption (F20.R A2), centered on (0, 0) of `g`: a flat shadow, the white card with its border and a washi of
 * sol at the top. The live table and the saved picture draw the same one.
 */
export function drawCaptionLabel(g: Phaser.GameObjects.Graphics, width: number, height: number): Phaser.GameObjects.Graphics {
  const r = 10;
  g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-width / 2 + 3, -height / 2 + 4, width, height, r);
  g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-width / 2, -height / 2, width, height, r);
  g.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-width / 2, -height / 2, width, height, r);
  g.fillStyle(colorToNumber(Ink.sol), 0.7).fillRect(-34, -height / 2 - 9, 68, 18);
  return g;
}

/** What the operations that are not plain images and texts need from the scene. */
export interface SheetExtras {
  /** The live cat for a 'cat' op, drawn with this face. */
  cat?: Cat;
  expression?: Expression;
  /** Draws the keychain of a 'keychain' op: it hangs from (x, y) in the render and one px of its texture is `k` render px. */
  keychain?: (x: number, y: number, k: number) => void;
}

/**
 * Runs the operations of the sheet into `rt`. Images go 1:1 (or to the height asked), the texts are made at their final size (never
 * scaled up, so they stay sharp) and the cat is captured with its pose and face (`expression`) at rest. Every helper object made here
 * is pushed to `temp` for the caller to destroy; the returned function lets the cat go back to what it was doing.
 */
export function drawSheetOps(
  scene: Phaser.Scene, rt: Phaser.GameObjects.RenderTexture | Phaser.Textures.DynamicTexture, ops: readonly SheetOp[], at: SheetPlace,
  extras: SheetExtras, temp: Phaser.GameObjects.GameObject[],
): () => void {
  let release: () => void = () => undefined;
  for (const op of ops) {
    const x = at.x + op.x * at.scale;
    const y = at.y + op.y * at.scale;
    if (op.kind === 'image') {
      const img = new Phaser.GameObjects.Image(scene, x, y, op.texture);
      temp.push(img);
      const k = (op.height !== undefined ? op.height / img.height : op.width !== undefined ? op.width / img.width : (op.scale ?? 1)) * at.scale;
      img.setScale(k).setAngle(op.angle ?? 0).setAlpha(op.alpha ?? 1);
      if (op.crop) img.setCrop(op.crop.x, op.crop.y, op.crop.width, op.crop.height);
      rt.draw(img);
    } else if (op.kind === 'text') {
      const text = scene.make.text({
        x, y, text: op.text, add: false,
        style: { fontFamily: Fonts.Voice, fontSize: `${op.fontSize * at.scale}px`, color: Ink.tinta, padding: { x: 4 * at.scale, y: 8 * at.scale } },
      }).setOrigin(0.5).setAngle(op.angle ?? 0);
      temp.push(text);
      const room = op.maxWidth * at.scale;
      if (text.width > room) text.setScale(room / text.width);
      rt.draw(text);
    } else if (op.kind === 'label') {
      const g = new Phaser.GameObjects.Graphics(scene);
      temp.push(g);
      drawCaptionLabel(g, op.width, op.height);
      g.setPosition(x, y).setScale(at.scale).setAngle(op.angle);
      rt.draw(g);
    } else if (op.kind === 'cat') {
      if (!extras.cat) continue;
      const k = (op.size / 512) * at.scale;
      release = extras.cat.freezeForPhoto(extras.expression ?? 'normal');
      rt.capture(extras.cat, { x, y, scaleX: k, scaleY: k });
    } else {
      extras.keychain?.(x, y, op.scale * at.scale);
    }
  }
  return release;
}

/** Reads a render texture back as a PNG data URL and destroys it with the helper objects. */
export function renderToPng(rt: Phaser.GameObjects.RenderTexture, temp: Phaser.GameObjects.GameObject[]): Promise<string> {
  return new Promise((resolve) => {
    rt.snapshot((image) => {
      for (const o of temp) o.destroy();
      rt.destroy();
      resolve((image as HTMLImageElement).src);
    }, 'image/png');
  });
}

/** The saved photo of the table: the sheet at twice its size (1080 x 1350), the same 4:5 as the souvenir of the Showcase. */
export function composePhoto(scene: Phaser.Scene, cat: Cat, ops: readonly SheetOp[], expression: Expression): Promise<string> {
  const scale = 2;
  const width = PHOTO_SIZE.width * scale;
  const height = PHOTO_SIZE.height * scale;
  const rt = scene.make.renderTexture({ x: 0, y: 0, width, height }, false);
  const temp: Phaser.GameObjects.GameObject[] = [];
  const release = drawSheetOps(scene, rt, ops, { x: width / 2, y: height / 2, scale }, { cat, expression }, temp);
  rt.render();
  release();
  return renderToPng(rt, temp);
}

/** The PNG of the packaging (S8): the kraft card at twice its size (1080 x 1350) with the keychain hanging from its hole. */
export function composePackage(scene: Phaser.Scene, ops: readonly SheetOp[], keychain: Keychain): Promise<string> {
  const scale = 2;
  const width = CARD_SIZE.width * scale;
  const height = CARD_SIZE.height * scale;
  const rt = scene.make.renderTexture({ x: 0, y: 0, width, height }, false);
  const temp: Phaser.GameObjects.GameObject[] = [];
  drawSheetOps(scene, rt, ops, { x: width / 2, y: height / 2, scale }, { keychain: (x, y, k) => keychain.drawInto(rt, x, y, k, temp) }, temp);
  rt.render();
  return renderToPng(rt, temp);
}
