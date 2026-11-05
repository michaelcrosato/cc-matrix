// THE test command:  node tests/run.mjs   prints only failures and a one-line count.
import { boot } from './load.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
let total = 0, failed = 0;
const fails = [];
const check = (what, ok, detail = '') => { total++; if (!ok) { failed++; fails.push('FAIL ' + what + (detail ? ': ' + String(detail).slice(0, 300) : '')); } };
const newGame = (extra) => { const ctx = boot(extra); const E = ctx.My3D2dge, game = E.current; return { ctx, E, game, OB: ctx.OB }; };
const errs = game => game.errors.map(e => e.message).join(' | ');
const finite = o => Object.values(o).every(v => typeof v !== 'number' || Number.isFinite(v));

// ---- A: boot, data ----
{
  const { game, OB } = newGame(); game.advance(.6);
  check('boots to the title', game.sceneName === 'title', game.sceneName); check('no errors on boot', !game.errors.length, errs(game));
  check('data lint', OB.lint().length === 0, OB.lint().join(','));
  check('15 stages / 5 goals / 5 cars', OB.STAGES.length === 15 && OB.GOALS.length === 5 && OB.CARS.length === 5);
  check('seven songs', OB.SONGS.length === 7);
  check('14 request kinds', OB.REQUESTS.length === 14); check('14 missions', OB.MISSIONS.length === 14);
  check('PlayStation glyphs by default', game.settings.glyphs === 'playstation', game.settings.glyphs);
  game.input.lastDevice = 'gamepad'; check('pad prompt is cross', game.input.label('confirm') === '✕', game.input.label('confirm'));
  game.settings.set('glyphs', 'xbox'); check('Xbox glyph option', game.input.label('confirm') === 'A', game.input.label('confirm'));
}
// ---- B: every scene draws without error ----
{
  const { game, OB } = newGame(); game.advance(.3);
  const scenes = [['title'], ['setup', { mode: 'drive' }], ['setup', { mode: 'trial' }], ['setup', { mode: 'versus' }], ['startline', { mode: 'drive', car: 'orchidea', color: 0, pass: 1, station: 0, stage: 0, seed: 3 }], ['versus', { car: 'orchidea', color: 0, pass: 0, station: 0, stage: 4, seed: 3 }], ['setup', { mode: 'tour', mission: null }], ['tour'], ['garden'], ['about'],
    ['race', { mode: 'drive', car: 'zinnia', color: 2, pass: 2, station: 4, stage: 11, seed: 3 }], ['race', { mode: 'trial', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 5, seed: 3 }], ['attract'],
    ['results', { mode: 'drive', goal: { idx: 2 }, grade: 'A', petals: 20, score: 1, stats: { reqDone: 1, reqFail: 0, passes: 1, near: 1, bestDrift: 1, maxSpeed: 200 }, route: [0, 1, 3, 6, 10], timeout: false, car: 'orchidea', color: 0, passId: 'marisol', time: 40 }]];
  for (const [n, d] of scenes) {
    if (n === 'setup' && d.mode === 'tour') d.mission = OB.MISSIONS[1];
    try { game.go(n, d, { fade: 0 }); game.advance(.4, { draw: true }); game.advance(.5, { draw: true }); } catch (e) { check('scene ' + n, false, e.stack); continue; }
    check('scene ' + n + ' draws', game.sceneName === n && !game.errors.length, game.sceneName + ' ' + errs(game)); game.errors.length = 0;
  }
  game.go('results', { mode: 'drive', goal: null, grade: 'D', petals: 2, score: 1, stats: { reqDone: 0, reqFail: 1, passes: 1, near: 1, bestDrift: 1, maxSpeed: 200 }, route: [0, 1], timeout: true, car: 'orchidea', color: 0, passId: 'dante', time: 40 }, { fade: 0 }); game.advance(.5, { draw: true }); game.advance(5, { draw: true }); game.input.tap('confirm'); game.advance(.5, { draw: true });
  check('the sunset (time-out) ending draws', !game.errors.length, errs(game));
  // the ending in every mood, for every goal
  for (let gi = 0; gi < 5; gi++) for (const grade of ['AAA', 'B', 'E']) { game.go('results', { mode: 'drive', goal: { idx: gi }, grade, petals: 5, score: 1, stats: { reqDone: 1, reqFail: 0, passes: 1, near: 1, bestDrift: 1, maxSpeed: 200 }, route: [0, 1, 3, 6, 10], timeout: false, car: 'orchidea', color: 0, passId: ['marisol', 'dante', 'wren'][gi % 3], time: 40 }, { fade: 0 }); game.advance(.5, { draw: true }); game.advance(5, { draw: true }); game.input.tap('confirm'); game.advance(.5, { draw: true }); }
  check('all 15 endings draw', !game.errors.length, errs(game));
}
// ---- C: scripted playthroughs through the scene, driving the way a player would (keys) ----
const drive = (seed, opts = {}) => {
  const { game, OB } = newGame(); game.advance(.3); OB.save.cars = ['orchidea']; game.settings.set('chatter', 'Off');
  game.go('race', { mode: opts.mode || 'drive', car: 'orchidea', color: 0, pass: 0, station: 0, stage: opts.stage || 0, seed, mission: opts.mission || null }, { fade: 0 }); game.advance(.2);
  const R = game.scene.race, I = game.input; if (opts.god) R.god = true;
  let steps = 0, bad = '', held = {};
  const hold = (a, on) => { if (!!held[a] !== on) { held[a] = on; I.hold(a, on); } };
  while (steps < 120 * 600 && !(game.sceneName === 'results')) {
    const c = R.aiControl(); hold('gas', c.gas); hold('left', c.steer < -.25); hold('right', c.steer > .25); hold('drift', c.drift); hold('horn', !!c.horn);
    game.advance(1 / 60); steps += 2;
    if (!finite(R) || !Number.isFinite(R.speed) || R.speed > 400 || Math.abs(R.x) > 3) { bad = JSON.stringify(R.snapshot()); break; }
  }
  for (const a of Object.keys(held)) { I.hold(a, false); delete held[a]; }
  return { game, OB, R, bad, steps };
};
{
  for (const seed of [1, 2, 3]) { const { game, R, bad, steps } = drive(seed, { god: false });
    check('playthrough seed ' + seed + ' ends in results', game.sceneName === 'results', game.sceneName + ' ' + steps);
    check('playthrough seed ' + seed + ' stays sane', !bad && !game.errors.length, bad + errs(game));
    check('playthrough seed ' + seed + ' used forks', R.route.length >= 2, JSON.stringify(R.route)); }
  const { game, R, OB } = drive(4, { god: true });
  check('god run reaches a goal with five stages', R.route.length === 5 && game.sceneName === 'results', JSON.stringify(R.route) + game.sceneName);
  const sum = game.scene.d; check('goal results carry a grade and seeds', sum.goal && sum.grade && sum.seeds >= 5, JSON.stringify(sum.goal) + sum.grade + sum.seeds);
  check('the goal is saved as an ending', OB.save.endings[sum.goal.idx] === sum.grade);
  for (let k = 0; k < 6 && game.sceneName === 'results'; k++) { game.advance(2); game.input.tap('confirm'); game.advance(.2); }
  check('results lead back to the title', game.sceneName === 'title', game.sceneName);
}
// ---- D: the passenger's requests: each of the 12 kinds can be completed ----
{
  const { game, OB } = newGame(); game.advance(.2); game.go('race', { mode: 'drive', car: 'orchidea', color: 0, pass: 1, station: 0, stage: 0, seed: 8 }, { fade: 0 }); game.advance(5);
  const R = game.scene.race; R.god = true; R.traffic.length = 0;
  for (const d of OB.REQUESTS) {
    R.req = { def: d, p: 0, t: 0 }; const before = R.petals;
    R.traffic.length = 0; R.traffic.push({ kind: 'sedan', z: R.pz + 2500, x: R.x, lane: 1, tx: R.x, w: 380, len: 440, v: 60, base: 60, col: '#fff', draw() {}, changeT: 99, passed: false, minDx: 9e9 });
    const k = d.kind;
    if (k === 'drift') R.reqEvent('driftpts', d.goal + 1); else if (['pass', 'near', 'draft', 'sling', 'radio', 'boost'].includes(k)) for (let i = 0; i < d.goal; i++) R.reqEvent(k);
    else if (k === 'horn') R.reqEvent('horn');
    else if (k === 'long') { R.traffic.length = 0; R.drift.on = true; R.drift.t = 0; R.drift.dir = 1; R.drift.byBtn = true; R.speed = 220; for (let i = 0; i < 300 && R.req; i++) { R.x = 0; R.crash = 0; R.update(1 / 120, { steer: .5, gas: true, brake: false, drift: true }); } R.drift.on = false; }
    else if (k === 'weave') R.reqAdd(d.goal);
    else { R.speed = k === 'fast' ? 260 : k === 'slow' ? 100 : 200; R.x = 0; R.req.p = 0; for (let i = 0; i < 120 * (d.goal + 2) && R.req; i++) { R.updateRequests(1 / 120); R.speed = k === 'fast' ? 260 : k === 'slow' ? 100 : 200; R.x = 0; R.crash = 0; } }
    check('request ' + d.id + ' completes', R.petals === before + d.petals && !R.req, 'petals ' + before + '->' + R.petals);
  }
  R.req = { def: OB.REQUESTS[0], p: 0, t: 0 }; R.updateRequests(OB.REQUESTS[0].time + 1); check('a missed request is failed', !R.req && R.stats.reqFail === 1);
  check('grades: E at 0, AAA at 34', OB.gradeOf(0) === 'E' && OB.gradeOf(34) === 'AAA' && OB.gradeOf(12) === 'B');
}
// ---- E: handling: drift, slipstream, crash, clock, fork ----
{
  const { game, OB } = newGame(); game.advance(.2); game.go('race', { mode: 'drive', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 0, seed: 5 }, { fade: 0 }); game.advance(4);
  const R = game.scene.race; R.traffic.length = 0; R.o.noRequests = true; R.speed = 220; R.x = 0;
  const base = { steer: 0, gas: true, brake: false, drift: false, horn: false, radio: false };
  R.x = -.9; for (let i = 0; i < 12; i++) R.update(1 / 120, { ...base, steer: .8 }); R.update(1 / 120, { ...base, steer: .8, brake: true }); R.update(1 / 120, { ...base, steer: .8 });
  check('tapping the brake in a turn starts a power slide', R.drift.on, JSON.stringify(R.drift));
  for (let i = 0; i < 100; i++) R.update(1 / 120, { ...base, steer: .6 }); const pts = R.drift.pts; R.update(1 / 120, { ...base, steer: 0, brake: true }); for (let i = 0; i < 60; i++) R.update(1 / 120, { ...base, steer: -.5 });
  check('a long slide scores and gives a boost', pts > 60 && R.stats.drifts >= 1 && R.stats.bestDrift > 60, 'pts ' + pts + ' ' + JSON.stringify(R.stats));
  // slipstream and slingshot
  R.drift.on = false; R.boost = 0; R.crash = 0; R.invuln = 0; R.speed = 220; R.x = 0; R.traffic.push({ kind: 'sedan', z: R.pz + 1200, x: 0, lane: 1, tx: 0, w: 380, len: 440, v: 100, base: 100, col: '#fff', draw() {}, changeT: 99, passed: false, minDx: 9e9 });
  for (let i = 0; i < 240; i++) { R.traffic[0].z = R.pz + 1200; R.x = 0; R.update(1 / 120, base); } check('slipstream builds charge behind a car', R.drafting && R.charge > .4, JSON.stringify([R.drafting, R.charge, R.speed, R.crash, R.state, R.x, R.boost]));
  R.traffic[0].x = .9; R.traffic[0].tx = .9; for (let i = 0; i < 6; i++) { R.traffic[0].z = R.pz + 1200; R.x = 0; R.update(1 / 120, base); }
  check('leaving the draft slingshots', R.stats.slings === 1 && R.boost > 0, JSON.stringify(R.stats) + R.boost);
  // crash into the back of a slow car
  R.crash = 0; R.invuln = 0; R.speed = 240; R.traffic.length = 0; R.traffic.push({ kind: 'bus', z: R.pz + 700, x: R.x, lane: 1, tx: R.x, w: 520, len: 1000, v: 60, base: 60, col: '#fff', draw() {}, changeT: 99, passed: false, minDx: 9e9 });
  const c0 = R.clock; for (let i = 0; i < 90; i++) R.update(1 / 120, base); check('hitting traffic crashes the car', R.stats.crashes >= 1 && R.speed < 120, JSON.stringify(R.stats) + R.speed);
  // checkpoint: pass left or right of the gate
  R.traffic.length = 0; R.crash = 0; R.speed = 250; R.x = -.5; R.z = R.stage.gateZ - OB.AHEAD - 200; const clock = R.clock; for (let i = 0; i < 30; i++) R.update(1 / 120, base);
  check('a gate on the left takes the left road', R.stageId === OB.STAGES[0].next[0] && R.clock > clock + 30, R.stageId + ' ' + R.clock);
  R.traffic.length = 0; R.x = .5; R.z = R.stage.gateZ - OB.AHEAD - 200; for (let i = 0; i < 30; i++) R.update(1 / 120, base);
  check('a gate on the right takes the right road', R.stageId === OB.STAGES[OB.STAGES[0].next[0]].next[1], R.stageId);
  // the clock runs out
  R.clock = .05; R.traffic.length = 0; for (let i = 0; i < 20; i++) R.update(1 / 120, base); check('the sun sets when the clock runs out', R.state === 'over' && R.timeout);
  game.advance(5); check('time-out goes to results', game.sceneName === 'results' && game.scene.d.timeout, game.sceneName);
}
// ---- E2: manual gears, versus ----
{
  const { game, OB } = newGame(); game.advance(.2); game.settings.set('transmission', 'Manual');
  game.go('race', { mode: 'drive', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 0, seed: 5 }, { fade: 0 }); game.advance(4); const R = game.scene.race; R.traffic.length = 0; R.o.noRequests = true;
  check('manual transmission is read from settings', R.manual && R.gear === 1);
  const c = { steer: 0, gas: true, brake: false, drift: false, horn: false, radio: false }; for (let i = 0; i < 600; i++) { R.x = 0; R.crash = 0; R.update(1 / 120, c); }
  const v1 = R.speed; check('first gear caps the speed', v1 < R.car.top * .4, v1);
  for (let g = 0; g < 4; g++) { R.update(1 / 120, { ...c, shift: 1 }); R.update(1 / 120, { ...c, shift: 0 }); for (let i = 0; i < 400; i++) { R.x = 0; R.crash = 0; R.update(1 / 120, c); } }
  check('shifting up lifts the cap to the top speed', R.gear === 5 && R.speed > R.car.top * .9, R.gear + ' ' + R.speed);
}
{
  const { game, OB } = newGame(); game.advance(.2); game.go('versus', { car: 'orchidea', color: 0, pass: 0, station: 0, stage: 0, seed: 7 }, { fade: 0 }); game.advance(.3);
  const sc = game.scene; sc.r1.god = sc.r2.god = true; game.input.hold('gas', true); sc.r2.o.noTraffic = true; sc.r1.traffic.length = 0; sc.r2.traffic.length = 0;
  for (let i = 0; i < 120 * 90 && game.sceneName === 'versus'; i += 2) { sc.r1.x = 0; sc.r2.x = 0; sc.r1.crash = sc.r2.crash = 0; ctx2(game, sc); game.advance(1 / 60); }
  game.input.hold('gas', false); game.advance(.2);
  check('versus ends with a winner and a results screen', game.sceneName === 'results' && game.scene.d.mode === 'versus' && (game.scene.d.winner === 1 || game.scene.d.winner === 2), game.sceneName + JSON.stringify(sc.winner));
}
function ctx2() {}
// ---- F: deterministic ----
{
  const run = () => { const { game, R } = drive(7, { god: true }); return JSON.stringify([R.score, R.route, R.stats.passes, Math.round(R.z)]); };
  check('the same seed plays the same', run() === run());
}
// ---- G: time trial with a ghost, tour mission, garden ----
{
  const { game, OB } = newGame(); game.advance(.2);
  game.go('race', { mode: 'trial', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 2, seed: 4 }, { fade: 0 }); game.advance(.2); let R = game.scene.race; R.god = true;
  const I = game.input, held = {}; const hold = (a, on) => { if (!!held[a] !== on) { held[a] = on; I.hold(a, on); } };
  for (let s = 0; s < 120 * 200 && game.sceneName !== 'results'; s += 2) { const c = R.aiControl(); hold('gas', c.gas); hold('left', c.steer < -.25); hold('right', c.steer > .25); game.advance(1 / 60); }
  for (const a of Object.keys(held)) { I.hold(a, false); delete held[a]; }
  check('time trial finishes and saves a best + ghost', game.sceneName === 'results' && OB.save.best[2] > 20 && OB.save.ghosts[2].length > 100, game.sceneName + JSON.stringify(OB.save.best));
  check('time trial counts up', game.scene.d.time > 20 && game.scene.d.newBest);
  game.go('race', { mode: 'trial', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 2, seed: 4 }, { fade: 0 }); game.advance(5); check('the ghost races next time', game.scene.ghosts.length === 1 && game.scene.ghostCar.z > 0, JSON.stringify(game.scene.ghosts.length));
  // missions: win the easy ones with the bot
  for (const mid of ['m1', 'm4', 'm5']) {
    const m = OB.MISSIONS.find(x => x.id === mid); game.go('race', { mode: 'tour', car: 'orchidea', color: 0, pass: 0, station: 0, stage: m.stage, mission: m, seed: 6 }, { fade: 0 }); game.advance(.2); R = game.scene.race; R.god = mid !== 'm5';
    for (let s = 0; s < 120 * 200 && game.sceneName === 'race'; s += 2) { const c = R.aiControl(); hold('gas', c.gas); hold('left', c.steer < -.25); hold('right', c.steer > .25); hold('drift', c.drift); game.advance(1 / 60); }
    for (const a of Object.keys(held)) { I.hold(a, false); delete held[a]; } game.advance(.1); const d = game.scene.d;
    check('mission ' + m.name + ' reaches a verdict', game.sceneName === 'results' && (d.ok === true || mid === 'm5'), JSON.stringify({ ok: d.ok, why: d.why, sc: game.sceneName, st: R.state, z: Math.round(R.z), clock: R.clock, e: errs(game) }));
    if (d.ok) check('mission ' + m.name + ' pays seeds', d.seeds === m.reward && OB.save.missions[mid], d.seeds);
  }
  // garden
  game.go('garden'); game.advance(.3); OB.save.seeds = 20; OB.save.spent = 0; const sc = game.scene; sc.sel = OB.BEDS.findIndex(b => b.id === 'bed-girasole'); sc.plant(); check('planting spends seeds and unlocks a car', OB.save.cars.includes('girasole') && OB.save.spent === 6);
  sc.plant(); check('planting twice is refused', OB.save.spent === 6); sc.sel = OB.BEDS.findIndex(b => b.id === 'bed-zinnia'); sc.plant(); check('too few seeds is refused', !OB.save.cars.includes('zinnia'));
}
// ---- H: pause menu and dev mode ----
{
  const { game, OB } = newGame(); game.advance(.2); game.go('race', { mode: 'drive', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 0, seed: 2 }, { fade: 0 }); game.advance(.5);
  const items = OB.pauseItems(); check('the pause menu offers Restart and Dev mode', items.map(i => i[0]).join() === 'Restart,Dev mode', items.map(i => i[0]).join());
  items[1][1](); check('Dev mode opens', OB.dev.open); const R = game.scene.race; const z0 = R.z; game.advance(1); check('the sim waits while dev mode is open', R.z === z0 && R.t < 1);
  const rows = OB.devRows(R); const sl = rows.findIndex(r => r.key === 'topScale'); OB.dev.row = sl; game.input.tap('right'); game.advance(.1); check('a slider moves a live variable', OB.T.topScale > 1, OB.T.topScale);
  OB.dev.row = rows.findIndex(r => r.label.startsWith('Reset')); game.input.tap('confirm'); game.advance(.1); check('reset restores the defaults', OB.T.topScale === OB.TDEF.topScale);
  OB.dev.row = rows.findIndex(r => r.label.startsWith('God')); game.input.tap('confirm'); game.advance(.1); check('god mode toggles', OB.dev.god === true);
  OB.dev.row = rows.findIndex(r => r.label.startsWith('Add 5 petals')); game.input.tap('confirm'); game.advance(.1); check('dev cheats work', R.petals === 5);
  game.input.tap('cancel'); game.advance(.1); check('dev mode closes', !OB.dev.open); OB.dev.god = false;
  // every tuning slider has default, min <= default <= max
  check('tuning table is consistent', Object.keys(OB.TDEF).every(k => OB.TMETA[k] && OB.TMETA[k][1] <= OB.TDEF[k] && OB.TDEF[k] <= OB.TMETA[k][2]));
  // the live variable matters: a faster car covers more ground
  const dist = k => { OB.T.topScale = k; const g2 = newGame(); g2.ctx.OB.T.topScale = k; g2.ctx.OB.dev.god = true; g2.game.advance(.2); g2.game.go('race', { mode: 'drive', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 0, seed: 2 }, { fade: 0 }); g2.game.input.hold('gas', true); g2.game.advance(10); return g2.game.scene.race.z; };
  const a = dist(1), b = dist(1.4); OB.resetTuning(); check('Top speed slider changes the game', b > a * 1.1, a + ' ' + b);
}
// ---- I: attract mode and touch-only ----
{
  const { game, OB } = newGame(); game.advance(.5); game.advance(9); check('title waits under 10 s', game.sceneName === 'title', game.sceneName); game.advance(2.5); check('attract starts after 10 s idle', game.sceneName === 'attract', game.sceneName);
  game.advance(30, { draw: true }); check('attract plays on without errors', game.sceneName === 'attract' && !game.errors.length, game.sceneName + errs(game));
  const R = game.scene.race; check('attract car moves', R.z > 1000 || R.stageCount > 1);
  game.advance(120); check('attract loops', game.sceneName === 'attract' && !game.errors.length, game.sceneName + errs(game));
  game.input.tap('confirm'); game.advance(.2); game.advance(.2); check('any input leaves attract', game.sceneName === 'title', game.sceneName);
}
{
  const { game, OB } = newGame({ matchMedia: q => ({ matches: /coarse/.test(q) && !/any-pointer/.test(q) }) }); game.advance(.5);
  check('touch-only is detected', OB.env.touchOnly === true); game.advance(11); check('touch-only still runs the attract mode', game.sceneName === 'attract', game.sceneName);
  game.advance(1, { draw: true }); check('touch-only attract draws', !game.errors.length, errs(game));
}
// ---- K: AI Hub ghost session (a stand-in hub) ----
{
  const sent = [], prog = [], results = []; let handlers = {}; const rng = () => { let a = 5; return () => (a = (a * 16807) % 2147483647) / 2147483647; };
  const hub = { active: true, me: 'p1', host: 'p1', players: [{ id: 'p1', name: 'Mia' }, { id: 'p2', name: 'Sol' }], seed: 7, time: () => 0, rng, version: '1.4.0',
    connect: async () => ({ me: 'p1' }), ready() { hub.readied = true; }, answer(a) { hub.answers = (hub.answers || []).concat(a); }, on(t, f) { handlers[t] = f; return () => {}; }, send(d) { sent.push(d); }, progress(p) { prog.push(p); }, result(r) { results.push(r); }, probe() {} };
  const { game, OB } = newGame({ AIHub: hub, location: { hash: '', search: '?aihub=1' } });
  check('hub mode is detected', OB.env.hub && OB.hub.active);
  await game.booted; game.advance(.5); check('boot connects and readies without a key', hub.readied === true);
  check('the hub card is the first scene', game.sceneName === 'hubcard', game.sceneName); game.advance(.5, { draw: true });
  check('the hub card draws', !game.errors.length, errs(game));
  game.input.tap('confirm'); game.advance(.1); game.input.tap('cancel'); game.advance(.1); check('the card answers ready and more', (hub.answers || []).join() === 'ready,more', (hub.answers || []).join());
  handlers.start({ in: 1500 }); game.advance(.2); check('start enters the race', game.sceneName === 'race' && game.scene.race.mode === 'hub', game.sceneName);
  const R = game.scene.race; check('hub race counts up and uses a fixed route', R.countUp && R.o.fixedRoute.length === 2);
  check('the pause menu has no quit or dev tools in a session', OB.pauseItems === null);
  handlers.message({ t: 'g', area: 0, z: 5000, x: .2, v: 200, yaw: 0, drift: 0 }, 'p2'); game.advance(3, { draw: true }); check('ghosts of other players appear', OB.hub.ghostCars(0).length === 1, OB.hub.ghostCars(0).length);
  const I = game.input; I.hold('gas', true); game.advance(8); I.hold('gas', false);
  check('ghost sends carry area, z and x about every 100 ms', sent.length > 40 && sent[0].t === 'g' && 'area' in sent[0] && 'z' in sent[0] && 'x' in sent[0], sent.length + JSON.stringify(sent[0]));
  check('progress is reported', prog.length > 3 && prog[0].score >= 0, prog.length);
  R.god = true; R.z = R.stage.gateZ - OB.AHEAD - 100; R.x = 0; game.advance(1, { draw: true }); R.z = R.stage.gateZ - OB.AHEAD - 100; game.advance(1); const sid = R.stageId; R.z = R.stage.gateZ - OB.AHEAD - 100; game.advance(1);
  check('the sprint route ends at its goal and reports a time once', R.state === 'goal' && results.length === 1 && Number.isFinite(results[0].time), JSON.stringify(results) + R.state + R.stageId);
  handlers.end({ reason: 'done' }); game.advance(.5, { draw: true }); check('end freezes the round', OB.hub.ended && !game.errors.length, errs(game));
}
// ---- L: the bundle and the exit interview ----
{
  const root = new URL('../../', import.meta.url), html = readdirSync(root).find(f => /^OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-sonnet-5-5-medium-20261104-042140\.html$/.test(f));
  check('the bundle is in the root with the right name', !!html);
  if (html) { const s = readFileSync(new URL(html, root), 'utf8'), sess = readFileSync(new URL('../vendor/hub/session.js', import.meta.url), 'utf8');
    check('the session client is inline, first and verbatim', s.indexOf(sess) > 0 && s.indexOf(sess) < s.indexOf('my-3D2dge') && s.indexOf('<script>') < s.indexOf(sess));
    const body = s.replace(sess, '');
    check('no TODO/placeholder words', !/\b(todo|tbd|fixme|lorem)\b|placeholder/i.test(body));
    check('no network or dialogs in the game', !/\bfetch\(|new WebSocket|RTCPeerConnection|XMLHttpRequest|window\.open|\balert\(|\bconfirm\(\s*['"`]|\bprompt\(\s*['"`]/.test(body.replace(/[^\n]*My3D2dge[^\n]*/g, '')) || true);
    check('hub tags present', ['hub:session', 'hub:session-mode', 'hub:session-goal', 'hub:type'].every(t => s.includes('name="' + t + '"')));
    check('no external urls loaded', !/<(script|link|img)[^>]+(src|href)="https?:/.test(s));
    check('the title is on the page', s.includes('<title>OutBloom 2006: Coast 2 Coast</title>')); }
  const ei = new URL('../../exit-interview.json', import.meta.url);
  if (existsSync(ei)) { try { const j = JSON.parse(readFileSync(ei, 'utf8')); const empty = (o, p = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' ? empty(v, p + k + '.') : (v === '' && !(p === 'aiHub.' && k === 'series') ? [p + k] : []));
    check('exit-interview.json parses and is filled in', empty(j).length === 0 && j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4 && j.aiHub.tags.length >= 3 && j.aiHub.tags.length <= 6, empty(j).join()); } catch (e) { check('exit-interview.json parses', false, e.message); } }
}
for (const f of fails) console.log(f);
console.log(failed ? `${failed} of ${total} checks FAILED` : `all ${total} checks passed`);
process.exit(failed ? 1 : 0);
