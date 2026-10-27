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
- **Texto rotado**: el corte de franjas no se reprodujo (Chromium y Firefox, modo normal y modo test). En la fase e2e, capturar polaroids con caption, `SpeechBubble` y `Card` inclinados y confirmar que se leen enteros. Si el corte aparece, anotar escena, modo y navegador, y recién ahí hacer `inkLabel()`.
- La burbuja "¡Pasa nomás!" se ve en Gaegu 700, sin cortes.

## F14.2: reacciones de gusto
### E2E pendientes (F14.6)
- Para los 12 gatos: soltar una prenda que ama, una que detesta y su favorita. En `__VISTE__.dressUp.tastes.last` y `.log` deben quedar `love`, `dislike` y `favorite`.
- La prenda sigue puesta después de "detesta".
- Un combo deja `combo` en el log y una prenda neutral deja `neutral`.
- Con `?reduced`, la cara y el sonido siguen respondiendo.
- Sin errores de consola.

## F15.3: objetos de la ceremonia
### E2E pendientes
- La ceremonia completa (`?lab=ceremony` o el Showcase):
  - los pasos van en orden y `ceremonyStep` los refleja;
  - el monedero termina igual a `plan.coins`.
- Un click, o un toque en el celular, salta la ceremonia.
- En movimiento reducido no hay temblor y salen 3 botones.
- Con 1 o 2★ el juez consuela, y con 5★ hay confeti.
- Si se cambia de escena a mitad de la ceremonia, no quedan tweens ni listeners colgados.
- Sin errores de consola.

## F17.2 y F18.2: esqueletos de Album y PhotoMode
### E2E pendientes
- `album.spec`:
  - `jump('Album')` y volver;
  - pasar de página con las pestañas y con las flechas;
  - el colgador aparece bloqueado;
  - al volver, DressUp conserva la pestaña y el scroll (F17.6);
  - al volver al Showcase, no se repite la ceremonia.
- `photomode.spec`:
  - `jump('PhotoMode')` con un look;
  - [Guardar] descarga la foto;
  - [Seguir vistiendo] vuelve a DressUp.
- Agregar un ciclo de Album y PhotoMode a `perf.spec`, y revisar `flow.spec` y `mobile.spec` (menú de compartir en el celular).

## F13.2 a F13.4: progreso, monedero y etiquetas
### E2E pendientes
- Con `setWallet(250)`, el HUD muestra 250 (`dressUp.shop.wallet.shown`).
- El monedero no tapa las pestañas, el botón de sonido ni el de pantalla completa, a 1280 y en el celular.
- `shop.spec`:
  - arrastrar una prenda sin comprar la pone y muestra su etiqueta (`dressUp.tags.worn`);
  - las etiquetas de las celdas sobreviven al cambio de pestaña y al scroll;
  - tocar una celda con etiqueta emite `PriceTagPressed`;
  - todo esto también con `@mobile`.
- Vuelos: en movimiento reducido vuelan como máximo 3 botones. Al terminar un `WalletFlight`, `shown` es igual a `wallet` y `flying` vale 0.

## F19.2: objeto Keychain
### E2E pendientes
- Después de aplanar, un píxel fuera del borde es transparente, también con `maxTextures: 1`.
- La misma receta produce la misma textura.
- Las 12 miniaturas se arman de a una por frame, sin pasarse del presupuesto.
- `shutdown` libera las texturas.
- Flujo completo: guardar, transformar, descargar, colgar y recargar (`keychains` y `keychainPhase`).
- Medir en un celular real de gama baja (F21).

## F12.R: ajustes de estética
### E2E pendientes
- Botones de sonido, movimiento y pantalla completa:
  - hover, press y el ✦ cuando están activos;
  - `MotionButton` muestra "Movimiento suave" o "Movimiento normal".
- CatSelect:
  - al elegir, la tarjeta se endereza y sube;
  - el rótulo de `setTally` se ve derecho al volver de DressUp.
- `puaj`:
  - la nube aparece y desaparece;
  - en movimiento reducido no hay escalofrío;
  - la cara vuelve a la normal a los 900 ms.
- **Riesgo de inestabilidad**: el parpadeo de cariño del idle (cara `feliz` durante 600 ms) puede afectar a los e2e que leen la cara en reposo.
- La fachada de la boutique y el fondo en lápiz se ven sin errores de consola.
- Los acentos ("Grisú", "Siamés") cargan sin errores.
- El fondo `crema-papel` en el celular emulado.
- Capturas a 1920 y en el celular (lo pide F12.R).

## F15.4: Showcase como pasarela
### Specs existentes que hay que adaptar
`flow`, `photo`, `juice`, `motion`, `mobile`, `perf`, `secrets` y `boot`:
- hay que esperar `ceremonyStep === 'done'` o `ready`;
- "Descargar foto" ya no existe: la descarga pasa por [Modo foto] → [Guardar];
- el hook del Showcase ya no expone `photos`, `lastPhoto`, `revealing`, etc.

