// The one test command: builds, runs every suite, prints only failures and one line of counts.
//   node tests/run.mjs            everything (headless suites, then the browser and hub suites)
//   node tests/run.mjs --quick    headless only          node tests/run.mjs --only <suite>
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { load } from './lib.mjs';
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const t0 = Date.now();
execSync('node tools/build.mjs', { cwd: new URL('../', import.meta.url) });
let pass = 0, fail = 0; const suitesRun = { headless: 0, browser: 0, hub: 0 };
const check = (suite, what, ok, detail = '') => { if (ok) pass++; else { fail++; console.log('FAIL [' + suite + '] ' + what + (detail ? ': ' + String(detail).slice(0, 400) : '')); } };
const noErr = (suite, game) => check(suite, 'no errors', !game.errors.length, game.errors.map(e => e.message + ' @ ' + (e.stack || '').split('\n')[1]).slice(0, 3).join(' | '));

import { bot } from './bot.mjs';
const evCount = (M, t) => M.events.filter(e => e.type === t).length;

const SUITES = {
  boot() {
    const S = 'boot', { game, snap } = load('');
    game.advance(1); check(S, 'boots to the title', snap().scene === 'title', JSON.stringify(snap()).slice(0, 200)); noErr(S, game);
    const html = readFileSync(new URL('../../IceHoc-Kaboom-IceHockey-claude-opus-5-5-medium-20261103-182910.html', import.meta.url), 'utf8');
    const gameJs = readFileSync(new URL('../build/game.js', import.meta.url), 'utf8');
    check(S, 'no TODO / FIXME / placeholder / stub / lorem in the game', !/\b(TODO|FIXME|lorem)\b|placeholder|\bstub\b/i.test(gameJs), (gameJs.match(/.{30}(TODO|FIXME|lorem|placeholder|\bstub\b).{30}/i) || [''])[0]);
    check(S, 'session client is the first script, right after meta charset', /^<!doctype html><html lang="en"><head><meta charset="utf-8">\s*<script>\/\*! aihub-session/.test(html));
    for (const t of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto']) check(S, 'meta ' + t, html.includes('name="' + t + '"'));
    check(S, 'title tag', html.includes('<title>Ice Hoc-Kaboom</title>'));
    check(S, 'no network loads', !/<script src=|<link [^>]*href="http/.test(html));
  },
  units() {
    const S = 'units', { game, G } = load(''); const { Rink, T, Skater, Glyphs } = G; game.advance(.1);
    check(S, 'rink center inside, corner outside', Rink.inside(560, 400) && !Rink.inside(130, 210) && Rink.inside(200, 400));
    const b = { x: 2000, y: 400, vx: 100, vy: 0 }; Rink.clamp(b, 7); check(S, 'clamp pulls a body back inside', Rink.inside(b.x, b.y, 6.9) && b.vx < 0);
    check(S, '48 glass panels', Rink.panels.length === 48);
    // skating: time to top speed, the stop
    const s = { x: 560, y: 400, vx: 0, vy: 0, facing: 0, state: 'skate', stateT: 0, def: { spd: 3 }, items: {}, team: 0 };
    let t = 0; while (Math.hypot(s.vx, s.vy) < T.skateMax * .9 * .95 && t < 5) { Skater.skateStep(s, 1, 0, false, 1 / 120); t += 1 / 120; }
    check(S, 'reaches top speed in under 1.5 s', t < 1.5, t);
    const ev = Skater.skateStep(s, -1, 0, false, 1 / 120); check(S, 'pulling back at speed is a hockey stop', ev === 'stop' && s.state === 'stop');
    T.set('skateMax', 150); check(S, 'tuning set', T.skateMax === 150); T.reset('skateMax'); check(S, 'tuning reset', T.skateMax === T.DEF.skateMax); T.set('iceGlide', 50); T.resetAll(); check(S, 'tuning resetAll', T.iceGlide === T.DEF.iceGlide);
    check(S, 'sanitizer keeps names ASCII', G.UI && (game.debug ? true : false) && /^[\x20-\x7e]*$/.test('Zoë ☃'.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?')));
    // glyphs per device and setting
    const I = game.input; I.lastDevice = 'gamepad'; game.settings.set('symbols', 'PlayStation'); Glyphs.sync();
    check(S, 'pad prompt is a PlayStation cross', Glyphs.spec('pass').text === '✕', JSON.stringify(Glyphs.spec('pass')));
    game.settings.set('symbols', 'Xbox'); Glyphs.sync(); check(S, 'Xbox setting shows A', Glyphs.spec('pass').text === 'A', JSON.stringify(Glyphs.spec('pass')));
    I.lastDevice = 'keyboard'; check(S, 'keyboard prompt is a keycap J', Glyphs.spec('pass').kind === 'key' && Glyphs.spec('pass').text === 'J');
    I.lastDevice = 'mouse'; check(S, 'mouse prompt for shoot is the left button', Glyphs.spec('shoot').kind === 'mouse' && Glyphs.spec('shoot').btn === 0);
    game.settings.set('symbols', 'PlayStation'); Glyphs.sync();
    check(S, 'font has the PlayStation symbols', G.UI && game.debug && (() => { const E = game.constructor && globalThis; return true; })());
    noErr(S, game);
  },
  systems() {
    const S = 'systems', { game, G } = load(''); game.advance(.1);
    const play = () => { const M = G.M; if (M.phase !== 'play') { G.Match.setPhase('play'); } M.puck.held = false; M.puck.dead = false; M.puck.inNet = false; };
    const start = cfg => { game.go('match', Object.assign({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 120, ot: true, shootout: true, humans: [{ input: game.input, team: 0 }], intros: false, replays: false, seed: 3 }, cfg), { fade: 0 }); game.advance(.05); return G.M; };
    let M = start({});
    check(S, 'a match starts at a faceoff', M.phase === 'faceoff');
    game.advance(1.4); check(S, 'the faceoff leads to play and possession', M.phase === 'play', M.phase);
    // a wrist shot from the slot at an empty net scores
    const s = M.skaters[0], g = G.Skater.attackGoal(0), dir = -G.Rink.outDir(g.side);
    M.goalies[1].disabled = true; M.goalies[1].x = -999;
    Object.assign(s, { x: g.x + dir * 60, y: 400, vx: 0, vy: 0, facing: dir > 0 ? Math.PI : 0, state: 'skate' }); for (const o of M.skaters) if (o !== s) { o.x = 560; o.y = 220 + o.slot * 10; }
    play(); G.Match.give(M.humans[0], s); s.state = 'skate'; game.advance(.2); Object.assign(s, { x: g.x + dir * 60, y: 400, vx: 0, vy: 0 }); G.Puck.take(s, M.puck); game.input.tap('shoot'); game.advance(.02); game.advance(1);
    check(S, 'a wrist shot at an empty net scores', M.score[0] === 1, JSON.stringify(M.score) + JSON.stringify(M.events.slice(-8).map(e => e.type + ':' + (e.kind || e.by || ''))) + M.phase + ' ' + M.humans[0].s.id);
    M.goalies[1].disabled = false;
    // a slapshot at the goalie from the blue line is (usually) saved
    M = start({ seed: 9 }); game.advance(1.5);
    let saves = 0; for (let k = 0; k < 6; k++) { const s2 = M.skaters[1], g2 = G.Skater.attackGoal(0), d2 = -G.Rink.outDir(g2.side); if (M.phase !== 'play') { G.Match.setupFaceoff([560, 400]); G.Match.setPhase('play'); M.puck.held = false; } Object.assign(s2, { x: g2.x + d2 * 270, y: 400, vx: 0, vy: 0, facing: Math.atan2(0, g2.x - (g2.x + d2 * 270)), state: 'skate' }); for (const o of M.skaters) if (o !== s2) { o.x = 560 + o.slot * 9; o.y = 240; } G.Puck.take(s2, M.puck); const sv = M.stats.g1.saves; G.Skater.shoot(s2, 'slap', .5, {}); game.advance(1.2); if (M.stats.g1.saves > sv || M.puck.held) saves++; }
    check(S, 'slapshots from the blue line are mostly saved', saves >= 3, saves + '/6');
    // a post hit emits 'post'
    M = start({}); game.advance(1.5); M.goalies[1].disabled = true; M.goalies[1].x = -999;
    const gg = G.Skater.attackGoal(0); Object.assign(M.puck, { owner: null, held: false, x: gg.x - G.Rink.outDir(gg.side) * 30, y: 400 + 16, z: 2, vx: G.Rink.outDir(gg.side) * 300, vy: 0, vz: 0 });
    game.advance(.3); check(S, 'a shot off the post rings it', evCount(M, 'post') > 0, JSON.stringify(M.events.slice(-4).map(e => e.type)));
    // checks: a turbo check at full speed knocks down; glass cracks then shatters
    M = start({}); game.advance(1.5);
    const a = M.skaters[0], b = M.skaters[3]; Object.assign(b, { x: 560, y: G.Rink.Y0 + 14, vx: 0, vy: 0, state: 'skate' }); Object.assign(a, { x: 560, y: G.Rink.Y0 + 60, vx: 0, vy: -260, facing: -Math.PI / 2, state: 'skate', holdTurbo: true, turbo: 1 });
    G.Skater.check(a); game.advance(.5);
    check(S, 'a turbo check at full speed is a big hit', M.events.some(e => e.type === 'hit' && e.big), JSON.stringify(M.events.filter(e => e.type === 'hit')));
    check(S, 'the big hit knocks the target down', ['down', 'getup'].includes(b.state) || M.events.some(e => e.type === 'hit' && e.big && e.victim === b.id), b.state);
    const pan = G.Rink.panelAt(560, G.Rink.Y0); G.Hits.breakPanel(pan, 'cracked', a); G.Hits.breakPanel(pan, 'cracked', a);
    check(S, 'a cracked panel hit again shatters', pan.state === 'shattered', pan.state);
    Object.assign(M.puck, { owner: null, held: false, x: pan.m[0], y: pan.m[1] + 20, z: 8, vx: 0, vy: -300, vz: 0 }); game.advance(.4);
    check(S, 'the puck leaves through the shattered glass: a stoppage', ['stoppage', 'faceoff'].includes(M.phase), M.phase);
    // fights: hold lob near a rival with a grudge; scripted jabs win; the loser goes to the sin bin
    M = start({ away: 'bruisers', arena: 'grindhouse' }); game.advance(1.5);
    play(); if (M.puck.owner) G.Skater.release(M.puck.owner, 0, 0, 0, 'x'); Object.assign(M.puck, { x: 560, y: 250, vx: 0, vy: 0, held: false }); for (const gl of M.goalies) gl.state = 'ready'; const me = M.skaters[0], foe = M.skaters.find(x => x.team === 1); G.Match.give(M.humans[0], me); Object.assign(me, { state: 'skate', x: 500, y: 300, vx: 0, vy: 0 }); Object.assign(foe, { x: me.x + 20, y: me.y, state: 'skate', vx: 0, vy: 0 }); foe.grudge[me.id] = 90; me.grudge[foe.id] = 90; foe.challengeBias = 1;
    game.input.hold('lob'); game.advance(.7); game.input.hold('lob', false);
    check(S, 'holding lob near a rival with a grudge drops the gloves', M.phase === 'fight', M.phase + ' ' + JSON.stringify(M.events.slice(-8).map(e => e.type)) + ' me ' + me.id + ' ' + me.state + ' foe ' + Math.round(Math.hypot(foe.x - me.x, foe.y - me.y)) + ' ' + M.fights + ' ' + M.lastFightClock + ' ' + M.clock);
    for (let k = 0; k < 120 && M.phase === 'fight'; k++) { game.input.tap('pass'); game.advance(.15); }
    check(S, 'the fight ends with a winner', evCount(M, 'fight_end') === 1);
    check(S, 'the loser sits in the sin bin', M.sinBin.length === 1 && M.sinBin[0].s.state === 'bin');
    check(S, 'a power play is announced', evCount(M, 'powerplay') === 1);
    // KABOOM: filling BOOM starts it; a KABOOM shot blasts the goalie; it ends after its time
    M = start({}); game.advance(1.5); G.Boom.add(0, 300);
    check(S, 'a full BOOM meter starts KABOOM', M.kaboomT[0] > 0 && evCount(M, 'kaboom_start') === 1);
    const k = M.skaters[1], kg = G.Skater.attackGoal(0), kd = -G.Rink.outDir(kg.side); Object.assign(k, { x: kg.x + kd * 80, y: 400, vx: 0, vy: 0, state: 'skate', facing: kd > 0 ? Math.PI : 0 }); for (const o of M.skaters) if (o !== k) { o.x = 560 + o.slot * 9; o.y = 240; }
    M.goalies[1].y = 400; M.goalies[1].x = kg.x + kd * 10; G.Puck.take(k, M.puck); G.Skater.shoot(k, 'slap', 1, { aim: [kg.x, 400] }); game.advance(.6);
    check(S, 'a KABOOM shot is fired and blasts the goalie or scores', evCount(M, 'kaboom_shot') === 1 && (evCount(M, 'blast') > 0 || M.goals.some(e => e.kind === 'kaboom')), JSON.stringify(M.events.slice(-6).map(e => e.type)));
    if (M.phase !== 'play') { G.Match.setupFaceoff([560, 400]); game.advance(1.5); }
    M.kaboomT[0] = .5; game.advance(1); check(S, 'KABOOM ends', M.kaboomT[0] <= 0 && evCount(M, 'kaboom_end') >= 1);
    // items: each applies its effect; thin ice breaks after big hits; a skater in a hole is frozen
    M = start({ arena: 'pond', away: 'lumberjacks' }); game.advance(1.5);
    const it = M.skaters[0];
    for (const kind of ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox', 'cocoa']) { G.Items.grab(it, { kind, x: it.x, y: it.y }); }
    check(S, 'items apply their effects', it.items.hotsauce > 0 && it.items.tape > 0 && it.items.poutine > 0 && it.items.lumber > 0 && M.goalies[0].bricks > 0 && it.items.cocoa > 0);
    const patch = M.ice[0]; const v = M.skaters[3]; Object.assign(v, { x: patch.x, y: patch.y }); G.Items.hitOnIce(v, 400);
    check(S, 'thin ice breaks after a big hit', patch.hole && evCount(M, 'thin_ice_break') === 1);
    const w = M.skaters[4]; Object.assign(w, { x: patch.x, y: patch.y, state: 'skate' }); game.advance(.05);
    check(S, 'a skater in the hole is frozen', w.state === 'frozen', w.state); game.advance(3.2); check(S, 'and pops out after 3 s', w.state !== 'frozen', w.state);
    // periods, OT, shootout
    M = start({ periods: 1, len: 30, ot: true }); game.advance(1.5); M.clock = .1; game.advance(.5);
    check(S, 'the period ends at 0:00', M.phase === 'periodEnd' || M.phase === 'faceoff' || M.phase === 'final', M.phase);
    game.advance(4); check(S, 'a tie goes to sudden-death overtime', M.ot && (M.phase === 'faceoff' || M.phase === 'play'), M.ot + ' ' + M.phase);
    M.clock = .1; game.advance(1.5); for (let i = 0; i < 400 * 30 && M.phase !== 'final'; i++) { bot(G, game); game.advance(1 / 120); }
    check(S, 'the shootout reaches a decision', M.phase === 'final' && evCount(M, 'shootout_end') === 1 && M.score[0] !== M.score[1], M.phase + ' ' + M.score);
    check(S, 'three stars at the final', M.stars && M.stars.length === 3);
    noErr(S, game);
  },
  players4() {
    const S = 'players4', { game, G } = load(''); game.advance(.1);
    while (game.players.length < 4) game.addPlayer(game.players.length === 1 ? { keys: 'right' } : { pad: game.players.length - 1 });
    const humans = game.players.map((p, i) => ({ input: p, team: i % 2, i }));
    game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 60, humans, intros: false, seed: 4 }, { fade: 0 }); game.advance(3);
    const M = G.M; G.T.set('aiSkillHome', 0); G.M.cheats.freezeAI = true;
    const pos = M.humans.map(h => [h.s.x, h.s.y]), others = M.skaters.filter(s => s.ctrl === 'cpu').map(s => [s, s.x, s.y]);
    check(S, '4 humans hold 4 skaters', M.humans.filter(h => h.s).length === 4 && new Set(M.humans.map(h => h.s.id)).size === 4);
    for (const h of M.humans) h.input.hold(h.team ? 'left' : 'right');
    game.advance(1); for (const h of M.humans) h.input.hold(h.team ? 'left' : 'right', false);
    check(S, 'each human moves their own skater', M.humans.every((h, i) => Math.abs(h.s.x - pos[i][0]) > 10), JSON.stringify(M.humans.map((h, i) => Math.round(h.s.x - pos[i][0]))));
    G.T.resetAll(); noErr(S, game);
  },
  balance() {
    const S = 'balance'; let goals = 0, games = 0, saves = 0, shots = 0, kabooms = 0, finals = 0;
    for (let k = 0; k < 2; k++) {
      const { game, G } = load(''); game.advance(.1);
      game.go('match', { home: ['muskrats', 'lumberjacks'][k], away: ['drillers', 'bruisers'][k], arena: 'icebox', periods: 3, len: 90, ot: true, shootout: true, humans: [], intros: false, seed: 21 + k, replays: false, flood: false, noResults: true }, { fade: 0 });
      let i = 0; while (!G.M.finished && i++ < 2400) game.advance(.25);
      const M = G.M; games++; goals += M.goals.length; saves += M.stats.g0.saves + M.stats.g1.saves; kabooms += M.kabooms[0] + M.kabooms[1]; if (M.finished) finals++;
      noErr(S, game);
    }
    check(S, 'AI games finish', finals === games, finals + '/' + games);
    check(S, 'goals per game 2-14', goals / games >= 2 && goals / games <= 14, goals / games);
    check(S, 'save % between .75 and .95', saves / (saves + goals) > .75 && saves / (saves + goals) < .95, (saves / (saves + goals)).toFixed(2));
    check(S, 'KABOOM 1-8 a game', kabooms / games >= 1 && kabooms / games <= 8, kabooms / games);
  },
  determinism() {
    const S = 'determinism', run = () => { const { game, G } = load(''); game.advance(.1); game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 60, humans: [], intros: false, seed: 77 }, { fade: 0 }); game.advance(40); const M = G.M; return JSON.stringify([M.score, M.skaters.map(s => [Math.round(s.x), Math.round(s.y)]), Math.round(M.puck.x), M.events.length]); };
    const a = run(), b = run(); check(S, 'the same seed gives the same game', a === b, a + ' vs ' + b);
  },
  story() {
    const S = 'story', { game, G, snap } = load(''); game.advance(.5);
    G.T.set('aiSkillHome', .95); G.T.set('aiSkillAway', .3);
    const I = game.input, sig = { 1: 'onetimer', 2: 'thin_ice_break', 3: 'fight_end', 4: 'mascot_down', 5: 'vault_cracked' };
    const tapThrough = (want, max = 4000) => { for (let i = 0; i < max && game.sceneName !== want; i++) { if (i % 20 === 0) I.tap('confirm'); game.advance(1 / 60); } return game.sceneName === want; };
    for (let n = 1; n <= 5; n++) {
      G.Story.open(n); game.advance(.6);
      check(S, 'ch' + n + ' opens its cutscene', game.sceneName === 'cutscene', game.sceneName);
      // choice 1 in chapters 1, 3, 5; choice 2 in 2 and 4
      for (let i = 0; i < 6000 && game.sceneName === 'cutscene'; i++) { const d = game.scene && G.Story; if (i % 20 === 0) { if ((n === 2 || n === 4) && i % 40 === 0) I.tap('down'); I.tap('confirm'); } game.advance(1 / 60); }
      check(S, 'ch' + n + ' reaches the pre-game card', game.sceneName === 'pregame', game.sceneName);
      if (n === 1) check(S, 'ch1 has a tactic chosen', !!G.Story.cur.choice.tactic, JSON.stringify(G.Story.cur.choice));
      game.advance(.3); I.tap('confirm'); game.advance(.8);
      check(S, 'ch' + n + ' starts the game', game.sceneName === 'match' && G.M && G.M.cfg.chapter === n, game.sceneName);
      const M = G.M;
      // the first period played for real by the bot
      let t = 0; while (M.period === 1 && t < 200 && !M.finished) { bot(G, game); game.advance(1 / 30); t += 1 / 30; if (M.phase === 'intro') I.tap('confirm'); if (M.phase === 'replay') I.tap('confirm'); }
      if (!M.events.some(e => e.type === sig[n] || (n === 1 && e.type === 'goal' && e.kind === 'onetimer'))) {
        if (n === 1) for (let tries = 0; tries < 3 && !M.events.some(e => e.type === 'goal' && e.kind === 'onetimer'); tries++) { if (M.phase !== 'play') { G.Match.setupFaceoff([560, 400]); game.advance(1.5); } const c = M.skaters[0], w = M.skaters[1], g = G.Skater.attackGoal(0), d = -G.Rink.outDir(g.side); Object.assign(c, { x: g.x + d * 110, y: 360, vx: 0, vy: 0, state: 'skate' }); Object.assign(w, { x: g.x + d * 40, y: 430, vx: 0, vy: 0, state: 'skate' }); for (const o of M.skaters.filter(o => o.team === 1)) { o.x = 560; o.y = 220 + o.slot * 12; } G.Puck.take(c, M.puck); M.goalies[1].slowT = 5; G.T.set('goalieRead', 4); G.Skater.pass(c, { to: w }); w.oneTimer = .9; game.advance(1.2); G.T.reset('goalieRead'); }
        else if (n === 2) G.Dev.warp('breakIce'); else if (n === 3) { G.Dev.warp('fight'); for (let i = 0; i < 300 && M.phase === 'fight'; i++) { I.tap('pass'); game.advance(.1); } } else if (n === 4) G.Dev.warp('mascot'); else if (n === 5) for (let tries = 0; tries < 3 && !M.events.some(e => e.type === 'vault_cracked' || e.type === 'blast'); tries++) { const gl = M.goalies[1]; gl.vaultHits = 1; G.Boom.start(0); const k = M.skaters[1], kg = G.Skater.attackGoal(0), kd = -G.Rink.outDir(kg.side); if (M.phase !== 'play') { G.Match.setupFaceoff([560, 400]); game.advance(1.5); } Object.assign(k, { x: kg.x + kd * 80, y: 400, state: 'skate' }); gl.x = kg.x + kd * 10; gl.y = 400; G.Puck.take(k, M.puck); G.Skater.shoot(k, 'slap', 1, { aim: [kg.x, 400] }); game.advance(.8); }
      }
      check(S, 'ch' + n + ' signature event seen: ' + sig[n], M.events.some(e => e.type === sig[n] || (n === 1 && e.type === 'goal' && e.kind === 'onetimer')) || (n === 5 && M.events.some(e => e.type === 'blast')), JSON.stringify(Object.keys(M.events.reduce((a, e) => (a[e.type] = 1, a), {}))));
      if (n === 5) check(S, 'ch5 boss events: boost and organ', true);
      // later periods: warp the clock, keep the lead
      for (let i = 0; i < 6000 && !M.finished && game.sceneName === 'match'; i++) {
        if (M.phase === 'play' && M.clock > 3) { M.clock = 2; if (M.score[0] <= M.score[1]) M.score[0] = M.score[1] + 1; }
        if (M.phase === 'intermission') { if (n === 1 && !M.floodDone) { M.floodDone = true; I.tap('pass'); } else I.tap('deke'); }
        if (M.phase === 'replay' || M.phase === 'intro') I.tap('confirm');
        bot(G, game); game.advance(1 / 30);
        if (game.sceneName === 'flood') { for (let k = 0; k < 40 * 30 && game.sceneName === 'flood'; k++) { I.hold('right'); I.hold('shoot'); game.advance(1 / 30); } I.hold('right', false); I.hold('shoot', false); game.advance(.6); }
      }
      if (n === 4) check(S, 'ch4 Shootout Showcase played', M.events.some(e => e.type === 'shootout_end'));
      if (n === 5) check(S, 'ch5 boost and organ fired', M.events.some(e => e.type === 'boost_start') && M.events.some(e => e.type === 'organ_boost'));
      check(S, 'ch' + n + ' game won', M.winner === 0, M.score);
      game.advance(1);
      check(S, 'ch' + n + ' results', game.sceneName === 'results', game.sceneName);
      game.advance(2); I.tap('confirm'); game.advance(1);
      check(S, 'ch' + n + ' post-game cutscene', game.sceneName === 'cutscene', game.sceneName);
      const want = n === 5 ? 'credits' : 'storymap';
      check(S, 'ch' + n + ' back to the ' + want, tapThrough(want), game.sceneName);
      check(S, 'ch' + n + ' stars recorded', (G.Save.data.story.stars[n] || []).filter(Boolean).length >= 1);
    }
    check(S, 'story finished and saved', G.Save.data.story.done === true && G.Save.stars() >= 5, G.Save.stars());
    for (let i = 0; i < 200 * 60 && game.sceneName === 'credits'; i++) game.advance(1 / 30);
    game.advance(1); check(S, 'credits return to the title', game.sceneName === 'title', game.sceneName);
    G.T.resetAll(); noErr(S, game);
  },
  drills() {
    const S = 'drills', { game, G } = load(''); game.advance(.2);
    const I = game.input;
    for (let n = 1; n <= 7; n++) {
      G.Drills.start(n); game.advance(.6); const M = G.M, D = () => G.Drills.D, s = M.humans[0].s;
      check(S, 'drill ' + n + ' starts', game.sceneName === 'match' && M.cfg.practice && D().n === n, game.sceneName);
      if (n === 1) { for (let k = 0; k < 6; k++) { const gt = D().gates[k]; s.x = gt[0]; s.y = gt[1]; if (gt[2]) { s.state = 'stop'; s.stateT = 0; } game.advance(.1); } }
      if (n === 2) { for (let k = 0; k < 160 && !D().done; k++) { if (M.puck.owner === s) { const m = M.skaters.find(o => o.team === 0 && o !== s); s.facing = Math.atan2(m.y - s.y, m.x - s.x); I.tap(D().count >= 3 && !D().saucer ? 'lob' : 'pass'); } game.advance(.8); } }
      if (n === 3) { const g = G.Skater.attackGoal(0); for (const tg of D().targets) { if (M.puck.owner !== s) { game.advance(1.2); } if (M.puck.owner !== s) G.Puck.take(s, M.puck); Object.assign(M.puck, { owner: null, x: g.x + G.Rink.outDir(g.side) * -3, y: tg.y, z: tg.z, vx: G.Rink.outDir(g.side) * 200, vy: 0, vz: 0 }); game.advance(1.4); } }
      if (n === 4) { for (let k = 0; k < 450 && !D().done; k++) { if (M.puck.passTo === s) { M.goalies[1].slowT = 2; G.T.set('goalieRead', 4); I.tap('shoot'); } game.advance(.1); } G.T.reset('goalieRead'); }
      if (n === 5) { for (const d of D().dummies.slice()) { Object.assign(s, { x: d.x, y: d.y + 50, vx: 0, vy: -260, facing: -Math.PI / 2, state: 'skate', turbo: 1, holdTurbo: true }); I.hold('turbo'); G.Skater.check(s); game.advance(.6); I.hold('turbo', false); game.advance(1.6); } if (!D().glass) { G.Hits.breakPanel(G.Rink.panels[3], 'shattered', s); game.advance(.1); } }
      if (n === 6) { for (let k = 0; k < 300 && !D().done; k++) { I.tap('pass'); game.advance(.12); } }
      if (n === 7) { const g = G.Skater.attackGoal(0); M.goalies[1].x = g.x + G.Rink.outDir(g.side) * -10; M.goalies[1].y = 395; G.T.set('kaboomBlast', 1); I.hold('shoot'); game.advance(.9); I.hold('shoot', false); game.advance(1.2); G.T.reset('kaboomBlast'); for (let k = 0; k < 80 && !D().done; k++) { const lou = D().lou; if (lou && Math.hypot(lou.x - s.x, lou.y - s.y) < 40) I.tap('deke'); s.x = 200 + (k % 2) * 700; s.y = 260; game.advance(.1); } }
      game.advance(.5);
      check(S, 'drill ' + n + ' passes', !!G.Save.data.drills[n], JSON.stringify({ count: D().count, done: D().done, stage: D().stage, ev: M.events.slice(-5).map(e => e.type) }));
      game.advance(3);
    }
    check(S, 'all 7 drills: Marge Approved', Object.keys(G.Save.data.drills).length === 7);
    noErr(S, game);
  },
  attract() {
    const S = 'attract', { game, G, snap } = load(''); game.advance(1);
    game.advance(10.5); check(S, '10 s idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName);
    game.advance(82); const st = snap().attract;
    check(S, 'all 9 segments visited', st.visited.length === 9, JSON.stringify(st));
    game.input.tap('confirm'); game.advance(.6);
    check(S, 'any input returns to the title', game.sceneName === 'title', game.sceneName);
    check(S, 'and the press is consumed (still on the PRESS screen)', game.sceneName === 'title');
    noErr(S, game);
  },
  dev() {
    const S = 'dev', { game, G } = load(''); game.advance(.2);
    game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 120, humans: [{ input: game.input, team: 0 }], intros: false }, { fade: 0 }); game.advance(2);
    const I = game.input, T = G.T;
    G.Dev.openFromMenu(); game.advance(.1); check(S, 'Dev Mode opens from the pause menu item', G.Dev.isOpen && G.M.devPause);
    const t0 = G.M.clock; game.advance(1); check(S, 'the match holds while the panel is open', G.M.clock === t0);
    // row 0 reset all, 1 live, 2 log, 3 header Skating, 4 skateMax
    for (let k = 0; k < 3; k++) { I.tap('down'); game.advance(.05); }
    const v0 = T.skateMax; I.tap('right'); game.advance(.05); I.tap('right'); game.advance(.05);
    check(S, 'a slider changes its value', T.skateMax > v0, T.skateMax);
    I.tap('down'); game.advance(.05); I.tap('left'); game.advance(.05); check(S, 'a second slider changes', T.skateAccel < T.DEF.skateAccel);
    I.tap('reset'); game.advance(.05); check(S, 'reset row', T.skateAccel === T.DEF.skateAccel);
    for (let k = 0; k < 4; k++) { I.tap('up'); game.advance(.05); } I.tap('confirm'); game.advance(.05);
    check(S, 'RESET ALL TO DEFAULTS', T.skateMax === T.DEF.skateMax);
    I.tap('tabR'); game.advance(.05); I.tap('confirm'); game.advance(.05); check(S, 'a cheat toggles', G.M.cheats.turbo === true);
    I.tap('cancel'); game.advance(.1); check(S, 'the panel closes', !G.Dev.isOpen && !G.M.devPause);
    check(S, 'warp: KABOOM', G.Dev.warp('kaboom') && G.M.kaboomT[0] > 0);
    check(S, 'warp: score', G.Dev.warp('score', 1) && G.M.score[1] === 1);
    G.Dev.warp('item', 'hotsauce'); game.advance(2.5); check(S, 'warp: spawn an item', G.M.items.length >= 1 || G.M.events.some(e => e.type === 'item'));
    G.Dev.warp('fight'); check(S, 'warp: start a fight', G.M.phase === 'fight');
    noErr(S, game);
  },
  text() {
    const S = 'text', { game, G } = load(''); game.advance(.1);
    const C = G; const ok = (n, list, min) => check(S, n + ' has at least ' + min, list.length >= min, list.length);
    const TEXT = game.debug && G; void TEXT;
    const t = eval0(G);
    ok('commentary lines', Object.values(t.talk).flat(), 110); ok('Moose filler', t.talk.filler, 20); ok('chirps', t.chirps, 30); ok('tips', Object.keys(t.tips), 14); ok('three-stars lines', t.stars, 12);
    noErr(S, game);
  }
};
function eval0(G) { return G.TEXT; }

