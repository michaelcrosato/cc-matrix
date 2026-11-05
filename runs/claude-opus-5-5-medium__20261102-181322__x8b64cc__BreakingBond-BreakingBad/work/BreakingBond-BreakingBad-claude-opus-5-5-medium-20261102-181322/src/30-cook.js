/* =====================================================================================
 * 30 THE COOK — the signature mechanic. Four stages of chemistry played as precision: MEASURE (hold, release on the
 * line), HEAT (keep the temperature in the band while it drifts and bumps), STIR (swirl the directions on the beat),
 * CRYSTALLIZE (stop each tray's shimmer at its peak). Their scores make the purity; 96% and up comes out blue.
 * Lab upgrades widen each stage's tolerance. The chemistry is fictional on purpose.
 * ===================================================================================== */
const REAGENTS = [
  { id: 'Px', name: 'Precursor X', color: '#d8d0a0' }, { id: 'Ct', name: 'Catalyst Teal', color: '#4ac8b8' },
  { id: 'Rd', name: 'Reducer Red', color: '#d85a4a' }, { id: 'Sv', name: 'Solvent Seven', color: '#a8c8e8' }
];
const STATE = { cash: 0, total: 0, best: 0, upgrades: { glass: 0, condenser: 0, stirrer: 0, trays: 0, suit: 0 }, cleared: {}, chapter: 0, batches: 0, product: 0 };
const UP = () => STATE.upgrades;

