// Pure TS, no Phaser (ADR 0010). Texts of the flow that depend on the player's choices.
export function showcaseTitle(name: string): string {
  return `¡Qué lindo look, ${name}!`;
}
