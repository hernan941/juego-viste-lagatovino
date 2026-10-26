// Pure TS. Texts of the album.
import type { Tally } from '../album';

export const albumLines = {
  percent: (pct: number): string => `Llevas el ${pct}% de tu álbum`,
  tally: (t: Tally): string => `${t.got} de ${t.total}`,
  hangerSoon: 'El colgador llega pronto',
  back: 'Volver',
  empty: 'Todavía está vacío, ¡a vestir gatos!',
};
