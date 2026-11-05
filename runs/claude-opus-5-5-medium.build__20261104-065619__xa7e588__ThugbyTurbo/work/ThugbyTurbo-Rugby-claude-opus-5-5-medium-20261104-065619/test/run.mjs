// node test/run.mjs [--only suite]: rebuilds, runs every headless suite, prints only failures and one line
import { build } from '../build.mjs';
import { load } from './lib/load.mjs';
import { readFileSync } from 'node:fs';
const t0 = Date.now();
build({ quiet: true });
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const suites = {};
let pass = 0, fail = 0, nSuites = 0;
const suite = (name, fn) => { suites[name] = fn; };
const LIST = process.argv.includes('--list');
const check = (name, c, ok, msg) => { if (ok) { pass++; if (LIST) console.log(`ok   ${name} › ${c}`); } else { fail++; console.log(`FAIL ${name} › ${c}: ${String(msg == null ? '' : msg).split('\n').slice(0, 3).join(' | ').slice(0, 400)}`); } };
const STEP = 1 / 120;
/** a fresh game, an Exhibition-style match with options, and helpers */
function fresh(o = {}) {
  const env = load(o.load || {});
  const { game, TT } = env;
  const ev = {}; TT.bus.on('*', (d, n) => { ev[n] = (ev[n] || 0) + 1; });
  const run = (secs, until) => { for (let i = 0; i < secs * 120; i++) { game.advance(STEP); if (until && until()) return true; } return false; };
  return Object.assign(env, { ev, run, M: () => env.ctx.__thugby.M });
}
function matchEnv(opts = {}, o = {}) {
  const e = fresh(o);
  e.game.go('match', Object.assign({ home: 'mud', away: 'gul', venue: 'park', seed: 7, seats: [], halfLength: 40, skipIntro: true }, opts), { fade: 0 });
  e.game.advance(STEP * 2);
  return e;
}
const sim = (e, secs, until) => { const M = e.M(), TT = e.TT; for (let i = 0; i < secs * 120; i++) { const it = TT.control.collect(STEP); TT.sim.step(STEP, it); if (until && until(M)) return true; } return false; };

suite('boot', () => {
  const e = fresh(); const { game, TT } = e;
  check('boot', 'title scene', game.debug.snapshot().scene === 'title', game.debug.snapshot().scene);
  for (const [sc, d] of [['menu'], ['cup'], ['training', {}], ['records', {}], ['about'], ['credits'], ['join', { mode: 'exhibition' }], ['setup'], ['story', { id: 'prologue' }], ['card', { demo: true }], ['results', { home: 'mud', away: 'bad', score: [10, 5], winner: 0, stats: [{ tries: 2, bigHits: 1, metres: 300, poss: 60 }, { tries: 1, bigHits: 0, metres: 100, poss: 40 }], potm: { team: 'mud', idx: 6, tries: 2, tackles: 3, metres: 40 }, seats: [0], hit: 5, tries: 2, venue: 'park' }], ['title']]) {
    if (sc === 'cup') TT.cupNew();
    game.go(sc, d, { fade: 0 }); game.advance(.5);
    check('boot', 'scene ' + sc, game.debug.snapshot().scene === sc && game.errors.length === 0, (game.errors[0] && (game.errors[0].stack || game.errors[0].message)) || game.debug.snapshot().scene);
  }
  const snap = matchEnv().game.debug.snapshot();
  for (const k of ['scene', 'phase', 'score', 'ball', 'players', 'ref', 'hype']) check('boot', 'snapshot ' + k, k in snap);
  const html = readFileSync(new URL('../../ThugbyTurbo-Rugby-claude-opus-5-5-medium-20261104-065619.html', import.meta.url), 'utf8');
  const head = html.slice(0, html.indexOf('</head>')), firstScript = head.indexOf('<script>');
  const client = readFileSync(new URL('../vendor/aihub-session.js', import.meta.url), 'utf8');
  check('boot', 'session client first in head', firstScript > 0 && head.indexOf('<meta charset="utf-8">') < firstScript && head.slice(firstScript + 8, firstScript + 8 + 40) === client.slice(0, 40));
  check('boot', 'session client unmodified', html.includes(client.replace(/<\/script/gi, '<\\/script')));
  for (const t of ['hub:session"', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes']) check('boot', 'tag ' + t, head.includes(t));
  check('boot', 'title tag', head.includes('<title>Thugby Turbo</title>'));
  check('boot', 'about pages', e.TT.ABOUT.length === 5 && e.TT.ABOUT.every(p => p.lines.length), String(e.TT.ABOUT.length));
  const xi = JSON.parse(readFileSync(new URL('../../exit-interview.json', import.meta.url), 'utf8')), asc = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e]/g, '');
  const pageText = i => e.TT.ABOUT[i].lines.join(' ');
  check('boot', 'About shows every Source Information answer', Object.values(xi.sourceInformation).every(v => pageText(1).includes(asc(v).slice(0, 40))));
  check('boot', 'About shows every feedback answer', [[2, xi.testingFeedback], [3, xi.engineFeedback], [4, xi.promptFeedback]].every(([i, l]) => l.every(a => pageText(i).includes(asc(a).slice(0, 40)))));
  check('boot', 'the shipped HTML carries the same About text', html.includes(JSON.stringify(e.TT.ABOUT).slice(0, 200)));
});

