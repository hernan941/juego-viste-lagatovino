import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import type { Rect } from '../domain/types';

/**
 * A real <input> for the cat's name (ADR 0014): the only way to open a phone's virtual keyboard. It is created inside the tap
 * (the browser only gives the focus to a gesture), laid over the name field of the canvas (so the browser scrolls it above the
 * keyboard) and invisible: the field of the canvas keeps drawing the text. It leaves the page on blur, so the game gets the
 * pointer back, and its listeners go with it.
 */
export class DomNameInput {
  private el: HTMLInputElement | null = null;

  constructor(
    private readonly canvas: () => HTMLCanvasElement,
    private readonly handlers: { onInput(value: string): void; onEnter(): void; onClose?(): void },
    private readonly maxLength: number,
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
    const box = this.canvas().getBoundingClientRect();
    const k = box.width / GAME_WIDTH;
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
      position: 'fixed', left: `${box.left + field.x * k}px`, top: `${box.top + field.y * k}px`, width: `${field.width * k}px`, height: `${field.height * k}px`,
      // 16 px or more: iOS zooms into smaller fields. Transparent: the canvas draws the text.
      fontSize: '16px', opacity: '0', border: '0', padding: '0', margin: '0', background: 'transparent', color: 'transparent', caretColor: 'transparent',
      outline: 'none', pointerEvents: 'none', userSelect: 'text', zIndex: '50',
    });
    el.addEventListener('input', this.onInput);
    el.addEventListener('keydown', this.onKeyDown);
    el.addEventListener('blur', this.onBlur);
    document.body.append(el);
    this.el = el;
    el.focus({ preventScroll: false });
  }

  /** Rewrites the text of the field (when the game refused part of what was typed). */
  setValue(value: string): void {
    if (this.el) this.el.value = value;
  }

  /** Closes the keyboard. */
  close(): void {
    this.el?.blur();
    this.remove();
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

  private readonly onBlur = () => this.remove();

  private remove(): void {
    const el = this.el;
    if (!el) return;
    this.el = null;
    el.removeEventListener('input', this.onInput);
    el.removeEventListener('keydown', this.onKeyDown);
    el.removeEventListener('blur', this.onBlur);
    el.remove();
    this.handlers.onClose?.();
  }
}

/** The canvas of a scene's game, for DomNameInput. */
export const canvasOf = (scene: Phaser.Scene) => () => scene.game.canvas;
