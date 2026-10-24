# 0014. Soporte para celular (táctil)

- **Estado**: Aceptado
- **Fecha**: 2026-10-23
- **Enmienda**: ADR 0008 (deja sin efecto "el soporte táctil o móvil no es un objetivo"; el resto del 0008 sigue vigente)

## Contexto
El ADR 0008 dejó el móvil fuera de los objetivos. Ahora el usuario pide explícitamente que el juego **también se pueda jugar desde el celular**. El juego ya está construido para PC: lienzo de 1280 × 720 horizontal con `Scale.FIT`, drag & drop como única forma de equipar y hover en todo lo interactivo. Hay que sumar el móvil sin rehacer el layout, sin romper la experiencia de PC y sin crear una segunda rama de UI.

Fuerzas:
- En un teléfono, el lienzo de 1280 × 720 se ve chico. Con `FIT` en horizontal, un iPhone de 844 × 390 CSS px escala a ~0,54, y un Pixel de 915 × 412, a ~0,57. Un objetivo de 44 px CSS equivale a unas **80 unidades del juego**.
- En táctil no existe el hover. El dedo tapa lo que arrastra.
- Los navegadores móviles hacen zoom con doble toque o pellizco, scroll, rebote, selección de texto y menú contextual con pulsación larga, y todo eso pelea con el drag.
- El teclado virtual solo aparece sobre un campo de texto real con foco, y la barra del navegador cambia la altura visible (`100vh` miente).

## Decisión
**PC sigue siendo primero; el celular en horizontal pasa a ser una plataforma soportada.** Usaremos el mismo juego, el mismo lienzo y las mismas escenas, con ajustes de input y de página.

1. **Lienzo y orientación**: se mantiene 1280 × 720 horizontal con `Phaser.Scale.FIT` y `CENTER_BOTH`. En el celular se juega **en horizontal**. En vertical, un **overlay HTML/CSS** tierno ("gira el teléfono", con el estilo de `art-direction.md`) tapa el juego. Se activa con una media query de orientación vertical limitada a punteros gruesos, para que no aparezca en una ventana de PC angosta. No se rediseña a vertical. El overlay vive en `index.html` y `public/style.css`, fuera de Phaser.
2. **Página**:
   - meta viewport con `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` (más `viewport-fit=cover`);
   - `touch-action: none` sobre el contenedor del juego;
   - sin scroll ni rebote (`overscroll-behavior: none`, `overflow: hidden`), sin selección (`user-select: none`, `-webkit-touch-callout: none`) y sin menú contextual en el lienzo;
   - altura con `100dvh` (y `100vh` como respaldo).
3. **Input unificado**: todo usa el **Pointer de Phaser** (`pointerdown`/`pointerup`/`drag*`), que trata igual el mouse y el touch. No hay ramas de código "si es móvil" en la lógica de juego.
   - **Nada depende solo del hover.** El hover de PC queda como adorno. En táctil, el feedback equivalente es el **estado de press** (escala, brillo y sonido al apoyar el dedo), que ya exigía el ADR 0008 y ahora pasa a ser obligatorio en todo lo interactivo.
   - Los tooltips o las pistas que hoy salen con hover deben tener otro camino (press, o mostrarse durante el arrastre).
4. **Drag de prendas**: sigue siendo la **única** forma de equipar (ADR 0008).
   - Si el pointer es táctil, la prenda se dibuja **levantada con un pequeño offset hacia arriba** respecto del dedo para que el dedo no la tape. La zona de soltar y el imán se evalúan sobre la posición de la prenda, no sobre la del dedo. Con mouse, el offset es cero.
   - **Objetivos táctiles mínimos de ~44 px CSS en un teléfono típico (≈ 80 unidades del juego)**: celdas del grid, pestañas, la ✕ del panel de capas y los botones. Si el dibujo es más chico, se agranda el área de toque (hit area), no el dibujo.
