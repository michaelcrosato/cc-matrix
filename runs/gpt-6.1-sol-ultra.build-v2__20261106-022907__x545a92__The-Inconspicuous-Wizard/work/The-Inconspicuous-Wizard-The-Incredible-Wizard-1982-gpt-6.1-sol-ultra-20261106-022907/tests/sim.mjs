import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const p of ['content/rooms.js', 'src/sim.js'])
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, p), 'utf8'), {
    filename: p,
  });
const {
  Sim,
  ROOMS,
  DEFAULTS,
  DIRECTIONS,
  bot,
  walkable,
  lineClear,
  path: route,
  cellToWorld,
  worldToCell,
} = globalThis.WizardSim;
function blank(options = {}) {
  const sim = new Sim(options);
  sim.s.phase = 'hunt';
  sim.s.phaseTime = 0;
  sim.s.pending = [{ status: 'waiting', after: 999, at: null, delay: 1 }];
  sim.s.enemies = [];
  sim.s.bolts = [];
  for (const p of sim.s.players) {
    p.protect = 0;
    p.x = 1;
    p.y = 11;
    p.moving = false;
  }
  return sim;
}
function step(sim, seconds, commands = []) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++)
    sim.step(1 / 120, commands);
}
function enemy(sim, type, x, y) {
  const e = sim.spawn(type, x, y, 0);
  e.activeAt = 0;
  e.warning = 0;
  e.state = 'hunt';
  return e;
}
function freeze(sim) {
  for (const k of ['hopperSpeed', 'stalkerSpeed', 'skitterSpeed'])
    sim.s.tuning[k] = 0;
}
export async function runTests() {
  const failures = [];
  let passed = 0;
  const test = (name, fn) => {
    try {
      fn();
      passed++;
    } catch (e) {
      failures.push(`${name}: ${e.stack || e}`);
    }
  };
  test('authored rooms: reachability, spawns and portals', () => {
    assert.equal(ROOMS.length, 6);
    for (const room of ROOMS) {
      assert.equal(room.rows.length, 13);
      const all = [];
      for (let y = 0; y < 13; y++)
        for (let x = 0; x < 19; x++)
          if (walkable(room, x, y)) all.push({ x, y });
      for (const p of all)
        assert.notEqual(
          route(room, { x: 1, y: 11 }, p),
          null,
          `${room.name} unreachable ${p.x},${p.y}`,
        );
      for (const q of room.spawns) assert.ok(walkable(room, q.x, q.y));
      assert.ok(room.spawns.length >= 12);
      assert.deepEqual(room.portals, [
        [0, 6],
        [18, 6],
      ]);
    }
  });
  test('native cell/world conversions include tile center', () => {
    assert.equal(cellToWorld(0), 8);
    assert.equal(cellToWorld(18), 296);
    for (let n = 0; n < 19; n++) assert.equal(worldToCell(cellToWorld(n)), n);
  });
  test('movement is smooth, cardinal, releases and remembers standing aim', () => {
    const sim = blank(),
      p = sim.s.players[0];
    step(sim, 0.2, [{ move: 0, aim: 3 }]);
    assert.ok(p.x > 1 && p.x < 2);
    assert.equal(p.y, 11);
    assert.equal(p.face, 3);
    step(sim, 0.9, [{ move: -1, aim: 3 }]);
    const x = p.x;
    step(sim, 0.5, [{}]);
    assert.equal(p.x, x);
    assert.equal(p.face, 3);
  });
  test('buffered turns select a legal junction and expire', () => {
    const sim = blank(),
      p = sim.s.players[0];
    p.x = 1.8;
    p.y = 11;
    p.moving = true;
    p.tx = 2;
    p.ty = 11;
    p.moveDir = 0;
    step(sim, 0.11, [{ move: 3 }]);
    assert.equal(p.x, 2);
    assert.ok(p.y < 11);
    step(sim, 0.8, [{}]);
    const y = p.y;
    step(sim, 0.3, [{}]);
    assert.equal(p.y, y);
    assert.equal(p.wanted, -1);
  });
  test('one live bolt per seat, hold never bypasses commitment', () => {
    const sim = blank(),
      p = sim.s.players[0];
    step(sim, 0.8, [{ aim: 0, fire: true }]);
    assert.equal(sim.s.bolts.filter((b) => b.owner === p.id).length, 1);
    assert.equal(p.stats.shots, 1);
    assert.ok(p.boltId);
  });
  test('long misses recover later than nearby wall shots', () => {
    const near = blank(),
      far = blank();
    near.s.players[0].face = 2;
    far.s.players[0].face = 0;
    near.fire(near.s.players[0]);
    far.fire(far.s.players[0]);
    step(near, 0.08);
    step(far, 0.08);
    assert.equal(near.s.players[0].boltId, null);
    assert.ok(far.s.players[0].boltId);
  });
  test('swept bolt cannot skip wall or enemy at high speed', () => {
    const sim = blank();
    freeze(sim);
    sim.s.tuning.boltSpeed = 800;
    const p = sim.s.players[0];
    p.x = 1;
    p.y = 3;
    p.face = 0;
    enemy(sim, 'hopper', 8, 3);
    sim.fire(p);
    sim.step(0.05, [{}]);
    assert.equal(sim.s.stats.kills, 0);
    assert.equal(p.boltId, null);
    const b = blank();
    freeze(b);
    b.s.tuning.boltSpeed = 800;
    enemy(b, 'hopper', 6, 11);
    b.s.players[0].face = 0;
    b.fire(b.s.players[0]);
    b.step(0.05, [{}]);
    assert.equal(b.s.stats.kills, 1);
    assert.equal(b.s.enemies.length, 0);
  });
  test('targets behind the muzzle are never hit', () => {
    const sim = blank();
    freeze(sim);
    const p = sim.s.players[0];
    p.x = 6;
    p.face = 0;
    enemy(sim, 'hopper', 3, 11);
    sim.fire(p);
    step(sim, 0.4);
    assert.equal(sim.s.stats.kills, 0);
    assert.equal(sim.s.enemies.length, 1);
  });
  test('allied bodies and bolts pass through', () => {
    const sim = blank({ seats: 2 });
    freeze(sim);
    const [a, b] = sim.s.players;
    a.x = 1;
    b.x = 3;
    a.face = 0;
    b.face = 2;
    sim.fire(a);
    sim.fire(b);
    step(sim, 0.08);
    assert.equal(a.lives, 3);
    assert.equal(b.lives, 3);
    assert.equal(sim.s.bolts.length, 2);
  });
  test('partners pass through each other in the same corridor', () => {
    const sim = blank({ seats: 2 });
    const [a, b] = sim.s.players;
    a.x = 4;
    b.x = 6;
    step(sim, 0.5, [{ move: 0 }, { move: 2 }]);
    assert.ok(a.x >= 6 - 1e-6);
    assert.ok(b.x <= 4 + 1e-6);
    assert.equal(a.lives, 3);
    assert.equal(b.lives, 3);
  });
  test('opposing projectile parry is deterministic', () => {
    const sim = blank(),
      p = sim.s.players[0];
    p.face = 0;
    sim.s.bolts.push({
      id: 'test-z',
      x: 3,
      y: 11,
      dir: 2,
      owner: 'wizard',
      hostile: true,
    });
    sim.fire(p);
    step(sim, 0.2);
    assert.equal(sim.s.bolts.length, 0);
    assert.equal(p.lives, 3);
    assert.ok(sim.s.events.some((e) => e.type === 'parry'));
  });
  test('simultaneous allied hits award once; dead hunter cannot contact', () => {
    const sim = blank({ seats: 2 });
    freeze(sim);
    const [a, b] = sim.s.players;
    a.x = 1;
    b.x = 7;
    enemy(sim, 'hopper', 4, 11);
    a.face = 0;
    b.face = 2;
    sim.fire(a);
    sim.fire(b);
    step(sim, 0.3);
    assert.equal(sim.s.stats.kills, 1);
    assert.equal(sim.s.score, 50);
  });
  test('LOS uses cardinal lanes, walls, either player and no facing condition', () => {
    const sim = blank({ seats: 2 });
    freeze(sim);
    const [a, b] = sim.s.players;
    a.x = 1;
    a.y = 1;
    a.face = 2;
    b.x = 10;
    b.y = 11;
    b.face = 1;
    const e = enemy(sim, 'stalker', 10, 10);
    sim.updateEnemies(0);
    assert.equal(e.visible, true);
    b.alive = false;
    sim.updateEnemies(0);
    assert.equal(e.visible, false);
    b.alive = true;
    b.y = 6;
    sim.updateEnemies(0);
    assert.equal(e.visible, false);
    assert.equal(lineClear(sim.room, { x: 1, y: 3 }, { x: 8, y: 3 }), false);
    assert.equal(lineClear(sim.room, { x: 1, y: 1 }, { x: 10, y: 1 }), true);
  });
  test('radar tracks hidden hunters and excludes Wizard', () => {
    const sim = blank();
    freeze(sim);
    const e = enemy(sim, 'stalker', 10, 10);
    sim.updateEnemies(0);
    assert.equal(e.visible, false);
    sim.s.wizard = { id: 'wiz', x: 9, y: 1 };
    const radar = sim.radar();
    assert.ok(radar.enemies.some((b) => b.id === e.id));
    assert.ok(!JSON.stringify(radar).includes('wiz'));
  });
  test('bell consumes bolt, reveals and lures by connected paths, then cools', () => {
    const sim = blank();
    sim.enterRoom(2);
    sim.s.phase = 'hunt';
    sim.s.pending = [{ status: 'waiting', after: 999, at: null, delay: 1 }];
    freeze(sim);
    const p = sim.s.players[0];
    p.protect = 0;
    const e = enemy(sim, 'stalker', 2, 7),
      post = sim.s.posts[0];
    p.face = 3;
    sim.fire(p);
    step(sim, 0.4);
    assert.equal(p.boltId, null);
    assert.equal(sim.s.stats.bells, 1);
    assert.ok(post.cooldown > 0);
    assert.ok(e.lureUntil > sim.s.time);
    assert.ok(e.revealUntil > sim.s.time);
    assert.equal(e.visible, true);
    const time = e.lureUntil;
    sim.ring(post, p.id);
    assert.equal(e.lureUntil, time);
    step(sim, 2);
    assert.ok(e.lureUntil < sim.s.time);
    assert.equal(e.state, 'hunt');
    assert.ok(post.cooldown > 0);
  });
  test('bell lure respects path length, never touches Wizard', () => {
    const sim = blank();
    sim.enterRoom(2);
    freeze(sim);
    const e = enemy(sim, 'stalker', 17, 11),
      post = sim.s.posts[0];
    sim.s.wizard = { id: 'wiz', x: 2, y: 8, state: 'warning', warning: 1 };
    const before = JSON.stringify(sim.s.wizard);
    sim.ring(post, 'p0');
    assert.equal(e.lureUntil, 0);
    assert.equal(JSON.stringify(sim.s.wizard), before);
  });
  test('spawn warnings forbid same-frame contact and shots', () => {
    const sim = blank(),
      p = sim.s.players[0];
    freeze(sim);
    const e = sim.spawn('hopper', p.x, p.y, 0.8);
    sim.fire(p);
    step(sim, 0.2);
    assert.equal(p.lives, 3);
    assert.equal(sim.s.stats.kills, 0);
    assert.ok(e.warning > 0);
  });
  test('finite obligations prevent a premature clear', () => {
    const sim = blank();
    sim.s.pending = [
      {
        status: 'waiting',
        type: 'stalker',
        x: 9,
        y: 1,
        after: 0,
        at: 2,
        delay: 1,
      },
    ];
    step(sim, 1);
    assert.equal(sim.s.phase, 'hunt');
    step(sim, 1.1);
    assert.equal(sim.s.enemies.length, 1);
    assert.equal(sim.s.pending[0].status, 'spawned');
  });
  test('familiar escape progresses without granting bonus', () => {
    const sim = blank();
    sim.startFamiliar();
    sim.s.tuning.familiarSpeed = 80;
    step(sim, 3);
    assert.equal(sim.s.phase, 'clear');
    assert.equal(sim.s.earnedNextMultiplier, 1);
    assert.equal(sim.s.stats.escaped, 1);
  });
  test('familiar catch grants next bonus only, applied once at descent', () => {
    const sim = blank();
    sim.s.currentMultiplier = 2;
    sim.startFamiliar();
    sim.finishFamiliar(true, 'p0');
    assert.equal(sim.s.score, 400);
    assert.equal(sim.s.currentMultiplier, 2);
    assert.equal(sim.s.earnedNextMultiplier, 2);
    sim.nextRoom();
    assert.equal(sim.s.currentMultiplier, 2);
    assert.equal(sim.s.earnedNextMultiplier, 1);
    assert.equal(sim.s.roomIndex, 1);
  });
  test('portals have safe arrival, leave-area lockout and do not wrap bolts', () => {
    const sim = blank(),
      p = sim.s.players[0];
    p.x = 0;
    p.y = 6;
    sim.portal(p, 'player');
    assert.equal(p.x, 17);
    assert.ok(p.protect > 0);
    sim.portal(p, 'player');
    assert.equal(p.x, 17);
    p.x = 15;
    sim.portal(p, 'player');
    assert.equal(p.portalLock, null);
    p.x = 18;
    p.y = 6;
    p.face = 0;
    p.protect = 0;
    sim.fire(p);
    p.x = 17;
    step(sim, 0.05);
    assert.equal(p.boltId, null);
    assert.equal(sim.s.bolts.length, 0);
    assert.equal(sim.s.stats.portals, 1);
  });
  test('Wizard legal tells, guaranteed cast and teleport before vulnerable window', () => {
    const sim = blank();
    sim.enterRoom(1);
    sim.s.phase = 'intrusion';
    sim.startWizard();
    const w = sim.s.wizard;
    assert.ok(walkable(sim.room, w.x, w.y));
    assert.ok(
      sim.s.players.every((p) => Math.hypot(p.x - w.x, p.y - w.y) >= 3),
    );
    sim.hitWizard('p0');
    assert.equal(sim.s.stats.wizardHits, 0);
    step(sim, 3.2);
    assert.ok(sim.s.events.some((e) => e.type === 'lightning'));
    assert.ok(sim.s.events.some((e) => e.type === 'wizard-teleport'));
    assert.ok(sim.s.wizard.vulnerable);
  });
  test('first Wizard can leave; missed bonus does not block campaign', () => {
    const sim = blank();
    sim.enterRoom(1);
    sim.s.phase = 'intrusion';
    sim.startWizard();
    sim.s.players[0].protect = 100;
    step(sim, 35);
    assert.equal(sim.s.phase, 'clear');
    assert.equal(sim.s.earnedNextMultiplier, 1);
  });
  test('finale three one-hit manifestations and bounty use earned multiplier once', () => {
    const sim = blank();
    sim.enterRoom(5);
    sim.s.phase = 'intrusion';
    sim.s.currentMultiplier = 2;
    sim.s.earnedNextMultiplier = 2;
    sim.startWizard();
    for (let i = 0; i < 3; i++) {
      sim.s.wizard.state = 'active';
      sim.s.wizard.vulnerable = true;
      sim.hitWizard('p0');
      if (i < 2) {
        assert.equal(sim.s.phase, 'intrusion');
        step(sim, 1.6);
      }
    }
    assert.equal(sim.s.phase, 'victory');
    assert.equal(sim.s.stats.wizardHits, 3);
    assert.equal(sim.s.earnedNextMultiplier, 4);
    assert.equal(sim.s.score, 7000);
    sim.victory();
    assert.equal(sim.s.score, 7000);
  });
  test('last manifestation relocates faster after its first guaranteed cast', () => {
    const sim = blank();
    sim.enterRoom(5);
    sim.s.phase = 'intrusion';
    sim.s.wizardStage = 1;
    sim.s.wizardRelocations = 1;
    sim.placeWizard();
    assert.equal(sim.s.wizard.teleportIn, sim.s.tuning.wizardTeleport);
    sim.s.wizardStage = 2;
    sim.s.wizardRelocations = 0;
    sim.placeWizard();
    assert.equal(sim.s.wizard.teleportIn, 1.05);
    assert.equal(sim.s.wizard.vulnerable, false);
    sim.placeWizard();
    assert.equal(sim.s.wizard.teleportIn, sim.s.tuning.wizardTeleport * 0.7);
    assert.equal(sim.s.wizard.vulnerable, true);
  });
  test('developer family removal clears active actors without score or stalled replacements', () => {
    const sim = blank();
    freeze(sim);
    enemy(sim, 'hopper', 9, 1);
    enemy(sim, 'stalker', 10, 1);
    enemy(sim, 'skitter', 11, 1);
    sim.s.pending = [
      {
        status: 'waiting',
        type: 'stalker',
        x: 9,
        y: 1,
        after: 1,
        at: null,
        delay: 0,
      },
    ];
    sim.dev('remove', 'hopper');
    assert.equal(sim.s.practice, true);
    assert.deepEqual(
      sim.s.enemies.map((e) => e.type),
      ['stalker', 'skitter'],
    );
    assert.equal(sim.s.roomKills, 1);
    assert.equal(sim.s.score, 0);
    assert.equal(sim.s.stats.kills, 0);
    sim.updatePending();
    assert.equal(sim.s.pending[0].status, 'spawned');
    assert.equal(sim.s.enemies.length, 3);
    sim.dev('remove', 'stalker');
    assert.deepEqual(
      sim.s.enemies.map((e) => e.type),
      ['skitter'],
    );
    sim.dev('remove', 'skitter');
    assert.equal(sim.s.enemies.length, 0);
  });
  test('lives decrement once, orphan bolt clears and respawn is protected', () => {
    const sim = blank(),
      p = sim.s.players[0];
    p.face = 0;
    sim.fire(p);
    sim.damage(p, 'test');
    sim.damage(p, 'test');
    assert.equal(p.lives, 2);
    assert.equal(p.alive, false);
    assert.equal(p.boltId, null);
    assert.equal(sim.s.bolts.length, 0);
    step(sim, 0.9);
    assert.equal(p.alive, true);
    assert.ok(p.protect > 0);
    sim.damage(p, 'test');
    assert.equal(p.lives, 2);
  });
  test('fallen co-op partner waits and returns at chamber descent', () => {
    const sim = blank({ seats: 2 });
    const p = sim.s.players[0];
    p.lives = 1;
    sim.damage(p, 'test');
    assert.equal(sim.s.phase, 'hunt');
    assert.equal(p.lives, 0);
    sim.clear();
    sim.nextRoom();
    assert.equal(p.lives, 1);
    assert.equal(p.alive, true);
  });
  test('team defeat and atomic retry restore room RNG, queue and score as Practice', () => {
    const sim = blank({ seats: 2 });
    sim.enterRoom(2);
    const cp = JSON.stringify(sim.checkpoint);
    for (const p of sim.s.players) {
      p.protect = 0;
      p.lives = 1;
      sim.damage(p, 'test');
    }
    assert.equal(sim.s.phase, 'defeat');
    sim.s.score = 12345;
    sim.retry();
    assert.equal(sim.s.phase, 'entry');
    assert.equal(sim.s.practice, true);
    assert.equal(sim.s.score, JSON.parse(cp).score);
    assert.equal(sim.s.rng, JSON.parse(cp).rng);
    assert.deepEqual(sim.s.pending, JSON.parse(cp).pending);
    assert.ok(sim.s.players.every((p) => p.lives >= 3));
  });
  test('checkpoint save roundtrip is exact and network snapshots omit checkpoint', () => {
    const sim = new Sim({ seed: 41 });
    step(sim, 0.4, [{ move: 0, aim: 0, fire: true }]);
    const copy = new Sim();
    copy.load(JSON.parse(JSON.stringify(sim.save())));
    assert.deepEqual(copy.s, sim.s);
    assert.deepEqual(copy.checkpoint, sim.checkpoint);
    assert.equal('checkpoint' in sim.snapshot({ network: true }), false);
  });
  test('leave removes actor and its bolt but preserves original seat indexes', () => {
    const sim = blank({ seats: 2 });
    sim.fire(sim.s.players[0]);
    sim.removeSeat(0);
    assert.deepEqual(sim.s.activeSeats, [1]);
    assert.equal(sim.s.players.length, 1);
    assert.equal(sim.s.players[0].seat, 1);
    assert.equal(sim.s.bolts.length, 0);
  });
  test('all live tuning values are numeric, developer actions mark Practice and reset fully', () => {
    const sim = blank();
    assert.equal(Object.keys(DEFAULTS).length, 19);
    for (const v of Object.values(sim.s.tuning)) assert.ok(Number.isFinite(v));
    sim.dev('invulnerable', true);
    sim.s.timeScale = 0.2;
    sim.s.tuning.boltSpeed = 44;
    sim.dev('lives', 7);
    sim.dev('spawn', 'skitter');
    assert.equal(sim.s.players[0].lives, 7);
    assert.equal(sim.s.enemies[0].type, 'skitter');
    sim.dev('reset');
    assert.equal(sim.s.practice, true);
    assert.equal(sim.s.invulnerable, false);
    assert.equal(sim.s.timeScale, 1);
    assert.deepEqual(sim.s.tuning, DEFAULTS);
    sim.dev('room', 4);
    assert.equal(sim.s.roomIndex, 4);
    sim.dev('phase', 'familiar');
    assert.equal(sim.s.phase, 'familiar');
    sim.dev('phase', 'intrusion');
    assert.equal(sim.s.phase, 'intrusion');
    sim.dev('restart');
    assert.equal(sim.s.phase, 'entry');
  });
  test('recovery never reduces Gentle starting life stock', () => {
    const sim = new Sim({ difficulty: 'gentle' });
    sim.s.roomIndex = 2;
    sim.s.phase = 'clear';
    sim.nextRoom();
    assert.equal(sim.s.players[0].lives, 5);
  });
  test('deterministic commands reproduce exact snapshots', () => {
    const a = new Sim({ seed: 71 }),
      b = new Sim({ seed: 71 });
    for (let i = 0; i < 1200; i++) {
      const c = [bot(a, 0)];
      a.step(1 / 60, c);
      b.step(1 / 60, c);
    }
    assert.deepEqual(a.snapshot(), b.snapshot());
  });
  const campaigns = [];
  for (const difficulty of ['normal', 'gentle'])
    test(`honest ${difficulty} campaign: six rooms, all mechanics, three-part finale`, () => {
      const sim = new Sim({ difficulty, seed: 20261106 }),
        timings = [],
        events = new Set();
      let lastRoom = -1,
        maxBytes = 0,
        seen = 0;
      for (let i = 0; i < 60 * 60 * 20; i++) {
        sim.step(1 / 60, [bot(sim, 0)]);
        const s = sim.s;
        if (s.roomIndex !== lastRoom) {
          timings.push({
            room: s.roomIndex + 1,
            enteredAt: Number(s.time.toFixed(3)),
          });
          lastRoom = s.roomIndex;
        }
        for (const e of s.events)
          if (e.id > seen) {
            events.add(e.type);
            seen = Math.max(seen, e.id);
          }
        if (i % 6 === 0)
          maxBytes = Math.max(
            maxBytes,
            Buffer.byteLength(
              JSON.stringify({
                v: 1,
                k: 'state',
                s: sim.snapshot({ network: true }),
              }),
            ),
          );
        assert.ok(!s.invulnerable && !s.practice && !s.attract);
        assert.ok(
          s.players.every(
            (p) => s.bolts.filter((b) => b.owner === p.id).length <= 1,
          ),
        );
        if (['victory', 'defeat'].includes(s.phase)) break;
      }
      assert.equal(sim.s.phase, 'victory');
      assert.equal(timings.length, 6);
      assert.equal(sim.s.stats.kills, 110);
      assert.equal(sim.s.stats.wizardHits, 5);
      assert.ok(sim.s.stats.familiars > 0);
      assert.ok(sim.s.stats.bells > 0);
      assert.ok(sim.s.stats.portals > 0);
      assert.ok(sim.s.stats.cloaked > 0);
      for (const e of [
        'lightning',
        'wizard-teleport',
        'parry',
        'bell',
        'portal',
        'victory',
      ])
        assert.ok(events.has(e), `missing mechanic ${e}`);
      assert.ok(maxBytes < 16000, `snapshot bytes ${maxBytes}`);
      campaigns.push({
        seed: 20261106,
        difficulty,
        result: sim.s.phase,
        simulatedSeconds: Number(sim.s.time.toFixed(3)),
        rooms: timings,
        stats: sim.s.stats,
        score: sim.s.score,
        maxSnapshotBytes: maxBytes,
        ordinaryCommandsOnly: true,
        cheats: false,
        humanPlaytest: false,
      });
    });
  test('varied seeds remain finite and playable without cheats', () => {
    for (const seed of [14, 111, 807]) {
      const sim = new Sim({ seed, difficulty: 'gentle' });
      for (let i = 0; i < 60 * 60 * 12; i++) {
        sim.step(1 / 60, [bot(sim, 0)]);
        if (['victory', 'defeat'].includes(sim.s.phase)) break;
      }
      assert.ok(
        ['victory', 'defeat'].includes(sim.s.phase),
        `seed ${seed} stalled`,
      );
      assert.ok(sim.s.roomIndex >= 2, `seed ${seed} failed teaching chambers`);
    }
  });
  fs.mkdirSync(path.join(ROOT, 'evidence'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'evidence/campaign.json'),
    JSON.stringify(
      {
        campaigns,
        notes:
          'Perfect radar-aware command bot; this is automated gameplay, not a human first-run timing measurement. All actions obey normal movement, aiming, fire, one-bolt, lives and damage rules.',
      },
      null,
      2,
    ),
  );
  return { passed, failures };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await runTests();
  for (const f of r.failures) console.error('FAIL ' + f);
  console.log(`${r.passed} passed; ${r.failures.length} failed`);
  if (r.failures.length) process.exitCode = 1;
}
