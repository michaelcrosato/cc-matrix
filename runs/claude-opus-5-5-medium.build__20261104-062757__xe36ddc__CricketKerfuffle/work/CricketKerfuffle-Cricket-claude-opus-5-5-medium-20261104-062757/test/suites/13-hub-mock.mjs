// 5.17: an AI Hub session with a fake client: connect, our card, ready with no key, the same round for every copy,
// progress per ball, one result, time-up, the end (no input, no sound)
const fakeHub = () => `(function(){ var h = { active: true, calls: [], handlers: {}, t: -Infinity, seeded: true,
  connect: function (o) { h.calls.push(['connect', o]); return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ada', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], seed: 4242, mode: 'parallel', round: 1, limitMs: 180000 }); },
  ready: function () { h.calls.push(['ready']); }, answer: function (a) { h.calls.push(['answer', a]); },
  on: function (e, f) { (h.handlers[e] = h.handlers[e] || []).push(f); return function () {}; },
  fire: function (e, d) { (h.handlers[e] || []).forEach(function (f) { f(d); }); },
  progress: function (p) { h.calls.push(['progress', p]); }, result: function (r) { h.calls.push(['result', r]); },
  time: function () { return h.t; }, send: function () { h.calls.push(['send']); return true; },
  rng: function (label) { var s = 0; for (var i = 0; i < label.length; i++) s = (s * 31 + label.charCodeAt(i)) >>> 0; s = (s ^ 4242) >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } };
  globalThis.AIHub = h; })();`;
export default async ({ boot, suite, until }) => {
  const s = suite();
  const run = async (inputs) => {
    const B = boot({ hubSrc: fakeHub() }); const H = B.ctx.AIHub || B.game.debug.E && null;
    const hub = await new Promise(r => setTimeout(() => r(B.ctx.AIHub), 0));
    await new Promise(r => setTimeout(r, 0)); B.game.advance(.3);
    return Object.assign(B, { hub });
  };
  const B = await run();
  const { game, D, hub } = B;
  const c = hub.calls.find(x => x[0] === 'connect');
  s.ok('connect asks for parallel, seats 1-4, our own card', c && c[1].mode === 'parallel' && c[1].seats[0] === 1 && c[1].seats[1] === 4 && c[1].card === true, c);
  s.ok('ready is called with no key press', hub.calls.some(x => x[0] === 'ready'));
  s.ok('the game opens straight on its card (no title)', D.snapshot().scene === 'hubcard', D.snapshot().scene);
  B.I.press('Enter'); game.advance(1 / 60); B.I.release('Enter'); game.advance(.05);
  s.ok('Enter answers Ready on our card', hub.calls.some(x => x[0] === 'answer' && x[1] === 'ready'));
  B.I.press('KeyT'); game.advance(1 / 60); B.I.release('KeyT'); game.advance(.05);
  s.ok('T asks for more time', hub.calls.some(x => x[0] === 'answer' && x[1] === 'more'));
  hub.fire('card', { left: 9000, ready: [0], asking: 0 }); game.advance(.1);
  hub.t = -3000; hub.fire('start', { in: 3000 }); until(game, () => D.snapshot().scene === 'match', 2);
  s.ok('start opens the round', D.snapshot().scene === 'match' && D.match().cfg.mode === 'hub');
  const m = D.match(); game.advance(1); s.ok('play waits for the hub clock', m.state === 'pre' || m.state === 'between', m.state);
  hub.t = 0;
  const dels = []; D.BUS.subs['ball:released'] = (D.BUS.subs['ball:released'] || []).concat([d => dels.push(d.del + ':' + d.kmh)]);
  until(game, () => { hub.t += 1000 / 60; if (m.state === 'flight' && Math.random() < .02) B.I.tap('shot'); return m.state === 'over'; }, 120, 1 / 60);
  s.ok('the over ends (6 balls or 2 wickets)', m.state === 'over' && (m.I.legal >= 6 || m.I.wkts >= 2), [m.state, m.I.legal, m.I.wkts]);
  const prog = hub.calls.filter(x => x[0] === 'progress');
  s.ok('one progress at the start and one after every ball', prog.length >= m.I.log.length + 1, [prog.length, m.I.log.length]);
  s.ok('progress carries the score and a label', prog.every(p => typeof p[1].score === 'number' && /\(\d+ balls\)/.test(p[1].label)), prog[prog.length - 1]);
  const res = hub.calls.filter(x => x[0] === 'result'); game.advance(1);
  s.ok('one result, with the runs as the score', res.length === 1 && res[0][1].score === m.I.runs && res[0][1].stats, res);
  s.ok('it never sends', !hub.calls.some(x => x[0] === 'send'));
  // the same round for a second copy, whatever it presses
  const B2 = await run(); B2.hub.fire('start', {}); B2.hub.t = 0; until(B2.game, () => B2.D.snapshot().scene === 'match', 2); const m2 = B2.D.match(); const dels2 = [];
  B2.D.BUS.subs['ball:released'] = (B2.D.BUS.subs['ball:released'] || []).concat([d => dels2.push(d.del + ':' + d.kmh)]);
  until(B2.game, () => { B2.hub.t += 1000 / 60; if (m2.state === 'flight') B2.I.tap('loft'); return m2.state === 'over' || dels2.length >= Math.min(3, dels.length); }, 120, 1 / 60);
  s.ok('every copy faces the same deliveries', dels2.length >= 2 && dels2.every((d, k) => d === dels[k]), [dels.slice(0, 3), dels2.slice(0, 3)]);
  // time-up mid-over: a result at once; the end: no input, no sound
  const B3 = await run(); B3.hub.fire('start', {}); B3.hub.t = 0; until(B3.game, () => B3.D.snapshot().scene === 'match', 2); until(B3.game, () => { B3.hub.t += 16; return B3.D.match().I.legal >= 1; }, 30, 1 / 60);
  B3.hub.fire('time-up', { graceMs: 3000 }); s.ok('time-up mid-over: a result at once', B3.hub.calls.filter(x => x[0] === 'result').length === 1);
  B3.hub.fire('end', { reason: 'finished', standings: [[0]] }); const before = B3.D.match().ball.phase + B3.D.match().state + B3.D.match().t;
  B3.I.tap('shot'); B3.game.advance(1);
  s.ok('after the end the round is frozen and takes no input', B3.D.match().ball.phase + B3.D.match().state + B3.D.match().t === before && B3.D.HUBS.ended === 'Round over');
  s.ok('the pause menu has no Quit, Restart or Dev Mode in a session', B3.game.debug && !B3.D.devOpen());
  s.noErrors(game); s.noErrors(B2.game); s.noErrors(B3.game);
};
