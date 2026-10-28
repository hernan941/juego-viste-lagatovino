# Viste Lagato

Juego 2D para navegador de vestir gatos, chibi, con la estética de la marca Lagatovino (ADR 0016).

## Regla de oro del usuario
**No construir nada sin que el usuario lo pida explícitamente.** Ni scaffolding, ni código, ni dependencias, ni `git init`. Si una tarea implica crear o modificar código, primero se propone y se espera un "sí".

## Regla: commits sin coautor
Los mensajes de commit **nunca** llevan líneas `Co-Authored-By` ni ninguna otra atribución (tampoco "Generated with Claude Code"). Solo el mensaje del cambio. Esto aplica a todos los agentes.

## Regla: sesión principal libre
La sesión principal (con la que habla el usuario) **siempre queda libre** para que el usuario pueda preguntar "¿cómo vas?" en cualquier momento.
- La sesión principal **no ejecuta trabajo largo**: ni código, ni arte, ni investigación, ni ediciones de varios archivos.
- Lanza **agentes en segundo plano** (los de `.claude/agents/` o un fork), cada uno con un **encargo autocontenido**: qué hacer, qué archivos y ADRs aplican, criterio de aceptación y qué devolver.
- Mientras tanto responde al usuario. Informa el estado **solo a partir de notificaciones reales** de los agentes, sin inventar ni adelantar avances. Si algo sigue corriendo, dice que sigue corriendo.
- Los subagentes no pueden lanzar otros subagentes, así que **la sesión principal cumple el rol de `coordinator`** y despacha directamente a `planner`, `architect`, `phaser-code-writer` y `game-designer`.
- Si se paralelizan agentes que tocan los mismos archivos de código, cada uno trabaja con `isolation: worktree`, y la sesión principal integra los cambios.

## Principio rector: diversión > funcionalidad
El objetivo es **divertirse**. Ante cualquier duda gana lo que hace el juego más divertido, tierno y vivo: animaciones, reacciones, sonido e interactividad. Nada aparece de golpe y ningún toque queda sin respuesta. "Funciona" no basta para dar algo por terminado: también tiene que sentirse bien.

## Visión
- **MVP**: jugable y con transiciones suaves. Iniciar → elegir tu gato → entrar a la tienda → vestirlo arrastrando muchas prendas (los sweaters son el protagonista) → admirar el look.
- **Segunda etapa** (ADR 0015, diseño en `docs/design/segunda-etapa.md`): darle un "para qué" al vestir. El juez califica el look según los gustos del gato y paga **botones**, con los que se compran prendas y tintes en el mismo probador; el álbum muestra lo que falta; el modo foto permite presumir, y al guardar el gato se transforma en un **llavero** de porcelana para el colgador.
- **Futuro**: caminar por un mapa y guardar el progreso en una base de datos.

Referencias visuales:
- **Marca Lagatovino** (lagatovino.com): estilo "cuaderno de Catalina", con papel, tinta, washi tape, polaroids y llaveros de porcelana (ADR 0016).
- `gatos.jpeg` (raíz del repo): **solo las proporciones** chibi y cabezonas. La cara `:3` y las mejillas ya no se usan. **No** se usan gatos temáticos: solo gatos comunes.
- `ejemplo de juego.jpeg` (raíz del repo): layout de vestir. Pestañas de categorías arriba, grid de prendas, personaje grande, drag & drop y panel de capas con ✕. Su paleta rosa pastel ya no aplica.

**La estética está definida en `docs/art-direction.md` y es obligatoria** para todo asset y toda UI. El arte lo creamos nosotros en SVG (ADR 0006).

## Alcance del MVP
Flujo de escenas: ADR 0007.
1. **Title**: portada animada con el botón "Iniciar".
2. **CatSelect**: galería de 12 gatos comunes (mínimo 9), con un nombre que pone el jugador.
3. **ShopEntrance**: el gato camina y entra a la boutique (campanita, puerta, zoom).
4. **DressUp** (el core): probador dentro de la tienda. Se **arrastran** las prendas sobre el gato. Hay unas 44 prendas en 6 categorías, con los sweaters como protagonistas, y un panel de capas para quitar prendas.
5. **Showcase**: el gato posa con su look y se puede descargar la foto.
6. Persistencia local del gato elegido y del outfit (ADR 0004).