class Cook {
  constructor(o = {}) {
    this.o = o; this.I = o.input || game.input; this.auto = !!o.auto; this.fast = !!o.fast; this.stage = -1; this.t = 0; this.scores = { measure: 0, heat: 0, stir: 0, crystal: 0 };
    this.done = false; this.result = null; this.bubbles = []; this.fx = 0; this.level = 0; this.liquid = '#c8d8e0';
    this.next();
  }
  get main() { const I = this.I; return I.down('interact') || I.down('confirm') || (I.lastDevice === 'mouse' && I.down('throw')); }
  get mainPressed() { const I = this.I; return I.pressed('interact') || I.pressed('confirm') || (I.lastDevice === 'mouse' && I.pressed('throw')); }
  mainLabel() { return this.I.lastDevice === 'mouse' ? 'Left click' : label('interact', this.I); }
  next() {
    this.stage++; this.t = 0; this.intro = this.fast ? .6 : 1.4;
    const u = UP();
    if (this.stage === 0) { this.reagents = [REAGENTS[0], REAGENTS[1]]; this.ri = 0; this.fill = 0; this.target = .55 + Math.random() * .3; this.tol = .035 + u.glass * .015; this.mScores = []; this.pouring = false; A.sfx('select'); }
    if (this.stage === 1) { this.temp = .2; this.burner = .3; this.band = [.52 - .07 - u.condenser * .025, .52 + .07 + u.condenser * .025]; this.dur = this.fast ? 6 : 9; this.inside = 0; this.bump = 2; this.bandDrift = 0; }
    if (this.stage === 2) { const dirs = ['up', 'right', 'down', 'left']; this.notes = []; const n = this.fast ? 8 : 12; for (let i = 0; i < n; i++) this.notes.push({ at: 1.2 + i * .5 + (i > 5 ? .25 : 0), dir: dirs[(i + (i % 3 === 2 ? 2 : 0)) % 4], hit: null }); this.win = .14 + u.stirrer * .03; this.sScore = 0; }
    if (this.stage === 3) { this.trays = [0, 0, 0].map((_, i) => ({ speed: 1.6 + i * .5, phase: Math.random() * 6, stopped: null })); this.ti = 0; this.zone = .1 + u.trays * .03; }
    if (this.stage === 4) this.finish();
  }
  finish() {
    const s = this.scores, u = UP();
    const q = s.measure * .25 + s.heat * .35 + s.stir * .2 + s.crystal * .2;
    let purity = 62 + q * 37.1 + u.suit * .4;
    purity = Math.min(99.1, Math.round(purity * 10) / 10);
    const lbs = Math.round((3 + u.condenser + u.trays) * (.6 + q * .6) * 10) / 10;
    this.result = { purity, lbs, blue: purity >= 96, grade: purity >= 98 ? 'S' : purity >= 94 ? 'A' : purity >= 88 ? 'B' : purity >= 80 ? 'C' : 'D', scores: Object.assign({}, s) };
    this.t = 0; this.done = false; this.showing = true;
    A.sfx(this.result.blue ? 'powerup' : 'confirm');
    if (this.result.blue) game.flash('#59c8f0', .2, .5);
  }
  update(dt) {
    this.t += dt; this.fx += dt;
    const I = this.I;
    for (const b of this.bubbles) { b.y -= b.v * dt; b.t -= dt; }
    E.prune(this.bubbles, b => b.t <= 0);
    if (this.showing) {   // the result card
      if (this.t > (this.auto ? 2.5 : .8) && (this.mainPressed || this.auto)) { this.done = true; A.sfx('confirm'); }
      return;
    }
    if (this.intro > 0) { this.intro -= dt; return; }
    const s = this.stage;
    if (s === 0) {   // MEASURE: hold to pour, release on the line
      const want = this.auto ? this.fill < this.target - .005 : this.main;
      if (want) { this.fill += dt * (.42 + this.ri * .1); this.pouring = true; if (Math.random() < dt * 14) A.sfx('pour', { vol: .5 }); }
      else if (this.pouring && this.fill > .05) {
        const err = Math.abs(this.fill - this.target), sc = err <= this.tol ? 1 : Math.max(0, 1 - (err - this.tol) * 6);
        this.mScores.push(sc); this.flashMsg = sc > .95 ? 'PERFECT' : sc > .7 ? 'CLOSE' : this.fill > this.target ? 'OVERPOURED' : 'SHORT'; this.msgT = 1;
        A.sfx(sc > .7 ? 'coin' : 'bump'); this.level += .3; this.liquid = mixHex(this.liquid, this.reagents[this.ri].color, .55);
        this.pouring = false; this.fill = 0; this.ri++; this.target = .5 + Math.random() * .38;
        if (this.ri >= this.reagents.length) { this.scores.measure = this.mScores.reduce((a, b) => a + b, 0) / this.mScores.length; this.next(); }
      }
      if (this.fill >= 1) { this.fill = 1; this.pouring = true; }
    } else if (s === 1) {   // HEAT: the burner level from up/down (or holding the main button)
      const m = I.move(); let up = -m[1];
      if (this.main) up = 1;
      if (this.auto) { const mid = (this.band[0] + this.band[1]) / 2; up = clamp((mid - this.temp) * 8 - (this.temp - (this.prevT || this.temp)) * 60, -1, 1); }
      this.prevT = this.temp;
      this.burner = clamp(this.burner + up * dt * 1.1, 0, 1);
      this.bump -= dt; if (this.bump <= 0) { this.bump = 1.2 + Math.random() * 1.6; this.kick = (Math.random() < .5 ? -1 : 1) * (.12 + Math.random() * .1); A.sfx('bubble', { pitch: .6 }); }
      const kick = this.kick || 0; this.kick = kick * Math.pow(.02, dt);
      this.bandDrift += dt; const off = Math.sin(this.bandDrift * .9) * .06; this.cur = [this.band[0] + off, this.band[1] + off];
      this.temp = clamp(this.temp + ((this.burner * .9 + .05) - this.temp) * dt * 1.4 + kick * dt * 3, 0, 1);
      const inside = this.temp >= this.cur[0] && this.temp <= this.cur[1]; if (inside) this.inside += dt;
      if (this.temp > .85 && Math.random() < dt * 6) P && A.sfx('fizz', { vol: .3 });
      if (Math.random() < dt * (4 + this.temp * 20)) this.bubbles.push({ x: (Math.random() - .5) * 16, y: 0, v: 8 + this.temp * 30, t: .8 });
      if (this.t >= this.dur) { this.scores.heat = clamp(this.inside / this.dur * 1.12, 0, 1); this.next(); }
    } else if (s === 2) {   // STIR: directions on the beat
      const dirs = ['up', 'right', 'down', 'left'];
      if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) A.sfx('tick', { vol: .6 });
      for (const n of this.notes) {
        if (n.hit !== null) continue;
        const dtn = this.t - n.at;
        if (this.auto && Math.abs(dtn) < .02) { n.hit = 1; this.sScore += 1; A.sfx('blip'); this.hitMsg(1); continue; }
        if (dtn > this.win) { n.hit = 0; this.hitMsg(0); A.sfx('bump', { vol: .4 }); }
      }
      if (!this.auto) for (const d of dirs) if (I.pressed(d)) {
        const n = this.notes.find(n => n.hit === null && Math.abs(this.t - n.at) <= this.win * 1.6);
        if (n && n.dir === d) { const q = Math.abs(this.t - n.at) <= this.win * .5 ? 1 : Math.abs(this.t - n.at) <= this.win ? .75 : .4; n.hit = q; this.sScore += q; this.hitMsg(q); A.sfx('blip', { pitch: 1 + q * .3 }); this.level = Math.min(1, this.level + .02); }
        else if (n) { n.hit = 0; this.hitMsg(0); A.sfx('bump', { vol: .4 }); }
      }
      if (this.notes.every(n => n.hit !== null)) { this.scores.stir = this.sScore / this.notes.length; this.next(); }
    } else if (s === 3) {   // CRYSTALLIZE: stop each tray at the top of its shimmer
      const tr = this.trays[this.ti];
      if (tr) {
        const v = (Math.sin(this.t * tr.speed * 2 + tr.phase) + 1) / 2;
        tr.v = v;
        const go = this.auto ? v > 1 - this.zone * .4 : this.mainPressed;
        if (go) { tr.stopped = v; const sc = v >= 1 - this.zone ? 1 : Math.max(0, 1 - (1 - this.zone - v) * 3); tr.score = sc; A.sfx(sc > .9 ? 'coin' : 'glass', { vol: .6 }); this.hitMsg(sc); this.ti++; this.t = 0; }
      } else { this.scores.crystal = this.trays.reduce((a, t) => a + t.score, 0) / 3; this.next(); }
    }
    if (this.msgT > 0) this.msgT -= dt;
  }
  hitMsg(q) { this.flashMsg = q >= 1 ? 'PERFECT' : q >= .7 ? 'GOOD' : q > 0 ? 'SLOPPY' : 'MISS'; this.msgT = .6; }

  /* ---- Drawing: a big readable bench at 10 feet: the flask, the burner, one gauge per stage, one prompt ---- */
  draw(r) {
    r.overlay(g => {
      const W2 = r.W, H2 = r.H, cx = Math.round(W2 / 2), cy = Math.round(H2 / 2);
      px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, W2, H2, '#080a0c'));
      const bw = Math.min(W2 - 16, 400), bh = Math.min(H2 - 16, 236), bx = cx - (bw >> 1), by = cy - (bh >> 1);
      E.ui.box(g, bx, by, bw, bh, { bg: ['#1a2228', '#0e1216'], border: '#59c8f0' });
      const names = ['MEASURE', 'HEAT', 'STIR', 'CRYSTALLIZE'];
      E.font.title(g, this.showing ? 'THE BATCH' : (names[this.stage] || ''), cx, by + 8, { scale: 2, align: 'center', colors: ['#e8fbff', '#9ae4ff', '#3aa8d8'] });
      // the stage pips
      for (let i = 0; i < 4; i++) { const x = cx - 98 + i * 50, done = i < this.stage || this.showing, on = i === this.stage && !this.showing; px.rect(g, x, by + 30, 46, 4, done ? '#59c8f0' : on ? '#e8c040' : '#3a4a52'); E.font.text(g, ['MEASURE', 'HEAT', 'STIR', 'CRYSTAL'][i], x + 23, by + 37, on ? '#ffffff' : '#7a8a92', { align: 'center', font: 'tiny' }); }
      const fx = bx + 70, fy = by + 150;   // the flask
      this.drawFlask(g, fx, fy);
      const gx = bx + 140, gw = bw - 156, gy = by + 58;
      if (this.showing) return this.drawResult(g, gx, gy, gw);
      if (this.intro > 0) {
        const tips = ['Hold to pour. Let go on the line.', 'Keep the temperature inside the band.', 'Swirl each direction as it reaches the line.', 'Stop each tray at the top of its shimmer.'];
        E.font.text(g, tips[this.stage], gx + gw / 2, gy + 50, '#ffffff', { align: 'center', scale: 1, wrap: gw });
        return;
      }
      const s = this.stage, I = this.I;
      if (s === 0) {
        const rg = this.reagents[this.ri] || this.reagents[1];
        E.font.text(g, rg.name.toUpperCase() + '  (' + rg.id + ')', gx, gy, rg.color, { shadow: '#000' });
        const mx = gx + 10, mh = 120, mw = 34, my = gy + 16;
        E.ui.box(g, mx, my, mw, mh, { bg: '#0a0e10', border: '#7a8a92', gradient: false });
        const fh = Math.round((mh - 4) * this.fill); px.rect(g, mx + 2, my + mh - 2 - fh, mw - 4, fh, rg.color);
        const ty = my + mh - 2 - Math.round((mh - 4) * this.target), tt = Math.max(2, Math.round((mh - 4) * this.tol));
        px.blend(g, .5, 'add', () => px.rect(g, mx - 4, ty - tt, mw + 8, tt * 2, '#3ae070'));
        px.rect(g, mx - 6, ty, mw + 12, 1, '#7aff9a');
        E.font.text(g, 'LINE', mx + mw + 10, ty - 3, '#7aff9a');
        E.font.text(g, (this.ri + 1) + ' / 2', gx + gw - 4, gy, '#9ab', { align: 'right' });
        this.prompt(g, gx + gw / 2 + 24, gy + 150, 'Hold ' + this.mainLabel(), 'to pour');
      } else if (s === 1) {
        const mx = gx + 10, mw = 34, mh = 120, my = gy + 6;
        E.ui.box(g, mx, my, mw, mh, { bg: '#0a0e10', border: '#7a8a92', gradient: false });
        const b0 = my + mh - 2 - Math.round((mh - 4) * this.cur[1]), b1 = my + mh - 2 - Math.round((mh - 4) * this.cur[0]);
        px.blend(g, .45, 'add', () => px.rect(g, mx + 2, b0, mw - 4, b1 - b0, '#3ae070'));
        const ty = my + mh - 2 - Math.round((mh - 4) * this.temp), hot = this.temp > this.cur[1], cold = this.temp < this.cur[0];
        px.rect(g, mx - 5, ty - 1, mw + 10, 3, hot ? '#ff5a3a' : cold ? '#5a9aff' : '#ffffff');
        E.font.text(g, Math.round(60 + this.temp * 180) + ' C', mx + mw + 10, ty - 3, hot ? '#ff8a6a' : cold ? '#8abaff' : '#ffffff', { shadow: '#000' });
        E.font.text(g, hot ? 'TOO HOT' : cold ? 'TOO COLD' : 'HOLD IT', gx + gw - 4, gy + 6, hot ? '#ff8a6a' : cold ? '#8abaff' : '#7aff9a', { align: 'right', scale: 1 });
        E.ui.bar(g, gx + gw - 84, gy + 20, 80, 5, this.t / this.dur, '#59c8f0');
        E.font.text(g, 'BURNER', gx + gw - 84, gy + 28, '#9ab', { font: 'tiny' }); E.ui.bar(g, gx + gw - 84, gy + 36, 80, 4, this.burner, '#e8803a');
        const up = isPad(I) ? 'L stick ↑↓' : I.lastDevice === 'mouse' ? 'W / S' : label('up', I) + ' / ' + label('down', I);
        this.prompt(g, gx + gw / 2 + 24, gy + 150, up, 'flame up / down');
      } else if (s === 2) {
        const lx = gx + 16, ly = gy + 70, span = gw - 32, speed = 90;
        px.rect(g, lx, ly - 14, span, 28, '#0a0e10');
        px.rect(g, lx + 20, ly - 16, 2, 32, '#7aff9a');
        const arrow = { up: '↑', right: '→', down: '↓', left: '←' };
        for (const n of this.notes) {
          const x = lx + 20 + (n.at - this.t) * speed; if (x < lx - 4 || x > lx + span) continue;
          const col = n.hit === null ? '#ffffff' : n.hit > .7 ? '#7aff9a' : n.hit > 0 ? '#e8c040' : '#ff5a4a';
          E.font.text(g, arrow[n.dir], Math.round(x), ly - 7, col, { scale: 2, align: 'center', shadow: '#000' });
        }
        const keys = isPad(I) ? 'D-pad or stick' : I.lastDevice === 'mouse' ? 'W A S D' : ['up', 'left', 'down', 'right'].map(a => label(a, I)).join(' ');
        this.prompt(g, gx + gw / 2 + 24, gy + 150, keys, 'swirl on the line');
      } else if (s === 3) {
        for (let i = 0; i < 3; i++) {
          const tr = this.trays[i], x = gx + 14 + i * Math.floor((gw - 20) / 3), w = Math.floor((gw - 20) / 3) - 10, y = gy + 20, h = 90;
          E.ui.box(g, x, y, w, h, { bg: '#0a0e10', border: i === this.ti ? '#e8c040' : '#5a6a72', gradient: false });
          const v = tr.stopped !== null ? tr.stopped : (i === this.ti ? tr.v || 0 : 0), hh = Math.round((h - 6) * v);
          px.blend(g, .4, 'add', () => px.rect(g, x + 3, y + 3, w - 6, Math.max(2, Math.round((h - 6) * this.zone)), '#e8c040'));
          px.rect(g, x + 3, y + h - 3 - hh, w - 6, hh, v >= 1 - this.zone ? '#9ae8ff' : '#4a8ab0');
          for (let k = 0; k < 5; k++) { const sx = x + 6 + ((k * 13 + Math.floor(this.fx * 30)) % Math.max(1, w - 12)), sy = y + h - 4 - Math.round(hh * ((k * 37) % 10) / 10); px.dot(g, sx, sy, '#e8fbff'); }
          if (tr.stopped !== null) E.font.text(g, tr.score >= 1 ? 'PERFECT' : tr.score > .6 ? 'GOOD' : 'CLOUDY', x + w / 2, y + h + 4, tr.score >= 1 ? '#7aff9a' : '#e8c040', { align: 'center', font: 'tiny' });
        }
        this.prompt(g, gx + gw / 2 + 24, gy + 150, 'Press ' + this.mainLabel(), 'at the top');
      }
      if (this.msgT > 0 && this.flashMsg) E.font.text(g, this.flashMsg, gx + gw / 2, gy + 124, this.flashMsg === 'PERFECT' ? '#7aff9a' : this.flashMsg === 'MISS' || this.flashMsg === 'OVERPOURED' ? '#ff6a5a' : '#e8c040', { align: 'center', scale: 2, shadow: '#000' });
    });
  }
  prompt(g, x, y, key, what) {
    const w = E.font.width(key) + 10;
    const tw = w + 6 + E.font.width(what), x0 = Math.round(x - tw / 2);
    E.ui.box(g, x0, y - 3, w, 13, { bg: '#e8e4dc', border: '#ffffff', gradient: false });
    E.font.text(g, key, x0 + 5, y, '#14100c');
    E.font.text(g, what, x0 + w + 6, y, '#e8e4dc', { shadow: '#000' });
  }
  drawFlask(g, x, y) {
    const lvl = clamp(this.level, .15, .95), blue = this.showing && this.result.blue;
    const col = this.showing ? (blue ? '#59c8f0' : this.result.purity > 85 ? '#a8c8c0' : '#c8b890') : this.liquid;
    // burner flame
    const fl = this.stage === 1 ? this.burner : this.stage >= 2 ? .4 : .15;
    for (let i = 0; i < 6; i++) { const h = Math.round((6 + fl * 20) * (.6 + .4 * Math.sin(this.fx * 20 + i * 1.7))); px.rect(g, x - 9 + i * 3, y + 8 - h, 2, h, i % 2 ? '#ffb040' : '#4a8aff'); }
    px.rect(g, x - 14, y + 8, 28, 6, '#5a5a62'); px.rect(g, x - 14, y + 8, 28, 1, '#8a8a92');
    const body = [[x - 26, y], [x + 26, y], [x + 7, y - 52], [x + 7, y - 74], [x - 7, y - 74], [x - 7, y - 52]];
    px.blend(g, .35, 'normal', () => px.poly(g, body, '#c8e8f0'));
    const ly = Math.round(y - 52 * lvl), wl = 7 + (26 - 7) * (1 - (y - ly) / 52);
    px.poly(g, [[x - 26, y], [x + 26, y], [x + wl, ly], [x - wl, ly]], col);
    px.blend(g, .4, 'add', () => px.poly(g, [[x - 20, y - 2], [x - 10, y - 2], [x - wl * .4, ly + 2], [x - wl * .8, ly + 2]], '#ffffff'));
    for (const b of this.bubbles) px.dot(g, Math.round(x + b.x), Math.round(y - 4 - (.8 - b.t) * 40), '#ffffff');
    px.line(g, x - 26, y, x - 7, y - 52, '#e8fbff'); px.line(g, x + 26, y, x + 7, y - 52, '#a8c8d0'); px.line(g, x - 7, y - 52, x - 7, y - 74, '#e8fbff'); px.line(g, x + 7, y - 52, x + 7, y - 74, '#a8c8d0');
    if (blue) for (let i = 0; i < 6; i++) { const a = this.fx * 2 + i; px.dot(g, Math.round(x + Math.cos(a) * 30), Math.round(y - 30 + Math.sin(a * 1.3) * 34), '#e8fbff'); }
  }
  drawResult(g, gx, gy, gw) {
    const R = this.result, s = R.scores;
    E.font.text(g, R.purity.toFixed(1) + '%', gx + gw / 2, gy, R.blue ? '#9ae8ff' : '#e8e4dc', { align: 'center', scale: 3, shadow: '#000' });
    E.font.text(g, R.blue ? 'BLUE. GLASS GRADE.' : R.purity >= 88 ? 'Clean. Not blue.' : 'Cloudy. Embarrassing.', gx + gw / 2, gy + 26, R.blue ? '#59c8f0' : '#c8b8a0', { align: 'center' });
    const rows = [['Measure', s.measure], ['Heat', s.heat], ['Stir', s.stir], ['Crystal', s.crystal]];
    rows.forEach(([n, v], i) => { const y = gy + 44 + i * 14; E.font.text(g, n, gx + 8, y, '#c8d0d4'); E.ui.bar(g, gx + 70, y + 1, gw - 120, 5, v, v > .85 ? '#59c8f0' : v > .6 ? '#e8c040' : '#d85a4a'); E.font.text(g, Math.round(v * 100) + '', gx + gw - 8, y, '#ffffff', { align: 'right' }); });
    E.font.text(g, R.lbs + ' lb  •  grade ' + R.grade, gx + gw / 2, gy + 106, '#ffffff', { align: 'center', scale: 1 });
    if (this.t > .8) this.prompt(g, gx + gw / 2 + 24, gy + 130, this.mainLabel(), 'continue');
  }
}
