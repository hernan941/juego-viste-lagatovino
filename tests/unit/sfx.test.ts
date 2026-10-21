import { describe, expect, it } from 'vitest';
import { buildAudioManifest } from '../../src/game/data/assets';
import { MEOW_KEYS, SfxKeys } from '../../src/game/constants';

// Every file under public/assets/audio, as /public/assets/audio/... paths (resolved by Vite at test time).
const files = new Set(Object.keys(import.meta.glob('/public/assets/audio/*.{ogg,mp3}')));
const credits = Object.values(
  import.meta.glob<string>('/public/assets/audio/CREDITS.md', { query: '?raw', import: 'default', eager: true }),
).join('\n');
const keys = Object.values(SfxKeys);
const manifest = buildAudioManifest();

describe('SfxKeys', () => {
  it('has unique keys with the sfx- prefix', () => {
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^sfx-[a-z0-9-]+$/);
  });

  it('covers every action in docs/art-direction.md section 9', () => {
    for (const k of ['Grab', 'Drag', 'Drop', 'Purr', 'Return', 'Remove', 'Hover', 'Click', 'Doorbell', 'Shutter', 'Key', 'Gift'] as const) {
      expect(SfxKeys).toHaveProperty(k);
    }
    expect(MEOW_KEYS.length).toBeGreaterThanOrEqual(2);
    for (const m of MEOW_KEYS) expect(keys).toContain(m);
  });
});

describe('buildAudioManifest', () => {
  it('lists every sfx key once with an ogg and an mp3 fallback', () => {
    expect(manifest.map((m) => m.key).sort()).toEqual([...keys].sort());
    for (const m of manifest) expect(m.urls).toEqual([`assets/audio/${m.key}.ogg`, `assets/audio/${m.key}.mp3`]);
  });
});

describe('audio files and credits', () => {
  it.each(keys)('%s has an ogg, an mp3 and a credit line', (key) => {
    expect(files.has(`/public/assets/audio/${key}.ogg`)).toBe(true);
    expect(files.has(`/public/assets/audio/${key}.mp3`)).toBe(true);
    const line = credits.split('\n').find((l) => l.includes(`\`${key}\``));
    expect(line, `CREDITS.md has no row for ${key}`).toBeTruthy();
    expect(line).toMatch(/CC0|sintetizado con scripts\/sfx/);
  });

  it('has no audio file without a key', () => {
    for (const f of files) expect(keys).toContain(f.replace(/^.*\//, '').replace(/\.(ogg|mp3)$/, ''));
  });
});
