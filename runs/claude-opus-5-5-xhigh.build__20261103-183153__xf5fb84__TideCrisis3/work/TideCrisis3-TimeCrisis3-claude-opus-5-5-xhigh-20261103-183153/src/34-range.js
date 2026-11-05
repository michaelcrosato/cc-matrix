/* 34-range: TRAINING, the CREST RANGE (Juno instructs). An indoor range of concrete lanes, plywood cut-outs on hinges
 * and score lamps. Four drills: AIM & FIRE; COVER & RELOAD (a turret robot telegraphs three shots); WEAPONS (an orange
 * vest for machine-gun ammo, drone targets, a shield cut-out for the shotgun, a crate stack for the launcher); READ THE
 * CRISIS (a fast Red Tide cut-out, a grenade lob, a civilian cut-out, then eight targets against the clock). */
def('stage', 'range', {
  num: 0, name: 'CREST RANGE', place: 'CREST headquarters, sub-level 2', clock: '09:00', music: 'range', maxThreats: 1,
  env: { ambient: .5, skyK: .05, sun: { dir: [0, 0, 1], k: .25 }, fog: ['#141820', 300, 900], warm: '#ffe0b0', ambience: 'turbine', actorK: 1,
    sky: { colors: ['#1a1e26', '#1a1e26', '#1a1e26'], below: '#14181e' } },
  carriers: {},
  build(G) {
    G.box('concrete', -40, -120, -10, 420, 120, 0, { solid: true });
    G.box('concrete-dk', -40, -124, 0, 420, -120, 90); G.box('concrete-dk', -40, 120, 0, 420, 124, 90); G.box('concrete-dk', 416, -120, 0, 420, 120, 90); G.box('concrete-dk', -44, -120, 0, -40, 120, 90);
    G.box('panel-dark', -40, -124, 90, 420, 124, 94, { solid: false });
    for (const y of [-60, 0, 60]) G.box('panel-steel', 60, y - 1, 0, 300, y + 1, 26, { solid: false });   // lane dividers
    G.box('panel-steel', 26, -100, 0, 38, -62, 18, { cover: true }); G.box('panel-steel', 26, -40, 0, 38, -8, 18, { cover: true }); G.box('panel-steel', 26, 8, 0, 38, 40, 18, { cover: true }); G.box('panel-steel', 26, 62, 0, 38, 100, 18, { cover: true });
    for (let x = 60; x < 400; x += 80) { G.box('glow-white', x, -2, 89, x + 40, 2, 90, { solid: false }); G.light(x + 20, 0, 80, 160, .5); }
    G.box('hazard', 40, -120, 0, 44, 120, .3, { solid: false });
    G.box('sign', 410, -60, 30, 416, 60, 70, { solid: false });
  },
  scenes: ['R-1', 'R-2', 'R-3', 'R-4']
});
const RSLOT = [{ stand: { at: [12, -24, 24], look: [300, -20, 16] }, cover: { at: [14, -24, 11], look: [300, -60, 8] } }, { stand: { at: [12, 24, 24], look: [300, 20, 16] }, cover: { at: [14, 24, 11], look: [300, 60, 8] } }];
const rangeObjs = (sim, sc) => sim.objects.filter(o => o.scene === sc);
const raise = (ob, on = true) => { ob.raised = on; };
def('scene', 'R-1', { title: 'AIM & FIRE', time: 60, arrive: { start: [-30, 0, 24], path: [[-10, -10, 24]], speed: 80 }, slots: RSLOT, covers: {},
  objects: [['target', [150, -40, 0], { yaw: Math.PI / 2 }], ['target', [180, 30, 0], { yaw: Math.PI / 2 }], ['target', [210, -10, 0], { yaw: Math.PI / 2 }], ['target', [240, 50, 0], { yaw: Math.PI / 2 }], ['target', [200, -70, 0], { yaw: Math.PI / 2 }], ['target', [260, 0, 0], { yaw: Math.PI / 2 }]],
  cues: [{ at: 0, say: ['juno', 'Welcome to the range, agent. Aim and fire. Six targets.'], prompt: 'aim' }],
  tick(sim) { if (sim.phase !== 'action') return; const T = rangeObjs(sim, 'R-1'), up = T.filter(o => o.alive && o.raised).length; if (!up && sim.dir.t > 1) { const next = T.find(o => o.alive && !o.raised); if (next) raise(next); } },
  objective: sim => rangeObjs(sim, 'R-1').every(o => !o.alive)
});
def('boss', 'turretbot', { name: 'TRAINING TURRET', title: 'CREST range robot', card: false,
  frac: B => 1 - B.shots / 3,
  make(sim, B) { B.shots = 0; B.at = [220, 0, 0]; B.fire = 1.5; B.armor = B.part('armor', { hp: 1, armor: true, noBar: true, noMul: true }); B.armor.vol = { c: [220, 0, 14], r: 10 }; },
  step(sim, B, dt) {
    B.fire -= dt;
    if (B.shots < 3 && B.fire <= 0 && !sim.threats.some(t => !t.done)) { B.shots++; B.fire = 2.6; const th = bossThreat(sim, B, 'turret', 1.4, () => [220, 0, 26]); if (th) th.onResolve = r => { sim.ev({ type: 'eshot', from: [220, 0, 26], to: null, p: th.target, kind: 'turret' }); if (r === 'blocked') sim.say('juno', B.shots < 3 ? 'Good! Again!' : 'Perfect. Cover saves lives.'); else sim.say('juno', 'Ouch. Hold cover BEFORE the ring closes!'); }; }
    if (B.shots >= 3 && !sim.threats.some(t => !t.done) && B.fire < 1.5 && !B.dead) { B.defeat(sim); sim.say('juno', 'Now empty your magazine, then reload in cover.'); sim.ev({ type: 'prompt', id: 'reload' }); }
  },
  draw(R, B, sim) { R.meshObj('generator', [220, 0, 0], 0); R.glow([220, 0, 26], 4, [255, 60, 40], .5 + .5 * Math.sin(sim.t * 8)); }
});
def('scene', 'R-2', { title: 'COVER & RELOAD', time: 90, arrive: { path: [[11, 0, 24]], speed: 80 }, slots: RSLOT, covers: {},
  cues: [{ at: 0, say: ['juno', 'The turret telegraphs every shot that will hit. When the red ring closes, be in cover!'], prompt: 'cover', do: sim => spawnBoss(sim, 'turretbot') }],
  objective: sim => sim.boss && sim.boss.dead && sim.players.every(p => (p.stats.reloads || 0) >= 1 && p.mag === 9) && sim.players.some(p => p.stats.shots >= 9)
});
def('scene', 'R-3', { title: 'WEAPONS', time: 90, arrive: { path: [[11, 0, 24]], speed: 80 }, slots: RSLOT, covers: {},
  objects: [['qmtarget', [180, -30, 0], { yaw: Math.PI / 2 }], ['dronetarget', [200, 0, 40]], ['dronetarget', [230, -40, 46]], ['dronetarget', [210, 40, 50]], ['shieldtarget', [190, 20, 0], { yaw: Math.PI / 2 }], ['stack', [260, -20, 0]]],
  cues: [{ at: 0, say: ['juno', 'Orange vest means ammo. Drop him for the machine gun.'] }],
  tick(sim) {
    if (sim.phase !== 'action') return;
    const T = rangeObjs(sim, 'R-3'), q = T[0], drones = T.slice(1, 4), sh = T[4], st = T[5], f = sim.flags;
    if (!f.r3a) { f.r3a = true; raise(q); }
    if (!q.alive && !f.r3b) { f.r3b = true; drones.forEach((d, k) => { d.path = [d.at[0], d.at[1], d.at[2], 26 + k * 6]; }); sim.say('juno', 'Switch to the machine gun and shred those drones!'); sim.ev({ type: 'prompt', id: 'weapon' }); }
    if (f.r3b && drones.every(d => !d.alive) && !f.r3c) { f.r3c = true; raise(sh); for (const p of sim.players) givePickup(sim, p, 'sg', 8); sim.say('juno', 'Shield cut-out. The shotgun knocks it flat. Fire while in cover to switch, too!'); }
    if (f.r3c && !sh.alive && !f.r3d) { f.r3d = true; for (const p of sim.players) givePickup(sim, p, 'gl', 2); sim.say('juno', 'And the launcher: blow that crate stack apart.'); }
    for (const d of drones) if (!f.r3b) { d.box = [d.at[0] - 5, d.at[1] - 5, d.at[2] - 3, d.at[0] + 5, d.at[1] + 5, d.at[2] + 3]; d.col.box = d.box; }
  },
  objective: sim => rangeObjs(sim, 'R-3').every(o => !o.alive)
});
def('scene', 'R-4', { title: 'READ THE CRISIS', time: 60, timed: true, arrive: { path: [[11, 0, 24]], speed: 80 }, slots: RSLOT, covers: {},
  objects: [['target', [170, -20, 0], { yaw: Math.PI / 2, red: true }], ['civtarget', [200, 30, 0], { yaw: Math.PI / 2 }], ['target', [220, -50, 0], { yaw: Math.PI / 2 }]].concat([0, 1, 2, 3, 4, 5, 6, 7].map(k => ['target', [150 + (k * 37) % 130, -80 + (k * 53) % 160, 0], { yaw: Math.PI / 2, timed: true }])),
  cues: [{ at: 0, say: ['juno', 'Red Tide cut-out: fast ring. Shoot it before it closes, or duck!'] }],
  tick(sim, dt) {
    if (sim.phase !== 'action') return;
    const T = rangeObjs(sim, 'R-4'), red = T[0], civ = T[1], norm = T[2], timed = T.slice(3), f = sim.flags;
    if (!f.r4a) { f.r4a = true; raise(red); sim.timer = 60; }
    if (red.raised && red.up > .9 && !f.r4th) { f.r4th = true; const th = requestThreat(sim, 0, { always: true, tele: .55 * 1.6, kind: 'redtide', pos: () => [red.at[0], red.at[1], 22] }); if (th) th.srcAlive = () => red.alive; }
    if (!red.alive && !f.r4b) { f.r4b = true; sim.say('juno', 'Grenade! Shoot it out of the air!'); const tgt = 0, cam = sim.cameraFor(tgt), land = [cam.x + 40, cam.y, 0], from = [260, 0, 20], Tt = 1.6; const pr = sim.launch({ kind: 'grenade', pos: from, vel: [(land[0] - from[0]) / Tt, (land[1] - from[1]) / Tt, (land[2] - from[2]) / Tt + .5 * 300 * Tt], gravity: 300, life: Tt, hp: 1, target: tgt, land }); pr.th = requestThreat(sim, tgt, { always: true, tele: Tt, kind: 'grenade', src: pr.id, pos: () => pr.pos }); if (pr.th) pr.th.srcAlive = () => pr.alive; f.r4g = sim.t; }
    if (f.r4b && !f.r4c && sim.t - f.r4g > 2) { f.r4c = true; raise(civ); raise(norm); sim.say('juno', "Blue cut-out is a civilian. DON'T SHOOT!"); }
    if (f.r4c && !norm.alive && !f.r4d) { f.r4d = true; f.timed = true; raise(civ, false); sim.timer = 20; f.r4t = 0; sim.say('juno', 'Final drill: eight targets, twenty seconds. GO!'); }
    if (f.r4d) {
      const left = timed.filter(o => o.alive);
      if (!left.some(o => o.raised)) { const n = left.slice().sort((a, b) => (a.lastUp || 0) - (b.lastUp || 0))[0]; if (n) { raise(n); n.upT = sim.t; } }
      for (const o of left) if (o.raised && sim.t - o.upT > 2.2) { raise(o, false); o.lastUp = sim.t; }
      if (sim.timer < .1 && left.length) { for (const o of timed) { o.alive = true; o.col.alive = true; o.hp = 1; raise(o, false); } sim.timer = 20; sim.say('juno', 'Too slow. Again!'); }
    }
  },
  objective: sim => rangeObjs(sim, 'R-4').slice(3).every(o => !o.alive)
});
