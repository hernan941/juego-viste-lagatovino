# Roadmap: Viste Lagato (MVP y segunda etapa)

Mantenido por el agente `planner`. Principio: **diversión > funcionalidad**. Primero se hace algo pequeño pero muy divertido (vertical slice) y después se agrega amplitud.

🔒 = **aprobación final del usuario**. La tienen F9 (MVP) y F21 (segunda etapa). Las features intermedias las validan los agentes y se muestran como avance, sin bloquear.

La **segunda etapa** (F11 a F21) está más abajo, en "Segunda etapa: el loop de Viste Lagato".

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
16. **Revisión del game-designer del lote B** (game-designer). Juega el juego con y sin movimiento reducido (screencast). Los Alta que salgan se arreglan con test antes de seguir con el lote C. Marca como hechos los ítems del backlog en `docs/game-design.md`. **Revisada (2026-10-21): 2 Alta**, ver abajo. **Hecha (2026-10-21): los 2 Alta y los Media/Baja arreglados con su test primero** (hover y nieve `c853fa2` y `df34e55`, arcoíris `901c7db`, pill `c5fdb0b`, ¡Foto lista! `760a81d`, taza `33d573e`, corazones/drop/raiseChin `c3bae47`, e2e de la nieve en tiempo de juego `0a67862`). Capturas antes/después en `scratchpad/f9b-fix/` (`before/`, `after/`, `a-*.png`, `b-*.png`). Pendiente: el game-designer da el visto bueno final a las capturas.

**Revisión game-designer (tarea 16, 2026-10-21, `6063198`..`1ff4f91`): no aprobada todavía, 2 arreglos Alta (S cada uno).** Revisé la evidencia del writer (`scratchpad/f9b/`) y grabé con Playwright a ~100 ms en `scratchpad/f9b-review/` (`sheet-rec-*.png` normal, `sheet-red-*.png` reducido, `globo-sway-pair.png` sin `?e2e=1`). **Lo que se siente bien**: el fantasma se inclina como tela y sin doble imagen con el imán (solo la vista previa que respira y el aro del ancla); la sorpresa aparece al entrar a la zona; la caricia (cara feliz y corazoncitos); la pista de primer uso (curva desde la primera celda, se apaga con el drop); "¡Casi...!" al costado de la cabeza sin tapar el cartel; Iniciar ya no aplasta las orejas (el gatito asoma por debajo); los lentes de sol dejan ver los ojos; los iconos de bufanda y mitón se leen; el globo se mece sin `?e2e=1`; el Showcase con la foto en pose `amor`, la miniatura que cae girada y vuela, y "¡Qué look tan completo…!"; el toast del regalito con el contador 0/6 → 1/6. **El modo reducido está aprobado**: todo cambio de escena es un fundido (pasa por un rosa plano ~300 ms, sin irises), la tienda sin zoom, el arcoíris entra con fundido, la miniatura aparece derecha y se desvanece, el botón está junto al silencio y nada se ve roto.

*Alta* (**hechos**, `c853fa2` + `df34e55`; el halo quedó como copias planas rosa-200 porque el glow de filtros dejaba pelusa oscura en el contorno; el globo, que se mece, solo lleva el brillito):
1. **El hover de las prendas puestas las destiñe** (`objects/Cat.ts`, `pointerover` con `setTint(0x303030)` + `TintModes.ADD`). En Phaser 4 el resultado no es un "aclarado": el sweater de rayas queda casi blanco y el contorno grueso pasa a gris (`f9b-review/hover-layer-n.png`). Como el cursor se queda sobre el gato al soltar, **cada prenda recién puesta se ve como un fantasma** justo en el momento del pop (`zoom-drag.png`, cuadros 3979–4182; también la bufanda en `sheet-rec-rainbow.png`). Va contra art-direction (contorno oscuro, colores planos) y hace dudar de si la prenda quedó puesta. **Arreglo**: sin tinte sobre el relleno; el hover se queda con el brillito `mantequilla` (ya existe vía `LayerHover`) y suma un halo suave `rosa-200` alrededor de la prenda (Phaser 4 `enableFilters()` + `addGlow`, o un borde de 3 px detrás generado del alpha de la capa). Además, no activar el hover hasta que el puntero se mueva después de un drop. *Test*: integración de `Cat` que tras `pointerover` el tint de la capa sigue neutro (`MULTIPLY`, `0xffffff`) y el hover queda marcado; tras `dragend` el hover no se activa sin movimiento.
2. **La nieve de "¡Look Navidad!" tapa el premio** (`objects/particleTextures.ts` y `comboFx.snowfall`). El copo es un círculo con una cruz `+` y parece un botón de "agregar", no nieve. `MIRROR` va de x 450 a 960 y el interior del espejo es ~485–915, así que caen copos sobre la pared. Con `speedY` 40–80 y vida de 4,2 s no llegan a la alfombra: se quedan flotando delante de la cara, del cartel "¡Look Navidad!" y del pill "¡Arrastra el moño!" hasta ~7 s (`f9b-review/rec-snow-n-20-5852.jpg` y `-25-7394.jpg`). **Arreglo**: copo blando sin cruz (punto blanco de 6–8 px con borde fino `lavanda` o asterisco de 6 brazos con puntas redondas); límites x al interior del espejo (o `GeometryMask` con su rectángulo); `speedY` 90–140, vida ~3 s y `alpha` a 0 al final para que caigan hasta la alfombra y se vayan; densidad `every(45)`; todo terminado en ≤ 5 s desde el combo. *Test*: unitario o integración de `snowfall` que el rango x cae dentro del espejo y que con `speedY.min` × vida el copo llega a la alfombra; el e2e de Navidad comprueba que el emisor ya no existe a los 5,5 s.

*Media* (**hechos**: 1 `901c7db`, 2 `c5fdb0b`, 3 `760a81d`):
1. **Arcoíris casi tapado (duda 5)**: con radio externo 212 solo asoman dos patitas a los lados del cuerpo; no se lee como arcoíris. Arreglo: arco **elíptico** detrás del gato desde la alfombra (rx ≤ 205, ry ≈ 470, `Graphics` con `scaleY` o puntos de una elipse) para que pase **por encima de la cabeza**, dentro del espejo y bajo el cartel; bandas de 14 px. En reducido, igual, con fundido.
2. **"¡Arrastra el moño!" a la altura del mentón (duda 4)**: tapa la mejilla y los bigotes (y la montura con lentes de estrella). Arreglo en `objects/GiftBox.ts`: bajar el pill justo encima del moño (≈ 50 px sobre él), sobre el sweater, con la flechita más corta. La cara del gato es el feedback principal y no se tapa.
3. **"¡Foto lista!" sale antes que la miniatura** y la tarjeta le pasa por encima al caer (`sheet-rec-reveal.png`, 0,77–1,12 s). Arreglo en `Showcase`: que la burbuja aparezca cuando la miniatura se asienta, debajo de ella.

*Baja* (**hechos**: 1 y 4 `c3bae47`, 2 `33d573e`, 3 `c3bae47`: raiseChin a −7°, como pedía el backlog):
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

### F10. Soporte para celular (ADR 0014)
- **Estado**: Hecha (commits `07bff98` a `9c70909`; se hizo fuera de este roadmap).
- **Deuda detectada al planificar la segunda etapa**: `playwright.config.ts` **no tiene** el proyecto de emulación móvil en horizontal que pide el ADR 0014 §8 (solo `chromium`, `firefox`, `chromium-1920` y `load`). Se salda en **F11.16**, antes de que las features nuevas sumen sus pruebas `@mobile`.

---

## Segunda etapa: el loop de Viste Lagato

Fuente: `docs/design/segunda-etapa.md` (game-designer, aprobado por el usuario). Las referencias "S0…S8" y "§N" apuntan a ese documento. Nada de esta sección repite sus números de diseño: **el documento de diseño manda** en tiempos de animación, textos, precios y tablas; aquí solo se dice qué se construye, en qué orden, quién lo hace y cómo se verifica.

**Abreviaturas**: *writer* = `phaser-code-writer` (también hace el arte SVG, ADR 0006, con `npm run art` y `art/tools/build-art.mjs`); *arch* = `architect`; *GD* = `game-designer`; *coord* = sesión principal (coordinator).

**Mapa de features**
```
F11 Cimientos (ADRs, contrato de datos, guardado v2, controladores de DressUp)
 ├─► F12 Estética Lagatovino: kit de UI y arte (S7a, S7b, piezas del llavero, espigón)
 ├─► F13 Botones y tienda en el probador (S3) ─┐
 ├─► F14 Gustos de cada gato (S2) ────────────┼─► Hito A: el loop jugable
 ├─► F15 Kofi califica: la pasarela (S1) ─────┘
 ├─► F16 Tintes (S4) ─────────┐
 ├─► F17 Álbum (S5) ──────────┼─► Hito B: profundidad
 ├─► F18 Modo foto (S6) ──────┘
 ├─► F19 El llavero (S8) ─────────► Hito C: el cierre
 └─► F20 Repintar las escenas (S7c)
                                   F21 Cierre y entrega en localhost 🔒
```
Los hitos A, B y C se muestran al usuario como avance (sin bloquear). La única aprobación obligatoria es F21.8 🔒.

### Reglas comunes a todas las tareas de la segunda etapa
Valen para cada tarea aunque no se repitan en ella.
1. **TDD (ADR 0012)**: cada tarea con lógica **empieza** escribiendo los tests que fallan (se deja constancia del rojo en el resumen) y después implementa. Lógica pura en `domain/` (unit, ≥ 90 %), servicios en `plugins/` y `systems/` (≥ 80 %), objetos y escenas con tests de integración (Phaser headless o mocks). Prohibido `.only`, `.skip` o borrar tests.
2. **Un PR por tarea**: al integrarla pasan `npm run build`, `npm run lint`, `npm run test`, `npm run coverage` y los specs e2e que la tarea toca o que cubren su escena. El juego sigue jugable de punta a punta después de cada integración.
3. **PC y celular (ADRs 0008 y 0014)**: todo lo interactivo tiene hover como adorno y **press obligatorio** (escala, sonido); área de toque ≥ 80 unidades del juego (helper de `systems/touch.ts`); botones de hojas y cajas ≥ 88 de alto; nada depende del hover; lo que se arrastra usa el levantado sobre el dedo. Cada feature suma tests `@mobile` (ver F11.16) y, donde aplique, `@cross`.
4. **Movimiento reducido (ADR 0013)**: todo efecto nuevo pasa por `motionProfile` y tiene su variante descrita en el diseño. Se prueba en integración.
5. **Data-driven**: ningún número de balance, precio, tiempo de juego ni texto queda escrito en el código: van a los JSON (`economy.json`, `dyes.json`, `sets.json`, `photo.json`, `brand.json`) o a los módulos de textos.
6. **Limpieza**: listeners, timers y tweens nuevos se limpian en `shutdown` o en `destroy`; `perf.spec` debe seguir en verde.
7. **Revisión**: cada feature termina con su revisión `FN.R` del GD. Los arreglos **Alta** que salgan se hacen con su test antes de cerrar la feature; lo Media y lo Baja van al "Backlog de juice" de `docs/game-design.md`.
8. **Archivos calientes**: solo los tocan las tareas que se indican en la tabla de abajo. Si una tarea descubre que necesita tocar otro archivo caliente, **no lo toca**: lo informa en su resumen y la sesión principal decide el orden.
9. **Textos**: los textos nuevos viven en módulos por feature (`domain/copy/<feature>.ts`, ver F12.4), no en un único `copy.ts`. Los helpers de e2e nuevos viven en `tests/e2e/helpers/<feature>.ts`, no en `helpers.ts`.
10. **Placeholders**: F11.10 crea un SVG provisional para cada textura nueva que los JSON referencian y que todavía no existe. Las tareas de arte **reemplazan** esos archivos sin tocar código ni JSON.

