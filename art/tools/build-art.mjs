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

/** Luminancia relativa (0-1) de un color #RRGGBB. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function composeCat(id, { withFace }) {
  const coat = parseCoat(read(`cats/coats/${id}.svg`), id);
  let svg = read('cats/base/silhouette.svg');
  svg = svg.replace(/<!--[\s\S]*?-->/, `<!-- Viste Lagato · gato "${id}". GENERADO por art/tools/build-art.mjs: no editar a mano (editar base/ o coats/${id}.svg). -->`);
  for (const part of PARTS) {
    svg = svg.replace(new RegExp(`data-fill="${part}" fill="[^"]*"`, 'g'), `fill="${coat[part].fill}"`);
    svg = svg.replaceAll(`<!--coat:${part}-->`, coat[part].content);
  }
  // Pelajes claros (blanco, calicó, crema…): el brillo blanco de la cabeza no se ve sobre el
  // blanco, así que pasa a `mantequilla` (#FFF0A8) al 50 % (art-direction §3-§4).
  if (luminance(coat.head.fill) > 0.85) {
    svg = svg.replaceAll('fill="#FFFFFF" fill-opacity="0.55"', 'fill="#FFF0A8" fill-opacity="0.5"');
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
  // cuadrada y algo más ajustada que el sweater: deja ~9 % de margen lateral en la celda
  sweater: [121, 256, 270, 270],
  head: [128, -38, 256, 256],
};

// Ajustes solo para el icono (la prenda suelta, sin gato debajo):
// - se quitan los recortes de patitas (class="paw-cut") para que el borde quede entero;
// - se dibuja el contorno del cuello, que en el gato lo aporta el trazo de la cabeza;
// - sweater: el bajo se hace recto (sin la panza redondeada) y los puños bajan hasta el
//   elástico, con las costuras alargadas, para que suelto no parezca un canasto con asas.
const SW_HEM_ROUND = 'C384 432 378 454 366 468 C330 480 182 480 146 468 C134 454 128 432 130 398';
const SW_HEM_FLAT = 'C383 430 382 456 374 470 C330 472 182 472 138 470 C130 456 129 430 130 398';
const SW_CUFF_DROP = 20;
const ICON_FIX = {
  sweater: (inner) =>
    inner
      .replace(/<[^>]*class="paw-cut"[^>]*\/>\s*/g, '')
      .replaceAll(SW_HEM_ROUND, SW_HEM_FLAT)
      .replace('198 436 M344 340', `199 ${436 + SW_CUFF_DROP} M344 340`)
      .replace(/(314) 436"/, `313 ${436 + SW_CUFF_DROP}"`)
      .replace(
        /(<rect x="192" y="430"[^>]*\/>\s*<rect x="258" y="430"[^>]*\/>\s*<path[^>]*d="M210 437[^"]*"[^>]*\/>)/,
        `<g transform="translate(0 ${SW_CUFF_DROP})">$1</g>`,
      ) +
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
