// Pure TS, no Phaser (ADR 0010). The scene flow of ADR 0007 as a table: scenes call `nextStep`, never `scene.start`.
import { SceneKeys } from '../constants';

/** How the screen changes (400 to 600 ms, art-direction section 8). */
export const TRANSITION_KINDS = ['fade', 'iris', 'heart', 'paw', 'star', 'flash'] as const;
export type TransitionKind = (typeof TRANSITION_KINDS)[number];

export const FLOW_ACTIONS = ['boot', 'loaded', 'start', 'choose', 'enter', 'finish', 'keepDressing', 'change', 'album', 'back', 'photo', 'hang'] as const;
export type FlowAction = (typeof FLOW_ACTIONS)[number];

export interface FlowStep {
  scene: string;
  transition: TransitionKind;
}

const OPEN_ALBUM: FlowStep = { scene: SceneKeys.Album, transition: 'star' };

const FLOW: Record<string, Partial<Record<FlowAction, FlowStep>>> = {
  [SceneKeys.Boot]: { boot: { scene: SceneKeys.Preloader, transition: 'fade' } },
  [SceneKeys.Preloader]: { loaded: { scene: SceneKeys.Title, transition: 'fade' } },
  [SceneKeys.Title]: { start: { scene: SceneKeys.CatSelect, transition: 'paw' }, album: OPEN_ALBUM },
  [SceneKeys.CatSelect]: { choose: { scene: SceneKeys.ShopEntrance, transition: 'heart' } },
  [SceneKeys.ShopEntrance]: { enter: { scene: SceneKeys.DressUp, transition: 'heart' } },
  [SceneKeys.DressUp]: {
    finish: { scene: SceneKeys.Showcase, transition: 'heart' },
    change: { scene: SceneKeys.CatSelect, transition: 'paw' },
    album: OPEN_ALBUM,
  },
  [SceneKeys.Showcase]: {
    keepDressing: { scene: SceneKeys.DressUp, transition: 'heart' },
    change: { scene: SceneKeys.CatSelect, transition: 'paw' },
    photo: { scene: SceneKeys.PhotoMode, transition: 'flash' },
    album: OPEN_ALBUM,
  },
  // `back` has a dynamic destination (see `backStep`); this entry is its fallback.
  [SceneKeys.Album]: { back: { scene: SceneKeys.Title, transition: 'fade' } },
  [SceneKeys.PhotoMode]: {
    keepDressing: { scene: SceneKeys.DressUp, transition: 'heart' },
    hang: OPEN_ALBUM,
  },
};

/** Where `action` leads from `scene`, or null when that scene has no such exit. */
export function nextStep(scene: string, action: FlowAction): FlowStep | null {
  return FLOW[scene]?.[action] ?? null;
}

/** Combo ids whose prize was delivered quietly when the player left the fitting room without opening the gift. */
export function giftedFrom(data: unknown): string[] {
  const gifted = (data as { gifted?: unknown } | null | undefined)?.gifted;
  return Array.isArray(gifted) ? gifted.filter((id): id is string => typeof id === 'string') : [];
}

/** Scenes the album may return to (ADR 0019): anything else goes to Title. */
const BACK_ALLOWED: readonly string[] = [SceneKeys.Title, SceneKeys.DressUp, SceneKeys.Showcase];

export interface BackStep extends FlowStep {
  /** The state of the origin, handed back as it came in `fromData`. */
  data: Record<string, unknown>;
}

/** Where the album's "Volver" leads: the allowed `from`, with its `fromData` (the Showcase does not replay its ceremony). */
export function backStep(albumData: unknown): BackStep {
  const d = (albumData ?? {}) as { from?: unknown; fromData?: unknown };
  const from = typeof d.from === 'string' && BACK_ALLOWED.includes(d.from) ? d.from : SceneKeys.Title;
  const fromData = typeof d.fromData === 'object' && d.fromData !== null ? { ...(d.fromData as Record<string, unknown>) } : {};
  return { scene: from, transition: 'fade', data: from === SceneKeys.Showcase ? { ...fromData, replay: false } : fromData };
}

/** What a scene passes when it opens the album: where to come back to and the state to hand back. */
export function albumArgs(from: string, fromData: object = {}): { from: string; fromData: object } {
  return { from, fromData };
}

/** What the photo mode passes when the keychain is hung: the hanger tab, and back to DressUp afterwards. */
export function hangArgs(catId: string): { from: string; tab: 'colgador'; hang: string } {
  return { from: SceneKeys.DressUp, tab: 'colgador', hang: catId };
}

/** What DressUp hands to the album so it finds its fitting room as it was: the tab it was on and how far its grid was scrolled. */
export function dressUpAlbumData(tab: string | null, scroll: number): { tab?: string; scroll: number } {
  return tab ? { tab, scroll } : { scroll };
}

export interface DressUpRestore {
  tab: string | null;
  scroll: number;
}

/** Reads `dressUpAlbumData` back when the album returns it (anything that is not a name or a number is dropped). */
export function dressUpRestore(data: unknown): DressUpRestore {
  const d = (typeof data === 'object' && data !== null ? data : {}) as { tab?: unknown; scroll?: unknown };
  const tab = typeof d.tab === 'string' && d.tab !== '' ? d.tab : null;
  const scroll = typeof d.scroll === 'number' && Number.isFinite(d.scroll) && d.scroll > 0 ? d.scroll : 0;
  return { tab, scroll };
}
