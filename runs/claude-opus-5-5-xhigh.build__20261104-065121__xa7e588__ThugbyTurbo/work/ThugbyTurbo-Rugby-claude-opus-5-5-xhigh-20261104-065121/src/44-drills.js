/* ---- THE TRAINING GROUND: each drill is a match with a scripted setup, a goal, the coach's line with the device's
 * badges, a reset on failure, SHOW ME (the coach's AI does it once: the drill's auto script, the one the tests use) ---- */
const Drills = TT.Drills = {
  m: null, id: null, D: null, prog: {}, msg: '', msgT: 0, doneT: 0, showing: false, subs: [], resetT: 0, rep: 0, t: 0, bot: {},
  start(m, id) {
    this.m = m; this.id = id; this.D = DRILL[id]; this.prog = {}; this.msg = ''; this.msgT = 0; this.doneT = 0; this.showing = false; this.rep = 0; this.t = 0; this.bot = {};
    m.drill = id; m.parked = new Set();
    this.subs.forEach(f => f()); this.subs = [];
    this.subs.push(TT.bus.on('*', (d, name) => { if (this.m && d.m === this.m && this.D.on && !this.setting) this.D.on.call(this, name, d, this.m); }));
    this.reset();
  },
  stop() { this.subs.forEach(f => f()); this.subs = []; this.m = null; this.showing = false; },
  seat() { return this.m && this.m.seats[0]; },
  me() { const s = this.seat(); return s ? this.m.players[s.pid] : null; },
  /** everything back to open play, then the drill's own setup */
  reset() {
    const m = this.m;
    m.setp = null; m.pending = null; m.adv = null; m.useIt = 0; m.hazards = []; m.powerups = []; m.replayAsk = null; m.foulsLater = []; m.over = false; m.hooter = false;
    m.dir = [1, -1]; m.hype = [0, 0]; m.breakDone = false; m.kickForTouch = undefined; m.parked = new Set(); m.forced = {};
    for (const p of m.players) { this.setFree(p); p.x = G.CX + (p.team ? 300 : -300); p.y = G.Y0 - 24 + p.slot * 2; }
    m.ref.down = 0; m.ref.x = G.CX; m.ref.y = G.Y0 + 40;
    m.phase = 'play'; m.sub = ''; m.phaseT = 0; m.ball.st = 'dead'; m.ball.holder = -1; m.ball.kind = '';
    this.resetT = 0; this.rep++; this.bot = {}; this.hero = -1;
    this.setting = true;
    this.D.setup.call(this, m);
    const s = this.seat(); if (s && this.hero >= 0 && s.pid !== this.hero) m.assign(s, this.hero);
    this.setting = false;
  },
  setFree(p) { p.st = 'free'; p.stT = 0; p.pin = false; p.charge = -1; p.chargeT = 0; p.sup = null; p.pu = null; p.z = 0; p.vx = p.vy = 0; p.held = 0; p.hanging = -1; p.cool = 0; p.evade = 0; p.fendT = 0; p.a.act = ''; p.pressT = {}; p.pk = 0; p.turbo = TUNE.v.turboTank; },
  put(p, x, y, f) { this.setFree(p); p.x = x; p.y = y; p.f = f === undefined ? 0 : f; },
  park(...ids) { for (const id of ids) { this.m.parked.add(id); } },
  give(p) { this.m.give(p, 'drill'); },
  /** a step of progress toward the goal ('k' up to n); the drill is done when every count reaches its target */
  add(k, n = 1) { this.prog[k] = (this.prog[k] || 0) + n; this.check(); },
  check() { const G0 = this.D.goal; if (this.showing && Object.keys(G0).every(k => (this.prog[k] || 0) >= G0[k])) { this.showing = false; this.shown = true; this.prog = {}; this.say('YOUR TURN!', 2); this.resetT = 1.6; return; } if (Object.keys(G0).every(k => (this.prog[k] || 0) >= G0[k]) && !this.doneT) { this.doneT = .001; this.say('DRILL COMPLETE!'); TT.sound.sting('win'); const d = Object.assign({}, TT.store.get('thugby:drills', {}) || {}); d[this.id] = true; if (!TT.noStore) TT.store.set('thugby:drills', d); TT.bus.emit('drillDone', { id: this.id }); } },
  say(t, s = 2) { this.msg = t; this.msgT = s; },
  fail(t) { if (this.resetT > 0 || this.doneT) return; this.say(t, 1.6); this.resetT = 1; },
  done() { return !!this.doneT; },
  state() { return this.m ? { id: this.id, prog: Object.assign({}, this.prog), goal: this.D.goal, done: !!this.doneT, showing: this.showing, rep: this.rep } : null; },
  update(dt) {
    const m = this.m; if (!m) return;
    this.t += dt; this.msgT = Math.max(0, this.msgT - dt);
    if (this.doneT) {
      this.doneT += dt;
      if (this.doneT > 2.5 && !this.autoplay) { const i = TT.DRILLS.findIndex(d => d.id === this.id); const next = TT.DRILLS[i + 1]; const md = MS.data; TT.game.go(next ? 'match' : 'training', next ? Object.assign({}, md, { drill: next.id }) : { cup: md.cupTraining, i: 0 }); }
      return;
    }
    if (this.resetT > 0) { this.resetT -= dt; if (this.resetT <= 0) this.reset(); return; }
    // SHOW ME: the coach's AI plays it once (△, or the pause menu); any button takes it back
    const s = this.seat(), I = s && s.I;
    if (s && !this.showing && this.D.showKey !== false && s.input.pressed('tri') && this.id !== 'turbo') { this.showing = true; this.bot = {}; this.reset(); this.say('WATCH ME, YOU MUPPETS', 2); }
    if (this.showing && s && (s.input.pressed('confirm') || s.input.pressed('cancel')) && this.t > .5) { this.showing = false; this.prog = {}; this.reset(); this.say('YOUR TURN', 1.5); }
    if ((this.showing || this.autoplay) && s) { this.drive(I, dt); }
    if (this.D.tick) this.D.tick.call(this, m, dt);
    if (this.showing && this.doneT) this.showing = false;
  },
  /** the bot's intent for the drill (SHOW ME and the tests) */
  drive(I, dt) {
    const B = this.bot; B.t = (B.t || 0) + dt; B.held = B.held || {}; B.tap = {};
    I.mx = 0; I.my = 0; I.turbo = false; I.click = null; I.mkick = null; I.aim = null; I.aimY = null; I.mhold = false; I.placeMove = 0; I.aimMove = 0; I.cmd = null;
    const press = k => { B.tap[k] = true; };
    const hold = (k, on) => { B.held[k] = on; };
    const seek = (x, y, turbo) => { const p = this.me(); if (!p) return; const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy); if (d > 3) { I.mx = dx / d; I.my = dy / d; } I.turbo = !!turbo; };
    this.D.auto.call(this, this.m, I, { press, hold, seek, B, dt });
    // a tap is down for one step; a hold until let go: pressed and released follow
    const was = B.was || {}, now = {};
    I.pr = {}; I.rl = {}; I.hd = {};
    for (const k of PBTN) { now[k] = !!B.held[k] || !!B.tap[k]; I.hd[k] = now[k]; if (now[k] && !was[k]) I.pr[k] = true; if (!now[k] && was[k]) I.rl[k] = true; }
    B.was = now;
  },
  draw(r) {
    const m = this.m; if (!m) return;
    r.overlay(g => {
      const D = TT.DRILLS.find(d => d.id === this.id), I = TT.game.input, cx = r.W / 2;
      UI.panel(g, cx - 150, r.H - 64, 300, 32, { alpha: .9, bg: ['#2a1a10', '#140c08'], border: '#e8c040' });
      UI.prompt(g, D.coach, cx - 144, r.H - 60, I, {});
      const G0 = this.D.goal, parts = Object.keys(G0).map(k => (this.D.names && this.D.names[k] || k.toUpperCase()) + ' ' + Math.min(G0[k], this.prog[k] || 0) + '/' + G0[k]);
      UI.txt(g, parts.join('   '), cx, r.H - 46, '#ffe7a8', { align: 'center', font: 'tiny' });
      FONT.title(g, 'DRILL ' + (TT.DRILLS.indexOf(D) + 1) + ': ' + D.name, cx, 52, { align: 'center', scale: 2, colors: ['#ffffff', '#b0f0a0', '#3a8a3a'] });
      if (this.msgT > 0) FONT.title(g, this.msg, cx, r.H * .3, { align: 'center', scale: this.msg.length > 16 ? 2 : 3, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      UI.prompt(g, (this.id !== 'turbo' ? '{b:tri} SHOW ME   ' : '') + '{b:start} MENU', r.W - 6, r.H - 20, I, { align: 'right', bg: 'rgba(0,0,0,.5)' });
      if (this.showing) UI.prompt(g, 'COACH IS PLAYING  -  {b:confirm} TAKE OVER', cx, 72, TT.game.input, { align: 'center', bg: 'rgba(0,0,0,.5)' });
    });
    // the cones and markers of the drill
    if (this.D.marks) this.D.marks.call(this, r, m);
  }
};
const d1 = (m, t = 0) => m.dir[t];
const DRILL = {
  legs: {
    goal: { tries: 1 }, names: { tries: 'DIVE OVER' },
    setup(m) { const p = m.players[6]; this.hero = 6; this.put(p, m.ownLine(0) + G.L22, G.CY + 40, 0); this.give(p); this.park(...m.players.filter(q => q.id !== 6).map(q => q.id)); },
    on(n, d, m) { if (n === 'try') { if (d.how === 'dive') this.add('tries'); else this.fail('DIVE WITH THE BUTTON!'); if (!this.doneT) this.resetT = 1.2; } },
    tick(m) { if (m.phase !== 'play' && m.phase !== 'try' && !this.resetT) this.fail('AGAIN!'); },
    auto(m, I, A) { const p = this.me(); if (!p) return; A.seek(m.oppLine(0) + 40, G.CY, true); if (m.inGoal(0, p.x)) A.press('x'); },
    marks(r, m) { r.decal(() => { for (let x = m.ownLine(0) + G.L22 + 80; x < G.X1; x += 120) { r.groundDisc(x, G.CY + 70, 3, '#ff8030', .9); r.groundDisc(x, G.CY + 10, 3, '#ff8030', .9); } }); }
  },
  hands: {
    goal: { up: 2, down: 2, passes: 5, long: 1 }, names: { up: 'UP', down: 'DOWN', passes: 'PASSES', long: 'LONG' },
    setup(m) {
      const ids = [3, 4, 5, 6, 1];
      ids.forEach((id, i) => this.put(m.players[id], G.X0 + 200 - i * 16 * (i % 2 ? 1 : 0), G.CY - 120 + i * 60, 0));
      this.give(m.players[3]); this.hero = 3;
      this.park(...m.players.filter(q => q.team === 1 || !ids.includes(q.id)).map(q => q.id));
    },
    on(n, d, m) {
      if (n === 'pass' && m.players[d.id].team === 0) { this.pend = d; }
      if (n === 'catch' && this.pend && m.players[d.id].team === 0 && d.how === 'pass') { const pd = this.pend; this.pend = null; const side = m.players[pd.to] && m.players[pd.from === undefined ? pd.id : pd.id] ? (m.players[d.id].y < m.players[pd.id].y ? 'up' : 'down') : 'up'; this.add(side); this.add('passes'); if (pd.long) this.add('long'); }
      if (n === 'forwardPass') this.fail('FORWARD! BACKWARDS ONLY, YOU MUPPET!');
      if (n === 'knockOn') this.fail('BUTTER FINGERS! AGAIN!');
    },
    tick(m) { const c = m.carrier(); if (c && c.x > G.X1 - 120) this.reset(); if (m.phase !== 'play' && !this.resetT) this.fail('AGAIN!'); },
    auto(m, I, A) {
      const B = A.B, c = m.carrier(); if (!c) return;
      A.seek(c.x + 60, c.y);
      B.n = B.n || 0; B.next = B.next || .9;
      if (B.t > B.next && c.st === 'free') {
        B.next = B.t + 1.0;
        const ups = this.prog.up || 0, downs = this.prog.down || 0, total = this.prog.passes || 0;
        const k = total >= 4 && !this.prog.long ? (c.y > G.CY ? 'l1' : 'r1') : (ups <= downs ? 'l1' : 'r1');
        if (total >= 4 && !this.prog.long) { A.hold(k, true); B.longK = k; B.longT = B.t; }
        else A.press(k);
      }
      if (B.longK && B.t - B.longT > .32) { A.hold(B.longK, false); B.longK = null; }
    }
  },
  feet: {
    goal: { steps: 2, spins: 1, fends: 1 }, names: { steps: 'SIDESTEPS', spins: 'SPIN', fends: 'FEND' },
    setup(m) {
      const p = m.players[5]; this.put(p, G.CX - 200, G.CY, 0); this.give(p); this.hero = 5;
      const bags = [7, 8, 9]; bags.forEach((id, i) => this.put(m.players[id], G.CX - 80 + i * 60, G.CY + (i % 2 ? 24 : -24), PI));
      this.put(m.players[12], G.CX + 160, G.CY, PI);
      this.park(...m.players.filter(q => q.id !== 5 && q.id !== 12).map(q => q.id));
    },
    on(n, d, m) {
      if (n === 'sidestep' && m.players[d.id].team === 0) this.add('steps');
      if (n === 'spin' && m.players[d.id].team === 0) this.add('spins');
      if (n === 'fend' && m.players[d.id].team === 0) this.add('fends');
      if ((n === 'tackle' || n === 'bigHit' || n === 'diveTackle') && m.players[d.on] && m.players[d.on].team === 0) this.fail('FEND HIM OFF! SQUARE!');
    },
    tick(m) {
      const c = m.carrier(), d = m.players[12];
      if (c && c.team === 0 && dist(d, c) > 34 && d.st === 'free') m.forced[12] = { t: m.t + .05, I: m.seek(d, c.x + c.vx * .3, c.y + c.vy * .3, true) };
      if ((c && c.x > G.CX + 300) || (m.phase !== 'play' && !this.resetT)) this.fail('AGAIN!');
    },
    auto(m, I, A) {
      const B = A.B, p = this.me(); if (!p) return;
      A.seek(G.CX + 320, G.CY);
      const steps = this.prog.steps || 0, spins = this.prog.spins || 0;
      if (steps < 2 && B.t > .5 + steps * .8 && !B['s' + steps]) { B['s' + steps] = 1; A.press('x'); I.my = steps ? 1 : -1; }
      else if (steps >= 2 && !spins && !B.sp1 && B.t > 2.2) { B.sp1 = B.t; A.press('x'); }
      else if (B.sp1 && !B.sp2 && B.t - B.sp1 > .12) { B.sp2 = 1; A.press('x'); }
      const d = m.players[12]; if (d && dist(d, p) < 22 && Math.abs(angDiff(p.f, angTo(p, d))) < 1.4 && p.fendCd <= 0 && p.fendT <= 0) A.press('sq');
    }
  },
  hit: {
    goal: { switch: 1, tackle: 1, big: 1, dive: 1 }, names: { switch: 'SWITCH', tackle: 'TACKLE', big: 'BIG HIT', dive: 'DIVE' },
    setup(m) {
      const r = this.prog, kind = !r.switch ? 'switch' : !r.tackle ? 'tackle' : !r.big ? 'big' : 'dive';
      this.kind = kind;
      const c = m.players[13]; this.put(c, G.CX + 200, G.CY, PI); this.give(c);
      const me = m.players[5]; this.put(me, kind === 'dive' ? G.CX + 120 : G.CX - 20, kind === 'dive' ? G.CY + 4 : G.CY, kind === 'dive' ? PI : 0);
      const mate = m.players[2]; this.put(mate, G.CX + 60, G.CY + 120, 0);
      this.park(...m.players.filter(q => ![13, 5, 2].includes(q.id) || (q.id === 2 && kind !== 'switch')).map(q => q.id));
      this.hero = 5; m.forced = {};
    },
    on(n, d, m) {
      if (n === 'switch' && !d.auto && d.seat === 0) this.add('switch');
      const mine = d.id !== undefined && m.players[d.id] && m.players[d.id].team === 0 && m.players[d.id].ctl >= 0;
      if (n === 'tackle' && mine) { this.add('tackle'); this.resetT = .9; }
      if ((n === 'bigHit' || n === 'monsterHit') && mine) { this.add('big'); this.resetT = .9; }
      if (n === 'diveTackle' && mine) { this.add('dive'); this.resetT = .9; }
      if (n === 'diveTackle' && mine) this.add('tackle', 0);
    },
    tick(m) {
      const c = m.carrier();
      // the runner comes straight at the line
      if (c && c.team === 1) m.forced[c.id] = { t: m.t + .05, I: Object.assign(TT.emptyIntent(), { mx: this.kind === 'dive' ? -1 : -.8, my: this.kind === 'dive' ? 0 : Math.sin(m.t * 2) * .3 }) };
      if (c && c.x < G.CX - 260) this.fail('HE GOT PAST YOU!');
      if (m.phase !== 'play' && !this.resetT) { this.resetT = .9; }
    },
    auto(m, I, A) {
      const B = A.B, c = m.carrier(), p = this.me(); if (!c || !p) return;
      if (this.kind === 'switch') { if (!B.sw) { B.sw = 1; A.press('ci'); } return; }
      const d = dist(p, c), lead = d > 40 ? .2 : 0;
      A.seek(c.x + c.vx * lead, c.y + c.vy * lead, this.kind === 'dive');
      if (this.kind === 'tackle' && d < 12 && p.st === 'free' && p.cool <= 0 && (!B.tk || B.t - B.tk > .5)) { B.tk = B.t; A.press('x'); }
      if (this.kind === 'big') { if (d < 48 && !B.ch) { B.ch = 1; A.hold('x', true); } if (B.ch && d < 15) A.hold('x', false); }
      if (this.kind === 'dive' && d < 24 && !B.dv) { B.dv = 1; A.press('sq'); }
    }
  },
  ruck: {
    goal: { won: 2, jackal: 1 }, names: { won: 'RUCKS WON', jackal: 'JACKAL' },
    setup(m) {
      const def = (this.prog.won || 0) >= 2;
      this.def = def;
      if (!def) {
        const me = m.players[5]; this.put(me, G.CX - 60, G.CY, 0); this.give(me); this.hero = 5;
        this.put(m.players[12], G.CX + 30, G.CY, PI); this.put(m.players[1], G.CX - 120, G.CY + 30, 0); this.put(m.players[3], G.CX - 110, G.CY - 40, 0);
        this.park(...m.players.filter(q => ![5, 12, 1, 3].includes(q.id)).map(q => q.id));
      } else {
        const c = m.players[12]; this.put(c, G.CX, G.CY, PI); this.give(c);
        const tk = m.players[2]; this.put(tk, G.CX - 10, G.CY, 0);
        const me = m.players[5]; this.put(me, G.CX + 8, G.CY + 12, Math.PI / 2); this.hero = 5; const s = this.seat(); if (s && s.pid !== 5) m.assign(s, 5);
        this.park(...m.players.filter(q => ![12, 2, 5].includes(q.id)).map(q => q.id));
        this.m.tackled(tk, c, 'tackle');
      }
    },
    on(n, d, m) {
      if (n === 'ruckWon' && !this.def) { if (d.team === 0) { this.add('won'); this.resetT = 1; } else this.fail('MASH HARDER!'); }
      if (n === 'jackal' && m.players[d.id].team === 0) { this.add('jackal'); this.resetT = 1.2; }
      if (n === 'ruckWon' && this.def && !this.resetT) this.fail('FIRST MAN IN: SQUARE TO JACKAL!');
      if (n === 'handsInRuck' && this.def) this.fail('TOO LATE! HANDS AWAY!');
    },
    tick(m) {
      if (!this.def) { const c = m.carrier(); if (c && c.team === 0 && c.x > G.CX + 160) this.fail('GET TACKLED, THEN WIN THE RUCK!'); }
      if (m.phase !== 'play' && m.phase !== 'ruck' && !this.resetT) this.resetT = 1;
    },
    auto(m, I, A) {
      const B = A.B;
      if (m.phase === 'ruck') { B.mT = (B.mT || 0) + A.dt; if (B.mT > 1 / 13) { B.mT = 0; A.press(this.def ? 'sq' : 'x'); } return; }
      if (!this.def) A.seek(G.CX + 100, G.CY);
    }
  },
  boot: {
    goal: { grubber: 1, touch: 1, drop: 1 }, names: { grubber: 'GRUBBER', touch: 'TO TOUCH', drop: 'DROP GOAL' },
    setup(m) {
      const r = this.prog, kind = !r.grubber ? 'grubber' : !r.touch ? 'touch' : 'drop'; this.kind = kind;
      const me = m.players[4];
      if (kind === 'grubber') this.put(me, G.X1 - 220, G.CY, 0);
      else if (kind === 'touch') this.put(me, G.CX - 120, G.CY + 120, 0);
      else this.put(me, G.X1 - 307, G.CY + 10, 0);
      this.give(me); this.hero = 4; this.park(...m.players.filter(q => q.id !== 4).map(q => q.id));
    },
    on(n, d, m) {
      if (n === 'kick' && m.players[d.id].team === 0 && this.kind === 'grubber' && d.kind === 'grubber') { this.add('grubber'); this.resetT = 2; }
      if (n === 'kickTouch' && this.kind === 'touch') { this.add('touch'); this.resetT = 1; }
      if (n === 'dropGoal' && this.kind === 'drop') { this.add('drop'); this.resetT = 1.4; }
      if (n === 'dropMiss' && this.kind === 'drop') this.fail('WIDE! AGAIN!');
    },
    tick(m) { if (m.phase !== 'play' && !this.resetT) this.resetT = 1; const b = m.ball; if (this.kind !== 'grubber' && b.st === 'loose' && b.t > 2.5 && !this.resetT) this.fail('AGAIN!'); },
    auto(m, I, A) {
      const B = A.B, p = this.me(); if (!p || m.carrier() !== p) return;
      if (this.kind === 'grubber' && B.t > .5 && !B.k) { B.k = 1; A.press('ci'); }
      if (this.kind === 'touch') { I.mx = .3; I.my = 1; if (B.t > .4 && !B.k) { B.k = 1; A.hold('ci', true); B.kt = B.t; } if (B.k && B.t - B.kt > .8) A.hold('ci', false); }
      if (this.kind === 'drop') { I.mx = 1; I.my = (G.CY - p.y) / 100; if (B.t > .6 && !B.k) { B.k = 1; A.hold('ci', true); B.kt = B.t; } if (B.k && B.t - B.kt > .85) { I.my = 0; A.hold('ci', false); } }
    }
  },
  set: {
    goal: { scrum: 1, lineout: 1 }, names: { scrum: 'SCRUM', lineout: 'LINEOUT' },
    setup(m) { const kind = this.prog.scrum ? 'lineout' : 'scrum'; this.kind = kind; for (const p of m.players) this.put(p, G.CX + (p.team ? 60 : -60), G.CY + (p.slot - 3) * 40, p.team ? PI : 0); this.hero = 1; const s = this.seat(); if (s && s.pid !== 1) m.assign(s, 1); if (kind === 'scrum') m.scrumSetup(0, G.CX, G.CY); else m.lineoutSetup(0, G.CX, G.Y0); },
    on(n, d, m) {
      if (n === 'scrumWon' && this.kind === 'scrum') { if (d.team === 0) { this.add('scrum'); this.resetT = 1; } else this.fail('PUSH! ALTERNATE THE SHOULDERS!'); }
      if (n === 'pushover' || n === 'collapse') { if (this.kind === 'scrum') { if (d.team === 0 || (n === 'collapse' && d.team === 1)) { this.add('scrum'); this.resetT = 1.2; } } }
      if (n === 'earlyEngage' && this.kind === 'scrum') this.fail('TOO EARLY! WAIT FOR "SET!"');
      if (n === 'lineoutWon' && this.kind === 'lineout') { if (d.team === 0) { this.add('lineout'); this.resetT = 1; } else this.fail('STOLEN! AGAIN!'); }
      if (n === 'notStraight') this.fail('NOT STRAIGHT! STOP IT IN THE GREEN!');
    },
    tick(m) { if (m.phase === 'play' && !this.resetT && m.phaseT > 1.2) this.resetT = .5; },
    auto(m, I, A) {
      const S = m.setp, B = A.B; if (!S) return;
      if (S.kind === 'scrum') { if (S.sub === 'set' && !B.st) { B.st = 1; A.press('x'); } if (S.sub === 'push') { B.pT = (B.pT || 0) + A.dt; if (B.pT > 1 / 12) { B.pT = 0; B.alt = !B.alt; A.press(B.alt ? 'l1' : 'r1'); } } }
      if (S.kind === 'lineout') { if (S.sub === 'call' && S.t > .6 && !B.c) { B.c = 1; A.press('x'); } if (S.sub === 'throw' && Math.abs(S.needle - .5) < .06 && S.t > .2 && !B.th) { B.th = 1; A.press('x'); } }
    }
  },
  posts: {
    goal: { conv: 1 }, names: { conv: 'CONVERTED' },
    setup(m) { for (const p of m.players) this.put(p, G.X1 - 200, G.CY + (p.slot - 3) * 30, 0); this.hero = 4; const s = this.seat(); if (s && s.pid !== 4) m.assign(s, 4); m.setKickSetup(0, G.X1, G.Y0 + 70, 'conv'); },
    on(n, d, m) { if (n === 'convMade') { this.add('conv'); this.resetT = 1.2; } if (n === 'convMissed' || n === 'doinkMiss') this.fail(n === 'doinkMiss' ? 'DOINK! AGAIN!' : 'WIDE! AGAIN!'); },
    tick(m) { if (m.phase !== 'setkick' && !this.resetT && !this.doneT) this.resetT = 1; },
    auto(m, I, A) {
      const S = m.setp, B = A.B; if (!S || S.kind !== 'setkick') return;
      if (S.sub === 'place') { I.placeMove = S.d < 160 ? 1 : 0; if (S.d >= 160 && !B.p) { B.p = 1; A.press('x'); } }
      if (S.sub === 'aim' || S.sub === 'power') { I.aimMove = clamp(-(S.aim + S.sway) / 20, -1, 1) * (TT.MS.ctx ? TT.MS.ctx.aimSign || 1 : 1); if (!B.c && S.t > .6) { B.c = 1; A.hold('ci', true); } if (B.c && S.power >= .88) A.hold('ci', false); }
    }
  },
  turbo: {
    goal: { pie: 1, thunder: 1, tries: 1 }, names: { pie: 'PIE', thunder: 'THUNDER RUN', tries: 'TRY' }, showKey: false,
    setup(m) {
      const me = m.players[5]; this.put(me, G.CX - 160, G.CY, 0); this.give(me); this.hero = 5; m.hype[0] = 100;
      [8, 9, 12].forEach((id, i) => this.put(m.players[id], G.CX + 140 + i * 90, G.CY + (i - 1) * 30, PI));
      this.park(...m.players.filter(q => ![5, 8, 9, 12].includes(q.id)).map(q => q.id));
      const q = m.throwPowerup('pie', { x: G.CX - 40, y: G.CY - 40 }); q.on = true; q.t = 0; q.chaser = -2;
      this.got = false;
    },
    on(n, d, m) {
      if (n === 'powerupTake' && d.kind === 'pie' && m.players[d.id].team === 0) { this.add('pie'); this.got = true; }
      if (n === 'superStart' && d.kind === 'thunder' && m.players[d.id].team === 0) this.add('thunder');
      if (n === 'try' && m.players[d.id].team === 0) { if (this.prog.thunder) { this.add('tries'); } else this.fail('USE THE THUNDER RUN!'); this.resetT = 1.4; }
      if ((n === 'tackle' || n === 'bigHit' || n === 'monsterHit') && m.players[d.on] && m.players[d.on].team === 0) this.fail('TAKE THE PIE, THEN THE THUNDER RUN!');
    },
    tick(m) { if (m.phase !== 'play' && m.phase !== 'try' && !this.resetT) this.resetT = 1; },
    auto(m, I, A) {
      const B = A.B, p = this.me(); if (!p) return;
      if (!this.got) { A.seek(G.CX - 40, G.CY - 40, true); return; }
      if (!B.s) { B.s = 1; A.press('tri'); }
      A.seek(m.oppLine(0) + 40, G.CY, true);
      if (m.inGoal(0, p.x)) A.press('x');
    }
  }
};
TT.DRILL = DRILL;
