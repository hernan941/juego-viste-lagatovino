// The porcelain keychain (ADR 0021): a cat dressed as in a saved recipe, turned into ONE flattened texture (border, hand painted
// colors, varnish and hardware) that hangs from its ring and swings like a pendulum. It is drawn from the recipe, never stored
// as an image. Big (512 px, one at a time) or thumbnail (256 px, built one per frame by a queue, with a pencil silhouette while
// it waits). The transformation animation of the photo mode is F19.3 and the hanger of the album is F19.5.
import Phaser from 'phaser';
import { Ink, ObjectEvents, colorToNumber } from '../../constants';
import type { GameData } from '../../data/schema';
import { catPose } from '../../domain/catPose';
import {
  INK_LINE_PX,
  borderCopiesFor,
  hardwareParts,
  keychainLayout,
  pendulum,
  pendulumDuration,
  poseTransform,
  recipeKey,
  ringFor,
  type HardwarePartId,
  type KeychainLayout,
  type PendulumParams,
} from '../../domain/keychain';
import type { AnchorsDef, CatDef, ClothingDef, KeychainRecipe, KeychainRules, Point } from '../../domain/types';
import { getDye } from '../../plugins/DyePlugin';
import { FrameQueue } from '../../systems/frameQueue';
import { profileOf } from '../../systems/motion';
import { Cat } from '../Cat';
import { headTop } from './lookTop';
import { PART_TEXTURE, bakePorcelain } from './porcelain';

/** Everything a keychain needs to be drawn from its recipe. */
export interface KeychainData {
  cats: readonly CatDef[];
  clothes: readonly ClothingDef[];
  anchors: AnchorsDef;
  rules: KeychainRules;
}

/** The data of the catalog in the registry (`RegistryKeys.Catalog`) shaped for a keychain. */
export function keychainData(catalog: Pick<GameData, 'cats' | 'clothes' | 'photo'>, anchors: AnchorsDef): KeychainData {
  return { cats: catalog.cats, clothes: catalog.clothes, anchors, rules: catalog.photo.keychain };
}

export interface KeychainOptions {
  /** Side in px of the render of the look: 512 (big) or 256 (thumbnail). */
  px?: 256 | 512;
  /** Thumbnails wait their turn in the queue (one per frame) and show a pencil silhouette; a big one is built at once. */
  deferred?: boolean;
  /**
   * false: the texture has no hardware (its key ends in `~bare`) and `hardwareImages()` makes the pieces live, so the
   * transformation of the photo mode can put them on one by one. Default true (the hanger and the thumbnails).
   */
  hardware?: boolean;
  /** Keep the texture until the scene shuts down (the thumbnails of the hanger). Otherwise it goes away with the last keychain that shows it. */
  cache?: boolean;
}

/** Per scene: the textures that were built, who is showing each one and the queue of the thumbnails. */
interface SceneState {
  queue: FrameQueue;
  keys: Set<string>;
  keep: Set<string>;
  users: Map<string, number>;
  dispose: () => void;
}

const states = new WeakMap<Phaser.Scene, SceneState>();

/** The state of a scene, made the first time it is needed and let go (textures, queue and listener) when the scene shuts down. */
function stateOf(scene: Phaser.Scene): SceneState {
  const known = states.get(scene);
  if (known) return known;
  const queue = new FrameQueue();
  const tick = () => queue.tick();
  scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
  const state: SceneState = {
    queue, keys: new Set(), keep: new Set(), users: new Map(),
    dispose: () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, tick);
      queue.clear();
      for (const key of state.keys) if (scene.textures.exists(key)) scene.textures.remove(key);
      states.delete(scene);
    },
  };
  states.set(scene, state);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, state.dispose);
  return state;
}

const PENCIL_ALPHA = 0.55;
const FADE_MS = 220;

