import Phaser from 'phaser';
import { FONT_FAMILY, GAME_WIDTH, MEOW_KEYS, ObjectEvents, Palette, RegistryKeys, SceneKeys, SfxKeys, TextureKeys } from '../constants';
import type { Catalog } from '../data/schema';
import { showcaseTitle } from '../domain/copy';
import { photoFileName } from '../domain/photo';
import type { Expression } from '../domain/expressions';
import { getLayers } from '../domain/outfit';
import type { AnchorsDef } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { Cat } from '../objects/Cat';
import { takePhoto } from '../objects/photo';
import { MuteButton } from '../objects/MuteButton';
import { MotionButton } from '../objects/MotionButton';
import { SecretCounter } from '../objects/SecretCounter';
import { getSave } from '../plugins/SavePlugin';
import { drawRoom } from '../objects/room';
import { hex } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { downloadDataUrl } from '../systems/download';
import { go } from '../systems/navigate';
import { readSession } from '../systems/sessionStore';
import { profileOf } from '../systems/motion';
import { enterKind, transitionIn } from '../systems/transitions';

const CAT_X = GAME_WIDTH / 2;
const CAT_FEET_Y = 612;
const CAT_SIZE = 560;
/** How long each pose (happy, in love) lasts. */
const POSE_MS = 1500;

/**
 * Showcase: the cat poses in front of the mirror with sparkles, alternating happy and in love, under a
 * "¡Qué lindo look, {nombre}!" plaque. From here the player keeps dressing (the outfit is kept) or changes cat.
 * The middle of the bottom row has the "Descargar foto" button (F7).
 */
