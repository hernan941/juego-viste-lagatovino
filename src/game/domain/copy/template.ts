// Pure TS, no Phaser (ADR 0010). Fills the {judge}, {seller} and {date} markers of the texts (ADR 0015: the names come from brand.json).
import type { BrandDef } from '../types';

export type TemplateVars = Partial<Record<'judge' | 'seller' | 'date', string>>;

/** Replaces every `{key}` that has a value in `vars`; unknown markers stay as they are. */
export function fillTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{(\w+)\}/g, (marker, key: string) => (vars as Record<string, string | undefined>)[key] ?? marker);
}

/** The lines of brand.json, filled with the names of its characters. */
export function withBrand(brand: BrandDef) {
  const vars: TemplateVars = { judge: brand.judge.name, seller: brand.seller.name };
  return {
    shopSign: brand.shopSign,
    packaging: fillTemplate(brand.packagingLine, vars),
    reverse: (date: string): string => fillTemplate(brand.reverseLine, { ...vars, date }),
    signature: brand.signature,
  };
}