### Archivos calientes y orden de integración
| Archivo | Tareas que lo tocan (en orden de integración) | Nota |
|---|---|---|
| `src/game/domain/types.ts` | F11.8 → (solo agregados mínimos y avisados) | F11.8 declara **todos** los tipos de la etapa. |
| `src/game/constants.ts` | F11.8 (claves) → F12.1 (tokens y fuentes) → F12.11 (`SfxKeys`) → F20.7 (limpieza) | Bloques distintos: el conflicto es de texto, no de lógica. Los tokens nuevos van en un namespace propio hasta F20.7 (hay nombres repetidos con valores distintos, por ejemplo `cielo`). |
| `src/game/data/schema.ts` y `tests/unit/schema.test.ts` | F11.9 → F11.10 | Cada uno agrega su propia función validadora. Los tests de balance van en archivos propios (`scoreBalance.test.ts`, `balance.test.ts`). |
| `src/game/data/clothes.json`, `economy.json`, `dyes.json` | F11.9 → F21.1 (ajuste de balance) | Nadie más cambia números. |
| `src/game/data/cats.json`, `sets.json`, `photo.json`, `brand.json` | F11.10 → F12.12 (nombres del juez y la vendedora) → F21.1 | |
| `src/game/data/assets.ts` y `scenes/Preloader.ts` | F11.10 (manifiesto) → F12.1 (fuentes) → F20.1 (repintado) | El manifiesto se deriva de los JSON: las tareas de arte no lo tocan. |
| `src/game/plugins/saveCore.ts`, `saveService.ts`, `SavePlugin.ts` | F11.11 | Ninguna feature cambia el formato después. |
| `src/game/e2eHook.ts` y `tests/e2e/helpers.ts` | F11.12 → F11.13 | Después, cada escena y cada controlador publica su estado en su propio archivo (contrato de F11.13). |
| `src/game/scenes/DressUp.ts` | F11.13 → F11.14 → F20.5 | Las features **no** tocan `DressUp.ts`: crean su controlador en `objects/dressup/` y agregan una línea en `objects/dressup/controllers.ts`. |
| `src/game/objects/dressup/controllers.ts` | S3: F13.3 → F13.4 → F13.5 → F13.6; S2: F14.2 → F14.3 → F14.4 → F14.5; S4: F16.3 → F16.4 → F16.5; luego F17.6 | **Orden S3 → S2 → S4** (§7 del diseño). Dentro de una ola se integra en este orden aunque las tareas se hayan desarrollado en paralelo. |
| `src/game/objects/Cat.ts` | F12.6 (solo si la cara nueva lo pide) → F11.15 → F20.5 | F11.15 agrega de una vez la API que necesitan S2, S4, S6 y S8. |
| `src/game/objects/ItemGrid.ts`, `ClothingItem.ts`, `Tabs.ts`, `LayersPanel.ts` | F11.13 (puntos de extensión) → F12.2 (estilo de pestañas) → F16.4 (solo `LayersPanel.ts`, si le falta un punto de extensión) → F20.5 | Las features decoran celdas y pestañas por la API de F11.13, sin editar estos archivos. |
| `src/game/scenes/Showcase.ts` | F15.4 → F17.6 → F20.6 | |
| `src/game/main.ts` (lista de escenas) | F12.9 (escena de laboratorio, solo dev) → F17.2 → F18.2 | Agregar una línea; conflicto trivial. |
| `src/game/systems/transitions.ts`, `irisShapes.ts` | F17.2 (iris ✦) → F18.2 (fundido crema) | |
| `src/game/domain/progress.ts` | F13.2 → F17.5 | |
| `src/game/domain/pose.ts` | F18.1 | |
| `art/tools/build-art.mjs` | F12.5 → (otras tareas de arte, solo si les hace falta y avisando) | |
| `public/assets/audio/` y `CREDITS.md` | F12.11 | |
| `playwright.config.ts` | F11.16 | |
| `tests/e2e/flow.spec.ts` | F15.4 (la descarga pasa a PhotoMode) → F21.2 | |

### Oleadas de paralelización
Cada ola arranca cuando su ola anterior está **integrada** (salvo las cadenas internas que se indican). Dentro de una ola, todas las tareas corren a la vez en worktrees aislados y se integran en el orden que se indica.

**Ola 0: decisiones** (arch; ningún código)
- F11.1 ADR 0015 Alcance · F11.2 ADR 0016 Arte Lagatovino · F11.3 ADR 0017 Guardado v2 y reglas en JSON (absorbe el 0020 si se fusiona) · F11.4 ADR 0018 Teñido · F11.5 ADR 0019 Flujo de escenas v2 y contrato de controladores · F11.6 ADR 0021 El llavero (queda Propuesto hasta F12.10).
- F11.7 Actualizar el alcance en `CLAUDE.md` y `docs/game-design.md` (coord, con el visto bueno del usuario; no bloquea nada).
- *Integración*: cualquier orden (archivos distintos). Las tareas de código de la ola 1 que necesitan un ADR esperan a que esté **Aceptado**; el arte de la ola 1 puede empezar con el borrador del 0016.

**Ola 1: cimientos sin datos y arte** (todo en paralelo)
- F11.8 Tipos y claves de la etapa **(ruta crítica)**
- F11.16 Proyecto Playwright móvil (deuda de F10)
- F12.1 Tokens v2 y fuentes autoalojadas
- F12.5 Gatos B: trazo de tinta · F12.6 Gatos B: cara nueva y `puaj` · F12.7 Prendas: contorno de tinta y marcas `data-dye`
- F12.8 Arte del llavero · F12.9 Espigón técnico de porcelana
- F12.11 Sonidos nuevos (CC0)
- F12.13 Arte de la tienda y los tintes · F12.14 Arte del álbum y del modo foto · F12.15 Arte de la pasarela
- F12.12 Arte del juez y la vendedora (**bloqueada** por la pregunta abierta; arranca cuando el usuario responda, en cualquier ola)
- *Integración*: F11.8 → F12.1 → F12.11 (los tres tocan `constants.ts`); F12.5 → F12.6 → F12.7 (pipeline de arte); el resto en cualquier orden.

**Ola 2: contrato de datos, guardado, controladores y dominio** (necesita F11.8)
- Datos y guardado: F11.9 Datos de la tienda · F11.10 Datos de gustos, álbum, foto y personajes · F11.11 Guardado v2 y migración · F11.12 Hook e2e v2 (cadena interna: **F11.11 → F11.12**)
- DressUp y Cat: F11.13 Controladores de DressUp **(ruta crítica, bloqueante para S2/S3/S4)** · F11.14 Mover secretos y pista a controladores (cadena interna: **F11.13 → F11.14**) · F11.15 API de `Cat` para la etapa (necesita F12.6)
- Kit: F12.2 Botón píldora y pestañas índice · F12.3 Tarjetas, polaroid, burbuja y papel · F12.4 La voz y los personajes por datos
- Arquitectura: F12.10 ADR 0021 aceptado (necesita F12.9)
- Dominio (módulos sin conflictos entre sí): F13.1 `economy.ts` · F14.1 `tastes.ts` · F15.1 `score.ts` · F15.2 `ceremony.ts` · F16.1 `dye.ts` · F17.1 `album.ts` · F18.1 `photo.ts` y `pose.ts` · F19.1 `keychain.ts`
- *Integración*: F11.9 → F11.10 (`schema.ts`); F11.11 → F11.12 → F11.13 → F11.14 (`e2eHook.ts` y `DressUp.ts`); F11.15 después de F11.13 (los dos tocan la forma en que `DressUp` usa `Cat`); el kit y el dominio en cualquier orden. Los tests del dominio que usan **datos reales** (F15.1 balance de estrellas, F16.1 marcas en los SVG) se integran después de F11.9/F11.10 y F12.7.

**Ola 3: primeras piezas en escena** (necesita F11.9 a F11.15)
- F13.2 `progress.ts` (la coreografía) · F13.3 Monedero y vuelo de botones · F13.4 Etiquetas de precio y probar gratis
- F14.2 Reacciones de gusto al soltar
- F15.3 Objetos de la ceremonia
- F16.2 Texturas teñidas
- F17.2 Escena Album (esqueleto) · F18.2 Escena PhotoMode (esqueleto)
- F19.2 Objeto `Keychain`
- F20.1 Repintar Preloader · F20.2 Repintar ShopEntrance · F20.4 Repintar CatSelect
- F12.R Revisión GD de la estética
- *Integración*: en `controllers.ts`, F13.3 → F13.4 → F14.2; en `main.ts`, F17.2 → F18.2; el resto en cualquier orden.

**Ola 4: Hito A, el loop jugable** (necesita la ola 3)
- F13.5 Comprar tocando la etiqueta · F14.3 Descubrir paga (chip a la ficha y primer combo) · F14.4 Ficha del gato
- F15.4 **Showcase como pasarela (cierra la ruta crítica)**
- F16.3 Pestaña Tintes y arrastrar un frasco (se desarrolla en paralelo y se integra **al final** de la ola)
- F17.3 Álbum: Prendas y Tintes · F17.4 Álbum: Gatos y Looks especiales
- F18.3 Fondos, marcos y poses · F18.4 Stickers
- *Integración*: `controllers.ts` en orden F13.5 → F14.3 → F14.4 → F16.3; F15.4 en cuanto esté; álbum y foto en cualquier orden (cada página en su archivo).

**Ola 5: el loop completo y la profundidad**
- F13.6 La caja de la vendedora al ¡Listo! · F14.5 El gato nuevo "lee" el outfit · F15.5 e2e de la calificación · F13.8 Jugador modelo y `balance.test`
- F16.4 El barrido del color y las reacciones
- F17.5 Portada, porcentaje, sets e hitos
- F18.5 Guardar la foto compuesta
- F19.3 La transformación en llavero
- *Integración*: `controllers.ts` en orden F13.6 → F14.5 → F16.4; F18.5 antes que F19.3 (los dos tocan `PhotoMode.ts`; F19.3 se puede desarrollar en paralelo y rebasar).

**Ola 6: verificación del Hito A y segunda capa**
- F13.7 e2e de la tienda · F14.6 e2e de los gustos · F13.R, F14.R y F15.R Revisiones GD (Hito A, se muestra al usuario)
- F16.5 Comprar tintes
- F17.6 Botón del cuaderno en DressUp y Showcase
- F18.6 e2e del modo foto
- F19.4 El empaque, el PNG y [Colgarlo] · F19.5 Pestaña Colgador
- *Integración*: `controllers.ts` F16.5 → F17.6; `PhotoMode.ts` F19.4 después de F19.3; `Album.ts` F19.5 después de F17.5.

**Ola 7: cierre de las features**
- F16.6 e2e de tintes · F17.7 e2e del álbum · F19.6 e2e del llavero
- F16.R, F17.R, F18.R, F19.R Revisiones GD (Hitos B y C, se muestran al usuario)
- F20.3 Repintar Title (con "Mi álbum") · F20.5 Repintar DressUp · F20.6 Repintar Showcase
- *Integración*: F20.5 y F20.6 al final de la ola (son los que más tocan).

**Ola 8: cierre de la etapa** (en orden)
- F20.7 Retirar tokens viejos y Fredoka → F20.R Revisión GD del repintado
- F21.1 Balance final → F21.2 e2e del loop completo → F21.3 Suite completa estable → F21.4 Rendimiento y fugas → F21.5 Revisión final GD → F21.6 DoD → F21.7 Entrega en localhost → F21.8 🔒

### Ruta crítica
```
ADR 0017 + ADR 0019 (F11.3, F11.5)
  → F11.8 Tipos y claves
  → F11.9 / F11.10 Datos  +  F11.11 Guardado v2 → F11.12 Hook → F11.13 Controladores de DressUp
  → S1 + S2 + S3 en paralelo:
       F15.1 score  + F15.2 ceremony → F15.3 objetos de la ceremonia ─┐
       F14.1 tastes → F14.2 reacciones ───────────────────────────────┤
       F13.1 economy → F13.2 progress + F13.3 monedero + F13.4 etiquetas ┤
  → F15.4 Showcase como pasarela  (= el "para qué" existe)
  → F13.5 comprar + F13.6 caja  → F15.R revisión del loop (Hito A)
```
El arte (F12.5 a F12.8, F12.13 a F12.15) y el espigón de porcelana (F12.9) arrancan en la ola 1 y **no** están en la ruta crítica, pero F12.9 es el único riesgo técnico de S8: si falla, F12.10 lo resuelve antes de F19.2.

### Pregunta abierta: Kofi y Catalina
Se está consultando con el usuario (§9.1 del diseño). **No bloquea nada**:
- el juez y la vendedora se definen en `src/game/data/brand.json` (`judge` y `seller`: `name`, `texture`, `signature` y claves de sus líneas), creado en F11.10 con **valores provisionales genéricos** (un "gato supervisor" y una vendedora sin nombre, solo voz y mano), y los textos usan `{judge}` y `{seller}` (F12.4);
- el arte provisional es un placeholder (F11.10) y un dibujo genérico mínimo en F15.3;
- **F12.12** (arte definitivo del juez y de la vendedora, y los nombres en `brand.json`) queda **bloqueada** hasta la respuesta. Si es "sí", se dibuja a Kofi según la foto o la descripción y se ponen "Kofi" y "Catalina" (y "Hecho a mano por Cata" en el reverso); si es "no", se pulen los genéricos. En ningún caso se toca código.

### Fuera del plan
- **Integración web con lagatovino.com**: la hace el usuario. Este plan no la toca (el juego se sigue entregando en localhost).
- **Pedidos de clientes**: rechazados expresamente (ADR 0015).
- Los *nice to have* de cada ficha del diseño quedan en "Después de la segunda etapa" (al final de este documento), salvo que una revisión del GD los suba con su razón.

---

### F11. Cimientos de la segunda etapa
- **Objetivo**: que todas las features nuevas puedan construirse en paralelo sin pisarse: decisiones escritas, contrato de datos, guardado v2 y un DressUp dividido en controladores.
- **Entregables**: ADRs 0015 a 0019 y 0021; tipos y claves; JSON nuevos con su schema; guardado v2 con migración; hook e2e v2; controladores de DressUp; API nueva de `Cat`; proyecto Playwright móvil.
- **Aceptación**: el juego se ve y se juega **exactamente igual** que en el MVP (toda la suite e2e verde), pero los datos, el guardado y DressUp ya están listos para S1 a S8.
- **Depende de**: F9 y F10 Hechas.
- **Agentes**: arch (ADRs), writer, coord (alcance en `CLAUDE.md`).
- **Tamaño**: L (16 tareas chicas)
- **Estado**: Pendiente

#### Tareas

