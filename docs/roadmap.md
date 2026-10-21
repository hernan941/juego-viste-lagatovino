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
- **Estado**: Hecha (los 2 arreglos Alta del game-designer están aplicados en `538db5a`)
- **Notas para la revisión**: el nombre del look sale en un globo sobre la frente del gato; el sonido "tilín" y las campanitas reutilizan `sfx-hover` con distinta velocidad (no hay audio nuevo); la cajita aparece a la izquierda del gato, dentro del espejo.
- **Revisión game-designer (2026-10-21)**: **Aprobada con arreglos**. Se revisaron los 6 combos en movimiento (screencast a ~100 ms: reacción, "¡Casi...!", cajita, moño, apertura, vuelo y combo repetido) y no hubo errores de consola. **Valido la mecánica**: los 6 combos tienen su reacción propia y se distinguen. La de fresas (pétalos + "¡achís!") y la de arcoíris son las mejores. El moño que tiembla y la tapa que salta se sienten bien. Pero hay dos cosas que estropean justo el momento del premio:
  - **Alta 1. El globo con el nombre del look tapa lo que se celebra** (S). Durante ~2,3 s cubre la frente y la cabeza: oculta la corona entera en "¡Su Majestad Gatuna!", el gorrito de fresa y el pompón del beanie navideño. El jugador completa el look y no lo puede ver. Arreglo en `objects/comboFx.ts` (`playComboReaction` y `playShortReaction`) y `scenes/DressUp.ts` (`createNameSign`): el nombre del look va **en el cartel del nombre**, que se da vuelta (scaleY 1→0 en 120 ms, cambia el texto a `combo.name` con fondo `mantequilla`, vuelve con `Back.easeOut`, brillitos y un rebote del cartel) y a los 2 s vuelve a mostrar el nombre del gato de la misma forma. El globo "¡Varita de estrella!" de la apertura usa el mismo cartel. Nada de texto encima de la cabeza del gato.
  - **Alta 2. El premio se adelanta y no parece un objeto mágico** (S). (a) Al abrir la cajita, la pestaña cambia y **la celda del premio ya muestra la prenda** (y el contador ya dice 1/6) mientras la copia todavía vuela: hay dos varitas en pantalla y el aterrizaje no sorprende. (b) Lo que sale de la caja es el icono del grid **con su baldosa crema**, un cuadrado sobre la panza del gato, y se queda arriba solo ~350 ms. Arreglo en `scenes/DressUp.ts` (`onGiftOpened`) y `objects/GiftBox.ts` (`openBox`): la celda del premio arranca con alpha 0 y aparece con `celebrate()` **cuando aterriza**, y el contador sube (`setCount(…, true)`) en ese mismo instante, no antes. El premio sale sin baldosa (la textura de la prenda ajustada con `ghostFit`, o el icono sin fondo), sube más alto (por encima de la caja y fuera de la cara) y flota 600 ms girando ±8° con el brillo `mantequilla` detrás antes de volar. Un test de integración que compruebe que la celda tiene alpha 0 hasta el `onComplete` del vuelo.
  - Media y Baja (pista del moño ilegible, arcoíris que se sale del espejo, "¡Casi...!" encima del cartel, nieve que casi no se ve, etc.) van a `docs/game-design.md` → "Backlog de juice" para F9.
  - **Dudas del writer, decididas**: (1) globo sobre la frente: **no**, va en el cartel del nombre (Alta 1). (2) "Tilín" y campanitas con `sfx-hover` a otra velocidad: **aceptable para el MVP**; se oyen como un arpegio y no hay que sumar audio. Un sonido propio de campanitas queda como Baja. (3) Entregar la secreta si se sale con la cajita sin abrir: **sí, correcto**. Nunca se castiga al jugador ni se pierde lo ganado. Falta que se entere (Baja). (4) "¡Casi...!" sin decir cuál pieza: **sí**, descubrir es la gracia. Como pista suave, que el gato mire hacia la pestaña de la pieza que falta (ya está en el backlog).
  - Cuando estén los 2 arreglos Alta (con una captura del cartel girado y del aterrizaje), F8 pasa a **Hecha** sin otra revisión completa.
  - **Arreglos Alta hechos (`538db5a`)**: el cartel (`objects/NameSign.ts`) se da vuelta en X con squash, muestra `combo.name` o `¡<Premio>!` y a los 2 s vuelve al nombre del gato; ya no hay texto sobre la cabeza. El premio sale sin baldosa (textura de la prenda), sube por encima de la caja, flota 600 ms con brillo y vuela; la celda arranca invisible y aparece con pop al aterrizar, y el contador sube en ese momento (`domain/giftReveal.ts`, con test unitario y e2e que muestrea la secuencia). Capturas en `scratchpad/f8-fix/` (`cartel-girado.png`, `aterrizaje-*.png`).

### F9. Pulido, rendimiento y entrega en localhost 🔒
- **Objetivo**: un MVP terminado, pulido y estable, corriendo en localhost para que el usuario lo juegue y lo apruebe. El deploy público queda para después del MVP (ADR 0005 sigue vigente).
- **Entregables**:
  - una suite e2e **estable y completa** (ADR 0012, puntos a–g), sin flakes y en un tiempo razonable;
  - la pasada de juice final: **todos los Media** del "Backlog de juice" de `docs/game-design.md` y los **Baja baratos que suman diversión** (el resto, a "Después del MVP" con su razón, ver abajo);
  - **reducción de movimiento**: respeta `prefers-reduced-motion` y tiene un botón para activarla o desactivarla, que se guarda (requiere ADR, architect);
  - pantalla de carga del ovillo revisada y pulida;
  - pruebas de rendimiento: tiempo de carga, fugas de tweens, timers y listeners tras varios ciclos de escena, FPS medidos donde se pueda y atlas si la carga de los SVG lo pide (ADR 0006);
  - pruebas en Chrome y Firefox a 1280 × 720 y 1920 × 1080;
  - `npm run dev` corriendo en localhost con la URL informada al usuario (sin deploy público).
