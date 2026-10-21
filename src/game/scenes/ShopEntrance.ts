import Phaser from 'phaser';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Palette, RegistryKeys, SceneKeys, SfxKeys } from '../constants';
import type { Catalog } from '../data/schema';
import type { AnchorsDef } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Cat } from '../objects/Cat';
import { MuteButton } from '../objects/MuteButton';
import { MotionButton } from '../objects/MotionButton';
import { addClouds, addSky, addSun } from '../objects/scenery';
import { createShopFront, type ShopFront } from '../objects/shopFront';
import { hex } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { go } from '../systems/navigate';
import { readSession } from '../systems/sessionStore';
import { profileOf } from '../systems/motion';
import { enterKind, transitionIn } from '../systems/transitions';

const SHOP = { x: 570, y: 14, scale: 1.25 };
const SIDEWALK_Y = 604;
const CAT_SIZE = 190;
const WALK_FEET_Y = 664;
const ZOOM = 9;

type Phase = 'fading-in' | 'walk' | 'bell' | 'enter' | 'zoom' | 'done';

/**
 * ShopEntrance (ADR 0007): the chosen cat walks along the street to the boutique, the bell rings, the door opens, the cat
 * goes in and the view zooms into the doorway. A click anywhere skips it. The world is a container that is scaled
 * for the zoom, so the transition overlay (outside of it) keeps its size.
 */