suite('ai', () => {
  let tries = 0, n = 0, issues = [];
  const cover = {};
  for (let s = 1; s <= 8; s++) {
    const e = matchEnv({ seed: s * 13, home: ['mud', 'gul', 'irn', 'bad'][s % 4], away: ['meg', 'bad', 'mud', 'gul'][s % 4], venue: ['park', 'docks', 'furnace', 'dome'][s % 4], halfLength: 30 });
    const M = e.M(); e.run(400, () => M.over);
    n++; tries += M.stats[0].tries + M.stats[1].tries;
    for (const k of Object.keys(e.ev)) cover[k] = 1;
    if (!M.over) issues.push('seed ' + s + ' not over (' + M.phase + ')');
    if (M.watchdogs) issues.push('seed ' + s + ' watchdog');
    if (e.game.errors.length) issues.push('seed ' + s + ' error ' + (e.game.errors[0].stack || e.game.errors[0]));
    if (M.score[0] > 80 || M.score[1] > 80) issues.push('seed ' + s + ' score ' + M.score);
  }
  check('ai', 'matches end cleanly', !issues.length, issues.join('; '));
  check('ai', 'tries per match 1-14', tries / n >= 1 && tries / n <= 14, (tries / n).toFixed(1));
  for (const k of ['pass', 'tackle', 'ruck', 'kick', 'try', 'conversion', 'lineBreak']) check('ai', 'CPU does ' + k, cover[k], '');
  check('ai', 'set pieces happen', cover.scrum || cover.lineout, '');
});

