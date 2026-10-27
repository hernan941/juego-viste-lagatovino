// The DressUp controllers, in the order they are attached (ADR 0019). A feature adds ONE line here and its own file
// in this folder. Order across features: S3, then S2, then S4 (docs/roadmap.md, "Archivos calientes").
import type { DressUpControllerFactory } from './DressUpController';
import { CatSheetController } from './CatSheetController';
import { CheckoutController } from './CheckoutController';
import { DyeTabController } from './DyeTabController';
import { HintController } from './HintController';
import { PriceTagsController } from './PriceTagsController';
import { PurchaseController } from './PurchaseController';
import { SecretsController } from './SecretsController';
import { TasteReactions } from './TasteReactions';
import { WalletController } from './WalletController';

export const controllerFactories: readonly DressUpControllerFactory[] = [
  () => new SecretsController(),
  () => new HintController(),
  () => new WalletController(),
  () => new PriceTagsController(),
  () => new PurchaseController(),
  () => new CheckoutController(),
  () => new TasteReactions(),
  () => new CatSheetController(),
  () => new DyeTabController(),
];
