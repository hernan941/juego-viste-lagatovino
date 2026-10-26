// F11.16 (ADR 0014 §8): a one-finger drag for the mobile project. Playwright only has `tap`, so the finger is synthesized with
// the DevTools protocol (Input.dispatchTouchEvent): the page receives real touch events, which the browser turns into the
// pointer events that Phaser reads. Chromium only (the mobile project runs on it).
import type { Page } from '@playwright/test';

type Point = { x: number; y: number };

/**
 * Presses a finger at `from` and drags it through `steps` moves to `to`. With `hold` the finger stays down and `up()` lifts it;
 * otherwise it is lifted before returning.
 */
export async function touchDrag(page: Page, from: Point, to: Point, { steps = 8, hold = false } = {}): Promise<{ up(): Promise<void> }> {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: Point) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
  await send('touchStart', from);
  for (let i = 1; i <= steps; i++) {
    await send('touchMove', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
  }
  const up = async () => {
    await send('touchEnd');
    await cdp.detach();
  };
  if (!hold) await up();
  return { up };
}

/** A real tap (touchstart + touchend, no mouse events). */
export const tap = (page: Page, p: Point) => page.touchscreen.tap(p.x, p.y);
