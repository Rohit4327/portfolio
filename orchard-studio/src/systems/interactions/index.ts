/** Every interaction in the walkthrough (Sections 7.4 and 8). Each is a small controller on the inspect framework. */
import * as THREE from 'three';
import { audio } from '../../audio/engine';
import { loopArt, pageArt, type as drawType, wrap } from '../../core/art';
import { M } from '../../core/materials';
import { redraw } from '../../core/text';
import { FT } from '../../data/geometry';
import { CONTENT } from '../../data/manifest';
import { FIXTURES } from '../../data/plan';
import { addFrameHook, frameHooks } from '../../scenes/frameHooks';
import { easeInOutCubic, setDoor, walkWorld, WALK_OFFSET } from '../../scenes/director';
import { extensions } from '../../debug/api';
import { player, rt, touch } from '../../state/runtime';
import { useStudio, VISITOR } from '../../state/store';
import { scoreArt } from '../../zones/fixtures';
import { advanceMatch, BLUE_ROD_BY_ROLE, createMatch, placeBall, resetMatch, type Match, type MatchInput } from './foosballEngine';
import { RODS } from './foosballSpec';
import { kioskOrder, type Hotspot } from '../hotspots';
import { controllers, endInspect, inspect, patch, retarget, setPage, setTargetPose } from '../inspect';
import { walk } from '../../scenes/walkthrough/WalkControls';
import { buildWatch } from '../../furniture/smallItems';

const layout = () => useStudio.getState().layout;
export const obj = (id: string): THREE.Object3D | undefined => rt.studio?.registry.objects[`${layout()}:${id}`] ?? rt.studio?.registry.objects[`*:${id}`];
const scr = (key: string) => rt.studio?.registry.screens[key];
const tex = (key: string) => scr(key)?.emissiveMap ?? null;

/* ── tiny tween runner ── */
interface Tween {
  t: number;
  dur: number;
  fn: (e: number) => void;
  done?: () => void;
}
const tweens: Tween[] = [];
export function tween(dur: number, fn: (e: number) => void, done?: () => void): void {
  if (useStudio.getState().reducedMotion) dur = Math.min(dur, 0.01);
  tweens.push({ t: 0, dur, fn, done });
  touch(4);
}
export const wait = (s: number, done: () => void) => tween(s, () => {}, done);
addFrameHook((dt) => {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    tw.fn(easeInOutCubic(tw.t));
    if (tw.t >= 1) {
      tweens.splice(i, 1);
      tw.done?.();
    }
  }
  return tweens.length > 0;
});
interface Home {
  p: THREE.Vector3;
  q: THREE.Quaternion;
  s: THREE.Vector3;
}
const home = (o: THREE.Object3D) => o.userData.home as Home;
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
/** A point in front of the camera, in the studio root's local space (walkthrough scale is 1, so only an offset). */
function inFrontOfCamera(dist: number, rightM: number, upM: number, out: THREE.Vector3): THREE.Vector3 {
  const cam = rt.camera!;
  out.set(rightM, upM, -dist).applyQuaternion(cam.quaternion).add(cam.position).sub(WALK_OFFSET);
  return out;
}

/* ── pan/zoom prints ── */
controllers.poster = { panZoom: true };
controllers.prism = { panZoom: true };
controllers.fivePoint = {};
controllers.voices = {};
controllers.journey = {
  panZoom: true,
  enter() {
    // Start at the west end; the view pans along the wall as it is dragged (or with Next).
    inspect.pan.x = 0;
  },
  action(name) {
    if (name === 'next') inspect.pan.x = Math.min(4.6, inspect.pan.x + 1.15);
    if (name === 'prev') inspect.pan.x = Math.max(0, inspect.pan.x - 1.15);
  },
};

/* ── instant: call panel and locked team door ── */
controllers.callPanel = {
  instant() {
    audio.play('liftChime');
    useStudio.getState().toast('Lift called');
  },
};
controllers.teamDoor = {
  instant() {
    audio.play('click');
    useStudio.getState().toast('Project team only');
  },
};

