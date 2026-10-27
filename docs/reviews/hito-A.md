# Hito A. Revisión GD del loop jugable (F13.R, F14.R y F15.R)

- **Fecha**: 2026-10-26 · **Revisor**: game-designer · **Rama**: `segunda-etapa`
- **Material revisado**: los controladores de `objects/dressup/` (`PriceTags`, `Purchase`, `Checkout`, `Wallet`, `CatSheet`, `TasteReactions`), `objects/showcase/*`, `scenes/Showcase.ts`, el dominio (`economy`, `score`, `tastes`, `ceremony`, `progress`), los textos de `domain/copy/` (`judge`, `ceremony`, `tastes`, `shop`), `economy.json`, `cats.json`, `clothes.json`, `brand.json`, el jugador modelo (`tests/unit/support/modelPlayer.ts`, `balance.test.ts`) y las capturas del laboratorio: `shots/sheet*`, `shots/buy-*`, `shots/disc-*`, `co-2/3/5/8`, `rd-0`, `runway-1700/4200`, `v2-9000`, `shots/d-4200`, `shots/m-final`, `desktop-5-dyed` y `f164-*`.
- **Medido contra**: `docs/design/segunda-etapa.md` (§1, §3 S1 a S3, §4), `docs/art-direction.md` §6 (voz) y "diversión > funcionalidad".
- **Límite**: la revisión se hizo sobre el código y las capturas, sin jugar en vivo. El sonido y el ritmo real (los 6 s de la ceremonia) quedan para verificarlos en la sesión con el usuario.

## Veredicto: **con cambios**. El loop está completo y ya es divertido, pero tiene 6 cambios de prioridad Alta

El loop corto **cierra**: probar gratis → el gato reacciona → ¡Listo! → caja → sellos → botones que vuelan → comprar → otra vuelta. Cada pieza tiene su juice: la etiqueta que se mece, la tijera y la etiqueta que cae girando (`buy-2`), el "¡MI FAVORITO!" con estallido de ✦ (`disc-2`), los ojos de corazón, la libreta rayada con las líneas que entran una a una y las polaroids de hitos. La ficha con "¡Me conoces!" (`sheet-full`) es un premio precioso. **El Hito A se puede mostrar al usuario**, avisándole que Kofi todavía es el gato gris de reemplazo.

Lo que impide aprobarlo son seis puntos que rompen la **claridad** o el **"la próxima le saco 5"**, que es el motor de otra vuelta:
1. Los textos con el tag en crudo ("Le encanta lo invierno", "Todo muy lana", "clasico") suenan a máquina justo en el momento del veredicto.
2. Con 1★ y sin ropa, la libreta queda **vacía** (`d-4200`): parece un error, no un veredicto.
3. Cuando un look repetido paga solo la propina de 2, **nadie explica por qué**. El jugador va a creer que el juego falló.
4. Con 4★ no hay una pista de lo que faltó. Es el momento de mayor deseo, y se pierde.
5. La etiqueta de una prenda de cabeza o de cara **tapa los ojos del gato** (`rd-0`), que son el feedback central de los gustos.
6. En la caja, si alcanza para una prenda pero no para las dos, no hay forma de llevarse solo una (`co-2`). "No alcanza" se vuelve un callejón.

---

## 1. ¿El loop se siente divertido y completo?

**Sí, completo. Divertido: sí en DressUp, a medias en la pasarela.**

- **Tienda (S3, F13.R)**: "probar es gratis" **se entiende sin texto**, porque las prendas bloqueadas salen a todo color con su etiqueta y se arrastran igual. Cortar la etiqueta se siente bien. El monedero en frasco es lindo. Lo que falla: la etiqueta puesta tapa la cara (A5), la caja no deja elegir (A6) y el texto de "te faltan" sale en frambuesa, que se lee como un error (M3).
- **Gustos (S2, F14.R)**: cada gato **sí se siente distinto**; los ojos de corazón y el "mmm… no" funcionan. El chip a la ficha existe, pero **el cartel del nombre no avisa que se puede tocar** (M1). En la ficha, el punto del color favorito sale azul aunque el color sea "Naranjo" (A, bug de datos visibles: lo incluyo en A5b). `puaj` sobre gatos oscuros sigue pendiente de F12.R A1.
- **Calificación (S1, F15.R)**: los sellos, la libreta, los botones que vuelan y las notas polaroid están todos. Le falta **voz**: Kofi dice lo mismo con 3★ y con 4★ ("Bien ahí… me gustó harto"), no dice nada del look repetido y no da una pista para la próxima. Las estrellas ganadas en tinta negra se leen pesadas, como si fueran "malas" (M5).

