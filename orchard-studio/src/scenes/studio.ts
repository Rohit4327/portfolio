/**
 * Assembles the one scene graph used by both the table model and the walkthrough. Every piece is a "part"
 * with the layouts and mode it belongs to; switching layout or mode only toggles visibility and instance
 * counts. Nothing is rebuilt.
 */
import * as THREE from 'three';
import { LAYOUT_IDS, type LayoutId } from '../config';
import { buildContext } from '../architecture/context';
import { buildDoors, type DoorRig } from '../architecture/doors';
import { buildBaseFloors, buildCeilings, buildFloorPatches, buildGlassPane, buildRoofOccluder, buildWalls, buildWindows } from '../architecture/shell';
import { group, mergeStatic, setInstanceCount } from '../core/build';
import { DESK_COUNT, GLASS } from '../data/plan';
import { buildWorkfloor, type Workfloor } from '../zones/workfloor';
import { buildFixtureParts, type Registry } from '../zones/fixtures';
import { buildApproachDetails } from '../zones/approach';

export type ViewMode = 'model' | 'walk';
export interface Part {
  name: string;
  group: THREE.Object3D;
  /** Layouts this part belongs to (all when omitted). */
  layouts?: LayoutId[];
  /** Mode this part belongs to (both when omitted). */
  mode?: ViewMode;
}
export interface Studio {
  root: THREE.Group;
  parts: Part[];
  doors: Record<string, DoorRig>;
  workfloor: Workfloor;
  registry: Registry;
  layout: LayoutId;
  mode: ViewMode;
  /** Parts that became visible on the last apply() and should rise into place. */
  entering: Part[];
  apply(layout: LayoutId, mode: ViewMode): void;
}

export interface BuildOptions {
  /** Merge static meshes per material (off in geometry tests so individual pieces can be read back). */
  merge?: boolean;
  /** Skip furniture and fixtures: architecture only. */
  shellOnly?: boolean;
}

export function buildStudio(o: BuildOptions = {}): Studio {
  const merge = o.merge ?? true;
  const root = group('studio');
  const parts: Part[] = [];
  const add = (name: string, g: THREE.Object3D, layouts?: LayoutId[], mode?: ViewMode, mergeIt = true) => {
    g.name = name;
    if (merge && mergeIt) mergeStatic(g);
    root.add(g);
    parts.push({ name, group: g, layouts, mode });
    return g;
  };

  add('shell', group('shell', buildWalls(), buildWindows(), buildBaseFloors()));
  const ceilings = buildCeilings();
  add('ceilings', ceilings, undefined, 'walk');
  ceilings.traverse((n) => {
    // Ceilings never need to cast: the roof occluder does that with one box.
    n.castShadow = false;
  });
  add('roof', buildRoofOccluder(), undefined, 'walk', false);
  add('context', buildContext(), undefined, 'model');

  // Glass, grouped by the set of layouts each pane belongs to.
  const glassGroups = new Map<string, { layouts: LayoutId[]; g: THREE.Group }>();
  for (const gl of GLASS) {
    const key = gl.layouts.join('+');
    if (!glassGroups.has(key)) glassGroups.set(key, { layouts: gl.layouts, g: group(`glass:${key}`) });
    glassGroups.get(key)!.g.add(buildGlassPane(gl));
  }
  for (const [key, v] of glassGroups) add(`glass:${key}`, v.g, v.layouts.length === LAYOUT_IDS.length ? undefined : v.layouts);
  for (const layout of LAYOUT_IDS) add(`floorPatches:${layout}`, buildFloorPatches(layout), [layout]);

  // Doors.
  const doors = buildDoors();
  add('doors-static', doors.statics);
  add('door-team', doors.teamDoor, ['recommended', 'keep9', 'rejected']);
  const dyn = group('doors-dynamic');
  for (const r of Object.values(doors.rigs)) dyn.add(r.group);
  add('doors-dynamic', dyn, undefined, undefined, false);

  const workfloor = buildWorkfloor(!!o.shellOnly);
  add('workfloor', workfloor.group, undefined, undefined, false);

  const registry: Registry = { objects: {}, screens: {} };
  if (!o.shellOnly) {
    add('approach-details', buildApproachDetails(registry));
    for (const fp of buildFixtureParts(registry)) add(fp.name, fp.group, fp.layouts, fp.mode, fp.merge !== false);
  }

  root.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.isMesh && !m.name.startsWith('merged:') && !(m as unknown as THREE.InstancedMesh).isInstancedMesh && m.userData.shadow !== false) {
      const mat = m.material as THREE.Material;
      if (!mat.transparent && !m.userData.noShadow) m.receiveShadow = true;
    }
  });

  const studio: Studio = {
    root,
    parts,
    doors: doors.rigs,
    workfloor,
    registry,
    layout: 'recommended',
    mode: 'model',
    entering: [],
    apply(layout, mode) {
      studio.entering = [];
      for (const p of parts) {
        const on = (!p.layouts || p.layouts.includes(layout)) && (!p.mode || p.mode === mode);
        if (on && !p.group.visible && p.layouts) studio.entering.push(p);
        p.group.visible = on;
      }
      for (const g of workfloor.prefixGroups) setInstanceCount(g.group, g.countFor(DESK_COUNT[layout], layout));
      studio.layout = layout;
      studio.mode = mode;
    },
  };
  // Start hidden so the first apply() reports nothing as "entering".
  studio.apply('recommended', 'model');
  studio.entering = [];
  return studio;
}