/* ── 7.4 Tap watch to enter ── */
let watch: THREE.Group | null = null;
let gateBusy = false;
let entryCloseAt = -1;
export function tapWatch(done?: () => void): void {
  if (gateBusy || rt.openDoors.has('entry')) {
    done?.();
    return;
  }
  const reader = obj('badgeReader');
  const root = rt.studio?.root;
  if (!reader || !root) return;
  gateBusy = true;
  if (!watch) {
    watch = buildWatch();
    watch.userData.dynamic = true;
    watch.scale.setScalar(1.5);
  }
  root.add(watch);
  const from = inFrontOfCamera(0.42, 0.2, -0.26, new THREE.Vector3());
  const to = reader.getWorldPosition(new THREE.Vector3()).sub(WALK_OFFSET);
  to.x -= 0.05;
  const ring = reader.getObjectByName('readerRing') as THREE.Mesh | undefined;
  watch.quaternion.copy(rt.camera!.quaternion);
  // The watch rises into the lower right of the view, then moves to the reader.
  tween(0.45, (e) => watch!.position.copy(from).add(v1.set(0, -0.12 * (1 - e), 0)), () =>
    tween(0.8, (e) => watch!.position.lerpVectors(from, to, e), () => {
      if (ring) ring.material = M.ringGreen;
      audio.play('badgeAccept');
      setDoor('entry', true);
      audio.play('glassDoor');
      entryCloseAt = -1;
      wait(0.5, () => {
        watch?.removeFromParent();
        gateBusy = false;
        done?.();
      });
    }),
  );
}
controllers.watchGate = { instant: () => tapWatch() };
// The leaves close 4 s after the visitor has passed through.
let passedAt = -1;
addFrameHook((dt) => {
  if (!rt.openDoors.has('entry') || useStudio.getState().mode !== 'walkthrough') return false;
  const inside = player.y > 5.6 || player.y < 1.2;
  const near = player.x > 14 && player.x < 21 && player.y > -7 && player.y < 9;
  if (inside && !(player.y < 1.2 && near)) {
    passedAt = passedAt < 0 ? 0 : passedAt + dt;
    if (passedAt > 4 && entryCloseAt !== 1 && !(extensions.holdDoors as boolean)) {
      entryCloseAt = 1;
      setDoor('entry', false);
      audio.play('glassDoor');
      const ring = obj('badgeReader')?.getObjectByName('readerRing') as THREE.Mesh | undefined;
      if (ring) ring.material = M.ringWhite;
    }
  } else passedAt = -1;
  return false;
});

/* ── screens that play loops (landing display, corridor screen) ── */
const loop = { t: 0, acc: 0, playing: true, muted: true };
const LOOP_CARDS: [string, string][] = [
  [VISITOR ? `Welcome, ${VISITOR}` : `Welcome to ${CONTENT.brandName}`, 'ADC-05 · Level 09 · Yeshwanthpur, Bangalore'],
  ['Built by the people who work here', 'Placeholder welcome loop'],
  ['Turn right for the Trail', 'Four kiosks, then the Garage opens on your left'],
];
function drawLoops(): void {
  const card = LOOP_CARDS[Math.floor((loop.t % 24) / 8) % LOOP_CARDS.length];
  const a = tex('landing');
  if (a) redraw(a, loopArt(card[0], card[1], loop.t, 0));
  const b = tex('corridorScreen');
  if (b) redraw(b, loopArt('TCS, with you for the long run', ['Placeholder caption one', 'Placeholder caption two', 'Placeholder caption three'][Math.floor(loop.t / 6) % 3], loop.t, 3));
}
addFrameHook((dt) => {
  if (useStudio.getState().mode !== 'walkthrough' || !loop.playing) return false;
  // Only animate when a loop screen can be seen: in the corridor near bay B, or in the Trail.
  const nearCorridor = player.y < 0.5 && player.x > -22 && player.x < 14;
  const nearLanding = player.y > 0 && player.y < 18 && player.x > 14 && player.x < 58;
  if (!nearCorridor && !nearLanding && !inspect.current) return false;
  loop.t += dt;
  loop.acc += dt;
  if (loop.acc < 0.125) return false;
  loop.acc = 0;
  drawLoops();
  return true;
});
const player2 = {
  enter() {
    patch({ playing: loop.playing, muted: loop.muted });
  },
  action(name: string) {
    if (name === 'play') loop.playing = !loop.playing;
    if (name === 'mute') {
      loop.muted = !loop.muted;
      audio.duck(!loop.muted);
    }
    patch({ playing: loop.playing, muted: loop.muted });
  },
  exit() {
    audio.duck(false);
    loop.muted = true;
  },
};
controllers.landing = player2;
controllers.corridorScreen = player2;

