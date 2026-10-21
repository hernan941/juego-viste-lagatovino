# 0003. Sistema de capas para vestir

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
Hay muchos gatos y muchas prendas. Si cada gato tuviera una pose distinta, cada prenda debería dibujarse N veces. Además, las prendas deben apilarse en el orden correcto (un sweater debajo de una bufanda, un gorro sobre las orejas).

## Decisión
- **Pose base común**: todos los gatos se dibujan en el **mismo lienzo** (mismo tamaño y origen) y con la **misma pose**. Las variantes temáticas (cuernos, alas) son capas propias del gato.
- **Slots** con un `zIndex` fijo por slot, por ejemplo: `body` (gato) < `bottom` < `sweater` < `neck` < `head` < `face` < `accessory`. Cada slot tiene **un solo** ítem a la vez: poner otro reemplaza al anterior.
- **Data-driven**: `src/data/cats.json` y `src/data/clothes.json` definen `id`, `name`, `slot`, `texture`, `offset` opcional, `tags` y `variantsByCat` opcional para excepciones.
- **Dominio puro**: `src/domain/outfit.ts` (sin Phaser) maneja `equip`, `unequip` y `getLayers`, y se testea con Vitest. La escena solo renderiza lo que devuelve el dominio.
- Cuando haya muchas piezas se usan **texture atlas** (TexturePacker o free-tex-packer).

## Alternativas consideradas
- Una pose por gato con prendas específicas: no escala.
- Esqueleto o rig (Spine): demasiado para el MVP.

## Consecuencias
- Agregar un sweater es agregar un PNG y una entrada en el JSON.
- Restringe al artista: todos los gatos deben respetar la plantilla de pose. Hay que entregarle una guía con el lienzo y las anclas.
- Los gatos con formas muy distintas (dragón grande) necesitan `offset` o `variantsByCat`.
