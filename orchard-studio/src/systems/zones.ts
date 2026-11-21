/** Which zone the visitor is in (point in polygon with 350 ms hysteresis), driving toasts, the location pill and sound. */
import { audio, type BedId, type FloorMaterial } from '../audio/engine';
import { pointInPolygon } from '../data/geometry';
import { floorPatches, zonesFor, arrivalCar, type Zone } from '../data/plan';
import { addFrameHook } from '../scenes/frameHooks';
import { player } from '../state/runtime';
import { useStudio } from '../state/store';
import { walk } from '../scenes/walkthrough/WalkControls';

const HYSTERESIS_S = 0.35;
const STEP_M = 0.55;
let candidate: string | null = null;
let candidateT = 0;
let current: string | null = null;
let sinceStep = 0;

export function zoneAt(x: number, y: number, zones: Zone[]): Zone | null {
  // Studio zones win over the broad approach polygons; context zones never match (not enterable).
  let hit: Zone | null = null;
  for (const z of zones) if (!z.context && pointInPolygon(x, y, z.polygon)) hit = z;
  return hit;
}
const car = arrivalCar();
export function locationName(x: number, y: number, zones: Zone[]): string {
  if (x < car.x1 + 1.2 && y > car.y0 && y < car.y1) return 'Lift Lobby #1';
  const z = zoneAt(x, y, zones);
  if (z) return z.id === 'liftLobby' ? 'Lift Lobby 02' : z.name;
  if (y >= 12 && y <= 17) return 'The spine';
  if (y < 12 && x < 15) return 'Discussion Room A';
  if (y < 12 && x > 62) return 'Discussion Room B';
  return 'ADC-05';
}
const bedFor = (name: string): BedId => (name.startsWith('Lift') ? 'liftLobby' : name === 'TCS Corridor' ? 'corridor' : 'studio');

export function floorMaterialAt(x: number, y: number): FloorMaterial {
  if (y < 0 || x < 0) return 'stone';
  for (const p of floorPatches(useStudio.getState().layout)) if (pointInPolygon(x, y, p.polygon)) return p.mat === 'oak' ? 'oak' : 'carpet';
  return 'stone';
}

walk.onStep = (m) => {
  // One step every 0.55 m, with the sound of the floor under the visitor.
  sinceStep += m;
  if (sinceStep >= STEP_M) {
    sinceStep = 0;
    audio.footstep(floorMaterialAt(player.x, player.y));
  }
};

addFrameHook((dt) => {
  const st = useStudio.getState();
  if (st.mode !== 'walkthrough') {
    current = candidate = null;
    return false;
  }
  const name = locationName(player.x, player.y, zonesFor(st.layout));
  if (name !== candidate) {
    candidate = name;
    candidateT = 0;
  } else if (name !== current) {
    candidateT += dt;
    if (candidateT >= HYSTERESIS_S || current === null) {
      const first = current === null;
      current = name;
      st.set({ location: name });
      audio.setBed(bedFor(name));
      if (!first) {
        st.toast(`Entering ${name}`);
        audio.play('zoneTone');
      }
    }
  }
  // Positional studio layers: keyboards and murmur near the Garage, filtered traffic near the east glass.
  const garage = Math.max(0, 1 - Math.hypot(Math.max(0, 33 - player.x, player.x - 58), Math.max(0, 17 - player.y)) / 22);
  const east = Math.max(0, 1 - (77 - player.x) / 26);
  audio.setProximity({ garage: player.y > 0 && player.x > 0 ? garage : 0, eastGlass: player.y > 0 ? east : 0 });
  return false;
});
