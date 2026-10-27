import Phaser from 'phaser';
import { Fonts, GAME_WIDTH, Ink, SfxKeys, TextureKeys } from '../../constants';
import { SKIP_FACTOR, skip, type CeremonyPlan, type CeremonyStep } from '../../domain/ceremony';
import { judgeLines, noveltyNote } from '../../domain/copy';
import type { CharacterDef, NextHint, Point, TagNames } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import type { Cat } from '../Cat';
import { ButtonFlight } from './ButtonFlight';
import { EventNotes } from './EventNotes';
import { JudgeCharacter } from './JudgeCharacter';
import { RatingCard } from './RatingCard';
import { StarStamps } from './StarStamps';

/** The part of the cat the ceremony touches: only the expression and the joy. */
export type CeremonyCat = Pick<Cat, 'hold' | 'release' | 'hop' | 'heartbeat'>;

export interface CeremonyLayout {
  /** The middle of the feet of the judge. */
  judgeAt: Point;
  /** The center of the card of the lines; the stars are stamped on its lower part. */
  cardAt: Point;
  /** The center of the row of notes, and how wide the row may be. */
  notesAt: Point;
  notesWidth: number;
  /** Where the buttons leave (the notebook) and where they land (the purse). */
  buttonsFrom: Point;
  wallet: Point;
  /** Where the confetti of a 5 star look starts to fall. */
  confettiAt: Point;
}

/** A layout for the 1280 x 720 canvas: the judge and his card on the right, the notes below. The scene can move any of it. */
export const DEFAULT_LAYOUT: CeremonyLayout = {
  judgeAt: { x: 1060, y: 716 },
  cardAt: { x: 900, y: 205 },
  notesAt: { x: 380, y: 120 },
  notesWidth: 450,
  buttonsFrom: { x: 1060, y: 680 },
  wallet: { x: 1180, y: 48 },
  confettiAt: { x: 420, y: -10 },
};

export interface CeremonyTargets {
  cat: CeremonyCat;
  catName: string;
  /** The judge, from brand.json (name and texture). */
  judge: CharacterDef;
  layout?: Partial<CeremonyLayout>;
  /** Turns a combo id into its name for the card. */
  comboName?: (id: string) => string;
  /** The clue for 3-4 stars (what is missing for the next one), from `nextHint`. */
  hint?: NextHint | null;
  /** The readable tags (tags.json) for the card and the notes. */
  tags?: TagNames;
  /** A button landed: `credit` buttons to add to the counter, `total` landed so far. */
  onCredit?: (credit: number, total: number) => void;
  /** A step of the plan starts (the e2e hook reads it as `ceremonyStep`). */
  onStep?: (step: CeremonyStep) => void;
  /** A tap or click skips x3 (default true). Turn it off if the scene wants to handle the tap itself and call `skip()`. */
  skipOnTap?: boolean;
  /** Depth of the card: everything else stacks from here. */
  depth?: number;
}

/** Wait this long after the last step before resolving, so the last tween has landed. */
const END_PAD_MS = 50;
const SECOND_PURR_MS = 450;

/**
 * Plays a `ceremonyPlan` (F15.2): the judge slides in, the card writes the lines, the stars are stamped, the cat reacts, the
 * buttons fly to the purse and the notes fall in. It builds its objects when their step comes and owns them until `destroy()`.
 *
 *   const ceremony = new Ceremony(scene, plan, { cat, catName, judge: brand.judge, onCredit });
 *   await ceremony.play();   // resolves at the end, or as soon as it is destroyed
 *
 * A tap skips x3 (`skip()`): nothing is dropped, so every button still lands and every note is still shown. It cleans up by
 * itself when the scene shuts down. It does not save anything: apply the progress BEFORE playing it (ADR 0017).
 */
