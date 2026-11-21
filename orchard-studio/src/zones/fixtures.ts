/** Studio fixtures per layout. Filled in during Phase 3; Phase 1 is architecture and desks only. */
import type * as THREE from 'three';
import type { LayoutId } from '../config';
import type { ViewMode } from '../scenes/studio';

/** Named things the interactions and the UI need to find at runtime. */
export interface Registry {
  objects: Record<string, THREE.Object3D>;
  screens: Record<string, THREE.Material>;
}
export interface FixturePart {
  name: string;
  group: THREE.Object3D;
  layouts?: LayoutId[];
  mode?: ViewMode;
  merge?: boolean;
}

export function buildFixtureParts(_registry: Registry): FixturePart[] {
  return [];
}
