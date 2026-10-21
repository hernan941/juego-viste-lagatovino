// Visual reactions of the combos (docs/game-design.md, "Combos de F8"). Each one only adds to the base
// reaction (love face, double hearts, name bubble). Everything created here cleans itself up.
import Phaser from 'phaser';
import { FONT_FAMILY, Palette, SfxKeys, TextureKeys } from '../constants';
import { comboReactionPlan } from '../domain/combos';
import { SNOW, snowSpan } from '../domain/snow';
import type { ComboDef } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import type { Cat } from './Cat';
import type { NameSign } from './NameSign';
import { hex } from './ui';

const FX_DEPTH = 3500;
export interface ComboFxContext {
  scene: Phaser.Scene;
  cat: Cat;
  /** Graphics drawn behind the cat, for the rainbow. */
  rainbow: Phaser.GameObjects.Graphics;
  hearts: Phaser.GameObjects.Particles.ParticleEmitter;
  /** The cat's name sign: it flips to show the name of the look (nothing is written over the head). */
  sign: NameSign;
}

/** A short phrase in a bubble that enters with Back.easeOut, stays and floats away. */
export function showBubble(
  scene: Phaser.Scene, x: number, y: number, text: string, tone: 'rosa50' | 'mantequilla' = 'mantequilla',
  { fontSize = 34, tail }: { fontSize?: number; tail?: 'left' | 'right' } = {},
): void {
  const label = scene.add
    .text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: `${fontSize}px`, color: Palette.texto, fontStyle: '600', padding: { x: 4, y: 8 } })
    .setOrigin(0.5);
  const w = label.width + 56;
  const g = scene.add.graphics();
  g.fillStyle(hex('rosa600'), 0.18).fillRoundedRect(-w / 2 + 2, -26 + 8, w, 56, 28);
  g.fillStyle(hex(tone), 1).fillRoundedRect(-w / 2, -26, w, 56, 28);
  g.lineStyle(4, hex('rosa200'), 1).strokeRoundedRect(-w / 2, -26, w, 56, 28);
  if (tail) {
    // A little tail toward the one who speaks (the cat): a triangle on the chosen side of the bubble.
    const s = tail === 'left' ? -1 : 1;
    const pts = [new Phaser.Math.Vector2(s * (w / 2 - 6), -6), new Phaser.Math.Vector2(s * (w / 2 + 22), 8), new Phaser.Math.Vector2(s * (w / 2 - 6), 16)];
    g.fillStyle(hex(tone), 1).fillPoints(pts, true);
    g.lineStyle(4, hex('rosa200'), 1).beginPath().moveTo(pts[0].x, pts[0].y).lineTo(pts[1].x, pts[1].y).lineTo(pts[2].x, pts[2].y).strokePath();
    g.fillStyle(hex(tone), 1).fillRect(s * (w / 2 - 8) - 4, -3, 8, 17);
  }
  const bubble = scene.add.container(x, y, [g, label]).setDepth(FX_DEPTH + 10).setScale(0).setAlpha(0);
  scene.tweens.chain({
    targets: bubble,
    tweens: [
      { scale: 1, alpha: 1, duration: 280, ease: profileOf(scene).ease('Back.easeOut') },
      { y: y - 8, duration: 1500, ease: 'Sine.easeInOut' },
      { alpha: 0, y: y - 40, duration: 300, ease: 'Sine.easeIn', onComplete: () => bubble.destroy() },
    ],
  });
}

/** Plays `n` notes of the hover sound going up, like a little chime. */
function chime(scene: Phaser.Scene, rates: readonly number[], gap: number): void {
  rates.forEach((rate, i) => scene.time.delayedCall(i * gap, () => getAudio(scene).play(SfxKeys.Hover, { rate, volume: 0.8, vary: false })));
}

/** An emitter that stops after `runMs` and is destroyed once the last particle is gone. */
function shortLived(scene: Phaser.Scene, emitter: Phaser.GameObjects.Particles.ParticleEmitter, runMs: number, lifeMs: number): void {
  emitter.setDepth(FX_DEPTH);
  scene.time.delayedCall(runMs, () => emitter.stop());
  scene.time.delayedCall(runMs + lifeMs, () => emitter.destroy());
}

