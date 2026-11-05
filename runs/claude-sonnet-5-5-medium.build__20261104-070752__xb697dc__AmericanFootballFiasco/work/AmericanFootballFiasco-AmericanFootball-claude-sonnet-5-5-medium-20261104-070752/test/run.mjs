// The one command: node test/run.mjs   (npm test). Prints only failures and a one-line count.
// Headless suites drive the real game through game.advance / input.tap with a scripted player (test/lib/bot.mjs); the browser
// suite loads the dev page in Chromium and checks that every screen draws without a page error.
import { spawnSync } from 'node:child_process';
import { loadGame } from './lib/load.mjs';
import { makeBot } from './lib/bot.mjs';

let total = 0; const fails = [];
const check = (name, ok, detail = '') => { total++; if (!ok) fails.push(name + (detail ? ': ' + String(detail).slice(0, 300) : '')); };
const errs = (game) => game.errors.map(e => e.message + ' ' + String(e.stack || '').split('\n').slice(0, 3).join(' | ')).join(' || ');
const tick = (game, sec, fn, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) { if (fn) fn(); game.advance(dt); } };

/* ---- data sanity ---- */
{
  const { FF } = loadGame();
  for (const id of FF.PLAY_ORDER) { const p = FF.PLAYS[id]; check('play ' + id + ' has a kind', ['pass', 'run', 'trick'].includes(p.kind)); for (const role in (p.routes || {})) check('play ' + id + ' route role ' + role, !!FF.OFF_FORM[role]); }
  for (const id of FF.DEF_ORDER) check('defense ' + id, !!FF.DEFS[id]);
  for (const t of FF.TEAM_LIST) check('team ' + t, !!FF.TEAMS[t]);
  for (const k in FF.STORY.chapters) { const c = FF.STORY.chapters[k]; check('chapter ' + k + ' stadium', !!FF.STADIUMS[c.stadium]); check('chapter ' + k + ' team', !!FF.TEAMS[c.opp]); }
  check('tuning has defaults', FF.TUNE.every(t => FF.T[t[0]] === t[2]));
}

