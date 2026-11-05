/* ---------------- a 10-foot menu: big rows, the focused row's note below, the mouse hovers and clicks ---------------- */
let modal = null;          // a menu or the cook, over the world: play waits while one is open
class BigMenu {
  constructor(title, items, o = {}) { this.title = title; this.items = items; this.i = Math.max(0, items.findIndex(x => !x.disabled)); this.o = o; this.rows = []; this.t = 0; this.kind = 'menu'; }
  update(dt) {
    this.t += dt;
    const n = this.items.length, inp = I;
    if (inp.repeat('down')) { this.i = (this.i + 1) % n; A.sfx('select'); }
    if (inp.repeat('up')) { this.i = (this.i + n - 1) % n; A.sfx('select'); }
    const p = inp.pointer();
    if (p && inp.mouse && inp.mouse.t > inp.clock - .05) for (let k = 0; k < this.rows.length; k++) { const r = this.rows[k]; if (p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3] && this.i !== k) { this.i = k; A.sfx('tick'); } }
    const c = inp.clicked();
    let pick = this.t > .15 && (inp.pressed('confirm') || inp.pressed('interact'));
    if (c) for (let k = 0; k < this.rows.length; k++) { const r = this.rows[k]; if (c[0] >= r[0] && c[0] <= r[2] && c[1] >= r[1] && c[1] <= r[3]) { this.i = k; pick = true; } }
    if (pick) {
      const it = this.items[this.i];
      if (it.disabled) { A.sfx('bump'); return; }
      A.sfx('confirm'); inp.consumeAll();
      if (it.act) it.act(this); else this.close();
      return;
    }
    if (this.t > .15 && inp.pressed('cancel')) { A.sfx('cancel'); this.close(); if (this.o.onCancel) this.o.onCancel(); }
  }
  close() { if (modal === this) modal = null; I.consumeAll(); }
  draw(r) {
    r.overlay(g => {
      const w = Math.min(r.W - 24, 300), rowH = this.items.length > 6 ? 15 : 17, h = 46 + this.items.length * rowH + 30, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
      E.ui.box(g, x, y, w, h, { bg: ['#3a2a1a', '#140c06'], border: '#e8c890' });
      E.font.title(g, this.title, r.W / 2, y + 8, { scale: 2, align: 'center', colors: ['#fff4d0', '#ffd36a', '#c8782a'], outline: '#1a0c06' });
      if (this.o.sub) E.font.text(g, typeof this.o.sub === 'function' ? this.o.sub() : this.o.sub, r.W / 2, y + 28, '#c8b090', { align: 'center' });
      this.rows = [];
      this.items.forEach((it, k) => {
        const ry = y + 42 + k * rowH, on = k === this.i;
        this.rows.push([x + 8, ry - 2, x + w - 8, ry + rowH - 4]);
        if (on) { px.rect(g, x + 8, ry - 3, w - 16, rowH - 1, '#6a4a22'); px.rect(g, x + 8, ry - 3, 3, rowH - 1, '#ffd36a'); }
        E.font.text(g, (on ? '▸ ' : '  ') + it.label, x + 16, ry + 1, it.disabled ? '#7a6a5a' : on ? '#fff4d0' : '#e8d8b8', { shadow: '#000' });
        if (it.right) E.font.text(g, it.right, x + w - 16, ry + 1, it.disabled ? '#7a6a5a' : '#9ae07a', { align: 'right', shadow: '#000' });
      });
      const it = this.items[this.i];
      if (it && it.note) E.font.text(g, it.note, r.W / 2, y + h - 22, '#c8b090', { align: 'center', wrap: w - 20 });
      E.font.text(g, lbl('confirm') + ' choose   ' + lbl('cancel') + ' back', r.W / 2, y + h + 6, '#e8d8b8', { align: 'center', shadow: '#000' });
    });
  }
}
function openMenu(title, items, o) { modal = new BigMenu(title, items, o); I.consumeAll(); return modal; }

