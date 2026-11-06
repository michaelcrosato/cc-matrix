/**
 * @file The game's own clip set, `clipset:retreat`: every pose is a readable two-key strip, t = 0 stands, t = 1 is the
 * pose, played at speed 0 and scrubbed from the sim, so the body goes where your thumb goes (PLAN.md section 11). The
 * key format's legend is engine/anim/clip/lens.ts: hips [forward, right, up] in percent of hip height, body, chest and
 * head [turn, lean, tilt] in degrees, limbs [forward, out, up, bend, twist]. Additive `Lean*` strips lie on top.
 * `BORROWED` adds a few CC0 library clips.
 *
 * Game code, sim-side data.
 *
 * @example
 * SET.id; // 'clipset:retreat'
 */
import { defineClipSet } from '../../../engine/sim-api';
import { BORROWED as borrowed, REST as rest } from './clipdata/borrowed';

/** The neutral standing key every strip starts from. */
const STAND = {
  hips: [0, 0, 100], body: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], shL: [0, 0], shR: [0, 0],
  armL: [0, 20, -100, 8, 0], armR: [0, 20, -100, 8, 0], legL: [0, 6, -100, 4, 0], legR: [0, 6, -100, 4, 0],
  footL: [0, 6, 0], footR: [0, 6, 0],
}; // prettier-ignore

/** A key at `t`, the stand with `over` laid on. */
const key = (t: number, over: object) => ({ t, ...STAND, ...over });

/** A two-key strip from standing to `over`. */
const strip = (over: object) => ({ src: 'RETREAT', dur: 1, loop: false, keys: [key(0, {}), key(1, over)] });

/** A strip through several poses, evenly. */
const path = (...poses: object[]) => ({
  src: 'RETREAT',
  dur: 1,
  loop: false,
  keys: [key(0, {}), ...poses.map((p, i) => key((i + 1) / poses.length, p))],
});

/** Sat cross-legged, the pose of Seated Nothing and of Still Pond. */
const NOTHING = {
  hips: [-5, 0, 28],
  legL: [70, 60, -18, 140, 40],
  legR: [70, 60, -22, 140, -40],
  footL: [-20, 60, 0],
  footR: [-20, 60, 0],
  armL: [70, 22, -60, 58, 20],
  armR: [70, 22, -60, 58, -20],
};

/** Long on your back: the Polite Bridge's start. */
const LYING = {
  hips: [0, 0, 18],
  body: [0, -86, 0],
  armL: [0, 30, -100, 0, 0],
  armR: [0, 30, -100, 0, 0],
  legL: [100, 8, -30, 96, 0],
  legR: [100, 8, -30, 96, 0],
  footL: [-30, 6, 0],
  footR: [-30, 6, 0],
};

/** The plank of a push-up. */
const PLANK = {
  hips: [0, 0, 50],
  body: [0, 74, 0],
  armL: [100, 14, 8, 4, 0],
  armR: [100, 14, 8, 4, 0],
  legL: [0, 4, -100, 2, 0],
  legR: [0, 4, -100, 2, 0],
  footL: [50, 0, 0],
  footR: [50, 0, 0],
};

