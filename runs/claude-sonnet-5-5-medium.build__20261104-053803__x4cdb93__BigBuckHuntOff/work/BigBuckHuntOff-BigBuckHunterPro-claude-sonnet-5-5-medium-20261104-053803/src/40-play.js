/* Play: players, rifle, scope, call, shot resolution, scoring, site runtime, trophies, bonus games, range, bot. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, lerp = BB.lerp;
const RAD = Math.PI / 180;

/* ---------- screen-space effects ---------- */
BB.fx = { puffs: [], pops: [], banners: [], captions: [], shake: 0, flash: null, stink: 0, splat: 0, tilt: 0 };
BB.puff = (x, y, kind, n = 8) => {
  const r = BB.RNG.fx(); const cols = { fur: ['#c99a62', '#f0e6cc', '#8a5a32'], dust: ['#b8a078', '#8a7452', '#d9c9a0'], bark: ['#6a4a2c', '#8a6a44', '#c9a46a'], spark: ['#ffd24a', '#fff2a0'], splash: ['#d6f0f8', '#9fd0e0', '#ffffff'], feather: ['#2a2a34', '#555'], snow: ['#ffffff', '#dfe8ee'], stink: ['#9fd05a', '#6a9a2a'] }[kind] || ['#fff'];
  for (let i = 0; i < n; i++) BB.fx.puffs.push({ x, y, vx: (r() - .5) * 70, vy: -r() * 60 - (kind === 'splash' ? 40 : 10), life: .5 + r() * .5, t: 0, c: cols[Math.floor(r() * cols.length)], g: kind === 'fur' || kind === 'feather' ? 40 : 160, sz: kind === 'dust' ? 2 : 1 + (r() > .6 ? 1 : 0) });
};
BB.pop = (text, x, y, color = '#ffd36a', big = false) => BB.fx.pops.push({ text, x, y, color, t: 0, life: 1.4, big });
BB.banner = (text, color = '#ffd36a', sub = '') => { BB.fx.banners.push({ text, color, sub, t: 0, life: 1.7 }); if (BB.fx.banners.length > 4) BB.fx.banners.shift(); };
BB.caption = (who, text, life = 3.2) => { BB.fx.captions.push({ who, text, t: 0, life }); if (BB.fx.captions.length > 3) BB.fx.captions.shift(); };
BB.bark = (cat, color) => { const l = BB.BARKS[cat]; if (!l) return; const t = l[Math.floor(BB.RNG.fx()() * l.length)]; BB.banner(t, color || '#ffd36a'); return t; };
BB.updateFx = dt => {
  const f = BB.fx;
  for (const p of f.puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; } f.puffs = f.puffs.filter(p => p.t < p.life);
  for (const p of f.pops) { p.t += dt; } f.pops = f.pops.filter(p => p.t < p.life);
  for (const p of f.banners) p.t += dt; f.banners = f.banners.filter(p => p.t < p.life);
  for (const p of f.captions) p.t += dt; f.captions = f.captions.filter(p => p.t < p.life);
  f.shake = Math.max(0, f.shake - dt * 3); f.stink = Math.max(0, f.stink - dt); f.splat = Math.max(0, f.splat - dt);
};

/* ---------- players ---------- */
BB.players = [];
BB.makePlayer = (idx, o = {}) => ({
  idx, name: o.name || 'P' + (idx + 1), color: BB.COLORS[idx], shape: BB.SHAPES[idx], input: o.input || null, bot: o.bot || null, rx: 240, ry: 130, vx: 0, vy: 0, lastPtr: null, aimMode: 'stick',
  rounds: 5, chambered: true, rackT: 0, reloadT: 0, lastShotT: -9, scoped: false, scopeT: 0, breathT: 3, breathHeld: false, shaky: 0, swayT: BB.rand(0, 6, 'bot'), calls: 2, callCd: 0,
  score: 0, siteScore: 0, huntScore: 0, kills: 0, shots: 0, hits: 0, benched: false, streak: 0, lastKillT: -9, sweep: true, penalties: 0, join: true, dry: 0, kick: 0, sx: 240, sy: 130, ax: 240, ay: 130, stars: 0, siteKills: 0, perfect: true
});
BB.resetPlayerSite = (p, t = BB.T.rounds, calls = BB.T.calls) => {
  Object.assign(p, { rounds: Math.round(t), chambered: true, rackT: 0, reloadT: 0, scoped: false, scopeT: 0, breathT: BB.T.breath, breathHeld: false, shaky: 0, calls, callCd: 0, siteScore: 0, benched: false, streak: 0, lastKillT: -9, sweep: true, penalties: 0, shots: 0, hits: 0, siteKills: 0, dry: 0 });
};

/* ---------- site creation ---------- */
BB.createSite = (id, players, opts = {}) => {
  const def = BB.SITES[id], hunt = BB.HUNTS[def.hunt];
  BB.resetIds();
  const terrain = BB.makeTerrain(def), props = BB.buildProps(def, terrain);
  const view = BB.makeView({ W: opts.W || 480, H: opts.H || 270, fov: def.fov * .8, camH: def.camH, hyf: def.hyf, yaw: (def.yaw[0][1]) * RAD });
  const ctx = {
    id, def, hunt, terrain, props, view, animals: [], critters: [], t: 0, state: 'play', players, kills: [], escaped: [], lost: [], events: [], spawnIdx: 0, endT: 0, ended: false, doeHit: false,
    bounds: def.bounds, site: { bounds: def.bounds }, timeLimit: def.time * BB.T.siteTime, spawns: (def.spawns || []).slice().sort((a, b) => a.t - b.t), seed: opts.seed || 1, bucksTotal: 0, shotsFired: 0, fogA: 0, rockT: -1, mode: opts.mode || 'hunt',
    sceneTime: 0, hint: 0, hintT: 12, bonusState: null, trophyState: null, cam: { shake: 0 }, calledOnce: false, hubLoop: !!opts.hubLoop
  };
  ctx.site = Object.assign(ctx.site, { bounds: def.bounds });
  for (const p of players) BB.resetPlayerSite(p, def.bonus ? (BB.BONUS[def.bonus].rounds) : BB.T.rounds, def.trophy ? 6 : BB.T.calls);
  if (def.bonus) BB.initBonus(ctx);
  else if (def.trophy) BB.initTrophy(ctx);
  else if (def.range) BB.initRange(ctx);
  else ctx.bucksTotal = ctx.spawns.filter(s => s.k === 'buck').length;
  /* director */
  BB.setYaw(ctx, 0);
  return ctx;
};
BB.setYaw = (ctx, t) => {
  const keys = ctx.def.yaw; let y = keys[keys.length - 1][1];
  if (t <= keys[0][0]) y = keys[0][1]; else for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t >= a[0] && t <= b[0]) { const u = (t - a[0]) / Math.max(.01, b[0] - a[0]); y = lerp(a[1], b[1], E.ease.inOutSine(u)); break; } }
  if (ctx.yawOverride !== undefined) y = ctx.yawOverride;
  ctx.view.yaw = y * RAD;
};
const polar = BB.polar;
BB.spawnFromSpec = (ctx, s) => {
  const sp = ctx.hunt.species;
  if (s.k === 'rockfall') { BB.spookAll(ctx, 1); BB.fx.shake = .8; BB.banner('ROCKFALL!', '#ff9a6a'); BB.sfx('boom'); return; }
  if (s.k === 'critter') { spawnCritter(ctx, s); return; }
  const o = s.o, f = polar(s.f[0], s.f[1]), to = s.to ? polar(s.to[0], s.to[1]) : null;
  const sex = s.k === 'buck' ? 'male' : 'female', age = s.k === 'fawn' ? 'young' : 'adult';
  const a = BB.makeAnimal({ species: sp, sex, age, pts: o.pts || 8, x: f[0], y: f[1], to, exitTo: to, born: ctx.t, trait: o.stubborn ? 'stubborn' : null, nonSpook: false }, ctx);
  a.gaitMove = o.gait || 'walk';
  if (o.cross) { a.mode = 'walk'; a.gait = o.gait || 'walk'; a.pose = a.gait === 'run' ? 'run' : a.gait === 'trot' ? 'trot' : 'walk'; a.path = [to.slice()]; a.face = to[0] > f[0] ? 1 : -1; }
  else { a.mode = 'graze'; a.linger = (o.linger || 8) * (s.k === 'doe' ? 1 : 1); a.face = to && to[0] > f[0] ? 1 : -1; if (o.stubborn && o.stare) { a.stareT = 0; } }
  if (o.charge) { a.mode = 'charge'; a.gait = 'run'; a.pose = 'charge'; a.path = [[f[0] * .1, 14]]; a.charge = true; a.exitTo = null; a.flee = [to ? to[0] : 60, 20]; }
  if (o.call) { a.mode = 'hidden'; a.hiddenUntilCall = true; a.afterCall = to; a.pendingPath = true; }
  if (o.emerge) { a.mode = 'walk'; }
  if (s.k === 'buck') ctx.bucksTotalLive = (ctx.bucksTotalLive || 0) + 1;
  ctx.animals.push(a); return a;
};
function spawnCritter(ctx, s) {
  const o = s.o, f = polar(s.f[0], s.f[1]), to = s.to ? polar(s.to[0], s.to[1]) : null;
  const c = BB.makeCritter(s.type, { x: f[0], y: f[1], to, life: o.life || 20, mode: o.mode || 'idle', face: to && to[0] < f[0] ? -1 : 1 });
  const d = c.def;
  if (d.motion === 'fly' && to) { const dx = to[0] - f[0], dy = to[1] - f[1], l = Math.hypot(dx, dy) || 1; c.vx = dx / l * 7; c.vy = dy / l * 7; c.alt = o.alt || 2; c.tAlt = c.alt + 1.5; c.flapSine = true; }
  if (d.motion === 'hop' && to) { const dx = to[0] - f[0], dy = to[1] - f[1], l = Math.hypot(dx, dy) || 1; c.vx = dx / l * 3.2; c.vy = dy / l * 3.2; c.mode = 'run'; }
  if (d.motion === 'soar') { c.cx = f[0]; c.cy = f[1]; c.h0 = o.h0 || 25; c.radius = o.radius || 50; c.alt = c.h0; }
  if (c.type === 'wolf' || c.type === 'coyote') { c.speedMult = 1; if (o.run) c.mode = 'run'; }
  if (o.peek) { c.def = Object.assign({}, c.def, { motion: 'peek' }); }
  c.owner = o; ctx.critters.push(c); return c;
}

