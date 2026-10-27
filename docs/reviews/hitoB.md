# Hito B. Revisión GD de tintes, álbum y modo foto (F16.R, F17.R y F18.R)

- **Fecha**: 2026-10-27 · **Revisor**: game-designer · **Rama**: `segunda-etapa`
- **Material revisado**:
  - el código de `DyeTabController`, `DyeJar`, `DyeSweep`, `DyeDot`, `scenes/Album.ts`, `objects/album/*`, `scenes/PhotoMode.ts`, `objects/photomode/*`, `objects/keychain/*` y `domain/copy/*`;
  - el arte de `art/ui/shop/price-tag.svg`;
  - las capturas de tintes (`desktop-*`, `f164-*`, `s1`–`s5`), del álbum (`album-*`), del modo foto (`s1/`, `s2/`, `s3/`, `shots/f185-*`, `shots/sheet-*`, `shots/*-png`), de DressUp (`f205/*`) y del Title (`title-*`);
  - `notas-coordinador.md` y `hito-A.md`.
- **Medido contra**: `docs/design/segunda-etapa.md` (S4, S5 y S6, y §4), `docs/art-direction.md` v2 y "diversión > funcionalidad".
- **Límite**: la revisión se hizo sobre el código y las capturas, sin jugar en vivo. El sonido y el ritmo (el goteo, el "blup" y el pase de hoja) se verifican en la sesión con el usuario.

## Veredicto

| Feature | Veredicto | Altas |
|---|---|---|
| F16.R Tintes | **Con cambios** | 3 |
| F17.R Álbum | **Con cambios** | 2 |
| F18.R Modo foto | **Con cambios** | 2 |
| F20.3 Title | **Aprobado** (con una Media) | 0 |
| F20.5 DressUp (estética) | **Aprobado** (lo pendiente cae en las Altas de Tintes o viene de Hito A) | 0 |
| Balance F21.1 (5★ = 14) | **Confirmado**, con una condición de presentación (§5) | — |

El gesto central de cada feature **ya es divertido**:
- **Tintes**: el frasco se destapa con un pop, gotea, la tinta salpica, el color sube por el sweater y el gato se mira la panza (`f164-*`, `desktop-4-splash`).
- **Álbum**: el cuaderno cae y se endereza, las páginas se pasan, los bocetos en lápiz azul tienen su precio y el sello del 25 % cae con confeti (`album-stamp-3`).
- **Modo foto**: los stickers se despegan y se inclinan, y la transformación en porcelana se lee muy bien en `sheet-a`.

Lo que falta no es juice. Son **claridad** (cosas que se pisan o que enseñan algo falso) y el **"¿qué más hay?"** del álbum, que hoy no muestra los sets.

---

## 1. F16.R Tintes

**Lo que funciona**: tirar tinta es satisfactorio. Las respuestas de cada caso están cubiertas:
- la secuencia `Uncork` → goteo → `Blup` → salpicadura → barrido de 380 ms → `sorpresa` y luego `feliz`;
- el rechazo con rebote del frasco ("¡A mí no!" y "Ese no se tiñe");
- el puntito de color en la celda y en la fila de Capas;
- la compra en la caja (`s3-sheet`, `s5-done`).

El color respeta el contorno (`desktop-5-dyed`: el sweater de rayas verde hoja tiene la tinta negra intacta).

**Lo que falla**: el estante de frascos se ve desordenado y algunos elementos enseñan cosas que no son.

