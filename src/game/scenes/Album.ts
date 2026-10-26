import Phaser from 'phaser';
import { Fonts, GAME_WIDTH, Ink, ObjectEvents, RegistryKeys, SceneKeys, SfxKeys } from '../constants';
import type { GameData } from '../data/schema';
import { completion } from '../domain/album';
import { ALBUM_TABS, resolveTab, swipeDirection, turnTo, pageTally, type AlbumTabId } from '../domain/albumPages';
import { albumLines } from '../domain/copy';
import { emptyProgress } from '../domain/progress';
import type { Progress } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { AlbumTabs } from '../objects/album/AlbumTabs';
import type { AlbumPage, AlbumPageContext } from '../objects/album/AlbumPage';
import { createPage } from '../objects/album/pages';
import { Button } from '../objects/Button';
import { MotionButton } from '../objects/MotionButton';
import { MuteButton } from '../objects/MuteButton';
import { PaperBackground } from '../objects/kit/PaperBackground';
import { SpeechBubble } from '../objects/kit/SpeechBubble';
import { getAudio } from '../plugins/AudioPlugin';
import { go } from '../systems/navigate';
import { profileOf } from '../systems/motion';
import { enterKind, transitionIn } from '../systems/transitions';

/** The open sheet: its art is 1120 x 620, shown at 0.9 and centered; the tabs hang on its top edge. */
const BOOK = { x: GAME_WIDTH / 2, y: 366, scale: 0.9 };
const SHEET_TOP = -279;
/** Half of a page turn, ms (scaleX 1 to 0 and back, art-direction section 8: 240 in all). */
const FLIP_MS = 120;
const LANDED_MS = 450;

/**
 * Album (S5, ADR 0019): the notebook. It falls tilted onto the paper and straightens up, and its five index tabs, the arrows and a
 * horizontal drag turn the page. It remembers where it came from (`from`, with its `fromData`) and "Volver" hands that state back.
 * Each page is an object of `objects/album/` (a `TallyPage` until its own one exists).
 */
