# 0018. Teñido por recoloreado del SVG en tiempo de ejecución

- **Estado**: Aceptado
- **Fecha**: 2026-10-25
- **Amplía**: ADR 0006 (arte en SVG y su carga con `load.svg`).

## Contexto
Los tintes (S4, ADR 0015) cambian el color de una prenda puesta arrastrando un frasco sobre ella. Hay 16 sweaters teñibles y 10 frascos: hasta 160 variantes. El estilo es de colores planos con contorno de tinta (ADR 0016), así que el teñido tiene que cambiar **solo** los rellenos principales y dejar intactos el contorno, la sombra y los detalles (botones, estrellas). El arrastre no puede trabarse mientras se genera un color, ni en el celular (ADR 0014).

## Decisión
**Marcas en el SVG fuente** (`art/clothes/`):
- Cada relleno teñible lleva `data-dye="a"` (color principal) o `data-dye="b"` (secundario). Toda prenda `dyeable` tiene al menos un `a`.
- El contorno, los detalles y la sombra no se marcan. En las prendas teñibles, la sombra se dibuja como **negro al 15 % de opacidad** encima del relleno (no como un tono más oscuro del mismo color), así acompaña a cualquier tinte.
- `art/tools/build-art.mjs` conserva los atributos `data-dye` al copiar a `public/assets/`. Un test (`assets.test`) comprueba que cada prenda `dyeable` tenga al menos un `data-dye="a"`.

**Núcleo puro** (`domain/dye.ts`, TDD):
- `deriveTone(hex)`: el secundario, mezcla del color del frasco con `crema-papel` al 45 %.
- `recolorSvg(svgText, { a, b }) → svgText`: reemplaza el color de los elementos marcados, tanto en el atributo `fill` como en `style="fill:…"`, sin tocar nada más.
- `sizeSvg(svgText, px)`: fija `width` y `height` en la raíz para que el navegador rasterice nítido (Firefox lo necesita para dibujar un SVG desde un blob).
- `dyeTextureKey(texture, dyeId) → "<texture>~<dyeId>"`.
- Tests: el contorno y la sombra quedan intactos, `a` y `b` se reemplazan en ambas formas, un SVG sin marcas no cambia y la clave es estable.

**Carga y rasterizado**: un Global Plugin nuevo, **`DyePlugin`** (`PluginKeys.Dye`), porque las texturas son globales y la caché tiene que sobrevivir a los cambios de escena (ADR 0010: servicios entre escenas en plugins, no en `systems/`, que no tiene estado). Su parte con lógica (la LRU y la regla de "en uso") es una clase pura en `plugins/dyeCache.ts`, con cobertura ≥ 80 %; el plugin solo conecta con `textures` y el DOM. Las escenas piden `ensure(itemId, dyeId) → Promise<textureKey>`.
- El Preloader, además del `load.svg` de siempre, carga el **texto** del SVG de las prendas `dyeable` con `this.load.text` (claves en `constants.ts`). Son 16 archivos chicos.
- El rasterizado es **perezoso**: la textura teñida se crea la primera vez que hace falta (al soltar el frasco o al entrar a DressUp con prendas teñidas puestas). Flujo: `recolorSvg` → `sizeSvg` (al tamaño de `CLOTHING_TEXTURE_SIZE`) → `Blob` → `URL.createObjectURL` → `Image` → `textures.addImage(key, img)` → `revokeObjectURL`. Es asíncrono y no bloquea el arrastre.
- Mientras se genera, la prenda sigue con su color anterior; el **barrido del color** (de abajo hacia arriba, ADR 0013 lo vuelve fundido) empieza cuando la textura está lista. En la práctica son uno o dos frames.
- Al entrar a DressUp, se **precalientan** las texturas de las prendas teñidas que están puestas, antes del pop escalonado.
- **Caché con tope**: como máximo 24 texturas teñidas vivas, con LRU. Nunca se descarta una que esté en uso (puesta en el gato o dentro de un render del llavero en curso). Al descartar, `textures.remove(key)`.
- Los **iconos no se tiñen**: la celda del grid y el panel de capas muestran un puntito del color en la esquina.

**Lo que no se usa**: el tint de Phaser (`setTint`). Multiplica también el contorno y la sombra, y ensucia los colores planos.

