# 0017. Guardado v2 y reglas de juego en JSON

- **Estado**: Aceptado
- **Fecha**: 2026-10-25
- **Amplía**: ADR 0004 (persistencia; la implementación sigue siendo localStorage y el 0004 conserva su estado), ADR 0010 (estado entre escenas y validación de `data/`) y ADR 0003 (campos nuevos del catálogo).
- **Incluye**: la decisión que el diseño numeraba como 0020 (reglas de juego data-driven). El número 0020 queda sin uso.

## Contexto
El guardado v1 (`SAVE_VERSION = 1`) guarda la sesión (gato, nombre, outfit), los secretos, el silencio y el movimiento reducido (ADR 0013). La segunda etapa (ADR 0015) suma botones, inventario, tintes, gustos descubiertos, récords, firmas de looks recientes y llaveros. Además, toda la economía (precios, pagos, umbrales de estrellas, gustos) tiene que poder ajustarse sin tocar código, y un cambio de números que rompa el ritmo del juego tiene que detectarse con un test.

Hoy `SAVE_KEY` se calcula desde `SAVE_VERSION` (`viste-lagato:save:v1`). Si solo se sube la versión, el juego buscaría otra clave y el save v1 se perdería sin migrar.

## Decisión

### 1. Forma del guardado v2
`SAVE_VERSION` pasa a 2. Tipos en `domain/types.ts` (TS puro):

```ts
type Stars = 1 | 2 | 3 | 4 | 5;
/** 'love:<tag>' | 'dislike:<tag>' | 'favorite' | 'color' */
type TasteKey = string;

interface SaveData {
  version: 2;
  // Sesión (como v1, escritura con debounce)
  catId: string | null;
  catName: string;
  outfit: Outfit;
  itemDye: Record<string, string>;      // itemId → dyeId; el color queda en la prenda, no en el slot (ADR 0018)
  // Preferencias (como v1)
  muted: boolean;
  motion: MotionPref;
  // Progreso (escritura inmediata)
  progress: StoredProgress;
}

interface StoredProgress {
  wallet?: number;                       // ausente = startWallet de economy.json
  owned: string[];                       // prendas compradas (no incluye iniciales ni secretas)
  dyesOwned: string[];                   // frascos comprados (no incluye los iniciales)
  secrets: string[];                     // combos ganados (en v1 estaba en la raíz)
  tastesFound: Record<string, TasteKey[]>;   // por catId
  bestStars: Record<string, Stars>;          // por catId
  ratedLooks: Record<string, string[]>;      // por catId, las últimas 3 firmas (la más nueva al final)
  keychains: Record<string, KeychainRecipe>; // por catId, una receta (ADR 0021)
  albumSeen: string[];                   // entradas del álbum ya vistas (para el ✦ de "nuevo")
}
```

- **Se guardan solo hechos** (ids, números y recetas), nunca imágenes ni datos derivables.
- **Se derivan y no se guardan**: la propiedad de las prendas iniciales (`starter` en `clothes.json`) y de las secretas (de `secrets`), los frascos iniciales, los sets completos, el porcentaje del álbum, los desbloqueos del modo foto (`photoUnlocks(progress)`) y la argolla del llavero (`ringFor(stars)`). Así, cambiar qué es inicial o qué desbloquea un set es una línea de JSON, sin migración.
- **Clave de almacenamiento fija**: `SAVE_KEY` deja de depender de `SAVE_VERSION` y se queda en el literal actual `viste-lagato:save:v1`. El "v1" es parte del nombre histórico; la versión de los datos vive dentro del JSON. No hay que mover claves ni dejar saves huérfanos.

### 2. Migración v1 → v2
En `plugins/saveCore.ts`, `migrations[1]` (pura, sin catálogo):
- copia `catId`, `catName`, `outfit`, `muted` y `motion`;
- `itemDye: {}`;
- `progress`: `secrets` sale de la raíz; `owned` = los ids del outfit guardado (lo que el jugador llevaba puesto se conserva); el resto vacío y **sin `wallet`**.

