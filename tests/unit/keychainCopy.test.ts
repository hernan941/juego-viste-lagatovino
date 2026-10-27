import { describe, expect, it } from 'vitest';
import { keychainLines } from '../../src/game/domain/copy';
import { SceneKeys } from '../../src/game/constants';
import { hangArgs } from '../../src/game/domain/flow';

describe('keychain copy (F19.4, F19.5)', () => {
  it('says the keychain is ready and offers both ways out', () => {
    expect(keychainLines.ready).toBe('¡Tu llavero está listo!');
    expect(keychainLines.hang).toBe('Colgarlo');
  });

  it('asks before replacing a keychain, naming the cat and both ratings', () => {
    expect(keychainLines.replaceTitle('Luna')).toBe('¿Cambio el llavero de Luna?');
    expect(keychainLines.replaceStars(3, 5)).toBe('Antes 3 de 5 · Ahora 5 de 5');
    expect(keychainLines.replaceYes).toBe('Cambiarlo');
    expect(keychainLines.replaceNo).toBe('Dejar el anterior');
  });

  it('has the lines of the hanger page', () => {
    expect(keychainLines.hangerHint('Luna')).toContain('Luna');
    expect(keychainLines.hangerEmpty).toBeTruthy();
  });
});

describe('hangArgs without a hung keychain', () => {
  it('keeps the tab and the way back but names no cat to fly (the old keychain stayed)', () => {
    expect(hangArgs('gato-03', false)).toEqual({ from: SceneKeys.DressUp, tab: 'colgador' });
    expect(hangArgs('gato-03')).toEqual({ from: SceneKeys.DressUp, tab: 'colgador', hang: 'gato-03' });
  });
});