export class Keychain extends Phaser.GameObjects.Container {
  readonly recipe: KeychainRecipe;
  readonly px: 256 | 512;
  /** Key of the flattened texture (it exists once `ready` is true). */
  readonly textureKey: string;
  /** Where everything goes in the texture; `layout.hang` is the pivot of the swing and the origin of this container. */
  readonly layout: KeychainLayout;
  private readonly catalog: KeychainData;
  /** True when the hardware is part of the flattened texture. */
  readonly hasHardware: boolean;
  private readonly cache: boolean;
  private readonly deferred: boolean;
  private parts: Partial<Record<HardwarePartId, Phaser.GameObjects.Image>> = {};
  private readonly def: CatDef;
  private readonly items: ClothingDef[];
  private pencil?: Phaser.GameObjects.Image;
  private picture?: Phaser.GameObjects.Image;
  private cancelJob?: () => void;
  /** Lets a keychain that waits for the queue stop waiting when it is destroyed. */
  private release?: () => void;
  private swingTween?: Phaser.Tweens.Tween;
  private done: Promise<void>;
  private isReady = false;
  private gone = false;

  constructor(scene: Phaser.Scene, x: number, y: number, recipe: KeychainRecipe, data: KeychainData, options: KeychainOptions = {}) {
    super(scene, x, y);
    const def = data.cats.find((c) => c.id === recipe.catId);
    if (!def) throw new Error(`Keychain: unknown cat "${recipe.catId}"`);
    this.recipe = recipe;
    this.catalog = data;
    this.def = def;
    this.px = options.px ?? 512;
    this.deferred = options.deferred ?? this.px < 512;
    this.cache = options.cache ?? this.px < 512;
    this.hasHardware = options.hardware ?? true;
    this.textureKey = recipeKey(recipe, this.px) + (this.hasHardware ? '' : '~bare');
    this.items = Object.values(recipe.outfit)
      .map((id) => data.clothes.find((c) => c.id === id))
      .filter((c): c is ClothingDef => c !== undefined);
    this.layout = keychainLayout(this.px, this.top(), ringFor(recipe.stars, data.rules), data.rules.borderRadius * (this.px / 512));
    this.setSize(this.layout.width, this.layout.height);

    const state = stateOf(scene);
    state.users.set(this.textureKey, (state.users.get(this.textureKey) ?? 0) + 1);
    if (this.cache) state.keep.add(this.textureKey);
    scene.add.existing(this);
    this.done = this.start(state);
  }

  /** Resolves when the texture is built and showing. */
  whenReady(): Promise<void> {
    return this.done;
  }

  get ready(): boolean {
    return this.isReady;
  }

  get swinging(): boolean {
    return this.swingTween !== undefined;
  }

  /** The point of the container where it hangs (its origin), in the texture. */
  get hangPoint(): Point {
    return this.layout.hang;
  }

  /**
   * The live pieces of the hardware (hidden, in place, children of this container so they swing with it), made the first time. Empty
   * when the hardware is baked into the texture.
   */
  hardwareImages(): Partial<Record<HardwarePartId, Phaser.GameObjects.Image>> {
    if (this.hasHardware || Object.keys(this.parts).length > 0 || this.gone) return this.parts;
    for (const part of hardwareParts(this.layout, ringFor(this.recipe.stars, this.catalog.rules))) {
      const img = this.scene.add.image(part.x - this.layout.hang.x, part.y - this.layout.hang.y, PART_TEXTURE[part.part]);
      img.setOrigin(part.origin.x, part.origin.y).setScale(part.scale).setAngle(part.angle).setVisible(false);
      this.add(img);
      this.parts[part.part] = img;
    }
    return this.parts;
  }

  // ---- Building ------------------------------------------------------------

  /** Where the top of the head is in the 512 canvas with the pose on: the eyelet screws in there. */
  private top(): Point {
    const pose = catPose(this.recipe.pose);
    const raw = headTop(this.scene, this.def, this.items);
    return pose ? poseTransform(pose, raw) : raw;
  }

