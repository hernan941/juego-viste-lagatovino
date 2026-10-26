# Dirección de arte: Viste Lagato (v2, estética Lagatovino)

> **Versión 2** (2026-10-25, ADR 0016). Reemplaza a la v1 "kawaii pastel rosa". Los cambios de fondo respecto de la v1: contorno de tinta negra cálida, cara con ojos almendra y sin `:3` ni mejillas, paleta de papel y tinta, botones píldora planos y las tipografías Londrina Solid y Gaegu autoalojadas.

Todo el juego (gatos, ropa, UI, fondos, iconos y el llavero) sigue **esta** guía. Si algo no encaja aquí, se corrige el asset, no la guía. Para cambiar la guía hay que hacerlo explícitamente, con un ADR, y avisar al usuario.

Referencias:
- **Estilo de marca**: Lagatovino (lagatovino.com): llaveros de porcelana pintados a mano, cuaderno, tinta, washi tape y polaroids.
- **Proporciones de los gatos**: `gatos.jpeg` (solo las proporciones chibi y cabezonas; los gatos temáticos **no** se usan, y la cara `:3` y las mejillas de esa referencia ya no aplican).
- **Layout del probador**: `ejemplo de juego.jpeg` (pestañas arriba, grid, gato grande, drag & drop y panel de capas). Su paleta rosa ya no aplica.

## 1. Personalidad
**"El cuaderno de Catalina"**: papel crema, tinta, washi tape, polaroids y ✦. Tierno, hecho a mano y con humor suave. El juice no cambia respecto de la v1 (squash, rebotes, partículas y sonidos): solo cambian sus colores y formas. Se tiene que ver como algo que vendería Lagatovino.

## 2. Los gatos
**Solo gatos comunes**, con los pelajes típicos que la gente reconoce:

| id | Nombre | Pelaje |
|---|---|---|
| `naranja` | Naranjito | Atigrado naranja |
| `gris` | Grisú | Atigrado gris |
| `negro` | Luna | Negro entero |
| `blanco` | Nieve | Blanco entero |
| `esmoquin` | Michi | Blanco y negro (esmoquin) |
| `calico` | Tricolor | Calicó (blanco, naranja y negro) |
| `carey` | Carey | Carey (negro y naranja jaspeado) |
| `siames` | Siamés | Crema con puntas café |
| `marron` | Canela | Atigrado marrón |
| `crema` | Vainilla | Crema claro |
| `azul` | Humo | Gris azulado liso |
| `naranja-blanco` | Mandarina | Naranja con pecho y patitas blancas |

### Proporciones (sin cambios respecto de la v1; lienzo común de 512 × 512, ADR 0003)
- **Chibi**: la cabeza ocupa aproximadamente el **55–60 %** de la altura del gato. El cuerpo es pequeño y redondo.
- **Pose base única**: sentado, de frente, patitas delanteras juntas y cola saliendo hacia la derecha. Todos los gatos usan **exactamente** la misma silueta. Solo cambian los colores y patrones.
- **Orejas** triangulares con la punta redondeada y el interior `durazno`.
- **Anclas compartidas** para la ropa: `head`, `eyes`, `neck`, `torso` y `paws`, definidas una sola vez en `src/game/data/anchors.json` (fuente: `art/anchors.json`). **No se mueven.**
- **Regla**: nada nuevo puede depender de la geometría del gato más allá de `anchors.json`. Las poses del modo foto y el llavero son transformaciones del render.

### Cara (idéntica en todos los gatos, "opción B")
- **Ojos almendra** de `tinta` con **un brillito** blanco arriba, centrados en (192, 224) y (320, 224), las mismas posiciones de la v1, para que los lentes calcen.
- **Nariz**: triangular y chiquita, en `nariz` (durazno oscuro).
- **Boca**: una línea en "y" de tinta. **No** se usa `:3`.
- **Sin mejillas.**
- **Bigotes**: de tinta, finos y algo curvos, dos o tres por lado.
- **Pelajes oscuros**: la legibilidad se resuelve en el pelaje (`coats/<id>.svg`) con un halo `#56505F` detrás de cada ojo, como en la v1.
- **Expresiones** (capas intercambiables):
  - `normal`: almendra;
  - `feliz`: arcos cerrados;
  - `sorpresa`: almendra más redonda y abierta;
  - `parpadeo`: una línea;
  - `amor`: corazoncitos `frambuesa` con contorno de tinta (se mantienen: son el feedback principal);
  - **`puaj`** (nueva): ojos de rayita y boquita ondulada, para "no me gusta".

