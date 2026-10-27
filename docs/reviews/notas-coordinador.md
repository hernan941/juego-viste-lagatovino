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

## F13.8: balance de la economía (para F21.1)
Resultados del jugador modelo con el `economy.json` actual, con 5 semillas:

| Meta | Objetivo | Medido |
|---|---|---|
| 50 % de lo comprable | sesiones 3–5 | sesión 3 |
| 100 % | ≤ 12 (el diseño dice 9–10) | sesiones 5–6 |
| % del dinero que sale de descubrir | 90 % | ~60 % |

- **Se compra todo demasiado rápido.** Después, el jugador acumula más de 6000 botones sin nada en qué gastarlos (unos 230 por sesión).
- **Recomendación**: bajar `byStars` a algo como 1:3, 2:6, 3:10, 4:17, 5:24 (variante A) o 1:3, 2:5, 3:9, 4:14, 5:20 (variante B). Así el 100 % cae hacia las sesiones 7–10 y el 50 % sigue en rango, sin subir precios.
- El objetivo del 90 % "por descubrir" puede leerse como el potencial único (2320 de 2350) o como el flujo real. Lo decide el GD.
- Para evitar acumular sin gastar, una idea: cuando un gato ya tiene 5★ y todos sus gustos, sus looks nuevos pagan solo propina.

## F21.1: balance aplicado (falta que lo confirme el GD)
- `payout.byStars` pasa a {1:3, 2:5, 3:8, 4:10, 5:14}. Los números que propuso el GD ({3,6,10,14,20}) no cumplían en todas las semillas.
- Resultado: 50 % en las sesiones 3–4, 100 % en las sesiones 10–11 y entre 70 y 73 % del flujo saliendo de descubrir (con poco margen en dos semillas).
- **Riesgo de sensación**: que 5★ pague solo 14 botones puede sentirse mezquino al lado de los +15 de un gusto o los +40 de un combo. El GD debe confirmarlo en la revisión final, jugando.

## F16.5: comprar tintes
- Las etiquetas de los frascos y de las prendas teñidas viven en `DyeTabController` (eventos `DyeTagPressed` y `DyesBought`), separadas de `PriceTagsController`. Hay que registrarlo en el ADR 0018 o en el 0019.
- La etiqueta "Tinte Lila" de la prenda cae cerca de la alfombra. Revisarlo con el GD.

## F20.5: DressUp repintado (captura f205/after-worn.png)
- Se ve muy bien: papel cuadriculado, pestañas índice de colores, el espejo con marco de tinta y washi, "Capas" en tarjeta, ¡Listo! en píldora negra y el cartel del nombre colgando.
- Queda para F20.7:
  - `WalletHud` sigue con el estilo v1;
  - `GiftBox.ts` todavía usa `Palette` y `FONT_FAMILY`.
- En Tintes, las etiquetas de los frascos se pisan con las de precio y con la fila de abajo (layout de `DyeTabController`).
- En las celdas aparecen corazones sobre las etiquetas de precio: confirmar con el GD qué indican.

## F19.4 y F19.5: colgador (captura 06-hanger-full.png)
- Se ve lindo: tablero de corcho, llaveros con argolla de plata o dorada, y siluetas en lápiz en los ganchos vacíos.
- **Problemas de layout**:
  - el tablero sale de la hoja: la fila de abajo y sus nombres quedan sobre el borde del corcho y de la página;
  - el anillado del lomo pisa la parte de arriba del tablero.
- `AlbumTabs.getTabPositions()` devuelve el mismo punto para las 5 pestañas. Corregirlo antes del e2e F19.6.
- "Colgador dorado" sigue con `reward: []`. El premio sería arte nuevo (un tag con ✦).