##### F11.1. ADR 0015: alcance de la segunda etapa
- **Agente**: arch · **Tamaño**: S · **Ola**: 0 · **Estado**: En curso (el arch lo escribe en paralelo)
- **Objetivo**: dejar escrito qué entra (monedas, compra, calificación, gustos, tintes, álbum, modo foto, llavero y colgador) y qué queda **descartado** (pedidos de clientes).
- **Entregables**: `docs/adr/0015-*.md` y su fila en `docs/adr/README.md`.
- **Aceptación**: Aceptado; nombra los ADRs que amplía.
- **Depende de**: nada. **Conflictos**: `docs/adr/README.md` (todas las tareas de ADR agregan una fila; conflicto trivial).

##### F11.2. ADR 0016: dirección de arte Lagatovino
- **Agente**: arch · **Tamaño**: M · **Ola**: 0 · **Estado**: En curso
- **Objetivo**: reemplazar las secciones de `art-direction.md` que cambian (§6.2 a §6.4 del diseño): cara, trazo de tinta, paleta de UI, tipografías (Londrina Solid y Gaegu; sale Fredoka), botón plano y arte del llavero. Los gatos jugables pasan a la opción B y **no** se convierten en llaveros.
- **Entregables**: `docs/adr/0016-*.md`; `docs/art-direction.md` v2 con el checklist §10 v2.
- **Aceptación**: Aceptado; el checklist v2 es verificable pieza por pieza (lo usan F12.R y F20.R).
- **Depende de**: nada. **Conflictos**: `docs/art-direction.md` (solo esta tarea).

##### F11.3. ADR 0017: progreso, guardado v2 y reglas en JSON (incluye el 0020 si se fusiona)
- **Agente**: arch · **Tamaño**: M · **Ola**: 0 · **Estado**: En curso
- **Objetivo**: fijar `SAVE_VERSION` 2, sus campos (`wallet`, `owned`, `dyesOwned`, `itemDye`, `tastesFound`, `bestStars`, `ratedLooks`, `keychains` como receta, `secrets`), la migración desde v1 (§4 "Qué empieza desbloqueado"), qué se escribe al instante (compras y descubrimientos), qué se **deriva** (desbloqueos del modo foto y sets), los JSON de reglas y su validación, y el test de balance como guardián. Decide también **cuándo se pagan los +40 del primer combo** (supuesto del plan: al abrir la cajita en DressUp, F14.3).
- **Entregables**: `docs/adr/0017-*.md` (y, si no se fusiona, `0020-*.md`). Si el usuario lo confirma, el ADR 0004 pasa a Aceptado.
- **Aceptación**: Aceptado; la forma del save es compatible con las tablas futuras del ADR 0004.
- **Depende de**: nada. **Conflictos**: ninguno.

##### F11.4. ADR 0018: teñido por recoloreado de SVG
- **Agente**: arch · **Tamaño**: S · **Ola**: 0 · **Estado**: En curso
- **Objetivo**: marcas `data-dye="a|b"`, `recolorSvg` puro, rasterizado perezoso con clave `texture~dye`, caché con tope y LRU, cómo se carga el SVG modificado sin bloquear el arrastre; no se usa el tinte de Phaser.
- **Entregables**: `docs/adr/0018-*.md`.
- **Aceptación**: Aceptado; fija el tope de la caché y el tiempo máximo aceptable de rasterizado en el celular (lo verifica F21.4).
- **Depende de**: nada. **Conflictos**: ninguno.

##### F11.5. ADR 0019: flujo de escenas v2 y contrato de controladores
- **Agente**: arch · **Tamaño**: M · **Ola**: 0 · **Estado**: En curso
- **Objetivo**: Album y PhotoMode nuevas; Showcase como pasarela; la caja como capa de DressUp; parámetro `from` (y `tab`, `hang`) para volver; iris ✦ y fundido crema. **Además** (pedido de este plan, para paralelizar): (1) el contrato de los **controladores de DressUp** (interfaz, contexto que reciben, eventos de escena `item-dropped`, `item-removed`, `ready-pressed`, `outfit-changed`, `cat-changed`, cómo decoran celdas y pestañas, cómo publican su estado e2e y cómo interceptan la salida con `beforeLeave`); (2) que los controladores **no se importan entre sí**: se hablan por eventos de escena y por el servicio de progreso; (3) los datos que viajan DressUp → Showcase → PhotoMode → Album.
- **Entregables**: `docs/adr/0019-*.md`.
- **Aceptación**: Aceptado; el contrato es lo bastante concreto para que F11.13 lo implemente sin decisiones nuevas.
- **Depende de**: nada. **Conflictos**: ninguno.

##### F11.6. ADR 0021: el llavero como tratamiento del render
- **Agente**: arch · **Tamaño**: S · **Ola**: 0 (Propuesto) y F12.10 (Aceptado) · **Estado**: En curso
- **Objetivo**: borde de porcelana con copias planas, ColorMatrix de Phaser 4, barniz recortado a la silueta, herrajes en SVG, receta guardada y re-renderizada, péndulo puro, presupuesto de rendimiento en el celular.
- **Entregables**: `docs/adr/0021-*.md` en estado Propuesto.
- **Aceptación**: deja escritas las preguntas que el espigón (F12.9) tiene que responder con números.
- **Depende de**: nada. **Conflictos**: ninguno.

##### F11.7. Alcance actualizado en `CLAUDE.md` y `game-design.md`
- **Agente**: coord · **Tamaño**: S · **Ola**: 0 · **Estado**: Pendiente
- **Objetivo**: que "Alcance" y "Fuera del MVP" reflejen el ADR 0015 (con el visto bueno del usuario, porque es su archivo de reglas).
- **Entregables**: `CLAUDE.md`, `docs/game-design.md` (sección "Economía" y "Fuera del MVP").
- **Aceptación**: no contradicen al ADR 0015. **Depende de**: F11.1. **Conflictos**: ninguno. No bloquea ninguna tarea.

##### F11.8. Tipos y claves de la etapa
- **Agente**: writer · **Tamaño**: S · **Ola**: 1 · **Ruta crítica**
- **Objetivo**: que todas las tareas siguientes importen tipos y claves estables desde el día 1.
- **Entregables**:
  - `src/game/domain/types.ts`: `ItemTier`, `CatPrefs`, `DyeDef`, `EconomyRules` (scoring, prices, payout, milestones, novelty, discoveryBonus, comboBonus, startWallet), `SetDef`, `PhotoCatalog` (backgrounds, frames, stickers, poses, keychain), `CharacterDef`, `Progress`, `RatingResult` y `BreakdownLine`, `ProgressEvent` (`coins`, `milestone`, `tasteFound`, `comboFirst`, `setCompleted`, `unlock`), `KeychainRecipe`, `ItemDye`; campos nuevos opcionales en `ClothingDef` (`tier`, `starter`, `dyeable`) y `CatDef` (`prefs`).
  - `src/game/constants.ts`: `SceneKeys.Album` y `SceneKeys.PhotoMode`; `RegistryKeys` nuevas (por ejemplo `ItemDye`, `LastRating`); `Events`/`DressUpEvents` del contrato de F11.5; `TextureKeys` de las texturas nuevas de UI. **No** agrega `SfxKeys` (F12.11) ni tokens (F12.1).
- **Aceptación**: `npm run lint` (typecheck) pasa; un test de tipos mínimo (`tests/unit/types.test.ts` con `expectTypeOf`) que falla antes; nada cambia en el juego.
- **Depende de**: F11.3, F11.5. **Conflictos**: `constants.ts` con F12.1 y F12.11 (integrar F11.8 primero).

##### F11.9. Datos de la tienda: economía, niveles y tintes
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Objetivo**: los números de la economía y la tienda en JSON validado.
- **Entregables**: `src/game/data/economy.json` (todo §3 S1 "Datos" y §4); `clothes.json` con `tier`/`starter` (las 16 iniciales y los 3 niveles de §3 S3) y `dyeable: true` en los 16 sweaters visibles; `src/game/data/dyes.json` (10 frascos + agua, rosa inicial); `data/schema.ts` con `validateEconomy`, `validateDyes` y las reglas de S3 "Datos" (toda visible tiene `tier` o `starter`, las secretas no, las iniciales permiten el combo galáctico).
- **Aceptación**: tests en `tests/unit/schema.test.ts` escritos antes: un JSON roto de cada tipo falla con un mensaje claro; las 16 iniciales y los 28 bloqueados coinciden con el diseño; cobertura de `data/` ≥ 90 %.
- **Depende de**: F11.8. **Conflictos**: `schema.ts` y `schema.test.ts` con F11.10 (integrar F11.9 primero).

##### F11.10. Datos de gustos, álbum, foto y personajes, y manifiesto
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Objetivo**: el resto de los datos y que el Preloader los cargue sin que nadie toque código después.
- **Entregables**: `cats.json` con `prefs` (tabla de §3 S2); `sets.json` (7 sets de §3 S5); `photo.json` (fondos, marcos, stickers, poses y `keychain`, con su `unlock`); `brand.json` (juez y vendedora provisionales, ver "Pregunta abierta"); `schema.ts` con las validaciones de S2 "Datos" (tags que existen en prendas visibles, favorito visible, color en `dyes.json`), de sets (ids que existen) y de foto (recompensas que apuntan a ids de `photo.json`); `data/assets.ts` (`buildManifest` suma frascos, assets de foto, piezas del llavero, personajes y la UI nueva); **SVG provisionales** en `art/` para cada textura que todavía no exista (regla común 10), con `npm run art`.
- **Aceptación**: tests escritos antes en `schema.test.ts` y `tests/unit/assets.test.ts` (cada textura de los JSON existe en `public/assets/`); el juego arranca sin errores de consola (`boot.spec`).
- **Depende de**: F11.8, F11.9 (integración). **Conflictos**: `schema.ts` (después de F11.9); `assets.ts` y `Preloader.ts` con F12.1 y F20.1; archivos de `art/` con F12.8, F12.12 a F12.15 (si el arte ya llegó, no se crea placeholder).

##### F11.11. Guardado v2, migración y servicio de progreso
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Objetivo**: que el progreso persista y que un save v1 siga sirviendo.
- **Entregables**: `plugins/saveCore.ts` (v2 y `migrateV1toV2`), `plugins/saveService.ts` y `plugins/SavePlugin.ts`: lectura de `progress`, `commitProgress(next)` con escritura **al instante** (como `unlockSecret`), `itemDye` en la sesión, y un evento de registry al cambiar el progreso (para el monedero). Sin reglas de juego: los reductores son puros y viven en `domain/`.
- **Aceptación**: tests escritos antes en `tests/unit/saveCore.test.ts` (migración v1 → v2 según el ADR 0017: conserva iniciales, outfit y secretos, empieza con `startWallet`; v2 corrupto o de versión futura arranca limpio) y `tests/integration/savePlugin.test.ts`; cobertura de `plugins/` ≥ 80 %; `save.spec` sigue verde.
- **Depende de**: F11.3, F11.8. **Conflictos**: los tres archivos de guardado son exclusivos de esta tarea.

##### F11.12. Hook e2e v2 y helpers base
- **Agente**: writer · **Tamaño**: S · **Ola**: 2 (después de F11.11)
- **Objetivo**: preparar el estado de la etapa sin arrastrar, como `wear`.
- **Entregables**: `src/game/e2eHook.ts` suma (solo modo test) `wallet`, `owned`, `dyesOwned`, `itemDye`, `tastesFound`, `bestStars`, `lastRating`, `keychains`, `keychainPhase` y las acciones `grant(ids)`, `grantDyes(ids)`, `setWallet(n)`, `dye(itemId, dyeId)`, `setProgress(parcial)`; `tests/e2e/helpers.ts` suma `freshProgress`, `richPlayer`; un e2e de migración en `save.spec.ts` (se siembra un save v1 en localStorage, se recarga y se comprueba el v2).
- **Aceptación**: el e2e de migración falla antes y pasa después; el hook no existe en el build de producción (test existente); toda la suite verde.
- **Depende de**: F11.11. **Conflictos**: `e2eHook.ts` y `helpers.ts` con F11.13 (integrar F11.12 primero).

##### F11.13. Controladores de DressUp (refactor bloqueante)
- **Agente**: writer · **Tamaño**: M · **Ola**: 2 · **Ruta crítica**
- **Objetivo**: que S3, S2 y S4 trabajen en archivos distintos. Refactor **sin cambio de comportamiento**.
- **Entregables**: según el contrato del ADR 0019: `objects/dressup/DressUpController.ts` (interfaz y contexto), `objects/dressup/controllers.ts` (lista de controladores, vacía), `DressUp.ts` emite los eventos de escena y llama `attach`, `destroy` (en `shutdown`), `e2eState` (se mezcla en el estado `dressUp` del hook bajo la clave del controlador) y `beforeLeave` (puede cancelar o esperar el ¡Listo!); puntos de extensión en `ItemGrid`/`ClothingItem` (decorar una celda), `Tabs` (agregar una pestaña) y una capa de HUD.
- **Aceptación**: tests de integración escritos antes (`tests/integration/dressUpControllers.test.ts`): un controlador de prueba recibe `item-dropped` con la prenda, su `destroy` corre en `shutdown`, `beforeLeave` que devuelve `false` impide salir, una decoración de celda sobrevive al cambio de pestaña y al scroll; **toda la suite e2e verde** sin tocar specs; `perf.spec` sin fugas nuevas.
- **Depende de**: F11.5, F11.8, F11.12 (integración). **Conflictos**: `DressUp.ts`, `ItemGrid.ts`, `ClothingItem.ts`, `Tabs.ts`, `e2eHook.ts` (exclusivos de esta tarea en la ola 2, salvo F11.14 después).

