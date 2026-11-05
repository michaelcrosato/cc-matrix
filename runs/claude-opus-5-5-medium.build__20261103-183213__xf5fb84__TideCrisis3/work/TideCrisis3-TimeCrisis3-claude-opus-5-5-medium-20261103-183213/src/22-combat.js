// 22-combat: the ThreatDirector (the crisis flash: caps, minimum gap, pop-out protection, resolution against cover),
// projectiles (grenades, rockets, harpoons, torpedoes, missiles, flares, the player's GL rounds; all shootable),
// objects (explosive barrels and tanks, breakable crates, lanterns, bottles and goods, windows, life rings, intel
// bottles, gate locks, the fireworks barge's crates), civilians and hostages. Reads: Sim (20), enemies (21).

// ---------------------------------------------------------------- threats
// a threat: { id, src, target, left, dur, kind, at, done, result (true = hit, false = blocked), protect }
function requestThreat(sim, o) {
  const p = sim.players[o.target]; if (!p || p.left || p.out) return null;
  const st = sim.stageId || 1, base = st === 1 ? 1 : 2, maxT = Math.max(1, (tune.enemy.maxThreats || base) + sim.diff.maxThreatAdd);
  const mine = sim.threats.filter(t => t.target === o.target && !t.done);
  if (!o.always && mine.length >= maxT) return null;
  let dur = o.dur;
  // no two impacts on one player closer than minGap
  const gap = tune.enemy.minGap; let last = p.lastImpact !== undefined ? p.lastImpact - sim.t : -9;
  for (const t of mine) last = Math.max(last, t.left);
  if (dur < last + gap) { if (!o.always) return null; dur = last + gap; }
  const t = { id: sim.nextId++, src: o.src, target: o.target, left: dur, dur, kind: o.kind || 'shot', at: o.at, done: false, result: null, proj: o.proj || null, unblockable: !!o.unblockable, protect: false, sweep: o.sweep || 0 };
  sim.threats.push(t); p.lastImpact = sim.t + dur;
  sim.emit('threat', { id: t.id, src: o.src, target: o.target, dur, kind: t.kind, at: o.at });
  return t;
}
TC.requestThreat = requestThreat;
function cancelThreat(sim, t) { if (t.done) return; t.done = true; t.result = false; t.cancelled = true; sim.emit('threatcancel', { id: t.id }); }
TC.cancelThreat = cancelThreat;
function resolveThreat(sim, t) {
  if (t.done) return; t.done = true;
  const p = sim.players[t.target]; if (!p || p.out || p.left) { t.result = false; return; }
  const exposed = sim.exposed(p) || t.unblockable;
  if (exposed && p.iframes <= 0 && !(sim.cheats.god || tune.player.god)) { t.result = true; sim.hurt(p, { reason: t.kind }); sim.emit('threathit', { id: t.id, p: p.i, kind: t.kind }); }
  else { t.result = false; if (!exposed) { p.stats.saves++; sim.emit('blocked', { id: t.id, p: p.i, kind: t.kind, at: t.at }); } else sim.emit('threatgod', { id: t.id, p: p.i }); }
}
TC.resolveThreat = resolveThreat;
TC.stepThreats = (sim, dt) => {
  for (const t of sim.threats) {
    if (t.done || t.proj) continue;
    const p = sim.players[t.target]; if (!p) { t.done = true; continue; }
    const before = t.left; t.left -= dt;
    // pop-out protection: leaving cover with under 0.15 s of telegraph left slides the impact 0.15 s later
    if (!t.protect && sim.exposed(p) && p.wasCover && t.left < .15 && t.left > -dt) { t.left = .15; t.protect = true; }
    if (t.sweep) { if (t.left <= 0 && t.left > -t.sweep) { if (sim.exposed(p) && p.iframes <= 0 && !(sim.cheats.god || tune.player.god)) { t.done = true; t.result = true; sim.hurt(p, { reason: 'sweep' }); } continue; } if (t.left <= -t.sweep) { t.done = true; t.result = false; p.stats.saves++; sim.emit('blocked', { id: t.id, p: p.i, kind: t.kind, at: t.at }); } continue; }
    if (t.left <= 0 && before > 0) resolveThreat(sim, t);
  }
  for (const p of sim.players) p.wasCover = p.c >= .5;
  sim.threats = sim.threats.filter(t => !t.done || sim.t - (t.doneAt || (t.doneAt = sim.t)) < .4);
};

