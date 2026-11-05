// 06-sim-boss.js: the boss framework (plan 4.9). A boss is a set of boxed parts on a root that faces the players. Weak
// parts (turrets, claws, lamps) guard the core: the core takes damage only once they are all down. Every attack is a
// threat or a projectile, so cover, telegraphs and TIME work for bosses the same way as for the rest.
//
// def('boss', id, { name, title, time, coreHp, parts: [{ id, box (root-relative: x toward the players, y across, z up),
//   hp, weak, mat, core }], phases: [{ at (core hp fraction below which it applies), attacks: [...], interval }] })

TC.def('boss', 'tidewhip', {
  name: 'TIDEWHIP', title: 'Black Current gunboat', time: 100, coreHp: 18, root: [236, 0, 0],
  parts: [
    { id: 'hull', box: [-30, -30, 0, 30, 30, 14], hp: 0, mat: 'hull', core: false, decor: true },
    { id: 'turretL', box: [-6, -24, 14, 8, -12, 26], hp: 10, weak: true, mat: 'steel', label: 'PORT TURRET' },
    { id: 'turretR', box: [-6, 12, 14, 8, 24, 26], hp: 10, weak: true, mat: 'steel', label: 'STARBOARD TURRET' },
    { id: 'bridge', box: [-10, -10, 14, 10, 10, 34], hp: 18, core: true, mat: 'steel', label: 'BRIDGE' },
  ],
  phases: [
    { at: 1.01, attacks: ['barrage', 'sweep'], interval: 2.6 },
    { at: 0.5, attacks: ['barrage', 'sweep', 'lob'], interval: 1.9 },
  ],
});

TC.def('boss', 'warden', {
  name: 'ORSO MARR', title: 'the lamp warden, Lighthouse Point', time: 100, coreHp: 16, root: [250, 0, 0],
  parts: [
    { id: 'tower', box: [-14, -14, 0, 14, 14, 60], hp: 0, mat: 'brick', decor: true },
    { id: 'lampL', box: [-6, -26, 56, 6, -14, 70], hp: 8, weak: true, mat: 'glass', label: 'WEST LAMP' },
    { id: 'lampR', box: [-6, 14, 56, 6, 26, 70], hp: 8, weak: true, mat: 'glass', label: 'EAST LAMP' },
    { id: 'core', box: [-10, -10, 62, 10, 10, 84], hp: 16, core: true, mat: 'steel', label: 'LANTERN' },
  ],
  phases: [
    { at: 1.01, attacks: ['barrage'], interval: 2.4 },
    { at: 0.5, attacks: ['barrage', 'lob', 'sweep'], interval: 1.7 },
  ],
});

TC.def('boss', 'krake', {
  name: 'ADMIRAL KRAKE', title: 'in the LEVIATHAN mech', time: 120, coreHp: 26, root: [270, 0, 0],
  parts: [
    { id: 'legs', box: [-24, -30, 0, 24, 30, 16], hp: 0, mat: 'hull', decor: true },
    { id: 'clawL', box: [-10, -40, 16, 12, -22, 36], hp: 12, weak: true, mat: 'steel', label: 'LEFT CLAW' },
    { id: 'clawR', box: [-10, 22, 16, 12, 40, 36], hp: 12, weak: true, mat: 'steel', label: 'RIGHT CLAW' },
    { id: 'shell', box: [-16, -16, 18, 16, 16, 44], hp: 26, core: true, mat: 'steel', label: 'REACTOR SHELL' },
  ],
  phases: [
    { at: 1.01, attacks: ['barrage', 'sweep'], interval: 2.2 },
    { at: 0.5, attacks: ['barrage', 'sweep', 'lob'], interval: 1.5 },
  ],
});

// World-space boxes of a boss's parts, from its root (x toward the players, so the root's x is flipped).
TC.Sim.prototype.bossPartBox = function (part) {
  const b = this.boss, r = b.root, s = part.box;
  return [r[0] - s[3], r[1] + s[1], r[2] + s[2], r[0] - s[0], r[1] + s[4], r[2] + s[5]];
};

TC.Sim.prototype.startBoss = function (id) {
  const def = TC.get('boss', id);
  this.boss = {
    id, def, name: def.name, title: def.title, root: def.root.slice(), introT: 2.5, t: 0, attackT: 1.5,
    parts: def.parts.map(p => ({ id: p.id, hp: p.hp ? Math.ceil(p.hp * TC.tune.enemy.bossHpMul) : 0, max: p.hp, weak: !!p.weak,
      core: !!p.core, decor: !!p.decor, label: p.label || '', down: false })),
    defeated: false, phase: 0, bossT: 0,
  };
  this.boss.root[0] = this.base + def.root[0];
  this.boss.root[1] = 0;
  this.boss.root[2] = 0;
  this.timeMax = def.time * this.diff.time * TC.tune.time.sceneMul;
  this.timer = this.timeMax;
  this.phase = 'boss';
  this.phaseT = 0;
  this.emit('boss', { id, name: def.name, title: def.title });
  this.emit('phase', { phase: 'boss' });
};

