import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import photo from '../../src/game/data/photo.json';
import { ObjectEvents } from '../../src/game/constants';
import { PhotoTray, trayCellPositions, type TrayEntry } from '../../src/game/objects/photomode/PhotoTray';
import { Sticker } from '../../src/game/objects/photomode/Sticker';
import { makeFakeScene, type FakeScene } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

// The fake container has no emit/off of a real one beyond what the objects use; these are loose views of it.
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- test doubles of Phaser objects
const loose = (o: unknown) => o as Loose;
const ptr = { id: 1, x: 0, y: 0, wasTouch: false };

const sticker = (scene: FakeScene, reduced = false) => {
  void reduced;
  return new Sticker(scene as never, 100, 100, 'sticker-estrella', 'photo-sticker-estrella');
};

describe('Sticker', () => {
  it('peel lifts it with tweens and marks it held', () => {
    const scene = makeFakeScene();
    const s = sticker(scene);
    s.peel();
    expect(s.isHeld).toBe(true);
    expect(scene.activeTweens().length).toBeGreaterThan(0);
  });

  it('peel with reduced motion does not tween', () => {
    const scene = makeFakeScene(true);
    const s = sticker(scene);
    s.peel();
    expect(scene.activeTweens()).toHaveLength(0);
  });

  it('follow moves it toward the target and leans it with the speed', () => {
    const s = sticker(makeFakeScene());
    s.follow({ x: 400, y: 100 }, 16);
    expect(loose(s).x).toBeGreaterThan(100);
    expect(loose(s).x).toBeLessThan(400);
    expect(loose(s).angle).toBeGreaterThan(0);
  });

  it('follow does not lean with reduced motion', () => {
    const s = sticker(makeFakeScene(true));
    s.follow({ x: 400, y: 100 }, 16);
    expect(loose(s).angle).toBe(0);
  });

  it('settle stamps it at the place with the angle (scale 1.2 back to 1), and it is no longer held', () => {
    const scene = makeFakeScene();
    const s = sticker(scene);
    s.peel();
    s.settle({ x: 300, y: 250 }, 7);
    expect(s.isHeld).toBe(false);
    const move = scene.tweens.records.find((r) => !r.removed && r.config.x === 300);
    expect(move?.config).toMatchObject({ x: 300, y: 250, angle: 7 });
    expect(scene.activeTweens().some((r) => JSON.stringify(r.config.scale) === JSON.stringify({ from: 1.2, to: 1 }))).toBe(true);
  });

  it('settle with reduced motion puts it there at once', () => {
    const scene = makeFakeScene(true);
    const s = sticker(scene);
    s.settle({ x: 300, y: 250 }, 7);
    expect(loose(s)).toMatchObject({ x: 300, y: 250, angle: 7 });
    expect(scene.activeTweens()).toHaveLength(0);
  });

  it('poof shrinks it away and destroys it when the tween ends', () => {
    const scene = makeFakeScene();
    const s = sticker(scene);
    s.poof();
    const t = scene.activeTweens().find((r) => r.config.alpha === 0)!;
    expect(t.config.scale).toBeLessThan(1);
    expect(loose(s).destroyed).toBe(false);
    (t.config.onComplete as () => void)();
    expect(loose(s).destroyed).toBe(true);
  });

  it('poof with reduced motion only fades', () => {
    const scene = makeFakeScene(true);
    sticker(scene).poof();
    const t = scene.activeTweens()[0]!;
    expect(t.config.scale).toBe(1);
    expect(t.config.angle).toBe(0);
  });

  it('enableGrab makes it draggable once, and a drag start emits StickerGrab with the pointer', () => {
    const scene = makeFakeScene();
    const s = sticker(scene);
    const grabbed = vi.fn();
    s.on(ObjectEvents.StickerGrab, grabbed);
    s.enableGrab();
    expect(loose(s).interactive.useHandCursor).toBe(true);
    s.emit('dragstart', ptr);
    expect(grabbed).toHaveBeenCalledWith(s, ptr);
  });

  it('a sticker in the hand does not start a second grab', () => {
    const s = sticker(makeFakeScene());
    const grabbed = vi.fn();
    s.on(ObjectEvents.StickerGrab, grabbed);
    s.enableGrab();
    s.peel();
    s.emit('dragstart', ptr);
    expect(grabbed).not.toHaveBeenCalled();
  });

  it('leaves no tweens running when destroyed', () => {
    const scene = makeFakeScene();
    const s = sticker(scene);
    s.peel();
    s.destroy();
    expect(scene.activeTweens()).toHaveLength(0);
  });
});

