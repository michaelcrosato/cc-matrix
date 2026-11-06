/**
 * @file The Retreat clip set: every pose of Wee Tare as a two-key strip (`t = 0` stands, `t = 1` is the pose), scrubbed by
 * the sim, so the body goes into a pose exactly as far as your thumb does. Plus additive leans and a few short cycles,
 * all written by hand in the library's readable key format (LEGEND in engine/anim/clip/lens.ts). `LIBRARY` holds the
 * clips copied from the engine's library with their sources (tools/copy-clips.mjs).
 */
import { defineClipSet } from '../../../engine/sim-api';
import { LIBRARY_TEXT, REST_TEXT } from './clipdata/library';

const rest = JSON.parse(REST_TEXT) as object;
const library = JSON.parse(LIBRARY_TEXT) as { sources: object; clips: object };

type Keys = Record<string, number[]>;

const STAND: Keys = {
  hips: [0, 0, 100], body: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], shL: [0, 0], shR: [0, 0],
  armL: [0, 20, -100, 8, 0], armR: [0, 20, -100, 8, 0], legL: [0, 6, -100, 4, 0], legR: [0, 6, -100, 4, 0], footL: [0, 6, 0], footR: [0, 6, 0],
}; // prettier-ignore

const key = (t: number, over: Keys) => ({ t, ...STAND, ...over });
/** A two-key strip: stands at 0, the pose at 1. */
const strip = (over: Keys) => ({ src: 'RETREAT', dur: 1, loop: false, keys: [key(0, {}), key(1, over)] });
/** A strip that passes through `mid` halfway. */
const strip3 = (mid: Keys, over: Keys) => ({
  src: 'RETREAT',
  dur: 1,
  loop: false,
  keys: [key(0, {}), key(0.5, mid), key(1, over)],
});
/** Keys evenly spread over `dur`, looping. */
const ring = (dur: number, poses: Keys[]) => ({
  src: 'RETREAT', dur, loop: true,
  keys: [...poses, poses[0]].map((over, i) => key((i / poses.length) * dur, over)),
}); // prettier-ignore

const CHAIR: Keys = { hips: [-14, 0, 62], body: [0, 22, 0], legL: [50, 6, -62, 74, 0], legR: [50, 6, -62, 74, 0], armL: [86, 8, 4, 6, 0], armR: [86, 8, 4, 6, 0] }; // prettier-ignore

