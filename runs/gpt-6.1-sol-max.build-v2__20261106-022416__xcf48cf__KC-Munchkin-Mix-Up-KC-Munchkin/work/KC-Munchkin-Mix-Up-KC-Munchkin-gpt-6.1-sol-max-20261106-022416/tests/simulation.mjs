import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { loadCore, root } from "../tools/load.mjs";

const M = loadCore(["net/session", "audio/sound", "view/theatre"]);
let passed = 0,
  failed = 0;
const failures = [],
  details = {};
const test = (name, fn) => {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(name + ": " + e.message);
  }
};
const world = (options = {}) => {
  const w = new M.World(options);
  w.phase = "playing";
  w.events = [];
  return w;
};
const still = (m, dt = 1 / 120) => m.update(dt, { neighbor: () => null }, -1, { stop: true });
const pinFood = (w) => w.food.forEach((f) => (f.wait = 9999));
const enemyContact = (w, p = w.players[0], enemy = w.predators[0]) => {
  p.inv = 0;
  enemy.state = "hunting";
  enemy.m.place(p.m.cx, p.m.cy);
  enemy.pending = -1;
  enemy.decision = 999;
};

test("every board validates in all gate orientations", () => {
  for (let i = 0; i < 6; i++) {
    const d = M.stage(i);
    assert.equal(M.validate(d).ok, true, "stage " + i);
    const b = new M.Board(d);
    for (let g = 0; g < 4; g++) {
      b.setOrientation(g);
      assert.equal(b.distances(...d.spawns[0]).size, b.floorCells().length);
    }
  }
});
test("expiring early turn is taken at a junction", () => {
  const b = new M.Board(M.stage(0)),
    m = new M.GraphMover(2, 3, 6);
  m.update(0.12, b, 1, { time: 0 });
  m.update(0.06, b, 0, { time: 0.12 });
  assert.equal(m.d, 0);
  assert.equal(m.cx, 3);
  assert(m.y < 3);
});
test("released held input stops at the next centre", () => {
  const b = new M.Board(M.stage(0)),
    m = new M.GraphMover(1, 15, 6);
  m.update(0.09, b, 1, { time: 0 });
  m.update(0.12, b, -1, { time: 0.09 });
  assert.equal(m.x, 2);
  assert.equal(m.moving, false);
});
test("mid-edge reversal preserves position and speed", () => {
  const b = new M.Board(M.stage(0)),
    m = new M.GraphMover(1, 15, 6);
  m.update(0.06, b, 1, { time: 0 });
  const before = m.x;
  m.update(0.03, b, 3, { time: 0.06 });
  assert(Math.abs(m.x - (before - 0.18)) < 1e-8);
  assert.equal(m.d, 3);
});
test("stale buffered direction expires before a later junction", () => {
  const b = new M.Board(M.stage(0)),
    m = new M.GraphMover(1, 15, 6);
  m.update(0.04, b, 0, { time: 0 });
  m.update(0.05, b, -1, { time: 0.4 });
  assert.equal(m.want, -1);
});
test("diagonal stick intent is stable and rejects drift", () => {
  let d = 1;
  for (const v of [
    [0.7, 0.69],
    [0.69, 0.7],
    [0.72, 0.7],
    [0.7, 0.72],
  ]) {
    d = M.cardinal(v, d);
    assert.equal(d, 1);
  }
  assert.equal(M.cardinal([0.05, 0.1], d), -1);
  assert.equal(M.cardinal([0.1, -1], d), 0);
});
test("walls stop motion without pixel collision", () => {
  const b = new M.Board(M.stage(0)),
    m = new M.GraphMover(1, 1, 6);
  m.update(0.2, b, 0, { time: 0 });
  assert.equal(m.x, 1);
  assert.equal(m.y, 1);
  assert(!m.moving);
});
test("paired tunnel motion and seam reversal remain continuous", () => {
  const b = new M.Board(M.stage(1)),
    m = new M.GraphMover(0, 7, 6);
  m.update(0.05, b, 3, { time: 0 });
  assert(Math.abs(m.x + 0.3) < 1e-8);
  m.update(0.01, b, 1, { time: 0.05 });
  assert(Math.abs(m.x - 20.76) < 1e-8);
  assert(m.segments.every((s) => Math.abs(s.x1 - s.x0) <= 0.061));
  m.place(0, 7);
  for (let i = 0; i < 24; i++) m.update(1 / 120, b, 3, { time: i / 120 });
  assert(m.cx === 20 && m.x < 20);
});
test("swept swaps and tunnel-seam encounters are detected", () => {
  const b = new M.Board(M.stage(1));
  const actor = (x0, x1, y = 3) => ({ segments: [{ t0: 0, t1: 1 / 120, x0, y0: y, x1, y1: y }] });
  assert(Number.isFinite(M.encounter(actor(1, 2), actor(2, 1), b, 0.2)));
  assert(Number.isFinite(M.encounter(actor(-0.4, -0.5, 7), actor(20.5, 20.6, 7), b, 0.2)));
  assert.equal(M.encounter(actor(1, 2), actor(8, 9), b, 0.2), Infinity);
});
test("twelve distinct moving snacks accelerate monotonically", () => {
  const w = world();
  assert.equal(new Set(w.food.map((f) => f.id)).size, 12);
  assert.equal(w.food.filter((f) => f.power).length, 4);
  let last = 0;
  for (let n = 12; n >= 1; n--) {
    const speed = M.foodRatio(n);
    assert(speed >= last);
    last = speed;
  }
  const before = w.food.map((f) => [f.m.x, f.m.y]);
  w.advance(1);
  assert(
    w.food.filter((f, i) => Math.hypot(f.m.x - before[i][0], f.m.y - before[i][1]) > 0.1).length >=
      10,
  );
});
test("simultaneous co-op collection scores one food once", () => {
  const w = world({ seats: [0, 1] });
  pinFood(w);
  w.players.forEach((p) => p.m.place(3, 15));
  w.food[0].m.place(3, 15);
  w.step();
  assert.equal(w.remaining, 11);
  assert.equal(w.score, 1);
  assert.equal(w.stats.perPlayer[0].snacks, 1);
  assert.equal(w.stats.perPlayer[1].snacks, 0);
  w.step();
  assert.equal(w.score, 1);
});
test("power pickup takes priority over simultaneous enemy contact", () => {
  const w = world();
  pinFood(w);
  const p = w.players[0];
  p.m.place(1, 1);
  w.food[8].m.place(1, 1);
  enemyContact(w);
  w.step();
  assert.equal(w.lives, 5);
  assert(w.power > 0);
  assert.equal(w.predators[0].state, "returning");
  assert.equal(w.score, 8);
});
test("power refresh is bounded and resets 5-10-20 chain", () => {
  const w = world();
  pinFood(w);
  const p = w.players[0];
  p.m.place(1, 1);
  w.food[8].m.place(1, 1);
  w.step();
  w.chain = 2;
  w.power = 2;
  w.food[9].m.place(1, 1);
  w.step();
  assert.equal(w.chain, 0);
  assert.equal(w.power, w.tuning.powerDuration);
  for (const e of w.predators) {
    e.state = "frightened";
    e.m.place(1, 1);
    e.decision = 999;
  }
  w.step();
  assert.equal(w.score, 6 + 5 + 10 + 20);
  const score = w.score;
  w.step();
  assert.equal(w.score, score);
});
test("fright warning expiry and harmless recharge states", () => {
  const w = world();
  pinFood(w);
  w.players[0].inv = 999;
  const e = w.predators[0];
  e.state = "hunting";
  e.m.place(3, 3);
  e.decision = 999;
  w.power = 1.51;
  w.advance(0.02);
  assert.equal(e.state, "warning");
  w.advance(1.5);
  assert.equal(e.state, "hunting");
  assert.equal(w.chain, 0);
  e.state = "returning";
  e.decision = 0;
  e.pending = -1;
  e.m.place(3, 3);
  w.advance(12);
  assert.notEqual(e.state, "returning");
  assert(w.lives > 0);
});
test("damage consumes one life during team grace and preserves food", () => {
  const w = world({ seats: [0, 1] });
  pinFood(w);
  for (const p of w.players) p.m.place(1, 15);
  for (const p of w.players) p.inv = 0;
  enemyContact(w);
  w.step();
  assert.equal(w.lives, 4);
  assert.equal(w.remaining, 12);
  assert.equal(w.stats.hits, 1);
  const hit = w.players.find((p) => p.hit > 0);
  w.advance(0.6);
  assert(hit.inv > 1);
  assert.equal(w.lives, 4);
});
test("zero lives fails while a final bite wins the simultaneous tick", () => {
  const w = world();
  pinFood(w);
  w.lives = 1;
  enemyContact(w);
  w.step();
  assert.equal(w.phase, "lost");
  const v = world();
  pinFood(v);
  v.lives = 1;
  for (let i = 1; i < 12; i++) v.food[i].alive = false;
  v.food[0].m.place(1, 15);
  enemyContact(v);
  v.step();
  assert.equal(v.phase, "clear");
  assert.equal(v.stats.hits, 0);
});
test("only the affected co-op hero respawns and teammates never block", () => {
  const w = world({ seats: [0, 1] });
  pinFood(w);
  w.players[1].m.place(5, 15);
  const second = w.players[1].m.x;
  enemyContact(w);
  w.step();
  w.advance(0.55);
  assert.equal(w.players[1].m.x, second);
  assert.equal(w.players[1].hit, 0);
  assert(w.players[0].inv > 0);
});
test("occupied gate crossing defers closure without displacement", () => {
  const w = world({ stage: 2 });
  pinFood(w);
  w.players[0].m.place(10, 6);
  w.gateTime = w.tuning.gateCadence;
  w.step();
  assert.equal(w.board.orientation, 0);
  assert.equal(w.players[0].m.y, 6);
  w.players[0].m.place(10, 7);
  w.step();
  assert.equal(w.board.orientation, 1);
  assert(!w.board.walk(10, 6));
  assert(w.board.walk(12, 8));
});
test("turning pen saves travel at a planned cadence", () => {
  const w = world({ stage: 2 }),
    b = w.board;
  const outer = b.path([10, 5], [13, 8], {
    avoid: (x, y) => b.inPen(x, y) || b.gateIndex(x, y) >= 0,
  });
  const detour = (outer.length - 1) / w.tuning.playerSpeed;
  const timedRide = 0.5 + 6 / w.tuning.playerSpeed;
  assert(detour > timedRide + 0.2, `outer ${detour}s, timed pen ${timedRide}s`);
  details.shortcut = {
    outerCells: outer.length - 1,
    outerSeconds: detour,
    timedRideSeconds: timedRide,
  };
});
test("wall chirp cooldown automatic reveal and bump echo", () => {
  const w = world({ stage: 3 });
  pinFood(w);
  const p = w.players[0];
  p.inv = 999;
  w.reveal = 0;
  assert(w.chirp(p));
  assert(!w.chirp(p));
  assert(w.reveal > 1);
  w.advance(4.1);
  assert(w.chirp(p));
  p.m.place(1, 1);
  w.setIntent(p.id, { d: 0, a: false });
  w.step();
  assert(w.echo.some((e) => e.player === p.id));
  w.stageTime = 7.999;
  w.reveal = 0;
  w.step();
  assert(w.reveal > 1);
});
test("seeded generation is reproducible and validates a bounded seed sample", () => {
  details.generation = { count: 64, fallbacks: 0 };
  const fingerprints = new Set();
  for (let seed = 0; seed < 64; seed++) {
    const a = M.generate(seed),
      b = M.generate(seed);
    assert.deepEqual(a, b);
    assert(M.validate(a).ok, "seed " + seed);
    fingerprints.add(a.rows.join(""));
    if (a.generation.fallback) details.generation.fallbacks++;
  }
  assert(fingerprints.size > 50);
});
test("displayed numeric and word seeds can be entered again", () => {
  for (const seed of ["4242", "green grin"]) {
    const a = M.generate(seed),
      b = M.generate(String(a.seed));
    assert.deepEqual(a.rows, b.rows);
    const w = new M.World({ mode: "remix", seed }),
      v = new M.World({ mode: "remix", seed: a.seed });
    assert.deepEqual(w.data, v.data);
    assert.equal(w.rng.state, v.rng.state);
  }
});
test("invalid maze schemas and disconnected lanes fail actionably", () => {
  for (const edit of [
    (d) => d.rows.pop(),
    (d) => d.food.pop(),
    (d) => (d.food[0].power = true),
    (d) => (d.spawns[0] = [0, 0]),
    (d) => (d.gate.x = 9),
    (d) => (d.tunnels = [{ a: [0, 7], b: [20, 9], ad: 3, bd: 1 }]),
    (d) => {
      const cells = d.rows.map((r) => r.split(""));
      cells[2][2] = ".";
      for (const [x, y] of [
        [2, 1],
        [2, 3],
        [1, 2],
        [3, 2],
      ])
        cells[y][x] = "#";
      d.rows = cells.map((r) => r.join(""));
    },
  ]) {
    const d = M.stage(0);
    edit(d);
    const v = M.validate(d);
    assert(!v.ok);
    assert(v.errors[0].message.length > 10);
  }
});
test("workshop edit undo redo save reload code play roundtrip", () => {
  const storage = new Map(),
    p = new M.Profile({
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
    }),
    e = new M.Editor();
  const original = e.data.rows.join("");
  e.apply(2, 2);
  assert(e.validate().ok);
  assert(e.undo());
  assert.equal(e.data.rows.join(""), original);
  assert(e.redo());
  assert(e.save(p, 1));
  const code = e.export(),
    f = new M.Editor(M.template(1));
  assert(f.import(code));
  assert.deepEqual(f.data, e.data);
  assert(f.load(p, 1));
  const before = f.export();
  assert(!f.import("{bad"));
  assert.equal(f.export(), before);
  const w = world({ mode: "custom", custom: f.data }),
    bot = new M.Bot();
  w.advance(300, (w, p) => bot.intent(w, p));
  assert.equal(w.phase, "won");
});
test("invalid imported metadata and actor identities are rejected", () => {
  for (const edit of [
    (d) => (d.name = {}),
    (d) => (d.hint = null),
    (d) => (d.predators[0].id = "food"),
    (d) => d.food.reverse(),
    (d) => (d.food[0].power = true),
    (d) => (d.reveal.period = 0),
    (d) => (d.seed = -1),
  ]) {
    const d = M.stage(0);
    edit(d);
    assert.equal(M.validate(d).ok, false);
    const e = new M.Editor(),
      before = e.export();
    assert.equal(e.import(JSON.stringify({ format: "mix-up-maze", version: 1, board: d })), false);
    assert.equal(e.export(), before);
  }
});
test("storage corruption and blocked storage fall back safely", () => {
  const p = new M.Profile({
    getItem: () => "{bad",
    setItem: () => {
      throw new Error("blocked");
    },
  });
  assert.equal(p.data.best, 0);
  assert(p.notice);
  assert.equal(p.save(), false);
  assert.equal(p.data.boards.length, 3);
});
test("developer sliders change rules at safe steps and reset", () => {
  const w = world();
  assert(w.setTuning("playerSpeed", 8));
  w.setIntent(0, { d: 1, a: false });
  w.step();
  assert.equal(w.players[0].m.speed, 8);
  assert(w.assisted);
  for (const [key] of M.TUNING) w.setTuning(key, M.DEFAULTS[key]);
  assert.deepEqual(w.tuning, { ...M.DEFAULTS });
});
test("compact packets repair food gate lives stage and reject stale revisions", () => {
  const w = world({ seats: [0, 1], stage: 2, seed: 4242 });
  w.advance(4);
  w.food[2].alive = false;
  w.score = 7;
  w.lives = 3;
  w.board.setOrientation(2);
  const packet = M.pack(w, 1);
  assert(JSON.stringify(packet).length < 1200);
  let client = M.unpack(packet);
  assert(client);
  assert.equal(client.remaining, w.remaining);
  assert.equal(client.board.orientation, 2);
  assert.equal(client.lives, 3);
  assert.equal(client.data.rows.join(""), w.data.rows.join(""));
  w.stageIndex = 4;
  w.loadStage();
  const newer = M.pack(w, 2);
  client = M.unpack(newer, client);
  assert.equal(client.stageIndex, 4);
  assert.equal(client.data.rows.join(""), w.data.rows.join(""));
  assert.equal(M.unpack(packet, client), null);
  assert.equal(M.unpack({ ...newer, f: [] }, client), null);
  details.packetBytes = JSON.stringify(newer).length;
});
test("session intents authenticate sender and reject forged stale malformed input", () => {
  const real = globalThis.AIHub,
    handlers = {};
  globalThis.AIHub = { active: true, isHost: true, on: (event, fn) => (handlers[event] = fn) };
  const n = new M.Session();
  n.players = [0, 1];
  n.world = world({ seats: [0, 1] });
  n.message({ k: "i", q: 1, d: 1, a: 0, player: 0 }, 1);
  assert.equal(n.received.get(1).d, 1);
  assert(!n.received.has(0));
  for (const [data, from] of [
    [{ k: "i", q: 1, d: 1, a: 0 }, 1],
    [{ k: "i", q: 2, d: 7, a: 0 }, 1],
    [{ k: "i", q: 2, d: 1, a: 0 }, 99],
    [{ k: "i", q: 1000001, d: 1, a: 0 }, 1],
  ])
    n.message(data, from);
  assert.equal(n.diagnostics.rejected, 4);
  globalThis.AIHub = real;
});
test("local network prediction moves presentation without claiming food or score", () => {
  const real = globalThis.AIHub;
  globalThis.AIHub = { active: false, isHost: false, server: false, me: 0, time: () => 1000 };
  const n = new M.Session(),
    w = world();
  w.elapsed = 1;
  n.world = M.unpack(M.pack(w, 1));
  n.players = [0];
  n.started = true;
  n.app = { localIntent: () => ({ d: 1, a: false }), game: { paused: false }, ui: null };
  n.reconcilePrediction();
  const before = n.world.players[0].m.x,
    mask = n.world.remaining,
    score = n.world.score;
  n.predict(0.1);
  assert(n.predicted.x > before);
  assert.equal(n.world.players[0].m.x, before);
  assert.equal(n.world.remaining, mask);
  assert.equal(n.world.score, score);
  globalThis.AIHub = real;
});
test("normal legal-input whole campaigns and final-target catches", () => {
  details.playthroughs = [];
  for (const seats of [[0], [0, 1]]) {
    const w = new M.World({ seed: 4242, seats }),
      bots = seats.map((s) => new M.Bot(s));
    let finals = 0,
      maxSegment = 0;
    for (let tick = 0; tick < 120 * 1000 && !["won", "lost"].includes(w.phase); tick++) {
      for (let j = 0; j < w.players.length; j++)
        w.setIntent(w.players[j].id, bots[j].intent(w, w.players[j]));
      const prior = w.remaining;
      w.step();
      for (const p of w.players)
        for (const s of p.m.segments)
          maxSegment = Math.max(maxSegment, Math.hypot(s.x1 - s.x0, s.y1 - s.y0));
      if (prior === 1 && w.remaining === 0) finals++;
    }
    assert.equal(w.phase, "won");
    assert.equal(w.assisted, false);
    assert.equal(w.god, false);
    assert.equal(w.stats.caught, 72);
    assert.equal(w.stats.stages, 6);
    assert.equal(finals, 6);
    assert(maxSegment <= 0.051);
    details.playthroughs.push({
      seats: seats.length,
      time: w.elapsed,
      lives: w.lives,
      score: w.score,
      stages: w.stats.finals,
    });
  }
});
test("normal final interceptions on twenty generated seeds", () => {
  details.remixTraces = [];
  for (let seed = 10; seed < 30; seed++) {
    const w = new M.World({ seed, mode: "remix" }),
      bot = new M.Bot();
    w.advance(300, (w, p) => bot.intent(w, p));
    assert.equal(w.phase, "won", "seed " + seed + " / " + w.remaining + " remaining");
    assert(!w.god && !w.assisted);
    details.remixTraces.push({ seed, seconds: w.elapsed, lives: w.lives });
  }
});
test("native renderer draws ordinary co-op and invisible finale states", () => {
  const g = new M.E.Game({
    headless: true,
    draw: true,
    res: [480, 360],
    view: "overhead",
    menu: false,
  });
  let w = new M.World({ seats: [0, 1], stage: 5 }),
    app = { screen: "play", overlays: true, net: { active: false } },
    view = new M.Theatre(g, app);
  g.start({
    update(dt) {
      w.step();
      view.update(w, dt);
    },
    draw: (r) => view.draw(r, w),
  });
  g.advance(4);
  w.reveal = 0;
  g.input.hold("right");
  g.advance(0.4);
  assert.deepEqual(g.errors, []);
  g.dispose();
});
test("single HTML is self-contained and preserves first-script Hub bytes", () => {
  const project = JSON.parse(readFileSync(path.join(root, "project.json"), "utf8")),
    html = readFileSync(path.join(root, "..", project.base + ".html"), "utf8"),
    client = readFileSync(path.join(root, "vendor/hub/lib/hub/session.js"), "utf8");
  assert(html.startsWith("<!doctype html>"));
  assert(html.includes('<meta charset="utf-8">\n<script>' + client + "</script>"));
  assert(!/<script[^>]+src=|<link[^>]+href=/i.test(html));
  assert(html.includes('hub:session-players" content="1-2'));
  const release = JSON.parse(readFileSync(path.join(root, "../exit-interview.json"), "utf8"));
  assert.equal(release.testingFeedback.length, 4);
  assert.deepEqual(Object.keys(release), [
    "sourceInformation",
    "testingFeedback",
    "engineFeedback",
    "promptFeedback",
    "aiHub",
  ]);
  assert(Object.values(release.sourceInformation).every((v) => typeof v === "string" && v.trim()));
  assert(
    release.aiHub.tags.length >= 3 &&
      release.aiHub.tags.length <= 6 &&
      release.aiHub.tags.every((t) => t === t.toLowerCase()),
  );
  assert.equal(release.engineFeedback.length, 6);
  assert.equal(release.promptFeedback.length, 4);
  assert.equal(release.aiHub.name, project.title);
  assert.equal(release.sourceInformation.usage, "added on import");
});
mkdirSync(path.join(root, "build/reports"), { recursive: true });
writeFileSync(
  path.join(root, "build/reports/simulation.json"),
  JSON.stringify({ passed, failed, skipped: 0, failures, details }, null, 2) + "\n",
);
console.log(JSON.stringify({ passed, failed, skipped: 0, failures, details }));
