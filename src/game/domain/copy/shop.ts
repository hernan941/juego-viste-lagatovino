// Pure TS. Voice of the shop (art-direction section 6: Chilean, first person, soft humor).
import type { CharacterDef } from '../types';
import { fillTemplate } from './template';

export const shopLines = {
  priceTag: (price: number): string => `${price} botones`,
  notEnough: (missing: number): string => `Te faltan ${missing} botones, ¡ya vas a juntarlos!`,
  bought: '¡Es tuyo! Buena elección',
  /** What the cat says right after the purchase. */
  mine: '¡Es mío!',
  /** Title and line of the purchase sheet. */
  purchaseTitle: '¿Te lo llevas?',
  purchaseLine: (name: string, price: number): string => `${name} · ${price} botones`,
  take: 'Llevar',
  notYet: 'Todavía no',
  tryFree:'Pruébatelo nomás, no cuesta nada',
  /** The seller's till at Ready (F13.6). */
  checkoutTitle: 'La caja',
  takeAll: 'Llevar todo',
  leaveOut: 'Sacarme lo que no tengo',
  keepTrying: 'Seguir probando',
  dyeRow: (name: string): string => `Tinte ${name}`,
  total: (total: number): string => `Total · ${total} botones`,
};

/** The seller talks in first person; her name comes from brand.json. */
export function sellerLines(seller: CharacterDef) {
  const vars = { seller: seller.name };
  return {
    greeting: (): string => fillTemplate('¡Pasa nomás! Soy {seller}, yo te ayudo', vars),
    checkout: (total: number): string => fillTemplate(`Son ${total} botones. Si te tinca, te lo llevas`, vars),
    /** A combo that has a piece not paid yet: a hook to sell, never a scolding. */
    comboHook: (): string => '¡Uy, eso parece un look especial! Si te lo llevas, hay regalito',
    thanks: (): string => '¡Gracias por pasar! Vuelve cuando quieras',
  };
}