/* ── kiosks ── */
function drawKiosk(h: Hotspot, page: number, awake = true): void {
  const order = kioskOrder();
  const content = CONTENT.kiosks[order[h.index % order.length]];
  const t = tex(h.id);
  if (!t) return;
  redraw(t, awake ? pageArt(content.title, page === 0 ? 'Swipe to explore' : `Page ${page + 1} of ${content.pages.length}`, h.index, page, content.pages.length) : pageArt(content.title, 'Touch to explore', h.index, 0, 1));
}
controllers.kiosk = {
  enter(h) {
    audio.play('kioskTap');
    drawKiosk(h, 0);
  },
  action(name, _a, h) {
    const st = useStudio.getState().inspect;
    if (!st) return;
    const p = name === 'next' ? st.page + 1 : name === 'prev' ? st.page - 1 : st.page;
    const np = Math.max(0, Math.min(st.pages - 1, p));
    if (np !== st.page) {
      audio.play('kioskSwipe');
      setPage(np);
      drawKiosk(h, np);
    }
  },
  exit(h) {
    drawKiosk(h, 0, false);
  },
};

// Idle attract screen that wakes as the visitor approaches (8.1).
const awake = new Map<string, boolean>();
addFrameHook(() => {
  const st = useStudio.getState();
  if (st.mode !== 'walkthrough' || st.inspect) return false;
  const list = (extensions.hotspots as (() => Hotspot[]) | undefined)?.() ?? [];
  let changed = false;
  for (const h of list) {
    if (h.kind !== 'kiosk') continue;
    const near = Math.hypot(h.pos[0] - player.x, h.pos[1] - player.y) < 7;
    if (awake.get(h.id) !== near) {
      awake.set(h.id, near);
      drawKiosk(h, 0, near);
      changed = true;
    }
  }
  return changed;
});

/* ── App Galleria ── */
let scanT = -1;
function drawDevice(h: Hotspot, page: number): void {
  const app = CONTENT.appGalleria[h.index % CONTENT.appGalleria.length];
  const t = tex(h.id);
  if (t) redraw(t, pageArt(app.name, app.tags.join(' · '), h.index + 2, page, 3));
}
export function highlightGalleria(query: string): number[] {
  const q = query.toLowerCase();
  const n = FIXTURES[layout()].galleria?.devices ?? 0;
  const hits: number[] = [];
  for (let i = 0; i < n; i++) {
    const app = CONTENT.appGalleria[i % CONTENT.appGalleria.length];
    const match = q.length > 1 && (app.tags.some((tg) => q.includes(tg.toLowerCase())) || q.includes(app.name.toLowerCase()));
    const m = scr(`galleria-${i}`);
    if (m) m.emissiveIntensity = match ? 2.4 : q.length > 1 ? 0.35 : 1;
    if (match) hits.push(i);
  }
  touch(4);
  return hits;
}
controllers.galleria = {
  enter(h) {
    const o = obj(h.id);
    if (!o) return;
    audio.play('devicePickup');
    const hm = home(o);
    const to = inFrontOfCamera(0.34, 0.0, -0.11, new THREE.Vector3());
    const tq = rt.camera!.quaternion.clone();
    // Picked-up devices float into the foreground: nothing holds them.
    tween(0.55, (e) => {
      o.position.lerpVectors(hm.p, to, e);
      o.quaternion.slerpQuaternions(hm.q, tq, e);
      o.scale.setScalar(1 + 0.25 * e);
    });
    patch({ scanning: false, asked: '' });
  },
  action(name, arg, h) {
    const st = useStudio.getState().inspect;
    if (!st) return;
    if (name === 'next' || name === 'prev') {
      const np = (st.page + (name === 'next' ? 1 : st.pages - 1)) % st.pages;
      setPage(np);
      drawDevice(h, np);
      audio.play('kioskSwipe');
    } else if (name === 'scan') {
      patch({ scanning: true });
      scanT = 0;
      audio.play('qrBeep');
      wait(1.1, () => {
        patch({ scanning: false, scanned: true });
        const url = CONTENT.appGalleria[h.index % CONTENT.appGalleria.length].url;
        if (!(extensions.noPopups as boolean)) window.open(url, '_blank', 'noopener');
      });
    } else if (name === 'ask') {
      audio.play('orbTone');
      patch({ asked: String(arg ?? ''), hits: highlightGalleria(String(arg ?? '')) });
    }
  },
  exit(h) {
    const o = obj(h.id);
    if (!o) return;
    const hm = home(o);
    const fp = o.position.clone();
    const fq = o.quaternion.clone();
    const fs = o.scale.x;
    audio.play('devicePickup', { rate: 0.85 });
    tween(0.45, (e) => {
      o.position.lerpVectors(fp, hm.p, e);
      o.quaternion.slerpQuaternions(fq, hm.q, e);
      o.scale.setScalar(fs + (1 - fs) * e);
    });
    drawDevice(h, 0);
    highlightGalleria('');
    void scanT;
  },
};

