// Pure TS, no Phaser (ADR 0010, 0017). The timeline of the runway ceremony (docs/design/segunda-etapa.md, S1):
// order, times and the "skip x3", so scenes only play the steps. Times are in ms from the start of the ceremony.
import type { Expression } from './expressions';
import type { BreakdownLine, ProgressEvent, RatingResult } from './types';

export const JUDGE_ENTER_MS = 420;
export const LINE_GAP_MS = 260;
export const LINE_MS = 200;
export const MAX_LINES = 5;
export const STAMP_GAP_MS = 140;
export const STAMP_MS = 180;
export const COIN_GAP_MS = 40;
export const COIN_FLIGHT_MS = 500;
export const NOTE_GAP_MS = 700;
/** Notes squeeze together before they would pass the time limit, but never closer than this. */
export const MIN_NOTE_GAP_MS = 100;
export const NOTE_MS = 500;
export const MAX_BUTTONS = 12;
export const MAX_BUTTONS_REDUCED = 3;
/** Coins per flying button: the number of buttons grows with the payout up to the cap. */
export const COINS_PER_BUTTON = 5;
export const MAX_TOTAL_MS = 6000;
export const SKIP_FACTOR = 3;

/** `reduced` follows motion preference (ADR 0013): no slide, no shake, 3 buttons that only count. */
export type CeremonyProfile = 'full' | 'reduced';

export type CeremonyEvent = Exclude<ProgressEvent, { type: 'coins' }>;

interface StepBase {
  /** Start, in ms. */
  at: number;
  /** Duration, in ms. */
  ms: number;
}

export type CeremonyStep =
  | (StepBase & { kind: 'judgeEnter'; slide: boolean })
  | (StepBase & { kind: 'line'; index: number; line: BreakdownLine })
  | (StepBase & { kind: 'stamp'; index: number; shake: boolean; /** The 5th star, in `sol` with a burst. */ golden: boolean })
  | (StepBase & { kind: 'reaction'; reaction: CatReaction })
  | (StepBase & { kind: 'coin'; index: number; /** Coins this button adds to the counter. */ credit: number; fly: boolean })
  | (StepBase & { kind: 'note'; index: number; event: CeremonyEvent });

export interface CeremonyPlan {
  profile: CeremonyProfile;
  stars: number;
  /** The look has no clothes at all (the card only has the "Al natural" placeholder). */
  bare: boolean;
  steps: CeremonyStep[];
  /** Coins the buttons add up to: the sum of the amounts of the progress events. Never lost by `skip`. */
  coins: number;
  totalMs: number;
}

export interface CatReaction {
  expression: Expression;
  purr: 'none' | 'short' | 'long';
  confetti: boolean;
  /** 1-2 stars: the judge comforts ("Igual quedaste tierno"). */
  comfort: boolean;
}

/** How the cat reacts to its stars: 1-2 blink, 3 happy, 4 love, 5 love with a long purr and confetti. */
export function catReaction(stars: number): CatReaction {
  if (stars <= 2) return { expression: 'parpadeo', purr: 'none', confetti: false, comfort: true };
  if (stars === 3) return { expression: 'feliz', purr: 'short', confetti: false, comfort: false };
  if (stars === 4) return { expression: 'amor', purr: 'short', confetti: false, comfort: false };
  return { expression: 'amor', purr: 'long', confetti: true, comfort: false };
}

/** Coins paid by the events (every progress event with an amount). */
export function eventCoins(events: readonly ProgressEvent[]): number {
  return events.reduce((sum, e) => sum + ('amount' in e ? e.amount : 0), 0);
}

/** How many buttons fly for a payout. */
export function buttonCount(coins: number, profile: CeremonyProfile): number {
  if (coins <= 0) return 0;
  const full = Math.min(MAX_BUTTONS, Math.ceil(coins / COINS_PER_BUTTON));
  return profile === 'reduced' ? Math.min(MAX_BUTTONS_REDUCED, full) : full;
}

/** Splits the coins among the buttons so the credits always add up to the total (the last one takes the rest). */
function credits(coins: number, count: number): number[] {
  if (count === 0) return [];
  const each = Math.floor(coins / count);
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? coins - each * (count - 1) : each));
}

const endOf = (steps: readonly CeremonyStep[]): number => steps.reduce((end, s) => Math.max(end, s.at + s.ms), 0);

/**
 * The ordered steps of the ceremony: judge enters, breakdown lines (up to 5, 260 ms apart), stamps (140 ms apart),
 * the cat's reaction, the buttons flying to the wallet and the event notes. Total <= 6 s.
 */
export function ceremonyPlan(
  result: RatingResult,
  events: readonly ProgressEvent[],
  profile: CeremonyProfile = 'full',
): CeremonyPlan {
  const reduced = profile === 'reduced';
  const steps: CeremonyStep[] = [{ kind: 'judgeEnter', at: 0, ms: JUDGE_ENTER_MS, slide: !reduced }];

  const lines = result.breakdown.slice(0, MAX_LINES);
  lines.forEach((line, index) => steps.push({ kind: 'line', index, line, at: JUDGE_ENTER_MS + index * LINE_GAP_MS, ms: LINE_MS }));
  const stampsAt = lines.length === 0 ? JUDGE_ENTER_MS : JUDGE_ENTER_MS + (lines.length - 1) * LINE_GAP_MS + LINE_MS;

  for (let index = 0; index < result.stars; index++) {
    steps.push({
      kind: 'stamp', index, at: stampsAt + index * STAMP_GAP_MS, ms: STAMP_MS,
      shake: !reduced, golden: result.stars === 5 && index === 4,
    });
  }
  const stampsEnd = stampsAt + (result.stars - 1) * STAMP_GAP_MS + STAMP_MS;
  steps.push({ kind: 'reaction', at: stampsEnd, ms: 900, reaction: catReaction(result.stars) });

  const coins = eventCoins(events);
  const buttons = buttonCount(coins, profile);
  credits(coins, buttons).forEach((credit, index) =>
    steps.push({ kind: 'coin', index, at: stampsEnd + index * COIN_GAP_MS, ms: COIN_FLIGHT_MS, credit, fly: !reduced }));

  const notes = events.filter((e): e is CeremonyEvent => e.type !== 'coins');
  const room = MAX_TOTAL_MS - stampsEnd - NOTE_MS;
  const gap = notes.length < 2 ? NOTE_GAP_MS : Math.max(MIN_NOTE_GAP_MS, Math.min(NOTE_GAP_MS, Math.floor(room / (notes.length - 1))));
  notes.forEach((event, index) => steps.push({ kind: 'note', index, event, at: stampsEnd + index * gap, ms: NOTE_MS }));

  steps.sort((a, b) => a.at - b.at);
  return { profile, stars: result.stars, bare: result.breakdown[0]?.kind === 'bare', steps, coins, totalMs: endOf(steps) };
}

/**
 * The plan after a tap at `now`: what already happened stays, and the rest runs SKIP_FACTOR times faster.
 * No step is ever dropped, so every button still counts and every note is still shown.
 */
export function skip(plan: CeremonyPlan, now: number): CeremonyPlan {
  const steps = plan.steps.map((step): CeremonyStep => {
    if (step.at >= now) return { ...step, at: now + (step.at - now) / SKIP_FACTOR, ms: step.ms / SKIP_FACTOR };
    const left = step.at + step.ms - now;
    return left > 0 ? { ...step, ms: now - step.at + left / SKIP_FACTOR } : step;
  });
  return { ...plan, steps, totalMs: endOf(steps) };
}
