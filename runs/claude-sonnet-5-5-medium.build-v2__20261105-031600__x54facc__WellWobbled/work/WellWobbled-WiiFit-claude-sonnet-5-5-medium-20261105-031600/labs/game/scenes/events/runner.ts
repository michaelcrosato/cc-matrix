/**
 * @file Runs activities. Every seat with an `act` component (the guest, CPU guests, class seats) runs its own copy of
 * the running activity: the runner moves it to its mat, resets the model modifiers, steps the activity and its bot, and
 * when the guest's run finishes writes the results (rank, pebbles) into `flow` and emits `result`. Teardown removes
 * whatever the activity spawned. Sim-side.
 * @example
 * startActivity(w, 'morning'); // flow.mode becomes 'event'
 */
import { despawnAll } from '../spawn';
import { STATIONS, groundAt, type StationId } from '../data/world';
import { newBot, type Bot, type BotKind } from '../bot/players';
import { placeGuest } from '../cast';
import { advanceRound, roundOn } from '../round';
import { ACTIVITIES } from './index';
import { rankOf, type Ctx, type Seated, type W } from './types';

let bots = new WeakMap<object, Bot>();
/** The seated guest. */
export const guestOf = (w: W): Seated =>
  w.query('seat', 'wobble', 'cast', 'act').find((e) => e.cast.who === 'guest') as unknown as Seated;
const flowOf = (w: W) => w.query('flow')[0].flow;
/** Everyone who runs an activity (guest first, then class seats in id order). */
export const seatedOf = (w: W): Seated[] => w.query('seat', 'wobble', 'cast', 'act') as unknown as Seated[];

/** A seat's context for its running activity. `mat` overrides the origin (class seats stand on their own mat). */
export function ctxOf(w: W, e: Seated): Ctx {
  const flow = flowOf(w);
  const act = ACTIVITIES[e.act.id];
  const st = act ? STATIONS[act.station as StationId] : STATIONS.plaza;
  const mat = e.cast.mat;
  const origin =
    e.cast.seatNo >= 0
      ? ([mat[0], mat[1], mat[2]] as const)
      : ([st.at[0], groundAt(st.at[0], st.at[1]), st.at[1]] as const);
  return {
    w,
    run: e.act,
    flow,
    me: e,
    mine: e.id,
    origin,
    yaw: 0,
    p: (k) => w.settings.get<number>(k),
    lead: e.cast.who === 'guest',
  };
}
const reset = (e: Seated, id: string, short: boolean): void => {
  despawnAllOf(e);
  Object.assign(e.act, { id, phase: '', t: 0, score: 0, done: 0, ids: [], short: short ? 1 : 0 });
  e.act.a = new Array(24).fill(0);
  e.act.b = new Array(128).fill(0);
  Object.assign(e.wobble, {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    r: 0,
    out: 0,
    recover: 0,
    topples: 0,
    instMul: 1,
    swayMul: 1,
    dx: 0,
    dy: 0,
    lungs: 0,
    sync: 0,
    calm: 0,
  });
};
let pending: W | null = null;
const despawnAllOf = (e: Seated): void => {
  if (pending) despawnAll(pending, e.act.ids);
  e.act.ids = [];
};

/** Starts activity `id` for the guest (and for any class seats). */
export function startActivity(w: W, id: string, short = false): void {
  const act = ACTIVITIES[id];
  if (!act) return;
  pending = w;
  const flow = flowOf(w);
  flow.mode = 'event';
  flow.event = id;
  flow.phase = '';
  flow.tick = 0;
  flow.score = 0;
  flow.rank = '';
  for (const e of seatedOf(w)) {
    if (e.cast.seatNo >= 0 || e.cast.who === 'guest') {
      reset(e, id, short);
      const c = ctxOf(w, e);
      if (e.cast.who === 'guest' && e.cast.seatNo < 0) placeGuest(w, c.origin, 0);
      act.setup(c);
    }
  }
  w.emit('start', { id });
}
/** Ends the running activity without a result (back to roam). */
export function leaveActivity(w: W): void {
  pending = w;
  const flow = flowOf(w);
  for (const e of seatedOf(w)) {
    const a = ACTIVITIES[e.act.id];
    if (a?.teardown) a.teardown(ctxOf(w, e));
    despawnAllOf(e);
    e.act.id = '';
  }
  flow.mode = 'roam';
  flow.event = '';
  w.emit('leave', {});
}
/** Chooses the bot kind for the guest ('' for the player). */
export function setBot(w: W, kind: string): void {
  flowOf(w).bot = kind;
}

/** The rules-phase system: steps every seat's running activity. */
export function activitySystem(w: W): void {
  const flow = flowOf(w);
  if (flow.mode !== 'event') return;
  pending = w;
  flow.tick += 1;
  for (const e of seatedOf(w)) {
    const run = e.act;
    if (!run.id || run.done === 2) continue;
    const act = ACTIVITIES[run.id];
    const c = ctxOf(w, e);
    run.t += 1;
    if (c.lead) flow.phase = run.phase;
    e.wobble.instMul = 1;
    e.wobble.swayMul = w.settings.get<boolean>('game.expert') ? 1.35 : 1; // Expert variants: more sway
    e.wobble.dx = 0;
    e.wobble.dy = 0;
    act.step(c);
    if (run.done === 1) {
      run.done = 2;
      run.score = Math.max(0, Math.min(1000, Math.round(run.score)));
      if (c.lead && !roundOn(w)) {
        const r = rankOf(run.score);
        flow.score = run.score;
        flow.rank = r.word;
        flow.pebbles = Math.round(r.pebbles * w.settings.get<number>('game.pebbles.mult'));
        flow.mode = 'results';
        w.emit('result', { id: run.id, score: run.score, rank: r.word, pebbles: flow.pebbles });
      }
    }
  }
  // a class ends when every seat is done: a round deals the next, a hub round with no guest run ends
  if (flow.mode === 'event' && seatedOf(w).every((e) => !e.act.id || e.act.done === 2)) {
    if (roundOn(w)) advanceRound(w);
    else flow.mode = 'results';
  }
}
/** Writes each bot-driven seat's input for this step: the guest when `flow.bot`/auto says so, CPU guests always. */
export function botStep(w: W): void {
  const flow = flowOf(w);
  if (flow.mode !== 'event') return;
  const guestKind = (flow.bot || (w.settings.get<boolean>('game.auto') ? 'perfect' : '')) as BotKind | '';
  for (const e of seatedOf(w)) {
    const kind = (e.cast.who === 'guest' ? guestKind : e.cast.bot) as BotKind | '';
    if (!kind || !e.act.id || e.act.done === 2) continue;
    const act = ACTIVITIES[e.act.id];
    let bot = bots.get(e.seat);
    if (!bot || bot.kind !== kind) {
      bot = newBot(kind, w.seed + e.id);
      bots.set(e.seat, bot);
    }
    act.bot(ctxOf(w, e), bot);
  }
}
export function resetBots(): void {
  bots = new WeakMap();
}
export type { Ctx };
