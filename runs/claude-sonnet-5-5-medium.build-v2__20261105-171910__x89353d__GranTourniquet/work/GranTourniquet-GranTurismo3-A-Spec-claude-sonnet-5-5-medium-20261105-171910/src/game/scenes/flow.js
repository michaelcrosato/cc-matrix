// Scene switching and the rules around the end of a race or test. Plan section 7 (Flow), 6 (Events, Licences).
import { App, S, saveProfile, fmtTime } from '../app.js';
import { RaceSim, POS_POINTS } from '../sim/race.js';
import { EVENTS, eventById } from '../data/events.js';
import { testById, TESTS } from '../data/licences.js';
import { CAR_INFO } from '../data/cars.js';
import { TRACKS } from '../data/tracks.js';
import { currentCar, recordTest, recordRound, finishSeries, eventState, medalFor, nextMedalGap, startEvent } from '../sim/career.js';
import { playerEntry, aiField } from '../sim/fields.js';
import { defaultInstall } from '../sim/tuning.js';
import { MEDALS } from '../data/medals.js';

export async function go(scene, { cover = 'wipe' } = {}) {
  const e = App.engine; App.mix?.clear?.();
  if (!App.fast) { try { await e.screen.cover(cover); } catch {} }
  await e.loadGame(scene);
  if (!App.fast) { try { e.screen.reveal(cover); } catch {} }
}
export const goMenu = (screen, args = {}) => go(new App.scenes.menu({ screen, args }));
export const goRace = (cfg) => go(new App.scenes.race(cfg));

// ---- building race setups ----
export function eventRoundSetup(profile, ev, round) {
  const car = currentCar(profile), r = ev.rounds[round], rally = !!r.rally, size = r.size ?? (rally ? 2 : 7), seed = 100 + round * 13 + ev.id.length;
  const ai = aiField(ev, round, size, seed); const player = playerEntry(profile, car);
  let field = [player, ...ai]; if (rally) { const [carId] = ev.pool[(r.leg - 1) % ev.pool.length]; field = [player, { ...ai[0], carId, id: 'rival', name: 'RIVAL ' + r.leg, skill: ev.pace[0] + (ev.pace[1] - ev.pace[0]) * ((r.leg - 1) / 2) }]; }
  return { mode: 'race', track: r.track, hour: r.hour, hourEnd: r.hourEnd, rain: !!r.rain, endurance: !!r.endurance, leg: r.leg, title: ev.name + ' ' + (round + 1) + '/' + ev.rounds.length, event: { id: ev.id, round }, dirt: car.dirt, music: true,
    sim: { laps: r.laps, field, contact: !rally, start: rally ? 'duel' : 'rolling', rally, rain: !!r.rain, pitAI: !!r.endurance, wearMul: r.endurance ? 1 : 0.25, seed, rubber: App.dev.sliders.rubber ?? 0 }, returnTo: { screen: 'events', args: { id: ev.id } }, cam: 0 };
}
export function quickRaceSetup(o) { // o: track, carId, install, laps, size, level, hour, rain, uid
  const profile = App.profile, car = { carId: o.carId, install: o.install ?? defaultInstall(), uid: o.uid }, pace = { easy: 0.85, normal: 0.92, hard: 0.98 }[o.level ?? 'normal'];
  const fake = { skill: 1 }; const field = [playerEntry(profile, car), ...o.ai ?? []]; return { mode: 'race', track: o.track, hour: o.hour, rain: !!o.rain, title: 'QUICK RACE', quick: true, music: true, sim: { laps: o.laps ?? 3, field, contact: true, start: 'rolling', rain: !!o.rain, wearMul: 0.25, seed: 31, rubber: App.dev.sliders.rubber ?? 0 }, returnTo: { screen: 'arcade', args: {} } };
}
export function testSetup(testId, attempt = 0, runIndex = 0, sum = 0) { const t = testById(testId); return { mode: 'test', track: t.track, hour: t.hour, title: t.id, test: { id: testId, attempt, runIndex, sum }, returnTo: { screen: 'licence', args: { test: testId } }, cones: !!t.cones, music: true }; }

