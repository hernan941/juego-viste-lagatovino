# 0010. Arquitectura: estructura oficial de Phaser

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
Faltaba una arquitectura de código explícita. El usuario pide usar la que recomienda Phaser. La plantilla oficial de Phaser Studio para Vite + TypeScript ([`phaserjs/template-vite-ts`](https://github.com/phaserjs/template-vite-ts), que también se genera con `npm create @phaserjs/game@latest`) define una estructura base. Además, las guías oficiales que vienen dentro del paquete `phaser` (`node_modules/phaser/skills/`, por ejemplo `scenes/SKILL.md`) recomiendan estos patrones:

- ciclo de vida `init(data)` → `preload()` → `create(data)` → `update(time, delta)`, con el estado reiniciado en `init()` y no en el constructor;
- datos entre escenas con `this.scene.start(key, data)`;
- estado compartido en `this.registry` (Data Manager global, con eventos `changedata-<key>`) y `this.data` solo para lo local de una escena;
- limpieza en `this.events.once('shutdown', …)`;
- escenas en paralelo con `this.scene.launch()`;
- orquestación siempre vía `this.scene` (ScenePlugin), nunca el SceneManager directo.

## Decisión
Partimos de la **plantilla oficial** y la extendemos con capas propias.

### Estructura
```
index.html                 # página que contiene el juego (plantilla)
public/
  style.css                # estilos de layout (plantilla)
  assets/                  # assets servidos: cats/, clothes/, ui/, bg/, audio/ (+ CREDITS.md)
vite/
  config.dev.mjs           # Vite dev (plantilla)
  config.prod.mjs          # Vite build (plantilla)
art/                       # SVG fuente (ADR 0006): cats/ (partes + pelajes), clothes/, ui/, bg/
src/
  main.ts                  # bootstrap de la app (plantilla)
  game/
    main.ts                # GameConfig (1280×720, FIT, CENTER_BOTH), lista de escenas y plugins globales
    constants.ts           # SceneKeys, TextureKeys, AudioKeys, Events, RegistryKeys, tokens de paleta
    EventBus.ts            # Phaser.Events.EventEmitter compartido (solo para eventos de juego entre escenas)
    scenes/                # Boot, Preloader, Title, CatSelect, ShopEntrance, DressUp, Showcase
    objects/               # GameObjects propios que extienden Phaser.GameObjects.Container:
                           #   Cat, ClothingItem, Button, Tabs, ItemGrid, LayersPanel
    plugins/               # Global Plugins (Phaser.Plugins.BasePlugin): AudioPlugin, SavePlugin
    systems/               # utilidades de escena sin estado propio: transitions.ts (fundido, iris)
    domain/                # TypeScript puro, SIN Phaser: types.ts, outfit.ts, combos.ts → Vitest
    data/                  # cats.json, clothes.json, combos.json + schema.ts (tipos y validación)
tests/                     # Vitest (domain y validación de data)
```

Las escenas siguen la convención de nombres de la plantilla (`Boot`, `Preloader`, `MainMenu`, `Game`…): un nombre corto sin el sufijo `Scene`, igual a su `SceneKey`.

### Capas y reglas de dependencia
```
            ┌──────────────────────────────────────────┐
            │ scenes/   orquestan: crean objects,      │
            │           escuchan input, llaman domain, │
            │           usan plugins y transitions     │
            └──────┬───────────┬───────────┬───────────┘
                   │           │           │
                   ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ objects/ │ │ plugins/ │ │ systems/ │   ← dependen de Phaser
            │ renderi- │ │ servicios│ │ transic. │
            │ zan      │ │ globales │ │          │
            └────┬─────┘ └────┬─────┘ └──────────┘
                 │            │
                 ▼            ▼
            ┌──────────────────────────┐   ┌───────────┐
            │ domain/  TS puro, testea-│◄──│ data/     │  JSON + schema,
            │ do, sin Phaser           │   │ validado  │  validado al cargar
            └──────────────────────────┘   └───────────┘
            constants.ts lo puede importar cualquiera
```

1. `domain/` **no importa Phaser** ni nada de `scenes/`, `objects/` o `plugins/`. Es lógica pura (equipar, reemplazar en el slot, quitar, detectar combos y serializar) y tiene tests.
2. `scenes/` **orquestan**: no contienen reglas del juego (las piden a `domain/`) ni dibujo detallado (lo delegan en `objects/`).
3. `objects/` **renderizan y animan**: reciben datos y emiten eventos, sin decidir reglas del juego. Cada uno se limpia en `destroy()`.
4. `plugins/` **dan servicios entre escenas**, registrados en `GameConfig.plugins.global` y accesibles desde cualquier escena:
   - `AudioPlugin`: efectos de sonido con variación de tono, silencio persistido y límite de sonidos simultáneos (ADR 0009);
   - `SavePlugin`: localStorage y, en el futuro, Supabase, detrás de una interfaz (ADR 0004).
5. `data/` se **valida al cargar** en `Preloader`: si un JSON es inválido, el juego falla pronto con un mensaje claro.
6. **Estado entre escenas**:
   - el gato elegido, su nombre y el outfit viven en `this.registry` (claves en `RegistryKeys`) y se persisten con `SavePlugin`;
   - los parámetros puntuales viajan con `scene.start(key, data)`;
   - **no se usan variables globales sueltas**.
7. **Claves como constantes**: escenas, texturas, sonidos, eventos y claves del registry se definen en `constants.ts`. No hay strings mágicos repartidos por el código.
8. Ninguna escena llama a `this.scene.start` directamente: siempre pasa por `systems/transitions.ts` (ADR 0007).

### Rutas que este ADR actualiza
| ADR | Antes | Ahora |
|---|---|---|
| 0003 | `src/domain/outfit.ts`, `src/data/*.json` | `src/game/domain/outfit.ts`, `src/game/data/*.json` |
| 0007 | `BootScene`, `PreloadScene`, `TitleScene`… | `Boot`, `Preloader`, `Title`, `CatSelect`, `ShopEntrance`, `DressUp`, `Showcase` |
| 0007 | `src/ui/transitions.ts` | `src/game/systems/transitions.ts` |
| 0009 | `src/services/audio.ts` | `src/game/plugins/AudioPlugin.ts` |
| 0004 | servicio de persistencia | `src/game/plugins/SavePlugin.ts` |

## Alternativas consideradas
- **Estructura propia desde cero** (la de la versión anterior de `CLAUDE.md`): funcionaba, pero se apartaba de la plantilla y de los ejemplos oficiales sin un motivo.
- **ECS** (bitecs o similar): sobredimensionado para un juego de vestir con pocas entidades.
- **Servicios como singletons de módulo** en vez de plugins: más simple, pero se salta el ciclo de vida de Phaser y complica los tests y la limpieza.

## Consecuencias
- Cualquiera que conozca la plantilla oficial de Phaser entiende el proyecto. La documentación y los ejemplos oficiales aplican sin traducción.
- Para crear el proyecto basta con generar la plantilla (F0) y agregar las carpetas extra.
- Las reglas de dependencia mantienen la lógica testeable y permiten migrar el guardado a Supabase cambiando solo `SavePlugin`.
- Riesgo: si el EventBus se usa para todo, el código se vuelve difícil de seguir. Solo se usa para eventos de juego entre escenas; dentro de una escena se usan `this.events` o los eventos del objeto.