suite('laws', () => {
  let e = matchEnv(); let M = e.M(), TT = e.TT;
  sim(e, 3, m => m.phase === 'play');
  // a forward pass is whistled: scrum to the other side
  const p = M.players[3], r = M.players[4]; TT.sim.giveBall(3); p.x = 600; p.y = 384; r.x = 700; r.y = 384; p.vx = 0;
  e.ctx.__thugby.TT.sim.actions; // (exists)
  const b = M.ball; b.st = 'air'; b.kind = 'pass'; b.holder = -1; b.from = 3; b.team = 0; b.target = 4; b.forward = true; b.x = 610; b.y = 384; b.z = 12; b.vx = 200; b.vy = 0; b.vz = 30; b.tried = {};
  sim(e, 3, m => m.phase === 'scrum');
  check('laws', 'forward pass -> scrum to the other team', M.phase === 'scrum' && M.ph.team === 1, M.phase + ' ' + (M.ph && M.ph.team));
  // scoring values
  e = matchEnv(); M = e.M(); TT = e.TT; sim(e, 3, m => m.phase === 'play');
  TT.force('tryHome'); check('laws', 'try = 5', M.score[0] === 5, M.score);
  sim(e, 30, m => m.phase === 'setkick'); check('laws', 'conversion follows a try', M.phase === 'setkick' && M.ph.kind === 'conv');
  check('laws', 'conversion in line with the grounding', Math.abs(M.ph.ky - M.ph.y) < 1 && Math.abs(M.ph.y - (384 + 40)) < 2, M.ph.y);
  sim(e, 30, m => m.phase === 'kickoff'); check('laws', 'scoring team kicks off', M.phase === 'kickoff' && M.ph.team === 0, M.phase + ' ' + M.ph.team);
  check('laws', 'conversion 0 or 2', M.score[0] === 5 || M.score[0] === 7, M.score);
  // drop goal: 3
  e = matchEnv({ seed: 3 }); M = e.M(); TT = e.TT; sim(e, 3, m => m.phase === 'play');
  TT.force('dropGoal'); sim(e, 4, m => m.score.some(v => v > 0));
  check('laws', 'drop goal = 3 (straight, 30 m)', M.score.includes(3), M.score);
  // knock-on: scrum to the other side
  e = matchEnv({ seed: 4 }); M = e.M(); TT = e.TT; sim(e, 3, m => m.phase === 'play');
  TT.force('knockOn'); const off = M.possession; sim(e, 3, m => m.phase === 'scrum'); check('laws', 'knock-on -> scrum to the other team', M.phase === 'scrum' && M.ph.team === 1 - off);
  // the hooter waits for a stoppage
  e = matchEnv({ seed: 5 }); M = e.M(); TT = e.TT; sim(e, 3, m => m.phase === 'play'); M.clock = M.halfLen - .1; sim(e, .5);
  check('laws', 'hooter sounds, play goes on', M.hooter && (M.phase === 'play' || M.phase === 'ruck'), M.phase);
  sim(e, 60, m => m.phase === 'half'); check('laws', 'half ends at the next stoppage', M.phase === 'half', M.phase);
  // penalty try = 7
  e = matchEnv({ seed: 6 }); M = e.M(); TT = e.TT; sim(e, 3, m => m.phase === 'play');
  const c = M.players[6]; TT.sim.giveBall(6); c.x = TT.sim.tryLineOf(0) - 30; c.y = 384; for (const q of M.players) if (q.team === 1) { q.x = c.x - 60; }
  M.cheats.refStrict = true; const v = M.players[8]; v.x = c.x - 10; v.y = c.y; v.facing = 0; v.power = { kind: 'iron', t: 9 }; TT.sim.tackleTry(v, 'big', 1, true);
  check('laws', 'penalty try = 7 (a high shot near the line)', M.score[0] === 7, M.score);
  // sudden death: the first score wins
  e = matchEnv({ seed: 8, suddenDeath: true }); M = e.M(); TT = e.TT; sim(e, 3, m => m.phase === 'play'); TT.force('sudden');
  check('laws', 'level at full time: sudden death', M.suddenDeath, M.phase);
  sim(e, 3, m => m.phase === 'play'); TT.force('tryAway'); sim(e, 4);
  check('laws', 'sudden death ends on the first score', M.over && M.winner === 1, M.phase + ' ' + M.winner);
});

