// Players: the pump rifle (a 5-round tube, pump after every shot, the pump reloads an empty tube), the scope (sway,
// hold breath), the call, the reticle (mouse absolute, stick velocity with a curve, aim assist that never helps toward a
// doe), shots resolved analytically against the same capsules that are drawn (zones: heart > head > lung > neck >
// shoulder > gut > ham > leg > antler), occluders, terrain and water. Scoring and the HunterBot (also the test driver).
(() => {
const B = BB, E = B.E, V = B.v3;
const SHAPES = ['circle', 'diamond', 'brackets', 'triangle'];

class Player {
  constructor(n, input, o = {}) {
    this.n = n; this.input = input; this.color = B.SEATS[n]; this.shape = SHAPES[n]; this.name = o.name || 'P' + (n + 1);
    this.total = 0; this.huntScore = 0; this.bot = null; this.ghost = false;
    this.ret = [240, 135]; this.vel = [0, 0]; this.lastMouse = null;
    this.stats = { shots: 0, hits: 0, kills: 0, does: 0, longest: 0, critters: 0, bucks: 0 };
    this.resetSite();
  }
  resetSite(o = {}) {
    const T = B.TUNING;
    this.tube = o.tube || T.rounds; this.rounds = this.tube; this.chambered = true; this.rack = 0; this.reload = 0; this.lastShot = -9; this.rackTime = o.rack !== undefined ? o.rack : T.rackTime;
    this.scoped = false; this.scopeK = 0; this.breathHeld = false; this.breath = 1; this.shaky = 0; this.calls = Math.round(T.calls + B.diff().calls); this.callCd = 0;
    this.benched = false; this.site = { score: 0, shots: 0, hits: 0, kills: [], critters: [], penalties: [], bonuses: [], hitsOnAnimals: 0 };
    this.dry = 0; this.bloom = 0; this.autoPumpT = 0; this.multi = { t: -9, n: 0 }; this.pumpPrompt = 0;
  }
  get device() { return this.input ? this.input.lastDevice : 'gamepad'; }
}
B.Player = Player;

// ---- sway (deterministic in time) ----
B.sway = (p, t) => {
  const A = B.TUNING.sway * B.diff().sway * (p.breathHeld ? .15 : p.shaky > 0 ? 2 : 1) * p.scopeK;
  return [A * (.6 * Math.sin(1.3 * t) + .4 * Math.sin(2.9 * t + 1)), A * (.5 * Math.sin(1.7 * t + 2) + .3 * Math.sin(3.3 * t))];
};
B.aimPoint = (p, t) => { const s = B.sway(p, t + p.n * 1.7); return [p.ret[0] + s[0], p.ret[1] + s[1]]; };

// ---- input to intent ----
// returns { fire, pump, scope (held), scopeTap, breath, call, move: [x, y], mouse: [x, y] | null }
B.readIntent = (p, W, H) => {
  if (p.bot) return p.bot.intent;
  const I = p.input; if (!I) return { move: [0, 0] };
  const m = I.move(), aim = I.padAim;
  let mouse = null;
  if (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') { const q = I.pointer && I.pointer(); if (q && (!p.lastMouse || q[0] !== p.lastMouse[0] || q[1] !== p.lastMouse[1])) mouse = q; if (q) p.lastMouse = q; }
  return { fire: I.pressed('fire'), pump: I.pressed('pump'), scope: I.down('scope'), scopeTap: I.pressed('scope'), breath: I.down('breath'), call: I.pressed('call'), move: [m[0] + (aim ? aim[0] * .3 : 0), m[1] + (aim ? aim[1] * .3 : 0)], mouse };
};

// ---- a step of one player's weapon and reticle ----
B.stepPlayer = (p, dt, ctx) => {
  const T = B.TUNING, it = ctx.intent, W = ctx.W, H = ctx.H, t = ctx.t;
  // reticle
  if (it.mouse) { p.ret[0] = B.clamp(it.mouse[0], 0, W - 1); p.ret[1] = B.clamp(it.mouse[1], 0, H - 1); p.vel = [0, 0]; }
  else if (it.aimTo) { p.ret[0] = it.aimTo[0]; p.ret[1] = it.aimTo[1]; }
  else if (it.direct) { p.ret[0] = B.clamp(p.ret[0] + it.direct[0] * dt, 0, W - 1); p.ret[1] = B.clamp(p.ret[1] + it.direct[1] * dt, 0, H - 1); }
  else {
    const mx = it.move[0], my = it.move[1], mag = Math.min(1, Math.hypot(mx, my));
    const curve = Math.pow(mag, 1.7), spd = T.reticleSpeed * (B.setting('reticleSens') || 1) * (p.scoped ? .45 : 1) * (W / 480);
    let fr = 1;
    const assist = B.diff().assist || B.setting('assistMode');
    if (assist !== 'off' && ctx.assistTargets) for (const q of ctx.assistTargets) { if (Math.hypot(q[0] - p.ret[0], q[1] - p.ret[1]) < q[2] + 8) { fr = assist === 'strong' ? Math.min(fr, T.assist * .7) : Math.min(fr, T.assist); if (assist === 'strong' && mag > .1) { p.ret[0] += (q[0] - p.ret[0]) * .25 * dt; p.ret[1] += (q[1] - p.ret[1]) * .25 * dt; } } }
    const tv = [mx / (mag || 1) * curve * spd * fr, my / (mag || 1) * curve * spd * fr];
    const k = Math.min(1, dt / .15); p.vel[0] += (tv[0] - p.vel[0]) * k; p.vel[1] += (tv[1] - p.vel[1]) * k;
    if (mag < .05) { p.vel[0] *= .5; p.vel[1] *= .5; }
    p.ret[0] = B.clamp(p.ret[0] + p.vel[0] * dt, 0, W - 1); p.ret[1] = B.clamp(p.ret[1] + p.vel[1] * dt, 0, H - 1);
  }
  // scope
  const toggle = B.setting('scopeMode') === 'toggle' && !p.bot;
  if (toggle) { if (it.scopeTap) p.scoped = !p.scoped; } else p.scoped = !!it.scope;
  if (ctx.noScope) p.scoped = false;
  const wasK = p.scopeK; p.scopeK = B.approach(p.scopeK, p.scoped ? 1 : 0, dt / .15);
  if (!wasK && p.scopeK) B.bus.emit('sound', { id: 'scope' });
  // breath
  if (p.shaky > 0) { p.shaky -= dt; p.breathHeld = false; }
  else if (it.breath && p.scoped && p.breath > 0) { if (!p.breathHeld) B.bus.emit('sound', { id: 'breathIn' }); p.breathHeld = true; p.breath -= dt / T.breath; if (p.breath <= 0) { p.breath = 0; p.breathHeld = false; p.shaky = 1.5; B.bus.emit('sound', { id: 'breathOut' }); } }
  else { if (p.breathHeld) B.bus.emit('sound', { id: 'breathOut' }); p.breathHeld = false; p.breath = Math.min(1, p.breath + dt * 1.2 / T.breath); }
  // the rifle
  p.bloom = Math.max(0, p.bloom - dt * 4); p.dry = Math.max(0, p.dry - dt); p.callCd = Math.max(0, p.callCd - dt); p.pumpPrompt = Math.max(0, p.pumpPrompt - dt);
  const infinite = B.CHEAT.infinite || (p.bot && p.bot.cheat);
  if (p.rack > 0) { p.rack -= dt; if (p.rack <= 0) { p.rack = 0; p.chambered = true; } }
  if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { p.reload = 0; p.rounds = p.tube; p.chambered = true; } }
  const busy = p.rack > 0 || p.reload > 0;
  const autoPump = p.bot ? p.bot.autoPump : (B.setting('autoPump') || B.diff().autoPump);
  if (autoPump && !p.chambered && !busy && t - p.lastShot > .12) it.pump = true;
  if (it.pump && !busy && !p.chambered && !p.benched) {
    if (p.rounds > 0 || infinite) { p.rack = p.rackTime; if (infinite && p.rounds <= 0) p.rounds = p.tube; B.bus.emit('pump', { p }); }
    else { p.reload = T.reloadTime; B.bus.emit('reload', { p }); }
  }
  let shot = null;
  if (it.fire && !p.benched) {
    if (p.chambered && !busy && t - p.lastShot >= .1) {
      p.chambered = false; if (!infinite) p.rounds--; p.lastShot = t; p.bloom = 1;
      shot = B.aimPoint(p, t);
    } else if (!busy) { p.dry = .3; p.pumpPrompt = 1.5; B.bus.emit('dry', { p }); }
  }
  // the call
  if (it.call && !p.benched && p.callCd <= 0 && (p.calls > 0 || B.CHEAT.infinite) && !ctx.noCall) { p.calls = Math.max(0, p.calls - 1); p.callCd = 3; B.bus.emit('call', { p }); if (ctx.onCall) ctx.onCall(p); }
  return shot;
};

// ---- ray tests ----
function rayCapsule(o, d, a, b, ra, rb) {
  // closest approach between the ray o + t d (t >= 0) and the segment a + s (b - a)
  const u = V.sub(b, a), w0 = V.sub(o, a), A = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], Bq = d[0] * u[0] + d[1] * u[1] + d[2] * u[2], C = u[0] * u[0] + u[1] * u[1] + u[2] * u[2];
  const D = d[0] * w0[0] + d[1] * w0[1] + d[2] * w0[2], Eq = u[0] * w0[0] + u[1] * w0[1] + u[2] * w0[2], den = A * C - Bq * Bq;
  let s, t;
  if (C < 1e-9) { s = 0; t = -D / A; }
  else if (den < 1e-9) { s = 0; t = -D / A; }
  else { s = B.clamp((A * Eq - Bq * D) / den, 0, 1); t = (Bq * s - D) / A; if (t < 0) { t = 0; s = B.clamp(Eq / C, 0, 1); } }
  // re-solve t for the clamped s
  const ps = [a[0] + u[0] * s, a[1] + u[1] * s, a[2] + u[2] * s];
  t = Math.max(0, (ps[0] - o[0]) * d[0] + (ps[1] - o[1]) * d[1] + (ps[2] - o[2]) * d[2]);
  const q = [o[0] + d[0] * t - ps[0], o[1] + d[1] * t - ps[1], o[2] + d[2] * t - ps[2]], dist = Math.hypot(q[0], q[1], q[2]);
  const r = ra + (rb - ra) * s;
  if (dist > r) return null;
  return { t: t - Math.sqrt(Math.max(0, r * r - dist * dist)), s };
}
B.rayCapsule = rayCapsule;
function rayTri(o, d, a, b, c) {
  const e1 = V.sub(b, a), e2 = V.sub(c, a), p = V.cross(d, e2), det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det, s = V.sub(o, a), u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv; if (u < 0 || u > 1) return null;
  const q = V.cross(s, e1), v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv; if (v < 0 || u + v > 1) return null;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv; return t > 0 ? { t } : null;
}
function rayOcc(o, d, oc) {
  if (oc.type === 'cyl') {
    const ox = o[0] - oc.x, oy = o[1] - oc.y, a = d[0] * d[0] + d[1] * d[1], b = 2 * (ox * d[0] + oy * d[1]), c = ox * ox + oy * oy - oc.r * oc.r, disc = b * b - 4 * a * c;
    if (disc < 0 || a < 1e-9) return null; const t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0) return null; const z = o[2] + d[2] * t; return z >= oc.z0 && z <= oc.z1 ? t : null;
  }
  if (oc.type === 'sph') { const r = rayCapsule(o, d, oc.c, oc.c, oc.r, oc.r); return r ? r.t : null; }
  if (oc.type === 'cap') { const r = rayCapsule(o, d, oc.a, oc.b, oc.r, oc.r); return r ? r.t : null; }
  if (oc.type === 'box') {   // oriented box: into its frame
    const c = Math.cos(-oc.f), s = Math.sin(-oc.f), rx = o[0] - oc.c[0], ry = o[1] - oc.c[1];
    const lo = [rx * c - ry * s, rx * s + ry * c, o[2] - oc.c[2]], ld = [d[0] * c - d[1] * s, d[0] * s + d[1] * c, d[2]];
    let t0 = 0, t1 = 1e9;
    for (let k = 0; k < 3; k++) { if (Math.abs(ld[k]) < 1e-9) { if (Math.abs(lo[k]) > oc.h[k]) return null; continue; } let a = (-oc.h[k] - lo[k]) / ld[k], b = (oc.h[k] - lo[k]) / ld[k]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; }
    return t0;
  }
  return null;
}
const PRIO = { heart: 9, head: 8, lung: 7, neck: 6, shoulder: 5, chest: 5, gut: 4, ham: 3, leg: 2, antler: 1, body: 5, hat: 6 };
const ZONE = {
  heart: { dmg: 9, lethal: true, mult: 'heartMult', call: 'HEART SHOT!' }, head: { dmg: 9, lethal: true, mult: 'headMult', call: 'HEADSHOT!' },
  lung: { dmg: 9, lethal: true, mult: 'lungMult', call: 'LUNG SHOT!' }, neck: { dmg: 9, lethal: true, m: 1.4, call: 'NECK SHOT!' },
  shoulder: { dmg: 9, lethal: true, m: 1.2, call: 'SHOULDER!' }, gut: { dmg: .6, m: .7, call: 'GUT SHOT' }, ham: { dmg: .5, m: .6, call: 'HAM HIT' },
  leg: { dmg: .4, m: .5, call: 'LEG HIT' }, antler: { dmg: 0, m: 0, call: 'ANTLER PING!' }
};
B.ZONE = ZONE;
B.zoneMult = z => { const Z = ZONE[z]; return Z.mult ? B.TUNING[Z.mult] : Z.m; };