5. **Nombre del gato**: el campo de nombre de CatSelect debe abrir el **teclado virtual**. Para eso tiene que ser un `<input>` real del DOM (DOM Element de Phaser u overlay HTML) que reciba el foco dentro de un gesto del usuario. No se captura el teclado solo con `keyboard` de Phaser. Al confirmar o al perder el foco, se cierra el teclado y el juego recupera el input.
6. **Pantalla completa**: hay un botón **opcional** de pantalla completa que solo aparece en dispositivos táctiles y solo si la API está disponible (`this.sys.game.device.fullscreen.available`). Se activa con `this.scale.startFullscreen()` dentro del gesto. Si no está disponible (por ejemplo, Safari en iPhone), no se muestra: el juego no depende de él.
7. **Testeabilidad** (ADR 0012): las decisiones con lógica se extraen a helpers puros sin Phaser (en `systems/`), por ejemplo el offset de levantar según el tipo de pointer y el cálculo del área de toque mínima según la escala. Así se prueban con Vitest. Las escenas solo los aplican.
8. **Pruebas e2e**: se agrega un **proyecto de Playwright de emulación móvil en horizontal** (por ejemplo, un Pixel o un iPhone en landscape, con `hasTouch: true` e `isMobile: true`). Corre un **subconjunto** del flujo: boot, elegir gato y nombre, entrar a la tienda, soltar y quitar una prenda, Showcase, y el overlay de "gira el teléfono" al emular vertical. Usa el mismo hook `window.__VISTE__`, con cero errores de consola.

## Alternativas consideradas
- **Rediseñar a vertical o hacer un layout adaptable**: duplica el layout de DressUp (pestañas, grid, gato grande y panel de capas), multiplica las pruebas y contradice "PC primero". El usuario quiere poder jugar en el celular, no un segundo juego.
- **Escalar con `RESIZE` y reacomodar la UI**: lo mismo, pero más caro. `FIT` ya da una imagen correcta en horizontal.
- **Tap para equipar en táctil**: rompe la mecánica central del ADR 0008 y crea dos formas de jugar. Se descarta: el drag se hace cómodo con el offset y los objetivos grandes.
- **Forzar la orientación con `screen.orientation.lock`**: solo funciona en pantalla completa y no en todos los navegadores. El overlay funciona siempre.
- **Detectar "es móvil" por user agent y ramificar el código**: es frágil y no se puede testear bien. El Pointer unificado y los helpers puros alcanzan.

## Consecuencias
- El juego se puede jugar en un celular en horizontal sin una segunda UI. La experiencia de PC no cambia, salvo por objetivos de toque un poco más generosos.
- El estado de press pasa a ser obligatorio en todo lo interactivo. La revisión del game-designer y el checklist de arte deben comprobar que nada se entiende solo con hover.
- Se agregan el overlay de orientación y los ajustes CSS y viewport de `index.html` y `public/style.css`, un botón opcional de pantalla completa, un campo de nombre en el DOM y un proyecto móvil en Playwright. La DoD suma "probado en celular horizontal".
- Riesgos:
  - **Tamaño**: en un teléfono chico la UI de DressUp queda apretada aunque cumpla los ~44 px. Hay que verla en un dispositivo real, no solo emulada.
  - **Teclado virtual**: en horizontal tapa casi toda la pantalla y puede disparar un resize. El campo de nombre debe seguir visible o el juego tiene que tolerar el cambio de tamaño sin romper el estado.
  - **Drag en e2e**: Playwright no tiene un gesto de arrastre táctil nativo (solo `tap`). El drag del proyecto móvil puede necesitar eventos de pointer o touch sintetizados. El offset táctil se cubre con el test unitario del helper puro.
  - **iOS Safari**: no tiene Fullscreen API para elementos que no son video y suele tener particularidades con `dvh` y los gestos del sistema. Por eso la pantalla completa es opcional y el layout no depende de ella.
  - **Audio**: en el móvil, el audio se desbloquea con el primer toque. Esto ya lo cubre el AudioPlugin (ADR 0009), pero hay que verificarlo en un dispositivo real.
