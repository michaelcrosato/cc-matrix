import assert from "node:assert/strict";
import fs from "node:fs";
import { load } from "./load.mjs";
export async function rules(test) {
  const { G } = load();
  const world = (opts) => {
    const w = new G.World(opts);
    w.pursuers = [];
    w.core.timer = 999;
    return w;
  };
  const step = (w, sec, a = []) => {
    for (let i = 0; i < Math.round(sec * 120); i++) w.step(a);
  };
  await test("movement normalizes diagonals and brakes", () => {
    const a = world(),
      b = world();
    step(a, 1, [{ mx: 1, my: 1 }]);
    step(b, 1, [{ mx: 1, my: 0 }]);
    assert.ok(Math.abs(Math.hypot(a.players[0].vx, a.players[0].vy) - b.players[0].vx) < 0.1);
    step(a, 0.15);
    assert.equal(a.players[0].vx, 0);
  });
  await test("shooting opens cells without granting bite energy", () => {
    const w = world(),
      p = w.players[0];
    p.x = 380;
    p.y = 140;
    step(w, 1, [{ ax: 1, ay: 0, fire: true }]);
    assert.ok(w.cells.some((c) => !c.alive));
    assert.equal(p.charge, 0);
    assert.equal(w.lessons.shot, true);
  });
  await test("contact bites charge at explicit cadence and award more", () => {
    const w = world(),
      p = w.players[0];
    p.x = 420;
    p.y = 140;
    step(w, 0.7);
    assert.ok(p.charge > 0);
    assert.ok(w.breakdown.bite >= 55);
    assert.ok(w.stats.bites <= 5);
  });
  await test("ordinary projectiles cannot damage docked or flying core", () => {
    const w = world(),
      p = w.players[0];
    w.cells = [];
    p.x = 500;
    p.y = 140;
    step(w, 0.6, [{ ax: 1, ay: 0, fire: true }]);
    assert.equal(w.core.hits, 1);
    assert.ok(w.events.some((e) => e.type === "core-immune"));
    w.core.mode = "flight";
    w.core.vx = w.core.vy = 0;
    step(w, 0.2, [{ ax: 1, ay: 0, fire: true }]);
    assert.equal(w.core.hits, 1);
  });
  await test("static suppresses both commands while retaining energy", () => {
    const w = world(),
      p = w.players[0];
    p.x = 260;
    p.charge = 5;
    step(w, 0.2, [{ fire: true, cannon: 1, ax: 1, ay: 0 }]);
    assert.equal(w.bullets.length, 0);
    assert.equal(w.cannons.length, 0);
    assert.equal(p.charge, 5);
    assert.ok(p.blocked > 0);
  });
  await test("refuge protection matrix rejects only pursuer damage", () => {
    const w = world(),
      p = w.players[0];
    p.x = 260;
    p.inv = 0;
    assert.equal(w.kill(p, "pursuer"), false);
    assert.equal(w.kill(p, "cannon"), true);
    const v = world(),
      q = v.players[0];
    q.x = 260;
    q.inv = 0;
    assert.equal(v.kill(q, "swirl"), true);
  });
  await test("existing shots continue through static", () => {
    const w = world();
    w.bullets.push({ id: 77, owner: 0, x: 230, y: 20, ox: 230, oy: 20, vx: 335, vy: 0, r: 1.4, life: 2 });
    step(w, 0.3);
    assert.ok(w.bullets[0].x > 296);
  });
  await test("static does not delete guided hunters", () => {
    const w = new G.World();
    const id = w.pursuers[0].id;
    w.players[0].x = 260;
    step(w, 5);
    assert.equal(w.pursuers.length, 1);
    assert.equal(w.pursuers[0].id, id);
    assert.equal(w.players[0].alive, true);
  });
  await test("cannon locks lane and starts at the remote left rail", () => {
    const w = world(),
      p = w.players[0];
    p.x = 350;
    p.y = 110;
    p.charge = 5;
    w.step([{ cannon: 1 }]);
    const b = w.cannons[0];
    assert.equal(b.x, 34);
    assert.equal(b.y, 110);
    assert.equal(p.charge, 0);
    p.y = 180;
    step(w, 0.15);
    assert.equal(b.y, 110);
    assert.equal(b.mode, "warning");
  });
  await test("cannon can kill its operator, only once per death", () => {
    const w = world(),
      p = w.players[0];
    p.x = 160;
    p.y = 100;
    p.inv = 0;
    p.charge = 5;
    w.step([{ cannon: 1 }]);
    step(w, 0.6);
    assert.equal(p.alive, false);
    assert.equal(w.reserves, 2);
    w.kill(p, "cannon");
    assert.equal(w.reserves, 2);
  });
  await test("cannon can kill teammate, ordinary shots cannot", () => {
    const w = world({ players: [{ id: 0 }, { id: 1 }] }),
      p = w.players[0],
      q = w.players[1];
    p.x = 350;
    p.y = 100;
    p.inv = 0;
    p.charge = 5;
    q.x = 180;
    q.y = 100;
    q.inv = 0;
    w.step([{ cannon: 1 }, {}]);
    p.y = 180;
    step(w, 0.7);
    assert.equal(q.alive, false);
    assert.equal(p.alive, true);
  });
  await test("duplicate cannon action edges launch once", () => {
    const w = world(),
      p = w.players[0];
    p.charge = 5;
    step(w, 0.2, [{ cannon: 1 }]);
    p.charge = 5;
    step(w, 0.2, [{ cannon: 1 }]);
    assert.equal(w.stats.cannons, 1);
    assert.equal(p.charge, 5);
    assert.equal(p.cannonAck, 1);
  });
  await test("moving shield holes persist through all transforms", () => {
    const w = world({ sector: 1 });
    const c = w.cells[5];
    w.removeCell(c, "shot", w.players[0]);
    const old = w.cellPosition(w.cells[8]).y;
    step(w, 5);
    assert.equal(c.alive, false);
    assert.notEqual(w.cellPosition(w.cells[8]).y, old);
  });
  await test("cannon is spent on an ordinary blocking cell", () => {
    const w = world(),
      p = w.players[0];
    p.x = 100;
    p.y = 140;
    p.charge = 5;
    w.step([{ cannon: 1 }]);
    p.y = 210;
    step(w, 1.6);
    assert.equal(w.stats.cannons, 1);
    assert.equal(w.cannons.length, 0);
    assert.equal(w.core.hits, 1);
    assert.equal(w.cells.filter((c) => !c.alive).length, 1);
  });
  await test("diamond reflection warns, returns once, and cannot bounce forever", () => {
    const w = world(),
      p = w.players[0];
    w.cells = [{ id: "a", index: 0, x: 420, y: 140, plate: 0, material: 1, alive: true }];
    p.charge = 5;
    p.y = 140;
    w.step([{ cannon: 1 }]);
    p.y = 220;
    step(w, 1.2);
    assert.equal(w.stats.reflections, 1);
    assert.equal(w.cannons[0].mode, "reflect-warning");
    step(w, 2);
    assert.equal(w.cannons.length, 0);
    assert.equal(w.stats.reflections, 1);
  });
  await test("a one-cell corridor fits the real cannon radius", () => {
    const w = world(),
      p = w.players[0];
    w.cells = w.cells.filter((c) => c.y !== 140);
    p.charge = 5;
    p.y = 140;
    w.step([{ cannon: 1 }]);
    p.y = 200;
    step(w, 1.6);
    assert.equal(w.status, "collapse");
  });
  await test("too-narrow corridor blocks the actual projectile", () => {
    const w = world(),
      p = w.players[0];
    w.cells = [{ id: "a", index: 0, x: 420, y: 147, plate: 0, material: 0, alive: true }];
    p.charge = 5;
    p.y = 140;
    w.step([{ cannon: 1 }]);
    p.y = 200;
    step(w, 1.6);
    assert.equal(w.core.hits, 1);
    assert.equal(w.cells[0].alive, false);
  });
  await test("vertical wrap targets cells by wrapped distance", () => {
    const w = world(),
      p = w.players[0];
    w.cells = [{ id: "a", index: 0, x: 400, y: 278, plate: 0, material: 0, alive: true }];
    p.x = 400;
    p.y = 2;
    w.step();
    assert.equal(w.cells[0].alive, false);
  });
  await test("wrap never sweeps an actor across the arena", () => {
    const w = world(),
      p = w.players[0];
    p.y = 0.1;
    p.x = 300;
    w.pursuers = [{ id: 9, x: 300, y: 140, angle: 0, r: 5, kind: 0, grace: 0 }];
    w.step([{ mx: 0, my: -1 }]);
    assert.ok(p.y > 270);
    assert.equal(p.alive, true);
  });
  await test("all cells gone still leaves renewable core energy", () => {
    const w = world(),
      p = w.players[0];
    w.cells = [];
    p.charge = 0;
    p.x = 550;
    p.y = 140;
    w.step();
    assert.equal(p.charge, 5);
    p.charge = 0;
    step(w, 2.6);
    assert.equal(p.charge, 5);
  });
  await test("Swirl is the fortress, commits to a path and returns", () => {
    const w = world();
    w.core.timer = 0;
    w.step();
    assert.equal(w.core.mode, "windup");
    const vx = w.core.vx,
      vy = w.core.vy;
    w.players[0].y += 60;
    step(w, 1.4);
    assert.equal(w.core.mode, "flight");
    assert.equal(w.core.vx, vx);
    assert.equal(w.core.vy, vy);
    step(w, 6);
    assert.equal(w.core.mode, "dock");
  });
  await test("airborne cannon interception grants capped reserve reward", () => {
    const w = world();
    w.core.mode = "flight";
    w.core.vx = w.core.vy = 0;
    w.reserves = 7;
    assert.equal(w.hitCore({ epoch: 0 }), true);
    assert.equal(w.reserves, 8);
    assert.equal(w.stats.intercepts, 1);
    assert.ok(w.score >= 3600);
  });
  await test("simultaneous core hits cannot skip phase or duplicate reward", () => {
    const w = world({ sector: 2 });
    w.core.mode = "flight";
    w.reserves = 5;
    assert.equal(w.hitCore({ epoch: 0 }), true);
    assert.equal(w.hitCore({ epoch: 0 }), false);
    assert.equal(w.core.hits, 2);
    assert.equal(w.phase, 1);
    assert.equal(w.reserves, 6);
  });
  await test("simultaneous bites cannot award a cell twice", () => {
    const w = world({ players: [{ id: 0 }, { id: 1 }] });
    w.cells = [{ id: "a", index: 0, x: 400, y: 140, plate: 0, material: 0, alive: true }];
    for (const p of w.players) {
      p.x = 400;
      p.y = 140;
    }
    w.step();
    assert.equal(w.stats.bites, 1);
    assert.equal(
      w.players.reduce((n, p) => n + p.charge, 0),
      1,
    );
  });
  await test("shared reserve is paid once for each co-op death", () => {
    const w = world({ players: [{ id: 0 }, { id: 1 }] });
    for (const p of w.players) p.inv = 0;
    w.reserves = 1;
    w.kill(w.players[0], "swirl");
    w.kill(w.players[1], "swirl");
    w.step();
    assert.equal(w.reserves, 0);
    assert.equal(w.outcome, null);
    step(w, 1.5);
    assert.equal(w.players[0].alive, true);
    assert.equal(w.players[1].alive, false);
  });
  await test("total elimination with no paid respawn defeats the swarm", () => {
    const w = world({ players: [{ id: 0 }, { id: 1 }] });
    w.reserves = 0;
    for (const p of w.players) {
      p.inv = 0;
      w.kill(p, "swirl");
    }
    w.step();
    assert.equal(w.outcome, "defeat");
  });
  await test("spawn protection ends and ordinary damage works again", () => {
    const w = world(),
      p = w.players[0];
    p.inv = 0;
    w.kill(p, "swirl");
    step(w, 1.5);
    assert.ok(p.inv > 2);
    assert.equal(w.kill(p, "swirl"), false);
    step(w, 2.6);
    assert.equal(w.kill(p, "swirl"), true);
  });
  await test("sector clear restores eliminated partner and awards one reserve", () => {
    const w = world({ players: [{ id: 0 }, { id: 1 }] });
    w.players[1].alive = false;
    w.players[1].respawn = -1;
    w.reserves = 2;
    w.hitCore({ epoch: 0 });
    step(w, 3.1);
    assert.equal(w.status, "transition");
    assert.equal(w.players[1].alive, true);
    assert.equal(w.reserves, 3);
    step(w, 1);
    assert.equal(w.reserves, 3);
  });
  await test("idle refuge cannot farm points or chain", () => {
    const w = world();
    w.players[0].x = 260;
    step(w, 9);
    assert.equal(w.score, 0);
    assert.equal(w.chain, 1);
  });
  await test("final dock cannot take the final hit", () => {
    const w = world({ sector: 2 });
    w.phase = 2;
    w.core.hits = 1;
    assert.equal(w.hitCore({ epoch: 0 }), false);
    assert.equal(w.core.hits, 1);
    assert.equal(w.status, "playing");
  });
  await test("validated live tuning applies only on a boundary and marks practice", () => {
    const w = world();
    w.queueTuning({ speed: 999, bite: NaN, charge: 0, reserve: 4 });
    assert.equal(w.tuning.speed, 116);
    w.step();
    assert.equal(w.tuning.speed, 220);
    assert.equal(w.tuning.bite, 0.15);
    assert.equal(w.tuning.charge, 1);
    assert.equal(w.reserves, 4);
    assert.equal(w.practice, true);
  });
  await test("authoring export/import validates completed layout and rejects malformed data", () => {
    const a = G.encounterOf(1);
    a.cells[0].material = 1;
    a.cells.splice(3, 1);
    const b = G.validateEncounter(JSON.parse(JSON.stringify(a)));
    assert.equal(b.cells.length, a.cells.length);
    assert.equal(b.cells[0].material, 1);
    assert.throws(() =>
      G.validateEncounter({ ...a, plates: [{ amplitude: Infinity, period: 0, phase: 0 }] }),
    );
    assert.throws(() => G.validateEncounter({ ...a, cells: [a.cells[0], a.cells[0]] }));
  });
  await test("snapshot is read-only and preserves deterministic state", () => {
    const w = world();
    step(w, 2, [{ mx: 1, my: -0.4, fire: true }]);
    const hash = w.hash(),
      s = w.snapshot();
    s.players[0].charge = 999;
    s.cells[0].alive = false;
    assert.equal(w.hash(), hash);
  });
}
export async function campaign(test) {
  const { G } = load();
  const play = (opts = {}, limit = 120 * 500) => {
    const w = new G.World(opts),
      p = new G.Pilot(),
      trace = [];
    for (let i = 0; i < limit && !w.outcome; i++) {
      const a = p.actions(w);
      if (i % 60 === 0)
        trace.push({
          tick: i,
          actions: a,
          sector: w.sector,
          phase: w.phase,
          mode: w.core.mode,
          score: w.score,
        });
      w.step(a);
    }
    return { w, trace };
  };
  for (const seed of [41739, 11, 925])
    await test(`ordinary-action full campaign completes seed ${seed}`, () => {
      const { w, trace } = play({ seed });
      fs.writeFileSync(
        `tests/artifacts/campaign-${seed}.json`,
        JSON.stringify({ status: w.status, time: w.time, stats: w.stats, trace, events: w.history }, null, 2),
      );
      assert.equal(w.outcome, "victory");
      assert.equal(w.sector, 2);
      assert.equal(w.phase, 2);
      assert.ok(
        w.lessons.bitten && w.lessons.charged && w.lessons.called && w.lessons.intercept && w.lessons.refill,
      );
      assert.equal(w.cheats.invulnerable, false);
      assert.equal(w.practice, false);
      assert.ok(w.breakdown.ending > 0);
      const old = w.score;
      for (let i = 0; i < 120; i++) w.step();
      assert.equal(w.score, old);
    });
  await test("Assist retains every boss phase with separate difficulty flag", () => {
    const { w } = play({ difficulty: "Assist" });
    assert.equal(w.outcome, "victory");
    assert.equal(w.difficulty, "Assist");
    assert.equal(w.phase, 2);
  });
  await test("two simultaneous ordinary action pilots complete campaign", () => {
    const { w, trace } = play({ players: [{ id: 0 }, { id: 1 }] });
    fs.writeFileSync(
      "tests/artifacts/campaign-coop.json",
      JSON.stringify({ outcome: w.outcome, stats: w.stats, trace }, null, 2),
    );
    assert.equal(w.outcome, "victory");
    assert.ok(w.players.length === 2);
  });
  await test("final phase recovers from zero cells, zero charge and newly respawned scout", () => {
    const w = new G.World({ sector: 2 }),
      p = w.players[0],
      bot = new G.Pilot();
    w.phase = 2;
    w.core.hits = 1;
    w.cells.forEach((c) => (c.alive = false));
    p.charge = 0;
    p.inv = 0;
    w.reserves = 1;
    w.kill(p, "swirl");
    assert.equal(w.reserves, 0);
    for (let i = 0; i < 120 * 140 && !w.outcome; i++) w.step(bot.actions(w));
    fs.writeFileSync(
      "tests/artifacts/final-recovery.json",
      JSON.stringify({ outcome: w.outcome, stats: w.stats, events: w.history }, null, 2),
    );
    assert.equal(w.outcome, "victory");
    assert.ok(w.stats.refills >= 1);
    assert.ok(w.stats.intercepts >= 1);
  });
  await test("missed final shot returns to a renewable dock and can still win", () => {
    const w = new G.World({ sector: 2 }),
      p = w.players[0],
      bot = new G.Pilot();
    w.phase = 2;
    w.core.hits = 1;
    w.cells = [];
    p.charge = 5;
    p.x = 150;
    p.y = 230;
    w.step([{ cannon: 1 }]);
    p.y = 200;
    for (let i = 0; i < 300; i++) w.step();
    assert.equal(w.core.hits, 1);
    assert.equal(w.cannons.length, 0);
    for (let i = 0; i < 120 * 180 && !w.outcome; i++) w.step(bot.actions(w));
    assert.equal(w.outcome, "victory");
    assert.ok(w.stats.refills > 0);
  });
  await test("edited encounter can be exported, loaded and won using real actions", () => {
    const encounter = G.encounterOf(0);
    encounter.cells = encounter.cells.filter((c, i) => i % 6 !== 0);
    encounter.refuge.x = 220;
    encounter.plates[0].amplitude = 8;
    const { w } = play({
      practice: true,
      encounter: G.validateEncounter(JSON.parse(JSON.stringify(encounter))),
    });
    assert.equal(w.outcome, "victory");
    assert.equal(w.practice, true);
  });
  await test("seeded trace repeats exactly", () => {
    const a = play({ seed: 832 }),
      b = play({ seed: 832 });
    assert.equal(a.w.hash(), b.w.hash());
    assert.equal(JSON.stringify(a.trace), JSON.stringify(b.trace));
  });
  await test("draw-enabled engine and undrawn headless have identical gameplay hash", () => {
    const a = load({ app: true }),
      b = load({ app: true });
    for (const s of [a, b]) {
      s.app.game.advance(0.1);
      assert.equal(s.app.game._booting, false);
      s.app.startRun();
      s.app.game.advance(0.05);
    }
    for (let i = 0; i < 800; i++) {
      const action = { mx: Math.sin(i * 0.01), my: Math.cos(i * 0.01), ax: 1, ay: 0, fire: true };
      a.app.testActions = [action];
      b.app.testActions = [action];
      a.app.game.advance(G.DT, { draw: true });
      b.app.game.advance(G.DT, { draw: false });
    }
    assert.equal(a.app.game.sceneName, "play");
    assert.equal(a.app.world.hash(), b.app.world.hash());
    assert.equal(a.app.game.errors.length, 0);
    assert.equal(b.app.game.errors.length, 0);
  });
}
