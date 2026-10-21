# 0009. Audio: solo efectos de sonido ASMR, sin música

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
El usuario quiere el juego "en silencio" (sin música), pero con efectos de sonido **satisfactorios tipo ASMR** en cada acción, y maullidos si se consiguen.

## Decisión
- **No hay música** en el MVP.
- Los efectos de sonido siguen la tabla de `docs/art-direction.md` §9.
- **Origen de los sonidos**, en este orden de preferencia:
  1. Bancos con licencia **CC0** (Freesound filtrado por CC0, Kenney, OpenGameArt CC0);
  2. sonidos sintetizados (por ejemplo con jsfxr o con Web Audio) para pops, tics y boings.
  - Cada sonido externo se registra en `public/assets/audio/CREDITS.md`, con su origen y licencia.
  - **No** se usa audio con licencia restrictiva o dudosa.
- Formato **OGG**, con **MP3** como respaldo, normalizado a un volumen bajo. Se carga en `PreloadScene` y se reproduce con una variación de tono al azar de ±5 %.
- Un servicio `src/services/audio.ts` centraliza la reproducción, el silencio (persistido) y el límite de sonidos simultáneos.
- Los navegadores solo permiten sonar después de una interacción: el primer clic en "Iniciar" desbloquea el audio.

## Alternativas consideradas
- Música de fondo: el usuario la descarta por ahora.
- Grabar sonidos propios: no hay equipo ni tiempo en el MVP.

## Consecuencias
- Hay que buscar y curar sonidos. Si no se encuentran maullidos CC0 de calidad, se omiten (la reacción es visual).
- Añadir música más adelante es solo agregar un canal al servicio de audio.
