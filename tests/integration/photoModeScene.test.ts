import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/sceneFake')).phaserSceneMock);

interface FakeTransformation {
  options: { recipe: Record<string, unknown> & { photo: Record<string, unknown> }; onPhase(p: string): void; play(k: string, v?: number): void };
  skips: number; destroyed: boolean; restored: boolean; hung: { at: { x: number; y: number }; scale: number } | null; faded: boolean;
  keychain: { layout: { width: number; height: number; hang: { x: number; y: number } } };
  finish(): void;
}
interface FakeCard { ops: { kind: string; texture?: string; text?: string }[]; flew: boolean; rose: boolean; sunk: boolean; tappable: boolean; destroyed: boolean; emit(ev: string): void }

const h = vi.hoisted(() => ({
  go: vi.fn(),
  transitionIn: vi.fn(),
  composePhoto: vi.fn(async (...args: unknown[]) => (args.length >= 0 ? 'data:image/png;base64,AAAA' : '')),
  savePhoto: vi.fn(async () => 'downloaded'),
  buttons: [] as { label: string; emit(ev: string): void; destroyed: boolean; visible: boolean }[],
  cats: [] as { outfit: string[]; held: string[]; textures: Record<string, string>; destroyed: boolean }[],
  bubbles: [] as { text: string; destroyed: boolean }[],
  trays: [] as { kinds: string[]; selected: Record<string, string | null>; emit(ev: string, ...a: unknown[]): void; destroyed: boolean }[],
  tabs: [] as { emit(ev: string, ...a: unknown[]): void; destroyed: boolean }[],
  failTransform: false,
  transformations: [] as FakeTransformation[],
  cards: [] as FakeCard[],
  composePackage: vi.fn(async (...args: unknown[]) => (args.length >= 0 ? 'data:image/png;base64,PKG' : '')),
  sheets: [] as { options: { catName: string; before: number; now: number; replaceByDefault: boolean }; closed: boolean; destroyed: boolean; emit(ev: string, ...a: unknown[]): void }[],
  stickers: [] as { id: string; at: { x: number; y: number }; emit(ev: string, ...a: unknown[]): void; calls: string[]; destroyed: boolean }[],
}));

