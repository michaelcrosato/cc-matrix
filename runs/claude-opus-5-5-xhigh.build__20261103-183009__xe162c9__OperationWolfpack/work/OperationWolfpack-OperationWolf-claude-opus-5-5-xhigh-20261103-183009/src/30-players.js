// Players in the Sim: the WOLF-9 SMG (7.4), grenades and explosions on things (7.5), shot resolution -> damage,
// score and events. Crosshairs arrive in InputFrames (35-input.js turns devices, the bot or the network into them).
(() => {
const E = My3D2dge, WP = globalThis.WP, BEH = WP.BEH, { clamp } = WP;

const Players = WP.Players = {
  make(sim, p, slot, lo) {
    const W = WP.T, mags = Math.max(1, Math.round(W.startMags)), full = Math.round(W.magSize);
    const starts = [[.42, .55], [.58, .55], [.3, .55], [.7, .55]][slot % 4];
    return {
      pid: p.pid === undefined ? slot : p.pid, slot, name: p.name || WP.CALLSIGNS[slot % 4], color: p.color || WP.SEATS[slot % 4],
      x: WP.W * starts[0], y: WP.PLAY_H * starts[1],
      damage: lo ? lo.damage : 0, mag: lo ? lo.mag : full, spares: lo ? lo.spares.slice() : Array(mags - 1).fill(full), grenades: lo ? lo.grenades : Math.round(W.startGrenades),
      score: lo ? lo.score : 0, streak: 0, streakT: 0, kills: 0, shots: 0, hits: 0, headshots: 0, intercepts: 0, civHits: 0,
      down: !!(lo && lo.down), gone: false, fury: 0, reloadT: 0, reloadFrom: 0, fireT: 0, wasFire: false, bloom: 0, grenadeCd: 0, dryT: 0, emergT: -99, autoT: 0, hurtT: 0, clickT: 0, god: false, infAmmo: false, infGren: false, oneHit: false, net: !!p.net
    };
  },
  loadout(p) { return { damage: p.damage, mag: p.mag, spares: p.spares.slice(), grenades: p.grenades, score: p.score }; },
  step(sim, dt, frames) {
    for (const p of sim.players) {
      if (p.gone) continue;
      const f = frames[p.pid];
      if (f) { p.x = clamp(f.x, 0, WP.W - 1); p.y = clamp(f.y, 0, WP.PLAY_H - 1); p.device = f.device; }
      if (p.hurtT > 0) p.hurtT -= dt;
      if (p.down) { p.wasFire = false; continue; }
      if (p.streak > 0) { p.streakT -= dt; if (p.streakT <= 0) sim.streakReset(p); }
      if (p.fury > 0) { p.fury = Math.max(0, p.fury - dt); if (p.fury === 0) sim.ev('furyEnd', { pid: p.pid }); }
      p.bloom = Math.max(0, p.bloom - WP.T.bloomRecover * dt);
      if (p.grenadeCd > 0) p.grenadeCd -= dt;
      if (p.clickT > 0) p.clickT -= dt;
      const inf = sim.cheats.ammo || p.infAmmo;
      // reload
      if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) Players.finishReload(sim, p); }
      else if (p.mag === 0 && p.fury <= 0) {
        if (inf) p.mag = Math.round(WP.T.magSize);
        else if (p.spares.length) { p.autoT += dt; if (p.autoT >= .12) Players.startReload(sim, p, true); }
      }
      if (f && f.reload && p.reloadT <= 0 && p.mag < Math.round(WP.T.magSize) && (p.spares.length || inf)) Players.startReload(sim, p, false);
      if (p.mag < Math.round(WP.T.magSize) * .3 && p.spares.length && sim.stage.n === 1 && p.mag < 10) sim.tip('tip.reload');
      // fire: the first round on the press step, the rest on a fixed interval
      const fire = !!(f && f.fire), rate = WP.T.fireRate * (p.fury > 0 ? 2 : 1), iv = 1 / rate;
      if (fire && p.reloadT <= 0) {
        if (!p.wasFire) { Players.shoot(sim, p); p.fireT = iv; }
        else { p.fireT -= dt; let guard = 0; while (p.fireT <= 0 && guard++ < 8) { Players.shoot(sim, p); p.fireT += iv; } }
      } else if (fire && p.reloadT > 0 && !p.wasFire) sim.ev('dryClick', { pid: p.pid });
      p.wasFire = fire;
      // grenades
      if (f && f.grenade && p.grenadeCd <= 0) {
        if (p.grenades > 0 || sim.cheats.grenades || p.infGren) Players.throwGrenade(sim, p);
        else sim.ev('noGrenade', { pid: p.pid });
      }
    }
  },
  startReload(sim, p, auto) {
    if (!p.spares.length && !(sim.cheats.ammo || p.infAmmo)) return;
    p.reloadT = WP.T.reloadTime; p.reloadT0 = p.reloadT; p.autoT = 0; sim.ev('reload', { pid: p.pid, auto });
  },
  finishReload(sim, p) {
    p.reloadT = 0;
    if (sim.cheats.ammo || p.infAmmo) { p.mag = Math.round(WP.T.magSize); sim.ev('reloaded', { pid: p.pid }); return; }
    if (p.mag > 0) p.spares.push(p.mag);
    let bi = 0; for (let i = 1; i < p.spares.length; i++) if (p.spares[i] > p.spares[bi]) bi = i;
    p.mag = p.spares.length ? p.spares.splice(bi, 1)[0] : 0;
    p.spares.sort((a, b) => b - a);
    sim.ev('reloaded', { pid: p.pid });
  },
  shoot(sim, p) {
    if (p.fury <= 0 && !(sim.cheats.ammo || p.infAmmo)) {
      if (p.mag <= 0) { if (p.clickT <= 0) { sim.ev('dryClick', { pid: p.pid }); p.clickT = .25; } return; }
      p.mag--;
    }
    p.shots++;
    const R = sim.R.sim, rad = WP.T.spreadBase + p.bloom, a = R() * Math.PI * 2, rr = Math.sqrt(R()) * rad;
    const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr;
    p.bloom = Math.min(WP.T.bloomMax, p.bloom + WP.T.bloomPerShot);
    const s = sim.pick(x, y, null);
    const dmg = Players.dmg(sim, p);
    let D = 0, what = 'floor', mat = 'dirt';
    if (s) { D = s.D; const r = Players.applyHit(sim, p, s, dmg); what = r.what; mat = r.mat; }
    let w;
    if (s) w = sim.view.atDepth(x, y, D);
    else { const fl = sim.view.toFloor(x, y); if (fl) { w = [fl[0], fl[1], 0]; D = sim.view.depth(fl[0], fl[1]); } else { w = null; what = 'sky'; } }
    if (w) WP.noise(sim, w[0], w[1]);
    sim.ev('shot', { pid: p.pid, sx: x, sy: y, what, mat, D, x: w ? w[0] : 0, y: w ? w[1] : 0, z: w ? w[2] : 0, part: s ? s.part : null, id: s ? s.e.id : 0, fury: p.fury > 0 });
  },
  dmg(sim, p) { return p.oneHit || sim.cheats.oneHit ? 999 : WP.T.bulletDmg * (p.fury > 0 ? 1.5 : 1); },
  /** a bullet on the shape s (this step's, or one a hub client reported): damage, score, penalties, the accuracy stat */
  applyHit(sim, p, s, dmg) {
    const e = s.e, tp = WP.TYPES[e.type], k = tp.kind;
    let what = k, hostile = false;
    const mat = tp.mat || (k === 'infantry' || k === 'civ' || k === 'hostage' || k === 'animal' ? 'flesh' : k === 'pickup' ? 'pickup' : 'metal');
    if (s.cover) { what = 'cover'; if (k === 'prop') WP.propHit(sim, e, dmg, p, 'shot'); hostile = k === 'prop'; }
    else if (k === 'infantry') { hostile = true; Players.hitInfantry(sim, e, s.part, dmg, p); }
    else if (k === 'vehicle' || k === 'boat' || k === 'air') { hostile = !tp.friendly; if (!tp.friendly) WP.vehicleHit(sim, e, s.part, s.pp, dmg, p); }
    else if (k === 'boss') { hostile = true; WP.Bosses.hit(sim, e, s, dmg, p); }
    else if (k === 'civ') WP.civHit(sim, e, p, 'shot');
    else if (k === 'hostage') WP.hostageHit(sim, e, p, 1);
    else if (k === 'animal') { WP.animalHit(sim, e, p); hostile = true; }
    else if (k === 'proj') { hostile = true; WP.Proj.hit(sim, e, p, dmg); }
    else if (k === 'pickup') { hostile = true; WP.collect(sim, e, p); }
    else if (k === 'prop') { hostile = true; WP.propHit(sim, e, dmg, p, 'shot'); }
    if (hostile) p.hits++;
    return { what, mat };
  },
  hitInfantry(sim, e, part, dmg, p) {
    const tp = WP.TYPES[e.type];
    if (part === 'chute') { e.chute = false; e.chuteBy = p.pid; e.vz = -40; sim.ev('chuteCut', { id: e.id }); return; }
    const d = part === 'head' ? dmg * (tp.headMul || 2) : part === 'legs' ? dmg * .8 : dmg;
    e.hp -= d;
    if (e.hp <= 0) sim.kill(e, p.pid, part, 'shot');
    else { BEH['hurt:infantry'](sim, e); sim.ev('hurt', { id: e.id, part }); if (part === 'head' && sim.stage.n === 1 && tp.hp > 4) sim.tip('tip.headshot'); else if (tp.hp > 4) sim.tip('tip.headshot'); }
  },
  /** at the entity under the crosshair (its 3D point: helicopters air-burst) within range, else the floor under it */
  throwGrenade(sim, p) {
    const V = sim.view, W = WP.T, R = W.grenadeRange;
    let target = null;
    const s = sim.pick(p.x, p.y, q => !q.cover && WP.TYPES[q.e.type].kind !== 'pickup' && WP.TYPES[q.e.type].kind !== 'proj');
    if (s && s.D <= R) { const w = V.atDepth(p.x, p.y, s.D); target = w; }
    if (!target) {
      const fl = V.toFloor(p.x, p.y);
      if (fl) { let D = V.depth(fl[0], fl[1]); if (D > R) { const w = V.atDepth(p.x, p.y, R); target = [w[0], w[1], Math.max(0, w[2])]; } else target = [fl[0], fl[1], 0]; }
      else { const w = V.atDepth(p.x, p.y, R * .8); target = [w[0], w[1], Math.max(0, w[2])]; }
    }
    if (!(sim.cheats.grenades || p.infGren)) p.grenades--;
    p.grenadeCd = .5;
    WP.Proj.throwPlayer(sim, p, target);
  },
  add(sim, info, lo) {
    const slot = sim.players.length, p = Players.make(sim, info, slot, lo); sim.players.push(p); sim.coop = 1 + .3 * (sim.players.filter(q => !q.gone).length - 1); sim.ev('join', { pid: p.pid }); return p;
  }
};