Luego, una función de dominio `progressFromSave(save, catalog, rules) → Progress` (como `sessionFromSave`) lo valida contra el catálogo: descarta ids que no existen, quita de `owned` las iniciales y las secretas (se derivan), limita `ratedLooks` a 3, acota `bestStars` a 1–5, descarta recetas inválidas y pone `wallet = rules.startWallet` si falta o no es un entero ≥ 0. Un save v1 queda con 100 botones, sus prendas puestas y sus secretos, como pide el diseño. `deserialize` sigue sin lanzar nunca: un campo roto vuelve a su valor por defecto.

`itemDye` se valida igual al restaurar la sesión: la prenda existe y es `dyeable`, y el frasco existe. Un tinte sin pagar se conserva (probar es gratis), igual que una prenda sin pagar en el outfit; la caja de ¡Listo! los resuelve (ADR 0019).

### 3. Dónde vive el estado y cuándo se escribe
- **Sesión** (`catId`, `catName`, `outfit`, `itemDye`): en `this.registry` (`RegistryKeys.ItemDye` es nueva) y se guarda con el **debounce** de hoy.
- **Progreso**: un valor inmutable `Progress` en `this.registry` (`RegistryKeys.Progress`). Las escenas calculan el nuevo progreso con funciones puras de `domain/` y hacen `registry.set`. `SavePlugin` escucha `changedata-progress` y **escribe al instante**, sin debounce: una compra, un gusto descubierto o un llavero colgado sobreviven a una recarga inmediata. `unlockSecret` pasa a ser un caso de este mismo camino.
- Cada escritura lee lo guardado y reemplaza **solo su parte** (sesión o progreso), como ya hace `SaveService.flush`. Así no se pisan.
- El monedero y cualquier HUD escuchan `changedata-progress` (data-manager oficial) y se limpian en `shutdown`.
- **Calificar aplica el progreso antes de animar**: al confirmar ¡Listo!, DressUp calcula `scoreLook` y `applyRating(progress, result) → { progress, events[] }`, guarda el progreso, deja el resultado en `RegistryKeys.LastRating` y pasa `{ rating, events }` al Showcase. La ceremonia solo **reproduce** `events`; recargar o volver nunca paga dos veces.

### 4. Reglas de juego en JSON (antes 0020)
Archivos nuevos en `src/game/data/`, validados en `schema.ts` al cargar (Preloader). Si algo no cuadra, el juego falla pronto con un mensaje en español que nombra la ruta exacta:

| Archivo | Contenido | Validaciones cruzadas |
|---|---|---|
| `economy.json` | `startWallet`, `prices` por nivel y de los frascos, `payout` (por estrellas, factor de "casi igual", propina, ventana de novedad = 3), `milestones` (3★, 4★, 5★), `discoveryBonus`, `comboBonus`, `scoring` (pesos, topes, umbrales de estrellas y tags ignorados) | umbrales crecientes; pagos ≥ 0 y crecientes con las estrellas |
| `dyes.json` | `id`, `name`, `hex`, `starter?` (el precio sale de `economy.json`) | ids únicos; hex válido; al menos un inicial. El **agua** no es un frasco: es una herramienta fija de la UI que borra el tinte |
| `sets.json` | `id`, `name`, `requires: { items?, dyes?, combos?, keychains?: { count, minStars } }`, `reward` (ids de `photo.json`) | todo id existe; ninguna prenda requerida es secreta |
| `photo.json` | `backgrounds`, `frames`, `stickers`, `poses` (`id`, `texture`, `unlock: "starter" \| { set } \| { albumPct } \| { firstFiveStar }`) y `keychain` (argollas por estrellas, borde y barniz) | el set del `unlock` existe; hay al menos lo inicial que pide el diseño |
| `brand.json` | `judge` y `seller` (`name`, `texture?`), `shopSign`, `packagingLine`, `reverseLine`, `signature` | textos no vacíos; la textura, si existe, está en el manifiesto |
| `cats.json` | suma `prefs: { loves: [tag, tag], dislikes: [tag], favoriteItem, favoriteDye, hint }` | los tags existen en alguna prenda visible; el favorito existe y no es secreto; el color existe en `dyes.json` |
| `clothes.json` | suma `tier: "basica" \| "linda" \| "lujo"`, `starter?: true`, `dyeable?: true` | toda prenda visible tiene `tier` o `starter` (no ambos); las secretas no tienen ninguno; las iniciales completan al menos un combo |

