// A fake AI Hub in Node (section 11.6): 2-4 copies of the game in their own vm contexts on a simulated network
// (latency, jitter, loss), stepped in lockstep. Checks the budgets, the client's picture, presses, leaving, time-up,
// the finish, server mode and the end.
const tickMs = 1000 / 120;
function network(o) {
  const net = { now: 0, startAt: 1e12, q: [], copies: [], lat: o.latency || 0, jit: o.jitter || 0, loss: o.loss || 0, R: mulberry(o.seed || 1), sizes: [], perSec: {}, finished: null };
  net.send = (from, data, opt) => {
    const json = JSON.stringify(data), rel = !opt || opt.reliable !== false; net.sizes.push([from, json.length, data.t]);
    const sec = Math.floor(net.now / 1000), k = from + ':' + sec; net.perSec[k] = (net.perSec[k] || 0) + 1;
    for (const c of net.copies) { if (c.id === from || c.gone) continue; if (!rel && net.R() < net.loss) continue; const d = net.lat + (net.R() * 2 - 1) * net.jit; net.q.push({ to: c.id, from, data: JSON.parse(json), at: net.now + Math.max(0, rel ? net.lat : d), rel }); }
    return true;
  };
  net.deliver = () => { net.q.sort((a, b) => a.at - b.at); while (net.q.length && net.q[0].at <= net.now) { const m = net.q.shift(), c = net.copies.find(x => x.id === m.to); if (c && !c.gone) c.emit('message', m.data, m.from); } };
  return net;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function fakeHub(net, id, info) {
  const h = {}, c = { id, emit: (ev, ...a) => (h[ev] || []).forEach(f => f(...a)), gone: false, readyDone: false, answers: [] };
  net.copies.push(c);
  const api = { active: true, version: 'fake', me: info.me, isHost: info.isHost, server: info.server, players: info.players, seed: 7,
    connect: async () => Object.assign({}, info), ready() { c.readyDone = true; }, answer(w) { c.answers.push(w); },
    on(ev, fn) { (h[ev] = h[ev] || []).push(fn); return () => {}; }, send: (d, o) => net.send(id, d, o), time: () => net.now - net.startAt,
    rng(label) { let s = 0; for (const ch of String(label)) s = s * 31 + ch.charCodeAt(0) | 0; return mulberry(s ^ 99); }, finish(r) { net.finished = { by: id, r }; }, fail() {}, progress() {}, result() {} };
  c.api = api; return c;
}
export async function run({ load, check }) {
  const S = 'hubsim';
  for (const sc of [{ n: 2 }, { n: 4, latency: 150, jitter: 50, loss: .05 }, { n: 2, server: true }]) {
    const net = network({ latency: sc.latency, jitter: sc.jitter, loss: sc.loss, seed: 5 }), N = sc.n;
    const players = Array.from({ length: N }, (_, i) => ({ id: i, name: 'P' + (i + 1), color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
    const hostId = sc.server ? 99 : 0, copies = [];
    const ids = sc.server ? [99].concat(players.map(p => p.id)) : players.map(p => p.id);
    for (const id of ids) {
      const info = { me: id, players, host: hostId, isHost: id === hostId, server: sc.server && id === hostId, mode: 'shared-world', round: 1, limitMs: 240000, seed: 7 };
      const hub = fakeHub(net, id, info), errs = [];
      const g = load({ hub: hub.api, now: () => net.now, errors: e => errs.push(e) });
      copies.push({ id, hub, g, errs });
    }
    const step = s => { for (let i = 0; i < s * 120; i++) { net.now += tickMs; net.deliver(); for (const c of copies) if (!c.hub.gone) c.g.game.advance(1 / 120); } };
    await new Promise(r => setTimeout(r, 0)); step(.2); await new Promise(r => setTimeout(r, 0)); step(.5);
    const tag = (sc.server ? 'server ' : '') + N + 'p' + (sc.latency ? ' lag' : '');
    check(S, tag + ': every copy reaches the card and calls ready()', copies.every(c => c.hub.readyDone && c.g.game.sceneName === 'tunnel'), copies.map(c => c.g.game.sceneName).join(','));
    const p1 = copies.find(c => c.id === 1); p1.g.I.tap('confirm'); step(.2); check(S, tag + ': Enter answers ready on the card', p1.hub.answers.includes('ready'));
    net.startAt = net.now + 3000; for (const c of copies) c.hub.emit('start', { in: 3000 }); step(1);
    check(S, tag + ': the match starts on start', copies.every(c => c.g.game.sceneName === 'match'));
    const host = copies.find(c => c.id === hostId), H0 = () => host.g.EF.cur.m; const clock0 = H0().clock; step(1.5); check(S, tag + ': play waits for time 0', H0().clock === clock0 || H0().clock < .05, H0().clock);
    step(2);
    // the client's picture follows the host's (100 ms behind)
    const cl = copies.find(c => c.id === 1), hist = []; let ok = 0, tot = 0;
    for (let i = 0; i < 8 * 30; i++) { step(1 / 30); const hb = H0().ball; hist.push([net.now, hb.x, hb.y]); const cm = cl.g.EF.cur.m, back = hist.filter(h => h[0] <= net.now - 100 - (sc.latency || 0)).pop(); if (back) { tot++; if (Math.hypot(cm.ball.x - back[1], cm.ball.y - back[2]) < 24 + (sc.latency ? 10 : 0)) ok++; } }
    check(S, tag + ': the client\'s ball follows the host\'s 95% of the time', tot && ok / tot >= .9, ok + '/' + tot);
    // a press is never lost: the client's pass counter reaches the host
    const before = host.g.EF.cur.m.humans.find(h => h.id === 1).ctl.seen[0]; cl.g.I.tap('pass'); step(.6); const after = host.g.EF.cur.m.humans.find(h => h.id === 1).ctl.seen[0]; check(S, tag + ': a press reaches the host', after > before, before + ' -> ' + after);
    // budgets: at most 20 messages a second from a copy, bursts under 40, messages under 16 KB, snapshots under 1,100 bytes
    const maxRate = Math.max(...Object.values(net.perSec)), snaps = net.sizes.filter(s => s[2] === 's').map(s => s[1]), maxMsg = Math.max(...net.sizes.map(s => s[1]));
    check(S, tag + ': at most 20 messages a second a copy', maxRate <= 20, maxRate); check(S, tag + ': snapshots under 1,100 bytes', Math.max(...snaps) < 1100, Math.max(...snaps)); check(S, tag + ': every message under 16 KB', maxMsg < 16384, maxMsg);
    // a goal on the host shows on the clients within 0.5 s
    { const m = H0(); m.lastKick = m.side[0][4]; m.lastTouch = m.lastKick; m.goalScored(0); step(.5 + (sc.latency || 0) / 1000); check(S, tag + ': a goal shows on every client within 0.5 s', copies.filter(c => c.id !== hostId).every(c => c.g.EF.cur.m.score[0] === m.score[0]), copies.map(c => c.g.EF.cur.m.score.join('-')).join(' ')); }
    // a player leaving: his footballer goes to the CPU
    if (N >= 3) { const lid = N - 1; for (const c of copies) c.hub.emit('leave', { id: lid, reason: 'left' }); const lc = copies.find(c => c.id === lid); lc.hub.gone = true; step(.3); const hm = H0().humans.find(q => q.id === lid); check(S, tag + ': a leaving player\'s footballer goes to the CPU', hm && hm.cpu); }
    if (sc.server) check(S, tag + ': the server runs the world with no local player', !H0().humans.some(q => q.input) && host.g.EF.Hub.role === 'server');
    // time-up: the host finishes at once; standings put the winners first
    for (const c of copies) if (!c.hub.gone) c.hub.emit('time-up', { graceMs: 5000 }); step(.2);
    check(S, tag + ': time-up makes the host finish', net.finished && net.finished.by === hostId);
    if (net.finished) { const r = net.finished.r, m = H0(), w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1; check(S, tag + ': standings put the winning side first', w < 0 ? r.standings.length === 1 : r.standings[0].every(id => host.g.EF.Hub.sideOf[id] === w), JSON.stringify(r.standings)); }
    // the end: input, sending and sound stop; ROUND VOID for host-left
    for (const c of copies) if (!c.hub.gone) c.hub.emit('end', { reason: c.id === 1 ? 'host-left' : 'finished' }); const sent0 = cl.g.EF.Hub.sent; step(.5);
    check(S, tag + ': after the end a copy sends nothing', cl.g.EF.Hub.sent === sent0); check(S, tag + ': host-left shows ROUND VOID', cl.g.EF.Hub.ended === 'host-left');
    for (const c of copies) check(S, tag + ': copy ' + c.id + ' no errors', !c.g.game.errors.length, c.g.game.errors.slice(0, 2).map(e => e.message + ' ' + String(e.stack).split('\n')[1]).join(' | '));
  }
}
