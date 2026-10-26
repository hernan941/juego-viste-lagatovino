// Pure TS, no Phaser (ADR 0010). Texts of the flow that depend on the player's choices.
/** The plaque of the Showcase: it reads the look (nothing on, or a very dressed cat, have their own line). */
export function showcaseTitle(name: string, wornCount?: number): string {
  if (wornCount === 0) return `¡Al natural, ${name}!`;
  if (wornCount !== undefined && wornCount >= 5) return `¡Qué look tan completo, ${name}!`;
  return `¡Qué lindo look, ${name}!`;
}