### Alta
| # | Qué | Por qué | Esf. | Archivos y tarea | Pista técnica |
|---|---|---|---|---|---|
| T1 | **Los nombres y las etiquetas de los frascos no se pisan.** Hoy "Durazno" choca con "Naranjo", "Frambuesa" se sale de la celda y las etiquetas tapan "Cielo", "Rosa" y "Naranjo" (`after-tintes`, `phone-tintes`, `s2-jars`). Propuesta: la etiqueta **se amarra al cuello del frasco** y cuelga hacia la izquierda, como en una botica (`JAR_TAG` ≈ `{ x: -30, y: -38 }`), con el nombre a 18–20 px. | Es la primera impresión de la pestaña: un estante amontonado se lee roto y no invita a probar. | S | `objects/DyeJar.ts` (`JAR_TAG`, `LABEL_Y`, tamaño del texto) y `DyeTabController.ts` (`PANEL.step`). Va como ajuste de F16.5. | Hay que agregar un test de integración: los rectángulos del nombre de cada frasco no se cruzan con los de sus vecinos ni con su etiqueta, y ninguno sale del panel (404 px). |
| T2 | **Un solo consejo en la pestaña Tintes.** Hoy se ven "Arrastra el frasco a un suéter" y, debajo, "Arrastra la ropa al gatito". | Dos instrucciones distintas confunden justo cuando el gesto es nuevo. | S | El consejo general vive en `DressUp.ts`. Lo mejor es un punto de extensión `ctx.setTip(text \| null)` que `DyeTabController` llama al abrir y al cerrar la pestaña. Va en F16.5 (ajuste) y necesita una línea en `DressUp.ts`, con permiso del coordinador porque F20.5 es la dueña. | Fundido de 140 ms al cambiar el texto. Queda una sola fuente de verdad del consejo. |
| T3 | **El hilo de la etiqueta de precio no es un corazón.** Hoy `price-tag.svg` dibuja el hilo como un ♥ azul, y en el probador se ve un "corazón" sobre cada prenda y cada frasco sin comprar (el coordinador preguntó qué indican: **nada**, es el hilo). | En este juego, el ♥ significa "le encanta" (gustos, ojos de corazón, "♥ 3/5"). Un corazón sobre las prendas sin comprar enseña algo falso: que al gato le gustan. | S (arte) | `art/ui/shop/price-tag.svg`: el hilo pasa a ser un lazo simple, una gota abierta o un nudo, en `lapiz`, sin mover la punta (60, 6). Después, `npm run art`. Va como ajuste de F13.R. | El área táctil no cambia. Hay que regenerar las capturas de `price-tags.spec`. |

### Media
| # | Qué | Por qué | Esf. | Archivos | Pista técnica |
|---|---|---|---|---|---|
| T4 | **El frasco "vierte"** cuando está sobre una prenda teñible: se inclina a −35° (`Back.easeOut`, 120 ms), gotea al doble de ritmo y baja el alpha a 0,85. Así, con el mouse, el halo de la prenda se ve a través del frasco. | Pasa de "llevar un frasco" a "tirarle tinta", que es la promesa de S4. Además, el frasco de 150 px tapa media prenda con el mouse. | S | `DyeTabController.ts` (`onJarMove` y `follow`) | `d.pouring = target !== null` y luego `tiltToward(d.angle, …)` hacia −35. Con movimiento reducido, se queda solo el alpha. |
| T5 | **La etiqueta del tinte en la prenda puesta** muestra una gotita del color en lugar del texto "Tinte Lila", que hoy cae sobre las patas y la alfombra (`s2-jars`). | Se entiende sin leer, y no tapa las patas ni la alfombra. | S | `DyeTabController.syncWornTags` | Se usa un `DyeDot` hijo de la etiqueta, en la ventana del precio, a la izquierda del número. El nombre queda en la caja. |
| T6 | **"¡A mí no!"**: la burbuja va a la izquierda de la cabeza (hoy tapa el monedero y el cartel, `desktop-6-notme`) y el gato hace la sacudida que pide S4 (hoy solo cierra los ojos). | El gato tiene que protestar con gracia, no parecer dormido. | S | `DyeTabController.refuse` (posición), `Cat.sayNo` | Es la misma regla que M2 de Hito A: la burbuja va al lado con espacio libre. Sacudida: `x ±6`, 3 ciclos de 60 ms. |
| T7 | **El frasco vuelve a su celda después de teñir** con `receivePop` y un "glup" que lo rellena (hoy solo recupera el alpha). | Cierra el gesto: el frasco no se gasta, y se nota. | S | `DyeTabController.dyeItem` | Al terminar `fly`, se llama `d.jar.receivePop()`. |

### Baja
- **T8**: el borde del barrido lleva una línea "mojada" (una franja de 6 px más clara que sube con el recorte). Esfuerzo S. Va en `DyeSweep.ts`.
- **T9**: el texto dice "suéter" y el resto del juego dice "Sweater". Conviene unificar en "Arrastra un frasco a un sweater". Va en `copy/dyes.ts`.

