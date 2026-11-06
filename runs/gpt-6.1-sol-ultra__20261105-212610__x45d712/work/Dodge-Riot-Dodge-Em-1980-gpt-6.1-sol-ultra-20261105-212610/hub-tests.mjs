import assert from 'node:assert/strict';
import { HubLink } from './hub.js';

let count = 0;
let failures = 0;
function check(name, fn) {
  count++;
  try { fn(); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
const originalHub = globalThis.AIHub;
try {
  let events = {};
  const sent = [];
  const finished = [];
  let ready = 0;
  const players = [
    { id: 0, name: 'Host', color: '#ffcf50' },
    { id: 1, name: 'Guest', color: '#4ce3cc' }
  ];
  globalThis.AIHub = {
    active: true, players,
    connect: async () => ({ me: 1, host: 0, isHost: false, server: false, players }),
    on: (type, fn) => { events[type] = fn; return () => {}; },
    send: (packet, options) => { sent.push([packet, options]); return true; },
    ready: () => ready++, time: () => 1000,
    finish: result => finished.push(result)
  };
  const snapshots = [];
  const starts = [];
  const guest = new HubLink({ onSnapshot: s => snapshots.push(s), onStart: s => starts.push(s) });
  await guest.connect();
  guest.ready();
  check('ready after connection', () => assert.equal(ready, 1));
  events.start({ in: 3000 });
  check('synchronized start event', () => assert.equal(starts[0].in, 3000));
  check('guest role and seat', () => assert.deepEqual([guest.me, guest.isHost], [1, false]));
  check('guest sends own input', () => assert.equal(guest.sendInput({ lane: 1, laneSeq: 1 }), true));
  check('input rate cap', () => assert.equal(guest.sendInput({ lane: 1, laneSeq: 1 }), false));
  check('input addressed to host', () => assert.equal(sent[0][1].to, 0));
  events.message({ riot: 1, type: 'snapshot', seq: 1, snapshot: { round: 1 } }, 1);
  check('snapshot sender authority', () => assert.equal(snapshots.length, 0));
  events.message({ riot: 1, type: 'snapshot', seq: 1, snapshot: { round: 1 } }, 0);
  check('host snapshot accepted', () => assert.deepEqual(snapshots, [{ round: 1 }]));
  events.message({ riot: 1, type: 'snapshot', seq: 1, snapshot: { round: 2 } }, 0);
  check('stale snapshot ignored', () => assert.equal(snapshots.length, 1));
  events.end({ reason: 'finished' });
  check('no input after end', () => assert.equal(guest.sendInput({ lane: 1, laneSeq: 2 }), false));

  globalThis.AIHub.connect = async () => ({ me: -1, host: -1, isHost: true, server: true, players });
  events = {};
  const inputs = [];
  const host = new HubLink({ onInput: (value, id) => inputs.push([value, id]) });
  await host.connect();
  events.start({ in: 3000 });
  events.message({ riot: 1, type: 'input', seq: 1, input: { lane: -1, laneSeq: 1 } }, 1);
  check('server has no local player', () => assert.equal(host.server && !host.players.some(p => p.id === host.me), true));
  events.message({ riot: 1, type: 'input', seq: 2, input: { lane: 'bad', laneSeq: -1, boost: 'bad' } }, 1);
  events.message({ riot: 1, type: 'input', seq: 3, input: { lane: 1, laneSeq: 3 } }, 42);
  check('server validates player input', () => {
    assert.equal(inputs[0][1], 1);
    assert.equal(inputs[0][0].lane, -1);
    assert.equal(inputs[1][0].lane, 0);
    assert.equal(inputs[1][0].laneSeq, 0);
    assert.equal(inputs[1][0].boost, false);
    assert.equal(inputs.length, 2);
  });
  host.sendSnapshot({ round: 2 });
  check('server publishes world', () => assert.equal(sent.at(-1)[0].type, 'snapshot'));
  host.finish({ score: 500, won: true, snapshot: { phase: 'won', score: 500 } });
  host.finish({ score: 500, won: true });
  check('terminal world precedes one result', () => {
    assert.equal(finished.length, 1);
    assert.deepEqual(sent.at(-1)[0].snapshot, { phase: 'won', score: 500 });
  });
  check('cooperative tie contains every player', () => assert.deepEqual(finished[0].standings, [[0, 1]]));
  check('cooperative scores', () => assert.deepEqual(finished[0].scores, { '0': 500, '1': 500 }));
  check('team win reported', () => assert.equal(finished[0].won, true));
} catch (error) {
  failures++;
  console.error(`FAIL networking harness: ${error.stack}`);
} finally {
  globalThis.AIHub = originalHub;
}
console.log(`${count} networking checks, ${failures} failures`);
if (failures) process.exitCode = 1;
