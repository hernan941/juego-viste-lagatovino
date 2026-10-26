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
