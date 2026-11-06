/**
 * @file The twelve guests of the Great Tilt: who they are and where the storm finds them. Gerald, Bex and Nan are the named
 * cast; the rest are crowd bodies in the engine's own builds.
 *
 * Game code, sim-side data.
 *
 * @example
 * TILT_GUESTS.length; // 12
 */

/** A guest in the finale. */
export interface TiltGuest {
  name: string;
  x: number;
  z: number;
  build: string;
}

/** The guests. */
export const TILT_GUESTS: readonly TiltGuest[] = [
  { name: 'gerald', x: 10, z: 26, build: '' },
  { name: 'bex', x: -6, z: 22, build: '' },
  { name: 'nan', x: 2, z: 44, build: '' },
  { name: 'guest', x: -14, z: 30, build: 'build:guest0' },
  { name: 'guest', x: -20, z: 40, build: 'build:guest1' },
  { name: 'guest', x: 16, z: 40, build: 'build:guest2' },
  { name: 'guest', x: 22, z: 30, build: 'build:guest0' },
  { name: 'guest', x: -30, z: 24, build: 'build:guest1' },
  { name: 'guest', x: -26, z: 10, build: 'build:guest2' },
  { name: 'guest', x: 32, z: 14, build: 'build:guest1' },
  { name: 'guest', x: 8, z: 12, build: 'build:guest0' },
  { name: 'guest', x: -10, z: 6, build: 'build:guest2' },
];