/* ---------- reading input ---------- */
const DEAD = .15;
BB.readInput = (p, ctx) => {
  const inp = p.input; if (p.bot) return p.bot.input; if (BB.dev.open) return {};
  if (!inp) return {};
  const m = inp.move(), pm = inp.padMove || [0, 0], pa = inp.padAim;
  let mx = m[0], my = m[1], ax = 0, ay = 0;
  if (pa) { ax = pa[0]; ay = pa[1]; }
  const ptr = inp.pointer ? inp.pointer() : null;
  let mouse = null;
  if (ptr && p.lastPtr && Math.hypot(ptr[0] - p.lastPtr[0], ptr[1] - p.lastPtr[1]) > .5) { mouse = ptr.slice(); p.aimMode = 'mouse'; }
  if (ptr) p.lastPtr = ptr.slice();
  if (Math.hypot(mx, my) > .05 || Math.hypot(ax, ay) > .05) p.aimMode = 'stick';
  return { mx, my, ax, ay, mouse, ptr: p.aimMode === 'mouse' ? ptr : null, fire: inp.pressed('fire'), pump: inp.pressed('pump'), scope: inp.down('scope'), scopeP: inp.pressed('scope'), breath: inp.down('breath'), call: inp.pressed('call'), fireHeld: inp.down('fire') };
};

/* ---------- aim, sway, weapon ---------- */
function updateReticle(p, I, dt, ctx) {
  const W = ctx.view.W, H = ctx.view.H;
  const sc = p.scoped ? .45 : 1;
  if (p.bot) { p.rx = p.bot.rx; p.ry = p.bot.ry; }
  else if (p.aimMode === 'mouse' && I.ptr) { p.rx = I.ptr[0]; p.ry = I.ptr[1]; }
  else {
    const mag = Math.hypot(I.mx, I.my), curve = Math.pow(Math.min(1, mag), 1.7);
    p.ramp = p.ramp || 0; p.ramp = mag > .05 ? Math.min(1, p.ramp + dt / .15) : 0;
    let dx = mag > 0 ? I.mx / mag * curve : 0, dy = mag > 0 ? I.my / mag * curve : 0;
    let sp = BB.T.reticleSpeed * sc * p.ramp;
    /* assist: friction near live target zones (never the mouse) */
    const as = (BB.game && BB.game.settings && BB.game.settings.assist) || 'Light';
    if (as !== 'Off' && mag > .05) { const fr = as === 'Strong' ? BB.T.assist * .7 : BB.T.assist; if (BB.nearTarget(ctx, p.rx, p.ry, 9)) sp *= fr; }
    p.rx += dx * sp * dt + I.ax * BB.T.reticleSpeed * .3 * sc * dt; p.ry += dy * sp * dt + I.ay * BB.T.reticleSpeed * .3 * sc * dt;
  }
  p.rx = clamp(p.rx, 0, W - 1); p.ry = clamp(p.ry, 0, H - 1);
}
BB.nearTarget = (ctx, x, y, rad) => {
  const v = ctx.view;
  for (const a of ctx.animals) {
    if (a.dead || !a.target || a.mode === 'hidden') continue;
    const pr = BB.project(v, a.x, a.y, a.z); if (!pr) continue;
    const zs = BB.animalZones(a, pr[0], pr[1], pr[2]);
    for (const z of zs) { if (z.kind === 'antler') continue; const cx = z.cx !== undefined ? z.cx : (z.x0 + z.x1) / 2, cy = z.cy !== undefined ? z.cy : (z.y0 + z.y1) / 2; if (Math.hypot(cx - x, cy - y) < rad + (z.r || 2)) return true; }
  }
  return false;
};
function updateWeapon(p, I, dt, ctx) {
  const rack = ctx.def.bonus ? BB.BONUS[ctx.def.bonus].rack : BB.T.rackTime;
  /* scope */
  const wantScope = (!!I.scope || !!p.forceScope) && !p.benched;
  const sk = BB.game && BB.game.settings && BB.game.settings.scopeToggle === 'Toggle';
  if (sk) { if (I.scopeP) p.scoped = !p.scoped; } else p.scoped = wantScope;
  if (ctx.def.bonus) p.scoped = false;
  p.scopeT = clamp(p.scopeT + (p.scoped ? dt : -dt) / .15, 0, 1);
  /* breath */
  const A = BB.T.sway;
  if (p.scoped && I.breath && p.breathT > 0 && p.shaky <= 0) { p.breathHeld = true; p.breathT = Math.max(0, p.breathT - dt); if (p.breathT <= 0) { p.shaky = 1.5; p.breathHeld = false; } }
  else { p.breathHeld = false; p.breathT = Math.min(BB.T.breath, p.breathT + dt * 1.2); }
  if (p.shaky > 0) p.shaky -= dt;
  p.swayT += dt;
  const t = p.swayT, k = p.scoped ? (p.breathHeld ? .15 : p.shaky > 0 ? 2 : 1) : (ctx.def.bonus ? 0 : .25);
  p.sx = A * k * (.6 * Math.sin(1.3 * t) + .4 * Math.sin(2.9 * t + 1)); p.sy = A * k * (.5 * Math.sin(1.7 * t + 2) + .3 * Math.sin(3.3 * t));
  p.ax = p.rx + p.sx; p.ay = p.ry + p.sy;
  /* pump / reload timers */
  if (p.rackT > 0) { p.rackT -= dt; if (p.rackT <= 0) { p.chambered = true; } }
  if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) { p.rounds = Math.round(ctx.def.bonus ? BB.BONUS[ctx.def.bonus].rounds : BB.T.rounds); p.chambered = true; BB.sfx('pumpIn'); } }
  p.kick = Math.max(0, p.kick - dt * 4); p.dry = Math.max(0, p.dry - dt * 3);
  if (p.callCd > 0) p.callCd -= dt;
  if (p.benched) return;
  const auto = (BB.game && BB.game.settings && BB.game.settings.autopump === 'On') || (p.bot && p.bot.auto);
  if (!p.chambered && p.rackT <= 0 && p.reloadT <= 0 && auto && ctx.t - p.lastShotT > .12) tryPump(p, ctx);
  if (I.pump) tryPump(p, ctx);
  if (I.fire) tryFire(p, ctx);
  if (I.call) tryCall(p, ctx);
}
function tryPump(p, ctx) {
  if (p.rackT > 0 || p.reloadT > 0 || p.chambered) return false;
  if (p.rounds > 0) { p.rackT = ctx.def.bonus ? BB.BONUS[ctx.def.bonus].rack : BB.T.rackTime; p.rounds = p.rounds; BB.sfx('pump'); BB.bus.emit('pump', { p }); return true; }
  p.reloadT = BB.T.reloadTime; BB.sfx('reload'); BB.bus.emit('reload', { p }); if (ctx.def.bonus) p.reloadT *= .6; return true;
}
BB.tryPump = tryPump;
function tryFire(p, ctx) {
  if (ctx.state !== 'play' && ctx.state !== 'endwait') return;
  if (p.benched) return;
  if (!p.chambered || p.reloadT > 0 || p.rackT > 0 || ctx.t - p.lastShotT < .1) {
    if (!p.chambered && p.rackT <= 0 && p.reloadT <= 0) { p.dry = 1; BB.sfx('click'); p.dryCount = (p.dryCount || 0) + 1; if (p.dryCount <= 2 && !p.bot) BB.bark('pump', '#9fd0ff'); }
    return;
  }
  p.chambered = false; if (!BB.dev.infinite) p.rounds = Math.max(0, p.rounds - 1); p.lastShotT = ctx.t; p.kick = 1;
  p.shots++; ctx.shotsFired++;
  if (BB.dev.infinite) p.rounds = Math.round(BB.T.rounds);
  BB.sfx('gun'); BB.sfxLater('echo', .35, { vol: .5 }); BB.sfxLater('echo', .7, { vol: .25 });
  BB.fx.shake = Math.max(BB.fx.shake, .25); ctx.view.kickV = (ctx.view.kickV || 0) + .5;
  resolveShot(p, ctx);
  BB.bus.emit('shot', { p });
  const spookAt = ctx.lastImpactWorld;
  BB.spookAll(ctx, 1, spookAt);
  if (p.rounds === 0 && p.reloadT <= 0 && !p.bot) { if (!p.reloadHint) { p.reloadHint = 1; BB.bark('reload', '#9fd0ff'); } }
}
function tryCall(p, ctx) {
  if (p.callCd > 0 || p.calls <= 0 || ctx.def.bonus || ctx.def.range && !ctx.rangeCall) return false;
  p.calls--; p.callCd = 3; BB.sfx('call_' + ctx.hunt.species); BB.bus.emit('call', { p });
  const n = BB.callAnimals(ctx, [0, 0], BB.T.callFreeze);
  ctx.calledOnce = true; ctx.callCount = (ctx.callCount || 0) + 1; ctx.lastCallT = ctx.t;
  for (const a of ctx.animals) if (a.hiddenUntilCall && a.mode === 'hidden') { a.mode = 'walk'; a.hiddenUntilCall = false; a.gait = 'walk'; a.pose = 'walk'; a.path = [a.afterCall.slice()]; a.exitTo = a.afterCall; a.face = a.afterCall[0] > a.x ? 1 : -1; BB.banner('HE ANSWERED!', '#9fd18a'); }
  if (ctx.trophyState && ctx.trophyState.onCall) ctx.trophyState.onCall(ctx, p);
  if (ctx.range && ctx.range.onCall) ctx.range.onCall(ctx);
  return true;
}
BB.fireFor = (p, ctx) => tryFire(p, ctx);
BB.callFor = (p, ctx) => tryCall(p, ctx);

