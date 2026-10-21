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
- **Estado**: Hecha
- Aprobado por game-designer (2026-10-21): los tres arreglos Alta están hechos y se sienten bien. (1) El hover y el press ya no matan el pop-in: escalan el hijo `view` y solo reemplazan su propio tween, y el e2e "hovering the cells while the grid pops in…" lo cubre. (2) El fantasma es la prenda sola, sin tarjeta y centrada en sus píxeles visibles, así que ya no tapa la cara de sorpresa. Al engancharse con el imán aparece la vista previa al 50 % puesta en el gato, y al soltar se asienta con un pop. (3) El clic sin arrastrar responde: la celda se encoge a 0,92, se menea y el texto de ayuda late. Queda un detalle Media en el backlog: con el imán enganchado, el fantasma al 25 % y la vista previa al 50 % se ven como una doble imagen turbia. Los 60 FPS siguen sin poder medirse en headless y se verifican en F9.
- Revisión anterior de game-designer (2026-10-20), ya resuelta: La base es muy buena: el layout coincide con `ejemplo de juego.jpeg`, el gato respira, parpadea y pone cara de sorpresa al tomar una prenda y cara feliz al recibirla, el squash dura 300 ms, la prenda vuelve con rebote y el panel de capas anima sus filas. Antes de cerrar F2 hay que hacer tres arreglos **[Alta]**:
  1. **Celdas que quedan semitransparentes para siempre** (bug confirmado con Playwright). Si el mouse pasa sobre una celda mientras el grid hace su pop-in, por ejemplo justo después de cambiar de pestaña, la celda se queda con un alpha de ~0,3 y parece deshabilitada. Además, `settled` nunca vuelve a `true`. Causa: `addHover` llama a `tweens.killTweensOf(target)` y eso mata el tween de alpha de `popIn`. Pista: en `addHover`, guardar la referencia del tween de hover y hacer solo `hoverTween?.remove()`, o aplicar la escala de hover a un hijo (el `icon`) en vez de al Container. Hay que agregar un test que lo reproduzca.
  2. **El fantasma que se arrastra es una tarjeta que tapa la cara del gato**. Hoy se arrastra el icono con su fondo `crema`, y cuando el imán lo pega al ancla cubre los ojos de sorpresa, justo la reacción que queremos que se vea. Pista: crear el fantasma con la textura de la prenda sin el fondo de celda, por ejemplo `item.texture` recortada con `setCrop` a `anchors.boxes[hitBoxForSlot(slot)]`. Cuando `magnetSnap` dé `snapped`, mostrar una vista previa de la prenda puesta en el gato con alpha 0,5 (una capa con `canvasImage(item.texture)`) y bajar el fantasma a alpha ~0,25 con un tween de 100 ms. Al soltar, la vista previa pasa a alpha 1 con el pop de siempre.
  3. **Un clic en una celda sin arrastrar no da respuesta**. Solo hay hover. Como arrastrar es la única forma de equipar (ADR 0008), el jugador nuevo que hace clic debe recibir una pista. Pista: en `pointerdown` de `ClothingItem`, escala 0,92 en 60 ms. En `pointerup` sin `dragstart`, un meneo de la celda (`angle` −6→6, yoyo, 2 repeticiones, 60 ms) y que el texto "Arrastra la ropa al gatito" haga un pulso de escala 1→1,15→1 con `Back.easeOut` y alpha 1.
  Las mejoras Media y Baja quedan en `docs/game-design.md` → "Backlog de juice". La cola separada se pide para F3. El sonido corresponde a F6 y no bloquea F2. Los 60 FPS no se pudieron medir en headless (WebGL por software).

### F3. Elenco de gatos
- **Objetivo**: tener muchos gatos para elegir.
- **Entregables**:
  - **12 gatos comunes** (mínimo 9) en SVG, según `art-direction.md` §2;
  - `cats.json` completo.
