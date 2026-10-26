# Tests pendientes de la segunda etapa

El 2026-10-26 el usuario decidió mantener el TDD (unit e integración) en cada tarea y dejar **los tests e2e (Playwright) para el final de todo**. Aquí se juntan los e2e pendientes y algunos tests unit que quedaron sin hacer. Se escriben y se corren en la fase final, antes de la DoD (F21).

## F12.2 y F12.3: kit de UI
1. `tests/e2e/kit.spec.ts` (o la escena de laboratorio): una escena con `Button` píldora y pestañas índice. Verifica con el mouse que el click emite la acción y que la pestaña activa sube, sin errores de consola.
2. Un test de integración o e2e del kit con Card, Polaroid, SpeechBubble y PaperBackground, sin errores de consola.
3. `pillButton.test.ts`: el hover invierte los colores (primario y secundario), y el área de toque crece con `any-pointer: coarse`.
4. `indexTabs.test.ts`: el `color` de `Ink` de cada pestaña, y la regresión de `style: 'chip'`.
5. `kitObjects.test.ts`:
   - el tween de la washi, y que no se anima con movimiento reducido;
   - que `SpeechBubble.setText` redibuja la burbuja;
   - que `destroy()` limpia los listeners.
6. `particleTextures.test.ts`: que una textura que ya existe no se regenera.
7. `kit.test.ts`: `tabLayout` con `count = 0` y `hoverTarget` en los dos modos.
8. Confirmar los umbrales de coverage.

## F16.1, F17.1, F18.1 y F19.1: dominio de tintes, álbum, foto y llavero
✅ **Hechos**: `albumData`, `dyeData` y `keychainData` (el total del álbum es 138). Lo que sigue queda como referencia:
- `albumData.test.ts`:
  - el total es 138;
  - los ids de `sets.json` existen;
  - los `unlock.set` de `photo.json` apuntan a sets reales;
  - los ids de foto coinciden con el arte;
  - cada hito del álbum tiene premio.
- `dyeData.test.ts`:
  - cada prenda `dyeable` tiene `data-dye="a"`;
  - `recolorSvg` no toca la tinta `#1F1B1A` ni la sombra;
  - los hex de `dyes.json` son válidos.
- `keychainData.test.ts`: `goldFrom` y `charmFrom` de `photo.json` y la regla `charmFrom >= goldFrom`.

### E2E pendientes de los tintes, el álbum, el modo foto y el llavero
- `album.spec.ts`:
  - porcentaje y hitos;
  - las entradas nuevas llevan ✦ hasta que se ven;
  - los sets completados dan sus premios en el modo foto.
- `dye.spec.ts`:
  - teñir arrastrando un frasco;
  - `agua` devuelve el color original;
  - el tinte persiste tras recargar.
- `photomode.spec.ts`:
  - solo se puede elegir lo desbloqueado;
  - tope de 8 stickers;
  - los stickers quedan dentro del marco.
- `keychain.spec.ts`:
  - guardar, transformación y descarga del empaque;
  - colgar con la pregunta de reemplazo;
  - el llavero sobrevive a una recarga.

## F13.1, F14.1, F15.1 y F15.2: economía, gustos, puntaje y ceremonia
- ✅ **Hecho**: `scoreBalance.test.ts` (los 12 gatos llegan a 5★ y `bestPossible` tarda menos de 0,5 s por gato). Pendiente:
- ~~`scoreBalance.test.ts`~~:
  - `bestPossibleStars === 5` para los 12 gatos;
  - con solo las prendas iniciales se llega a ≥ 3 estrellas;
  - medir cuánto tarda `bestPossible`.
- `balance.test.ts` (jugador modelo): el 50 % de lo comprable se alcanza entre las sesiones 3 y 5, y el 100 % en 12 sesiones o menos.

### E2E pendientes
- `tastes.spec.ts`: las reacciones a la prenda favorita, a una que el gato ama y a la que detesta.
- La ceremonia en el Showcase:
  - sellos, botones que vuelan al monedero y notas;
  - un toque salta la ceremonia ×3;
  - el monedero queda con la suma exacta.
- Tienda y calificación:
  - comprar, y el aviso de "no alcanza";
  - la caja del ¡Listo! con prendas sin pagar;
  - recargar no paga dos veces.

## F12.4: voz y personajes
### E2E pendientes
- Si se cambian los nombres en `brand.json`, las burbujas del juez y de la vendedora muestran los nombres nuevos.
- La firma "Xoxo, mau!" aparece en la foto.
- El reverso del llavero dice "Hecho a mano · <fecha>".
- Ningún texto visible contiene `nombre@` ni `@nombre`.
- Mostrar las burbujas no produce errores de consola.

## F16.2: DyePlugin
### E2E pendientes
- Soltar un frasco en DressUp crea la textura `texture~dye` y el gato la muestra.
- El primer teñido tarda menos de unos 100 ms, también en celular. El log `[dye]` sale en dev.
- Los SVG teñidos cargan sin errores de consola en Chromium y Firefox.
- Con más de 24 tintes distintos, la caché no crece y no se expulsa lo que el gato tiene puesto.
- Al recargar con una prenda teñida, la textura se precalienta y se ve el color.

## F11.11 a F11.15: guardado v2, hook, controladores y API de Cat
### E2E pendientes
1. **Correr la suite e2e completa sin tocar specs**, para confirmar que el refactor de DressUp no rompió nada. Los specs más sensibles son `secrets`, `juice`, `dressup`, `dragdrop`, `wardrobe`, `catalog`, `pixelHit`, `perf` y `mobile`.
2. Migración: un save v1 con outfit, secretos y `muted` pasa a v2 completo, con `wallet`.
3. La decoración de celdas sobrevive al cambio de pestaña y al scroll.
4. Si `beforeLeave` devuelve `false`, el jugador no sale de DressUp (con S3).
5. Specs que usen `sayNo`, las poses, `setItemTexture` y `setOutfit({instant})`.
6. Revisar `boot.spec` y `save.spec` en `firefox` y `chromium-1920`.

## F20.1, F20.2 y F20.4: repintado de Preloader, ShopEntrance y CatSelect
### E2E pendientes
- **Preloader**: la barra (también en movimiento reducido), sin errores de consola.
- **CatSelect**:
  - las polaroids aparecen en orden, y el gato elegido salta y maúlla;
  - la barra del nombre aparece solo después de elegir;
  - el anillo marca al gato elegido;
  - si el nombre está vacío, sale un aviso;
  - "¡Este!" lleva a la tienda;
  - al volver, el gato guardado aparece preseleccionado;
  - en el celular, tocar el campo abre el input del DOM;
  - con progreso sembrado, cada polaroid muestra "♥ n/m" y la mejor estrella.
- **ShopEntrance**:
  - el letrero coincide con `brand.shopSign`;
  - la burbuja "¡Pasa nomás!" aparece con la campanita y desaparece antes del zoom;
  - un click o un toque salta la escena;
  - en movimiento reducido hay fundido sin zoom;
  - en táctil dice "Toca para saltar".
- **Revisar el glitch del texto rotado** (Phaser 4 corta franjas de los glifos en un `Text` dentro de un contenedor rotado): polaroids, `SpeechBubble` y `Card`.
