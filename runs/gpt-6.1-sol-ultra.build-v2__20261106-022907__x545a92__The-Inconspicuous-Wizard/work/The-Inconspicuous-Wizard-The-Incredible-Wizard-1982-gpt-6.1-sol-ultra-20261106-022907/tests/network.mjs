import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '../src/network.js'), 'utf8');

class FakeHub {
  constructor(info = {}) {
    this.active = true;
    this.handlers = {};
    this.info = {
      me: 0,
      host: 0,
      isHost: true,
      server: false,
      players: [
        { id: 0, name: 'A', color: '#f00' },
        { id: 1, name: 'B', color: '#00f' },
      ],
      seed: 123,
      ...info,
    };
    Object.assign(this, this.info);
    this.now = -Infinity;
    this.sent = [];
    this.finishes = [];
    this.readyCount = 0;
    this.drop = false;
  }
  on(e, fn) {
    (this.handlers[e] ||= []).push(fn);
    return () => {
      this.handlers[e] = this.handlers[e].filter((v) => v !== fn);
    };
  }
  emit(e, ...args) {
    for (const fn of this.handlers[e] || []) fn(...args);
  }
  async connect(opts) {
    this.options = opts;
    return this.active ? this.info : null;
  }
  ready() {
    this.readyCount++;
  }
  rng(label) {
    this.rngLabel = label;
    let n = 0;
    return () => (n++ + 0.314159) % 1;
  }
  time() {
    return this.now;
  }
  send(data, options) {
    this.sent.push({ data: structuredClone(data), options });
    return !this.drop;
  }
  finish(data) {
    this.finishes.push(structuredClone(data));
  }
}
class FakeSim {
  constructor(options) {
    this.options = options;
    this.s = {
      version: 1,
      tick: 0,
      roomIndex: 0,
      phase: 'hunt',
      score: 0,
      players: Array.from({ length: options.seats }, (_, seat) => ({
        seat,
        x: 1,
        y: 1,
        alive: true,
        boltId: null,
      })),
    };
    this.calls = [];
    this.removed = [];
  }
  step(dt, commands) {
    this.calls.push({ dt, commands: structuredClone(commands) });
    this.s.tick++;
  }
  snapshot() {
    return structuredClone(this.s);
  }
  load(s) {
    this.s = structuredClone(s);
  }
  removeSeat(seat) {
    this.removed.push(seat);
    this.s.players = this.s.players.filter((p) => p.seat !== seat);
  }
}
function adapter(hub, hooks = {}) {
  const context = vm.createContext({
    console,
    TextEncoder,
    setInterval,
    clearInterval,
  });
  vm.runInContext(source, context);
  const net = new context.WizardNetwork(
    { createSim: (options) => new FakeSim(options), ...hooks },
    hub,
  );
  return net;
}

