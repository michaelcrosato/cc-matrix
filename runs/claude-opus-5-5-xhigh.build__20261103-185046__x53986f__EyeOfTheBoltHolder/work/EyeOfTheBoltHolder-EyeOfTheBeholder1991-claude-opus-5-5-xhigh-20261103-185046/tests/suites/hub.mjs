// hub (Node, a stub AIHub): connect first; the title skipped; our card; ready() once with no key; Ready and More time;
// play from time() 0; sends <= 10 Hz unreliable; progress about once a second; one result; time-up; ghosts; leave; end;
// no saves or Dev Mode; Options ignored while Create is held
import { fresh } from '../util.mjs';
function stub() {
  const h = { calls: [], handlers: {}, t: -Infinity, active: true, sends: [], progress: [], results: [], answers: [], ready: 0 };
  let s = 12345; const rng = label => { let a = 0; for (const c of label) a = (a * 31 + c.charCodeAt(0)) >>> 0; a ^= s; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const info = { me: 0, players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: '<b>Bo</b>', color: '#3b82f6' }], mode: 'ghost', round: 1, limitMs: 240000, seed: 77 };
  const A = { active: true, connect(o) { h.calls.push(['connect', o]); return Promise.resolve(info); }, ready() { h.ready++; }, answer(a) { h.answers.push(a); }, time() { return h.t; },
    on(ev, fn) { (h.handlers[ev] || (h.handlers[ev] = [])).push(fn); return () => {}; }, progress(p) { h.progress.push([h.t, p]); }, result(r) { h.results.push(r); }, send(d, o) { h.sends.push([h.t, d, o]); return true; }, rng, seeded: true };
  h.A = A; h.emit = (ev, ...a) => (h.handlers[ev] || []).forEach(f => f(...a)); return h;
}
export async function run(t) {
  const h = stub();
  const { B, game, I } = await fresh({ hub: h.A, before: ctx => { ctx.__hubInfo = ctx.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }); } });
  game.advance(.6);
  t.check('connect: ghost, seats 1 to 4, our own card', h.calls[0] && h.calls[0][1].mode === 'ghost' && JSON.stringify(h.calls[0][1].seats) === '[1,4]' && h.calls[0][1].card === true);
  t.check('in a session the title is skipped for our card', game.sceneName === 'hubcard');
  t.check('ready() once, with no key press', h.ready === 1);
  h.emit('card', { left: 9000, ready: [], asking: 0 }); I.tap('confirm'); game.advance(.1); t.check('Enter answers Ready', h.answers.includes('ready'));
  I.tap('mTri'); game.advance(.1); t.check('Triangle asks for more time', h.answers.includes('more'));
  h.emit('start', { in: 3000 }); h.t = -3000; game.advance(.5); t.check('start: the race plays', game.sceneName === 'play' && B.S.race);
  const c0 = B.S.party.cy; I.hold('fwd'); game.advance(.5); I.hold('fwd', false); t.check('the countdown locks input', B.S.party.cy === c0);
  h.t = 10; game.advance(.1); I.hold('fwd'); game.advance(.6); I.hold('fwd', false); game.advance(.3); t.check('at time 0 play begins', B.S.party.cy !== c0 || B.S.party.cx !== 1);
  const ns = h.sends.length; for (let i = 0; i < 240; i++) { h.t += 1000 / 120; game.advance(1 / 120); }
  const sent = h.sends.slice(ns); t.check('it sends about 10 times a second, unreliably', sent.length >= 15 && sent.length <= 21 && sent.every(s => s[2] && s[2].reliable === false), sent.length);
  t.check('each send says where it is', sent.every(s => s[1].t === 'g' && s[1].area === 'race' && typeof s[1].x === 'number'));
  t.check('progress about once a second', h.progress.length >= 1 && h.progress.length <= 4, h.progress.length);
  h.emit('message', { t: 'g', area: 'race', cx: 1, cy: 9, dir: 0, x: 48, y: 304, yaw: -1.57, cp: 0, hp: 4 }, 1); game.advance(.1);
  t.check('another player\'s message makes a ghost', B.view.ghosts.has('p1'));
  h.emit('leave', { id: 1, reason: 'left' }); game.advance(.1); t.check('leave removes the ghost', !B.view.ghosts.has('p1'));
  t.check('no saves in a session', game.saves.canSave === false && game.saves.canLoad === false);
  t.check('no Dev Mode, Load or Quit in a session\'s pause menu', B.pauseItems().length === 0 && game.o.menu.quit === false);
  I.press('Pad8'); game.advance(.05); I.press('Pad9'); game.advance(1 / 60); I.release('Pad9'); game.advance(.05); I.release('Pad8'); game.advance(.1);
  t.check('Options is ignored while Create is held', !game.paused && !game.debug.UI.top()); if (game.paused) game.resume(); game.debug.UI.closeAll();
  // finish: the exit
  B.S.party.cx = 12; B.S.party.cy = 2; B.S.party.dir = 0; B.S.floors.race.doors.RG2.open = 1; B.update(1 / 120, [{ c: 'move', d: 'f' }]); for (let i = 0; i < 120; i++) { h.t += 8; game.advance(1 / 120); }
  t.check('reaching the exit sends one result with a time', h.results.length === 1 && typeof h.results[0].time === 'number' && h.results[0].stats);
  t.check('and tells the others', h.sends.some(s => s[1].t === 'done'));
  h.emit('time-up', { graceMs: 5000 }); game.advance(.1); t.check('time-up after a result sends no second one', h.results.length === 1);
  h.emit('end', { reason: 'finished', standings: [[0], [1]] }); game.advance(.2); t.check('end: input stops and sound mutes', game.audio.muted === true);
  t.check('no game errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
  // a wipe and a time-up without a finish: a score
  const h2 = stub(); const E2 = await fresh({ hub: h2.A, before: ctx => { ctx.__hubInfo = ctx.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }); } });
  E2.game.advance(.5); h2.emit('start', {}); h2.t = 100; E2.game.advance(.5); h2.emit('time-up', { graceMs: 5000 }); E2.game.advance(.1);
  t.check('time-up sends a score', h2.results.length === 1 && typeof h2.results[0].score === 'number');
}
