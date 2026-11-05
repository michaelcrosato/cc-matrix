// 42-shot: a shot is a ray through the player's (swayed) aim point: the nearest of the animals (their zones), critters,
// trunks and stones, the ground and the water takes it. On an animal the zone that scores is the best one the round
// crossed; a doe in front of a buck takes the shot. Every shot is heard.
const ZONES = {
  heart: { dmg: 9, lethal: true, mult: () => T('heartMult'), call: 'HEART SHOT!', pri: 9, label: 'HEART' },
  head: { dmg: 9, lethal: true, mult: () => T('headMult'), call: 'HEADSHOT!', pri: 8, label: 'HEAD' },
  lung: { dmg: 9, lethal: true, mult: () => T('lungMult'), call: 'LUNG SHOT!', pri: 7, label: 'LUNG' },
  neck: { dmg: 9, lethal: true, mult: () => 1.4, call: 'NECK SHOT!', pri: 6, label: 'NECK' },
  shoulder: { dmg: 9, lethal: true, mult: () => 1.2, call: 'SHOULDER!', pri: 5, label: 'SHOULDER' },
  gut: { dmg: .6, lethal: false, mult: () => .7, call: 'GUT SHOT', pri: 4, label: 'GUT' },
  ham: { dmg: .5, lethal: false, mult: () => .6, call: 'HAM HIT', pri: 3, label: 'HAM' },
  leg: { dmg: .4, lethal: false, mult: () => .5, call: 'LEG HIT', pri: 2, label: 'LEG' },
  antler: { dmg: 0, lethal: false, mult: () => 0, call: 'ANTLER PING!', pri: 1, label: 'ANTLER' },
  body: { dmg: 9, lethal: true, mult: () => 1, pri: 5, label: 'BODY' }
};
/** the volumes of a zone list a ray crosses on one target: [{ id, t }] */
function rayZones(o, d, zones, pad = 0) {
  const out = [];
  // (legs are drawn at least a pixel or so wide however far off, so their zones never get thinner than that either)
  for (const z of zones) { const t = z.kind === 'sphere' ? raySphere(o, d, z.a, z.r + pad) : z.kind === 'ell' ? rayEllipsoid(o, d, z.c, z.ax, pad ? z.rad.map(r => r + pad) : z.rad) : rayCapsule(o, d, z.a, z.b, z.id === 'leg' ? Math.max(z.r + pad, pad * 1.9) : z.r + pad); if (t !== null) out.push({ id: z.id, t }); }
  return out;
}
const REGION_IDS = new Set(['shoulder', 'gut', 'ham']);
/** resolve a ray: { kind: 'animal' | 'critter' | 'prop' | 'ground' | 'water' | 'sky', actor, zone, t, point } */
function resolveRay(H, ray, o = {}) {
  const maxT = o.maxT || 2600 * M, R = { kind: 'sky', t: maxT };
  for (const a of H.actors) {
    if (!a.alive || a === o.skip) continue;
    const dx = a.x - ray.x, dy = a.y - ray.y, D = dx * H.lens.Fx + dy * H.lens.Fy; if (D < 0 || D > R.t + 64) continue;
    // a bounding sphere first
    const sz = (a.cat === 'animal' ? T('animalScale') : 1.15), rad = Math.max(a.rig.length || 8, a.rig.height || 8) * .75 * sz + 8, cz = a.z + (a.rig.height || 8) * .5 * sz;
    if (raySphere(ray, ray, [a.x, a.y, cz], rad) === null) continue;
    const hits = rayZones(ray, ray, a.zones(), .7 * Math.max(1, D) / H.lens.f); if (!hits.length) continue;   // (about a pixel of forgiveness round every part, at its distance)
    let tMin = Infinity, best = null; for (const h of hits) { tMin = Math.min(tMin, h.t); if (!best || (ZONES[h.id] || ZONES.body).pri > (ZONES[best.id] || ZONES.body).pri) best = h; }
    const zs = a.zones(); if (zs.region && REGION_IDS.has(best.id)) { let t0 = Infinity; for (const h of hits) if (REGION_IDS.has(h.id)) t0 = Math.min(t0, h.t); best = { id: zs.region([ray.x + ray.dx * t0, ray.y + ray.dy * t0, ray.z + ray.dz * t0]), t: t0 }; }   // the body by where the round went in
    if (tMin < R.t) Object.assign(R, { kind: a.cat, actor: a, zone: best.id, t: tMin, all: hits });
  }
  // trunks, stones, logs, buildings
  H.world.propsAlong(ray, ray, Math.min(R.t, 600 * M), p => { for (const v of p.occ) { const t = rayVolume(ray, ray, v); if (t !== null && t < R.t) { R.kind = 'prop'; R.t = t; R.prop = p; R.actor = null; R.zone = null; } } });
  for (const v of H.extraOcc || []) { const t = rayVolume(ray, ray, v); if (t !== null && t < R.t) { R.kind = 'prop'; R.t = t; R.prop = v.prop || null; R.actor = null; R.zone = null; } }
  // the ground, then the water's surface
  // (the renderer draws an animal over any ground beyond its root's distance less the item's bias, so hooves in the grass
  // and the far legs show; a shot through that same ground still takes the animal it shows)
  const A = R.actor && R.actor.cat === 'animal' ? R.actor : null, it = A && A._it, wades = !!(it && it.wade != null);
  const lim = A ? Math.min(R.t, (A.x - ray.x) * H.lens.Fx + (A.y - ray.y) * H.lens.Fy - (it && it.bias !== undefined ? it.bias : 10)) : R.t;
  const tg = H.world.hf.rayHit(ray, ray, R.t, false); if (tg !== null && tg < lim) { R.kind = 'ground'; R.t = tg; R.actor = null; R.zone = null; }
  const tw = H.world.hf.rayHit(ray, ray, R.t, true); if (tw !== null && tw < (R.actor && !wades ? lim : R.t - .5)) { R.kind = 'water'; R.t = tw; R.actor = null; R.zone = null; }
  R.point = [ray.x + ray.dx * R.t, ray.y + ray.dy * R.t, ray.z + ray.dz * R.t];
  R.dist = Math.hypot(R.point[0] - ray.x, R.point[1] - ray.y, R.point[2] - ray.z) / M;
  return R;
}
/** the shots fired this step, resolved together (two players on one animal in one step: the better zone takes it;
 *  equal zones share the kill) */
