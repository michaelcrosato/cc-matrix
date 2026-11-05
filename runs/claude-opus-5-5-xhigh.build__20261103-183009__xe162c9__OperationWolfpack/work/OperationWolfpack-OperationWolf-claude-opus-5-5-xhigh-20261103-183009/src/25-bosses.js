// The six bosses (7.9, 8.7): { parts by phase, hulls, update }. The boss bar is the sum of the current phase's weak
// points. Parts of a later phase are armored (sparks, "ARMORED"); a phase ends when its required parts are down.
(() => {
const E = My3D2dge, WP = globalThis.WP, BEH = WP.BEH, { clamp, lerp } = WP, Fire = WP.Fire, part = WP.Part;
const DEF = WP.BOSS_DEF = {};

const Bosses = WP.Bosses = {
  start(sim, id) {
    const d = DEF[id]; if (!d || sim.boss) return;
    sim.ev('bossWarn', { id, name: WP.TYPES[id].name });
    sim.radio('warn.' + id);
    const e = sim.spawn(id, Object.assign({ beh: 'boss' }, d.spawn(sim)));
    e.phase = 1; e.parts = d.parts(sim, e); e.hulls = d.hulls || [{ off: [0, 0, 0], box: WP.TYPES[id].box }]; e.intro = true; e.offOK = true;
    WP.placeParts(e); sim.boss = e; sim.state = 'boss';
    if (d.init) d.init(sim, e);
    // the Den drops a crate for the fight when someone is low on magazines
    if (sim.livePlayers().some(p => p.spares.length < 3)) { const w = sim.view.toWorld(-60, 110); sim.after(2, () => WP.Supply.chute(sim, w[0], w[1], 150, 'crate')); }
  },
  hp(e) { let h = 0; for (const p of e.parts || []) if (p.phase === e.phase && !p.dead && p.bar !== false) h += Math.max(0, p.hp); return h; },
  hpMax(e) { let h = 0; for (const p of e.parts || []) if (p.phase === e.phase && p.bar !== false) h += p.max; return h; },
  step(sim, e, dt) {
    if (e.dead) return;
    const d = DEF[e.type];
    d.update(sim, e, dt);
    WP.placeParts(e);
    // respawning gunners
    for (const p of e.parts) if (p.dead && p.respawns > 0 && p.phase === e.phase) { p.rt = (p.rt || 0) + dt; if (p.rt > (p.respawnT || 6)) { p.dead = false; p.hp = p.max; p.rt = 0; p.respawns--; sim.ev('partUp', { id: e.id, part: p.name }); } }
    // the phase ends when its required parts are down
    const req = e.parts.filter(p => p.phase === e.phase && p.req !== false);
    if (req.length && req.every(p => p.dead)) {
      e.phase++; sim.ev('bossPhase', { id: e.id, phase: e.phase });
      if (d.onPhase) d.onPhase(sim, e, e.phase);
      if (!e.parts.some(p => p.phase === e.phase)) Bosses.defeat(sim, e, sim.players.find(q => q.pid === e.lastBy));
    }
  },
  /** a bullet on the boss: a part, or the hull */
  hit(sim, e, s, dmg, p) {
    if (e.dead || e.intro && !DEF[e.type].hitIntro) { if (!e.dead) sim.ev('armored', { id: e.id, x: e.x, y: e.y, z: e.z + 20 }); return; }
    const d = DEF[e.type];
    let pp = s.pp;
    if (!pp && d.hullPart) pp = e.parts.find(q => q.name === d.hullPart(e) && !q.dead) || null;
    if (s.part === 'shield') { sim.ev('armored', { id: e.id, x: e.x, y: e.y, z: e.z + 20, shield: true }); return; }
    if (s.part === 'tuskHead' || s.part === 'tuskBody' || s.part === 'tuskLegs') pp = e.parts.find(q => q.name === 'tusk');
    if (!pp || pp.dead) { sim.ev('armored', { id: e.id, x: s.wx || e.x, y: s.wy || e.y, z: (e.z || 0) + 20 }); return; }
    if (pp.phase !== e.phase || pp.kind === 'armor') { sim.ev('armored', { id: e.id, x: pp.x, y: pp.y, z: pp.z, part: pp.name }); if (!sim.flags.armoredTip) { sim.flags.armoredTip = true; } return; }
    let k = dmg; if (s.part === 'tuskHead') k *= 3; if (pp.headMul && s.head) k *= pp.headMul;
    Bosses.damagePart(sim, e, pp, k, p, s.part);
  },
  damagePart(sim, e, pp, k, p, how) {
    pp.hp -= k; pp.hitT = .08; e.lastBy = p ? p.pid : e.lastBy;
    if (pp.onHit) pp.onHit(sim, e, pp, p, how);
    if (pp.hp <= 0 && !pp.dead) {
      pp.dead = true; pp.atk = null; sim.ev('partDown', { id: e.id, part: pp.name, kind: pp.kind, x: pp.x, y: pp.y, z: pp.z, boss: true });
      sim.ev('explode', { x: pp.x, y: pp.y, z: pp.z, r: 30, big: 1, kind: 'part' });
      if (p) sim.score(p, pp.kind === 'gunner' ? 200 : 1000, { x: pp.x, y: pp.y, z: pp.z }, { raw: true });
      if (pp.onDown) pp.onDown(sim, e, pp, p);
    }
  },
  /** a blast: the current phase's parts within reach take it (a position: those near it; none: all) */
  blast(sim, e, d, p, at) {
    if (e.dead || e.intro) return;
    if (at && !e.parts.some(pp => !pp.dead && pp.phase === e.phase && Math.hypot(pp.x - at[0], pp.y - at[1], (pp.z || 0) - (at[3] || 0)) < at[2] + 40)) return;
    for (const pp of e.parts) {
      if (pp.dead || pp.phase !== e.phase || pp.kind === 'armor') continue;
      if (pp.name === 'tusk') { if (DEF.tusk.shieldOff) DEF.tusk.shieldOff(sim, e); }
      Bosses.damagePart(sim, e, pp, d * (pp.name === 'tusk' ? .5 : .6), p, 'blast');
    }
  },
  defeat(sim, e, p) {
    if (e.dead) return;
    e.dead = true; e.st = 'die'; e.stt = 0; sim.bossDone = true; sim.state = 'boss';
    const tp = WP.TYPES[e.type];
    if (p) sim.score(p, tp.score, { x: e.x, y: e.y, z: e.z + 40 }, { raw: true });
    else for (const q of sim.livePlayers()) sim.score(q, Math.round(tp.score / sim.livePlayers().length), null, { raw: true });
    sim.ev('bossDefeat', { id: e.id, type: e.type, by: p ? p.pid : -1 });
    sim.radio('defeat.' + e.type);
    for (let i = 0; i < 6; i++) sim.after(.15 * i, () => sim.ev('explode', { x: e.x + (i % 3 - 1) * 18, y: e.y, z: (e.z || 0) + 10 + i * 4, r: 50 + i * 8, big: 2, kind: 'boss' }));
    for (const q of sim.ents) if (!q.dead && !q.gone && q !== e && (WP.TYPES[q.type].kind === 'infantry' || WP.TYPES[q.type].kind === 'proj')) { if (WP.TYPES[q.type].kind === 'proj') q.gone = true; else { q.leave = true; } }
    sim.after(3, () => { sim.state = 'clear'; sim.ev('clear', { op: sim.stage.id }); });
  }
};
// (a boss has no per-step behavior: WP.Bosses.step drives it from the Sim)
BEH['dead:boss'] = (sim, e, dt) => { const d = DEF[e.type]; if (d.dying) d.dying(sim, e, dt); };
BEH['shapes:boss'] = (sim, e, out, V) => {
  if (e.dead || e.gone) return;
  const d = DEF[e.type];
  if (d.shapes) { d.shapes(sim, e, out, V); return; }
  Bosses.stdShapes(sim, e, out, V);
};
Bosses.stdShapes = (sim, e, out, V) => {
  let hullD = 1e9;
  for (const h of e.hulls) {
    const w = WP.Hit.local(e, h.off), D = V.depth(w[0], w[1]); if (D < 14) continue;
    const s = WP.Hit.boxPoly(V, w[0], w[1], w[2] + (e.bob || 0), h.box, e.facing, WP.TYPES[e.type].sc); if (!s) continue;
    s.e = e; s.part = 'hull'; s.D = D; out.push(s); hullD = Math.min(hullD, D);
  }
  for (const p of e.parts) {
    if (p.dead || p.nohit || (p.phase || 1) > e.phase) continue;   // (a later phase's part: the hull in front of it sparks "ARMORED")
    const pr = V.project(p.x, p.y, p.z + (e.bob || 0)); if (!pr) continue;
    out.push({ e, pp: p, part: p.name, D: Math.min(V.depth(p.x, p.y) - (p.front || 6), hullD - 1), kind: 'c', cx: pr[0], cy: pr[1], r: Math.max(5, p.r * pr[2]) });   // (its own parts in front of its own hull)
  }
};
const live = (e, n) => { const p = e.parts.find(q => q.name === n); return p && !p.dead; };
const P_ = (e, n) => e.parts.find(q => q.name === n);
const pl = sim => { const l = sim.livePlayers(); return l.length ? WP.pick(sim.R.ai, l).pid : null; };
const shuffle = (sim, e, dt, range, every, speed) => {
  e.shT = (e.shT || 0) - dt;
  if (e.shT <= 0) { e.shT = every; e.goalLx = (sim.R.ai() * 2 - 1) * range; }
  const L = sim.view.lateral(e.x, e.y), dl = clamp((e.goalLx || 0) - L, -speed, speed), P = sim.view.P;
  e.x += P.rx * dl * dt; e.y += P.ry * dl * dt; e.vx = P.rx * dl; e.vy = P.ry * dl; e.odo = (e.odo || 0) + Math.abs(dl) * dt;
};

// ---------- BIG EAR (Op 1): a six-wheel signal truck ----------
DEF.bigEar = {
  spawn: sim => { const P = sim.view; return { lx: P.halfWidth(260) + 80, dz: 260 }; },
  parts: (sim, e) => [
    part('dish', 'weak', [0, -14, 36], 14, 30, { phase: 1, label: 'RADAR DISH' }),
    part('pod', 'weak', [0, -30, 30], 8, 15, { phase: 1, req: false, label: 'ROCKET POD' }),
    part('gunL', 'gunner', [-9, 8, 30], 5, 1, { phase: 1, req: false, bar: false, respawns: 2, fire: { tele: 1.3, bullets: [2, 3], acc: .45, dmg: 4 }, cd: 2 }),
    part('gunR', 'gunner', [9, 8, 30], 5, 1, { phase: 1, req: false, bar: false, respawns: 2, fire: { tele: 1.3, bullets: [2, 3], acc: .45, dmg: 4 }, cd: 3.2 }),
    part('cab', 'weak', [0, 26, 14], 14, 60, { phase: 2, label: 'ENGINE' })
  ],
  hulls: [{ off: [0, 0, 0], box: [24, 80, 28] }],
  hullPart: e => e.phase === 2 ? 'cab' : null,
  update(sim, e, dt) {
    const P = sim.view.P;
    if (e.intro) {   // drives in from the right, parks
      const L = sim.view.lateral(e.x, e.y); e.facing = Math.atan2(-P.ry, -P.rx);
      e.x -= P.rx * 70 * dt; e.y -= P.ry * 70 * dt; e.odo = (e.odo || 0) + 70 * dt;
      if (L < 40) { e.intro = false; e.st = 'fight'; e.stt = 0; e.rocketT = 3; e.paraT = 6; }
      return;
    }
    shuffle(sim, e, dt, 120, 8, 45);
    e.dishA = (e.dishA || 0) + dt * (live(e, 'dish') ? 1.6 : 0);
    WP.partsFire(sim, e, dt, true);
    if (live(e, 'pod')) { e.rocketT -= dt; if (e.rocketT <= 0 && !sim.cheats.holdFire) { e.rocketT = 6 * sim.teleK; const p = P_(e, 'pod'); for (let i = 0; i < 2; i++) sim.after(.25 * i, () => { const t = pl(sim); if (t !== null && !e.dead) WP.Proj.launch(sim, e, 'rocket', t, [p.x, p.y, p.z]); }); sim.ev('podFire', { id: e.id }); } }
    if (live(e, 'dish')) { e.paraT -= dt; if (e.paraT <= 0) { e.paraT = 12; for (let i = 0; i < 2; i++) sim.spawn('para', { lx: (sim.R.ai() - .5) * 260, dz: 160 + sim.R.ai() * 80, z: 170, noQuota: true }); sim.radio('bigEar.call'); } }
  },
  onPhase(sim, e, n) { if (n === 2) { sim.radio('bigEar.dish'); for (const p of e.parts) if (p.phase === 1) { p.dead = true; p.atk = null; } } }
};

// ---------- CROCODILE (Op 2): a gunboat, weaving ahead ----------
DEF.crocodile = {
  spawn: sim => ({ anchor: 'cam', lx: 0, dz: 900 }),
  parts: () => [
    part('turretF', 'weak', [0, 22, 16], 10, 20, { phase: 1, fire: { tele: 1.4, bullets: [4, 4], acc: .45, dmg: 4, every: 3 }, cd: 2, label: 'FRONT TURRET' }),
    part('turretR', 'weak', [0, -20, 16], 10, 20, { phase: 1, fire: { tele: 1.4, bullets: [4, 4], acc: .45, dmg: 4, every: 3.4 }, cd: 3.5, label: 'REAR TURRET' }),
    part('mortar', 'weak', [0, -5, 16], 9, 15, { phase: 1, label: 'DECK MORTAR' }),
    part('bridge', 'weak', [0, 4, 22], 16, 45, { phase: 2, label: 'BRIDGE' })
  ],
  hulls: [{ off: [0, 0, 0], box: [32, 88, 14] }, { off: [0, 4, 13], box: [16, 18, 12] }],
  hullPart: e => e.phase === 2 ? 'bridge' : null,
  update(sim, e, dt) {
    e.bob = Math.sin(e.t * 2) * 1.6;
    if (e.intro) { e.dz = Math.max(220, e.dz - 160 * dt); if (e.dz <= 221) { e.intro = false; e.mortT = 4; } e.facing = sim.cam.angle + Math.PI; return; }
    e.lx = Math.sin(e.t * .45) * 80; e.dz = 200 + Math.sin(e.t * .3) * 40;
    e.facing = sim.cam.angle + Math.PI + Math.cos(e.t * .45) * .25;
    WP.partsFire(sim, e, dt, true);
    if (live(e, 'mortar')) { e.mortT -= dt; if (e.mortT <= 0 && !sim.cheats.holdFire) { e.mortT = 5 * sim.teleK; const p = P_(e, 'mortar'), t = pl(sim); if (t !== null) WP.Proj.launch(sim, e, 'mortar', t, [p.x, p.y, p.z]); } }
    if (!e.skiffs && WP.Bosses.hp(e) < WP.Bosses.hpMax(e) * .5) { e.skiffs = true; for (const s of [-1, 1]) sim.spawn('skiff', { lx: s * 70, dz: 520, beh: 'river', noQuota: true }); sim.radio('croc.skiffs'); }
    if (e.phase === 2 && !e.p2) { e.p2 = true; e.mortT = 3; }
    if (e.phase === 2) { e.mortT -= dt; if (e.mortT <= 0 && !sim.cheats.holdFire) { e.mortT = 4 * sim.teleK; const t = pl(sim), b = P_(e, 'bridge'); if (t !== null) WP.Proj.launch(sim, e, 'rocket', t, [b.x, b.y, b.z]); } }
  },
  onPhase(sim, e, n) { if (n === 2) sim.radio('croc.bridge'); },
  dying(sim, e, dt) { e.z -= 8 * dt; }
};

// ---------- WARTHOG (Op 3): a flamethrower half-track in the plaza ----------
DEF.warthog = {
  spawn: sim => ({ lx: -(sim.view.halfWidth(200) + 60), dz: 200 }),
  parts: () => [
    part('cannon', 'weak', [0, 12, 20], 9, 25, { phase: 1, label: 'CANNON' }),
    part('tankL', 'weak', [-12, -14, 13], 9, 12, { phase: 1, label: 'FUEL TANK' }),
    part('tankR', 'weak', [12, -14, 13], 9, 12, { phase: 1, label: 'FUEL TANK' }),
    part('snarl', 'gunner', [0, -4, 22], 5, 2, { phase: 1, req: false, bar: false, headMul: 1, onHit: (sim, e) => { e.stunT = 2; sim.ev('snarl', { id: e.id }); }, label: 'SGT. SNARL' }),
    part('hull', 'weak', [0, 0, 12], 16, 50, { phase: 2, nohit: true, label: 'HULL' })
  ],
  hulls: [{ off: [0, 0, 0], box: [22, 64, 22] }],
  hullPart: e => e.phase === 2 ? 'hull' : null,
  update(sim, e, dt) {
    const P = sim.view.P;
    if (e.intro) { e.facing = Math.atan2(P.ry, P.rx); e.x += P.rx * 60 * dt; e.y += P.ry * 60 * dt; e.odo = (e.odo || 0) + 60 * dt; if (sim.view.lateral(e.x, e.y) > -60) { e.intro = false; e.canT = 3; e.flameT = 5; e.civT = 4; e.civN = 3; } return; }
    if (e.stunT > 0) { e.stunT -= dt; e.vx = e.vy = 0; return; }
    shuffle(sim, e, dt, 100, 6, 40);
    e.turret = e.facing = Math.atan2(P.y - e.y, P.x - e.x);
    if (live(e, 'cannon')) { e.canT -= dt; if (e.canT <= 0 && !e.canGlow) { e.canGlow = { t: 0, T: 2 * sim.teleK, pid: pl(sim) }; sim.ev('glow', { id: e.id, part: 'cannon', T: e.canGlow.T }); } }
    if (e.canGlow) { e.canGlow.t += dt; if (!live(e, 'cannon')) e.canGlow = null; else if (e.canGlow.t >= e.canGlow.T) { const c = P_(e, 'cannon'); if (e.canGlow.pid !== null && !sim.cheats.holdFire) WP.Proj.launch(sim, e, 'shell', e.canGlow.pid, [c.x, c.y, c.z]); e.canGlow = null; e.canT = 4.5; } }
    // the flamethrower, while a tank holds out: the nozzle glows 1.5 s, then a flame wave
    const tanks = ['tankL', 'tankR'].filter(n => live(e, n));
    if (tanks.length) {
      e.flameT -= dt;
      if (e.flameT <= 0 && !e.flame) { const side = WP.pick(sim.R.ai, tanks); e.flame = { t: 0, T: 1.5 * sim.teleK, side, pid: pl(sim) }; sim.ev('glow', { id: e.id, part: side, T: e.flame.T, flame: true }); }
    }
    if (e.flame) {
      e.flame.t += dt;
      if (!live(e, e.flame.side)) { sim.ev('flameStop', { id: e.id }); e.flame = null; e.flameT = 5; }
      else if (e.flame.t >= e.flame.T) { if (e.flame.pid !== null && !sim.cheats.holdFire) WP.Proj.launch(sim, e, 'flame', e.flame.pid, [e.x, e.y, 0]); e.flame = null; e.flameT = 6; }
    }
    // civilians cross the far side three times
    e.civT -= dt; if (e.civT <= 0 && e.civN > 0) { e.civN--; e.civT = 9; sim.spawn('villager', { side: e.civN % 2 ? 'L' : 'R', dz: 380, flee: true }); }
  },
  onPhase(sim, e, n) { if (n === 2) { sim.radio('warthog.p2'); const s = P_(e, 'snarl'); if (s) { s.dead = true; } } }
};

// ---------- IRON HOG (Op 4): an armored train on the tracks ----------
DEF.ironHog = {
  spawn: sim => ({ lx: sim.view.halfWidth(260) + 200, dz: 260 }),
  parts: () => [
    part('boiler', 'weak', [0, 8, 16], 14, 40, { phase: 2, label: 'BOILER' }),
    part('mgCar', 'weak', [0, -62, 22], 11, 16, { phase: 1, fire: { tele: 1.4, bullets: [3, 4], acc: .45, dmg: 4, every: 2.6 }, cd: 2, label: 'MG CAR' }),
    part('rocketCar', 'weak', [0, -116, 22], 11, 20, { phase: 1, label: 'ROCKET CAR' }),
    part('mortarCar', 'weak', [0, -170, 22], 11, 16, { phase: 1, label: 'MORTAR CAR' })
  ],
  hulls: [{ off: [0, 0, 0], box: [20, 64, 30] }, { off: [0, -62, 0], box: [20, 50, 24] }, { off: [0, -116, 0], box: [20, 50, 24] }, { off: [0, -170, 0], box: [20, 50, 24] }],
  hullPart: () => null,
  update(sim, e, dt) {
    const P = sim.view.P;
    if (e.base === undefined) { e.base = sim.view.P.x; e.dirT = -1; }
    if (e.intro) { e.facing = Math.atan2(-P.ry, -P.rx); e.x -= P.rx * 90 * dt; e.y -= P.ry * 90 * dt; e.odo = (e.odo || 0) + 90 * dt; if (sim.view.lateral(e.x, e.y) < 200) { e.intro = false; e.rocT = 4; e.morT = 6; e.ventT = 8; } return; }
    // back and forth over 900 units at 45 u/s
    const L = sim.view.lateral(e.x, e.y);
    if (L < -450) e.dirT = 1; if (L > 450) e.dirT = -1;
    e.x += P.rx * 45 * e.dirT * dt; e.y += P.ry * 45 * e.dirT * dt; e.odo = (e.odo || 0) + 45 * dt;
    e.facing = Math.atan2(-P.ry, -P.rx) + (e.dirT > 0 ? 0 : 0);
    WP.partsFire(sim, e, dt, true);
    if (live(e, 'rocketCar')) { e.rocT -= dt; if (e.rocT <= 0 && !sim.cheats.holdFire) { e.rocT = 9 * sim.teleK; const c = P_(e, 'rocketCar'); for (let i = 0; i < 3; i++) sim.after(.45 * i, () => { const t = pl(sim); if (t !== null && !e.dead) WP.Proj.launch(sim, e, 'rocket', t, [c.x, c.y, c.z + 6]); }); sim.ev('podFire', { id: e.id }); } }
    if (live(e, 'mortarCar')) { e.morT -= dt; if (e.morT <= 0 && !sim.cheats.holdFire) { e.morT = 6 * sim.teleK; const c = P_(e, 'mortarCar'), t = pl(sim); if (t !== null) WP.Proj.launch(sim, e, 'mortar', t, [c.x, c.y, c.z + 6]); } }
    // vent steam (phase 2): 1.5 s glow -> 10 damage, unless the boiler takes 10 in the glow
    if (e.phase === 2) {
      e.ventT -= dt;
      if (e.ventT <= 0 && !e.vent) { const b = P_(e, 'boiler'); e.vent = { t: 0, T: 1.5 * sim.teleK, hp0: b.hp, pid: pl(sim) }; sim.ev('glow', { id: e.id, part: 'boiler', T: e.vent.T, vent: true }); }
      if (e.vent) { e.vent.t += dt; const b = P_(e, 'boiler'); if (e.vent.hp0 - b.hp >= 10) { e.vent = null; e.ventT = 6; sim.ev('ventStop', { id: e.id }); } else if (e.vent.t >= e.vent.T) { const p = sim.players.find(q => q.pid === e.vent.pid); if (p && !sim.cheats.holdFire) sim.hurtPlayer(p, 10 * sim.dmgK, { kind: 'steam' }); sim.ev('steam', { id: e.id }); e.vent = null; e.ventT = 6; } }
      if (!e.p2fire) { e.p2fire = true; e.p2T = 3; }
      e.p2T -= dt; if (e.p2T <= 0 && !sim.cheats.holdFire) { e.p2T = 5 * sim.teleK; const b = P_(e, 'boiler'), t = pl(sim); if (t !== null) WP.Proj.launch(sim, e, 'rocket', t, [b.x, b.y, b.z + 10]); }
    }
  },
  onPhase(sim, e, n) { if (n === 2) sim.radio('ironHog.p2'); }
};
// an ammo wagon blast deals 30 to the car beside it (sim.explode routes blasts here with a position)
WP.Bosses.blastAt = (sim, e, x, y, r, d, p) => {
  for (const pp of e.parts) { if (pp.dead || pp.phase !== e.phase) continue; if (Math.hypot(pp.x - x, pp.y - y) < r + 30) Bosses.damagePart(sim, e, pp, d, p, 'blast'); }
};

// ---------- MAJOR TUSK (Op 5): the central tower, then the warden on foot ----------
DEF.tusk = {
  spawn: sim => { const st = sim.stage; const w = st.toWorld(2700, 300); return { x: w[0], y: w[1] }; },
  hitIntro: true,
  parts: () => [
    part('mg', 'weak', [0, 10, 64], 9, 15, { phase: 1, fire: { tele: 1.4, bullets: [4, 5], acc: .45, dmg: 4, every: 2.8 }, cd: 2, label: 'TOWER MG' }),
    part('light1', 'weak', [-14, 10, 74], 6, 2, { phase: 1, label: 'SEARCHLIGHT' }),
    part('light2', 'weak', [14, 10, 74], 6, 2, { phase: 1, label: 'SEARCHLIGHT' }),
    part('leg1', 'weak', [-16, 0, 24], 7, 15, { phase: 1, label: 'SUPPORT' }),
    part('leg2', 'weak', [16, 0, 24], 7, 15, { phase: 1, label: 'SUPPORT' }),
    part('leg3', 'weak', [0, -7, 30], 7, 15, { phase: 1, label: 'SUPPORT' }),
    part('tusk', 'weak', [0, 0, 0], 8, 40, { phase: 2, nohit: true, label: 'MAJOR TUSK' })
  ],
  hulls: [{ off: [0, 0, 56], box: [36, 30, 22] }],
  init(sim, e) { e.intro = false; e.shield = true; e.lightA = 0; },
  update(sim, e, dt) {
    const P = sim.view.P;
    if (e.phase === 1) {
      WP.partsFire(sim, e, dt, true);
      e.lightA += dt;
      // the tower's lights sweep: SPOTTED when they cross the camera
      for (const [n, ph] of [['light1', 0], ['light2', 2]]) if (live(e, n)) { const a = Math.sin(e.lightA * .5 + ph); if (Math.abs(a) < .08) { if (sim.spotted <= 0) sim.ev('spotted', { id: e.id }); sim.spotted = 3; } }
      return;
    }
    // phase 2: TUSK on foot, from depth 250 to 90; lowers the shield 1.0 s for a shotgun blast; charges below 90
    if (!e.tusk) { e.tusk = { D: 250, lx: 0, st: 'walk', t: 0, shieldOff: 0, fireT: 2.5 }; sim.radio('tusk.p2'); }
    const T = e.tusk; T.t += dt;
    if (T.shieldOff > 0) T.shieldOff -= dt;
    if (T.stagger > 0) T.stagger -= dt;
    if (T.st === 'walk') {
      T.D = Math.max(90, T.D - 22 * dt); T.lx = Math.sin(e.t * .6) * 70;
      T.fireT -= dt;
      if (T.fireT <= 0 && !sim.cheats.holdFire) { T.st = 'aim'; T.t = 0; e.atkT = { t: 0, T: 1.0 * sim.teleK, pid: pl(sim) }; sim.ev('telegraph', { id: e.id, pid: e.atkT.pid, T: e.atkT.T, kind: 'gun', part: 'tusk' }); }
      if (T.D <= 90.5 && T.st === 'walk') { T.st = 'charge'; T.t = 0; sim.radio('tusk.charge'); }
    } else if (T.st === 'aim') {
      e.atkT.t += dt;
      if (e.atkT.t >= e.atkT.T) {
        const p = sim.players.find(q => q.pid === e.atkT.pid);
        for (let i = 0; i < 3; i++) { const hit = p && !p.down && sim.R.ai() < .55 * sim.accK * WP.Fire.depthFactor(T.D); sim.ev('efire', { id: e.id, pid: e.atkT.pid, hit, part: 'tusk', shotgun: true }); if (hit) sim.hurtPlayer(p, 6 * sim.dmgK, { kind: 'bullet' }); }
        T.st = 'walk'; T.fireT = 2.6 + sim.R.ai(); e.atkT = null;
      }
    } else if (T.st === 'charge') {
      T.D -= 90 * dt;
      if (T.D <= 60) { const p = sim.players.find(q => q.pid === pl(sim)); if (p) sim.hurtPlayer(p, 20 * sim.dmgK, { kind: 'charge' }); sim.ev('tuskHit', { id: e.id }); T.st = 'back'; T.t = 0; }
    } else if (T.st === 'back') { T.D = Math.min(150, T.D + 160 * dt); if (T.D >= 150) { T.st = 'walk'; T.fireT = 2; } }
    const w = sim.view.toWorld(T.lx, T.D); e.tx = w[0]; e.ty = w[1];
  },
  shieldOff(sim, e) { if (e.tusk) { e.tusk.shieldOff = 3; sim.ev('shieldOff', { id: e.id }); } },
  shapes(sim, e, out, V) {
    if (e.phase === 1) { Bosses.stdShapes(sim, e, out, V); return; }
    if (!e.tusk) return;
    const T = e.tusk, p = V.project(e.tx, e.ty, 0); if (!p) return;
    const D = V.depth(e.tx, e.ty), H = WP.RIG_H.bulky * 1.75 * V.q(p[2]), tmp = [];
    WP.Hit.humanoid(tmp, e, D, p[0], p[1], H, {});
    for (const s of tmp) { s.part = s.part === 'head' ? 'tuskHead' : s.part === 'body' ? 'tuskBody' : 'tuskLegs'; out.push(s); }
    const open = T.shieldOff > 0 || T.st === 'aim' && e.atkT && e.atkT.t > .15;
    if (!open) out.push({ e, part: 'shield', D: D - 3, kind: 'r', x0: p[0] - H * .3, x1: p[0] + H * .3, y0: p[1] - H * .78, y1: p[1] - H * .12 });
  },
  onPhase(sim, e, n) { if (n === 2) { sim.ev('towerFall', { id: e.id }); for (const p of e.parts) if (p.phase === 1) { p.dead = true; p.atk = null; } P_(e, 'tusk').nohit = true; } }
};
// TUSK's own parts: hits on the rig route to the 'tusk' part (Bosses.hit), head x3; each head hit staggers
// ---------- HYENA ONE (Op 6 part B): KRAGG's gunship behind the plane ----------
DEF.hyenaOne = {
  spawn: sim => ({ anchor: 'cam', lx: 0, dz: 700, z: 0 }),
  parts: () => [
    part('podL', 'weak', [-16, 6, -2], 9, 25, { phase: 1, label: 'ROCKET POD' }),
    part('podR', 'weak', [16, 6, -2], 9, 25, { phase: 1, label: 'ROCKET POD' }),
    part('door', 'gunner', [8, 4, 5], 6, 3, { phase: 1, req: false, bar: false, respawns: 99, respawnT: 5, fire: { tele: 1.3, bullets: [3, 4], acc: .45, dmg: 4 }, cd: 2.4 }),
    part('nose', 'weak', [0, 24, -1], 10, 30, { phase: 2, label: 'NOSE CANNON' }),
    part('kragg', 'gunner', [8, 8, 5], 6, 3, { phase: 3, req: false, bar: false, onHit: (sim, e) => { e.stagger = 2; sim.ev('kraggHit', { id: e.id }); }, respawns: 99, respawnT: 2, label: 'KRAGG' }),
    part('rotor', 'weak', [0, 4, 16], 14, 60, { phase: 3, label: 'ROTOR HUB' })
  ],
  hulls: [{ off: [0, -12, -4], box: [24, 76, 20] }],
  hullPart: () => null,
  update(sim, e, dt) {
    const camZ = sim.cam.h, tp = Math.tan((sim.cam.pitch || 6) * Math.PI / 180), zAt = dz => camZ - dz * tp * .8;   // a little above the view's centre at any pitch
    if (e.intro) { e.dz = Math.max(180, e.dz - 200 * dt); e.z = zAt(e.dz) - 10; if (e.dz <= 181) { e.intro = false; e.salvoT = 3; e.noseT = 3; e.missT = 3; sim.radio('kragg.taunt0'); } e.facing = sim.cam.angle + Math.PI; return; }
    if (e.stagger > 0) e.stagger -= dt;
    e.lx = Math.sin(e.t * .5) * 90; e.dz = 180 + Math.sin(e.t * .37) * 40; e.z = zAt(e.dz) + Math.sin(e.t * .8) * 10;
    e.facing = sim.cam.angle + Math.PI + Math.cos(e.t * .5) * .2;
    WP.partsFire(sim, e, dt, true);
    const t = () => pl(sim);
    if (e.phase === 1 && (live(e, 'podL') || live(e, 'podR'))) { e.salvoT -= dt; if (e.salvoT <= 0 && !sim.cheats.holdFire) { e.salvoT = 5 * sim.teleK; const pods = ['podL', 'podR'].filter(n => live(e, n)); for (let i = 0; i < 3; i++) sim.after(.25 * i, () => { const q = P_(e, pods[i % pods.length]), tt = t(); if (tt !== null && !e.dead) WP.Proj.launch(sim, e, 'rocket', tt, [q.x, q.y, q.z]); }); sim.ev('podFire', { id: e.id }); } }
    if (e.phase === 2) { if (!e.noseGlow) { e.noseT -= dt; if (e.noseT <= 0) { e.noseGlow = { t: 0, T: 2 * sim.teleK, pid: t() }; sim.ev('glow', { id: e.id, part: 'nose', T: e.noseGlow.T }); } } else { e.noseGlow.t += dt; if (!live(e, 'nose')) e.noseGlow = null; else if (e.noseGlow.t >= e.noseGlow.T) { const q = P_(e, 'nose'); if (e.noseGlow.pid !== null && !sim.cheats.holdFire) WP.Proj.launch(sim, e, 'shell', e.noseGlow.pid, [q.x, q.y, q.z]); e.noseGlow = null; e.noseT = 3; } } }
    if (e.phase === 3) {
      e.missT -= dt;
      if (e.missT <= 0 && !(e.stagger > 0) && live(e, 'kragg') && !sim.cheats.holdFire) { e.missT = 4 * sim.teleK; const q = P_(e, 'kragg'), tt = t(); if (tt !== null) WP.Proj.launch(sim, e, 'missile', tt, [q.x, q.y, q.z]); }
      e.tauntT = (e.tauntT || 6) - dt; if (e.tauntT <= 0) { e.tauntT = 9; sim.radio('kragg.taunt' + (1 + Math.floor(sim.R.ai() * 2))); }
    }
  },
  onPhase(sim, e, n) { if (n === 2) { sim.radio('hyena.p2'); const d = P_(e, 'door'); d.dead = true; d.respawns = 0; } if (n === 3) sim.radio('kragg.taunt2'); },
  dying(sim, e, dt) { e.dz += 30 * dt; e.z -= 60 * dt; e.facing += dt * 4; e.spin = (e.spin || 0) + dt; }
};
})();
