// THE test command: node tools/test.mjs [suite ...]. Prints only failures (FAIL <suite> <test>: <detail>) and one last line.
// Suites: unit rules content ui saves attract dev determinism playthrough hubsim lint soak (soak is slow: only when named)
import { load } from './lib/load.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const t0 = Date.now(), want = process.argv.slice(2);
const ALL = ['unit', 'rules', 'content', 'ui', 'saves', 'attract', 'dev', 'determinism', 'playthrough', 'hubsim', 'lint'];
const suites = want.length ? want : ALL;
let passed = 0, failed = 0, suite = '';
const check = (name, ok, detail = '') => { if (ok) passed++; else { failed++; console.log(`FAIL ${suite} ${name}: ${String(detail).slice(0, 300)}`); } };
const fresh = (o) => { const L = load(o); L.game.advance(.2); return L; };
const noErr = (L, name) => check(name + ' (no errors)', !L.game.errors.length, L.game.errors.map(e => (e.stack || e.message || String(e)).split('\n').slice(0, 2).join(' ')).join(' | '));
const T = {};

T.unit = () => {
  const L = fresh(), { EF, game, E } = L, P = EF.Pitch;
  const m = new EF.Match({ home: 'kipperton', away: 'hoofington', seed: 5, silent: true, training: { goal: (mm, s) => { mm._goal = s; }, out: (mm) => { mm._out = true; } } });
  const b = m.ball, reset = () => { m.owner = null; b.z = 0; b.vx = b.vy = b.vz = 0; b.spin = 0; m._goal = null; m._out = null; b.prevPast = null; m.mode = 'play'; };
  // goal line: over by r - 1 is no goal, r + 1 is a goal
  reset(); b.x = P.X1 + b.r - 1; b.y = P.CY; m.ballLoose(1 / 120, false); check('ball over the line by r-1 is no goal', m._goal == null, m._goal);
  reset(); b.x = P.X1 + b.r + 1.5; b.y = P.CY; m.ballLoose(1 / 120, false); check('ball over the line by r+1 is a goal', m._goal != null, m._goal);
  reset(); b.x = P.X1 + b.r + 2; b.y = P.CY; b.z = P.BAR + 4; m.ballLoose(1 / 120, false); check('over the bar is no goal', m._goal == null);
  // woodwork reflects
  reset(); b.x = P.X1 - 8; b.y = P.CY - P.GH; b.vx = 300; let hit = false; const off = EF.bus.on('woodwork', () => { hit = true; }); m.o.silent = false; for (let i = 0; i < 30; i++) m.ballLoose(1 / 120, true); off(); m.o.silent = true;
  check('the post reflects the ball', hit && b.vx < 0, 'vx ' + b.vx);
  // surfaces: rolling distance order
  const roll = surf => { const mm = new EF.Match({ home: 'kipperton', away: 'hoofington', seed: 1, silent: true, surface: surf, training: {} }); mm.map.tagAt = () => null; const bb = mm.ball; bb.x = P.CX - 200; bb.y = P.CY; bb.vx = 200; bb.vy = 0; for (let i = 0; i < 600; i++) mm.ballLoose(1 / 120, true); return bb.x; };
  const d = ['mud', 'snow', 'grass', 'hard', 'wet'].map(roll);
  check('surfaces roll in order mud < snow < grass < hard < wet', d.every((v, i) => !i || v > d[i - 1]), d.map(Math.round).join(' '));
  // a pass at a moving receiver arrives near him
  let near = 0;
  for (let k = 0; k < 20; k++) {
    const mm = new EF.Match({ home: 'kipperton', away: 'hoofington', stadium: 'pasapasa', seed: 10 + k, silent: true, training: {} });
    const f = mm.side[0][2], r = mm.side[0][4]; f.st.pass = 100; f.body.x = P.CX; f.body.y = P.CY; r.body.x = P.CX + 100 + k * 5; r.body.y = P.CY + 40; r.body.vx = 0; r.body.vy = 30;
    mm.takeBall(f); f.passTo(r, 'pass');
    let best = 999; for (let i = 0; i < 240; i++) { r.body.y += 30 / 120; mm.ballLoose(1 / 120, true); best = Math.min(best, Math.hypot(mm.ball.x - r.body.x, mm.ball.y - r.body.y)); }
    if (best < 9) near++;
  }
  check('led passes reach a moving receiver (20 cases)', near >= 18, near + '/20');
  // half keyboards: the actions on F G H R T Y V B and . / , L ; \' K M
  const left = E.Input.halfKeys(EF.KEYS, 'left'), right = E.Input.halfKeys(EF.KEYS, 'right');
  const acts = ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive'];
  check('left half keys', acts.map(a => left[a][0]).join(' ') === 'KeyF KeyG KeyH KeyR KeyT KeyY KeyV KeyB', acts.map(a => left[a][0]).join(' '));
  check('right half keys', acts.map(a => right[a][0]).join(' ') === "Period Slash Comma KeyL Semicolon Quote KeyK KeyM", acts.map(a => right[a][0]).join(' '));
  // the Europhoria chord and its key
  { const m = EF.test.startMatch({ seed: 2 }); m.mode = 'play'; m.sp = null; m.euph[0] = 100; L.I.tap('switch'); L.I.tap('skill'); game.advance(1 / 60); check('switch + skill together is the Europhoria chord', m.euroT[0] > 0, m.euroT); }
  { const m = EF.test.startMatch({ seed: 2 }); m.mode = 'play'; m.sp = null; m.euph[0] = 100; L.I.tap('euphoria'); game.advance(1 / 60); check('the Europhoria key works on a full keyboard', m.euroT[0] > 0, m.euroT); }
  { const m = EF.test.startMatch({ seed: 2 }); m.mode = 'play'; m.sp = null; const f = m.slots[0].f; m.takeBall(f); EF.mouse.pressed[0] = true; EF.mouse.down[0] = true; const hc = m.slots[0].ctl, it3 = hc.intent(m, m.slots[0]); EF.mouse.pressed[0] = false; EF.mouse.down[0] = false; check('mouse buttons do nothing while mouse aim is off', !it3.pass.pressed); }
  // the Save Duel's windows
  check('duel: 59 ms is PERFECT', EF.duelJudge(.059) === 'perfect'); check('duel: 61 ms is GOOD', EF.duelJudge(.061) === 'good'); check('duel: 141 ms is MISS', EF.duelJudge(.141) === 'miss');
  // the receiver the stick points at (8 directions)
  let okDir = 0;
  for (let k = 0; k < 8; k++) {
    const mm = new EF.Match({ home: 'kipperton', away: 'hoofington', seed: 3, silent: true, training: {} }), f = mm.side[0][1];
    f.body.x = P.CX; f.body.y = P.CY; const a = k * Math.PI / 4, mates = mm.side[0].filter(p => p !== f && !p.gk); mm.keeper[0].body.x = -999;
    mates.forEach((p, i) => { const aa = a + (i ? (i % 2 ? 1 : -1) * (1.3 + i * .4) : 0); p.body.x = P.CX + Math.cos(aa) * 120; p.body.y = P.CY + Math.sin(aa) * 120; });
    if (f.pickReceiver(a, { assist: 'high' }) === mates[0]) okDir++;
  }
  check('the pass goes to the teammate the stick points at (8 directions)', okDir === 8, okDir + '/8');
  // stamina drains and comes back
  const mm3 = new EF.Match({ home: 'kipperton', away: 'hoofington', seed: 4, silent: true, training: {} }), f3 = mm3.side[0][3]; f3.stamina = 100;
  for (let i = 0; i < 120; i++) f3.step(1 / 120, { move: [1, 0], sprint: true, pass: {}, shoot: {}, lob: {}, through: {}, skill: {}, dive: {}, sw: {} }, true);
  check('sprinting drains stamina at the set rate', Math.abs(f3.stamina - (100 - EF.T.staminaDrain)) < 2, f3.stamina);
  noErr(L, 'unit');
};

