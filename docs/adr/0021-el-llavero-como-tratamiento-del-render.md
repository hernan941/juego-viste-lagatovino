# 0021. El llavero como tratamiento del render del look

- **Estado**: Aceptado (con los números del espigón F12.9; queda un seguimiento: la medición en un celular real, ver §4)
- **Fecha**: 2026-10-25 (propuesto) · 2026-10-25 (aceptado en F12.10)
- **Amplía**: ADR 0006 (arte en SVG) y la foto de F7 (`objects/photo.ts`, `domain/photo.ts`). Se apoya en los ADRs 0003, 0016, 0017 y 0019.

## Contexto
El remate de la segunda etapa (S8) es que, al guardar en el modo foto, el gato vestido **se transforma en un llavero de porcelana** de Lagatovino, se descarga su empaque como PNG y se cuelga en el colgador del álbum. El usuario decidió que los gatos jugables **no** se rehacen como llaveros (ADR 0016). Hay que decidir cómo se dibuja el llavero sin arte nuevo de cuerpo, qué se guarda y cómo se mantiene fluido el colgador con hasta 12 llaveros en un celular.

## Decisión

### 1. El llavero es un tratamiento del render
No se dibujan gatos llavero. Se parte del **render del look** que ya produce la foto (el gato congelado con `Cat.freezeForPhoto(pose)` capturado en un `RenderTexture`, con las prendas y sus tintes, ADR 0018) y se le aplica, en este orden:
1. **Borde de porcelana**: se precalcula **una silueta** del render en un `DynamicTexture` (Phaser 4 no tiene `setTintFill`: se usa `setTint(color).setTintMode(Phaser.TintModes.FILL)`) y se estampa N veces con `stamp()`, desplazada en círculo (`borderOffsets(count, radius)`, radio de `photo.json → keychain`). Son **dos anillos**: abajo uno en `tinta`, un poco más ancho, para la línea exterior, y encima uno en `crema`. **Sin anillo interior**. Copias por anillo: **12 a 512 px y 8 en las miniaturas de 256 px**. El borde es ~2/3 del costo del armado, así que es lo primero que se recorta si hace falta.
2. **"Pintado a mano"**: un filtro ColorMatrix de Phaser 4 (`filters.internal.addColorMatrix()`) con **−15 a −20 % de saturación** (−10 % casi no se nota) y un poco más cálido. El valor exacto vive en `photo.json → keychain`.
3. **Barniz** por el método **ERASE** (no con el filtro Mask): `inv` = un `DynamicTexture` lleno de blanco al que se le borra el look (`fill(blanco)` + `erase(look)`); se dibuja la textura de brillo (SVG de `art/ui/keychain/`) en una copia y se le borra `inv` (`varnishCopy.erase(inv)`), así queda recortada a la silueta. Se descarta `filters.internal.addMask` porque **no recorta con `render.maxTextures: 1`** (el modo de test con SwiftShader; ver ADR 0022); ERASE recorta igual en los dos modos y cuesta lo mismo, así el e2e ve lo mismo que producción.
4. **Herrajes**: armellita, argolla (plata o dorada) y dije ✦, como imágenes SVG de `art/ui/keychain/` puestas sobre el ancla `head` del render.

Al terminar, el resultado se **aplana** en una sola textura (`keychain~<catId>~<hash de la receta>`) y se descartan las copias, la silueta e `inv`. Los filtros funcionan al dibujar dentro de un `DynamicTexture`, así que todo se hornea en esa textura. **Aplanar es obligatorio**: la versión viva (unos 30 hijos con filtros) balanceándose corre a 4–5 fps, y la aplanada no cuesta nada sobre la línea base al balancearse. Animar un llavero es mover una sola imagen.

La **franja del barniz** que cruza la pieza en la animación **no** usa un filtro vivo: es una textura pre-horneada (recortada a la silueta con el mismo método ERASE) que se mueve con un tween.