// ---- end of race ----
export function finalizeRace(sc) {
  const sim = sc.sim, res = sim.results(), p = App.profile, cfg = sc.cfg, mine = res.find((r) => r.car === sc.focus);
  const rows = res.map((r) => ({ pos: r.pos, name: r.name, carId: r.carId, time: r.time, finished: r.finished, player: r.car === sc.focus, best: r.best }));
  const out = { rows, title: cfg.title ?? 'RESULTS', sub: TRACKS[cfg.track].name, money: 0, career: false, pts: null, line: null };
  const pos = mine.pos; const km = (sim.laps * sim.tr.length) / 1000, record = App.dev.changed ? null : sc.focus.bestLap; out.line = dellLine(sim, sc, mine);
  if (cfg.event && !sc.finalized) {
    const ev = eventById(cfg.event.id), mult = App.dev.sliders.prize ?? 1; let st = p.events[ev.id]; if (!st) { startEvent(p, ev.id); st = p.events[ev.id]; } st.ai ??= {};
    for (const r of res) if (!r.car.player) st.ai[r.name] = (st.ai[r.name] ?? 0) + (POS_POINTS[r.pos - 1] ?? 0);
    const rr = recordRound(p, ev, pos, mult, km, cfg.track === 'redclay' ? 0.35 : 0.03); out.money = rr.money; out.pts = rr.pts; out.career = true; out.done = rr.done;
    out.series = `SERIES ${st.points} PTS  -  ROUND ${st.round}/${ev.rounds.length}`;
    if (rr.done) { out.finale = finishSeries(p, ev, Object.values(st.ai)); sc.finale = out.finale; }
    sc.finalized = true;
  }
  if (record && !App.dev.changed && sc.focus.bestLap < Infinity) { const key = cfg.track; const rec = p.records[key]; if (!rec || sc.focus.bestLap < rec.time) { p.records[key] = { time: sc.focus.bestLap, car: sc.focus.carId }; } }
  if (!cfg.event && !cfg.quick && cfg.mode === 'race') {}
  p.seen[sc.focus.carId] = true; for (const c of sim.cars) p.seen[c.carId] = true; saveProfile(); App.lastRace = { cfg, record: sim.record, names: sim.cars.map((c) => c.name), carIds: sim.cars.map((c) => c.carId), params: sim.cars.map((c) => ({ carId: c.carId, paint: c.install?.paint ?? c.paint, colour: c.colour, name: c.name, rims: c.install?.rims, spoiler: c.p.spoiler })), track: cfg.track, hour: cfg.hour, rain: cfg.rain, tr: sim.tr, player: sim.cars.indexOf(sc.focus), laps: sim.laps };
  return out;
}
function dellLine(sim, sc, mine) { const best = sc.focus.bestLap; const tn = TRACKS[sc.cfg.track].name; if (isFinite(best) && App.profile.records[sc.cfg.track] && best < App.profile.records[sc.cfg.track].time) return `LAP RECORD AT ${tn}. ${fmtTime(best)}. THE WINDMILL DID NOT TURN TO LOOK.`; if (mine.pos === 1) return 'A WIN. THE CROWD APPLAUDED IN THE USUAL WAY.'; if (mine.pos <= 3) return 'A PODIUM. THE TROPHY SHELF HAS ROOM.'; return 'A RACE WAS RUN. THE CARS WERE RETURNED.'; }
// ---- end of a test ----
export function finalizeTest(sc) {
  const run = sc.run, t = sc.test, cfg = sc.cfg, p = App.profile, out = { passed: run.passed, reason: run.reason, time: null, medal: null }; const idx = cfg.test.runIndex, n = (t.cars ?? [t.carId]).length, sum = (cfg.test.sum ?? 0) + (run.passed ? run.time : 0);
  if (sc.cfg.demo) { out.passed = run.passed; out.time = run.time; out.msg = 'THIS WAS THE DEMONSTRATION. IT HAS NOT BEEN RECORDED.'; out.medal = null; return out; }
  if (run.passed && idx < n - 1) { out.next = true; out.time = run.time; out.runLabel = `RUN ${idx + 1}/${n}`; out.msg = `THE TIMES ARE ADDED TOGETHER. NEXT: ${CAR_INFO[t.cars[idx + 1]].name}.`; sc.cfg.test.nextSum = sum; return out; }
  if (run.passed) { out.time = sum; const r = App.dev.changed ? { medal: medalFor(t.id, sum) } : recordTest(p, t.id, sum); out.medal = r.medal ?? medalFor(t.id, sum); out.gap = nextMedalGap(t.id, sum); p.flags['f' + t.id] = 0; if (r.licenceWon) out.msg = `LICENCE ${r.licenceWon} IS YOURS. ${r.reward.toLocaleString('en-US')} CR HAVE BEEN PAID.`; if (r.goldAll) out.msg = (out.msg ? out.msg + ' ' : '') + 'ALL GOLD. A PRIZE HAS BEEN SENT.'; if (r.prizeCar) out.msg += ' ' + CAR_INFO[r.prizeCar].name + ' IS IN YOUR GARAGE.'; out.licenceWon = r.licenceWon; saveProfile(); }
  else { p.flags['f' + t.id] = (p.flags['f' + t.id] ?? 0) + 1; if (p.flags['f' + t.id] >= 3) { p.flags['line' + t.id] = true; out.offerLine = true; } saveProfile(); }
  App.lastRace = { cfg, record: sc.sim.record, params: sc.sim.cars.map((c) => ({ carId: c.carId, colour: c.colour, name: c.name, spoiler: c.p.spoiler })), track: cfg.track, hour: cfg.hour, tr: sc.sim.tr, player: 0, laps: 1 };
  return out;
}
// ---- wiring on App ----
App.exitRace = (sc, to) => {
  const cfg = sc.cfg; if (App.hubActive) return; if (App.couch) App.endDuel(); const r = cfg.returnTo ?? { screen: 'map', args: {} }; let screen = r.screen, args = r.args;
  if (cfg.event && sc.finalized && to === 'continue') { screen = 'events'; args = { id: cfg.event.id, after: true, finale: sc.finale }; if (sc.finale?.won || sc.finale) { screen = 'seriesEnd'; args = { id: cfg.event.id, finale: sc.finale }; } if (!sc.finale) args = { id: cfg.event.id, after: true }; }
  if (cfg.mode === 'test' && !cfg.demo && to === 'continue') args = { test: cfg.test.id, after: sc.outcome };
  if (cfg.mode === 'attract' || cfg.attract) { App.stopAttract?.(); return; }
  goMenu(screen, args);
};
App.restartRace = (sc) => { const cfg = { ...sc.cfg }; if (cfg.mode === 'test') { cfg.test = { ...cfg.test, attempt: (cfg.test.attempt ?? 0) + 1, runIndex: cfg.test.runIndex ?? 0 }; if (sc.cfg.demo) cfg.demo = false; } if (cfg.event && sc.finalized) { cfg.event = null; cfg.title = 'RETRY'; cfg.returnTo = { screen: 'events', args: { id: sc.cfg.event.id } }; cfg.quick = true; } goRace(cfg); };
App.testNext = (sc) => { const t = sc.cfg.test; goRace({ ...sc.cfg, test: { ...t, runIndex: t.runIndex + 1, sum: t.nextSum, attempt: t.attempt } }); };
App.testDemo = (sc) => { goRace({ ...sc.cfg, demo: true, test: { ...sc.cfg.test, runIndex: 0, sum: 0 } }); };
App.watchReplay = (sc) => { if (!App.lastRace) return; go(new App.scenes.replay({ source: 'last', back: sc.cfg })); };
