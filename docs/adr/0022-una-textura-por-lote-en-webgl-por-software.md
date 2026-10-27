# 0022. Una textura por lote en WebGL por software

- **Estado**: Aceptado
- **Fecha**: 2026-10-26
- **Amplía**: ADR 0011 (Phaser 4 y su renderer) y ADR 0012 (modo test). No cambia nada de ambos.

## Contexto
Durante A4 aparecieron cortes en franjas sobre textos, estrellas, números e imágenes en Chromium headless. Ese navegador dibuja WebGL por software con SwiftShader, que es el renderer del e2e. El problema no depende de la rotación ni de `Text`: aparece cuando muchas texturas animan a la vez (por ejemplo, las notas de la pasarela) y se debe al **batching multitextura** de Phaser 4 sobre un WebGL por software. Con una textura por lote nunca aparece. Con una GPU real no se reprodujo. Los mismos síntomas pueden darse en otros renderers por software (llvmpipe en Linux, "Microsoft Basic Render Driver" en Windows), que algunos jugadores tienen sin saberlo.

## Decisión
Usaremos `render.maxTextures: 1` **solo** en modo test (`import.meta.env.MODE === 'test'`) o cuando el renderer WebGL sea por software. Con una GPU real se mantiene el valor por defecto de Phaser.

- La lógica vive en `src/game/systems/renderConfig.ts`, que es TS puro y se prueba con Vitest:
  - `isSoftwareRenderer(name)`: busca `swiftshader|llvmpipe|software|basic render` en el nombre, sin distinguir mayúsculas;
  - `renderOptions(mode, gpuRenderer)` devuelve `{ render: { maxTextures: 1 } }` o `{}`;
  - `readGpuRenderer(document)` lee `UNMASKED_RENDERER_WEBGL` de la extensión `WEBGL_debug_renderer_info` en un canvas suelto. Si no hay WebGL o falta la extensión, devuelve `null` (se trata como GPU real).
- `src/game/main.ts` mezcla el fragmento en el `GameConfig` al crear el `Game`. No hay ningún otro punto que toque el renderer.

## Alternativas consideradas
- **`maxTextures: 1` siempre**: es lo más simple, pero sube los draw calls en las GPU reales, que no tienen el problema. Eso pesa sobre todo en el celular (ADR 0014).
- **Solo en modo test**: el e2e queda limpio, pero los jugadores con renderer por software verían los cortes.
- **Forzar Canvas en vez de WebGL**: perdemos los filtros de Phaser 4 (ColorMatrix del llavero, ADR 0021) y el `DynamicTexture` con ERASE.
- **Lanzar Chromium del e2e con GPU (`--use-gl=…`)**: depende de la máquina y no protege a los jugadores con renderer por software.

## Consecuencias
- El e2e y los jugadores con renderer por software ven lo mismo y sin cortes. Las GPU reales conservan el batching completo.
- Todo lo que se mide en headless (los tiempos del llavero en el ADR 0021 y del teñido en el ADR 0018) corresponde al **peor caso**: software y una textura por lote. Esos números no sirven como medida de producción; hay que confirmarlos con GPU real en F21.
- Cualquier efecto se verifica en los dos modos. El precedente es el barniz del llavero, que no se recortaba con el filtro Mask y `maxTextures: 1` (ADR 0021, §1).
- Riesgos: la detección depende del nombre que da el driver. Si un navegador oculta `WEBGL_debug_renderer_info` (por privacidad), un renderer por software no se detecta y vuelven los cortes, aunque el juego sigue andando. Si aparece un renderer por software con otro nombre, se suma al patrón con su test.
