// Pure TS. Texts of the album.
import type { Tally } from '../album';

export const albumLines = {
  percent: (pct: number): string => `Llevas el ${pct}% de tu álbum`,
  tally: (t: Tally): string => `${t.got} de ${t.total}`,
  hangerSoon: 'El colgador llega pronto',
  back: 'Volver',
  empty: 'Todavía está vacío, ¡a vestir gatos!',
  secretHint: 'Es un secreto…',
  catHintFallback: 'Aún te falta conocerlo…',
  /** The price written in pencil under a sketch. */
  price: (n: number): string => `${n}`,
  free: 'gratis',
  best: (stars: number): string => `Mejor: ${stars} de 5`,
  noStars: 'Aún sin calificar',
  tastesTitle: 'Gustos',
  hidden: '?',
  pageOf: (page: number, pages: number): string => `${page} / ${pages}`,
  lookWon: 'Look conseguido',
  /** Spanish words for what the entry card says about an item. */
  itemGot: 'Ya es tuya',
  itemFree: 'Viene con el gato',
  itemSketch: (price: number): string => `Cuesta ${price} botones`,
  dyeGot: 'Ya es tuyo',
  dyeSketch: (price: number): string => `Cuesta ${price} botones`,
  pieces: 'Piezas',
  tasteLine: (glyph: string, label: string): string => `${glyph} ${label}`,
  close: 'Toca para cerrar',
};