**Qué falta para que sea tierno y vivo** (en orden de impacto por esfuerzo):
1. **Que Kofi hable de lo que pasó**: una frase distinta por estrellas, por look repetido y por look vacío, y una **pista concreta con 4★** (A2, A3, A4). Es solo texto y una condición: esfuerzo S.
2. **Que el gato reaccione en la pasarela a su propio veredicto**: con 1–2★ hoy pone `parpadeo` y parece dormido (`d-4200`). Propongo `sorpresa` → `feliz` (un "¿eh? ¡bueno!"), nunca triste (M4).
3. **Kofi de verdad**, con 2 o 3 expresiones. Depende de la respuesta del usuario (pregunta abierta del roadmap). No bloquea el Hito A.
4. Que el cartel del nombre muestre "♥ 3/5" (M1): convierte la ficha en una colección visible desde el probador.

---

## 2. Balance de la economía (para F21.1)

### Diagnóstico
El problema **no es solo** que `byStars` pague mucho. Es estructural:
- Lo que se gana **una sola vez** (descubrir gustos, récords y combos: 2220, más 100 iniciales) **ya alcanza para comprar todo** (2350). Cualquier pago por look adelanta el final.
- El jugador modelo visita 2 gatos por sesión, así que **conoce a los 12 en la sesión 6**, y esa es justo la sesión en la que termina de comprar. La mayor parte del dinero de descubrir entra en las sesiones 1 a 6.
- El jugador modelo es **optimista**: viste con codicia perfecta y casi nunca repite un look (empieza cada look al azar), así que la novedad casi no le recorta. Un jugador real repite más looks y cobra propinas, y va a ir **más lento** que el modelo.

### Recomendación: solo `payout.byStars`
```json
"payout": {
  "byStars": { "1": 3, "2": 6, "3": 10, "4": 14, "5": 20 },
  "nearFactor": 0.5,
  "tip": 2
}
```
Es la variante B con el 2★ en 6 en vez de 5, para que cada estrella sume algo que se note (3 → 6 → 10 → 14 → 20). **El resto de `economy.json` no se toca**: ni precios, ni `discoveryBonus`, ni `milestones`, ni `comboBonus`.

**Por qué esta y no la A**: con la A (5★ = 24) estimo que el 100 % cae en la sesión 6 o 7, apenas una sesión después que hoy. Con esta, el pago por look baja a la mitad y el dinero de descubrir pasa a ser claramente el protagonista, que es la promesa de la §4.

**Estimación** (a mano, hay que confirmarla con el simulador en F21.1): el 50 % de lo comprable cae en la sesión 3 o 4 (se cuenta por cantidad, y lo barato se compra primero: las 10 básicas y los 9 frascos ya son el 51 %); el 100 % cae en la 8 o 9; el flujo de descubrir ronda el 75 %; y después de comprar todo sobran unos 110 botones por sesión, en vez de 230.

**Aceptación para F21.1** (para reemplazar la de F13.8):
- 50 % entre las sesiones 3 y 5 (sin cambios).
- 100 % entre las sesiones **8 y 11** en las 5 semillas (hoy el test solo pide ≤ 12 y ≥ 5).
- **Flujo de descubrir ≥ 70 %** del dinero ganado hasta el 100 %. El "90 %" de la §4 se refiere al **potencial** (2320 de 2350 se pueden ganar una sola vez) y queda así documentado; el test mide el flujo real con el umbral de 0,7 (hoy está en 0,5).

