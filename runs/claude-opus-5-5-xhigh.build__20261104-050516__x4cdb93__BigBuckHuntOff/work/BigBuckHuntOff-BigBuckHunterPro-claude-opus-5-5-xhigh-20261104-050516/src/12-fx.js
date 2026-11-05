// 12-fx: world particles (fur puffs, dirt, bark chips, sparks, splashes, feathers, clay and snow, breath in the cold),
// drawn through the landscape's renderer so hills hide them; screen weather in three layers; the stink; snowball splats.
// Cosmetic only: every random number here comes from the fx stream.
const FXK = { fur: ['#b89a78', '#8a6a4a', '#e8dcc8'], dirt: ['#6a5034', '#8a6a44', '#4a3a28'], bark: ['#6a5040', '#a8885a', '#4a3a2e'], rock: ['#fff4b0', '#ffd060', '#d8d0c0'], water: ['#e8f4f8', '#b8d8e8', '#ffffff'], feather: ['#1e1c24', '#3a3840', '#2a2830'], clay: ['#e8743a', '#ffa860', '#c85a28'], snow: ['#ffffff', '#e8eef4', '#d8e0ea'], gold: ['#ffe060', '#ffd040', '#fff4b0'], leaf: ['#c8601a', '#e0a02a', '#a8401a'], breath: ['#f0f4f8'], stink: ['#7ac83a'] };
const FXW = {
  parts: [], screen: [], max: 1600,
  reset() { this.parts.length = 0; this.screen.length = 0; },
  burst(x, y, z, n, kind, o = {}) {
    const cols = FXK[kind] || FXK.dirt, sp = (o.speed || 2.5) * M, up = (o.up === undefined ? 2.5 : o.up) * M;
    for (let i = 0; i < n && this.parts.length < this.max; i++) {
      const a = fxr(TAU), s = fxr(.3, 1) * sp;
      this.parts.push({ x, y, z, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), vz: fxr(.2, 1) * up, life: 0, max: fxr(.5, 1) * (o.life || .9), c: cols[Math.floor(fxr(cols.length))], size: (o.size || .08) * fxr(.6, 1.4), g: o.g === undefined ? 9.8 * M : o.g, drag: o.drag || 1.5, kind, fade: o.fade });
    }
  },
  /** a round lands: what it threw up by what it hit */
  impact(R) {
    const [x, y, z] = R.point;
    if (R.kind === 'ground') { const t = G.hunt && G.hunt.world.hf.typeAt(x, y); this.burst(x, y, z, 14, t === GT.snow || t === GT.ice ? 'snow' : 'dirt', { speed: 1.6, up: 3 }); }
    else if (R.kind === 'water') { this.burst(x, y, z, 22, 'water', { speed: .8, up: 5.5, life: 1.1 }); }
    else if (R.kind === 'prop') { const P = R.prop ? reg('prop', R.prop.id) : null, stone = P && R.prop.occ && R.prop.occ[0].k === 'sph'; this.burst(x, y, z, stone ? 9 : 12, stone ? 'rock' : 'bark', { speed: stone ? 4 : 2, up: 2, size: stone ? .04 : .07 }); }
  },
  update(dt, H) {
    const w = H.world;
    for (const p of this.parts) {
      p.life += dt; p.vz -= p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= p.g ? 1 : d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.g) { const gz = w.height(p.x, p.y); if (p.z < gz) { p.z = gz; p.vz = 0; p.vx *= .3; p.vy *= .3; } }
    }
    this.parts = this.parts.filter(p => p.life < p.max);
    // breath in the cold: the hunters' own (in front of the camera, a faint puff) and the animals' noses
    if (H.hunt.cold && H.seg && H.seg.kind !== 'tally') {
      this.breathT = (this.breathT || 0) - dt;
      if (this.breathT <= 0) { this.breathT = 3.2; for (const a of H.actors) if (a.cat === 'animal' && a.alive && a.rig.J.muzzle && fxr() < .6) { const m = a.rig.J.muzzle, s = T('animalScale'); this.burst(a.x + m[0] * s, a.y + m[1] * s, a.z + m[2] * s, 4, 'breath', { speed: .3, up: .3, g: 0, life: 1.4, size: .14, drag: 2 }); } }
    }
    // screen weather: leaves, snow, drizzle in three parallax layers
    const wx = H.hunt.weather; if (wx && H.seg && H.seg.kind !== 'tally') {
      const rate = wx.amount * (wx.kind === 'snow' ? 70 : 14) * dt;
      for (let i = 0; i < rate || fxr() < rate - Math.floor(rate); i++) { if (i > 40) break; const L = Math.floor(fxr(3)); this.screen.push({ x: fxr(-20, H.W + 20), y: -6, L, vx: (wx.wind || .2) * 20 * (L + 1) + fxr(-6, 6), vy: (wx.kind === 'snow' ? 14 : 22) * (L * .6 + .7), t: fxr(TAU), c: wx.kind === 'snow' ? '#ffffff' : FXK.leaf[Math.floor(fxr(3))], kind: wx.kind }); if (rate < 1) break; }
      for (const s of this.screen) { s.t += dt; s.x += (s.vx + Math.sin(s.t * 2.4) * (s.kind === 'leaves' ? 18 : 6)) * dt; s.y += s.vy * dt; }
      this.screen = this.screen.filter(s => s.y < H.H + 8 && s.x > -30 && s.x < H.W + 30);
      if (this.screen.length > 400) this.screen.splice(0, this.screen.length - 400);
    }
  },
  items(items, H) { for (const p of this.parts) items.push({ x: p.x, y: p.y, z: p.z, dot: p.c, size: p.size * M, bias: 2, fog: true }); },
  drawScreen(g, H, W, Ht, pass) {
    for (const s of this.screen) {
      if ((pass === 'front') !== (s.L === 2)) continue;
      const sz = s.L + 1;
      if (s.kind === 'snow') px.rect(g, s.x, s.y, sz > 2 ? 2 : 1, sz > 2 ? 2 : 1, s.L === 0 ? '#c8d4e0' : s.c);
      else if (s.kind === 'leaves') { const f = Math.sin(s.t * 5) > 0, w = s.L === 2 ? 3 : 1; px.rect(g, s.x, s.y, f ? w + 1 : 1, s.L === 2 ? 2 : 1, s.c); if (s.L === 2) px.dot(g, s.x + 1, s.y, '#5a2a10'); }
      else px.line(g, s.x, s.y, s.x - 1, s.y + 3 * sz, '#a8b8c8');
    }
  }
};
G.fx = FXW;
function drawStink(g, H, W, Ht) {
  const a = Math.min(1, H.stink / 3) * .62, t = H.time;
  for (let i = 0; i < 9; i++) { const cx = W * (.2 + (i % 3) * .3) + Math.sin(t * .8 + i) * 20, cy = Ht * (.25 + Math.floor(i / 3) * .25) + Math.cos(t * .6 + i * 2) * 14; px.ddisc(g, cx, cy, 70 + (i % 2) * 20, i % 2 ? '#6ab82a' : '#8ad04a', a); }
  if (a > .3) E.font.text(g, 'P-U!', W / 2 + Math.sin(t * 9) * 3, Ht * .3, '#d8ff8a', { align: 'center', scale: 3, outline: '#2a4a10' });
}
function drawSplat(g, s) {
  const a = clamp(1 - (s.t - s.dur + .6) / .6, 0, 1), R = s.r * (1 + s.t * .05), drip = s.t * 9;
  if (a <= 0) return;
  px.blend(g, a, 'normal', () => { px.disc(g, s.x, s.y, R, '#e8eef4'); for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + s.seed; px.disc(g, s.x + Math.cos(an) * R * .9, s.y + Math.sin(an) * R * .8, R * .35, '#f4f8fc'); } px.rect(g, s.x - R * .3, s.y, R * .2, R * .6 + drip, '#dfe8f0'); px.disc(g, s.x - R * .2, s.y - R * .3, R * .4, '#ffffff'); });
}
// world reactions to what happens
bus.on('impact', e => FXW.impact(e.R));
bus.on('hit', e => { const [x, y, z] = e.R.point; FXW.burst(x, y, z, e.R.zone === 'antler' ? 5 : 10, e.R.zone === 'antler' ? 'rock' : 'fur', { speed: 1.2, up: 1.2, size: .07 }); });
bus.on('critter', e => { const a = e.a; FXW.burst(a.x, a.y, a.z + .3 * M, 12, a.bird ? 'feather' : 'fur', { speed: 1.5, up: 1.5, g: a.bird ? 2 * M : 9.8 * M, life: a.bird ? 1.6 : .8 }); });
bus.on('splash', a => FXW.burst(a.x, a.y, a.z + .2 * M, a.running ? 6 : 3, 'water', { speed: .6, up: 2.2, life: .6, size: .06 }));