suite('contact', () => {
  const e = matchEnv({ seed: 9 }), M = e.M(), TT = e.TT; sim(e, 3, m => m.phase === 'play');
  // the tackle chance matches its formula over many seeded tries
  const t = M.players[8], c = M.players[5]; let ok = 0, want = 0; const N = 300;
  for (let i = 0; i < N; i++) {
    TT.sim.setPhase('play'); for (const p of M.players) { p.st = 'run'; p.evade = 0; p.fendT = 0; p.power = null; p.fire = 0; }
    TT.sim.giveBall(5); c.x = 600; c.y = 384; c.facing = 0; t.x = 610; t.y = 384; t.facing = Math.PI; c.vx = c.vy = 0;
    want += TT.sim.tackleChance(t, c, 'tackle'); TT.sim.tackleTry(t, 'tackle'); if (c.st === 'tackled') ok++;
  }
  check('contact', 'tackle success within 6% of the formula', Math.abs(ok / N - want / N) < .06, (ok / N).toFixed(2) + ' vs ' + (want / N).toFixed(2));
  // a monster hit launches the carrier
  TT.sim.setPhase('play'); for (const p of M.players) p.st = 'run'; TT.sim.giveBall(5); c.x = 600; c.y = 384; t.x = 610; t.y = 384; t.facing = Math.PI;
  const x0 = c.x; TT.sim.tackleTry(t, 'big', 1, false);
  check('contact', 'monster hit launches', c.st === 'launched', c.st);
  sim(e, 2, () => c.st !== 'launched'); check('contact', 'launched beyond 30 u', Math.abs(c.x - x0) > 25, Math.abs(c.x - x0).toFixed(0));
  // a sidestep makes a tackle whiff
  TT.sim.setPhase('play'); for (const p of M.players) p.st = 'run'; TT.sim.giveBall(5); c.x = 600; c.y = 384; t.x = 610; t.y = 384; c.evade = .2; c.evadeKind = 'step';
  TT.sim.tackleTry(t, 'tackle'); check('contact', 'sidestep beats a tackle', c.st !== 'tackled', c.st);
  // BIG UNIT needs two tacklers
  const e2 = matchEnv({ home: 'meg', away: 'mud', seed: 10 }), M2 = e2.M(), T2 = e2.TT; sim(e2, 3, m => m.phase === 'play');
  const boss = M2.players[0], a1 = M2.players[8], a2 = M2.players[9];
  T2.sim.giveBall(0); boss.x = 600; boss.y = 384; a1.x = 610; a1.y = 384; a1.facing = Math.PI; a1.power = { kind: 'iron', t: 9 };
  T2.sim.tackleTry(a1, 'tackle'); check('contact', 'one tackler only holds the boss', boss.st === 'held', boss.st);
  a2.x = 594; a2.y = 384; a2.facing = 0; a2.power = { kind: 'iron', t: 9 }; T2.sim.tackleTry(a2, 'tackle'); check('contact', 'a second tackler brings him down', boss.st === 'tackled' || boss.st === 'launched', boss.st);
  // a cheap shot: called when the ref sees it, not when he's looking away
  const e3 = matchEnv({ seed: 11 }), M3 = e3.M(), T3 = e3.TT; sim(e3, 3, m => m.phase === 'play');
  const h = M3.players.find(p => p.id === M3.ball.holder) || M3.players[4]; T3.sim.giveBall(h.id);
  const vic = M3.players.find(p => p.team === h.team && p !== h), cs = M3.players.find(p => p.team !== h.team);
  vic.x = 400; vic.y = 300; cs.x = 410; cs.y = 300; cs.facing = Math.PI; h.x = 900; h.y = 500;
  M3.ref.x = 400; M3.ref.y = 450; M3.ref.facing = -Math.PI / 2; M3.ref.down = 0;
  const before = e3.ev.foul || 0; T3.sim.tackleTry(cs, 'tackle'); sim(e3, .5);
  check('contact', 'seen cheap shot is a foul', (e3.ev.foul || 0) > before);
  T3.sim.setPhase('play'); for (const p of M3.players) p.st = 'run'; M3.adv = null; T3.sim.giveBall(h.id);
  vic.x = 400; vic.y = 300; cs.x = 410; cs.y = 300; M3.ref.facing = Math.PI / 2; M3.ref.x = 400; M3.ref.y = 450; h.x = 900;
  const f2 = e3.ev.foul || 0, u2 = e3.ev.cheapUnseen || 0; T3.sim.tackleTry(cs, 'tackle'); sim(e3, .5);
  check('contact', 'unseen cheap shot is not called', (e3.ev.foul || 0) === f2 && (e3.ev.cheapUnseen || 0) > u2);
});

