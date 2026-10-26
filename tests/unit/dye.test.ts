import { describe, expect, it } from 'vitest';
import {
  DYE_MIX,
  WATER_DYE,
  deriveTone,
  dyeColors,
  dyeTextureKey,
  recolorSvg,
  sizeSvg,
} from '../../src/game/domain/dye';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><mask id="m"><rect width="512" height="512" fill="#fff"/></mask></defs>
  <g mask="url(#m)">
    <rect x="1" y="2" width="3" height="4" fill="#D8CCFF" data-dye="a" mask="url(#m)"/>
    <path fill="#C7B8FA" data-dye="b" stroke="#1F1B1A" stroke-width="6" d="M0 0 L1 1"/>
    <path style="fill:#112233;stroke:#1F1B1A" data-dye="a" d="M0 0"/>
    <path data-dye="b" style="stroke:#000; fill : #445566 ;opacity:.5" d="M0 0"/>
    <path fill="#000000" opacity="0.15" d="M5 5"/>
    <path fill="none" stroke="#1F1B1A" d="M6 6"/>
    <circle cx="1" cy="1" r="4" fill="#1F1B1A"/>
  </g>
</svg>`;

const sweaters = import.meta.glob('/art/clothes/sweater/hoodie-orejitas.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const COLORS = { a: '#AA0000', b: '#00BB00' };

describe('deriveTone', () => {
  it('mixes the dye with the cream by DYE_MIX', () => {
    expect(DYE_MIX).toBe(0.45);
    // cream is #FFFCF5: 255*.45=114.75 -> 0x73, 252*.45=113.4 -> 0x71, 245*.45=110.25 -> 0x6E
    expect(deriveTone('#000000')).toBe('#73716E');
  });

  it('keeps the cream when the dye is the cream, in uppercase #RRGGBB', () => {
    expect(deriveTone('#fffcf5')).toBe('#FFFCF5');
    expect(deriveTone('#8fa8e3')).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('gives a lighter tone than the dye', () => {
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    expect(lum(deriveTone('#7A4FD6'))).toBeGreaterThan(lum('#7A4FD6'));
  });

  it('rejects a bad hex', () => {
    expect(() => deriveTone('lila')).toThrow();
    expect(() => deriveTone('#FFF')).toThrow();
  });
});

describe('dyeColors', () => {
  it('uses the dye for a and the derived tone for b', () => {
    expect(dyeColors('#7a4fd6')).toEqual({ a: '#7A4FD6', b: deriveTone('#7A4FD6') });
  });
});

describe('recolorSvg', () => {
  const out = recolorSvg(SVG, COLORS);

  it('replaces fill of data-dye a and b, including a rect with a mask', () => {
    expect(out).toContain('<rect x="1" y="2" width="3" height="4" fill="#AA0000" data-dye="a" mask="url(#m)"/>');
    expect(out).toContain('<path fill="#00BB00" data-dye="b" stroke="#1F1B1A"');
  });

  it('replaces fill inside style and keeps the other declarations', () => {
    expect(out).toContain('style="fill:#AA0000;stroke:#1F1B1A" data-dye="a"');
    expect(out).toContain('style="stroke:#000; fill:#00BB00 ;opacity:.5"');
  });

  it('leaves outline, shadow, details and defs untouched', () => {
    expect(out).toContain('<path fill="#000000" opacity="0.15" d="M5 5"/>');
    expect(out).toContain('<path fill="none" stroke="#1F1B1A" d="M6 6"/>');
    expect(out).toContain('<circle cx="1" cy="1" r="4" fill="#1F1B1A"/>');
    expect(out).toContain('<rect width="512" height="512" fill="#fff"/>');
    expect(out).toContain('stroke-width="6"');
  });

  it('returns the same text when there are no marks', () => {
    const plain = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#123456" d="M0 0"/></svg>';
    expect(recolorSvg(plain, COLORS)).toBe(plain);
  });

  it('leaves a marked element without fill alone', () => {
    const s = '<svg><path data-dye="a" stroke="#000" d="M0 0"/></svg>';
    expect(recolorSvg(s, COLORS)).toBe(s);
  });

  it('ignores unknown marks', () => {
    const s = '<svg><path fill="#123456" data-dye="c" d="M0 0"/></svg>';
    expect(recolorSvg(s, COLORS)).toBe(s);
  });

  it('is idempotent', () => {
    expect(recolorSvg(out, COLORS)).toBe(out);
  });

  it('works with single quotes', () => {
    const s = "<svg><path fill='#123456' data-dye='a' d='M0 0'/></svg>";
    expect(recolorSvg(s, COLORS)).toBe("<svg><path fill='#AA0000' data-dye='a' d='M0 0'/></svg>");
  });
});

describe('sizeSvg', () => {
  it('sets width and height on the root only', () => {
    const r = sizeSvg(SVG, 256);
    expect(r).toContain('viewBox="0 0 512 512" width="256" height="256">');
    expect(r.match(/width="512"/g)).toHaveLength(1); // only the inner mask rect keeps its own
  });

  it('adds them when missing', () => {
    expect(sizeSvg('<svg viewBox="0 0 1 1"><g/></svg>', 64)).toBe('<svg viewBox="0 0 1 1" width="64" height="64"><g/></svg>');
  });

  it('throws when there is no svg root', () => {
    expect(() => sizeSvg('<div/>', 10)).toThrow();
  });
});

describe('with a real sweater', () => {
  it('recolors the marks of art/clothes and keeps the ink', () => {
    const svg = Object.values(sweaters)[0];
    const real = recolorSvg(svg, COLORS);
    expect(real).toContain('fill="#AA0000" data-dye="a"');
    expect(real).toContain('fill="#00BB00" data-dye="b"');
    expect(real).not.toContain('#D8CCFF');
    expect(real.match(/#1F1B1A/g)).toEqual(svg.match(/#1F1B1A/g));
  });
});

describe('dyeTextureKey', () => {
  it('joins texture and dye with ~', () => {
    expect(dyeTextureKey('sweater-fresa', 'lila')).toBe('sweater-fresa~lila');
  });

  it('water is the original texture', () => {
    expect(WATER_DYE).toBe('agua');
    expect(dyeTextureKey('sweater-fresa', 'agua')).toBe('sweater-fresa');
  });
});
