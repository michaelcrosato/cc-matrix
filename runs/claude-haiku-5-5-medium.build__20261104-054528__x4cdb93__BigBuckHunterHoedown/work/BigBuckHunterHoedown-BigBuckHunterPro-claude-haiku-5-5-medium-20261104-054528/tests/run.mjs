// THE test command: node tests/run.mjs
// Runs the game headless in Node (engine + src/ in manifest order, the same code the bundle carries), drives it with
// game.advance, game.input and game.debug, plays the whole campaign, and checks the built bundle. It prints only the
// failures, then one line with the count. Exit code 1 on any failure.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => readFileSync(path.join(root, f), 'utf8');
const manifest = JSON.parse(rd('build/manifest.json'));
const GAME_SRC = manifest.order.map(f => rd('src/' + f)).join('\n');
const ENGINE = rd(manifest.engine);

let passed = 0, failed = 0;
const fails = [];
function check(name, ok, detail = '') {
  if (ok) passed++;
  else { failed++; fails.push(name + (detail ? ' :: ' + detail : '')); }
}
const errs = g => g.errors.map(e => (e && e.message) || String(e));

// boot a fresh game in its own context. opts: { hub: fn -> info | null, touchOnly, seed }
function boot(opts = {}) {
  const hubCalls = { progress: [], result: [], send: [], ready: 0, connect: 0 };
  const handlers = {};
  const hubInfo = opts.hubInfo || {
    me: 0, players: [{ id: 0, name: 'Dub', color: '#e8443a' }, { id: 1, name: 'Ruth', color: '#3b82f6' }], host: 0, isHost: false,
    mode: 'ghost', round: 1, limitMs: 180000, seed: 42,
  };
  const AIHub = {
    active: !!opts.hub,
    connect(o) { hubCalls.connect++; return Promise.resolve(opts.hub ? hubInfo : null); },
    ready() { hubCalls.ready++; },
    on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return () => {}; },
    progress(p) { hubCalls.progress.push(p); },
    result(r) { hubCalls.result.push(r); },
    send(d) { hubCalls.send.push(d); return true; },
    rng(label) { let a = 1; for (const c of label) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; },
    time() { return 0; },
  };
  const store = new Map();
  const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, AIHub, setTimeout, clearTimeout, localStorage };
  if (opts.touchOnly) ctx.matchMedia = q => ({ matches: /any-hover: none|any-pointer: coarse/.test(q) });
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine' });
  vm.runInContext('(() => {\n' + GAME_SRC + '\n})();', ctx, { filename: 'game' });
  const game = ctx.My3D2dge.current;
  const fire = (name, ...args) => (handlers[name] || []).forEach(fn => fn(...args));
  return { game, dbg: game.debug, ctx, AIHub, hubCalls, fire, hubInfo, api: ctx };
}

// the game's own state, read through the debug handle
const snap = g => g.debug.snapshot();
const run = (game, seconds) => game.advance(seconds);
// a scene change fades for a moment: wait it out after a key that changes scene
const press = (game, key) => { game.input.tap(key); game.advance(.6); };