- **Aceptación**:
  - Se cumple la DoD de `CLAUDE.md` completa: `build`, `lint`, `test` y `coverage` (≥ 90 % en `domain/`, ≥ 80 % en `plugins/` y `systems/`) pasan.
  - **La suite e2e completa (ADR 0012) está en verde, con 0 fallidos, 0 saltados y 0 flaky** (`retries: 0`) en **3 corridas completas seguidas**. Cubre todos sus puntos: flujo con descarga del PNG, drag & drop (con imán y z-order), catálogo en 3 o más gatos, todos los secretos de `combos.json` (con su persistencia), persistencia al recargar, silencio, reducción de movimiento y cero errores de consola. `grep -rE "\.(only|skip)\(" tests` da 0 resultados.
  - La suite chromium 1280 dura **≤ 10 min** en esta máquina (hoy ~19 min) y ningún test pasa de 120 s.
  - El subconjunto `@cross` pasa en `firefox` y en `chromium-1920`. Si Firefox de Playwright no se puede instalar, queda anotado aquí y lo prueba el usuario a mano en el 🔒.
  - **Carga en menos de 3 s**: desde `goto` hasta el Title listo, contra el build (`npm run preview`), en Chrome headless a 1280.
  - **Sin fugas**: tras 5 ciclos DressUp → Showcase → DressUp y 1 ciclo CatSelect → ShopEntrance (saltada) → DressUp, el conteo de tweens activos, timers, listeners del `EventBus`, del registry y del input y objetos en la display list del ciclo 5 es **igual** al del ciclo 2 (los objetos y tweens del idle, con una tolerancia de ±5 documentada).
  - **FPS**: en headless (SwiftShader, ~20 fps) solo se registra el número, no se exige. Se exige **≥ 55 fps de mediana** arrastrando en DressUp y durante el combo arcoíris en **Chrome con GPU**: lo mide el agente si el entorno tiene GPU y, si no, el usuario con el contador `?fps=1` en su PC durante el 🔒.
  - El game-designer aprueba la pasada de juice y el modo de movimiento reducido ("se siente bien" y nada se ve roto en 1280 ni en 1920).
  - Los assets nuevos o retocados cumplen el checklist de `docs/art-direction.md`.
  - 🔒 **El usuario juega el MVP en localhost, hace la prueba de oído (nada estridente, el susurro de arrastre y el ronroneo no cansan) y lo aprueba.**
- **Depende de**: F8 Hecha (sus 2 arreglos Alta).
- **Agentes**: phaser-code-writer (lotes A, B y C), architect (ADR de movimiento reducido y, si hace falta, atlas), game-designer (revisión del juice, del modo reducido y de las capturas en 1920 y Firefox), coordinator (DoD y entrega) y el usuario (🔒).
- **Tamaño**: L
- **Estado**: En curso. **Lotes A (1–6) y B (7–15) hechos** (2026-10-21). La revisión 16 del game-designer dejó **2 Alta** (hover que destiñe las prendas y nieve que tapa el combo) que se arreglan con test antes del lote C; el modo reducido quedó aprobado. Falta el lote C.

#### Auditoría de la suite e2e (2026-10-21)
Specs que existen en `tests/e2e/`: `boot`, `flow`, `dressup`, `wardrobe`, `pixelHit`, `secrets`, `save`, `photo`, `audio`, `sounds` (+ `helpers.ts` con la fixture automática de errores de consola). Solo hay un proyecto: `chromium` a 1280 × 720. Firefox **no** está instalado (en `~/.cache/ms-playwright` solo hay chromium).

| ADR 0012 | Estado | Cómo quedó (Lote A) |
|---|---|---|
| (a) Flujo completo | **Completo** | `flow.spec`: el smoke único Title → CatSelect → nombre → caminata de la tienda → vestir arrastrando → Showcase → "Descargar foto" con el evento `download` y el nombre `viste-lagato-<nombre>.png` → seguir vistiendo → cambiar de gato. |
| (b) Drag & drop | **Completo** | Nuevo `dragdrop.spec`: el imán engancha cerca del ancla, suelta lejos de ella y equipa al soltar (6 slots → se prueban el primero, uno del medio y el último), un drop dentro del gato pero fuera del radio también equipa. El z-order lee el hook `drawOrder`, que es el **orden real de la display list** de `Cat` (no el dominio) y se compara con `layers` y con el panel. |
| (c) Catálogo | **Completo** | Nuevo `catalog.spec`: la primera prenda de cada categoría arrastrada en 3 gatos (el primero, el del medio y el último de `cats.json`). Sin ids a mano. "Cambiar de gato empieza desnudo" sigue como está: se reescribe primero si se hace el Media "conservar el outfit". |
| (d) Secretos | **Completo** | Cada combo de `combos.json` termina recargando: contador, `saved.secrets`, premio en su pestaña y premio arrastrable. Reemplaza al test aparte de "sobrevive a una recarga" (mismas aserciones dentro de cada combo). |
| (e) Persistencia | **Completo** | `save.spec`: un solo recargo (por el Title y CatSelect de verdad) con gato, nombre, outfit, silencio y secretos a la vez, comparando `saved` entero. Reemplaza al test más corto de "gato, nombre, outfit y silencio" (es un subconjunto). El movimiento reducido se suma en el Lote B. |
| (f) Silencio | Completo | Sin cambios. |
| (g) Cero errores de consola | **Completo** | `boot.spec` y `audio.spec` usan la fixture `test` de `helpers.ts`; ningún spec importa `test` de `@playwright/test`. Verificado rompiendo a propósito (un `console.error` en `Title` y en `DressUp`): fallan los dos. |
| Nuevo en F9 | Falta | Movimiento reducido, fugas tras N ciclos, tiempo de carga, Firefox y 1920 (lotes B y C). |

