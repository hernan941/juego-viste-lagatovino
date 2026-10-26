// First-use hint (F9, moved from DressUp in F11.14): no tutorial; after 4 s without a drop a ghost garment travels from the
// grid to the cat, every 5 s, until the first drop turns it off for good.
import Phaser from 'phaser';
import { DressUpEvents } from '../../constants';
import { ghostFit } from '../../domain/imageBounds';
import { HintPlanner } from '../../domain/hint';
import { anchorForSlot } from '../../domain/slots';
import { profileOf } from '../../systems/motion';
import type { DressUpContext, DressUpController } from './DressUpController';
import { GHOST_HOME_SIZE, GHOST_SIZE } from './layout';

export class HintController implements DressUpController {
  readonly key = 'hint';
  private ctx!: DressUpContext;
  private planner = new HintPlanner();
  private ghost: Phaser.GameObjects.Image | null = null;
  private shown = 0;

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    // Already dressed (a look that came along): the player knows what to do.
    if (Object.keys(ctx.getOutfit()).length > 0) this.planner.dropped();
    ctx.scene.events.on(DressUpEvents.ItemDropped, this.onDropped, this);
    ctx.scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
  }

  destroy(): void {
    this.ctx.scene.events.off(DressUpEvents.ItemDropped, this.onDropped, this);
    this.ctx.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
    this.ghost?.destroy();
    this.ghost = null;
  }

  e2eState(): { shown: number; done: boolean; showing: boolean } {
    return { shown: this.shown, done: this.planner.done, showing: this.ghost !== null };
  }

  private onDropped(): void {
    this.planner.dropped();
  }

  /** After 4 s without a drop (and every 5 s) the ghost garment plays; a drag, leaving or the ghost itself pause the clock. */
  private onUpdate(_time: number, delta: number): void {
    const busy = this.ctx.isDragging() || this.ctx.isLeaving() || this.ghost !== null;
    if (this.planner.update(delta, busy)) this.play();
  }

  /** The first visible cell's garment, at half opacity, travels along a curve to where it would be worn. */
  private play(): void {
    const { scene, grid, catalog, cat } = this.ctx;
    const id = grid.getVisibleIds()[0];
    const item = id ? catalog.clothes.find((c) => c.id === id) : undefined;
    const from = id ? grid.getCellPositions()[id] : undefined;
    if (!item || !from) return;
    this.shown++;
    const to = cat.getAnchorWorld(anchorForSlot(item.slot));
    const src = scene.textures.get(item.texture).getSourceImage();
    const bounds = this.ctx.boundsOf(item);
    const fit = ghostFit(bounds, src.width, src.height, GHOST_SIZE);
    const home = ghostFit(bounds, src.width, src.height, GHOST_HOME_SIZE);
    const ghost = scene.add.image(from.x, from.y, item.texture).setOrigin(fit.origin.x, fit.origin.y).setScale(home.scale).setDepth(4900).setAlpha(0);
    this.ghost = ghost;
    const p = profileOf(scene);
    // A curve that bows up and away from the straight line; reduced motion goes straight and calm.
    const bend = p.reduced ? 0 : -90;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2((from.x + to.x) / 2, Math.min(from.y, to.y) + bend), new Phaser.Math.Vector2(to.x, to.y),
    );
    const t = { v: 0 };
    const gone = () => {
      ghost.destroy();
      if (this.ghost === ghost) this.ghost = null;
    };
    scene.tweens.add({ targets: ghost, alpha: 0.5, duration: 250 });
    scene.tweens.add({
      targets: t, v: 1, duration: 1300, delay: 150, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const pt = curve.getPoint(t.v);
        ghost.setPosition(pt.x, pt.y).setScale(home.scale + (fit.scale - home.scale) * t.v);
      },
      onComplete: () => {
        scene.tweens.add({ targets: ghost, alpha: 0, duration: 250, onComplete: gone });
      },
    });
  }
}
