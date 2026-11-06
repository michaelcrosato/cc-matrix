import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';

export function simulation() {
  const result = [],
    context = { console: { log() {}, warn() {}, error() {} }, MA_NO_BOOT: true };
  vm.createContext(context);
  for (const file of [
    'vendor/engine/my-3d2dge.js',
    'src/content/content.js',
    'src/sim/world.js',
    'src/view/assets.js',
  ])
    vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
  const M = context.MA,
    E = context.My3D2dge;
  const test = (name, fn) => {
    try {
      const value = fn();
      result.push({ name, pass: value !== false, detail: value === false ? 'returned false' : '' });
    } catch (err) {
      result.push({ name, pass: false, detail: err.stack });
    }
  };
  const assert = (value, msg) => {
    if (!value) throw Error(msg);
  };
  const step = (w, n, commands = []) => {
    for (let i = 0; i < n * 120; i++)
      w.step(1 / 120, typeof commands === 'function' ? commands(w) : commands);
  };
  test('all authored room states have safe spawns and ordinary objective paths', () => {
    const w = new M.World();
    for (const def of Object.values(M.ROOMS)) {
      assert(
        def.rows.every((r) => r.length === def.w),
        `${def.id}: inconsistent row width`,
      );
      for (const state of [0, 1]) {
        w.loadRoom(def.id, false);
        w.applyShift(state, true);
        for (const s of def.spawns) assert(w.safe(s.x, s.y), `${def.id}: unsafe spawn`);
        for (const target of [def.exit, def.ring, def.cache, ...(def.stations || [])].filter(Boolean))
          assert(
            w.findPath(def.spawns[0], target).length || M.distance(def.spawns[0], target) < 16,
            `${def.id}: no path in shift state ${state}`,
          );
      }
    }
  });
  test('Dread charges entry and retry exactly once; room two and Continue are free', () => {
    const w = new M.World();
    w.toBoard();
    assert(w.intent(0, 'travel', 'dungeon'), 'travel failed');
    assert(w.dread === 1, 'entry charge');
    w.transition = 0;
    w.completeRoom();
    assert(w.roomId === 'd2' && w.dread === 1, 'room two charge');
    const saved = w.save();
    const restored = M.World.restore(saved);
    assert(restored && restored.dread === 1 && restored.roomId === 'd2', 'Continue changed checkpoint');
    restored.mode = 'failure';
    restored.intent(0, 'retry');
    assert(
      restored.dread === 2 && restored.roomId === 'd2' && restored.ring.carrier == null,
      'retry checkpoint',
    );
    for (let i = 0; i < 10; i++) {
      restored.mode = 'failure';
      restored.intent(0, 'retry');
    }
    assert(restored.dread === 6, 'Dread cap');
  });
  test('malformed, outdated and impossible saves are rejected', () => {
    assert(!M.World.validSave(null), 'null');
    const s = new M.World().save();
    for (const patch of [
      { version: 1 },
      { room: 'missing' },
      { dread: 9 },
      { rings: ['inferno'] },
      { classes: ['warrior'] },
      { elapsed: Infinity },
      { rings: ['dungeon', 'dungeon'] },
      { room: 'final', rings: [] },
      { room: '__proto__' },
      { stats: { rooms: 'broken' } },
      { flags: [] },
      { site: 'missing' },
    ])
      assert(!M.World.validSave({ ...s, ...patch }), JSON.stringify(patch));
  });
  test('native Attack timing only hits a target once per sword swing', () => {
    const w = new M.World();
    const h = w.heroes[0];
    h.hurt = 0;
    const e = w.makeEnemy('nightmare', h.x + 17, h.y, 'target');
    w.enemies = [e];
    h.facing = 0;
    w.primary(h);
    assert(e.hurt === 0, 'damage during wind-up');
    for (let i = 0; i < 90; i++) {
      h.attack.update(1 / 120);
      h.attack.hits(
        [e],
        () => true,
        () => {
          e.testHits = (e.testHits || 0) + 1;
        },
      );
    }
    assert(e.testHits === 1, `hits ${e.testHits}`);
  });
  test('wizard stuns rather than kills; large foes resist repeated chaining', () => {
    const w = new M.World();
    const e = w.makeEnemy('nightmare', 100, 100);
    w.stun(e, 3, w.heroes[1]);
    const first = e.stun;
    e.stun = 0;
    w.stun(e, 3, w.heroes[1]);
    assert(first === 3 && e.stun < first && !e.dead, 'stun resistance');
    const d = w.makeEnemy('dragon', 100, 100);
    w.stun(d, 3, w.heroes[1]);
    assert(d.stun === 0 && !d.dead, 'dragon mortal');
  });
  test('revive takes priority over ring passing and preserves a carried ring', () => {
    const w = new M.World();
    const [h, p] = w.heroes;
    p.x = h.x + 10;
    p.y = h.y;
    p.down = true;
    p.hp = 0;
    w.ring.carrier = 0;
    h.cmd = { ...M.neutral(), interact: true };
    h.context = w.contextFor(h);
    assert(h.context.type === 'revive', 'wrong priority');
    for (let i = 0; i < 230; i++) w.interact(h, 1 / 120);
    assert(!p.down && w.ring.carrier === 0 && w.stats.revives === 1, 'revive or ring ownership');
  });
  test('downed carrier drops safely; unreachable ring visibly returns', () => {
    const w = new M.World();
    const h = w.heroes[0];
    h.hurt = 0;
    h.hp = 1;
    w.ring.carrier = 0;
    w.hurt(h, 1);
    assert(h.down && w.ring.carrier === null && w.safe(w.ring.x, w.ring.y), 'drop');
    w.ring.x = -30;
    w.ring.y = -30;
    step(w, 0.02);
    assert(w.safe(w.ring.x, w.ring.y) && w.events.some((e) => e.type === 'ring-return'), 'recovery');
  });
  test('phase cannot cross exterior walls or lava and exits at a safe remembered point', () => {
    const w = new M.World({ classes: ['phantom', 'changeling'] });
    w.loadRoom('i2', false);
    assert(!w.safe(2, 2, true), 'outer wall phase');
    assert(!w.safe(8 * 16 + 8, 8 * 16 + 8, true), 'lava phase');
    w.loadRoom('d2', false);
    const h = w.heroes[0];
    h.powerTime = 0.001;
    h.safe = { ...w.room.spawns[0] };
    h.x = 6 * 16 + 8;
    h.y = 9 * 16 + 8;
    h.cmd = M.neutral();
    w.updateHero(h, 0.02);
    assert(w.safe(h.x, h.y) && w.events.some((e) => e.type === 'phase-return'), 'unsafe re-entry');
  });
  test('cloak redirects attention but contact hurts, and a carried ring remains revealed', () => {
    const w = new M.World({ classes: ['changeling', 'changeling'] });
    w.transition = 0;
    const h = w.heroes[0];
    h.hurt = 0;
    h.powerTime = 2;
    w.heroes[1].powerTime = 2;
    const e = w.makeEnemy('fighter', h.x + 5, h.y);
    e.cd = 0;
    w.enemies = [e];
    w.updateEnemy(e, 0.01);
    assert(h.hp < 5, 'cloak contact immunity');
    h.hurt = 0;
    w.ring.carrier = 0;
    w.updateEnemy(e, 0.01);
    assert(e.target || e.phase !== 'idle', 'carrier concealed');
  });
  test('ward interrupts flame lanes and projectiles without changing lava walkability', () => {
    const w = new M.World({ classes: ['wizard', 'warrior'] });
    w.site = 'inferno';
    w.loadRoom('i1', false);
    const h = w.heroes[0];
    h.x = 6 * 16 + 8;
    h.y = 9 * 16 + 8;
    w.power(h);
    w.roomTime = 2;
    assert(!w.dangerAt(h.x, h.y), 'ward did not suppress lane');
    assert(!w.safe(10 * 16 + 8, 9 * 16 + 8), 'ward made lava walkable');
  });
  test('shifting partitions safely resolve overlap and preserve objectives', () => {
    const w = new M.World();
    w.loadRoom('s2', false);
    const h = w.heroes[0];
    h.x = 16 * 16 + 8;
    h.y = 13 * 16 + 8;
    w.applyShift(1);
    assert(w.safe(h.x, h.y) && h.hp === 5, 'shift crushed hero');
    assert(w.findPath(h, w.ring).length > 0, 'path lost');
  });
  test('finale full wipe atomically resets bindings and retains campaign rings', () => {
    const w = new M.World();
    w.rings = ['dungeon', 'crystal', 'inferno', 'shifting'];
    w.loadRoom('final', false);
    w.bound = [true, true, false, true];
    w.heroes.forEach((h) => {
      h.down = true;
      h.hp = 0;
    });
    step(w, 0.02);
    assert(
      w.mode === 'failure' && w.bound.every((b) => !b) && w.rings.length === 4,
      'failed binding transaction',
    );
  });
  test('cache reward is single use and progress survives Continue', () => {
    const w = new M.World();
    w.rings = ['dungeon'];
    w.toBoard();
    w.intent(0, 'travel', 'cache1');
    const h = w.heroes[0];
    Object.assign(h, w.room.cache);
    h.cmd = { ...M.neutral(), interact: true };
    for (let i = 0; i < 130; i++) {
      h.context = w.contextFor(h);
      w.interact(h, 1 / 120);
    }
    assert(w.caches.length === 1 && w.flags.teamWard, 'cache not granted once');
    const r = M.World.restore(w.save());
    assert(r.caches.length === 1 && !r.reachable('cache1'), 'cache consumed state');
  });
  test('input validation rejects non-finite vectors and spoofed route ownership', () => {
    const c = M.cleanInput({ mx: Infinity, my: NaN, primary: 'yes', dodge: true });
    assert(c.mx === 0 && c.my === 0 && !c.primary && c.dodge, 'bad vectors');
    const w = new M.World({ owners: [4, 8] });
    w.toBoard();
    assert(!w.intent(8, 'travel', 'dungeon') && !w.intent(99, 'travel', 'dungeon'), 'spoofed owner');
    assert(w.intent(4, 'travel', 'dungeon'), 'valid owner');
  });
  const driver = (w, h, dt) => {
    const c = M.neutral();
    if (h.down) return c;
    const partner = w.heroes[1 - h.id];
    let target = partner.down ? partner : w.objectivePoint(h);
    if (w.dangerAt(h.x, h.y, true)) target = w.nearestSafe(h);
    const [mx, my] = w.steer(h, target, dt, true);
    c.mx = mx;
    c.my = my;
    const e = w.enemies
      .filter((e) => !e.dead && e.kind !== 'dragon')
      .sort((a, b) => M.distance(h, a) - M.distance(h, b))[0];
    if (e && M.distance(h, e) < 130) {
      const n = M.distance(h, e) || 1;
      c.ax = (e.x - h.x) / n;
      c.ay = (e.y - h.y) / n;
      c.primary = n < (h.classId === 'wizard' ? 125 : 46);
      if (n < 44) c.power = true;
    }
    if (M.distance(h, target) < 23) {
      c.interact = true;
      if (['phantom', 'wizard', 'changeling'].includes(h.classId) && e && M.distance(h, e) < 90)
        c.power = true;
    }
    if (w.dangerAt(h.x, h.y, true)) c.dodge = true;
    return c;
  };
  test('Continue after a wipe returns to Retry instead of avoiding its Dread charge', () => {
    const w = new M.World();
    w.toBoard();
    w.intent(0, 'travel', 'dungeon');
    w.heroes.forEach((h) => {
      h.hp = 0;
      h.down = true;
    });
    step(w, 0.02);
    const restored = M.World.restore(w.save());
    assert(
      restored && restored.mode === 'failure' && restored.dread === 1,
      'Continue avoided the pending failure',
    );
    assert(
      restored.intent(0, 'retry') && restored.dread === 2 && restored.mode === 'room',
      'Retry did not charge exactly once',
    );
  });
  test('recovered seals open functional inner-entry shortcuts and restore them on Continue', () => {
    for (const [source, room] of [
      ['dungeon', 'c1'],
      ['crystal', 'i1'],
      ['inferno', 's1'],
      ['shifting', 'final'],
    ]) {
      const w = new M.World();
      w.rings = ['dungeon', ...(source === 'dungeon' ? [] : [source])];
      if (room === 'final') w.rings = ['dungeon', 'crystal', 'inferno', 'shifting'];
      w.site = M.ROOMS[room].site;
      w.loadRoom(room, false);
      assert(
        w.activeShortcut &&
          w.heroes[0].x === w.room.shortcutSpawns[0].x &&
          w.heroes[0].y === w.room.shortcutSpawns[0].y,
        `${room}: shortcut is cosmetic`,
      );
      assert(w.safe(w.heroes[0].x, w.heroes[0].y), 'unsafe shortcut');
      const restored = M.World.restore(w.save());
      assert(
        restored && restored.heroes[0].y === w.heroes[0].y && restored.dread === w.dread,
        'shortcut lost on Continue',
      );
    }
  });
  test('one held pickup cannot automatically pass the ring on the next tick', () => {
    const w = new M.World();
    w.transition = 0;
    const h = w.heroes[0],
      p = w.heroes[1];
    Object.assign(h, w.room.ring);
    p.x = h.x + 14;
    p.y = h.y;
    const command = { ...M.neutral(), interact: true };
    step(w, 0.5, [command]);
    assert(w.ring.carrier === 0 && w.stats.passes === 0, 'one gesture changed interaction target');
    step(w, 0.03, [M.neutral()]);
    step(w, 0.05, [command]);
    assert(w.ring.carrier === 1, 'a new press could not pass to willing AI');
  });
  test('dragon sweeping breath respects cover and Wizard wards', () => {
    const w = new M.World();
    w.rings = ['dungeon', 'crystal', 'inferno', 'shifting'];
    w.loadRoom('final', false);
    const e = w.enemies[0],
      p = { x: e.x, y: 330 };
    e.phase = 'active';
    e.timer = 0.425;
    e.target = p;
    assert(!w.dragonThreat(e, p), 'cover did not block breath');
    w.map.set(17, 12, 0);
    assert(w.dragonThreat(e, p), 'open sweeping ray did not threaten');
    w.wards.push({ ...p, r: 42, life: 2 });
    assert(!w.dragonThreat(e, p), 'ward did not interrupt breath');
  });
  const play = (w, seconds = 180) => {
    const start = w.tick,
      initial = w.roomId;
    for (let i = 0; i < seconds * 120; i++) {
      const c = driver(w, w.heroes[0], 1 / 120);
      if (w.recordInputs) {
        const key = JSON.stringify(c);
        if (key !== w.lastRecordedInput) {
          w.actionHistory.push({ tick: w.tick, epoch: w.epoch, type: 'input', command: c });
          w.lastRecordedInput = key;
        }
      }
      w.step(1 / 120, [c]);
      if (w.mode === 'board' || w.mode === 'failure' || w.mode === 'victory') break;
    }
    return { ticks: w.tick - start, room: initial, end: w.mode, hp: w.heroes.map((h) => h.hp) };
  };
  const pairs = [];
  test('Phantom pulse physically repels lesser threats into valid space', () => {
    const w = new M.World({ classes: ['phantom', 'wizard'] });
    const h = w.heroes[0],
      e = w.makeEnemy('fighter', h.x + 20, h.y);
    w.enemies = [e];
    h.pendingPrimary = true;
    const before = M.distance(h, e);
    w.releasePrimary(h);
    assert(
      M.distance(h, e) > before + 5 && w.safe(e.x, e.y) && e.stun > 0,
      'pulse only stunned instead of repelling',
    );
  });
  test('flying Nightmares cross interior partitions while respecting outer boundaries', () => {
    const w = new M.World();
    w.loadRoom('d1', false);
    w.transition = 0;
    Object.assign(w.heroes[0], { x: 180, y: 180 });
    Object.assign(w.heroes[1], { x: 40, y: 320 });
    const e = w.makeEnemy('nightmare', 100, 180);
    e.cd = 99;
    for (let i = 0; i < 65; i++) w.updateEnemy(e, 0.02);
    assert(e.x > 128 && e.x < (w.room.w - 1) * 16, 'Nightmare walked around its wall');
  });
  test('both optional cache challenges complete through ordinary movement and interaction', () => {
    const w = new M.World({ classes: ['phantom', 'changeling'], seed: 1981 });
    w.rings = ['dungeon'];
    w.toBoard();
    for (const site of ['cache1', 'cache2']) {
      assert(w.intent(0, 'travel', site), 'cache not reachable');
      play(w, 180);
      assert(
        w.mode === 'board' && w.caches.includes(site) && w.flags.teamWard && !w.assisted,
        `${site}: cache loop failed`,
      );
      assert(!w.reachable(site), 'cache reward could repeat');
    }
    assert(w.dread === 2 && w.caches.length === 2, 'cache pressure/reward count');
  });
  for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) pairs.push([M.HEROES[a].id, M.HEROES[b].id]);
  for (const pair of pairs)
    test(`all four extractions at maximum Dread with ${pair.join(' + ')}`, () => {
      for (const [site, room] of [
        ['dungeon', 'd2'],
        ['crystal', 'c2'],
        ['inferno', 'i2'],
        ['shifting', 's2'],
      ]) {
        const w = new M.World({ classes: pair, seed: 1981 });
        w.site = site;
        w.dread = 6;
        if (site !== 'dungeon') w.rings = ['dungeon'];
        w.loadRoom(room, false);
        const p = play(w, 180);
        assert(
          w.mode === 'board' && w.rings.includes(site) && !w.assisted,
          JSON.stringify({ pair, site, ...p, state: w.snapshot() }),
        );
      }
    });
  test('companion actually navigates to and revives a fallen hero in every family', () => {
    for (const room of ['d2', 'c2', 'i2', 's2']) {
      const w = new M.World();
      w.loadRoom(room, false);
      w.heroes[0].down = true;
      w.heroes[0].hp = 0;
      step(w, 4);
      assert(
        !w.heroes[0].down && w.stats.revives === 1 && w.events.some((e) => e.type === 'revive'),
        `${room}: companion failed rescue`,
      );
    }
  });
  test('companion stuck recovery is visible, safe and awards no objective progress', () => {
    for (const room of ['d2', 'c2', 'i2', 's2']) {
      const w = new M.World();
      w.loadRoom(room, false);
      const h = w.heroes[1];
      h.stuck = 5;
      h.last = { x: h.x, y: h.y };
      w.aiInput(h, 0.01);
      assert(
        w.safe(h.x, h.y) && w.rings.length === 0 && w.events.some((e) => e.type === 'companion-return'),
        `${room}: unsafe or hidden recovery`,
      );
    }
  });
  test('a standing carrier can extract a fallen partner; delivery is idempotent', () => {
    const w = new M.World();
    w.site = 'dungeon';
    w.loadRoom('d2', false);
    Object.assign(w.heroes[0], w.room.exit);
    Object.assign(w.heroes[1], { ...w.room.ring, hp: 0, down: true });
    w.ring.carrier = 0;
    step(w, 2, [{ ...M.neutral(), interact: true }]);
    assert(
      w.mode === 'board' && w.rings.length === 1 && !w.heroes[1].down,
      'fallen partner blocked extraction',
    );
    w.completeRoom();
    assert(
      w.rings.length === 1 && w.events.filter((e) => e.type === 'ring-secured').length === 1,
      'duplicate ring',
    );
  });
  test('damaging a reviver interrupts the hold without dropping their carried ring', () => {
    const w = new M.World();
    const [h, p] = w.heroes;
    Object.assign(p, { x: h.x + 10, y: h.y, down: true, hp: 0, revive: 1 });
    h.hurt = 0;
    h.context = { type: 'revive', target: 1 };
    w.ring.carrier = 0;
    w.hurt(h, 1);
    assert(p.revive === 0 && h.interrupt > 0 && w.ring.carrier === 0, 'hold not interrupted cleanly');
  });
  test('claimed cache reloads ready for departure and cannot grant the ward again', () => {
    const w = new M.World();
    w.rings = ['dungeon'];
    w.site = 'cache1';
    w.loadRoom('cache1', false);
    w.caches = ['cache1'];
    w.flags.teamWard = false;
    const r = M.World.restore(w.save());
    assert(
      r.cacheClaimed && !r.flags.teamWard && !r.reachable('cache1'),
      'cache reward duplicated on Continue',
    );
  });
  test('normal full expedition through all eight rooms and four binding stations', () => {
    const w = new M.World({ seed: 73461 });
    w.recordInputs = true;
    w.actionHistory = [];
    const history = [];
    for (let leg = 0; leg < 8 && w.mode !== 'victory'; leg++) {
      if (w.mode === 'board') {
        const next = ['dungeon', 'crystal', 'inferno', 'shifting', 'final'].find((s) => w.reachable(s));
        assert(next && w.intent(0, 'travel', next), 'no legal route');
        w.actionHistory.push({ tick: w.tick, epoch: w.epoch, type: 'intent', action: 'travel', value: next });
      }
      const p = play(w, 280);
      history.push(p);
      if (w.mode === 'failure')
        throw Error('Normal run wiped: ' + JSON.stringify({ history, state: w.snapshot() }));
    }
    writeFileSync(
      'evidence/normal-playthrough.json',
      JSON.stringify(
        {
          seed: 73461,
          assisted: w.assisted,
          history,
          actions: w.actionHistory,
          state: w.snapshot(),
          events: w.events,
        },
        null,
        2,
      ),
    );
    assert(
      w.mode === 'victory' && !w.assisted && w.rings.length === 4 && w.bound.every(Boolean),
      JSON.stringify({ history, state: w.snapshot() }),
    );
    assert(
      ['d1', 'd2', 'c1', 'c2', 'i1', 'i2', 's1', 's2', 'final'].every((id) => w.stats.rooms.includes(id)),
      'incomplete core room history',
    );
    assert(w.events.filter((e) => e.type === 'ring-secured').length === 4, 'ring delivery not exactly once');
  });
  test('headless native game update/draw integration can boot without a DOM', () => {
    const c = { console: { log() {}, error() {}, warn() {} } };
    vm.createContext(c);
    for (const file of [
      'vendor/engine/my-3d2dge.js',
      'src/content/content.js',
      'src/sim/world.js',
      'src/view/assets.js',
      'src/view/view.js',
      'src/audio/audio.js',
      'src/net/hub.js',
      'src/ui/ui.js',
      'src/entry.js',
    ])
      vm.runInContext(readFileSync(file, 'utf8'), c, { filename: file });
    c.__game.advance(0.1);
    assert(c.__game.errors.length === 0, JSON.stringify(c.__game.errors));
    c.__game.dispose();
  });
  return result;
}