T.rules = () => {
  const L = fresh(), { EF, game } = L, P = EF.Pitch;
  const mk = (o = {}) => new EF.Match(Object.assign({ home: 'kipperton', away: 'hoofington', seed: 7, silent: true, halfLength: 60 }, o));
  // corner or goal kick by the last touch
  let m = mk(); m.mode = 'play'; m.sp = null; const att = m.side[0][4], def = m.side[1][1];
  m.last = att; const b = m.ball; b.x = m.goalX(0) + m.dir(0) * 8; b.y = P.CY + P.GH + 30; b.z = 2; b.vx = m.dir(0) * 50; b.prevPast = null; m.ballLoose(1 / 120, false);
  m.update(1.2); check('over the line off an attacker: a goal kick', m.sp && m.sp.kind === 'goalkick' && m.sp.side === 1, m.sp && m.sp.kind);
  m = mk(); m.mode = 'play'; m.sp = null; m.last = m.side[1][1]; m.ball.x = m.goalX(0) + m.dir(0) * 8; m.ball.y = P.CY + P.GH + 30; m.ball.z = 2; m.ball.prevPast = null; m.ballLoose(1 / 120, false); m.update(1.2);
  check('over the line off a defender: a corner', m.sp && m.sp.kind === 'corner' && m.sp.side === 0, m.sp && m.sp.kind);
  // fouls: from behind is a foul; severities give cards; a second yellow is red
  m = mk(); m.mode = 'play'; m.sp = null; const tk = m.side[1][2], vic = m.side[0][3]; vic.facing = 0; tk.body.x = vic.body.x - 10; tk.body.y = vic.body.y; m.owner = vic;
  m.contact(tk, vic, { closing: 120, kind: 'poke', behind: true }); check('a challenge from behind is a foul', !!m.foul);
  m = mk(); m.mode = 'play'; m.sp = null; m.owner = m.side[0][3]; m.contact(m.side[1][2], m.side[0][3], { closing: 40, kind: 'poke', behind: false }); check('a gentle challenge from the front is not a foul', !m.foul);
  m = mk(); m.mode = 'play'; m.sp = null; m.contact(m.side[1][2], m.side[0][3], { closing: 420, kind: 'slide', behind: true }); check('a wild slide from behind is a red', m.foul && m.foul.card === 'red', m.foul && m.foul.card);
  m = mk(); const f = m.side[1][2]; EF.giveCard(m, f, 'yellow'); EF.giveCard(m, f, 'yellow'); check('a second yellow is a red: sent off', f.sentOff && m.side[1].filter(p => !p.sentOff).length === 4);
  // the clock: the half length maps to 45 minutes
  m = mk({ halfLength: 120 }); m.mode = 'play'; m.sp = null; m.clock = 60; check('2:00 a half: one minute in is 22-23\'', Math.floor(m.minute) === 22, m.minute);
  m = mk({ halfLength: 30 }); let sawBoard = null; m.o.silent = false; const offb = EF.bus.on('board', e => { if (e.match === m) sawBoard = e.add; }); for (let i = 0; i < 120 * 50 && m.half === 1; i++) m.update(1 / 120); offb();
  check('stoppage time is 1 to 5 minutes', sawBoard >= 1 && sawBoard <= 5, sawBoard);
  // extra time is golden goal, then a shootout; it ends early when one side can't catch up
  m = mk({ draws: 'cup', halfLength: 20 }); m.half = 2; m.score = [1, 1]; m.fullTime(); m.update(3.1); check('a cup draw goes to golden-goal extra time', m.half === 3, m.half);
  m.mode = 'play'; m.sp = null; m.last = m.side[0][4]; m.ball.x = m.goalX(0) + m.dir(0) * 8; m.ball.y = P.CY; m.ball.z = 3; m.ball.prevPast = null; m.goalScored(0); m.afterGoal();
  check('a golden goal ends it', m.mode === 'fulltime' || m.mode === 'over', m.mode);
  m = mk({ shootoutOnly: true }); m.so.taken = [3, 3]; m.so.score = [3, 0]; check('the shootout ends early when a side cannot catch up', m.shootoutDecided());
  m.so.taken = [5, 5]; m.so.score = [4, 4]; check('level after 5 each: sudden death', !m.shootoutDecided()); m.so.taken = [6, 6]; m.so.score = [5, 4]; check('sudden death decides', m.shootoutDecided());
  // a full shootout plays to a winner
  m = mk({ shootoutOnly: true }); let n = 0; while (m.mode !== 'over' && n++ < 120 * 120) m.update(1 / 120); check('a shootout plays to a winner', m.mode === 'over' && m.so.score[0] !== m.so.score[1], JSON.stringify(m.so.score));
  // the shirt-over-head celebration earns a yellow
  m = mk(); m.mode = 'play'; m.sp = null; m.slots = [{ i: 0, side: 0, f: m.side[0][4] }]; m.last = m.side[0][4]; m.goalScored(0); m.celebration.t = 1; const choices = EF.celebrationChoices(m, m.side[0][4]); const k = choices.indexOf('shirt');
  if (k >= 0) { m.pickCelebration(k); m.afterGoal(); check('shirt over the head is a yellow card', m.side[0][4].cards === 1, m.side[0][4].cards); } else { m.celebration.picked = false; m.deferred.push({ f: m.side[0][4], kind: 'yellow' }); m.applyDeferred(); check('a deferred card is given at the restart', m.side[0][4].cards === 1); }
  // VAR overturns only soft penalties
  let over = 0, hard = 0;
  for (let s = 0; s < 20; s++) { const mm = mk({ seed: 100 + s }); mm.mode = 'var'; mm.varCheck = { kind: 'penalty', foul: { side: 0, sev: .5, victim: mm.side[0][3] }, t: 0 }; mm.varStep(3); if (mm.sp && mm.sp.kind === 'goalkick') over++; const m2 = mk({ seed: 200 + s }); m2.mode = 'var'; m2.varCheck = { kind: 'penalty', foul: { side: 0, sev: 1.5, victim: m2.side[0][3] }, t: 0 }; m2.varStep(3); if (m2.sp && m2.sp.kind === 'goalkick') hard++; }
  check('VAR overturns some soft penalties and no hard ones', over > 2 && hard === 0, over + ' soft, ' + hard + ' hard');
  // the bus arrives for Lucchetto leading after 60'
  m = mk({ home: 'kipperton', away: 'lucchetto' }); m.mode = 'play'; m.sp = null; m.half = 2; m.clock = m.halfLen * .4; m.score = [0, 1]; m.brains[1].gimmicks(); check('the bus parks when Lucchetto lead after 60\'', m.bus && m.bus.on);
  m = mk({ home: 'kipperton', away: 'lucchetto' }); m.half = 2; m.clock = m.halfLen * .4; m.score = [1, 1]; m.brains[1].gimmicks(); check('no bus when level', !m.bus);
  // Opulence's Golden Moment at 80'
  m = mk({ home: 'kipperton', away: 'opulence' }); m.mode = 'play'; m.sp = null; m.half = 2; m.clock = m.halfLen * 36 / 45; m.goldenMoment(); check('the Golden Moment fires at 80\' when level', m.euroT[1] > 0);
  // a sent-off side plays with 3 outfield players and the AI keeps going
  m = mk(); EF.giveCard(m, m.side[0][2], 'red'); for (let i = 0; i < 120 * 10; i++) m.update(1 / 120); check('play goes on with four after a red', m.side[0].filter(p => !p.sentOff).length === 4);
  noErr(L, 'rules');
};

