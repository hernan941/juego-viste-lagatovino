// Pure TS, no Phaser (ADR 0010). What a taste reaction looks and sounds like (S2): the numbers and the choices, so the
// controller only plays them.
import type { Expression } from './expressions';
import type { TasteKind } from './tastes';

export const TASTE_KINDS: readonly TasteKind[] = ['combo', 'favorite', 'dislike', 'love', 'color', 'neutral'];

export type TasteSound = 'purr' | 'purrLong' | 'meowLow';

export interface TasteFxPlan {
  /** The face to hold (null: the scene or the secrets already chose one). */
  face: Expression | null;
  /** How long the face stays, in ms. */
  ms: number;
  /** Extra hearts from the head. */
  hearts: number;
  /** Golden sparkles from the head. */
  sparks: number;
  sound: TasteSound | null;
  /** A speech bubble with a line of tasteLines.bubble. */
  bubble: boolean;
  /** The head says "no" (Cat.sayNo owns the face and the shake). */
  sayNo: boolean;
  /** The cat turns its eyes to the garment. */
  glance: boolean;
}

const NONE: TasteFxPlan = { face: null, ms: 0, hearts: 0, sparks: 0, sound: null, bubble: false, sayNo: false, glance: false };

export function tasteFxPlan(kind: TasteKind): TasteFxPlan {
  switch (kind) {
    case 'love': return { ...NONE, face: 'amor', ms: 900, hearts: 3, sound: 'purr' };
    case 'dislike': return { ...NONE, face: 'puaj', ms: 900, sound: 'meowLow', bubble: true, sayNo: true };
    case 'favorite': return { ...NONE, face: 'amor', ms: 1500, sparks: 12, hearts: 3, sound: 'purrLong', bubble: true };
    case 'color': return { ...NONE, face: 'feliz', ms: 1000, sound: 'purr', bubble: true, glance: true };
    default: return NONE;
  }
}
