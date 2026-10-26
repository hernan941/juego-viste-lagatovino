import { FontFaces } from '../constants';

/** Glyphs inside the `unicode-range` of the accents alias: without them the browser would not fetch it. */
export const ACCENT_SAMPLE = 'áéíóúñ¡¿';

/** CSS font shorthands that make the browser fetch each self-hosted face. */
export function fontSpecs(): string[] {
  return FontFaces.map((f) => `${f.weight} 16px "${f.family}"`);
}

/**
 * Resolves when every spec is loaded, or after `timeoutMs` (e.g. offline), whichever comes first.
 * Never rejects: a missing font must not block the game, it just falls back.
 */
export function loadFonts(fonts: FontFaceSet, timeoutMs: number, specs: string[] = fontSpecs()): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const loaded = Promise.all(specs.map((spec) => fonts.load(spec, ACCENT_SAMPLE).catch(() => []))).then(() => undefined);
  return Promise.race([loaded, timeout]).finally(() => clearTimeout(timer));
}
