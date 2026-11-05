// hub-unit: the NetDriver against a fake AIHub, a host and a client in two contexts on one message bus
import { suite, boot, ok, eq } from './lib.mjs';

function fakeHub(bus, me, players, host) {
  const handlers = {}, H = {
    active: true, me, players, host, isHost: me === host, server: false, seed: 77, round: 1,
    connect: async () => ({ me, players, host, isHost: me === host, server: false, mode: 'shared-world', seed: 77 }),
    ready() { H.readied = true; }, on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; },
    send(data, o = {}) { bus.sent.push({ from: me, to: o.to, data: JSON.parse(JSON.stringify(data)) }); bus.count[me] = (bus.count[me] || 0) + 1; return true; },
    time: () => bus.clock, rng: label => { let a = 12345 + label.length; return () => { a = (a * 1103515245 + 12345) >>> 0; return a / 4294967296; }; },
    finish(r) { bus.finished = r; }, fail(m) { bus.failed = m; },
    _emit(ev, ...args) { for (const f of handlers[ev] || []) f(...args); }
  };
  return H;
}
async function pair() {
  const bus = { sent: [], clock: -3000, count: {}, intervals: [] }, players = [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }];
  const mk = async me => {
    const hub = fakeHub(bus, me, players, 0);
    const h = await boot('#', { before: ctx => { ctx.AIHub = hub; ctx.setInterval = fn => { bus.intervals.push({ me, fn }); return bus.intervals.length; }; ctx.clearInterval = () => {}; ctx.setTimeout = fn => { let done = false; bus.intervals.push({ me, fn: () => { if (!done) { done = true; fn(); } } }); return 0; }; ctx.performance = { now: () => bus.clock + 1e6 }; } });
    return Object.assign(h, { hub });
  };
  const A = await mk(0), Bc = await mk(1);
  const deliver = () => { const q = bus.sent.splice(0).filter(m => { if (bus.dropEv && m.from === 0 && m.data.t === 'ev') { bus.dropEv = false; return false; } return true; }); for (const m of q) for (const x of [A, Bc]) if (x.hub.me !== m.from && (m.to === undefined || m.to === x.hub.me)) x.hub._emit('message', m.data, m.from); };
  const tick = (s = .2) => { for (const x of [A, Bc]) x.game.advance(s); for (const it of bus.intervals) it.fn(); deliver(); bus.clock += s * 1000; };
  return { bus, A, B: Bc, tick, deliver };
}
suite('hub-unit', async t => {
  const { bus, A, B, tick } = await pair();
  await t('both copies connect, build the same battle, and ready up with no key', async () => { for (let i = 0; i < 10; i++) tick(.1); eq(A.game.sceneName, 'battle'); eq(B.game.sceneName, 'battle'); ok(A.hub.readied && B.hub.readied, 'ready'); eq(A.G.hub.sim.hash(), B.G.hub.sim.hash(), 'same start'); });
  await t('the countdown holds play until AIHub.time() reaches 0', () => { const n = A.G.hub.sim.s.n; tick(.5); eq(A.G.hub.sim.s.n, n, 'nothing yet'); while (bus.clock < 0) tick(.2); ok(true); });
  await t('a deadline hands the troop to the AI; its commands reach the client in order', () => { for (let i = 0; i < 200; i++) tick(.25); ok(A.G.hub.sim.s.n > 5, 'the host played'); eq(B.G.hub.n, A.G.hub.n, 'the client applied every command'); eq(B.G.hub.sim.hash(), A.G.hub.sim.hash(), 'in sync'); });
  await t('traffic flows both ways (cursors and commands)', () => { ok(bus.count[0] > 0 && bus.count[1] > 0, JSON.stringify(bus.count)); });
  await t('a lost message: the gap asks for a snapshot and the copies agree again', () => {
    bus.dropEv = true; let asked = false;
    for (let i = 0; i < 80; i++) { tick(.25); if (bus.sent.some(m => m.from === 1 && m.data.t === 'need')) asked = true; if (!bus.dropEv && asked && B.G.hub.n === A.G.hub.n) break; }
    ok(!bus.dropEv, 'a message was dropped'); for (let i = 0; i < 12; i++) tick(.1);
    eq(B.G.hub.n, A.G.hub.n); eq(B.G.hub.sim.hash(), A.G.hub.sim.hash(), 'in sync again');
  });
  await t('an illegal command is ignored and answered with a snapshot', () => { const n = A.G.hub.n; A.G.hub.receive({ t: 'cmd', seq: 1, cmd: { t: 'act', u: 'nobody', a: 'attack', at: [0, 0] } }, 1); eq(A.G.hub.n, n, 'not applied'); ok(bus.sent.some(m => m.from === 0 && m.to === 1 && m.data.t === 'snap'), 'snap'); tick(.1); });
  await t('time-up: the host finishes with standings by glory', () => { A.hub._emit('time-up', { graceMs: 5000 }); ok(bus.finished && Array.isArray(bus.finished.standings) && bus.finished.standings.flat().length === 2, JSON.stringify(bus.finished)); ok(bus.finished.scores && bus.finished.awards, 'scores and awards'); });
  await t('end: input and sound stop; the standings show', () => { for (const x of [A, B]) x.hub._emit('end', { reason: 'finished', standings: bus.finished.standings }); tick(.5); tick(.5); eq(A.game.sceneName, 'hubOver'); eq(B.game.sceneName, 'hubOver'); ok(A.G.muteAll, 'muted'); });
  await t('no errors on either copy', () => { eq(A.errors().length + B.errors().length, 0, A.errors().concat(B.errors()).slice(0, 3).join(' | ')); });
});