// ---------------------------------------------------------------- projectiles
// { id, kind, pos, vel, gravity, hp, r, team, target, threat, life, shootable, owner }
const PROJ = {
  grenade: { hp: 1, r: 4.5, score: 1000 }, rocket: { hp: 1, r: 5, score: 1000 }, harpoon: { hp: 2, r: 4.5, score: 1000 }, torpedo: { hp: 2, r: 6, score: 1000, unblockable: true },
  missile: { hp: 1, r: 5, score: 1000 }, flare: { hp: 1, r: 5.5, score: 1000 }, pgl: { hp: 99, r: 2 }, debris: { hp: 99, r: 0 }
};
function spawnProjectile(sim, kind, pos, vel, o = {}) {
  const K = PROJ[kind] || {};
  const pr = Object.assign({ id: sim.nextId++, kind, pos: pos.slice(), vel: vel.slice(), gravity: 0, hp: K.hp || 1, r: K.r || 4, team: 'enemy', life: 8, shootable: kind !== 'pgl' && kind !== 'debris', t: 0 }, o);
  sim.projectiles.push(pr); sim.emit('proj', { id: pr.id, kind });
  return pr;
}
TC.spawnProjectile = spawnProjectile;
// the point in front of player i's cover where something aimed at it arrives
function coverPoint(sim, i, ahead = 18) { const c = sim.poseOf(i, 'stand'), f = [Math.cos(c.yaw), Math.sin(c.yaw), 0]; return [c.x + f[0] * ahead, c.y + f[1] * ahead, c.z - 6]; }
TC.coverPoint = coverPoint;
function lobGrenade(sim, e, at) {
  const tgt = coverPoint(sim, e.target, 34 + sim.rng('proj')() * 20), T0 = 1.1 + sim.rng('proj')() * .3, g = 240;
  const th = requestThreat(sim, { src: e.id, target: e.target, dur: T0, kind: 'grenade', at, always: true, proj: true }), T = th ? th.dur : T0;
  const vel = [(tgt[0] - at[0]) / T, (tgt[1] - at[1]) / T, (tgt[2] - at[2]) / T + .5 * g * T];
  return spawnProjectile(sim, 'grenade', at, vel, { gravity: g, target: e.target, threat: th, arrive: T, src: e.id });
}
TC.lobGrenade = lobGrenade;
function fireRocket(sim, src, at, kind = 'rocket', o = {}) {
  const tgt = o.to || coverPoint(sim, src.target !== undefined ? src.target : 0, 14), d = vsub(tgt, at), L = vlen(d), sp0 = o.speed || (kind === 'torpedo' ? 120 : kind === 'flare' ? 160 : kind === 'harpoon' ? 300 : 220), T0 = L / sp0;
  const th = requestThreat(sim, { src: src.id, target: src.target || 0, dur: T0, kind, at, always: true, proj: true, unblockable: kind === 'torpedo' }), T = th ? th.dur : T0, sp = L / T;
  let vel = vmul(vnorm(d), sp), g = 0;
  if (kind === 'missile') { g = 160; vel = [d[0] / T, d[1] / T, d[2] / T + .5 * g * T]; }
  return spawnProjectile(sim, kind, at, vel, { gravity: g, target: src.target || 0, threat: th, arrive: T, src: src.id, to: tgt });
}
TC.fireRocket = fireRocket;
TC.stepProjectiles = (sim, dt) => {
  for (const pr of sim.projectiles) {
    if (pr.dead) continue;
    pr.t += dt; pr.life -= dt;
    pr.vel[2] -= pr.gravity * dt; pr.pos[0] += pr.vel[0] * dt; pr.pos[1] += pr.vel[1] * dt; pr.pos[2] += pr.vel[2] * dt;
    if (pr.kind === 'torpedo' && sim.water > -1e8) pr.pos[2] = sim.water + 1;
    if (pr.team === 'player') {
      // the player's grenade: explode on a collider, an enemy, the water or after 1.2 s
      let boom = pr.t > 1.2 || pr.pos[2] < (sim.ground || 0) - 2 || (sim.water > -1e8 && pr.pos[2] < sim.water);
      if (!boom) for (const c of sim.colliders) { if (!c.on) continue; const b = c.b; if (pr.pos[0] > b[0] && pr.pos[0] < b[3] && pr.pos[1] > b[1] && pr.pos[1] < b[4] && pr.pos[2] > b[2] && pr.pos[2] < b[5] && pr.t > .06) { boom = true; break; } }
      if (!boom) for (const e of sim.enemies) if (!e.dead && Math.hypot(e.x - pr.pos[0], e.y - pr.pos[1]) < 10 && pr.pos[2] > e.z - 2 && pr.pos[2] < e.z + 32) { boom = true; break; }
      if (!boom && sim.boss) for (const part of sim.boss.parts) if (part.alive && part.pos && vdist(part.pos, pr.pos) < part.r + 4) { boom = true; break; }
      if (boom) { pr.dead = true; explode(sim, pr.pos, tune.weapon.glRadius, tune.weapon.glDamage, { p: sim.players[pr.owner], w: 'gl', player: true }); }
      continue;
    }
    if (pr.team === 'fx') { if (pr.life <= 0) pr.dead = true; continue; }
    // enemy projectiles arrive at their target: the threat resolves there
    if (pr.threat && !pr.threat.done && pr.arrive !== undefined) pr.threat.left = pr.arrive - pr.t;
    if (pr.arrive !== undefined && pr.t >= pr.arrive) {
      pr.dead = true;
      if (pr.threat && !pr.threat.done) resolveThreat(sim, pr.threat);
      const blocked = pr.threat && !pr.threat.result;
      if (pr.kind === 'grenade' || pr.kind === 'rocket' || pr.kind === 'missile') sim.emit('explode', { at: pr.pos.slice(), size: .9, cover: blocked, p: pr.target });
      else if (pr.kind === 'flare') sim.emit('fireworks', { at: pr.pos.slice() });
      else if (pr.kind === 'torpedo') sim.emit('explode', { at: pr.pos.slice(), size: 1.2, water: true });
      else sim.emit('impact', { at: pr.pos.slice(), surf: 'metal' });
    }
    if (pr.life <= 0) pr.dead = true;
  }
  sim.projectiles = sim.projectiles.filter(p => !p.dead);
};
function damageProjectile(sim, pr, dmg, o) {
  pr.hp -= dmg; sim.emit('impact', { at: o.at, surf: 'metal' });
  if (pr.hp > 0) return;
  pr.dead = true; if (pr.threat) cancelThreat(sim, pr.threat);
  if (o.p) { sim.addScore(o.p, PROJ[pr.kind] ? PROJ[pr.kind].score || 1000 : 1000, pr.pos.slice(), 'shotdown'); sim.chainUp(o.p); }
  sim.emit('shotdown', { kind: pr.kind, at: pr.pos.slice(), p: o.p ? o.p.i : -1 });
  if (pr.kind === 'grenade' || pr.kind === 'rocket' || pr.kind === 'missile' || pr.kind === 'torpedo') explode(sim, pr.pos, 48, 3, { p: o.p, shotdown: true });
  if (pr.kind === 'flare') sim.emit('fireworks', { at: pr.pos.slice() });
  if (sim.boss && sim.boss.onShotdown) sim.boss.onShotdown(sim, pr);
}
TC.damageProjectile = damageProjectile;
// an explosion: hurts enemies (never players), boss parts, objects; chains barrels
function explode(sim, at, radius, dmg, o = {}) {
  sim.emit('explode', { at: at.slice(), size: radius / 48, player: !!o.player });
  for (const e of sim.enemies) {
    if (e.dead) continue; const d = Math.hypot(e.x - at[0], e.y - at[1], (e.z + 14) - at[2]);
    if (d < radius) { const k = lerp(1, .25, d / radius); TC.damageEnemy(sim, e, dmg * k, { p: o.p, w: o.w || 'blast', blast: true, at: [e.x, e.y, e.z + 16], dir: vnorm([e.x - at[0], e.y - at[1], 0]), part: e.A.ai === 'shield' ? 'body' : 'body' }); if (e.A.ai === 'shield') e.shieldDown = 1.5; }
  }
  if (sim.boss) for (const part of sim.boss.parts) { if (!part.alive || !part.pos || part.hidden) continue; const d = vdist(part.pos, at); if (d < radius + part.r) TC.damageBoss(sim, part, dmg * lerp(1, .3, clamp(d / (radius + part.r), 0, 1)) * (o.bossMul || 1), { p: o.p, w: 'gl', at, blast: true }); }
  for (const ob of sim.objects) { if (ob.dead || !ob.hp) continue; const d = vdist(ob.pos, at); if (d < radius && ob !== o.src) { if (ob.explosive) { ob.chainT = ob.chainT || .15; } else damageObject(sim, ob, dmg, { p: o.p, at: ob.pos, blast: true }); } }
}
TC.explode = explode;

