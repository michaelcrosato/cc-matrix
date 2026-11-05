// 61-trophy: a trophy is a site with a legend, one named animal and rules of its own (each hunt's file has its rules).
// Shared: tension music when he shows, a TROPHY tag the first time he's seen, 1.5x toughness, a miss ends his window,
// x3 points, his mount in the Lodge. And the Trophy Cam: the sim slows to a crawl while the camera flies down the shot's
// line to the animal, he flashes to x-ray at the impact, falls at normal speed, and the view fades back.
SEG.trophy = (H, o) => {
  const def = reg('trophy', o.id); let site, phase = 'card', t = 0;
  return { canCall: true, kind: 'trophy',
    enter() {
      H.camAt(def.vantage, def.director && def.director[0] ? def.director[0][1].bearing || 0 : 0, def.frame.pitch, def.frame.fov);
      for (const p of H.players) { p.resetSite(); if (def.calls) p.call.charges = def.calls; } for (const p of H.players) { p.rx = H.W / 2 + (p.i - (H.players.length - 1) / 2) * 30; p.ry = H.H * .55; }
      H.trophyRules = def.rules || null; H.trophyActor = null;
      site = H.site = H.trophySite = new Site(H, def, { timeBoxed: o.timeBoxed, time: o.time });
      H.trophyInfo = { id: def.id, name: def.name, seen: false, bagged: false, dist: 0 };
      HUD.banner(def.name.toUpperCase(), { scale: 2, dur: 1.8, sub: 'THE TROPHY', colors: ['#fff6d8', '#ffd040', '#c87a10'] });
      if (G.sfx) { G.sfx.music('stalk', { fade: .8 }); G.sfx.ambience(H.hunt.ambience); }
      this.scoreAt = H.players.map(p => p.score);
    },
    update(dt) {
      t += dt; if (phase === 'card' && t > 1.2) { phase = 'play'; bus.emit('playStart', site); }
      site.update(dt);
      if (def.rules && def.rules.update) def.rules.update(H, site, dt);
      H.camAt(def.vantage, site.camB, site.pitch, site.fov);
      const A = H.trophyActor; if (A && A.seenAt !== null) H.trophyInfo.seen = true;
      if (phase === 'play' && site.phase === 'end') phase = 'end';
      if (site.done) {
        if (this.closed) return true; this.closed = true;
        siteBonuses(site); H.lastSite = site;
        const bagged = !!(A && A.bagger); Object.assign(H.trophyInfo, { bagged, by: A && A.bagger, dist: bagged ? (site.results.flatMap(r => r.kills).find(k => k.trophy) || {}).dist || 0 : 0 });
        const rec = Records.d.trophies[def.id] || {}; Records.trophy(def.id, { seen: (rec.seen || 0) + (H.trophyInfo.seen ? 1 : 0), bagged: rec.bagged || bagged, best: Math.max(rec.best || 0, H.trophyInfo.dist || 0), date: bagged ? new Date(2026, 10, 4).toDateString() : rec.date });
        H.trophyRules = null; return true;
      }
      return false;
    },
    exit() { H.world.refreshLook(); H.trophyRules = null; },
    get canShoot() { return phase === 'play' || phase === 'card'; }
  };
};
/** a trophy coming out of cover onto a path, and back into it */
function trophyShow(a, path, orders) { a.path = new APath(path); a.d = 0; const p = a.path.at(0); a.x = p.x; a.y = p.y; a.z = a.H.world.height(a.x, a.y); a.heading = p.angle; a.orders = orders.slice(); a.state = 'hidden'; a.delay = 0; a.appear(); a.entered = false; a.speed = 0; a.snapRig(); }
function trophyHide(a) { a.state = 'hidden'; a.delay = 1e9; a.speed = 0; a.visible = false; }
SEG.trophyEnd = (H, o) => {
  let t = 0; const info = H.trophyInfo || {};
  return { block: true, canShoot: false, showReticles: false, cinema: true, actorsLive: true,
    enter() { if (G.sfx) { G.sfx.layer('tension', false); if (info.bagged) G.sfx.sting('fanfare'); else G.sfx.sting('escaped'); } if (!info.bagged) Barks.caption('emcee', 'THE ONE THAT GOT AWAY...'); else Barks.caption('emcee', 'TROPHY BAGGED!'); },
    update(dt) { t += dt; return t > 3.2 || (t > .6 && anyConfirm(H)) || (H.mode === 'attract' && t > 2); },
    draw(g, W, Ht) {
      const a = clamp(t / .4, 0, 1); dim(g, W, Ht, .35 * a);
      E.font.title(g, info.bagged ? 'TROPHY BAGGED!' : 'THE ONE THAT GOT AWAY', W / 2, Ht * .3, { scale: info.bagged ? 4 : 3, colors: info.bagged ? ['#fff6d8', '#ffd040', '#c87a10'] : ['#e8e0d8', '#a8a098', '#6a625a'], outline: '#1a0c08', depth: 3, depthColor: '#3a2410', align: 'center' });
      E.font.text(g, (info.name || '').toUpperCase(), W / 2, Ht * .3 + 44, '#f4ead8', { align: 'center', scale: 2, shadow: '#000' });
      if (info.bagged) E.font.text(g, 'HIS MOUNT GOES UP IN THE LODGE', W / 2, Ht * .3 + 66, '#ffd040', { align: 'center', shadow: '#000' });
      else E.font.text(g, 'NO PENALTY. HE\'LL BE BACK NEXT YEAR.', W / 2, Ht * .3 + 66, '#d8c8a8', { align: 'center', shadow: '#000' });
    }
  };
};
/* ---------- the Trophy Cam ---------- */
function trophyCamWanted(H, e) {
  const set = G.game.settings.trophyCam; if (set === 'off' || H.players.length > 1 || H.hubMode) return false;
  if (e.a.trophy) return true;
  return set === 'on' && e.kill.zone === 'heart' && H.site && H.site.bucksSpawned.every(a => a === e.a || a.resolved) && H.site.S.bucksLeft === 0;
}
bus.on('kill', e => { const H = G.hunt; if (!H || H.camFX || !trophyCamWanted(H, e)) return; H.camFX = new TrophyCam(H, e); });
class TrophyCam {
  constructor(H, e) {
    this.H = H; this.a = e.a; this.R = e.R; this.t = 0; this.phase = G.game.reduceMotion ? 'still' : 'fly';
    const c = H.cam; this.from = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, fov: c.fov };
    const [px2, py, pz] = e.R.point, dx = px2 - c.x, dy = py - c.y, dz = pz - c.z, L = Math.hypot(dx, dy, dz) || 1;
    this.end = { x: px2 - dx / L * 3.2 * M, y: py - dy / L * 3.2 * M, z: pz - dz / L * 3.2 * M + .4 * M, yaw: Math.atan2(dy, dx), pitch: clamp(-Math.atan2(dz, Math.hypot(dx, dy)) / DEG, -10, 20), fov: 24 };
    this.dir = [dx / L, dy / L, dz / L]; this.dist = L;
    this.saved = { deadT: this.a.deadT, state: this.a.state };
    this.a.deadT = 0; G.game.timeScale = .15 * (G.devTimeScale || 1);
    if (G.sfx) G.sfx.play('slowmo');
    H.cinema = true;
  }
  get done() { return this.phase === 'done'; }
  /** real seconds (the sim runs slowed) */
  update(rdt) {
    this.t += rdt; const H = this.H;
    if (this.t > .3 && anyConfirm(H)) this.phase = 'back';
    if (this.phase === 'still') { this.a.xrayT = 1; if (this.t > 1.4) this.phase = 'back'; }
    else if (this.phase === 'fly') { if (this.t >= 1.4) { this.phase = 'xray'; this.t = 0; this.a.xrayT = .35; G.game.flash('#ffffff', .1, .5); } }
    else if (this.phase === 'xray') { this.a.xrayT = Math.max(0, .35 - this.t); if (this.t >= .35) { this.phase = 'fall'; this.t = 0; } }
    else if (this.phase === 'fall') { G.game.timeScale = Math.min(1, .3 + this.t) * (G.devTimeScale || 1); if (this.t >= 1.2) { this.phase = 'back'; this.t = 0; } }
    if (this.phase === 'back') { this.backT = (this.backT || 0) + rdt; this.a.xrayT = 0; if (this.backT > .45) { this.phase = 'done'; G.game.timeScale = G.devTimeScale || 1; H.cinema = !!(H.seg && H.seg.cinema); } }
  }
  /** the camera now */
  cam() {
    const f = this.from, e = this.end;
    if (this.phase === 'fly') { const u = E.ease.inOutCubic(clamp(this.t / 1.4, 0, 1)); return { x: lerp(f.x, e.x, u), y: lerp(f.y, e.y, u), z: lerp(f.z, e.z, u), yaw: E.lerpAng(f.yaw, e.yaw, Math.min(1, u * 2)), pitch: lerp(f.pitch, e.pitch, u), fov: lerp(f.fov, e.fov, u) }; }
    if (this.phase === 'xray' || this.phase === 'fall' || this.phase === 'still') return e;
    return f;
  }
  draw(g, W, Ht) {
    if (this.phase === 'fly') {   // the bullet streak ahead of the camera
      const u = clamp(this.t / 1.4, 0, 1), cx = W / 2, cy = Ht / 2, len = 30 + u * 40;
      px.line(g, cx - len * .5, cy + 4, cx + 2, cy, '#fff4c0', 2); px.disc(g, cx + 3, cy, 3, '#ffe060'); px.dot(g, cx + 3, cy, '#ffffff');
      for (let i = 0; i < 6; i++) { const r = (this.t * 300 + i * 40) % 160; px.dot(g, cx + Math.cos(i) * r, cy + Math.sin(i * 1.7) * r * .6, '#e8e0d0'); }
      E.font.text(g, 'TROPHY CAM', 10, 10, '#ffd040', { scale: 2, shadow: '#000' }); E.font.text(g, Math.round(this.dist / M) + ' M', 10, 28, '#ffffff', { shadow: '#000' });
    }
    if (this.phase === 'xray' || this.phase === 'still') { px.blend(g, .25, 'add', () => px.rect(g, 0, 0, W, Ht, '#2a6a8a')); E.font.text(g, (ZONES[this.R.zone] || ZONES.body).call || 'HIT!', W / 2, Ht * .18, '#ffffff', { align: 'center', scale: 3, outline: '#0a2a3a' }); }
    if (this.phase === 'back') { const a = clamp(1 - Math.abs(this.backT / .45 - .5) * 2, 0, 1); px.blend(g, a, 'normal', () => px.rect(g, 0, 0, W, Ht, '#000')); }
    if (this.phase !== 'back' && this.t > .3) Glyph.cue(g, 'confirm', 'SKIP', W - 40, Ht - 14, this.H.players[0].input, { align: 'right' });
  }
}
// the hunt hands its camera and its step to the Trophy Cam while it runs (92-hunt calls these)
function trophyCamStep(H, dt) {
  const C = H.camFX, ts = Math.max(.01, G.game.timeScale), rdt = dt / ts; C.update(rdt);
  const fl = C.phase === 'fly' || C.phase === 'still' || C.phase === 'xray';
  if (C.done) H.camFX = null;
  if (fl) { H.time += dt; C.a.deadT = 0; C.a.rigUpdate(dt, 0, 0); HUD.update(dt); return true; }
  return false;
}
function trophyCamView(H) { const C = H.camFX; return C && C.phase !== 'back' && C.phase !== 'done' ? C.cam() : null; }