// ---------- a blast on anything (sim.explode calls it) ----------
BEH.blastHit = (sim, e, d, p, o) => {
  const tp = WP.TYPES[e.type], k = tp.kind;
  if (k === 'infantry') {
    if (e.type === 'brute' || e.type === 'dummy') { e.hp -= d; if (e.hp <= 0) sim.kill(e, p ? p.pid : null, 'body', 'blast'); else { e.stun = 1; e.atk = null; } }
    else { sim.kill(e, p ? p.pid : null, 'body', 'blast'); e.blown = 1; }
  } else if (k === 'vehicle' || k === 'boat' || k === 'air') {
    if (tp.scenery || tp.friendly) return;
    for (const q of e.parts || []) if (!q.dead && q.kind === 'gunner') { q.dead = true; q.atk = null; sim.ev('partDown', { id: e.id, part: q.name, kind: 'gunner', x: q.x, y: q.y, z: q.z }); if (p) { p.kills++; sim.streakUp(p); } }
    e.hp -= d; if (e.hp <= 0) sim.kill(e, p ? p.pid : null, 'hull', 'blast');
  } else if (k === 'boss') { if (o.at && e.type === 'ironHog') WP.Bosses.blastAt(sim, e, o.at[0], o.at[1], o.at[2], d, p); else WP.Bosses.blast(sim, e, d, p, o.at); }
  else if (k === 'civ') { if (o.kind !== 'cam') WP.civHit(sim, e, p, 'blast'); }
  else if (k === 'hostage') { if (o.kind !== 'cam') WP.hostageHit(sim, e, p, 1); }
  else if (k === 'animal') WP.animalHit(sim, e, p);
  else if (k === 'prop') WP.propHit(sim, e, d, p, 'blast');
  else if (k === 'proj') { if (e.type === 'proj' && WP.PROJ[e.ptype].hits) WP.Proj.hit(sim, e, p, 99); }
};
})();
