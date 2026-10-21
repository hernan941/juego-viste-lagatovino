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
