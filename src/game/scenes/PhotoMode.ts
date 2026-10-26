import Phaser from 'phaser';
import { Fonts, GAME_HEIGHT, GAME_WIDTH, Ink, MEOW_KEYS, ObjectEvents, RegistryKeys, SceneKeys, SfxKeys } from '../constants';
import type { GameData } from '../data/schema';
import { photoUnlocks } from '../domain/album';
import { photoLines } from '../domain/copy';
import { getLayers } from '../domain/outfit';
import { initialPieces, photoFileName, resolveLook, type PhotoLook } from '../domain/photo';
import { POSES } from '../domain/pose';
import { emptyProgress } from '../domain/progress';
import type { AnchorsDef, Progress } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { Cat } from '../objects/Cat';
import { MotionButton } from '../objects/MotionButton';
import { MuteButton } from '../objects/MuteButton';
import { PaperBackground } from '../objects/kit/PaperBackground';
import { SpeechBubble } from '../objects/kit/SpeechBubble';
import { PHOTO_POSE, takePhoto } from '../objects/photo';
import { touchEnv } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { savePhoto } from '../systems/download';
import { go } from '../systems/navigate';
import { profileOf } from '../systems/motion';
import { readSession } from '../systems/sessionStore';
import { enterKind, transitionIn } from '../systems/transitions';

/** The composition of the photo is the art of the pieces (540 x 675): its middle, and where the cat stands inside its window. */
const SHEET = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
const CAT = { feetY: 560, size: 430 };
/** The name goes in the bottom margin of the frame (y 567 to 660 of its art, centered on the sheet). */
const NAME_Y = SHEET.y + 276;
const POSE_PREFIX = 'pose-';

/**
 * PhotoMode (S6, ADR 0019): the scrapbook table. It gets the look and the rating from the Showcase (or from the session when it
 * comes without them), stands the cat on a background inside a frame, and saves the picture with [Guardar] (a download on a computer,
 * the share sheet on a phone). The trays of backgrounds, frames, poses and stickers are added to this scene by F18.3 and F18.4.
 */
export class PhotoMode extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private look!: PhotoLook;
  private catalog!: GameData;
  private anchors!: AnchorsDef;
  private background: string | null = null;
  private frame: string | null = null;
  private pose: string | null = null;
  private cat!: Cat;
  private sheet!: Phaser.GameObjects.Container;
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

  constructor() {
    super(SceneKeys.PhotoMode);
  }

  init(data?: unknown) {
    this.enter = enterKind(data as { transition?: unknown });
    this.look = resolveLook(data, readSession(this.registry), this.registry.get(RegistryKeys.LastRating));
    this.ready = false;
    this.leaving = false;
    this.photoBusy = false;
    this.photos = 0;
    this.lastPhoto = null;
    this.bubble = null;
    this.toastLog.length = 0;
  }

  create() {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    this.anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const progress = (this.registry.get(RegistryKeys.Progress) as Progress | undefined) ?? emptyProgress(0);
    const start = initialPieces(this.catalog.photo, photoUnlocks(progress, this.catalog));
    this.background = start.background;
    this.frame = start.frame;
    this.pose = start.pose;
    const def = this.catalog.cats.find((c) => c.id === this.look.catId) ?? this.catalog.cats[0]!;
    this.look = { ...this.look, catId: def.id, catName: this.look.catName || def.name };

    new PaperBackground(this).setDepth(-1);
    // The picture: background, the cat standing in the window, the frame on top and the name by hand in the margin.
    const bg = this.pieceImage(this.catalog.photo.backgrounds, this.background);
    const frame = this.pieceImage(this.catalog.photo.frames, this.frame);
    const name = this.add.text(0, NAME_Y - SHEET.y, this.look.catName, { fontFamily: Fonts.Voice, fontSize: '44px', color: Ink.tinta, padding: { x: 4, y: 8 } }).setOrigin(0.5);
    this.sheet = this.add.container(SHEET.x, SHEET.y, [...(bg ? [bg] : []), ...(frame ? [frame] : []), name]).setDepth(2);
    this.cat = new Cat(this, SHEET.x, CAT.feetY, def, this.anchors, CAT.size).setDepth(3);
    this.cat.setOutfit(getLayers(this.look.outfit, this.catalog.clothes));
    this.cat.appear();
    this.dropIn();

    this.save = new Button(this, 1040, 560, photoLines.save, { pill: 'primary', width: 320, height: 76, fontSize: 36 }).setDepth(20);
    this.save.on(ObjectEvents.ButtonClick, () => void this.snap());
    this.keep = new Button(this, 1040, 652, photoLines.keepDressing, { pill: 'secondary', width: 320, height: 76, fontSize: 32 }).setDepth(20);
    this.keep.on(ObjectEvents.ButtonClick, () => this.leave());
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 56).setDepth(50);

    this.time.delayedCall(450, () => {
      this.ready = true;
      getAudio(this).playRandom(MEOW_KEYS);
      this.strike();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
    transitionIn(this, this.enter, () => undefined);
  }

  /** The art of the picked piece, 1:1 around the middle of the sheet; null when nothing is unlocked. */
  private pieceImage(list: readonly { id: string; texture: string }[], id: string | null): Phaser.GameObjects.Image | null {
    const piece = list.find((p) => p.id === id);
    return piece ? this.add.image(0, 0, piece.texture) : null;
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

  /** The cat takes the face of its pose, with a little squash. */
  private strike() {
    const pose = POSES.find((p) => `${POSE_PREFIX}${p.id}` === this.pose) ?? POSES[0]!;
    this.cat.hold(pose.expression);
    this.cat.squash();
  }

  /** [Guardar]: shutter, a soft flash, the cat poses (in love, at rest), the PNG is saved and a bubble says so. */
  private async snap() {
    if (this.photoBusy || this.leaving) return;
    this.photoBusy = true;
    getAudio(this).play(SfxKeys.Shutter);
    this.cat.hold(PHOTO_POSE);
    this.flash();
    // Let the flash start before the (short) work of drawing the picture.
    await new Promise<void>((resolve) => this.time.delayedCall(140, resolve));
    if (!this.scene.isActive()) return;
    const url = await takePhoto(this, this.cat, this.anchors, this.look.catName, PHOTO_POSE);
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
    const bubble = new SpeechBubble(this, 1040, 500, text).setDepth(60);
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
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.bubble?.destroy();
    this.bubble = null;
    this.cat?.destroy();
    this.save?.destroy();
    this.keep?.destroy();
    this.mute?.destroy();
    this.motion?.destroy();
    this.sheet?.destroy();
  }

  getE2EUi(): UiState {
    return {
      ready: this.ready && !this.leaving,
      buttons: { save: this.save.getCenter(), keep: this.keep.getCenter(), mute: this.mute.getCenter(), motion: this.motion.getCenter() },
      points: {},
      info: {
        catId: this.look.catId, catName: this.look.catName, layers: this.cat.wornIds, stars: this.look.rating?.stars ?? null,
        background: this.background, frame: this.frame, pose: this.pose,
        photos: this.photos, lastPhoto: this.lastPhoto, photoBusy: this.photoBusy, toasts: [...this.toastLog],
      },
    };
  }
}
