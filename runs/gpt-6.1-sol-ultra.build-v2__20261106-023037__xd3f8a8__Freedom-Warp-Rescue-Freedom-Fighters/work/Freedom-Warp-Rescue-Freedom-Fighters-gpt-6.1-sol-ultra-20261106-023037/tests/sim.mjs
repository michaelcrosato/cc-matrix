import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const base = new URL("../", import.meta.url);
function environment() {
  const logs = [],
    c = vm.createContext({
      console: {
        log() {},
        warn: (...a) => logs.push(a.join(" ")),
        error: (...a) => logs.push(a.join(" ")),
      },
    });
  for (const f of [
    "vendor/engine-repo/dist/handoff/my-3d2dge.js",
    "src/config.js",
    "src/content.js",
    "src/sim.js",
    "src/bot.js",
  ])
    vm.runInContext(fs.readFileSync(new URL(f, base), "utf8"), c, { filename: f });
  return { F: c.FWR, E: c.My3D2dge, logs };
}
export async function runSimTests() {
  const results = [],
    { F, E, logs } = environment(),
    plain = (x) => JSON.parse(JSON.stringify(x));
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, detail: e.stack });
    }
  };
  const fresh = (opts = {}) => new F.World(1982, opts);
  const empty = () => {
    const w = fresh();
    w.fixture("empty");
    w.ship.invuln = 0;
    return w;
  };
  const step = (w, a = F.neutral(), seconds = F.STEP) => {
    for (let i = 0; i < Math.round(seconds / F.STEP); i++) w.step({ [w.seats[0]]: a });
  };
  test("authored mission and balance data validate, invalid pattern is rejected", () => {
    assert.deepEqual(plain(F.validateContent()), []);
    const data = plain(F.CONTENT);
    data[1].spawns[0].pattern = "not-a-pattern";
    assert.ok(F.validateContent(data).length);
    const cfg = F.validateConfig({ shipSpeed: Infinity, maxHull: -8, warpCost: 1000 });
    assert.equal(cfg.shipSpeed, 220);
    assert.equal(cfg.maxHull, 1);
    assert.equal(cfg.warpCost, 100);
  });
  test("diagonal flight normalizes and release brakes", () => {
    const a = empty(),
      b = empty();
    step(a, { mx: 1, my: 0 }, 0.7);
    step(b, { mx: 1, my: 1 }, 0.7);
    assert.ok(
      Math.abs(Math.hypot(a.ship.vx, a.ship.vy) - Math.hypot(b.ship.vx, b.ship.vy)) < 0.001,
    );
    step(a, F.neutral(), 0.2);
    assert.equal(a.ship.vx, 0);
  });
  test("solo bearing retained; one cannon cadence for two fire inputs", () => {
    const a = empty(),
      b = empty();
    b.setSeats(["p", "n"]);
    step(a, { ax: 0, ay: -1, fire: true }, 0.5);
    for (let i = 0; i < 60; i++)
      b.step({ p: { ax: 0, ay: -1, fire: true }, n: { ax: 0, ay: -1, fire: true } });
    assert.equal(a.bullets.length, b.bullets.length);
    step(a, F.neutral());
    assert.equal(a.ship.aimY, -1);
  });
  test("navigator previews without cancelling pilot; committed warp cannot rotate", () => {
    const w = empty();
    w.setSeats(["p", "n"]);
    for (let i = 0; i < 30; i++) w.step({ p: { mx: 1 }, n: { mx: 0, my: 1, ax: 0, ay: -1 } });
    assert.ok(w.ship.x > 230);
    assert.equal(w.ship.y, 338);
    assert.equal(w.ship.previewY, 1);
    assert.equal(w.ship.aimY, -1);
    w.step({ p: { mx: -1 }, n: { mx: 1, my: 0, burst: true } });
    for (let i = 0; i < 30; i++) w.step({ p: { my: -1 }, n: { mx: 0, my: 1, burst: true } });
    assert.equal(w.ship.driveX, 1);
    assert.equal(w.ship.driveY, 0);
    assert.equal(w.ship.drive, "burst");
  });
  test("hyperspace requires release and enough energy; no automatic repeated spend", () => {
    const w = empty();
    step(w, { mx: 1, burst: true }, 4);
    assert.equal(w.burstCount, 1);
    step(w, { mx: 1, burst: false }, 0.05);
    step(w, { mx: 1, burst: true }, 0.2);
    assert.equal(w.burstCount, 2);
    const q = empty();
    q.ship.energy = 10;
    step(q, { burst: true }, 0.2);
    assert.equal(q.burstCount, 0);
    assert.ok(q.events.some((e) => e.type === "warpDenied"));
  });
  test("high-speed swept burst contacts rescue collars and active mines", () => {
    const w = empty();
    w.config.warpSpeed = 1500;
    w.ship.drive = "burst";
    w.ship.driveTimer = 0.4;
    w.spawn({ type: "crystal", x: 270, y: 338, tutorial: true, offset: 0 });
    w.spawn({ type: "mine", x: 278, y: 338, state: "active", age: 2, armDelay: 1 });
    w.step({ "local-1": F.neutral() }, 0.05);
    assert.equal(w.rescued.length, 1);
    assert.equal(w.ship.hull, 2);
  });
  test("control clearing and checkpoint retry require release before another hyperspace", () => {
    const w = empty();
    w.clearControls();
    step(w, { mx: 1, burst: true }, 0.3);
    assert.equal(w.burstCount, 0);
    step(w, { mx: 1, burst: false });
    step(w, { mx: 1, burst: true }, 0.2);
    assert.equal(w.burstCount, 1);
    w.restoreCheckpoint();
    const count = w.burstCount;
    step(w, { burst: true }, 0.3);
    assert.equal(w.burstCount, count);
    step(w, { burst: false });
    step(w, { burst: true }, 0.2);
    assert.equal(w.burstCount, count + 1);
  });
  test("rescue wins same-tick laser contact; lingering animation cannot duplicate score", () => {
    const w = empty(),
      c = w.spawn({ type: "crystal", x: 235, y: 338, hp: 1, tutorial: true, offset: 0 });
    w.fireBullet(225, 338, 1, 0);
    step(w);
    assert.equal(w.rescued.length, 1);
    assert.equal(w.lost.length, 0);
    assert.equal(w.score, 20);
    w.rescue(c);
    w.kill(c);
    step(w, F.neutral(), 0.5);
    assert.equal(w.score, 20);
    assert.equal(w.rescued.length, 1);
  });
  test("fragile crystals warn before fatal third hit and chains break", () => {
    const w = empty(),
      c = w.spawn({ type: "crystal", x: 520, y: 338, tutorial: true, offset: 0 });
    w.chain = 4;
    for (let n = 0; n < 3; n++) {
      w.fireBullet(c.x - 10, c.y, 1, 0);
      step(w, F.neutral(), 0.05);
      if (n === 0) {
        assert.equal(w.lost.length, 0);
        assert.equal(c.state, "cracked");
      }
    }
    assert.equal(w.lost.length, 1);
    assert.equal(w.chain, 0);
    assert.ok(w.events.some((e) => e.type === "crystalWarning"));
  });
  test("damage grace rejects repeated hits; depleted hull ends explicitly", () => {
    const w = empty();
    assert.equal(w.damage({ id: "a" }), true);
    assert.equal(w.damage({ id: "b" }), false);
    step(w, F.neutral(), 1.3);
    w.damage({ id: "c" });
    step(w, F.neutral(), 1.3);
    w.damage({ id: "d" });
    step(w);
    assert.equal(w.outcome.won, false);
    assert.equal(w.outcome.reason, "hull-depleted");
  });
  test("unarmed mines harmless; layer death collapses only its own field", () => {
    const w = empty();
    const m = w.spawn({ type: "mine", x: 230, y: 338, armDelay: 2 });
    step(w);
    assert.equal(w.ship.hull, 3);
    m.age = 3;
    step(w);
    assert.equal(w.ship.hull, 2);
    const a = w.spawn({ type: "layer", x: 800, y: 150 }),
      b = w.spawn({ type: "layer", x: 900, y: 500 });
    const ma = w.spawn({ type: "mine", x: 600, y: 120, owner: a.id }),
      mb = w.spawn({ type: "mine", x: 700, y: 500, owner: b.id });
    w.kill(a);
    assert.equal(ma.state, "disarmed");
    assert.notEqual(mb.state, "disarmed");
    assert.equal(w.score, 5);
  });
  test("lost required rescues create reachable replacement and rank penalty", () => {
    const w = empty();
    w.quota = 2;
    w.localRescued = 0;
    for (let i = 0; i < 2; i++)
      w.kill(w.spawn({ type: "crystal", x: 500 + i * 120, y: 180 + i * 130 }));
    step(w, F.neutral(), 3.3);
    const c = w.entities.filter((e) => e.type === "crystal");
    assert.equal(c.length, 2);
    assert.ok(c.every((e) => e.replacement && Math.abs(e.x - w.ship.x) < 700));
    for (const e of c) w.rescue(e);
    step(w, F.neutral(), 4);
    assert.equal(w.rescued.length, 2);
    assert.equal(w.replacements, 1);
    assert.equal(w.score, 40);
  });
  test("replenishing minefields cannot farm unlimited points; owner cap survives snapshots", () => {
    const w = empty(),
      owner = w.spawn({ type: "layer", x: 900, y: 150 });
    for (let i = 0; i < 20; i++) w.kill(w.spawn({ type: "mine", x: 600, y: 150, owner: owner.id }));
    assert.equal(w.score, 4);
    assert.equal(owner.mineScore, 4);
    const q = fresh();
    q.loadSnapshot(w.snapshot());
    q.kill(q.spawn({ type: "mine", x: 600, y: 150, owner: owner.id }));
    assert.equal(q.score, 4);
    q.kill(q.entities.find((e) => e.id === owner.id));
    assert.equal(q.score, 9);
    q.rescue(q.spawn({ type: "crystal", x: 500, y: 338 }));
    assert.equal(q.score, 29);
  });
  test("replacement timing follows simulation time at fractional developer time scale", () => {
    const w = empty();
    w.quota = 1;
    for (let i = 0; i < 1200; i++) w.step({}, F.STEP / 10);
    assert.equal(w.entities.filter((e) => e.type === "crystal").length, 0);
    for (let i = 0; i < 2600; i++) w.step({}, F.STEP / 10);
    assert.equal(w.entities.filter((e) => e.type === "crystal").length, 1);
    assert.ok(w.time >= 3 && w.time < 3.3);
  });
  test("leaving a live optional signal behind records one loss in the next checkpoint", () => {
    const w = fresh();
    w.enter(2);
    w.fixture("empty");
    w.lost = [];
    w.localRescued = 4;
    w.keyKills = 2;
    const c = w.spawn({ type: "crystal", x: 21900, y: 190, optional: true });
    w.beacon = w.spawn({ type: "beacon", x: w.length - 180, y: 338, state: "active" });
    w.ship.x = w.beacon.x;
    w.ship.y = w.beacon.y;
    step(w);
    assert.equal(w.sector, 3);
    assert.deepEqual(plain(w.lost), [c.id]);
    assert.deepEqual(plain(w.checkpoint.lost), [c.id]);
  });
  test("checkpoint retry restores score/ledgers/hull/energy without farming", () => {
    const w = fresh();
    const baseline = plain(w.checkpoint),
      c = w.entities.find((e) => e.type === "crystal");
    w.rescue(c);
    w.ship.energy = 0;
    w.ship.hull = 1;
    assert.ok(w.score > baseline.score);
    assert.equal(w.restoreCheckpoint(), true);
    assert.equal(w.score, baseline.score);
    assert.deepEqual(plain(w.rescued), baseline.rescued);
    assert.equal(w.ship.hull, 3);
    assert.equal(w.ship.energy, 100);
    assert.equal(w.ship.burstHeld, false);
    const resumed = new F.World(1982, { checkpoint: baseline });
    assert.equal(resumed.score, w.score);
    assert.equal(resumed.sector, w.sector);
    const original = fresh();
    assert.deepEqual(
      plain(w.entities),
      plain(original.entities),
      "Retry reconstructs identical entity IDs and seeded trajectories",
    );
  });
  test("live health/hull sliders apply validated values and reset authored defaults", () => {
    const w = empty(),
      e = w.spawn({ type: "organ", x: 800, y: 180, hp: 20 });
    w.setConfig("bossHealth", 2);
    assert.equal(e.maxHp, 40);
    assert.equal(e.hp, 40);
    w.setConfig("maxHull", 5);
    assert.equal(w.ship.hull, 5);
    w.setConfig("warpCost", 18);
    assert.equal(w.config.warpCost, 18);
    w.resetConfig();
    assert.deepEqual(plain(w.config), plain(F.DEFAULTS));
    assert.equal(w.ship.hull, 3);
    assert.equal(w.debugModified, true);
  });
  test("snapshot reconstructs native bullets, all objectives and deterministic future", () => {
    const w = fresh();
    step(w, { mx: 1, fire: true }, 0.8);
    const s = w.snapshot(),
      q = fresh();
    assert.equal(q.loadSnapshot(s), true);
    step(w, { mx: 0.5, my: -0.2, fire: true }, 1);
    step(q, { mx: 0.5, my: -0.2, fire: true }, 1);
    assert.deepEqual(q.snapshot(), w.snapshot());
    assert.notEqual(w.snapshot().ship, w.ship);
  });
  test("carrier core and player death same tick fails before final extraction; extraction wins terminal race", () => {
    const w = fresh();
    w.enter(3);
    w.ship.x = 4900;
    w.spawnContent();
    const core = w.entities.find((e) => e.type === "core");
    w.phase = "core";
    core.state = "active";
    core.hp = 1;
    w.kill(core);
    w.ship.hull = 0;
    step(w);
    assert.equal(w.outcome.won, false);
    const q = fresh();
    q.enter(4);
    q.ship.x = q.beacon.x;
    q.ship.y = q.beacon.y;
    q.ship.hull = 0;
    step(q);
    assert.equal(q.outcome.won, true);
    const score = q.score;
    q.finish(false, "later");
    assert.equal(q.outcome.won, true);
    assert.equal(q.score, score);
  });
  test("whole operation wins with ordinary semantic flight/aim/fire/warp and no cheats", () => {
    const w = fresh();
    for (let i = 0; i < 120000 && !w.outcome; i++) step(w, F.botIntent(w));
    assert.equal(
      w.outcome?.won,
      true,
      JSON.stringify({ t: w.time, sector: w.sector, objective: w.objective, hull: w.ship.hull }),
    );
    assert.equal(w.rescued.length, 13);
    assert.equal(w.lost.length, 0);
    assert.equal(w.replacements, 0);
    assert.ok(w.burstCount > 5);
    assert.equal(w.debugModified, false);
    assert.equal(w.dev.invulnerable, false);
    for (const type of ["layer", "interceptor", "guard", "organ", "core", "carrier"])
      assert.ok(w.seenTypes.includes(type), type);
    for (const p of ["curtain", "ring", "arc"]) assert.ok(w.seenPatterns.includes(p), p);
    for (const p of ["3:organs", "3:prisoners", "3:core", "3:extract"])
      assert.ok(w.seenPhases.includes(p), p);
    fs.writeFileSync(
      new URL("artifacts/operation-playthrough.json", base),
      JSON.stringify(
        {
          outcome: w.outcome,
          types: w.seenTypes,
          phases: w.seenPhases,
          patterns: w.seenPatterns,
          burstCount: w.burstCount,
          hits: w.hitCount,
          debugModified: w.debugModified,
        },
        null,
        2,
      ),
    );
  });
  test("three-minute Evasion reuses flight/rescue rules and cannon remains unavailable", () => {
    const w = fresh({ mode: "evasion" });
    for (let i = 0; i < 22000 && !w.outcome; i++) {
      const a = F.botIntent(w);
      a.fire = true;
      step(w, a);
      assert.ok(!w.bullets.some((b) => b.team === "player"));
    }
    assert.equal(w.outcome?.won, true, JSON.stringify({ t: w.time, hull: w.ship.hull }));
    assert.ok(w.time >= 180 && w.time < 180.02);
    assert.ok(w.rescued.length > 0);
    assert.ok(w.score >= 180);
    fs.writeFileSync(
      new URL("artifacts/evasion-playthrough.json", base),
      JSON.stringify(
        { outcome: w.outcome, bursts: w.burstCount, debugModified: w.debugModified },
        null,
        2,
      ),
    );
  });
  test("native fixed stepping and draw-enabled engine integration stay error-free", () => {
    const game = new E.Game({
        headless: true,
        draw: true,
        view: "overhead",
        res: [600, 338],
        menu: false,
      }),
      w = fresh();
    game.start({
      update: (dt) => w.step({ "local-1": { mx: 1 } }, dt),
      draw: (r) => r.text(w.objective.text, 8, 8, "#ffffff"),
    });
    game.advance(1);
    assert.equal(w.tick, 120);
    assert.deepEqual(plain(game.errors), []);
    assert.deepEqual(logs, []);
    game.dispose();
  });
  return results;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await runSimTests();
  for (const t of r) if (!t.pass) console.error("FAIL " + t.name + "\n" + t.detail);
  console.log(r.filter((t) => t.pass).length + "/" + r.length + " simulation checks passed");
  if (r.some((t) => !t.pass)) process.exitCode = 1;
}