##### F11.14. Mover los secretos y la pista a controladores
- **Agente**: writer · **Tamaño**: M · **Ola**: 2 (después de F11.13)
- **Objetivo**: achicar `DressUp.ts` y probar el patrón con código real antes de que lleguen las features.
- **Entregables**: `objects/dressup/SecretsController.ts` (combos, cajita, "¡Casi...!", contador, brillito de secretas) y `objects/dressup/HintController.ts` (pista de primer uso), registrados en `controllers.ts`; `DressUp.ts` queda con arrastre, outfit y orquestación.
- **Aceptación**: sin cambio de comportamiento: `secrets.spec`, `juice.spec`, `dressup.spec` y `perf.spec` verdes sin tocarlos; `DressUp.ts` baja de ~820 a ≤ 450 líneas.
- **Depende de**: F11.13. **Conflictos**: `DressUp.ts`, `controllers.ts` (antes de cualquier controlador de feature); F14.3 toca `SecretsController.ts` después.

##### F11.15. API de `Cat` para la etapa
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Objetivo**: que S2, S4, S6 y S8 no tengan que editar `Cat.ts`.
- **Entregables**: en `objects/Cat.ts`: `sayNo()` (cabeza ±4° dos veces, cara `puaj`; con movimiento reducido solo la cara), `glanceAt(point)` y `lookAtBelly()`, `setItemTexture(itemId, textureKey)` (para la prenda teñida) y `applyPose(pose)` / `clearPose()` (transformaciones y cara de las poses de §3 S6, sin arte nuevo de cuerpo); helpers puros que lo necesiten en `domain/`.
- **Aceptación**: tests de integración escritos antes (`tests/integration/catApi.test.ts`): cada método deja el estado esperado y se limpia en `destroy`; con movimiento reducido `sayNo` no rota; `setItemTexture` conserva el hit test por píxel de la capa (`pixelHit.spec` verde).
- **Depende de**: F11.13 (integración), F12.6 (expresión `puaj`). **Conflictos**: `Cat.ts` (exclusivo).

##### F11.16. Proyecto Playwright móvil (deuda de F10)
- **Agente**: writer · **Tamaño**: S · **Ola**: 1
- **Objetivo**: cumplir el ADR 0014 §8 antes de que cada feature sume sus pruebas táctiles.
- **Entregables**: proyecto `mobile` en `playwright.config.ts` (horizontal, `hasTouch`, `isMobile`, `grep: /@mobile/`); helper de arrastre táctil sintetizado en `tests/e2e/helpers/touch.ts`; tag `@mobile` en el subconjunto del ADR 0014 (boot, gato y nombre, tienda, soltar y quitar, Showcase, overlay vertical).
- **Aceptación**: el proyecto corre verde y con 0 errores de consola; se vio fallar rompiendo el levantado táctil a propósito.
- **Depende de**: nada. **Conflictos**: `playwright.config.ts` (exclusivo).

---

### F12. Estética Lagatovino: kit de UI y arte (S7a, S7b y piezas)
- **Objetivo**: que todo lo nuevo nazca con la cara de "cuaderno de Catalina" y no haya que repintarlo dos veces.
- **Entregables**: tokens y fuentes, componentes del kit, la voz, los gatos opción B, prendas con tinta y `data-dye`, el arte de la tienda, la pasarela, el álbum, la foto y el llavero, los sonidos nuevos y el espigón de porcelana.
- **Aceptación**: checklist §10 v2 de `art-direction.md` en cada pieza; las 50 prendas siguen calzando en los 12 gatos (`catalog.spec`); el juice existente no se pierde; F12.R aprobada.
- **Depende de**: F11.2 (ADR 0016).
- **Agentes**: writer (código y arte), arch (F12.10), GD (F12.R).
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas

##### F12.1. Tokens v2 y fuentes autoalojadas
- **Agente**: writer · **Tamaño**: S · **Ola**: 1
- **Objetivo**: la paleta y las letras nuevas disponibles, sin romper las escenas actuales.
- **Entregables**: tokens de §6.2 en `constants.ts` dentro de un namespace propio (por ejemplo `Ink`) y `Fonts` (`title`, `voice`, `body`); Londrina Solid y Gaegu (OFL) en `public/fonts/` con `@font-face` en `public/style.css` y licencias en `CREDITS.md`; el Preloader espera las fuentes nuevas antes del primer texto.
- **Aceptación**: test de integración del Preloader (las tres familias listas antes de `Title`); `boot.spec` verde; ningún token viejo cambia de valor (las escenas se ven igual hasta F20).
- **Depende de**: F11.2. **Conflictos**: `constants.ts` (después de F11.8, antes de F12.11), `Preloader.ts` (después de F11.10).

##### F12.2. Botón píldora plano y pestañas índice
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Objetivo**: los dos componentes que más se tocan, con el press nuevo de §6.3.
- **Entregables**: variante `pill` (principal y secundaria) en `objects/Button.ts` y estilo índice en `objects/Tabs.ts`, **opt-in** (las escenas viejas siguen con el estilo actual hasta F20); helper puro del offset de press.
- **Aceptación**: tests de integración: press escala 0,95 y baja 2 px, suena y vuelve con `Back.easeOut`; el área de toque es ≥ 80 aunque el dibujo sea menor; la pestaña activa sobresale; con movimiento reducido no hay rotación de hover.
- **Depende de**: F12.1. **Conflictos**: `Tabs.ts` con F11.13 (integrar F11.13 primero).

##### F12.3. Tarjetas, polaroid con washi, burbuja de voz, papel y ✦
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Objetivo**: el resto del kit de §6.3, listo para la caja, la pasarela, el álbum y la foto.
- **Entregables**: `objects/kit/Card.ts`, `Polaroid.ts` (rotación estable por semilla y caída con washi), `SpeechBubble.ts` (Gaegu, cola, entra con escala), `PaperBackground.ts` (crema con cuadrícula); textura de partícula ✦ en `particleTextures.ts`; helper puro `stableTilt(id)` en `domain/`.
- **Aceptación**: unit de `stableTilt` (misma semilla, mismo ángulo; rango ±1°..±8°); integración de cada objeto (aparece, se destruye sin tweens colgados, variante reducida); una página en `/styleguide` con el kit.
- **Depende de**: F12.1. **Conflictos**: `particleTextures.ts` (exclusivo en la ola).

##### F12.4. La voz: textos por feature y personajes por datos
- **Agente**: writer · **Tamaño**: S · **Ola**: 2
- **Objetivo**: que el tono Lagatovino y los nombres del juez y la vendedora salgan de datos.
- **Entregables**: `domain/copy.ts` pasa a `domain/copy/index.ts` (reexporta lo existente) más un archivo por feature (`shop.ts`, `tastes.ts`, `judge.ts`, `album.ts`, `photo.ts`, `keychain.ts`) con funciones que reciben el `CharacterDef`; ejemplos de voz de §6.3.
- **Aceptación**: unit: `{judge}` y `{seller}` se reemplazan desde el personaje; la @ nunca queda pegada al nombre del jugador (test con la regla); `copy.test.ts` existente verde.
- **Depende de**: F11.8. **Conflictos**: `domain/copy*` (después de esta tarea, cada feature edita solo su archivo).

##### F12.5. Gatos B: trazo de tinta
- **Agente**: writer · **Tamaño**: M · **Ola**: 1
- **Objetivo**: el contorno de pincel en negro cálido para los 12 gatos (§6.4).
- **Entregables**: `art/tools/build-art.mjs` (trazo base 7 px y copia desplazada; el temblor con `feDisplacementMap` solo si no rompe las máscaras, probado en `art/preview.html`); interior de orejas en `durazno`; ajuste de saturación de `coats/` si hace falta; `npm run art`.
- **Aceptación**: las anclas no cambian (`anchors.json` idéntico); `catalog.spec` y `pixelHit.spec` verdes; capturas de los 12 gatos para F12.R.
- **Depende de**: F11.2. **Conflictos**: `build-art.mjs` (dueño); integrar antes que F12.6 y F12.7.

##### F12.6. Gatos B: cara nueva y expresión `puaj`
- **Agente**: writer · **Tamaño**: M · **Ola**: 1
- **Objetivo**: ojos almendra, nariz y boca en "y", sin mejillas, y la cara nueva de "no me gusta".
- **Entregables**: `art/cats/base/face-*.svg` (las 5 actuales y `face-puaj.svg`), `domain/expressions.ts` suma `puaj`; `npm run art`.
- **Aceptación**: unit de `expressions` (seis expresiones; `puaj` existe en el manifiesto); los ojos siguen en (192, 224) y (320, 224) (los lentes calzan en `catalog.spec`); capturas de las 6 caras en 3 gatos.
- **Depende de**: F11.2; integración después de F12.5. **Conflictos**: `art/cats/base/` (exclusivo), `expressions.ts` (exclusivo).

##### F12.7. Prendas: contorno de tinta y marcas `data-dye`
- **Agente**: writer · **Tamaño**: M · **Ola**: 1
- **Objetivo**: prendas coherentes con los gatos B y listas para teñir.
- **Entregables**: en `art/clothes/` (y sus iconos) el contorno pasa a `#1F1B1A`; los 16 sweaters visibles marcan sus rellenos con `data-dye="a"` y `data-dye="b"`; el build conserva los atributos `data-*` (si `build-art.mjs` los borra, se cambia avisando a F12.5).
- **Aceptación**: `tests/unit/assets.test.ts` suma "los SVG de `public/assets` de las prendas `dyeable` tienen al menos un `data-dye=\"a\"`" (escrito antes, en rojo); `catalog.spec` verde; capturas de 6 prendas sobre 3 gatos.
- **Depende de**: F11.2; integración después de F12.5. **Conflictos**: `art/clothes/` (exclusivo).

##### F12.8. Arte del llavero
- **Agente**: writer · **Tamaño**: S · **Ola**: 1
- **Objetivo**: las ~8 piezas de §3 S8: armellita, argolla plata y dorada, dije ✦, cadenita, textura de barniz, tarjeta kraft del empaque y fondo del colgador.
- **Entregables**: `art/ui/keychain/*.svg` y `public/assets/ui/keychain/`.
- **Aceptación**: checklist §10 v2; los nombres de archivo coinciden con `photo.json → keychain` (si F11.10 ya los fijó) o los fija esta tarea y F11.10 los toma.
- **Depende de**: F11.2 (borrador basta). **Conflictos**: `art/ui/keychain/` (solo con los placeholders de F11.10).

##### F12.9. Espigón técnico de porcelana
- **Agente**: writer · **Tamaño**: M · **Ola**: 1
- **Objetivo**: confirmar el único riesgo técnico de S8: que el borde con copias, el filtro ColorMatrix y el barniz recortado a la silueta se vean bien y rindan en el celular.
- **Entregables**: escena de laboratorio solo de desarrollo (`scenes/dev/PorcelainLab.ts`, se abre con `?lab=porcelain` y no existe en producción) sobre el RenderTexture de `objects/photo.ts`; medición de tiempo de armado y FPS del balanceo (headless y, si se puede, emulación móvil); capturas.
- **Aceptación**: un informe en el resumen con números y capturas, y una recomendación para el ADR 0021 (cantidad de copias, tamaño de la textura, si conviene cachear el llavero armado como textura). No entra código a `objects/` ni a `domain/`.
- **Depende de**: nada. **Conflictos**: `main.ts` (una línea condicional; conflicto trivial con F17.2 y F18.2).

##### F12.10. ADR 0021 aceptado con los números del espigón
- **Agente**: arch · **Tamaño**: S · **Ola**: 2
- **Objetivo**: cerrar la decisión técnica del llavero antes de construir el objeto.
- **Entregables**: `docs/adr/0021-*.md` Aceptado (o con la alternativa, si el espigón falló).
- **Aceptación**: fija el presupuesto (llaveros animados a la vez, tamaño de textura, cacheo) que F19.2 y F21.4 verifican.
- **Depende de**: F12.9. **Conflictos**: ninguno.

##### F12.11. Sonidos nuevos (CC0)
- **Agente**: writer · **Tamaño**: M · **Ola**: 1
- **Objetivo**: que nada nuevo quede mudo: tic de desglose (se reutiliza), "tump" de sello, clic de botones, snip de tijera, caja registradora suave, destapar y "blup" del tinte, papel, cinta washi, *peel* de sticker, obturador (existe), "fuuu" de horno, "ching" de barniz, "tic" metálico, tintineo de cadenita y "tink" de porcelana.
- **Entregables**: `public/assets/audio/*.ogg` y `.mp3` normalizados como los del MVP (ADR 0009), `SfxKeys` en `constants.ts`, `CREDITS.md`.
- **Aceptación**: `sounds.spec`/`audio.spec` verdes (el manifiesto carga todo); cada archivo con su licencia CC0 en `CREDITS.md`; nada estridente (lo escucha el usuario en F21.8).
- **Depende de**: nada. **Conflictos**: `constants.ts` (después de F11.8 y F12.1), `CREDITS.md` con F12.1 (licencias de fuentes; conflicto trivial).

