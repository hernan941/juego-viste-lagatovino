// F9 (ADR 0012, suite (c)): the catalog on several cats. The cats are the first, the middle and the last of cats.json.
import { expect } from '@playwright/test';
import { bySlot, cats, clearCat, clothes, equipItem, openGame, sharedTest as test } from './helpers';

const categories = [...new Set(clothes.map((c) => c.category))];
const picks = [cats[0], cats[Math.floor(cats.length / 2)], cats[cats.length - 1]];

test('the catalog has at least 9 cats and the three under test are different', () => {
  expect(cats.length).toBeGreaterThanOrEqual(9);
  expect(new Set(picks.map((c) => c.id)).size).toBe(3);
});

for (const cat of picks) {
  test(`on "${cat.id}" the first item of every category is dragged on and worn`, async ({ page }) => {
    test.setTimeout(120_000);
    expect((await openGame(page, { cat: cat.id })).catId).toBe(cat.id);
    for (const category of categories) {
      const item = bySlot(category)[0];
      await test.step(`${category}: ${item.id}`, async () => {
        const s = await equipItem(page, item);
        expect(s.catId).toBe(cat.id);
        expect(s.outfit).toEqual({ [item.slot]: item.id });
        expect(s.drawOrder).toEqual([item.id]);
        await clearCat(page);
      });
    }
  });
}
