# 0019. Flujo de escenas v2

- **Estado**: Aceptado
- **Fecha**: 2026-10-25
- **Amplía**: ADR 0007 (flujo y transiciones) y ADR 0010 (lista de escenas). Lo demás de ambos sigue vigente: toda salida pasa por `systems/navigate.ts` y `transitions.ts`.

## Contexto
La segunda etapa (ADR 0015) suma dos pantallas, el **álbum** y el **modo foto**, convierte el Showcase en la **pasarela** donde el juez califica y agrega una **caja** para pagar al pulsar ¡Listo!. El álbum se abre desde varias escenas y tiene que volver a la de origen sin perder el estado (por ejemplo, la pestaña y el scroll de DressUp). Hay que decidir qué es escena y qué es capa, y cómo se vuelve.

## Decisión

### Escenas
```
Boot → Preloader → Title → CatSelect → ShopEntrance → DressUp ⇄ Showcase → PhotoMode
DressUp, Showcase ──── "Otro gato" ─────────► CatSelect
PhotoMode ──────────── "Seguir vistiendo" ──► DressUp
Title, DressUp, Showcase ── "Mi álbum" ──► Album ── "Volver" ──► escena de origen
PhotoMode ── [Colgarlo] ──► Album (pestaña Colgador) ── "Volver" ──► DressUp
```

| Escena | Rol |
|---|---|
| `Showcase` | **Pasarela**: reproduce la ceremonia del juez con `{ rating, events }` que recibe en `init(data)` (el progreso ya se aplicó, ADR 0017). Salidas: modo foto, seguir vistiendo, otro gato y álbum. Ya no descarga la foto. |
| `PhotoMode` (nueva) | Modo foto (S6) y transformación en llavero (S8, ADR 0021). Recibe el look y la calificación por `scene.start(key, data)`; si llega sin datos válidos (por ejemplo, con `?start=`), usa la sesión y `RegistryKeys.LastRating`. |
| `Album` (nueva) | Cuaderno con 5 pestañas, incluida la del colgador. Recibe `{ from, fromData?, tab?, hang? }`. |

`SceneKeys.Album` y `SceneKeys.PhotoMode` se suman a `constants.ts` y a la lista de `GameConfig`. Cada escena reinicia su estado en `init(data)` y limpia listeners, timers y tweens en `shutdown`.

### Capas dentro de una escena (no son escenas)
- La **caja** de ¡Listo! (S3), la **hoja de compra** de una etiqueta y la **ficha del gato** son Containers en `objects/` dentro de DressUp. Bloquean el input de debajo con una cortina interactiva y se cierran con tween.
- El **llavero en grande** del colgador es una capa dentro de Album.
- Motivo: no hay que pasar estado de ida y vuelta ni repintar la escena de abajo, y un modal no necesita su propio ciclo de vida.

### Tabla de flujo (`domain/flow.ts`)
Acciones nuevas: `album`, `back`, `photo`, `hang`.

| Desde | Acción | Hacia | Transición |
|---|---|---|---|
| Title, DressUp, Showcase | `album` | Album | iris ✦ (`star`, nueva en `irisShapes.ts`) |
| Album | `back` | la escena de `from` | fundido |
| Showcase | `photo` | PhotoMode | `flash` (fundido crema, nueva) |
| Showcase | `keepDressing` / `change` | DressUp / CatSelect | como hoy |
| PhotoMode | `keepDressing` | DressUp | corazón |
| PhotoMode | `hang` | Album con `{ from: DressUp, tab: 'colgador', hang: catId }` | iris ✦ |

- **Volver**: `back` es la única acción con destino dinámico. Una función pura `backStep(data)` lee `from` y lo acepta solo si está en la lista permitida (`Title`, `DressUp`, `Showcase`); si no, vuelve a `Title`. Lo prueba Vitest.
- **El billete de vuelta**: quien abre el álbum pasa `fromData` (por ejemplo, DressUp manda `{ tab, scroll }`) y Album lo devuelve tal cual. DressUp ya lo lee en `init(data)`.
- **Volver al Showcase** no repite la ceremonia: Album devuelve `{ replay: false }` y el Showcase muestra el estado final con `RegistryKeys.LastRating`.
- **Después de colgar** un llavero, el álbum vuelve a DressUp ("seguir vistiendo"), no a PhotoMode: el modo foto necesita un look recién calificado.
- Con movimiento reducido, `star` y `flash` se convierten en fundido (ADR 0013).

### Pruebas (ADR 0012)
- Unit: la tabla de flujo completa, `backStep` con `from` válido, ausente y no permitido.
- e2e: `?start=Album` y `?start=PhotoMode` en modo test; ida y vuelta al álbum desde DressUp conserva la pestaña y el scroll; los specs `album`, `photomode` y `keychain`; ciclos de escena sin fugas (`__VISTE__.perf`).

## Alternativas consideradas
- **Album como escena en paralelo** (`scene.launch` encima de la actual, con la de abajo en pausa): vuelve sin recrear la escena, pero deja dos escenas vivas, complica el input y la limpieza, y el iris de transición no encaja. Se puede reconsiderar si la vuelta a DressUp se siente lenta.
- **La caja como escena aparte**: obliga a serializar el carrito y el outfit en curso y a recrear DressUp al volver.
- **Una tienda como escena propia**: descartada por el diseño (el probador es la tienda, ADR 0015).
- **Guardar la escena de origen en el registry**: es estado global para algo puntual; viaja mejor como parámetro de `scene.start`.

## Consecuencias
- Dos escenas nuevas, cada una simple y con una sola responsabilidad. DressUp no crece en escenas, pero sí en capas: se organizan como controladores en `objects/` (`PriceTags`, `CheckoutSheet`, `TasteReactions`, `DyeTab`), para que las features se integren en paralelo con `isolation: worktree`.
- La transición `flash` y el iris ✦ se suman a `TRANSITION_KINDS`.
- Riesgo: ir y volver del álbum recrea DressUp (gato, grid y pop escalonado); si se siente pesado, se acorta el pop al volver o se evalúa la alternativa en paralelo.