Problemas de estabilidad y velocidad (resueltos en el Lote A, ver abajo): 12 `test.setTimeout` de 90 a 420 s, 6 `waitForTimeout`, `workers` sin fijar y casi todos los tests preparando el estado arrastrando.

#### Tareas
Tests primero (ADR 0012). Los lotes se ejecutan en orden: A deja la suite rápida y fiable, así B y C se validan con ella. Dentro de cada lote, las tareas también van en orden.

**Lote A: estabilidad e2e y suite completa** (phaser-code-writer)
1. **Línea base medida** (1 h). Correr `npx playwright test --reporter=json` y sacar una tabla de duración por spec y por test, con el número de arrastres reales de cada uno. Se entrega la tabla (en el resumen, sin archivos nuevos en el repo). *Aceptación*: la tabla tiene los 10 tests más lentos y la duración total. **Hecha.** Línea base (113 tests, 4 workers por defecto): **17,7 min**, 0 fallidos. Más lentos: `pixelHit` "6 layers worn" 206 s y "every accessory" 200 s, `dressup` "layers keep the slot order" 100 s, los 6 combos de `secrets` 85–94 s cada uno, "one item per category" 85 s. Por spec (suma de tests): dressup 1475 s (44 tests de una prenda de ~22 s cada uno), secrets 893 s, wardrobe 559 s, flow 390 s, save 216 s, pixelHit 406 s. Cada test arrancaba el juego de cero (~6 s a solas, 11 s con 4 workers) y las prendas se ponían arrastrando.
2. **Configuración robusta** (1–2 h). En `playwright.config.ts`: `workers` explícito (empezar con 4 y ajustar con la medición), `retries: 0`, `expect.timeout` razonable y un `timeout` global de 60 s. Quitar los 6 `waitForTimeout` (esperar una condición del hook). Pasar `boot.spec` y `audio.spec` a la fixture `test` de `helpers.ts`. *Aceptación*: `grep -rn waitForTimeout tests/e2e` da 0; ningún spec importa `test` de `@playwright/test` salvo `helpers.ts`; la suite sigue verde. **Hecha** (`bd24ed6`). `workers: 3`, `retries: 0`, `expect.timeout` 10 s y `timeout` 60 s (los tests largos piden hasta 120 s con `test.setTimeout`; ninguno pasa de eso). 0 `waitForTimeout` (esperas por estado: `rowsAtRest`, `during(…, esperados)` de `sounds`, `photoBusy`, `settled`). `boot.spec` y `audio.spec` usan la fixture. Se probó 2, 3, 4 y 5 workers: con 4 o más, los arranques en frío superan los 40 s y fallan por tiempo, no por lógica.
3. **Preparar el estado con `wear(ids)`** (2–3 h). Un helper `dressWith(page, ids)` que llama a `wear` y espera `settled`. Regla: **con el mouse real solo se arrastra lo que el test comprueba**; lo demás se pone con `wear`. Aplicarlo en `pixelHit` (las 6 capas se ponen con `wear` y se quita arrastrando cada una), en el test de accesorios, en el z-order (arrastrar 2 prendas en orden inverso y el resto con `wear`), en `wardrobe` "una prenda por categoría", en "¡Casi...!" y en `photo`/`save` donde aplique. Bajar los `test.setTimeout` a ≤ 120 s. *Aceptación*: "6 layers worn" dura < 90 s solo; ningún `setTimeout` > 120 000; la suite chromium dura ≤ 10 min con 0 fallidos. **Hecha** (`bd24ed6`). `dressWith`/`clearCat`/`rowsAtRest`/`layerGrabAtRest` en `helpers.ts`. `pixelHit` "6 layers" pasó de **206 s a 22 s** a solas (las 6 capas con `wear`, cada una se quita arrastrando por su píxel) y "every accessory" de 200 s a 20 s. Los tests por prenda de `dressup` ahora son por categoría en trozos de 6 y cada prenda se sigue arrastrando de verdad. El z-order viejo (6 arrastres, 100 s) se movió a `dragdrop.spec` con 2 arrastres. "Casi" y `photo` también usan `wear`/`jump`. Ningún `setTimeout` > 120 s.
4. **Specs que faltan de drag & drop y catálogo** (3–4 h). (b) el imán: soltar a pocos px del ancla, fuera del área del gato, y que equipe (y un punto un poco más lejos que rebote); (b) z-order: el hook expone el orden real de dibujo de las capas de `Cat` y el test lo compara con `getLayers`; (c) un test por gato para 3 gatos de `cats.json` (primero, del medio y último): con `?start=DressUp&cat=<id>`, arrastra la primera prenda de cada categoría y la ve puesta. Todo generado desde `cats.json` y `clothes.json`. Si algún test descubre un bug, se queda en rojo y se arregla con su propio test (TDD). *Aceptación*: los specs nuevos pasan y no hay ids escritos a mano. **Hecha** (`bd24ed6`): `dragdrop.spec` y `catalog.spec`, generados desde `cats.json`/`clothes.json`. Cada spec se vio fallar antes de darlo por bueno (ver evidencia abajo).
5. **Specs que faltan de flujo, secretos y persistencia** (2–3 h). (a) el smoke único termina en "Descargar foto" con el evento `download` y un nombre `.png`; (d) en el test generado de cada combo, tras desbloquear: recargar y comprobar el contador, el secreto en `saved.secrets` y la celda en su pestaña; (e) un recargo de `save.spec` con gato, nombre, outfit, secretos y silencio a la vez. *Aceptación*: todos pasan; la tabla de auditoría queda sin huecos en (a)–(g). **Hecha** (`bd24ed6`): smoke con PNG, recarga por combo y recargo total (más `35a0369`, trace del premio).
6. **Prueba anti-flake** (1 h, writer; el coordinator verifica). 3 corridas completas seguidas y `--repeat-each=5` de `pixelHit`, `dressup` y `secrets`. *Aceptación*: 0 fallidos, 0 saltados y 0 flaky en todas; se informan las duraciones. **Hecha** (ver resultados abajo).

