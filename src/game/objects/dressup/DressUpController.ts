// Contract of the DressUp controllers (ADR 0019): a feature of the fitting room lives in its own file and plugs into
// the scene through this interface, so features do not edit DressUp.ts. Controllers do NOT import each other: they talk
// through the scene events (DressUpEvents), the progress in the registry and the cell/tab extension points.
import type Phaser from 'phaser';
import type { Catalog } from '../../data/schema';
import type { AnchorsDef, Outfit } from '../../domain/types';
import type { Cat } from '../Cat';
import type { ItemGrid } from '../ItemGrid';
import type { LayersPanel } from '../LayersPanel';
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
  catId: string;
  catName: string;
  /** The outfit as of now. */
  getOutfit(): Outfit;
}

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
  /**
   * Called when the player presses Ready or "Otro gato", before leaving. Return false (or a promise of false) to stay
   * (for example, to show a box first); true or nothing lets the player go. With a promise the scene waits for it.
   */
  beforeLeave?(action: LeaveAction): boolean | void | Promise<boolean>;
}

/** Controllers are created per visit (the scene state is reset in `init`), so the list holds factories. */
export type DressUpControllerFactory = () => DressUpController;
