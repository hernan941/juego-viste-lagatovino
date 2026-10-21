# Roadmap: Viste Lagato (MVP)

Mantenido por el agente `planner`. Principio: **diversión > funcionalidad**. Primero se hace algo pequeño pero muy divertido (vertical slice) y después se agrega amplitud.

🔒 = **aprobación final del usuario**. Solo la tiene F9. Las features intermedias las validan los agentes y se muestran como avance, sin bloquear.

```
F0 Base ─► F1 Estética ─► F2 Vertical slice ─┬─► F3 Elenco de gatos ──────┐
                                              ├─► F4 Guardarropa ─────────┤
                                              └─► F6 Sonidos ASMR ────────┤
                                 F5 Flujo completo (necesita F3) ─────────┼─► F8 Sorpresas ─► F9 Pulido y entrega en localhost 🔒
                                 F7 Guardado y foto (necesita F5) ────────┘
```

---

### F0. Base del proyecto
- **Objetivo**: tener un proyecto que corre en el navegador, aunque todavía sin juego.
- **Entregables**:
  - proyecto generado desde la **plantilla oficial** (`npm create @phaserjs/game@latest`, plantilla Vite + TypeScript, Phaser 4; ADRs 0010 y 0011);
  - las carpetas extra del ADR 0010 (`objects/`, `plugins/`, `systems/`, `domain/`, `data/`, `constants.ts`) y `art/`;
  - TypeScript strict, ESLint, `git init` y `.gitignore`;
  - **infraestructura de TDD** (ADR 0012):
    - Vitest con `@vitest/coverage-v8` y sus umbrales;
    - Playwright;
    - `tests/{unit,integration,e2e}`;
    - los scripts `test`, `test:watch`, `coverage` y `e2e`;
    - un primer test de ejemplo que se ve **en rojo y luego en verde**;
  - escenas `Boot` y `Preloader` vacías y un lienzo de 1280 × 720 con FIT;
  - carga de la fuente Fredoka.
- **Aceptación**:
  - `npm run dev` muestra un fondo `rosa-50`.
  - `build`, `lint`, `test` y `coverage` pasan.
  - Un e2e mínimo de Playwright abre el juego y ve el canvas.
- **Depende de**: nada.
- **Agentes**: architect (estructura) y phaser-code-writer.
- **Tamaño**: S
- **Estado**: Hecha

### F1. Estética y plantilla del gato
- **Objetivo**: fijar cómo se ve el juego **antes** de dibujar todo.
- **Entregables**:
  - SVG de la plantilla base del gato (silueta, cara y 5 expresiones);
  - **3 gatos de muestra** (naranja, negro y calicó);
  - 2 sweaters de muestra;
  - un panel de UI y un botón de muestra;
  - una página de "hoja de estilo" (`/styleguide`) con todo junto.
- **Aceptación**:
  - Todo cumple el checklist de `art-direction.md`.
  - Las anclas están definidas en `cats.json`.
  - Un sweater encaja en los 3 gatos sin ajustes.
  - El game-designer valida la ternura y la coherencia. Se le muestra al usuario como avance.
- **Depende de**: F0.
- **Agentes**: architect (plantilla y anclas), phaser-code-writer (SVG y styleguide) y game-designer (ternura y legibilidad).
- **Tamaño**: M
- **Estado**: Hecha
- Aprobado por game-designer (2026-10-20), con arreglos: es tierno, coherente con el estilo de `gatos.jpeg` y los dos sweaters encajan en los 3 gatos sin ajustes. Las 5 expresiones se distinguen bien. Los colores nuevos quedan oficializados en `art-direction.md` §4. Antes de cerrar F2 hay que hacer tres cosas: (1) **[Alta]** mejorar la legibilidad de la cara de Luna con un halo `#56505F` detrás de los ojos en `coats/negro.svg` y un brillo de ojo más grande; (2) **[Alta]** copiar las anclas de `art/anchors.json` a `src/game/data/` (hoy `cats.json` no las tiene, y era un criterio de aceptación); (3) **[Media]** separar visualmente las patitas del cuerpo en el gato negro. Los iconos anchos y bajos se aceptan para el MVP.

