// a fake AIHub injected before the game loads: connect, ready, the card's answers, play from time() >= 0, progress every
// second, ghost traffic at ~10 Hz, ghosts drawn and removed, a result on time-up, end stops input and sound
const PRE = `(() => {
  const H = window.__hubLog = { calls: [], handlers: {}, t: -Infinity };
  window.AIHub = { active: true, seeded: true,
    connect(o) { H.calls.push(['connect', o]); return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ume', color: '#e8443a' }, { id: 1, name: 'Kiku', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 300000, seed: 7 }); },
    ready() { H.calls.push(['ready', H.keyPressed || false]); }, answer(a) { H.calls.push(['answer', a]); }, time() { return H.t; },
    on(ev, fn) { (H.handlers[ev] = H.handlers[ev] || []).push(fn); return () => {}; }, emit(ev, ...a) { for (const f of H.handlers[ev] || []) f(...a); },
    progress(p) { H.calls.push(['progress', p, H.t]); }, result(r) { H.calls.push(['result', r, H.t]); }, send(d, o) { H.calls.push(['send', d, o, H.t]); return true; }, finish() {}, fail(m) { H.calls.push(['fail', m]); }, rng() { return () => .5; } };
})();`;
export default async ({ makeContext, check }) => {
  const t = makeContext({ __pre: PRE }); const H = t.ctx.__hubLog, B = t.B, G = t.game, AH = t.ctx.AIHub;
  t.step(.2); await null; await null; t.step(.1);
  const con = H.calls.find(c => c[0] === 'connect');
  check('connect asks for ghost, 1-4 seats, its own card', con && con[1].mode === 'ghost' && con[1].seats[0] === 1 && con[1].seats[1] === 4 && con[1].card === true, JSON.stringify(con));
  check('ready() is called with no key press', H.calls.some(c => c[0] === 'ready'), JSON.stringify(H.calls.map(c => c[0])));
  check('the game shows its own card, not the title', t.snap().scene === 'hubCard', t.snap().scene);
  const spy = t.ctx.Math.random; let draws = 0; t.ctx.Math.random = () => { draws++; return spy(); }; AH.emit('card', { left: 9000, ready: [], asking: 0 }); t.step(1); t.ctx.Math.random = spy;
  check('the card draws no Math.random numbers', draws === 0, draws);
  t.I.press('Enter'); t.step(.05); t.I.release('Enter'); t.step(.05); t.tap('interact'); t.step(.05);
  check('Enter answers ready, Triangle asks for more time', H.calls.some(c => c[0] === 'answer' && c[1] === 'ready') && H.calls.some(c => c[0] === 'answer' && c[1] === 'more'), JSON.stringify(H.calls.filter(c => c[0] === 'answer')));
  H.t = -3000; AH.emit('start', { in: 3000 }); t.step(.3);
  check('start goes to the round in the mission scene', t.snap().scene === 'mission' && t.M().mode === 'hub', t.snap().scene);
  const h = t.H(), x0 = h.x; t.intent({ move: [0, -1] }, .5);
  check('play waits for time() >= 0 (the countdown)', Math.abs(h.x - x0) < 1 && Math.abs(h.y - t.H().y) < 1 && !H.calls.some(c => c[0] === 'progress'), '');
  H.t = 0; const startN = H.calls.length;
  for (let k = 0; k < 40; k++) { t.intent({ move: [0, -1] }, .1); H.t += 100; }
  const prog = H.calls.slice(startN).filter(c => c[0] === 'progress'), sends = H.calls.slice(startN).filter(c => c[0] === 'send');
  check('progress about every second from the start (score 0 too)', prog.length >= 3 && prog.length <= 5 && typeof prog[0][1].score === 'number', prog.length);
  check('ghost traffic at about 10 Hz, unreliable', sends.length >= 30 && sends.length <= 45 && sends[0][2].reliable === false && sends[0][1].t === 'g', sends.length + ' ' + JSON.stringify(sends[0]));
  AH.emit('message', { t: 'g', a: 'delivery', x: h.x + 20, y: h.y, z: 0, f: 0, s: 0, k: 0 }, 1); t.step(.2);
  check('a message draws the other player as a ghost', t.M().ghosts.length === 1 && t.M().ghosts[0].name === 'Kiku', JSON.stringify(t.M().ghosts.map(g => g.name)));
  AH.emit('leave', { id: 1, reason: 'left' }); t.step(.1); check('leave removes the ghost', t.M().ghosts.length === 0, '');
  check('no quit or dev mode in a session', B.pauseItems().length === 0 && G.o.menu.quit === false, JSON.stringify(B.pauseItems()));
  AH.emit('time-up', { graceMs: 3000 }); t.step(.1);
  const res = H.calls.filter(c => c[0] === 'result'); check('time-up reports a result at once, only once', res.length === 1 && typeof res[0][1].score === 'number' && Object.keys(res[0][1].stats).length <= 6, JSON.stringify(res));
  AH.emit('end', { reason: 'finished', standings: [[0], [1]] }); t.step(.2); const n0 = H.calls.length; t.intent({ move: [1, 0] }, .5);
  check('after end: no more sends, sound off', H.calls.length === n0 && G.audio.muted, (H.calls.length - n0) + ' muted ' + G.audio.muted);
  check('the hub round throws no errors', !G.errors.length, G.errors.map(e => e.message + (e.stack || '').split('\n')[1]).join(' | '));
};