T.content = () => {
  const L = fresh(), { EF } = L;
  check('validate reports nothing', EF.validate().length === 0, EF.validate().join('; '));
  check('6 teams, 5 stadiums + training', EF.all('team').length === 6 && EF.all('stadium').length === 6);
  check('7 super strikes on 7 paths', new Set(EF.all('super').map(s => s.path)).size === 7);
  check('at least 300 commentary lines', EF.lineCount() >= 300, EF.lineCount());
  for (const p of ['goal', 'save', 'miss', 'woodwork', 'tackle', 'foul', 'card', 'dive', 'super', 'skill', 'header', 'kickoff', 'halftime', 'fulltime', 'var', 'penalty', 'nutmeg', 'red', 'simulation', 'launch', 'europhoria', 'bus', 'idle']) { const n = (EF.get('lines', p) || { list: [] }).list.length; check('pool ' + p + ' has 12 lines', n >= 12, n); }
  check('51 stickers', EF.all('sticker').length === 51, EF.all('sticker').length);
  check('9 drills', EF.all('drill').length === 9); check('15 songs', Object.keys(EF.SONGS).length >= 15, Object.keys(EF.SONGS).length);
  check('5 cup rounds with challenges', EF.ROUNDS.length === 5 && EF.ROUNDS.every(r => EF.get('challenge', r.challenge)));
  check('6 matchday events', EF.all('event').length >= 6, EF.all('event').length);
  check('the about data has every field', ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'].every(k => EF.ABOUT.sourceInformation[k]), JSON.stringify(Object.keys(EF.ABOUT.sourceInformation || {})));
  check('the about feedback has 4 + 6 + 4 answers', (EF.ABOUT.testingFeedback || []).length === 4 && (EF.ABOUT.engineFeedback || []).length === 6 && (EF.ABOUT.promptFeedback || []).length === 4);
  noErr(L, 'content');
};

T.ui = () => {
  let L = fresh(), { EF, game, I } = L, snap = L.snap;
  I.tap('start'); game.advance(.3);
  const pickTile = (k) => { const sc = game.scene; sc.menu.i = 0; for (let i = 0; i < k; i++) { I.tap(i % 2 ? 'down' : 'right'); game.advance(.05); } };
  // pad only: right moves between the two columns, down to the next row; ✕ picks; ○ backs out
  const order = [['setup', ['right']], ['penaltysetup', ['down']], ['training', ['down', 'right']], ['album', ['down', 'down']], ['about', ['down', 'down', 'down']]];
  for (const [scene, path] of order) {
    game.go('title', { menu: true }); game.advance(.3); game.scene.menu.i = 0; game.advance(.05);
    for (const d of path) { I.tap(d); game.advance(.06); }
    I.tap('confirm'); game.advance(.5);
    check('pad: the title reaches ' + scene, snap().scene === scene, snap().scene + ' focus ' + snap().ui.focus);
    I.tap('cancel'); game.advance(.5); if (snap().scene !== 'title') { I.tap('cancel'); game.advance(.5); } if (snap().scene !== 'title') { I.tap('cancel'); game.advance(.5); }
    check('pad: back to the title from ' + scene, snap().scene === 'title', snap().scene);
  }
  game.go('title', { menu: true }); game.advance(.3); game.scene.menu.i = 0; I.tap('confirm'); game.advance(.5); check('pad: CUP RUN opens the cup', snap().scene === 'cup');
  // mouse only: hover moves the focus, a click picks
  game.go('title', { menu: true }); game.advance(.3);
  const it = game.scene.menu.items[1], cx = it.rect[0] + it.rect[2] / 2, cy = it.rect[1] + it.rect[3] / 2;
  I.feed('move', cx, cy); game.advance(.05); check('mouse: hover moves the focus', game.scene.menu.i === 1, game.scene.menu.i);
  I.feed('down', cx, cy); game.advance(1 / 120); I.feed('up', cx, cy); game.advance(.4); check('mouse: a click picks KICK-ABOUT', snap().scene === 'setup', snap().scene);
  // keyboard: arrows and Enter
  game.go('title', { menu: true }); game.advance(.3); game.scene.menu.i = 0; I.press && I.press('ArrowRight');
  I.tap('right'); game.advance(.05); I.tap('down'); game.advance(.05); I.tap('confirm'); game.advance(.4); check('keyboard: arrows and Enter reach TRAINING', snap().scene === 'training', snap().scene);
  // prompts: PlayStation icons by default, Xbox in settings, keycaps on the keyboard
  check('pad glyphs are PlayStation by default', EF.glyphStyle(I) === 'playstation');
  game.settings.set('glyphs', 'xbox'); check('Settings switches the glyphs to Xbox', EF.glyphStyle(I) === 'xbox'); game.settings.set('glyphs', 'playstation');
  check('pass on a pad is Pad0 (✕)', EF.promptCode(I, 'pass', 'gamepad') === 'Pad0'); check('pass on the keyboard is J', EF.promptCode(I, 'pass', 'keyboard') === 'KeyJ'); check('pass with the mouse is the left button', EF.promptCode(I, 'pass', 'mouse') === 'Mouse0');
  noErr(L, 'ui');
  // touch-only: the notice, the settings button; play tiles can't start a match
  L = fresh({ search: '?touchonly=1' }); ({ EF, game, I } = L); snap = L.snap;
  check('touch-only is detected', EF.touchOnly() === true);
  I.tap('start'); game.advance(.3); const tiles = game.scene.items({ W: game.W, H: game.H });
  check('touch-only: play tiles are disabled with the notice', tiles[0].disabled && /CONTROLLER OR KEYBOARD/.test(tiles[0].sub));
  game.scene.menu.i = 1; I.tap('confirm'); game.advance(.4); check('touch-only: a play tile cannot start', snap().scene === 'title', snap().scene);
  noErr(L, 'ui touch');
};

T.saves = () => {
  const L = fresh(), { EF } = L;
  EF.Save.data.stickers['p-crabb'] = true; EF.Save.save(); EF.Save.data = null; EF.Save.load();
  check('a save round-trips', EF.Save.data.stickers['p-crabb'] === true);
  const mg = EF.Save.migrate({ round: 2, results: [{}, {}], stickers: { 'p-tran': true } });
  check('a v0 save migrates', mg.v === 1 && mg.cup.round === 2 && mg.stickers['p-tran']);
  EF.Cup.newRun(); EF.Cup.s.round = 3; EF.Save.save(); EF.Save.load(); check('the cup round is kept for CONTINUE', EF.Save.data.cup.round === 3);
  EF.Dev.open(); const W = EF.Dev.warps(), reset = W.find(w => /RESET THE SAVE/.test(w.label)); reset.onPick(); check('a dev reset needs a confirm', EF.Save.data.cup && EF.Save.data.cup.round === 3); EF.Dev.warps().find(w => /RESET THE SAVE/.test(w.label)).onPick(); check('the confirmed reset clears it', !EF.Save.data.cup); EF.Dev.close();
  noErr(L, 'saves');
};

T.attract = () => {
  const L = fresh(), { EF, game, I, snap } = L;
  game.go('title'); game.advance(.2); EF.idle.reset();
  game.advance(9.9); check('9.9 s idle: still the title', snap().scene === 'title', snap().scene);
  game.advance(.2); check('10 s idle: the attract mode starts', snap().scene === 'attract', snap().scene + ' idle ' + snap().attract.idle);
  const seen = new Set(); for (let i = 0; i < 96 * 4; i++) { game.advance(.25); seen.add(snap().attract.segment); }
  check('every attract segment shows', EF.ATTRACT_SEGS.every(s => seen.has(s.id)), [...seen].join(','));
  let goals = 0; EF.bus.on('goal', () => goals++);
  noErr(L, 'attract loop');
  for (const [how, fn] of [['a button', () => I.tap('confirm')], ['a key', () => I.tap('shoot')], ['a mouse move', () => EF.mouseFeed('move')], ['the stick', () => I.hold('right')]]) {
    game.go('attract', {}, { fade: 0 }); game.advance(1); fn(); game.advance(.1); I.hold('right', false);
    check(how + ' exits the attract mode', snap().scene === 'title', snap().scene);
    game.advance(.3); check(how + ' does not also pick a menu item', snap().scene === 'title', snap().scene);
  }
  noErr(L, 'attract');
};

T.dev = () => {
  const L = fresh(), { EF, game, I, snap } = L;
  // a slider changes play: a faster run covers more ground
  const dist = () => { const m = EF.test.startMatch({ seed: 2 }); m.mode = 'play'; m.sp = null; const f = m.slots[0].f, x0 = f.body.x; I.hold('right'); game.advance(1); I.hold('right', false); return Math.abs(f.body.x - x0); };
  const d0 = dist(); EF.T.runSpeed = 120; const d1 = dist();
  check('runSpeed 120 covers more ground', d1 > d0 * 1.15, d0.toFixed(1) + ' -> ' + d1.toFixed(1));
  EF.T.sprintMul = 1.9; EF.tuneReset(); check('RESET ALL restores every default', EF.tuneChanged().length === 0, EF.tuneChanged().join(','));
  // the panel opens, takes input and closes
  EF.test.startMatch({ seed: 3 }); EF.Dev.open(); game.advance(.1); check('dev opens over a match', snap().dev.open && snap().scene === 'match');
  EF.Dev.tab = 0; game.advance(.05); EF.Dev.menu.i = 2; game.advance(.05); I.tap('right'); game.advance(.05); check('left/right moves a slider', EF.tuneChanged().length === 1, EF.tuneChanged().join(','));
  I.tap('shoot'); game.advance(.05); check('□ resets that row', EF.tuneChanged().length === 0);
  EF.tuneReset(); I.tap('cancel'); game.advance(.1); check('○ closes the panel', !snap().dev.open);
  // every warp runs without errors
  let bad = [];
  const n = EF.Dev.warps().length;
  for (let k = 0; k < n; k++) {
    EF.test.startMatch({ seed: 4 }); game.advance(.5); EF.Dev.open(); const W = EF.Dev.warps(); if (!W[k]) continue; const label = W[k].label;
    if (/RESET THE SAVE/.test(label)) continue;
    try { W[k].onPick(); game.advance(1.5); } catch (e) { bad.push(label + ': ' + e.message); }
    if (game.errors.length) { bad.push(label + ': ' + (game.errors[0].message || game.errors[0])); game.errors.length = 0; }
    EF.Dev.close();
  }
  check('every WARP entry runs without errors (' + n + ')', !bad.length, bad.slice(0, 4).join(' | '));
  // cheats
  const m = EF.test.startMatch({ seed: 5 }); EF.Dev.set('stamina0', true); m.mode = 'play'; m.sp = null; const f = m.slots[0].f; f.stamina = 50; I.hold('right'); I.hold('sprint'); game.advance(1); I.hold('right', false); I.hold('sprint', false);
  check('infinite stamina cheat', f.stamina >= 50, f.stamina); EF.Dev.set('stamina0', false);
  noErr(L, 'dev');
};

T.determinism = () => {
  const L = fresh(), { EF } = L;
  const run = () => { const m = new EF.Match({ home: 'kipperton', away: 'stahlpresse', seed: 42, silent: true, halfLength: 30 }); for (let i = 0; i < 1800; i++) m.update(1 / 120); const s = JSON.stringify([m.score, m.players.map(f => [Math.round(f.body.x), Math.round(f.body.y)]), Math.round(m.ball.x), Math.round(m.ball.y), m.stats]); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const a = run(), b = run(); check('the same seed gives the same match', a === b, a + ' vs ' + b);
  noErr(L, 'determinism');
};

T.lint = () => {
  const src = f => readFileSync(join(DEV, 'src', f), 'utf8');
  for (const f of readdirSync(join(DEV, 'src'))) {
    const s = src(f);
    if (/^1[0-8]-|^20-/.test(f)) check('no Math.random in sim file ' + f, !/Math\.random/.test(s));
    check('no forbidden APIs in ' + f, !/(?<![.\w'])(alert|confirm|prompt)\s*\(|window\.open|\bfetch\s*\(|new WebSocket|RTCPeerConnection|ctx\.arc|\.fillText\(|createLinearGradient/.test(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^'\n]*'/g, "''")), f);
  }
};

T.playthrough = () => {
  const L = fresh({ seed: 2026 }), { EF, game, I, snap } = L;
  game.settings.set('halfLen', '90'); EF.T.halfLength = 30; game.settings.set('difficulty', 'easy');
  EF.Dev.set('watch', true); EF.Dev.set('keeper0', true); EF.Dev.set('fullEuph0', true);
  const seen = { corner: 0, freekick: 0, card: 0, superStrike: 0, replay: 0, bus: 0, challenge: 0 };
  EF.bus.on('setpiece', e => { if (e.kind === 'corner') seen.corner++; if (e.kind === 'freekick') seen.freekick++; }); EF.bus.on('card', () => seen.card++); EF.bus.on('superStrike', () => seen.superStrike++); EF.bus.on('replayStart', () => seen.replay++); EF.bus.on('bus', () => seen.bus++); EF.bus.on('challengeDone', () => seen.challenge++); const against = []; EF.bus.on('goal', e => { if (e.side === 1 && e.match && e.match.o.cup != null) against.push(e.kind + (e.super ? '*' : '')); });
  const scenes = []; let granted = 0, forcedCorner = false; EF.headlessReplays = true;
  // advance the cup's screens like a player: confirm through dialogs and CONTINUEs, pick the first team talk
  const drive = (maxS, until) => { for (let t = 0; t < maxS && !until(); t += .25) { const s = snap().scene; if (scenes[scenes.length - 1] !== s) scenes.push(s); if (s === 'cup' || s === 'tunnel' || s === 'results') { I.tap('confirm'); } if (s === 'match') { const m = EF.LIVE.m; if (m && m.o.cup === 3 && m.half === 2 && !m.bus && m.score[1] <= m.score[0]) { m.score[1] = m.score[0] + 1; } if (m && m.o.cup != null && m.minute > 84 && m.half === 2 && m.score[0] <= m.score[1] && (m.o.cup !== 3 || m.bus)) { m.score[0] = m.score[1] + 1; granted++; } if (m && m.o.cup === 0 && !seen.corner && m.minute > 30 && m.mode === 'play') { EF.Dev.open(); EF.Dev.warps().find(w => w.label === 'NOW: CORNER').onPick(); forcedCorner = true; } } game.advance(.25); } };
  game.go('title', { menu: true }); game.advance(.3); game.scene.menu.i = 0; I.tap('confirm'); game.advance(.3);
  check('CUP RUN opens the bracket', snap().scene === 'cup');
  I.tap('confirm'); game.advance(.4);   // START THE CUP RUN (the only enabled item)
  for (let round = 0; round < 5; round++) {
    drive(240, () => snap().scene === 'match');
    check('round ' + (round + 1) + ' reaches its match', snap().scene === 'match', snap().scene + ' ' + JSON.stringify(snap().cup));
    drive(900, () => snap().scene !== 'match');
    const res = EF.Save.data.cup.results[round];
    check('round ' + (round + 1) + ' is won and saved', res && res.won, JSON.stringify(res) + ' conceded ' + against.join(',') + ' ' + JSON.stringify(snap()).slice(0, 400));
    if (round === 3) check('the semi-final shows the bus', seen.bus > 0);
  }
  drive(120, () => snap().scene === 'ending'); check('the final leads to the ending', snap().scene === 'ending', snap().scene);
  for (let i = 0; i < 4; i++) { game.advance(1.2); I.tap('confirm'); game.advance(.2); }
  drive(60, () => snap().scene === 'title'); check('the ending returns to the title', snap().scene === 'title', snap().scene);
  check('the cup is finished', EF.Save.data.cup.done === true);
  check('stickers were earned', Object.keys(EF.Save.data.stickers).length >= 30, Object.keys(EF.Save.data.stickers).length);
  check('over the run: corners, free kicks, cards, super strikes, replays', seen.corner > 0 && seen.freekick > 0 && seen.card > 0 && seen.superStrike > 0 && seen.replay > 0, JSON.stringify(seen) + ' (wins granted by the dev goal: ' + granted + ', corner forced: ' + forcedCorner + ')');
  EF.Dev.set('watch', false); EF.Dev.set('keeper0', false); EF.Dev.set('fullEuph0', false);
  // Kick-About with two local players, one on each side
  const p2 = game.addPlayer({ keys: 'right' });
  game.go('match', { home: 'kipperton', away: 'pasapasa', stadium: 'pasapasa', humans: [{ input: I, side: 0 }, { input: p2, side: 1 }], seed: 3 }); game.advance(20);
  check('Kick-About plays with two players on two sides', snap().humans.length === 2 && snap().humans.every(Boolean), JSON.stringify(snap().humans));
  game.removePlayer(p2);
  // penalties mode plays a full shootout
  game.go('match', { home: 'kipperton', away: 'opulence', stadium: 'euphorium', humans: [], shootoutOnly: true, draws: 'pens', seed: 9, onEnd: () => game.go('title', { menu: true }) }); drive(120, () => snap().scene !== 'match');
  check('penalties mode plays a whole shootout', snap().scene === 'title', snap().scene);
  // training: drill 1 by script
  game.go('training', { drill: 'move' }); game.advance(.5);
  for (let i = 0; i < 20 && game.scene.talk.open; i++) { I.tap('confirm'); game.advance(.3); }
  const D = EF.DRILL; let guard = 0;
  while (D.d && D.d.id === 'move' && guard++ < 2000) {
    const m = D.m, f = m.slots[0].f, sc = game.scene;
    if (sc.talk.open) { I.tap('confirm'); game.advance(.2); continue; }
    if (D.step === 0 && D.st.cones) { const c = D.st.cones[D.st.cone]; if (c) { f.body.x = c.x; f.body.y = c.y; } }
    if (D.step === 1) { I.hold('sprint'); I.hold('right'); }
    if (D.step === 2) { I.hold('sprint', false); I.hold('right', false); }
    game.advance(.1);
  }
  I.hold('sprint', false); I.hold('right', false);
  check('training drill 1 completes', EF.Save.data.drills.move === true, JSON.stringify(EF.Save.data.drills));
  // about pages through to the end; the album shows stickers
  game.go('about'); game.advance(.3); const n = game.scene.pages().length; for (let i = 0; i < n; i++) { I.tap('skill'); game.advance(.1); } check('About pages turn through all ' + n, game.scene.page === 0);
  game.go('album'); game.advance(.3); check('the album opens with earned stickers', snap().scene === 'album' && Object.keys(EF.Save.data.stickers).length > 0);
  noErr(L, 'playthrough');
};

T.hubsim = async () => {
  // a fake hub between two copies: host and client, latency 60 ms; checks the card, ready, start, traffic, a goal, leave, finish, end
  const net = [], copies = [];
  const mkHub = (id, host) => ctx => {
    const handlers = {}, me = id;
    ctx.location.search = '?aihub=1';
    const H = { active: true, me, isHost: host, server: false, host: 0, players: [{ id: 0, name: 'ALICE', color: '#e8443a' }, { id: 1, name: 'BOB', color: '#3b82f6' }], seed: 77, limitMs: 240000, sentN: 0, rate: [],
      connect: () => Promise.resolve({ me, players: H.players, host: 0, isHost: host, server: false, mode: 'shared-world', round: 1, limitMs: 240000, seed: 77 }),
      ready() { H.readyCalled = true; }, answer(a) { H.answers = (H.answers || []).concat(a); }, on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; },
      send(data, o = {}) { const s = JSON.stringify(data); H.sentN++; H.maxBytes = Math.max(H.maxBytes || 0, s.length); if (data.t === 's') H.maxSnap = Math.max(H.maxSnap || 0, s.length); H.rate.push(H.clock || 0); net.push({ from: me, data: JSON.parse(s), at: (H.clock || 0) + .06 }); return true; },
      time: () => H.started ? (H.clock - H.started) * 1000 - 3000 : -Infinity, finish(r) { H.finished = r; }, progress() {}, result() {}, rng: label => { let s = 77 + label.length * 1013; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }, fail() {},
      _emit(ev, ...a) { for (const fn of handlers[ev] || []) fn(...a); } };
    ctx.AIHub = H; copies[id] = H;
  };
  const A1 = load({ hub: mkHub(0, true), search: '?aihub=1' }), B1 = load({ hub: mkHub(1, false), search: '?aihub=1' });
  const step = (s) => { for (let t = 0; t < s; t += 1 / 60) { for (const [L, H] of [[A1, copies[0]], [B1, copies[1]]]) { H.clock = (H.clock || 0) + 1 / 60; L.game.advance(1 / 60); }
    for (let i = net.length - 1; i >= 0; i--) { const n = net[i]; if (n.at <= copies[0].clock) { net.splice(i, 1); const to = n.from === 0 ? copies[1] : copies[0]; to._emit('message', n.data, n.from); } } } };
  step(.2); await new Promise(r => setTimeout(r, 5)); step(.2); await new Promise(r => setTimeout(r, 5)); step(1.2);
  check('both copies reach the card (the tunnel) with no key press', A1.snap().scene === 'tunnel' && B1.snap().scene === 'tunnel', A1.snap().scene + ' ' + B1.snap().scene);
  check('both copies call ready()', copies[0].readyCalled && copies[1].readyCalled);
  A1.I.tap('confirm'); step(.1); check("Enter answers 'ready' on the card", (copies[0].answers || []).includes('ready'));
  for (const H of copies) { H.started = H.clock; H._emit('start', { in: 3000 }); }
  step(1); check('the match starts on start', A1.snap().scene === 'match' && B1.snap().scene === 'match');
  step(2.5); const before = A1.snap().clock; step(1); check('play begins when the hub clock reaches 0', A1.snap().clock > before);
  copies[0].rate = []; step(5); const r0 = copies[0].rate.length / 5;
  check('the host sends at most 20 messages a second', r0 <= 20 && r0 > 10, r0);
  check('snapshots stay under 1,100 bytes', (copies[0].maxSnap || 0) < 1100, copies[0].maxSnap);
  check('the client sends its input', copies[1].sentN > 30, copies[1].sentN);
  const mA = A1.EF.LIVE.m, mB = B1.EF.LIVE.m;
  check('the client mirror follows the ball', Math.hypot(mA.ball.x - mB.ball.x, mA.ball.y - mB.ball.y) < 40, Math.round(mA.ball.x) + ',' + Math.round(mA.ball.y) + ' vs ' + Math.round(mB.ball.x) + ',' + Math.round(mB.ball.y));
  // the client's input moves its footballer on the host
  const slB = mA.slots[1]; const f = slB.f, x0 = f.body.x; B1.I.hold('left'); step(1.2); B1.I.hold('left', false);
  check("the client's stick moves its footballer on the host", Math.abs(f.body.x - x0) > 20 || slB.f !== f, (f.body.x - x0).toFixed(1));
  // a goal on the host shows on the client
  mA.mode = 'play'; mA.sp = null; mA.last = mA.side[0][4]; mA.ball.x = mA.goalX(0) + mA.dir(0) * 6; mA.ball.y = 352; mA.ball.z = 3; mA.ball.prevPast = null; mA.goalScored(0);
  step(.6); check('a goal on the host shows on the client within 0.5 s', mB.score[0] === mA.score[0] && mA.score[0] === 1, mB.score + ' vs ' + mA.score);
  // leave: the footballer goes to the CPU
  copies[0]._emit('leave', { id: 1, reason: 'left' }); step(.5); check('leave hands the footballer to the CPU', mA.slots[1].menu && !mA.slots[1].f);
  // time-up: the host finishes at once with standings
  copies[0]._emit('time-up', { graceMs: 3000 }); step(.1); const fin = copies[0].finished;
  check('time-up makes the host finish at once', !!fin, JSON.stringify(fin));
  check('finish puts the winners first', fin && fin.standings[0].includes(0), fin && JSON.stringify(fin.standings));
  for (const H of copies) H._emit('end', { reason: 'finished' }); const sent = copies[1].sentN; step(1); check('after end the client sends nothing', copies[1].sentN === sent);
  noErr(A1, 'hub host'); noErr(B1, 'hub client');
};

T.soak = () => {
  const L = fresh(), { EF } = L; const opp = ['hoofington', 'pasapasa', 'stahlpresse', 'lucchetto', 'opulence'];
  const agg = { goals: 0, shots: 0, pd: 0, pa: 0, n: 0, corners: 0, fk: 0, poss: [] };
  for (const o of opp) for (let s = 0; s < 6; s++) {
    const m = new EF.Match({ home: 'kipperton', away: o, seed: 1000 + s, silent: true, halfLength: 60 }); let n = 0; while (m.mode !== 'over' && n++ < 120 * 300) m.update(1 / 120);
    agg.n++; agg.goals += m.score[0] + m.score[1]; agg.shots += m.stats[0].shots + m.stats[1].shots; agg.pd += m.stats[0].passDone + m.stats[1].passDone; agg.pa += m.stats[0].passes + m.stats[1].passes; agg.corners += m.stats[0].corners + m.stats[1].corners; agg.fk += m.stats[0].fouls + m.stats[1].fouls; agg.poss.push(m.stats[0].poss / (m.stats[0].poss + m.stats[1].poss || 1));
  }
  const g = agg.goals / agg.n, sh = agg.shots / agg.n, pc = agg.pd / agg.pa;
  console.log(`soak: ${agg.n} matches, goals ${g.toFixed(1)}, shots ${sh.toFixed(1)}, pass completion ${(pc * 100).toFixed(0)}%, corners ${(agg.corners / agg.n).toFixed(1)}, fouls ${(agg.fk / agg.n).toFixed(1)}, possession ${agg.poss.map(p => Math.round(p * 100)).join(' ')}`);
  check('goals per match 2-7', g >= 2 && g <= 7, g); check('shots per match 8-24', sh >= 8 && sh <= 24, sh); check('pass completion 50-90%', pc >= .5 && pc <= .9, pc);
};

for (const s of suites) { suite = s; if (!T[s]) { check('suite exists', false, s); continue; } try { await T[s](); } catch (e) { check('ran', false, (e.stack || e).toString().split('\n').slice(0, 4).join(' / ')); } }
console.log(`Europhoria tests: ${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
