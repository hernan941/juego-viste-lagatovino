// F15.3 (development only): a lab to look at the runway ceremony without going through the whole game. Opened with
// `?lab=ceremony` (and `&stars=1..5`, `&events=0` for no notes, `&reduced=1`). A click or tap skips x3; once it ends, a new click
// plays it again. It is not in the scene list of a production build, and nothing here is game code: Showcase does this in F15.4.
import Phaser from 'phaser';
import { Fonts, GAME_WIDTH, Ink, RegistryKeys } from '../../constants';
import brandJson from '../../data/brand.json';
import type { Catalog } from '../../data/schema';
import { ceremonyPlan } from '../../domain/ceremony';
import type { AnchorsDef, BrandDef, ProgressEvent, RatingResult, Stars } from '../../domain/types';
import { Cat } from '../../objects/Cat';
import { PaperBackground } from '../../objects/kit/PaperBackground';
import { Ceremony } from '../../objects/showcase/Ceremony';
import { profileOf } from '../../systems/motion';

export const CEREMONY_LAB_KEY = 'CeremonyLab';

const brand = brandJson as unknown as BrandDef;

const LINES: RatingResult['breakdown'] = [
  { kind: 'style', points: 2, ref: 'clasico' },
  { kind: 'love', points: 4, ref: 'invierno' },
  { kind: 'dislike', points: -3, ref: 'gala' },
  { kind: 'complete', points: 2 },
  { kind: 'combo', points: 3, ref: 'navidad' },
];

const EVENTS: ProgressEvent[] = [
  { type: 'coins', amount: 40 },
  { type: 'milestone', stars: 5, amount: 50 },
  { type: 'tasteFound', taste: 'love:invierno', amount: 15 },
  { type: 'comboFirst', comboId: 'navidad', amount: 40 },
  { type: 'setCompleted', setId: 'navidad' },
];

export class CeremonyLab extends Phaser.Scene {
  private cat?: Cat;
  private ceremony?: Ceremony;
  private wallet!: Phaser.GameObjects.Text;
  private shown = 0;

  constructor() {
    super(CEREMONY_LAB_KEY);
  }

  init(): void {
    this.cat = undefined;
    this.ceremony = undefined;
    this.shown = 0;
  }

  create(): void {
    const q = new URLSearchParams(window.location.search);
    if (q.get('reduced') === '1') this.registry.set(RegistryKeys.ReducedMotion, true);
    new PaperBackground(this, { animate: false }).setDepth(-10);
    const catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const cat = new Cat(this, 420, 690, catalog.cats[0], anchors, 420);
    cat.setOutfit([catalog.clothes.find((c) => c.slot === 'sweater')!], { instant: true });
    this.cat = cat;
    this.wallet = this.add
      .text(GAME_WIDTH - 40, 20, '0', { fontFamily: Fonts.Title, fontSize: '44px', color: Ink.tinta })
      .setOrigin(1, 0)
      .setDepth(5000);
    this.add.text(GAME_WIDTH - 40, 70, 'botones', { fontFamily: Fonts.Voice, fontSize: '22px', color: Ink.mutedTexto }).setOrigin(1, 0).setDepth(5000);

    const stars = Phaser.Math.Clamp(Number(q.get('stars') ?? 5), 1, 5) as Stars;
    const withEvents = q.get('events') !== '0';
    const start = () => this.start(stars, withEvents);
    this.input.on('pointerdown', () => {
      if (!this.ceremony || this.ceremony.finished) start();
    });
    this.time.delayedCall(300, start);
    (window as unknown as { __LAB__: unknown }).__LAB__ = { ceremony: () => this.ceremony, shown: () => this.shown, restart: start };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ceremony?.destroy();
      delete (window as unknown as { __LAB__?: unknown }).__LAB__;
    });
  }

  private start(stars: Stars, withEvents: boolean): void {
    this.ceremony?.destroy();
    this.cat?.release();
    this.shown = 0;
    this.wallet.setText('0');
    const result: RatingResult = { points: stars * 3, stars, breakdown: LINES };
    const plan = ceremonyPlan(result, withEvents ? EVENTS : [{ type: 'coins', amount: 40 }], profileOf(this).reduced ? 'reduced' : 'full');
    this.ceremony = new Ceremony(this, plan, {
      cat: this.cat!, catName: 'Mau', judge: brand.judge, comboName: () => 'Look Navidad',
      onCredit: (credit) => {
        this.shown += credit;
        this.wallet.setText(String(this.shown));
        this.tweens.add({ targets: this.wallet, scale: { from: 1.25, to: 1 }, duration: 160, ease: 'Back.easeOut' });
      },
    });
    void this.ceremony.play();
  }
}
