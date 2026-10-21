# 0012. Desarrollo guiado por tests (TDD)

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
El usuario pide usar **TDD**. El juego tiene mucha lógica que no es dibujo: equipar y reemplazar prendas por slot, orden z, combinaciones y secretos, validación del catálogo, guardado y migraciones, y reglas de audio. Si esa lógica falla, el juego se rompe de formas difíciles de ver jugando. A la vez, el game feel (animaciones, juice) no se puede verificar bien con tests automáticos.

## Decisión
- Usaremos **TDD con el ciclo rojo → verde → refactor** para toda la lógica que no es render:
  - `src/game/domain/`: outfit, slots, combos y secretos;
  - validación de `src/game/data/`: el schema de cats, clothes y combos;
  - lógica de los plugins: en `SavePlugin`, serializar y migrar; en `AudioPlugin`, el silencio, la variación de tono y el límite de sonidos simultáneos;
  - helpers puros de `systems/` y de los objetos: el cálculo del imán al soltar, las hit zones y el orden z.
- **Patrón**: núcleo funcional y capa imperativa delgada. La lógica se extrae a funciones o clases puras **sin Phaser**, para que se pueda testear. Las escenas, los objetos y los plugins solo conectan esa lógica con Phaser.
- **Escenas y GameObjects**: se aplica TDD donde sea razonable, con tests de integración ligeros (Phaser en modo `HEADLESS` con jsdom o happy-dom, o mocks del API de Phaser).
- **Lo visual y el game feel** se validan con:
  - un **smoke test e2e con Playwright** del flujo completo: Iniciar → elegir gato → poner nombre → tienda → vestir arrastrando → admirar → descargar la foto;
  - la revisión del `game-designer`.
  - **No** se exigen tests de "cómo se ve".
- **Herramientas**:
  - **Vitest** para unit e integración;
  - **`@vitest/coverage-v8`** para la cobertura, con umbrales mínimos de **90 %** en `src/game/domain/` y **80 %** en `plugins/` y `systems/`, aplicados en la configuración (si no se cumplen, el comando falla);
  - **Playwright** para e2e.
- **Ubicación**: `tests/unit/`, `tests/integration/` y `tests/e2e/`.
- **Reglas**:
  - No se escribe código de producción sin un **test que falle antes**.
  - Cada bug nuevo empieza con un test que lo reproduce.
  - Prohibido usar `.skip`, `.only` o borrar tests para que la suite pase.
  - Cuando sea práctico, los commits siguen el ciclo: primero el test que falla, luego la implementación y después el refactor.

## Suite e2e completa (obligatoria al final)
Además del smoke test, el proyecto no se cierra sin una **suite e2e completa de Playwright** en verde que pruebe todas las mecánicas y todos los secretos:

- **(a) Flujo completo**:
  - Iniciar → elegir gato → nombre (validación y persistencia);
  - entrada a la tienda, incluido **saltarla con clic**;
  - vestir → admirar → descargar la foto, verificando que **se descarga un PNG** (evento `download` de Playwright).
- **(b) Drag & drop**:
  - soltar sobre el gato equipa la prenda;
  - soltar fuera hace que rebote y no equipe;
  - con el imán, soltar cerca del ancla equipa;
  - una prenda nueva reemplaza a la del mismo slot;
  - se puede quitar arrastrando fuera del gato y con la ✕ del panel de capas;
  - el z-order coincide con `getLayers`.
- **(c) Catálogo**:
  - todas las categorías y pestañas funcionan;
  - al menos una prenda por categoría se equipa en **al menos 3 gatos distintos**;
  - cambiar de gato conserva o reinicia el outfit, según el diseño.
- **(d) Secretos**, para **todas** las combinaciones de `combos.json`:
  - cada combinación dispara su reacción y entrega la cajita;
  - abrirla arrastrando el moño desbloquea la prenda;
  - el contador X/N sube;
  - no se desbloquea dos veces;
  - el desbloqueo persiste al recargar.
- **(e) Persistencia al recargar**: el gato, el nombre, el outfit, los secretos y el silencio.
- **(f) Silencio**: el silencio de sonido queda persistido.
- **(g) Cero errores de consola** en toda la suite: se escuchan `console.error` y `pageerror`, y el test falla si aparece alguno.

**Testabilidad**:
- En modo test (`import.meta.env.MODE === 'test'` o con el query `?e2e=1`), el juego expone un hook **`window.__VISTE__` de solo lectura**, que nunca existe en el build de producción normal. El hook entrega:
  - el estado: escena actual, gato, nombre, outfit y secretos;
  - las coordenadas en pantalla de los objetos: celdas de prendas, gato, anclas, ✕, moño y botones.
- Playwright arrastra con el **mouse real** (`page.mouse.move/down/up`), sin llamar funciones internas para equipar.
- Los tests e2e **se generan iterando `combos.json` y `clothes.json`**, sin hardcodear ids. Así, agregar una prenda o un combo agrega su test automáticamente.

## Alternativas consideradas
- **Tests a posteriori**: más rápido al principio, pero el diseño sale acoplado a Phaser y difícil de testear, y los huecos de cobertura aparecen tarde.
- **Solo e2e**: lento, frágil y no localiza el fallo. Sirve como red de seguridad, no como base.

## Consecuencias
- La lógica del juego queda separada de Phaser, documentada por sus tests y segura para refactorizar mientras se pule el juice.
- Hay más trabajo al principio de cada feature. F0 debe dejar Vitest, la cobertura y Playwright configurados.
- El e2e con drag & drop sobre un canvas necesita exponer posiciones o hooks de test, por ejemplo un `window.__TEST__` solo en desarrollo. El `architect` define cómo.
- El game feel sigue dependiendo del juicio del `game-designer`: TDD no lo reemplaza.
