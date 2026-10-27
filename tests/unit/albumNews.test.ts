import { describe, expect, it } from 'vitest';
import { albumHasNews, albumNews, gotOfSection, pendingMilestones, seenIdOf, type AlbumSection } from '../../src/game/domain/album';
import { applyAlbumNews, emptyProgress, markSeen } from '../../src/game/domain/progress';
import { assertGameData } from '../../src/game/data/schema';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import economy from '../../src/game/data/economy.json';
import dyes from '../../src/game/data/dyes.json';
import sets from '../../src/game/data/sets.json';
import photo from '../../src/game/data/photo.json';
import brand from '../../src/game/data/brand.json';
import tags from '../../src/game/data/tags.json';

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand, tags });
const abriguito = catalog.sets.find((s) => s.id === 'abriguito')!;
const withAbriguito = () => {
  const p = emptyProgress(0);
  return { ...p, owned: abriguito.requires.items!.filter((id) => !catalog.clothes.find((c) => c.id === id)?.starter) };
};
const PREFIX: Record<AlbumSection, string> = { items: 'item:', tastes: 'taste:', combos: 'combo:', dyes: 'dye:', keychains: 'keychain:' };

/** A progress that has every entry of the album. */
const everything = () => ({
  ...emptyProgress(0),
  owned: catalog.clothes.filter((c) => !c.starter && !c.secret).map((c) => c.id),
  dyesOwned: catalog.dyes.map((d) => d.id),
  secrets: catalog.combos.map((c) => c.id),
  tastesFound: Object.fromEntries(
    catalog.cats.map((c) => [c.id, ['favorite', 'color', ...(c.prefs?.loves ?? []).map((t) => `love:${t}`), ...(c.prefs?.dislikes ?? []).map((t) => `dislike:${t}`)]]),
  ),
});

describe('seenIdOf', () => {
  it('namespaces what the album announces so it cannot clash with the entries', () => {
    expect(seenIdOf.set('abriguito')).toBe('set:abriguito');
    expect(seenIdOf.unlock('frames', 'frame-dorado')).toBe('unlock:frames:frame-dorado');
    expect(seenIdOf.milestone(25)).toBe('milestone:25');
  });
});

describe('gotOfSection', () => {
  it('lists the entries got of one section of the album', () => {
    const p = { ...emptyProgress(0), dyesOwned: ['cielo'] };
    expect(gotOfSection('dyes', p, catalog)).toContain('dye:cielo');
    expect(gotOfSection('combos', p, catalog)).toEqual([]);
  });
  it('gives every section its own prefix', () => {
    for (const s of Object.keys(PREFIX) as AlbumSection[]) {
      expect(gotOfSection(s, everything(), catalog).every((id) => id.startsWith(PREFIX[s]))).toBe(true);
    }
  });
});

describe('albumNews', () => {
  it('is empty with nothing new', () => {
    expect(albumNews(emptyProgress(0), catalog)).toEqual({ sets: [], unlocks: [] });
  });
  it('announces a complete set and the photo pieces it unlocks, never the starters', () => {
    const news = albumNews(withAbriguito(), catalog);
    expect(news.sets).toEqual(['abriguito']);
    expect(news.unlocks).toContain('backgrounds:bg-vichy');
    expect(news.unlocks.some((id) => id.includes('bg-cuadriculado'))).toBe(false);
  });
  it('does not announce again what albumSeen already holds', () => {
    const seen = { ...withAbriguito(), albumSeen: [seenIdOf.set('abriguito'), seenIdOf.unlock('backgrounds', 'bg-vichy')] };
    expect(albumNews(seen, catalog)).toEqual({ sets: [], unlocks: [] });
  });
});

describe('pendingMilestones', () => {
  it('is empty at 0 % and lists the reached milestones that were not celebrated', () => {
    expect(pendingMilestones(emptyProgress(0), catalog)).toEqual([]);
    const pending = pendingMilestones(everything(), catalog);
    expect(pending).toEqual(expect.arrayContaining([25, 50, 75]));
    expect(pendingMilestones({ ...everything(), albumSeen: [seenIdOf.milestone(25)] }, catalog)).not.toContain(25);
  });
});

describe('markSeen', () => {
  it('adds ids once and keeps the same object when nothing is new', () => {
    const p = emptyProgress(0);
    const next = markSeen(p, ['item:a', 'item:a']);
    expect(next.albumSeen).toEqual(['item:a']);
    expect(p.albumSeen).toEqual([]);
    expect(markSeen(next, ['item:a'])).toBe(next);
  });
});

describe('applyAlbumNews (ADR 0017)', () => {
  it('turns a new set into setCompleted then unlock, and writes it down so it is told once', () => {
    const applied = applyAlbumNews(withAbriguito(), catalog);
    expect(applied.events[0]).toEqual({ type: 'setCompleted', setId: 'abriguito' });
    expect(applied.events[1]).toMatchObject({ type: 'unlock' });
    expect(applied.progress.albumSeen).toContain('set:abriguito');
    const again = applyAlbumNews(applied.progress, catalog);
    expect(again.events).toEqual([]);
    expect(again.progress).toBe(applied.progress);
  });
  it('has no events when nothing happened', () => {
    const p = emptyProgress(5);
    expect(applyAlbumNews(p, catalog)).toEqual({ progress: p, events: [] });
  });
});

describe('albumHasNews (the sparkle of the notebook button)', () => {
  it('is on while something got is unseen, and off once every section was seen', () => {
    const p = withAbriguito();
    expect(albumHasNews(p, catalog)).toBe(true);
    const seenAll = (['items', 'tastes', 'combos', 'dyes', 'keychains'] as const).flatMap((s) => gotOfSection(s, p, catalog));
    expect(albumHasNews(markSeen(p, seenAll), catalog)).toBe(false);
  });
  it('a brand new player already has the starters to look at', () => {
    expect(albumHasNews(emptyProgress(0), catalog)).toBe(true);
  });
});
