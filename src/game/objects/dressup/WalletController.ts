// The purse of the fitting room (F13.3, S3): the jar of buttons with the number, following the progress with ticks, and the
// buttons that fly in and out of it. Other features do not import this: they emit scene events (DressUpEvents.WalletFlight
// and WalletShake), so the buttons and the number stay in step wherever the money comes from.
import { DressUpEvents, RegistryKeys } from '../../constants';
import type { Point, Progress } from '../../domain/types';
import { CoinFlight } from '../CoinFlight';
import { WalletHud } from '../WalletHud';
import type { DressUpContext, DressUpController } from './DressUpController';
import { WALLET_POSITION } from './layout';

/** What a feature sends with `DressUpEvents.WalletFlight`. */
export interface WalletFlightRequest {
  /** `in`: from `at` to the purse (the player earned). `out`: from the purse to `at` (the player paid). */
  direction: 'in' | 'out';
  /** The other end of the flight, in game coordinates (the chip, the garment...). */
  at: Point;
  /** Coins the buttons stand for. */
  coins: number;
}

export class WalletController implements DressUpController {
  readonly key = 'shop';
  private ctx!: DressUpContext;
  private hud!: WalletHud;
  private flights = new Set<CoinFlight>();

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    this.hud = new WalletHud(ctx.scene, WALLET_POSITION.x, WALLET_POSITION.y);
    this.hud.setValue(this.wallet());
    ctx.hud.add(this.hud);
    ctx.scene.registry.events.on(`changedata-${RegistryKeys.Progress}`, this.onProgress, this);
    ctx.scene.events.on(DressUpEvents.WalletFlight, this.onFlight, this);
    ctx.scene.events.on(DressUpEvents.WalletShake, this.onShake, this);
  }

  destroy(): void {
    const { scene } = this.ctx;
    scene.registry.events.off(`changedata-${RegistryKeys.Progress}`, this.onProgress, this);
    scene.events.off(DressUpEvents.WalletFlight, this.onFlight, this);
    scene.events.off(DressUpEvents.WalletShake, this.onShake, this);
    for (const flight of this.flights) flight.cancel();
    this.flights.clear();
    this.hud.destroy();
  }

  e2eState(): { wallet: { shown: number; wallet: number; counting: boolean; held: boolean; flying: number; jar: Point } } {
    return {
      wallet: { shown: this.hud.value, wallet: this.wallet(), counting: this.hud.isCounting, held: this.hud.isHeld, flying: this.flights.size, jar: this.hud.getJarPoint() },
    };
  }

  isSettled(): boolean {
    return this.flights.size === 0 && !this.hud.isCounting;
  }

  private wallet(): number {
    return (this.ctx.scene.registry.get(RegistryKeys.Progress) as Progress | undefined)?.wallet ?? 0;
  }

  /** The progress changed (earned, paid, a test hook): the number ticks to it. */
  private onProgress(_parent: unknown, progress: Progress): void {
    this.hud.countTo(progress.wallet);
  }

  private onShake(): void {
    this.hud.shake();
  }

  /**
   * The number stays where it is while the buttons are in the air; each one moves it as it lands (in) or leaves (out), and when
   * the last one is done it settles on the real wallet, so the progress being written first or last makes no difference.
   */
  private onFlight(request: WalletFlightRequest): void {
    const jar = this.hud.getJarPoint();
    const incoming = request.direction === 'in';
    this.hud.hold();
    // The flight can be done before the constructor returns (nothing to fly), so `onDone` reads it from here.
    const mine: { flight?: CoinFlight } = {};
    const flight = new CoinFlight(this.ctx.scene, {
      from: incoming ? request.at : jar,
      to: incoming ? jar : request.at,
      coins: request.coins,
      onLaunch: incoming ? undefined : (credit) => this.hud.adjust(-credit),
      onLand: incoming ? (credit) => this.hud.adjust(credit) : undefined,
      onDone: () => {
        if (mine.flight) this.flights.delete(mine.flight);
        this.hud.release(this.wallet());
      },
    });
    mine.flight = flight;
    if (flight.active) this.flights.add(flight);
  }
}
