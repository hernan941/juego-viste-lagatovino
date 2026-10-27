// Contract of the DressUp controllers (ADR 0019): a feature of the fitting room lives in its own file and plugs into
// the scene through this interface, so features do not edit DressUp.ts. Controllers do NOT import each other: they talk
// through the scene events (DressUpEvents), the progress in the registry and the cell/tab extension points.
import type Phaser from 'phaser';
import type { Catalog } from '../../data/schema';
import type { AnchorsDef, Category, ClothingDef, Outfit, Rect } from '../../domain/types';
import type { Cat } from '../Cat';
import type { ItemGrid } from '../ItemGrid';
import type { LayersPanel } from '../LayersPanel';
import type { NameSign } from '../NameSign';
import type { Tabs } from '../Tabs';

/** What a controller can use. The objects are the scene's own: a controller decorates them, it never replaces them. */
export interface DressUpContext {
  /**
   * The DressUp scene. Listen to `scene.events` for DressUpEvents (item-dropped, item-removed, ready-pressed,
   * outfit-changed, cat-changed) and register the listener removal in `destroy()`.
   */
  scene: Phaser.Scene;
  catalog: Catalog;
  anchors: AnchorsDef;
  cat: Cat;
  grid: ItemGrid;
  tabs: Tabs;
  layersPanel: LayersPanel;
  /** Container above the room and below the dragged item, for tags, labels and counters. The scene destroys it on shutdown. */
  hud: Phaser.GameObjects.Container;
  /** The scene's particle emitters (explode them, do not create new ones for a single burst). */
  hearts: Phaser.GameObjects.Particles.ParticleEmitter;
  sparkles: Phaser.GameObjects.Particles.ParticleEmitter;
  /** The hanging sign with the name of the cat (it flips to announce looks and prizes). */
  sign: NameSign;
  /** Graphics drawn behind the cat, for the rainbow of the combo effects. */
  rainbow: Phaser.GameObjects.Graphics;
  catId: string;
  catName: string;
  /** The outfit as of now. */
  getOutfit(): Outfit;
  /** True while the player holds a garment. */
  isDragging(): boolean;
  /** True from the moment the player leaves (Ready or "Otro gato"). */
  isLeaving(): boolean;
  /** Bounding box of the visible pixels of an item texture (cached), in texture px. */
  boundsOf(item: ClothingDef): Rect | null;
  /** Takes a worn item off the cat as if the player had removed it (sound, reaction, layers panel, `item-removed`). Does nothing if it is not worn. */
  removeItem(item: ClothingDef): void;
  /** Selects the tab of the category (silently) and fills the grid with its items. */
  showCategory(category: Category): void;
  /** Replaces the tip at the foot of the card (fades 140 ms); `null` brings back the scene's own. A tab that says its own thing uses this instead of a second text. */
  setTip(text: string | null): void;
  /** The tip pulses (a tap on something that is only dragged). */
  pulseTip(): void;
  /** Data that `beforeLeave` adds to what the scene sends to the next one (`go(scene, action, data)`). */
  leaveData: Record<string, unknown>;
}

/** Why the outfit changed (second argument of the outfit-changed event): a drop, a removal, the look that came along, or the test hook. */
export type OutfitCause = 'drop' | 'remove' | 'restore' | 'test';

/** Why the player is leaving DressUp: the Ready button, or "Otro gato". */
export type LeaveAction = 'finish' | 'change';

export interface DressUpController {
  /** Unique key. The `e2eState()` of the controller is merged into the `dressUp` state of the test hook under this key. */
  readonly key: string;
  /** Called once from `create()`, after the scene objects exist. Register listeners, decorators and tabs here. */
  attach(ctx: DressUpContext): void;
  /** Called on the scene `shutdown`, last attached first. Remove every listener, timer, tween and object. */
  destroy(): void;
  /** Test mode: the state of the controller (plain data in game coordinates). */
  e2eState?(): unknown;
  /** Test mode, legacy shape: keys merged at the top level of the `dressUp` state (the scene's own keys win). New controllers use `e2eState`. */
  e2eRoot?(): Record<string, unknown>;
  /** False while the controller runs an animation or a sequence (a gift, a reveal): feeds the `settled` flag of the test hook. */
  isSettled?(): boolean;
  /**
   * Called when the player presses Ready or "Otro gato", before leaving. Return false (or a promise of false) to stay
   * (for example, to show a box first); true or nothing lets the player go. With a promise the scene waits for it.
   */
  beforeLeave?(action: LeaveAction): boolean | void | Promise<boolean>;
}

/** Controllers are created per visit (the scene state is reset in `init`), so the list holds factories. */
export type DressUpControllerFactory = () => DressUpController;
