import { newProfile, giveCar } from '../src/game/sim/career.js';
import { App } from '../src/game/app.js';
import { eventById } from '../src/game/data/events.js';
import { eventRoundSetup } from '../src/game/scenes/flow.js';
import { RaceSim } from '../src/game/sim/race.js';
import { installPart } from '../src/game/sim/tuning.js';
App.profile = newProfile(); App.dev = { on: false, sliders: {} }; const p = App.profile; const car = giveCar(p, process.argv[2] ?? 'moth'); for (const x of (process.argv[3] ?? '').split(',').filter(Boolean)) car.install = installPart(car.install, x); car.install.tyre = process.argv[4] ?? null;
const ev = eventById(process.argv[6] ?? 'feather'), cfg = eventRoundSetup(p, ev, +(process.argv[5] ?? 1)); const sim = new RaceSim({ ...cfg.sim, track: cfg.track, seed: 7 }); const pl = sim.player; pl.ai = true; pl.skill = 1.0; pl.baseSkill = 1;
for (let i = 0; i < 60 * 900 && sim.state !== 'over'; i++) { sim.step({}); }
for (const c of sim.order) console.log(c.name.padEnd(8), c.carId.padEnd(9), 'laps', c.laps, 'best', c.bestLap.toFixed(1), 'last', (c.lastLap ?? 0).toFixed(1), 'wear', c.c.wear[2].toFixed(2), c.player ? '<-- bot' : '', 'fin', c.finished);
