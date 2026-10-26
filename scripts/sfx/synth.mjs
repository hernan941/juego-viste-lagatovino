// Tiny additive/noise synthesizer for the ASMR sound effects that had no good CC0 source
// (docs/art-direction.md §9). Deterministic: a seeded rng makes every run produce the same WAV.
// Output: 44.1 kHz mono 16-bit WAV files in the directory given as the first argument.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const SR = 44100;

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buf = (seconds) => new Float64Array(Math.round(seconds * SR));
const TAU = Math.PI * 2;

/** RBJ biquad. kind: 'lp' | 'hp' | 'bp'. `freq` may be a function of time in seconds. */
function biquad(input, kind, freq, q = 0.707) {
  const out = new Float64Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const f = typeof freq === 'function' ? freq(i / SR) : freq;
    const w = (TAU * Math.min(f, SR * 0.45)) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const cw = Math.cos(w);
    let b0, b1, b2;
    if (kind === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
    else if (kind === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; }
    const a0 = 1 + alpha, a1 = -2 * cw, a2 = 1 - alpha;
    const y = (b0 * input[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = input[i]; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

const noise = (seconds, rng) => buf(seconds).map(() => rng() * 2 - 1);
/** Envelope: linear attack, exponential decay. */
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
const shape = (b, fn) => b.map((v, i) => v * fn(i / SR));
function add(dst, src, at = 0, gain = 1) {
  const off = Math.round(at * SR);
  for (let i = 0; i < src.length && i + off < dst.length; i++) dst[i + off] += src[i] * gain;
}
const sine = (seconds, freqFn, ampFn) => {
  const o = buf(seconds);
  let phase = 0;
  for (let i = 0; i < o.length; i++) {
    const t = i / SR;
    phase += (TAU * freqFn(t)) / SR;
    o[i] = Math.sin(phase) * ampFn(t);
  }
  return o;
};
/** Smooth hann-like window over the whole duration. */
const hann = (dur) => (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t / dur))) ** 2;

const sounds = {
  // Wool rub: slow-attack band-limited noise with a slow flutter.
  grab(rng) {
    const d = 0.28;
    const n = biquad(biquad(noise(d, rng), 'bp', (t) => 700 + 900 * (t / d), 0.6), 'lp', 2600);
    return shape(n, (t) => hann(d)(t) * (0.75 + 0.25 * Math.sin(TAU * 22 * t)));
  },
  // Barely-there whisper while dragging.
  drag(rng) {
    const d = 0.4;
    const n = biquad(biquad(noise(d, rng), 'bp', 1900, 0.5), 'lp', 3000);
    return shape(n, (t) => hann(d)(t) * 0.5);
  },
  // Padded boing when an item returns to its grid cell.
  return() {
    const d = 0.5;
    const s = sine(d, (t) => 330 + 260 * Math.exp(-t / 0.07) * Math.cos(TAU * 9 * t) + 40 * Math.exp(-t / 0.2), (t) => env(t, 0.006, 0.12));
    return biquad(s, 'lp', 1800);
  },
  // Cloth sliding off: noise sweeping down.
  remove(rng) {
    const d = 0.4;
    const n = biquad(biquad(noise(d, rng), 'bp', (t) => 3200 - 2300 * (t / d), 0.7), 'lp', 3500);
    return shape(n, (t) => hann(d)(t) ** 0.6);
  },
  // Door bell: two soft bell strikes (ding-dong) with inharmonic partials.
  doorbell() {
    const out = buf(1.5);
    const strike = (f0) => {
      const o = buf(1.2);
      [[1, 1, 0.5], [2.01, 0.45, 0.32], [2.76, 0.25, 0.2], [4.07, 0.12, 0.12]].forEach(([r, g, dec]) => {
        add(o, sine(1.2, () => f0 * r, (t) => env(t, 0.003, dec)), 0, g);
      });
      return o;
    };
    add(out, strike(1568), 0, 0.8);
    add(out, strike(1175), 0.22, 0.9);
    return biquad(out, 'lp', 5000);
  },
  // Soft camera shutter: two muffled clicks.
  shutter(rng) {
    const out = buf(0.22);
    const click = (at, g) => {
      add(out, biquad(shape(noise(0.03, rng), (t) => env(t, 0.001, 0.007)), 'bp', 2400, 0.8), at, g);
      add(out, sine(0.05, () => 160, (t) => env(t, 0.001, 0.014)), at, g * 0.8);
    };
    click(0.005, 1);
    click(0.085, 0.7);
    return biquad(out, 'lp', 3600);
  },
  // Soft keyboard key: tiny noise tick over a low "thock".
  key(rng) {
    const out = buf(0.1);
    add(out, biquad(shape(noise(0.02, rng), (t) => env(t, 0.0005, 0.004)), 'bp', 2600, 0.9), 0, 0.7);
    add(out, sine(0.08, (t) => 230 - 60 * (t / 0.08), (t) => env(t, 0.001, 0.022)), 0, 1);
    return biquad(out, 'lp', 3200);
  },
  // Gift: paper crinkle, then a ribbon sparkle of two soft notes.
  gift(rng) {
    const out = buf(1.0);
    for (let i = 0; i < 14; i++) {
      const at = i * 0.022 + rng() * 0.012;
      add(out, biquad(shape(noise(0.02, rng), (t) => env(t, 0.001, 0.005)), 'hp', 1800), at, 0.25 + rng() * 0.3);
    }
    [[0.4, 1319], [0.52, 1760]].forEach(([at, f]) => {
      add(out, sine(0.45, () => f, (t) => env(t, 0.004, 0.14)), at, 0.45);
      add(out, sine(0.45, () => f * 2, (t) => env(t, 0.004, 0.06)), at, 0.1);
    });
    return biquad(out, 'lp', 5200);
  },
  // ---- Second stage (F12.11). Appended so the seeds of the sounds above do not change. ----
  // Rating star: a soft rubber-stamp "tump".
  stamp(rng) {
    const out = buf(0.3);
    add(out, sine(0.3, (t) => 150 - 70 * Math.min(1, t / 0.12), (t) => env(t, 0.002, 0.06)), 0, 1);
    add(out, biquad(shape(noise(0.05, rng), (t) => env(t, 0.001, 0.01)), 'lp', 1400), 0, 0.5);
    return biquad(out, 'lp', 1100);
  },
  // Button against button: two hollow little knocks.
  clink() {
    const out = buf(0.3);
    [[0, 1900, 1], [0.075, 2500, 0.7]].forEach(([at, f, g]) => {
      add(out, sine(0.2, () => f, (t) => env(t, 0.001, 0.018)), at, g);
      add(out, sine(0.2, () => f * 1.52, (t) => env(t, 0.001, 0.01)), at, g * 0.35);
    });
    return biquad(out, 'lp', 5200);
  },
  // Scissors: two quick metallic closes.
  snip(rng) {
    const out = buf(0.3);
    [[0.01, 1], [0.1, 0.8]].forEach(([at, g]) => {
      add(out, biquad(shape(noise(0.06, rng), (t) => env(t, 0.001, 0.012)), 'bp', 5200, 1.2), at, g);
      add(out, sine(0.1, () => 3300, (t) => env(t, 0.001, 0.012)), at, g * 0.25);
    });
    return biquad(out, 'lp', 7000);
  },
  // Very soft cash register: a muffled drawer thunk, then a tiny bell.
  register(rng) {
    const out = buf(1.0);
    add(out, sine(0.2, (t) => 190 - 80 * Math.min(1, t / 0.08), (t) => env(t, 0.002, 0.04)), 0, 0.7);
    add(out, biquad(shape(noise(0.04, rng), (t) => env(t, 0.001, 0.008)), 'bp', 1800, 0.8), 0.01, 0.35);
    [[1, 1, 0.3], [2.4, 0.3, 0.14], [3.9, 0.12, 0.08]].forEach(([r, g, dec]) => {
      add(out, sine(0.9, () => 2093 * r, (t) => env(t, 0.003, dec)), 0.14, g * 0.5);
    });
    return biquad(out, 'lp', 5200);
  },
  // Cork pop: a short falling "pop".
  uncork(rng) {
    const out = buf(0.2);
    add(out, sine(0.2, (t) => 620 * Math.exp(-t / 0.035) + 180, (t) => env(t, 0.001, 0.035)), 0, 1);
    add(out, biquad(shape(noise(0.03, rng), (t) => env(t, 0.001, 0.006)), 'bp', 1500, 0.7), 0, 0.3);
    return biquad(out, 'lp', 3000);
  },
  // Liquid "blup": two bubble chirps rising in pitch.
  blup() {
    const out = buf(0.45);
    [[0, 260, 0.1, 1], [0.13, 380, 0.07, 0.6]].forEach(([at, f0, d, g]) => {
      add(out, sine(0.3, (t) => f0 * (1 + 1.6 * Math.min(1, t / d)), (t) => env(t, 0.004, d * 1.1)), at, g);
    });
    return biquad(out, 'lp', 2200);
  },
  // Page turn: a soft noise swish with a little crinkle at the start.
  paper(rng) {
    const d = 0.45;
    const out = buf(d);
    add(out, shape(biquad(biquad(noise(d, rng), 'bp', (t) => 900 + 2600 * Math.sin(Math.PI * t / d), 0.5), 'lp', 4200), (t) => hann(d)(t) ** 0.8), 0, 0.8);
    for (let i = 0; i < 7; i++) {
      add(out, biquad(shape(noise(0.015, rng), (t) => env(t, 0.001, 0.004)), 'hp', 2200), 0.02 + i * 0.018 + rng() * 0.01, 0.15 + rng() * 0.2);
    }
    return out;
  },
  // Washi tape being pulled and stuck: a rasp that slows down, then a soft press.
  tape(rng) {
    const d = 0.4;
    const out = buf(d);
    let phase = 0;
    const rasp = noise(0.32, rng).map((v, i) => {
      const t = i / SR;
      phase += (TAU * (95 - 55 * (t / 0.32))) / SR;
      return v * Math.max(0, Math.sin(phase)) ** 2 * (1 - t / 0.32);
    });
    add(out, biquad(biquad(rasp, 'bp', 3000, 0.6), 'lp', 4800), 0, 1);
    add(out, sine(0.08, () => 210, (t) => env(t, 0.002, 0.02)), 0.33, 0.45);
    return out;
  },
  // Sticker peel: a short, higher rasp ending in a little pop.
  peel(rng) {
    const d = 0.28;
    const out = buf(d);
    let phase = 0;
    const rasp = noise(0.2, rng).map((v, i) => {
      const t = i / SR;
      phase += (TAU * (130 + 160 * (t / 0.2))) / SR;
      return v * Math.max(0, Math.sin(phase)) ** 2 * Math.sin(Math.PI * (t / 0.2)) ** 0.7;
    });
    add(out, biquad(biquad(rasp, 'bp', 3800, 0.6), 'lp', 5200), 0, 0.9);
    add(out, sine(0.06, (t) => 520 - 200 * (t / 0.06), (t) => env(t, 0.001, 0.012)), 0.21, 0.5);
    return out;
  },
  // Kiln "fuuu": breathy noise swelling then fading, with a faint low rumble.
  oven(rng) {
    const d = 1.0;
    const air = biquad(biquad(noise(d, rng), 'bp', (t) => 450 + 1300 * Math.sin(Math.PI * Math.min(1, t / d)), 0.5), 'lp', 2400);
    const out = shape(air, (t) => Math.sin(Math.PI * (t / d)) ** 1.5);
    add(out, sine(d, () => 85, (t) => hann(d)(t)), 0, 0.12);
    return out;
  },
  // Varnish "ching": a bright glassy bell with inharmonic partials.
  varnish() {
    const out = buf(1.0);
    [[1, 1, 0.55], [2.76, 0.45, 0.3], [5.4, 0.2, 0.16], [8.9, 0.08, 0.08]].forEach(([r, g, dec]) => {
      add(out, sine(1.0, () => 2637 * r, (t) => env(t, 0.002, dec)), 0, g);
    });
    return biquad(out, 'lp', 8500);
  },
  // Eyelet screwing in: a tiny metallic "tic" with a short ring.
  latch(rng) {
    const out = buf(0.14);
    add(out, biquad(shape(noise(0.01, rng), (t) => env(t, 0.0005, 0.002)), 'hp', 3000), 0, 0.6);
    add(out, sine(0.14, () => 4300, (t) => env(t, 0.001, 0.02)), 0, 1);
    add(out, sine(0.14, () => 6700, (t) => env(t, 0.001, 0.012)), 0, 0.3);
    return biquad(out, 'lp', 8000);
  },
  // Little chain unrolling: a cascade of tiny pings that thin out.
  chain(rng) {
    const out = buf(0.9);
    for (let i = 0; i < 11; i++) {
      const at = i * 0.045 + rng() * 0.03;
      const f = 2800 + rng() * 2400;
      add(out, sine(0.12, () => f, (t) => env(t, 0.0008, 0.016)), at, (0.5 + rng() * 0.5) * (1 - i / 14));
    }
    return biquad(out, 'lp', 7500);
  },
  // Porcelain "tink": a clear, short, slightly inharmonic ping.
  porcelain() {
    const out = buf(0.6);
    [[1, 1, 0.16], [2.32, 0.4, 0.09], [4.1, 0.14, 0.05]].forEach(([r, g, dec]) => {
      add(out, sine(0.6, () => 1900 * r, (t) => env(t, 0.001, dec)), 0, g);
    });
    return biquad(out, 'lp', 7000);
  },
};

export function writeWav(path, samples) {
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + samples.length * 2, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(samples.length * 2, 40);
  // Peak-normalize to -1 dBFS here; the final level is set by build.mjs.
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.89 / peak : 1;
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * g)) * 32767), 44 + i * 2));
  writeFileSync(path, data);
}

export const SYNTH_NAMES = Object.keys(sounds);

export function synthAll(outDir) {
  mkdirSync(outDir, { recursive: true });
  SYNTH_NAMES.forEach((name, i) => writeWav(join(outDir, `${name}.wav`), sounds[name](makeRng(1000 + i))));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) throw new Error('usage: node scripts/sfx/synth.mjs <out-dir>');
  synthAll(dir);
}
