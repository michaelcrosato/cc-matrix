/**
 * @file The scene `game:main`. One room, many runs: a title holds still, an operation steps from `game:hands`.
 * The chart component carries a snapshot so a capture restores the body exactly. Balance sliders apply only after
 * the player moves them.
 */
import {
  addLevelBodies,
  defineComponent,
  defineScene,
  physicsOf,
  spawnProp,
  type Intents,
  type World,
} from '../../../engine/sim-api';
import { spawnPlayer } from '../cast/player';
import { setSlider } from '../op/balance';
import { botHands } from '../op/bot';
import { unpackHands } from '../op/codec';
import { failOp } from '../op/ratings';
import { stepOp, lastHash } from '../op/step';
import type { Difficulty, Kind, Op } from '../op/types';
import { addTarget } from '../op/world';
import { adoptOp, jumpPhase, liveOp, openRun, parseSnapshot, snapshot } from './bridge';
import { FIELD_AT, OR } from './room';
import './props';
import { GAME_SETTINGS, TUNE } from './tune';

/** The chart the page and the tests read. `blob` is the whole operation. */
export const CHART = defineComponent('chart', {
  description: 'The operation on screen: status, the lead vitals, and a snapshot that capture restores.',
  fields: {
    hash: { type: 'string', default: '', description: 'The operation hash after the last step.' },
    status: {
      type: 'string',
      default: 'idle',
      description: 'playing, won, lost, or idle when this run is not an operation.',
    },
    title: { type: 'string', default: '', description: 'The case title, or empty on the title run.' },
    vitals: { type: 'number', default: 0, unit: '1', description: 'The lead patient, 0 to 100.' },
    clock: { type: 'number', default: 0, description: 'Field ticks left on the clock.' },
    score: { type: 'number', default: 0, description: 'The score.' },
    phase: { type: 'string', default: '', description: 'The phase name.' },
    slips: { type: 'integer', default: 0, description: 'Slips so far.' },
    blob: { type: 'string', default: '', description: 'JSON of the operation, written every step.' },
    run: { type: 'string', default: '', description: 'The run id this world was built for.' },
  },
});

/** Chart fields. */
export interface Chart {
  hash: string;
  status: string;
  title: string;
  vitals: number;
  clock: number;
  score: number;
  phase: string;
  slips: number;
  blob: string;
  run: string;
}

/** Components this scene spawns. */
export interface MainComponents {
  chart: Chart;
}

/** The slider values already applied to an operation, so a restart does not clobber difficulty. */
const seen = new WeakMap<Op, Map<string, number>>();

/** A difficulty setting, or Resident when the string is not one of the three. */
function difficultyOf(value: string): Difficulty {
  if (value === 'intern' || value === 'attending' || value === 'resident') return value;
  return 'resident';
}

/** Copy a moved slider onto the operation. The first sight of an operation only remembers the values. */
function applyTune(w: World<MainComponents>, op: Op): void {
  let known = seen.get(op);
  if (!known) {
    known = new Map();
    for (const row of TUNE) known.set(row.setting, w.settings.get<number>(row.setting));
    seen.set(op, known);
    return;
  }
  for (const row of TUNE) {
    const value = w.settings.get<number>(row.setting);
    if (known.get(row.setting) === value) continue;
    known.set(row.setting, value);
    setSlider(op, row.key, value);
  }
}

/** Write the chart from the live operation. */
function publish(w: World<MainComponents>, run: string): void {
  const [entity] = w.query('chart');
  if (!entity) return;
  const op = liveOp();
  const chart = entity.chart;
  chart.run = run;
  if (!op) {
    chart.status = 'idle';
    chart.hash = '';
    chart.blob = '';
    return;
  }
  chart.status = op.status;
  chart.title = op.title;
  chart.vitals = op.patients[0]?.vitals ?? 0;
  chart.clock = op.clock;
  chart.score = op.score;
  chart.phase = op.phases[op.phase]?.id ?? '';
  chart.slips = op.slips;
  chart.hash = op.status === 'playing' ? lastHash(op) : chart.hash;
  chart.blob = snapshot(op);
}

/** If a restore put an older snapshot back, step that body instead of the one still in memory. */
function reconcile(w: World<MainComponents>): void {
  const [entity] = w.query('chart');
  const op = liveOp();
  if (!entity || !op || !entity.chart.blob) return;
  if (entity.chart.blob === snapshot(op)) return;
  const saved = parseSnapshot(entity.chart.blob);
  if (saved.tick !== op.tick || saved.status !== op.status) adoptOp(saved);
}

/** Rising edges for buttons the sim treats as a fresh press every step they stay down. */
const latch = {
  gift: [false, false, false, false],
  drop: [false, false, false, false],
  swap: [false, false, false, false],
  hint: [false, false, false, false],
};

/** True only on the step a button goes down. Later steps in the same hold do nothing. */
function rise(flags: boolean[], index: number, down: boolean): boolean {
  const fire = down && !flags[index];
  flags[index] = down;
  return fire;
}