/* ---------- shot resolution ---------- */
BB.pickShot = (ctx, ax, ay) => {
  const v = ctx.view;
  const cands = [];
  /* animals */
  for (const a of ctx.animals) {
    if (a.mode === 'hidden' || a.dead || a.invisible) continue;
    const pr = BB.project(v, a.x, a.y, a.z); if (!pr) continue;
    if (a.fogHidden && ctx.fogA > .5) continue;
    const zones = BB.animalZones(a, pr[0], pr[1], pr[2]); const zone = BB.zoneAt(zones, ax, ay);
    if (!zone) continue; if (BB.occluded(ctx, v, ax, ay, pr[3])) continue;
    cands.push({ D: pr[3], kind: 'animal', a, zone, pr });
  }
  for (const c of ctx.critters) {
    if (c.dead || c.def.noHit) continue; const pr = BB.project(v, c.x, c.y, c.z || 0); if (!pr) continue;
    const bx = BB.critterBox(c, pr[0], pr[1], pr[2]); if (!bx) continue;
    const dx = (ax - bx.cx) / bx.rx, dy = (ay - bx.cy) / bx.ry; if (dx * dx + dy * dy > 1) continue;
    if (BB.occluded(ctx, v, ax, ay, pr[3])) continue;
    cands.push({ D: pr[3], kind: 'critter', c, pr });
  }
  for (const pr0 of ctx.props) {
    if (!pr0.bw) continue; const pr = BB.project(v, pr0.x, pr0.y, pr0.z); if (!pr) continue;
    const w = pr0.bw * pr0.s * pr[2], h = pr0.bh * pr0.s * pr[2];
    if (pr0.type === 'scarecrow') { if (Math.abs(ax - pr[0]) < w * .5 && ay > pr[1] - h && ay < pr[1]) cands.push({ D: pr[3], kind: 'hank', prop: pr0, pr }); continue; }
    if (['oak', 'maple', 'birch', 'aspen', 'pine', 'spruce', 'tamarack', 'snag'].includes(pr0.type)) { const tw = Math.max(1, (pr0.type === 'oak' ? .6 : pr0.type === 'snag' ? .4 : .32) * pr0.s * pr[2]); if (Math.abs(ax - pr[0]) < tw / 2 && ay > pr[1] - 4.5 * pr0.s * pr[2] && ay < pr[1]) cands.push({ D: pr[3], kind: 'prop', prop: pr0, pr, wood: true }); }
    else if (['rock', 'boulder', 'log', 'barn', 'hay', 'trap'].includes(pr0.type)) { if (Math.abs(ax - pr[0]) < w * .5 && ay > pr[1] - h && ay < pr[1]) cands.push({ D: pr[3], kind: 'prop', prop: pr0, pr, rock: pr0.type !== 'log' && pr0.type !== 'barn' && pr0.type !== 'hay' }); }
  }
  cands.sort((a, b) => a.D - b.D);
  return cands;
};
function resolveShot(p, ctx) {
  const v = ctx.view, ax = p.ax, ay = p.ay;
  const cands = BB.pickShot(ctx, ax, ay);
  const first = cands[0];
  let impactD = first ? first.D : 90;
  ctx.lastImpactWorld = null;
  if (!first) {
    /* terrain/water/sky */
    if (ay > v.hy) { BB.puff(ax, ay, ctx.terrain.water(...BB.unproject(v, ax, clamp(v.camH * v.f / Math.max(1, ay - v.hy), 4, 300))) ? 'splash' : 'dust', 8); } else BB.puff(ax, ay, 'dust', 2);
    ctx.lastImpactWorld = ay > v.hy ? BB.unproject(v, ax, clamp(v.camH * v.f / Math.max(1, ay - v.hy), 4, 300)) : null;
    BB.sfx('thud'); onMiss(p, ctx); return;
  }
  ctx.lastImpactWorld = [first.a ? first.a.x : first.c ? first.c.x : first.prop.x, first.a ? first.a.y : first.c ? first.c.y : first.prop.y];
  if (first.kind === 'prop') { BB.puff(ax, ay, first.wood ? 'bark' : 'spark', 7); BB.sfx(first.wood ? 'knock' : 'ricochet'); onMiss(p, ctx, true); return; }
  if (first.kind === 'hank') { p.hits++; BB.puff(ax, ay, 'dust', 6); BB.pop('-250', ax, ay - 8, '#ff7a6a', true); BB.banner("HANK'S GOT FEELIN'S!", '#ff9a6a'); BB.sfx('thud'); addScore(p, -250, ctx); p.perfect = false; if (ctx.bonusState) ctx.bonusState.hank++; return; }
  if (first.kind === 'critter') { hitCritter(p, first.c, first.pr, ctx); return; }
  hitAnimal(p, first, ctx);
}
function onMiss(p, ctx, blocked) {
  p.perfect = false; p.sweep = p.sweep; ctx.misses = (ctx.misses || 0) + 1;
  if (!blocked && !p.bot) { const BR = BB.fx; if (BB.RNG.fx()() < .35) BB.bark('miss', '#c8c8d8'); }
  BB.bus.emit('miss', { p });
  if (ctx.bonusState) ctx.bonusState.missed++;
}
function hitCritter(p, c, pr, ctx) {
  const d = c.def; c.dead = true; c.deadT = 0; c.vz = 4; c.vx = (BB.fxr(-1, 1)) * 2; c.hitBy = p;
  p.hits++; BB.puff(pr[0], pr[1] - (c.alt || 0) * pr[2], d.shape === 'bird' || d.shape === 'eagle' ? 'feather' : d.shape === 'clay' ? 'spark' : d.shape === 'ball' || d.shape === 'hat' ? 'snow' : 'fur', 10);
  BB.sfx(d.shape === 'bird' ? 'cawhit' : 'thud');
  if (c.def.stink) { BB.fx.stink = 3; BB.puff(pr[0], pr[1] - 6, 'stink', 24); BB.sfx('stink'); }
  let pts = d.pts;
  if (c.type === 'snowmoose') pts = 0;
  if (c.isBigHat) pts = 1000;
  const prot = d.protected;
  if (prot) { p.penalties++; p.sweep = false; p.perfect = false; BB.banner(d.call, '#ff7a6a'); BB.caption('EMCEE', d.call, 2.5); }
  else if (pts > 0) { BB.banner(d.call, '#ffd36a'); }
  if (ctx.bonusState) { const bs = ctx.bonusState; if (!prot) bs.hits++; if (c.golden) bs.golden++; }
  if (pts !== 0) { addScore(p, pts, ctx); BB.pop((pts > 0 ? '+' : '') + pts, pr[0], pr[1] - 14, pts > 0 ? '#ffd36a' : '#ff7a6a', Math.abs(pts) >= 400); }
  ctx.events.push({ t: ctx.t, type: prot ? 'penalty' : 'critter', p, name: d.name, pts });
  BB.bus.emit(prot ? 'penalty' : 'critter', { p, c });
  if (c.owner && c.owner.onKill) c.owner.onKill(c);
}
function addScore(p, pts, ctx) { p.siteScore = Math.max(0, p.siteScore + pts); }
BB.addScore = addScore;
function hitAnimal(p, hit, ctx) {
  const a = hit.a, zone = hit.zone, info = BB.ZONE_INFO[zone], pr = hit.pr, sp = BB.SPECIES[a.species];
  const ax = p.ax, ay = p.ay;
  const loc = BB.toLocal(a, pr[0], pr[1], pr[2], ax, ay);
  a.hits.push({ p: p.idx, zone, lx: loc[0], ly: loc[1], lethal: info.lethal });
  p.hits++; ctx.lastHit = { a, zone };
  a.hitByShot = true;
  BB.puff(ax, ay, 'fur', zone === 'antler' ? 3 : 10); BB.sfx(zone === 'antler' ? 'ping' : 'hit');
  if (a.paper) { BB.bus.emit('paperHit', { a, zone, p }); BB.sfx('ping'); return; }
  if (zone === 'antler') { BB.pop('PING', ax, ay - 8, '#ffe9a0'); BB.animalFlee(a, .1); a.fleeMult = 1; return; }
  if (a.protected) {
    /* does and fawns */
    a.dead = true; a.deadT = 0; a.killer = p; p.penalties++; p.sweep = false; p.perfect = false;
    const casual = BB.game && BB.game.settings && BB.game.settings.rule === 'Casual';
    ctx.doeHit = true;
    if (BB.dev.god) BB.banner('GOD MODE: NO PENALTY', '#9fd0ff');
    else if (casual) { addScore(p, -300, ctx); BB.pop('-300', ax, ay - 8, '#ff7a6a', true); BB.banner(a.age === 'young' ? BB.BARKS.fawn[0] : BB.BARKS.doe[1], '#ff7a6a'); }
    else { p.benched = true; BB.banner(a.age === 'young' ? BB.BARKS.fawn[0] : BB.pickFrom(BB.BARKS.doe, 'fx'), '#ff7a6a'); BB.caption('EMCEE', 'BENCHED FOR THE SITE', 2.5); }
    BB.sfx('doe'); BB.bus.emit('doe', { p, a }); ctx.events.push({ t: ctx.t, type: 'doe', p });
    BB.spookAll(ctx, 1, [a.x, a.y]); return;
  }
  if (a.fixedHp) { /* trophy handles its own */ }
  const dmg = info.dmg * (a.bigDmgMult || 1);
  a.hp -= dmg; a.wounded = true; a.lastHitter = p;
  const D = hit.D; a.distAtHit = D;
  const spdNow = a.speed || 0;
  const running = spdNow > sp.trot * BB.T.animalSpeed * .95;
  if (info.lethal || a.hp <= 0) killAnimal(p, a, zone, D, running, ctx, pr);
  else {
    a.limp = true; a.wounded = true; BB.pop(info.call, ax, ay - 10, '#ffb870'); BB.banner(info.call, '#ffb870'); BB.animalFlee(a, .05); a.fleeMult = .8; if (a.trophyHook) a.trophyHook(ctx, zone);
  }
}
function killAnimal(p, a, zone, D, running, ctx, pr) {
  a.dead = true; a.deadT = 0; a.killer = p; a.killZone = zone; a.mode = 'dead';
  const sp = BB.SPECIES[a.species], info = BB.ZONE_INFO[zone];
  const metres = D;
  const base = sp.base + sp.perPt * (a.pts || 0);
  const dm = clamp(1 + (metres - 25) / BB.T.distanceSlope, 1, 3.5);
  let pts = base * dm * info.mult() * (running ? BB.T.runningMult : 1) * (a.trophyMult || 1);
  let quick = 0; if (a.seenAt >= 0 && ctx.t - a.seenAt <= 1.0) quick = 50;
  let multi = 0; if (ctx.t - p.lastKillT < 1.5) { p.streak++; multi = p.streak === 1 ? 250 : 750; } else p.streak = 0;
  p.lastKillT = ctx.t;
  pts = Math.round(pts) + quick + multi;
  const oneShot = a.hits.length === 1 && info.lethal;
  if (!oneShot) p.sweep = false;
  addScore(p, pts, ctx); p.kills++; p.siteKills++; BB.records.kills++;
  const rec = { id: a.id, name: sp.male, species: a.species, pts: a.pts, zone, metres: Math.round(metres), running, quick, multi, score: pts, p: p.idx, shots: a.hits.length, trophy: !!a.trophyMult, hits: a.hits.slice(), face: a.face };
  ctx.kills.push(rec);
  BB.pop('+' + pts, pr[0], pr[1] - 16, '#ffd36a', true);
  BB.banner(info.call, '#ffd36a', 'WHAT A SHOT!'.length ? '' : '');
  const lines = [];
  if (a.trophyMult) BB.banner('TROPHY BAGGED!', '#ffe27a');
  else if (multi === 250) BB.banner('DOUBLE!', '#ffa84a'); else if (multi === 750) BB.banner(BB.BARKS.triple[0], '#ff7a4a');
  else if (quick) BB.banner('QUICK DRAW!', '#9fe0ff'); else if (running) BB.banner('RUNNING SHOT!', '#9fe0ff'); else if (metres > 90) BB.banner(BB.BARKS.long[0], '#9fe0ff'); else BB.bark('kill');
  BB.sfx('kill'); BB.bus.emit('kill', { p, a, rec }); BB.fx.shake = Math.max(BB.fx.shake, .15);
  if (a.trophyHook) a.trophyHook(ctx, 'dead');
  ctx.events.push({ t: ctx.t, type: 'kill', p, rec });
}