  private async start(state: SceneState): Promise<void> {
    if (!this.scene.textures.exists(this.textureKey)) {
      this.showPencil();
      const dyed = await this.ensureDyes();
      if (this.gone) return;
      if (this.deferred) {
        // One thumbnail per frame: waiting here is what keeps 12 of them from freezing the game in a single frame (ADR 0021).
        await new Promise<void>((resolve) => {
          this.cancelJob = state.queue.add(() => {
            this.cancelJob = undefined;
            this.buildTexture(state, dyed);
            resolve();
          });
          // A destroyed keychain cancels its job, so nothing would resolve it: `destroy` calls this instead.
          this.release = resolve;
        });
      } else {
        this.buildTexture(state, dyed);
      }
    }
    if (this.gone) return;
    this.show();
  }

  /** The dyed textures of the worn items that have a dye (the water and unknown dyes keep the plain item). */
  private async ensureDyes(): Promise<Map<string, string>> {
    const dyed = new Map<string, string>();
    const dye = getDye(this.scene);
    await Promise.all(
      this.items.map(async (item) => {
        const dyeId = this.recipe.itemDye[item.id];
        if (!dyeId) return;
        try {
          const key = await dye.ensure(item.id, dyeId);
          if (key !== item.texture) dyed.set(item.id, key);
        } catch {
          // A dye that cannot be made: the keychain shows the plain item instead of nothing.
        }
      }),
    );
    return dyed;
  }

  /** Dresses an off-screen cat at once, captures it into a render and bakes the porcelain. Synchronous: no frame passes in between. */
  private buildTexture(state: SceneState, dyed: Map<string, string>): void {
    const { scene, px, layout, catalog: data } = this;
    if (scene.textures.exists(this.textureKey)) return;
    const k = px / 512;
    const lookKey = `${this.textureKey}~look`;
    const held = [...dyed.values()];
    const dye = getDye(scene);
    held.forEach((key) => dye.retain(key));
    const cat = new Cat(scene, -4000, 0, this.def, data.anchors, 512);
    try {
      cat.setOutfit(this.items, { instant: true });
      for (const [itemId, key] of dyed) cat.setItemTexture(itemId, key);
      const pose = catPose(this.recipe.pose);
      if (pose) cat.applyPose(pose.id, { instant: true });
      cat.freezeForPhoto(pose?.expression ?? 'normal');
      const look = scene.textures.addDynamicTexture(lookKey, px, px);
      if (!look) throw new Error('Keychain: no dynamic texture for the look');
      look.capture(cat, { x: px / 2, y: 490 * k, scaleX: k, scaleY: k });
      look.render();
      bakePorcelain(scene, {
        key: this.textureKey, lookKey, px, layout, ring: ringFor(this.recipe.stars, data.rules),
        hardware: this.hasHardware, copies: borderCopiesFor(px), borderPx: data.rules.borderRadius * k, inkPx: INK_LINE_PX * k,
        cream: colorToNumber(data.rules.borderColor), ink: colorToNumber(Ink.tinta), varnishAlpha: data.rules.varnishAlpha,
        saturation: data.rules.saturation, warmth: data.rules.warmth,
      });
      state.keys.add(this.textureKey);
    } finally {
      cat.destroy();
      if (scene.textures.exists(lookKey)) scene.textures.remove(lookKey);
      held.forEach((key) => dye.release(key));
    }
  }

  /** The pencil silhouette of the cat (`linea-lapiz`) while the keychain waits: the hanger never shows an empty hook. */
  private showPencil(): void {
    const { px, layout } = this;
    const cx = layout.look.x + px / 2 - layout.hang.x;
    const cy = layout.look.y + px / 2 - layout.hang.y;
    const pencil = this.scene.add.image(cx, cy, this.def.texture).setDisplaySize(px, px).setAlpha(PENCIL_ALPHA);
    pencil.setTint(colorToNumber(Ink.lineaLapiz)).setTintMode(Phaser.TintModes.FILL);
    this.pencil = pencil;
    this.add(pencil);
  }

  /** The flattened texture fades in over the pencil silhouette (nothing appears at once). */
  private show(): void {
    const { layout } = this;
    const picture = this.scene.add.image(-layout.hang.x, -layout.hang.y, this.textureKey).setOrigin(0, 0).setAlpha(0);
    this.picture = picture;
    this.add(picture);
    const pencil = this.pencil;
    this.pencil = undefined;
    this.scene.tweens.add({ targets: picture, alpha: 1, duration: FADE_MS });
    if (pencil) {
      this.scene.tweens.add({ targets: pencil, alpha: 0, duration: FADE_MS, onComplete: () => pencil.destroy() });
    }
    this.isReady = true;
    this.emit(ObjectEvents.KeychainReady, this);
  }

