import { describe, expect, it } from 'vitest';
import { EXPRESSIONS } from '../../src/game/domain/expressions';

const faces = import.meta.glob('/public/assets/cats/base/face-*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const face = (e: string) => faces[`/public/assets/cats/base/face-${e}.svg`] ?? '';

describe('expresiones (F12.6, ADR 0016)', () => {
  it('son seis y puaj existe', () => {
    expect([...EXPRESSIONS]).toEqual(['normal', 'feliz', 'sorpresa', 'parpadeo', 'amor', 'puaj']);
  });

  it.each([...EXPRESSIONS])('%s: cara de tinta, sin mejillas ni :3 de la v1', (e) => {
    const svg = face(e);
    expect(svg).not.toContain('#4A3036');
    expect(svg).not.toContain('#33242A');
    expect(svg).not.toContain('fill-opacity="0.6"'); // las mejillas
    expect(svg).not.toContain('M236 240 C236 254 254 256'); // la boca :3
    expect(svg).toContain('#1F1B1A');
  });

  it.each(['normal', 'sorpresa', 'feliz', 'parpadeo', 'puaj'])('%s: los ojos siguen en (192, 224) y (320, 224) para que calcen los lentes', (e) => {
    const svg = face(e);
    // el centro de cada ojo se declara con data-eye="l" / "r" (cx cy)
    expect(svg).toMatch(/data-eye="l"[^>]*data-c="192 224"/);
    expect(svg).toMatch(/data-eye="r"[^>]*data-c="320 224"/);
  });

  it('el normal tiene ojos almendra con brillito, nariz triangular y boca en y', () => {
    const svg = face('normal');
    expect(svg).toContain('class="almond"');
    expect(svg).toContain('class="nose"');
    expect(svg).toContain('class="mouth-y"');
    expect(svg).toContain('#D9A48C');
  });

  it('puaj: ojos de rayita y boquita ondulada', () => {
    const svg = face('puaj');
    expect(svg).toContain('class="eye-dash"');
    expect(svg).toContain('class="mouth-wavy"');
  });
});
