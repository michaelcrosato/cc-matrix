/**
 * @file Sand Garden's trays as data. A tray is 3 × 3 m with its centre at (0, 0). `marbles` start where given; `holes` catch
 * them; `ridges` are segments marbles bounce off; `rakes` are ridges that slide back and forth; `gap` opens part of the rim
 * (a marble through it is carried back). `path` is the way the bot aims, and a hint for a person.
 */
export interface Tray {
  readonly marbles: readonly (readonly [number, number])[];
  readonly holes: readonly (readonly [number, number])[];
  readonly ridges: readonly (readonly [number, number, number, number])[];
  readonly rakes: readonly {
    readonly from: readonly [number, number, number, number];
    readonly dx: number;
    readonly dz: number;
    readonly speed: number;
  }[];
  readonly gap?: readonly [number, number];
  readonly path?: readonly (readonly [number, number])[];
}

export const TRAYS: readonly Tray[] = [
  { marbles: [[-0.9, -0.9]], holes: [[0.8, 0.8]], ridges: [], rakes: [] },
  { marbles: [[-1, 0.9], [1, 0.9]], holes: [[0, -0.9]], ridges: [[-0.5, 0.2, 0.5, 0.2]], rakes: [], path: [[-0.9, 0.2]] },
  { marbles: [[-1, -1]], holes: [[1, 1]], ridges: [[-1.5, -0.3, 0.7, -0.3], [-0.7, 0.4, 1.5, 0.4]], rakes: [], path: [[1.1, -1], [1.1, 0], [-1.1, 0.05], [-1.1, 1]] },
  { marbles: [[-1, 1], [0, 1], [1, 1]], holes: [[-0.8, -0.9], [0.8, -0.9]], ridges: [], rakes: [{ from: [-0.6, 0, 0.6, 0], dx: 0.8, dz: 0, speed: 0.012 }] },
  { marbles: [[1.1, 1.1], [-1.1, 1.1], [0, 0.4]], holes: [[0, -1.1], [1.05, -0.5]], ridges: [[-0.4, -0.2, 0.4, -0.2]], rakes: [{ from: [-1.4, 0.7, -0.5, 0.7], dx: 0.9, dz: 0, speed: 0.016 }], gap: [-0.6, 0.6] },
]; // prettier-ignore
