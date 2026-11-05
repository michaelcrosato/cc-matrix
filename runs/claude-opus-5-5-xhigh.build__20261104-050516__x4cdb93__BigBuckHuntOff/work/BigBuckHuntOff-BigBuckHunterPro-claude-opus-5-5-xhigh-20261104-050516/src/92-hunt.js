// 92-hunt: the scene where all hunting happens. A hunt is a queue of segments on one landscape (so the world, timers and
// particles survive between them): the establishing shot and briefing, a walk-in and a site three times over (each with
// its tally), the trophy, the bonus game, the results. The same runtime plays a single hunt, the campaign, a party, a
// Quick Draw, a bonus game alone, the Practice Range, the attract mode's clips and an AI Hub round.
const DIFF = {
  easy: { assist: 'strong', autoPump: true, speed: .85, calls: 1, sway: .8, doeShare: .8 },
  normal: { assist: null, autoPump: false, speed: 1, calls: 0, sway: 1, doeShare: 1 },
  pro: { assist: 'off', autoPump: false, speed: 1.15, calls: 0, sway: 1.3, doeShare: 1.3 }
};

class Hunt {
  constructor(o) {
    this.o = o; this.mode = o.mode || 'single'; this.huntId = o.hunt || 'hollow'; this.time = 0; this.actors = []; this.shots = []; this.seg = null; this.queue = []; this.site = null;
    this.hunt = reg('hunt', this.huntId); this.species = this.hunt.species; this.world = G.world = worldFor(this.huntId);
    this.diff = Object.assign({}, DIFF[o.difficulty || G.game.settings.difficulty || 'normal']); if (!this.diff.assist) delete this.diff.assist;
    this.players = o.players || [new Player(1, G.game.input)];
    for (const p of this.players) { p.score = o.keepScore ? p.score : 0; p.resetSite(); p.stats = p.stats || {}; }
    this.cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 4, fov: 34, roll: 0 }; this.lens = new E.Lens(); this.W = 480; this.H = 270;
    { const es = this.hunt.establish, w = this.world; if (es) { const [x, y, z, yaw] = es.to; Object.assign(this.cam, { x: x * M, y: y * M, z: w.height(x * M, y * M) + z * M, yaw: yaw * DEG, pitch: 5, fov: 36 }); } else { const v0 = Object.keys(w.vant)[0], e = w.eye(v0); Object.assign(this.cam, { x: e.x, y: e.y, z: e.z, yaw: e.yaw }); } this.vkind = 'air'; }
    this.results = []; this.siteResults = []; this.trophyInfo = null; this.bonusResult = null; this.vantageId = null; this.fanB = [-35, 35];
    this.hubMode = this.mode === 'hub'; this.godMode = !!o.godMode; this.noFollow = this.mode === 'attract' && false;
    this.rival = null; this.kickT = 0; this.stink = 0; this.splats = [];
    if (!o.showcase) { HUD.reset(); HUD.shown = {}; RNG.seed(o.seed || (this.hubMode ? 0 : 1 + Math.floor(G.game.real * 1000) % 100000)); }
    this.buildQueue();
    if (!o.showcase) { G.hunt = this; bus.emit('huntStart', this); }
  }
  /** the segment queue for this mode */
  buildQueue() {
    const H = this.hunt, q = this.queue, m = this.mode, o = this.o;
    if (o.queue) { for (const s of o.queue) q.push(s); return; }
    if (m === 'range') { q.push({ kind: 'range' }, { kind: 'next' }); return; }
    if (m === 'bonusOnly') { q.push({ kind: 'dialog', beat: H.bonusBeat }, { kind: 'walk', to: reg('bonus', H.bonus).vantage }, { kind: 'bonus', id: H.bonus }, { kind: 'bonusTally' }, { kind: 'results', bonusOnly: true }, { kind: 'next' }); return; }
    if (m === 'quick') { q.push({ kind: 'walk', to: reg('site', H.sites[0]).vantage, quick: true }, { kind: 'site', id: H.sites[0], timeBoxed: true, time: 50 }, { kind: 'tally' }, { kind: 'next' }); return; }
    q.push({ kind: 'establish' });
    if (m === 'campaign' && this.o.first) q.push({ kind: 'dialog', beat: 'welcome' }, { kind: 'dialog', beat: 'rivals' });
    if (H.intro) q.push({ kind: 'dialog', beat: H.intro });
    for (const sid of H.sites) q.push({ kind: 'walk', to: reg('site', sid).vantage }, { kind: 'site', id: sid }, { kind: 'tally' });
    if (H.trophy) q.push({ kind: 'dialog', beat: H.legendBeat }, { kind: 'walk', to: reg('trophy', H.trophy).vantage }, { kind: 'trophy', id: H.trophy }, { kind: 'trophyEnd' }, { kind: 'tally', trophy: true });
    if (H.bonus) q.push({ kind: 'dialog', beat: H.bonusBeat }, { kind: 'walk', to: reg('bonus', H.bonus).vantage }, { kind: 'bonus', id: H.bonus }, { kind: 'bonusTally' });
    q.push({ kind: 'results' });
    if (m === 'campaign' || m === 'single') q.push({ kind: 'dialog', beat: H.outro, outro: true });
    q.push({ kind: 'next' });
  }
  get segIndex() { return this._si || 0; }
  nextSeg() {
    if (this.seg && this.seg.exit) this.seg.exit();
    const s = this.queue.shift(); this._si = (this._si || 0) + 1;
    if (!s) { this.seg = null; this.finished = true; return; }
    const f = SEG[s.kind]; if (!f) throw new Error('no segment ' + s.kind);
    this.seg = f(this, s); this.seg.kind = this.seg.kind || s.kind; this.seg.spec = s;
    this.inputBlocked = !!this.seg.block; this.cinema = !!this.seg.cinema; this.canScope = this.seg.canScope !== false; this.canCall = !!this.seg.canCall;
    if (this.seg.enter) this.seg.enter();
    bus.emit('segment', this.seg);
  }
  /** jump to the first segment of a kind (dev mode, deep links) */
  skipTo(kind, id) {
    let guard = 0;
    while (this.queue.length && guard++ < 60) { const s = this.queue[0]; if (s.kind === kind && (!id || s.id === id)) break; this.queue.shift(); }
    if (this.seg && this.seg.exit) this.seg.exit();
    if (this.site && (!this.seg || this.seg.kind !== 'site')) { this.site.dispose(); this.site = null; }
    this.seg = null; this.nextSeg();
  }
  skip() { if (this.seg && this.seg.skip) this.seg.skip(); else this.nextSeg(); }
  later(s, fn) { return G.game.after(s, fn); }
  /** fire: a round goes through the aim point, resolved with every other shot this step */
  trigger(p) {
    if (p.benched || !this.seg || !this.seg.canShoot) return;
    const r = p.rifle.fire(this.time);
    if (r === null) return;
    if (r === false) { if (G.sfx) G.sfx.play('dry'); p.kick = .4; if (p.rifle.dryCount <= 2 || p.rifle.dryCount % 4 === 0) HUD.tip('pump' + p.n + '_' + p.rifle.dryCount, 'pump', 'PUMP!', { times: 99, p, dur: 1.4 }); return; }
    const [sx, sy] = p.aimPoint(), ray = this.lens.ray(sx, sy);
    this.shots.push({ p, ray, sx, sy, t: this.time });
    p.bloom = 1; p.kick = 1;
    if (this.players.length === 1 && !this.hubMode) this.kickT = .25;
    G.game.shake(1.2); if (p.input.rumble) p.input.rumble(.35, .08);
    if (G.sfx) G.sfx.shot(this);
  }
  useCall(p) {
    if (!p.call.use()) { if (G.sfx) G.sfx.play('back'); return; }
    const c = { x: this.cam.x, y: this.cam.y, p, species: this.species };
    if (G.sfx) G.sfx.call(reg('species', this.species).call, null, 1);
    let n = 0; for (const a of this.actors) if (a.hearCall(c)) n++;
    bus.emit('call', Object.assign(c, { n }));
  }
  update(dt) {
    if (this.camFX && trophyCamStep(this, dt)) return;
    if (DEV.free) DEV.updateFree(G.game.timeScale > 0 ? dt / G.game.timeScale : 1 / 120);
    this.time += dt; this.dt = dt;
    if (!this.seg && !this.finished) this.nextSeg();
    if (!this.seg) return;
    // players: aim, pump, scope, call, fire (shots resolve together after)
    this.setupLens();
    for (const p of this.players) p.update(dt, this);
    if (this.shots.length) { const S = this.shots.splice(0); if (this.seg.resolve) this.seg.resolve(S); else resolveShots(this, S); }
    if (this.kickT > 0) this.kickT = Math.max(0, this.kickT - dt);
    if (this.stink > 0) this.stink = Math.max(0, this.stink - dt);
    for (const s of this.splats) s.t += dt; this.splats = this.splats.filter(s => s.t < s.dur);
    // the segment (its camera), then the actors
    const done = this.seg.update(dt);
    this.setupLens();
    if (this.seg && this.seg.actorsLive !== false) {
      for (const a of this.actors) a.update(dt);
      this._visT = (this._visT || 0) - dt; if (this._visT <= 0) { this._visT = .15; this.visibility(); }
    }
    if (G.fx) G.fx.update(dt, this);
    HUD.update(dt);
    this.showBoard = !this.hubMode && this.players.some(p => p.input.down('board'));
    if (done && !this.hubMode) this.nextSeg();
    else if (done) this.segDone = true;
  }
  /** who can be seen: on screen, and nothing between the eye and the chest */
  visibility() {
    const L = this.lens, q = [0, 0, 0, 0];
    for (const a of this.actors) {
      if (!a.alive) { a.visible = false; continue; }
      const cz = a.z + (a.rig.height || 10) * .45 * T('animalScale');
      let vis = !!L.project(a.x, a.y, cz, q) && q[0] > 0 && q[0] < this.W && q[1] > 0 && q[1] < this.H;
      if (vis) { const ray = { x: L.x, y: L.y, z: L.z, dx: (a.x - L.x) / q[3], dy: (a.y - L.y) / q[3], dz: (cz - L.z) / q[3] }, R = resolveRay(this, ray, { maxT: q[3] * 1.02 }); vis = R.actor === a || (R.kind === 'sky' || R.t >= q[3] * .97); }
      if (vis && !a.visible && a.seenAt === null) { a.seenAt = this.time; if (a.trophy) bus.emit('trophySpotted', a); }
      a.visible = vis;
    }
  }
  /** the camera at a vantage, looking along a bearing */
  camAt(vid, bearing = 0, pitch = 4, fov = 34) { const e = this.world.eye(vid); Object.assign(this.cam, { x: e.x, y: e.y, z: e.z, yaw: e.yaw + bearing * DEG, pitch, fov, roll: 0 }); this.vkind = e.v.kind; return this.cam; }
  /** the camera this instant (with the canoe's bob, the breathing drift and recoil in single player, the Trophy Cam
   *  or the free camera) into this.lens: update and draw both use it, so a shot goes where the picture shows */
  setupLens() {
    const W = this.W, Ht = this.H, fxc = (this.camFX && trophyCamView(this)) || DEV.free, c = fxc || this.cam, t = this.time;
    let yaw = c.yaw, pitch = c.pitch, z = c.z;
    if (!fxc) {
      if (this.players.length === 1 && !this.hubMode && this.seg && this.seg.kind === 'site') { yaw += Math.sin(t * .7) * .15 * DEG; pitch += Math.sin(t * .53 + 1) * .12 + this.kickT * 1.6; }
      if (this.vkind === 'canoe') { z += Math.sin(t * TAU / 3.1) * .06 * M; pitch += Math.sin(t * TAU / 3.1 + 1.2) * .25; }
      if (this.moCrash > 0) { pitch -= 22 * this.moCrash; z -= 2.6 * M * (1 - this.moCrash); yaw += Math.sin(t * 30) * this.moCrash * .04; }
    }
    this.halfFovH = Math.atan(Math.tan(c.fov * DEG / 2) * W / Ht) / DEG;
    this.lens.setup({ x: c.x, y: c.y, z, yaw, pitch, fov: c.fov }, W, Ht);
    return fxc;
  }
  draw(r) {
    this.W = r.W; this.H = r.H; const W = this.W, Ht = this.H;
    const fxc = this.setupLens(); this.world.vista.time = this.time;
    const items = this.gatherItems(this.lens);
    this.world.vista.draw(r, this.lens, items, { key: 'main' });
    if (fxc) { r.overlay(g => { if (DEV.free) drawForeground(g, this, W, Ht); HUD.draw(g, this, W, Ht); this.camFX && this.camFX.draw(g, W, Ht); DEV.draw(g, this, W, Ht); }); return; }
    r.overlay(g => this.overlay(g, W, Ht, items));
    if (G.talk && G.talk.open && !this.o.showcase) G.talk.draw(r);
  }
  gatherItems(L) {
    const items = this.world.gather(L, []);
    for (const a of this.actors) { const it = a.item(); if (it) items.push(it); }
    if (G.fx) G.fx.items(items, this);
    if (this.seg && this.seg.items) this.seg.items(items, L);
    return items;
  }
  overlay(g, W, Ht, items) {
    const seg = this.seg;
    if (G.fx) G.fx.drawScreen(g, this, W, Ht, 'back');
    drawForeground(g, this, W, Ht);
    if (G.fx) G.fx.drawScreen(g, this, W, Ht, 'front');
    if (seg && seg.drawWorld) seg.drawWorld(g, W, Ht);
    if (seg && seg.showReticles !== false && !this.cinema) { for (const p of this.players) if (p.scope.raise > .05) this.drawScope(g, p, items, W, Ht); this.drawGhosts && this.drawGhosts(g, W, Ht); for (const p of this.players) this.drawReticle(g, p); }
    if (this.stink > 0) drawStink(g, this, W, Ht);
    for (const s of this.splats) drawSplat(g, s);
    if (!this.o.showcase) HUD.draw(g, this, W, Ht);
    if (seg && seg.draw) seg.draw(g, W, Ht);
    if (this.camFX) this.camFX.draw(g, W, Ht);
    if (!this.o.showcase) DEV.draw(g, this, W, Ht);
  }
  drawReticle(g, p) {
    if (p.scope.raise > .6) return;
    const b = p.bloom * 3 + (p.rifle.dryT > 0 ? 2 : 0), jx = p.rifle.dryT > 0 ? Math.round(Math.sin(G.game.real * 70) * 2) : 0;
    drawReticleShape(g, Math.round(p.rx + jx), Math.round(p.ry), p.shape, p.benched ? '#8a8a8a' : p.color, 7 + b);
    if (p.benched) E.font.text(g, 'BENCHED', p.rx, p.ry + 12, '#c8c8c8', { align: 'center', shadow: '#000' });
    if (this.players.length > 1) E.font.text(g, p.name, p.rx + 10, p.ry - 14, p.color, { outline: '#140c08' });
  }
  /** a scope: the world drawn again magnified about the swayed aim point, masked to a circle at the reticle */
  drawScope(g, p, items, W, Ht) {
    const R = Math.round(54 * (W / 480 > 1.3 ? 1.15 : 1)), mag = T('scopeMag'), [s0x, s0y] = p.aimPoint(), k = sm(p.scope.raise);
    const cx = Math.round(p.rx), cy = Math.round(p.ry), rr = Math.max(4, Math.round(R * (.35 + .65 * k)));
    const V = this.world.vista, size = rr * 2, T2 = V.target(size, size, 'scope' + p.n);
    const L2 = this.lens.magnified(s0x, s0y, 1 + (mag - 1) * k, rr, rr, size, size);
    V.render(T2, L2, items, { far: V.fog.far * 1.02 });
    const lc = this._lensCv && this._lensCv.width === size ? this._lensCv : (this._lensCv = E.mkCanvas(size, size)), lg = E.ctx2d(lc);
    lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, size, size);
    const m = 1 + (mag - 1) * k; if (V._skyCv) lg.drawImage(V._skyCv, s0x - rr / m, s0y - rr / m, size / m, size / m, 0, 0, size, size);
    if (T2.img) { V.present(lg, T2, 0, 0); }
    lg.globalCompositeOperation = 'destination-in'; E.px.reset(lg); px.disc(lg, rr, rr, rr - .5, '#000'); lg.globalCompositeOperation = 'source-over';
    g.drawImage(lc, cx - rr, cy - rr); E.px.reset(g);
    // the ring, the crosshair, the breath arc
    for (let a = 0; a < 96; a++) { const t = a / 96 * TAU; px.dot(g, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, '#0a0806'); px.dot(g, cx + Math.cos(t) * (rr + 1), cy + Math.sin(t) * (rr + 1), '#2a241e'); px.dot(g, cx + Math.cos(t) * (rr + 2), cy + Math.sin(t) * (rr + 2), '#0a0806'); }
    const xc = p.benched ? '#8a8a8a' : '#140c08';
    px.line(g, cx - rr + 2, cy, cx - 4, cy, xc); px.line(g, cx + 4, cy, cx + rr - 2, cy, xc); px.line(g, cx, cy - rr + 2, cx, cy - 4, xc); px.line(g, cx, cy + 4, cx, cy + rr - 2, xc);
    px.line(g, cx - rr + 2, cy - 1, cx - rr * .45, cy - 1, xc); px.line(g, cx + rr * .45, cy - 1, cx + rr - 2, cy - 1, xc);
    px.dot(g, cx, cy, p.color);
    const b = p.scope.breath / T('breath'), n = Math.round(40 * b);
    for (let i = 0; i < n; i++) { const t = -Math.PI * .75 + i / 40 * Math.PI * .5; px.dot(g, cx + Math.cos(t) * (rr + 5), cy + Math.sin(t) * (rr + 5), p.scope.shaky > 0 ? '#e8443a' : p.scope.holding ? '#7ad0ff' : '#e8e0d0'); }
    if (this.players.length > 1) drawReticleShape(g, cx + rr - 6, cy - rr + 6, p.shape, p.color, 4);
  }
  restartSite() {
    const s = this.seg && (this.seg.kind === 'site' || this.seg.kind === 'trophy' || this.seg.kind === 'bonus') ? this.seg.spec : null; if (!s) { G.game.resume(); return; }
    G.game.resume(); if (this.seg.exit) this.seg.exit(); if (this.site) { this.site.dispose(); this.site = null; }
    for (const p of this.players) { p.score = Math.max(0, p.score - (this.seg.scoreAt !== undefined ? p.score - (this.seg.scoreAt[p.i] || 0) : 0)); }
    this.queue.unshift(Object.assign({}, s)); this.seg = null; this.nextSeg();
  }
  restartHunt() { G.game.resume(); startHunt(Object.assign({}, this.o, { players: this.players })); }
  dispose() { if (this.seg && this.seg.exit) this.seg.exit(); if (this.site) this.site.dispose(); this.site = null; this.actors.length = 0; }
}

