// Cinematics: the night coast fly-over (briefing), the interrogation tent, the Kennel aftermath, the ending over the
// sea at sunrise (Mode 7 at altitude, OLD HOWLER from behind) and the scrolling credits.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp, lerp } = WP;
const F = (g, s, x, y, c = '#f2ead3', o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: '#0c0a06' }, o));
const C = WP.Cine = {};
const game = () => WP.ctx.game, I = () => game().input, any = f => (game().players || [game().input]).some(f);
// the coast seen from the air: sea, beaches, jungle, a river; night or sunrise
const coastFloor = night => (x, y, D, t) => {
  const n = E.noise2(x / 420, y / 420) * .65 + E.noise2(x / 120, y / 120) * .35;
  if (n > .56) { const j = E.noise2(x / 30, y / 30); const c = n > .6 ? (j > .5 ? 0xff2a5a2a : 0xff3a6a32) : 0xff70a8c8; return night ? WP.shadePk(c, .35) : c; }
  if (n > .53) return night ? 0xff40586a : 0xff88c0d8;
  const w = (Math.sin(x * .05 + t * 1.5) + Math.sin(y * .07 - t)) > 1.6 ? (night ? 0xff6a5a3a : 0xffd8c0a0) : (night ? 0xff3a2414 : 0xff8a5a2a);
  return w;
};
const world0 = (st, cam) => ({ stage: st, cam, view: new WP.View3D().begin(cam), ents: [], players: [], shapes: [], darkness: st.darkness || 0, flare: 0, spotted: 0, byId: () => null });
C.NIGHT_COAST = WP.defStage({ id: 'cineNight', n: 90, name: 'COAST', sky: { sky: ['#05060e', '#10142a', '#2a1a2a', '#5a2a1a'], moon: { x: .8, y: .25, r: 14, color: '#f4ecd0' }, stars: 60, starsY: .8, layers: [{ kind: 'mountains', color: '#1a1420', y: .72, height: .4, parallax: .04, seed: 9 }] },
  fog: { color: '#1a1420', near: 600, far: 2400 }, floor: coastFloor(true), outside: '#140c08', forward: true, cam: { h: 180, pitch: 18, fov: 60 }, rail: [{ d: 0, x: 0, y: 0 }, { d: 1, x: 0, y: 0 }], holds: [], beats: [], quotas: {} });
C.SUNRISE = WP.defStage({ id: 'cineSun', n: 91, name: 'SUNRISE', sky: { sky: ['#2a3a6a', '#8a6a8a', '#f0a070', '#ffd890'], sun: { x: .5, y: .86, r: 26, color: '#fff0b0' }, layers: [{ kind: 'clouds', color: '#f8c8a0', y: .4, height: .14, parallax: .05 }, { kind: 'clouds', color: '#e8a888', y: .62, height: .1, parallax: .1 }] },
  fog: { color: '#f0b890', near: 500, far: 2400 }, floor: coastFloor(false), outside: '#8a5a2a', forward: true, cam: { h: 240, pitch: 16, fov: 60 }, rail: [{ d: 0, x: 0, y: 0 }, { d: 1, x: 0, y: 0 }], holds: [], beats: [], quotas: {} });
