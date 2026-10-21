# Game Design: Viste Lagato (MVP)

> **Diversión > funcionalidad.** Si hay que elegir, gana lo que hace sonreír.

## Fantasía
"Llevo a MI gato a una boutique tierna y lo dejo adorable con el sweater que le elegí."

## Pilares de diversión
1. **Ternura inmediata**: el gato está vivo (respira, parpadea, mueve la cola) y reacciona a cada prenda.
2. **Expresión**: muchas prendas (unas 44, con los sweaters como protagonistas) y combinaciones que dan ganas de probar todas.
3. **Feedback jugoso**: cada toque y cada arrastre tienen una animación y un sonido. Nunca hay un clic mudo.
4. **Sorpresa y colección**: combinaciones especiales con reacciones únicas y la sensación de "¿qué más hay?".
5. **Cero fricción**: se entiende sin tutorial y se juega con el mouse, arrastrando.

## Loop del MVP
```
Iniciar → Elegir gato → Entrar a la tienda → Vestir arrastrando (probar → reacción → ajustar) → Admirar el look → otro look / otro gato
```

## Pantallas (ver ADR 0007)
- **Portada**: logo animado, gatitos que se asoman y botón "Iniciar".
- **Elegir gato**: galería de 12 gatos comunes (`docs/art-direction.md` §2). Al hacer clic en uno, salta, dice miau y aparece el botón "¡Este!".
- **Entrar a la tienda**: el gato camina hasta la boutique, suena la campanita, se abre la puerta y la cámara hace zoom hacia dentro. Se puede saltar con un toque.
- **Vestir (probador)**:
  - El gato está grande sobre una alfombra, frente al espejo.
  - Arriba hay pestañas de categorías, con Sweaters primero, y debajo un grid de prendas.
  - Las prendas se **arrastran**:
    - Al tomar una prenda, se agranda y se inclina un poco.
    - Mientras se arrastra sobre el gato, el gato mira la prenda y sus ojos brillan.
    - Al soltarla, el gato hace squash y stretch, salen corazones y suena un miau.
    - Si se suelta fuera del gato, la prenda vuelve a su celda con un rebote.
  - En el panel de capas, la ✕ quita una prenda y el gato se sacude.
- **Admirar**: el gato posa con brillitos y un "¡Qué guapo!". Se puede volver a vestir o cambiar de gato.

## Decisiones confirmadas por el usuario
- Las prendas se ponen **arrastrando** (drag & drop).
- El MVP tiene **más que sweaters**: 6 categorías y muchas opciones (`docs/art-direction.md` §5).
- **Gatos comunes**, nada de gatos temáticos. El arte lo creamos nosotros con una estética única (ADR 0006).
- Habrá **Phaser**, animaciones e interactividad al máximo.
- Flujo con inicio y entrada a la tienda, con transiciones suaves.

- Se juega en **PC**, en horizontal (1280 × 720) y con mouse (ADR 0008).
- **Arrastrar solamente**: no hay doble clic ni clic para equipar.
- **Sin música**. Hay **efectos de sonido ASMR satisfactorios** en cada acción y maullidos si se consiguen con licencia libre (ADR 0009).
- El jugador **le pone nombre a su gato**.
- Hay un **botón para descargar la foto** del look.
- Hay **al menos 9 gatos** distintos; el objetivo son 12.
- Nombre del juego: **Viste Lagato**.
- Idioma: español.

## Economía: todo gratis + "Regalitos de la tienda"
Decisión tomada con libertad otorgada por el usuario. El `game-designer` la valida en la feature F8 del roadmap y puede descartarla.

- **No hay monedas en el MVP**: el 100 % del catálogo base es gratis desde el principio. Así se evita la fricción y el jugador se divierte desde el segundo uno.
- **Capa de sorpresa sin dinero**:
  - Hay unas **6 prendas secretas** que no aparecen en el grid.
  - Se desbloquean con **combinaciones especiales**, por ejemplo: sweater navideño + gorro de pompón + bufanda → "¡Look Navidad!".
  - Al lograr una combinación, la vendedora de la tienda entrega una **cajita de regalo** que el jugador abre arrastrando el moño (con un sonido ASMR de papel).
  - Un contador "Secretos: 2/6" invita a seguir experimentando.
- Si el `game-designer` la descarta, queda solo la reacción especial del gato a las combinaciones, sin desbloqueos.

## Fuera del MVP (ideas guardadas)
Monedas y compra, caminar por la ciudad, minijuegos para ganar monedas, cuentas, logros, compartir en redes.
