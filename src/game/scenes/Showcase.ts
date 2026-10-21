import Phaser from 'phaser';
import { FONT_FAMILY, GAME_WIDTH, MEOW_KEYS, ObjectEvents, Palette, RegistryKeys, SceneKeys, SfxKeys, TextureKeys } from '../constants';
import type { Catalog } from '../data/schema';
import { showcaseTitle } from '../domain/copy';
import type { Expression } from '../domain/expressions';
import { getLayers } from '../domain/outfit';
import type { AnchorsDef } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { Cat } from '../objects/Cat';
import { MuteButton } from '../objects/MuteButton';
import { drawRoom } from '../objects/room';
import { hex } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { go } from '../systems/navigate';
import { readSession } from '../systems/sessionStore';
import { enterKind, transitionIn } from '../systems/transitions';

const CAT_X = GAME_WIDTH / 2;
const CAT_FEET_Y = 612;
const CAT_SIZE = 560;
/** How long each pose (happy, in love) lasts. */
const POSE_MS = 1500;

/**
 * Showcase: the cat poses in front of the mirror with sparkles, alternating happy and in love, under a
 * "¡Qué guap@, {nombre}!" plaque. From here the player keeps dressing (the outfit is kept) or changes cat.
 * The middle of the bottom row is free for the "download photo" button of F7.
 */
export class Showcase extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private cat!: Cat;
  private keep!: Button;
  private change!: Button;
  private mute!: MuteButton;
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
  }

  create() {
    const catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const session = readSession(this.registry);
    const def = catalog.cats.find((c) => c.id === session.catId) ?? catalog.cats[0];
    this.title = showcaseTitle(session.catName || def.name);

    drawRoom(this, CAT_X, CAT_FEET_Y);
    // A warm glow behind the cat that breathes.
    const glow = this.add.graphics().setDepth(1);
    glow.fillStyle(hex('mantequilla'), 0.5).fillEllipse(CAT_X, 380, 430, 520);
    this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 1 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.cat = new Cat(this, CAT_X, CAT_FEET_Y, def, anchors, CAT_SIZE).setDepth(5);
    this.cat.setOutfit(getLayers(session.outfit, catalog.clothes));
    this.cat.appear();
    this.createPlaque();

    // Sparkles drift around the cat, and hearts pop up when it is in love.
    this.add
      .particles(CAT_X, 340, TextureKeys.Sparkle, {
        x: { min: -230, max: 230 }, y: { min: -200, max: 250 }, lifespan: 1100, frequency: 110, quantity: 1,
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
    // Free space at the bottom center: the "Descargar foto" button of F7.
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);

    this.time.delayedCall(450, () => {
      this.ready = true;
      getAudio(this).playRandom(MEOW_KEYS);
      this.strike('feliz');
      this.time.addEvent({ delay: POSE_MS, loop: true, callback: () => this.strike(this.pose === 'feliz' ? 'amor' : 'feliz') });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cat?.destroy();
      this.keep?.destroy();
      this.change?.destroy();
      this.mute?.destroy();
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
    this.tweens.add({ targets: plaque, y: 76, duration: 700, delay: 200, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: plaque, angle: { from: -1, to: 1 }, duration: 1600, delay: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Switches the pose with a little hop; love also sends hearts up. */
  private strike(pose: Expression) {
    if (!this.scene.isActive()) return;
    this.pose = pose;
    this.cat.hold(pose);
    this.cat.squash();
    if (pose === 'amor') {
      this.hearts.explode(8, CAT_X, 250);
      getAudio(this).play(SfxKeys.Purr, { volume: 0.7 });
    }
  }

  private leave(action: 'keepDressing' | 'change') {
    if (this.leaving) return;
    this.leaving = true;
    go(this, action);
  }

  getE2EUi(): UiState {
    return {
      ready: this.ready && !this.leaving,
      buttons: { keep: this.keep.getCenter(), change: this.change.getCenter(), mute: this.mute.getCenter() },
      points: {},
      info: { title: this.title, pose: this.pose, layers: this.cat.wornIds },
    };
  }
}
