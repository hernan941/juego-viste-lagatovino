import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';
import css from '../../public/style.css?raw';
import main from '../../src/game/main.ts?raw';
import { Ink } from '../../src/game/constants';

// F12.R M7: on a phone the strips around the paper must be paper, not v1 pink.
describe('background outside the canvas (crema-papel)', () => {
  it('the page and the rotate hint use crema-papel', () => {
    expect(css).not.toMatch(/#FFF0F6/i);
    expect(css.match(new RegExp(Ink.cremaPapel, 'gi'))?.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toMatch(/#FFF0F6/i);
    expect(html).toContain(`content="${Ink.cremaPapel}"`);
  });

  it('the Phaser canvas background is crema-papel', () => {
    expect(main).toContain('backgroundColor: Ink.cremaPapel');
    expect(main).not.toContain('Palette.rosa50');
  });
});
