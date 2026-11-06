import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const source = await readFile(new URL('./hub.js', import.meta.url), 'utf8');

function network({ server = false, players = 2, snapshotSize = 0 } = {}) {
  const people = Array.from({ length: players }, (_, id) => ({ id, name: `Hero ${id + 1}`, color: '#fff' }));
  const host = server ? players : 0;
  const ids = server ? [...people.map((p) => p.id), host] : people.map((p) => p.id);
  const copies = [];
  let time = -Infinity;
  for (const id of ids) {
    const handlers = new Map();
    const item = { id, handlers, sent: [], ready: 0, finishes: [], state: { epoch: 1, tick: 0, x: [0, 0], rings: 0, extra: '.'.repeat(snapshotSize) }, starts: 0, leaves: [], ends: [], intents: [], applies: 0 };
    item.emit = (type, ...args) => { for (const fn of (handlers.get(type) || []).slice()) fn(...args); };
    item.hub = {
      connect: async () => ({ me: id, host, isHost: id === host, server: server && id === host, players: people, seed: 123, mode: 'shared-world' }),
      ready: () => { item.ready++; },
      on(type, fn) { const list = handlers.get(type) || []; list.push(fn); handlers.set(type, list); return () => list.splice(list.indexOf(fn), 1); },
      time: () => time,
      send(packet, opts) {
        const cloned = structuredClone(packet);
        item.sent.push({ packet: cloned, opts });
        for (const other of copies) if (other.id !== id && (opts.to === undefined || opts.to === other.id)) other.emit('message', cloned, id);
        return true;
      },
      finish: (value) => { item.finishes.push(value); },
      rng(label) { let i = 0; return () => (++i + label.length) / 100; },
      fail: (message) => { throw new Error(message); },
    };
    const context = vm.createContext({ AIHub: item.hub, TextEncoder, console });
    vm.runInContext(source, context);
    item.RingNet = context.RingNet;
    copies.push(item);
  }
  const prepare = async () => {
    for (const item of copies) {
      item.net = await item.RingNet.setup({
        prepare(info) { item.prepared = info; },
        readSnapshot: () => item.state,
        applySnapshot(data) { item.applies++; item.state = structuredClone(data); },
        getEpoch: () => item.state.epoch,
        onStart: () => { item.starts++; },
        onLeave: (...args) => { item.leaves.push(args); },
        onEnd: (...args) => { item.ends.push(args); },
        onIntent: (...args) => { item.intents.push(args); },
        getOutcome: () => ({ won: item.state.won === true, score: item.state.rings }),
      });
    }
  };
  const start = () => { for (const item of copies) item.emit('start', { in: 3000 }); time = -3000; };
  const update = (seconds = 1 / 60, commands = []) => {
    if (time !== -Infinity) time += seconds * 1000;
    for (let i = 0; i < copies.length; i++) copies[i].net.update(seconds, commands[i] || {});
  };
  return { copies, people, host, prepare, start, update, setTime(value) { time = value; }, set time(value) { time = value; }, get time() { return time; } };
}

