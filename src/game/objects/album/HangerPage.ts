import Phaser from 'phaser';
import { Fonts, Ink, KeychainTextures, ObjectEvents, RegistryKeys, SfxKeys, TextureKeys, colorToNumber } from '../../constants';
import { HANGER, hangerHooks, keychainEntries, type KeychainEntry } from '../../domain/albumEntries';
import { pageTally } from '../../domain/albumPages';
import { albumLines, keychainLines } from '../../domain/copy';
import { pushAngle, pushStrength } from '../../domain/keychain';
import { fitKeychain } from '../../domain/keychainPackage';
import type { AnchorsDef } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import { Keychain, keychainData } from '../keychain/Keychain';
import type { AlbumPageContext } from './AlbumPage';
import { PAGE_AREA } from './AlbumPage';
import { BookPage, entryContext } from './BookPage';
import { makeTappable } from './makeTappable';
import { sketchImage } from './pencil';

/** A hook's cell: its center is this far under the hook, and the keychain hangs from the hook inside it. */
const CELL = { width: 130, height: 128, hookOffset: 56 };
/** Where a thumbnail fits (px of the cell), counted from the hook down. */
const FIT = { x: 0, y: 0, width: 126, height: 100 };
const SKETCH = 84;
const CAPTION_Y = 56;
/** The keychain in front: where it hangs from, and the box it fits in. */
const BIG = { hang: { x: 130, y: -196 }, fit: { x: 0, y: 0, width: 360, height: 400 } };
const DRAG_MIN = 6;
/** A tap that comes right after the end of a drag is the same gesture: it does not swing again. */
const AFTER_DRAG_MS = 80;
const FLIGHT = { ms: 520, from: { x: 70, y: 300 }, scale: 2.2, angle: 24 };
const PAPER = colorToNumber(Ink.cremaPapel);

/** What one hook is made of. */
interface Hook {
  entry: KeychainEntry;
  cell: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Container;
  keychain: Keychain | null;
  /** Where the thumbnail rests inside the cell, and how big it is. */
  rest: { x: number; y: number; scale: number };
}

interface BigView {
  catId: string;
  view: Phaser.GameObjects.Container;
  scrim: Phaser.GameObjects.Zone;
  zone: Phaser.GameObjects.Zone;
  keychain: Keychain;
}

/**
 * Colgador (F19.5, S8): the cork board with a hook per cat. The keychains that were saved hang from their hooks, drawn again from
 * their recipes (one per frame, with the pencil silhouette of the cat while they wait); an empty hook shows its cat in pencil. A tap
 * swings a keychain and makes it tink (only that one moves: ADR 0021), a second tap brings it to the front, big, where a tap swings
 * it again and a drag pushes it. When the player comes from [Colgarlo] (`hang`), that keychain flies to its hook with a click.
 */
export class HangerPage extends BookPage {
  private readonly entries: KeychainEntry[];
  private readonly hooks = new Map<string, Hook>();
  private readonly anchors: AnchorsDef;
  private focus: string | null = null;
  private swingingId: string | null = null;
  private big: BigView | null = null;
  private lastDragEnd = -Infinity;
  private gone = false;

  constructor(scene: Phaser.Scene, tab: string, private readonly ctx: AlbumPageContext) {
    super(scene, tab);
    this.anchors = scene.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    this.entries = keychainEntries(entryContext(ctx));
    // The board spans the spine (it is a corkboard pinned on the notebook); the halves go above it.
    const board = scene.add.image(0, HANGER.centerY, KeychainTextures.HangerBoard).setScale(HANGER.scale);
    this.addAt(board, 0);
    this.heading(albumLines.tally(pageTally('colgador', ctx.completion.sections)));
    hangerHooks(this.entries.length).forEach((hook) => {
      const entry = this.entries[hook.index]!;
      const cell = this.buildHook(entry);
      cell.setPosition(hook.localX, hook.y + CELL.hookOffset);
      this.place(hook.side, entry.id, cell, entry.isNew, { x: CELL.width / 2 - 14, y: -CELL.height / 2 + 12 });
    });
    this.popIn(this.cellList());
  }

  protected shown(): { id: string; state: string }[] {
    return this.entries.map((e) => ({ id: e.id, state: e.recipe ? 'hung' : 'empty' }));
  }

  info() {
    return { ...super.info(), swinging: this.swingingId, focus: this.focus, big: this.big?.catId ?? null };
  }

  /** The front view of the keychain that is brought to the front (null when none is), for the tests and the e2e hook. */
  bigView(): { scrim: Phaser.GameObjects.Zone; zone: Phaser.GameObjects.Zone } | null {
    return this.big ? { scrim: this.big.scrim, zone: this.big.zone } : null;
  }

  /** The thumbnail of a cat's keychain, when it has one. */
  keychainOf(catId: string): Keychain | null {
    return this.hooks.get(`keychain:${catId}`)?.keychain ?? null;
  }