/** The clips, by name. */
const CLIPS = {
  // Standing still while held in place: being placed each step would otherwise read as falling.
  Stand: strip({}),
  // The eight poses.
  Nothing: strip(NOTHING),
  Chair: strip({ hips: [-22, 0, 62], body: [0, 24, 0], chest: [0, 2, 0], armL: [100, 6, 10, 4, 0], armR: [100, 6, 10, 4, 0], legL: [60, 6, -78, 88, 0], legR: [60, 6, -78, 88, 0] }),
  Heron: strip({ hips: [0, 0, 99], legL: [0, 2, -100, 2, 0], legR: [28, 62, -42, 118, 40], footR: [30, 20, 0], armL: [6, 4, 100, 30, 0], armR: [6, 4, 100, 30, 0] }),
  HeronR: strip({ hips: [0, 0, 99], legR: [0, 2, -100, 2, 0], legL: [28, 62, -42, 118, -40], footL: [30, 20, 0], armL: [6, 4, 100, 30, 0], armR: [6, 4, 100, 30, 0] }),
  Archer: strip({ hips: [0, 0, 72], legL: [62, 12, -78, 62, 0], legR: [-70, 10, -72, 4, 0], footR: [10, 40, 0], armL: [0, 100, 4, 2, 0], armR: [0, 100, 4, 2, 0] }),
  CommaR: strip({ hips: [0, -8, 98], body: [0, 0, 16], chest: [0, 0, 20], head: [0, 0, 8], armL: [0, 40, 100, 14, 0], armR: [0, 12, -100, 6, 0] }),
  CommaL: strip({ hips: [0, 8, 98], body: [0, 0, -16], chest: [0, 0, -20], head: [0, 0, -8], armR: [0, 40, 100, 14, 0], armL: [0, 12, -100, 6, 0] }),
  Napkin: strip({ hips: [-14, 0, 90], body: [0, 62, 0], chest: [0, 26, 0], head: [0, 10, 0], armL: [80, 4, -60, 6, 0], armR: [80, 4, -60, 6, 0], legL: [8, 4, -100, 6, 0], legR: [8, 4, -100, 6, 0] }),
  Bridge: path(LYING, { ...LYING, hips: [0, 0, 44], body: [0, -60, 0], legL: [100, 8, -60, 80, 0], legR: [100, 8, -60, 80, 0] }),
  Lighthouse: strip({ hips: [0, 0, 106], armL: [0, 2, 100, 0, 0], armR: [0, 2, 100, 0, 0], footL: [36, 2, 30], footR: [36, 2, 30] }),
  // The leans: additive, so first key neutral; the full key reads about 12 degrees on screen.
  LeanR: strip({ body: [0, 0, 8], chest: [0, 0, 4], hips: [0, 5, 99], armL: [0, 40, -70, 8, 0] }),
  LeanL: strip({ body: [0, 0, -8], chest: [0, 0, -4], hips: [0, -5, 99], armR: [0, 40, -70, 8, 0] }),
  LeanF: strip({ body: [0, 8, 0], chest: [0, 4, 0], hips: [5, 0, 98], armL: [24, 26, -80, 10, 0], armR: [24, 26, -80, 10, 0] }),
  LeanB: strip({ body: [0, -8, 0], chest: [0, -4, 0], hips: [-5, 0, 98], armL: [-20, 26, -80, 10, 0], armR: [-20, 26, -80, 10, 0] }),
  // Reps.
  DeepKnee: strip({ hips: [-14, 0, 56], body: [0, 28, 0], armL: [100, 6, 4, 6, 0], armR: [100, 6, 4, 6, 0], legL: [58, 10, -80, 100, 0], legR: [58, 10, -80, 100, 0] }),
  PushUp: path(PLANK, { ...PLANK, hips: [0, 0, 30], armL: [100, 40, -30, 96, 0], armR: [100, 40, -30, 96, 0] }),
  LungeR: strip({ hips: [0, 34, 70], body: [0, 8, 8], legR: [10, 72, -60, 84, 0], legL: [0, 64, -76, 4, 0], armL: [60, 20, 0, 40, 0], armR: [60, 20, 0, 40, 0] }),
  LungeL: strip({ hips: [0, -34, 70], body: [0, 8, -8], legL: [10, 72, -60, 84, 0], legR: [0, 64, -76, 4, 0], armL: [60, 20, 0, 40, 0], armR: [60, 20, 0, 40, 0] }),
  // Step.
  StepUpL: strip({ hips: [8, 6, 104], legL: [72, 8, -40, 90, 0], armR: [50, 20, -40, 60, 0], armL: [-20, 20, -80, 20, 0] }),
  StepUpR: strip({ hips: [8, -6, 104], legR: [72, 8, -40, 90, 0], armL: [50, 20, -40, 60, 0], armR: [-20, 20, -80, 20, 0] }),
  SideStepR: strip({ hips: [0, 30, 92], legR: [0, 66, -68, 26, 0], legL: [0, -6, -100, 8, 0], armL: [0, 66, 30, 30, 0], armR: [0, 66, 30, 30, 0] }),
  SideStepL: strip({ hips: [0, -30, 92], legL: [0, 66, -68, 26, 0], legR: [0, -6, -100, 8, 0], armL: [0, 66, 30, 30, 0], armR: [0, 66, 30, 30, 0] }),
  Jump: strip({ hips: [0, 0, 118], legL: [20, 18, -90, 30, 0], legR: [20, 18, -90, 30, 0], armL: [0, 40, 90, 12, 0], armR: [0, 40, 90, 12, 0], footL: [40, 6, 0], footR: [40, 6, 0] }),
  // Hip circle: a ring of keys scrubbed by the stick's angle.
  HipCircle: { src: 'RETREAT', dur: 1, loop: true, keys: [
    key(0, { hips: [0, 16, 96], body: [0, 0, 10], armL: [0, 86, 10, 12, 0], armR: [0, 86, 10, 12, 0] }),
    key(0.25, { hips: [16, 0, 96], body: [0, 10, 0], armL: [0, 86, 10, 12, 0], armR: [0, 86, 10, 12, 0] }),
    key(0.5, { hips: [0, -16, 96], body: [0, 0, -10], armL: [0, 86, 10, 12, 0], armR: [0, 86, 10, 12, 0] }),
    key(0.75, { hips: [-16, 0, 96], body: [0, -10, 0], armL: [0, 86, 10, 12, 0], armR: [0, 86, 10, 12, 0] }),
    key(1, { hips: [0, 16, 96], body: [0, 0, 10], armL: [0, 86, 10, 12, 0], armR: [0, 86, 10, 12, 0] }),
  ] }, // prettier-ignore
  // Dive: arms up at the lip; a somersault's lean keeps counting past 360; a twist's turn too.
  DiveReady: strip({ hips: [0, 0, 104], armL: [0, 8, 100, 2, 0], armR: [0, 8, 100, 2, 0], footL: [20, 2, 20], footR: [20, 2, 20] }),
  Somersault: { src: 'RETREAT', dur: 1, loop: false, keys: [
    key(0, { armL: [0, 8, 100, 2, 0], armR: [0, 8, 100, 2, 0] }),
    key(0.25, { body: [0, 180, 0], hips: [0, 0, 80], legL: [80, 8, -20, 120, 0], legR: [80, 8, -20, 120, 0], armL: [90, 10, -30, 110, 0], armR: [90, 10, -30, 110, 0] }),
    key(0.5, { body: [0, 360, 0], hips: [0, 0, 80], legL: [80, 8, -20, 120, 0], legR: [80, 8, -20, 120, 0], armL: [90, 10, -30, 110, 0], armR: [90, 10, -30, 110, 0] }),
    key(0.75, { body: [0, 540, 0], hips: [0, 0, 80], legL: [80, 8, -20, 120, 0], legR: [80, 8, -20, 120, 0], armL: [90, 10, -30, 110, 0], armR: [90, 10, -30, 110, 0] }),
    key(1, { body: [0, 720, 0], armL: [0, 8, 100, 2, 0], armR: [0, 8, 100, 2, 0] }),
  ] }, // prettier-ignore
  Twist: { src: 'RETREAT', dur: 1, loop: false, keys: [
    key(0, {}),
    key(0.5, { body: [360, 0, 0] }),
    key(1, { body: [720, 0, 0] }),
  ] }, // prettier-ignore
  Splashed: strip({ body: [0, -18, 0], armL: [0, 70, 60, 20, 0], armR: [0, 70, 60, 20, 0], legL: [20, 30, -70, 40, 0], legR: [-10, 30, -70, 30, 0] }),
  // Paddle: stands on the board, the paddle swings by the feet.
  Paddling: { src: 'RETREAT', dur: 1, loop: true, keys: [
    key(0, { body: [14, 10, 0], hips: [0, 0, 92], legL: [12, 10, -94, 18, 0], legR: [-4, 10, -94, 18, 0], armL: [90, 30, 40, 36, 0], armR: [80, 12, -24, 56, 0] }),
    key(0.5, { body: [-14, 10, 0], hips: [0, 0, 92], legL: [-4, 10, -94, 18, 0], legR: [12, 10, -94, 18, 0], armR: [90, 30, 40, 36, 0], armL: [80, 12, -24, 56, 0] }),
    key(1, { body: [14, 10, 0], hips: [0, 0, 92], legL: [12, 10, -94, 18, 0], legR: [-4, 10, -94, 18, 0], armL: [90, 30, 40, 36, 0], armR: [80, 12, -24, 56, 0] }),
  ] }, // prettier-ignore
  // The line: arms out, knees soft.
  LineWalk: strip({ hips: [0, 0, 94], armL: [0, 96, 6, 8, 0], armR: [0, 96, 6, 8, 0], legL: [8, 2, -98, 14, 0], legR: [-8, 2, -98, 14, 0] }),
  LineFall: strip({ body: [0, 30, 30], hips: [0, 0, 80], armL: [40, 80, 70, 20, 0], armR: [40, 80, 70, 20, 0], legL: [40, 40, -60, 50, 0], legR: [-20, 30, -80, 30, 0] }),
  // The finale.
  CalmCall: strip({ hips: [0, 0, 96], armL: [60, 20, -40, 30, 0], armR: [60, 20, -40, 30, 0], chest: [0, 8, 0] }),
  Crank: { src: 'RETREAT', dur: 1, loop: true, keys: [
    key(0, { hips: [0, 0, 84], body: [0, 26, 0], armL: [100, 8, 30, 20, 0], armR: [100, 8, 30, 20, 0], legL: [40, 10, -90, 34, 0], legR: [-30, 10, -90, 18, 0] }),
    key(0.5, { hips: [0, 0, 84], body: [0, 34, 0], armL: [100, 8, -30, 60, 0], armR: [100, 8, -30, 60, 0], legL: [-30, 10, -90, 18, 0], legR: [40, 10, -90, 34, 0] }),
    key(1, { hips: [0, 0, 84], body: [0, 26, 0], armL: [100, 8, 30, 20, 0], armR: [100, 8, 30, 20, 0], legL: [40, 10, -90, 34, 0], legR: [-30, 10, -90, 18, 0] }),
  ] }, // prettier-ignore
  StoneStand: strip({ hips: [0, 0, 92], armL: [0, 70, -10, 14, 0], armR: [0, 70, -10, 14, 0], legL: [0, 22, -96, 14, 0], legR: [0, 22, -96, 14, 0] }),
  // The Gull: its arms are its wings.
  Flap: { src: 'RETREAT', dur: 1, loop: true, keys: [
    key(0, { armL: [0, 100, 50, 0, 0], armR: [0, 100, 50, 0, 0] }),
    key(0.5, { armL: [0, 100, -50, 0, 0], armR: [0, 100, -50, 0, 0] }),
    key(1, { armL: [0, 100, 50, 0, 0], armR: [0, 100, 50, 0, 0] }),
  ] }, // prettier-ignore
  Perch: strip({ armL: [-40, 30, -80, 30, 0], armR: [-40, 30, -80, 30, 0] }),
  // Others: a stoop, Nan's single slow nod, Plumb's upright, Tare's bow.
  NanNod: path({ head: [0, 22, 0], chest: [0, 12, 0] }, { head: [0, 0, 0] }),
  Stoop: strip({ body: [0, 18, 0], chest: [0, 12, 0], head: [0, -14, 0], hips: [0, 0, 92], armL: [20, 10, -90, 30, 0], armR: [20, 10, -90, 30, 0] }),
  Upright: strip({ hips: [0, 0, 102], armL: [0, 4, -100, 0, 0], armR: [0, 4, -100, 0, 0], legL: [0, 1, -100, 0, 0], legR: [0, 1, -100, 0, 0], footL: [0, 0, 0], footR: [0, 0, 0] }),
  PhoneStare: strip({ hips: [0, 4, 98], body: [0, 4, 2], head: [0, 18, 0], armR: [80, 14, -30, 110, 0], armL: [0, 10, -100, 12, 0] }),
  Bow: strip({ body: [0, 30, 0], hips: [-4, 0, 96] }),
}; // prettier-ignore

/** The strips that are additive leans. */
export const LEANS = ['RETREAT/LeanR', 'RETREAT/LeanL', 'RETREAT/LeanF', 'RETREAT/LeanB'] as const;

/** The set, registered: the sim and the view play from it. */
export const SET = defineClipSet({
  set: 'RETREAT',
  title: 'Retreat poses',
  format: 2,
  fps: 30,
  credit: 'Original, written by hand, with a few CC0 clips from Mesh2Motion and Quaternius.',
  sources: {
    RETREAT: {
      file: 'none',
      rig: 'unreal',
      label: 'Original',
      origin: 'Written by hand',
      license: 'CC0',
      url: '',
      rest,
    },
    ...borrowed.sources,
  },
  clips: { ...CLIPS, ...borrowed.clips },
} as never);

/** The id every cast member plays from. */
export const CLIPSET = 'clipset:retreat';
