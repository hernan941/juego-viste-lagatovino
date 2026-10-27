import { describe, expect, it } from 'vitest';
import brandJson from '../../src/game/data/brand.json';
import { sellerLines, shopLines } from '../../src/game/domain/copy';
import type { BrandDef } from '../../src/game/domain/types';

const brand = brandJson as BrandDef;

describe('the till voice (F13.6)', () => {
  it('has the three choices and the title, short enough for a pill', () => {
    expect(shopLines.checkoutTitle).toBeTruthy();
    expect(shopLines.takeAll).toBe('Llevar todo');
    expect(shopLines.leaveOut).toBe('Sacarme lo que no tengo');
    expect(shopLines.keepTrying).toBe('Seguir probando');
  });

  it('"not enough" speaks with the voice of the seller and sends the player to rate looks (M3)', () => {
    expect(shopLines.notEnough(80)).toBe('Uy! Te faltan 80. Califica un par de looks y vuelves');
  });

  it('names a bottle and the total', () => {
    expect(shopLines.dyeRow('Cielo')).toBe('Tinte Cielo');
    expect(shopLines.total(150)).toContain('150');
  });

  it('the seller hooks the sale on a combo, soft and with no pressure', () => {
    const line = sellerLines(brand.seller).comboHook();
    expect(line).toMatch(/regalito/i);
    expect(line).not.toMatch(/[{}]/);
    expect(line).not.toMatch(/Kofi|Catalina|Cata\b/);
  });
});