function resolveShots(H, shots) {
  const res = shots.map(s => Object.assign(resolveRay(H, s.ray), { shot: s }));
  const byActor = new Map();
  for (const r of res) if (r.actor) { const l = byActor.get(r.actor) || []; l.push(r); byActor.set(r.actor, l); }
  for (const [a, l] of byActor) if (l.length > 1) {
    l.sort((x, y) => (ZONES[y.zone] || ZONES.body).pri - (ZONES[x.zone] || ZONES.body).pri);
    const top = (ZONES[l[0].zone] || ZONES.body).pri, sharers = l.filter(r => (ZONES[r.zone] || ZONES.body).pri === top);
    if (sharers.length > 1) for (const r of sharers) r.shared = sharers.length;
    for (const r of l) if ((ZONES[r.zone] || ZONES.body).pri < top) r.overtaken = true;
  }
  for (const r of res) applyShot(H, r);
  return res;
}
function applyShot(H, R) {
  const s = R.shot, p = s.p, site = H.site, res = site && site.results[p.i];
  if (res) res.shots++;
  p.stats.shots++; Records.stat('shots', 1);
  bus.emit('shot', { p, R, ray: s.ray });
  // everyone hears it: loud at the shooter, a smaller noise where it lands; a near miss bolts an animal at once
  for (const a of H.actors) if (a.alive || a.state === 'hidden') {
    if (a === R.actor) continue;
    a.hear(s.ray.x, s.ray.y, 1, false);
    if (R.kind !== 'sky') { const dI = Math.hypot(R.point[0] - a.x, R.point[1] - a.y) / M; if (dI < 4) a.hear(R.point[0], R.point[1], 1, true); else if (dI < 40) a.hear(R.point[0], R.point[1], .6, false); }
  }
  if (R.overtaken) { bus.emit('miss', { p, R }); return; }
  const a = R.actor;
  if (!a) { bus.emit('impact', { p, R }); bus.emit('miss', { p, R }); H.lastMiss = R; return; }
  const Z = ZONES[R.zone] || ZONES.body;
  if (a.cat === 'critter') return critterHit(H, a, R, p, res);
  // an animal
  const wasRunning = a.running, wasVisibleAt = a.seenAt;
  const local = a.rig.toLocal ? a.rig.toLocal(R.point) : [0, 0, 0];
  a.hits.push({ local, zone: R.zone, pn: p.n, lethal: Z.lethal, t: site ? site.t : 0, w: [R.point[0] - a.x, R.point[1] - a.y, R.point[2] - a.z] });
  if (R.zone !== 'antler') { if (res) res.hits++; p.stats.hits++; Records.stat('hits', 1); } else if (res) res.pings++;
  const sharedDone = R.shared && a.state === 'dying' && a.killStep === H.time;   // the other half of a shared kill
  const out = sharedDone ? 'kill' : a.hit(R.zone, Z.dmg, p.n, R.point);
  if (out === 'kill' && !sharedDone) a.killStep = H.time;
  bus.emit('hit', { p, a, R, out });
  if (a.protected) {   // a doe, a fawn, a calf: benched (Classic) or a points penalty (Casual)
    if (out === 'ping') return;
    if (!a.penalized) { a.penalized = true; protectedPenalty(H, p, a, res); }
    return;
  }
  if (out === 'kill') {
    const kill = scoreKill(H, p, a, R, { running: wasRunning, quick: wasVisibleAt !== null && H.time - wasVisibleAt <= 1, shared: R.shared });
    if (res) { res.kills.push(kill); res.add(kill.points); res.longest = Math.max(res.longest, kill.dist); }
    p.addScore(kill.points);
    p.stats.bucks++; p.stats.longest = Math.max(p.stats.longest, kill.dist); Records.stat('bucks', 1); Records.stat('longest', kill.dist, true);
    bus.emit('kill', { p, a, R, kill });
  } else if (out === 'wound') bus.emit('wound', { p, a, R });
  else if (out === 'ping') bus.emit('ping', { p, a, R });
}
function protectedPenalty(H, p, a, res) {
  const casual = G.game.settings.doeRule === 'casual' || H.casualDoe;
  p.stats.does++; Records.stat('does', 1);
  if (H.godMode) { bus.emit('doe', { p, a, benched: false, points: 0 }); return; }
  if (casual) { if (res) { res.penalties.push({ label: a.label + ' SHOT', points: -300 }); res.add(-300); } p.addScore(-300); bus.emit('doe', { p, a, benched: false, points: -300 }); }
  else { p.benched = true; p.benchedAt = H.time; if (res) { res.benched = true; res.penalties.push({ label: a.label + ' SHOT: BENCHED', points: 0 }); } bus.emit('doe', { p, a, benched: true, points: 0 }); }
}
function critterHit(H, a, R, p, res) {
  const C = a.def;
  if (res) res.hits++; p.stats.hits++;
  if (C.protected) {
    if (a.penalized) return; a.penalized = true;
    const pts = H.godMode ? 0 : C.points; if (res) { res.penalties.push({ label: C.label.toUpperCase(), points: pts }); res.add(pts); } p.addScore(pts);
    if (C.effect === 'stink' && !H.godMode) { H.stink = Math.max(H.stink || 0, 3); }
    a.startle(0, true); if (a.def.behavior === 'graze') { a.beh = 'hop'; a.state = 'flee'; a.path = new APath([{ x: a.x, y: a.y }, { x: a.x + 40 * M, y: a.y - 20 * M }]); a.d = 0; }
    else if (a.bird) { a.state = 'flee'; a.flushed = true; a.beh = a.beh === 'swim' ? 'flush' : a.beh; if (!a.path) a.path = new APath([{ x: a.x, y: a.y }, { x: a.x + 60 * M, y: a.y - 80 * M }]); }
    else { a.die(p.n); }
    bus.emit('critter', { p, a, points: pts, protected: true });
    return;
  }
  a.die(p.n); a.vz = 0;
  const pts = Math.round(C.points * (R.dist > 60 ? 1.5 : 1));
  if (res) { res.critters.push({ id: a.kind, label: C.label, points: pts }); res.add(pts); } p.addScore(pts); Records.stat('critters', 1);
  bus.emit('critter', { p, a, points: pts, protected: false });
}
