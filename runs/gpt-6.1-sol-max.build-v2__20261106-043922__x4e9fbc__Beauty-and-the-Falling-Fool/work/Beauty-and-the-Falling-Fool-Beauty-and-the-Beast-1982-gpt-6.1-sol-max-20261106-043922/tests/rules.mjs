import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { load } from '../tools/load.mjs';
const { FF: F, My3D2dge: E } = load(true),
  results = [];
const test = (name, fn) => {
  try {
    const detail = fn();
    results.push({ name, pass: true, detail });
  } catch (e) {
    results.push({ name, pass: false, error: e.stack });
  }
};
const world = (o) => new F.World(o),
  advance = (w, n, input = {}) => {
    for (let i = 0; i < Math.round(n * 120); i++) w.step(input);
  };
const safe = (w) => {
  w.spawned = new Set(
    w.data.encounters.flatMap((e) => [
      e.id,
      ...Array.from({ length: 50 }, (_, i) => e.id + ':' + i),
    ]),
  );
};
const at = (w, x, z = 16) => {
  const p = w.actors[0];
  p.body = F.makeBody(x, z, w.cfg);
  p.recovery = 0;
  return p;
};
const route = (options = {}, hook = () => {}) => {
  const w = world(options);
  for (let n = 0; n < 120 * 500; n++) {
    hook(w, n);
    w.step(Object.fromEntries(w.actors.map((p) => [p.id, F.bot(w, p)])));
    if (['results', 'failed'].includes(w.phase)) return w;
  }
  throw new Error('Normal-input route timed out');
};
test('authored content and broken-link rejection', () => {
  assert.equal(F.validate().length, 0);
  const data = JSON.parse(JSON.stringify(F.SECTIONS));
  data[1].encounters[0].bumper = 'missing';
  assert.ok(F.validate(data).some((e) => e.includes('broken bumper')));
  data[0].windows.pop();
  assert.ok(F.validate(data).some((e) => e.includes('sequenced')));
});
test('jump cannot skip a floor and release changes height', () => {
  const height = (held) => {
    const w = world();
    safe(w);
    const p = at(w, 200);
    let high = p.body.z;
    for (let i = 0; i < 70; i++) {
      w.step({ 0: { ...F.neutral(), jumpPressed: i === 0, jump: i < held } });
      high = Math.max(high, p.body.z);
    }
    return high - 16;
  };
  const high = height(60),
    low = height(2);
  assert.ok(high < 28 && high > 17);
  assert.ok(low < high * 0.65);
  return { high, low };
});
test('native coyote jump', () => {
  const w = world();
  safe(w);
  const p = at(w, 356);
  p.body.vx = 95;
  for (let i = 0; i < 40 && p.body.onGround; i++) w.step({ 0: { x: 1 } });
  assert.equal(p.body.onGround, false);
  w.step({ 0: { x: 0, jump: true, jumpPressed: true } });
  assert.equal(p.body.jumped, true);
});
test('native buffered jump on landing', () => {
  const w = world();
  safe(w);
  const p = at(w, 200, 18);
  p.body.onGround = false;
  p.body.vz = -40;
  w.step({ 0: { jumpPressed: true, jump: true } });
  for (let i = 0; i < 10 && !p.body.jumped; i++) w.step({ 0: { jump: true } });
  assert.ok(p.body.jumped);
});
test('one hit spends one chance, recovery is protected', () => {
  const w = world();
  const p = at(w, 200);
  assert.ok(w.hurt(p, 'rat'));
  assert.equal(w.hurt(p, 'rat'), false);
  assert.equal(w.chances, 2);
  advance(w, 0.8);
  assert.equal(p.tumble, 0);
  assert.ok(p.recovery > 0);
  assert.equal(w.hurt(p, 'rat'), false);
});
test('closed shutters deny traversal; every floor opens eventually', () => {
  const w = world();
  const p = at(w, 296);
  assert.equal(
    w.startClimb(
      p,
      w.windows().find((a) => a.id === 'brick-w0-1'),
      1,
    ),
    false,
  );
  for (let floor = 0; floor < 4; floor++) {
    let count = 0;
    for (let t = 0; t < 40; t += 0.05)
      if (
        F.SECTIONS[0].windows.some(
          (a) => a.floor === floor && F.windowState(a, t, F.DEFAULTS).usable,
        )
      )
        count++;
    assert.ok(count > 20);
  }
});
test('one traversable window per floor', () => {
  for (const s of F.SECTIONS)
    for (let t = 0; t < 40; t += 0.017)
      for (let f = 0; f < s.lanes.length; f++)
        assert.ok(
          s.windows.filter(
            (w) => w.floor === f && F.windowState(w, t, F.DEFAULTS).usable,
          ).length <= 1,
        );
});
test('native Action owns climb; hold and reverse return to grip', () => {
  const w = world();
  safe(w);
  w.sectionAge = 1;
  const p = at(w, 104);
  w.step({ 0: { up: true } });
  assert.ok(p.traversal);
  advance(w, 0.25, { 0: { up: true } });
  const held = p.body.z;
  advance(w, 0.1, { 0: {} });
  assert.equal(p.body.z, held);
  advance(w, 0.4, { 0: { down: true } });
  assert.equal(p.traversal, null);
  assert.equal(p.body.z, 16);
  assert.ok(w.metrics.holds > 0 && w.metrics.reverses > 0);
});
test('closure while holding causes exactly one shutter fall', () => {
  const w = world();
  safe(w);
  const p = at(w, 104);
  w.sectionAge = 0.65 + w.cfg.open + w.cfg.warning - 0.18;
  w.step({ 0: { up: true } });
  assert.ok(p.traversal);
  advance(w, 0.3, { 0: { up: true } });
  assert.equal(w.chances, 2);
  assert.ok(w.events.some((e) => e.type === 'hit' && e.why === 'shutter'));
  assert.equal(p.traversal, null);
});
test('window ascent and descent use the real endpoints', () => {
  const w = world();
  safe(w);
  w.sectionAge = 1;
  const p = at(w, 104);
  advance(w, 0.75, { 0: { up: true } });
  assert.equal(p.body.z, 64);
  advance(w, 0.75, { 0: { down: true } });
  assert.equal(p.body.z, 16);
});
for (const kind of ['rolling', 'bumper', 'split', 'rat', 'bird', 'bat']) {
  test(kind + ' powered contact is swept, scored once', () => {
    const w = world();
    safe(w);
    const p = at(w, 200);
    w.powerUntil = 10;
    w.spawn({
      id: 'test-' + kind,
      kind,
      floor: 0,
      dir: -1,
      speed: 80,
      breakX: 10,
      x: 200,
    });
    const h = w.hazards.at(-1);
    h.state = 'active';
    h.age = h.tell + 0.01;
    h.z = 16;
    h.baseZ = 16;
    w.updateHazards(F.DT);
    assert.equal(h.dead, true);
    assert.equal(w.score, 50);
    w.updateHazards(F.DT);
    assert.equal(w.score, 50);
  });
  test(kind + ' has a normal safe response', () => {
    const w = world();
    safe(w);
    const p = at(w, kind === 'bird' || kind === 'bat' ? 100 : 200);
    w.spawn({
      id: 'dodge-' + kind,
      kind,
      floor: 0,
      dir: -1,
      speed: 60,
      breakX: 10,
      x: 245,
    });
    let jumped = false;
    for (let n = 0; n < 240; n++) {
      const h = w.hazards[0];
      const need =
        !['bird', 'bat'].includes(kind) &&
        !jumped &&
        h?.state === 'active' &&
        h.x - p.body.x < 35;
      w.step({
        0: {
          x:
            !['bird', 'bat'].includes(kind) &&
            h &&
            h.x > p.body.x - 18 &&
            (need || jumped)
              ? 1
              : 0,
          jump: need || p.body.vz > 0,
          jumpPressed: need,
        },
      });
      if (need) jumped = true;
    }
    assert.equal(w.chances, 3);
  });
}
test('bumper model reverses and drops with a cue', () => {
  const w = world();
  w.enter(1);
  safe(w);
  at(w, 200);
  w.spawn({
    id: 'bounce',
    kind: 'bumper',
    floor: 1,
    dir: -1,
    speed: 100,
    x: 85,
  });
  const h = w.hazards.at(-1);
  h.age = 1;
  h.state = 'active';
  for (let i = 0; i < 600; i++) w.updateHazards(F.DT);
  assert.ok(w.metrics.behaviors.includes('reverse'));
  assert.ok(w.metrics.behaviors.includes('drop'));
  assert.ok(w.events.some((e) => e.type === 'drop'));
});
test('split makes two distinct opposed fragments', () => {
  const w = world();
  safe(w);
  w.spawn({
    id: 'crack',
    kind: 'split',
    floor: 0,
    dir: 1,
    speed: 60,
    breakX: 120,
    x: 119,
  });
  const h = w.hazards[0];
  h.state = 'active';
  h.age = 1;
  w.updateHazards(0.05);
  const fragments = w.hazards.filter((h) => h.fragment);
  assert.equal(fragments.length, 2);
  assert.ok(fragments[0].vx * fragments[1].vx < 0);
  assert.notEqual(fragments[0].id, fragments[1].id);
});
test('fast relative movement cannot tunnel through climber', () => {
  const w = world();
  safe(w);
  const p = at(w, 200);
  p.prev = { x: 200, z: 16 };
  w.spawn({
    id: 'fast',
    kind: 'rolling',
    floor: 0,
    dir: -1,
    speed: 2000,
    x: 240,
  });
  const h = w.hazards[0];
  h.state = 'active';
  h.age = 1;
  w.updateHazards(0.04);
  assert.equal(w.chances, 2);
});
test('heart applies to the team before first contact and duplicate score is idempotent', () => {
  const w = world({ players: [{ id: 0 }, { id: 1 }] });
  safe(w);
  at(w, 200);
  w.actors[1].recovery = 0;
  w.hearts = [
    {
      id: 'shared-heart',
      floor: 0,
      age: 2,
      x: 200,
      z: 26,
      fromX: 200,
      fromZ: 26,
      xTarget: 200,
      pathTime: 1,
    },
  ];
  w.updateHearts(F.DT);
  assert.ok(w.powered());
  assert.equal(w.score, 50);
  w.award('shared-heart', 50, 'heart');
  assert.equal(w.score, 50);
  advance(w, 6.1);
  assert.equal(w.powered(), false);
});
test('fall ignores heart protection', () => {
  const w = world();
  const p = at(w, 15);
  w.powerUntil = 8;
  w.step({});
  assert.equal(w.chances, 2);
});
test('regroup timeout, leaving helper, checkpoint score baseline', () => {
  const w = world({ players: [{ id: 0 }, { id: 1 }] });
  safe(w);
  at(w, 320, 208);
  w.step({});
  assert.ok(w.regroup);
  w.leave(1);
  w.step({});
  assert.equal(w.phase, 'transition');
  const score = w.score;
  advance(w, 4);
  assert.equal(w.section, 1);
  w.award('temporary', 500, 'test');
  w.restore();
  assert.equal(w.score, score);
  assert.equal(w.continued, true);
  assert.ok(!w.ledger.has('temporary'));
  assert.equal(w.chances, 3);
});
test('failure offers a valid checkpoint restoration', () => {
  const w = world();
  safe(w);
  const p = at(w, 200);
  for (let i = 0; i < 3; i++) {
    p.tumble = 0;
    p.recovery = 0;
    w.hurt(p, 'rat');
  }
  assert.equal(w.phase, 'failed');
  assert.equal(w.restore(), true);
  assert.equal(w.phase, 'playing');
  assert.equal(w.chances, 3);
});
test('malformed checkpoint is rejected', () => {
  assert.equal(F.validCheckpoint(null), false);
  assert.equal(F.validCheckpoint({ v: 1, section: 99 }), false);
  const w = world(),
    score = w.score;
  assert.equal(w.restore({ v: 1, section: 0, score: NaN, ledger: [] }), false);
  assert.equal(w.score, score);
});
test('full solo route with normal intentions through rescue and departure', () => {
  const w = route();
  assert.equal(w.phase, 'results');
  assert.ok(w.rescued && w.departed);
  assert.equal(w.metrics.sections, 3);
  for (const kind of ['rolling', 'bumper', 'split', 'rat', 'bird', 'bat'])
    assert.ok(w.metrics.seen.includes(kind), kind + ' not exercised');
  assert.ok(
    w.metrics.jumps > 0 &&
      w.metrics.climbs >= 15 &&
      w.metrics.hearts > 0 &&
      w.metrics.smashes > 0 &&
      w.metrics.hits > 0,
  );
  fs.writeFileSync(
    'artifacts/solo-route.json',
    JSON.stringify(w.snapshot(), null, 2),
  );
  return { seconds: w.time, metrics: w.metrics };
});
test('full couch co-op normal route and teamwork', () => {
  const w = route({
    players: [
      { id: 0, name: 'Buford' },
      { id: 1, name: 'Pip' },
    ],
  });
  assert.equal(w.phase, 'results');
  assert.ok(w.rescued && w.departed);
  assert.equal(w.actors.length, 2);
  return { seconds: w.time, score: w.score };
});
test('full recovery route restores checkpoint after normal-input falls', () => {
  const w = world();
  let falling = false,
    retried = false;
  for (let i = 0; i < 60000; i++) {
    if (w.section === 1 && !retried) falling = true;
    if (w.phase === 'failed' && falling) {
      w.restore();
      retried = true;
      falling = false;
    }
    const a = falling ? { x: -1 } : F.bot(w, w.actors[0]);
    w.step({ 0: a });
    if (w.phase === 'results' || (w.phase === 'failed' && !falling)) break;
  }
  assert.ok(retried && w.continued && w.rescued && w.departed);
});
test('authored harder replay completes with normal intentions', () => {
  const w = route({ hard: true });
  assert.equal(w.phase, 'results');
  assert.ok(w.hard && w.rescued);
  return { seconds: w.time };
});
test('seed and intentions reproduce exactly', () => {
  const a = world({ seed: 42 }),
    b = world({ seed: 42 });
  for (let i = 0; i < 6000; i++) {
    const input = { 0: F.bot(a, a.actors[0]) };
    a.step(input);
    b.step(input);
  }
  assert.equal(JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()));
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(a.snapshot()))
    .digest('hex');
});
test('native draw and skipped draws keep identical rule state', () => {
  const a = world(),
    b = world(),
    g = new E.Game({
      headless: true,
      draw: true,
      res: [640, 400],
      input: 'PLATFORMER',
    }),
    v = new F.Presentation(g);
  g.start({
    update(dt) {
      const i = { 0: F.bot(a, a.actors[0]) };
      a.step(i, dt);
      b.step(i, dt);
      v.update(a, dt);
      g.focus(200, 0, 118);
    },
    draw(r) {
      v.draw(r, a);
    },
  });
  for (let i = 0; i < 900; i++) g.advance(F.DT, { draw: i % 10 === 0 });
  assert.equal(JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()));
  assert.equal(g.errors.length, 0);
  g.dispose();
});
test('one shared incident tumbles both climbers but spends one spare', () => {
  const w = world({ players: [{ id: 0 }, { id: 1 }] });
  safe(w);
  for (const p of w.actors) {
    p.body = F.makeBody(200, 16, w.cfg);
    p.recovery = 0;
  }
  w.spawn({
    id: 'shared-rock',
    kind: 'rolling',
    floor: 0,
    dir: -1,
    speed: 1,
    x: 200,
  });
  const h = w.hazards[0];
  h.state = 'active';
  h.age = 1;
  w.updateHazards(F.DT);
  assert.equal(w.chances, 2);
  assert.ok(w.actors.every((p) => p.tumble > 0));
});
test('missed final heart is reoffered on the reached rooftop ledge', () => {
  const w = world();
  w.enter(3);
  safe(w);
  const p = at(w, 160, 160);
  w.finaleBeat = 3;
  w.started[2] = 0;
  w.sectionAge = 12;
  w.spawned.add('offer-roof-heart-0');
  w.hearts = [
    {
      id: 'roof-heart-0',
      floor: 2,
      age: 9,
      pathTime: 2,
      x: 160,
      z: 122,
      fromX: 278,
      fromZ: 185,
    },
  ];
  advance(w, 4);
  assert.ok(w.hearts.some((h) => h.floor === 3) || w.powered());
  assert.ok(w.metrics.hearts > 0);
});
test('checkpoint totals and malformed metric storage preserve score integrity', () => {
  const w = world();
  w.award('first-heart', 50, 'heart');
  const cp = w.saveCheckpoint();
  w.award('later-rescue', 500, 'rescue');
  w.restore(cp);
  assert.equal(w.score, 50);
  assert.equal(w.totals.heart, 50);
  assert.equal(w.totals.rescue, undefined);
  assert.equal(F.validCheckpoint({ ...cp, metrics: 'broken' }), false);
});
test('bird edge pockets stay clear of the next ledge', () => {
  const w = world();
  safe(w);
  const p = at(w, 68);
  p.recovery = 100;
  w.spawn({ id: 'lane-bird', kind: 'bird', floor: 1, dir: 1, speed: 1 });
  const h = w.hazards[0];
  h.state = 'active';
  h.age = 2;
  for (let x = w.data.x0; x < w.data.x1; x += 2) {
    h.x = x;
    w.updateHazards(F.DT);
    assert.ok(h.z + h.h <= h.baseZ + 48);
  }
});
test('semantic snapshots cannot mutate authoritative checkpoints', () => {
  const w = world();
  w.regroup = { until: 5 };
  const s = w.snapshot();
  s.checkpoint.score = 999;
  s.checkpoint.ledger.push('injected');
  s.regroup.until = 0;
  s.actors[0].x = 0;
  assert.equal(w.checkpoint.score, 0);
  assert.equal(w.checkpoint.ledger.length, 0);
  assert.equal(w.regroup.until, 5);
  assert.equal(w.actors[0].body.x, w.data.spawn);
});
fs.writeFileSync('artifacts/rules.json', JSON.stringify(results, null, 2));
process.stdout.write(
  JSON.stringify({
    tests: results.length,
    failures: results.filter((r) => !r.pass),
  }),
);