// the parts of an actor (for hits and the bot)
B.actorParts = a => {
  if (a.rig) return a.rig.parts;
  if (a.partsFn) return a.partsFn(a);
  return [];
};
// cast a shot: returns { kind: 'animal' | 'critter' | 'target' | 'occluder' | 'ground' | 'water' | 'sky', actor, zone, t, point, zones }
B.castShot = (site, lens, sx, sy, o = {}) => {
  const ro = [lens.x, lens.y, lens.z], rd = lens.ray(sx, sy);
  let best = null;
  const list = o.actors || site.herd.list;
  for (const a of list) {
    if (a.gone || (a.dead && a.cat !== 'animal') || a.ghostOnly) continue;
    const bd = a.rig ? a.rig.bound() : { x: a.x, y: a.y, z: a.z, r: a.rad || 1.5 };
    const bc = [bd.x, bd.y, bd.z + bd.r * .4];
    if (!rayCapsule(ro, rd, bc, bc, bd.r * 1.3 + .5, bd.r * 1.3 + .5)) continue;
    const parts = B.actorParts(a);
    const dist = Math.hypot(bd.x - lens.x, bd.y - lens.y), k = lens.f / Math.max(1, dist), minR = .6 / k;
    let entry = Infinity, entryZone = null;
    for (const p of parts) { if (p.deco && !p.zone) continue; const h = rayCapsule(ro, rd, p.a, p.b, Math.max(p.ra, minR), Math.max(p.rb, minR)); if (h && h.t < entry) { entry = h.t; entryZone = p.zone; } }
    if (a.rig && a.rig.palms) for (const pm of a.rig.palms) for (let i = 0; i < pm.rim.length - 1; i++) { const h = rayTri(ro, rd, pm.c, pm.rim[i], pm.rim[i + 1]); if (h && h.t < entry) { entry = h.t; entryZone = 'antler'; } }
    if (parts.wings) for (const w of parts.wings) { const h = rayTri(ro, rd, w.a, w.b, w.tip); if (h && h.t < entry) { entry = h.t; entryZone = 'body'; } }
    if (entry === Infinity) continue;
    if (best && best.t <= entry) continue;
    // every zone the ray crosses inside this animal
    let zone = entryZone, zp = PRIO[zone] || 0; const crossed = [entryZone];
    if (a.cat === 'animal' || a.zoned) {
      const inner = (a.rig && a.rig.inner) || [];
      for (const p of parts.concat(inner)) { if (p.zone === 'antler' && zone !== 'antler') continue; const h = rayCapsule(ro, rd, p.a, p.b, p.ra, p.rb); if (h && h.t < entry + 4 * (a.rig ? a.rig.size : 1)) { crossed.push(p.zone); const pr = PRIO[p.zone] || 0; if (pr > zp && (p.zone !== 'antler')) { zone = p.zone; zp = pr; } } }
      if (zone === 'chest') zone = 'shoulder';
      if (zone === 'antler' && crossed.some(z => z !== 'antler')) { let bz = 'leg', bp = 0; for (const z of crossed) if (z !== 'antler' && (PRIO[z] || 0) > bp) { bz = z === 'chest' ? 'shoulder' : z; bp = PRIO[z]; } zone = bz; }
    }
    best = { kind: a.cat, actor: a, zone, t: entry, crossed };
  }
  // occluders (trunks, rocks, logs, boxes) near the ray's track
  const w = site.world, maxT = best ? best.t : 1200;
  for (const oc of w.occluders) {
    const cx = oc.x !== undefined ? oc.x : (oc.c ? oc.c[0] : (oc.a[0] + oc.b[0]) / 2), cy = oc.y !== undefined ? oc.y : (oc.c ? oc.c[1] : (oc.a[1] + oc.b[1]) / 2);
    const dx = cx - ro[0], dy = cy - ro[1], along = dx * rd[0] + dy * rd[1];
    if (along < -10 || along > maxT + 10) continue;
    const perp = Math.abs(dx * rd[1] - dy * rd[0]) / Math.max(1e-6, Math.hypot(rd[0], rd[1])); if (perp > 12) continue;
    const t = rayOcc(ro, rd, oc); if (t !== null && t < (best ? best.t : 1e9) && t < maxT) best = { kind: 'occluder', t, occ: oc };
  }
  if (o.extraOccluders) for (const oc of o.extraOccluders) { const t = rayOcc(ro, rd, oc); if (t !== null && t < (best ? best.t : 1e9)) best = { kind: 'occluder', t, occ: oc }; }
  // terrain and water
  const tg = w.rayHit(ro, rd, best ? best.t : 1500, true, true);
  if (tg !== null && tg < (best ? best.t : 1e9)) { const p = [ro[0] + rd[0] * tg, ro[1] + rd[1] * tg, ro[2] + rd[2] * tg], wl = w.waterAt(p[0], p[1]); best = { kind: wl !== null && Math.abs(p[2] - wl) < .05 ? 'water' : 'ground', t: tg }; }
  if (!best) best = { kind: 'sky', t: 400 };
  best.point = [ro[0] + rd[0] * best.t, ro[1] + rd[1] * best.t, ro[2] + rd[2] * best.t];
  best.ray = rd; best.dist = Math.hypot(best.point[0] - ro[0], best.point[1] - ro[1]);
  return best;
};