- **Aceptación**: los 12 comparten la silueta y todas las prendas de F2 encajan en todos.
- **Depende de**: F1 (y F2 recomendado).
- **Agentes**: phaser-code-writer (arte) y game-designer (revisión de variedad).
- **Tamaño**: M
- **Estado**: Hecha
- Aprobado por game-designer (2026-10-20): los 12 gatos se distinguen entre sí, también en miniatura (~128 px). Los pares que podían confundirse (gris/azul, blanco/crema, negro/carey/esmoquin, naranja/mandarina) se separan por patrón y no solo por tono. Son tiernos y coherentes con F1 y con `gatos.jpeg`. La cara se lee en los oscuros gracias al halo `#56505F` (en Michi, además, la mancha blanca enmarca la boca). El sweater y el gorro de F2 encajan en los 12 sin ajustes. La cola, ya como capa propia con pivote en la base, se mece en idle y da un latigazo al soltar una prenda. Dudas del artista: (1) **se quedan las rayitas en la frente de Vainilla**, porque son sutiles, realistas para un gato crema y la separan de Nieve y del cuerpo del siamés en miniatura; (2) **se queda el tramo crema en la base de la cola del siamés**, porque las "puntas" nacen del cuerpo claro y además disimula la unión cuando la cola rota (solo se suaviza el corte, ver backlog). No hay arreglos Alta. Lo Media y lo Baja (entre ello, el salto de 4° de la cola al terminar el latigazo, que conviene arreglar pronto) quedan en `docs/game-design.md` → "Backlog de juice".

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
- **Estado**: Hecha
- **Revisión game-designer (2026-10-21, `bc5e864`): Aprobada.** El arreglo Alta está hecho y se siente bien. Cada capa tiene hit test por píxel (alpha ≥ 32 con un alcance de 2 px en el mapa de 192 px, unos 5–6 px en pantalla), y gana la prenda visible de más arriba. Lo comprobé en vivo con Playwright (`scratchpad/f5-review/`), con Naranjito vestido con sweater, perlas, beanie, monóculo y mochilita: al agarrar una perla sale el collar, al agarrar la franja del sweater que queda libre sale el sweater, al agarrar la cadena del monóculo sale el monóculo, y al agarrar el pompón sale el gorro. Al agarrar el centro de la panza sale la mochilita, y es lo correcto, porque ahí se dibuja su correa. Los e2e cubren las 6 capas y los 5 accesorios. **Duda 2 (alcance de 2 px): aceptable.** Perdona en las prendas finas sin robarle a la de abajo más que el borde del contorno, que ya es de la prenda de arriba. No hay arreglos Alta. Lo Media (hover en las prendas puestas) ya estaba en el backlog.
- Revisión anterior de game-designer (2026-10-21), ya resuelta: **todavía no se aprueba, por un solo arreglo Alta**. El guardarropa es precioso. Los 16 sweaters son muy variados (estampados, texturas y siluetas distintas: chaleco en V, oversize con mangas sobre las patitas, hoodie con gatito) y encajan en los 3 gatos revisados (naranja, negro y calicó). Ningún gorro ni bufanda tapa la cara. El look completo de 6 capas se ve adorable y el panel de capas muestra las 6 filas sin cortarse. El scroll es suave, la fila cortada invita a bajar y al cambiar de pestaña vuelve arriba. Las pestañas con icono y el nombre al pasar el mouse funcionan. Arreglo pendiente:
  1. **[Alta] Las prendas puestas se agarran por cajas compartidas, no por lo que se ve** (confirmado con Playwright en `scratchpad/f4-review/`). El sweater, la bufanda y el accesorio comparten la caja `torso`, y el gorro y los lentes comparten la caja `head`. Como gana la capa de más arriba, ocurren dos cosas. Si llevas la mochilita y arrastras el sweater, sale la mochilita. Si llevas lentes y arrastras el gorro, salen los lentes. Además, 4 de los 5 accesorios (flor en la oreja, globo, ovillo y taza), y también la varita secreta, se dibujan fuera de la caja `torso`: haces clic sobre el globo y no pasa nada, un clic mudo. Ahora que hay 6 slots esto es el caso normal, no un caso raro, y "agarré otra cosa" se siente como un bug. Pista: dar a cada capa de `Cat` un hit test por píxel (`setInteractive({ pixelPerfect: true, alphaTolerance: 32, draggable: true, useHandCursor: true })`; con `topOnly`, gana la capa visible de más arriba). Si en el punto no hay ningún píxel de prenda, se usa la caja actual como respaldo, para que las prendas finas (collar de perlas, cadena del monóculo) se sigan pudiendo agarrar. `layerGrab` del hook debe devolver un punto visible de cada prenda que no esté tapado por otra (con `alphaBounds` y un muestreo del alpha de las capas de encima). Test: un e2e con un outfit de 6 capas que arrastre cada prenda desde su `layerGrab` y compruebe que se quita **esa** prenda y ninguna otra, más uno que agarre el globo por el corazón. Esfuerzo: S–M.
  Lo Media y lo Baja (iconos de las pestañas de bufanda y guantes, lentes de sol que esconden las expresiones, el globo que se sale del espejo y las secretas que hay que hacer más especiales) quedan en `docs/game-design.md` → "Backlog de juice". Las combinaciones para F8 están en `docs/game-design.md` → "Combos de F8".

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
- **Estado**: Hecha (los dos arreglos Alta del game-designer están aplicados)
- **Revisión game-designer (2026-10-21, `773442d`): Aprobada con arreglos.** El flujo ya se siente como un juego completo. El logo cae letra por letra con rebote y los gatitos se asoman detrás de la colina y se pueden acariciar. En la galería, el gato elegido da un saltito con cara feliz, brillitos y maullido. El paseo hasta la tienda tiene campanita, puerta, gato que entra achicándose y zoom. El iris de corazón se abre justo sobre la cara del gato en el probador, y el Showcase alterna las poses feliz y enamorado con corazones y brillitos bajo un cartel que cae rebotando. La cola ya no salta al terminar el latigazo (arreglo de F3 hecho). Hay dos arreglos Alta, baratos, antes de cerrarla:
  1. **[Alta] Al escribir, el nombre se pega detrás del nombre por defecto** (`src/game/scenes/CatSelect.ts` → `onKey`, `src/game/domain/catName.ts`). Al elegir a Tricolor, el campo dice "Tricolor". Si escribes "Bigote", queda "TricolorBigo" (tope de 12): hay que borrar 8 letras antes de poder escribir. En las capturas del writer quedó "TricolBigote", y así se ve en el probador y en el Showcase. Bautizar al gato es el momento "es mío" y hoy se siente roto. Arreglo: el nombre por defecto se comporta como texto seleccionado. La primera tecla imprimible lo **reemplaza** y Backspace lo borra entero. En cuanto el jugador escribe algo propio, todo sigue como ahora. Visualmente, el nombre por defecto se ve en `texto` con alpha 0,55 (o con un resaltado `rosa-100` detrás) y el caret va al inicio, para que se lea como "escribe aquí". Con TDD, en `catName.ts`: `applyNameKey(current, key, { replacing: true })`, o una función `typeIntoDefault`. Si el jugador no escribe nada, ¡Este! acepta el nombre por defecto como hoy. Esfuerzo: S.
  2. **[Alta] El texto del Showcase "¡Qué guap@, {nombre}!"** (`src/game/domain/copy.ts` → `showcaseTitle`). **Duda 1: se cambia.** La @ se lee como un error o un correo y rompe el tono kawaii justo en el momento de premio. Pasa a **"¡Qué lindo look, {nombre}!"**, que es neutro, tierno y nombra lo que hizo el jugador. Hay que actualizar `tests/unit/copy.test.ts`, el comentario de `Showcase.ts` y el e2e que lea `info.title`. Esfuerzo: S.
  Decisiones sobre las otras dudas. **Duda 3: el iris centrado en pantalla está bien para el MVP.** En el probador y en el Showcase el gato está casi al centro, así que el corazón ya se abre sobre él. Que el iris se cierre sobre el botón o el gato pulsado queda como Baja en el backlog. **No hace falta volver de CatSelect a Title**, porque la portada no tiene nada que hacer aparte de Iniciar; si alguna vez hace falta, será un botón "casita" en F9. Lo Media y lo Baja (el botón Iniciar tapa las orejas del gatito del medio, al cambiar de gato se pierde el outfit, el Showcase sin ropa, "Toca para saltar") quedan en `docs/game-design.md` → "Backlog de juice".

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
- **Estado**: Hecha
- **Revisión game-designer (2026-10-21, `0855dc9` y `0af05fe`): Aprobada.** Revisé el código porque nadie lo ha escuchado todavía. **Duda 4.** Los volúmenes son razonables y ASMR: la base es 0,6 sobre archivos normalizados a −9 dBFS, el hover va a 0,35–0,5, el arrastre a 0,4 y el ronroneo del Showcase a 0,7. Hay variación de tono de ±5 % y un tope de 3 sonidos iguales a la vez. Hay variedad: 3 maullidos distintos al azar. La frecuencia de los maullidos está bien: suenan al elegir un gato, al acariciar en la portada, al entrar al Showcase y en el 25 % de los drops (siempre en un combo), así que no cansan. El susurro de arrastre suena cada 160 ms y solo mientras el mouse se mueve; dura 0,4 s, así que se encadena como un roce continuo y suave, que es lo que pide la tabla, y el tope de 3 evita que se acumule. Todas las acciones de la tabla de `art-direction.md` §9 tienen sonido conectado, menos el obturador, que es de F7. Las letras del logo suenan al caer, pero en la primera visita el audio todavía está bloqueado y no se oyen. Es correcto (no hay sonido antes del primer gesto) y no molesta. No hay arreglos Alta. Lo Media (el ronroneo en bucle del Showcase y el traqueteo del hover al barrer el grid) y lo Baja quedan en `docs/game-design.md` → "Backlog de juice". **Pendiente para F9**: la prueba de oído real (que nada sea estridente y que el susurro de arrastre no canse) la hace el usuario al jugar el MVP.

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
- **Estado**: Hecha
- **Tareas** (hechas con TDD):
  1. `domain/session.ts` → `sessionFromSave`: restaura el gato, el nombre y el outfit validados contra el catálogo.
  2. `plugins/saveService.ts` (guardado con debounce de 300 ms sobre lo que ya hay: conserva mute y secretos) y `plugins/SavePlugin.ts` (Global Plugin que escucha el registry y vacía al cerrar la página). La clave es `viste-lagato:save:v1`, el JSON corrupto o de una versión futura arranca limpio, y `secrets` queda listo para F8.
  3. `Preloader` restaura la sesión: "Iniciar" lleva a CatSelect con el gato y el nombre elegidos, y el probador muestra el outfit.
  4. `domain/photo.ts` (nombre de archivo y composición), `objects/photo.ts` (RenderTexture con el gato vivo, `capture` y `snapshot`) y `systems/download.ts`.
  5. Showcase: botón "Descargar foto" (sonido Shutter, flash blanco, el gato posa, burbuja "¡Foto lista!").
  6. e2e: `tests/e2e/save.spec.ts` y `tests/e2e/photo.spec.ts`.
