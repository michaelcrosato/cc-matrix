/**
 * @file The rest pose copied from the engine's Mesh2Motion set (data/anim/sets/mesh2motion/_set.json, sources.M2M_ANIMATED.rest): the body the RETREAT clips are measured on. Kept as TypeScript because a JSON import is not in the type-check project.
 * @example
 * Object.keys(REST).length; // the rest body's fields
 */
export const REST: Record<string, unknown> = {
  H0: 916.7,
  hipZ: 932.1,
  ankleZ: 97.96,
  Pr: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  Cr: [
    [0.97616, 0, 0.21704],
    [0, 1, 0],
    [-0.21704, 0, 0.97616],
  ],
  Hr: [
    [0.99625, 0, -0.08657],
    [0, 1, 0],
    [0.08657, 0, 0.99625],
  ],
  hip: {
    L: [51.5, -89, 15.4],
    R: [51.5, 89, 15.4],
  },
  spine: [
    [26, 0, 100.7],
    [15.2, 0, 123.1],
    [-4.5, 0, 141.2],
    [-37.9, 0, 170.6],
  ],
  neckSeg: [62.8, 0, 116.2],
  clav: {
    L: [105.5, -18.8, -51.7],
    R: [105.5, 18.8, -51.7],
  },
  cv: {
    L: [-120.5, -154.9, 48.2],
    R: [-120.5, 154.9, 48.2],
  },
  topH: [0, 0, 57.9],
  faceH: [119.5, 0, 10.4],
  up: 296.59,
  fore: 279.79,
  knuck: 109.09,
  fist: 151.65,
  thigh: 406.63,
  shin: 433.19,
  ab: 181.41,
  bt: 86.29,
  abPitch: 27.14,
  btPitch: 2.38,
  spineW: [0, 0.3, 0.65, 1],
  neckW: 0.55,
};
export default REST;
