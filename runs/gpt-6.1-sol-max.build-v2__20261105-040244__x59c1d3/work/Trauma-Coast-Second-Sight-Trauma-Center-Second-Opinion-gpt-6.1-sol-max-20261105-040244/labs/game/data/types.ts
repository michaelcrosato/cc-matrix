/** @file Designer-facing surgery data and plain deterministic operation state. */
export type Point = [number, number];
export type Difficulty = 'Intern' | 'Resident' | 'Attending';
export type TargetKind =
  | 'pool'
  | 'shard'
  | 'wound'
  | 'incision'
  | 'mass'
  | 'nodule'
  | 'bleeder'
  | 'abrasion'
  | 'numb'
  | 'cocoon'
  | 'flap'
  | 'lull'
  | 'matron'
  | 'solace'
  | 'reverie'
  | 'decoy'
  | 'balm'
  | 'node'
  | 'mercy'
  | 'mote'
  | 'tendril'
  | 'binder';
export type Tool = 'Scalpel' | 'Forceps' | 'Suture' | 'Drain' | 'Laser' | 'Syringe' | 'Gel' | 'Scanner';
export type Rating = 'TEXTBOOK' | 'CLEAN' | 'ROUGH' | 'SLIP';
export interface Spawn {
  kind: TargetKind;
  at?: Point;
  path?: Point[];
  site?: number;
  deep?: boolean;
  buried?: boolean;
  generation?: number;
  parent?: number;
  required?: boolean;
  radius?: number;
  hp?: number;
}
export interface Phase {
  id: string;
  title: string;
  hint: string;
  spawn: Spawn[];
  code?: boolean;
  gift?: boolean;
  close?: boolean;
  drama?: string;
  allPaddles?: boolean;
  goal?: string;
}
export interface Case {
  id: string;
  title: string;
  patient: string;
  age: number;
  detail: string;
  sites: string[];
  field: string;
  seconds: number;
  vitals: number;
  lead: 'wren' | 'sabine';
  gift: number;
  ai: boolean;
  phases: Phase[];
  postcard: string[];
  ranks: number[];
}
export interface Target extends Required<Omit<Spawn, 'at' | 'path'>> {
  id: number;
  x: number;
  z: number;
  baseX: number;
  baseZ: number;
  path: Point[];
  progress: number;
  done: boolean;
  born: number;
  exposed: number;
  scanned: number;
  cycle: number;
  lift: number;
  clip: number;
  dose: number;
  mask: number;
  last: number;
  stitches: Point[];
}
export type Hand = [number, number, number, number, number, number, number, number, number, ...number[]];
export interface Seat {
  id: number;
  x: number;
  z: number;
  px: number;
  pz: number;
  site: number;
  tool: number;
  held: boolean;
  charge: number;
  cooldown: number;
  heat: number;
  healthy: number;
  lastSlip: number;
  refuseAt: number;
  grab: number;
  start: Point;
  gift: number;
  giftUntil: number;
  giftStarted: number;
  lastBeat: number;
  giftKind: 'still' | 'pulse' | 'none';
  pulseAt: number;
  beats: number;
  perfect: number;
  good: number;
  giftCounter: number;
  shockCounter: number;
  swapCounter: number;
  score: number;
  slips: number;
  chain: number;
  best: number;
  active: boolean;
}
export interface OpEvent {
  n: number;
  type: string;
  text: string;
  x: number;
  z: number;
  seat: number;
}
export interface Code {
  patient: number;
  until: number;
  tries: number;
  scripted: boolean;
  needsAll?: boolean;
  shockSeats?: number[];
}
export interface Operation {
  caseId: string;
  humans: number;
  difficulty: Difficulty;
  seed: number;
  tick: number;
  fieldTicks: number;
  phase: number;
  phaseAt: number;
  phaseWait: number;
  status: 'playing' | 'won' | 'lost';
  reason: string;
  patients: number[];
  left: number;
  clockScale: number;
  targets: Target[];
  seats: Seat[];
  nextId: number;
  score: number;
  chain: number;
  best: number;
  slips: number;
  rating: string;
  eventId: number;
  events: OpEvent[];
  lastProgress: number;
  hint: string;
  code: Code | null;
  codes: number[];
  bossRound: number;
  consultUntil: number;
  retry: boolean;
  dev: boolean;
}
export type Balance = Record<string, number>;
export interface Rules {
  balance: Balance;
  difficulty: Difficulty;
  simpleGift: boolean;
  attract: boolean;
  freezeVitals: boolean;
  freezeClock: boolean;
  infiniteGift: boolean;
  oneHit: boolean;
}
