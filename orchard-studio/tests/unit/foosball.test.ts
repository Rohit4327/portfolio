import { describe, expect, it } from 'vitest';
import { FOOS, PHYSICS_HZ, RODS, WIN_SCORE } from '../../src/systems/interactions/foosballSpec';
import {
  BLUE_ROD_BY_ROLE,
  advanceMatch,
  createMatch,
  figureXs,
  placeBall,
  resetMatch,
  stepMatch,
} from '../../src/systems/interactions/foosballEngine';
import type { Match, MatchEvent, MatchInput } from '../../src/systems/interactions/foosballEngine';

const IDLE: MatchInput = { role: 2, slide: 0, kick: false };
const steps = (seconds: number): number => Math.round(seconds * PHYSICS_HZ);

/** Small seeded PRNG for the tests themselves. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function allFinite(m: Match): boolean {
  const nums = [m.time, m.phaseT, m.ball.x, m.ball.z, m.ball.vx, m.ball.vz, m.score.blue, m.score.amber];
  for (const r of m.rods) nums.push(r.x, r.angle, r.angVel, r.kickT);
  return nums.every(Number.isFinite);
}

function scriptedInput(k: number): MatchInput {
  const role = (Math.floor(k / 180) % 4) as 0 | 1 | 2 | 3;
  const slide = Math.floor(k / 70) % 3 - 1;
  return { role, slide, kick: k % 97 === 0 };
}

describe('foosball engine', () => {
  it('is deterministic for a given seed and input script', () => {
    const run = (seed: number): { m: Match; log: MatchEvent[] } => {
      const m = createMatch(seed);
      const log: MatchEvent[] = [];
      for (let k = 0; k < steps(5); k++) log.push(...stepMatch(m, scriptedInput(k)));
      return { m, log };
    };
    const a = run(1234);
    const b = run(1234);
    expect(a.m).toEqual(b.m);
    expect(a.log).toEqual(b.log);
    expect(a.log.some((e) => e.type === 'serve')).toBe(true);
    expect(allFinite(a.m)).toBe(true);
    const c = run(99);
    expect(c.m.ball).not.toEqual(a.m.ball);

    // resetMatch replays the same match.
    resetMatch(a.m);
    for (let k = 0; k < steps(5); k++) stepMatch(a.m, scriptedInput(k));
    expect(a.m).toEqual(b.m);
  });

  it('advanceMatch takes fixed steps and clamps dt', () => {
    const m = createMatch(5);
    expect(advanceMatch(m, 1 / 60, IDLE)).toBe(4);
    expect(advanceMatch(m, 5, IDLE)).toBe(Math.round(0.1 * PHYSICS_HZ));
    m.paused = true;
    const t = m.time;
    expect(advanceMatch(m, 0.05, IDLE)).toBe(0);
    expect(stepMatch(m, IDLE)).toHaveLength(0);
    expect(m.time).toBe(t);
  });

  it('scores a goal for each team against a scripted ball', () => {
    const m = createMatch(7);
    placeBall(m, 0, RODS[7].z + 0.03, 0, 3);
    const seen: MatchEvent[] = [];
    for (let k = 0; k < steps(1); k++) seen.push(...stepMatch(m, IDLE));
    expect(seen).toContainEqual({ type: 'goal', team: 'blue' });
    expect(m.score).toEqual({ blue: 1, amber: 0 });

    const n = createMatch(7);
    placeBall(n, 0, RODS[0].z - 0.03, 0, -3);
    const seen2: MatchEvent[] = [];
    for (let k = 0; k < steps(1); k++) seen2.push(...stepMatch(n, IDLE));
    expect(seen2).toContainEqual({ type: 'goal', team: 'amber' });
    expect(n.score).toEqual({ blue: 0, amber: 1 });

    // After the goal pause the ball is served again from the centre.
    for (let k = 0; k < steps(1.5); k++) seen2.push(...stepMatch(n, IDLE));
    expect(seen2.some((e) => e.type === 'serve')).toBe(true);
    expect(n.phase).toBe('play');
  });

  it('first to WIN_SCORE wins and the match stops', () => {
    const m = createMatch(3);
    const seen: MatchEvent[] = [];
    for (let g = 0; g < WIN_SCORE; g++) {
      placeBall(m, 0, RODS[7].z + 0.03, 0, 3);
      for (let k = 0; k < steps(0.2); k++) seen.push(...stepMatch(m, IDLE));
    }
    expect(m.phase).toBe('over');
    expect(m.winner).toBe('blue');
    expect(seen.filter((e) => e.type === 'goal')).toHaveLength(WIN_SCORE);
    expect(seen[seen.length - 1]).toEqual({ type: 'win', team: 'blue' });
    const t = m.time;
    expect(stepMatch(m, IDLE)).toHaveLength(0);
    expect(m.time).toBe(t);
  });

  it('bounces off a side wall with reduced speed and never leaves the field', () => {
    const m = createMatch(11);
    placeBall(m, 0.2, 0, 2, 0);
    const seen: MatchEvent[] = [];
    for (let k = 0; k < steps(0.15); k++) {
      seen.push(...stepMatch(m, IDLE));
      expect(Math.abs(m.ball.x)).toBeLessThanOrEqual(FOOS.fieldW / 2);
    }
    expect(seen.some((e) => e.type === 'wall')).toBe(true);
    expect(m.ball.vx).toBeLessThan(-1);
    expect(Math.abs(m.ball.vx)).toBeLessThan(2 * 0.8);

    const rnd = lcg(42);
    for (let k = 0; k < steps(3) * 4; k++) {
      if (k % 60 === 0) {
        if (m.phase === 'over') resetMatch(m);
        const a = rnd() * Math.PI * 2;
        const sp = 0.5 + rnd() * 6.5;
        placeBall(m, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 1.1, Math.cos(a) * sp, Math.sin(a) * sp);
      }
      stepMatch(m, { role: (k % 4) as 0 | 1 | 2 | 3, slide: k % 200 < 100 ? 1 : -1, kick: k % 53 === 0 });
      expect(allFinite(m)).toBe(true);
      expect(Math.abs(m.ball.x)).toBeLessThanOrEqual(FOOS.fieldW / 2);
      expect(Math.abs(m.ball.z)).toBeLessThanOrEqual(FOOS.fieldL / 2 + 0.05);
      expect(Math.hypot(m.ball.vx, m.ball.vz)).toBeLessThanOrEqual(7.0001);
    }
  });

  it('a kick adds speed to a slow ball in front of the attack rod', () => {
    const m = createMatch(21);
    const rodIndex = BLUE_ROD_BY_ROLE[3];
    const rod = RODS[rodIndex];
    const x = figureXs(m, rodIndex)[1];
    placeBall(m, x, rod.z + 0.02 + FOOS.ballR, 0, 0.01);
    const seen: MatchEvent[] = [];
    let maxVz = 0;
    for (let k = 0; k < steps(0.2); k++) {
      seen.push(...stepMatch(m, { role: 3, slide: 0, kick: k === 0 }));
      expect(m.rods[rodIndex].kickT > 0).toBe(true);
      maxVz = Math.max(maxVz, m.ball.vz);
    }
    expect(seen[0]).toEqual({ type: 'kick', rod: rodIndex });
    expect(seen.filter((e) => e.type === 'kick' && e.rod === rodIndex)).toHaveLength(1);
    expect(seen.some((e) => e.type === 'hit' && e.rod === rodIndex && e.speed > 1.5)).toBe(true);
    expect(maxVz).toBeGreaterThan(1.5);
    // The swing finishes and the figure hangs vertical again.
    for (let k = 0; k < steps(0.15); k++) stepMatch(m, { role: 3, slide: 0, kick: false });
    expect(m.rods[rodIndex].kickT).toBe(0);
    expect(m.rods[rodIndex].angle).toBe(0);
  });

  it('kick swing peaks at about 25 rad/s toward the opponent goal', () => {
    const m = createMatch(2);
    const rodIndex = BLUE_ROD_BY_ROLE[0];
    let peak = 0;
    let minAngle = 0;
    let maxAngle = 0;
    for (let k = 0; k < steps(0.3); k++) {
      stepMatch(m, { role: 0, slide: 0, kick: k === 0 });
      peak = Math.max(peak, m.rods[rodIndex].angVel);
      minAngle = Math.min(minAngle, m.rods[rodIndex].angle);
      maxAngle = Math.max(maxAngle, m.rods[rodIndex].angle);
    }
    expect(peak).toBeGreaterThan(22);
    expect(peak).toBeLessThan(28);
    expect(minAngle).toBeCloseTo((-35 * Math.PI) / 180, 1);
    expect(maxAngle).toBeCloseTo((55 * Math.PI) / 180, 1);
  });

  it('a 7 m/s ball does not tunnel through a vertical figure', () => {
    const rodIndex = BLUE_ROD_BY_ROLE[3];
    const rod = RODS[rodIndex];
    // Vary the starting distance by 1 mm steps so every sub-step phase is exercised.
    for (let o = 0; o < 30; o++) {
      const m = createMatch(31 + o);
      const x = figureXs(m, rodIndex)[1];
      placeBall(m, x, rod.z + 0.07 + o * 0.001, 0, -7);
      let hit = false;
      for (let k = 0; k < steps(0.03); k++) {
        for (const e of stepMatch(m, { role: 0, slide: 0, kick: false })) {
          if (e.type === 'hit' && e.rod === rodIndex) hit = true;
        }
        expect(m.ball.z).toBeGreaterThan(rod.z);
      }
      expect(hit).toBe(true);
      expect(m.ball.vz).toBeGreaterThan(0);
    }
  });

  it('AI aiming error stays bounded while tracking a slowly moving ball', () => {
    const m = createMatch(77);
    const rodIndex = 7;
    const out: number[] = [];
    let worst = 0;
    for (let k = 0; k < steps(20); k++) {
      const t = k / PHYSICS_HZ;
      const w = (2 * Math.PI) / 10;
      const x = 0.1 * Math.sin(w * t);
      placeBall(m, x, RODS[rodIndex].z, 0.1 * w * Math.cos(w * t), 0);
      stepMatch(m, IDLE);
      if (t > 1) worst = Math.max(worst, Math.abs(figureXs(m, rodIndex, out)[0] - x));
    }
    expect(worst).toBeLessThan(m.ai.maxError + 0.03);
    expect(m.score).toEqual({ blue: 0, amber: 0 });
  });

  it('the human rod slides at 0.9 m/s and is clamped to its travel', () => {
    const m = createMatch(4);
    const rodIndex = BLUE_ROD_BY_ROLE[2];
    for (let k = 0; k < steps(0.05); k++) stepMatch(m, { role: 2, slide: 1, kick: false });
    expect(m.rods[rodIndex].x).toBeCloseTo(0.045, 3);
    for (let k = 0; k < steps(1); k++) stepMatch(m, { role: 2, slide: 1, kick: false });
    expect(m.rods[rodIndex].x).toBeCloseTo(RODS[rodIndex].travel, 9);
  });

  it('an AI-vs-idle-human match does not deadlock', () => {
    const m = createMatch(2024);
    let firstGoalAt = -1;
    const limit = steps(600);
    for (let k = 0; k < limit && m.phase !== 'over'; k++) {
      for (const e of stepMatch(m, IDLE)) {
        if (e.type === 'goal' && firstGoalAt < 0) firstGoalAt = m.time;
      }
      if (k % 240 === 0) expect(allFinite(m)).toBe(true);
    }
    expect(allFinite(m)).toBe(true);
    expect(firstGoalAt).toBeGreaterThan(0);
    expect(firstGoalAt).toBeLessThan(180);
    expect(m.score.blue + m.score.amber).toBeGreaterThan(0);
    if (m.phase === 'over') {
      expect(m.winner).not.toBeNull();
      expect(Math.max(m.score.blue, m.score.amber)).toBe(WIN_SCORE);
    }
  });
});