/* the RV: cook, refill flasks */
function rvMenu() {
  const refill = () => { S.flasks.fulm = FLASK_MAX.fulm; if (S.flags.smoke) S.flasks.smoke = FLASK_MAX.smoke; A.sfx('powerup'); toast('Flasks refilled.'); modal = null; };
  openMenu('THE RV', [
    { label: 'Cook a batch', note: 'Three stages: measure, heat, crystallize. Purity sets the price.', act: () => { modal = new Cook({ hub: W.kind === 'hub' }); } },
    W.kind === 'hub' ? null : { label: 'Refill flasks', right: S.flasks.fulm + '/' + FLASK_MAX.fulm + (S.flags.smoke ? '  ' + S.flasks.smoke + '/' + FLASK_MAX.smoke : ''), note: 'Fulminated mercury' + (S.flags.smoke ? ' and smoke' : '') + ', mixed fresh.', act: refill },
    { label: 'Leave', note: '', act: m => m.close() }
  ].filter(Boolean), { sub: 'Parked in the backyard. It smells like science.' });
}
/* Lenny's shop: upgrades for clean cash */
function shopMenu(keep) {
  const items = UPGRADES.map(u => {
    const owned = S.up[u.id] && !u.repeat, afford = S.clean >= u.cost;
    return { label: u.name, right: owned ? 'OWNED' : fmt$(u.cost), disabled: owned || !afford, note: u.text + (owned ? '' : afford ? '' : '  (Needs clean cash.)'),
      act: () => {
        S.clean -= u.cost; S.up[u.id] = true; A.sfx('cash'); log('buy', u.id);
        if (u.id === 'cover') { S.heat = Math.floor(S.heat / 2); toast('Lenny makes a call. Heat halved.'); }
        if (u.id === 'pistol') { refreshHeroRig(W.hero); toast('Your attack now shoots. Aim with the mouse or right stick.'); }
        modal = null; shopMenu(UPGRADES.indexOf(u));
      } };
  });
  items.push({ label: 'Leave', note: '"Remember: you never met me."', act: m => m.close() });
  const m = openMenu('LENNY\'S', items, { sub: () => 'Clean cash ' + fmt$(S.clean) + '   Dirty ' + fmt$(S.dirty) });
  if (keep !== undefined) { m.i = keep; m.t = .15; }
}
/* Bubble Bros: launder dirty cash into clean */
function launderMenu() {
  const got = Math.floor(S.dirty * launderRate());
  openMenu('BUBBLE BROS', [
    { label: 'Launder all dirty cash', right: S.dirty > 0 ? fmt$(S.dirty) + ' > ' + fmt$(got) : '', disabled: S.dirty <= 0, note: 'The wash keeps ' + Math.round((1 - launderRate()) * 100) + ' cents of every dollar. Nobody asks.',
      act: () => { S.clean += got; S.dirty = 0; A.sfx('cash'); P.glints(W.hero.x, W.hero.y, 24, 12, '#c8f0ff'); log('launder', got); modal = null; toast(fmt$(got) + ' clean. Squeaky.'); story('launder'); } },
    { label: 'Leave', note: '', act: m => m.close() }
  ], { sub: 'Dirty ' + fmt$(S.dirty) + '   Clean ' + fmt$(S.clean) });
}