export async function runNetworkTests() {
  const failures = [];
  let passed = 0;
  async function check(name, fn) {
    try { await fn(); passed++; } catch (error) { failures.push(`${name}: ${error.message}`); }
  }
  await check('standalone null', async () => {
    const context = vm.createContext({ AIHub: { connect: async () => null }, TextEncoder });
    vm.runInContext(source, context);
    assert.equal(await context.RingNet.setup({ prepare: () => { throw new Error('standalone prepared as session'); } }), null);
  });
  await check('session boot and countdown', async () => {
    const n = network(); await n.prepare(); n.start();
    for (let i = 0; i < 30; i++) n.update();
    assert(n.copies.every((c) => c.ready === 1 && !c.net.playing && c.sent.length === 0));
    assert.equal(n.copies[0].prepared.localSeat, 0); assert.equal(n.copies[1].prepared.localSeat, 1);
    n.setTime(0); n.update(); n.update();
    assert(n.copies.every((c) => c.net.playing && c.starts === 1));
  });
  await check('ten-hertz client and host traffic', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0);
    for (let i = 0; i < 120; i++) n.update(1 / 60, [{ mx: 1 }, { mx: -1 }]);
    const [host, client] = n.copies;
    assert(host.sent.length >= 18 && host.sent.length <= 21, `${host.sent.length} host messages`);
    assert(client.sent.length >= 18 && client.sent.length <= 21, `${client.sent.length} client messages`);
    assert(host.sent.every((s) => s.packet.t !== 'input'));
    assert.equal(host.net.commands[0].mx, 1); assert.equal(host.net.commands[1].mx, -1);
    assert(host.sent[0].opts.reliable === true && host.sent.slice(1).every((s) => s.opts.reliable === false));
  });
  await check('input ownership and malformed vectors', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update();
    const host = n.copies[0];
    host.emit('message', { v: 1, t: 'input', e: 1, q: 100, i: [1, 0, 1, 0, 0], x: [] }, 99);
    host.emit('message', { v: 1, t: 'input', e: 1, q: 101, i: [99, 0, 1, 0, 0], x: [] }, 1);
    host.emit('message', { v: 1, t: 'input', e: 1, q: 102, i: [1, 1, 1, 0, 0], x: [] }, 1);
    n.update();
    assert.equal(host.net.commands[1].mx, 0);
  });
  await check('commands before playable time rejected', async () => {
    const n = network(); await n.prepare(); n.start();
    const host = n.copies[0];
    host.emit('message', { v: 1, t: 'input', e: 1, q: 1, i: [1, 0, 1, 0, 0], x: [] }, 1);
    host.emit('message', { v: 1, t: 'intent', e: 1, q: 1, i: { type: 'hero', value: 'phantom' } }, 1);
    assert.equal(host.intents.length, 0);
    n.setTime(0); n.update(); assert.equal(host.net.commands[1].mx, 0);
  });
  await check('sequence and old epoch rejected', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update();
    const host = n.copies[0];
    const packet = { v: 1, t: 'input', e: 1, q: 100, i: [0.5, 0, 1, 0, 0], x: [] };
    host.emit('message', packet, 1); n.update(); assert.equal(host.net.commands[1].mx, 0.5);
    host.emit('message', { ...packet, q: 99, i: [-1, 0, 1, 0, 0] }, 1); n.update(); assert.equal(host.net.commands[1].mx, 0.5);
    host.state.epoch = 2;
    host.emit('message', { ...packet, q: 101 }, 1); n.update(); assert.equal(host.net.commands[1].mx, 0);
  });
  await check('edge deduplication and acknowledgement', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update();
    const host = n.copies[0];
    const packet = { v: 1, t: 'input', e: 1, q: 50, i: [0, 0, 1, 0, 0], x: [[1, 3]] };
    host.emit('message', packet, 1); n.update();
    assert.equal(host.net.commands[1].power, true); assert.equal(host.net.commands[1].dodge, true);
    host.emit('message', { ...packet, q: 51 }, 1); n.update();
    assert.equal(host.net.commands[1].power, false); assert.equal(host.net.commands[1].dodge, false);
    assert.equal(host.net.inspect().acknowledgedEdges[1], 1);
  });
  await check('stale held input neutralized', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update();
    const host = n.copies[0];
    host.emit('message', { v: 1, t: 'input', e: 1, q: 100, i: [1, 0, 1, 0, 1], x: [] }, 1);
    host.net.update(0.1, {}); assert.equal(host.net.commands[1].primary, true);
    for (let i = 0; i < 10; i++) host.net.update(0.1, {});
    assert.equal(host.net.commands[1].mx, 0); assert.equal(host.net.commands[1].primary, false);
  });
  await check('route chooser and own hero intention validation', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update();
    const host = n.copies[0], client = n.copies[1];
    assert.equal(client.net.intent({ type: 'route', value: 'dungeon' }), false);
    assert.equal(client.net.intent({ type: 'hero', value: 'phantom' }), true);
    assert.equal(host.intents.length, 1); assert.equal(host.intents[0][0], 1); assert.equal(host.intents[0][1].value, 'phantom');
    assert.equal(host.net.intent({ type: 'dev', value: 'win' }), false);
    assert.equal(host.net.intent({ type: 'route', value: 'dungeon' }), true);
    assert.equal(host.intents.length, 2);
  });
  await check('departure transfers seat and route chooser', async () => {
    const n = network({ server: true }); await n.prepare(); n.start(); n.setTime(0); n.update();
    for (const c of n.copies) c.emit('leave', { id: 0, reason: 'left' });
    assert(n.copies.every((c) => c.net.routeChooser === 1 && c.leaves.length === 1));
    assert.equal(n.copies[1].net.intent({ type: 'route', value: 'crystal' }), true);
    assert.equal(n.copies[2].intents[0][0], 1);
  });
  await check('server authority owns no human seat', async () => {
    const n = network({ server: true }); await n.prepare(); n.start(); n.setTime(0);
    for (let i = 0; i < 20; i++) n.update(1 / 60, [{ mx: 1 }, { my: -1 }, { mx: -1, primary: true }]);
    const server = n.copies[2];
    assert.equal(server.net.localSeat, -1); assert.equal(server.prepared.server, true); assert.equal(server.net.authority, true);
    assert.equal(server.net.commands[0].mx, 1); assert.equal(server.net.commands[1].my, -1);
    assert(server.sent.length > 0 && n.copies[0].applies > 0 && n.copies[1].applies > 0);
  });
  await check('timeup finishes once with remaining humans', async () => {
    const n = network({ server: true }); await n.prepare(); n.start(); n.setTime(0); n.update();
    const server = n.copies[2]; server.state.rings = 3;
    for (const c of n.copies) c.emit('leave', { id: 0, reason: 'left' });
    for (const c of n.copies) c.emit('time-up', { graceMs: 3000 });
    server.emit('time-up', { graceMs: 3000 });
    assert.equal(server.finishes.length, 1); assert.equal(JSON.stringify(server.finishes[0].standings), '[[1]]');
    assert.equal(server.finishes[0].won, false); assert.equal(server.finishes[0].scores[1], 3);
    assert.equal(n.copies[0].finishes.length + n.copies[1].finishes.length, 0);
  });
  await check('victory finishes with cooperative standings', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.copies[0].state.won = true; n.update();
    const result = n.copies[0].finishes[0]; assert.equal(result.won, true); assert.equal(JSON.stringify(result.standings), '[[0,1]]');
  });
  await check('terminal authoritative state reaches clients between snapshot slots', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update(0.01);
    assert.equal(n.copies[1].state.won, undefined);
    n.copies[0].state.won = true;
    n.update(0.01);
    assert.equal(n.copies[0].finishes.length, 1);
    assert.equal(n.copies[1].state.won, true, 'finish preceded the final authoritative state');
    const terminal = n.copies[0].sent.at(-1);
    assert.equal(terminal.opts.reliable, true);
  });
  await check('end stops traffic and input', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update();
    const counts = n.copies.map((c) => c.sent.length);
    for (const c of n.copies) c.emit('end', { reason: 'host-left' });
    for (let i = 0; i < 20; i++) n.update(0.1, [{ mx: 1 }, { mx: 1 }]);
    assert(n.copies.every((c, i) => c.sent.length === counts[i] && c.net.ended && c.ends.length === 1 && c.net.commands[0].mx === 0));
  });
  await check('large snapshots are reliable', async () => {
    const n = network({ snapshotSize: 1500 }); await n.prepare(); n.start(); n.setTime(0);
    for (let i = 0; i < 20; i++) n.update();
    assert(n.copies[0].sent.every((s) => s.opts.reliable === true));
    assert(n.copies[0].net.inspect().maxPacketBytes > 1200);
  });
  await check('oversize snapshots never leave game', async () => {
    const n = network({ snapshotSize: 18000 }); await n.prepare(); n.start(); n.setTime(0); n.update();
    assert.equal(n.copies[0].sent.length, 0); assert.equal(n.copies[0].net.inspect().droppedMessages, 1);
  });
  await check('labelled random streams are retained', async () => {
    const n = network(); await n.prepare();
    const a = n.copies[0].net.rng('director'), b = n.copies[0].net.rng('director');
    assert.equal(a, b); assert(a() < b()); assert.notEqual(n.copies[0].net.rng('cosmetic'), a);
  });
  await check('snapshots accept only host and increasing sequence', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0); n.update();
    const client = n.copies[1]; const before = client.applies;
    const packet = { v: 1, t: 'snapshot', e: 1, q: 100, s: { epoch: 1, marker: 'valid' }, a: [0, 0] };
    client.emit('message', packet, 77); assert.equal(client.applies, before);
    client.emit('message', packet, 0); assert.equal(client.state.marker, 'valid');
    client.emit('message', { ...packet, q: 99, s: { epoch: 1, marker: 'stale' } }, 0); assert.equal(client.state.marker, 'valid');
  });
  await check('snapshot pressure does not exceed fixed cadence', async () => {
    const n = network(); await n.prepare(); n.start(); n.setTime(0);
    for (let i = 0; i < 120; i++) { n.copies[0].net.forceSnapshot(); n.update(); }
    assert(n.copies[0].sent.length <= 21, `${n.copies[0].sent.length} packets in 2 seconds`);
  });
  await check('normalization preserves unit movement', async () => {
    const n = network(); await n.prepare();
    const command = n.copies[0].RingNet.normalized({ mx: 1, my: 1, ax: Infinity, ay: NaN, primary: 1 });
    assert(Math.abs(Math.hypot(command.mx, command.my) - 1) < 1e-9);
    assert.equal(command.ax, 1); assert.equal(command.ay, 0); assert.equal(command.primary, false);
  });
  for (const [action, mask] of [['primary', 8], ['interact', 16]]) {
    await check(`quick ${action} tap between input bundles is acknowledged once`, async () => {
      const n = network(); await n.prepare(); n.start(); n.setTime(0);
      n.update(0.01);
      n.update(0.01, [{}, { [action]: true }]);
      n.update(0.01);
      let applications = 0;
      for (let i = 0; i < 35; i++) {
        n.update(0.01);
        if (n.copies[0].net.commands[1][action]) applications++;
      }
      const client = n.copies[1];
      const retransmitted = client.sent.find((item) => item.packet.x.some((edge) => edge[1] & mask));
      assert(retransmitted, 'tap did not enter the acknowledged edge queue');
      assert.equal(retransmitted.packet.i[4], 0, 'held state should already be released at the next bundle');
      assert.equal(applications, 1, 'tap was lost or applied more than once');
      assert.equal(client.net.inspect().pendingEdges, 0, 'tap remained queued after the authoritative acknowledgement');
    });
  }
  return { passed, failed: failures.length, failures };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const result = await runNetworkTests();
  for (const failure of result.failures) console.log(`FAIL ${failure}`);
  console.log(`${result.passed} passed, ${result.failed} failed`);
  process.exitCode = result.failed ? 1 : 0;
}
