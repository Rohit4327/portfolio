/**
 * Shared foosball dimensions (metres), used by the table builder, the physics engine and the renderer.
 * Table-local frame: origin at the centre of the playfield surface, +Z toward the amber goal, +X to the right
 * when looking along +Z, +Y up. Rods run along X and are spaced along Z.
 */
export const FOOS = {
  /** Cabinet outside: 56 x 30 in, 36 in tall. */
  cabinetL: 1.4224,
  cabinetW: 0.762,
  cabinetH: 0.9144,
  /** Playfield inside the walls. */
  fieldL: 1.2,
  fieldW: 0.68,
  /** Height of the playfield surface above the floor. */
  fieldY: 0.79,
  wallH: 0.1,
  goalW: 0.2,
  ballR: 0.017,
  /** Rod axis height above the playfield. */
  rodY: 0.075,
  rodR: 0.008,
  /** Figure: foot reaches to ~5 mm above the field when vertical. */
  figureW: 0.03,
  figureFootDepth: 0.022,
  figureLen: 0.07,
} as const;

export type Team = 'blue' | 'amber';
export type Role = 'keeper' | 'defence' | 'midfield' | 'attack';
export interface RodSpec {
  team: Team;
  role: Role;
  /** Z position of the rod. */
  z: number;
  /** Number of figures and their spacing along X. */
  count: number;
  spacing: number;
  /** Maximum slide of the rod either side of centre. */
  travel: number;
}
const z = (i: number) => -FOOS.fieldL / 2 + (FOOS.fieldL / 8) * (i + 0.5);
const rod = (i: number, team: Team, role: Role, count: number): RodSpec => {
  const spacing = count === 1 ? 0 : count === 2 ? 0.24 : count === 3 ? 0.185 : 0.12;
  const span = (count - 1) * spacing;
  return { team, role, z: z(i), count, spacing, travel: Math.max(0.02, (FOOS.fieldW - span) / 2 - FOOS.figureW / 2 - 0.005) };
};
/** Blue (the visitor) defends the -Z goal and attacks +Z. Amber is the AI. 1 + 2 + 5 + 3 figures per team. */
export const RODS: RodSpec[] = [
  rod(0, 'blue', 'keeper', 1),
  rod(1, 'blue', 'defence', 2),
  rod(2, 'amber', 'attack', 3),
  rod(3, 'blue', 'midfield', 5),
  rod(4, 'amber', 'midfield', 5),
  rod(5, 'blue', 'attack', 3),
  rod(6, 'amber', 'defence', 2),
  rod(7, 'amber', 'keeper', 1),
];
/** The keeper rod only needs to cover the goal mouth. */
RODS[0].travel = RODS[7].travel = FOOS.goalW / 2 + 0.03;
export const WIN_SCORE = 5;
export const PHYSICS_HZ = 240;
