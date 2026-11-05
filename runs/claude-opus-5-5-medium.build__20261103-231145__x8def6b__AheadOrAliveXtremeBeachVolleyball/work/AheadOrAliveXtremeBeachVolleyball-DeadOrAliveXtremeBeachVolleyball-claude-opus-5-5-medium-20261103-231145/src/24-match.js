/* 24-match: one Match class for every mode (vacation, tutorial, semifinal, final, Beach Match, AI Hub, attract).
 * Phases: intro -> coin -> serveSetup -> toss -> rally -> dead -> point -> [replay] -> ... -> end. The match keeps its own
 * clock (game time locally, the hub's clock online); contacts are planned from the launch (who takes it, where, when),
 * humans are judged on their presses against that plan, the AI rolls its touches on the match stream. */
G.VIEW_COURT = new E.View('court', 'Broadcast', 8, 32, 1.5, 1);
G.VIEW_SERVE = [new E.View('servecamL', 'Serve Cam', -90, 46, 1.5, 1), new E.View('servecamR', 'Serve Cam', 90, 46, 1.5, 1)];
const Bl = G.Ball;
G.Match = class {
  constructor(cfg) {
    this.cfg = cfg; this.mode = cfg.mode || 'exhibition'; this.clock = 0; this.aclock = 0; this.phase = 'intro'; this.phT = 0;
    this.score = [0, 0]; this.sets = [0, 0]; this.to = cfg.pointsToWin || 7; this.setsToWin = cfg.setsToWin || 1;
    this.difficulty = cfg.difficulty || G.setting('difficulty') || 'Normal';
    this.tod = cfg.tod || 'afternoon'; this.weather = cfg.weather || 'sunny';
    this.spectacle = !!cfg.spectacle; this.cpuAll = !!cfg.cpuAll; this.partnerAff = cfg.partnerAff === undefined ? null : cfg.partnerAff;
    this.players = [];
    cfg.teams.forEach((team, s) => team.forEach((spec, k) => this.players.push(new G.Player(this, this.players.length, s, k, spec))));
    this.humanSide = this.players.some(p => p.side === 0 && p.human) ? 0 : this.players.some(p => p.side === 1 && p.human) ? 1 : -1;
    this.versus = this.players.some(p => p.side === 0 && p.human) && this.players.some(p => p.side === 1 && p.human);
    this.mouseOwner = (this.players.find(p => p.input === G.game.input) || {}).idx;
    this.lastServer = [1, 1]; this.serveSide = cfg.serveFirst === undefined ? 0 : cfg.serveFirst; this.server = null;
    this.touches = [0, 0]; this.lastTouch = null; this.lastWasBlock = false; this.L = null; this.rallyTouches = 0; this.rallies = 0; this.longest = 0;
    this.specials = cfg.specials || {}; this.glare = null; this.houseEdgeUsed = {}; this.luckyUsed = false;
    this.camMode = cfg.cam || (G.setting('matchCam') === 'servecam' ? 'servecam' : 'court');
    this.replayBuf = []; this.replay = null; this.ptsSinceReplay = 9; this.replays = cfg.replays !== false && !G.inHub();
    this.banner = null; this.popups = []; this.over = false; this.result = null; this.matchPoint = false;
    this.tutorial = cfg.tutorial ? { autoLeft: 2, shown: {} } : null;
    this.comment = new G.Commentary(cfg.commentary !== false && G.setting('commentary') !== false);
    this.crowd = []; for (let i = 0; i < 36; i++) { const h = E.hash2(i * 7, 3), tier = i % 3, col = Math.floor(i / 3), bx = col < 6 ? 278 + col * 9 : 382 + (col - 6) * 9; this.crowd.push({ x: bx + (h - .5) * 3, y: [102, 96, 90][tier], z: [6, 12, 18][tier], shirt: ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a', '#ffffff', '#ff9e5e', '#a87aff'][Math.floor(h * 7)], skin: ['#f1cfb2', '#b9825a', '#7a4a2e', '#e2ad84'][Math.floor(h * 31) % 4], ph: h * 9, side: i % 2 }); }
    this.cheer = 0; this.groan = 0; this.attackPlan = null; this.events = [];
    this.introT = cfg.skipIntro ? 0 : 3;
    this.net = null;   // the AI Hub layer (25-netplay) when online
    for (const p of this.players) p.home = [p.x, p.y];
    // walk-on: everyone starts at the sides
    for (const p of this.players) { p.x = p.side ? G.COURT.X1 + 50 : G.COURT.X0 - 50; p.y = G.COURT.Y1 + 30 + p.slot * 14; }
    G.AI.formation(this);
    G.bus.emit('matchStart', this);
  }
  get ballPos() { if (this.replay) return this.replay.ball; if (this.L) return Bl.at(this.L, this.clock); const s = this.server; if (s) { const h = s.rig.hand ? s.rig.hand('L') : null; return h ? [h[0], h[1], h[2]] : [s.x, s.y, 22]; } return null; }
  now() { return this.clock; }
  /* ------------------------------------------------ the step ------------------------------------------------ */
  update(dt) {
    if (this.net && this.net.clock) this.clock = this.net.clock(); else this.clock += dt;
    this.aclock = this.clock; this.phT += dt;
    if (this.replay) return this.replayStep(dt);
    if (this.net && this.net.client) { this.net.clientStep(dt); this.common(dt); return; }
    this.phaseStep(dt);
    this.common(dt);
    this.record();
  }
  common(dt) {
    G.AI.formation(this);
    for (const p of this.players) {
      if (this.phase === 'serveSetup' && p === this.server) { p.x = p.side ? G.COURT.X1 + 20 : G.COURT.X0 - 20; }
      p.update(dt);
    }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.popups = this.popups.filter(q => (q.t += dt) < 1);
    this.cheer = Math.max(0, this.cheer - dt); this.groan = Math.max(0, this.groan - dt);
    this.comment.update(dt);
    // the view: V / R3 toggles the camera
    for (const p of this.players) if (p.isHuman && p.input && p.input.pressed('view')) { this.camMode = this.camMode === 'court' ? 'servecam' : 'court'; G.game.note(this.camMode === 'court' ? 'BROADCAST' : 'SERVE CAM'); }
    this.camera();
  }
  phaseStep(dt) {
    const t = this.clock;
    switch (this.phase) {
      case 'intro':
        if (this.net) break;
        if (this.phT > this.introT || this.players.some(p => p.isHuman && p.input && (p.input.pressed('play') || p.input.pressed('confirm')))) { this.phase = 'coin'; this.phT = 0; this.say('start'); G.sfx('whistle'); this.setBanner((this.serveSide ? 'RIGHT' : 'LEFT') + ' SIDE SERVES', 1); }
        break;
      case 'coin': if (this.phT > 1) this.startServe(); break;
      case 'serveSetup': this.serveSetupStep(dt); break;
      case 'toss': this.tossStep(dt); break;
      case 'rally': this.rallyStep(dt); break;
      case 'dead': if (this.phT > 1) { this.phase = 'point'; this.phT = 0; this.celebrate(); } break;
      case 'point':
        if (this.phT > 1.6) {
          if (this.over) { this.phase = 'end'; this.phT = 0; this.finish(); }
          else if (this.wantReplay) { this.wantReplay = false; this.startReplay(); }
          else this.startServe();
        }
        break;
    }
    if (this.tutorial) this.tutorialStep();
  }
  /* ------------------------------------------------ serving ------------------------------------------------ */
  startServe() {
    const s = this.serveSide, slot = G.Rules.nextServer(this.lastServer, s);
    this.server = this.players.find(p => p.side === s && p.slot === slot) || this.players.find(p => p.side === s);
    this.lastServer[s] = this.server.slot;
    this.phase = 'serveSetup'; this.phT = 0; this.L = null; this.touches = [0, 0]; this.lastTouch = null; this.attackPlan = null; this.rallyTouches = 0; this.glare = null;
    for (const p of this.players) { p.plan = null; p.pressed = false; p.blockFor = false; p.faceTo = null; p.act = null; p.jump = null; p.dive = null; }
    this.server.serveY = G.COURT.CY + (this.server.slot ? 22 : -22);
    this.server.x = this.server.side ? G.COURT.X1 + 20 : G.COURT.X0 - 20; this.server.y = this.server.serveY;
    this.aiServeAt = 1.2 + G.rng('match') * 1.3;
    if (this.specials.glare && this.server.id === 'sonny' && G.rng('match') < .5) this.glare = { t: -1 };
    if (this.net && this.net.host) this.net.event({ ev: 'serve', server: this.server.idx });
  }
  serveSetupStep(dt) {
    const p = this.server;
    if (p.isHuman && !this.netRemote(p)) {
      const I = p.input, m = I.move(); if (Math.abs(m[1]) > .2 || Math.abs(m[0]) > .2) { const g = G.game.view.screenDirToGround(m[0], m[1]); p.serveY = clamp(p.serveY + g[1] * 70 * dt, G.COURT.Y0 + 4, G.COURT.Y1 - 4); }
      if (I.pressed('play')) this.toss('float'); else if (I.pressed('shot')) this.toss('jump');
      else if (this.phT > 10) { this.toss('float'); this.autoServe = true; }
    } else if (!this.netRemote(p) && this.phT > this.aiServeAt) this.toss(G.AI.serveKind(p));
    if (this.netRemote(p) && this.phT > 12) { this.toss('float'); this.autoServe = true; }
  }
  netRemote(p) { return this.net && this.net.host && p.remote; }
  toss(kind) {
    const p = this.server, d = p.dir, apex = kind === 'jump' ? 66 : 56, z0 = 30, g = G.T.ballGravity, vz = Math.sqrt(2 * g * (apex - z0)) * 1.04;
    this.L = Bl.make(this.clock, [p.x + d * 4, p.y + 2, z0], [d * (kind === 'jump' ? 12 : 3), 0, vz], { kind: 'toss', side: p.side, by: p.idx, k: .0001 });
    this.tossKind = kind; this.tossApex = this.clock + Bl.apexTau(this.L); this.phase = 'toss'; this.phT = 0; this.tossHit = false;
    p.setAct('toss', .55); G.sfx('serveToss');
    if (kind === 'jump') { p.startJump(this.tossApex - .38, 'spike'); }
    if (this.glare) this.glare.t = this.clock;
    if (this.net && this.net.host) this.net.launch(this.L);
  }
  tossStep(dt) {
    const p = this.server, t = this.clock;
    if (this.tossKind === 'jump' && t > this.tossApex - .5) { p.x += p.dir * 40 * dt; }
    if (p.isHuman && !this.netRemote(p) && !this.autoServe) {
      const I = p.input;
      if (I.pressed('play') || I.pressed('shot')) { const err = t - this.tossApex, q = G.devPerfect ? 'PERFECT' : G.judge(err); this.popup(p, q); return this.serveHit(q === 'MISS' ? 'STRETCH' : q, null, true); }
    } else if (this.autoServe && t >= this.tossApex) { this.autoServe = false; return this.serveHit('OK'); }
    else if (!this.netRemote(p) && !p.isHuman && t >= this.tossApex + (G.rng('match') - .5) * .04) return this.serveHit(G.AI.roll(p, 'POW'));
    if (t > this.L.t0 + 1.2 + (this.tossKind === 'jump' ? .3 : 0) || this.L && t >= this.L.tLand) this.fault(p.side, 'noServe');
  }
  /** the serve: from the ball at the top of the toss to the aim, scattered by quality */
  serveHit(q, aim, judged) {
    const p = this.server, from = Bl.at(this.L, this.clock), jump = this.tossKind === 'jump';
    if (q === 'MISS') q = 'STRETCH';
    let tgt = aim || (p.isHuman ? p.aimPoint('serve') : G.AI.serveTarget(p));
    const rad = G.QUAL[q].r * (jump ? 1.5 : 1), a = G.rng('match') * Math.PI * 2, rr = Math.sqrt(G.rng('match')) * rad;
    if (this.spectacle) tgt = G.zonePoint(p.side, 2, G.rng('match') < .5 ? -1 : 1);
    const T = (jump ? G.T.jumpServeT : G.T.serveT) / G.QUAL[q].sp * (q === 'STRETCH' ? 1 : 1);
    const to = [tgt[0] + Math.cos(a) * rr, tgt[1] + Math.sin(a) * rr, Bl.R];
    const v = Bl.aim(from, to, T);
    const wob = jump ? null : { a: 3 + G.rng('match') * 4, w: 9 + G.rng('match') * 4, ph: G.rng('match') * 6 };
    this.L = Bl.make(this.clock, from, v, { kind: 'serve', side: p.side, by: p.idx, wob });
    this.phase = 'rally'; this.phT = 0; this.touches = [0, 0]; this.lastTouch = p; this.lastWasBlock = false; this.rallyTouches = 0; this.killAt = 3 + Math.floor(G.rng('match') * 7);
    p.stats.serves++; p.setAct('serve', .45, { win: .05 }); G.sfx('serveHit'); if (p.isHuman) p.input.rumble(.35, .1);
    this.plan();
    if (this.net && this.net.host) this.net.launch(this.L);
    G.bus.emit('touch', { kind: 'serve', p, q });
  }
  /* ------------------------------------------------ the rally ------------------------------------------------ */
  rallyStep(dt) {
    const t = this.clock;
    let L = this.L;
    if (L.tNet !== null && !L.netDone && t >= L.tNet) { L.netDone = true; this.netEvent(L); if (this.phase !== 'rally') return; L = this.L; }
    for (const p of this.players) {
      if (this.netRemote(p)) { this.remoteStep(p); continue; }
      if (p.isHuman && p.input) this.humanStep(p); else if (!p.isHuman) this.aiStep(p);
      if (this.L !== L || this.phase !== 'rally') return;
    }
    if (t >= L.tLand) this.landed(L);
  }
  /** a human's buttons during a rally */
  humanStep(p) {
    const I = p.input, t = this.clock, pl = p.plan;
    if (I.pressed('call')) { p.cycleCall(); this.plan(true); }
    if (I.pressed('dive')) p.startDive();
    const sh = I.pressed('shot'), pl2 = I.pressed('play');
    if (sh && this.attackPlan && this.attackPlan.side !== p.side && Math.abs(p.x - G.COURT.NET_X) < 22 && !p.jump) { p.startJump(t, 'block', G.T.blockRise, .18, .3); p.blockPress = t; p.setAct('block', G.T.blockRise + .48, { win: .1 }); G.sfx('ui_tick'); return; }
    if (pl && (sh || pl2) && !p.pressed) {
      const err = t - pl.t;
      if (err >= -.6) {
        const w = G.windows();
        if (err > w.ok) { /* too late: the ball has passed */ }
        else {
          let q = G.devPerfect ? 'PERFECT' : G.judge(err, w);
          p.pressed = true;
          if (q === 'MISS') { this.whiff(p); return; }
          const b = Bl.at(this.L, t), d = Math.hypot(b[0] - p.x, b[1] - p.y), reach = p.reach + p.diveBonus;
          if (d > reach + 8 && !G.devPerfect) { this.whiff(p); return; }
          if (d > reach && !G.devPerfect) q = G.lower(q);
          return this.contact(p, q, { shot: sh });
        }
      }
    }
    if (pl && !p.pressed && t >= pl.t) {
      const auto = pl.kind === 0 && (G.setting('autoReceive') || (this.tutorial && this.tutorial.autoLeft > 0));
      if (auto) { const b = Bl.at(this.L, t), d = Math.hypot(b[0] - p.x, b[1] - p.y); if (d <= p.reach + 8 + p.diveBonus) { if (this.tutorial) this.tutorial.autoLeft--; p.pressed = true; return this.contact(p, 'OK', {}); } }
    }
    if (pl && t > pl.t + G.windows().ok + .02) { p.plan = null; }
    // the partner covers a ball the human can't get to
    if (pl && !p.pressed && t >= pl.t - .4 && t < pl.t - .38 + 1 / 120) {
      const mate = this.players.find(q => q.side === p.side && q !== p);
      if (mate && !mate.isHuman && Math.hypot(pl.P[0] - p.x, pl.P[1] - p.y) > 40 && Math.hypot(pl.P[0] - mate.x, pl.P[1] - mate.y) < 40 && !(this.lastTouch === mate && this.L.side === p.side)) { mate.plan = pl; p.plan = null; mate.shout('Mine!'); }
    }
  }
  whiff(p) { p.setAct('whiff', .45); p.lock = .45; this.popup(p, 'MISS'); G.sfx('ui_back'); }
  aiStep(p) {
    const t = this.clock, pl = p.plan;
    if (p.blockAt && t >= p.blockAt) { p.blockAt = null; p.startJump(t, 'block', G.T.blockRise, .18, .3); p.blockPress = t; p.setAct('block', G.T.blockRise + .48, { win: .1 }); }
    if (!pl) return;
    const P = Bl.at(this.L, pl.t), sk = G.AI.skill(p, 'TEC'), hard = this.L.kind === 'spike' ? (1 - sk) * 9 : this.L.kind === 'shot' ? (1 - sk) * 5 : 0, d = Math.hypot(P[0] - p.x, P[1] - p.y) + hard;
    if (!p.dive && t >= pl.t - .32 && d > p.reach + 4 && d < p.reach + G.T.diveReach + 18) p.startDive();
    if (t >= pl.t) {
      p.plan = null;
      if (d > p.reach + 8 + p.diveBonus) { if (G.rng('match') < .5) p.shout('Ah!'); return; }
      let q = G.AI.roll(p, pl.kind === 2 ? 'POW' : 'TEC');
      if (d > p.reach + p.diveBonus) q = G.lower(q);
      // digging a hard attack is a skill roll of its own
      if (!this.spectacle && (this.L.kind === 'spike' || this.L.kind === 'shot') && G.rng('match') > (this.L.kind === 'spike' ? .3 + .5 * sk : .45 + .4 * sk) * (this.L.spd > 360 ? .85 : 1)) { if (G.rng('match') < .6) { this.whiff(p); return; } q = 'SHANK'; }
      if (q === 'MISS') { if (G.rng('match') < .5) { this.whiff(p); return; } q = 'SHANK'; }
      this.contact(p, q, { shot: pl.kind === 2 ? G.AI.wantsShot(p) : pl.kind === 1 ? G.rng('match') < .08 && !this.players.some(o => o.side !== p.side && Math.abs(o.x - G.COURT.NET_X) < 40) : false, ai: true });
    }
  }
  /** a remote human's fighter on the host: it acts on the claims its player sends */
  remoteStep(p) {
    const t = this.clock, pl = p.plan;
    const c = p.claim; if (c) { p.claim = null; if (pl && Math.abs(c.at - pl.t) <= G.windows().ok + .12) { const b = Bl.at(this.L, c.at), d = Math.hypot(b[0] - p.x, b[1] - p.y); if (d <= p.reach + 12 + G.T.diveReach) { this.clock = Math.max(this.clock, c.at); return this.contact(p, c.q, { shot: !!c.sh, aim: c.aim, at: c.at }); } } }
    if (c && c.block) { p.startJump(t, 'block', G.T.blockRise, .18, .3); p.blockPress = t; p.setAct('block', G.T.blockRise + .48); }
    if (pl && t > pl.t + G.windows().ok + .25) {   // waited long enough for a late claim
      if (pl.kind === 0 && G.setting('autoReceive')) { const b = Bl.at(this.L, pl.t), d = Math.hypot(b[0] - p.x, b[1] - p.y); if (d <= p.reach + 8) return this.contact(p, 'OK', {}); }
      p.plan = null;
    }
  }
  /** a touch: the new launch by kind (receive, set, attack) and quality */
  contact(p, q, o = {}) {
    const t = o.at === undefined ? this.clock : o.at, L = this.L, s = p.side, d = p.dir, C = G.COURT, mate = this.players.find(m => m.side === s && m !== p);
    const from = Bl.at(L, t); if (from[2] < Bl.R) from[2] = Bl.R + .5;
    const cameFromOther = L.side !== s || L.kind === 'serve';
    if (cameFromOther && !(this.lastWasBlock && this.lastTouch && this.lastTouch.side === s)) this.touches[s] = 0;
    if (this.lastTouch === p && !this.lastWasBlock && this.touches[s] > 0) return this.fault(s, 'double', p);
    this.touches[s]++;
    if (this.touches[s] > 3) return this.fault(s, 'four', p);
    const touchN = this.touches[s] - 1, kind = p.planKind !== undefined ? p.planKind : touchN;
    p.planKind = undefined;
    const Q = G.QUAL[q] || G.QUAL.OK, dig = !!p.dive || q === 'SHANK', rain = this.weather === 'rain' ? 1.2 : 1, rng = () => G.rng('match');
    const scatter = (pt, rad) => { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rad; return [pt[0] + Math.cos(a) * r, pt[1] + Math.sin(a) * r]; };
    let v, kindName, T, he = false;
    if (q === 'SHANK') {   // a shank: anywhere
      const tgt = [from[0] - d * (20 + rng() * 60), from[1] + (rng() - .5) * 160]; v = Bl.aim(from, [tgt[0], tgt[1], Bl.R], .9 + rng() * .4); kindName = 'pass';
    } else if (touchN === 0 || kind === 0) {
      if (o.shot) {   // a free ball over
        const tgt = scatter(G.AI.attackTarget(p, 'free'), Q.r); v = Bl.aim(from, [tgt[0], tgt[1], Bl.R], 1.2); kindName = 'free';
      } else {
        let ty = mate ? mate.y : C.CY;
        if (p.isHuman && p.input) { const m = p.input.move(); if (Math.abs(m[1]) > .3 || Math.abs(m[0]) > .3) { const g = G.game.view.screenDirToGround(m[0], m[1]); ty += g[1] * 24; } }
        const tgt = scatter([C.NET_X - d * 40, clamp(ty, C.Y0 + 14, C.Y1 - 14)], Q.r * (dig ? 1.6 : 1) * rain);
        tgt[0] = s ? Math.max(tgt[0], C.NET_X + 10) : Math.min(tgt[0], C.NET_X - 10);
        T = G.T.passT * (dig ? 1.12 : 1) / Math.max(.8, Q.sp);
        v = Bl.aim(from, [tgt[0], tgt[1], 40], T); kindName = 'pass';
        if (L.kind === 'spike' || L.kind === 'shot') p.stats.digs++;
        if (q === 'PERFECT') p.stats.perfectPasses++;
      }
      p.setAct(dig ? 'dig' : 'bump', .5, { win: .08 }); G.sfx('bump');
    } else if (touchN === 1) {
      const hitter = mate || p;
      if (o.shot) { const tgt = scatter(G.zonePoint(s, 0, rng() < .5 ? -1 : 1), Q.r * .6); v = Bl.aim(from, [tgt[0], tgt[1], Bl.R], .6); kindName = 'dump'; }
      else {
        let quick = false, hy = hitter.y;
        if (p.isHuman && p.input) { const m = p.input.move(); if (Math.hypot(m[0], m[1]) > .3) { const g = G.game.view.screenDirToGround(m[0], m[1]); if (g[0] * d > .5) quick = true; } }
        const tgt = scatter([C.NET_X - d * 22, clamp(hy, C.Y0 + 14, C.Y1 - 14)], Q.r * .8 * rain);
        tgt[0] = s ? Math.max(tgt[0], C.NET_X + 8) : Math.min(tgt[0], C.NET_X - 8);
        T = (quick ? .75 : G.T.setT) / Math.max(.85, Q.sp);
        v = Bl.aim(from, [tgt[0], tgt[1], hitter.attackH], T); kindName = 'set'; p.stats.sets++;
      }
      p.setAct('set', .42, { win: .08 }); G.sfx('set');
    } else {
      const highEnough = from[2] > C.NET_H + 4;
      let tgt = o.aim || (p.isHuman ? p.aimPoint(o.shot ? 'shot' : 'spike') : G.AI.attackTarget(p, o.shot ? 'shot' : 'spike'));
      if (this.spectacle) tgt = G.AI.attackTarget(p, 'spike');
      if (this.specials.houseEdge && p.id === 'pepper' && !this.houseEdgeUsed[this.sets[0] + this.sets[1]] && !o.shot) { this.houseEdgeUsed[this.sets[0] + this.sets[1]] = true; tgt = G.zonePoint(s, 2, (this.players.find(x => x.side !== s && x.isHuman) || {}).y > C.CY ? -1 : 1); tgt[1] = tgt[1] > C.CY ? C.Y1 - 3 : C.Y0 + 3; q = 'PERFECT'; he = true; this.say(null, 'Line shot. Calculated.', 'pepper'); }
      if (!highEnough) {   // too low to attack: a soft free ball
        const ft = scatter(tgt, 20); v = Bl.aim(from, [ft[0], ft[1], Bl.R], 1.15); kindName = 'free';
        p.setAct('bump', .5);
      } else if (o.shot) {
        const ft = scatter(tgt, (G.QUAL[q] || Q).r * .8); v = Bl.aim(from, [ft[0], ft[1], Bl.R], G.T.shotT); kindName = 'shot'; p.setAct('shot', .5, { win: .05, aim: [6, 1, 28] }); G.sfx('set');
      } else {
        const ft = he ? tgt : scatter(tgt, (G.QUAL[q] || Q).r);
        const spd = G.T.spikeSpeed * (.85 + .035 * p.stats0.POW) * (G.QUAL[q] || Q).sp, dist = Math.hypot(ft[0] - from[0], ft[1] - from[1]);
        T = Math.max(.22, dist / (spd * Math.cos(15 * Math.PI / 180)));
        v = Bl.aim(from, [ft[0], ft[1], Bl.R], T);
        // spike assist: lift the arc just enough to clear the net
        const test = Bl.make(t, from, v, {}), nc = Bl.netCheck(test);
        if (nc && (nc.kind === 'net' || nc.kind === 'tape')) {
          const deficit = C.NET_H + Bl.R + 2 - nc.q[2], allow = p.isHuman ? (G.DIFF[this.difficulty] || G.DIFF.Normal).assist : 99;
          if (deficit < allow || this.spectacle) { for (let k = 0; k < 14; k++) { T *= 1.07; v = Bl.aim(from, [ft[0], ft[1], Bl.R], T); const n2 = Bl.netCheck(Bl.make(t, from, v, {})); if (!n2 || n2.kind === 'clear') break; } }
        }
        kindName = 'spike'; p.setAct('spike', .5, { win: .05, aim: [7, 1.2, 30] }); G.sfx('spike', { vol: Math.min(1.2, spd / 330) }); if (p.isHuman) p.input.rumble(.35, .1);
        G.game.shake(1.5);
      }
      this.attackPlan = null; for (const x of this.players) x.blockFor = false;
    }
    if (q === 'PERFECT') G.fx.sparkle(from[0], from[1], from[2], 8);
    this.L = Bl.make(t, from, v, { kind: kindName, side: s, by: p.idx });
    if (this.luckyArmed && p.id === 'sonny' && kindName === 'spike') { this.L.forceTape = true; this.luckyArmed = false; }
    if (this.L.kind === 'spike' && he) this.L.houseEdge = true;
    this.lastTouch = p; this.lastWasBlock = false; this.rallyTouches++; p.stats.touches++;
    if (p.isHuman || this.spectacle === false && p.side === this.humanSide) this.popup(p, q === 'SHANK' ? 'MISS' : q);
    if (this.rallyTouches === 8) { this.say('rally'); G.game.audio.layer('rally', 1, .5); }
    this.plan();
    if (this.net && this.net.host) this.net.launch(this.L);
    G.bus.emit('touch', { kind: kindName, p, q });
  }
  /** who takes the next touch, where and when */
  plan(keepCalls) {
    const L = this.L, t = this.clock, C = G.COURT;
    for (const p of this.players) { if (!keepCalls || p.plan) { p.plan = null; p.pressed = false; } p.planKind = undefined; }
    if (!L) return;
    const s = Bl.sideOf(L.land[0]), cross = L.tNet !== null && !L.netDone;
    const fromOther = L.side !== s || L.kind === 'serve' || L.kind === 'toss';
    const touchN = fromOther && !(this.lastWasBlock && this.lastTouch && this.lastTouch.side === s) ? 0 : this.touches[s];
    if (touchN >= 3) return;
    if (Math.abs(L.land[0] - C.NET_X) > 220 || Math.abs(L.land[1] - C.CY) > 150) return;   // far out: nobody chases it
    if (this.spectacle && (L.kind === 'spike' || L.kind === 'shot') && this.rallyTouches >= this.killAt && fromOther) return;   // the attract's kill
    let cands = this.players.filter(p => p.side === s && !(p === this.lastTouch && !this.lastWasBlock && !fromOther));
    if (!cands.length) return;
    const opts = cands.map(p => {
      let h = touchN === 2 ? p.attackH : touchN === 1 ? 40 : 18, ts = Bl.timeAtHeight(L, h);
      if (ts === null || ts < t + .12 || (cross && ts < L.tNet + .04)) { h = 18; ts = Bl.timeAtHeight(L, h); }
      if (ts === null || ts < t + .08 || (cross && ts < L.tNet + .04)) { ts = L.tLand - .04; h = Bl.at(L, ts)[2]; }
      if (ts < t + .05) return null;
      const P = Bl.at(L, ts), dist = Math.hypot(P[0] - p.x, P[1] - p.y), react = p.isHuman ? 0 : G.T.aiReaction * (1.2 - G.AI.skill(p, 'SPD'));
      const arrive = t + react + dist / p.speed;
      return { p, h, t: ts, P, arrive, dist };
    }).filter(Boolean);
    if (!opts.length) return;
    // a human's call wins if that player can get there
    let pick = null;
    for (const o of opts) if (o.p.isHuman && o.p.call === 'mine' && o.arrive <= o.t + .1 + .6) pick = o;
    for (const o of opts) if (o.p.isHuman && o.p.call === 'yours') { const other = opts.find(x => x !== o); if (other) pick = other; }
    if (!pick) { opts.sort((a, b) => (a.arrive - a.t) - (b.arrive - b.t) || (a.p === this.lastTouch ? 1 : -1)); pick = opts[0]; }
    if (opts.length > 1 && !pick.p.isHuman) { const o2 = opts.find(o => o !== pick); if (o2 && Math.abs((o2.arrive - o2.t) - (pick.arrive - pick.t)) < .05 && pick.p === this.lastTouch) pick = o2; }
    const p = pick.p; p.plan = { t: pick.t, P: [pick.P[0], pick.P[1]], h: pick.h, kind: touchN, z: pick.P[2] }; p.pressed = false; p.planKind = touchN;
    if (!p.isHuman && G.rng('match') < .25) p.shout(G.LINES[p.id] ? G.LINES[p.id].bark[0] : 'Mine!');
    if (touchN === 2) {
      this.attackPlan = { side: s, p, t: pick.t };
      if (pick.P[2] > C.NET_H + 4) p.startJump(pick.t - p.rise, 'spike');
      const b = G.AI.pickBlocker(this, p);
      if (b) { const err = (1 - G.AI.skill(b, 'JMP')) * (G.rng('match') - .5) * .2; b.blockAt = pick.t + .05 - G.T.blockRise + err; }
    }
    G.bus.emit('plan', p.plan);
  }
  /** the ball reaches the net plane: a block, a clear crossing, the tape, the net or outside the antennae */
  netEvent(L) {
    const C = G.COURT, q = Bl.at(L, L.tNet), t = L.tNet, att = L.side;
    if (L.kind !== 'toss') for (const b of this.players) {
      if (b.side === att || !b.jump || b.jump.kind !== 'block') continue;
      const top = b.handTop(t), reachY = 9 + .6 * b.stats0.JMP;
      if (Math.abs(q[1] - b.y) > reachY || Math.abs(b.x - C.NET_X) > 14 || q[2] < C.NET_H - 2 || q[2] > top + 2) continue;
      if (L.kind === 'shot' && !(b.stats0.JMP >= 9)) continue;
      const err = (b.blockPress + G.T.blockRise) - t;
      let bq = b.isHuman ? G.judge(err * .8) : G.AI.roll(b, 'JMP');
      if (G.devPerfect && b.isHuman) bq = 'PERFECT';
      if (err < -.28 && Math.abs(b.x - C.NET_X) < 9 && G.rng('match') < .5) return this.fault(b.side, 'netTouch', b);
      if (bq === 'MISS') continue;
      const v = Bl.vel(L, t);
      this.touches[b.side] = 0; this.lastTouch = b; this.rallyTouches++;
      if (bq === 'PERFECT' || bq === 'GREAT') {
        this.L = Bl.make(t, [C.NET_X - b.dir * 3, q[1], q[2]], [-.35 * v[0], .3 * v[1] + (G.rng('match') - .5) * 40, -60], { kind: 'stuff', side: b.side, by: b.idx });
        b.stats.blocks++; this.touches[b.side] = 1; this.lastWasBlock = true; G.sfx('block'); G.game.shake(2.5); G.fx.sparkle(q[0], q[1], q[2], 10); this.popup(b, 'BLOCK!'); if (b.isHuman) b.input.rumble(.5, .12);
      } else {
        this.L = Bl.make(t, [C.NET_X + b.dir * -1 * -3, q[1], q[2]], [b.dir * -1 * -40, v[1] * .2, 120], { kind: 'pass', side: b.side, by: b.idx });
        this.touches[b.side] = 1; this.lastWasBlock = true; G.sfx('block', { vol: .6 }); this.popup(b, 'TOUCH');
      }
      this.plan(); if (this.net && this.net.host) this.net.launch(this.L);
      return;
    }
    const nc = Bl.netCheck(L); if (!nc) return;
    const v = Bl.vel(L, t);
    if (L.forceTape || nc.kind === 'tape') {
      G.sfx('tape'); const over = L.forceTape || G.rng('match') < G.T.netCordOver;
      const nv = over ? [v[0] * .35, v[1] * .35, 60 + (G.rng('match') - .5) * 40] : [v[0] * -.3, v[1] * .3, 25];
      this.L = Bl.make(t, [C.NET_X + Math.sign(v[0]) * (over ? 2 : -2), nc.q[1], C.NET_H + Bl.R], nv, { kind: L.kind === 'serve' ? 'serve' : 'pass', side: L.side, by: L.by });
      this.L.netDone = true; this.L.tNet = null;
      if (over) { this.say('netcord'); this.setBanner('NET CORD!', .8); }
      this.plan(); if (this.net && this.net.host) this.net.launch(this.L);
    } else if (nc.kind === 'net') {
      G.sfx('net');
      if (L.kind === 'serve') return this.fault(L.side, 'serveNet');
      this.L = Bl.make(t, [C.NET_X - Math.sign(v[0]) * 3, nc.q[1], nc.q[2]], [v[0] * -.25, v[1] * .5, Math.max(10, v[2] * .3)], { kind: 'pass', side: L.side, by: L.by });
      this.L.tNet = null; this.L.netDone = true;
      this.plan(); if (this.net && this.net.host) this.net.launch(this.L);
    } else if (nc.kind === 'outside') return this.fault(L.side, L.kind === 'serve' ? 'serveOut' : 'antenna');
  }
  landed(L) {
    const p = L.land, s = Bl.sideOf(p[0]), inside = Bl.inCourt(p), by = this.players[L.by];
    G.sfx('sand'); G.fx.sand(p[0], p[1], 12);
    this.mark = { x: p[0], y: p[1], t: 2.5 };
    if (inside) {
      if (s === L.side) return this.pointTo(1 - s, L.kind === 'stuff' ? 'block' : 'in', by);
      const why = L.kind === 'serve' ? 'ace' : L.kind === 'spike' || L.kind === 'shot' || L.kind === 'dump' ? 'kill' : L.kind === 'stuff' ? 'block' : 'in';
      if (by && (why === 'ace')) by.stats.aces++; if (by && why === 'kill') by.stats.kills++;
      return this.pointTo(1 - s, why, by);
    }
    if (L.kind === 'serve') { if (by) by.stats.serveFaults++; return this.pointTo(1 - L.side, 'serveOut', null); }
    if (L.kind === 'spike' || L.kind === 'shot') { if (by) by.stats.attackErrors++; }
    if (L.kind === 'stuff') return this.pointTo(L.side, 'block', by);
    return this.pointTo(1 - L.side, 'out', null);
  }
  fault(side, why, p) {
    if (why === 'noServe' || why === 'serveNet' || why === 'serveOut') { if (this.server) this.server.stats.serveFaults++; this.say('serveFault'); }
    this.pointTo(1 - side, why, null);
  }
  pointTo(w, why, by) {
    if (this.phase !== 'rally' && this.phase !== 'toss') return;
    this.score[w]++; this.phase = 'dead'; this.phT = 0; this.lastWhy = why; this.lastWinner = w; this.lastBy = by;
    this.rallies++; this.longest = Math.max(this.longest, this.rallyTouches);
    if (by && (why === 'ace' || why === 'kill' || why === 'block') && by.side === w) by.stats.points++;
    for (const p of this.players) { p.plan = null; p.blockAt = null; }
    this.attackPlan = null;
    this.setBanner(G.Rules.CALLS[why] || 'POINT', 1.6, why);
    G.sfx('whistle');
    const homeWin = this.humanSide < 0 || w === this.humanSide; this.cheer = homeWin ? 1.4 : .6; if (!homeWin) this.groan = 1;
    G.sfx(homeWin ? 'crowdCheer' : 'crowdGroan');
    if (why === 'ace') { this.say('ace'); G.sting('ace'); } else if (why === 'kill' && this.L && this.L.spd > 360) this.say('spike'); else if (why === 'block') this.say('block');
    else if (why === 'out' || why === 'antenna' || why === 'netTouch' || why === 'double' || why === 'four') this.say('fault');
    if (w !== this.serveSide) this.serveSide = w;
    // set and match
    const won = G.Rules.setWon(this.score, this.to);
    if (won >= 0) {
      this.sets[won]++;
      if (this.sets[won] >= this.setsToWin) { this.over = true; this.winner = won; }
      else { this.setBanner('SET ' + (this.sets[0] + this.sets[1]) + ' TO ' + (won ? 'RIGHT' : 'LEFT'), 1.6); this.score = [0, 0]; }
    }
    const mp = !this.over && [0, 1].some(s => G.Rules.setPoint(this.score, this.to, s) && this.sets[s] + 1 >= this.setsToWin);
    if (mp && !this.matchPoint) { this.matchPoint = true; this.say('matchpoint'); G.sting('matchpoint'); const pos = G.game.audio.pos; if (pos && pos.bpm) G.game.audio.tempo(pos.bpm + 6); }
    if (!mp) this.matchPoint = false;
    // Lucky Seven: the first time the House reaches game point, Sonny's next attack dribbles over the tape
    if (this.specials.luckySeven && !this.luckyUsed) { const hs = this.players.find(p => p.id === 'sonny'); if (hs && G.Rules.setPoint(this.score, this.to, hs.side)) { this.luckyUsed = true; this.luckyArmed = true; } }
    G.game.audio.layer('rally', 0, 1);
    const big = why === 'ace' || why === 'block' || (this.L && this.L.spd > 400) || this.rallyTouches >= 8;
    this.ptsSinceReplay++;
    if (this.replays && big && this.ptsSinceReplay >= 3 && !this.over) { this.wantReplay = true; this.ptsSinceReplay = 0; }
    if (this.net && this.net.host) this.net.event({ ev: 'point', side: w, why, sc: this.score.slice(), sets: this.sets.slice() });
    G.bus.emit('point', { side: w, why, by, score: this.score.slice() });
  }
  celebrate() {
    const w = this.lastWinner, why = this.lastWhy, by = this.lastBy;
    for (const p of this.players) {
      const mate = this.players.find(q => q.side === p.side && q !== p);
      if (p.side === w) {
        if (by === p && (why === 'ace' || why === 'kill' || why === 'block') || (this.over && p === this.mvp())) { const c = G.CELEB[p.cast.celebrate] || G.CELEB.fistpump; p.setAct(c.move || 'cheer', c.dur, { pose: c.pose, hop: c.hop, flip: c.flip, expr: 'smile' }); }
        else if (mate) { p.home = [(p.x + mate.x) / 2 + (p.slot ? 4 : -4), (p.y + mate.y) / 2]; p.faceTo = Math.atan2(mate.y - p.y, mate.x - p.x); p.setAct('highfive', .8, { expr: 'smile' }); if (p.slot === 0) G.game.after(.45, () => { G.sfx('high_five'); G.fx.sparkle((p.x + mate.x) / 2, (p.y + mate.y) / 2, 30, 6); }); }
      } else {
        const k = G.rng('cosmetic'); p.setAct(k < .4 ? 'shrug' : k < .7 ? 'facepalm' : 'confused', 1.3, { expr: 'wince' });
      }
    }
    if (this.over) { for (const p of this.players) { if (p.side === w) p.setAct(p === this.mvp() ? ((G.CELEB[p.cast.celebrate] || {}).move || 'cheer') : 'cheer', 2.5, { pose: 'cheer', expr: 'smile', hop: 3, flip: p === this.mvp() && p.cast.celebrate === 'backflip' }); else p.setAct('sit', 2.5, { pose: 'kneel', expr: 'wince' }); } G.sting(this.humanSide < 0 || this.winner === this.humanSide ? 'win' : 'lose'); this.say('win'); }
  }
  mvp() { return this.players.slice().sort((a, b) => (b.stats.points * 3 + b.stats.kills * 2 + b.stats.aces * 2 + b.stats.blocks * 2 + b.stats.digs) - (a.stats.points * 3 + a.stats.kills * 2 + a.stats.aces * 2 + a.stats.blocks * 2 + a.stats.digs) || (b.side === this.winner) - (a.side === this.winner))[0]; }
  finish() {
    const mvp = this.mvp();
    this.result = { winner: this.winner, score: this.score.slice(), sets: this.sets.slice(), finalScore: this.lastSetScore || this.score.slice(), mvp: mvp.idx, longest: this.longest, rallies: this.rallies,
      players: this.players.map(p => ({ id: p.id, side: p.side, human: p.human, seat: p.seat, stats: Object.assign({}, p.stats) })), mode: this.mode };
    G.bus.emit('matchEnd', this.result);
    if (this.cfg.onEnd) this.cfg.onEnd(this.result, this);
  }
  /* ------------------------------------------------ the replay ------------------------------------------------ */
  record() {
    if (this.phase !== 'rally' && this.phase !== 'toss' && this.phase !== 'dead') { if (this.phase === 'serveSetup') this.replayBuf.length = 0; return; }
    this._rec = !this._rec; if (this._rec) return;   // 60 Hz
    this.replayBuf.push({ c: this.clock, b: this.ballPos, pl: this.players.map(p => ({ x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, f: p.facing, act: p.act, dive: p.dive })) });
    if (this.replayBuf.length > 360) this.replayBuf.shift();
  }
  startReplay() {
    const buf = this.replayBuf; if (buf.length < 30) return this.startServe();
    const end = buf[buf.length - 1].c, start = end - 3.2, frames = buf.filter(f => f.c >= start);
    this.replay = { frames, i: 0, t: frames[0].c, end, ball: frames[0].b, cam: this.camMode === 'court' ? 'servecam' : 'court' };
    this.phase = 'replay'; this.phT = 0; this.say('replay');
  }
  replayStep(dt) {
    const R = this.replay; R.t += dt * .4;
    while (R.i < R.frames.length - 1 && R.frames[R.i + 1].c <= R.t) R.i++;
    const f = R.frames[R.i]; R.ball = f.b; this.aclock = f.c;
    this.players.forEach((p, k) => { const s = f.pl[k]; p.x = s.x; p.y = s.y; p.z = s.z; p.vx = s.vx; p.vy = s.vy; p.facing = s.f; p.act = s.act; p.animate(dt * .4); });
    this.comment.update(dt);
    const skip = this.players.some(p => p.isHuman && p.input && (p.input.pressed('play') || p.input.pressed('confirm')));
    if (R.t >= R.end || skip) { this.replay = null; this.startServe(); }
    this.camera();
  }
  /* ------------------------------------------------ presentation ------------------------------------------------ */
  setBanner(text, dur = 1.4, why) { this.banner = { text, dur, t: 0, why }; }
  popup(p, q) { this.popups.push({ p, q, t: 0 }); }
  say(kind, text, who = 'sonny') {
    if (this.spectacle && G.attract && G.attract.quiet) return;
    const L = text || (kind && G.SONNY.commentary[kind] ? G.rpick('cosmetic', G.SONNY.commentary[kind]) : null); if (!L) return;
    this.comment.say(L, who);
  }
  camera() {
    const g = G.game, C = G.COURT, mode = this.replay ? this.replay.cam : this.camMode;
    const humans = this.players.filter(p => p.human); const sideCam = humans.length && humans.every(p => p.side === humans[0].side) ? humans[0].side : 0;
    const view = mode === 'court' ? G.VIEW_COURT : G.VIEW_SERVE[sideCam];
    if (g.view.id !== view.id) g.setView(view);
    const b = this.ballPos || [C.NET_X, C.CY, 20];
    if (mode === 'court') {
      const pts = this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 30 })).concat([{ x: b[0], y: b[1], z: b[2] }, { x: C.NET_X, y: C.Y0 - 30, z: 60 }, { x: C.X0 + 4, y: C.Y1 + 4, z: 0 }, { x: C.X1 - 4, y: C.Y1 + 4, z: 0 }]);
      g.cam.smooth = .22; g.cam.frame(pts, { margin: 10, zoom: [.74 * G.T.cameraZoomMul, .98 * G.T.cameraZoomMul] });
    } else { g.cam.frame(null); g.cam.smooth = .25; g.setZoom(.66 * G.T.cameraZoomMul); g.focus(lerp(C.NET_X, b[0], .25) + (sideCam ? 24 : -24), C.CY, 18); }
  }
  /** Pepper's tips in the welcome match */
  tutorialStep() {
    const T = this.tutorial, me = this.players.find(p => p.isHuman && p.input); if (!me) return;
    const tip = k => { if (T.shown[k]) return; T.shown[k] = true; G.tipCard(G.fillTips(G.PEPPER.tips[k], me.input), 6); };
    if (this.phase === 'rally' && me.plan) tip(me.plan.kind === 0 ? 'receive' : me.plan.kind === 1 ? 'set' : 'spike');
    if (this.phase === 'serveSetup' && this.server === me) tip('serve');
    if (this.phase === 'rally' && this.attackPlan && this.attackPlan.side !== me.side) tip(Math.abs(me.x - G.COURT.NET_X) < 50 ? 'block' : 'dive');
    if (this.score[0] + this.score[1] >= 3) tip('call'); if (this.score[0] + this.score[1] >= 5) tip('chem');
  }
  /* ------------------------------------------------ drawing ------------------------------------------------ */
  draw(r) {
    const C = G.COURT, map = G.courtMap(), night = this.tod === 'night';
    G.backdrop(this.tod, this.weather).draw(r);
    map.drawFloor(r);
    G.drawCourtSet(r, this, night);
    // the ball mark
    if (this.mark && (this.phase === 'dead' || this.phase === 'point')) r.shadow(this.mark.x, this.mark.y, 4, .3, '#8a6a3a');
    // timing rings and the mouse reticle
    const t = this.clock;
    for (const p of this.players) {
      const pl = p.plan; if (!pl || !p.isHuman || p.pressed || G.setting('ring') === false) continue;
      if (this.glare && this.glare.t >= 0 && !(p.rig.acc || []).some(a => G.ITEMS[a] && G.ITEMS[a].shades) && this.L && this.L.kind === 'serve') continue;
      const left = pl.t - t, w = G.windows(); if (left > .8 || left < -w.ok) continue;
      const rad = p.reach * .6 + Math.max(0, left / .8) * 16, gold = Math.abs(left) <= w.perfect * 1.5;
      r.groundRing(pl.P[0], pl.P[1], rad, gold ? '#ffd36a' : '#ffffff');
      r.groundRing(pl.P[0], pl.P[1], Math.max(2, rad - 2), p.color || (gold ? '#ff9e5e' : '#9fd3d6'));
      if (left < .35 && left > -.05) r.queue(p.x, p.y, p.z + 46 * p.rig.o.size / 1.25, g => { const [sx, sy] = r.w(p.x, p.y, p.z + 46 * p.rig.o.size / 1.25); px.rect(g, Math.round(sx) - 1, Math.round(sy) - 8, 3, 6, '#ffd36a'); px.rect(g, Math.round(sx) - 1, Math.round(sy), 3, 2, '#ffd36a'); }, { bias: 40 });
    }
    const mp = this.players.find(p => p.idx === this.mouseOwner);
    if (mp && mp.isHuman && G.mouseAim && G.game.input.mouse && G.game.input.clock - (G.game.input.mouse.t || -99) < 4 && (this.phase === 'rally' || this.phase === 'toss' || this.phase === 'serveSetup')) {
      const mg = G.game.mouseGround && G.game.mouseGround();
      if (mg && (mp.side === 0 ? mg[0] > C.NET_X : mg[0] < C.NET_X)) { r.groundRing(mg[0], mg[1], 6, '#ff5f7a'); r.groundRing(mg[0], mg[1], 2, '#ff5f7a'); }
    }
    if (this.phase === 'toss' || this.phase === 'serveSetup') { const sv = this.server; if (sv && sv.isHuman && this.phase === 'toss') { const a = sv.aimPoint('serve'); r.groundRing(a[0], a[1], 5, '#ffd36a'); } }
    // players
    for (const p of this.players) {
      r.shadow(p.x, p.y, 7 - Math.min(3, p.z * .1), .35);
      r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), { key: p });
      if (p.human && p.color && (this.players.filter(q => q.human).length > 1 || G.inHub())) { r.groundRing(p.x, p.y, 8, p.color); r.textAt(p.x, p.y, p.z + 56 * p.rig.o.size / 1.25, p.name, p.color); }
      if (p.callT > 0 && p.callText) G.bubble(r, p.x, p.y, p.z + 50 * p.rig.o.size / 1.25, p.callText, p.call === 'yours' ? '#9fd3d6' : '#ffd36a');
    }
    // the ball and its shadow
    const b = this.ballPos;
    if (b) {
      r.shadow(b[0], b[1], 4 - Math.min(2, b[2] * .03), .45);
      const spin = Math.floor((this.aclock * (this.L ? 14 : 2))) % 3;
      r.sprite(b[0], b[1], b[2] - 4, G.BALL_SPR[spin], { anchor: 'center' });
      if (this.glare && this.glare.t >= 0 && this.clock - this.glare.t < .7) { const sv = this.server; r.queue(sv.x, sv.y, sv.z + 40, g => { const [sx, sy] = r.w(sv.x, sv.y, sv.z + 42 * sv.rig.o.size / 1.25); px.blend(g, .8, 'add', () => { px.rect(g, Math.round(sx) - 6, Math.round(sy), 13, 1, '#fff3c0'); px.rect(g, Math.round(sx), Math.round(sy) - 6, 1, 13, '#fff3c0'); px.disc(g, sx, sy, 2, '#ffffff'); }); }, { bias: 60, emissive: true }); }
    }
    // judgement popups
    for (const q of this.popups) { const p = q.p, col = q.q === 'PERFECT' ? '#ffd36a' : q.q === 'GREAT' ? '#5ff0ff' : q.q === 'MISS' ? '#a0a0a8' : q.q === 'BLOCK!' ? '#ff5f7a' : '#ffffff'; r.textAt(p.x, p.y, p.z + 58 * p.rig.o.size / 1.25 + q.t * 14, q.q + (q.q === 'PERFECT' ? '!' : ''), col); }
    if (night) for (const [x, y] of [[180, 120], [524, 120], [180, 280], [524, 280]]) G.game.lights.add(x, y, 70, 200, .9, { color: '#fff4d8' });
    this.drawHud(r);
  }
  drawHud(r) {
    const C = G.COURT, me = this.players.find(p => p.isHuman && p.input), I = me ? me.input : G.game.input;
    r.overlay(g => {
      // the TV score bug
      const x0 = Math.round(r.W * .04), y0 = Math.round(r.H * .04);
      E.ui.box(g, x0, y0, 150, 38, { bg: ['#0a2d3d', '#061a24'], border: '#f6d38a', alpha: .92 });
      for (let s = 0; s < 2; s++) {
        const yy = y0 + 4 + s * 17, ps = this.players.filter(p => p.side === s);
        ps.forEach((p, k) => G.portrait(g, p.id, x0 + 4 + k * 15, yy, 14, { frame: false }));
        E.font.text(g, ps.map(p => p.name).join(' & ').slice(0, 18), x0 + 36, yy + 3, s === this.serveSide ? '#fff8e8' : '#9fd3d6', { shadow: '#000', outline: false });
        E.font.text(g, String(this.score[s]), x0 + 132, yy + 1, '#ffd36a', { scale: 2, shadow: '#000', outline: false, align: 'right' });
        if (s === this.serveSide) { px.disc(g, x0 + 140, yy + 7, 3, '#f8f8f4'); px.dot(g, x0 + 139, yy + 6, '#2a6ad8'); }
        if (this.setsToWin > 1) for (let k = 0; k < this.sets[s]; k++) px.rect(g, x0 + 30, yy + 2 + k * 4, 3, 3, '#ff9e5e');
      }
      if (this.matchPoint) { E.ui.box(g, x0, y0 + 40, 70, 12, { bg: '#c8202c', border: '#ffd36a' }); E.font.text(g, 'MATCH POINT', x0 + 5, y0 + 42, '#ffffff', { outline: false }); }
      // top right: the clock (vacation) or the hub's
      const cx = Math.round(r.W * .96) - (G.game.cornerArea() ? 40 : 0);
      if (G.state && this.mode !== 'exhibition' && this.mode !== 'attract') G.UI.clock(g, cx, y0, G.state.day, G.state.slot, G.state.weather[G.state.day - 1], 'right');
      else if (this.net && this.net.timeLeft) { const s = this.net.timeLeft(); if (s !== null) { const tx = Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); E.ui.box(g, cx - 44, y0, 44, 15, { bg: G.THEMES.day.bg, border: '#f6d38a' }); E.font.text(g, tx, cx - 22, y0 + 4, '#fff8e8', { align: 'center', outline: false }); } }
      // bottom left: the partner card
      if (this.partnerAff !== null && me) {
        const mate = this.players.find(p => p.side === me.side && p !== me);
        if (mate) { const by = Math.round(r.H * .96) - 30; E.ui.box(g, x0, by, 96, 30, { bg: G.THEMES.day.bg, border: '#f6d38a', alpha: .9 }); G.portrait(g, mate.id, x0 + 3, by + 3, 24, { frame: false }); E.font.text(g, mate.name, x0 + 31, by + 4, '#fff8e8', { shadow: '#000', outline: false }); G.UI.hearts(g, x0 + 31, by + 15, this.partnerAff); }
      }
      // the call banner
      if (this.banner) { const B = this.banner, k = Math.min(1, B.t * 6), w = E.font.width(B.text, { scale: 3 }) + 20, y = Math.round(r.H * .3);
        px.blend(g, .75 * k, 'normal', () => px.rect(g, 0, y - 6, r.W, 34, '#081820'));
        E.font.title(g, B.text, r.W / 2, y, { scale: 3, colors: B.why === 'ace' || B.why === 'kill' || B.why === 'block' ? ['#fff7d6', '#ffd36a', '#ff9e5e'] : ['#ffffff', '#c8e8f0', '#7ab0c8'], align: 'center', depth: 2 }); }
      if (this.phase === 'intro') { E.font.title(g, this.cfg.title || 'BEACH MATCH', r.W / 2, Math.round(r.H * .22), { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 }); if (this.cfg.subtitle) E.font.text(g, this.cfg.subtitle, r.W / 2, Math.round(r.H * .22) + 22, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); }
      if (this.replay) { px.rect(g, 0, 0, r.W, 18, '#000000'); px.rect(g, 0, r.H - 18, r.W, 18, '#000000'); E.font.text(g, 'REPLAY', 10, 5, '#ff5f7a', { scale: 1, outline: false }); px.disc(g, 50, 9, 3, Math.floor(G.game.real * 2) % 2 ? '#ff2a2a' : '#5a0a0a'); }
    });
    this.comment.draw(r);
    // context prompts (at most three)
    if (me && !this.replay && this.phase !== 'end') {
      let list = [];
      if (this.phase === 'serveSetup' && this.server === me) list = [['play', 'Float serve'], ['shot', 'Jump serve']];
      else if (this.phase === 'toss' && this.server === me) list = [['play', 'Hit at the top!']];
      else if (this.phase === 'rally') {
        const pl = me.plan;
        if (pl) list = [['play', ['Bump', 'Set', 'Spike'][pl.kind]], ['shot', ['Free ball', 'Dump', 'Shot'][pl.kind]], ['dive', 'Dive']];
        else if (this.attackPlan && this.attackPlan.side !== me.side) list = [['shot', 'Block'], ['dive', 'Dive'], ['call', 'Call']];
        else list = [['call', me.call === 'auto' ? 'Call' : me.call === 'mine' ? 'Mine' : 'Yours'], ['dive', 'Dive']];
      } else if (this.phase === 'intro') list = [['play', 'Skip']];
      if (list.length) G.promptBar(r, list, I);
    }
  }
};
/** the court's set dressing: bleachers with a crowd, the DJ booth, the scorer's table and flip scoreboard, umbrellas, the
 *  tiki bar, the lifeguard tower; at night torches and floodlights; the net */
