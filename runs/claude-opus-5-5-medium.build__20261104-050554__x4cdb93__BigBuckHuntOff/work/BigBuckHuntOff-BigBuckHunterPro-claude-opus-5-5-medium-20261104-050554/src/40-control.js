// The play controller: runs a site with its players. Each step: intents (input or bot) -> weapons -> shots resolved
// (damage, kills, penalties, benching, points, multi-kills, shared kills, spook noise) -> the site and its animals ->
// world particles -> the Trophy Cam. Emits events the HUD, barks, audio, stats and the hub link listen to.
(() => {
const B = BB, E = B.E;

class Play {
  constructor(o = {}) {
    this.players = o.players || []; this.site = null; this.fx = []; this.stepNo = 0; this.t = 0; this.W = o.W || 480; this.H = o.H || 270;
    this.mode = o.mode || 'single'; this.shared = this.players.length > 1 || !!o.shared; this.cam = null; this.stink = 0; this.splats = []; this.ghosts = new Map();
    this.flatten = 0; this.recent = [];
  }
  startSite(id, o = {}) {
    const def = B.get('site', id);
    this.site = new B.Site(id, Object.assign({ shared: this.shared, W: this.W, H: this.H }, o));
    const bonus = def.bonus ? B.get('bonus', def.bonus) : null;
    for (const p of this.players) { p.resetSite(bonus ? { tube: bonus.tube, rack: bonus.rack } : {}); p.ret = [this.W / 2 + (p.n - (this.players.length - 1) / 2) * 30, this.H * .55]; }
    this.fx.length = 0; this.splats.length = 0; this.stink = 0; this.cam = null; this.flatten = 0;
    return this.site;
  }
  resize(W, H) { if (W === this.W && H === this.H) return; for (const p of this.players) { p.ret[0] *= W / this.W; p.ret[1] *= H / this.H; } this.W = W; this.H = H; if (this.site) { this.site.lens.W = W; this.site.lens.H = H; this.site.lens.update(); } }
  // one fixed step; held: are game actions held back (dev screen, dialog)
  update(dt, o = {}) {
    const site = this.site; if (!site) return;
    this.stepNo++; this.t += dt;
    const lens = site.lens, W = this.W, H = this.H, T = B.TUNING;
    // assist targets: projected vitals of live legal animals
    const assist = [];
    for (const a of site.herd.list) if (a.live && !a.hidden && (a.cat === 'animal' ? a.legal : !a.protected)) { const pt = B.aimPointOf(a, a.cat === 'animal' ? 'heart' : null), P = lens.project(pt[0], pt[1], pt[2]); if (P) assist.push([P[0], P[1], Math.max(3, (a.rig ? .5 * a.rig.size : .3) * P[2])]); }
    const castAt = (sx, sy) => B.castShot(site, lens, sx, sy);
    for (const p of this.players) {
      if (p.ghost) continue;
      if (p.bot) p.bot.think(dt, { lens, site, W, H, t: this.t, castAt, allowCall: !site.def.bonus, noScope: !!site.def.bonus });
      const intent = o.held || site.ended || this.cam ? { move: [0, 0] } : B.readIntent(p, W, H);
      if (o.held && p.bot) Object.assign(intent, p.bot.intent);
      const shot = B.stepPlayer(p, dt, { intent, W, H, t: this.t, assistTargets: assist, noScope: !!site.def.bonus, noCall: !!site.def.bonus, onCall: q => this.onCall(q) });
      if (shot) this.fire(p, shot[0], shot[1]);
    }
    site.update(dt, this.players.filter(p => !p.ghost));
    // visibility (for quick-draw bonuses), ten times a second
    if (this.stepNo % 12 === 0) for (const a of site.herd.list) if (a.cat === 'animal' && a.live) { const pt = B.aimPointOf(a, 'heart'), P = lens.project(pt[0], pt[1], pt[2]); a.onScreen = !!P && P[0] > 0 && P[0] < W && P[1] > 0 && P[1] < H; if (a.onScreen && !a.hidden && a.seenT < 0) { const r = castAt(P[0], P[1]); if (r.actor === a) a.seenT = site.t; } }
    // particles
    for (const f of this.fx) { f.t += dt; f.vz -= (f.g || 9.8) * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; const gz = site.world.groundAt(f.x, f.y); if (f.z < gz && f.vz < 0) { f.z = gz; f.vz *= -.25; f.vx *= .5; f.vy *= .5; } }
    this.fx = this.fx.filter(f => f.t < f.life);
    this.stink = Math.max(0, this.stink - dt); for (const s of this.splats) s.t += dt; this.splats = this.splats.filter(s => s.t < 2);
    if (this.flatten > 0) this.flatten += dt;
  }
  onCall(p) {
    const site = this.site, n = site.herd.call(site.v.x, site.v.y, 200, p);
    B.bus.emit('sound', { id: B.get('hunt', site.def.hunt).call || 'grunt' });
    return n;
  }
  fire(p, sx, sy) {
    const site = this.site, lens = site.lens, res = B.castShot(site, lens, sx, sy);
    site.shotsFired = (site.shotsFired || 0) + 1; site.kick = this.shared ? 0 : 1;
    p.site.shots++; p.stats.shots++;
    B.bus.emit('shot', { p, res, sx, sy, site });
    site.herd.noise(lens.x, lens.y, 1, 400);
    if (res.kind !== 'sky') site.herd.noise(res.point[0], res.point[1], .6, 40);
    for (const a of site.herd.list) if (a.boltOnShot && a.state === 'hide') { a.orders[0][1] = 0; }
    this.impact(res);
    const a = res.actor;
    if (!a) { B.bus.emit('miss', { p, res }); return res; }
    if (a.cat === 'animal') this.hitAnimal(p, a, res);
    else if (a.cat === 'critter') this.hitCritter(p, a, res);
    else this.hitTarget(p, a, res);
    return res;
  }
  addScore(p, pts, at, label, color) {
    const s = p.site; const before = s.score; s.score = Math.max(0, s.score + pts); const d = s.score - before;
    p.huntScore += d; p.total += d;
    B.bus.emit('pop', { p, pts, at, label, color: color || p.color });
    return d;
  }
  localHit(a, point) { const o = a.rig ? a.rig.origin : [a.x, a.y, a.z], h = -(a.heading || 0), dx = point[0] - o[0], dy = point[1] - o[1]; return [dx * Math.cos(h) - dy * Math.sin(h), dx * Math.sin(h) + dy * Math.cos(h), point[2] - o[2]]; }
  hitAnimal(p, a, res) {
    const site = this.site, Z = B.ZONE[res.zone] || B.ZONE.leg;
    if (a.dead) { if (a.killStep === this.stepNo && a.legal && a.killZone === res.zone && a.bagger !== p.n) this.share(p, a); return; }
    a.hits.push({ p: p.n, zone: res.zone, at: this.localHit(a, res.point), t: site.t });
    if (res.zone !== 'antler') { p.site.hits++; p.stats.hits++; }
    if (a.protected) {
      a.hp -= Z.dmg; if (a.hp <= 0) this.kill(a, p, res); else { a.wounded = true; a.hurtT = .25; }
      if (site.def.range || a.paper) { B.bus.emit('doe', { p, a, res }); return; }
      if (B.CHEAT.god) { B.bus.emit('doe', { p, a, res, god: true }); return; }
      const casual = B.setting('doeRule') === 'casual' || this.mode === 'hub';
      p.site.penalties.push(['DOE', casual || this.mode === 'hub' ? -300 : 0]); p.stats.does++;
      if (casual && this.mode !== 'hub') this.addScore(p, -300, res.point, a.kind === 'fawn' || a.kind === 'calf' ? 'FAWN!' : 'DOE!', '#ff5040');
      else { p.benched = true; }
      B.bus.emit('doe', { p, a, res, benched: p.benched });
      return;
    }
    a.hp -= Z.dmg;
    if (res.zone === 'antler') { a.jumpNow = true; B.bus.emit('antler', { p, a }); }
    if (a.hp <= 0) {
      const dist = Math.hypot(a.x - site.lens.x, a.y - site.lens.y), running = a.speed > a.speeds[1] * .9;
      const k = B.killPoints(a, res.zone, dist, running);
      let pts = k.pts, extra = [];
      if (a.seenT >= 0 && site.t - a.seenT <= 1 && !a.trophy) { pts += 50; extra.push('QUICK DRAW'); }
      if (this.t - p.multi.t <= 1.5) p.multi.n++; else p.multi.n = 1; p.multi.t = this.t;
      if (p.multi.n === 2) { pts += 250; extra.push('DOUBLE!'); } else if (p.multi.n >= 3) { pts += 750; extra.push('TRIPLE!'); }
      a.killZone = res.zone; a.killStep = this.stepNo;
      this.kill(a, p, res);
      const oneShot = a.hits.filter(h => h.zone !== 'antler').length === 1;
      p.site.kills.push({ legal: true, zone: res.zone, dist, pts, running, oneShot, species: a.species, points: a.points, spread: a.spread, trophy: a.trophy, a, extra });
      p.stats.kills++; p.stats.bucks++; p.stats.longest = Math.max(p.stats.longest, dist);
      this.addScore(p, pts, res.point, '+' + pts + ' ' + Z.call.replace('!', '') + ' ' + Math.round(dist) + ' M');
      B.bus.emit('kill', { p, a, res, dist, running, pts, extra, zone: res.zone });
    } else { a.wounded = true; a.hurtT = .25; B.bus.emit('wound', { p, a, res }); }
  }
  share(p, a) {
    const k = this.site.herd.list && this.players.find(q => q.n === a.bagger); if (!k) return;
    const rec = k.site.kills.find(x => x.a === a); if (!rec) return;
    const half = Math.round(rec.pts / 2); rec.pts -= half; k.site.score -= half; k.huntScore -= half; k.total -= half; rec.shared = true;
    p.site.kills.push(Object.assign({}, rec, { pts: half, shared: true })); this.addScore(p, half, [a.x, a.y, a.z + 1], 'SHARED! +' + half);
    B.bus.emit('banner', { text: 'SHARED!', color: '#ffffff' });
  }
  kill(a, p, res) { a.dead = true; a.dying = 0; a.bagger = p.n; a.flee = false; a.frozen = 0; a.deadSide = Math.sign((res.ray[0] * Math.sin(a.heading) - res.ray[1] * Math.cos(a.heading)) || 1) * -1 || 1; }
  hitCritter(p, a, res) {
    if (a.dead) return;
    p.site.hits++; p.stats.hits++;
    this.kill(a, p, res); a.gone = a.flyer ? false : a.gone;
    if (a.flyer) { a.alt = null; a.orders = []; a.fallV = 0; }
    if (a.protected) {
      if (B.CHEAT.god) { B.bus.emit('protected', { p, a, god: true }); return; }
      p.site.penalties.push([a.kind.toUpperCase(), a.points]);
      this.addScore(p, a.points, res.point, a.points + ' ' + (a.kind === 'cow' ? 'BESSIE!' : a.kind.toUpperCase() + '!'), '#ff5040');
      if (a.crit.effect === 'stink') this.stink = 3;
      B.bus.emit('protected', { p, a, res });
      return;
    }
    p.site.critters.push({ kind: a.kind, pts: a.points }); p.stats.critters++;
    this.addScore(p, a.points, res.point, '+' + a.points + ' ' + a.kind.toUpperCase());
    B.bus.emit('critter', { p, a, res });
  }
  hitTarget(p, a, res) {
    if (a.dead && !a.reusable) return;
    const site = this.site;
    if (a.paper) return;
    if (a.protected) { a.bonk = 1; p.site.penalties.push([a.kind.toUpperCase(), a.points]); this.addScore(p, a.points, res.point, a.points + " HANK'S GOT FEELIN'S!", '#ff5040'); B.bus.emit('protected', { p, a, res }); return; }
    p.site.hits++; p.stats.hits++;
    if (a.zoned) {
      if (res.zone === 'hat' && !a.hatOff) { a.hatOff = true; this.addScore(p, a.hatPts, res.point, '+' + a.hatPts + (a.kind === 'snowmoose' ? ' SNOWMOOSE!' : ' HAT!')); this.burst(res.point, '#1a1a22', 10, 3); p.site.critters.push({ kind: 'hat', pts: a.hatPts }); B.bus.emit('target', { p, a, pts: a.hatPts }); }
      else { a.knock = true; this.burst(res.point, '#f4f8ff', 14, 2.5); B.bus.emit('target', { p, a, pts: 0 }); }
      return;
    }
    a.dead = true; a.dying = 0; a.bagger = p.n;
    p.site.critters.push({ kind: a.kind, pts: a.points });
    this.addScore(p, a.points, res.point, '+' + a.points);
    const col = a.kind === 'clay' || a.kind === 'goldclay' ? (a.kind === 'goldclay' ? '#f0c020' : '#e8682a') : a.kind === 'snowball' ? '#f4f8ff' : '#1a1a22';
    this.burst([a.x, a.y, a.z], col, a.kind === 'snowball' ? 16 : 12, 4);
    if (a.kind === 'crow' || a.kind === 'goldcrow') this.burst([a.x, a.y, a.z], a.kind === 'goldcrow' ? '#f8d848' : '#202028', 8, 2, .6);
    B.bus.emit('target', { p, a, pts: a.points });
  }
  // impact particles by what was hit
  impact(res) {
    const p = res.point;
    const by = { animal: ['#a08060', 8, 1.5], critter: ['#a08060', 6, 1.2], target: null, occluder: res.occ && res.occ.type === 'cyl' ? ['#8a6a48', 8, 2] : ['#a0a0a0', 7, 3], ground: [this.site && this.site.world.hunt.rules && this.site.world.hunt.rules.snowAll ? '#f0f4f8' : '#6a5038', 9, 2.4], water: ['#d8ecf4', 12, 3.5] }[res.kind];
    if (!by) return;
    this.burst(p, by[0], by[1], by[2], res.kind === 'water' ? 1.6 : 1);
    if (res.kind === 'animal' && res.zone === 'antler') this.burst(p, '#fff8d0', 4, 3);
  }
  burst(p, color, n, sp, up = 1) {
    const c = B.hexPk(color);
    for (let i = 0; i < n; i++) this.fx.push({ x: p[0], y: p[1], z: p[2], vx: B.fx.range(-1, 1) * sp, vy: B.fx.range(-1, 1) * sp, vz: B.fx.range(.5, 1.5) * sp * up, t: 0, life: B.fx.range(.4, .9), c, size: B.fx.range(.04, .09) });
  }
}
B.Play = Play;
})();
