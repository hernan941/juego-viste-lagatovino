// The dye tab (F16.3, S4): the 7th tab of the fitting room. Ten bottles and the water, the size of the wardrobe cells, that
// the player drags onto a worn sweater to change its color (it is only by dragging, ADR 0008). The bottle is lifted over the
// finger like a garment (ADR 0014), and the item under it lights its halo, because a finger hides it. The color lives on
// the item (`itemDye`, ADR 0018): this controller writes it in the registry and shows the texture the DyePlugin makes.
import type Phaser from 'phaser';
import { DressUpEvents, Fonts, GAME_HEIGHT, GAME_WIDTH, Ink, ObjectEvents, RegistryKeys, SfxKeys, TextureKeys, colorToNumber } from '../../constants';
import { dyeKey, WATER_ID } from '../../data/assets';
import { dyeLines } from '../../domain/copy';
import { applyDye, resolveDyeDrop, type DyeDropResult } from '../../domain/dyeDrop';
import { WATER_DYE } from '../../domain/dye';
import { isInsideDropZone } from '../../domain/dropZone';
import { anchorForSlot } from '../../domain/slots';
import { tiltToward } from '../../domain/tilt';
import type { ClothingDef, DyeDef, Point } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { getDye } from '../../plugins/DyePlugin';
import { profileOf } from '../../systems/motion';
import { readSession } from '../../systems/sessionStore';
import { applyLift, isDragPointer } from '../../systems/touch';
import { DyeJar } from '../DyeJar';
import { SpeechBubble } from '../kit/SpeechBubble';
import { tabIconKey } from '../tabIcons';
import { TAB_SIZE } from '../Tabs';
import { liftFor } from '../ui';
import type { DressUpContext, DressUpController } from './DressUpController';

/** Id of the tab (not a wardrobe category: the scene ignores it and this controller answers it). */
export const DYE_TAB_ID = 'tintes';

/** The panel of bottles sits where the grid is (the same viewport as the scene's GRID). */
const PANEL = { x: 62, y: 164, columns: 4, step: 90, rowStep: 140, firstRow: 50, tipY: 440 } as const;
/** The widest the row of tabs may be: the left panel is 404 px wide and the seven tabs do not fit at their size. */
const TABS_MAX_WIDTH = 392;
/** Forgiving margin around the cat's drop zone, the same as the garments (game px). */
const CAT_MARGIN = 36;
/** Height of the bottle in the hand, and how often it drips while it is dragged. */
const GHOST_HEIGHT = 150;
const DRIP_EVERY_MS = 420;
const BUBBLE_MS = 1300;
const BOUNCE_BACK_MS = 250;

/** What the catalog of the registry carries besides the clothes (GameData, ADR 0017). */
interface WithDyes {
  dyes: readonly DyeDef[];
}

/** The bottle in the player's hand. */
interface JarDrag {
  jar: DyeJar;
  dye: DyeDef;
  ghost: Phaser.GameObjects.Image;
  pointerId: number;
  /** How far above the finger it is held (touch only), and where it is held now. */
  lift: Point;
  held: Point;
  /** Where the ghost is and where it is going (it eases, so it feels soft). */
  pos: Point;
  angle: number;
  grabbing: boolean;
  target: ClothingDef | null;
  lastLook: number;
  dripMs: number;
}