##### F12.12. Arte del juez y la vendedora
- **Agente**: writer · **Tamaño**: M · **Ola**: cuando haya respuesta · **Estado**: **Bloqueada** (pregunta abierta al usuario)
- **Objetivo**: el juez de la pasarela (2 o 3 expresiones: mira la libreta, ceja, aplaude) y la vendedora (mano y, si se aprueba, figura detrás del mostrador).
- **Entregables**: `art/ui/characters/*.svg`; nombres, firma y textura en `brand.json`. Sin cambios de código.
- **Aceptación**: checklist §10 v2; `rating.spec` y `shop.spec` verdes sin tocarlos (prueba de que estaba bien parametrizado).
- **Depende de**: la respuesta del usuario; F11.10. **Conflictos**: `brand.json` (exclusivo después de F11.10).

##### F12.13. Arte de la tienda y los tintes
- **Agente**: writer · **Tamaño**: M · **Ola**: 1
- **Objetivo**: etiqueta de cartón kraft con hilo, tijera, monedero (frasquito con botones), botón-moneda, 10 frascos de tinte más el de agua, gota y salpicadura, puntito de color.
- **Entregables**: `art/ui/shop/` y `art/ui/dyes/` (con su salida en `public/assets/ui/`).
- **Aceptación**: checklist §10 v2; los frascos usan los `hex` de `dyes.json`; se leen a tamaño de celda en 1280 y en un celular emulado.
- **Depende de**: F11.2. **Conflictos**: solo con los placeholders de F11.10.

##### F12.14. Arte del álbum y del modo foto
- **Agente**: writer · **Tamaño**: M · **Ola**: 1
- **Objetivo**: el cuaderno (portada, pestañas, hoja), 6 fondos, 5 marcos, ~12 stickers (incluido "zzz") y el tarro para quitar stickers.
- **Entregables**: `art/ui/album/` y `art/photo/` (backgrounds, frames, stickers).
- **Aceptación**: checklist §10 v2; ids iguales a los de `photo.json`.
- **Depende de**: F11.2. **Conflictos**: solo con los placeholders de F11.10.

##### F12.15. Arte de la pasarela
- **Agente**: writer · **Tamaño**: S · **Ola**: 1
- **Objetivo**: tarjeta de papel rayado del desglose, sello de estrella (normal y en `sol`), tachoncito de lápiz, nota polaroid de eventos.
- **Entregables**: `art/ui/runway/`.
- **Aceptación**: checklist §10 v2; el sello se lee a 1280 y en el celular.
- **Depende de**: F11.2. **Conflictos**: solo con los placeholders de F11.10.

##### F12.R. Revisión GD de la estética
- **Agente**: GD · **Ola**: 3
- **Objetivo**: validar que los gatos B, las prendas con tinta, el kit y las piezas nuevas se ven como algo que vendería Lagatovino, sin perder ternura ni legibilidad.
- **Aceptación**: aprobada sin Alta pendientes (capturas en 1280, 1920 y celular emulado). Se muestra al usuario como avance.
- **Depende de**: F12.1 a F12.8, F12.13 a F12.15.

---

### F13. Botones y tienda en el probador (S3)
- **Objetivo**: el **deseo**: ver la prenda que no tienes, probártela gratis y querer llevártela; cortar la etiqueta.
- **Entregables**: dominio de economía y progreso, monedero, etiquetas, compra, caja de la vendedora, jugador modelo.
- **Aceptación**: el mínimo divertido de §3 S3 completo; `shop.spec` (con `@mobile`) verde; `balance.test` fija el ritmo de §4; F13.R aprobada.
- **Depende de**: F11, F12.2, F12.3.
- **Agentes**: writer, GD.
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas

##### F13.1. `domain/economy.ts`
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Objetivo**: toda la aritmética de la tienda, pura.
- **Entregables**: `priceOf`, `cartFromOutfit(outfit, itemDye, owned, dyesOwned)`, `checkout(cart, wallet)`, `payout(stars, novelty, rules)`, `lookSignature(outfit, itemDye)`, `novelty(sig, history)` (últimos 3 por gato) y `milestoneBonus(best, stars)`.
- **Aceptación**: `tests/unit/economy.test.ts` escrito antes: tabla de pagos por estrella; novedad 0/1/2+ cambios (prenda o tinte); `checkout` que no alcanza devuelve `missing` y no cambia nada; hitos que pagan una sola vez; reglas tomadas de un `EconomyRules` de prueba (no del JSON); cobertura ≥ 90 %.
- **Depende de**: F11.8. **Conflictos**: ninguno.

##### F13.2. `domain/progress.ts`: la coreografía
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Objetivo**: un solo reductor que convierte una calificación en progreso y en una lista ordenada de eventos que la escena reproduce.
- **Entregables**: `applyRating(progress, result, rules) → { progress, events }` (botones con novedad, récord por gato, hitos del primer 3★/4★/5★, `ratedLooks`) y `applyDiscovery(progress, kind, key, rules)` (gusto o primer combo, una sola vez).
- **Aceptación**: `tests/unit/progress.test.ts` escrito antes: el orden de los eventos es estable; un mismo look calificado dos veces paga propina; un descubrimiento repetido no paga; inmutabilidad (el progreso de entrada no cambia).
- **Depende de**: F13.1, F14.1. **Conflictos**: `progress.ts` con F17.5 (integrar F13.2 primero).

##### F13.3. Monedero y vuelo de botones
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Objetivo**: ver los botones subir y bajar con gusto.
- **Entregables**: `objects/WalletHud.ts` (frasquito arriba a la derecha, número en Londrina, pop y tick por unidad con tope de 1,2 s), `objects/CoinFlight.ts` (arco Bézier, desfase, tope de 12 visibles, 3 con movimiento reducido; sirve en las dos direcciones y en el Showcase), `objects/dressup/WalletController.ts` registrado en `controllers.ts`; estado e2e `shop.wallet`.
- **Aceptación**: integración: el contador sube tick a tick sin pasarse de 1,2 s; `CoinFlight` limpia sus tweens; variante reducida; e2e mínimo: con `setWallet(250)` el HUD muestra 250. PC y celular: el monedero no tapa pestañas ni el botón de silencio en 1280 ni en el celular.
- **Depende de**: F11.11 a F11.13, F12.1, F12.13. **Conflictos**: `controllers.ts` (primero de la ola).

##### F13.4. Etiquetas de precio y probar gratis
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Objetivo**: la vitrina: todo a color, las que no tienes con su etiqueta colgando, y se arrastran igual.
- **Entregables**: `objects/PriceTag.ts` (kraft con hilo, se mece, respingo al tocarla, precio siempre visible, área ≥ 80 × 80); `objects/dressup/PriceTagsController.ts`: decora las celdas no compradas y cuelga la etiqueta de la prenda puesta sin pagar, emite "tocaron la etiqueta de X".
- **Aceptación**: integración: la celda bloqueada tiene etiqueta y alpha 1; al soltarla en el gato queda puesta con su etiqueta; al cambiar de pestaña y al hacer scroll la etiqueta sigue a su celda; reducido: sin balanceo. e2e (spec propio `shop.spec.ts`, primer test): arrastrar una prenda bloqueada la equipa y muestra la etiqueta.
- **Depende de**: F11.9, F11.13, F12.13. **Conflictos**: `controllers.ts` (después de F13.3).

##### F13.5. Comprar tocando la etiqueta
- **Agente**: writer · **Tamaño**: M · **Ola**: 4
- **Objetivo**: el placer de cortar la etiqueta.
- **Entregables**: `objects/PurchaseSheet.ts` (hoja "¿Te lo llevas?" con [Llevar] y [Todavía no], botones ≥ 88), `objects/dressup/PurchaseController.ts`: tijera y snip, la etiqueta cae girando, botones del monedero a la prenda, caja registradora, `amor` y "¡Es mío!", la celda pierde la etiqueta con brillito; "no alcanza": sacudida del monedero (parpadeo en reducido) y la frase de la vendedora con lo que falta. Escribe con `commitProgress`.
- **Aceptación**: integración: comprar descuenta, agrega a `owned` y persiste al instante; no alcanza no cambia nada; doble toque no compra dos veces. e2e en `shop.spec`: comprar desde la celda y desde el gato; no alcanza; recargar conserva la compra.
- **Depende de**: F13.1, F13.3, F13.4, F12.4. **Conflictos**: `controllers.ts` (primero de la ola 4).

##### F13.6. La caja de la vendedora al ¡Listo!
- **Agente**: writer · **Tamaño**: M · **Ola**: 5
- **Objetivo**: "solo se califica lo que es tuyo", sin castigo.
- **Entregables**: `objects/CheckoutSheet.ts` (lista, total, [Llevar todo] si alcanza, [Sacarme lo que no tengo] con "puf" de vuelta al grid, [Seguir probando]); `objects/dressup/CheckoutController.ts` con `beforeLeave`; combos con piezas sin pagar: reacción corta y frase de la vendedora, sin cajita hasta tenerlas todas (coordina por evento con `SecretsController`).
- **Aceptación**: integración: sin prendas sin pagar el ¡Listo! sale directo; [Sacarme…] deja solo lo propio; [Llevar todo] compra todo o nada. e2e en `shop.spec`: los tres caminos; al Showcase solo llega lo propio (`lastRating`).
- **Depende de**: F13.5, F11.14. **Conflictos**: `controllers.ts` (primero de la ola 5); `SecretsController.ts` con F14.3 (integrar F14.3 primero, ya está en la ola 4).

##### F13.7. e2e de la tienda
- **Agente**: writer · **Tamaño**: S · **Ola**: 6
- **Objetivo**: cerrar `shop.spec.ts` con el subconjunto táctil y el cruzado.
- **Entregables**: `@mobile`: comprar tocando la etiqueta y la caja al ¡Listo!; `@cross`: un ciclo probar → comprar → recargar; `tests/e2e/helpers/shop.ts`.
- **Aceptación**: verde en `chromium`, `mobile`, `firefox` y `chromium-1920`; 0 errores de consola; se vio fallar rompiendo el precio a propósito.
- **Depende de**: F13.6, F11.16. **Conflictos**: ninguno.

##### F13.8. Jugador modelo y `balance.test`
- **Agente**: writer · **Tamaño**: M · **Ola**: 5
- **Objetivo**: que el ritmo de §4 quede fijado por un test: si alguien cambia un precio y el ritmo se rompe, falla.
- **Entregables**: `tests/unit/balance.test.ts` y un simulador puro (`tests/unit/support/modelPlayer.ts`): sesiones de 6 looks, pone lo que el gato ama, prueba y compra lo más barato que sube su puntaje; usa `score`, `tastes`, `economy` y `progress` con los JSON reales.
- **Aceptación**: el 50 % de lo comprable entre las sesiones 3 y 5; el 100 % en ≤ 12; el 90 % del dinero sale de descubrir (§4); el test es determinista (semilla fija). Si los números del diseño no cumplen, **no se cambia el JSON en esta tarea**: se informa y lo decide F21.1 con el GD.
- **Depende de**: F13.2, F15.1, F11.9, F11.10. **Conflictos**: ninguno.

##### F13.R. Revisión GD de la tienda
- **Agente**: GD · **Ola**: 6 (junto con F14.R y F15.R)
- **Aceptación**: "probar es gratis" se entiende sin texto; cortar la etiqueta se siente bien en PC y en el celular; "no alcanza" no frustra. Sin Alta pendientes.
- **Depende de**: F13.7.

---

### F14. Gustos de cada gato (S2)
- **Objetivo**: que cada gato se sienta una persona distinta y que conocerlo sea el juego.
- **Entregables**: dominio de gustos, reacciones al soltar, descubrimientos que pagan, ficha del gato, reacción al cambiar de gato.
- **Aceptación**: mínimo divertido de §3 S2; `tastes.spec` verde; F14.R aprobada.
- **Depende de**: F11, F12.6, F13.3 (para pagar).
- **Agentes**: writer, GD.
- **Tamaño**: M–L
- **Estado**: Pendiente

#### Tareas

##### F14.1. `domain/tastes.ts`
- **Agente**: writer · **Tamaño**: S · **Ola**: 2
- **Entregables**: `tasteReaction(item, dye, cat, combos?)` con la prioridad combo > favorito > detesta > ama > neutral; `discoverTaste(found, catId, key) → { found, isNew }`; `tasteKeys(cat)` (las 5 claves).
- **Aceptación**: `tests/unit/tastes.test.ts` escrito antes: tabla de prioridad, el color solo cuenta con tinte, un descubrimiento ocurre una sola vez, tags técnicos ignorados; cobertura ≥ 90 %.
- **Depende de**: F11.8. **Conflictos**: ninguno.

##### F14.2. Reacciones de gusto al soltar
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Objetivo**: ♥, ✕ y ★ en el momento del drop.
- **Entregables**: `objects/dressup/TasteReactionsController.ts` (escucha `item-dropped`): le encanta (cara `amor`, corazones `frambuesa`, ronroneo corto), no le gusta (`Cat.sayNo()`, burbuja "mmm… no", maullido grave; **la prenda se queda puesta**), ¡su favorito! (estallido ✦ `sol`, cartel que gira "¡MI FAVORITO!"); estado e2e `tastes.reactions`.
- **Aceptación**: integración: cada tipo dispara su reacción y su sonido; reducido sin rotación; no se acumulan reacciones al soltar rápido (la nueva corta a la anterior). e2e (primer test de `tastes.spec.ts`): con un gato de tabla conocida, soltar su favorito, una que ama y la que detesta.
- **Depende de**: F14.1, F11.13, F11.15, F12.3. **Conflictos**: `controllers.ts` (después de F13.3 y F13.4); `NameSign.ts` solo por su API pública existente.

