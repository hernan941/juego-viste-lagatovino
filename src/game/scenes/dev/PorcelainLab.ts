// F12.9 (ADR 0021, development only): the porcelain keychain spike. It builds the treatment of the render of a look
// (cream border of flat copies, ColorMatrix, varnish masked to the silhouette, hardware) and flattens it into ONE texture,
// and it measures the build time and the frame times of swinging keychains. Opened with `?lab=porcelain`; it is not in the
// scene list of a production build. Nothing here is game code: the real object comes later (F19.2).
import Phaser from 'phaser';
import { RegistryKeys } from '../../constants';
import type { GameData } from '../../data/schema';
import type { AnchorsDef, CatDef, ClothingDef } from '../../domain/types';
import { Cat } from '../../objects/Cat';
import { Keychain, keychainData } from '../../objects/keychain/Keychain';
import type { KeychainRecipe, Stars } from '../../domain/types';

export const LAB_SCENE_KEY = 'PorcelainLab';

export interface LabOptions {
  /** Side of the render of the look (the 512 canvas of the cat scaled to this). */
  size: number;
  /** Copies of the silhouette per ring of the border. */
  copies: number;
  /** Cream border and ink line, in px at size 512 (they scale with `size`). */
  borderPx: number;
  inkPx: number;
  /** A second, inner ring of cream copies (fills the concave corners). */
  innerRing: boolean;
  colorMatrix: boolean;
  varnish: boolean;
  hardware: boolean;
  /** Test of the mask: a varnish that covers the WHOLE square (the PNG must still be transparent outside the silhouette). */
  varnishFull: boolean;
  /** 'mask' = Mask filter (ADR 0021). 'erase' = plan B without filters: the varnish is erased outside the silhouette with ERASE blend. */
  varnishMode: 'mask' | 'erase';
  /** Index of the cat in the catalog and of the sweater, so the 12 thumbnails differ. */
  cat: number;
  /** 'cream' is porcelain; 'none' skips the border to measure the rest on its own. */
  border: boolean;
}

export const LAB_DEFAULTS: LabOptions = {
  size: 512, copies: 14, borderPx: 14, inkPx: 3, innerRing: false, colorMatrix: true, varnish: true, hardware: true, varnishFull: false, varnishMode: 'mask', cat: 0, border: true,
};

export interface BuildResult {
  key: string;
  width: number;
  height: number;
  /** ms to prepare and submit the draws (CPU side). */
  submitMs: number;
  /** ms until the GPU finished too (a 1 px read-back forces it). */
  totalMs: number;
  /** ms spent capturing the cat (included in the totals above). */
  catMs: number;
  texturesAlive: number;
}

export interface FrameStats { frames: number; avgMs: number; p95Ms: number; maxMs: number; fps: number }

const CREAM = 0xfff7ec;
const INK = 0x4a3036;
const WARM_SAT = 0.9;
/** Pendulum of the plan (S8): +-14 deg that fade out in 1.6 s, one swing every 900 ms. */
const SWING = { amp: 14, periodMs: 900, decayMs: 1600 };

const lum = [0.2126, 0.7152, 0.0722];

/** -10 % saturation and a little warmer: one 4x5 ColorMatrix (R scaled up, B scaled down). */
function porcelainMatrix(): number[] {
  const s = WARM_SAT;
  const warm = [1.03, 1.0, 0.95];
  const row = (c: number) => {
    const r = lum.map((l) => l * (1 - s));
    r[c] += s;
    return r.map((v) => v * warm[c]);
  };
  const [r, g, b] = [row(0), row(1), row(2)];
  return [...r, 0, 0, ...g, 0, 0, ...b, 0, 0, 0, 0, 0, 1, 0];
}

