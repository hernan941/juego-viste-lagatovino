import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { Fonts } from '../../src/game/constants';
import { catTally } from '../../src/game/domain/catProgress';
import type { CatDef, Progress } from '../../src/game/domain/types';
import { createTallyLabel } from '../../src/game/objects/tallyLabel';
import { makeFakeScene } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const cat = { id: 'gato-01', name: 'Mau', prefs: { loves: ['a', 'b'], dislikes: ['c'] } } as unknown as CatDef;
const progress = (over: Partial<Progress> = {}): Progress => ({
  wallet: 0, owned: [], dyesOwned: [], secrets: [], tastesFound: {}, bestStars: {}, ratedLooks: {}, keychains: {}, albumSeen: [], ...over,
});

describe('createTallyLabel', () => {
  it('writes "♥ 2/5" under the cat from a test progress, in Gaegu', () => {
    const scene = makeFakeScene();
    createTallyLabel(scene as never, 0, 80, catTally(cat, progress({ tastesFound: { 'gato-01': ['love:a', 'favorite'] } })));
    const texts = scene.made.texts.map((t) => ({ text: t.text, font: (t.style as { fontFamily: string }).fontFamily }));
    expect(texts).toContainEqual({ text: '♥ 2/5', font: Fonts.Voice });
  });

  it('shows the best star of the cat with its number', () => {
    const scene = makeFakeScene();
    createTallyLabel(scene as never, 0, 80, catTally(cat, progress({ bestStars: { 'gato-01': 4 } })));
    expect(scene.made.texts.map((t) => t.text)).toContain('4');
  });

  it('draws nothing without progress', () => {
    const scene = makeFakeScene();
    const label = createTallyLabel(scene as never, 0, 80, catTally(cat, undefined));
    expect(scene.made.texts).toHaveLength(0);
    expect(label.list).toHaveLength(0);
  });
});
