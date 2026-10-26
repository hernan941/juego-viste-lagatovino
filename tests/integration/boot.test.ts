import { afterEach, describe, expect, it, vi } from 'vitest';

// Phaser needs a browser to import. Boot only needs a Scene base class.
vi.mock('phaser', () => ({ Scene: class { constructor(public key?: string) {} } }));
const go = vi.fn();
vi.mock('../../src/game/systems/navigate', () => ({ go: (...a: unknown[]) => go(...a) }));

import { Boot } from '../../src/game/scenes/Boot';
import { fontSpecs } from '../../src/game/systems/fonts';

describe('Boot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    go.mockClear();
  });

  it('waits for the title, voice and body-fallback fonts before moving on', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const load = vi.fn(() => gate);
    vi.stubGlobal('document', { fonts: { load } });

    new Boot().create();
    await Promise.resolve();
    expect(load.mock.calls.map((c) => (c as unknown[])[0])).toEqual(expect.arrayContaining(fontSpecs()));
    expect(go).not.toHaveBeenCalled();

    release();
    await vi.waitFor(() => expect(go).toHaveBeenCalledTimes(1));
    expect(go.mock.calls[0][1]).toBe('boot');
  });
});
