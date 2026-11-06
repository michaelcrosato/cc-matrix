// The whole game by script: a bot buys the Kite, passes licences, wins events (aiDrive at skill 1.0 as its brain), tunes, buys, pits, reaches the Grand Prix and sees the ending. No dev tools.
import { newProfile, buyCar, buyPart, buyTyre, giveCar, currentCar, hasLicence, canBuy, qualifies, eventLocked, startEvent, eventState, recordTest, uidCar, oilChange } from '../../src/game/sim/career.js';
import { App } from '../../src/game/app.js';
import { EVENTS, eventById } from '../../src/game/data/events.js';
import { TESTS, testsOf } from '../../src/game/data/licences.js';
import { CAR_INFO } from '../../src/game/data/cars.js';
import { PARTS, TYRES } from '../../src/game/data/tyres_parts.js';
import { RaceSim } from '../../src/game/sim/race.js';
import { TestRun } from '../../src/game/sim/licence.js';
import { eventRoundSetup, finalizeRace, finalizeTest } from '../../src/game/scenes/flow.js';
import { installPart, displayStats } from '../../src/game/sim/tuning.js';
const LOG = process.env.PLAYLOG;
const log = (...a) => LOG && console.log(...a);
export default async (t) => {
  App.profile = newProfile(); App.dev = { on: false, sliders: {} }; const p = App.profile; p.settings.tcs = 5;
  t.check(buyCar(p, 'kite').ok, 'bot buys the Kite');
  const doTests = (lic) => { for (const test of testsOf(lic)) { let total = 0, ok = true; const n = (test.cars ?? [test.carId]).length; let sc; for (let r = 0; r < n && ok; r++) { const run = new TestRun(test, { runIndex: r, demo: true }); for (let i = 0; i < 60 * run.maxT && !run.done; i++) run.step(null); ok = run.passed; total += run.time ?? 0; sc = { run, test, sim: run.sim, cfg: { test: { id: test.id, runIndex: r, sum: total - (run.time ?? 0), attempt: 0 } }, focus: run.car }; if (ok && r < n - 1) { finalizeTest(sc); } } if (ok) { sc.cfg.test.runIndex = n - 1; sc.cfg.test.sum = total - sc.run.time; const out = finalizeTest(sc); t.check(out.passed && out.medal === 'gold', `test ${test.id} gold (${out.medal} ${out.time?.toFixed?.(2)})`); } else t.check(false, `test ${test.id} demo failed: ${sc.run.reason}`); } };
  const runRace = (cfg, car) => { const sim = new RaceSim({ ...cfg.sim, track: cfg.track, seed: 7 }); const pl = sim.player; pl.ai = true; pl.skill = 1.0; pl.baseSkill = 1; pl.botPit = true; if (cfg.endurance) { /* pits needed */ } for (let i = 0; i < 60 * 1500 && sim.state !== 'over'; i++) { if (pl.finished === false && cfg.endurance) { const w = pl.c.wear.reduce((a, b) => a + b, 0) / 4; if (w < 0.3 || pl.c.fuel < 0.12) pl.pitCalled = true; } sim.step({}); } return sim; };
  const prefer = { dawn: ['kite', 'moth', 'pico'], fellow: ['kite', 'kiteCup'], feather: ['moth', 'kiteCup', 'pico'], society: ['ginga', 'moth', 'brandt32', 'longhorn'], clay: ['ryuRally', 'ryu'], touring: ['libeccio', 'heck', 'brandt32', 'ryu'], h200: ['corsa', 'works', 'heck', 'libeccio'], gp: ['type9', 'corsa', 'works'] };
  const UP = ['intake', 'eng1', 'wt1', 'semi', 'pads', 'eng2', 'wt2', 'brk2', 'aero1', 'turbo1', 'eng3', 'wt3', 'aero2', 'slick'];
  const tune = (ev, car) => { for (const up of UP) { const inst = car.install; if (up === 'sport' || up === 'semi' || up === 'slick') { if (TYRES[up] && p.credits >= TYRES[up].price + 200 && car.install.tyre !== up && (up !== 'slick' || false)) { const before = car.install.tyre; const w = ['street', 'sport', 'semi', 'slick']; if (w.indexOf(up) > w.indexOf(before ?? 'street')) buyTyre(p, car.uid, up); } continue; } const part = PARTS[up]; if (!part || inst.parts.includes(up) || p.credits < part.price + 200) continue; const trial = installPart(inst, up); if (!qualifies(car.carId, trial, ev.restrict).ok) continue; buyPart(p, car.uid, up, installPart); } };
  const pickCar = (ev) => { const order = prefer[ev.id] ?? []; for (const id of order) { let car = p.cars.find((c) => c.carId === id); if (!car && CAR_INFO[id].price && p.credits >= CAR_INFO[id].price && (!CAR_INFO[id].needLicence || hasLicence(p, CAR_INFO[id].needLicence)) && !CAR_INFO[id].prize) { buyCar(p, id); car = p.cars.find((c) => c.carId === id); } if (!car && ['works', 'corsa'].includes(id) && canBuy(p, id).ok) { buyCar(p, id); car = p.cars.find((c) => c.carId === id); } if (car && qualifies(car.carId, car.install, ev.restrict).ok) return car; } return [...p.cars].filter((c) => qualifies(c.carId, c.install, ev.restrict).ok).sort((a, b) => { const sa = displayStats(a.carId, a.install), sb = displayStats(b.carId, b.install); return sb.ps / sb.kg - sa.ps / sa.kg; })[0] ?? null; };
  doTests('C'); t.check(hasLicence(p, 'C'), 'licence C passed');
  const tries = {}; let guard = 0; const done = () => p.ending; const needLic = (l) => { if (!hasLicence(p, l)) doTests(l); };
  while (!done() && guard++ < 60) {
    let progressed = false;
    for (const ev of EVENTS) { if (p.wonEvents.includes(ev.id)) continue; if ((tries[ev.id] ?? 0) >= 8) continue; if (ev.id === 'society') continue; tries[ev.id] = (tries[ev.id] ?? 0) + 1; if (eventLocked(p, ev) && !(ev.needs !== 'C' && !hasLicence(p, ev.needs))) continue; if (!hasLicence(p, ev.needs)) { if (ev.needs === 'B') doTests('B'); else if (ev.needs === 'A') { needLic('B'); doTests('A'); } } if (eventLocked(p, ev)) continue;
      const car = pickCar(ev); if (!car) { log('no car for', ev.id, 'credits', p.credits); continue; } p.current = car.uid; tune(ev, car); if (car.oilKm > 150) oilChange(p, car.uid); startEvent(p, ev.id); let ok = true;
      for (let r = 0; r < ev.rounds.length; r++) { const cfg = eventRoundSetup(p, ev, r); const sim = runRace(cfg, car); const sc = { sim, focus: sim.player, cfg, finalized: false }; const out = finalizeRace(sc); const pos = out.rows.find((x) => x.player).pos; log(ev.id, 'round', r + 1, 'P' + pos, p.credits); sc.finalized = true; if (pos > 3) ok = false; tune(ev, car); if (!out.done && false) break; }
      const st = eventState(p, ev.id); log(ev.id, 'series done', st.points, 'won', p.wonEvents.includes(ev.id), 'credits', p.credits); progressed = true; if (p.wonEvents.includes(ev.id)) t.check(true, 'won ' + ev.id); else if (tries[ev.id] >= 8) t.check(false, `bot cannot win ${ev.id} in 8 attempts (points ${st.points}, credits ${p.credits})`); break; }
    if (!progressed) break;
  }
  // the rear-drive series needs a Ginga: grind the Dawn Patrol Cup for prize money as a player would, buy it, tune it, and try again
  const series = (ev, car) => { startEvent(p, ev.id); for (let r = 0; r < ev.rounds.length; r++) { const cfg = eventRoundSetup(p, ev, r); const sim = runRace(cfg, car); const sc = { sim, focus: sim.player, cfg, finalized: false }; finalizeRace(sc); sc.finalized = true; } };
  for (let g = 0; g < 40 && !p.wonEvents.includes('society'); g++) { const soc = eventById('society'); if (!p.cars.some((c) => c.carId === 'ginga') && p.credits < 15500) { const ev = eventById('dawn'), car = pickCar(ev); p.current = car.uid; if (car.oilKm > 150) oilChange(p, car.uid); series(ev, car); continue; } const car = pickCar(soc); p.current = car.uid; for (let k = 0; k < 3; k++) tune(soc, car); series(soc, car); log('society grind attempt', g, 'points', eventState(p, 'society').points, 'credits', p.credits); }
  t.check(p.wonEvents.includes('society'), 'bot wins society after buying a Ginga (credits ' + p.credits + ')');
  if (!p.ending) t.check(false, 'bot stalled: no further event was playable (credits ' + p.credits + ')'); t.check(p.ending, 'the Grand Prix is won and the ending shows'); t.check(p.cars.some((c) => c.carId === 'type9'), 'the Type 9 is in the garage'); t.check(p.wonEvents.length === EVENTS.length, 'all series won: ' + p.wonEvents.join(','));
  for (const k of ['A']) t.check(hasLicence(p, k), 'licence ' + k);
  log('FINAL credits', p.credits, 'cars', p.cars.map((c) => c.carId).join(','), 'day', p.day);
};
