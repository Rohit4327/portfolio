/** Invisible zone proxy meshes: the only things hover raycasts ever test (with BVH), and the floor tints. */
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
import { LAYOUT_IDS, type LayoutId } from '../config';
import { group, polygonFt } from '../core/build';
import { ZONES } from '../data/plan';

export interface ZoneProxy {
  id: string;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
}
export const zoneProxies: Record<LayoutId, ZoneProxy[]> = { today: [], recommended: [], keep9: [], rejected: [] };

export function buildZoneProxies(): { layout: LayoutId; group: THREE.Group }[] {
  return LAYOUT_IDS.map((layout) => {
    const g = group(`zoneProxies:${layout}`);
    g.userData.dynamic = true;
    zoneProxies[layout] = ZONES[layout].map((z) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x2f6fd0, transparent: true, opacity: 0.15, depthWrite: false, toneMapped: false });
      const mesh = polygonFt(mat, z.polygon, 0.12);
      (computeBoundsTree as unknown as (this: THREE.BufferGeometry) => void).call(mesh.geometry);
      mesh.raycast = acceleratedRaycast;
      mesh.visible = false;
      mesh.renderOrder = 5;
      mesh.name = `zone:${z.id}`;
      g.add(mesh);
      return { id: z.id, mesh, mat };
    });
    return { layout, group: g };
  });
}

/** Tint the hovered zone at 15% and dim the others (4.6). */
export function tintZones(layout: LayoutId, hover: string | null): void {
  for (const p of zoneProxies[layout]) {
    p.mesh.visible = hover !== null;
    if (p.id === hover) {
      p.mat.color.set(0x2f6fd0);
      p.mat.opacity = 0.15;
    } else {
      p.mat.color.set(0xf4f4f2);
      p.mat.opacity = 0.45;
    }
  }
}
