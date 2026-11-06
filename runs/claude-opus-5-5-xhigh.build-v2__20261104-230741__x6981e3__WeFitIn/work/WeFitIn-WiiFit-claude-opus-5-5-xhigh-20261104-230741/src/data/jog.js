// Island Jog: the path round Tare Island, as (x, z) control points on a closed Catmull-Rom curve.
export const JOG_PATH = [
  [0, 8.5], [6, 12.5], [10.5, 10.4], [14, 15.2], [19, 13], [15.8, 7.4], [15.2, 0], [15.8, -4.4], [18.6, -7], [19.4, -13], [14, -15.6],
  [7, -14.6], [4, -10.8], [1, -13.6], [-4.4, -11.8], [-6.4, -7], [-13, -6.2], [-20, -7], [-16.5, -3.2], [-20.6, 1], [-16.8, 5.6], [-20.2, 10], [-14.5, 9.4], [-18, 13.4], [-15, 15], [-11.5, 12.2], [-8, 15.4],
  [-3.6, 11], [-5.4, 7.2], [-9.4, 7.6], [-11, 9.8], [-3, 9.6],
  [-2.4, 6], [-2, 0.5], [-5, -2.4], [-1, -6.4], [1, -5.6], [7, -5.2], [6.8, 1], [3, 6],
];
export const JOG = { speed: 3, bandLow: -0.6, bandHigh: 0.6, stitchAfter: 2, stitchSeconds: 3, stitchSpeed: 0.5, stumble: 0.5, wait: 12, cups: 18, strafe: 1.5, strafeSpeed: 3, limit: 110, hitRadius: 0.6, cupRadius: 0.8 };
/** Obstacles at a share of the way round, offset across the path. */
export const JOG_OBSTACLES = [
  { u: 0.1, x: 0.8, kind: 'sprinkler' }, { u: 0.17, x: -0.8, kind: 'picnic' }, { u: 0.27, x: 0.2, kind: 'dennis' }, { u: 0.35, x: 0.9, kind: 'sprinkler' },
  { u: 0.43, x: -0.6, kind: 'kevin' }, { u: 0.52, x: 0.7, kind: 'picnic' }, { u: 0.6, x: -0.9, kind: 'sprinkler' }, { u: 0.68, x: 0.3, kind: 'dennis' },
  { u: 0.77, x: -0.5, kind: 'picnic' }, { u: 0.85, x: 0.6, kind: 'kevin' }, { u: 0.93, x: -0.8, kind: 'sprinkler' },
];