C.coast = () => {
  const cam = { x: 0, y: 6000, h: 180, angle: -Math.PI / 2 + .3, pitch: 18, fov: 60 }, w = world0(C.NIGHT_COAST, cam);
  WP.Render.setStage(C.NIGHT_COAST);
  return { update(dt) { cam.y -= 40 * dt; cam.x += 8 * dt; cam.angle += .01 * dt; w.view.begin(cam); }, draw(r) { WP.Render.draw(r, w, WP.ctx); } };
};
// the tent: canvas walls, a swinging lamp and its light, LOBO holding GIGGS by the collar
C.tent = (g, t, lobo, giggs, shake) => {
  const W = WP.W, H = WP.H, sx = shake > 0 ? Math.round(Math.sin(t * 80) * 3) : 0;
  px.rect(g, 0, 0, W, H, '#1a120c');
  px.poly(g, [[0, 0], [W, 0], [W, 160], [0, 160]], '#3a2a1a'); for (let x = 0; x < W; x += 40) px.rect(g, x, 0, 2, 160, '#2a1e12');
  px.poly(g, [[0, 160], [W, 160], [W, H], [0, H]], '#24180e');
  const a = Math.sin(t * 1.4) * .35, lx = W / 2 + Math.sin(a) * 60, ly = 20 + Math.cos(a) * 50;
  px.line(g, W / 2, 0, lx, ly, '#1a1410', 1); px.rect(g, lx - 5, ly, 10, 6, '#5a4a2a'); px.disc(g, lx, ly + 8, 3, '#ffe0a0');
  px.blend(g, .3, 'add', () => px.ddisc(g, lx, ly + 40, 140, '#ffb060', .7));
  px.rect(g, 330, 150, 90, 8, '#5a3a1e'); px.rect(g, 336, 158, 4, 30, '#3a2a14'); px.rect(g, 410, 158, 4, 30, '#3a2a14'); g.drawImage(WP.SPR.intel.cv, 350, 140, 20, 18);
  try { const v = new E.View('side', 'Side', 0, 0, 3.2, 1); lobo.draw(g, 190 + sx, 222, v); giggs.draw(g, 262 - sx, 226, v); } catch (e) { /* headless */ }
  px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#3a2a4a'));
};
// the Kennel aftermath: the freed hostages kneel as their portraits slide in, lit or dark
C.aftermath = (g, t) => {
  const W = WP.W, n = WP.Flow.run ? WP.Flow.run.hostagesFreed : 5;
  px.rect(g, 0, 0, W, WP.H, '#0a0c14');
  for (let i = 0; i < 60; i++) px.dot(g, (i * 97) % W, (i * 53) % 120, '#8a90a8');
  px.blend(g, .4, 'add', () => px.ddisc(g, W / 2, 150, 200, '#ff8a40', .4));
  for (let i = 0; i < 5; i++) {
    const u = clamp((t - i * .35) / .5, 0, 1), x = lerp(-60, 40 + i * 84, WP.smooth(u)), lit = i < n;
    E.ui.box(g, x, 60, 72, 96, { bg: lit ? ['#2a3a24', '#141a10'] : ['#1a1a1a', '#0a0a0a'], border: lit ? '#e0b040' : '#3a3a3a' });
    try { WP.Rigs.hostagePortrait(i).drawPortrait(g, x + 8, 66, 56, { zoom: 3.8, bg: lit ? '#2a4a2a' : '#1a1a1a', tint: lit ? undefined : '#505050' }); } catch (e) { /* headless */ }
    F(g, WP.TEXT.hostages[i][0].split(' ').slice(-1)[0], x + 36, 128, lit ? '#f2ead3' : '#5a5a5a', { align: 'center' });
    F(g, lit ? 'FREE' : 'LOST', x + 36, 140, lit ? '#5aff6a' : '#ff5a4a', { align: 'center' });
  }
  F(g, WP.fill('{n} OF 5 HOSTAGES ARE FREE.', { n }), W / 2, 24, '#ffd040', { align: 'center', scale: 2 });
};
// ---------- the ending ----------
WP.endingScene = {
  enter(d = {}) {
    const run = WP.Flow.run || WP.Flow.newRun(); this.n = d.n === undefined ? run.hostagesSaved : d.n; this.t = 0; this.lines = WP.TEXT.ending(this.n).map(l => WP.fill(l, { n: this.n }));
    this.phase = 'lines'; this.menu = null; WP.Music.play(game(), 'ending');
    const cam = this.cam = { x: 0, y: 9000, h: 240, angle: -Math.PI / 2, pitch: 16, fov: 60 }; this.w = world0(C.SUNRISE, cam); WP.Render.setStage(C.SUNRISE);
    const self = this; C.SUNRISE.drawExtra = (m7, w) => { const P = w.view.P; WP.Render.shape('cargoPlane', P.x + Math.sin(self.t * .5) * 10, P.y - 230, P.h - 92 + Math.sin(self.t * .8) * 4, { facing: -Math.PI / 2 }); };
    // the rank (7.15)
    const shots = run.stats.shots, acc = shots ? run.stats.hits / shots : 0;
    this.rank = (run.loop > 1 ? 'BLACK MOON ' : '') + (this.n >= 5 && run.continues === 0 && acc >= .55 ? WP.TEXT.ranks[4] : this.n >= 4 ? WP.TEXT.ranks[3] : this.n >= 3 ? WP.TEXT.ranks[2] : this.n >= 1 ? WP.TEXT.ranks[1] : WP.TEXT.ranks[0]);
    this.score = Math.max(0, ...Object.values(run.loadouts || {}).map(l => l.score));
    this.scores = Object.values(run.loadouts || {}).map(l => l.score);
    WP.Voice.howl();
  },
  update(dt) {
    const g = game(); this.t += dt; WP.time += dt; this.cam.y -= 30 * dt; this.w.view.begin(this.cam);
    const per = 3.2, k = Math.floor(this.t / per);
    if (this.phase === 'lines') { if (k >= this.lines.length + 1 || (any(q => q.pressed('confirm')) && this.t > 1)) { this.phase = 'rank'; this.t2 = 0; WP.Voice.howl(1.1); } return; }
    if (this.phase === 'rank') { this.t2 += dt; if (this.t2 > 2.5 || this.t2 > .6 && any(q => q.pressed('confirm'))) { this.phase = 'menu'; this.menu = new WP.UIMenu([{ label: 'LOOP 2', id: 'loop' }, { label: 'TITLE', id: 'title' }]); } return; }
    const it = this.menu.update();
    if (it) {
      const run = WP.Flow.run;
      if (it.id === 'loop') { const keep = run.loadouts; WP.Flow.newRun({ diff: run.diff, loop: (run.loop || 1) + 1 }); WP.Flow.run.loadouts = keep; WP.Flow.run.stats = run.stats; g.go('map'); }
      else g.go('credits', { score: this.score, scores: this.scores });
    }
  },
  draw(r) {
    WP.Render.draw(r, this.w, WP.ctx);
    r.overlay(g => {
      const per = 3.2, k = Math.floor(this.t / per);
      if (this.phase === 'lines') { let y = 30; this.lines.forEach((l, i) => { const last = i === this.lines.length - 1, sc = last ? 2 : 1; if (i <= k) { for (const ln of E.font.wrap(l, 440, { scale: sc })) { F(g, ln, WP.W / 2, y, last ? '#ffd040' : '#ffffff', { align: 'center', scale: sc }); y += 9 * sc + 3; } } else y += 12; }); }
      // the hostages' portraits, lit or dark
      for (let i = 0; i < 5; i++) { const x = WP.W / 2 - 80 + i * 32, lit = i < this.n; px.rect(g, x, 190, 28, 28, lit ? '#e0b040' : '#2a2a2a'); try { WP.Rigs.hostagePortrait(i).drawPortrait(g, x + 2, 192, 24, { zoom: 2, bg: lit ? '#3a6a3a' : '#1a1a1a', tint: lit ? undefined : '#505050' }); } catch (e) { /* headless */ } }
      if (this.phase !== 'lines') { px.blend(g, .7, 'normal', () => px.rect(g, 90, 70, 300, 110, '#06080a')); F(g, 'YOUR RANK', WP.W / 2, 78, '#e0b040', { align: 'center' }); E.font.title(g, this.rank, WP.W / 2, 92, { scale: 2, colors: ['#fff6c8', '#ffd36a', '#c86a2a'], outline: '#000', depth: 2, depthColor: '#4a2a08', align: 'center' }); F(g, 'SCORE ' + WP.fmt(this.score), WP.W / 2, 118, '#f2ead3', { align: 'center' }); }
      if (this.phase === 'menu') { F(g, WP.TEXT.hunt, WP.W / 2, 132, '#ffd040', { align: 'center' }); this.menu.draw(g, WP.W / 2, 146, { scale: 1, w: 120 }); WP.Screens.prompts(g, [['confirm', 'SELECT']]); }
    });
  }
};
// ---------- the credits: the About text scrolling over the night coast ----------
WP.creditsScene = {
  enter(d = {}) { this.d = d; this.t = 0; this.v = C.coast(); WP.Music.play(game(), 'title'); this.lines = []; for (const p of WP.TEXT.about) { this.lines.push(['', '#ffd040', p.title]); for (const [k, v] of p.lines) { if (k) this.lines.push(['k', '#e0b040', k]); for (const l of E.font.wrap(v, 420)) this.lines.push(['', '#f2ead3', l]); } this.lines.push(['', '', '']); } },
  update(dt) {
    const g = game(); this.t += dt; WP.time += dt; this.v.update(dt);
    const end = this.lines.length * 11 + WP.H + 40;
    if (this.t * 26 > end || this.t > 1 && (any(q => q.pressed('confirm') || q.pressed('cancel')) || I().clicked())) {
      const cab = WP.Store.cab, q = (this.d.scores || [this.d.score || 0]).filter(s => cab && cab.qualifies(s, 'campaign')).sort((a, b) => b - a);
      if (q.length) g.go('initials', { score: q[0], queue: q.slice(1), mode: 'campaign', next: 'title' }); else g.go('title');
    }
  },
  draw(r) {
    this.v.draw(r);
    r.overlay(g => { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, WP.W, WP.H, '#000000')); const y0 = WP.H - this.t * 26; this.lines.forEach(([k, c, s], i) => { const y = y0 + i * 11; if (y > -10 && y < WP.H) F(g, s, k === 'k' ? 30 : WP.W / 2, y, c, { align: k === 'k' ? 'left' : 'center' }); }); E.font.title(g, 'OPERATION WOLFPACK', WP.W / 2, y0 - 40, { scale: 2, colors: ['#fff0a0', '#e8b040', '#9a6a1a'], outline: '#000', depth: 2, depthColor: '#4a2a08', align: 'center' }); });
  }
};
})();
