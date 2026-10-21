# 0013. Movimiento reducido

- **Estado**: Aceptado
- **Fecha**: 2026-10-21

## Contexto
El juego está lleno de movimiento: squash del gato, sacudidas, flashes, irises con forma de corazón o huellita, lluvias de partículas y un idle en bucle (`art-direction.md` §8). A algunas personas eso les marea o les cansa. F9 pide respetar `prefers-reduced-motion` y ofrecer un botón propio que se guarde. Hay que decidir quién manda, dónde vive el estado y cómo se prueba, sin que cada escena invente su propia regla.

## Decisión
**Fuente de verdad: preferencia del jugador > navegador.**
- El save guarda `motion: 'auto' | 'reduce' | 'full'`, con `'auto'` por defecto.
  - `'auto'`: sigue a `matchMedia('(prefers-reduced-motion: reduce)')` y escucha su evento `change` en vivo.
  - `'reduce'` y `'full'`: el jugador eligió con el botón, y su elección **gana** sobre el navegador.
- El botón (junto al de silencio, en las mismas escenas) es binario: al pulsarlo guarda el contrario del estado efectivo actual (`'reduce'` o `'full'`). No hace falta volver a `'auto'` desde la UI en el MVP.
- `deserialize` trata un `motion` ausente o inválido como `'auto'`, así que **no se sube `SAVE_VERSION`**: los saves v1 siguen valiendo.

**Dónde vive** (mismo patrón que el silencio, ADR 0009 y ADR 0010):
- **Núcleo puro** `src/game/systems/motion.ts`, sin Phaser y testeable:
  - `resolveReducedMotion(pref, systemPrefersReduce): boolean`;
  - `nextMotionPref(reducedNow): 'reduce' | 'full'` para el botón;
  - `motionProfile(reduced)`: los números que usan las escenas (por ejemplo, `shake`, `squash`, `flash`, `particleFactor`, `tailSwing`, `transitionKind(kind)`).
- **Servicio global** `MotionPlugin` (Global Plugin en `PluginKeys.Motion`): lee el save, escucha `matchMedia`, escribe el valor efectivo en **`RegistryKeys.ReducedMotion`** (boolean) y guarda `motion` al cambiar. Es una capa delgada sobre el núcleo.
- Las escenas y los objetos **solo leen** `this.registry.get(RegistryKeys.ReducedMotion)` (o `motionProfile`) y escuchan `changedata-reducedMotion` si animan en bucle. Nadie llama a `matchMedia` fuera del plugin.
- `transitions.ts` consulta el registry en `transitionTo`/`transitionIn` y convierte cualquier iris en `'fade'`.

**Qué cambia con movimiento reducido** (el juego sigue respondiendo a todo toque; solo se calma):

| Elemento | Normal | Reducido |
|---|---|---|
| Cambio de escena | Fundido o iris (círculo, corazón, huellita) | Siempre fundido simple, misma duración |
| Soltar prenda | Squash y stretch fuerte | Pop suave de escala (≤ 3 %), sin stretch |
| Sacudidas (cámara, "no", inválido) | Sí | No: solo cambio de color o tinte |
| Flashes (foto, combo, arcoíris) | Destello blanco | Sin destello; fundido corto de alpha ≤ 0,3 |
| Partículas (corazones, brillos, confeti, nieve, pétalos) | Cantidad normal | ~25 % de la cantidad, sin giros rápidos |
| Idle del gato | Respira, parpadea y mueve la cola | Parpadea; cola quieta o con vaivén mínimo y lento |
| Preloader | Ovillo animado | Ovillo estático y barra de progreso |
| Rebotes `Back.easeOut` | Sí | `Sine.easeOut` sin sobrepaso |

El sonido no cambia (ADR 0009). La regla "nada aparece de golpe" sigue vigente: con movimiento reducido las cosas entran con fundido.

**E2E** (ADR 0012): el hook `window.__VISTE__` agrega
- `reducedMotion: boolean` (valor efectivo, leído del registry);
- `motionPref: 'auto' | 'reduce' | 'full'`;
- `setMotionPref(pref)`, solo en modo test, como `setMuted`.

Playwright emula el navegador con `test.use({ reducedMotion: 'reduce' })` o `page.emulateMedia({ reducedMotion: 'reduce' })` (este último sirve para probar el cambio en vivo).

## Criterios de prueba
- **Unit (TDD, Vitest)** de `systems/motion.ts` con la tabla completa de `resolveReducedMotion` (3 preferencias × 2 estados del navegador), `nextMotionPref` y `motionProfile`. Además, `saveCore` con `motion` ausente, inválido y válido. La cobertura en `systems/` y `plugins/` es **≥ 80 %** (umbral del ADR 0012).
- **E2E**:
  1. con `reducedMotion: 'reduce'` y el save limpio, `__VISTE__.reducedMotion` es `true` y un cambio de escena con iris termina como fundido;
  2. el botón invierte el estado, gana sobre el navegador y **persiste al recargar** (entra en el test de persistencia total, punto (e));
  3. con `'auto'`, `page.emulateMedia` cambia el estado en vivo;
  4. el flujo completo pasa en modo reducido con cero errores de consola.
- El game-designer revisa a ojo que el modo reducido "se siente bien" y que nada se ve roto.

## Alternativas consideradas
- **Solo `prefers-reduced-motion`**: no deja elegir a quien no sabe configurar el sistema, y F9 pide un botón.
- **Solo el toggle propio**: ignora una preferencia de accesibilidad que el jugador ya declaró.
- **Que el navegador gane siempre**: impide que alguien con el SO en "reducir" vea el juego completo si lo prefiere.
- **Meterlo en `SavePlugin` o `AudioPlugin`**: mezcla responsabilidades. Un plugin chico y aparte, con su núcleo puro, se prueba mejor.
- **Que cada escena consulte `matchMedia`**: duplica la regla y deja listeners colgados.

## Consecuencias
- Hay un solo lugar con la regla, y las escenas consultan un boolean y un perfil de números.
- Cada efecto con movimiento fuerte debe pasar por `motionProfile`. Si se agrega uno nuevo, hay que acordarse de hacerlo; el game-designer lo revisa en F9.
- Se agregan `RegistryKeys.ReducedMotion`, `PluginKeys.Motion`, un botón en la UI y el campo `motion` en `SaveData`, sin migración.
- Riesgo: las animaciones en bucle que ya existen tienen que reaccionar al cambio en vivo, o como mínimo al entrar a la escena siguiente. Lo mínimo aceptable es que se apliquen al siguiente `create`.
