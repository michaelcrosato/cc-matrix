// hub-mock: the game against a fake AI Hub client. It connects in parallel mode with seats 1 to 4, calls ready() with no
// key press, plays the same six balls for every copy, sends one progress per ball and one result, reports on time-up,
// and freezes on end.
import { loadGame } from '../lib.mjs';
function fakeHub(opts) {
  const handlers = {}, calls = { connect: [], ready: 0, progress: [], result: [], answer: [], fail: 0 };
  let time = -Infinity, seq = 1;
  const rng = label => { let s = 0; for (const c of String(label)) s = (s * 31 + c.charCodeAt(0)) >>> 0; s = s || 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  const A = {
    active: true, seeded: true, calls,
    connect(o) { calls.connect.push(o); return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Ben', color: '#3b82f6' }], mode: 'parallel', round: 1, seed: opts.seed, limitMs: 120000, isHost: false, server: false }); },
    ready() { calls.ready++; },
    answer(a) { calls.answer.push(a); },
    time: () => time,
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => { handlers[ev] = (handlers[ev] || []).filter(f => f !== fn); }; },
    progress(p) { calls.progress.push(p); },
    result(r) { calls.result.push(r); },
    finish() {}, send() { return false; }, fail() { calls.fail++; },
    rng,
    emit(ev, d) { (handlers[ev] || []).forEach(f => f(d)); },
    setTime(t) { time = t; }
  };
  return A;
}
async function playRound(seed, style) {
  const A = fakeHub({ seed });
  const g = loadGame({ aihub: A });
  const { game, I, snap } = g;
  game.advance(0.3);
  await new Promise(r => setTimeout(r, 5));
  game.advance(0.3);
  A.emit('card', { left: 3000, paused: false, starting: false, ready: [0], asking: 0, asked: false });
  A.emit('start', { in: 3000 });
  A.setTime(0);
  game.advance(0.5);
  let t = 0, guard = 0;
  while (snap().scene === 'match' && t < 240 && guard++ < 200000) {
    game.advance(1 / 120); t += 1 / 120;
    const s = snap(), m = s.match;
    if (!m) continue;
    if (m.phase === 'flight' && s.ball && s.ball.y < 520 && s.ball.y > 440 && style === 'bat') I.tap('shot');
    if (m.phase === 'flight' && s.ball && s.ball.y < 520 && s.ball.y > 440 && style === 'loft') I.tap('loft');
    if (m.phase === 'play' && style === 'bat' && t > 3) { I.tap('run'); }
    if (s.match && s.match.phase === 'end') break;
  }
  for (let k = 0; k < 600; k++) game.advance(1 / 120);   // the round's end is shown for a moment, then reported
  return { g, A, snap: snap() };
}
export async function run({ check }) {
  const a = await playRound(12345, 'bat');
  const b = await playRound(12345, 'loft');
  check('the hub client is asked to connect in parallel with seats 1 to 4', a.A.calls.connect[0] && a.A.calls.connect[0].mode === 'parallel' && a.A.calls.connect[0].seats.join() === '1,4' && a.A.calls.connect[0].card === true, JSON.stringify(a.A.calls.connect[0]));
  check('ready is called with no key press', a.A.calls.ready === 1, a.A.calls.ready);
  check('a round sends a progress at the start and one after each ball', a.A.calls.progress.length === a.g.snap().logLen + 1 && a.g.snap().logLen > 0, a.A.calls.progress.length + ' for ' + a.g.snap().logLen + ' balls');
  check('the round sends one result at its end', a.A.calls.result.length === 1, a.A.calls.result.length);
  check('the result has the score', a.A.calls.result[0] && typeof a.A.calls.result[0].score === 'number', JSON.stringify(a.A.calls.result[0]));
  check('the two copies face the same deliveries', a.g.snap().deliveries.length === 3 && a.g.snap().deliveries.join() === b.g.snap().deliveries.join(), a.g.snap().deliveries.join() + ' vs ' + b.g.snap().deliveries.join());
  check('no errors in a round', a.g.errs().length === 0, a.g.errs().join(' | '));

  // time-up in the middle of a round: one result, at once
  const c = loadGame({ aihub: fakeHub({ seed: 9 }) });
  const A = c.ctx.AIHub;
  c.game.advance(0.3);
  await new Promise(r => setTimeout(r, 5));
  c.game.advance(0.3);
  A.emit('start', { in: 0 }); A.setTime(0); c.game.advance(0.5);
  A.emit('time-up', { graceMs: 5000 });
  check('time-up sends a result at once', A.calls.result.length === 1, A.calls.result.length);
  A.emit('time-up', { graceMs: 5000 });
  check('a second time-up sends no second result', A.calls.result.length === 1, A.calls.result.length);
  A.emit('end', { reason: 'session-ended', standings: [] });
  check('end freezes the round', c.snap().hub.ended === 'session-ended', JSON.stringify(c.snap().hub));
  check('no errors after end', c.errs().length === 0, c.errs().join(' | '));
  check('the pause menu has no Restart or Dev mode in a session', c.game.o.menu.items.length === 0, c.game.o.menu.items.length);
}