export class DyeTabController implements DressUpController {
  readonly key = 'dyes';
  private ctx!: DressUpContext;
  private alive = false;
  private open = false;
  private jars: DyeJar[] = [];
  private panel: Phaser.GameObjects.Container | null = null;
  private tip: Phaser.GameObjects.Text | null = null;
  private drag: JarDrag | null = null;
  /** Items whose dye is on the cat now, and the texture held for each. */
  private applied = new Map<string, { dyeId: string; key: string }>();
  private bubble: SpeechBubble | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  private flying = 0;
  private last: DyeDropResult['kind'] | null = null;

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    this.alive = true;
    ctx.tabs.addTab({ id: DYE_TAB_ID, label: dyeLines.tab, icon: tabIconKey(DYE_TAB_ID) });
    this.fitTabs();
    ctx.tabs.on(ObjectEvents.TabSelect, this.onTab, this);
    ctx.scene.events.on('update', this.onUpdate, this);
    ctx.scene.registry.events.on(`changedata-${RegistryKeys.ItemDye}`, this.syncAll, this);
    this.syncAll();
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    const { scene, tabs } = this.ctx;
    tabs.off(ObjectEvents.TabSelect, this.onTab, this);
    scene.events.off('update', this.onUpdate, this);
    scene.registry.events.off(`changedata-${RegistryKeys.ItemDye}`, this.syncAll, this);
    for (const t of this.timers) t.remove();
    this.timers = [];
    this.bubble?.destroy();
    this.bubble = null;
    this.drag?.ghost.destroy();
    this.drag = null;
    this.ctx.cat.highlightItem(null);
    for (const j of this.jars) j.destroy();
    this.panel?.destroy();
    this.panel = null;
    this.jars = [];
    const dye = getDye(scene);
    for (const { key } of this.applied.values()) dye.release(key);
    this.applied.clear();
  }

  e2eState(): { open: boolean; jars: Record<string, Point>; dragging: boolean; target: string | null; last: string | null; applied: Record<string, string> } {
    return {
      open: this.open,
      jars: Object.fromEntries(this.jars.filter((j) => j.active !== false).map((j) => [j.dye.id, j.getCenter()])),
      dragging: this.drag !== null,
      target: this.drag?.target?.id ?? null,
      last: this.last,
      applied: Object.fromEntries([...this.applied].map(([item, { dyeId }]) => [item, dyeId])),
    };
  }

  /** False while a bottle flies back or the bottles are still popping in (feeds `settled` of the hook). */
  isSettled(): boolean {
    return this.flying === 0 && this.drag === null && this.jars.every((j) => j.alpha > 0.99 && Math.abs(j.scale - 1) < 0.01);
  }

  /** Seven tabs are wider than the panel: the row shrinks to fit, around the same middle point. */
  private fitTabs(): void {
    const { tabs } = this.ctx;
    const centers = Object.values(tabs.getTabPositions());
    const first = centers[0];
    const last = centers[centers.length - 1];
    if (!first || !last) return;
    const width = last.x - first.x + TAB_SIZE;
    if (width <= TABS_MAX_WIDTH) return;
    const k = TABS_MAX_WIDTH / width;
    const middle = (first.x + last.x) / 2;
    tabs.setScale(k);
    tabs.x = middle - (width * k) / 2;
  }

  // ---- The tab and its panel -------------------------------------------------

  private onTab(id: string): void {
    if (id === DYE_TAB_ID) this.openPanel();
    else this.closePanel();
  }

  /** A category chosen without an event (a silent select) still puts the bottles away. */
  private onUpdate(_time: number, delta: number): void {
    if (this.open && this.ctx.tabs.selectedId !== DYE_TAB_ID) this.closePanel();
    if (this.drag) this.follow(this.drag, delta);
  }

  private openPanel(): void {
    if (this.open) return;
    this.open = true;
    const { scene, grid, catalog } = this.ctx;
    // The cells of the wardrobe leave (they fade); the bottles take their place.
    grid.setItems([]);
    const panel = scene.add.container(PANEL.x, PANEL.y);
    const tipText = scene.add.text(PANEL.step * 2 - 10, PANEL.tipY, dyeLines.tip, { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '24px', color: Ink.mutedTexto, align: 'center', wordWrap: { width: 330 } }).setOrigin(0.5);
    panel.add(tipText);
    this.tip = tipText;
    this.panel = panel;
    const bottles: DyeDef[] = [...(catalog as unknown as WithDyes).dyes, { id: WATER_ID, name: 'Agua', hex: '#FFFFFF' }];
    const left = (356 - (PANEL.columns * 80 + (PANEL.columns - 1) * 10)) / 2 + 40;
    this.jars = bottles.map((dye, i) => {
      const jar = new DyeJar(scene, left + (i % PANEL.columns) * PANEL.step, PANEL.firstRow + Math.floor(i / PANEL.columns) * PANEL.rowStep, dye);
      jar.on(ObjectEvents.JarDragStart, this.onJarStart, this);
      jar.on(ObjectEvents.JarDrag, this.onJarMove, this);
      jar.on(ObjectEvents.JarDragEnd, this.onJarEnd, this);
      jar.on(ObjectEvents.JarClick, this.onJarClick, this);
      panel.add(jar);
      jar.popIn(120 + Math.min(i, 11) * 45);
      return jar;
    });
  }

  private closePanel(): void {
    if (!this.open) return;
    this.open = false;
    this.cancelDrag();
    const { scene } = this.ctx;
    const panel = this.panel;
    const jars = this.jars;
    this.panel = null;
    this.tip = null;
    this.jars = [];
    if (!panel) return;
    // The bottles do not vanish: they fade as the wardrobe cells pop in.
    for (const j of jars) j.disableInteractive();
    scene.tweens.add({ targets: panel, alpha: 0, duration: 140, onComplete: () => panel.destroy() });
  }

  /** The tab changed while a bottle was in the hand: it goes home. */
  private cancelDrag(): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.ctx.cat.highlightItem(null);
    this.ctx.cat.lookAt(null);
    d.ghost.destroy();
    d.jar.setLifted(false);
  }

  private onJarClick(): void {
    // A tap on a bottle does not dye: the tip pulses and says how (equipping is by dragging, ADR 0008).
    const tip = this.tip;
    if (!tip) return;
    const { scene } = this.ctx;
    scene.tweens.killTweensOf(tip);
    tip.setScale(1);
    scene.tweens.add({ targets: tip, scale: 1.12, duration: 110, yoyo: true, ease: 'Sine.easeOut' });
  }

  // ---- Dragging a bottle -------------------------------------------------------

  private onJarStart(jar: DyeJar, pointer: Phaser.Input.Pointer): void {
    if (this.drag || this.ctx.isDragging() || this.ctx.isLeaving()) return;
    const { scene } = this.ctx;
    const p = profileOf(scene);
    const lift = liftFor(pointer);
    const held = applyLift(pointer, lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    const size = GHOST_HEIGHT / 176;
    const ghost = scene.add.image(pointer.x, pointer.y, dyeKey(jar.dye.id)).setOrigin(0.5).setScale(size).setDepth(5000);
    // Uncorking: the bottle grows and tilts a little, with a "pop".
    scene.tweens.add({
      targets: ghost, scale: size * (1 + 0.15 * p.squash), angle: 8 * p.shake, duration: 150, ease: p.ease('Back.easeOut'),
      onComplete: () => { if (this.drag?.ghost === ghost) this.drag.grabbing = false; },
    });
    this.drag = { jar, dye: jar.dye, ghost, pointerId: pointer.id, lift, held, pos: { x: pointer.x, y: pointer.y }, angle: 0, grabbing: true, target: null, lastLook: 0, dripMs: 0 };
    getAudio(scene).play(SfxKeys.Uncork);
    jar.setLifted(true);
    this.ctx.cat.lookAt(held);
    // The dyed textures are made while the player is still dragging: by the drop they are usually there.
    if (jar.dye.id !== WATER_ID) for (const id of Object.values(this.ctx.getOutfit())) this.warm(id, jar.dye.id);
  }

  private onJarMove(_jar: DyeJar, pointer: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || !isDragPointer(d.pointerId, pointer.id)) return;
    const { cat, scene } = this.ctx;
    const held = applyLift(pointer, d.lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    d.held = held;
    const under = cat.itemAt(held);
    const target = under?.dyeable ? under : null;
    if (target?.id !== d.target?.id) {
      d.target = target;
      // The finger hides the garment, so the halo says where the color will go.
      cat.highlightItem(target?.id ?? null);
      if (target) this.warm(target.id, d.dye.id);
    }
    if (scene.time.now - d.lastLook > 90) {
      d.lastLook = scene.time.now;
      cat.lookAt(held);
    }
  }

  private onJarEnd(_jar: DyeJar, pointer: Phaser.Input.Pointer): void {
    const d = this.drag;
    if (!d || !isDragPointer(d.pointerId, pointer.id)) return;
    this.drag = null;
    const { cat } = this.ctx;
    const held = applyLift(pointer, d.lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    cat.highlightItem(null);
    cat.lookAt(null);
    const zone = cat.getDropZoneRect();
    const result = resolveDyeDrop(cat.itemAt(held), isInsideDropZone(held, zone, CAT_MARGIN));
    this.last = result.kind;
    if (result.kind === 'dye') this.dyeItem(d, result.item);
    else if (result.kind === 'notDyeable') this.refuse(d, dyeLines.notDyeable);
    else if (result.kind === 'noItem') {
      cat.sayNo();
      this.refuse(d, dyeLines.notMe);
    } else this.sendBack(d);
  }

  /** The bottle eases toward the finger, leans with its speed and drips (a few drops a second). */
  private follow(d: JarDrag, delta: number): void {
    const { scene } = this.ctx;
    const p = profileOf(scene);
    const before = d.pos.x;
    d.pos.x += (d.held.x - d.pos.x) * 0.4;
    d.pos.y += (d.held.y - d.pos.y) * 0.4;
    if (!d.grabbing) d.angle = tiltToward(d.angle, d.pos.x - before, delta, p.shake);
    d.ghost.setPosition(d.pos.x, d.pos.y);
    if (!d.grabbing) d.ghost.setAngle(d.angle);
    d.dripMs += delta;
    if (d.dripMs >= p.every(DRIP_EVERY_MS) && p.loops) {
      d.dripMs = 0;
      this.drip(d);
    }
  }

  private drip(d: JarDrag): void {
    const { scene } = this.ctx;
    // The water drips white and clear; a dye drips its own color. The drop falls from the neck of the bottle.
    const drop = scene.add.image(d.pos.x + 4, d.pos.y + GHOST_HEIGHT * 0.32, TextureKeys.Drop).setTint(colorToNumber(d.dye.hex)).setDepth(4990).setScale(0.5);
    scene.tweens.add({ targets: drop, y: drop.y + 130, alpha: 0, scale: 0.3, duration: 520, ease: 'Quad.easeIn', onComplete: () => drop.destroy() });
  }

  // ---- The drop ----------------------------------------------------------------

  /** Makes the dyed texture in the background (a failure here is told at the drop, not now). */
  private warm(itemId: string, dyeId: string): void {
    const item = this.ctx.catalog.clothes.find((c) => c.id === itemId);
    if (!item?.dyeable || dyeId === WATER_DYE) return;
    getDye(this.ctx.scene).ensure(itemId, dyeId).catch(() => undefined);
  }

  private dyeItem(d: JarDrag, item: ClothingDef): void {
    const { scene, cat } = this.ctx;
    const anchor = cat.getAnchorWorld(anchorForSlot(item.slot));
    // The bottle empties over the item: it flies to it, shrinking, and fades.
    this.fly(d, anchor, { scale: 0.5, alpha: 0 }, 160, 'Quad.easeIn', () => d.ghost.destroy());
    d.jar.setLifted(false);
    getDye(scene).ensure(item.id, d.dye.id).then(
      () => this.land(d.dye, item, anchor),
      (err: unknown) => {
        // The color could not be made: the item keeps the one it had and the cell gets its bottle back.
        console.warn(`[dye] could not dye ${item.id} with ${d.dye.id}`, err);
        if (d.jar.active !== false) d.jar.receivePop();
      },
    );
  }

  /** The texture is ready: the color is saved (the registry listener shows it on the cat) and the cat and the room answer. */
  private land(dye: DyeDef, item: ClothingDef, anchor: Point): void {
    if (!this.alive) return;
    const { scene, cat } = this.ctx;
    const session = readSession(scene.registry);
    scene.registry.set(RegistryKeys.ItemDye, applyDye(session.itemDye, item.id, dye.id));
    const p = profileOf(scene);
    getAudio(scene).play(SfxKeys.Blup);
    cat.squash();
    cat.lookAtBelly(900);
    this.splash(dye, anchor, p);
    scene.events.emit(DressUpEvents.ItemDyed, item, dye.id);
  }

  /** The splash: a flat burst of the color (the art is white, it takes the hex of the dye) and a few drops that fly out. */
  private splash(dye: DyeDef, at: Point, p: ReturnType<typeof profileOf>): void {
    const { scene } = this.ctx;
    const color = colorToNumber(dye.id === WATER_ID ? Ink.cielo : dye.hex);
    const burst = scene.add.image(at.x, at.y, TextureKeys.Splash).setTint(color).setDepth(4800).setScale(p.reduced ? 1 : 0.4).setAlpha(0.95);
    scene.tweens.add({ targets: burst, scale: 1.15, alpha: 0, duration: p.reduced ? 260 : 420, ease: 'Sine.easeOut', onComplete: () => burst.destroy() });
    if (p.count(10) <= 0) return;
    const drops = scene.add.particles(at.x, at.y, TextureKeys.Drop, {
      emitting: false, speed: { min: 90, max: 260 }, angle: { min: 0, max: 360 }, lifespan: 700, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, tint: color,
    }).setDepth(4801);
    drops.explode(p.count(10));
    this.later(800, () => drops.destroy());
  }

  /** The bottle goes home (with a bounce) and the cat or a bubble says why. */
  private refuse(d: JarDrag, line: string | null): void {
    const { cat } = this.ctx;
    if (line) {
      const head = cat.getAnchorWorld('head');
      this.say(line, head.x + 120, head.y - 70);
    }
    if (this.alive) this.sendBack(d);
  }

  private sendBack(d: JarDrag): void {
    const { scene } = this.ctx;
    const home = d.jar.getCenter();
    getAudio(scene).play(SfxKeys.Return);
    d.ghost.setAlpha(1);
    this.fly(d, home, { scale: 0.6, alpha: 1 }, BOUNCE_BACK_MS, profileOf(scene).ease('Back.easeOut'), () => {
      d.ghost.destroy();
      if (d.jar.active !== false) {
        d.jar.setLifted(false);
        d.jar.receivePop();
      }
    });
  }

  /** Flies the ghost of the bottle to a point (its size times `scale`, ending at `alpha`) and counts it as busy while it flies. */
  private fly(d: JarDrag, to: Point, end: { scale: number; alpha: number }, ms: number, ease: string, done: () => void): void {
    const { scene } = this.ctx;
    this.flying++;
    scene.tweens.killTweensOf(d.ghost);
    scene.tweens.add({
      targets: d.ghost, x: to.x, y: to.y, scale: d.ghost.scale * end.scale, alpha: end.alpha, angle: 0, duration: ms, ease,
      onComplete: () => {
        this.flying = Math.max(0, this.flying - 1);
        done();
      },
    });
  }

  /** The cat's bubble: it pops in by itself, stays a moment and fades. One at a time. */
  private say(text: string, x: number, y: number): void {
    const { scene } = this.ctx;
    this.bubble?.destroy();
    const bubble = new SpeechBubble(scene, x, y, text, { maxWidth: 320 }).setDepth(4100);
    this.bubble = bubble;
    this.later(BUBBLE_MS, () => {
      scene.tweens.add({
        targets: bubble, alpha: 0, y: y - 12, duration: 250,
        onComplete: () => {
          bubble.destroy();
          if (this.bubble === bubble) this.bubble = null;
        },
      });
    });
  }

  // ---- The color on the cat ----------------------------------------------------

  /**
   * Makes the cat show what `itemDye` of the session says: the dyed texture of each item that has a dye and the original of
   * the ones that lost it. It runs on arrival (a dye that came with the session), on every drop and when something else
   * writes the registry (the test hook). A texture that is not made yet is made first; the cat shows it when it is ready.
   */
  private syncAll(): void {
    const { scene, catalog } = this.ctx;
    const wanted = readSession(scene.registry).itemDye;
    const plugin = getDye(scene);
    for (const item of catalog.clothes) {
      if (!item.dyeable) continue;
      const dyeId = wanted[item.id] ?? WATER_DYE;
      const now = this.applied.get(item.id);
      if ((now?.dyeId ?? WATER_DYE) === dyeId) continue;
      if (dyeId === WATER_DYE) {
        this.show(item.id, null, WATER_DYE);
      } else if (plugin.isReady(item.id, dyeId)) {
        this.show(item.id, plugin.keyFor(item.id, dyeId), dyeId);
      } else {
        void plugin.ensure(item.id, dyeId).then(
          (key) => this.alive && (readSession(scene.registry).itemDye[item.id] ?? WATER_DYE) === dyeId && this.show(item.id, key, dyeId),
          (err: unknown) => console.warn(`[dye] could not dye ${item.id} with ${dyeId}`, err),
        );
      }
    }
  }

  /** Puts a texture (or the original, with null) on the cat for the item and holds it in the cache while it is shown. */
  private show(itemId: string, key: string | null, dyeId: string): void {
    const plugin = getDye(this.ctx.scene);
    const old = this.applied.get(itemId);
    if (key === null) this.applied.delete(itemId);
    else {
      plugin.retain(key);
      this.applied.set(itemId, { dyeId, key });
    }
    this.ctx.cat.setItemTexture(itemId, key);
    if (old) plugin.release(old.key);
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(this.ctx.scene.time.delayedCall(ms, fn));
  }
}
