// Pure TS. Texts of the album.
import type { Tally } from '../album';

/** What each milestone gives to the photo mode (photo.json). */
const MILESTONE_PRIZE: Record<number, string> = {
  25: 'Stickers y un marco para tus fotos',
  50: 'Un fondo rayado para tus fotos',
  75: 'Una pose nueva y más stickers',
  100: 'Un marco de Kofi y una nota de Catalina',
};

export const albumLines = {
  percent: (pct: number): string => `Llevas el ${pct}% de tu álbum`,
  tally: (t: Tally): string => `${t.got} de ${t.total}`,
  coverTitle: 'Mi álbum',
  coverPercent: (pct: number): string => `Llevas el ${pct} %`,
  coverSets: (done: number, total: number): string => `Sets: ${done} de ${total}`,
  milestoneStamp: (pct: number): string => `¡${pct} %!`,
  milestonePrize: (pct: number): string => MILESTONE_PRIZE[pct] ?? 'Algo nuevo para el modo foto',
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
