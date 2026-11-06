/**
 * @file The game's components (plain data): `flow` (what mode the game is in), `act` (the running activity's registers),
 * `island` (the tilt), `cast` (who a body is), `pebble`, `plaque`, `ghost`, `fx` markers. Sim-side.
 * @example
 * type Flow = FlowData; // mode: 'front' | 'roam' | 'event' | 'cutscene' | 'results'
 */
import { defineComponent, type ActorComponent, type SpawnSpec } from '../../../engine/sim-api';
import type { Seat, Wobble } from './wobble';

export interface FlowData {
  mode: string;
  event: string;
  phase: string;
  tick: number;
  day: number;
  bot: string;
  score: number;
  rank: string;
  pebbles: number;
  line: string;
  speaker: string;
  lineTick: number;
  seq: number;
  ender: string;
  nUse: number;
  nPlan: number;
  nWave: number;
  held: number;
  unlocked: number;
  age: number;
  prevAge: number;
  ages: number[];
}
export interface ActData {
  id: string;
  phase: string;
  t: number;
  a: number[];
  b: number[];
  score: number;
  done: number;
  ids: number[];
  short: number;
}
export interface IslandData {
  tilt: number;
  tiltX: number;
  tiltZ: number;
  storm: number;
}
export interface CastData {
  who: string;
  home: number[];
  seatNo: number;
  bot: string;
  mat: number[];
}

const num = (d = 0, description = 'A number.') => ({ type: 'number', default: d, description }) as const;
const int = (d = 0, description = 'An integer.') => ({ type: 'integer', default: d, description }) as const;
const str = (d = '', description = 'A string.') => ({ type: 'string', default: d, description }) as const;
const arr = (d: number[], description = 'Numbers.') =>
  ({ type: 'array', items: { type: 'number' }, default: d, description }) as const;

export const FLOW = defineComponent('flow', {
  description: 'What the game is doing: mode, current event and phase, day, results, the line being said.',
  fields: {
    mode: str('front', 'front, roam, event, cutscene or results.'),
    event: str('', 'The running activity id.'),
    phase: str('', 'Its phase.'),
    tick: int(0, 'Steps in this mode.'),
    day: int(1, 'Day of the residency, 1-6 (6 is After).'),
    bot: str('', 'perfect, human, sloppy, idle, mash, or empty for the player.'),
    score: num(0, 'Last result score.'),
    rank: str('', 'Last result rank.'),
    pebbles: int(0, 'Pebbles earned last result.'),
    line: str('', 'Line id being said.'),
    speaker: str('', 'Who says it.'),
    lineTick: int(0, 'Step the line began.'),
    seq: int(0, 'Counts lines said.'),
    ender: str('', 'Remark at the end.'),
    nUse: int(0, 'Counts presses of use (a latch the page reads).'),
    nPlan: int(0, 'Counts presses of the Programme button.'),
    nWave: int(0, 'Counts presses of wave.'),
    held: int(0, 'Bit set of island buttons held last step (use 1, plan 2, wave 4).'),
    unlocked: int(0, 'Unlocks.'),
    age: int(0, 'Latest Wobble Age.'),
    prevAge: int(0, 'Previous Wobble Age.'),
    ages: arr([], 'Ages so far.'),
  },
});
export const ACT = defineComponent('act', {
  description: 'The running activity: id, phase, steps, general registers, score, spawned entity ids.',
  fields: {
    id: str(),
    phase: str(),
    t: int(),
    a: arr(new Array(24).fill(0), 'Registers.'),
    b: arr(new Array(128).fill(0), 'More registers (per-note flags, marbles).'),
    score: num(),
    done: int(),
    ids: arr([], 'Spawned ids.'),
    short: int(0, '1 in the short form.'),
  },
});
export const ISLAND = defineComponent('island', {
  description: 'The island: its tilt in degrees and the storm 0-1.',
  fields: { tilt: num(0.4, 'Tilt magnitude, degrees.'), tiltX: num(), tiltZ: num(), storm: num() },
});
export const CAST = defineComponent('cast', {
  description: 'Who a body is, where it lives, and which seat it holds.',
  fields: {
    who: str(),
    home: arr([0, 0]),
    seatNo: int(-1),
    bot: str('', 'Bot kind for a CPU seat, empty for a person.'),
    mat: arr([0, 0, 0], 'Mat x, y, z in a class.'),
  },
});
export const PEBBLE = defineComponent('pebble', {
  description: 'A hidden pebble: where, whether found.',
  fields: {
    x: num(),
    y: num(),
    z: num(),
    found: int(),
    no: int(),
    size: num(0.22),
    material: str('material:rcoral'),
    yaw: num(),
  },
});
export const PLAQUE = defineComponent('plaque', {
  description: 'A plaque: where it started and where it is, creeping downhill.',
  fields: {
    x: num(),
    y: num(),
    z: num(),
    hx: num(),
    hz: num(),
    no: int(),
    size: num(0.5),
    material: str('material:rbrass'),
    yaw: num(),
  },
});
export const GHOST = defineComponent('ghost', {
  description: 'A hub ghost: another player seen on a neighbouring mat.',
  fields: { x: num(), y: num(), z: num(), slot: int(), cobx: num(), coby: num(), alive: int(1) },
});
export const ROUND = defineComponent('round', {
  description: "A class or hub round: which class it is on, the deal, and each seat's running total.",
  fields: {
    on: int(0, '1 while a round runs.'),
    cls: int(0, 'Class 0-2.'),
    deal: int(0, 'Which middle class was dealt.'),
    total: arr([0, 0, 0, 0], 'Seat totals.'),
    seats: int(1, 'How many seats play.'),
    cpu: int(1, '1 when CPU guests fill empty seats.'),
  },
});
export const MARK = defineComponent('mark', {
  description: 'A drawn marker (ring, marble, hoop) at a place.',
  fields: { x: num(), y: num(), z: num(), size: num(0.3), material: str('material:rglow'), yaw: num(), kind: str() },
});

export type Comps = {
  flow: FlowData;
  act: ActData;
  island: IslandData;
  cast: CastData;
  seat: Seat;
  wobble: Wobble;
  actor: ActorComponent;
  pebble: { x: number; y: number; z: number; found: number; no: number; size: number; material: string; yaw: number };
  plaque: {
    x: number;
    y: number;
    z: number;
    hx: number;
    hz: number;
    no: number;
    size: number;
    material: string;
    yaw: number;
  };
  ghost: { x: number; y: number; z: number; slot: number; cobx: number; coby: number; alive: number };
  round: { on: number; cls: number; deal: number; total: number[]; seats: number; cpu: number };
  mark: { x: number; y: number; z: number; size: number; material: string; yaw: number; kind: string };
};
export type Spawn = SpawnSpec<Comps>;
