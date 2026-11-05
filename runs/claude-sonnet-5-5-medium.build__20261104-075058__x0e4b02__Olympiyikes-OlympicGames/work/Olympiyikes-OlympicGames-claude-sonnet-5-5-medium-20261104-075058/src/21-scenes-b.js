// Olympiyikes! scenes B: play (the event scene), turn card, results, initials, podium, medal table, torch, closing.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, clamp = E.clamp;

// ================================================================ PLAY: runs every human's turn in an event (or a bot in attract/hub)
O.restartEvent = () => { if (O.cur === 'play' && O.playData) { game.resume && game.resume(); O.go('play', O.playData, { fade: 0 }); } else game.note('Not in an event'); };
O.showHelp = () => { if (O.cur === 'play' && O.playRun) { game.resume && game.resume(); O.helpT = 6; } else game.note('Not in an event'); };

O.scene('play', {
  pausable: true, lock: .1, view: 'side',
  enter(d) {
    this.d = d; O.playData = d; this.ev = O.EV[d.ev]; this.m = O.meet; this.queue = d.attract || d.hub ? [-1] : d.humans.slice(); this.k = -1; this.scores = {}; this.state = 'none'; this.timer = 0; this.run = null; this.attract = !!d.attract;
    O.Comms.clear(); O.Fireworks.clear(); game.setView(this.ev.view || 'side'); game.resetCamera(); game.cam.smooth = .06; if (this.ev.zoom) game.setZoom(this.ev.zoom); game.weather = this.ev.venue === 'snow' ? { kind: 'snow', amount: .35, wind: .1 } : null;
    this.nextTurn(); O.helpT = 0;
  },
  exit() { O.playRun = null; game.weather = null; },
  nextTurn() {
    this.k++;
    if (this.k >= this.queue.length) return this.finishAll();
    const h = this.queue[this.k], m = this.m;
    this.hIdx = h; const nat = h >= 0 ? O.NAT[m.humans[h].nat] : (this.d.hub ? O.NAT[this.d.nat] : O.NATIONS[(Math.floor(O.crnd() * 8))]);
    this.pIdx = h >= 0 ? m.humans[h].p : -1;
    this.pendingNat = nat; this.pendingBot = h < 0; this.run = null;
    if (this.attract || this.d.hub) this.beginRun(); else { this.state = 'card'; this.timer = 0; O.music(this.ev.season === 'summer' ? 'summer' : 'winter'); }
  },
  beginRun() {
    const d = this.d, ev = this.ev; this.run = new O.Run(ev, this.pendingNat, { p: this.pIdx, bot: this.pendingBot, quiet: false });
    O.playRun = this.run; this.state = 'run'; this.timer = 0; O.music(ev.music); O.helpT = 0;
    if (ev.rivalsNeeded) { /* none */ }
    if (O.Hub && d.hub) O.Hub.runStarted(this.run);
  },
  update(dt) {
    if (!this.attract && O.anyInput && 0) return;
    if (this.attract) { if ((O.anyInput() || game.input.clicked()) && !O.locked()) { O.Attract.stop(); return O.go('title', null, { fade: 'white' }); } }
    if (this.state === 'card') {
      this.timer += dt; const skip = !O.locked() && (O.pressedAny('confirm') || game.input.clicked()) && this.timer > .4;
      if (this.timer > 2.2 || skip) this.beginRun();
      return;
    }
    if (this.state === 'run') {
      const run = this.run, p = run.p >= 0 ? O.pi(run.p) : null;
      let inp = run.bot || !p ? O.emptyInput() : O.readInput(p, run);
      if (run.bot || !p) this.ev.bot(run, inp, dt);
      if (O.helpT > 0) O.helpT -= dt;
      O.stepRun(run, dt, inp);
      if (O.Hub && this.d.hub) O.Hub.tick(run, dt);
      if (run.done) { this.state = 'end'; this.timer = 0; this.scores[this.hIdx] = { v: run.score, note: run.note }; if (run.score !== null) { /* crowd reaction */ O.crowd(1); } }
    } else if (this.state === 'end') {
      this.timer += dt; this.ev.update(this.run, dt, O.emptyInput(), true);
      const wait = this.attract ? 3.2 : 2.6;
      if (this.timer > wait || (!this.attract && this.timer > 1.0 && !O.locked() && O.pressedAny('confirm'))) this.nextTurn();
    }
  },
  finishAll() {
    this.state = 'over';
    if (this.attract) { O.Attract.next(); return; }
    if (this.d.hub) { O.Hub.finished(this.run, this.scores[-1]); return; }
    O.flow.afterPlay(this.ev.id, this.scores, !!this.d.practice);
  },
  draw(r) {
    const ev = this.ev;
    if (this.state === 'card') { this.drawCard(r); return; }
    if (!this.run) { r.sky(['#101a50', '#223a8a']); return; }
    const run = this.run; ev.draw(run, r);
    r.overlay(g => {
      if (O.cheat.showHit) { const keys = Object.keys(run.S).filter(k => typeof run.S[k] === 'number' || typeof run.S[k] === 'boolean' || typeof run.S[k] === 'string').slice(0, 14); keys.forEach((k, i) => { const v = run.S[k]; O.T(g, k + ' ' + (typeof v === 'number' ? v.toFixed(2) : v), r.W - 4, 64 + i * 8, '#4fe0a8', { s: 1, align: 'right' }); }); }
      O.hud(g, r, run); if (ev.hudExtra) ev.hudExtra(run, g, r); O.hudPrompts(g, r, run);
      if (this.attract) { const a = (Math.sin(game.real * 4) + 1) / 2; px.rect(g, 0, r.H - 22, r.W, 22, 'rgba(8,10,34,.8)'); O.T(g, 'ATTRACT MODE • PRESS ANY BUTTON', r.W / 2, r.H - 16, a > .3 ? '#ffe27a' : '#8a7a40', { s: 1, align: 'center' }); }
      if (!this.attract && game.settings.hints === 'On' && (run.t < 5.5 || O.helpT > 0) && !run.S.over) { const tw = O.wrap(ev.goal, r.W - 200, 1); const y0 = r.H - 40 - tw.length * 10; px.rect(g, 90, y0 - 3, r.W - 180, tw.length * 10 + 6, 'rgba(10,12,44,.75)'); tw.forEach((l, i) => O.T(g, l, r.W / 2, y0 + i * 10, '#dfe6ff', { s: 1, align: 'center' })); }
      if (run.done && this.state === 'end') {
        const sc = run.score; const ok = sc !== null && sc !== ev.fail; const t = this.timer;
        const txt = ok ? ev.fmt(sc) : 'NO MARK'; O.banner(g, r, txt, r.H * .22, ok ? '#ffe27a' : '#ff8a7a', 4, clamp(t * 3, 0, 1));
        if (run.note) O.T(g, run.note, r.W / 2, r.H * .22 + 42, '#cfd8ff', { s: 1, align: 'center' });
      }
    });
  },
  drawCard(r) {
    const nat = this.pendingNat; r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      const col = this.pIdx >= 0 ? E.PLAYER_COLORS[this.pIdx] : '#fff'; O.stars(g, r, 40, 8);
      O.flag(g, r.W / 2 - 40, 40, 80, 52, nat);
      const multi = this.m.humans.length > 1 || this.pIdx > 0;
      O.T(g, (multi ? 'P' + (this.pIdx + 1) + ' - YOUR TURN' : 'GET READY'), r.W / 2, 108, col, { s: 3, align: 'center' });
      O.T(g, nat.athlete.name + ' • ' + nat.name, r.W / 2, 136, '#fff', { s: 2, align: 'center' });
      if (this.queue.length > 1) O.T(g, 'TURN ' + (this.k + 1) + ' OF ' + this.queue.length, r.W / 2, 160, '#ffe27a', { s: 1, align: 'center' });
      O.picto(g, this.ev.id, r.W / 2, r.H - 40, 1.2);
    });
  }
});

