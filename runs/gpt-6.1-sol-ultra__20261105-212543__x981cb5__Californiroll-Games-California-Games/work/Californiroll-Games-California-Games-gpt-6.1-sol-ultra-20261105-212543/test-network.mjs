import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('./network.js', import.meta.url), 'utf8');
const { CoastNetwork } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
globalThis.addEventListener ||= () => {};
globalThis.removeEventListener ||= () => {};
const open = [];
let tests = 0;
const check = (test) => { test(); tests++; };
try {
  const solo = new CoastNetwork(); open.push(solo);
  let localAction;
  solo.onAction = (action, who) => { localAction = [action, who]; };
  solo.submit({ jump: true });
  check(() => assert.deepEqual(localAction, [{ jump: true }, 0]));
  check(() => assert.equal(solo.active, false));
  const host = new CoastNetwork(); const guest = new CoastNetwork(); open.push(host, guest);
  host.createRoom('NETWORKTEST'); guest.joinRoom('NETWORKTEST');
  await new Promise(resolve => setTimeout(resolve, 30));
  check(() => assert.equal(guest.connected, true));
  check(() => assert.equal(host.players.length, 2));
  let snapshot;
  guest.onState = state => { snapshot = state; };
  host.publish({ totals: [5, 9], player: 1 }); host.tick();
  await new Promise(resolve => setTimeout(resolve, 30));
  check(() => assert.deepEqual(snapshot, { totals: [5, 9], player: 1 }));
  let remoteAction;
  host.onAction = (action, who) => { remoteAction = [action, who]; };
  guest.submit({ x: .5, jump: true });
  await new Promise(resolve => setTimeout(resolve, 30));
  check(() => assert.deepEqual(remoteAction, [{ x: .5, jump: true }, 1]));
  let starts = 0;
  guest.onStart = () => starts++;
  host.start();
  await new Promise(resolve => setTimeout(resolve, 30));
  check(() => assert.equal(starts, 1));
  let end;
  guest.onEnd = event => { end = event; };
  host.finish([5, 9]);
  await new Promise(resolve => setTimeout(resolve, 30));
  check(() => assert.deepEqual(end.standings, [[1], [0]]));
  check(() => assert.equal(host.finish([5, 9]), false));
  const events = {}; let finished;
  globalThis.AIHub = {
    active: true,
    on(event, fn) { events[event] = fn; return () => {}; },
    async connect(spec) { assert.equal(spec.mode, 'shared-world'); return { me: 2, host: 2, isHost: true, server: true, players: [{ id: 0, name: 'A' }, { id: 1, name: 'B' }], limitMs: 2000 }; },
    ready() {}, time() { return 150; }, send() { return true; }, finish(value) { finished = value; },
  };
  const hub = new CoastNetwork(); open.push(hub);
  await hub.connect();
  check(() => assert.equal(hub.server, true));
  let unauthorized = false;
  hub.onAction = () => { unauthorized = true; };
  hub.receive({ kind: 'input', seq: 1, action: { jump: true } }, 99);
  check(() => assert.equal(unauthorized, false));
  hub.finish([9, 9]);
  check(() => assert.deepEqual(finished.standings, [[0, 1]]));
  events.end({ reason: 'finished' });
  check(() => assert.equal(hub.submit({ jump: true }), false));
  console.log(`${tests} network tests passed`);
} catch (error) {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
} finally { open.forEach(net => net.close()); }