##### F14.3. Descubrir paga: chip a la ficha y primer combo
- **Agente**: writer · **Tamaño**: M · **Ola**: 4
- **Objetivo**: que descubrir se sienta como un hallazgo y llene el monedero.
- **Entregables**: en `TasteReactionsController`, la primera vez: chip "♥ estrellas" que vuela al cartel del nombre con "pop" de papel, `applyDiscovery` y +15 con `CoinFlight`; en `SecretsController`, el primer combo paga `comboBonus` al abrir la cajita (según ADR 0017).
- **Aceptación**: unit ya cubierto por F13.2; integración: el chip llega y se destruye; e2e en `tastes.spec`: el primer descubrimiento sube el monedero 15 y el segundo igual no; recargar conserva `tastesFound`; en `secrets.spec`, el primer combo paga una sola vez.
- **Depende de**: F14.2, F13.2, F13.3, F11.14. **Conflictos**: `controllers.ts`; `SecretsController.ts` (antes que F13.6).

##### F14.4. Ficha del gato
- **Agente**: writer · **Tamaño**: M · **Ola**: 4
- **Objetivo**: que el cartel del nombre se abra como una ficha con los gustos descubiertos y las pistas.
- **Entregables**: `objects/CatSheet.ts` (tarjeta con washi, chips ♥ ♥ ✕ ★ ● ≥ 80, pista en Gaegu para lo que falta); `objects/dressup/CatSheetController.ts` (abre con clic o toque en `NameSign`; se cierra tocando fuera).
- **Aceptación**: integración: abre y cierra sin tweens colgados; no abre durante un arrastre; e2e `@mobile`: tocar el cartel muestra la ficha.
- **Depende de**: F14.1, F12.3, F11.13. **Conflictos**: `controllers.ts`; si `NameSign.ts` necesita un evento de toque nuevo, va aquí y en ninguna otra tarea de la ola.

##### F14.5. El gato nuevo "lee" el outfit
- **Agente**: writer · **Tamaño**: S · **Ola**: 5
- **Objetivo**: al cambiar de gato con el outfit puesto, reacciona a cada prenda en el pop escalonado.
- **Entregables**: en `TasteReactionsController`, al recibir `cat-changed`: reacciones cortas en cadena, sin pagar descubrimientos repetidos; helper puro de la secuencia en `domain/tastes.ts` si hace falta.
- **Aceptación**: integración: la cadena respeta el escalonado de 80 ms y termina; e2e en `tastes.spec`: cambiar de gato con 3 prendas produce 3 reacciones.
- **Depende de**: F14.3. **Conflictos**: `TasteReactionsController.ts` (exclusivo en la ola).

##### F14.6. e2e de los gustos
- **Agente**: writer · **Tamaño**: S · **Ola**: 6
- **Entregables**: `tests/e2e/tastes.spec.ts` completo y generado desde `cats.json` (un gato de cada "dificultad"); `@mobile`: soltar el favorito y ver la ficha; `@cross`: un descubrimiento con recarga.
- **Aceptación**: verde en los 4 proyectos; 0 errores de consola.
- **Depende de**: F14.5, F11.16. **Conflictos**: ninguno.

##### F14.R. Revisión GD de los gustos
- **Agente**: GD · **Ola**: 6
- **Aceptación**: cada gato "se siente distinto"; `puaj` es gracioso y no castigo; el chip a la ficha se entiende. Sin Alta pendientes.
- **Depende de**: F14.6.

---

### F15. Kofi califica: la pasarela (S1)
- **Objetivo**: el **veredicto**: suspenso, sellos, premio y "la próxima le saco 5".
- **Entregables**: puntaje puro, línea de tiempo pura de la ceremonia, objetos de la ceremonia, Showcase convertido en pasarela.
- **Aceptación**: mínimo divertido de §3 S1; ceremonia ≤ 6 s y saltable; `rating.spec` verde; F15.R aprobada (**Hito A**, se muestra al usuario).
- **Depende de**: F11, F12.3, F12.15, F13.2, F13.3.
- **Agentes**: writer, GD.
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas

##### F15.1. `domain/score.ts` y balance de estrellas
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Entregables**: `scoreLook(outfit, itemDye, cat, catalog, combos, rules) → { points, stars, breakdown }`; `bestPossibleStars(cat, catalog, owned?)`.
- **Aceptación**: `tests/unit/score.test.ts` escrito antes con la tabla de ejemplos de §3 S1 (2★, 5★ en Grisú, 1★ en Mandarina, 4★ sin gustos), monotonía, mínimo 1★, topes, tags técnicos ignorados; `tests/unit/scoreBalance.test.ts` con los JSON reales: 5★ posible con los 12 gatos y ≥ 3★ solo con las iniciales; cobertura ≥ 90 %.
- **Depende de**: F11.8; la parte con datos reales, F11.9 y F11.10. **Conflictos**: ninguno.

##### F15.2. `domain/ceremony.ts`: línea de tiempo de la pasarela
- **Agente**: writer · **Tamaño**: S · **Ola**: 2
- **Objetivo**: que el orden, los tiempos y el "salto ×3" se prueben sin Phaser.
- **Entregables**: `ceremonyPlan(result, events, profile) → pasos con tiempos`, `skip(plan, now)` (acelera ×3 hasta el final), versión reducida.
- **Aceptación**: unit: duración total ≤ 6 s; los sellos van 140 ms separados; el salto nunca saltea un premio (los botones se cuentan igual); en reducido, 3 botones visibles.
- **Depende de**: F11.8. **Conflictos**: ninguno.

##### F15.3. Objetos de la ceremonia
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Entregables**: `objects/showcase/JudgeCharacter.ts` (entra desde la derecha con `Back.easeOut`, burbuja Gaegu; textura y nombre desde `brand.json`, con el dibujo genérico mientras F12.12 esté bloqueada), `RatingCard.ts` (papel rayado, líneas que entran con tic ascendente, negativas en `muted` con tachoncito), `StarStamps.ts` (sellos con "tump", temblor de 2 px salvo reducido, la 5.ª en `sol` con ✦), `EventNotes.ts` (notas polaroid en fila).
- **Aceptación**: integración por objeto: arma, anima, se puede acelerar y se destruye sin tweens colgados; reducido sin temblor.
- **Depende de**: F12.3, F12.15, F15.2, F12.4. **Conflictos**: ninguno (carpeta nueva).

##### F15.4. Showcase como pasarela
- **Agente**: writer · **Tamaño**: M · **Ola**: 4 · **Cierra la ruta crítica**
- **Objetivo**: que el ¡Listo! termine en un veredicto con premio.
- **Entregables**: `scenes/Showcase.ts`: recibe el look (ADR 0019), calcula `scoreLook`, aplica `applyRating` con `commitProgress` **antes** de animar (el progreso no depende de ver la animación), reproduce `ceremonyPlan` con los objetos de F15.3, `CoinFlight` y `WalletHud`, reacción del gato por estrellas, "Clic para seguir" / "Toca para seguir", y los botones finales [Modo foto] (va a PhotoMode, F18.2), [Seguir vistiendo] y [Otro gato]; el botón "Descargar foto" sale del Showcase (la descarga ya vive en PhotoMode); estado e2e (`lastRating`, `ceremonyStep`).
- **Aceptación**: integración: un tap acelera; salir a mitad no deja tweens ni pierde botones; e2e: `flow.spec` actualizado (la descarga pasa por [Modo foto] → [Guardar]); `perf.spec` verde.
- **Depende de**: F15.1, F15.3, F13.2, F13.3, F18.2, F13.4 (para que el look llegue con lo propio). **Conflictos**: `Showcase.ts` (primero), `flow.spec.ts`.

##### F15.5. e2e de la calificación
- **Agente**: writer · **Tamaño**: S · **Ola**: 5
- **Entregables**: `tests/e2e/rating.spec.ts`: con `wear` y `grant`, los looks de ejemplo de §3 S1 dan sus estrellas (`lastRating`); el monedero sube lo de `economy.json`; repetir el look paga propina; récord y hitos una vez; recargar conserva `bestStars`; `@mobile`: "Toca para seguir" acelera; `@cross`: un look de 5★.
- **Aceptación**: verde en los 4 proyectos; 0 errores de consola.
- **Depende de**: F15.4, F13.6, F11.16. **Conflictos**: ninguno.

##### F15.R. Revisión GD del loop jugable (Hito A)
- **Agente**: GD · **Ola**: 6
- **Objetivo**: jugar el loop corto completo (probar → reacciones → ¡Listo! → caja → veredicto → botones → comprar) en PC y celular, con y sin movimiento reducido.
- **Aceptación**: el ¡Listo! tiene suspenso y premio; dan ganas de otra vuelta; sin Alta pendientes. **Se muestra al usuario como avance jugable (Hito A).**
- **Depende de**: F13.7, F14.6, F15.5.

---

### F16. Tintes (S4)
- **Objetivo**: la expresión personal y el gesto nuevo de tirarle tinta a la ropa.
- **Entregables**: dominio de tinte, texturas teñidas con caché, pestaña Tintes, barrido del color, compra de frascos.
- **Aceptación**: mínimo divertido de §3 S4; `dye.spec` verde; ninguna caída de FPS al teñir medida en F21.4; F16.R aprobada.
- **Depende de**: F11.4 (ADR 0018), F12.7, F13.
- **Agentes**: writer, GD.
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas

##### F16.1. `domain/dye.ts`
- **Agente**: writer · **Tamaño**: S · **Ola**: 2
- **Entregables**: `recolorSvg(svgText, { a, b })`, `deriveTone(hex)` (mezcla con crema al 45 %), `dyeTextureKey(texture, dyeId)`.
- **Aceptación**: unit escrito antes: `a` y `b` se reemplazan en `fill` y en `style`; el contorno y la sombra quedan intactos; SVG sin marcas no cambia; `agua` devuelve el original; cobertura ≥ 90 %.
- **Depende de**: F11.8. **Conflictos**: ninguno.

##### F16.2. Texturas teñidas
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Entregables**: `systems/dyeTextures.ts`: rasterizado perezoso del SVG recoloreado (como diga el ADR 0018), caché con tope y LRU, promesa por clave (dos pedidos iguales rasterizan una vez), liberación de texturas al salir del tope.
- **Aceptación**: tests de integración escritos antes: la caché no pasa del tope; la textura expulsada se destruye; un pedido en curso no bloquea el arrastre (el pedido es asíncrono); cobertura de `systems/` ≥ 80 %.
- **Depende de**: F16.1, F11.4, F12.7. **Conflictos**: ninguno.

##### F16.3. Pestaña Tintes y arrastrar un frasco
- **Agente**: writer · **Tamaño**: M · **Ola**: 4 (se integra al final de la ola)
- **Entregables**: `objects/DyeJar.ts`; `objects/dressup/DyeTabController.ts`: 7.ª pestaña (por la API de F11.13), 10 frascos y agua del tamaño de las celdas, arrastre con levantado táctil, halo en la prenda objetivo (**imprescindible** en el celular), soltar sobre una prenda puesta guarda `itemDye` y llama `Cat.setItemTexture`; rebote si no hay prenda o no se tiñe.
- **Aceptación**: integración: soltar sobre la prenda tiñe y persiste; sobre el gato sin ropa no tiñe; prenda no teñible rebota; e2e (primer test de `dye.spec.ts`): arrastrar el frasco rosa al sweater lo tiñe y sobrevive a una recarga.
- **Depende de**: F16.2, F11.13, F11.15, F12.13. **Conflictos**: `controllers.ts` (último de la ola 4).

##### F16.4. El barrido del color y las reacciones
- **Agente**: writer · **Tamaño**: M · **Ola**: 5
- **Entregables**: en `DyeTabController`: destapar con "pop" y gotas mientras se arrastra, salpicadura, barrido de abajo hacia arriba con máscara (fundido cruzado en reducido), "blup", el gato se mira la panza (`sorpresa` → `feliz`), "¡A mí no!" y "Ese no se tiñe"; puntito de color en la celda y en el panel de capas (decoraciones por la API de F11.13); "¡mi color!" con el color favorito (reacción `color` de `tastes`, descubrimiento incluido).
- **Aceptación**: integración: el barrido termina y deja la textura final; reducido sin máscara; el descubrimiento del color paga una vez; e2e en `dye.spec`: el color favorito de un gato da su reacción.
- **Depende de**: F16.3, F14.3. **Conflictos**: `controllers.ts`; si el panel de capas necesita un punto de extensión nuevo, solo esta tarea toca `LayersPanel.ts`.

##### F16.5. Comprar tintes
- **Agente**: writer · **Tamaño**: S · **Ola**: 6
- **Entregables**: probar un frasco que no tienes deja la etiqueta "Tinte lila · 50" en la prenda (reutiliza `PriceTag`); la hoja de compra y la caja aceptan frascos (`cartFromOutfit` ya los cuenta); el frasco comprado pierde su etiqueta.
- **Aceptación**: integración y e2e en `dye.spec`: comprar desde la etiqueta y desde la caja; [Sacarme lo que no tengo] vuelve la prenda a su color pagado.
- **Depende de**: F16.4, F13.6. **Conflictos**: `controllers.ts`; `PriceTagsController.ts` y `CheckoutController.ts` (después de F13.6; nadie más los toca en la ola 6).