suite('setpieces', () => {
  let e = matchEnv({ seed: 12 }), M = e.M(), TT = e.TT;
  TT.sp.scrum(0, 600, 384, 'test'); M.diff = [TT.DIFF.Legend, TT.DIFF.Legend];
  sim(e, 12, m => m.phase === 'play'); check('setpieces', 'a CPU scrum resolves to play', M.phase === 'play' && M.ball.st === 'held', M.phase);
  // early engagement by a human: a free kick to the other side
  e = matchEnv({ seed: 13, seats: [{ team: 0, kind: 'script' }] }); M = e.M(); TT = e.TT;
  TT.sp.scrum(0, 600, 384, 'test'); TT.seats[0].pid = 1; TT.seats[0].kind = 'script';
  sim(e, 1.6); TT.seats[0].intent = Object.assign(TT.blankIntent(), { p: { x: true } }); sim(e, 1 / 60); TT.seats[0].intent = TT.blankIntent();
  sim(e, 3, m => m.phase === 'penalty'); check('setpieces', 'early engagement -> free kick to the other team', M.phase === 'penalty' && M.ph.free && M.ph.team === 1, M.phase);
  // the lineout: not straight
  e = matchEnv({ seed: 14, seats: [{ team: 0, kind: 'script' }] }); M = e.M(); TT = e.TT; TT.seats[0].kind = 'script';
  TT.sp.lineout(0, 600, 0); sim(e, 4, m => m.sub === 'throw');
  sim(e, 1, m => Math.abs(m.ph.needle) > .9); TT.seats[0].intent = Object.assign(TT.blankIntent(), { p: { x: true } }); sim(e, 1 / 60); TT.seats[0].intent = TT.blankIntent();
  sim(e, 3, m => m.phase === 'scrum'); check('setpieces', 'not straight -> scrum to the other team', M.phase === 'scrum' && M.ph.team === 1, M.phase);
  // penalty choices lead to the right restarts
  for (const [k, want] of [['tap', 'play'], ['goal', 'setkick'], ['touch', 'play']]) {
    e = matchEnv({ seed: 15, seats: [{ team: 0, kind: 'script' }] }); M = e.M(); TT = e.TT; TT.seats[0].kind = 'script';
    TT.sp.penalty(0, 900, 384, 'test'); sim(e, .7); const i = M.ph.opts.findIndex(o => o[0] === k);
    TT.seats[0].intent = Object.assign(TT.blankIntent(), { pick: i }); sim(e, 1 / 60); TT.seats[0].intent = TT.blankIntent();
    check('setpieces', 'penalty ' + k + ' -> ' + want, M.phase === want, M.phase);
    if (k === 'touch') { sim(e, 6, m => m.phase === 'lineout'); check('setpieces', 'kick for touch -> our lineout', M.phase === 'lineout' && M.ph.team === 0, M.phase + ' ' + (M.ph && M.ph.team)); }
  }
});

suite('arcade', () => {
  const e = matchEnv({ seed: 16, venue: 'docks' }), M = e.M(), TT = e.TT; sim(e, 3, m => m.phase === 'play');
  for (const k of ['pie', 'iron', 'boot', 'grease', 'horn']) {
    TT.arc.spawnPowerup(k); sim(e, 1.3); const pu = M.pu; const p = M.players.find(q => q.team === 0 && q.st === 'run');
    if (pu) { p.x = pu.x; p.y = pu.y; } sim(e, .1);
    check('arcade', 'power-up ' + k + ' taken', (e.ev.powerupTake || 0) >= 1 && !M.pu, '');
    e.ev.powerupTake = 0;
  }
  TT.arc.spawnPowerup('pie'); sim(e, 1.3); for (const p of M.players) { p.x = 50; } sim(e, 16); check('arcade', 'power-up expires after 15 s', !M.pu);
  for (const [k, evn] of [['chicken', 'chicken'], ['flames', 'flame'], ['lightning', 'lightning']]) { M.hazards.length = 0; TT.arc.trigger(k); const mine = M.hazards.slice(); sim(e, 7); check('arcade', 'hazard ' + k + ' warns, strikes and clears', e.ev[evn] >= 1 && mine.every(h => !M.hazards.includes(h)) && e.game.errors.length === 0, JSON.stringify(M.hazards.map(h => h.kind))); }
  // supers
  sim(e, 3, m => m.phase === 'play' && m.ball.st === 'held');
  TT.force('thunder'); const c = M.players[M.ball.holder]; check('arcade', 'thunder run starts', c.superK === 'thunder');
  sim(e, 6); check('arcade', 'thunder run ends', c.superK === '');
  // ON FIRE: two tries in a row by the same player, ended by the other side scoring
  const e2 = matchEnv({ seed: 17 }), M2 = e2.M(), T2 = e2.TT; sim(e2, 3, m => m.phase === 'play');
  const s = M2.players[6]; for (let k = 0; k < 2; k++) { T2.sim.setPhase('play'); T2.sim.giveBall(6); s.x = T2.sim.tryLineOf(0) + 20; T2.sim.tryScored(6); }
  check('arcade', 'ON FIRE on the second try', s.fire > 0);
  T2.sim.setPhase('play'); T2.force('tryAway'); check('arcade', 'ON FIRE ends when they score', s.fire === 0);
  // ref down silences fouls
  T2.sim.setPhase('play'); T2.sim.refDown(); check('arcade', 'ref down sees nothing', !T2.sim.refSees(M2.players[0]));
  // hype gains
  const h0 = M2.hype[0]; T2.sim.addHype(0, 10); check('arcade', 'hype rises', M2.hype[0] === Math.min(100, h0 + 10));
});

