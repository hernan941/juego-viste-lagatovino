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

## Enmienda (2026-10-26): contrato de los controladores de DressUp
Esta sección documenta el contrato que implementó F11.13. No cambia lo anterior: concreta cómo se organizan las capas de DressUp como controladores.

### Qué es un controlador
Una feature del probador vive en su propio archivo en `src/game/objects/dressup/`, implementa `DressUpController` (`DressUpController.ts`) y se suma con **una línea** en `objects/dressup/controllers.ts`. La lista guarda **fábricas** (`DressUpControllerFactory = () => DressUpController`), no instancias: DressUp crea un `ControllerHost` nuevo en `init()` y cada visita estrena controladores, como pide el reinicio de estado del ADR 0010. El orden de la lista es el orden de `attach`.

```ts
interface DressUpController {
  readonly key: string;                       // única; su e2eState() va en el estado dressUp bajo esta clave
  attach(ctx: DressUpContext): void;          // una vez, al final de create(), con los objetos de la escena ya creados
  destroy(): void;                            // en shutdown, en orden inverso al de attach
  e2eState?(): unknown;                       // modo test: datos planos en coordenadas de juego
  e2eRoot?(): Record<string, unknown>;        // solo compatibilidad: claves en la raíz del estado dressUp
  isSettled?(): boolean;                      // false mientras anima o corre una secuencia
  beforeLeave?(action: 'finish' | 'change'): boolean | void | Promise<boolean>;
}
```

### Contexto (`DressUpContext`)
Lo que un controlador puede usar. Los objetos son los de la escena: un controlador los **decora**, nunca los reemplaza.
- `scene`: la escena DressUp; se escucha `scene.events` para los eventos de abajo.
- `catalog`, `anchors`, `catId`, `catName`.
- Objetos: `cat`, `grid`, `tabs`, `layersPanel`, `sign` (cartel con el nombre) y `rainbow` (Graphics detrás del gato).
- `hud`: Container por encima del cuarto y por debajo de la prenda arrastrada, para etiquetas y contadores. Lo destruye la escena.
- `hearts` y `sparkles`: los emisores de partículas de la escena. Se usa `explode`; no se crean emisores nuevos para una ráfaga.
- Consultas: `getOutfit()`, `isDragging()`, `isLeaving()` y `boundsOf(item)` (caja de los píxeles visibles de la textura, en caché).
- `showCategory(category)`: selecciona la pestaña en silencio y llena el grid.
- `leaveData`: lo que `beforeLeave` agrega a los datos que la escena manda a la siguiente (`go(scene, action, { gifted: [], ...leaveData })`).

### Eventos de escena (`DressUpEvents` en `constants.ts`)
| Evento | Argumentos | Cuándo |
|---|---|---|
| `ItemDropped` | `(item: ClothingDef)` | una prenda cae sobre el gato |
| `ItemRemoved` | `(item: ClothingDef)` | se quita una prenda (panel de capas o arrastre fuera) |
| `OutfitChanged` | `(outfit: Outfit, cause: 'drop' \| 'remove' \| 'restore' \| 'test')` | cambia el outfit (`OutfitCause`) |
| `ReadyPressed` | ninguno | se pulsa ¡Listo!, antes de `beforeLeave` |
| `CatChanged` | `(catId: string)` | justo después de `attach`, al entrar con un gato |

### Puntos de extensión
- **Celdas del grid**: `grid.addCellDecorator(fn)` registra una función que corre sobre cada celda que el grid construye (también al cambiar de pestaña) y en el acto sobre las que ya existen. Devuelve la función que la quita. `grid.refreshDecorations()` limpia las decoraciones y vuelve a aplicarlas (por ejemplo, tras una compra). El registro es `DecoratorRegistry` (`decorators.ts`, TS puro).
- **Pestañas**: `tabs.addTab(def)` agrega una pestaña al final y recentra la fila. Emite `TabSelect` con su id; DressUp solo llena el grid con las categorías del guardarropa, y la pestaña nueva la atiende su controlador.