/* ---------- site update ---------- */
BB.updateSite = (ctx, dt) => {
  const players = ctx.players;
  ctx.sceneTime += dt;
  if (ctx.state === 'play' || ctx.state === 'endwait') {
    ctx.t += dt;
    BB.setYaw(ctx, ctx.t);
    /* breathing + kick */
    const v = ctx.view; v.kickV = (v.kickV || 0) * Math.max(0, 1 - dt * 5); v.offY = -(v.kickV || 0) * 1.5; v.shakeX = (BB.fxr(-1, 1)) * BB.fx.shake * 3; v.shakeY = (BB.fxr(-1, 1)) * BB.fx.shake * 3 + Math.sin(ctx.t * 1.1) * .4;
    if (ctx.def.vantage === 'canoe') v.shakeY += Math.sin(ctx.t * 1.6) * 1.5;
    v.roll = 0; BB.updateView(v);
    /* spawns */
    while (ctx.spawnIdx < ctx.spawns.length && ctx.spawns[ctx.spawnIdx].t / (BB.T.siteTime > 0 ? 1 : 1) <= ctx.t * (1) ) { const s = ctx.spawns[ctx.spawnIdx++]; if (s.k === 'doe' || s.k === 'fawn') { if (BB.T.doeShare < .01 || BB.hash2(ctx.spawnIdx, 3, 3) > BB.T.doeShare * .55 + .45) { if (BB.T.doeShare < .99) continue; } } BB.spawnFromSpec(ctx, s); }
    if (ctx.trophyState) ctx.trophyState.update(ctx, dt);
    if (ctx.bonusState) ctx.bonusState.update(ctx, dt);
    if (ctx.range) ctx.range.update(ctx, dt);
    /* actors */
    for (const a of ctx.animals) {
      if (a.paper || a.manual) { a.z = ctx.terrain(a.x, a.y); BB.rigJoints(a); continue; }
      const ox = a.x, oy = a.y; BB.updateAnimal(a, dt, ctx); a.vx = dt > 0 ? (a.x - ox) / dt : 0; a.vy = dt > 0 ? (a.y - oy) / dt : 0;
      if (a.seenAt < 0 && !a.dead && a.mode !== 'hidden') { const pr = BB.project(v, a.x, a.y, a.z + .8); if (pr && pr[0] > 0 && pr[0] < v.W && pr[1] > 0 && pr[1] < v.H && !BB.occluded(ctx, v, pr[0], pr[1], pr[3])) a.seenAt = ctx.t; }
      /* charging bull veer */
      if (a.charge && a.mode === 'charge' && Math.hypot(a.x, a.y) < 16) { a.charge = false; a.mode = 'flee'; a.gait = 'run'; a.path = [a.flee.slice()]; a.exitTo = a.flee; BB.banner('HE VEERED OFF!', '#9fd0ff'); }
    }
    for (const c of ctx.critters) {
      BB.updateCritter(c, dt, ctx);
      if ((c.type === 'wolf' || c.type === 'coyote') && c.mode === 'run') { /* chases */ }
    }
    /* escapes */
    for (const a of ctx.animals) {
      if (a.escaped && !a.counted) {
        a.counted = true; a.mode = 'gone';
        if (a.target) { ctx.escaped.push(a); if (!a.noEscapeBanner) { BB.bark(a.wounded ? 'lost' : 'escape', '#ff9a6a'); } if (a.wounded && a.lastHitter) { addScore(a.lastHitter, -100, ctx); a.lastHitter.penalties++; ctx.lost.push(a); BB.pop('-100', 240, 60, '#ff7a6a'); } BB.bus.emit('escape', { a }); }
      }
    }
    ctx.animals = ctx.animals.filter(a => a.mode !== 'gone' || a.keep);
    ctx.critters = ctx.critters.filter(c => !(c.escaped) && !(c.dead && c.deadT > 1.8));
    ctx.animals = ctx.animals.filter(a => !(a.dead && a.deadT > 12));
    /* hints */
    /* end rules */
    if (ctx.state === 'play') {
      if (!ctx.def.range && !ctx.def.bonus) {
        const remaining = ctx.animals.filter(a => a.target && !a.dead && !a.escaped && !a.paper && a.mode !== 'gone').length;
        const spawnedAll = ctx.spawnIdx >= ctx.spawns.length && !ctx.trophyPending;
        const allBenched = players.length > 0 && players.every(p => p.benched);
        if ((spawnedAll && remaining === 0 && ctx.t > 2 && !(ctx.trophyState && !ctx.trophyState.done)) || ctx.t >= ctx.timeLimit || allBenched || (ctx.trophyState && ctx.trophyState.done)) {
          ctx.state = 'endwait'; ctx.endT = 0; ctx.endReason = ctx.t >= ctx.timeLimit ? 'time' : allBenched ? 'benched' : 'clear';
          BB.bark(ctx.endReason === 'time' ? 'time' : 'clear', '#ffd36a'); BB.sfx('whistle');
        }
      }
    } else if (ctx.state === 'endwait') {
      ctx.endT += dt; if (ctx.endT > 1.6) { ctx.state = 'ended'; BB.finishSite(ctx); }
    }
  }
  /* players */
  for (const p of players) {
    if (p.bot) BB.botUpdate(p, ctx, dt);
    const I = BB.readInput(p, ctx);
    if (ctx.state === 'play' || ctx.state === 'endwait') { updateReticle(p, I, dt, ctx); updateWeapon(p, I, dt, ctx); }
  }
  BB.updateFx(dt);
};
/* totals and stars for a finished site */
BB.finishSite = (ctx) => {
  const n = ctx.bucksTotalLive || ctx.bucksTotal;
  ctx.results = ctx.players.map(p => {
    const acc = p.shots > 0 ? p.hits / p.shots : 0;
    const bonuses = [];
    if (!ctx.def.range && !ctx.def.bonus) {
      if (acc >= .5 && p.shots > 0) bonuses.push(['ACCURACY', Math.round(acc * 1000)]);
      const killedAll = ctx.kills.filter(k => k.p === p.idx).length;
      const allBagged = ctx.animals.filter(a => a.target && !a.dead && !a.paper).length === 0 && ctx.escaped.length === 0;
      if (allBagged && p.sweep && p.siteKills > 0 && p.siteKills === ctx.kills.length) bonuses.push(['CLEAN SWEEP', 1000]);
      if (p.penalties === 0) bonuses.push(['NO PENALTIES', 200]);
    }
    const bonusTotal = bonuses.reduce((s, b) => s + b[1], 0);
    const total = Math.max(0, p.siteScore + bonusTotal);
    const bucks = p.siteKills;
    let stars = 0;
    if (bucks > 0) stars = 1; if (n > 0 && ctx.kills.length >= n) stars = 2; if (stars === 2 && p.sweep && p.penalties === 0) stars = 3;
    return { p, siteScore: p.siteScore, bonuses, total, acc, stars, kills: ctx.kills.filter(k => k.p === p.idx), shots: p.shots, hits: p.hits, penalties: p.penalties, benched: p.benched };
  });
  for (const r of ctx.results) { r.p.huntScore += r.total; r.p.score += r.total; r.p.stars = r.stars; }
  BB.bus.emit('siteEnd', { ctx });
};

