import Phaser from 'phaser';
import { Fonts, GAME_HEIGHT, GAME_WIDTH, Ink, MEOW_KEYS, ObjectEvents, RegistryKeys, SceneKeys, SfxKeys, TextureKeys } from '../constants';
import type { GameData } from '../data/schema';
import { photoUnlocks, type PhotoUnlocks } from '../domain/album';
import { photoLines } from '../domain/copy';
import { catPose } from '../domain/catPose';
import type { Expression } from '../domain/expressions';
import { sheetOps, SHEET_LAYOUT, starRow, type SheetOp } from '../domain/photoSheet';
import { isInsideDropZone } from '../domain/dropZone';
import { getLayers } from '../domain/outfit';
import { initialPieces, photoFileName, resolveLook, stickerLimit, type PhotoLook } from '../domain/photo';
import {
  PHOTO_SIZE, canPick, composition, pieceStates, placeSticker, removeSticker, stickerAngle, type PhotoComposition,
} from '../domain/photoComposition';
import { emptyProgress } from '../domain/progress';
import type { AnchorsDef, ItemDye, PhotoPiece, PhotoPose, PlacedSticker, Point, Progress, Rect } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { Cat } from '../objects/Cat';
import { MotionButton } from '../objects/MotionButton';
import { MuteButton } from '../objects/MuteButton';
import { Tabs, type TabDef } from '../objects/Tabs';
import { Card } from '../objects/kit/Card';
import { PaperBackground } from '../objects/kit/PaperBackground';
import { SpeechBubble } from '../objects/kit/SpeechBubble';
import { composePhoto } from '../objects/photo';
import { PhotoTray, type TrayKind } from '../objects/photomode/PhotoTray';
import { Sticker } from '../objects/photomode/Sticker';
import { tabIconKey } from '../objects/tabIcons';
import { touchEnv } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { getDye } from '../plugins/DyePlugin';
import { savePhoto } from '../systems/download';
import { go } from '../systems/navigate';
import { profileOf } from '../systems/motion';
import { readSession } from '../systems/sessionStore';
import { applyLift, liftOffset } from '../systems/touch';
import { enterKind, transitionIn } from '../systems/transitions';

/** The composition of the photo is the art of the pieces (540 x 675): its middle, and where the cat stands inside its window. */
const SHEET = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
const CAT = { feetY: SHEET.y + SHEET_LAYOUT.cat.feetY, size: SHEET_LAYOUT.cat.size };
const POSE_PREFIX = 'pose-';
/** The photo, in the coordinates of the screen. */
const PHOTO_RECT: Rect = { x: SHEET.x - PHOTO_SIZE.width / 2, y: SHEET.y - PHOTO_SIZE.height / 2, width: PHOTO_SIZE.width, height: PHOTO_SIZE.height };
/** The paper panel on the left with the tabs and the tray, and the jar on the right: dropping a sticker on either takes it off the photo. */
const PANEL: Rect = { x: 25, y: 150, width: 330, height: 510 };
const TRAY_ORIGIN: Point = { x: 46, y: 215 };
const JAR = { x: 1090, y: 330, width: 122, height: 150 };
const JAR_ZONE: Rect = { x: JAR.x - JAR.width / 2, y: JAR.y - JAR.height / 2, width: JAR.width, height: JAR.height };
const DEPTH = { sheet: 2, cat: 3, placed: 4, panel: 5, tray: 6, buttons: 20, held: 40 };
const KINDS: readonly TrayKind[] = ['backgrounds', 'frames', 'poses', 'stickers'];
const TAB_COLORS = { backgrounds: 'cielo', frames: 'rosa', poses: 'lila', stickers: 'sol' } as const;

/** What is being carried: a sticker in the hand of one pointer. */
interface Held {
  sticker: Sticker;
  id: string;
  pointerId: number;
  lift: Point;
  target: Point;
  /** Where it was on the photo when it was picked up again (null when it came off the sheet). */
  from: PlacedSticker | null;
  overRemove: boolean;
}

