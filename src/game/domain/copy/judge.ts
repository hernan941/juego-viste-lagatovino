// Pure TS. The judge of the runway; his name comes from brand.json.
import type { CharacterDef } from '../types';
import { fillTemplate } from './template';

export function judgeLines(judge: CharacterDef) {
  const vars = { judge: judge.name };
  return {
    intro: (): string => fillTemplate('{judge} entra con su libreta... a ver qué tal ese look', vars),
    verdict: (catName: string, stars: number): string => {
      if (stars >= 5) return `¡Perfecto, ${catName}! Cinco estrellas, me encantó`;
      if (stars >= 3) return `Bien ahí, ${catName}. Me gustó harto`;
      return `Mmm, ${catName}... tiene su gracia, pero se puede mejorar`;
    },
  };
}