// ================================================================ RESULTS
O.scene('results', {
  lock: .8, view: 'brawler',
  enter(d) { this.d = d; this.t = 0; this.ev = O.EV[d.ev]; game.setView('brawler'); O.music('ceremony'); const best = d.rows.find(r => r.human && r.wr); if (best) { O.sfx('ol_record'); O.Fireworks.burst(120, 80); O.Fireworks.burst(300, 90); } },
  update(dt) { this.t += dt; if (!O.locked() && (O.pressedAny('confirm') || game.input.clicked())) { O.sfx('confirm'); O.flow.afterResults(this.d); } },
  draw(r) {
    r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      O.stars(g, r, 40, 2); const ev = this.ev, rows = this.d.rows;
      O.T(g, ev.name.toUpperCase() + (this.d.practice ? ' • PRACTICE' : ' • RESULTS'), r.W / 2, 8, '#ffe27a', { s: 2, align: 'center' });
      const rowH = 24, y0 = 30, x0 = 24, w = r.W - 48;
      rows.slice(0, 8).forEach((row, i) => {
        const vis = this.t > i * .13; if (!vis) return; const y = y0 + i * rowH, nat = O.NAT[row.nat];
        px.rect(g, x0, y, w, rowH - 3, row.human ? 'rgba(40,60,160,.9)' : 'rgba(10,14,50,.82)'); if (row.human) px.rect(g, x0, y, 3, rowH - 3, E.PLAYER_COLORS[row.p]);
        O.T(g, row.rank + '', x0 + 10, y + 5, row.rank <= 3 ? '#ffe27a' : '#fff', { s: 2 });
        if (row.medal) { px.disc(g, x0 + 40, y + 10, 8, ['#c98a1a', '#ffd23a', '#d8dce6', '#c9884a'][row.medal]); px.disc(g, x0 + 40, y + 10, 6, ['#c98a1a', '#ffe27a', '#f0f2f8', '#e0a070'][row.medal]); O.T(g, row.medal + '', x0 + 40, y + 6, '#6a4a10', { s: 1, align: 'center', shadow: false }); }
        O.flag(g, x0 + 54, y + 3, 24, 16, nat); O.T(g, nat.id, x0 + 84, y + 5, '#fff', { s: 2 });
        O.T(g, row.human ? 'P' + (row.p + 1) + ' ' + nat.athlete.name : nat.athlete.name, x0 + 130, y + 8, row.human ? '#fff' : '#cfd8ff', { s: 1 });
        const val = row.v === null || row.v === undefined ? '--' : ev.fmt(row.v); O.T(g, val, x0 + w - 8, y + 5, '#ffe27a', { s: 2, align: 'right' });
        if (row.wr) O.T(g, 'WORLD RECORD', x0 + w - 110, y + 15, '#ff8a3a', { s: 1, align: 'right' }); else if (row.human && ev.qual !== undefined && O.meet && O.meet.qualOn) O.T(g, O.Records.better(ev, row.v, ev.qual) ? 'Q' : '', x0 + w - 110, y + 15, '#4fe0a8', { s: 1, align: 'right' });
      });
      O.strip(g, r, [['confirm', 'Continue']], 0);
    });
  }
});

