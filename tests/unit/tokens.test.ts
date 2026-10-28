import { describe, expect, it } from 'vitest';
import { FontFaces, Fonts, Ink } from '../../src/game/constants';

const css = Object.values(import.meta.glob<string>('/public/style.css', { query: '?raw', import: 'default', eager: true }))[0];
const files = new Set(Object.keys(import.meta.glob('/public/fonts/*', { query: '?url' })));

describe('Ink (tokens v2, art-direction §4)', () => {
  it('defines paper, ink and card tokens', () => {
    expect(Ink).toMatchObject({
      cremaPapel: '#FFFCF5',
      lineaCuadricula: '#C9DBF1',
      tarjeta: '#FFFFFF',
      borde: '#E8E0D2',
      sombraTarjeta: '#F4EEE3',
      tinta: '#1F1B1A',
      mutedTexto: '#6A5F57',
      lineaLapiz: '#8FA8E3',
      kraft: '#F1D1C0',
    });
  });

  it('defines the brand colors', () => {
    expect(Ink).toMatchObject({
      cielo: '#CFE0F3',
      rosa: '#F6BFD0',
      sol: '#F3C04A',
      lila: '#D9CDF3',
      durazno: '#F1D1C0',
      naranjo: '#E98A2B',
      lapiz: '#3A5FC4',
      frambuesa: '#C2306B',
      tomate: '#C8372F',
      hoja: '#3F7D3B',
    });
  });

  it('defines the face colors', () => {
    expect(Ink).toMatchObject({ brilloOjo: '#FFFFFF', nariz: '#D9A48C' });
  });

  it('every token is a #RRGGBB hex', () => {
    for (const value of Object.values(Ink)) expect(value).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('Fonts (ADR 0016)', () => {
  it('names the three families', () => {
    expect(Fonts.Title).toContain('Londrina Solid');
    expect(Fonts.Voice).toContain('Gaegu');
    expect(Fonts.Body).toContain('system-ui');
  });

  it('Gaegu has no accented Latin glyphs, so Voice falls back to a font that has them', () => {
    expect(Fonts.Voice).toMatch(/^Gaegu,.*Londrina Solid/);
  });

  it('lists Londrina Solid 400/900, Gaegu 400/700 and the accents alias 400/700', () => {
    expect(FontFaces.map((f) => `${f.family} ${f.weight}`)).toEqual([
      'Londrina Solid 400',
      'Londrina Solid 900',
      'Gaegu 400',
      'Gaegu 700',
      'Londrina Acentos 400',
      'Londrina Acentos 700',
    ]);
  });

  it('each face is self-hosted: the file exists and style.css declares it', () => {
    for (const face of FontFaces) {
      expect(files.has(`/public/fonts/${face.file}`), face.file).toBe(true);
      expect(css).toContain(`fonts/${face.file}`);
    }
    expect(files.has('/public/fonts/OFL-gaegu.txt')).toBe(true);
    expect(files.has('/public/fonts/OFL-londrinasolid.txt')).toBe(true);
  });
});
