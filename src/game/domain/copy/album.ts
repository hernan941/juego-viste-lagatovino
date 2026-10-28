// Pure TS. Texts of the album.
import type { Tally } from '../album';

/** What each milestone gives to the photo mode (photo.json). */
const MILESTONE_PRIZE: Record<number, string> = {
  25: 'Stickers y un marco para tus fotos',
  50: 'Un fondo rayado para tus fotos',
  75: 'Una pose nueva y varios stickers',
  100: 'Un marco de Kofi y una nota de Catalina',
};

export const albumLines = {
  percent: (pct: number): string => `Llevas el ${pct}% completo`,
  /** The secondary button of the Title. */
  titleButton: (pct: number): string => `Mi álbum · ${pct}%`, // Fonts.Title: accents allowed
  /** The gold rings that hang in the hanger (Fonts.Voice: no accents). */
  golds: (n: number): string => (n === 1 ? '1 dorado' : `${n} dorados`),
  tally: (t: Tally): string => `${t.got} de ${t.total}`,
  /** The count of the cats page: it counts tastes (not cats). */
  tastesTally: (t: Tally): string => `${t.got} de ${t.total} gustos`,
  coverTitle: 'Mi álbum', // Fonts.Title: accents allowed
  coverPercent: (pct: number): string => `Llevas el ${pct} %`,
  coverSets: (done: number, total: number): string => `Sets: ${done} de ${total}`,
  milestoneStamp: (pct: number): string => `¡${pct} %!`, // Fonts.Title: accents allowed
  milestonePrize: (pct: number): string => MILESTONE_PRIZE[pct] ?? 'Algo nuevo para el modo foto',
  hangerSoon: 'El colgador llega pronto',
  back: 'Volver',
  empty: 'Nada por ahora, a vestir gatos!',
  secretHint: 'Es un secreto…',
  catHintFallback: 'Te falta conocerlo…',
  /** The price written in pencil under a sketch. */
  price: (n: number): string => `${n}`,
  free: 'gratis',
  best: (stars: number): string => `Mejor: ${stars} de 5`,
  noStars: 'Sin calificar',
  tastesTitle: 'Gustos',
  hidden: '?',
  pageOf: (page: number, pages: number): string => `${page} / ${pages}`,
  lookWon: 'Look conseguido',
  /** Spanish words for what the entry card says about an item. */
  itemGot: 'Ya es tuya',
  itemFree: 'Viene con el gato',
  itemSketch: (price: number): string => `Cuesta ${price} botones. En el probador es gratis`,
  dyeGot: 'Ya es tuyo',
  dyeSketch: (price: number): string => `Cuesta ${price} botones. En el probador es gratis`,
  pieces: 'Piezas',
  /** The sets sheet (L1): the prize of a set in the photo mode, and what the card of a set says. */
  setPrize: (kind: 'background' | 'frame' | 'sticker', name: string): string => `→ ${{ background: 'fondo', frame: 'marco', sticker: 'sticker' }[kind]} ${name}`,
  setNoPrize: 'Para presumir',
  setDone: 'Set completo',
  setMissing: (names: readonly string[]): string => `Te faltan: ${names.length > 4 ? `${names.slice(0, 4).join(', ')}…` : names.join(', ')}`,
  setCount: (got: number, total: number): string => `${got} de ${total}`,
  setsTitle: 'Sets',
  /** On the card of a garment or a bottle: the set it is part of. */
  itemSet: (name: string, got: number, total: number): string => `Del set ${name} · ${got} de ${total}`,
  tasteLine: (glyph: string, label: string): string => `${glyph} ${label}`,
  close: 'Toca para cerrar',
};
