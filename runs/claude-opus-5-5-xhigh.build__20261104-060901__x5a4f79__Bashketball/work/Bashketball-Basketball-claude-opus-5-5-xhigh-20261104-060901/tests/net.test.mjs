// The net suite: 2-4 copies of the game on a simulated hub network (latency, loss), each with an AIHub stub in place of
// the client's session: inputs reach the host, snapshots reach the clients, events play once, a leaver turns CPU, the
// host finishes at time-up with valid standings, a host leaving voids the round, a server copy runs the world, and every
// copy keeps within the message budget. The card answers Ready on Enter and More time on Triangle.
import { load, run, errors, mulberry } from './helpers.mjs';

function fakeHub(n, o = {}) {
  const H = { t: 0, copies: [], queue: [], sent: [], results: [], latency: o.latency || 60, loss: o.loss || 0, rnd: mulberry(7), started: false, startAt: 0 };
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: 'PLAYER' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const hostId = o.server ? 99 : 0;
  H.make = (me) => {
    const handlers = {}, pending = {};
    const stub = {
      active: true, version: '1.4.0', protocol: 1, me, isHost: me === hostId, host: hostId, server: me === 99, players, mode: 'shared-world', seed: 4242, limitMs: 240000, round: 1,
      connect: () => Promise.resolve({ me, players, host: hostId, isHost: me === hostId, server: me === 99, mode: 'shared-world', round: 1, limitMs: 240000, seed: 4242 }),
      ready: () => { stub._ready = true; }, answer: a => { stub._answers.push(a); }, _answers: [],
      time: () => H.started ? H.t - H.startAt : -Infinity,
      on: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); for (const a of pending[ev] || []) fn(...a); pending[ev] = []; return () => {}; },
      send: (data, opt = {}) => { const s = JSON.stringify(data); H.sent.push({ from: me, at: H.t, bytes: s.length, reliable: opt.reliable !== false }); if (opt.reliable === false && H.rnd() < H.loss) return true; for (const c of H.copies) if (c.me !== me && (opt.to === undefined || opt.to === c.me)) H.queue.push({ at: H.t + H.latency * (.7 + H.rnd() * .6), to: c, data: JSON.parse(s), from: me }); return true; },
      rng: label => { let h = 2166136261; for (const ch of label + ':4242') h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return mulberry(h >>> 0); },
      finish: r => { H.results.push({ from: me, r, at: H.t }); }, fail: m => { H.failed = m; }, progress() {}, result() {},
      _emit: (ev, ...a) => { if (handlers[ev] && handlers[ev].length) for (const fn of handlers[ev]) fn(...a); else (pending[ev] = pending[ev] || []).push(a); }
    };
    return stub;
  };
  H.tick = dt => { H.t += dt * 1000; for (const m of H.queue.filter(m => m.at <= H.t)) m.to.hub._emit('message', m.data, m.from); H.queue = H.queue.filter(m => m.at > H.t); };
  return H;
}
async function startRound(n, o = {}) {
  const H = fakeHub(n, o), ids = o.server ? [99, ...Array.from({ length: n }, (_, i) => i)] : Array.from({ length: n }, (_, i) => i);
  for (const me of ids) { const hub = H.make(me), h = await load({ extra: { AIHub: hub }, seed: 11 + me }); H.copies.push({ me, hub, h }); }
  const all = (fn) => H.copies.forEach(fn);
  const step = (sec, fn) => { const k = Math.round(sec * 120); for (let i = 0; i < k; i++) { if (fn) fn(i); all(c => c.h.game.advance(1 / 120)); H.tick(1 / 120); } };
  step(.5);
  all(c => c.hub._emit('card', { left: 3000, paused: false, starting: false, ready: [], asking: 0, asked: false }));
  step(.2); H.started = true; H.startAt = H.t + 3000; all(c => c.hub._emit('start', { in: 3000 }));
  step(.5);
  return { H, step, all };
}
const net = async t => {
  // two players: the card, the start, inputs both ways
  let R = await startRound(2, { latency: 80 });
  const [host, cl] = R.H.copies, hb = host.h.bb, cb = cl.h.bb;
  t.check('every copy readied with no key press', R.H.copies.every(c => c.hub._ready));
  t.check('host and client are in the match scene', host.h.game.sceneName === 'match' && cl.h.game.sceneName === 'match', [host.h.game.sceneName, cl.h.game.sceneName]);
  t.check('roles', hb.NET.role === 'host' && cb.NET.role === 'client', [hb.NET.role, cb.NET.role]);
  t.check('seats map to slots: seat 0 HOME, seat 1 AWAY', hb.NET.seatSlot[0] === 0 && hb.NET.seatSlot[1] === 2);
  t.check('the same roster on both copies', hb.S.teams.map(x => x.id).join() === cb.S.teams.map(x => x.id).join(), [hb.S.teams.map(x => x.id), cb.S.teams.map(x => x.id)]);
  R.step(3.2);
  t.check('the tip-off waits for the hub clock, then goes', hb.S.match.phase !== 'tipoff' || hb.S.match.phaseT > 0, hb.S.match.phase);
  // the client's input moves its player (slot 2) on the host
  t.check('the host reads the remote seat from the network', hb.S.players[2].source.kind === 'net', hb.S.players.map(p => p.source.kind));
  t.check('every copy tags both humans', [hb, cb].every(x => x.S.players[0].human === 0 && x.S.players[2].human === 1), [hb, cb].map(x => x.S.players.map(p => p.human)));
  const hp = hb.S.players[2]; hb.S.match.phase = 'live'; hb.S.match.practice = true; hp.setState('run'); hp.x = hb.CMX; hp.y = hb.CMY + 60; const before = hp.x; cl.h.game.input.hold('left'); R.step(1.2); cl.h.game.input.hold('left', false);
  t.check('a client input moves its player on the host', hp.x < before - 60, [before, hp.x, hp.state]);
  R.step(2);
  const dpos = Math.max(...hb.S.players.map((p, i) => Math.hypot(p.x - cb.S.players[i].x, p.y - cb.S.players[i].y)));
  t.check('snapshots put the client\'s players where the host has them', dpos < 70, dpos);
  // play on; events once; final scores agree
  let hostBaskets = 0, clBaskets = 0; hb.on('basket', () => hostBaskets++); cb.on('basket', () => clBaskets++);
  R.step(40);
  t.check('the scores agree', hb.S.match.score.join() === cb.S.match.score.join(), [hb.S.match.score, cb.S.match.score]);
  t.check('each basket plays once on the client', Math.abs(hostBaskets - clBaskets) <= 1 && (hostBaskets === 0 || clBaskets > 0), [hostBaskets, clBaskets]);
  // the budget: under 20 messages a second each, unreliable under 1,200 bytes
  const secs = R.H.t / 1000, byFrom = {}; for (const m of R.H.sent) byFrom[m.from] = (byFrom[m.from] || 0) + 1;
  t.check('each copy sends under 20 messages a second', Object.values(byFrom).every(n => n / secs < 20), Object.entries(byFrom).map(([k, v]) => k + ':' + (v / secs).toFixed(1)));
  t.check('unreliable messages under 1,200 bytes', R.H.sent.filter(m => !m.reliable).every(m => m.bytes < 1200), Math.max(...R.H.sent.filter(m => !m.reliable).map(m => m.bytes)));
  // time-up: the host finishes at once with valid standings
  host.hub._emit('time-up', { graceMs: 3000 }); R.step(.2);
  const res = R.H.results[0];
  t.check('time-up: the host finishes', !!res && res.from === 0, R.H.results);
  if (res) { const ids = res.r.standings.flat(); t.check('standings list every player once', ids.length === 2 && new Set(ids).size === 2, res.r.standings); t.check('scores for every player', Object.keys(res.r.scores).length === 2, res.r.scores); t.check('stats per player', res.r.stats[0] && res.r.stats[0].PTS !== undefined, res.r.stats); }
  R.all(c => c.hub._emit('end', { reason: 'finished', standings: res ? res.r.standings : [] })); R.step(.3);
  t.check('every copy stops at the end', R.H.copies.every(c => c.h.bb.NET.ended));
  const sentAfter = R.H.sent.length; R.step(1); t.check('nothing is sent after the end', R.H.sent.length === sentAfter, R.H.sent.length - sentAfter);
  t.check('no errors (2 players)', R.H.copies.every(c => !errors(c.h.game, c.h.ctx).length), R.H.copies.map(c => errors(c.h.game, c.h.ctx)));
  // four players with latency and loss: a leaver turns CPU; the host leaving voids the round
  R = await startRound(4, { latency: 150, loss: .05 });
  const h4 = R.H.copies[0].h.bb; R.step(5);
  t.check('four players in the match', R.H.copies.every(c => c.h.game.sceneName === 'match'));
  R.all(c => c.hub._emit('leave', { id: 3, reason: 'left' })); R.step(.5);
  t.check('a leaver\'s player turns CPU on the host', h4.S.players[h4.NET.seatSlot[3] === undefined ? 3 : 3].source.kind === 'cpu', h4.S.players[3].source.kind);
  R.all(c => c.hub._emit('leave', { id: 0, reason: 'disconnected' })); R.step(.5);
  t.check('clients see the host leave', R.H.copies.slice(1).every(c => c.h.bb.NET.hostLeft));
  t.check('no errors (4 players, loss)', R.H.copies.every(c => !errors(c.h.game, c.h.ctx).length), R.H.copies.map(c => errors(c.h.game, c.h.ctx)).flat().slice(0, 3));
  // a server copy: no player of its own, the world runs
  R = await startRound(2, { server: true });
  const srv = R.H.copies[0].h.bb; R.step(12);
  t.check('the server copy has no local player', srv.NET.role === 'server' && srv.NET.mySlot === -1 && srv.S.players.every(p => p.source.kind !== 'local'));
  t.check('the server runs the world', srv.S.match && srv.S.match.gameT > 5 && srv.S.match.phase !== 'tipoff', srv.S.match && srv.S.match.phase);
  t.check('clients get snapshots from the server', R.H.copies[1].h.bb.NET.snaps.length > 0);
  // the card: Enter answers Ready, Triangle asks for more time
  const H2 = fakeHub(2), hubA = H2.make(0); const hc = await load({ extra: { AIHub: hubA } }); H2.copies.push({ me: 0, hub: hubA, h: hc }); run(hc.game, .3);
  t.check('our own card shows', hc.game.sceneName === 'hubcard', hc.game.sceneName);
  hc.game.input.press('Enter'); run(hc.game, 1 / 60); hc.game.input.release('Enter'); run(hc.game, .1);
  hc.game.input.press('Pad3'); run(hc.game, 1 / 60); hc.game.input.release('Pad3'); run(hc.game, .1);
  t.check('Enter answers Ready', hubA._answers.includes('ready'), hubA._answers);
  t.check('Triangle asks for more time', hubA._answers.includes('more'), hubA._answers);
};
export default { net };
