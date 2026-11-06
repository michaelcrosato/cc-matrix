import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = await readFile(new URL('../hub.js', import.meta.url), 'utf8');
const { connectHub } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let count = 0;
let failures = 0;
const frames = new Map();
let nextFrame = 0;
globalThis.requestAnimationFrame = fn => { frames.set(++nextFrame, fn); return nextFrame; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
function fixture({ active = true, returnsNull = false } = {}) {
  const calls = [];
  const handlers = new Map();
  let time = -Infinity;
  const info = { me: 0, players: [{ id: 0, name: 'Pilot' }], seed: 42 };
  globalThis.AIHub = {
    active,
    async connect(options) { calls.push(['connect', options]); return returnsNull ? null : info; },
    time: () => time,
    on(event, fn) { handlers.set(event, fn); },
    ready() { calls.push(['ready']); },
    progress(value) { calls.push(['progress', value]); },
    result(value) { calls.push(['result', value]); },
    fail(value) { calls.push(['fail', value]); },
  };
  return { calls, info, emit: (event, detail) => handlers.get(event)?.(detail), setTime: v => time = v };
}
async function check(name, fn) {
  count++;
  try { await fn(); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  frames.clear();
}
await check('standalone does not connect or report', async () => {
  const f = fixture({ active: false });
  const hub = await connectHub();
  assert.equal(hub.active, false);
  assert.equal(hub.isRunning(), true);
  hub.ready(); hub.progress(5); hub.result(5);
  assert.equal(f.calls.length, 0);
});
await check('null connection falls back to standalone', async () => {
  fixture({ returnsNull: true });
  const hub = await connectHub();
  assert.equal(hub.active, false);
  assert.equal(hub.isRunning(), true);
});
await check('protocol and seats plus automatic once-only ready', async () => {
  const f = fixture();
  const hub = await connectHub();
  assert.deepEqual(f.calls[0], ['connect', { mode: 'parallel', seats: [1, 4] }]);
  assert.equal(hub.info, f.info);
  hub.ready(); hub.ready();
  assert.equal(f.calls.filter(c => c[0] === 'ready').length, 1);
});
await check('clock controls start and suppresses early progress/result', async () => {
  const f = fixture();
  let starts = 0;
  const hub = await connectHub({ start: () => starts++ });
  f.setTime(-3000); f.emit('start');
  assert.equal(hub.isRunning(), false);
  hub.progress(17); hub.result(17);
  assert.equal(f.calls.some(c => c[0] === 'result' || c[0] === 'progress'), false);
  f.setTime(0);
  for (const fn of [...frames.values()]) fn();
  assert.equal(starts, 1);
  assert.equal(hub.isRunning(), true);
  hub.isRunning();
  assert.equal(starts, 1);
});
await check('time up guarantees one valid latest-score result', async () => {
  const f = fixture();
  let timeups = 0;
  const hub = await connectHub({ timeup: () => timeups++ });
  f.setTime(1000); f.emit('start');
  hub.progress(1234, 'Escort');
  f.emit('time-up', { graceMs: 3000 });
  f.emit('time-up', { graceMs: 3000 });
  assert.equal(timeups, 1);
  assert.deepEqual(f.calls.filter(c => c[0] === 'result'), [['result', { score: 1234, stats: {} }]]);
  assert.equal(hub.reported, true);
});
await check('game final score takes precedence during time up', async () => {
  const f = fixture();
  let hub;
  hub = await connectHub({ timeup: () => hub.result(9999, { Convoy: 12 }) });
  f.setTime(0); f.emit('start');
  f.emit('time-up');
  assert.deepEqual(f.calls.filter(c => c[0] === 'result'), [['result', { score: 9999, stats: { Convoy: 12 } }]]);
});
await check('leave delivered and end freezes the adapter', async () => {
  const f = fixture();
  let left = null;
  let ends = 0;
  const hub = await connectHub({ leave: x => left = x, end: () => ends++ });
  f.emit('leave', { id: 1, reason: 'left' });
  assert.deepEqual(left, { id: 1, reason: 'left' });
  f.setTime(0); f.emit('start');
  f.emit('end', { reason: 'finished' });
  f.emit('end', { reason: 'finished' });
  const before = f.calls.length;
  hub.progress(20); hub.result(20); hub.ready(); hub.fail('late');
  assert.equal(f.calls.length, before);
  assert.equal(hub.isRunning(), false);
  assert.equal(ends, 1);
  assert.equal(hub.ended, true);
});
console.log(`${count} hub adapter checks, ${failures} failures`);
if (failures) process.exitCode = 1;
