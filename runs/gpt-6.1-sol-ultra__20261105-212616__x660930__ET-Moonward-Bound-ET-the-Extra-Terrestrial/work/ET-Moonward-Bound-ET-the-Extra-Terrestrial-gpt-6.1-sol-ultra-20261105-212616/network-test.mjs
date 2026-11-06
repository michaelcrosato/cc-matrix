import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = await fs.readFile(new URL('./network.js', import.meta.url), 'utf8');
const { createNetwork } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let count = 0, failed = 0;
async function test(name, fn) { count++; try { await fn(); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
const wait = ms => new Promise(r => setTimeout(r, ms));
await test('standalone solo lifecycle', async () => {
  const n = createNetwork(); await n.connect(); assert.equal(n.info.mode, 'solo'); assert.equal(n.isHost, true); assert.equal(n.running, true); n.destroy();
});
await test('room handshake, input, world and disconnect', async () => {
  let receivedInput, receivedState, left;
  const host = createNetwork({ onInput: (id, input) => { receivedInput = [id, input]; }, onPeerLeave: id => { left = id; } });
  const guest = createNetwork({ onState: s => { receivedState = s; } });
  try {
    const code = host.host(); guest.join(code); await wait(80);
    assert.equal(host.info.connected, true); assert.equal(guest.info.connected, true); assert.equal(host.players.length, 2);
    guest.sendInput({ x: 0.5, jump: true }); await wait(20); assert.deepEqual(receivedInput, [1, { x: .5, jump: true }]);
    host.broadcast({ phase: 2, x: 7 }, true); await wait(20); assert.deepEqual(receivedState, { phase: 2, x: 7 });
    guest.close(); await wait(20); assert.equal(left, 1);
  } finally { host.destroy(); guest.destroy(); }
});
await test('room and invitation validation', async () => {
  const n = createNetwork(); assert.throws(() => n.join('bad')); await assert.rejects(() => n.acceptOffer('bad')); n.destroy();
});
function fakeHub(overrides = {}) {
  const events = new Map(); const traffic = []; let clock = -Infinity;
  return { active: true, host: 0, me: 0, isHost: true, players: [{ id: 0, name: 'One' }, { id: 1, name: 'Two' }], server: false,
    ...overrides, traffic,
    on(name, fn) { events.set(name, fn); return () => events.delete(name); },
    async connect(args) { traffic.push(['connect', args]); return this; },
    ready() { traffic.push(['ready']); }, time() { return clock; },
    emit(name, ...args) { if (name === 'start') clock = 0; events.get(name)?.(...args); },
    send(...args) { traffic.push(['send', ...args]); return true; },
    finish(data) { traffic.push(['finish', data]); },
  };
}
await test('AI Hub ready/start/report/end lifecycle', async () => {
  const hub = fakeHub(); globalThis.AIHub = hub; let ended = false;
  const n = createNetwork({ onEnd: () => { ended = true; } });
  await n.connect(); assert.equal(n.running, false); n.ready(); assert.equal(hub.traffic.filter(x => x[0] === 'ready').length, 1);
  hub.emit('start', { in: 0 }); assert.equal(n.running, true);
  n.broadcast({ a: 1 }, true); assert.ok(hub.traffic.some(x => x[0] === 'send'));
  hub.emit('time-up', { graceMs: 1000 }); assert.deepEqual(hub.traffic.find(x => x[0] === 'finish')[1].standings, [[0, 1]]);
  hub.emit('end', { reason: 'finished' }); assert.equal(ended, true); assert.equal(n.running, false); n.destroy(); delete globalThis.AIHub;
});
await test('AI Hub guest forwards input and accepts host world only', async () => {
  const hub = fakeHub({ me: 1, isHost: false }); globalThis.AIHub = hub; let state;
  const n = createNetwork({ onState: s => { state = s; } }); await n.connect(); n.ready(); hub.emit('start', { in: 0 });
  n.sendInput({ x: 1 }); assert.ok(hub.traffic.some(x => x[0] === 'send' && x[2].to === 0));
  hub.emit('message', { type: 'moon-state', state: { x: 9 } }, 1); assert.equal(state, undefined);
  hub.emit('message', { type: 'moon-state', state: { x: 5 } }, 0); assert.deepEqual(state, { x: 5 }); n.destroy(); delete globalThis.AIHub;
});
await test('AI Hub dedicated server has no local input', async () => {
  const hub = fakeHub({ me: -1, server: true }); globalThis.AIHub = hub; let input = false;
  const n = createNetwork({ onInput: () => { input = true; } }); await n.connect(); n.ready(); hub.emit('start', { in: 0 });
  assert.equal(n.isServer, true); assert.equal(n.sendInput({ x: 1 }), false); assert.equal(input, false); n.destroy(); delete globalThis.AIHub;
});
console.log(`${count - failed}/${count} network checks passed`);
if (failed) process.exitCode = 1;