### E2E nuevos
- `rating.spec.ts` (F15.5):
  - las estrellas que da cada look;
  - el monedero sube según `economy.json`;
  - repetir un look paga propina;
  - el récord y los hitos se pagan una sola vez;
  - `bestStars` sobrevive a una recarga;
  - `@mobile`: "Toca para seguir";
  - `@cross`: un look de 5★.
- Al volver del álbum con `replay:false`, la ceremonia no se repite.
- Salir a mitad de la ceremonia no pierde botones.
- `perf.spec`: cero fugas tras los ciclos de escena.

## F16.3: pestaña Tintes
### E2E pendientes
- `dye.spec.ts`:
  - arrastrar el frasco rosa al sweater lo tiñe;
  - el color sobrevive a una recarga (`dressUp.dyes`, `itemDye` y `saved`).
- `@mobile`: arrastrar un frasco con el dedo. Hay que poner el dedo unas 64 unidades por debajo, por el levantado.
- F16.6:
  - los 16 sweaters aceptan tinte;
  - una prenda no teñible rebota;
  - `agua` devuelve el color original;
  - sobre el gato sin prenda sale "¡A mí no!";
  - el color favorito deja `tastes.last === 'color'`.
- **Ojo**: `e2eState()` de los controladores devuelve coordenadas de juego, no de página. Hay que convertir `dyes.jars` o hacer que el hook las convierta.
- **Medir el primer teñido con GPU real**: en headless con SwiftShader tarda entre 420 y 560 ms, y el umbral del ADR 0018 es de unos 100 ms. Si con GPU sigue por encima, activar el plan B (pregenerar las variantes en el build).

## F18.3 y F18.4: bandejas del modo foto
### E2E pendientes (`photomode.spec.ts`)
- Elegir fondo, marco y pose. Lo bloqueado no se puede elegir y muestra su pista.
- Poner un sticker arrastrándolo de `cell:<id>` a `photo`, y quitarlo llevándolo a `jar` o a `panel`.
- El tope de 8 stickers se respeta, los stickers quedan dentro del marco y `composition` coincide con lo hecho.
- `@mobile`: arrastrar un sticker con el levantado.
- `@cross`: componer y guardar (con F18.5).
- `perf.spec`: un ciclo con stickers.
- **Ojo**: si el arrastre empieza sobre stickers solapados, toma el de arriba.

## F13.5, F14.3 y F14.4: compra, descubrir paga y ficha del gato
### E2E pendientes
- `shop.spec`:
  - comprar desde la celda y desde el gato: hoja, [Llevar], `owned` y monedero;
  - "no alcanza": el monedero no cambia y sale la frase;
  - [Todavía no] y tocar fuera no compran;
  - un doble toque en [Llevar] cobra una sola vez;
  - recargar conserva la compra.
- `tastes.spec`:
  - el primer descubrimiento suma 15 y el segundo no;
  - recargar conserva `tastesFound`;
  - `@mobile`: tocar el cartel abre la ficha;
  - con 5 gustos la ficha dice "¡Me conoces!";
  - la ficha no se abre durante un arrastre.
- `secrets.spec`: el primer combo paga +40 una sola vez, también si se sale sin abrir la cajita.
- `@cross`: descubrir, recargar y ver la ficha.
- Movimiento reducido: la compra y la ficha funcionan sin vuelo ni rotación.

## F17.3 y F17.4: páginas del álbum
### E2E pendientes (`album.spec`)
- Con `grant`, una prenda pasa de boceto a color. Con `grantDyes`, un frasco pasa de boceto a color.
- Un gusto descubierto aparece en la polaroid de su gato (`info.page.shown` y `marks`).
- Un combo ganado llena su hueco.
- El paginador de Prendas muestra 2 hojas (30 y 20 entradas). Tocar una entrada abre su ficha y tocarla otra vez la cierra.
- Movimiento reducido en las 4 páginas.
- `perf.spec`: cambiar entre las 4 páginas sin fugas (sobre todo Gatos, con 12 `Cat`).

## F16.4: barrido de color y reacciones
### E2E pendientes (`dye.spec.ts`, F16.6)
1. Al soltar un frasco, `dyes.sweeping` incluye la prenda y después queda vacío. `applied` y `itemDye` persisten tras recargar.
2. Con el color favorito:
   - `tastes.last === 'color'`;
   - el monedero sube 15;
   - `tastesFound[cat]` incluye `'color'`;
   - repetir el mismo color no vuelve a pagar.
3. Un frasco que no es el favorito no paga.
4. `agua` vuelve a la textura original y quita el puntito.
5. Puntito de color:
   - aparece en la celda y en la fila del panel de capas de cada prenda teñida;
   - nunca en las prendas no teñibles.
6. En movimiento reducido el tinte se aplica sin máscara y `settled` pasa a verdadero.
7. `@mobile`: arrastrar un frasco con el dedo, y el barrido termina.
8. Sin errores de consola.
