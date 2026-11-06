import { rngOf } from '../core/rng.js';
import { COLORS, Emitter } from './session.js';

/** On your own: you host, the other seats are AI mercs. */
export function soloSession(game, { seed = 7, seats = 4 } = {}) {
  const e = Emitter(); let t0 = null, clock = 0;
  const players = Array.from({ length: seats }, (_, i) => ({ id: i, name: i === 0 ? 'YOU' : ['INES', 'DOV', 'MAGS'][i - 1], color: COLORS[i], ai: i > 0 }));
  return { kind: 'solo', me: 0, players, host: 0, isHost: true, server: false, seed, time: () => (t0 === null ? -Infinity : clock - t0), rng: (l) => rngOf(seed, l), send: () => true, on: e.on, ready() { t0 = 3000; clock = 0; e.emit('start', { in: 3000 }); }, answer() {}, finish(o) { e.emit('end', { reason: 'finished', standings: o.standings }); }, fail() {}, tick(ms) { clock += ms; }, emit: e.emit };
}
