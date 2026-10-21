# 0002. Engine: Phaser 3 + TypeScript + Vite

- **Estado**: Aceptado (la versión de Phaser fue reemplazada por el ADR 0011: Phaser 4)
- **Fecha**: 2026-10-20

## Contexto
Es un juego 2D para navegador. El MVP es de vestir gatos: muchas capas de sprites, drag & drop y UI de pestañas y grids. La visión a futuro incluye que el gato **camine** hasta una tienda, con escenas, cámara y quizás tilemaps. Hay que desplegarlo en la web y, más adelante, conectarlo a una base de datos.

## Decisión
Usaremos **Phaser 3** con **TypeScript en modo strict**, empaquetado con **Vite**, y **Vitest** para los tests de la lógica pura.

## Alternativas consideradas
- **React + DOM/CSS**: muy cómodo para un MVP hecho de menús y capas, pero se queda corto cuando el gato camine (mapa, cámara, animaciones) y obligaría a migrar. Queda como alternativa válida si el juego resultara ser solo menús.
- **Kaplay**: más simple, pero con menos ecosistema y herramientas de UI y escenas.
- **Pygame (+pygbag)**: el despliegue web es incómodo.
- **Godot (export HTML5)**: builds pesados y un lenguaje distinto de la web y la BD.

## Consecuencias
- Phaser trae escenas, input (drag & drop incluido), tweens, partículas, audio, cámara, tilemaps y escalado responsive.
- La UI compleja (scroll de grids, pestañas) se construye a mano o con plugins como `rexUI`. Hay que evaluarlo antes de adoptarlo.
- Un mismo lenguaje (TS) para el frontend y el futuro backend o Supabase.
- Se usa Phaser 3 (estable, con mucha documentación). Una migración a Phaser 4 requeriría un ADR nuevo.
