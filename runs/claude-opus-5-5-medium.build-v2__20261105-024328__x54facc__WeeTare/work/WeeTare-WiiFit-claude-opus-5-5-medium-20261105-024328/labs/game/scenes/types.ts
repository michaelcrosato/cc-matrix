/**
 * @file The components of Wee Tare and their plain-data types. `flow` is the game's state machine and holds the running
 * activity's state (`ev`); `seat` is one balancing person (a player, a CPU guest or a ghost) with its input and its
 * `wobble`; `island` is the tilt. All plain data, so the sim hashes, captures and restores them.
 */
import { defineComponent, type ActorComponent, type World } from '../../../engine/sim-api';

/** Where the game is. */
export type Mode = 'front' | 'roam' | 'event' | 'cutscene' | 'results' | 'evening' | 'credits' | 'round';

/** A seat's balance state. */
export interface Wobble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The slewed stick. */
  tx: number;
  ty: number;
  /** The mouse's own target, decaying. */
  mx: number;
  my: number;
  /** Sway phases and rate ratios per axis. */
  p: number[];
  m: number[];
  calm: number;
  lungs: number;
  sync: number;
  /** A running share of how well the lungs match the guide, kept for the score. */
  syncSum: number;
  syncN: number;
  /** Steps past the edge; steps left of the recovery; how many topples so far. */
  over: number;
  recover: number;
  topples: number;
  /** Per-activity modifiers. */
  instab: number;
  sway: number;
  off: boolean;
  bx: number;
  by: number;
}

/** What a seat's owner does this step: a player's devices, a bot or a network ghost. */
export interface SeatInput {
  x: number;
  y: number;
  l: number;
  r: number;
  act: boolean;
  gentle: boolean;
}

/** One seat. */
export interface Seat {
  index: number;
  /** 'human' reads the page's intents; 'cpu' the bot; 'ghost' a network message; 'none' is empty. */
  kind: 'human' | 'cpu' | 'ghost' | 'none';
  actor: number;
  input: SeatInput;
  /** Last step's feet, for edges. */
  pl: number;
  pr: number;
  pact: boolean;
  /** The bot's reading history (cob x, y) and own memory. */
  hx: number[];
  hy: number[];
  bot: Record<string, number>;
  /** Extra sway for CPU guests. */
  extra: number;
  /** Round score and label for a ghost. */
  score: number;
  pose: string;
  shownClass: number;
  name: string;
  color: string;
}

/** An activity's running state. Plain data; each module adds its own fields to `ev.s` and `ev.d`. */
export interface EvState {
  id: string;
  phase: string;
  t: number;
  total: number;
  done: boolean;
  score: number;
  /** Short form (rounds). */
  short: boolean;
  expert: boolean;
  /** Entities this run spawned, removed at the end. */
  owned: number[];
  /** Per seat, activity-defined. */
  s: Record<string, number>[];
  /** Whole activity, activity-defined. */
  d: Record<string, unknown>;
  /** Text line shown now (the sim emits ids; the page says them). */
  seats: number[];
}

/** The game's state. */
export interface Flow {
  mode: Mode;
  day: number;
  /** Activity ids finished today. */
  done: string[];
  /** Bot skill driving seat 0: '' a person; 'perfect', 'human', 'sloppy', 'idle', 'random'. */
  bot: string;
  noTopple: boolean;
  steadier: boolean;
  /** Attract: the director loop runs. */
  auto: boolean;
  autoIndex: number;
  autoT: number;
  /** Whole-game playthrough driver on. */
  drive: boolean;
  driveT: number;
  ev: EvState | null;
  /** The last result. */
  last: { id: string; score: number; rank: string; pebbles: number; age: number };
  ages: number[];
  pebbles: number;
  found: number[];
  plaques: number[];
  bests: Record<string, number>;
  look: number;
  colour: number;
  headband: boolean;
  cut: string;
  cutT: number;
  /** Set on when a class list is running (Group Class). */
  group: { list: string[]; at: number; scores: number[]; seats: number[] } | null;
  /** A session's own seat. */
  meSeat: number;
  /** The island's whole state hits Free Play after credits. */
  free: boolean;
  /** Finale score pieces. */
  tiltScore: number;
  /** What the guest could use now, as `kind:id`, and how many times each person has been talked to today. */
  near: string;
  nearX: number;
  nearZ: number;
  talk: Record<string, number>;
  /** Actors to take away after they have moved. */
  dropping: number[];
  /** Steps left of Old Nan's single, slow nod. */
  nod: number;
  /** Sitting on a bench. */
  sit: number;
  /** Steps since the last pebble dropped on the cairn; how many stand on it. */
  cairnT: number;
  cairnShown: number;
  /** Lets a menu pick wait: the Day 1 walk is done. */
  walked: boolean;
}