  /**
   * Draws this keychain into a render texture, hanging from (x, y) with one texture px = `k` render px: the flattened texture and,
   * when the hardware is not baked into it, the pieces in their places. The helper images go to `temp` for the caller to destroy.
   */
  drawInto(rt: Phaser.GameObjects.RenderTexture, x: number, y: number, k: number, temp: Phaser.GameObjects.GameObject[]): void {
    const { hang } = this.layout;
    const put = (img: Phaser.GameObjects.Image) => {
      temp.push(img);
      rt.draw(img);
    };
    put(new Phaser.GameObjects.Image(this.scene, x - hang.x * k, y - hang.y * k, this.textureKey).setOrigin(0, 0).setScale(k));
    if (this.hasHardware) return;
    for (const part of hardwareParts(this.layout, ringFor(this.recipe.stars, this.catalog.rules))) {
      const img = new Phaser.GameObjects.Image(this.scene, x + (part.x - hang.x) * k, y + (part.y - hang.y) * k, PART_TEXTURE[part.part]);
      put(img.setOrigin(part.origin.x, part.origin.y).setScale(part.scale * k).setAngle(part.angle));
    }
  }

  // ---- Swinging ------------------------------------------------------------

  /**
   * Swings like a damped pendulum from the ring (+-14 degrees, or +-3 and shorter with reduced motion; `strength` -1..1 scales it, and its sign is the side it starts on).
   * The angle depends only on the time since the start, never on the frame rate. A new swing replaces the one that is going.
   */
  swing(strength = 1): void {
    this.stopSwing();
    const base = profileOf(this.scene).swing;
    const params: PendulumParams = { ...base, amp: base.amp * Math.max(-1, Math.min(1, strength)) };
    const duration = pendulumDuration(params);
    if (!(duration > 0) || !Number.isFinite(duration)) return;
    let last = pendulum(0, params);
    let rising = params.amp < 0;
    this.swingTween = this.scene.tweens.addCounter({
      from: 0,
      to: duration,
      duration,
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const angle = pendulum(t, params);
        // The swing reaches one end when the angle stops growing in one direction: the porcelain "tink".
        const nowRising = angle > last;
        if (nowRising !== rising && t > 0) this.emit(ObjectEvents.KeychainTink, Math.min(1, Math.abs(last) / Math.abs(params.amp)));
        rising = nowRising;
        last = angle;
        this.setAngle(angle);
      },
      onComplete: () => {
        this.swingTween = undefined;
        this.setAngle(0);
        this.emit(ObjectEvents.KeychainSwingEnd);
      },
    });
  }

  /** Stops the swing where it is and lets the keychain hang straight. */
  stopSwing(): void {
    this.swingTween?.remove();
    this.swingTween = undefined;
    this.setAngle(0);
  }

  // ---- Lifecycle -----------------------------------------------------------

  destroy(fromScene?: boolean): void {
    if (this.gone) return;
    this.gone = true;
    this.cancelJob?.();
    this.release?.();
    this.swingTween?.remove();
    this.swingTween = undefined;
    const { scene } = this;
    if (scene?.tweens) {
      for (const child of [this.pencil, this.picture]) if (child) scene.tweens.killTweensOf(child);
    }
    const state = scene ? states.get(scene) : undefined;
    if (state) {
      const left = (state.users.get(this.textureKey) ?? 1) - 1;
      if (left > 0) state.users.set(this.textureKey, left);
      else {
        state.users.delete(this.textureKey);
        // A big keychain is drawn again when it is opened: it goes away with the last one that shows it. The thumbnails stay.
        if (!state.keep.has(this.textureKey) && scene.textures.exists(this.textureKey)) {
          scene.textures.remove(this.textureKey);
          state.keys.delete(this.textureKey);
        }
      }
    }
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