**API de `Cat` necesaria**: `Cat.setOutfit` funde las prendas con un tween de alfa de 250 ms; para capturar el render hace falta vestir **al instante** (sin tween). Esa API se pide en F11.15 y el `Keychain` la usa siempre que arme un llavero desde una receta.

La lógica vive en `domain/keychain.ts` (TS puro, TDD): `ringFor(stars, rules)` (plata con 1–3★, dorada con 4★, dorada con dije con 5★; umbrales en `photo.json`), `borderOffsets(count, radius)`, `keychainRecipe(look, photoChoice, stars, date)`, `hangKeychain(collection, recipe, confirmReplace) → { collection, replaced, isFirst }`, `pendulum(t, { amp, periodMs, damping }) → angle` (depende solo del tiempo, no de los fps) y `packagingLayout(frame)`. El objeto que dibuja es `objects/keychain/Keychain.ts` (Container) y el empaque se arma en `objects/photo.ts`, que ya sabe capturar y exportar a PNG.

### 2. Se guarda la receta, no la imagen
Cada llavero se guarda en el progreso (ADR 0017) como receta y se vuelve a dibujar al abrir el colgador:

```ts
interface KeychainRecipe {
  catId: string;
  catName: string;                         // el nombre que tenía al guardarlo
  outfit: Outfit;
  itemDye: Record<string, string>;         // solo de las prendas puestas
  pose: string;                            // id de photo.json → poses
  stars: Stars;
  photo: { background: string; frame: string; stickers: { id: string; x: number; y: number; angle: number }[] };
  createdAt: string;                       // fecha ISO (para el reverso)
}
```

- La argolla **no** se guarda: se deriva de `stars`.
- Al volver a dibujar, una prenda, un tinte o un sticker que ya no existe se omite (como `sessionFromSave`); una receta sin gato válido se descarta.
- **Un llavero por gato**. Si ya hay uno, se pregunta siempre ("¿Cambio el llavero de {nombre}?") y la opción resaltada por defecto es quedarse con el de **más estrellas**; con empate, el nuevo. El primero de cada gato cuenta en el álbum.
- Guardar y descargar el empaque ocurre siempre al pulsar [Guardar]; colgarlo es un paso aparte ([Colgarlo]), que escribe el progreso al instante.

### 3. Presupuesto de rendimiento (lo verifican F19.2 y F21.4)
| Concepto | Presupuesto |
|---|---|
| Llavero grande (transformación y capa en Album) | textura aplanada de **512 px** (~1,4 MB de GPU), 12 copias por anillo |
| Miniatura del colgador | textura aplanada de **256 px** (~0,3 MB cada una, ~3,6 MB las 12), 8 copias por anillo |
| Generación de miniaturas | **una por frame** al abrir la pestaña, con la silueta en `linea-lapiz` en el gancho mientras tanto. Generar las 12 en un mismo frame queda **prohibido** (un frame de 1–1,5 s en el espigón) |
| Llaveros balanceándose a la vez | **1** (el que se toca); los demás quedan quietos |
| Tratamientos vivos a la vez | **0** fuera del armado: filtros y ERASE corren solo al aplanar, nunca por frame |
| Caché | las miniaturas se guardan mientras dura la escena y se liberan en `shutdown`; el grande se vuelve a dibujar solo cuando se abre |

- La transformación del modo foto trabaja a 512 px y aplana al final; nunca hay dos tratamientos completos vivos a la vez.
- Números del espigón (Chrome headless con SwiftShader, `render.maxTextures: 1`, el peor caso): armado de 512 px en ~200–600 ms en caliente; miniatura de 256 px en ~60–200 ms; borde con 12 copias ~275 ms frente a ~400 ms con 16 y ~500 ms con 24; el balanceo aplanado no se distingue de la línea base. Detalle y capturas en `docs/spikes/porcelain/`.
- Con movimiento reducido (ADR 0013): sin giro ni flash, fundido cruzado de gato a llavero, el barniz aparece fijo (sin franja) y el balanceo es de ±3° y se detiene en 0,6 s (valores en `motionProfile`).

