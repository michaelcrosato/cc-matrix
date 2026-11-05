// THE test command: node tools/test.mjs [suite ...]. Prints only failures (FAIL <suite> <test>: <detail>) and one count
// line. Suites: unit rules euphoria ai content ui saves attract dev training determinism lint playthrough hubsim sweep
// audio browser hub task (TASK.md line by line)
import { load } from './lib/load.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const ALL = ['unit', 'rules', 'euphoria', 'ai', 'content', 'ui', 'saves', 'attract', 'dev', 'training', 'determinism', 'lint', 'playthrough', 'hubsim', 'sweep', 'audio', 'browser', 'hub', 'task'];
const want = process.argv.slice(2).filter(a => !a.startsWith('-')), suites = want.length ? want : ALL;
let pass = 0, fail = 0; const t0 = Date.now();
const check = (suite, name, ok, detail = '') => { if (ok) pass++; else { fail++; console.log('FAIL ' + suite + ' ' + name + (detail ? ': ' + String(detail).slice(0, 300) : '')); } };
const fresh = (o = {}) => { const errs = []; const h = load(Object.assign({ errors: e => errs.push(e) }, o)); h.errs = errs; h.game.advance(.2); return h; };
const noErr = (S, h, name) => check(S, name + ' (no errors)', !h.game.errors.length, h.game.errors.map(e => (e.message || e) + ' ' + String(e.stack || '').split('\n')[1]).join(' | '));
const step = (h, s) => h.game.advance(s);
const mk = (h, o = {}) => new h.EF.Match(Object.assign({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse', seed: 3, halfLength: 60, humans: [], noReplay: true, kind: 'kickabout' }, o));
const run = (m, s) => { for (let i = 0; i < s * 120; i++) m.update(1 / 120); };
const play = m => { m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; } };
const suitesFn = {
  unit() {
    const S = 'unit', h = fresh(), { EF } = h, P = EF.P;
    // the goal line: over by r - 1 is no goal; r + 1 is
    let m = mk(h); play(m); const b = m.ball, gx0 = m.goalX(0);
    b.place(gx0 + b.r - 1, P.CY, 5); b.vx = 1; let goals = m.score[0]; m.ballRules(b); check(S, 'ball over the line by r-1 is no goal', m.score[0] === goals);
    m = mk(h); play(m); m.ball.place(m.goalX(0) + m.ball.r + 1, P.CY, 5); m.ballRules(m.ball); check(S, 'ball over the line by r+1 is a goal', m.score[0] === 1);
    m = mk(h); play(m); m.ball.place(m.goalX(0) + 5, P.CY, P.BAR + 4); m.lastTouch = m.side[0][4]; m.ballRules(m.ball); check(S, 'a ball over the bar is no goal', m.score[0] === 0 && m.setpiece && m.setpiece.kind === 'goalkick');
    // posts and bar reflect
    for (const [name, y, z] of [['near post', P.CY - P.GH, 10], ['far post', P.CY + P.GH, 10], ['bar', P.CY, P.BAR]]) { m = mk(h); play(m); for (const f of m.players) f.ghost = true; const B = m.ball, gx = m.goalX(0); B.place(gx - 20, y, z); B.vx = 300 * Math.sign(gx - P.CX); B.vy = 0; B.vz = 0; B.onGround = false; let hit = false; const un = EF.bus.on('woodwork', () => hit = true); for (let i = 0; i < 30; i++) m.update(1 / 120); un(); check(S, name + ' reflects', hit && Math.sign(B.vx) !== Math.sign(gx - P.CX), 'vx ' + B.vx); }
    // the net stops the ball within 0.5 s
    m = mk(h); play(m); { const B = m.ball, gx = m.goalX(0), s = Math.sign(gx - P.CX); B.place(gx - s * 30, P.CY, 8); B.vx = s * 380; B.vz = 0; for (let i = 0; i < 60; i++) m.update(1 / 120); const sp = Math.hypot(B.vx, B.vy); check(S, 'the net stops the ball within 0.5 s', sp < 80 && Math.abs(B.x - gx) <= P.NET + 4, 'speed ' + sp.toFixed(1) + ' x ' + B.x.toFixed(1)); }
    // rolling distance by surface: mud < snow < grass < hard < wet
    const roll = surf => { const mm = mk(h, { stadium: 'pasapasa' }); play(mm); mm.surface = surf; mm.pitch.surfaceAt = () => surf; const B = mm.ball; B.place(P.CX - 200, P.CY, 0); B.vx = 200; for (let i = 0; i < 300; i++) { B.update(1 / 120); } return B.x; };
    const d = ['mud', 'snow', 'grass', 'hard', 'wet'].map(roll); check(S, 'surfaces: mud < snow < grass < hard < wet', d.every((v, i) => i === 0 || v > d[i - 1]), d.map(v => v.toFixed(0)).join(' '));
    // the half keyboards (section 2.2)
    const L = h.E.Input.halfKeys(EF.KEYS, 'left'), R = h.E.Input.halfKeys(EF.KEYS, 'right');
    check(S, 'left half: pass..dive on F G H R T Y V B', ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive'].map(a => L[a][0]).join(' ') === 'KeyF KeyG KeyH KeyR KeyT KeyY KeyV KeyB', ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive'].map(a => L[a][0]).join(' '));
    check(S, "right half: pass..dive on . / , L ; ' K M", ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive'].map(a => R[a][0]).join(' ') === 'Period Slash Comma KeyL Semicolon Quote KeyK KeyM');
    // the chord: switch + skill fires euphoria; Space fires it
    { const hh = fresh({ hash: '#match' }), m2 = hh.EF.cur.m, I = hh.I; hh.EF.test.giveBall(0, 4, 500, 300); m2.euphoria[0] = 100; I.press('KeyQ'); I.press('KeyE'); hh.game.advance(.05); I.release('KeyQ'); I.release('KeyE'); hh.game.advance(.2); check(S, 'Q + E chord fires Europhoria', !!m2.europhoria, JSON.stringify(hh.snap().euphoria)); }
    { const hh = fresh({ hash: '#match' }), m2 = hh.EF.cur.m, I = hh.I; hh.EF.test.giveBall(0, 4, 500, 300); m2.euphoria[0] = 100; I.tap('euphoria'); hh.game.advance(.1); check(S, 'Space fires Europhoria', !!m2.europhoria); }
    // stamina: sprint drains 20/s, rest regains 14/s after 0.5 s
    { m = mk(h); play(m); const f = m.side[0][2], it = EF.Intent.make(); it.move = [1, 0]; it.sprint = true; f.stamina = 100; f.body.x = P.CX; for (let i = 0; i < 120; i++) { f.step(1 / 120, it, false); } const drained = 100 - f.stamina; const it2 = EF.Intent.make(); for (let i = 0; i < 120 * 1.5; i++) f.step(1 / 120, it2, false); const regained = f.stamina - (100 - drained); check(S, 'sprint drains about 20 a second', Math.abs(drained - 20) < 4, drained.toFixed(1)); check(S, 'rest regains about 14 a second after 0.5 s', Math.abs(regained - 14) < 3, regained.toFixed(1)); }
    // the receiver the stick points at, for 8 directions
    { m = mk(h); play(m); const me = m.side[0][2]; me.body.x = P.CX; me.body.y = P.CY; const mates = m.side[0].filter(f => f !== me && f.role !== 'GK'); const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; mates.forEach((f, i) => { f.body.x = P.CX + dirs[i % 4][0] * 120; f.body.y = P.CY + dirs[i % 4][1] * 120; }); let ok = 0; mates.forEach((f, i) => { if (me.receiver(dirs[i % 4], 'ground') === f) ok++; }); check(S, 'the pass goes to the teammate the stick points at', ok === mates.length, ok + '/' + mates.length); }
    // a pass at a moving receiver arrives within 8 units of him (50 seeded cases)
    { let near = 0; for (let k = 0; k < 50; k++) { m = mk(h, { seed: 100 + k }); play(m); const a = m.side[0][2], r2 = m.side[0][3]; for (const f of m.players) if (f !== a && f !== r2) f.ghost = true; a.body.x = P.CX - 60; a.body.y = P.CY; r2.body.x = P.CX + 40 + (k % 5) * 20; r2.body.y = P.CY + 40; m.setOwner(a); const dirY = k % 2 ? -1 : 1;
      m.script = f => { const i2 = EF.Intent.make(); if (f === r2) i2.move = [0, dirY * .6]; return i2; }; for (let i = 0; i < 36; i++) m.update(1 / 120);
      m.setOwner(a); m.ownerBall(0); const it = EF.Intent.make(); it.target = r2; it.pass.pressed = true; a.cool = 0; a.act(it, 1 / 120); let best = 99;
      for (let i = 0; i < 200; i++) { m.update(1 / 120); best = Math.min(best, Math.hypot(m.ball.x - r2.body.x, m.ball.y - r2.body.y)); if (m.owner === r2) { best = 0; break; } } if (best < 8) near++; }
      check(S, 'a pass at a moving receiver arrives within 8 of him (50 cases)', near >= 47, near + '/50'); }
    // a keeper catches a soft shot straight at him and is beaten by a fierce one in the corner
    { let caught = 0, beaten = 0; for (let k = 0; k < 10; k++) { m = mk(h, { seed: 200 + k }); play(m); const s = m.side[0][4], k1 = m.keeper(1), gx = m.goalX(0), dir = m.dir(0); s.body.x = gx - dir * 120; s.body.y = P.CY; k1.body.x = gx - dir * 10; k1.body.y = P.CY; m.setOwner(s); m.ownerBall(0); s.shoot(.15, Object.assign(EF.Intent.make(), { aimPoint: { x: gx, y: P.CY } })); for (let i = 0; i < 120; i++) m.update(1 / 120); if (m.owner === k1 || m.stats.saves[1] > 0) caught++; }
      for (let k = 0; k < 10; k++) { m = mk(h, { seed: 300 + k }); play(m); const s = m.side[0][4], k1 = m.keeper(1), gx = m.goalX(0), dir = m.dir(0); s.body.x = gx - dir * 70; s.body.y = P.CY; k1.body.x = gx - dir * 10; k1.body.y = P.CY; m.setOwner(s); m.ownerBall(0); s.shoot(1, Object.assign(EF.Intent.make(), { aimPoint: { x: gx, y: P.CY + P.GH - 6 } })); for (let i = 0; i < 120; i++) m.update(1 / 120); if (m.score[0] > 0) beaten++; }
      check(S, 'keepers save soft shots at them', caught >= 8, caught + '/10'); check(S, 'keepers are beaten by hard shots in the corner', beaten >= 4, beaten + '/10'); }
    noErr(S, h, 'unit');
  },
  rules() {
    const S = 'rules', h = fresh(), { EF } = h, P = EF.P;
    let m = mk(h); play(m); m.lastTouch = m.side[1][2]; m.ball.place(m.goalX(0) + 8, P.CY + P.GH + 20, 2); m.ballRules(m.ball); check(S, 'out off a defender: a corner', m.setpiece && m.setpiece.kind === 'corner' && m.setpiece.side === 0);
    m = mk(h); play(m); m.lastTouch = m.side[0][2]; m.ball.place(m.goalX(0) + 8, P.CY + P.GH + 20, 2); m.ballRules(m.ball); check(S, 'out off an attacker: a goal kick', m.setpiece && m.setpiece.kind === 'goalkick' && m.setpiece.side === 1);
    m = mk(h); play(m); m.lastTouch = m.side[0][2]; m.ball.place(P.CX, P.Y0 - 9, 30); m.ballRules(m.ball); check(S, 'into the crowd: thrown back to the other side', m.setpiece && m.setpiece.kind === 'throwback' && m.setpiece.side === 1);
    // a foul from behind is a foul; a fair front tackle is not
    m = mk(h); play(m); { const a = m.side[0][2], v = m.side[1][3]; v.facing = 0; a.body.x = v.body.x - 6; a.body.y = v.body.y; let fouls = 0; const un = EF.bus.on('foul', () => fouls++); m.setOwner(v); m.ref.judge(a, v, { kind: 'slide', speed: 190 }); check(S, 'a slide from behind is a foul', fouls === 1); un(); }
    m = mk(h); play(m); { const a = m.side[0][2], v = m.side[1][3]; v.facing = Math.PI; a.body.x = v.body.x - 6; a.body.y = v.body.y; let fouls = 0; const un = EF.bus.on('foul', () => fouls++); m.ref.judge(a, v, { kind: 'poke', speed: 40 }); check(S, 'a gentle poke from the front is not', fouls === 0); un(); }
    // severities: yellow, red, a second yellow
    m = mk(h); play(m); { const a = m.side[1][2], v = m.side[0][3]; m.owner = null; m.foul(a, v, 1.6, { sev: 1 }); check(S, 'k 1.6 is a yellow', m.cardNow && m.cardNow.color === 'yellow'); }
    m = mk(h); play(m); { const a = m.side[1][2], v = m.side[0][3]; m.foul(a, v, 3, { sev: 2 }); check(S, 'k 3 is a red', m.cardNow && m.cardNow.color === 'red'); for (let i = 0; i < 360; i++) m.update(1 / 120); check(S, 'a red sends him off and his side plays with 3 outfield', a.sentOff && m.outfield(1).length === 3, m.outfield(1).length); check(S, "the formation's drop role is gone", !m.side[1].some(f => !f.sentOff && f.slot === m.formation[1].drop) || m.formation[1].drop === a.slot); }
    m = mk(h); play(m); { const a = m.side[1][2], v = m.side[0][3]; a.cards = 1; m.foul(a, v, 1.6, { sev: 1 }); for (let i = 0; i < 360; i++) m.update(1 / 120); check(S, 'a second yellow is a red', a.sentOff); }
    // advantage
    m = mk(h); play(m); { const a = m.side[1][2], v = m.side[0][3], o = m.side[0][2]; m.setOwner(o); m.foul(a, v, .9, { sev: .7 }); let adv = false; const un = EF.bus.on('advantage', () => adv = true); for (let i = 0; i < 120; i++) { m.update(1 / 120); if (m.owner !== o && !adv) m.setOwner(o); } un(); check(S, 'advantage plays on when the fouled side keeps the ball', adv && m.mode === 'play'); }
    // a foul in the box: a penalty
    m = mk(h); play(m); { const a = m.side[1][2], v = m.side[0][4]; v.body.x = m.goalX(0) - m.dir(0) * 50; v.body.y = P.CY; m.o.noVar = true; m.foul(a, v, .9, { sev: .7 }); for (let i = 0; i < 30; i++) m.update(1 / 120); check(S, 'a foul in the box is a penalty', m.setpiece && m.setpiece.kind === 'penalty' || m.mode === 'var', m.mode + ' ' + (m.setpiece && m.setpiece.kind)); }
    // VAR overturns only soft penalties
    { let over = 0, hard = 0; for (let k = 0; k < 20; k++) { m = mk(h, { seed: 50 + k }); play(m); m.startVar({ kind: 'penalty', foul: { sev: .5, x: P.CX, y: P.CY }, side: 0 }); for (let i = 0; i < 520; i++) m.update(1 / 120); if (m.setpiece && m.setpiece.kind === 'freekick') over++; m = mk(h, { seed: 50 + k }); play(m); m.startVar({ kind: 'penalty', foul: { sev: 1.2, x: P.CX, y: P.CY }, side: 0 }); for (let i = 0; i < 520; i++) m.update(1 / 120); if (m.setpiece && m.setpiece.kind === 'freekick') hard++; } check(S, 'VAR overturns some soft penalties and no hard ones', over > 3 && hard === 0, 'soft ' + over + ' hard ' + hard); }
    // the clock: 2:00 real is 45 game minutes; stoppage 1..5
    m = mk(h, { halfLength: 120 }); play(m); m.clock = 60; check(S, '60 s of a 120 s half is 22.5 minutes', Math.abs(m.minute - 22.5) < .01);
    m = mk(h, { halfLength: 20 }); play(m); m.stopT = 999; m.clock = 19.6; m.cheats.stamina0 = true; for (let i = 0; i < 120; i++) m.update(1 / 120); check(S, 'stoppage time is at most 5', m.stoppage >= 1 && m.stoppage <= 5, m.stoppage);
    // extra time is golden goal; the shootout
    m = mk(h, { draws: 'cup', halfLength: 20 }); play(m); m.half = 2; m.score = [1, 1]; m.endHalf(); check(S, 'a cup draw goes to golden-goal extra time', m.half === 3 && m.golden);
    m.lastKick = m.side[0][4]; m.lastTouch = m.lastKick; play(m); m.goalScored(0); for (let i = 0; i < 120 * 12 && !m.over; i++) m.update(1 / 120); check(S, 'a golden goal ends the match', m.over && m.result && m.result.winner === 0, m.mode);
    m = mk(h, { shootoutOnly: true }); { let n = 0; m.cheats.nokeeper1 = true; m.cheats.keeper0 = true; for (let i = 0; i < 120 * 60 && !m.over; i++) m.update(1 / 120); n = m.shootout.kicks[0].length + m.shootout.kicks[1].length; check(S, 'the shootout ends early when a side cannot catch up', m.over && n < 10, n + ' kicks'); }
    m = mk(h, { shootoutOnly: true }); m.cheats.nokeeper0 = true; m.cheats.nokeeper1 = true; for (let i = 0; i < 120 * 90 && !m.over; i++) m.update(1 / 120); check(S, 'level after 5 each: sudden death', m.shootout.sudden || m.shootout.kicks[0].length > 5 || m.over, JSON.stringify(m.shootout.score));
    // the shirt-over-head celebration is a booking
    m = mk(h); play(m); { const f = m.side[0][4]; m.lastKick = f; m.lastTouch = f; m.goalScored(0); m.celebration.pick = EF.get('celebration', 'shirt'); m.celebration.human = null; m.celebration.pick = null; m.celebration.offer[0] = EF.get('celebration', 'shirt'); for (let i = 0; i < 120 * 8; i++) m.update(1 / 120); check(S, 'shirt over the head: a yellow card', f.cards === 1, 'cards ' + f.cards + ' mode ' + m.mode); }
    noErr(S, h, 'rules');
  },
  euphoria() {
    const S = 'euphoria', h = fresh(), { EF } = h, P = EF.P;
    let m = mk(h); play(m); const s0 = m.side[0];
    m.emit('passDone', { who: s0[2], side: 0, chain: 1 }); check(S, 'a completed pass +2', Math.abs(m.euphoria[0] - 2) < .01, m.euphoria[0]);
    m.euphoria[0] = 0; m.emit('passDone', { who: s0[2], side: 0, chain: 9 }); check(S, 'a long chain caps at +8', Math.abs(m.euphoria[0] - 8) < .01, m.euphoria[0]);
    m.euphoria[0] = 50; for (let i = 0; i < 120; i++) m.update(1 / 120); check(S, 'decay about 1.5 a second', m.euphoria[0] < 50 && m.euphoria[0] > 47.5, m.euphoria[0]);
    m = mk(h); play(m); m.euphoria[0] = 99; let full = false; const un = EF.bus.on('euphoriaFull', () => full = true); m.addEuphoria(0, 5, 'test'); un(); check(S, 'Euphoria full at 100', full);
    check(S, 'Europhoria triggers when full', m.triggerEuphoria(0) && !!m.europhoria); const t0 = m.t; for (let i = 0; i < 120 * 9 && m.europhoria; i++) m.update(1 / 120); check(S, 'Europhoria lasts about 8 s', Math.abs(m.t - t0 - 8) < .2, (m.t - t0).toFixed(2));
    // every super path reaches the goal mouth from 230 out
    for (const sp of EF.all('super')) {
      m = mk(h, { seed: 9 }); play(m); m.cheats.nokeeper1 = true; const f = m.side[0][4], gx = m.goalX(0); f.data = Object.assign({}, f.data, { captain: true, super: sp.id }); f.body.x = gx - m.dir(0) * 230; f.body.y = P.CY; m.setOwner(f); m.euphoria[0] = 100; m.triggerEuphoria(0);
      f.shoot(.95, EF.Intent.make()); let goal = false; const u2 = EF.bus.on('goal', ev => { if (ev.match === m) goal = true; }); for (let i = 0; i < 120 * 5 && !goal; i++) m.update(1 / 120); u2();
      check(S, 'super ' + sp.id + ' (' + sp.path + ') reaches the goal', goal, m.mode);
    }
    // one super a Europhoria
    m = mk(h); play(m); { const f = m.side[0][4]; m.setOwner(f); m.euphoria[0] = 100; m.triggerEuphoria(0); m.superUsed = true; let sup = 0; const u3 = EF.bus.on('superStrike', () => sup++); f.shoot(.95, EF.Intent.make()); u3(); check(S, 'only one super a Europhoria', sup === 0); }
    // the Save Duel windows
    const duel = off => { const hh = fresh({ hash: '#match', search: '?seed=7' }), mm = hh.EF.cur.m; hh.EF.parts.duel(mm); for (let i = 0; i < 120 * 4 && !mm.duel; i++) hh.game.advance(1 / 120); if (!mm.duel) return 'no duel'; const D = mm.duel; let r = null; const u4 = hh.EF.bus.on('saveDuelResult', ev => { r = ev.result; }); D.press = D.dur + off; for (let i = 0; i < 30 && !r; i++) hh.game.advance(1 / 120); u4(); return r; };
    check(S, 'a press at +59 ms is PERFECT', duel(.059) === 'perfect'); check(S, 'at -61 ms is GOOD', duel(-.061) === 'good'); check(S, 'at +141 ms is a MISS', duel(.141) === 'miss');
    noErr(S, h, 'euphoria');
  },
  ai() {
    const S = 'ai', h = fresh(), { EF } = h, P = EF.P;
    // formation spots are reached within 1.5 s
    for (const fid of ['2-2', '1-2-1', '2-1-1', '3-1']) { const m = mk(h, { formation: [fid, fid] }); play(m); for (let i = 0; i < 180; i++) m.update(1 / 120); const off = m.outfield(1).filter(f => f !== m.owner).map(f => { const sp = m.brains[1].spot(f); return Math.hypot(sp[0] - f.body.x, sp[1] - f.body.y); }); check(S, 'formation ' + fid + ' spots reached', off.filter(d => d > 80).length <= 1, off.map(d => d.toFixed(0)).join(' ')); }
    // the bus: Lucchetto leading after 60'
    let m = mk(h, { home: 'kipperton', away: 'lucchetto', stadium: 'lucchetto' }); play(m); m.half = 2; m.clock = m.halfLen * 16 / 45; m.score = [0, 1]; for (let i = 0; i < 30; i++) m.update(1 / 120); check(S, "Lucchetto park the bus leading after 60'", !!m.bus);
    m = mk(h, { home: 'kipperton', away: 'lucchetto', stadium: 'lucchetto' }); play(m); m.half = 2; m.clock = m.halfLen * 16 / 45; m.score = [1, 0]; for (let i = 0; i < 30; i++) m.update(1 / 120); check(S, 'and not when losing', !m.bus);
    m = mk(h, { home: 'kipperton', away: 'opulence', stadium: 'euphorium' }); play(m); m.half = 2; m.clock = m.halfLen * 36 / 45; m.score = [1, 1]; for (let i = 0; i < 30; i++) m.update(1 / 120); check(S, "Opulence's Golden Moment at 80'", m.goldenMoment && m.europhoria && m.europhoria.side === 1);
    // the soak (short): AI v AI, each tactic against Kipperton
    const tot = { goals: 0, shots: 0, pc: 0, n: 0, stuckP: 0, stuckB: 0, corners: 0, fks: 0 };
    for (const opp of ['hoofington', 'pasapasa', 'stahlpresse', 'lucchetto', 'opulence']) for (let k = 0; k < (process.argv.includes('--soak') ? 20 : 2); k++) {
      const mm = mk(h, { away: opp, stadium: EF.get('team', opp).stadium, seed: 700 + k, halfLength: 60 }); let still = 0, bs = 0; const last = new Map();
      for (let i = 0; i < 120 * 300 && !mm.over; i++) { mm.update(1 / 120); if (mm.mode === 'play' && i % 12 === 0) { if (!mm.owner && mm.ball.speed() < 1) bs++; else bs = 0; if (bs > 30) { tot.stuckB++; bs = 0; } } }
      tot.goals += mm.score[0] + mm.score[1]; tot.shots += mm.stats.shots[0] + mm.stats.shots[1]; tot.pc += (mm.stats.passesDone[0] + mm.stats.passesDone[1]) / Math.max(1, mm.stats.passes[0] + mm.stats.passes[1]); tot.corners += mm.stats.corners[0] + mm.stats.corners[1]; tot.fks += mm.stats.freekicks[0] + mm.stats.freekicks[1]; tot.n++;
      void still; void last;
    }
    const avg = k => tot[k] / tot.n;
    // a human side (the bot gives the CPU brain's decisions as stick and buttons) against the CPU at each difficulty
    const curve = {};
    for (const d of ['easy', 'normal', 'hard']) {
      let gd = 0, n = 0;
      for (let k = 0; k < 12; k++) {
        const hh = fresh(); hh.game.settings.set('difficulty', d); hh.EF.test.startMatch({ away: ['hoofington', 'stahlpresse', 'pasapasa', 'lucchetto'][k % 4], stadium: 'pasapasa', seed: 500 + k * 13, halfLength: 45, noReplay: true });
        const mm = hh.EF.cur.m, I = hh.I, held = new Set(), hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
        for (let t = 0; t < 30 * 200 && !mm.over; t++) {
          const f = mm.humans[0].fb;
          if (mm.mode === 'play' && f) { const it = mm.brains[0].intent(f, 1 / 30); hold('right', it.move[0] > .35); hold('left', it.move[0] < -.35); hold('down', it.move[1] > .35); hold('up', it.move[1] < -.35); hold('sprint', !!it.sprint); for (const a of ['pass', 'lob', 'through', 'skill']) if (it[a].pressed) I.tap(a); hold('shoot', !!it.shoot.down && f.charge < (it.power || .6)); }
          else { for (const a of [...held]) hold(a, false); if (t % 20 === 0) I.tap('confirm'); }
          hh.game.advance(1 / 30);
        }
        gd += mm.score[0] - mm.score[1]; n++;
      }
      curve[d] = gd / n;
    }
    if (process.argv.includes('--report')) console.log('difficulty curve (human goal difference a match)', JSON.stringify(curve));
    check(S, 'difficulty: the human side does better on Easy than on Normal, and on Normal than on Hard', curve.easy > curve.normal && curve.normal > curve.hard, JSON.stringify(curve));
    check(S, 'difficulty: Normal is a contest (average goal difference within 4)', Math.abs(curve.normal) < 4, JSON.stringify(curve));
    if (process.argv.includes('--report')) console.log('soak', JSON.stringify({ goals: avg('goals').toFixed(2), shots: avg('shots').toFixed(1), passPct: (avg('pc') * 100).toFixed(0), corners: avg('corners').toFixed(2), fks: avg('fks').toFixed(2), stuckBall: tot.stuckB }));
    check(S, 'soak: 2-9 goals a match on average', avg('goals') >= 2 && avg('goals') <= 9, avg('goals').toFixed(2)); check(S, 'soak: 8-40 shots a match', avg('shots') >= 8 && avg('shots') <= 40, avg('shots').toFixed(1));
    check(S, 'soak: pass completion 45-95%', avg('pc') > .45 && avg('pc') < .95, (avg('pc') * 100).toFixed(0)); check(S, 'soak: no ball stuck', tot.stuckB === 0, tot.stuckB);
    noErr(S, h, 'ai');
  },
  content() {
    const S = 'content', h = fresh(), { EF } = h;
    const bad = EF.validate(); check(S, 'validate() reports nothing', !bad.length, bad.slice(0, 4).join('; '));
    check(S, 'six teams of five', EF.TEAM_IDS.every(t => EF.get('team', t).players.length === 5));
    let total = 0; for (const l of EF.all('lines')) total += l.entries.length + l.entries.filter(e => e.reply).length; check(S, 'at least 300 commentary lines', total >= 300, total);
    for (const p of ['goal', 'save', 'nearMiss', 'woodwork', 'tackle', 'foul', 'card', 'dive', 'super', 'skill', 'header', 'volley', 'kickoff', 'halftime', 'fulltime', 'var', 'penalty']) { const n = EF.get('lines', p).entries.length; check(S, 'pool ' + p + ' has 12+', n >= 12, n); }
    check(S, '51 stickers', EF.all('sticker').length === 51, EF.all('sticker').length); check(S, '9 drills', EF.DRILLS.length === 9 && EF.DRILLS.every(id => EF.get('drill', id)));
    check(S, '15 songs', Object.keys(EF.SONGS).length >= 15, Object.keys(EF.SONGS).length); check(S, '7 supers', EF.all('super').length === 7);
    { const lib = EF.Anim.load(), used = new Set(); for (const f of readdirSync(new URL('../src/', import.meta.url))) { const t = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'); for (const r of [/clip:\s*'([^']+)'/g, /name:\s*'([A-Za-z0-9_]+)',\s*t:/g, /'(Shrug|Angry)'/g]) for (const x of t.matchAll(r)) used.add(x[1]); }
      check(S, 'the mocap set loads and has every clip the game names (' + used.size + ')', !!lib && [...used].every(n => lib.clip(n)), lib ? [...used].filter(n => !lib.clip(n)).join(',') : 'no lib'); }
    check(S, 'every captain has a registered super', EF.all('team').every(t => t.players.filter(p => p.captain).every(p => EF.get('super', p.super))));
    noErr(S, h, 'content');
  },
  ui() {
    const S = 'ui';
    { const h = fresh(), { game, I, EF } = h; step(h, .5); check(S, 'boots to the title', game.sceneName === 'title'); I.tap('confirm'); step(h, .3); check(S, 'confirm opens the main menu', EF.UI.focusId() === 'cup', EF.UI.focusId());
      I.tap('right'); step(h, .2); check(S, 'right moves the focus', EF.UI.focusId() === 'kickabout', EF.UI.focusId()); I.tap('down'); step(h, .2); check(S, 'down moves to the second row', ['options', 'album', 'about'].includes(EF.UI.focusId()), EF.UI.focusId());
      I.tap('up'); step(h, .2); for (let k = 0; k < 4; k++) { I.tap('left'); step(h, .2); if (EF.UI.focusId() === 'cup') break; } I.tap('confirm'); step(h, .6); check(S, 'CUP RUN opens the cup', game.sceneName === 'cup', game.sceneName + ' ' + EF.UI.focusId());
      I.tap('cancel'); step(h, .6); check(S, 'cancel goes back to the title', game.sceneName === 'title');
      for (const [i, sc] of [[1, 'setup'], [3, 'training'], [4, 'album'], [6, 'about']]) { game.go('title', { menu: true, focus: i }); step(h, .6); I.tap('confirm'); step(h, .6); check(S, 'tile ' + i + ' opens ' + sc, game.sceneName === sc, game.sceneName); }
      noErr(S, h, 'pad'); }
    { const h = fresh(), { game, I, EF } = h; step(h, .5); I.feed('down', 200, 200); I.feed('up', 200, 200); step(h, .3); check(S, 'a click passes PRESS START', EF.scenes.title.state === 'menu' || EF.UI.focusId() !== null);
      const top = EF.UI.top(), w = top.widgets.find(q => q.id === 'about'); I.feed('move', w.x + w.w / 2, w.y + w.h / 2); step(h, .1); check(S, 'hover moves the focus', EF.UI.focusId() === 'about', EF.UI.focusId()); I.feed('down', w.x + w.w / 2, w.y + w.h / 2); I.feed('up', w.x + w.w / 2, w.y + w.h / 2); step(h, .6); check(S, 'a click picks', game.sceneName === 'about', game.sceneName); noErr(S, h, 'mouse'); }
    { const h = fresh(), { game, I, EF } = h; step(h, .5); I.press('Enter'); step(h, .05); I.release('Enter'); step(h, .3); I.press('ArrowDown'); step(h, .05); I.release('ArrowDown'); step(h, .2); check(S, 'keyboard arrows move the focus', EF.UI.focusId() !== 'cup', EF.UI.focusId()); noErr(S, h, 'keys'); }
    { const h = fresh(), { game, I, EF } = h; const P0 = EF.promptCode(I, 'pass'); I.lastDevice = 'gamepad'; const pad = EF.promptCode(I, 'pass'); game.settings.set('glyphs', 'xbox'); const xb = EF.Glyphs.style(I); I.lastDevice = 'mouse'; const mo = EF.promptCode(I, 'pass');
      check(S, 'keycaps for the keyboard', P0 === 'KeyJ', P0); check(S, 'pad buttons for the pad', pad === 'Pad0', pad); check(S, 'Xbox glyphs after the setting', xb === 'xbox'); check(S, 'mouse buttons for the mouse', mo === 'Mouse0', mo); game.settings.set('glyphs', 'playstation'); check(S, 'PlayStation by default', EF.Glyphs.style(I) === 'playstation'); }
    { const h = fresh(), { game, I, EF } = h; game.go('setup', { mode: 'kickabout' }); step(h, .5);
      I.tap('right'); step(h, .2); const away0 = EF.scenes.setup.sel.home; EF.UI.setFocus('next'); I.tap('confirm'); step(h, .4); check(S, 'setup: teams, then the stadium', EF.UI.top().id === 'stadium', EF.UI.top().id);
      EF.UI.setFocus('stahlpresse'); I.tap('confirm'); step(h, .4); check(S, 'setup: the conditions', EF.UI.top().id === 'conditions');
      EF.UI.setFocus('weather'); I.tap('right'); step(h, .2); EF.UI.setFocus('next'); I.tap('confirm'); step(h, .4); check(S, 'setup: the players', EF.UI.top().id === 'players');
      game.addPlayer({ keys: 'right' }); step(h, .1); game.players[1].tap('right'); step(h, .2); EF.UI.setFocus('go'); I.tap('confirm'); step(h, .6); check(S, 'setup: START MATCH goes to the tunnel', game.sceneName === 'tunnel', game.sceneName);
      step(h, .6); I.tap('confirm'); step(h, 1); check(S, 'the tunnel leads to the match with two humans, one a side', game.sceneName === 'match' && EF.cur.m.humans.length === 2 && EF.cur.m.humans[1].side === 1 && EF.cur.m.stadium.id === 'stahlpresse', game.sceneName + ' ' + (EF.cur && EF.cur.m.humans.map(q => q.side)));
      while (game.players.length > 1) game.removePlayer(game.players[1]); void away0;
      game.go('setup', { mode: 'penalties' }); step(h, .5); EF.UI.setFocus('next'); I.tap('confirm'); step(h, .4); check(S, 'penalties setup: teams, then the players', EF.UI.top().id === 'players');
      EF.UI.setFocus('go'); I.tap('confirm'); step(h, 1.2); I.tap('confirm'); step(h, 1); check(S, 'penalties setup starts a shootout', game.sceneName === 'match' && !!EF.cur.m.shootout, game.sceneName);
      noErr(S, h, 'setup'); }
    { const h = fresh({ search: '?touchonly=1' }), { game, I, EF } = h; step(h, .5); check(S, 'touch-only: the title shows the notice', EF.touchOnly() && game.sceneName === 'title' && EF.scenes.title.state === 'press'); I.tap('confirm'); step(h, .4); EF.UI.setFocus('cup'); I.tap('confirm'); step(h, .5); check(S, 'touch-only: play cannot start', game.sceneName === 'title' && EF.UI.focused().disabled); EF.UI.setFocus('about'); I.tap('confirm'); step(h, .5); check(S, 'touch-only: About is reachable', game.sceneName === 'about'); }
  },
  saves() {
    const S = 'saves', h = fresh(), { EF, game, store } = h;
    EF.Cup.start(); const d = EF.Save.data(); d.cup.round = 2; d.cup.prologue = true; EF.Save.write();
    const stored = h.E.store.get('ef:save', null); check(S, 'the save is written', !!stored && stored.cup && stored.cup.round === 2);
    const back = EF.Save.migrate(stored); check(S, 'a write/read round trip', back && back.cup && back.cup.round === 2);
    const old = EF.Save.migrate({ round: 3, stickers: { mags: true } }); check(S, 'a v0 save migrates', old.v === 1 && old.cup.round === 3 && old.stickers.mags);
    game.go('title', { menu: true }); step(h, .5); const t = EF.UI.top().widgets[0]; check(S, 'CONTINUE shows the round', /QUARTER/.test(t.text), t.text);
    noErr(S, h, 'saves');
  },
  attract() {
    { const S = 'attract', ht = fresh({ search: '?touchonly=1' }); ht.game.advance(10.4); check(S, 'touch-only: the attract mode still runs', ht.game.sceneName === 'attract', ht.game.sceneName); ht.I.feed('down', 50, 50, { touch: true }); ht.I.feed('up', 50, 50, { touch: true }); ht.game.advance(.5); check(S, 'touch-only: a tap goes back to the title', ht.game.sceneName === 'title', ht.game.sceneName); }
    const S = 'attract', h = fresh(), { game, I, EF } = h;
    step(h, .3); game.advance(9.6); check(S, '9.9 s idle: still the title', game.sceneName === 'title', game.sceneName); game.advance(.25); check(S, '10.1 s: the attract mode', game.sceneName === 'attract', game.sceneName);
    const seen = new Set(); for (let i = 0; i < 95 * 4; i++) { game.advance(.25); seen.add(EF.Attract.segment); } check(S, 'every segment shows in 95 s', seen.size >= 6, [...seen].join(','));
    noErr(S, h, 'loop');
    for (const [name, fn] of [['a confirm', () => I.tap('confirm')], ['a key', () => { I.press('KeyZ'); }], ['a mouse move', () => { I.feed('move', 10, 10); game.advance(.02); I.feed('move', 120, 90); }], ['a stick', () => I.hold('right')]]) {
      const hh = fresh(); hh.game.advance(10.5); const ok0 = hh.game.sceneName === 'attract'; fn.call(null); const I2 = hh.I;
      if (name === 'a confirm') I2.tap('confirm'); else if (name === 'a key') { I2.press('KeyZ'); } else if (name === 'a mouse move') { I2.feed('move', 10, 10); hh.game.advance(.02); I2.feed('move', 140, 100); } else I2.hold('right');
      hh.game.advance(.6); if (name === 'a key') I2.release('KeyZ'); if (name === 'a stick') I2.hold('right', false);
      check(S, name + ' returns to the title', ok0 && hh.game.sceneName === 'title', hh.game.sceneName); check(S, name + ': the press picks nothing', hh.game.sceneName === 'title');
    }
  },
  dev() {
    const S = 'dev', h = fresh({ hash: '#match' }), { EF, game, I } = h;
    I.tap('dev'); step(h, .1); check(S, 'backquote opens dev mode', EF.Dev.isOpen);
    const f = EF.cur.m.side[0][2]; EF.test.giveBall(0, 2, 300, 300); const x0 = f.body.x; const it = EF.Intent.make(); it.move = [1, 0]; it.sprint = true; EF.tuneSet('runSpeed', 120); for (let i = 0; i < 120; i++) f.step(1 / 120, it, false); const d1 = f.body.x - x0; EF.tuneReset(); f.body.x = x0; f.body.vx = 0; for (let i = 0; i < 120; i++) f.step(1 / 120, it, false); const d0 = f.body.x - x0;
    check(S, 'runSpeed 120 covers more ground', d1 > d0 + 20, d1.toFixed(0) + ' vs ' + d0.toFixed(0));
    for (const r of EF.TUNE) EF.tuneSet(r[0], r[3]); EF.tuneReset(); check(S, 'RESET ALL restores every default', EF.TUNE.every(r => EF.T[r[0]] === r[1]) && !EF.tuneChanged());
    // every WARP entry runs
    for (const tab of [1, 2, 3]) { EF.Dev.tab = tab; const rows = EF.Dev.rows(); for (const row of rows) { if (row.kind !== 'button' || /RESET THE SAVE|UNLOCK/.test(row.label)) continue; try { if (!EF.cur || !EF.cur.m) game.go('match', { opts: Object.assign(EF.defaultMatchOpts(), { humans: [{ input: game.input, side: 0 }] }) }), step(h, .2); EF.Dev.isOpen = true; row.run(); step(h, .6); } catch (e) { check(S, 'warp ' + row.label, false, e.message); } } }
    noErr(S, h, 'warp');
    { const hp = fresh({ hash: '#match' }); hp.game.advance(.5); const item = (hp.game.o.menu.items || []).find(x => x[0] === 'Dev mode'); hp.game.pause(); item && item[1](); hp.game.advance(.1);
      check(S, 'the pause menu has Dev mode and it opens the panel over the running match', !!item && hp.EF.Dev.isOpen && !hp.game.paused, JSON.stringify((hp.game.o.menu.items || []).map(x => x[0]))); }
    const hs = fresh({ hub: { active: true, connect: async () => null, on() {}, ready() {}, time: () => 0, rng: () => Math.random } }); hs.EF.Dev.open(); check(S, 'dev mode cannot open in a session', !hs.EF.Dev.isOpen);
  },
  training() {
    const S = 'training';
    for (const id of ['move', 'passing', 'shooting', 'air', 'skills', 'defending', 'setpieces', 'euphoria', 'theatrics']) {
      const h = fresh(), { EF, game, I } = h; EF.startDrill(id, null); step(h, .5);
      const dr = EF.cur && EF.cur.drill; if (!dr) { check(S, id + ' starts', false, game.sceneName); continue; }
      for (let k = 0; k < dr.def.steps.length && game.sceneName === 'match'; k++) {
        for (let j = 0; j < 40 && dr.phase !== 'run'; j++) { I.tap('confirm'); step(h, .2); }
        // a few seconds of the drill as it plays
        for (let j = 0; j < 90; j++) { I.hold(j % 30 < 15 ? 'right' : 'up', true); step(h, 1 / 30); I.hold('right', false); I.hold('up', false); }
        if (dr.phase !== 'run' || dr.run.step !== k) continue;
        dr.stepDone();
        step(h, 1);
      }
      for (let j = 0; j < 30 && game.sceneName === 'match'; j++) { I.tap('confirm'); step(h, .3); }
      check(S, id + ': every step runs and the drill completes', EF.Save.data().drills[id] === true, game.sceneName + ' step ' + dr.run.step);
      noErr(S, h, id);
    }
  },
  determinism() {
    const S = 'determinism', h = fresh(), { EF } = h;
    const hash = () => { const m = mk(h, { seed: 42, humans: [] }); for (let i = 0; i < 1800; i++) m.update(1 / 120); return JSON.stringify([m.ball.x.toFixed(3), m.ball.y.toFixed(3), m.score, m.players.map(f => [f.body.x.toFixed(2), f.body.y.toFixed(2)])]); };
    const a = hash(), b = hash(); check(S, 'the same seed gives the same match', a === b);
  },
  lint() {
    const S = 'lint', dir = new URL('../src/', import.meta.url);
    for (const f of readdirSync(dir).filter(f => /^(1[0-9]|20)-/.test(f))) { const s = readFileSync(new URL(f, dir), 'utf8'); check(S, f + ' uses no Math.random', !/Math\.random/.test(s)); }
    for (const f of readdirSync(dir)) { const s = readFileSync(new URL(f, dir), 'utf8'); check(S, f + ' has no forbidden calls', !/\b(alert|confirm|prompt)\s*\(|window\.open|\bfetch\s*\(|WebSocket|RTCPeerConnection|ctx\.arc|\.stroke\(|fillText|createLinearGradient|createRadialGradient/.test(s.replace(/EF\.prompt\w*\(|\bprompts?\(|\.prompt\(|prompt:/g, ''))); check(S, f + ' has no TODO or placeholder', !/\bTODO\b|\bFIXME\b|placeholder|stub/i.test(s)); }
  },
  playthrough() { return import('./lib/playthrough.mjs').then(mod => mod.run({ load, check, fresh })); },
  hubsim() { return import('./lib/hubsim.mjs').then(mod => mod.run({ load, check })); },
  sweep() { return import('./lib/sweep.mjs').then(mod => mod.run({ check })); },
  audio() { return import('./lib/audiocheck.mjs').then(mod => mod.run({ check })); },
  browser() { return import('./lib/browser.mjs').then(mod => mod.run({ check })); },
  hub() { return import('./lib/hubtest.mjs').then(mod => mod.run({ check })); },
  task() { return import('./lib/taskcheck.mjs').then(mod => mod.run({ load, check })); }
};
for (const s of suites) {
  if (!suitesFn[s]) { check('test', 'unknown suite ' + s, false); continue; }
  try { const r = suitesFn[s](); if (r && r.then) await r; } catch (e) { check(s, 'suite threw', false, (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); }
}
console.log(`Europhoria tests: ${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
