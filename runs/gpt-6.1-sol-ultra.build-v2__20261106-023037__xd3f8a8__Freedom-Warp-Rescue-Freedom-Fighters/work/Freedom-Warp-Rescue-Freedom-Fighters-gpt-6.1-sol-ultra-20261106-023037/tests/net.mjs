import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SOURCE = await readFile(new URL("../src/net.js", import.meta.url), "utf8");
const context = vm.createContext({ TextEncoder, TextDecoder, btoa, atob, console });
vm.runInContext(SOURCE, context);
const { Net, NetCodec } = context.FWR;
const ordinary = (value) => JSON.parse(JSON.stringify(value));

class World {
  constructor(seed, options) {
    this.seed = seed;
    this.runId = options.runId;
    this.tick = 0;
    this.time = 0;
    this.score = 0;
    this.rescued = [];
    this.lost = [];
    this.outcome = null;
    this.ship = { x: 100, y: 200, vx: 0, vy: 0, hull: 3, energy: 100, drive: "ready" };
    this.entities = [{ id: "c1", type: "crystal", x: 180, y: 200, hp: 3, r: 30 }];
    this.bullets = [];
    this.events = [];
    this.camera = { x: 0, y: 0 };
    this.seats = [];
    this.steps = 0;
    this.bursts = 0;
  }
  setSeats(ids) {
    this.seats = ids.slice();
  }
  step(intents, dt) {
    this.steps++;
    this.tick++;
    this.time += dt;
    const pilot = intents[this.seats[0]] || {};
    const navigator = intents[this.seats[1] ?? this.seats[0]] || {};
    this.ship.x += (pilot.mx || 0) * 120 * dt;
    this.ship.y += (pilot.my || 0) * 120 * dt;
    if (navigator.burst) this.bursts++;
    const crystal = this.entities[0];
    if (crystal && Math.hypot(this.ship.x - crystal.x, this.ship.y - crystal.y) <= crystal.r) {
      this.rescued.push(crystal.id);
      this.entities = [];
      this.score += 20;
    }
  }
  snapshot() {
    const { steps, ...state } = this;
    return structuredClone(state);
  }
  loadSnapshot(state) {
    Object.assign(this, structuredClone(state));
  }
  finish(won, reason) {
    if (!this.outcome)
      this.outcome = {
        won,
        reason,
        score: this.score,
        rescued: this.rescued.length,
        lost: this.lost.length,
      };
  }
}

function transport(players = [0, 1], server = false, WorldType = World) {
  let time = -Infinity;
  let packetCount = 0;
  const clients = [];
  const events = new Map();
  const pending = [];
  const host = server ? players.length : players[0];
  let delayed = false;
  const copies = [...players, ...(server ? [host] : [])];
  for (const id of copies) {
    const callbacks = new Map();
    const info = {
      me: id,
      host,
      isHost: id === host,
      server: server && id === host,
      players: players.map((p) => ({ id: p, name: `P${p}` })),
      seed: 1234,
      round: 9,
      limitMs: 900000,
    };
    const hub = {
      active: true,
      readyCalls: 0,
      finishes: [],
      sent: [],
      async connect(capabilities) {
        assert.deepEqual(ordinary(capabilities), { mode: "shared-world", seats: [1, 2] });
        return info;
      },
      ready() {
        this.readyCalls++;
      },
      on(name, callback) {
        callbacks.set(name, callback);
        return () => callbacks.delete(name);
      },
      time() {
        return time * 1000;
      },
      send(data, options) {
        this.sent.push({ time, data: structuredClone(data), options });
        const targets = options.to === undefined ? copies.filter((p) => p !== id) : [options.to];
        packetCount++;
        if (delayed && options.reliable === false && packetCount % 13 === 0) return true;
        for (const to of targets)
          pending.push({
            to,
            from: id,
            data: structuredClone(data),
            deliver: time + (delayed ? 0.15 + (packetCount % 4) * 0.015 : 0),
          });
        return true;
      },
      finish(result) {
        this.finishes.push(ordinary(result));
      },
    };
    events.set(id, callbacks);
    clients.push({
      id,
      hub,
      info,
      net: new Net({ hub, createWorld: (seed, opts) => new WorldType(seed, opts) }),
    });
  }
  const pump = () => {
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      if (p.deliver > time) continue;
      pending.splice(i, 1);
      events.get(p.to)?.get("message")?.(p.data, p.from);
    }
  };
  return {
    clients,
    events,
    get time() {
      return time;
    },
    set time(t) {
      time = t;
    },
    get host() {
      return clients.find((c) => c.id === host);
    },
    delay() {
      delayed = true;
    },
    start() {
      time = -3;
      for (const e of events.values()) e.get("start")?.({ in: 3000 });
    },
    tick(inputs = {}, dt = 1 / 120) {
      time += dt;
      pump();
      for (const c of clients) c.net.update(dt, inputs[c.id] || {});
      pump();
    },
    advance(seconds, input) {
      const ticks = Math.round(seconds * 120);
      for (let i = 0; i < ticks; i++)
        this.tick(typeof input === "function" ? input(i, time) : input);
    },
    emit(id, name, payload) {
      events.get(id)?.get(name)?.(payload);
    },
  };
}

