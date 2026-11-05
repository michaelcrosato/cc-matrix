// The Academy (§4.5): eleven drills on Port Solenne at SPARK, each with an instruction card in live button glyphs,
// a success check, TRY AGAIN and a reset on failure, DRILL CLEAR and a chime on success. ORACLE instructs
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.V, px = E.px;
const T = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const U = 16;
const A = SN.Academy = {
  setup() { const d = SN.save ? SN.save.data : { team: 'kestrel', pilot: 'ingrid' }; return { mode: 'academy', track: 'solenne', cls: 'spark', team: d.team, pilot: d.pilot, intro: false }; },
  attach(R, S) {
    this.R = R; this.i = S.startDrill || 0; this.retries = 0; this.firstTry = true; this.passed = 0; this.drone = null; this.gates = [];
    R.state = 'racing'; R.t = 0; R.rules = Object.assign({}, R.rules, { weapons: true });
    R.academy = this; this.begin();
  },
  blocking() { return this.phase === 'card'; },
  text(d) { const I = SN.game.input; return d.text.replace(/\{(\w+)\}/g, (m, a) => SN.glyph.text(I, a)); },
  begin() {
    const R = this.R, d = SN.DRILLS[this.i], sh = R.humans[0], Tk = R.track; this.d = d; this.phase = 'card'; this.t = 0; this.st = { brake: 0, pads: 0, pitchT: 0, hit: false, wall: false, shift: -9, gate: 0, absorb: false, roll: null, v0: 0 };
    const s = d.start.s === 'grid' ? Tk.grid[0].s : SN.wrap(Tk.knots[d.start.cp] + d.start.d * U, Tk.L);
    SN.Ship.place(sh, R, s, d.start.s === 'grid' ? Tk.grid[0].u : 0, d.start.v || 0);
    sh.p = SN.wrapDiff(0, s, Tk.L); sh._lastS = s; sh.lap = 0; sh.lapStart = R.t; sh.lapTimes = []; sh.bestLap = Infinity; sh.energy = d.start.energy || 100; sh.weapon = null; sh.boostT = 0; sh.elim = false; sh.rescueT = 0; sh.finished = false;
    this.st.v0 = d.start.v || 0; this.s0 = s;
    R.weapons.mines.length = 0; R.weapons.proj.length = 0; R.weapons.forced = null;
    if (this.drone) { R.ships.splice(R.ships.indexOf(this.drone), 1); this.drone = null; }
    this.gates = [];
    if (d.id === 'steer') this.gates = [0, 1, 2].map(k => ({ s: SN.wrap(s + (70 + k * 130) * U, Tk.L), u: (k % 2 ? 5 : -5) * U, done: false }));
    if (d.id === 'weapons') { R.weapons.forced = ['swarm']; const dr = this.drone = SN.Ship.make(R, { i: R.ships.length, pilot: 'tomas', team: 'kestrel', control: 'ai' }); dr.name = 'TARGET DRONE'; dr.drone = true; dr.energy = 100; SN.Ship.place(dr, R, SN.wrap(Tk.knots[3] + 100 * U, Tk.L), 0, 0); R.ships.push(dr); }
    if (d.id === 'absorb') R.weapons.forced = ['mine'];
    if (d.id === 'shift') { const ms = SN.wrap(Tk.knots[15] + 40 * U, Tk.L), hw = Tk.frameAt(ms).hw, gapSide = Tk.line(ms) > 0 ? -1 : 1, dummy = { stats: { hits: 0 }, player: -1, control: 'none' }; for (let k = 0; k < 3; k++) { const u = gapSide * (hw * .33 - k * hw * .33) - gapSide * hw * .0; R.weapons.mines.push({ s: ms, u: gapSide > 0 ? -hw * .66 + k * hw * .33 : hw * .66 - k * hw * .33, owner: dummy, arm: 0, life: 999, armed: true, spin: 0 }); } this.mineS = ms; }
    if (SN.view) SN.view.extraDraw = pen => this.draw3d(pen);
    SN.Audio && SN.Audio.announce(d.name);
  },
  update(dt) {
    const I = SN.game.input; this.t += dt;
    if (this.phase === 'card' && this.t > .3 && (I.pressed('confirm') || I.clicked())) { I.consumeAll(); this.phase = 'run'; this.t = 0; }
  },
  step(R, dt) {
    if (this.phase === 'done') return;
    const sh = R.humans[0], d = this.d, st = this.st, Tk = R.track; this.t += dt;
    if (this.drone) { const dr = this.drone; dr.stagger = 0; V.set(dr.V, 0, 0, 0); SN.Ship.place(dr, R, dr.s, 0, 0); dr.energy = Math.max(1, dr.energy); }
    if (this.phase === 'result') { if (this.t > (this.ok ? 1.5 : 2)) { if (this.ok) { this.i++; this.firstTry = true; if (this.i >= SN.DRILLS.length) return this.finish(); } else { this.retries++; this.firstTry = false; } this.begin(); } return; }
    if (this.phase !== 'run') return;
    for (const e of R.events) {
      if (e.ship !== sh && !(e.t === 'hit' && e.ship === this.drone)) continue;
      if (e.t === 'wall') st.wall = true; if (e.t === 'pad' && e.kind === 'speed') st.pads++; if (e.t === 'hit') { if (e.ship === this.drone) st.droneHit = true; else st.hit = true; }
      if (e.t === 'shift') st.shift = this.t; if (e.t === 'absorb') st.absorb = true; if (e.t === 'roll') st.roll = e.ok; if (e.t === 'lap') st.lap = e.time;
    }
    const kmh = SN.Ship.fwdSpeed(sh) * SN.KMH, ds = SN.wrapDiff(this.s0, sh.s, Tk.L), c = sh.ctl || {};
    let ok = null;
    switch (d.id) {
      case 'thrust': if (kmh >= 250) ok = true; break;
      case 'steer': for (const g of this.gates) if (!g.done && SN.wrapDiff(g.s, sh.s, Tk.L) >= 0 && SN.wrapDiff(g.s, sh.s, Tk.L) < 200) { g.done = true; if (Math.abs(sh.u - g.u) <= 4 * U) st.gate++; else ok = false; } if (st.gate >= 3) ok = true; break;
      case 'airbrake': { const a = Tk.knots[18], b = Tk.knots[20]; if (Tk.inRange(sh.s, a, b) && Math.max(c.brakeL || 0, c.brakeR || 0) > .3) st.brake += dt; if (st.wall) ok = false; else if (SN.wrapDiff(b, sh.s, Tk.L) > 0 && SN.wrapDiff(b, sh.s, Tk.L) < 400) ok = st.brake >= .5 && kmh >= 150; break; }
      case 'pitch': if ((c.pitch || 0) >= .5 && sh.F[2] < -.01) st.pitchT += dt; if (st.pitchT >= 1 && kmh >= this.st.v0 * SN.KMH + 15) ok = true; break;
      case 'pads': if (st.pads >= 2) ok = true; else if (ds > SN.wrapDiff(this.s0, Tk.speedPads[4].s, Tk.L) + 80 * U) ok = false; break;
      case 'weapons': if (st.droneHit) ok = true; else if (this.drone && SN.wrapDiff(this.drone.s, sh.s, Tk.L) > 500 * U && !sh.weapon && !R.weapons.proj.length) ok = false; break;
      case 'absorb': if (st.absorb) ok = true; break;
      case 'shift': if (st.hit) ok = false; else if (SN.wrapDiff(this.mineS, sh.s, Tk.L) > 60) ok = this.t - st.shift < 3; break;
      case 'roll': if (st.roll === true) ok = true; else if (st.roll === false) ok = false; else if (ds > 260 * U && sh.grounded) ok = false; break;
      case 'pit': if (sh.energy >= 99) ok = true; else if (Tk.pit && !Tk.inRange(sh.s, Tk.pit.a, Tk.pit.b) && SN.wrapDiff(Tk.pit.b, sh.s, Tk.L) > 0 && SN.wrapDiff(Tk.pit.b, sh.s, Tk.L) < 600) ok = false; break;
      case 'lap': if (st.lap !== undefined) ok = st.lap <= 60; break;
    }
    if (ok === null && this.t > (d.id === 'lap' ? 100 : 25)) ok = false;
    if (sh.rescueT > 0 && d.id !== 'lap') ok = false;
    if (ok !== null) { this.phase = 'result'; this.ok = ok; this.t = 0; R.emit({ t: 'drill', id: d.id, ok }); SN.Audio && SN.Audio.sfx(ok ? 'drill_ok' : 'drill_fail'); SN.HUD.callout(ok ? 'DRILL CLEAR' : 'TRY AGAIN', 0, ok ? '#5aff9a' : '#ff5a6e'); if (ok) this.passed++; }
  },
  finish() {
    const R = this.R; this.phase = 'done'; R.academyPassed = this.passed; R.academyRetries = this.retries;
    if (this.drone) { R.ships.splice(R.ships.indexOf(this.drone), 1); this.drone = null; }
    const sc = SN.scenes.race; if (SN.view) SN.view.extraDraw = null;
    if (SN.save) { SN.save.data.academy = { passed: this.passed, retries: this.retries }; }
    R.endRun(); R.state = 'results';
    const res = { setup: sc.S, results: R.results(), mode: 'academy', cls: R.cls, track: R.track.id, rec: R.record(), player: { place: 1, time: R.t, dnf: false, best: Infinity }, drills: this.passed, academyRetries: this.retries, records: [], unlocks: [] };
    if (sc.S.event && SN.Season) { SN.Season.medal(sc.S.event, res); SN.Save.write(); }
    SN.lastResult = res; sc.done = true;
    SN.go('results', { result: res });
  },
  draw3d(pen) {
    const R = this.R, Tk = R.track, t = SN.game.real || 0;
    for (const g of this.gates) { const c = g.done ? '#3a5a4a' : '#5aff9a'; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, p = Tk.point(g.s, g.u + Math.cos(a) * 48, 40 + Math.sin(a) * 40); pen.glow(p[0], p[1], p[2], 4, c); } }
    if (this.drone) { const P = this.drone.P; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t; pen.glow(P[0] + Math.cos(a) * 40, P[1] + Math.sin(a) * 40, P[2] + 30, 3, '#ff3a3a'); } }
  },
  hud(g, r, X, Y, Wd, H) {
    const d = this.d; if (!d) return;
    T(g, 'ACADEMY • DRILL ' + (this.i + 1) + '/' + SN.DRILLS.length, X + 8, Y + 8, '#29c8e8'); T(g, d.name, X + 8, Y + 20, '#ffffff', { scale: 2 }); T(g, 'RETRIES ' + this.retries, X + 8, Y + 40, '#9aa6c0', { font: 'tiny' });
    if (this.phase === 'run') E.font.text(g, this.text(d), X + Wd / 2, Y + H - 72, '#ffffff', { align: 'center', wrap: Wd - 120, outline: false, shadow: '#000' });
    if (this.phase === 'card') {
      const w = Math.min(320, Wd - 40), h = 92, x = X + (Wd - w) / 2, y = Y + H / 2 - h / 2, I = SN.game.input;
      E.ui.box(g, x, y, w, h, { bg: ['#141a2e', '#05060c'], border: '#29c8e8' });
      T(g, 'ORACLE • DRILL ' + (this.i + 1), x + 10, y + 8, '#29c8e8', { font: 'tiny' }); E.font.title(g, d.name, x + 10, y + 18, { scale: 2, colors: ['#ffffff', '#9ff4ff'] });
      E.font.text(g, this.text(d), x + 10, y + 42, '#ffffff', { wrap: w - 20, outline: false });
      const it = [['confirm', 'BEGIN']]; SN.glyph.row(g, I, it, x + w - SN.glyph.rowWidth(I, it) - 8, y + h - 16);
    }
  }
};
})();
