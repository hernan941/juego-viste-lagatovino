// Pure TS. Texts of the keychain.
export const keychainLines = {
  ready: '¡Tu llavero está listo!',
  hang: 'Colgarlo',
  replaceTitle: (catName: string): string => `¿Cambio el llavero de ${catName}?`,
  replaceStars: (before: number, now: number): string => `Antes ${before} de 5 · Ahora ${now} de 5`,
  replaceYes: 'Cambiarlo',
  replaceNo: 'Dejar el anterior',
  /** The hanger page: a pencil line under an empty hook, and the line of the title. */
  hangerEmpty: 'Todavía no hay llavero',
  hangerHint: (catName: string): string => `Guarda una foto de ${catName} para colgar su llavero`,
  hangerStars: (stars: number): string => `${stars} de 5`,
};
