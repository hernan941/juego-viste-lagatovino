# Viste Lagato 🐱

Juego 2D para navegador de vestir gatos, con estética kawaii/chibi. Eliges un gato, le pones nombre, entras a la boutique y lo vistes **arrastrando** prendas sobre él. Al final posa con su look y puedes descargar la foto.

Hecho con **Phaser 4 + TypeScript + Vite**. Pensado para PC con mouse (lienzo de 1280 × 720 que escala a la ventana).

## Cómo se juega

1. **Portada**: pulsa "Iniciar" (el primer clic también activa el sonido).
2. **Elige tu gato**: hay 12 gatos comunes. Escribe su nombre y pulsa "¡Este!".
3. **La tienda**: el gato camina y entra a la boutique (un clic salta la animación).
4. **El probador**: arrastra prendas desde el guardarropa (6 categorías, 44 prendas) hasta el gato. Para quitarlas, arrástralas fuera o usa la ✕ del panel de capas.
5. **¡Listo!**: el gato posa frente al espejo y puedes **descargar la foto** en PNG.

Botones de **silencio** y de **movimiento reducido** en el probador. El juego guarda en el navegador tu gato, su nombre, la ropa, los secretos y las preferencias.

### Secretos

Hay **6 combos secretos**. Cuando el gato lleva el conjunto correcto, reacciona y aparece una cajita de regalo: arrastra el moño para abrirla y ganar una prenda secreta. Si te falta una sola pieza, verás la pista "¡Casi...!".

<details>
<summary>Spoiler: los 6 combos</summary>

| Combo | Prendas | Premio |
|---|---|---|
| ¡Gatito galáctico! | Sweater de cohete + Lentes de estrella | Varita de estrella |
| ¡Look Navidad! | Sweater navideño + Beanie con pompón + una bufanda de invierno | Sweater dorado |
| ¡Jardín de fresas! | Sweater de fresas + Gorrito de fresa + Flor en la oreja | Corona de flores |
| ¡Su Majestad Gatuna! | Corona mini + Collar de perlas + Monóculo | Capa de superhéroe |
| ¡Gatito enamorado! | Sweater de corazones + Lentes de corazón + Globo de corazón | Lentes de corazón brillantes |
| ¡Arcoíris calentito! | Sweater arcoíris + una bufanda de lana + mitones o guantes de lana | Bufanda arcoíris |

Los combos están definidos en `src/game/data/combos.json`.
</details>

## Requisitos

- Node.js 20 o superior (probado con Node 24)
- Un navegador de escritorio (Chrome o Firefox)

## Instalar y jugar

```bash
npm install
npm run dev
```

Abre <http://localhost:8080>. Con `?fps=1` en la URL se muestra un contador de cuadros por segundo.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite (puerto 8080) |
| `npm run build` | Build estático en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run test` | Tests unitarios y de integración (Vitest) |
| `npm run test:watch` | Vitest en modo watch |
| `npm run coverage` | Tests con cobertura y umbrales (≥ 90 % en `domain/` y `data/`, ≥ 80 % en `plugins/` y `systems/`) |
| `npm run e2e` | Tests end-to-end con Playwright (levanta su propio servidor) |
| `npm run lint` | ESLint + `tsc --noEmit` |
| `npm run art` | Regenera los PNG desde los SVG de `art/` y los copia a `public/assets/` |

Para los e2e hace falta instalar los navegadores de Playwright una vez: `npx playwright install chromium` (y `firefox` para el subconjunto `@cross`).

## Estructura

```
art/              SVG fuente de gatos, prendas y UI (el arte es propio)
public/assets/    PNG y audio que carga el juego
src/game/
  scenes/         Boot, Preloader, Title, CatSelect, ShopEntrance, DressUp, Showcase
  objects/        Cat, prendas, guardarropa, cajita de regalo, efectos…
  plugins/        Servicios globales: audio, guardado, movimiento reducido
  systems/        Transiciones, sesión, descarga…
  domain/         Lógica pura sin Phaser (outfit, combos, drop, imán…)
  data/           cats.json, clothes.json, combos.json y su validación
tests/
  unit/           Lógica pura
  integration/    Objetos y escenas con Phaser mockeado
  e2e/            Playwright en el navegador
docs/             Diseño de juego, dirección de arte, roadmap y ADRs
```

Los gatos y las prendas se definen en JSON: para agregar un sweater no hace falta tocar código. Las decisiones de arquitectura están en `docs/adr/` y la dirección de arte en `docs/art-direction.md`.

## Créditos

- Arte: propio, en SVG.
- Sonidos: CC0 (Kenney, OpenGameArt) y efectos sintetizados. Detalle en `public/assets/audio/CREDITS.md`.
- Basado en la plantilla oficial [phaserjs/template-vite-ts](https://github.com/phaserjs/template-vite-ts) (licencia MIT, ver `LICENSE`).