---

## 2. F17.R Álbum

**Lo que funciona**: el cuaderno **se siente de papel** (espiral, cuadrícula, washi, lápiz azul). Los bocetos con su precio y los "?" con la pista del combo ("Digno de una majestad…") **dan ganas de seguir**. Las tarjetas al tocar no dependen del hover. El sello del % con confeti es un gran momento. En las polaroids de los gatos, la fila ♥ ♥ ✕ ★ ● muestra la colección de gustos de un vistazo.

**Lo que falla**: los **sets no se ven en ningún lado**. La portada dice "Sets: 1 de 7", pero no hay dónde ver qué pide cada set ni qué regala. Los sets son la meta concreta de S5 ("Abriguito: te faltan los mitones → fondo vichy") y están en el mínimo divertido.

### Alta
| # | Qué | Por qué | Esf. | Archivos y tarea | Pista técnica |
|---|---|---|---|---|---|
| L1 | **Los sets se ven.** La página "Looks especiales" suma una 2.ª hoja con su `Pager` (ya existe en Prendas): los 7 sets como tarjetas con washi. Cada tarjeta lleva el nombre, las piezas en mini (a color si ya son tuyas, en lápiz si faltan), "3 de 5" y el premio en miniatura ("→ fondo vichy celeste"). Los sets completos llevan un sello ✦. Además, la tarjeta de una prenda o de un frasco dice a qué set pertenece ("Del set Abriguito · 3 de 5"). | Es el "¿qué más hay?" con una meta concreta y cercana. Conecta el álbum con el modo foto, que es justo lo que prometen los sets. | M | `objects/album/CombosPage.ts` (o un `SetsPage` nuevo con el mismo `BookPage`), `domain/albumEntries.ts` (`setEntries`: puro y testeable), `copy/album.ts`, `ItemsPage`/`DyesPage` (`cardOf`). Va como ajuste de F17.4, más el e2e en `album.spec` (F17.7). | `setEntries(progress, catalog)` → `{ id, name, pieces: { id, got }[], reward, done }`. La miniatura del premio es la textura de `photo.json`. |
| L2 | **Las tildes no se ven "rotas".** Hoy "Grisú", "Siamés", "álbum", "Lápiz", "Dormilón" y "corazón" muestran la letra con tilde en Londrina, más gruesa: se lee como un error de tipeo en **cada pantalla**, y también en el nombre que escribe el jugador. | Es claridad y estética en todo el juego. El nombre del gato es del jugador: tiene que verse bonito con "ñ" y con tildes. | S–M | Cambia la tipografía de la voz (ADR 0016): (a) reemplazar Gaegu por una manuscrita OFL con Latin-1 completo (Patrick Hand, Itim o Mali), o (b) usar una de esas solo como alias de tildes en `public/style.css`, en lugar de Londrina. Lo decide el **architect** con una nota en el ADR 0016, y se aplica en F20.7 (que ya retira fuentes). | Captura de control: "Grisú, Siamés, Dormilón, ¡Ñam!" en la portada del álbum y en el cartel de DressUp. |

