import Phaser from 'phaser';
import { Fonts, GAME_HEIGHT, GAME_WIDTH, Ink, MEOW_KEYS, ObjectEvents, RegistryKeys, SceneKeys, SfxKeys, TextureKeys, colorToNumber } from '../constants';
import type { GameData } from '../data/schema';
import { albumHasNews, completion, hasAlbumProgress } from '../domain/album';
import { albumLines } from '../domain/copy';
import { albumArgs } from '../domain/flow';
import { emptyProgress } from '../domain/progress';
import type { AnchorsDef, Progress } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { Cat } from '../objects/Cat';
import { MuteButton } from '../objects/MuteButton';
import { MotionButton } from '../objects/MotionButton';
import { FullscreenButton } from '../objects/FullscreenButton';
import { PaperBackground } from '../objects/kit/PaperBackground';
import { addInkClouds, addInkSun } from '../objects/streetInk';
import { Cooldown } from '../domain/cooldown';
import { getAudio } from '../plugins/AudioPlugin';
import { go } from '../systems/navigate';
import { profileOf } from '../systems/motion';
import { enterKind, transitionIn } from '../systems/transitions';

const LOGO = 'Viste Lagato';
const ink = (token: keyof typeof Ink) => colorToNumber(Ink[token]);
const LOGO_Y = 190;
const PEEK = [
  { catIndex: 0, x: 215, scale: 330, rise: 120 },
  { catIndex: 5, x: 1065, scale: 330, rise: 120 },
  { catIndex: 2, x: 640, scale: 300, rise: 200 },
];
/** Y of the feet of a peeking cat when it is hidden and when it has popped up. */
const HIDDEN_DY = 330;
const HILL_TOP = 600;
const ALBUM_Y = 472;

