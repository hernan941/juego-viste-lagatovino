# 0016. Dirección de arte Lagatovino

- **Estado**: Aceptado
- **Fecha**: 2026-10-25
- **Reemplaza**: la estética de `docs/art-direction.md` v1 (kawaii pastel rosa), que pasa a la **v2**.
- **Enmienda**: ADR 0006 (cambian los tokens de trazo y color que siguen los SVG y la tipografía; el método, SVG propio en `art/`, se mantiene).

## Contexto
La segunda etapa conecta el juego con la marca real **Lagatovino** (llaveros de porcelana pintados a mano, cuaderno, tinta, washi tape y polaroids). La estética v1 (rosa pastel, contorno marrón, cara `:3`, mejillas, Fredoka desde Google Fonts) no se parece a la marca. Al mismo tiempo, rehacer los gatos rompería las 50 prendas que dependen de la plantilla y las anclas del ADR 0003. El usuario eligió la **opción B**: re-estilizar el trazo y la cara sin tocar la forma.

## Decisión
**Principio**: de "kawaii pastel rosa" a **"cuaderno de Catalina"**: papel crema, tinta negra cálida, washi tape, polaroids y ✦. El juice no cambia: solo cambian sus colores y formas.

**Gatos jugables, opción B**:
- Se mantienen las proporciones chibi, la silueta, el lienzo de 512 × 512, la pose y **todas las anclas** (`anchors.json`). El ADR 0003 sigue vigente sin cambios.
- **Contorno de tinta**: color `tinta` `#1F1B1A` (negro cálido, nunca `#000`), trazo base de 7 px más una copia desplazada (1,5, 2) px debajo, que engrosa el lado de la sombra como un pincel. Lo genera `art/tools/build-art.mjs` para todos los gatos a la vez. El temblor con `feDisplacementMap` es opcional y solo entra si no rompe el encaje de las prendas en `art/preview.html`.
- **Cara**: ojos almendra de tinta con un brillito, en las mismas posiciones (192, 224) y (320, 224) para que los lentes calcen; nariz triangular chica; boca de una línea en "y". **Sin `:3` y sin mejillas.** Bigotes de tinta finos y algo curvos.
- **Expresiones**: `normal`, `feliz`, `sorpresa`, `parpadeo`, `amor` (se mantienen los ojos de corazón, porque son el feedback principal) y la nueva **`puaj`** (S2).
- Interior de las orejas en `durazno`. Los pelajes conservan sus colores; si chocan con la UI nueva, se bajan un 10 % de saturación en `coats/`.

**Prendas**: en esta etapa solo cambia el color del contorno a `tinta` (reemplazo masivo en `art/clothes/` y en los iconos). Los sweaters teñibles suman las marcas `data-dye` (ADR 0018) y su sombra pasa a negro al 15 % de opacidad. El trazo variable en las prendas queda como nice to have.

**Paleta y UI**: los colores de la marca (cielo, rosa, sol, lila, durazno, naranjo, lapiz, frambuesa, tomate y hoja) y las líneas de cuadrícula y lápiz salen del CSS de lagatovino.com. Los tokens de `docs/art-direction.md` v2 §4 reemplazan a los de la v1 en `constants.ts` (`Palette`). Botón principal en píldora **plana** de tinta (sin el 3D blando), tarjetas blancas con borde de 3 px, fondo de papel con cuadrícula, pestañas tipo índice de cuaderno, polaroids con washi y ✦ como partícula base. El press cambia: escala 0,95 más 2 px de desplazamiento (art-direction v2 §8).

**Tipografías**:
- **Londrina Solid** (400 y 900) para títulos, el cartel del nombre, el monedero y las estrellas.
- **Gaegu** (400 y 700) para lo que "dice" alguien: burbujas del gato, el juez, la vendedora, pistas y el nombre en la foto.
- La fuente del sistema para el texto corrido.
- Ambas tienen licencia **SIL OFL 1.1** y se **autoalojan** en `public/fonts/` (`woff2`, con su `OFL.txt` y una entrada en los créditos). Se declaran con `@font-face` en `public/style.css`. **Se deja de usar Google Fonts**: se quitan los `<link>` de `index.html` y de `art/preview.html`. Fredoka sale del juego.
- `Boot` espera a las dos familias con `document.fonts.load` (como hoy con Fredoka) y conserva el tope de tiempo. Las familias se nombran en `constants.ts` (`Fonts.Title`, `Fonts.Voice`, `Fonts.Body`); se elimina `FONT_FAMILY`.

**El llavero**: los gatos jugables **no** se convierten en llaveros. El llavero es un tratamiento del render del look al guardar (ADR 0021). Su arte propio (armellita, argollas, dije ✦, cadenita, barniz, tarjeta kraft y fondo del colgador) vive en `art/ui/keychain/` y sigue art-direction v2 §11.

**Regla de la etapa**: nada nuevo puede depender de la geometría del gato más allá de `anchors.json`. Las poses del modo foto y el llavero son transformaciones del render, no arte nuevo del cuerpo.

## Alternativas consideradas
- **Opción A (solo recolorear la UI)**: barata, pero los gatos `:3` con mejillas rosa no se parecen a la marca.
- **Opción C (rehacer los gatos como los llaveros de la marca, alargados sobre cuatro patas)**: obliga a redibujar 12 gatos y las 50 prendas y a reemplazar el ADR 0003. Queda como arte extra del llavero, fuera de esta etapa.
- **Seguir con Google Fonts**: depende de la red y de un tercero, y falla sin conexión. Autoalojar dos familias OFL es barato.
- **Contorno negro puro**: se ve duro y digital; el negro cálido se lee como tinta.

## Consecuencias
- El juego se ve como un producto de Lagatovino sin romper ninguna prenda.
- `docs/art-direction.md` pasa a la v2 y su checklist (§10) es la que se aplica a todo asset nuevo o repintado.
- Hay que repintar la UI de todas las escenas (S7c) y regenerar los assets con `npm run art`. Los iconos de prenda cambian su celda (`crema-papel` con borde `borde`).
- El ADR 0014 sigue igual; el overlay de "gira el teléfono" se repinta con la paleta nueva.
- Riesgos: el contorno doble puede engordar la silueta y desalinear las máscaras de las prendas (se verifica en `art/preview.html` antes de regenerar); los pelajes saturados pueden chocar con el crema; las fuentes deben estar cargadas antes del primer texto o Phaser rasteriza con la de respaldo.
