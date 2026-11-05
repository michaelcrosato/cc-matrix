// The sim's headless suite: the rules of plan 4.2 to 4.10 and 4.17, checked by stepping a Sim (no DOM, no clock).
// Each check() prints only when it fails; run() returns the count.
import { load } from './lib.mjs';

export function run(check) {
  const { TC } = load();
  const mk = (o = {}) => new TC.Sim(Object.assign({ stage: 1, seed: 7, difficulty: 'Normal', players: [{ name: 'P1' }] }, o));
  const steps = (sim, sec, cmd = () => ({})) => {
    const n = Math.round(sec / TC.DT);
    for (let i = 0; i < n; i++) sim.step(TC.DT, [cmd(i, sim)]);
  };

  // 1. The world: three stages of three areas and a boss area, in order along the rail.
  for (const id of [1, 2, 3]) {
    const st = TC.get('stage', id);
    const sim = mk({ stage: id });
    check(`stage ${id} has 4 areas, the last one a boss`, st.scenes.length === 4 && st.scenes[3].boss, JSON.stringify(st.scenes.map(s => s.id)));
    check(`stage ${id} areas ride east in order`, sim.world.scenes.every((s, i, a) => i === 0 || s.base > a[i - 1].base), '');
    check(`stage ${id} areas have nests and cover walls`, sim.world.scenes[0].nests.length >= 4 && sim.world.boxes.some(b => b.cover), '');
  }
  check('the training range has three drills and no boss', TC.get('stage', 'range').scenes.length === 3 && !TC.get('stage', 'range').scenes.some(s => s.boss), '');

  // 2. Cover: the blend moves at the cover speed, exposed means c < 0.5, and the cover pose sits lower.
  {
    const sim = mk();
    steps(sim, 0.5);
    const p = sim.players[0];
    check('a player starts exposed', sim.exposed(p) && p.c === 0, `c=${p.c}`);
    steps(sim, TC.tune.player.coverIn + 0.02, () => ({ cover: true }));
    check('holding cover takes the blend to 1 in coverIn seconds', p.c === 1, `c=${p.c}`);
    check('in cover the eye is lower', sim.camFor(p).z < 20, `z=${sim.camFor(p).z}`);
    steps(sim, 0.4, () => ({ cover: false }));
    check('letting go pops out again', p.c === 0 && sim.exposed(p), `c=${p.c}`);
  }

  // 3. Shots: a miss resets the chain; a shot at a box stops there.
  {
    const sim = mk();
    steps(sim, 0.2);
    const p = sim.players[0];
    p.chain = 4; p.mult = 1.4;
    p.aim = [0.9, 0.9];
    sim.step(TC.DT, [{ aim: [0.9, 0.9], firePressed: true, fire: true }]);
    check('a miss resets the chain', p.chain === 0 && p.mult === 1, `chain=${p.chain}`);
    check('a shot counts as a shot', p.stats.shots === 1, JSON.stringify(p.stats));
  }

  // 4. Kills score; a headshot scores more; a quick kill scores more again. A civilian costs a life and 5,000 points.
  {
    const sim = mk({ cheats: { god: true } });
    steps(sim, 0.2);
    sim.world.boxes = sim.world.boxes.filter(b => b.mat !== 'crate');   // no crate on the firing line
    const p = sim.players[0];
    const e = sim.spawn('deckhand', sim.scene.nests[0].id);
    e.state = 'aim'; e.exposed = true; e.exposedAt = sim.t; e.timer = 99;
    const cam = sim.camFor(p);
    const d = [e.x - cam.x, e.y - cam.y, 16 - cam.z];
    // Aim at the grunt's chest, in view units.
    const v = TC.toView(cam, [e.x, e.y, 12], 16 / 9);
    p.aim = [v[0], v[1]];
    sim.step(TC.DT, [{ aim: p.aim, firePressed: true }]);
    void d;
    check('a hit on an exposed grunt scores and counts a hit', p.stats.hits === 1 && p.score >= 100, `hits=${p.stats.hits} score=${p.score}`);
    sim.killEnemy(e, p, true, [e.x, e.y, 20], null, null);
    check('a headshot kill adds the headshot bonus', p.score >= 300 + 500, `score=${p.score}`);
  }
  {
    const sim = mk();
    steps(sim, 0.2);
    const p = sim.players[0];
    const before = p.lives;
    const c = sim.spawn('civilian', null, { route: [[sim.base + 200, 0], [sim.base + 200, 10]] });
    sim.hitCivilian(c, p, [0, 0, 0]);
    check('a civilian hit costs five thousand points and a life', p.score === -5000 && p.lives === before - 1, `score=${p.score} lives=${p.lives}`);
  }

  // 5. The ThreatDirector: a threat telegraphs, lands at its impact time, hits an exposed player, is blocked in cover.
  {
    const sim = mk({ cheats: {} });
    steps(sim, 0.2);
    const p = sim.players[0];
    p.invul = 0;
    const th = sim.addThreat({ src: 0, target: 0, muzzle: [sim.base + 200, 0, 20], tele: 0.5, kind: 'shot', pr: null });
    check('a threat has a telegraph and an impact time', th.impactAt > sim.t && !th.resolved, '');
    const before = p.lives;
    steps(sim, 0.6);
    check('an exposed player takes a threat that lands', th.resolved && p.lives === before - 1, `lives ${before}->${p.lives}`);
    // Now in cover: the same threat is blocked.
    steps(sim, 2, () => ({ cover: true }));
    const th2 = sim.addThreat({ src: 0, target: 0, muzzle: [sim.base + 200, 0, 20], tele: 0.5, kind: 'shot', pr: null });
    const lost = p.lives;
    steps(sim, 0.7, () => ({ cover: true }));
    check('a player in cover blocks a threat and gains a cover save', th2.resolved && p.lives === lost && p.stats.saves >= 1, `saves=${p.stats.saves}`);
  }
  {
    // The minimum gap: a second threat on the same player too soon after the first is a miss, not a threat.
    const sim = mk();
    steps(sim, 0.2);
    sim.lastImpact = { 0: sim.t + 0.1 };
    check('the minimum gap refuses a threat that lands too close to the last', sim.rollThreat(sim.players[0], 0.1) === false, '');
  }

  // 6. A wave clears: when the field is clear the area's clear phase starts, and the next area rides in.
  {
    const sim = mk({ cheats: { god: true, ammo: true } });
    steps(sim, TC.ARRIVE + 0.1);
    check('ACTION starts after the ride', sim.phase === 'action', sim.phase);
    for (const e of sim.enemies) if (e.alive) { e.hp = 0; sim.killEnemy(e, sim.players[0], false, [e.x, e.y, 0], null, null); }
    steps(sim, 0.1);
    for (let k = 0; k < 6 && sim.phase === 'action'; k++) {
      for (const e of sim.enemies) if (e.alive) { e.hp = 0; sim.killEnemy(e, sim.players[0], false, [e.x, e.y, 0], null, null); }
      steps(sim, 0.5);
    }
    check('clearing every wave of an area starts its clear bonus', sim.phase === 'clear' || sim.phase === 'arrive', sim.phase);
    steps(sim, TC.CLEAR_T + 0.3);
    check('the next area rides in after the clear', sim.sceneIdx === 1 && sim.phase === 'arrive', `scene=${sim.sceneIdx} phase=${sim.phase}`);
  }

  // 7. TIME: at zero, TIDE'S IN costs a life (even through invulnerability) and refills.
  {
    const sim = mk();
    steps(sim, TC.ARRIVE + 0.1);
    const p = sim.players[0];
    p.invul = 99;
    const before = p.lives;
    sim.timer = 0.01;
    steps(sim, 0.05);
    check("TIDE'S IN costs a life through invulnerability", p.lives === before - 1, `${before}->${p.lives}`);
    check('TIME refills after time-up', sim.timer > sim.timeMax * 0.5, `timer=${sim.timer}`);
  }

  // 8. Continue: a wiped-out team sees CONTINUE? and a press restarts the area with its lives back.
  {
    const sim = mk();
    steps(sim, TC.ARRIVE + 0.1);
    const p = sim.players[0];
    sim.loseLife(p, 'test', true);
    while (p.lives > 0) sim.loseLife(p, 'test', true);
    check('out of lives: the continue countdown starts', p.out && sim.phase === 'continue', `phase=${sim.phase}`);
    steps(sim, 0.5, () => ({ firePressed: true }));
    check('a press during CONTINUE? restarts the area', !p.out && sim.phase !== 'continue' && p.lives === sim.diff.lives && p.continues === 1, `phase=${sim.phase} lives=${p.lives}`);
  }
  {
    const sim = mk();
    steps(sim, TC.ARRIVE + 0.1);
    const p = sim.players[0];
    while (p.lives > 0) sim.loseLife(p, 'test', true);
    steps(sim, TC.CONT_T + 0.5);
    check('an unanswered CONTINUE? ends the game', sim.over && sim.result && !sim.result.won, `over=${sim.over}`);
  }

  // 9. Determinism: the same seed and commands give the same state.
  {
    const run1 = () => {
      const sim = mk({ seed: 99 });
      steps(sim, 20, (i) => ({ aim: [Math.sin(i / 90) * 0.5, 0.1], fire: i % 40 < 20, firePressed: i % 40 === 0, cover: i % 300 < 60 }));
      return JSON.stringify(sim.snapshot());
    };
    check('the same seed and inputs give the same state', run1() === run1(), '');
  }

  // 10. The boss: its weak parts guard the core; with them down the core takes damage, and its defeat ends the boss.
  {
    const sim = mk({ stage: 1, cheats: { god: true, ammo: true } });
    sim.enterScene(3, false);
    steps(sim, TC.ARRIVE + 0.1);
    sim.startBoss('tidewhip');
    check('the boss starts with its parts up', sim.boss && sim.boss.parts.some(p => p.weak && !p.down), '');
    const p = sim.players[0];
    sim.damageBoss('bridge', p, 5, [0, 0, 0]);
    check('the core is armored while a weak part stands', sim.boss.parts.find(q => q.id === 'bridge').hp === 18, '');
    sim.damageBoss('turretL', p, 99, [0, 0, 0]);
    sim.damageBoss('turretR', p, 99, [0, 0, 0]);
    sim.damageBoss('bridge', p, 99, [0, 0, 0]);
    check('with the turrets down, the core falls and the boss is defeated', sim.boss.defeated, '');
  }

  // 11. The Autopilot clears stage 1 with cheats (god mode, ammo): it reaches the stage clear within a bounded time.
  {
    const sim = mk({ stage: 1, cheats: { god: true, ammo: true }, seed: 3 });
    const bot = TC.Autopilot.make('showoff');
    let t = 0;
    while (!sim.over && t < 900) {
      sim.step(TC.DT, [bot.command(sim, 0, TC.DT, bot)]);
      t += TC.DT;
    }
    check('the Autopilot clears stage 1 (god mode) within 15 minutes of sim time', sim.over && sim.result.won, `over=${sim.over} t=${t.toFixed(0)} phase=${sim.phase}`);
    check('the stage result has ranks and accuracy', !!sim.result && !!sim.result.rows[0].rank && sim.result.rows[0].shots > 0, JSON.stringify(sim.result && sim.result.rows[0]));
  }

  // 11b. The rail ride: area 1-2 carries the camera forward after its waves clear, and its cover walls go with it.
  {
    const sim = mk({ cheats: { god: true, ammo: true } });
    sim.enterScene(1, false);
    steps(sim, TC.ARRIVE + 0.1);
    const base0 = sim.base, ride = sim.ride;
    check('area 1-2 has a ride of 150 u', !!ride && Math.round(ride.to - base0) === 150, JSON.stringify(ride));
    const wall = sim.world.boxes.find(b => b.slot === 0 && b.scene === 1);
    const wx0 = wall.b[0];
    let t = 0;
    while (!ride.done && t < 200) {
      for (const e of sim.enemies) if (e.alive && e.role !== 'civilian') { e.hp = 0; sim.killEnemy(e, sim.players[0], false, [e.x, e.y, 0], null, null); }
      steps(sim, 0.25); t += 0.25;
    }
    check('the rail rides the full 150 u after the field is clear', ride.done && Math.round(sim.base - base0) === 150, `base ${base0}->${sim.base}`);
    check('the area cover wall moves with the rail', Math.round(wall.b[0] - wx0) === 150, `${wx0}->${wall.b[0]}`);
  }

  // 11c. The roster: each new type spawns with its own behaviour (a mover flies and fires, a rusher charges).
  {
    const sim = mk({ cheats: { god: true } });
    steps(sim, TC.ARRIVE + 0.1);
    const d = sim.spawn('drone', null, { route: [[sim.base + 200, -100], [sim.base + 300, -100]] });
    check('a drone flies at 40 u and is always exposed', d.z === 40 && d.exposed && d.role === 'mover', `z=${d.z}`);
    const x0 = d.x;
    steps(sim, 1);
    check('a drone moves along its route', d.x !== x0, '');
    const r = sim.spawn('rusher', sim.scene.nests[0].id);
    steps(sim, 4);
    check('a rusher charges the players', r.x !== sim.scene.nests[0].x || r.state !== 'advance', `state=${r.state}`);
    const cap = sim.spawn('captor', sim.scene.nests[0].id);
    const parts = sim.hitVolumes(cap).map(v => v.part);
    check('a captor has a head to shoot and a hostage beside it', parts.join() === 'head,hostage', parts.join());
    // Shooting the hostage costs a life and five thousand points, and the captor stays up.
    const pl = sim.players[0], lives0 = pl.lives, score0 = pl.score;
    sim.damageEnemy = sim.damageEnemy;
    const hv = sim.hitVolumes(cap).find(v => v.part === 'hostage').b;
    cap.exposed = true; sim.cheats.god = false; pl.invul = 0;
    // From beside the hostage (so the captor's own body is not in the way): the ray crosses only the hostage.
    const hx = (hv[0] + hv[3]) / 2, hz = (hv[2] + hv[5]) / 2;
    sim.traceShot(pl, [hx, cap.y + 60, hz], [0, -1, 0], 1, 'handgun');
    check('a hostage hit costs a life and 5,000 points; the captor lives', pl.lives === lives0 - 1 && pl.score === score0 - 5000 && cap.alive, `lives ${lives0}->${pl.lives} score ${score0}->${pl.score}`);
  }
  {
    // Entries: a jump drops to the ground, and a door keeps its enemy hidden until it steps out.
    const sim = mk({ cheats: { god: true } });
    steps(sim, TC.ARRIVE + 0.1);
    const j = sim.spawn('marine', sim.scene.nests[0].id, { entry: 'jump' });
    check('a jump starts in the air', j.z > 10 && j.state === 'enter', `z=${j.z}`);
    steps(sim, 1);
    check('a jump lands and takes cover', j.z === 0 && j.state === 'hide', `z=${j.z} state=${j.state}`);
    const dr = sim.spawn('gunner', sim.scene.nests[1].id, { entry: 'door' });
    steps(sim, 0.4);
    check('a door entry stays hidden while the door opens', !dr.exposed && dr.state === 'enter', dr.state);
    steps(sim, 0.6);
    check('a door entry steps out to cover', dr.state === 'hide', dr.state);
  }
  {
    // The jet-ski's blast: killing the rider gives the bonus.
    const sim = mk({ cheats: { god: true } });
    steps(sim, TC.ARRIVE + 0.1);
    const pl = sim.players[0];
    const js = sim.spawn('jetski', null, { route: [[sim.base + 200, 0], [sim.base + 210, 0]] });
    const s0 = pl.score;
    sim.killEnemy(js, pl, false, [js.x, js.y, 0], null, null);
    check('a jet-ski explodes for a bonus', pl.score - s0 >= 1000 + 1500 - 1, `score ${s0}->${pl.score}`);
  }

  // 12. The dev tuning: the defaults are frozen, and Reset puts every value back.
  {
    TC.tuneSet('enemy.hpMul', 3);
    check('a dev change shows as changed', TC.tuneChanged('enemy.hpMul'), '');
    TC.tuneReset();
    check('reset all restores the defaults', !TC.tuneChanged('enemy.hpMul') && TC.tune.enemy.hpMul === TC.TUNE.enemy.hpMul, '');
    check('the defaults are frozen', Object.isFrozen(TC.TUNE), '');
  }

  // 13. No Math.random in the sim and its rules (plan 3.3).
  {
    // Checked by the test runner's grep; here: the sim's streams are deterministic per name.
    const r1 = TC.stream(5, 'x'), r2 = TC.stream(5, 'x');
    check('named streams are reproducible', r1() === r2() && r1() === r2(), '');
  }
  return null;
}