const entries = (n: number, open = true): TrayEntry[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Pieza ${i}`, texture: `t${i}`, open: open || i % 2 === 0 }));
const cells = (t: PhotoTray) => loose(t).list as Loose[];

describe('trayCellPositions', () => {
  it('lays the cells out in rows without overlapping, every cell at least 80 x 80', () => {
    for (const kind of ['backgrounds', 'frames', 'poses', 'stickers'] as const) {
      const spots = trayCellPositions(kind, 12);
      const dx = Math.min(...spots.slice(1).map((p, i) => Math.abs(p.x - spots[i]!.x)).filter((d) => d > 0));
      expect(dx).toBeGreaterThanOrEqual(80);
    }
  });

  it('fits the 12 stickers inside the panel (4 rows) and the first cell at the origin', () => {
    const spots = trayCellPositions('stickers', 12);
    expect(spots[0]!.x).toBeGreaterThanOrEqual(44);
    expect(Math.max(...spots.map((s) => s.y)) + 44).toBeLessThanOrEqual(420);
  });
});

describe('trayCellPositions with the whole catalog (F20.R A3)', () => {
  // The panel is 510 px tall and the tray starts 65 px below its top, with 12 px of paper left under the last row.
  const ROOM = 510 - 65 - 12;
  it('keeps every tray inside the panel, with all the pieces of photo.json, and every cell at least 80 tall', () => {
    for (const kind of ['backgrounds', 'frames', 'poses', 'stickers'] as const) {
      const n = (photo as Record<string, unknown[]>)[kind]!.length;
      const spots = trayCellPositions(kind, n);
      const rows = [...new Set(spots.map((s) => s.y))];
      const rowStep = rows.length > 1 ? rows[1]! - rows[0]! : 0;
      expect(rowStep === 0 || rowStep >= 80, kind).toBe(true);
      const bottom = Math.max(...spots.map((s) => s.y)) + (kind === 'poses' ? 42 : kind === 'stickers' ? 40 : 52);
      expect(bottom, kind).toBeLessThanOrEqual(ROOM);
    }
  });
});

describe('PhotoTray', () => {
  it('show lays a cell per piece, popping in one after another', () => {
    const scene = makeFakeScene();
    const tray = new PhotoTray(scene as never, 46, 215);
    tray.show('backgrounds', entries(6));
    expect(cells(tray)).toHaveLength(6);
    const delays = scene.tweens.records.map((r) => r.config.delay as number);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBeGreaterThan(1);
  });

  it('with reduced motion the cells only fade, all together', () => {
    const scene = makeFakeScene(true);
    const tray = new PhotoTray(scene as never, 0, 0);
    tray.show('frames', entries(5));
    expect(new Set(scene.tweens.records.map((r) => r.config.delay as number)).size).toBe(1);
    expect(cells(tray)[0]!.scale).toBe(1);
  });

  it('every cell has a hit area of at least 80 x 80 and the hand cursor', () => {
    const tray = new PhotoTray(makeFakeScene() as never, 0, 0);
    tray.show('stickers', entries(12));
    for (const c of cells(tray)) {
      expect(c.interactive.hitArea.width).toBeGreaterThanOrEqual(80);
      expect(c.interactive.hitArea.height).toBeGreaterThanOrEqual(80);
      expect(c.interactive.useHandCursor).toBe(true);
    }
  });

  it('F3: a pose with a face draws the fur and the face of the cat, cropped to the head, and no name in the middle', () => {
    const scene = makeFakeScene();
    const tray = new PhotoTray(scene as never, 0, 0);
    const face = { fur: 'cat-naranja', face: 'face-amor', crop: { x: 96, y: 20, width: 320, height: 250 }, scale: 0.2, offset: { x: 1, y: 2 }, angle: 8 };
    tray.show('poses', [{ id: 'p0', name: 'Coqueto', open: true, face }, { id: 'p1', name: 'Siestita', open: false, face }]);
    const images = scene.made.images as { key: string; calls: string[] }[];
    expect(images.filter((i) => i.key === 'cat-naranja')).toHaveLength(2);
    expect(images.filter((i) => i.key === 'face-amor')).toHaveLength(2);
    for (const i of images.filter((x) => x.key === 'face-amor')) expect(i.calls).toContain('setCrop');
    // The name stays, small, under the face.
    const names = (scene.made.texts as { text: string; style: { fontSize: string } }[]).filter((t) => t.text === 'Coqueto');
    expect(names).toHaveLength(1);
    expect(parseInt(names[0]!.style.fontSize, 10)).toBeLessThanOrEqual(22);
  });

  it('pressing an open piece emits TrayPick with the kind and the id', () => {
    const tray = new PhotoTray(makeFakeScene() as never, 0, 0);
    const pick = vi.fn();
    tray.on(ObjectEvents.TrayPick, pick);
    tray.show('poses', entries(4));
    cells(tray)[1]!.emit('pointerup');
    expect(pick).toHaveBeenCalledWith('poses', 'p1');
  });

  it('pressing a locked piece emits TrayLocked, not TrayPick', () => {
    const tray = new PhotoTray(makeFakeScene() as never, 0, 0);
    const pick = vi.fn();
    const locked = vi.fn();
    tray.on(ObjectEvents.TrayPick, pick);
    tray.on(ObjectEvents.TrayLocked, locked);
    tray.show('backgrounds', entries(4, false));
    cells(tray)[1]!.emit('pointerup');
    expect(pick).not.toHaveBeenCalled();
    expect(locked).toHaveBeenCalledWith('backgrounds', 'p1');
  });

  it('a locked sticker cannot be dragged off the sheet', () => {
    const tray = new PhotoTray(makeFakeScene() as never, 0, 0);
    tray.show('stickers', entries(4, false));
    const [open, locked] = cells(tray);
    expect(open!.interactive.draggable).toBe(true);
    expect(locked!.interactive.draggable).toBe(false);
  });

  it('dragging a sticker off the sheet emits TrayStickerGrab, and the release is not a press', () => {
    const tray = new PhotoTray(makeFakeScene() as never, 0, 0);
    const grab = vi.fn();
    const pick = vi.fn();
    tray.on(ObjectEvents.TrayStickerGrab, grab);
    tray.on(ObjectEvents.TrayPick, pick);
    tray.show('stickers', entries(4));
    const c = cells(tray)[2]!;
    c.emit('pointerdown');
    c.emit('dragstart', ptr);
    c.emit('pointerup');
    expect(grab).toHaveBeenCalledWith('p2', ptr);
    expect(pick).not.toHaveBeenCalled();
  });

  it('showing another page destroys the cells of the first', () => {
    const tray = new PhotoTray(makeFakeScene() as never, 0, 0);
    tray.show('backgrounds', entries(6));
    const first = [...cells(tray)];
    tray.show('poses', entries(4));
    expect(first.every((c) => c.destroyed)).toBe(true);
    expect(cells(tray).filter((c) => !c.destroyed)).toHaveLength(4);
  });

  it('remembers the chosen piece of each page', () => {
    const tray = new PhotoTray(makeFakeScene() as never, 0, 0);
    tray.select('poses', 'p2');
    tray.show('poses', entries(4));
    tray.select('poses', 'p3');
    expect(Object.keys(tray.getCellCenters())).toEqual(['p0', 'p1', 'p2', 'p3']);
  });

  it('destroy leaves no cells and no tweens', () => {
    const scene = makeFakeScene();
    const tray = new PhotoTray(scene as never, 0, 0);
    tray.show('stickers', entries(12));
    const all = [...cells(tray)];
    tray.destroy();
    expect(all.every((c) => c.destroyed)).toBe(true);
    expect(scene.activeTweens()).toHaveLength(0);
  });
});
