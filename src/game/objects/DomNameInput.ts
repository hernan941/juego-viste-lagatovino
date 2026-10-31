import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import { nameOverlayRect } from '../domain/catName';
import type { Rect } from '../domain/types';

/**
 * A real <input> for the cat's name (ADR 0014): the only way to open a phone's virtual keyboard. It is created inside the tap
 * (the browser only gives the focus to a gesture), laid over the name field of the canvas (so the browser scrolls it above the
 * keyboard) and invisible: the field of the canvas keeps drawing the text. It leaves the page on blur, so the game gets the
 * pointer back, and its listeners go with it.
 *
 * With `persistent` (touch) the input is mounted before the tap and stays over the field, catching the finger itself: the focus
 * then comes from the browser's own touch on a real input, the one path every phone accepts for the keyboard. Focusing from the
 * game's pointerup (a synthetic, preventDefault-ed touchend) is not reliable on iOS Safari or Chrome Android.
 */
export class DomNameInput {
  private el: HTMLInputElement | null = null;
  private field: Rect | null = null;

  constructor(
    private readonly canvas: () => HTMLCanvasElement,
    private readonly handlers: { onInput(value: string): void; onEnter(): void; onClose?(): void },
    private readonly maxLength: number,
    private readonly persistent = false,
  ) {}

  get focused(): boolean {
    return this.el !== null && document.activeElement === this.el;
  }

  /** Opens the keyboard over `field` (game coordinates) with `value` in it. Call it from a pointer handler. */
  open(field: Rect, value: string): void {
    if (this.el) {
      this.el.value = value;
      this.el.focus();
      return;
    }
    this.field = field;
    const el = document.createElement('input');
    el.type = 'text';
    el.value = value;
    // Emoji take two UTF-16 units: the real limit is applied by sanitizeName, this one only stops a runaway paste.
    el.maxLength = this.maxLength * 4;
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('autocapitalize', 'words');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('enterkeyhint', 'done');
    el.setAttribute('aria-label', 'Nombre del gatito');
    el.spellcheck = false;
    Object.assign(el.style, {
      position: 'fixed',
      // 16 px or more: iOS zooms into smaller fields. Transparent: the canvas draws the text.
      fontSize: '16px', opacity: this.persistent ? '0.01' : '0', border: '0', padding: '0', margin: '0', background: 'transparent', color: 'transparent', caretColor: 'transparent',
      outline: 'none', pointerEvents: this.persistent ? 'auto' : 'none', userSelect: 'text', zIndex: '50', touchAction: 'manipulation',
    });
    this.place(el);
    if (this.persistent) window.addEventListener('resize', this.onResize);
    el.addEventListener('input', this.onInput);
    el.addEventListener('keydown', this.onKeyDown);
    el.addEventListener('blur', this.onBlur);
    document.body.append(el);
    this.el = el;
    if (!this.persistent) el.focus({ preventScroll: false });
  }

  /** Whether the input is on the page (always, in persistent mode, once mounted). */
  get mounted(): boolean {
    return this.el !== null;
  }

  private place(el: HTMLInputElement): void {
    if (!this.field) return;
    const r = nameOverlayRect(this.canvas().getBoundingClientRect(), this.field, GAME_WIDTH, 44);
    Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }

  private readonly onResize = () => {
    if (this.el) this.place(this.el);
  };

  /** Rewrites the text of the field (when the game refused part of what was typed). */
  setValue(value: string): void {
    if (this.el) this.el.value = value;
  }

  /** Closes the keyboard. The persistent input stays over the field, ready for the next tap. */
  close(): void {
    this.el?.blur();
    if (!this.persistent) this.remove();
  }

  destroy(): void {
    this.remove();
  }

  private readonly onInput = () => {
    if (this.el) this.handlers.onInput(this.el.value);
  };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') this.handlers.onEnter();
  };

  private readonly onBlur = () => {
    if (this.persistent) this.handlers.onClose?.();
    else this.remove();
  };

  private remove(): void {
    const el = this.el;
    if (!el) return;
    this.el = null;
    window.removeEventListener('resize', this.onResize);
    el.removeEventListener('input', this.onInput);
    el.removeEventListener('keydown', this.onKeyDown);
    el.removeEventListener('blur', this.onBlur);
    el.remove();
    this.handlers.onClose?.();
  }
}

/** The canvas of a scene's game, for DomNameInput. */
export const canvasOf = (scene: Phaser.Scene) => () => scene.game.canvas;
