/* 40-poolhop: Pool Hop. Cross the lagoon on 32 floating pads before the time runs out. Each pad shows one of the four
 * face buttons for your device; press it as the hopper lands, on the beat of 'lagoon' (judged on the music clock:
 * PERFECT within 60 ms, GOOD within 130 ms, times the windows slider). A miss, a wrong button or an early press: she
 * slips, splashes, swims back and goes again from the same pad on the next bar. Eight PERFECTs in a row add a second.
 * From pad 12 the pads wobble (the button flips, and settles a beat before you need it); from pad 22, double pads. */
G.POOL = { N: 32, WOBBLE: 12, DOUBLE: 22 };
const HOPS = ['hopA', 'hopB', 'hopX', 'hopY'];
G.makePoolHopCourse = seed => {
  const r = E.rng(seed), pads = [];
  for (let i = 0; i <= G.POOL.N; i++) {
    const x = 80 + i * 30, y = 120 + Math.sin(i * .55) * 34 + (r() - .5) * 10;
    const a = Math.floor(r() * 4); let b = null, alt = null;
    if (i >= G.POOL.DOUBLE && i < G.POOL.N) { b = (a + 1 + Math.floor(r() * 3)) % 4; }
    else if (i >= G.POOL.WOBBLE && i < G.POOL.N) alt = (a + 1 + Math.floor(r() * 3)) % 4;
    pads.push({ x, y, a: i === 0 ? null : a, b: i === 0 ? null : b, alt, col: ['#ffd04a', '#ff5f7a', '#2ec4c9', '#7cff5a'][i % 4] });
  }
  return pads;
};
G.poolMap = () => G._poolMap || (G._poolMap = new E.TileMap({ rows: Array.from({ length: 16 }, (_, cy) => Array.from({ length: 72 }, (_, cx) => cy < 2 || cy > 13 ? 'g' : cx < 4 || cx > 67 ? 'd' : 'w').join('')),
  legend: { w: { floor: 'pool', block: true }, d: { floor: 'tile' }, g: { floor: 'grass' } }, floorTex: (x, y, tag) => tag === 'pool' ? G.FLOOR_TEX.pool(x, y) : tag === 'grass' ? G.FLOOR_TEX.grass(x, y) : G.FLOOR_TEX.tile(x, y), outside: '#3a8a4a', ao: 0 }));
