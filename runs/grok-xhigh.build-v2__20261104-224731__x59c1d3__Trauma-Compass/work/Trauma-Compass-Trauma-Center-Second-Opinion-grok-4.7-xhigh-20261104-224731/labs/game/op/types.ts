/**
 * @file Shared types for the operation sim (labs/game/op/): tools, target kinds, seats, and the operation itself.
 * The sim is plain TypeScript. It reads hands, never the clock, the DOM, or Math.random. Pages and tests both
 * drive `stepOp` (labs/game/op/step.ts) with the same hand records a pad would produce.
 */

/** The eight instruments, in radial order. */
export const TOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'laser', 'syringe', 'gel', 'scanner'] as const;

/** One instrument id. */
export type Tool = (typeof TOOLS)[number];

/** Every target kind a tool can meet, including bare tissue (`body`). */
export const KINDS = [
  'body',
  'pool',
  'shard',
  'wound',
  'guide',
  'mass',
  'nodule',
  'bleeder',
  'abrasion',
  'numb',
  'flap',
  'cocoon',
  'lull',
  'matron',
  'solace',
  'reverie',
  'decoy',
  'balmNode',
  'balmCell',
  'mercy',
  'mote',
  'tendril',
  'binder',
] as const;

/** One target kind. */
export type Kind = (typeof KINDS)[number];

/** What a tool does to a kind, or `refuse` when it must not. */
export type Effect =
  | 'cut'
  | 'slip'
  | 'split'
  | 'grab'
  | 'lift'
  | 'stitch'
  | 'drain'
  | 'burn'
  | 'inject'
  | 'bind'
  | 'paint'
  | 'reveal'
  | 'pop'
  | 'refuse';

/** How hard the shift is. */
export type Difficulty = 'intern' | 'resident' | 'attending';

/** A finished action's grade. */
export type Rating = 'TEXTBOOK' | 'CLEAN' | 'ROUGH' | 'SLIP';

/** Letter rank, plus the attending secret. */
export type Rank = 'C' | 'B' | 'A' | 'S' | '★';

/** One thing on the field. Unused numbers stay 0 so every kind shares one shape. */
export interface Target {
  id: number;
  kind: Kind;
  phase: number;
  site: number;
  patient: number;
  x: number;
  z: number;
  x2: number;
  z2: number;
  done: boolean;
  tag: string;
  /** Flap id this hides under, or -1. */
  under: number;
  locked: boolean;
  hidden: boolean;
  /** Field ticks of reveal left. 0 means a permanent reveal. */
  reveal: number;
  volume: number;
  volumeMax: number;
  bleed: number;
  deep: boolean;
  bleeding: boolean;
  lacquer: boolean;
  stitches: number;
  need: number;
  /** Fractional positions of stitches along the wound, 0 to 1. */
  stitchAt: number[];
  /** Guide polyline as flat x,z pairs. */
  path: number[];
  cut: number;
  samples: number;
  distSum: number;
  loop: boolean;
  burn: number;
  burnNeed: number;
  hp: number;
  gen: number;
  radius: number;
  stroke: number;
  cover: number;
  coverNeed: number;
  lift: number;
  /** Field ticks the flap stays clipped. */
  clipped: number;
  vulnerable: boolean;
  dose: number;
  doseNeed: number;
  surfaced: boolean;
  exposures: number;
  laserDamage: number;
  /** Field ticks of a strain timer. */
  timer: number;
  telegraph: number;
  spawnBleeders: number;
  /** Tag unlocked when a guide finishes. */
  unlock: string;
  /** Seat id holding this with forceps, or -1. */
  holder: number;
  /** Grab origin, metres. */
  ox: number;
  oz: number;
  optional: boolean;
}

/** What one surgeon is doing this step. Positions are metres on the sheet. */
export interface Hand {
  x: number;
  z: number;
  tool: number;
  use: boolean;
  drop: boolean;
  gift: boolean;
  paddle: boolean;
  /** Site to switch to, or -1 to stay. */
  site: number;
  swap: boolean;
  hint: boolean;
  /** The radial is open, so the field runs at three fifths. */
  radial?: boolean;
}

/** One surgeon's cursor, tool, and score. `memo` is bot scratch and is not part of the hash. */
export interface Seat {
  id: number;
  x: number;
  z: number;
  site: number;
  tool: number;
  use: boolean;
  prevUse: boolean;
  /** Last step's paddle level, so a hold is one shock. Not part of the hash. */
  prevPaddle: boolean;
  /** True on the step a held piece is let go. Not part of the hash. */
  drop: boolean;
  score: number;
  chain: number;
  bestChain: number;
  gift: 'stillpoint' | 'second' | 'none';
  charges: number;
  /** Real-time ticks of gift left. */
  giftLeft: number;
  giftKind: '' | 'still' | 'pulse';
  /** Pulse-lock presses so far. -1 when idle. */
  lock: number;
  lockBeat: number;
  lockGood: number;
  lockPerfect: number;
  syringe: number;
  syringeCd: number;
  laserHeat: number;
  laserCool: number;
  /** Ticks of a harmful tool on healthy tissue. */
  harm: number;
  hold: number;
  cutting: number;
  sutureSide: number;
  /** Wound the suture side belongs to, or -1. Not part of the hash. */
  stitchId: number;
  binderHold: number;
  lastGift: number;
  px: number;
  pz: number;
  memo: string;
}

