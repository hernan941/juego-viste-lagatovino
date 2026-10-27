import { describe, expect, it } from 'vitest';
import { showcaseTitle } from '../../src/game/domain/copy';

describe('copy', () => {
  it('praises the cat by name', () => {
    expect(showcaseTitle('Luna')).toBe('Lindo look, Luna!');
  });
});

import { splitShopSign } from "../../src/game/domain/copy";

describe("splitShopSign", () => {
  it("splits the name of the shop from its tagline", () => {
    expect(splitShopSign("Lagatovino · hecho a mano")).toEqual({ name: "Lagatovino", tagline: "hecho a mano" });
  });
  it("has no tagline when there is no separator", () => {
    expect(splitShopSign("Lagatovino")).toEqual({ name: "Lagatovino", tagline: "" });
  });
});
