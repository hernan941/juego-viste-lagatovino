// The DressUp controllers, in the order they are attached (ADR 0019). A feature adds ONE line here and its own file
// in this folder. Order across features: S3, then S2, then S4 (docs/roadmap.md, "Archivos calientes").
import type { DressUpControllerFactory } from './DressUpController';
import { HintController } from './HintController';
import { SecretsController } from './SecretsController';
import { TasteReactions } from './TasteReactions';

export const controllerFactories: readonly DressUpControllerFactory[] = [
  () => new SecretsController(),
  () => new HintController(),
  () => new TasteReactions(),
];
