/**
 * Deterministic table-foosball physics + AI. No DOM, no three.js, no Math.random.
 * Table-local frame (see foosballSpec.ts): origin at the centre of the playfield, +Z toward the amber goal,
 * X across the table. The ball is simulated in the XZ plane (render it at y = FOOS.ballR).
 * Blue (human) defends -Z and attacks +Z; amber (AI) defends +Z and attacks -Z.
 *
 * Rod angle convention: 0 = figures hanging vertical; the foot's Z offset from the rod is
 * sin(angle) * FOOT_LEN for both teams, so a blue kick swings to positive angles and an amber kick to negative.
 */
import { FOOS, PHYSICS_HZ, RODS, WIN_SCORE } from './foosballSpec';
import type { Team } from './foosballSpec';

export interface RodState {
  /** Slide offset from centre, clamped to ±RODS[i].travel. */
  x: number;
  /** Spin angle about the rod axis, radians; 0 = figures hanging vertical. */
  angle: number;
  /** rad/s */
  angVel: number;
  /** >0 while a kick swing is in progress (seconds remaining). */
  kickT: number;
}

export interface MatchInput {
  /** Which blue rod the human controls: 0 keeper, 1 defence, 2 midfield, 3 attack. */
  role: 0 | 1 | 2 | 3;
  /** -1, 0 or +1: slide the selected rod along X. */
  slide: number;
  /** True on the step(s) when Space is pressed: triggers a kick on the selected rod. */
  kick: boolean;
}

export type MatchEvent =
  | { type: 'kick'; rod: number }
  | { type: 'hit'; rod: number; speed: number }
  | { type: 'wall'; speed: number }
  | { type: 'goal'; team: Team }
  | { type: 'serve' }
  | { type: 'win'; team: Team };

/** Internal simulation bookkeeping. Part of the match so that a match is fully reproducible from its own state. */
export interface MatchSim {
  /** PRNG state (mulberry32). */
  rng: number;
  /** advanceMatch accumulator, seconds. */
  acc: number;
  /** How long the ball has been (nearly) stationary in play. */
  stuckT: number;
  nudges: number;
  /** Team that conceded the last goal (the next serve leans toward them). */
  conceded: Team | null;
  /** Slide velocity of each rod during the current step, m/s. */
  rodVx: number[];
  /** AI aiming error per rod, metres, and the time until it is re-sampled. */
  aiErr: number[];
  aiErrT: number[];
  /** AI kick cooldown per rod, seconds. */
  aiCool: number[];
}

export interface Match {
  time: number;
  ball: { x: number; z: number; vx: number; vz: number };
  /** One per RODS entry, same order. */
  rods: RodState[];
  score: { blue: number; amber: number };
  phase: 'serve' | 'play' | 'goal' | 'over';
  phaseT: number;
  winner: Team | null;
  paused: boolean;
  /** AI tuning: maximum aiming error in metres (bounded), reaction delay in s. */
  ai: { maxError: number; reaction: number };
  seed: number;
  sim: MatchSim;
}

/** Indices into RODS for the blue keeper, defence, midfield and attack rods. */
export const BLUE_ROD_BY_ROLE: [number, number, number, number] = [0, 1, 3, 5];

// ---------------------------------------------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------------------------------------------
const DT = 1 / PHYSICS_HZ;
const R = FOOS.ballR;
const HALF_W = FOOS.fieldW / 2;
const HALF_L = FOOS.fieldL / 2;
const GOAL_HALF = FOOS.goalW / 2;
/** How far the ball may roll into the goal behind the end line. */
const GOAL_DEPTH = 0.04;

const MAX_SPEED = 7;
/** Rolling friction: dv/dt = -(FRICTION_K * v + FRICTION_C). */
const FRICTION_K = 0.12;
const FRICTION_C = 0.03;
const WALL_E = 0.75;
const FIGURE_E = 0.6;
const SWEEP_SPEED = 3;
/** Impacts slower than this resolve silently (no event). */
const WALL_EVENT_MIN = 0.1;
const HIT_EVENT_MIN = 0.05;

const FIG_HW = FOOS.figureW / 2;
const FIG_HD = FOOS.figureFootDepth / 2;
/** Rod axis to foot centre. */
const FOOT_LEN = FOOS.rodY - 0.005;
/** The foot only reaches the ball while cos(angle) is above this (|angle| < 60 deg). */
const FOOT_MIN_COS = 0.5;

