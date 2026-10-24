// Pure TS, no Phaser (ADR 0010). The cat's name: validation and the keys of the in-game input.
export const NAME_MAX = 12;

export type NameCheck = { ok: true; name: string } | { ok: false; reason: 'empty' | 'too-long' };

/** Characters allowed in a name: letters (any language), digits, spaces and a few soft symbols. */
const ALLOWED = /^[\p{L}\p{N}\p{M}\p{Extended_Pictographic} '’.!_-]$/u;

const length = (s: string) => [...s].length;

/** 1 to 12 characters once trimmed (inner runs of spaces become one space). */
export function validateCatName(raw: string): NameCheck {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name === '') return { ok: false, reason: 'empty' };
  if (length(name) > NAME_MAX) return { ok: false, reason: 'too-long' };
  return { ok: true, name };
}

/**
 * The name after a key press (`KeyboardEvent.key`): text is appended, Backspace deletes, the rest is ignored.
 * With `replacing` (the default name acts as selected text) the first printable key replaces it
 * and Backspace clears it all.
 */
export function applyNameKey(current: string, key: string, { replacing = false }: { replacing?: boolean } = {}): string {
  if (replacing) {
    if (key === 'Backspace') return '';
    if (length(key) !== 1 || !ALLOWED.test(key) || key === ' ') return current;
    return key;
  }
  if (key === 'Backspace') return [...current].slice(0, -1).join('');
  if (length(key) !== 1 || !ALLOWED.test(key)) return current;
  if (length(current) >= NAME_MAX) return current;
  if (key === ' ' && (current === '' || current.endsWith(' '))) return current;
  return current + key;
}

/** When the player picks another cat, the name follows the default of the cat unless they typed their own. */
export function nameOnSelect(current: string, previousDefault: string | null, newDefault: string): string {
  return current === '' || current === previousDefault ? newDefault : current;
}

/** The name for text that arrived whole (a virtual keyboard, a paste): the same rules as typing it key by key. */
export function sanitizeName(raw: string): string {
  return [...raw].reduce((name, ch) => applyNameKey(name, ch), '');
}
