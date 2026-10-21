# Game Design: Viste Lagato (MVP)

> **Diversión > funcionalidad.** Si hay que elegir, gana lo que hace sonreír.

## Fantasía
"Llevo a MI gato a una boutique tierna y lo dejo adorable con el sweater que le elegí."

## Pilares de diversión
1. **Ternura inmediata**: el gato está vivo (respira, parpadea, mueve la cola) y reacciona a cada prenda.
2. **Expresión**: muchas prendas (unas 44, con los sweaters como protagonistas) y combinaciones que dan ganas de probar todas.
3. **Feedback jugoso**: cada toque y cada arrastre tienen una animación y un sonido. Nunca hay un clic mudo.
4. **Sorpresa y colección**: combinaciones especiales con reacciones únicas y la sensación de "¿qué más hay?".
5. **Cero fricción**: se entiende sin tutorial y se juega con el mouse, arrastrando.

## Loop del MVP
```
Iniciar → Elegir gato → Entrar a la tienda → Vestir arrastrando (probar → reacción → ajustar) → Admirar el look → otro look / otro gato
```

## Pantallas (ver ADR 0007)
- **Portada**: logo animado, gatitos que se asoman y botón "Iniciar".
- **Elegir gato**: galería de 12 gatos comunes (`docs/art-direction.md` §2). Al hacer clic en uno, salta, dice miau y aparece el botón "¡Este!".
- **Entrar a la tienda**: el gato camina hasta la boutique, suena la campanita, se abre la puerta y la cámara hace zoom hacia dentro. Se puede saltar con un toque.
- **Vestir (probador)**:
  - El gato está grande sobre una alfombra, frente al espejo.
  - Arriba hay pestañas de categorías, con Sweaters primero, y debajo un grid de prendas.
  - Las prendas se **arrastran**:
    - Al tomar una prenda, se agranda y se inclina un poco.
    - Mientras se arrastra sobre el gato, el gato mira la prenda y sus ojos brillan.
    - Al soltarla, el gato hace squash y stretch, salen corazones y suena un miau.
    - Si se suelta fuera del gato, la prenda vuelve a su celda con un rebote.
  - En el panel de capas, la ✕ quita una prenda y el gato se sacude.
- **Admirar**: el gato posa con brillitos y un "¡Qué guapo!". Se puede volver a vestir o cambiar de gato.

## Qué expresión usar en cada momento (capas `face-*`, F1)
| Momento | Expresión | Detalle |
|---|---|---|
| Idle | `normal` + `parpadeo` | Parpadeo de 120 ms cada 3–5 s; a veces un doble parpadeo |
| Tomar una prenda | `sorpresa` | Mientras se arrastra y la prenda está sobre la dropZone |
| Soltar sobre el gato | `feliz` | Durante 600–900 ms con squash y corazones, y luego vuelve a `normal` |
| Combinación especial / sweater favorito | `amor` | Con muchos corazones y un "miau" más largo |
| Quitar con ✕ | `parpadeo` largo | Mientras el gato se sacude, y luego `normal` |
| Admirar (Showcase) | `feliz` ↔ `amor` | Alternan durante la pose |
| Elegir gato (clic) | `feliz` | Junto con el salto y el miau |

Regla: las expresiones se cambian con un micro-tween (escala Y de la capa 0,9 → 1 en 80 ms), nunca de golpe.

## Decisiones confirmadas por el usuario
- Las prendas se ponen **arrastrando** (drag & drop).
- El MVP tiene **más que sweaters**: 6 categorías y muchas opciones (`docs/art-direction.md` §5).
- **Gatos comunes**, nada de gatos temáticos. El arte lo creamos nosotros con una estética única (ADR 0006).
- Habrá **Phaser**, animaciones e interactividad al máximo.
- Flujo con inicio y entrada a la tienda, con transiciones suaves.

- Se juega en **PC**, en horizontal (1280 × 720) y con mouse (ADR 0008).
- **Arrastrar solamente**: no hay doble clic ni clic para equipar.
- **Sin música**. Hay **efectos de sonido ASMR satisfactorios** en cada acción y maullidos si se consiguen con licencia libre (ADR 0009).
- El jugador **le pone nombre a su gato**.
- Hay un **botón para descargar la foto** del look.
- Hay **al menos 9 gatos** distintos; el objetivo son 12.
- Nombre del juego: **Viste Lagato**.
- Idioma: español.

