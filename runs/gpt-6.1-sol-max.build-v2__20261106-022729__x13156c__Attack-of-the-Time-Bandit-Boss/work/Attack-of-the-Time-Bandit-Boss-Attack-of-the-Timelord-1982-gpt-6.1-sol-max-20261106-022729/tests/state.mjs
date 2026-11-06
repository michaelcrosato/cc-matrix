import assert from "node:assert/strict";
import "../vendor/engine/my-3d2dge.js";
import {
  DEFAULTS,
  WEAPONS,
  WAVES,
  BOSS_PHASES,
  validateContent,
  ARENA,
} from "../src/content/campaign.js";
import {
  createWorld,
  stepWorld,
  startEncounter,
  spawnThreat,
  acceptAction,
  activateBrake,
  leaveWorld,
  finishWorld,
  sweptHit,
  botAction,
  worldPacket,
  applyWorldPacket,
} from "../src/game/simulation.js";
export function stateTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.stack });
    }
  };
  const run = (w, seconds) => {
    for (let i = 0; i < seconds * 120; i++) stepWorld(w);
  };
  const play = () => {
    const w = createWorld();
    startEncounter(w, 0);
    return w;
  };
  test("authored campaign and immutable baseline", () => {
    assert.deepEqual(validateContent(), []);
    assert.equal(WAVES.length, 8);
    assert.equal(BOSS_PHASES.length, 3);
    assert(Object.isFrozen(DEFAULTS));
  });
  test("action ownership, finite ranges and sequence validation", () => {
    const w = play();
    assert(!acceptAction(w, 7, { k: "a", n: 0, m: 0, x: null, f: true, b: 0 }));
    for (const bad of [
      { m: NaN },
      { x: 999 },
      { f: 1 },
      { b: Infinity },
      { n: -1 },
    ])
      assert(
        !acceptAction(w, 0, {
          k: "a",
          n: 0,
          m: 0,
          x: null,
          f: false,
          b: 0,
          ...bad,
        }),
      );
    assert(acceptAction(w, 0, { k: "a", n: 1, m: 1, x: null, f: true, b: 0 }));
    assert(
      !acceptAction(w, 0, { k: "a", n: 1, m: 0, x: null, f: false, b: 0 }),
    );
  });
  test("stale movement and fire expire", () => {
    const w = play();
    acceptAction(w, 0, { k: "a", n: 0, m: 1, x: null, f: true, b: 0 });
    run(w, 0.5);
    const x = w.players[0].x;
    run(w, 1);
    assert.equal(w.players[0].x, x);
    assert.equal(w.players[0].vx, 0);
  });
  test("one live normal shot per player and no friendly fire", () => {
    const w = createWorld({ seats: [{ id: 0 }, { id: 1 }] });
    startEncounter(w, 0);
    for (let i = 0; i < 120; i++) {
      for (const p of w.players)
        acceptAction(w, p.id, { k: "a", n: i, m: 0, x: 320, f: true, b: 0 });
      stepWorld(w);
      assert(w.shots.filter((s) => s.owner === 0).length <= 1);
      assert(w.shots.filter((s) => s.owner === 1).length <= 1);
    }
    assert(w.players.every((p) => p.hp === 3));
  });
  test("fast shot swept test catches a thin moving target", () => {
    assert(
      sweptHit(
        { px: 100, py: 310, x: 100, y: 250 },
        { px: 100, py: 280, x: 102, y: 281 },
        6,
      ),
    );
    assert(
      !sweptHit(
        { px: 10, py: 310, x: 10, y: 250 },
        { px: 100, py: 280, x: 102, y: 281 },
        6,
      ),
    );
  });
  test("intercept removals precede hostile damage", () => {
    const w = play();
    w.enemies = w.enemies.slice(0, 1);
    w.enemies[0].d = -900;
    const p = w.players[0];
    p.x = 170;
    const t = spawnThreat(w, "dart", { x: p.x, y: p.y - 11, warn: 0 });
    t.state = "air";
    t.vy = 0;
    w.shots = [
      { id: 10, owner: 0, x: p.x, y: p.y - 2, px: p.x, py: p.y - 2, r: 3 },
    ];
    stepWorld(w);
    assert.equal(p.hp, 3);
    assert.equal(w.stats.intercepts, 1);
    assert.equal(w.score, 2);
    assert.equal(w.threats.length, 0);
  });
  test("one overlap produces one hit and recovery interval", () => {
    const w = play();
    const p = w.players[0];
    for (let i = 0; i < 5; i++) {
      const t = spawnThreat(w, "dart", { x: p.x, y: p.y, warn: 0 });
      t.state = "air";
      t.vy = 0;
    }
    stepWorld(w);
    assert.equal(p.hp, 2);
    assert.equal(w.stats.hits, 1);
    assert.equal(w.events.filter((e) => e.type === "hit").length, 1);
    assert(p.inv > 2);
  });
  test("solo loss and terminal state are idempotent", () => {
    const w = play();
    w.players[0].hp = 1;
    const p = w.players[0],
      t = spawnThreat(w, "dart", { x: p.x, y: p.y, warn: 0 });
    t.state = "air";
    t.vy = 0;
    stepWorld(w);
    assert.equal(w.phase, "results");
    assert.equal(w.outcome.won, false);
    const tick = w.tick;
    run(w, 1);
    assert.equal(w.tick, tick);
    assert(!finishWorld(w, true));
    assert.equal(w.finishCount, 1);
  });
  test("partial co-op disable recovers at clear", () => {
    const w = createWorld({ seats: [{ id: 0 }, { id: 1 }] });
    startEncounter(w, 0);
    w.players[0].hp = 0;
    w.enemies = [];
    stepWorld(w);
    assert.equal(w.phase, "intermission");
    assert.equal(w.players[0].hp, 1);
    assert(!w.outcome);
    assert.equal(w.threats.length, 0);
  });
  test("departed pilot cannot keep team alive", () => {
    const w = createWorld({ seats: [{ id: 0 }, { id: 1 }] });
    startEncounter(w, 0);
    w.players[0].hp = 0;
    leaveWorld(w, 1);
    assert(w.outcome);
    assert.equal(w.finishCount, 1);
  });
  test("simultaneous brake requests activate once", () => {
    const w = createWorld({ seats: [{ id: 0 }, { id: 1 }] });
    startEncounter(w, 0);
    w.brake = 100;
    for (const p of w.players)
      acceptAction(w, p.id, { k: "a", n: 1, m: 0, x: null, f: false, b: 1 });
    stepWorld(w);
    assert.equal(w.stats.brakes, 1);
    assert.equal(w.events.filter((e) => e.type === "brake").length, 1);
    w.brake = 100;
    run(w, 3);
    assert.equal(w.stats.brakes, 1);
  });
  test("brake affects hostile motion but not player or shots", () => {
    const a = play(),
      b = play();
    a.brake = 100;
    activateBrake(a, 0);
    for (const w of [a, b]) {
      const t = spawnThreat(w, "dart", { x: 600, y: 160, warn: 0 });
      t.state = "air";
      acceptAction(w, 0, { k: "a", n: 0, m: 1, x: null, f: true, b: 0 });
    }
    run(a, 0.3);
    run(b, 0.3);
    assert.equal(a.players[0].x, b.players[0].x);
    assert.equal(a.shots[0]?.y, b.shots[0]?.y);
    assert(
      Math.abs(
        (a.threats[0].y - 160) / (b.threats[0].y - 160) - DEFAULTS.slowFactor,
      ) < 0.02,
    );
  });
  test("brake ends without catch-up attacks", () => {
    const w = play();
    w.brake = 100;
    activateBrake(w, 0);
    w.attackClock = 1;
    run(w, 1.7);
    assert.equal(w.brakeLeft, 0);
    assert(w.attackClock > 0);
    assert.equal(w.threats.length, 0);
  });
  test("dart falls with limited lateral drift", () => {
    const w = play();
    const t = spawnThreat(w, "dart", { x: 400, y: 100, warn: 0 });
    run(w, 0.5);
    assert(t.y > 130);
    assert(Math.abs(t.x - 400) < 7);
  });
  test("mine turns toward host-selected target at bounded rate", () => {
    const w = play();
    const t = spawnThreat(w, "mine", { x: 400, y: 150, warn: 0 });
    run(w, 0.3);
    assert(t.vx < 0);
    assert(t.vy > 0);
    assert(
      Math.abs(Math.atan2(t.vy, t.vx) - Math.PI / 2) <=
        DEFAULTS.mineTurn * 0.31,
    );
  });
  test("hunter predicts once, warns and then commits", () => {
    const w = play(),
      p = w.players[0];
    p.vx = 100;
    const t = spawnThreat(w, "hunter", { x: 320, y: 100, warn: 0.6 });
    const mark = t.tx;
    p.x = 500;
    p.vx = -200;
    run(w, 0.4);
    assert.equal(t.tx, mark);
    assert.equal(t.state, "warn");
    run(w, 0.3);
    assert.equal(t.state, "air");
    assert(t.vx < 0);
    const vx = t.vx;
    p.x = 100;
    run(w, 0.3);
    assert.equal(t.vx, vx);
  });
  test("roller lands, remains unshootable and has bounded expiry", () => {
    const w = play();
    const t = spawnThreat(w, "roller", { y: 250, warn: 0 });
    assert(t);
    w.players[0].x = 590;
    run(w, 1.1);
    assert(t.ground);
    assert.equal(t.state, "ground");
    assert(Math.abs(t.to - t.from) <= 111);
    run(w, 2.5);
    assert(!w.threats.includes(t));
  });
  test("roller sweep leaves a reachable escape and reserves its refuge", () => {
    for (const x of [38, 100, 300, 500, 602]) {
      const w = play();
      w.players[0].x = x;
      const r = spawnThreat(w, "roller", { y: 160, warn: 0.7 });
      assert(r);
      const lo = Math.min(r.from, r.to) - 24,
        hi = Math.max(r.from, r.to) + 24;
      assert(lo > ARENA.left || hi < ARENA.right);
      const escape = Math.min(Math.abs(x - lo), Math.abs(x - hi));
      assert(escape < DEFAULTS.playerSpeed * ((304 - 160) / 61 + 0.7));
      assert.equal(spawnThreat(w, "dart", { x: r.safe, y: 280 }), null);
    }
  });
  test("wave clear cancels every threat before intermission", () => {
    const w = play();
    spawnThreat(w, "hunter");
    spawnThreat(w, "mine");
    w.enemies = [];
    stepWorld(w);
    assert.equal(w.phase, "intermission");
    assert.equal(w.threats.length, 0);
    assert.equal(w.shots.length, 0);
    run(w, 3.3);
    assert.equal(w.wave, 1);
  });
  test("boss armored and open states have distinct damage rules", () => {
    const w = play();
    startEncounter(w, 8, 0);
    w.boss.clock = 0;
    w.boss.x = 320;
    w.shots = [{ id: 1, owner: 0, x: 320, y: 125, px: 320, py: 125, r: 3 }];
    const hp = w.boss.hp;
    stepWorld(w);
    assert.equal(w.boss.hp, hp);
    w.boss.clock = 4;
    w.shots = [
      {
        id: 2,
        owner: 0,
        x: w.boss.x,
        y: w.boss.y + 8,
        px: w.boss.x,
        py: w.boss.y + 8,
        r: 3,
      },
    ];
    stepWorld(w);
    assert.equal(w.boss.hp, hp - 1);
  });
  test("inherited nonstandard tuning is marked and resettable", () => {
    const w = createWorld({
      tuning: { playerSpeed: DEFAULTS.playerSpeed + 10 },
    });
    assert(w.modified);
    assert(!createWorld().modified);
    assert.equal(DEFAULTS.playerSpeed, 220);
  });
  test("compact snapshot roundtrip preserves shared gameplay", () => {
    const w = createWorld({
      seats: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }],
    });
    startEncounter(w, 7);
    run(w, 8);
    const packet = worldPacket(w),
      out = applyWorldPacket(null, packet, w.players);
    assert(out);
    assert.equal(out.tick, w.tick);
    assert.equal(out.enemies.length, w.enemies.length);
    assert.equal(out.score, w.score);
    assert.equal(out.players.length, 4);
    assert(Buffer.byteLength(JSON.stringify(packet)) < 16384);
    assert(!applyWorldPacket(out, { ...packet, n: -1 }, w.players));
  });
  test("malformed and nonfinite authoritative packet rejected", () => {
    const p = worldPacket(play());
    assert(
      !applyWorldPacket(null, { ...p, ps: [[0, 0, NaN, 3, 0, 0, 1, 0, 0, 0]] }),
    );
    assert(!applyWorldPacket(null, { ...p, es: new Array(65).fill([]) }));
  });
  test("render-independent seed replay is deterministic", () => {
    const a = play(),
      b = play();
    for (let i = 0; i < 120 * 10; i++) {
      for (const w of [a, b]) {
        if (i % 8 === 0) {
          const bot = botAction(w, w.players[0]);
          acceptAction(w, 0, {
            k: "a",
            n: i,
            m: bot.move,
            x: bot.target,
            f: true,
            b: 0,
          });
        }
        stepWorld(w);
      }
    }
    assert.deepEqual(a, b);
  });
  let campaignResult;
  test("legitimate whole campaign clears eight waves and three boss phases", () => {
    const w = createWorld({ seed: 1982 });
    let seq = 0,
      brake = 0,
      maxBytes = 0;
    for (let i = 0; i < 120 * 1200 && !w.outcome; i++) {
      if (i % 8 === 0)
        for (const p of w.players) {
          const a = botAction(w, p);
          if (a.brake) brake++;
          acceptAction(w, p.id, {
            k: "a",
            n: ++seq,
            m: a.move,
            x: a.target,
            f: a.fire,
            b: brake,
          });
        }
      stepWorld(w);
      if (i % 120 === 0)
        maxBytes = Math.max(
          maxBytes,
          Buffer.byteLength(JSON.stringify(worldPacket(w))),
        );
    }
    assert(w.outcome?.won);
    assert.equal(w.finishCount, 1);
    assert.equal(w.clears.length, 8);
    for (let i = 0; i < 3; i++) assert(w.seen.includes("boss" + i));
    for (const k of Object.keys(WEAPONS)) assert(w.seen.includes(k));
    assert(!w.modified);
    assert.equal(w.assists.autoFire, false);
    assert.equal(w.stats.ships, 200);
    assert(w.stats.brakes > 0);
    assert(w.stats.intercepts > 0);
    assert(maxBytes < 16384);
    run(w, 6.1);
    assert.equal(w.phase, "results");
    campaignResult = {
      seconds: w.time,
      score: w.score,
      stats: w.stats,
      seen: w.seen,
      maxSnapshotBytes: maxBytes,
      seed: w.seed,
      health: w.players.map((p) => p.hp),
    };
  });
  test("native game.advance drives canonical 120 Hz simulation", () => {
    const E = globalThis.My3D2dge,
      g = new E.Game({
        headless: true,
        res: [640, 360],
        view: "overhead",
        menu: false,
      }),
      w = createWorld();
    g.start({ update: (dt) => stepWorld(w, dt), draw() {} });
    g.advance(2.01);
    assert.equal(w.tick, 241);
    assert.equal(w.phase, "playing");
    assert.deepEqual(g.errors, []);
    g.dispose();
  });
  test("all ten live balance values change their intended gameplay behavior", () => {
    const make = (key, value) => {
      const w = createWorld({ tuning: { [key]: value } });
      startEncounter(w, 0);
      return w;
    };
    const displacement = (speed) => {
      const w = make("playerSpeed", speed);
      acceptAction(w, 0, { k: "a", n: 1, m: 1, x: null, f: false, b: 0 });
      run(w, 0.3);
      return w.players[0].x;
    };
    assert(displacement(300) > displacement(120) + 40);
    const fall = (speed) => {
      const w = make("missileSpeed", speed),
        t = spawnThreat(w, "dart", { x: 550, y: 120, warn: 0 });
      run(w, 0.4);
      return t.y;
    };
    assert(fall(130) > fall(40) + 25);
    const turn = (rate) => {
      const w = make("mineTurn", rate),
        t = spawnThreat(w, "mine", { x: 500, y: 100, warn: 0 });
      run(w, 0.4);
      return t.vx;
    };
    assert(turn(2) < turn(0.3) - 15);
    const sweep = (speed) => {
      const w = make("rollerSpeed", speed),
        t = spawnThreat(w, "roller", { y: 200, warn: 0 });
      w.players[0].x = 38;
      t.ground = true;
      t.state = "ground";
      t.y = 304;
      t.x = t.from = 250;
      t.to = 360;
      t.life = 3;
      run(w, 0.3);
      return t.x;
    };
    assert(sweep(100) > sweep(30) + 15);
    const mark = (horizon) => {
      const w = make("prediction", horizon);
      w.players[0].vx = 100;
      return spawnThreat(w, "hunter", { x: 500, y: 100 }).tx;
    };
    assert(mark(1.2) > mark(0.2) + 80);
    const shots = (interval) => {
      const w = make("fireInterval", interval);
      startEncounter(w, 8, 0);
      w.boss.clock = 3;
      let count = 0;
      for (let i = 0; i < 300; i++) {
        const a = botAction(w, w.players[0]);
        acceptAction(w, 0, {
          k: "a",
          n: i,
          m: a.move,
          x: a.target,
          f: true,
          b: 0,
        });
        const before = w.eventId;
        stepWorld(w);
        count += w.events.filter(
          (e) => e.id > before && e.type === "shot",
        ).length;
      }
      return count;
    };
    assert(shots(0.07) > shots(0.4));
    const attacks = (interval) => {
      const w = make("enemyInterval", interval);
      w.attackClock = 0;
      w.players[0].inv = 99;
      let count = 0;
      for (let i = 0; i < 900; i++) {
        const before = w.eventId;
        stepWorld(w);
        count += w.events.filter(
          (e) => e.id > before && e.type === "launch",
        ).length;
      }
      return count;
    };
    assert(attacks(1) > attacks(5));
    const duration = (seconds) => {
      const w = make("brakeDuration", seconds);
      w.brake = 100;
      activateBrake(w, 0);
      run(w, 1.1);
      return w.brakeLeft;
    };
    assert(duration(0.8) === 0 && duration(2.5) > 1);
    const slowedFall = (factor) => {
      const w = make("slowFactor", factor);
      w.brake = 100;
      activateBrake(w, 0);
      const t = spawnThreat(w, "dart", { x: 550, y: 150, warn: 0 });
      run(w, 0.4);
      return t.y;
    };
    assert(slowedFall(0.7) > slowedFall(0.2) + 10);
    const charge = (gain) => {
      const w = make("chargeGain", gain),
        p = w.players[0],
        t = spawnThreat(w, "dart", { x: p.x, y: 280, warn: 0 });
      t.state = "air";
      t.vy = 0;
      w.shots = [{ id: 999, owner: 0, x: p.x, y: 302, px: p.x, py: 302, r: 3 }];
      run(w, 0.05);
      return w.brake;
    };
    assert(charge(2) > charge(0.5));
  });
  test("four-pilot legitimate action campaign shares one outcome", () => {
    const w = createWorld({
      seed: 1982,
      seats: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }],
    });
    let n = 0,
      b = 0;
    for (let i = 0; i < 120 * 1000 && !w.outcome; i++) {
      if (i % 8 === 0)
        for (const p of w.players) {
          const a = botAction(w, p);
          if (a.brake) b++;
          acceptAction(w, p.id, {
            k: "a",
            n: ++n,
            m: a.move,
            x: a.target,
            f: a.fire,
            b,
          });
        }
      stepWorld(w);
    }
    assert(w.outcome?.won);
    assert.equal(w.finishCount, 1);
    assert.equal(w.clears.length, 8);
    assert.equal(w.stats.ships, 200);
    assert(!w.modified);
    assert(w.players.every((p) => p.connected));
  });
  return { results, campaign: campaignResult };
}