**Resultado del Lote A (2026-10-21, chromium 1280, `retries: 0`)**
- Suite: **75 tests** (eran 113; los 44 de "una prenda" y otros se agruparon por categoría sin dejar de arrastrar cada prenda de `clothes.json`). Tres corridas completas seguidas de `npm run e2e` (sobre el último commit): **75 passed, 0 failed, 0 skipped, 0 flaky** las tres, en **10,7 / 10,8 / 10,9 min** (otras tres corridas anteriores dieron 10,8 / 10,9 / 11,0). El test más lento dura ~100 s (el recargo total; los combos, ~66 s). Antes: 17,7 min y tests de hasta 206 s.
- **Criterio de 10 min: no se alcanzó (10,7–11,0 min)**. Razón medida: el WebGL por software (SwiftShader) de Chromium headless usa todos los núcleos de esta máquina de 8 (un solo Chromium gasta ~575 % de CPU, ~80 % en el kernel). Dos tests a la vez ya se ven 1,4 veces más lentos cada uno, y 3 workers rinden ~1,5 veces lo que 1 (1 worker: 18 min; 2: igual o peor; 3: 10,4–11 min; 4: 9,8 min pero con arranques en frío de más de 40 s que fallan por tiempo, aun con 60 s). Se descartaron: limitar los FPS en modo test (a 8 FPS el arrastre de capas puestas deja de funcionar y a 12–15 no gana nada), fijar núcleos por worker con `taskset` (no mejoró) y otros backends de GL (solo hay SwiftShader). En una máquina con GPU o más núcleos baja de 10 min; aquí no se infló ningún timeout para cumplirlo.
- Qué dio la mejora: una **página compartida por worker** (`sharedTest`): los specs que solo necesitan un probador limpio no recargan; arrancan con el hook `jump('DressUp'|'Title'|…, gato, nombre)` y `reset()` (progreso como primera visita) y la dejan estacionada con `park(true)` (si no, seguía renderizando y frenaba los tests de página nueva del mismo navegador). Los specs de recarga, almacenamiento corrupto, silencio y boot siguen con página nueva. Además, arrastres con 1+2 pasos de ratón (cada paso cuesta un cuadro) y el scroll de la rejilla en un solo gesto.
- **Hooks nuevos (modo test)**: `jump`, `reset`, `park`, `frames`, y en `dressUp`: `magnet`, `slotAnchors`, `drawOrder`, `pxPerGamePx`.
- **Bugs reales que salieron al estabilizar (los dos con su test)**: (1) `Cat` llamaba `tailTween.remove()` y en un `TweenChain` eso espera un tween hijo, no la cadena: reventaba con `Cannot read properties of undefined (reading 'setRemovedState')` al cerrar o reiniciar la escena con la cola en un latigazo (`980ff6a`, test de integración en rojo → verde, ahora con `stop()`). (2) `grabPoint` (dónde agarrar una capa) respetaba el alcance del hit test de las capas de encima pero no el medio píxel en que cae el puntero, y a veces agarraba la mochila en vez de la bufanda: fallaba en 2 de cada 4 corridas de `pixelHit` (`a549847`, test unitario en rojo → verde).
- **Anti-flake** (`--repeat-each=5`, 3 workers): `pixelHit` + `dressup` + `secrets` = 145 ejecuciones, 144 pasaron y 1 falló: el test "the prize lands…" muestreaba el vuelo corto del premio con un `setInterval` del test y bajo carga a veces no veía ningún cuadro. Se arregló haciendo que la escena anote el estado en cada paso (`secrets.trace` del hook, `35a0369`) y `secrets` repetido 5 veces después: **60 de 60**. `pixelHit` solo, antes de los dos arreglos de agarre, fallaba 6 de 9 repeticiones; después, 16 de 16 (`--repeat-each=8`). `dragdrop` se repitió 4 veces junto a `pixelHit` sin fallos propios.
- **Evidencia de que los specs nuevos fallan cuando deben** (rompiendo temporalmente el código y volviendo a dejarlo): radio del imán a 0 → falla `dragdrop` del imán; `getDrawOrder` sin ordenar → falla `drawOrder` (`Expected - 1 / Received + 1`); prefijo del PNG cambiado → falla el smoke (`Expected: "viste-lagato-bigotes.png"`, `Received: "foto-bigotes.png"`); `console.error` en `Title` y en `DressUp` → fallan `boot.spec` y `audio.spec`; `restoreInto` sin outfit → falla el recargo total; `unlockSecret` sin guardar → falla el combo; `jump` que ignora el gato → falla `catalog`. Los hooks `jump`, `reset` y `park` se escribieron con su test en rojo primero (`TypeError: … is not a function`).

