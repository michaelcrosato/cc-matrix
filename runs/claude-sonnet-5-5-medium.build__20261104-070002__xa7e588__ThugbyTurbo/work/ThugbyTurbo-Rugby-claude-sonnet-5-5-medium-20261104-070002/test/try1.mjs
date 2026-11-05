import { load } from './lib/load.mjs';
const { TT, sim } = load();
TT.cfg.present = false;
for (const seed of [7, 8, 9]) {
const m = sim.newMatch({ home: 'hawks', away: 'mudlarks', venue: 'muddington', seed, mode: 'exh', halfLength: 60, seats: [{ team: 0, kind: 'script', auto: true }], diff: { react: .25, noise: .2 } });
let steps = 0;
const seatI = [sim.emptyIntent()];
const wd = [];
TT.bus.on('watchdog', d => wd.push(d.ph + '@' + m.t.toFixed(0)));
const t0 = Date.now();
while (steps < 120 * 400 && !m.over) { sim.stepMatch(1 / 120, seatI); steps++; }
console.log('seed', seed, 'steps', steps, 'time', Date.now() - t0, 'ms', 'phase', m.phase, 'score', m.score, 'half', m.half, 'clock', m.clock.toFixed(1), 'wd', wd.join(','));
console.log(JSON.stringify(m.counts));
}
