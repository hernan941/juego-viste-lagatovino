import type Phaser from 'phaser';
import type { GameData } from '../../data/schema';
import type { AlbumCompletion } from '../../domain/album';
import type { AlbumTabId } from '../../domain/albumPages';
import type { Progress } from '../../domain/types';

/** What a page of the notebook is given: the data and the paper it may draw on. */
export interface AlbumPageContext {
  catalog: GameData;
  progress: Progress;
  completion: AlbumCompletion;
  /** The cat whose keychain was just hung (`hang` of the scene data): the hanger flies it to its hook when the notebook opens. */
  hang?: string | null;
}

/**
 * A page of the notebook (ADR 0019): one tab, one object. It draws inside a container centered on the middle of the open sheet, in
 * a box of PAGE_AREA px, and the scene adds `view` to the sheet and destroys the page when the player turns away.
 */
export interface AlbumPage {
  readonly view: Phaser.GameObjects.Container;
  destroy(): void;
  /** What the page shows right now, for the e2e hook (ids and states); optional. */
  info?(): Record<string, unknown>;
  /** Called when the notebook opens (the cover is up): a page that has something to show for the visit does it here. */
  reveal?(): void | Promise<void>;
}

export type AlbumPageFactory = (scene: Phaser.Scene, tab: AlbumTabId, ctx: AlbumPageContext) => AlbumPage;

/** The useful area of the open sheet, in game px (the art is 1120 x 620 at 0.9; margins already taken out). */
export const PAGE_AREA = { width: 900, height: 480 } as const;