##### F16.6. e2e de los tintes
- **Agente**: writer · **Tamaño**: S · **Ola**: 7
- **Entregables**: `dye.spec.ts` completo: los 16 sweaters aceptan un tinte (generado desde `clothes.json`), un no teñible rebota, agua devuelve el original; `@mobile`: arrastrar un frasco; `@cross`: teñir y recargar.
- **Aceptación**: verde en los 4 proyectos; 0 errores de consola.
- **Depende de**: F16.5, F11.16. **Conflictos**: ninguno.

##### F16.R. Revisión GD de los tintes
- **Agente**: GD · **Ola**: 7
- **Aceptación**: tirar tinta es satisfactorio; el color teñido respeta el contorno; el halo se ve con el dedo encima. Sin Alta pendientes.
- **Depende de**: F16.6.

---

### F17. Álbum (S5)
- **Objetivo**: el "¿qué más hay?" hecho visible.
- **Entregables**: dominio del álbum, escena Album con 4 pestañas (la 5.ª, Colgador, llega con F19.5), porcentaje, sets e hitos, botón del cuaderno.
- **Aceptación**: mínimo divertido de §3 S5; `album.spec` verde; F17.R aprobada.
- **Depende de**: F11, F12.2, F12.3, F12.14.
- **Agentes**: writer, GD.
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas

##### F17.1. `domain/album.ts`
- **Agente**: writer · **Tamaño**: M · **Ola**: 2
- **Entregables**: `completion(progress, catalogs) → { got, total, pct }` (total 138), `completedSets`, `photoUnlocks(progress)` (derivado, no guardado), `newlySeen(prev, now)`, `albumMilestones(pct)`.
- **Aceptación**: unit escrito antes: total 138 con los datos reales; los sets se completan con prendas, tintes, combos y llaveros; los desbloqueos se derivan del progreso; cobertura ≥ 90 %.
- **Depende de**: F11.8 (los tests con datos reales, F11.10). **Conflictos**: ninguno.

##### F17.2. Escena Album: esqueleto
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Entregables**: `scenes/Album.ts` registrada en `main.ts`: cuaderno que cae girado y se endereza, pestañas índice (5, la 5.ª deshabilitada hasta F19.5), pasar de página con flechas ≥ 80 y arrastre horizontal, sonido de papel; `init({ from, tab })` y vuelta al origen; iris ✦ en `irisShapes.ts` (fundido en reducido); páginas como objetos aparte en `objects/album/`; estado e2e por `E2EUi`.
- **Aceptación**: integración: entra y vuelve a la escena de origen con su estado (DressUp recupera pestaña y scroll); e2e (primer test de `album.spec.ts`): `jump('Album')` y vuelta; `perf.spec` suma un ciclo al álbum sin fugas.
- **Depende de**: F11.5, F12.2, F12.3, F12.14, F17.1. **Conflictos**: `main.ts` (antes que F18.2), `irisShapes.ts`/`transitions.ts` (antes que F18.2).

##### F17.3. Álbum: Prendas y Tintes
- **Agente**: writer · **Tamaño**: M · **Ola**: 4
- **Entregables**: `objects/album/ItemsPage.ts` (reutiliza `ItemGrid` y los iconos: a color lo tuyo, boceto en lápiz azul lo que no con su precio, silueta con "?" y pista del combo para las secretas no ganadas) y `DyesPage.ts`; tocar una entrada muestra su ficha (sin hover).
- **Aceptación**: integración: el estado de cada entrada sale de `progress`; e2e en `album.spec`: con `grant` una prenda pasa de boceto a color.
- **Depende de**: F17.2. **Conflictos**: ninguno (archivos propios; una línea en `Album.ts` para registrar la página, conflicto trivial con F17.4).

##### F17.4. Álbum: Gatos y Looks especiales
- **Agente**: writer · **Tamaño**: M · **Ola**: 4
- **Entregables**: `objects/album/CatsPage.ts` (12 polaroids con mejor estrella, ♥ ♥ ✕ ★ ● y pistas) y `CombosPage.ts` (huecos con washi; la tarjeta al ganarlo).
- **Aceptación**: integración y e2e en `album.spec`: un gusto descubierto aparece en la polaroid de su gato; un combo ganado llena su hueco.
- **Depende de**: F17.2, F12.3. **Conflictos**: `Album.ts` (una línea, después de F17.3).

##### F17.5. Portada, porcentaje, sets e hitos
- **Agente**: writer · **Tamaño**: M · **Ola**: 5
- **Entregables**: portada con "Llevas el N %" a mano; ✦ que late en entradas nuevas hasta verlas (`newlySeen`); `progress.ts` suma los eventos `setCompleted` y `unlock`; la nota polaroid que cae con washi al completar un set fuera del álbum (en la pasarela, con `EventNotes`).
- **Aceptación**: unit de los eventos nuevos en `progress.test.ts`; e2e en `album.spec`: completar un set con `grant` produce la nota y el desbloqueo del modo foto; el % coincide con `completion`.
- **Depende de**: F17.3, F17.4, F13.2, F15.4. **Conflictos**: `progress.ts` (después de F13.2), `Album.ts`.

##### F17.6. Botón del cuaderno en DressUp y Showcase
- **Agente**: writer · **Tamaño**: S · **Ola**: 6
- **Entregables**: `objects/dressup/AlbumButtonController.ts`; botón del cuaderno en los botones finales del Showcase; vuelve con `from`. (El de Title va en F20.3.)
- **Aceptación**: e2e en `album.spec`: desde DressUp y desde Showcase se entra y se vuelve al mismo estado; `@mobile`: tocar el cuaderno.
- **Depende de**: F17.2, F15.4. **Conflictos**: `controllers.ts` (después de F16.5), `Showcase.ts` (después de F15.4).

##### F17.7. e2e del álbum
- **Agente**: writer · **Tamaño**: S · **Ola**: 7
- **Entregables**: `album.spec.ts` completo: cada pestaña, el %, cada set de `sets.json` (generado), los hitos 25/50/75/100 con `setProgress`; `@mobile`: pasar de página arrastrando; `@cross`: abrir y volver.
- **Aceptación**: verde en los 4 proyectos; 0 errores de consola.
- **Depende de**: F17.6, F11.16. **Conflictos**: ninguno.

##### F17.R. Revisión GD del álbum
- **Agente**: GD · **Ola**: 7
- **Aceptación**: las siluetas y bocetos dan ganas de seguir; el % se entiende; el cuaderno se siente de papel. Sin Alta pendientes.
- **Depende de**: F17.7.

---

### F18. Modo foto (S6)
- **Objetivo**: **presumir**: componer un recuerdo tipo scrapbook.
- **Entregables**: dominio de foto y poses, escena PhotoMode, fondos, marcos, poses, stickers y guardado.
- **Aceptación**: mínimo divertido de §3 S6; `photomode.spec` verde; F18.R aprobada.
- **Depende de**: F11, F11.15, F12.14, F15.4.
- **Agentes**: writer, GD.
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas

##### F18.1. `domain/photo.ts` y `domain/pose.ts`
- **Agente**: writer · **Tamaño**: S · **Ola**: 2
- **Entregables**: `framePlacement(seed)`, `stickerLimit`, `clampSticker(pos, frameRect)`; tabla de poses en `pose.ts` (sentadito, coqueto, saltito, dormilón) como datos de transformación y cara.
- **Aceptación**: unit escrito antes: rotación estable por semilla; tope de 8 stickers; el sticker no sale del marco; los tests existentes de `photo` y `pose` verdes.
- **Depende de**: F11.8. **Conflictos**: `photo.ts` y `pose.ts` (exclusivos).

##### F18.2. Escena PhotoMode: esqueleto
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Entregables**: `scenes/PhotoMode.ts` registrada en `main.ts`: recibe el look y la calificación (ADR 0019), entra con fundido crema (`transitions.ts`), gato vestido sobre un fondo inicial, [Guardar] con la foto actual del MVP (reutiliza `objects/photo.ts` y `systems/download.ts`, compartir en el celular), [Seguir vistiendo]; estado e2e.
- **Aceptación**: integración y e2e (primer test de `photomode.spec.ts`): `jump('PhotoMode')` con un look; [Guardar] dispara la descarga; `perf.spec` suma un ciclo sin fugas.
- **Depende de**: F11.5, F12.2. **Conflictos**: `main.ts` y `transitions.ts` (después de F17.2).

##### F18.3. Fondos, marcos y poses
- **Agente**: writer · **Tamaño**: M · **Ola**: 4
- **Entregables**: `objects/photomode/Tray.ts` (tiras de botones ≥ 80), cambiar fondo y marco con "pasar la hoja" o pop, pose con squash vía `Cat.applyPose`; solo lo desbloqueado según `photoUnlocks` (lo bloqueado se ve como boceto con su pista).
- **Aceptación**: integración: cada elección cambia la composición; lo bloqueado no se elige; e2e en `photomode.spec`: elegir fondo, marco y pose.
- **Depende de**: F18.1, F18.2, F17.1, F11.15. **Conflictos**: `PhotoMode.ts` (antes que F18.4 si se integran juntas; cambios en zonas distintas).

##### F18.4. Stickers
- **Agente**: writer · **Tamaño**: M · **Ola**: 4
- **Entregables**: `objects/photomode/Sticker.ts` y la hoja de stickers: se despegan con *peel*, se inclinan al arrastrar (`tilt.ts`), se asientan con escala y rotación al azar, se quitan arrastrándolos a la hoja o al tarro; tope de 8; levantado táctil.
- **Aceptación**: integración: tope respetado, `clampSticker` aplicado; e2e en `photomode.spec`: poner y quitar un sticker.
- **Depende de**: F18.1, F18.2. **Conflictos**: `PhotoMode.ts` (después de F18.3).

##### F18.5. Guardar la foto compuesta
- **Agente**: writer · **Tamaño**: S · **Ola**: 5
- **Entregables**: el PNG incluye fondo, marco, stickers, pose, nombre en Gaegu, estrellas y "Xoxo, mau!"; obturador y fundido crema; compartir en el celular. (F19.3 cambia este final por la transformación.)
- **Aceptación**: integración de la composición (`capture`); e2e: la descarga tiene el nombre esperado y el tamaño esperado.
- **Depende de**: F18.3, F18.4. **Conflictos**: `PhotoMode.ts` (antes que F19.3).

##### F18.6. e2e del modo foto
- **Agente**: writer · **Tamaño**: S · **Ola**: 6
- **Entregables**: `photomode.spec.ts` completo; `@mobile`: arrastrar un sticker y guardar; `@cross`: componer y guardar.
- **Aceptación**: verde en los 4 proyectos; 0 errores de consola.
- **Depende de**: F18.5, F11.16. **Conflictos**: ninguno.

##### F18.R. Revisión GD del modo foto
- **Agente**: GD · **Ola**: 7
- **Aceptación**: el resultado da ganas de mostrarlo; los stickers se sienten de papel; nada depende del hover. Sin Alta pendientes.
- **Depende de**: F18.6.

---

### F19. El llavero (S8)
- **Objetivo**: el **trofeo**: tu look se vuelve un llavero de porcelana y se cuelga.
- **Entregables**: dominio del llavero, objeto `Keychain`, transformación, empaque, colgador.
- **Aceptación**: mínimo divertido de §3 S8; `keychain.spec` verde (incluida la recarga); presupuesto del ADR 0021 cumplido; F19.R aprobada (**Hito C**).
- **Depende de**: F12.8, F12.10, F17.2, F18.5.
- **Agentes**: writer, GD.
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas

##### F19.1. `domain/keychain.ts`
- **Agente**: writer · **Tamaño**: S · **Ola**: 2
- **Entregables**: `ringFor(stars)`, `keychainRecipe(look, photoChoice, stars, date)`, `hangKeychain(collection, recipe, confirm) → { collection, replaced, isFirst }`, `pendulum(t, { amp, periodMs, damping })`, `packagingLayout(frame)`.
- **Aceptación**: unit escrito antes: tabla de argollas; el péndulo se apaga y no depende de los fps; el reemplazo respeta la confirmación y por defecto queda el de más estrellas; el primero por gato cuenta en el álbum; cobertura ≥ 90 %.
- **Depende de**: F11.8. **Conflictos**: ninguno.

##### F19.2. Objeto `Keychain`
- **Agente**: writer · **Tamaño**: M · **Ola**: 3
- **Entregables**: `objects/keychain/Keychain.ts`: arma el llavero desde una receta (render del look, borde de porcelana, filtro, barniz recortado, herrajes según `ringFor`) con la técnica y el presupuesto del ADR 0021; balanceo con `pendulum`; toque que balancea y tintinea; arrastre que lo empuja.
- **Aceptación**: integración: la misma receta da el mismo resultado; `destroy` libera el RenderTexture y las texturas temporales; reducido ±3° y 0,6 s.
- **Depende de**: F19.1, F12.8, F12.10. **Conflictos**: ninguno (carpeta nueva).