/* ---------------- street deals ---------------- */
const BUYER_NAMES = ['SKINNY PETE', 'BADGE', 'WENDELL', 'COMBO KID', 'TORTUGA', 'SPOOGE JR.', 'ANDREA', 'NO-DOZE', 'GONZO', 'EMILIO', 'BRANDON', 'CLOVIS'].map(n => n.replace('SPOOGE JR.', 'SPROCKET').replace('NO-DOZE', 'DOZER').replace('COMBO KID', 'COMBO').replace('SKINNY PETE', 'SLIM PETE').replace('BADGE', 'BADGER'));
let buyerN = 0;
function spawnBuyer() {
  const used = new Set(W.buyers.map(b => b.spot.i));
  const free = BUYER_SPOTS.filter(s => !used.has(s.i) && (!W.hero || Math.hypot(s.x - W.hero.x, s.y - W.hero.y) > 60));
  if (!free.length) return;
  const spot = choose(rnd, free), n = buyerN++;
  const b = { x: spot.x, y: spot.y, z: 0, spot, name: BUYER_NAMES[n % BUYER_NAMES.length], demand: 1 + Math.floor(rnd() * 3), price: 380 + Math.floor(rnd() * 140), rig: RIGS.buyer(n), facing: Math.PI / 2, t: rnd() * 6 };
  W.buyers.push(b);
}
function buyersUpdate(dt) {
  if (W.kind === 'town' && S.ep < 2) { W.buyers.length = 0; return; }
  W.buyerT = (W.buyerT || 0) - dt;
  if (W.buyers.length < 2) W.buyerT = Math.min(W.buyerT, 1.5);
  if (W.buyers.length < 3 && W.buyerT <= 0) { spawnBuyer(); W.buyerT = W.kind === 'hub' ? 3 : 9; }
  for (const b of W.buyers) {
    b.t += dt;
    if (W.hero) { const d = dist(b, W.hero); if (d < 80) b.facing = angTo(b, W.hero); else b.facing = Math.PI / 2 + Math.sin(b.t * .5) * 1.2; }
    b.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, facing: b.facing, pose: Math.sin(b.t * .7) > .6 ? 'hips' : undefined });
  }
}
function dealWith(b) {
  if (S.product <= 0) { say('thug', ['You got nothing? Then why are you talking to me, man?'], { name: b.name, portrait: b.rig }); return; }
  const amt = Math.min(S.product, b.demand), pay = Math.round(amt * b.price * (.5 + S.purity / 100) * (S.up.phone ? 1.1 : 1) / 10) * 10;
  const lines = [['Is that the blue? Everybody\'s talking about the blue.', 'Gimme ' + amt + '. ' + fmt$(pay) + ', counted twice.'], ['Yo, the blue stuff? For real?', amt + ' pounds. ' + fmt$(pay) + '. Don\'t look at me like that.'], ['My guy. My GUY. ' + amt + ' of the good stuff.', fmt$(pay) + '. We never met.']];
  say('thug', choose(rnd, lines), { name: b.name, portrait: b.rig, onDone: () => {
    S.product = Math.round((S.product - amt) * 10) / 10; if (S.product <= 0) { S.product = 0; }
    S.dirty += pay; S.earned += pay; S.deals++; S.epDeals++; heatAdd(7);
    A.sfx('cash'); P.text(b.x, b.y, 34, '+' + fmt$(pay), '#9ae07a', { scale: 1 });
    E.prune(W.buyers, x => x === b); W.buyerT = W.kind === 'hub' ? 2 : 8;
    log('deal', pay);
    if (W.onDeal) W.onDeal(pay);
    story('deal');
  } });
}

