// Pure TS. Texts of the photo mode.
import type { BrandDef } from '../types';
import { withBrand } from './template';

export const photoLines = {
  /** Signature of the photo, from brand.json ("Xoxo, mau!"). */
  signature: (brand: BrandDef): string => withBrand(brand).signature,
  caption: (catName: string): string => `${catName}, versión foto`,
};