export const FLOW = defineComponent('flow', {
  description: 'The game state: mode, day, the running activity and what the player has earned.',
  fields: {
    mode: { type: 'string', default: 'front', description: 'Where the game is.' },
    day: { type: 'integer', default: 1, description: 'The residency day, 1 to 5; 6 is After.' },
    done: { type: 'array', default: [], description: 'Activities finished today.' },
    bot: { type: 'string', default: '', description: 'The bot skill playing seat 0, or empty.' },
    noTopple: { type: 'boolean', default: false, description: 'Dev cheat.' },
    steadier: { type: 'boolean', default: false, description: 'The Steadier Hands assist.' },
    auto: { type: 'boolean', default: false, description: 'Attract mode.' },
    autoIndex: { type: 'integer', default: 0, description: 'Which attract clip.' },
    autoT: { type: 'integer', default: 0, description: 'Steps into this attract clip.' },
    drive: { type: 'boolean', default: false, description: 'The whole-game driver.' },
    driveT: { type: 'integer', default: 0, description: 'Steps the driver has waited.' },
    ev: { type: 'any', default: null, description: 'The running activity.' },
    last: {
      type: 'object',
      default: { id: '', score: 0, rank: 'Present', pebbles: 0, age: 0 },
      description: 'The last result.',
    },
    ages: { type: 'array', default: [], description: 'Wobble Ages so far.' },
    pebbles: { type: 'integer', default: 0, description: 'Pebbles earned.' },
    found: { type: 'array', default: [], description: 'Hidden pebbles found.' },
    plaques: { type: 'array', default: [], description: 'Plaques read.' },
    bests: { type: 'object', default: {}, description: 'Best score per activity.' },
    look: { type: 'integer', default: 0, description: 'Which of three guest looks.' },
    colour: { type: 'integer', default: 0, description: 'Tracksuit colour.' },
    headband: { type: 'boolean', default: false, description: 'The headband is on.' },
    cut: { type: 'string', default: '', description: 'The cutscene.' },
    cutT: { type: 'integer', default: 0, description: 'Steps into it.' },
    group: { type: 'any', default: null, description: 'A list of classes running.' },
    free: { type: 'boolean', default: false, description: 'Free Play is open.' },
    tiltScore: { type: 'number', default: 0, description: 'The finale, for its remark.' },
    meSeat: { type: 'integer', default: 0, description: 'A session\u2019s own seat.' },
    near: { type: 'string', default: '', description: 'What the guest could use now.' },
    nearX: { type: 'number', default: 0, description: 'Where it is, east.' },
    nearZ: { type: 'number', default: 0, description: 'Where it is, south.' },
    talk: { type: 'object', default: {}, description: 'Talks today, per person.' },
    dropping: { type: 'array', default: [], description: 'Actors to take away after they have moved.' },
    nod: { type: 'integer', default: 0, description: 'Steps left of a nod.' },
    sit: { type: 'integer', default: 0, description: 'Steps sat on a bench.' },
    cairnT: { type: 'integer', default: 0, description: 'Steps since the last pebble dropped.' },
    cairnShown: { type: 'integer', default: 0, description: 'Pebbles standing on the cairn.' },
    walked: { type: 'boolean', default: false, description: 'The Day 1 walk is done.' },
  },
});

