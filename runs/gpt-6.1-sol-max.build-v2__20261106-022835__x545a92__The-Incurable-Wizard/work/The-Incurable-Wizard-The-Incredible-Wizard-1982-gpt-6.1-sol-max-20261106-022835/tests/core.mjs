import { load } from './load.mjs';
export function core(test, evidence) {
  const { IW: I, My3D2dge: E } = load(),
    newWorld = (o) => new I.World({ seed: 1972, ...o }),
    neutral = { move: -1, aim: -1, fire: false },
    run = (w, t, c = {}) => {
      for (let j = 0; j < Math.ceil(t * 120); j++) w.step(1 / 120, c);
    },
    quiet = (w) => {
      w.phase = 'Entry';
      w.phaseDelay = 1000;
      w.queue.forEach((s) => (s.done = true));
      w.enemies = [];
    };
  test('native cells/world conversion', () => {
    for (let x = 0; x < 21; x++)
      if (I.cell(I.world(x)) !== x) throw Error('unit mismatch');
    const m = new E.TileMap({ rows: ['...'], legend: {} });
    if (m.center(1, 0)[0] !== I.world(1)) throw Error('native tile mismatch');
  });
  for (let r = 0; r < 6; r++)
    test('authored room ' + (r + 1) + ' connected with valid spawns', () => {
      const w = newWorld();
      w.loadRoom(r);
      const cells = w.openCells();
      for (const c of cells)
        if (!w.path(w.room.entries[0], c).length)
          throw Error('unreachable ' + c);
      for (const s of w.room.spawns)
        if (!w.walk(...s.port)) throw Error('bad spawn ' + s.port);
      for (const e of w.room.entries) if (!w.walk(...e)) throw Error('entry');
      if (!w.path([1, 6], [19, 6]).length) throw Error('portal unreachable');
    });
  test('standing deliberate aim and one bolt under held fire', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(1, 1);
    run(w, 0.04, { 0: { move: -1, aim: 0, fire: true } });
    if (p.aim !== 0 || p.m.x !== 1 || w.bolts.length !== 1)
      throw Error('aim or ownership');
    const id = p.bolt;
    run(w, 0.1, { 0: { move: -1, aim: 1, fire: true } });
    if (w.bolts.length !== 1 || p.bolt !== id) throw Error('duplicate bolt');
  });
  test('long shot commits longer than short wall shot', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(1, 1);
    p.aim = 3;
    w.fire(p);
    run(w, 0.1);
    if (p.bolt) throw Error('short wall failed to return');
    p.aim = 0;
    p.cool = 0;
    w.fire(p);
    run(w, 0.3);
    if (!p.bolt) throw Error('long shot returned too soon');
  });
  test('swept wall blocks extremely fast projectile', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(2, 3);
    p.aim = 0;
    w.tuning.boltSpeed = 1000;
    w.fire(p);
    run(w, 1 / 120);
    if (p.bolt || w.bolts.length) throw Error('skipped wall');
  });
  test('swept target hit scores once before contact', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(1, 1);
    p.aim = 0;
    const e = w.spawn('hopper', [4, 1]);
    e.warning = 0;
    w.tuning.boltSpeed = 500;
    w.fire(p);
    run(w, 1 / 120);
    if (w.enemies.length || w.score !== 150 || w.totalKills !== 1)
      throw Error('sweep miss/score');
    if (w.killEnemy(e, p) || w.score !== 150) throw Error('double kill');
  });
  test('queued turn expires and release stops at next cell', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(1, 5);
    run(w, 0.1, { 0: { move: 0, aim: -1, fire: false } });
    run(w, 0.02, { 0: { move: 3, aim: -1, fire: false } });
    run(w, 0.5);
    if (p.m.x !== 2 || p.m.y !== 5 || p.m.moving)
      throw Error('retained expired wanted turn ' + JSON.stringify(p.m));
  });
  test('buffered junction turn takes within 130ms', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(1, 5);
    run(w, 0.2, { 0: { move: 0, aim: -1, fire: false } });
    run(w, 0.02, { 0: { move: 3, aim: -1, fire: false } });
    run(w, 0.3);
    if (p.m.x !== 2 || p.m.y !== 4)
      throw Error('buffered turn dropped ' + JSON.stringify(p.m));
  });
  test('hidden information wall blocking and co-op union, facing independent', () => {
    const w = newWorld({ seats: [0, 1] });
    quiet(w);
    const [a, b] = w.players;
    a.m.place(1, 3);
    b.m.place(10, 11);
    const e = w.spawn('stalker', [5, 3]);
    e.warning = 0;
    if (w.visible(e) || w.los(a, e)) throw Error('wall leak');
    b.m.place(5, 5);
    b.aim = 1;
    if (!w.visible(e)) throw Error('union/facing reveal failed');
    b.m.place(9, 11);
    if (w.visible(e)) throw Error('lost sight leak');
    const rd = w.radar();
    if (rd.hunters.length !== 1) throw Error('missing radar');
    w.wizard = { x: 5, y: 5 };
    if (w.radar().hunters.length !== 1) throw Error('wizard radar leak');
  });
  test('bell reveal, path lure, cooldown, expiration, wizard unaffected', () => {
    const w = newWorld();
    w.loadRoom(2);
    quiet(w);
    const post = w.posts[0],
      e = w.spawn('stalker', [9, 3]);
    e.warning = 0;
    w.wizard = { id: 99, x: 10, y: 1, state: 'waiting', t: 99 };
    const before = JSON.stringify(w.wizard);
    if (!w.bell(post) || e.reveal <= 0 || e.lure <= 0)
      throw Error('bell failed');
    if (w.bell(post)) throw Error('bell spam');
    if (JSON.stringify(w.wizard) !== before) throw Error('wizard affected');
    run(w, 1.6);
    if (e.reveal > 0 || e.lure > 0) throw Error('bell permanent');
  });
  test('finite replacement obligations prevent premature hunt clear', () => {
    const w = newWorld();
    w.phase = 'Hunt';
    w.queue = [{ done: false, kind: 'stalker', at: 1, after: 2, port: [2, 1] }];
    run(w, 2);
    if (w.phase !== 'Hunt' || w.enemies.length) throw Error('premature phase');
    w.roomKills = 2;
    run(w, 0.02);
    if (w.enemies.length !== 1 || !w.queue[0].done)
      throw Error('replacement not spawned');
  });
  test('spawn grace forbids spawn-frame damage', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.protect = 0;
    w.spawn('hopper', [1, 11]);
    run(w, 0.2);
    if (p.lives !== 3) throw Error('spawn frame damage');
  });
  test('portal arrival legal, protected and no recursive transit', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(0, 6);
    w.portal(p);
    if (p.m.cx !== 19 || !p.portalLock || p.protect < 0.6)
      throw Error('arrival unsafe');
    for (let n = 0; n < 10; n++) w.portal(p);
    if (p.m.cx !== 19 || w.portals !== 1) throw Error('recursive portal');
    p.m.place(17, 6);
    w.portal(p);
    if (p.portalLock) throw Error('arrival lock never clears');
  });
  test('bolts die at portal mouth and allies do not block them', () => {
    const w = newWorld({ seats: [0, 1] });
    quiet(w);
    const [a, b] = w.players;
    a.m.place(2, 6);
    b.m.place(1, 6);
    a.aim = 2;
    w.fire(a);
    run(w, 0.3);
    if (a.bolt || w.bolts.length || b.lives !== 3)
      throw Error('portal/friendly fire');
  });
  test('familiar escape advances without bonus', () => {
    const w = newWorld();
    quiet(w);
    w.beginFamiliar();
    run(w, 30);
    if (
      !w.events.some((e) => e.type === 'escape') ||
      w.roomIndex !== 1 ||
      w.currentMultiplier !== 1
    )
      throw Error('escape failed ' + w.phase);
  });
  test('familiar catch and Wizard bonus apply only to following room', () => {
    const w = newWorld();
    quiet(w);
    w.currentMultiplier = 2;
    w.beginFamiliar();
    w.catchFamiliar(w.players[0]);
    if (
      w.score !== 2000 ||
      w.currentMultiplier !== 2 ||
      w.earnedNextMultiplier !== 2
    )
      throw Error('wrong current award');
    w.phase = 'Clear';
    w.descend();
    if (w.currentMultiplier !== 2 || w.earnedNextMultiplier !== 1)
      throw Error('carry not consumed');
  });
  test('Wizard attempt can fail without trapping campaign', () => {
    const w = newWorld();
    w.loadRoom(1);
    quiet(w);
    w.invulnerable = true;
    w.afterFamiliar();
    run(w, 20);
    if (!w.events.some((e) => e.type === 'wizardEscape'))
      throw Error('wizard never departed');
  });
  test('damage removes owned bolt and protects safe respawn', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.protect = 0;
    w.fire(p);
    w.damage(p);
    if (p.alive || p.lives !== 2 || p.bolt) throw Error('death ownership');
    run(w, 1.1);
    if (!p.alive || p.protect <= 0) throw Error('respawn missing');
    if (w.damage(p) || p.lives !== 2) throw Error('protection failed');
  });
  test('fallen co-op seat waits and returns after partner clears', () => {
    const w = newWorld({ seats: [0, 1] });
    quiet(w);
    const p = w.players[0];
    p.lives = 1;
    p.protect = 0;
    w.damage(p);
    if (w.status !== 'playing') throw Error('premature team defeat');
    w.phase = 'Clear';
    w.descend();
    if (p.lives !== 1 || !p.alive) throw Error('partner not returned');
  });
  test('team defeat and atomic complete retry marked Practice', () => {
    const w = newWorld({ seats: [0, 1] });
    const entry = JSON.stringify(w.entry);
    for (const p of w.players) {
      p.lives = 1;
      p.protect = 0;
      w.damage(p);
    }
    if (w.status !== 'defeat') throw Error('no team defeat');
    w.score = 999;
    w.rngState = 12;
    w.retry();
    if (
      w.status !== 'playing' ||
      !w.practice ||
      w.score !== 0 ||
      w.rngState !== 1972 ||
      w.phase !== 'Entry' ||
      JSON.stringify(w.entry) !== entry ||
      w.players.some((p) => p.lives !== 3)
    )
      throw Error('checkpoint incomplete');
  });
  test('full checkpoint restores moving actors and simulation RNG', () => {
    const a = newWorld();
    quiet(a);
    run(a, 0.11, { 0: { move: 0, aim: 0, fire: true } });
    const b = newWorld();
    b.restore(a.export());
    run(a, 1);
    run(b, 1);
    if (JSON.stringify(a.export()) !== JSON.stringify(b.export()))
      throw Error('checkpoint diverged');
  });
  test('final bounty earned multiplier once, no retroactive score', () => {
    const w = newWorld();
    w.loadRoom(5);
    quiet(w);
    w.score = 7000;
    w.currentMultiplier = 2;
    w.earnedNextMultiplier = 4;
    w.phase = 'Clear';
    w.descend();
    w.descend();
    if (w.status !== 'victory' || w.score !== 27000)
      throw Error('bounty double or retroactive');
  });
  test('blocked/corrupt versioned storage and record eligibility', () => {
    const storage = {
      getItem() {
        return '{bad';
      },
      setItem() {
        throw Error('blocked');
      },
    };
    const v = new I.Vault(storage),
      w = newWorld();
    v.save(w);
    if (!v.data.checkpoint) throw Error('no memory fallback');
    w.status = 'victory';
    if (!v.record(w)) throw Error('ranked rejected');
    w.practice = true;
    if (v.record(w)) throw Error('practice ranked');
    w.config.context = 'hub';
    w.practice = false;
    if (v.record(w)) throw Error('hub persisted');
    const b = new I.Vault({ getItem: () => JSON.stringify(v.data) });
    if (b.data.v !== 1) throw Error('schema');
  });
  test('network command validation and stale/sender rejection', () => {
    const w = newWorld({ seats: [0, 1] }),
      app = {
        world: w,
        game: { real: 5 },
        controls: { clear() {} },
        audio: { stop() {} },
      },
      hub = { active: true, isHost: true, host: 0 };
    const n = new I.Network(app, hub);
    n.seats = [0, 1];
    n.receive(
      { v: 1, type: 'input', seq: 2, cmd: { move: 0, aim: 1, fire: true } },
      1,
    );
    n.receive(
      { v: 1, type: 'input', seq: 1, cmd: { move: 2, aim: 1, fire: false } },
      1,
    );
    n.receive(
      { v: 1, type: 'input', seq: 5, cmd: { move: 3, aim: 1, fire: false } },
      99,
    );
    if (n.pending[1]?.move !== 0 || n.pending[99])
      throw Error('authority validation');
    if (
      n.valid({ move: 99, aim: 1, fire: true }) ||
      n.valid({ move: 0, aim: 0, fire: 'yes' })
    )
      throw Error('malformed command accepted');
  });
  // Honest command-only campaign: bell and paired gate demonstration are ordinary movement/fire sequences.
  function campaign(seed, difficulty, seats = [0]) {
    const w = newWorld({ seed, difficulty, seats });
    const visited = new Set(),
      phases = new Set(),
      durations = [],
      steps = [];
    let oldRoom = 0,
      roomStart = 0,
      tutorial = 0;
    for (let k = 0; k < 120 * 1250 && w.status === 'playing'; k++) {
      if (w.roomIndex !== oldRoom) {
        durations.push(w.elapsed - roomStart);
        roomStart = w.elapsed;
        oldRoom = w.roomIndex;
      }
      visited.add(w.roomIndex);
      phases.add(w.phase);
      let cmds = Object.fromEntries(
        w.players.map((p) => [p.seat, I.bot(w, p)]),
      );
      if (w.roomIndex === 2 && tutorial < 6) {
        const p = w.players[0];
        if (tutorial === 0) {
          if (!p.m.moving && p.m.cx === 2) tutorial = 1;
          cmds[p.seat] = { move: 0, aim: 3, fire: false };
        }
        if (tutorial === 1) {
          cmds[p.seat] = { move: -1, aim: 3, fire: true };
          if (w.bells > 0) tutorial = 2;
        }
        if (tutorial === 2) {
          cmds[p.seat] = { move: 2, aim: 3, fire: false };
          if (!p.m.moving && p.m.cx === 1) tutorial = 3;
        }
        if (tutorial === 3) {
          cmds[p.seat] = { move: 3, aim: 3, fire: false };
          if (!p.m.moving && p.m.cy === 6) tutorial = 4;
        }
        if (tutorial === 4) {
          cmds[p.seat] = { move: 2, aim: 2, fire: false };
          if (w.portals > 0) tutorial = 5;
        }
        if (tutorial === 5) {
          cmds[p.seat] = { move: 2, aim: 2, fire: false };
          if (!p.m.moving && p.m.cx === 17) tutorial = 6;
        }
      }

      w.step(1 / 120, cmds);
      if (k % 120 === 0) {
        for (const p of w.players) {
          if (w.bolts.filter((b) => !b.dead && b.owner === p.id).length > 1)
            throw Error('ownership violated in campaign');
        }
        if (w.radar().hunters.some((e) => e.kind === 'wizard'))
          throw Error('wizard radar');
      }
    }
    durations.push(w.elapsed - roomStart);
    return {
      world: w,
      evidence: {
        seed,
        difficulty,
        seats,
        status: w.status,
        seconds: w.elapsed,
        score: w.score,
        kills: w.totalKills,
        deaths: w.deaths,
        bells: w.bells,
        portals: w.portals,
        familiars: w.familiars,
        banishments: w.banishments,
        rooms: [...visited],
        phases: [...phases],
        roomSeconds: durations,
      },
    };
  }
  for (const [seed, diff, seats] of [
    [1972, 'Normal', [0]],
    [1982, 'Gentle', [0]],
    [7, 'Fierce', [0, 1]],
  ])
    test(`ordinary-input campaign ${diff} ${seats.length} seat(s)`, () => {
      const c = campaign(seed, diff, seats);
      evidence.campaigns ??= [];
      evidence.campaigns.push(c.evidence);
      if (
        c.world.status !== 'victory' ||
        c.evidence.rooms.length !== 6 ||
        c.world.banishments !== 5 ||
        c.world.bells < 1 ||
        c.world.portals < 1
      )
        throw Error(JSON.stringify(c.evidence));
    });
  test('simultaneous allied shots resolve one enemy once', () => {
    const w = newWorld({ seats: [0, 1] });
    quiet(w);
    const [a, b] = w.players;
    a.m.place(1, 11);
    b.m.place(7, 11);
    a.aim = 0;
    b.aim = 2;
    w.spawn('hopper', [4, 11]).warning = 0;
    w.fire(a);
    w.fire(b);
    run(w, 0.4);
    if (w.score !== 150 || w.totalKills !== 1)
      throw Error('duplicate team award');
  });
  test('second Wizard manifestation alternates axes with safe gaps', () => {
    const w = newWorld();
    quiet(w);
    w.wizard = { id: 99, x: 10, y: 6, stage: 1 };
    w.lightning();
    const first = w.events.at(-1).dirs;
    w.lightning();
    const second = w.events.at(-1).dirs;
    if (first.join(',') !== '0,2' || second.join(',') !== '1,3')
      throw Error('no alternating cross lanes');
  });
  test('structurally corrupt checkpoint is rejected before simulation', () => {
    const w = newWorld(),
      bad = w.export();
    bad.enemies = 'broken';
    let rejected = false;
    try {
      w.restore(bad);
    } catch {
      rejected = true;
    }
    if (!rejected) throw Error('corrupt checkpoint accepted');
  });
  test('packet rejection repairs through the following full snapshot', () => {
    const w = newWorld({ seats: [0, 1] }),
      sent = [],
      app = {
        world: w,
        game: { real: 0 },
        controls: { clear() {} },
        audio: { stop() {} },
      },
      hub = {
        active: true,
        isHost: true,
        me: 0,
        host: 0,
        time: () => 1,
        send(d) {
          sent.push(d);
          return sent.length > 1;
        },
        finish() {},
      };
    const n = new I.Network(app, hub);
    n.active = true;
    n.started = true;
    n.seats = [0, 1];
    n.step(0.1, neutral);
    n.step(0.1, neutral);
    if (
      sent.length !== 2 ||
      sent[1].state.tick <= sent[0].state.tick ||
      sent[1].state.players.length !== 2
    )
      throw Error('snapshot repair failed');
    const client = new I.Network(
      { world: newWorld(), game: { real: 0 } },
      { active: true, isHost: false, host: 0 },
    );
    client.receive(sent[1], 99);
    if (client.lastSnap !== -1) throw Error('forged snapshot accepted');
    client.receive(sent[1], 0);
    if (client.lastSnap !== sent[1].tick) throw Error('repair not applied');
    client.receive(sent[0], 0);
    if (client.lastSnap !== sent[1].tick) throw Error('stale snapshot applied');
  });
  test('full native Game advances ordinary commands to results, credits and replay', () => {
    const c = load(true),
      g = c.__game,
      app = c.IW.app;
    g.advance(0.01);
    app.begin('Normal', [0], 'campaign', 1972);
    g.advance(0.01);
    app.controls.sample = (w, p) => c.IW.bot(w, p);
    for (let k = 0; k < 1200 && app.world.status === 'playing'; k++)
      g.advance(1);
    if (
      app.world.status !== 'victory' ||
      app.ui.screen !== 'results' ||
      g.errors.length
    )
      throw Error('integrated ending ' + JSON.stringify(g.errors));
    if (app.world.practice) throw Error('honest run marked Practice');
    app.credits(0);
    if (app.ui.screen !== 'credits') throw Error('credits unreachable');
    app.ui.back();
    const top = app.ui._stack.at(-1);
    const replay = top.s.actions.find((a) => a[0] === 'New run');
    if (!replay) throw Error('no replay');
    replay[1]();
    g.advance(0.01);
    if (
      app.world.roomIndex !== 0 ||
      app.world.status !== 'playing' ||
      app.world.score !== 0
    )
      throw Error('replay not clean');
    g.dispose();
  });
  test('every live developer slider and encounter action resets cleanly', () => {
    const c = load(true),
      g = c.__game,
      a = c.IW.app;
    g.advance(0.01);
    a.begin('Normal', [0], 'campaign', 1972);
    g.advance(0.01);
    for (const k of Object.keys(c.IW.DEFAULTS)) {
      const spec = g.settings.spec('dev_' + k),
        v = (spec.min + spec.max) / 2;
      g.settings.set('dev_' + k, v);
      if (Math.abs(a.world.tuning[k] - v) > 1e-8) throw Error('slider ' + k);
    }
    g.settings.set('dev_timeScale', 0.3);
    g.settings.set('dev_invulnerable', true);
    g.settings.set('dev_lives', 7);
    g.settings.set('dev_grid', true);
    if (
      g.timeScale !== 0.3 ||
      !a.world.invulnerable ||
      a.world.players[0].lives !== 7 ||
      !a.debugGrid
    )
      throw Error('clock/lives/diagnostic');
    g.debug.dev(0);
    const act = (name) => {
      const a0 = a.ui._stack.at(-1).s.actions.find((x) => x[0] === name);
      if (!a0) throw Error('missing action ' + name);
      a0[1]();
    };
    act('Encounter tools');
    const depth = a.ui._stack.length;
    for (const name of [
      'Next chamber',
      'Previous chamber',
      'Force hunt',
      'Force familiar chase',
      'Force Wizard intrusion',
      'Force final manifestations',
      'Spawn Knobble',
      'Spawn Hushjaw',
      'Spawn Needlekin',
      'Remove all hunters',
      'Clear chamber',
    ])
      act(name);
    if (a.ui._stack.length !== depth)
      throw Error('developer actions grew menu stack');
    a.ui.back();
    act('Reset to defaults');
    if (
      g.timeScale !== 1 ||
      a.world.invulnerable ||
      a.debugGrid ||
      Object.keys(c.IW.DEFAULTS).some(
        (k) => a.world.tuning[k] !== c.IW.DEFAULTS[k],
      )
    )
      throw Error('reset leaked override');
    g.dispose();
  });
  test('portal arrival lock releases after a vertical exit from the arrival area', () => {
    const w = newWorld();
    quiet(w);
    const p = w.players[0];
    p.m.place(0, 6);
    w.portal(p);
    p.m.place(19, 3);
    w.portal(p);
    if (p.portalLock) throw Error('vertical arrival exit kept portal locked');
  });
  test('Wizard moves his warning if a player enters the apparition rune', () => {
    const w = newWorld();
    w.loadRoom(1);
    quiet(w);
    w.phase = 'Intrusion';
    w.nextWizard(0.01);
    run(w, 0.02);
    w.players[0].m.place(w.wizard.x, w.wizard.y);
    run(w, 1.1);
    if (
      w.wizard.state === 'active' &&
      Math.hypot(w.players[0].m.x - w.wizard.x, w.players[0].m.y - w.wizard.y) <
        1.25
    )
      throw Error('Wizard materialized inside a player');
  });
  test('corrupt family data is rejected before rendering', () => {
    const w = newWorld();
    w.spawn('hopper', [2, 1]);
    const d = w.export();
    d.enemies[0].kind = 'invalid';
    let caught = false;
    try {
      w.restore(d);
    } catch {
      caught = true;
    }
    if (!caught) throw Error('invalid creature schema accepted');
  });
}
