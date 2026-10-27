import Phaser from 'phaser';
import { Fonts, GAME_WIDTH, Ink, MEOW_KEYS, ObjectEvents, RegistryKeys, SceneKeys, TextureKeys, colorToNumber } from '../constants';
import type { GameData } from '../data/schema';
import { catReaction, ceremonyPlan, type CeremonyStep } from '../domain/ceremony';
import { showcaseTitle } from '../domain/copy';
import { albumHasNews } from '../domain/album';
import { albumArgs, giftedFrom } from '../domain/flow';
import type { Expression } from '../domain/expressions';
import { getLayers } from '../domain/outfit';
import { flourishFor } from '../domain/pose';
import { emptyProgress } from '../domain/progress';
import { photoArgs, rateLook, runwayLines, type RunwayLook } from '../domain/runway';
import type { AnchorsDef, ProgressEvent, Progress, RatingResult } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { Cat } from '../objects/Cat';
import { FullscreenButton } from '../objects/FullscreenButton';
import { MotionButton } from '../objects/MotionButton';
import { NotebookButton } from '../objects/NotebookButton';
import { MuteButton } from '../objects/MuteButton';
import { WalletHud } from '../objects/WalletHud';
import { appear } from '../objects/kit/appear';
import { PaperBackground } from '../objects/kit/PaperBackground';
import { drawRunwayBackdrop } from '../objects/showcase/runwayBackdrop';
import { SecretsTag } from '../objects/showcase/SecretsTag';
import { Ceremony } from '../objects/showcase/Ceremony';
import { touchEnv } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { getSave } from '../plugins/SavePlugin';
import { go } from '../systems/navigate';
import { readSession } from '../systems/sessionStore';
import { profileOf } from '../systems/motion';
import { EXIT_CENTERS, JUDGE_CARD_AT, EXIT_HEIGHT, EXIT_WIDTHS, EXIT_Y } from '../systems/runwayLayout';
import { enterKind, transitionIn } from '../systems/transitions';

/** The cat stands on the left of the mirror; the judge, his card and the notes take the rest of the runway. */
const CAT_X = 370;
const CAT_FEET_Y = 616;
const CAT_SIZE = 440;
/** How often the cat does a little flourish once the verdict is in. */
const FLOURISH_MS = 1700;
/** Where the ceremony puts things in this scene (the card sits below the purse, the notes above the cat). */
const LAYOUT = { judgeAt: { x: 1060, y: 745 }, cardAt: JUDGE_CARD_AT, notesAt: { x: 475, y: 108 }, notesWidth: 420, buttonsFrom: { x: 1060, y: 690 }, confettiAt: { x: 380, y: -10 } };
/** The purse sits over the middle of the runway, clear of the judge's card. */
const WALLET_AT = { x: 896, y: 28 };
/** The notebook stamp joins the exits (top right, next to the fullscreen, motion and sound stamps). */
const NOTEBOOK_AT = { x: GAME_WIDTH - 272, y: 56 };

/**
 * Showcase (S1): the runway. The look is rated and paid when the scene opens (the progress is written first, so seeing the ceremony
 * or not changes nothing), and then the judge reads his card, stamps the stars and the cat shows what it feels while the buttons fly
 * to the purse (a tap skips x3). At the end the way out opens: [Modo foto], [Seguir vistiendo] and [Otro gato]. Coming back from the
 * album (`replay: false`) shows the same cat without rating again.
 */