### F2. Vertical slice: vestir es divertido
- **Objetivo**: probar la mecánica central **con todo el juice**, en pequeño.
- **Entregables**:
  - escena `DressUp` con 1 gato y 6 prendas en 2 categorías;
  - los objetos `Cat`, `ClothingItem` y `LayersPanel` (`src/game/objects/`);
  - lógica de dominio de outfit en `src/game/domain/outfit.ts` (`equip`, `unequip`, `getLayers`) **con TDD**, más los helpers puros del imán y las hit zones, también con TDD;
  - el drag & drop completo:
    - tomar la prenda (crece e inclina);
    - el gato mira la prenda mientras se arrastra;
    - zona de soltar resaltada e imán al ancla;
    - squash y stretch con corazones al soltar;
    - rebote de vuelta si se suelta fuera;
    - arrastrar fuera del gato para quitar;
  - el gato idle (respira, parpadea, mueve la cola);
  - panel de capas con ✕.
- **Aceptación**:
  - El game-designer lo aprueba como "divertido".
  - 60 FPS en PC.
  - Se le muestra al usuario como avance jugable.
- **Depende de**: F1.
- **Agentes**: phaser-code-writer y game-designer (iteración de juice).
- **Tamaño**: L

### F3. Elenco de gatos
- **Objetivo**: tener muchos gatos para elegir.
- **Entregables**:
  - **12 gatos comunes** (mínimo 9) en SVG, según `art-direction.md` §2;
  - `cats.json` completo.
- **Aceptación**: los 12 comparten la silueta y todas las prendas de F2 encajan en todos.
- **Depende de**: F1 (y F2 recomendado).
- **Agentes**: phaser-code-writer (arte) y game-designer (revisión de variedad).
- **Tamaño**: M

### F4. Guardarropa completo
- **Objetivo**: tener muchas opciones para combinar.
- **Entregables**:
  - unas **44 prendas** en 6 categorías (unos 16 sweaters), con sus iconos;
  - pestañas de categoría animadas;
  - grid con scroll suave por rueda o arrastre;
  - schema de validación del catálogo (`src/game/data/schema.ts`) **con TDD**: ids únicos, slots válidos y texturas existentes.
- **Aceptación**:
  - Todas las prendas encajan en los 12 gatos.
  - El z-order es correcto.
  - Para agregar una prenda solo se toca el JSON y el SVG.
- **Depende de**: F2. Puede avanzar en paralelo a F3.
- **Agentes**: phaser-code-writer y game-designer (variedad y "quiero probarlo").
- **Tamaño**: L

### F5. Flujo completo con transiciones
- **Objetivo**: que se sienta un juego completo de principio a fin.
- **Entregables** (ADR 0007):
  - `Title` con el logo animado y el botón "Iniciar";
  - `CatSelect` con la galería de gatos, la reacción al elegir y un **input para el nombre** con teclitas suaves;
  - `ShopEntrance`: el gato camina, suena la campanita, se abre la puerta y la cámara hace zoom (se puede saltar);
  - `Showcase`, donde el gato posa;
  - transiciones de iris con forma de huellita o corazón en todo el flujo (`src/game/systems/transitions.ts`, con el filtro Mask de Phaser 4);
  - el nombre del gato visible en el probador.
- **Aceptación**:
  - Se puede ir de Iniciar a Admirar sin cortes bruscos.
  - Volver o cambiar de gato funciona.
  - No quedan listeners colgados.
  - **El e2e de Playwright del flujo completo pasa** (`npm run e2e`): Iniciar → elegir gato → poner nombre → tienda → vestir arrastrando → admirar.
- **Depende de**: F2 y F3.
- **Agentes**: phaser-code-writer y game-designer.
- **Tamaño**: L

