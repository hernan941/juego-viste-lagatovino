# 0015. Alcance de la segunda etapa

- **Estado**: Aceptado
- **Fecha**: 2026-10-25
- **Reemplaza en parte**: la lista "Fuera del MVP" de `CLAUDE.md` y de `docs/game-design.md` (monedas, compra e inventario dejan de estar fuera). El resto del alcance del MVP sigue vigente.
- **Enmendado por**: ADR 0023 (de la integración web entra **solo** la página contenedora con la estética de Lagatovino en un subdominio; el despliegue y el DNS siguen siendo del usuario).

## Contexto
El MVP está terminado: se elige un gato, se entra a la tienda, se viste arrastrando y se admira el look. Falta un **para qué**: un motivo para volver a vestir. El `game-designer` propuso la segunda etapa en `docs/design/segunda-etapa.md` y el usuario la aprobó. Varias cosas que el MVP dejó "fuera" (monedas, compra, inventario) ahora entran, y otras se descartan de forma expresa para que no vuelvan como ideas sueltas.

## Decisión
**Entra al alcance** (fichas S0 a S8 del diseño):
1. **Contrato de datos y progreso** (S0): tipos, JSON de reglas y guardado v2 (ADR 0017).
2. **Calificación del estilo** (S1): un juez califica el look con 1 a 5 estrellas en la pasarela (Showcase). Nunca hay 0 estrellas.
3. **Gustos de cada gato** (S2): 2 tags que ama, 1 que detesta, 1 prenda favorita y 1 color favorito por gato, ocultos y descubribles.
4. **Botones y tienda en el probador** (S3): la moneda se llama **botones**. El probador **es** la tienda: probar es gratis y se compra tocando la etiqueta o en la caja al pulsar ¡Listo!. Solo se califica lo que es tuyo.
5. **Tintes** (S4): 10 frascos más el agua; se tiñe arrastrando (ADR 0018). En esta etapa solo se tiñen los 16 sweaters visibles.
6. **Álbum** (S5): escena nueva con prendas, gatos, looks especiales, tintes y colgador; porcentaje y sets.
7. **Modo foto** (S6): escena nueva con fondos, poses, marcos y stickers que se desbloquean con el álbum, no con botones.
8. **Estética Lagatovino** (S7): ADR 0016.
9. **El llavero** (S8): al guardar en el modo foto, el gato se transforma en llavero de porcelana; el colgador guarda una receta por gato (ADR 0021).

**Descartado expresamente**:
- **Pedidos de clientes** (encargos con requisitos externos). El objetivo viene del propio gato (sus gustos), no de un cliente. No se diseña ni se deja preparado.

**Fuera de esta etapa** (sigue fuera o queda para después):
- La **integración web con lagatovino.com** (enlaces, embebido, tienda real): la hace el usuario. El juego no depende de ella. *(Enmendado por ADR 0023: entra la página contenedora en un subdominio; el despliegue, el DNS, el embebido y la tienda real siguen fuera).*
- Caminar por un mapa, cuentas de usuario, backend y Supabase (ADR 0004 sigue con localStorage).
- Gatos llavero dibujados aparte (nice to have posterior de S8).
- Energía, tiempos de espera, regalos diarios, compras con dinero real y cualquier mecánica de FOMO.

**Personajes de la marca**: el **juez** (Kofi) y la **vendedora** (Catalina) están en consulta con el usuario. Se tratan como **personajes parametrizados por datos** (`data/brand.json`, ADR 0017): nombre, textura opcional y líneas de voz con marcadores (`{judge}`, `{seller}`). Si el usuario no da permiso, se cambia el JSON a "el gato supervisor" y "la vendedora" sin tocar código. Ningún texto de código menciona sus nombres.

**Plataforma**: sin cambios. **PC primero** y **celular horizontal jugable** (ADRs 0008 y 0014). Todo lo nuevo se usa con el Pointer de Phaser, tiene estado de press, no depende del hover y respeta los objetivos de ~80 unidades del juego. Se mantiene "solo arrastrar" para equipar prendas, teñir y pegar stickers; comprar es un toque sobre la etiqueta (no equipa nada, así que no contradice el ADR 0008).

**Principios que se mantienen**: diversión > funcionalidad, nada aparece de golpe, movimiento reducido (ADR 0013), solo efectos de sonido (ADR 0009) y TDD (ADR 0012).

## Alternativas consideradas
- **Tienda como escena aparte**: obliga a salir del probador para comprar y separa el deseo (probar) de la compra. El diseño la descarta: el probador es la tienda.
- **Pedidos de clientes como fuente de objetivos**: convierte el juego en trabajo y no aporta ternura. Se descartan.
- **Monedas sin calificación** (pagar por tiempo jugado o por cada look): no enseña nada del gato y empuja al grind.
- **Dejar la integración web dentro del alcance**: depende de decisiones y accesos del usuario sobre su sitio.

## Consecuencias
- El juego gana un loop corto (vestir → calificar → botones → comprar), uno mediano (gustos, récords, álbum) y uno largo (colgador dorado con 12 llaveros).
- `CLAUDE.md` y `docs/game-design.md` actualizan su "Fuera del MVP". El `planner` arma el roadmap de la etapa en `docs/roadmap.md`.
- La Definition of Done no cambia; la suite e2e del ADR 0012 suma los specs de la etapa (ver ADRs 0017 a 0021).
- DressUp concentra cambios de S2, S3 y S4: el riesgo de conflictos se maneja con controladores en `objects/` y el orden de integración del diseño (§7).
- Riesgo de alcance: la etapa es grande. El orden de prioridad (S0 → S1 + S2 + S3 → S4, S5, S6 → S8) permite cortar por el final sin perder el loop.
