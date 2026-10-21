import { describe, expect, it } from 'vitest';
import { Cooldown } from '../../src/game/domain/cooldown';

describe('Cooldown (a reaction that must not repeat too fast)', () => {
  it('lets the first call through and blocks the next ones until the time passes', () => {
    const c = new Cooldown(400);
    expect(c.try(1000)).toBe(true);
    expect(c.try(1200)).toBe(false);
    expect(c.try(1399)).toBe(false);
    expect(c.try(1400)).toBe(true);
    expect(c.try(1500)).toBe(false);
  });

  it('a blocked call does not extend the wait', () => {
    const c = new Cooldown(400);
    c.try(0);
    c.try(300);
    expect(c.try(400)).toBe(true);
  });

  it('works from time 0 and after reset', () => {
    const c = new Cooldown(100);
    expect(c.try(0)).toBe(true);
    expect(c.try(50)).toBe(false);
    c.reset();
    expect(c.try(51)).toBe(true);
  });

  it('ready() peeks without using it up', () => {
    const c = new Cooldown(100);
    expect(c.ready(0)).toBe(true);
    expect(c.ready(0)).toBe(true);
    c.try(0);
    expect(c.ready(50)).toBe(false);
    expect(c.ready(100)).toBe(true);
  });
});