## Economía: todo gratis + "Regalitos de la tienda"
Decisión tomada con libertad otorgada por el usuario. El `game-designer` la valida en la feature F8 del roadmap y puede descartarla.

- **No hay monedas en el MVP**: el 100 % del catálogo base es gratis desde el principio. Así se evita la fricción y el jugador se divierte desde el segundo uno.
- **Capa de sorpresa sin dinero**:
  - Hay unas **6 prendas secretas** que no aparecen en el grid.
  - Se desbloquean con **combinaciones especiales**, por ejemplo: sweater navideño + gorro de pompón + bufanda → "¡Look Navidad!".
  - Al lograr una combinación, la vendedora de la tienda entrega una **cajita de regalo** que el jugador abre arrastrando el moño (con un sonido ASMR de papel).
  - Un contador "Secretos: 2/6" invita a seguir experimentando.
- Si el `game-designer` la descarta, queda solo la reacción especial del gato a las combinaciones, sin desbloqueos.

## Backlog de juice (para F9, salvo que se indique otra feature)
Surgió de la revisión de F2 del `game-designer` (2026-10-20). Va ordenado por impacto/esfuerzo. Formato: qué, por qué divierte, esfuerzo y pista para Phaser.

### Media
- ~~**Cola como capa propia**~~: **hecho en F3** (`domain/tail.ts`, `Cat.tailFlick`).
- ~~**(F3) La cola salta 4° al terminar el latigazo**~~: **hecho en F5** (`TAIL_FLICK_STEPS` termina en `-TAIL_IDLE.angle`, con `tests/integration/catTail.test.ts`). Texto original: `tailFlick` termina en `angle: 0` y luego `swayTail()` hace `setAngle(-TAIL_IDLE.angle)` de golpe. En cada drop se ve un tirón de la punta (~10 px), y "nada aparece de golpe". Arreglarlo antes de F5. Esfuerzo: S. Pista: que el último paso de la cadena vaya a `-TAIL_IDLE.angle` en vez de 0, o que `swayTail(fromCurrent)` no haga `setAngle` y arranque con un tween previo desde el ángulo actual a −4 (300 ms, `Sine.easeOut`). Un test en `tests/integration` que compruebe que, tras el flick, el ángulo no cambia más de 1° entre dos frames.
- **Corazones que suben flotando** en vez de caer. Hoy `gravityY: 420` los hace caer y, sobre sweaters rosa o coral, casi no se ven. Esfuerzo: S. Pista: `gravityY: -40`, `angle` de −120 a −60, `speed` de 80 a 200 y un aro "pop" en el ancla (un Graphics con un círculo: escala 0→1,4 y alpha 1→0 en 180 ms). Que la emisión ocurra por delante de la prenda y que algunos brillitos `mantequilla` la contrasten.
- **El fantasma se inclina según la velocidad del arrastre**, como tela que se balancea. Esfuerzo: S. Pista: en `update`, `angle` se acerca a `clamp(dx * 0.8, -15, 15)`. El lerp tiene que ser independiente de los fps: `k = 1 - Math.pow(0.6, delta / 16.67)`.
- **Acariciar al gato**: un clic en el cuerpo da cara `feliz`, un squash pequeño y (en F6) un ronroneo. Es el primer clic de cualquiera y hoy no hace nada. Esfuerzo: S. Pista: un hit area en el `body` de `Cat` y en `pointerdown` llamar a `react('drop')` con un squash de amplitud 0,5. Necesita un cooldown de 400 ms.
- **Hover en las prendas puestas**: enseña que se pueden arrastrar para quitarlas. Esfuerzo: S. Pista: en `pointerover` de la capa, escala ×1,03 en 100 ms y un brillito pequeño.
- **Press de 4 px** en pestañas y ✕ (art-direction §8). Hoy solo tienen hover. Esfuerzo: S. Pista: en `pointerdown`, `y += 4` en 60 ms, y vuelve con `Back.easeOut` en `pointerup`.
- **Pista de primer uso** sin tutorial. Si a los 4 s no se ha soltado ninguna prenda, una prenda fantasma (alpha 0,5) viaja de la primera celda al gato siguiendo una curva y se repite cada 5 s hasta el primer drop. El texto de ayuda actual está abajo y pasa desapercibido. Esfuerzo: S. Pista: un tween con `onUpdate` sobre una `Phaser.Curves.QuadraticBezier`.
- ~~**(F4) Pestañas con icono**~~: **hecho en F4** (`objects/tabIcons.ts`, con el nombre debajo al pasar el mouse).
- ~~**(F4) Panel de capas para 6 slots**~~: **hecho en F4** (450 px de alto, `ROW_H` 56; las 6 filas caben).
- **(F2) Doble imagen con el imán enganchado**. El fantasma al 25 % encima de la vista previa al 50 % se ve turbio (dos sweaters desfasados, `drag-b-snapped.png`). Esfuerzo: S. Pista: al engancharse, bajar el fantasma a alpha 0 y escala ×0,8 en 100 ms, para que solo se vea la vista previa, y hacer que la vista previa "respire" (alpha 0,45↔0,6, 400 ms, yoyo). Al desengancharse, el fantasma vuelve con `Back.easeOut`.
- **(F4) Iconos de pestaña que se confunden**. La bufanda (una T de color menta) parece un secador de pelo o una pistola de juguete, y el mitón lila parece una taza con asa. El nombre aparece al pasar el mouse, pero la pestaña tiene que leerse de un vistazo. Esfuerzo: S. Pista: en `tabIcons.ts`, dibujar la bufanda como una U (la vuelta al cuello) con dos puntas que cuelgan y flecos, como el icono de `neck-bufanda-larga`, y el mitón con el pulgar hacia arriba y en diagonal, un puño acanalado y un corazón (como `paws-mitones`). El de sweater también ganaría con mangas largas y puños, para que no parezca una polera.
- **(F4) Los lentes de sol esconden las reacciones**. Con los cristales morados opacos no se ven los ojos `sorpresa`, `feliz` ni `amor`, justo el feedback principal. Lo mismo pasa, en menor medida, con los lentes de estrella y con los de corazón sobre el gato negro. Esfuerzo: S. Pista: en el SVG, opacidad 0,45–0,55 en el relleno de los cristales para que los ojos se vean a través, o bien que `Cat` dibuje la capa de cara por encima del relleno del cristal. El monóculo tapa un solo ojo y se queda como está.
- **(F4) El globo se sale del espejo**. En el gato, el corazón del globo sobresale unos 25 px del marco dorado (`f4-review/globo.png`) y queda sobre la pared. Esfuerzo: S. Pista: en `art/clothes/accessory-globo.svg`, bajar el globo unos 30 px y acercarlo a la cabeza, o achicarlo un 10 %. De paso, que se mezca en idle (angle ±3°, 1,6 s, `Sine.easeInOut`, yoyo); es la prenda que más pide moverse.
- **(F8) Que las 6 secretas se sientan especiales**. Cuatro lo son (sweater dorado, corona de flores, capa y varita), pero la bufanda arcoíris larga es casi la bufanda larga con otros colores, y los lentes de corazón brillantes son los de corazón con dos destellos. Esfuerzo: S–M. Pista: (a) toda prenda secreta, cuando está puesta, suelta un brillito `mantequilla` cada 2–3 s (`time.addEvent` y `sparkles.explode(1, …)` en un punto al azar de su `alphaBounds`), y en la celda del grid lleva una estrellita dorada en la esquina; (b) arte: la bufanda arcoíris, más larga, con una punta que flota hacia un lado como movida por el viento y pompones en las puntas; los lentes brillantes, con el marco dorado y un destello que recorre el cristal.
- **(F8) Pista de "¡casi!"**. Si el jugador tiene puestas todas las prendas de un combo menos una, sale un brillito suave sobre el gato y el gato mira hacia la pestaña de la prenda que falta (`cat.lookAt` sobre la posición de esa pestaña, 600 ms). Así los combos se descubren probando y no a ciegas. Esfuerzo: S. Pista: una función pura `nearlyCompleted(outfit, combos, catalog)` en `domain/combos.ts`, con TDD.
- **(F5) Al cambiar de gato, el outfit se pierde**. `chooseCat` deja desnudo al gato nuevo. Como todas las prendas sirven para todos los gatos (ADR 0003), lo divertido es "¿cómo le queda este mismo look a Luna?". Además, "Cambiar de gato" está justo debajo de ¡Listo!, y un clic equivocado seguido de otro gato borra el look. Esfuerzo: S. Pista: en `domain/session.ts`, que `chooseCat` conserve `s.outfit` también con otro gato (con TDD), y que al entrar a DressUp el gato nuevo reciba las prendas con un pop escalonado (una capa cada 80 ms) y su cara feliz.
- **(F5) El botón Iniciar tapa las orejas del gatito del medio** en la portada (`01-title.png`). Parece que el botón le cayó en la cabeza. Esfuerzo: S. Pista: en `scenes/Title.ts`, subir el botón unos 30 px o bajar al gatito del medio para que asome por debajo del botón. Otra opción: correr el gatito a un lado y dejar el centro libre.
- **(F6) Ronroneo en bucle en el Showcase**. Cada pose `amor` (cada 3 s) toca el ronroneo de 1,5 s para siempre, y la mitad del tiempo se oye ronroneo. Al principio es tierno y después cansa. Esfuerzo: S. Pista: en `Showcase.strike`, ronronear solo en las 2 primeras poses `amor` y después con una probabilidad de 1/4. Con el squash pasa lo mismo: alternar el squash con un meneo (`cat.wiggle()`) o con una mirada a un lado, para que la pose no se vea mecánica.
- **(F6) Traqueteo del hover al barrer el grid**. Al pasar el mouse rápido sobre 12 celdas suenan 12 "tic" seguidos; el tope de 3 a la vez no lo evita, porque el sonido es muy corto. Esfuerzo: S. Pista: en `plugins/audioCore.ts`, un intervalo mínimo por clave (`minIntervalMs`, 70 ms para `sfx-hover`), con TDD. De paso, subir el tono 2–3 % en cada hover seguido (como un xilófono) y volver a 1 tras 300 ms sin hover. Así barrer el grid suena musical en vez de repetitivo.