/* ---------- bonus games ---------- */
BB.initBonus = ctx => {
  const type = ctx.def.bonus, rr = BB.rng(BB.hashStr('bonus' + type) + ctx.seed);
  const bs = ctx.bonusState = { type, hits: 0, missed: 0, golden: 0, hank: 0, spawned: 0, timer: 0, wave: 0, done: false, perfect: false };
  ctx.timeLimit = BB.BONUS[type].time; ctx.bucksTotal = 0;
  ctx.hankProp = ctx.props.find(p => p.type === 'scarecrow');
  bs.update = (ctx, dt) => {
    bs.timer -= dt;
    if (ctx.state !== 'play') return;
    if (type === 'crows' && bs.timer <= 0) {
      bs.timer = 1.6 + rr() * 1.4; const n = 2 + Math.floor(rr() * 3); const golden = ctx.t > 8 && ctx.t % 11 < 1.6 && !bs.goldenOut;
      for (let i = 0; i < n; i++) {
        const gold = golden && i === 0; if (gold) bs.goldenOut = true;
        const x = (rr() - .5) * 70, y = 38 + rr() * 22;
        const c = BB.makeCritter(gold ? 'goldcrow' : 'crow', { x, y, alt: .6, life: 6, mode: 'fly', to: [ (rr() - .5) * 6, 32 ], perch: { alt: 2.6 }, face: x < 0 ? 1 : -1 });
        const dx = c.to[0] - x, dy = c.to[1] - y, l = Math.hypot(dx, dy) || 1; c.vx = dx / l * 9; c.vy = dy / l * 9; c.tAlt = 2.6; c.flapSine = true; c.def = Object.assign({}, c.def);
        c.owner = { onKill: () => { if (gold) bs.goldenOut = false; } };
        ctx.critters.push(c); bs.spawned++;
        /* after perching, fly off */
        BB.game.after(2.8 + rr() * .8, () => { if (!c.dead && !c.escaped) { c.mode = 'fly'; c.perch = null; c.to = [(rr() > .5 ? 1 : -1) * 90, 80]; c.vx = (c.to[0] - c.x) / 9; c.vy = (c.to[1] - c.y) / 9; c.tAlt = 9; c.face = c.vx >= 0 ? 1 : -1; if (gold) bs.goldenOut = false; } });
      }
    }
    if (type === 'saucers' && bs.timer <= 0) {
      bs.timer = 1.1 + rr() * .7; bs.wave++;
      const mode = bs.wave % 5, make = (tx, sx, vxm, vzm, gold) => { const c = BB.makeCritter(gold ? 'goldclay' : 'clay', { x: tx, y: 40, alt: 1.2, life: 6, mode: 'fly' }); c.vx = vxm; c.vy = 9 + rr() * 4; c.vz = vzm; ctx.critters.push(c); bs.spawned++; BB.sfx('trapRelease'); };
      const gold = rr() < .15;
      if (mode === 0 || mode === 2) make(-10, 0, 7 + rr() * 5, 11 + rr() * 3, gold);
      else if (mode === 1) { make(-10, 0, 7, 12); make(12, 0, -7, 12); }
      else if (mode === 3) { make(12, 0, -10, 12); make(-10, 0, 9, 13); }
      else make(0, 0, (rr() - .5) * 6, 22, gold);
    }
    if (type === 'snowballs') {
      bs.pop = bs.pop || []; bs.popT = (bs.popT || 0) - dt;
      if (bs.popT <= 0 && bs.pop.filter(m => !m.gone).length < 3) {
        bs.popT = 1.9 + rr() * 1.3; const x = (rr() - .5) * 60, y = 34 + rr() * 22;
        const man = BB.makeCritter('snowmanC', { x, y, life: 5.5, mode: 'idle', def: { name: 'Snowman', pts: 0, size: .7, motion: 'idle', shape: 'snowman', noHit: true } });
        const hat = BB.makeCritter('hat', { x, y: y - .01, alt: 2.35, life: 5.5, mode: 'idle', def: Object.assign({}, BB.CRITTERS.hat, { motion: 'idle' }) });
        man.hat = hat; hat.man = man; man.throwT = 1.4 + rr(); man.rise = 0;
        ctx.critters.push(man, hat); bs.pop.push(man);
        hat.owner = { onKill: () => { hat.def = hat.def; man.bare = true; } };
      }
      for (const m of bs.pop) {
        if (m.dead || m.escaped) { m.gone = true; continue; }
        m.rise = Math.min(1, m.rise + dt * 3); m.throwT -= dt;
        if (m.throwT <= 0 && !m.bare === true || (m.throwT <= 0 && m.bare)) { m.throwT = 1.9 + rr(); const ball = BB.makeCritter('snowball', { x: m.x, y: m.y, alt: 1.8, life: 4, mode: 'fly' }); ball.def = Object.assign({}, ball.def, { motion: 'fly' }); const sp = 6; ball.vx = (rr() - .5) * 4 - m.x * .12; ball.vy = -(m.y - 4) / 1.9; ball.vz = 1.2; ball.flapSine = false; ball.isBall = true; ctx.critters.push(ball); BB.sfx('whoosh'); }
      }
      if (ctx.t > 20 && !bs.mooseUp) {
        bs.mooseUp = true; BB.banner('THE SNOWMOOSE RISES!', '#bfe3ff'); BB.sfx('rumble');
        const m = BB.makeCritter('snowmoose', { x: 0, y: 62, life: 11, mode: 'idle', def: Object.assign({}, BB.CRITTERS.snowmoose, { noHit: true }) });
        const hat = BB.makeCritter('hat', { x: 4.6, y: 61.99, alt: 8.8, scale: 2.8, life: 11, mode: 'idle', def: Object.assign({}, BB.CRITTERS.hat, { motion: 'idle', pts: 1000, call: 'THE SNOWMOOSE LOSES ITS HAT! 1000!' }) }); hat.isBigHat = true; hat.big = true;
        ctx.critters.push(m, hat);
      }
    }
    /* balls that reach the camera */
    for (const c of ctx.critters) if (c.isBall && !c.dead && c.y < 5) { c.escaped = true; BB.fx.splat = 2; BB.sfx('splat'); for (const p of ctx.players) p.siteScore = Math.max(0, p.siteScore); }
    if (ctx.t >= ctx.timeLimit - .01 && ctx.state === 'play') bs.done = true;
  };
  /* bonus ends: time or out of rounds with empty bands */
  ctx.def.endCheck = true;
};
BB.finishBonus = (ctx) => {
  const bs = ctx.bonusState; const res = ctx.players.map(p => {
    const tot = bs.spawned > 0 ? bs.hits / Math.max(1, ctx.type === 'snowballs' ? (bs.hits + bs.missed) : bs.spawned) : 0;
    const perfect = p.shots > 0 && p.hits >= p.shots && p.penalties === 0 && !bs.hank && p.hits >= 6;
    const total = perfect ? p.siteScore * 2 : p.siteScore;
    return { p, siteScore: p.siteScore, perfect, total, hits: p.hits, shots: p.shots, bonuses: perfect ? [['PERFECT x2', p.siteScore]] : [] };
  });
  ctx.results = res; for (const r of res) { r.p.huntScore += r.total; r.p.score += r.total; }
  BB.bus.emit('bonusEnd', { ctx });
};

