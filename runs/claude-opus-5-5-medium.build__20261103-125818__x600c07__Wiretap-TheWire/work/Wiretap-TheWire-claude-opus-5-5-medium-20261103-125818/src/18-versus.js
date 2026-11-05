// WIRETAP: THE GAME, versus. The Corner (lieutenant, lookout) against the Detail (detectives who look like civilians).
// The detail wins with a 100-point case; the corner wins with the quota at time-up. Bots fill every empty seat. The same
// VersusSim runs local play (1 human vs bots, or 2 on a split screen) and the AI Hub's shared world (the host runs it).
const VS = { quotaPerMin: 100, len: 300 };
const VZONE = { x0: 10 * T, y0: 15 * T, x1: 56 * T, y1: 46 * T };
const vClamp = p => { p.body.x = clamp(p.body.x, VZONE.x0, VZONE.x1); p.body.y = clamp(p.body.y, VZONE.y0, VZONE.y1); };
class VersusSim {
  constructor(o) {
    this.o = o; this.rnd = o.rnd || E.rng(o.seed || 99); RNG.sim = this.rnd; RNG.world = o.rndWorld || E.rng((o.seed || 99) + 1);
    this.len = o.len || VS.len; this.t = 0; this.ev = 0; this.over = null; this.events = []; this.players = []; this.nid = 0; this.ids = new Map(); this.tapped = {}; this.burnT = {}; this.calloutCd = {}; this.stats = {}; this.awards = [];
    this.corner = new CornerSim({ rate: .3, mode: 'versus', vials: 60, autoReup: false, patrol: false, rnd: this.rnd, third: false });
    this.corner.o.payphones = false;
    this.civs = []; for (let i = 0; i < 10; i++) { const s = SIDEWALK.filter(([x, y]) => x >= 10 && x <= 55 && y >= 15 && y <= 45)[i % 12], p = C(s[0], s[1]); const a = new Agent({ id: 'vc' + i, x: p.x, y: p.y, seed: 500 + i, speed: 32 + this.rnd() * 12 }); a.civT = this.rnd() * 5; this.civs.push(a); }
    for (const s of o.seats) this.addPlayer(s);
    this.stashFirst = false; this.reupWait = 0; this.jumped = {};
  }
  addPlayer(s) {
    const det = s.side === 'detail', spawn = det ? C(...[[42, 30], [20, 26.2], [36, 26.2], [25, 44.5]][this.players.filter(p => p.side === 'detail').length % 4]) : C(30.2, 31.2);
    const ent = makePlayer(det ? null : (s.role === 'lt' ? 'tee' : 'moe'), spawn, { id: 'P' + s.id, ctl: s.ctl || new BotCtl(), cop: det });
    if (det) { const c = civRig(900 + s.id * 17); ent.rig = c.rig; ent.voice = c.voice; ent.person = null; }
    ent.side = s.side; ent.role = s.role; ent.pid = s.id; ent.name = s.name; ent.human = !!s.human; ent.remote = !!s.remote; ent.color = s.color || E.PLAYER_COLORS && E.PLAYER_COLORS[s.id % 4] || '#ffffff';
    ent.watcher = !det; ent.range = 150; ent.fov = 1.8; ent.minds = {}; ent.knows = new Set();
    const p = Object.assign({ ent, score: 0, photos: 0, burns: 0, callouts: 0, count: 0, acts: {} }, s); this.players.push(p);
    if (!det && s.role === 'lt') { this.corner.crew.lieutenant = ent; this.corner.o.player = ent; this.corner.agents = this.corner.agents.filter(a => a.person !== 'tee'); }
    if (!det && s.role === 'lookout') { this.corner.agents = this.corner.agents.filter(a => a.person !== 'moe'); (this.corner.crew.lookouts = this.corner.crew.lookouts.filter(a => a.person !== 'moe')).push(ent); }
    return p;
  }
  idOf(a) { if (!this.ids.has(a)) this.ids.set(a, ++this.nid); return this.ids.get(a); }
  npcs() { return [...this.corner.agents, ...this.civs]; }
  dets() { return this.players.filter(p => p.side === 'detail'); }
  cornerP() { return this.players.filter(p => p.side === 'corner'); }
  quota() { return Math.round(VS.quotaPerMin * this.len / 60); }
  emit(k, o = {}) { const e = Object.assign({ k, t: this.t }, o); this.events.push(e); BUS.emit('vsEvent', e); }
  addEv(p, n, why) { this.ev = Math.max(0, this.ev + n); p.score += Math.max(0, n); this.emit('ev', { id: p.id, n, why }); }
  /** one step of the round on the host */
  update(dt, timeLeft) {
    if (this.over) return;
    this.t += dt; const c = this.corner;
    // AI lookouts build suspicion on detectives; full = burned
    const cops = this.dets().map(p => p.ent).filter(e => !e.burned);
    Perception.update(dt, c.watchers().filter(w => !w.human), cops, { mul: 1.1, onMade: (o, q) => this.burn(q, 'made') });
    for (const p of this.players) { const e = p.ent; if (e.burned && this.t > (this.burnT[p.id] || 0)) e.burned = false; if (e.bot) e.bot(dt); }
    c.update(dt, {});
    for (const a of this.civs) { a.civT -= dt; if (a.civT <= 0 && !a.goal) { if (this.rnd() < .4) { a.doAct('idle', 3 + this.rnd() * 4); a.civT = a.actT; } else { const s = SIDEWALK.filter(([x, y]) => x >= 10 && x <= 55 && y >= 15 && y <= 45); const q = s[Math.floor(this.rnd() * s.length)]; a.goCell(q[0], q[1]); a.civT = 2; } } a.update(dt); }
    if (this.reupWait > 0) { this.reupWait -= dt; if (this.reupWait <= 0) { c.reup(60); this.emit('reup'); } }
    for (const p of this.cornerP()) p.count = Math.round((c.led.banked + c.led.cash) / Math.max(1, this.cornerP().length));
    if (this.ev >= 100) this.end('detail');
    else if (timeLeft <= 0) this.end(c.led.banked + c.led.cash >= this.quota() ? 'corner' : 'draw');
  }
  burn(ent, why) { const p = this.players.find(q => q.ent === ent); if (!p || ent.burned) return; ent.burned = true; this.burnT[p.id] = this.t + 25; p.burns++; this.emit('burn', { id: p.id, why }); }
  /** actions, validated on the host */
  act(p, k, o = {}) {
    const e = p.ent, c = this.corner;
    if (k === 'photo' && p.side === 'detail') {
      const t = this.npcs().find(a => this.idOf(a) === o.target) || null; let stars = Math.min(3, o.q || 0);
      if (!t || dist(e, t) > 240 || !World.map.sight({ x: e.x, y: e.y, z: 0 }, { x: t.x, y: t.y, z: 0 })) stars = 0;
      if (e.burned) stars = 0;
      const actOk = o.act && c.acts.some(a => a.who === t.id && this.t - a.t < (o.act === t.act ? 9 : 1.6));
      p.photos++;
      if (t && t.role && stars) {
        if (o.face && !p.acts['f' + t.id]) { p.acts['f' + t.id] = 1; this.addEv(p, 4, 'face ' + nameOf(t.person || t.role)); }
        if (actOk && (p.acts['a' + t.id] || 0) < 2) { p.acts['a' + t.id] = (p.acts['a' + t.id] || 0) + 1; p.actN = (p.actN || 0) + 1; if (o.act === 'stash-access' && !this.stashFirst) { this.stashFirst = true; this.addEv(p, 25, 'the stash'); } else this.addEv(p, 12, o.act); }
      }
      this.emit('photo', { id: p.id, stars });
    }
    if (k === 'tap' && p.side === 'detail') { const ph = o.phone; if (ph && !this.tapped[ph] && !c.agents.some(a => a.role && dist(a, e) < 120)) { this.tapped[ph] = p.id; this.emit('tap', { id: p.id, phone: ph }); } }
    if (k === 'jump' && p.side === 'detail' && !this.jumped[p.id]) { this.jumped[p.id] = 1; const t = this.npcs().find(a => this.idOf(a) === o.target); if (t) game.after(8, () => { if (this.over) return; const got = t.carrying || (t === c.crew.money && c.led.cash > 0); if (got) { c.knockers(t); this.addEv(p, 20, 'jump-out seizure'); } else this.addEv(p, -10, 'jump-out, clean'); this.emit('jump', { id: p.id, hit: !!got }); }); }
    if (k === 'callout' && p.side === 'corner') {
      if ((this.calloutCd[p.id] || 0) > this.t) return; this.calloutCd[p.id] = this.t + 15;
      const tgt = this.players.find(q => q.side === 'detail' && 'P' + q.id === o.target) || null;
      if (tgt) { this.burn(tgt.ent, 'callout'); p.callouts++; p.score += 20; if (!this.awards.some(a => a.title === 'Made You')) this.awards.push({ id: p.id, title: 'Made You', detail: 'First correct call-out' }); }
      else { c.led.cash = Math.max(0, c.led.cash - 200); c.led.taken = c.led.banked + c.led.cash + c.led.seizedCash; c.spawnT = 10; this.emit('wrong', { id: p.id }); }
      this.emit('callout', { id: p.id, ok: !!tgt });
    }
    if (k === 'shut' && p.side === 'corner') c.open ? c.shutdown('call', 30) : c.openUp();
    if (k === 'stash' && p.role === 'lt') { const n = { v1412: 'buick', buick: 'trashGate', trashGate: 'v1412' }[c.o.stash]; c.setStash(n); this.stashFirst = false; this.emit('stash'); }
    if (k === 'reup' && p.role === 'lt' && c.led.vials < 20 && this.reupWait <= 0) { this.reupWait = 20; const ph = o.phone; if (ph && this.tapped[ph] !== undefined) { const d = this.players.find(q => q.id === this.tapped[ph]); if (d) this.addEv(d, 10, 'tapped re-up call'); } this.emit('reupCall', { phone: ph }); }
  }
  end(outcome) {
    if (this.over) return; this.over = outcome; const dets = this.dets(), cps = this.cornerP();
    const top = (list, f) => list.slice().sort((a, b) => f(b) - f(a))[0];
    const eo = top(dets, p => p.actN || 0); if (eo && eo.actN) this.awards.push({ id: eo.id, title: 'Eyes On', detail: eo.actN + ' hand-to-hand photos' });
    for (const p of cps) if (!this.corner.led.seized) this.awards.push({ id: p.id, title: 'Clean Hands', detail: 'Never seized' });
    for (const p of cps) p.score = Math.round(p.count / 10) + p.callouts * 20;
    this.emit('end', { outcome });
  }
  /** the snapshot the host sends 10 times a second (under 1,100 bytes) */
  snap(half) {
    const q = v => Math.round(v), f = a => Math.round(((a % TAU) + TAU) % TAU / TAU * 64) % 64, st = a => a.act ? 5 : a.pose === 'down' ? 6 : Math.hypot(a.body.vx, a.body.vy) > 60 ? 2 : Math.hypot(a.body.vx, a.body.vy) > 5 ? 1 : 0;
    const L = this.corner.led, npcs = this.npcs();
    const list = half === undefined ? npcs : npcs.filter((a, i) => i % 2 === half);
    return { t: 's', at: q(this.t * 10), ev: Math.round(this.ev), cn: L.banked + L.cash, sh: this.corner.open ? 0 : 1, vi: L.vials,
      p: this.players.map(p => [p.id, q(p.ent.x), q(p.ent.y), f(p.ent.facing), st(p.ent), (p.ent.burned ? 1 : 0)]),
      n: list.map(a => [this.idOf(a), q(a.x), q(a.y), f(a.facing), st(a), a.act ? ACTS.indexOf(a.act) + 1 : 0]) };
  }
  roster() { return this.npcs().map(a => [this.idOf(a), a.person || 0, a.seedId || 1, a.role || 0, a.kind === 'fiend' ? 1 : 0]); }
}
/* bots */
function cornerBot(sim, p) {
  const e = p.ent, c = sim.corner; let t = 0;
  return dt => {
    t += dt; if (sim.over) return;
    if (c.open && c.watchers().some(w => w.minds && Object.values(w.minds).some(m => m.state === 'search' || m.state === 'alert'))) sim.act(p, 'shut');
    if (t > 4) { t = 0;
      let best = null, bs = .8; for (const w of c.watchers()) for (const [id, m] of Object.entries(w.minds || {})) if (m.level > bs) { bs = m.level; best = id; }
      if (best) sim.act(p, 'callout', { target: best });
      if (c.led.vials < 20 && sim.reupWait <= 0) { const ph = ['P1', 'P2', 'P3'].find(k => sim.tapped[k] === undefined) || 'P1'; sim.act(p, 'reup', { phone: ph }); }
    }
    const home = p.role === 'lt' ? C(30.2, 31.2) : C(33.4, 30.6); const d = dist(e, home); e.body.vx = d > 6 ? (home.x - e.x) / d * 50 : 0; e.body.vy = d > 6 ? (home.y - e.y) / d * 50 : 0; e.body.update(dt, World.map); if (d > 6) e.facing = Math.atan2(e.body.vy, e.body.vx);
    e.rig.update(dt, { x: e.x, y: e.y, z: 0, vx: e.body.vx, vy: e.body.vy, facing: e.facing });
  };
}
function detBot(sim, p) {
  const e = p.ent; let v = null, t = 0, shot = 0, tapT = 30 + sim.rnd() * 30;
  return dt => {
    if (sim.over) return; t += dt; shot -= dt; tapT -= dt;
    const heat = Math.max(0, ...sim.corner.watchers().map(w => w.minds && w.minds[e.id] ? w.minds[e.id].level : 0));
    if (!v || heat > .5 || t > 40) { t = 0; v = C(...VANTAGE[Math.floor(sim.rnd() * VANTAGE.length)]); }
    const d = dist(e, v);
    if (d > 8) { const n = World.flow(...World.map.toCell(v.x, v.y)).next(e.x, e.y) || v, l = Math.hypot(n.x - e.x, n.y - e.y) || 1; e.body.vx = (n.x - e.x) / l * 50; e.body.vy = (n.y - e.y) / l * 50; e.facing = Math.atan2(e.body.vy, e.body.vx); e.moving = true; e.still = 0; }
    else { e.body.vx = e.body.vy = 0; e.moving = false; e.still += dt;
      const sale = sim.corner.agents.find(a => a.act && ACTS.includes(a.act) && dist(a, e) < 200);
      if (sale && shot <= 0) { shot = 3; e.facing = angTo(e, sale); const face = Math.abs(angDiff(sale.facing, angTo(sale, e))) < 1.3; sim.act(p, 'photo', { target: sim.idOf(sale), q: 2 + (face ? 1 : 0), face, act: sale.act }); }
      if (tapT <= 0) { tapT = 60; const ph = ['P1', 'P2', 'P3'].find(k => sim.tapped[k] === undefined && dist(e, C(...POI[k])) < 140); if (ph) sim.act(p, 'tap', { phone: ph }); }
    }
    vClamp(e); e.body.update(dt, World.map); e.rig.update(dt, { x: e.x, y: e.y, z: 0, vx: e.body.vx, vy: e.body.vy, facing: e.facing, pose: e.moving ? null : 'phone' });
  };
}

