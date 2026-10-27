// Pure TS. The judge of the runway; his name comes from brand.json.
// The @ is only for generic phrases ("tu gat@"): when he talks to a given cat he uses neutral words, never a guess of gender.
import type { CharacterDef } from '../types';
import { fillTemplate } from './template';

/** What the judge reacts to at the verdict. */
export interface VerdictCase {
  catName: string;
  stars: number;
  /** No clothes at all. */
  bare?: boolean;
}

export function judgeLines(judge: CharacterDef) {
  const vars = { judge: judge.name };
  const lines = {
    intro: (): string => fillTemplate('{judge} entra con su libreta... a ver qué tal ese look', vars),
    /** 1-2 stars: he is kind. */
    comfort: (catName: string): string => `¡Igual te ves adorable, ${catName}!`,
    verdict: (catName: string, stars: number): string => {
      if (stars >= 5) return `¡Perfecto, ${catName}! Cinco estrellas, me encantó`;
      if (stars === 4) return `¡Uf, ${catName}! Casi perfecto…`;
      if (stars === 3) return `Bien ahí, ${catName}. Me gustó harto`;
      return `¡Igual te ves adorable, ${catName}!`;
    },
    /** The same look as one of the last ones (it pays a tip). */
    repeated: (): string => 'Este look ya me lo mostraste… ¡sorpréndeme!',
    /** One slot of difference from a recent look. */
    nearSame: (): string => 'Mmm, se parece harto al de recién',
    /** No clothes at all. */
    bare: (): string => '¿Y la ropa? ¡Igual te ves adorable!',
  };
  return {
    ...lines,
    /** The one thing he says when the stars land: the case that matters most wins. */
    say: ({ catName, stars, bare }: VerdictCase): string => (bare ? lines.bare() : lines.verdict(catName, stars)),
  };
}