/** Player hands, with gift, drop, swap and hint reduced to one step each. */
function pulseEdges(hands: ReturnType<typeof unpackHands>): ReturnType<typeof unpackHands> {
  if (!hands) return null;
  return hands.map((hand, index) => ({
    ...hand,
    gift: rise(latch.gift, index, hand.gift),
    drop: rise(latch.drop, index, hand.drop),
    swap: rise(latch.swap, index, hand.swap),
    hint: rise(latch.hint, index, hand.hint),
  }));
}

/** One step. Absent hands hold the cursors and lift the buttons. */
function stepRun(w: World<MainComponents>, intents: Intents): void {
  reconcile(w);
  const op = liveOp();
  if (op && op.status === 'playing') {
    applyTune(w, op);
    const auto = op.attract || w.settings.get<boolean>('game.autoplay');
    const hands = auto ? botHands(op) : pulseEdges(unpackHands(intents['game:hands'], op.seats.length));
    stepOp(op, hands);
  }
  publish(w, w.settings.get<string>('game.run'));
}

/** Props around the sheet. Missing kinds stand in as crates; the page registers the real ones. */
function dress(w: World<MainComponents>): void {
  const at = FIELD_AT;
  spawnProp(w, { prop: 'prop:table', at: [at.x, 0, at.z], yaw: 0 });
  spawnProp(w, { prop: 'prop:sheet', at: [at.x, at.y, at.z], yaw: 0 });
  spawnProp(w, { prop: 'prop:lamp', at: [at.x, 0, at.z - 1.2], yaw: 0 });
  spawnProp(w, { prop: 'prop:drape', at: [at.x - 2.4, 0, at.z], yaw: 0 });
  spawnProp(w, { prop: 'prop:drape', at: [at.x + 2.4, 0, at.z], yaw: 0 });
  spawnProp(w, { prop: 'prop:monitor', at: [at.x + 1.6, 0, at.z - 1.4], yaw: 0.4 });
  spawnProp(w, { prop: 'prop:board', at: [at.x - 3.2, 0, at.z - 1], yaw: 0.2 });
  spawnProp(w, { prop: 'prop:cursor', at: [at.x, at.y, at.z], yaw: 0 });
}

/** The live operation, or a throw when a dev action fires with no patient. */
function needOp(): Op {
  const op = liveOp();
  if (!op) throw new Error('No operation');
  return op;
}

/** Harbor Light. The run in `game.run` decides whether an operation exists. */
export const main = defineScene<MainComponents>('game:main', {
  description: 'Trauma Compass: a lamp-lit theatre, and one operation or one story at a time.',
  level: 'level:or',
  physics: true,
  setup(w) {
    addLevelBodies(physicsOf(w), OR);
    const run = w.settings.get<string>('game.run');
    const seats = w.settings.get<number>('game.seats');
    const op = openRun(run, {
      difficulty: difficultyOf(w.settings.get<string>('game.difficulty')),
      seed: w.settings.get<number>('game.seed'),
      seats,
      attract: w.settings.get<boolean>('game.attract'),
      simple: w.settings.get<boolean>('game.simple'),
      colleague: w.settings.get<boolean>('game.colleague'),
      phase: w.settings.get<number>('game.phase'),
    });
    if (op && w.settings.get<number>('game.phase') > 0) jumpPhase(op, w.settings.get<number>('game.phase'));
    const hero = OR.spawns.find((spawn) => spawn.name === 'hero')?.position ?? [FIELD_AT.x, 0, FIELD_AT.z];
    spawnPlayer(w, [hero[0] + 3.2, hero[1], hero[2]], 3);
    dress(w);
    w.spawn({ chart: { run, status: op ? 'playing' : 'idle', title: op?.title ?? '' } });
    publish(w, run);
  },
  step: stepRun,
  actions: {
    winPhase() {
      const op = needOp();
      for (const target of op.targets) if (target.phase === op.phase) target.done = true;
    },
    failPhase() {
      failOp(needOp(), 'Called off.');
    },
    heal() {
      for (const patient of needOp().patients) patient.vitals = 100;
    },
    freezeVitals() {
      const op = needOp();
      op.holdVitals = !op.holdVitals;
    },
    freezeClock() {
      const op = needOp();
      op.holdClock = !op.holdClock;
    },
    oneHit() {
      const op = needOp();
      for (const target of op.targets) {
        if (target.hp > 0) target.hp = Math.min(target.hp, 0.05);
        if (target.burnNeed > 0) target.burnNeed = Math.min(target.burnNeed, 0.05);
      }
    },
    infiniteGift() {
      for (const seat of needOp().seats) seat.charges = 9;
    },
    spawnStrain(_w, args) {
      const op = needOp();
      const kind = (args as { kind?: Kind } | undefined)?.kind ?? 'lull';
      const seat = op.seats[0];
      addTarget(op, { kind, x: seat?.x ?? 0, z: seat?.z ?? 0 }, op.phase);
    },
  },
});

/** Loaded so the settings exist before the scene is defined. */
void GAME_SETTINGS;

export default main;