  // ---- The hooks ----------------------------------------------------------

  private buildHook(entry: KeychainEntry): Phaser.GameObjects.Container {
    const scene = this.scene;
    const hung = entry.recipe !== null;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const rest = { x: 0, y: -CELL.hookOffset, scale: 1 };
    let keychain: Keychain | null = null;
    if (entry.recipe) {
      keychain = new Keychain(scene, rest.x, rest.y, entry.recipe, keychainData(this.ctx.catalog, this.anchors), { px: 256, deferred: true, cache: true });
      rest.scale = fitKeychain(FIT, keychain.layout, keychain.layout.hang);
      keychain.setScale(rest.scale);
      keychain.on(ObjectEvents.KeychainTink, (strength: number) => getAudio(scene).play(SfxKeys.Porcelain, { volume: 0.25 + 0.5 * strength }));
      keychain.on(ObjectEvents.KeychainSwingEnd, () => { if (this.swingingId === entry.catId) this.swingingId = null; });
      parts.push(keychain);
    } else {
      // An empty hook: the cat in pencil, a little under the hook.
      parts.push(sketchImage(scene, entry.def.texture, SKETCH).setPosition(0, -CELL.hookOffset + 10 + SKETCH / 2));
    }
    parts.push(
      scene.add
        .text(0, CAPTION_Y, entry.name, { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '22px', color: hung ? Ink.tinta : Ink.lineaLapiz, padding: { x: 2, y: 4 } })
        .setOrigin(0.5),
    );
    const face = scene.add.container(0, 0, parts);
    const cell = scene.add.container(0, 0, [face]);
    makeTappable(cell, face, CELL.width, CELL.height, () => this.onTap(entry));
    this.hooks.set(entry.id, { entry, cell, face, keychain, rest });
    return cell;
  }

  private onTap(entry: KeychainEntry) {
    if (this.big) return;
    const hook = this.hooks.get(entry.id);
    if (!hook?.keychain) {
      this.openCard(entry.id, {
        title: entry.name,
        art: { key: entry.def.texture, look: 'sketch' },
        lines: [{ text: keychainLines.hangerEmpty, pencil: true }, { text: keychainLines.hangerHint(entry.name), pencil: true }],
      });
      return;
    }
    // The second tap on the keychain that is already swinging (or was just touched) brings it to the front.
    if (this.focus === entry.catId) return this.openBig(entry);
    this.focus = entry.catId;
    this.swingHook(hook);
  }

  /** Swings one keychain with a jingle of its chain; the one that was swinging stops (one at a time, ADR 0021). */
  private swingHook(hook: Hook, strength = 1) {
    const keychain = hook.keychain;
    if (!keychain) return;
    if (this.swingingId && this.swingingId !== hook.entry.catId) this.hooks.get(`keychain:${this.swingingId}`)?.keychain?.stopSwing();
    this.swingingId = hook.entry.catId;
    getAudio(this.scene).play(SfxKeys.Chain, { volume: 0.7 });
    keychain.swing(strength);
  }

  // ---- The keychain in front ----------------------------------------------

