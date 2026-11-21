/** Guided tour stops (Section 14). Positions in plan feet; Keep 9 seats uses the same order with its own positions. */
import type { LayoutId } from '../config';
import type { V2 } from '../data/geometry';
import { FIXTURES, KIOSK_FOOT } from '../data/plan';

export interface TourStop {
  n: number;
  name: string;
  cam: V2;
  look: V2;
  /** Height the camera looks at, in feet (default eye level). */
  lookH?: number;
  caption: string;
  /** Hotspot the stop demonstrates, if any. */
  action?: string;
  zone: string;
}

export function tourStops(layout: LayoutId): TourStop[] {
  const f = FIXTURES[layout];
  const k9 = layout === 'keep9';
  const s: Omit<TourStop, 'n'>[] = [
    { name: 'Lift Lobby #1', cam: [-66, -25], look: [-50, -25], caption: 'Arriving at Level 09. The doors open onto Lift Lobby 02.', action: 'liftArrive', zone: 'liftLobby' },
    { name: 'Lift Lobby 02', cam: [-51.5, -24], look: [-51.5, -6], caption: 'Orchard Studio is signed from the lobby. Turn north to the corridor.', zone: 'liftLobby' },
    { name: 'TCS corridor', cam: [-51.5, -3.3], look: [0, -3.3], caption: 'The 2000 mm TCS corridor runs east to the studio entry.', zone: 'corridor' },
    { name: 'Posters, bay A', cam: [-21, -2.5], look: [-21, -6.56], lookH: 5, caption: 'Three framed posters introduce TCS on the way in.', action: 'poster-bayA-1', zone: 'corridor' },
    { name: 'With you for the long run', cam: [-4.5, -2.5], look: [-4.5, -6.56], lookH: 5, caption: 'A single screen plays the "TCS, with you for the long run" loop.', action: 'corridorScreen', zone: 'corridor' },
    { name: 'Entry', cam: [17.5, -2], look: [17.5, 4], caption: 'Tap your watch on the reader. The glass doors slide open.', action: 'watchGate', zone: 'entry' },
    { name: 'PRISM', cam: [17.5, 9], look: [20, 17], caption: 'PRISM, printed on the frosted glass, is the first thing you see. The team turns left; guests turn right.', action: 'prism', zone: 'entry' },
    { name: 'Welcome', cam: [24, 10], look: [27, 0], lookH: 5.6, caption: 'The landing display welcomes each visitor by name.', action: 'landing', zone: 'trail' },
    ...f.kiosks.slice(0, 4).map((k, i) => ({
      name: `Kiosk ${k.id}`,
      cam: [k.x - KIOSK_FOOT[0] / 2 - 3.5, k.y] as V2,
      look: [k.x, k.y] as V2,
      lookH: 4,
      caption: ['Tata: the group heritage.', 'TCS: milestones and AI momentum.', 'TCS and Orchard on the West Coast: the team story.', 'Pollinator: explore the platform.'][i],
      action: `kiosk-${k.id}`,
      zone: 'trail',
    })),
    { name: 'Orchard Journey', cam: [45, 9], look: [45, 0], lookH: 5.2, caption: 'Discover, Design, Build, Connect, Evolve: the journey reads west to east.', action: 'journey', zone: 'trail' },
    { name: 'The reveal', cam: [31, 14.5], look: [77, 14.5], caption: 'Past pillar P2 the Garage opens on the left, and the spine runs clear to the east window.', zone: 'entry' },
    { name: 'The Garage', cam: [47, 35.5], look: [57, 45.5], caption: k9 ? '51 desks of real work, open to the spine.' : '42 desks of real work, open to the spine.', zone: 'garage' },
    { name: 'App Galleria', cam: [71.0, 15.2], look: [71.5, 12], lookH: 4.2, caption: 'Pick up a device and try the apps the team has shipped.', action: 'galleria-3', zone: 'windowPause' },
    { name: 'Window seats', cam: [70.5, 15.0], look: [77, 16.5], caption: 'Two seats face the skyline. Try the headset.', action: 'headset', zone: 'windowPause' },
    k9
      ? { name: 'Museum and Voices', cam: [67.6, 25.8], look: [65.2, 25.8], lookH: 4, caption: 'Three milestone devices and the Wall of Voices.', action: 'plinth-1', zone: 'makeStrip' }
      : { name: 'Museum and Voices', cam: [61.5, 27], look: [58.4, 27], lookH: 4, caption: 'Eight milestone devices in date order, and client voices on the glass.', action: 'plinth-2', zone: 'makeStudio' },
    k9
      ? { name: 'Benches and board', cam: [70.5, 23.4], look: [70.5, 36.9], caption: 'Two facing benches and the board make the session space.', action: 'board', zone: 'makeStrip' }
      : { name: 'Crescent and board', cam: [69, 22.5], look: [69, 41], caption: 'The crescent and the board make a near-square for sessions.', action: 'board', zone: 'makeStudio' },
    k9
      ? { name: 'Foosball', cam: [66.6, 45], look: [70.5, 45], lookH: 3, caption: 'Loud things live at the far end, behind glass.', action: 'foosball', zone: 'makeStrip' }
      : { name: 'Foosball', cam: [68, 47], look: [72, 47], lookH: 3, caption: 'Loud things live at the far end, behind glass.', action: 'foosball', zone: 'makeStudio' },
    k9
      ? { name: 'Memory Corner', cam: [65.1, 53.2], look: [66.5, 60], lookH: 5, caption: 'A quiet dead end with north daylight. Take a photo.', action: 'selfie', zone: 'memoryCorner' }
      : { name: 'Memory Corner', cam: [63, 53], look: [65, 60], lookH: 5, caption: 'A quiet dead end with north daylight. Take a photo.', action: 'selfie', zone: 'memoryCorner' },
    k9
      ? { name: 'Read Note', cam: [65.0, 54.3], look: [64.8, 56], lookH: 3.6, caption: 'A note to take with you.', action: 'readNote', zone: 'memoryCorner' }
      : { name: 'Read Note', cam: [60.5, 53.5], look: [59.2, 52], lookH: 3.6, caption: 'A note to take with you.', action: 'readNote', zone: 'memoryCorner' },
  ];
  return s.map((q, i) => ({ ...q, n: i + 1 }));
}
/** Doors that are open when the visitor stands at a stop (used by goToStop and the reachability test). */
export function doorsOpenAt(stop: number): string[] {
  const d = ['lift-PL07'];
  if (stop >= 6) d.push('entry');
  return d;
}
export const TOUR_LAYOUTS: LayoutId[] = ['recommended', 'keep9'];