**Lote B: juice Media, Baja baratos y movimiento reducido**
7. **ADR 0013: movimiento reducido** (1 h, architect). Decide: valor inicial desde `prefers-reduced-motion` y botón que lo cambia (junto al de silencio), guardado en `SavePlugin` (migración del save v1 sin el campo), clave en `RegistryKeys`, una política pura `domain/motion.ts` que leen los objetos y sistemas, y qué cambia: sin sacudidas (`shake`, latigazos fuertes y temblores a 0 o al 30 %), **sin flashes** (el flash de la foto pasa a un fundido suave crema con alpha ≤ 0,3), iris → fundido cruzado de 300 ms, sin zoom de cámara en la entrada, partículas al 30 % y sin el arcoíris que barre. El gato sigue respirando y parpadeando (es su vida, no molesta). El hook suma `reducedMotion` y `setReducedMotion` (solo modo test). Lo valida el game-designer. **Hecha** (ADR 0013, `27679a6`).
8. **Tests en rojo del movimiento reducido** (2 h, writer). Unit: `motion.test.ts` (la política) y la migración en `saveCore`. Integración: `transitions` elige el fundido; el flash de la foto no es blanco. e2e `motion.spec.ts`: con `page.emulateMedia({ reducedMotion: 'reduce' })` arranca reducido; el botón lo cambia y suena; se mantiene al recargar; flujo Title → DressUp → Showcase → foto sin errores. *Aceptación*: los tests fallan por la razón correcta. **Hecha**: `motion.test.ts`, `motionService.test.ts`, `saveCore` y `transitions` en rojo antes del código; `tests/e2e/motion.spec.ts` con los 4 e2e del ADR.
9. **Implementar el movimiento reducido** (3–4 h, writer). Botón con hover, press y sonido; aplicar la política en `systems/transitions.ts`, `Cat` (sacudida al quitar, squash, latigazo), `comboFx`, `GiftBox`, `ShopEntrance` (zoom) y el flash del `Showcase`. *Aceptación*: los tests de la tarea 8 en verde y la cobertura de `systems/` ≥ 80 %. **Hecha**: `systems/motion.ts`, `plugins/motionService.ts` + `MotionPlugin`, `objects/MotionButton.ts`, hook `reducedMotion`/`motionPref`/`setMotionPref`, todos los efectos pasan por `motionProfile`.
10. **Juice Media del arrastre y el probador** (3–4 h, writer). Corazones que suben flotando con aro "pop"; el fantasma se inclina con la velocidad (helper puro `tiltToward` con lerp independiente de los fps, con TDD); acariciar al gato en DressUp (cooldown puro con TDD); hover en las prendas puestas; press de 4 px en pestañas y ✕; doble imagen con el imán (el fantasma se va a alpha 0 y la vista previa respira). *Aceptación*: tests de los helpers; la suite e2e sigue verde. **Hecha**: `domain/tilt.ts`, `domain/cooldown.ts`, corazones que flotan con aro, caricia, hover de capas (aclarado sin escala: la escala movería el hit test de las capas finas), imán sin doble imagen.
11. **Juice Media para guiar al jugador** (2–3 h, writer). Pista de primer uso (planificador puro con TDD: aparece a los 4 s, se repite cada 5 s y se apaga con el primer drop; e2e con el hook `hint`); en "¡Casi...!" el gato mira hacia la pestaña de la pieza que falta (TDD de la elección de pestaña); el globo "¡Casi...!" sale al costado y no tapa el cartel; "¡Arrastra el moño!" en un pill legible con flechita. *Aceptación*: tests en verde y nada tapa el cartel del nombre (captura). **Hecha**: `domain/hint.ts` (`HintPlanner`), `almostHint` en `domain/combos.ts`, globo "¡Casi...!" al costado con cola y mirada a la pestaña, pill con flechita en `GiftBox`.
12. **Juice Media del flujo y el sonido** (3–4 h, writer). Al cambiar de gato **se conserva el outfit** (primero se reescribe el e2e "changing cat starts naked" y el test de `domain/session.ts`; luego, pop escalonado de 80 ms por capa con cara feliz); el botón Iniciar no tapa las orejas del gatito; el ronroneo del Showcase se espacia (función pura `shouldPurr(poseIndex, rng)` con TDD) y la pose alterna squash, meneo y mirada; `minIntervalMs` por clave en `audioCore` (70 ms para el hover) y el tono que sube como un xilófono, con TDD. *Aceptación*: tests en verde; cobertura de `plugins/` ≥ 80 %. **Hecha**: `chooseCat` conserva el outfit (pop escalonado), Iniciar sin tapar orejas, `shouldPurr`/`flourishFor` (`domain/pose.ts`), `minIntervalMs` y `RisingPitch` en `audioCore`.
13. **Juice Media de la foto** (2–3 h, writer). La foto sale con la cara de la pose (test de integración que comprueba la expresión en `capture`); revelado: la miniatura cae girada, se queda 1,2 s y vuela "al bolsillo" (limpieza en `shutdown`; con movimiento reducido, solo aparece y se desvanece). *Aceptación*: test de integración en verde; `photo.spec` sigue verde. **Hecha**: `takePhoto` congela la pose `amor` (`Cat.freezeForPhoto`) y el Showcase muestra el revelado de la miniatura.
14. **Juice Media de los combos y el arte** (3–4 h, writer con `npm run art`). Arcoíris dentro del espejo (máscara o radio máximo); nieve visible y el pompón que rebota; las secretas se sienten especiales (brillito `mantequilla` cada 2–3 s cuando están puestas, más el arte de la bufanda arcoíris y de los lentes brillantes); iconos de pestaña de bufanda, mitón y sweater; lentes de sol (y de estrella y corazón) translúcidos para que se vean las expresiones; el globo dentro del espejo y meciéndose. *Aceptación*: checklist de `art-direction.md`; `schema` y e2e de catálogo y secretos en verde. **Hecha**: arcoíris dentro del espejo, nieve visible y pompón que rebota (`Cat.stretchUp`), brillito de secretas, iconos de pestaña, lentes de sol translúcidos, globo dentro del espejo y meciéndose (etiqueta `mece`, apagado en modo test), arte de bufanda y lentes brillantes. **El "destello que recorre el cristal" de los lentes brillantes no está hecho** (el SVG solo suma un brillo fijo): pasa a "Después del MVP" (ver abajo).
15. **Baja baratos que suman diversión** (3 h, writer). Sorpresa solo sobre la zona; la zona de soltar late; la celda hace pop al recibir la prenda que vuelve; idle extra (mirar a un lado, oreja) y coletazo espontáneo, con sus timers limpiados en `destroy`; Showcase sin ropa o muy vestido (`showcaseTitle(name, wornCount)` con TDD); "Clic para saltar ⏩" en un pill (y el texto de CatSelect); pasitos, puerta y campo del nombre con sonido; el maullido de la portada con su propio cooldown de 1,2 s; toast "¡Te guardé tu regalito!" al entregar la secreta al salir; el corazón de "enamorado" sale del globo; confeti real más generoso; burbuja "¡Foto lista!" a un costado; el cartel del Showcase no tapa el pompón; la taza de leche apoyada en la alfombra. *Aceptación*: tests de lo que tenga lógica; suite en verde. **Hecha** (los que tienen lógica con TDD; ver el resumen del lote), **salvo la taza de leche**: `art/clothes/accessory/taza-leche.svg` no se tocó en el lote B y sigue flotando. Se hace en los arreglos de la tarea 16 (Baja 2).
16. **Revisión del game-designer del lote B** (game-designer). Juega el juego con y sin movimiento reducido (screencast). Los Alta que salgan se arreglan con test antes de seguir con el lote C. Marca como hechos los ítems del backlog en `docs/game-design.md`. **Revisada (2026-10-21): 2 Alta pendientes**, ver abajo.