### 4. Resultado del espigón y seguimiento
El espigón F12.9 (`scenes/dev/PorcelainLab.ts`, solo en desarrollo) confirmó el aspecto (borde, filtro, barniz recortado y herrajes) y que el PNG exportado conserva el borde y el barniz; fijó los números de §1 y §3. No hizo falta ningún plan B salvo cambiar la máscara por ERASE.

**Seguimiento pendiente**: Playwright con SwiftShader no reemplaza a un celular. Falta medir en un **celular real de gama baja (Chrome Android)**: el armado de 512 px, las 12 miniaturas de a una por frame y el balanceo. Se verifica en la DoD (**F21**). Si no rinde, los planes B son, en orden: bajar las copias a 8 también a 512 px (y a 6 en miniaturas); miniaturas de 192 px; omitir el ColorMatrix y suavizar los colores en el render; o el barniz como una imagen fija sin recorte.

### 5. Pruebas (ADR 0012)
- Unit: la tabla de argollas, que el péndulo se apague y no dependa del paso de tiempo, `hangKeychain` (primero, reemplazo confirmado y rechazado, regla de más estrellas), la receta y su saneo, `borderOffsets` y `packagingLayout`.
- Integración (`Keychain`): la misma receta da la misma textura; el barniz no pinta fuera de la silueta (un píxel fuera del borde queda transparente); `destroy` y `shutdown` liberan la silueta, `inv` y las texturas temporales.
- e2e (`keychain`): guardar → transformación → descarga del PNG del empaque (evento `download`, en el celular el menú de compartir) → colgar → el llavero está en su gancho → sobrevive a una recarga. El hook suma `keychains` y `keychainPhase`. El subconjunto móvil incluye guardar un llavero.

## Alternativas consideradas
- **Dibujar un llavero por gato** (la opción C de los gatos alargados): caro (L–XL) y fuera de esta etapa. Si se hace después, es arte **solo** del llavero y del empaque, y no reemplaza al ADR 0003.
- **Guardar el PNG del llavero en localStorage**: cientos de KB por gato, cerca del límite del navegador e incompatible con una base de datos liviana. La receta ocupa cientos de bytes.
- **Un shader propio de porcelana**: más fiel, pero difícil de mantener y de probar; las copias planas ya funcionan en el halo de F9.
- **Una escena propia para el llavero**: no hay contenido suficiente; la transformación vive en PhotoMode y el colgador en Album (ADR 0019).
- **Animar los 12 llaveros a la vez**: lindo, pero es el mayor riesgo de rendimiento en el celular y no suma diversión frente a balancear el que se toca.
- **Barniz con el filtro Mask** (`filters.internal.addMask`): era la propuesta original; descartado porque no recorta con `render.maxTextures: 1` y el e2e vería otra cosa que producción.
- **Llavero vivo sin aplanar** (copias, filtros y herrajes como hijos del Container): 4–5 fps al balancearse en el espigón.
- **Franja del barniz como filtro vivo**: mismo problema; la textura pre-horneada con tween se ve igual.
- **16 copias por anillo o un anillo crema interior**: 16 copias cuestan entre 17 y 40 % más que 12 y el anillo interior entre 50 y 80 % más, sin diferencia apreciable a tamaño de juego (captura `03-copies-6-8-12-16.png`).

