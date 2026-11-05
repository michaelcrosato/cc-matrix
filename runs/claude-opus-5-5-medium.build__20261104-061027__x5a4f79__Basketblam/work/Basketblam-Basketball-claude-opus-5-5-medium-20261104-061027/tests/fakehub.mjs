// A simulated AI Hub for the net suite: 2-4 game copies (and a server copy) in their own node:vm contexts, an AIHub
// stub each, one network with latency and loss, the card, the start, leaving, time-up and the end, all in lockstep.
import { fresh } from './helpers.mjs';
const tick = () => new Promise(r => setImmediate(r));
export async function runFakeHub(o = {}) {
  const n = o.n || 2, seed = 4242, net = [], copies = [], clock = { ms: 0, start: null };
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: 'PLAYER' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const hostId = o.server ? n : 0, sentLog = [], stats = { sent: [], received: [], maxBytes: 0 }, answers = new Set(); let finish = null;
  const mkHub = me => {
    const handlers = {}, queued = [], info = { me, players, host: hostId, isHost: me === hostId, server: !!o.server && me === hostId, mode: 'shared-world', round: 1, limitMs: (o.limitS || 60) * 1000, seed };
    const R = label => { let h = 2166136261; for (const c of label + seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); let s = h >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const hub = { active: true, version: '1.4.0', seeded: false,
      connect: () => Promise.resolve(Object.assign(hub, info) && info), ready() { hub._ready = true; }, answer(a) { answers.add(me + ':' + a); },
      time: () => clock.start === null ? -Infinity : clock.ms - clock.start,
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); for (const q of queued.filter(q => q[0] === ev)) fn(...q[1]); return () => {}; },
      send(data, opt = {}) { const s = JSON.stringify(data); stats.sent[me] = (stats.sent[me] || 0) + 1; sentLog.push([me, clock.ms]); if (opt.reliable === false) stats.maxBytes = Math.max(stats.maxBytes, s.length); net.push({ from: me, to: opt.to, data: JSON.parse(s), at: clock.ms + 60 + Math.random() * 40, reliable: opt.reliable !== false }); return true; },
      rng: R, finish(res) { finish = res; }, fail(m) { hub.failed = m; }, progress() {}, result() {},
      _emit(ev, ...a) { if (handlers[ev]) for (const fn of handlers[ev]) fn(...a); else queued.push([ev, a]); } };
    return hub;
  };
  const ids = players.map(p => p.id).concat(o.server ? [n] : []);
  for (const me of ids) { const hub = mkHub(me); const T = fresh({ hub, seed: 50 + me }); copies.push({ me, hub, T, gone: false }); }
  for (let k = 0; k < 10; k++) { await tick(); for (const c of copies) c.T.game.advance(1 / 60); }
  const errors = [];
  const step = async (secs, fn) => {
    for (let t = 0; t < secs; t += 1 / 60) {
      clock.ms += 1000 / 60;
      for (let i = net.length - 1; i >= 0; i--) {
        const m = net[i]; if (m.at > clock.ms) continue; net.splice(i, 1);
        if (!m.reliable && Math.random() < (o.loss || 0)) continue;
        for (const c of copies) if (c.me !== m.from && !c.gone && (m.to === undefined || m.to === c.me)) { stats.received[c.me] = (stats.received[c.me] || 0) + 1; c.hub._emit('message', m.data, m.from); }
      }
      if (fn) fn(t);
      for (const c of copies) if (!c.gone) c.T.game.advance(1 / 60);
      await tick();
    }
  };
  // the card: each player's copy answers Ready on Enter (confirm)
  for (const c of copies) c.hub._emit('card', { left: 5000, paused: false, starting: false, ready: [], asking: 0, asked: false });
  await step(.3);
  for (const c of copies) if (!(o.server && c.me === n)) c.T.game.input.tap('confirm');
  await step(.2);
  const answered = copies.filter(c => !(o.server && c.me === n)).every(c => answers.has(c.me + ':ready'));
  // the start
  clock.start = clock.ms + 3000; for (const c of copies) c.hub._emit('start', { in: 3000 });
  await step(4);
  const host = copies.find(c => c.me === hostId), H = host.T.bb.S;
  // a client holds right with turbo; its player moves on the host
  const client = copies.find(c => c.me !== hostId && !(o.server && c.me === n)) || copies.find(c => c.me !== hostId);
  const seat = client.me, hp = () => H.players.find(p => p.seat === seat);
  const x0 = hp() ? hp().x : 0, y0 = hp() ? hp().y : 0;
  client.T.I.hold(seat % 2 ? 'left' : 'right'); client.T.I.hold('down');
  await step(1.5);
  client.T.I.hold('right', false); client.T.I.hold('left', false); client.T.I.hold('down', false);
  const moved = !!hp() && Math.hypot(hp().x - x0, hp().y - y0) > 40, movedDetail = hp() ? Math.round(hp().x - x0) + ',' + Math.round(hp().y - y0) : 'no player for seat ' + seat;
  // a client taps shoot: the edge arrives once
  client.T.I.tap('shoot'); await step(2);
  // leaving
  let leaverCpu = false, hostLeftShown = false;
  if (o.leave) { const last = copies[copies.length - 1]; last.gone = true; for (const c of copies) if (!c.gone) c.hub._emit('leave', { id: last.me, reason: 'left' }); await step(.5); const p = H.players.find(q => q.slot === [0, 2, 1, 3][last.me]); leaverCpu = p && p.src.kind === 'cpu' && p.seat === undefined; }
  if (o.hostLeave) { host.gone = true; for (const c of copies) if (!c.gone) c.hub._emit('leave', { id: hostId, reason: 'left' }); await step(1.5); hostLeftShown = copies.filter(c => !c.gone).every(c => c.T.bb.NET.hostLeft); }
  await step(4);
  // time-up: the host finishes within the grace; then the end
  if (!o.hostLeave) { for (const c of copies) if (!c.gone) c.hub._emit('time-up', { graceMs: 5000 }); await step(1); }
  for (const c of copies) if (!c.gone) c.hub._emit('end', { reason: o.hostLeave ? 'host-left' : 'finished', standings: finish && finish.standings });
  await step(.5);
  for (const c of copies) for (const e of c.T.errors()) errors.push('copy ' + c.me + ': ' + e);
  const scores = copies.filter(c => !c.gone).map(c => c.T.bb.S.match && c.T.bb.S.match.score.join('-'));
  // the message rate: the most any copy sent within one second
  let maxRate = 0; for (const me of ids) { const t = sentLog.filter(s => s[0] === me).map(s => s[1]); for (let i = 0; i < t.length; i++) { let k = i; while (k < t.length && t[k] - t[i] < 1000) k++; maxRate = Math.max(maxRate, k - i); } }
  return { errors, moved, movedDetail, answered, leaverCpu, hostLeftShown, finish, scores, scoresAgree: new Set(scores).size === 1, maxRate, maxBytes: stats.maxBytes, sent: ids.map(i => stats.sent[i] || 0), received: ids.filter(i => !copies.find(c => c.me === i).gone || o.hostLeave).map(i => stats.received[i] || 0) };
}