### Baja
- **Sorpresa solo sobre la zona** (tabla de expresiones). Fuera de la zona, ojos `normal` que siguen la prenda, y al entrar, `sorpresa` con un micro-tween. Así el momento "¡la va a recibir!" se nota más. Esfuerzo: S.
- **Zona de soltar que late**: alpha 0,7↔1, 600 ms, yoyo. Cuando el imán engancha, un círculo pequeño en el ancla del slot. Esfuerzo: S.
- **Al volver a la celda**, la celda hace un pop 1,1→1 al recibir la prenda y el gato la sigue con la mirada un instante ("¿no?"). Esfuerzo: S.
- **Idle extra**: cada 8 a 12 s, mirar a un lado o mover una oreja. Esfuerzo: S.
- ~~**Iris con forma de huellita o corazón**~~: **hecho en F5** (`systems/irisShapes.ts`).
- **(F3) Coletazo espontáneo en idle**. La cola rota rígida y ±4° es muy tranquilo. Cada 6 a 10 s al azar, un coletazo suave (la cadena de `tailFlick` a ±6°) hace que el gato parezca pensar. Al soltar, un latigazo algo mayor (±12° en vez de ±8°). Esfuerzo: S. Pista: `time.delayedCall` con un retardo aleatorio, como `scheduleBlink`, y limpiarlo en `destroy`.
- **(F3) Suavizar el corte crema→café en la cola del siamés**. El tramo crema se queda, pero la línea interna entre los dos tonos parece una venda en miniatura. Esfuerzo: S. Pista: en `coats/siames.svg`, quitar el trazo interno de la unión, o meter un tono intermedio (~`#C49A72`) de 6 a 8 px.
- **(F3) Rubor del siamés sobre el borde de la máscara**. Las mejillas quedan mitad sobre crema y mitad sobre café, y se ven turbias. Esfuerzo: S. Pista: como la cara es idéntica en todos los gatos, se arregla en el pelaje: ensanchar un poco la máscara en `coats/siames.svg` para que el rubor caiga entero sobre ella.
- **(F4) Rebote elástico en los extremos del scroll**. Hoy la rueda se detiene en seco arriba y abajo. Un overscroll de 12–16 px que vuelve con `Back.easeOut` (200 ms) se siente blandito, como todo lo demás. Esfuerzo: S. Pista: en `wheelTarget`, permitir pasarse hasta 16 px y que `onUpdate` lleve `target` de vuelta a `clampScroll` cuando la rueda se detenga 120 ms.
- **(F4) La taza de leche flota**. Queda en el aire, a media altura junto a la cola, y nadie la sostiene. Esfuerzo: S. Pista: en el SVG, bajarla a la alfombra junto a las patitas (como el ovillo) o ponerla entre las patas delanteras.
- **Texto de ayuda más cerca del grid**. Hoy queda al pie del panel, lejos de las prendas. Cuando el grid esté lleno en F4, hay que revisar dónde queda. Esfuerzo: S.
- **(F5) Showcase sin ropa**. Con ¡Listo! y nada puesto, el cartel dice "¡Qué lindo look!". Esfuerzo: S. Pista: `showcaseTitle(name, wornCount)`, y con 0 prendas, "¡Al natural, {nombre}!". Con 5 o 6 prendas, "¡Qué look tan completo, {nombre}!".
- **(F5) Iris que se cierra sobre lo pulsado**. Hoy el iris se cierra al centro de la pantalla. Que el corazón o la huellita se cierren sobre el gato elegido o sobre el botón pulsado conecta el clic con el cambio de escena. Esfuerzo: S. Pista: que `go(scene, action, { focus: point })` pase el punto a `transitionOut`. La apertura se queda centrada, porque en el probador ya cae sobre el gato.
- **(F5) "Toca para saltar" casi no se ve y dice "toca"**. Va en 24 px en una esquina, sobre la vereda. El juego es primero para PC (ADR 0008). Esfuerzo: S. Pista: "Clic para saltar ⏩" en un pill `crema` con borde `rosa-200`, que aparece con un fundido después de 1 s. Lo mismo en CatSelect: "Elige al gatito que más te guste".
- **(F6) Sonidos que faltan en el paseo y en el nombre**. El gato camina en silencio hasta la tienda, la puerta se abre muda y una tecla rechazada solo sacude el campo. Esfuerzo: S. Pista: pasitos blandos (`sfx-key` con `rate` 0,6 y volumen 0,3 en cada bote del `waddle`), `sfx-remove` con `rate` 1,2 al abrir la puerta y `sfx-return` con volumen 0,4 al sacudir el campo del nombre.
- **(F6) Acariciar en la portada**. El cooldown de 500 ms deja hacer clic seguido para tener maullido y ronroneo cada medio segundo. Esfuerzo: S. Pista: que el maullido tenga su propio cooldown de 1,2 s y que entre medio solo suene el ronroneo.