**Si el simulador da < 8 con estos números**, se ajusta en este orden y solo uno a la vez: (1) `novelty.window` de 3 a 5; (2) `nearFactor` de 0,5 a 0,4. **Nunca** se suben precios ni se baja lo que paga descubrir: eso sería agregar trabajo (§4).

### Los botones que sobran después del 100 %
**No recomiendo** la regla de "si el gato ya tiene 5★ y todos sus gustos, sus looks pagan solo propina":
- Castiga justo al jugador que se encariñó con un gato, que es lo que buscamos.
- Es invisible: el jugador ve que Kofi paga menos sin razón (el mismo problema de A3).
- Después del 100 % la motivación es otra por diseño: los llaveros dorados (5★ con cada gato), el álbum y el modo foto. Un monedero que crece no molesta en un juego cozy.

Lo que sí hace falta es que el número **no se sienta inútil**. Para el MVP basta con que, cuando ya se compró todo, la ceremonia muestre los botones volando igual y la nota diga "¡Ahorrando para lo que viene!" (S, opcional, Baja). Un destino real para los botones (decorar la tienda o el colgador) va a **"Fuera de la etapa"** en `docs/game-design.md`, junto con la tienda con monedas del futuro.

---

## 3. Los textos

### 3.1. Nombre legible de cada tag (en los datos)
Propuesta: un mapa en datos, por ejemplo `src/game/data/tags.json`. El `architect` decide si va en un JSON propio o dentro de otro, porque cambia el contrato de datos (ADR 0017/0019). Cada tag tiene tres formas:
- `label`: el chip de la ficha y el "♥ estrellas" que vuela (minúscula y con tilde).
- `love`: la frase nominal para "Le encanta {love}" y "No le tinca {love}" (también en las polaroids de descubrimiento).
- `style`: la frase completa de armonía de la libreta ("Todo …").

El schema valida que todo tag usado en una prenda visible o secreta tenga su entrada (menos `ignoredTags`). Los textos de `copy/ceremony.ts` y `copy/tastes.ts` dejan de concatenar el id y usan el mapa.

| Tag | `label` | `love` | `style` |
|---|---|---|---|
| `lana` | lana | la lana | Todo de lana |
| `rayas` | rayas | las rayas | Todo a rayas |
| `navidad` | Navidad | la Navidad | Todo muy navideño |
| `invierno` | invierno | el invierno | Todo muy invernal |
| `elegante` | elegante | lo elegante | Todo muy elegante |
| `corazones` | corazones | los corazones | Todo con corazones |
| `tierno` | tierno | lo tierno | Todo muy tierno |
| `clasico` | clásico | lo clásico | Todo muy clásico |
| `deportivo` | deportivo | lo deportivo | Todo muy deportivo |
| `gatuno` | gatuno | lo gatuno | Todo muy gatuno |
| `arcoiris` | arcoíris | el arcoíris | Todo arcoíris |
| `mar` | mar | el mar | Todo muy marinero |
| `lunares` | lunares | los lunares | Todo a lunares |
| `alegre` | alegre | lo alegre | Todo muy alegre |
| `huellitas` | huellitas | las huellitas | Todo con huellitas |
| `comodo` | cómodo | lo cómodo | Todo muy cómodo |
| `frutal` | frutal | lo frutal | Todo muy frutal |
| `cielo` | cielo | el cielo | Todo en las nubes |
| `espacio` | espacio | el espacio | Todo muy espacial |
| `estrellas` | estrellas | las estrellas | Todo con estrellas |
| `gala` | gala | la ropa de gala | Todo de gala |
| `realeza` | realeza | la realeza | Todo muy regio |
| `animalitos` | animalitos | los animalitos | Todo con animalitos |
| `cocina` | cocina | la cocina | Todo con olor a cocina |
| `divertido` | divertido | lo divertido | Todo muy divertido |
| `vaquero` | vaquero | lo vaquero | Todo muy vaquero |
| `verano` | verano | el verano | Todo muy veraniego |
| `paseo` | paseo | salir de paseo | Todo listo pa'l paseo |
| `flores` | flores | las flores | Todo con flores |
| `fiesta` | fiesta | la fiesta | Todo listo pa' la fiesta |
| `heroe` | héroe | lo heroico | Todo muy heroico |
| `brillo` | brillo | el brillo | Todo brillante |
| `magia` | magia | la magia | Todo mágico |

