// Pure TS, no Phaser (ADR 0010). The scene flow of ADR 0007 as a table: scenes call `nextStep`, never `scene.start`.
import { SceneKeys } from '../constants';

/** How the screen changes (400 to 600 ms, art-direction section 8). */
export const TRANSITION_KINDS = ['fade', 'iris', 'heart', 'paw'] as const;
export type TransitionKind = (typeof TRANSITION_KINDS)[number];

export const FLOW_ACTIONS = ['boot', 'loaded', 'start', 'choose', 'enter', 'finish', 'keepDressing', 'change'] as const;
export type FlowAction = (typeof FLOW_ACTIONS)[number];

export interface FlowStep {
  scene: string;
  transition: TransitionKind;
}

const FLOW: Record<string, Partial<Record<FlowAction, FlowStep>>> = {
  [SceneKeys.Boot]: { boot: { scene: SceneKeys.Preloader, transition: 'fade' } },
  [SceneKeys.Preloader]: { loaded: { scene: SceneKeys.Title, transition: 'fade' } },
  [SceneKeys.Title]: { start: { scene: SceneKeys.CatSelect, transition: 'paw' } },
  [SceneKeys.CatSelect]: { choose: { scene: SceneKeys.ShopEntrance, transition: 'heart' } },
  [SceneKeys.ShopEntrance]: { enter: { scene: SceneKeys.DressUp, transition: 'heart' } },
  [SceneKeys.DressUp]: {
    finish: { scene: SceneKeys.Showcase, transition: 'heart' },
    change: { scene: SceneKeys.CatSelect, transition: 'paw' },
  },
  [SceneKeys.Showcase]: {
    keepDressing: { scene: SceneKeys.DressUp, transition: 'heart' },
    change: { scene: SceneKeys.CatSelect, transition: 'paw' },
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
