/* 21-rules: the Match class and its referee. The rally is a chain of launches; each contact is planned on the side the
 * ball is heading to, judged (human press or AI roll), and turns into a new launch. Players, AI and presentation are
 * mixed into G.Match.prototype by 22-players.js, 23-ai.js and 24-match.js. */
G.Match = class {
  constructor(o) {
    const C = G.C;
    this.o = o;
    this.G = G;
    this.t = 0;                         // match clock (seconds), advances with game time
    this.players = [];
    this.score = [0, 0]; this.sets = [0, 0]; this.setNo = 1;
    this.pointsToWin = o.pointsToWin || 7; this.setsToWin = o.setsToWin || 1; this.winBy = 2;
    this.phase = 'intro'; this.phaseT = 0;
    this.L = null;                      // the live launch
    this.touches = [0, 0];              // touches by each side on this crossing
    this.lastTouch = null;              // { side, p, kind, t }
    this.pending = null;                // the planned contact
    this.serveSide = o.serveSide === undefined ? 0 : o.serveSide;
    this.server = null; this.servePos = null; this.serveT = 0; this.tossL = null; this.tossPress = null;
    this.stats = { rallies: 0, longest: 0, rallyLen: 0, points: [0, 0] };
    this.events = [];                   // { t, kind, text } for commentary and replays
    this.rng = G.rngFn('match');
    this.court = o.court || 'sunset';
    this.pointLog = [];
    this.over = false; this.winner = null;
    this.matchPoint = [false, false];
    this.pointMsgT = 0; this.callText = null; this.dead = null;
    this.blockers = {};                 // side -> player with a block press
    this.lastFault = null;
    this.serveCount = 0;
    this.cordT = null;
  }
  /* the side of a ground x: 0 for the left court, 1 for the right */
  sideOf(x) { return x < G.C.NET_X ? 0 : 1; }
  opp(side) { return 1 - side; }
  /* start a launch: the one place a ball gets a new flight */
  launch(o) {
    const L = G.launchMake(o);
    this.L = L;
    this.touchAt = this.t;
    this.events.push({ t: this.t, kind: 'launch', kind2: L.kind });
    if (this.events.length > 40) this.events.shift();
    return L;
  }
  ballPos(t) { return this.L ? G.flightAt(this.L, t === undefined ? this.t : t) : null; }
  /* the contact planner: who will play the ball next, and when, on side D */
  planFor(side) {
    this.pending = null;
    const L = this.L; if (!L) return;
    const C = G.C, r = C.RB;
    const touchNo = this.touches[side];
    if (touchNo >= 3) return;
    const h = touchNo === 0 ? 18 : touchNo === 1 ? 40 : 58;
    const tEnd = L.tLand !== null ? L.tLand : this.t + 8;
    let tStart = this.t;
    if (L.tNet !== null && L.tNet > this.t && this.sideOf(L.p[0]) !== side) tStart = Math.max(tStart, L.tNet);
    if (this.sideOf(L.p[0]) !== side && L.tNet === null) return;
    let best = null;
    for (const p of this.players) {
      if (p.side !== side || p.down || (p.missedId !== undefined && p.missedId === L.id)) continue;
      if (this.lastTouch && this.lastTouch.p === p && this.lastTouch.side === side && !this.lastTouch.blocked) continue;
      let ts = G.timeAtHeight(L, h, tStart);
      let dig = false;
      if (ts === null || ts > tEnd) {
        if (L.tLand !== null && L.tLand > tStart) { ts = Math.max(tStart, L.tLand - .05); dig = true; } else continue;
      }
      if (ts < this.t - .05) ts = this.t + .02;
      const P = G.flightAt(L, ts);
      if (P.z > 70) continue;
      const dist = Math.hypot(P.x - p.x, P.y - p.y);
      const reach = Math.max(0, dist - G.T.reach);
      const arrive = this.t + reach / (G.T.runSpeed * (.86 + .03 * p.stat('SPD')));
      const late = arrive - ts;   // positive when the player cannot get there
      const cand = { p, ts, P: [P.x, P.y, P.z], arrive, late, dig, kind: ['bump', 'set', 'attack'][touchNo] || 'attack', h, side, touchNo };
      const score = late + (p.human && this.callFor(p) === 'yours' ? .4 : 0) + (p.human && this.callFor(p) === 'mine' ? -.3 : 0);
      if (!best || score < best.score) { best = cand; best.score = score; }
    }
    if (!best) return;
    // the partner covers a human's ball when the human cannot get there in time
    const partner = this.players.find(q => q.side === side && q !== best.p && !q.down);
    if (partner && best.p.human && best.late > .05 && partner) { /* the partner goes; handled by the AI's cover logic */ }
    best.pid = best.p.id;
    this.pending = best;
    best.p.planned = best;
  }
  callFor(p) { return p.call || 'auto'; }
  /* the touch resolved: a new launch, from where the ball was */
  touch(p, P, kind, q, aim, o) {
    o = this.specialTouch(p, kind, o || {});
    const side = p.side, C = G.C, sp = G.T.spikeSpeed;
    const qm = G.QUAL[q] || G.QUAL.ok;
    this.touches[side]++;
    this.lastTouch = { side, p, kind, t: this.t, blocked: !!o.blocked };
    this.lastKind = kind;
    this.pending = null;
    p.planned = null; p.lastHit = this.t;
    const from = [P[0], P[1], P[2]];
    let target, T, v;
    const inv = aim || { x: 0, y: 0 };
    const jitter = () => { const rr = qm.r; return [(G.rng('match') * 2 - 1) * rr, (G.rng('match') * 2 - 1) * rr]; };
    const oppSide = this.opp(side);
    const deepX = oppSide === 1 ? C.X1 - 24 : C.X0 + 24;
    const shortX = oppSide === 1 ? C.NET_X + 36 : C.NET_X - 36;
    const midX = oppSide === 1 ? C.NET_X + 80 : C.NET_X - 80;
    const lineY = inv.y < -.4 ? C.Y0 + 14 : inv.y > .4 ? C.Y1 - 14 : C.CY;
    if (kind === 'bump' || kind === 'dig') {
      // the pass goes to the net area on our side: setter's spot
      const tx = side === 0 ? C.NET_X - 40 : C.NET_X + 40;
      target = [tx, C.CY + (inv.y * 22), 40];
      T = G.T.passT;
      if (o.free) { target = [oppSide === 1 ? deepX : deepX, lineY, 10]; T = G.T.shotT + .25; }
    } else if (kind === 'set') {
      const ax = side === 0 ? C.NET_X - 22 : C.NET_X + 22;
      const hitter = this.pickHitter(side, p);
      const ay = hitter ? hitter.y : C.CY;
      target = [ax, ay, 62];
      T = o.quick ? .75 : o.back ? G.T.setT + .1 : G.T.setT;
      if (o.dump) { target = [shortX, lineY, 12]; T = .6; }
    } else if (kind === 'attack' || kind === 'spike') {
      if (o.shot) {
        target = [o.deep ? deepX : shortX, lineY, 6];
        T = G.T.shotT;
      } else {
        const zx = inv.x > .4 ? deepX : inv.x < -.4 ? shortX : midX;
        target = [zx, lineY, 4];
        const dx = Math.abs(target[0] - from[0]);
        T = Math.max(.25, dx / (sp * (.85 + .035 * p.stat('POW')) * qm.s * Math.cos(Math.PI / 12)));
      }
    } else if (kind === 'serve' || kind === 'jump') {
      const jump = kind === 'jump';
      target = [o.tx, o.ty, 4];
      T = jump ? G.T.jumpServeT : G.T.serveT;
    }
    target = [target[0] + jitter()[0] * (o.scatter || 1), target[1] + jitter()[1] * (o.scatter || 1), target[2]];
    if (kind === 'free') { T = 1.2; }
    v = G.aimVel(from, target, T, G.T.ballGravity, G.T.ballDrag);
    // the spike has to clear the net: lower its arc, or on Easy raise it
    let L = G.launchMake({ t0: this.t, p: from, v, kind: kind === 'spike' ? 'spike' : kind, side, by: p });
    if (kind === 'spike' || kind === 'attack') {
      if (L.tNet !== null && G.netOutcome(L) !== 'clear') {
        const assist = G.DIFFICULTY[this.o.difficulty] ? G.DIFFICULTY[this.o.difficulty].spikeAssist : 'near';
        const miss = G.netOutcome(L);
        if (assist === 'always' || (assist === 'near' && L.netZ - G.C.RB < G.C.NET_H + 4 && miss !== 'antenna')) {
          // raise the arc just enough: aim above the net
          for (let tries = 0; tries < 12; tries++) {
            target[2] += 4;
            v = G.aimVel(from, target, T, G.T.ballGravity, G.T.ballDrag);
            L = G.launchMake({ t0: this.t, p: from, v, kind: 'spike', side, by: p });
            if (L.tNet !== null && G.netOutcome(L) === 'clear') break;
          }
        }
      }
    }
    this.L = L;
    this.touchAt = this.t;
    this.stats.rallyLen++;
    if (kind === 'serve' || kind === 'jump') this.serveCount = (this.serveCount || 0) + 1;
    if (this.stats.points[0] + this.stats.points[1] >= 1) this.tipFor('chem');
    p.stats.touches = (p.stats.touches || 0) + 1;
    G.bus.emit('touch', { p, kind, q, side });
    if (q === 'perfect') this.flash = { t: this.t };
    if (kind === 'spike' || kind === 'attack') p.stats.spikes = (p.stats.spikes || 0) + 1;
    // the ball's destination
    if (L.tNet !== null && L.tNet < (L.tLand !== null ? L.tLand : 1e9)) {
      const dest = this.opp(side);
      // a crossing resets the receiving side's touches
      this.touches[dest] = 0;
      this.crossed = { t: L.tNet, to: dest, by: side };
      this.planFor(dest);
      this.lastTouchSideForNet = side;
    } else {
      this.planFor(side);
    }
    return L;
  }
  pickHitter(side, setter) {
    const others = this.players.filter(q => q.side === side && q !== setter && !q.down);
    if (!others.length) return setter;
    return others.reduce((a, b) => (Math.abs(a.y - G.C.CY) > Math.abs(b.y - G.C.CY) ? a : b));
  }
  /* the referee: decides a point and starts the point's phases */
  point(side, why, detail) {
    if (this.phase === 'point' || this.phase === 'over') return;
    const won = side;
    this.score[won]++;
    this.stats.points[won]++;
    if (this.stats.rallyLen > this.stats.longest) this.stats.longest = this.stats.rallyLen;
    this.stats.rallies++;
    const lastP = this.lastTouch && this.lastTouch.p;
    this.pointLog.push({ won, why, detail, lastP: lastP ? lastP.id : null, kind: this.lastTouch ? this.lastTouch.kind : null, rally: this.stats.rallyLen, t: this.t });
    if (lastP && won === lastP.side) { lastP.stats.points = (lastP.stats.points || 0) + 1; }
    if (why === 'ace') { const sp = this.server; if (sp) sp.stats.aces = (sp.stats.aces || 0) + 1; }
    const wp = this.players.find(q => q.side === won && q.ai === false) || this.players.find(q => q.side === won);
    if (wp && wp.cast.voice) G.bark('Yeah!', wp.cast.voice);
    if (why === 'kill' && lastP) lastP.stats.kills = (lastP.stats.kills || 0) + 1;
    if (why === 'block' && this.lastBlocker) this.lastBlocker.stats.blocks = (this.lastBlocker.stats.blocks || 0) + 1;
    if (why === 'serveFault' || why === 'serveNet') { const sp = this.server; if (sp) sp.stats.serveFaults = (sp.stats.serveFaults || 0) + 1; }
    this.stats.rallyLen = 0;
    this.phase = 'point'; this.phaseT = 0;
    this.pendingPoint = { won, why, detail };
    this.L = null; this.pending = null;
    G.bus.emit('point', { won, why, detail, score: this.score.slice() });
    this.onPoint && this.onPoint(won, why, detail);
    this.maybeReplay && this.maybeReplay(why);
    for (const p of this.players) { p.act = p.side === won ? (this.players.filter(q => q.side === won).length === 2 ? 'highfive' : 'celebrate') : 'sad'; p.actT = 0; }
    if (this.players.filter(q => q.side === won).length === 2) G.sfx('high_five');
    this.callOut(why, won, lastP);
    const sets = this.checkSet(won);
    if (sets) this.endSet(won);
  }
  callOut(why, won, lastP) {
    const ck = { ace: 'ace', kill: 'spike', block: 'block', net: 'net', out: 'out', antenna: 'net', serveFault: 'fault', land: 'spike', tape: 'net' }[why];
    if (ck) this.commentate(ck);
    if (this.score[won] >= this.pointsToWin - 1 && this.score[won] > this.score[1 - won]) this.commentate('matchpoint');
    const map = { ace: 'ACE!', kill: 'KILL!', block: 'BLOCK!', out: 'OUT!', net: 'NET!', antenna: 'ANTENNA', fourth: '4 TOUCHES', double: 'DOUBLE TOUCH', netTouch: 'NET TOUCH', serveFault: 'SERVE FAULT', serveNet: 'NET!', land: 'IN!', tape: 'TAPE!', dig: 'DIG!', cord: 'TAPE!', timeout: 'TIME!' };
    this.callText = { text: map[why] || 'POINT', t: 1.6, side: won, why };
  }
  checkSet(won) {
    const need = this.pointsToWin;
    const a = this.score[won], b = this.score[1 - won];
    const lead = a - b;
    if (a >= need && lead >= this.winBy) return true;
    if (a >= need + 4 || (a >= need && a === need + 1 && b === need)) return true;   // hard cap
    if (a >= need && b <= need && a > need && a - b >= 2) return true;
    return false;
  }
  endSet(won) {
    this.sets[won]++;
    this.setWinner = won;
    if (this.sets[won] >= this.setsToWin) { this.over = true; this.winner = won; }
    this.pendingSetEnd = true;
  }
  /* a new serve: the server is the player of the team whose turn it is, rotating */
  pickServer(side) {
    const team = this.players.filter(p => p.side === side);
    const last = this.lastServer && this.lastServer[side];
    let s = team.find(p => p !== last) || team[0];
    if (!this.lastServer) this.lastServer = [null, null];
    this.lastServer[side] = s;
    return s;
  }
};
G.QUAL = { perfect: { s: 1.12, r: 4, name: 'PERFECT' }, great: { s: 1, r: 10, name: 'GREAT' }, ok: { s: .85, r: 20, name: 'OK' }, stretch: { s: .8, r: 30, name: 'STRETCH' }, miss: { s: .6, r: 40, name: 'MISS' } };
