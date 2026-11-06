import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { load } from '../tools/load.mjs';
const c = load();
vm.runInContext(fs.readFileSync('src/network.js', 'utf8'), c);
const { FF: F, My3D2dge: E } = c;
const results = [];
const test = (name, fn) => {
  try {
    results.push({ name, pass: true, detail: fn() });
  } catch (e) {
    results.push({ name, pass: false, error: e.stack });
  }
};
function setup({ latency = 0, jitter = 0, loss = 0, server = true } = {}) {
  let clock = 0,
    queue = [],
    finish = null;
  const peers = [],
    rng = E.rng(55),
    players = [
      { id: 0, name: 'Buford' },
      { id: 1, name: 'Pip' },
    ];
  const ids = server ? [2, 0, 1] : [0, 1];
  for (const id of ids) {
    const handlers = new Map(),
      hub = {
        me: id,
        host: server ? 2 : 0,
        isHost: id === (server ? 2 : 0),
        server: server && id === 2,
        players,
        seed: 55,
        rng: (label) => E.rng(55 + label.length),
        time: () => clock * 1000,
        on: (key, fn) => {
          if (!handlers.has(key)) handlers.set(key, []);
          handlers.get(key).push(fn);
          return () => {};
        },
        send: (data, options) => {
          for (const p of peers) {
            if (
              p.hub.me === id ||
              (options.to !== undefined && p.hub.me !== options.to)
            )
              continue;
            if (!options.reliable && rng() < loss) continue;
            queue.push({
              at: clock + (latency + (rng() - 0.5) * jitter) / 1000,
              data: JSON.parse(JSON.stringify(data)),
              from: id,
              to: p,
            });
          }
          return true;
        },
        finish: (r) => (finish = r),
      };
    const world = new F.World({ players, mode: 'hub', seed: 55 }),
      net = new F.Network(hub, world);
    net.started = true;
    peers.push({ hub, world, net, handlers });
  }
  const step = () => {
    clock += F.DT;
    const deliver = queue.filter((q) => q.at <= clock);
    queue = queue.filter((q) => q.at > clock);
    for (const q of deliver)
      for (const fn of q.to.handlers.get('message') || []) fn(q.data, q.from);
    for (const p of peers) {
      const me = p.world.actors.find((a) => a.id === p.hub.me);
      p.net.update(me ? F.bot(p.world, me) : F.neutral(), F.DT);
    }
  };
  return {
    peers,
    step,
    get clock() {
      return clock;
    },
    get finish() {
      return finish;
    },
    event(key, payload) {
      for (const p of peers)
        for (const fn of p.handlers.get(key) || []) fn(payload);
    },
  };
}
test('two-client server-host rescue with real intention packets', () => {
  const run = setup({ latency: 60, jitter: 20 });
  for (let i = 0; i < 120 * 400 && !run.finish; i++) run.step();
  const host = run.peers[0];
  assert.ok(
    run.finish?.won,
    JSON.stringify({
      time: run.clock,
      phase: host.world.phase,
      section: host.world.section,
      chances: host.world.chances,
    }),
  );
  assert.equal(run.finish.standings[0].join(','), '0,1');
  assert.ok(host.world.departed);
  for (let i = 0; i < 30; i++) run.step();
  for (const p of run.peers.slice(1)) {
    assert.equal(p.world.rescued, true);
    assert.equal(p.world.score, host.world.score);
    assert.equal(p.world.chances, host.world.chances);
  }
  return { seconds: run.clock, traffic: run.peers.map((p) => p.net.stats) };
});
test('150 ms / 50 ms / 5% loss and helper leave retain a finishable world', () => {
  const run = setup({ latency: 150, jitter: 50, loss: 0.05 });
  let left = false;
  for (let i = 0; i < 120 * 400 && !run.finish; i++) {
    run.step();
    if (!left && run.peers[0].world.section === 2) {
      run.event('leave', { id: 1 });
      left = true;
    }
  }
  assert.ok(
    run.finish?.won,
    JSON.stringify({
      phase: run.peers[0].world.phase,
      section: run.peers[0].world.section,
      time: run.clock,
      events: run.peers[0].world.events,
    }),
  );
  assert.equal(run.finish.standings[0].join(','), '0');
  return { seconds: run.clock, traffic: run.peers.map((p) => p.net.stats) };
});
test('malformed sender, duplicate input and stale snapshots rejected', () => {
  const run = setup(),
    host = run.peers[0],
    client = run.peers[1];
  host.net.message(
    { t: 'i', q: 1, at: 0, x: Infinity, u: 0, d: 0, b: 0, j: 0, c: 0 },
    0,
  );
  assert.equal(host.net.stats.rejected, 1);
  const input = { t: 'i', q: 2, at: 0, x: 1, u: 0, d: 0, b: 1, j: 1, c: 0 };
  host.net.message(input, 0);
  host.net.message(input, 0);
  assert.equal(host.net.stats.rejected, 2);
  const a = host.world.actors[0];
  assert.equal(a.lastJump, 1);
  host.world.tick = 10;
  const newState = host.net.pack();
  client.net.apply(newState);
  const stale = { ...newState, n: 9, s: 2 };
  client.net.apply(stale);
  assert.equal(client.world.section, 0);
  assert.equal(client.net.lastTick, 10);
});
test('time-up commits rescue truth and end stops traffic', () => {
  const run = setup();
  for (let i = 0; i < 100; i++) run.step();
  run.event('time-up', { graceMs: 1000 });
  assert.equal(run.finish.won, false);
  run.event('end', { reason: 'finished' });
  const counts = run.peers.map((p) => p.net.stats.sent),
    ticks = run.peers.map((p) => p.world.tick);
  for (let i = 0; i < 500; i++) run.step();
  assert.equal(
    run.peers.map((p) => p.net.stats.sent).join(','),
    counts.join(','),
  );
  assert.equal(run.peers.map((p) => p.world.tick).join(','), ticks.join(','));
});
fs.writeFileSync('artifacts/network.json', JSON.stringify(results, null, 2));
process.stdout.write(
  JSON.stringify({
    tests: results.length,
    failures: results.filter((t) => !t.pass),
  }),
);