/**
 * PhotoMode (S6, ADR 0019): the scrapbook table. It gets the look and the rating from the Showcase (or from the session when it
 * comes without them), stands the cat on a background inside a frame, and saves the picture with [Guardar] (a download on a computer,
 * the share sheet on a phone). On the left, a paper panel with four tabs (backgrounds, frames, poses and stickers) and a tray of
 * buttons; what is still locked shows as a sketch with a hint of how to get it. Stickers are pulled off the sheet onto the photo and
 * back to the sheet or the jar to take them off. `getComposition()` is what is on the table, for the saved photo and the keychain.
 */
export class PhotoMode extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private look!: PhotoLook;
  private itemDye: ItemDye = {};
  private catalog!: GameData;
  private anchors!: AnchorsDef;
  private unlocks!: PhotoUnlocks;
  private background: string | null = null;
  private frame: string | null = null;
  private pose: string | null = null;
  private kind: TrayKind = 'backgrounds';
  /** The stickers on the photo, in z order, and their objects (same order). */
  private stickerData: PlacedSticker[] = [];
  private placed: Sticker[] = [];
  private held: Held | null = null;
  private cat!: Cat;
  private sheet!: Phaser.GameObjects.Container;
  private bgLayer!: Phaser.GameObjects.Container;
  private frameLayer!: Phaser.GameObjects.Container;
  /** The art showing now in each layer (the one a swap takes away). */
  private shown: { bg: Phaser.GameObjects.Image | null; frame: Phaser.GameObjects.Image | null } = { bg: null, frame: null };
  private panel!: Card;
  private tabs!: Tabs;
  private tray!: PhotoTray;
  private jar!: Phaser.GameObjects.Image;
  private count!: Phaser.GameObjects.Text;
  private zzz: Phaser.GameObjects.Image | null = null;
  private save!: Button;
  private keep!: Button;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private bubble: SpeechBubble | null = null;
  private ready = false;
  private leaving = false;
  private photoBusy = false;
  private photos = 0;
  private lastPhoto: string | null = null;
  private readonly toastLog: string[] = [];
  private readonly onMove = (pointer: Phaser.Input.Pointer) => this.moveHeld(pointer);
  private readonly onUp = (pointer: Phaser.Input.Pointer) => this.releaseHeld(pointer);

  constructor() {
    super(SceneKeys.PhotoMode);
  }

  init(data?: unknown) {
    this.enter = enterKind(data as { transition?: unknown });
    const session = readSession(this.registry);
    this.look = resolveLook(data, session, this.registry.get(RegistryKeys.LastRating));
    this.itemDye = { ...session.itemDye };
    this.ready = false;
    this.leaving = false;
    this.photoBusy = false;
    this.photos = 0;
    this.lastPhoto = null;
    this.bubble = null;
    this.kind = 'backgrounds';
    this.stickerData = [];
    this.placed = [];
    this.held = null;
    this.zzz = null;
    this.toastLog.length = 0;
  }

  create() {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    this.anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const progress = (this.registry.get(RegistryKeys.Progress) as Progress | undefined) ?? emptyProgress(0);
    this.unlocks = photoUnlocks(progress, this.catalog);
    const start = initialPieces(this.catalog.photo, this.unlocks);
    this.background = start.background;
    this.frame = start.frame;
    this.pose = start.pose;
    const def = this.catalog.cats.find((c) => c.id === this.look.catId) ?? this.catalog.cats[0]!;
    this.look = { ...this.look, catId: def.id, catName: this.look.catName || def.name };

    new PaperBackground(this).setDepth(-1);
    // The picture: background, the cat standing in the window, the frame on top and the name by hand in the margin.
    this.bgLayer = this.add.container(0, 0);
    this.frameLayer = this.add.container(0, 0);
    this.shown = { bg: this.pieceImage(this.catalog.photo.backgrounds, this.background), frame: this.pieceImage(this.catalog.photo.frames, this.frame) };
    if (this.shown.bg) this.bgLayer.add(this.shown.bg);
    if (this.shown.frame) this.frameLayer.add(this.shown.frame);
    this.sheet = this.add.container(SHEET.x, SHEET.y, [this.bgLayer, this.frameLayer, ...this.margin()]).setDepth(DEPTH.sheet);
    this.cat = new Cat(this, SHEET.x, CAT.feetY, def, this.anchors, CAT.size).setDepth(DEPTH.cat);
    this.cat.setOutfit(getLayers(this.look.outfit, this.catalog.clothes));
    void this.dyeWorn();
    this.cat.appear();
    this.dropIn();
    this.buildTable();

    this.save = new Button(this, 1090, 560, photoLines.save, { pill: 'primary', width: 260, height: 76, fontSize: 36 }).setDepth(DEPTH.buttons);
    this.save.on(ObjectEvents.ButtonClick, () => void this.snap());
    this.keep = new Button(this, 1090, 652, photoLines.keepDressing, { pill: 'secondary', width: 260, height: 76, fontSize: 28 }).setDepth(DEPTH.buttons);
    this.keep.on(ObjectEvents.ButtonClick, () => this.leave());
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 56).setDepth(50);

    this.input.on('pointermove', this.onMove);
    this.input.on('pointerup', this.onUp);
    this.time.delayedCall(450, () => {
      this.ready = true;
      getAudio(this).playRandom(MEOW_KEYS);
      this.strike();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
    transitionIn(this, this.enter, () => undefined);
  }

  update(_time: number, delta: number) {
    this.held?.sticker.follow(this.held.target, delta);
  }

  /** The dyes of the worn items (the session keeps them): the photo and the keychain show the colors the cat was dressed with. */
  private async dyeWorn() {
    const dyed = Object.entries(this.itemDye).filter(([itemId]) => this.cat.wornIds.includes(itemId));
    if (dyed.length === 0) return;
    const dye = getDye(this);
    await Promise.all(dyed.map(async ([itemId, dyeId]) => {
      try {
        const key = await dye.ensure(itemId, dyeId);
        if (this.scene.isActive()) this.cat.setItemTexture(itemId, key);
      } catch {
        // A dye that cannot be made leaves the plain item.
      }
    }));
  }

  /** What is written in the bottom margin of the frame, as the saved picture has it: the name, the stars and "Xoxo, mau!". */
  private margin(): Phaser.GameObjects.GameObject[] {
    const { name, stars, signature } = SHEET_LAYOUT;
    const out: Phaser.GameObjects.GameObject[] = [];
    const text = (value: string, x: number, y: number, size: number, maxWidth: number, angle = 0) => {
      const t = this.add.text(x, y, value, { fontFamily: Fonts.Voice, fontSize: `${size}px`, color: Ink.tinta, padding: { x: 4, y: 8 } }).setOrigin(0.5).setAngle(angle);
      if (t.width > maxWidth) t.setScale(maxWidth / t.width);
      return t;
    };
    out.push(text(this.look.catName, name.x, name.y, name.fontSize, name.maxWidth));
    if (this.look.rating) {
      for (const slot of starRow(this.look.rating.stars)) {
        const star = this.add.image(slot.x, stars.y, slot.filled ? stars.filled : stars.empty);
        star.setScale(stars.size / star.height).setAlpha(slot.filled ? 1 : stars.emptyAlpha);
        out.push(star);
      }
    }
    out.push(text(photoLines.signature(this.catalog.brand), signature.x, signature.y, signature.fontSize, signature.maxWidth, signature.angle));
    return out;
  }

  /** The art of the picked piece, 1:1 around the middle of the sheet; null when nothing is unlocked. */
  private pieceImage(list: readonly { id: string; texture: string }[], id: string | null): Phaser.GameObjects.Image | null {
    const piece = list.find((p) => p.id === id);
    return piece ? this.add.image(0, 0, piece.texture) : null;
  }

  /** The panel on the left (tabs and tray) and the jar on the right, with the count of stickers under it. */
  private buildTable() {
    const mid = { x: PANEL.x + PANEL.width / 2, y: PANEL.y + PANEL.height / 2 };
    this.panel = new Card(this, mid.x, mid.y, { width: PANEL.width, height: PANEL.height, tilt: -0.6 }).setDepth(DEPTH.panel);
    const defs: TabDef[] = KINDS.map((k) => ({ id: k, label: photoLines.tabs[k], icon: tabIconKey(`photo-${k}`), color: TAB_COLORS[k] }));
    // The tabs hang from the top edge of the panel, centered on it (the row is 4 tabs of 54 px with 10 px between them).
    this.tabs = new Tabs(this, mid.x - 123, PANEL.y - 54, defs, { style: 'index' }).setDepth(DEPTH.tray);
    this.tabs.select(this.kind, true);
    this.tabs.on(ObjectEvents.TabSelect, (id: string) => this.showKind(id as TrayKind));
    this.tray = new PhotoTray(this, TRAY_ORIGIN.x, TRAY_ORIGIN.y).setDepth(DEPTH.tray);
    this.tray.on(ObjectEvents.TrayPick, (kind: TrayKind, id: string) => this.pick(kind, id));
    this.tray.on(ObjectEvents.TrayLocked, (kind: TrayKind, id: string) => this.hintFor(kind, id));
    this.tray.on(ObjectEvents.TrayStickerGrab, (id: string, pointer: Phaser.Input.Pointer) => this.grabFromTray(id, pointer));
    this.showKind(this.kind);

    this.jar = this.add.image(JAR.x, JAR.y, 'photo-jar').setDisplaySize(JAR.width, JAR.height).setDepth(DEPTH.tray);
    this.count = this.add.text(JAR.x, JAR.y + JAR.height / 2 + 24, '', { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '32px', color: Ink.tinta, padding: { x: 4, y: 6 } }).setOrigin(0.5).setDepth(DEPTH.tray);
    this.updateCount(false);
  }

  private listOf(kind: TrayKind): readonly (PhotoPiece | PhotoPose)[] {
    return this.catalog.photo[kind];
  }

  private openOf(kind: TrayKind): ReadonlySet<string> {
    return this.unlocks[kind];
  }

  private chosen(kind: TrayKind): string | null {
    return kind === 'backgrounds' ? this.background : kind === 'frames' ? this.frame : kind === 'poses' ? this.pose : null;
  }

  /** Turns the tray to a kind of piece. */
  private showKind(kind: TrayKind) {
    this.kind = kind;
    const open = this.openOf(kind);
    const list = this.listOf(kind);
    const entries = pieceStates(list, open).map((s, i) => ({ ...s, name: list[i]!.name, texture: (list[i] as PhotoPiece).texture }));
    for (const k of KINDS) this.tray.select(k, this.chosen(k));
    this.tray.show(kind, entries);
    this.tray.select(kind, this.chosen(kind));
  }

  /** A piece of the tray was chosen: it goes onto the table, if it is unlocked. */
  private pick(kind: TrayKind, id: string) {
    if (!this.ready || this.leaving || kind === 'stickers') return;
    if (!canPick(id, this.listOf(kind), this.openOf(kind))) return this.hintFor(kind, id);
    if (this.chosen(kind) === id) return;
    const audio = getAudio(this);
    if (kind === 'backgrounds') {
      this.background = id;
      this.swapPiece('bg', this.catalog.photo.backgrounds, id);
      audio.play(SfxKeys.Paper);
    } else if (kind === 'frames') {
      this.frame = id;
      this.swapPiece('frame', this.catalog.photo.frames, id);
      audio.play(SfxKeys.Paper);
    } else {
      this.pose = id;
      this.strike();
      audio.play(SfxKeys.Drop);
    }
    this.tray.select(kind, id);
  }

  /** "Pasar la hoja" (the old background slides off and turns away) or a pop (the new frame lands over the old one). */
  private swapPiece(which: 'bg' | 'frame', list: readonly { id: string; texture: string }[], id: string) {
    const next = this.pieceImage(list, id);
    if (!next) return;
    const p = profileOf(this);
    const old = this.shown[which];
    this.shown[which] = next;
    const turn = which === 'bg';
    if (turn) this.bgLayer.addAt(next, 0);
    else this.frameLayer.add(next);
    if (old) {
      const gone = () => old.destroy();
      if (p.reduced || !turn) this.tweens.add({ targets: old, alpha: 0, duration: p.reduced ? 250 : 200, delay: turn ? 0 : 120, onComplete: gone });
      else this.tweens.add({ targets: old, x: -90, angle: -7, alpha: 0, duration: 340, ease: 'Sine.easeIn', onComplete: gone });
    }
    if (!turn) {
      next.setAlpha(0);
      if (!p.reduced) next.setScale(1.05);
      this.tweens.add({ targets: next, alpha: 1, scale: 1, duration: p.reduced ? 250 : 280, ease: p.ease('Back.easeOut') });
    }
  }

  /** A locked piece shows how to get it. */
  private hintFor(kind: TrayKind, id: string) {
    if (!this.ready || this.leaving) return;
    const piece = this.listOf(kind).find((p) => p.id === id);
    if (!piece || this.openOf(kind).has(id)) return;
    this.toast(photoLines.unlockHint(piece.unlock, (setId) => this.catalog.sets.find((s) => s.id === setId)?.name));
  }

  /** The cat takes the pose that is chosen (with a little squash), and the dormilón gets its "zzz". */
  private strike() {
    const key = this.poseKey();
    this.cat.applyPose(key);
    this.cat.squash();
    this.showZzz(key === 'dormilon');
  }

  /** The sleeping pose brings its "zzz" next to the head; any other pose sends it away. */
  private showZzz(on: boolean) {
    const p = profileOf(this);
    const old = this.zzz;
    if (!on) {
      this.zzz = null;
      if (old) this.tweens.add({ targets: old, alpha: 0, duration: 200, onComplete: () => old.destroy() });
      return;
    }
    if (old) return;
    const zzz = this.add.image(SHEET.x + SHEET_LAYOUT.zzz.x, SHEET.y + SHEET_LAYOUT.zzz.y, SHEET_LAYOUT.zzz.texture).setDisplaySize(SHEET_LAYOUT.zzz.size, SHEET_LAYOUT.zzz.size).setDepth(DEPTH.placed).setAlpha(0);
    this.zzz = zzz;
    this.tweens.add({ targets: zzz, alpha: 1, duration: 250 });
    if (p.loops) this.tweens.add({ targets: zzz, y: zzz.y - 12, angle: 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ---- Stickers -------------------------------------------------------------

  /** Pulls a sticker off the sheet: it peels, grows and goes to the finger. */
  private grabFromTray(id: string, pointer: Phaser.Input.Pointer) {
    if (!this.ready || this.leaving || this.held) return;
    const piece = this.catalog.photo.stickers.find((s) => s.id === id);
    if (!piece || !canPick(id, this.catalog.photo.stickers, this.unlocks.stickers)) return;
    const sticker = new Sticker(this, pointer.x, pointer.y, id, piece.texture);
    sticker.on(ObjectEvents.StickerGrab, (s: Sticker, p: Phaser.Input.Pointer) => this.grabPlaced(s, p));
    this.hold(sticker, pointer, null);
  }

  /** Picks a sticker of the photo up again. */
  private grabPlaced(sticker: Sticker, pointer: Phaser.Input.Pointer) {
    if (!this.ready || this.leaving || this.held) return;
    const i = this.placed.indexOf(sticker);
    if (i < 0) return;
    const from = this.stickerData[i]!;
    this.stickerData = removeSticker(this.stickerData, i);
    this.placed.splice(i, 1);
    this.hold(sticker, pointer, from);
    this.updateCount(false);
  }

  private hold(sticker: Sticker, pointer: Phaser.Input.Pointer, from: PlacedSticker | null) {
    // With a finger the sticker is held above it so the finger does not cover it (ADR 0014).
    const lift = liftOffset(pointer.wasTouch, touchEnv().scale);
    const target = applyLift(pointer, lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    sticker.setDepth(DEPTH.held);
    sticker.peel();
    this.held = { sticker, id: sticker.id, pointerId: pointer.id, lift, target, from, overRemove: false };
    getAudio(this).play(SfxKeys.Peel);
  }

  private moveHeld(pointer: Phaser.Input.Pointer) {
    const h = this.held;
    if (!h || pointer.id !== h.pointerId) return;
    h.target = applyLift(pointer, h.lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    const over = this.isRemoveZone(h.target);
    if (over !== h.overRemove) {
      h.overRemove = over;
      this.wobbleJar(over);
    }
  }

  private isRemoveZone(point: Point): boolean {
    return isInsideDropZone(point, PANEL, 0) || isInsideDropZone(point, JAR_ZONE, 16);
  }

  /** The jar leans toward a sticker that is over it (or over the sheet) and calms down when it leaves. */
  private wobbleJar(on: boolean) {
    const p = profileOf(this);
    this.tweens.killTweensOf(this.jar);
    this.tweens.add({ targets: this.jar, scale: on ? (JAR.width / this.jar.width) * (1 + 0.1 * p.squash) : JAR.width / this.jar.width, angle: on && !p.reduced ? -5 : 0, duration: 140, ease: p.ease('Back.easeOut') });
  }

  /** Let go: it settles on the photo, goes back to where it was, or pops away (into the jar or off the table). */
  private releaseHeld(pointer: Phaser.Input.Pointer) {
    const h = this.held;
    if (!h || pointer.id !== h.pointerId) return;
    this.held = null;
    if (h.overRemove) this.wobbleJar(false);
    const point = applyLift(pointer, h.lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    const audio = getAudio(this);
    const onPhoto = isInsideDropZone(point, PHOTO_RECT, 0);
    const remove = this.isRemoveZone(point);
    if (remove || (!onPhoto && !h.from)) {
      h.sticker.poof();
      audio.play(remove ? SfxKeys.Click : SfxKeys.Grab);
      this.updateCount(h.from !== null);
      return;
    }
    // A sticker picked up again that is let go off the photo goes back to where it was.
    const back = !onPhoto && h.from ? h.from : null;
    const local = back ? { id: h.id, x: back.x, y: back.y } : { id: h.id, x: point.x - SHEET.x, y: point.y - SHEET.y };
    // A sticker picked up again already had its place, so a full photo does not stop it from being put down.
    const result = placeSticker(this.stickerData, local, back ? back.angle : stickerAngle(Math.random));
    if (!result.placed) {
      h.sticker.poof();
      this.toast(photoLines.full);
      return;
    }
    this.stickerData = result.stickers;
    const at = result.stickers[result.stickers.length - 1]!;
    this.placed.push(h.sticker);
    h.sticker.setDepth(DEPTH.placed);
    h.sticker.settle({ x: SHEET.x + at.x, y: SHEET.y + at.y }, at.angle);
    h.sticker.enableGrab();
    audio.play(SfxKeys.Drop);
    this.sparkle(SHEET.x + at.x, SHEET.y + at.y);
    this.updateCount(true);
  }

  /** A few stars jump out of the spot where a sticker lands (none with reduced motion). */
  private sparkle(x: number, y: number) {
    const p = profileOf(this);
    if (p.reduced) return;
    const n = p.count(5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const star = this.add.image(x, y, TextureKeys.Sparkle).setScale(0.35).setDepth(DEPTH.held).setAlpha(0.95);
      this.tweens.add({
        targets: star, x: x + Math.cos(a) * 62, y: y + Math.sin(a) * 62, alpha: 0, scale: 0.1, angle: 90, duration: 420, ease: 'Sine.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  /** "3 / 8" under the jar; it pops when the number changes. */
  private updateCount(pop: boolean) {
    const limit = stickerLimit(this.stickerData.length);
    this.count.setText(`${this.stickerData.length} / ${limit.max}`);
    if (!pop) return;
    const p = profileOf(this);
    this.tweens.killTweensOf(this.count);
    this.tweens.add({ targets: this.count, scale: { from: 1 + 0.25 * p.squash, to: 1 }, duration: 220, ease: p.ease('Back.easeOut') });
  }

  /** What is on the table now: the pieces, the pose and the stickers (in z order, in the coordinates of the sheet, whose middle is 0, 0). */
  getComposition(): PhotoComposition {
    return composition({ background: this.background, frame: this.frame, pose: this.pose, stickers: this.stickerData });
  }

  /** The sheet drops in like a photo on the table and settles (Back.easeOut); with reduced motion it only fades in. */
  private dropIn() {
    const p = profileOf(this);
    this.sheet.setAlpha(0);
    if (p.reduced) {
      this.tweens.add({ targets: this.sheet, alpha: 1, duration: 250 });
      return;
    }
    const y = this.sheet.y;
    this.sheet.setY(y - 60);
    this.tweens.add({ targets: this.sheet, alpha: 1, y, duration: 420, ease: p.ease('Back.easeOut') });
  }

  /** The picture that is saved: what is on the table (pieces, pose, stickers), the name, the stars and the signature of the brand. */
  private sheetOps(): SheetOp[] {
    return sheetOps({
      photo: this.catalog.photo, composition: this.getComposition(), catName: this.look.catName,
      stars: this.look.rating?.stars ?? null, signature: photoLines.signature(this.catalog.brand),
    });
  }

  /** The face of the chosen pose: the picture shows the cat as the table does. */
  private poseExpression(): Expression {
    return catPose(this.poseKey())?.expression ?? 'normal';
  }

  private poseKey(): string {
    return (this.pose ?? '').slice(POSE_PREFIX.length);
  }

  /** [Guardar]: shutter, a soft flash, the composition of the table is saved as a PNG and a bubble says so. The cat does not change. */
  private async snap() {
    if (this.photoBusy || this.leaving) return;
    this.photoBusy = true;
    getAudio(this).play(SfxKeys.Shutter);
    this.flash();
    // Let the flash start before the (short) work of drawing the picture.
    await new Promise<void>((resolve) => this.time.delayedCall(140, resolve));
    if (!this.scene.isActive()) return;
    const url = await composePhoto(this, this.cat, this.sheetOps(), this.poseExpression());
    if (!this.scene.isActive()) return;
    const file = photoFileName(this.look.catName);
    // A computer downloads the PNG; a phone opens the share sheet (ADR 0014).
    await savePhoto<HTMLAnchorElement>({ doc: { createElement: () => document.createElement('a'), body: document.body }, nav: navigator, touch: touchEnv().touch }, url, file);
    if (!this.scene.isActive()) return;
    this.photos++;
    this.lastPhoto = file;
    this.photoBusy = false;
    this.toast(photoLines.saved);
  }

  /** A camera flash: white that fades in fast and out softly (a soft cream fade with reduced motion). */
  private flash() {
    const f = profileOf(this).flash;
    const slow = profileOf(this).reduced;
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, f.color, 0).setDepth(90);
    this.tweens.chain({
      targets: veil,
      tweens: [
        { alpha: f.alpha, duration: slow ? 160 : 70, ease: 'Sine.easeOut' },
        { alpha: 0, duration: slow ? 500 : 420, ease: 'Sine.easeIn', onComplete: () => veil.destroy() },
      ],
    });
  }

  private toast(text: string) {
    this.toastLog.push(text);
    this.bubble?.destroy();
    const bubble = new SpeechBubble(this, 1090, 500, text).setDepth(60);
    this.bubble = bubble;
    this.time.delayedCall(1800, () => {
      bubble.destroy();
      if (this.bubble === bubble) this.bubble = null;
    });
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    go(this, 'keepDressing');
  }

  private cleanUp() {
    this.input.off('pointermove', this.onMove);
    this.input.off('pointerup', this.onUp);
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.bubble?.destroy();
    this.bubble = null;
    this.held?.sticker.destroy();
    this.held = null;
    for (const s of this.placed) s.destroy();
    this.placed = [];
    this.zzz?.destroy();
    this.zzz = null;
    this.tray?.destroy();
    this.tabs?.destroy();
    this.panel?.destroy();
    this.jar?.destroy();
    this.count?.destroy();
    this.cat?.destroy();
    this.save?.destroy();
    this.keep?.destroy();
    this.mute?.destroy();
    this.motion?.destroy();
    this.sheet?.destroy();
  }

  getE2EUi(): UiState {
    const points: Record<string, Point> = { photo: { ...SHEET }, jar: { x: JAR.x, y: JAR.y }, panel: { x: PANEL.x + PANEL.width / 2, y: PANEL.y + PANEL.height / 2 } };
    for (const [id, p] of Object.entries(this.tabs.getTabPositions())) points[`tab:${id}`] = p;
    for (const [id, p] of Object.entries(this.tray.getCellCenters())) points[`cell:${id}`] = p;
    this.stickerData.forEach((s, i) => { points[`sticker:${i}`] = { x: SHEET.x + s.x, y: SHEET.y + s.y }; });
    const unlocked = Object.fromEntries(KINDS.map((k) => [k, [...this.unlocks[k]]]));
    return {
      ready: this.ready && !this.leaving,
      buttons: { save: this.save.getCenter(), keep: this.keep.getCenter(), mute: this.mute.getCenter(), motion: this.motion.getCenter() },
      points,
      info: {
        catId: this.look.catId, catName: this.look.catName, layers: this.cat.wornIds, stars: this.look.rating?.stars ?? null,
        background: this.background, frame: this.frame, pose: this.pose,
        tab: this.kind, unlocked, composition: this.getComposition(),
        stickerCount: this.stickerData.length, stickerLimit: stickerLimit(this.stickerData.length).max, holding: this.held !== null,
        photos: this.photos, lastPhoto: this.lastPhoto, photoBusy: this.photoBusy, toasts: [...this.toastLog],
      },
    };
  }
}
