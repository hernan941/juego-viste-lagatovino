import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../integration/helpers/kitScene')).phaserMock);

import { NEW_MARK_SIZE } from '../../src/game/objects/album/NewMark';

describe('NewMark (M6, the cheap part)', () => {
  it('is small, about 60% of the old sparkle (15), so it does not cover the cell next to it', () => {
    expect(NEW_MARK_SIZE).toBeLessThanOrEqual(9);
    expect(NEW_MARK_SIZE).toBeGreaterThanOrEqual(7);
  });
});