- **Tamaño**: S
- **Revisión game-designer (2026-10-21, `d90942f` y `a634a24`): Aprobada con arreglos (sin Alta).** La foto es un recuerdo que da ganas de guardar: tarjeta crema con borde `rosa-400`, logo con contorno, el gato grande sobre un halo mantequilla con su sombra, corazones y brillitos, y la placa con el nombre. Cumple el checklist §10 (contorno, paleta plana, formas redondeadas, el gato se ve tierno y entero, con cola y prendas en su sitio). El momento de sacarla también se siente bien: obturador, flash 70/420 ms, pose `amor` con squash y burbuja "¡Foto lista!" con `Back.easeOut`; no se puede disparar dos veces mientras trabaja. El guardado es invisible, como debe ser: "Iniciar" te devuelve a tu gato con su nombre y su look, y el JSON roto arranca limpio. Arreglos **Media/Baja** en `docs/game-design.md` → "Backlog de juice": (Media) que la foto salga con la cara de la pose (en la evidencia el gato posa con ojos de corazón en pantalla y el PNG sale con `feliz`), (Media) un momento de "revelado" con miniatura de la foto, (Baja) huellitas del fondo casi invisibles, brillitos poco contrastados sobre crema, burbuja que tapa la panza y pompón del gorro tapado por el cartel.

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
- **Tareas** (con TDD):
  1. `data/combos.json` con los 6 combos de `game-design.md` → "Combos de F8"; `domain/combos.ts` suma `comboOutfit` (prendas visibles que completan un combo), `almostCombos`, `secretRewards` y `comboReactionPlan`; `data/schema.ts` valida la reacción, que no se pidan prendas secretas y que cada combo se pueda completar con prendas visibles; `catalog.ts` muestra las secretas ganadas (primero en su pestaña).
  2. `plugins/saveService.ts` y `SavePlugin.ts`: `unlockSecret` escribe al instante y `secrets` lee lo guardado.
  3. Objetos: `GiftBox` (cajita que cae y se abre arrastrando el moño; soltar antes de tiempo lo devuelve), `SecretCounter` ("Secretos X/6" con pop al subir), `comboFx` (una reacción por combo: estrellas, nieve, pétalos con "¡achís!", pose real con confeti, latidos, arcoíris), brillito de "secreta" en la celda y métodos nuevos de `Cat`.
  4. DressUp: reacción, cajita, desbloqueo, vuelo de la prenda a su pestaña y contador; un combo ya ganado da solo una reacción corta; si se sale con una cajita sin abrir, la prenda se entrega igual. Showcase: contador.
  5. Pista "¡Casi...!" cuando falta exactamente 1 pieza (y hay al menos 2 puestas), sin decir cuál.
  6. e2e `tests/e2e/secrets.spec.ts` generado desde `combos.json`; el hook suma `secrets`, `gift`, `reactions`, `almost` y la acción `wear(ids)` (solo modo test).
