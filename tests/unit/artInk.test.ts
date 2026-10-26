import { describe, expect, it } from 'vitest';

// Art direction v2 (ADR 0016): ink outline #1F1B1A, brush copy under the stroke, durazno ears.
const all = import.meta.glob('/public/assets/cats/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const svgs = (dir: 'cats/noface' | 'cats/tail'): [string, string][] =>
  Object.entries(all)
    .filter(([p]) => p.includes(`/${dir}/`))
    .map(([p, svg]) => [p.split('/').pop() as string, svg]);

describe('gatos con trazo de tinta (F12.5)', () => {
  const bodies = svgs('cats/noface');
  const tails = svgs('cats/tail');

  it('hay 12 gatos', () => {
    expect(bodies).toHaveLength(12);
    expect(tails).toHaveLength(12);
  });

  it.each(bodies)('%s: contorno de tinta, sin el café de la v1', (_f, svg) => {
    expect(svg).toContain('#1F1B1A');
    expect(svg).not.toContain('#4A3036');
  });

  it.each(bodies)('%s: el contorno de la cabeza tiene la copia desplazada de pincel', (_f, svg) => {
    expect(svg).toMatch(/<use href="#head-shape"[^>]*stroke="#1F1B1A"[^>]*stroke-width="7"[^>]*transform="translate\(1\.5 2\)"/);
  });

  it.each(bodies)('%s: interior de las orejas en durazno', (_f, svg) => {
    expect(svg).toContain('#F1D1C0');
    expect(svg).not.toContain('#FF9EB5');
  });

  it.each(tails)('%s: la cola también lleva tinta y copia de pincel', (_f, svg) => {
    expect(svg).toContain('#1F1B1A');
    expect(svg).not.toContain('#4A3036');
    expect(svg).toMatch(/<use href="#tail-shape"[^>]*transform="translate\(1\.5 2\)"/);
  });
});

// F12.R A1: the closed-eye faces carry a light halo under every ink stroke, so they read on dark coats.
describe('caras con ojos cerrados legibles en pelajes oscuros (F12.R A1)', () => {
  const faces = Object.entries(all).filter(([p]) => /face-(puaj|feliz|parpadeo)\.svg$/.test(p));

  it('hay tres caras de ojos cerrados', () => {
    expect(faces).toHaveLength(3);
  });

  it.each(faces)('%s: cada trazo de ojo y boca lleva debajo un halo claro', (_p, svg) => {
    const halos = [...svg.matchAll(/<path class="halo"[^>]*>/g)];
    // two eyes and a mouth
    expect(halos.length).toBeGreaterThanOrEqual(3);
    for (const m of halos) {
      expect(m[0]).toMatch(/stroke="#FFFFFF"/);
      expect(m[0]).toMatch(/stroke-opacity="0\.5"/);
    }
  });

  it('the open-eye face stays without halo', () => {
    const normal = Object.entries(all).find(([p]) => p.endsWith('face-normal.svg'))?.[1] ?? '';
    expect(normal).not.toContain('class="halo"');
  });
});

// F12.R B4: every lens frame has an ink outline wider than its colored frame and a colored frame that is not a hairline.
describe('marcos de lentes con contorno de tinta (F12.R B4)', () => {
  const lenses = Object.entries(
    import.meta.glob('/public/assets/clothes/face/lentes-*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
  ).filter(([p]) => !p.endsWith('.icon.svg'));

  it('hay cinco lentes', () => {
    expect(lenses).toHaveLength(5);
  });

  it.each(lenses)('%s: lente con trazo de tinta exterior y marco de color de al menos 8 px', (_p, svg) => {
    for (const g of svg.matchAll(/<g transform="translate\([\d.]+ [\d.]+\) scale\(([\d.]+)\)">([\s\S]*?)<\/g>/g)) {
      const k = Number(g[1]);
      const strokes = [...g[2]!.matchAll(/stroke="(#[0-9A-Fa-f]{6})" stroke-width="([\d.]+)"/g)]
        .filter((m) => m[1] !== '#FFFFFF' && m[1] !== '#FFF0A8')
        .map((m) => ({ color: m[1]!.toUpperCase(), width: Number(m[2]) * k }));
      const ink = Math.max(...strokes.filter((s) => s.color === '#1F1B1A').map((s) => s.width));
      const frame = Math.max(...strokes.filter((s) => s.color !== '#1F1B1A').map((s) => s.width));
      expect(frame).toBeGreaterThanOrEqual(8);
      expect(ink).toBeGreaterThan(frame);
    }
  });
});