export const SEAT = defineComponent('seat', {
  description: 'One balancing person: who drives it, its body and its input.',
  fields: {
    index: { type: 'integer', default: 0, description: 'Which seat.' },
    kind: { type: 'string', default: 'none', description: 'human, cpu, ghost or none.' },
    actor: { type: 'integer', default: -1, description: 'Its body.' },
    input: {
      type: 'object',
      default: { x: 0, y: 0, l: 0, r: 0, act: false, gentle: false },
      description: 'This step.',
    },
    pl: { type: 'number', default: 0, description: 'Last left foot.' },
    pr: { type: 'number', default: 0, description: 'Last right foot.' },
    pact: { type: 'boolean', default: false, description: 'Last act.' },
    hx: { type: 'array', default: [], description: 'The bot’s late reading of x.' },
    hy: { type: 'array', default: [], description: 'The bot’s late reading of y.' },
    bot: { type: 'object', default: {}, description: 'The bot’s memory.' },
    extra: { type: 'number', default: 0, description: 'Extra sway.' },
    score: { type: 'number', default: 0, description: 'A ghost’s score.' },
    pose: { type: 'string', default: '', description: 'A ghost’s pose.' },
    shownClass: { type: 'integer', default: -1, description: 'Which class a ghost is in.' },
    name: { type: 'string', default: '', description: 'Its name.' },
    color: { type: 'string', default: '', description: 'Its colour.' },
  },
});

export const WOBBLE = defineComponent('wobble', {
  description: 'A seat’s centre of balance and its breath.',
  fields: {
    x: { type: 'number', default: 0, description: 'CoB right.' },
    y: { type: 'number', default: 0, description: 'CoB forward.' },
    vx: { type: 'number', default: 0, description: 'Velocity.' },
    vy: { type: 'number', default: 0, description: 'Velocity.' },
    tx: { type: 'number', default: 0, description: 'Slewed stick.' },
    ty: { type: 'number', default: 0, description: 'Slewed stick.' },
    mx: { type: 'number', default: 0, description: 'Mouse target.' },
    my: { type: 'number', default: 0, description: 'Mouse target.' },
    p: { type: 'array', default: [], description: 'Sway phases.' },
    m: { type: 'array', default: [], description: 'Sway ratios.' },
    calm: { type: 'number', default: 0, description: '0 to 1.' },
    lungs: { type: 'number', default: 0, description: '0 to 1.' },
    sync: { type: 'number', default: 0, description: '0 to 1.' },
    syncSum: { type: 'number', default: 0, description: 'Sum.' },
    syncN: { type: 'integer', default: 0, description: 'Count.' },
    over: { type: 'integer', default: 0, description: 'Steps past the edge.' },
    recover: { type: 'integer', default: 0, description: 'Steps of recovery left.' },
    topples: { type: 'integer', default: 0, description: 'Topples so far.' },
    instab: { type: 'number', default: 1, description: 'Instability scale.' },
    sway: { type: 'number', default: 1, description: 'Sway scale.' },
    off: { type: 'boolean', default: false, description: 'No model this activity.' },
    bx: { type: 'number', default: 0, description: 'A steady push.' },
    by: { type: 'number', default: 0, description: 'A steady push.' },
  },
});

export const ISLAND = defineComponent('island', {
  description: 'The island’s tilt.',
  fields: {
    tilt: { type: 'number', default: 0.4, description: 'The story tilt, degrees.' },
    tiltX: { type: 'number', default: 0, description: 'Finale tilt about east, degrees.' },
    tiltZ: { type: 'number', default: 0, description: 'Finale tilt about south, degrees.' },
    storm: { type: 'number', default: 0, description: '0 clear, 1 full storm.' },
    finale: { type: 'integer', default: 0, description: 'The finale step, 0 when off.' },
    seaT: { type: 'number', default: 0, description: 'The sea’s drift.' },
  },
});