/* ── headset passthrough ── */
controllers.headset = {
  enter(h) {
    const o = obj(h.id);
    if (!o) return;
    audio.play('headsetOn');
    const hm = home(o);
    patch({ phase: 'rising' });
    tween(0.8, (e) => {
      inFrontOfCamera(0.25 + 0.5 * (1 - e), 0, 0, v2);
      o.position.lerpVectors(hm.p, v2, e);
      q1.copy(rt.camera!.quaternion);
      o.quaternion.slerpQuaternions(hm.q, q1, e);
    }, () => {
      o.visible = false;
      // Fade to black, hold 1 s, then return in passthrough with the Home panel after 2 s.
      patch({ phase: 'black' });
      wait(1.0, () => {
        patch({ phase: 'passthrough' });
        frameHooks.walkWhileInspecting = true;
        wait(2.0, () => {
          if (useStudio.getState().inspect?.kind === 'headset') patch({ phase: 'home' });
        });
      });
    });
  },
  action(name, arg) {
    if (name === 'tile') {
      audio.play('click');
      patch({ tile: arg });
    }
    if (name === 'closeTile') patch({ tile: null });
  },
  exit(h) {
    const o = obj(h.id);
    if (!o) return;
    audio.play('headsetOff');
    const hm = home(o);
    o.visible = true;
    const fp = inFrontOfCamera(0.25, 0, 0, new THREE.Vector3());
    const fq = rt.camera!.quaternion.clone();
    tween(0.7, (e) => {
      o.position.lerpVectors(fp, hm.p, e);
      o.quaternion.slerpQuaternions(fq, hm.q, e);
    });
  },
};

/* ── museum plinths ── */
controllers.plinth = {
  enter() {
    audio.play('vitrineTick');
  },
  update(dt, h) {
    const o = obj(h.id.replace('plinth-', 'plinth-device-'));
    if (o) o.rotateY(dt * 0.35);
    return true;
  },
  action(name) {
    // Previous / Next move along the plinths.
    const st = useStudio.getState();
    const cur = inspect.current;
    if (!cur || !st.inspect) return;
    const all = extensions.hotspots as (() => Hotspot[]) | undefined;
    const list = (all?.() ?? []).filter((q) => q.kind === 'plinth');
    const next = list[(cur.index + (name === 'next' ? 1 : list.length - 1)) % list.length];
    if (!next?.pose) return;
    resetDevice(cur);
    inspect.current = next;
    setTargetPose(next.pose.cam, next.pose.camH ?? 1.6, next.pose.look, next.pose.lookH);
    retarget(0.7);
    st.set({ inspect: { ...st.inspect, id: next.id, title: next.title, lines: next.lines, page: next.index } });
    audio.play('vitrineTick');
  },
  exit(h) {
    resetDevice(h);
  },
};
function resetDevice(h: Hotspot) {
  const o = obj(h.id.replace('plinth-', 'plinth-device-'));
  if (o) o.quaternion.copy(home(o).q);
}