export class Showcase extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private cat!: Cat;
  private anchors!: AnchorsDef;
  private catName = '';
  private photo!: Button;
  private photoBusy = false;
  /** Photos downloaded in this visit and the name of the last file (for the e2e hook). */
  private photos = 0;
  private lastPhoto: string | null = null;
  private keep!: Button;
  private change!: Button;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private counter!: SecretCounter;
  private hearts!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pose: Expression = 'feliz';
  private title = '';
  private ready = false;
  private leaving = false;

  constructor() {
    super(SceneKeys.Showcase);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.pose = 'feliz';
    this.ready = false;
    this.leaving = false;
    this.photoBusy = false;
    this.photos = 0;
    this.lastPhoto = null;
  }

  create() {
    const catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const session = readSession(this.registry);
    const def = catalog.cats.find((c) => c.id === session.catId) ?? catalog.cats[0];
    this.anchors = anchors;
    this.catName = session.catName || def.name;
    this.title = showcaseTitle(this.catName);

    drawRoom(this, CAT_X, CAT_FEET_Y);
    // A warm glow behind the cat that breathes.
    const glow = this.add.graphics().setDepth(1);
    glow.fillStyle(hex('mantequilla'), 0.5).fillEllipse(CAT_X, 380, 430, 520);
    if (profileOf(this).loops) this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 1 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.cat = new Cat(this, CAT_X, CAT_FEET_Y, def, anchors, CAT_SIZE).setDepth(5);
    this.cat.setOutfit(getLayers(session.outfit, catalog.clothes));
    this.cat.appear();
    this.createPlaque();

    // Sparkles drift around the cat, and hearts pop up when it is in love.
    this.add
      .particles(CAT_X, 340, TextureKeys.Sparkle, {
        x: { min: -230, max: 230 }, y: { min: -200, max: 250 }, lifespan: 1100, frequency: profileOf(this).every(110), quantity: 1,
        scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 }, speed: 18,
      })
      .setDepth(8);
    this.hearts = this.add
      .particles(0, 0, TextureKeys.Heart, {
        emitting: false, speed: { min: 60, max: 200 }, angle: { min: -120, max: -60 }, gravityY: -40,
        lifespan: { min: 900, max: 1400 }, scale: { start: 1.3, end: 0.4 }, alpha: { start: 1, end: 0 }, rotate: { min: -30, max: 30 },
      })
      .setDepth(9);

    this.keep = new Button(this, 230, 646, 'Seguir vistiendo', { width: 330, height: 84, fontSize: 34 }).setDepth(20);
    this.keep.on(ObjectEvents.ButtonClick, () => this.leave('keepDressing'));
    this.change = new Button(this, GAME_WIDTH - 230, 646, 'Cambiar de gato', { width: 330, height: 84, fontSize: 34, tone: 'lavanda' }).setDepth(20);
    this.change.on(ObjectEvents.ButtonClick, () => this.leave('change'));
    this.photo = new Button(this, GAME_WIDTH / 2, 646, 'Descargar foto', { width: 330, height: 84, fontSize: 34, tone: 'menta' }).setDepth(20);
    this.photo.on(ObjectEvents.ButtonClick, () => void this.snap());
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 56).setDepth(50);
    this.counter = new SecretCounter(this, 140, 50).setDepth(50);
    this.counter.setCount(getSave(this).secrets.length, catalog.combos.length);

    this.time.delayedCall(450, () => {
      this.ready = true;
      getAudio(this).playRandom(MEOW_KEYS);
      this.strike('feliz');
      this.time.addEvent({ delay: POSE_MS, loop: true, callback: () => this.strike(this.pose === 'feliz' ? 'amor' : 'feliz') });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cat?.destroy();
      this.keep?.destroy();
      this.photo?.destroy();
      this.change?.destroy();
      this.mute?.destroy();
      this.motion?.destroy();
      this.counter?.destroy();
      this.tweens.killAll();
    });
    transitionIn(this, this.enter);
  }

  /** The plaque with the praise, which drops in over the top of the mirror. */
  private createPlaque() {
    const text = this.add
      .text(0, -3, this.title, { fontFamily: FONT_FAMILY, fontSize: '52px', color: '#FFFFFF', fontStyle: '700', stroke: Palette.rosa600, strokeThickness: 8, padding: { x: 4, y: 8 } })
      .setOrigin(0.5);
    const width = text.width + 90;
    const g = this.add.graphics();
    g.fillStyle(hex('rosa600'), 0.2).fillRoundedRect(-width / 2 + 3, -40 + 10, width, 88, 44);
    g.fillStyle(hex('rosa600'), 1).fillRoundedRect(-width / 2, -40 + 8, width, 80, 40);
    g.fillStyle(hex('rosa400'), 1).fillRoundedRect(-width / 2, -40, width, 80, 40);
    g.fillStyle(0xffffff, 0.55).fillRoundedRect(-width / 2 + 28, -31, width * 0.3, 9, 4);
    const plaque = this.add.container(CAT_X, -90, [g, text]).setDepth(30);
    this.tweens.add({ targets: plaque, y: 76, duration: 700, delay: 200, ease: profileOf(this).ease('Bounce.easeOut') });
    if (profileOf(this).loops) this.tweens.add({ targets: plaque, angle: { from: -1, to: 1 }, duration: 1600, delay: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Switches the pose with a little hop; love also sends hearts up. */
  private strike(pose: Expression) {
    if (!this.scene.isActive()) return;
    this.pose = pose;
    this.cat.hold(pose);
    this.cat.squash();
    if (pose === 'amor') {
      this.hearts.explode(profileOf(this).count(8), CAT_X, 250);
      getAudio(this).play(SfxKeys.Purr, { volume: 0.7 });
    }
  }

  /** "Descargar foto": shutter, a soft white flash, the cat poses, and the PNG is saved. */
  private async snap() {
    if (this.photoBusy || this.leaving) return;
    this.photoBusy = true;
    getAudio(this).play(SfxKeys.Shutter);
    this.strike('amor');
    this.flash();
    // Let the flash start before the (short) work of drawing the picture.
    await new Promise<void>((resolve) => this.time.delayedCall(140, resolve));
    if (!this.scene.isActive()) return;
    const url = await takePhoto(this, this.cat, this.anchors, this.catName);
    if (!this.scene.isActive()) return;
    const file = photoFileName(this.catName);
    downloadDataUrl<HTMLAnchorElement>({ createElement: () => document.createElement('a'), body: document.body }, url, file);
    this.photos++;
    this.lastPhoto = file;
    this.toast('¡Foto lista!');
    this.photoBusy = false;
  }

  /** A camera flash: white that fades in fast and out softly. With reduced motion, a soft cream fade (alpha at most 0.3). */
  private flash() {
    const f = profileOf(this).flash;
    const slow = profileOf(this).reduced;
    const veil = this.add.rectangle(GAME_WIDTH / 2, 360, GAME_WIDTH, 720, f.color, 0).setDepth(90);
    this.tweens.chain({
      targets: veil,
      tweens: [
        { alpha: f.alpha, duration: slow ? 160 : 70, ease: 'Sine.easeOut' },
        { alpha: 0, duration: slow ? 500 : 420, ease: 'Sine.easeIn', onComplete: () => veil.destroy() },
      ],
    });
  }

  /** A small bubble that pops over the photo button and floats away. */
  private toast(text: string) {
    const label = this.add
      .text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: '34px', color: Palette.texto, fontStyle: '600', padding: { x: 4, y: 8 } })
      .setOrigin(0.5);
    const g = this.add.graphics();
    const w = label.width + 56;
    g.fillStyle(hex('rosa600'), 0.18).fillRoundedRect(-w / 2 + 2, -26 + 8, w, 56, 28);
    g.fillStyle(hex('menta'), 1).fillRoundedRect(-w / 2, -26, w, 56, 28);
    g.lineStyle(4, hex('rosa200'), 1).strokeRoundedRect(-w / 2, -26, w, 56, 28);
    const bubble = this.add.container(GAME_WIDTH / 2, 566, [g, label]).setDepth(60).setScale(0).setAlpha(0);
    this.tweens.chain({
      targets: bubble,
      tweens: [
        { scale: 1, alpha: 1, duration: 260, ease: profileOf(this).ease('Back.easeOut') },
        { y: 556, duration: 1100, ease: 'Sine.easeInOut' },
        { alpha: 0, y: 530, duration: 300, ease: 'Sine.easeIn', onComplete: () => bubble.destroy() },
      ],
    });
  }

  private leave(action: 'keepDressing' | 'change') {
    if (this.leaving) return;
    this.leaving = true;
    go(this, action);
  }

  getE2EUi(): UiState {
    return {
      ready: this.ready && !this.leaving,
      buttons: { keep: this.keep.getCenter(), photo: this.photo.getCenter(), change: this.change.getCenter(), mute: this.mute.getCenter(), motion: this.motion.getCenter() },
      points: {},
      info: { title: this.title, pose: this.pose, layers: this.cat.wornIds, photos: this.photos, lastPhoto: this.lastPhoto, photoBusy: this.photoBusy, secrets: this.counter.text },
    };
  }
}
