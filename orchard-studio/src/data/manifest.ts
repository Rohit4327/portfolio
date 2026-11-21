/** Content manifest (Section 17). The owner swaps content in public/media without touching code. */
import fallback from '../../public/media/manifest.json';
import { CONFIG } from '../config';

export type Manifest = typeof fallback & { memories: string[] };
export interface Available {
  media: string[];
  audio: string[];
  hdri: string[];
  textures: string[];
  models: string[];
}

export let CONTENT: Manifest = fallback as Manifest;
export let AVAILABLE: Available = { media: [], audio: [], hdri: [], textures: [], models: [] };

/** True if the owner has supplied this media file (so we never request files that are not there). */
export const hasMedia = (path: string | undefined): path is string => !!path && AVAILABLE.media.includes(path.replace(/^media\//, ''));

export async function loadContent(): Promise<void> {
  try {
    const [a, m] = await Promise.all([fetch('./available.json').then((r) => (r.ok ? r.json() : null)), fetch('./media/manifest.json').then((r) => (r.ok ? r.json() : null))]);
    if (a) AVAILABLE = { ...AVAILABLE, ...(a as Available) };
    if (m) CONTENT = { ...(fallback as Manifest), ...(m as Partial<Manifest>) } as Manifest;
  } catch {
    // Offline from file:// or a host that blocks fetch: the bundled defaults are used.
  }
  if (CONTENT.brandName) CONFIG.brandName = CONTENT.brandName;
  if (CONTENT.roomNames?.length === 2) CONFIG.roomNames = CONTENT.roomNames;
}