**Revisión game-designer (tarea 16, 2026-10-21, `6063198`..`1ff4f91`): no aprobada todavía, 2 arreglos Alta (S cada uno).** Revisé la evidencia del writer (`scratchpad/f9b/`) y grabé con Playwright a ~100 ms en `scratchpad/f9b-review/` (`sheet-rec-*.png` normal, `sheet-red-*.png` reducido, `globo-sway-pair.png` sin `?e2e=1`). **Lo que se siente bien**: el fantasma se inclina como tela y sin doble imagen con el imán (solo la vista previa que respira y el aro del ancla); la sorpresa aparece al entrar a la zona; la caricia (cara feliz y corazoncitos); la pista de primer uso (curva desde la primera celda, se apaga con el drop); "¡Casi...!" al costado de la cabeza sin tapar el cartel; Iniciar ya no aplasta las orejas (el gatito asoma por debajo); los lentes de sol dejan ver los ojos; los iconos de bufanda y mitón se leen; el globo se mece sin `?e2e=1`; el Showcase con la foto en pose `amor`, la miniatura que cae girada y vuela, y "¡Qué look tan completo…!"; el toast del regalito con el contador 0/6 → 1/6. **El modo reducido está aprobado**: todo cambio de escena es un fundido (pasa por un rosa plano ~300 ms, sin irises), la tienda sin zoom, el arcoíris entra con fundido, la miniatura aparece derecha y se desvanece, el botón está junto al silencio y nada se ve roto.

