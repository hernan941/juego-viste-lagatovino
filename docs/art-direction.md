# Dirección de arte: Viste Lagato

Todo el juego (gatos, ropa, UI, fondos, iconos) sigue **esta** guía. Si algo no encaja aquí, se corrige el asset, no la guía. Para cambiar la guía hay que hacerlo explícitamente y avisar al usuario.

Referencia de estilo: `gatos.jpeg` (solo el **estilo** de dibujo; los gatos temáticos, como unicornios, dragones o faraones, **no** se usan). Referencia de layout: `ejemplo de juego.jpeg`.

## 1. Personalidad
**Kawaii, suave y alegre.** Tierno sin ser infantil. Todo redondeado, nada puntiagudo ni agresivo. El jugador debería sonreír al ver cualquier pantalla.

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

Los nombres son provisionales.

### Proporciones (lienzo común de 512 × 512, ver ADR 0003)
- **Chibi**: la cabeza ocupa aproximadamente el **55–60 %** de la altura del gato. El cuerpo es pequeño y redondo.
- **Pose base única**: sentado, de frente, patitas delanteras juntas y cola saliendo hacia la derecha. Todos los gatos usan **exactamente** la misma silueta. Solo cambian los colores y patrones (rayas, manchas, puntas).
- **Orejas** triangulares con la punta redondeada y el interior rosa.
- **Anclas compartidas** para la ropa: `head`, `eyes`, `neck`, `torso` y `paws`. Sus coordenadas se definen una sola vez, compartidas por todos los gatos, en `src/game/data/anchors.json` (fuente: `art/anchors.json`). Las prendas de `face` (lentes) usan el ancla `eyes`.

### Cara (idéntica en todos los gatos)
- Ojos: óvalos verticales oscuros (`ojos` `#33242A`), cada uno con **un brillo blanco** arriba a la izquierda.
- **Pelajes oscuros**: la capa de cara sigue siendo idéntica; la legibilidad se resuelve en el **pelaje** (`coats/<id>.svg`) con un halo `#56505F` detrás de cada ojo y almohadillas de bigote del mismo tono.
- Boca: `:3` (forma de "w"), en el mismo color del contorno.
- Mejillas: dos óvalos rosa `#FF9EB5` con opacidad del 60 %.
- Bigotes: 2 líneas cortas a cada lado, finas.
- Expresiones: `normal`, `feliz` (ojos `^ ^`), `sorpresa` (ojos redondos grandes), `parpadeo` y `amor` (ojos de corazón). Son capas intercambiables.

## 3. Trazo y relleno
- **Contorno**: grueso y uniforme. **8 px** en el lienzo de 512, color `#4A3036` (marrón oscuro cálido, **nunca negro puro**), con extremos y uniones redondeados.
- **Relleno**: colores planos.
- **Sombra**: una sola capa, el mismo color un 15 % más oscuro, en la parte inferior y bajo la cabeza.
- **Brillo**: una pequeña forma blanca semitransparente en la parte superior de la cabeza y de las prendas.
- Sin degradados complejos, texturas ni sombras realistas.

## 4. Paleta

### UI y fondos
| Token | Hex | Uso |
|---|---|---|
| `rosa-50` | `#FFF0F6` | Fondo de los paneles |
| `rosa-200` | `#FFD1E3` | Pestañas y bordes |
| `rosa-400` | `#FF8FB8` | Acento y botones principales |
| `rosa-600` | `#E2578B` | Hover, press y títulos |
| `crema` | `#FFF7EC` | Fondo de las celdas de prendas |
| `menta` | `#BDEFD8` | Éxito y detalles |
| `lavanda` | `#D8CCFF` | Detalles secundarios |
| `cielo` | `#C4E6FF` | Fondos exteriores (calle) |
| `mantequilla` | `#FFF0A8` | Brillos y estrellas |
| `texto` | `#5A3A48` | Todo el texto |
| `contorno` | `#4A3036` | Contornos |

### Pelajes
Tonos cálidos y algo saturados:
- naranja `#FFAE5C`
- gris `#A9A9B8`
- negro `#3E3A47` (es un negro suave)
- blanco `#FFFDF8`
- crema `#FBE3C0`
- café `#8A5A3C`
- azul `#8FA3BF`

Tonos de detalle de los pelajes (aprobados en F1):
- raya naranja `#E8853A` (rayas del atigrado naranja; para otros atigrados, el color base un ~20 % más oscuro y algo más saturado)
- hocico oscuro `#56505F` (almohadillas de bigote y halo de los ojos en pelajes oscuros: `negro`, y si hace falta `carey` y `azul`)

### Cara
| Token | Hex | Uso |
|---|---|---|
| `ojos` | `#33242A` | Ojos (un poco más oscuros que el contorno, para que destaquen) |
| `brillo-ojo` | `#FFFFFF` | Brillo de los ojos y destellos |

### Ropa
Libre, siempre que los colores estén en la familia pastel o en una versión saturada de ella. Ningún color neón ni gris apagado.

