/**
 * @file The shapes of the components in scenes/components.ts, as TypeScript sees them.
 *
 * Game code, sim-side.
 *
 * @example
 * // const flow: Flow = w.query('flow')[0].flow;
 */
import type {
  ActorComponent,
  AnimatorComponent,
  ClipsData,
  CrowdBody,
  PuppetComponent,
  ScenePropComponent,
  World,
} from '../../../engine/sim-api';

/** The flow, as held. */
export interface Flow {
  mode: 'front' | 'roam' | 'event' | 'cutscene' | 'results';
  event: string;
  day: number;
  done: string[];
  seen: string[];
  pebbles: number;
  found: number[];
  ages: number[];
  last: LastResult;
  bests: Record<string, number>;
  look: number;
  color: string;
  attract: boolean;
  roster: number;
  actTick: number;
  focus: number;
  question: number;
  script: number;
  cutTick: number;
  cut: string;
  credits: boolean;
  resting: number;
  camYaw: number;
}

/** The last result, as the page shows it. */
export interface LastResult {
  event?: string;
  score?: number;
  rank?: string;
  pebbles?: number;
  age?: number;
  ageBefore?: number;
}

/** What the HUD reads, written by the activity. Any field may be absent. */
export interface HudData {
  title?: string;
  disc?: boolean;
  ring?: [number, number, number];
  guide?: boolean;
  feet?: boolean;
  meter?: number;
  meterLabel?: string;
  big?: string;
  prompt?: string;
  show?: Record<string, unknown>;
}

/** The running activity, as held. */
export interface ActivityData {
  id: string;
  short: boolean;
  phase: string;
  t: number;
  pt: number;
  done: boolean;
  score: number;
  scores: number[];
  data: Record<string, unknown>;
  hud: HudData;
  spawned: number[];
  actors: number[];
}

/** A seat, as held. */
export interface Seat {
  index: number;
  kind: 'local' | 'pad' | 'cpu' | 'off';
  skill: string;
  sway: number;
  actor: number;
  lx: number;
  ly: number;
  fl: number;
  fr: number;
  act: boolean;
  actP: boolean;
  pfl: boolean;
  pfr: boolean;
  wasL: boolean;
  wasR: boolean;
  wasA: boolean;
  gentle: boolean;
  mx: number;
  my: number;
  px: number;
  py: number;
  pointer: boolean;
  moved: number;
  hist: number[];
  mem: Record<string, unknown>;
}

/** A centre of balance, as held. */
export interface Wobble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  mx: number;
  my: number;
  dx: number;
  dy: number;
  instMul: number;
  swayMul: number;
  on: boolean;
  usesBreath: boolean;
  over: number;
  recover: number;
  topples: number;
  bt: number;
  guide: number;
  lungs: number;
  sync: number;
  calm: number;
  phases: number[];
  rates: number[];
}

/** A named person, as held. */
export interface Cast {
  who: string;
  hold: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pose: string;
  poseT: number;
  leanX: number;
  leanY: number;
  home: number[];
}

/** The tilt, as held. */
export interface IslandData {
  tilt: number;
  tiltX: number;
  tiltZ: number;
  storm: number;
  sky: 'day' | 'dusk' | 'dawn' | 'storm';
  seaX: number;
  seaZ: number;
}

/** A critter, as held. */
export interface Critter {
  kind: 'gull' | 'frog';
  goalX: number;
  goalY: number;
  goalZ: number;
  look: number;
  speed: number;
  away: boolean;
  tick: number;
}

/** A ghost, as held. */
export interface Ghost {
  id: number;
  x: number;
  y: number;
  e: number;
  p: string;
  s: number;
  gone: boolean;
  goneT: number;
  t: number;
  actor: number;
  active: boolean;
}

/** A floor ring, as held. */
export interface MatRing {
  telegraph: string;
  position: number[];
  yaw: number;
  u: number;
  size: number;
  owner: number;
}

/** Every component of the game's worlds, typed. */
export type GameComponents = {
  flow: Flow;
  activity: ActivityData;
  seat: Seat;
  wobble: Wobble;
  cast: Cast;
  island: IslandData;
  block: { x: number; y: number; z: number; yaw: number; size: number; material: string };
  sea: { on: boolean };
  slider: { x: number; phase: number; span: number };
  roller: { x: number; z: number; y: number };
  ferry: { t: number };
  pebble: { index: number; prop: number };
  plaque: { index: number; x: number; z: number; prop: number };
  cairnStone: { index: number; prop: number };
  critter: Critter;
  ghost: Ghost;
  matRing: MatRing;
  actor: ActorComponent;
  clips: ClipsData;
  crowdBody: CrowdBody;
  sceneProp: ScenePropComponent;
  puppet: PuppetComponent;
  animator: AnimatorComponent;
};

/** A world of the game. */
export type GameWorld = World<GameComponents>;