// ---- scoring (5.10) ----
B.killPoints = (a, zone, dist, running, extra = {}) => {
  const T = B.TUNING, sp = B.get('species', a.species);
  const base = sp.base(a.points || 0, a.spread || 0);
  const dm = B.clamp(1 + (dist - 25) / T.distanceSlope, 1, 3.5);
  const pts = Math.round(base * dm * B.zoneMult(zone) * (running ? T.runningMult : 1) * (a.trophy ? 3 : 1));
  return { base, dm, pts };
};
B.siteBonuses = (p, site) => {
  const s = p.site, out = [];
  if (s.shots > 0) { const acc = s.hits / s.shots; if (acc >= .5) out.push(['ACCURACY ' + Math.round(acc * 100) + '%', Math.round(acc * 1000)]); }
  const bucks = site.herd.list.filter(a => a.cat === 'animal' && a.legal && !a.trophy);
  const mine = s.kills.filter(k => k.legal);
  if (bucks.length && bucks.every(a => a.dead && a.bagger === p.n) && mine.every(k => k.oneShot && ZONE[k.zone].lethal)) out.push(['CLEAN SWEEP', 1000]);
  if (!s.penalties.length && s.shots > 0) out.push(['NO PENALTIES', 200]);
  return out;
};
B.stars = (p, site) => {
  const s = p.site, mine = s.kills.filter(k => k.legal).length, bucks = site.herd.list.filter(a => a.cat === 'animal' && a.legal && !a.trophy).length;
  if (!mine) return 0;
  const sweep = s.bonuses.some(b => b[0] === 'CLEAN SWEEP');
  if (sweep && !s.penalties.length) return 3;
  return mine >= bucks ? 2 : 1;
};
B.RANKS = [[0, 'GREENHORN'], [.4, 'TENDERFOOT'], [.6, 'WOODSMAN'], [.8, 'SHARPSHOOTER'], [1, 'BIG GAME PRO'], [1.25, 'LEGEND OF THE LODGE']];
B.rankFor = (score, par) => { let r = B.RANKS[0][1]; for (const [k, n] of B.RANKS) if (score >= par * k) r = n; return r; };

