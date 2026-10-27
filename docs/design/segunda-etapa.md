# Segunda etapa: el loop de Viste Lagato

> **Diversión > funcionalidad.** El MVP ya funciona: se puede vestir al gato. Esta etapa le da al jugador un **para qué**, sin quitarle nada de la ternura y el juice.

Autor: `game-designer` (2026-10-25). Estado: **propuesta**. Antes de construir hace falta la aprobación del usuario, y el `architect` tiene que escribir los ADRs de la §8. El `planner` usa este documento para armar el roadmap de la etapa 2.

Fuentes: `CLAUDE.md`, `docs/game-design.md`, `docs/art-direction.md`, `docs/roadmap.md`, ADRs 0003, 0004, 0006, 0007, 0008, 0013 y 0014, y los datos actuales de `src/game/data/` (12 gatos, 44 prendas visibles más 6 secretas y 6 combos).

---

## 1. El loop central

**En una frase**: *vistes a tu gat@ según lo que le gusta, Kofi califica el look con estrellas y te paga en botones, y con esos botones te llevas prendas y tintes nuevos que llenan tu álbum; cuando el look te encanta, lo guardas y tu gato se transforma en un **llavero de porcelana** de Lagatovino para tu colgador.*

El llavero **cierra el círculo** con la marca real: el juego termina donde empieza la tienda de Catalina, con un gatito pintado a mano que lleva el sweater que le elegiste.

La moneda se llama **botones** (los de los sweaters). Es un supuesto por defecto (§9).

### Loop corto (una sesión, cada 1 a 3 minutos)
```
        ┌──────────────────────────────────────────────────────────────┐
        ▼                                                              │
  Probar prendas  ──►  El gato reacciona      ──►  ¡Listo!  ──►  Kofi califica
  (arrastrar;          (♥ le encanta,               (caja si       (estrellas + desglose)
  también las          ✕ no le gusta,               hay algo           │
  que no tienes)       ★ ¡su favorito!)             sin pagar)         ▼
        ▲                     │                                   Botones al bolsillo
        │                     ▼                                   + hitos y gustos nuevos
        │            Gusto descubierto (+botones)                      │
        │                                                              ▼
        └──────── Comprar o teñir (se corta la etiqueta) ◄──── Modo foto (opcional)
                                                                       │ Guardar
                                                                       ▼
                                                     ¡Se transforma en llavero! → al colgador
```

### Loop mediano (varias sesiones)
```
  Descubrir los 5 gustos de cada gato ─► sacar 5★ con cada uno ─► juntar botones
          ▲                                                           │
          │                                                           ▼
  Pistas en la ficha del gato ◄── álbum: sets casi completos ◄── comprar las prendas de lujo
                                         │                       (corona, perlas, monóculo → combo realeza)
                                         ▼
                              Fondos, marcos, stickers y poses para el modo foto
                                         │
                                         ▼
                              Un llavero por gato en el colgador (argolla dorada con 4★ o más)
```

### Loop largo (la meta)
```
  Álbum al 100 %:  50 prendas · 60 gustos · 6 combos · 10 tintes · 12 llaveros
  + el colgador completo con los 12 llaveros dorados (5★ con cada gato)
          │
          ▼
  Nota de Catalina + marco "Kofi aprueba" y tu colgador lleno, listo para presumir
```

**Por qué funciona sin pedidos de clientes**: el objetivo no viene de afuera, viene del **propio gato**. Cada gato tiene una personalidad (gustos), y "vestirlo bien" significa conocerlo. Kofi solo califica, no pide nada. Es la fantasía de la marca: *a tu gat@ le pongo sweater... pero el que le gusta a él.*

---

## 2. El hilo conductor

Cada feature produce algo que otra consume. La **calificación** es el centro: convierte el acto de vestir (lo que ya existe) en botones y en descubrimientos.

| Feature | Recibe de... | Entrega a... |
|---|---|---|
| **S1 Calificación (Kofi)** | El outfit, los gustos del gato (S2), los combos y el tinte (S4) | Estrellas → **botones** (S3), récords por gato (S5), desbloqueos del modo foto (S6) |
| **S2 Gustos de cada gato** | Las prendas que el jugador prueba | Puntos en la calificación (S1), botones por descubrir (S3), entradas del álbum (S5), reacciones (juice) |
| **S3 Botones y tienda en el probador** | Botones de S1 y S2 | Prendas (más looks para S1 y S2), tintes (S4), entradas del álbum (S5) |
| **S4 Tintes** | Frascos comprados (S3) | El "color favorito" de los gustos (S2), puntos (S1), entradas del álbum (S5) |
| **S5 Álbum** | Todo lo anterior | Metas visibles (siluetas, %, sets), premios para el modo foto (S6), pistas de gustos |
| **S6 Modo foto** | El look calificado y los premios del álbum | La composición (fondo, marco, stickers y pose) que viste al llavero y a su empaque (S8). **No da botones**: es una recompensa, no una fuente. Si diera botones, la foto se volvería trabajo. |
| **S8 Llavero** | El look, la pose y la composición de S6, y las estrellas de S1 (la argolla) | Una entrada por gato en el álbum (S5, el colgador), el PNG para presumir y el cierre con la marca. Es el **remate del loop largo**: llenar el colgador con 12 llaveros dorados pide 5★ con cada gato, o sea, conocer los gustos (S2) y tener la ropa (S3). |
| **S7 Estética Lagatovino** | — | No alimenta el loop mecánicamente: es el envoltorio. Cambia el **tono** (voz, Kofi, Catalina, cuaderno) y le da un sentido de marca a todo. Kofi como juez y la tienda de Catalina sí salen de aquí. |

Los combos y las prendas secretas del MVP se quedan como están y se integran: un combo suma puntos, paga botones la primera vez y entrega su prenda secreta, que cuenta en el álbum.

---

## 3. Fichas de features

Prioridad: **Alta** = núcleo del loop (sin esto no hay "para qué"), **Media** = profundiza, **Baja** = remate. Esfuerzo: S, M, L.

### S0. Contrato de datos y progreso (habilitante, **Alta**, M)
No es una feature de diversión, pero **bloquea a todas las demás**. Ver §7.
- Tipos nuevos en `domain/types.ts`: `CatPrefs`, `DyeDef`, `ItemTier`, `Progress`, `RatingResult`, `ProgressEvent`.
- Ampliación de los JSON y de `data/schema.ts` (detalles en cada ficha).
- `economy.json` con **todos** los números de balance. Ninguna cifra queda escrita en el código.
- Save v2 (ADR nuevo, §8) con migración desde v1.
- Un reductor puro `domain/progress.ts`: `applyRating(progress, result) → { progress, events[] }`. Los `events` (`coins`, `milestone`, `tasteFound`, `comboFirst`, `setCompleted`, `unlock`) son la **coreografía** que la escena reproduce uno por uno. La lógica queda testeable y el juice queda ordenado.
- Sugerencia para el `architect`: DressUp va a ser el punto caliente (S2, S3 y S4 lo tocan). Conviene que emita eventos de escena (`item-dropped`, `item-removed`, `ready-pressed`) y que cada feature viva en su propio controlador en `objects/` (`TasteReactions`, `PriceTags`, `DyeTab`, `CheckoutSheet`). Así se trabaja en paralelo sin pisarse.

---

### S1. Calificación del estilo: "Kofi revisa el look" (**Alta**, M)

**Objetivo de diversión**: el momento de **veredicto**. Que el ¡Listo! tenga suspenso y premio, que cada estrella suene como un sello y que el jugador piense "la próxima le saco 5".

**Mecánica**
Al pulsar ¡Listo!, se pasa al Showcase (que ahora es la pasarela). Kofi, el gato supervisor de la tienda, entra con su libreta y califica. Kofi **no pide nada**: solo opina de lo que hiciste.

Puntaje (función pura `scoreLook`). Se ignoran los tags técnicos `secreto` y `mece`.

| Componente | Regla | Tope |
|---|---|---|
| **Estilo** (armonía) | Por cada tag, `max(0, prendas_con_ese_tag − 1)` | +6 |
| **Le encanta** | +2 por prenda con al menos un tag que el gato ama | +6 |
| **No le gusta** | −3 por prenda con el tag que el gato detesta | sin tope |
| **¡Su favorito!** | +2 si lleva su prenda favorita | +2 |
| **Look completo** | +1 con 3 slots puestos, +2 con 4 o más | +2 |
| **Combo** | +3 por cada combo completo | +6 |
| **Su color** | +1 por prenda teñida con su color favorito | +2 |

