# Créditos de tipografías

Autoalojadas (ADR 0016), licencia SIL Open Font License 1.1. El texto completo está junto a los archivos.

| Familia | Pesos | Uso | Autores | Licencia | Archivos |
|---|---|---|---|---|---|
| Londrina Solid | 400, 900 | Títulos, cartel del nombre, monedero y estrellas | The Londrina Solid Authors (https://github.com/marcelommp/Londrina-Typeface) | SIL OFL 1.1, `OFL-londrinasolid.txt` | `LondrinaSolid-400.woff2`, `LondrinaSolid-900.woff2` |
| Gaegu | 400, 700 | Lo que "dice" alguien: burbujas, juez, vendedora, pistas, nombre en la foto | The Gaegu Project Authors | SIL OFL 1.1, `OFL-gaegu.txt` | `Gaegu-400.woff2`, `Gaegu-700.woff2` |

Origen: Google Fonts (fonts.gstatic.com), repositorio google/fonts.

Modificaciones: Londrina Solid se sirve tal cual (subconjunto `latin` de Google Fonts). Gaegu se recortó con `fontTools.subset` a ASCII, Latin-1, puntuación general, flechas, ♥ y ✦ y se convirtió a `woff2`, para quitar el hangul (de 3 MB a 17 KB). Ninguna fuente se renombró.

Aviso: **Gaegu no trae letras con tilde ni `¡` `¿` `ñ`**. Esos caracteres se dibujan con la siguiente fuente de la pila (`Fonts.Voice` en `src/game/constants.ts`: Londrina Solid).