// ---------------------------------------------------------------- objects
const OBJ = {
  barrel: { hp: 2, r: 7, h: 20, explosive: true, radius: 56, dmg: 8, score: 500 },
  tank: { hp: 2, r: 9, h: 28, explosive: true, radius: 64, dmg: 8, score: 500, white: true },
  crate: { hp: 3, r: 0, box: true, score: 50, surf: 'wood' },
  lantern: { hp: 1, r: 3.5, score: 50, fall: true },
  bottles: { hp: 1, r: 3, score: 50 },
  window: { hp: 1, r: 0, box: true, score: 50, surf: 'glass' },
  lifering: { hp: 1, r: 6, score: 2000, bonus: true },
  intel: { hp: 1, r: 3, score: 2000, bonus: true },
  lock: { hp: 6, r: 6, score: 1500, objective: true },
  fwcrate: { hp: 2, r: 7, score: 500, explosive: true, radius: 40, dmg: 4, fireworks: true },
  lever: { hp: 1, r: 8, score: 0, objective: true },
  sign: { hp: 2, r: 0, box: true, score: 50, surf: 'wood' }
};
TC.OBJ = OBJ;
function makeObject(sim, kind, at, o = {}) {
  const K = OBJ[kind]; if (!K) throw new Error('unknown object ' + kind);
  const p = sim.carrier && o.local ? sim.cw(at) : at.slice();
  const ob = Object.assign({ id: sim.nextId++, kind, K, pos: p, hp: K.hp, r: K.r, explosive: !!K.explosive, dead: false, t: 0 }, o);
  if (K.box) { const s = o.size || [16, 16, 14]; ob.box = [p[0] - s[0] / 2, p[1] - s[1] / 2, p[2], p[0] + s[0] / 2, p[1] + s[1] / 2, p[2] + s[2]]; ob.r = 1; ob.col = { id: -ob.id, b: ob.box, surf: K.surf, on: true, obj: ob.id }; if (kind === 'crate') sim.colliders.push(ob.col); }
  else if (K.r && kind !== 'lantern' && kind !== 'bottles' && kind !== 'intel' && kind !== 'lifering') ob.pos = [p[0], p[1], p[2] + (K.h || 0) * .5];
  sim.objects.push(ob); return ob;
}
TC.makeObject = makeObject;
function damageObject(sim, ob, dmg, o = {}) {
  if (ob.dead) return false;
  ob.hp -= dmg; sim.emit('impact', { at: o.at || ob.pos, surf: ob.K.surf || (ob.kind === 'lantern' ? 'paper' : ob.kind === 'bottles' || ob.kind === 'intel' ? 'glass' : 'metal') });
  if (ob.hp > 0) return !!ob.K.objective;
  breakObject(sim, ob, o);
  return !!(ob.K.bonus || ob.K.objective);
}
TC.damageObject = damageObject;
function breakObject(sim, ob, o = {}) {
  if (ob.dead) return; ob.dead = true; ob.t = 0;
  const p = o.p || sim.players[0];
  if (ob.col) { ob.col.on = false; }
  sim.emit('break', { id: ob.id, kind: ob.kind, at: ob.pos.slice(), p: p ? p.i : -1 });
  if (p && ob.K.score) sim.addScore(p, ob.K.score, ob.pos, 'object');
  if (ob.kind === 'lifering' && p) { p.lives++; sim.emit('extra', { p: p.i, ring: true }); }
  if (ob.kind === 'intel' && p) sim.emit('intel', { id: ob.intel, p: p.i });
  if (ob.explosive) { explode(sim, ob.pos, ob.K.radius, ob.K.dmg * (ob.dmgMul || 1), { p, src: ob, bossMul: ob.bossMul || 1 }); if (ob.K.fireworks) sim.emit('fireworks', { at: ob.pos.slice(), big: true }); }
  if (ob.onBreak) ob.onBreak(sim, ob);
  if (ob.cue) sim._cue(ob.cue);
}
TC.breakObject = breakObject;
TC.stepObjects = (sim, dt) => {
  for (const ob of sim.objects) {
    ob.t += dt;
    if (!ob.dead && ob.chainT !== undefined) { ob.chainT -= dt; if (ob.chainT <= 0) breakObject(sim, ob, {}); }
    if (ob.follow && !ob.dead) { const p = sim.cw(ob.follow); ob.pos = [p[0], p[1], p[2]]; }
  }
  sim.objects = sim.objects.filter(o => !(o.dead && o.t > 3));
  // civilians
  for (const c of sim.civilians) {
    if (c.dead) { c.deadT = (c.deadT || 0) + dt; continue; }
    c.t += dt;
    if (c.hostage) { if (c.freed) { c.state = 'free'; c.x += Math.cos(c.face) * 0; } c.vols = [{ part: 'body', cap: true, a: [c.x, c.y, c.z + 2], b: [c.x, c.y, c.z + 22], r: 5 }, { part: 'head', c: [c.x, c.y, c.z + 27], r: 4 }]; continue; }
    if (c.route && c.ri < c.route.length) {
      const T = c.route[c.ri], d = vsub(T, [c.x, c.y, c.z]), L = Math.hypot(d[0], d[1]), sp = (c.speed || 75) * dt;
      c.face = Math.atan2(d[1], d[0]); c.state = 'run';
      if (L <= sp) { c.x = T[0]; c.y = T[1]; c.ri++; } else { c.x += d[0] / L * sp; c.y += d[1] / L * sp; }
    } else { c.state = 'crouch'; if (c.route && c.leave && c.t > c.leave) c.gone = true; }
    const hh = c.state === 'crouch' ? 18 : 26;
    c.vols = [{ part: 'body', cap: true, a: [c.x, c.y, c.z + 2], b: [c.x, c.y, c.z + hh - 6], r: 5 }, { part: 'head', c: [c.x, c.y, c.z + hh], r: 4 }];
  }
  sim.civilians = sim.civilians.filter(c => !c.gone && !(c.dead && c.deadT > 3));
};
function spawnCivilian(sim, o) {
  const at = o.at || (o.route ? o.route[0] : [0, 0, 0]);
  const c = { id: sim.nextId++, kind: o.kind || 'festival', x: at[0], y: at[1], z: at[2], route: o.route ? o.route.slice(1) : null, ri: 0, t: 0, state: 'run', face: 0, hostage: !!o.hostage, look: o.look || 0, speed: o.speed, leave: o.leave, dead: false, captor: o.captor, line: o.line };
  sim.civilians.push(c); if (o.line) sim.say(o.line[0], o.line[1]);
  return c;
}
TC.spawnCivilian = spawnCivilian;
function hitCivilian(sim, c, p, at) {
  if (c.dead || c.hitT > sim.t) return;
  c.hitT = sim.t + .6; sim.emit('civhit', { id: c.id, p: p.i, at });
  p.stats.civ++; sim.addScore(p, -5000, at, 'civ'); sim.hurt(p, { ignoreI: true, reason: 'civilian' });
  sim.say('juno', c.hostage ? "Watch the hostage!" : "Hold your fire! Civilians!");
}
TC.hitCivilian = hitCivilian;
