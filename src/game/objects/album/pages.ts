import type Phaser from 'phaser';
import type { AlbumTabId } from '../../domain/albumPages';
import type { AlbumPage, AlbumPageContext, AlbumPageFactory } from './AlbumPage';
import { TallyPage } from './TallyPage';

/**
 * Where each tab registers its own page (one line per feature: F17.3 prendas and tintes, F17.4 gatos and looks, F19.5 colgador).
 * A tab without an entry shows the `TallyPage`.
 */
export const PAGE_FACTORIES: Partial<Record<AlbumTabId, AlbumPageFactory>> = {};

export function createPage(scene: Phaser.Scene, tab: AlbumTabId, ctx: AlbumPageContext): AlbumPage {
  const factory = PAGE_FACTORIES[tab];
  return factory ? factory(scene, tab, ctx) : new TallyPage(scene, tab, ctx);
}
