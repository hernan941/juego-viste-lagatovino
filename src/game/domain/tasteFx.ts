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

/** The short reaction of a cat that reads the look it arrived with (F14.5): a pop on the garment and a soft sound per piece. */
export interface ReadFxPlan {
  /** Hearts from the garment. */
  hearts: number;
  /** Golden sparkles from the garment. */
  sparks: number;
  /** A little cross on the garment (the "no" of this one). */
  mark: boolean;
  sound: TasteSound | null;
  volume: number;
}

const READ_NONE: ReadFxPlan = { hearts: 0, sparks: 0, mark: false, sound: null, volume: 0 };

export function readFxPlan(kind: TasteKind): ReadFxPlan {
  switch (kind) {
    case 'love': return { ...READ_NONE, hearts: 1, sound: 'purr', volume: 0.5 };
    case 'favorite': return { ...READ_NONE, hearts: 2, sparks: 5, sound: 'purr', volume: 0.6 };
    case 'color': return { ...READ_NONE, sparks: 3, sound: 'purr', volume: 0.5 };
    case 'dislike': return { ...READ_NONE, mark: true, sound: 'meowLow', volume: 0.5 };
    default: return READ_NONE;
  }
}

export function tasteFxPlan(kind: TasteKind): TasteFxPlan {
  switch (kind) {
    case 'love': return { ...NONE, face: 'amor', ms: 900, hearts: 3, sound: 'purr' };
    case 'dislike': return { ...NONE, face: 'puaj', ms: 900, sound: 'meowLow', bubble: true, sayNo: true };
    case 'favorite': return { ...NONE, face: 'amor', ms: 1500, sparks: 12, hearts: 3, sound: 'purrLong', bubble: true };
    case 'color': return { ...NONE, face: 'feliz', ms: 1000, sound: 'purr', bubble: true, glance: true };
    default: return NONE;
  }
}
