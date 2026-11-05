/* ---- THE ARCADE LAYER (Kerfuffle rules; off is "purist arcade": no items, specials or chaos).
 * Hype (the Kerfuffle meter, 0-100 per team): six +25, target +30, four +15, three runs +10, PERFECT +8; wicket +30,
 * maiden +20, screamer +15, direct hit +15, beaten +8, dot +6; chaos moments +5; x hypeGain. Full: the special.
 * ON FIRE: a batter's fireStreak boundaries in a row (timing x1.5, power x1.2) until a dot, a wicket or 6 balls; a
 * bowler's 3 dots or wickets in a row (pace +10%, edges x1.4) until a boundary or 6 balls.
 * Items float over the outfield (the ball passing through takes one) or come from 2 dots in an over; they apply
 * themselves on their next event. Stadium targets give bonus runs. Chaos events fire between balls and end by
 * themselves. ---- */
Object.assign(Match.prototype, {
  addHype(side, n, why) {
    if (!this.kerfuffle) return;
    const was = this.hype[side];
    this.hype[side] = clamp(was + n * T('hypeGain'), 0, 100);
    if (was < 100 && this.hype[side] >= 100) this.emit('hype:full', { side });
    if (why) this.emit('hype', { side, n, why });
  },
  specialReady(side, kind, at = 100) {
    if (!this.kerfuffle) return false;
    if (this.cfg.cheat.infiniteHype && this.isHuman(side)) return true;
    return this.hype[side] >= at;
  },
  useSpecial(side, id) {
    const sp = SPECIALS[id] || {};
    this.hype[side] = sp.cost ? Math.max(0, this.hype[side] - sp.cost) : 0;
    this.emit('special', { id, side, kind: sp.kind });
    coverage.mark('special');
  },
  /** a fielding special (Pip's Chirp, Fortescue's Silver Tray, Houdini's Lightning Stumping), used in setup */
  fieldSpecial() {
    const team = this.teams[this.bowlSide], star = team.players.find(p => p.specField);
    if (!star || !this.specialReady(this.bowlSide, 'field', SPECIALS[star.specField].cost || 100)) return false;
    const id = star.specField; this.useSpecial(this.bowlSide, id);
    if (id === 'chirp') this.flags.chirp = true; else if (id === 'tray') this.flags.tray = 1; else if (id === 'lightning') this.flags.lightning = 6;
    return true;
  },
  /** after each ball: hype, ON FIRE, item timers, maidens and dots */
  afterBallArcade(c, before) {
    const bat = this.sideOf(this.inn.bat), bowl = 1 - bat, runs = this.inn.runs - before;
    if (c.boundary === 6) this.addHype(bat, 25, 'six'); else if (c.boundary === 4) this.addHype(bat, 15, 'four'); else if (c.runs === 3) this.addHype(bat, 10, 'three');
    if (c.grade === 'perfect' && c.contact) this.addHype(bat, 8, 'perfect');
    if (c.bonus) this.addHype(bat, 30, 'target');
    if (c.wicket) this.addHype(bowl, 30, 'wicket');
    if (c.maiden) this.addHype(bowl, 20, 'maiden');
    if (c.screamer) this.addHype(bowl, 15, 'screamer');
    if (c.wicket && c.wicket.direct) this.addHype(bowl, 15, 'direct');
    if (c.beaten && !c.contact) this.addHype(bowl, 8, 'beaten');
    const dot = runs === 0 && !c.wicket;
    if (dot) this.addHype(bowl, 6, 'dot');
    // ON FIRE: the batter
    const F = this.fire;
    if (c.boundary) { F.batStreak++; } else F.batStreak = 0;
    if (F.bat > 0) { F.bat--; if (dot || c.wicket || F.bat === 0) { F.bat = 0; this.emit('fire:off', { who: 'bat' }); } }
    else if (F.batStreak >= T('fireStreak') && this.kerfuffle) { F.bat = 6; this.emit('fire:on', { who: 'bat' }); coverage.mark('fire'); }
    // the bowler
    if (dot || c.wicket) F.bowlStreak++; else F.bowlStreak = 0;
    if (F.bowl > 0) { F.bowl--; if (c.boundary || F.bowl === 0) { F.bowl = 0; this.emit('fire:off', { who: 'bowl' }); } }
    else if (F.bowlStreak >= 3 && this.kerfuffle) { F.bowl = 6; F.bowlStreak = 0; this.emit('fire:on', { who: 'bowl' }); coverage.mark('fire'); }
    if (this.cfg.cheat.alwaysFire && this.isHuman(bat)) F.bat = Math.max(F.bat, 2);
    // items and flags that last a few balls
    if (this.flags.giantBat > 0) this.flags.giantBat--;
    if (this.flags.lightning > 0) this.flags.lightning--;
    if (this.flags.teaTime > 0 && c.overEnd) this.flags.teaTime--;
    this.flags.fogBall = false; this.flags.grandad = false;
    // bowling items: 2 dot balls in an over
    this.overDots = c.ballInOver === 0 ? (dot ? 1 : 0) : (this.overDots || 0) + (dot ? 1 : 0);
    if (this.kerfuffle && this.overDots === 2 && dot && !this.overItemGiven) { this.overItemGiven = true; this.giveItem(bowl, RNG.pick(BOWL_ITEMS)); }
    if (c.overEnd) { this.overDots = 0; this.overItemGiven = false; }
    if (c.wicket && this.kerfuffle) this.addHype(bat, 0);
    this.force.outcome = null;
    // highlights: the moments the results screen replays
    const w = (c.boundary === 6 ? 3 : c.boundary === 4 ? 1.5 : 0) + (c.wicket ? 3 : 0) + (c.bonus ? 3 : 0) + (c.screamer ? 2 : 0) + (c.special ? 1 : 0);
    if (w > 0) this.highlights.push({ w, rec: c, inn: this.innNo });
    // the profile's stats for a human batting side
    if (this.isHuman(bat) && this.cfg.mode !== 'attract') { if (c.boundary === 6) Profile.stat('sixes'); if (c.boundary === 4) Profile.stat('fours'); }
    if (this.isHuman(bowl) && this.cfg.mode !== 'attract' && c.wicket) Profile.stat('wickets');
  },
  giveItem(side, id) {
    if (id === 'cake') { this.addHype(side, 40, 'cake'); this.emit('item', { id, side }); coverage.mark('item:' + id); return; }
    if (this.items[side].length >= 2) this.items[side].shift();
    this.items[side].push(id);
    if (id === 'giantbat') { this.flags.giantBat = 2; this.items[side] = this.items[side].filter(i => i !== 'giantbat'); }
    if (id === 'fog') { this.flags.fogBall = true; this.flags.fogMarker = true; this.items[side] = this.items[side].filter(i => i !== 'fog'); }
    if (id === 'banana') { this.flags.banana = 1; this.flags.bananaUsed = false; this.items[side] = this.items[side].filter(i => i !== 'banana'); }
    this.emit('item', { id, side }); coverage.mark('item:' + id);
  },
  /** consume a held item if it applies to this event; true when it did */
  useItem(side, id, event) {
    const i = this.items[side].indexOf(id); if (i < 0) return false;
    this.items[side].splice(i, 1); this.emit('item:used', { id, side, event }); return true;
  },
  /* ---- item tokens on the outfield ---- */
  spawnToken(id, at) {
    const r = RNG.play, a = r() * TAU, d = 200 + r() * 220;
    const p = at || [Math.cos(a) * d, G.MID_Y + Math.sin(a) * d * .8];
    if (this.outside(p[0], p[1])) { p[0] *= .6; p[1] = G.MID_Y + (p[1] - G.MID_Y) * .6; }
    this.tokens.push({ id: id || RNG.pick(BAT_ITEMS), x: p[0], y: p[1], z: 14, t: 0, life: 6 * 25 });
    this.emit('token:spawn', { id: this.tokens[this.tokens.length - 1].id });
  },
  stepTokens(dt) { for (const t of this.tokens) t.t += dt; this.tokens = this.tokens.filter(t => t.t < t.life); },
  checkTokens() {
    if (!this.contact) return;
    const b = this.ball;
    for (const t of this.tokens) if (hyp(b.x - t.x, b.y - t.y, b.z - t.z) < 14) { t.t = 1e9; this.giveItem(this.bat, t.id); this.emit('token:take', { id: t.id }); }
  },
  /* ---- stadium targets ---- */
  checkTargets(x0, y0, z0) {
    if (!this.contact || !this.kerfuffle) return;
    const b = this.ball;
    for (const t of this.ground.targets) {
      if (this.targetsHit[t.id]) continue;
      const p = this.targetPos(t), h = [t.size[0] / 2, t.size[1] / 2, t.size[2] / 2];
      // the segment from the last step against the box (sampled)
      for (let k = 0; k <= 4; k++) {
        const x = lerp(x0, b.x, k / 4), y = lerp(y0, b.y, k / 4), z = lerp(z0, b.z, k / 4);
        if (Math.abs(x - p[0]) <= h[0] && Math.abs(y - p[1]) <= h[1] && Math.abs(z - p[2]) <= h[2]) { this.hitTarget(t); break; }
      }
    }
  },
  hitTarget(t) {
    this.targetsHit[t.id] = true; this.cur.bonus += t.bonus; this.cur.target = t.id; this.stats.targets.push(t.id);
    const b = this.ball; b.vx *= -.25; b.vy *= -.25; b.vz = Math.abs(b.vz) * .3;
    this.emit('target:hit', { id: t.id, bonus: t.bonus, label: t.label, fx: t.fx });
    coverage.mark('target'); coverage.mark('target:' + t.id);
    if (t.fx === 'bees') this.startChaos('bees');
  },
  /* ---- chaos events ---- */
  chaosRoll(when) {
    if (!this.kerfuffle || this.cfg.cheat.noChaos || this.cfg.mode === 'hub' || this.cfg.mode === 'showdown' || this.cfg.mode === 'attract') return null;
    const pool = this.ground.chaos.filter(id => !this.chaos.some(c => c.id === id) && !(this.usedChaos || {})[id]);
    const quickMascot = this.cfg.mode === 'quick' && !pool.includes('mascot') && !(this.usedChaos || {}).mascot ? ['mascot'] : [];
    const all = pool.concat(quickMascot).filter(id => (when === 'over') === (id === 'rain' || id === 'advert' || id === 'tide' || id === 'fog' || id === 'ghosts'));
    for (const id of all) if (RNG.play() < CHAOS[id].chance * T('chaosRate') * (when === 'over' ? 1 : .25)) return id;
    return null;
  },
  chaosOverStart() {
    // an item token for the batting side
    if (this.kerfuffle && this.cfg.mode !== 'hub' && this.cfg.mode !== 'attract' && RNG.play() < .35 * T('chaosRate')) this.spawnToken();
    const id = this.chaosRoll('over');
    if (id === 'rain' && !(this.innNo === 1 && this.inn.balls < this.inn.overs * 6 - 1)) return false;
    if (id) { this.startChaos(id); if (id === 'rain') return true; }
    return false;
  },
  chaosBetween() { const id = this.chaosRoll('between'); if (id) this.startChaos(id); },
  startChaos(id) {
    const c = { id, t: 0, overs: CHAOS[id].overs, startOver: this.over, data: {} };
    (this.usedChaos = this.usedChaos || {})[id] = true;
    if (id === 'cow') { c.pos = [-420, 380]; c.path = [[-420, 380], [-250, 470], [-120, 520], [60, 560], [-200, 300], [-420, 380]]; }
    if (id === 'bees') { const f = this.fielders.filter(a => a !== this.keeper && a !== this.bowler)[Math.floor(RNG.play() * 8)]; if (f) { f.bees = true; c.data.who = f; } }
    if (id === 'peacocks') c.pos = [300, 420];
    if (id === 'mascot') { c.pos = [-500, 200]; }
    if (id === 'tide') c.data.step = .05;
    if (id === 'fog') c.data.from = this.fog;
    if (id === 'ghosts') c.data.next = 2;
    if (id === 'rain') { this.stats.delays += 1; this.stats.chaosThings.push('the rain'); return this.startRain(c); }
    if (id === 'advert') this.hold = Math.max(this.hold, 3);
    if (id === 'tray') this.hold = Math.max(this.hold, 3);
    if (id === 'bells' || id === 'rabbits' || id === 'fireworks' || id === 'advert' || id === 'tray') c.overs = 0;
    this.chaos.push(c);
    this.stats.chaosThings.push(CHAOS[id].name.toLowerCase());
    this.addHype(this.bat, 5, 'chaos'); this.addHype(this.bowlSide, 5, 'chaos');
    this.emit('chaos', { id, name: CHAOS[id].name }); coverage.mark('chaos:' + id);
  },
  stepChaos(dt) {
    for (const c of this.chaos) {
      c.t += dt;
      if (c.id === 'cow' && c.path) { const P = c.path, k = (c.t * .04) % (P.length - 1), i = Math.floor(k), f = k - i; c.pos = [lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], f)]; c.facing = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); }
      if (c.id === 'peacocks') { c.pos = [300 + Math.sin(c.t * .3) * 140, 420 + Math.cos(c.t * .21) * 80]; }
      if (c.id === 'gulls' && c.data.swoop) c.data.swoop.t += dt;
      if (c.id === 'mascot') { c.pos = [-500 + (c.t * 60) % 1000, 200 + Math.sin(c.t * 2) * 30]; }
      if (c.id === 'fog') this.fog = clamp(c.data.from + Math.min(1, c.t / 20) * .4, 0, 1);
      if (c.id === 'ghosts') { c.data.next -= dt; if (c.data.next <= 0) { c.data.next = 2 + RNG.cosmetic() * 3; const gs = this.fielders.filter(a => a.ghost); this.flags.ghostPhase = gs.length ? { id: gs[Math.floor(RNG.cosmetic() * gs.length)].id, t: .5 } : null; if (this.flags.ghostPhase) for (const a of this.fielders) a.phased = false; } if (this.flags.ghostPhase) { this.flags.ghostPhase.t -= dt; if (this.flags.ghostPhase.t <= 0) this.flags.ghostPhase = null; } }
    }
    // events end by themselves: after their overs (or at once for the instant ones)
    const before = this.chaos.length;
    this.chaos = this.chaos.filter(c => {
      const over = c.overs > 0 && this.over - c.startOver >= c.overs, inst = c.overs === 0 && c.t > 4;
      if (over || inst) { if (c.id === 'bees' && c.data.who) c.data.who.bees = false; if (c.id === 'fog') this.fog = this.weather === 'fog' ? .6 : 0; return false; }
      return true;
    });
    if (before !== this.chaos.length) this.emit('chaos:end', {});
    if (this.chaos.some(c => c.id === 'tide') && this.cur && this.cur.overEnd && !this.tideStepped) { this.tideStepped = true; this.boundaryShrink = Math.min(.15, this.boundaryShrink + .05); }
    if (this.phase === 'setup') this.tideStepped = false;
  },
  /** the ball meets the chaos: Doris, a dust devil, a peacock, a gull */
  chaosBall(dt) {
    const b = this.ball;
    for (const c of this.chaos) {
      if (c.id === 'cow' && c.pos && b.z < 20 && hyp(b.x - c.pos[0], b.y - c.pos[1]) < 18 && !c.data.hit) { c.data.hit = true; b.vx *= -.3; b.vy *= -.3; b.vz = 10; this.emit('chaos:cowhit', {}); c.overs = 0; c.t = 3; this.planField(); }
      if (c.id === 'peacocks' && c.pos && b.z < 4 && hyp(b.x - c.pos[0], b.y - c.pos[1]) < 16 && !c.data.hit) { c.data.hit = true; const a = (RNG.play() - .5) * 50 * DEG, cs = Math.cos(a), sn = Math.sin(a), vx = b.vx; b.vx = vx * cs - b.vy * sn; b.vy = vx * sn + b.vy * cs; this.emit('chaos:peacock', {}); this.planField(); }
      if (c.id === 'dustdevil' && b.z > 6 && !c.data.hit && RNG.play() < dt * 1.5) { c.data.hit = true; const a = (RNG.play() - .5) * 20 * DEG, cs = Math.cos(a), sn = Math.sin(a), vx = b.vx; b.vx = vx * cs - b.vy * sn; b.vy = vx * sn + b.vy * cs; this.emit('chaos:dustdevil', {}); this.planField(); }
      if (c.id === 'gulls' && b.rolling && b.vx === 0 && b.vy === 0 && !this.holder && !c.data.took && hyp(b.x, b.y - G.MID_Y) > 200) { c.data.took = true; c.data.swoop = { x0: b.x, y0: b.y, x1: b.x + 30, y1: b.y + 10, t: 0 }; b.x += 30; b.y += 10; this.cur.ran = Math.max(this.cur.ran, 0); this.cur.gullByes = 2; this.emit('chaos:gull', {}); coverage.mark('gullsteal'); this.planField(); }
    }
  },
  /* ---- rain: covers, a delay, and in a chase the Kerfuffle Method ---- */
  startRain(c) {
    this.rainInfo = { c, t: 0 }; this.rain = 1; this.chaos.push(c);
    this.emit('rain:start', {}); this.emit('chaos', { id: 'rain', name: 'Rain delay' }); coverage.mark('chaos:rain'); coverage.mark('rain');
    this.setPhase('rainDelay');
  },
  phase_rainDelay() { if (this.pt > (this.cfg.mode === 'attract' ? 5 : 7) && this.hold <= 0) this.endRain(); },
  endRain() {
    const inn = this.inn; this.rain = 0;
    this.chaos = this.chaos.filter(c => c.id !== 'rain');
    if (this.innNo === 1 && inn.target !== null) {
      const O = inn.overs, oBefore = (O * 6 - inn.balls) / 6, cutBalls = Math.max(1, Math.ceil((O * 6 - inn.balls) / 2)), oAfter = (O * 6 - inn.balls - cutBalls) / 6;
      const r = Rules.kerfuffleMethod(this.innings[0].runs, O, oBefore, oAfter, inn.wkts, inn.runs);
      inn.overs = (inn.balls + O * 6 - inn.balls - cutBalls) / 6; inn.revised = { from: inn.target, to: r.target, res: r.res, cut: cutBalls };
      inn.target = r.target;
      this.emit('rain:method', { from: inn.revised.from, to: r.target, res: r.res, cut: cutBalls });
      if (inn.runs >= inn.target || inn.balls >= inn.overs * 6) { inn.done = true; inn.end = inn.runs >= inn.target ? 'target' : 'overs'; }
    }
    this.emit('rain:end', {});
    this.hold = Math.max(this.hold, this.cfg.mode === 'attract' ? 2.5 : 3.5);
    if (inn.done) return this.endInnings();
    this.chooseBowler(false); if (this.phase !== 'pickBowler') this.setPhase('setup');
  }
});
