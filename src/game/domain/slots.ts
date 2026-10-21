// Pure TS, no Phaser (ADR 0010). Slot z order from ADR 0003, back to front.
import type { AnchorName, BoxName } from './types';
export const SLOT_ORDER = ['body', 'bottom', 'sweater', 'neck', 'head', 'face', 'paws', 'accessory'] as const;

export type Slot = (typeof SLOT_ORDER)[number];

export function slotZIndex(slot: Slot): number {
  return SLOT_ORDER.indexOf(slot);
}

export function compareSlots(a: Slot, b: Slot): number {
  return slotZIndex(a) - slotZIndex(b);
}

/** Which cat anchor an item of this slot snaps to (magnet, effects). */
export function anchorForSlot(slot: Slot): AnchorName {
  switch (slot) {
    case 'head': return 'head';
    case 'face': return 'eyes';
    case 'neck': return 'neck';
    case 'paws': return 'paws';
    default: return 'torso';
  }
}

/** Which cat box is the hit area of a worn item of this slot (to drag it off). */
export function hitBoxForSlot(slot: Slot): BoxName {
  switch (slot) {
    case 'head':
    case 'face': return 'head';
    case 'paws': return 'paws';
    default: return 'torso';
  }
}