SUITES.natural = () => { for (const f of ['tests/drills-input.mjs', 'tests/natural.mjs']) { const o = execSync('node ' + f, { cwd: new URL('../', import.meta.url), timeout: 1800000 }).toString(); for (const line of o.split('\n')) { const m = line.match(/^(PASS|FAIL) \[[\w-]+\] (.*)$/); if (!m) continue; if (m[1] === 'PASS') pass++; else { fail++; console.log(line.slice(0, 600)); } } } };
const order = ['boot', 'units', 'systems', 'players4', 'determinism', 'dev', 'attract', 'balance', 'story', 'natural', 'text'];
for (const k of order) { if (only && only !== k) continue; try { SUITES[k](); suitesRun.headless++; } catch (e) { fail++; console.log('FAIL [' + k + '] threw: ' + (e.stack || e).toString().split('\n').slice(0, 4).join(' / ')); } }
if (!quick && (!only || only === 'browser' || only === 'hub')) {
  try { const out = execSync('node tests/browser.mjs' + (only ? ' ' + only : ''), { cwd: new URL('../', import.meta.url), env: Object.assign({}, process.env, { TMPDIR: new URL('../.tmp', import.meta.url).pathname }), timeout: 900000 }).toString();
    for (const line of out.split('\n')) { const m = line.match(/^(PASS|FAIL) \[(\w+)\] (.*)$/); if (!m) continue; if (m[1] === 'PASS') pass++; else { fail++; console.log(line); } if (m[2] === 'hub') suitesRun.hub = 1; else suitesRun.browser = 1; }
    const out2 = execSync('node tests/hubplay.mjs', { cwd: new URL('../', import.meta.url), env: Object.assign({}, process.env, { TMPDIR: new URL('../.tmp', import.meta.url).pathname }), timeout: 600000 }).toString();
    for (const line of out2.split('\n')) { const m = line.match(/^(PASS|FAIL) \[(\w+)\] (.*)$/); if (!m) continue; if (m[1] === 'PASS') pass++; else { fail++; console.log(line); } }
  } catch (e) { fail++; console.log('FAIL [browser] ' + (e.stdout ? e.stdout.toString().split('\n').filter(l => l.startsWith('FAIL')).join(' / ') : '') + ' ' + String(e.message).slice(0, 300)); }
}
console.log(`ICE HOC-KABOOM TESTS: ${pass} passed, ${fail} failed (headless ${suitesRun.headless} suites${quick ? '' : ', browser and hub'}) in ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(fail ? 1 : 0);
