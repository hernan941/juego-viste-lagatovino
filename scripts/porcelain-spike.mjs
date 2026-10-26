// F12.9: drives the porcelain lab (?lab=porcelain) in Chromium, takes the screenshots and measures. Usage:
//   npx vite --config vite/config.dev.mjs --mode test --port 8080     (in another terminal)
//   node scripts/porcelain-spike.mjs [outDir] [shots|bench]
// "shots" writes the screenshots and the exported PNGs; "bench" writes results.json (build times and frame times, at CPU 1x, 4x and 6x).
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/spikes/porcelain';
const mode = process.argv[3] ?? 'shots';
mkdirSync(out, { recursive: true });
const url = process.env.LAB_URL ?? 'http://localhost:8080/?lab=porcelain';

export async function open(browser, { throttle = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  if (throttle > 1) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.goto(url);
  await page.waitForFunction(() => !!window.__LAB__, undefined, { timeout: 180_000 });
  await page.evaluate(() => window.__LAB__.prepare(12));
  return { page, context, errors };
}

const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const r1 = (n) => Math.round(n * 10) / 10;

async function savePng(page, key, name) {
  const dataUrl = await page.evaluate((k) => window.__LAB__.png(k), key);
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(`${out}/${name}.png`, buf);
  return buf.length;
}

async function shots(browser) {
  const { page, errors } = await open(browser);
  const info = { renderer: await page.evaluate(() => window.__LAB__.renderer()) };
  const first = await page.evaluate(() => window.__LAB__.show({}));
  await page.waitForTimeout(400);
  await shot(page, '01-keychain');
  info.png512Bytes = await savePng(page, first.key, 'export-512');

  // The treatment one piece at a time and with everything, to see what each step adds.
  const steps = [
    { border: false, colorMatrix: false, varnish: false, hardware: false },
    { border: true, colorMatrix: false, varnish: false, hardware: false },
    { border: true, colorMatrix: true, varnish: false, hardware: false },
    { border: true, colorMatrix: true, varnish: true, hardware: true },
  ];
  await page.evaluate((l) => window.__LAB__.gallery(l, 0.46), steps);
  await page.waitForTimeout(400);
  await shot(page, '02-steps');

  // Cost / quality of the number of copies.
  const copies = [6, 8, 12, 16].map((c) => ({ copies: c, varnish: false, hardware: false }));
  await page.evaluate((l) => window.__LAB__.gallery(l, 0.46), copies);
  await page.waitForTimeout(400);
  await shot(page, '03-copies-6-8-12-16');

  // The mask: a varnish that covers the whole square must stay inside the silhouette in the exported PNG.
  const masked = await page.evaluate(() => window.__LAB__.show({ varnishFull: true, hardware: false }));
  await page.waitForTimeout(300);
  await shot(page, '04-mask-test');
  await savePng(page, masked.key, 'export-mask-test');

  // The hanger: 12 different looks at 256.
  await page.evaluate(() => window.__LAB__.thumbs({ size: 256 }, 1));
  await page.waitForTimeout(500);
  await shot(page, '05-hanger');
  info.errors = errors;
  writeFileSync(`${out}/shots-info.json`, JSON.stringify(info, null, 2));
  console.log(info);
  await browser.close();
}

async function bench(browser) {
  const results = {};
  for (const throttle of [1, 4, 6]) {
    const { page, errors } = await open(browser, { throttle });
    const lab = (fn, arg) => page.evaluate(fn, arg);
    const res = { renderer: await lab(() => window.__LAB__.renderer()) };

    // A. Build time of one keychain: the first (cold: shaders compile) and the median of the warm ones.
    for (const size of [512, 256]) {
      const t = await lab((s) => window.__LAB__.timings({ size: s }, 7), size);
      const warm = t.slice(1);
      res[`build${size}`] = {
        coldTotalMs: r1(t[0].totalMs), warmTotalMs: r1(median(warm.map((x) => x.totalMs))), warmSubmitMs: r1(median(warm.map((x) => x.submitMs))),
        warmCatCaptureMs: r1(median(warm.map((x) => x.catMs))), px: `${t[0].width}x${t[0].height}`, mb: r1((t[0].width * t[0].height * 4) / 1048576),
      };
    }

    // B. What each step costs at 512 (warm median of 5, after a warm-up).
    const variants = {
      all: {}, noBorder: { border: false }, noMatrix: { colorMatrix: false }, noVarnish: { varnish: false }, varnishErase: { varnishMode: 'erase' }, noHardware: { hardware: false },
      copies8: { copies: 8 }, copies12: { copies: 12 }, copies16: { copies: 16 }, copies24: { copies: 24 }, innerRing: { innerRing: true },
      onlyLook: { border: false, colorMatrix: false, varnish: false, hardware: false },
    };
    res.variants = {};
    for (const [name, o] of Object.entries(variants)) {
      const t = await lab((op) => window.__LAB__.timings(op, 6), o);
      res.variants[name] = r1(median(t.slice(1).map((x) => x.totalMs)));
    }

    // C. The 12 miniatures of the hanger at 256: all in one frame, and one per frame.
    for (const perFrame of [12, 1]) {
      const th = await lab((n) => window.__LAB__.thumbs({ size: 256 }, n), perFrame);
      res[`thumbs12_perFrame${perFrame}`] = { totalMs: r1(th.totalMs), worstFrameMs: r1(Math.max(...th.frameMs)), medianFrameMs: r1(median(th.frameMs)) };
    }

    // D. Frame times: the hanger with 12 static thumbnails, one that swings, all twelve swinging, and the live (not flattened) treatment.
    const f = async (label, setup) => {
      await lab(setup);
      await page.waitForTimeout(300);
      res[label] = await lab(() => window.__LAB__.frames(3000));
    };
    await lab(() => window.__LAB__.thumbs({ size: 256 }, 12));
    await f('fps_12static', () => window.__LAB__.swing(false));
    await f('fps_12swinging', () => window.__LAB__.swing(true));
    await lab(() => window.__LAB__.clear());
    await f('fps_baseline_nothing', () => undefined);
    await lab(() => window.__LAB__.show({ size: 512 }));
    await f('fps_flat512_static', () => window.__LAB__.swing(false));
    await f('fps_flat512_swinging', () => window.__LAB__.swing(true));
    res.liveChildren = await lab(() => window.__LAB__.live({ size: 512 }));
    await page.waitForTimeout(300);
    res.fps_live512_swinging = await lab(() => window.__LAB__.frames(3000));
    res.streak420ms = await lab(() => window.__LAB__.streak({ size: 512 }, 420));
    res.errors = errors;
    results[`cpu${throttle}x`] = res;
    console.log(`cpu ${throttle}x`, JSON.stringify(res));
    await page.context().close();
  }
  writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await chromium.launch();
  await (mode === 'bench' ? bench(browser) : shots(browser));
}