export class PorcelainLab extends Phaser.Scene {
  private catalog!: GameData;
  private anchors!: AnchorsDef;
  private live!: Cat;
  private shown: Phaser.GameObjects.GameObject[] = [];
  private frameDeltas: number[] | null = null;
  private lastFrame = 0;
  private swingers: { image: Phaser.GameObjects.Image | Phaser.GameObjects.Container; t0: number }[] = [];
  private seq = 0;

  constructor() {
    super(LAB_SCENE_KEY);
  }

  init(): void {
    this.shown = [];
    this.frameDeltas = null;
    this.swingers = [];
    this.seq = 0;
  }

  create(): void {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    this.anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    this.cameras.main.setBackgroundColor(0xfff0f6);
    this.add.rectangle(960, 360, 640, 720, 0xc9a27a).setDepth(-5); // corkboard-ish, to judge the edge over a dark-ish ground
    this.live = this.makeCat(0, 0, 400).setPosition(210, 650);
    const g = this.dressedCat(0);
    this.live.setOutfit(g);
    (window as unknown as { __LAB__: unknown }).__LAB__ = this.api();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      delete (window as unknown as { __LAB__?: unknown }).__LAB__;
      this.clearShown();
      for (const c of this.cats.values()) c.destroy();
      this.cats.clear();
    });
  }

  update(time: number): void {
    if (this.frameDeltas) this.frameDeltas.push(time - this.lastFrame);
    this.lastFrame = time;
    for (const s of this.swingers) {
      const t = time - s.t0;
      s.image.setAngle(SWING.amp * Math.exp(-(t % 4000) / SWING.decayMs) * Math.sin((2 * Math.PI * (t % 4000)) / SWING.periodMs));
    }
  }

  // ----- the look ---------------------------------------------------------------------------------------------------

  private catDef(i: number): CatDef {
    return this.catalog.cats[i % this.catalog.cats.length];
  }

  private dressedCat(i: number): ClothingDef[] {
    const sweaters = this.catalog.clothes.filter((c) => c.slot === 'sweater');
    const heads = this.catalog.clothes.filter((c) => c.slot === 'head');
    const necks = this.catalog.clothes.filter((c) => c.slot === 'neck');
    return [sweaters[i % sweaters.length], heads[(i * 3) % heads.length], necks[(i * 5) % necks.length]];
  }

  private makeCat(i: number, x: number, size: number): Cat {
    return new Cat(this, x, 0, this.catDef(i), this.anchors, size);
  }

  /**
   * The cats of the 12 looks, dressed and off-screen. The garments pop in (250 ms), so this has to wait for `settling`: an API
   * of Cat that dresses at once for a render is a finding of this spike (F11.15). The wait is NOT in the build timings.
   */
  private cats = new Map<number, Cat>();

  async prepare(count: number, size: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      this.cats.get(i)?.destroy();
      const cat = this.makeCat(i, -4000, size);
      cat.setOutfit(this.dressedCat(i));
      this.cats.set(i, cat);
    }
    await new Promise<void>((resolve) => {
      const check = () => ([...this.cats.values()].some((c) => c.settling) ? this.time.delayedCall(50, check) : resolve());
      check();
    });
  }

  /** Renders the look of cat `i` into a `size` x `size` texture: what `takePhoto` does with `freezeForPhoto`. */
  private renderLook(key: string, i: number, size: number): void {
    const cat = this.cats.get(i);
    if (!cat) throw new Error(`prepare() the cats first (cat ${i})`);
    const look = this.textures.addDynamicTexture(key, size, size);
    if (!look) throw new Error('no dynamic texture');
    const release = cat.freezeForPhoto('amor');
    const s = size / this.anchors.canvas.width;
    look.capture(cat, { x: size / 2, y: 490 * s, scaleX: s, scaleY: s });
    look.render();
    release();
  }

  // ----- the treatment ----------------------------------------------------------------------------------------------

  /** Placeholder varnish: three soft white blobs (head, shoulder, belly) as a texture; the real one is an SVG (F12.8). */
  private ensureVarnish(size: number, full = false): string {
    const key = `lab-varnish-${size}${full ? '-full' : ''}`;
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({}, false);
    if (full) {
      g.fillStyle(0xff00ff, 0.8).fillRect(0, 0, size, size);
      g.generateTexture(key, size, size);
      g.destroy();
      return key;
    }
    const blob = (x: number, y: number, w: number, h: number, rot: number) => {
      for (let k = 0; k < 8; k++) {
        const f = 1 - k / 8;
        g.fillStyle(0xffffff, 0.07).fillEllipse(x * size, y * size, w * size * f, h * size * f);
      }
      void rot;
    };
    blob(0.37, 0.2, 0.2, 0.09, 0);
    blob(0.3, 0.52, 0.07, 0.16, 0);
    blob(0.64, 0.68, 0.14, 0.07, 0);
    g.generateTexture(key, size, size);
    g.destroy();
    return key;
  }

  /** The diagonal band of the "baked" moment: a soft white stripe across a square the size of the look. */
  private ensureStreak(size: number): string {
    const key = `lab-streak-${size}`;
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({}, false);
    for (let k = 0; k < 10; k++) {
      const w = size * 0.22 * (1 - k / 10);
      g.fillStyle(0xffffff, 0.09).fillRect(size / 2 - w / 2, 0, w, size);
    }
    g.generateTexture(key, size, size);
    g.destroy();
    return key;
  }

  /** Placeholder hardware: a small eyelet and a silver ring, drawn once (the real pieces are SVGs of F12.8). */
  private ensureHardware(): string {
    const key = 'lab-hardware';
    if (this.textures.exists(key)) return key;
    const g = this.make.graphics({}, false);
    g.lineStyle(10, INK, 1).strokeCircle(48, 70, 36);
    g.lineStyle(6, 0xd9dde6, 1).strokeCircle(48, 70, 36);
    g.fillStyle(0xd9dde6, 1).fillCircle(48, 112, 10);
    g.lineStyle(3, INK, 1).strokeCircle(48, 112, 10);
    g.generateTexture(key, 96, 130);
    g.destroy();
    return key;
  }

  /** An Image that is not on the display list: it only exists to be drawn into a texture. */
  private offImage(key: string, x: number, y: number): Phaser.GameObjects.Image {
    return new Phaser.GameObjects.Image(this, x, y, key);
  }

  private silhouette(key: string, lookKey: string, size: number, color: number): void {
    const dt = this.textures.addDynamicTexture(key, size, size);
    if (!dt) throw new Error('no dynamic texture');
    const img = this.offImage(lookKey, size / 2, size / 2).setTint(color).setTintMode(Phaser.TintModes.FILL);
    dt.draw(img);
    dt.render();
    img.destroy();
  }

  /** Builds a flattened keychain texture and returns the timings. Everything but the result is destroyed. */
  build(partial: Partial<LabOptions> = {}): BuildResult {
    const o = { ...LAB_DEFAULTS, ...partial };
    const id = ++this.seq;
    const key = `keychain~lab~${id}`;
    const tmp: string[] = [];
    const t0 = performance.now();
    const s = o.size / 512;
    const border = o.borderPx * s;
    const ink = o.inkPx * s;
    const pad = Math.ceil(border + ink) + 2;
    const top = Math.round(0.2 * o.size);
    const W = o.size + 2 * pad;
    const H = o.size + 2 * pad + top;
    const cx = pad + o.size / 2;
    const cy = pad + top + o.size / 2;

    const lookKey = `${key}~look`;
    tmp.push(lookKey);
    this.renderLook(lookKey, o.cat, o.size);
    const catMs = performance.now() - t0;

    const comp = this.textures.addDynamicTexture(key, W, H);
    if (!comp) throw new Error('no dynamic texture');
    if (o.border) {
      const inkKey = `${key}~ink`;
      const creamKey = `${key}~cream`;
      tmp.push(inkKey, creamKey);
      this.silhouette(inkKey, lookKey, o.size, INK);
      this.silhouette(creamKey, lookKey, o.size, CREAM);
      const ring = (silKey: string, radius: number) => {
        for (let i = 0; i < o.copies; i++) {
          const a = (i / o.copies) * Math.PI * 2;
          comp.stamp(silKey, undefined, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        }
      };
      ring(inkKey, border + ink);
      ring(creamKey, border);
      if (o.innerRing) ring(creamKey, border * 0.5);
    }

    const lookImg = this.offImage(lookKey, cx, cy);
    if (o.colorMatrix) {
      lookImg.enableFilters();
      lookImg.filters?.internal.addColorMatrix().colorMatrix.set(porcelainMatrix());
    }
    comp.draw(lookImg);
    const extras: Phaser.GameObjects.Image[] = [lookImg];

    if (o.varnish) {
      const vKey = this.ensureVarnish(o.size, o.varnishFull);
      if (o.varnishMode === 'erase') {
        // No filter: white square minus the look = the outside of the silhouette; erased from a copy of the varnish.
        const invKey = `${key}~inv`;
        const vtKey = `${key}~vt`;
        tmp.push(invKey, vtKey);
        const inv = this.textures.addDynamicTexture(invKey, o.size, o.size);
        const vt = this.textures.addDynamicTexture(vtKey, o.size, o.size);
        if (!inv || !vt) throw new Error('no dynamic texture');
        const plain = this.offImage(lookKey, o.size / 2, o.size / 2);
        inv.fill(0xffffff);
        inv.erase(plain);
        inv.render();
        const vSrc = this.offImage(vKey, o.size / 2, o.size / 2);
        const invImg = this.offImage(invKey, o.size / 2, o.size / 2);
        vt.draw(vSrc);
        vt.erase(invImg);
        vt.render();
        const vtImg = this.offImage(vtKey, cx, cy);
        comp.draw(vtImg);
        extras.push(plain, vSrc, invImg, vtImg);
      } else {
        const v = this.offImage(vKey, cx, cy);
        v.enableFilters();
        v.filters?.internal.addMask(lookKey);
        comp.draw(v);
        extras.push(v);
      }
    }
    if (o.hardware) {
      const hw = this.offImage(this.ensureHardware(), cx, pad + top * 0.5 + 8 * s).setScale(s * 0.9);
      comp.draw(hw);
      extras.push(hw);
    }
    comp.render();
    const submitMs = performance.now() - t0;

    // Flatten: only `comp` stays. The read-back of one pixel makes the GPU finish before the clock stops.
    const gl = (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const totalMs = performance.now() - t0;

    for (const e of extras) e.destroy();
    for (const k of tmp) this.textures.remove(k);
    return { key, width: W, height: H, submitMs, totalMs, catMs, texturesAlive: Object.keys(this.textures.list).length };
  }

  // ----- display and measuring --------------------------------------------------------------------------------------

  private clearShown(): void {
    this.swingers = [];
    for (const o of this.shown) o.destroy();
    this.shown = [];
  }

  /** The pivot is the ring on top: the image rotates around the middle of its top part. */
  private place(key: string, x: number, y: number, scale: number, swing: boolean, pivotTop = 0.18): Phaser.GameObjects.Image {
    const img = this.add.image(x, y, key).setScale(scale).setOrigin(0.5, pivotTop);
    this.shown.push(img);
    if (swing) this.swingers.push({ image: img, t0: this.time.now });
    return img;
  }

  private stats(deltas: number[], fps: number): FrameStats {
    const d = deltas.slice(2); // the first frames are the start of the measure
    const sorted = [...d].sort((a, b) => a - b);
    const avg = d.reduce((a, b) => a + b, 0) / Math.max(1, d.length);
    return { frames: d.length, avgMs: avg, p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0, maxMs: sorted[sorted.length - 1] ?? 0, fps };
  }

  private measure(ms: number): Promise<FrameStats> {
    return new Promise((resolve) => {
      this.frameDeltas = [];
      this.time.delayedCall(ms, () => {
        const d = this.frameDeltas ?? [];
        this.frameDeltas = null;
        resolve(this.stats(d, this.game.loop.actualFps));
      });
    });
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => resolve()));
  }

  private api() {
    return {
      defaults: LAB_DEFAULTS,
      /** F19.2: the REAL Keychain object, one per entry, in a row; the first swings. Resolves when all are built. */
      real: async (list: { cat: number; stars: Stars; pose: string; px?: 256 | 512; dye?: string }[], y = 60): Promise<{ key: string; w: number; h: number }[]> => {
        this.clearShown();
        const data = keychainData(this.catalog, this.anchors);
        const step = 1280 / list.length;
        const made = list.map((o, i) => {
          const worn = this.dressedCat(o.cat);
          const sweater = worn[0];
          const recipe: KeychainRecipe = {
            catId: this.catDef(o.cat).id, catName: this.catDef(o.cat).name,
            outfit: Object.fromEntries(worn.map((c) => [c.slot, c.id])), itemDye: o.dye && sweater.dyeable ? { [sweater.id]: o.dye } : {},
            pose: o.pose, stars: o.stars, photo: { background: '', frame: '', stickers: [] }, createdAt: new Date().toISOString(),
          };
          const k = new Keychain(this, step * (i + 0.5), y, recipe, data, { px: o.px ?? 512 });
          this.shown.push(k);
          return k;
        });
        await Promise.all(made.map((k) => k.whenReady()));
        made[0]?.swing();
        return made.map((k) => ({ key: k.textureKey, w: k.layout.width, h: k.layout.height }));
      },
      prepare: (count: number) => this.prepare(count, 512),
      renderer: () => {
        const gl = (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
      },
      /** Builds one keychain and shows it big in the middle. */
      show: (opts: Partial<LabOptions> = {}): BuildResult => {
        this.clearShown();
        const r = this.build(opts);
        this.place(r.key, 640, 40, 1, false, 0);
        return r;
      },
      /** Builds N keychains (cold first run, then warm) and returns every timing. */
      timings: (opts: Partial<LabOptions>, runs: number): BuildResult[] => {
        const out: BuildResult[] = [];
        for (let i = 0; i < runs; i++) {
          const r = this.build({ ...opts, cat: i });
          this.textures.remove(r.key);
          out.push(r);
        }
        return out;
      },
      /** 12 thumbnails (different cats) in the grid of the hanger, `perFrame` of them per frame. Per-frame cost included. */
      thumbs: async (opts: Partial<LabOptions>, perFrame: number, swing = 0): Promise<{ frameMs: number[]; totalMs: number; keys: string[] }> => {
        this.clearShown();
        const frameMs: number[] = [];
        const keys: string[] = [];
        const start = performance.now();
        for (let i = 0; i < 12; i += perFrame) {
          const t = performance.now();
          for (let j = i; j < Math.min(12, i + perFrame); j++) {
            const r = this.build({ ...opts, cat: j });
            keys.push(r.key);
            const col = j % 3;
            const row = Math.floor(j / 3);
            this.place(r.key, 790 + col * 150, 30 + row * 175, 0.5, j < swing, 0.2);
          }
          frameMs.push(performance.now() - t);
          await this.nextFrame();
        }
        return { frameMs, totalMs: performance.now() - start, keys };
      },
      /** Frame times for `ms` of whatever is shown. */
      frames: (ms: number) => this.measure(ms),
      /** One keychain big + the swinging, with the hanger as it is. */
      swing: (on: boolean) => {
        for (const o of this.shown) (o as Phaser.GameObjects.Image).setAngle(0);
        this.swingers = on ? this.shown.map((image) => ({ image: image as Phaser.GameObjects.Image, t0: this.time.now })) : [];
      },
      clear: () => this.clearShown(),
      probe: (key: string) => {
        const img = this.offImage(this.ensureVarnish(512, true), 0, 0);
        img.enableFilters();
        const m = img.filters?.internal.addMask(key);
        const f = this.textures.getFrame(key);
        const out = { hasGl: !!m?.glTexture, frame: !!f, frameGl: !!f?.glTexture, isDyn: this.textures.get(key)?.constructor?.name };
        img.destroy();
        return out;
      },
      /** Several variants side by side (scaled to fit), to compare them in a screenshot. */
      gallery: (list: Partial<LabOptions>[], scale: number): BuildResult[] => {
        this.clearShown();
        const w = 1280 / list.length;
        return list.map((o, i) => {
          const r = this.build(o);
          this.place(r.key, w * (i + 0.5), 20, scale, false, 0);
          return r;
        });
      },
      /** The same treatment NOT flattened: all the copies, the filtered look and the masked varnish alive and re-rendered every frame. */
      live: (opts: Partial<LabOptions> = {}): number => {
        this.clearShown();
        const o = { ...LAB_DEFAULTS, ...opts };
        const lookKey = 'lab-live-look';
        if (this.textures.exists(lookKey)) this.textures.remove(lookKey);
        this.renderLook(lookKey, o.cat, o.size);
        const s = o.size / 512;
        const c = this.add.container(640, 200);
        const mk = (color: number, r: number) => {
          for (let i = 0; i < o.copies; i++) {
            const a = (i / o.copies) * Math.PI * 2;
            c.add(this.add.image(Math.cos(a) * r, Math.sin(a) * r, lookKey).setTint(color).setTintMode(Phaser.TintModes.FILL));
          }
        };
        mk(INK, (o.borderPx + o.inkPx) * s);
        mk(CREAM, o.borderPx * s);
        const look = this.add.image(0, 0, lookKey);
        look.enableFilters();
        look.filters?.internal.addColorMatrix().colorMatrix.set(porcelainMatrix());
        const v = this.add.image(0, 0, this.ensureVarnish(o.size));
        v.enableFilters();
        v.filters?.internal.addMask(lookKey);
        c.add([look, v]);
        this.shown.push(c);
        this.swingers.push({ image: c, t0: this.time.now });
        return c.list.length;
      },
      /** The bake streak: a band masked to the silhouette, passing across, live (the mask filter runs every frame). */
      streak: async (opts: Partial<LabOptions> = {}, ms = 420): Promise<FrameStats> => {
        this.clearShown();
        const o = { ...LAB_DEFAULTS, ...opts };
        const r = this.build(o);
        const holder = this.place(r.key, 640, 40, 1, false, 0);
        const lookKey = 'lab-streak-look';
        if (this.textures.exists(lookKey)) this.textures.remove(lookKey);
        this.renderLook(lookKey, o.cat, o.size);
        const st = this.add.image(640, 40 + (r.height - o.size) / 2 + o.size / 2 - 0, this.ensureStreak(o.size)).setBlendMode(Phaser.BlendModes.NORMAL);
        st.setY(40 + (r.height - o.size) / 2 + o.size / 2 - 0 - (r.height - o.size) / 2 + (r.height - o.size) / 2);
        st.enableFilters();
        const mask = st.filters?.internal.addMask(lookKey);
        if (mask) mask.autoUpdate = false;
        this.shown.push(st);
        void holder;
        st.setAngle(20).setX(640 - 300);
        const tween = this.tweens.add({ targets: st, x: 640 + 300, duration: ms, ease: 'Sine.easeInOut' });
        const stats = await this.measure(ms);
        tween.remove();
        return stats;
      },
      /** PNG of a built keychain (data URL), to check that the border and the varnish survive the export. */
      png: (key: string): Promise<string> =>
        new Promise((resolve) => {
          const t = this.textures.get(key) as Phaser.Textures.DynamicTexture;
          t.snapshot((image) => resolve((image as HTMLImageElement).src), 'image/png');
        }),
    };
  }
}
