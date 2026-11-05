/* =============================================================================
 * 31-derby: the BATZOOKA DERBY. 1-4 players take turns (hot seat) against the
 * Pitch-O-Matic 3000: each round is 2:00 or 10 outs. Any swing that isn't a home
 * run is an out, and so is a taken strike; taken balls are free. Score: home-run
 * feet plus targets (the blimp +500, the MEGA-TRON +300, drones +150, the
 * batter's-eye bullseye +200); every 5th pitch is a Golden Ball worth x2; three
 * homers in a row fill the meter for one Batzooka swing. Moonshot Leaders table.
 * The AI Hub round (40-hub) and the attract mode run the same Derby.
 * ========================================================================== */
BZ.Derby = class Derby {
  constructor(o = {}) {
    this.o = o; this.parkId = o.park || 'kernel';
    this.M = BZ.newMatch({ mode: 'derby', park: this.parkId, away: 'comets', home: this.parkId === 'megadome' ? 'mechanicals' : (BZ.get('parks', this.parkId).team || 'krakens'), innings: 1, seed: o.seed || 1, fast: false, attract: !!o.attract });
    const M = this.M; M.derby = this; M.phase = 'atBat';
    this.deal = o.deal || BZ.rng.deal;
    this.players = (o.players || [{ name: 'P1', input: BZ.game.input }]).map((p, i) => Object.assign({ score: 0, hrs: 0, outs: 0, longest: 0, streak: 0, meter: 0, time: o.limit || 120, pitches: 0, done: false, color: p.color || E.PLAYER_COLORS[i % 4], batter: p.batter || BZ.get('teams', 'comets').lineup[[0, 3, 7, 4][i % 4]] }, p));
    this.cur = 0; this.state = 'intro'; this.t = 0; this.pitchN = 0; this.last = null; this.flash = null;
    this.length = o.length || 'time';
    this.blimp = { x: 0, y: 0, z: 300, a: 0 };
    this.ghosts = {};   // id -> { name, color, swingT, comets: [] }
    this.clock = o.clock || null;   // a function giving the round's time left (the hub's)
    M.batter = this.players[0].batter;
    this.setBatter();
  }
  get P() { return this.players[this.cur]; }
  setBatter() { const M = this.M; M.batter = this.P.batter; M.teams[0].meter = this.P.meter; M.teams[0].batzookaArmed = false; M.reticle.x = 0; M.reticle.z = 17; M.ab = { sub: 'select', t: 0 }; }
  bonus(fb, label) { const s = fb * (this.golden ? 2 : 1); this.P.score += s; this.flash = { text: '+' + s + ' ' + label, t: 0 }; BZ.sfx('coin'); }
  update(dt, I) {
    const M = this.M, S = M.ab, P = this.P; this.t += dt;
    if (this.flash) { this.flash.t += dt; if (this.flash.t > 1.6) this.flash = null; }
    this.blimp.a += dt * .05; const H = M.park.H; this.blimp.x = H.x + Math.sin(this.blimp.a) * 520; this.blimp.y = H.y - M.park.R(0) - 160 + Math.cos(this.blimp.a * 1.3) * 80;
    for (const g of Object.values(this.ghosts)) { g.swingT = Math.max(0, g.swingT - dt); for (const c of g.comets) { BZ.ballStep(c, M.park, dt); c.life -= dt; } g.comets = g.comets.filter(c => c.life > 0 && c.z >= 0); }
    if (this.state === 'over') return;
    if (this.state === 'intro') { if (this.t > (this.o.attract || this.o.hub ? .4 : 1.6) || (I && I.pressed('south') && this.t > .3)) { this.state = 'pitch'; this.newPitch(); } return; }
    // the clock runs while this player bats
    if (this.length === 'time' || this.o.hub) { P.time -= dt; if (this.clock) P.time = this.clock(); }
    if ((P.time <= 0 && (this.length === 'time' || this.o.hub)) || (P.outs >= 10 && (this.length === 'outs' && !this.o.hub || this.o.hub))) { if (this.state !== 'flight') return this.endTurn(); }
    if (this.state === 'pitch') {
      if (I) BZ.match.reticleInput(M, I, dt);
      S.t += dt;
      if (S.sub === 'select' && S.t > (this.o.attract ? .5 : .9)) { S.sub = 'windup'; S.t = 0; S.windT = .6; }
      else if (S.sub === 'windup') { if (S.t >= S.windT) this.release(); }
      else if (S.sub === 'flight') this.flight(dt, I);
      else if (S.sub === 'settle') { if (S.t > .7) this.newPitch(); }
      if (I && (S.sub === 'select' || S.sub === 'windup') && I.pressed('r1') && P.meter >= 100 && !M.teams[0].batzookaArmed) { M.teams[0].batzookaArmed = true; BZ.sfx('charge'); BZ.hud.stamp('BATZOOKA ARMED!', { prio: 2 }); }
    } else if (this.state === 'flight') this.ballFlight(dt);
  }
  newPitch() { const M = this.M; M.phase = 'atBat'; this.state = 'pitch'; M.ab = { sub: 'select', t: 0, swing: null }; M.ball.mode = 'none'; this.pitchN++; this.golden = this.pitchN % 5 === 0; BZ.bus.emit('derbyPitch', { n: this.pitchN, golden: this.golden }); }
  release() {
    const M = this.M, S = M.ab, R = this.deal;
    const inZ = R() < .8, tx = inZ ? (R() - .5) * 9 : (R() < .5 ? -1 : 1) * (8 + R() * 3), tz = inZ ? 11 + R() * 12 : (R() < .5 ? 6 : 28);
    S.type = 'machine'; S.pitch = new BZ.Pitch(M, { type: 'machine', pitcher: { vel: 5, brk: 4, look: { size: 1.25 } }, target: [tx, tz], q: .9, rand: R, noMiss: true });
    S.pitch.bx = (R() - .5) * 4; S.pitch.bz = (R() - .5) * 4; S.pitch.calcEnd();
    S.sub = 'flight'; S.t = 0; S.released = true; M.ball.mode = 'pitch';
    BZ.sfx('pitchWhoosh'); if (this.golden) BZ.sfx('ding');
    M.golden = this.golden;
    // the bot's plan
    if (!this.P.input) { const plan = BZ.ai.batterPlan(M, 0, S.pitch), c = S.pitch.cross(); plan.swing = BZ.inZone(c.x, c.z) || R() < .1; plan.type = 'power'; plan.e = BZ.Rn(this.P.botSd || .025); plan.rx = c.x + BZ.Rn(.5); plan.rz = c.z - 1.3 + BZ.Rn(.6); S.botPlan = plan; }   // a slugger aims just under the ball to lift it
    BZ.bus.emit('release', { type: 'machine', speed: BZ.mph(S.pitch.speed), q: .9, slot: 'south' });
  }
  flight(dt, I) {
    const M = this.M, S = M.ab, pt = S.pitch, P = this.P;
    pt.step(dt);
    if (I && !S.swing) { if (I.pressed('south')) S.swing = { type: 'contact', t0: pt.t }; if (I.pressed('west')) S.swing = { type: 'power', t0: pt.t }; if (S.swing && M.teams[0].batzookaArmed) S.swing.type = 'batzooka'; }
    if (!I && S.botPlan && S.botPlan.swing && !S.swing) { M.reticle.x += (S.botPlan.rx - M.reticle.x) * Math.min(1, dt * 14); M.reticle.z += (S.botPlan.rz - M.reticle.z) * Math.min(1, dt * 14); if (pt.t >= pt.T - BZ.SWINGS.power.delay + S.botPlan.e) S.swing = { type: M.teams[0].batzookaArmed || (P.meter >= 100 && (M.teams[0].batzookaArmed = true)) ? 'batzooka' : 'power', t0: pt.t }; }
    if (S.swing && !S.swing.done) {
      const sw = S.swing, Sd = BZ.SWINGS[sw.type], imp = sw.t0 + Sd.delay;
      if (pt.t >= imp) {
        sw.done = true; const c = pt.cross(), zooka = sw.type === 'batzooka';
        if (zooka) { M.teams[0].batzookaArmed = false; P.meter = 0; M.teams[0].meter = 0; }
        const res = BZ.contact({ type: sw.type, e: imp - pt.T, rx: (S.botPlan && !I) ? S.botPlan.rx : M.reticle.x, rz: (S.botPlan && !I) ? S.botPlan.rz : M.reticle.z }, c, pt.speed, P.batter, M.park, (P.batter.bt || 'R')[0] === 'L', I ? BZ.assistFor(M, 0) : { sweet: 1, window: 1 }, { evMul: 1.12 });   // the Derby's balls are livelier
        if (this.o.attract && res.kind !== 'contact') { /* the demo always connects */ Object.assign(res, BZ.contact({ type: 'power', e: 0, rx: c.x, rz: c.z - .5 }, c, pt.speed, P.batter, M.park, false)); }
        BZ.bus.emit('swing', { type: sw.type, kind: res.kind, grade: res.grade, ms: res.ms, feedback: res.feedback, feedback2: res.feedback2 });
        if (res.kind === 'contact' || res.kind === 'dribble') { this.hit(res, c, zooka); return; }
        this.out(res.kind === 'miss' ? 'WHIFF' : 'FOUL', zooka);
        S.sub = 'settle'; S.t = 0; S.contactDone = true;
        return;
      }
    }
    if (pt.t >= pt.T + .12 && !S.swing) {
      const c = pt.cross(), inZ = BZ.inZone(c.x, c.z);
      BZ.sfx('mitt');
      if (inZ) this.out('STRIKE'); else { BZ.hud.stamp('BALL', { scale: 2, colors: ['#ffffff', '#8affb0', '#1a8a4a'] }); }
      S.sub = 'settle'; S.t = 0; S.cross = c; S.result = inZ ? 'strike' : 'ball';
    }
  }
  hit(res, c, zooka) {
    const M = this.M, b = M.ball, P = M.park;
    Object.assign(b, BZ.newBall(), { x: P.H.x + c.x, y: P.H.y - 6, z: c.z, vx: res.v[0], vy: res.v[1], vz: res.v[2], mode: 'batted', boost: zooka ? .5 : 0, spin: res.spin || 0, version: 1 });
    M.lastBatted = { zooka };
    BZ.sfx(zooka ? 'krakoom' : res.Q > .5 ? 'crack' : 'tink');
    if (BZ.cosmetic) { BZ.game.particles.sparks(b.x, b.y, b.z, 12, Math.atan2(b.vy, b.vx)); BZ.game.freeze(.05); }
    this.state = 'flight'; M.phase = 'inPlay'; M.play = { t: 0, pred: BZ.predict(b, P, 7), chaser: null, outs: [], runs: [] }; M.runners = [];
    this.flightT = 0;
    BZ.bus.emit('derbyHit', { v: res.v, zooka, p: [c.x, c.z] });
    this.sendGhost({ t: 'hit', n: this.pitchN, p: [b.x - P.H.x, b.y - P.H.y, b.z], v: [b.vx, b.vy, b.vz], spin: b.spin, bz: zooka ? 1 : 0 });
  }
  ballFlight(dt) {
    const M = this.M, b = M.ball, P = M.park; this.flightT += dt;
    const ev = BZ.ballStep(b, P, dt, { trail: true });
    if (BZ.hazard && BZ.hazard.onBall) BZ.hazard.onBall(M, b, dt, ev);
    // the blimp and the bullseye
    if (!b.bounced && Math.hypot(b.x - this.blimp.x, b.y - this.blimp.y, b.z - this.blimp.z) < 46 && !this.blimpHit) { this.blimpHit = true; this.bonus(500, 'BLIMP!'); BZ.hud.stamp('BLIMP SHOT!', { prio: 3 }); }
    if (ev.includes('hr') || ev.includes('pole')) {
      const dist = BZ.feet(BZ.carry(b, P).dist), th = BZ.theta(b.x - P.H.x, b.y - P.H.y), mul = this.golden ? 2 : 1, Pl = this.P;
      Pl.score += dist * mul; Pl.hrs++; Pl.streak++; Pl.longest = Math.max(Pl.longest, dist);
      if (Math.abs(th) < .05) this.bonus(200, 'BULLSEYE');
      BZ.hud.stamp(M.lastBatted.zooka ? 'BATZOOKA!!!' : 'HOME RUN!', { prio: 3, scale: 4, sub: dist + ' FEET' + (this.golden ? '  x2 GOLDEN!' : '') });
      BZ.bus.emit('homer', { dist, x: b.x, y: b.y, batzooka: M.lastBatted.zooka, derby: true, runs: 1, batter: Pl.batter });
      if (Pl.streak >= 3 && Pl.meter < 100 && !M.lastBatted.zooka) { Pl.meter = 100; Pl.streak = 0; M.teams[0].meter = 100; BZ.hud.toast('THREE IN A ROW: BATZOOKA READY!'); BZ.sfx('ding'); }
      this.last = { dist, hr: true };
      this.endFlight();
      return;
    }
    if (ev.includes('dead') || ev.includes('grd') || (b.bounced && (b.rolling || this.flightT > 2.5)) || this.flightT > 7) { this.out(b.fair === 'foul' || !BZ.isFairPoint(P, b.x, b.y) ? 'FOUL' : 'IN THE PARK'); this.endFlight(); }
  }
  endFlight() { const M = this.M; this.state = 'pitch'; M.ab.sub = 'settle'; M.ab.t = 0; M.ab.contactDone = true; M.phase = 'atBat'; M.ball.mode = 'dead'; this.blimpHit = false; }
  out(why, zooka) {
    const P = this.P; P.outs++; P.streak = 0; this.last = { out: why };
    BZ.hud.stamp(zooka ? 'FIZZLE!' : 'OUT ' + P.outs, { scale: 2, colors: ['#ffffff', '#ff8a8a', '#c81a1a'], sub: why });
    BZ.bus.emit('derbyOut', { outs: P.outs, why });
    if (zooka) { BZ.sfx('fizzle'); }
  }
  endTurn() {
    const P = this.P; P.done = true;
    BZ.bus.emit('derbyTurnEnd', { player: this.cur, score: P.score });
    const next = this.players.findIndex(p => !p.done);
    if (next < 0) { this.state = 'over'; BZ.bus.emit('derbyEnd', { scores: this.players.map(p => p.score) }); return; }
    this.cur = next; this.setBatter(); this.state = 'intro'; this.t = 0; this.M.phase = 'atBat';
  }
  sendGhost(msg) { if (this.o.send) this.o.send(msg); }
  /** a ghost's batted ball, simulated locally with the same physics (cosmetic) */
  ghostHit(id, msg) {
    const g = this.ghosts[id]; if (!g) return; const P = this.M.park;
    g.swingT = .4;
    g.comets.push(Object.assign(BZ.newBall(), { x: P.H.x + msg.p[0], y: P.H.y + msg.p[1], z: msg.p[2], vx: msg.v[0], vy: msg.v[1], vz: msg.v[2], mode: 'batted', spin: msg.spin || 0, boost: msg.bz ? .5 : 0, life: 6, color: g.color }));
  }
  /* ---- drawing ---- */
  draw(r) {
    const M = this.M, fr = BZ.cams.frame(M);
    BZ.cams.animate(M, fr, 1 / 60);
    if (this.state === 'flight' || (M.ab && M.ab.sub === 'settle' && M.ball.mode === 'dead' && this.last && this.last.hr && M.ab.t < .4)) { BZ.cams.mode = 'field'; BZ.cams.frameField(M, 1 / 60); BZ.cams.drawField(r, M, fr); }
    else { BZ.cams.mode = 'plate'; BZ.cams.drawPlate(r, M, fr); this.drawGhostsM7(r); }
    if (this.state === 'flight') this.drawComets(r);
    r.overlay(g => this.hud(g, r));
  }
  drawGhostsM7(r) {
    // ghosts in the on-deck circles: translucent holograms that swing when their players swing
    const M = this.M, H = M.park.H, m7 = BZ.mode7(M.parkId);
    let k = 0;
    for (const [id, gh] of Object.entries(this.ghosts)) {
      const pos = [[-78, -21], [78, -21], [-120, -40]][k++ % 3], x = H.x + pos[0], y = H.y + pos[1];
      const q = m7.project(x, y, 0), q2 = m7.project(x, y, 34); if (!q || !q2) continue;
      r.overlay(g => px.blend(g, .45, 'add', () => { const hh = q[1] - q2[1]; px.rect(g, q[0] - hh * .12, q2[1], hh * .24, hh, gh.color); px.disc(g, q[0], q2[1], hh * .12, gh.color); if (gh.swingT > 0) px.line(g, q[0], q2[1] + hh * .3, q[0] + hh * .5 * Math.cos(gh.swingT * 12), q2[1] + hh * .3 - hh * .2, '#ffffff'); E.font.text(g, gh.name, q[0], q2[1] - 10, '#ffffff', { align: 'center' }); }));
      for (const c of gh.comets) { const p = m7.project(c.x, c.y, c.z); if (p) r.overlay(g => px.blend(g, .7, 'add', () => { px.disc(g, p[0], p[1], 3, gh.color); px.disc(g, p[0], p[1] + 4, 2, '#ffffff'); })); }
    }
  }
  drawComets(r) { for (const gh of Object.values(this.ghosts)) for (const c of gh.comets) r.queue(c.x, c.y, BZ.displayZ(c.z), g => { const q = r.w(c.x, c.y, BZ.displayZ(c.z)); px.blend(g, .8, 'add', () => { px.disc(g, q[0], q[1], 3, gh.color); px.line(g, q[0], q[1], q[0] - c.vx * .02, q[1] + c.vz * .02, gh.color, 2); }); }, { emissive: true }); }
  hud(g, r) {
    const P = this.P, y = 10, x = 12;
    E.ui.box(g, x, y, 150, 46, { bg: ['#1a2040', '#0a0e1c'], border: P.color, alpha: .92 });
    E.font.text(g, (this.o.title || 'BATZOOKA DERBY') + (this.players.length > 1 ? '  ' + P.name : ''), x + 6, y + 4, '#ffd040', { shadow: '#000' });
    E.font.text(g, BZ.fmt(P.score) + ' FT', x + 6, y + 15, '#ffffff', { scale: 2, shadow: '#000' });
    const tl = Math.max(0, P.time), mm = Math.floor(tl / 60), ss = Math.floor(tl % 60);
    E.font.text(g, (this.length === 'time' || this.o.hub ? mm + ':' + String(ss).padStart(2, '0') + '  ' : '') + 'OUTS ' + P.outs + '/10  HR ' + P.hrs, x + 6, y + 34, '#a8b8e8');
    // the meter (three in a row) and the Golden Ball
    E.ui.bar(g, x + 100, y + 6, 44, 4, P.meter / 100, P.meter >= 100 ? '#ffd040' : '#ff7a1a');
    for (let i = 0; i < 3; i++) px.disc(g, x + 104 + i * 8, y + 17, 2.5, i < P.streak ? '#ffd040' : '#3a3a5a');
    if (this.golden && this.state === 'pitch') E.font.title(g, 'GOLDEN BALL x2', r.W / 2, 50, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffd040', '#c89010'] });
    if (this.flash) E.font.text(g, this.flash.text, r.W / 2, 70, '#ffd040', { align: 'center', scale: 2, shadow: '#000' });
    if (this.state === 'intro') { E.font.title(g, P.name + ' UP!', r.W / 2, r.H * .3, { scale: 3, align: 'center', colors: ['#ffffff', P.color] }); E.font.text(g, P.batter.name.toUpperCase(), r.W / 2, r.H * .3 + 30, '#ffffff', { align: 'center', shadow: '#000' }); }
    // the standings of the others
    const others = this.players.filter((p, i) => i !== this.cur);
    others.forEach((p, i) => E.font.text(g, p.name + ' ' + BZ.fmt(p.score), r.W - 12, 64 + i * 11, p.color, { align: 'right', shadow: '#000' }));
    if (P.input && this.state !== 'over') BZ.drawPrompts(g, P.input, [['move', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['r1', 'BATZOOKA', P.meter >= 100, P.streak + '/3']], r.W / 2, r.H - 26, { align: 'center' });
  }
};

/* ---- the Derby setup: 1-4 players (hot seat), the park, the length ---- */
BZ.scenes.derbySetup = {
  enter() {
    const g = BZ.game; this.t = 0; this.n = 1; BZ.idle = 0;
    const unlocked = BZ.tour.unlocked();
    this.parks = BZ.PARK_ORDER.filter(id => !BZ.get('parks', id).locked || unlocked.all); this.park = 0;
    this.menu = new BZ.CardMenu([{ label: 'PLAYERS', id: 'n' }, { label: 'PARK', id: 'park' }, { label: 'LENGTH', id: 'len' }, { label: 'PLAY BALL!', id: 'go' }, { label: 'LEADERS', id: 'leaders' }], { leftRight: true });
    this.len = g.settings.derbyLength || 'time';
    BZ.music('derby');
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    if (this.leaders) { if (BZ.anyInput(g) && this.t > .3) { this.leaders = false; g.input.consumeAll(); } return; }
    const it = this.menu.items;
    it[0].value = '◂ ' + this.n + ' ▸'; it[1].value = '◂ ' + BZ.get('parks', this.parks[this.park]).name.toUpperCase() + ' ▸'; it[2].value = '◂ ' + (this.len === 'time' ? '2:00' : '10 OUTS') + ' ▸';
    const res = this.menu.update(dt);
    if (res && res.lr) { const id = it[res.i].id; if (id === 'n') this.n = clamp(this.n + res.lr, 1, 4); if (id === 'park') this.park = (this.park + res.lr + this.parks.length) % this.parks.length; if (id === 'len') { this.len = this.len === 'time' ? 'outs' : 'time'; g.settings.set('derbyLength', this.len); } BZ.sfx('select'); }
    if (res && res.pick !== undefined) {
      const id = it[res.pick].id;
      if (id === 'go') g.go('derby', { players: this.n, park: this.parks[this.park], length: this.len });
      else if (id === 'leaders') { this.leaders = true; this.t = 0; }
      else if (id === 'n') this.n = this.n % 4 + 1; else if (id === 'park') this.park = (this.park + 1) % this.parks.length; else if (id === 'len') this.len = this.len === 'time' ? 'outs' : 'time';
    }
    if (res && res.cancel) g.go('title');
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a0a24', '#2a1a48', '#4a1a2a']);
    r.overlay(g => {
      E.font.title(g, 'BATZOOKA DERBY', r.W / 2, 10, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
      E.font.text(g, 'Hit the most home-run feet. Every 5th pitch is a Golden Ball.', r.W / 2, 42, '#a8b8e8', { align: 'center' });
      if (this.leaders) { BZ.drawLeaders(g, r, 60); return; }
      this.menu.draw(g, r, r.W / 2, 62, { w: 260, h: 22, scale: 1 });
      BZ.legend(g, r, [['left', 'CHANGE'], ['south', 'SELECT'], ['east', 'BACK']]);
    });
  }
};
BZ.drawLeaders = (g, r, y) => {
  const T = BZ.arcade.table('derby'), w = 200, x = Math.round(r.W / 2 - w / 2);
  E.ui.box(g, x, y, w, 14 + Math.max(1, T.length) * 12, { bg: ['#1a1030', '#0a0614'], border: '#ffd040' });
  E.font.text(g, 'MOONSHOT LEADERS', r.W / 2, y + 3, '#ffd040', { align: 'center' });
  if (!T.length) E.font.text(g, 'NO MOONSHOTS YET', r.W / 2, y + 16, '#a8b8e8', { align: 'center' });
  T.slice(0, 10).forEach((e, i) => { E.font.text(g, (i + 1) + '. ' + e.name, x + 10, y + 16 + i * 12, '#ffffff'); E.font.text(g, BZ.fmt(e.score) + ' FT', x + w - 10, y + 16 + i * 12, '#ffd040', { align: 'right' }); });
};
BZ.scenes.derby = {
  pausable: true, view: 'broadcast', camera: { zoom: false, wheel: false },
  enter(data) {
    const g = BZ.game; this.data = data || { players: 1 }; BZ.hud.clear(); BZ.clearLater();
    const n = this.data.players || 1, players = [];
    for (let i = 0; i < n; i++) players.push({ name: 'P' + (i + 1), input: this.data.bots ? null : (g.players[i] || g.input), botSd: .02 });
    this.D = new BZ.Derby({ park: this.data.park || 'kernel', players, length: this.data.length || g.settings.derbyLength || 'time', seed: this.data.seed || (Date.now() & 0xffff), limit: 120 });
    BZ.M = this.D.M; BZ.talk.reset(); BZ.talk.install(this.D.M); BZ.crowd.install(this.D.M);
    const pd = this.D.M.park.def; g.lights.enabled = !!pd.night; g.lights.ambient = pd.ambient; g.weather = null;
    BZ.music('derby'); BZ.wheelOwned = true; this.over = 0; this.entering = false;
    if (this.data.attract) { BZ.hud.stamp('PLAY ONLINE IN AI HUB', { prio: 2, scale: 2, dur: 3 }); this.D.ghosts = { a: { name: 'ACE', color: BZ.SEAT_COLORS[1], swingT: 0, comets: [], score: 0 }, b: { name: 'ZOOM', color: BZ.SEAT_COLORS[2], swingT: 0, comets: [], score: 0 }, c: { name: 'RIO', color: BZ.SEAT_COLORS[3], swingT: 0, comets: [], score: 0 } }; this.ghostT = 0; }
    Object.assign(BZ.cams, { mode: 'plate', replay: null, moon: null });
    g.setView(BZ.VIEWS.broadcast);
  },
  exit() { BZ.endMatch(this.D && this.D.M); BZ.wheelOwned = false; },
  update(dt) {
    const g = BZ.game, D = this.D; BZ.inputTick(g, dt);
    if (BZ.dev.isOpen()) { BZ.dev.update(dt); return; }
    if (D.state === 'over') {
      this.over += dt;
      if (this.entering) { BZ.arcade.update(dt); return; }
      if (this.over > 1.5 && !this.data.bots) {
        // initials for the Moonshot Leaders, best score first
        const best = D.players.slice().sort((a, b) => b.score - a.score)[0];
        if (BZ.arcade.qualifies(best.score, 'derby') && !this.asked) { this.asked = true; this.entering = true; BZ.arcade.enter(best.score, 'derby', () => { this.entering = false; g.go('derbySetup'); }); return; }
        if (BZ.anyInput(g) || this.over > 6) g.go('derbySetup');
      }
      if (this.data.bots && this.over > 2) { if (this.data.onDone) this.data.onDone(D); else g.go('derbySetup'); }
      return;
    }
    if (this.data.attract && BZ.attract.check(g)) return;
    D.update(dt, D.P.input);
    BZ.hud.step(dt); BZ.talk.step(dt); BZ.crowd.step(D.M, dt); BZ.tickLater(dt);
    if (this.data.attract) { BZ.attract.step && (BZ.attract.segT += dt); this.ghostT += dt; if (this.ghostT > 1.6) { this.ghostT = 0; const ids = Object.keys(D.ghosts), id = ids[Math.floor(BZ.F() * ids.length)], R = BZ.F; D.ghostHit(id, { p: [0, -6, 18], v: [(R() - .5) * 500, -760 - R() * 200, 520 + R() * 120], spin: 0, bz: R() < .3 }); D.ghosts[id].score += 400 + Math.floor(R() * 60); } if (BZ.attract.segT > 16) BZ.attract.next(); }
  },
  draw(r) {
    const D = this.D;
    D.draw(r);
    BZ.hud.draw(r, D.M, null);
    r.overlay(g => {
      if (D.state === 'over') {
        E.ui.box(g, r.W / 2 - 110, r.H * .22, 220, 30 + D.players.length * 14, { bg: ['#1a1030', '#0a0614'], border: '#ffd040' });
        E.font.title(g, 'DERBY OVER', r.W / 2, r.H * .22 + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
        D.players.slice().sort((a, b) => b.score - a.score).forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + '   ' + BZ.fmt(p.score) + ' FT   ' + p.hrs + ' HR   LONG ' + p.longest, r.W / 2, r.H * .22 + 28 + i * 14, p.color, { align: 'center', shadow: '#000' }));
        if (this.entering) BZ.arcade.draw(r);
      }
      if (this.data.attract) BZ.attract.overlay(g, r);
    });
  }
};
