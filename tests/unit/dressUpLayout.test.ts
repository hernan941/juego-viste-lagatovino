import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../src/game/domain/types';
import { DYE_TAB_COLOR, DONE_BUTTON, CHANGE_BUTTON, GRID, LAYERS_PANEL, PANEL, TABS_Y, categoryTabColor } from '../../src/game/objects/dressup/layout';
import { GAME_WIDTH, GAME_HEIGHT } from '../../src/game/constants';
import { KIT_MIN_HIT } from '../../src/game/systems/kit';

/** Same as `TAB_SIZE` in objects/Tabs.ts (importing it would pull Phaser into a unit test). */
const TAB_SIZE = 54;

describe('DressUp layout (F20.5)', () => {
  it('the index tabs sit on the top edge of the wardrobe card', () => {
    expect(PANEL.y).toBe(TABS_Y + TAB_SIZE);
  });

  it('the grid fits inside the wardrobe card with room for the hint below it', () => {
    expect(GRID.x).toBeGreaterThanOrEqual(PANEL.x);
    expect(GRID.x + GRID.width).toBeLessThanOrEqual(PANEL.x + PANEL.width);
    expect(GRID.y).toBeGreaterThan(PANEL.y);
    expect(GRID.y + GRID.height).toBeLessThan(PANEL.y + PANEL.height - 20);
  });

  it('the cards stay on the canvas and the layers card does not touch the buttons', () => {
    expect(PANEL.y + PANEL.height).toBeLessThanOrEqual(GAME_HEIGHT);
    expect(LAYERS_PANEL.x + LAYERS_PANEL.width).toBeLessThanOrEqual(GAME_WIDTH);
    expect(LAYERS_PANEL.y + LAYERS_PANEL.height).toBeLessThan(DONE_BUTTON.y - DONE_BUTTON.height / 2);
  });

  it('both pills are big enough for a finger (80 game units once the kit grows the hit area)', () => {
    for (const b of [DONE_BUTTON, CHANGE_BUTTON]) {
      expect(Math.max(b.height, KIT_MIN_HIT)).toBeGreaterThanOrEqual(80);
      expect(b.width).toBeGreaterThanOrEqual(KIT_MIN_HIT);
    }
  });

  it('each category has its own index tab color, and the dye tab is naranjo', () => {
    const colors = CATEGORIES.map(categoryTabColor);
    expect(new Set(colors).size).toBe(CATEGORIES.length);
    expect(DYE_TAB_COLOR).toBe('naranjo');
    expect(colors).not.toContain(DYE_TAB_COLOR);
  });
});

const sources = import.meta.glob('/src/game/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('DressUp no longer uses the first-stage look', () => {
  const files = [
    'scenes/DressUp.ts', 'objects/room.ts', 'objects/LayersPanel.ts', 'objects/ItemGrid.ts', 'objects/ClothingItem.ts', 'objects/Tabs.ts',
    'objects/NameSign.ts', 'objects/SecretCounter.ts', 'objects/tabIcons.ts', 'objects/comboFx.ts', 'objects/dressup/DragFx.ts', 'objects/dressup/dropFx.ts',
  ];
  for (const file of files) {
    it(`${file} does not read Palette or FONT_FAMILY`, () => {
      const source: string = sources[`/src/game/${file}`]!;
      expect(source).not.toMatch(/\bPalette\b|\bFONT_FAMILY\b|\bdrawPanel\b|\bmakeText\b/);
      expect(source).not.toMatch(/\bhex\(/);
    });
  }
});
