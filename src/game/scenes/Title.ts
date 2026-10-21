import Phaser from 'phaser';
import { FONT_FAMILY, GAME_WIDTH, MEOW_KEYS, ObjectEvents, Palette, RegistryKeys, SceneKeys, SfxKeys, TextureKeys } from '../constants';
import type { Catalog } from '../data/schema';
import type { AnchorsDef } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { Cat } from '../objects/Cat';
import { MuteButton } from '../objects/MuteButton';
import { addClouds, addHills, addSky, addSun } from '../objects/scenery';
import { hex } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { go } from '../systems/navigate';
import { enterKind, transitionIn } from '../systems/transitions';

const LOGO = 'Viste Lagato';
const LETTER_COLORS = [Palette.rosa400, Palette.mantequilla, Palette.menta, Palette.lavanda, Palette.rosa200];
const LOGO_Y = 190;
const PEEK = [
  { catIndex: 0, x: 215, scale: 330, rise: 120 },
  { catIndex: 5, x: 1065, scale: 330, rise: 120 },
  { catIndex: 2, x: 640, scale: 300, rise: 80 },
];
/** Y of the feet of a peeking cat when it is hidden and when it has popped up. */
const HIDDEN_DY = 330;
const HILL_TOP = 600;

/** Title: sky with clouds, the bouncing logo, kittens peeking from behind the hills and the "Iniciar" button. */
export class Title extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private start!: Button;
  private mute!: MuteButton;
  private ready = false;
  private cats: Cat[] = [];

  constructor() {
    super(SceneKeys.Title);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.ready = false;
    this.cats = [];
  }

  create() {
    const catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    addSky(this);
    addSun(this, 1120, 96);
    addClouds(this, [
      { x: 150, y: 90, scale: 0.9, speed: 14 }, { x: 560, y: 250, scale: 0.6, speed: 9 },
      { x: 880, y: 150, scale: 1.1, speed: 18 }, { x: 1180, y: 330, scale: 0.7, speed: 11 },
    ]);
    addHills(this, HILL_TOP);

    // Kittens peek from behind the hill, one after another.
    PEEK.forEach((p, i) => {
      const def = catalog.cats[p.catIndex % catalog.cats.length];
      const feetY = HILL_TOP + p.rise;
      const cat = new Cat(this, p.x, feetY + HIDDEN_DY, def, anchors, p.scale).setDepth(5);
      this.cats.push(cat);
      this.time.delayedCall(900 + i * 350, () => {
        this.tweens.add({
          targets: cat, y: feetY, duration: 650, ease: 'Back.easeOut',
          onComplete: () => this.wave(cat, i),
        });
        cat.react('drop');
      });
      this.makePettable(cat, p.scale);
    });

    this.createLogo();
    this.createStart();
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.start?.destroy();
      this.mute?.destroy();
      for (const c of this.cats) c.destroy();
      this.tweens.killAll();
    });
    transitionIn(this, this.enter);
  }

  /** A pat on a peeking kitten: happy face, squash and a meow. */
  private makePettable(cat: Cat, size: number) {
    const zone = this.add.zone(cat.x, HILL_TOP - size * 0.12, size * 0.55, size * 0.5).setDepth(6).setInteractive({ useHandCursor: true });
    let last = 0;
    zone.on('pointerdown', () => {
      if (this.time.now - last < 500) return;
      last = this.time.now;
      cat.react('drop');
      cat.squash();
      cat.wiggle();
      getAudio(this).playRandom(MEOW_KEYS);
      getAudio(this).play(SfxKeys.Purr, { volume: 0.7 });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => zone.destroy());
  }

  /** The kitten sways a little once it is up. */
  private wave(cat: Cat, i: number) {
    this.tweens.add({ targets: cat, angle: { from: -2, to: 2 }, duration: 1400 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** "Viste Lagato" letter by letter: each one drops in and bounces, then the whole logo waves. */
  private createLogo() {
    const letters = [...LOGO].map((ch, i) =>
      this.add
        .text(0, 0, ch, { fontFamily: FONT_FAMILY, fontSize: '132px', color: LETTER_COLORS[i % LETTER_COLORS.length], fontStyle: '700', stroke: Palette.contorno, strokeThickness: 14, padding: { x: 6, y: 14 } })
        .setOrigin(0.5)
        .setShadow(0, 9, Palette.rosa600, 0, true, true)
        .setDepth(20),
    );
    const gap = -6;
    const widths = letters.map((t, i) => (LOGO[i] === ' ' ? 40 : t.width));
    const total = widths.reduce((a, w) => a + w + gap, -gap);
    let x = GAME_WIDTH / 2 - total / 2;
    letters.forEach((t, i) => {
      const cx = x + widths[i] / 2;
      x += widths[i] + gap;
      if (LOGO[i] === ' ') {
        t.setVisible(false);
        return;
      }
      t.setPosition(cx, -200).setScale(0.8, 1.25).setAngle(Phaser.Math.Between(-18, 18));
      this.tweens.add({
        targets: t, y: LOGO_Y, scaleX: 1, scaleY: 1, angle: 0, delay: 150 + i * 90, duration: 750, ease: 'Bounce.easeOut',
        onStart: () => getAudio(this).play(SfxKeys.Drop, { volume: 0.35 }),
        onComplete: () => this.tweens.add({ targets: t, y: LOGO_Y - 9, duration: 900, delay: i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      });
    });
    const sub = this.add
      .text(GAME_WIDTH / 2, LOGO_Y + 100, '¡Viste a tu gatito favorito!', { fontFamily: FONT_FAMILY, fontSize: '34px', color: Palette.texto, fontStyle: '600', stroke: '#FFFFFF', strokeThickness: 8 })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: sub, alpha: 1, y: LOGO_Y + 92, delay: 1500, duration: 400, ease: 'Back.easeOut' });
    // A few sparkles and hearts around the logo.
    this.add
      .particles(GAME_WIDTH / 2, LOGO_Y, TextureKeys.Sparkle, {
        x: { min: -380, max: 380 }, y: { min: -80, max: 90 }, lifespan: 1400, frequency: 380, scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, speed: 12,
      })
      .setDepth(19);
  }

  private createStart() {
    const cx = GAME_WIDTH / 2;
    const cy = 392;
    const halo = this.add.graphics().setDepth(19);
    halo.fillStyle(hex('rosa200'), 0.8).fillRoundedRect(-170, -62, 340, 124, 62).setPosition(cx, cy).setAlpha(0);
    this.start = new Button(this, cx, cy, 'Iniciar', { width: 300, height: 104, fontSize: 52 }).setDepth(30).setScale(0);
    this.start.input!.enabled = false;
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: this.start, scale: 1, duration: 450, ease: 'Back.easeOut',
        onComplete: () => {
          this.start.input!.enabled = true;
          this.ready = true;
          this.tweens.add({ targets: halo, alpha: { from: 0.2, to: 0.9 }, scale: { from: 1, to: 1.12 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
    });
    this.start.on(ObjectEvents.ButtonClick, () => {
      if (!this.ready) return;
      this.ready = false;
      // The first click also unlocks the browser audio (ADR 0009).
      getAudio(this).playRandom(MEOW_KEYS);
      this.start.scene.tweens.add({ targets: this.start, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: 2 });
      this.time.delayedCall(260, () => go(this, 'start'));
    });
  }

  getE2EUi(): UiState {
    return { ready: this.ready, buttons: { start: this.start.getCenter(), mute: this.mute.getCenter() }, points: {}, info: {} };
  }
}
