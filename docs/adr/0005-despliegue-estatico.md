# 0005. Despliegue estático

- **Estado**: Aceptado
- **Fecha**: 2026-10-20

## Contexto
El juego corre entero en el navegador. Se quiere compartir con un link y sin servidores que mantener.

## Decisión
`npm run build` (Vite) genera `dist/`, que se publica en **Vercel o Netlify** como sitio estático, con preview deploys por rama. Los assets van en `public/assets/` con nombres estables y el cache lo maneja el hosting.

## Alternativas consideradas
- Un VPS propio: innecesario para contenido estático.
- itch.io: válido como canal extra de distribución, no excluyente.

## Consecuencias
- Es gratis o muy barato, y no tiene backend que mantener.
- Cuando llegue Supabase (ADR 0004), las claves públicas (anon key) van en variables `VITE_*`. Nunca se usa una service key en el cliente.
