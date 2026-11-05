/* 40-poolhop: Pool Hop. Cross the lagoon on 32 floating pads before the clock runs out. Each pad shows one of the four
 * face buttons (in the current device's glyphs); press it as you land, on the beat of the song (judged on the music
 * clock). From pad 12 the glyph wobbles between two buttons and settles a beat before; from pad 22 pads need two buttons
 * at once. A wrong, early or late press: a slip, a splash, a swim back, and on from the same pad at the next bar. */
G.HOPS = ['hopA', 'hopB', 'hopX', 'hopY'];
G.SCENES.poolhop = {
  pausable: true, view: 'court', input: G.INPUT.POOLHOP,
  enter(d) {
    this.d = d || {}; this.demo = !!this.d.demo; this.N = 32; G.seed('cosmetic', 99);
    const r = E.rng(((G.state && G.state.seed) || 5) * 7 + 3);
    this.pads = []; for (let k = 0; k < this.N; k++) { const a = Math.floor(r() * 4), b = (a + 1 + Math.floor(r() * 3)) % 4; this.pads.push({ x: 100 + (k + 1) * 26, y: 192 + Math.sin(k * .7) * 18, need: k >= 21 ? [a, b] : [a], alt: b, wobble: k >= 11 && k < 21, color: ['#ffd04a', '#ff7aa8', '#5ff0ff', '#7cff5a'][k % 4] }); }
    this.k = 0; this.state = 'count'; this.t = 0; this.timeLeft = G.T.poolTime; this.perfects = 0; this.goods = 0; this.falls = 0; this.streak = 0; this.bonus = 0; this.pending = null; this.judge = null; this.swimT = 0; this.done = false;
    this.rig = G.anim.rig(G.makeRig(G.state ? G.state.me : 'amara', G.state ? G.wearOf(G.state.me) : {}));
    const song = Object.assign({}, G.SONGS.lagoon, { bpm: G.T.poolBpm }); G.curSong = 'poolhop'; G.game.audio.music(song, { sync: true, restart: true }); this.bpm = G.T.poolBpm;
    this.spb = 60 / this.bpm; this.startBeat = 4; this.nextBeat = this.startBeat + 1;
    this.map = this.map || new E.TileMap({ rows: Array.from({ length: 24 }, (_, y) => Array.from({ length: 64 }, (_, x) => x < 5 || x > 58 ? 'd' : '~').join('')), legend: { '~': { floor: 'water', block: true }, d: { floor: 'deck' } }, floorTex: (x, y, t) => t === 'water' ? G.tex.water(x, y) : G.tex.deck(x, y), outside: '#2ec4c9' });
    G.applyLight('afternoon'); G.UI.theme = 'day'; G.game.setZoom(1.15); G.game.cam.bounds = null; this.hx = 100; this.hy = 192;
    G.ambience.set('pool');
  },
  exit() { G.game.setZoom(1); G.curSong = null; },
  get clock() { const p = G.game.audio.pos; return p && p.playing !== false ? p.t : this.t; },
  windows() { const m = G.T.poolWindowMul; return { perfect: .06 * m, good: .13 * m }; },
  padNeed(k) { return this.pads[k] ? this.pads[k].need : [0]; },
  /** the glyph a pad shows now (a wobble pad flips until a beat before it is needed) */
  shown(k, beatNow) { const p = this.pads[k]; if (!p) return []; if (!p.wobble) return p.need; const due = this.startBeat + k + 1 + this.offset; return beatNow < due - 1 ? (Math.floor(beatNow * 2) % 2 ? [p.alt] : p.need) : p.need; },
  get offset() { return this._off || 0; },
  update(dt) {
    this.t += dt; const I = G.game.input, c = this.clock, beat = c / this.spb, W = this.windows();
    G.ambience.update(dt);
    if (this.state === 'count') { if (beat >= this.startBeat) { this.state = 'play'; this._off = 0; } }
    else if (this.state === 'play' && !this.done) {
      this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; return this.finish(false); }
      const due = (this.startBeat + this.k + 1 + this._off) * this.spb, need = this.padNeed(this.k);
      // presses
      const auto = this.demo || G.poolBot;
      const presses = []; for (let i = 0; i < 4; i++) if (I.pressed(G.HOPS[i])) presses.push(i);
      if (auto && !this.pending && Math.abs(c - due) < dt * 1.01) for (const n of need) presses.push(n);
      for (const b of presses) {
        const err = c - due;
        if (err < -this.spb * .5) continue;   // too early to count for this pad
        if (Math.abs(err) > W.good || !need.includes(b)) { this.slip(); return; }
        this.pending = this.pending || { got: new Set(), err };
        this.pending.got.add(b); this.pending.err = Math.max(Math.abs(this.pending.err), Math.abs(err));
        if (need.every(n => this.pending.got.has(n))) { const q = this.pending.err <= W.perfect || auto ? 'PERFECT' : 'GOOD'; this.land(q); return; }
      }
      if (c > due + W.good) { this.slip(); return; }
    } else if (this.state === 'swim') {
      this.swimT -= dt; if (this.swimT <= 0) { this.state = 'wait'; }
    } else if (this.state === 'wait') {
      // on again from the same pad at the next bar
      const nb = Math.ceil(beat / 4) * 4; if (!this.resumeBeat) this.resumeBeat = nb; if (beat >= this.resumeBeat - 1) { this._off = this.resumeBeat - this.startBeat - this.k - 1 + 1; this.state = 'play'; this.resumeBeat = null; }
    } else if (this.state === 'end') { if (this.t - this.endT > 1.5 && (I.pressed('hopA') || I.pressed('confirm') || I.clicked() || this.demo)) this.leave(); }
    // the hopper: an arc from pad to pad over the beat before landing
    const from = this.k === 0 ? [100, 192] : [this.pads[this.k - 1].x, this.pads[this.k - 1].y], to = this.pads[this.k] ? [this.pads[this.k].x, this.pads[this.k].y] : from;
    let x = from[0], y = from[1], z = 0, air = false;
    if (this.state === 'swim') { const u = 1 - this.swimT / 1.8; x = lerp(this.slipAt[0], from[0], u); y = lerp(this.slipAt[1], from[1], u) + 4; z = -12; }
    else if (this.landT && this.t - this.landT < this.spb * .9) { const u = (this.t - this.landT) / (this.spb * .9); x = lerp(this.landFrom[0], from[0], u); y = lerp(this.landFrom[1], from[1], u); z = Math.sin(u * Math.PI) * 14; air = true; }
    this.hx = x; this.hy = y; this.hz = z;
    const bob = Math.sin(beat * Math.PI * 2) * 1;
    this.rig.vb = this.state === 'swim' ? { kind: 'dive', u: .5, w: 1 } : null;
    this.rig.update(dt, { x, y, z: z + (air ? 0 : 2 + bob * .3), facing: 0, air, crouch: !air && this.state === 'play' && (beat % 1) > .7, pose: this.state === 'end' && this.won ? 'cheer' : null, expr: this.state === 'swim' ? 'wince' : 'smile' });
    G.game.focus(x + 30, y, 10);
  },
  land(q) {
    this.landFrom = this.k === 0 ? [100, 192] : [this.pads[this.k - 1].x, this.pads[this.k - 1].y]; this.landT = this.t;
    this.k++; this.pending = null; this.judge = { q, t: 0 }; G.sfx('hopLand');
    if (q === 'PERFECT') { this.perfects++; this.streak++; if (this.streak % 8 === 0) { this.timeLeft += 1; this.bonus++; G.toast('+1 second', '8 PERFECT in a row'); } } else { this.goods++; this.streak = 0; }
    if (this.k >= this.N) this.finish(true);
  },
  slip() {
    const p = this.pads[this.k]; this.slipAt = p ? [lerp(this.k ? this.pads[this.k - 1].x : 100, p.x, .5), p.y + 6] : [this.hx, this.hy];
    this.state = 'swim'; this.swimT = 1.8; this.falls++; this.streak = 0; this.pending = null; this.judge = { q: 'SPLASH!', t: 0 };
    G.sfx('splash'); G.fx.splash(this.slipAt[0], this.slipAt[1]); if (G.game.input.lastDevice === 'gamepad') G.game.input.rumble(.3, .2);
  },
  finish(won) {
    this.done = true; this.won = won; this.state = 'end'; this.endT = this.t; const S = G.state;
    const used = G.T.poolTime + this.bonus - this.timeLeft;
    this.prize = won ? Math.round((2000 + 400 * this.perfects + 150 * this.timeLeft) / 100) * 100 : 1000;
    if (S && !S.demo) { this.prize = G.earn(this.prize, 'poolhop'); if (won && (!S.stats.poolBest || used < S.stats.poolBest)) S.stats.poolBest = used; if (won && S.partner && S.where[S.partner] === 'pool') G.addAff(S.partner, 2); }
    G.sting(won ? 'win' : 'lose'); if (won) G.fx.confetti(this.hx, this.hy, 30);
  },
  leave() { if (this.demo) return; const S = G.state; if (S) G.endSlot('poolhop'); else G.go('title'); },
  draw(r) {
    const c = this.clock, beat = c / this.spb, I = G.game.input;
    G.backdrop('afternoon').draw(r); this.map.drawFloor(r);
    for (let k = 0; k < 3; k++) r.prop('palm', 60 + k * 30, 120 + k * 20, 0, { size: 1.5 }); r.shape('cabana', 980, 150, 0); r.shape('flamingo', 600, 110, 0); r.shape('lounger', 40, 260, 0);
    this.pads.forEach((p, k) => {
      const b = Math.sin(beat * Math.PI * 2 + k) * .8, done = k < this.k;
      r.shape('poolfloat', p.x, p.y, b, { mats: { a: done ? 'aoa_white' : ['aoa_canvasY', 'aoa_canvasP', 'aoa_canvasT', 'aoa_canvasB'][k % 4] } });
      if (k >= this.k && k < this.k + 6) { const show = this.shown(k, beat); r.queue(p.x, p.y, 12, g => { const [sx, sy] = r.w(p.x, p.y, 12); let x = Math.round(sx - (show.length * 11 - 2) / 2); for (const n of show) { x += G.drawGlyph(g, x, Math.round(sy) - 10, G.codeFor(G.HOPS[n], I), I) + 2; } if (this.pads[k].wobble && show[0] !== this.pads[k].need[0]) px.dot(g, Math.round(sx), Math.round(sy) - 13, '#ffffff'); }, { bias: 30 }); }
    });
    r.shadow(this.hx, this.hy, 5, .3);
    r.actor(this.hx, this.hy, this.hz || 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this.rig });
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.ui.box(g, Math.round(W * .04), Math.round(H * .04), 120, 30, { bg: G.UI.T.bg, border: G.UI.T.border });
      E.font.text(g, 'POOL HOP', Math.round(W * .04) + 6, Math.round(H * .04) + 4, '#ffd36a', { outline: false }); E.font.text(g, 'Pad ' + this.k + ' / ' + this.N + '   Falls ' + this.falls, Math.round(W * .04) + 6, Math.round(H * .04) + 16, '#fff8e8', { outline: false });
      E.font.text(g, this.timeLeft.toFixed(1), Math.round(W * .96), Math.round(H * .04), this.timeLeft < 10 ? '#ff7a7a' : '#ffffff', { scale: 3, align: 'right', shadow: '#000', outline: false });
      // the beat light
      const ph = beat % 1; px.disc(g, Math.round(W / 2), Math.round(H * .08), ph < .15 ? 6 : 4, ph < .15 ? '#ffd36a' : '#3a5a6a');
      if (this.state === 'count') { const n = Math.max(1, Math.ceil(this.startBeat - beat)); E.font.title(g, n > 3 ? 'READY' : String(n), W / 2, Math.round(H * .3), { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] }); }
      if (this.judge) { this.judge.t += 1 / 60; if (this.judge.t < .6) E.font.text(g, this.judge.q, W / 2, Math.round(H * .22), this.judge.q === 'PERFECT' ? '#ffd36a' : this.judge.q === 'GOOD' ? '#5ff0ff' : '#9ff3e8', { scale: 2, align: 'center', shadow: '#000', outline: false }); }
      if (this.streak >= 2) E.font.text(g, this.streak + ' in a row', W / 2, Math.round(H * .14), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      if (this.state === 'end') { G.UI.panel(g, W / 2 - 110, H * .32, 220, 76); E.font.title(g, this.won ? 'CLEARED!' : 'TIME UP', W / 2, H * .32 + 8, { scale: 2, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] }); E.font.text(g, this.perfects + ' PERFECT • ' + this.goods + ' GOOD • ' + this.falls + ' falls', W / 2, H * .32 + 32, '#fff8e8', { align: 'center', outline: false }); if (G.state) G.UI.money(g, W / 2 - 40, H * .32 + 46, this.prize); }
    });
    if (this.state !== 'end') G.promptBar(r, this.state === 'swim' || this.state === 'wait' ? [['hopA', 'Swim back...']] : this.padNeed(this.k).map(n => [G.HOPS[n], this.padNeed(this.k).length > 1 ? 'Together!' : 'On the beat']));
    else G.promptBar(r, [['hopA', 'Continue']]);
  }
};