## Alternativas consideradas
- **`setTint` o un filtro ColorMatrix sobre la prenda**: barato, pero tiñe el contorno y no distingue el color principal del secundario.
- **Pregenerar las 160 variantes en el build** (`npm run art`): carga más lenta y 160 archivos más que casi nadie verá. Queda como **plan B**: si en el celular el rasterizado en vivo resulta lento, se generan en el build con la misma clave `texture~dye`, sin cambiar el contrato.
- **`textures.addBase64`**: obliga a codificar el SVG en base64 y es más pesado que un blob URL. Se acepta solo como respaldo si `addImage` da problemas en algún navegador.
- **Partes del sweater como capas separadas** (relleno y contorno en texturas distintas, tinte solo en el relleno): duplica las texturas de todas las prendas y complica el ADR 0003.

## Consecuencias
- Agregar un frasco es una línea en `dyes.json`; hacer teñible otra prenda es marcar su SVG y poner `dyeable: true` (el gorro y la bufanda quedan como nice to have).
- Los sweaters actuales hay que retocarlos una vez: marcas `data-dye` y la sombra al 15 % de negro (S7b).
- El render de la foto y del llavero (ADR 0021) usa la misma textura teñida, sin código aparte.
- Riesgos: un SVG con un gradiente o un `<use>` que herede el color no se recolorea bien (regla de arte: rellenos planos y explícitos en lo teñible); el primer teñido en un celular lento puede tardar algunos frames (se mide en el espigón de S4; si pasa de ~100 ms, plan B); las texturas teñidas viven en la GPU, de ahí el tope de 24.

## Enmienda (2026-10-26): lo que fijó la implementación de la pestaña Tintes
Esta sección no cambia la decisión. Documenta el contrato que implementó `objects/dressup/DyeTabController.ts` (un controlador del ADR 0019).

**Evento de escena**: `DressUpEvents.ItemDyed` (`'item-dyed'`, en `constants.ts`), con los argumentos `(item: ClothingDef, dyeId: string)`. Se emite cuando la textura teñida ya está lista y el color quedó guardado en `RegistryKeys.ItemDye`, después del splash. Lo escucha `TasteReactions` (gustos de color). Se suma a la tabla de eventos de la enmienda del ADR 0019.

**API nueva de `Cat`** (`objects/Cat.ts`):
- `itemAt(point: Point): ClothingDef | null`: devuelve la prenda puesta cuyos píxeles visibles están bajo un punto en coordenadas de juego. Si varias se superponen, gana la de delante (por `zIndex` del slot). Lee el mapa de alfa de la textura que se muestra, así que también encuentra la copia teñida. Si no hay ninguna, devuelve `null`.
- `highlightItem(itemId: string | null): void`: enciende el halo suave de la prenda que el frasco tiene debajo (el mismo halo que el hover) y apaga el de la anterior. Con `null`, lo apaga. Es necesario porque en el celular el dedo tapa la prenda.
- Las dos son de render. La regla de qué pasa al soltar (teñir, agua o rebote) está en el helper puro `resolveDyeDrop` (`domain/dyeDrop.ts`), no en el controlador (ADR 0012).

**Medición y mitigación**:
- El primer teñido medido en headless con SwiftShader y `render.maxTextures: 1` (el peor caso, ADR 0022) tardó **entre 420 y 560 ms**, contra el umbral de unos 100 ms de las Consecuencias.
- Para que no se note, el teñido **se pide al tomar el frasco**, sin esperar a soltarlo:
  - al levantarlo se precalientan (`DyePlugin.ensure`) todas las prendas teñibles puestas con ese color;
  - al pasar sobre una prenda, se pide la de esa prenda.
  
  Al soltar, la textura casi siempre está lista. Un fallo en el precalentado se ignora; solo se informa al soltar (el frasco vuelve a su celda).
- **Pendiente para F21**: medir el primer teñido con una GPU real, en PC y en un celular de gama baja. Si con el precalentado se sigue notando la espera o pasa de unos 100 ms, se activa el **plan B** (pregenerar las variantes en el build con la misma clave `texture~dye`). El seguimiento está en `docs/tests-pendientes.md`.
