// Pure TS. The judge of the runway; his name comes from brand.json.
// The @ is only for generic phrases ("tu gat@"): when he talks to a given cat he uses neutral words, never a guess of gender.
import type { CharacterDef, NextHint, Novelty, TagNames } from '../types';
import { tagLove } from './tags';
import { fillTemplate } from './template';

/** What the judge reacts to at the verdict. */
export interface VerdictCase {
  catName: string;
  stars: number;
  /** No clothes at all. */
  bare?: boolean;
  /** 0 repeated look, 1 near, 2 (or none) new. */
  novelty?: Novelty;
  /** The clue for 3-4 stars, and the readable tags to say the taste. */
  hint?: NextHint | null;
  tags?: TagNames;
}

export function judgeLines(judge: CharacterDef) {
  const vars = { judge: judge.name };
  const lines = {
    intro: (): string => fillTemplate('{judge} entra con su libreta... a ver ese look', vars),
    /** 1-2 stars: he is kind. */
    comfort: (catName: string): string => `Igual te ves adorable, ${catName}!`,
    verdict: (catName: string, stars: number): string => {
      if (stars >= 5) return `Perfecto, ${catName}! Cinco estrellas, lo amo`;
      if (stars === 4) return `Uf, ${catName}! Casi perfecto…`;
      if (stars === 3) return `Bien, ${catName}. Me gusta harto`;
      return `Igual te ves adorable, ${catName}!`;
    },
    /** The same look as one of the last ones (it pays a tip). */
    repeated: (): string => 'Este look ya me lo mostraste… a probar otro!',
    /** One slot of difference from a recent look. */
    nearSame: (): string => 'Mmm, se parece harto al anterior',
    /** No clothes at all. */
    bare: (): string => 'Y la ropa? Igual te ves adorable!',
    /** The clue to reach the next star: a taste to try if the player knows one, else a question. */
    hint: (catName: string, { missing, love }: NextHint, tags?: TagNames): string => {
      const lack = missing === 1 ? 'Te falta 1 puntito' : `Te faltaron ${missing} puntitos`;
      return love === undefined ? `${lack}… a ${catName} le gusta algo especial!` : `${lack}… prueba con ${tagLove(tags, love)}!`;
    },
  };
  return {
    ...lines,
    /** The one thing he says when the stars land: the case that matters most wins. */
    say: ({ catName, stars, bare, novelty = 2, hint, tags }: VerdictCase): string => {
      if (bare) return lines.bare();
      if (novelty === 0) return lines.repeated();
      if (novelty === 1) return lines.nearSame();
      const verdict = lines.verdict(catName, stars);
      return hint ? `${verdict}\n${lines.hint(catName, hint, tags)}` : verdict;
    },
  };
}