export class Showcase extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private cat!: Cat;
  private catalog!: GameData;
  private look!: RunwayLook;
  private rating: RatingResult | null = null;
  private hud!: WalletHud;
  private ceremony: Ceremony | null = null;
  private photo: Button | null = null;
  private keep: Button | null = null;
  private change: Button | null = null;
  private hint: Phaser.GameObjects.Text | null = null;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private fullscreen: FullscreenButton | null = null;
  private notebook: NotebookButton | null = null;
  private counter!: SecretsTag;
  private hearts!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pose: Expression = 'feliz';
  private title = '';
  private step: string | null = null;
  private ready = false;
  private leaving = false;
  /** Prizes that were delivered quietly when the player left the fitting room with a gift still unopened. */
  private gifted: string[] = [];
  private poses = 0;
  /** False when the player comes back from the album: the same cat, without rating or paying again. */
  private replay = true;
  private readonly toastLog: string[] = [];

  constructor() {
    super(SceneKeys.Showcase);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.gifted = giftedFrom(data);
    this.replay = (data as { replay?: unknown } | null | undefined)?.replay !== false;
    this.rating = null;
    this.ceremony = null;
    this.photo = this.keep = this.change = null;
    this.notebook = null;
    this.hint = null;
    this.poses = 0;
    this.pose = 'feliz';
    this.step = null;
    this.ready = false;
    this.leaving = false;
    this.toastLog.length = 0;
  }

  create() {
    const catalog = this.registry.get(RegistryKeys.Catalog) as GameData;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const session = readSession(this.registry);
    const def = catalog.cats.find((c) => c.id === session.catId) ?? catalog.cats[0];
    this.catalog = catalog;
    this.look = { catId: def.id, catName: session.catName || def.name, outfit: session.outfit, itemDye: session.itemDye };
    const layers = getLayers(session.outfit, catalog.clothes);
    this.title = showcaseTitle(this.look.catName, layers.length);

    // Rate and pay first: from here on the progress is written, whatever the player watches (ADR 0017).
    const before = (this.registry.get(RegistryKeys.Progress) as Progress | undefined) ?? emptyProgress(catalog.economy.startWallet);
    let events: ProgressEvent[] = [];
    let after = before;
    if (this.replay) {
      const rated = rateLook(before, this.look, catalog);
      this.rating = rated.result;
      events = rated.events;
      after = rated.progress;
      this.registry.set(RegistryKeys.Progress, after);
      this.registry.set(RegistryKeys.LastRating, rated.result);
    } else {
      this.rating = (this.registry.get(RegistryKeys.LastRating) as RatingResult | undefined) ?? null;
    }

    // A notebook page: grid paper, a pencil spotlight and the taped strip of the runway (clear of the exits and the judge's card).
    new PaperBackground(this).setDepth(-10);
    drawRunwayBackdrop(this, CAT_X, CAT_FEET_Y)?.setDepth(-5);
    // A highlighter-yellow glow behind the cat that breathes.
    const glow = this.add.graphics().setDepth(1);
    glow.fillStyle(colorToNumber(Ink.sol), 0.2).fillEllipse(CAT_X, 380, 400, 500);
    if (profileOf(this).loops) this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 1 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.cat = new Cat(this, CAT_X, CAT_FEET_Y, def, anchors, CAT_SIZE).setDepth(5);
    this.cat.setOutfit(layers);
    this.cat.appear();

    // Sparkles drift around the cat, and hearts pop up when it is in love.
    this.add
      .particles(CAT_X, 340, TextureKeys.Sparkle, {
        x: { min: -210, max: 210 }, y: { min: -190, max: 240 }, lifespan: 1100, frequency: profileOf(this).every(110), quantity: 1,
        scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 }, speed: 18,
      })
      .setDepth(8);
    this.hearts = this.add
      .particles(0, 0, TextureKeys.Heart, {
        emitting: false, speed: { min: 60, max: 200 }, angle: { min: -120, max: -60 }, gravityY: -40,
        lifespan: { min: 900, max: 1400 }, scale: { start: 1.3, end: 0.4 }, alpha: { start: 1, end: 0 }, rotate: { min: -30, max: 30 },
      })
      .setDepth(9);

    // The purse shows the number from before the rating: each button that lands adds to it.
    this.hud = new WalletHud(this, WALLET_AT.x, WALLET_AT.y).setDepth(40);
    this.hud.setValue(before.wallet);
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 56).setDepth(50);
    this.fullscreen = FullscreenButton.create(this, GAME_WIDTH - 200, 56);
    this.fullscreen?.setDepth(50);
    this.counter = new SecretsTag(this, 140, 50).setDepth(50);
    // A prize that was delivered quietly: the counter shows the old number and pops to the new one with the toast.
    const won = getSave(this).secrets.length;
    this.counter.setCount(Math.max(0, won - this.gifted.length), catalog.combos.length);

    this.time.delayedCall(450, () => {
      getAudio(this).playRandom(MEOW_KEYS);
      if (this.gifted.length > 0) {
        this.time.delayedCall(700, () => {
          this.toast('¡Te guardé tu regalito!', 'sol');
          this.counter.setCount(won, catalog.combos.length, true);
        });
      }
      if (this.replay && this.rating) this.runCeremony(this.rating, events, after.wallet);
      else this.openExits(false);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ceremony?.destroy();
      this.cat?.destroy();
      for (const o of [this.photo, this.keep, this.change, this.notebook, this.hint, this.mute, this.motion, this.fullscreen, this.counter, this.hud]) o?.destroy();
      this.tweens.killAll();
    });
    transitionIn(this, this.enter);
  }

  /** The judge's turn. The buttons that land add to the purse; at the end the purse settles on the real wallet. */
  private runCeremony(rating: RatingResult, events: ProgressEvent[], wallet: number) {
    const p = profileOf(this);
    const plan = ceremonyPlan(rating, events, p.reduced ? 'reduced' : 'full');
    const comboName = (id: string) => this.catalog.combos.find((c) => c.id === id)?.name ?? id;
    this.hud.hold();
    this.showHint();
    const ceremony = new Ceremony(this, plan, {
      cat: this.cat, catName: this.look.catName, judge: this.catalog.brand.judge, comboName, tags: this.catalog.tags,
      layout: { ...LAYOUT, wallet: this.hud.getJarPoint() },
      onCredit: (credit) => this.hud.adjust(credit),
      onStep: (step: CeremonyStep) => {
        this.step = step.kind;
        if (step.kind === 'reaction') this.pose = step.reaction.expression;
      },
    });
    this.ceremony = ceremony;
    void ceremony.play().then(() => {
      if (!this.scene.isActive() || ceremony.destroyed) return;
      this.step = 'done';
      this.hud.release(wallet);
      this.openExits(true);
    });
  }

  /** "Clic para seguir" / "Toca para seguir": breathes at the foot of the cat while the ceremony runs. */
  private showHint() {
    const hint = this.add
      .text(CAT_X, 668, runwayLines.skip(touchEnv().touch), { fontFamily: Fonts.Voice, fontSize: '30px', color: Ink.mutedTexto, padding: { x: 4, y: 8 } })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.hint = hint;
    this.tweens.add({ targets: hint, alpha: 1, duration: 300, delay: 600 });
    if (profileOf(this).loops) this.tweens.add({ targets: hint, y: 662, duration: 900, delay: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** The way out opens (nothing appears all at once) and the cat keeps posing for the mirror. */
  private openExits(celebrated: boolean) {
    const hint = this.hint;
    this.hint = null;
    if (hint) {
      this.tweens.killTweensOf(hint);
      this.tweens.add({ targets: hint, alpha: 0, duration: 200, onComplete: () => hint.destroy() });
    }
    const make = (x: number, label: string, pill: 'primary' | 'secondary', width: number, onClick: () => void) => {
      const button = new Button(this, x, EXIT_Y, label, { pill, width, height: EXIT_HEIGHT, fontSize: 30 }).setDepth(20);
      button.on(ObjectEvents.ButtonClick, onClick);
      appear(this, button, { pop: true });
      return button;
    };
    this.photo = make(EXIT_CENTERS.photo, runwayLines.photo, 'primary', EXIT_WIDTHS.photo, () => this.leave('photo'));
    this.keep = make(EXIT_CENTERS.keep, runwayLines.keepDressing, 'secondary', EXIT_WIDTHS.keep, () => this.leave('keepDressing'));
    this.change = make(EXIT_CENTERS.change, runwayLines.change, 'secondary', EXIT_WIDTHS.change, () => this.leave('change'));
    this.openNotebook();
    const stars = this.rating?.stars ?? 3;
    if (!celebrated) {
      // Back from the album: the cat wears the face of its verdict at once.
      this.pose = catReaction(stars).expression;
      this.cat.hold(this.pose);
    }
    this.ready = true;
    this.time.addEvent({ delay: FLOURISH_MS, loop: true, callback: () => this.flourish(stars) });
  }

  /** The notebook stamp pops in with the exits; its sparkle says there is something new in the album. */
  private openNotebook() {
    const progress = this.registry.get(RegistryKeys.Progress) as Progress | undefined;
    const button = new NotebookButton(this, NOTEBOOK_AT.x, NOTEBOOK_AT.y, progress ? albumHasNews(progress, this.catalog) : false).setDepth(50);
    button.on(ObjectEvents.NotebookPress, () => this.openAlbum());
    appear(this, button, { pop: true });
    this.notebook = button;
  }

  private openAlbum() {
    if (this.leaving) return;
    this.leaving = true;
    // The runway comes back by itself (the album's "Volver" adds `replay: false`): there is nothing to hand over.
    go(this, 'album', albumArgs(SceneKeys.Showcase, {}));
  }

  /** A flourish that rotates (squash, a wag, a glance aside) so the pose never looks mechanical. */
  private flourish(stars: number) {
    if (!this.scene.isActive() || this.leaving) return;
    switch (flourishFor(this.poses++)) {
      case 'squash': this.cat.squash(); break;
      case 'wiggle': this.cat.wiggle(); break;
      case 'glance': this.cat.glance(this.poses % 2 === 0 ? 1 : -1); break;
    }
    if (stars >= 4 && this.poses % 2 === 0) this.hearts.explode(profileOf(this).count(6), CAT_X, 250);
  }

  /** A small bubble that floats up from the foot of the runway and away (never over the belly). */
  private toast(text: string, tone: 'lila' | 'sol' = 'lila') {
    this.toastLog.push(text);
    const label = this.add
      .text(0, 0, text, { fontFamily: Fonts.Title, fontSize: '30px', color: Ink.tinta, padding: { x: 4, y: 8 } })
      .setOrigin(0.5);
    const g = this.add.graphics();
    const w = label.width + 56;
    g.fillStyle(colorToNumber(Ink[tone]), 1).fillRoundedRect(-w / 2, -26, w, 56, 28);
    g.lineStyle(3, colorToNumber(Ink.tinta), 1).strokeRoundedRect(-w / 2, -26, w, 56, 28);
    const bubble = this.add.container(CAT_X + 330, 560, [g, label]).setDepth(60).setScale(0).setAlpha(0);
    this.tweens.chain({
      targets: bubble,
      tweens: [
        { scale: 1, alpha: 1, duration: 260, ease: profileOf(this).ease('Back.easeOut') },
        { y: 548, duration: 1100, ease: 'Sine.easeInOut' },
        { alpha: 0, y: 520, duration: 300, ease: 'Sine.easeIn', onComplete: () => bubble.destroy() },
      ],
    });
  }

  private leave(action: 'photo' | 'keepDressing' | 'change') {
    if (this.leaving) return;
    this.leaving = true;
    if (action === 'photo') go(this, action, photoArgs(this.look, this.rating));
    else go(this, action);
  }

  getE2EUi(): UiState {
    const buttons: Record<string, { x: number; y: number }> = {};
    for (const [key, b] of Object.entries({ keep: this.keep, photo: this.photo, change: this.change })) {
      const p = b ? b.getCenter() : undefined;
      if (p) buttons[key] = { x: p.x, y: p.y };
    }
    for (const [key, b] of Object.entries({ mute: this.mute, motion: this.motion, fullscreen: this.fullscreen, album: this.notebook })) if (b) buttons[key] = b.getCenter();
    return {
      ready: this.ready && !this.leaving,
      buttons,
      points: { wallet: this.hud.getJarPoint() },
      info: {
        title: this.title, pose: this.pose, layers: this.cat.wornIds, ceremonyStep: this.step, lastRating: this.rating,
        wallet: this.hud.value, replay: this.replay, toasts: [...this.toastLog], secrets: this.counter.text,
      },
    };
  }
}