/* ---------- trophies ---------- */
BB.initTrophy = ctx => {
  const type = ctx.def.trophy, hunt = ctx.hunt, sp = hunt.species;
  const st = ctx.trophyState = { type, done: false, windows: 0, phase: 0, lost: false, charges: 0, openT: 0 };
  ctx.trophyPending = true; ctx.bucksTotal = 1; ctx.bucksTotalLive = 1;
  if (type === 'ironrack') {
    const a = BB.makeAnimal({ species: 'whitetail', sex: 'male', pts: 14, x: -42, y: 78, to: [46, 90], exitTo: [46, 90], trophyMult: 3, callImmune: true, fogHidden: true }, ctx);
    a.mode = 'walk'; a.gait = 'walk'; a.path = [[46, 84]]; a.hpMult = 1; a.noEscapeBanner = true; ctx.animals.push(a); st.a = a; st.speed = .8;
    const d1 = BB.makeAnimal({ species: 'whitetail', sex: 'female', x: -48, y: 70, to: [50, 76], exitTo: [50, 76], callImmune: true }, ctx); d1.mode = 'idle'; d1.invisible = true; st.doe = d1; ctx.animals.push(d1); d1.mode = 'hidden';
    st.update = (ctx, dt) => {
      const t = ctx.t, w = (t > 6 && t < 10) || (t > 17 && t < 21) || (t > 29 && t < 34);
      const target = w ? 0 : .8; ctx.fogA += (target - ctx.fogA) * Math.min(1, dt * 1.5);
      if (w && !st.wasOpen) { st.windows++; st.wasOpen = true; BB.banner(st.windows === 1 ? 'TROPHY SPOTTED!' : 'THERE HE IS!', '#ffe27a'); if (st.windows === 1) BB.caption('DUB', "Count the points. Fourteen. That's him.", 3); }
      if (!w) st.wasOpen = false;
      st.a.callImmune = !(t > 29 && t < 34);
      if (st.windows === 3 && !st.doeOut && t > 30) { st.doeOut = true; const d = st.doe; d.mode = 'walk'; d.gait = 'walk'; d.pose = 'walk'; d.x = -22; d.y = 76; d.path = [[40, 72]]; d.invisible = false; d.face = 1; d.callImmune = true; BB.caption('DUB', 'A doe! Wait for her to clear.', 2.5); }
      st.a.speedHold = 0;
      if (!st.done && (st.a.escaped || (st.a.dead))) { st.done = true; ctx.trophyPending = false; if (!st.a.dead) { BB.banner(BB.BARKS.trophyLost[0], '#ff9a6a'); st.lost = true; } }
      if (!st.done && ctx.t > 44 && !st.a.dead) { st.done = true; ctx.trophyPending = false; st.lost = true; BB.banner(BB.BARKS.trophyLost[0], '#ff9a6a'); }
      st.a.alpha = 1;
    };
    st.onCall = (ctx) => { if (ctx.t > 29 && ctx.t < 34 && !st.a.dead) { st.a.mode = 'frozen'; st.a.frozenT = 1.0; st.a.preFreeze = 'walk'; st.a.pose = 'frozen'; BB.caption('DUB', 'Now! He froze!', 2); } };
    st.a.trophyHook = (ctx, z) => { };
  } else if (type === 'duke') {
    const open = [[-28, 120], [-6, 112], [16, 118], [34, 124]];
    const a = BB.makeAnimal({ species: 'elk', sex: 'male', pts: 14, x: 0, y: 150, trophyMult: 3, callImmune: true }, ctx);
    a.mode = 'hidden'; a.invisible = false; a.hp = 1.5; a.noEscapeBanner = true; ctx.animals.push(a); st.a = a; st.open = open.map(o => polar(o[0], o[1])); st.calls = 0; st.at = -1; st.visT = 0; st.bugleT = 1.5;
    st.show = i => { const o = st.open[i]; a.x = o[0]; a.y = o[1]; a.mode = 'stand'; a.pose = 'alert'; a.gait = 'stand'; a.face = o[0] > 0 ? -1 : 1; a.grazeT = 99; a.linger = 99; a.callImmune = true; st.visT = i === 1 ? 3.2 : 4; st.at = i; if (i === 1) BB.sfx('cowcall'); };
    st.hide = () => { a.mode = 'hidden'; st.at = -1; };
    st.update = (ctx, dt) => {
      const t = ctx.t; st.bugleT -= dt;
      if (st.bugleT <= 0 && st.at < 0 && st.calls < 5) { st.bugleT = 9; BB.sfx('bugleFar'); BB.caption('DUB', 'Hear him? ' + ['Left', 'Dead ahead', 'Right', 'Way right'][Math.min(3, st.calls)] + ' of the saddle. Answer back.', 3); st.pending = true; }
      if (st.at >= 0) { st.visT -= dt; if (st.visT <= 0 && !a.dead) st.hide(); }
      if (a.dead) { st.done = true; ctx.trophyPending = false; }
      if (!st.done && t > 49 && !a.dead) { st.done = true; ctx.trophyPending = false; st.lost = true; BB.banner(BB.BARKS.trophyLost[0], '#ff9a6a'); }
    };
    st.onCall = (ctx) => {
      if (st.a.dead) return;
      st.calls++; BB.sfx('bugle');
      if (st.calls <= 4) { setTimeout0(ctx, .8, () => { st.show(st.calls - 1); BB.banner(st.calls === 1 ? 'TROPHY SPOTTED!' : 'THE DUKE!', '#ffe27a'); if (st.calls === 3) { const c = BB.makeAnimal({ species: 'elk', sex: 'female', x: st.open[2][0] - 4, y: st.open[2][1] - 2, to: [st.open[2][0] + 40, st.open[2][1]], exitTo: [st.open[2][0] + 40, st.open[2][1]], callImmune: true }, ctx); c.mode = 'walk'; c.path = [c.to]; c.gait = 'walk'; c.pose = 'walk'; ctx.animals.push(c); BB.caption('DUB', 'A cow leads him. Mind her.', 2.5); } }); }
      else { st.a.mode = 'walk'; st.a.escaped = true; st.done = true; ctx.trophyPending = false; st.lost = true; BB.banner(BB.BARKS.trophyLost[0], '#ff9a6a'); }
    };
    ctx.players.forEach(p => { p.calls = 5; });
  } else if (type === 'bigmo') {
    const a = BB.makeAnimal({ species: 'moose', sex: 'male', pts: 72, x: 8, y: 112, trophyMult: 3, callImmune: true, bigDmgMult: 1 }, ctx);
    a.mode = 'hidden'; a.noEscapeBanner = true; a.manual = true; ctx.animals.push(a); st.a = a; st.charges = 0; st.state = 'wait'; st.timer = 2; st.slow = 1; st.stand = 1;
    a.trophyHook = (ctx, z) => { if (z === 'gut' || z === 'ham' || z === 'leg') st.slow *= .7; };
    st.begin = () => { st.charges++; a.dead = false; a.escaped = false; a.mode = 'charge'; a.gait = 'run'; a.pose = 'charge'; a.x = (st.charges - 2) * 14; a.y = 112; a.hp = 2; a.path = [[a.x * .3, 6]]; a.face = 1; a.charge = false; st.slow = 1; st.state = 'charge'; BB.banner(st.charges === 1 ? 'TROPHY SPOTTED!' : 'HERE HE COMES AGAIN!', '#ffe27a'); BB.sfx('rumble'); BB.caption('EMCEE', 'HERE COMES BIG MO!', 2.4); };
    st.update = (ctx, dt) => {
      if (st.state === 'wait') { st.timer -= dt; if (st.timer <= 0) st.begin(); return; }
      if (a.dead) { st.done = true; ctx.trophyPending = false; return; }
      if (st.state === 'charge') {
        a.speed = 11 * st.slow; const dx = a.path[0][0] - a.x, dy = a.path[0][1] - a.y, l = Math.hypot(dx, dy) || 1; a.x += dx / l * a.speed * dt; a.y += dy / l * a.speed * dt; a.phase += a.speed * dt / .42; a.vx = dx / l * a.speed; a.vy = dy / l * a.speed; a.mode = 'charge';
        if (a.y < 16) { st.state = 'smash'; st.t = 0; ctx.view.crash = 1; BB.fx.shake = 1.2; BB.sfx('crash'); BB.banner('BIG MO SAYS NO!', '#ff6a4a'); }
      } else if (st.state === 'smash') {
        st.t += dt; a.mode = 'hidden'; if (st.t > 1.8) { if (st.charges >= 3) { st.done = true; ctx.trophyPending = false; st.lost = true; BB.banner(BB.BARKS.trophyLost[0], '#ff9a6a'); } else { st.state = 'wait'; st.timer = 1.4; ctx.view.crash = 0; } }
      }
    };
  }
};
function setTimeout0(ctx, s, fn) { BB.game.after(s, fn); }