## 3. Trazo y relleno
- **Contorno de tinta**: color `tinta` `#1F1B1A` (negro cálido, **nunca `#000`**), con extremos y uniones redondeados.
  - **Gatos**: trazo base de **7 px** más una copia del contorno desplazada (1,5, 2) px debajo, que engrosa el lado de la sombra como un pincel. Lo genera `art/tools/build-art.mjs`. El temblor con `feDisplacementMap` de 1 px es opcional y solo si no rompe el encaje de las prendas en `art/preview.html`.
  - **Prendas e iconos**: el mismo grosor que en la v1 (8 px), en `tinta`. El trazo variable es nice to have.
- **Relleno**: colores planos.
- **Sombra**: una sola capa en la parte inferior y bajo la cabeza. En los gatos y en las prendas no teñibles, el mismo color un 15 % más oscuro. En las **prendas teñibles**, negro al 15 % de opacidad por encima del relleno (ADR 0018).
- **Brillo**: una pequeña forma blanca semitransparente arriba.
- Sin degradados, texturas ni sombras realistas (la única excepción es el barniz del llavero, §11).

## 4. Paleta

### Papel, tinta y UI
| Token | Hex | Uso |
|---|---|---|
| `crema-papel` | `#FFFCF5` | Fondo de escena (con cuadrícula) y texto sobre botones de tinta |
| `linea-cuadricula` | `#C9DBF1` | Cuadrícula del papel, cada 24 px |
| `tarjeta` | `#FFFFFF` | Paneles, tarjetas, polaroids y burbujas |
| `borde` | `#E8E0D2` | Borde de tarjetas y celdas (3 px) |
| `sombra-tarjeta` | `#F4EEE3` | Sombra plana de 4 px bajo tarjetas y botones |
| `tinta` | `#1F1B1A` | Contornos, texto principal, botón principal |
| `muted-texto` | `#6A5F57` | Texto secundario y líneas negativas de la calificación (nunca rojo alarma) |
| `linea-lapiz` | `#8FA8E3` | Bocetos en lápiz azul del álbum (prendas que faltan, ganchos vacíos) |
| `kraft` | `#F1D1C0` | Etiquetas de precio y empaque del llavero (es el mismo `durazno`) |

### Colores de la marca (acentos y frascos de tinte)
Son los 10 frascos de `dyes.json` y los acentos de la UI. Los valores salen del CSS de lagatovino.com (igual que `linea-cuadricula` y `linea-lapiz`).

| Token | Hex | Uso en la UI |
|---|---|---|
| `cielo` | `#CFE0F3` | Fondos exteriores con nubes de tinta, pestaña |
| `rosa` | `#F6BFD0` | Corazones secundarios, pestaña |
| `sol` | `#F3C04A` | ✦, estrellas, washi tape (al 70 %), subrayados de links |
| `lila` | `#D9CDF3` | Pestaña |
| `durazno` | `#F1D1C0` | Interior de las orejas, kraft, pestaña |
| `naranjo` | `#E98A2B` | Pestaña de Tintes |
| `lapiz` | `#3A5FC4` | Hilo de las etiquetas de precio |
| `frambuesa` | `#C2306B` | Corazones (con contorno de tinta de 2 px) |
| `tomate` | `#C8372F` | Solo detalles |
| `hoja` | `#3F7D3B` | Pestaña |

### Cara
| Token | Hex | Uso |
|---|---|---|
| `tinta` | `#1F1B1A` | Ojos, boca y bigotes |
| `brillo-ojo` | `#FFFFFF` | Brillo de los ojos y destellos |
| `nariz` | `#D9A48C` | Nariz (durazno oscuro) |

### Pelajes (sin cambios respecto de la v1)
naranja `#FFAE5C`, gris `#A9A9B8`, negro `#3E3A47`, blanco `#FFFDF8`, crema `#FBE3C0`, café `#8A5A3C` y azul `#8FA3BF`; raya naranja `#E8853A` y hocico oscuro `#56505F`. Si junto a la UI nueva se ven saturados, se bajan un 10 % de saturación en `coats/`.

### Ropa
Los tonos de referencia de la v1 siguen valiendo (`coral` `#F0707A`, `rojo-acento` `#E2465A`, `verde` `#6CC59A`, `verde-oscuro` `#4FA77E`, `cafe-claro` `#B98060`, `cafe` `#8A5A3C`, `beige` `#E8C3A4`, `rosa-lana` `#F2A9C4`, `dorado` `#F5D86A`), más los colores de la marca. Ningún neón ni gris apagado. Los sweaters teñibles marcan sus rellenos con `data-dye="a"` (principal) y `data-dye="b"` (secundario), ADR 0018.

## 5. Ropa
Toda prenda respeta el contorno, la sombra única y el brillo de §3. Debe verse **gordita y suave** (lana, peluche). Se dibuja sobre la plantilla del gato para que encaje en las anclas.