vi.mock('../../src/game/objects/keychain/Keychain', () => ({ keychainData: () => ({}) }));
vi.mock('../../src/game/objects/keychain/KeychainTransformation', () => ({
  KeychainTransformation: class {
    skips = 0; destroyed = false; restored = false; faded = false; hung: { at: { x: number; y: number }; scale: number } | null = null;
    keychain = { layout: { width: 560, height: 640, hang: { x: 280, y: 30 } } };
    private resolveRun: (() => void) | null = null;
    constructor(_scene: unknown, public options: FakeTransformation['options']) { h.transformations.push(this as never); }
    run() { return new Promise<void>((resolve, reject) => { if (h.failTransform) reject(new Error('no keychain')); this.resolveRun = resolve; }); }
    finish() { this.resolveRun?.(); }
    skip() { this.skips++; this.finish(); }
    hangOn(at: { x: number; y: number }, scale: number) { this.hung = { at, scale }; return Promise.resolve(); }
    fadeOut() { this.faded = true; return Promise.resolve(); }
    restoreCat() { this.restored = true; }
    destroy() { this.destroyed = true; }
  },
}));
vi.mock('../../src/game/objects/keychain/PackageCard', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    PackageCard: class extends Emitter {
      rose = false; flew = false; sunk = false; tappable = false; destroyed = false; hangPoint = { x: 640, y: 80 };
      constructor(_s: unknown, _x: number, _y: number, public ops: FakeCard['ops']) { super(); h.cards.push(this as never); }
      setDepth() { return this; }
      rise() { this.rose = true; return Promise.resolve(); }
      sink() { this.sunk = true; return Promise.resolve(); }
      enableTap() { this.tappable = true; }
      flyThumb() { this.flew = true; return Promise.resolve(); }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/plugins/DyePlugin', () => ({ getDye: () => ({ ensure: async (_i: string, d: string) => `dyed-${d}` }) }));
vi.mock('../../src/game/systems/navigate', () => ({ go: (...a: unknown[]) => h.go(...a) }));
vi.mock('../../src/game/systems/transitions', () => ({
  enterKind: (d: { transition?: string } | undefined) => d?.transition ?? null,
  transitionIn: (...a: unknown[]) => h.transitionIn(...a),
}));
vi.mock('../../src/game/systems/download', () => ({ savePhoto: (...a: unknown[]) => h.savePhoto(...(a as [])) }));
vi.mock('../../src/game/objects/photo', () => ({ composePhoto: (...a: unknown[]) => h.composePhoto(...a), composePackage: (...a: unknown[]) => h.composePackage(...a) }));
vi.mock('../../src/game/objects/ui', () => ({ touchEnv: () => ({ touch: false, scale: 1 }) }));
vi.mock('../../src/game/plugins/AudioPlugin', () => ({ getAudio: (s: { plugins: { get(k: string): unknown } }) => s.plugins.get('audio') }));
vi.mock('../../src/game/objects/Cat', () => ({
  Cat: class {
    outfit: string[] = []; held: string[] = []; destroyed = false; wornIds: string[] = [];
    constructor() { h.cats.push(this); }
    setDepth() { return this; }
    setOutfit(items: { id: string }[]) { this.outfit = items.map((i) => i.id); this.wornIds = this.outfit; }
    appear() {}
    hold(e: string) { this.held.push(e); }
    poses: string[] = [];
    applyPose(id: string) { this.poses.push(id); return true; }
    clearPose() { this.poses.push('none'); }
    squash() {}
    textures: Record<string, string> = {};
    setItemTexture(id: string, key: string) { this.textures[id] = key; }
    destroy() { this.destroyed = true; }
  },
}));
vi.mock('../../src/game/objects/Button', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    Button: class extends Emitter {
      destroyed = false; x: number; y: number;
      constructor(_s: unknown, x: number, y: number, public label: string) { super(); this.x = x; this.y = y; h.buttons.push(this as never); }
      setDepth() { return this; }
      getCenter() { return { x: this.x, y: this.y }; }
      setVisible(v: boolean) { this.visible = v; return this; }
      setAlpha() { return this; }
      setScale() { return this; }
      visible = true;
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/keychain/ReplaceSheet', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    ReplaceSheet: class extends Emitter {
      closed = false; destroyed = false;
      constructor(_s: unknown, public options: { catName: string; before: number; now: number; replaceByDefault: boolean }) { super(); h.sheets.push(this as never); }
      close(done?: () => void) { this.closed = true; done?.(); }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/photomode/PhotoTray', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    PhotoTray: class extends Emitter {
      kinds: string[] = []; selected: Record<string, string | null> = {}; destroyed = false;
      constructor() { super(); h.trays.push(this as never); }
      setDepth() { return this; }
      show(kind: string) { this.kinds.push(kind); }
      select(kind: string, id: string | null) { this.selected[kind] = id; }
      getCellCenters() { return { 'bg-cielo': { x: 5, y: 5 } }; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/Tabs', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    Tabs: class extends Emitter {
      destroyed = false;
      constructor() { super(); h.tabs.push(this as never); }
      setDepth() { return this; }
      select() {}
      getTabPositions() { return { backgrounds: { x: 1, y: 1 } }; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/photomode/Sticker', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    Sticker: class extends Emitter {
      calls: string[] = []; destroyed = false; x = 0; y = 0;
      constructor(_s: unknown, x: number, y: number, public id: string) { super(); this.x = x; this.y = y; h.stickers.push(this as never); }
      get at() { return { x: this.x, y: this.y }; }
      setDepth() { return this; }
      peel() { this.calls.push('peel'); }
      enableGrab() { this.calls.push('grab'); }
      follow() { this.calls.push('follow'); }
      settle(to: { x: number; y: number }) { this.calls.push('settle'); this.x = to.x; this.y = to.y; }
      poof() { this.calls.push('poof'); this.destroyed = true; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/MuteButton', async () => ({ MuteButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));
vi.mock('../../src/game/objects/MotionButton', async () => ({ MotionButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));
vi.mock('../../src/game/objects/kit/Card', async () => ({ Card: class { setDepth() { return this; } destroy() {} } }));
vi.mock('../../src/game/objects/kit/PaperBackground', async () => ({ PaperBackground: class { setDepth() { return this; } destroy() {} } }));
vi.mock('../../src/game/objects/kit/SpeechBubble', async () => ({
  SpeechBubble: class { destroyed = false; constructor(_s: unknown, _x: number, _y: number, public text: string) { h.bubbles.push(this); } setDepth() { return this; } destroy() { this.destroyed = true; } },
}));

import { PhotoMode } from '../../src/game/scenes/PhotoMode';
import { ObjectEvents, RegistryKeys } from '../../src/game/constants';
import { backgroundCrop } from '../../src/game/domain/photoComposition';
import { emptyProgress } from '../../src/game/domain/progress';
import { photoFileName } from '../../src/game/domain/photo';
import { assertGameData } from '../../src/game/data/schema';
import anchors from '../../src/game/data/anchors.json';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import economy from '../../src/game/data/economy.json';
import dyes from '../../src/game/data/dyes.json';
import sets from '../../src/game/data/sets.json';
import photo from '../../src/game/data/photo.json';
import brand from '../../src/game/data/brand.json';
import tags from '../../src/game/data/tags.json';
import type { FakeScene } from './helpers/sceneFake';

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand, tags });
const sweater = catalog.clothes.find((c) => c.slot === 'sweater')!;

type Scene = FakeScene & {
  init(d?: unknown): void; create(): void;
  getE2EUi(): { ready: boolean; buttons: Record<string, unknown>; points: Record<string, unknown>; info: Record<string, unknown> };
};

function open(data?: unknown, session: Record<string, unknown> = { catId: catalog.cats[0]!.id, catName: 'Luna', outfit: { sweater: sweater.id } }, progress = emptyProgress(0)) {
  const scene = new PhotoMode() as unknown as Scene;
  scene.registry.set(RegistryKeys.Catalog, catalog);
  scene.registry.set(RegistryKeys.Anchors, anchors);
  scene.registry.set(RegistryKeys.Progress, progress);
  for (const [k, v] of Object.entries({ catId: session.catId, catName: session.catName, outfit: session.outfit })) scene.registry.set(k, v);
  scene.init(data);
  scene.create();
  return scene;
}
const button = (label: string) => h.buttons.find((b) => b.label === label)!;
const run = (scene: FakeScene) => { for (const d of [...scene.time.delayed]) d.fn(); scene.time.delayed.length = 0; };

beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => ({}), body: {} });
  vi.stubGlobal('navigator', {});
  for (const m of [h.go, h.transitionIn, h.composePhoto, h.composePackage, h.savePhoto]) m.mockClear();
  h.failTransform = false;
  for (const list of [h.transformations, h.cards, h.buttons, h.cats, h.bubbles, h.trays, h.tabs, h.stickers, h.sheets]) list.length = 0;
});

describe('PhotoMode scene (F18.2)', () => {
  it('shows the cat of the look, dressed, and enters with the transition it was started with', () => {
    open({ transition: 'flash' });
    expect(h.cats).toHaveLength(1);
    expect(h.cats[0]!.outfit).toEqual([sweater.id]);
    expect(h.transitionIn).toHaveBeenCalledWith(expect.anything(), 'flash', expect.anything());
  });

  it('puts the dyes of the worn items on the cat, as the session keeps them', async () => {
    const scene = new PhotoMode() as unknown as Scene;
    scene.registry.set(RegistryKeys.Catalog, catalog);
    scene.registry.set(RegistryKeys.Anchors, anchors);
    scene.registry.set(RegistryKeys.Progress, emptyProgress(0));
    scene.registry.set('catId', catalog.cats[0]!.id);
    scene.registry.set('catName', 'Luna');
    scene.registry.set('outfit', { sweater: sweater.id });
    scene.registry.set('itemDye', { [sweater.id]: 'rosa' });
    scene.init();
    scene.create();
    await vi.waitFor(() => expect(h.cats[0]!.textures).toEqual({ [sweater.id]: 'dyed-rosa' }));
  });

  it('wears the look it was handed, not the session', () => {
    const other = catalog.clothes.find((c) => c.slot === 'head')!;
    open({ look: { catId: catalog.cats[1]!.id, catName: 'Kiwi', outfit: { head: other.id } } });
    expect(h.cats[0]!.outfit).toEqual([other.id]);
  });

  it('starts with the first unlocked background and frame, and reports the rating for the e2e hook', () => {
    const scene = open({ rating: { points: 90, stars: 5, breakdown: [] } });
    const info = scene.getE2EUi().info;
    expect(info).toMatchObject({ background: 'bg-cuadriculado', frame: 'frame-polaroid', pose: 'pose-sentadito', stars: 5, catName: 'Luna' });
  });

  it('when the keychain cannot be made, Guardar saves the plain photo of the cat, with the cat name and says it is ready', async () => {
    h.failTransform = true;
    const scene = open();
    button('Guardar').emit(ObjectEvents.ButtonClick);
    expect(scene.played).toContain('sfx-shutter');
    expect(scene.getE2EUi().info.photoBusy).toBe(true);
    run(scene);
    await vi.waitFor(() => expect(h.savePhoto).toHaveBeenCalledTimes(1));
    expect(h.savePhoto.mock.calls[0]).toEqual([expect.objectContaining({ touch: false }), 'data:image/png;base64,AAAA', photoFileName('Luna')]);
    await vi.waitFor(() => expect(scene.getE2EUi().info.photos).toBe(1));
    expect(scene.getE2EUi().info).toMatchObject({ photoBusy: false, lastPhoto: photoFileName('Luna') });
    expect(h.bubbles.map((b) => b.text)).toEqual(['Foto lista!']);
  });

  it('the plain photo is the composition of the table (pieces, stickers, name and stars), not the card of the Showcase', async () => {
    h.failTransform = true;
    const scene = open({ rating: { points: 90, stars: 4, breakdown: [] } });
    button('Guardar').emit(ObjectEvents.ButtonClick);
    run(scene);
    await vi.waitFor(() => expect(h.composePhoto).toHaveBeenCalledTimes(1));
    const [, , ops, expression] = h.composePhoto.mock.calls[0] as unknown as [unknown, unknown, { kind: string; text?: string; texture?: string }[], string];
    expect(ops.map((o) => o.kind)).toContain('cat');
    expect(ops.find((o) => o.kind === 'text')?.text).toBe('Luna');
    expect(ops.filter((o) => o.texture === 'ui-stamp-sol')).toHaveLength(4);
    expect(ops.some((o) => o.texture === catalog.photo.backgrounds[0]!.texture)).toBe(true);
    expect(expression).toBe('normal');
  });

  it('the plain photo keeps the cat in the pose that was chosen: Guardar does not make it hold other eyes (it used to stay in love)', async () => {
    h.failTransform = true;
    const scene = open();
    button('Guardar').emit(ObjectEvents.ButtonClick);
    run(scene);
    await vi.waitFor(() => expect(h.savePhoto).toHaveBeenCalledTimes(1));
    expect(h.cats[0]!.held).toEqual([]);
  });

  it('ignores a second Guardar while the first is going (plain photo)', async () => {
    h.failTransform = true;
    const scene = open();
    button('Guardar').emit(ObjectEvents.ButtonClick);
    button('Guardar').emit(ObjectEvents.ButtonClick);
    run(scene);
    await vi.waitFor(() => expect(h.savePhoto).toHaveBeenCalledTimes(1));
    expect(h.composePhoto).toHaveBeenCalledTimes(1);
  });

  it('Seguir vistiendo goes on dressing, once', () => {
    const scene = open();
    button('Seguir vistiendo').emit(ObjectEvents.ButtonClick);
    button('Seguir vistiendo').emit(ObjectEvents.ButtonClick);
    expect(h.go).toHaveBeenCalledTimes(1);
    expect(h.go).toHaveBeenCalledWith(scene, 'keepDressing');
  });

  it('init resets the state of a previous visit', async () => {
    const scene = open();
    button('Guardar').emit(ObjectEvents.ButtonClick);
    h.transformations[0]!.finish();
    await vi.waitFor(() => expect(scene.getE2EUi().info.photos).toBe(1));
    scene.init();
    scene.create();
    expect(scene.getE2EUi().info).toMatchObject({ photos: 0, lastPhoto: null, photoBusy: false, keychainPhase: null });
  });

  it('cleans everything on shutdown', () => {
    const scene = open();
    scene.events.emit('shutdown');
    expect(h.buttons.every((b) => b.destroyed)).toBe(true);
    expect(h.cats.every((c) => c.destroyed)).toBe(true);
    expect(scene.activeTweens).toHaveLength(0);
    expect(scene.time.delayed).toHaveLength(0);
  });
});

// ---- F18.3 backgrounds, frames and poses; F18.4 stickers ----
type Board = Scene & { getComposition(): { background: string | null; frame: string | null; pose: string | null; stickers: { id: string; x: number; y: number; angle: number }[] } };
const SHEET_MID = { x: 640, y: 360 };
const ptr = (x: number, y: number, id = 1) => ({ x, y, id, wasTouch: false });
const tray = () => h.trays[0]!;
const info = (s: Scene) => s.getE2EUi().info;
const catPoses = () => (h.cats[0] as unknown as { poses: string[] }).poses;

function ready(progress = emptyProgress(0)) {
  const scene = open(undefined, undefined, progress) as Board;
  run(scene);
  return scene;
}
/** Takes a sticker off the sheet and lets go at `to`. */
function drag(scene: Scene, id: string, to: { x: number; y: number }) {
  tray().emit(ObjectEvents.TrayStickerGrab, id, ptr(80, 300));
  scene.input.emit('pointermove', ptr(to.x, to.y));
  scene.input.emit('pointerup', ptr(to.x, to.y));
}

describe('PhotoMode trays (F18.3)', () => {
  it('starts on the backgrounds tab and lists it in the tray', () => {
    ready();
    expect(tray().kinds).toEqual(['backgrounds']);
  });

  it('the tabs switch the tray to that kind, marking what is chosen', () => {
    ready();
    h.tabs[0]!.emit(ObjectEvents.TabSelect, 'poses');
    expect(tray().kinds).toEqual(['backgrounds', 'poses']);
    expect(tray().selected.poses).toBe('pose-sentadito');
  });

  it('choosing an unlocked background changes the composition, with a page turn sound', () => {
    const scene = ready();
    tray().emit(ObjectEvents.TrayPick, 'backgrounds', 'bg-cielo');
    expect(scene.getComposition().background).toBe('bg-cielo');
    expect(scene.played).toContain('sfx-paper');
    expect(tray().selected.backgrounds).toBe('bg-cielo');
  });

  it('choosing the frame that is unlocked keeps it in the composition', () => {
    const scene = ready();
    tray().emit(ObjectEvents.TrayPick, 'frames', 'frame-polaroid');
    expect(scene.getComposition().frame).toBe('frame-polaroid');
  });

  it('cuts every background to the window of the frame, also after the background or the frame changes (F1)', () => {
    const scene = ready();
    const crops = (texture: string) => (scene.made as unknown as { args: unknown[]; crop?: unknown; destroyed: boolean }[])
      .filter((o) => o.args[2] === texture && !o.destroyed).map((o) => o.crop);
    expect(crops('photo-bg-cuadriculado')).toEqual([backgroundCrop('frame-polaroid')]);
    tray().emit(ObjectEvents.TrayPick, 'backgrounds', 'bg-cielo');
    expect(crops('photo-bg-cielo')).toEqual([backgroundCrop('frame-polaroid')]);
    // A frame with another window re-cuts the background that is already there.
    const frame = catalog.photo.frames.find((f) => f.unlock === 'starter' && f.id !== 'frame-polaroid');
    if (frame) {
      tray().emit(ObjectEvents.TrayPick, 'frames', frame.id);
      expect(crops('photo-bg-cielo')).toEqual([backgroundCrop(frame.id)]);
    }
  });

  it('a locked frame is not chosen', () => {
    const scene = ready();
    tray().emit(ObjectEvents.TrayPick, 'frames', 'frame-dorado');
    expect(scene.getComposition().frame).toBe('frame-polaroid');
  });

  it('a locked piece is not chosen: the composition stays and the bubble says how to get it', () => {
    const scene = ready();
    tray().emit(ObjectEvents.TrayPick, 'backgrounds', 'bg-vichy');
    expect(scene.getComposition().background).toBe('bg-cuadriculado');
    expect(h.bubbles.at(-1)!.text).toBe('Completa el set Abriguito');
  });

  it('the tray also reports a locked press, with the same answer', () => {
    ready();
    tray().emit(ObjectEvents.TrayLocked, 'backgrounds', 'bg-rayado');
    expect(h.bubbles.at(-1)!.text).toBe('Llena el 50 % del cuaderno');
  });

  it('a pose is applied to the cat by id without the prefix', () => {
    const scene = ready();
    tray().emit(ObjectEvents.TrayPick, 'poses', 'pose-coqueto');
    expect(scene.getComposition().pose).toBe('pose-coqueto');
    expect(catPoses()).toContain('coqueto');
  });

  it('a locked pose does not change the cat', () => {
    const scene = ready();
    const before = [...catPoses()];
    tray().emit(ObjectEvents.TrayPick, 'poses', 'pose-dormilon');
    expect(scene.getComposition().pose).toBe('pose-sentadito');
    expect(catPoses()).toEqual(before);
  });

  it('the pieces answer only once the scene is ready', () => {
    const scene = open() as Board;
    tray().emit(ObjectEvents.TrayPick, 'backgrounds', 'bg-cielo');
    expect(scene.getComposition().background).toBe('bg-cuadriculado');
  });

  it('unlocks come from the progress: a 5 star look opens its pose', () => {
    const scene = ready({ ...emptyProgress(0), bestStars: { [catalog.cats[0]!.id]: 5 } });
    tray().emit(ObjectEvents.TrayPick, 'poses', 'pose-saltito');
    expect(scene.getComposition().pose).toBe('pose-saltito');
  });

  it('lists the composition in the e2e hook, with the cells and the tabs', () => {
    const scene = ready();
    expect(info(scene).composition).toEqual(scene.getComposition());
    expect(scene.getE2EUi().points).toMatchObject({ 'tab:backgrounds': { x: 1, y: 1 }, 'cell:bg-cielo': { x: 5, y: 5 } });
    expect(info(scene)).toMatchObject({ tab: 'backgrounds', stickerLimit: 8 });
  });
});

describe('PhotoMode stickers (F18.4)', () => {
  it('a sticker taken off the sheet and let go on the photo stays there, inside the area', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', SHEET_MID);
    const [s] = scene.getComposition().stickers;
    expect(s).toMatchObject({ id: 'sticker-estrella', x: 0, y: 0 });
    expect(Math.abs(s!.angle)).toBeLessThanOrEqual(10);
    expect(scene.played).toContain('sfx-peel');
    expect(h.stickers[0]!.calls).toEqual(expect.arrayContaining(['peel', 'settle']));
  });

  it('keeps it inside the frame when it is let go near the edge', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', { x: 905, y: 25 });
    const s = scene.getComposition().stickers[0]!;
    expect(Math.abs(s.x)).toBeLessThanOrEqual(270 - 28);
    expect(Math.abs(s.y)).toBeLessThanOrEqual(337.5 - 28);
  });

  it('let go away from the photo, it goes poof and nothing is placed', () => {
    const scene = ready();
    drag(scene, 'sticker-corazon', { x: 1100, y: 100 });
    expect(scene.getComposition().stickers).toHaveLength(0);
    expect(h.stickers[0]!.calls).toContain('poof');
  });

  it('a sticker that is still locked cannot be taken', () => {
    const scene = ready();
    drag(scene, 'sticker-fresa', SHEET_MID);
    expect(scene.getComposition().stickers).toHaveLength(0);
    expect(h.stickers).toHaveLength(0);
  });

  it('respects the limit of 8: the ninth goes poof and the bubble says it is full', () => {
    const scene = ready();
    for (let i = 0; i < 9; i++) drag(scene, 'sticker-estrella', { x: 560 + i * 10, y: 300 });
    expect(scene.getComposition().stickers).toHaveLength(8);
    expect(h.stickers[8]!.calls).toContain('poof');
    expect(h.bubbles.at(-1)!.text).toBe('Foto llena de stickers!');
  });

  it('a placed sticker is removed when it is dragged to the jar', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', SHEET_MID);
    const placed = h.stickers[0]!;
    placed.emit(ObjectEvents.StickerGrab, placed, ptr(640, 360));
    const jar = scene.getE2EUi().points.jar as { x: number; y: number };
    scene.input.emit('pointerup', ptr(jar.x, jar.y));
    expect(scene.getComposition().stickers).toHaveLength(0);
    expect(placed.calls).toContain('poof');
  });

  it('a placed sticker is removed when it goes back to the sheet (the left panel)', () => {
    const scene = ready();
    drag(scene, 'sticker-xoxo', SHEET_MID);
    const placed = h.stickers[0]!;
    placed.emit(ObjectEvents.StickerGrab, placed, ptr(640, 360));
    scene.input.emit('pointerup', ptr(150, 400));
    expect(scene.getComposition().stickers).toHaveLength(0);
  });

  it('a placed sticker can be moved: it goes on top, in its new place', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', { x: 560, y: 300 });
    drag(scene, 'sticker-corazon', { x: 700, y: 400 });
    const first = h.stickers[0]!;
    first.emit(ObjectEvents.StickerGrab, first, ptr(560, 300));
    scene.input.emit('pointerup', ptr(600, 500));
    const list = scene.getComposition().stickers;
    expect(list.map((s) => s.id)).toEqual(['sticker-corazon', 'sticker-estrella']);
    expect(list[1]).toMatchObject({ x: -40, y: 140 });
  });

  it('a placed sticker let go off the photo (and not on the jar or the sheet) goes back to where it was', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', { x: 560, y: 300 });
    const before = { ...scene.getComposition().stickers[0]! };
    const s = h.stickers[0]!;
    s.emit(ObjectEvents.StickerGrab, s, ptr(560, 300));
    scene.input.emit('pointerup', ptr(1000, 40));
    expect(scene.getComposition().stickers).toEqual([before]);
    expect(s.calls).not.toContain('poof');
  });

  it('only the pointer that grabbed it moves it', () => {
    const scene = ready();
    tray().emit(ObjectEvents.TrayStickerGrab, 'sticker-estrella', ptr(80, 300, 1));
    scene.input.emit('pointerup', ptr(640, 360, 2));
    expect(scene.getComposition().stickers).toHaveLength(0);
    scene.input.emit('pointerup', ptr(640, 360, 1));
    expect(scene.getComposition().stickers).toHaveLength(1);
  });

  it('a full photo does not stop a placed sticker from being moved', () => {
    const scene = ready();
    for (let i = 0; i < 8; i++) drag(scene, 'sticker-estrella', { x: 560 + i * 10, y: 300 });
    const s = h.stickers[0]!;
    s.emit(ObjectEvents.StickerGrab, s, ptr(560, 300));
    scene.input.emit('pointerup', ptr(700, 500));
    expect(scene.getComposition().stickers).toHaveLength(8);
  });

  it('reports the placed stickers and the jar to the e2e hook', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', SHEET_MID);
    expect(info(scene)).toMatchObject({ stickerCount: 1, holding: false });
    expect(scene.getE2EUi().points).toMatchObject({ 'sticker:0': { x: 640, y: 360 } });
    expect(scene.getE2EUi().points.jar).toBeDefined();
    expect(scene.getE2EUi().points.photo).toEqual(SHEET_MID);
  });

  it('shutdown destroys the tray, the tabs and every sticker, and stops listening', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', SHEET_MID);
    tray().emit(ObjectEvents.TrayStickerGrab, 'sticker-corazon', ptr(80, 300));
    scene.events.emit('shutdown');
    expect(h.trays.every((t) => t.destroyed)).toBe(true);
    expect(h.tabs.every((t) => t.destroyed)).toBe(true);
    expect(h.stickers.every((s) => s.destroyed)).toBe(true);
    const input = scene.input as unknown as { count(e: string): number };
    expect(input.count('pointerup')).toBe(0);
    expect(input.count('pointermove')).toBe(0);
  });

  it('init clears the stickers of a previous visit', () => {
    const scene = ready();
    drag(scene, 'sticker-estrella', SHEET_MID);
    scene.events.emit('shutdown');
    scene.init();
    scene.create();
    expect(scene.getComposition().stickers).toHaveLength(0);
  });
});


