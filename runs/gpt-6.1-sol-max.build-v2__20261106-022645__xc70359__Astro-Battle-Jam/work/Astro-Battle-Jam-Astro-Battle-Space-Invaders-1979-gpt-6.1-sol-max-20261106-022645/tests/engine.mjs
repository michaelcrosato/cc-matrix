import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const warnings = [], failures = [], evidence = []; let count = 0;
function load() {
  const ctx = { console: { log() {}, warn: s => warnings.push(s), error: s => warnings.push(s) }, TextEncoder, location: { hash: '', pathname: '/test' } };
  vm.createContext(ctx);
  const f = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const scripts = [...f.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  for (let i = 0; i < scripts.length; i++) vm.runInContext(scripts[i], ctx, { filename: 'export-script-' + i });
  return ctx.__game;
}
function test(name, fn) { count++; try { fn(); } catch (e) { failures.push({ name, error: e.stack }); } }
const C = load(), { game, app, A } = C;
const advance = (n = .1, draw = false) => game.advance(n, { draw });
const press = action => { game.input.tap(action); advance(.1); };
advance(.1, true);
test('Actual export embeds pristine Hub first, then full pinned engine and game', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const first = html.match(/<meta charset="utf-8"><script>\n([\s\S]*?)<\/script>/)[1];
  assert.equal(first, fs.readFileSync(new URL('../vendor/hub/session.js', import.meta.url), 'utf8'));
  assert(html.includes('hub:session-players" content="1-2"')); assert.equal(C.game.view.id, 'overhead');
  const engine = fs.readFileSync(new URL('../vendor/engine/my-3d2dge.js', import.meta.url));
  evidence.push({ engineSHA256: crypto.createHash('sha256').update(engine).digest('hex'), hubSHA256: crypto.createHash('sha256').update(first).digest('hex') });
});
test('Title geometry exists before any draw and confirm is debounced', () => {
  assert(app.rows.length === 6); game.input.hold('confirm'); advance(.5); assert.equal(app.screen, 'lobby'); advance(.5); assert.equal(app.screen, 'lobby'); game.input.hold('confirm', false); advance(.05);
});
test('Keyboard menu path goes from solo lobby through controls into normal play', () => { press('down'); press('confirm'); assert.equal(app.screen, 'controls'); press('confirm'); assert.equal(app.screen, 'play'); assert.equal(app.sim.s.assisted, false); });
test('Native fixed update drives an ordinary standard campaign to victory', () => {
  let loops = 0, encounters = new Set();
  while (app.screen === 'play' && loops++ < 40000) {
    const s = app.sim.s; game.debug.command(0, A.pilot(s, 0));
    const scene = s.encounter + ':' + (s.boss?.phase || 0);
    const first = !encounters.has(scene); encounters.add(scene); advance(1 / 30, first);
  }
  assert.equal(app.sim.s.phase, 'victory'); assert.equal(app.screen, 'results'); assert.equal(app.sim.s.assisted, false); assert.equal(app.sim.s.dev.invulnerable, false); assert.equal(encounters.size, 8); assert.equal(game.errors.length, 0, JSON.stringify(game.errors)); evidence.push({ nativeCampaignSeconds: app.sim.s.tick / 120, score: app.sim.s.score, encounters: [...encounters] });
});
test('Native simultaneous local co-op completes the full campaign with ordinary commands', () => {
  const local = load(), g = local.game, q = local.app;
  g.advance(.1); g.input.tap('down'); g.advance(.1); g.input.tap('confirm'); g.advance(.1);
  assert.equal(q.screen, 'lobby'); assert.equal(q.seats, 2);
  g.addPlayer({ keys: 'right' });
  g.input.tap('down'); g.advance(.1); g.input.tap('confirm'); g.advance(.1); assert.equal(q.screen, 'controls');
  g.input.tap('confirm'); g.advance(.1); assert.equal(q.screen, 'play'); assert.equal(q.sim.s.reserve, 4);
  let loops = 0;
  while (q.screen === 'play' && loops++ < 40000) {
    for (const player of q.sim.s.ships) g.debug.command(player.id, local.A.pilot(q.sim.s, player.id));
    g.advance(1 / 30, { draw: false });
  }
  assert.equal(q.sim.s.phase, 'victory'); assert.equal(q.sim.s.ships.length, 2); assert(q.sim.s.ships.every(p => p.score > 0));
  assert.equal(q.sim.s.assisted, false); assert.equal(q.sim.s.dev.invulnerable, false); assert.equal(q.sim.s.stats.cleared.length, 6); assert.equal(g.errors.length, 0);
  evidence.push({ nativeCoopSeconds: q.sim.s.tick / 120, score: q.sim.s.score, contributions: q.sim.s.ships.map(p => p.score), deaths: q.sim.s.stats.deaths, repairs: q.sim.s.stats.repairs });
});
test('Results support immediate replay and reset run ownership', () => { app.timeScale = 0; app.diagnostics = true; press('confirm'); assert.equal(app.screen, 'play'); assert.equal(app.sim.s.encounter, 0); assert.equal(app.sim.s.assisted, false); assert.equal(app.timeScale, 1); assert.equal(app.diagnostics, false); assert.equal(app.sim.s.score, 0); assert.equal(app.sim.s.reserve, 2); });
test('Pause freezes combat but menus remain controllable', () => { press('pause'); assert.equal(app.screen, 'pause'); const tick = app.sim.s.tick; advance(.5); assert.equal(app.sim.s.tick, tick); press('down'); assert.equal(app.focus, 1); press('cancel'); assert.equal(app.screen, 'play'); });
test('Every developer screen and native boss phase draw without errors', () => {
  for (const name of ['pause', 'dev', 'encounters', 'resources', 'time', 'state', 'seed', 'balance0', 'balance1', 'balance2', 'settings', 'sound', 'comfort', 'records', 'about']) { game.debug.show(name); advance(.1, true); assert(app.rows.length > 0); }
  for (let n = 0; n < 7; n++) { app.sim.startEncounter(n); app.screen = 'play'; advance(.1, true); }
  app.sim.startEncounter(6, 2); advance(.1, true); assert.equal(game.errors.length, 0, JSON.stringify(game.errors));
});
test('Every required source and feedback answer has a paged credits destination', () => {
  game.debug.show('about'); const pages = game.debug.aboutPages(); const report = app.report;
  assert(pages.length >= 1 + Object.keys(report.sourceInformation).length + 4 + 6 + 4);
  for (let i = 0; i < pages.length; i++) { app.aboutPage = i; advance(.01, true); assert(pages[i].body); }
  assert.equal(report.sourceInformation.usage, 'added on import');
});
test('Attract starts at ten seconds and loops through all five scenes without persistent writes', () => {
  game.debug.title(); const records = JSON.stringify(app.records), seed = app.seed;
  advance(9.9); assert.equal(app.screen, 'title'); advance(.15); assert.equal(app.screen, 'attract');
  const scenes = new Set(); for (let i = 0; i < 700; i++) { advance(.1, i % 130 === 0); scenes.add(app.demoScene); }
  assert.equal(scenes.size, 5); assert.equal(JSON.stringify(app.records), records); assert.equal(app.seed, seed); assert.equal(game.errors.length, 0);
});
test('Attract keyboard wake is consumed, title state is clean and next run is ordinary', () => { press('confirm'); assert.equal(app.screen, 'title'); assert.equal(app.sim, null); advance(.15); assert.equal(app.screen, 'title'); game.debug.start(); assert.equal(app.sim.s.score, 0); assert.equal(app.sim.s.tick, 0); assert.equal(app.sim.s.assisted, false); });
test('Music defaults and resets to exactly 10%, independent of stored preference', () => { game.settings.set('music', .7); assert.equal(game.settings.music, .7); game.settings.reset('Sound'); assert.equal(game.settings.music, .1); });
test('Interview and catalogue have the exact required shape and allowed values', () => {
  const r = JSON.parse(fs.readFileSync(new URL('../../exit-interview.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(r), ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub']);
  assert.equal(r.testingFeedback.length, 4); assert.equal(r.engineFeedback.length, 6); assert.equal(r.promptFeedback.length, 4); assert.equal(Object.keys(r.sourceInformation).length, 15);
  assert.equal(r.aiHub.name, A.TITLE); assert.equal(r.aiHub.genre, 'Shooter'); assert.equal(r.aiHub.type, 'Game'); assert(r.aiHub.tags.length >= 3 && r.aiHub.tags.length <= 6); assert(r.aiHub.tags.every(t => t === t.toLowerCase()));
});
test('Native headless draw/update contain no runtime errors or engine warnings', () => { assert.equal(game.errors.length, 0); assert.equal(warnings.length, 0, warnings.join('\n')); });
fs.writeFileSync(new URL('../evidence/engine-tests.json', import.meta.url), JSON.stringify({ count, failures, evidence }, null, 2));
for (const f of failures) console.error('FAIL ' + f.name + ': ' + f.error);
console.log(JSON.stringify({ suite: 'engine', count, failed: failures.length })); process.exitCode = failures.length ? 1 : 0;