const HUMAN_SLIDE = 0.9;
const AI_SLIDE = 0.7;
const ASSIST_SLIDE = 0.35;

const DEG = Math.PI / 180;
const KICK_BACK_T = 0.05;
const KICK_FWD_T = 0.07;
const KICK_RETURN_T = 0.15;
const KICK_T = KICK_BACK_T + KICK_FWD_T + KICK_RETURN_T;
const KICK_BACK_ANGLE = -35 * DEG;
const KICK_FWD_ANGLE = 55 * DEG;
/** Bulge of the forward-swing velocity profile: peak = (1 + bulge) * mean = about 25 rad/s. */
const KICK_BULGE = 0.12;

const SERVE_DELAY = 0.6;
const SERVE_SPEED = 0.35;
const GOAL_PAUSE = 1.2;

const STUCK_SPEED = 0.02;
const STUCK_T = 2.5;
/** Even a reachable ball is nudged after this long, so an idle player cannot deadlock the game. */
const STUCK_HARD_T = 8;
const NUDGE_VX = 0.15;
const NUDGE_VZ = 0.3;

const DEFAULT_AI: Match['ai'] = { maxError: 0.035, reaction: 0.18 };
const AI_COOLDOWN = 0.25;
/** A rod tracks the ball while it is at most this far in front of it (or approaching). */
const AI_TRACK_RANGE = 0.25;
/** A rod steps aside for a ball this close behind it, so it does not block its own team's shots. */
const AI_AVOID_RANGE = 0.12;
const AI_AVOID_CLEAR = FIG_HW + R + 0.01;
/** Kick when the ball will be within this distance in front of the rod at the moment the foot swings. */
const AI_KICK_REACH = 0.06;
const AI_KICK_LEAD = 0.075;
const AI_KICK_X = FOOS.figureW * 0.9;

const NO_EVENTS: MatchEvent[] = [];
let events: MatchEvent[] | null = null;
const emit = (e: MatchEvent): void => {
  if (events === null) events = [];
  events.push(e);
};

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const smooth = (s: number): number => s * s * (3 - 2 * s);
const teamDir = (i: number): 1 | -1 => (RODS[i].team === 'blue' ? 1 : -1);
const figureOffset = (i: number, j: number): number => (j - (RODS[i].count - 1) / 2) * RODS[i].spacing;

/** mulberry32: returns a float in [0, 1) and advances the state stored in the match. */
function rand(m: Match): number {
  m.sim.rng = (m.sim.rng + 0x6d2b79f5) >>> 0;
  let t = m.sim.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Kick swing angle (blue sign convention) as a function of the time since the kick started. */
function kickAngle(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= KICK_T) return 0;
  if (elapsed < KICK_BACK_T) return KICK_BACK_ANGLE * smooth(elapsed / KICK_BACK_T);
  if (elapsed < KICK_BACK_T + KICK_FWD_T) {
    const s = (elapsed - KICK_BACK_T) / KICK_FWD_T;
    const p = s + (KICK_BULGE / (2 * Math.PI)) * Math.sin(2 * Math.PI * (s - 0.5));
    return KICK_BACK_ANGLE + (KICK_FWD_ANGLE - KICK_BACK_ANGLE) * p;
  }
  return KICK_FWD_ANGLE * (1 - smooth((elapsed - KICK_BACK_T - KICK_FWD_T) / KICK_RETURN_T));
}

/** Reflect a predicted X back into the field as if it had bounced off the side walls. */
function foldX(x: number): number {
  const w = HALF_W - R;
  let v = x;
  for (let k = 0; k < 4 && (v > w || v < -w); k++) v = v > w ? 2 * w - v : -2 * w - v;
  return clamp(v, -w, w);
}

function initSim(seed: number): MatchSim {
  const n = RODS.length;
  const sim: MatchSim = {
    rng: seed >>> 0,
    acc: 0,
    stuckT: 0,
    nudges: 0,
    conceded: null,
    rodVx: new Array<number>(n).fill(0),
    aiErr: new Array<number>(n).fill(0),
    aiErrT: new Array<number>(n).fill(0),
    aiCool: new Array<number>(n).fill(0),
  };
  return sim;
}