### Media
| # | Qué | Por qué | Esf. | Archivos | Pista técnica |
|---|---|---|---|---|---|
| L3 | **Un solo sistema de flechas.** Hoy hay flechas grandes que cambian de pestaña y un `Pager` interno que cambia de hoja (Prendas 1/2), y no se sabe cuál usar. Las flechas grandes y el arrastre deberían **recorrer primero las hojas de la pestaña** y después pasar a la siguiente pestaña, como un cuaderno de verdad. El `Pager` queda solo como indicador "1 / 2". | Pasar páginas tiene que ser un solo gesto, sin pensar. | S | `scenes/Album.ts` (`turnBy` le pregunta a la página `canTurn(dir)`), `objects/album/Pager.ts`, `AlbumPage` | Se agrega `page.turnInner?(dir): boolean`. Si devuelve false, se cambia de pestaña. |
| L4 | **El color favorito se pinta con su color** y la tarjeta del gato usa los colores de los glifos de la página (♥ `frambuesa`, ✕ `tomate`, ★ `naranjo`). Hoy, en la página, el ● sale `lapiz` (azul) para todos, y en la tarjeta todo sale negro ("● Naranjo" en negro). La mejor estrella se dibuja con ★ en lugar de "Mejor: 4 de 5". | Es lo mismo que A5b de Hito A: un punto azul para "Naranjo" enseña algo falso. | S | `objects/album/CatsPage.ts` (`GLYPH_COLOR['●']` → `dye.hex` del favorito, si está descubierto), `EntryCard` (línea con color), `copy/album.ts` | Se pasa `hex` en `CatEntry.tastes[i]`. |
| L5 | **La portada cuenta**: el % sube de 0 al valor real (ya existe el tween en `Cover`, hay que confirmar que se ve) con un "tic" de lápiz cada 5 %. El pie de página deja de repetir el número en otro formato ("15 %" en la portada, "15%" abajo). Basta con un formato ("15 %") y con mostrar el pie solo con el cuaderno abierto. | El número es el premio de abrir el álbum: verlo crecer se siente bien. Repetido, se vuelve ruido. | S | `objects/album/Cover.ts`, `copy/album.ts` (`percent`), `Album.ts` | `RisingPitch` de la libreta para los tics. |
| L6 | **El contador de Gatos dice qué cuenta**: "6 de 60 gustos" (hoy "6 de 60" bajo "Gatos" parece contar gatos). | Claridad del %. | S | `CatsPage` (`heading`), `copy/album.ts` | — |
| L7 | **La tarjeta de un boceto invita a probar**: "Cuesta 70 botones · ¡Pruébala gratis en el probador!". | Lleva del álbum de vuelta al juego. | S | `copy/album.ts` (`itemSketch`) | — |
| L8 | **"¡Set completo!"** fuera del álbum dice cuál y qué regala: "¡Set Abriguito! → fondo vichy". | Cierra el ciclo con L1. | S | `copy/ceremony.ts` (`eventNote` de `setCompleted`) | El evento ya trae el id del set. |

### Baja
- **L9**: en el celular, los glifos de gustos y "6 de 60" quedan en unos 10 px CSS (`album-phone-gatos`). Conviene subir los glifos a 28 px y `GLYPH_STEP` a 22.
- **L10**: en la página de Tintes, las filas quedan desparejas (3 + 3 y después 2 + 2 corridos). Conviene centrar la segunda fila de cada hoja.
- **L11**: la pestaña Colgador en gris parece rota. Mientras llega F19.5 está bien con la burbuja, pero al integrarla nunca debe quedar gris: los ganchos vacíos son la invitación.

---

## 3. F18.R Modo foto

**Lo que funciona**:
- La mesa se entiende sin texto: hay bandejas con pestañas de iconos, el tarro con "4 / 8" y los stickers bloqueados se ven como boceto con candado.
- Los stickers se despegan con *peel*, se inclinan, se asientan con 1,2 → 1 y salen girando al tarro. **Se sienten de papel.**
- El "zzz" del dormilón flota. Tocar algo bloqueado dice cómo conseguirlo.
- Nada depende del hover.
- La transformación en porcelana (`sheet-a`: encoge, gira, borde crema, barniz y armellita) es el momento mágico que se buscaba.

**Lo que falla**: el resultado final todavía no dan tantas ganas de mostrarlo como el proceso.

