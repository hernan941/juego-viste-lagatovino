import { describe, expect, it } from 'vitest';

// F12.8, F12.13, F12.14 y F12.15: el arte de UI de la segunda etapa (art-direction v2, ADR 0016).
// Fuente en art/, copia que carga el juego en public/assets/ (npm run art).
const source = import.meta.glob<string>(['/art/ui/**/*.svg', '/art/photo/**/*.svg'], { query: '?raw', import: 'default', eager: true });
const published = import.meta.glob<string>(['/public/assets/ui/**/*.svg', '/public/assets/photo/**/*.svg'], { query: '?raw', import: 'default', eager: true });

/** Carpeta (bajo art/ y public/assets/) → archivos que debe tener, sin la extensión. */
const EXPECTED: Record<string, string[]> = {
  // F12.8: armellita, argollas, dije, cadenita, barniz (y su franja), tarjeta kraft del empaque, fondo del colgador
  'ui/keychain': ['ring-eyelet', 'ring-silver', 'ring-gold', 'charm-star', 'chain', 'varnish', 'varnish-streak', 'package-card', 'hanger-board'],
  // F12.13: etiqueta, tijera, monedero, botón-moneda
  'ui/shop': ['price-tag', 'scissors', 'purse', 'coin'],
  // F12.13: 10 frascos + agua, gota, salpicadura, puntito
  'ui/dyes': [
    ...['cielo', 'rosa', 'sol', 'lila', 'durazno', 'naranjo', 'lapiz', 'frambuesa', 'tomate', 'hoja', 'agua'].map((d) => `dye-${d}`),
    'drop',
    'splash',
    'dot',
  ],
  // F12.14
  'ui/album': ['cover', 'page', 'tab-prendas', 'tab-gatos', 'tab-looks', 'tab-tintes', 'tab-colgador'],
  'photo/backgrounds': ['cuadriculado', 'cielo', 'vichy', 'rayado', 'estrellas', 'escenario'],
  'photo/frames': ['polaroid', 'cuaderno', 'dorado', 'acuarela', 'kofi'],
  'photo/stickers': ['estrella', 'corazon', 'huellita', 'xoxo', 'fresa', 'flor', 'kofi', 'zzz', 'nube', 'ovillo', 'pescadito', 'luna'],
  'photo': ['jar'],
  // F12.15
  'ui/runway': ['paper-card', 'stamp-star', 'stamp-star-sol', 'pencil-mark', 'note-polaroid'],
};

// Frascos de tinte: los hex salen de art-direction v2 §4 (colores de la marca) y son los de dyes.json.
const DYE_HEX: Record<string, string> = {
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
};

// Tokens de la v1 (rosa pastel, contorno marrón) que no pueden volver.
const V1_COLORS = ['#4A3036', '#FF8FB8', '#E2578B', '#FFD1E3', '#FFF0F6', '#5A3A48'];

function filesIn(files: Record<string, string>, root: string, dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, svg] of Object.entries(files)) {
    const rest = path.slice(`${root}/${dir}/`.length);
    if (path.startsWith(`${root}/${dir}/`) && !rest.includes('/')) out[rest.replace(/\.svg$/, '')] = svg;
  }
  return out;
}

/** Revisa que las etiquetas abran y cierren en orden (el SVG se escribe a mano). */
function tagsBalanced(svg: string): boolean {
  const stack: string[] = [];
  const body = svg.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = m;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return false;
    } else {
      stack.push(name);
    }
  }
  return stack.length === 0;
}

const all = Object.entries(EXPECTED).flatMap(([dir, names]) => names.map((name) => ({ dir, name })));

describe.each(Object.entries(EXPECTED))('arte de %s', (dir, names) => {
  it('tiene exactamente los archivos esperados en art/ y en public/assets/', () => {
    expect(Object.keys(filesIn(source, '/art', dir)).sort()).toEqual([...names].sort());
    expect(Object.keys(filesIn(published, '/public/assets', dir)).sort()).toEqual([...names].sort());
  });

  it('la copia publicada es idéntica a la fuente', () => {
    const a = filesIn(source, '/art', dir);
    const b = filesIn(published, '/public/assets', dir);
    for (const n of names) expect(b[n], n).toBe(a[n]);
  });
});