suite('drills', () => {
  for (const d of ['legs', 'hands', 'feet', 'hit', 'ruck', 'boot', 'set', 'posts', 'turbo']) {
    const e = fresh(); const { game, TT } = e;
    game.go('match', { drill: d, home: 'mud', away: 'bad', venue: 'park', weather: 'clear', time: 'day', seats: [{ input: game.input, team: 0 }], seed: 5 }, { fade: 0 });
    game.advance(STEP * 2);
    const M = e.M(); TT.seats[0].kind = 'script'; TT.seats[0].showMe = true; M.drill.showMe = true;
    M.drill.stay = true;
    const done = e.run(150, () => M.drill.done);
    check('drills', d + ' completes by its auto script', done && game.errors.length === 0, JSON.stringify(M.drill.n) + ' ' + M.phase + ' ' + (game.errors[0] ? game.errors[0].stack : ''));
  }
});

suite('attract', () => {
  const e = fresh(); const { game, TT } = e;
  e.run(10.6);
  check('attract', '10 s idle on the title starts the demo', game.debug.snapshot().scene === 'match' && game.debug.snapshot().attract, game.debug.snapshot().scene);
  const M = e.M(); e.run(240, () => game.debug.snapshot().scene !== 'match');
  const fired = TT.attract.fired || [];
  check('attract', 'the director shows every step', ['monster', 'jackal', 'knockon', 'touch', 'powerup', 'hazard', 'thunder', 'cheap', 'fire', 'dropgoal'].every(s => fired.includes(s)), fired.join(','));
  check('attract', 'demo ends on the records then the title', ['records', 'title'].includes(game.debug.snapshot().scene), game.debug.snapshot().scene);
  void M;
  for (const how of ['key', 'pad', 'unbound']) {
    const f = fresh(); f.run(10.6);
    check('attract', 'demo running (' + how + ')', f.game.debug.snapshot().scene === 'match');
    f.run(1);
    const code = how === 'key' ? 'KeyQ' : how === 'pad' ? 'Pad3' : 'KeyX'; f.game.input.press(code);
    f.game.advance(STEP); f.game.input.release(code); f.run(1);
    check('attract', 'a ' + how + ' returns to the title', f.game.debug.snapshot().scene === 'title', f.game.debug.snapshot().scene);
  }
  check('attract', 'no errors', game.errors.length === 0, game.errors[0] && game.errors[0].stack);
});

suite('dev', () => {
  const e = matchEnv({ seed: 18, seats: [{ team: 0 }] }), { game, TT } = e, M = e.M();
  TT.dev.openPanel(); check('dev', 'panel opens', TT.dev.open && TT.dev.frozen);
  TT.TUNE.set('runSpeed', 150); check('dev', 'slider sets the live value', TT.TUNE.v.runSpeed === 150);
  TT.dev.close(); sim(e, 3, m => m.phase === 'play');
  const p = M.players[6]; TT.sim.setPhase('play'); p.st = 'run'; p.vx = 0;
  const it = Object.assign(TT.blankIntent(), { mx: 1 }); for (let i = 0; i < 120; i++) TT.sim.playersStep(STEP, false), M.intents = { 6: it }, M.intents[6] = it;
  const fast = Math.abs(p.vx);
  TT.TUNE.reset(); check('dev', 'reset restores every default', TT.TUNE.changed().length === 0);
  check('dev', 'run speed slider changes the measured speed', fast > 100 * 1.15, fast.toFixed(0));
  for (const [k] of TT.dev.EVENTS) { const [n, v] = k.split(':'); const o = {}; if (v != null) { if (isNaN(+v)) o.kind = v; else o.n = +v; } try { TT.sim.setPhase('play'); TT.sim.giveBall(4); TT.force(n, o); sim(e, .3); } catch (er) { check('dev', 'event ' + k, false, er.message); } }
  check('dev', 'every event runs without errors', game.errors.length === 0, game.errors[0] && game.errors[0].stack);
  TT.dev.activate({ kind: 'toggle', k: 'god' }); check('dev', 'cheat toggles', TT.devCheats.god && M.cheats.god);
  for (const [k] of TT.dev.JUMPS()) { if (k === 'title') continue; const f = fresh(); f.TT.jump(k); f.game.advance(1); check('dev', 'jump ' + k, f.game.errors.length === 0, f.game.errors[0] && f.game.errors[0].stack); }
});

