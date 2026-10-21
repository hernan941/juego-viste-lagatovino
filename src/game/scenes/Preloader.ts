import Phaser, { Scene } from 'phaser';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Palette, RegistryKeys, SceneKeys } from '../constants';
import anchorsJson from '../data/anchors.json';
import { buildAudioManifest, buildManifest } from '../data/assets';
import catsJson from '../data/cats.json';
import clothesJson from '../data/clothes.json';
import combosJson from '../data/combos.json';
import { assertCatalog, validateAnchors, type Catalog } from '../data/schema';
import { createParticleTextures } from '../objects/particleTextures';
import { createTabIconTextures } from '../objects/tabIcons';
import { chooseCat, emptySession } from '../domain/session';
import { yarnState, type YarnOptions } from '../domain/yarn';
import { e2eStart } from '../e2eHook';
import { hex } from '../objects/ui';
import { getSave } from '../plugins/SavePlugin';
import { go } from '../systems/navigate';
import { writeSession } from '../systems/sessionStore';
import { profileOf } from '../systems/motion';
import { enterKind, transitionIn, transitionTo } from '../systems/transitions';

/** The ball of yarn rolls from the left to the right and unwinds as the assets load. */
const YARN: YarnOptions = { x0: 340, x1: 940, y: GAME_HEIGHT / 2 + 40, amp: 16, waves: 3, radius: 50, minRadiusRatio: 0.55, segments: 48 };
/** Shown for at least this long, so the ball is seen rolling even when everything is cached. */
const MIN_MS = 900;


export class Preloader extends Scene {
  private enter: ReturnType<typeof enterKind> = null;
  private thread!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Container;
  private label!: Phaser.GameObjects.Text;
  private target = 0;
  private shown = 0;
  private loaded = false;
  private leaving = false;
  private elapsed = 0;

  constructor() {
    super(SceneKeys.Preloader);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.target = 0;
    this.shown = 0;
    this.loaded = false;
    this.leaving = false;
    this.elapsed = 0;
    this.cameras.main.setBackgroundColor(Palette.rosa50);
    this.thread = this.add.graphics();
    this.ball = this.createBall();
    this.label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'Cargando...', { fontFamily: FONT_FAMILY, fontSize: '40px', color: Palette.texto, fontStyle: '600' })
      .setOrigin(0.5);
    if (profileOf(this).loops) this.tweens.add({ targets: this.label, scale: { from: 1, to: 1.06 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.drawYarn(0);
    this.load.on('progress', (progress: number) => {
      this.target = progress;
    });
    transitionIn(this, this.enter);
  }

  /** A ball of yarn: rosa disc, outline and a few curved strands that turn with it. */
  private createBall(): Phaser.GameObjects.Container {
    const r = YARN.radius;
    const g = this.add.graphics();
    g.fillStyle(hex('rosa400'), 1).fillCircle(0, 0, r);
    // Strands wrapped around it: arcs of three tilted circles that cross inside the ball.
    g.lineStyle(5, hex('rosa600'), 1);
    for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const ox = Math.cos(a) * r * 1.15;
      const oy = Math.sin(a) * r * 1.15;
      g.beginPath().arc(ox, oy, r * 1.0, a + Math.PI - 0.75, a + Math.PI + 0.75).strokePath();
      g.beginPath().arc(-ox, -oy, r * 1.0, a - 0.75, a + 0.75).strokePath();
    }
    g.lineStyle(6, hex('contorno'), 1).strokeCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.5).fillEllipse(-r * 0.4, -r * 0.5, r * 0.4, r * 0.22);
    return this.add.container(YARN.x0, YARN.y, [g]);
  }

  /** Reduced motion (ADR 0013): the ball sits still and a progress bar shows how far the loading is. */
  private drawBar(progress: number) {
    const w = 440;
    const h = 26;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = YARN.y + 70;
    this.ball.setPosition(GAME_WIDTH / 2, YARN.y - 20).setRotation(0).setScale(1);
    this.thread.clear();
    this.thread.fillStyle(hex('rosa200'), 1).fillRoundedRect(x, y, w, h, h / 2);
    if (progress > 0.01) this.thread.fillStyle(hex('rosa400'), 1).fillRoundedRect(x, y, Math.max(h, w * progress), h, h / 2);
    this.thread.lineStyle(5, hex('contorno'), 1).strokeRoundedRect(x, y, w, h, h / 2);
  }

  private drawYarn(progress: number) {
    if (profileOf(this).reduced) {
      this.drawBar(progress);
      return;
    }
    const s = yarnState(progress, YARN);
    this.thread.clear();
    if (s.thread.length > 1) {
      for (const [width, color] of [[7, hex('contorno')], [3.5, hex('rosa400')]] as const) {
        this.thread.lineStyle(width, color, 1).beginPath().moveTo(s.thread[0].x, s.thread[0].y);
        for (const p of s.thread.slice(1)) this.thread.lineTo(p.x, p.y);
        this.thread.strokePath();
      }
    }
    this.ball.setPosition(s.ball.x, s.ball.y - 4).setRotation(s.ball.rotation).setScale(s.ball.radius / YARN.radius);
  }

  preload() {
    // Fail early on bad data (ADR 0010), then load exactly what the catalog lists.
    const catalog = assertCatalog({ cats: catsJson, clothes: clothesJson, combos: combosJson });
    const anchors = validateAnchors(anchorsJson);
    if (!anchors.ok) throw new Error(`Anclas inválidas:\n- ${anchors.errors.join('\n- ')}`);
    this.registry.set(RegistryKeys.Catalog, catalog);
    this.registry.set(RegistryKeys.Anchors, anchors.value);
    // The cat, name and outfit of the last visit (ADR 0004): CatSelect preselects them and DressUp wears them.
    getSave(this).restoreInto(catalog);
    for (const a of buildManifest(catalog.cats, catalog.clothes)) {
      this.load.svg(a.key, a.path, { width: a.size, height: a.size });
    }
    for (const a of buildAudioManifest()) this.load.audio(a.key, a.urls);
  }

  create() {
    createParticleTextures(this);
    createTabIconTextures(this);
    this.loaded = true;
    this.target = 1;
  }

  update(_time: number, delta: number) {
    this.elapsed += delta;
    const timeCap = Math.min(1, this.elapsed / MIN_MS);
    const goal = Math.min(this.target, timeCap);
    this.shown += (goal - this.shown) * 0.12;
    if (goal === 1 && this.shown > 0.995) this.shown = 1;
    this.drawYarn(this.shown);
    if (this.loaded && this.shown === 1 && !this.leaving) {
      this.leaving = true;
      this.leave();
    }
  }

  private leave() {
    const start = e2eStart();
    if (start) {
      // Test mode: jump straight to the scene under test, with a cat chosen as if CatSelect had run.
      const catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
      const cat = catalog.cats.find((c) => c.id === start.catId) ?? catalog.cats[0];
      writeSession(this.registry, chooseCat(emptySession(), cat.id, start.name ?? cat.name));
      transitionTo(this, start.scene, {}, 'fade');
      return;
    }
    go(this, 'loaded');
  }
}
