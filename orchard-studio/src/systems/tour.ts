/** Guided tour director (Section 14): walk at 1.1 m/s between stops along A* paths, dwell 4 to 6 s, real door interactions. */
import { audio } from '../audio/engine';
import { extensions } from '../debug/api';
import { addFrameHook } from '../scenes/frameHooks';
import { setDoor } from '../scenes/director';
import { lookAtPlan, walk, walkTo } from '../scenes/walkthrough/WalkControls';
import { player, rt } from '../state/runtime';
import { useStudio } from '../state/store';
import { tapWatch } from './interactions';
import { TOUR_LAYOUTS, tourStops, type TourStop } from './tourStops';

const TOUR_MPS = 1.1;
const DWELL_S = 5;
type Phase = 'idle' | 'walking' | 'action' | 'dwell';
export const tour = { phase: 'idle' as Phase, t: 0, caption: '', collisions: 0, visited: [] as number[] };

const set = (p: Partial<ReturnType<typeof useStudio.getState>['tour']>) => useStudio.getState().set({ tour: { ...useStudio.getState().tour, ...p } });
const stops = () => tourStops(useStudio.getState().layout);
export const tourAvailable = () => TOUR_LAYOUTS.includes(useStudio.getState().layout);

function arrive(s: TourStop): void {
  tour.visited.push(s.n);
  tour.caption = s.caption;
  lookAtPlan(s.look[0], s.look[1], s.lookH);
  set({ stop: s.n });
  const afterAction = () => {
    tour.phase = 'dwell';
    tour.t = 0;
  };
  tour.phase = 'action';
  if (s.action === 'liftArrive' && !rt.openDoors.has('lift-PL07')) {
    audio.play('liftChime');
    audio.play('liftDoor');
    setDoor('lift-PL07', true);
    afterAction();
  } else if (s.action === 'watchGate') tapWatch(afterAction);
  else afterAction();
}

function goTo(n: number): void {
  const list = stops();
  const s = list[n - 1];
  if (!s) {
    stopTour();
    useStudio.getState().toast('Tour complete');
    return;
  }
  set({ stop: n, active: true, paused: false });
  tour.phase = 'walking';
  const near = Math.hypot(player.x - s.cam[0], player.y - s.cam[1]) < 0.4;
  if (near) return arrive(s);
  const ok = walkTo(s.cam[0], s.cam[1], { speed: TOUR_MPS, onArrive: () => arrive(s) });
  if (!ok) {
    // A door on the way is still closed (for example Resume from inside): open what the stop needs and retry once.
    tour.collisions++;
    if (n >= 1) setDoor('lift-PL07', true, true);
    if (n >= 6) setDoor('entry', true, true);
    if (!walkTo(s.cam[0], s.cam[1], { speed: TOUR_MPS, onArrive: () => arrive(s) })) pauseTour();
  }
}

export function startTour(from = 1): void {
  if (!tourAvailable()) return;
  tour.visited = [];
  tour.collisions = 0;
  goTo(from);
}
export function pauseTour(): void {
  if (!useStudio.getState().tour.active) return;
  set({ paused: true });
  tour.phase = 'idle';
  walk.target = null;
}
/** Resume continues from the nearest stop. */
export function resumeTour(): void {
  const list = stops();
  let best = 1;
  let bd = Infinity;
  for (const s of list) {
    const d = Math.hypot(player.x - s.cam[0], player.y - s.cam[1]);
    if (d < bd) {
      bd = d;
      best = s.n;
    }
  }
  const cur = useStudio.getState().tour.stop;
  goTo(bd < 3 ? Math.max(best, cur) : best);
}
export function stopTour(): void {
  set({ active: false, paused: false });
  tour.phase = 'idle';
  tour.caption = '';
}
export function tourStep(dir: 1 | -1): void {
  const n = Math.max(1, Math.min(stops().length, useStudio.getState().tour.stop + dir));
  goTo(n);
}

// Any input pauses the tour.
walk.onUserInput = () => {
  const t = useStudio.getState().tour;
  if (t.active && !t.paused && !(extensions.tourTest as boolean)) pauseTour();
};

addFrameHook((dt) => {
  const t = useStudio.getState().tour;
  if (!t.active || t.paused) return false;
  if (tour.phase === 'dwell') {
    tour.t += dt;
    if (tour.t >= DWELL_S * ((extensions.dwellScale as number | undefined) ?? 1)) goTo(t.stop + 1);
  }
  return true;
});

// Test hooks (interactions e2e): run the tour unattended and report what happened.
extensions.startTour = (from = 1) => startTour(from as number);
extensions.tourState = () => ({ ...tour, stop: useStudio.getState().tour.stop, active: useStudio.getState().tour.active });
