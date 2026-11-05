/* 24-match: one Match class plays every match (vacation, tutorial, semifinal, final, Beach Match, AI Hub, attract).
 * Phases: intro -> coin -> serveSetup -> toss -> rally -> dead -> point -> [replay] -> ... -> end -> results.
 * The ball is a closed-form launch on the match clock; each launch plans the next contact (who plays it, when: t*, where:
 * P*, at what height); AI players execute at t*, humans press Play against t* (the judge), and the net and the sand
 * decide the rest. Everything random comes from the 'match' stream, so a seed and inputs replay exactly. */
const MC = G.C, VBm = G.VB;
E.VIEWS.court = E.VIEWS.court || new E.View('court', 'Broadcast', 12, 30, 1.5, 1);   // a touch of yaw so the net reads as a band
E.VIEWS.servecam = E.VIEWS.servecam || new E.View('servecam', 'Serve Cam', -90, 46, 1.5, 1);
G.Commentary = class Commentary {
  constructor() { this.q = []; this.cur = null; this.on = true; this.who = 'sonny'; }
  say(text, who = 'sonny', prio = 0) { if (!this.on || !text) return; if (this.cur && prio > (this.cur.prio || 0)) this.cur = null; if (this.q.length > 2) this.q.shift(); this.q.push({ text, who, prio, t: 0, shown: 0 }); }
  update(dt) {
    if (!this.cur && this.q.length) this.cur = this.q.shift();
    const c = this.cur; if (!c) return;
    c.t += dt; const prev = Math.floor(c.shown); c.shown = Math.min(c.text.length, c.shown + dt * 40 * (G.TEXT_SPEED[G.setting('textSpeed', 'Normal')] || 1));
    for (let i = prev; i < Math.floor(c.shown); i++) if (/[a-z]/i.test(c.text[i])) G.voice.letter(c.who, c.text[i], i, c.text, 'excited');
    if (c.shown >= c.text.length && c.t > c.text.length / 40 + 2.2) this.cur = null;
  }
  draw(g, r, y0) {
    const c = this.cur; if (!c) return;
    const w = Math.min(200, Math.round(r.W * .46)), lines = E.font.wrap(c.text, w - 40), h = Math.max(30, lines.length * 9 + 14), x = r.W - w - Math.round(r.W * .04), y = y0 !== undefined ? y0 - h : r.H - h - Math.round(r.H * .05) - 18;
    G.ui.panel(g, x, y, w, h, { alpha: .88 });
    G.portrait(g, G.portraitRig(c.who), x + 4, y + 4, 22, { frame: false });
    E.font.text(g, G.CAST[c.who].name.toUpperCase(), x + 30, y + 3, G.CAST[c.who].color || '#ffd36a', { shadow: '#000', outline: false });
    let left = Math.floor(c.shown);
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; if (s) E.font.text(g, s, x + 30, y + 12 + i * 9, '#fff8e8', { shadow: '#0a0814', outline: false }); });
  }
};