function starsOrbit({ scene, cat }: ComboFxContext): void {
  const head = cat.getAnchorWorld('head');
  if (profileOf(scene).spin === 0) {
    // Reduced motion: the stars do not whirl; they fade in around the head, rest there and fade out.
    const ring = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return scene.add.image(head.x + Math.cos(a) * 130, head.y - 20 + Math.sin(a) * 60, TextureKeys.Sparkle).setDepth(FX_DEPTH).setAlpha(0);
    });
    scene.tweens.add({ targets: ring, alpha: 1, duration: 300, yoyo: true, hold: 500, onComplete: () => ring.forEach((s) => s.destroy()) });
    chime(scene, [1, 1.26, 1.5, 2], 140);
    return;
  }
  const stars = Array.from({ length: 8 }, () => scene.add.image(head.x, head.y, TextureKeys.Sparkle).setDepth(FX_DEPTH).setAlpha(0));
  const turn = { t: 0 };
  scene.tweens.add({
    targets: turn, t: 1, duration: 900, ease: 'Sine.easeInOut',
    onUpdate: () => stars.forEach((s, i) => {
      const a = turn.t * Math.PI * 2 + (i * Math.PI) / 4;
      s.setPosition(head.x + Math.cos(a) * 130, head.y - 20 + Math.sin(a) * 60).setAlpha(Math.min(1, turn.t * 6)).setScale(1 + Math.sin(a) * 0.3);
    }),
    onComplete: () => scene.tweens.add({ targets: stars, alpha: 0, scale: 0, duration: 300, onComplete: () => stars.forEach((s) => s.destroy()) }),
  });
  cat.lookAt({ x: head.x + 130, y: head.y });
  scene.time.delayedCall(900, () => cat.lookAt(null));
  chime(scene, [1, 1.26, 1.5, 2], 140);
}

function snowfall({ scene, cat }: ComboFxContext): void {
  // Soft flakes inside the glass of the mirror. They fall at 90 to 140 px/s, reach the rug in about 3 s and fade out there;
  // the whole effect is over in less than 5 s so it never hangs in front of the sign or the prize.
  const { min, max } = snowSpan(cat.x);
  const snow = scene.add.particles(0, 0, TextureKeys.Snow, {
    x: { min, max }, y: SNOW.startY, speedX: { min: -20, max: 20 }, speedY: SNOW.speedY, gravityY: SNOW.gravityY,
    lifespan: SNOW.lifespan, frequency: profileOf(scene).every(45), quantity: 1, scale: { min: 0.8, max: 1.4 },
    alpha: { start: 1, end: 0, ease: 'Cubic.easeIn' }, tint: [0xffffff, 0xe6f3ff],
  });
  shortLived(scene, snow, SNOW.runMs, SNOW.lifespan + SNOW.slackMs);
  // The pompom of the hat bounces for real: a hop that stretches upward.
  cat.stretchUp();
  chime(scene, [1.8, 2.1, 1.9, 2.3, 2], 110);
}

function petals({ scene, cat }: ComboFxContext): void {
  const burst = scene.add.particles(0, 0, TextureKeys.Petal, {
    emitting: false, speed: { min: 120, max: 300 }, angle: { min: -130, max: -50 }, gravityY: 260, lifespan: { min: 1300, max: 2000 },
    rotate: { min: -180 * profileOf(scene).spin, max: 180 * profileOf(scene).spin }, scale: { start: 1.1, end: 0.6 }, alpha: { start: 1, end: 0 }, tint: [0xff8fb8, 0xffd1e3, 0xd8ccff],
  });
  burst.setDepth(FX_DEPTH);
  burst.explode(profileOf(scene).count(32), cat.x, cat.y);
  scene.time.delayedCall(2500, () => burst.destroy());
  cat.sniff();
  scene.time.delayedCall(560, () => {
    cat.hop();
    getAudio(scene).play(SfxKeys.Click, { rate: 1.6, volume: 0.8 });
    showBubble(scene, cat.x + 150, cat.getAnchorWorld('head').y - 80, '¡achís!', 'rosa50');
  });
}

