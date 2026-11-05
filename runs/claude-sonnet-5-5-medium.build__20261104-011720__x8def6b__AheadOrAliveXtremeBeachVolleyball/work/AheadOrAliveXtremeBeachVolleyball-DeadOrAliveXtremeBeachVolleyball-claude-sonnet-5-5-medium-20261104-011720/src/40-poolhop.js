/* 40-poolhop: a rhythm minigame. Hop across the lagoon's lily pads on the beat. */
G.scenes.poolhop = G.wrapScene({
  view: 'court', input: G.INPUT_MATCH, res: 'ps1', expand: true, name: 'poolhop', pausable: true,
  enter(d) {
    this.d = d || {}; this.t = 0; this.bpm = 116; this.beat = 60 / this.bpm; this.lead = 3; this.N = 28; this.auto = !!this.d.auto;
    this.rig = G.rigOf('you', 1.0); this.hp = { x: 0, z: 0, wet: 0 }; this.i = 0; this.score = 0; this.combo = 0; this.best = 0; this.res = []; this.state = 'play'; this.judged = new Array(this.N).fill(null); this.flash = []; this.menu = null; this.drops = [];
    this.pads = []; for (let k = 0; k <= this.N; k++) this.pads.push({ x: k * 26, y: (k % 2 ? 7 : -7) * (k > 1 ? 1 : 0), gold: k > 0 && k % 7 === 0 });
    G.music('pool', { restart: true }); G.game.setView('court'); G.game.follow(null); G.game.lights.enabled = false; G.game.focus(0, 0, 10);
    this.t0 = 0; G.game.cam.smooth = .15; this.pop = null; this.pdone = false;
  },
  exit() { G.game.cam.smooth = .25; },
  hitTime(k) { return this.lead + k * this.beat; },
  judge(k, dt) { const e = Math.abs(dt); const grade = e < .05 ? 'perfect' : e < .11 ? 'good' : null; return grade; },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.state === 'play') {
      // input: nearest unjudged beat within the window
      const press = I.pressed('play') || I.pressed('confirm') || (this.auto && this.nextAuto());
      if (press) {
        let k = -1; for (let j = 0; j < this.N; j++) if (this.judged[j] === null && Math.abs(this.t - this.hitTime(j)) < .2) { k = j; break; }
        if (k >= 0) { const gr = this.judge(k, this.t - this.hitTime(k)); this.setJudge(k, gr); }
      }
      for (let j = 0; j < this.N; j++) if (this.judged[j] === null && this.t > this.hitTime(j) + .12) this.setJudge(j, null);
      // hop animation: the hopper jumps from pad to pad on each beat
      const sB = (this.t - this.lead) / this.beat, j = Math.floor(sB), u = sB - j;
      const a = this.pads[clamp(j + 1, 0, this.N)], b = this.pads[clamp(j + 2, 0, this.N)], hu = clamp((u - .2) / .8, 0, 1), e = E.ease.inOutQuad(hu);
      this.hp.x = lerp(a.x, b.x, e); this.hp.y = lerp(a.y, b.y, e); this.hp.z = Math.sin(hu * Math.PI) * 14;
      this.hp.wet = Math.max(0, this.hp.wet - dt);
      if (this.t > this.hitTime(this.N) + .8) this.finish();
    } else if (this.menu) this.menu.update(dt);
    this.rig.update(dt, { x: this.hp.x, y: this.hp.y || 0, z: this.hp.z, vx: 20, vy: 0, facing: 0, air: this.hp.z > 2, pose: this.state === 'done' && this.score > 1500 ? 'cheer' : null, expr: this.hp.wet > 0 ? 'wince' : 'smile' });
    for (const d of this.drops) { d.t -= dt; d.z += d.vz * dt; d.vz -= 220 * dt; } this.drops = this.drops.filter(d => d.t > 0);
    if (this.pop) { this.pop.t -= dt; if (this.pop.t <= 0) this.pop = null; }
    G.game.focus(this.hp.x + 40, 0, 10);
  },
  nextAuto() { for (let j = 0; j < this.N; j++) if (this.judged[j] === null && this.t >= this.hitTime(j) - .01) return true; return false; },
  setJudge(k, gr) {
    this.judged[k] = gr || 'miss';
    if (gr === 'perfect') { this.combo++; this.score += Math.round(100 * (1 + Math.min(this.combo, 20) * .1) * (this.pads[k].gold ? 2 : 1)); G.sfx('perfect'); G.sfx('pad'); this.pop = { text: 'PERFECT!', col: '#fff06a', t: .6 }; }
    else if (gr === 'good') { this.combo++; this.score += Math.round(60 * (1 + Math.min(this.combo, 20) * .1) * (this.pads[k].gold ? 2 : 1)); G.sfx('good'); this.pop = { text: 'GOOD', col: '#9bffb0', t: .6 }; }
    else { this.combo = 0; this.hp.wet = .6; G.sfx('splash', { vol: .6 }); this.pop = { text: 'SPLASH!', col: '#9be0ff', t: .6 }; for (let q = 0; q < 8; q++) this.drops.push({ x: this.hp.x + (G.rand() - .5) * 12, y: this.hp.y, z: 2, vz: 60 + G.rand() * 80, t: .6 }); }
    this.best = Math.max(this.best, this.combo);
  },
  finish() {
    if (this.state !== 'play') return; this.state = 'done'; const money = Math.round(this.score / 6 / 10) * 10; this.money = money; G.sfx('dayend');
    const perfect = this.judged.filter(x => x === 'perfect').length, good = this.judged.filter(x => x === 'good').length;
    this.summary = { perfect, good, miss: this.N - perfect - good };
    if (this.d.auto) { if (this.d.done) this.d.done({ score: this.score, money }); return; }
    this.menu = new G.Menu([{ label: 'Collect ' + G.fmtMoney(money * G.T.moneyMul), onPick: () => { if (this.d.done) this.d.done({ score: this.score, money }); } }], { y: 150, w: 150, gap: 15 });
  },
  draw(r) {
    const W = r.W, H = r.H, g = r.tgt, t = this.t;
    const top = Math.round(H * .34);
    for (let i = 0; i < 5; i++) px.rect(g, 0, Math.floor(i * top / 5), W, Math.ceil(top / 5) + 1, ['#4aa8e8', '#78c4f0', '#a0daf8', '#c8eefc', '#e8f8ff'][i]);
    px.rect(g, 0, top, W, H - top, '#2ab8e0'); for (let y = top; y < H; y += 3) px.rect(g, 0, y, W, 1, (y / 3 & 1) ? '#34c2ea' : '#22aed8');
    for (let i = 0; i < 40; i++) { const x = (i * 61 + Math.floor(t * 12)) % W, y = top + (i * 29) % (H - top); px.rect(g, x, y, 7, 1, '#bff4ff'); }
    // deck behind
    px.rect(g, 0, top - 4, W, 6, '#e8e0d0'); r.prop('palm', this.hp.x - 90, -50, 0, { size: 1.6 }); r.prop('palm', this.hp.x + 130, -52, 0, { size: 1.6 });
    // pads and rings
    this.pads.forEach((p, k) => {
      r.queue(p.x, p.y, 0, gg => { const [x, y] = r.w(p.x, p.y, .5); const X = Math.round(x), Y = Math.round(y); const j = this.judged[k - 1]; px.ell(gg, X, Y, 9, 4, p.gold ? '#e8c030' : '#2f9a4a'); px.ell(gg, X, Y - 1, 8, 3, p.gold ? '#ffe36a' : '#4fc060'); px.dot(gg, X + 3, Y - 2, '#ff8ac8'); if (j === 'miss') px.ell(gg, X, Y + 1, 10, 4, '#ffffff66'); }, { bias: -1 });
    });
    // timing ring on the pad the hopper will land on next
    if (this.state === 'play') for (let k = 0; k < this.N; k++) {
      const du = this.hitTime(k) - this.t; if (this.judged[k] !== null || du > 1.1 || du < -.15) continue;
      const pad = this.pads[k + 1], rad = 5 + clamp(du, 0, 1.1) * 16, near = Math.abs(du) < .05;
      r.queue(pad.x, pad.y, 0, gg => { const pts = r.groundPts(pad.x, pad.y, rad, 18, .6); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; px.line(gg, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), near ? '#fff06a' : '#ffffff', 1); } }, { emissive: true });
    }
    r.shadow(this.hp.x, this.hp.y || 0, 5, .3);
    r.actor(this.hp.x, this.hp.y || 0, this.hp.z, (gg, ox, oy) => this.rig.draw(gg, ox, oy, r.view));
    for (const d of this.drops) r.queue(d.x, d.y, d.z, gg => { const [x, y] = r.w(d.x, d.y, d.z); px.rect(gg, Math.round(x), Math.round(y), 1, 2, '#c8f4ff'); });
    r.overlay(gg => {
      G.panel(gg, 4, 4, 110, 26); G.text(gg, 'POOL HOP', 10, 8, '#ffd24a'); G.text(gg, 'Score ' + this.score, 10, 19, '#fff'); G.text(gg, this.combo > 1 ? 'x' + this.combo + ' combo' : '', 108, 19, '#fff06a', { align: 'right' });
      const k = clamp((this.t - this.lead) / (this.N * this.beat), 0, 1); px.rect(gg, 4, 34, 110, 3, '#06141c'); px.rect(gg, 4, 34, Math.round(110 * k), 3, '#9bffb0');
      if (this.pop) E.font.title(gg, this.pop.text, W / 2, Math.round(H * .6), { align: 'center', scale: 1, colors: [this.pop.col, '#ffffff'], depth: 1 });
      if (this.t < this.lead) G.text(gg, 'Press ' + G.label('play') + ' on the beat when the ring closes!', W / 2, Math.round(H * .2), '#fff', { align: 'center' });
      if (this.state === 'done') { const w = 200, x = Math.round(W / 2 - w / 2); G.panel(gg, x, 40, w, 84); E.font.title(gg, this.score > 1800 ? 'SPLASH HIT!' : 'NICE HOPS', W / 2, 46, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'] }); G.text(gg, 'Score ' + this.score, W / 2, 72, '#fff', { align: 'center' }); G.text(gg, this.summary.perfect + ' perfect · ' + this.summary.good + ' good · ' + this.summary.miss + ' splashes', W / 2, 84, '#bfe9ee', { align: 'center' }); G.text(gg, 'Best combo ' + this.best, W / 2, 96, '#fff06a', { align: 'center' }); }
    });
    if (this.menu) this.menu.draw(r); else G.drawPrompts(r, [['play', 'Hop'], ['pause', 'Pause']]);
  }
});