## Alcance de la segunda etapa (ADR 0015)
Aprobada por el usuario. Detalle en `docs/design/segunda-etapa.md`.
1. **Datos y guardado v2**: reglas de juego en JSON validadas y migración del save v1 (ADR 0017).
2. **Calificación del estilo**: el juez califica en la pasarela (Showcase) con 1 a 5 estrellas y paga botones.
3. **Gustos de cada gato**: lo que ama, lo que detesta, su prenda y su color favoritos, que se descubren jugando.
4. **Botones y tienda en el probador**: probar es gratis; se compra tocando la etiqueta o en la caja al pulsar ¡Listo!.
5. **Tintes**: arrastrar un frasco sobre la prenda (ADR 0018).
6. **Álbum** y **modo foto**: escenas nuevas (ADR 0019).
7. **Estética Lagatovino**: ADR 0016 y `docs/art-direction.md` v2.
8. **El llavero**: al guardar en el modo foto, el gato se transforma en llavero y se cuelga en el colgador (ADR 0021).

La plataforma no cambia: PC primero y celular horizontal jugable. El juez y la vendedora son personajes parametrizados en datos (`data/brand.json`).

**Descartado**: pedidos de clientes.
**Fuera de alcance**: integración web con lagatovino.com, salvo la página contenedora en un subdominio (ADR 0023); el despliegue y el DNS los hace el usuario. También caminar por un mapa, cuentas de usuario, backend.

Las preguntas abiertas y los supuestos por defecto están en `docs/game-design.md`.

## Stack (ver `docs/adr/`)
- **Phaser 4 + TypeScript (strict) + Vite** (ADRs 0002 y 0011), partiendo de la plantilla oficial (ADR 0010). Guías oficiales en `node_modules/phaser/skills/`
- **TDD** con Vitest (unit e integración, cobertura v8) y Playwright (e2e) (ADR 0012)
- **localStorage** en el MVP y Supabase en el futuro (ADR 0004), con el guardado v2 de la segunda etapa (ADR 0017)
- **Segunda etapa**: alcance (ADR 0015), estética Lagatovino (0016), teñido de SVG (0018), flujo de escenas v2 (0019) y llavero (0021)
- **Hosting estático** en Vercel o Netlify (ADR 0005), **después del MVP**. El MVP se entrega en localhost.

