import Phaser from 'phaser';
import { FONT_FAMILY, GAME_WIDTH, ObjectEvents, Palette, RegistryKeys, SceneKeys, SfxKeys } from '../constants';
import type { Catalog } from '../data/schema';
import { NAME_MAX, applyNameKey, nameOnSelect, validateCatName } from '../domain/catName';
import { chooseCat } from '../domain/session';
import type { AnchorsDef, CatDef } from '../domain/types';
import type { E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { CARD_H, CARD_W, CatCard } from '../objects/CatCard';
import { MuteButton } from '../objects/MuteButton';
import { MotionButton } from '../objects/MotionButton';
import { drawPanel, hex } from '../objects/ui';
import { getAudio } from '../plugins/AudioPlugin';
import { go } from '../systems/navigate';
import { readSession, writeSession } from '../systems/sessionStore';
import { profileOf } from '../systems/motion';
import { enterKind, transitionIn } from '../systems/transitions';

const COLUMNS = 6;
const GAP_X = 14;
const GAP_Y = 16;
const GRID_TOP = 128;
const BAR = { x: 150, y: 556, width: 980, height: 136 };
const INPUT = { x: 580, y: 624, width: 440, height: 76 };

/** CatSelect: the gallery of 12 cats; picking one makes it hop and reveals the name field and the "¡Este!" button. */
export class CatSelect extends Phaser.Scene implements E2EUi {
  private enter: ReturnType<typeof enterKind> = null;
  private catalog!: Catalog;
  private cards: CatCard[] = [];
  private selected: CatDef | null = null;
  private name = '';
  /** True while the field shows the cat's default name, which acts as selected text: the first key replaces it. */
  private nameIsDefault = false;
  /** Default name of the previous pick, to know whether the player typed their own. */
  private lastDefault: string | null = null;
  private ready = false;
  private choose!: Button;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private hint!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Container;
  private box!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private caret!: Phaser.GameObjects.Rectangle;
  private counter!: Phaser.GameObjects.Text;
  private warning!: Phaser.GameObjects.Text;
  private barShown = false;
  /** Box, text and caret of the name field, shaken together. */
  private field!: Phaser.GameObjects.Container;

  constructor() {
    super(SceneKeys.CatSelect);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    this.catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    this.cards = [];
    this.selected = null;
    this.name = '';
    this.nameIsDefault = false;
    this.lastDefault = null;
    this.ready = false;
    this.barShown = false;
  }

  create() {
    const anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    this.cameras.main.setBackgroundColor(Palette.rosa50);
    this.drawBackdrop();
    this.add
      .text(GAME_WIDTH / 2, 56, 'Elige a tu gatito', { fontFamily: FONT_FAMILY, fontSize: '60px', color: Palette.rosa600, fontStyle: '700', stroke: '#FFFFFF', strokeThickness: 12, padding: { x: 4, y: 10 } })
      .setOrigin(0.5);

    const gridW = COLUMNS * CARD_W + (COLUMNS - 1) * GAP_X;
    this.catalog.cats.forEach((def, i) => {
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const x = GAME_WIDTH / 2 - gridW / 2 + CARD_W / 2 + col * (CARD_W + GAP_X);
      const y = GRID_TOP + CARD_H / 2 + row * (CARD_H + GAP_Y);
      const card = new CatCard(this, x, y, def, anchors);
      card.appear(80 + i * 55);
      card.on(ObjectEvents.ButtonClick, () => this.pick(def));
      this.cards.push(card);
    });

    this.createBar();
    this.mute = new MuteButton(this, GAME_WIDTH - 56, 56).setDepth(50);
    this.motion = new MotionButton(this, GAME_WIDTH - 128, 56).setDepth(50);

    // Coming back from the fitting room keeps the cat and the name that were chosen.
    const session = readSession(this.registry);
    const previous = this.catalog.cats.find((c) => c.id === session.catId);
    this.time.delayedCall(80 + this.catalog.cats.length * 55 + 300, () => {
      this.ready = true;
      if (previous) this.pick(previous, session.catName, true);
    });

    this.input.keyboard?.on('keydown', this.onKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onKey, this);
      for (const c of this.cards) c.destroy();
      this.choose?.destroy();
      this.mute?.destroy();
      this.motion?.destroy();
      this.tweens.killAll();
    });
    transitionIn(this, this.enter);
  }

  private drawBackdrop() {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(hex('lavanda'), 0.45);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 17; col++) {
        const x = col * 80 + (row % 2 === 0 ? 20 : 60);
        const y = row * 84 + 30;
        g.fillEllipse(x, y + 4, 11, 9).fillCircle(x - 7, y - 4, 3).fillCircle(x - 2.5, y - 8, 3).fillCircle(x + 2.5, y - 8, 3).fillCircle(x + 7, y - 4, 3);
      }
    }
  }

  /** Bottom bar: a hint first, then the name field and the button once a cat is picked. */
  private createBar() {
    const panel = this.add.graphics();
    drawPanel(panel, BAR.width, BAR.height, 44);
    panel.setPosition(BAR.x, BAR.y);
    this.hint = this.add
      .text(GAME_WIDTH / 2, BAR.y + BAR.height / 2, 'Elige al gatito que más te guste', { fontFamily: FONT_FAMILY, fontSize: '36px', color: Palette.texto, fontStyle: '600' })
      .setOrigin(0.5);
    if (profileOf(this).loops) this.tweens.add({ targets: this.hint, y: this.hint.y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const label = this.add.text(BAR.x + 40, INPUT.y, 'Su nombre:', { fontFamily: FONT_FAMILY, fontSize: '26px', color: Palette.rosa600, fontStyle: '600' }).setOrigin(0, 0.5);
    this.box = this.add.graphics();
    this.drawBox(false);
    this.nameText = this.add.text(INPUT.x - INPUT.width / 2 + 24, INPUT.y, '', { fontFamily: FONT_FAMILY, fontSize: '40px', color: Palette.texto, fontStyle: '600' }).setOrigin(0, 0.5);
    this.caret = this.add.rectangle(INPUT.x - INPUT.width / 2 + 26, INPUT.y, 4, 44, hex('rosa400')).setOrigin(0, 0.5);
    this.tweens.add({ targets: this.caret, alpha: { from: 1, to: 0 }, duration: 480, yoyo: true, repeat: -1 });
    this.counter = this.add.text(INPUT.x + INPUT.width / 2 - 16, INPUT.y, '', { fontFamily: FONT_FAMILY, fontSize: '20px', color: Palette.rosa600, fontStyle: '500' }).setOrigin(1, 0.5);
    this.warning = this.add.text(INPUT.x, INPUT.y + 52, '¡Ponle un nombre!', { fontFamily: FONT_FAMILY, fontSize: '24px', color: Palette.rosa600, fontStyle: '600' }).setOrigin(0.5).setAlpha(0);
    this.choose = new Button(this, 945, INPUT.y, '¡Este!', { width: 250, height: 92, fontSize: 46 });
    this.choose.on(ObjectEvents.ButtonClick, () => this.confirm());

    this.field = this.add.container(0, 0, [this.box, this.nameText, this.caret, this.counter]);
    this.bar = this.add.container(0, 0, [label, this.field, this.warning, this.choose]);
    this.bar.setAlpha(0).setY(30);
    this.choose.input!.enabled = false;
  }

  private drawBox(error: boolean) {
    this.box.clear();
    this.box.fillStyle(hex('rosa600'), 0.12).fillRoundedRect(INPUT.x - INPUT.width / 2 + 2, INPUT.y - INPUT.height / 2 + 7, INPUT.width, INPUT.height, 32);
    this.box.fillStyle(hex('crema'), 1).fillRoundedRect(INPUT.x - INPUT.width / 2, INPUT.y - INPUT.height / 2, INPUT.width, INPUT.height, 32);
    this.box.lineStyle(5, error ? hex('rosa600') : hex('rosa400'), 1).strokeRoundedRect(INPUT.x - INPUT.width / 2, INPUT.y - INPUT.height / 2, INPUT.width, INPUT.height, 32);
  }

  private pick(def: CatDef, name?: string, silent = false) {
    if (!this.ready) return;
    const previous = this.selected;
    this.selected = def;
    for (const c of this.cards) c.setSelected(c.def.id === def.id);
    const card = this.cards.find((c) => c.def.id === def.id)!;
    if (!silent) card.hop();
    else card.cat.react('drop');
    this.name = name ?? nameOnSelect(this.name, this.lastDefault ?? previous?.name ?? null, def.name);
    this.lastDefault = def.name;
    this.nameIsDefault = this.name === def.name;
    this.refreshName();
    this.showBar();
  }

  private showBar() {
    if (this.barShown) return;
    this.barShown = true;
    this.tweens.add({ targets: this.hint, alpha: 0, duration: 150 });
    this.tweens.add({ targets: this.bar, alpha: 1, y: 0, duration: 300, ease: profileOf(this).ease('Back.easeOut'), onComplete: () => { this.choose.input!.enabled = true; } });
  }

  private refreshName() {
    this.nameText.setText(this.name).setAlpha(this.nameIsDefault ? 0.55 : 1);
    // The default name looks selected: dimmed, with the caret at the start.
    this.caret.setX(this.nameIsDefault ? this.nameText.x - 2 : this.nameText.x + this.nameText.width + 4);
    this.counter.setText(`${[...this.name].length}/${NAME_MAX}`);
  }

  private onKey(event: KeyboardEvent) {
    if (!this.selected || !this.barShown) return;
    if (event.key === 'Enter') {
      this.confirm();
      return;
    }
    const next = applyNameKey(this.name, event.key, { replacing: this.nameIsDefault });
    if (next === this.name) {
      if (event.key.length === 1) this.shakeBox();
      return;
    }
    this.name = next;
    this.nameIsDefault = false;
    getAudio(this).play(SfxKeys.Key);
    this.refreshName();
    this.tweens.killTweensOf(this.nameText);
    this.nameText.setScale(1 + 0.08 * profileOf(this).squash);
    this.tweens.add({ targets: this.nameText, scale: 1, duration: 120, ease: profileOf(this).ease('Back.easeOut') });
    this.tweens.add({ targets: this.warning, alpha: 0, duration: 100 });
  }

  private shakeBox() {
    this.tweens.killTweensOf(this.field);
    this.field.x = 0;
    // A refused key is not silent anymore: a soft boing.
    getAudio(this).play(SfxKeys.Return, { volume: 0.4 });
    const k = profileOf(this).shake;
    if (k === 0) {
      // Reduced motion: no shake, the box changes color for a moment instead.
      this.drawBox(true);
      this.time.delayedCall(400, () => this.scene.isActive() && this.drawBox(false));
      return;
    }
    this.tweens.add({ targets: this.field, x: { from: -7 * k, to: 7 * k }, duration: 50, yoyo: true, repeat: 2, onComplete: () => { this.field.x = 0; } });
  }

  private confirm() {
    if (!this.selected || !this.ready) return;
    const check = validateCatName(this.name);
    if (!check.ok) {
      this.drawBox(true);
      this.warning.setAlpha(1);
      this.shakeBox();
      this.time.delayedCall(900, () => this.scene.isActive() && this.drawBox(false));
      return;
    }
    this.ready = false;
    writeSession(this.registry, chooseCat(readSession(this.registry), this.selected.id, check.name));
    go(this, 'choose');
  }

  getE2EUi(): UiState {
    const cats = Object.fromEntries(this.cards.map((c) => [c.def.id, c.getCenter()]));
    return {
      ready: this.ready,
      buttons: { ...(this.barShown ? { choose: this.choose.getCenter() } : {}), mute: this.mute.getCenter(), motion: this.motion.getCenter() },
      points: { ...cats, nameInput: { x: INPUT.x, y: INPUT.y } },
      info: { enter: this.enter, selected: this.selected?.id ?? null, name: this.name, nameIsDefault: this.nameIsDefault, chooseVisible: this.barShown && this.bar.alpha > 0.99, warning: this.warning.alpha > 0.5 },
    };
  }
}