/* ---- the scene ---- */
const Versus = {
  pausable: true, view: 'iso', views: ['iso'], camera: { zoom: [.8, 1.8], start: 1.1 },
  sim: null, me: null, net: null,
  /** seats: [{ id, name, side, role, human, ctl, remote }] */
  enter(d = {}) {
    this.d = d; this.mode = d.mode || 'local'; this.results = false; this.toasts = [];
    World.setMood('dusk'); Music.play('versus'); for (const l of ['pressure', 'clock', 'cash']) Music.layer(l, 0, .1);
    if (this.mode === 'hub-client') { this.vw = new VersusView(d); this.sim = null; }
    else { this.sim = new VersusSim({ seats: d.seats, len: d.len, seed: d.seed, rnd: d.rnd, rndWorld: d.rndWorld });
      for (const p of this.sim.players) if (!p.human && !p.remote) p.ent.bot = p.side === 'corner' ? cornerBot(this.sim, p) : detBot(this.sim, p); }
    this.locals = (this.sim ? this.sim.players : this.vw.players).filter(p => p.human && !p.remote);
    const follow = this.locals.map(p => p.ent);
    if (follow.length === 2) game.splitScreen(2, { follow, layout: 'auto' }); else { game.splitScreen(0); game.follow(null); }
    if (!follow.length) game.cam.frame && game.cam.frame([C(25, 28), C(40, 34)], { margin: 40 });
    game.cam.bounds = v => World.map.bounds(v);
    BUS.h.vsEvent = []; BUS.on('vsEvent', e => this.onEvent(e));
    this.start = HUB ? null : 0; this.countdown = d.countdown || 0;
    if (ui) ui.hud({});
  },
  exit() { game.splitScreen(0); BUS.h.vsEvent = []; game.lights.enabled = false; },
  onEvent(e) {
    const nm = id => { const p = (this.sim || this.vw).players.find(q => q.id === id); return p ? p.name : 'P' + id; };
    const msg = { burn: e => [nm(e.id) + ' is burned', e.why === 'made' ? 'The lookouts made them' : 'Called out'], tap: e => ['Payphone tapped', e.phone], callout: e => [e.ok ? 'Called out a cop' : 'Called out a civilian', nm(e.id) + (e.ok ? '' : ' · −$200')], reup: () => ['Package in', '+60 vials'],
      jump: e => ['Jump-out', e.hit ? 'Seized!' : 'Clean'], ev: e => e.n > 0 ? ['Evidence +' + e.n, e.why] : null, stash: () => ['Stash moved', ''] }[e.k];
    const m = msg && msg(e); if (m) { this.toasts.push({ t: 3, a: m[0], b: m[1] }); if (this.toasts.length > 4) this.toasts.shift(); }
    if (e.k === 'photo') shutterSound(); if (e.k === 'burn' || e.k === 'callout') sfx('whistle'); if (e.k === 'jump') sfx('yelp');
    if (this.net && this.net.isHost && !['ev'].includes(e.k)) this.net.event(e);
    if (e.k === 'end') this.finish(e.outcome);
  },
  timeLeft() { if (HUB && this.net) return this.net.timeLeft(); return (this.sim ? this.sim.len : VS.len) - (this.sim ? this.sim.t : 0); },
  update(dt) {
    if (Globals.tick(dt)) return;
    if (UI.update(dt)) return;
    for (const t of this.toasts) t.t -= dt; this.toasts = this.toasts.filter(t => t.t > 0);
    if (this.results) { if (!HUB && game.input.pressed('confirm')) game.go('title', {}); return; }
    if (HUB && this.net && !this.net.started()) return;
    for (const p of this.locals) this.drive(p, dt);
    if (this.sim) this.sim.update(dt, this.timeLeft());
    if (this.vw) this.vw.update(dt);
    if (this.net) this.net.tick(dt);
    const s = this.sim || this.vw, ev = this.sim ? this.sim.ev : this.vw.ev, cn = this.sim ? this.sim.corner.led.banked + this.sim.corner.led.cash : this.vw.cn, quota = Math.round(VS.quotaPerMin * (this.sim ? this.sim.len : VS.len) / 60);
    Music.layer('pressure', ev >= 50 ? 1 : 0, 1); Music.layer('clock', this.timeLeft() < 60 ? 1 : 0, 1); Music.layer('cash', cn >= quota * 2 / 3 ? 1 : 0, 1);
    if (this.locals.length === 1) { const e = this.locals[0].ent, w = e.cam.watching && e.cam.aim; game.focus(w ? lerp(e.x, e.cam.aim.x, .5) : e.x, w ? lerp(e.y, e.cam.aim.y, .5) : e.y, 16); }
    else if (!this.locals.length && this.sim) { const pts = this.sim.players.map(p => p.ent); game.focus(pts.reduce((a, b) => a + b.x, 0) / pts.length, pts.reduce((a, b) => a + b.y, 0) / pts.length, 16); }
  },
  /** a local human's character: moves, watches, acts */
  drive(p, dt) {
    const e = p.ent, c = e.ctl, g = c.ground(), m = Math.min(1, Math.hypot(g[0], g[1])), host = this.sim;
    e.cam.watching = c.watching(); const spd = e.cam.watching ? 20 : c.running() ? 85 : 52;
    e.body.vx = m > .05 ? g[0] / m * spd * Math.min(1, m / .62) : 0; e.body.vy = m > .05 ? g[1] / m * spd * Math.min(1, m / .62) : 0;
    e.moving = m > .1; e.still = e.moving ? 0 : e.still + dt; if (e.moving && !e.cam.watching) e.facing = Math.atan2(g[1], g[0]);
    e.blending = c.down('blend') && p.side === 'detail' && !e.moving; e.body.update(dt, World.map); vClamp(e);
    e.rig.update(dt, { x: e.x, y: e.y, z: 0, vx: e.body.vx, vy: e.body.vy, facing: e.facing, pose: e.cam.watching ? 'cast' : e.blending ? 'hips' : null });
    const npcs = this.sim ? this.sim.npcs() : this.vw.npcList(), others = (this.sim || this.vw).players.filter(q => q !== p).map(q => q.ent);
    const send = (k, o) => { if (host) host.act(p, k, o); else this.net.act(k, o); };
    if (e.cam.watching) {
      Camera.update(dt, e.cam, e, c, p.side === 'corner' ? [...npcs, ...others] : npcs, { noRead: true });
      e.aimAt = e.cam.aim;
      if (p.side === 'detail' && c.pressed('photo')) { const t = e.cam.target; if (e.cam.film > 0) { const sc = Camera.score(e.cam, e, t); e.cam.film = Math.max(0, e.cam.film - 1); shutterSound(); e.cam.flash = .08; send('photo', { target: t ? (host ? host.idOf(t) : t.nid) : 0, q: sc.stars, face: sc.tags.includes('face'), act: t && t.act }); } }
      if (p.side === 'detail' && c.pressed('partner') && e.cam.target) send('jump', { target: host ? host.idOf(e.cam.target) : e.cam.target.nid });
      if (p.side === 'corner' && (c.pressed('partner') || c.pressed('photo')) && e.cam.target) { const t = e.cam.target; send('callout', { target: t.pid !== undefined ? 'P' + t.pid : t.id }); }
    } else { e.cam.target = null; e.aimAt = null; }
    if (p.side === 'corner' && c.pressed('blend')) send('shut');
    const near = id => dist(e, C(POI[id][0], POI[id][1] + (POI[id][1] === 26 ? .4 : -.4))) < 22, phone = ['P1', 'P2', 'P3'].find(near);
    e.vsPrompt = null;
    if (p.side === 'detail' && phone) { e.vsPrompt = ['interact', 'Tap ' + phone + ' (hold)']; if (c.down('interact')) { e.tapT = (e.tapT || 0) + dt; if (e.tapT > 4) { e.tapT = 0; send('tap', { phone }); } } else e.tapT = 0; }
    if (p.side === 'corner' && p.role === 'lt' && phone) { e.vsPrompt = ['interact', 'Re-up (' + phone + ')']; if (c.pressed('interact')) send('reup', { phone }); }
    const stashAt = this.sim ? this.sim.corner.stashAt : null;
    if (p.side === 'corner' && p.role === 'lt' && stashAt && dist(e, stashAt) < 30) { e.vsPrompt = ['interact', 'Move the stash']; if (c.pressed('interact')) send('stash'); }
    if (c.tick) c.tick();
  },
  finish(outcome) {
    if (this.results) return; this.results = true; const sim = this.sim;
    if (sim && this.net && this.net.isHost) this.net.finish(sim, outcome);
    if (!HUB) game.after(.5, () => this.showResults(outcome));
    else if (this.net) this.net.onLocalEnd(outcome);
  },
  showResults(outcome) {
    const s = this.sim || this.vw, P = s.players;
    UI.open({ id: 'vres', cls: 'vres', legend: [['confirm', HUB ? 'OK' : 'Back to the title']], render(el) {
      el.append(h('div.panel.dark', h('div.kicker', { text: 'THE GAME · RESULT' }), h('h1', { text: outcome === 'detail' ? 'The Detail made its case' : outcome === 'corner' ? 'The Corner made the count' : 'The game goes on' }),
        h('div.grid', P.map(p => h('div.person', h('b', { text: p.name, style: { color: p.color || '#fff' } }), h('span', { text: (p.side === 'detail' ? 'Detail' : 'Corner') + ' · ' + (p.side === 'detail' ? 'Evidence ' + p.score + ' · Photos ' + p.photos + ' · Burned ' + p.burns : 'Count $' + p.count + ' · Call-outs ' + p.callouts) })))),
        h('div.small', { text: (s.awards || []).map(a => a.title + ': ' + (P.find(p => p.id === a.id) || {}).name).join(' · ') }),
        HUB ? null : btn('Back to the title', () => { UI.close(); game.go('title', {}); }, 'primary')));
    }, model(ss) { ss.confirm = () => { UI.close(ss); if (!HUB) game.go('title', {}); }; } });
  },
  draw(r) {
    World.draw(r);
    const s = this.sim || this.vw, me = r.viewport ? this.locals[r.viewport.i] : this.locals[0];
    for (const a of (this.sim ? this.sim.npcs() : this.vw.npcList())) a.draw(r);
    for (const p of s.players) { const e = p.ent, mine = me === p, mySide = me && me.side === p.side;
      r.shadow(e.x, e.y, 6, .35); r.actor(e.x, e.y, 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { pick: e, xray: mine ? { color: '#ffb347' } : false, flash: e.burned && (mySide === false || !me) ? '#ff4a3a' : undefined, flashMix: .3 });
      e.scr = r.w(e.x, e.y, 22); e.head = r.w(e.x, e.y, 46);
      if (mine || mySide || !me) r.overlay(g => E.font.text(g, p.name, Math.round(e.head[0]), Math.round(e.head[1]) - 10, p.color || '#ffffff', { align: 'center', shadow: '#000', outline: false })); }
    if (me) Camera.draw(r, me.ent.cam, me.ent);
    drawBubbles(r, this.sim ? this.sim.npcs() : this.vw.npcList(), null, () => true);
    if (r.viewport && me) this.hudOne(r, me);
    if (!r.viewport) { if (me) this.hudOne(r, me); this.hudTop(r); }
    Attract.overlay(r);
  },
  hud(r) { this.hudTop(r); },
  hudOne(r, p) {
    const e = p.ent, vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H };
    r.overlay(g => {
      const x = 8, y = vp.h - 34;
      E.ui.box(g, x - 2, y - 2, 150, 28, { bg: '#141210', border: '#3a342c', alpha: .8, gradient: false });
      E.font.text(g, (p.side === 'detail' ? 'DETAIL · ' : p.role === 'lt' ? 'CORNER · LIEUTENANT' : 'CORNER · LOOKOUT') + (e.burned ? ' · BURNED' : ''), x + 2, y, e.burned ? '#ff5a4a' : '#ffb347', { outline: false });
      let gx = x + 2; const gy = y + 12;
      if (p.side === 'detail') { gx += Glyph.prompt(g, 'watch', 'Watch', gx, gy, '#e8e4dc', e.ctl.inp) + 6; gx += Glyph.prompt(g, 'photo', 'Photo', gx, gy, '#e8e4dc', e.ctl.inp) + 6; }
      else { gx += Glyph.prompt(g, 'watch', 'Watch', gx, gy, '#e8e4dc', e.ctl.inp) + 6; gx += Glyph.prompt(g, 'partner', 'Call out', gx, gy, '#e8e4dc', e.ctl.inp) + 6; }
      if (e.vsPrompt) Glyph.prompt(g, e.vsPrompt[0], e.vsPrompt[1], x + 2, y - 14, '#ffffff', e.ctl.inp);
      else if (p.side === 'corner') Glyph.prompt(g, 'blend', 'Shut down / open', x + 2, y - 14, '#cfc8b8', e.ctl.inp);
    });
  },
  hudTop(r) {
    const s = this.sim || this.vw, ev = this.sim ? this.sim.ev : s.ev, cn = this.sim ? this.sim.corner.led.banked + this.sim.corner.led.cash : s.cn, quota = Math.round(VS.quotaPerMin * (this.sim ? this.sim.len : VS.len) / 60), tl = Math.max(0, this.timeLeft()), shut = this.sim ? !this.sim.corner.open : s.sh;
    r.overlay(g => {
      const w = Math.min(260, r.W - 140), x = Math.round(r.W / 2 - w / 2), y = 6;
      E.ui.box(g, x - 4, y - 3, w + 8, 30, { bg: '#141210', border: '#3a342c', alpha: .85, gradient: false });
      E.font.text(g, Math.floor(tl / 60) + ':' + String(Math.floor(tl % 60)).padStart(2, '0'), r.W / 2, y, tl < 60 ? '#ff5a4a' : '#f2ead8', { align: 'center', outline: false });
      E.font.text(g, 'CASE ' + Math.round(ev) + '/100', x, y + 10, '#7aa7ff', { outline: false }); E.ui.bar(g, x, y + 19, Math.round(w / 2) - 4, 3, Math.min(1, ev / 100), '#7aa7ff');
      E.font.text(g, 'COUNT $' + cn + '/' + quota, x + w, y + 10, '#ffb347', { align: 'right', outline: false }); E.ui.bar(g, x + Math.round(w / 2) + 4, y + 19, Math.round(w / 2) - 4, 3, Math.min(1, cn / quota), '#ffb347');
      if (shut) E.font.text(g, 'SHUT DOWN', r.W / 2, y + 30, '#ff5a4a', { align: 'center', outline: false });
      this.toasts.forEach((t, i) => E.font.text(g, t.a + (t.b ? ' · ' + t.b : ''), r.W - 8, 40 + i * 10, '#e9dcb5', { align: 'right', shadow: '#000', outline: false }));
      if (this.countdown > 0 || (HUB && this.net && this.net.countdownLeft() > 0)) { const n = Math.ceil(HUB && this.net ? this.net.countdownLeft() : this.countdown); E.font.text(g, String(n), r.W / 2, r.H / 2 - 20, '#ffb347', { align: 'center', scale: 3, outline: false }); }
    });
  }
};
/** a client's view of the host's world: entities from the snapshots, 150 ms behind, interpolated */
class VersusView {
  constructor(d) {
    this.players = d.seats.map(s => { const det = s.side === 'detail', ent = makePlayer(det ? null : s.role === 'lt' ? 'tee' : 'moe', C(30, 31), { id: 'P' + s.id, ctl: s.ctl || new BotCtl(), cop: det }); if (det) { const c = civRig(900 + s.id * 17); ent.rig = c.rig; } ent.pid = s.id; return Object.assign({ ent, score: 0, photos: 0, burns: 0, callouts: 0, count: 0 }, s); });
    this.npcs = new Map(); this.buf = []; this.ev = 0; this.cn = 0; this.sh = 0; this.awards = [];
  }
  npcList() { return Array.from(this.npcs.values()); }
  roster(list) { for (const [nid, person, seed, role, fiend] of list) if (!this.npcs.has(nid)) { const a = new Agent({ id: 'n' + nid, person: person || null, x: 0, y: 0, seed: seed || nid, role: role || null, kind: fiend ? 'fiend' : 'civ' }); a.nid = nid; this.npcs.set(nid, a); } }
  snap(s) { this.buf.push(Object.assign({ rt: performance.now() }, s)); if (this.buf.length > 20) this.buf.shift(); this.ev = s.ev; this.cn = s.cn; this.sh = s.sh; }
  update(dt) {
    const now = performance.now() - 150, B = this.buf; if (!B.length) return;
    let a = B[0], b = B[B.length - 1]; for (let i = 0; i < B.length - 1; i++) if (B[i].rt <= now && B[i + 1].rt >= now) { a = B[i]; b = B[i + 1]; break; }
    const k = b.rt > a.rt ? clamp((now - a.rt) / (b.rt - a.rt), 0, 1) : 1;
    const mapA = new Map((a.n || []).map(r => [r[0], r])), mapB = new Map((b.n || []).map(r => [r[0], r]));
    for (const [nid, rb] of mapB) { const ag = this.npcs.get(nid); if (!ag) continue; const ra = mapA.get(nid) || rb; const x = lerp(ra[1], rb[1], k), y = lerp(ra[2], rb[2], k), vx = (rb[1] - ra[1]) * 10, vy = (rb[2] - ra[2]) * 10;
      ag.body.x = x; ag.body.y = y; ag.facing = rb[3] / 64 * TAU; ag.act = rb[5] ? ACTS[rb[5] - 1] : null; ag.rig.update(dt, { x, y, z: 0, vx, vy, facing: ag.facing, pose: rb[4] === 6 ? 'down' : rb[4] === 5 ? 'guard' : null }); }
    for (const r of b.p || []) { const p = this.players.find(q => q.id === r[0]); if (!p || (p.human && !p.remote)) continue; const e = p.ent; e.body.x = lerp(e.body.x, r[1], .3); e.body.y = lerp(e.body.y, r[2], .3); e.facing = r[3] / 64 * TAU; e.burned = !!r[5]; e.rig.update(dt, { x: e.x, y: e.y, z: 0, vx: r[4] ? 30 : 0, vy: 0, facing: e.facing }); }
    for (const r of b.p || []) { const p = this.players.find(q => q.id === r[0]); if (p && p.human && !p.remote) p.ent.burned = !!r[5]; }
  }
}