export async function runTests() {
  let passed = 0;
  const failures = [];
  const test = async (name, fn) => {
    try {
      await fn();
      passed++;
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  };
  await test('standalone uses null Hub connection and no readiness', async () => {
    const hub = new FakeHub();
    hub.active = false;
    const net = adapter(hub);
    assert.equal(await net.connect(), null);
    assert.equal(net.active, false);
    assert.equal(hub.readyCount, 0);
  });
  await test('loads Normal world and readies without input/audio', async () => {
    const hub = new FakeHub();
    const net = adapter(hub);
    await net.connect();
    assert.equal(net.sim.options.difficulty, 'normal');
    assert.equal(net.sim.options.seats, 2);
    assert.equal(net.localSeat, 0);
    assert.equal(hub.readyCount, 1);
    assert.equal(hub.rngLabel, 'simulation');
    assert.deepEqual(JSON.parse(JSON.stringify(hub.options)), {
      mode: 'shared-world',
      seats: [1, 2],
    });
  });
  await test('no simulation before start or before synchronized zero', async () => {
    const hub = new FakeHub();
    const net = adapter(hub);
    await net.connect();
    net.tick(1 / 120, { move: 0, fire: true });
    assert.equal(net.sim.s.tick, 0);
    hub.emit('start', { in: 3000 });
    hub.now = -1;
    net.tick(1 / 120, { move: 0 });
    assert.equal(net.sim.s.tick, 0);
    hub.now = 0;
    net.tick(1 / 120, {});
    assert.equal(net.sim.s.tick, 1);
  });
  await test('host accepts sender-owned bounded sequenced input only', async () => {
    const hub = new FakeHub();
    const net = adapter(hub);
    await net.connect();
    hub.emit('start');
    hub.now = 0;
    const packet = {
      v: 1,
      t: 'input',
      n: 1,
      seat: 1,
      c: { move: 2, aim: 3, fire: true },
    };
    hub.emit('message', packet, 1);
    assert.equal(net.acks[1], 1);
    hub.emit('message', packet, 1); // stale
    hub.emit('message', { ...packet, n: 2, seat: 0 }, 1); // wrong seat
    hub.emit('message', { ...packet, n: 2 }, 44); // foreign sender
    hub.emit(
      'message',
      { ...packet, n: 2, c: { move: 9, aim: 0, fire: true } },
      1,
    );
    hub.emit(
      'message',
      { ...packet, n: 2, c: { move: 0, aim: 0, fire: 'yes' } },
      1,
    );
    hub.emit('message', { ...packet, n: NaN }, 1);
    assert.equal(net.metrics.rejected, 6);
    assert.equal(net.acks[1], 1);
    net.tick(1 / 120, {});
    assert.equal(net.sim.calls.at(-1).commands[1].move, 2);
  });
  await test('remote held input expires after650ms', async () => {
    const hub = new FakeHub();
    const net = adapter(hub);
    await net.connect();
    hub.emit('start');
    hub.now = 0;
    hub.emit(
      'message',
      { v: 1, t: 'input', n: 1, seat: 1, c: { move: 2, aim: 0, fire: true } },
      1,
    );
    for (let n = 0; n < 90; n++) net.tick(1 / 120, {});
    assert.equal(net.commands[1].move, -1);
    assert.equal(net.commands[1].fire, false);
  });
  await test('clients never run world and accept snapshots only from host', async () => {
    const hub = new FakeHub({ me: 1, isHost: false });
    let applied = 0;
    const net = adapter(hub, { onSnapshot: () => applied++ });
    await net.connect();
    hub.emit('start');
    hub.now = 0;
    for (let n = 0; n < 120; n++)
      net.tick(1 / 120, { move: 0, aim: 1, fire: false });
    assert.equal(net.sim.calls.length, 0);
    assert.ok(hub.sent.length >= 11 && hub.sent.length <= 13);
    assert.ok(
      hub.sent.every((p) => p.options.to === 0 && p.options.reliable === true),
    );
    const packet = {
      v: 1,
      t: 'state',
      n: 1,
      s: {
        version: 1,
        tick: 30,
        roomIndex: 1,
        phase: 'hunt',
        players: [],
        score: 80,
      },
    };
    hub.emit('message', packet, 1);
    assert.equal(applied, 0);
    hub.emit('message', packet, 0);
    assert.equal(applied, 1);
    assert.equal(net.sim.s.score, 80);
    hub.emit('message', packet, 0);
    assert.equal(applied, 1);
  });
  await test('hostless player server advances world and broadcasts within budgets', async () => {
    const hub = new FakeHub({ me: -1, host: -1, isHost: true, server: true });
    const net = adapter(hub);
    await net.connect();
    hub.emit('start');
    hub.now = 0;
    for (let n = 0; n < 360; n++) net.tick(1 / 120, { move: 3, fire: true });
    assert.equal(net.localSeat, -1);
    assert.equal(net.server, true);
    assert.equal(net.sim.s.tick, 360);
    assert.ok(
      net.sim.calls.every((c) =>
        c.commands.every((v) => v.move === -1 && v.fire === false),
      ),
    );
    assert.ok(net.metrics.sent >= 25 && net.metrics.sent <= 28);
    assert.ok(net.metrics.maxPerSecond <= 10);
    assert.ok(net.metrics.maxBytes < 16000);
  });
  await test('nonhost leave neutralizes and removes actor and retains other seat index', async () => {
    const hub = new FakeHub();
    const net = adapter(hub);
    await net.connect();
    hub.emit('leave', { id: 1, reason: 'left' });
    assert.deepEqual(net.sim.removed, [1]);
    assert.equal(net.seatByPeer.has(1), false);
    hub.emit(
      'message',
      { v: 1, t: 'input', n: 2, seat: 1, c: { move: 0, aim: 0, fire: true } },
      1,
    );
    assert.equal(net.metrics.rejected, 1);
    assert.equal(net.commands[1].move, -1);
  });
  await test('single tied truthful terminal result on victory and timeup', async () => {
    for (const won of [true, false]) {
      const hub = new FakeHub();
      const net = adapter(hub);
      await net.connect();
      hub.emit('start');
      hub.now = 0;
      net.sim.s.score = 1234;
      if (won) {
        net.sim.s.phase = 'victory';
        net.tick(1 / 120, {});
      } else hub.emit('time-up', { graceMs: 500 });
      net.finish(!won);
      hub.emit('time-up', { graceMs: 500 });
      assert.equal(hub.finishes.length, 1);
      assert.equal(hub.finishes[0].won, won);
      assert.deepEqual(hub.finishes[0].standings, [[0, 1]]);
      assert.deepEqual(hub.finishes[0].scores, { 0: 1234, 1: 1234 });
    }
  });
  await test('client cannot submit result and end stops all sends/steps/input', async () => {
    const hub = new FakeHub({ me: 1, isHost: false });
    let stop = 0;
    const net = adapter(hub, { onEnd: () => stop++ });
    await net.connect();
    hub.emit('start');
    hub.now = 0;
    net.finish(true);
    assert.equal(hub.finishes.length, 0);
    net.tick(1 / 120, {});
    const count = hub.sent.length;
    hub.emit('end', { reason: 'host-left' });
    hub.emit('end', { reason: 'host-left' });
    for (let n = 0; n < 100; n++) net.tick(1 / 120, { move: 0, fire: true });
    net.broadcast();
    net.send({ v: 1, t: 'input', n: 4 });
    assert.equal(hub.sent.length, count);
    assert.equal(stop, 1);
    assert.equal(net.ended, true);
    assert.ok(net.commands.every((c) => c.move === -1 && !c.fire));
  });
  await test('dropped snapshot repairs on next full state and oversize is blocked', async () => {
    const hub = new FakeHub();
    const net = adapter(hub);
    await net.connect();
    hub.drop = true;
    assert.equal(net.broadcast(), false);
    assert.equal(net.metrics.dropped, 1);
    hub.drop = false;
    net.sim.s.score = 60;
    net.broadcast();
    assert.equal(hub.sent.at(-1).data.s.score, 60);
    const sent = hub.sent.length;
    net.send({ v: 1, t: 'x', n: 0, data: 'x'.repeat(16384) });
    assert.equal(hub.sent.length, sent);
  });
  await test('wall clock server pump starts and terminates on end', async () => {
    const hub = new FakeHub({ me: -1, host: -1, isHost: true, server: true });
    const net = adapter(hub);
    await net.connect();
    hub.emit('start');
    hub.now = 0;
    net.startPump();
    assert.ok(net.pump);
    hub.emit('end', { reason: 'finished' });
    assert.equal(net.pump, null);
  });
  await test('real simulation shares a shot, team score, familiar multiplier and finale result', async () => {
    const simContext = vm.createContext({ console });
    for (const relative of ['../content/rooms.js', '../src/sim.js'])
      vm.runInContext(
        fs.readFileSync(path.join(here, relative), 'utf8'),
        simContext,
      );
    const makeSim = (options) => new simContext.WizardSim.Sim(options);
    const hostHub = new FakeHub(),
      clientHub = new FakeHub({ me: 1, isHost: false });
    const host = adapter(hostHub, { createSim: makeSim }),
      client = adapter(clientHub, { createSim: makeSim });
    await host.connect();
    await client.connect();
    hostHub.send = (data) => {
      hostHub.sent.push(structuredClone(data));
      clientHub.emit('message', structuredClone(data), 0);
      return true;
    };
    clientHub.send = (data) => {
      clientHub.sent.push(structuredClone(data));
      hostHub.emit('message', structuredClone(data), 1);
      return true;
    };
    for (const hub of [hostHub, clientHub]) {
      hub.emit('start');
      hub.now = 0;
    }
    // Explicit setup fixture isolates real combat from the independently tested full campaign.
    const sim = host.sim;
    sim.s.phase = 'hunt';
    sim.s.pending = [];
    sim.s.enemies = [];
    sim.spawn('hopper', 5, 11);
    const target = sim.s.enemies[0];
    target.warning = 0;
    target.activeAt = 0;
    const targetId = target.id;
    host.broadcast();
    for (let n = 0; n < 90; n++) {
      client.tick(1 / 120, { move: -1, aim: 2, fire: true });
      host.tick(1 / 120, { move: -1, aim: 0, fire: true });
    }
    host.broadcast();
    assert.ok(!host.sim.s.enemies.some((enemy) => enemy.id === targetId));
    assert.ok(!client.sim.s.enemies.some((enemy) => enemy.id === targetId));
    assert.ok(host.sim.s.score > 0);
    assert.equal(host.sim.s.score, client.sim.s.score);
    assert.ok(host.sim.s.players.every((player) => player.stats.shots > 0));
    // A legal straight lane and ordinary bolts resolve the real familiar rules on both copies.
    sim.startFamiliar();
    Object.assign(sim.s.familiar, { x: 9, y: 11, warning: 0, moving: false });
    for (const player of sim.s.players) {
      sim.clearBolt(player);
      player.lastFire = -1000;
    }
    host.broadcast();
    for (let n = 0; n < 100 && sim.s.phase === 'familiar'; n++) {
      client.tick(1 / 120, { move: -1, aim: 2, fire: true });
      host.tick(1 / 120, { move: -1, aim: 0, fire: true });
    }
    host.broadcast();
    assert.equal(sim.s.earnedNextMultiplier, 2);
    assert.equal(client.sim.s.earnedNextMultiplier, 2);
    // Finale setup is deliberately marked Practice; each manifestation still needs a real shot.
    sim.dev('room', 5);
    sim.startWizard();
    for (let stage = 0; stage < 3; stage++) {
      const player = sim.s.players[0];
      Object.assign(player, {
        x: 1,
        y: 11,
        face: 0,
        moving: false,
        alive: true,
        lives: 3,
      });
      sim.clearBolt(player);
      player.lastFire = -1000;
      const wizard = sim.s.wizard;
      if (!wizard) sim.placeWizard();
      Object.assign(sim.s.wizard, {
        x: 5,
        y: 11,
        state: 'active',
        vulnerable: true,
        warning: 0,
        cast: 20,
        teleportIn: 20,
      });
      for (let n = 0; n < 80 && sim.s.wizard; n++) {
        client.tick(1 / 120, { move: -1, aim: -1, fire: false });
        host.tick(1 / 120, { move: -1, aim: 0, fire: true });
      }
      if (stage < 2)
        for (let n = 0; n < 200 && !sim.s.wizard; n++)
          host.tick(1 / 120, { move: -1, aim: -1, fire: false });
    }
    for (let n = 0; n < 600 && !host.finished; n++)
      host.tick(1 / 120, { move: -1, aim: -1, fire: false });
    assert.equal(sim.s.phase, 'victory');
    assert.equal(client.sim.s.phase, 'victory');
    assert.equal(hostHub.finishes.length, 1);
    assert.equal(hostHub.finishes[0].won, true);
    assert.equal(host.sim.s.score, client.sim.s.score);
    assert.ok(host.metrics.maxBytes < 16000);
  });
  return { passed, failures };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await runTests();
  result.failures.forEach((f) => console.error(`FAIL ${f}`));
  console.log(
    `${result.passed} network checks passed; ${result.failures.length} failed`,
  );
  if (result.failures.length) process.exitCode = 1;
}