export async function runNetTests() {
  const results = [];
  const check = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, detail: error.stack || String(error) });
    }
  };

  await check("network codec is lossless for complete Unicode world snapshots", () => {
    const value = {
      runId: "test",
      entities: Array.from({ length: 130 }, (_, id) => ({
        id: `mine-${id}`,
        type: "mine",
        owner: `layer-${id % 7}`,
        x: 10 + id / 7,
        y: -5 + id / 11,
        state: "active",
        hp: 3,
        description: "Violet 🚀 crystal Ω",
      })),
      rescued: ["a", "b"],
      events: [{ id: 1, type: "rescue", text: "You are free." }],
      score: 45,
      outcome: null,
    };
    const encoded = NetCodec.encode(value);
    assert.deepEqual(ordinary(NetCodec.decode(encoded)), value);
    assert.ok(encoded.length < JSON.stringify(value).length);
  });

  await check("network sanitizes and normalizes semantic intentions", () => {
    const out = NetCodec.cleanIntent({
      mx: 1,
      my: 1,
      ax: NaN,
      ay: Infinity,
      fire: true,
      burst: "yes",
    });
    assert.ok(Math.abs(Math.hypot(out.mx, out.my) - 1) < 1e-10);
    assert.equal(out.ax, 0);
    assert.equal(out.ay, 0);
    assert.equal(out.fire, true);
    assert.equal(out.burst, false);
  });

  await check("session readies without gesture and waits for synchronized zero", async () => {
    const t = transport();
    for (const c of t.clients) await c.net.connect();
    assert.ok(t.clients.every((c) => c.hub.readyCalls === 1));
    t.advance(1);
    assert.equal(t.host.net.world.tick, 0);
    t.start();
    t.advance(2.9, { 0: { mx: 1 } });
    assert.equal(t.host.net.world.tick, 0);
    t.advance(0.2, { 0: { mx: 1 } });
    assert.ok(t.host.net.world.tick > 0);
    assert.ok(t.host.net.world.ship.x > 100);
    assert.equal(t.clients[1].net.world.steps, 0);
  });

  await check(
    "shared ship uses one authority with rescue ledger, bursts and full recovery",
    async () => {
      const t = transport();
      for (const c of t.clients) await c.net.connect();
      t.start();
      t.advance(3);
      t.advance(0.7, { 0: { mx: 1 }, 1: { burst: true, ax: 0, ay: -1 } });
      t.advance(0.3);
      const a = t.host.net,
        b = t.clients[1].net;
      assert.deepEqual(ordinary(a.world.rescued), ["c1"]);
      assert.equal(a.world.score, 20);
      assert.deepEqual(ordinary(b.world.rescued), ["c1"]);
      assert.equal(b.world.score, 20);
      assert.equal(a.world.bursts, 1);
      assert.equal(a.world.ship.y, 200);
      assert.ok(b.metrics.snapshots >= 8);
      assert.equal(b.world.steps, 0);
      assert.ok(a.metrics.maxBytes < 16000 && b.metrics.maxBytes < 1200);
      assert.ok(a.metrics.peakPerSecond <= 12 && b.metrics.peakPerSecond <= 13);
    },
  );

  await check(
    "host rejects forged sender, stale sequence, wrong run and invalid vector",
    async () => {
      const t = transport();
      for (const c of t.clients) await c.net.connect();
      t.start();
      t.advance(3.2);
      const a = t.host.net;
      const valid = {
        g: "fwr",
        v: 1,
        t: "i",
        r: a.runId,
        q: 100,
        k: a.world.tick,
        a: [0, 0, 1, 0, 0, 0],
        sender: 0,
        role: "pilot",
      };
      a._receive(valid, 1);
      assert.equal(a._commands.get(1).seq, 100);
      const before = a.metrics.rejected;
      a._receive(valid, 1);
      a._receive({ ...valid, q: 101 }, 99);
      a._receive({ ...valid, q: 101, r: "old-round" }, 1);
      a._receive({ ...valid, q: 101, a: [9, 0, 0, 0, 0, 0] }, 1);
      a._receive({ ...valid, q: 101, a: [NaN, 0, 0, 0, 0, 0] }, 1);
      assert.equal(a.metrics.rejected - before, 5);
      assert.equal(a._commands.get(1).seq, 100);
    },
  );

  await check(
    "impaired network recovers current world without duplicating rescue events",
    async () => {
      const t = transport();
      t.delay();
      for (const c of t.clients) await c.net.connect();
      t.start();
      t.advance(3.1);
      t.advance(0.8, { 0: { mx: 1 }, 1: { burst: true } });
      t.advance(1);
      const [a, b] = t.clients.map((c) => c.net);
      assert.equal(a.world.score, 20);
      assert.equal(b.world.score, 20);
      assert.deepEqual(ordinary(b.world.rescued), ["c1"]);
      const tick = b.world.tick,
        score = b.world.score;
      const old = t.host.hub.sent.find((p) => p.data.t === "s").data;
      b._receive(old, 0);
      b._receive(old, 0);
      assert.equal(b.world.tick, tick);
      assert.equal(b.world.score, score);
      const view = b.renderWorld();
      assert.ok(Number.isFinite(view.ship.x));
    },
  );

  await check(
    "role departure clears commands and hands both controls to remaining teammate",
    async () => {
      const t = transport();
      for (const c of t.clients) await c.net.connect();
      t.start();
      t.advance(3.2, { 1: { burst: true } });
      const a = t.host.net;
      t.emit(0, "leave", { id: 1, reason: "disconnected" });
      assert.deepEqual(ordinary(a.remainingIds), [0]);
      assert.deepEqual(ordinary(a.world.seats), [0]);
      assert.equal(a._commands.size, 0);
      const before = a.world.bursts;
      t.advance(0.2, { 0: { burst: true } });
      assert.equal(a.world.bursts, before + 1);
    },
  );

  await check("role handoff cannot replay an already consumed hyperspace press", async () => {
    const t = transport();
    for (const c of t.clients) await c.net.connect();
    t.start();
    t.advance(3.1);
    t.advance(0.2, { 1: { burst: true } });
    t.advance(0.2);
    const a = t.host.net,
      before = a.world.bursts;
    assert.equal(before, 1);
    a._clearCommands();
    t.advance(0.2);
    assert.equal(a.world.bursts, before);
    const stale = {
      g: "fwr",
      v: 1,
      t: "i",
      r: a.runId,
      q: 1,
      k: a.world.tick,
      a: [0, 0, 0, 0, 0, 1],
    };
    const rejected = a.metrics.rejected;
    a._receive(stale, 1);
    assert.equal(a.metrics.rejected, rejected + 1);
  });

  await check("terminal victory and time-up race finishes once with tied teammates", async () => {
    const t = transport();
    for (const c of t.clients) await c.net.connect();
    t.start();
    t.advance(3.2);
    t.host.net.world.finish(true, "extracted");
    t.tick();
    t.emit(0, "time-up", { graceMs: 1000 });
    t.advance(1);
    assert.equal(t.host.hub.finishes.length, 1);
    assert.deepEqual(t.host.hub.finishes[0].standings, [[0, 1]]);
    assert.deepEqual(t.host.hub.finishes[0].scores, { 0: 0, 1: 0 });
    assert.deepEqual(Object.keys(t.host.hub.finishes[0].stats), ["0", "1"]);
    assert.equal(t.host.hub.finishes[0].won, true);
    assert.equal(t.clients[1].hub.finishes.length, 0);
    assert.equal(t.clients[1].net.world.outcome.won, true);
  });

  await check("server-only authority runs, finishes time-up and scores players only", async () => {
    const t = transport([0, 1], true);
    for (const c of t.clients) await c.net.connect();
    t.start();
    t.advance(3.2);
    assert.equal(t.host.net.server, true);
    assert.equal(t.host.net.world.ship.x, 100);
    t.advance(0.8, { 0: { mx: 1 } });
    t.advance(0.4);
    assert.equal(t.host.net.world.score, 20);
    t.emit(t.host.id, "time-up", { graceMs: 800 });
    t.advance(0.5);
    const result = t.host.hub.finishes[0];
    assert.deepEqual(result.standings, [[0, 1]]);
    assert.equal(result.won, false);
    assert.ok(!Object.hasOwn(result.scores, String(t.host.id)));
  });

  await check("one-player Hub round keeps full solo ship authority", async () => {
    const t = transport([0]);
    await t.host.net.connect();
    t.start();
    t.advance(3);
    t.advance(0.7, { 0: { mx: 1, burst: true } });
    assert.equal(t.host.net.world.score, 20);
    assert.equal(t.host.net.world.bursts, 1);
    t.host.net.world.finish(false, "hull");
    t.advance(0.5);
    assert.deepEqual(t.host.hub.finishes[0].standings, [[0]]);
  });

  await check("end halts all simulation, network capture and sound callback", async () => {
    let clear = 0,
      end = 0;
    const t = transport();
    for (const c of t.clients) {
      c.net.options.onClearInput = () => clear++;
      c.net.options.onEnd = () => end++;
      await c.net.connect();
    }
    t.start();
    t.advance(3.3, { 0: { mx: 1 } });
    for (const c of t.clients) t.emit(c.id, "end", { reason: "host-left" });
    const tick = t.host.net.world.tick,
      sent = t.host.net.metrics.sent;
    t.advance(1, { 0: { mx: 1, fire: true, burst: true } });
    assert.equal(t.host.net.world.tick, tick);
    assert.equal(t.host.net.metrics.sent, sent);
    assert.equal(end, 2);
    assert.ok(clear >= 4);
  });

  await check(
    "oversized snapshot uses bounded reliable pieces and reconstructs everything",
    async () => {
      const t = transport();
      for (const c of t.clients) await c.net.connect();
      for (let i = 0; i < 1200; i++)
        t.host.net.world.entities.push({
          id: `d${i}`,
          type: "mine",
          x: i * 0.18347015,
          y: (i * 313) % 675,
          owner: `l${i % 16}`,
          state: i % 2 ? "active" : "arming",
          hp: i % 7,
          r: 5,
        });
      t.start();
      t.advance(3);
      t.advance(1);
      assert.equal(t.clients[1].net.world.entities.length, 1201);
      assert.ok(t.host.net.metrics.maxBytes < 16000);
      assert.ok(t.host.net.metrics.peakPerSecond <= 12);
    },
  );

  const realContext = vm.createContext({ TextEncoder, TextDecoder, btoa, atob, console });
  for (const path of [
    "../vendor/engine-repo/dist/handoff/my-3d2dge.js",
    "../src/config.js",
    "../src/content.js",
    "../src/sim.js",
    "../src/bot.js",
  ]) {
    vm.runInContext(await readFile(new URL(path, import.meta.url), "utf8"), realContext, {
      filename: path,
    });
  }
  const ActualWorld = realContext.FWR.World;

  await check(
    "actual engine World shares a normal-action rescue, burst and complete snapshot",
    async () => {
      const t = transport([0, 1], false, ActualWorld);
      for (const c of t.clients) await c.net.connect();
      t.start();
      t.advance(3.1);
      for (let i = 0; i < 600 && !t.host.net.world.rescued.length; i++) {
        const world = t.host.net.world,
          crystal = world.entities.find((e) => e.type === "crystal");
        const dx = crystal.x - world.ship.x,
          dy = crystal.y - world.ship.y,
          distance = Math.hypot(dx, dy);
        t.tick({
          0: { mx: dx / distance, my: dy / distance },
          1: { mx: dx / distance, my: dy / distance, burst: i === 50 },
        });
      }
      t.advance(0.4);
      const a = t.host.net.world,
        b = t.clients[1].net.world;
      assert.equal(a.rescued.length, 1);
      assert.deepEqual(ordinary(b.rescued), ordinary(a.rescued));
      assert.equal(a.score, 20);
      assert.equal(b.score, a.score);
      assert.equal(a.burstCount, 1);
      assert.equal(a.ship.hull, 3);
      assert.equal(b.ship.hull, 3);
      assert.equal(b.definition.name, a.definition.name);
      assert.deepEqual(ordinary(b.config), ordinary(a.config));
      assert.ok(t.host.net.metrics.maxBytes < 16000);
      assert.ok(t.clients[1].net.metrics.snapshots >= 4);
    },
  );

  await check("actual server-only World resolves time-up and terminal race once", async () => {
    const t = transport([0, 1], true, ActualWorld);
    for (const c of t.clients) await c.net.connect();
    t.start();
    t.advance(3.5);
    t.emit(t.host.id, "time-up", { graceMs: 1000 });
    t.host.net.world.finish(true, "late-victory");
    t.advance(0.7);
    const outcome = t.host.net.world.outcome;
    assert.equal(outcome.won, false);
    assert.equal(outcome.reason, "round-clock");
    assert.equal(t.host.hub.finishes.length, 1);
    assert.deepEqual(t.host.hub.finishes[0].standings, [[0, 1]]);
    assert.equal(t.clients[0].net.world.outcome.reason, "round-clock");
  });

  await check(
    "actual two-copy operation wins using only ordinary pilot and remote navigator intentions",
    async () => {
      const t = transport([0, 1], false, ActualWorld);
      for (const c of t.clients) await c.net.connect();
      t.start();
      t.advance(3.1);
      let steps = 0;
      while (!t.host.net.world.outcome && steps++ < 120 * 1200) {
        const pilot = realContext.FWR.botIntent(t.host.net.world);
        const navigator = realContext.FWR.botIntent(t.clients[1].net.world);
        t.tick({ 0: pilot, 1: navigator });
      }
      t.advance(0.7);
      const host = t.host.net.world,
        client = t.clients[1].net.world;
      assert.equal(
        host.outcome?.won,
        true,
        JSON.stringify({
          tick: host.tick,
          sector: host.sector,
          hull: host.ship.hull,
          x: host.ship.x,
          objective: host.objective,
          outcome: host.outcome,
        }),
      );
      assert.deepEqual(ordinary(client.outcome), ordinary(host.outcome));
      assert.deepEqual(ordinary(client.rescued), ordinary(host.rescued));
      assert.deepEqual(ordinary(client.lost), ordinary(host.lost));
      assert.equal(client.score, host.score);
      assert.ok(
        host.seenTypes.includes("guard") &&
          host.seenTypes.includes("organ") &&
          host.seenTypes.includes("core"),
      );
      assert.ok(host.seenPhases.includes("3:prisoners") && host.seenPhases.includes("3:core"));
      assert.ok(host.burstCount > 0);
      assert.equal(host.debugModified, false);
      assert.equal(host.dev.invulnerable, false);
      assert.equal(t.host.hub.finishes.length, 1);
    },
  );

  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = await runNetTests();
  for (const result of results)
    if (!result.pass) console.error(`FAIL ${result.name}\n${result.detail}`);
  console.log(`${results.filter((r) => r.pass).length}/${results.length} network checks passed`);
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}
