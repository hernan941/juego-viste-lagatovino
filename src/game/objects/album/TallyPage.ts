import Phaser from 'phaser';
import { Fonts, Ink } from '../../constants';
import { ALBUM_TABS, pageTally } from '../../domain/albumPages';
import { albumLines } from '../../domain/copy';
import type { AlbumPage, AlbumPageContext } from './AlbumPage';
import type { AlbumTabId } from '../../domain/albumPages';

/**
 * The page every tab has until its own one exists (F17.3 and F17.4 replace it): the name of the section in a hand-written
 * title and how many entries are got, so the notebook is already worth opening.
 */
export class TallyPage extends Phaser.GameObjects.Container implements AlbumPage {
  constructor(scene: Phaser.Scene, tab: AlbumTabId, ctx: AlbumPageContext) {
    super(scene, 0, 0);
    const def = ALBUM_TABS.find((t) => t.id === tab)!;
    const title = scene.add.text(0, -60, def.label, { fontFamily: Fonts.Title, fontSize: '72px', color: Ink.tinta, padding: { x: 4, y: 10 } }).setOrigin(0.5);
    const tally = scene.add.text(0, 30, albumLines.tally(pageTally(tab, ctx.completion.sections)), { fontFamily: Fonts.Voice, fontSize: '56px', color: Ink.lapiz, padding: { x: 4, y: 10 } }).setOrigin(0.5);
    this.add([title, tally]);
    scene.add.existing(this);
  }

  get view(): Phaser.GameObjects.Container {
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
