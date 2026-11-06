import assert from 'node:assert/strict';
import { load } from '../tools/load.mjs';

/** Quiet deterministic tests; the aggregate runner owns reporting. */
export async function runSimulationTests() {
  const P = globalThis.PD || load();
  const E = globalThis.My3D2dge;
  const failures = [];
  let count = 0;
  const test = (name, fn) => {
    count++;
    try {
      fn();
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  };
  const approx = (value, target, tolerance = 0.01) =>
    assert.ok(Math.abs(value - target) <= tolerance, `expected ${value} near ${target} ±${tolerance}`);
  const advance = (m, seconds, intents = {}) => {
    const ticks = Math.ceil(seconds / P.STEP);
    for (let i = 0; i < ticks; i++) m.step(typeof intents === 'function' ? intents(i, m) : intents);
  };
  const fresh = (options = {}) => {
    const m = new P.Mine(options);
    m.relief = 0;
    m.nextSpawn = m.nextPair = 1e6;
    m.step();
    m.step();
    m.takeEvents();
    return m;
  };
  const coop = () =>
    fresh({
      roster: [
        { id: 0, name: 'Pete' },
        { id: 1, name: 'Pat' },
      ],
    });
  const spawnAt = (m, kind = 'ore', dx = 22, extra = {}) => {
    const b = m.players[0].body;
    return m.spawnRock(kind, b.x + dx, b.z + 10, 0, extra);
  };

  test('authored content validates IDs and top-first/bottom-first rows', () => {
    assert.equal(P.validateContent(), true);
    assert.equal(P.rowFromBottom(0, 17), 16);
    assert.equal(P.rowFromBottom(16, 17), 0);
    const r = P.buildRoom(0);
    assert.equal(r.level.cell(1, 0), 1, 'bottom row must be solid');
    assert.equal(r.level.cell(5, 1), 3, 'ladder cell must match visual row');
    assert.equal(r.rows[P.rowFromBottom(1, r.rows.length)][5], 'H');
    assert.equal(r.level.cell(9, 3), 0, 'authored gap must remain open');
    assert.equal(new Set(r.doors.map((d) => d.symbol)).size, 3);
  });
  test('native landing feet align, run accelerates, and valid drops are safe', () => {
    const m = fresh(),
      p = m.players[0];
    approx(p.body.z, 16);
    assert.equal(p.body.onGround, true);
    const x = p.body.x;
    advance(m, 0.35, { 0: { x: 1 } });
    assert.ok(p.body.x > x + 25);
    assert.ok(p.body.vx > 95);
    Object.assign(p.body, {
      x: 155,
      z: 64,
      vz: 0,
      vx: 0,
      onGround: false,
      air: true,
    });
    advance(m, 0.75);
    approx(p.body.z, 16);
    assert.equal(p.hp, 3, 'tier drops must not damage');
  });
  test('native coyote jump accepts late edge press and rejects an expired press', () => {
    const level = new E.PlatformMap({
      rows: ['........', '####....'],
      legend: { '#': 1 },
      types: { 1: { style: 'stone' } },
      edges: 'open',
    });
    const offEdge = (wait) => {
      const b = new E.Platformer({
        x: 54,
        z: 16,
        w: 10,
        h: 24,
        run: 100,
        onGround: true,
      });
      let guard = 100;
      while (b.onGround && guard--) b.update(P.STEP, level, { x: 1 });
      assert.ok(guard > 0, 'did not walk off test ledge');
      for (let i = 0; i < wait; i++) b.update(P.STEP, level, { x: 1 });
      b.update(P.STEP, level, { x: 1, jump: true, jumpPressed: true });
      return b;
    };
    assert.equal(offEdge(3).jumped, true);
    assert.equal(offEdge(16).jumped, false);
  });
  test('canonical jump buffer survives until the landing tick', () => {
    const m = fresh(),
      p = m.players[0];
    Object.assign(p.body, {
      z: 23,
      vz: -55,
      onGround: false,
      air: true,
      _coy: 0,
    });
    let landed = false,
      jumpedAfterLanding = false;
    for (let i = 0; i < 30; i++) {
      m.step({ 0: { jump: true, jumpPressed: i === 0 } });
      landed ||= p.body.landed;
      if (p.body.jumped) {
        assert.ok(landed && i > 0, 'buffer jumped before contact');
        jumpedAfterLanding = true;
      }
    }
    assert.ok(jumpedAfterLanding, 'buffered jump was lost at landing');
  });
  test('held native jump rises materially higher than a tapped jump', () => {
    const peak = (hold) => {
      const m = fresh();
      let peakZ = 0;
      for (let i = 0; i < 100; i++) {
        m.step({ 0: { jump: i < hold, jumpPressed: i === 0 } });
        peakZ = Math.max(peakZ, m.players[0].body.z);
      }
      return peakZ;
    };
    assert.ok(peak(40) > peak(3) + 15);
  });
  test('crouch fits low clearance and cannot stand inside a ceiling', () => {
    const m = fresh(),
      b = m.players[0].body;
    b.x = 120;
    m.room.level.set(7, 2, 1);
    m.step({ 0: { down: true } });
    assert.equal(b.h, 12);
    assert.equal(b.crouching, true);
    m.step();
    assert.equal(b.h, 12, 'standing inside ceiling must be prevented');
    advance(m, 0.75, { 0: { x: -1 } });
    assert.ok(b.x < 100);
    assert.equal(b.h, 24);
  });
  test('native ladder climbs, dismounts with jump, and descends from top despite crouch', () => {
    const m = fresh(),
      b = m.players[0].body;
    for (let i = 0; i < 100 && b.z < 63; i++) m.step({ 0: { up: true } });
    assert.ok(b.climbing && b.z >= 63, `climb stopped at ${b.z}`);
    m.step({ 0: { x: 1, jump: true, jumpPressed: true } });
    assert.equal(b.climbing, false);
    assert.ok(b.x > 88);
    advance(m, 0.4, { 0: { x: 1 } });
    assert.ok(b.z >= 63, 'dismount must land on upper ledge');
    Object.assign(b, {
      x: 88,
      z: 64,
      vx: 0,
      vz: 0,
      onGround: true,
      climbing: false,
    });
    m.step({ 0: { down: true } });
    assert.ok(b.climbing && b.z < 64, 'Down at ladder top was swallowed by crouch');
  });
  test('temporary ladder expiry grants a landing and restores underlying floor', () => {
    const m = fresh(),
      p = m.players[0],
      l = m.room.ladders.find((l) => l.temporary && l.from === 16);
    Object.assign(p.body, {
      x: l.x,
      z: 50,
      climbing: true,
      onGround: false,
      vx: 0,
      vz: 0,
    });
    l.state = 'warning';
    l.timer = 0.01;
    advance(m, 1.25);
    assert.equal(p.ladderGrace, null, 'ladder grace latched forever');
    assert.equal(p.body.climbing, false);
    assert.equal(p.body.onGround, true);
    approx(p.body.z, 64);
    assert.ok(p.body.x > l.x + 10);
    assert.ok(['expired', 'inactive'].includes(l.state));
    assert.equal(m.room.level.cell(l.cx, 3), 2, 'floor under ladder must survive expiry');
    assert.equal(m.features.ladderDismount, 1);
  });
  test('temporary ladders complete inactive/forming/usable/warning/expired cycle', () => {
    const m = fresh(),
      l = m.room.ladders.find((l) => l.temporary);
    l.state = 'inactive';
    l.timer = 0.01;
    const states = new Set([l.state]);
    for (let i = 0; i < 2400; i++) {
      m.step();
      states.add(l.state);
    }
    for (const state of ['inactive', 'forming', 'usable', 'warning', 'expired'])
      assert.ok(states.has(state), state);
  });
  for (let chamber = 0; chamber < 3; chamber++)
    test(`all permanent routes remain traversable with temporary ladders expired: chamber ${chamber}`, () => {
      const m = fresh({ chamber }),
        p = m.players[0],
        pilot = new P.Pilot(2);
      for (const l of m.room.ladders.filter((l) => l.temporary)) {
        l.state = 'inactive';
        l.timer = 1e6;
        for (const [cx, cz, under] of l.cells) m.room.level.set(cx, cz, under);
      }
      for (let tier = 1; tier < m.room.def.tiers; tier++) {
        let reached = false;
        for (let i = 0; i < 3600; i++) {
          const intent = P.neutral();
          pilot.steer(m, p, { x: 360, z: P.floorZ(tier), tier }, intent);
          m.step({ 0: intent });
          if (Math.abs(p.body.z - P.floorZ(tier)) < 2 && p.body.x > 345) {
            reached = true;
            break;
          }
        }
        assert.ok(reached, `tier ${tier}: x=${p.body.x.toFixed(1)} z=${p.body.z.toFixed(1)}`);
      }
    });

  test('missed swings cost no tool durability or gold', () => {
    const m = fresh();
    advance(m, 1, { 0: { chop: true } });
    assert.equal(m.players[0].tool, 6);
    assert.equal(m.stats.chops, 0);
    assert.equal(m.score, 0);
  });
  test('one swing deduplicates a heavy rock contact throughout active phase', () => {
    const m = fresh(),
      r = spawnAt(m, 'heavy');
    m.step({ 0: { chop: true } });
    advance(m, 0.27);
    assert.equal(m.stats.chops, 1);
    assert.equal(r.hp, 2);
    assert.equal(m.players[0].tool, 5);
    assert.equal(m.stats.breaks, 0);
  });
  test('banded heavy rock requires three genuine chopping contacts', () => {
    const m = fresh(),
      r = spawnAt(m, 'heavy', 32);
    for (let i = 0; i < 400 && !r.dead; i++) {
      const dx = r.x - m.players[0].body.x;
      m.step({ 0: { x: dx > 24 ? 1 : dx < 0 ? -1 : 0, chop: true } });
    }
    assert.equal(m.stats.chops, 3);
    assert.equal(r.dead, true);
    assert.equal(m.players[0].tool, 3);
    assert.equal(m.score, 3);
    assert.equal(m.features.armor, 2);
  });
  test('redirect arcs, grace and short active window govern contact', () => {
    const outcomes = [-1, 1].map((aim) => {
      const m = fresh(),
        p = m.players[0],
        r = spawnAt(m, 'ore', 22, { vx: -20 });
      m.step({ 0: { redirect: true, aim } });
      for (let i = 0; i < 24 && m.stats.redirects === 0; i++) m.step();
      assert.equal(m.stats.redirects, 1);
      assert.equal(r.redirect, 0);
      assert.ok(r.grace > 0.35);
      assert.ok(r.vx > m.tuning.rockSpeed * 2);
      assert.equal(p.tool, 5);
      const vz = r.vz;
      while (p.action.phase !== 'recover' && p.action.phase !== null) m.step();
      const late = spawnAt(m, 'ore', 16);
      advance(m, 0.09);
      assert.equal(late.redirect, null, 'recovery phase accepted a new redirect contact');
      assert.equal(m.stats.redirects, 1);
      return vz;
    });
    assert.ok(outcomes[1] > outcomes[0] + 120, `high/low arcs collapsed: ${outcomes}`);
  });
  test('final tool contact breaks once and cannot strike a second simultaneous rock', () => {
    const m = fresh(),
      p = m.players[0];
    p.tool = 1;
    spawnAt(m, 'ore', 20);
    const second = spawnAt(m, 'ore', 25);
    advance(m, 0.25, { 0: { chop: true } });
    assert.equal(p.tool, 0);
    assert.equal(m.stats.breaks, 1);
    assert.equal(m.stats.chops, 1);
    assert.equal(second.dead, false);
    assert.equal(m.score, 3);
  });
  test('active chop resolves before an overlapping rock can deal damage', () => {
    const m = fresh(),
      p = m.players[0];
    p.invuln = 0;
    p.action = new E.Attack('overhead', {
      wind: 0.06,
      active: 0.11,
      recover: 0.15,
    });
    p.action.phase = 'active';
    p.action.t = 0.06;
    spawnAt(m, 'ore', 4);
    m.step();
    assert.equal(p.hp, 3);
    assert.equal(m.stats.chops, 1);
    assert.equal(m.stats.damage, 0);
  });
  test('rock pairs resolve before damage and cannot duplicate collision awards', () => {
    const m = fresh(),
      p = m.players[0];
    p.body.x = 208;
    p.invuln = 0;
    const a = m.spawnRock('ore', 206, 26, 50, { reward: 'gold' });
    const b = m.spawnRock('ore', 210, 26, -50);
    m.step();
    assert.equal(p.hp, 3);
    assert.equal(m.stats.collisions, 1);
    const score = m.score;
    m.collide(a, b);
    assert.equal(m.stats.collisions, 1);
    assert.equal(m.score, score);
  });
  test('damage precedes pickup and pickup gives a complete tool with recovery grace', () => {
    const m = fresh(),
      p = m.players[0];
    p.invuln = 0;
    p.tool = 0;
    spawnAt(m, 'ore', 0);
    m.spawnPick(p.body.x, 8);
    m.step();
    assert.equal(p.hp, 2);
    assert.equal(p.tool, m.tuning.durability);
    assert.ok(p.invuln >= 2);
    const types = m.events.map((e) => e.type);
    assert.ok(types.indexOf('hurt') < types.indexOf('pick'), types.join(','));
  });
  test('simultaneous contacts cannot chain damage during invulnerability', () => {
    const m = fresh(),
      p = m.players[0];
    p.invuln = 0;
    spawnAt(m, 'ore', 0);
    spawnAt(m, 'ore', 1);
    m.step();
    assert.equal(p.hp, 2);
    assert.equal(m.stats.damage, 1);
    advance(m, 0.25);
    assert.equal(p.hp, 2);
    assert.equal(m.stats.damage, 1);
    assert.ok(p.body.stun <= 0.22 && p.invuln > 1.5);
  });
  test('tool break, pair collision and pickup in one tick are reproducibly ordered', () => {
    const m = fresh(),
      p = m.players[0];
    p.tool = 1;
    p.action = new E.Attack('overhead', { active: 0.11 });
    p.action.phase = 'active';
    p.action.t = 0.06;
    spawnAt(m, 'ore', 20);
    m.spawnRock('ore', 206, 26, 50, { reward: 'gold' });
    m.spawnRock('ore', 210, 26, -50);
    m.spawnPick(p.body.x, 8);
    m.takeEvents();
    const restored = P.Mine.restore(JSON.parse(JSON.stringify(m.snapshot())));
    m.step();
    restored.step();
    assert.deepEqual(restored.snapshot(), m.snapshot());
    assert.deepEqual(restored.events, m.events);
    const types = m.events.map((e) => e.type);
    assert.ok(
      types.indexOf('break') < types.indexOf('collision') &&
        types.indexOf('collision') < types.indexOf('pick'),
      types.join(','),
    );
    assert.equal(p.tool, 6);
    assert.equal(m.stats.breaks, 1);
  });
  test('stationary rock loops earn no evade; a ducked pass earns at most once per rock', () => {
    const run = (down) => {
      const m = fresh();
      m.spawnRock('ore', 48, 74, 72, { vz: 90 });
      advance(m, 1, { 0: { down } });
      return m;
    };
    assert.equal(run(false).stats.evades, 0);
    const m = run(true);
    assert.equal(m.stats.evades, 1);
    advance(m, 8, { 0: { down: true } });
    assert.equal(m.stats.evades, 1);
  });
  test('shared pickup collection and shared key ownership award each entity once', () => {
    const m = coop();
    for (const p of m.players) {
      p.body.x = 88;
      p.tool = 0;
    }
    m.spawnPick(88, 8);
    m.spawnKey(88, 26);
    m.step();
    assert.equal(m.stats.picks, 1);
    assert.equal(m.stats.keys, 1);
    assert.equal(m.score, 15);
    assert.equal(m.players.filter((p) => p.tool === 6).length, 1);
    assert.equal(m.key, null);
    assert.equal(m.keyOwner, 0);
    assert.equal(m.spawnKey(88, 26), null, 'second progression key created while carrying');
    m.updatePickups(P.STEP);
    assert.equal(m.score, 15);
  });
  test('key singleton and carrier departure recover into a deterministic reachable shaft', () => {
    const m = coop();
    m.spawnKey(200, 64);
    assert.equal(m.spawnKey(88, 26), null);
    m.key = null;
    m.keyOwner = 0;
    m.players[0].body.z = 112;
    m.leave(0);
    assert.equal(m.keyOwner, null);
    assert.ok(m.key?.recovered);
    assert.equal(m.key.baseX, 88);
    assert.equal(m.key.z, 120);
    assert.equal(m.players[0].id, 1);
    const restored = P.Mine.restore(m.snapshot());
    assert.deepEqual(restored.key, m.key);
  });
  test('seeded reward deck and subsequent random draws reproduce', () => {
    const a = fresh({ seed: 77 }),
      b = fresh({ seed: 77 });
    assert.deepEqual(a.deck, b.deck);
    for (let i = 0; i < 30; i++) assert.equal(a.rng.next(), b.rng.next());
    assert.notDeepEqual(
      a.deck,
      fresh({ seed: 78 }).deck,
      'chosen distinct seeds unexpectedly share test deck',
    );
  });
  test('all-unarmed replacement opportunity arrives inside configured maximum wait', () => {
    const m = fresh(),
      p = m.players[0];
    p.tool = 0;
    p.body.x = 48;
    const start = m.time;
    while (!m.pickups.length && m.time - start < m.tuning.pickRecovery + 0.05) m.step();
    assert.ok(m.pickups.length, `no pick after ${(m.time - start).toFixed(3)}s`);
    assert.ok(m.time - start <= m.tuning.pickRecovery);
    const item = m.pickups[0];
    assert.ok(item.x > 190 && item.x < 225);
    assert.ok(m.features.warning && m.features.collision, 'supply must arise through a visible crash');
    advance(m, 3);
    approx(item.z, 25);
  });
  test('ignored picks expire and continued unarmed play retains repeated recovery for three minutes', () => {
    const m = fresh(),
      p = m.players[0];
    p.tool = 0;
    p.body.x = 48;
    m.god = true;
    const offers = [];
    let lastSupply = 0;
    for (let i = 0; i < 180 * 120; i++) {
      m.step();
      if ((m.features.supply || 0) !== lastSupply) {
        offers.push(m.time);
        lastSupply = m.features.supply || 0;
      }
    }
    assert.equal(p.tool, 0, 'scenario accidentally collected a tool');
    assert.ok(
      offers.length >= 4 && m.features.pickExpire >= 3,
      `offers=${offers.length} expired=${m.features.pickExpire}`,
    );
    for (let i = 1; i < offers.length; i++)
      assert.ok(offers[i] - offers[i - 1] < m.tuning.pickLife + m.tuning.pickRecovery + 0.05);
    assert.ok(
      m.pickups.some((item) => item.z <= 28),
      'no reachable lower supply remains',
    );
  });
  test('expired and repeatedly ignored keys yield another key inside configured bound', () => {
    const m = fresh(),
      p = m.players[0];
    p.body.x = 300;
    m.work = m.room.def.quota;
    m.god = true;
    let lastRise = 0,
      lastExpire = 0,
      lastExpiredAt = null;
    const gaps = [];
    for (let i = 0; i < 180 * 120; i++) {
      m.step();
      if ((m.features.keyExpire || 0) !== lastExpire) {
        lastExpire = m.features.keyExpire || 0;
        lastExpiredAt = m.time;
      }
      if ((m.features.keyRise || 0) !== lastRise) {
        lastRise = m.features.keyRise || 0;
        gaps.push(lastExpiredAt === null ? m.time : m.time - lastExpiredAt);
      }
    }
    assert.ok(lastRise >= 3 && lastExpire >= 2, `rises=${lastRise} expires=${lastExpire}`);
    assert.equal(m.keyOwner, null);
    for (const gap of gaps) assert.ok(gap <= m.tuning.keyRecovery + 0.05, `key recovery ${gap}s`);
  });
  test('door walking is inert; explicit keyless interaction jams escapably', () => {
    const m = fresh(),
      p = m.players[0];
    p.body.x = 48;
    advance(m, 0.2);
    assert.equal(m.features.jam || 0, 0);
    assert.equal(m.status, 'playing');
    m.step({ 0: { interact: true, interactPressed: true } });
    assert.equal(m.features.jam, 1);
    advance(m, 0.45, { 0: { x: 1 } });
    assert.ok(p.body.x > 65);
    assert.equal(m.status, 'playing');
  });
  test('strike pressure stays bounded and doorway entry starts with relief', () => {
    const m = fresh(),
      p = m.players[0];
    m.addWork(10000);
    assert.equal(m.pressure, 1);
    m.keyOwner = 0;
    p.body.x = 48;
    m.step({ 0: { interactPressed: true } });
    assert.equal(m.status, 'transition');
    const hp = p.hp;
    m.damage(p, { x: p.body.x });
    assert.equal(p.hp, hp);
    advance(m, 1.7);
    assert.equal(m.chamber, 1);
    assert.equal(m.pressure, 0);
    assert.ok(m.relief > 3.8);
  });
  test('checkpoint failure/retry forfeits unbanked bonus and cannot duplicate banked rewards', () => {
    const m = fresh({ chamber: 1 });
    m.score = m.bank = 100;
    m.loadRoom(1, true);
    m.award('unbanked-test', 30);
    assert.equal(m.award('unbanked-test', 30), false);
    const p = m.players[0];
    m.relief = 0;
    p.hp = 1;
    p.invuln = 0;
    m.damage(p, { x: p.body.x });
    m.step();
    assert.equal(m.status, 'failure');
    const tick = m.tick;
    m.step({ 0: { x: 1 } });
    assert.equal(m.tick, tick);
    m.retry();
    assert.equal(m.status, 'playing');
    assert.equal(m.chamber, 1);
    assert.equal(m.score, 100);
    assert.equal(m.bank, 100);
    assert.equal(m.bonus, 0);
    assert.equal(m.players[0].hp, 3);
    assert.equal(m.players[0].tool, 6);
    m.retry();
    assert.equal(m.score, 100);
    assert.equal(m.bank, 100);
  });
  test('co-op join ownership, early join window and safe departure preserve solo viability', () => {
    const m = fresh();
    assert.equal(m.join({ id: 1, name: 'Pat' }), true);
    assert.equal(m.join({ id: 2, name: 'Third' }), false);
    const before = m.players[0].body.x;
    advance(m, 0.3, { 1: { x: 1 } });
    approx(m.players[0].body.x, before);
    assert.ok(m.players[1].body.x > 130);
    m.leave(1);
    assert.equal(m.players.length, 1);
    assert.equal(m.status, 'playing');
    m.age = 7;
    assert.equal(m.join({ id: 1, name: 'Late' }), false);
  });
  test('rescue requires a sustained nearby hold and restores the partner safely', () => {
    const m = coop(),
      [a, b] = m.players;
    a.body.x = 100;
    b.body.x = 112;
    b.hp = 0;
    b.down = true;
    advance(m, 0.7, { 0: { interact: true } });
    assert.equal(b.down, true);
    m.step();
    approx(a.rescueT, 0);
    advance(m, m.tuning.rescueTime + 0.02, { 0: { interact: true } });
    assert.equal(b.down, false);
    assert.equal(b.hp, 2);
    assert.ok(b.invuln > 2.9);
    assert.equal(m.stats.rescues, 1);
    assert.equal(a.contribution.rescues, 1);
  });
  test('door transition restores a downed partner with the declared score cost', () => {
    const m = coop(),
      [a, b] = m.players;
    m.score = 100;
    b.down = true;
    b.hp = 0;
    a.body.x = 48;
    m.keyOwner = 0;
    m.step({ 0: { interactPressed: true } });
    const before = m.score;
    advance(m, 1.7);
    assert.equal(b.down, false);
    assert.equal(b.hp, 3);
    assert.equal(m.score, before - 15);
    assert.equal(m.features.reviveCost, 1);
  });
  test('complete co-op wipe is terminal and retry restores checkpoint defaults', () => {
    const m = coop();
    for (const p of m.players) {
      p.hp = 1;
      p.invuln = 0;
      m.damage(p, { x: p.body.x });
    }
    m.step();
    assert.equal(m.status, 'failure');
    assert.equal(m.features.failure, 1);
    const time = m.time;
    advance(m, 1);
    assert.equal(m.time, time);
    m.retry();
    assert.ok(m.players.every((p) => p.hp === 3 && !p.down && p.tool === 6));
  });
  test('mid-jump/mid-ladder snapshot round-trip preserves next events and random outcomes', () => {
    const m = coop(),
      [a, b] = m.players;
    a.body.x = 140;
    b.body.x = 88;
    m.nextSpawn = 0.4;
    m.nextPair = 2;
    for (let i = 0; i < 25; i++) m.step({ 0: { jump: true, jumpPressed: i === 0 }, 1: { up: true } });
    assert.ok(a.body.air && !a.body.climbing);
    assert.ok(b.body.climbing);
    m.takeEvents();
    const restored = P.Mine.restore(JSON.parse(JSON.stringify(m.snapshot())));
    assert.deepEqual(restored.snapshot(), m.snapshot());
    for (let i = 0; i < 1200; i++) {
      const intents = {
        0: { x: i < 60 ? 1 : 0, down: i % 90 < 20 },
        1: { up: i < 70, down: i >= 70 && i < 140 },
      };
      m.step(intents);
      restored.step(intents);
    }
    assert.deepEqual(restored.snapshot(), m.snapshot());
    assert.deepEqual(restored.events, m.events);
    for (let i = 0; i < 20; i++) assert.equal(restored.rng.next(), m.rng.next());
  });
  test('all tuning ranges validate, invalid writes fail, and reset restores every default', () => {
    const m = fresh();
    for (const [key, schema] of Object.entries(P.TUNING)) {
      assert.throws(() => m.setTuning(key, schema.min - 1), /Invalid tuning/);
      assert.throws(() => m.setTuning(key, NaN), /Invalid tuning/);
      m.setTuning(key, schema.max);
      assert.equal(m.tuning[key], schema.max);
    }
    assert.throws(() => m.setTuning('missing', 5), /Invalid tuning/);
    m.resetTuning();
    assert.deepEqual(m.tuning, P.defaults());
    assert.equal(m.developer, true);
  });
  test('immediate motion tuning updates native bodies on the next tick', () => {
    const m = fresh();
    for (const [key, value] of [
      ['moveSpeed', 140],
      ['climbSpeed', 100],
      ['jumpSpeed', 350],
      ['gravity', 1000],
    ])
      m.setTuning(key, value);
    m.step({ 0: { x: 1 } });
    const b = m.players[0].body;
    assert.equal(b.run, 140);
    assert.equal(b.climb, 100);
    assert.equal(b.jump, 350);
    assert.equal(b.gravity, 1000);
  });
  test('next-action, next-supply and next-cycle tuning respects documented application points', () => {
    const m = fresh(),
      p = m.players[0];
    m.setTuning('chopCycle', 0.5);
    m.step({ 0: { chop: true } });
    approx(p.action.spec.wind + p.action.spec.active + p.action.spec.recover, 0.5);
    p.action.cancel();
    m.setTuning('redirectWindow', 0.3);
    m.step({ 0: { redirect: true } });
    approx(p.action.spec.active, 0.3);
    m.setTuning('keyLife', 60);
    m.setTuning('pickLife', 55);
    m.setTuning('durability', 9);
    const pick = m.spawnPick(88, 8),
      key = m.spawnKey(300, 26);
    assert.equal(pick.life, 55);
    assert.equal(key.life, 60);
    p.tool = 0;
    m.step();
    assert.equal(p.tool, 9);
    const l = m.room.ladders.find((l) => l.temporary);
    l.state = 'forming';
    l.timer = 0.001;
    m.setTuning('ladderLife', 20);
    m.step();
    assert.equal(l.state, 'usable');
    approx(l.timer, 20);
    m.setTuning('pressureGain', 0.05);
    m.addWork(1);
    approx(m.pressure, 0.05);
    m.setTuning('spawnInterval', 10);
    m.setTuning('rockSpeed', 100);
    m.nextSpawn = 0;
    m.step();
    assert.ok(m.nextSpawn > 9 && m.nextSpawn <= 10);
    advance(m, 1.2);
    assert.ok(
      m.rocks.some((r) => Math.abs(r.vx) === 100),
      'new door rock did not use speed tuning',
    );
  });

  test('ladder-facing input can defend against ore behind the prior facing', () => {
    const m = fresh(),
      p = m.players[0];
    Object.assign(p.body, {
      x: 88,
      z: 40,
      climbing: true,
      onGround: false,
      facing: 1,
      vx: 0,
      vz: 0,
    });
    const rock = m.spawnRock('ore', 66, 50, 0);
    advance(m, 0.18, { 0: { x: -1, chop: true } });
    assert.equal(p.body.facing, -1);
    assert.equal(rock.dead, true);
    assert.equal(p.tool, 5);
  });
  test('bottom safety net returns an accidental shaft drop without health loss', () => {
    const m = fresh(),
      p = m.players[0];
    Object.assign(p.body, {
      x: 290,
      z: -24,
      vz: -330,
      onGround: false,
      air: true,
    });
    p.invuln = 0;
    m.step();
    approx(p.body.x, 88);
    approx(p.body.z, 16);
    assert.equal(p.hp, 3);
    assert.ok(p.invuln >= 2);
    assert.equal(m.features.recovery, 1);
  });
  test('duplicate couch seat IDs are rejected without altering ownership', () => {
    const m = fresh();
    assert.equal(m.join({ id: 0, name: 'Duplicate' }), false);
    assert.equal(m.players.length, 1);
    assert.equal(m.roster.length, 1);
    assert.equal(m.players[0].name, 'Pete');
  });
  test('an armed camping partner cannot starve the unarmed miner of deck supplies', () => {
    const m = coop(),
      [a, b] = m.players,
      pilot = new P.Pilot(0);
    a.tool = 0;
    b.body.x = 368;
    m.nextPair = 0;
    m.god = true;
    let offered = false;
    for (let i = 0; i < 80 * 120; i++) {
      m.step();
      if (m.pickups.some((p) => p.kind === 'pick')) {
        offered = true;
        break;
      }
    }
    assert.ok(offered, 'reward deck offered no reachable pick with one player camping');
    for (let i = 0; i < 10 * 120 && a.tool === 0; i++) m.step({ 0: pilot.intent(m, a) });
    assert.equal(a.tool, 6);
    assert.equal(b.tool, 6);
    assert.ok(m.stats.picks >= 1);
  });

  for (const kind of ['pick', 'key'])
    for (const bound of [P.TUNING[`${kind}Recovery`].min, P.TUNING[`${kind}Recovery`].max]) {
      test(`${kind} recovery slider changes the live bound to ${bound}s`, () => {
        const m = fresh(),
          p = m.players[0];
        p.body.x = 300;
        m.setTuning(`${kind}Recovery`, bound);
        if (kind === 'pick') p.tool = 0;
        else m.work = m.room.def.quota;
        const began = m.time;
        while (m.time - began <= bound + 0.025 && !(kind === 'pick' ? m.pickups.length : m.key)) m.step();
        assert.ok(kind === 'pick' ? m.pickups.length : m.key, `no ${kind} at configured ${bound}s bound`);
        assert.ok(m.time - began <= bound + 0.025);
      });
    }
  test('live rescue-time slider changes a partly completed hold', () => {
    const m = coop(),
      [a, b] = m.players;
    a.body.x = 100;
    b.body.x = 112;
    b.down = true;
    b.hp = 0;
    advance(m, 0.3, { 0: { interact: true } });
    assert.equal(b.down, true);
    m.setTuning('rescueTime', 0.5);
    advance(m, 0.22, { 0: { interact: true } });
    assert.equal(b.down, false);
    assert.equal(m.stats.rescues, 1);
  });

  for (const seed of [73082, 73083, 73084, 1, 12345])
    for (let route = 0; route < 3; route++) {
      test(`normal canonical expedition seed=${seed} route=${route}`, () => {
        const m = new P.Mine({ seed }),
          pilot = new P.Pilot(route);
        while (m.time < 900 && ['playing', 'transition'].includes(m.status)) {
          m.step({ 0: pilot.intent(m) });
          m.takeEvents();
        }
        assert.equal(
          m.status,
          'victory',
          `stopped at chamber=${m.chamber} time=${m.time.toFixed(2)} health=${m.players[0].hp}`,
        );
        assert.equal(m.god, false);
        assert.equal(m.attract, false);
        assert.equal(m.developer, false);
        assert.equal(m.stats.keys, 3);
        assert.equal(m.stats.doors, 3);
        assert.equal(m.features.wave, 3);
        assert.equal(m.features.waveClear, 3);
        assert.ok(m.stats.high && m.stats.low, 'both redirect routes must be demonstrated');
        assert.ok(m.stats.collisions > 0, 'no rock collision');
        if (seed === 73082)
          assert.ok(
            m.history.some((e) => e.type === 'collision' && e.redirected),
            'no deliberate redirected collision on baseline route',
          );
        for (const type of [
          'jump',
          'duck',
          'climb',
          'jam',
          'chop',
          'break',
          'pick',
          'key',
          'door',
          'victory',
        ])
          assert.ok(m.features[type], `missing ${type}`);
        const types = m.history.map((e) => e.type);
        let at = -1;
        for (const type of ['break', 'pick', 'key', 'door']) {
          at = types.indexOf(type, at + 1);
          assert.ok(at >= 0, `missing ordered ${type}`);
        }
        assert.ok(m.time < 900 - 60, `deadline margin too small: ${m.time}`);
        const ids = m.history.map((e) => e.id);
        assert.equal(new Set(ids).size, ids.length, 'event IDs reused');
      });
    }
  for (let route = 0; route < 3; route++)
    test(`simultaneous canonical co-op expedition route=${route}`, () => {
      const m = new P.Mine({
          roster: [
            { id: 0, name: 'Pete' },
            { id: 1, name: 'Pat' },
          ],
        }),
        pilots = [new P.Pilot(route), new P.Pilot(route)];
      while (m.time < 900 && ['playing', 'transition'].includes(m.status)) {
        m.step(Object.fromEntries(m.players.map((p, i) => [p.id, pilots[i].intent(m, p)])));
        m.takeEvents();
      }
      assert.equal(m.status, 'victory', `chamber=${m.chamber} time=${m.time.toFixed(2)}`);
      assert.equal(m.god, false);
      assert.equal(m.attract, false);
      assert.equal(m.stats.doors, 3);
      assert.equal(m.stats.keys, 3);
      assert.equal(m.features.waveClear, 3);
      assert.ok(m.players.some((p) => !p.down));
    });

  return { count, failures };
}
