// Helpers for sim tests: a match context without the scenes, a match at a situation, stepping until a phase.
import { load } from './context.mjs';
export function simCtx() { return load({ only: s => !/\/(5\d|70|80|90|37|38|39|40|41|14|15|17|2[013])-/.test(s) }); }
export function match(FF, o = {}) { const m = new FF.Match(Object.assign({ home: 'fiascos', away: 'mudhogs', seed: 7, mode: 'lab', start: { possession: 0, los: 50, down: 1, toGo: 20 } }, o)); m.fastCalls = true; return m; }
export function until(m, cond, max = 60) { let t = 0; while (!cond(m) && t < max) { m.stepSim(1 / 120); t += 1 / 120; } return t < max; }
export function call(m, off, def, card) { m.forceCall = { [m.poss]: { play: off, flip: false, card: card || null }, [1 - m.poss]: { play: def, flip: false } }; }