### F6. Sonidos ASMR
- **Objetivo**: que cada acción **suene** satisfactoria.
- **Entregables** (ADR 0009):
  - `AudioPlugin` (Global Plugin, `src/game/plugins/`) con silencio persistido;
  - todos los sonidos de la tabla de `art-direction.md` §9, con variación de tono;
  - `CREDITS.md` con las licencias;
  - maullidos si se encuentran con licencia CC0.
- **Aceptación**:
  - Ninguna acción queda muda.
  - Nada es estridente.
  - El botón de silencio funciona y se recuerda.
- **Depende de**: F2 (se integra en cada escena a medida que exista).
- **Agentes**: phaser-code-writer y game-designer (curación de sonidos).
- **Tamaño**: M

### F7. Guardado y foto
- **Objetivo**: que el gato del jugador "sea suyo" y se pueda presumir.
- **Entregables**:
  - `SavePlugin` con persistencia local (ADR 0004) del gato, su nombre y su outfit, sincronizado con `this.registry`. La serialización, la versión y la migración se hacen **con TDD**;
  - un botón **"Descargar foto"** en Admirar, que genera un PNG con el gato vestido, un fondo bonito, su nombre y el logo, con un flash de cámara y su sonido.
- **Aceptación**:
  - Al recargar la página se mantiene el gato.
  - El PNG se descarga y se ve bien.
- **Depende de**: F5.
- **Agentes**: architect (formato de guardado), phaser-code-writer y game-designer.
- **Tamaño**: S

### F8. Sorpresas: combinaciones y regalitos
- **Objetivo**: dar ganas de seguir experimentando ("¿qué más hay?").
- **Entregables** (`game-design.md` → Economía):
  - reacciones especiales a combinaciones (`src/game/domain/combos.ts` y `data/combos.json`), **con TDD**, incluido el desbloqueo de secretos;
  - unas 6 prendas secretas, entregadas en una cajita de regalo que se abre arrastrando el moño;
  - un contador "Secretos X/6" persistido.
- **Aceptación**:
  - El game-designer **valida o descarta** la mecánica. Si se mantiene, hay al menos 6 combinaciones con su reacción única.
  - **Los e2e de secretos pasan** (ADR 0012, suite completa (d)): se generan desde `combos.json` y cubren la reacción, la cajita, el moño, el contador, que no se desbloquee dos veces y la persistencia.
- **Depende de**: F4, F5 y F7.
- **Agentes**: game-designer (diseño de las combinaciones) y phaser-code-writer.
- **Tamaño**: M

### F9. Pulido, rendimiento y entrega en localhost 🔒
- **Objetivo**: un MVP terminado y corriendo en localhost para que el usuario lo pruebe. El deploy público queda para después del MVP (ADR 0005 sigue vigente).
- **Entregables**:
  - una pasada de juice final con la lista priorizada del game-designer;
  - opción de reducir el movimiento;
  - pantalla de carga temática (el ovillo);
  - medición de la carga de los SVG (atlas si hace falta, ADR 0006);
  - pruebas en Chrome y Firefox a 1280 y 1920;
  - `npm run dev` corriendo en localhost con la URL informada al usuario (sin deploy público).
- **Aceptación**:
  - Se cumple la DoD de `CLAUDE.md`.
  - `npm run coverage` cumple los umbrales.
  - **La suite e2e completa (ADR 0012) está en verde**, con todos sus puntos: flujo con descarga del PNG, drag & drop, catálogo en 3 o más gatos, todos los secretos, persistencia, silencio y cero errores de consola.
  - Carga en menos de 3 s.
  - **El usuario juega el MVP publicado y lo aprueba.**
- **Depende de**: todo lo anterior.
- **Agentes**: todos; el coordinator cierra.
- **Tamaño**: M

---

## Después del MVP
Monedas y compra real, caminar por la ciudad, minijuegos, más tiendas, cuentas y base de datos (Supabase, ADR 0004), logros, música y compartir en redes.
