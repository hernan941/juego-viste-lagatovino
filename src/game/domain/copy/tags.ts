// Pure TS. The readable forms of the tags (tags.json); an unknown tag shows its id, so nothing breaks.
import type { TagName, TagNames } from '../types';

const form = (names: TagNames | undefined, tag: string, which: keyof TagName): string => names?.[tag]?.[which] ?? tag;

/** "clásico": the chip of the cat sheet. */
export const tagLabel = (names: TagNames | undefined, tag: string): string => form(names, tag, 'label');
/** "el invierno": for "Le encanta {love}" and "No le tinca {love}". */
export const tagLove = (names: TagNames | undefined, tag: string): string => form(names, tag, 'love');
/** "Todo muy clásico": the whole line of harmony. */
export const tagStyle = (names: TagNames | undefined, tag: string): string => form(names, tag, 'style');