/* ---------------- the cook: measure, heat, crystallize ---------------- */
class Cook {
  constructor(o = {}) {
    this.kind = 'cook'; this.o = o; this.phase = 'intro'; this.t = 0; this.scores = { measure: [], heat: 0, cryst: [] }; this.msg = null; this.msgT = 0;
    this.glass = !!S.up.glass; this.demo = !!(W && W.demo); this.rand = E.rng(S.cooks * 31 + 7);
    this.reagents = ['PRECURSOR', 'REDUCER', 'CATALYST']; this.ri = 0; this.needle = 0; this.dir = 1; this.zone = this.newZone();
    this.temp = .3; this.inBand = 0; this.heatT = 0; this.HEAT_LEN = 9;
    this.rings = []; this.ringI = 0; this.ringT = 0; this.bubbles = [];
    music('cook'); I.consumeAll();
    if (W && !W.demo && W.kind !== 'hub' && S.cooks === 0) toastOnce('cook1', 'Press ' + lbl('interact') + ' (or click) when the needle is in the green.');
    this.say(['Okay Mr. G. Let\'s cook.', 'Yeah, science!', 'I got the respirators.', 'Please don\'t blow us up.'][S.cooks % 4]);
    log('cook-start', S.cooks);
  }
  newZone() { const w = (this.glass ? .22 : .16) * (1 - (this.ri || 0) * .12); return { c: .2 + this.rand() * .6, w }; }
  say(text) { if (this.o.hub || !W || W.kind === 'hub') return; say('dusty', [text], { modal: false, auto: 2.2, place: 'bottom' }); }
  pressed() { return I.pressed('interact') || I.pressed('confirm') || I.pressed('attack'); }
  held() { return I.down('interact') || I.down('confirm') || I.down('attack') || I.down('up'); }
  flash(msg, col) { this.msg = [msg, col]; this.msgT = .8; }
  update(dt) {
    this.t += dt; this.msgT -= dt;
    for (const b of this.bubbles) { b.y -= b.v * dt; b.t -= dt; } E.prune(this.bubbles, b => b.t <= 0);
    if (this.phase !== 'result' && this.rand() < dt * 8) this.bubbles.push({ x: this.rand(), y: 0, v: 10 + this.rand() * 20, t: 1.4 });
    if (this.phase === 'intro') { if (this.t > 1.4) { this.phase = 'measure'; this.t = 0; } return; }
    if (this.phase === 'measure') {
      const sp = .75 + this.ri * .3;
      this.needle += this.dir * sp * dt; if (this.needle > 1) { this.needle = 1; this.dir = -1; } if (this.needle < 0) { this.needle = 0; this.dir = 1; }
      let press = this.pressed();
      if (this.demo || this.o.auto) press = Math.abs(this.needle - this.zone.c) < this.zone.w * .2;
      const late = this.t > 4.5;            // nobody pressed: the reagent goes in badly measured
      if (late) press = true;
      if (press && this.t > .3) {
        const off = Math.abs(this.needle - this.zone.c) / (this.zone.w / 2);
        const s0 = off <= .35 ? 1 : off <= 1 ? 1 - (off - .35) * .45 : Math.max(0, .6 - (off - 1) * .6);
        const s = late ? 0 : s0;
        this.scores.measure.push(s);
        this.flash(s >= .95 ? 'PERFECT' : s >= .7 ? 'GOOD' : s > .2 ? 'SLOPPY' : 'MISS', s >= .7 ? '#7ae07a' : s > .2 ? '#e8c050' : '#e85a4a');
        A.sfx(s >= .7 ? 'good' : 'bad'); A.sfx('bubble');
        this.ri++; this.t = 0;
        if (this.ri >= this.reagents.length) { this.phase = 'heat'; this.t = 0; this.say(['Keep it in the band, Mr. G.', 'Not too hot. Not too hot!'][S.cooks % 2]); }
        else { this.zone = this.newZone(); this.needle = this.rand() < .5 ? 0 : 1; this.dir = this.needle ? -1 : 1; }
      }
      return;
    }
    if (this.phase === 'heat') {
      this.heatT += dt;
      const band = this.band();
      let on = this.held();
      if (this.demo || this.o.auto) on = this.temp < (band[0] + band[1]) / 2;
      const wob = Math.sin(this.heatT * 2.3) * .08 + Math.sin(this.heatT * 5.1) * .05;
      this.temp = clamp(this.temp + (on ? .34 : -.26) * dt + wob * dt, 0, 1);
      if (this.temp >= band[0] && this.temp <= band[1]) this.inBand += dt;
      if (game.time % .25 < dt) A.sfx('tick', { pitch: .5 + this.temp });
      if (this.heatT >= this.HEAT_LEN) { this.scores.heat = clamp(this.inBand / (this.HEAT_LEN - 1.5), 0, 1); this.flash(this.scores.heat > .85 ? 'STEADY HANDS' : this.scores.heat > .5 ? 'OKAY' : 'SCORCHED', this.scores.heat > .5 ? '#7ae07a' : '#e85a4a'); this.phase = 'cryst'; this.t = 0; this.ringT = .6; this.say('Now it crystallizes. Watch the rings.'); }
      return;
    }
    if (this.phase === 'cryst') {
      this.ringT -= dt;
      if (this.ringT <= 0 && this.ringI < 6) { this.rings.push({ t: 0, x: .3 + this.rand() * .4, y: .35 + this.rand() * .3, done: false }); this.ringI++; this.ringT = .75; }
      for (const g of this.rings) g.t += dt;
      const live = this.rings.find(g => !g.done);
      let press = this.pressed();
      if (live && (this.demo || this.o.auto)) press = Math.abs(this.ringR(live) - 9) < 1.2;
      if (live && press) {
        const err = Math.abs(this.ringR(live) - 9), s = err < 2.5 ? 1 : err < 6 ? .7 : err < 10 ? .35 : 0;
        live.done = true; live.s = s; this.scores.cryst.push(s); A.sfx(s >= .7 ? 'glass' : 'bad');
        this.flash(s >= 1 ? 'PERFECT' : s >= .7 ? 'GOOD' : s > 0 ? 'CLOUDY' : 'MISS', s >= .7 ? '#7ae07a' : '#e8c050');
      }
      for (const g of this.rings) if (!g.done && this.ringR(g) < 1) { g.done = true; g.s = 0; this.scores.cryst.push(0); this.flash('MISS', '#e85a4a'); A.sfx('bad'); }
      if (this.ringI >= 6 && this.rings.every(g => g.done)) { this.finish(); }
      return;
    }
    if (this.phase === 'result') {
      if (this.t > .8 && (this.pressed() || (this.demo || this.o.auto) && this.t > 2.5 || I.clicked())) this.close();
    }
  }
  band() { const g = this.glass ? .04 : 0; return [.56 - g, .74 + g]; }
  ringR(g) { return 40 - g.t * 30; }
  finish() {
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const sc = .3 * avg(this.scores.measure) + .35 * this.scores.heat + .35 * avg(this.scores.cryst);
    this.score = sc;
    this.purity = Math.min(99.1, Math.round((70 + 27 * sc + (this.glass ? 3 : 0)) * 10) / 10);
    this.yield = 6 + (S.up.reactor ? 4 : 0);
    this.phase = 'result'; this.t = 0;
    A.sfx(this.purity >= 90 ? 'powerup' : 'coin');
    log('cook', this.purity);
  }
  close() {
    modal = null; I.consumeAll();
    if (this.phase === 'result') {
      const old = S.product * S.purity;
      S.product += this.yield; S.purity = Math.round((old + this.yield * this.purity) / S.product * 10) / 10;
      S.cooks++; S.best = Math.max(S.best, this.purity);
      if (W && W.onCook) W.onCook(this.purity, this.yield);
      music(W && W.kind === 'hub' ? 'cook' : 'town');
      story('cook', { purity: this.purity });
    }
  }
  draw(r) {
    const glass = this.glass;
    r.overlay(g => {
      const Wd = r.W, Hd = r.H;
      // the RV's interior: wood panelling, a window onto the desert, the bench
      px.rect(g, 0, 0, Wd, Hd, '#2a1c12');
      for (let x = 0; x < Wd; x += 12) px.rect(g, x, 0, 1, Hd * .62, '#22160e');
      px.rect(g, Wd * .62, 18, Wd * .3, 46, '#e8a060'); px.rect(g, Wd * .62, 44, Wd * .3, 20, '#c88050'); px.rect(g, Wd * .62, 56, Wd * .3, 8, '#a8603a');
      { const wx = Math.round(Wd * .62) - 3, ww = Math.round(Wd * .3) + 6; px.rect(g, wx, 15, ww, 3, '#5a3a22'); px.rect(g, wx, 64, ww, 3, '#5a3a22'); px.rect(g, wx, 15, 3, 52, '#5a3a22'); px.rect(g, wx + ww - 3, 15, 3, 52, '#5a3a22'); px.rect(g, wx + ww / 2 - 1, 15, 2, 52, '#5a3a22'); }
      px.rect(g, 0, Hd * .62, Wd, Hd * .38, '#5a5e62'); px.rect(g, 0, Hd * .62, Wd, 3, '#8a9296');
      // the bench: a condenser on a stand, a gas mask, the notebook with the formula, a box of glassware
      { const cy0 = Math.round(Hd * .62); px.rect(g, Math.round(Wd * .08), cy0 - 46, 3, 46, '#8a9296'); px.rect(g, Math.round(Wd * .08) - 6, cy0 - 2, 16, 2, '#5a5e62');
        for (let k = 0; k < 5; k++) px.rect(g, Math.round(Wd * .08) + 3, cy0 - 40 + k * 7, 14, 3, k % 2 ? '#a8d8e8' : '#c8eef8');
        px.line(g, Math.round(Wd * .08) + 17, cy0 - 40, Math.round(Wd * .28) - 6, cy0 - 62, '#c8e0e8', 2);
        px.disc(g, Math.round(Wd * .44), cy0 + 14, 8, '#3a3e42'); px.disc(g, Math.round(Wd * .44) - 4, cy0 + 12, 2, '#a8d8e8'); px.disc(g, Math.round(Wd * .44) + 4, cy0 + 12, 2, '#a8d8e8'); px.rect(g, Math.round(Wd * .44) - 3, cy0 + 18, 6, 6, '#5a5e62');
        px.rect(g, Math.round(Wd * .06), cy0 + 18, 40, 26, '#e8e0c8'); for (let k = 0; k < 5; k++) px.rect(g, Math.round(Wd * .06) + 4, cy0 + 22 + k * 4, 28 - (k % 3) * 6, 1, '#3a4a8a');
        E.font.text(g, 'C10H15N', Math.round(Wd * .06) + 2, cy0 + 46, '#c8c0a8', { font: 'tiny' });
        for (let k = 0; k < 4; k++) { const bx = Math.round(Wd * .52) + k * 12; px.rect(g, bx, cy0 - 14, 7, 14, '#d8eef4'); px.rect(g, bx + 1, cy0 - 7, 5, 6, ['#58c8f0', '#e8c050', '#a070d0', '#7ae07a'][k]); } }
      // the flask, glowing with whatever it is becoming
      const fx = Math.round(Wd * .28), fy = Math.round(Hd * .62);
      const col = this.phase === 'result' ? purityColor(this.purity) : this.phase === 'heat' ? mixHex('#c8b060', '#ff7040', this.temp) : this.phase === 'cryst' ? '#58c8f0' : '#c8d8a0';
      px.poly(g, [[fx - 6, fy - 64], [fx + 6, fy - 64], [fx + 6, fy - 40], [fx + 30, fy - 4], [fx - 30, fy - 4], [fx - 6, fy - 40]], '#d8eef4');
      px.poly(g, [[fx - 4, fy - 36], [fx + 4, fy - 36], [fx + 26, fy - 7], [fx - 26, fy - 7]], col);
      for (const b of this.bubbles) px.disc(g, fx - 18 + b.x * 36, fy - 10 - (1.4 - b.t) * 22, 1.5, '#ffffff');
      if (this.phase === 'heat') { const fl = 6 + this.temp * 10 + Math.sin(this.t * 30) * 2; px.poly(g, [[fx - 10, fy], [fx + 10, fy], [fx, fy - fl]], '#ff9a30'); px.poly(g, [[fx - 5, fy], [fx + 5, fy], [fx, fy - fl * .6]], '#ffe080'); }
      r.glowDisc(g, fx, fy - 20, 40, col, .35);
      // the panel: the stage's own gauge
      const px0 = Math.round(Wd * .5), pw = Math.min(Math.round(Wd * .46), 220), py0 = Math.round(Hd * .2);
      E.ui.box(g, px0 - 8, py0 - 10, pw + 16, 120, { bg: ['#1a2420', '#0a100e'], border: '#8ac8b0' });
      const stageName = { intro: 'COOK', measure: 'MEASURE: ' + (this.reagents[this.ri] || ''), heat: 'HEAT: HOLD ' + lbl('interact'), cryst: 'CRYSTALLIZE', result: 'BATCH COMPLETE' }[this.phase];
      E.font.text(g, stageName, px0 + pw / 2, py0 - 2, '#c8f0e0', { align: 'center', shadow: '#000' });
      if (this.phase === 'intro') E.font.title(g, 'LET\'S COOK', px0 + pw / 2, py0 + 40, { scale: 2, align: 'center', colors: ['#e8fff8', '#8ae0c8', '#3a9a80'] });
      if (this.phase === 'measure') {
        const bx = px0 + 6, bw = pw - 12, by = py0 + 40;
        px.rect(g, bx, by, bw, 14, '#2a3430');
        px.rect(g, bx + (this.zone.c - this.zone.w / 2) * bw, by, this.zone.w * bw, 14, '#3a8a4a');
        px.rect(g, bx + (this.zone.c - this.zone.w * .175) * bw, by, this.zone.w * .35 * bw, 14, '#6ae07a');
        const nx = Math.round(bx + this.needle * bw); px.rect(g, nx - 1, by - 6, 3, 26, '#ffffff'); px.poly(g, [[nx - 4, by - 8], [nx + 4, by - 8], [nx, by - 3]], '#ffffff');
        E.font.text(g, 'Reagent ' + (this.ri + 1) + ' of 3', px0 + pw / 2, by + 26, '#a8c8b8', { align: 'center' });
        E.font.text(g, 'Press ' + lbl('interact') + ' in the green', px0 + pw / 2, by + 44, '#e8fff0', { align: 'center', shadow: '#000' });
      }
      if (this.phase === 'heat') {
        const bx = px0 + pw / 2 - 10, by = py0 + 14, bh = 84, band = this.band();
        px.rect(g, bx, by, 20, bh, '#2a3430');
        px.rect(g, bx, by + (1 - band[1]) * bh, 20, (band[1] - band[0]) * bh, '#3a8a4a');
        px.rect(g, bx + 4, by + (1 - this.temp) * bh, 12, this.temp * bh, mixHex('#e8c050', '#ff4a30', this.temp));
        px.rect(g, bx - 6, Math.round(by + (1 - this.temp) * bh) - 1, 32, 3, '#ffffff');
        E.font.text(g, Math.round(60 + this.temp * 90) + ' C', bx + 34, by + (1 - this.temp) * bh - 3, '#ffffff', { shadow: '#000' });
        E.font.text(g, 'IN BAND ' + Math.round(this.inBand * 10) / 10 + 's', bx - 70, by + 10, '#a8c8b8');
        E.font.text(g, Math.max(0, Math.ceil(this.HEAT_LEN - this.heatT)) + 's', bx - 70, by + 24, '#e8fff0');
      }
      if (this.phase === 'cryst') {
        for (const gg of this.rings) {
          if (gg.done && gg.t > 3) continue;
          const cx = px0 + gg.x * pw, cy = py0 + 14 + gg.y * 80;
          ringPx(g, cx, cy, 9, gg.done ? (gg.s >= .7 ? '#6ae07a' : '#e85a4a') : '#8ac8b0');
          if (!gg.done) ringPx(g, cx, cy, Math.max(1, this.ringR(gg)), '#ffffff');
          else px.disc(g, cx, cy, 4, gg.s >= .7 ? '#58c8f0' : '#5a5040');
        }
        E.font.text(g, 'Press ' + lbl('interact') + ' as the white ring meets the green', px0 + pw / 2, py0 + 98, '#e8fff0', { align: 'center', shadow: '#000' });
      }
      if (this.phase === 'result') {
        E.font.title(g, this.purity.toFixed(1) + '%', px0 + pw / 2, py0 + 18, { scale: 3, align: 'center', colors: ['#ffffff', purityColor(this.purity), '#2a6a8a'], outline: '#06141a' });
        E.font.text(g, 'PURITY', px0 + pw / 2, py0 + 50, '#a8c8b8', { align: 'center' });
        E.font.text(g, '+' + this.yield + ' lbs of product', px0 + pw / 2, py0 + 66, '#e8fff0', { align: 'center' });
        E.font.text(g, this.purity >= 96 ? '"This is not meth. This is art."' : this.purity >= 90 ? '"Clean. Professional."' : this.purity >= 80 ? '"Street grade. Sellable."' : '"Embarrassing."', px0 + pw / 2, py0 + 82, '#c8b090', { align: 'center' });
        E.font.text(g, lbl('confirm') + ' continue', px0 + pw / 2, py0 + 100, '#ffffff', { align: 'center', shadow: '#000' });
      }
      if (this.msgT > 0 && this.msg) E.font.title(g, this.msg[0], px0 + pw / 2, py0 + 118 - (this.msgT * 8), { scale: 2, align: 'center', colors: ['#ffffff', this.msg[1], this.msg[1]], outline: '#000' });
      if (glass) E.font.text(g, 'LAB-GRADE GLASSWARE', 6, Hd - 12, '#58c8f0');
    });
  }
}
// a 1-pixel ring (the engine's shapes are filled; this steps round the circle in whole pixels)
function ringPx(g, cx, cy, rad, c) { const n = Math.max(12, Math.round(rad * 6)); for (let i = 0; i < n; i++) { const a = i / n * TAU; px.dot(g, Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), c); } }