const POSES = {
  Heron: strip({ hips: [0, 0, 99], legL: [0, 2, -100, 2, 0], legR: [28, 62, -42, 118, 40], footR: [30, 20, 0], armL: [6, 4, 100, 30, 0], armR: [6, 4, 100, 30, 0] }),
  Archer: strip({ hips: [0, 0, 72], legL: [62, 12, -78, 62, 0], legR: [-70, 10, -72, 4, 0], footR: [10, 40, 0], armL: [0, 100, 4, 2, 0], armR: [0, 100, 4, 2, 0] }),
  Nothing: strip({ hips: [-5, 0, 28], legL: [70, 60, -18, 140, 40], legR: [70, 60, -22, 140, -40], footL: [-20, 60, 0], footR: [-20, 60, 0], armL: [70, 22, -60, 58, 20], armR: [70, 22, -60, 58, -20] }),
  Chair: strip(CHAIR),
  CommaR: strip({ body: [0, 0, 22], chest: [0, 0, 14], hips: [0, -6, 98], armL: [0, 60, 90, 18, 0], armR: [0, 30, -80, 20, 0] }),
  CommaL: strip({ body: [0, 0, -22], chest: [0, 0, -14], hips: [0, 6, 98], armR: [0, 60, 90, 18, 0], armL: [0, 30, -80, 20, 0] }),
  Napkin: strip({ hips: [-8, 0, 94], body: [0, 78, 0], chest: [0, 18, 0], head: [0, 10, 0], armL: [80, 4, -60, 6, 0], armR: [80, 4, -60, 6, 0] }),
  Bridge: strip3(
    { hips: [-20, 0, 22], body: [0, -80, 0], legL: [70, 8, 20, 120, 0], legR: [70, 8, 20, 120, 0], armL: [-40, 12, -40, 4, 0], armR: [-40, 12, -40, 4, 0] },
    { hips: [-20, 0, 58], body: [0, -80, 0], legL: [70, 8, -30, 86, 0], legR: [70, 8, -30, 86, 0], armL: [-40, 12, -60, 4, 0], armR: [-40, 12, -60, 4, 0] },
  ),
  Lighthouse: strip({ hips: [0, 0, 106], armL: [4, 2, 100, 2, 0], armR: [4, 2, 100, 2, 0], footL: [-30, 2, 0], footR: [-30, 2, 0], legL: [0, 2, -100, 0, 0], legR: [0, 2, -100, 0, 0] }),
  LeanR: strip({ body: [0, 0, 8], chest: [0, 0, 4], hips: [0, 5, 99], armL: [0, 40, -70, 8, 0] }),
  LeanL: strip({ body: [0, 0, -8], chest: [0, 0, -4], hips: [0, -5, 99], armR: [0, 40, -70, 8, 0] }),
  LeanF: strip({ body: [0, 9, 0], chest: [0, 3, 0], hips: [4, 0, 99], armL: [24, 20, -90, 10, 0], armR: [24, 20, -90, 10, 0] }),
  LeanB: strip({ body: [0, -8, 0], chest: [0, -3, 0], hips: [-4, 0, 99], armL: [-24, 20, -90, 10, 0], armR: [-24, 20, -90, 10, 0] }),
  DeepKnee: strip(CHAIR),
  SideLunge: strip({ hips: [0, 34, 66], legL: [0, 46, -72, 6, 0], legR: [40, 12, -70, 78, 0], body: [0, 12, 8], armL: [60, 20, -30, 40, 0], armR: [60, 20, -30, 40, 0] }),
  StepUpL: strip({ hips: [0, -5, 105], legL: [60, 6, -40, 84, 0], armR: [30, 18, -80, 40, 0], armL: [-20, 18, -90, 20, 0] }),
  StepUpR: strip({ hips: [0, 5, 105], legR: [60, 6, -40, 84, 0], armL: [30, 18, -80, 40, 0], armR: [-20, 18, -90, 20, 0] }),
  SideStep: strip({ hips: [0, 22, 96], legL: [0, 30, -94, 4, 0], legR: [0, 2, -100, 6, 0], armL: [0, 64, -20, 10, 0], armR: [0, 64, -20, 10, 0] }),
  Jump: strip({ hips: [0, 0, 124], legL: [24, 12, -78, 44, 0], legR: [24, 12, -78, 44, 0], armL: [20, 30, 90, 10, 0], armR: [20, 30, 90, 10, 0] }),
  LineWalkL: strip({ hips: [0, -3, 100], legL: [34, 2, -84, 30, 0], legR: [-18, 2, -96, 6, 0], armL: [0, 92, -6, 4, 0], armR: [0, 92, -6, 4, 0], footL: [0, 0, 0] }),
  LineWalkR: strip({ hips: [0, 3, 100], legR: [34, 2, -84, 30, 0], legL: [-18, 2, -96, 6, 0], armL: [0, 92, -6, 4, 0], armR: [0, 92, -6, 4, 0], footR: [0, 0, 0] }),
  LineStand: strip({ hips: [0, 0, 96], legL: [0, 4, -100, 8, 0], legR: [0, 4, -100, 8, 0], armL: [0, 92, -6, 4, 0], armR: [0, 92, -6, 4, 0] }),
  BoardStand: strip({ hips: [0, 0, 88], legL: [18, 16, -88, 26, 0], legR: [18, 16, -88, 26, 0], armL: [30, 24, -40, 40, 0], armR: [30, 24, -40, 40, 0], body: [0, 8, 0] }),
  Paddling: ring(1, [
    { hips: [0, 0, 88], legL: [18, 16, -88, 26, 0], legR: [18, 16, -88, 26, 0], body: [18, 16, 0], armL: [70, 10, -10, 20, 0], armR: [30, 20, 10, 80, 0] },
    { hips: [0, 0, 88], legL: [18, 16, -88, 26, 0], legR: [18, 16, -88, 26, 0], body: [-18, 16, 0], armR: [70, 10, -10, 20, 0], armL: [30, 20, 10, 80, 0] },
  ]),
  HipCircle: ring(1, [
    { hips: [12, 0, 98], armL: [0, 50, -30, 80, 0], armR: [0, 50, -30, 80, 0] },
    { hips: [0, 12, 98], armL: [0, 50, -30, 80, 0], armR: [0, 50, -30, 80, 0], body: [0, 0, -6] },
    { hips: [-12, 0, 98], armL: [0, 50, -30, 80, 0], armR: [0, 50, -30, 80, 0] },
    { hips: [0, -12, 98], armL: [0, 50, -30, 80, 0], armR: [0, 50, -30, 80, 0], body: [0, 0, 6] },
  ]),
  Somersault: {
    src: 'RETREAT', dur: 1, loop: false,
    keys: [0, 1, 2, 3, 4].map((i) => key(i / 4, { body: [0, i * 180, 0], hips: [0, 0, 92], legL: [70, 8, -10, 120, 0], legR: [70, 8, -10, 120, 0], armL: [60, 10, -30, 80, 0], armR: [60, 10, -30, 80, 0] })),
  },
  Twist: {
    src: 'RETREAT', dur: 1, loop: false,
    keys: [0, 1, 2, 3, 4].map((i) => key(i / 4, { body: [i * 90, 0, 0], armL: [0, 14, 96, 2, 0], armR: [0, 14, 96, 2, 0], legL: [0, 2, -100, 0, 0], legR: [0, 2, -100, 0, 0] })),
  },
  DiveReady: strip({ hips: [0, 0, 94], body: [0, 8, 0], armL: [0, 12, 96, 2, 0], armR: [0, 12, 96, 2, 0], footL: [-16, 2, 0], footR: [-16, 2, 0] }),
  CalmCall: strip({ hips: [0, 0, 92], armL: [50, 26, -30, 20, 0], armR: [50, 26, -30, 20, 0], body: [0, 6, 0] }),
  Crank: ring(1, [
    { hips: [0, 0, 84], body: [0, 22, 0], armL: [70, 6, -10, 30, 0], armR: [50, 6, 10, 60, 0], legL: [30, 8, -80, 40, 0], legR: [-20, 8, -92, 10, 0] },
    { hips: [0, 0, 84], body: [0, 22, 0], armR: [70, 6, -10, 30, 0], armL: [50, 6, 10, 60, 0], legR: [30, 8, -80, 40, 0], legL: [-20, 8, -92, 10, 0] },
  ]),
  Stumble: strip({ hips: [-8, 8, 88], body: [10, -8, 16], armL: [20, 80, 30, 30, 0], armR: [-10, 90, 40, 30, 0], legR: [26, 22, -78, 30, 0] }),
  Fall: strip({ hips: [0, 0, 30], body: [0, -60, 0], armL: [20, 70, 40, 10, 0], armR: [20, 70, 40, 10, 0], legL: [60, 20, -10, 30, 0], legR: [40, 20, -20, 30, 0] }),
  Bow: strip({ hips: [-2, 0, 98], body: [0, 42, 0], head: [0, 16, 0] }),
  Nod: strip({ head: [0, 22, 0], body: [0, 4, 0] }),
  Stand: strip({}),
}; // prettier-ignore

/** The hand-written set. */
export const RETREAT = defineClipSet({
  set: 'RETREAT', title: 'Retreat poses', format: 2, fps: 30, credit: 'Original',
  sources: { RETREAT: { file: 'none', rig: 'unreal', label: 'Original', origin: 'Written by hand', license: 'CC0', url: '', rest } },
  clips: POSES,
} as never); // prettier-ignore

/** The clips copied from the engine's library, with their sources. */
export const RETREATLIB = defineClipSet({
  set: 'RETREATLIB', title: 'Library clips', format: 2, fps: 30, credit: 'See About',
  sources: library.sources, clips: library.clips,
} as never); // prettier-ignore

/** Every actor's clip sets. */
export const CLIP_SETS = ['clipset:retreat', 'clipset:retreatlib'] as const;