### Alta
| # | Qué | Por qué | Esf. | Archivos y tarea | Pista técnica |
|---|---|---|---|---|---|
| F1 | **El fondo no se sale del marco.** Con "cielo" (y con cualquier fondo de color), se ve una franja rectangular alrededor de la polaroid (`s3/8`, `s3/9`, `s3/10`: el celeste asoma a los lados y abajo), y lo mismo pasa con las esquinas en el PNG (`fin-calico-png`, borde blanco a la izquierda). | Es la foto para presumir: un borde que se sale parece un error de recorte. | S | `scenes/PhotoMode.ts` (capa del fondo) y `objects/photo.ts` (render del PNG). Va como ajuste de F18.5. | Se recorta el fondo a la ventana del marco (`setCrop` al rectángulo interior de `framePlacement`, o una máscara de la ventana). Test de integración: el rectángulo del fondo está dentro de la ventana del marco. |
| F2 | **El empaque cuelga de verdad y luce el llavero.** Hoy el llavero queda pequeño dentro de la foto, y su armella no se conecta con el agujero de la tarjeta kraft. La tarjeta tiene mucho kraft vacío (`fin-calico-png`, `rayas-naranja-png`). Propuesta: una cadenita (arte que ya existe en S8) desde el agujero hasta la argolla; el llavero un 30–40 % más grande y por delante de la polaroid; la polaroid detrás, rotada con `framePlacement` (±1° a ±8°), con el fondo y los stickers elegidos. | El PNG es lo que el jugador muestra. Tiene que leerse "un llavero colgando de su tarjeta", que es el trofeo de S8, y no "una foto con un llavero encima". | M | `objects/keychain/PackageCard.ts`, `domain/keychain.ts` (`packagingLayout`). Va como ajuste de F19.3/F18.5 (se coordina con F19.R). | `packagingLayout(frame)` devuelve `hole`, `chain` (de `hole` a `ringTop`), `keychainScale` y `photoAngle`. Test puro: `chain.from` es igual a `hole` y `chain.to` es igual a la punta de la argolla. Hay que verificar que los stickers colocados aparecen en el PNG. |

### Media
| # | Qué | Por qué | Esf. | Archivos | Pista técnica |
|---|---|---|---|---|---|
| F3 | **Las poses se ven antes de elegirlas**: cada botón muestra la carita del gato con su expresión (`amor`, `feliz`, `parpadeo`) y una mini inclinación, en lugar de solo texto ("Sentadito", "Coqueto"…). | Una bandeja de solo texto es la única de la mesa que no invita a tocar. | S | `objects/photomode/PhotoTray.ts` (celdas de `poses`) | Se reutiliza el icono de cara del gato (`Cat` en miniatura congelado) o un glifo por pose. |
| F4 | **La pista de lo bloqueado dice cuánto falta**: "Completa el set Abriguito (3 de 5)" y, si falta una sola pieza, la nombra ("¡Te faltan los mitones!"). | Convierte el candado en una meta a una vuelta de distancia. Va de la mano con L1. | S | `copy/photo.ts` (`unlockHint` recibe el avance), `PhotoMode.hintFor` | Se usa el mismo `setEntries` de L1. |
| F5 | **La polaroid de la mesa** se rota con `framePlacement` (estable por foto), igual que en el PNG. Hoy está derecha. | La gracia del scrapbook es lo "pegado a mano". | S | `scenes/PhotoMode.ts` | Pendiente desde F18.3. El gato y los stickers van dentro del mismo contenedor rotado. |
| F6 | Después de [Guardar], el gato vuelve a la pose elegida (lo anotó el coordinador: se queda en `amor`). Hay que verificarlo y, si sigue, corregirlo empezando por un test. | Si vuelve a la mesa, la foto tiene que seguir siendo la suya. | S | `PhotoMode.ts` | — |

### Baja
- **F7**: en `s1`–`s3`, los botones de sonido y movimiento siguen con el estilo v1 (rosados). Se cambian en F20.7.
- **F8**: el nombre en la polaroid de la mesa podría llevar las estrellas igual que el PNG. Ya están en `f185` y faltan en `s2`: hay que confirmar que se ven siempre.

---

## 4. Title (F20.3) y DressUp (F20.5)

**Title: aprobado.** La estética es coherente: cuadrícula, sol en tinta, "Viste Lagato" con subrayado de marcador y los tres gatos asomados que parpadean. "Mi álbum · 26 %" aparece solo si ya hay progreso, y eso está muy bien.
- **Media (S, `scenes/Title.ts`)**: el halo amarillo de [Iniciar] **toca** el botón "Mi álbum" (hay menos de 4 px entre los dos, `title-album-1280`, `title-album-phone`). En el celular eso invita a errar el toque. Conviene separarlos 16 px o más y agregar un iconito de cuaderno a la izquierda de "Mi álbum".

