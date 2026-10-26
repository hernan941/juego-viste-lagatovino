import { describe, expect, it } from 'vitest';
import { DyeService } from '../../src/game/plugins/dyeService';
import { CLOTHING_TEXTURE_SIZE, buildDyeSourceEntries, dyeSvgKey } from '../../src/game/data/assets';
import type { ClothingDef, DyeDef } from '../../src/game/domain/types';

const SVG = '<svg viewBox="0 0 10 10"><path data-dye="a" fill="#111111"/><path data-dye="b" fill="#222222"/><path fill="#000"/></svg>';
const clothes = [
  { id: 'sweater-rayas', slot: 'sweater', texture: 'tx-rayas', dyeable: true },
  { id: 'hat-gorro', slot: 'hat', texture: 'tx-gorro' },
] as unknown as ClothingDef[];
const dyes: DyeDef[] = [{ id: 'rosa', name: 'Rosa', hex: '#F6BFD0' }];

const make = (svgs: Record<string, string> = { [dyeSvgKey('tx-rayas')]: SVG }) => {
  const rasterized: { key: string; svg: string }[] = [];
  const removed: string[] = [];
  const service = new DyeService({
    clothes,
    dyes,
    readSvg: (k) => svgs[k],
    rasterize: async (key, svg) => void rasterized.push({ key, svg }),
    remove: (k) => void removed.push(k),
    inUse: () => false,
  });
  return { service, rasterized, removed };
};

describe('buildDyeSourceEntries', () => {
  it('lists the SVG text of the dyeable items only', () => {
    expect(buildDyeSourceEntries(clothes)).toEqual([{ key: dyeSvgKey('tx-rayas'), path: 'assets/clothes/sweater/rayas.svg' }]);
  });
});

describe('DyeService', () => {
  it('rasterizes the recolored, sized SVG under the dyed key', async () => {
    const { service, rasterized } = make();
    expect(await service.ensure('sweater-rayas', 'rosa')).toBe('tx-rayas~rosa');
    expect(rasterized).toHaveLength(1);
    expect(rasterized[0].key).toBe('tx-rayas~rosa');
    expect(rasterized[0].svg).toContain('fill="#F6BFD0"');
    expect(rasterized[0].svg).toContain('fill="#000"');
    expect(rasterized[0].svg).toContain(`width="${CLOTHING_TEXTURE_SIZE}"`);
  });

  it('the water gives back the original texture without rasterizing', async () => {
    const { service, rasterized } = make();
    expect(await service.ensure('sweater-rayas', 'agua')).toBe('tx-rayas');
    expect(rasterized).toHaveLength(0);
  });

  it('rejects an unknown item, an unknown dye and a non-dyeable item', async () => {
    const { service } = make();
    await expect(service.ensure('nada', 'rosa')).rejects.toThrow(/nada/);
    await expect(service.ensure('sweater-rayas', 'nada')).rejects.toThrow(/nada/);
    await expect(service.ensure('hat-gorro', 'rosa')).rejects.toThrow(/dyeable/);
  });

  it('rejects when the SVG text was not loaded', async () => {
    const { service } = make({});
    await expect(service.ensure('sweater-rayas', 'rosa')).rejects.toThrow(/SVG/);
  });

  it('keyFor is synchronous and isReady says whether the texture is already there', async () => {
    const { service } = make();
    expect(service.keyFor('sweater-rayas', 'rosa')).toBe('tx-rayas~rosa');
    expect(service.keyFor('sweater-rayas', 'agua')).toBe('tx-rayas');
    expect(service.isReady('sweater-rayas', 'rosa')).toBe(false);
    await service.ensure('sweater-rayas', 'rosa');
    expect(service.isReady('sweater-rayas', 'rosa')).toBe(true);
    expect(service.isReady('sweater-rayas', 'agua')).toBe(true);
  });

  it('removes evicted textures', async () => {
    const svgs = { [dyeSvgKey('tx-rayas')]: SVG };
    const removed: string[] = [];
    const many: DyeDef[] = Array.from({ length: 3 }, (_, i) => ({ id: `d${i}`, name: 'x', hex: '#F6BFD0' }));
    const service = new DyeService({ clothes, dyes: many, readSvg: (k) => svgs[k], rasterize: async () => {}, remove: (k) => void removed.push(k), inUse: () => false, limit: 2 });
    for (const d of many) await service.ensure('sweater-rayas', d.id);
    expect(removed).toEqual(['tx-rayas~d0']);
  });

  it('a retained texture survives eviction until released; destroy removes everything', async () => {
    const svgs = { [dyeSvgKey('tx-rayas')]: SVG };
    const removed: string[] = [];
    const many: DyeDef[] = Array.from({ length: 3 }, (_, i) => ({ id: `d${i}`, name: 'x', hex: '#F6BFD0' }));
    const service = new DyeService({ clothes, dyes: many, readSvg: (k) => svgs[k], rasterize: async () => {}, remove: (k) => void removed.push(k), limit: 1 });
    await service.ensure('sweater-rayas', 'd0');
    service.retain('tx-rayas~d0');
    service.retain('tx-rayas~d0');
    await service.ensure('sweater-rayas', 'd1');
    service.release('tx-rayas~d0');
    await service.ensure('sweater-rayas', 'd2');
    expect(removed).toEqual(['tx-rayas~d1']);
    service.release('tx-rayas~d0');
    await service.ensure('sweater-rayas', 'd1');
    expect(removed).toEqual(['tx-rayas~d1', 'tx-rayas~d0', 'tx-rayas~d2']);
    service.destroy();
    expect(removed).toContain('tx-rayas~d1');
  });
});