| Slot | Categoría | Prendas |
|---|---|---|
| `sweater` | **Sweaters** (16, teñibles) | rayas, navideño con reno, cuello alto, trenzado, hoodie con orejitas, corazones, arcoíris, pescaditos, lunares, universitario, oversize, chaleco, huellitas, fresa, nubes, cohete |
| `head` | Gorros (8) | beanie con pompón, boina, gorrito de fresa, sombrero de copa, corona mini, gorro de rana, vincha con moño, gorro de chef |
| `neck` | Bufandas y collares (6) | bufanda de rayas, bufanda larga, collar con cascabel, pañuelo, moño, collar de perlas |
| `face` | Lentes (5) | redondos, de corazón, de sol, de estrella, monóculo |
| `paws` | Guantes y calcetines (4) | mitones, calcetines de rayas, guantes de lana, botitas |
| `accessory` | Accesorios (5) | mochilita, flor en la oreja, globo, taza de leche, ovillo de lana |

Son 44 prendas visibles más 6 secretas. Cada prenda tiene un **icono** para el grid: la misma prenda centrada sobre una celda `crema-papel` con borde `borde` de 3 px. En el álbum, las prendas que faltan se muestran como **boceto en lápiz azul** (icono con `setTintFill` en `linea-lapiz`, alpha 0,5).

## 6. UI
- **Fondo**: papel `crema-papel` con cuadrícula `linea-cuadricula` cada 24 px.
- **Tarjetas y paneles**: `tarjeta` con borde `borde` de 3 px, radio 20 y sombra plana de 4 px en `sombra-tarjeta`.
- **Botón principal**: píldora **plana** de `tinta` con texto `crema-papel`. En hover invierte los colores. Sin sombra 3D.
- **Botón secundario**: píldora `tarjeta` con borde de 3 px de `tinta`.
- **Pestañas**: índices de cuaderno, cada una de un color de la marca (cielo, rosa, sol, lila, durazno, hoja, y naranjo para Tintes). La activa sobresale 10 px más.
- **Polaroids y tarjetas sueltas**: rotación estable entre ±1° y ±8° (semilla por id) y washi `sol` al 70 % arriba.
- **Burbujas de voz**: tarjeta blanca con borde de tinta irregular, cola dibujada, Gaegu de 26 a 30 px y rotada 2°.
- **Etiquetas de precio**: cartón `kraft` con hilo `lapiz`; el precio **siempre** se ve (no solo en hover).
- **Partículas**: el ✦ reemplaza al brillito redondo; corazones `frambuesa` y `rosa` con contorno de tinta de 2 px.
- **Tipografías** (autoalojadas en `public/fonts/`, licencia SIL OFL 1.1, sin Google Fonts):
  - **Londrina Solid** 400 y 900: títulos, cartel del nombre, monedero y estrellas;
  - **Gaegu** 400 y 700: lo que "dice" alguien (burbujas del gato, el juez, la vendedora, pistas y el nombre en la foto);
  - fuente del sistema: texto corrido (hojas de compra, textos del álbum).
  - El texto va en `tinta` o `muted-texto`, nunca en `#000`.
- **Voz** (`domain/copy.ts`): "¡Pasa nomás!", "Si te tinca, te lo llevas", "Xoxo, mau!" como firma de la foto. La @ va en frases genéricas ("tu gat@"), nunca pegada al nombre del jugador. Los nombres del juez y de la vendedora salen de `data/brand.json`.
- **Objetivos de toque**: ≥ 80 unidades del juego (ADR 0014), aunque el dibujo sea más chico.

## 7. Escenarios
- **Portada**: papel con cuadrícula, el logo "Viste Lagato" en Londrina Solid, gatitos que se asoman y el botón "Mi álbum" con el porcentaje.
- **Elegir gato**: cada gato en una polaroid con washi, con su mejor estrella y "♥ 2/5" debajo.
- **Calle y fachada**: la boutique dibujada en tinta sobre `cielo` con nubes de tinta; el letrero sale de `brand.json` ("Lagatovino" por defecto) y suena la campanita.
- **Probador**: pared de papel, espejo con marco de tinta, percheros al fondo y alfombra bajo el gato; el monedero (un frasquito con botones) arriba a la derecha.
- **Pasarela (Showcase)**: el gato posa en la alfombra; el juez entra con su libreta y la calificación se escribe en una tarjeta de papel rayado.
- **Álbum**: un cuaderno con 5 pestañas índice; el colgador es un corcho o papel con 12 ganchos.
- **Modo foto**: scrapbook con fondos, marcos y stickers de `photo.json`.

