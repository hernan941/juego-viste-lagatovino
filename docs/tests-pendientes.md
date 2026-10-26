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
Estos tests unit se reapuntan a los datos reales una vez integrado F11.10:
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