// ================================================================ INITIALS (arcade letter wheel)
O.scene('initials', {
  lock: .6, view: 'side',
  enter(d) { this.d = d; this.i = d.i; this.row = d.recs[d.i]; this.ev = O.EV[d.ev]; const last = O.store.get('lastName', 'AAA'); this.letters = last.split('').map(c => c.charCodeAt(0) - 65); this.pos = 0; O.music('title'); },
  update(dt) {
    if (O.locked()) return; const pi = O.pi(Math.max(0, this.row.p));
    if (pi.repeat('up', .3, .1)) { this.letters[this.pos] = (this.letters[this.pos] + 1) % 26; O.sfx('select'); } if (pi.repeat('down', .3, .1)) { this.letters[this.pos] = (this.letters[this.pos] + 25) % 26; O.sfx('select'); }
    if (pi.repeat('right', .3, .1)) { this.pos = Math.min(2, this.pos + 1); } if (pi.repeat('left', .3, .1)) { this.pos = Math.max(0, this.pos - 1); }
    if (pi.pressed('confirm') || pi.pressed('action')) { if (this.pos < 2) { this.pos++; O.sfx('confirm'); } else this.done(); }
  },
  done() { const nm = this.letters.map(l => String.fromCharCode(65 + l)).join(''); O.store.set('lastName', nm); O.Records.add(this.ev, this.row.v, nm, this.row.nat); O.sfx('ol_medal'); const d = Object.assign({}, this.d, { i: this.i + 1 }); if (d.i < d.recs.length) O.go('initials', d); else O.flow.afterInitials(d); },
  draw(r) {
    r.sky(['#101a50', '#2a2c78']);
    r.overlay(g => {
      O.stars(g, r, 40, 5); O.T(g, 'NEW TOP-5 SCORE!', r.W / 2, 24, '#ffe27a', { s: 3, align: 'center' }); O.T(g, this.ev.name.toUpperCase() + ' • ' + this.ev.fmt(this.row.v), r.W / 2, 56, '#fff', { s: 2, align: 'center' });
      O.T(g, 'P' + (this.row.p + 1) + ' ENTER YOUR INITIALS', r.W / 2, 80, E.PLAYER_COLORS[this.row.p], { s: 1, align: 'center' });
      for (let k = 0; k < 3; k++) { const x = r.W / 2 - 66 + k * 46, sel = k === this.pos; px.rect(g, x, 100, 38, 52, sel ? '#274199' : 'rgba(10,14,50,.85)'); px.rect(g, x, 100, 38, 2, sel ? '#f2b632' : '#445'); O.T(g, String.fromCharCode(65 + this.letters[k]), x + 19, 116, '#fff', { s: 4, align: 'center' }); if (sel) { O.T(g, '↑', x + 19, 90, '#ffe27a', { s: 1, align: 'center' }); O.T(g, '↓', x + 19, 154, '#ffe27a', { s: 1, align: 'center' }); } }
      O.strip(g, r, [[['up', 'down'], 'Letter'], ['confirm', 'Next / OK']], 0);
    });
  }
});

