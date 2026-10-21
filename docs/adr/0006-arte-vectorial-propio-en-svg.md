# 0006. Arte vectorial propio en SVG

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
El usuario no tiene arte propio y pide que nosotros dibujemos los gatos y la ropa, con **una sola estética coherente** en todo el juego (`docs/art-direction.md`). Hay 12 gatos comunes y unas 44 prendas, y todos deben encajar en la plantilla común (ADR 0003). Los gatos temáticos de la referencia no se usan.

## Decisión
- El arte se crea como **SVG escritos a mano** y versionados en `art/` (gatos, ropa, UI y fondos), siguiendo los tokens de color y trazo de `docs/art-direction.md`.
- Todos los SVG de gatos y prendas usan el **mismo `viewBox` de 512 × 512** y las anclas de `cats.json`.
- Los gatos se construyen por **partes compartidas** (silueta, cara y expresiones) más una **capa de pelaje** por gato (colores y patrones). Así la forma es idéntica entre gatos y solo cambia el pelaje.
- Phaser carga los SVG con `this.load.svg(key, url, { scale })` y los rasteriza al tamaño necesario. Si el rendimiento lo exige, más adelante se pasa a PNG o atlas generados en el build, sin cambiar el contrato de datos.
- Cada asset pasa el checklist de `docs/art-direction.md` §10.

## Alternativas consideradas
- **PNG dibujados por un artista**: no hay artista disponible ahora.
- **Arte generado por IA en raster**: resulta difícil mantener la misma silueta, el mismo trazo y las mismas anclas entre decenas de piezas.
- **Dibujar con Phaser Graphics en código**: mezcla arte con lógica y es más difícil de iterar.

## Consecuencias
- Se obtiene consistencia garantizada, archivos livianos, escalado nítido en cualquier pantalla e iteración barata (por ejemplo, cambiar un color de la paleta).
- El estilo debe ser simple (vector plano), lo cual encaja con la referencia.
- La rasterización de muchos SVG en la carga puede ser lenta en PCs modestos. Se mide y, si hace falta, se generan atlas en el build.
