// The glue between screens and scenes: starting a drive, what happens after it, and where it returns to.
import { RaceScene } from './scenes/race.js';
import { MenuScene } from './scenes/menu.js';
import { ReplayScene } from './scenes/replay.js';
import { TESTS, LICENCES } from './data/licences.js';
import { EVENTS } from './data/events.js';
import { CAR_INFO } from './data/cars.js';
import { LINES } from './data/text.js';
import { carEntry, driveCar, eventState, oilOf, recordFailure, recordLap, recordRound, recordTest } from './sim/career.js';
import { couchSetup, eventSetup, quickSetup, testDriveSetup, trialSetup } from './sim/setups.js';
import { legCount, testSetup } from './sim/licence.js';
import { formatTime } from './sim/race.js';
import { GhostTrace, Recording } from './sim/replaydata.js';
import { PauseScreen } from './ui/screens/pause.js';
import { MapScreen } from './ui/screens/map.js';
import { LicenceListScreen, TestListScreen, TestCardScreen, TestResultScreen } from './ui/screens/licence.js';
import { EventCardScreen, EventListScreen, RoundCardScreen } from './ui/screens/events.js';
import { DealerScreen } from './ui/screens/dealer.js';
import { PartsScreen, TuningScreen } from './ui/screens/tuning.js';
import { GarageScreen } from './ui/screens/garage.js';
import { TheatreScreen } from './ui/screens/theatre.js';
import { ArcadeScreen } from './ui/screens/arcade.js';
import { ResultsScreen } from './ui/screens/results.js';
import { EndingScreen, PodiumScreen, PrizeScreen } from './ui/screens/cinema.js';
import { startCouchEngine, stopCouchEngine } from './net/couch.js';
import { DevPanel } from './dev/devmode.js';
void Recording;
export function installFlows(app) {
  const seed = () => { app.seedN = (app.seedN ?? 0) + 1; return (Date.now() % 100000) + app.seedN; };
  const toMenu = (start) => app.go(() => new MenuScene(app, { start }));
  app.toMenu = toMenu;
  const mapThen = (...list) => (ui) => { ui.push(new MapScreen(app)); for (const fn of list) ui.push(fn()); };
  const assists = () => ({ ...app.options.assists });
  app.toTitle = () => { app.engine.timeScale = 1; return toMenu(null); };
  app.factory.pause = (scene) => app.ui.push(new PauseScreen(app, scene));
  app.openDev = (scene) => app.ui.push(new DevPanel(app, scene));
  // ---- Licence tests ----
  app.startTest = (id, o = {}) => {
    const test = TESTS[id], leg = o.leg ?? 0;
    const setup = { ...testSetup(test, leg, assists()), seed: seed() };
    return app.go(() => new RaceScene(app, setup, { test, demo: !!o.demo, showLine: !!app.lineForTest || (app.profile.tests[id]?.fails ?? 0) >= 3 && app.lineForTest, legBase: o.legBase ?? 0, run: { type: 'licence', id, demo: !!o.demo } }));
  };
  app.factory.testFinished = (scene) => {
    const J = scene.judge, test = scene.test, demo = !!scene.opts.demo, id = test.id, base = scene.opts.legBase ?? 0, total = J.total + base, leg = scene.leg;
    app.lastRace = scene.sim.rec;
    if (J.status === 'pass' && leg + 1 < legCount(test)) { return app.startTest(id, { demo, leg: leg + 1, legBase: total }); }
    const o = { test, failed: J.status !== 'pass', reason: J.reason, time: total, demo };
    if (demo) { o.medal = null; app.ui.push(new TestResultScreen(app, { ...o, failed: false, reason: '', demoShown: true, time: total })); return; }
    if (J.status !== 'pass') { if (!app.devActive()) recordFailure(app.profile, id); }
    else if (app.devActive()) { o.notSaved = true; }
    else { const r = recordTest(app.profile, id, total); o.medal = r.medal; o.licenceWon = r.licenceWon; o.reward = r.reward; o.prizeCar = r.prizeCar; o.allGold = r.allGold; if (!r.medal) o.failed = false; }
    if (!o.failed) o.next = o.medal === 'gold' ? null : o.medal === 'silver' ? 'gold' : o.medal === 'bronze' ? 'silver' : 'bronze';
    app.save();
    if (o.licenceWon) app.ui.note(LINES.arai.licence);
    app.ui.push(new TestResultScreen(app, o));
  };
  app.backToTests = (id, o = {}) => {
    const lic = TESTS[id].licence;
    return toMenu((ui) => {
      ui.push(new MapScreen(app)); ui.push(new LicenceListScreen(app)); ui.push(new TestListScreen(app, lic));
      if (o.prizeCar) ui.push(new PrizeScreen(app, { carId: o.prizeCar, line: LICENCES[lic].allGold?.text, next: () => ui.pop() }));
    });
  };
  app.afterTestReplay = (o) => app.go(() => new MenuScene(app, { start: (ui) => { ui.push(new MapScreen(app)); ui.push(new LicenceListScreen(app)); ui.push(new TestListScreen(app, o.test.licence)); ui.push(new TestCardScreen(app, o.test.id)); } }));
  // ---- Events ----
  app.startEventRound = (id) => {
    const setup = eventSetup(app.profile, id, assists(), seed());
    return app.go(() => new RaceScene(app, setup, { run: { type: 'event', id } }));
  };
  app.factory.raceFinished = (scene) => {
    const sim = scene.sim, kind = scene.data.kind, me = sim.cars.find((e) => e.player === 0), run = scene.run ?? {};
    app.lastRace = sim.rec; const rows = sim.results(); for (const e of sim.cars) app.profile.seen[e.carId] = true;
    const car = carEntry(app.profile);
    if (kind === 'testdrive') return app.returnFromTestDrive(run);
    const record = !app.devActive() && me?.bestLap ? recordLap(app.profile, sim.tr.id, me.bestLap, me.carId) : false;
    const o = { kind, rows, track: sim.tr.id, best: me?.bestLap ?? null, bestText: me?.bestLap ? formatTime(me.bestLap) : '', record, seed: scene.data.seed, run };
    if (kind === 'race' || kind === 'rally') {
      app.undo = JSON.stringify(app.profile);
      if (car && me) { driveCar(app.profile, car, me.metres, me.dirtM); car.lastWear = (me.c.wear[0] + me.c.wear[1] + me.c.wear[2] + me.c.wear[3]) / 4; }
      const names = rows.map((r) => r.name), r = recordRound(app.profile, run.id, names, 'YOU', app.prizeMult ?? 1);
      Object.assign(o, { title: EVENTS[run.id].name, prize: r.prize, points: r.points, showPoints: kind === 'race', round: r });
      if (r.seriesDone) { o.seriesWon = r.seriesWon; o.seriesLine = r.seriesWon ? `THE SERIES IS YOURS. ${r.bonus ? `BONUS ${r.bonus.toLocaleString('en-US')} CR.` : ''}${r.prizeCar ? ` PRIZE: ${CAR_INFO[r.prizeCar].short}.` : ''}` : 'THE SERIES GOES TO ANOTHER DRIVER. YOU MAY ENTER AGAIN.'; }
      else o.seriesLine = `ROUND ${eventState(app.profile, run.id).round + 1} OF ${EVENTS[run.id].rounds.length} IS NEXT.`;
      if (me?.pos === 1 && sim.tr.id === 'harbour') scene.fireworksOn = true;
      app.save();
    } else if (kind === 'couch') { stopCouchEngine(app); o.title = 'THE DUEL'; o.retry = true; }
    else { o.title = kind === 'timetrial' ? 'TIME TRIAL' : 'QUICK RACE'; if (me?.pos === 1 && sim.tr.id === 'harbour') scene.fireworksOn = true; }
    app.ui.push(new ResultsScreen(app, o));
  };
  app.resultsContinue = (o) => {
    const k = o.kind;
    if (k === 'race' || k === 'rally') {
      const r = o.round, id = o.run.id;
      if (r.seriesDone && r.seriesWon) return app.ceremony(id, r);
      if (r.seriesDone) return toMenu(mapThen(() => new EventListScreen(app), () => new EventCardScreen(app, id)));
      return toMenu(mapThen(() => new EventListScreen(app), () => new EventCardScreen(app, id), () => new RoundCardScreen(app, id)));
    }
    return toMenu(mapThen(() => new ArcadeScreen(app)));
  };
  app.ceremony = (id, r) => {
    const car = carEntry(app.profile), finish = (ui) => { ui.clear(); ui.push(new MapScreen(app)); };
    return toMenu((ui) => {
      ui.push(new MapScreen(app));
      const afterPrize = () => { if (r.ending) { ui.pop(); ui.push(new EndingScreen(app, { next: () => finish(ui) })); } else finish(ui); };
      const toPrize = () => { ui.pop(); if (r.prizeCar) ui.push(new PrizeScreen(app, { carId: r.prizeCar, next: afterPrize })); else afterPrize(); };
      ui.push(new PodiumScreen(app, { eventId: id, carId: car?.carId ?? 'kite', install: car?.install, next: toPrize, line: LINES.dell.win[0].replace('{TRACK}', 'THE PENINSULA').replace('{NAME}', 'THE DRIVER') }));
    });
  };
  app.resultsRetry = (o) => {
    const k = o.kind;
    if (k === 'race' || k === 'rally') { if (app.undo) { app.profile = JSON.parse(app.undo); app.save(); } return app.startEventRound(o.run.id); }
    return app.runAgain?.();
  };
  // ---- Arcade ----
  app.startQuick = (p) => { app.runAgain = () => app.startQuick(p); const setup = quickSetup({ ...p, assists: assists(), seed: seed(), poolIds: Object.keys(CAR_INFO).filter((c) => c !== 'type9' || p.carId === 'type9').slice(0, 13) }); return app.go(() => new RaceScene(app, setup, { run: { type: 'quick' } })); };
  app.startTimeTrial = (p) => { app.runAgain = () => app.startTimeTrial(p); const key = `${p.track}:${p.carId}`, setup = trialSetup({ ...p, assists: assists(), seed: seed() }); return app.go(() => new RaceScene(app, setup, { run: { type: 'trial', key }, ghostData: app.profile.ghosts[key] ?? null })); };
  app.lapDone = (scene, trace, time) => { // Time trial: the best lap becomes the ghost.
    const run = scene.run; if (run?.type !== 'trial') return;
    const key = run.key, cur = app.profile.ghosts[key], isBest = !cur || time < cur.time; if (!isBest || app.devActive()) { if (scene.ghost) scene.traceStart = scene.sim.time; return; }
    const data = trace.toData(time, scene.sim.cars[0].carId); app.profile.ghosts[key] = data; recordLap(app.profile, scene.sim.tr.id, time, scene.sim.cars[0].carId); app.save(); scene.setGhost(app.ctx, data); scene.hud.flash('A NEW GHOST: YOUR BEST', 3); scene.traceStart = scene.sim.time; void GhostTrace;
  };
  app.startCouch = (p) => { app.runAgain = () => app.startCouch(p); const setup = couchSetup({ ...p, assists: assists(), seed: seed() }); app.actions.couch = true; return app.go(() => new RaceScene(app, setup, { compact: true, run: { type: 'couch' }, onReady: (scene) => startCouchEngine(app, scene, setup) })); };
  // ---- Test drive: one lap of the Proving Ground ----
  app.startTestDrive = (carId, install, from) => { const car = from.uid ? carEntry(app.profile, from.uid) : null, setup = testDriveSetup({ carId, install, assists: assists(), paint: install?.paint ?? undefined, seed: seed(), oil: car ? oilOf(car) : 1 }); return app.go(() => new RaceScene(app, setup, { run: { type: 'testdrive', from } })); };
  app.returnFromTestDrive = (run) => { const f = run.from ?? {}; return toMenu((ui) => { ui.push(new MapScreen(app)); if (f.from === 'dealer') { const d = new DealerScreen(app, { first: f.first && !app.profile.cars.length }); d.room = f.room; d.car = f.car; ui.push(d); } else if (f.from === 'parts') { ui.push(new TuningScreen(app)); ui.push(new PartsScreen(app, f.tile)); } else if (f.from === 'tuning') ui.push(new TuningScreen(app)); }); };
  // ---- Restart and retire, from the pause menu ----
  app.restartRun = (scene) => {
    const run = scene.run ?? {}; app.ui.clear(); stopCouchEngine(app);
    if (run.type === 'licence') return app.startTest(run.id, { demo: run.demo });
    if (run.type === 'event') return app.startEventRound(run.id);
    if (run.type === 'testdrive') { const m = scene.data.cars[scene.data.cars.length - 1]; return app.startTestDrive(m.carId, m.install, run.from); }
    if (scene.opts.attract) return null;
    return app.runAgain?.();
  };
  app.retireRun = (scene) => {
    const run = scene.run ?? {}, sim = scene.sim; scene.ended = true; stopCouchEngine(app);
    if (run.type === 'licence') { const t = TESTS[run.id]; if (!run.demo && !app.devActive()) { recordFailure(app.profile, run.id); app.save(); } return app.backToTests(t.id); }
    if (run.type === 'testdrive') return app.returnFromTestDrive(run);
    if (run.type === 'event') { for (const e of sim.players) sim.retire(e.i); sim.updateOrder(); app.factory.raceFinished(scene); return null; }
    return toMenu(mapThen(() => new ArcadeScreen(app)));
  };
  // ---- Replays ----
  app.watchReplay = ({ after }) => { if (!app.lastRace || !app.lastRace.frames) { app.ui.note('THERE IS NOTHING TO WATCH.'); return null; } return app.go(() => new ReplayScene(app, app.lastRace, { after })); };
  app.afterResultsReplay = (o) => app.resultsContinue(o);
  app.watchRecording = (rec, { after }) => app.go(() => new ReplayScene(app, rec, { after: after === 'theatre' ? () => toMenu(mapThen(() => new TheatreScreen(app))) : after }));
  app.watchSaved = (k, { after }) => { const z = app.profile.replays[k]; if (!z) return null; const rec = Recording.fromCompressed(z); return app.watchRecording(rec, { after }); };
  app.saveReplay = (k) => { if (!app.lastRace) return false; const prev = app.profile.replays[k], z = app.lastRace.compress(); z.day = app.profile.day; app.profile.replays[k] = z; if (!app.save()) { app.profile.replays[k] = prev; return false; } return true; };
  app.openGarageFromEvent = (ui) => ui.push(new GarageScreen(app, { onChoose: (u) => { u.note('YOUR RIDE IS CHOSEN.'); } }));
  app.openTuningFromEvent = (ui) => ui.push(new TuningScreen(app));
}
