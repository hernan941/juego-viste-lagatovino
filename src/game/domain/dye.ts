// Pure TS, no Phaser (ADR 0010, 0018). Dyes: recolor the marked fills of an item SVG, nothing else.

/** The "agua" bottle is a tool: it brings the original color back and does not count in the album. */
export const WATER_DYE = 'agua';
/** How much cream goes into the secondary tone (ADR 0018). */
export const DYE_MIX = 0.45;
/** `crema-papel` of the brand tokens, the color the secondary tone leans to. */
const CREAM = '#FFFCF5';

export interface DyeColors {
  /** Main color (`data-dye="a"`). */
  a: string;
  /** Secondary color (`data-dye="b"`). */
  b: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function channels(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`Invalid color "${hex}"; use #RRGGBB`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** The secondary tone: the dye mixed with the cream at `DYE_MIX`. Always "#RRGGBB" in uppercase. */
export function deriveTone(hex: string): string {
  const dye = channels(hex);
  const cream = channels(CREAM);
  const mixed = dye.map((c, i) => Math.round(c * (1 - DYE_MIX) + cream[i] * DYE_MIX));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Both colors of a bottle: its hex and the derived tone. */
export function dyeColors(hex: string): DyeColors {
  return { a: hex.toUpperCase(), b: deriveTone(hex) };
}

// An opening tag that carries a data-dye mark (no `<` or `>` inside, so comments and text never match).
const MARKED_TAG = /<[a-zA-Z][^<>]*?\bdata-dye=(["'])([ab])\1[^<>]*>/g;
const FILL_ATTR = /(\sfill=)(["'])[^"']*\2/;
const STYLE_ATTR = /(\sstyle=)(["'])([^"']*)\2/;
const FILL_DECL = /(?<![-\w])fill\s*:\s*[^;\s]+/;

/** Replaces the fill of the elements marked `data-dye` (attribute and `style`). Outline, shadow and details are not marked, so they stay. */
export function recolorSvg(svgText: string, colors: DyeColors): string {
  return svgText.replace(MARKED_TAG, (tag, _quote: string, mark: 'a' | 'b') => {
    const color = colors[mark];
    return tag
      .replace(FILL_ATTR, (_m, head: string, q: string) => `${head}${q}${color}${q}`)
      .replace(STYLE_ATTR, (_m, head: string, q: string, css: string) => `${head}${q}${css.replace(FILL_DECL, `fill:${color}`)}${q}`);
  });
}

const SVG_ROOT = /<svg\b[^>]*>/;

/** Sets `width` and `height` on the root so the browser rasterizes it sharp (Firefox needs it for a blob). */
export function sizeSvg(svgText: string, px: number): string {
  if (!SVG_ROOT.test(svgText)) throw new Error('Not an SVG: no <svg> root');
  return svgText.replace(SVG_ROOT, (root) => {
    const clean = root.replace(/\s(?:width|height)=(["'])[^"']*\1/g, '');
    return clean.replace(/\s*(\/?)>$/, ` width="${px}" height="${px}"$1>`);
  });
}

/** Key of the dyed texture. Water is the original texture. */
export function dyeTextureKey(texture: string, dyeId: string): string {
  return dyeId === WATER_DYE ? texture : `${texture}~${dyeId}`;
}
