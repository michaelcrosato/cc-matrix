import { RaceSim } from '../src/game/sim/race.js';
const mk = (carId, id, player, skill) => ({ id, carId, name: 'C' + id, player, skill, install: { parts: [], settings: {} } });
const s = new RaceSim({ track: process.argv[2] ?? 'kestrel', laps: 2, start: process.argv[3] ?? 'rolling', contact: true, seed: 3, field: [mk('pico', 0, false, .86), mk('kite', 1, false, .88), mk('moth', 2, false, .9), mk('kite', 3, false, .97)] });
let t0 = Date.now(); for (let i = 0; i < 60 * 500 && s.state !== 'over'; i++) { s.step({}); if (i % 1800 == 0) console.log(i / 60 | 0, s.state, s.order.map(c => c.id + ':' + c.laps + ':' + c.prog.toFixed(0)).join(' ')); }
console.log(s.state, s.time.toFixed(0), (Date.now() - t0) + 'ms', s.results().map(r => r.name + ' ' + r.time.toFixed(1)).join(' | '));
