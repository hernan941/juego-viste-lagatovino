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
};

/** The seller talks in first person; her name comes from brand.json. */
export function sellerLines(seller: CharacterDef) {
  const vars = { seller: seller.name };
  return {
    greeting: (): string => fillTemplate('¡Pasa nomás! Soy {seller}, yo te ayudo', vars),
    checkout: (total: number): string => fillTemplate(`Son ${total} botones. Si te tinca, te lo llevas`, vars),
    thanks: (): string => fillTemplate('¡Gracias por pasar! Vuelve cuando quieras, dice {seller}', vars),
  };
}
