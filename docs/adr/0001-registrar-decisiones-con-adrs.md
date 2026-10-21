# 0001. Registrar decisiones con ADRs

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
El desarrollo lo harán varios agentes (coordinator, architect, phaser-code-writer, game-designer) en sesiones distintas. Sin un registro escrito, las decisiones se olvidan o se contradicen entre sesiones.

## Decisión
Registraremos toda decisión de arquitectura en `docs/adr/` con formato Nygard (Contexto, Decisión, Alternativas, Consecuencias, Estado). El agente `architect` los redacta y el usuario los aprueba. Los agentes leen los ADRs relevantes antes de actuar.

## Alternativas consideradas
- Solo CLAUDE.md: mezcla reglas con historia y no explica el porqué.
- Nada escrito: inviable con varios agentes.

## Consecuencias
- Hay trazabilidad del porqué de cada decisión.
- Tiene un pequeño costo de escritura por decisión.
- CLAUDE.md queda corto y apunta a los ADRs.