// ---- F19.3: the transformation into a keychain ----
const save = () => button('Guardar').emit(ObjectEvents.ButtonClick);
const phaseOf = (s: Scene) => info(s).keychainPhase;

describe('PhotoMode: Guardar turns the cat into a keychain (F19.3)', () => {
  it('starts the transformation with the recipe of what is on the table, and plays the shutter', () => {
    const scene = open({ rating: { points: 90, stars: 4, breakdown: [] } });
    save();
    expect(scene.played).toContain('sfx-shutter');
    expect(h.transformations).toHaveLength(1);
    expect(h.transformations[0]!.options.recipe).toMatchObject({
      catId: catalog.cats[0]!.id, catName: 'Luna', outfit: { sweater: sweater.id }, pose: 'pose-sentadito', stars: 4,
      photo: { background: 'bg-cuadriculado', frame: 'frame-polaroid', stickers: [] },
    });
    expect(info(scene).photoBusy).toBe(true);
    expect(h.composePhoto).not.toHaveBeenCalled();
  });

  it('keeps the dyes of the worn items in the recipe and leaves the rest out', () => {
    const scene = new PhotoMode() as unknown as Scene;
    scene.registry.set(RegistryKeys.Catalog, catalog);
    scene.registry.set(RegistryKeys.Anchors, anchors);
    scene.registry.set(RegistryKeys.Progress, emptyProgress(0));
    scene.registry.set('catId', catalog.cats[0]!.id);
    scene.registry.set('catName', 'Luna');
    scene.registry.set('outfit', { sweater: sweater.id });
    scene.registry.set('itemDye', { [sweater.id]: 'rosa', 'not-worn': 'lila' });
    scene.init();
    scene.create();
    save();
    expect(h.transformations[0]!.options.recipe.itemDye).toEqual({ [sweater.id]: 'rosa' });
  });

  it('without a rating the keychain is the plain 1 star one', () => {
    open();
    save();
    expect(h.transformations[0]!.options.recipe.stars).toBe(1);
  });

  it('reports the phases as they go by, in the hook', () => {
    const scene = open();
    expect(phaseOf(scene)).toBeNull();
    save();
    const t = h.transformations[0]!;
    for (const phase of ['oven', 'turn', 'varnish', 'hardware', 'swing', 'package']) {
      t.options.onPhase(phase);
      expect(phaseOf(scene)).toBe(phase);
    }
  });

  it('after the transformation hangs the keychain on a card, saves the PNG of the packaging and says it is ready', async () => {
    const scene = open({ rating: { points: 90, stars: 5, breakdown: [] } });
    save();
    h.transformations[0]!.finish();
    await vi.waitFor(() => expect(h.savePhoto).toHaveBeenCalledTimes(1));
    expect(h.savePhoto.mock.calls[0]).toEqual([expect.objectContaining({ touch: false }), 'data:image/png;base64,PKG', photoFileName('Luna')]);
    const card = h.cards[0]!;
    expect(card.rose).toBe(true);
    expect(card.ops.some((o) => o.texture === 'ui-keychain-package-card')).toBe(true);
    expect(card.ops.find((o) => o.kind === 'text' && o.text === 'Luna')).toBeDefined();
    expect(card.ops.some((o) => o.kind === 'keychain')).toBe(true);
    expect(h.transformations[0]!.hung).toMatchObject({ at: { x: 640, y: 80 } });
    expect(h.composePackage).toHaveBeenCalledTimes(1);
    expect(h.composePhoto).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(phaseOf(scene)).toBe('ready'));
    expect(info(scene)).toMatchObject({ photos: 1, lastPhoto: photoFileName('Luna') });
    // The ready title says it (a persistent line over the buttons), so no bubble covers it.
    expect(h.bubbles).toHaveLength(0);
    expect(card.tappable).toBe(true);
  });

  it('a tap while it runs skips to the end, but not the very first moment (the same tap that pressed the button)', () => {
    const scene = open();
    save();
    const t = h.transformations[0]!;
    scene.input.emit('pointerdown');
    expect(t.skips).toBe(0);
    run(scene);
    scene.input.emit('pointerdown');
    expect(t.skips).toBe(1);
  });

  it('a tap on the packaging puts it away: the cat comes back, the hook is cleared and Guardar works again', async () => {
    const scene = open();
    save();
    h.transformations[0]!.finish();
    await vi.waitFor(() => expect(phaseOf(scene)).toBe('ready'));
    h.cards[0]!.emit(ObjectEvents.PackageTap);
    await vi.waitFor(() => expect(h.cards[0]!.destroyed).toBe(true));
    expect(h.cards[0]!.sunk).toBe(true);
    expect(h.transformations[0]).toMatchObject({ destroyed: true, restored: true, faded: true });
    expect(phaseOf(scene)).toBeNull();
    expect(info(scene).photoBusy).toBe(false);
    save();
    expect(h.transformations).toHaveLength(2);
  });

  it('ignores a second Guardar while the transformation goes', () => {
    open();
    save();
    save();
    expect(h.transformations).toHaveLength(1);
  });

  it('leaving in the middle destroys the transformation and its card and leaves no tweens or timers', async () => {
    const scene = open();
    save();
    h.transformations[0]!.finish();
    await vi.waitFor(() => expect(h.cards).toHaveLength(1));
    scene.events.emit('shutdown');
    expect(h.transformations[0]!.destroyed).toBe(true);
    expect(h.cards[0]!.destroyed).toBe(true);
    expect(scene.activeTweens).toHaveLength(0);
    expect(scene.time.delayed).toHaveLength(0);
    expect(scene.input.count('pointerdown')).toBe(0);
  });

  it('does not hang a card or save anything when the scene was left before it ended', async () => {
    const scene = open();
    save();
    scene.events.emit('shutdown');
    h.transformations[0]!.finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.cards).toHaveLength(0);
    expect(h.savePhoto).not.toHaveBeenCalled();
  });
});

