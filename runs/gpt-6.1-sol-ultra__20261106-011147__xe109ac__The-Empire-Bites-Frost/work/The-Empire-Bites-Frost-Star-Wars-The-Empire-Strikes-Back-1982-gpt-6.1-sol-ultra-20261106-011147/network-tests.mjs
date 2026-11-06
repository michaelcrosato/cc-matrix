import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('./net.js', import.meta.url), 'utf8');
const { createNetwork } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let count = 0, failed = 0; const checks = [];
async function test(name, fn) { try { await fn(); count++; checks.push({name,passed:true,detail:""}); } catch (error) { failed++; checks.push({name,passed:false,detail:error.message}); console.error(`FAIL ${name}: ${error.message}`); } }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) { const start = performance.now(); while (!fn()) { if (performance.now() - start > 3000) throw Error('timed out'); await pause(20); } }
function fakeHub({ guest = false, server = false } = {}) {
  const handlers = new Map();
  const sdk = { active: true, isHost: !guest, server, me: server ? 2 : guest ? 1 : 0, host: server ? 2 : 0,
    players: [{ id: 0, name: 'A', color: 'red' }, { id: 1, name: 'B', color: 'blue' }], calls: [],
    on(type, fn) { if (!handlers.has(type)) handlers.set(type, []); handlers.get(type).push(fn); return () => handlers.set(type, handlers.get(type).filter(f => f !== fn)); },
    emit(type, ...data) { for (const fn of handlers.get(type) || []) fn(...data); },
    async connect(options) { this.calls.push(['connect', options]); return { me: this.me, isHost: this.isHost, server: this.server, players: this.players }; },
    time: () => 0,
    ready() { this.calls.push(['ready']); },
    send(data, options) { this.calls.push(['send', data, options]); return true; },
    finish(data) { this.calls.push(['finish', data]); },
    fail(message) { this.calls.push(['fail', message]); },
  };
  return sdk;
}
await test('standalone two pilots connect, start, exchange input/state, leave', async () => {
  globalThis.AIHub = undefined;
  let input, state, starts = 0, left;
  const a = createNetwork({ onInput: (data, id) => { input = { data, id }; }, onStart: () => starts++, onLeave: data => { left = data; } });
  const b = createNetwork({ onSnapshot: data => { state = data; }, onStart: () => starts++ });
  try {
    const room = `TEST-${Date.now()}`;
    a.host(room); b.join(room); await until(() => a.connected && b.connected);
    assert.equal(a.isHost, true); assert.equal(b.isHost, false);
    a.start(); await until(() => starts === 2);
    b.sendInput({ x: 0.75, fire: true }); await until(() => input);
    assert.deepEqual(input, { data: { x: 0.75, fire: true, force: false }, id: 1 });
    a.sendSnapshot({ score: 100, players: [{ x: 17 }, { x: 24 }] }); await until(() => state);
    assert.equal(state.score, 100); assert.equal(state.players[1].x, 24);
    a.finish(true,100); await until(() => b.ended);
    assert.equal(a.restart(),true); await until(() => starts===4 && !b.ended);
    b.close(); await until(() => left);
    assert.equal(left.id, 1); assert.equal(a.connected, false);
  } finally { a.close(); b.close(); }
});
await test('Hub host is authoritative and reports tied team once on time-up', async () => {
  const sdk = globalThis.AIHub = fakeHub(); let started = 0, input;
  const n = createNetwork({ onStart: () => started++, onInput: (data, id) => { input = { data, id }; } });
  try {
    await n.connect(); n.ready(); sdk.emit('start', { in: 0 });
    assert.equal(started, 1); assert.equal(n.started, true);
    assert.deepEqual(sdk.calls.find(c => c[0] === 'connect')[1], { mode: 'shared-world', seats: [1, 2] });
    sdk.emit('message', { kind: 'input', seq: 1, input: { fire: true } }, 1);
    assert.deepEqual(input, { data: { fire: true }, id: 1 });
    sdk.emit('message', { kind: 'input', seq: 1, input: { fire: false } }, 1);
    assert.equal(input.data.fire, true, 'out-of-order input must be discarded');
    sdk.emit('message', {kind:'input',seq:3,input:{fire:false}},1);
    sdk.emit('message', {kind:'input',seq:2,input:{force:true}},1);
    assert.equal(input.data.force,true,'reliable ability must survive reordered ordinary control packets');
    n.sendSnapshot({ score: 1200 }); sdk.emit('time-up', { graceMs: 2000 });
    const results = sdk.calls.filter(c => c[0] === 'finish');
    assert.equal(results.length, 1); assert.deepEqual(results[0][1], { standings: [[0, 1]], scores: { 0: 1200, 1: 1200 }, won: false });
    n.finish(true, 7000); assert.equal(sdk.calls.filter(c => c[0] === 'finish').length, 1);
    sdk.emit('end', { reason: 'finished' });
    assert.equal(n.ended, true); assert.equal(n.sendSnapshot({ score: 1 }), false);
  } finally { n.close(); }
});
await test('Hub guest sends controls only to authority and rejects stale or spoofed snapshots', async () => {
  const sdk = globalThis.AIHub = fakeHub({ guest: true }); let state;
  const n = createNetwork({ onSnapshot: data => { state = data; } });
  try {
    await n.connect(); n.ready(); sdk.emit('start', { in: 0 });
    assert.equal(n.sendInput({ x: -1 }), true); assert.equal(n.sendInput({ x: 1 }), false, 'rate cap must reject immediate second input');
    const sent = sdk.calls.find(c => c[0] === 'send');
    assert.equal(sent[2].to, 0); assert.equal(sent[2].reliable, false);
    n.sendInput({ x: 0, force: true });
    n.sendInput({ x: 0, force: false });
    await pause(75); n.sendInput({ x: 0, force: false });
    assert.equal(sdk.calls.filter(c=>c[0]==='send').at(-1)[1].input.force,true,'one-frame force press survives the 15Hz throttle');
    assert.equal(sdk.calls.filter(c=>c[0]==='send').at(-1)[2].reliable,true,'ability edges use reliable transport');
    sdk.emit('message', { kind: 'snapshot', seq: 2, state: { x: 1 } }, 0);
    sdk.emit('message', { kind: 'snapshot', seq: 1, state: { x: 2 } }, 0);
    sdk.emit('message', { kind: 'snapshot', seq: 3, state: { x: 3 } }, 1);
    assert.deepEqual(state, { x: 1 });
    n.finish(true, 100); assert.equal(sdk.calls.some(c => c[0] === 'finish'), false);
  } finally { n.close(); }
});
await test('Hub dedicated authority owns no local player and accepts both player inputs', async () => {
  const sdk = globalThis.AIHub = fakeHub({ server: true }); const seen = [];
  const n = createNetwork({ onInput: (_, id) => seen.push(id) });
  try {
    await n.connect(); n.ready(); assert.equal(n.server, true); assert.equal(n.me, 2); assert.equal(n.players.some(p => p.id === n.me), false);
    sdk.emit('message', { kind: 'input', seq: 1, input: {} }, 0);
    sdk.emit('message', { kind: 'input', seq: 1, input: {} }, 1);
    assert.deepEqual(seen, [0, 1]); n.finish(true, 20);
    assert.deepEqual(sdk.calls.find(c => c[0] === 'finish')[1].standings, [[0, 1]]);
  } finally { n.close(); }
});
await writeFile(new URL("./network-test-results.json",import.meta.url),JSON.stringify({checks,passed:count,failed},null,2));
console.log(`${count} network tests passed; ${failed} failed`);
if (failed) process.exitCode = 1;
