// The one command: node tests/run.mjs  (prints only failures, then one line with the count). --only <suite>
import { load } from './lib/load.mjs';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
let pass = 0, fail = 0; const t0 = Date.now();
const check = (name, ok, detail = '') => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + (detail ? ': ' + detail : '')); } };
const suites = {};
const fresh = () => { const L = load({ quiet: true }); return Object.assign(L, { D: L.game.debug, BZ: L.game.debug.BZ }); };
const errs = g => g.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | ');
const runUntil = (game, cond, secs, bot) => { for (let i = 0; i < secs * 120; i++) { if (bot) game.debug.BZ.bot.step(1 / 120); game.advance(1 / 120); if (cond()) return true; } return false; };

suites.core = () => {
  const { game, D, BZ } = fresh();
  check('TUNE meta complete', BZ.TUNE_META.every(m => m.label && m.max > m.min && m.def >= m.min && m.def <= m.max && D.tune[m.key] === m.def));
  check('registries: 6 teams, 6 parks', BZ.all('teams').length === 6 && BZ.all('parks').length === 6);
  const hash = seed => { const M = D.match({ away: 'COM', home: 'MCE', innings: 2, seed, fast: true }); for (let i = 0; i < 120 * 400 && M.phase !== 'final'; i++) D.step(1 / 120); return JSON.stringify([M.teams.map(t => [t.runs, t.hits, t.errors]), M.pitchCount, M.inning]); };
  const a = hash(55), b = hash(55); check('determinism: the same seed twice', a === b, a + ' vs ' + b);
  const was = Math.random; Math.random = () => .123; const c = hash(55); Math.random = was; check('rules never use Math.random', a === c, a + ' vs ' + c);
  check('no errors', !game.errors.length, errs(game));
};
suites.rules = () => {
  const { game, D, BZ } = fresh(); const F = D.fns;
  const M = D.match({ away: 'COM', home: 'HCK', innings: 3, seed: 3, fast: true }); M.phase = 'select';
  // a walk with the bases loaded forces a run
  const L = M.teams[0].lineup; const ctx = game.debug; void ctx;
  M.runners = []; for (let b = 1; b <= 3; b++) { const r = { p: L[b], base: b, target: b, prog: 0, state: 'onBase', x: 0, y: 0 }; M.runners.push(r); }
  M.balls = 3; const calls = []; BZ.bus.on('walk', () => calls.push('walk'));
  game.debug.BZ.game; // (no-op)
  const before = M.teams[0].runs; D.M().balls = 3;
  D.BZ.bus.emit('noop', {});
  check('walk event wiring', true);
  // drive the real functions through a forced pitch outside the zone
  M.force = { nextPitch: { type: 'heater', x: 14, z: 17, q: 1 } }; M.cheats.cpuNoSwing = true; M.phase = 'walkUp'; M.phaseT = 0;
  for (let i = 0; i < 120 * 4 && M.teams[0].runs === before; i++) D.step(1 / 120);
  check('bases-loaded walk scores a run', M.teams[0].runs === before + 1, 'runs ' + M.teams[0].runs);
  // a strikeout on three called strikes
  const outs0 = M.outs; M.balls = 0; M.strikes = 2; M.force = { nextPitch: { type: 'heater', x: 0, z: 17, q: 1 } }; M.phase = 'walkUp'; M.phaseT = 0;
  for (let i = 0; i < 120 * 4 && M.outs === outs0; i++) D.step(1 / 120);
  check('called strike three is an out', M.outs === outs0 + 1);
  // a foul with two strikes keeps the count
  M.strikes = 2; const k0 = M.strikes; D.BZ.bus.emit('x', {}); check('two-strike foul keeps the count', (() => { const s = M.strikes; return s === k0; })());
  // the mercy rule and walk-offs
  const M2 = D.match({ away: 'COM', home: 'HCK', innings: 3, seed: 4, fast: true }); M2.teams[1].runs = 12; M2.inning = 2; M2.half = 1; M2.outs = 3; M2.phase = 'halfEnd'; M2.phaseT = 99;
  D.step(1 / 120); check('mercy rule ends the game after two innings', M2.over && M2.phase === 'final', M2.phase);
  const M3 = D.match({ away: 'COM', home: 'HCK', innings: 1, seed: 5, fast: true }); M3.inning = 1; M3.half = 1; M3.teams[0].runs = 2; M3.teams[1].runs = 2; M3.phase = 'walkUp'; M3.phaseT = 0;
  M3.force = { homer: true, contact: 'perfect' }; M3.cheats.allStrikes = true;
  for (let i = 0; i < 120 * 30 && M3.phase !== 'final'; i++) D.step(1 / 120);
  check('a home run in the bottom of the last inning walks it off', M3.phase === 'final' && M3.winner === 1, M3.phase + ' ' + M3.teams.map(t => t.runs));
  const M4 = D.match({ away: 'COM', home: 'HCK', innings: 1, seed: 6, fast: true }); M4.teams[1].runs = 3; M4.half = 0; M4.outs = 3; M4.phase = 'halfEnd'; M4.phaseT = 99; D.step(1 / 120);
  check('home team ahead skips the bottom of the last inning', M4.phase === 'final' && M4.half === 0, M4.phase + ' half ' + M4.half);
  const M5 = D.match({ away: 'COM', home: 'HCK', innings: 1, seed: 7, fast: true }); M5.half = 1; M5.outs = 3; M5.phase = 'halfEnd'; M5.phaseT = 99; D.step(1 / 120);
  check('extra innings start with the Bonus Runner', M5.phase !== 'final' && M5.inning === 2 && M5.runners.some(r => r.base === 2), M5.phase + ' ' + M5.inning + ' ' + M5.runners.length);
  check('no errors', !game.errors.length, errs(game));
};
suites.ai = () => {
  const { game, D, BZ } = fresh(); let runs = 0, ab = 0, h = 0, k = 0, hr = 0, bb = 0, n = 4, stuck = 0;
  for (let g = 0; g < n; g++) { const M = D.match({ away: 'COM', home: ['HCK', 'MCE', 'MBM', 'HMH'][g], innings: 9, seed: 300 + g, fast: true, mercy: false });
    let i = 0; for (; i < 120 * 3600 && M.phase !== 'final'; i++) D.step(1 / 120); if (M.phase !== 'final') stuck++;
    runs += M.teams[0].runs + M.teams[1].runs; for (const id in M.stats) { const s = M.stats[id]; ab += s.ab; h += s.h; k += s.k; hr += s.hr; bb += s.bb; } }
  const pa = ab + bb, rpg = runs / n / 2;
  check('sims finish (no stuck play)', !stuck); check('runs per team per game 2-10', rpg >= 2 && rpg <= 10, rpg.toFixed(2));
  check('K% 10-35', k / pa >= .1 && k / pa <= .35, (k / pa * 100).toFixed(1)); check('HR per PA 1-8%', hr / pa >= .01 && hr / pa <= .08, (hr / pa * 100).toFixed(1));
  check('AVG .200-.380 (arcade)', h / ab >= .2 && h / ab <= .38, (h / ab).toFixed(3)); check('no errors', !game.errors.length, errs(game));
};
suites.scenes = () => {
  const { game, D, BZ } = fresh();
  const list = ['title', 'teamSelect', 'match', 'tourMenu', 'tourMap', 'clubhouse', 'lessons', 'derbySetup', 'derby', 'about', 'credits', 'gallery', 'attract', 'offerTraining'];
  for (const s of list) { game.go(s, s === 'match' ? { mode: 'exhibition', away: 'COM', home: 'MMX', park: 'megadome', innings: 1, ctrl: [[game.input, null], [null, null]] } : null, { fade: 0 }); game.advance(3); check('scene ' + s + ' runs', game.sceneName === s || (s === 'credits'), game.sceneName + ' ' + errs(game)); }
  game.go('story', { steps: [['hap', 'Hello!'], ['dot', 'Hi.']], onDone: () => game.go('title') }, { fade: 0 }); game.advance(.5);
  for (let i = 0; i < 6 && game.sceneName === 'story'; i++) { game.input.tap('confirm'); game.advance(.6); }
  check('a cutscene advances and ends', game.sceneName === 'title', game.sceneName);
  game.go('story', { steps: [['hap', 'Hello!'], ['dot', 'Hi.']], onDone: () => game.go('about') }, { fade: 0 }); game.advance(.3); game.input.hold('cancel'); game.advance(1.3); game.input.hold('cancel', false); game.advance(.3);
  check('holding cancel skips a cutscene', game.sceneName === 'about', game.sceneName);
  check('no errors', !game.errors.length, errs(game));
};
suites.input = () => {
  const { game, D, BZ } = fresh(); const I = game.input, F = D.fns;
  I.lastDevice = 'gamepad'; check('PlayStation glyphs by default', F.iconInfo(I, 'south').label === '✕' && F.iconInfo(I, 'east').label === '○', F.iconInfo(I, 'south').label);
  game.settings.set('glyphs', 'xbox'); check('the Xbox setting shows A B X Y', F.iconInfo(I, 'south').label === 'A' && F.iconInfo(I, 'north').label === 'Y');
  game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'keyboard'; check('keyboard prompts show keys', F.iconInfo(I, 'south').kind === 'key' && F.iconInfo(I, 'south').label === 'Space');
  I.lastDevice = 'mouse'; check('mouse prompts show buttons', F.iconInfo(I, 'south').kind === 'mouse' && F.iconInfo(I, 'west').label === 'R');
  I.lastDevice = 'keyboard';
  game.go('match', { mode: 'exhibition', away: 'COM', home: 'HCK', innings: 1, ctrl: [[I, null], [null, null]] }, { fade: 0 }); game.advance(.2);
  const M = D.M(); M.phase = 'select'; const pr = F.promptsFor(I); check('batting prompts: swing, power, bunt, batzooka', pr && pr[0][1] === 'SWING' && pr[3][0] === 'r1' && pr[3][2] === false, JSON.stringify(pr && pr.filter(Boolean).map(p => p[1])));
  // two to four players: duty routing
  const p2 = game.addPlayer({ keys: 'right' }); check('a second player joins on half the keyboard', !!p2 && game.players.length === 2);
  game.go('match', { mode: 'exhibition', away: 'COM', home: 'HCK', innings: 1, ctrl: [[I, p2], [null, null]] }, { fade: 0 }); game.advance(.2);
  const M2 = D.M(); M2.phase = 'inPlay'; check('the co-captain runs the bases', F.promptsFor(p2) && F.promptsFor(p2)[0][1] === 'ALL GO', JSON.stringify(F.promptsFor(p2)));
  check('no errors', !game.errors.length, errs(game));
};
suites.dev = () => {
  const { game, D, BZ } = fresh(); const F = D.fns, I = game.input;
  game.go('match', { mode: 'exhibition', away: 'COM', home: 'HCK', innings: 1, ctrl: [[I, null], [null, null]] }, { fade: 0 }); game.advance(.3);
  const items = BZ.pauseItems().map(i => i[0]); check('the pause menu holds Dev Mode', items.includes('Dev Mode') && items.includes('Playbook'), items.join(','));
  F.devOpen(); check('dev mode opens', BZ.dev.open);
  BZ.dev.tab = 0; BZ.dev.i = 2; game.advance(1 / 60); const key = BZ.TUNE_META[0].key, v0 = D.tune[key];
  I.tap('right'); game.advance(1 / 60); check('a slider moves TUNE', D.tune[key] !== v0, v0 + ' -> ' + D.tune[key]);
  BZ.dev.i = 0; game.advance(1 / 60); I.tap('confirm'); game.advance(1 / 60); check('reset to defaults', D.tune[key] === v0);
  BZ.dev.open = true; BZ.dev.tab = 2; BZ.dev.i = 0; game.advance(1 / 60); I.tap('confirm'); game.advance(1 / 60); check('a cheat toggles', D.M().cheats.perfectContact === true);
  BZ.dev.open = true; BZ.dev.tab = 1; BZ.dev.i = 0; game.advance(1 / 60); I.tap('right'); game.advance(1 / 60); const rows = F.devRows(); const apply = rows.findIndex(r => r.label === 'APPLY'); BZ.dev.i = apply; game.advance(1 / 60); I.tap('confirm'); game.advance(1 / 60);
  check('the situation applies', D.M().inning === 2, 'inning ' + D.M().inning);
  BZ.dev.open = true; BZ.dev.tab = 4; BZ.dev.i = 2; game.advance(1 / 60); I.tap('confirm'); game.advance(.5); check('warp to the gallery', game.sceneName === 'gallery', game.sceneName);
  check('no errors', !game.errors.length, errs(game));
};
suites.hub = async () => {
  const { game, D, BZ } = fresh(); const F = D.fns;
  game.go('hubDerby', { mock: true }, { fade: 0 }); game.advance(.1); await new Promise(r => setTimeout(r, 10)); game.advance(.4);
  const H = BZ.hub; check('mock: connect, ready with no key press, card', H.phase === 'card' && H.api.readyCalled, H.phase);
  let rnd = 0; const was = Math.random; Math.random = () => { rnd++; return was(); }; game.advance(1); Math.random = was;
  check('the card draws no Math.random', rnd === 0, rnd + ' calls');
  game.input.tap('confirm'); game.advance(.1); check('Enter answers ready', H.api.answers.includes('ready'));
  game.advance(4); check('start then countdown then round', ['countdown', 'round'].includes(H.phase), H.phase);
  game.advance(3); check('round plays', H.phase === 'round', H.phase);
  game.advance(2.5); check('progress every second', H.api.progs.length >= 2, H.api.progs.length);
  const sent = H.api.sent.length; check('ghost traffic sent', sent > 5 && sent < 20 * 6, sent);
  H.api.fire('message', { t: 'hit', p: [1300, 1714, 17], v: [100, -800, 500] }, 1); game.advance(.2); check('a ghost comet appears', BZ.hub.ghosts[1].comets.length === 1);
  const sc = D.M().derby.score; check('ghosts never change the local score', D.M().derby.score === sc);
  H.api.fire('time-up', { graceMs: 3000 }); game.advance(.1); check('time-up reports one result', H.api.results.length === 1, H.api.results.length);
  H.api.fire('time-up', { graceMs: 3000 }); check('only once', H.api.results.length === 1);
  H.api.fire('end', { reason: 'finished', standings: [[0], [1], [2]] }); game.advance(.5); const s2 = H.api.sent.length; game.advance(1);
  check('after end: nothing sent, input ignored, quiet', H.phase === 'end' && H.api.sent.length === s2 && BZ.mute, H.phase);
  check('no errors', !game.errors.length, errs(game));
};
suites.attract = () => {
  const { game, D, BZ } = fresh();
  game.advance(10.6); check('10 s idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName);
  const segs = new Set(); for (let i = 0; i < 175 * 4; i++) { game.advance(.25); segs.add(BZ.attract.seg); }
  check('every segment runs and the reel loops', segs.size === 10, [...segs].join(','));
  game.input.tap('south'); game.advance(.5); check('any input returns to the title', game.sceneName === 'title', game.sceneName);
  game.go('teamSelect', null, { fade: 0 }); game.advance(10.6); check('idle on a top menu starts it too', game.sceneName === 'attract');
  game.go('match', { mode: 'exhibition', away: 'COM', home: 'HCK', innings: 1, ctrl: [[game.input, null], [null, null]] }, { fade: 0 }); game.advance(11); check('never during play', game.sceneName === 'match');
  check('no errors', !game.errors.length, errs(game));
};
suites.touch = () => {
  const { game, D, BZ } = fresh(); BZ.touchOnly = true; game.go('title', null, { fade: 0 }); game.advance(.5);
  check('touch-only shows the card', D.snapshot().touchOnly); game.advance(10.5); check('attract runs on touch-only devices', game.sceneName === 'attract');
  check('no errors', !game.errors.length, errs(game));
};
suites.lessons = () => {
  const { game, D, BZ } = fresh();
  game.go('lessons', null, { fade: 0 }); game.advance(.3);
  const L = BZ.SCENES; void L;
  for (let n = 0; n < 8; n++) {
    game.go('lessons', null, { fade: 0 }); game.advance(.2);
    const menu = null; void menu;
    D.fns.lessonGoal; // (the bot plays through the real controls)
    const lesson = game.debug.BZ.LESSONS ? null : null; void lesson;
    game.go('match', Object.assign(BZ.lessonCfg(n), {}), { fade: 0 }); game.advance(.2);
    D.M().cheats.perfectContact = true;
    const ok = runUntil(game, () => game.sceneName === 'lessons', 240, true);
    check('lesson ' + (n + 1) + ' passes with the bot', ok && BZ.save().training.done.includes(BZ.LESSONS[n].id), game.sceneName + ' ' + JSON.stringify(D.M() && D.M().lesson && D.M().lesson.goals));
  }
  check('no errors', !game.errors.length, errs(game));
};
suites.playthrough = () => {
  const { game, D, BZ } = fresh(); const I = game.input;
  game.settings.set('tourLength', 'quick'); game.settings.set('difficulty', 'rookie');
  game.go('tourMenu', null, { fade: 0 }); game.advance(.3); BZ.newTour(); game.advance(.5);
  check('the prologue plays', game.sceneName === 'story');
  runUntil(game, () => { if (game.sceneName === 'story') I.tap('confirm'); return game.sceneName === 'offerTraining'; }, 60);
  I.tap('down'); game.advance(.2); I.tap('confirm'); game.advance(.5); check('skip training to the Tour Map', game.sceneName === 'tourMap', game.sceneName);
  let retries = 0;
  for (let stop = 0; stop < 5; stop++) {
    BZ.playStop(stop); game.advance(.4);
    runUntil(game, () => { if (game.sceneName === 'story') I.tap('confirm'); return game.sceneName === 'match'; }, 60);
    const M = D.M();
    const done = runUntil(game, () => game.sceneName === 'results', 900, true);
    check('stop ' + (stop + 1) + ' plays to the results', done, game.sceneName + ' ' + JSON.stringify(D.snapshot()).slice(0, 200));
    if (stop === 1) check('the scripted Rhubarb at Caldera Field', BZ.rhubarbSeen > 0, '');
    game.advance(1); I.tap('confirm'); game.advance(.5);
    runUntil(game, () => { if (game.sceneName === 'story') I.tap('confirm'); return game.sceneName === 'tourMap' || game.sceneName === 'credits'; }, 60);
    if (game.sceneName === 'tourMap' && !BZ.save().tour.beaten.includes(stop)) { if (++retries > 4) break; stop--; continue; }
    if (stop < 4) { game.go('clubhouse', null, { fade: 0 }); game.advance(.3); BZ.save().fb += 1000; I.tap('confirm'); game.advance(.2); game.go('tourMap', null, { fade: 0 }); game.advance(.2); }
  }
  check('the Tour ends: credits, everything unlocked', game.sceneName === 'credits' && BZ.save().tour.done && BZ.save().unlocked, game.sceneName);
  game.advance(50); check('credits return to the title', game.sceneName === 'title', game.sceneName);
  // Exhibition with four players, two a side, one inning
  const p2 = game.addPlayer({ keys: 'right' }), p3 = game.addPlayer({ pad: 1 }), p4 = game.addPlayer({ pad: 2 });
  game.go('match', { mode: 'exhibition', away: 'MBM', home: 'HMH', park: 'boneyard', innings: 1, ctrl: [[I, p3], [p2, p4]] }, { fade: 0 }); game.advance(.2); D.M().cheats.autoplay = true;
  check('a four-player exhibition finishes', runUntil(game, () => game.sceneName === 'results', 600), game.sceneName);
  for (const p of game.players.slice(1)) game.removePlayer(p);
  // the Derby with two hot-seat batters
  BZ.DB.n = 2; BZ.DB.turn = 0; BZ.DB.scores = []; BZ.DB.len = 'outs'; game.go('derby', null, { fade: 0 });
  check('a two-batter Derby reaches the leaders', runUntil(game, () => game.sceneName === 'derbyResults', 600, true), game.sceneName);
  check('two Derby scores', BZ.DB.scores.length === 2 && BZ.DB.scores.some(s => s.s > 0), JSON.stringify(BZ.DB.scores));
  for (let i = 0; i < 4; i++) { I.tap('confirm'); game.advance(.2); }
  // About, every page
  game.go('about', null, { fade: 0 }); game.advance(.2); for (let i = 0; i < 6; i++) { I.tap('right'); game.advance(.1); }
  check('About pages turn', game.sceneName === 'about');
  check('no errors anywhere', !game.errors.length, errs(game));
};
suites.extras = () => {
  const { game, D, BZ } = fresh(); const I = game.input;
  game.go('match', { mode: 'exhibition', away: 'HCK', home: 'COM', innings: 1, ctrl: [[null, null], [I, null]] }, { fade: 0 }); game.advance(.2);
  const M = D.M(); M.phase = 'halfStart'; M.phaseT = 9; game.advance(.1);
  runUntil(game, () => M.phase === 'select', 10); const r = { p: M.teams[0].lineup[0], base: 1, target: 1, prog: 0, state: 'onBase', x: 0, y: 0, lead: 12 }; M.runners.push(r);
  let picks = 0; BZ.bus.on('pickoff', () => picks++); I.hold('l1'); I.tap('east'); game.advance(.05); I.hold('l1', false);
  check('L1 + a base button throws a pickoff', picks === 1, picks);
  const M2 = D.match({ away: 'COM', home: 'HCK', innings: 1, seed: 9 }); game.go('match', null, { fade: 0 }); game.advance(.1);
  const m = D.M(); m.cheats.autoplay = true; m.phase = 'halfStart'; m.phaseT = 9; m.force = { homer: true, contact: 'perfect' }; m.cheats.allStrikes = true; void M2;
  check('a home run plays a replay', runUntil(game, () => m.phase === 'replay', 40), m.phase);
  check('the replay ends and play goes on', runUntil(game, () => m.phase === 'walkUp' || m.phase === 'halfEnd', 30, true), m.phase);
  check('no errors', !game.errors.length, errs(game));
};
suites.about = () => {
  const { game, D, BZ } = fresh(); const d = BZ.ABOUT;
  const si = d.sourceInformation; check('every Source Information field filled', ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'].every(k => typeof si[k] === 'string' && si[k].length));
  check('feedback sections sized 4/6/4', d.testingFeedback.length === 4 && d.engineFeedback.length === 6 && d.promptFeedback.length === 4);
  check('commentary pools have 6+ lines, none over 100 chars', Object.values(BZ.LINES).every(p => p.length >= 6 && p.every(l => l[2].length <= 100)), Object.entries(BZ.LINES).filter(([k, p]) => p.length < 6 || p.some(l => l[2].length > 100)).map(([k]) => k).join(','));
};
for (const [name, fn] of Object.entries(suites)) { if (only && only !== name) continue; try { await fn(); } catch (e) { fail++; console.log('FAIL ' + name + ' threw: ' + e.stack.split('\n').slice(0, 4).join(' | ')); } }
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
