// Pure TS, no Phaser (ADR 0010). Slot z order from ADR 0003, back to front.
export const SLOT_ORDER = ['body', 'bottom', 'sweater', 'neck', 'head', 'face', 'paws', 'accessory'] as const;

export type Slot = (typeof SLOT_ORDER)[number];

export function slotZIndex(slot: Slot): number {
  return SLOT_ORDER.indexOf(slot);
}

export function compareSlots(a: Slot, b: Slot): number {
  return slotZIndex(a) - slotZIndex(b);
}
