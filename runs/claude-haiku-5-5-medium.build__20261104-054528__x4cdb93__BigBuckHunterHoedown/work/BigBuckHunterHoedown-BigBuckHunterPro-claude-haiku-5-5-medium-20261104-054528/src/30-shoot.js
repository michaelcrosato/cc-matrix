// ---- the rifle, the reticle, shot resolution and scoring -------------------------------------------------------------
// The pump-action: a round is chambered, you fire it, the chamber is empty until you pump (rack) the next one out of
// the tube. An empty tube is reloaded by pump (it takes TUNING.reloadTime). The scope steadies the sway.
const bus = {
  h: {},
  on(name, fn) { (this.h[name] = this.h[name] || []).push(fn); },
  emit(name, data) { for (const fn of this.h[name] || []) fn(data); },
};

const GUN = {
  x: .5, y: .5, lastPtr: null, tube: 4, chamber: 'loaded', rackT: 0, reloadT: 0, scoped: false,
  calls: 2, benched: false, sway: [0, 0], recoil: 0, popDelay: 0, ready: true,
};

function resetGun() {
  Object.assign(GUN, { x: .5, y: .5, lastPtr: null, tube: TUNING.tubeSize, chamber: 'loaded', rackT: 0, reloadT: 0,
    scoped: false, calls: TUNING.callsPerSite, benched: false, recoil: 0 });
}

// the aim point, after sway (steadied while scoped)
function aimPoint(t) {
  const k = TUNING.swayAmount * (GUN.scoped ? .25 : 1) * .014;
  return [GUN.x + Math.sin(t * .9) * k + Math.sin(t * 2.3) * k * .4, GUN.y + Math.cos(t * 1.1) * k * .8 + Math.sin(t * 2.9) * k * .3];
}

// the reticle follows the mouse when it moves, else the keys and the stick (input.move())
function steerGun(I, dt, W, H, t) {
  const p = I.pointer ? I.pointer() : null;
  if (p) {
    if (GUN.lastPtr && (Math.abs(p[0] - GUN.lastPtr[0]) + Math.abs(p[1] - GUN.lastPtr[1])) > 1) {
      GUN.x = clampN(p[0] / W, 0, 1); GUN.y = clampN(p[1] / H, 0, 1);
    }
    GUN.lastPtr = p.slice();
  }
  const m = I.move();
  if (m[0] || m[1]) {
    const s = .55 * TUNING.reticleSpeed * dt;
    GUN.x = clampN(GUN.x + m[0] * s, 0, 1);
    GUN.y = clampN(GUN.y + m[1] * s * 1.1, .02, .98);
  }
  GUN.scoped = !!(I.down('scope'));
}

// the gun's timers: racking and reloading finish on their own
function updateGun(dt) {
  if (GUN.rackT > 0) { GUN.rackT -= dt; if (GUN.rackT <= 0) GUN.chamber = 'loaded'; }
  if (GUN.reloadT > 0) { GUN.reloadT -= dt; if (GUN.reloadT <= 0) GUN.tube = TUNING.tubeSize; }
  GUN.recoil = Math.max(0, GUN.recoil - dt * 4);
  if (DEV.infiniteShells) GUN.tube = TUNING.tubeSize;
}

// pump: rack the next round (tube -> chamber), or reload an empty tube. Returns what happened.
function pumpGun() {
  if (GUN.chamber === 'loaded' || GUN.rackT > 0 || GUN.reloadT > 0) return 'busy';
  if (GUN.tube > 0 || DEV.infiniteShells) {
    if (!DEV.infiniteShells) GUN.tube -= 1;
    GUN.rackT = .32; GUN.chamber = 'racking';
    bus.emit('pump', {});
    return 'rack';
  }
  GUN.reloadT = TUNING.reloadTime;
  bus.emit('reload', {});
  return 'reload';
}

// what a shot at box (u, v) of an animal hits, in the body's own frame
function zoneAt(sp, u, v, dir) {
  const uu = dir >= 0 ? u : 1 - u;
  for (const z of zonesFor(sp.zone)) {
    if (uu >= z.u[0] && uu <= z.u[1] && v >= z.v[0] && v <= z.v[1]) return z;
  }
  return { id: 'body', mult: .8, kill: sp.zone === 'small' };
}

// the normalized box of a live animal (the same shape paintAnimal draws)
function boxOf(a, H, W) {
  const sp = SPECIES[a.species];
  const bw = a.hn * sp.aspect * (H / W);
  return { x0: a.x - bw / 2, x1: a.x + bw / 2, y0: a.fy - a.hn * (1 - a.fall * .4) , y1: a.fy, bw, bh: a.hn };
}

// the points for a finished animal. Distance counts (far is worth more), running shots pay more, and it all scales
// with the zone and the dev multiplier.
function pointsFor(a, zone, running) {
  const sp = SPECIES[a.species];
  const base = sp.base + (sp.antlerPts ? a.antlers * 40 : 0) + (a.trophy ? 2000 : 0);
  const dist = 1 + 1.4 * (1 - a.d);
  const run = running ? 1.6 : 1;
  return base * dist * zone.mult * run * TUNING.pointsMult;
}

