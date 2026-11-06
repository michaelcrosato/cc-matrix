import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { DT, DEFAULTS, ARENA, STONES, tickOf } from '../src/config.js';
import {
  COURTS,
  RIVALS,
  validateCourt,
  exportCourt,
  connected,
  castleBlocks,
} from '../src/content.js';
import {
  createWorld,
  command,
  step,
  advance,
  planShot,
  predict,
  projectile,
  stepProjectile,
  resolveImpact,
  collapse,
  remaining,
  finish,
  createAI,
  aiStep,
  health,
  pack,
  unpack,
  applyTuning,
  powerOf,
  readyAt,
  sweep,
} from '../src/sim.js';
import { boot } from '../src/app.js';
import { loadTour, saveTour, eraseTour, SAVE_KEY } from '../src/persistence.js';
import { Transport, OnlineMatch } from '../src/online.js';
export async function run(check) {
  const test = (name, fn) => check(name, fn),
    eq = (a, b) => assert.deepEqual(a, b);
  for (const c of COURTS) {
    test(`court ${c.id}: valid definition and round trip`, () => {
      assert.ok(validateCourt({ version: 1, court: c }).ok);
      eq(JSON.parse(exportCourt(c)).court, c);
    });
    test(`court ${c.id}: mirrored fair objectives and support graph`, () => {
      const w = createWorld({ court: c.id });
      eq(
        w.castles[0].map((b) => [b.hp, b.max, b.z, b.support]),
        w.castles[1].map((b) => [b.hp, b.max, b.z, b.support]),
      );
      assert.ok(
        w.castles[0].every((b, i) => b.x + w.castles[1][i].x + b.w === 960),
      );
      assert.ok(w.castles.every((bs) => connected(bs).size === bs.length));
    });
  }
  test('invalid court data rejects malformed roles / dimensions', () => {
    assert.equal(validateCourt({ version: 3 }).ok, false);
    const c = JSON.parse(exportCourt(COURTS[0]));
    c.court.blocks[9].x = Infinity;
    assert.equal(validateCourt(c).ok, false);
  });
  test('full charge holds without wrapping or auto-fire', () => {
    const w = createWorld();
    command(w, 0, { kind: 'begin' });
    advance(w, 3);
    eq(w.coverage.launch, [0, 0, 0]);
    eq(powerOf(w, w.players[0]), 1);
    command(w, 0, { kind: 'release' });
    eq(w.coverage.launch, [1, 0, 0]);
    assert.equal(w.shots.length, 1);
  });
  test('short release cancels; cancel never emits a shot', () => {
    const w = createWorld();
    command(w, 0, { kind: 'begin' });
    advance(w, 0.025);
    command(w, 0, { kind: 'release' });
    eq(w.coverage.launch, [0, 0, 0]);
    command(w, 0, { kind: 'begin' });
    advance(w, 0.5);
    command(w, 0, { kind: 'cancel' });
    advance(w, 1);
    eq(w.coverage.launch, [0, 0, 0]);
  });
  test('medium holds produce useful shots and max overshoots', () => {
    const w = createWorld();
    assert.ok(
      predict(w, 0, 0, 0.7).hits.some((h) =>
        ['crew', 'launcher', 'castle'].includes(h.kind),
      ),
    );
    assert.equal(predict(w, 0, 0, 1).hits[0].kind, 'away');
  });
  test('buffered press starts on ready; early release clears buffer', () => {
    const w = createWorld();
    w.players[0].ready = 120;
    command(w, 0, { kind: 'begin' });
    advance(w, 0.5);
    assert.equal(w.players[0].charge, -1);
    command(w, 0, { kind: 'release' });
    advance(w, 0.6);
    assert.equal(w.players[0].charge, -1);
    w.players[0].ready = w.tick + 30;
    command(w, 0, { kind: 'begin' });
    advance(w, 0.3);
    assert.ok(w.players[0].charge >= 0);
  });
  test('stone locked while charging; selection after cancel', () => {
    const w = createWorld();
    command(w, 0, { kind: 'begin' });
    assert.equal(command(w, 0, { kind: 'stone', stone: 1 }), false);
    command(w, 0, { kind: 'cancel' });
    assert.equal(command(w, 0, { kind: 'stone', stone: 1 }), true);
  });
  test('independent simultaneous holds released in opposite order', () => {
    const w = createWorld();
    command(w, 0, { kind: 'begin' });
    advance(w, 0.2);
    command(w, 1, { kind: 'begin' });
    advance(w, 0.6);
    command(w, 1, { kind: 'release' });
    assert.ok(w.players[0].held);
    command(w, 0, { kind: 'release' });
    assert.equal(w.shots.length, 2);
    assert.ok(w.shots[0].vx < 0 && w.shots[1].vx > 0);
  });
  test('duplicate/stale commands cannot launch twice', () => {
    const w = createWorld();
    command(w, 0, { kind: 'begin', seq: 1 });
    advance(w, 0.9);
    command(w, 0, { kind: 'release', seq: 2 });
    assert.equal(command(w, 0, { kind: 'release', seq: 2 }), false);
    assert.equal(command(w, 0, { kind: 'begin', seq: 0 }), false);
    eq(w.coverage.launch, [1, 0, 0]);
  });
  for (let stone = 0; stone < 3; stone++)
    for (let seat = 0; seat < 2; seat++)
      test(`prediction/live agreement stone ${stone} seat ${seat}`, () => {
        const w = createWorld(),
          power = 0.7;
        command(w, seat, { kind: 'stone', stone });
        const hold = Math.round((power * w.config.chargeTime) / DT) * DT;
        const pred = predict(w, seat, stone, hold / w.config.chargeTime).hits;
        command(w, seat, { kind: 'begin' });
        advance(w, hold);
        command(w, seat, { kind: 'release' });
        advance(w, 4);
        const actual = w.players[seat].last[stone];
        assert.ok(actual);
        assert.ok(
          pred.some(
            (h) =>
              h.kind === actual.kind &&
              Math.abs(h.x - actual.x) < 0.01 &&
              Math.abs(h.z - actual.z) < 0.01,
          ),
        );
        assert.ok(
          w.shots.every((s) => Number.isFinite(s.x + s.z + s.vx + s.vz)),
        );
        if (stone === 2) eq(w.coverage.split, 1);
      });
  test('sweep catches a fast thin target before terrain', () => {
    eq(sweep(0, 50, 1000, 50, { x: 500, z: 40, w: 1, h: 20 }), 0.5);
    const w = createWorld(),
      s = { ...projectile(w, 0, 0, 0.9), x: 100, z: 50, vx: 100000, vz: 0 };
    const hit = stepProjectile(w, s, DT, [
      { x: 500, z: 40, w: 1, h: 20, key: 'thin', kind: 'castle' },
    ]);
    assert.equal(hit.kind, 'castle');
    assert.ok(s.x < 501);
  });
  test('water is first contact on undershoot', () => {
    const w = createWorld();
    assert.equal(predict(w, 0, 0, 0.4).hits[0].kind, 'water');
  });
  for (let c = 0; c < 5; c++)
    for (let stone = 0; stone < 3; stone++)
      test(`court ${c}: launcher, crew and elevated masonry reachable stone ${stone}`, () => {
        const w = createWorld({ court: c }),
          seen = new Set();
        for (let p = 0.1; p < 1; p += 0.003)
          for (const h of predict(w, 0, stone, p).hits) seen.add(h.kind);
        for (const kind of ['launcher', 'crew', 'castle'])
          assert.ok(seen.has(kind), kind);
      });
  for (let c = 0; c < 5; c++)
    test(`court ${c}: every last objective finishable`, () => {
      const w = createWorld({ court: c });
      w.players[1].crewUntil = 1e6;
      w.players[1].launcherUntil = 1e6;
      const all = w.castles[1].filter((b) => !b.foundation);
      for (const b of all) {
        for (const q of all) q.hp = q === b ? q.max : 0;
        let found = false;
        for (let p = 0.1; p < 1; p += 0.002)
          if (
            predict(w, 0, 0, p).hits.some(
              (h) => h.kind === 'castle' && h.id === b.id,
            )
          ) {
            found = true;
            break;
          }
        assert.ok(found, `block ${b.id}`);
      }
    });
  test('removal changes collider and cascade scores no extra points', () => {
    const w = createWorld(),
      bs = w.castles[1],
      support = bs.find((b) => !b.foundation),
      upper = bs.find(
        (b) => !b.foundation && b.z > support.z && b.x === support.x,
      );
    for (const b of bs)
      if (!b.foundation && b !== support && b !== upper) b.hp = 0;
    upper.support = [support.id];
    support.support = [bs.find((b) => b.foundation && b.x === support.x).id];
    const s = projectile(w, 0, 1, 0.7);
    resolveImpact(w, s, {
      ...support,
      kind: 'castle',
      seat: 1,
      key: `b1:${support.id}`,
    });
    eq(w.players[0].score, 3);
    eq(support.hp, 0);
    eq(upper.hp, 0);
    assert.ok(w.coverage.collapse > 0);
    assert.ok(bs.filter((b) => b.foundation).every((b) => b.hp === 0));
  });
  test('split throw cannot score one target repeatedly', () => {
    const w = createWorld(),
      s = projectile(w, 0, 2, 0.7),
      h = { kind: 'crew', seat: 1, key: 'c1', x: 752, z: 50 };
    resolveImpact(w, s, h);
    const end = w.players[1].crewUntil;
    resolveImpact(w, { ...s, id: 111, fragment: true }, h);
    eq(w.players[0].score, 7);
    eq(w.players[1].crewUntil, end);
  });
  for (const kind of ['crew', 'launcher'])
    test(`${kind} interruption cancels charge, recovery protects and requires fresh input`, () => {
      const w = createWorld();
      command(w, 1, { kind: 'begin' });
      advance(w, 0.5);
      const s = projectile(w, 0, 0, 0.7),
        h = {
          kind,
          seat: 1,
          key: kind === 'crew' ? 'c1' : 'l1',
          x: 752,
          z: 50,
        };
      resolveImpact(w, s, h);
      assert.equal(w.players[1].held, false);
      const end = readyAt(w.players[1]);
      advance(w, (end - w.tick) * DT);
      assert.equal(w.players[1].charge, -1);
      eq(w.coverage.recovery, 1);
      resolveImpact(w, { ...s, throw: 999 }, h);
      eq(readyAt(w.players[1]), end);
      advance(w, w.config.protection + 0.1);
      resolveImpact(w, { ...s, throw: 1000 }, h);
      assert.ok(readyAt(w.players[1]) > w.tick);
    });
  test('overlapping interruptions use latest endpoint, never additive', () => {
    const w = createWorld(),
      s = projectile(w, 0, 0, 0.7);
    resolveImpact(w, s, { kind: 'crew', seat: 1, key: 'c1', x: 752, z: 50 });
    advance(w, 0.5);
    resolveImpact(
      w,
      { ...s, throw: 2 },
      { kind: 'launcher', seat: 1, key: 'l1', x: 715, z: 50 },
    );
    eq(readyAt(w.players[1]), w.tick + tickOf(2.6));
  });
  test('same-tick mutual destruction draws exactly once', () => {
    const w = createWorld();
    w.castles = w.castles.map((bs) =>
      bs.filter((b) => b.foundation || b.id === 8),
    );
    for (let seat = 0; seat < 2; seat++) {
      const b = w.castles[1 - seat].find((b) => !b.foundation);
      b.hp = 1;
      w.shots.push({
        ...projectile(w, seat, 0, 0.7),
        id: seat + 1,
        throw: seat + 1,
        x: b.x - 8,
        z: b.z + 10,
        vx: 2000,
        vz: 0,
      });
    }
    step(w);
    eq(w.outcome.winner, -1);
    const out = w.outcome;
    advance(w, 2);
    assert.equal(w.outcome, out);
    eq(w.coverage.results, 1);
  });
  test('timeout compares health %, then direct score, then draw', () => {
    const a = createWorld();
    a.players[1].score = 13;
    eq(finish(a).winner, 1);
    const b = createWorld();
    eq(finish(b).winner, -1);
    const c = createWorld();
    c.castles[1].find((b) => !b.foundation).hp = 1;
    c.players[1].score = 1000;
    eq(finish(c).winner, 0);
  });
  test('health tuning preserves fraction; bad tuning never introduces NaN', () => {
    const w = createWorld(),
      b = w.castles[0].find((b) => !b.foundation);
    b.hp = b.max * 0.5;
    applyTuning(w, { healthScale: 2, gravity: NaN, crewDisable: -99 });
    eq(b.hp / b.max, 0.5);
    assert.ok(w.config.gravity > 0 && w.config.crewDisable > 0);
  });
  test('compact full snapshot round trip repairs dropped states', () => {
    const w = createWorld({ court: 4 });
    command(w, 0, { kind: 'begin' });
    advance(w, 1);
    command(w, 0, { kind: 'release' });
    advance(w, 0.4);
    const s = pack(w, 4),
      copy = createWorld({ court: 4 });
    assert.ok(JSON.stringify(s).length <= 1200);
    assert.ok(unpack(copy, s));
    eq(pack(copy, 4), s);
    assert.equal(unpack(copy, { ...s, k: 0 }), false);
  });
  test('saves validate corruption/version/denied storage and round trip', () => {
    const data = new Map(),
      store = {
        getItem: (k) => data.get(k),
        setItem: (k, v) => data.set(k, v),
        removeItem: (k) => data.delete(k),
      };
    for (const bad of ['bad', '{}', '{"version":2,"next":1}']) {
      data.set(SAVE_KEY, bad);
      eq(loadTour(store), null);
    }
    const s = {
      version: 1,
      next: 1,
      seed: 7,
      totals: [13, 0],
      results: [{ bout: 0, winner: 0, direct: [13, 0], banked: [13, 0] }],
    };
    assert.ok(saveTour(store, s));
    eq(loadTour(store), s);
    eraseTour(store);
    eq(loadTour(store), null);
    eq(
      saveTour(
        {
          setItem() {
            throw Error('denied');
          },
        },
        s,
      ),
      false,
    );
    eq(
      loadTour({
        getItem() {
          throw Error('denied');
        },
      }),
      null,
    );
  });
  test('protected targets have no high-value AI interruption', () => {
    const w = createWorld();
    w.players[1].protectUntil = 100000;
    const plan = planShot(w, 0, { ...RIVALS[9], harass: 100 });
    assert.ok(plan.hits.some((h) => h.kind === 'castle'));
  });
  await test('complete tour through real entry, lessons, all five courts, scoring, replay', () => {
    if (!globalThis.My3D2dge)
      vm.runInThisContext(
        fs.readFileSync(
          new URL(
            '../vendor/engine/dist/handoff/my-3d2dge.js',
            import.meta.url,
          ),
          'utf8',
        ),
      );
    const data = new Map(),
      storage = {
        getItem: (k) => data.get(k),
        setItem: (k, v) => data.set(k, v),
        removeItem: (k) => data.delete(k),
      };
    const app = boot(globalThis.My3D2dge, {
        headless: true,
        loop: false,
        storage,
      }),
      g = app.game;
    g.advance(DT);
    app.startTour(false);
    g.advance(DT);
    // Test setup fixes only the RNG seed; entry, legal commands and every outcome stay real.
    app.tour.seed = 71;
    app.world.seed = 71;
    app.world.rng = 71;
    const coverage = {
      stones: new Set(),
      courts: new Set(),
      crew: 0,
      launcher: 0,
      collapse: 0,
      lesson: false,
    };
    let duration = 0;
    for (let bout = 0; bout < 10; bout++) {
      assert.equal(app.world.bout, bout);
      coverage.courts.add(app.world.court);
      let bot = createAI({
          ...RIVALS[8],
          reaction: 0.15,
          error: 0,
          harass: 0.8,
        }),
        n = 0;
      while (!app.world.outcome && n++ < 10900) {
        // Test bot chooses a real temporary target early, and then uses the same legal hold/release layer.
        const w = app.world;
        bot.goal = n < 750 ? 'launcher' : n < 1600 ? 'crew' : null;
        aiStep(w, 0, bot);
        g.advance(DT);
      }
      assert.ok(app.world.outcome, `bout ${bout}`);
      assert.ok(n > 120, 'not an instantaneous outcome');
      duration += app.world.tick * DT;
      for (let i = 0; i < 3; i++)
        if (app.world.coverage.launch[i]) coverage.stones.add(i);
      coverage.crew += app.world.coverage.crew;
      coverage.launcher += app.world.coverage.launcher;
      coverage.collapse += app.world.coverage.collapse;
      coverage.lesson ||= app.lesson >= 2;
      g.advance(2);
      assert.equal(app.shell.screen, 'results');
      assert.equal(app.tour.next, bout + 1);
      if (bout < 9) {
        const actions = app.shell._stack.at(-1).s.actions;
        actions.find((a) => a[0] === 'Next bout')[1]();
        g.advance(DT);
      }
    }
    eq(coverage.stones.size, 3);
    eq(coverage.courts.size, 5);
    assert.ok(
      coverage.crew > 0 &&
        coverage.launcher > 0 &&
        coverage.collapse > 0 &&
        coverage.lesson,
    );
    eq(
      app.tour.totals,
      app.tour.results.reduce(
        (a, r) => a.map((n, i) => n + r.banked[i]),
        [0, 0],
      ),
    );
    eq(loadTour(storage), null);
    assert.ok(duration > 500 && duration <= 900);
    fs.writeFileSync(
      new URL('../artifacts/tour.json', import.meta.url),
      JSON.stringify(
        {
          seed: app.tour.seed,
          durationSeconds: duration,
          coverage: {
            ...coverage,
            stones: [...coverage.stones],
            courts: [...coverage.courts],
          },
          totals: app.tour.totals,
          results: app.tour.results,
        },
        null,
        2,
      ),
    );
    const actions = app.shell._stack.at(-1).s.actions;
    actions.find((a) => a[0] === 'Play the tour again')[1]();
    g.advance(DT);
    eq(app.world.bout, 0);
    eq(app.tour.totals, [0, 0]);
    eq(g.errors, []);
    g.dispose();
  });
  test('native draw and exact attract threshold; exit does not launch/select', () => {
    const E = globalThis.My3D2dge;
    const app = boot(E, { headless: true, draw: true, loop: false });
    app.game.advance(1199 * DT);
    eq(app.mode, 'title');
    app.game.advance(DT);
    eq(app.mode, 'attract');
    app.game.input.tap('confirm');
    app.game.advance(DT);
    eq(app.mode, 'title');
    eq(app.shell.screen, 'title');
    eq(app.world.coverage.launch, [0, 0, 0]);
    eq(app.game.errors, []);
    app.game.dispose();
  });
  test('attract loops through three courts without save writes', () => {
    let writes = 0;
    const app = boot(globalThis.My3D2dge, {
      headless: true,
      loop: false,
      storage: {
        getItem() {
          return null;
        },
        setItem() {
          writes++;
        },
        removeItem() {
          writes++;
        },
      },
    });
    app.game.advance(10);
    const courts = new Set();
    for (let i = 0; i < 92; i++) {
      app.game.advance(1);
      courts.add(app.world.court);
    }
    assert.ok(courts.size >= 3);
    const cov = app.attractCoverage.concat(app.world.coverage);
    assert.ok([0, 1, 2].every((i) => cov.some((c) => c.launch[i] > 0)));
    assert.ok(
      ['crew', 'launcher', 'collapse', 'recovery'].every((k) =>
        cov.some((c) => c[k] > 0),
      ),
    );
    eq(writes, 0);
    eq(app.tour, null);
    app.game.dispose();
  });
  test('reliable queue retries rejected sends in order, bounds sizes and clears', () => {
    let now = 0,
      accept = false;
    const sent = [],
      hub = {
        send(d) {
          if (!accept) return false;
          sent.push(d);
          return true;
        },
      },
      t = new Transport(hub, () => now);
    t.enqueue({ t: 'c', n: 1 });
    t.enqueue({ t: 'c', n: 2 });
    t.flush();
    eq(sent.length, 0);
    accept = true;
    now = 100;
    t.flush();
    eq(
      sent.map((a) => a.n),
      [1, 2],
    );
    assert.ok(t.metrics.retries > 0);
    assert.equal(t.enqueue({ x: 'x'.repeat(17000) }), false);
    t.stop();
    assert.equal(t.enqueue({ n: 3 }), false);
  });
  test('authoritative command duration tolerates delay but rejects implausible state', () => {
    const h = {
        send() {
          return true;
        },
        time: () => 1000,
      },
      net = new OnlineMatch(h);
    net.info = { isHost: true, players: [{ id: 10 }, { id: 20 }] };
    net.started = true;
    net.world = createWorld();
    advance(net.world, 0.1);
    assert.equal(
      net.receiveIntent({ kind: 'begin', seq: 1, at: 0.8 }, 99),
      false,
    );
    assert.ok(net.receiveIntent({ kind: 'begin', seq: 1, at: 0.8 }, 20));
    advance(net.world, 0.6);
    assert.ok(
      net.receiveIntent(
        { kind: 'release', seq: 2, at: 0.9, duration: 0.65 },
        20,
      ),
    );
    eq(net.world.coverage.launch, [1, 0, 0]);
    assert.equal(
      net.receiveIntent({ kind: 'begin', seq: 3, at: 100 }, 20),
      false,
    );
  });
}
