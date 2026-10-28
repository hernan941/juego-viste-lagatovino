import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RegistryKeys, SceneKeys, SfxKeys } from '../constants';
import type { GameData } from '../data/schema';
import { splitShopSign } from '../domain/copy';
import type { AnchorsDef } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Cat } from '../objects/Cat';
import { MuteButton } from '../objects/MuteButton';
import { MotionButton } from '../objects/MotionButton';
import { makeHintPill } from '../objects/kit/HintPill';
import { SpeechBubble } from '../objects/kit/SpeechBubble';
import { addInkClouds, addInkSky, addInkStreet, addInkSun } from '../objects/streetInk';
import { createShopFront, type ShopFront } from '../objects/shopFront';
import { touchEnv } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { go } from '../systems/navigate';
import { readSession } from '../systems/sessionStore';
import { profileOf } from '../systems/motion';
import { ENTRANCE_BUTTONS, ENTRANCE_SHOP as SHOP } from '../systems/entranceLayout';
import { enterKind, transitionIn } from '../systems/transitions';

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
  private bubble?: SpeechBubble;

  constructor() {
    super(SceneKeys.ShopEntrance);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.phase = 'fading-in';
    this.skipped = false;
    this.bob = undefined;
    this.bubble = undefined;
  }

  create() {
    const catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const session = readSession(this.registry);
    const def = catalog.cats.find((c) => c.id === session.catId) ?? catalog.cats[0];
    const sweater = catalog.clothes.find((c) => c.slot === 'sweater' && !c.secret) ?? catalog.clothes[0];

    this.world = this.add.container(0, 0);
    const sky = addInkSky(this);
    const sun = addInkSun(this, 170, 110);
    const clouds = addInkClouds(this, [
      { x: 300, y: 130, scale: 0.8, speed: 12 }, { x: 760, y: 60, scale: 0.6, speed: 8 }, { x: 1100, y: 170, scale: 0.9, speed: 15 },
    ]);
    const street = addInkStreet(this);
    this.shop = createShopFront(this, SHOP.x, SHOP.y, sweater.texture, splitShopSign(catalog.brand.shopSign), SHOP.scale);
    this.cat = new Cat(this, -140, WALK_FEET_Y, def, anchors, CAT_SIZE);
    this.cat.hold('feliz');
    this.world.add([sky, sun, ...clouds, street, this.shop.container, this.cat]);

    // "Clic para saltar": the game is for the PC (ADR 0008), in a pill that reads over the sidewalk; it fades in after a second.
    const hint = makeHintPill(this, GAME_WIDTH - 150, GAME_HEIGHT - 44, touchEnv().touch ? 'Toca para saltar' : 'Clic para saltar', { skipIcon: true }).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, delay: 1000, duration: 400 });
    this.mute = new MuteButton(this, ENTRANCE_BUTTONS.mute.x, ENTRANCE_BUTTONS.mute.y).setDepth(50);
    this.motion = new MotionButton(this, ENTRANCE_BUTTONS.motion.x, ENTRANCE_BUTTONS.motion.y).setDepth(50);

    this.input.on('pointerdown', this.skip, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.skip, this);
      this.bob?.remove();
      this.bubble?.destroy();
      this.cat?.destroy();
      this.mute?.destroy();
      this.motion?.destroy();
      this.tweens.killAll();
    });
    transitionIn(this, this.enter, () => this.walk());
  }

  private walk() {
    this.phase = 'walk';
    const stopX = this.shop.doorStep.x;
    // Waddle: a sway and a little hop at every step.
    const p = profileOf(this);
    const waddle = { t: 0 };
    let lastT = 0;
    this.bob = this.tweens.add({
      targets: waddle, t: 1, duration: 520, repeat: -1,
      onUpdate: () => {
        // A soft little step each time the cycle starts again.
        if (waddle.t < lastT) getAudio(this).play(SfxKeys.Key, { rate: 0.6, volume: 0.3 });
        lastT = waddle.t;
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
    // The shop answers: "¡Pasa nomás!" pops over the cat's head.
    this.bubble = new SpeechBubble(this, this.cat.x + 36, WALK_FEET_Y - CAT_SIZE - 6, 'Pasa, pasa!', { maxWidth: 360 }).setDepth(30);
    this.world.add(this.bubble);
    this.time.delayedCall(550, () => this.openDoor());
  }

  private openDoor() {
    if (this.skipped) return;
    getAudio(this).play(SfxKeys.Remove, { rate: 1.2 });
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
    if (this.bubble) this.tweens.add({ targets: this.bubble, alpha: 0, duration: 250 });
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
