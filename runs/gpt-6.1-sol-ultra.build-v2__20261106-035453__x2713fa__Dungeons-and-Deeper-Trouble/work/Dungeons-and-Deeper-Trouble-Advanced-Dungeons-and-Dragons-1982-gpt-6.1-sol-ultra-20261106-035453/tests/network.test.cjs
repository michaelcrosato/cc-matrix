const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const folder = path.resolve(__dirname, '..');
const context = { performance: { now: () => 0 }, crypto: require('node:crypto').webcrypto, Uint32Array, TextEncoder, console, setTimeout, clearTimeout, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary') };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(folder, 'src/net/network.js'), 'utf8'), context);
const N = context.DTNet;
let count = 0;
const failures = [];
function check(name, fn) { try { fn(); count++; } catch (error) { failures.push(`${name}: ${error.stack}`); } }
function fixture(size = 0) {
  let t = 0;
  const applied = [], states = [], aPackets = [], bPackets = [];
  const a = new N.Link({ snapshot: () => ({ ticks: t, payload: 'x'.repeat(size) }), applyInput: (id, held, events) => applied.push({ id, held, events }) }, { mode: 'peer', authority: true, localId: 0, hostId: 0, playerIds: [0, 1], seed: 1, nonce: 'unit', clock: () => t, send: (p) => { aPackets.push(p); return true; } });
  const b = new N.Link({ restore: (s) => states.push(s) }, { mode: 'peer', authority: false, localId: 1, hostId: 0, playerIds: [0, 1], seed: 1, nonce: 'unit', clock: () => t, send: (p) => { bPackets.push(p); return true; } });
  b.bootstrapped = true;
  return { a, b, applied, states, aPackets, bPackets, time: (n) => { t = n; }, pump: () => { while (bPackets.length) a.receive(bPackets.shift(), 1); while (aPackets.length) b.receive(aPackets.shift(), 0); } };
}
check('held values are finite and bounded', () => {
  const h = N.safeHeld({ mx: Infinity, my: 5, ax: -9, ay: NaN, focus: 1, run: true });
  assert.equal(h.mx, 0); assert.equal(h.my, 1); assert.equal(h.ax, -1); assert.equal(h.ay, 0); assert.equal(h.focus, false); assert.equal(h.run, true);
});
check('unknown events and unbounded target are rejected', () => { assert.equal(N.safeEvent({ type: 'award-relic' }), null); assert.equal(N.safeEvent({ type: 'travel', target: 'x'.repeat(200) }).target, undefined); });
check('short pulse survives a lost send and duplicate delivery', () => {
  const f = fixture(); f.b.input({}, [{ type: 'fire' }]); f.b.update(); f.bPackets.length = 0;
  f.time(80); f.b.input({}, []); f.b.update(); assert.equal(f.bPackets[0].events.length, 1);
  const packet = f.bPackets[0]; f.a.receive(packet, 1); f.a.receive(packet, 1);
  assert.equal(f.applied.flatMap((x) => x.events).filter((x) => x.type === 'fire').length, 1);
  f.a.update(); f.pump(); assert.equal(f.b.events.length, 0); assert.equal(f.a.stats.duplicateActions, 2);
});
check('out of order actions wait for the gap and held never regresses', () => {
  const f = fixture(); const p = f.b.packet('i', { epoch: 'p', seq: 5, held: { mx: 1 }, events: [{ id: 2, type: 'fire' }] });
  f.a.receive(p, 1); assert.equal(f.applied.flatMap((x) => x.events).length, 0);
  f.a.receive({ ...p, seq: 4, held: { mx: -1 }, events: [{ id: 1, type: 'interact' }, { id: 2, type: 'fire' }] }, 1);
  assert.equal(f.applied.at(-1).held, null); assert.equal(f.applied.at(-1).events.length, 2);
});
check('epoch, nonce, version and spoofed authority are rejected', () => {
  const f = fixture(); f.a.receive(f.b.packet('i', { epoch: 'p', seq: 1, held: {}, events: [] }), 1);
  f.a.receive(f.b.packet('i', { epoch: 'old', seq: 2, held: {}, events: [{ id: 1, type: 'fire' }] }), 1);
  f.a.receive({ ...f.b.packet('i', {}), nonce: 'wrong' }, 1);
  f.a.receive({ ...f.b.packet('i', {}), dt: 99 }, 1);
  f.b.receive(f.a.packet('s', { state: {}, seq: 1 }), 7);
  assert.equal(f.applied.flatMap((x) => x.events).length, 0); assert.equal(f.a.stats.rejected, 3); assert.equal(f.b.stats.rejected, 1);
});
check('held timeout clears after each resumed heartbeat', () => {
  const f = fixture(); const p = f.b.packet('i', { epoch: 'p', seq: 1, held: { mx: 1 }, events: [] }); f.a.receive(p, 1);
  f.time(501); f.a.update(); assert.equal(f.applied.at(-1).held.mx, 0);
  f.time(600); f.a.receive({ ...p, seq: 2 }, 1); f.time(1101); f.a.update(); assert.equal(f.applied.at(-1).held.mx, 0);
  assert.equal(f.applied.length, 4);
});
check('large snapshots apply atomically and within hard packet size', () => {
  const f = fixture(28000); f.a.update(); assert.equal(f.aPackets.length, 1); f.pump(); assert.equal(f.states.length, 0);
  for (let t = 70; t < 300; t += 70) { f.time(t); f.a.update(); f.pump(); }
  assert.equal(f.states.length, 1); assert.equal(f.states[0].payload.length, 28000); assert.ok(f.a.stats.maxBytes <= 16000);
});
check('all game messages stay below 20 per rolling second', () => {
  const f = fixture(80000); for (let t = 0; t < 3100; t++) { f.time(t); f.a.update(); f.b.update(); f.pump(); }
  assert.ok(f.a.stats.maxRate <= 16); assert.ok(f.b.stats.maxRate <= 16); assert.ok(f.a.stats.maxBytes <= 16000);
});
check('last deliberate aim survives movement-only input samples', () => { const f = fixture(); f.a.input({ax:0,ay:-1},[]); f.a.input({mx:1},[]); assert.equal(f.applied.at(-1).held.ax,0); assert.equal(f.applied.at(-1).held.ay,-1); });
check('local authority actions have unique ids', () => { const f = fixture(); f.a.input({}, ['fire']); f.a.input({}, ['fire']); assert.equal(f.applied[0].events[0].id, 1); assert.equal(f.applied[1].events[0].id, 2); });
check('departing player input cannot block or mutate the world', () => { const f = fixture(); f.a.removePlayer(1); f.a.receive(f.b.packet('i', { epoch: 'p', seq: 1, held: {}, events: [{ id: 1, type: 'interact' }] }), 1); assert.equal(f.applied.length, 0); assert.equal(f.a.playerIds.length, 1); });
check('dedicated server owns no local ranger and finishes once with active tie', () => {
  let finishCount = 0, outcome; context.AIHub = { time: () => 0, finish: (x) => { finishCount++; outcome = x; } };
  const l = new N.Link({}, { mode: 'hub', authority: true, dedicated: true, localId: 2, hostId: 2, playerIds: [0, 1], seed: 1, nonce: 'h', send: () => true }); l.started = true;
  assert.equal(l.localId, null); assert.equal(l.canStep(), true); l.removePlayer(1); l.finish(true, { Arrows: 3 }); l.finish(false); assert.equal(finishCount, 1); assert.equal(outcome.standings[0].join(','), '0');
});
check('Hub countdown consumes discrete input and end stops sends', () => {
  context.AIHub = { time: () => -1000 }; const f = fixture(); f.b.mode = 'hub'; f.b.started = true; f.b.input({}, ['fire']); assert.equal(f.b.events.length, 0); f.b.stop('end'); f.b.update(); assert.equal(f.b.stats.sent, 0);
});
check('signals reject malformed, wrong role and expired invitations', () => {
  const signal = { v: 1, c: N.CONTENT, role: 'host', nonce: 'a', at: Date.now(), desc: { type: 'offer', sdp: 'v=0\r\n' } }; const good = N.encodeSignal(signal);
  assert.equal(N.decodeSignal(good, 'host').nonce, 'a'); assert.throws(() => N.decodeSignal('DT1.!', 'host')); assert.throws(() => N.decodeSignal(good, 'guest')); assert.throws(() => N.decodeSignal(N.encodeSignal({ ...signal, at: 1 }), 'host'));
});
check('Hub client and harness support are byte-for-byte upstream files', () => {
  for (const filename of ['session.js', 'harness.html', 'bridge.js', 'round.js']) assert.ok(fs.readFileSync(path.join(folder, 'vendor/hub', filename)).equals(fs.readFileSync(path.join(folder, 'vendor/hub-repo/lib/hub', filename))));
});
if (failures.length) { for (const f of failures) console.error(f); process.exitCode = 1; }
console.log(`Network protocol: ${count} passed, ${failures.length} failed.`);