Resultados: "Le encanta el invierno", "No le tinca la ropa de gala", "Todo de lana", "Todo muy clásico", "A Mandarina no le tinca el invierno". La línea de combo queda "Combo ¡Look Navidad!", que ya está bien.

### 3.2. "tiern@" y la voz de la marca
**Criterio**: la @ es la firma de la marca **solo en frases genéricas, dirigidas a cualquier gato** ("tu gat@", "a tu gat@ le pongo sweater"). Cuando una frase le habla **a un gato concreto** o habla de él (Kofi en la pasarela, las burbujas, las frases con `{cat}`), **no se usa @ ni se adivina el género**: se escribe con palabras neutras ("un amor", "adorable", "precioso look"). Además, la @ no se puede leer en voz alta, y la burbuja del juez es diálogo.

Por eso, "¡Igual quedaste tiern@!" pasa a "**¡Igual te ves adorable!**". Las pistas de `cats.json` ("Siempre lista pa'l paseo") se quedan: son de autor, con un nombre fijo, y no las escribe el jugador.

### 3.3. Frases nuevas del juez (en `copy/judge.ts`)
| Caso | Frase |
|---|---|
| 1–2★ | "¡Igual te ves adorable, {cat}!" |
| 3★ | "Bien ahí, {cat}. Me gustó harto" (la de hoy) |
| 4★ | "¡Uf, {cat}! Casi perfecto…" + la pista de A4 |
| 5★ | "¡Perfecto, {cat}! Cinco estrellas, me encantó" (la de hoy) |
| Look repetido (propina) | "Este look ya me lo mostraste… ¡sorpréndeme!" |
| Look casi igual (50 %) | "Mmm, se parece harto al de recién" |
| Sin ropa | "¿Y la ropa? ¡Igual te ves adorable!" |

Detalle menor: `sellerLines.thanks` arma "dice La vendedora" con mayúscula a mitad de frase. Conviene "¡Gracias por pasar! Vuelve cuando quieras" sin el "dice".

---

## 4. Cambios priorizados

Esfuerzo: S (≤ medio día), M (1–2 días). "Encaja en" es la tarea dueña del archivo; los ajustes de las tareas ya hechas se registran como ajustes de F13.R, F14.R o F15.R.

### Alta (bloquean la aprobación del Hito A)

