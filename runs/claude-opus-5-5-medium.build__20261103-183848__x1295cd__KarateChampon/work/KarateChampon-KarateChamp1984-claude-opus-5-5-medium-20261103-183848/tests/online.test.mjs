// A fake hub: an in-process bus with a shared AIHub.time(), latency and the 20/s limit; copies in separate vm contexts.
import { loadGame } from './lib/load.mjs';
function world(n, o = {}) {
  const W = { now: 0, startAt: null, copies: [], q: [], sends: [], finished: null };
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: 'Player ' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const hostId = o.server ? 'server' : 0;
  const copies = (o.server ? ['server'] : []).concat(players.map(p => p.id));
  for (const me of copies) {
    const hand = {}, early = {}, H = { active: true, me, called: { ready: 0, answers: [] }, sent: [], ended: false };
    Object.assign(H, {
      connect: () => Promise.resolve(Object.assign(H, { players, host: hostId, isHost: me === hostId, server: me === 'server', mode: 'shared-world', round: 1, limitMs: 300000, seed: 7 })),
      ready() { H.called.ready++; }, answer(a) { H.called.answers.push(a); },
      time: () => W.startAt === null ? -Infinity : W.now - W.startAt - 3000,
      on(ev, fn) { (hand[ev] = hand[ev] || []).push(fn); for (const a of early[ev] || []) fn(...a); early[ev] = []; return () => {}; },
      emit(ev, ...a) { if (hand[ev] && hand[ev].length) for (const f of hand[ev]) f(...a); else (early[ev] = early[ev] || []).push(a); },
      send(d, op = {}) { if (H.ended) { W.sendsAfterEnd = (W.sendsAfterEnd || 0) + 1; return false; } const s = JSON.stringify(d); W.sends.push({ from: me, t: W.now, size: s.length }); for (const other of W.copies) if (other.me !== me && !W.left?.has(other.me)) W.q.push({ at: W.now + (o.latency || 0), to: other, d: JSON.parse(s), from: me }); return true; },
      finish(r) { W.finished = r; }, rng: () => Math.random, fail() {}
    });
    const G = loadGame({ hub: H }); G.me = me; G.H = H; W.copies.push(G);
  }
  W.step = async (dt = 1 / 60) => { W.now += dt * 1000; for (const G of W.copies) G.ctx.__now = W.now; const due = W.q.filter(m => m.at <= W.now); W.q = W.q.filter(m => m.at > W.now); for (const m of due) m.to.H.emit('message', m.d, m.from); for (const G of W.copies) if (!G.H.ended) G.game.advance(dt); await Promise.resolve(); };
  W.run = async s => { for (let k = 0; k < s * 60; k++) await W.step(); };
  W.start = () => { for (const G of W.copies) G.H.emit('card', { left: 0, ready: players.map(p => p.id), starting: true }); W.startAt = W.now; for (const G of W.copies) G.H.emit('start', { in: 3000 }); };
  W.end = reason => { for (const G of W.copies) { G.H.emit('end', { reason, standings: W.finished ? W.finished.standings : [] }); G.H.ended = true; } };
  return W;
}
export default async t => {
  { const W = world(2, { latency: 40 }); await W.run(1); const [h, g] = W.copies;
    t.check('in a session the game opens straight into the session scene', W.copies.every(G => G.game.sceneName === 'session'), W.copies.map(G => G.game.sceneName));
    t.check('ready() with no key press', W.copies.every(G => G.H.called.ready === 1)); t.check('roles: host and guest', h.KC.Net.role === 'host' && g.KC.Net.role === 'guest');
    g.I.tap('confirm'); await W.run(.1); t.check('Enter answers ready on the card', g.H.called.answers.includes('ready')); g.I.tap('more'); await W.run(.1); t.check('T / triangle asks for more time', g.H.called.answers.includes('more'));
    W.start(); await W.run(2); t.check('no play before time 0', h.KC.Net.state === 'countdown'); await W.run(1.5); t.check('play at time 0', h.KC.Net.state === 'play' && g.KC.Net.state === 'play', [h.KC.Net.state, g.KC.Net.state]);
    // the guest's input reaches the host: press a technique and see the host's red fighter start it
    await W.run(6); let started = null; const hostRed = () => h.KC.Net.bout.f[1]; const wasK = hostRed().history.length; g.I.hold('tRight'); await W.run(.1); g.I.hold('tRight', false); await W.run(.6); t.check('guest input reaches the host', hostRed().history.length > wasK, hostRed().history.slice(-3));
    t.check('snapshots reach the guest', !!g.KC.Net.pbout && Math.abs(g.KC.Net.pbout.f[0].x - h.KC.Net.bout.f[0].x) < 30, [g.KC.Net.pbout && g.KC.Net.pbout.f[0].x, h.KC.Net.bout.f[0].x]);
    // both on autopilot: bouts are won and every copy agrees on the wins
    h.game.debug.autopilot = null; const hb = h.KC.Net; const ai = [new h.KC.KarateAI({ id: 'taro', level: 8, seed: 3 }), new h.KC.KarateAI({ id: 'ebi', level: 4, seed: 4 })];
    for (let k = 0; k < 40 * 60 && !hb.over; k++) { if (hb.bout && !hb.bout._ap) { hb.bout._ap = true; hb.bout.ctrl = [(f, o, b) => ai[0].control(f, o, b), (f, o, b) => ai[1].control(f, o, b)]; } await W.step(); }
    await W.run(1); t.check('bouts are decided online', hb.K.bouts >= 2, hb.K.bouts); t.check('guest and host agree on bout wins', JSON.stringify(g.KC.Net.K.wins) === JSON.stringify(hb.K.wins), [g.KC.Net.K.wins, hb.K.wins]);
    const rate = Math.max(...W.copies.map(G => { const ts = W.sends.filter(s => s.from === G.me).map(s => s.t); let mx = 0; for (let i = 0; i < ts.length; i++) { let j = i; while (j < ts.length && ts[j] - ts[i] < 1000) j++; mx = Math.max(mx, j - i); } return mx; }));
    t.check('each copy sends at most 20 messages a second', rate <= 20, rate); t.check('messages under 16 KB', Math.max(...W.sends.map(s => s.size)) < 16000);
    W.copies[0].H.emit('time-up', { graceMs: 2000 }); await W.run(.2); t.check('time-up: the host finishes with standings', W.finished && Array.isArray(W.finished.standings) && W.finished.standings.flat().length === 2, W.finished);
    t.check('finish carries scores, stats and awards', W.finished && W.finished.scores && W.finished.stats && Array.isArray(W.finished.awards));
    W.end('finished'); const before = W.sends.length; await W.run(1); t.check('after end: nothing sent', W.sends.length === before && !W.sendsAfterEnd, W.sendsAfterEnd); t.check('after end: the music stops', W.copies.every(G => !G.game.audio.song)); t.check('the guest shows ROUND OVER', g.KC.Net.state === 'ended'); }
  // 4 players: Kachinuki rotation, a fighter leaving mid-bout forfeits, spectators send heartbeats
  { const W = world(4, { latency: 150 }); await W.run(1); W.start(); await W.run(4); const h = W.copies[0].KC.Net;
    t.check('4 players: white vs red, two queue', h.K.queue.length === 4 && h.boutIds.length === 2, h.K.queue); const spect = W.copies[3]; await W.run(2); t.check('spectators send heartbeats', W.sends.some(s => s.from === spect.me), W.sends.length);
    const loser = h.boutIds[1]; W.left = new Set([loser]); h.onLeave({ id: loser, reason: 'left' }); await W.run(.2); t.check('a fighter leaving forfeits the bout', h.K.bouts === 1 && !h.boutIds.includes(loser), [h.K.bouts, h.boutIds]);
    for (const id of [2, 3]) h.onLeave({ id, reason: 'left' }); await W.run(.2); t.check('fewer than 2 players: finish at once', !!W.finished, W.finished); }
  // live pause in a session: the world keeps running and the local fighter goes neutral; a guest's predicted wind-up
  { const W = world(2, { latency: 120 }); await W.run(1); W.start(); await W.run(9); const [h, g] = W.copies, hn = h.KC.Net, gn = g.KC.Net;
    h.I.tap('pause'); await W.run(.1); const k0 = hn.bout.steps; await W.run(1); t.check('live pause: a menu opens and the bout keeps running', hn.menuOpen && hn.bout.steps > k0 + 100 && !h.game.paused, [hn.menuOpen, hn.bout.steps - k0]); h.I.tap('pause'); await W.run(.1); t.check('live pause closes', !hn.menuOpen);
    const side = gn.pids.indexOf(g.me), pf = gn.pbout.f[side]; await W.run(.5); g.I.hold('tRight'); await W.run(1 / 60); g.I.hold('tRight', false); const predicted = pf.st === 'tech'; await W.run(.6);
    t.check('the guest predicts its own wind-up at once', predicted, pf.st); t.check('the host confirms it within 250 ms', (gn.confirmed || 0) >= 1, gn.confirmed); }
  // the server role: a host with no player of its own
  { const W = world(2, { server: true }); await W.run(1); const s = W.copies[0]; t.check('server role', s.KC.Net.role === 'server'); W.start(); await W.run(5); t.check('the server runs the bout and sends', s.KC.Net.bout && W.sends.some(x => x.from === 'server'), W.sends.length); }
  // no hub: connect returns null and the title appears
  { const G = loadGame(); G.adv(1); t.check('outside a session: the title', G.game.sceneName === 'title'); }
};
