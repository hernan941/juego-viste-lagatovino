import { describe, expect, it } from 'vitest';
import clothes from '../../src/game/data/clothes.json';
import { dyeLines } from '../../src/game/domain/copy';
import { applyDye, resolveDyeDrop } from '../../src/game/domain/dyeDrop';
import type { ClothingDef } from '../../src/game/domain/types';

const items = clothes as unknown as ClothingDef[];
const sweater = items.find((c) => c.dyeable)!;
const plain = items.find((c) => !c.dyeable)!;

describe('resolveDyeDrop', () => {
  it('dyes the worn item under the bottle when it can be dyed', () => {
    expect(resolveDyeDrop(sweater, true)).toEqual({ kind: 'dye', item: sweater });
  });

  it('bounces off an item that does not take a dye', () => {
    expect(resolveDyeDrop(plain, true)).toEqual({ kind: 'notDyeable', item: plain });
  });

  it('says "not me" over the cat when there is no garment at that point', () => {
    expect(resolveDyeDrop(null, true)).toEqual({ kind: 'noItem' });
  });

  it('is a plain miss away from the cat', () => {
    expect(resolveDyeDrop(null, false)).toEqual({ kind: 'miss' });
  });

  it('an item under the bottle is the target even if the zone says it is outside', () => {
    expect(resolveDyeDrop(sweater, false)).toEqual({ kind: 'dye', item: sweater });
  });
});

describe('applyDye', () => {
  it('sets the dye of the item without touching the others', () => {
    expect(applyDye({ a: 'lila' }, 'b', 'rosa')).toEqual({ a: 'lila', b: 'rosa' });
  });

  it('replaces the previous dye of the same item', () => {
    expect(applyDye({ a: 'lila' }, 'a', 'rosa')).toEqual({ a: 'rosa' });
  });

  it('water brings the original color back: the entry leaves', () => {
    expect(applyDye({ a: 'lila', b: 'rosa' }, 'a', 'agua')).toEqual({ b: 'rosa' });
  });

  it('returns the same object when nothing changes', () => {
    const same = { a: 'lila' };
    expect(applyDye(same, 'a', 'lila')).toBe(same);
    expect(applyDye(same, 'z', 'agua')).toBe(same);
  });

  it('does not mutate its input', () => {
    const input = { a: 'lila' };
    applyDye(input, 'b', 'rosa');
    expect(input).toEqual({ a: 'lila' });
  });
});

describe('dyeLines', () => {
  it('has the two voices of the refusals', () => {
    expect(dyeLines.notMe).toBe('¡A mí no!');
    expect(dyeLines.notDyeable).toBe('Ese no se tiñe');
  });

  it('names the tab and the tip', () => {
    expect(dyeLines.tab).toBe('Tintes');
    expect(dyeLines.tip.length).toBeGreaterThan(0);
  });
});