- **Estado**: Implementada, con 2 arreglos de prioridad Alta pendientes (ver la revisión)
- **Notas para la revisión**: el nombre del look sale en un globo sobre la frente del gato; el sonido "tilín" y las campanitas reutilizan `sfx-hover` con distinta velocidad (no hay audio nuevo); la cajita aparece a la izquierda del gato, dentro del espejo.
- **Revisión game-designer (2026-10-21)**: **Aprobada con arreglos**. Se revisaron los 6 combos en movimiento (screencast a ~100 ms: reacción, "¡Casi...!", cajita, moño, apertura, vuelo y combo repetido) y no hubo errores de consola. **Valido la mecánica**: los 6 combos tienen su reacción propia y se distinguen. La de fresas (pétalos + "¡achís!") y la de arcoíris son las mejores. El moño que tiembla y la tapa que salta se sienten bien. Pero hay dos cosas que estropean justo el momento del premio:
  - **Alta 1. El globo con el nombre del look tapa lo que se celebra** (S). Durante ~2,3 s cubre la frente y la cabeza: oculta la corona entera en "¡Su Majestad Gatuna!", el gorrito de fresa y el pompón del beanie navideño. El jugador completa el look y no lo puede ver. Arreglo en `objects/comboFx.ts` (`playComboReaction` y `playShortReaction`) y `scenes/DressUp.ts` (`createNameSign`): el nombre del look va **en el cartel del nombre**, que se da vuelta (scaleY 1→0 en 120 ms, cambia el texto a `combo.name` con fondo `mantequilla`, vuelve con `Back.easeOut`, brillitos y un rebote del cartel) y a los 2 s vuelve a mostrar el nombre del gato de la misma forma. El globo "¡Varita de estrella!" de la apertura usa el mismo cartel. Nada de texto encima de la cabeza del gato.
  - **Alta 2. El premio se adelanta y no parece un objeto mágico** (S). (a) Al abrir la cajita, la pestaña cambia y **la celda del premio ya muestra la prenda** (y el contador ya dice 1/6) mientras la copia todavía vuela: hay dos varitas en pantalla y el aterrizaje no sorprende. (b) Lo que sale de la caja es el icono del grid **con su baldosa crema**, un cuadrado sobre la panza del gato, y se queda arriba solo ~350 ms. Arreglo en `scenes/DressUp.ts` (`onGiftOpened`) y `objects/GiftBox.ts` (`openBox`): la celda del premio arranca con alpha 0 y aparece con `celebrate()` **cuando aterriza**, y el contador sube (`setCount(…, true)`) en ese mismo instante, no antes. El premio sale sin baldosa (la textura de la prenda ajustada con `ghostFit`, o el icono sin fondo), sube más alto (por encima de la caja y fuera de la cara) y flota 600 ms girando ±8° con el brillo `mantequilla` detrás antes de volar. Un test de integración que compruebe que la celda tiene alpha 0 hasta el `onComplete` del vuelo.
  - Media y Baja (pista del moño ilegible, arcoíris que se sale del espejo, "¡Casi...!" encima del cartel, nieve que casi no se ve, etc.) van a `docs/game-design.md` → "Backlog de juice" para F9.
  - **Dudas del writer, decididas**: (1) globo sobre la frente: **no**, va en el cartel del nombre (Alta 1). (2) "Tilín" y campanitas con `sfx-hover` a otra velocidad: **aceptable para el MVP**; se oyen como un arpegio y no hay que sumar audio. Un sonido propio de campanitas queda como Baja. (3) Entregar la secreta si se sale con la cajita sin abrir: **sí, correcto**. Nunca se castiga al jugador ni se pierde lo ganado. Falta que se entere (Baja). (4) "¡Casi...!" sin decir cuál pieza: **sí**, descubrir es la gracia. Como pista suave, que el gato mire hacia la pestaña de la pieza que falta (ya está en el backlog).
  - Cuando estén los 2 arreglos Alta (con una captura del cartel girado y del aterrizaje), F8 pasa a **Hecha** sin otra revisión completa.

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
