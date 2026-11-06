import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const source = await readFile(new URL('./network.js', import.meta.url), 'utf8');
const { createNetwork } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

export async function runNetworkTests() {
  const failures = [];
  let count = 0;
  function assert(ok, message) { count++; if (!ok) failures.push(message); }
  const previous = globalThis.AIHub;
  const fake = (host = false, server = false) => {
    const handlers = new Map();
    const calls = { sends: [], ready: 0, finishes: [], connect: null };
    const info = { isHost: host, server, host: server ? -1 : 0, me: host ? (server ? -1 : 0) : 1,
      players: [{ id: 0, name: 'One' }, { id: 1, name: 'Two' }] };
    const hub = {
      at: -Infinity,
      connect: async opts => { calls.connect = opts; return info; },
      on(type, fn) { handlers.set(type, [...(handlers.get(type) || []), fn]); return () => handlers.set(type, (handlers.get(type) || []).filter(x => x !== fn)); },
      emit(type, ...args) { for (const fn of handlers.get(type) || []) fn(...args); },
      time() { return hub.at; },
      ready() { calls.ready++; },
      send(data, options) { calls.sends.push({ data, options }); return true; },
      finish(data) { calls.finishes.push(data); }
    };
    globalThis.AIHub = hub;
    return { hub, calls, info };
  };
  try {
    let { hub, calls } = fake();
    let starts = 0;
    let worlds = [];
    let ends = 0;
    const guest = await createNetwork({ onStart: () => starts++, onState: s => worlds.push(s), onEnd: () => ends++ });
    assert(calls.connect.mode === 'shared-world' && calls.connect.seats.join() === '1,4', 'connect declaration');
    guest.ready(); guest.ready();
    assert(calls.ready === 1, 'ready must be exactly once');
    guest.sendInput({ x: 0.5, fire: true }); guest.tick(1);
    assert(calls.sends.length === 0 && starts === 0, 'must not send/play before start');
    hub.at = -1; hub.emit('start', { in: 3000 }); guest.tick(1);
    assert(starts === 0, 'must wait for synchronized time zero');
    hub.at = 0; guest.tick(0.016);
    assert(starts === 1 && calls.sends.length === 1 && calls.sends[0].options.to === 0, 'guest starts and sends host input');
    for (let i = 0; i < 60; i++) guest.tick(1 / 60);
    assert(calls.sends.length >= 15 && calls.sends.length <= 17, 'input throttle near 15Hz');
    hub.emit('message', { kind: 'world', sequence: 1, state: { hull: 90 } }, 0);
    hub.emit('message', { kind: 'world', sequence: 0, state: { hull: 10 } }, 0);
    hub.emit('message', { kind: 'world', sequence: 2, state: { hull: 10 } }, 1);
    assert(worlds.length === 1 && worlds[0].hull === 90, 'guest accepts only newer authoritative host state');
    const before = calls.sends.length;
    hub.emit('end', { reason: 'finished' }); guest.tick(1); guest.sendInput({ x: 1 }); guest.tick(1);
    assert(ends === 1 && calls.sends.length === before, 'no sends after end');
    guest.dispose();

    ({ hub, calls } = fake(true, true));
    let inputs = [];
    const host = await createNetwork({ onInput: (id, input) => inputs.push({ id, input }) });
    assert(host.isHost && host.info.server && !host.players.some(p => p.id === host.me), 'server host has no local player');
    host.ready(); hub.at = 0; hub.emit('start', {});
    host.broadcast({ hull: 100, players: [{ id: 0, x: 1 }] }); host.tick(0.016);
    assert(calls.sends.length === 1 && calls.sends[0].data.kind === 'world', 'host sends world');
    for (let i = 0; i < 60; i++) host.tick(1 / 60);
    assert(calls.sends.length >= 10 && calls.sends.length <= 12, 'world throttle near 10Hz');
    hub.emit('message', { kind: 'input', sequence: 1, input: { fire: true } }, 1);
    hub.emit('message', { kind: 'input', sequence: 0, input: { fire: false } }, 1);
    hub.emit('message', { kind: 'input', sequence: 5, input: { fire: false } }, 99);
    assert(inputs.length === 1 && inputs[0].id === 1 && inputs[0].input.fire, 'host checks player identity and input order');
    host.broadcast({ enormous: 'x'.repeat(17000) }); host.tick(0.2);
    assert(host.diagnostics().oversize === 1, 'oversize state is not transmitted');
    hub.emit('leave', { id: 1, reason: 'left' });
    host.finish(1200, true); host.finish(1200, true); host.tick(1);
    assert(calls.finishes.length === 1 && calls.finishes[0].standings.flat().join() === '0' && calls.finishes[0].won, 'finish once with remaining team');
    host.dispose();

    ({ hub, calls } = fake(true));
    const timeout = await createNetwork();
    hub.emit('time-up', { graceMs: 1000 });
    assert(calls.finishes.length === 1 && !calls.finishes[0].won, 'default host time-up result');
    timeout.dispose();
    globalThis.AIHub = { connect: async () => null };
    const local = await createNetwork();
    assert(!local.active && local.isHost && local.me === 0, 'standalone runs host simulation without network');
    local.dispose();
  } catch (error) { failures.push(String(error.stack || error)); }
  finally { globalThis.AIHub = previous; }
  return { count, failures };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = await runNetworkTests();
  for (const failure of result.failures) console.error(`FAIL network: ${failure}`);
  console.log(`${result.count - result.failures.length}/${result.count} network checks passed`);
  process.exitCode = result.failures.length ? 1 : 0;
}
