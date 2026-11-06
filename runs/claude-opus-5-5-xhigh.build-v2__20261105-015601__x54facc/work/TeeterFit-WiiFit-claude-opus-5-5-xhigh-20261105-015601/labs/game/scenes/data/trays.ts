/**
 * @file Sand Garden's trays (PLAN.md section 6): 1 to 3 marbles each, rising to moving rakes and a gap in the rim. The tray
 * is 2.4 m wide, its half 1.2. Adding a row adds a tray. `via` is where the bot aims first, so it can find the way.
 *
 * Game code, sim-side data.
 *
 * @example
 * TRAYS[0].marbles.length; // 1
 */

/** A point on a tray. */
type P = readonly [number, number];

/** A tray. */
export interface TrayDef {
  marbles: readonly P[];
  holes: readonly P[];
  /** Ridges: [x0, z0, x1, z1]. */
  ridges: readonly (readonly [number, number, number, number])[];
  /** Moving rakes: x, z, half length, speed, along x when true. */
  rakes: readonly { x: number; z: number; half: number; speed: number; range: number; alongX: boolean }[];
  /** A gap in the rim: on which side, centre, half width. Marbles that fall through come back. */
  gap?: { side: 'N' | 'S' | 'E' | 'W'; at: number; half: number };
  /** The bot's waypoints per marble. */
  via?: readonly (readonly P[])[];
}

/** The trays. */
export const TRAYS: readonly TrayDef[] = [
  { marbles: [[-0.7, 0.7]], holes: [[0.6, -0.6]], ridges: [], rakes: [] },
  {
    marbles: [[-0.8, -0.7], [0.8, -0.7]],
    holes: [[-0.6, 0.7], [0.6, 0.7]],
    ridges: [[-0.25, -0.2, 0.25, -0.2]],
    rakes: [],
  },
  {
    marbles: [[-0.85, 0.85], [-0.4, 0.85]],
    holes: [[0.8, -0.8], [0.3, -0.8]],
    ridges: [[-1.2, 0, 0.5, 0]],
    rakes: [],
    via: [[[0.85, 0.4], [0.85, -0.3]], [[0.85, 0.4], [0.85, -0.3]]],
  },
  {
    marbles: [[-0.9, 0.9], [0, 0.9], [0.9, 0.9]],
    holes: [[-0.7, -0.8], [0, -0.8], [0.7, -0.8]],
    ridges: [],
    rakes: [{ x: 0, z: 0, half: 0.4, speed: 0.5, range: 0.75, alongX: true }],
  },
  {
    marbles: [[-0.8, 0.8], [0.8, 0.8], [0, 0.2]],
    holes: [[-0.8, -0.85], [0.8, -0.85], [0, -0.3]],
    ridges: [[-0.5, 0.3, -0.1, 0.3], [0.1, 0.3, 0.5, 0.3]],
    rakes: [{ x: 0, z: -0.65, half: 0.3, speed: 0.4, range: 0.5, alongX: true }],
    gap: { side: 'S', at: 0, half: 0.22 },
  },
]; // prettier-ignore