suite('input', () => {
  const e = fresh(), { game, TT, E } = e, I = game.input;
  I.lastDevice = 'gamepad';
  check('input', 'PlayStation glyphs by default', I.label('x') === '✕' && I.label('ci') === '○', I.label('x'));
  game.settings.set('glyphs', 'xbox'); check('input', 'Xbox glyphs from Settings', I.label('x') === 'A', I.label('x'));
  I.lastDevice = 'keyboard'; check('input', 'keys on the keyboard', I.label('x') === 'Space' && I.label('l1') === 'Q', I.label('x') + ' ' + I.label('l1'));
  const right = E.Input.halfKeys(TT.KEYS, 'right'); check('input', 'right half layout (patch 2)', right.x.includes('Period') && right.l1.includes('KeyK') && right.turbo.includes('Comma'), JSON.stringify(right.x));
  check('input', 'font draws the PlayStation symbols (patch 1)', ['✕', '○', '□', '△'].every(c => E.font.width(c) >= 7), '');
  // four seats join (pads and the keyboard's right half)
  game.addPlayer({ keys: 'right' }); game.addPlayer({ pad: 1 }); game.addPlayer({ pad: 2 });
  check('input', 'four players', game.players.length === 4);
  game.go('match', { home: 'mud', away: 'gul', venue: 'park', seed: 3, skipIntro: true, seats: game.players.map((q, i) => ({ input: q, team: i % 2 })) }, { fade: 0 }); game.advance(.1);
  const M = e.M(); for (let i = 0; i < 120 * 8 && M.phase !== 'play'; i++) game.advance(STEP);
  game.advance(2);
  const pids = TT.seats.map(s => s.pid); check('input', 'each seat drives its own player', new Set(pids).size === 4 && pids.every((id, i) => id >= 0 && M.players[id].team === i % 2), pids.join(','));
});

suite('replay', () => {
  const e = fresh({ load: {} }); const { game, TT } = e; TT.cfg.present = true;
  game.go('match', { home: 'mud', away: 'gul', venue: 'park', seed: 7, seats: [], skipIntro: true }, { fade: 0 }); game.advance(STEP * 2);
  const M = e.M(); e.run(6, () => M.phase === 'play'); e.run(4);
  TT.force('monsterHit'); e.run(1.5);
  check('replay', 'a monster hit plays a replay', TT.replay.playing, '');
  const t = M.t; e.run(1); check('replay', 'the match waits during it', M.t === t);
  e.run(12, () => !TT.replay.playing); check('replay', 'the match resumes after it', !TT.replay.playing && !M.frozen);
  check('replay', 'no errors (with presentation on)', game.errors.length === 0, game.errors[0] && game.errors[0].stack);
});

suite('proof', () => {
  const h = () => { const e = matchEnv({ seed: 7 }); const M = e.M(); sim(e, 600 / 120 * 10); return JSON.stringify([M.score, M.players.map(p => [Math.round(p.x), Math.round(p.y)]), M.ball.st, Math.round(M.ball.x)]); };
  check('proof', 'same seed, same match', h() === h());
});

suite('saves', () => {
  const e = fresh(), { game, TT } = e;
  TT.cupNew(); TT.cup.round = 2; TT.cup.results = [[20, 5], [14, 10]]; TT.cupSave();
  TT.cup = null; check('saves', 'cup saved', TT.cupSaved());
  TT.cupLoad(); check('saves', 'continue resumes at the right round', TT.cup.round === 2 && TT.cup.results.length === 2);
  e.store['my3d2dge:thugby:cup'] = '{bad json'; TT.cup = null; let ok = true; try { TT.cupLoad(); } catch (er) { ok = false; } check('saves', 'a bad save falls back', ok && TT.cup && TT.cup.round === 0);
  TT.unlock('meg'); check('saves', 'unlocks persist', TT.unlocks().meg);
});

