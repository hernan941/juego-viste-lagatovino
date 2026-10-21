import { expect } from '@playwright/test';
import { test } from './helpers';

/**
 * F9: the load, from the start of the page until the Title scene is up (the Preloader is over), against the production build
 * (`npm run preview`) with a cold cache. The target is 3 s on a machine with a GPU. This machine renders with software WebGL
 * (SwiftShader), where rasterizing and uploading the ~130 SVG textures is several times slower, so the guard there is looser;
 * the number is always printed.
 */
const GPU_BUDGET_MS = 3000;
const SOFTWARE_BUDGET_MS = 6000;

test('the production build loads to the Title within the budget with a cold cache', async ({ page }) => {
  // `?e2e=1` turns the test hook on in the production build (it is read-only and never on in a normal visit).
  await page.goto('/?e2e=1');
  const at = await page.waitForFunction(() => window.__VISTE__?.scene === 'Title' && performance.now(), undefined, { timeout: 30_000 });
  const titleMs = (await at.jsonValue()) as number;
  const ready = await page.waitForFunction(() => window.__VISTE__?.ui?.ready === true && performance.now(), undefined, { timeout: 30_000 });
  const readyMs = (await ready.jsonValue()) as number;
  const software = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'none';
    return /swiftshader|llvmpipe|software|none/i.test(name) ? name : null;
  });
  const budget = software ? SOFTWARE_BUDGET_MS : GPU_BUDGET_MS;
  console.log(`load: Title up at ${Math.round(titleMs)} ms and its button ready at ${Math.round(readyMs)} ms (renderer: ${software ?? 'GPU'}, budget ${budget} ms)`);
  expect(titleMs).toBeLessThan(budget);
});
