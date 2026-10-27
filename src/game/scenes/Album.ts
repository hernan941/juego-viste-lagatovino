import Phaser from 'phaser';
import { Fonts, GAME_WIDTH, Ink, ObjectEvents, RegistryKeys, SceneKeys, SfxKeys, TextureKeys, colorToNumber } from '../constants';
import type { GameData } from '../data/schema';
import { completedSets, completion, gotOfSection, pendingMilestones, seenIdOf } from '../domain/album';
import { ALBUM_TABS, resolveTab, sectionOf, swipeDirection, turnTo, pageTally, type AlbumTabId } from '../domain/albumPages';
import { albumLines } from '../domain/copy';
import { emptyProgress, markSeen } from '../domain/progress';
import type { Progress } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { AlbumTabs } from '../objects/album/AlbumTabs';
import type { AlbumPage, AlbumPageContext } from '../objects/album/AlbumPage';
import { Cover } from '../objects/album/Cover';
import { MilestoneStamp } from '../objects/album/MilestoneStamp';
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
/** The closed notebook stays this long (a tap opens it sooner) so the number can be read. */
const COVER_MS = 1150;
const OPEN_MS = 160;
const STAMP_AT = { x: BOOK.x, y: 330 };
const STAMP_GAP_MS = 250;
const CONFETTI = [Ink.sol, Ink.rosa, Ink.cielo, Ink.lila, Ink.durazno].map(colorToNumber);

/**
 * Album (S5, ADR 0019): the notebook. It falls tilted onto the paper and straightens up, and its five index tabs, the arrows and a
 * horizontal drag turn the page. It remembers where it came from (`from`, with its `fromData`) and "Volver" hands that state back.
 * Each page is an object of `objects/album/` (a `TallyPage` until its own one exists).
 *
 * It opens on the closed cover ("Llevas el N %" written by hand); then, for every milestone reached that was not celebrated yet
 * (25, 50, 75, 100 %), a stamp slams onto the page with confetti. What a page showed is marked as seen when the player turns away,
 * so its sparkles (✦) are on for the whole visit and off in the next one.
 */
