/** Zone card copy (Section 8) and door label positions (Section 9). */
import type { LayoutId } from '../config';
import { CONFIG } from '../config';
import { G, type V2 } from '../data/geometry';
import { countsFor, type Zone } from '../data/plan';

export interface ZoneCopy {
  size: string;
  components: string[];
  why: string;
}
const size = (z: Zone) => {
  const xs = z.polygon.map((p) => p[0]);
  const ys = z.polygon.map((p) => p[1]);
  return `${Math.round(Math.max(...xs) - Math.min(...xs))} × ${Math.round(Math.max(...ys) - Math.min(...ys))} ft`;
};
export function zoneCopy(z: Zone, layout: LayoutId): ZoneCopy {
  const c = countsFor(layout);
  const base: Record<string, ZoneCopy> = {
    liftLobby: { size: 'Level 09', components: ['Lift car PL07', 'Wayfinding sign', 'Two tall planters'], why: 'Visitors arrive here by lift and are pointed north to the studio.' },
    corridor: { size: '2000 mm wide', components: ['Three poster bays', '"With you for the long run" screen', 'Wayfinding arrow'], why: 'The walk from the lifts doubles as the first impression of TCS.' },
    entry: { size: 'Recess 5 × 4 ft', components: ['Glass sliding door', 'Watch reader', 'PRISM straight ahead'], why: 'Team turns left, guests turn right. Visitors never cross the team\'s path.' },
    trail: { size: '37 × 12 ft', components: ['Landing display', `${c.kiosks} kiosks`, 'Orchard Journey'], why: 'First space you see when you turn right; solid wall for screens; screens face west so sound travels away from the Garage.' },
    garage: { size: layout === 'keep9' ? '31 × 41 ft' : '25 × 41 ft', components: [`${c.garageDesks} desks`, 'Flexi displays', 'Lab machines', 'Five Point Anyone on pillar P2'], why: 'Zero construction; open to the spine so visitors see real work.' },
    windowPause: { size: '15 × 9 ft', components: layout === 'rejected' ? ['Landing display', '2 VR seats'] : ['App Galleria, 7 devices', '2 VR seats', 'Spatial headset'], why: 'The spine ends at this window; pick up an app, try the headset, take in the skyline.' },
    makeStudio: { size: '19 × 30 ft', components: ['Museum, 8 plinths', 'Wall of Voices', 'Crescent sofa', 'Collaboration board', 'Foosball'], why: 'Best light and the view; crescent and board make a near-square for sessions; board perpendicular to the windows, so no glare.' },
    makeStrip: { size: '13 × 30 ft', components: ['Museum, 3 plinths', 'Two facing benches', 'Smaller board', 'Foosball'], why: 'Keeps the 9-seat column: the Make zone narrows to a 13 ft strip along the windows.' },
    memoryCorner: { size: layout === 'keep9' ? 'About 5 × 5 ft' : 'About 10 × 9 ft', components: ['Wall of Memories', 'Selfie disc and tripod', 'Read Note'], why: 'A quiet dead end with north daylight; the visit ends on a high note.' },
    makeAtDoor: { size: '37 × 12 ft', components: ['Crescent', 'Board', '5 plinths', 'Foosball'], why: 'Rejected: no daylight for the Make zone, and the loudest zone sits at the entry.' },
    kioskStrip: { size: '19 × 30 ft', components: ['4 kiosks backed onto the windows'], why: 'Rejected: screens back onto the glass and block the view.' },
    projectODC: { size: '30 × 41 ft', components: ['48 desks behind frosted glass', 'Team door (locked)'], why: 'Secure project space. Not part of the visit.' },
    fifteenPax: { size: '18 × 25 ft', components: ['15-seat meeting room in ADC-04'], why: 'Replaces the Capsule for formal sessions.' },
    openFloor: { size: '77 × 60 ft', components: ['112 desks', '2 GL cubicles', 'Centre collab'], why: 'ADC-05 as it stands today: no studio.' },
  };
  return base[z.id] ?? { size: size(z), components: [], why: '' };
}

/** Door tags for the model ("Zones + Doors") and plates for the walkthrough. */
export interface DoorTag {
  text: string;
  at: V2;
  /** Wall-plate side offset and facing for the walkthrough plate (plan degrees), if it gets one. */
  plate?: { x: number; y: number; deg: number; pictogram?: 'exit' | 'lock' | 'none' };
}
export function doorTags(): DoorTag[] {
  const names = CONFIG.roomNames;
  const out: DoorTag[] = [];
  for (const d of G.doorLabels) {
    if (!d.at) continue;
    let text = d.text;
    if (text.startsWith('CONFIG.roomNames[0]')) text = names[0];
    else if (text.startsWith('CONFIG.roomNames[1]')) text = names[1];
    text = text.replace(' (green pictogram)', '').replace(' (vinyl on glass)', '').replace('Orchard Studio', CONFIG.brandName);
    if (Array.isArray(d.at[0])) {
      const parts = text.replace(' (small wall markers)', '').split(' / ');
      (d.at as unknown as V2[]).forEach((p, i) => out.push({ text: parts[i] ?? parts[0], at: p }));
    } else out.push({ text: text.split(' / ')[0].replace(' · Staff only', ''), at: d.at as V2 });
  }
  return out;
}