// ================================================================ MEDAL CEREMONY
O.scene('podium', {
  lock: 1.2, view: 'brawler',
  enter(d) {
    this.d = d; this.ev = O.EV[d.ev]; this.t = 0; game.setView('brawler'); const w = d.rows.slice(0, 3); this.w = w;
    this.rigs = w.map(rw => O.makeRig(O.NAT[rw.nat], { size: 1.3 })); const gold = O.NAT[w[0].nat]; O.music(O.anthemFor(gold)); O.Comms.sayRaw('BIFF', 'And the gold goes to ' + gold.name + '! Raise the flag, play the anthem, hold the tissues!', 5);
    O.sfx('ol_medal'); O.Fireworks.clear();
  },
  update(dt) {
    this.t += dt; const hts = [28, 36, 20];
    this.rigs.forEach((rg, i) => rg.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: i === 0 ? 'cheer' : 'wave', expr: 'smile' })); game.focus(0, 0, 40);
    if (this.t % 1.3 < dt) O.Fireworks.burst(50 + O.crnd() * 320, 36 + O.crnd() * 50);
    if (!O.locked() && this.t > 2 && (O.pressedAny('confirm') || game.input.clicked())) { O.Fireworks.clear(); O.flow.afterPodium(this.d); }
    if (this.t > 18) O.flow.afterPodium(this.d);
  },
  draw(r) {
    O.backdrop(this.ev.venue === 'hall' ? 'hall' : this.ev.season === 'summer' ? 'stadium' : 'night').draw(r);
    const order = [1, 0, 2], xs = [-34, 0, 34], hts = [20, 30, 14];
    r.decal(g => { const a = r.w(-300, 0, 0); O.stands(g, r, a[1] - 66, 56, 12, 1, 0); px.rect(g, 0, a[1] - 4, r.W, r.H, '#2a2f58'); order.forEach((wi, k) => { const p = r.w(xs[k] - 16, 0, hts[k] * 1), p2 = r.w(xs[k] + 16, 0, 0); px.rect(g, p[0], p[1], p2[0] - p[0], p2[1] - p[1] + 10, ['#ffd23a', '#d8dce6', '#c9884a'][wi]); px.rect(g, p[0], p[1], p2[0] - p[0], 3, '#fff6'); O.T(g, ['1', '2', '3'][wi], (p[0] + p2[0]) / 2, p[1] + 8, '#5a3a10', { s: 2, align: 'center', shadow: false }); }); });
    order.forEach((wi, k) => r.actor(xs[k], 0, hts[k] + 1, (g, ox, oy) => this.rigs[wi].draw(g, ox, oy, r.view)));
    r.overlay(g => {
      O.banner(g, r, 'MEDAL CEREMONY • ' + this.ev.name.toUpperCase(), 32, '#ffe27a', 2);
      order.forEach((wi, k) => { const row = this.w[wi], nat = O.NAT[row.nat], fx = r.W / 2 + xs[k] * 2.6 - 10; const rise = clamp((this.t - 1 - wi * .8) / 2, 0, 1); O.flag(g, r.W / 2 + (xs[k]) * 3.2 - 16, 70 + (1 - rise) * 40 + (wi === 0 ? 0 : 8), 32, 21, nat); });
      const row = this.w[0]; O.T(g, O.NAT[row.nat].athlete.name + ' • ' + this.ev.fmt(row.v), r.W / 2, r.H - 44, '#fff', { s: 1, align: 'center' });
      O.strip(g, r, [['confirm', 'Continue']], 0);
    });
  }
});

