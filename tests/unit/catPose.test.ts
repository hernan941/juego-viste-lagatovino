import { describe, expect, it } from 'vitest';
import { CAT_POSE_IDS, HEAD_NO_ANGLE, catPose, headNoSteps, puajShiver } from '../../src/game/domain/catPose';
import { EXPRESSIONS } from '../../src/game/domain/expressions';

describe('catPose (S6: transformations and faces, no new body art)', () => {
  it('has the four poses of the design', () => {
    expect([...CAT_POSE_IDS]).toEqual(['sentadito', 'coqueto', 'saltito', 'dormilon']);
  });

  it('sentadito is the resting pose: no transform and the normal face', () => {
    expect(catPose('sentadito')).toEqual({ id: 'sentadito', angle: 0, lift: 0, scaleX: 1, scaleY: 1, shadow: 1, expression: 'normal' });
  });

  it('coqueto tilts the head 8 degrees and is in love', () => {
    expect(catPose('coqueto')).toMatchObject({ angle: 8, expression: 'amor' });
  });

  it('saltito freezes the cat 24 px up with a small shadow and a happy face', () => {
    const p = catPose('saltito')!;
    expect(p).toMatchObject({ lift: 24, expression: 'feliz' });
    expect(p.shadow).toBeLessThan(1);
  });

  it('dormilon blinks with a slight squash', () => {
    const p = catPose('dormilon')!;
    expect(p.expression).toBe('parpadeo');
    expect(p.scaleY).toBeLessThan(1);
    expect(p.scaleX).toBeGreaterThan(1);
  });

  it('every pose uses a real expression', () => {
    for (const id of CAT_POSE_IDS) expect(EXPRESSIONS).toContain(catPose(id)!.expression);
  });

  it('an unknown pose is null', () => {
    expect(catPose('volando')).toBeNull();
    expect(catPose('')).toBeNull();
  });
});

describe('headNoSteps (sayNo)', () => {
  it('shakes the head side to side twice by 4 degrees and rests at 0', () => {
    expect(HEAD_NO_ANGLE).toBe(4);
    expect(headNoSteps(1)).toEqual([-4, 4, -4, 4, 0]);
  });

  it('scales the angle (a gentler no) and never moves with 0', () => {
    expect(headNoSteps(0.5)).toEqual([-2, 2, -2, 2, 0]);
    expect(headNoSteps(0).every((a) => a === 0)).toBe(true);
  });
});

describe('puajShiver (F12.R A1: the chill of "puaj")', () => {
  it('shivers 3 px side to side 3 times in 180 ms and rests at 0', () => {
    expect(puajShiver(false)).toEqual({ steps: [3, -3, 3, -3, 3, -3, 0], stepMs: 30 });
  });

  it('with reduced motion there is no shiver, only the cloud', () => {
    expect(puajShiver(true).steps).toEqual([]);
  });
});
