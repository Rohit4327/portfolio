/**
 * collision.js — a dedicated collision representation, separate from the render
 * geometry. The world is described as:
 *   walkable[]  axis-aligned rectangles the player may stand inside
 *   blockers[]  axis-aligned rectangles the player may not enter
 * The player is an upright cylinder of `radius`, so resolution is a 2D
 * circle-vs-AABB push-out done one axis at a time. Cheap, stable, no tunnelling
 * at walking speed, and it keeps real door openings traversable.
 */

export class CollisionWorld {
  constructor(radius = 0.3) {
    this.radius = radius;
    this.walkable = [];
    this.blockers = [];
    this.grid = null;
    this.cell = 2.0;
  }

  /** Bucket blockers into a uniform grid so movement stays O(1)-ish. */
  bake() {
    this.grid = new Map();
    this.blockers.forEach((b, i) => {
      const x0 = Math.floor((b.x0 - this.radius) / this.cell);
      const x1 = Math.floor((b.x1 + this.radius) / this.cell);
      const z0 = Math.floor((b.z0 - this.radius) / this.cell);
      const z1 = Math.floor((b.z1 + this.radius) / this.cell);
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const k = `${x},${z}`;
          let arr = this.grid.get(k);
          if (!arr) this.grid.set(k, (arr = []));
          arr.push(i);
        }
      }
    });
    return this;
  }

  nearby(x, z) {
    if (!this.grid) this.bake();
    const k = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
    const idx = this.grid.get(k);
    return idx ? idx.map((i) => this.blockers[i]) : EMPTY;
  }

  /** Is this exact point on some walkable rectangle? */
  onFloor(x, z) {
    for (const w of this.walkable) {
      if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) return true;
    }
    return false;
  }

  /**
   * The player's whole footprint has to be over floor. Sampling the rim rather
   * than insetting each rectangle matters where two rectangles meet - the lift
   * lobby joins the main plate along a shared edge, and insetting would leave
   * an impassable dead band right in the doorway.
   */
  insideWalkable(x, z) {
    const r = this.radius * 0.96;
    if (!this.onFloor(x, z)) return false;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      if (!this.onFloor(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false;
    }
    return true;
  }

  /** True if the player circle at (x,z) overlaps any blocker. */
  hits(x, z) {
    const r = this.radius;
    for (const b of this.nearby(x, z)) {
      if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true;
    }
    return false;
  }

  /**
   * Move from (x,z) by (dx,dz), sliding along whatever it runs into.
   * Returns the resolved position.
   */
  move(x, z, dx, dz) {
    let nx = x, nz = z;
    const tryAxis = (tx, tz) => {
      if (!this.hits(tx, tz) && this.reachable(tx, tz)) return true;
      return false;
    };
    if (dx !== 0 && tryAxis(nx + dx, nz)) nx += dx;
    if (dz !== 0 && tryAxis(nx, nz + dz)) nz += dz;
    // if both axes were rejected, try the smaller step so we never lock up
    if (nx === x && nz === z && (dx || dz)) {
      const sx = dx * 0.35, sz = dz * 0.35;
      if (tryAxis(x + sx, z)) nx = x + sx;
      else if (tryAxis(x, z + sz)) nz = z + sz;
    }
    return { x: nx, z: nz };
  }

  /** Inside the floor plate (or the lift lobby) and not through a blocker. */
  reachable(x, z) {
    return this.insideWalkable(x, z);
  }

  /** Nearest legal position, used when a reset or a resize nudges the player. */
  snap(x, z) {
    if (!this.hits(x, z) && this.reachable(x, z)) return { x, z };
    for (let r = 0.2; r <= 4; r += 0.2) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (!this.hits(px, pz) && this.reachable(px, pz)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }
}

const EMPTY = [];
