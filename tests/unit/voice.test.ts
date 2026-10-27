import { describe, expect, it } from 'vitest';
import * as copy from '../../src/game/domain/copy';
import { albumLines, fillTemplate, judgeLines, keychainLines, photoLines, sellerLines, shopLines, tasteLines, withBrand } from '../../src/game/domain/copy';
import brandJson from '../../src/game/data/brand.json';
import type { BrandDef } from '../../src/game/domain/types';

const brand = brandJson as BrandDef;
const custom: BrandDef = { ...brand, judge: { name: 'Don Juez' }, seller: { name: 'Doña Vende' } };

describe('fillTemplate (F12.4)', () => {
  it('replaces {judge}, {seller} and {date} from the vars', () => {
    expect(fillTemplate('{judge} y {seller} el {date}', { judge: 'A', seller: 'B', date: 'hoy' })).toBe('A y B el hoy');
  });
  it('replaces every occurrence and leaves unknown markers alone', () => {
    expect(fillTemplate('{judge}{judge} {otro}', { judge: 'A' })).toBe('AA {otro}');
  });
});

describe('withBrand', () => {
  it('fills the brand line templates with the date', () => {
    expect(withBrand(brand).reverse('3 de mayo')).toBe('Hecho a mano · 3 de mayo');
  });
});

describe('lines by feature', () => {
  it('judge and seller names come from the characters, never from the code', () => {
    expect(judgeLines(custom.judge).intro()).toContain('Don Juez');
    expect(sellerLines(custom.seller).greeting()).toContain('Doña Vende');
    expect(judgeLines(brand.judge).intro()).toContain(brand.judge.name);
  });
  it('no text mentions the unconfirmed names', () => {
    const all = JSON.stringify([
      judgeLines(brand.judge).intro(), sellerLines(brand.seller).greeting(), sellerLines(brand.seller).checkout(120),
      shopLines.priceTag(30), shopLines.notEnough(10), shopLines.bought, tasteLines.love('Luna'), tasteLines.hate('Luna'),
      albumLines.percent(40), photoLines.signature(brand), keychainLines.replaceTitle('Luna'),
      shopLines.mine, shopLines.purchaseTitle, shopLines.purchaseLine('Gorro', 40), tasteLines.sheetTitle('Luna'), tasteLines.count(1, 5), tasteLines.knowsYou(), tasteLines.closeHint(),
    ]);
    expect(all).not.toMatch(/Kofi|Catalina|Cata\b/);
  });
  it('leaves no unfilled marker', () => {
    const all = [judgeLines(brand.judge).intro(), sellerLines(brand.seller).greeting(), sellerLines(brand.seller).checkout(5), albumLines.percent(3), photoLines.signature(brand), keychainLines.replaceTitle('Luna')];
    for (const t of all) expect(t).not.toMatch(/[{}]/);
  });
  it('uses the Chilean voice', () => {
    expect(sellerLines(brand.seller).checkout(5)).toMatch(/si te tinca/i);
    expect(photoLines.signature(brand)).toBe('Xoxo, mau!');
  });
});

describe('the @ rule', () => {
  const name = 'Luna';
  const texts = (): string[] => [
    tasteLines.love(name), tasteLines.hate(name), keychainLines.replaceTitle(name), judgeLines(brand.judge).verdict(name, 3),
    photoLines.caption(name), shopLines.notEnough(5), albumLines.percent(10), copy.showcaseTitle(name),
    tasteLines.sheetTitle(name), tasteLines.count(2, 5), tasteLines.knowsYou(), shopLines.purchaseLine('Gorro', 40), shopLines.mine,
  ];
  it('is never glued to the name of the player', () => {
    for (const t of texts()) expect(t).not.toMatch(/Luna@|@Luna/);
  });
  it('appears in generic phrases as "gat@"', () => {
    expect(tasteLines.generic()).toContain('gat@');
  });
  it('is never glued to a letter, except in "gat@"', () => {
    for (const t of texts()) expect(t.replace(/gat@/g, '')).not.toMatch(/[\p{L}]@|@[\p{L}]/u);
  });
});

describe("album button of the Title", () => {
  it("writes the name and the percentage", () => {
    expect(albumLines.titleButton(37)).toBe("Mi álbum · 37%");
  });
});
