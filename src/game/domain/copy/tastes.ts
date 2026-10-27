// Pure TS. Hints about what each cat likes. The @ goes in generic phrases ("tu gat@"), never next to the player's text.
export const tasteLines = {
  generic: (): string => 'Mira las caritas: tu gat@ te va contando lo que le gusta',
  love: (catName: string): string => `${catName} lo ama! Se le nota en la carita`,
  /** What the cat says in its bubble when a taste is touched. */
  bubble: (kind: 'dislike' | 'favorite' | 'color'): string => (kind === 'dislike' ? 'mmm… no' : kind === 'favorite' ? 'MI FAVORITO!' : 'mi color!'),
  /** The cat sheet when the five tastes are found. */
  knowsYou: (): string => 'Me conoces!',
  /** The cat sheet: how many of its tastes are known. */
  count: (found: number, total: number): string => `${found} de ${total} descubiertos`,
  /** The cat sheet: how to close it. */
  closeHint: (): string => 'Toca fuera para cerrar',
  /** Title of the cat sheet. */
  sheetTitle: (catName: string): string => `Ficha de ${catName}`,
  hate: (catName: string): string => `Puaj... a ${catName} no le tinca nada eso`,
};
