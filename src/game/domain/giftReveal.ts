// Sequence state of the gift prize (F8): from the moment the box opens until the prize lands in its cell,
// the cell stays invisible and the "Secretos X/N" counter does not go up. Pure TS, no Phaser.

export class GiftReveal {
  /** comboId -> item id of the prizes that are still flying. */
  private readonly flying = new Map<string, string>();

  begin(comboId: string, itemId: string): void {
    this.flying.set(comboId, itemId);
  }

  land(comboId: string): void {
    this.flying.delete(comboId);
  }

  get active(): number {
    return this.flying.size;
  }

  isHidden(itemId: string): boolean {
    return [...this.flying.values()].includes(itemId);
  }

  hiddenItems(): string[] {
    return [...this.flying.values()];
  }

  /** The unlocked combos whose prize already landed. */
  shownUnlocked(unlocked: readonly string[]): string[] {
    return unlocked.filter((id) => !this.flying.has(id));
  }

  shownCount(unlocked: readonly string[]): number {
    return this.shownUnlocked(unlocked).length;
  }
}