// ---- the HunterBot: picks the best legal target, steers a spring toward its vitals, scopes far, fires when steady ----
class Bot {
  constructor(p, o = {}) {
    this.p = p; this.skill = o.skill || 'average'; this.cheat = !!o.cheat; this.autoPump = true; this.intent = { move: [0, 0] };
    this.rng = B.mkRng(B.hashStr('bot' + p.n + this.skill) ^ B.runSeed);
    const S = { novice: [.55, 7, 1.2], average: [.32, 3.2, 2.2], expert: [.16, 1.1, 3.5] }[this.skill];
    this.react = S[0]; this.noise = S[1]; this.gain = S[2]; this.target = null; this.lock = 0; this.aim = [p.ret[0], p.ret[1]]; this.v = [0, 0]; this.err = [0, 0]; this.errT = 0;
    this.callUsed = 0; this.critters = o.critters !== false;
  }
  think(dt, ctx) {
    const p = this.p, it = this.intent = { move: [0, 0] }, lens = ctx.lens, site = ctx.site, W = ctx.W, H = ctx.H, list = ctx.actors || (site ? site.herd.list : []);
    if (!lens) return;
    this.lock -= dt; this.errT -= dt;
    if (!this.target || !this.target.live || this.target.dead || this.lock <= 0) { this.target = this.pick(list, lens, W, H, ctx); this.lock = this.react + this.rng.range(0, .3); }
    const tg = this.target;
    if (!p.chambered && p.rack <= 0 && p.reload <= 0) it.pump = true;
    if (!tg) return;
    const zone = ctx.aimZone || (tg.cat === 'animal' ? 'heart' : null);
    const pt = B.aimPointOf(tg, zone);
    const P = lens.project(pt[0], pt[1], pt[2]);   // shots are hitscan: no lead
    if (!P) { this.target = null; return; }
    if (this.errT <= 0) { this.err = [this.rng.range(-1, 1) * this.noise, this.rng.range(-1, 1) * this.noise]; this.errT = .4; }
    const goal = this.cheat ? [P[0], P[1]] : [P[0] + this.err[0] * (p.scoped ? .5 : 1), P[1] + this.err[1] * (p.scoped ? .5 : 1)];
    const dist = Math.hypot(tg.x - lens.x, tg.y - lens.y);
    it.scope = !ctx.noScope && dist > 90 && !this.cheatNoScope; it.breath = it.scope && p.scopeK > .9;
    if (this.cheat) { it.aimTo = [B.clamp(goal[0], 0, W - 1), B.clamp(goal[1], 0, H - 1)]; }
    else {
      // velocity control: feed-forward of the goal's motion plus a spring on the error, through the stick's curve
      const gv = this.lastGoal ? [(goal[0] - this.lastGoal[0]) / dt, (goal[1] - this.lastGoal[1]) / dt] : [0, 0];
      const dx = goal[0] - p.ret[0], dy = goal[1] - p.ret[1], k = this.gain * 3;
      const vmax = B.TUNING.reticleSpeed * (B.setting('reticleSens') || 1) * (p.scoped ? .45 : 1) * (W / 480);
      let vx = gv[0] * .9 + dx * k, vy = gv[1] * .9 + dy * k; const vl = Math.hypot(vx, vy); if (vl > vmax) { vx *= vmax / vl; vy *= vmax / vl; }
      const m = Math.hypot(vx, vy) / vmax; it.move = m > 1e-4 ? [vx / vmax / m * Math.pow(m, 1 / 1.7), vy / vmax / m * Math.pow(m, 1 / 1.7)] : [0, 0];
      it.direct = [vx, vy];
    }
    this.lastGoal = goal;
    const e = Math.hypot(goal[0] - p.ret[0], goal[1] - p.ret[1]);
    const ready = p.chambered && p.rack <= 0 && (it.scope ? p.scopeK > .95 : true);
    const rad = tg.rig ? Math.max(2, .12 * tg.rig.size * P[2]) : Math.max(1.5, .1 * P[2]);
    const win = Math.max({ novice: 3.5, average: 2.6, expert: 1.8 }[this.skill], rad * .8);
    if (ready && (this.cheat || e < win)) {
      // never fire if the first thing on the ray would be protected
      const aimNow = this.cheat ? goal : B.aimPoint(p, ctx.t);
      const res = ctx.castAt ? ctx.castAt(aimNow[0], aimNow[1]) : null;
      if (res && res.actor === tg) it.fire = true;
      else if (res && res.actor && res.actor.legal && !res.actor.protected) it.fire = true;
      else if (res && !res.actor && this.cheat) { this.target = null; }
      if (it.fire && this.cheat) it.aimTo = goal;
    }
    if (ctx.allowCall && tg.cat === 'animal' && tg.speed > 3 && p.calls > 0 && this.callUsed < 2 && !tg.flee) { it.call = true; this.callUsed++; }
  }
  pick(list, lens, W, H, ctx) {
    let best = null, bv = -1;
    for (const a of list) {
      if (!a.live || a.dead || a.hidden || a.ghostOnly) continue;
      const legal = a.cat === 'animal' ? a.legal : a.cat === 'critter' ? !a.protected && this.critters : a.cat === 'target' ? !a.protected : false;
      if (!legal) continue;
      const pt = B.aimPointOf(a, a.cat === 'animal' ? 'heart' : null), P = lens.project(pt[0], pt[1], pt[2]);
      if (!P || P[0] < 4 || P[0] > W - 4 || P[1] < 4 || P[1] > H - 4) continue;
      if (ctx.castAt) { const r = ctx.castAt(P[0], P[1]); if (!r.actor || r.actor !== a) continue; }
      const v = (a.cat === 'animal' ? 1000 : a.points || 50) + (a.flee ? 300 : 0) - Math.hypot(P[0] - this.p.ret[0], P[1] - this.p.ret[1]);
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
}
B.Bot = Bot;
// the world point to aim at for a zone
B.aimPointOf = (a, zone) => {
  if (a.rig && zone && a.rig.inner) { const z = zone === 'heart' ? a.rig.inner[0] : zone === 'lung' ? a.rig.inner[1] : null; if (z) return z.a; const hp = a.rig.parts.find(p => p.zone === zone); if (hp) return [(hp.a[0] + hp.b[0]) / 2, (hp.a[1] + hp.b[1]) / 2, (hp.a[2] + hp.b[2]) / 2]; }
  if (a.aimAt) return a.aimAt(a);
  const ps = B.actorParts(a); if (ps.length) { const p = ps[0]; return [(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2, (p.a[2] + p.b[2]) / 2]; }
  return [a.x, a.y, a.z + .3];
};
})();
