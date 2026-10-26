// F19.2: the queue that builds the keychain thumbnails one per frame (ADR 0021: 12 in one frame is forbidden).
import { describe, expect, it } from 'vitest';
import { FrameQueue } from '../../src/game/systems/frameQueue';

describe('FrameQueue', () => {
  it('runs one job per tick, in order', () => {
    const q = new FrameQueue();
    const ran: number[] = [];
    for (const n of [1, 2, 3]) q.add(() => ran.push(n));
    expect(ran).toEqual([]);
    q.tick();
    expect(ran).toEqual([1]);
    q.tick();
    q.tick();
    expect(ran).toEqual([1, 2, 3]);
    q.tick();
    expect(ran).toEqual([1, 2, 3]);
  });

  it('reports how many are waiting', () => {
    const q = new FrameQueue();
    q.add(() => undefined);
    q.add(() => undefined);
    expect(q.pending).toBe(2);
    q.tick();
    expect(q.pending).toBe(1);
  });

  it('skips a job that was cancelled before its turn, without spending the frame on it', () => {
    const q = new FrameQueue();
    const ran: string[] = [];
    const cancel = q.add(() => ran.push('a'));
    q.add(() => ran.push('b'));
    cancel();
    q.tick();
    expect(ran).toEqual(['b']);
  });

  it('keeps going when a job throws, and tells about it', () => {
    const errors: unknown[] = [];
    const q = new FrameQueue((e) => errors.push(e));
    const ran: string[] = [];
    q.add(() => { throw new Error('boom'); });
    q.add(() => ran.push('next'));
    q.tick();
    q.tick();
    expect(errors).toHaveLength(1);
    expect(ran).toEqual(['next']);
  });

  it('forgets everything on clear', () => {
    const q = new FrameQueue();
    const ran: number[] = [];
    q.add(() => ran.push(1));
    q.clear();
    q.tick();
    expect(ran).toEqual([]);
    expect(q.pending).toBe(0);
  });
});
