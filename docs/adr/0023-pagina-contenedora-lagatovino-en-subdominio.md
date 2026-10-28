# 0023. Página contenedora con la estética de Lagatovino, en un subdominio

- **Estado**: Aceptado
- **Fecha**: 2026-10-27
- **Enmienda**: ADR 0005 (el destino del despliegue pasa a ser un subdominio de lagatovino.com), ADR 0014 punto 6 (el botón de pantalla completa pasa a la página y deja de estar dentro del juego) y ADR 0015 (de la "integración web con lagatovino.com" entra **solo** la página contenedora).
- **Amplía**: ADR 0016 (la estética Lagatovino llega también a la página que rodea al lienzo).

## Contexto
El usuario decidió cómo se integra el juego con lagatovino.com: el juego vive en un **subdominio, con su propia página**, no embebido dentro del sitio. Para que el salto desde el sitio se sienta sutil, la página que contiene el juego (`index.html` y `public/style.css` de la plantilla, ADR 0010) tiene que parecer parte de lagatovino.com, con su header, su footer, el fondo de papel, las tipografías y los botones. Además, necesita un botón de pantalla completa y otro para volver al home del sitio. El usuario se encarga del hosting y del DNS.

Fuerzas:
- La página no es el juego. El lienzo sigue siendo de 1280 × 720 con `Scale.FIT` (ADRs 0008 y 0014), y ahora tiene menos alto disponible.
- En un celular en horizontal, cada píxel de alto cuenta: con `FIT`, el header y el footer achican la escala y, con ella, los objetivos de ~44 px CSS (ADR 0014).
- El ADR 0016 ya eliminó las dependencias externas (Google Fonts) y autoalojó Londrina Solid y Gaegu.
- Hoy hay un `FullscreenButton` dentro del juego, solo para táctil (ADR 0014). Si se suma otro en la página, quedarían dos botones que hacen lo mismo.
- `localStorage` se separa por origen (ADR 0004): el subdominio tiene su propio guardado, aparte del de lagatovino.com.

## Decisión
1. **Subdominio con una página independiente.** El build estático (`dist/`, ADR 0005) se publica en un subdominio de lagatovino.com que elige el usuario. Como es una raíz y no una subruta, el `base` de Vite queda en `/`. El hosting, el DNS, el HTTPS y el proveedor (Vercel, Netlify u otro) son del usuario y quedan fuera del repo. No se usa un iframe ni se embebe el juego dentro del sitio.
2. **Estilos copiados, propios y autoalojados.** Del CSS de lagatovino.com se copia solo lo necesario (header, footer, fondo de papel con cuadrícula, tipografías y botones) y se reescribe como **CSS plano propio** en `public/style.css`, con custom properties cuyos valores son los tokens de `docs/art-direction.md` v2 (los mismos de `Palette` en `constants.ts`). **Sin Tailwind, sin CDN y sin ningún recurso externo**: ni hojas de estilo, ni fuentes, ni imágenes enlazadas desde lagatovino.com. Se reutilizan las fuentes de `public/fonts/` (ADR 0016).
3. **Marca.** Se usan el **wordmark** y el **favicon** del sitio, que son del usuario. Se copian a `public/` (por ejemplo, `public/brand/` y el favicon en la raíz de `public/`) y se registran en `public/assets/CREDITS.md` como propiedad del usuario, no como OFL. No se enlazan en caliente.
4. **Botón "volver a Lagatovino".** Es un enlace `<a>` real del header que abre en la misma pestaña. Su URL es configurable con **`VITE_HOME_URL`**, y por defecto vale `https://lagatovino.com/`. El `href` del HTML trae el valor por defecto, así que funciona aunque el JS falle. Al arrancar, se reemplaza por `VITE_HOME_URL` si está definida y es una URL `http(s)`; si no, queda el valor por defecto.
5. **Un solo botón de pantalla completa visible: el de la página.**
   - Usa la Fullscreen API del DOM sobre el **contenedor del escenario**, que incluye el lienzo y el propio botón. Así, en pantalla completa desaparecen el header y el footer, el juego ocupa toda la pantalla y el botón sigue a mano para salir.
   - Aparece en PC y en celular, pero solo si la API está disponible (`document.fullscreenEnabled` o su variante `webkit`). En Safari de iPhone no aparece y el juego no depende de él (ADR 0014).
   - El `FullscreenButton` del juego **deja de mostrarse en todas las escenas**. Se quita o se desactiva al implementar esto, con su test y el `getE2EUi` del ADR 0012 actualizados. Nunca se ven dos.
