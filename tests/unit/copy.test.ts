import { describe, expect, it } from 'vitest';
import { showcaseTitle } from '../../src/game/domain/copy';

describe('copy', () => {
  it('praises the cat by name', () => {
    expect(showcaseTitle('Luna')).toBe('¡Qué lindo look, Luna!');
  });
});