export class Ceremony {
  finished = false;
  skipped = false;
  destroyed = false;
  private plan: CeremonyPlan;
  private readonly layout: CeremonyLayout;
  private readonly ran = new Set<number>();
  /** The timers of the steps (a skip puts them on the clock again). */
  private timers: Phaser.Time.TimerEvent[] = [];
  /** Timers of the side effects (second purr, confetti cleanup): a skip leaves them alone. */
  private sideTimers: Phaser.Time.TimerEvent[] = [];
  private promise?: Promise<void>;
  private resolve?: () => void;
  private startedAt = 0;
  private landed = 0;
  private speed = 1;
  private judge?: JudgeCharacter;
  private card?: RatingCard;
  private stamps?: StarStamps;
  private notes?: EventNotes;
  private flight?: ButtonFlight;
  private labels: Phaser.GameObjects.Text[] = [];
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    plan: CeremonyPlan,
    private readonly targets: CeremonyTargets,
  ) {
    this.plan = plan;
    this.layout = { ...DEFAULT_LAYOUT, ...targets.layout };
  }

  /** Buttons that already landed, and those still in the air: the scene can close the counter if it leaves early. */
  get creditedCoins(): number {
    return this.landed;
  }
  get remainingCoins(): number {
    return this.plan.coins - this.landed;
  }

  /** Starts the ceremony. Calling it again returns the same promise. */
  play(): Promise<void> {
    if (this.promise) return this.promise;
    this.promise = new Promise<void>((resolve) => { this.resolve = resolve; });
    const scene = this.scene;
    this.startedAt = scene.time.now;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    if (this.targets.skipOnTap !== false) scene.input.on('pointerdown', this.onTap);
    this.flight = new ButtonFlight(scene);
    const noteCount = this.plan.steps.filter((s) => s.kind === 'note').length;
    if (noteCount > 0) {
      const at = this.layout.notesAt;
      this.notes = new EventNotes(scene, at.x, at.y, { count: noteCount, maxWidth: this.layout.notesWidth, tags: this.targets.tags });
      this.notes.setDepth(this.depth + 3);
    }
    this.schedule(0);
    return this.promise;
  }

  /** The tap: x3 from here to the end, once. */
  skip(): void {
    if (this.skipped || this.finished || this.destroyed || !this.promise) return;
    this.skipped = true;
    this.scene.input.off('pointerdown', this.onTap);
    const now = this.scene.time.now - this.startedAt;
    this.plan = skip(this.plan, now);
    this.cancelTimers();
    this.speed = SKIP_FACTOR;
    for (const o of [this.judge, this.card, this.stamps, this.notes, this.flight]) o?.speedUp(SKIP_FACTOR);
    this.schedule(now);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelTimers();
    for (const t of this.sideTimers) t.remove();
    this.sideTimers = [];
    this.scene.input?.off('pointerdown', this.onTap);
    this.scene.events?.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    for (const e of this.emitters) e.destroy();
    this.emitters.length = 0;
    for (const l of this.labels) {
      this.scene.tweens?.killTweensOf(l);
      l.destroy();
    }
    this.labels = [];
    for (const o of [this.judge, this.card, this.stamps, this.notes, this.flight]) o?.destroy();
    this.resolve?.();
  }

  private readonly onTap = (): void => this.skip();
  private readonly onShutdown = (): void => this.destroy();

  private get depth(): number {
    return this.targets.depth ?? 3000;
  }

  private cancelTimers(): void {
    for (const t of this.timers) t.remove();
    this.timers = [];
  }

  /** Puts the steps that have not started on the clock. `from` is the ms of the ceremony we are at. */
  private schedule(from: number): void {
    this.plan.steps.forEach((step, i) => {
      if (this.ran.has(i)) return;
      this.timers.push(this.scene.time.delayedCall(Math.max(0, step.at - from), () => this.run(i)));
    });
    this.timers.push(this.scene.time.delayedCall(Math.max(0, this.plan.totalMs - from) + END_PAD_MS, () => this.finish()));
  }

  private finish(): void {
    if (this.finished || this.destroyed) return;
    this.finished = true;
    this.scene.input.off('pointerdown', this.onTap);
    this.resolve?.();
  }

  private fast<T extends { speedUp(factor: number): void }>(obj: T): T {
    if (this.speed > 1) obj.speedUp(this.speed);
    return obj;
  }

  private run(i: number): void {
    if (this.destroyed) return;
    this.ran.add(i);
    const step = this.plan.steps[i]!;
    this.targets.onStep?.(step);
    const scene = this.scene;
    const L = this.layout;
    switch (step.kind) {
      case 'judgeEnter': {
        const judge = new JudgeCharacter(scene, L.judgeAt.x, L.judgeAt.y, { texture: this.targets.judge.texture });
        judge.setDepth(this.depth + 2);
        this.judge = this.fast(judge);
        judge.enter(step.ms, step.slide, () => { if (!this.destroyed) judge.say(judgeLines(this.targets.judge).intro()); });
        const card = new RatingCard(scene, L.cardAt.x, L.cardAt.y, { comboName: this.targets.comboName, tags: this.targets.tags });
        card.setDepth(this.depth);
        this.card = this.fast(card);
        const stamps = new StarStamps(scene, L.cardAt.x, L.cardAt.y + 138, { total: 5 });
        stamps.setDepth(this.depth + 1);
        this.stamps = this.fast(stamps);
        break;
      }
      case 'line':
        this.card?.showLine(step.index, step.line, step.ms);
        break;
      case 'stamp':
        this.stamps?.stamp(step.index, { ms: step.ms, shake: step.shake, golden: step.golden });
        break;
      case 'reaction':
        this.react(step.reaction);
        break;
      case 'coin':
        if (step.index === 0) this.noveltyLabel();
        this.flight?.fly(
          { index: step.index, from: L.buttonsFrom, to: L.wallet, ms: step.ms, credit: step.credit, fly: step.fly },
          (credit) => {
            this.landed += credit;
            this.targets.onCredit?.(credit, this.landed);
          },
        );
        break;
      case 'note':
        this.notes?.addNote(step.index, step.event, step.ms);
        break;
    }
  }

  /** "Propina +2" / "Casi igual +5": a repeated look pays little, and the player is told why. */
  private noveltyLabel(): void {
    const text = noveltyNote(this.plan.novelty, this.plan.coins);
    if (!text) return;
    const scene = this.scene;
    const p = profileOf(scene);
    const at = this.layout.buttonsFrom;
    const label = scene.add
      .text(at.x, at.y - 40, text, { fontFamily: Fonts.Title, fontSize: '30px', color: Ink.lapiz, padding: { x: 4, y: 8 } })
      .setOrigin(0.5)
      .setDepth(this.depth + 3)
      .setAlpha(0);
    this.labels.push(label);
    const done = () => { this.labels = this.labels.filter((l) => l !== label); label.destroy(); };
    scene.tweens.add({ targets: label, alpha: 1, y: at.y - (p.reduced ? 40 : 90), duration: 300 / this.speed, ease: p.ease('Back.easeOut'), hold: 900 / this.speed, onComplete: () => {
      scene.tweens.add({ targets: label, alpha: 0, duration: 300 / this.speed, onComplete: done });
    } });
  }

  /** The cat shows its stars: face, joy, purr, and confetti for five. The judge answers. */
  private react(reaction: Extract<CeremonyStep, { kind: 'reaction' }>['reaction']): void {
    const { cat, catName } = this.targets;
    const scene = this.scene;
    const p = profileOf(scene);
    const audio = getAudio(scene);
    const lines = judgeLines(this.targets.judge);
    cat.hold(reaction.expression);
    if (reaction.purr !== 'none') {
      audio.play(SfxKeys.Purr, { volume: reaction.purr === 'long' ? 1 : 0.7 });
      if (reaction.purr === 'long') this.sideTimers.push(scene.time.delayedCall(SECOND_PURR_MS, () => audio.play(SfxKeys.Purr, { volume: 0.8, rate: 0.92 })));
    }
    if (!reaction.comfort) {
      cat.hop();
      this.judge?.hop();
    }
    if (reaction.expression === 'amor') cat.heartbeat();
    this.judge?.say(lines.say({ catName, stars: this.plan.stars, bare: this.plan.bare, novelty: this.plan.novelty, hint: this.targets.hint, tags: this.targets.tags }));
    if (reaction.confetti) this.confetti(p.count(36));
  }

  /** A shower of confetti and ink sparkles from the top. */
  private confetti(count: number): void {
    const scene = this.scene;
    const p = profileOf(scene);
    const at = this.layout.confettiAt;
    for (const texture of [TextureKeys.Confetti, TextureKeys.InkSparkle]) {
      const emitter = scene.add
        .particles(0, 0, texture, {
          emitting: false, speedY: { min: 60, max: 220 }, speedX: { min: -80, max: 80 },
          gravityY: 260, lifespan: { min: 1200, max: 2000 }, scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 },
          rotate: { start: 0, end: 360 * p.spin },
        })
        .setDepth(this.depth + 4);
      // One by one, so the shower spreads along the width instead of coming from a single point.
      for (let n = 0; n < Math.ceil(count / 2); n++) emitter.explode(1, at.x + (Math.random() - 0.5) * GAME_WIDTH * 0.5, at.y);
      this.emitters.push(emitter);
      this.sideTimers.push(scene.time.delayedCall(2200, () => emitter.destroy()));
    }
  }
}
