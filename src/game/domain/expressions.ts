// Cat expressions and when to use them (docs/game-design.md, "Qué expresión usar en cada momento").
export const EXPRESSIONS = ['normal', 'feliz', 'sorpresa', 'parpadeo', 'amor'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export type ReactionEvent = 'grab' | 'drop' | 'combo' | 'remove';

export interface Reaction {
  expression: Expression;
  /** How long to hold it before going back to normal (0 = until the event ends). */
  ms: number;
}

/** `rand` in [0, 1) picks the duration inside the range of the design doc. */
export function reactionFor(event: ReactionEvent, rand: number): Reaction {
  switch (event) {
    case 'grab': return { expression: 'sorpresa', ms: 0 };
    case 'drop': return { expression: 'feliz', ms: Math.round(600 + rand * 300) };
    case 'combo': return { expression: 'amor', ms: 1600 };
    case 'remove': return { expression: 'parpadeo', ms: 700 };
  }
}