## Estructura (ADR 0010)
Es la plantilla oficial de Phaser ([`phaserjs/template-vite-ts`](https://github.com/phaserjs/template-vite-ts)) extendida con capas propias:
```
index.html                 # página que contiene el juego (plantilla)
public/style.css           # estilos de layout (plantilla)
public/assets/             # cats/ clothes/ ui/ bg/ audio/ (+ CREDITS.md)
vite/config.dev.mjs        # Vite dev / build (plantilla)
vite/config.prod.mjs
art/                       # SVG fuente (ADR 0006): cats/ (partes + pelajes), clothes/, ui/, bg/
src/
  main.ts                  # bootstrap (plantilla)
  game/
    main.ts                # GameConfig, lista de escenas y plugins globales
    constants.ts           # SceneKeys, TextureKeys, AudioKeys, Events, RegistryKeys, tokens de paleta
    EventBus.ts            # EventEmitter compartido (solo eventos de juego entre escenas)
    scenes/                # Boot, Preloader, Title, CatSelect, ShopEntrance, DressUp, Showcase, Album, PhotoMode (ADR 0019)
    objects/               # Containers propios: Cat, ClothingItem, Button, Tabs, ItemGrid, LayersPanel
    plugins/               # Global Plugins: AudioPlugin, SavePlugin, MotionPlugin, DyePlugin (ADR 0018)
    systems/               # transitions.ts (fundido, iris)
    domain/                # TS puro sin Phaser: types, outfit, combos → Vitest
    data/                  # cats.json, clothes.json, combos.json, economy.json, dyes.json, sets.json, photo.json, brand.json + schema.ts (ADR 0017)
tests/
  unit/                    # domain, schema, lógica pura de plugins y systems (TDD)
  integration/             # escenas y objetos con Phaser HEADLESS o mocks
  e2e/                     # Playwright: flujo completo en el navegador
docs/                      # adr/, game-design.md, art-direction.md, roadmap.md
```
**Reglas de dependencia**:
- `domain/` no importa Phaser;
- `scenes/` orquestan;
- `objects/` renderizan y animan;
- `plugins/` dan servicios entre escenas;
- `data/` se valida al cargar.

## Convenciones
- **TypeScript strict**. Nada de `any` sin justificarlo en un comentario.
- **TDD** (ADR 0012): rojo → verde → refactor. No se escribe código de producción sin un test que falle antes. La lógica se extrae a TS puro sin Phaser (núcleo funcional, capa imperativa delgada). Cada bug empieza con un test que lo reproduce. Prohibido usar `.skip`, `.only` o borrar tests para pasar.
- **Escenas de Phaser** (patrones oficiales, ADR 0010):
  - una responsabilidad por escena;
  - el estado se reinicia en `init(data)`;
  - los assets se cargan en `Preloader`;
  - los listeners, timers y tweens se limpian en `this.events.once('shutdown', …)`;
  - el estado compartido va en `this.registry`, los parámetros con `scene.start(key, data)` y los servicios en Global Plugins. No hay variables globales sueltas;
  - todas las claves (escenas, texturas, sonidos, eventos, registry) viven en `constants.ts`.
- **Data-driven**: los gatos y las prendas se definen en JSON (`id`, `name`, `slot`, `texture`, `zIndex`, `tags`…). Para agregar un sweater no hace falta tocar código.
- **Separar dominio y render**: `src/game/domain/` no importa Phaser.
- **Assets**: PNG con fondo transparente. Todos los gatos comparten la **misma pose base y lienzo**, con anclas comunes por slot (cabeza, torso, cuello…), para que una prenda sirva para cualquier gato (ADR 0003). Se usan texture atlas cuando haya muchas piezas.
- **PC primero, celular soportado** (ADRs 0008 y 0014): lienzo base de 1280 × 720 horizontal, `Phaser.Scale.FIT`, interacción con mouse, estados de hover en todo lo interactivo y cursor de mano. Las prendas se ponen **solo arrastrando**. En el celular se juega en horizontal (en vertical aparece el aviso "gira el teléfono"). Se usa el Pointer de Phaser, nada depende solo del hover (siempre hay feedback de press) y los objetivos táctiles miden unos 44 px CSS como mínimo.
- **Nombres**: código en inglés; textos de UI y documentación en español.

## Comandos previstos
```
npm install
npm run dev        # Vite dev server
npm run build      # build estático a dist/
npm run preview
npm run test       # Vitest (unit + integración)
npm run test:watch # Vitest en modo watch (ciclo TDD)
npm run coverage   # Vitest + coverage-v8 con umbrales (ADR 0012)
npm run e2e        # Playwright: flujo completo
npm run lint       # ESLint + typecheck (tsc --noEmit)
```

## Definition of Done
- [ ] Hecho a pedido explícito del usuario y dentro del alcance del MVP
- [ ] `npm run build`, `npm run lint` y `npm run test` pasan
- [ ] La lógica nueva se escribió con **TDD** (test que falla antes del código, ADR 0012)
- [ ] `npm run coverage` cumple los umbrales (≥ 90 % en `domain/`, ≥ 80 % en `plugins/` y `systems/`)
- [ ] `npm run e2e` pasa con el flujo completo (una vez que existe, desde F5)
- [ ] **Cierre del proyecto**: la **suite e2e completa** del ADR 0012 está en verde (todas las mecánicas, todos los secretos, persistencia y cero errores de consola), usando el hook `window.__VISTE__` en modo test
- [ ] Probado en el navegador de PC (Chrome y Firefox) en 1280 × 720 y en 1920 × 1080, y en celular horizontal (táctil, ADR 0014)
- [ ] Es **divertido**: feedback visual y sonoro en cada interacción y transiciones suaves (revisado y aprobado por `game-designer`)
- [ ] Los assets cumplen el checklist de `docs/art-direction.md`
- [ ] Sin listeners ni timers colgados al cambiar de escena
- [ ] Toda decisión de arquitectura nueva tiene su ADR

## Flujo de trabajo con agentes (`.claude/agents/`)
- **coordinator**: es el rol de la sesión principal. Divide el trabajo, delega **en segundo plano**, cuida el alcance y la DoD, y pregunta al usuario antes de construir.
- **architect**: estructura, escenas, modelo de datos, pipeline de assets. Escribe y revisa los ADRs; no implementa features.
- **planner**: mantiene `docs/roadmap.md`. Ordena las features (primero la diversión), define criterios de aceptación y desglosa cada feature en tareas.
- **phaser-code-writer** (modelo Sonnet): implementa en Phaser 4 + TS siguiendo los ADRs.
- **game-designer**: hace que el juego sea divertido (game feel, juice, reacciones, colección) sin inflar el alcance.

Flujo típico (cada flecha después de la sesión principal es un agente **en segundo plano**): usuario → sesión principal (coordinator) → planner (desglose de la feature en `docs/roadmap.md`) → architect si hay una decisión nueva → phaser-code-writer → game-designer revisa → sesión principal verifica la DoD → usuario. Durante todo el proceso, la sesión principal sigue libre para responder.

## ADRs
**Toda decisión de arquitectura se registra como ADR** en `docs/adr/` (plantilla en `docs/adr/README.md`). No se contradice un ADR aceptado sin escribir otro que lo reemplace.