export class ShopEntrance extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private world!: Phaser.GameObjects.Container;
  private shop!: ShopFront;
  private cat!: Cat;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private phase: Phase = 'fading-in';
  private skipped = false;
  private bob?: Phaser.Tweens.Tween;

  constructor() {
    super(SceneKeys.ShopEntrance);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.phase = 'fading-in';
    this.skipped = false;
    this.bob = undefined;
  }

  create() {
    const catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const session = readSession(this.registry);
    const def = catalog.cats.find((c) => c.id === session.catId) ?? catalog.cats[0];
    const sweater = catalog.clothes.find((c) => c.slot === 'sweater' && !c.secret) ?? catalog.clothes[0];

    this.world = this.add.container(0, 0);
    const sky = addSky(this);
    const sun = addSun(this, 170, 110);
    const clouds = addClouds(this, [
      { x: 300, y: 130, scale: 0.8, speed: 12 }, { x: 760, y: 60, scale: 0.6, speed: 8 }, { x: 1100, y: 170, scale: 0.9, speed: 15 },
    ]);
    const street = this.drawStreet();
    this.shop = createShopFront(this, SHOP.x, SHOP.y, sweater.texture, SHOP.scale);
    this.cat = new Cat(this, -140, WALK_FEET_Y, def, anchors, CAT_SIZE);
    this.cat.hold('feliz');
    this.world.add([sky, sun, ...clouds, street, this.shop.container, this.cat]);

    const hint = this.add
      .text(GAME_WIDTH - 28, GAME_HEIGHT - 26, 'Toca para saltar', { fontFamily: FONT_FAMILY, fontSize: '24px', color: Palette.texto, fontStyle: '500', stroke: '#FFFFFF', strokeThickness: 6 })
      .setOrigin(1, 1)
      .setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 0.8, delay: 1200, duration: 400 });
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 56).setDepth(50);

    this.input.on('pointerdown', this.skip, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.skip, this);
      this.bob?.remove();
      this.cat?.destroy();
      this.mute?.destroy();
      this.motion?.destroy();
      this.tweens.killAll();
    });
    transitionIn(this, this.enter, () => this.walk());
  }

  /** Buildings far away and the sidewalk, drawn once into a texture. */
  private drawStreet(): Phaser.GameObjects.Image {
    const key = 'street-bg';
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({}, false);
      const blocks: [number, number, number, keyof typeof Palette][] = [
        [-10, 150, 190, 'lavanda'], [190, 90, 150, 'menta'], [350, 180, 240, 'mantequilla'],
        [1130, 120, 190, 'menta'], [1250, 140, 200, 'lavanda'],
      ];
      for (const [x, w, h, color] of blocks) {
        g.fillStyle(hex(color), 0.85).fillRoundedRect(x, SIDEWALK_Y - h, w, h + 10, 14);
        g.fillStyle(0xffffff, 0.7);
        for (let wy = SIDEWALK_Y - h + 26; wy < SIDEWALK_Y - 50; wy += 56) for (let wx = x + 20; wx < x + w - 36; wx += 46) g.fillRoundedRect(wx, wy, 26, 32, 8);
      }
      g.fillStyle(hex('rosa50'), 1).fillRect(0, SIDEWALK_Y, GAME_WIDTH, GAME_HEIGHT - SIDEWALK_Y);
      g.fillStyle(hex('lavanda'), 1).fillRect(0, SIDEWALK_Y, GAME_WIDTH, 14);
      g.lineStyle(4, hex('contorno'), 1).beginPath().moveTo(0, SIDEWALK_Y + 14).lineTo(GAME_WIDTH, SIDEWALK_Y + 14).strokePath();
      g.lineStyle(3, hex('rosa200'), 1);
      for (let x = -40; x < GAME_WIDTH + 100; x += 110) g.beginPath().moveTo(x + 60, SIDEWALK_Y + 14).lineTo(x - 40, GAME_HEIGHT).strokePath();
      g.beginPath().moveTo(0, 670).lineTo(GAME_WIDTH, 670).strokePath();
      g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
      g.destroy();
    }
    return this.add.image(0, 0, key).setOrigin(0);
  }

  private walk() {
    this.phase = 'walk';
    const stopX = this.shop.doorStep.x;
    // Waddle: a sway and a little hop at every step.
    const p = profileOf(this);
    const waddle = { t: 0 };
    this.bob = this.tweens.add({
      targets: waddle, t: 1, duration: 520, repeat: -1,
      onUpdate: () => {
        const a = waddle.t * Math.PI * 2;
        this.cat.setAngle(Math.sin(a) * 5 * p.shake);
        this.cat.y = WALK_FEET_Y - Math.abs(Math.sin(a / 2)) * 14 * Math.max(p.squash, p.shake);
      },
    });
    this.tweens.add({
      targets: this.cat, x: stopX, duration: 2800, ease: 'Sine.easeInOut',
      onComplete: () => this.ring(),
    });
  }

  private ring() {
    if (this.skipped) return;
    this.phase = 'bell';
    this.bob?.remove();
    this.tweens.add({ targets: this.cat, angle: 0, y: WALK_FEET_Y, duration: 120 });
    getAudio(this).play(SfxKeys.Doorbell);
    if (profileOf(this).shake > 0) this.tweens.chain({
      targets: this.shop.bell,
      tweens: [
        { angle: 28, duration: 110, ease: 'Sine.easeOut' }, { angle: -22, duration: 150, ease: 'Sine.easeInOut' },
        { angle: 14, duration: 130, ease: 'Sine.easeInOut' }, { angle: -8, duration: 120, ease: 'Sine.easeInOut' }, { angle: 0, duration: 120, ease: 'Sine.easeOut' },
      ],
    });
    this.cat.react('combo');
    this.time.delayedCall(550, () => this.openDoor());
  }

  private openDoor() {
    if (this.skipped) return;
    this.tweens.add({
      targets: this.shop.door, scaleX: 0.12, duration: 450, ease: 'Cubic.easeOut',
      onComplete: () => this.goIn(),
    });
  }

  /** The cat steps up through the doorway, getting smaller, and then the camera dives in. */
  private goIn() {
    if (this.skipped) return;
    this.phase = 'enter';
    const door = this.shop.doorStep;
    this.tweens.add({
      targets: this.cat, y: door.y - 10, scale: this.cat.scaleX * 0.55, alpha: 0, duration: 800, ease: 'Sine.easeIn',
      onComplete: () => this.zoom(),
    });
  }

  private zoom() {
    if (this.skipped) return;
    this.phase = 'zoom';
    // Reduced motion: no camera dive; the screen simply fades into the fitting room.
    if (!profileOf(this).zoom) {
      this.finish(false);
      return;
    }
    const d = this.shop.doorCenter;
    const endX = GAME_WIDTH / 2 - ZOOM * d.x;
    const endY = GAME_HEIGHT / 2 - ZOOM * d.y;
    this.tweens.addCounter({
      from: 0, to: 1, duration: 1000, ease: 'Cubic.easeIn',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const t = tween.getValue() ?? 0;
        this.world.setScale(1 + (ZOOM - 1) * t).setPosition(endX * t, endY * t);
      },
      onComplete: () => this.finish(false),
    });
  }

  private skip() {
    if (this.phase === 'fading-in' || this.phase === 'done') return;
    this.skipped = true;
    this.finish(true);
  }

  private finish(skipped: boolean) {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.skipped = skipped;
    this.bob?.remove();
    go(this, 'enter', { skipped });
  }

  getE2EUi(): UiState {
    return {
      ready: this.phase !== 'fading-in',
      buttons: { mute: this.mute.getCenter(), motion: this.motion.getCenter() },
      points: { cat: { x: this.cat.x, y: this.cat.y } },
      info: { phase: this.phase, skipped: this.skipped },
    };
  }
}