suite('playthrough', () => {
  const e = fresh(), { game, TT } = e;
  const scenes = [];
  const sc = () => game.debug.snapshot().scene;
  const press = code => { game.input.press(code); game.advance(STEP); game.input.release(code); game.advance(STEP * 3); };
  e.run(.5); press('Enter'); e.run(.5); check('playthrough', 'title -> menu', sc() === 'menu', sc());
  press('Enter'); e.run(.5); check('playthrough', 'menu -> prologue', sc() === 'story', sc());
  for (let i = 0; i < 60 && sc() === 'story'; i++) { press('Enter'); e.run(.4); }
  check('playthrough', 'prologue -> training (TRAIN)', sc() === 'training', sc());
  press('Escape'); e.run(.5); check('playthrough', 'training -> cup hub', sc() === 'cup', sc());
  TT.settings.set('difficulty', 'Rookie');
  let losses = 0;
  const playMatch = () => { const M = e.M(); M.halfLen = 30; TT.layerTune(M); TT.seats.forEach(s => { s.kind = 'script'; s.auto = true; }); if (TT.cup.round === 3) M.cheats.god = true; e.run(500, () => sc() !== 'match'); };
  for (let round = 0; round < 4 && losses < 4; round++) {
    press('Enter'); e.run(.3);
    for (let i = 0; i < 60 && sc() === 'story'; i++) { press('Escape'); press('KeyR'); e.run(.3); }
    if (sc() !== 'match') { check('playthrough', 'round ' + round + ' reaches the match', false, sc()); return; }
    playMatch();
    while (sc() === 'results' && !TT.scenes.results.won && losses < 4) {
      losses++; e.run(1.2); for (let i = 0; i < 40 && TT.cab.entry; i++) { press('Enter'); e.run(.2); }
      press('Enter'); e.run(.3); if (sc() !== 'match') break; playMatch();
    }
    if (sc() !== 'results') { check('playthrough', 'round ' + round + ' ends in results', false, sc()); return; }
    e.run(1.2); for (let i = 0; i < 40 && TT.cab.entry; i++) { press('Enter'); e.run(.2); }
    check('playthrough', 'initials entered', !TT.cab.entry);
    e.run(.3); press('Enter'); e.run(.5);
    for (let i = 0; i < 80 && sc() === 'story'; i++) { press('Enter'); e.run(.4); }
    if (round < 3) check('playthrough', 'round ' + round + ' won -> cup hub (saved)', sc() === 'cup' && TT.cup.round === round + 1 && TT.cupSaved(), sc() + ' ' + TT.cup.round);
  }
  check('playthrough', 'three losses or fewer', losses < 4, losses);
  check('playthrough', 'victory, third half, credits', sc() === 'credits', sc());
  e.run(48); check('playthrough', 'credits -> title', sc() === 'title', sc());
  check('playthrough', 'cup unlocks the Maulers', TT.unlocks().meg);
  check('playthrough', 'no errors anywhere', game.errors.length === 0, game.errors[0] && game.errors[0].stack);
});

suite('net', async () => {
  const { fakeHub } = await import('./lib/hub.mjs');
  const r = await fakeHub(load, { players: 2 });
  check('net', 'both copies connect and ready', r.ready === 2, r.ready);
  r.start(); r.run(20);
  check('net', 'host sends snapshots', r.sent.s > 50, JSON.stringify(r.sent));
  check('net', 'client sends intents', r.sent.i > 50, JSON.stringify(r.sent));
  check('net', 'client mirrors the host', r.clientMatches(), '');
  check('net', 'snapshots under 1,200 bytes', r.maxSnap < 1200, r.maxSnap);
  check('net', 'client stick moves its player', r.clientMoved(), '');
  check('net', 'client runs its own player at once (local move)', r.clientLocal(), '');
  r.timeUp(); r.run(1);
  check('net', 'time-up finishes once with standings', r.finished === 1 && Array.isArray(r.standings) && r.standings.flat().length === 2, JSON.stringify(r.standings));
  check('net', 'no errors', r.errors() === 0, r.firstError());
});

for (const [name, fn] of Object.entries(suites)) {
  if (only && name !== only) continue;
  nSuites++;
  try { await fn(); } catch (er) { fail++; console.log(`FAIL ${name} › crashed: ${er.stack}`); }
}
console.log(`${pass} passed, ${fail} failed (${nSuites} suites, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
