import { describe, expect, it } from 'vitest';
import { CAT_POSE_IDS, FACE_CROP, HEAD_NO_ANGLE, catPose, headNoSteps, poseFaceLayout, puajShiver } from '../../src/game/domain/catPose';
import { EXPRESSIONS } from '../../src/game/domain/expressions';

describe('catPose with the id of photo.json (F19.3)', () => {
  it('takes the "pose-" id of the catalog as the pose without it (a recipe keeps the catalog id)', () => {
    expect(catPose('pose-coqueto')).toBe(catPose('coqueto'));
    expect(catPose('pose-coqueto')).not.toBeNull();
    expect(catPose('pose-nope')).toBeNull();
  });
});

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

describe('poseFaceLayout (F3: the face of the pose on its button)', () => {
  const box = { width: 60, height: 50 };
  it('fits the head crop inside the box, whichever side is the tight one', () => {
    const l = poseFaceLayout(catPose('sentadito')!, box);
    expect(FACE_CROP.width * l.scale).toBeLessThanOrEqual(box.width + 1e-9);
    expect(FACE_CROP.height * l.scale).toBeLessThanOrEqual(box.height + 1e-9);
    expect(Math.max(FACE_CROP.width * l.scale / box.width, FACE_CROP.height * l.scale / box.height)).toBeCloseTo(1, 5);
  });

  it('moves the images so the middle of the crop lands on the middle of the box (the images are placed by their own middle)', () => {
    const l = poseFaceLayout(catPose('sentadito')!, box);
    expect(l.offset.x).toBeCloseTo(-(FACE_CROP.x + FACE_CROP.width / 2 - 256) * l.scale, 5);
    expect(l.offset.y).toBeCloseTo(-(FACE_CROP.y + FACE_CROP.height / 2 - 256) * l.scale, 5);
  });

  it('carries the tilt and the expression of the pose', () => {
    const l = poseFaceLayout(catPose('coqueto')!, box);
    expect(l.angle).toBe(8);
    expect(l.expression).toBe('amor');
    expect(poseFaceLayout(catPose('dormilon')!, box).expression).toBe('parpadeo');
  });
});
