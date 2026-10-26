# Notas del coordinador para las revisiones

Detalles vistos al integrar. Los revisa el game-designer en la revisión de cada feature.

## F15.3: ceremonia (captura del laboratorio, 5★)
- La tarjeta del juez arma los textos con el tag en crudo, y quedan mal:
  - "Le encanta lo invierno" y "No le tinca lo gala": falta concordancia. Conviene un nombre legible por tag en los datos (por ejemplo "lo invernal", "lo elegante").
  - "Todo muy clasico": falta la tilde de "clásico".
- El juez sigue siendo el placeholder (gato gris). Falta la respuesta del usuario sobre Kofi.

## F17.2 y F18.2: esqueletos de Album y PhotoMode
- En el álbum, el anillado del cuaderno pasa justo por encima del texto centrado "Prendas · 16 de 50". Las páginas reales (F17.3 y F17.4) deben dejar libre el lomo.
- El PNG que se guarda en PhotoMode todavía es la tarjeta del MVP, no la composición del scrapbook (F18.5).
- Album y PhotoMode no muestran el botón de pantalla completa.

## F19.2: Keychain (captura f192-big.png)
- En el llavero del gato naranjo, la parte de abajo (sweater, patas y bufanda) **se sale del borde crema**: el troquel no envuelve toda la silueta. Revisar en F19.3.
- La franja del barniz no se puede mover con un tween dentro del recorte. Opciones para F19.3: hornear entre 6 y 8 posiciones, o usar una máscara y `setCrop`.
- `PORCELAIN_SATURATION` quedó como constante en el dominio, no en `photo.json` como dice el ADR 0021. Hay que alinear el ADR o el JSON.
- El dije de 5★ se monta sobre el moño de la cabeza en el gato calico.

## Coverage
- `npm run coverage` falla: con la instrumentación, `scoreBalance.test.ts` supera el tope de tiempo de `bestPossible`. Hay que ajustar el test o el tope cuando corre bajo coverage.

## F12.R: ajustes aplicados
- Pendiente **M6**: rehacer la prueba de porcelana con los gatos B. Ya lo cubre la captura de F19.2.
- Falta mirar en DressUp la nube de `puaj` sobre un gato oscuro. Su posición es estimada.

## F15.4: pasarela (captura runway-4200.png)
- **Las notas polaroid de hitos tienen el pie cortado**: "¡Primeras 3 estrellas!" se lee mutilado. Podría ser el bug del texto rotado de A4, esta vez visible. Con este caso se puede reproducir.
- "Todo muy lana": otra vez el tag en crudo en el texto (ver F15.3).
- El fondo del Showcase todavía es la sala rosada v1, con el espejo y las huellitas (F20.6). El espejo tapa un poco los botones de salida.
- "tiern@" en la frase de consuelo del juez: revisar el texto.

## F16.3: pestaña Tintes (captura desktop-5-dyed.png)
- El teñido funciona: un sweater de rayas pasó a verde hoja.
- **DressUp sigue con la estética v1**: paneles rosados, ¡Listo! rosado 3D y fondo de huellitas. Se repinta en F20.5.
- Con 7 pestañas, la fila se achica al 90 %.
- Hoy se pueden usar los 10 frascos aunque no estén comprados ("probar es gratis"). La compra va en F16.5.

## F18.3 y F18.4: modo foto (captura s1/4-placed.png)
- Se ve muy bien: la bandeja de stickers con los bloqueados como boceto con candado, el tarro con el contador 4 / 8 y los stickers despegados.
- La polaroid no se rota todavía (`framePlacement`): si se rota la hoja, se desalinean el gato y los stickers. Va en F18.5 o en la revisión del GD.
- Las esquinas cuadradas de los fondos (por ejemplo `bg-cielo`) se asoman por las esquinas redondeadas del marco polaroid. Es un problema del arte.
- Después de [Guardar], el gato queda con cara `amor` y no vuelve a la pose elegida.

## A4: textos cortados (resuelto)
- La causa es el batching multi-textura de Phaser sobre WebGL por software (SwiftShader). No tenía que ver con la rotación. `systems/renderConfig.ts` pone `maxTextures: 1` cuando el renderer es por software o el modo es test. Con GPU real se usa el valor por defecto.
- Varios "cortes" que se vieron en capturas headless (notas polaroid, estrellas a medias) eran este mismo artefacto.
- Hace falta un ADR o una nota en el 0011, que hoy lo limita al modo test. Va junto con los otros pendientes de ADR: el evento `ItemDyed`, `Cat.itemAt`/`highlightItem` y `PORCELAIN_SATURATION`.