/* ---------- Uncle Dub's range ---------- */
BB.initRange = ctx => {
  const R = ctx.range = { station: 0, done: false, msg: '', ok: false, counts: {}, stationT: 0, cheers: 0 }; ctx.rangeCall = false;
  const sp = 'whitetail';
  const paper = (b, d, sex, pts, extra) => { const [x, y] = polar(b, d); const a = BB.makeAnimal(Object.assign({ species: sp, sex, pts: pts || 8, x, y, paper: true, face: x > 0 ? -1 : 1 }, extra || {}), ctx); a.mode = 'stand'; a.pose = 'stand'; a.gait = 'stand'; a.paper = true; return a; };
  const S = [
    { say: 'Aim and fire: put three rounds in the paper bucks.', prompt: [['aim', 'Aim'], ['fire', 'Fire']], setup() { return [paper(-12, 20, 'male', 6), paper(0, 24, 'male', 8), paper(12, 20, 'male', 10)]; }, check: () => (R.counts.paper || 0) >= 3 },
    { say: 'Pump after every shot. Empty the tube and she reloads.', prompt: [['fire', 'Fire'], ['pump', 'Pump']], setup() { return [paper(-8, 22, 'male', 8), paper(8, 22, 'male', 8)]; }, check: () => (R.counts.pumps || 0) >= 2 && (R.counts.paper || 0) >= 2 },
    { say: 'Shot placement. Put one in the heart.', prompt: [['fire', 'Fire']], setup() { return [paper(0, 18, 'male', 10, { big: true })]; }, check: () => R.counts.heart },
    { say: 'Bucks only. Shoot the bucks. Shoot a doe and I will just explain it.', prompt: [['fire', 'Fire']], setup() { return [paper(-14, 24, 'male', 8), paper(-5, 24, 'female'), paper(5, 24, 'male', 6), paper(14, 24, 'female')]; }, check: () => (R.counts.buck || 0) >= 2 },
    { say: 'Scope and breath. 150 metres. Hold the scope, hold breath, fire.', prompt: [['scope', 'Scope'], ['breath', 'Hold breath'], ['fire', 'Fire']], setup() { return [paper(4, 150, 'male', 10)]; }, check: () => R.counts.far },
    { say: 'The call. Call to stop the runner, then shoot.', prompt: [['call', 'Call'], ['fire', 'Fire']], setup() { const a = paper(-40, 36, 'male', 8); a.paper = false; a.mode = 'walk'; a.gait = 'run'; a.pose = 'run'; a.path = [[50, 36]]; a.exitTo = [50, 36]; a.rangeRunner = true; a.keep = true; return [a]; }, check: () => R.counts.runner },
    { say: 'Critters. Tin squirrels are fair game. The skunk is not.', prompt: [['fire', 'Fire']], setup() { const mk = (b, d, type, o) => { const [x, y] = polar(b, d); const c = BB.makeCritter(type, Object.assign({ x, y, life: 60, mode: 'idle', def: Object.assign({}, BB.CRITTERS[type], { motion: 'peek' }) }, o || {})); c.range = true; return c; }; R.crits = [mk(-14, 24, 'squirrel'), mk(0, 28, 'squirrel'), mk(14, 24, 'squirrel'), mk(-6, 20, 'skunk')]; return []; }, check: () => (R.counts.squirrel || 0) >= 3, crit: true }
  ];
  R.stations = S;
  R.begin = () => {
    const s = S[R.station]; ctx.animals = ctx.animals.filter(a => a.keep && false); ctx.critters = [];
    R.counts = {}; R.stationT = 0; R.ok = false; R.msg = s.say; ctx.rangeCall = R.station === 5;
    const items = s.setup(); for (const a of items) ctx.animals.push(a); if (s.crit) for (const c of R.crits) ctx.critters.push(c);
    BB.caption('DUB', s.say, 5); R.prompts = s.prompt;
    for (const p of ctx.players) { p.rounds = Math.round(BB.T.rounds); p.chambered = true; p.calls = 4; }
  };
  R.update = (ctx, dt) => {
    if (!R.started) { R.started = true; R.begin(); }
    R.stationT += dt;
    if (R.station === 5) { const run = ctx.animals.find(a => a.rangeRunner); if (run && (run.escaped || run.mode === 'gone')) { run.escaped = false; run.mode = 'walk'; run.x = -40; run.path = [[50, 36]]; run.gait = 'run'; run.counted = false; } }
    if (!R.ok && S[R.station].check()) { R.ok = true; R.advT = 1.4; BB.banner('GOOD!', '#9fe08a'); BB.sfx('chime'); }
    if (R.ok) { R.advT -= dt; if (R.advT <= 0) { R.station++; if (R.station >= S.length) { R.done = true; R.station = S.length - 1; ctx.state = 'endwait'; ctx.endT = 0; BB.caption('DUB', "You'll do. Go win that Hunt-Off.", 4); BB.records.range = true; BB.saveRecords(); BB.banner('RANGE BADGE EARNED!', '#ffd36a'); } else R.begin(); } }
  };
  R.onCall = (ctx) => { if (R.station === 5) { for (const a of ctx.animals) if (a.rangeRunner && !a.dead) { a.mode = 'frozen'; a.frozenT = 3; a.preFreeze = 'walk'; a.pose = 'frozen'; a.gait = 'stand'; } } };
  BB.bus.on('paperHit', ev => { if (ctx !== BB.curSite) return; const R2 = ctx.range; R2.counts.paper = (R2.counts.paper || 0) + 1; if (ev.zone === 'heart') R2.counts.heart = 1; if (!ev.a.sex || ev.a.sex === 'male') R2.counts.buck = (R2.counts.buck || 0) + 1; else BB.caption('DUB', "That's a doe, kid. Don't pull on those.", 3); const pr = BB.project(ctx.view, ev.a.x, ev.a.y, ev.a.z); if (pr && pr[3] > 120) R2.counts.far = 1; });
  BB.bus.on('pump', () => { if (ctx === BB.curSite) ctx.range.counts.pumps = (ctx.range.counts.pumps || 0) + 1; });
  BB.bus.on('critter', ev => { if (ctx === BB.curSite && ev.c.range && ev.c.type === 'squirrel') ctx.range.counts.squirrel = (ctx.range.counts.squirrel || 0) + 1; });
  BB.bus.on('penalty', ev => { if (ctx === BB.curSite && ev.c.range) BB.caption('DUB', 'DON\'T sign says no skunks, kid.', 3); });
  BB.bus.on('kill', ev => { if (ctx === BB.curSite && ev.a.rangeRunner) ctx.range.counts.runner = 1; });
};