Tonos de referencia aprobados en F1 (para reutilizar y que el guardarropa se vea de una misma familia):
| Token | Hex | Uso |
|---|---|---|
| `coral` | `#F0707A` | Rojo navideño suave, fresas, corazones |
| `rojo-acento` | `#E2465A` | Solo detalles pequeños (nariz del reno, cerezas); nunca áreas grandes |
| `verde` | `#6CC59A` | Verde de base (pinos, puños, rana) |
| `verde-oscuro` | `#4FA77E` | Detalles y costuras sobre `verde` |
| `cafe-claro` | `#B98060` | Reno, osito, galletas |
| `cafe` | `#8A5A3C` | Astas, detalles (el mismo tono que el pelaje café) |
| `beige` | `#E8C3A4` | Hocicos y rellenos suaves |
| `rosa-lana` | `#F2A9C4` | Rosa de lana (rayas, elásticos) |
| `dorado` | `#F5D86A` | Estrellas, coronas, botones |

## 5. Ropa
Toda prenda respeta el contorno, la sombra única y el brillo descritos arriba. Debe verse **gordita y suave** (lana, peluche). Se dibuja sobre la plantilla del gato para que encaje en las anclas.

Categorías del MVP (muchas opciones; los sweaters son el protagonista):

| Slot | Categoría | Ejemplos (objetivo) |
|---|---|---|
| `sweater` | **Sweaters** (≈16) | rayas, navideño con reno, cuello alto, trenzado, hoodie con orejitas, corazones, arcoíris, pescaditos, lunares, universitario, oversize, chaleco, huellitas, fresa, nubes, cohete |
| `head` | Gorros (≈8) | beanie con pompón, boina, gorrito de fresa, sombrero de copa, corona mini, gorro de rana, vincha con moño, gorro de chef |
| `neck` | Bufandas y collares (≈6) | bufanda de rayas, bufanda larga, collar con cascabel, pañuelo, moño, collar de perlas |
| `face` | Lentes (≈5) | redondos, de corazón, de sol, de estrella, monóculo |
| `paws` | Guantes y calcetines (≈4) | mitones, calcetines de rayas, guantes de lana, botitas |
| `accessory` | Accesorios (≈5) | mochilita, flor en la oreja, globo, taza de leche, ovillo de lana |

En total son unas 44 prendas en el MVP. Cada prenda tiene un **icono** para el grid, que es la misma prenda centrada sobre una celda `crema`.

## 6. UI
- Paneles con esquinas **muy redondeadas** (radio ≥ 24 px), borde `rosa-200` de 4 px y una sombra suave desplazada hacia abajo.
- Botones "gorditos" con sombra inferior más oscura (aspecto 3D blando), que al presionarlos bajan 4 px.
- Decoración: corazones, estrellitas y huellitas pequeñas, sin saturar.
- Tipografía: **Fredoka** (Google Fonts), en pesos 500 y 600 para títulos y botones. Texto siempre en `texto`, nunca negro.
- Iconos de las pestañas: silueta simple de la categoría con el mismo contorno.

## 7. Escenarios
- **Portada**: fondo `cielo` con nubes, el logo "Viste Lagato" con letras gorditas y gatitos asomándose.
- **Calle o fachada de la tienda**: una boutique tierna con toldo de rayas rosa y crema, vitrina con un sweater, puerta con campanita y un letrero.
- **Dentro de la tienda (probador)**: pared `rosa-50` con papel tapiz de huellitas, un espejo grande con marco dorado suave, percheros al fondo y una alfombra redonda bajo el gato.

## 8. Movimiento
| Momento | Animación | Duración y easing |
|---|---|---|
| Aparecer o seleccionar | Escala de 0,8 a 1,05 a 1 | 250 ms, `Back.easeOut` |
| Soltar una prenda | Squash y stretch del gato, más corazones y brillitos | 300 ms |
| Prenda inválida o fuera del gato | Vuelve a su celda con rebote | 250 ms, `Back.easeOut` |
| Idle del gato | Respira (escala Y ±2 %), parpadea cada 3–5 s y mueve la cola | en bucle |
| Botón hover o press | Escala a 1,05 y al presionar baja 4 px | 100 ms |
| Cambio de escena | Fundido o "iris" con forma de huellita o corazón | 400–600 ms |

**Regla**: nada aparece ni desaparece de golpe. Todo entra y sale con un tween.

## 9. Sonido (dirección, ver ADR 0009)
**Sin música.** Solo efectos de sonido **ASMR**: suaves, cercanos, táctiles y *satisfactorios*.

| Acción | Sonido |
|---|---|
| Tomar una prenda | Roce de tela o lana, suave |
| Arrastrar | Un susurro muy sutil (opcional) |
| Soltar sobre el gato | "Pop" acolchado más un ronroneo corto |
| Volver a la celda | "Boing" blandito |
| Quitar con ✕ | Tela que se desliza |
| Hover y clic en botones | "Tic" de burbuja o madera suave |
| Entrar a la tienda | Campanita de puerta |
| Descargar la foto | Obturador de cámara suave |
| Escribir el nombre | Teclitas suaves |
| Reacción | "Miau" corto y variado, si se consigue con licencia libre |

- Volumen bajo y sin sonidos estridentes.
- Cada sonido tiene una pequeña variación de tono al azar (±5 %) para que no canse.
- Todo se puede silenciar.

## 10. Checklist para cualquier asset
- [ ] ¿Contorno de 8 px en color `contorno`, con uniones redondeadas?
- [ ] ¿Colores de la paleta, rellenos planos, una sombra y un brillo?
- [ ] ¿Formas redondeadas, sin puntas agresivas?
- [ ] ¿Encaja en la plantilla y en las anclas del gato?
- [ ] ¿Se ve tierno junto a los demás assets?
