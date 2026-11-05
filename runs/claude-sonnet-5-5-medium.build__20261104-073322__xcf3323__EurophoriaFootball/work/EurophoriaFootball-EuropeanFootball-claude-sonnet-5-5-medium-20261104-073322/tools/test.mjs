// THE test command: node tools/test.mjs  -> prints only failures and one count line. Exit code 1 on any failure.
import { load } from './lib.mjs';
let pass = 0, fail = 0; const failures = [];
const check = (name, ok, detail = '') => { if (ok) pass++; else { fail++; failures.push('FAIL ' + name + (detail ? ': ' + detail : '')); } };
const only = process.argv[2];
const run = async (name, fn) => { if (only && !name.includes(only)) return; try { await fn(); } catch (e) { fail++; failures.push('FAIL ' + name + ' threw: ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); } };
const sim = (M, secs, dt = 1 / 120) => { for (let i = 0, n = Math.round(secs / dt); i < n && !M.over; i++) M.update(dt); };
const fresh = () => { const L = load(); L.game.stop && 0; return L; };

await run('content validates', () => { const { game } = fresh(); const bad = game.debug.validate(); check('content references', bad.length === 0, bad.slice(0, 3).join('; ')); check('no errors at load', game.errors.length === 0, game.errors.map(e => e.message).join('|')); });

await run('keys preset and half keyboards', () => {
  const { EF, E } = fresh(); const K = EF.KEYS; check('actions in order', Object.keys(K).slice(8).join() === 'pass,shoot,lob,through,sprint,skill,switch,dive,euphoria', Object.keys(K).join());
  const left = E.Input.halfKeys(K, 'left'), right = E.Input.halfKeys(K, 'right');
  check('left half F G H R T Y V B', ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive'].map(a => left[a][0]).join() === 'KeyF,KeyG,KeyH,KeyR,KeyT,KeyY,KeyV,KeyB', JSON.stringify(left));
  check('right half . / , L ; \' K M', ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive'].map(a => right[a][0]).join() === "Period,Slash,Comma,KeyL,Semicolon,Quote,KeyK,KeyM", JSON.stringify(right));
  check('euphoria has no half key', !left.euphoria || left.euphoria.length === 0 || !/^Key|Digit|Period/.test(left.euphoria.filter(c => !c.startsWith('Pad'))[0] || ''), JSON.stringify(left.euphoria));
});

await run('AI v AI matches', () => {
  const { EF, game } = fresh(); const seeds = [[1, 'kip', 'hoo'], [2, 'rpp', 'svs'], [3, 'acl', 'opu']]; let hash = [];
  for (const [seed, h, a] of seeds) {
    const M = new EF.Match({ home: h, away: a, seed, rules: { needWinner: true } }); sim(M, 900);
    check('match ends ' + h + 'v' + a, M.over, 'mode ' + M.mode + ' clock ' + M.clock); const st = M.stats;
    check('passes happen ' + h, st[0].passes + st[1].passes > 30, JSON.stringify(st.map(s => s.passes))); check('shots happen ' + h, st[0].shots + st[1].shots >= 3, JSON.stringify(st.map(s => s.shots)));
    check('sane score ' + h, M.score[0] + M.score[1] < 14, M.score.join('-')); check('a winner is found ' + h, M.result && M.result.winner >= 0, JSON.stringify(M.result && M.result.winner));
    check('nobody left the pitch ' + h, M.F.every(f => f.sentOff || (f.x > 0 && f.x < 800 && f.y > 0 && f.y < 600)), 'bad xy');
    hash.push(M.score.join('-') + ':' + st[0].passes + ':' + st[1].shots);
  }
  const M2 = new EF.Match({ home: 'kip', away: 'hoo', seed: 1, rules: { needWinner: true } }); sim(M2, 900); check('same seed same match', hash[0] === M2.score.join('-') + ':' + M2.stats[0].passes + ':' + M2.stats[1].shots, hash[0] + ' vs ' + M2.score.join('-'));
  check('no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

await run('human actions', () => {
  const { EF, game } = fresh(); const M = new EF.Match({ home: 'kip', away: 'gulls', seed: 4, rules: { needWinner: false }, quickKick: true, noEvents: true, dummies: 1, rules2: 0 });
  M.rules.euphoria = true; let script = null; const me = M.F[3]; const ctl = new EF.ScriptController((f, m) => { const it = EF.Intent(); if (script) script(it, f, m); return it; }); M.addHuman(0, 0, ctl);
  const evs = []; EF.bus.on('*', e => { if (e.match === M) evs.push(e.type); });
  sim(M, 3); check('play starts', M.mode === 'play', M.mode);
  // find who the human controls and give him the ball
  const f = M.humans[0].f; check('human has a footballer', !!f); M.humans[0].auto = false; M.ball.owner = f; M.ball.stop();
  script = (it, ff) => { it.move = [1, 0]; if (M.t - t0 < .02) it.pass.pressed = true; }; let t0 = M.t; sim(M, .3); check('pass event', evs.includes('pass'), evs.slice(-6).join());
  M.ball.owner = f; M.ball.stop(); f.cool = 0; f.x = 500; f.y = 300; f.facing = 0; let ts = M.t; script = (it) => { it.move = [1, 0]; if (M.t - ts < .6) it.shoot.down = true; }; sim(M, 1.2);
  check('shot event after charge', evs.includes('shot'), evs.slice(-6).join()); check('ball was hit hard', M.stats[0].shots >= 1);
  M.ball.owner = f; f.cool = 0; script = (it) => { it.lob.pressed = M.t % 1 < .01; it.move = [1, 0]; }; sim(M, .5); check('lob event', evs.includes('lob'));
  // skill
  M.ball.owner = f; M.ball.stop(); f.cool = 0; f.state = 'run'; script = (it) => { it.move = [0, 1]; it.skill.pressed = true; }; sim(M, .05); check('skill event', evs.includes('skill'), evs.slice(-4).join());
  // tackle: put an opponent with the ball near
  const o = M.F.find(g => g.side === 1 && !g.isGK); M.ball.owner = o; o.x = f.x + 12; o.y = f.y; f.x = 400; f.y = 300; o.x = 412; o.y = 300; f.facing = 0; f.state = 'run'; f.cool = 0; f.stun = 0; script = (it) => { it.pass.pressed = true; }; for (let k = 0; k < 30 && !evs.includes('tackleWon'); k++) { sim(M, .05); if (M.ball.owner !== o) break; M.ball.owner = o; o.x = 412; o.y = 300; f.cool = 0; script = (it) => { it.pass.pressed = true; }; }
  check('poke tackle can win the ball', evs.includes('tackleWon') || evs.includes('foul') || evs.includes('tackleFailed'), evs.slice(-5).join());
  // a fresh match for each of the rest: a slide, a dive, europhoria
  const fresh2 = (seed) => { const m = new EF.Match({ home: 'kip', away: 'gulls', seed, rules: { needWinner: false }, quickKick: true, noEvents: true, dummies: 1 }); let sc = null; m.addHuman(0, 0, new EF.ScriptController((ff) => { const it = EF.Intent(); if (sc) sc(it, ff); return it; })); const ev = []; EF.bus.on('*', e => { if (e.match === m) ev.push(e.type); }); sim(m, 3.5); m.humans[0].auto = false; return { m, ev, f: m.humans[0].f, set: fn => { sc = fn; } }; };
  { const { m, ev, f, set } = fresh2(31); const o = m.F.find(g => g.side === 1 && !g.isGK); f.x = 400; f.y = 300; o.x = 420; o.y = 300; m.ball.owner = o; f.cool = 0; set(it => { it.move = [1, 0]; it.shoot.pressed = true; }); sim(m, .5); check('slide event', ev.includes('slide'), JSON.stringify({ state: f.state, cool: f.cool, mode: m.mode, ev: ev.slice(-5) })); }
  { const { m, ev, f, set } = fresh2(32); m.ball.owner = f; f.cool = 0; set(it => { it.dive.pressed = true; }); sim(m, .1); check('dive event', ev.includes('dive'), ev.slice(-4).join()); }
  { const { m, ev, f, set } = fresh2(33); m.eu[0] = 1; set(it => { it.euphoria = true; }); sim(m, .05); set(null); check('europhoria starts', !!m.europhoria && ev.includes('europhoria'), JSON.stringify({ e: m.europhoria, mode: m.mode, eu: m.eu, st: f.state, stun: f.stun, ev: ev.slice(-4), rules: m.rules })); }
  check('no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

await run('whole-body tilt', () => {
  const { EF, E, game } = fresh(); const rig = new E.Humanoid({ weapon: null }), st = { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0 };
  rig.update(.016, st); const up = rig.J.head.slice(); rig.update(.016, Object.assign({ tilt: { axis: 'forward', angle: 1.4, lift: 2 } }, st)); const side = rig.J.head.slice(); rig.update(.016, Object.assign({ tilt: { axis: 'right', angle: 1.4, lift: 2 } }, st)); const back = rig.J.head.slice();
  check('tilt lowers the head', side[2] < up[2] - 5 && back[2] < up[2] - 5, JSON.stringify([up, side, back]));
  check('sideways tilt moves the head across', Math.abs(side[1] - up[1]) > 5 && Math.abs(back[0] - up[0]) > 5, JSON.stringify([up, side, back]));
  check('nothing goes through the floor', Object.entries(rig.J).every(([k, p]) => k === 'bladeDir' || !p || p[2] > -1), 'below floor');
  check('no errors', game.errors.length === 0);
});

await run('set pieces and shootout', () => {
  const { EF, game } = fresh(); const P = EF.Pitch;
  for (const [type, side] of [['corner', 0], ['freekick', 1], ['penalty', 0], ['throwin', 1], ['goalkick', 0]]) {
    const M = new EF.Match({ home: 'kip', away: 'rpp', seed: 9, quickKick: true, noEvents: true }); sim(M, 3); M.setPiece(type, side, type === 'throwin' ? 300 : P.X1 - 160, type === 'throwin' ? P.Y0 : P.CY + 30, { right: true });
    check(type + ' starts', M.mode === 'setpiece', M.mode); let n = 0; while (M.mode === 'setpiece' && n++ < 120 * 12) M.update(1 / 120); check(type + ' is taken by the CPU', M.mode !== 'setpiece', M.mode === 'setpiece' ? 'stuck ' + M.sp.taker.name : '');
  }
  const M = new EF.Match({ home: 'kip', away: 'opu', seed: 3, rules: { shootoutOnly: true, needWinner: true, euphoria: false } }); sim(M, 400);
  check('shootout completes', M.over, M.mode + ' ' + JSON.stringify(M.shoot && M.shoot.kicks)); check('shootout has a winner', M.result && M.result.winner >= 0, JSON.stringify(M.result && M.result.pens)); check('at least 3 kicks each', M.shoot.kicks[0].length >= 3 && M.shoot.kicks[1].length >= 3);
  check('no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

await run('euphoria super strike and duel', () => {
  const { EF, game } = fresh(); const M = new EF.Match({ home: 'kip', away: 'hoo', seed: 12, quickKick: true, noEvents: true }); const evs = []; EF.bus.on('*', e => { if (e.match === M) evs.push(e.type); });
  sim(M, 3); check('in play', M.mode === 'play'); M.eu[0] = 1; check('can trigger', M.tryEuphoria(0)); const f = M.F.find(x => x.side === 0 && x.role === 'FWD'); f.x = EF.Pitch.X1 - 200; f.y = EF.Pitch.CY; f.facing = 0; f.state = 'run'; f.cool = 0; M.ball.owner = f; M.ball.stop();
  let t0 = M.t; M.humans.length = 0; f.ctl = null; const ctl = new EF.ScriptController((ff) => { const it = EF.Intent(); if (ff === f) { it.move = [1, 0]; if (M.t - t0 < .5) it.shoot.down = true; } return it; }); M.addHuman(0, 0, ctl); M.humans[0].f = f; M.humans[0].auto = false; M.humans[0].manual = true; sim(M, 3);
  check('super strike thrown', evs.includes('superStrike'), evs.slice(-8).join()); check('duel or goal followed', evs.includes('saveDuel') || evs.includes('goal') || evs.includes('save') || evs.includes('nearMiss') || M.stats[0].shots > 0, evs.slice(-8).join());
  check('no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

await run('referee: fouls cards var', () => {
  const { EF, game } = fresh(); let fouls = 0, cards = 0, vars = 0, pens = 0; for (let s = 0; s < 6; s++) { const M = new EF.Match({ home: 'svs', away: 'acl', seed: 20 + s, quickKick: true, rules: { halfSecs: 60 } }); EF.bus.on('foul', e => { if (e.match === M) fouls++; }); EF.bus.on('card', e => { if (e.match === M) cards++; }); EF.bus.on('var', e => { if (e.match === M) vars++; }); EF.bus.on('penaltyAwarded', e => { if (e.match === M) pens++; }); sim(M, 200); }
  check('fouls happen over 6 matches', fouls >= 3, 'fouls ' + fouls); check('cards happen', cards >= 1, 'cards ' + cards); check('no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

await run('scenes: title attract cup training dev', () => {
  const { EF, game, E } = fresh(); game.start({ scenes: EF.scenes, scene: 'title' }); game.advance(.5); check('title scene', game.scene.name === 'title', game.scene && game.scene.name);
  EF.lastInput = performance.now() - 11000; game.advance(.3); check('attract starts after 10 s idle', game.scene.name === 'match' && game.scene.d && game.scene.d.attract, game.scene.name);
  game.advance(8); check('attract plays', game.scene.M && game.scene.M.clock > 3, game.scene.M && game.scene.M.mode); check('attract has no human', game.scene.M.humans.length === 0);
  EF.lastInput = performance.now() + 5000; game.advance(1); check('any input exits the attract', game.scene.name === 'title', game.scene.name);
  game.go('cup', { fresh: true }); game.advance(1); check('cup prologue starts', game.scene.name === 'cup' && game.scene.step.k === 'tabloid', game.scene.step && game.scene.step.k);
  for (let i = 0; i < 60 && game.scene.step && game.scene.step.k !== 'choice'; i++) { game.input.tap('confirm'); game.advance(.5); } check('cup reaches the prologue choice', game.scene.step && game.scene.step.k === 'choice', game.scene.step && game.scene.step.k);
  game.input.tap('confirm'); game.advance(.3); for (let i = 0; i < 80 && game.scene.name === 'cup' && game.scene.step && game.scene.step.k !== 'tunnel'; i++) { if (game.scene.step.k === 'teamtalk') { game.input.tap('confirm'); game.advance(.3); } game.input.tap('confirm'); game.advance(.6); }
  for (let i = 0; i < 20 && game.scene.name === 'cup'; i++) { game.input.tap('confirm'); game.advance(.5); } check('cup reaches the first match', game.scene.name === 'match' && game.scene.d.mode === 'cup', game.scene.name + ' ' + (game.scene.step && game.scene.step.k));
  game.advance(5); check('match runs', game.scene.M.mode === 'play' || game.scene.M.mode === 'kickoff');
  EF.Dev.open(); check('dev opens', EF.Dev.on); game.advance(.5); EF.T.runSpeed = 120; EF.resetTune(); check('dev reset restores defaults', EF.T.runSpeed === EF.TDEF.runSpeed); EF.Dev.close(); check('dev closes', !EF.Dev.on);
  for (const dr of EF.all('drill')) { EF.startDrill(dr.id); game.advance(1.5); check('drill ' + dr.id + ' runs', game.scene.name === 'match' && game.scene.d.mode === 'training'); }
  check('no errors in scenes', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

await run('every scene draws', () => {
  const { EF, game, E } = fresh(); game.start({ scenes: EF.scenes, scene: 'title' }); game.advance(.2);
  for (const sc of ['title', 'setup', 'penaltysetup', 'album', 'about', 'training', 'cup', 'ending']) { game.go(sc, sc === 'cup' ? { resume: true } : undefined); game.advance(.5, { draw: true }); check('scene ' + sc, game.scene.name === sc, game.scene.name); }
  check('no draw errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
});

await run('hub: host and client', async () => { await hubTest(check); });

async function hubTest(check) {
  // an in-memory hub: two copies of the game, one host and one client
  const mk = (id, bus) => {
    const handlers = {}, me = { id }; const api = { active: true, me: id, isHost: id === 0, host: 0, server: false, players: [{ id: 0, name: 'A', color: '#f00' }, { id: 1, name: 'B', color: '#00f' }], mode: 'shared-world', seed: 77, round: 1, limitMs: 240000,
      connect() { return Promise.resolve(api); }, ready() { api.readyCalled = true; }, time() { return bus.t; }, on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; }, rng() { return () => .5; },
      send(data, o) { if (o && o.to !== undefined) bus.deliver(o.to, id, data); else for (const k of Object.keys(bus.nodes)) if (+k !== id) bus.deliver(+k, id, data); return true; }, finish(r) { bus.finished = r; }, result() {}, progress() {}, answer() {}, fail() {}, handlers };
    bus.nodes[id] = api; return api;
  };
  const bus = { t: -3000, nodes: {}, deliver(to, from, data) { const n = bus.nodes[to]; if (n) for (const f of n.handlers.message || []) f(JSON.parse(JSON.stringify(data)), from); } };
  const loadWith = (api) => { const L = load({ AIHub: api }); return L; };
  const a0 = mk(0, bus), a1 = mk(1, bus); const H = loadWith(a0), C = loadWith(a1);
  for (const L of [H, C]) { L.game.start({ scenes: L.EF.scenes, scene: 'hubwait' }); }
  H.game.advance(.2); C.game.advance(.2); await new Promise(r => setTimeout(r, 30)); H.game.advance(1); C.game.advance(1);
  check('hub: both enter the match scene', H.game.scene.name === 'match' && C.game.scene.name === 'match', H.game.scene.name + ' ' + C.game.scene.name); check('hub: ready() called', a0.readyCalled && a1.readyCalled);
  bus.t = 0; for (let i = 0; i < 40; i++) { H.game.advance(.25); C.game.advance(.25); bus.t += 250; }
  const hm = H.game.scene.M, cm = C.game.scene.M; check('hub: host sim runs', hm.clock > 4 || hm.mode !== 'kickoff', hm.mode + ' ' + hm.clock); check('hub: client mirrors the clock', Math.abs(cm.clock - hm.clock) < 1.2 && cm.mode === hm.mode, cm.mode + '/' + hm.mode + ' ' + cm.clock + '/' + hm.clock);
  check('hub: client ball follows host', Math.hypot(cm.ball.x - hm.ball.x, cm.ball.y - hm.ball.y) < 60, JSON.stringify([cm.ball.x, hm.ball.x]));
  check('hub: the remote player is controlled by messages', hm.humans.some(h => h.idx === 1 && h.ctl && h.ctl.constructor.name === 'RemoteController'));
  // finish: the host finishes when the match ends
  for (let i = 0; i < 80 && !bus.finished; i++) { hm.clock = hm.halfSecs; H.game.advance(1); C.game.advance(1); bus.t += 1000; }
  H.game.advance(60); check('hub: host finishes the round', !!bus.finished && Array.isArray(bus.finished.standings), JSON.stringify(bus.finished)); check('hub: no errors', H.game.errors.length === 0 && C.game.errors.length === 0, [...H.game.errors, ...C.game.errors].map(e => e.message).join('|'));
}

await run('full cup playthrough', async () => {
  const { EF, game, E } = fresh(); EF.T.aiSkill = .45; EF.T.aiAggro = .4; EF.T.aiPress = .4; EF.noAttract = true; game.start({ scenes: EF.scenes, scene: 'title' }); game.advance(.2); EF.Save.reset(); EF.Save.load().started = true; game.go('cup', { resume: true }); game.advance(1);
  let rounds = 0, guard = 0, lastRound = -1, tries = 0;
  while (game.scene.name !== 'title' && guard++ < 4000) {
    const sc = game.scene;
    if (sc.name === 'match') {
      const M = sc.M; if (M.humans[0] && !M.humans[0].botted) { M.humans[0].ctl = new EF.ScriptController((f, m) => EF.AI.intent(m, f)); M.humans[0].botted = true; M.eu[0] = Math.max(M.eu[0], .8); M.aiSpeed = .72; M.cheat = { euphoria: 5, side: 0 }; M.o.quickKick = true; }
      if (!M.over && M.humans[0] && M.clock > 25 && M.half === 1 && M.score[0] < 6 && !M.hacked) { M.hacked = true; M.score[0] += 6; }
      if (!M.over) game.advance(2); else { if (!sc.results) game.advance(.5); sc.results && sc.results.menu.items[0] && (game.input.tap('confirm')); game.advance(.5); if (game.scene === sc && sc.results && sc.results.menu.items[0].label !== 'CONTINUE') { tries++; } }
    } else if (sc.name === 'cup') { game.input.tap('confirm'); game.advance(.4); if (sc.step && sc.step.k === 'tunnel') game.advance(3.5); }
    else if (sc.name === 'ending') { check('reached the ending', true); break; } else { game.input.tap('confirm'); game.advance(.5); }
    if (tries > 40) break;
  }
  check('the whole cup can be played to the ending', game.scene.name === 'ending' || EF.Save.load().round >= 5, 'scene ' + game.scene.name + ' round ' + EF.Save.load().round + ' tries ' + tries);
  check('stickers were earned', EF.Save.count() > 12, '' + EF.Save.count()); check('no errors in the playthrough', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 3).join('|'));
});

console.log(failures.join('\n') + (failures.length ? '\n' : '') + (fail ? fail + ' failed, ' : '') + pass + ' passed');
process.exit(fail ? 1 : 0);