/* ── collaboration board ── */
const board = { session: false, drawing: false, lx: 0, ly: 0 };
const NOTES: [number, number, string, string][] = [
  [0.07, 0.12, '#f6e7a1', 'What did we\nlearn?'],
  [0.07, 0.42, '#cfe6d2', 'Who is it\nfor?'],
  [0.78, 0.12, '#f3d2c6', 'Next step'],
];
function drawBoard(clear = true): void {
  const t = tex('board');
  if (!t) return;
  redraw(t, (ctx, w, h) => {
    if (!clear) return;
    if (!board.session) return loopArt('Collaboration board', 'Start a session', 0, 2)(ctx, w, h);
    ctx.fillStyle = '#fdfdfb';
    ctx.fillRect(0, 0, w, h);
    drawType(ctx, 'Session', w * 0.34, h * 0.1, h * 0.06, 600);
    for (const [x, y, c, s] of NOTES) {
      ctx.fillStyle = c;
      ctx.fillRect(w * x, h * y, w * 0.15, h * 0.24);
      s.split('\n').forEach((ln, i) => drawType(ctx, ln, w * x + w * 0.012, h * y + h * 0.07 + i * h * 0.05, h * 0.04, 500));
    }
    // Pen tray hint.
    ctx.fillStyle = '#2a2b2d';
    ctx.fillRect(w * 0.47, h * 0.95, w * 0.06, h * 0.012);
  });
}
function boardY(f: number): void {
  const o = obj('board');
  const B = FIXTURES[layout()].board;
  if (!o || !B) return;
  const y0 = (B.y0 + B.y1) / 2;
  o.position.z = -(y0 + (B.demoY - y0) * f) * FT;
}
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
export function boardStroke(clientX: number, clientY: number, start: boolean): void {
  const o = obj('board')?.getObjectByName('boardScreen') as THREE.Mesh | undefined;
  const t = tex('board');
  if (!o || !t || !rt.camera || !rt.gl) return;
  const r = rt.gl.domElement.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, rt.camera);
  const hit = ray.intersectObject(o, false)[0];
  if (!hit?.uv) {
    board.drawing = false;
    return;
  }
  const c = t.image as HTMLCanvasElement;
  const x = hit.uv.x * c.width;
  const y = (1 - hit.uv.y) * c.height;
  if (!start && board.drawing) {
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = '#1f2a44';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(board.lx, board.ly);
    ctx.lineTo(x, y);
    ctx.stroke();
    t.needsUpdate = true;
    if (Math.hypot(x - board.lx, y - board.ly) > 12) audio.play('penStroke', { volume: 0.5 });
    touch(3);
  }
  board.drawing = true;
  board.lx = x;
  board.ly = y;
}
export const boardPenUp = () => (board.drawing = false);
controllers.board = {
  enter() {
    patch({ session: false });
  },
  action(name) {
    if (name === 'start' && !board.session) {
      board.session = true;
      audio.play('castorRoll');
      tween(1.2, (e) => boardY(e), () => {
        drawBoard();
        rt.shadowDirty = true;
      });
      patch({ session: true });
    } else if (name === 'clear') drawBoard();
    else if (name === 'end' && board.session) endSession();
  },
  exit() {
    if (board.session) endSession();
  },
};
function endSession() {
  board.session = false;
  audio.play('castorRoll');
  drawBoard();
  tween(1.2, (e) => boardY(1 - e), () => (rt.shadowDirty = true));
  patch({ session: false });
}

