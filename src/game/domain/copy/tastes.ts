// Pure TS. Hints about what each cat likes. The @ goes in generic phrases ("tu gat@"), never next to the player's text.
export const tasteLines = {
  generic: (): string => 'Fíjate en las caritas: tu gat@ te va contando qué le gusta',
  love: (catName: string): string => `¡${catName} lo ama! Se le nota en la carita`,
  /** What the cat says in its bubble when a taste is touched. */
  bubble: (kind: 'dislike' | 'favorite' | 'color'): string => (kind === 'dislike' ? 'mmm… no' : kind === 'favorite' ? '¡MI FAVORITO!' : '¡mi color!'),
  hate: (catName: string): string => `Puaj... a ${catName} no le tinca nada eso`,
};
