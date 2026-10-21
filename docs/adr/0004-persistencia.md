# 0004. Persistencia: localStorage en el MVP, Supabase después

- **Estado**: Propuesto
- **Fecha**: 2026-10-20

## Contexto
El usuario quiere guardar el juego en una base de datos. El MVP solo necesita recordar el gato elegido y el outfit. La tienda, las monedas y el inventario vendrán después y necesitarán un backend y probablemente cuentas.

## Decisión
- Definiremos una interfaz `SaveService` (`load()`, `save(state)`) en `src/services/`.
- **MVP**: la implementación usa `localStorage`, envuelta en try/catch, con una clave versionada (`viste-lagato:save:v1`) y una migración simple por versión.
- **Futuro**: la implementación usará **Supabase** (Postgres + Auth), con tablas `players`, `inventory` y `outfits`, y el catálogo opcionalmente en la BD.

## Alternativas consideradas
- Supabase desde el inicio: agrega auth, red y configuración sin un beneficio claro en el MVP.
- Firebase: válido, pero Postgres encaja mejor con un inventario relacional.
- Un backend propio con Node: más mantenimiento.

## Consecuencias
- El MVP funciona offline y sin infraestructura.
- El cambio a Supabase queda aislado tras la interfaz.
- El progreso del MVP es por navegador y no se sincroniza entre dispositivos.
- Pasará a "Aceptado" cuando el usuario confirme.
