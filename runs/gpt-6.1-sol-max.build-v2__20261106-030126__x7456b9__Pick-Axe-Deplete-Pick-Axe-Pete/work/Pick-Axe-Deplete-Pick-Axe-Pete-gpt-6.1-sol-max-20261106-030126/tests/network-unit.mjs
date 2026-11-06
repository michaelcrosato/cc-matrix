import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { load } from '../tools/load.mjs';

const P = load([
  'vendor/engine/my-3d2dge.js',
  'src/content/content.js',
  'src/sim/mine.js',
  'src/input/pilot.js',
  'src/net/hub.js',
]);

function mesh({ server = false, latency = 0, jitter = 0, loss = 0, seed = 73082 } = {}) {
  const players = [
    { id: 0, name: '<Pete>', color: '#e8443a' },
    { id: 1, name: 'Polly', color: '#3b82f6' },
  ];
  const host = server ? 99 : 0,
    ids = server ? [99, 0, 1] : [0, 1];
  const links = new Map(),
    hubs = new Map(),
    pending = [],
    sent = [],
    results = [],
    damageTrace = [];
  let time = 0,
    unreliable = 0;
  const faults = new P.Random(8473),
    ordered = new Map();
  for (const id of ids) {
    const handlers = new Map();
    const hub = {
      me: id,
      host,
      server: id === 99,
      isHost: id === host,
      seed: 73082,
      players,
      time: () => time * 1000,
      rng: () => {
        const r = new P.Random(1);
        return () => r.next();
      },
      on(type, handler) {
        handlers.set(type, handler);
        return () => handlers.delete(type);
      },
      send(data, options = {}) {
        const packet = JSON.parse(JSON.stringify(data));
        sent.push({
          from: id,
          data: packet,
          reliable: options.reliable,
          at: time,
        });
        if (!options.reliable && loss && ++unreliable % Math.ceil(1 / loss) === 0) return true;
        const targets = options.to === undefined ? ids.filter((n) => n !== id) : [options.to];
        for (const to of targets) {
          let at = time + Math.max(0, latency + (faults.next() * 2 - 1) * jitter);
          if (options.reliable) {
            const key = `${id}:${to}`;
            at = Math.max(at, (ordered.get(key) ?? -1) + 1e-7);
            ordered.set(key, at);
          }
          pending.push({ from: id, to, packet, at });
        }
        return true;
      },
      finish: (value) => results.push({ from: id, value }),
      _handlers: handlers,
    };
    hubs.set(id, hub);
  }
  const world = new P.Mine({ seed, roster: players });
  for (const id of ids) links.set(id, new P.HubLink(hubs.get(id), id === host ? world : null));
  const deliver = () => {
    const ready = pending.filter((p) => p.at <= time + 1e-8).sort((a, b) => a.at - b.at);
    for (const p of ready) {
      pending.splice(pending.indexOf(p), 1);
      hubs.get(p.to)?._handlers.get('message')?.(p.packet, p.from);
    }
  };
  const step = (controls = {}, dt = 1 / 120) => {
    if (time >= 0) {
      world.step(links.get(host).intents(controls[host] || P.neutral()), dt);
      const events = world.takeEvents();
      for (const event of events)
        if (event.type === 'hurt')
          damageTrace.push({
            time: Math.round(time * 100) / 100,
            p: event.p,
            server: world.players.map((p) => ({
              id: p.id,
              x: Math.round(p.body.x),
              z: Math.round(p.body.z),
              face: p.body.facing,
              action: p.action.phase,
              tool: p.tool,
              intent: p.intent,
            })),
            client: players.map((info) => {
              const v = links.get(info.id).view,
                p = v.players.find((p) => p.id === info.id);
              return {
                id: info.id,
                x: Math.round(p.body.x),
                z: Math.round(p.body.z),
                face: p.body.facing,
                tool: p.tool,
                intent: controls[info.id],
                rocks: v.rocks
                  .filter((r) => Math.abs(r.x - p.body.x) < 80)
                  .map((r) => [Math.round(r.x), Math.round(r.z), r.vx]),
              };
            }),
            rocks: world.rocks.map((r) => [Math.round(r.x), Math.round(r.z), r.vx]),
          });
      links.get(host).publish(events);
    }
    for (const [id, link] of links) link.update(dt, controls[id] || P.neutral());
    time += dt;
    deliver();
  };
  return {
    players,
    host,
    ids,
    hubs,
    links,
    world,
    pending,
    sent,
    results,
    damageTrace,
    step,
    deliver,
    setTime: (n) => {
      time = n;
    },
    getTime: () => time,
    run(seconds, controls = {}) {
      for (let i = 0; i < Math.ceil(seconds * 120); i++)
        step(typeof controls === 'function' ? controls(i) : controls);
    },
    close() {
      for (const link of links.values()) link.end();
    },
  };
}