6. **Lienzo.** El `parent` de Phaser (`game-container`) es el espacio libre que queda entre el header y el footer, y la página es una columna flex de `100dvh` (con `100vh` de respaldo). El juego se mantiene en 1280 × 720 con `Scale.FIT` y `CENTER_BOTH` dentro de ese espacio. No se cambia a `RESIZE` y no se toca ninguna escena.
7. **Celular horizontal (ADR 0014).** Con puntero grueso, en horizontal y con poco alto, el **header pasa a compacto** (una franja fina con el wordmark chico y los dos botones) y el **footer se oculta**, para que la escala del lienzo caiga lo menos posible. El overlay de "gira el teléfono" queda por encima de todo, también del header. Se mantienen `touch-action`, `overscroll-behavior` y el viewport del ADR 0014. El header y el footer pueden recibir toques, pero ningún gesto sobre ellos arrastra la página.
8. **Testeabilidad (ADR 0012).** La poca lógica de la página (resolver y validar la URL del home, decidir si se muestra el botón de pantalla completa y alternar el estado) vive en **helpers puros sin Phaser**, fuera de `src/game/` porque es de la página y no del juego (por ejemplo, `src/page/`), y se prueba con Vitest antes de escribirla. En el e2e se comprueba lo siguiente:
   - se ven el header, el footer y el wordmark;
   - el enlace del home apunta a la URL esperada;
   - el botón de pantalla completa existe donde corresponde y es el único;
   - el lienzo entra completo en 1280 × 720, en 1920 × 1080 y en el celular horizontal;
   - **ninguna petición sale del origen** y no hay errores de consola.

## Alternativas consideradas
- **Embeber el juego en un iframe dentro de lagatovino.com**: depende del sitio y de su CMS. Además, complica la pantalla completa, el foco del teclado virtual (ADR 0014) y el guardado (almacenamiento de terceros). El usuario prefirió el subdominio.
- **Subruta (`lagatovino.com/juego`)**: obliga a ajustar el `base` de Vite y a configurar el hosting del sitio principal. El subdominio es independiente.
- **Usar el Tailwind o el CSS del sitio por CDN**: agrega dependencias externas y un build más, y se rompe si cambia el sitio. Copiar un subconjunto chico como CSS propio es más simple y no depende de la red.
- **Mantener el botón de pantalla completa dentro del juego**: solo existe en táctil y deja el header y el footer afuera de la decisión. Si convive con el de la página, hay dos controles para lo mismo.
- **Pasar a `Scale.RESIZE` para aprovechar el espacio**: obliga a reacomodar toda la UI (ya se descartó en el ADR 0014).

- **Enmienda (pantalla completa en el celular)**: al tocar "Iniciar" en un dispositivo táctil (`pointer: coarse`) en horizontal, el juego invita a la pantalla completa. Emite `CustomEvent` `viste:request-fullscreen` (`PageEvents.RequestFullscreen` en `constants.ts`) en `document`, y `pageChrome` lo escucha y pide pantalla completa sobre `#stage`. `dispatchEvent` es síncrono, así que se conserva el gesto del usuario. No se pide en PC con mouse, en vertical, si ya está en pantalla completa o si no hay API; si el navegador la rechaza, el juego sigue sin errores.

## Consecuencias
- El juego se siente parte de Lagatovino y se puede volver al sitio con un toque. El juego en sí (escenas, datos y guardado) no cambia.
- `index.html` y `public/style.css` crecen. Su lógica es mínima y está en helpers puros.
- Se retira el `FullscreenButton` del juego y el layout de las esquinas (sonido y movimiento) gana espacio. Hay que actualizar los tests y las notas que lo mencionan (`docs/tests-pendientes.md`).
- El despliegue y el DNS siguen siendo del usuario. El repo solo entrega `dist/` y documenta `VITE_HOME_URL`.
- Riesgos:
  - **Escala en el celular**: aunque el header sea compacto, el lienzo queda algo más chico que antes. Hay que verificar los ~44 px en un dispositivo real; si no alcanza, el header se oculta en horizontal y queda solo el botón de volver flotando.
  - **Desincronización de estilos**: los tokens viven en `public/style.css` y en `constants.ts`. Si la marca cambia, se actualizan los dos (art-direction v2 manda).
  - **Guardado por origen**: el progreso queda atado al subdominio. Si el usuario lo cambia más adelante, los jugadores pierden su guardado local. Conviene elegir el subdominio una sola vez.
  - **Fullscreen y `FIT`**: al entrar o salir de pantalla completa cambia el tamaño del contenedor. Phaser lo recalcula en el resize; se verifica que no se pierda estado ni haya un salto brusco.