/* ---------- HunterBot ---------- */
BB.makeBot = (skill = 'average', cheat = false) => ({
  skill, cheat, rx: 240, ry: 135, vx: 0, vy: 0, target: null, reactT: 0, input: {}, auto: cheat || skill !== 'novice', noise: skill === 'novice' ? 7 : skill === 'average' ? 3 : 1.2, react: skill === 'novice' ? .55 : skill === 'average' ? .3 : .12, inf: cheat,
  nx: 0, ny: 0, nT: 0, scopeOn: false, fireWait: 0
});
BB.botUpdate = (p, ctx, dt) => {
  const b = p.bot, I = b.input = {};
  if (ctx.state !== 'play') return;
  if (b.inf) { p.rounds = Math.round(BB.T.rounds); if (!p.benched) p.benched = false; }
  b.reactT -= dt;
  const v = ctx.view;
  /* choose target */
  let best = null, bs = -1e9;
  const consider = (e, kind) => {
    if (e.dead || e.mode === 'hidden' || e.invisible || e.escaped) return;
    if (kind === 'animal' && !e.target) return; if (kind === 'animal' && e.paper) return;
    if (kind === 'critter' && (e.def.protected || e.def.pts <= 0 || e.def.noHit)) return;
    if (kind === 'animal' && e.fogHidden && ctx.fogA > .45) return;
    const pr = BB.project(v, e.x, e.y, (e.z || 0) + (kind === 'critter' ? (e.alt || 0) + .5 : .7)); if (!pr) return;
    if (pr[0] < 8 || pr[0] > v.W - 8 || pr[1] < 8 || pr[1] > v.H - 8) return;
    if (!b.cheat && BB.occluded(ctx, v, pr[0], pr[1], pr[3])) return;
    let sc = (kind === 'animal' ? 1000 : 100) - pr[3] * .5;
    if (kind === 'animal') { const edge = Math.abs(e.x) / (ctx.bounds.x || 90); sc += edge * 200; if (e.wounded) sc += 400; if (e.trophyMult) sc += 900; }
    if (e === b.target) sc += 150;
    if (sc > bs) { bs = sc; best = { e, kind, pr }; }
  };
  for (const a of ctx.animals) consider(a, 'animal');
  if (!best) for (const c of ctx.critters) consider(c, 'critter');
  if (best && (!b.target || b.target.e !== best.e)) { b.reactT = Math.max(b.reactT, b.react); }
  b.target = best;
  if (ctx.def.range) { if (!best) { const pa = ctx.animals.find(a => a.paper && !a.hit); } }
  const needCall = ctx.animals.some(a => a.hiddenUntilCall && a.mode === 'hidden');
  if (!best && (needCall || ctx.trophyState && ctx.trophyState.type === 'duke') && p.calls > 0 && p.callCd <= 0 && ctx.t - (b.lastCall || -9) > 3.5) { I.call = true; b.lastCall = ctx.t; }
  if (!best) { b.scopeOn = false; if (!p.chambered && p.rackT <= 0 && p.reloadT <= 0) I.pump = true; if (p.rounds === 0 && !p.chambered) I.pump = true; b.rx += (240 - b.rx) * dt; b.ry += (140 - b.ry) * dt; return; }
  const { e, kind, pr } = best;
  /* aim point with lead */
  let tx, ty;
  if (kind === 'animal') {
    const lead = .2; const pr2 = BB.project(v, e.x + (e.vx || 0) * lead, e.y + (e.vy || 0) * lead, e.z); if (!pr2) return;
    const zs = BB.animalZones(e, pr2[0], pr2[1], pr2[2]); const hz = zs.find(z => z.kind === 'heart'); tx = hz.cx; ty = hz.cy;
    if (b.cheat) { /* cheat uses current position exactly */ }
  } else {
    const L = .25, g0 = BB.project(v, e.x + (e.vx || 0) * L, e.y + (e.vy || 0) * L, e.z || 0); if (!g0) return;
    const saveAlt = e.alt; e.alt = (e.alt || 0) + (e.vz || 0) * L - (e.def.motion === 'clay' || e.def.motion === 'ball' ? 4.9 * L * L : 0);
    const bx = BB.critterBox(e, g0[0], g0[1], g0[2]); e.alt = saveAlt; if (!bx) return; tx = bx.cx; ty = bx.cy;
  }
  b.nT -= dt; if (b.nT <= 0) { b.nT = .25; b.nx = BB.rand(-1, 1, 'bot') * b.noise; b.ny = BB.rand(-1, 1, 'bot') * b.noise; }
  tx += b.cheat ? 0 : b.nx; ty += b.cheat ? 0 : b.ny;
  /* scope past 90 m */
  const wantScope = !b.cheat && pr[3] > 95 && kind === 'animal'; I.scope = wantScope; p.scoped = wantScope; if (wantScope) I.breath = true;
  const k = b.cheat ? 14 : 9, dx = tx - b.rx, dy = ty - b.ry;
  if (b.reactT <= 0 || b.cheat) { b.vx += dx * k * dt; b.vy += dy * k * dt; b.vx *= Math.max(0, 1 - 6 * dt); b.vy *= Math.max(0, 1 - 6 * dt); b.rx += b.vx * dt * (b.cheat ? 1.6 : 1); b.ry += b.vy * dt * (b.cheat ? 1.6 : 1); }
  if (b.cheat && Math.hypot(dx, dy) < 40) { b.rx = tx; b.ry = ty; }
  const err = Math.hypot(tx - p.ax, ty - p.ay);
  b.fireWait -= dt;
  const clear = !firstIsProtected(p, ctx);
  if (err < (b.cheat ? 3 : wantScope ? 2 : 2.6) && b.reactT <= 0 && b.fireWait <= 0 && clear && p.chambered) { I.fire = true; b.fireWait = b.cheat ? .35 : .5; }
  if (!p.chambered && p.rackT <= 0 && p.reloadT <= 0 && !b.auto) I.pump = true;
  if (p.rounds <= 0 && !p.chambered && p.reloadT <= 0) I.pump = true;
  if (b.target && kind === 'animal' && e.speed > 5 && p.calls > 0 && p.callCd <= 0 && !ctx.def.bonus && !e.callImmune && Math.hypot(e.x, e.y) < 120 && (ctx.t - (b.lastCall || -9)) > 6) { I.call = true; b.lastCall = ctx.t; }
};
function firstIsProtected(p, ctx) {
  const ax = p.bot.rx + p.sx, ay = p.bot.ry + p.sy, tgt = p.bot.target;
  const c = BB.pickShot(ctx, ax, ay)[0]; if (!c) return true;
  if (c.kind === 'animal') return !(c.a.target && !c.a.paper && tgt && tgt.e === c.a);
  if (c.kind === 'critter') return !!(c.c.def.protected || c.c.def.noHit || c.c.def.pts <= 0);
  return true;
}
})();
