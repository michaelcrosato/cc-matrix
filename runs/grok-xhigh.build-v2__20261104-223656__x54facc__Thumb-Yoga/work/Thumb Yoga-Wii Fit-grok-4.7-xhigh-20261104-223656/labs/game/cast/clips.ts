/**
 * @file Pose strips for the retreat. Each clip stands, then arrives. The page scrubs the time.
 * The rest body is Mesh2Motion's, so the poses share a body the engine already draws.
 */
import { defineClipSet, defineSetBuild } from '../../../engine/sim-api';
import { REST } from './rest';

/** A standing key. Up is 100. The arms hang. The knees are soft. */
const STAND = {
  hips: [0, 0, 100],
  body: [0, 0, 0],
  chest: [0, 0, 0],
  head: [0, 0, 0],
  shL: [0, 0],
  shR: [0, 0],
  armL: [0, 20, -100, 8, 0],
  armR: [0, 20, -100, 8, 0],
  legL: [0, 6, -100, 4, 0],
  legR: [0, 6, -100, 4, 0],
  footL: [0, 6, 0],
  footR: [0, 6, 0],
};

/** One key at time `t`, with `over` laid on the stand. */
function key(t: number, over: object): object {
  return { t, ...STAND, ...over };
}

/** A two-key strip. The first key is neutral so an additive lean starts at nothing. */
function strip(over: object): object {
  return { src: 'RETREAT', dur: 1, loop: false, keys: [key(0, {}), key(1, over)] };
}

/** The retreat clip set. Play a clip as `RETREAT/Name`. */
export const SET = defineClipSet({
  set: 'RETREAT',
  title: 'Retreat poses',
  format: 2,
  fps: 30,
  credit: 'Original poses. Rest body from Mesh2Motion.',
  sources: {
    RETREAT: {
      file: 'none',
      rig: 'unreal',
      label: 'Original',
      origin: 'Written by hand',
      license: 'CC0',
      url: '',
      rest: REST,
    },
  },
  clips: {
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
      hips: [8, 0, 52],
      legL: [80, 8, -70, 90, 0],
      legR: [80, 8, -70, 90, 0],
      armL: [20, 16, -40, 40, 0],
      armR: [20, 16, -40, 40, 0],
    }),
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
    Comma: strip({
      hips: [0, 8, 96],
      body: [0, 0, 18],
      chest: [0, 0, 10],
      armL: [10, 70, -20, 20, 0],
      armR: [8, 10, -40, 16, 0],
    }),
    Napkin: strip({
      hips: [18, 0, 70],
      chest: [12, 0, 0],
      legL: [20, 6, -80, 30, 0],
      legR: [20, 6, -80, 30, 0],
      armL: [40, 10, -30, 50, 0],
      armR: [40, 10, -30, 50, 0],
    }),
    Bridge: strip({
      hips: [0, 0, 78],
      body: [8, 0, 0],
      armL: [0, 80, 20, 8, 0],
      armR: [0, 80, 20, 8, 0],
    }),
    Lighthouse: strip({
      hips: [0, 0, 102],
      armL: [0, 8, 160, 4, 0],
      armR: [0, 8, 160, 4, 0],
      legL: [0, 2, -100, 0, 0],
      legR: [0, 2, -100, 0, 0],
    }),
    LeanR: strip({ body: [0, 0, 12], chest: [0, 0, 4], hips: [0, 6, 99], armL: [0, 40, -70, 8, 0] }),
    LeanL: strip({ body: [0, 0, -12], chest: [0, 0, -4], hips: [0, -6, 99], armR: [0, 40, -70, 8, 0] }),
    LeanF: strip({ body: [12, 0, 0], chest: [6, 0, 0], hips: [4, 0, 98] }),
    LeanB: strip({ body: [-10, 0, 0], chest: [-4, 0, 0], hips: [-3, 0, 98] }),
    DeepKnee: strip({ hips: [10, 0, 62], legL: [70, 8, -80, 100, 0], legR: [70, 8, -80, 100, 0] }),
    Paddling: strip({
      hips: [6, 0, 90],
      armL: [40, 20, 40, 30, 0],
      armR: [-20, 16, -40, 20, 0],
    }),
    CalmCall: strip({ armL: [20, 10, -20, 40, 0], armR: [20, 10, -20, 40, 0], chest: [4, 0, 0] }),
  },
});

/** A build from this set's rest, so the guest's animator has proportions to play. */
export const BUILD = defineSetBuild('build:retreat', 'clipset:retreat');
