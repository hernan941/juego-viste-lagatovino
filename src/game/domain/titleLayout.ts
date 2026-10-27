// Pure TS. Where the buttons of the Title sit (game px), so that the glow of "Iniciar" never reaches "Mi álbum".
export const START_BUTTON = { y: 374, width: 300, height: 94 } as const;
/** The `sol` halo behind "Iniciar": a rounded rectangle that pulses up to this scale. */
export const START_HALO = { height: 112, maxScale: 1.12 } as const;
export const ALBUM_BUTTON = { y: 500, width: 330, height: 74 } as const;

/** Lowest point of the halo at the top of its pulse. */
export function haloBottom(): number {
  return START_BUTTON.y + (START_HALO.height / 2) * START_HALO.maxScale;
}

/** Free space between the pulsing halo and the top of the album button. */
export function haloToAlbumGap(): number {
  return ALBUM_BUTTON.y - ALBUM_BUTTON.height / 2 - haloBottom();
}
