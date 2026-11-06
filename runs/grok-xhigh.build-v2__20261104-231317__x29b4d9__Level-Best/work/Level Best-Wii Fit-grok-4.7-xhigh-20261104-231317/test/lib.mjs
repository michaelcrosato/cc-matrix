import { createGame } from '../src/game/director.js';
import { memoryStorage } from '../src/core/save.js';
import { resetRng } from '../src/core/rng.js';
import { resetTuning } from '../src/core/tuning.js';
import { eventIds } from '../src/events/index.js';

export const DT = 1 / 120;

export async function fresh(extra = {}) {
  resetTuning();
  return createGame({ manual: true, storage: memoryStorage(), ...extra });
}

export function tap(game, code = 'Enter') {
  game.key(code, true);
  game.advance(DT);
  game.key(code, false);
}

export function pressChoice(game, id) {
  const choices = game.state().choices;
  const index = choices.indexOf(id);
  if (index < 0) throw new Error(`no choice ${id} on ${game.state().screen}: ${choices.join(',')}`);
  game.activate(index);
}

export async function until(game, pred, cap, label) {
  let t = 0;
  while (t <= cap) {
    const state = game.state();
    if (pred(state)) return state;
    const step = Math.min(0.5, cap - t);
    if (step <= 0) break;
    game.advance(step);
    t += step;
  }
  const state = game.state();
  const ev = state.event;
  throw new Error(`${label} stuck on ${state.screen} after ${cap}s (${ev ? `${ev.id} t=${ev.t.toFixed(1)}` : 'no event'})`);
}

export function finiteLanes(state) {
  const lanes = state.event && state.event.lanes;
  if (!lanes) return true;
  return lanes.every((lane) => Number.isFinite(lane.leanX) && Number.isFinite(lane.leanZ) && Number.isFinite(lane.form));
}

export const CAP = {
  poses: 100,
  cairn: 90,
  stillWater: 80,
  logReps: 100,
  plank: 80,
  tug: 90,
  stepClass: 140,
  plates: 80,
  islandLoop: 110,
  fruitHat: 80,
  roomService: 90,
  springboard: 80,
  raft: 280,
  grandHold: 240,
  checkin: 80,
};

export function capOf(id) {
  return CAP[id] || 120;
}

export async function playBot(id, { tier = 1, skill = 'sharp', opt = {}, seed = 1 } = {}) {
  resetRng(seed);
  const game = await fresh();
  game.bot(skill, opt);
  const started = game.goto('play', { id, tier, seed });
  if (!started) throw new Error(`could not start ${id}`);
  const cap = capOf(id);
  let t = 0;
  while (t < cap) {
    const state = game.state();
    if (!finiteLanes(state)) throw new Error(`${id} NaN`);
    if (state.screen !== 'play' && state.screen !== 'checkinPlay') break;
    game.advance(0.5);
    t += 0.5;
  }
  const state = game.state();
  if (state.screen === 'play' || state.screen === 'checkinPlay') {
    throw new Error(`${id} tier ${tier} ${skill} hung at t=${state.event && state.event.t}`);
  }
  return { game, state };
}

export function assert(cond, message) {
  if (!cond) throw new Error(message);
}

export { eventIds };
