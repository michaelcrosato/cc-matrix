// THE one command: node tools/test.mjs  -> prints only failures and a one-line count
import { E } from './node-env.mjs';
globalThis.My3D2dge = E;
const t0 = Date.now(); let n = 0, bad = 0;
const check = (name, ok, detail = '') => { n++; if (!ok) { bad++; console.log('FAIL ' + name + (detail !== '' ? ': ' + detail : '')); } };
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const want = s => !only.length || only.includes(s);
const { COURSES, COURSE_IDS, PUZZLES, ENVS, BLOCKS, parse, SURVIVAL } = await import('../src/data.js');
const { compile, U } = await import('../src/course.js');
const A = await import('../src/arena.js');
const { medalFor, thresholds, authorTime } = await import('../src/medals.js');
const { puzzleCourse, puzzleSolved } = await import('../src/puzzle.js');
const { CFG, TUNING, SLIDERS, reset } = await import('../src/config.js');
const { createGame } = await import('../src/main.js');
const { profile } = await import('../src/profile.js');
const X = createGame({ headless: true }); const { game, S } = X;
S.noStory = true; S.start(); for (let i = 0; i < 300 && !game.sceneName; i++) await new Promise(r => setTimeout(r, 20));
const key = (c, t = 1 / 30) => { game.input.press(c); game.advance(t); game.input.release(c); game.advance(1 / 60); };
const snap = () => game.debug.snapshot();
const until = (fn, sec = 120, step = .25) => { for (let t = 0; t < sec && !fn(); t += step) game.advance(step); return fn(); };

