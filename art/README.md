# art/: SVG fuente de Viste Lagato

Arte vectorial propio (ADR 0006), con capas y un lienzo común (ADR 0003). La estética obligatoria está en `docs/art-direction.md`.

```
art/
  anchors.json              # anclas y zona de soltar del lienzo de 512 (copiar a src/game/data/cats.json)
  preview.html              # styleguide visual (gatos × sweaters, expresiones, anclas, iconos y UI)
  tools/build-art.mjs       # compositor: genera los gatos y los iconos (Node ≥ 18, sin dependencias)
  cats/
    base/silhouette.svg     # plantilla: geometría única de la pose (cola, cuerpo, patitas, cabeza+orejas)
    base/face-*.svg         # caras: normal, feliz, sorpresa, parpadeo y amor (capas intercambiables)
    coats/<id>.svg          # pelaje por gato: color base + patrón por parte
    <id>.svg                # GENERADO: gato completo (silueta + pelaje + cara normal), autocontenido
    noface/<id>.svg         # GENERADO: el mismo gato sin cara y sin cola (lo que carga el juego)
    tail/<id>.svg           # GENERADO: solo la cola con el pelaje del gato, en el lienzo de 512 (capa animada)
  clothes/<slot>/<id>.svg   # prenda en el lienzo de 512, ya en su lugar
  clothes/<slot>/<id>.icon.svg  # GENERADO: icono del grid (la prenda centrada sobre una celda crema)
  ui/panel.svg, ui/button.svg
```

Regenerar después de tocar `base/`, `coats/` o una prenda:

```
node art/tools/build-art.mjs
```

Los archivos marcados como GENERADO no se editan a mano.

## Lienzo y anclas
- Todos los gatos y las prendas usan `viewBox="0 0 512 512"`, con origen arriba a la izquierda. En Phaser, gato y prendas se colocan en la **misma posición, con el mismo tamaño y el mismo origen**. Una prenda no necesita offset porque ya está dibujada en su lugar.
- `anchors.json`:
  - `anchors`: un punto por slot (`head`, `eyes`, `neck`, `torso`, `paws`). Se usan para el imán al soltar, para los efectos y para que el gato mire la prenda.
  - `details`: puntos finos (cada ojo, boca, cada patita, puntas de las orejas y punta de la cola).
  - `boxes`: cajas aproximadas de cada región (`x`, `y`, `width`, `height`).
  - `dropZone`: el rectángulo del cuerpo donde se acepta soltar una prenda.
- Las coordenadas que importan de la plantilla:
  - cabeza entre y = 52 (puntas de las orejas) y y = 318 (mentón), lo que da unos 60 % del alto del gato;
  - cuerpo entre y = 262 y 490, con x de 140 a 372;
  - patitas como elipses centradas en (224, 474) y (288, 474), con rx 34 y ry 24;
  - ojos en (192, 224) y (320, 224).

## Cómo se compone un gato
Orden de pintado (de atrás hacia adelante): cola → cuerpo → patita izquierda → patita derecha → cabeza → cara.

En cada parte de `silhouette.svg`:
1. **Relleno plano**: el `<use … data-fill="PARTE">` recibe el color base del pelaje.
2. **Pelaje**: el marcador `<!--coat:PARTE-->` se reemplaza por las formas del pelaje, recortadas (`clipPath`) a esa parte. Por eso las rayas o las manchas pueden dibujarse "de más", y el recorte las deja dentro del contorno.
3. **Sombra única**: formas `class="shade"` en negro al 15 % de opacidad. Equivale a cada color multiplicado por 0,85, es decir, el mismo color un 15 % más oscuro, también sobre manchas y rayas. Va abajo de cada parte y bajo la cabeza (la forma de la cabeza desplazada 18 px hacia abajo).
4. **Contorno**: 8 px de `#4A3036`, con `stroke-linejoin` y `stroke-linecap` en round.

La cabeza, además, lleva el interior rosa de las orejas y el **brillo**. El interior de las orejas es fijo para todos los gatos y el brillo es blanco al 55 %; en los pelajes claros (luminancia > 0,85) `composeCat` lo cambia a `#FFF0A8` al 50 %, para que se vea sobre el pelo blanco.

### Formato de `coats/<id>.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-coat="ID">
  <g id="tail"  data-fill="#RRGGBB" [atributos de estilo opcionales]> …formas… </g><!--/tail-->
  <g id="body"  data-fill="#RRGGBB"> … </g><!--/body-->
  <g id="paws"  data-fill="#RRGGBB"> … </g><!--/paws-->
  <g id="head"  data-fill="#RRGGBB"> … </g><!--/head-->
</svg>
```
- Las cuatro partes son obligatorias, aunque estén vacías, y cada una termina con su comentario `<!--/parte-->`. No se anidan `<g>` dentro de una parte: los atributos comunes van en el propio `<g>`.
- `data-fill` es el color base de esa parte. Puede variar por parte; por ejemplo, la cola naranja del calicó.
- Las formas usan coordenadas del lienzo de 512 y se recortan solas a la parte.
- Para un gato nuevo: se copia un pelaje parecido, se cambian los colores y patrones (paleta de art-direction §4), se ejecuta el compositor y se revisa en `preview.html`.
- **Gatos oscuros**: los ojos y la boca son del color del contorno y casi desaparecen sobre `#3E3A47`. El pelaje `negro` agrega almohadillas de bigote un poco más claras (`#56505F`) para que se lea la boca `:3`. La cara sigue siendo idéntica. Esta solución también sirve para `carey` o `azul` si hace falta.

