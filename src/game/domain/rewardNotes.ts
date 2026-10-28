// Pure TS, no Phaser. The progress events of the ceremony grouped into a few readable notes (F20.R, second pass):
// at most `max` of them, by priority, and the rest in one pile at the end.
import type { CeremonyEvent } from './ceremony';
import { eventNote } from './copy';
import type { TagNames } from './types';

export const MAX_NOTES = 3;

export interface RewardNote {
  /** A glyph for the window of the polaroid. */
  icon: string;
  /** Written in the margin of the polaroid. */
  title: string;
  /** "+90": the buttons this note adds up (the buttons themselves always fly for every event). */
  reward?: string;
  /** Only the pile: how many notes are inside it. */
  stack?: number;
}

interface Group extends RewardNote {
  /** Lower goes first: secret or combo > news > set > star milestone. */
  priority: number;
  amount: number;
}

const group = (icon: string, title: string, priority: number, amount: number): Group => ({
  icon, title, priority, amount, reward: amount > 0 ? `+${amount}` : undefined,
});

const strip = (g: Group): RewardNote => ({ icon: g.icon, title: g.title, reward: g.reward });

/** Groups the events by kind, orders the groups by priority and keeps `max` notes; the last becomes a pile when there are more. */
export function groupRewardNotes(events: readonly CeremonyEvent[], max = MAX_NOTES, tags?: TagNames): RewardNote[] {
  const groups: Group[] = [];
  const milestones = events.filter((e) => e.type === 'milestone');
  const sets = events.filter((e) => e.type === 'setCompleted');
  const unlocks = events.filter((e) => e.type === 'unlock');

  for (const event of events) {
    if (event.type === 'tasteFound' || event.type === 'comboFirst') {
      const { icon, title } = eventNote(event, tags);
      groups.push(group(icon, title, 0, event.amount));
    }
  }
  if (unlocks.length > 0) {
    const ids = unlocks.reduce((n, e) => n + e.ids.length, 0);
    groups.push(group('✿', ids > 1 ? 'Novedades para el modo foto!' : 'Novedad para el modo foto!', 1, 0));
  }
  if (sets.length > 0) groups.push(group('✦', sets.length > 1 ? `${sets.length} sets completos!` : 'Set completo!', 2, 0));
  if (milestones.length > 0) {
    const top = milestones.reduce((a, b) => (b.stars > a.stars ? b : a));
    groups.push(group('★', eventNote(top, tags).title, 3, milestones.reduce((n, e) => n + e.amount, 0)));
  }
  groups.sort((a, b) => a.priority - b.priority);

  if (groups.length <= max) return groups.map(strip);
  const rest = groups.slice(max - 1);
  const amount = rest.reduce((n, g) => n + g.amount, 0);
  return [
    ...groups.slice(0, max - 1).map(strip),
    { icon: '✦', title: `+${rest.length} mas en tu album`, reward: amount > 0 ? `+${amount}` : undefined, stack: rest.length },
  ];
}