export class Album extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private origin: { from?: unknown; fromData?: unknown } = {};
  private tab: AlbumTabId = 'prendas';
  private hang: string | null = null;
  private ready = false;
  /** The book has finished unfolding (its scaleX goes from 0 to 1): until then every tab is on the same point of the screen. */
  private bookOpen = false;
  private coverOpening = false;
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
  private cover: Cover | null = null;
  private footer: Phaser.GameObjects.Text | null = null;
  private stamp: MilestoneStamp | null = null;
  private stamps: number[] = [];
  private burst: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private swipeFrom: { x: number; y: number } | null = null;
  private readonly onDown = (p: Phaser.Input.Pointer) => { this.swipeFrom = { x: p.x, y: p.y }; };
  private readonly onUp = (p: Phaser.Input.Pointer) => {
    const from = this.swipeFrom;
    this.swipeFrom = null;
    // A tap opens the cover, or sends the stamp off.
    if (this.cover) return this.openCover();
    if (this.stamp) return this.stamp.dismiss();
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
    this.bookOpen = false;
    this.coverOpening = false;
    this.leaving = false;
    this.turning = false;
    this.turns = 0;
    this.page = null;
    this.bubble = null;
    this.cover = null;
    this.footer = null;
    this.stamp = null;
    this.stamps = [];
    this.burst = null;
    this.swipeFrom = null;
  }

  create() {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    this.progress = (this.registry.get(RegistryKeys.Progress) as Progress | undefined) ?? emptyProgress(0);
    this.pageContext = { catalog: this.catalog, progress: this.progress, completion: completion(this.progress, this.catalog), hang: this.hang };

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
    // The notebook arrives closed: the cover falls and the sheet waits underneath until the cover is lifted.
    this.book.setAlpha(0);
    const pageContext = this.pageContext;
    this.cover = new Cover(this, BOOK.x, BOOK.y, {
      pct: pageContext.completion.pct,
      setsDone: completedSets(this.progress, this.catalog).length,
      setsTotal: this.catalog.sets.length,
    }).setDepth(8);
    this.dropIn(this.cover);

    this.back = new Button(this, 90, 50, albumLines.back, { pill: 'primary', width: 130, height: 64, fontSize: 30 }).setDepth(20);
    this.back.on(ObjectEvents.ButtonClick, () => this.leave());
    this.prev = new Button(this, 52, BOOK.y, '‹', { pill: 'secondary', width: 88, height: 88, fontSize: 56 }).setDepth(20);
    this.prev.on(ObjectEvents.ButtonClick, () => this.turnBy(-1));
    this.next = new Button(this, GAME_WIDTH - 52, BOOK.y, '›', { pill: 'secondary', width: 88, height: 88, fontSize: 56 }).setDepth(20);
    this.next.on(ObjectEvents.ButtonClick, () => this.turnBy(1));
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 50).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 50).setDepth(50);
    // The same number, written at the foot of the sheet once the cover is up (the cover already says it).
    this.footer = this.add
      .text(GAME_WIDTH / 2, 686, albumLines.percent(this.pageContext.completion.pct), { fontFamily: Fonts.Voice, fontSize: '34px', color: Ink.tinta, padding: { x: 4, y: 8 } })
      .setOrigin(0.5)
      .setDepth(6)
      .setAlpha(0);

    this.input.on('pointerdown', this.onDown);
    this.input.on('pointerup', this.onUp);
    this.input.keyboard?.on('keydown-LEFT', this.onLeft);
    this.input.keyboard?.on('keydown-RIGHT', this.onRight);
    this.input.keyboard?.on('keydown-ESC', this.onEscape);

    this.time.delayedCall(COVER_MS, () => this.openCover());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanUp());
    transitionIn(this, this.enter, () => undefined);
  }

  /** The closed notebook falls tilted and straightens up (Back.easeOut); with reduced motion it only fades in. */
  private dropIn(cover: Cover) {
    getAudio(this).play(SfxKeys.Paper);
    const p = profileOf(this);
    cover.setAlpha(0);
    if (p.reduced) {
      this.tweens.add({ targets: cover, alpha: 1, duration: 250 });
      return;
    }
    cover.setAngle(-7).setY(BOOK.y - 90);
    this.tweens.add({ targets: cover, alpha: 1, angle: 0, y: BOOK.y, duration: 520, ease: p.ease('Back.easeOut') });
  }

  /** The cover is lifted away (a tap, or its time is up). Once. */
  private openCover() {
    const cover = this.cover;
    if (!cover || this.coverOpening || this.leaving) return;
    this.coverOpening = true;
    getAudio(this).play(SfxKeys.Paper, { volume: 0.8, rate: 1.1 });
    cover.openUp(() => this.revealBook());
  }

  /** The sheet opens where the cover was; from now on the page can be turned and the milestones are told. */
  private revealBook() {
    this.cover = null;
    this.coverOpening = false;
    if (this.leaving) return;
    if (profileOf(this).reduced) {
      this.tweens.add({ targets: this.book, alpha: 1, duration: OPEN_MS, onComplete: () => { this.bookOpen = true; } });
    } else {
      this.book.setAlpha(1).setScale(0, 1);
      this.tweens.add({ targets: this.book, scaleX: 1, duration: OPEN_MS, ease: 'Sine.easeOut', onComplete: () => { this.bookOpen = true; } });
    }
    this.tweens.add({ targets: this.footer, alpha: 1, duration: 300 });
    this.ready = true;
    // A page with something to show for this visit (the hanger flies the keychain that was just hung) does it now that it is seen.
    void this.page?.reveal?.();
    this.stamps = pendingMilestones(this.latest(), this.catalog);
    // Written down at once: leaving in the middle of the celebration does not repeat it.
    this.save(markSeen(this.latest(), this.stamps.map(seenIdOf.milestone)));
    this.nextStamp();
  }

  /** The stamps come one at a time. */
  private nextStamp() {
    if (this.stamp || this.leaving || this.stamps.length === 0) return;
    const pct = this.stamps.shift()!;
    this.stamp = new MilestoneStamp(this, STAMP_AT.x, STAMP_AT.y, pct, {
      onLand: () => this.stampLanded(),
      onDone: () => {
        this.stamp = null;
        this.time.delayedCall(STAMP_GAP_MS, () => this.nextStamp());
      },
    }).setDepth(40);
  }

  /** The stamp hits the paper: a thud, the notebook jolts, confetti and sparkles fly. */
  private stampLanded() {
    const p = profileOf(this);
    getAudio(this).play(SfxKeys.Stamp);
    this.time.delayedCall(120, () => getAudio(this).play(SfxKeys.Tape, { volume: 0.7 }));
    if (p.shake > 0) {
      this.tweens.add({ targets: this.book, angle: { from: -1.4 * p.shake, to: 0 }, y: BOOK.y + 6, duration: 220, ease: 'Back.easeOut', onComplete: () => this.book.setY(BOOK.y) });
    }
    this.burst ??= this.add
      .particles(0, 0, TextureKeys.Confetti, {
        emitting: false, speed: { min: 220, max: 560 }, angle: { min: -160, max: -20 }, gravityY: 720,
        lifespan: { min: 900, max: 1500 }, scale: { start: 1.3, end: 0.8 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, tint: CONFETTI,
      })
      .setDepth(41);
    this.burst.explode(p.count(40), STAMP_AT.x, STAMP_AT.y);
  }

  private latest(): Progress {
    return (this.registry.get(RegistryKeys.Progress) as Progress | undefined) ?? this.progress;
  }

  /** Writes the progress to the registry (which saves it) when it changed. */
  private save(next: Progress) {
    if (next !== this.latest()) this.registry.set(RegistryKeys.Progress, next);
  }

  /** What a page showed is seen once the player turns away from it (only after the cover, so a quick exit sees nothing). */
  private markPageSeen(tab: AlbumTabId) {
    if (!this.ready) return;
    const progress = this.latest();
    this.save(markSeen(progress, gotOfSection(sectionOf(tab), progress, this.catalog)));
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
    this.markPageSeen(this.tab);
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

  /** A tab that is off (none is since F19.5): a little bubble says so and goes away. */
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
    this.markPageSeen(this.tab);
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.cover?.destroy();
    this.stamp?.destroy();
    this.burst?.destroy();
    this.cover = null;
    this.stamp = null;
    this.burst = null;
    this.stamps = [];
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
    const sets = this.pageContext ? completedSets(this.progress, this.catalog) : [];
    const tally = c.sections ? pageTally(this.tab, c.sections) : { got: 0, total: 0 };
    const points: UiState['points'] = {};
    for (const [id, pos] of Object.entries(this.tabs?.getTabPositions() ?? {})) points[`tab-${id}`] = pos;
    return {
      ready: this.ready && this.bookOpen && !this.leaving && !this.turning,
      buttons: { back: this.back.getCenter(), prev: this.prev.getCenter(), next: this.next.getCenter() },
      points,
      info: {
        tab: this.tab, tabs: ALBUM_TABS.map((t) => t.id), enabledTabs: ALBUM_TABS.filter((t) => t.enabled).map((t) => t.id),
        from: this.origin.from ?? null, hang: this.hang, turning: this.turning, turns: this.turns,
        pct: c.pct, got: c.got, total: c.total, tally, page: this.page?.info?.() ?? null,
        cover: this.cover !== null, coverPct: this.cover?.shownPct ?? null, sets: { done: sets.length, total: this.catalog?.sets.length ?? 0, ids: sets },
        stamp: this.stamp?.pct ?? null, stampsLeft: this.stamps.length, seen: this.latest().albumSeen.length,
      },
    };
  }
}