G.scenes.poolhop = {
  pausable: true, view: 'court', input: G.PRESETS.POOLHOP, camera: false,
  enter(d) {
    G.useInput('POOLHOP'); this.from = (d && d.from) || 'pool'; this.bot = !!(d && d.bot) || G.attract; this.map = G.poolMap();
    this.pads = G.makePoolHopCourse((d && d.seed) || 7); this.i = 0; this.left = G.T.poolTime; this.perf = 0; this.good = 0; this.falls = 0; this.chain = 0; this.state = 'count'; this.t = 0; this.fallT = 0; this.resume = null;
    this.rig = G.makeRig(G.state && !this.bot ? G.state.me : 'mei', G.state && !this.bot ? G.wearOf(G.state.me) : {}); this.pos = { x: this.pads[0].x, y: this.pads[0].y, z: 0 };
    this.watchers = (G.state && !this.bot ? G.presentAt('pool') : ['tess', 'amara']).slice(0, 3).map((id, k) => ({ id, rig: G.makeRig(id, (G.state && G.wearOf(id)) || {}), x: 80 + k * 26, y: 236 }));
    this.bpm = G.T.poolBpm; this.spb = 60 / this.bpm; this.clock0 = null; this.pressed = {}; this.judge = null; this.result = null; this.nav = new G.Nav();
    G.music('lagoon', { restart: true, sync: true }); if (G.game.audio.tempo) G.game.audio.tempo(this.bpm);
    G.applyLight(G.state ? G.todFor(G.state.slot, G.weatherNow(), G.state.day) : 'afternoon'); G.ambience('pool'); G.game.setZoom(1.15);
    this.firstBeat = 4;   // the count-in: three beats, then HOP
    this.own = 0; this.b0 = null; this.base = this.firstBeat; this.baseI = 1; this.botDone = false; this.bonus = 0; this.cheerT = 0; this.judge = null;
  },
  exit() { G.game.setZoom(1); if (G.game.audio.tempo && G.SONGS.lagoon) G.game.audio.tempo(G.SONGS.lagoon.bpm); },
  beat() {   // beats since Pool Hop began, on the music clock (the song is restarted on entry; its start is taken as beat 0)
    const P = G.game.audio.pos, raw = P && P.playing && P.t > 0 ? P.t * this.bpm / 60 : null;
    if (raw !== null) { if (this.b0 === null) this.b0 = raw - this.own * this.bpm / 60; return raw - this.b0; }
    return this.own * this.bpm / 60;
  },
  padButtons(i, beatNow) {
    const p = this.pads[i]; if (!p || p.a === null) return [];
    if (p.b !== null) return [p.a, p.b];
    if (p.alt !== null) { const due = this.dueBeat(i), settle = due - 1; if (beatNow < settle) return [Math.floor(beatNow * 2) % 2 ? p.alt : p.a]; }
    return [p.a];
  },
  dueBeat(i) { return this.base + (i - this.baseI); },
  update(dt) {
    this.t += dt; this.own += dt; const I = G.game.input, b = this.beat(), win = { p: .06 * G.T.poolWindowMul, g: .13 * G.T.poolWindowMul };
    for (const w of this.watchers) G.Anim.idle(w.rig, dt, { x: w.x, y: w.y, z: 0, facing: -Math.PI / 2, pose: this.cheerT > 0 ? 'cheer' : null, expr: 'smile' });
    this.cheerT = Math.max(0, (this.cheerT || 0) - dt);
    if (this.state === 'results') { this.nav.update(this.resultItems(), I); G.Anim.idle(this.rig, dt, { x: this.pos.x, y: this.pos.y, z: 0, facing: Math.PI / 2, pose: this.result.cleared ? 'cheer' : 'kneel' }); return; }
    if (this.state === 'count') {
      if (b >= this.firstBeat - .5) { this.state = 'hop'; this.base = this.firstBeat; this.baseI = 1; }
      this.animate(dt, b); return;
    }
    this.left -= dt;
    if (this.state === 'fall') { this.fallT += dt; if (this.fallT > 1.8 && b >= this.resume - .5) { this.state = 'hop'; this.base = this.resume; this.baseI = this.i + 1; } this.animate(dt, b); if (this.left <= 0) this.finish(false); return; }
    // the hop: the next pad's button(s) are due on its beat
    const next = this.i + 1, due = this.dueBeat(next), errB = b - due, err = errB * this.spb, want = this.padButtons(next, due);
    const press = HOPS.findIndex(a => I.pressed(a)), presses = HOPS.map((a, k) => I.pressed(a) ? k : -1).filter(k => k >= 0);
    // the attract's demo bot, or the dev autopilot (whose results count)
    if (this.bot || this.auto || G.devFlags.poolBot) { if (err >= -.004 && !this.botDone) { this.botDone = true; for (const k of want) this.pressed[k] = err; this.judgeHop(next, want, err, win); } }
    else if (presses.length) {
      for (const k of presses) if (!(k in this.pressed)) this.pressed[k] = err;
      const allIn = want.every(k => k in this.pressed), wrong = presses.some(k => !want.includes(k));
      if (wrong || Math.abs(err) > win.g + .02 && err < 0) this.slip(wrong ? 'WRONG' : 'EARLY');
      else if (allIn) this.judgeHop(next, want, Math.max(...want.map(k => Math.abs(this.pressed[k]))), win);
    }
    if (this.state === 'hop' && err > win.g) this.slip('LATE');
    this.animate(dt, b);
    if (this.left <= 0) this.finish(false);
    void press;
  },
  judgeHop(next, want, err, win) {
    const q = Math.abs(err) <= win.p ? 'PERFECT' : 'GOOD';
    this.i = next; this.pressed = {}; this.botDone = false; this.judge = { q, t: 0 };
    if (q === 'PERFECT') { this.perf++; this.chain++; if (this.chain % 8 === 0) { this.left += 1; this.bonus = 1.2; } } else { this.good++; this.chain = 0; }
    G.sfx('hopLand'); G.fx.splash(this.pads[next].x, this.pads[next].y, 0, 4); this.rig.land(.4);
    if (this.i >= G.POOL.N) this.finish(true);
  },
  slip(why) {
    this.state = 'fall'; this.fallT = 0; this.falls++; this.chain = 0; this.pressed = {}; this.judge = { q: why, t: 0 };
    const b = this.beat(); this.resume = Math.ceil((b + 1.8 / this.spb) / 4) * 4;
    G.sfx('splash'); const p = this.pads[this.i + 1] || this.pads[this.i]; G.fx.splash((this.pos.x + p.x) / 2, (this.pos.y + p.y) / 2, 0, 16);
  },
  finish(cleared) {
    if (this.state === 'results') return;
    const timeUsed = G.T.poolTime - Math.max(0, this.left), left = Math.max(0, this.left), prize = cleared ? Math.round((2000 + 400 * this.perf + 150 * left) * G.T.prizeMul) : 0;
    this.state = 'results'; this.result = { cleared, time: timeUsed, perf: this.perf, falls: this.falls, prize, best: false };
    G.music(null); G.sting(cleared ? 'win' : 'lose'); this.cheerT = cleared ? 3 : 0;
    const st = G.state;
    if (st && !this.bot) {
      if (cleared) { G.earn(prize, 'poolhop'); if (!st.stats.poolBest || timeUsed < st.stats.poolBest) { st.stats.poolBest = +timeUsed.toFixed(2); this.result.best = true; } if (st.partner && G.presentAt('pool').includes(st.partner)) G.addAff(st.partner, 2, 'poolhop'); }
    }
    G.bus.emit('poolhop', this.result);
  },
  resultItems() { const W = G.game.W, H = G.game.H; return [{ id: 'ok', x: Math.round(W / 2 - 50), y: Math.round(H * .78), w: 100, h: 18, label: 'Continue', primary: true, onPress: () => this.leave() }]; },
  leave() { if (this.bot || !G.state) { G.game.go('title'); return; } const r = G.endSlot(); G.game.go(r === 'dayEnd' ? 'dayend' : 'map'); },
  animate(dt, b) {
    // between pads the hopper arcs over the half beat before each landing
    const s = this.pos;
    if (this.state === 'fall') { const p = this.pads[this.i], k = clamp((this.fallT - .4) / 1.2, 0, 1); s.z = this.fallT < .4 ? -this.fallT * 30 : -12 + k * 12; s.x = lerp(s.x, p.x, k * .2); s.y = lerp(s.y, p.y, k * .2); G.Anim.idle(this.rig, dt, { x: s.x, y: s.y, z: s.z, facing: 0, hurt: this.fallT < .5, down: this.fallT < .6 ? .7 : 0 }, { clip: this.fallT > .5 && this.fallT < 1.5 ? 'Swim_Fwd_Loop' : null, t: this.fallT }); return; }
    const next = this.i + 1, due = this.state === 'count' ? this.firstBeat : this.dueBeat(next), u = clamp(1 - (due - b) / .5, 0, 1), A = this.pads[this.i], B = this.pads[Math.min(next, this.pads.length - 1)];
    if (u > 0 && this.i < G.POOL.N) { s.x = lerp(A.x, B.x, u); s.y = lerp(A.y, B.y, u); s.z = Math.sin(u * Math.PI) * 16; } else { s.x = A.x; s.y = A.y; s.z = 0; }
    G.Anim.idle(this.rig, dt, { x: s.x, y: s.y, z: s.z, facing: Math.atan2(B.y - A.y, B.x - A.x), air: s.z > 3, poseW: { vready: u > 0 ? 0 : .6 } });
    if (this.judge) this.judge.t += dt; if (this.bonus) this.bonus -= dt;
  },
  draw(r) {
    G.game.focus(this.pos.x + 30, this.pos.y, 10);
    const b = this.beat(), I = G.game.input;
    G.drawSky(r, G.curTod || 'afternoon', r.w(this.pos.x, 0, 0)[1]);
    this.map.drawFloor(r);
    for (let x = 30; x < 72 * 16; x += 70) { r.prop('palm', x, 14, 0, { size: 1.5 }); r.prop('palm', x + 35, 236, 0, { size: 1.4 }); }
    r.shape('cabana', 30, 120, 0, { scale: .8 }); r.shape('flamingo', 600, 196, 1);
    this.pads.forEach((p, i) => {
      if (i < this.i - 2 || i > this.i + 14) return;
      const bob = Math.sin((b + i * .25) * Math.PI) * .8, gone = i <= this.i && i !== this.i;
      r.shape('poolfloat', p.x, p.y, 1 + bob, { params: { color: i === G.POOL.N ? '#ffd36a' : p.col }, shadow: false, alpha: gone ? .5 : 1 });
      const want = this.padButtons(i, b);
      if (want.length && i > this.i) r.queue(p.x, p.y, 8, g => { const q = r.w(p.x, p.y, 10 + bob); let x = Math.round(q[0] - (want.length * 11 - 2) / 2); for (const k of want) { G.glyph(g, x, Math.round(q[1] - 10), HOPS[k], I); x += 11; } }, { bias: 4, emissive: true });
    });
    for (const w of this.watchers) r.actor(w.x, w.y, 0, (g, ox, oy) => w.rig.draw(g, ox, oy, r.view));
    if (this.pos.z > -6) r.shadow(this.pos.x, this.pos.y, 5, .3);
    r.actor(this.pos.x, this.pos.y, this.pos.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const sf = G.safe(r);
      G.ui.panel(g, sf.x, sf.y, 120, 28, { alpha: .9 }); E.font.text(g, 'POOL HOP', sf.x + 6, sf.y + 4, '#ffd36a', { outline: false }); E.font.text(g, 'Pad ' + this.i + '/' + G.POOL.N + '   ' + Math.max(0, this.left).toFixed(1) + ' s', sf.x + 6, sf.y + 15, '#fff8e8', { outline: false });
      E.font.text(g, 'Perfect ' + this.perf + '  Falls ' + this.falls + (this.chain >= 2 ? '  Chain ' + this.chain : ''), sf.x + 128, sf.y + 4, '#9fd3d6', { shadow: '#000', outline: false });
      if (this.bonus > 0) E.font.text(g, '+1 s!', sf.x + 60, sf.y + 30, '#9ff3a8', { scale: 2, shadow: '#000', outline: false });
      // the beat pips
      const ph = b - Math.floor(b); for (let k = 0; k < 4; k++) px.disc(g, Math.round(r.W / 2 - 18 + k * 12), sf.y + 8, Math.floor(b) % 4 === k ? 4 - ph * 2 : 2, Math.floor(b) % 4 === k ? '#ffd36a' : '#5a8a92');
      if (this.state === 'count') { const n = Math.ceil(this.firstBeat - b); E.font.title(g, n > 0 && n <= 3 ? String(n) : 'HOP!', r.W / 2, Math.round(r.H * .3), { scale: 4, align: 'center' }); }
      if (this.judge && this.judge.t < .6) E.font.text(g, this.judge.q, r.W / 2, Math.round(r.H * .22), this.judge.q === 'PERFECT' ? '#ffd36a' : this.judge.q === 'GOOD' ? '#5ff0ff' : '#ff9a8a', { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (this.i >= G.POOL.WOBBLE && this.i < G.POOL.WOBBLE + 2 && this.state === 'hop') E.font.text(g, 'Wobble pads! The button settles a beat before you land.', r.W / 2, Math.round(r.H * .86), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      if (this.i >= G.POOL.DOUBLE && this.i < G.POOL.DOUBLE + 2 && this.state === 'hop') E.font.text(g, 'Double pads! Press both together.', r.W / 2, Math.round(r.H * .86), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      if (this.state === 'results') {
        const R = this.result, w = 220, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .25);
        G.ui.panel(g, x, y, w, 110, { title: R.cleared ? 'CLEARED!' : "TIME'S UP" });
        E.font.text(g, 'Time ' + R.time.toFixed(1) + ' s' + (R.best ? '  NEW BEST!' : ''), x + 12, y + 12, '#fff8e8', { outline: false });
        E.font.text(g, 'Perfect hops ' + R.perf + '   Falls ' + R.falls, x + 12, y + 26, '#9fd3d6', { outline: false });
        if (R.cleared) G.ui.money(g, x + 12, y + 42, R.prize);
        this.nav.draw(g, this.resultItems());
      } else G.promptBar(g, r, [['hopA', ''], ['hopB', ''], ['hopX', ''], ['hopY', 'Hop on the beat']]);
      if (this.bot) E.font.text(g, 'DEMO', sf.x, r.H - sf.y - 10, '#ff5f7a', { outline: false });
    });
  }
};