| # | Qué | Por qué es divertido | Esf. | Archivos | Encaja en | Pista técnica |
|---|---|---|---|---|---|---|
| A1 | **Nombres legibles de los tags** (§3.1) en la libreta, las polaroids, los chips y la ficha. | El veredicto es el momento emocional: un "lo invierno" lo vuelve robótico. | S | `data/tags.json` (o lo que decida el architect), `data/schema.ts`, `copy/ceremony.ts`, `copy/tastes.ts`, `objects/TasteChip.ts` | **F15.6 nueva** (S, writer; architect antes si hace falta ADR) | `ratingLineText(line, names)` recibe el mapa; test de tabla con "invierno", "clasico" y "gala". |
| A2 | **Libreta nunca vacía**: si el look no tiene líneas, una línea "Al natural · 0" y la frase "¿Y la ropa?…". El ¡Listo! sin ropa se mantiene (el jugador manda). | Una tarjeta en blanco parece un bug; un chiste suave invita a vestirlo. | S | `domain/score.ts` (línea `empty`) o `domain/ceremony.ts`, `copy/ceremony.ts`, `copy/judge.ts` | F15.3 (ajuste) | La línea entra con el mismo tic de `RisingPitch`. |
| A3 | **Explicar la novedad**: si el look es repetido o casi igual, Kofi lo dice (§3.3) y la nota de botones muestra "Propina +2". | Sin explicación, cobrar 2 botones se siente como un error o un castigo; con la frase, es un reto ("¡sorpréndeme!"). | S | `domain/progress.ts` (el evento `coins` lleva `novelty`), `copy/judge.ts`, `objects/showcase/Ceremony.ts` | F15.4 (ajuste) | `coins: { amount, novelty: 0 \| 1 \| 2 }`; Kofi levanta la ceja (escala Y 1 → 1,08, `Back.easeOut`) cuando se cree Kofi. |
| A4 | **Pista para la próxima con 4★** (y con 3★): "Te faltaron 2 puntitos… ¿qué le encantará a {cat}?" Si el jugador ya conoce un gusto que no usó, la pista lo nombra: "¿Y si le pones algo con estrellas?". | Es literalmente "la próxima le saco 5": convierte el casi en deseo de otra vuelta. | S | `domain/score.ts` (`pointsToNext`), `copy/judge.ts`, `Ceremony.ts` | F15.4 (ajuste) | Puro y testeable: `pointsToNext(points, thresholds)`; elige un `love` descubierto que no esté en el outfit. |
| A5 | **La etiqueta puesta no tapa la cara**: en los slots `head` y `face`, la etiqueta cuelga del borde exterior de la prenda (al costado de la oreja), no sobre el ojo (`rd-0`). | Los ojos son el feedback de los gustos: si la etiqueta tapa un ojo de corazón, se pierde la reacción. | S | `objects/dressup/PriceTagsController.ts` (y `anchors.json` si el ancla vive ahí) | F13.4 (ajuste) | Un offset por slot en los datos; test de integración: el rectángulo de la etiqueta no cruza el rectángulo de los ojos. |
| A5b | **El color favorito de la ficha se pinta con su color**: hoy el punto de "Naranjo" sale azul (`sheet-full`). | Mostrar un color equivocado enseña algo falso del gato. | S | `objects/TasteChip.ts` (`drawGlyph` caso `color` usa el color del tipo, no el `hex` del tinte), `CatSheetController.ts` | F14.4 (ajuste, empieza con un test que lo reproduce) | Pasar `dye.hex` al chip, igual que ya hace `CheckoutSheet` con `swatch`. |
| A6 | **En la caja se puede sacar una prenda sola**: cada fila tiene una ✕ (área de 80) que la quita del gato con el "puf" y recalcula el total; [Llevar todo] se habilita en cuanto alcanza. | "No alcanza" no puede ser un callejón: elegir qué llevarse es parte del deseo. | M | `objects/CheckoutSheet.ts`, `objects/dressup/CheckoutController.ts`, `domain/checkout.ts` | F13.6 (ajuste) | Reutiliza el "puf" de `leaveOut` con una sola prenda; el total cuenta con el tick del monedero; e2e en F13.7. |

### Media

