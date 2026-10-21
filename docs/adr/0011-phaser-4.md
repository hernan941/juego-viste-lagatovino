# 0011. Usar Phaser 4 en vez de Phaser 3

- **Estado**: Aceptado
- **Fecha**: 2026-10-20
- **Reemplaza**: la elección de versión del ADR 0002 (el resto de ese ADR sigue vigente)

## Contexto
El ADR 0002 eligió Phaser 3 y dejó dicho que migrar a Phaser 4 requería un ADR nuevo. Al revisar la arquitectura oficial (ADR 0010) se verificó que:

- **Phaser 4 es la versión estable**: v4.0.0 "Caladan" salió el 10 de abril de 2026 y la versión actual es **v4.2.1 "Giedi"**, del 9 de julio de 2026 ([phaser.io/download/stable](https://phaser.io/download/stable)).
- La **plantilla oficial** `phaserjs/template-vite-ts` ya depende de `phaser` 4.x, junto con Vite 6 y TypeScript 5.7 ([package.json](https://github.com/phaserjs/template-vite-ts/blob/main/package.json)).
- El paquete `phaser` 4 trae **guías oficiales para agentes** en `node_modules/phaser/skills/`: scenes, tweens, input, filters-and-postfx, v3-to-v4-migration, etc.

Todavía no hay código, así que no hay costo de migración.

## Decisión
Usaremos **Phaser 4** en la última versión 4.x estable, fijada en `package.json` (rango `~4.2`), partiendo de la plantilla oficial.

- Se consultan primero las guías de `node_modules/phaser/skills/` y la documentación de la v4, no los tutoriales de Phaser 3.
- Hay que tener en cuenta los cambios de la v4 que nos afectan ([guía de migración](https://unpkg.com/phaser@4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md)):
  - las **máscaras y los FX pasan a ser *filters*** (`BitmapMask` → filtro Mask), lo que aplica a la transición "iris" (ADR 0007) y a los brillos;
  - `setTintFill()` → `setTint()` + `setTintMode()`;
  - `Geom.Point` → `Vector2`;
  - `Mesh` y `Plane` fueron eliminados.
- El modo de escala nuevo `Phaser.Scale.EXPAND` queda disponible, pero seguimos con `FIT` (ADR 0008).

## Alternativas consideradas
- **Seguir con Phaser 3**: tiene más tutoriales de terceros, pero no es lo que usa la plantilla oficial, y empezar hoy en la v3 implicaría migrar más adelante.

## Consecuencias
- Estamos alineados con la plantilla y los ejemplos oficiales, con el renderer nuevo y con guías oficiales legibles por los agentes.
- Muchos tutoriales y snippets de internet son de Phaser 3. El `phaser-code-writer` debe verificar las APIs contra la v4 (especialmente máscaras, FX y tint).
- Plugins de terceros como `rexUI` pueden no ser compatibles con la v4. Hay que verificarlo antes de adoptar cualquiera.