**DressUp (estética): aprobado.** El papel, las pestañas índice, el espejo con washi, las Capas en tarjeta, ¡Listo! negro y el cartel colgando se ven muy Lagatovino. Quedan pendientes:
- las Altas T1, T2 y T3 de Tintes;
- **M8 de Hito A** sigue abierta: el cartel "Naranjito" tapa el pompón del beanie (`f205/after-head`). Es Media (`objects/dressup/layout.ts`, subir el cartel 20 px o ponerlo detrás de las prendas `head`);
- **M1 de Hito A** ("♥ 3/5" en el cartel) no aparece en las capturas: hay que confirmar si se hizo;
- **A1 de Hito A** sigue abierta en el código: `copy/ceremony.ts` todavía arma "Le encanta lo {tag}" y "Todo muy {tag}" con el id crudo. **No es de este hito, pero bloquea la aprobación de Hito A.**

---

## 5. Balance: ¿5★ = 14 se siente bien?

**Sí, se confirma `{1:3, 2:5, 3:8, 4:10, 5:14}`**, con una condición de presentación (S, sin tocar números):

- **Por qué se sostiene**:
  - el **primer** 5★ con cada gato paga 14 + 50 = **64**. Es el 5★ que se siente, y es el más grande del juego después de un combo;
  - los 5★ siguientes con el mismo gato son una repetición de un logro, y 14 contra 3 (casi ×5) sigue marcando que las estrellas importan;
  - el dinero grande sale de **descubrir** (+15, +40, récords), que es la promesa de la §4. Y el juego no pide botones para nada que no sea ropa: el que ya tiene 5★ con un gato está jugando por el llavero dorado, no por los botones.
- **El riesgo real no es el número, es cómo se muestra**: que la ceremonia diga "+14" al final de 6 segundos de sellos y confeti, separado del "+50" del récord. **Condición**: cuando hay récord o descubrimientos en el mismo look, la nota de botones muestra la **suma** con su desglose ("+64 · look 14 · ¡primer 5★! 50") y los botones vuelan juntos. Se hace en `objects/showcase/Ceremony.ts` y `copy/ceremony.ts` (ajuste de F15.4).
- **Alternativa solo si en la sesión en vivo el usuario siente mezquino el 5★ repetido**: `{1:2, 2:4, 3:7, 4:10, 5:15}`. Es la misma suma aproximada para un jugador típico de 3★–4★, y "5★ = un gusto" es un ancla mental fácil. Solo se adopta si `balance.test.ts` mantiene el 100 % entre las sesiones 8 y 11 y el ≥ 70 % por descubrir en las 5 semillas. Si no cumple, se queda en 14.

---

## 6. Resumen de cambios priorizados

| Prioridad | Cambios |
|---|---|
| **Alta** (bloquean F16.R, F17.R y F18.R) | T1 estante de frascos sin choques · T2 un solo consejo · T3 hilo de la etiqueta sin corazón · L1 sets visibles · L2 tildes con fuente manuscrita · F1 fondo recortado al marco · F2 empaque con cadenita y llavero grande |
| **Media** | T4 frasco que vierte · T5 gotita en la etiqueta del tinte · T6 "¡A mí no!" sin tapar el HUD y con sacudida · T7 frasco que vuelve · L3 flechas únicas · L4 colores de los gustos · L5 portada que cuenta · L6 "gustos" · L7 "pruébala gratis" · L8 set con nombre y premio · F3 poses con carita · F4 pista con avance · F5 polaroid rotada · F6 pose después de guardar · Title separado · M8 de Hito A · suma de botones (§5) |
| **Baja** | T8, T9, L9, L10, L11, F7, F8 |

## Cierre
Con las 7 Altas hechas, los tres quedan **aprobados** sin repetir la revisión completa. Basta con estas capturas:
- el estante de Tintes a 1280 y en el celular;
- la hoja de sets con un set a medias;
- "Grisú" y "Dormilón" con la fuente nueva;
- la foto con fondo cielo;
- un empaque PNG de un gato con 5★ y stickers.

En la sesión en vivo con el usuario hay que mirar sobre todo el sonido del goteo y del "blup", y si el 5★ repetido (14) se siente poco.