### Caras
Los archivos `face-*.svg` son capas transparentes de 512 (ojos, boca, mejillas y bigotes), todas en las mismas posiciones. El gato generado incluye `face-normal`. Para animar (parpadeo cada 3–5 s, reacciones), el juego carga `noface/<id>.svg` y encima la capa `face-*` que corresponda.

### Cola (capa propia, F3)
El juego carga `tail/<id>.svg` detrás de `noface/<id>.svg` y la rota desde su base, `details.tailBase` de `anchors.json` (352, 446: el punto medio de los dos extremos de `tail-shape` donde se une al cuerpo). La unión queda tapada por el cuerpo. Hace un vaivén suave en reposo (±4°) y un latigazo al soltar una prenda (±8°). El gato completo `<id>.svg` sigue incluyendo la cola para el styleguide.

## Cómo dibujar una prenda nueva
1. Se abre `cats/base/silhouette.svg` como referencia y se dibuja sobre el mismo `viewBox` de 512, sin mover nada. Conviene guiarse con las cajas y anclas de `anchors.json`.
2. Se usan los mismos tokens: contorno de 8 px en `#4A3036` (detalles internos de 4–5 px), rellenos planos, **una** sombra (negro al 15 %) y **un** brillo (blanco al 50–55 %). La prenda tiene que verse gordita y suave (lana), con puños y elásticos redondeados.
3. **Encaje con el cuerpo**: como el gato es una sola textura debajo, la prenda tiene que "pasar por detrás" de la cabeza y de las patitas. Para eso se usa una `mask` con la **misma** geometría de la plantilla:
   - la cabeza (`#sw-head`, el mismo `d` que `head-shape`) en negro, con `stroke-width="8"`, para que la prenda termine justo en el borde exterior del contorno de la cabeza;
   - las patitas, como elipses en negro con `class="paw-cut"`.
   Los puños se dibujan fuera de la máscara, encima de las patitas.
4. Los sweaters siguen la estructura de `clothes/sweater/rayas.svg`: `#sw-shape` (cuerpo inflado unos 8 px), `#sw-clip` y `#sw-cut`, más el cuello elástico, el elástico inferior, las costuras de las mangas y los puños. Para un sweater nuevo lo más fácil es copiar `rayas.svg` y cambiar el bloque de patrón.
5. Los ids solo tienen que ser únicos dentro del archivo, porque cada SVG se carga por separado.
6. Se ejecuta el compositor para crear el icono (`ICON_CROP` y `ICON_FIX` por slot, y `ICON_CROP_ITEM` por prenda cuando el recorte del slot no sirve, en `tools/build-art.mjs`), se agrega la prenda a `preview.html` si hace falta y se revisa sobre los gatos claro, oscuro y con manchas.

Para cargar en Phaser: `this.load.svg(key, 'assets/cats/naranja.svg', { width: 512, height: 512 })` o la escala que se necesite (ADR 0006). Las máscaras, los recortes y los `<use>` son SVG estándar y el navegador los rasteriza bien. Si en el futuro se pasa a PNG o atlas en el build, hay que usar un rasterizador con soporte de `mask` (Chromium o resvg).

## Checklist de art-direction §10 (antes de dar por bueno un asset)
- [ ] ¿Contorno de 8 px en color `contorno` (`#4A3036`), con uniones redondeadas?
- [ ] ¿Colores de la paleta, rellenos planos, una sombra y un brillo?
- [ ] ¿Formas redondeadas, sin puntas agresivas?
- [ ] ¿Encaja en la plantilla y en las anclas del gato? (verlo en `preview.html` sobre naranja, negro y calicó)
- [ ] ¿Se ve tierno junto a los demás assets?

## Cómo llegan los SVG al juego (`npm run art`)
Phaser carga los SVG desde `public/assets/` (ADR 0006), que es una **copia** de lo que hay en `art/`. La fuente de verdad sigue siendo `art/`.

```
npm run art     # node art/tools/build-art.mjs  +  node scripts/sync-art.mjs
```

- `scripts/sync-art.mjs` borra y vuelve a crear `public/assets/{cats,clothes,ui}/` con solo lo que el juego usa: `cats/noface/<id>.svg`, `cats/base/face-*.svg`, `clothes/<slot>/<id>.svg` y `<id>.icon.svg`, y `ui/*.svg`. No se copian los gatos completos, los pelajes, `preview.html` ni las herramientas.
- `public/assets/` **se commitea**, así `npm run dev`, `build` y los tests funcionan sin ejecutar nada antes. Después de tocar `art/`, hay que correr `npm run art` y commitear el resultado.
- El Preloader carga exactamente lo que dice `src/game/data/assets.ts` (derivado de `cats.json` y `clothes.json`): textura de cada gato sin cara, las 5 caras, y la prenda y el icono de cada prenda. La ruta sale del id (`sweater-rayas` en el slot `sweater` es `clothes/sweater/rayas.svg`; el icono, `rayas.icon.svg`). Un test (`tests/unit/assets.test.ts`) falla si falta algún archivo.
- `art/anchors.json` se copia a mano a `src/game/data/anchors.json` (un test comprueba que son idénticos).