G.drawCourtSet = (r, M, night) => {
  const C = G.COURT, t = G.game.real;
  r.shape('bleacher', 300, 96, 0, { facing: Math.PI / 2 }); r.shape('bleacher', 404, 96, 0, { facing: Math.PI / 2 });
  r.shape('djbooth', 470, 104, 0, { facing: Math.PI / 2 }); r.shape('scoreboard', 352, 108, 0, { facing: Math.PI / 2 });
  r.shape('umbrella', 196, 104, 0, { mats: { a: 'aoa_canvasT' } }); r.shape('lounger', 186, 120, 0, { facing: Math.PI / 2 });
  r.shape('umbrella', 532, 100, 0, { mats: { a: 'aoa_canvasY' } }); r.shape('lounger', 544, 116, 0, { facing: Math.PI / 2 });
  r.shape('tikibar', 104, 168, 0, { facing: 0 }); r.shape('lifeguard', 610, 170, 0, { facing: Math.PI });
  r.shape('surfrack', 640, 230, 0, { facing: Math.PI }); r.shape('changinghut', 90, 250, 0, { facing: 0 });
  r.shape('beachtowel', 300, 300, 0); r.shape('cooler', 324, 298, 0); r.shape('sandcastle', 420, 306, 0); r.shape('beachtowel', 458, 300, 0, { mats: { t: 'aoa_canvasB' } });
  r.prop('palm', 40, 110, 0, { size: 1.6 }); r.prop('palm', 664, 100, 0, { size: 1.7 }); r.prop('palm', 30, 330, 0, { size: 1.5 }); r.prop('palm', 676, 330, 0, { size: 1.6 });
  if (M && M.cfg && M.cfg.final) { r.shape('banner', 250, 116, 0, { facing: Math.PI / 2 }); r.shape('banner', 454, 116, 0, { facing: Math.PI / 2 }); }
  if (night) { for (const [x, y] of [[190, 140], [514, 140], [190, 270], [514, 270]]) r.shape('torchpost', x, y, 0, { light: true }); r.shape('floodlight', 160, 112, 0, { light: true }); r.shape('floodlight', 548, 112, 0, { light: true }); }
  // the crowd on the bleachers: they sway, jump on points and slump on errors
  if (M) for (const f of M.crowd) {
    const up = M.cheer > 0 ? Math.abs(Math.sin(t * 10 + f.ph)) * 5 * Math.min(1, M.cheer) : M.groan > 0 ? -1 : Math.sin(t * 2 + f.ph) * .6;
    r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 6, 5, 6, f.shirt); px.rect(g, X - 1, Y - 9, 3, 3, f.skin); if (M.cheer > .3) { px.rect(g, X - 3, Y - 11, 1, 3, f.skin); px.rect(g, X + 3, Y - 11, 1, 3, f.skin); } });
  }
  // Sonny at his booth, Pepper at the scorer's table (when they aren't playing)
  if (M && !M.players.some(p => p.id === 'sonny')) { const sr = G.hostRig('sonny'); sr.update(1 / 60, { x: 470, y: 112, z: 0, facing: Math.PI / 2, pose: M.cheer > .5 ? 'cheer' : null, expr: M.cheer > .5 ? 'shout' : 'smile' }); r.actor(470, 112, 0, (g, ox, oy) => sr.draw(g, ox, oy, r.view), { every: 2, key: sr }); }
  if (M && !M.players.some(p => p.id === 'pepper')) { const pr = G.hostRig('pepper'); pr.update(1 / 60, { x: 384, y: 114, z: 0, facing: Math.PI / 2 }); r.actor(384, 114, 0, (g, ox, oy) => pr.draw(g, ox, oy, r.view), { every: 2, key: pr }); }
  G.drawNet(r);
};
G.hostRigs = {};
G.hostRig = id => G.hostRigs[id] || (G.hostRigs[id] = G.anim.rig(G.makeRig(id)));
G.drawNet = r => {
  const C = G.COURT, y0 = C.Y0 - 10, y1 = C.Y1 + 10, segs = 8;
  r.shape('netpost', C.NET_X, y0, 0); r.shape('netpost', C.NET_X, y1, 0);
  for (let k = 0; k < segs; k++) {
    const ya = C.Y0 - 10 + (y1 - y0) * k / segs, yb = C.Y0 - 10 + (y1 - y0) * (k + 1) / segs, ym = (ya + yb) / 2;
    r.queue(C.NET_X, ym, 0, g => {
      const a0 = r.w(C.NET_X, ya, 28), a1 = r.w(C.NET_X, yb, 28), b0 = r.w(C.NET_X, ya, C.NET_H), b1 = r.w(C.NET_X, yb, C.NET_H);
      px.blend(g, .45, 'normal', () => px.poly(g, [a0, a1, b1, b0], '#1a2030'));
      for (let m = 0; m <= 4; m++) { const u = m / 4, p0 = [lerp(a0[0], a1[0], u), lerp(a0[1], a1[1], u)], p1 = [lerp(b0[0], b1[0], u), lerp(b0[1], b1[1], u)]; px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a3040'); }
      for (let m = 0; m <= 3; m++) { const u = m / 3, p0 = [lerp(a0[0], b0[0], u), lerp(a0[1], b0[1], u)], p1 = [lerp(a1[0], b1[0], u), lerp(a1[1], b1[1], u)]; px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a3040'); }
      px.line(g, b0[0], b0[1], b1[0], b1[1], '#f4f4f0', 2); px.line(g, a0[0], a0[1], a1[0], a1[1], '#f4f4f0', 1);
      if (k === 1 || k === segs - 2) { const yA = k === 1 ? C.Y0 : C.Y1, q0 = r.w(C.NET_X, yA, C.NET_H), q1 = r.w(C.NET_X, yA, 62); px.line(g, q0[0], q0[1], q1[0], q1[1], '#ff3a3a', 1); px.dot(g, q1[0], q1[1] + 2, '#ffffff'); }
    }, { solid: true });
  }
};
/** Sonny's commentary: a small box bottom right with his portrait, typed with his voice, gone after a few seconds */
G.Commentary = class {
  constructor(on) { this.on = on; this.cur = null; this.q = []; }
  say(text, who = 'sonny') { if (!this.on) return; if (this.cur && this.cur.text === text) return; this.q.push({ text, who }); if (this.q.length > 2) this.q.shift(); }
  update(dt) {
    if (!this.cur && this.q.length) { this.cur = Object.assign(this.q.shift(), { t: 0, shown: 0, hook: null }); this.cur.hook = G.voice.hook(this.cur.who); }
    const c = this.cur; if (!c) return;
    const prev = Math.floor(c.shown); c.shown = Math.min(c.text.length, c.shown + dt * G.T.textSpeed * 1.3); c.t += dt;
    for (let n = prev; n < Math.floor(c.shown); n++) c.hook(c.text[n], n, c.text);
    if (c.shown >= c.text.length && c.t > c.text.length / (G.T.textSpeed * 1.3) + 2.2) this.cur = null;
  }
  draw(r) {
    const c = this.cur; if (!c) return;
    r.overlay(g => {
      const w = Math.min(200, Math.round(r.W * .46)), lines = E.font.wrap(c.text.slice(0, Math.floor(c.shown)), w - 40), h = 34, x = Math.round(r.W * .96) - w, y = Math.round(r.H * .96) - h - 18;
      E.ui.box(g, x, y, w, h, { bg: ['#2a1240', '#12081e'], border: '#ffd36a', alpha: .92 });
      G.portrait(g, c.who, x + 4, y + 4, 26, { frame: false });
      E.font.text(g, G.CAST[c.who].short.toUpperCase(), x + 34, y + 3, G.CAST[c.who].color || '#ffd36a', { outline: false });
      lines.slice(0, 2).forEach((l, k) => E.font.text(g, l, x + 34, y + 12 + k * 9, '#fff8e8', { outline: false, shadow: '#000' }));
    });
  }
};
/** Pepper's tutorial cards: a non-modal panel at the left */
G.tips = [];
G.tipCard = (text, sec = 6) => { G.tips = [{ text, t: 0, sec }]; };
G.drawTips = r => {
  const tp = G.tips[0]; if (!tp) return; tp.t += 1 / 60; if (tp.t > tp.sec) { G.tips.shift(); return; }
  r.overlay(g => {
    const w = Math.min(190, Math.round(r.W * .45)), lines = E.font.wrap(tp.text, w - 36), h = 16 + lines.length * 9, x = Math.round(r.W * .04), y = Math.round(r.H * .2);
    E.ui.box(g, x, y, w, h, { bg: G.THEMES.day.bg, border: '#ff9e5e', alpha: .94 });
    G.portrait(g, 'pepper', x + 4, y + 4, 24, { frame: false });
    E.font.text(g, 'PEPPER\'S TIP', x + 32, y + 3, '#ff9e5e', { outline: false });
    lines.forEach((l, k) => E.font.text(g, l, x + 32, y + 12 + k * 9, '#fff8e8', { outline: false, shadow: '#000' }));
  });
};
