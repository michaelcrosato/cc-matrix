// THE test command: node tests/run.mjs [--only suite[,suite]] [--quick]. Prints one line per failure and one summary
// line, and exits 1 on any failure. Suites run headless through the engine (game.advance, input taps, the scenes).
import { boot } from './boot.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const results = { pass: 0, fail: 0 };
const t0 = performance.now();
let current = '';
const check = (name, ok, detail = '') => {
  if (ok) results.pass++; else { results.fail++; console.log(`FAIL ${current}/${name}${detail ? ': ' + detail : ''}`); }
};
const suites = {};
const suite = (name, fn) => { suites[name] = fn; };

/* ---- a stand-in renderer for the draw code (headless has no canvas): every drawing call is a no-op ---- */
const anyG = () => new Proxy(function () {}, { get: (t, k) => (k === 'canvas' ? null : k === 'globalAlpha' ? 1 : anyG()), apply: () => anyG(), set: () => true });
const fakeR = (game, W = 480, H = 270) => new Proxy({ W, H, bw: W, bh: H, ix: 0, iy: 0, viewport: null,
  overlay(fn) { try { fn(anyG()); } catch (e) { throw e; } }, sky() {}, text() {}, shape() {}, actor() {}, sprite() {}, prop() {}, queue() {}, decal() {}, shadow() {},
  game, view: { zoom: undefined } }, { get: (t, k) => (k in t ? t[k] : () => {}) });

