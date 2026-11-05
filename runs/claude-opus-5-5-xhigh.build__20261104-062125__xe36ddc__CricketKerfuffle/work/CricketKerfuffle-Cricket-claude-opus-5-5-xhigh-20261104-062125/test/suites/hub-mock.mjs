import { load, until } from '../lib.mjs';
/** a stand-in for the AI Hub session client (the protocol's shape), recording what the game calls */
function fakeHub(seed) {
  const H = {}, calls = { connect: [], ready: 0, progress: [], result: [], answer: [], send: 0 };
  const lcg = s => { let x = s >>> 0 || 1; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };
  const hash = str => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const hub = { active: true, calls, _time: -Infinity,
    connect(o) { calls.connect.push(o); return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ada', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], host: 0, isHost: true, mode: 'parallel', round: 1, limitMs: 120000, seed }); },
    ready() { calls.ready++; }, answer(a) { calls.answer.push(a); }, time() { return hub._time; },
    on(ev, fn) { (H[ev] = H[ev] || []).push(fn); return () => {}; }, emit(ev, d) { for (const f of H[ev] || []) f(d); },
    progress(p) { calls.progress.push(p); }, result(r) { calls.result.push(r); }, send() { calls.send++; return false; },
    rng(label) { return lcg(hash(seed + ':' + label)); } };
  return hub;
}
const tick = () => new Promise(r => setTimeout(r, 0));
async function round(seed, bat) {
  const hub = fakeHub(seed), env = load({ seed: 1, hub }), { game, D, K } = env;
  game.advance(.2); await tick(); await tick(); game.advance(.2);
  hub.emit('card', { left: 12000, ready: [0], asking: 0, asked: false });
  game.advance(.1);
  const releases = []; K.bus.on('ball:released', d => releases.push(d.id + '@' + d.kmh)); K.bus.on('ball:pitched', d => releases.push('#' + d.at.map(v => Math.round(v * 10)).join(',')));
  hub.emit('start', { in: 3000 }); game.advance(.2); hub._time = -2000; game.advance(1); const m0 = D.match(); const waited = m0 ? m0.phase : null; hub._time = 100;
  const m = D.match(); if (bat && m) m.cfg.cheat.autoBat = true;
  return { hub, env, game, D, K, m, releases, waited };
}
export async function run(check) {
  const a = await round(77, true);
  check('connect is called in parallel mode for 1-4 seats with our own card', a.hub.calls.connect.length === 1 && a.hub.calls.connect[0].mode === 'parallel' && JSON.stringify(a.hub.calls.connect[0].seats) === '[1,4]' && a.hub.calls.connect[0].card === true, a.hub.calls.connect);
  check('ready() is called with no key press', a.hub.calls.ready === 1);
  check('the round scene starts on start', a.D.snapshot().scene === 'hubround', a.D.snapshot().scene);
  check('the first ball waits for the countdown (time < 0)', a.waited === 'setup' || a.waited === 'intro', a.waited);
  until(a.game, () => a.m.inn.done || a.m.phase === 'done', 240, 1 / 30);
  check('progress after every ball (and at the start)', a.hub.calls.progress.length >= a.m.innings[0].recs.length + 1, [a.hub.calls.progress.length, a.m.innings[0].recs.length]);
  check('one result when the over ends', a.hub.calls.result.length === 1 && a.hub.calls.result[0].score === a.m.innings[0].runs, a.hub.calls.result);
  check('the result carries stats', a.hub.calls.result[0] && a.hub.calls.result[0].stats && 'boundaries' in a.hub.calls.result[0].stats);
  check('the over is 6 balls or 2 wickets at most', a.m.innings[0].balls <= 6 && a.m.innings[0].wkts <= 2, [a.m.innings[0].balls, a.m.innings[0].wkts]);
  check('send() is never used in parallel mode', a.hub.calls.send === 0);
  const b = await round(77, false);
  until(b.game, () => b.m.inn.done || b.m.phase === 'done', 240, 1 / 30);
  const n = Math.min(a.releases.length, b.releases.length, 4);
  check('the same seed gives the same deliveries whatever the player does', n >= 2 && JSON.stringify(a.releases.filter(s => !s.startsWith('#')).slice(0, 3)) === JSON.stringify(b.releases.filter(s => !s.startsWith('#')).slice(0, 3)), [a.releases.slice(0, 6), b.releases.slice(0, 6)]);
  check('the shared deliveries pitch on the same spots', JSON.stringify(a.releases.filter(s => s.startsWith('#')).slice(0, 2)) === JSON.stringify(b.releases.filter(s => s.startsWith('#')).slice(0, 2)), [a.releases.filter(s => s.startsWith('#')).slice(0, 2), b.releases.filter(s => s.startsWith('#')).slice(0, 2)]);
  // time-up mid-over: an immediate result
  const c = await round(78, true); c.game.advance(4);
  c.hub.emit('time-up', { graceMs: 3000 }); c.game.advance(.05); check('time-up mid-over sends a result at once', c.hub.calls.result.length === 1, c.hub.calls.result.length);
  c.game.advance(20); check('only one result, ever', c.hub.calls.result.length === 1, c.hub.calls.result.length);
  // end: no input, no sound, the scene frozen
  const d = await round(79, true); d.game.advance(3); d.hub.emit('end', { reason: 'finished', standings: [[0]] }); const t = d.m.time; d.game.advance(2);
  check('end freezes the round (no more play)', d.m.time === t && d.D.snapshot().hub.ended, [t, d.m.time]);
  check('end: the pause menu has no Quit, Restart or Dev Mode in a session', d.game.o.menu.items.length === 0 && d.game.o.menu.quit === false);
  check('no errors', ![a, b, c, d].some(x => x.game.errors.length), [a, b, c, d].flatMap(x => x.game.errors.map(e => e.message)));
}
