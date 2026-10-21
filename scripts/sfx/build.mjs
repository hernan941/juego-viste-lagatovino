// Builds public/assets/audio/*.{ogg,mp3} (docs/art-direction.md §9, ADR 0009).
//   node scripts/sfx/build.mjs --src <dir with the CC0 downloads> --work <scratch dir> [--ffmpeg <path>]
// CC0 sources are cut, filtered, normalized and given short fades; the rest comes from synth.mjs.
// ffmpeg must have libvorbis and libmp3lame (e.g. the `ffmpeg-static` npm package, not a project dependency).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { synthAll } from './synth.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const SRC = resolve(arg('src', ''));
const WORK = resolve(arg('work', ''));
const FFMPEG = arg('ffmpeg', 'ffmpeg');
const OUT = resolve(import.meta.dirname, '../../public/assets/audio');
const TARGET_PEAK_DB = -9; // low, with headroom so lossy encoding never clips

// key: [input (relative to SRC or synth:<name>), ffmpeg filter chain (cut + tone), peak dB offset from target]
const SOUNDS = {
  'sfx-grab': ['synth:grab', '', 0],
  'sfx-drag': ['synth:drag', '', -8],
  'sfx-drop': ['interface-sounds/x/Audio/drop_002.ogg', 'atrim=0:0.3,lowpass=f=3200', 0],
  'sfx-purr': ['oga-cat-purr-meow/cat_purrsleepy_loop.wav', 'atrim=0.4:1.9,lowpass=f=2500', -3],
  'sfx-return': ['synth:return', '', 0],
  'sfx-remove': ['synth:remove', '', -2],
  'sfx-hover': ['interface-sounds/x/Audio/toggle_004.ogg', 'lowpass=f=3500', -8],
  'sfx-click': ['interface-sounds/x/Audio/drop_001.ogg', 'atrim=0:0.3,lowpass=f=3500', -2],
  'sfx-doorbell': ['synth:doorbell', '', -2],
  'sfx-shutter': ['synth:shutter', '', 0],
  'sfx-key': ['synth:key', '', -3],
  'sfx-gift': ['synth:gift', '', 0],
  'sfx-meow-1': ['oga-kitten-mew/kitten_mew-1.wav', 'lowpass=f=7000', 0],
  'sfx-meow-2': ['oga-cat-purr-meow/cat_softmew.wav', 'silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:1.6,lowpass=f=7000', 0],
  'sfx-meow-3': ['oga-meow/Meow.ogg', 'lowpass=f=7000', 0],
};

const ff = (...args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

/** Peak level in dBFS (ffmpeg's volumedetect reports on stderr). */
function peakDb(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /max_volume: (-?[\d.]+) dB/.exec(r.stderr);
  if (!m) throw new Error(`no peak for ${file}`);
  return Number(m[1]);
}

mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });
synthAll(join(WORK, 'synth'));

for (const [key, [input, filter, offset]] of Object.entries(SOUNDS)) {
  const inFile = input.startsWith('synth:') ? join(WORK, 'synth', `${input.slice(6)}.wav`) : join(SRC, input);
  const mid = join(WORK, `${key}.wav`);
  ff('-i', inFile, '-ac', '1', '-ar', '44100', ...(filter ? ['-af', filter] : []), mid);
  const gain = TARGET_PEAK_DB + offset - peakDb(mid);
  // Short fades at both ends (no clicks), then the gain; the same graph feeds both encoders.
  const dur = Number(/Duration: (\d+):(\d+):([\d.]+)/.exec(spawnSync(FFMPEG, ['-i', mid], { encoding: 'utf8' }).stderr).slice(1).reduce((a, v) => a * 60 + Number(v), 0));
  const chain = `afade=t=in:d=0.004,afade=t=out:st=${Math.max(0, dur - 0.04).toFixed(3)}:d=0.04,volume=${gain.toFixed(2)}dB`;
  ff('-i', mid, '-af', chain, '-c:a', 'libvorbis', '-q:a', '4', join(OUT, `${key}.ogg`));
  ff('-i', mid, '-af', chain, '-c:a', 'libmp3lame', '-q:a', '5', join(OUT, `${key}.mp3`));
  console.log(`${key}: ${dur.toFixed(2)}s, gain ${gain.toFixed(1)} dB`);
}
