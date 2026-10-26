# 0021. El llavero como tratamiento del render del look

- **Estado**: Propuesto (pasa a Aceptado cuando el espigón técnico de S8 confirme el aspecto y el rendimiento en el celular)
- **Fecha**: 2026-10-25
- **Amplía**: ADR 0006 (arte en SVG) y la foto de F7 (`objects/photo.ts`, `domain/photo.ts`). Se apoya en los ADRs 0003, 0016, 0017 y 0019.

## Contexto
El remate de la segunda etapa (S8) es que, al guardar en el modo foto, el gato vestido **se transforma en un llavero de porcelana** de Lagatovino, se descarga su empaque como PNG y se cuelga en el colgador del álbum. El usuario decidió que los gatos jugables **no** se rehacen como llaveros (ADR 0016). Hay que decidir cómo se dibuja el llavero sin arte nuevo de cuerpo, qué se guarda y cómo se mantiene fluido el colgador con hasta 12 llaveros en un celular.

## Decisión

### 1. El llavero es un tratamiento del render
No se dibujan gatos llavero. Se parte del **render del look** que ya produce la foto (el gato congelado con `Cat.freezeForPhoto(pose)` capturado en un `RenderTexture`, con las prendas y sus tintes, ADR 0018) y se le aplica, en este orden:
1. **Borde de porcelana**: 12 a 16 copias planas del render teñidas de crema (`setTintFill`), desplazadas en círculo (radio del borde de `photo.json → keychain`), y debajo otro anillo de copias en `tinta` un poco más ancho para la línea exterior. Es la misma técnica del halo de hover de F9.
2. **"Pintado a mano"**: un filtro ColorMatrix de Phaser 4 (`filters.internal.addColorMatrix()`) con −10 % de saturación y un poco más cálido.
3. **Barniz**: una textura de brillo (SVG de `art/ui/keychain/`) recortada a la silueta con un filtro de máscara que usa la propia textura del render (`filters.internal.addMask`), más la franja que lo cruza durante la animación.
4. **Herrajes**: armellita, argolla (plata o dorada) y dije ✦, como imágenes SVG de `art/ui/keychain/` puestas sobre el ancla `head` del render.

Al terminar, el resultado se **aplana** en una sola textura (`keychain~<catId>~<hash de la receta>`) y se descartan las copias. Animar un llavero es mover una sola imagen.

La lógica vive en `domain/keychain.ts` (TS puro, TDD): `ringFor(stars, rules)` (plata con 1–3★, dorada con 4★, dorada con dije con 5★; umbrales en `photo.json`), `borderOffsets(count, radius)`, `keychainRecipe(look, photoChoice, stars, date)`, `hangKeychain(collection, recipe, confirmReplace) → { collection, replaced, isFirst }`, `pendulum(t, { amp, periodMs, damping }) → angle` (depende solo del tiempo, no de los fps) y `packagingLayout(frame)`. El objeto que dibuja es `objects/Keychain.ts` (Container) y el empaque se arma en `objects/photo.ts`, que ya sabe capturar y exportar a PNG.

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

### 3. Presupuesto de rendimiento
- El colgador dibuja los 12 llaveros como **miniaturas aplanadas de 256 px**, generadas de a **una por frame** al abrir la pestaña (con la silueta en lápiz mientras tanto), y se guardan en caché mientras dura la escena. Se liberan en `shutdown`.
- **Solo un llavero se balancea a la vez**: el que se toca. Los demás quedan quietos. El llavero en grande (capa dentro de Album) se vuelve a dibujar a 512 px solo cuando se abre.
- La transformación del modo foto trabaja a la resolución de la foto y aplana al final; nunca hay dos tratamientos completos vivos a la vez.
- El filtro y la máscara corren solo durante el aplanado, no en cada frame.
- Con movimiento reducido (ADR 0013): sin giro ni flash, fundido cruzado de gato a llavero, el barniz aparece fijo y el balanceo es de ±3° y se detiene en 0,6 s (valores en `motionProfile`).

### 4. El espigón técnico va primero
Antes de construir S8 se hace un espigón en una escena de pruebas (solo en modo test) que valide, en Chrome, Firefox y un celular real: el borde con copias, el filtro, el barniz recortado y el aplanado; el tiempo de generar 12 miniaturas; y que el PNG exportado conserve el borde y el barniz. Si algo no rinde, los planes B son, en orden: bajar las copias del borde a 8; generar el borde con un contorno de `Graphics` sobre la silueta precalculada; omitir el filtro y suavizar los colores en el render de la foto; o hacer el barniz como una imagen fija sin máscara.

### 5. Pruebas (ADR 0012)
- Unit: la tabla de argollas, que el péndulo se apague y no dependa del paso de tiempo, `hangKeychain` (primero, reemplazo confirmado y rechazado, regla de más estrellas), la receta y su saneo, y `packagingLayout`.
- e2e (`keychain`): guardar → transformación → descarga del PNG del empaque (evento `download`, en el celular el menú de compartir) → colgar → el llavero está en su gancho → sobrevive a una recarga. El hook suma `keychains` y `keychainPhase`. El subconjunto móvil incluye guardar un llavero.

## Alternativas consideradas
- **Dibujar un llavero por gato** (la opción C de los gatos alargados): caro (L–XL) y fuera de esta etapa. Si se hace después, es arte **solo** del llavero y del empaque, y no reemplaza al ADR 0003.
- **Guardar el PNG del llavero en localStorage**: cientos de KB por gato, cerca del límite del navegador e incompatible con una base de datos liviana. La receta ocupa cientos de bytes.
- **Un shader propio de porcelana**: más fiel, pero difícil de mantener y de probar; las copias planas ya funcionan en el halo de F9.
- **Una escena propia para el llavero**: no hay contenido suficiente; la transformación vive en PhotoMode y el colgador en Album (ADR 0019).
- **Animar los 12 llaveros a la vez**: lindo, pero es el mayor riesgo de rendimiento en el celular y no suma diversión frente a balancear el que se toca.

## Consecuencias
- El llavero llega sin redibujar gatos ni prendas, y cualquier prenda o tinte nuevo aparece en los llaveros sin trabajo extra.
- El colgador depende de que las texturas de las prendas y los tintes de cada receta existan al abrirlo; el `DyePlugin` (ADR 0018) las genera bajo demanda.
- Arte nuevo chico en `art/ui/keychain/` (unas 8 piezas) y 4 sonidos CC0 (ADR 0009).
- Riesgos: el aspecto de "porcelana" depende del espigón; el tope de 24 texturas teñidas puede quedarse corto si los 12 llaveros usan tintes distintos (las texturas usadas solo para aplanar se liberan después del aplanado, así que no cuentan como "en uso"); el PNG del empaque es más grande que la foto de F7 y en el celular pasa por el menú de compartir (F10).