// ---- F19.4: the packaging, [Colgarlo] and the hanging of the recipe ----
const finishSave = async (scene: Scene) => {
  save();
  h.transformations[0]!.finish();
  await vi.waitFor(() => expect(phaseOf(scene)).toBe('ready'));
};
const progressOf = (scene: Scene) => scene.registry.get(RegistryKeys.Progress) as import('../../src/game/domain/types').Progress;
const rating = (stars: number) => ({ rating: { points: 90, stars, breakdown: [] } });
const catId = catalog.cats[0]!.id;
const oldRecipe = (stars: 1 | 2 | 3 | 4 | 5) => ({
  catId, catName: 'Luna', outfit: {}, itemDye: {}, pose: 'pose-sentadito', stars, photo: { background: 'bg-cuadriculado', frame: 'frame-polaroid', stickers: [] }, createdAt: '2026-01-01T00:00:00.000Z',
});

describe('PhotoMode: the keychain is ready (F19.4)', () => {
  it('shows "Llavero listo!" with [Colgarlo] once the packaging is saved, and sends the thumbnail flying', async () => {
    const scene = open();
    expect(h.buttons.find((b) => b.label === 'Colgarlo')).toBeUndefined();
    await finishSave(scene);
    expect(button('Colgarlo')).toBeDefined();
    expect(button('Guardar').visible).toBe(false);
    expect(scene.made.some((m) => m.kind === 'text' && (m.args as unknown[])[2] === 'Llavero listo!')).toBe(true);
    expect(h.cards[0]!.flew).toBe(true);
  });

  it('[Colgarlo] with no keychain on that hook hangs the recipe and goes to the hanger with the hang to fly', async () => {
    const scene = open(rating(4));
    await finishSave(scene);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    expect(progressOf(scene).keychains[catId]).toMatchObject({ catId, catName: 'Luna', stars: 4 });
    expect(h.sheets).toHaveLength(0);
    expect(h.go).toHaveBeenCalledWith(scene, 'hang', { from: 'DressUp', tab: 'colgador', hang: catId });
  });

  it('K2: with an empty hook the keychain is hung as soon as the packaging is ready, whatever way the player leaves', async () => {
    const scene = open(rating(4));
    expect(progressOf(scene).keychains[catId]).toBeUndefined();
    await finishSave(scene);
    expect(progressOf(scene).keychains[catId]).toMatchObject({ catId, stars: 4 });
    // A tap on the card puts it away and the keychain stays hung.
    h.cards[0]!.emit(ObjectEvents.PackageTap);
    await vi.waitFor(() => expect(h.cards[0]!.destroyed).toBe(true));
    expect(progressOf(scene).keychains[catId]).toMatchObject({ catId, stars: 4 });
  });

  it('K2: [Colgarlo] after the automatic hanging only goes to see it: no question and the same keychain', async () => {
    const scene = open(rating(4));
    await finishSave(scene);
    const hung = progressOf(scene).keychains[catId];
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    expect(h.sheets).toHaveLength(0);
    expect(progressOf(scene).keychains[catId]).toBe(hung);
    expect(h.go).toHaveBeenCalledWith(scene, 'hang', { from: 'DressUp', tab: 'colgador', hang: catId });
  });

  it('K2: with a taken hook nothing is written until the player answers', async () => {
    const scene = open(rating(5), undefined, { ...emptyProgress(0), keychains: { [catId]: oldRecipe(3) } });
    await finishSave(scene);
    expect(progressOf(scene).keychains[catId]!.stars).toBe(3);
    h.cards[0]!.emit(ObjectEvents.PackageTap);
    await vi.waitFor(() => expect(h.cards[0]!.destroyed).toBe(true));
    expect(progressOf(scene).keychains[catId]!.stars).toBe(3);
  });

  it('K2: after putting the packaging away, saving the same cat again asks (the hook is taken by the first one)', async () => {
    const scene = open(rating(4));
    await finishSave(scene);
    h.cards[0]!.emit(ObjectEvents.PackageTap);
    await vi.waitFor(() => expect(h.cards[0]!.destroyed).toBe(true));
    save();
    h.transformations[1]!.finish();
    await vi.waitFor(() => expect(h.cards).toHaveLength(2));
    await vi.waitFor(() => expect(button('Colgarlo')).toBeDefined());
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    expect(h.sheets).toHaveLength(1);
  });

  it('presses [Colgarlo] only once', async () => {
    const scene = open();
    await finishSave(scene);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    expect(h.go).toHaveBeenCalledTimes(1);
  });

  it('asks before replacing, showing both ratings and keeping the one with more stars as the highlighted answer', async () => {
    const scene = open(rating(2), undefined, { ...emptyProgress(0), keychains: { [catId]: oldRecipe(4) } });
    await finishSave(scene);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    expect(h.go).not.toHaveBeenCalled();
    expect(h.sheets[0]!.options).toEqual({ catName: 'Luna', before: 4, now: 2, replaceByDefault: false });
    expect(progressOf(scene).keychains[catId]!.stars).toBe(4);
  });

  it('with the same stars the new one is the highlighted answer', async () => {
    const scene = open(rating(4), undefined, { ...emptyProgress(0), keychains: { [catId]: oldRecipe(4) } });
    await finishSave(scene);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    expect(h.sheets[0]!.options.replaceByDefault).toBe(true);
  });

  it('[Cambiarlo] replaces the keychain and goes to the hanger to fly it', async () => {
    const scene = open(rating(2), undefined, { ...emptyProgress(0), keychains: { [catId]: oldRecipe(4) } });
    await finishSave(scene);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    h.sheets[0]!.emit(ObjectEvents.SheetConfirm);
    expect(progressOf(scene).keychains[catId]!.stars).toBe(2);
    expect(h.go).toHaveBeenCalledWith(scene, 'hang', { from: 'DressUp', tab: 'colgador', hang: catId });
  });

  it('[Dejar el anterior] keeps the old keychain and opens the hanger without flying anything', async () => {
    const scene = open(rating(5), undefined, { ...emptyProgress(0), keychains: { [catId]: oldRecipe(3) } });
    await finishSave(scene);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    h.sheets[0]!.emit(ObjectEvents.SheetKeep);
    expect(progressOf(scene).keychains[catId]!.stars).toBe(3);
    expect(h.go).toHaveBeenCalledWith(scene, 'hang', { from: 'DressUp', tab: 'colgador' });
  });

  it('a tap outside the question closes it and nothing is hung; [Colgarlo] asks again', async () => {
    const scene = open(rating(5), undefined, { ...emptyProgress(0), keychains: { [catId]: oldRecipe(3) } });
    await finishSave(scene);
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    h.sheets[0]!.emit(ObjectEvents.SheetCancel);
    expect(h.sheets[0]!.closed).toBe(true);
    expect(h.go).not.toHaveBeenCalled();
    button('Colgarlo').emit(ObjectEvents.ButtonClick);
    expect(h.sheets).toHaveLength(2);
  });

  it('putting the packaging away takes [Colgarlo] away and brings [Guardar] back', async () => {
    const scene = open();
    await finishSave(scene);
    const hangButton = button('Colgarlo');
    h.cards[0]!.emit(ObjectEvents.PackageTap);
    await vi.waitFor(() => expect(h.cards[0]!.destroyed).toBe(true));
    expect(hangButton.destroyed).toBe(true);
    expect(button('Guardar').visible).toBe(true);
  });

  it('shutdown destroys the question and [Colgarlo]', async () => {
    const scene = open(rating(5), undefined, { ...emptyProgress(0), keychains: { [catId]: oldRecipe(3) } });
    await finishSave(scene);
    const hangButton = button('Colgarlo');
    hangButton.emit(ObjectEvents.ButtonClick);
    scene.events.emit('shutdown');
    expect(h.sheets[0]!.destroyed).toBe(true);
    expect(hangButton.destroyed).toBe(true);
  });
});
