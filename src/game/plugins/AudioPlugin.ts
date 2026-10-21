// Global Plugin (ADR 0010): sound effects with pitch variation, a per-key limit and a persisted mute.
// The rules live in audioService.ts (unit-tested); this class only connects them to Phaser's SoundManager.
import Phaser from 'phaser';
import { PluginKeys } from '../constants';
import { AudioService, type PlayConfig, type PlayOptions, type SoundBackend } from './audioService';

class PhaserBackend implements SoundBackend {
  constructor(private readonly sound: Phaser.Sound.BaseSoundManager, private readonly cache: Phaser.Cache.CacheManager) {}

  // Phaser unlocks the SoundManager by itself on the first pointer/key gesture (browser autoplay policy).
  get locked(): boolean {
    return this.sound.locked;
  }

  play(key: string, config: PlayConfig, onDone: () => void): boolean {
    if (!this.cache.audio.exists(key)) return false;
    const s = this.sound.add(key, config);
    const finish = () => {
      onDone();
      s.destroy();
    };
    s.once(Phaser.Sound.Events.COMPLETE, finish);
    s.once(Phaser.Sound.Events.STOP, finish);
    if (s.play()) return true;
    s.off(Phaser.Sound.Events.COMPLETE, finish);
    s.off(Phaser.Sound.Events.STOP, finish);
    s.destroy();
    return false;
  }

  setMute(muted: boolean): void {
    this.sound.mute = muted;
  }
}

export class AudioPlugin extends Phaser.Plugins.BasePlugin {
  private service!: AudioService;

  init(): void {
    this.service = new AudioService({
      backend: new PhaserBackend(this.game.sound, this.game.cache),
      storage: window.localStorage,
    });
  }

  get muted(): boolean {
    return this.service.muted;
  }

  /** Plays one effect (key from SfxKeys). Returns false if it was muted, limited or the audio is still locked. */
  play(key: string, options?: PlayOptions): boolean {
    return this.service.play(key, options);
  }

  /** Plays one of the keys at random (for example MEOW_KEYS). */
  playRandom(keys: readonly string[], options?: PlayOptions): boolean {
    return this.service.playRandom(keys, options);
  }

  setMuted(muted: boolean): void {
    this.service.setMuted(muted);
  }

  toggleMute(): boolean {
    return this.service.toggleMute();
  }
}

/** The AudioPlugin of the game a scene belongs to. */
export function getAudio(scene: Phaser.Scene): AudioPlugin {
  return scene.plugins.get(PluginKeys.Audio) as AudioPlugin;
}