## Consecuencias
- El llavero llega sin redibujar gatos ni prendas, y cualquier prenda o tinte nuevo aparece en los llaveros sin trabajo extra.
- El colgador depende de que las texturas de las prendas y los tintes de cada receta existan al abrirlo; el `DyePlugin` (ADR 0018) las genera bajo demanda.
- Arte nuevo chico en `art/ui/keychain/` (unas 8 piezas) y 4 sonidos CC0 (ADR 0009).
- El `Keychain` depende de la API de `Cat` para vestir al instante (F11.15).
- Memoria de GPU acotada: ~1,4 MB del grande más ~3,6 MB de las 12 miniaturas mientras Album está abierta.
- Riesgos: el rendimiento en un celular real de gama baja sigue sin medir (seguimiento en F21); el tope de 24 texturas teñidas puede quedarse corto si los 12 llaveros usan tintes distintos (las texturas usadas solo para aplanar se liberan después del aplanado, así que no cuentan como "en uso"); el PNG del empaque es más grande que la foto de F7 y en el celular pasa por el menú de compartir (F10).

## Enmienda (2026-10-26): notas de la implementación (F19)
No cambia la decisión. Registra dónde la implementación se apartó del texto y qué queda por resolver en F19.3.

### Desaturación: el valor canónico va en `photo.json`
- §1.2 pide que el ColorMatrix tome sus valores de `photo.json → keychain`. Hoy son constantes en `domain/keychain.ts`:
  - `PORCELAIN_SATURATION = 0.82` (−18 %, dentro del rango de −15 a −20 %);
  - `PORCELAIN_WARMTH = 0.03`.
  
  `objects/keychain/porcelain.ts` las usa con `porcelainMatrix(saturation, warmth)`, que es pura y tiene test.
- **El valor canónico es el de `photo.json → keychain`**, validado por `schema.ts`, como dice §1.2. Las constantes son provisorias. Al moverlas (previsto en F19.3), `porcelainMatrix` no cambia: solo recibe los valores desde el catálogo. Hasta entonces, cualquier ajuste se hace en `domain/keychain.ts`, y al migrar se copia el valor tal cual.

### Posición de la armellita (lógica nueva)
- §1.4 decía "sobre el ancla `head` del render". La implementación **mide** la parte alta de la cabeza con lo que se lleva puesto, para que un gorro alto suba la armellita:
  - `objects/keychain/lookTop.ts → headTop(scene, cat, items)` toma el píxel visible más alto del gato y de cada prenda **en la banda central** del lienzo (columnas del 44 al 56 %, para que no cuenten las orejas pero sí un pompón fino). Usa el mapa de alfa de las texturas (`alphaMapOf` y `topOfColumns` de `domain/imageBounds.ts`). Si no puede medir nada, usa `y = 70` en el lienzo de 512;
  - el punto se transforma con la pose de la foto con `poseTransform(pose, point)` (`domain/keychain.ts`, pura) y la pose de `catPose(id)` (`domain/catPose.ts`);
  - los herrajes se ubican con `HARDWARE_ART` y el layout de `domain/keychain.ts`.
- La lectura del alfa es de render. La banda, la transformación y el layout son puros (ADR 0012).
- Riesgo: si una prenda deja la banda central vacía (por ejemplo, algo con un hueco en el medio), la armellita baja a la cabeza del gato, lo cual es aceptable. Si queda alguna pose con mucha rotación, el punto transformado puede salirse un poco del contorno. Se revisa con las capturas de F19.

### Franja del barniz: pendiente para F19.3
- §1 pedía que la franja que cruza la pieza fuera una textura pre-horneada movida con un tween. **No se puede así**: el recorte a la silueta (ERASE) se hornea en una textura, así que la franja ya recortada no puede desplazarse dentro de la silueta. Si se mueve la imagen, se mueve también el recorte.
- Hoy el barniz es solo de brillos fijos recortados (`clipToSilhouette`, en `objects/keychain/porcelain.ts`) y no hay franja animada.
- La solución se decide en F19.3, sin filtros vivos por frame (§3: cero tratamientos vivos fuera del armado). Hay tres opciones:
  - hornear unos pocos fotogramas de la franja, cada uno recortado, y alternarlos durante la animación;
  - mover una franja sin recortar con una máscara de geometría simple que se parezca a la silueta;
  - dejar el barniz fijo con un destello breve, como en movimiento reducido.
  
  Sea cual sea, la decisión se agrega a este ADR como enmienda.