// ---------------------------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------------------------
export function createMatch(seed = 1, ai?: Partial<Match['ai']>): Match {
  const s = (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0;
  return {
    time: 0,
    ball: { x: 0, z: 0, vx: 0, vz: 0 },
    rods: RODS.map(() => ({ x: 0, angle: 0, angVel: 0, kickT: 0 })),
    score: { blue: 0, amber: 0 },
    phase: 'serve',
    phaseT: 0,
    winner: null,
    paused: false,
    ai: { ...DEFAULT_AI, ...ai },
    seed: s,
    sim: initSim(s),
  };
}

/** Back to 0-0 and a fresh serve, replaying the same seed. Keeps the AI tuning. */
export function resetMatch(m: Match): void {
  m.time = 0;
  m.ball.x = m.ball.z = m.ball.vx = m.ball.vz = 0;
  for (const r of m.rods) r.x = r.angle = r.angVel = r.kickT = 0;
  m.score.blue = m.score.amber = 0;
  m.phase = 'serve';
  m.phaseT = 0;
  m.winner = null;
  m.paused = false;
  m.sim = initSim(m.seed);
}

/** For tests and the scripted e2e check: put the ball somewhere with a velocity and set phase to 'play'. */
export function placeBall(m: Match, x: number, z: number, vx: number, vz: number): void {
  m.ball.x = x;
  m.ball.z = z;
  m.ball.vx = vx;
  m.ball.vz = vz;
  m.phase = 'play';
  m.phaseT = 0;
  m.sim.stuckT = 0;
}

/** X positions (table frame) of the figures on rod i given its current slide. */
export function figureXs(m: Match, i: number, out: number[] = []): number[] {
  const n = RODS[i].count;
  out.length = n;
  for (let j = 0; j < n; j++) out[j] = m.rods[i].x + figureOffset(i, j);
  return out;
}

/** Advance by exactly one fixed step of 1/PHYSICS_HZ. Returns the events of that step (usually empty). */
export function stepMatch(m: Match, input: MatchInput): MatchEvent[] {
  if (m.paused || m.phase === 'over') return NO_EVENTS;
  events = null;
  m.time += DT;
  m.phaseT += DT;

  const selected = BLUE_ROD_BY_ROLE[input.role];
  for (let i = 0; i < RODS.length; i++) updateRod(m, i, i === selected ? input : null);

  if (m.phase === 'serve') {
    m.ball.x = m.ball.z = m.ball.vx = m.ball.vz = 0;
    if (m.phaseT >= SERVE_DELAY) serve(m);
  } else if (m.phase === 'play') {
    stepBall(m);
  } else if (m.phase === 'goal') {
    settleInGoal(m);
    if (m.phaseT >= GOAL_PAUSE) {
      m.phase = 'serve';
      m.phaseT = 0;
      m.ball.x = m.ball.z = m.ball.vx = m.ball.vz = 0;
    }
  }

  const out: MatchEvent[] | null = events;
  events = null;
  return out ?? NO_EVENTS;
}

/**
 * Accumulator helper: advance by wall-clock dt (clamped to 0.1 s) in fixed steps; calls onEvent for each event.
 * Returns the number of steps taken.
 */
export function advanceMatch(m: Match, dt: number, input: MatchInput, onEvent?: (e: MatchEvent) => void): number {
  if (m.paused || m.phase === 'over' || !(dt > 0)) return 0;
  m.sim.acc += Math.min(dt, 0.1);
  let steps = 0;
  while (m.sim.acc >= DT - 1e-9) {
    m.sim.acc -= DT;
    const ev = stepMatch(m, input);
    steps++;
    if (onEvent) for (let k = 0; k < ev.length; k++) onEvent(ev[k]);
    if (m.paused || m.phase !== 'play' && m.phase !== 'serve' && m.phase !== 'goal') break;
  }
  if (m.sim.acc < 0) m.sim.acc = 0;
  return steps;
}

// ---------------------------------------------------------------------------------------------------------------
// Rods: human control, assist, AI, kick animation
// ---------------------------------------------------------------------------------------------------------------
function startKick(m: Match, i: number): void {
  m.rods[i].kickT = KICK_T;
  emit({ type: 'kick', rod: i });
}

function updateRod(m: Match, i: number, manual: MatchInput | null): void {
  const spec = RODS[i];
  const rod = m.rods[i];
  const sim = m.sim;
  const prevX = rod.x;

  if (manual !== null) {
    rod.x = clamp(rod.x + clamp(manual.slide, -1, 1) * HUMAN_SLIDE * DT, -spec.travel, spec.travel);
    if (manual.kick && rod.kickT <= 0) startKick(m, i);
  } else if (spec.team === 'amber') {
    sim.aiErrT[i] -= DT;
    if (sim.aiErrT[i] <= 0) {
      sim.aiErrT[i] += Math.max(m.ai.reaction, DT);
      sim.aiErr[i] = (rand(m) * 2 - 1) * m.ai.maxError;
    }
    if (sim.aiCool[i] > 0) sim.aiCool[i] = Math.max(0, sim.aiCool[i] - DT);
    slideToward(m, i, sim.aiErr[i], AI_SLIDE);
    if (m.phase === 'play' && rod.kickT <= 0 && sim.aiCool[i] <= 0 && aiWantsKick(m, i)) startKick(m, i);
  } else {
    slideToward(m, i, 0, ASSIST_SLIDE);
  }
  sim.rodVx[i] = (rod.x - prevX) / DT;

  if (rod.kickT > 0) {
    const prevAngle = rod.angle;
    rod.kickT -= DT;
    if (rod.kickT <= 1e-9) {
      rod.kickT = 0;
      rod.angle = 0;
      if (spec.team === 'amber') sim.aiCool[i] = AI_COOLDOWN;
    } else {
      rod.angle = teamDir(i) * kickAngle(KICK_T - rod.kickT);
    }
    rod.angVel = (rod.angle - prevAngle) / DT;
  } else {
    rod.angle = 0;
    rod.angVel = 0;
  }
}

/** Automatic slide for AI rods and the human's non-selected rods. */
function slideToward(m: Match, i: number, err: number, speed: number): void {
  const spec = RODS[i];
  const rod = m.rods[i];
  const b = m.ball;
  const d = teamDir(i);
  /** Distance of the ball in front of the rod (positive = on the side this rod kicks toward). */
  const f = (b.z - spec.z) * d;
  const vf = b.vz * d;
  let want = 0;
  let rate = speed * 0.5;

  if (m.phase === 'play' || m.phase === 'serve') {
    if (f >= -0.005 && (f <= AI_TRACK_RANGE || vf < -0.05)) {
      let px = b.x;
      if (vf < -0.3 && f > 0) px = foldX(b.x + b.vx * Math.min(f / -vf, 0.5));
      const target = px + err;
      let best = Infinity;
      for (let j = 0; j < spec.count; j++) {
        const off = figureOffset(i, j);
        const w = clamp(target - off, -spec.travel, spec.travel);
        const cost = Math.abs(target - off - w) * 4 + Math.abs(w - rod.x);
        if (cost < best) {
          best = cost;
          want = w;
        }
      }
      rate = speed;
    } else if (f < -0.005 && f > -AI_AVOID_RANGE) {
      // Ball just behind the rod: step aside so it can come through.
      want = rod.x;
      rate = speed;
      let near = 0;
      let nearD = Infinity;
      for (let j = 0; j < spec.count; j++) {
        const dist = Math.abs(b.x - rod.x - figureOffset(i, j));
        if (dist < nearD) {
          nearD = dist;
          near = j;
        }
      }
      if (nearD < AI_AVOID_CLEAR) {
        const off = figureOffset(i, near);
        const side = b.x - rod.x - off >= 0 ? 1 : -1;
        want = b.x - off - side * AI_AVOID_CLEAR;
        if (Math.abs(want) > spec.travel) {
          const other = b.x - off + side * AI_AVOID_CLEAR;
          want = Math.abs(other) <= spec.travel ? other : clamp(want, -spec.travel, spec.travel);
        }
      }
    }
  }

  const dx = want - rod.x;
  const maxStep = rate * DT;
  rod.x = clamp(rod.x + clamp(dx, -maxStep, maxStep), -spec.travel, spec.travel);
}

function aiWantsKick(m: Match, i: number): boolean {
  const spec = RODS[i];
  const b = m.ball;
  const d = teamDir(i);
  const f = (b.z - spec.z) * d;
  if (f < -0.005) return false;
  const fAtSwing = f + b.vz * d * AI_KICK_LEAD;
  if (fAtSwing < -0.01 || fAtSwing > AI_KICK_REACH) return false;
  const bx = b.x + b.vx * Math.min(AI_KICK_LEAD, 0.03);
  const rx = m.rods[i].x;
  for (let j = 0; j < spec.count; j++) {
    if (Math.abs(bx - rx - figureOffset(i, j)) < AI_KICK_X) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------------------------
// Ball
// ---------------------------------------------------------------------------------------------------------------
function serve(m: Match): void {
  const sim = m.sim;
  const side = rand(m) < 0.5 ? -1 : 1;
  const lean = (12 + rand(m) * 14) * DEG;
  // Lean toward the half of the team that conceded (first serve: seeded coin toss).
  const zSign = sim.conceded === 'blue' ? -1 : sim.conceded === 'amber' ? 1 : rand(m) < 0.5 ? -1 : 1;
  m.ball.x = 0;
  m.ball.z = 0;
  m.ball.vx = side * SERVE_SPEED * Math.cos(lean);
  m.ball.vz = zSign * SERVE_SPEED * Math.sin(lean);
  m.phase = 'play';
  m.phaseT = 0;
  sim.stuckT = 0;
  emit({ type: 'serve' });
}

function capSpeed(b: Match['ball']): number {
  const sp = Math.hypot(b.vx, b.vz);
  if (sp > MAX_SPEED) {
    const k = MAX_SPEED / sp;
    b.vx *= k;
    b.vz *= k;
    return MAX_SPEED;
  }
  return sp;
}

function stepBall(m: Match): void {
  const b = m.ball;
  const speed = capSpeed(b);
  const sub = speed > SWEEP_SPEED ? 2 : 1;
  const h = DT / sub;
  for (let s = 0; s < sub; s++) {
    b.x += b.vx * h;
    b.z += b.vz * h;
    collideFigures(m);
    if (collideWalls(m)) return;
  }

  // Rolling friction.
  const sp = capSpeed(b);
  if (sp > 0) {
    const next = sp - (FRICTION_K * sp + FRICTION_C) * DT;
    const k = next > 0 ? next / sp : 0;
    b.vx *= k;
    b.vz *= k;
  }

  // Dead-ball rescue.
  const sim = m.sim;
  if (sp < STUCK_SPEED) {
    sim.stuckT += DT;
    if (sim.stuckT > STUCK_T && (sim.stuckT > STUCK_HARD_T || !ballReachable(m))) nudge(m);
  } else {
    sim.stuckT = 0;
  }
}

/** Can any figure get its foot onto the ball where it lies? */
function ballReachable(m: Match): boolean {
  const b = m.ball;
  for (let i = 0; i < RODS.length; i++) {
    const spec = RODS[i];
    const f = (b.z - spec.z) * teamDir(i);
    if (f < 0 || f > AI_KICK_REACH) continue;
    for (let j = 0; j < spec.count; j++) {
      if (Math.abs(b.x - figureOffset(i, j)) <= spec.travel + FIG_HW) return true;
    }
  }
  return false;
}

function nudge(m: Match): void {
  const b = m.ball;
  const sim = m.sim;
  const alt = sim.nudges % 2 === 0 ? 1 : -1;
  const zDir = b.z > 0.01 ? -1 : b.z < -0.01 ? 1 : alt;
  const xDir = b.x > 0.05 ? -1 : b.x < -0.05 ? 1 : alt;
  b.vx = xDir * NUDGE_VX;
  b.vz = zDir * NUDGE_VZ;
  sim.nudges++;
  sim.stuckT = 0;
}

/** Walls, goal posts and goals. Returns true when a goal was scored. */
function collideWalls(m: Match): boolean {
  const b = m.ball;
  const wx = HALF_W - R;
  if (b.x > wx) {
    b.x = wx;
    if (b.vx > 0) {
      if (b.vx > WALL_EVENT_MIN) emit({ type: 'wall', speed: b.vx });
      b.vx = -b.vx * WALL_E;
    }
  } else if (b.x < -wx) {
    b.x = -wx;
    if (b.vx < 0) {
      if (-b.vx > WALL_EVENT_MIN) emit({ type: 'wall', speed: -b.vx });
      b.vx = -b.vx * WALL_E;
    }
  }

  const wz = HALF_L - R;
  const az = Math.abs(b.z);
  if (az <= wz) return false;
  const end = b.z > 0 ? 1 : -1;

  if (Math.abs(b.x) < GOAL_HALF) {
    if (az > HALF_L) {
      score(m, end > 0 ? 'blue' : 'amber');
      return true;
    }
    // In the mouth but not over the line yet: the goal posts are point obstacles.
    const px = b.x >= 0 ? GOAL_HALF : -GOAL_HALF;
    const ex = b.x - px;
    const ez = b.z - end * HALF_L;
    const d2 = ex * ex + ez * ez;
    if (d2 < R * R && d2 > 1e-12) {
      const dist = Math.sqrt(d2);
      const nx = ex / dist;
      const nz = ez / dist;
      b.x += nx * (R - dist);
      b.z += nz * (R - dist);
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) {
        if (-vn > WALL_EVENT_MIN) emit({ type: 'wall', speed: -vn });
        b.vx -= (1 + WALL_E) * vn * nx;
        b.vz -= (1 + WALL_E) * vn * nz;
      }
    }
    return false;
  }

  b.z = end * wz;
  const vn = b.vz * end;
  if (vn > 0) {
    if (vn > WALL_EVENT_MIN) emit({ type: 'wall', speed: vn });
    b.vz = -b.vz * WALL_E;
  }
  return false;
}

function score(m: Match, team: Team): void {
  m.score[team]++;
  m.sim.conceded = team === 'blue' ? 'amber' : 'blue';
  m.sim.stuckT = 0;
  m.phaseT = 0;
  emit({ type: 'goal', team });
  if (m.score[team] >= WIN_SCORE) {
    m.phase = 'over';
    m.winner = team;
    m.ball.vx = m.ball.vz = 0;
    emit({ type: 'win', team });
  } else {
    m.phase = 'goal';
  }
}

/** After a goal the ball rolls to rest inside the goal. */
function settleInGoal(m: Match): void {
  const b = m.ball;
  const k = Math.exp(-8 * DT);
  b.vx *= k;
  b.vz *= k;
  b.x = clamp(b.x + b.vx * DT, -(GOAL_HALF - R), GOAL_HALF - R);
  const end = b.z >= 0 ? 1 : -1;
  b.z = end * clamp(Math.abs(b.z + b.vz * DT), HALF_L, HALF_L + GOAL_DEPTH);
}

function collideFigures(m: Match): void {
  const b = m.ball;
  for (let i = 0; i < RODS.length; i++) {
    const spec = RODS[i];
    const dzRod = b.z - spec.z;
    if (dzRod > 0.12 || dzRod < -0.12) continue;
    const rod = m.rods[i];
    const c = Math.cos(rod.angle);
    if (c <= FOOT_MIN_COS) continue; // foot lifted: the ball passes underneath
    const cz = spec.z + Math.sin(rod.angle) * FOOT_LEN;
    const fvx = m.sim.rodVx[i];
    const fvz = rod.angVel * c * FOOS.rodY;
    for (let j = 0; j < spec.count; j++) {
      const dx = b.x - (rod.x + figureOffset(i, j));
      const dz = b.z - cz;
      const ex = dx - clamp(dx, -FIG_HW, FIG_HW);
      const ez = dz - clamp(dz, -FIG_HD, FIG_HD);
      const d2 = ex * ex + ez * ez;
      if (d2 >= R * R) continue;
      let nx = 0;
      let nz = 0;
      let pen: number;
      if (d2 > 1e-12) {
        const dist = Math.sqrt(d2);
        nx = ex / dist;
        nz = ez / dist;
        pen = R - dist;
      } else {
        // Ball centre inside the foot: leave along the axis of least penetration.
        const penX = FIG_HW - Math.abs(dx);
        const penZ = FIG_HD - Math.abs(dz);
        if (penZ <= penX) {
          nz = dz > 0 ? 1 : dz < 0 ? -1 : teamDir(i);
          pen = penZ + R;
        } else {
          nx = dx >= 0 ? 1 : -1;
          pen = penX + R;
        }
      }
      b.x += nx * pen;
      b.z += nz * pen;
      const vn = (b.vx - fvx) * nx + (b.vz - fvz) * nz;
      if (vn < 0) {
        b.vx -= (1 + FIGURE_E) * vn * nx;
        b.vz -= (1 + FIGURE_E) * vn * nz;
        const sp = capSpeed(b);
        if (-vn > HIT_EVENT_MIN) emit({ type: 'hit', rod: i, speed: sp });
      }
    }
  }
}