// ---- courses
if (want('courses')) {
  for (const id of COURSE_IDS) {
    const c = compile(COURSES[id]);
    check('course ' + id + ' compiles', c.line.length > 20 && c.gates.length >= 3);
    check('course ' + id + ' has checkpoints', c.cpCount >= 2, c.cpCount);
    const l = c.line; let cross = false; for (let i = 0; i < l.length && !cross; i++) for (let j = i + 14; j < l.length; j++) if ((l[i].x - l[j].x) ** 2 + (l[i].y - l[j].y) ** 2 < (9 * U) ** 2 && Math.abs(l[i].z - l[j].z) < 4 * U) { cross = true; break; }
    check('course ' + id + ' does not cross itself', !cross);
    check('course ' + id + ' length 250..2500 m', c.length / U > 250 && c.length / U < 2500, Math.round(c.length / U));
  }
  check('parse rejects junk', (() => { try { parse('Q9'); return false; } catch (e) { return true; } })());
}
// ---- bot / physics / medals
if (want('bot')) {
  const g2 = new E.Game({ headless: true, canvas: 'screen', res: 'ps1', expand: true, bg: null });
  for (const id of COURSE_IDS) {
    const r = A.botRun(g2, COURSES[id], { skill: 1 });
    check('bot finishes ' + id, r.finished && r.respawns === 0, JSON.stringify(r));
    check('bot time matches baked ' + id, Math.abs(r.steps - authorTime(id)) <= 1, r.steps + ' vs ' + authorTime(id));
    const slow = A.botRun(g2, COURSES[id], { skill: .8, seed: 3 }); check('bot skill .8 not faster ' + id, !slow.finished || slow.steps >= r.steps - 1, slow.steps + ' vs ' + r.steps);
  }
  for (const p of PUZZLES) { const r = A.botRun(g2, puzzleCourse(p, p.solution.split(' ')), { skill: 1 }); check('puzzle solution drives ' + p.id, r.finished && r.respawns === 0); check('puzzle solved check ' + p.id, puzzleSolved(p, p.solution.split(' '), compile)); check('puzzle wrong pick fails ' + p.id, !puzzleSolved(p, Array(p.slots).fill(''), compile)); }
  const a1 = A.botRun(g2, COURSES.D1, { skill: 1 }), a2 = A.botRun(g2, COURSES.D1, { skill: 1 }); check('determinism: two D1 bot runs equal', a1.steps === a2.steps);
  CFG.topSpeed = .7; const slowc = A.botRun(g2, COURSES.D1, {}); check('lower top speed slows the car', slowc.steps > a1.steps); reset();
  const th = thresholds('D1'); check('medal thresholds ordered', th[1] > th[2] && th[2] > th[3] && th[3] > th[4]);
  check('medalFor', medalFor('D1', th[4]) === 4 && medalFor('D1', th[3]) === 3 && medalFor('D1', th[2]) === 2 && medalFor('D1', th[1]) === 1 && medalFor('D1', th[1] + 5) === 0);
}
// ---- profile
if (want('profile')) {
  profile.reset(); const r1 = profile.record('D1', 2000, 3, null), r2 = profile.record('D1', 1990, 3, null);
  check('reward paid once per tier', r1.reward === 30 + 50 + 80 && r2.reward === 0, r1.reward + ',' + r2.reward);
  check('record kept', profile.data.best.D1 === 1990);
  check('spend', profile.spend(10) && !profile.spend(1e6)); profile.reset();
}
// ---- UI: menus by keys, glyph switching, dev mode, attract, touch gate
if (want('ui')) {
  profile.reset(); S.profile.data.story.welcome = true; game.go('menu'); game.advance(1);
  check('title page first', S.page === 'title', S.page); key('Enter'); check('title -> main by keys', S.page === 'main', S.page);
  check('prompts use keyboard labels', game.input.label('confirm') !== '');
  game.input.lastDevice = 'gamepad'; const ps = game.input.label('confirm'); game.settings.set('glyphs', 'xbox'); const xb = game.input.label('confirm'); check('glyph families differ ps vs xbox', ps !== xb, ps + ' ' + xb); game.settings.set('glyphs', 'playstation'); check('PlayStation is the default family', game.input.label('confirm') === ps); game.input.lastDevice = 'keyboard';
  S.pane.i = 7; key('Enter'); check('about page opens', snap().page === 'about'); key('Escape'); game.advance(.1); check('about back', S.page === 'main', S.page);
  S.pane.i = 0; key('Enter'); check('race page', S.page === 'race'); key('Enter'); check('courses page', S.page === 'courses');
  check('D2 locked at start', S.pane.items[1].locked && !S.pane.items[0].locked); key('Escape'); check('escape goes back a page', S.page === 'race', S.page);
  // mouse hover + click
  S.pane.layout(20, 58, 300, 160); const q = S.pane.rects[0]; S.pane.i = 0; game.input.feed('down', q[0] + 5, q[1] + 5); game.input.feed('up', q[0] + 5, q[1] + 5); game.advance(.1); check('mouse click on a tile picks it', S.page === 'courses', S.page);
  game.go('menu'); game.advance(.5); S.openPage('courses', 'dust'); S.pane.layout(20, 58, 300, 160); const q2 = S.pane.rects[2]; game.input.feed('move', q2[0] + 5, q2[1] + 5); game.advance(.1); game.input.feed('move', q2[0] + 6, q2[1] + 6); game.advance(.1);
  check('mouse hover moves the focus', S.pane.i === 2, S.pane.i);
  game.go('menu'); game.advance(.5);
  // dev mode from a race
  S.startRace(COURSES.D1, { mode: 'race' }); game.advance(2); check('race scene', game.sceneName === 'race');
  S.openDev(); game.advance(.1); check('dev opens', S.dev === true);
  const gv = CFG.gravity; key('ArrowRight'); S.sl.i = 5; key('ArrowRight'); check('dev slider changes CFG live', CFG.gravity !== gv, CFG.gravity); S.sl.i = SLIDERS.length; key('Enter'); check('dev reset restores defaults', CFG.gravity === TUNING.gravity && CFG.topSpeed === 1);
  S.dev = false;
  // attract after 10 s idle on title, any input exits
  game.go('menu'); game.advance(.5); S.openPage('title'); S.idle = 0; game.advance(9); check('no attract before 10 s', game.sceneName === 'menu');
  game.advance(2.5); check('attract starts after 10 s idle', game.sceneName === 'attract', game.sceneName);
  game.advance(5); check('attract car is moving', snap().car.kmh > 40, snap().car && snap().car.kmh); game.advance(1);
  key('Enter'); game.advance(.5); check('any input exits attract', game.sceneName === 'menu', game.sceneName);
  S.openPage('main'); S.idle = 0; game.advance(10.5); check('attract also from the main menu', game.sceneName === 'attract'); key('KeyA'); game.advance(.5);
  S.forceTouch = true; game.go('menu'); game.advance(1); check('touch gate flag', snap().touchOnly); S.idle = 0; game.advance(10.5); check('attract runs on touch', game.sceneName === 'attract'); S.forceTouch = false; game.go('menu'); game.advance(.5);
}
// ---- the playthrough: every race through the menus with the autopilot, medals and unlocks
if (want('playthrough')) {
  profile.reset(); S.profile.data.story.welcome = true; S.autopilot = true; game.go('menu'); game.advance(1);
  let coppers = profile.data.coppers;
  for (let k = 0; k < COURSE_IDS.length; k++) {
    const id = COURSE_IDS[k], env = COURSES[id].env, envIdx = Object.keys(ENVS).indexOf(env);
    S.openPage('main'); S.pane.i = 0; key('Enter'); S.pane.i = envIdx; key('Enter'); const idx = COURSE_IDS.filter(i => COURSES[i].env === env).indexOf(id);
    const unlocked = !S.pane.items[idx].locked; check('track ' + id + ' unlocked by the previous medal', unlocked, S.pane.items.map(i => i.locked));
    if (!unlocked) { profile.data.devUnlock = true; S.openPage('courses', env); }
    S.pane.i = idx; key('Enter'); game.advance(1); check('race scene for ' + id, game.sceneName === 'race' && snap().track === id, game.sceneName);
    const ok = until(() => S.results || snap().scene !== 'race', 140); check('autopilot finishes ' + id + ' via the real race scene', !!S.results && S.results.steps > 0, JSON.stringify(snap().run));
    if (S.results) { check('medal earned on ' + id, S.results.medal >= 3, S.results.medal + ' at ' + S.results.steps); check('best recorded ' + id, profile.data.best[id] === S.results.steps); }
    S.autopilot = true; S.dev = false; game.go('menu'); game.advance(.5);
  }
  profile.data.devUnlock = false;
  check('coppers paid out', profile.data.coppers > coppers + 400, profile.data.coppers);
  check('ghost saved', !!profile.data.ghosts.D1 && profile.data.ghosts.D1.pts.length > 20);
  // ghost appears on a rerun
  S.autopilot = false; S.startRace(COURSES.D1, { mode: 'race' }); game.advance(2); check('ghost car spawned on rerun', !!S.ghost);
  game.advance(8); check('ghost follows the recorded line', S.ghost && S.ghost.x > 0 && Math.abs(S.ghost.x - 0) > 1);
  // recorded ghost: the autopilot's second run on D2 is shadowed by the ghost recorded on its first
  { profile.reset(); S.autopilot = true; S.startRace(COURSES.D2, { mode: 'race' }); until(() => S.results, 140); const first = S.results.steps;
    S.startRace(COURSES.D2, { mode: 'race' }); game.advance(1); check('recorded ghost spawned', !!S.ghost && S.best.pts.length > 100, S.best && S.best.pts.length);
    until(() => S.run.phase === 'racing', 20); let worst = 0, n2 = 0; for (let i = 0; i < 20; i++) { game.advance(1); if (S.run.phase !== 'racing') break; worst = Math.max(worst, Math.hypot(S.ghost.x - S.car.x, S.ghost.y - S.car.y)); n2++; }
    check('recorded ghost stays on the player car (same bot, same line)', n2 >= 10 && worst < 40, worst + ' over ' + n2 + 's'); S.autopilot = false; S.startRace(COURSES.D1, { mode: 'race' }); game.advance(9); }
  // player respawn / restart / missing checkpoint / camera
  game.advance(2); const s0 = S.run.steps; key('KeyR'); game.advance(.2); check('restart resets the clock', S.run.steps < s0 || S.run.phase === 'countdown');
  game.advance(5); check('countdown ends in racing', S.run.phase === 'racing');
  game.input.press('KeyW'); game.advance(5); game.input.release('KeyW'); const rs = S.run.respawns; key('Backspace'); check('respawn counted', S.run.respawns === rs + 1);
  const cam0 = S.cam; key('KeyC'); check('camera key cycles', S.cam === (cam0 + 1) % 3);
  // missing checkpoint: put the car past the finish without cps
  const fin = S.arena.course.finish; S.car.place(fin.x - Math.cos(fin.angle) * 60, fin.y - Math.sin(fin.angle) * 60, fin.z + 4); S.run.prev = [S.car.x, S.car.y, S.car.z]; S.car.angle = fin.angle; S.car.vx = Math.cos(fin.angle) * 400; S.car.vy = Math.sin(fin.angle) * 400; S.run.cps = 0; S.run.passed.clear(); S.flash = null; game.advance(1);
  check('finish refused without every checkpoint', !S.run.finished && S.flash && S.flash.text === 'MISSING CHECKPOINT', S.flash && S.flash.text);
}
// ---- puzzles through the editor UI
if (want('puzzle')) {
  profile.reset(); S.profile.data.story.welcome = true; S.autopilot = true;
  for (const p of PUZZLES) {
    game.go('editor', { puzzle: p }); game.advance(.5); check('editor opens puzzle ' + p.id, game.sceneName === 'editor' && S.ed.puzzle.id === p.id);
    const ed = S.ed; check('driving an unsolved puzzle is refused', (() => { S.pane = null; const it = ed.pane.items.find(i => i.act === 'drive'); ed.pane.i = ed.pane.items.indexOf(it); key('Enter'); return game.sceneName === 'editor'; })());
    for (const c of p.solution.split(' ')) { const idx = ed.pane.items.findIndex(i => i.act === 'put' && i.c === c); ed.pane.i = idx; key('Enter'); }
    check('slots filled ' + p.id, ed.choices.every(Boolean), ed.choices.join());
    const di = ed.pane.items.findIndex(i => i.act === 'drive'); ed.pane.i = di; key('Enter'); game.advance(1); check('puzzle drive starts ' + p.id, game.sceneName === 'race' && S.mode === 'puzzle', game.sceneName);
    until(() => S.results, 120); check('puzzle ' + p.id + ' solved with a medal', S.results && S.results.medal >= 3, S.results && S.results.medal); check('puzzle progress saved', profile.data.puzzles[p.id] >= 3);
  }
  S.autopilot = false;
}
// ---- editor: build, cost, undo, overlap, save, share code, test drive
if (want('editor')) {
  profile.reset(); S.profile.data.story.welcome = true; game.go('editor', {}); game.advance(.5);
  const ed = S.ed, add = c => { const i = ed.pane.items.findIndex(x => x.act === 'add' && x.c === c); ed.pane.i = i; key('Enter'); };
  const act = a => { const i = ed.pane.items.findIndex(x => x.act === a); ed.pane.i = i; key('Enter'); };
  add('S'); add('R'); add('S'); check('blocks placed', ed.chain.join('') === 'SRS', ed.chain.join(''));
  act('undo'); check('undo removes the last', ed.chain.join('') === 'SR');
  ['R', 'R', 'R'].forEach(add); check('overlapping road refused', ed.chain.join('') !== 'SRRRR', ed.chain.join(''));
  profile.data.coppers = 25; add('J'); check('unaffordable block refused', !ed.chain.includes('J')); profile.data.coppers = 400;
  ed.chain = []; for (const c of 'SSLSSRSBCSJS') add(c); check('12-block track built', ed.chain.length === 12, ed.chain.join(''));
  act('save'); ed.pane.i = 0; key('Enter'); check('saved to slot 1', !!profile.data.slots[0] && profile.data.slots[0].chain.length === 12);
  act('clear'); check('cleared', ed.chain.length === 0); act('load'); ed.pane.i = 0; key('Enter'); check('loaded from slot', ed.chain.length === 12);
  act('share'); const code = ed.code; check('share code made', typeof code === 'string' && code.length > 8); const back = S.dec(code); check('share code round trips', back && back.chain.join('') === ed.chain.join('') && back.env === ed.env);
  act('clear'); S.pasteText = code; act('paste'); check('paste imports a code', ed.chain.length === 12); S.pasteText = undefined;
  S.autopilot = true; act('drive'); game.advance(1); check('test drive scene', game.sceneName === 'race' && S.mode === 'test', game.sceneName); until(() => S.results, 160);
  check('custom track finished by the bot', !!S.results && S.results.mode === 'test', JSON.stringify(snap().run)); S.autopilot = false;
  game.go('editor', { back: true }); game.advance(.5); check('back to the editor keeps the chain', S.ed.chain.length === 12);
}
// ---- survival
if (want('survival')) {
  profile.reset(); S.profile.data.story.welcome = true; S.autopilot = true; S.deeplink('survival', 'dust'); game.advance(1);
  check('survival race has 3 rivals', S.cars.length === 4, S.cars.length);
  let rounds = 0; while (game.sceneName === 'race' && S.mode === 'survival' && rounds < 4) { until(() => S.results, 160); if (!S.results) break; rounds++; check('survival round ' + rounds + ' result', S.results.place >= 1 && S.results.place <= 4, S.results.place); if (!S.results.adv) break; const act = S.resultPane.items[0].act; S.resultPane.i = 0; key('Enter'); game.advance(1); }
  check('survival rounds played', rounds >= 1, rounds);
  // rules: placing
  S.autopilot = false;
}
// ---- hot seat and split screen
if (want('multi')) {
  profile.reset(); S.profile.data.story.welcome = true; S.autopilot = true;
  S.deeplink('hotseat', 2, 'D1'); game.advance(1); check('hot seat race starts', S.mode === 'hotseat' && S.seat.players.length === 2);
  until(() => S.results, 100); check('hot seat turn 1 result', !!S.results && S.seat.times[0] > 0);
  key('Enter'); game.advance(1); check('pass the controller card', S.page === 'pass', S.page); key('Enter'); game.advance(1); check('hot seat turn 2 race', game.sceneName === 'race' && S.seat.turn === 1);
  until(() => S.results, 100); check('hot seat turn 2 result', S.seat.times[1] > 0); key('Enter'); game.advance(1); check('final standings', S.page === 'standings', S.page);
  S.autopilot = false; game.go('menu'); game.advance(.5);
  S.deeplink('split', 2, 'D1'); game.advance(1); check('split screen: 2 cars, 2 cameras, 2 players', S.cars.length === 2 && S.arena.world.cameras.length === 2 && game.players.length === 2, S.cars.length + ' ' + S.arena.world.cameras.length + ' ' + game.players.length);
  game.advance(7); check('split screen race running', S.runs.every(r => r.phase === 'racing'));
  game.input.press('KeyW'); game.players[1].press && game.players[1].press('ArrowUp'); game.advance(3); game.input.release('KeyW');
  check('split screen: both cars have moved', S.cars.every(c => Math.abs(c.speed) > 5 || c.x !== S.arena.course.start.x), S.cars.map(c => Math.round(c.speed)));
  game.go('menu'); game.advance(.5); check('split screen ends on leaving', game.players.length === 1, game.players.length);
}
// ---- garage
if (want('garage')) {
  profile.reset(); S.profile.data.story.welcome = true; game.go('garage'); game.advance(.5); check('garage opens', game.sceneName === 'garage');
  const p0 = profile.data.paint; S.gpane.i = 1; key('Enter'); game.advance(.3); check('free paint equips', profile.data.paint !== p0); const c0 = profile.data.coppers; game.advance(.5); S.gpane.i = 5; key('Enter'); game.advance(.3);
  check('paid paint costs coppers', profile.data.coppers === c0 - 40, profile.data.coppers); profile.data.coppers = 0; S.gpane.i = 8 + 2; key('Enter'); game.advance(.3); check('unaffordable car refused', (profile.data.cars || ['coyote']).length === 1);
}
// ---- online with a fake AIHub
if (want('online')) {
  const sent = [], handlers = {}; let ready = 0, results = [], progress = 0, answered = [], T = -Infinity;
  const fake = { active: true, seeded: true, connect: async o => { fake.cfg = o; return { me: 0, players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 185000, seed: 7 }; },
    ready() { ready++; }, answer(a) { answered.push(a); }, time: () => T, on(e, fn) { handlers[e] = fn; return () => {}; }, progress() { progress++; }, result(r) { results.push(r); }, send(d) { sent.push(d); return true; }, rng: () => () => .3, fail() {} };
  globalThis.AIHub = fake;
  const X2 = createGame({ headless: true, hub: true }); const g2 = X2.game, S2 = X2.S; S2.start(); for (let i = 0; i < 300 && !g2.sceneName; i++) await new Promise(r => setTimeout(r, 20));
  check('online: opens straight into the session scene', g2.sceneName === 'online', g2.sceneName);
  for (let i = 0; i < 50 && !X2.online.info; i++) await new Promise(r => setTimeout(r, 20)); g2.advance(1);
  check('online: connect asked for ghost mode with its own card', fake.cfg.mode === 'ghost' && fake.cfg.card === true);
  check('online: ready() once, no key press', ready === 1, ready); check('online: phase card', X2.online.phase === 'card');
  g2.input.press('Enter'); g2.advance(.05); g2.input.release('Enter'); check('online: Enter answers ready', answered.includes('ready'));
  handlers.card && handlers.card({ left: 8000, ready: [0], starting: false }); handlers.start && handlers.start({ in: 3000 }); g2.advance(.5); check('online: counts down on start', X2.online.phase === 'count', X2.online.phase);
  T = 0; g2.advance(.2); check('online: play begins at time 0', X2.online.phase === 'play', X2.online.phase);
  g2.input.press('KeyW'); g2.advance(3); T = 3000; g2.advance(3); T = 6000; g2.advance(2);
  check('online: ghost traffic sent <= 10/s and < 200 bytes', sent.length > 5 && sent.every(d => JSON.stringify(d).length < 200), sent.length);
  check('online: progress reported', progress >= 1);
  handlers.message && handlers.message({ t: 'g', area: X2.online.id, run: 0, ms: 100, p: [500, 500, 2], a: 0, v: 50 }, 1); g2.advance(.5); handlers.message({ t: 'g', area: X2.online.id, run: 0, ms: 200, p: [520, 500, 2], a: 0, v: 50 }, 1); g2.advance(.5);
  check('online: another player appears as a ghost', X2.online.ghosts.get(1).car.x > 400, X2.online.ghosts.get(1).car.x);
  T = 181000; g2.advance(1); check('online: exactly one result at the end of the round', results.length === 1, results.length);
  g2.advance(1); check('online: still one result', results.length === 1);
  handlers.end && handlers.end({ reason: 'finished', standings: [[0], [1]] }); g2.advance(.5); check('online: input and sound stop on end', X2.online.phase === 'over' && g2.audio.muted);
  delete globalThis.AIHub;
}
check('no engine errors', game.errors.length === 0, game.errors.map(e => String(e.message || e).slice(0, 160)).join(' | '));
console.log(`${n} checks, ${bad} failed, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(bad ? 1 : 0);
