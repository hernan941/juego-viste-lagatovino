#!/usr/bin/env node
// Copies the art that the game loads from art/ (source of truth) to public/assets/ (ADR 0006, F2).
//   npm run art  →  node art/tools/build-art.mjs  +  node scripts/sync-art.mjs
// Only runtime files are copied: gatos sin cara ni cola, colas, caras, prendas con su icono, UI y arte del modo foto. The full
// cats (art/cats/<id>.svg), coats, preview.html and tools stay in art/.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'art');
const OUT = join(ROOT, 'public/assets');

/** Every .svg under dir, as paths relative to dir (recursive: art/ui/keychain, art/photo/stickers…). */
const svgsDeep = (dir, rel = '') =>
  existsSync(join(dir, rel))
    ? readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? svgsDeep(dir, join(rel, e.name)) : e.name.endsWith('.svg') ? [join(rel, e.name)] : [],
      )
    : [];

const svgs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.svg')) : []);

for (const sub of ['cats', 'clothes', 'ui', 'photo']) rmSync(join(OUT, sub), { recursive: true, force: true });

let count = 0;
const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  count++;
};

for (const f of svgs(join(ART, 'cats/noface'))) copy(join(ART, 'cats/noface', f), join(OUT, 'cats/noface', f));
for (const f of svgs(join(ART, 'cats/tail'))) copy(join(ART, 'cats/tail', f), join(OUT, 'cats/tail', f));
for (const f of svgs(join(ART, 'cats/base')).filter((n) => n.startsWith('face-'))) {
  copy(join(ART, 'cats/base', f), join(OUT, 'cats/base', f));
}
for (const slot of existsSync(join(ART, 'clothes')) ? readdirSync(join(ART, 'clothes')) : []) {
  for (const f of svgs(join(ART, 'clothes', slot))) copy(join(ART, 'clothes', slot, f), join(OUT, 'clothes', slot, f));
}
// UI and photo art live in subfolders (ui/keychain, ui/shop, ui/dyes, ui/album, ui/runway, photo/stickers…).
for (const sub of ['ui', 'photo']) {
  for (const f of svgsDeep(join(ART, sub))) copy(join(ART, sub, f), join(OUT, sub, f));
}

console.log(`art → public/assets: ${count} archivos`);