/** Title: the notebook cover. Grid paper, the bouncing logo, kittens peeking from behind a drawn hill, "Iniciar" and, once there is progress, "Mi álbum" with its percentage. */
export class Title extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private start!: Button;
  private album: Button | null = null;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private fullscreen: FullscreenButton | null = null;
  private ready = false;
  private cats: Cat[] = [];

  constructor() {
    super(SceneKeys.Title);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.ready = false;
    this.cats = [];
    this.album = null;
  }

  create() {
    const catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    this.cameras.main.setBackgroundColor(Ink.cremaPapel);
    new PaperBackground(this).setDepth(-10);
    addInkSun(this, 112, 104).setDepth(-5);
    addInkClouds(this, [
      { x: 1060, y: 230, scale: 0.8, speed: 14 }, { x: 900, y: 300, scale: 0.55, speed: 9 }, { x: 1200, y: 360, scale: 0.6, speed: 11 },
    ]).forEach((c) => c.setDepth(-4));
    this.drawHill();

    // Kittens peek from behind the hill, one after another.
    PEEK.forEach((p, i) => {
      const def = catalog.cats[p.catIndex % catalog.cats.length];
      const feetY = HILL_TOP + p.rise;
      const cat = new Cat(this, p.x, feetY + HIDDEN_DY, def, anchors, p.scale).setDepth(5);
      this.cats.push(cat);
      this.time.delayedCall(900 + i * 350, () => {
        this.tweens.add({
          targets: cat, y: feetY, duration: 650, ease: profileOf(this).ease('Back.easeOut'),
          onComplete: () => this.wave(cat, i),
        });
        cat.react('drop');
      });
      this.makePettable(cat, p.scale);
    });

    this.createLogo(catalog);
    this.createStart();
    this.createAlbum(catalog);
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 56).setDepth(50);
    this.fullscreen = FullscreenButton.create(this, GAME_WIDTH - 200, 56);
    this.fullscreen?.setDepth(50);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.start?.destroy();
      this.album?.destroy();
      this.mute?.destroy();
      this.motion?.destroy();
      this.fullscreen?.destroy();
      for (const c of this.cats) c.destroy();
      this.tweens.killAll();
    });
    transitionIn(this, this.enter);
  }

  /** A pat on a peeking kitten: happy face, squash and a meow. */
  private makePettable(cat: Cat, size: number) {
    const zone = this.add.zone(cat.x, HILL_TOP - size * 0.12, size * 0.55, size * 0.5).setDepth(6).setInteractive({ useHandCursor: true });
    // Hearing a meow on every pat tires the ear: the pat answers at most every 0.5 s, the meow at most every 1.2 s.
    const pat = new Cooldown(500);
    const meow = new Cooldown(1200);
    zone.on('pointerdown', () => {
      if (!pat.try(this.time.now)) return;
      cat.react('drop');
      cat.squash();
      cat.wiggle();
      if (meow.try(this.time.now)) getAudio(this).playRandom(MEOW_KEYS);
      getAudio(this).play(SfxKeys.Purr, { volume: 0.7 });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => zone.destroy());
  }

  /** The kitten sways a little once it is up. */
  private wave(cat: Cat, i: number) {
    if (!profileOf(this).loops) return;
    this.tweens.add({ targets: cat, angle: { from: -2, to: 2 }, duration: 1400 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** A hill drawn in ink: `durazno` paper with a thick `tinta` edge, and pencil strokes on the grass. */
  private drawHill() {
    const g = this.add.graphics().setDepth(1);
    const edge: Phaser.Math.Vector2[] = [];
    for (let x = -20; x <= GAME_WIDTH + 20; x += 20) edge.push(new Phaser.Math.Vector2(x, HILL_TOP + Math.sin(x / 150) * 14 + Math.sin(x / 61) * 4));
    g.fillStyle(ink('durazno'), 1).fillPoints([...edge, new Phaser.Math.Vector2(GAME_WIDTH + 20, GAME_HEIGHT), new Phaser.Math.Vector2(-20, GAME_HEIGHT)], true);
    g.lineStyle(6, ink('tinta'), 1).strokePoints(edge, false);
    g.lineStyle(3, ink('lineaLapiz'), 0.8);
    for (let x = 30; x < GAME_WIDTH; x += 96) g.lineBetween(x, HILL_TOP + 70 + (x % 3) * 12, x + 30, HILL_TOP + 62 + (x % 3) * 12);
  }

  /** "Viste Lagato" letter by letter: each one drops in and bounces, then the whole logo waves. A `sol` highlighter is drawn under it. */
  private createLogo(catalog: GameData) {
    const p = profileOf(this);
    const letters = [...LOGO].map((ch) =>
      this.add
        .text(0, 0, ch, { fontFamily: Fonts.Title, fontSize: '132px', color: Ink.tinta, fontStyle: '900', padding: { x: 6, y: 18 } })
        .setOrigin(0.5)
        .setDepth(20),
    );
    const gap = 2;
    const widths = letters.map((t, i) => (LOGO[i] === ' ' ? 44 : t.width));
    const total = widths.reduce((a, w) => a + w + gap, -gap);
    const highlight = this.add.graphics().setDepth(19).setAlpha(0);
    highlight.lineStyle(26, ink('sol'), 0.85).lineBetween(GAME_WIDTH / 2 - total / 2 + 10, LOGO_Y + 62, GAME_WIDTH / 2 + total / 2 - 10, LOGO_Y + 66);
    this.tweens.add({ targets: highlight, alpha: 1, delay: 1100, duration: 400 });
    let x = GAME_WIDTH / 2 - total / 2;
    letters.forEach((t, i) => {
      const cx = x + widths[i] / 2;
      x += widths[i] + gap;
      if (LOGO[i] === ' ') {
        t.setVisible(false);
        return;
      }
      t.setPosition(cx, -200).setScale(1 - 0.2 * p.squash, 1 + 0.25 * p.squash).setAngle(Phaser.Math.Between(-18, 18) * p.shake);
      this.tweens.add({
        targets: t, y: LOGO_Y, scaleX: 1, scaleY: 1, angle: 0, delay: 150 + i * 90, duration: 750, ease: p.ease('Bounce.easeOut'),
        onStart: () => getAudio(this).play(SfxKeys.Drop, { volume: 0.35 }),
        onComplete: () => p.loops && this.tweens.add({ targets: t, y: LOGO_Y - 9, duration: 900, delay: i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      });
    });
    // The shop's sign (brand.json) is the line under the logo, written by hand.
    const sub = this.add
      .text(GAME_WIDTH / 2, LOGO_Y + 112, catalog.brand.shopSign, { fontFamily: Fonts.Voice, fontSize: '40px', color: Ink.mutedTexto, fontStyle: '700', padding: { x: 4, y: 10 } })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: sub, alpha: 1, y: LOGO_Y + 104, delay: 1500, duration: 400, ease: p.ease('Back.easeOut') });
    // A few ink sparkles around the logo.
    this.add
      .particles(GAME_WIDTH / 2, LOGO_Y, TextureKeys.InkSparkle, {
        x: { min: -400, max: 400 }, y: { min: -100, max: 90 }, lifespan: 1400, frequency: p.every(380), scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 }, speed: 12,
      })
      .setDepth(21);
  }

  private createStart() {
    const cx = GAME_WIDTH / 2;
    const cy = 374;
    const halo = this.add.graphics().setDepth(19);
    halo.fillStyle(ink('sol'), 0.55).fillRoundedRect(-170, -56, 340, 112, 56).setPosition(cx, cy).setAlpha(0);
    this.start = new Button(this, cx, cy, 'Iniciar', { pill: 'primary', width: 300, height: 94, fontSize: 56 }).setDepth(30).setScale(0);
    this.start.input!.enabled = false;
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: this.start, scale: 1, duration: 450, ease: profileOf(this).ease('Back.easeOut'),
        onComplete: () => {
          this.start.input!.enabled = true;
          this.ready = true;
          if (profileOf(this).loops) this.tweens.add({ targets: halo, alpha: { from: 0.2, to: 0.9 }, scale: { from: 1, to: 1.12 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          else this.tweens.add({ targets: halo, alpha: 0.6, duration: 400 });
        },
      });
    });
    this.start.on(ObjectEvents.ButtonClick, () => {
      if (!this.ready) return;
      this.ready = false;
      // The first click also unlocks the browser audio (ADR 0009).
      getAudio(this).playRandom(MEOW_KEYS);
      if (profileOf(this).shake > 0) this.start.scene.tweens.add({ targets: this.start, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 2 });
      this.time.delayedCall(260, () => go(this, 'start'));
    });
  }

  /** "Mi álbum · 37%": the secondary button, only once the player has something in the album. It pops in after "Iniciar". */
  private createAlbum(catalog: GameData) {
    const progress = (this.registry.get(RegistryKeys.Progress) as Progress | undefined) ?? emptyProgress(0);
    if (!hasAlbumProgress(progress, catalog)) return;
    const label = albumLines.titleButton(completion(progress, catalog).pct);
    const button = new Button(this, GAME_WIDTH / 2, ALBUM_Y, label, { pill: 'secondary', width: 330, height: 74, fontSize: 36 }).setDepth(30).setScale(0);
    this.album = button;
    button.input!.enabled = false;
    // The same ✦ as the notebook stamp: something new inside.
    if (albumHasNews(progress, catalog)) {
      const spark = this.add.image(GAME_WIDTH / 2 + 150, ALBUM_Y - 30, TextureKeys.InkSparkle).setDepth(31).setAlpha(0);
      this.tweens.add({ targets: spark, alpha: 1, delay: 2200, duration: 300 });
    }
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: button, scale: 1, duration: 400, ease: profileOf(this).ease('Back.easeOut'),
        onComplete: () => { button.input!.enabled = true; },
      });
    });
    button.on(ObjectEvents.ButtonClick, () => {
      if (!this.ready) return;
      this.ready = false;
      this.time.delayedCall(120, () => go(this, 'album', albumArgs(SceneKeys.Title)));
    });
  }

  getE2EUi(): UiState {
    return { ready: this.ready, buttons: { start: this.start.getCenter(), ...(this.album ? { album: this.album.getCenter() } : {}), mute: this.mute.getCenter(), motion: this.motion.getCenter(), ...(this.fullscreen ? { fullscreen: this.fullscreen.getCenter() } : {}) }, points: {}, info: {} };
  }
}