/** The scene's components, typed. */
export type C = {
  flow: Flow;
  seat: Seat;
  wobble: Wobble;
  island: { tilt: number; tiltX: number; tiltZ: number; storm: number; finale: number; seaT: number };
  actor: ActorComponent;
  roundScene: object;
  cast: object;
  ghost: { seat: number };
  plaque: object;
  pebble: object;
  drink: object;
  rollMarble: object;
  seaProp: object;
  cairn: object;
};

export type W = World<C>;
export type SeatE = { id: number; seat: Seat; wobble: Wobble };

export const flowOf = (w: W): Flow => (w.query('flow')[0] as unknown as { flow: Flow }).flow;
export const islandOf = (w: W): C['island'] => (w.query('island')[0] as unknown as { island: C['island'] }).island;
export const seatsOf = (w: W): SeatE[] => w.query('seat', 'wobble') as unknown as SeatE[];
export const seatOf = (w: W, i: number): SeatE => seatsOf(w).find((e) => e.seat.index === i) as SeatE;
export const say = (w: W, line: string, who = ''): void => void w.emit('say', { line, who } as never);
/** Which effect a cue also bursts, where the first seat stands. */
const CUE_FX: Readonly<Record<string, string>> = {
  splashBig: 'wtSplashBig',
  splash: 'wtSplash',
  gullLand: 'wtFeathers',
  calmWave: 'wtCalm',
  stamp: 'wtSparkle',
  pebble: 'wtDust',
  marbleSink: 'wtSparkle',
};
export const cue = (w: W, name: string, data: Record<string, unknown> = {}): void => {
  w.emit('cue', { name, ...data } as never);
  const fx = CUE_FX[name];
  if (fx) burst(w, fx, name.startsWith('splash'));
};

/** Bursts an emitter at the first playing body; on the water when asked. */
export function burst(w: W, fx: string, water = false): void {
  const flow = flowOf(w);
  const seat = seatOf(w, flow.meSeat);
  const actor = seat
    ? (w.get(seat.seat.actor) as unknown as { actor: { x: number; y: number; z: number } } | undefined)?.actor
    : undefined;
  if (actor) w.emit(fx as never, { at: [actor.x, water ? 2.05 : actor.y + 0.8, actor.z] } as never);
}

for (const [name, description, field] of [
  ['plaque', 'A plaque.', 'k'],
  ['pebble', 'A hidden pebble.', 'k'],
  ['drink', 'A drink on the table.', 'k'],
  ['rollMarble', 'A marble nobody is rolling.', 'k'],
] as const) {
  defineComponent(name, {
    description,
    fields: {
      [field]: { type: 'integer', default: 0, description: 'Which.' },
      id: { type: 'integer', default: -1, description: 'Its prop.' },
      x: { type: 'number', default: 0, description: 'Rest place, east.' },
      z: { type: 'number', default: 0, description: 'Rest place, south.' },
    },
  });
}
defineComponent('seaProp', {
  description: 'The sea.',
  fields: {
    id: { type: 'integer', default: -1, description: 'Its prop.' },
    near: { type: 'integer', default: -1, description: 'The textured water near you.' },
  },
});
defineComponent('ferry', {
  description: 'The ferry.',
  fields: {
    id: { type: 'integer', default: -1, description: 'Its prop.' },
    t: { type: 'integer', default: 0, description: 'Steps under way.' },
  },
});
defineComponent('nearMark', {
  description: 'The highlight.',
  fields: { id: { type: 'integer', default: -1, description: 'Its prop.' } },
});
defineComponent('cairn', {
  description: 'The pebbles of your cairn.',
  fields: { ids: { type: 'array', default: [], description: 'Their props.' } },
});

/** Marks the scene as a session's: stations all mean the pavilion here. */
defineComponent('roundScene', { description: 'This scene is a session\u2019s.', fields: {} });
/** A ghost: which seat it shows. */
defineComponent('ghost', {
  description: 'Another player, shown on a neighbouring mat. It never touches this copy\u2019s round.',
  fields: { seat: { type: 'integer', default: 0, description: 'Its seat.' } },
});