export function networkPlaythrough({
  server = true,
  latency = 0.15,
  jitter = 0.05,
  loss = 0.05,
  route = 0,
  seed = 73082,
  limit = 900,
} = {}) {
  const m = mesh({ server, latency, jitter, loss, seed }),
    pilots = new Map(m.players.map((p) => [p.id, new P.Pilot(route)])),
    trace = [];
  for (let i = 0; i < limit * 120 && m.world.status !== 'victory' && m.world.status !== 'failure'; i++) {
    const controls = {};
    for (const [id, pilot] of pilots) {
      const view = m.links.get(id).view;
      controls[id] = pilot.intent(
        view,
        view.players.find((p) => p.id === id),
      );
    }
    m.step(controls);
    if (i % 3600 === 0)
      trace.push({
        time: Math.round(m.getTime()),
        chamber: m.world.chamber,
        work: m.world.work,
        score: m.world.score,
        health: m.world.players.map((p) => p.hp),
        bodies: m.world.players.map((p) => [
          p.id,
          Math.round(p.body.x),
          Math.round(p.body.z),
          p.tool,
          p.down,
        ]),
        stats: { ...m.world.stats },
      });
  }
  m.links.get(m.host).finish(m.world.status === 'victory');
  const result = {
    features: { ...m.world.features },
    eventTypes: m.world.history.map((e) => e.type),
    god: m.world.god,
    developer: m.world.developer,
    attract: m.world.attract,
    status: m.world.status,
    time: Math.round(m.getTime() * 100) / 100,
    chamber: m.world.chamber,
    score: m.world.score,
    health: m.world.players.map((p) => p.hp),
    stats: { ...m.world.stats },
    trace,
    damageTrace: m.damageTrace,
    diagnostics: [...m.links.values()].map((l) => l.diagnostics()),
  };
  m.close();
  return result;
}