/* ---------- segments: the establishing shot, the walk-in, a site ---------- */
SEG.establish = (H, o) => {
  const E2 = H.hunt.establish, t0 = H.time, card = { t: 0 };
  return { block: true, cinema: true, canShoot: false, showReticles: false,
    enter() { const [x, y, z, yaw] = E2.from; Object.assign(H.cam, { x: x * M, y: y * M, z: H.world.height(x * M, y * M) + z * M, yaw: yaw * DEG, pitch: 8, fov: 38 }); H.vkind = 'air'; if (G.sfx) G.sfx.music(H.hunt.ambience === 'muskeg' ? 'stalk' : 'stalk', { fade: 1 }); },
    update(dt) {
      card.t += dt; const u = sm(card.t / E2.secs), [x0, y0, z0, w0] = E2.from, [x1, y1, z1, w1] = E2.to;
      const x = lerp(x0, x1, u) * M, y = lerp(y0, y1, u) * M; Object.assign(H.cam, { x, y, z: H.world.height(x, y) + lerp(z0, z1, u) * M, yaw: lerp(w0, w1, u) * DEG, pitch: lerp(9, 5, u) });
      if (card.t > .4 && anyConfirm(H)) return true;
      return card.t >= E2.secs;
    },
    draw(g, W, Ht) {
      const a = clamp(card.t / .6, 0, 1) * clamp((E2.secs - card.t) / .6, 0, 1); if (a < .1) return;
      const h = H.hunt, y = Ht * .62;
      E.ui.box(g, W / 2 - 150, y - 8, 300, 62, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .86 });
      E.font.title(g, h.name.toUpperCase(), W / 2, y, { scale: 2, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
      E.font.text(g, h.when.toUpperCase() + '  ·  ' + reg('species', h.species).label.toUpperCase(), W / 2, y + 26, '#f4ead8', { align: 'center', outline: false });
      E.font.text(g, h.blurb, W / 2, y + 38, '#b8a488', { align: 'center', outline: false });
      Glyph.cue(g, 'confirm', 'SKIP', W - 40, Ht - 14, H.players[0].input, { align: 'right' });
    }
  };
};
function anyConfirm(H) { return H.players.some(p => (p.input.pressed('confirm') || p.input.pressed('fire') || p.input.clicked && p.input.clicked())); }
SEG.walk = (H, o) => {
  // the last stretch of the trail into the next vantage: the camera walks (head bob), climbs into a stand
  const e = H.world.eye(o.to), v = e.v, back = o.quick ? 18 : 34, a = e.yaw + (v.approach || 0) * DEG, sx = e.x - Math.cos(a) * back * M, sy = e.y - Math.sin(a) * back * M;
  const dur = o.quick ? 2.2 : 4.6; let t = 0;
  return { block: true, canShoot: false, showReticles: false, cinema: true,
    enter() { H.vkind = 'ground'; if (H.site) { H.site.dispose(); H.site = null; } H.actors.length = 0; G.fx.reset(); },
    update(dt) {
      t += dt; const u = clamp(t / dur, 0, 1), w = sm(Math.min(1, u * 1.15)), x = lerp(sx, e.x, w), y = lerp(sy, e.y, w), gz = H.world.height(x, y);
      const climb = v.kind === 'treestand' || v.kind === 'porch' || v.kind === 'rock' ? sm((u - .7) / .3) : 1, eyeZ = lerp(gz + 1.7 * M, e.z, climb);
      Object.assign(H.cam, { x, y, z: eyeZ + Math.sin(t * 9) * .05 * M * (1 - u), yaw: a + Math.sin(t * 1.3) * .02, pitch: 5, fov: 36, roll: 0 });
      if (t > .3 && anyConfirm(H)) return true;
      return t >= dur;
    },
    exit() { H.vkind = v.kind; },
    draw(g, W, Ht) { if (t > .2) Glyph.cue(g, 'confirm', 'SKIP', W - 40, Ht - 14, H.players[0].input, { align: 'right' }); E.font.text(g, 'TO ' + (v.name || 'the stand').toUpperCase(), W / 2, Ht - 30, '#f4ead8', { align: 'center', shadow: '#000' }); }
  };
};
SEG.site = (H, o) => {
  const def = reg('site', o.id); let site, phase = 'card', t = 0;
  return { canCall: true, kind: 'site',
    enter() {
      H.camAt(def.vantage, def.director && def.director[0] ? def.director[0][1].bearing || 0 : 0, def.frame.pitch, def.frame.fov);
      for (const p of H.players) p.resetSite(); for (const p of H.players) { p.rx = H.W / 2 + (p.i - (H.players.length - 1) / 2) * 30; p.ry = H.H * .55; }
      this.scoreAt = H.players.map(p => p.score);
      site = H.site = new Site(H, def, { timeBoxed: o.timeBoxed, time: o.time });
      HUD.banner(def.name.toUpperCase(), { scale: 2, dur: 1.6, sub: H.hunt.name.toUpperCase() });
      if (G.sfx) { G.sfx.music('stalk', { fade: .8 }); G.sfx.ambience(H.hunt.ambience); }
      if (H.diff.autoPump) for (const p of H.players) p.forceAuto = true;
    },
    update(dt) {
      t += dt;
      if (phase === 'card') { if (t > 1.2) { phase = 'play'; HUD.banner(isTargetKind(H.species === 'whitetail' ? 'buck' : 'bull') ? (H.species === 'whitetail' ? 'BUCKS ONLY!' : 'BULLS ONLY!') : 'BUCKS ONLY!'); bus.emit('playStart', site); } }
      site.update(dt);
      const c = H.camAt(def.vantage, site.camB, site.pitch, site.fov);
      if (phase === 'play' && site.phase === 'end') { phase = 'end'; HUD.banner(site.endReason === 'clear' ? 'SITE CLEAR!' : site.endReason === 'benched' ? 'BENCHED!' : 'TIME!', { scale: 3 }); if (G.sfx) G.sfx.sting(site.endReason === 'clear' ? 'siteclear' : 'escaped'); }
      if (site.done) { if (this.closed) return true; this.closed = true; siteBonuses(site); H.lastSite = site; H.siteResults.push(site); for (const res of site.results) { Records.setStars(site.id, res.stars); } Records.stat('sites', 1); return true; }
      return false;
    },
    get canShoot() { return phase === 'play' || phase === 'card'; },
    exit() { for (const p of H.players) p.forceAuto = false; }
  };
};
SEG.next = (H, o) => ({ block: true, cinema: true, enter() {}, update() { huntFinished(H); return false; } });
/** the hunt is over: the campaign's next hunt, or back to the menu */
function huntFinished(H) {
  if (H._left) return; H._left = true;
  if (H.mode === 'campaign') {
    const order = ['hollow', 'bugle', 'muskeg'], i = order.indexOf(H.huntId);
    const save = Object.assign({}, G.campaign || {}, { next: i + 1, scores: Object.assign({}, (G.campaign || {}).scores, { [H.huntId]: H.players[0].score }) });
    G.campaign = save;
    if (i + 1 < order.length) { G.game.saves.save('auto', { data: save, place: reg('hunt', order[i + 1]).name, level: i + 2 }); startHunt({ mode: 'campaign', hunt: order[i + 1], players: H.players }); }
    else { G.game.saves.erase('auto'); G.game.go('lodge', { ceremony: true, campaign: save }); }
    return;
  }
  if (H.mode === 'attract' && G.attract) { G.attract.clipDone(); return; }
  if (H.mode === 'quick') { const order = ['hollow', 'bugle', 'muskeg'], i = order.indexOf(H.huntId); if (i + 1 < order.length) startHunt(Object.assign({}, H.o, { hunt: order[i + 1], players: H.players, keepScore: true })); else startHunt(Object.assign({}, H.o, { mode: 'bonusOnly', hunt: 'bugle', players: H.players, keepScore: true, quickFinal: true })); return; }
  G.game.go('menu', { page: H.mode === 'range' ? 'main' : 'main' });
}
/** start (or restart) a hunt in the hunt scene */
function startHunt(o) { G.pendingHunt = o; if (G.game.sceneName === 'hunt') { if (G.hunt) G.hunt.dispose(); G.hunt = new Hunt(o); } else G.game.go('hunt', o); }

/* ---------- the foreground: what's around you at each kind of vantage ---------- */
function drawForeground(g, H, W, Ht) {
  const k = H.vkind, yawOff = Math.round((H.cam.yaw - (H.world.eye(H.vantageId || Object.keys(H.world.vant)[0]).yaw)) * 60) || 0;
  if (H.seg && H.seg.noForeground) return;
  if (k === 'treestand') {   // the shooting rail and the platform's edge
    const y = Ht - 22, wood = E.tones('#5a5a52'), x0 = -40 - yawOff % 80;
    px.rect(g, 0, y, W, 6, wood.sh); px.rect(g, 0, y, W, 2, wood.lt); px.rect(g, 0, y + 6, W, 1, '#140c08');
    for (let x = x0; x < W + 40; x += 160) { px.rect(g, x, y + 6, 6, Ht - y, wood.base); px.rect(g, x, y + 6, 2, Ht - y, wood.lt); }
    px.rect(g, 0, Ht - 6, W, 6, E.tones('#3a3a34').sh);
    for (let i = 0; i < 4; i++) px.rect(g, W * .2 + i * 50, y - 1, 10, 1, '#7a7a70');
  } else if (k === 'blind') {   // the blind's fabric round its window
    const C = E.tones('#4a5034'), mesh = (x0, y0, w, h) => { px.rect(g, x0, y0, w, h, C.sh); for (let y = y0; y < y0 + h; y += 3) for (let x = x0 + ((y / 3) % 2 ? 1 : 0); x < x0 + w; x += 3) px.dot(g, x, y, C.deep); for (let i = 0; i < w * h / 90; i++) { const xx = x0 + ((i * 37) % w), yy = y0 + ((i * 53) % h); px.rect(g, xx, yy, 2, 2, i % 3 ? C.base : '#6a5a34'); } };
    mesh(0, 0, W, 16); mesh(0, Ht - 28, W, 28); mesh(0, 16, 14, Ht - 44); mesh(W - 14, 16, 14, Ht - 44);
    px.rect(g, 14, 16, W - 28, 1, '#140c08'); px.rect(g, 14, Ht - 29, W - 28, 1, '#140c08');
  } else if (k === 'rock') {
    const R = E.tones('#8a8478'); const pts = [[0, Ht], [0, Ht - 16], [W * .2, Ht - 22], [W * .45, Ht - 14], [W * .7, Ht - 20], [W, Ht - 12], [W, Ht]];
    px.poly(g, pts, R.sh); px.poly(g, pts.map(p => [p[0], p[1] + 3]), R.base); for (let i = 0; i < 14; i++) px.dot(g, (i * 71) % W, Ht - 8 + (i % 4), i % 2 ? '#6a7a3a' : '#a8b07a');
  } else if (k === 'canoe') {   // the canoe's bow, bobbing
    const b = Math.sin(H.time * TAU / 3.1) * 2, C = E.tones('#2a5a8a'), cx = W / 2;
    px.poly(g, [[cx - 70, Ht], [cx - 10, Ht - 38 + b], [cx + 10, Ht - 38 + b], [cx + 70, Ht]], C.sh); px.poly(g, [[cx - 60, Ht], [cx - 6, Ht - 34 + b], [cx + 6, Ht - 34 + b], [cx + 60, Ht]], C.base);
    px.line(g, cx - 6, Ht - 34 + b, cx - 58, Ht, C.lt); px.poly(g, [[cx - 40, Ht], [cx, Ht - 22 + b], [cx + 40, Ht]], E.tones('#6a4a2a').base);
  } else if (k === 'porch') {
    const C = E.tones('#8a6a4a'); px.rect(g, 0, Ht - 26, W, 5, C.base); px.rect(g, 0, Ht - 26, W, 1, C.lt); for (let x = 6; x < W; x += 22) { px.rect(g, x, Ht - 21, 3, 21, C.sh); }
    px.rect(g, 0, Ht - 5, W, 5, C.deep);
  } else if (k === 'ground' || k === 'range') {
    for (const sx of [0, W]) for (let i = 0; i < 9; i++) { const x = sx === 0 ? i * 7 : W - i * 7, h = 18 + (i * 13) % 16; px.line(g, x, Ht, x + (sx ? -4 : 4), Ht - h, i % 2 ? '#5a6a2a' : '#8a8a3a', 2); }
  }
}
/* ---------- the scene ---------- */
const huntScene = {
  pausable: true, camera: { zoom: false }, touch: [],
  enter(o) { G.scene = 'hunt'; game.input.touchEnabled = false; if (G.hunt && G.hunt !== G.pendingHunt) G.hunt.dispose(); G.hunt = new Hunt(o || G.pendingHunt || {}); },
  exit() { if (G.hunt) G.hunt.dispose(); G.hunt = null; if (G.sfx) G.sfx.ambience(null); },
  update(dt) { if (G.hunt) G.hunt.update(dt); },
  draw(r) { if (G.hunt) G.hunt.draw(r); }
};
