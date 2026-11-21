/** The white room and the oak table the model sits on. */
import { useMemo } from 'react';
import * as THREE from 'three';
import { rbox, box, group } from '../../core/build';
import { M } from '../../core/materials';
import { TABLE_SIZE, TABLE_TOP_Y } from '../director';

export function buildTable(): THREE.Group {
  const g = group('table');
  const { w, d, t } = TABLE_SIZE;
  const top = rbox(M.tableOak, w, t, d, 0.015, 0, TABLE_TOP_Y - t / 2, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  // Two oak leg frames, 0.86 m high, set in from the ends.
  const legH = TABLE_TOP_Y - t;
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.32);
    for (const sz of [-1, 1]) {
      const leg = rbox(M.tableOak, 0.09, legH, 0.09, 0.01, x, legH / 2, sz * (d / 2 - 0.12));
      leg.castShadow = true;
      g.add(leg);
    }
    const rail = box(M.tableOak, 0.09, 0.09, d - 0.33, x, legH - 0.045, 0);
    const foot = box(M.tableOak, 0.09, 0.07, d - 0.33, x, 0.035, 0);
    rail.castShadow = foot.castShadow = true;
    g.add(rail, foot);
  }
  return g;
}

export function PresentationRoom({ visible }: { visible: boolean }) {
  const table = useMemo(buildTable, []);
  const room = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'room';
    // Seamless cyclorama: a large dome with no corners, unlit so it stays an even white.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24), new THREE.MeshBasicMaterial({ color: 0xf1f1ef, side: THREE.BackSide }));
    dome.name = 'cyclorama';
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.6, metalness: 0 }));
    floor.name = 'roomFloor';
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(dome, floor);
    return g;
  }, []);
  return (
    <group visible={visible} name="presentationRoom">
      <primitive object={room} />
      <primitive object={table} />
    </group>
  );
}