| # | Qué | Por qué | Esf. | Archivos | Encaja en | Pista técnica |
|---|---|---|---|---|---|---|
| M1 | El cartel del nombre muestra "♥ 3/5" y se mece apenas al pasar el mouse o al llegar un chip. | Hace visible que el cartel es la ficha y convierte los gustos en colección. | S | `CatSheetController.ts`, `NameSign` | F14.4 (ajuste) | Rótulo hermano del cartel (no hijo rotado: bug de F12.R A2); pop 1 → 1,15 → 1 al sumar. |
| M2 | La burbuja "¡MI FAVORITO!" no tapa el monedero ni el cartel (`disc-2`): va a la izquierda de la cabeza o más abajo. | El chip y los +15 vuelan justo ahí; si se tapan, se pierde el premio. | S | `TasteReactions.ts` (`say` con `head.x + 120, head.y - 70`) | F14.2 (ajuste) | Posición según el espacio libre: si choca con el HUD, la burbuja va al otro lado. |
| M3 | "Te faltan 80 botones" en `muted` y en voz de la vendedora ("¡Uy! Te faltan 80. Califica un par de looks y vuelves"), no en frambuesa. Revisar también por qué el monedero baja de 100 a 95 entre `co-2` y `co-3` (si es la sacudida a mitad de cuenta, bien; si no, es un bug). | §3 S3: "no alcanza" no frustra y nunca va en rojo alarma. | S | `copy/shop.ts`, `CheckoutSheet.ts`, `WalletController.ts` | F13.6 (ajuste) | Mismo token que las líneas negativas de la libreta. |
| M4 | En la pasarela, con 1–2★ el gato pone `sorpresa` 300 ms y después `feliz`, no `parpadeo` (parece dormido en `d-4200`). | El gato tiene que tomarse el veredicto con humor, nunca triste. | S | `domain/ceremony.ts` (la reacción por estrellas), `Ceremony.ts` | F15.2 (ajuste) | Cambiar la tabla de reacciones y su test. |
| M5 | Las estrellas ganadas en `sol` con contorno de tinta; las no ganadas, solo contorno de lápiz. Hoy se ganan en tinta negra y solo la 5.ª es `sol`. | Una estrella negra se lee como "mala"; las doradas se sienten premio. Además, la 5.ª se distingue con su estallido. | S | `objects/showcase/StarStamps.ts`, arte de los sellos | F20.6 (repintado del Showcase) | Si el arte lo quiere en tinta, al menos un relleno `sol` claro. |
| M6 | El tachón de una línea negativa cruza el **texto**, no el número: hoy el "−3" no se lee (`v2-9000`). | El jugador tiene que entender qué le restó para aprender del gato. | S | `objects/showcase/RatingCard.ts` | F15.3 (ajuste) | El trazo va de `x` del texto a su `width`, no hasta la columna de puntos. |
| M7 | Frases del juez por caso (§3.3), con "tiern@" → "¡Igual te ves adorable!". | El 4★ y el 3★ hoy suenan igual; cada estrella merece su frase. | S | `copy/judge.ts` | F15.6 (junto con A1) | Test de tabla por estrellas y por novedad. |
| M8 | El cartel del nombre tapa la copa del sombrero y el gorro de chef (`co-8`, `rd-0`). | La prenda nueva tiene que lucirse entera. | S | `objects/dressup/layout.ts` (posición del cartel) | F20.5 (repintado del DressUp) | Subir el cartel o bajarle el `depth` detrás de las prendas de `head`. |

### Baja

| # | Qué | Esf. | Archivos | Encaja en |
|---|---|---|---|---|
| B1 | La vendedora en la caja es una mano con una etiqueta: reemplazarla por su dibujo cuando exista (misma pregunta que Kofi). | M (arte) | `CheckoutSheet.ts`, `art/` | Después de la respuesta del usuario |
| B2 | En la caja, "Son 180 botones. Si te tinca…" repite el total. Mejor variar: "¡Lindas elecciones! Si te tinca, te lo llevas". | S | `copy/shop.ts` | F13.6 (ajuste) |
| B3 | `sellerLines.thanks` sin "dice {seller}" (§3.3). | S | `copy/shop.ts` | F15.6 |
| B4 | Con todo comprado, la nota de botones dice "¡Ahorrando para lo que viene!". | S | `copy/ceremony.ts` | F21.1 |
| B5 | Verificar `v2-9000`: la libreta dice "Combo Look Navidad" pero el gato solo lleva el sweater de rayas. Si es un look armado a mano para la captura, no hay nada que hacer; si no, el gato de la pasarela no muestra el outfit calificado. | S | `scenes/Showcase.ts` | F15.5 (verificar en e2e) |

### Economía
| # | Qué | Encaja en |
|---|---|---|
| E1 | `payout.byStars` = `{1:3, 2:6, 3:10, 4:14, 5:20}`; nada más en `economy.json` (§2). | F21.1 |
| E2 | `balance.test.ts`: 100 % entre las sesiones 8 y 11, y flujo de descubrir ≥ 0,7. Documentar que el 90 % de la §4 es el potencial. | F21.1 |

## Cierre
Cuando estén A1 a A6 (y A5b), el Hito A queda **aprobado** sin volver a revisar todo: basta una captura de la libreta con un tag con tilde, una de la caja quitando una fila, una del 1★ sin ropa y una del gato con lentes y su etiqueta. La sesión en vivo con el usuario debería mirar especialmente el sonido de los sellos y si la ceremonia se siente corta o larga en el celular.