/* ── foosball ── */
const foos = { match: null as Match | null, input: { role: 2, slide: 0, kick: false } as MatchInput, playing: false, lastScore: '' };
function syncFoos(): void {
  const t = obj('foosball')?.getObjectByName('foosDynamic');
  const m = foos.match;
  if (!t || !m) return;
  RODS.forEach((_, i) => {
    const rod = t.getObjectByName(`rod${i}`);
    if (!rod) return;
    rod.position.x = m.rods[i].x;
    rod.rotation.x = -m.rods[i].angle;
  });
  const ball = t.getObjectByName('ball');
  if (ball) ball.position.set(m.ball.x, ball.position.y, m.ball.z);
  const key = `${m.score.blue}:${m.score.amber}`;
  if (key !== foos.lastScore) {
    foos.lastScore = key;
    const st = tex('scoreboard');
    if (st) redraw(st, scoreArt(m.score.blue, m.score.amber));
    patch({ blue: m.score.blue, amber: m.score.amber, winner: m.winner, role: foos.input.role });
  }
}
controllers.foosball = {
  enter() {
    foos.match = foos.match ?? createMatch(7);
    foos.playing = false;
    patch({ playing: false, blue: foos.match.score.blue, amber: foos.match.score.amber, role: foos.input.role, paused: false });
  },
  update(dt) {
    const m = foos.match;
    if (!m || !foos.playing) return false;
    const k = walk.keys;
    for (let r = 0; r < 4; r++) if (k.has(`Digit${r + 1}`)) foos.input.role = r as 0 | 1 | 2 | 3;
    // The visitor stands on the +X side, so "up/W" pushes the rod away (-X).
    const keySlide = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    const touchSlide = (extensions.foosSlide as number | undefined) ?? 0;
    foos.input.slide = keySlide || touchSlide;
    foos.input.kick = k.has('Space') || !!(extensions.foosKick as boolean | undefined);
    advanceMatch(m, dt, foos.input, (e) => {
      if (e.type === 'kick') audio.play('rodSpin', { volume: 0.5 });
      else if (e.type === 'hit') audio.play(e.speed > 1.5 ? 'kick' : 'ballHit', { volume: Math.min(1, 0.3 + e.speed / 5) });
      else if (e.type === 'wall') audio.play('ballHit', { volume: Math.min(0.8, 0.2 + e.speed / 6) });
      else if (e.type === 'goal' || e.type === 'win') audio.play('goalChime');
    });
    extensions.foosKick = false;
    syncFoos();
    return true;
  },
  action(name, arg) {
    const m = foos.match;
    if (!m) return;
    if (name === 'start') {
      resetMatch(m);
      foos.playing = true;
      foos.lastScore = '';
      patch({ playing: true, winner: null, paused: false });
    } else if (name === 'pause') {
      m.paused = !m.paused;
      patch({ paused: m.paused });
    } else if (name === 'restart') {
      resetMatch(m);
      foos.lastScore = '';
      foos.playing = true;
      patch({ winner: null, paused: false, playing: true });
    } else if (name === 'role') {
      foos.input.role = arg as 0 | 1 | 2 | 3;
      patch({ role: arg });
    } else if (name === 'slide') extensions.foosSlide = arg as number;
    else if (name === 'kick') extensions.foosKick = true;
    syncFoos();
  },
  exit() {
    foos.playing = false;
    extensions.foosSlide = 0;
  },
};
/** Test hook: put the ball in front of the amber goal moving in (interactions e2e). */
extensions.foosScripted = () => {
  const m = foos.match;
  if (!m) return null;
  placeBall(m, 0, RODS[7].z + 0.03, 0, 3);
  return { ...m.score };
};
extensions.foosScore = () => (foos.match ? { ...foos.match.score } : null);
void BLUE_ROD_BY_ROLE;

/* ── selfie ── */
export const capture = { pending: false, url: '' };
controllers.selfie = {
  enter() {
    patch({ phase: 'ready', url: '' });
  },
  action(name) {
    if (name !== 'shoot') return;
    let n = 3;
    patch({ phase: 'countdown', n });
    audio.play('countdownTick');
    const tick = () =>
      wait(1.0, () => {
        n--;
        if (useStudio.getState().inspect?.kind !== 'selfie') return;
        if (n > 0) {
          patch({ n });
          audio.play('countdownTick');
          tick();
        } else {
          // Capture exactly one frame at the shutter: no continuous render target (8.5).
          audio.play('shutter');
          patch({ phase: 'flash' });
          capture.pending = true;
          touch(4);
        }
      });
    tick();
  },
};
/** Called by the stage right after the composer has drawn a frame, so the capture has the scene's tone mapping. */
export function captureIfPending(): void {
  if (!capture.pending || !rt.gl) return;
  capture.pending = false;
  try {
    capture.url = rt.gl.domElement.toDataURL('image/jpeg', 0.9);
  } catch {
    capture.url = '';
  }
  patch({ phase: 'print', url: capture.url, date: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) });
}

/* ── read note ── */
controllers.readNote = {
  enter(h) {
    const stand = obj(h.id);
    const card = stand?.getObjectByName('noteCard');
    const left = card?.getObjectByName('noteLeft');
    if (!card || !left) return;
    audio.play('paperUnfold');
    const y0 = card.position.y;
    const r0 = left.rotation.y;
    card.userData.rest = { y0, r0 };
    // The card lifts and unfolds.
    tween(0.9, (e) => {
      card.position.y = y0 + 0.16 * e;
      left.rotation.y = r0 * (1 - e);
    }, () => patch({ open: true }));
  },
  exit(h) {
    const card = obj(h.id)?.getObjectByName('noteCard');
    const left = card?.getObjectByName('noteLeft');
    const rest = card?.userData.rest as { y0: number; r0: number } | undefined;
    if (!card || !left || !rest) return;
    tween(0.6, (e) => {
      card.position.y = rest.y0 + 0.16 * (1 - e);
      left.rotation.y = rest.r0 * e;
    });
  },
};

export { endInspect, wrap, walkWorld };
