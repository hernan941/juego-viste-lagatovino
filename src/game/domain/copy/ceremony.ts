// Pure TS. The words of the runway card and of the event notes (F15.3). The judge's own lines live in judge.ts.
import type { BreakdownLine, Novelty, ProgressEvent, TagNames } from '../types';
import { tagDislikes, tagLoves, tagStyle } from './tags';

/** "+3" or "−3" (real minus sign); 0 stays "0". */
export function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  if (points < 0) return `−${Math.abs(points)}`;
  return '0';
}

/** One line of the judge's card. `comboName` turns a combo id into its name; without it the id is shown. `tags` has the readable tags. */
export function ratingLineText(line: BreakdownLine, comboName: (id: string) => string = (id) => id, tags?: TagNames): string {
  const ref = line.ref ?? '';
  switch (line.kind) {
    case 'style': return ref ? tagStyle(tags, ref) : 'Prendas que combinan';
    case 'love': return ref ? tagLoves(tags, ref) : 'Lo que le encanta';
    case 'dislike': return ref ? tagDislikes(tags, ref) : 'Algo que no le tinca';
    case 'favoriteItem': return 'Su prenda favorita!';
    case 'complete': return 'Look completo';
    case 'combo': return ref ? `Combo ${comboName(ref)}` : 'Combo';
    case 'favoriteDye': return 'Su color favorito';
    case 'bare': return 'Al natural';
    case 'plain': return 'Sin combinar';
  }
}

/** Why the payout is small: a repeated look pays a tip, a near one pays half. A new look needs no explanation. */
export function noveltyNote(novelty: Novelty, amount: number): string | undefined {
  if (novelty === 0) return `Propina +${amount}`;
  if (novelty === 1) return `Casi igual +${amount}`;
  return undefined;
}

export interface EventNote {
  /** A glyph for the window of the polaroid. */
  icon: string;
  /** Written in the margin of the polaroid. */
  title: string;
  /** "+15", when the event pays. */
  reward?: string;
}

const tagOf = (taste: string): string => taste.slice(taste.indexOf(':') + 1);

/** The polaroid note of a progress event. */
export function eventNote(event: Exclude<ProgressEvent, { type: 'coins' }>, tags?: TagNames): EventNote {
  switch (event.type) {
    case 'milestone':
      return { icon: '★', title: `Primeras ${event.stars} estrellas!`, reward: `+${event.amount}` };
    case 'tasteFound': {
      const reward = `+${event.amount}`;
      if (event.taste === 'favorite') return { icon: '♥', title: 'Su prenda favorita!', reward };
      if (event.taste === 'color') return { icon: '✦', title: 'Su color favorito!', reward };
      if (event.taste.startsWith('dislike:')) return { icon: '?', title: tagDislikes(tags, tagOf(event.taste)), reward };
      return { icon: '♥', title: tagLoves(tags, tagOf(event.taste)), reward };
    }
    case 'comboFirst':
      return { icon: '✦', title: 'Primer combo!', reward: `+${event.amount}` };
    case 'setCompleted':
      return { icon: '✦', title: 'Set completo!' };
    case 'unlock':
      return { icon: '✿', title: event.ids.length > 1 ? 'Novedades para el modo foto!' : 'Novedad para el modo foto!' };
  }
}
