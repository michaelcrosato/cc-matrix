// T-hub-mock: N copies of the game in node:vm contexts, a mock AIHub and an in-memory bus (latency, jitter, loss).
import { load } from './lib.mjs';
export async function hubMock(o = {}) {
  const n = o.players || 3, server = !!o.server, lat = o.latency || 150, jit = o.jitter || 50, loss = o.loss || .05;
  const fails = [], check = (what, ok, d = '') => { if (!ok) fails.push(what + (d ? ': ' + d : '')); };
  let clock = 0; const queue = [], stats = [], copies = [];
  const ids = server ? [...Array(n).keys()] : [...Array(n).keys()];
  const hostId = server ? 99 : 0;
  const players = ids.map(i => ({ id: i, name: 'P' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  const seats = server ? [99, ...ids] : ids;
  let seed = 4242, rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const me of seats) {
    const handlers = {}, st = { sent: [], finish: 0, ended: false, ready: false };
    stats.push(st);
    const H = {
      active: true, version: 'mock', me, host: hostId, isHost: me === hostId, server: server && me === hostId, players: players.slice(), mode: 'shared-world', seed: 777, limitMs: o.limitMs || 60000, round: 1,
      connect: () => Promise.resolve({ me, host: hostId, isHost: me === hostId, server: server && me === hostId, players: players.slice(), mode: 'shared-world', seed: 777, limitMs: o.limitMs || 60000, round: 1 }),
      ready() { st.ready = true; }, answer() {},
      time() { return H._start === undefined ? -Infinity : clock - H._start; },
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; },
      send(data, opt = {}) { const s = JSON.stringify(data); st.sent.push({ t: clock, size: s.length, reliable: opt.reliable !== false }); for (const c of copies) { if (c.me === me || c.gone) continue; if (opt.reliable === false && rnd() < loss) continue; queue.push({ at: clock + lat + rnd() * jit, to: c, data: JSON.parse(s), from: me }); } return true; },
      rng(label) { let h = 2166136261; for (const ch of String(label)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } let x = (777 ^ h) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; },
      finish(f) { st.finish++; st.result = f; }, progress() {}, result() {}, fail() {},
      _emit(ev, ...a) { for (const f of handlers[ev] || []) f(...a); }
    };
    const L = load({ window: { AIHub: H } });
    copies.push({ me, H, game: L.game, WP: L.WP, st, gone: false });
  }
  await new Promise(r => setTimeout(r, 0));
  for (const c of copies) c.game.advance(.1);
  check('every copy calls ready()', stats.every(s => s.ready));
  for (const c of copies) c.H._emit('card', { left: 5000, ready: [], paused: false });
  const startAt = 500; for (const c of copies) { c.H._start = startAt + 3000; c.H._emit('start', { in: 3000 }); }
  // clients play with the bot; the host's own player too
  const step = 1 / 120;
  const run = secs => { for (let i = 0; i < secs * 120; i++) { clock += step * 1000; for (let q = queue.length - 1; q >= 0; q--) if (queue[q].at <= clock) { const m = queue.splice(q, 1)[0]; if (!m.to.gone && !m.to.H._ended) m.to.H._emit('message', m.data, m.from); } for (const c of copies) if (!c.gone) { c.game.advance(step); const sm = c.WP.Flow.sim; if (sm && !c.H.isHost) c.maxNet = Math.max(c.maxNet || 0, sm.ents.filter(e => e.net && !e.dead).length); } } };
  run(4);
  for (const c of copies) { const WP = c.WP; if (c.H.isHost && server) continue; const b = WP.Bot.make({ seed: c.me + 1 }); WP.Input.override(c.me, (w, p, dt) => WP.Bot.frame(b, w, p, dt)); }
  run(o.seconds || 25);
  const host = copies.find(c => c.H.isHost), hs = host.WP.Flow.sim;
  check('the host plays the op', host.game.sceneName === 'play' && hs && hs.t > 5, host.game.sceneName);
  for (const c of copies) if (!c.H.isHost) { const s = c.WP.Flow.sim; check('client ' + c.me + ' sees the host\'s world', s && c.maxNet > 3 && c.WP.Net.state.snapN > 50, s ? c.maxNet + ' ents at most, ' + c.WP.Net.state.snapN + ' snaps' : 'no sim'); }
  const remote = hs.players.filter(p => p.pid !== host.me);
  check('client hits count on the host', remote.some(p => p.kills > 0 || p.hits > 0), JSON.stringify(remote.map(p => [p.pid, p.kills, p.hits, p.shots])));
  check('server mode: no local player', !server || !host.WP.ctx.locals[host.me]);
  for (const s of stats) { const unrel = s.sent.filter(m => !m.reliable); check('unreliable messages under 1100 bytes', unrel.every(m => m.size < 1100), Math.max(0, ...unrel.map(m => m.size)) + ' bytes'); const span = (clock - startAt) / 1000; let worst = 0; for (let t = 0; t < clock; t += 1000) worst = Math.max(worst, s.sent.filter(m => m.t >= t && m.t < t + 1000).length); check('at most 18 messages a second', worst <= 18, worst + '/s'); void span; }
  // a leave removes a slot
  const leaver = copies.find(c => !c.H.isHost); if (leaver && n > 1) { leaver.gone = true; for (const c of copies) if (!c.gone) c.H._emit('leave', { id: leaver.me, reason: 'left' }); run(1); check('a leave removes the slot', hs.players.find(p => p.pid === leaver.me).gone); }
  // time-up: exactly one finish, from the host
  for (const c of copies) if (!c.gone) c.H._emit('time-up', { graceMs: 3000 }); run(1);
  check('time-up: one finish from the host', host.st.finish === 1 && copies.filter(c => !c.H.isHost).every(c => c.st.finish === 0), stats.map(s => s.finish).join(','));
  check('the finish lists standings', host.st.result && Array.isArray(host.st.result.standings) && host.st.result.standings.flat().length >= 1, JSON.stringify(host.st.result && host.st.result.standings));
  for (const c of copies) if (!c.gone) { c.H._ended = true; c.H._emit('end', { reason: 'finished' }); }
  const before = stats.map(s => s.sent.length); run(1);
  check('after end: nothing sent', stats.every((s, i) => s.sent.length === before[i]));
  for (const c of copies) check('no errors in copy ' + c.me, !c.game.errors.length, c.game.errors.map(e => e.message).slice(0, 2).join(' | '));
  return fails;
}
if (process.argv[1] && process.argv[1].endsWith('hub-mock.mjs')) {
  for (const o of [{ players: 3 }, { players: 2, server: true }]) { const f = await hubMock(o); for (const x of f) console.log('FAIL', JSON.stringify(o), x); console.log(JSON.stringify(o), f.length ? 'FAIL' : 'ok'); }
}
