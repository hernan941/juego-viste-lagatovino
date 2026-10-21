# 0008. Plataforma PC e interacción solo arrastrando

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
El usuario define que el juego es para **PC** y que las prendas se ponen **solo arrastrando**.

## Decisión
- Resolución base de **1280 × 720** en horizontal, con `Phaser.Scale.FIT` y `CENTER_BOTH`. Se prueba también en 1920 × 1080.
- El input es con **mouse**. Todo lo interactivo tiene hover (escala, brillo y cursor de mano) y un estado de press.
- Equipar prendas: **solo drag & drop**. No hay clic ni doble clic para equipar.
  - Para que arrastrar perdone errores, la zona de soltar es **todo el cuerpo del gato con margen**.
  - Hay un **imán**: si se suelta cerca del gato, la prenda se acomoda sola a su ancla.
  - Durante el arrastre se resalta la zona válida.
- Quitar una prenda: con la ✕ del panel de capas o **arrastrándola fuera del gato**.
- El soporte táctil o móvil no es un objetivo, aunque Phaser lo da casi gratis.

## Alternativas consideradas
- Táctil primero o diseño adaptable a vertical: el usuario lo descarta.
- Clic para equipar: el usuario lo descarta.

## Consecuencias
- El diseño de la UI puede aprovechar el hover y una pantalla ancha.
- El drag & drop es la mecánica central y debe sentirse excelente: es la prioridad de pulido.