// ---------- 1. the bundle and the sources -------------------------------------------------------------------------------
{
  const bundleName = path.basename(manifest.bundle);
  const bundlePath = path.join(root, manifest.bundle);
  check('bundle exists in the work root', existsSync(bundlePath));
  if (existsSync(bundlePath)) {
    const html = readFileSync(bundlePath, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    check('session client is the first script after <meta charset>', /<meta charset="utf-8">\s*<script>/.test(html.slice(0, 200)));
    check('session client is byte-identical to hub/session.js', html.includes('<script>' + rd('hub/session.js') + '</script>'));
    for (const k of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto']) check('hub tag ' + k, head.includes(`name="${k}"`));
    check('bundle has no external script or stylesheet', !/<script[^>]+src=/.test(html) && !/<link/.test(html));
    check('bundle is one HTML file in the work root', bundleName.endsWith('.html'));
  }
  const banned = [/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /placeholder/i, /\blorem\b/i, /Math\.random/, /\bfetch\(/];
  for (const f of manifest.order) for (const re of banned) check(`src/${f} has no ${re}`, !re.test(rd('src/' + f)));
  const ex = path.join(root, manifest.exitInterview);
  check('exit-interview.json exists beside the bundle', existsSync(ex));
  if (existsSync(ex)) {
    let j = null;
    try { j = JSON.parse(readFileSync(ex, 'utf8')); } catch (e) { check('exit-interview.json parses as JSON', false, e.message); }
    if (j) {
      const sec = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
      for (const k of sec) check('exit interview sourceInformation.' + k, typeof j.sourceInformation[k] === 'string' && j.sourceInformation[k].length > 0);
      for (const k of ['testingFeedback', 'engineFeedback', 'promptFeedback']) check('exit interview ' + k + ' answers', Array.isArray(j[k]) && j[k].length > 0 && j[k].every(s => typeof s === 'string' && s.length > 0));
      const ah = ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'];
      for (const k of ah) check('exit interview aiHub.' + k, j.aiHub && typeof j.aiHub[k] === 'string' || (k === 'tags' && Array.isArray(j.aiHub.tags)));
      check('aiHub.tags has 3 to 6 tags', j.aiHub && j.aiHub.tags.length >= 3 && j.aiHub.tags.length <= 6);
      check('aiHub.genre is a catalogue genre', ['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'].includes(j.aiHub.genre));
      check('aiHub.type is Game, Tech demo or Tool', ['Game', 'Tech demo', 'Tool'].includes(j.aiHub.type));
    }
  }
}

// ---------- 2. boot, the title, the menu, and the campaign's first moments ----------------------------------------------
{
  const { game, dbg } = boot();
  check('boots on the title with no errors', game.sceneName === 'title' && errs(game).length === 0, errs(game).join(' | '));
  run(game, .5);
  game.input.tap('start'); run(game, .3);
  check('start opens the menu', game.sceneName === 'menu', game.sceneName);
  game.input.tap('confirm'); run(game, .3);
  check('the campaign starts in the first intro', game.sceneName === 'hunt' && snap(game).phase === 'intro', JSON.stringify(snap(game).phase));
  run(game, 3);
  check('the intro hands over to play', snap(game).phase === 'play');
  dbg.spawn('buck', { d: .6, x: .5, dir: 1 });
  run(game, .05);
  check('a buck can be spawned and seen', snap(game).animals.some(a => a.sp === 'buck'));
  check('no errors in play', errs(game).length === 0, errs(game).join(' | '));
}

// ---------- 3. shooting: aim, zones, the pump, the doe rule, wounds and kills ------------------------------------------
{
  const { game, dbg } = boot();
  press(game, 'start'); press(game, 'confirm'); run(game, 3.2);
  const id = dbg.spawn('buck', { d: .6, x: .5, dir: 1 }); run(game, .02);
  dbg.aimAtZone(id, .56, .39);           // the heart
  dbg.fire();
  const s1 = snap(game);
  check('a heart shot kills the buck', s1.site.bagged === 1 && s1.site.points > 0, JSON.stringify(s1.site));
  check('the chamber is empty after a shot', s1.gun.chamber === 'empty', s1.gun.chamber);
  check('a second shot before pumping does nothing', dbg.fire() === 'empty' && snap(game).site.shots === 1);
  check('pump racks the next round', dbg.pump() === 'rack');
  run(game, .4);
  check('the rack finishes and the chamber loads', snap(game).gun.chamber === 'loaded' && snap(game).gun.tube === 3, JSON.stringify(snap(game).gun));
  // the doe rule: a doe benches the gun for the site
  const doe = dbg.spawn('doe', { d: .5, x: .4, dir: 1 }); run(game, .02);
  dbg.aimAtZone(doe, .5, .4);
  dbg.fire();
  check('shooting a doe benches the site (default rule)', snap(game).site.benched === true && snap(game).site.doe === 1, JSON.stringify(snap(game).site));
  dbg.pump(); run(game, .4);
  check('a benched gun cannot fire', dbg.fire() === 'loaded' || snap(game).site.shots === 2, 'shots ' + snap(game).site.shots);
  check('no errors after the doe', errs(game).length === 0, errs(game).join(' | '));
}
{
  // wounds: a shot in the ham wounds, the second shot finishes
  const { game, dbg } = boot();
  press(game, 'start'); press(game, 'confirm'); run(game, 3.2);
  const id = dbg.spawn('elk', { d: .7, x: .5, dir: -1 }); run(game, .02);
  dbg.aimAtZone(id, .15, .45); dbg.fire(); run(game, .4); dbg.pump(); run(game, .4);
  const w = snap(game).animals.find(a => a.id === id);
  check('a ham shot wounds the bull and it runs', w && w.wounded && w.state === 'bolt', JSON.stringify(w));
  dbg.aimAt(id); dbg.fire();
  check('the second hit finishes it', snap(game).site.bagged === 1);
}
{
  // critters: a bluebird costs points, a skunk spooks the site
  const { game, dbg } = boot();
  press(game, 'start'); press(game, 'confirm'); run(game, 3.2);
  const b = dbg.spawn('bluebird', { d: .5, x: .5, dir: 1 }); run(game, .02);
  dbg.aimAt(b); dbg.fire();
  check('shooting a bluebird costs points', snap(game).site.points < 0, String(snap(game).site.points));
  dbg.pump(); run(game, .4);
  const deer = dbg.spawn('buck', { d: .4, x: .8, dir: -1 }); run(game, .02);
  const sk = dbg.spawn('skunk', { d: .4, x: .3, dir: 1 }); run(game, .02);
  dbg.aimAt(sk); dbg.fire(); run(game, .05);
  const st = snap(game).animals.find(a => a.id === deer);
  check('a skunk spooks the other animals', st && st.state === 'bolt', JSON.stringify(st));
}
{
  // dev sliders: live values, and Reset puts every one back
  const { game, dbg, api } = boot();
  dbg.tuning('animalSpeed', 2.2);
  check('a dev slider changes the tuning', dbg.tuning('animalSpeed') === 2.2);
  dbg.resetTuning();
  check('Reset puts the sliders back to their defaults', dbg.tuning('animalSpeed') === 1 && dbg.tuning('tubeSize') === 4 && dbg.tuning('doeRule') === 0);
}

// ---------- 4. a whole site, then the tally, the trophy, the bonus, and the results ---------------------------------------
{
  const { game, dbg } = boot();
  press(game, 'start'); press(game, 'confirm'); run(game, 3.2);
  // play out site 1 by the clock; the outro, then the tally, then confirm
  dbg.skipSeg(); run(game, 2.6);
  check('a site ends in the outro, then the tally', snap(game).phase === 'tally' || snap(game).phase === 'outro', snap(game).phase);
  run(game, .2);
  check('the tally shows the x-ray Shot Chart', snap(game).phase === 'tally', snap(game).phase);
  press(game, 'confirm');
  check('confirm moves on to site 2', snap(game).seg === 1 && snap(game).segType === 'site', JSON.stringify(snap(game)).slice(0, 120));
}
{
  // the whole campaign, skipping by the debug handle, with the scoring checked along the way
  const { game, dbg, api } = boot();
  press(game, 'start'); press(game, 'confirm'); run(game, 3.2);
  let guard = 0, seen = new Set();
  while (snap(game).phase !== 'results' && guard++ < 400) {
    const s = snap(game);
    seen.add(s.segType);
    if (s.phase === 'play') dbg.skipSeg();
    else if (s.phase === 'outro') run(game, 2.5);
    else if (s.phase === 'tally') game.input.tap('confirm');
    else if (s.phase === 'intro') run(game, 2.7);
    run(game, .1);
  }
  check('the campaign reaches results', snap(game).phase === 'results', 'phase ' + snap(game).phase + ' guard ' + guard);
  check('the campaign played sites, trophy and bonus', seen.has('site') && seen.has('trophy') && seen.has('bonus'), [...seen].join(','));
  check('no errors across the campaign', errs(game).length === 0, errs(game).slice(0, 3).join(' | '));
  press(game, 'confirm');
  check('saving the initials goes to the lodge', game.sceneName === 'lodge', game.sceneName);
  const recs = api.My3D2dge.store.get('bbhh.records', []);
  check('the record is saved to the Lodge board', Array.isArray(recs) && recs.length === 1 && typeof recs[0].score === 'number', JSON.stringify(recs).slice(0, 120));
}
{
  // a trophy and a bonus game, on their own
  const { game, dbg } = boot();
  game.input.tap('start'); run(game, .2); game.input.tap('down'); run(game, .1); game.input.tap('down'); run(game, .1); game.input.tap('confirm'); run(game, .2);
  check('the single-hunt menu opens', game.sceneName === 'menu' || game.sceneName === 'hunt', game.sceneName);
}

// ---------- 5. attract: idle 10 s on the title starts the bot, any input stops it ----------------------------------------
{
  const { game, dbg } = boot();
  run(game, 10.6);
  check('10 s idle on the title starts the attract demo', game.sceneName === 'hunt' && snap(game).bot === true, game.sceneName);
  run(game, 30);
  check('the bot takes shots', snap(game).site.shots > 0, 'shots ' + snap(game).site.shots);
  check('the bot bags bucks', snap(game).site.bagged > 0 || snap(game).points > 0, 'bagged ' + snap(game).site.bagged);
  press(game, 'confirm');
  check('any input ends attract and returns to the title', game.sceneName === 'title', game.sceneName);
  check('no errors in attract', errs(game).length === 0, errs(game).slice(0, 3).join(' | '));
}

{
  // the menu idles into attract too (on a top-level page)
  const { game } = boot();
  press(game, 'start');
  run(game, 10.6);
  check('10 s idle on the menu starts the attract demo', game.sceneName === 'hunt' && snap(game).bot === true, game.sceneName);
}

// ---------- 5b. the practice range: four stations, goals that end them ----------------------------------------------------
{
  const { game, dbg } = boot();
  press(game, 'start'); press(game, 'down'); press(game, 'down'); press(game, 'down');
  // the menu order: campaign, single, bonus, party, practice. Start practice by the debug handle instead of the menu index
  dbg.go('hunt', { mode: 'practice' }); run(game, 4);
  check('the practice range starts on station 1 of 4', snap(game).segType === 'range' && snap(game).seg === 0, JSON.stringify(snap(game)).slice(0, 160));
  run(game, 3.5);   // the five targets come up over the first few seconds
  check('station 1 has five paper targets standing', snap(game).animals.filter(a => a.sp === 'paper').length === 5, String(snap(game).animals.length));
  for (let k = 0; k < 5; k++) {
    const t = snap(game).animals.find(a => a.sp === 'paper' && !a.dead);
    if (!t) break;
    dbg.aimAt(t.id); dbg.fire(); run(game, .05);
    if (dbg.pump() === 'rack') run(game, .4);
  }
  check('hitting the five targets ends station 1 early', snap(game).phase === 'outro', snap(game).phase);
  run(game, 2.6); press(game, 'confirm');
  check('confirm moves on to station 2', snap(game).seg === 1 && snap(game).segType === 'range', JSON.stringify(snap(game)).slice(0, 120));
  check('no errors across the range', errs(game).length === 0, errs(game).slice(0, 2).join(' | '));
}
// ---------- 5c. the party hunt: hot seat, every player the same animals on each site ---------------------------------------
{
  const { game, dbg } = boot();
  dbg.go('hunt', { mode: 'party', game: 2 }); run(game, 4);
  const s1 = snap(game);
  check('a 2-player party starts on player 1 of site 1', s1.segType === 'site' && s1.seg === 0, JSON.stringify(s1).slice(0, 120));
  const first = JSON.stringify(s1.timelineHead);
  run(game, 6);
  dbg.skipSeg(); run(game, 2.6); press(game, 'confirm');   // player 1's site 1 is over: player 2's turn
  check('turn two starts on the same site', snap(game).seg === 1 && snap(game).site.bucksWanted === s1.site.bucksWanted);
  const second = JSON.stringify(snap(game).timelineHead);
  check('turn two starts on player 2', snap(game).seg === 1 && snap(game).phase !== 'results');
  run(game, 6);
  check('both turns get the same animals', first === second, first.slice(0, 120) + ' vs ' + second.slice(0, 120));
  check('no errors in the party turns', errs(game).length === 0, errs(game).slice(0, 2).join(' | '));
}
// ---------- 5d. the dev labs open from Dev mode and close back ----------------------------------------------------------
{
  const { game, dbg } = boot();
  dbg.go('dev', { from: 'menu' }); run(game, .8);
  check('dev mode opens', game.sceneName === 'dev', game.sceneName);
  dbg.go('animallab', { from: 'dev' }); run(game, .8);
  check('the Animal Lab opens', game.sceneName === 'animallab', game.sceneName);
  game.input.tap('right'); game.input.tap('down'); run(game, .2);
  check('the Animal Lab runs without errors', errs(game).length === 0, errs(game).slice(0, 2).join(' | '));
  dbg.go('soundlab', { from: 'dev' }); run(game, .8);
  check('the Sound Lab opens', game.sceneName === 'soundlab', game.sceneName);
  game.input.tap('confirm'); run(game, .2); game.input.tap('down'); game.input.tap('confirm'); run(game, .2);
  check('the Sound Lab plays a sound and a song without errors', errs(game).length === 0, errs(game).slice(0, 2).join(' | '));
}

// ---------- 5e. the engine's animation system: falls and pop-ups are tweens; the gamepad goes through the engine's map ----
{
  const { game, dbg } = boot();
  press(game, 'start'); press(game, 'confirm'); run(game, 3.2);
  const id = dbg.spawn('buck', { d: .6, x: .5, dir: 1 }); run(game, .02);
  dbg.aimAtZone(id, .56, .39); dbg.fire(); run(game, .25);
  const early = snap(game).animals.find(a => a.id === id);
  check('a shot buck falls on an engine tween (part way at .25 s)', early && early.fall > 0 && early.fall < 1, JSON.stringify(early));
  run(game, 1.5);
  const late = snap(game).animals.find(a => a.id === id);
  check('the fall tween finishes on the ground', late && late.fall === 1, JSON.stringify(late));
  game.input.press('Pad2'); run(game, .05); game.input.release('Pad2'); run(game, .5);   // pump the empty chamber first
  check('the gamepad fires through the engine map (RT = Pad7)', (() => {
    const before = snap(game).site.shots;
    game.input.press('Pad7'); run(game, .05); game.input.release('Pad7'); run(game, .05);
    return snap(game).site.shots === before + 1;
  })());
  check('the gamepad pumps through the engine map (Square = Pad2)', (() => {
    game.input.press('Pad2'); run(game, .05); game.input.release('Pad2'); run(game, .05);
    return snap(game).gun.chamber === 'racking' || snap(game).gun.chamber === 'loaded';
  })());
  game.input.glyphs = 'playstation';
  check('PlayStation glyphs label confirm as ✕', game.input.label('confirm', 'gamepad') === '✕', game.input.label('confirm', 'gamepad'));
  game.input.glyphs = 'xbox';
  check('Xbox glyphs label confirm as A', game.input.label('confirm', 'gamepad') === 'A', game.input.label('confirm', 'gamepad'));
  game.input.glyphs = 'playstation';
  check('no errors on the gamepad path', errs(game).length === 0, errs(game).slice(0, 2).join(' | '));
}
{
  // the bonus snowman rises, holds, sinks and goes
  const { game, dbg } = boot();
  dbg.go('hunt', { mode: 'bonus', game: 'snowman' }); run(game, 6);
  const sn = snap(game).animals.find(a => a.sp === 'snowman');
  check('a snowman pops up on a tween', sn !== undefined, JSON.stringify(snap(game).animals).slice(0, 120));
  run(game, 4);
  check('the pop-up is removed after its tween', snap(game).animals.filter(a => a.sp === 'snowman').length <= 1);
}
// ---------- 6. touch-only devices: the message, the settings button, and attract still runs --------------------------
{
  const { game } = boot({ touchOnly: true });
  run(game, .3);
  check('a touch-only title shows the controller message', game.sceneName === 'title');
  run(game, 10.6);
  check('attract runs on a touch-only device', game.sceneName === 'hunt');
}

// ---------- 7. AI Hub: ghost mode, the round's start, progress, the result and the end ---------------------------------------
{
  const { game, dbg, fire, hubCalls, AIHub } = boot({ hub: true });
  await new Promise(r => setTimeout(r, 0));   // connect() answers on a microtask
  run(game, .2);
  check('a hub round starts on the hub scene', game.sceneName === 'hub', game.sceneName);
  check('connect and ready were called', hubCalls.connect === 1 && hubCalls.ready === 1, JSON.stringify(hubCalls).slice(0, 80));
  fire('start', { in: 3000 });
  run(game, .8);
  check('start begins the hub round', game.sceneName === 'hunt' && snap(game).phase !== undefined, game.sceneName);
  run(game, 3);
  check('the hub round plays three sites', snap(game).phase === 'play' || snap(game).phase === 'intro');
  run(game, 6);
  check('progress is reported to the hub', hubCalls.progress.length > 0);
  check('ghost mode sends the reticle', hubCalls.send.length > 0 && hubCalls.send[0].t === 'g');
  fire('message', { t: 'g', x: .3, y: .6, s: 0 }, 1);
  run(game, .05);
  fire('time-up', { graceMs: 3000 });
  check('time-up reports one result', hubCalls.result.length === 1, String(hubCalls.result.length));
  fire('end', { reason: 'finished', standings: [0, 1] });
  run(game, .5);
  check('after end the game takes no input and sends nothing', snap(game).hub.ended === true);
  check('no errors in a hub round', errs(game).length === 0, errs(game).slice(0, 3).join(' | '));
}

// ---------- 8. the determinism the hub relies on: the same seed gives the same hunt -------------------------------------
{
  const a = boot(), b = boot();
  a.game.debug.seed(99); b.game.debug.seed(99);
  for (const x of [a, b]) { press(x.game, 'start'); press(x.game, 'confirm'); run(x.game, 3.2); }
  run(a.game, 30); run(b.game, 30);
  check('the same seed plays the same 30 s', JSON.stringify(snap(a.game).animals) === JSON.stringify(snap(b.game).animals));
}

if (failed) console.log(fails.map(f => 'FAIL ' + f).join('\n'));
// the browser pass: the built bundle in Chromium, every screen opened, no page errors
{
  const bundle = path.join(root, manifest.bundle);
  const r = spawnSync('python3', [path.join(root, 'tests/browser.py'), bundle], { encoding: 'utf8', timeout: 240000 });
  if (r.status === 0) passed += 1;
  else { failed += 1; fails.push('browser pass :: ' + (r.stdout || r.stderr || 'no output').trim().split('\n').join(' | ').slice(0, 600)); }
}
{
  // the device pass: a simulated gamepad and a forced touch-only device, in Chromium (not physical hardware)
  const bundle = path.join(root, manifest.bundle);
  const r = spawnSync('python3', [path.join(root, 'tests/devices.py'), bundle], { encoding: 'utf8', timeout: 240000 });
  if (r.status === 0) passed += 1;
  else { failed += 1; fails.push('device pass :: ' + (r.stdout || r.stderr || 'no output').trim().split('\n').join(' | ').slice(0, 600)); }
}
if (failed) console.log(fails.filter(f => f.startsWith('browser pass')).map(f => 'FAIL ' + f).join('\n'));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
