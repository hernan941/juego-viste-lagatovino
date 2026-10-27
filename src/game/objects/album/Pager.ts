import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents } from '../../constants';
import { albumLines } from '../../domain/copy/album';
import { Button } from '../Button';

/**
 * The "1 / 2" of a long page, with its two small arrows (the sheet already has big ones for the tabs). Used when a page has more
 * entries than a spread can hold. It calls `onChange(page)` and keeps the arrows quiet at the ends.
 */
export class Pager extends Phaser.GameObjects.Container {
  private page = 0;
  private pages = 1;
  private readonly prevButton: Button;
  private readonly nextButton: Button;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly onChange: (page: number) => void) {
    super(scene, x, y);
    this.prevButton = new Button(scene, -110, 0, '‹', { pill: 'secondary', width: 84, height: 56, fontSize: 44 });
    this.nextButton = new Button(scene, 110, 0, '›', { pill: 'secondary', width: 84, height: 56, fontSize: 44 });
    this.label = scene.add.text(0, 0, '', { fontFamily: Fonts.Voice, fontSize: '30px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    this.add([this.prevButton, this.label, this.nextButton]);
    this.prevButton.on(ObjectEvents.ButtonClick, () => this.prevPage());
    this.nextButton.on(ObjectEvents.ButtonClick, () => this.nextPage());
    scene.add.existing(this);
  }

  /** Shows page `page` of `pages` (0-based), without calling `onChange`. */
  set(page: number, pages: number): void {
    this.page = page;
    this.pages = pages;
    this.label.setText(albumLines.pageOf(page + 1, pages));
    this.prevButton.setAlpha(page > 0 ? 1 : 0.35);
    this.nextButton.setAlpha(page < pages - 1 ? 1 : 0.35);
  }

  nextPage(): void {
    if (this.page < this.pages - 1) this.onChange(this.page + 1);
  }

  prevPage(): void {
    if (this.page > 0) this.onChange(this.page - 1);
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