function royalPose({ scene, cat }: ComboFxContext): void {
  const confetti = scene.add.particles(0, 0, TextureKeys.Confetti, {
    x: { ...snowSpan(cat.x) }, y: -10, speedX: { min: -40, max: 40 }, speedY: { min: 60, max: 140 }, gravityY: 120,
    lifespan: 3200, frequency: profileOf(scene).every(18), quantity: 1, rotate: { min: 0, max: 360 * profileOf(scene).spin }, scaleX: { start: 1, end: 0.2 }, tint: [0xffe27a, 0xfff0a8, 0xf5d86a],
  });
  shortLived(scene, confetti, 1800, 3300);
  cat.raiseChin(1100);
  // A sparkle on the crown, where the chin-up pose points.
  const crown = cat.getAnchorWorld('head');
  const glint = scene.add.particles(crown.x, crown.y - 70, TextureKeys.Sparkle, {
    emitting: false, speed: { min: 30, max: 120 }, angle: { min: 220, max: 320 }, lifespan: 700, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 },
  }).setDepth(FX_DEPTH);
  glint.explode(profileOf(scene).count(8));
  scene.time.delayedCall(900, () => glint.destroy());
  chime(scene, [1, 1.26, 1.5], 260);
}

function heartbeat({ scene, cat, hearts }: ComboFxContext): void {
  cat.heartbeat();
  // The big heart comes out of the balloon (the accessory anchor is the tip of it), not from the cat's face.
  const from = cat.getAccessoryTip();
  const p = profileOf(scene);
  const big = scene.add.image(from.x, from.y, TextureKeys.Heart).setDepth(FX_DEPTH).setScale(0.3);
  scene.tweens.add({
    targets: big, y: Math.max(110, from.y - 110), scale: 3, duration: 650, ease: p.ease('Back.easeOut'),
    onComplete: () => {
      hearts.explode(p.count(26), big.x, big.y);
      scene.tweens.add({ targets: big, scale: 4.2, alpha: 0, duration: 200, onComplete: () => big.destroy() });
    },
  });
  scene.time.delayedCall(280, () => getAudio(scene).play(SfxKeys.Purr, { rate: 0.8, volume: 0.8 }));
}

const BANDS = [0xff8fb8, 0xffd9a8, 0xfff0a8, 0xbdefd8, 0xc4e6ff];
/** The rainbow lives inside the mirror (it is 428 px wide, centered on the cat): outer radius 212 and bands of 18 px. */
const RAINBOW = { outer: 212, band: 18, cy: 575 };

function rainbowArc({ scene, cat, rainbow }: ComboFxContext): void {
  const cx = cat.x;
  const cy = RAINBOW.cy;
  const turn = { p: 0 };
  const draw = (progress: number) => {
    rainbow.clear();
    BANDS.forEach((color, i) => {
      rainbow.lineStyle(RAINBOW.band, color, 0.95).beginPath().arc(cx, cy, RAINBOW.outer - RAINBOW.band / 2 - i * RAINBOW.band, Math.PI, Math.PI + progress * Math.PI, false).strokePath();
    });
  };
  if (profileOf(scene).reduced) {
    // Reduced motion: no sweep. The whole rainbow fades in softly, stays and fades out.
    draw(1);
    rainbow.setAlpha(0);
    scene.tweens.add({ targets: rainbow, alpha: 1, duration: 500, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: rainbow, alpha: 0, delay: 1500, duration: 600, onComplete: () => rainbow.clear() });
  } else {
    rainbow.setAlpha(1);
    scene.tweens.add({
      targets: turn, p: 1, duration: 700, ease: 'Sine.easeOut',
      onUpdate: () => draw(turn.p),
      onComplete: () => scene.tweens.add({ targets: rainbow, alpha: 0, delay: 1000, duration: 600, onComplete: () => rainbow.clear() }),
    });
  }
  cat.sway();
  getAudio(scene).play(SfxKeys.Purr, { volume: 0.9 });
}

const REACTIONS: Record<string, (ctx: ComboFxContext) => void> = {
  'stars-orbit': starsOrbit,
  snowfall,
  petals,
  'royal-pose': royalPose,
  heartbeat,
  'rainbow-arc': rainbowArc,
};

/** Full reaction of a combo whose prize is new: its own effect, the face, the name on the sign and the gift sound. */
export function playComboReaction(ctx: ComboFxContext, combo: ComboDef): void {
  const { scene, cat } = ctx;
  cat.playFaces(comboReactionPlan(combo.reaction));
  REACTIONS[combo.reaction]?.(ctx);
  ctx.sign.announce(combo.name);
  getAudio(scene).play(SfxKeys.Gift);
}

/** Short reaction for a combo that was already won: love face, a few hearts and the name on the sign, no gift. */
export function playShortReaction(ctx: ComboFxContext, combo: ComboDef): void {
  ctx.cat.playFaces({ expression: 'amor', ms: 900 });
  ctx.cat.squash();
  ctx.sign.announce(combo.name);
}
