# Architecture Decision Records

Aquí se registran las decisiones de arquitectura del proyecto (formato Nygard). Cada ADR es inmutable una vez aceptado: para cambiar una decisión se escribe un ADR nuevo que **reemplaza** al anterior.

## Índice
| # | Título | Estado |
|---|---|---|
| [0001](0001-registrar-decisiones-con-adrs.md) | Registrar decisiones con ADRs | Aceptado |
| [0002](0002-engine-phaser-typescript-vite.md) | Engine: Phaser 3 + TypeScript + Vite | Aceptado (versión reemplazada por 0011) |
| [0003](0003-sistema-de-capas-para-vestir.md) | Sistema de capas para vestir | Aceptado |
| [0004](0004-persistencia.md) | Persistencia: localStorage → Supabase | Propuesto |
| [0005](0005-despliegue-estatico.md) | Despliegue estático | Aceptado |
| [0006](0006-arte-vectorial-propio-en-svg.md) | Arte vectorial propio en SVG | Aceptado |
| [0007](0007-flujo-de-escenas-y-transiciones.md) | Flujo de escenas y transiciones | Aceptado |
| [0008](0008-plataforma-pc-y-solo-arrastrar.md) | Plataforma PC e interacción solo arrastrando | Aceptado |
| [0009](0009-audio-solo-sfx-asmr.md) | Audio: solo efectos de sonido ASMR, sin música | Aceptado |
| [0010](0010-arquitectura-estructura-oficial-de-phaser.md) | Arquitectura: estructura oficial de Phaser | Aceptado |
| [0011](0011-phaser-4.md) | Usar Phaser 4 en vez de Phaser 3 | Aceptado |
| [0012](0012-desarrollo-guiado-por-tests-tdd.md) | Desarrollo guiado por tests (TDD) | Aceptado |

## Estados
`Propuesto` → `Aceptado` → (`Obsoleto` | `Reemplazado por NNNN`)

## Plantilla
Archivo: `NNNN-titulo-en-kebab-case.md`

```markdown
# NNNN. Título

- **Estado**: Propuesto | Aceptado | Obsoleto | Reemplazado por NNNN
- **Fecha**: AAAA-MM-DD

## Contexto
¿Qué problema o fuerza motiva la decisión?

## Decisión
Qué decidimos, en voz activa ("Usaremos…").

## Alternativas consideradas
- Opción A: por qué no.

## Consecuencias
Qué se vuelve más fácil, qué se vuelve más difícil y qué riesgos quedan.
```
