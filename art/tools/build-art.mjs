#!/usr/bin/env node
// Viste Lagato · compositor de arte SVG (ADR 0006).
//
//   node art/tools/build-art.mjs            → regenera todo
//
// 1. Gatos: art/cats/base/silhouette.svg + art/cats/coats/<id>.svg + art/cats/base/face-normal.svg
//    → art/cats/<id>.svg (autocontenido, listo para this.load.svg).
//    También escribe art/cats/noface/<id>.svg (mismo gato SIN cara) para que el juego
//    superponga las capas de expresión (face-*.svg) y pueda parpadear.
// 2. Iconos: art/clothes/<slot>/<id>.svg → art/clothes/<slot>/<id>.icon.svg
//    (la prenda recortada a su caja y centrada sobre una celda crema).
//
// Sin dependencias: solo Node ≥ 18.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ART = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ART, p), 'utf8');
const PARTS = ['tail', 'body', 'paws', 'head'];

/** Contenido interior de un <svg> (sin la etiqueta raíz ni comentarios de cabecera). */
function innerSvg(src) {
  const start = src.indexOf('>', src.indexOf('<svg')) + 1;
  const end = src.lastIndexOf('</svg>');
  return src.slice(start, end).replace(/<!--[\s\S]*?-->/g, '').trim();
}

function parseCoat(src, id) {
  const coat = {};
  for (const part of PARTS) {
    const re = new RegExp(`<g id="${part}" data-fill="(#[0-9A-Fa-f]{6})"([^>]*)>([\\s\\S]*?)</g><!--/${part}-->`);
    const m = src.match(re);
    if (!m) throw new Error(`coats/${id}.svg: falta <g id="${part}" data-fill="#hex">…</g><!--/${part}-->`);
    const attrs = m[2].trim();
    const body = m[3].trim();
    coat[part] = { fill: m[1].toUpperCase(), content: body ? (attrs ? `<g ${attrs}>${body}</g>` : body) : '' };
  }
  return coat;
}

function composeCat(id, { withFace }) {
  const coat = parseCoat(read(`cats/coats/${id}.svg`), id);
  let svg = read('cats/base/silhouette.svg');
  svg = svg.replace(/<!--[\s\S]*?-->/, `<!-- Viste Lagato · gato "${id}". GENERADO por art/tools/build-art.mjs: no editar a mano (editar base/ o coats/${id}.svg). -->`);
  for (const part of PARTS) {
    svg = svg.replace(new RegExp(`data-fill="${part}" fill="[^"]*"`, 'g'), `fill="${coat[part].fill}"`);
    svg = svg.replaceAll(`<!--coat:${part}-->`, coat[part].content);
  }
  if (withFace) {
    const face = innerSvg(read('cats/base/face-normal.svg'));
    svg = svg.replace(/<\/svg>\s*$/, `  <g id="face">${face}</g>\n</svg>\n`);
  }
  return svg.replace(/<!--(?!\s*Viste)[\s\S]*?-->\s*/g, '');
}

function buildCats() {
  mkdirSync(join(ART, 'cats/noface'), { recursive: true });
  const ids = readdirSync(join(ART, 'cats/coats')).filter((f) => f.endsWith('.svg')).map((f) => basename(f, '.svg'));
  for (const id of ids) {
    writeFileSync(join(ART, `cats/${id}.svg`), composeCat(id, { withFace: true }));
    writeFileSync(join(ART, `cats/noface/${id}.svg`), composeCat(id, { withFace: false }));
  }
  return ids;
}

// Caja de recorte de cada slot en el lienzo de 512 (para los iconos).
const ICON_CROP = {
  sweater: [112, 290, 288, 200],
};

// Ajustes solo para el icono (la prenda suelta, sin gato debajo):
// - se quitan los recortes de patitas (class="paw-cut") para que el borde quede entero;
// - se dibuja el contorno del cuello, que en el gato lo aporta el trazo de la cabeza.
const ICON_FIX = {
  sweater: (inner) =>
    inner.replace(/<[^>]*class="paw-cut"[^>]*\/>\s*/g, '') +
    '\n<use href="#sw-head" fill="none" stroke="#4A3036" stroke-width="8" clip-path="url(#sw-clip)"/>',
};

function buildIcons() {
  const out = [];
  const clothes = join(ART, 'clothes');
  if (!existsSync(clothes)) return out;
  for (const slot of readdirSync(clothes)) {
    const crop = ICON_CROP[slot];
    if (!crop) continue;
    for (const f of readdirSync(join(clothes, slot))) {
      if (!f.endsWith('.svg') || f.endsWith('.icon.svg')) continue;
      const id = basename(f, '.svg');
      const inner = (ICON_FIX[slot] ?? ((x) => x))(innerSvg(read(`clothes/${slot}/${f}`)));
      const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <!-- Viste Lagato · icono de "${slot}/${id}". GENERADO por art/tools/build-art.mjs: no editar a mano. -->
  <rect x="4" y="4" width="248" height="248" rx="32" fill="#FFF7EC" stroke="#FFD1E3" stroke-width="4"/>
  <svg x="20" y="20" width="216" height="216" viewBox="${crop.join(' ')}" preserveAspectRatio="xMidYMid meet" overflow="visible">
${inner}
  </svg>
</svg>
`;
      writeFileSync(join(clothes, slot, `${id}.icon.svg`), icon);
      out.push(`${slot}/${id}`);
    }
  }
  return out;
}

const cats = buildCats();
const icons = buildIcons();
console.log(`gatos: ${cats.join(', ')}\niconos: ${icons.join(', ')}`);