export function networkTests() {
  let count = 0;
  const failures = [];
  const test = (name, fn) => {
    try {
      fn();
      count++;
    } catch (error) {
      failures.push(`${name}: ${error.stack || error}`);
    }
  };
  test('countdown gates clock, inputs and traffic', () => {
    const m = mesh();
    m.setTime(-3);
    m.run(1);
    for (const link of m.links.values()) assert.equal(link.clock, 0);
    assert.equal(m.sent.length, 0);
    assert.equal(m.world.tick, 0);
    m.close();
  });
  test('authenticated remote movement reaches native authority', () => {
    const m = mesh();
    const start = m.world.players[1].body.x;
    m.run(0.7, { 1: { x: 1 } });
    assert.ok(m.world.players[1].body.x > start + 35);
    assert.equal(m.links.get(1).view.networkReadOnly, true);
    assert.ok(m.links.get(1).view.players[0].body instanceof My3D2dge.Platformer);
    m.close();
  });
  test('face, aim and held controls use canonical intent codec', () => {
    const m = mesh();
    m.step({ 1: { x: 0.5, face: -1, up: true, chop: true, aim: 0.7 } });
    const remote = m.links.get(0).intents(P.neutral())[1];
    assert.equal(remote.face, -1);
    assert.equal(remote.aim, 0.7);
    assert.equal(remote.chop, true);
    assert.equal(remote.x, 0.5);
    m.close();
  });
  test('unknown sender and forged snapshot cannot mutate authority', () => {
    const m = mesh();
    const link = m.links.get(0);
    link.receive({ v: 1, k: 'i', e: 1, s: 1, h: [100, 0, 0, 0], c: [0, 0, 0] }, 777);
    assert.equal(link.remotes.size, 0);
    m.links.get(1).receive({ v: 1, k: 'f', e: 3, s: 12, p: [], r: [], t: 1 }, 777);
    assert.equal(m.links.get(1).epoch, 1);
    m.close();
  });
  test('duplicate sequence and repeated edge counter execute once', () => {
    const m = mesh(),
      link = m.links.get(0),
      packet = { v: 1, k: 'i', e: 1, s: 1, h: [0, 4, 0, 0], c: [1, 1, 1] };
    link.receive(packet, 1);
    link.receive(packet, 1);
    assert.equal(link.intents(P.neutral())[1].jumpPressed, true);
    assert.equal(link.intents(P.neutral())[1].jumpPressed, false);
    link.receive({ ...packet, s: 2 }, 1);
    const next = link.intents(P.neutral())[1];
    assert.equal(next.redirect, false);
    assert.equal(next.interactPressed, false);
    m.close();
  });
  test('dropped edge packet repeats until acknowledged', () => {
    const m = mesh(),
      client = m.links.get(1),
      host = m.links.get(0);
    client.update(1 / 120, { jump: true, jumpPressed: true });
    m.pending.length = 0;
    for (let i = 0; i < 13; i++) client.update(1 / 120, { jump: true });
    m.deliver();
    assert.equal(host.intents(P.neutral())[1].jumpPressed, true);
    assert.equal(host.intents(P.neutral())[1].jumpPressed, false);
    m.run(0.5);
    assert.equal(client.diagnostics().inputAcks[0], 1);
    m.close();
  });
  test('input silence neutralizes held controls', () => {
    const m = mesh(),
      host = m.links.get(0);
    host.receive({ v: 1, k: 'i', e: 1, s: 1, h: [100, 9, 0, 0], c: [0, 0, 0] }, 1);
    assert.equal(host.intents(P.neutral())[1].x, 1);
    for (let i = 0; i < 80; i++) host.update(1 / 120, P.neutral());
    assert.deepEqual(host.intents(P.neutral())[1], P.neutral());
    m.close();
  });
  test('stale epoch input and old snapshot are rejected', () => {
    const m = mesh();
    m.run(0.2);
    const old = m.sent.find((e) => e.from === 0 && e.data.k === 'f').data;
    m.world.epoch++;
    m.world.loadRoom(1);
    m.run(0.3);
    const client = m.links.get(1),
      host = m.links.get(0);
    assert.equal(client.epoch, 2);
    assert.equal(client.view.chamber, 1);
    host.receive({ v: 1, k: 'i', e: 1, s: 999, h: [100, 0, 0, 0], c: [3, 0, 0] }, 1);
    assert.equal(host.remotes.get(1)?.intent.x || 0, 0);
    client.receive(old, 0);
    assert.equal(client.view.chamber, 1);
    m.close();
  });
  test('critical events are reliable and deduplicated', () => {
    const m = mesh(),
      host = m.links.get(0),
      client = m.links.get(1);
    let events = 0;
    client.onEvents = (batch) => {
      events += batch.filter((e) => e.id === 'test:key').length;
    };
    host.publish([{ id: 'test:key', type: 'key', p: 0 }]);
    host.publish([{ id: 'test:key', type: 'key', p: 0 }]);
    m.run(0.4);
    const frame = m.sent.find((e) => e.data.ev?.some((e) => e.id === 'test:key'));
    assert.equal(frame.reliable, true);
    assert.equal(events, 1);
    client.receive(frame.data, 0);
    assert.equal(events, 1);
    m.close();
  });
  test('full frame reconstructs topology, action, stats and supplies', () => {
    const m = mesh();
    m.world.players[0].tool = 2;
    m.world.players[0].body.climbing = true;
    m.world.players[0].body.z = 44;
    m.world.room.ladders[1].state = 'inactive';
    m.world.room.ladders[1].timer = 3;
    m.world.spawnPick(208, 80);
    m.world.spawnKey(88, 70);
    m.world.stats.redirects = 7;
    m.links.get(0).publish(m.world.takeEvents());
    m.links.get(0).update(1 / 120);
    m.deliver();
    const view = m.links.get(1).view;
    assert.equal(view.players[0].tool, 2);
    assert.equal(view.players[0].body.climbing, true);
    assert.equal(view.stats.redirects, 7);
    assert.equal(view.pickups.length, 1);
    assert.ok(view.key);
    assert.equal(view.room.ladders[1].state, 'inactive');
    const [cx, cz, under] = view.room.ladders[1].cells[0];
    assert.equal(view.room.level.cell(cx, cz), under);
    assert.ok(view.players[0].action instanceof My3D2dge.Attack);
    m.close();
  });
  test('motion and keyframe ordering retains newest authoritative pose', () => {
    const m = mesh();
    m.run(0.5, { 0: { x: 1 } });
    const packets = m.sent.filter((e) => e.from === 0);
    const full = packets.find((e) => e.data.k === 'f').data;
    const motion = packets.filter((e) => e.data.k === 'm').at(-1).data;
    const freshHub = m.hubs.get(1),
      fresh = new P.HubLink(freshHub, null);
    fresh.receive(motion, 0);
    const x = fresh.authoritative.players[0].x;
    fresh.receive(full, 0);
    assert.equal(fresh.authoritative.players[0].x, x);
    fresh.end();
    m.close();
  });
  test('motion smoothing never steps a client simulation', () => {
    const m = mesh();
    m.run(0.3, { 0: { x: 1 } });
    const client = m.links.get(1);
    const tick = client.view.tick;
    const original = client.view.step;
    client.view.step = () => {
      throw new Error('client stepped');
    };
    for (let i = 0; i < 8; i++) client.update(1 / 120, P.neutral());
    assert.equal(client.view.tick, tick);
    client.view.step = original;
    m.close();
  });
  test('combined scheduler respects rate, byte and unreliable limits', () => {
    const m = mesh();
    for (let i = 0; i < 12; i++)
      m.world.spawnRock(i % 3 === 0 ? 'heavy' : 'ore', 30 + i * 27, 50 + i * 8, 35);
    m.run(2);
    for (const link of m.links.values()) {
      const d = link.diagnostics();
      assert.ok(d.maxPerSecond <= 10);
      assert.ok(d.maxBytes < 16384);
      assert.ok(d.maxUnreliableBytes <= 1200);
    }
    assert.ok(m.sent.some((e) => e.data.k === 'f'));
    m.close();
  });
  test('bounded event batches fit JSON hard limit', () => {
    const m = mesh(),
      host = m.links.get(0);
    host.publish(
      Array.from({ length: 200 }, (_, i) => ({
        id: `load:${i}`,
        type: 'collision',
        text: 'Gold in the gears '.repeat(20),
      })),
    );
    m.run(1);
    assert.ok(m.sent.filter((e) => e.from === 0).every((e) => JSON.stringify(e.data).length <= 16384));
    assert.ok(host.pendingEvents.length < 200);
    m.close();
  });
  test('carrier departure recovers key and remaining roster', () => {
    const m = mesh();
    m.world.keyOwner = 1;
    m.world.players[1].body.z = 112;
    m.links.get(0).leave(1);
    assert.deepEqual(
      m.world.players.map((p) => p.id),
      [0],
    );
    assert.equal(m.world.keyOwner, null);
    assert.ok(m.world.key);
    assert.equal(m.world.key.x, 88);
    assert.equal(m.links.get(0).remotes.has(1), false);
    m.close();
  });
  test('host finishes exactly once with tied cooperative scores', () => {
    const m = mesh(),
      host = m.links.get(0);
    m.world.score = 333;
    assert.equal(host.finish(true), true);
    assert.equal(host.finish(false), false);
    assert.equal(m.results.length, 1);
    assert.deepEqual(m.results[0].value.standings, [[0, 1]]);
    assert.deepEqual(m.results[0].value.scores, { 0: 333, 1: 333 });
    assert.equal(m.results[0].value.won, true);
    assert.equal(m.links.get(1).finish(true), false);
    m.close();
  });
  test('nonplayer authority controls no miner and still replicates', () => {
    const m = mesh({ server: true });
    assert.equal(m.links.get(99).intents({ x: 1 })[99], undefined);
    m.run(0.8, { 0: { x: 1 }, 1: { x: -1 } });
    assert.equal(m.world.players.length, 2);
    assert.ok(m.links.get(0).diagnostics().received > 0);
    assert.ok(m.links.get(1).diagnostics().received > 0);
    m.links.get(99).finish(false);
    assert.equal(m.results[0].from, 99);
    m.close();
  });
  test('delayed lossy transport preserves controls and authoritative view', () => {
    const m = mesh({ latency: 0.15, loss: 0.05 });
    const start = m.world.players[1].body.x;
    m.run(1.8, { 1: { x: 1, chop: true } });
    assert.ok(m.world.players[1].body.x > start + 50);
    assert.ok(m.links.get(1).view.tick > 100);
    assert.ok(
      m.links
        .get(1)
        .diagnostics()
        .inputAcks.every((counter) => counter === 0),
    );
    m.close();
  });
  test('end removes listeners, queues and all future traffic', () => {
    const m = mesh();
    m.run(0.2);
    m.close();
    const sent = m.sent.length;
    for (const link of m.links.values()) {
      link.update(1, { x: 1, jumpPressed: true });
      link.publish([{ id: 'after', type: 'key' }]);
    }
    assert.equal(m.sent.length, sent);
    for (const hub of m.hubs.values()) assert.equal(hub._handlers.size, 0);
    for (const link of m.links.values()) assert.equal(link.diagnostics().pendingEvents, 0);
  });
  test('local traversal responds before a packet round trip', () => {
    const m = mesh({ latency: 0.15, jitter: 0.05, loss: 0.05 }),
      client = m.links.get(1);
    const before = client.view.players[1].body.x,
      serverBefore = m.world.players[1].body.x;
    client.update(P.STEP, { x: 1 });
    assert.ok(client.view.players[1].body.x > before);
    assert.equal(m.world.players[1].body.x, serverBefore);
    assert.equal(client.view.tick, 0);
    assert.equal(client.view.score, 0);
    assert.equal(client.view.players[1].tool, 6);
    m.close();
  });
  test('prediction cannot collect a key or tool, damage a miner or award gold', () => {
    const m = mesh(),
      client = m.links.get(1),
      v = client.view,
      p = v.players[1];
    p.hp = 1;
    p.tool = 0;
    v.score = 12;
    v.pickups = [
      {
        id: 'fixture:pick',
        kind: 'pick',
        x: p.body.x,
        z: 24,
        age: 0,
        life: 40,
      },
    ];
    v.key = {
      id: 'fixture:key',
      kind: 'key',
      x: p.body.x,
      z: 24,
      age: 0,
      life: 40,
    };
    v.rocks = [
      {
        id: 'fixture:rock',
        kind: 'ore',
        x: p.body.x,
        z: 24,
        r: 7,
        vx: 0,
        vz: 0,
        grace: 0,
      },
    ];
    for (let i = 0; i < 30; i++) client.update(P.STEP, { x: 1, chop: true, redirect: i === 0 });
    assert.equal(p.hp, 1);
    assert.equal(p.tool, 0);
    assert.equal(v.score, 12);
    assert.ok(v.key);
    assert.equal(v.keyOwner, null);
    assert.equal(v.pickups.length, 1);
    assert.equal(v.events.length, 0);
    m.close();
  });
  test('lost between-slot jump and redirect retain their press direction', () => {
    const m = mesh(),
      client = m.links.get(1),
      host = m.links.get(0);
    client.update(P.STEP, P.neutral());
    m.pending.length = 0;
    client.update(P.STEP, {
      x: -1,
      jump: true,
      jumpPressed: true,
      redirect: true,
      aim: 1,
      face: -1,
    });
    for (let i = 0; i < 14; i++) client.update(P.STEP, { x: 1, aim: -1, face: 1 });
    m.deliver();
    const intent = host.intents(P.neutral())[1];
    assert.equal(intent.jumpPressed, true);
    assert.equal(intent.x, -1);
    assert.equal(intent.jump, true);
    assert.equal(intent.redirect, true);
    assert.equal(intent.aim, 1);
    assert.equal(intent.face, -1);
    const after = host.intents(P.neutral())[1];
    assert.equal(after.jumpPressed, false);
    assert.equal(after.redirect, false);
    assert.equal(after.x, 1);
    m.close();
  });
  test('prediction history is bounded without an acknowledgement', () => {
    const m = mesh(),
      client = m.links.get(1);
    for (let i = 0; i < 1200; i++) client.update(P.STEP, { x: i % 240 < 120 ? 1 : -1 });
    assert.ok(client.inputHistory.length <= 240);
    assert.equal(client.view.tick, 0);
    m.close();
  });
  for (const server of [false, true])
    for (let route = 0; route < 3; route++)
      test(`full canonical online expedition server=${server} route=${route} 150ms/50ms/5%`, () => {
        const r = networkPlaythrough({
          server,
          route,
          latency: 0.15,
          jitter: 0.05,
          loss: 0.05,
        });
        assert.equal(
          r.status,
          'victory',
          `time=${r.time} chamber=${r.chamber} HP=${r.health} stats=${JSON.stringify(r.stats)}`,
        );
        assert.equal(r.god, false);
        assert.equal(r.developer, false);
        assert.equal(r.attract, false);
        assert.equal(r.stats.doors, 3);
        assert.equal(r.stats.keys, 3);
        assert.equal(r.features.waveClear, 3);
        for (const k of ['chops', 'collisions', 'picks', 'breaks', 'redirects'])
          assert.ok(r.stats[k] > 0, `missing ${k}`);
        assert.ok(r.time < 840);
        assert.equal(r.diagnostics.filter((d) => d.host)[0].finishCalls, 1);
        for (const d of r.diagnostics) {
          assert.ok(d.maxPerSecond <= 10);
          assert.ok(d.maxBytes <= 16384);
          assert.ok(d.maxUnreliableBytes <= 1200);
        }
      });

  return { count, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = networkTests();
  for (const failure of result.failures) console.error(failure);
  console.log(`${result.count} network checks passed; ${result.failures.length} failed`);
  if (result.failures.length) process.exitCode = 1;
}