export class Album extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private origin: { from?: unknown; fromData?: unknown } = {};
  private tab: AlbumTabId = 'prendas';
  private hang: string | null = null;
  private ready = false;
  private leaving = false;
  private turning = false;
  private turns = 0;
  private catalog!: GameData;
  private progress!: Progress;
  private pageContext!: AlbumPageContext;
  private book!: Phaser.GameObjects.Container;
  private holder!: Phaser.GameObjects.Container;
  private page: AlbumPage | null = null;
  private tabs!: AlbumTabs;
  private back!: Button;
  private prev!: Button;
  private next!: Button;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private bubble: SpeechBubble | null = null;
  private swipeFrom: { x: number; y: number } | null = null;
  private readonly onDown = (p: Phaser.Input.Pointer) => { this.swipeFrom = { x: p.x, y: p.y }; };
  private readonly onUp = (p: Phaser.Input.Pointer) => {
    const from = this.swipeFrom;
    this.swipeFrom = null;
    if (!from) return;
    const dx = p.x - from.x;
    if (Math.abs(p.y - from.y) < Math.abs(dx)) this.turnBy(swipeDirection(dx));
  };
  private readonly onLeft = () => this.turnBy(-1);
  private readonly onRight = () => this.turnBy(1);
  private readonly onEscape = () => this.leave();

  constructor() {
    super(SceneKeys.Album);
  }

  init(data?: { from?: unknown; fromData?: unknown; tab?: unknown; hang?: unknown; transition?: unknown }) {
    this.enter = enterKind(data);
    this.origin = { from: data?.from, fromData: data?.fromData };
    this.tab = resolveTab(data?.tab);
    this.hang = typeof data?.hang === 'string' ? data.hang : null;
    this.ready = false;
    this.leaving = false;
    this.turning = false;
    this.turns = 0;
    this.page = null;
    this.bubble = null;
    this.swipeFrom = null;
  }

  create() {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    this.progress = (this.registry.get(RegistryKeys.Progress) as Progress | undefined) ?? emptyProgress(0);
    this.pageContext = { catalog: this.catalog, progress: this.progress, completion: completion(this.progress, this.catalog) };

    new PaperBackground(this).setDepth(-1);
    // The notebook: the open sheet, the current page and the tabs hanging on the top edge. It all falls and straightens up as one.
    const sheet = this.add.image(0, 0, 'ui-album-page').setScale(BOOK.scale);
    this.holder = this.add.container(0, 0);
    this.tabs = new AlbumTabs(this, 0, SHEET_TOP + 4, ALBUM_TABS);
    this.book = this.add.container(BOOK.x, BOOK.y, [sheet, this.holder, this.tabs]).setDepth(5);
    this.showPage(this.tab);
    this.tabs.select(this.tab, true);
    this.tabs.on(ObjectEvents.TabSelect, (id: AlbumTabId) => this.turnToTab(id));
    this.tabs.on(ObjectEvents.TabLocked, () => this.sayLocked());
    this.dropIn();

    this.back = new Button(this, 110, 50, albumLines.back, { pill: 'primary', width: 156, height: 64, fontSize: 32 }).setDepth(20);
    this.back.on(ObjectEvents.ButtonClick, () => this.leave());
    this.prev = new Button(this, 52, BOOK.y, '‹', { pill: 'secondary', width: 88, height: 88, fontSize: 56 }).setDepth(20);
    this.prev.on(ObjectEvents.ButtonClick, () => this.turnBy(-1));
    this.next = new Button(this, GAME_WIDTH - 52, BOOK.y, '›', { pill: 'secondary', width: 88, height: 88, fontSize: 56 }).setDepth(20);
    this.next.on(ObjectEvents.ButtonClick, () => this.turnBy(1));
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 50).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 50).setDepth(50);
    this.add
      .text(GAME_WIDTH / 2, 686, albumLines.percent(this.pageContext.completion.pct), { fontFamily: Fonts.Voice, fontSize: '34px', color: Ink.tinta, padding: { x: 4, y: 8 } })
      .setOrigin(0.5)
      .setDepth(6);

    this.input.on('pointerdown', this.onDown);
    this.input.on('pointerup', this.onUp);
    this.input.keyboard?.on('keydown-LEFT', this.onLeft);
    this.input.keyboard?.on('keydown-RIGHT', this.onRight);
    this.input.keyboard?.on('keydown-ESC', this.onEscape);

    this.time.delayedCall(LANDED_MS, () => {
      this.ready = true;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
    transitionIn(this, this.enter, () => undefined);
  }

  /** The notebook falls tilted and straightens up (Back.easeOut); with reduced motion it only fades in. */
  private dropIn() {
    getAudio(this).play(SfxKeys.Paper);
    const p = profileOf(this);
    this.book.setAlpha(0);
    if (p.reduced) {
      this.tweens.add({ targets: this.book, alpha: 1, duration: 250 });
      return;
    }
    this.book.setAngle(-7).setY(BOOK.y - 90);
    this.tweens.add({ targets: this.book, alpha: 1, angle: 0, y: BOOK.y, duration: 520, ease: p.ease('Back.easeOut') });
  }

  private showPage(tab: AlbumTabId) {
    this.page?.destroy();
    this.tab = tab;
    this.page = createPage(this, tab, this.pageContext);
    this.holder.add(this.page.view);
  }

  /** The arrows and the keys: one tab forward (1) or back (-1). */
  private turnBy(dir: 1 | -1 | 0) {
    if (dir === 0 || !this.ready || this.leaving || this.turning) return;
    const to = turnTo(this.tab, dir);
    if (to === this.tab) return;
    this.tabs.select(to, true);
    this.turnToTab(to);
  }

  /** The sheet flips: it narrows to nothing, the page is swapped and it opens again (240 ms and a paper sound). */
  private turnToTab(id: AlbumTabId) {
    if (this.turning || this.leaving || id === this.tab) return;
    this.turning = true;
    this.turns++;
    getAudio(this).play(SfxKeys.Paper);
    const reduced = profileOf(this).reduced;
    const hide = reduced ? { alpha: 0 } : { scaleX: 0 };
    const show = reduced ? { alpha: 1 } : { scaleX: 1 };
    this.tweens.add({
      targets: this.holder, ...hide, duration: FLIP_MS, ease: 'Sine.easeIn',
      onComplete: () => {
        this.showPage(id);
        this.tweens.add({ targets: this.holder, ...show, duration: FLIP_MS, ease: 'Sine.easeOut', onComplete: () => { this.turning = false; } });
      },
    });
  }

  /** The hanger is off until F19.5: a little bubble says so and goes away. */
  private sayLocked() {
    this.bubble?.destroy();
    this.bubble = new SpeechBubble(this, GAME_WIDTH / 2 + 300, 150, albumLines.hangerSoon).setDepth(30);
    const bubble = this.bubble;
    this.time.delayedCall(1600, () => {
      bubble.destroy();
      if (this.bubble === bubble) this.bubble = null;
    });
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    go(this, 'back', this.origin);
  }

  private cleanUp() {
    this.input.off('pointerdown', this.onDown);
    this.input.off('pointerup', this.onUp);
    this.input.keyboard?.off('keydown-LEFT', this.onLeft);
    this.input.keyboard?.off('keydown-RIGHT', this.onRight);
    this.input.keyboard?.off('keydown-ESC', this.onEscape);
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.bubble?.destroy();
    this.page?.destroy();
    this.tabs?.destroy();
    this.back?.destroy();
    this.prev?.destroy();
    this.next?.destroy();
    this.mute?.destroy();
    this.motion?.destroy();
    this.bubble = null;
    this.page = null;
  }

  getE2EUi(): UiState {
    const { completion: c } = this.pageContext ?? { completion: { got: 0, total: 0, pct: 0, sections: undefined } };
    const tally = c.sections ? pageTally(this.tab, c.sections) : { got: 0, total: 0 };
    const points: UiState['points'] = {};
    for (const [id, pos] of Object.entries(this.tabs?.getTabPositions() ?? {})) points[`tab-${id}`] = pos;
    return {
      ready: this.ready && !this.leaving && !this.turning,
      buttons: { back: this.back.getCenter(), prev: this.prev.getCenter(), next: this.next.getCenter() },
      points,
      info: {
        tab: this.tab, tabs: ALBUM_TABS.map((t) => t.id), enabledTabs: ALBUM_TABS.filter((t) => t.enabled).map((t) => t.id),
        from: this.origin.from ?? null, hang: this.hang, turning: this.turning, turns: this.turns,
        pct: c.pct, got: c.got, total: c.total, tally,
      },
    };
  }
}