### Ciclo de vida
- **Salir**: al pulsar ¡Listo! u "Otro gato", la escena marca `leaving`, emite `ReadyPressed` (solo con ¡Listo!) y consulta `beforeLeave` de cada controlador **en orden**. Si uno devuelve `false`, no se sale y no se consulta a los siguientes. Si devuelve una promesa, se espera; si resuelve `false`, no se sale. `true` o nada deja pasar. Si la escena ya no está activa cuando la promesa resuelve, no hace nada. Si no se sale, `leaving` vuelve a `false`.
- **Estado de test**: `ControllerHost.e2eState()` junta el `e2eState()` de cada controlador bajo su `key`, más las claves de `e2eRoot()` en la raíz. `mergeControllerState` lo mezcla con el estado de la escena, y **lo que reporta la escena siempre gana**. Los controladores nuevos usan solo `e2eState`.
- **`settled`**: el `settled` del hook exige además que `isSettled()` de cada controlador sea verdadero (sin el método cuenta como verdadero).
- **Limpieza**: en `shutdown`, `ControllerHost.destroy()` llama `destroy()` en orden inverso. Es idempotente. Cada controlador quita sus listeners, timers, tweens, decoradores y objetos propios.

### Reglas
- Los controladores **no se importan entre sí**. Se comunican por los eventos de escena, por `RegistryKeys.Progress` (`changedata-progress`, ADR 0017) y por los puntos de extensión.
- No editan `DressUp.ts`: una feature nueva es un archivo nuevo más una línea en `controllers.ts`. Si una feature necesita algo que el contexto no da, se amplía el contexto (cambio pequeño y revisado) en vez de acceder a privados de la escena.
- La parte sin Phaser (`runtime.ts`: `ControllerHost`, `mergeControllerState`; `decorators.ts`) se prueba con Vitest en `tests/integration/dressUpControllers.test.ts` (orden de attach y destroy, `beforeLeave` con `false` y promesas, `settled`, mezcla del estado e2e y decoradores). La lógica de juego de cada controlador va en `domain/` o en helpers puros, no en el controlador (ADR 0012).

### Riesgos
- `leaveData` es un objeto de la instancia de la escena y **no se reinicia en `init()`**. Hoy no hay fuga porque `SecretsController` escribe `gifted` en cada salida, pero un controlador que escriba una clave solo a veces la arrastraría a la visita siguiente. Mientras no se reinicie en `init()`, todo controlador que use `leaveData` debe escribir siempre sus claves.
- El orden de `controllers.ts` importa (attach, `beforeLeave` y destroy). Es un archivo caliente cuando varias features se integran en paralelo; el orden entre features lo fija `docs/roadmap.md`.

## Enmienda (2026-10-26): vuelta al Showcase y composición del modo foto
No cambia lo anterior. Concreta dos puntos que fijó la implementación.

### `Showcase` con `{ replay: false }`
- `backStep` (`domain/flow.ts`) agrega `replay: false` a `fromData` solo cuando `from` es `Showcase`.
- `Showcase.init(data)` lee `replay`. Solo un `false` explícito lo apaga; sin el dato, la escena califica como siempre.
- Con `replay: false`, la escena **no vuelve a calificar ni a pagar**: no llama a `rateLook`, no escribe `RegistryKeys.Progress` ni `RegistryKeys.LastRating` y no corre la ceremonia. Muestra el mismo gato con la calificación de `RegistryKeys.LastRating` y abre las salidas directo. El monedero muestra el saldo actual.
- Motivo: el progreso se aplica al abrir la pasarela (ADR 0017). Si se recalificara al volver del álbum, el mismo look pagaría dos veces.
- Tests:
  - unit en `tests/unit/flow.test.ts`: `backStep` agrega `replay: false` al volver al Showcase;
  - integración en `tests/integration/showcaseScene.test.ts`: con `replay: false` no califica, no paga y no repite la ceremonia.
  
  El estado de test del Showcase expone `replay`.

### `PhotoMode.getComposition()`
- `PhotoMode` expone `getComposition(): PhotoComposition`, que devuelve lo que está "sobre la mesa": fondo, marco y stickers con su posición y ángulo. El tipo y el saneo (`composition(state)`) están en `domain/photoComposition.ts` (TS puro).
- Es la única fuente para la foto guardada, para la receta del llavero (`KeychainRecipe.photo`, ADR 0021) y para el estado de test. Ni el llavero ni el hook leen los objetos de la escena.