// ================================================================ MEDAL TABLE
O.scene('medals', {
  lock: .8, view: 'brawler',
  enter(d) { this.d = d; this.t = 0; game.setView('brawler'); this.tbl = O.medalTable(O.meet); O.music('ceremony'); const ev = O.EV[d.ev]; this.tick = ['Day ' + O.meet.day + ' • ' + ev.name + ' won by ' + O.NAT[d.rows[0].nat].name, 'Yikes count so far: ' + O.meet.yikes, 'Max Overdrive reminds everyone he is the defending champion', 'The mascot has been asked to stop dancing on the podium']; },
  update(dt) { this.t += dt; if (!O.locked() && (O.pressedAny('confirm') || game.input.clicked())) { O.sfx('confirm'); O.flow.afterMedals(); } },
  draw(r) {
    r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      O.stars(g, r, 40, 11); O.T(g, 'MEDAL TABLE', r.W / 2, 8, '#ffe27a', { s: 2, align: 'center' });
      const m = O.meet, mine = m.humans.map(h => h.nat), x0 = 30, w = r.W - 60, y0 = 30, rh = 22;
      O.T(g, 'G', x0 + w - 130, y0 - 2, '#ffd23a', { s: 1 }); O.T(g, 'S', x0 + w - 100, y0 - 2, '#d8dce6', { s: 1 }); O.T(g, 'B', x0 + w - 70, y0 - 2, '#e0a070', { s: 1 }); O.T(g, 'PTS', x0 + w - 36, y0 - 2, '#fff', { s: 1 });
      this.tbl.forEach((row, i) => { const y = y0 + 8 + i * rh, me = mine.includes(row.nat); if (this.t < i * .1) return; px.rect(g, x0, y, w, rh - 3, me ? 'rgba(50,80,190,.95)' : 'rgba(10,14,50,.82)'); if (me) px.rect(g, x0, y, 3, rh - 3, '#ffe27a'); O.T(g, (i + 1) + '', x0 + 10, y + 4, '#fff', { s: 2 }); O.flag(g, x0 + 32, y + 3, 24, 15, O.NAT[row.nat]); O.T(g, row.nat, x0 + 64, y + 4, '#fff', { s: 2 }); O.T(g, O.NAT[row.nat].name, x0 + 106, y + 8, '#cfd8ff', { s: 1 }); O.T(g, row.g + '', x0 + w - 130, y + 4, '#ffd23a', { s: 2 }); O.T(g, row.s + '', x0 + w - 100, y + 4, '#d8dce6', { s: 2 }); O.T(g, row.b + '', x0 + w - 70, y + 4, '#e0a070', { s: 2 }); O.T(g, row.pts + '', x0 + w - 36, y + 4, '#fff', { s: 2 }); });
      const tk = this.tick[Math.floor(game.real / 3) % this.tick.length]; px.rect(g, 0, r.H - 40, r.W, 12, 'rgba(8,10,34,.85)'); O.T(g, tk.toUpperCase(), r.W / 2, r.H - 38, '#ffe27a', { s: 1, align: 'center' });
      O.strip(g, r, [['confirm', 'Next day']], 0);
    });
  }
});

