// The notebook button of the fitting room (F17.6, S5): a stamp at the top, left of the room. Pressing it opens the album and hands it the
// tab and the scroll of the grid, so "Volver" finds the fitting room as it was (the outfit and the cat already live in the registry). The
// sparkle on its corner says there is something new inside. It does not open with a garment in the hand nor while the player is leaving.
import { ObjectEvents, RegistryKeys, SceneKeys } from '../../constants';
import type { GameData } from '../../data/schema';
import { albumHasNews } from '../../domain/album';
import { albumArgs, dressUpAlbumData } from '../../domain/flow';
import type { Point, Progress } from '../../domain/types';
import { go } from '../../systems/navigate';
import { NotebookButton } from '../NotebookButton';
import type { DressUpContext, DressUpController } from './DressUpController';
import { ALBUM_BUTTON_AT } from './layout';

export { ALBUM_BUTTON_AT };

export class AlbumButtonController implements DressUpController {
  readonly key = 'album';
  private ctx!: DressUpContext;
  private button: NotebookButton | null = null;
  private opening = false;

  /** Whether the album has entries the player has not seen. The context's `Catalog` is the first-stage view of the registry's `GameData`. */
  private hasNews(): boolean {
    const { registry } = this.ctx.scene;
    const progress = registry.get(RegistryKeys.Progress) as Progress | undefined;
    const catalog = registry.get(RegistryKeys.Catalog) as GameData | undefined;
    return progress && catalog ? albumHasNews(progress, catalog) : false;
  }

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    const news = this.hasNews();
    this.button = new NotebookButton(ctx.scene, ALBUM_BUTTON_AT.x, ALBUM_BUTTON_AT.y, news).setDepth(31);
    this.button.on(ObjectEvents.NotebookPress, this.open);
  }

  destroy(): void {
    this.button?.off(ObjectEvents.NotebookPress, this.open);
    this.button?.destroy();
    this.button = null;
  }

  e2eState(): { button: Point; news: boolean; opening: boolean } {
    return {
      button: this.button?.getCenter() ?? ALBUM_BUTTON_AT,
      news: this.hasNews(),
      opening: this.opening,
    };
  }

  isSettled(): boolean {
    return true;
  }

  private readonly open = (): void => {
    const { scene, tabs, grid } = this.ctx;
    if (this.opening || this.ctx.isDragging() || this.ctx.isLeaving()) return;
    this.opening = true;
    go(scene, 'album', albumArgs(SceneKeys.DressUp, dressUpAlbumData(tabs.selectedId, grid.getViewport().scroll)));
  };
}