// the live animal under a point (nearest on top), or null
function targetUnder(ax, ay, W, H) {
  let target = null;
  for (const a of LIVE) {
    if (a.dead || a.state === 'down') continue;
    if (a.pop != null && a.pop < .6) continue;   // a snowman that is down cannot be hit
    const b = boxOf(a, H, W);
    if (ax >= b.x0 && ax <= b.x1 && ay >= b.y0 && ay <= b.y1 && (!target || a.fy > target.fy)) target = a;
  }
  return target;
}

// fire at the aim point. The first live animal under it (nearest on top) takes the hit
function fireGun(site, t, W, H) {
  if (GUN.benched || site.over) return null;
  if (GUN.chamber !== 'loaded') return { ok: false, why: GUN.chamber === 'racking' ? 'racking' : 'pump' };
  if (!DEV.infiniteShells && GUN.tube < 0) return null;
  const [ax, ay] = aimPoint(t);
  GUN.chamber = 'empty';
  GUN.recoil = 1;
  site.shots += 1;
  const target = targetUnder(ax, ay, W, H);
  const bus_ = bus;
  if (!target) {
    site.misses += 1;
    spookNear(ax, ay, TUNING.spookRange);
    site.log.push({ x: ax, y: ay, hit: false, zone: 'miss', species: null, at: t });
    bus_.emit('miss', { x: ax, y: ay });
    return { ok: true, hit: false, x: ax, y: ay };
  }
  const sp = SPECIES[target.species], b = boxOf(target, H, W);
  const u = (ax - b.x0) / b.bw, v = (ay - b.y0) / b.bh;
  const zone = zoneAt(sp, u, v, target.dir);
  const running = target.state === 'bolt';
  const result = { ok: true, hit: true, x: ax, y: ay, zone: zone.id, species: target.species, animal: target, u, v };
  site.shots_hit = (site.shots_hit || 0) + 1;
  const uBody = target.dir >= 0 ? u : 1 - u;
  site.log.push({ x: ax, y: ay, hit: true, zone: zone.id, species: target.species, u: uBody, v, at: t });

  if (sp.sex === 'critter') {
    if (sp.protected || sp.stinks) {
      site.points += sp.base * TUNING.pointsMult;
      site.penalties += 1;
      result.penalty = true;
    } else {
      const pts = pointsFor(target, zone, running);
      site.points += pts;
      result.points = pts;
    }
    if (sp.stinks) spookNear(0, 0, 2, true);
    knockDown(target);
    bus_.emit('critter', { animal: target, species: target.species, points: result.points || 0, penalty: !!result.penalty, x: ax, y: ay });
    puff(ax, ay, '#c8b898', 10, .2);
    return result;
  }

  if (sp.sex === 'doe') {
    site.doeShot = true;
    site.doeShots = (site.doeShots || 0) + 1;
    if (TUNING.doeRule === 0) { GUN.benched = true; site.benched = true; }
    else { site.points -= 400 * TUNING.pointsMult; }
    knockDown(target);
    site.penalties += 1;
    bus_.emit('doe', { animal: target, x: ax, y: ay, benched: GUN.benched });
    puff(ax, ay, '#d6c3a0', 12, .25);
    return result;
  }

  // a buck, bull or moose
  if (zone.kill) {
    const pts = pointsFor(target, zone, running);
    knockDown(target);
    site.points += pts; site.bagged += 1;
    if (target.trophy) site.trophyDown = true;
    result.points = pts; result.kill = true;
    bus_.emit('kill', { animal: target, zone: zone.id, points: pts, x: ax, y: ay, trophy: target.trophy });
    puff(ax, ay, '#a04a20', 14, .3);
  } else if (target.wounded) {
    // the second hit on a wounded animal is a kill, at a lower value
    const pts = pointsFor(target, { mult: zone.mult * .6 }, running);
    knockDown(target);
    site.points += pts; site.bagged += 1;
    result.points = pts; result.kill = true; result.finished = true;
    bus_.emit('kill', { animal: target, zone: zone.id, points: pts, x: ax, y: ay, trophy: target.trophy, finished: true });
    puff(ax, ay, '#a04a20', 14, .3);
  } else {
    target.wounded = true;
    doSpook(target, 'shot');
    target.state = 'bolt'; target.stateT = 4;
    result.wound = true;
    bus_.emit('wound', { animal: target, zone: zone.id, x: ax, y: ay });
    puff(ax, ay, '#8a3a1a', 8, .2);
  }
  // the report startles the others close by
  spookNear(target.x, target.fy, TUNING.spookRange);
  return result;
}

function newSiteStats(name) {
  return { name, shots: 0, shots_hit: 0, misses: 0, bagged: 0, points: 0, penalties: 0, doeShot: false, doeShots: 0,
    benched: false, log: [], trophyDown: false, bucksWanted: 0, objective: '' };
}