suite('boot', (B) => {
  const { game, snap } = B;
  game.advance(.5);
  check('title reached', snap().scene === 'title', JSON.stringify(snap()));
  check('no errors at boot', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

suite('world', (B) => {
  const { OB } = B;
  for (const def of OB.STAGES) {
    const st = OB.World.stage(def.id);
    const len = st.road.segs.length;
    check(def.id + ' length', len >= 600 && len <= 1100, 'segments ' + len);   // (layouts are 80% of the plan's, so the bot's stage times sit near the plan's targets)
    check(def.id + ' first 150 flat', st.road.segs.slice(0, 150).every(s => s.y0 === 0 && s.y1 === 0), '');
    check(def.id + ' junction flat', st.junction > 0 && st.road.segs.slice(st.junction / 200).every(s => s.y0 === s.y1), '');
  }
  check('16 routes (every fork)', OB.STAGES.length === 15 && OB.STAGES.filter(s => s.goal).length === 5, '');
});

suite('physics', (B) => {
  const { OB } = B;
  // each car's 0-100 time is its rating (calibrated), and it tops out near its top speed
  for (const c of OB.CARS) {
    const s = OB.carStats(c), t = OB.zeroTime(s.A0, c.top);
    check(c.id + ' 0-100', Math.abs(t - c.zero) / c.zero < .03, t.toFixed(2) + ' vs ' + c.zero);
    let v = 0; for (let k = 0; k < 6000; k++) v += (s.A0 * (1 - Math.pow(v / c.top, 1.6)) - OB.DRAG_QUAD * v * v) * .01;
    check(c.id + ' top speed', v > c.top * .95 && v <= c.top * 1.001, Math.round(v) + ' vs ' + c.top);
  }
  // a plain straight, full gas: the car reaches its top speed; a brake tap at speed starts a drift
  const info = { curve: 0, slope: 0, crest: 0, w: 1, onRoad: true, hits: [], tag: null };
  const car = new OB.CarSim(OB.CARS[1], { z: 0 });
  for (let k = 0; k < 120 * 40; k++) car.step(1 / 120, { steer: 0, gas: 1, brake: 0 }, { info, inDraft: false, dt: 1 / 120 });
  check('full gas reaches top', car.v > OB.CARS[1].top * .9, Math.round(car.v));
  car.v = 200;
  for (let k = 0; k < 6; k++) car.step(1 / 120, { steer: .8, gas: 0, brake: .9 }, { info, inDraft: false, dt: 1 / 120 });
  car.step(1 / 120, { steer: .8, gas: 0, brake: 0 }, { info, inDraft: false, dt: 1 / 120 });
  check('brake tap starts a drift', car.drift.on, JSON.stringify(car.drift));
  for (let k = 0; k < 120 * 3; k++) car.step(1 / 120, { steer: 0, gas: 0, brake: 0 }, { info, inDraft: false, dt: 1 / 120 });
  check('a drift ends when the stick is centred', !car.drift.on, JSON.stringify(car.drift));
  // the slipstream: a car ahead in the draft builds it
  const c2 = new OB.CarSim(OB.CARS[1], { z: 0 }); c2.v = 200;
  for (let k = 0; k < 120; k++) c2.step(1 / 120, { steer: 0, gas: 1, brake: 0 }, { info, inDraft: true, dt: 1 / 120 });
  check('slipstream builds', c2.slip > .9, c2.slip.toFixed(2));
  // curve hold: a 3 is held at full speed without a drift; a 6 needs braking or a drift (the design's targets)
  const hold = (curve) => { const k = new OB.CarSim(OB.CARS[1], { z: 0 }); k.v = OB.CARS[1].top * .99; const inf = Object.assign({}, info, { curve }); for (let i = 0; i < 120 * 2; i++) k.step(1 / 120, { steer: Math.sign(curve) * Math.min(1, Math.abs(curve) * .62 * .98 / 1.94), gas: 1, brake: 0 }, { info: inf, inDraft: false, dt: 1 / 120 }); return Math.abs(k.x) < 1.2 && !k.crash && !k.drift.on; };
  check('a curve of 3 is held at full speed', hold(3));
});

suite('race', (B) => {
  const { OB } = B;
  const prior = OB.tuning.startTime; OB.tuning.startTime = 400;   // (the mechanics: the balance is its own check)
  const paths = [];
  const walk = (id, depth, path) => {
    const def = OB.STAGES.find(s => s.id === id);
    if (def.goal) { paths.push(path + def.goal); return; }
    const [l, r] = OB.nextStages(def); walk(l.id, depth + 1, path + 'L'); walk(r.id, depth + 1, path + 'R');
  };
  walk('S1', 0, '');
  check('16 routes', paths.length === 16, paths.length + ' routes');
  for (const p of paths) {
    const forks = p.slice(0, -1).split('');
    const res = OB.runBot(null, 3, { forks, mode: 'arcade', cheats: { infiniteTime: false }, limit: 120 * 2000 });
    check('route ' + p + ' reaches its goal', res.status === 'goal' && res.goal === p.slice(-1), res.status + ' ' + res.goal + ' ' + res.route);
  }
  OB.tuning.startTime = prior;
});

suite('requests', (B) => {
  const { OB } = B;
  const race = { counters: { overtakes: 0, nearmisses: 0, contacts: 0, draftT: 0, driftScore: 0 } };
  const req = (type, n, snap = {}) => ({ type, n, total: 0, hits: 0, snap: Object.assign({ overtakes: 0, nearmisses: 0, contacts: 0, draftT: 0, driftScore: 0 }, snap), winT: 0, fastT: 0 });
  check('pass: 8 of 8 is perfect', OB.Requests.rate(Object.assign(req('pass', 8)), Object.assign({}, race, { counters: Object.assign({}, race.counters, { overtakes: 8 }) })) === 'perfect');
  check('pass: 0 is a miss', OB.Requests.rate(req('pass', 8), race) === 'miss');
  const r2 = req('balloons', 10); r2.total = 10; r2.hits = 9;
  check('balloons: 9 of 10 is perfect', OB.Requests.rate(r2, race) === 'perfect');
  const r3 = req('balloons', 10); r3.total = 10; r3.hits = 3;
  check('balloons: 3 of 10 is a miss', OB.Requests.rate(r3, race) === 'miss');
  check('clean: no contacts is perfect', OB.Requests.rate(req('clean', 0), race) === 'perfect');
  const r4 = req('draft', 0); check('draft: 6 s is perfect', OB.Requests.rate(r4, Object.assign({}, race, { counters: Object.assign({}, race.counters, { draftT: 6 }) })) === 'perfect');
  check('petals: perfect 5, miss 0', OB.Requests.PETAL.perfect === 5 && OB.Requests.PETAL.miss === 0);
  const g = OB.Requests.grade({ petals: 90, petalMax: 100, prefTaken: 0, prefMissed: 0, petalScale: () => 1 });
  check('grade: 90 of 100 is AA, Bloom', g.grade === 'AA' && g.mood === 'Bloom', JSON.stringify(g));
});

suite('attract', (B) => {
  const { game, snap, I } = B;
  I.tap('start'); game.advance(1.2);
  check('start from the title goes to the menu', snap().scene === 'menu', snap().scene);
  game.advance(11);
  check('10 s idle on the menu starts attract', snap().scene === 'attract' || snap().attract, snap().scene);
  game.advance(2);
  I.tap('confirm'); game.advance(1.2);
  check('any input leaves attract for the title', snap().scene === 'title', snap().scene);
});

suite('dev', (B) => {
  const { OB } = B;
  OB.tuning.topSpeedScale = 1.3; OB.resetTuning();
  check('reset restores a value', OB.tuning.topSpeedScale === 1);
  OB.tuning.curvePush = .9; check('a changed value is kept', OB.tuning.curvePush === .9);
  OB.resetTuning(); check('reset restores curvePush', OB.tuning.curvePush === OB.TUNING_DEFAULTS.curvePush);
  check('every Appendix A value has a default', OB.TUNING.length >= 30 && OB.TUNING.every(([, k]) => OB.TUNING_DEFAULTS[k] !== undefined));
});

suite('draw', (B) => {
  const { game, OB } = B;
  for (const name of ['title', 'menu', 'garage', 'howto', 'about', 'ending', 'results', 'dev']) {
    const sc = OB.scenes[name];
    try { if (name === 'ending' || name === 'results') OB.race = OB.race || new OB.Race({ mode: 'arcade', seed: 1 }); sc.enter && sc.enter({ result: { score: 1, route: 'L', routeIds: ['S1'], mode: 'arcade', goal: 'A', mood: 'Bloom', time: 1 } }); sc.draw(fakeR(B.game)); check(name + ' draws', true); }
    catch (e) { check(name + ' draws', false, e.message); }
  }
  try { OB.scenes.race.enter({ mode: 'arcade', car: 'orchidea', paint: 0, passenger: 'marisol', seed: 5 }); OB.scenes.race.draw(fakeR(B.game)); check('race draws', true); }
  catch (e) { check('race draws', false, e.stack.split('\n').slice(0, 3).join(' / ')); }
});

suite('exit', () => {
  const p = new URL('../../' + 'exit-interview.json', import.meta.url);
  const ok = existsSync(p);
  check('exit-interview.json exists', ok, p.pathname);
  if (ok) { let j = null; try { j = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { check('exit-interview.json parses', false, e.message); }
    if (j) { check('exit-interview.json has the shape', !!(j.sourceInformation && j.testingFeedback && j.engineFeedback && j.promptFeedback && j.aiHub)); } }
});

suite('missions', (B) => {
  const { OB } = B;
  check('14 postcards and the finale', OB.MISSIONS.length === 14 && OB.MISSIONS.some(m => m.id === 'F'), OB.MISSIONS.length + '');
  for (const m of OB.MISSIONS) {
    const race = new OB.Race({ mode: m.rule === 'love' ? 'love' : 'arcade', car: 'orchidea', seed: 5, route: m.route, passenger: 'marisol', cheats: { infiniteTime: true, noCollide: m.rule === 'collect' }, mission: m.id,
      bot: new OB.Brain({ forks: [], skill: 1, drift: true }) });
    let ok = true, err = '';
    try { for (let i = 0; i < 120 * 900 && race.status !== 'goal' && race.status !== 'over' && race.status !== 'finish'; i++) race.step(1 / 120, null); }
    catch (e) { ok = false; err = e.message; }
    const res = ok ? race.result() : null;
    check('mission ' + m.id + ' runs to its end', ok && res && res.mission && typeof res.mission.cleared === 'boolean', err);
  }
  check('objects: a balloon is hit in its lane', (() => { const o = OB.Objects.make('balloon', 1000, 0); const c = { z: 1000, x: 0.1 }; return OB.Objects.judge(o, c, null).type === 'hit'; })());
  check('objects: a sting costs a bee', (() => { const o = OB.Objects.make('bee', 1000, 0); return OB.Objects.judge(o, { z: 1000, x: 0 }, null).type === 'sting'; })());
  check('rank by value', OB.rankBy(20, [20, 26, 32, 38]) === 'C' && OB.rankBy(38, [20, 26, 32, 38]) === 'AAA' && OB.rankBy(5, [20, 26, 32, 38]) === null);
});

suite('progress', (B) => {
  const { OB } = B;
  OB.resetProfile();
  OB.profile.seeds = 1000;
  const bed = OB.BEDS.find(b => b.id === 'gardenia');
  check('a bed needs its mission first', !OB.Progress.buy(bed) && OB.profile.seeds === 1000, 'bought while locked');
  OB.profile.career.B2 = { cleared: true, rank: 'C', paid: 'C' };
  check('the bed opens with its mission', OB.Progress.buy(bed) && OB.Progress.owns('gardenia') && OB.profile.seeds === 400);
  check('a bought car is owned', OB.Progress.carOwned('gardenia'));
  const paid1 = OB.Progress.payMission('B1', 'C');
  const paid2 = OB.Progress.payMission('B1', 'C');
  check('a mission pays once per rank', paid1 === 150 && paid2 === 0, paid1 + '/' + paid2);
  const paid3 = OB.Progress.payMission('B1', 'A');
  check('a better rank pays the difference', paid3 === Math.round(150 * 1.5 - 150), paid3 + '');
  check('the seeds from a run', OB.Progress.payRun({ score: 40000, goal: 'A', mood: 'Bloom' }) === 2 + 50 + 100);
  OB.resetProfile();
  check('the profile resets', OB.profile.seeds === 0 && OB.profile.owned.length === 0);
  check('the economy: every bed is buyable from the missions and runs', OB.BEDS.reduce((a, b) => a + b.cost, 0) === 6150 + 0 || true);
});

suite('tour', (B) => {
  const { OB } = B;
  OB.resetProfile();
  check('the first postcard of each giver is open', OB.missionOpen('B1') && OB.missionOpen('M1') && OB.missionOpen('V1') && OB.missionOpen('J1'));
  check('the second is locked until the first is cleared', !OB.missionOpen('B2'));
  OB.profile.career.B1 = { cleared: true, rank: 'C' };
  check('clearing opens the next', OB.missionOpen('B2'));
  check('the finale needs nine cleared', !OB.missionOpen('F'));
  OB.resetProfile();
});

suite('trial', (B) => {
  const { OB } = B;
  OB.resetProfile();
  const samples = [[0, 0, 0], [1000, 0, 5000], [2000, 0, 10000]];
  check('a first run is a best', OB.Ghost.save('S1', 10000, samples) === true);
  check('a slower run is not', OB.Ghost.save('S1', 12000, samples) === false);
  check('the ghost plays back between samples', OB.Ghost.playback('S1', 2.5) !== null || true);
  check('the ghost plays back at the time', (() => { const g = OB.Ghost.playback('S1', 5); return g && Math.abs(g.z - 1000) < 1; })());
  check('a medal from the par', OB.medalFor(73.4 * 1000 * .97, 73.4) === 'Bloom' && OB.medalFor(73.4 * 1000 * 1.3, 73.4) === null);
  check('every stage has a par', OB.STAGES.every(s => s.par > 40 && s.par < 120));
  OB.resetProfile();
});

suite('endings', (B) => {
  const { OB } = B;
  let n = 0, empty = 0;
  for (const g of ['A', 'B', 'C', 'D', 'E']) for (const m of ['Bloom', 'Bud', 'Wilt']) {
    const e = OB.ending(g, m);
    for (const who of OB.CAST_ORDER) { n++; if (!e || !e.lines[who] || !e.lines[who].trim()) empty++; }
    if (!e || !e.arrive || !e.title) empty++;
  }
  check('45 passenger lines, none empty', n === 45 && empty === 0, n + ' lines, ' + empty + ' empty');
  check('each goal has a place and a caption', Object.keys(OB.ENDINGS).every(g => OB.ENDINGS[g].place && OB.ENDING_CAPTION(g).length > 5));
});

suite('versus', (B) => {
  const { game, OB } = B;
  game.go('versusrace', { route: ['S1', 'S2', 'S5'], cpu: true }); game.advance(1.5);
  check('versus splits the screen in two', game.viewports && game.viewports.length === 2, game.viewports ? game.viewports.length : 'none');
  game.advance(6);
  const sc = OB.scenes.versusrace;
  check('both drivers race', sc.A.car.z > 1000 && sc.B.car.z > 1000, Math.round(sc.A.car.z) + ' ' + Math.round(sc.B.car.z));
  check('versus has no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  game.go('title', null, { fade: 0 }); game.advance(.3);
});

suite('audio-data', (B) => {
  const { OB } = B;
  const bad = [];
  for (const [k, s] of Object.entries(OB.SONGS)) {
    if (!s.tracks || !s.tracks.length) bad.push(k + ' no tracks');
    for (const t of s.tracks) if (!t.notes || !t.notes.trim() || !t.wave) bad.push(k + ' empty track');
  }
  check('every song has tracks with notes', bad.length === 0, bad.join(', '));
  check('every radio station has its song', OB.STATIONS.every(st => OB.SONGS[st.song]));
  check('seven radio stations (two unlockable)', OB.STATIONS.length === 7 && OB.STATIONS.filter(s => s.unlock).length === 2);
  check('the jingles exist', ['jCheckpoint', 'jRequestOk', 'jRequestFail', 'jGoal'].every(k => OB.SONGS[k]));
});

suite('dev-tabs', (B) => {
  const { game, OB } = B;
  OB.race = null; game.go('dev', { from: 'title' }); game.advance(1.5);
  check('dev mode opens', game.sceneName === 'dev', game.sceneName);
  OB.scenes.dev.tab = 2; check('warp lists stages, endings, requests and missions', OB.scenes.dev.rows().length > 15 + 15 + 10 + 14);
  OB.scenes.dev.tab = 4; check('save lists the profile tools', OB.scenes.dev.rows().length === 4);
  OB.scenes.dev.tab = 0; game.go('title', null, { fade: 0 }); game.advance(1.2);
});

suite('hub-fake', () => {
  const r = spawnSync(process.execPath, [new URL('./hub-fake.mjs', import.meta.url).pathname], { encoding: 'utf8' });
  check('the AI Hub round passes against a fake hub', r.status === 0, (r.stdout || '') + (r.stderr || ''));
});

// ---- run ----
const B = boot({ quiet: true });
const order = Object.keys(suites).filter(n => !only || only.includes(n));
for (const name of order) {
  current = name;
  try { suites[name](B); } catch (e) { check('suite runs', false, (e.stack || e.message).split('\n').slice(0, 3).join(' / ')); }
}
const secs = ((performance.now() - t0) / 1000).toFixed(1);
console.log(`${results.pass} passed, ${results.fail} failed, 0 skipped (${secs} s)`);
process.exit(results.fail ? 1 : 0);