// The boss's hit boxes for a ray: alive parts only (the core only once its weak parts are down).
TC.Sim.prototype.bossVolumes = function (best, consider, o, d) {
  const b = this.boss;
  if (!b || b.defeated) return;
  for (let i = 0; i < b.parts.length; i++) {
    const bp = b.parts[i];
    if (bp.decor || bp.down) continue;
    const def = b.def.parts[i];
    const t = TC.rayBox(o, d, this.bossPartBox(def));
    if (t >= 0) consider(t, { kind: 'boss', part: bp.id });
  }
};

TC.Sim.prototype.bossArmored = function () {
  return this.boss.parts.some(p => p.weak && !p.down);
};

// A hit on a boss part. The core is armored while a weak part stands: the shot pings.
TC.Sim.prototype.damageBoss = function (partId, p, dmg, at) {
  const b = this.boss;
  const bp = b.parts.find(x => x.id === partId);
  if (!bp || bp.down) return;
  p.stats.hits++;
  this.bumpChain(p);
  if (bp.core && this.bossArmored()) {
    this.emit('ping', { at, player: p.id });
    return;
  }
  bp.hp -= dmg;
  this.addScore(p, 100, at);
  this.emit('bossHit', { part: bp.id, player: p.id, at, hp: bp.hp });
  if (bp.hp <= 0) {
    bp.down = true;
    if (bp.core) {
      b.defeated = true;
      this.addScore(p, 5000, at);
      this.emit('bossDown', { player: p.id, at });
    } else {
      this.addScore(p, 1500, at);
      this.emit('partDown', { part: bp.id, label: bp.label, player: p.id, at });
    }
  }
};

// Each step: the intro card, the phase, attacks on their interval, the parts' shots.
TC.Sim.prototype.bossStep = function (dt) {
  const b = this.boss;
  if (!b || b.defeated) return;
  b.t += dt;
  if (b.introT > 0) { b.introT -= dt; return; }
  b.bossT += dt;
  const core = b.parts.find(p => p.core);
  const frac = core ? core.hp / Math.max(1, core.max || b.def.coreHp) : 1;
  let ph = 0;
  for (let i = 0; i < b.def.phases.length; i++) if (frac < b.def.phases[i].at) ph = i;
  if (ph !== b.phase) { b.phase = ph; this.emit('bossPhase', { phase: ph }); }
  const phase = b.def.phases[b.phase];
  b.attackT -= dt * TC.tune.enemy.fireMul;
  if (b.attackT <= 0) {
    b.attackT = phase.interval * TC.tune.enemy.fireMul;
    const kind = this.rng('boss.attack').pick(phase.attacks);
    this.bossAttack(kind);
  }
};

TC.Sim.prototype.bossAttack = function (kind) {
  const alive = this.players.filter(p => !p.out);
  if (!alive.length) return;
  const rs = this.rng('boss.target');
  const aimAt = alive[Math.floor(rs() * alive.length)];
  const tele = TC.tune.enemy.telegraphMul * 0.9;
  if (kind === 'barrage' || kind === 'sweep') {
    const guns = this.boss.parts.map((p, i) => ({ p, def: this.boss.def.parts[i] }))
      .filter(x => !x.p.decor && !x.p.down && x.p.id !== 'core' && (x.p.weak || !this.bossArmored()));
    const src = guns.length ? guns : [{ p: this.boss.parts.find(p => p.core), def: this.boss.def.parts.find(p => p.core) }];
    const n = kind === 'sweep' ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const g = src[Math.floor(rs() * src.length)];
      const bx = this.bossPartBox(g.def);
      const muzzle = [(bx[0] + bx[3]) / 2, (bx[1] + bx[4]) / 2, (bx[2] + bx[5]) / 2];
      const threatTo = aimAt;
      this.addThreat({ src: g.p.id, target: threatTo.id, muzzle, tele: tele + k * 0.45, kind: 'boss', pr: null });
    }
    return;
  }
  if (kind === 'lob') {
    const rr = this.rng('boss.lob');
    const core = this.boss.parts.find(p => p.core);
    const cdef = this.boss.def.parts.find(p => p.core);
    const bx = this.bossPartBox(cdef);
    const from = [(bx[0] + bx[3]) / 2, (bx[1] + bx[4]) / 2, (bx[2] + bx[5]) / 2];
    const flight = 1.3;
    const to = [this.base - 4 + rr() * 6, aimAt.slotY + (rr() - 0.5) * 20, 0];
    const pr = { id: this.id(), kind: 'grenade', from, to, flight, t0: this.t, x: from[0], y: from[1], z: from[2], r: 6, gone: false };
    this.projectiles.push(pr);
    this.addThreat({ src: core.id, target: aimAt.id, muzzle: from, tele: flight, kind: 'grenade', pr });
  }
};

// The boss as plain data for the presentation and the AI Hub snapshot.
TC.Sim.prototype.bossSnap = function () {
  const b = this.boss;
  return { id: b.id, name: b.name, title: b.title, defeated: b.defeated, phase: b.phase, intro: b.introT > 0,
    root: b.root.slice(), parts: b.parts.map(p => ({ id: p.id, hp: p.hp, max: p.max, down: p.down, weak: p.weak, core: p.core, decor: p.decor, label: p.label })) };
};