G.Match = class Match {
  constructor(cfg) {
    this.cfg = cfg; this.mode = cfg.mode || 'exhibition'; this.now = 0; this.phase = 'intro'; this.phaseT = 0;
    this.seed = cfg.seed === undefined ? 1 : cfg.seed; G.seed('match', this.seed);
    this.rules = new G.Rules({ pointsToWin: cfg.pointsToWin || 7, sets: cfg.sets || 1, firstServe: cfg.firstServe === undefined ? 0 : cfg.firstServe });
    this.difficulty = cfg.difficulty || G.setting('difficulty', 'Normal');
    this.spectacle = !!cfg.spectacle; this.tod = cfg.tod || 'afternoon'; this.weather = cfg.weather || 'sunny';
    this.wind = this.weather === 'rain' ? 14 : 0; this.wet = this.weather === 'rain';
    this.players = []; this.humanSide = null;
    cfg.teams.forEach((team, side) => team.forEach((o, slot) => {
      const p = VBm.makePlayer(this, Object.assign({}, o, { side, slot, id: side * 2 + slot }));
      if (o.ctl && o.ctl.kind === 'human') this.humanSide = side;
      p.affinity = o.affinity; p.partnerOfHuman = !!o.partnerOfHuman; p.celebrate = o.celebrate;
      this.players.push(p);
    }));
    this.teamNames = cfg.teamNames || [0, 1].map(s => this.players.filter(p => p.side === s).map(p => p.name).join(' & '));
    this.L = null; this.ball = { x: MC.NET_X, y: MC.CY, z: 0, spin: 0 }; this.held = null; this.trail = [];
    this.side = 0; this.touches = 0; this.lastTouch = null; this.lastWasBlock = false; this.rallyTouches = 0; this.plan = null;
    this.server = null; this.serve = null; this.banner = null; this.popups = []; this.decals = [];
    this.view = E.VIEWS.court; this.camMode = cfg.camera || G.setting('matchCam', 'Broadcast');
    this.talk = new G.Commentary(); this.talk.on = cfg.commentary !== false && G.setting('commentary', true) !== false;
    this.crowd = G.makeCrowd(this.seed + 3, cfg.final ? 30 : 24);
    this.replayOn = cfg.replay !== false && !G.hub; this.buf = []; this.lastReplayPt = -9; this.replay = null;
    this.tips = cfg.tutorial ? new Set() : null; this.tip = null; this.autoReceives = cfg.tutorial ? 2 : 0;
    this.specials = cfg.specials || {}; this.edgeUsed = {}; this.luckyArmed = false; this.luckyDone = false; this.dazzled = null;
    this.result = null; this.resultsUI = null; this.over = false; this.perfectPlayer = false; this.cpuControl = false;
    this.debugOverlay = false; this.slowmo = 1; this.netShake = 0; this.shakeT = 0; this.matchPointShown = false; this.groan = 0;
    this.role = cfg.role || 'local'; this.net = cfg.net || null;
    this.setupIntro();
  }
  /* ---------------- set-up ---------------- */
  setupIntro() {
    this.players.forEach(p => { const dir = p.side ? 1 : -1; p.x = MC.NET_X + dir * 26; p.y = MC.CY + (p.slot ? 26 : -26); p.facing = p.side ? Math.PI : 0; p.act = 'ready'; p.actT0 = 0; });
    this.setPhase('intro');
    const line = this.cfg.introLine || G.pickLine && G.pickLine('sonny', this.mode === 'final' ? 'finalIntro' : 'matchIntro', { a: this.teamNames[0], b: this.teamNames[1] });
    if (line) this.talk.say(line, 'sonny', 1);
  }
  setPhase(ph) { this.phase = ph; this.phaseT = 0; if (this.net && this.role === 'host') this.net.onPhase(this, ph); }
  humans() { return this.players.filter(p => p.ctl.kind === 'human'); }
  mate(p) { return this.players.find(q => q.side === p.side && q !== p); }
  blockerFor(s) { return VBm.AI.blocker(this, s); }
  dust(x, y, n) { G.game.particles.dust(x, y, 1, n, { color: '#f0dca8', speed: 22, size: 1.4 }); }
  act(p, a, extra) { p.act = a; p.actT0 = this.now; if (extra) Object.assign(p, extra); }
  popup(p, text, col) { this.popups.push({ x: p.x, y: p.y, z: 48, text, col: col || '#ffffff', t: 0 }); }
  bannerSay(key, extra) { const c = G.CALLS[key]; this.banner = { text: c ? c[0] : key, icon: c ? c[1] : 'ball', t: 0, sub: extra || '' }; }

  /* ---------------- serving ---------------- */
  placeForServe() {
    const s = this.rules.serveSide, srv = this.rules.nextServer(s, this.players);
    this.server = srv; this.side = s; this.touches = 0; this.lastTouch = null; this.lastWasBlock = false; this.rallyTouches = 0; this.plan = null; this.L = null;
    this.dazzled = null; this.held = srv; this.serve = { kind: null, tossT: null, apexT: null, wait: srv.ctl.kind === 'human' ? 10 : G.rand('match', 1.2, 2.5), done: false, glare: false };
    for (const p of this.players) {
      p.jump = null; p.block = null; p.dive = null; p.z = 0; p.vx = p.vy = 0; p.pending = null; p.lockT = 0; p.call = 'auto';
      if (p === srv) { p.x = p.side ? MC.X1 + 20 : MC.X0 - 20; p.y = MC.CY + (p.slot ? 20 : -20); }
      else { const t = VBm.AI.spot(this, p); p.x = t[0]; p.y = t[1]; }
      p.facing = p.side ? Math.PI : 0; this.act(p, 'ready');
    }
    if (this.specials.glare && srv.cast === 'sonny' && (this.mode === 'attract' || G.chance('match', .5))) this.serve.glare = true;
    if (this.spectacle) this.specLen = G.randInt('match', 3, 9);
    this.setPhase('serveSetup');
    if (this.tips && srv.ctl.kind === 'human') this.showTip('serve');
  }
  toss(kind) {
    const p = this.server, sv = this.serve; if (!p || sv.tossT !== null) return;
    sv.kind = kind; sv.tossT = this.now;
    const up = kind === 'jump' ? .75 : .5, h0 = 30 * p.size / 1.25, apexZ = kind === 'jump' ? VBm.standReach(p) + VBm.jumpH(p) * .9 + 2 : VBm.standReach(p) + 6;
    const dir = p.side ? -1 : 1, hx = p.x + dir * (kind === 'jump' ? 14 : 4);
    // straight up, apex at tossT + up: v0 from the closed form (solve with the drag, close enough with a few iterations)
    let vz = (apexZ - h0) / up + .5 * G.T.ballGravity * up;
    const L = G.Ball.make(this.now, [p.x + dir * 4, p.y + 2, h0], [(hx - p.x - dir * 4) / up / 2, 0, vz], { kind: 'toss', by: p.side });
    sv.apexT = G.Ball.apexT(L); this.L = L; this.held = null; this.setPhase('toss'); this.act(p, 'toss');
    G.sfx('serveToss');
    if (kind === 'jump') { VBm.jumpAt(this, p, sv.apexT, .32); p.approach = { vx: dir * 70, until: sv.apexT - .1 }; }
    if (sv.glare) { this.dazzleTell = this.now; G.sfx('glare'); G.fx.glare(p.x, p.y, 40); this.talk.say(G.pickLine('sonny', 'glare'), 'sonny', 2); }
  }
  serveHit(q) {
    const p = this.server, sv = this.serve; if (sv.done) return; sv.done = true;
    const at = G.Ball.at(this.L, this.now), jump = sv.kind === 'jump', Q = VBm.QUAL[q] || VBm.QUAL.OK;
    let tgt = p.ctl.kind === 'human' && !p.cpuCtl && !this.cpuControl ? VBm.aimTarget(p.side, p.aimNow || [0, 0], p.mouseNow) : VBm.AI.serveTarget(this, p);
    const rad = Q.rad * (jump ? 1.5 : 1) * .6, a = G.rand('match', 0, TAU), rr = G.rand('match', 0, rad);
    tgt = [tgt[0] + Math.cos(a) * rr, tgt[1] + Math.sin(a) * rr];
    const T = (jump ? G.T.jumpServeT : G.T.serveT) / Math.max(.8, Q.spd);
    const v = G.Ball.aim(at, [tgt[0], tgt[1], 0], T, { ay: this.wind });
    const wob = jump ? null : { a: 3 + G.rand('match', 0, 2), w: 8 + G.rand('match', 0, 4), ph: G.rand('match', 0, TAU) };
    this.act(p, 'serveHit', { contactT: this.now });
    if (sv.glare) { const rc = this.humans().find(h => h.side !== p.side); this.dazzled = rc && !rc.shades ? rc : null; }
    p.stats.serves++; this.lastTouch = p; this.touches = 0; this.side = p.side; this.serveT = this.now; this.lastAttack = null;
    G.sfx('serveHit'); if (p.ctl.kind === 'human') p.ctl.input.rumble(.35, .1);
    this.launch(at, v, jump ? 'jumpserve' : 'serve', p.side, { wob, serve: true });
    this.setPhase('rally');
    if (q !== 'OK' && p.ctl.kind === 'human') this.popup(p, q === 'PERFECT' ? 'PERFECT!' : q, VBm.QCOL[q]);
    G.bus.emit('touch', { kind: 'serve', p, q });
  }

  /* ---------------- launches and planning ---------------- */
  launch(at, v, kind, bySide, o = {}) {
    const L = G.Ball.make(this.now, at, v, { kind, by: bySide, ay: this.wind, wob: o.wob });
    L.serve = !!o.serve; L.tapeOver = o.tapeOver;
    this.L = L; this.trail = [];
    if (this.net && this.role === 'host') this.net.onLaunch(this, L);
    this.planNext();
    return L;
  }
  /** which side plays the ball next and which touch it is, then who plays it, when and where */
  planNext() {
    const L = this.L; this.plan = null; if (!L || L.kill) return;
    const cls = G.Ball.netClass(L);
    let side = this.side, touch = this.touches;
    if (cls === 'clear' || (cls === 'tape' && L.tapeOver)) { side = 1 - L.by; touch = 0; }
    else if (cls === 'antenna') return;
    else if (cls === 'net' || cls === 'tape') { side = L.by; touch = this.touches; }
    else if (L.landSide !== this.side && L.tNet === null && L.by !== null) side = L.landSide;
    // a ball that comes down on the other side of the net can't be played by this side
    if (touch >= 3) { this.plan = null; return; }
    this.plan = this.planContacts(side, touch, cls === 'net' || cls === 'tape' ? (L.tNet || L.t0) + .05 : null);
    if (this.plan && this.net && this.role === 'host') this.net.onPlan(this, this.plan);
  }
  planContacts(side, touch, after) {
    const L = this.L, cands = [];
    for (const p of this.players) {
      if (p.side !== side) continue;
      if (p === this.lastTouch && !this.lastWasBlock && touch > 0) continue;   // never twice in a row
      if (L.houseEdge && touch === 0 && p.partnerOfHuman && (p.affinity || 0) < 60) continue;   // the House Edge: only a Good Friend covers the line
      let kind = touch === 0 ? 'receive' : touch === 1 ? 'set' : 'attack', h = kind === 'receive' ? 18 : kind === 'set' ? 40 : VBm.attackH(p);
      let t = G.Ball.timeAtHeight(L, h, Math.max(this.now + .05, after || 0));
      if (t === null && kind === 'attack') { kind = 'free'; h = 34; t = G.Ball.timeAtHeight(L, h, Math.max(this.now + .05, after || 0)); }
      if (t === null && kind === 'set') { h = 20; t = G.Ball.timeAtHeight(L, h, Math.max(this.now + .05, after || 0)); }
      if (t === null) { t = L.tLand - .05; h = Math.max(4, G.Ball.at(L, t)[2]); kind = touch === 0 ? 'dig' : kind; }
      const P = G.Ball.at(L, t);
      if (G.Ball.sideOf(P[0]) !== side) continue;
      if (kind === 'attack' && Math.abs(P[0] - MC.NET_X) > 70) kind = 'free';
      const d = Math.hypot(P[0] - p.x, P[1] - p.y), arrive = this.now + d / VBm.speed(p) + (p.ctl.kind === 'ai' ? VBm.AI.reaction(this, p) : .15);
      cands.push({ p, kind, h, tStar: t, P: [P[0], P[1]], z: P[2], arrive, slack: t - arrive, d });
    }
    if (!cands.length) return null;
    // a human's call wins if she (or the partner she named) can get there; else the faster arrival, ties to whoever didn't touch last
    let pick = null;
    const hum = cands.find(c => c.p.ctl.kind === 'human' && c.p.call !== 'auto');
    if (hum) { const want = hum.p.call === 'mine' ? hum : cands.find(c => c.p !== hum.p); if (want && want.arrive <= want.tStar + .1) pick = want; }
    if (!pick) pick = cands.slice().sort((a, b) => (a.arrive - b.arrive) || (a.p === this.lastTouch ? 1 : -1))[0];
    // the House Edge line shot: the partner covers only at Good Friend or better
    const plan = Object.assign({ side, touch, done: false, missed: false, cover: null, t0: this.now }, pick);
    plan.others = cands.filter(c => c !== pick);
    for (const c of cands) c.p.react = c.p.ctl.kind === 'ai' ? VBm.AI.reaction(this, c.p) : 0;
    if (plan.p.ctl.kind === 'human') { plan.p.judged = null; plan.p.pending = null; if (this.tips) this.showTip(plan.kind === 'receive' || plan.kind === 'dig' ? 'receive' : plan.kind); }
    return plan;
  }

  /* ---------------- a touch ---------------- */
  /** p plays the ball now with quality q. o: { shot, aim, mouse, dive } */
  contact(p, q, o = {}) {
    const plan = this.plan, L = this.L; if (!L) return;
    const at = G.Ball.at(L, this.now), kind = plan && plan.p === p ? plan.kind : (this.touches === 0 ? 'receive' : this.touches === 1 ? 'set' : 'attack');
    // rules: a fourth touch, the same player twice
    if (this.side === p.side && this.touches >= 3) return this.fault(p.side, 'four');
    if (this.lastTouch === p && !this.lastWasBlock && this.side === p.side && this.touches > 0) return this.fault(p.side, 'double');
    if (this.side !== p.side) { this.side = p.side; this.touches = 0; }
    // reach: horizontal distance to the ball now (a dive reaches farther)
    const d = Math.hypot(at[0] - p.x, at[1] - p.y), reach = VBm.reachR(p) + (p.dive && this.now - p.dive.t0 < .52 ? G.T.diveReach : 0);
    if (q !== 'MISS') { if (d > reach + 8) q = 'MISS'; else if (d > reach) q = VBm.lower(q); }
    if (kind === 'attack' && p.z < 4 && !o.free) { q = VBm.lower(q); o.free = true; }   // not in the air: a soft free ball
    if (q === 'MISS') {
      this.act(p, 'whiff'); p.lockT = .45;
      if (p.ctl.kind === 'human') this.popup(p, 'MISS', VBm.QCOL.MISS);
      if (plan) { plan.missed = true; plan.done = true; }
      // a shank: an AI miss may still touch it badly
      if (p.ctl.kind !== 'human' && G.chance('match', .5)) this.shank(p, at);
      else this.coverAfterMiss(p);
      return;
    }
    const Q = VBm.QUAL[q], dir = p.side === 0 ? 1 : -1, mate = this.mate(p);
    this.touches++; this.rallyTouches++; this.lastTouch = p; this.lastWasBlock = false; p.stats.touches++;
    if (q === 'PERFECT') { p.stats.perfects++; G.fx.sparkle(at[0], at[1], at[2]); }
    if (plan) plan.done = true;
    const scatter = (tg, rad) => { const a = G.rand('match', 0, TAU), r = G.rand('match', 0, rad) * (this.wet ? 1.2 : 1); return [tg[0] + Math.cos(a) * r, tg[1] + Math.sin(a) * r]; };
    let v, lk;
    if (kind === 'receive' || kind === 'dig' || (kind === 'set' && o.shot && false)) {
      if (o.shot) {   // a free ball over to the deepest open zone
        const tg = scatter(VBm.AI.attackTarget(this, p), Q.rad); v = G.Ball.aim(at, [tg[0], tg[1], 0], 1.2, { ay: this.wind }); lk = 'free';
      } else {
        const tx = MC.NET_X - dir * 40, ty = clamp(mate ? mate.y : MC.CY, MC.Y0 + 16, MC.Y1 - 16) + (o.aim ? o.aim[1] * 24 : 0);
        const tg = scatter([tx, ty], Q.rad * (o.dive ? 1.6 : 1)), T = G.T.passT * (kind === 'dig' || o.dive ? 1.12 : 1);
        v = G.Ball.aim(at, [tg[0], tg[1], 40], T, { ay: this.wind }); lk = 'pass';
        if (q === 'PERFECT') p.stats.perfectPasses++; p.stats.digs += this.L.kind === 'spike' || kind === 'dig' ? 1 : 0;
      }
      this.act(p, kind === 'dig' || o.dive ? 'dig' : 'bump', { q }); G.sfx('bump');
    } else if (kind === 'set') {
      const hitter = mate;
      if (o.shot) {   // the setter's dump: a tip to the nearest open short zone
        const tg = scatter(VBm.zone(p.side, 0, p.y < MC.CY ? -1 : 1), Q.rad); v = G.Ball.aim(at, [tg[0], tg[1], 0], .6, { ay: this.wind }); lk = 'dump';
        this.act(p, 'set', { q }); G.sfx('set');
      } else {
        const quick = o.aim && o.aim[0] * dir > .4, back = o.aim && o.aim[0] * dir < -.4;
        const hx = MC.NET_X - dir * (back ? 40 : 22), hy = clamp(hitter ? hitter.y : MC.CY, MC.Y0 + 16, MC.Y1 - 16);
        const tg = scatter([hx, hy], Q.rad * .8), H = hitter ? VBm.attackH(hitter) : 60, T = quick ? .75 : G.T.setT * (back ? 1.1 : 1);
        v = G.Ball.aim(at, [tg[0], tg[1], H], T, { ay: this.wind }); lk = 'set'; p.stats.sets++;
        this.act(p, 'set', { q }); G.sfx('set');
      }
    } else {   // attack or free
      const human = p.ctl.kind === 'human' && !this.cpuControl;
      let tg = human && !(this.perfectPlayer && !o.mouse && Math.hypot(...(o.aim || [0, 0])) < .3) ? VBm.aimTarget(p.side, o.aim || [0, 0], o.mouse) : VBm.AI.attackTarget(this, p);   // (the dev Perfect Player aims at open court)
      const edge = this.specials.houseEdge && p.cast === 'pepper' && !this.edgeUsed[this.rules.setNo];
      if (edge) { this.edgeUsed[this.rules.setNo] = true; tg = [p.side ? MC.X0 + 10 : MC.X1 - 10, G.chance('match', .5) ? MC.Y0 + 5 : MC.Y1 - 5]; q = 'PERFECT'; this.talk.say(G.pickLine('pepper', 'houseEdge'), 'pepper', 2); this.houseEdgeOn = true; }
      let shot = o.free ? 'free' : o.shot ? 'shot' : 'spike';
      if (shot === 'spike' && !human && !this.luckyArmed) {   // a CPU doesn't spike into the net: if it can't clear from here, it cuts a shot
        const sp0 = G.T.spikeSpeed * (.85 + .035 * VBm.stat(p, 'POW')) * Q.spd, T0 = Math.hypot(tg[0] - at[0], tg[1] - at[1]) / (sp0 * Math.cos(15 * Math.PI / 180)), L0 = G.Ball.make(this.now, at, G.Ball.aim(at, [tg[0], tg[1], 0], T0 * 1.25), { by: p.side });
        if (L0.tNet !== null && L0.netAt[2] - MC.BALL_R - MC.NET_H < 1) { const deep = VBm.zone(p.side, 2, Math.sign(tg[1] - MC.CY)), L1 = G.Ball.make(this.now, at, G.Ball.aim(at, [deep[0], deep[1], 0], Math.hypot(deep[0] - at[0], deep[1] - at[1]) / (sp0 * .966)), { by: p.side }); if (L1.tNet !== null && L1.netAt[2] - MC.BALL_R - MC.NET_H >= 1) tg = deep; else shot = 'shot'; }
      }
      if (shot === 'spike') {
        tg = edge ? tg : scatter(tg, Q.rad * .7);
        const sp = G.T.spikeSpeed * (.85 + .035 * VBm.stat(p, 'POW')) * Q.spd, hd = Math.hypot(tg[0] - at[0], tg[1] - at[1]);
        let T = hd / (sp * Math.cos(15 * Math.PI / 180));
        v = G.Ball.aim(at, [tg[0], tg[1], 0], T, { ay: this.wind });
        // the spike assist: raise the arc just enough to clear (always on Easy, small misses on Normal)
        const clearOf = vv => { const L2 = G.Ball.make(this.now, at, vv, { by: p.side }); return L2.tNet === null ? 99 : L2.netAt[2] - MC.BALL_R - MC.NET_H; };
        let c = clearOf(v); const assist = human ? (this.difficulty === 'Easy' ? 99 : this.difficulty === 'Normal' ? 4 : 0) : 6;
        if (c < 1 && -c + 1 <= assist) for (let i = 0; i < 30 && c < 1; i++) { T *= 1.04; v = G.Ball.aim(at, [tg[0], tg[1], 0], T, { ay: this.wind }); c = clearOf(v); }
        if (this.specials.luckySeven && this.luckyArmed && p.cast === 'sonny') {   // Lucky Seven: off the tape and over
          this.luckyArmed = false; this.luckyDone = true; this.luckyNow = true;
          v = G.Ball.aim(at, [MC.NET_X + (p.side ? -1 : 1) * 2, at[1], MC.NET_H + 1], .2);
        }
        lk = 'spike'; this.act(p, 'spike', { contactT: this.now }); this.lastAttack = { p, side: p.side, t: this.now }; G.sfx('spike', { vol: clamp(sp / 330, .7, 1.3) });
        if (human) p.ctl.input.rumble(.35, .1);
        if (Math.hypot(v[0], v[1]) > 400) { this.bigSpike = true; this.bigSpikeReplay = true; }
      } else if (shot === 'shot') {
        tg = scatter(o.aim && Math.abs(o.aim[0]) + Math.abs(o.aim[1]) > .3 && human ? tg : VBm.AI.shotTarget(this, p), Q.rad * .8);
        v = G.Ball.aim(at, [tg[0], tg[1], 0], G.T.shotT, { ay: this.wind }); lk = 'shot'; this.lastAttack = { p, side: p.side, t: this.now }; this.act(p, 'shot', { contactT: this.now }); G.sfx('set');
      } else {
        tg = scatter(VBm.zone(p.side, 2, 0), Q.rad); v = G.Ball.aim(at, [tg[0], tg[1], 0], 1.2, { ay: this.wind }); lk = 'free'; this.act(p, 'bump', { q }); G.sfx('bump');
      }
    }
    if (p.ctl.kind === 'human' && q !== 'OK') this.popup(p, q === 'PERFECT' ? 'PERFECT!' : q === 'STRETCH' ? 'STRETCH' : q, VBm.QCOL[q]);
    else if (p.ctl.kind === 'human') this.popup(p, 'OK', VBm.QCOL.OK);
    G.bus.emit('touch', { kind: lk, p, q });
    if (this.spectacle && lk === 'spike' && this.rallyTouches >= this.specLen) {   // spectacle: the kill goes into the biggest gap, unanswered
      const L2 = G.Ball.make(this.now, at, v, { by: p.side }); if (G.Ball.netClass(L2) !== 'clear' || !L2.landIn) { const tg = VBm.AI.attackTarget(this, p); v = G.Ball.aim(at, [tg[0], tg[1], 0], .55); }
      this.launch(at, v, lk, p.side); this.L.kill = true; this.plan = null; return;
    }
    this.launch(at, v, lk, p.side); this.L.q = q;
    if (this.houseEdgeOn && p.cast === 'pepper') { this.L.houseEdge = true; this.houseEdgeOn = false; this.planNext(); const mate = this.plan && this.plan.p; if (mate && mate.partnerOfHuman) { mate.bubble = { text: "I've got line!", t: 0 }; G.voice.say("I've got line!", mate.cast, 'excited'); } }
  }
  /** an AI's bad touch: the ball skews away (it may still be played) */
  shank(p, at) {
    this.touches++; this.rallyTouches++; this.lastTouch = p; this.lastWasBlock = false; if (this.plan) this.plan.done = true;
    const a = G.rand('match', 0, TAU), d = G.rand('match', 30, 90), tx = at[0] + Math.cos(a) * d, ty = at[1] + Math.sin(a) * d;
    this.act(p, 'bump', { q: 'MISS' }); G.sfx('bump', { pitch: .8 }); G.game.particles.dust(at[0], at[1], at[2], 3);
    this.launch(at, G.Ball.aim(at, [tx, ty, 0], .9), 'shank', p.side);
  }
  /** after a human's miss (or no press), the partner may still save it */
  coverAfterMiss(p) {
    const mate = this.mate(p), L = this.L; if (!mate || mate.ctl.kind !== 'ai' || this.touches >= 3 || !L) return;
    const t = G.Ball.timeAtHeight(L, 8, this.now + .05); if (t === null) return;
    const P = G.Ball.at(L, t), need = Math.hypot(P[0] - mate.x, P[1] - mate.y) / VBm.speed(mate);
    if (need < t - this.now + .05 && G.Ball.sideOf(P[0]) === mate.side) this.plan = { side: mate.side, touch: this.touches, kind: 'dig', h: 8, tStar: t, P: [P[0], P[1]], z: P[2], p: mate, done: false, cover: true, others: [] };
  }
  fault(sideAt, why) {
    this.bannerSay(why); G.sfx('whistle');
    const lastSide = this.lastTouch ? this.lastTouch.side : sideAt;
    if (this.lastTouch && (why === 'out' || why === 'net' || why === 'antenna') && this.L && (this.L.kind === 'spike' || this.L.kind === 'shot')) this.lastTouch.stats.attackErrors++;
    this.pointTo(1 - lastSide, why);
  }

  /* ---------------- the step ---------------- */
  update(dt) {
    if (this.role === 'client' && this.clientUpdate) return this.clientUpdate(dt);
    dt *= this.slowmo;
    if (this.replay) return this.updateReplay(dt);
    if (this.hubClock) this.now = this.hubClock(); else this.now += dt;
    this.phaseT += dt;
    this.talk.update(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.6) this.banner = null; }
    for (const pp of this.popups) pp.t += dt; this.popups = this.popups.filter(pp => pp.t < .9);
    if (this.tip) { this.tip.t += dt; if (this.tip.t > 5.5) this.tip = null; }
    for (const f of this.crowd) f.cheer = Math.max(0, f.cheer - dt);
    this.netShake = Math.max(0, this.netShake - dt * 4);
    const ph = this.phase;
    if (ph === 'intro') { if (this.phaseT > (this.cfg.introTime || 3) || this.skipPressed()) { this.setPhase('coin'); this.bannerSay((this.rules.serveSide === this.humanSide ? 'YOUR' : (this.teamNames[this.rules.serveSide] + "'S").toUpperCase()) + ' SERVE'); } }
    else if (ph === 'coin') { if (this.phaseT > 1) this.placeForServe(); }
    else if (ph === 'serveSetup') this.stepServeSetup(dt);
    else if (ph === 'toss') this.stepToss(dt);
    else if (ph === 'rally') this.stepRally(dt);
    else if (ph === 'dead') { if (this.phaseT > 1.0) { this.setPhase('point'); this.celebrate(); } }
    else if (ph === 'point') { if (this.phaseT > 1.6 || (this.phaseT > .6 && this.skipPressed())) this.afterPoint(); }
    else if (ph === 'end') { if (this.phaseT > 2.6 || (this.phaseT > 1 && this.skipPressed())) this.openResults(); }
    else if (ph === 'results') { if (this.resultsUI) this.resultsUI.update(dt); }
    this.stepPlayers(dt);
    this.updateBall();
    this.record();
    if (this.net && this.role === 'host') this.net.hostStep(this, dt);
  }
  skipPressed() { return G.game.players.some(I => (I.map.skip && I.pressed('skip')) || I.pressed('confirm')) || (this.spectacle && false); }
  stepServeSetup(dt) {
    const p = this.server, sv = this.serve;
    if (!p) return;
    if (p.ctl.kind === 'human' && !this.cpuControl) {
      const inp = VBm.humanInput(this, p, dt);
      p.vx = 0; p.vy = approach(p.vy, inp.mv[1] * 60, 600 * dt); p.y = clamp(p.y + p.vy * dt, MC.Y0 + 4, MC.Y1 - 4);
      p.aimNow = inp.aim; p.mouseNow = inp.mouse;
      if (this.phaseT > .4 && (inp.play || inp.bot && this.phaseT > .8)) this.toss('float');
      else if (this.phaseT > .4 && inp.shot) this.toss('jump');
      else if (this.phaseT > sv.wait) this.toss('float');   // an automatic float serve after 10 s
    } else if (p.ctl.kind === 'net') { if (p.netToss) { this.toss(p.netToss); p.netToss = null; } else if (this.phaseT > 12) this.toss('float'); }
    else if (this.phaseT > (p.ctl.kind === 'human' ? Math.min(sv.wait, 1.8) : sv.wait)) this.toss(VBm.AI.serveKind(this, p));   // (a CPU-played human serves at a CPU's pace)
  }
  stepToss(dt) {
    const p = this.server, sv = this.serve, err = this.now - sv.apexT;
    if (p.approach && this.now < p.approach.until) { p.x += p.approach.vx * dt; }
    if (p.ctl.kind === 'human' && !this.cpuControl) {
      const inp = VBm.humanInput(this, p, dt); p.aimNow = inp.aim; p.mouseNow = inp.mouse;
      if (this.perfectPlayer && err >= 0) return this.serveHit('PERFECT');
      if (!sv.judged && (inp.play || inp.shot) && this.now > sv.tossT + .15) { sv.judged = VBm.judge(err); sv.err = err; if (sv.judged === 'MISS') { this.serveFault(); return; } if (err >= 0) return this.serveHit(sv.judged); }
      if (sv.judged && err >= 0) return this.serveHit(sv.judged);
    } else if (p.ctl.kind === 'net') { if (p.netServe && this.now >= p.netServe.at) { const q = p.netServe.q; p.netServe = null; return this.serveHit(q); } }
    else if (err >= (p.serveErr === undefined ? (p.serveErr = (1 - VBm.AI.skill(this, p, 'POW')) * G.rand('match', -.06, .06)) : p.serveErr)) { const q = p.ctl.kind === 'human' && this.perfectPlayer ? 'PERFECT' : VBm.AI.roll(this, p, 'POW'); p.serveErr = undefined; if (q === 'MISS' && G.chance('match', .35)) return this.serveFault(); return this.serveHit(q === 'MISS' ? 'OK' : q); }
    if (this.now - sv.tossT > 1.2) this.serveFault();
  }
  serveFault() {
    const p = this.server; this.serve.done = true; p.stats.serveFaults++;
    this.bannerSay('servefault'); G.sfx('whistle'); this.talk.say(G.pickLine('sonny', 'serveFault'), 'sonny');
    this.lastTouch = p; this.pointTo(1 - p.side, 'servefault');
  }
  stepRally(dt) {
    const L = this.L; if (!L) return;
    // the net plane
    if (L.tNet !== null && !L.netDone && this.now >= L.tNet) { L.netDone = true; if (this.netEvent(L)) return; }
    // contacts: AI players at t*; a human's pending press; humans who let it pass
    const plan = this.plan;
    if (plan && !plan.done) {
      const p = plan.p;
      if (p.ctl.kind === 'ai' || (p.ctl.kind === 'human' && (this.cpuControl || p.cpuCtl))) {
        if (plan.kind === 'attack' && !p.jump && this.now >= plan.tStar - .38 && Math.hypot(plan.P[0] - p.x, plan.P[1] - p.y) < 34) VBm.jumpAt(this, p, plan.tStar, .38);
        if (this.now >= plan.tStar + (plan.aiErr === undefined ? (plan.aiErr = this.spectacle ? 0 : (1 - VBm.AI.skill(this, p, 'TEC')) * G.rand('match', -.03, .05)) : plan.aiErr)) {
          let q = p.ctl.kind === 'human' && this.perfectPlayer ? 'PERFECT' : VBm.AI.roll(this, p, plan.kind === 'attack' ? 'POW' : 'TEC', plan.touch === 0 ? this.L : null, plan.touch === 0 ? plan.tStar - plan.arrive : undefined);
          const o = { shot: plan.kind === 'attack' ? VBm.AI.wantsShot(this, p) : plan.kind === 'set' && G.chance('match', .08) && this.frontEmpty(1 - p.side), free: plan.kind === 'free' };
          if (this.spectacle && plan.kind === 'attack' && this.rallyTouches < this.specLen) o.shot = false;
          if (this.cfg.tutorial && p.cast === 'pepper' && plan.kind === 'attack') o.shot = true;   // Pepper never hits hard in the Welcome Match
          this.contact(p, q, o);
        }
      } else if (p.ctl.kind === 'human') this.humanContact(p, plan, dt);
      else if (p.ctl.kind === 'net' && this.net) this.net.remoteContact(this, p, plan);
    }
    // the human's block and the AI's
    this.stepBlocks();
    // the sand
    const waitNet = this.plan && !this.plan.done && this.plan.p.ctl.kind === 'net' ? .25 : 0;   // the host waits for a late claim
    if (this.L === L && this.now >= L.tLand + waitNet) this.landEvent(L);
  }
  frontEmpty(s) { return this.players.filter(q => q.side === s).every(q => Math.abs(q.x - MC.NET_X) > 50); }
  humanContact(p, plan, dt) {
    const I = p.ctl.input, w = VBm.windows();
    if (this.perfectPlayer) {
      if (plan.kind === 'attack' && !p.jump && this.now >= plan.tStar - .38) VBm.jumpAt(this, p, plan.tStar, .38);
      if (this.now >= plan.tStar) this.contact(p, 'PERFECT', { aim: p.aimNow || [0, 0], shot: false, free: plan.kind === 'free' });
      return;
    }
    if (plan.kind === 'attack' && !p.jump && this.now >= plan.tStar - .38 && this.now < plan.tStar && Math.hypot(plan.P[0] - p.x, plan.P[1] - p.y) < 30) { VBm.jumpAt(this, p, plan.tStar, .38); this.act(p, 'spike', { contactT: plan.tStar }); }
    if (p.pending && this.now >= p.pending.at) { const pd = p.pending; p.pending = null; return this.contact(p, pd.q, pd.o); }
    if (p.lockT > 0) return;
    if (p.judged === null && p.pressNow) {
      const err = this.now - plan.tStar;
      if (err >= -.6) {
        let q = VBm.judge(err); p.judged = q;
        const o = { shot: p.pressNow === 'shot', aim: p.aimNow, mouse: p.mouseNow, dive: !!p.dive, free: plan.kind === 'free' };
        if (q === 'MISS') return this.contact(p, 'MISS', o);
        if (err < 0) p.pending = { q, at: plan.tStar, o }; else return this.contact(p, q, o);
      }
    }
    // no press: the ball goes by (auto-receive plays an OK receive)
    if (!p.pending && this.now > plan.tStar + w.o + .02) {
      if ((plan.kind === 'receive' || plan.kind === 'dig') && (G.setting('autoReceive', false) || this.autoReceives > 0)) { if (this.autoReceives > 0) this.autoReceives--; return this.contact(p, 'OK', { aim: [0, 0] }); }
      plan.done = true; plan.missed = true; this.coverAfterMiss(p);
    }
  }
  stepBlocks() {
    const plan = this.plan; if (!plan || plan.kind !== 'attack' || plan.done) return;
    const defSide = 1 - plan.side, near = Math.abs(plan.P[0] - MC.NET_X) < 34;
    for (const b of this.players) {
      if (b.side !== defSide || b.block || b.jump || b.ctl.kind !== 'ai' || !near) continue;
      if (this.blockerFor(defSide) !== b || Math.abs(b.x - MC.NET_X) > 16) continue;
      if (plan.blockRoll === undefined) plan.blockRoll = this.spectacle ? false : G.rng('match')() < .15 + .35 * VBm.AI.skill(this, b, 'JMP');
      if (!plan.blockRoll) continue;
      const tNet = plan.tStar + Math.abs(plan.P[0] - MC.NET_X) / (G.T.spikeSpeed * .95), err = (1 - VBm.AI.skill(this, b, 'JMP')) * G.rand('match', -.12, .12);
      if (this.now >= tNet - G.T.blockRise + err - .04) this.startBlock(b);
    }
  }
  startBlock(b) { if (b.block || b.jump) return; b.block = { t0: this.now }; this.act(b, 'block'); G.sfx('whoosh'); if (b.ctl.kind === 'human') { b.ctl.input.rumble(.3, .08); if (Math.abs(b.x - MC.NET_X) < 6 && this.plan && this.plan.tStar - this.now > .35 && G.chance('match', .15)) { this.bannerSay('nettouch'); G.sfx('net'); this.netShake = 1; this.pointTo(1 - b.side, 'nettouch'); } } }
  /** the ball meets the net plane: clear (or a block), the tape, the net, outside the antennae */
  netEvent(L) {
    const cls = G.Ball.netClass(L), q = L.netAt;
    if (cls === 'antenna') { this.fault(L.by, 'antenna'); return true; }
    if (cls === 'net') { G.sfx('net'); this.netShake = 1; const v = G.Ball.vel(L, this.now); this.launch(q, [-v[0] * .25, v[1] * .5, Math.abs(v[2]) * .3], 'netball', L.by); this.side = L.by; return true; }
    if (cls === 'tape') {
      G.sfx('tape'); this.netShake = .7; const v = G.Ball.vel(L, this.now);
      const over = this.luckyNow || G.chance('match', G.T.netCordOver); this.luckyNow = false;
      if (over) { const nq = [q[0] + (L.by === 0 ? 3 : -3), q[1], MC.NET_H + MC.BALL_R + 1]; this.launch(nq, [v[0] * .35 || (L.by === 0 ? 20 : -20), v[1] * .4, 60 + G.rand('match', -20, 20)], 'cord', L.by, { tapeOver: true }); this.side = 1 - L.by; this.touches = 0; this.talk.say(G.pickLine('sonny', 'netCord'), 'sonny'); }
      else { this.launch(q, [-v[0] * .3, v[1] * .4, 30], 'cord', L.by); this.side = L.by; }
      return true;
    }
    // clear: a blocker in the air may stop it
    const def = 1 - L.by;
    for (const b of this.players) {
      if (b.side !== def || !b.block) continue;
      const top = VBm.blockTopAt(b, this.now), wide = 9 + .6 * VBm.stat(b, 'JMP');
      if (Math.abs(q[1] - b.y) <= wide && q[2] >= MC.NET_H - 2 && q[2] <= top && Math.abs(b.x - MC.NET_X) < 14) {
        const err = (b.block.t0 + G.T.blockRise) - this.now, jq = b.ctl.kind === 'human' ? VBm.judge(err) : VBm.AI.roll(this, b, 'JMP');
        const cut = L.kind === 'shot' && !(VBm.stat(b, 'JMP') >= 9 && jq === 'PERFECT'), rank = VBm.QUAL[jq].rank, beat = L.q === 'PERFECT' ? rank < 3 : L.q === 'GREAT' ? rank < 2 : false;   // a strong spike powers through a weak block
        if (cut || jq === 'MISS' || beat) continue;
        const v = G.Ball.vel(L, this.now);
        b.stats.touches++; this.lastWasBlock = true; this.lastTouch = b; G.sfx('block'); if (b.ctl.kind === 'human') b.ctl.input.rumble(.5, .12);
        if (jq === 'PERFECT' || jq === 'GREAT') {   // a stuff: back down on the attacker's side
          this.side = L.by; this.touches = 3; this.stuffBy = b;
          this.launch([q[0] + (def === 0 ? -2 : 2), q[1], q[2]], [-.35 * v[0], .3 * v[1] + G.rand('match', -20, 20), -60], 'stuff', def);
          this.popup(b, 'STUFF!', '#ffd36a');
        } else {   // a soft block: up on her own side, as a touch
          this.side = def; this.touches = 1;
          this.launch([q[0] + (def === 0 ? -3 : 3), q[1], q[2]], [(def === 0 ? -1 : 1) * 40, v[1] * .2, 70], 'softblock', def);
          this.popup(b, 'BLOCK', '#5ff0ff');
        }
        return true;
      }
    }
    this.side = def; this.touches = 0;
    return false;
  }
  /** the ball lands: in or out decides it */
  landEvent(L) {
    const land = L.land, side = L.landSide, inn = L.landIn;
    G.sfx('sand'); this.dust(land[0], land[1], 8); this.decals.push({ x: land[0], y: land[1], t: 0 });
    if (L.kind === 'toss') return this.serveFault();
    const last = this.lastTouch;
    let win;
    if (inn) { win = 1 - side; this.bannerSay('in'); }
    else { win = last ? 1 - last.side : 1 - side; this.bannerSay('out'); }
    // name the point: ace, kill, block
    if (inn && last && last.side === win) {
      if (L.serve) { last.stats.aces++; last.stats.points++; this.bannerSay('ace'); this.pointKind = 'ace'; }
      else if (L.kind === 'stuff') { last.stats.blocks++; last.stats.points++; this.bannerSay('block'); this.pointKind = 'block'; }
      else if (L.kind === 'spike' || L.kind === 'shot' || L.kind === 'dump' || L.kind === 'cord') { last.stats.kills++; last.stats.points++; this.bannerSay('kill'); this.pointKind = 'kill'; }
    } else if (inn && last && last.side !== win && this.lastAttack && this.lastAttack.side === win && this.lastAttack.t > this.serveT) { const k = this.lastAttack.p; k.stats.kills++; k.stats.points++; this.bannerSay('kill'); this.pointKind = 'kill'; this.lastTouch = k; }   // a dig that failed: the spike earned it
    else if (!inn && last && (L.kind === 'spike' || L.kind === 'shot')) last.stats.attackErrors++;
    this.L = Object.assign({}, L, { frozen: true }); this.restAt = land;
    this.pointTo(win, inn ? 'in' : 'out');
  }
  pointTo(side, why) {
    if (this.phase === 'dead' || this.phase === 'point' || this.phase === 'end') return;
    const prevGP = this.rules.gamePoint();
    const res = this.rules.point(side, why, this.rallyTouches);
    this.lastPoint = { side, why, kind: this.pointKind || why, scorer: this.lastTouch && this.lastTouch.side === side ? this.lastTouch : null, rally: this.rallyTouches, res };
    this.pointKind = null; this.plan = null; this.held = null;
    if (!this.L || !this.L.frozen) this.restAt = [this.ball.x, this.ball.y, 0];
    if (this.L) this.L.frozen = true;
    G.sfx('whistle');
    for (const f of this.crowd) if (f.side === side || G.chance('cosmetic', .4)) f.cheer = 1.4;
    G.sfx(side === this.humanSide || this.humanSide === null ? 'crowdCheer' : 'crowdGroan');
    if (side !== this.humanSide && this.humanSide !== null) this.groan = 1;
    this.comment(this.lastPoint);
    if (this.net && this.role === 'host') this.net.onPoint(this, this.lastPoint);
    G.bus.emit('point', { match: this, side, why, score: this.rules.score.slice() });
    // the final's Lucky Seven arms the first time The House reaches game point
    if (this.specials.luckySeven && !this.luckyDone && this.rules.gamePoint() === this.houseSide()) this.luckyArmed = true;
    if (res.matchOver) { this.over = true; }
    this.setPhase('dead');
    void prevGP;
  }
  houseSide() { const s = this.players.find(p => p.cast === 'sonny'); return s ? s.side : -1; }
  comment(pt) {
    if (!this.talk.on) return;
    const k = pt.kind === 'ace' ? 'ace' : pt.kind === 'kill' ? (this.bigSpike ? 'bigSpike' : 'kill') : pt.kind === 'block' ? 'block' : pt.why === 'out' ? 'out' : pt.why === 'servefault' ? null : pt.why === 'in' ? 'in' : 'fault';
    this.bigSpike = false;
    if (pt.rally >= 8) this.talk.say(G.pickLine('sonny', 'longRally'), 'sonny');
    else if (k) this.talk.say(G.pickLine('sonny', k, { name: pt.scorer ? pt.scorer.name.toUpperCase() : '' }), 'sonny');
    if (this.houseEdgeOn && this.specials.houseEdge) { this.houseEdgeOn = false; }
  }
  celebrate() {
    const pt = this.lastPoint; if (!pt) return;
    const win = this.players.filter(p => p.side === pt.side), lose = this.players.filter(p => p.side !== pt.side);
    const big = pt.scorer && (pt.kind === 'ace' || pt.kind === 'kill' || pt.kind === 'block');
    win.forEach((p, i) => { if (big && p === pt.scorer) this.act(p, 'celebrate'); else this.act(p, i === 0 ? 'highfive' : 'highfive'); p.cheerT = 1.6; });
    if (win.length === 2 && !big) { G.sfx('high_five'); const [a, b] = win; a.facing = Math.atan2(b.y - a.y, b.x - a.x); b.facing = Math.atan2(a.y - b.y, a.x - b.x); }
    lose.forEach((p, i) => { this.act(p, 'sad', { sadKind: (this.rules.rallies + i) % 3 }); });
    if (big && pt.scorer.ctl.kind === 'ai' && G.chance('cosmetic', .5)) G.voice.say(G.pickLine(pt.scorer.cast, 'bark') || 'Yes!', pt.scorer.cast, 'happy');
    // match point sting and tempo
    const mp = this.rules.matchPoint();
    if (mp >= 0 && !this.over && !this.matchPointShown) { this.matchPointShown = true; G.sting('matchpoint'); this.talk.say(G.pickLine('sonny', 'matchPoint'), 'sonny', 1); if (G.game.audio.tempo && G.SONGS[G.musicNow]) G.game.audio.tempo(G.SONGS[G.musicNow].bpm + 6); }
    if (pt.kind === 'ace') G.sting('ace');
    // a highlight replay: an ace, a stuff, a spike over 400, or a long rally (at most once every 3 points)
    const hl = (pt.kind === 'ace' || pt.kind === 'block' || this.bigSpikeReplay || pt.rally >= 8) && this.replayOn && this.rules.rallies - this.lastReplayPt >= 3 && !this.over;
    this.wantReplay = hl; this.bigSpikeReplay = false;
  }
  afterPoint() {
    if (this.wantReplay && this.buf.length > 60) { this.wantReplay = false; this.lastReplayPt = this.rules.rallies; this.startReplay(); return; }
    if (this.over) return this.endMatch();
    if (this.lastPoint && this.lastPoint.res.setOver) { this.rules.nextSet(); this.bannerSay('SET ' + this.rules.setNo); this.matchPointShown = false; }
    this.placeForServe();
  }
  endMatch() {
    this.setPhase('end');
    const w = this.rules.winner, P = this.players;
    for (const p of P) this.act(p, p.side === w ? 'celebrate' : 'kneel');
    const mvp = P.slice().sort((a, b) => (b.stats.points - a.stats.points) || (b.stats.perfects - a.stats.perfects))[0];
    this.result = { winner: w, score: this.rules.score.slice(), setsWon: this.rules.setsWon.slice(), history: this.rules.history, longest: this.rules.longest, rallies: this.rules.rallies, mvp, players: P.map(p => ({ id: p.id, cast: p.cast, side: p.side, name: p.name, stats: p.stats })), humanWon: this.humanSide !== null ? w === this.humanSide : null };
    G.sting(w === this.humanSide || this.humanSide === null ? 'win' : 'lose');
    this.talk.say(G.pickLine('sonny', w === this.humanSide || this.humanSide === null ? 'matchWin' : 'matchLose', { team: this.teamNames[w].toUpperCase() }), 'sonny', 2);
    G.bus.emit('matchEnd', { match: this, result: this.result });
    if (this.net && this.role === 'host') this.net.onEnd(this, this.result);
  }
  openResults() {
    this.setPhase('results');
    if (this.cfg.onResults) this.resultsUI = this.cfg.onResults(this, this.result);
  }
  showTip(k) {
    if (!this.tips || this.tips.has(k)) return; this.tips.add(k);
    const t = G.TUTORIAL_TIPS && G.TUTORIAL_TIPS[k]; if (!t) return;
    this.tip = { key: k, t: 0, text: t };
    if (k === 'block' || k === 'set') { /* the block tip follows the set tip */ }
  }

  /* ---------------- players ---------------- */
  stepPlayers(dt) {
    const plan = this.plan, live = this.phase === 'rally' || this.phase === 'toss';
    for (const p of this.players) {
      p.lockT = Math.max(0, p.lockT - dt); p.pressNow = null;
      const human = p.ctl.kind === 'human' && !this.cpuControl && !p.cpuCtl;
      if (p.ctl.kind === 'net') { this.netPlayerStep && this.netPlayerStep(p, dt); }
      else if (human) this.stepHuman(p, dt, plan, live);
      else this.stepAI(p, dt, plan, live);
      // a dive's lunge, slide and getting up
      if (p.dive) { const u = this.now - p.dive.t0; if (u < .22) { p.vx = p.dive.vx; p.vy = p.dive.vy; } else if (u < .52) { p.vx *= Math.pow(.02, dt); p.vy *= Math.pow(.02, dt); } else { p.vx = p.vy = 0; } if (u > .97) { p.dive = null; this.act(p, 'ready'); } }
      VBm.integrate(this, p, dt);
      // face the ball while it is live
      if (live && !p.dive) { const ta = Math.atan2(this.ball.y - p.y, this.ball.x - p.x); p.facing = E.approachAng(p.facing, ta, dt * 9); }
      else if (Math.hypot(p.vx, p.vy) > 10 && !p.dive) p.facing = E.approachAng(p.facing, Math.atan2(p.vy, p.vx), dt * 10);
      if (p.act !== 'ready' && p.act !== 'dive' && !p.block && !p.jump && this.now - p.actT0 > (p.act === 'celebrate' || p.act === 'sad' || p.act === 'kneel' || p.act === 'highfive' ? 99 : .6) && (this.phase === 'rally' || this.phase === 'serveSetup')) this.act(p, 'ready');
      if (p.bubble) { p.bubble.t += dt; if (p.bubble.t > 1) p.bubble = null; }
      if (Math.hypot(p.vx, p.vy) > 40 && G.chance('cosmetic', dt * 6)) this.dust(p.x, p.y, 1);
      G.Anim.player(this, p, dt);
    }
  }
  stepHuman(p, dt, plan, live) {
    const inp = VBm.humanInput(this, p, dt), I = p.ctl.input, mine = plan && !plan.done && plan.p === p;
    p.aimNow = inp.aim; p.mouseNow = inp.mouse;
    if (inp.view) this.toggleCam();
    if (this.phase === 'serveSetup' && p === this.server) return;   // stepServeSetup moves her
    if (this.phase === 'toss' && p === this.server) { p.vx = p.vy = 0; return; }
    if (p.dive || p.lockT > 0 && !p.jump) { if (!p.dive) { p.vx *= .8; p.vy *= .8; } }
    else {
      let mv = inp.mv;
      if (Math.hypot(mv[0], mv[1]) < .1 && mine && (G.setting('autoMove', true) !== false || this.cfg.tutorial)) {   // auto-run to the ball
        const dx = plan.P[0] - p.x, dy = plan.P[1] - p.y, d = Math.hypot(dx, dy);
        if (d > 3) mv = [dx / d * G.T.autoMove * Math.min(1, d / 14), dy / d * G.T.autoMove * Math.min(1, d / 14)];
      }
      const sp = VBm.speed(p); VBm.steer(p, mv[0] * sp, mv[1] * sp, dt);
    }
    if (!live) return;
    if (inp.call) { p.call = p.call === 'auto' ? 'mine' : p.call === 'mine' ? 'yours' : 'auto'; p.bubble = { text: p.call === 'mine' ? 'MINE!' : p.call === 'yours' ? 'YOURS!' : 'AUTO', t: 0 }; this.act(p, 'call'); if (p.call !== 'auto') G.voice.say(p.call === 'mine' ? 'Mine!' : 'Yours!', p.cast, 'excited'); if (this.plan && !this.plan.done && this.L) this.planNext(); if (this.tips) this.showTip('chem'); }
    if (inp.dive && !p.dive && !p.jump && !p.block) {
      let d = Math.hypot(inp.mv[0], inp.mv[1]) > .2 ? inp.mv : mine ? [plan.P[0] - p.x, plan.P[1] - p.y] : [p.side ? -1 : 1, 0];
      const l = Math.hypot(d[0], d[1]) || 1; p.dive = { t0: this.now, vx: d[0] / l * 190, vy: d[1] / l * 190 }; this.act(p, 'dive'); G.sfx('dive'); I.rumble(.3, .15);
    }
    if (mine) { if (inp.play) p.pressNow = 'play'; else if (inp.shot) p.pressNow = 'shot'; if (this.tips && plan.kind === 'receive' && Math.hypot(plan.P[0] - p.x, plan.P[1] - p.y) > VBm.reachR(p) + 12 && plan.tStar - this.now < .5) this.showTip('dive'); }
    else if (inp.shot && plan && plan.side !== p.side && Math.abs(p.x - MC.NET_X) < 20) this.startBlock(p);
    if (this.tips && plan && plan.side !== p.side && plan.kind === 'attack' && Math.abs(p.x - MC.NET_X) < 40) this.showTip('block');
  }
  stepAI(p, dt, plan, live) {
    if (this.phase === 'serveSetup' && p === this.server) { p.vx = p.vy = 0; return; }
    if (this.phase === 'toss' && p === this.server) { if (!p.approach || this.now >= p.approach.until) { p.vx = p.vy = 0; } return; }
    if (p.dive || p.lockT > 0) return;
    if (this.phase !== 'rally' && this.phase !== 'serveSetup' && this.phase !== 'toss' && this.phase !== 'intro') { if (this.phase === 'point' || this.phase === 'dead' || this.phase === 'end' || this.phase === 'results') this.stepCelebrationMove(p, dt); else { p.vx *= .8; p.vy *= .8; } return; }
    if (p.react > 0) { p.react -= dt; p.vx *= Math.pow(.05, dt); p.vy *= Math.pow(.05, dt); return; }
    let t;
    if (plan && !plan.done && plan.p === p) t = plan.P; else t = VBm.AI.spot(this, p);
    if (this.phase === 'intro') t = [p.x, p.y];
    p.target = t;
    const dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy), sp = VBm.speed(p) * Math.min(1, d / 12);
    if (d > 1.5) VBm.steer(p, dx / d * sp, dy / d * sp, dt); else VBm.steer(p, 0, 0, dt);
    // an AI that can't reach it in time dives
    if (plan && !plan.done && plan.p === p && !p.dive && !p.jump && plan.kind !== 'attack' && plan.tStar - this.now < .3 && plan.tStar - this.now > .1 && d > VBm.reachR(p) + 2 && d < VBm.reachR(p) + G.T.diveReach + 30) {
      p.dive = { t0: this.now, vx: dx / d * 190, vy: dy / d * 190 }; this.act(p, 'dive'); G.sfx('dive');
    }
  }
  stepCelebrationMove(p, dt) {
    const mate = this.mate(p);
    if (p.act === 'highfive' && mate && mate.act === 'highfive') { const dx = mate.x - p.x, dy = mate.y - p.y, d = Math.hypot(dx, dy); if (d > 10) VBm.steer(p, dx / d * 50, dy / d * 50, dt); else { VBm.steer(p, 0, 0, dt); if (!p.fived && mate.slot > p.slot) { p.fived = true; G.sfx('high_five'); G.fx.sparkle((p.x + mate.x) / 2, (p.y + mate.y) / 2, 30); } } p.facing = Math.atan2(dy, dx); }
    else VBm.steer(p, 0, 0, dt);
    if (this.phase === 'point' && this.phaseT < .05) p.fived = false;
  }
  toggleCam() { this.camMode = this.camMode === 'Broadcast' ? 'Serve Cam' : 'Broadcast'; G.game.note((this.camMode === 'Broadcast' ? 'BROADCAST' : 'SERVE CAM')); }

  /* ---------------- the ball's place now ---------------- */
  updateBall() {
    const b = this.ball;
    if (this.held) { const a = this.held.rig.hand('L'), c = this.held.rig.hand('R'), h = a[1] > c[1] ? a : c; b.x = h[0]; b.y = h[1] + 1; b.z = h[2] + 2; return; }   // the hand nearer the camera, so the ball shows
    if (this.L && !this.L.frozen) { const q = G.Ball.at(this.L, this.now); const sp = Math.hypot(...G.Ball.vel(this.L, this.now)); b.spin += sp * .004; b.x = q[0]; b.y = q[1]; b.z = Math.max(MC.BALL_R, q[2]); this.trail.push([b.x, b.y, b.z]); if (this.trail.length > 6) this.trail.shift(); }
    else if (this.restAt) { const k = Math.min(1, this.phaseT * 2); b.z = MC.BALL_R; b.x = this.restAt[0] + k * 4; b.y = this.restAt[1] + k * 2; b.spin += .02; this.trail.length = 0; }
  }
  /* ---------------- the highlight replay ---------------- */
  record() {
    if (!this.replayOn || this.replay) return;
    if (this.phase !== 'rally' && this.phase !== 'dead' && this.phase !== 'toss') return;
    this.buf.push({ now: this.now, ball: [this.ball.x, this.ball.y, this.ball.z, this.ball.spin], ps: this.players.map(p => [p.x, p.y, p.z, p.facing, Object.assign({}, p.rs, { poseW: Object.assign({}, p.rs.poseW) }), p.rig.arms ? Object.assign({}, p.rig.arms) : null]) });
    while (this.buf.length && this.now - this.buf[0].now > 6) this.buf.shift();
  }
  startReplay() {
    const end = this.buf[this.buf.length - 1].now, from = end - 2.8;
    let i0 = this.buf.findIndex(f => f.now >= from); if (i0 < 0) i0 = 0;
    this.replay = { i: i0, t: this.buf[i0].now, end, cam: this.camMode };
    this.camMode = this.camMode === 'Broadcast' ? 'Serve Cam' : 'Broadcast';
    this.setPhase('replay');
  }
  updateReplay(dt) {
    const R = this.replay; this.phaseT += dt;
    R.t += dt * .42;
    while (R.i < this.buf.length - 1 && this.buf[R.i + 1].now <= R.t) R.i++;
    const f = this.buf[R.i];
    this.ball.x = f.ball[0]; this.ball.y = f.ball[1]; this.ball.z = f.ball[2]; this.ball.spin = f.ball[3];
    this.players.forEach((p, k) => { const s = f.ps[k]; p.x = s[0]; p.y = s[1]; p.z = s[2]; p.facing = s[3]; p.rig.arms = s[5]; p.rig.update(dt * .42, s[4]); });
    if (R.t >= R.end || (this.phaseT > .5 && this.skipPressed())) { this.replay = null; this.camMode = R.cam; this.buf.length = 0; if (this.over) this.endMatch(); else { if (this.lastPoint && this.lastPoint.res.setOver) { this.rules.nextSet(); this.matchPointShown = false; } this.placeForServe(); } }
  }
  /* ---------------- the camera ---------------- */
  camera(game) {
    const b = this.ball, view = this.camMode === 'Serve Cam' ? E.VIEWS.servecam : E.VIEWS.court;
    if (game.view !== view) { game.setView(view); this.view = view; }
    this.view = game.view;
    const cam = game.cam;
    if (this.camMode === 'Serve Cam') {   // behind the left team, framing the ball (a little ahead of it) and all four, so no one at a baseline falls off the screen
      cam.smooth = .25; const lead = this.L && !this.L.frozen ? G.Ball.vel(this.L, this.now)[0] * .15 : 0;
      cam.frame([{ x: clamp(b.x + lead, MC.X0 - 10, MC.X1 + 10), y: b.y, z: b.z }, ...this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 24 })), { x: MC.NET_X, y: MC.CY, z: MC.NET_H }], { margin: 24, zoom: [.66 * G.T.cameraZoomMul, .95 * G.T.cameraZoomMul] });
    }
    else {
      cam.smooth = .22;
      const targets = this.phase === 'serveSetup' || this.phase === 'intro' || this.phase === 'coin' ? this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 20 })) : [{ x: b.x, y: b.y, z: b.z }, ...this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 20 }))];
      targets.push({ x: MC.NET_X, y: MC.CY, z: MC.NET_H });
      cam.frame(targets, { margin: 30, zoom: [.78 * G.T.cameraZoomMul, 1 * G.T.cameraZoomMul] });
    }
  }
  /* ---------------- drawing ---------------- */
  draw(r) {
    const C = MC, t = this.now;
    const horizon = r.w(C.NET_X, 0, 0)[1];
    G.drawSky(r, this.tod, horizon);
    this.mapRef.drawFloor(r);
    G.drawShore(r, G.now());
    // the ball mark, the timing ring, the aim reticle, the debug overlay
    for (const d of this.decals) d.t += 1 / 60;
    this.decals = this.decals.filter(d => d.t < 2.5);
    r.decal(g => { for (const d of this.decals) { const p = r.w(d.x, d.y, 0); px.blend(g, .5 * (1 - d.t / 2.5), 'multiply', () => px.ell(g, p[0], p[1], 3, 1.5, '#a07840')); } });
    this.drawRing(r);
    G.drawCourtProps(r, { tod: this.tod, final: this.cfg.final });
    G.drawCrowd(r, this.crowd, G.now(), this.groan > 0 ? 'groan' : null);
    this.drawSideline(r);
    G.drawNet(r, this.netShake * 2);
    for (const p of this.players) {
      r.shadow(p.x, p.y, 6, .35 - Math.min(.2, p.z * .005));
      r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view));
      if (p.ctl.kind === 'human' || p.tag) this.drawMarker(r, p);
      if (p.bubble) r.queue(p.x, p.y, 56, g => { const q = r.w(p.x, p.y, p.z + 56); G.ui.tag(g, p.bubble.text, q[0], q[1], '#2a1a10', '#fff8e8'); }, { bias: 2 });
    }
    if (this.phase !== 'serveSetup' || !this.held) G.drawBall(r, this.ball.x, this.ball.y, this.ball.z, this.ball.spin, { trail: this.L && (this.L.kind === 'spike' || this.L.kind === 'jumpserve') && !this.L.frozen ? this.trail : null });
    else G.drawBall(r, this.ball.x, this.ball.y, this.ball.z, 0);
    for (const pp of this.popups) r.queue(pp.x, pp.y, pp.z, g => { const q = r.w(pp.x, pp.y, pp.z + pp.t * 14); E.font.text(g, pp.text, Math.round(q[0]), Math.round(q[1]), pp.col, { align: 'center', shadow: '#0a0814', outline: false }); }, { bias: 3 });
    if (this.tod === 'night' || this.tod === 'sunset') { /* floodlights come from the props */ }
    if (this.debugOverlay) this.drawDebug(r);
    r.overlay(g => this.drawHUD(g, r));
  }
  drawSideline(r) {
    // Sonny at his DJ booth, Pepper at the scorer's table (when they're not playing), and the flip scoreboard's cards
    const t = G.now(), host = this.players.some(p => p.cast === 'sonny');
    if (!host) {
      if (!this.sonnyRig) { this.sonnyRig = G.makeRig('sonny'); this.pepperRig = G.makeRig('pepper'); }
      const cheer = this.crowd.some(f => f.cheer > 0);
      G.Anim.idle(this.sonnyRig, 1 / 60, { x: 352, y: 140, z: 0, facing: Math.PI / 2, pose: cheer ? 'cheer' : null, expr: 'smile' }, { clip: !cheer ? 'Dance_Loop' : null, t, mask: 'upper' });
      G.Anim.idle(this.pepperRig, 1 / 60, { x: 392, y: 172, z: 0, facing: Math.PI / 2, poseW: { sit: 1 } });
      r.actor(352, 140, 0, (g, ox, oy) => this.sonnyRig.draw(g, ox, oy, r.view), { every: 2, key: this.sonnyRig });
      r.actor(392, 172, 0, (g, ox, oy) => this.pepperRig.draw(g, ox, oy, r.view), { every: 2, key: this.pepperRig });
    }
    const sc = this.rules.score;
    r.queue(316, 161, 21, g => { const a = r.w(306, 161, 24), b = r.w(326, 161, 24); for (const [q, v] of [[a, sc[0]], [b, sc[1]]]) { px.rect(g, q[0] - 5, q[1] - 6, 10, 10, '#f8f6f0'); px.rect(g, q[0] - 5, q[1] - 1, 10, 1, '#c8c4b8'); E.font.text(g, String(v), Math.round(q[0]), Math.round(q[1] - 5), '#1a2a4a', { align: 'center', outline: false }); } }, { bias: .5 });
  }
  drawMarker(r, p) {
    const col = p.color || (p.ctl.input ? E.PLAYER_COLORS[(p.ctl.input.player || 1) - 1] : '#ffd36a') || '#ffd36a', z = p.z + p.size * 31 + 5;
    r.queue(p.x, p.y, z, g => { const q = r.w(p.x, p.y, z), x = Math.round(q[0]), y = Math.round(q[1]); px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y]], col); if (p.tag) E.font.text(g, p.tag, x, y - 13, col, { align: 'center', shadow: '#000', outline: false }); }, { emissive: true, bias: 2 });
    r.decal(g => { const q = r.w(p.x, p.y, 0); px.blend(g, .5, 'add', () => px.ell(g, q[0], q[1], 7, 3, col)); });
  }
  drawRing(r) {
    const plan = this.plan; if (!plan || plan.done) return;
    const p = plan.p; if (p.ctl.kind !== 'human' || G.setting('ring', true) === false || this.cpuControl) return;
    if (this.dazzled === p) return;
    const left = plan.tStar - this.now; if (left > 1.6) return;
    const w = VBm.windows(), k = clamp(left / .8, 0, 1), rad = VBm.reachR(p) + (22 - VBm.reachR(p)) * k, perfect = Math.abs(left) <= w.p;
    r.groundRing(plan.P[0], plan.P[1], rad, perfect ? '#ffd36a' : '#ffffff', .9);
    r.groundRing(plan.P[0], plan.P[1], VBm.reachR(p), '#ffd36a', .35);
    if (left < .35 && left > -w.o) r.queue(p.x, p.y, 54, g => { const q = r.w(p.x, p.y, p.z + p.size * 30 + 18); E.font.text(g, '!', Math.round(q[0]), Math.round(q[1]), '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false }); }, { emissive: true, bias: 3 });
    // the aim reticle with the mouse
    if (plan.kind === 'attack' && p.mouseNow) r.groundRing(p.mouseNow[0], p.mouseNow[1], 5, '#ff5f7a', .9);
  }
  drawDebug(r) {
    const L = this.L;
    if (L && !L.frozen) r.decal(g => { let prev = null; for (let t = this.now; t < L.tLand; t += .05) { const q = G.Ball.at(L, t), s = r.w(q[0], q[1], q[2]); if (prev) px.line(g, prev[0], prev[1], s[0], s[1], '#ff5fa2'); prev = s; } const l = r.w(L.land[0], L.land[1], 0); px.rect(g, l[0] - 2, l[1] - 2, 4, 4, L.landIn ? '#5fe07a' : '#ff5a5a'); });
    if (this.plan) for (const c of [this.plan, ...(this.plan.others || [])]) r.groundRing(c.P[0], c.P[1], 6, c === this.plan ? '#5ff0ff' : '#5a7a8a', .9);
    r.overlay(g => {
      for (const p of this.players) { const q = r.w(p.x, p.y, p.z + 44); E.font.text(g, p.act + (this.plan && this.plan.p === p ? ' *' + this.plan.kind : ''), Math.round(q[0]), Math.round(q[1]), '#5ff0ff', { align: 'center', font: 'tiny', outline: '#000' }); }
      const w = VBm.windows(), x = Math.round(r.W / 2 - 60), y = Math.round(r.H * .16);
      px.rect(g, x, y, 120, 6, '#202030'); const s = 120 / 1.2; px.rect(g, x + 60 - w.o * s, y, w.o * 2 * s, 6, '#5a5a6a'); px.rect(g, x + 60 - w.g * s, y, w.g * 2 * s, 6, '#5ff0ff'); px.rect(g, x + 60 - w.p * s, y, w.p * 2 * s, 6, '#ffd36a');
      if (this.plan) { const e = clamp(this.now - this.plan.tStar, -.6, .6); px.rect(g, x + 60 + e * s, y - 2, 1, 10, '#ffffff'); }
    });
  }
  drawHUD(g, r) {
    const safe = G.safe(r), x = safe.x, y = safe.y, R = this.rules, srv = R.serveSide;
    // the TV score bug: two rows, portraits, names, score, the serve ball, sets, MATCH POINT
    const bw = 150;
    E.ui.box(g, x, y, bw, 34, { bg: ['#10202e', '#0a1420'], border: '#f6d38a', alpha: .9 });
    [0, 1].forEach(s => {
      const yy = y + 4 + s * 14, two = this.players.filter(p => p.side === s);
      two.forEach((p, i) => G.portrait(g, p.rig, x + 4 + i * 12, yy - 1, 11, { frame: false }));
      E.font.text(g, G.fit(this.teamNames[s].toUpperCase(), 80), x + 30, yy + 2, s === this.humanSide ? '#ffd36a' : '#fff8e8', { outline: false });
      if (srv === s && this.phase !== 'end' && this.phase !== 'results') G.icon(g, 'ball', x + bw - 32, yy + 1);
      if (R.sets > 1) E.font.text(g, String(R.setsWon[s]), x + bw - 40, yy + 2, '#9fd3d6', { outline: false });
      E.font.text(g, String(R.score[s]), x + bw - 12, yy + 1, '#fff8e8', { align: 'center', outline: false, shadow: '#000' });
    });
    const mp = R.matchPoint();
    if (mp >= 0 && !this.over) { E.ui.box(g, x, y + 35, 70, 11, { bg: ['#ff5f7a', '#c8304a'], border: '#ffd0d8', alpha: .95 }); E.font.text(g, 'MATCH POINT', x + 35, y + 37, '#fff8e8', { align: 'center', outline: false, font: 'tiny' }); }
    if (this.cfg.final) E.font.text(g, 'THE FORTUNA CUP FINAL', x, y + (mp >= 0 ? 49 : 38), '#ffd36a', { shadow: '#000', outline: false });
    // top right: the clock badge (vacation) or the hub clock
    if (this.cfg.clock) this.cfg.clock(g, r);
    // bottom left: the partner card
    const hum = this.humans()[0], mate = hum && this.mate(hum);
    if (mate && mate.ctl.kind === 'ai' && mate.affinity !== undefined && this.mode !== 'exhibition') {
      const cy = r.H - safe.y - 28;
      E.ui.box(g, x, cy, 96, 26, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .88 });
      G.portrait(g, mate.rig, x + 3, cy + 3, 20, { frame: false });
      E.font.text(g, mate.name, x + 26, cy + 3, '#fff8e8', { outline: false }); G.ui.hearts(g, x + 26, cy + 14, mate.affinity, 5);
    }
    // the banner
    if (this.banner) {
      const b = this.banner, k = clamp(b.t / .15, 0, 1), sc = b.text.length > 10 ? 2 : 3;
      const yy = Math.round(r.H * .3);
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, yy - 4, r.W, 30, '#203040'));
      G.icon(g, b.icon === 'star' ? 'star' : 'ball', Math.round(r.W / 2 - E.font.width(b.text, { scale: sc }) / 2 - 14), yy + 6);
      E.font.title(g, b.text, Math.round(r.W / 2 + (1 - k) * 40), yy, { scale: sc, align: 'center', colors: ['#ffffff', '#ffd36a', '#ff9e5e'], depth: 2 });
    }
    // phase cards
    if (this.phase === 'intro') { const iy = Math.round(r.H * .3); px.blend(g, .5, 'multiply', () => px.rect(g, 0, iy - 6, r.W, 60, '#102030')); E.font.title(g, this.cfg.title || (this.cfg.final ? 'THE FINAL' : 'BEACH MATCH'), r.W / 2, iy, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3 }); E.font.text(g, this.teamNames[0] + '  vs  ' + this.teamNames[1], r.W / 2, iy + 30, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, 'First to ' + R.toWin + (R.sets > 1 ? ', best of ' + R.sets + ' sets' : '') + ', win by 2', r.W / 2, iy + 41, '#9fd3d6', { align: 'center', shadow: '#000', outline: false }); }
    if (this.phase === 'replay') { px.rect(g, 0, 0, r.W, 14, '#000000'); px.rect(g, 0, r.H - 14, r.W, 14, '#000000'); E.font.text(g, 'REPLAY', 8, 4, '#ff5f7a', { outline: false }); if (Math.floor(G.now() * 2) % 2) px.disc(g, 48, 7, 2, '#ff2a2a'); E.font.text(g, 'any button skips', r.W - 8, r.H - 11, '#9fd3d6', { align: 'right', outline: false }); }
    if (this.dazzleTell && this.now - this.dazzleTell < 1.6) { const hum2 = this.humans().find(p => p.side !== srv); if (hum2) E.font.title(g, hum2.shades ? 'SHADES ON!' : 'DAZZLED!', r.W / 2, Math.round(r.H * .2), { scale: 2, align: 'center', colors: hum2.shades ? ['#ffffff', '#5ff0ff'] : ['#ffffff', '#ffd36a', '#ff9e5e'] }); }
    // the commentary box and the prompts
    this.talk.draw(g, r);
    if (this.tip) this.drawTip(g, r);
    if (this.phase !== 'results') this.drawPrompts(g, r);
    if (this.phase === 'results' && this.resultsUI) this.resultsUI.draw(g, r);
  }
  drawTip(g, r) {
    const T = this.tip, text = typeof T.text === 'function' ? T.text(this.humans()[0] ? this.humans()[0].ctl.input : G.game.input) : T.text, w = Math.min(250, r.W - 40), lines = E.font.wrap(text, w - 40), h = lines.length * 9 + 16, x = Math.round((r.W - w) / 2), y = Math.round(r.H * .05) + 2;
    const k = clamp(T.t / .2, 0, 1) * clamp((5.5 - T.t) / .3, 0, 1);
    G.ui.panel(g, x, y - (1 - k) * 30, w, h, { title: "PEPPER'S TIP", alpha: .95 });
    G.portrait(g, G.portraitRig('pepper'), x + 5, y + 6 - (1 - k) * 30, 22, { frame: false });
    lines.forEach((l, i) => E.font.text(g, l, x + 32, y + 7 + i * 9 - (1 - k) * 30, '#fff8e8', { shadow: '#0a0814', outline: false }));
  }
  drawPrompts(g, r) {
    const hum = this.humans(); if (!hum.length || this.cpuControl) return;
    if (hum.length > 1) return this.drawMultiPrompts(g, r, hum);
    const p = hum[0], I = p.ctl.input, plan = this.plan, items = [];
    if (this.phase === 'serveSetup' && this.server === p) { items.push(['play', 'Float serve'], ['shot', 'Jump serve'], ['move', 'Walk']); }
    else if (this.phase === 'toss' && this.server === p) items.push(['play', 'Hit at the top']);
    else if (this.phase === 'rally') {
      const mine = plan && !plan.done && plan.p === p;
      if (mine) { const k = plan.kind; items.push(['play', k === 'set' ? 'Set' : k === 'attack' ? 'Spike' : k === 'free' ? 'Free ball' : 'Bump'], ['shot', k === 'attack' ? 'Cut shot' : k === 'set' ? 'Dump' : 'Free ball'], ['dive', 'Dive']); }
      else if (plan && plan.side !== p.side && plan.kind === 'attack') items.push(['shot', 'Block'], ['dive', 'Dive'], ['call', 'Call']);
      else items.push(['call', p.call === 'auto' ? 'Call' : p.call === 'mine' ? 'Mine!' : 'Yours!'], ['dive', 'Dive'], ['view', 'Camera']);
    } else if (this.phase === 'intro' || this.phase === 'point' || this.phase === 'end') items.push(['confirm', 'Skip']);
    else if (this.phase === 'replay') items.push(['confirm', 'Skip replay']);
    if (items.length) G.promptBar(g, r, items.slice(0, 3), { input: I, x: Math.round(r.W * .05) + 104 > r.W / 2 - 80 ? undefined : undefined });
  }
  drawMultiPrompts(g, r, hum) {
    // each player's prompt over her own head, in her own device's glyphs
    for (const p of hum) {
      const I = p.ctl.input, plan = this.plan; let a = null, txt = '';
      if (this.phase === 'serveSetup' && this.server === p) { a = 'play'; txt = 'Serve'; }
      else if (this.phase === 'toss' && this.server === p) { a = 'play'; txt = 'Hit'; }
      else if (plan && !plan.done && plan.p === p && this.phase === 'rally') { a = 'play'; txt = plan.kind === 'set' ? 'Set' : plan.kind === 'attack' ? 'Spike' : 'Bump'; }
      if (!a) continue;
      const q = G.lastR ? G.lastR.w(p.x, p.y, p.z + 62) : [0, 0];
      const w = G.promptW(a, txt, { input: I });
      G.prompt(g, Math.round(q[0] - w / 2), Math.round(q[1] - 6), a, txt, { input: I });
    }
  }
};