/** One patient's vitals. */
export interface Patient {
  id: number;
  name: string;
  vitals: number;
  alive: boolean;
  coded: boolean;
}

/** A phase the case spawns. */
export interface PhaseDef {
  id: string;
  hint: string;
  until: 'clear' | 'injected' | 'code';
  spawn: Spawn[];
  onEnter: string;
  teach: string;
}

/** A spawn recipe. Omitted fields use the kind's defaults. */
export interface Spawn {
  kind: Kind;
  x: number;
  z: number;
  x2?: number;
  z2?: number;
  site?: number;
  patient?: number;
  volume?: number;
  bleed?: number;
  deep?: boolean;
  path?: number[];
  loop?: boolean;
  hp?: number;
  gen?: number;
  hidden?: boolean;
  tag?: string;
  under?: number;
  locked?: boolean;
  need?: number;
  burnNeed?: number;
  doseNeed?: number;
  coverNeed?: number;
  radius?: number;
  unlock?: string;
  spawnBleeders?: number;
  optional?: boolean;
}

/** Something the page should show for one step. */
export interface GameEvent {
  type: string;
  text: string;
  rating?: Rating;
  x?: number;
  z?: number;
  tool?: string;
  kind?: string;
  seat?: number;
}

/** Live tuning. Sliders write these; reset restores `SLIDER_DEFAULTS`. */
export interface Balance {
  vitalsDrain: number;
  bleed: number;
  clock: number;
  slips: number;
  cursor: number;
  scalpel: number;
  forceps: number;
  suture: number;
  drain: number;
  laser: number;
  syringe: number;
  gel: number;
  scanner: number;
  giftWindow: number;
  giftTime: number;
  strainHp: number;
  strainSpeed: number;
  coopHp: number;
}

/** A flatline, or a finale heart-stop. */
export interface CodeState {
  left: number;
  tries: number;
  patient: number;
  /** A mercy shock that the case allows. */
  free: boolean;
  /** Ticks left in the green band window bookkeeping. The band itself is a function of the tick. */
  shocks: number;
}

/** The whole operation. */
export interface Op {
  id: string;
  title: string;
  seed: number;
  difficulty: Difficulty;
  tick: number;
  /** Field ticks elapsed. */
  field: number;
  /** Field ticks left on the clock. */
  clock: number;
  clockMax: number;
  slips: number;
  slipLimit: number;
  slipDefault: number;
  status: 'playing' | 'won' | 'lost';
  fail: string;
  phase: number;
  phases: PhaseDef[];
  sites: { id: string; name: string }[];
  patients: Patient[];
  seats: Seat[];
  targets: Target[];
  nextId: number;
  code: CodeState | null;
  balance: Balance;
  attract: boolean;
  /** Dev Mode: vitals do not fall. */
  holdVitals: boolean;
  /** Dev Mode: the clock does not fall. */
  holdClock: boolean;
  /** A radial menu is open on some seat. */
  radial: boolean;
  simple: boolean;
  colleague: boolean;
  /** What the AI colleague is doing, for the view. */
  helper: string;
  roll: boolean;
  swapOk: boolean;
  persona: string;
  events: GameEvent[];
  injected: boolean;
  giftUsed: boolean;
  codeCleared: boolean;
  teach: string;
  hint: string;
  par: number;
  codeAllowed: boolean;
  /** Mercy bookkeeping: motes killed, kindness round, exposed ticks, guide motion phase. */
  mercyKills: number;
  mercyRound: number;
  mercyExposed: number;
  mercyBindSpawned: boolean;
  lastBind: number;
  bestChain: number;
  score: number;
}

/** A postcard line per rank. */
export interface Postcards {
  S: string;
  A: string;
  B: string;
  C: string;
}

/** One story case, or the session case. */
export interface CaseDef {
  id: string;
  title: string;
  surgeon: string;
  seconds: number;
  gift: 'stillpoint' | 'second' | 'none';
  charges: number;
  colleague: boolean;
  swap: boolean;
  roll: boolean;
  code: boolean;
  /** The new rule this case is here to teach. */
  rule: string;
  patients: { name: string; age: number; line: string; vitals: number; postcards: Postcards }[];
  sites: { id: string; name: string }[];
  phases: PhaseDef[];
  storyBefore: string;
  storyAfter: string;
  par: number;
}