## Combos de F8
Propuesta del `game-designer` (2026-10-21). **Valido la mecánica de "Regalitos de la tienda"**: el guardarropa de F4 tiene temas claros (Navidad, estrellas, fresas, realeza, corazones, lana), así que los combos se descubren probando, no a ciegas.

Reglas de diseño:
- Una prenda secreta por combo. Ningún combo pide prendas secretas, así que se pueden descubrir en cualquier orden.
- Curva de dificultad: el primero (galáctico) pide solo 2 prendas para enseñar la mecánica pronto; los demás piden 3.
- Siempre que se puede, se pide un **tag** (`{ "slot", "tag" }`) en vez de una prenda exacta, para que perdone: por ejemplo, cualquier bufanda de invierno sirve para Navidad.
- Algunas secretas también cumplen tags (la corona de flores tiene `realeza` y los lentes brillantes tienen `corazones`). Eso está bien: una prenda secreta da reacción en el combo que la entregó, pero `unlockSecret` no la vuelve a entregar.
- Reacción base de todo combo: cara `amor`, el doble de corazones (ya existe: `celebrate(…, 2)`), el nombre del look en un globo de texto que entra con `Back.easeOut` y la cajita de regalo. Lo de cada fila es lo **único** que se suma.

| id | Nombre | Requisitos (`requires` en `combos.json`) | Premio (`rewardItemId`) | Reacción única (`reaction`) |
|---|---|---|---|---|
| `galactico` | **¡Gatito galáctico!** | `sweater-cohete` + `face-lentes-estrella` | `accessory-varita-estrella` | `stars-orbit`: un anillo de 8 estrellitas `mantequilla` da una vuelta alrededor de la cabeza (tween sobre un círculo, 900 ms). El gato las sigue con la mirada, pasa de `sorpresa` a `amor` y suena un "tilín" ascendente. |
| `navidad` | **¡Look Navidad!** | `sweater-navideno` + `head-beanie-pompon` + `{ slot: neck, tag: invierno }` (bufanda de rayas o larga) | `sweater-dorado-estrella` ("¡la estrella del arbolito!") | `snowfall`: caen copitos blancos lentos desde lo alto del espejo durante 2 s (emitter con `gravityY: 30` y deriva lateral), el pompón del gorro rebota (squash del gato con más estiramiento arriba) y suenan cascabeles. |
| `fresas` | **¡Jardín de fresas!** | `{ slot: sweater, tag: frutal }` + `head-gorrito-fresa` + `accessory-flor-oreja` | `head-corona-flores` | `petals`: brotan pétalos rosa y lavanda desde la alfombra, el gato olfatea (escala Y de la cabeza 1→0,96→1, dos veces) y hace un estornudo tierno: un saltito, ojos `parpadeo` y "¡achís!" en el globo de texto. |
| `realeza` | **¡Su Majestad Gatuna!** | `{ slot: head, tag: realeza }` + `{ slot: neck, tag: realeza }` + `{ slot: face, tag: realeza }` (corona mini, perlas y monóculo) | `neck-capa-superheroe` ("toda majestad necesita su capa") | `royal-pose`: el gato levanta la barbilla (angle −4°, escala Y 1,04, 400 ms) con ojos `feliz`, cae confeti dorado y suena una fanfarria suave de 3 notas. |
| `enamorado` | **¡Gatito enamorado!** | `{ slot: sweater, tag: corazones }` + `{ slot: face, tag: corazones }` + `{ slot: accessory, tag: corazones }` (sweater, lentes y globo de corazón) | `face-lentes-corazon-brillantes` | `heartbeat`: dos latidos del gato (escala 1→1,06→1, ×2), un corazón grande sale del globo y estalla en corazoncitos, y la cara `amor` dura 1,5 s en vez de 0,9. |
| `arcoiris` | **¡Arcoíris calentito!** | `{ slot: sweater, tag: arcoiris }` + `{ slot: neck, tag: lana }` + `{ slot: paws, tag: lana }` (sweater arcoíris, cualquier bufanda y mitones o guantes) | `neck-bufanda-arcoiris` | `rainbow-arc`: un arcoíris de 5 bandas pastel se dibuja detrás del gato, de izquierda a derecha (tween de progreso sobre `Graphics.arc`, 700 ms), y se desvanece. El gato se mece de lado a lado y ronronea. |

Notas para F8:
- Los e2e de secretos se generan desde `combos.json`. Para los requisitos por tag, el test elige la primera prenda visible que cumpla el tag.
- Verificado contra los tags reales de `clothes.json` (2026-10-21): cada requisito tiene al menos una prenda visible que lo cumple, y ningún combo queda completo antes de tiempo con otro. Si se cambian los tags, hay que revisar esta tabla.
- Si después se quiere un 7.º combo sin premio (solo reacción), el mejor candidato es el **¡Supergatito!**: un sweater `deportivo` + `face-lentes-sol` + `paws-botitas`.

## Fuera del MVP (ideas guardadas)
Monedas y compra, caminar por la ciudad, minijuegos para ganar monedas, cuentas, logros, compartir en redes.