describe.each(all)('$dir/$name.svg', ({ dir, name }) => {
  const svg = filesIn(source, '/art', dir)[name] ?? '';

  it('es un SVG bien formado con viewBox, tamaño y comentario de cabecera', () => {
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(vb, 'viewBox "0 0 w h"').toBeTruthy();
    expect(svg).toContain(`width="${vb?.[1]}" height="${vb?.[2]}"`);
    expect(svg).toMatch(/<!--\s*Viste Lagato/);
    expect(tagsBalanced(svg)).toBe(true);
  });

  it('cumple el checklist v2: sin negro puro, sin colores de la v1, sin texto ni recursos externos', () => {
    expect(svg).not.toMatch(/#000(?:000)?\b/i);
    expect(svg).not.toMatch(/(?:fill|stroke)="(?:black|white)"/i);
    for (const c of V1_COLORS) expect(svg.toUpperCase(), c).not.toContain(c);
    // el texto lo pone Phaser con las fuentes autoalojadas: un SVG cargado como imagen no las ve
    expect(svg).not.toMatch(/<text[\s>]/);
    expect(svg).not.toMatch(/font-family|<image|href="https?:|<script|<foreignObject/);
  });

  it('dibuja con el contorno de tinta #1F1B1A (salvo las texturas de fondo y de barniz)', () => {
    const plain = dir === 'photo/backgrounds' || name === 'varnish' || name === 'varnish-streak' || name === 'hanger-board' || name === 'dot';
    if (!plain) expect(svg.toUpperCase()).toContain('#1F1B1A');
  });
});

describe('frascos de tinte', () => {
  it.each(Object.entries(DYE_HEX))('dye-%s usa el hex de la marca (%s) en el líquido', (id, hex) => {
    const svg = filesIn(source, '/art', 'ui/dyes')[`dye-${id}`];
    expect(svg).toContain(`data-dye-hex="${hex}"`);
    expect(svg).toContain(`id="liquid" fill="${hex}"`);
  });

  it('el frasco de agua marca su líquido como agua, sin color de la marca', () => {
    const svg = filesIn(source, '/art', 'ui/dyes')['dye-agua'];
    expect(svg).toContain('data-dye-hex="agua"');
    for (const hex of Object.values(DYE_HEX)) expect(svg.toUpperCase()).not.toContain(`id="liquid" fill="${hex}"`);
  });

  it('todos los frascos comparten el mismo lienzo para calzar en la misma celda', () => {
    const sizes = new Set(
      Object.entries(filesIn(source, '/art', 'ui/dyes'))
        .filter(([n]) => n.startsWith('dye-'))
        .map(([, svg]) => svg.match(/viewBox="([^"]+)"/)?.[1]),
    );
    expect(sizes.size).toBe(1);
  });
});

describe('piezas del llavero', () => {
  const kc = filesIn(source, '/art', 'ui/keychain');

  it('las argollas comparten lienzo y la dorada no usa el color de la plateada', () => {
    expect(kc['ring-silver'].match(/viewBox="([^"]+)"/)?.[1]).toBe(kc['ring-gold'].match(/viewBox="([^"]+)"/)?.[1]);
    expect(kc['ring-gold']).toContain('#F5D86A');
    expect(kc['ring-silver']).not.toContain('#F5D86A');
  });

  it('el barniz usa el lienzo de 512 del gato para recortarse a su silueta', () => {
    expect(kc['varnish']).toContain('viewBox="0 0 512 512"');
    expect(kc['varnish']).toContain('fill-opacity');
  });

  it('la tarjeta del empaque es kraft, con el agujero para colgar', () => {
    expect(kc['package-card'].toUpperCase()).toContain('#F1D1C0');
    expect(kc['package-card']).toContain('fill-rule="evenodd"');
  });

  it('el colgador tiene 12 ganchos, uno por gato', () => {
    expect((kc['hanger-board'].match(/class="hook"/g) ?? []).length).toBe(12);
  });
});

describe('modo foto', () => {
  it('los fondos y los marcos comparten el lienzo 4:5 de la foto', () => {
    for (const dir of ['photo/backgrounds', 'photo/frames']) {
      for (const [n, svg] of Object.entries(filesIn(source, '/art', dir))) {
        expect(svg, `${dir}/${n}`).toContain('viewBox="0 0 540 675"');
      }
    }
  });

  it('los marcos dejan la ventana transparente para ver el fondo y al gato', () => {
    for (const [n, svg] of Object.entries(filesIn(source, '/art', 'photo/frames'))) {
      expect(svg, n).toContain('fill-rule="evenodd"');
    }
  });

  it('los stickers comparten el lienzo de 128 de alto y llevan borde blanco de sticker', () => {
    for (const [n, svg] of Object.entries(filesIn(source, '/art', 'photo/stickers'))) {
      expect(svg.match(/viewBox="0 0 \d+ (\d+)"/)?.[1], n).toBe('128');
      expect(svg.toUpperCase(), n).toContain('#FFFFFF');
    }
  });
});

describe('pasarela', () => {
  it('el sello normal y el de sol comparten lienzo y se distinguen por color', () => {
    const r = filesIn(source, '/art', 'ui/runway');
    expect(r['stamp-star'].match(/viewBox="([^"]+)"/)?.[1]).toBe(r['stamp-star-sol'].match(/viewBox="([^"]+)"/)?.[1]);
    expect(r['stamp-star-sol'].toUpperCase()).toContain('#F3C04A');
    expect(r['stamp-star'].toUpperCase()).not.toContain('#F3C04A');
  });

  it('el tachoncito de lápiz no es rojo alarma (art-direction §6)', () => {
    const svg = filesIn(source, '/art', 'ui/runway')['pencil-mark'];
    expect(svg.toUpperCase()).not.toMatch(/#C8372F|#E2465A|#F0707A|#C2306B/);
  });
});