  private openBig(entry: KeychainEntry) {
    if (!entry.recipe || this.big) return;
    const scene = this.scene;
    this.closeCard(true);
    const hook = this.hooks.get(entry.id);
    hook?.keychain?.stopSwing();
    this.swingingId = null;
    getAudio(scene).play(SfxKeys.Paper);

    const sheet = scene.add.graphics();
    sheet.fillStyle(PAPER, 0.96).fillRoundedRect(-PAGE_AREA.width / 2, -PAGE_AREA.height / 2, PAGE_AREA.width, PAGE_AREA.height, 26);
    const scrim = scene.add.zone(0, 0, PAGE_AREA.width, PAGE_AREA.height).setInteractive({ useHandCursor: true });
    const keychain = new Keychain(scene, BIG.hang.x, BIG.hang.y, entry.recipe, keychainData(this.ctx.catalog, this.anchors), { px: 512 });
    const scale = fitKeychain(BIG.fit, keychain.layout, keychain.layout.hang);
    keychain.setScale(scale);
    keychain.on(ObjectEvents.KeychainTink, (strength: number) => getAudio(scene).play(SfxKeys.Porcelain, { volume: 0.25 + 0.5 * strength }));
    // The keychain's own box is centered on its hang point, so the zone that catches the finger sits on the body instead.
    const body = { w: keychain.layout.width * scale, h: (keychain.layout.height - keychain.layout.hang.y) * scale };
    const zone = scene.add.zone(BIG.hang.x, BIG.hang.y + body.h / 2, body.w, body.h).setInteractive({ draggable: true, useHandCursor: true });
    this.wireBig(zone, keychain);
    const title = scene.add.text(-250, -80, entry.name, { fontFamily: Fonts.Title, fontSize: '64px', color: Ink.tinta, padding: { x: 4, y: 10 } }).setOrigin(0.5);
    const stars = scene.add.text(-250, -10, keychainLines.hangerStars(entry.stars ?? 1), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '40px', color: Ink.lapiz, padding: { x: 4, y: 8 } }).setOrigin(0.5);
    const view = scene.add.container(0, 0, [sheet, scrim, title, stars, keychain, zone]);
    scrim.on('pointerup', () => this.closeBig());
    this.add(view);
    this.big = { catId: entry.catId, view, scrim, zone, keychain };
    const p = profileOf(scene);
    view.setAlpha(0);
    scene.tweens.add({ targets: view, alpha: 1, duration: p.reduced ? 180 : 140 });
    // It swings at once, even while its silhouette waits for the drawing: the picture fades in already moving.
    keychain.swing(1);
  }

  /** A tap swings the keychain again; a drag pushes it to the side of the finger and lets it swing when released. */
  private wireBig(zone: Phaser.GameObjects.Zone, keychain: Keychain) {
    const scene = this.scene;
    let dragging = false;
    zone.on('drag', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - pointer.downX;
      if (!dragging && Math.abs(dx) < DRAG_MIN) return;
      if (!dragging) {
        dragging = true;
        keychain.stopSwing();
      }
      keychain.setAngle(pushAngle(dx));
    });
    zone.on('dragend', () => {
      if (!dragging) return;
      dragging = false;
      this.lastDragEnd = performance.now();
      getAudio(scene).play(SfxKeys.Chain, { volume: 0.7 });
      keychain.swing(pushStrength(keychain.angle));
    });
    zone.on('pointerup', () => {
      if (performance.now() - this.lastDragEnd < AFTER_DRAG_MS) return;
      getAudio(scene).play(SfxKeys.Chain, { volume: 0.7 });
      keychain.swing(1);
    });
  }

  /** Puts the keychain in front back: it is destroyed (its texture goes with it) and the thumbnail is where it was. */
  closeBig(silent = false) {
    const big = this.big;
    if (!big) return;
    this.big = null;
    this.focus = null;
    if (!silent) getAudio(this.scene).play(SfxKeys.Paper, { volume: 0.8 });
    this.scene.tweens.killTweensOf(big.view);
    big.keychain.destroy();
    big.view.destroy();
  }

  // ---- The flight of the keychain that was just hung ----------------------

  /** Called when the notebook opens: the keychain of `hang` flies from below to its hook, clicks and swings. */
  async reveal(): Promise<void> {
    const catId = this.ctx.hang;
    const hook = catId ? this.hooks.get(`keychain:${catId}`) : undefined;
    const keychain = hook?.keychain;
    if (!hook || !keychain) return;
    try {
      await keychain.whenReady();
    } catch {
      return;
    }
    if (this.gone) return;
    const scene = this.scene;
    const p = profileOf(scene);
    const { rest } = hook;
    keychain.setAlpha(0);
    if (!p.reduced) keychain.setPosition(rest.x + FLIGHT.from.x, rest.y + FLIGHT.from.y).setScale(rest.scale * FLIGHT.scale).setAngle(FLIGHT.angle);
    await new Promise<void>((resolve) => {
      scene.tweens.add(
        p.reduced
          ? { targets: keychain, alpha: 1, duration: 300, onComplete: () => resolve() }
          : { targets: keychain, alpha: 1, x: rest.x, y: rest.y, scale: rest.scale, angle: 0, duration: FLIGHT.ms, ease: 'Back.easeOut', onComplete: () => resolve() },
      );
    });
    if (this.gone) return;
    getAudio(scene).play(SfxKeys.Click);
    this.swingHook(hook);
    this.sparkle(hook);
  }

  /** A few stars jump out of the hook when the keychain lands on it (none with reduced motion). */
  private sparkle(hook: Hook) {
    const p = profileOf(this.scene);
    if (p.reduced) return;
    const side = this.half(hangerHooks(this.entries.length)[this.entries.indexOf(hook.entry)]!.side);
    const n = p.count(6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const star = this.scene.add.image(hook.cell.x, hook.cell.y + hook.rest.y, TextureKeys.Sparkle).setScale(0.3).setAlpha(0.95);
      side.add(star);
      this.scene.tweens.add({
        targets: star, x: star.x + Math.cos(a) * 46, y: star.y + Math.sin(a) * 46, alpha: 0, scale: 0.1, angle: 90, duration: 420, ease: 'Sine.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  destroy(fromScene?: boolean): void {
    this.gone = true;
    const tweens = this.scene?.tweens;
    this.closeBig(true);
    for (const hook of this.hooks.values()) {
      if (tweens) {
        tweens.killTweensOf(hook.cell);
        tweens.killTweensOf(hook.face);
        if (hook.keychain) tweens.killTweensOf(hook.keychain);
      }
      hook.keychain?.destroy();
    }
    this.hooks.clear();
    super.destroy(fromScene);
  }
}
