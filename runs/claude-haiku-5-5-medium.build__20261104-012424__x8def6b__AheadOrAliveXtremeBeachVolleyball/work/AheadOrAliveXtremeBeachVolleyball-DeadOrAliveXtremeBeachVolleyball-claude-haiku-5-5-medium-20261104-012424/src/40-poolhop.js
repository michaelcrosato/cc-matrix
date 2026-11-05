/* 40-poolhop: Pool Hop. Cross the lagoon on 32 pads in the time allowed. One hop a beat, judged on the beat clock: each
 * pad shows one face button; press it as the hopper lands. Early, late or wrong: a splash, back to the pad, and the run
 * goes on. From pad 12 the glyph wobbles; from pad 22 some pads want two buttons at once. */
G.poolPads = function () {
  const pads = [];
  for (let i = 0; i < 32; i++) {
    const x = 40 + i * 16, y = 150 + Math.sin(i * .7) * 26;
    const btn = ['hopA', 'hopB', 'hopX', 'hopY'][(i * 3 + (i >> 2)) % 4];
    const pad = { i, x, y, btn, wobble: i >= 12 && i % 3 === 0, double: i >= 22 && i % 5 === 0 ? ['hopA', 'hopX'] : null };
    pads.push(pad);
  }
  return pads;
};
G.poolScene = {
  enter(data) {
    G.poolLive = this;
    this.from = data.from || 'map';
    this.pads = G.poolPads();
    this.rig = G.rigFor(G.state.me, { suit: G.state.wearing.suit, acc: G.state.wearing.acc });
    this.bpm = G.T.poolBpm; this.beat = 60 / this.bpm;
    this.perfect = 0; this.good = 0; this.falls = 0; this.run = 0; this.at = 0; this.t = 0; this.timeLeft = G.T.poolTime;
    this.state = 'ready'; this.readyT = 0; this.nextBeat = 0; this.res = null; this.msg = null; this.hop = null;
    this.bg = new E.Backdrop('day');
    G.game.setView(E.VIEWS.threequarter);
    G.game.follow(null); G.game.focus && G.game.focus(300, 180, 0);
    G.music('lagoon');
    this.lastJudge = null;
    this.slipT = 0;
  },
  start() {
    this.state = 'run'; this.t0 = this.t; this.nextBeat = this.beatTime(0);
  },
  beatTime(n) { return (this.t0 || 0) + this.readyBeats() + n * this.beat; },
  readyBeats() { return .6; },
  update(dt) {
    const I = G.game.input;
    this.t += dt;
    if (this.state === 'ready') { this.readyT += dt; if (I.pressed('confirm') || this.readyT > 1.5) this.start(); if (I.pressed('cancel')) return this.leave(); return; }
    if (this.state === 'run') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) return this.finish(false);
      // the hopper: landing on the beat, the judge on presses
      const pad = this.pads[this.at];
      if (pad && this.t > this.nextBeat + this.beat * .5 && !this.hop) {
        // missed the beat completely: a slip
        this.slip('too slow');
      }
      if (I.pressed('cancel') && !this.hop) return this.leave();
      const presses = ['hopA', 'hopB', 'hopX', 'hopY'].filter(a => I.pressed(a));
      if (presses.length) this.judge(presses);
      if (this.hop) { this.hop.t += dt; if (this.hop.t > .45) { this.hop = null; } }
    }
    if (this.state === 'slip') { this.timeLeft -= dt; this.slipT -= dt; if (this.timeLeft <= 0) return this.finish(false); if (this.slipT <= 0) { this.state = 'run'; this.nextBeat = this.t + this.beat * .5; } }
  },
  judge(presses) {
    const pad = this.pads[this.at];
    if (!pad) return;
    const err = this.t - this.nextBeat;
    const want = pad.double ? pad.double : [pad.btn];
    const pressed = presses.slice().sort().join(), need = want.slice().sort().join();
    const tight = G.T.perfectWin * 1.2 * G.T.poolWindowMul, loose = G.T.greatWin * 1.3 * G.T.poolWindowMul;
    const ae = Math.abs(err);
    if (pressed !== need) return this.slip('wrong button');
    if (ae > loose) return this.slip(err < 0 ? 'early' : 'late');
    const q = ae <= tight ? 'PERFECT' : 'GOOD';
    if (q === 'PERFECT') { this.perfect++; this.run++; if (this.run % 8 === 0) { this.timeLeft += 1; G.toast('+1 second!'); } }
    else { this.good++; this.run = 0; }
    this.lastJudge = { q, t: this.t };
    G.sfx('hopLand');
    this.hop = { t: 0, from: this.at, to: this.at + 1 };
    this.at++;
    this.nextBeat += this.beat;
    if (this.at >= this.pads.length) return this.finish(true);
  },
  slip(why) {
    this.falls++; this.run = 0;
    this.lastJudge = { q: 'SLIP', t: this.t, why };
    G.sfx('splash');
    this.state = 'slip'; this.slipT = 1.8;
    this.hop = null;
  },
  finish(cleared) {
    const st = G.state;
    const time = G.T.poolTime - this.timeLeft;
    this.res = { cleared, time, perfect: this.perfect, falls: this.falls };
    if (cleared) {
      const prize = 2000 + 400 * this.perfect + 150 * Math.max(0, this.timeLeft);
      G.earn(prize * G.T.prizeMul, 'poolhop');
      const best = st.stats.poolBest;
      if (best === null || time < best) st.stats.poolBest = Math.round(time * 10) / 10;
      if (st.partner) G.addAff(st.partner, 2);
    }
    this.state = 'done';
    this.doneT = 0;
  },
  leave() { G.game.go(this.from === 'location' ? 'location' : 'map', { place: 'pool' }); },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    // the pool: a shimmer of water with the pads floating on it
    r.overlay(g => { E.px.rect(g, 0, Math.round(H * .3), W, Math.round(H * .6), '#2ec4c9'); });
    this.pads.forEach((p, i) => {
      const onPad = i === this.at;
      r.queue(p.x, p.y, 0, g => { const q = r.w(p.x, p.y, 0); E.px.disc(g, q[0], q[1], 9, i < this.at ? '#5fe0b4' : onPad ? '#ffd36a' : '#f6efe0'); E.px.disc(g, q[0], q[1], 7, i < this.at ? '#3ab090' : onPad ? '#ffb040' : '#d8cdb8'); }, { bias: -2 });
    });
    const hp = this.pads[Math.min(this.at, this.pads.length - 1)];
    const hx = this.hop ? this.pads[this.hop.from].x + (hp.x - this.pads[this.hop.from].x) * Math.min(1, this.hop.t / .3) : hp.x;
    r.actor(hx, hp.y, this.hop ? Math.sin(Math.min(1, this.hop.t / .4) * Math.PI) * 14 : 0, (g, ox, oy) => { this.rig.draw(g, ox, oy, r.view); }, { pick: 'hopper' });
    // the glyph on each pad near the hopper
    for (let i = this.at; i < Math.min(this.pads.length, this.at + 4); i++) {
      const p = this.pads[i], q = r.w(p.x, p.y, 12);
      const flip = p.wobble && i === this.at && this.nextBeat - this.t > this.beat && Math.floor(this.t * 6) % 2 === 1;
      const act = p.double ? p.double[0] : flip ? { hopA: 'hopB', hopB: 'hopA', hopX: 'hopY', hopY: 'hopX' }[p.btn] : p.btn;
      if (q && q[0] !== undefined) { G.promptAt(r, act, q[0] - 5, q[1] - 14, { scale: 1 }); if (p.double) G.promptAt(r, p.double[1], q[0] + 6, q[1] - 14, { scale: 1 }); }
    }
    r.overlay(g => {
      E.ui.box(g, 6, 6, 140, 34, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
      E.font.text(g, 'POOL HOP', 12, 10, '#ffd36a', { shadow: '#000' });
      E.font.text(g, 'Time ' + Math.max(0, this.timeLeft).toFixed(1) + 's', 12, 22, '#fff8e8', { shadow: '#000' });
      E.font.text(g, 'Pad ' + Math.min(32, this.at) + '/32 · P' + this.perfect, W - 8, 10, '#fff8e8', { align: 'right', shadow: '#000' });
      if (this.lastJudge && this.t - this.lastJudge.t < .7) E.font.text(g, this.lastJudge.q, W / 2, H * .25, this.lastJudge.q === 'PERFECT' ? '#ffd36a' : this.lastJudge.q === 'SLIP' ? '#ff9a9a' : '#fff8e8', { align: 'center', scale: 2, shadow: '#000' });
      if (this.state === 'ready') E.font.text(g, 'Hop on the beat!', W / 2, H * .12, '#fff8e8', { align: 'center', scale: 2, shadow: '#000' });
      if (this.state === 'done') {
        E.ui.box(g, W / 2 - 120, H / 2 - 40, 240, 80, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
        E.font.text(g, this.res.cleared ? 'Cleared in ' + this.res.time.toFixed(1) + 's' : 'Out of time', W / 2, H / 2 - 30, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
        E.font.text(g, 'Perfects ' + this.res.perfect + ' · Falls ' + this.res.falls, W / 2, H / 2 - 4, '#fff8e8', { align: 'center', shadow: '#000' });
      }
    });
    if (this.state === 'done') { this.doneT += 0; G.promptBar(r, [['confirm', 'Continue']]); if (G.game.input.pressed('confirm')) this.leave(); }
    else G.promptBar(r, [['hopA', 'Hop'], ['cancel', 'Leave']]);
  }
};
/* a prompt glyph at a buffer point (drawn on the overlay) */
G.promptAt = function (r, action, x, y, o) { G.prompt(r, action, x, y, '', o || {}); };
