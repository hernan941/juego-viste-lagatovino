import { Scene } from 'phaser';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Palette, RegistryKeys, SceneKeys, colorToNumber } from '../constants';
import anchorsJson from '../data/anchors.json';
import { buildManifest } from '../data/assets';
import catsJson from '../data/cats.json';
import clothesJson from '../data/clothes.json';
import combosJson from '../data/combos.json';
import { assertCatalog, validateAnchors } from '../data/schema';
import { createParticleTextures } from '../objects/particleTextures';
import { enterKind, transitionIn, transitionTo } from '../systems/transitions';

export class Preloader extends Scene {
  private enter: ReturnType<typeof enterKind> = null;

  constructor() {
    super(SceneKeys.Preloader);
  }

  init(data?: unknown) {
    this.enter = enterKind(data);
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, 468, 32).setStrokeStyle(4, colorToNumber(Palette.contorno)).setFillStyle(colorToNumber(Palette.crema));
    const bar = this.add.rectangle(cx - 230, cy, 4, 24, colorToNumber(Palette.rosa400));
    this.add
      .text(cx, cy - 50, 'Cargando...', { fontFamily: FONT_FAMILY, fontSize: '32px', color: Palette.texto })
      .setOrigin(0.5);
    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 456 * progress;
    });
  }

  preload() {
    // Fail early on bad data (ADR 0010), then load exactly what the catalog lists.
    const catalog = assertCatalog({ cats: catsJson, clothes: clothesJson, combos: combosJson });
    const anchors = validateAnchors(anchorsJson);
    if (!anchors.ok) throw new Error(`Anclas inválidas:\n- ${anchors.errors.join('\n- ')}`);
    this.registry.set(RegistryKeys.Catalog, catalog);
    this.registry.set(RegistryKeys.Anchors, anchors.value);
    for (const a of buildManifest(catalog.cats, catalog.clothes)) {
      this.load.svg(a.key, a.path, { width: a.size, height: a.size });
    }
  }

  create() {
    createParticleTextures(this);
    // F2 provisional flow: Boot -> Preloader -> DressUp (Title and CatSelect come in F5).
    transitionIn(this, this.enter, () => transitionTo(this, SceneKeys.DressUp, {}, 'iris'));
  }
}