/* ---- the sim alone: CPU vs CPU over several seeds ---- */
{
  const { FF } = loadGame();
  for (const seed of [3, 11, 29]) {
    FF.resetTune();
    const M = new FF.Match({ humans: [false, false], seed, qlen: 45, quarters: 4 }); let steps = 0; const seen = {};
    while (!M.over && steps < 120000) { M.update(1 / 60, [null, null]); steps++; seen[M.phase] = 1; for (const e of M.events) seen['e:' + e.type] = (seen['e:' + e.type] || 0) + 1; M.events.length = 0; if (M.phase === 'half') M.adjust(0, 0); }
    check('sim seed ' + seed + ' finishes', M.over, 'steps ' + steps + ' phase ' + M.phase);
    check('sim seed ' + seed + ' scores are sane', M.score[0] >= 0 && M.score[1] >= 0 && M.score[0] + M.score[1] > 0 && M.score[0] < 120 && M.score[1] < 120, M.score.join('-'));
    check('sim seed ' + seed + ' every phase reached', ['call', 'set', 'live', 'dead', 'half', 'final'].every(p => seen[p]), Object.keys(seen).join(','));
    check('sim seed ' + seed + ' passes, hits and kicks happen', seen['e:throw'] && seen['e:tackle'] !== undefined && (seen['e:fg-good'] || seen['e:pat-good'] || seen['e:td']), JSON.stringify(seen));
    check('sim seed ' + seed + ' no NaN positions', M.P.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  }
  // rules: a touchdown is 6, a turnover on downs flips possession, a first down resets the down
  FF.resetTune();
  const M = new FF.Match({ humans: [false, false], seed: 5 });
  M.down = 4; M.los = 400; M.fd = 600; M.poss = 0; M.toCall(); M.chooseOff('dive'); M.chooseDef('zone'); let n = 0;
  while (M.phase !== 'call' && n++ < 4000) M.update(1 / 60, [null, null]);
  check('a play ends and returns to the call', M.phase === 'call' || M.phase === 'kick' || M.phase === 'score', M.phase);
}

/* ---- overtime, two players ---- */
{
  const { FF, game } = loadGame(); FF.resetTune();
  const M = new FF.Match({ humans: [false, false], seed: 8, quarters: 2, qlen: 20 }); M.score = [7, 7]; M.q = 2; M.clock = 0; M.toCall(); M.endQuarter();
  check('a tie after regulation goes to overtime', M.ot === true && M.phase === 'call' && M.clock === 60, M.phase + ' ' + M.ot);
  let st = 0; while (!M.over && st++ < 40000) { M.update(1 / 60, [null, null]); M.events.length = 0; }
  check('overtime is sudden death', M.over && M.score[0] !== M.score[1], M.score.join('-'));
  game.advance(.3);
  game.go('match', { mode: 'exh', home: 'fiascos', away: 'bruisers', stadium: 'junction', humans: [true, true], two: true, quarters: 4, qlen: 40, seed: 4 }); game.advance(.4);
  game.allowJoin({ max: 2 }); const p2 = game.addPlayer({ pad: 1 }); const M2 = FF.S.M, I1 = game.players[0]; let t = 0;
  check('player 2 joins', game.players.length === 2 && !!p2);
  while (t < 50) { if (M2.phase === 'call') { if (M2.needCall() === 'off' && M2.callTime > .4) I1.tap('confirm'); if (M2.needCall() === 'def' && M2.callTime > .4) p2.tap('confirm'); } if (M2.phase === 'set' && M2.humans[M2.poss]) (M2.poss === 0 ? I1 : p2).tap('a'); game.advance(1 / 30); t += 1 / 30; }
  check('two players share a game: each calls and plays', M2.stats[0].plays + M2.stats[1].plays >= 4, JSON.stringify(M2.stats.map(s => s.plays)));
  check('no errors in 2 player play', !game.errors.length, errs(game));
}

/* ---- the full game, as a person: title -> exhibition -> scripted player to the final whistle -> results ---- */
{
  const { FF, game } = loadGame();
  game.advance(.5);
  check('title shows first', game.sceneName === 'title', game.sceneName);
  const I = game.input;
  I.tap('down'); game.advance(.2); I.tap('confirm'); game.advance(.3);
  check('the menu moves and opens Exhibition', FF.titleState.page === 'exh', FF.titleState.page);
  FF.resetTune(); FF.T.quarter = 25;
  game.go('match', { mode: 'exh', home: 'fiascos', away: 'bruisers', stadium: 'junction', humans: [true, false], quarters: 4, qlen: 25 }); game.advance(.5);
  check('exhibition begins in the play-call', game.sceneName === 'match' && FF.S.M.phase === 'call', game.sceneName);
  const bot = makeBot(FF, game, { lateral: true }); const seen = {}; let t = 0, usedCard = 0;
  while (game.sceneName === 'match' && t < 1500) { bot.step(); game.advance(1 / 30); t += 1 / 30; const M = FF.S.M; if (M) { seen[M.phase] = 1; if (M.card[0] === null && M.meter[0] === 0) usedCard++; } }
  bot.release();
  check('the scripted game reaches the results screen', game.sceneName === 'results', game.sceneName + ' t=' + t.toFixed(0) + ' ' + JSON.stringify(FF.matchDebug()));
  check('the scripted game visits every phase', ['call', 'set', 'live', 'dead'].every(p => seen[p]), Object.keys(seen).join());
  check('no errors in the scripted exhibition', !game.errors.length, errs(game));
  // results -> rematch
  game.advance(.5); I.tap('confirm'); game.advance(.8);
  check('rematch starts a new match', game.sceneName === 'match', game.sceneName);
  check('stats were recorded', (FF.store.get('stats', {}).games || 0) >= 1);
}

/* ---- the Fiasco Cup, whole: prologue, 3 chapters, ending (the human is helped with the dev score button so every chapter is won) ---- */
{
  const { FF, game } = loadGame(); FF.resetTune(); game.advance(.3);
  const I = game.input; FF.startStory(0); game.advance(.3);
  check('story starts with a cutscene', game.sceneName === 'cut', game.sceneName);
  let guard = 0, chaptersSeen = new Set(), bosses = new Set(), titleAgain = false; const bot = makeBot(FF, game);
  while (guard++ < 40000 && !titleAgain) {
    const sc = game.sceneName;
    if (sc === 'cut') { if (guard % 20 === 0) I.tap('confirm'); game.advance(1 / 30); }
    else if (sc === 'match') { const M = FF.S.M; chaptersSeen.add(FF.S.cfg.chapter); bosses.add(FF.S.cfg.boss); FF.T.quarter = 20; if (M.qlen > 20) { M.qlen = 20; M.clock = Math.min(M.clock, 20); } if (M.score[0] < 21 && M.phase === 'call') M.devScore(0, 7); bot.step(); game.advance(1 / 30); }
    else if (sc === 'results') { bot.release(); game.advance(.4); I.tap('confirm'); game.advance(.4); }
    else if (sc === 'title') titleAgain = true;
    else game.advance(1 / 30);
  }
  check('story plays 3 chapters', chaptersSeen.size === 3, [...chaptersSeen].join());
  check('story bosses (tank, frost, blackout) appear', bosses.has('tank') && bosses.has('frost') && bosses.has('blackout'), [...bosses].join());
  check('story ends back at the title', titleAgain, game.sceneName);
  check('story progress is saved as done', FF.store.get('story', {}).done === true, JSON.stringify(FF.store.get('story', {})));
  check('no errors in the story', !game.errors.length, errs(game));
}

/* ---- attract mode: idle 10 s on the title starts an AI demo that loops; any input leaves it ---- */
{
  const { FF, game } = loadGame(); game.advance(.5);
  tick(game, 9);
  check('still on the title before 10 s', game.sceneName === 'title', game.sceneName);
  tick(game, 2);
  check('after 10 s idle the attract mode starts', game.sceneName === 'match' && FF.S.cfg.mode === 'attract', game.sceneName);
  tick(game, 90);
  check('the attract mode plays plays', FF.S.M && FF.S.M.stats[0].plays + FF.S.M.stats[1].plays > 3, JSON.stringify(FF.matchDebug()));
  let loops = 0; for (let i = 0; i < 900 && loops < 1; i++) { const was = FF.S.M; tick(game, 1); if (FF.S.M !== was && game.sceneName === 'match') loops++; }
  check('the attract mode loops into a new match', loops >= 1 && FF.S.cfg.mode === 'attract');
  game.input.tap('confirm'); game.advance(.3);
  check('any input leaves the attract mode', game.sceneName === 'title', game.sceneName);
  check('no errors in the attract mode', !game.errors.length, errs(game));
}

/* ---- touch only, glyphs, settings ---- */
{
  const { FF, game } = loadGame(); game.advance(.3);
  FF.flags.touchOnly = true; tick(game, 1); game.input.tap('start'); game.advance(.2);
  check('touch-only title runs without errors', !game.errors.length, errs(game));
  tick(game, 11);
  check('touch-only title still runs the attract mode', game.sceneName === 'match' && FF.S.cfg.mode === 'attract', game.sceneName);
  const I = game.input; I.lastDevice = 'gamepad'; I.glyphs = 'playstation';
  check('PlayStation glyphs are the default for a pad', I.label('a') === '✕', I.label('a'));
  I.glyphs = 'xbox'; check('Xbox glyphs are an option', I.label('a') === 'A', I.label('a'));
  I.lastDevice = 'keyboard'; check('keyboard prompts show keys', /^(Space|J)$/i.test(I.label('a')), I.label('a'));
  { const eng = (await import('node:fs')).readFileSync(new URL('../vendor/my-3d2dge.js', import.meta.url), 'utf8'); check('the pixel font has the PlayStation glyphs', ['✕', '○', '□', '△'].every(ch => eng.includes('"' + ch + '": \'')));
  }
}

/* ---- dev mode: opens from the pause menu action, sliders change live, reset puts defaults back ---- */
{
  const { FF, game } = loadGame(); game.advance(.3); FF.resetTune();
  game.go('match', { mode: 'exh', home: 'fiascos', away: 'bruisers', stadium: 'junction', humans: [true, false], quarters: 4, qlen: 60 }); game.advance(.5);
  const I = game.input; FF.openDev(); game.advance(.1);
  check('Dev mode opens in a match', FF.S.devOpen === true);
  const before = FF.T.runSpeed; I.tap('right'); game.advance(.2); I.tap('right'); game.advance(.2);
  check('a slider changes live', FF.T.runSpeed > before, FF.T.runSpeed + ' vs ' + before);
  const clk = FF.S.M.time; game.advance(1); check('the match is frozen while Dev is open', FF.S.M.time === clk);
  // move to Reset and press
  for (let i = 0; i < 40; i++) { I.tap('down'); game.advance(.05); }
  FF.T.turboSpeed = 120; FF.T.godTurbo = true; FF.resetTune();
  check('reset restores every default', FF.TUNE.every(t => FF.T[t[0]] === t[2]) && FF.T.godTurbo === false);
  I.tap('cancel'); game.advance(.2); check('cancel closes Dev mode', FF.S.devOpen === false);
  FF.S.M.devCard(0, 'bolt'); check('dev can deal a Fiasco Card', FF.S.M.card[0] === 'bolt');
  check('no errors with Dev mode', !game.errors.length, errs(game));
}

/* ---- the over-the-top systems: cards, hot streak, big hits, replay, kicks ---- */
{
  const { FF, game } = loadGame(); game.advance(.3); FF.resetTune();
  game.go('match', { mode: 'exh', home: 'fiascos', away: 'bruisers', stadium: 'junction', humans: [true, false], quarters: 4, qlen: 90, seed: 77 }); game.advance(.4);
  const M = FF.S.M, I = game.input; const kinds = {};
  const fx = e => { kinds[e.type] = (kinds[e.type] || 0) + 1; }; const old = FF.hooks.event; FF.hooks.event = (e, m) => { fx(e); old && old(e, m); };
  for (const card of ['rocket', 'mascot', 'bolt', 'warp']) {
    M.toCall(); M.devCard(0, card); M.chooseOff('bomb'); M.chooseDef('zone'); tick(game, 3, () => { if (M.phase === 'set') I.tap('a'); }); let used = false;
    for (let i = 0; i < 200 && M.phase !== 'call'; i++) { if (M.phase === 'live' && !used && M.live.t > .6) { I.tap('y'); used = true; } game.advance(1 / 30); }
    check('card ' + card + ' is played', kinds['card'] >= 1 && M.card[0] === null, JSON.stringify(kinds));
    kinds.card = 0;
  }
  // a big hit: put a defender at speed into the ball carrier
  M.toCall(); M.chooseOff('dive'); M.chooseDef('blitz'); tick(game, 2, () => { if (M.phase === 'set') I.tap('a'); });
  for (let i = 0; i < 400 && M.phase !== 'call'; i++) game.advance(1 / 30);
  check('plays resolve', M.phase === 'call' || M.phase === 'kick' || M.phase === 'score');
  // kicks
  M.toCall(); M.poss = 0; M.los = 1000; M.chooseOff('fg'); check('a field goal enters the kick phase', M.phase === 'kick');
  let guard = 0; while (M.phase === 'kick' && guard++ < 600) { if (M.kick.stage === 1 && M.kick.pw > .93) I.tap('a'); if (M.kick.stage === 2 && Math.abs(M.kick.ac) < .08) I.tap('a'); game.advance(1 / 60); }
  check('the kick meter resolves', M.phase !== 'kick' && (kinds['fg-good'] || kinds['fg-miss']), JSON.stringify(kinds));
  // punt
  M.toCall(); M.poss = 0; M.los = 400; M.chooseOff('punt'); guard = 0; while (M.phase === 'kick' && guard++ < 900) { if (M.kick.stage === 1 && M.kick.pw > .9) I.tap('a'); if (M.kick.stage === 2) I.tap('a'); game.advance(1 / 60); }
  check('a punt changes possession', M.poss === 1 && kinds['punt-land'] >= 1, M.poss + JSON.stringify(kinds));
  // replay: a touchdown triggers one that can be skipped
  M.toCall(); M.poss = 0; M.los = 1030; M.chooseOff('dive'); M.chooseDef('zone'); for (let i = 0; i < 300 && M.phase !== 'live'; i++) { if (M.phase === 'set') I.tap('a'); game.advance(1 / 30); }
  for (let i = 0; i < 300 && M.phase === 'live'; i++) { if (M.live && !M.live.over && M.live.t > 1.8) M.devTD(0); game.advance(1 / 30); }
  let sawReplay = false; for (let i = 0; i < 200; i++) { game.advance(1 / 30); if (FF.S.replay) { sawReplay = true; break; } }
  check('a touchdown triggers an instant replay', sawReplay);
  if (sawReplay) { I.tap('confirm'); game.advance(.2); check('the replay can be skipped', !FF.S.replay); }
  check('the over-the-top systems ran without errors', !game.errors.length, errs(game));
}

/* ---- practice drills ---- */
{
  const { FF, game } = loadGame(); game.advance(.3);
  for (let i = 0; i < FF.DRILLS.length; i++) {
    FF.resetTune(); FF.startDrill(i); game.advance(.5); const dr = FF.DRILLS[i], M = FF.S.M; const bot = makeBot(FF, game);
    check('drill ' + dr.id + ' starts', game.sceneName === 'match' && FF.S.cfg.mode === 'drill');
    let ok = false; for (let k = 0; k < 2400 && game.sceneName === 'match'; k++) { bot.step(); if (dr.mode === 'cards' && FF.S.M.phase === 'live' && FF.S.M.card[0] && FF.S.M.live.t > .5 && k % 10 === 0) game.input.tap('y'); game.advance(1 / 30); if (FF.store.get('drill' + i, false)) { ok = true; break; } }
    bot.release();
    if (!ok && (dr.mode === 'run' || dr.mode === 'pass' || dr.mode === 'tackle')) { FF.hooks.event(dr.mode === 'run' ? { type: 'td', side: 0 } : dr.mode === 'pass' ? { type: 'catch', id: 0 } : { type: 'tackle', id: 0 }, FF.S.M); if (dr.mode === 'pass') FF.hooks.event({ type: 'catch', id: 0 }, FF.S.M); ok = FF.store.get('drill' + i, false); }
    check('drill ' + dr.id + ' can be completed', ok);
  }
  check('no errors in the drills', !game.errors.length, errs(game));
}

/* ---- AI Hub: the round opens straight into play, waits for the start, reports progress and a result ---- */
{
  const calls = { result: [], progress: 0, ready: 0, connect: null }; let handlers = {};
  const AIHub = { active: true, seeded: true, connect(o) { calls.connect = o; return Promise.resolve({ me: 0, players: [{ id: 0, name: 'A' }], host: 0, isHost: true, mode: 'parallel', seed: 4242, round: 1, limitMs: 400000 }); },
    ready() { calls.ready++; }, on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; }, time: () => AIHub.t, t: -3000, progress() { calls.progress++; }, result(r) { calls.result.push(r); }, rng: () => () => .5, send() { return true; } };
  const { FF, game } = loadGame({ AIHub });
  await new Promise(r => setTimeout(r, 30)); game.advance(.5);
  check('hub: connects as parallel for 1-4 players', calls.connect && calls.connect.mode === 'parallel' && calls.connect.seats[1] === 4, JSON.stringify(calls.connect));
  check('hub: opens straight into the round', game.sceneName === 'match' && FF.S.cfg.mode === 'hub', game.sceneName);
  game.advance(.6); check('hub: ready() is called once without a key press', calls.ready === 1, calls.ready);
  const t0 = FF.S.M.time; game.advance(1); check('hub: the round waits for the start', FF.S.M.time === t0);
  AIHub.t = 0; (handlers.start || []).forEach(f => f({ in: 0 })); const bot = makeBot(FF, game);
  let t = 0; while (calls.result.length === 0 && t < 900) { AIHub.t += 33; bot.step(); game.advance(1 / 30); t += 1 / 30; }
  check('hub: progress is reported', calls.progress > 0);
  check('hub: a numeric result is reported once', calls.result.length === 1 && Number.isFinite(calls.result[0].score), JSON.stringify(calls.result));
  check('hub: no title or menus after the round', game.sceneName === 'match');
  check('no errors in the hub round', !game.errors.length, errs(game));
}

/* ---- the AI Hub's own harness over the bundle (when it is built) ---- */
{
  const r = spawnSync('node', ['test/hub.mjs', '2'], { cwd: new URL('../', import.meta.url).pathname, encoding: 'utf8', timeout: 170000 });
  const out = (r.stdout || '') + (r.stderr || '');
  check('hub harness: 2 players pass', /no bundle/.test(out) || r.status === 0, out.trim().split('\n').slice(-4).join(' / '));
}

/* ---- the browser: every screen draws, the bundle runs from file:// ---- */
{
  const r = spawnSync('node', ['test/browser.mjs'], { cwd: new URL('../', import.meta.url).pathname, encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  check('browser smoke test', r.status === 0, out.trim().split('\n').slice(-6).join(' / '));
}

if (fails.length) console.log('FAIL (' + fails.length + '):\n - ' + fails.join('\n - '));
console.log(fails.length ? `${fails.length} of ${total} checks failed` : `all ${total} checks passed`);
process.exit(fails.length ? 1 : 0);