*Alta* (bloquean el cierre de la tarea 16; cada uno con su test antes del arreglo):
1. **El hover de las prendas puestas las destiñe** (`objects/Cat.ts`, `pointerover` con `setTint(0x303030)` + `TintModes.ADD`). En Phaser 4 el resultado no es un "aclarado": el sweater de rayas queda casi blanco y el contorno grueso pasa a gris (`f9b-review/hover-layer-n.png`). Como el cursor se queda sobre el gato al soltar, **cada prenda recién puesta se ve como un fantasma** justo en el momento del pop (`zoom-drag.png`, cuadros 3979–4182; también la bufanda en `sheet-rec-rainbow.png`). Va contra art-direction (contorno oscuro, colores planos) y hace dudar de si la prenda quedó puesta. **Arreglo**: sin tinte sobre el relleno; el hover se queda con el brillito `mantequilla` (ya existe vía `LayerHover`) y suma un halo suave `rosa-200` alrededor de la prenda (Phaser 4 `enableFilters()` + `addGlow`, o un borde de 3 px detrás generado del alpha de la capa). Además, no activar el hover hasta que el puntero se mueva después de un drop. *Test*: integración de `Cat` que tras `pointerover` el tint de la capa sigue neutro (`MULTIPLY`, `0xffffff`) y el hover queda marcado; tras `dragend` el hover no se activa sin movimiento.
2. **La nieve de "¡Look Navidad!" tapa el premio** (`objects/particleTextures.ts` y `comboFx.snowfall`). El copo es un círculo con una cruz `+` y parece un botón de "agregar", no nieve. `MIRROR` va de x 450 a 960 y el interior del espejo es ~485–915, así que caen copos sobre la pared. Con `speedY` 40–80 y vida de 4,2 s no llegan a la alfombra: se quedan flotando delante de la cara, del cartel "¡Look Navidad!" y del pill "¡Arrastra el moño!" hasta ~7 s (`f9b-review/rec-snow-n-20-5852.jpg` y `-25-7394.jpg`). **Arreglo**: copo blando sin cruz (punto blanco de 6–8 px con borde fino `lavanda` o asterisco de 6 brazos con puntas redondas); límites x al interior del espejo (o `GeometryMask` con su rectángulo); `speedY` 90–140, vida ~3 s y `alpha` a 0 al final para que caigan hasta la alfombra y se vayan; densidad `every(45)`; todo terminado en ≤ 5 s desde el combo. *Test*: unitario o integración de `snowfall` que el rango x cae dentro del espejo y que con `speedY.min` × vida el copo llega a la alfombra; el e2e de Navidad comprueba que el emisor ya no existe a los 5,5 s.

*Media* (dentro de F9, lote C o junto con los Alta):
1. **Arcoíris casi tapado (duda 5)**: con radio externo 212 solo asoman dos patitas a los lados del cuerpo; no se lee como arcoíris. Arreglo: arco **elíptico** detrás del gato desde la alfombra (rx ≤ 205, ry ≈ 470, `Graphics` con `scaleY` o puntos de una elipse) para que pase **por encima de la cabeza**, dentro del espejo y bajo el cartel; bandas de 14 px. En reducido, igual, con fundido.
2. **"¡Arrastra el moño!" a la altura del mentón (duda 4)**: tapa la mejilla y los bigotes (y la montura con lentes de estrella). Arreglo en `objects/GiftBox.ts`: bajar el pill justo encima del moño (≈ 50 px sobre él), sobre el sweater, con la flechita más corta. La cara del gato es el feedback principal y no se tapa.
3. **"¡Foto lista!" sale antes que la miniatura** y la tarjeta le pasa por encima al caer (`sheet-rec-reveal.png`, 0,77–1,12 s). Arreglo en `Showcase`: que la burbuja aparezca cuando la miniatura se asienta, debajo de ella.

*Baja* (baratos; si no entran en el lote C, a "Después del MVP"):
1. Los corazoncitos de la caricia suben hasta el cartel y tapan el nombre: limitar su altura (vida más corta) o emitirlos a los lados de la cabeza.
2. **La taza de leche sigue flotando** (no se hizo en la tarea 15): en `art/clothes/accessory/taza-leche.svg`, apoyarla en la alfombra junto a las patitas, como el ovillo; `npm run art`. Es S y se ve como un error, así que se hace.
3. En el combo de realeza `raiseChin` sigue a −4° (el backlog pedía −7°); el confeti sí quedó generoso.
4. Los corazones del drop se ven pocos y chicos sobre los sweaters rosa; si sobra tiempo, 2–3 brillitos `mantequilla` más en el mismo estallido.

*Dudas del writer*:
1. **Hover sin escala ×1,03**: sí (la escala movería el hit test de las prendas finas). **El aclarado con ADD: no**; ver Alta 1 (halo + brillito).
2. **Globo sin balanceo en modo test y en reducido**: sí. Verificado: sin `?e2e=1` se mece (`globo-sway-pair.png`).
3. **Sorpresa solo sobre la zona y ojos que siguen la prenda fuera**: sí, se nota el "¡la va a recibir!".
4. **Pill a la altura del mentón**: no; Media 2.
5. **Arcoíris de radio 212 casi tapado**: no; Media 1 (elipse que pasa sobre la cabeza).
6. **Reducido: pista en línea recta y arcoíris con fundido**: sí; se ve calmo y claro.
7. **Toast "¡Te guardé tu regalito!" y contador del Showcase**: sí; se lee y el contador sube. La estrellita que late en el próximo DressUp queda como Baja de "Después del MVP".
8. **Campos nuevos del hook**: de acuerdo, mientras sigan solo en modo test (ADR 0012).

Cuando estén los 2 Alta (con sus tests y la suite en verde), el writer deja capturas de antes y después del hover y de la nieve y el game-designer cierra la tarea 16 sin volver a revisar el resto.

