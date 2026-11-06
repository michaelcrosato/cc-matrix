/**
 * @file The game's own clip set `RETREAT`: every pose, rep and move is a two-key strip (t=0 stands, t=1 is the pose)
 * that the sim scrubs by writing the slot's `t` from the guest's thumb. Written by hand as readable key poses; the rest
 * pose is copied from the engine's Mesh2Motion set (rest.json). Lean strips are additive.
 * @example
 * CLIP_NAMES.includes('Heron'); // true
 */
import { defineClipSet } from '../../../engine/sim-api';
import rest from './rest';

type V = number[];
type Over = Partial<
  Record<'hips' | 'body' | 'chest' | 'head' | 'shL' | 'shR' | 'armL' | 'armR' | 'legL' | 'legR' | 'footL' | 'footR', V>
>;
const STAND = { hips: [0, 0, 100], body: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], shL: [0, 0], shR: [0, 0], armL: [0, 20, -100, 8, 0], armR: [0, 20, -100, 8, 0], legL: [0, 6, -100, 4, 0], legR: [0, 6, -100, 4, 0], footL: [0, 6, 0], footR: [0, 6, 0] }; // prettier-ignore
const key = (t: number, over: Over) => ({ t, ...STAND, ...over });
const strip = (over: Over, dur = 1) => ({ src: 'RETREAT', dur, loop: false, keys: [key(0, {}), key(dur, over)] });
const ring = (pts: Over[]) => ({ src: 'RETREAT', dur: pts.length - 1, loop: true, keys: pts.map((p, i) => key(i, p)) });
const arms = (o: V) => ({ armL: o, armR: o });
const clips = {
  Heron: strip({
    hips: [0, 0, 99],
    legL: [0, 2, -100, 2, 0],
    legR: [28, 62, -42, 118, 40],
    footR: [30, 20, 0],
    armL: [6, 4, 100, 30, 0],
    armR: [6, 4, 100, 30, 0],
  }),
  Archer: strip({
    hips: [0, 0, 72],
    legL: [62, 12, -78, 62, 0],
    legR: [-70, 10, -72, 4, 0],
    footR: [10, 40, 0],
    armL: [0, 100, 4, 2, 0],
    armR: [0, 100, 4, 2, 0],
  }),
  Nothing: strip({
    hips: [-5, 0, 28],
    legL: [70, 60, -18, 140, 40],
    legR: [70, 60, -22, 140, -40],
    footL: [-20, 60, 0],
    footR: [-20, 60, 0],
    armL: [70, 22, -60, 58, 20],
    armR: [70, 22, -60, 58, -20],
  }),
  Chair: strip({
    hips: [-30, 0, 62],
    body: [0, 22, 0],
    legL: [76, 8, -50, 92, 0],
    legR: [76, 8, -50, 92, 0],
    armL: [96, 4, 4, 4, 0],
    armR: [96, 4, 4, 4, 0],
  }),
  Comma: strip({
    chest: [0, 0, 30],
    body: [0, 0, 6],
    armL: [0, 30, 100, 4, 0],
    armR: [0, 30, 100, 4, 0],
    hips: [0, 8, 100],
  }),
  Napkin: strip({
    hips: [-20, 0, 86],
    body: [0, 78, 0],
    chest: [0, 12, 0],
    head: [0, 20, 0],
    armL: [20, 6, -90, 4, 0],
    armR: [20, 6, -90, 4, 0],
  }),
  Bridge: strip({
    hips: [0, 0, 30],
    body: [0, -80, 0],
    legL: [60, 8, -40, 100, 0],
    legR: [60, 8, -40, 100, 0],
    armL: [-10, 20, -100, 2, 0],
    armR: [-10, 20, -100, 2, 0],
  }),
  Lighthouse: strip({ hips: [0, 0, 103], footL: [60, 0, 40], footR: [60, 0, 40], ...arms([0, 0, 100, 0, 0]) }),
  DeepKnee: strip({
    hips: [-25, 0, 58],
    body: [0, 12, 0],
    legL: [70, 10, -70, 100, 0],
    legR: [70, 10, -70, 100, 0],
    ...arms([96, 4, 2, 4, 0]),
  }),
  PushUp: strip({
    hips: [40, 0, 34],
    body: [0, 82, 0],
    legL: [-10, 6, -100, 2, 0],
    legR: [-10, 6, -100, 2, 0],
    armL: [20, 6, -90, 70, 0],
    armR: [20, 6, -90, 70, 0],
  }),
  SideLunge: strip({
    hips: [0, 14, 76],
    legL: [0, 70, -60, 20, 0],
    legR: [0, 8, -90, 60, 0],
    ...arms([90, 4, 6, 4, 0]),
  }),
  StepUpL: strip({ hips: [0, 0, 106], legL: [60, 8, -50, 90, 0], armR: [30, 20, -90, 30, 0] }),
  StepUpR: strip({ hips: [0, 0, 106], legR: [60, 8, -50, 90, 0], armL: [30, 20, -90, 30, 0] }),
  SideStep: strip({ hips: [0, 10, 96], legR: [0, 50, -90, 10, 0], armL: [20, 40, -50, 40, 0] }),
  Jump: strip({
    hips: [0, 0, 118],
    legL: [-10, 6, -100, 2, 0],
    legR: [-10, 6, -100, 2, 0],
    footL: [60, 6, 0],
    footR: [60, 6, 0],
    ...arms([0, 40, 80, 8, 0]),
  }),
  Somersault: strip(
    {
      hips: [0, 0, 60],
      body: [0, 720, 0],
      legL: [80, 6, -40, 130, 0],
      legR: [80, 6, -40, 130, 0],
      ...arms([70, 6, -30, 100, 0]),
    },
    2,
  ),
  Twist: strip({ body: [360, 0, 0], hips: [0, 0, 70], ...arms([0, 80, 10, 10, 0]) }, 2),
  Paddling: ring([
    { hips: [0, 0, 80], body: [0, 10, 0], armL: [60, 10, -30, 20, 0], armR: [60, 10, -30, 80, 0] },
    { hips: [0, 0, 80], body: [0, 10, 0], armL: [60, 10, -30, 80, 0], armR: [60, 10, -30, 20, 0] },
    { hips: [0, 0, 80], body: [0, 10, 0], armL: [60, 10, -30, 20, 0], armR: [60, 10, -30, 80, 0] },
  ]),
  CalmCall: strip({ ...arms([80, 40, -40, 10, 0]), hips: [0, 0, 96] }),
  Crank: ring([
    { hips: [0, 0, 80], body: [0, 20, 0], armL: [90, 0, 0, 20, 0], armR: [90, 0, -50, 70, 0] },
    { hips: [0, 0, 80], body: [0, 20, 0], armL: [90, 0, -50, 70, 0], armR: [90, 0, 0, 20, 0] },
    { hips: [0, 0, 80], body: [0, 20, 0], armL: [90, 0, 0, 20, 0], armR: [90, 0, -50, 70, 0] },
  ]),
  HipCircle: ring([
    { hips: [8, 0, 100], body: [0, 6, 0] },
    { hips: [0, 8, 100], body: [0, 0, 6] },
    { hips: [-8, 0, 100], body: [0, -6, 0] },
    { hips: [0, -8, 100], body: [0, 0, -6] },
    { hips: [8, 0, 100], body: [0, 6, 0] },
  ]),
  Wave: ring([{ armR: [30, 60, 90, 40, 0] }, { armR: [30, 90, 90, 40, 0] }, { armR: [30, 60, 90, 40, 0] }]),
  Nod: strip({ head: [0, 22, 0] }, 2),
  Bow: strip({ hips: [-10, 0, 98], body: [0, 40, 0], head: [0, 10, 0] }),
  Sit: strip({ hips: [-20, 0, 52], legL: [90, 6, -10, 90, 0], legR: [90, 6, -10, 90, 0] }),
  Cheer: ring([{ ...arms([0, 30, 100, 0, 0]) }, { ...arms([0, 40, 80, 20, 0]) }, { ...arms([0, 30, 100, 0, 0]) }]),
  Collapse: strip({ hips: [-10, 0, 40], body: [0, 30, 20], ...arms([30, 30, -60, 20, 0]) }),
  LeanR: strip({
    body: [0, 0, 9],
    chest: [0, 0, 4],
    hips: [0, 5, 99],
    armL: [0, 40, -70, 8, 0],
    armR: [0, 4, -100, 8, 0],
  }),
  LeanL: strip({
    body: [0, 0, -9],
    chest: [0, 0, -4],
    hips: [0, -5, 99],
    armR: [0, 40, -70, 8, 0],
    armL: [0, 4, -100, 8, 0],
  }),
  LeanF: strip({ body: [0, 10, 0], chest: [0, 4, 0], hips: [3, 0, 99] }),
  LeanB: strip({ body: [0, -9, 0], chest: [0, -3, 0], hips: [-3, 0, 99] }),
};
/** The additive lean strips. */
const ADDITIVE = ['LeanR', 'LeanL', 'LeanF', 'LeanB'];
export const CLIP_NAMES = Object.keys(clips);
export const isAdditive = (name: string): boolean => ADDITIVE.includes(name);

export const SET = defineClipSet({
  set: 'RETREAT',
  title: 'Retreat poses',
  format: 2,
  fps: 30,
  credit: 'Original, written by hand for this game',
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
  },
  clips,
} as never);