Estrellas (nunca hay 0: no se castiga).

| Puntos | ≤ 2 | 3–5 | 6–9 | 10–13 | ≥ 14 |
|---|---|---|---|---|---|
| Estrellas | 1★ | 2★ | 3★ | 4★ | 5★ |

Ejemplos con los datos reales:
- Look al azar (sweater de rayas + gorro de chef + lentes de sol + mochilita) en un gato neutral: estilo 1 (`deportivo` ×2) + completo 2 = 3 → **2★**.
- ¡Look Navidad! en Grisú (ama `clasico` e `invierno`): estilo 6 + le encanta 6 + completo 2 + combo 3 = 17 → **5★**.
- El mismo look en Mandarina (detesta `invierno`): 6 + 2 + 3 − 12 = −1 → **1★**, y Mandarina pone cara de "¡qué calor!". Es gracioso, no es castigo, y enseña que cada gato es distinto.
- Combo sin gustos a favor: unas 11 → **4★**. **El 5★ siempre pide conocer al gato.**

**Juice y feedback** (todo se puede saltar tocando: con un toque la ceremonia avanza ×3 hasta el final)
1. Iris → el gato posa en la alfombra (lo de hoy).
2. Kofi entra desde la derecha (x +300 → 0, 420 ms, `Back.easeOut`), con la libreta, y dice en letra Gaegu: "A ver, a ver…".
3. Desglose: hasta 5 líneas en una tarjeta de papel rayado. Cada una entra cada 260 ms con un "tic" que sube de tono (`RisingPitch`, ya existe) y un ✦ que salta. Las negativas se escriben en `muted` (#6A5F57) y con un tachoncito de lápiz, nunca en rojo alarma.
4. Las estrellas se estampan como **sellos**: escala 1,6 → 1 (`Back.easeOut`, 180 ms) con 140 ms entre una y otra, un "tump" suave de sello y un temblor de cámara de 2 px (que con movimiento reducido no ocurre). La 5.ª sale en `sol` con un estallido de ✦.
5. La reacción del gato según las estrellas: 1–2★ `parpadeo` y Kofi dice "¡Igual quedaste tiern@!"; 3★ `feliz`; 4★ `amor`; 5★ `amor`, ronroneo largo y confeti de ✦.
6. Los **botones vuelan** de la libreta al monedero (arco con `Phaser.Curves.QuadraticBezier`, 40 ms de desfase entre uno y otro, como mucho 12 botones visibles), suena un "clic" de botón contra botón y el contador sube tick a tick.
7. Los eventos (récord, gusto, set) aparecen en fila como notas tipo polaroid, una cada 700 ms, cada una con su sonido.
- Duración total ≤ 6 s. Con movimiento reducido: todo con fundido, sin temblor, y los botones solo cuentan (salen 3 en vez de 12).

**PC y celular**: no hay interacción obligatoria; "Clic para seguir" en PC y "Toca para seguir" en táctil (pill en la parte baja). Los botones finales (Modo foto, Seguir vistiendo, Otro gato) miden ≥ 80 unidades de alto.

**Datos**: `economy.json → scoring` (pesos, topes, umbrales y tags ignorados).

**Lógica pura (domain/)**
- `score.ts`: `scoreLook(outfit, itemDye, cat, catalog, combos, rules) → { points, stars, breakdown[] }`.
- Tests: tabla de ejemplos (los de arriba), que las estrellas sean monótonas respecto de los puntos, el mínimo de 1★, que los topes se apliquen y que se ignoren los tags técnicos.
- **Test de balance en `schema`**: `bestPossibleStars(cat, catalog) === 5` para los 12 gatos, y ≥ 3★ solo con las prendas iniciales.

**Mínimo divertido**: puntaje, sellos, reacción del gato y botones que vuelan. Kofi puede ser al principio un dibujo estático que entra deslizándose.
**Nice to have**: Kofi con 2 o 3 expresiones (mira la libreta, levanta una ceja, aplaude); un "medidor de ronroneo" en DressUp que se llena con lo que le gusta al gato (sin números).

---

### S2. Gustos de cada gato (**Alta**, M)

**Objetivo de diversión**: que cada gato se sienta **una persona distinta** y que conocerlo sea el juego. "¡A Luna le encantan las estrellas!" es un descubrimiento, no una regla que se lee.

**Mecánica**
Cada gato tiene 5 gustos ocultos: **2 tags que ama, 1 tag que detesta, 1 prenda favorita y 1 color favorito** (el color depende de S4). Se descubren jugando: la primera vez que un gusto se activa al soltar una prenda (o al teñirla), queda anotado en la ficha del gato y paga **+15 botones**.

Prioridad de reacción al soltar una prenda: combo > favorito > detesta > ama > neutral.

Propuesta inicial (verificada contra los tags de `clothes.json`: cada gato tiene al menos una prenda que ama entre las iniciales y puede llegar a 5★ con el catálogo completo; el test de balance de S1 lo vigila):

| Gato | Ama | Detesta | Favorito | Color | Pista en la ficha (Gaegu) |
|---|---|---|---|---|---|
| Naranjito | `gatuno`, `cocina` | `elegante` | `sweater-pescaditos` | naranjo | "Todo lo que huela a cocina…" |
| Luna | `estrellas`, `gala` | `frutal` | `face-lentes-estrella` | lila | "De noche brilla más." |
| Tricolor | `frutal`, `flores` | `deportivo` | `head-gorrito-fresa` | rosa | "Huele cada flor del jardín." |
| Grisú | `clasico`, `invierno` | `tierno` | `sweater-trenzado` | lapiz | "Serio. Muy serio." |
| Nieve | `tierno`, `lana` | `cocina` | `sweater-nubes` | cielo | "No le gusta mancharse." |
| Michi | `elegante`, `realeza` | `comodo` | `neck-mono` | frambuesa | "Nació de esmoquin." |
| Carey | `corazones`, `fiesta` | `clasico` | `accessory-globo` | tomate | "Lo clásico le da sueño." |
| Siamés | `realeza`, `comodo` | `deportivo` | `accessory-taza-leche` | durazno | "Quiere que lo atiendan." |
| Canela | `deportivo`, `vaquero` | `gala` | `neck-panuelo` | hoja | "Siempre lista pa'l paseo." |
| Vainilla | `rayas`, `comodo` | `realeza` | `paws-calcetines-rayas` | sol | "Nada de coronas, gracias." |
| Humo | `invierno`, `mar` | `deportivo` | `neck-bufanda-larga` | cielo | "Sueña con el mar en invierno." |
| Mandarina | `deportivo`, `verano` | `invierno` | `face-lentes-sol` | sol | "¡Qué calor!" (sí, en un juego de sweaters) |

Notas de balance: `fiesta`, `flores`, `vaquero`, `verano` y `mar` tienen 1 o 2 prendas. Esos gatos son de "ojo fino", y está bien que haya variedad de dificultad. Si las pruebas los muestran frustrantes, se suma el tag a 1 o 2 prendas existentes **solo en el JSON** (por ejemplo, `flores` a la corona de flores ya está; `verano` al sombrero de copa no; `mar` a la bufanda de rayas sí podría).

**Juice y feedback** (en DressUp, al soltar)
- **Le encanta**: cara `amor` 900 ms, 3 corazones extra en `frambuesa` y un ronroneo corto. La primera vez, un chip "♥ estrellas" sale del gato y vuela al cartel del nombre (que ahora es su ficha), con un "pop" de papel y +15 botones contando.
- **No le gusta**: cara nueva `puaj` (ojos de rayita y boquita ondulada), la cabeza dice "no" (angle ±4°, dos veces, 120 ms; con movimiento reducido, solo cambia la cara), una burbuja Gaegu "mmm… no" y un maullido grave (`rate` 0,8). **La prenda se queda puesta**: el jugador manda, el gato solo opina.
- **¡Su favorito!**: estallido de ✦ en `sol`, `amor` 1,5 s, ronroneo largo, cartel "¡MI FAVORITO!" que se da vuelta (reutiliza el giro de `NameSign`).
- **Su color**: al teñir con su color, gira la cabeza hacia la prenda y dice "¡mi color!".
- Al cambiar de gato con el outfit puesto (ya se conserva, F9), el gato nuevo reacciona a cada prenda en el pop escalonado: es una forma divertida de "leer" a un gato nuevo.

**PC y celular**: las reacciones no dependen del hover. La ficha del gato (el cartel del nombre) se abre con clic o toque y muestra los gustos descubiertos y las pistas; los chips miden ≥ 80 unidades.

**Datos**: `cats.json` suma `prefs: { loves: [tag, tag], dislikes: [tag], favoriteItem, favoriteDye, hint }`. El schema valida que los tags existan en alguna prenda visible, que el favorito exista y no sea secreto, y que el color exista en `dyes.json`.

**Lógica pura**: `domain/tastes.ts` → `tasteReaction(item, dye, cat) → { kind: 'love'|'dislike'|'favorite'|'color'|'neutral', tag? }` y `discoverTaste(found, catId, key) → { found, isNew }`. Tests de prioridad y de que un descubrimiento solo ocurre una vez.

**Mínimo divertido**: amar, detestar y favorito, con su reacción y el chip que vuela a la ficha. La cara `puaj` es un SVG nuevo.
**Nice to have**: una línea de voz por gato al descubrir todos sus gustos ("¡Me conoces!").

---

### S3. Botones y tienda en el probador (**Alta**, M)

**Objetivo de diversión**: el **deseo**. Ver la prenda que no tienes, **probártela gratis** y querer llevártela. Y el placer táctil de cortar la etiqueta.

**Mecánica**
- **No hay una escena de tienda aparte: el probador ES la tienda.** En el grid están todas las prendas visibles. Las que no tienes salen **a todo color** (es una vitrina, no un candado gris) con una etiqueta de cartón kraft colgando de una esquina y su precio.
- **Probar es gratis**: las prendas bloqueadas se arrastran al gato igual que las otras y el gato reacciona igual (los gustos se descubren y cuentan). Mientras está puesta, la prenda lleva una etiqueta colgando que se balancea.
- **Comprar**: tocar la etiqueta (en el gato o en la celda) abre una hoja "¿Te lo llevas? Sombrero de copa · 110 botones" con [Llevar] y [Todavía no].
- **Al pulsar ¡Listo! con prendas sin pagar**: aparece la caja de Catalina con la lista y el total. Las opciones son [Llevar todo] (si alcanza), [Sacarme lo que no tengo] (las prendas sin pagar vuelven al grid con un "puf" y se califica el resto) y [Seguir probando]. **Solo se califica lo que es tuyo.**
- **Combos con prendas sin pagar**: el combo suena (reacción corta), pero **no hay cajita** hasta tener todas las piezas. Catalina dice: "Uy, eso parece un look especial… si te lo llevas, hay regalito". Es un gancho de venta con la voz de la marca, no un castigo.
- Las prendas secretas no se venden: se siguen ganando con combos.

Precios (en `economy.json`, por nivel en `clothes.json`):

| Nivel | Precio | Prendas (28 bloqueadas al empezar) |
|---|---|---|
| Básica | 40 | lunares, universitario, chaleco, huellitas, vincha con moño, gorro de chef, bufanda larga, collar con cascabel, pañuelo, guantes de lana (10) |
| Linda | 70 | navideño, cuello alto, hoodie con orejitas, oversize, nubes, gorrito de fresa, gorro de rana, lentes de corazón, lentes de sol, botitas, mochilita, taza de leche (12) |
| Lujo | 110 | arcoíris, sombrero de copa, corona mini, collar de perlas, monóculo, globo (6) |

**Iniciales (16 prendas gratis)**, elegidas para cubrir los tags que aman todos los gatos y para que el primer combo (galáctico) salga en la primera sesión:
- sweaters: rayas, corazones, cohete, pescaditos, trenzado, fresa;
- gorros: beanie con pompón, boina;
- cuello: bufanda de rayas, moño;
- lentes: de estrella, redondos;
- patitas: mitones, calcetines de rayas;
- accesorios: flor en la oreja, ovillo.

**Juice y feedback**
- La etiqueta colgando se mece (angle ±6°, 1,4 s, `Sine.easeInOut`, yoyo) y al tocarla da un respingo (angle 18° → 0 con `Back.easeOut`).
- **Comprar**: una tijera cruza y corta el hilo con un "snip", la etiqueta cae girando con gravedad y se desvanece, los botones vuelan **del monedero a la prenda** (lo inverso de ganar), suena una caja registradora muy suave, el gato pone `amor` y dice "¡Es mío!" y la celda del grid pierde la etiqueta con un brillito.
- **No alcanza**: el monedero se sacude un poquito (con movimiento reducido, solo parpadea en `muted`), y Catalina dice: "Te faltan 30 botones. ¡Califica un par de looks y vuelves!". Nunca se pierde nada.
- Monedero (HUD arriba a la derecha): un frasquito con botones y el número en Londrina Solid. Al subir: pop 1 → 1,15 → 1 y tick por unidad (con tope de 1,2 s).

**PC y celular**: con mouse, la etiqueta crece un poco al pasar por encima (adorno); el precio **siempre se ve**, nunca solo en hover. El área de toque de la etiqueta es ≥ 80 × 80 aunque el dibujo sea más chico (helper de ADR 0014). La hoja de compra y la caja ocupan el centro con botones píldora de ≥ 88 de alto.

**Datos**
- `clothes.json` suma `tier: "basica"|"linda"|"lujo"` y `starter: true`. Las secretas no llevan `tier`.
- `economy.json`: `prices`, `startWallet: 100`, `payout`, `milestones`, `novelty`, `discoveryBonus`, `comboBonus`.
- Schema: toda prenda visible tiene `tier` o `starter`; las iniciales permiten el combo galáctico; ningún combo pide una prenda secreta (ya existe).

**Lógica pura**: `domain/economy.ts` → `priceOf`, `cartFromOutfit(outfit, owned)`, `checkout(cart, wallet) → { ok, wallet, owned } | { ok: false, missing }`, `payout(stars, novelty, rules)`, `lookSignature(outfit, itemDye)`, `novelty(sig, history)`, `milestoneBonus(best, stars)`. Además, `tests/unit/balance.test.ts`: un **jugador modelo** simulado (pone lo que el gato ama, prueba y compra lo más barato que sube su puntaje) que confirma el ritmo de la §4. Si alguien cambia un precio y el ritmo se rompe, el test falla.

**Mínimo divertido**: etiqueta en la celda, probar gratis, comprar tocando la etiqueta, la caja al ¡Listo! y el monedero.
**Nice to have**: Catalina dibujada detrás del mostrador con 2 o 3 frases al azar; una "vitrina del día" con una prenda destacada (sin descuento ni urgencia, solo luz).

---

### S4. Tintes: variantes de color (**Media**, M–L)

**Objetivo de diversión**: la **expresión personal** y la sorpresa de "¿cómo se ve en lila?". Y un gesto nuevo y satisfactorio: **tirarle tinta a la ropa**.

**Mecánica**
- Una 7.ª pestaña, **Tintes**, con 10 frascos de la paleta de la marca: cielo, rosa, sol, lila, durazno, naranjo, lapiz, frambuesa, tomate y hoja. Más un frasco **"agua"** (gratis) que devuelve el color original.
- **Se tiñe arrastrando** un frasco sobre una prenda puesta, coherente con "solo arrastrar" (ADR 0008). La prenda bajo el frasco se resalta con el halo de hover que ya existe.
- El color **queda en la prenda** (tu sweater de rayas ahora es lila), no en el slot: `itemDye[itemId]`. El modelo de outfit no cambia.
- Frasco inicial: **rosa**. Los otros 9 cuestan **50** cada uno. Probar un frasco que no tienes es gratis y deja una etiqueta "Tinte lila · 50" en la prenda (la misma mecánica que S3).
- **Alcance mínimo**: se tiñen **solo los 16 sweaters visibles** (el protagonista). Las secretas no se tiñen: ya son especiales.

**Cómo se recolorea** (para el ADR, §8): cada SVG teñible marca sus rellenos principales con `data-dye="a"` (color principal) y `data-dye="b"` (secundario). Una función pura reemplaza `a` por el color del frasco y `b` por un tono derivado (mezcla con crema al 45 %). El contorno, la sombra (negro al 15 %) y los detalles (botones, estrellas) no cambian. El resultado se rasteriza en tiempo de ejecución y se guarda en caché (`texture~dye`). No se usa el tinte de Phaser: multiplica también el contorno y ensucia los colores planos.

**Juice y feedback**
- Tomar el frasco: se destapa con un "pop" y gotea (2 o 3 gotas por segundo mientras se arrastra).
- Soltar sobre la prenda: salpicadura de partículas del color, el color nuevo **barre la prenda de abajo hacia arriba** (máscara que sube, 380 ms, `Sine.easeOut`; con movimiento reducido, fundido cruzado), un "blup" líquido y el gato se mira la panza con cara `sorpresa` → `feliz`.
- Soltar sobre el gato sin ropa en ese punto: "¡A mí no!", el gato se sacude y el frasco vuelve con rebote. No se tiñen gatos.
- Prenda que no se tiñe: el frasco rebota y una burbuja dice "Ese no se tiñe".
- En el grid y en el panel de capas, la prenda teñida muestra un puntito de su color en la esquina.

**PC y celular**: el frasco usa el mismo levantado sobre el dedo que las prendas (ADR 0014), y el halo de la prenda objetivo es **imprescindible** porque el dedo tapa. Las celdas de los frascos tienen el tamaño de las de prendas.

**Datos**: `dyes.json` (`id`, `name`, `hex`, `price`, `starter`); `clothes.json` suma `dyeable: true`. El schema valida que cada SVG teñible tenga al menos un `data-dye="a"`. Esto se prueba en `assets.test`.

**Lógica pura**: `domain/dye.ts` → `recolorSvg(svgText, { a, b }) → svgText`, `deriveTone(hex)`, `dyeTextureKey(texture, dyeId)`. Tests de que el contorno y la sombra quedan intactos, y de que `a` y `b` se reemplazan en `fill` y en `style`.

**Mínimo divertido**: sweaters, 10 frascos más agua, arrastrar y el barrido del color.
**Nice to have**: teñir gorros y bufandas; "tonos probados" como puntitos por prenda en el álbum.

---

### S5. Álbum (versión barata) (**Media**, M)

**Objetivo de diversión**: el "**¿qué más hay?**" hecho visible. Ver las siluetas de lo que falta da ganas de seguir.

**Mecánica** (una sola escena `Album`, un cuaderno con 5 pestañas)
1. **Prendas** (50): las que tienes, a color; las que no, como un **boceto en lápiz azul** (icono con `setTintFill` en `linea-lapiz` #8FA8E3, alpha 0,5), con el precio; las secretas no ganadas, como una silueta con "?" y la pista del combo ("algo galáctico…").
2. **Gatos** (12 fichas tipo polaroid): mejor estrella, gustos descubiertos (♥ ♥ ✕ ★ ●) y las pistas de los que faltan.
3. **Looks especiales** (6 combos): un hueco con washi para cada uno; al ganarlo, la tarjeta con su nombre y los iconos de las piezas.
4. **Tintes** (10 frascos).
5. **Colgador** (12 ganchos, uno por gato): los llaveros guardados (S8). El gancho vacío muestra la silueta del gato en lápiz.

- **Porcentaje total** = entradas conseguidas / 138 (50 prendas + 60 gustos + 6 combos + 10 tintes + 12 llaveros), escrito a mano en la portada: "Llevas el 37 %".
- **Sets** (`sets.json`, 6 iniciales). Al completar uno se gana algo para el **modo foto**, no botones:

| Set | Qué pide | Premio |
|---|---|---|
| Abriguito | beanie, bufanda larga, mitones, oversize, botitas | fondo vichy celeste |
| De gala | sombrero de copa, moño, perlas, lentes de estrella, chaleco | marco dorado |
| Fresas y flores | sweater de fresas, gorrito de fresa, flor en la oreja, corona de flores | stickers de fresa y flor |
| Michi mood | hoodie con orejitas, huellitas, cascabel, taza, ovillo | sticker de Kofi |
| La paleta | los 10 frascos | marco acuarela |
| Todos los secretos | los 6 combos | fondo de estrellas |
| Colgador dorado | 12 llaveros con argolla dorada | tag del llavero con ✦ dorado y marco "Kofi aprueba" |

- **Hitos del %**: 25 % → pack de stickers, 50 % → fondo rayado, 75 % → pose "dormilón", 100 % → **nota de Catalina** y marco "Kofi aprueba".

**Juice y feedback**: al abrirlo, el cuaderno cae girado y se endereza (`Back.easeOut`); para cambiar de página, la hoja gira (scaleX 1 → 0 → 1, 240 ms) con sonido de papel. Las entradas nuevas desde la última visita llevan un ✦ que late hasta que se ven. Al completar un set fuera del álbum, aparece una nota tipo polaroid que cae con washi tape.

**PC y celular**: se pasa de página arrastrando en horizontal o con flechas píldora de ≥ 80; tocar una entrada muestra su ficha (nada de tooltip por hover).

**Datos**: `sets.json` (`id`, `name`, `requires: { items?, dyes?, combos? }`, `reward`). Las recompensas apuntan a ids de `photo.json`.

**Lógica pura**: `domain/album.ts` → `completion(progress, catalogs) → { got, total, pct }`, `completedSets`, `newlySeen`. Los premios del modo foto se **derivan** del progreso (no se guardan aparte): `photoUnlocks(progress) → Set`.

**Mínimo divertido**: las 5 pestañas con bocetos y siluetas (el Colgador llega con S8), el % y los sets. Reutiliza `ItemGrid` y los iconos.
**Nice to have**: una página "Mis fotos" con las últimas 6 fotos como miniaturas de 160 px (cuidado con el tamaño de localStorage).

---

### S6. Modo foto (**Media**, M)

**Objetivo de diversión**: **presumir**. El cierre emocional del loop: "mira lo lindo que quedó mi gato", con un recuerdo que es tuyo y se ve como un scrapbook de Lagatovino.

**Mecánica** (una escena nueva `PhotoMode`, que sale del Showcase después de la calificación)
- **Fondos** (6): cuadriculado y cielo con nubes (iniciales), vichy celeste, rayado, estrellas y escenario.
- **Poses** (4, **sin arte nuevo de cuerpo**, solo transformaciones y caras): *sentadito* (la actual), *coqueto* (cabeza ladeada 8° y cara `amor`), *saltito* (congelado 24 px arriba con la sombra chica y cara `feliz`) y *dormilón* (`parpadeo`, squash leve y un sticker "zzz").
- **Marcos** (5): polaroid con washi amarilla (inicial, rotada al azar entre ±1° y ±8°), cuaderno con espiral, dorado, acuarela y "Kofi aprueba".
- **Stickers** (≈ 12): ✦, corazón, huellita y "Xoxo, mau!" (iniciales), más los de los sets y los hitos. Hasta 8 por foto.
- [Guardar] reemplaza al botón actual de descarga y **dispara la transformación en llavero** (S8). Lo que se compuso aquí (fondo, marco y stickers) se convierte en el **empaque** del llavero, y eso es lo que se descarga (en el celular sigue usando el menú de compartir, F10). Lleva el nombre del gato a mano (Gaegu) y sus estrellas.
- Todo se desbloquea con el **álbum** (S5), no con botones: los botones son para ropa.

**Juice y feedback**
- Cambiar fondo, pose o marco: transición de "pasar la hoja" o un pop; el gato cambia de pose con squash.
- Stickers: se despegan de la hoja con un sonido de *peel* y se inclinan al arrastrar (reutiliza `tilt.ts`). Al soltarlos se asientan con escala 1,2 → 1 y una rotación al azar de ±10°. Para quitarlos se arrastran de vuelta a la hoja (o a un tarro).
- Guardar: obturador y fundido crema, y enseguida la transformación de S8. El revelado de la miniatura (F9) ahora muestra el empaque con el llavero.

**PC y celular**: los stickers usan el levantado sobre el dedo; las bandejas de fondos, poses y marcos son tiras de botones de ≥ 80; nada depende del hover.

**Datos**: `photo.json` (`backgrounds`, `frames`, `stickers`, `poses`, cada uno con `id`, `texture` y `unlock: "starter" | { set } | { albumPct } | { firstFiveStar }`).

**Lógica pura**: ampliar `domain/photo.ts` con `framePlacement(seed)` (rotación estable por foto), `stickerLimit` y `clampSticker(pos, frameRect)`, y `domain/pose.ts` con la tabla de poses.

**Mínimo divertido**: 2 fondos, 2 poses, el marco polaroid y 4 stickers iniciales, más los que entregan los sets.
**Nice to have**: guardar la composición para repetirla; el texto libre en la foto (pide el input del DOM, ADR 0014).

---

### S7. Estética Lagatovino (**Alta**, en paralelo, L en total)
Se divide en tres paquetes independientes; el detalle está en la §6.
- **S7a. Kit de UI y tipografías** (M): tokens nuevos en `constants.ts`, Londrina Solid y Gaegu autoalojadas, `Button` píldora plano, tarjetas, pestañas tipo índice de cuaderno, fondos de papel, polaroid con washi, ✦ y la voz de los textos (`domain/copy.ts`).
- **S7b. Gatos opción B y trazo de las prendas** (M, solo `art/` + `npm run art`): cara nueva, contorno de tinta en negro cálido, sin mejillas y la cara `puaj` de S2.
- **S7c. Repintar las escenas** (M): Title, CatSelect (polaroids), ShopEntrance (fachada en tinta), DressUp, Showcase y Preloader con el kit de S7a.

**Mínimo divertido**: S7a y S7b completos, y en S7c los fondos y paneles de cada escena. El juice de hoy no se pierde, solo cambia de ropa.

---

### S8. El llavero: tu gato se vuelve porcelana (**Media**, M)

**Objetivo de diversión**: el **trofeo**. El look que armaste deja de ser una captura y pasa a ser *un objeto*: un llavero de porcelana pintado a mano, como los que hace Catalina. Es el "¡lo quiero!" que cierra el juego y conecta con la tienda real. Además, la transformación es el momento más mágico de todo el juego.

**Decisión de diseño**: **mientras juegas, el gato sigue siendo un gato normal** (el chibi de la opción B, con la misma plantilla y las mismas anclas). No se rehace ningún gato jugable, así que ninguna prenda se rompe. El llavero aparece **solo al guardar**, en el modo foto, y se arma **sobre el render del look actual** (no se dibujan gatos nuevos).

**Mecánica**
- En PhotoMode, al pulsar [Guardar], el gato vestido se transforma en llavero. El PNG que se descarga es el **empaque**: una tarjeta kraft con el agujero para colgar arriba, el letrero "Lagatovino · hecho a mano" (supuesto, §9), el fondo, el marco y los stickers que elegiste, el llavero colgando al centro, el nombre del gato en Gaegu, sus estrellas y "Xoxo, mau!".
- **La argolla depende de las estrellas** del look (S1): plata con 1★–3★, dorada con 4★ y dorada con un dije ✦ con 5★. Así la calificación también se ve en el trofeo.
- **El colgador** (5.ª pestaña del álbum, S5): un gancho por gato. Al guardar un llavero se **cuelga** en el gancho de ese gato; si ya había uno, se reemplaza solo si el jugador lo confirma ("¿Cambio el llavero de Luna?"), y por defecto se queda el de más estrellas. Llenar los 12 ganchos y tenerlos todos dorados es la meta larga (set "Colgador dorado").
- **Los llaveros no cuestan ni pagan botones**. El primero de cada gato cuenta en el álbum.

**¿"Modo llavero" como modo propio?** **No como escena aparte.** Se reparte en lo que ya existe, y así cuesta poco:
- la **transformación** vive en PhotoMode (es el final natural de "guardar");
- **ver y jugar con los llaveros** vive en la pestaña Colgador del álbum: tocar un llavero lo hace balancearse y tintinear, y tocarlo de nuevo lo trae al frente en grande, donde se puede **arrastrar para balancearlo** (péndulo) y **darlo vuelta** para ver el reverso.
Una escena propia solo se justificaría con más contenido (por ejemplo, decorar el colgador), y eso queda como nice to have.

**La transformación (juice)**, unos 2,2 s; con un toque se salta al final:
1. **Flash suave** crema y un "fuuu" de horno. El gato se encoge a 0,6 con squash (`Back.easeIn`, 220 ms) y queda en su pose congelada (ya existe `Cat.freezeForPhoto`).
2. **Giro**: da media vuelta (scaleX 1 → 0 → 1, 300 ms) y, al volver, ya es porcelana: un borde crema de 14 px alrededor de la silueta, con una línea de tinta fina por fuera, y los colores un poco más suaves, como pintados a mano.
3. **Barniz**: una franja de brillo blanco cruza la pieza en diagonal (420 ms, `Sine.easeInOut`) y suena un "ching" cristalino; quedan 2 o 3 brillos fijos de barniz.
4. **Herrajes**: la armellita se atornilla sobre la cabeza (rotación de 360° a 0, 180 ms y un "tic" metálico), la argolla cae desde arriba con `Bounce.easeOut` y la cadenita se desenrolla con un tintineo.
5. **Balanceo**: el llavero queda colgando y oscila como péndulo amortiguado (±14° que se apagan en 1,6 s), y en cada extremo suena un "tink" de porcelana cada vez más suave.
6. Con 5★, el dije ✦ destella y salen ✦ en `sol`.
7. **Empaque**: la tarjeta kraft sube desde abajo, el llavero se cuelga en ella, la miniatura cae girada (el revelado de F9) y vuela "al bolsillo". Aparece "¡Tu llavero está listo!" con dos botones: [Colgarlo] (va al álbum y el llavero vuela a su gancho con un "clic" y un balanceo) y [Seguir vistiendo].
- **Movimiento reducido** (ADR 0013): sin giro ni flash; fundido cruzado de gato a llavero, el brillo del barniz aparece fijo y el balanceo es de ±3° y se detiene en 0,6 s.

**Cómo se logra con un costo razonable**
- **No se dibujan gatos llavero.** Se reutiliza el render del look (el RenderTexture de `objects/photo.ts`) y se le aplica un tratamiento:
  - **borde de porcelana**: 12 a 16 copias planas del render teñidas de crema (`setTintFill`), desplazadas en círculo; es la misma técnica del halo de hover que ya existe (tarea 16 de F9). Debajo, otro anillo de copias en tinta para la línea exterior;
  - **"pintado a mano"**: un filtro de Phaser 4 sobre el render (ColorMatrix: −10 % de saturación y un poco más cálido);
  - **barniz**: una textura de brillo (SVG con manchas blancas suaves) recortada a la silueta con una máscara de la propia textura del render, más la franja que la cruza durante la animación.
- **Arte nuevo (S, en `art/ui/keychain/`)**: armellita, argolla plata y argolla dorada, dije ✦, cadenita, la textura de barniz, la tarjeta kraft del empaque y el fondo del colgador (corcho o papel con ganchos). Son unas 8 piezas pequeñas.
- **Sonido (ADR 0009, CC0)**: "tink" de porcelana, "ching" de barniz, tintineo de cadenita y el "fuuu" del horno.
- **Guardar recetas, no imágenes**: el colgador guarda la **receta** de cada llavero (`catId`, `outfit`, `itemDye`, `pose`, `stars`, `photo` elegidos y fecha) y lo vuelve a renderizar al abrir el álbum. Ocupa casi nada en localStorage y es compatible con una base de datos futura (ADR 0004).

**PC y celular**: tocar o hacer clic balancea el llavero; arrastrar lo empuja (el ángulo sigue al puntero y al soltar oscila); los botones del final miden ≥ 88 de alto; en el celular, la descarga del empaque usa el menú de compartir (F10). Nada depende del hover.

**Datos**: `photo.json` suma `keychain` (argolla por estrellas, tamaños, colores del borde y del barniz); el save v2 suma `keychains: Record<catId, KeychainRecipe>`.

**Lógica pura (domain/)**: `keychain.ts` → `ringFor(stars)`, `keychainRecipe(look, photoChoice, stars, date)`, `hangKeychain(collection, recipe) → { collection, replaced, isFirst }` (con la regla de "queda el de más estrellas"), `pendulum(t, { amp, periodMs, damping }) → angle` (independiente de los fps) y `packagingLayout(frame)`. Tests: tabla de argollas, que el péndulo se apague, que el reemplazo respete la confirmación y que el primero por gato cuente en el álbum.

**Mínimo divertido**: la transformación completa (pasos 1 a 5 y 7), las argollas por estrellas, el PNG del empaque y el colgador con 12 ganchos donde tocar un llavero lo balancea.
**Nice to have** (en orden de valor):
1. Arrastrar el llavero para balancearlo con física de péndulo, y que choque y tintinee con el vecino en el colgador.
2. **Reverso**: darlo vuelta muestra la porcelana sin pintar con "Hecho a mano por Cata · {fecha}" en Gaegu.
3. Más de un llavero por gato (una tira de 3 por gancho).
4. Elegir el color de la cadenita o del tag.
5. **Gatos llavero dibujados aparte** (la vieja opción C): una silueta alargada sobre cuatro patas, como los llaveros reales de la marca, solo para el llavero y el empaque. Se trata como arte extra del llavero (pide un sweater simplificado por gato o un motivo pintado), no como un cambio de los gatos jugables, así que **no** rompe el ADR 0003. Es caro (L–XL) y queda para después de esta etapa.

---

## 4. Economía

### Ingresos

| Fuente | Cuánto | Cuántas veces | Total posible |
|---|---|---|---|
| Botones iniciales | 100 | 1 | 100 |
| Calificar un look **nuevo** | 1★ 3 · 2★ 5 · 3★ 8 · 4★ 10 · 5★ 14 | ilimitado (con novedad) | — |
| Look casi igual a uno reciente (1 cambio) | 50 % de lo anterior | ilimitado | — |
| Look repetido (0 cambios) | propina de 2 | ilimitado | — |
| Primer 3★ con un gato | +15 | 12 | 180 |
| Primer 4★ con un gato | +25 | 12 | 300 |
| Primer 5★ con un gato | +50 | 12 | 600 |
| Descubrir un gusto | +15 | 60 (5 × 12) | 900 |
| Primer combo | +40 y la prenda secreta | 6 | 240 |
| Sets e hitos del álbum | **0 botones**: premios para el modo foto | — | — |
| **Total de una sola vez** | | | **2320** |

**Novedad** (`novelty`): se compara el look con los **últimos 3 looks calificados de ese gato** y se cuenta en cuántos slots cambia (prenda o tinte). 0 cambios → propina; 1 → 50 %; 2 o más → 100 %.

### Costos

| Qué | Precio | Cantidad | Total |
|---|---|---|---|
| Prendas básicas | 40 | 10 | 400 |
| Prendas lindas | 70 | 12 | 840 |
| Prendas de lujo | 110 | 6 | 660 |
| Frascos de tinte | 50 | 9 | 450 |
| **Total** | | | **2350** |

### Ritmo esperado
Supuesto: una sesión dura unos 15 minutos y se califican unos 6 looks.

| Sesión | Qué pasa | Botones acumulados (aprox.) |
|---|---|---|
| 1 | Primeros looks de 2★–3★, 5 o 6 gustos, el combo galáctico y el primer 3★ con 2 gatos | ~320 → 3 o 4 compras |
| 2 | Looks de 3★, más gustos, primeros 4★ | ~620 |
| 3–4 | Primeros 5★ (+50 cada uno), un combo más | ~1200 → **≈ 50 % del catálogo y de los tintes** |
| 5–8 | Menos descubrimientos y más 5★; se juntan para las prendas de lujo (combo realeza = 330) | ~2100 |
| 9–10 | Últimas compras, gustos difíciles y combos que faltan | **≈ 100 %** |

`balance.test.ts` (S3) fija este ritmo: el jugador modelo debe llegar al 50 % de lo comprable entre las sesiones 3 y 5, y al 100 % entre las sesiones 8 y 11 (F21.1).

### Cómo se evita el grind aburrido
- **El 90 % del dinero que se puede ganar una sola vez sale de descubrir cosas** (gustos, récords y combos): 2320 de los 2350 que se pueden gastar. El flujo real que mide `balance.test.ts` es ≥ 70 %. Repetir un look paga una propina.
- **Probar es gratis**: el jugador siempre puede jugar con todo; los botones son para quedarse con lo que le gustó.
- Cambiar de gato **resetea la motivación**: 12 gatos con gustos distintos son 12 rompecabezas.
- Nada se pierde, no hay castigo, no hay energía, ni tiempos de espera, ni regalos diarios (sin FOMO).
- Si el jugador modelo muestra un muro, se baja un precio en `economy.json`; nunca se agrega "trabajo".

### Qué empieza desbloqueado
- 16 prendas (lista en S3), el frasco rosa y el agua, 100 botones.
- En el modo foto: 2 fondos, 2 poses, el marco polaroid y 4 stickers.
- **Migración de saves v1**: se mantienen las prendas iniciales, las del outfit guardado y las secretas ganadas; se empieza con 100 botones. Como el MVP solo corre en localhost, no hay jugadores reales que perjudicar.

---

## 5. Flujo de escenas

```
Boot → Preloader → Title ──► CatSelect ──► ShopEntrance ──► DressUp ⇄ Showcase ──► PhotoMode
                     │           ▲                            │  ▲         │            │
                     │           └──────── "Otro gato" ───────┘  │         │            │
                     │                                           └─"Seguir vistiendo"───┘
                     └──► Album ◄── (botón cuaderno desde Title, DressUp y Showcase; vuelve a donde estaba)
```

| Escena | Estado | Cambios |
|---|---|---|
| Title | Cambia | Estética nueva; botón secundario "Mi álbum" con el %. |
| CatSelect | Cambia | Los gatos son polaroids con washi; bajo cada uno, su mejor estrella y "♥ 2/5". |
| ShopEntrance | Cambia | Fachada en tinta. El letrero dice "Lagatovino" (supuesto, §9) y suena la campanita. |
| DressUp | Cambia mucho | Monedero (HUD), etiquetas de precio, pestaña de Tintes, reacciones de gustos, ficha del gato en el cartel del nombre, botón del álbum y caja de Catalina al pulsar ¡Listo! (es una capa **dentro** de la escena, no una escena). |
| Showcase | Cambia | Pasa a ser la **pasarela**: ceremonia de Kofi (S1), eventos de progreso y botones [Modo foto] [Seguir vistiendo] [Otro gato]. La descarga se va a PhotoMode. |
| **PhotoMode** | Nueva | S6 y la transformación en llavero de S8. Recibe el look y la calificación por `scene.start(key, data)`. Al final, [Colgarlo] lleva al álbum en la pestaña Colgador con `{ from, tab: 'colgador', hang: catId }`, para que el llavero vuele a su gancho. |
| **Album** | Nueva | S5, con la pestaña Colgador de S8. Recibe `{ from, tab? }` para volver a la escena de origen. |

Transiciones: todas pasan por `systems/transitions.ts` (ADR 0007). Album entra con un iris en forma de ✦ (nuevo, en `irisShapes.ts`) y sale con fundido; PhotoMode entra con un fundido crema tipo flash suave. Con movimiento reducido, todo es un fundido (ADR 0013). Al volver del álbum, DressUp recupera la pestaña y el scroll en los que estaba (`init(data)`).

---

## 6. La estética de Lagatovino aplicada al juego

### 6.1. Principio
Se pasa de "kawaii pastel rosa" a **"cuaderno de Catalina"**: papel, tinta, washi tape y polaroids. **El juice no cambia**: squash, rebotes, partículas y sonidos siguen ahí; solo cambian sus colores y formas. El contraste mejora (negro cálido sobre crema).

### 6.2. Tokens (reemplazan art-direction §4 UI y §6)

| Uso | Antes | Ahora |
|---|---|---|
| Fondo de escena | `rosa-50` | `crema-papel` #FFFCF5 con cuadrícula `linea-cuadricula` #C9DBF1 (24 px) |
| Paneles y tarjetas | `rosa-50` con borde `rosa-200` de 4 px | `tarjeta` #FFFFFF, borde `borde` #E8E0D2 de 3 px, radio 20, sombra plana de 4 px en `muted` #F4EEE3 |
| Texto | `texto` #5A3A48 | `tinta` #1F1B1A; secundario `muted-texto` #6A5F57 |
| Botón principal | `rosa-400`, 3D gordito | píldora **plana** `tinta` #1F1B1A con texto `crema-papel` |
| Botón secundario | — | píldora `tarjeta` con borde de 3 px `tinta` |
| Acento, celebración | `rosa-400`, `mantequilla` | `sol` #F3C04A (✦, estrellas), `frambuesa` #C2306B (corazones), `rosa` #F6BFD0 |
| Pestañas | `rosa-200` | índices de cuaderno, cada uno de un color de la paleta (cielo, rosa, sol, lila, durazno, hoja, y naranjo para Tintes) |
| Fondos exteriores | `cielo` #C4E6FF | `cielo` #CFE0F3 con nubes de tinta |
| Links y subrayados | — | subrayado grueso en `sol` |
| Etiquetas de precio | — | kraft en `durazno` #F1D1C0 con hilo `lapiz` #3A5FC4 |
| Bocetos (álbum) | — | `linea-lapiz` #8FA8E3 |

Tipografías (autoalojadas en `public/fonts/`, con licencia OFL): **Londrina Solid** 400/900 para títulos, cartel del nombre, monedero y estrellas; **Gaegu** 400/700 para lo que "dice" alguien (burbujas del gato, Kofi, Catalina, pistas, el nombre en la foto); la fuente del sistema para el texto corrido (hojas de compra, el álbum). Fredoka sale. Las fuentes deben estar listas antes del primer texto (ya lo cuida el Preloader).

### 6.3. Componentes con juice
- **Botón píldora plano**: sin sombra 3D, así que el "press" cambia. Hover (adorno de PC): escala 1,04 y rotación de 1°. Press (obligatorio): escala 0,95, desplazamiento de 2 px y "tic"; al soltar vuelve con `Back.easeOut`. El principal invierte los colores en el hover.
- **Tarjetas y polaroids**: rotación al azar estable entre ±1° y ±8° (semilla por id), washi amarilla `sol` al 70 % arriba. Al aparecer, caen con una rotación extra de 6° que se corrige (`Back.easeOut`, 280 ms) y la washi se "pega" con un sonido de cinta.
- **Pestañas índice**: la activa sobresale 10 px más con un pop; cambiar de pestaña suena a papel.
- **Burbujas de voz**: tarjeta blanca con borde de tinta irregular, cola dibujada, Gaegu 26–30 px, rotada 2°; entran con escala 0,6 → 1 (`Back.easeOut`).
- **Partículas**: el ✦ reemplaza al brillito redondo; corazones en `frambuesa` y `rosa` con contorno de tinta de 2 px (se ven sobre cualquier sweater, cosa que hoy cuesta).
- **Cartel del nombre**: tarjeta blanca con washi; ahora también es la **ficha del gato** (clic o toque abre los gustos).
- **Personajes de la marca**: **Kofi** (juez, en la pasarela) y **Catalina** (en la caja; puede ser solo una mano y una voz si se prefiere no dibujarla). Ver §9.
- **Voz** (en `domain/copy.ts`; ejemplos): "¡Pasa nomás!", "Si te tinca, te lo llevas", "Kofi aprueba ✦✦✦✦", "Uy, eso parece un look especial…", "¡Quedó precioso, {nombre}!", "Xoxo, mau!" como firma de la foto. La @ va en frases genéricas ("tu gat@"), nunca pegada al nombre del jugador (la revisión de F5 mostró que ahí se lee como un error).

### 6.4. Gatos: opción B para jugar, llavero para guardar

**Opción B (esta etapa, S7b)**: se mantienen las proporciones chibi, la silueta, el lienzo de 512 y **todas las anclas** (ADR 0003). Las prendas siguen calzando.
- **Contorno**: de `#4A3036` uniforme de 8 px a **tinta** `#1F1B1A`, con grosor variable: un trazo base de 7 px y, debajo, una copia del contorno desplazada (1,5, 2) px, que hace la línea más gruesa en el lado de la sombra, como pincel. Esto lo hace `build-art.mjs` una vez para todos los gatos. Opcional: un `feDisplacementMap` de 1 px para que el borde "tiemble" como tinta, si no rompe el encaje de las máscaras de las prendas (hay que probarlo en `preview.html`).
- **Cara**: **ojos almendra** de tinta con un brillito pequeño (mismas posiciones: (192, 224) y (320, 224), para que los lentes calcen); nariz triangular chiquita en `durazno` oscuro y boca de una línea en "y" **en vez de `:3`**; **sin mejillas rosa**; bigotes de tinta finos y algo curvos.
- **Expresiones**: `normal` (almendra), `feliz` (arcos cerrados), `sorpresa` (almendra más redonda y abierta), `parpadeo` (línea), `amor` (corazoncitos `frambuesa` con contorno: se mantienen porque son el feedback principal) y la **nueva `puaj`** (S2).
- **Interior de las orejas**: de rosa a `durazno` #F1D1C0. Los pelajes se quedan con sus colores (son reconocibles); si al lado de la UI nueva se ven saturados, se bajan un 10 % de saturación en `coats/`.
- **Prendas**: en esta etapa solo cambia el color del contorno a `#1F1B1A` (reemplazo masivo en `art/clothes/`, más los iconos), y en los sweaters se agregan las marcas `data-dye` (S4). El trazo variable de las prendas es nice to have.
- Checklist de art-direction §10 v2: contorno de tinta, colores planos con una sombra, ojos almendra y sin mejillas; encaja en las anclas; "¿se ve como algo que vendería Lagatovino?".

**El llavero (S8), en lugar de rehacer los gatos jugables**: por decisión del usuario, los gatos con los que se juega **no** se convierten en llaveros. El llavero de porcelana es la forma que toma tu gato **al guardarlo**, y se arma sobre el render del look de la opción B (borde de porcelana, barniz, colores pintados a mano y herrajes; ver S8). Así:
- el ADR 0003 (plantilla y anclas) **sigue vigente** y las 50 prendas no se tocan;
- la estética de los llaveros de la marca (porcelana, barniz, argolla, empaque kraft) llega al juego en el momento de más emoción, que es el cierre del loop;
- **los gatos llavero dibujados aparte** (silueta alargada sobre cuatro patas, cabeza chica, ojos de línea y sweater pintado a pincel) quedan como *nice to have* posterior de S8. Si se hacen, son arte **solo del llavero y el empaque**: no cambian la plantilla jugable ni el ADR 0003.
- **Regla para esta etapa**: nada nuevo puede depender de la geometría del gato más allá de `anchors.json`. Las poses de S6 y el llavero de S8 son transformaciones del render, no arte nuevo del cuerpo.

---

## 7. Dependencias y paralelismo

```
            ┌─► S7a Kit de UI y fuentes ───────────────────────────┐
            │                                                      ▼
 ADRs (§8) ─┼─► S7b Arte B (solo art/) ── marcas data-dye ──┐   S7c Repintar escenas
            │                                               │      (al final de cada pista
            └─► S0 Contrato de datos + save v2 ──┬─► S1 domain score ──► S1 ceremonia (Showcase)
                                                 ├─► S2 domain tastes ─► S2 reacciones (DressUp)
                                                 ├─► S3 domain economy ► S3 etiquetas, caja, monedero (DressUp)
                                                 ├─► S4 domain dye ────┴► S4 pestaña Tintes (DressUp + ADR teñido)
                                                 ├─► S5 domain album ───► S5 escena Album ──────────────┐
                                                 ├─► S6 domain photo ───► S6 escena PhotoMode (necesita S1) ┤
                                                 └─► S8 domain keychain ─────────────────────────────► S8 transformación
                                                                                                    (PhotoMode) y colgador (Album)
 S7b arte: herrajes, barniz, empaque y colgador del llavero (solo art/) ──────────────────────────────┘
```

**Bloqueante, va primero**:
1. **ADRs de alcance, progreso y teñido** (architect).
2. **S0**: tipos, schema, `economy.json` y save v2. Es chico (M), pero todo lo demás lo importa. Cuando estén los tipos, el resto se abre en abanico.

**Independiente desde el día 1** (no necesita S0):
- **S7b Arte B**: toca solo `art/` y `public/assets/`. Incluye la cara `puaj` y las marcas `data-dye` de los sweaters.
- **Arte del llavero** (S8): las ~8 piezas pequeñas de `art/ui/keychain/` y sus sonidos CC0. No depende de nada y puede ir con S7b.
- **Espigón técnico del tratamiento de porcelana** (S8): probar en una escena de pruebas que el borde con copias, el filtro y el barniz recortado a la silueta se vean bien y rindan en el celular. Solo necesita el RenderTexture de `objects/photo.ts`, que ya existe. Conviene hacerlo pronto porque es el único riesgo técnico de S8.
- **S7a Kit de UI**: toca `objects/ui.ts`, `Button`, `Tabs`, `constants.ts` (tokens) y las fuentes. Conviene **antes** de que S3, S5 y S6 construyan UI nueva, así no se repinta dos veces.

**En paralelo después de S0** (módulos de `domain/` sin conflictos entre sí): `score.ts`, `tastes.ts`, `economy.ts`, `dye.ts`, `album.ts`, `keychain.ts` y la ampliación de `photo.ts`. Cada uno con TDD y su test.

**Integración en escenas** (aquí hay conflictos; usar `isolation: worktree`):
- **DressUp** es el punto caliente: S2, S3 y S4. Se recomienda el patrón de controladores (§3, S0) y un orden de integración: S3 (monedero y etiquetas) → S2 (reacciones) → S4 (pestaña Tintes).
- **Showcase**: S1, y después S6 (el botón al modo foto).
- **Escenas nuevas** (Album y PhotoMode): no chocan con nada; solo necesitan S7a y sus módulos de dominio.
- **S8** se integra **después** de S6 (la transformación es el final de [Guardar]) y de S5 (el colgador es una pestaña del álbum). El objeto `Keychain` (render, herrajes y péndulo) se puede construir antes, en paralelo, sobre el espigón.
- **S7c** repinta cada escena **al final** de la pista que la toca, para no generar conflictos con el trabajo de features.

**Ruta crítica del loop jugable**: ADRs → S0 → (S1 + S2 + S3) → ceremonia en Showcase. Con eso ya existe el "para qué". S4, S5 y S6 lo profundizan, y S8 lo cierra (S6 → S8, con S5 para el colgador).

**Pruebas e2e** (ADR 0012): el hook `window.__VISTE__` (solo modo test) suma `wallet`, `owned`, `tastesFound`, `lastRating`, y las acciones `grant(ids)`, `setWallet(n)` y `dye(itemId, dyeId)`, para preparar el estado sin arrastrar (como `wear`). Specs nuevos: `rating`, `shop` (probar, comprar, caja, no alcanza), `tastes`, `dye`, `album`, `photomode`, `keychain` (guardar → transformación → PNG del empaque → colgado en su gancho → sobrevive a una recarga; el hook suma `keychains` y `keychainPhase`) y la migración v1 → v2. El subconjunto móvil (ADR 0014) suma comprar tocando la etiqueta, arrastrar un frasco y un sticker, y guardar un llavero.

---

## 8. Decisiones que requieren ADR (para el architect)

| ADR | Decisión | Notas |
|---|---|---|
| **0015** Alcance de la segunda etapa | Monedas, compra, calificación, gustos, tintes, álbum, modo foto y el llavero (con su colgador) entran al alcance; los pedidos de clientes quedan **descartados** expresamente. | Implica actualizar "Fuera del MVP" en `CLAUDE.md` y en `docs/game-design.md` (con la aprobación del usuario). |
| **0016** Dirección de arte Lagatovino | Reemplaza art-direction §2 (cara), §3 (trazo), §4 (paleta de UI), §6 (UI y tipografías) y §8 (press de botón plano). Fredoka → Londrina Solid y Gaegu autoalojadas. Los gatos jugables pasan a la opción B y **no** se convierten en llaveros; el llavero es un tratamiento del render (ADR 0021). Se suma la sección de arte del llavero (herrajes, barniz, empaque). | `docs/art-direction.md` pasa a v2. |
| **0017** Progreso y guardado v2 | `SAVE_VERSION` 2 con migración desde v1; campos `wallet`, `owned`, `dyesOwned`, `itemDye`, `tastesFound`, `bestStars`, `ratedLooks` (últimas 3 firmas por gato), `keychains` (una **receta** por gato, no una imagen) y `secrets`. Las compras y los descubrimientos **se escriben al instante** (como `unlockSecret`). Los desbloqueos del modo foto y los sets **se derivan**, no se guardan. La forma tiene que ser compatible con las tablas futuras de Supabase (`inventory`, `outfits`) del ADR 0004. | Aprovechar para pasar el ADR 0004 a "Aceptado" si el usuario lo confirma. |
| **0018** Teñido por recoloreado de SVG | Marcas `data-dye="a|b"` en el SVG; `recolorSvg` puro; rasterizado perezoso en tiempo de ejecución con una clave `texture~dye`; caché con tope (por ejemplo, 24 texturas con LRU); no se usa el tinte de Phaser. Cómo cargar el SVG modificado (blob URL o `addBase64`) sin bloquear el arrastre. | Amplía el ADR 0006. |
| **0019** Flujo de escenas v2 | Album y PhotoMode nuevas; Showcase como pasarela; la caja es una capa de DressUp; parámetro `from` para volver; iris ✦. | Amplía el ADR 0007. |
| **0020** Reglas de juego data-driven | `economy.json`, `dyes.json`, `sets.json`, `photo.json` y `prefs` en `cats.json`, validados en `schema.ts`; el test de balance (jugador modelo) como guardián del ritmo. | Puede ir dentro del 0017 si el architect lo prefiere. |
| **0021** El llavero como tratamiento del render | El llavero se arma sobre el RenderTexture del look (copias planas para el borde de porcelana, un filtro ColorMatrix de Phaser 4, el barniz recortado a la silueta y los herrajes en SVG); se guarda como receta y se vuelve a renderizar en el colgador; el péndulo es una función pura independiente de los fps; presupuesto de rendimiento en el celular (máximo de llaveros vivos animados a la vez en el colgador, por ejemplo 12 con el balanceo solo en el que se toca). | Amplía el ADR 0006 y el F7 de la foto. Conviene escribirlo después del espigón técnico de S8. |
| (Futuro, opcional) Gatos llavero dibujados aparte | Solo si se aprueba ese *nice to have* de S8: arte propio del llavero y del empaque. **No** reemplaza al ADR 0003, porque no toca a los gatos jugables. | No se escribe en esta etapa. |

---

## 9. Preguntas abiertas para el usuario

**Bloqueante**
1. **¿Pueden Kofi y Catalina aparecer en el juego?** Kofi como juez que califica en la pasarela y Catalina como la vendedora de la caja (su voz y, si quieres, su mano o su figura). Son una persona y un gato reales, así que hace falta tu permiso. Si dices que sí, nos sirve una foto o una descripción de Kofi (color, pelaje, algún rasgo). **Bloquea**: el arte de Kofi (S1) y los textos de voz (S7a). *Si no*: un "gato supervisor" genérico de la tienda y una vendedora sin nombre.

**Supuestos por defecto (no bloquean; se cambian con una línea en el JSON o en `copy.ts`)**
- La moneda se llama **botones**.
- El letrero de la boutique en ShopEntrance dice **"Lagatovino"**.
- La foto lleva el logo "Viste Lagato" y la firma "Xoxo, mau!", sin URL.
- El empaque del llavero dice **"Lagatovino · hecho a mano"** y el reverso "Hecho a mano por Cata" (si la respuesta a la pregunta 1 es no, queda solo "hecho a mano").
- Se guarda **un llavero por gato** en el colgador; por defecto se queda el de más estrellas.
- Los precios, los pagos y los gustos de la §3 y la §4 son iniciales: se ajustan con el test de balance y con lo que diga el usuario al jugar.
- El save v1 se migra conservando lo que se tenía puesto y los secretos.
- La calificación nunca baja de 1★ y las prendas que el gato detesta **se pueden dejar puestas**.
- Los gatos jugables no se rehacen como llaveros (decisión del usuario). Los gatos llavero dibujados aparte quedan fuera de esta etapa.