- **Personajes**: los textos de `domain/copy.ts` usan marcadores (`{judge}`, `{seller}`) que se llenan con `brand.json`. Si el usuario no autoriza a Kofi o a Catalina, se cambia el JSON.
- El `Catalog` validado crece con estos archivos y sigue en `RegistryKeys.Catalog`. Ningún número de balance queda escrito en el código.
- **Guardianes del ritmo** (Vitest, en `tests/unit/`): `bestPossibleStars(cat, catalog) === 5` para los 12 gatos y ≥ 3★ solo con las iniciales; y `balance.test.ts` con el **jugador modelo** del diseño (50 % de lo comprable entre las sesiones 3 y 5, 100 % en ≤ 12). Si alguien cambia un precio y rompe el ritmo, el test falla.

### 5. Lógica pura y pruebas (ADR 0012)
- `domain/`: `progress.ts` (`applyRating`, `progressFromSave`), `economy.ts`, `score.ts`, `tastes.ts`, `album.ts`, `keychain.ts`. Cobertura ≥ 90 %.
- `plugins/saveCore.ts`: tabla de migración v0 → v1 → v2, campos rotos, versión futura y save vacío. Cobertura ≥ 80 %.
- **e2e**: el hook `window.__VISTE__` suma `wallet`, `owned`, `tastesFound`, `lastRating`, `keychains`, y las acciones de test `grant(ids)`, `setWallet(n)` y `dye(itemId, dyeId)` (como `wear`, solo en modo test). Un spec de migración siembra un save v1 en `localStorage`, recarga y comprueba el v2. `reset()` borra también el progreso.

### 6. Compatibilidad con Supabase (ADR 0004)
La forma se traduce directo a tablas relacionales cuando llegue el backend: `players` (wallet, gato actual, preferencias), `inventory` (`player`, `kind: item | dye`, `id`), `cat_progress` (`player`, `cat`, `best_stars`, `tastes_found`, `rated_looks`), `keychains` (`player`, `cat`, `recipe jsonb`) y `secrets`. Solo cambia `SavePlugin`; las escenas y el dominio no se enteran.

## Alternativas consideradas
- **Guardar el progreso con debounce, como la sesión**: una compra justo antes de cerrar la pestaña podría perderse. Las escrituras de progreso son pocas, así que se hacen al instante.
- **Guardar desbloqueos y sets**: duplica la verdad y obliga a migrar cada vez que cambia una regla. Se derivan.
- **Nueva clave `:v2` con lectura de respaldo de `:v1`**: más código y dos claves vivas para nada. La versión ya va dentro del JSON.
- **Que la migración rellene la billetera**: `saveCore` tendría que leer `economy.json`. La billetera ausente se resuelve en el dominio, que ya recibe las reglas.
- **Un ADR aparte para las reglas en JSON (0020)**: la validación de las reglas y la del save comparten tipos y pruebas; juntas se leen mejor.
- **zod u otra librería de schema**: el schema escrito a mano ya funciona, no suma dependencias y da mensajes en español.

## Consecuencias
- Agregar una prenda, un frasco, un set o un sticker sigue siendo editar JSON; ajustar la economía también, y el test de balance avisa si se rompe el ritmo.
- `SaveData` deja de ser plano: `toSaveData` y `SaveService` escriben su parte sin pisar la otra.
- El progreso crece poco (recetas de unos cientos de bytes por gato), lejos del límite de localStorage.
- El ADR 0004 sigue "Propuesto" hasta que el usuario lo confirme; este ADR no cambia esa parte.
- Riesgos: la migración debe probarse con saves reales de v1 (el de F7 a F10); el progreso se trata siempre como inmutable (un objeto nuevo en cada cambio): mutarlo en sitio saltaría el guardado y el HUD.