// ================================================================ TORCH LOST / GAMES OVER
O.scene('torch', {
  lock: .8, view: 'brawler',
  enter(d) { this.d = d; this.ev = O.EV[d.ev]; this.t = 0; this.cd = 9; O.music('tense'); O.Comms.say('qual'); O.sfx('ol_yikes'); game.setView('brawler'); },
  update(dt) {
    this.t += dt; const m = O.meet;
    if (this.d.out) {
      this.cd -= dt * 0.8; if (this.cd <= 0) { O.flow.clearSave(); return O.go('title'); }
      if (!O.locked() && O.pressedAny('confirm')) { m.torches = 3; O.go('eventcard', { ev: this.d.ev, retry: true, only: this.d.failed }); }
      if (!O.locked() && O.pressedAny('cancel')) { O.flow.clearSave(); O.go('title'); }
      return;
    }
    if (!O.locked() && O.pressedAny('confirm')) { O.sfx('confirm'); O.flow.toPlay(this.d.ev, this.d.failed, { retry: true }); }
  },
  draw(r) {
    r.sky(['#2a0a14', '#4a1424', '#201030']);
    r.overlay(g => {
      const m = O.meet; O.stars(g, r, 30, 12);
      if (this.d.out) { O.title(g, 'GAMES OVER', r.W / 2, 32, 4); O.T(g, 'CONTINUE?', r.W / 2, 100, '#fff', { s: 3, align: 'center' }); O.T(g, Math.max(0, Math.ceil(this.cd)) + '', r.W / 2, 128, '#ffe27a', { s: 6, align: 'center' }); O.strip(g, r, [['confirm', 'Continue'], ['cancel', 'Give up']], 0); return; }
      O.stamp(g, r, 'YIKES!', Math.min(this.t, 1.2), '#ff4a3a'); O.banner(g, r, 'NO QUALIFYING MARK', 110, '#ff8a7a', 3);
      O.T(g, this.ev.name + ' needs ' + this.ev.fmt(this.ev.qual) + ' or better', r.W / 2, 142, '#fff', { s: 1, align: 'center' });
      for (let i = 0; i < 3; i++) { const x = r.W / 2 - 40 + i * 30, on = i < m.torches; px.rect(g, x + 8, 168, 4, 18, '#8a6a2a'); px.poly(g, [[x + 10, 148], [x + 2, 168], [x + 18, 168]], on ? '#ff6a1a' : '#444'); if (on) px.poly(g, [[x + 10, 156], [x + 6, 168], [x + 14, 168]], '#ffe27a'); }
      O.T(g, 'TORCHES LEFT', r.W / 2, 192, '#ffe27a', { s: 1, align: 'center' }); O.strip(g, r, [['confirm', 'Try again']], 0);
    });
  }
});

