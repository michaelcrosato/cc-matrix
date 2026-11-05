// Destructibles and cover (7.12), pickups and the supply director (7.13).
(() => {
const E = My3D2dge, WP = globalThis.WP, BEH = WP.BEH, { clamp } = WP;
WP.TYPES.pickup = { id: 'pickup', kind: 'pickup', hp: 1 };

// ---------- props ----------
BEH['init:prop'] = (sim, e, o) => { e.beh = 'prop'; e.st = 'idle'; e.offOK = true; if (e.type === 'searchlight') { e.sweep = o.sweep || [-120, 120]; e.phase = o.phase || 0; e.speedS = o.speedS || .35; } };
BEH.prop = (sim, e, dt) => {
  if (e.type === 'searchlight' && !e.dead) {
    // the beam sweeps an ellipse on the ground; crossing the camera: SPOTTED for 3 s
    const P = sim.view.P, a = Math.sin(e.t * e.speedS + e.phase);
    const lx = (e.sweep[0] + e.sweep[1]) / 2 + a * (e.sweep[1] - e.sweep[0]) / 2, dz = 20 + (1 + Math.cos(e.t * e.speedS * .7 + e.phase)) * 90;
    const w = sim.view.toWorld(lx, dz); e.beam = [w[0], w[1]]; e.beamLx = lx; e.beamDz = dz;
    if (Math.abs(lx) < 50 && dz < 40 && sim.state === 'play') { if (sim.spotted <= 0) { sim.ev('spotted', { id: e.id }); } sim.spotted = 3; }
  }
  if (e.topple !== undefined && e.topple < 1) e.topple = Math.min(1, e.topple + dt / 1.2);
};
BEH['shapes:prop'] = (sim, e, out, V) => {
  const tp = WP.TYPES[e.type]; if (e.gone) return;
  if (e.dead || e.fallen) return;
  const D = V.depth(e.x, e.y); if (D < 14) return;
  if (e.type === 'mast') {   // the junction box at its foot
    const p = V.project(e.x, e.y, 8); if (!p) return;
    out.push({ e, part: 'box', D, kind: 'r', x0: p[0] - Math.max(4, 7 * p[2]), x1: p[0] + Math.max(4, 7 * p[2]), y0: p[1] - Math.max(5, 8 * p[2]), y1: p[1] + Math.max(5, 8 * p[2]) }); return;
  }
  if (e.type === 'searchlight') { const p = V.project(e.x, e.y, e.z + 4); if (p) out.push({ e, part: 'light', D: D - 1, kind: 'c', cx: p[0], cy: p[1], r: Math.max(4, 5 * p[2]) }); return; }
  if (e.type === 'rope') { const p = V.project(e.x, e.y, e.z); if (p) out.push({ e, part: 'rope', D, kind: 'r', x0: p[0] - Math.max(3, 3 * p[2]), x1: p[0] + Math.max(3, 3 * p[2]), y0: p[1] - Math.max(8, 14 * p[2]), y1: p[1] }); return; }
  let box = tp.box;
  if (e.type === 'sandbags') { const k = e.hp / e.maxHp; box = [box[0] * (e.size || 1), box[1], box[2] * (k > .66 ? 1 : k > .33 ? .8 : .6)]; }
  else if (e.size) box = [box[0] * e.size, box[1] * e.size, box[2] * e.size];
  const s = WP.Hit.boxPoly(V, e.x, e.y, e.z, box, e.facing === undefined ? Math.PI / 2 : e.facing, tp.sc); if (!s) return;
  s.e = e; s.part = 'prop'; s.D = D; s.cover = !!tp.cover; out.push(s);
};
/** damage to a prop (a bullet, a blast); destroyed at 0 HP */
WP.propHit = (sim, e, dmg, p, how = 'shot') => {
  const tp = WP.TYPES[e.type]; if (e.dead || tp.hp >= 9999) { if (tp.hp >= 9999) sim.ev('ping', { id: e.id }); return; }
  if (how === 'blast' && tp.grenadeDmg) dmg = tp.grenadeDmg;
  e.hp -= dmg; e.hitT = .08;
  if (e.hp > 0) { sim.ev('propHit', { id: e.id, mat: tp.mat }); return; }
  e.dead = true; e.hp = 0;
  sim.ev('propDown', { id: e.id, type: e.type, x: e.x, y: e.y, z: e.z, by: p ? p.pid : -1 });
  if (tp.blast) {
    const z = e.z + (tp.box[2] || 10) * .5;
    sim.after(how === 'blast' ? .12 : .02, () => sim.explode(e.x, e.y, z, tp.blast.r, tp.blast.dmg, { by: p ? p.pid : null, kind: e.type, skip: e }));
    if (sim.stage.n === 1 && e.type === 'barrel') sim.tip('tip.barrel');
    e.fadeAt = .1;
  }
  if (e.type === 'crate' || e.type === 'ammoCrate') {
    if (e.dropKind) WP.Supply.drop(sim, e.x, e.y, e.z + 12, e.dropKind, p);
    else WP.Supply.crate(sim, e, p);
    e.fadeAt = .05;
  }
  if (e.type === 'mast') { e.topple = 0; e.dead = false; e.fallen = true; e.hp = 0; if (sim.objective) { sim.objective.done++; sim.ev('objective', { done: sim.objective.done, need: sim.objective.need }); } if (p) sim.score(p, 2000, { x: e.x, y: e.y, z: 60 }, { raw: true }); e.shapeless = true; }
  if (e.type === 'searchlight') { e.out = true; if (p) sim.score(p, 200, { x: e.x, y: e.y, z: e.z }, { raw: true }); }
  if (e.type === 'rope' && e.onBreak) e.onBreak(sim, e, p);
  if (e.type === 'shutter') { e.open = true; }
  if (e.type === 'sandbags') { e.fadeAt = .3; }
};
BEH['dead:prop'] = (sim, e, dt) => { if (e.fadeAt !== undefined && e.stt > e.fadeAt && e.type !== 'searchlight' && e.type !== 'mast') e.gone = true; };

// ---------- pickups ----------
BEH['init:pickup'] = (sim, e, o) => { e.beh = 'pickup'; e.offOK = true; e.vz = o.chute ? 0 : 90; e.bounces = 0; e.life = o.chute ? 30 : 6; e.chute = !!o.chute; e.floorZ = o.floorZ || 0; };
BEH.pickup = (sim, e, dt) => {
  if (e.chute) { e.z = Math.max(e.floorZ, e.z - 25 * dt); e.x += Math.sin(e.t * 1.4) * 5 * dt; if (e.z <= e.floorZ) { e.chute = false; e.life = 6; e.t = 0; } }
  else if (e.bounces < 2 || e.z > e.floorZ + 8) {
    e.vz -= 400 * dt; e.z += e.vz * dt;
    if (e.z <= e.floorZ) { e.z = e.floorZ; e.bounces++; e.vz = e.bounces === 1 ? 70 : e.bounces === 2 ? 35 : 0; if (e.bounces >= 2) e.vz = 0; }
  } else { e.z = e.floorZ + 8 + Math.sin(e.t * 4) * 1.5; }
  if (e.bounces >= 2 && !e.hover) { e.hover = true; e.z = Math.max(e.z, e.floorZ + 8); }
  if (e.t > e.life) { e.gone = true; sim.ev('pickupGone', { id: e.id }); }
};
BEH['shapes:pickup'] = (sim, e, out, V) => {
  const p = V.project(e.x, e.y, e.z); if (!p) return;
  const D = V.depth(e.x, e.y);
  out.push({ e, part: 'pickup', D: D - 3, kind: 'c', cx: p[0], cy: p[1] - 4 * p[2], r: Math.max(6, 7 * p[2]) });
};
const full = () => Math.round(WP.T.magSize);
/** a player shot a pickup: they get it */
WP.collect = (sim, e, p) => {
  if (e.gone || !p) return;
  e.gone = true; const k = e.ptype, W = WP.T, lim = (sim.perks.suppliesSeized ? 11 : W.maxMags) - 1;
  sim.ev('pickup', { id: e.id, pid: p.pid, kind: k, x: e.x, y: e.y, z: e.z });
  if (k === 'mag') { if (p.spares.length < lim) p.spares.push(full()); else sim.score(p, 300, e, { raw: true }); }
  else if (k === 'crate') { for (let i = 0; i < 3; i++) if (p.spares.length < lim) p.spares.push(full()); }
  else if (k === 'gren') p.grenades = Math.min(W.maxGrenades, p.grenades + 1);
  else if (k === 'gbox') p.grenades = Math.min(W.maxGrenades, p.grenades + 3);
  else if (k === 'ration') sim.heal(p, 15);
  else if (k === 'medkit') sim.heal(p, 35);
  else if (k === 'fury') { p.fury = 10; sim.ev('fury', { pid: p.pid }); }
  else if (k === 'dynamite') WP.Supply.dynamite(sim, p);
  else if (k === 'flare') { sim.flare = 12; sim.ev('flare', {}); }
  else if (k === 'intel') sim.score(p, 1500, e, { raw: true });
  else if (k === 'fang') sim.score(p, 500, e, { raw: true });
  sim.ev('points', { pid: p.pid, v: 0, label: WP.PICKUPS[k].name, x: e.x, y: e.y, z: e.z + 10 });
};

// ---------- the supply director (deterministic: the loot stream) ----------
const Supply = WP.Supply = {
  drop(sim, x, y, z, kind, p) {
    if (kind === 'auto') kind = Supply.pick(sim);
    if (!kind) return null;
    const e = sim.spawn('pickup', { x, y, z: Math.max(z, 4) }); e.ptype = kind;
    if (kind === 'fury') sim.flags.furyBeat = sim.beats.filter(b => b.fired).length;
    return e;
  },
  chute(sim, x, y, z, kind) { const e = sim.spawn('pickup', { x, y, z, chute: true }); e.ptype = kind; sim.ev('chute', { id: e.id, kind }); return e; },
  /** need-weighted choice: low ammo -> MAG x3, no grenades -> GRENADE x2, hurt -> RATION/MEDKIT x2 */
  pick(sim) {
    const live = sim.livePlayers(); if (!live.length) return 'mag';
    const low = Math.min(...live.map(p => p.mag + p.spares.reduce((a, b) => a + b, 0)));
    const gren = Math.min(...live.map(p => p.grenades)), hurt = Math.max(...live.map(p => p.damage));
    const w = { mag: 50, gren: 20, ration: 15, gbox: 4, medkit: 3 * (sim.perks.villageLiberated ? 2 : 1), crate: 4, fury: 2 };
    if (low < 60) w.mag *= 3; if (gren === 0) w.gren *= 2; if (hurt > 60) { w.ration *= 2; w.medkit *= 2; }
    const fired = sim.beats.filter(b => b.fired).length; if (sim.flags.furyBeat === fired) w.fury = 0;
    let tot = 0; for (const k in w) tot += w[k];
    let r = sim.R.loot() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'mag';
  },
  crate(sim, e, p) {
    const tp = WP.TYPES[e.type];
    if (tp.ammo) { const r = sim.R.loot(); Supply.drop(sim, e.x, e.y, e.z + 12, r < .5 ? 'mag' : r < .7 ? 'crate' : r < .9 ? 'gren' : 'gbox', p); return; }
    if (sim.R.loot() < Math.min(1, tp.drop * sim.dropK)) Supply.drop(sim, e.x, e.y, e.z + 12, 'auto', p);
    else sim.ev('empty', { id: e.id });
  },
  /** DYNAMITE: a screen-wide blast */
  dynamite(sim, p) {
    sim.ev('dynamite', { pid: p ? p.pid : -1 });
    const V = sim.view;
    for (const e of sim.ents) {
      if (e.dead || e.gone) continue;
      const tp = WP.TYPES[e.type], pr = V.project(e.x, e.y, e.z), on = pr && pr[0] > -10 && pr[0] < WP.W + 10 && pr[1] > -40 && V.depth(e.x, e.y) > 14;
      if (!on) continue;
      if (tp.kind === 'infantry') sim.kill(e, p ? p.pid : null, 'body', 'blast');
      else if (tp.kind === 'vehicle' || tp.kind === 'air' || tp.kind === 'boat') { if (!tp.scenery && !tp.friendly) { e.hp -= 30; if (e.hp <= 0) sim.kill(e, p ? p.pid : null, 'hull', 'blast'); } }
      else if (tp.kind === 'boss') WP.Bosses.blast(sim, e, 30, p);
      else if (tp.kind === 'civ') WP.civHit(sim, e, p, 'blast');
      else if (tp.kind === 'hostage') WP.hostageHit(sim, e, p, 1);
      else if (tp.kind === 'animal') WP.animalHit(sim, e, p);
      else if (tp.kind === 'proj') { if (WP.PROJ[e.ptype].hits) WP.Proj.hit(sim, e, p, 99); }
      else if (tp.kind === 'prop') WP.propHit(sim, e, 30, p, 'blast');
    }
  },
  step(sim, dt) {
    if (sim.state !== 'play' && sim.state !== 'boss') return;
    const W = WP.T;
    for (const p of sim.players) {
      if (p.down || p.gone) continue;
      if (sim.cheats.ammo || p.infAmmo) continue;
      const dry = p.mag === 0 && p.spares.length === 0 && p.grenades === 0 && p.reloadT <= 0 && p.fury <= 0;
      if (dry) {
        p.dryT += dt;
        if (sim.diff.dry === 'down' && p.dryT > .5) { sim.ev('dry', { pid: p.pid }); sim.downPlayer(p, 'dry'); continue; }
        if (sim.diff.dry === 'refill' && p.dryT > 3 && !p.refilled) { p.refilled = true; p.mag = 15; sim.ev('refill', { pid: p.pid }); }
        if (p.dryT > 1 && sim.t - p.emergT > 30 && !p.emergPending) {
          p.emergPending = true; p.emergT = sim.t; sim.ev('emergency', { pid: p.pid }); sim.radio('emergency');
          sim.after(3, () => { p.emergPending = false; if (p.down) return; for (let i = 0; i < 2; i++) p.spares.push(Math.round(W.magSize)); p.score = Math.max(0, p.score - 2000); sim.ev('resupply', { pid: p.pid }); sim.ev('points', { pid: p.pid, v: -2000, label: 'RESUPPLY FEE', x: sim.view.P.x, y: sim.view.P.y - 80, z: 40 }); });
        }
      } else { p.dryT = 0; if (p.mag > 0 && p.spares.length) p.refilled = false; }
      // a supply parachute when no magazines and no grenades are left
      if (p.spares.length === 0 && p.grenades === 0 && p.mag < 15 && sim.t - (sim.chuteT || -99) > 20) {
        sim.chuteT = sim.t; const w = sim.view.toWorld((sim.R.loot() - .5) * 100, 150 + sim.R.loot() * 60);
        sim.after(1.5, () => Supply.chute(sim, w[0], w[1], 140, 'crate'));
        if (sim.stage.n === 1 || !sim.radioSeen['tip.noammo']) sim.tip('tip.noammo');
      }
    }
  }
};
})();