**Lote C: rendimiento, Preloader, Firefox y 1920**
17. **Hook de rendimiento y tests en rojo** (2 h, writer). El hook (solo modo test) suma `perf`: `fps` (`game.loop.actualFps`), tweens activos, timers, objetos en la display list de las escenas activas, listeners del `EventBus`, del registry y del input, y `bootMs` (hasta el Title listo). e2e `perf.spec.ts`: los ciclos y la comparación ciclo 5 vs ciclo 2 de la Aceptación. Un contador de FPS visible con `?fps=1` (para la medición en la PC del usuario). *Aceptación*: el spec corre y deja escritos los números; si hay fuga, queda en rojo.
18. **Arreglar las fugas** (2–4 h, writer). Cada fuga que encuentre la tarea 17 se arregla en su `this.events.once('shutdown', …)` o en el `destroy` del objeto. *Aceptación*: `perf.spec` en verde.
19. **Carga y texturas** (2 h, writer; architect si hay atlas). Medir `bootMs` contra `npm run preview` (un segundo `webServer` en la config de Playwright o un proyecto `perf`), con caché fría: hoy son 131 SVG (972 KB) cargados uno a uno. Si pasa de 3 s, empaquetar en atlas (si eso cambia el pipeline del ADR 0006, el architect escribe el ADR antes). *Aceptación*: carga < 3 s registrada en el resumen y test que la comprueba.
20. **Pulir el Preloader** (1–2 h, writer). El ovillo aparece sin un cuadro en blanco antes; el progreso nunca retrocede (`yarnState` ya tiene tests); duración mínima de ~600 ms para que no parpadee cuando la carga es rápida (helper puro con TDD) y salida con un fundido; la fuente Fredoka ya está lista cuando aparece el texto; con movimiento reducido, el ovillo no rueda: solo se desenrolla. e2e en `boot.spec`: el Preloader se ve, el progreso llega a 1 y no hay errores. *Aceptación*: tests en verde y el game-designer lo da por bueno en la revisión final.
21. **Firefox y 1920** (2 h, writer). `npx playwright install firefox` (si no hay red o permiso, se anota en esta sección y se deja para el 🔒). Proyectos `firefox` y `chromium-1920` (viewport 1920 × 1080) que corren los tests marcados `@cross`: boot, smoke del flujo con descarga, soltar, rebote y quitar, pestañas, un combo completo, recargo con persistencia, silencio y movimiento reducido. Capturas de cada escena en 1920 (Chrome y Firefox) para el game-designer. *Aceptación*: `@cross` en verde en los 3 proyectos, 0 errores de consola.
22. **FPS** (1 h, writer o coordinator). Con `perf.fps`: 10 s arrastrando en DressUp y durante el combo arcoíris. En headless se registra; si el entorno tiene GPU (Chrome headed con GPU), se exige la mediana ≥ 55. Si no, se deja en la lista del 🔒 para el usuario con `?fps=1`. *Aceptación*: números en el resumen y el criterio aplicado.
23. **Revisión final del game-designer** (game-designer). Capturas de 1280 y 1920 en Chrome y Firefox, modo reducido, Preloader y pasada de juice completa, contra el checklist de `art-direction.md`. *Aceptación*: aprobado sin Alta pendientes.

**Cierre**
24. **DoD** (coordinator). `build`, `lint`, `test`, `coverage` y `e2e` (los 3 proyectos) en verde; 3 corridas completas de e2e sin flakes; 0 `.only`/`.skip`; sin listeners colgados (`perf.spec`).
25. **Entrega en localhost** (coordinator). `npm run dev` en segundo plano y la URL `http://localhost:8080` al usuario, con una lista corta de qué probar: el flujo entero, los 6 combos sin pistas, el botón de movimiento reducido, `?fps=1`, el sonido con auriculares y, si no se pudo automatizar, Firefox y 1920.
26. 🔒 **El usuario juega y aprueba** (usuario). Incluye la **prueba de oído**: nada estridente, el susurro de arrastre y el ronroneo no cansan. Lo que pida se convierte en arreglos con test, y se vuelve a la tarea 24.

#### Pasa a "Después del MVP" (del backlog de juice)
- **Detalles de la foto** (huellitas del fondo, contraste de los brillitos, fecha o "look nº X"): la foto ya fue aprobada y casi no se ven; el revelado (tarea 13) da más diversión por el mismo esfuerzo.
- **Corte de la cola y rubor del siamés**: solo se notan con zoom; a tamaño de juego no cambian la diversión.
- **Iris que se cierra sobre lo pulsado**: toca el sistema de transiciones de todas las escenas, justo cuando cambia por el movimiento reducido; el iris centrado ya cae sobre el gato. Riesgo alto, ganancia pequeña.
- **Sonido propio de campanitas**: necesita buscar y licenciar audio nuevo (ADR 0009, `CREDITS.md`); el arpegio actual está aprobado.
- **Rebote elástico en los extremos del scroll**: barato, pero cambia el comportamiento que prueban los e2e de scroll ("la rueda se detiene en ambos extremos") justo cuando se estabiliza la suite; queda para después.
- **Texto de ayuda más cerca del grid**: lo reemplaza la pista de primer uso (tarea 11).
- **Destello que recorre el cristal de los lentes brillantes** (revisión de la tarea 16): necesita una máscara animada por capa solo para una prenda; la secreta ya se siente especial con el brillito `mantequilla` cada 2–3 s y su marco dorado.
- **La estrellita del regalito entregado late en el próximo DressUp** (revisión de la tarea 16): el toast y el contador del Showcase ya avisan.

---

## Después del MVP
Monedas y compra real, caminar por la ciudad, minijuegos, más tiendas, cuentas y base de datos (Supabase, ADR 0004), logros, música y compartir en redes.
