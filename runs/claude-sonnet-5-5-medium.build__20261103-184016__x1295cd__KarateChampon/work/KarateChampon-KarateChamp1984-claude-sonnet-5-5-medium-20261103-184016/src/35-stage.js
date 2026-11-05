/* ---------- stages: backdrop, floor, props, crowd, lights, weather ---------- */
const hash2 = E.hash2 || ((a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; });
class Stage {
  constructor(data) {
    this.d = typeof data === 'string' ? KC.STAGE[data] : data;
    const s = this.d.sky; this.bg = new E.Backdrop(s.preset ? s.preset : s);
    this.crowd = []; const cr = this.d.crowd || { n: 0 };
    for (let i = 0; i < (cr.noSil ? 0 : cr.n || 0); i++) this.crowd.push({ x: -80 + (i + .5) * (560 / cr.n) + (hash2(i, 3) - .5) * 14, row: i % 3, h: 16 + hash2(i, 5) * 8, c: cr.palette[Math.floor(hash2(i, 7) * cr.palette.length)], ph: hash2(i, 9) * 6 });
    this.cheer = 0; this.shake = 0; this.t = 0;
    this.front = [];
    if (cr.n && !cr.seiza) for (let i = 0; i < 4; i++) { const x = -60 + i * 150 + 20 * hash2(i, 4); this.front.push({ x, rig: new E.Humanoid({ style: 'classic', size: 1.1, hair: ['short', 'spiky', 'ponytail'][i % 3], colors: { cloth: cr.palette[i % cr.palette.length], pants: '#2a2a3a' } }) }); }
    if (['bamboo', 'log', 'ship', 'market', 'fuji', 'stadium'].includes(this.d.id)) this.front.push({ x: 40, mei: true, rig: KC.makeRig(KC.FIGHTER.mei, 1, 'black5', 2.0) });   // Mei cheers from the front row of every stage after the harbor
    if (cr.seiza) for (let i = 0; i < Math.min(8, cr.n); i++) this.front.push({ x: -50 + i * 70, rig: new E.Humanoid({ style: 'classic', size: 1.05, hair: 'short', colors: { cloth: '#f2eee4', pants: '#f2eee4', belt: ['#f0c830', '#3aa050', '#2f5fd0', '#f4f4ee'][i % 4] } }), seiza: true });
  }
  react(kind) { this.cheer = Math.min(1, this.cheer + (kind === 'full' ? .9 : kind === 'half' ? .5 : .25)); }
  update(dt) {
    this.t += dt; this.cheer = Math.max(0, this.cheer - dt * .45);
    for (const f of this.front) f.rig.update(dt, { x: f.x, y: 14, z: 0, facing: 0, vx: 0, vy: 0, pose: f.seiza ? 'kneel' : this.cheer > .35 ? 'cheer' : 'hips', expr: f.mei && this.cheer > .35 ? 'smile' : undefined });
    if (this.d.weather) game_.weather = this.d.weather;
  }
  floorY(r) { return Math.round(r.w(0, 0, 0)[1]); }
  draw(r, lights = true) {
    const g = r.ctx, d = this.d, W = r.bw, H = r.bh, floor = this.floorY(r), sx = x => r.w(x, 0, 0)[0], t = this.t;
    this.bg.draw(r);
    // ---- stage-specific backdrop pieces ----
    if (d.id === 'dojo') {   // shoji wall, beams, kamidana shelf
      px.rect(g, 0, floor - 92, W, 92, '#2a1a12'); const wallC = '#e8d4a0';
      for (let k = -4; k < 12; k++) { const x0 = Math.round(sx(k * 60) * .96 + W * .02); px.rect(g, x0, floor - 86, 54, 76, wallC); px.blend(g, .25, 'add', () => px.rect(g, x0, floor - 86, 54, 76, '#ffb060')); for (let i = 0; i <= 3; i++) px.rect(g, x0 + i * 18, floor - 86, 1, 76, '#5a3a22'); for (let j = 0; j <= 3; j++) px.rect(g, x0, floor - 86 + j * 25, 54, 1, '#5a3a22'); }
      px.rect(g, 0, floor - 96, W, 6, '#3a2418'); px.rect(g, 0, floor - 10, W, 10, '#4a2e1a');
      const sc = Math.round(sx(200)); px.rect(g, sc - 34, floor - 126, 68, 24, '#e8d8a8'); px.rect(g, sc - 34, floor - 126, 68, 2, '#6a2a1a'); px.rect(g, sc - 34, floor - 104, 68, 2, '#6a2a1a'); E.font.text(g, 'KARATE-DO', sc, floor - 119, '#14100c', { align: 'center', outline: false });
    }
    if (d.bamboo) {
      for (let k = 0; k < 40; k++) { const par = .35 + (k % 3) * .25, x = Math.round((sx(-120 + k * 18) - W / 2) * par + W / 2 + hash2(k, 1) * 8), w = 3 + (k % 3), col = ['#2c7a4a', '#3a9a5a', '#4aaa66'][k % 3]; px.rect(g, x, 0, w, floor, E.shade(col, -.15 * (2 - k % 3))); for (let y = 14 + (k * 7) % 18; y < floor; y += 34) px.rect(g, x - 1, y, w + 2, 2, E.shade(col, -.3)); }
      px.blend(g, .1, 'add', () => { for (let k = 0; k < 4; k++) px.poly(g, [[sx(40 + k * 100), 0], [sx(70 + k * 100), 0], [sx(10 + k * 100), floor], [sx(-20 + k * 100), floor]], '#ffffd0'); });
    }
    if (d.gorge) {   // cliffs, waterfall, gorge below the log
      const wx = Math.round(sx(80)); px.rect(g, wx - 6, floor - 120, 12, 100, '#cfe6f8'); for (let y = 0; y < 100; y += 6) px.rect(g, wx - 5 + ((y + Math.floor(t * 40)) % 8) / 2, floor - 120 + y, 2, 4, '#ffffff');
      px.blend(g, .3, 'normal', () => px.rect(g, 0, floor + 2, W, H - floor, '#2a3a5a'));
    }
    if (d.fuji) {   // Mount Fuji with a snow cap, behind the hills
      const fx = Math.round(sx(300) * .9 + W * .05), top = floor - 150; px.poly(g, [[fx - 120, floor - 40], [fx, top], [fx + 120, floor - 40]], '#6a6a9a'); px.poly(g, [[fx - 36, top + 36], [fx, top], [fx + 36, top + 36], [fx + 18, top + 28], [fx, top + 40], [fx - 18, top + 28]], '#f4f4ff');
    }
    if (d.torii) { const tx = Math.round(sx(330)); px.rect(g, tx - 30, floor - 90, 5, 90, '#d8402a'); px.rect(g, tx + 25, floor - 90, 5, 90, '#d8402a'); px.rect(g, tx - 40, floor - 96, 80, 7, '#d8402a'); px.rect(g, tx - 34, floor - 80, 68, 4, '#b82a1a'); px.rect(g, tx - 44, floor - 100, 88, 4, '#2a1a1a'); }
    if (d.shop) { const sx0 = Math.round(sx(300)); px.rect(g, sx0 - 70, floor - 88, 140, 88, '#4a2a22'); px.rect(g, sx0 - 70, floor - 88, 140, 8, '#8a2a22'); for (let k = 0; k < 7; k++) px.rect(g, sx0 - 60 + k * 20, floor - 78, 14, 44, k % 2 ? '#1a2a5a' : '#2a3a7a'); E.font.text(g, 'NOODLES', sx0, floor - 112, '#ffd060', { align: 'center', scale: 1, outline: false }); E.font.text(g, 'CHAMPON-TEI', sx0, floor - 98, '#ffe8a0', { align: 'center', outline: false }); }
    if (d.stadium) {   // tiered crowd, scoreboard, spotlights
      for (let tier = 0; tier < 5; tier++) { px.rect(g, 0, floor - 100 + tier * 14, W, 14, E.shade('#2a2a4a', -.06 * tier)); }
      px.rect(g, W / 2 - 70, floor - 150, 140, 36, '#08080f'); px.rect(g, W / 2 - 68, floor - 148, 136, 32, '#142a48'); E.font.text(g, "CHAMPON CUP '84", W / 2, floor - 140, '#ffd060', { align: 'center', outline: false }); E.font.text(g, 'GOLDEN BOWL FINAL', W / 2, floor - 128, '#e8f0ff', { align: 'center', outline: false });
      px.blend(g, .1, 'add', () => { for (const x of [.25, .5, .75]) px.poly(g, [[W * x - 4, 0], [W * x + 4, 0], [W * x + 60, floor], [W * x - 60, floor]], '#fff8d0'); });
    }
    if (d.cart) { const cx = Math.round(sx(380)); px.rect(g, cx - 16, floor - 26, 32, 20, '#8a3a22'); px.rect(g, cx - 20, floor - 34, 40, 8, '#d8402a'); px.disc(g, cx - 10, floor - 4, 5, '#2a1a12'); px.disc(g, cx + 10, floor - 4, 5, '#2a1a12'); }
    // ---- crowd silhouettes ----
    for (const p of this.crowd) {
      const par = [.7, .82, .94][p.row], x = Math.round((sx(p.x) - W / 2) * par + W / 2), bob = Math.abs(Math.sin(t * (3 + this.cheer * 6) + p.ph)) * (1 + this.cheer * 4), y = floor - 24 - p.row * 9 - p.h + 18 - bob - (d.stadium ? 10 : 0);
      const c = E.shade(p.c, -.12 * (2 - p.row)); px.rect(g, x - 5, y + 6, 10, p.h, c); px.disc(g, x, y + 3, 4, E.shade(c, .15));
      if (this.cheer > .3 && hash2(Math.floor(p.ph * 10), 1) > .5) { px.rect(g, x - 7, y - 4 - bob, 2, 8, c); px.rect(g, x + 5, y - 4 - bob, 2, 8, c); }
    }
    // ---- floor ----
    this.drawFloor(g, r, floor, sx, W, H);
    // ---- lights ----
    if (lights) { game_.lights.enabled = true; game_.lights.ambient = d.ambient; for (const [lx, lz, col] of d.lightsList || []) game_.lights.add(lx, 0, lz, 60, .3, { color: col }); }
    // ---- props and front crowd ----
    for (const [kind, x, y, z] of d.props) r.prop(kind, x, y, z, { size: kind === 'lantern' ? 1.3 : 1.4, light: false });
    if (d.id === 'ship') { /* sway handled by the camera */ }
    for (const f of this.front) r.actor(f.x, 14, 0, (gg, ox, oy) => f.rig.draw(gg, ox, oy, r.view), { every: 2, key: f });
  }
  drawFloor(g, r, floor, sx, W, H) {
    const d = this.d, [c1, c2] = d.floor, id = d.id;
    const mat = ['dojo', 'harbor', 'ship'].includes(id) ? 'planks' : ['market', 'fishmarket', 'fuji'].includes(id) ? 'stone' : id === 'stadium' ? 'mat' : id === 'log' ? 'bark' : 'earth';
    for (let y = floor; y < H; y++) { const k = (y - floor) / Math.max(1, H - floor); px.rect(g, 0, y, W, 1, E.mix(c1, c2, k)); }
    if (mat === 'planks') { for (let k = -14; k <= 36; k++) { const x0 = sx(k * 20); px.line(g, Math.round(x0), floor, Math.round(W / 2 + (x0 - W / 2) * 1.5), H, E.shade(c2, -.25)); } px.rect(g, 0, floor, W, 1, E.shade(c1, .25)); }
    if (mat === 'stone') { for (let j = 0; j < 6; j++) { const y = floor + 3 + j * j * 1.4; px.rect(g, 0, Math.round(y), W, 1, E.shade(c2, -.25)); } for (let k = -10; k <= 30; k++) { const x0 = sx(k * 32); px.line(g, Math.round(x0), floor, Math.round(W / 2 + (x0 - W / 2) * 1.7), H, E.shade(c2, -.2)); } }
    if (mat === 'mat') { px.rect(g, Math.round(sx(0)), floor, Math.round(sx(400) - sx(0)), 2, '#e8e8f4'); for (const x of [150, 250]) px.rect(g, Math.round(sx(x)) - 1, floor, 3, H - floor, x < 200 ? '#f4f4f4' : '#e8483a'); }
    if (mat === 'earth') { for (let i = 0; i < 90; i++) { const x = Math.floor(hash2(i, 2) * W), y = floor + 2 + Math.floor(hash2(i, 6) * (H - floor)); px.dot(g, x, y, E.shade(c1, hash2(i, 8) > .5 ? .15 : -.2)); } }
    if (mat === 'bark') { for (let y = floor; y < floor + 40; y += 5) px.rect(g, 0, y, W, 1, E.shade(c2, -.2)); px.rect(g, 0, floor, W, 3, E.shade(c1, .2)); }
    // marks
    for (const x of KC.ARENA.marks) { const mx = Math.round(sx(x)); px.rect(g, mx - 6, floor + 3, 12, 1, 'rgba(255,255,255,0.35)'.length ? '#d8d0c0' : '#fff'); }
    px.blend(g, .12, 'add', () => px.ell(g, Math.round(sx(200)), floor + 12, Math.round(W * .4), 9, '#ffe0a0'));
  }
}
KC.Stage = Stage;
let game_ = null;   // the Game, set at start
