// net suite: a FakeHub in Node (latency, jitter, loss on unreliable messages): 1, 2 and 4 players, a server-hosted
// round, host leave, time-up -> finish; rates and sizes; replicas run the same world as the host (hashes per step)
function makeBus(o) {
  let seed = o.seed || 1; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  return { t: -500, q: [], last: {}, lat: o.lat || 0, jit: o.jit || 0, loss: o.loss || 0, copies: [], R,
    post(from, data, rel, to) { const json = JSON.stringify(data), size = json.length; for (const c of this.copies) { if (c.id === from || (to !== undefined && c.id !== to) || c.gone) continue; if (!rel && R() < this.loss) continue; let at = this.t + this.lat + R() * this.jit; if (rel) { const k = from + '>' + c.id; at = Math.max(at, (this.last[k] || 0) + .01); this.last[k] = at; } this.q.push({ at, to: c, from, data: JSON.parse(json) }); } return size; },
    step(dt) { this.t += dt * 1000; this.q.sort((a, b) => a.at - b.at); while (this.q.length && this.q[0].at <= this.t) { const m = this.q.shift(); if (!m.to.gone) m.to.hub.emit('message', m.data, m.from); } } };
}
function makeHub(bus, id) {
  const h = { id, handlers: {}, sent: [], finished: null, readyCalled: false,
    on(ev, fn) { (this.handlers[ev] || (this.handlers[ev] = [])).push(fn); return () => {}; },
    emit(ev, ...a) { for (const f of this.handlers[ev] || []) f(...a); },
    send(data, o = {}) { const rel = o.reliable !== false, size = bus.post(id, data, rel, o.to); this.sent.push({ t: bus.t, size, rel, kind: data.t }); return true; },
    time() { return bus.t }, finish(r) { if (!this.finished) this.finished = r; }, ready() { this.readyCalled = true; }, answer() {} };
  return h;
}
function round(t, o) {
  const bus = makeBus(o), n = o.players, ids = [...Array(n).keys()], copies = [];
  const info0 = { players: ids.map(i => ({ id: i, name: 'Agent' + i, color: '#ffffff' })), host: o.server ? 99 : 0, round: o.round || 1, seed: 4242, mode: 'shared-world' };
  const all = o.server ? [99, ...ids] : ids;
  for (const id of all) {
    const { TC } = t.load(), info = Object.assign({}, info0, { me: id, isHost: id === info0.host, server: o.server && id === 99 });
    const stage = ((info.round - 1) % 3) + 1, sim = new TC.Sim({ mode: 'host', stage, seed: info.seed, players: info.players.map(p => ({ name: p.name })), skipIntro: true });
    info.players.forEach((p, i) => { sim.players[i].remote = !(p.id === info.host && !info.server); });
    const hub = makeHub(bus, id), net = new TC.Net(hub, info), bot = new TC.Autopilot('fair'), P = { sim, localCmd: (i, dt) => bot.command(sim, i, dt) };
    TC.play = P; const c = { id, TC, sim, hub, net, P, hashes: new Map(), gone: false }; copies.push(c); bus.copies.push(c);
  }
  return { bus, copies };
}
function run(R, secs, stopHostAt) {
  const { bus, copies } = R;
  for (let i = 0; i < secs * 120; i++) {
    bus.step(1 / 120);
    for (const c of copies) {
      if (c.gone) continue;
      if (stopHostAt !== undefined && c.net.isHost && i >= stopHostAt * 120) continue;
      c.TC.play = c.P; c.net.update(1 / 120, c.P);
      const k = c.net.isHost ? c.net.k : c.net.next; if (k % 120 === 0 && k > 0 && !c.hashes.has(k)) c.hashes.set(k, c.sim.hash());
    }
  }
}
export default {
  net(t) {
    for (const o of [{ players: 1 }, { players: 2, lat: 40 }, { players: 4, lat: 150, jit: 50, loss: .05 }, { players: 2, server: true, lat: 60, jit: 20, loss: .02 }]) {
      const label = o.players + 'p' + (o.server ? ' server' : '') + (o.lat ? ' lat' + o.lat : '');
      const R = round(t, o); run(R, 16); const host = R.copies.find(c => c.net.isHost), reps = R.copies.filter(c => !c.net.isHost);
      t.check(label + ': the host plays the round', host.sim.t > 10 && host.sim.phase !== 'gameover', host.sim.t);
      for (const c of reps) {
        let same = 0, diff = 0; for (const [k, h] of c.hashes) { if (!host.hashes.has(k)) continue; if (host.hashes.get(k) === h) same++; else diff++; }
        t.check(label + ': replica ' + c.id + ' runs the same world', same >= 5 && diff === 0, same + ' same, ' + diff + ' differ');
        t.check(label + ': replica ' + c.id + ' scores match', c.sim.players.every((p, i) => p.score === host.sim.players[i].score || Math.abs(p.score - host.sim.players[i].score) < 1));
      }
      for (const c of R.copies) {
        const per = {}; for (const m of c.hub.sent) { const s = Math.floor(m.t / 1000); per[s] = (per[s] || 0) + 1; }
        t.check(label + ': copy ' + c.id + ' sends at most 20 a second', Object.values(per).every(v => v <= 20), Math.max(0, ...Object.values(per)));
        t.check(label + ': unreliable messages under 1,200 bytes', c.hub.sent.filter(m => !m.rel).every(m => m.size <= 1200));
        t.check(label + ': reliable messages under 16 KB', c.hub.sent.filter(m => m.rel).every(m => m.size <= 16000));
      }
      if (o.players > 1) t.check(label + ': traffic both ways', host.hub.sent.length > 0 && reps.some(c => c.hub.sent.length > 0));
      // time-up: the host finishes at once with valid standings
      host.hub.emit('time-up', { graceMs: 3000 }); const fin = host.hub.finished;
      t.check(label + ': time-up -> finish', !!fin && Array.isArray(fin.standings) && fin.standings.flat().length === o.players && fin.standings.flat().every(id => typeof id === 'number'));
      t.check(label + ': finish has scores, stats and awards', fin && Object.keys(fin.scores).length === o.players && Object.keys(fin.stats).length === o.players && fin.awards.length === 3);
      for (const c of R.copies) { c.hub.emit('end', { reason: 'finished' }); t.check(label + ': copy ' + c.id + ' stops on end', c.net.ended); }
    }
    // a player leaving, then the host leaving
    const R = round(t, { players: 3, lat: 50 }); run(R, 4);
    const host = R.copies.find(c => c.net.isHost); R.copies[2].gone = true; host.hub.emit('leave', { id: 2, reason: 'left' }); run(R, 3);
    t.check('a player leaving: their agent is gone everywhere', !host.sim.players[2].present && !R.copies[1].sim.players[2].present);
    host.gone = true; for (const c of R.copies) if (!c.gone) { c.hub.emit('leave', { id: 0, reason: 'left' }); c.hub.emit('end', { reason: 'host-left' }); }
    t.check('the host leaving: the round ends void on the replicas', R.copies[1].net.ended && R.copies[1].net.endReason === 'host-left');
  }
};