##### F19.3. La transformación en llavero
- **Agente**: writer · **Tamaño**: M · **Ola**: 5
- **Entregables**: en `PhotoMode`, [Guardar] dispara los pasos 1 a 6 de §3 S8 (flash crema y "fuuu", giro, barniz con "ching", herrajes, balanceo, dije con 5★); saltable con un toque; variante reducida; estado e2e `keychainPhase`.
- **Aceptación**: integración con la línea de tiempo (si hace falta, plan puro en `keychain.ts`); salir a mitad no deja tweens; e2e en `keychain.spec.ts` (primer test): las fases pasan en orden.
- **Depende de**: F19.2, F18.5. **Conflictos**: `PhotoMode.ts` (después de F18.5).

##### F19.4. El empaque, el PNG y [Colgarlo]
- **Agente**: writer · **Tamaño**: M · **Ola**: 6
- **Entregables**: tarjeta kraft con agujero, "Lagatovino · hecho a mano" (desde `brand.json`/copy), fondo, marco, stickers, el llavero colgando, nombre, estrellas y firma; la miniatura cae y vuela; PNG del empaque (compartir en el celular); "¡Tu llavero está listo!" con [Colgarlo] (va a Album con `{ tab: 'colgador', hang: catId }`) y [Seguir vistiendo]; guarda la receta con `hangKeychain` (pide confirmación si reemplaza).
- **Aceptación**: integración de `packagingLayout`; e2e en `keychain.spec`: la descarga es el empaque; la receta queda en `keychains`.
- **Depende de**: F19.3. **Conflictos**: `PhotoMode.ts` (después de F19.3).

##### F19.5. Pestaña Colgador
- **Agente**: writer · **Tamaño**: M · **Ola**: 6
- **Entregables**: `objects/album/HangerPage.ts`: 12 ganchos (silueta en lápiz si está vacío), llaveros re-renderizados desde la receta, tocar balancea y tintinea, tocar de nuevo lo trae al frente en grande; con `hang`, el llavero vuela a su gancho con "clic"; habilita la 5.ª pestaña; set "Colgador dorado".
- **Aceptación**: integración: solo el llavero tocado anima (presupuesto del ADR 0021); e2e en `keychain.spec`: el llavero está en su gancho después de recargar.
- **Depende de**: F19.2, F17.5. **Conflictos**: `Album.ts` (una línea, después de F17.5).

##### F19.6. e2e del llavero
- **Agente**: writer · **Tamaño**: S · **Ola**: 7
- **Entregables**: `keychain.spec.ts` completo: guardar → transformación → PNG del empaque → colgado → recarga; argolla según estrellas (generado de la tabla); reemplazo con y sin confirmar; `@mobile`: guardar un llavero; `@cross`: guardar y ver el colgador.
- **Aceptación**: verde en los 4 proyectos; 0 errores de consola.
- **Depende de**: F19.4, F19.5, F11.16. **Conflictos**: ninguno.

##### F19.R. Revisión GD del llavero (Hito C)
- **Agente**: GD · **Ola**: 7
- **Aceptación**: la transformación es el momento más mágico del juego; el llavero parece porcelana; el colgador da ganas de llenarlo. Sin Alta pendientes. **Se muestra al usuario como avance.**
- **Depende de**: F19.6.

---

### F20. Repintar las escenas (S7c)
- **Objetivo**: que todo el juego tenga la estética Lagatovino, **sin perder juice**.
- **Entregables**: cada escena con el kit de F12, repintada **al final** de la pista que la toca; limpieza de tokens viejos y Fredoka.
- **Aceptación**: checklist §10 v2 en cada escena; los e2e de cada escena verdes; F20.R aprobada.
- **Depende de**: F12.
- **Agentes**: writer, GD.
- **Tamaño**: L
- **Estado**: Pendiente

#### Tareas
Todas: **Agente** writer · **Tamaño** S–M · sin cambio de mecánica · el e2e de la escena verde sin tocar sus aserciones (salvo textos) · capturas en 1280, 1920 y celular emulado para F20.R.

##### F20.1. Preloader
- **Ola**: 3 · **Entregables**: `scenes/Preloader.ts` con papel cuadriculado y tinta. · **Depende de**: F12.1, F12.3. · **Conflictos**: `Preloader.ts` (después de F11.10 y F12.1).

##### F20.2. ShopEntrance
- **Ola**: 3 · **Entregables**: `scenes/ShopEntrance.ts` y `objects/shopFront.ts`: fachada en tinta, letrero "Lagatovino" (desde copy), campanita. · **Depende de**: F12.1, F12.5. · **Conflictos**: ninguno.

##### F20.3. Title con "Mi álbum"
- **Ola**: 7 · **Entregables**: `scenes/Title.ts`: estética nueva y botón secundario "Mi álbum" con el %. · **Aceptación extra**: e2e en `album.spec`: desde Title se entra y se vuelve. · **Depende de**: F17.5, F12.2. · **Conflictos**: `Title.ts` (exclusivo).

##### F20.4. CatSelect con polaroids
- **Ola**: 3 · **Entregables**: `scenes/CatSelect.ts` y `objects/CatCard.ts`: polaroids con washi, mejor estrella y "♥ 2/5" bajo cada gato (desde `progress`). · **Aceptación extra**: integración del rótulo con un progreso de prueba. · **Depende de**: F11.11, F12.3. · **Conflictos**: `CatSelect.ts`, `CatCard.ts` (exclusivos).

##### F20.5. DressUp
- **Ola**: 7 (al final de la ola) · **Entregables**: `scenes/DressUp.ts`, `objects/room.ts`, celdas, panel de capas y pestañas con el kit. · **Depende de**: F16.5 y F17.6 (última feature que toca DressUp). · **Conflictos**: `DressUp.ts`, `ItemGrid.ts`, `ClothingItem.ts`, `LayersPanel.ts`, `Tabs.ts` (nadie más en la ola).

##### F20.6. Showcase
- **Ola**: 7 (al final de la ola) · **Entregables**: `scenes/Showcase.ts`: alfombra y pasarela con el kit. · **Depende de**: F17.6. · **Conflictos**: `Showcase.ts`.

##### F20.7. Retirar tokens viejos y Fredoka
- **Ola**: 8 · **Entregables**: `constants.ts` sin la paleta vieja ni `FONT_FAMILY` Fredoka; `public/fonts` y `style.css` sin Fredoka; los tokens nuevos salen de su namespace. · **Aceptación**: `grep` de los tokens viejos da 0 en `src/`; toda la suite verde. · **Depende de**: F20.1 a F20.6. · **Conflictos**: `constants.ts` (último).

##### F20.R. Revisión GD del repintado
- **Agente**: GD · **Ola**: 8 · **Aceptación**: el juego entero se ve como el cuaderno de Catalina y el juice sigue intacto; nada se ve roto en 1280, 1920 ni en el celular. Sin Alta pendientes. · **Depende de**: F20.7.

---

### F21. Cierre de la segunda etapa y entrega en localhost 🔒
- **Objetivo**: la segunda etapa terminada, balanceada, estable y probada, para que el usuario la juegue y la apruebe.
- **Aceptación**: DoD de `CLAUDE.md` completa; suite e2e completa del ADR 0012 más los specs nuevos en verde; 🔒 del usuario.
- **Depende de**: F11 a F20 Hechas.
- **Agentes**: writer, GD, coord y el usuario.
- **Tamaño**: M
- **Estado**: Pendiente

#### Tareas

##### F21.1. Balance final con el jugador simulado
- **Agente**: writer + GD · **Tamaño**: S · **Ola**: 8
- **Objetivo**: confirmar el ritmo de §4 con el catálogo final y ajustar **solo** `economy.json` (o un tag en `clothes.json`, §3 S2 "Notas de balance") si hace falta.
- **Aceptación**: `balance.test.ts` y `scoreBalance.test.ts` verdes con los datos finales; cada cambio de número queda anotado aquí con su razón y lo aprueba el GD; nunca se agrega "trabajo" (§4).
- **Depende de**: F13.8, F16 y F19 Hechas. **Conflictos**: JSON de reglas (exclusivo).

##### F21.2. e2e del loop completo
- **Agente**: writer · **Tamaño**: M · **Ola**: 8
- **Entregables**: `tests/e2e/loop.spec.ts` con `window.__VISTE__`: Title → CatSelect → ShopEntrance (saltada) → DressUp: probar una prenda bloqueada, descubrir un gusto, teñir → ¡Listo! → caja → pasarela con estrellas y botones → comprar → otra vuelta → Modo foto → sticker → Guardar → transformación → empaque PNG → Colgarlo → Album (colgador) → recargar: monedero, compras, tintes, gustos, récords, llavero y secretos intactos. Versión `@mobile` reducida.
- **Aceptación**: verde en `chromium` y `mobile`; 0 errores de consola; dura ≤ 120 s.
- **Depende de**: F11 a F20. **Conflictos**: `flow.spec.ts` (si el loop reemplaza partes del smoke, se decide aquí).

##### F21.3. Suite completa estable
- **Agente**: writer (coord verifica) · **Tamaño**: M · **Ola**: 8
- **Aceptación**: `npm run e2e` (todos los proyectos: `chromium`, `firefox`, `chromium-1920`, `mobile`, `load`) con 0 fallidos, 0 saltados y 0 flaky en **3 corridas completas seguidas** (`retries: 0`); `--repeat-each=5` de `shop`, `tastes`, `rating`, `dye` y `keychain`; ningún test pasa de 120 s; `grep -rE "\.(only|skip)\(" tests` da 0. La duración total se informa y se compara con la de F9 (no se inflan timeouts para cumplir).
- **Depende de**: F21.2.

##### F21.4. Rendimiento y fugas
- **Agente**: writer · **Tamaño**: M · **Ola**: 8
- **Entregables**: `perf.spec.ts` suma ciclos DressUp → Showcase → PhotoMode → Album → DressUp; medición de la caché de tintes tras teñir 30 veces (no pasa del tope del ADR 0018); FPS del colgador con 12 llaveros (presupuesto del ADR 0021); `load.spec` con los assets nuevos (< 3 s; si no, atlas con ADR del arch).
- **Aceptación**: ciclo 5 igual a ciclo 2 (tolerancia documentada de F9); carga < 3 s; FPS registrados (exigidos ≥ 55 de mediana solo con GPU; si no, va a la lista del 🔒).
- **Depende de**: F21.2.

##### F21.5. Revisión final del GD
- **Agente**: GD · **Ola**: 8
- **Aceptación**: el loop corto, el mediano y el largo se sienten bien en PC (1280 y 1920, Chrome y Firefox) y en celular horizontal, con y sin movimiento reducido; checklist §10 v2; sin Alta pendientes.
- **Depende de**: F21.1 a F21.4, F20.R.

##### F21.6. DoD
- **Agente**: coord · **Ola**: 8
- **Aceptación**: `npm run build`, `lint`, `test`, `coverage` (≥ 90 % en `domain/` y `data/`, ≥ 80 % en `plugins/` y `systems/`) y `e2e` en verde; TDD evidenciado en cada tarea; sin listeners colgados (`perf.spec`); todo cambio de arquitectura con su ADR; probado en Chrome y Firefox a 1280 × 720 y 1920 × 1080 y en celular horizontal (emulado; el dispositivo real, en el 🔒).
- **Depende de**: F21.5.

##### F21.7. Entrega en localhost
- **Agente**: coord · **Ola**: 8
- **Entregables**: `npm run dev` en segundo plano y la URL al usuario con una lista corta de qué probar: el loop entero, conocer a 2 gatos hasta 5★, comprar y teñir, el álbum, el modo foto, guardar un llavero y verlo en el colgador, el celular real y la prueba de oído de los sonidos nuevos.
- **Depende de**: F21.6.

##### F21.8. 🔒 El usuario juega y aprueba
- **Agente**: usuario · **Ola**: 8
- **Aceptación**: el usuario aprueba. Lo que pida se convierte en arreglos con test y se vuelve a F21.6.
- **Depende de**: F21.7.

---

## Después de la segunda etapa
Los *nice to have* del diseño, en orden de valor aproximado:
- **Llavero**: arrastrarlo con física de péndulo y que choque con el vecino; reverso con "Hecho a mano por…" y fecha; más de un llavero por gato; color de la cadenita o del tag; **gatos llavero dibujados aparte** (L–XL, arte solo del llavero y del empaque; no toca el ADR 0003).
- **Calificación**: el juez con más expresiones; "medidor de ronroneo" en DressUp.
- **Gustos**: una línea de voz por gato al descubrir todos sus gustos.
- **Tienda**: la vendedora dibujada detrás del mostrador con frases al azar; "vitrina del día" (sin descuento ni urgencia).
- **Tintes**: teñir gorros y bufandas; "tonos probados" en el álbum.
- **Álbum**: página "Mis fotos" con miniaturas (cuidando el tamaño de localStorage).
- **Modo foto**: guardar la composición; texto libre en la foto (input del DOM, ADR 0014).
- **Estética**: trazo variable también en las prendas.
- **Más adelante**: caminar por la ciudad, minijuegos, más tiendas, cuentas y base de datos (Supabase, ADR 0004), música y compartir en redes.

**Descartado**: pedidos de clientes (ADR 0015). **A cargo del usuario**: la integración web con lagatovino.com.

Lo que quedó de "Después del MVP" (detalles de la foto, corte de la cola del siamés, iris que se cierra sobre lo pulsado, sonido propio de campanitas, rebote elástico del scroll, destello de los lentes brillantes, estrellita del regalito) sigue en pie con sus razones de la sección F9.
