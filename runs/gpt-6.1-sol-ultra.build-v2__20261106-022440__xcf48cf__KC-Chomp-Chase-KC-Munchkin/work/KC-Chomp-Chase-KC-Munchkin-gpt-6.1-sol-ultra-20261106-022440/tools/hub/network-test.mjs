import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const source = await readFile(new URL('../../src/network.js', import.meta.url), 'utf8');
export async function networkTests() {
  const failures = [], passed = [];
  const check = (label, fn) => { try { fn(); passed.push(label); } catch (error) { failures.push(`${label}: ${error.message}`); } };
  function createHub(isHost, server = false) {
    const listeners = {}, sent = [], finishes = [];
    const players = [{ id: 0, name: '<b>A</b>' }, { id: 1, name: 'B' }];
    let time = -Infinity, ready = 0;
    const H = { active: true, isHost, server, me: server ? 99 : isHost ? 0 : 1, players, host: server ? 99 : 0, seed: 87,
      on(type, fn) { (listeners[type] ||= []).push(fn); return () => listeners[type].splice(listeners[type].indexOf(fn), 1); },
      connect: async () => ({ players, seed: 87 }),
      time: () => time, ready: () => ready++, rng: () => () => .5,
      send(data, opts) { sent.push({ data, opts }); return true; },
      finish: data => finishes.push(data), fail: message => { throw Error(message); },
      emit(type, ...args) { if (type === 'start') time = 0; for (const fn of listeners[type] || []) fn(...args); },
      sent, finishes, readyCount: () => ready,
    };
    const context = vm.createContext({ AIHub: H, TextEncoder, console });
    vm.runInContext(source, context);
    return { H, api: context.ChompNet };
  }
  const a = createHub(true), b = createHub(false), d = createHub(true, true);
  const intents = [], states = [], leave = [], ends = [];
  let world = { revision: 1, tick: 2, score: 13, lives: 5, foods: [{ alive: false }, { alive: true }] };
  const host = await a.api.create({ onPrepare() {}, getState: () => world, onIntent: (seat, value) => intents.push({ seat, ...value }), onLeave: seat => leave.push(seat), onEnd: data => ends.push(data), onTimeUp: () => ({ score: 13, won: false }) });
  const guest = await b.api.create({ onPrepare() {}, onState: state => states.push(state) });
  const dedicated = await d.api.create({ getState: () => world });
  check('automatic ready and countdown freeze', () => { assert.equal(a.H.readyCount(), 1); assert.equal(host.live, false); assert.equal(host.tick(.1), false); });
  a.H.emit('start', { in: 0 }); b.H.emit('start', { in: 0 }); d.H.emit('start', { in: 0 });
  check('host local intents bypass own transport', () => { assert.equal(host.input({ dir: 2, action: true }), true); assert.equal(intents.at(-1).seat, '0'); assert.equal(intents.at(-1).dir, 2); });
  check('dedicated server has no phantom local seat', () => { assert.equal(dedicated.isServer, true); assert.equal(dedicated.localSeat, null); assert.equal(dedicated.input({ dir: 1, action: false }), false); });
  guest.input({ dir: 1, action: true }); guest.input({ dir: 1, action: false }); guest.tick(.1);
  const packet = b.H.sent.at(-1).data;
  a.H.emit('message', packet, 1);
  check('remote short action latched and sender authenticated', () => { assert.equal(packet.i.action, true); assert.equal(intents.at(-1).seat, '1'); assert.equal(intents.at(-1).action, true); });
  const accepted = intents.length;
  a.H.emit('message', packet, 1); a.H.emit('message', { ...packet, q: packet.q + 1, i: { dir: 19, action: true } }, 1); a.H.emit('message', { ...packet, q: packet.q + 1 }, 18);
  check('stale invalid and unauthorized inputs rejected', () => assert.equal(intents.length, accepted));
  host.tick(.25); host.tick(.25); host.tick(.25);
  check('missing heartbeat neutralizes held input', () => assert.equal(intents.at(-1).dir, null));
  const state = a.H.sent.filter(x => x.data.t === 's').at(-1).data;
  b.H.emit('message', a.H.sent.find(x => x.data.t === 's' && x.data.b === 1).data, 0);
  b.H.emit('message', state, 0); const stateCount = states.length;
  b.H.emit('message', { ...state, q: state.q + 1, r: 0, s: { ...world, revision: 0 } }, 0);
  b.H.emit('message', { ...state, q: state.q + 1 }, 4);
  b.H.emit('message', state, 0);
  check('authoritative snapshots reject stale revision spoof and reorder', () => { assert.equal(stateCount, 2); assert.equal(states.length, stateCount); assert.equal(states[0].score, 13); });
  const beforeTransition = states.length;
  world = { ...world, revision: 2, tick: 300, score: 29, foodMask: 4095, board: { rows: ['#####', '#...#', '#####'] }, gate: { orientation: 2 } };
  host.tick(.1);
  const routine = a.H.sent.filter(x => x.data.t === 's' && x.data.b === 0).at(-1).data;
  b.H.emit('message', routine, 0);
  check('new-stage routine waits for matching reliable board', () => assert.equal(states.length, beforeTransition));
  host.transition();
  const repair = a.H.sent.filter(x => x.data.t === 's' && x.data.b === 1).at(-1).data;
  b.H.emit('message', repair, 0);
  b.H.emit('message', { ...state, q: repair.q + 100 }, 0);
  check('reliable stage repair resets food and stale packet cannot resurrect old board', () => { assert.equal(states.at(-1).revision, 2); assert.equal(states.at(-1).foodMask, 4095); assert.equal(states.at(-1).gate.orientation, 2); assert.equal(states.at(-1).board.rows.length, 3); });
  a.H.emit('leave', { id: 1, reason: 'left' });
  check('departed seat safely removed', () => { assert.equal(host.players.length, 1); assert.equal(leave[0], '1'); });
  a.H.emit('time-up', { graceMs: 500 }); a.H.emit('time-up', { graceMs: 500 });
  check('one tied team result with no phantom participant', () => { assert.equal(a.H.finishes.length, 1); assert.equal(JSON.stringify(a.H.finishes[0].standings), '[[0]]'); assert.equal(a.H.finishes[0].scores[0], 13); assert.equal(a.H.finishes[0].won, false); });
  a.H.emit('end', { reason: 'finished' });
  const sentBefore = a.H.sent.length;
  host.input({ dir: 0, action: true }); host.tick(.25); host.transition(); host.finish({ won: true });
  check('terminal end blocks input traffic and refinish', () => { assert.equal(host.ended, true); assert.equal(a.H.sent.length, sentBefore); assert.equal(ends.length, 1); assert.equal(a.H.finishes.length, 1); });
  const dedicatedEnd = dedicated.finish({ score: 5, won: false });
  check('dedicated result ranks only real seats', () => { assert.equal(dedicatedEnd, true); assert.equal(JSON.stringify(d.H.finishes[0].standings), '[[0,1]]'); assert.equal(own(d.H.finishes[0].scores, 99), false); });
  for (const net of [host, guest, dedicated]) net.dispose();
  return { passed: passed.length, failed: failures.length, failures };
}
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await networkTests();
  for (const failure of result.failures) console.error(failure);
  console.log(`Network: ${result.passed} passed, ${result.failed} failed, 0 skipped`);
  if (result.failed) process.exitCode = 1;
}
