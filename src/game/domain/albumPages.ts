// Pure TS, no Phaser (ADR 0010). The notebook of the album: its five tabs, which page comes next and when a drag turns it.
import type { Tally } from './album';

export const ALBUM_TAB_IDS = ['prendas', 'gatos', 'looks', 'tintes', 'colgador'] as const;
export type AlbumTabId = (typeof ALBUM_TAB_IDS)[number];

export interface AlbumTab {
  id: AlbumTabId;
  /** Spanish name, shown under the tabs. */
  label: string;
  /** Texture key of the tab icon. */
  icon: string;
  /** Brand color of the index tab (an `Ink` token). */
  color: 'sol' | 'rosa' | 'cielo' | 'lila' | 'durazno';
  /** The hanger (the keychains of S8) stays off until F19.5. */
  enabled: boolean;
}

export const ALBUM_TABS: readonly AlbumTab[] = [
  { id: 'prendas', label: 'Prendas', icon: 'ui-album-tab-prendas', color: 'sol', enabled: true },
  { id: 'gatos', label: 'Gatos', icon: 'ui-album-tab-gatos', color: 'rosa', enabled: true },
  { id: 'looks', label: 'Looks especiales', icon: 'ui-album-tab-looks', color: 'cielo', enabled: true },
  { id: 'tintes', label: 'Tintes', icon: 'ui-album-tab-tintes', color: 'lila', enabled: true },
  { id: 'colgador', label: 'Colgador', icon: 'ui-album-tab-colgador', color: 'durazno', enabled: false },
];

/** A drag of this many game px or more turns the page. */
export const SWIPE_MIN = 60;

const FIRST: AlbumTabId = 'prendas';
const enabled = ALBUM_TABS.filter((t) => t.enabled);

/** The tab to open: the asked one if it exists and is enabled, the first one otherwise. */
export function resolveTab(tab: unknown): AlbumTabId {
  return enabled.find((t) => t.id === tab)?.id ?? FIRST;
}

/** The enabled tab one step `dir` (1 forward, -1 back) from `tab`; it stays at the ends. */
export function turnTo(tab: AlbumTabId, dir: 1 | -1): AlbumTabId {
  const i = enabled.findIndex((t) => t.id === tab);
  return enabled[Math.min(enabled.length - 1, Math.max(0, i + dir))]!.id;
}

/** What a horizontal drag of `dx` px does: left turns forward (1), right turns back (-1), a short one nothing (0). */
export function swipeDirection(dx: number): 1 | -1 | 0 {
  if (Math.abs(dx) < SWIPE_MIN) return 0;
  return dx < 0 ? 1 : -1;
}

const SECTION_OF: Record<AlbumTabId, 'items' | 'tastes' | 'combos' | 'dyes' | 'keychains'> = {
  prendas: 'items', gatos: 'tastes', looks: 'combos', tintes: 'dyes', colgador: 'keychains',
};

/** What a page counts: the section of the album completion that it shows. */
export function pageTally(tab: AlbumTabId, sections: Record<'items' | 'tastes' | 'combos' | 'dyes' | 'keychains', Tally>): Tally {
  return sections[SECTION_OF[tab]];
}