## 8. Movimiento
| Momento | Animación | Duración y easing |
|---|---|---|
| Aparecer o seleccionar | Escala de 0,8 a 1,05 a 1 | 250 ms, `Back.easeOut` |
| Soltar una prenda | Squash y stretch del gato, más corazones y ✦ | 300 ms |
| Prenda inválida o fuera del gato | Vuelve a su celda con rebote | 250 ms, `Back.easeOut` |
| Idle del gato | Respira (escala Y ±2 %), parpadea cada 3–5 s y mueve la cola | en bucle |
| Botón hover (adorno de PC) | Escala 1,04 y rotación 1° | 100 ms |
| Botón press (obligatorio) | Escala 0,95 y 2 px hacia abajo, con "tic"; vuelve con `Back.easeOut` | 100 ms |
| Tarjeta o polaroid que aparece | Cae con 6° extra de rotación que se corrige y la washi se "pega" | 280 ms, `Back.easeOut` |
| Estrella de la calificación | Sello: escala 1,6 → 1, 140 ms entre una y otra | 180 ms, `Back.easeOut` |
| Cambio de escena | Fundido, iris de huellita, corazón o ✦, o flash crema | 400–600 ms |

**Regla**: nada aparece ni desaparece de golpe. Todo entra y sale con un tween. Con movimiento reducido se aplica el ADR 0013.

## 9. Sonido (ADR 0009)
**Sin música.** Solo efectos de sonido **ASMR**: suaves, cercanos, táctiles y satisfactorios. Se mantiene la tabla de la v1 y se suman:

| Acción | Sonido |
|---|---|
| Estrella de la calificación | "Tump" suave de sello |
| Botones que vuelan al monedero | "Clic" de botón contra botón |
| Comprar (cortar la etiqueta) | "Snip" de tijera y caja registradora muy suave |
| Teñir | "Pop" del frasco y "blup" líquido |
| Pasar página del álbum | Papel |
| Pegar un sticker o una washi | *Peel* y cinta |
| Llavero | "Fuuu" de horno, "ching" de barniz, tintineo de cadenita y "tink" de porcelana |
| Gato que detesta una prenda | Maullido grave (`rate` 0,8) |

- Volumen bajo, sin sonidos estridentes, variación de tono al azar de ±5 % y todo se puede silenciar.

## 10. Checklist para cualquier asset (v2)
- [ ] ¿Contorno en `tinta` `#1F1B1A` (nunca `#000`) con uniones redondeadas? En gatos, ¿trazo de 7 px con la copia desplazada?
- [ ] ¿Colores de la paleta v2, rellenos planos, una sombra y un brillo?
- [ ] En gatos: ¿ojos almendra, boca en "y", sin `:3` y sin mejillas?
- [ ] ¿Formas redondeadas, sin puntas agresivas?
- [ ] ¿Encaja en la plantilla y en las anclas del gato (`anchors.json`), sin depender de otra geometría?
- [ ] Si es teñible: ¿marcas `data-dye="a"` (y `b` si corresponde) y la sombra en negro al 15 %?
- [ ] Si es UI: ¿objetivo de toque ≥ 80 unidades, press visible y nada que se entienda solo con hover?
- [ ] Textos en Londrina Solid, Gaegu o la fuente del sistema, en `tinta` o `muted-texto`.
- [ ] ¿Se ve tierno junto a los demás assets?
- [ ] **¿Se ve como algo que vendería Lagatovino?**

## 11. El llavero (ADR 0021)
Los gatos jugables **no** se dibujan como llaveros: el llavero es un tratamiento del render del look al guardar en el modo foto.
- **Porcelana**: borde crema de 12 a 16 px alrededor de la silueta, con una línea fina de `tinta` por fuera; colores un poco más suaves y cálidos (−15 a −20 % de saturación; −10 % casi no se nota), como pintados a mano.
- **Barniz**: 2 o 3 brillos blancos suaves fijos y una franja diagonal que cruza la pieza al terminar de "hornearla" (una textura aparte, recortada a la silueta y movida con un tween).
- **Herrajes** (`art/ui/keychain/`): armellita, argolla plateada (1–3★), argolla dorada (4★), dije ✦ dorado (5★) y cadenita. Mismo trazo de tinta, colores planos y un brillo.
- **Empaque**: tarjeta `kraft` con el agujero para colgar arriba, la línea de `brand.json` ("Lagatovino · hecho a mano" por defecto), el fondo, el marco y los stickers elegidos, el nombre del gato en Gaegu, sus estrellas y "Xoxo, mau!".
- **Colgador**: corcho o papel con 12 ganchos; el gancho vacío muestra la silueta del gato en `linea-lapiz`.
- Son unas 8 piezas chicas en SVG y pasan la checklist de §10.
