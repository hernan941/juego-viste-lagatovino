import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import { validateCats } from '../../src/game/data/schema';

// F3: the 12 common cats of docs/art-direction.md §2 (ids and provisional names).
const CAST: [string, string][] = [
  ['naranja', 'Naranjito'], ['negro', 'Luna'], ['calico', 'Tricolor'],
  ['gris', 'Grisú'], ['blanco', 'Nieve'], ['esmoquin', 'Michi'], ['carey', 'Carey'],
  ['siames', 'Siamés'], ['marron', 'Canela'], ['crema', 'Vainilla'], ['azul', 'Humo'],
  ['naranja-blanco', 'Mandarina'],
];

const publicFiles = new Set(Object.keys(import.meta.glob('/public/assets/cats/**/*.svg')));
const coatFiles = new Set(Object.keys(import.meta.glob('/art/cats/coats/*.svg')));
const fullCats = new Set(Object.keys(import.meta.glob('/art/cats/*.svg')));

describe('cat cast (F3)', () => {
  it('has at least 9 cats (the MVP minimum) and passes the schema', () => {
    expect(cats.length).toBeGreaterThanOrEqual(9);
    const r = validateCats(cats);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('has the 12 common cats of art-direction §2', () => {
    expect(cats.map((c) => [c.id, c.name])).toEqual(CAST);
  });

  it('has unique ids, names and textures', () => {
    for (const key of ['id', 'name', 'texture'] as const) {
      const values = cats.map((c) => c[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it('names each texture after its id', () => {
    for (const c of cats) expect(c.texture).toBe(`cat-${c.id}`);
  });

  it('every cat has its coat, its composed SVG and its runtime texture (run npm run art if this fails)', () => {
    for (const c of cats) {
      expect(coatFiles.has(`/art/cats/coats/${c.id}.svg`), `coat ${c.id}`).toBe(true);
      expect(fullCats.has(`/art/cats/${c.id}.svg`), `art ${c.id}`).toBe(true);
      expect(publicFiles.has(`/public/assets/cats/noface/${c.id}.svg`), `public ${c.id}`).toBe(true);
      expect(publicFiles.has(`/public/assets/cats/tail/${c.id}.svg`), `tail ${c.id}`).toBe(true);
    }
  });
});