// ================================================================ CLOSING + ENDING + CREDITS
O.scene('closing', {
  lock: .6, view: 'brawler',
  enter() {
    const m = O.meet; this.tbl = O.medalTable(m); this.t = 0; game.setView('brawler'); this.rank = this.tbl.findIndex(x => x.nat === m.humans[0].nat) + 1; const nat = O.NAT[m.humans[0].nat]; this.nat = nat; this.rig = O.makeRig(nat, { size: 1.6 });
    O.music(this.rank === 1 ? O.anthemFor(nat) : 'ceremony'); O.flow.clearSave(); O.Fireworks.clear(); this.page = 0;
    const names = ['', 'FIRST', 'SECOND', 'THIRD'];
    this.ending = [
      '', 'GOLD OVERALL! ' + nat.name + ' tops the table. Max Overdrive demands a recount, then a second recount, then a snack. The mascot is carried shoulder-high, against its will.',
      'SILVER NATION! So close that the judges used a ruler. Max Overdrive pretends he meant to lose, loudly, on three channels.', 'BRONZE NATION! A podium is a podium. Even the blimp applauds, sadly through a small speaker.',
      'You finish ' + this.rank + 'th overall. But you survived the Games, the mascot, and Max Overdrive. That is gold in anything but name.'][Math.min(this.rank, 4)] ;
    O.Comms.sayRaw('ELOISE', 'And that is a wrap! The torch goes out, and so does my voice!', 5);
  },
  update(dt) {
    this.t += dt; this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: this.rank <= 3 ? 'cheer' : 'hips', expr: 'smile' }); game.focus(0, 0, 40);
    if (this.t % 1.4 < dt) O.Fireworks.burst(40 + O.crnd() * 340, 30 + O.crnd() * 60);
    if (!O.locked() && (O.pressedAny('confirm') || game.input.clicked())) { O.sfx('confirm'); if (this.page === 0) { this.page = 1; this.t = 0; } else O.go('title', null, { fade: 'white' }); }
  },
  draw(r) {
    O.backdrop('night').draw(r);
    r.decal(g => { const a = r.w(-300, 0, 0); px.rect(g, 0, a[1] - 4, r.W, r.H, '#1a2050'); });
    r.actor(0, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      if (this.page === 0) {
        O.title(g, 'CLOSING CEREMONY', r.W / 2, 14, 3); const w = r.W - 40; O.panel(g, 20, r.H - 112, w, 90, { alpha: .88 });
        O.T(g, 'FINAL MEDAL TABLE: YOU FINISH #' + this.rank, r.W / 2, r.H - 106, '#ffe27a', { s: 1, align: 'center' });
        O.wrap(this.ending, w - 20, 1).forEach((l, i) => O.T(g, l, 30, r.H - 92 + i * 10, '#fff', { s: 1 }));
        const t = this.tbl.slice(0, 3).map((row, i) => (i + 1) + '. ' + row.nat + ' ' + row.g + '/' + row.s + '/' + row.b).join('   '); O.T(g, t, r.W / 2, r.H - 40, '#cfd8ff', { s: 1, align: 'center' });
      } else {
        const lines = ['OLYMPIYIKES!', '', 'Design, code, art, music and voices: all written in code', 'Built on the my-3D2dge engine • AI Hub session protocol', '', 'Commentary: BIFF BANNISTER and DAME ELOISE GASP', 'Mascot: a nervous blob', 'Thanks to every athlete who fell down gloriously', '', 'FASTER. HIGHER. YIKES.', '', 'Thanks for playing!'];
        const y = r.H - this.t * 18; lines.forEach((l, i) => O.T(g, l, r.W / 2, y + i * 20, i === 0 || i === 9 ? '#ffe27a' : '#fff', { s: i === 0 ? 3 : 2, align: 'center' }));
        if (y + lines.length * 20 < 0) O.go('title');
      }
      O.strip(g, r, [['confirm', this.page === 0 ? 'Credits' : 'Skip']], 0);
    });
  }
});
})();
