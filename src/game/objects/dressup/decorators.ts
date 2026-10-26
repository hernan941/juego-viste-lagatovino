// Cell decorations (ADR 0019): the grid rebuilds its cells on every tab change, so a decoration is a function that the
// grid runs on each new cell (and again on `refresh`), not an object that someone attaches once.

export type CellDecorator<T> = (cell: T) => void;

export class DecoratorRegistry<T> {
  private list: CellDecorator<T>[] = [];

  get size(): number {
    return this.list.length;
  }

  /** Adds a decorator and returns the function that removes it. */
  add(fn: CellDecorator<T>): () => void {
    this.list.push(fn);
    return () => {
      this.list = this.list.filter((f) => f !== fn);
    };
  }

  apply(cell: T): void {
    for (const fn of this.list) fn(cell);
  }

  clear(): void {
    this.list = [];
  }
}
