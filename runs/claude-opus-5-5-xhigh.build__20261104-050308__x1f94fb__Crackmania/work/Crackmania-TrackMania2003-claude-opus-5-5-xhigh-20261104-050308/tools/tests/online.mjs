// covers: src/modes/online.js (with a fake AIHub that plays the hub's part)
import { ctx } from '../../src/ctx.js';
import { Online } from '../../src/modes/online.js';
export default async T => {
  const { game, api } = await T.game();
  let now = -Infinity; const log = { ready: 0, answers: [], sends: [], progress: [], results: [], fails: [] }, handlers = {};
  const fake = { active: true, seeded: true, connect: async o => { log.connect = o; return { me: 0, players: [{ id: 0, name: 'ANA', color: '#e8443a' }, { id: 1, name: 'BOB', color: '#3b82f6' }], mode: 'ghost', round: 1, limitMs: 200000, seed: 42 }; },
    on: (e, f) => { (handlers[e] = handlers[e] || []).push(f); return () => {}; }, ready: () => log.ready++, answer: a => log.answers.push(a), time: () => now,
    send: (d, o) => { log.sends.push({ d, o, t: game.real }); return true; }, progress: p => log.progress.push(p), result: r => log.results.push(r), fail: m => log.fails.push(m),
    rng: label => { let a = 7; for (const c of label) a = a * 31 + c.charCodeAt(0); return () => { a = (a * 1103515245 + 12345) >>> 0; return a / 4294967296; }; } };
  const emit = (e, ...a) => (handlers[e] || []).forEach(f => f(...a));
  const before = globalThis.AIHub; globalThis.AIHub = fake;
  const O = new Online(game), was = ctx.online; ctx.online = O; ctx.hub = true;
  const info = await O.connect();
  T.check('connect asks for ghost, 1-4 seats, its own card', log.connect.mode === 'ghost' && log.connect.seats[0] === 1 && log.connect.seats[1] === 4 && log.connect.card === true);
  T.check('a session track, the same on every copy', ['D1', 'D2', 'D3', 'R1', 'R2', 'S1', 'S2'].includes(O.trackId));
  game.go('online', null, { fade: 0 }); game.advance(.2);
  T.eq('ready() once, without input', log.ready, 1);
  T.eq('no title or menus', game.sceneName, 'online');
  emit('card', { left: 9000, ready: [], asking: 0 }); game.advance(.1);
  game.input.press('Enter'); game.advance(1 / 60); game.input.release('Enter'); game.advance(1 / 60);
  T.check('Enter answers ready on our card', log.answers.includes('ready'));
  // the start: countdown on the hub's clock, then the time attack
  emit('start', { in: 3000 }); now = -3000; for (let i = 0; i < 40; i++) { now += 1000 / 12; game.advance(1 / 12); }
  T.check('racing at time 0', ctx.session && ctx.session.players[0].run.racing, ctx.session && ctx.session.players[0].run.phase);
  api.botDrives(true); const t0 = game.real, s0 = log.sends.length, p0 = log.progress.length;
  for (let i = 0; i < 120 * 4; i++) { now += 1000 / 120; game.advance(1 / 120); }
  const rate = (log.sends.length - s0) / (game.real - t0);
  T.check('ghost messages <= 10 a second', rate <= 10.5 && rate > 5, rate.toFixed(1));
  T.check('ghost messages small and unreliable', log.sends.every(s => JSON.stringify(s.d).length < 1024 && (s.d.t !== 'g' || s.o.reliable === false)));
  T.check('progress each second', log.progress.length - p0 >= 3, log.progress.length - p0);
  // the other player's ghost is shown in the same area, hidden in another
  emit('message', { t: 'g', area: O.trackId, run: 0, ms: 100, p: ctx.session.players[0].run.car.p, q: [0, 0, 0, 1], v: 100, f: 1 }, 1); game.advance(.3);
  T.check('a ghost from the same track shows', !!O.pose(O.ghosts.get(1)));
  emit('message', { t: 'g', area: 'XX', run: 0, ms: 100, p: [0, 0, 0], q: [0, 0, 0, 1], v: 0, f: 0 }, 1); game.advance(.3); T.check('a ghost elsewhere hides', !O.pose(O.ghosts.get(1)));
  // a finish: the best goes out reliably; time-up: exactly one result
  api.until(() => O.best !== null, 90); T.check('a finish makes a best', O.best > 0); T.check('the best is sent reliably', log.sends.some(s => s.d.t === 'best' && s.o.reliable !== false));
  emit('leave', { id: 1 }); T.check('a player leaving removes their ghost', !O.ghosts.has(1));
  emit('time-up', { graceMs: 5000 }); emit('time-up', { graceMs: 5000 }); game.advance(.2);
  T.eq('exactly one result', log.results.length, 1); T.check('the result is a time', log.results[0] && log.results[0].time === O.best, JSON.stringify(log.results[0])); T.check('stats with it', log.results[0] && log.results[0].stats && log.results[0].stats.Runs >= 1);
  emit('end', { reason: 'finished', standings: [[0]] }); game.advance(.2);
  T.check('sound stops at the end', game.audio.muted); const st = ctx.session.players[0].run.steps; game.advance(.5); T.check('nothing moves after the end', ctx.session.players[0].run.steps === st);
  T.eq('no fail()', log.fails.length, 0);
  // outside a session nothing changes
  globalThis.AIHub = before; ctx.online = was; ctx.hub = false; game.audio.mute(false); game.go('title', null, { fade: 0 }); game.advance(.2);
  T.eq('outside a session: the title', game.sceneName, 'title');
};
