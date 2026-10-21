# 0007. Flujo de escenas y transiciones

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
El usuario quiere un MVP jugable con un inicio, la elección del gato y la **entrada a la tienda** antes de vestir, con transiciones suaves. Además, la diversión está por encima de la funcionalidad.

## Decisión
Flujo de escenas:

```
BootScene → PreloadScene → TitleScene → CatSelectScene → ShopEntranceScene → DressUpScene ⇄ ShowcaseScene
```

| Escena | Qué ocurre |
|---|---|
| `PreloadScene` | Barra de carga temática (un ovillo que se desenrolla) |
| `TitleScene` | Logo animado, gatitos que se asoman y botón **"Iniciar"** |
| `CatSelectScene` | Galería de gatos; el elegido salta y dice miau, y aparece el botón "¡Este!" |
| `ShopEntranceScene` | El gato camina hasta la boutique, suena la campanita, se abre la puerta y la cámara hace zoom hacia dentro. Se puede hacer clic para saltar la animación |
| `DressUpScene` | Probador dentro de la tienda; arrastrar y soltar la ropa |
| `ShowcaseScene` | "¡Listo!": el gato posa frente al espejo con brillitos y se puede volver a vestir o cambiar de gato |

- **Transiciones** centralizadas en `src/ui/transitions.ts`: fundido e iris con máscara en forma de huellita o corazón, de 400 a 600 ms. Ninguna escena llama a `scene.start` sin pasar por una transición.
- El gato elegido y su outfit viajan entre escenas por un servicio de estado (no por variables globales) y se persisten según el ADR 0004.

## Alternativas consideradas
- Ir directo a vestir sin portada ni tienda: más rápido de hacer, pero pierde fantasía y diversión, que es la prioridad del usuario.
- Una sola escena con estados internos: más difícil de mantener y limpiar.

## Consecuencias
- Hay más escenas que construir, pero cada una es simple y se puede pulir por separado.
- La entrada a la tienda prepara el terreno para la tienda futura con monedas.
