import { describe, expect, it } from 'vitest';
import { NAME_MAX, applyNameKey, sanitizeName, nameOnSelect, validateCatName } from '../../src/game/domain/catName';

describe('validateCatName', () => {
  it('trims the spaces around the name', () => {
    expect(validateCatName('  Miau  ')).toEqual({ ok: true, name: 'Miau' });
  });

  it('collapses repeated inner spaces', () => {
    expect(validateCatName('Doña   Gata')).toEqual({ ok: true, name: 'Doña Gata' });
  });

  it('rejects an empty name or one with only spaces', () => {
    expect(validateCatName('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateCatName('     ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('accepts 1 and 12 characters and rejects 13', () => {
    expect(validateCatName('A').ok).toBe(true);
    expect(validateCatName('a'.repeat(NAME_MAX)).ok).toBe(true);
    expect(validateCatName('a'.repeat(NAME_MAX + 1))).toEqual({ ok: false, reason: 'too-long' });
  });

  it('counts characters, not UTF-16 units', () => {
    expect(validateCatName('🐱'.repeat(NAME_MAX)).ok).toBe(true);
  });
});

describe('applyNameKey', () => {
  it('appends letters, digits and accents', () => {
    expect(applyNameKey('Mi', 'a')).toBe('Mia');
    expect(applyNameKey('Mi', 'ñ')).toBe('Miñ');
    expect(applyNameKey('Mi', '3')).toBe('Mi3');
  });

  it('Backspace removes the last character, and does nothing on an empty name', () => {
    expect(applyNameKey('Mia', 'Backspace')).toBe('Mi');
    expect(applyNameKey('', 'Backspace')).toBe('');
  });

  it('ignores keys that are not text (Shift, Enter, arrows, F5) and symbols that do not belong in a name', () => {
    for (const k of ['Shift', 'Enter', 'ArrowLeft', 'F5', 'Tab', '<', '>', '/']) expect(applyNameKey('Mi', k)).toBe('Mi');
  });

  it('stops at the maximum length', () => {
    const full = 'a'.repeat(NAME_MAX);
    expect(applyNameKey(full, 'b')).toBe(full);
    expect(applyNameKey(full, 'Backspace')).toBe(full.slice(0, -1));
  });

  it('does not start with a space and does not double it', () => {
    expect(applyNameKey('', ' ')).toBe('');
    expect(applyNameKey('Mi ', ' ')).toBe('Mi ');
    expect(applyNameKey('Mi', ' ')).toBe('Mi ');
  });
});

describe('nameOnSelect', () => {
  it('writes the default name of the new cat when the player has not typed their own', () => {
    expect(nameOnSelect('', null, 'Luna')).toBe('Luna');
    expect(nameOnSelect('Naranjito', 'Naranjito', 'Luna')).toBe('Luna');
  });

  it('keeps a name that the player typed', () => {
    expect(nameOnSelect('Bigotes', 'Naranjito', 'Luna')).toBe('Bigotes');
  });
});

describe('applyNameKey while the default name is selected (replacing)', () => {
  const sel = { replacing: true };

  it('the first printable key replaces the whole default name', () => {
    expect(applyNameKey('Tricolor', 'B', sel)).toBe('B');
    expect(applyNameKey('Tricolor', 'ñ', sel)).toBe('ñ');
  });

  it('Backspace clears the whole default name', () => {
    expect(applyNameKey('Tricolor', 'Backspace', sel)).toBe('');
  });

  it('keys that are not text leave the default name alone', () => {
    for (const k of ['Shift', 'Enter', 'ArrowLeft', '<', ' ']) expect(applyNameKey('Tricolor', k, sel)).toBe('Tricolor');
  });

  it('without replacing, typing still appends', () => {
    expect(applyNameKey('Tricolor', 'B', { replacing: false })).toBe('TricolorB');
  });
});

describe('sanitizeName (what a virtual keyboard typed or pasted)', () => {
  it('keeps what the name field would accept key by key', () => {
    expect(sanitizeName('Mochi')).toBe('Mochi');
    expect(sanitizeName('Ana María')).toBe('Ana María');
  });

  it('drops characters the field refuses', () => {
    expect(sanitizeName('Mo<chi>/#')).toBe('Mochi');
  });

  it('cuts at the maximum length', () => {
    expect(sanitizeName('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijkl');
  });

  it('does not start with a space nor repeat spaces', () => {
    expect(sanitizeName('  Mo   chi')).toBe('Mo chi');
  });

  it('is empty for an empty field', () => {
    expect(sanitizeName('')).toBe('');
  });
});
