import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let clock = 0;
const ctx = { console, TextEncoder, performance: { now: () => clock } }; vm.createContext(ctx);
for (const f of ['content', 'sim', 'session']) vm.runInContext(fs.readFileSync(new URL('../src/' + f + '.js', import.meta.url), 'utf8'), ctx, { filename: f });
const A = ctx.ABJ, failures = [], evidence = []; let count = 0;
function test(name, fn) { count++; try { fn(); } catch (e) { failures.push({ name, error: e.stack }); } }
function pair(server = false) {
  clock = 0; const queue = [], finishes = [], players = [{ id: 4, name: '<b>A</b>' }, { id: 9, name: 'B' }];
  const info = id => ({ isHost: id === (server ? 99 : 4), host: server ? 99 : 4, server: server && id === 99, me: id, players });
  const sessions = {};
  const make = id => {
    const handlers = {};
    const hub = { time: () => clock, rng: () => () => .4812, ready: () => {}, on: (k, fn) => { handlers[k] = fn; }, send: (data, options) => { queue.push({ data: JSON.parse(JSON.stringify(data)), from: id, options }); return true; }, finish: r => finishes.push(r) };
    const session = new A.Session(hub, info(id), () => {}, () => {}); sessions[id] = session;
    return { session, emit: (k, v) => handlers[k](v) };
  };
  const host = make(server ? 99 : 4), guest = make(9); host.emit('start'); guest.emit('start');
  const pump = () => { for (const msg of queue.splice(0)) for (const [id, q] of Object.entries(sessions)) if (+id !== msg.from && (msg.options.to === undefined || +id === msg.options.to)) q.receive(msg.data, msg.from); };
  return { host, guest, pump, queue, finishes, tick(n = 120) { for (let i = 0; i < n; i++) { clock += 1000 / 120; guest.session.update(); pump(); host.session.update(); pump(); } } };
}
test('Complete reliable snapshot round trip preserves every world field', () => {
  const q = new A.Sim({ players: [4, 9] }); for (let i = 0; i < 1500; i++) q.step({ 4: { fire: true }, 9: { fire: true, move: i % 500 < 250 ? 1 : -1 } });
  const packed = A.pack(q.s), out = A.unpack(packed);
  const expected = q.snapshot(); expected.events = expected.events.slice(-12);
  for (const b of expected.shots) { b.x = +b.x.toFixed(3); b.y = +b.y.toFixed(3); }
  for (const p of expected.pickups) { p.x = +p.x.toFixed(3); p.y = +p.y.toFixed(3); }
  assert.equal(JSON.stringify(out), JSON.stringify(expected)); assert(JSON.stringify(packed).length < 16000);
});
test('Host ticks follow the shared clock, guest never independently advances', () => {
  const p = pair(); p.tick(); assert(p.host.session.state.tick >= 119); const t = p.guest.session.state.tick;
  clock += 900; p.guest.session.update(); assert.equal(p.guest.session.state.tick, t); p.host.session.update(); assert(p.host.session.state.tick >= 227);
});
test('Sender identity, packet sequence, bounds and finite values are validated', () => {
  const p = pair(), h = p.host.session; const valid = { t: 'i', q: 2, r: 0, m: .5, f: true };
  h.receive(valid, 9); assert.equal(h.inputs.get(9).move, .5);
  h.receive({ ...valid, q: 1, m: -1 }, 9); h.receive({ ...valid, q: 3, m: Infinity }, 9); h.receive({ ...valid, q: 3, m: 2 }, 9); h.receive({ ...valid, q: 3, player: 9 }, 666);
  assert.equal(h.inputs.get(9).move, .5); assert.equal(h.debug.rejected, 4);
});
test('Remote repair edge is acknowledged once even in repeated heartbeats', () => {
  const p = pair(), h = p.host.session, g = p.guest.session; h.sim.s.bunkers[2].rows.fill(0); h.sim.s.ships[1].x = 294; h.sim.s.ships[1].charges = 3;
  g.localCommand({ move: 0, fire: false, repair: true }); p.tick(120);
  assert.equal(h.sim.s.ships[1].repairs, 1); assert.equal(h.sim.s.ships[1].charges, 2); assert.equal(g.ack[9], 1);
  assert.equal(JSON.stringify(g.state.bunkers), JSON.stringify(h.state.bunkers));
  g.localCommand({ move: 0, fire: false, repair: false }); p.tick(20); g.localCommand({ move: 0, fire: false, repair: true }); p.tick(120); assert.equal(h.sim.s.ships[1].repairs, 2);
});
test('Stale remote held input neutralizes and later heartbeat recovers', () => {
  const p = pair(), h = p.host.session;
  h.receive({ t: 'i', q: 1, r: 0, m: 1, f: true }, 9); assert.equal(h.commands()[9].move, 1);
  clock += 700; assert.equal(h.commands()[9].move, 0); h.receive({ t: 'i', q: 2, r: 0, m: -1, f: false }, 9); assert.equal(h.commands()[9].move, -1);
});
test('Authoritative death, reserve debit and protected respawn agree remotely', () => {
  const p = pair(), h = p.host.session, g = p.guest.session;
  const ship = h.sim.s.ships[1]; ship.shield = 0; h.sim.killShip(ship); p.tick(24);
  assert.equal(g.state.ships[1].active, false); assert.equal(g.state.reserve, h.state.reserve); assert.equal(g.state.ships[1].deaths, 1);
  p.tick(150); assert(g.state.ships[1].active); assert(g.state.ships[1].shield > 0); assert.equal(g.state.reserve, 3);
});
test('Local overlay neutral commands do not stop host world or heartbeats', () => {
  const p = pair(); p.host.session.localCommand(A.NEUTRAL); p.guest.session.localCommand(A.NEUTRAL); p.tick(240);
  assert(p.host.session.state.tick >= 239); assert(p.host.session.debug.sent >= 18); assert(p.guest.session.debug.sent >= 18);
});
test('Server-only host supports roster without a local ship and finishes a team tie', () => {
  const p = pair(true); p.tick(120); assert(!p.host.session.state.ships.some(s => s.id === 99));
  p.host.emit('time-up', { graceMs: 2000 }); assert.equal(p.finishes.length, 1); assert.equal(JSON.stringify(p.finishes[0].standings), '[[4,9]]'); assert.equal(p.finishes[0].won, false);
  p.host.emit('time-up', {}); assert.equal(p.finishes.length, 1);
});
test('A nonhost departure removes controls and ship without awarding resources', () => {
  const p = pair(), h = p.host.session; const reserve = h.state.reserve; p.host.emit('leave', { id: 9 }); assert(h.state.ships[1].gone); assert.equal(h.state.reserve, reserve);
  h.receive({ t: 'i', q: 5, r: 0, m: 1, f: true }, 9); assert(!h.inputs.has(9));
});
test('Every end reason stops input, simulation and outgoing traffic immediately', () => {
  for (const reason of ['finished', 'void', 'host-left', 'sat-out', 'session-ended']) {
    const p = pair(), h = p.host.session; p.tick(30); p.host.emit('end', { reason }); const tick = h.state.tick, sent = h.debug.sent; clock += 5000; h.localCommand({ fire: true, move: 1 }); h.update(); assert.equal(h.state.tick, tick); assert.equal(h.debug.sent, sent); assert.equal(h.debug.terminal, reason);
  }
});
fs.writeFileSync(new URL('../evidence/session-tests.json', import.meta.url), JSON.stringify({ count, failures, evidence }, null, 2));
for (const f of failures) console.error('FAIL ' + f.name + ': ' + f.error);
console.log(JSON.stringify({ suite: 'session', count, failed: failures.length })); process.exitCode = failures.length ? 1 : 0;
