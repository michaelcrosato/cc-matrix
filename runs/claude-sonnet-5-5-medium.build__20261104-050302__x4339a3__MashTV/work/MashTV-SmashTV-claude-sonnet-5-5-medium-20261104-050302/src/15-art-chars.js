// MASH TV: rigs, looks and painters for contestants, host, enemies and bosses. Draw code reads only render state (the entity's fields).
const px = E.px, TN = E.tones;
MT.LOOKS = [
  { name: 'ROCKET', hair: 'short', hat: null, hc: '#2a1a10' }, { name: 'VOLT', hair: 'ponytail', hat: 'band', hc: '#6a3a1a' },
  { name: 'MOXIE', hair: 'spiky', hat: 'cap', hc: '#c05020' }, { name: 'GOLDIE', hair: 'long', hat: 'band', hc: '#f0d060' }];
MT.makeRig = function (spec) { try { return new E.Humanoid(spec); } catch (e) { MT.game.fail && MT.game.fail('rig', e); return null; } };
MT.contestantRig = function (c) {
  const L = MT.LOOKS[c.look % 4], col = c.color, t = TN(col);
  return MT.makeRig({ size: 1.1, build: 'heroic', weapon: 'gun', outfit: 'shirt', hair: L.hair, hat: L.hat ? { style: L.hat, color: col } : undefined, sleeves: 'long',
    colors: { cloth: col, pants: t.sh, boot: '#14081c', glove: '#f0f0f8', hair: L.hc, trim: '#ffffff', belt: '#ffffff', skin: ['#f0c8a0', '#d89a70', '#f4d0b0', '#c88a60'][c.look % 4] } });
};
const ENEMY_RIG = {
  goon: () => MT.makeRig({ size: 1.0, build: 'bulky', weapon: 'sword', outfit: 'coat', hat: { style: 'helmet', color: '#2a2a44' }, hair: 'bald', colors: { cloth: '#2a2a44', coat: '#2a2a44', pants: '#1a1a2c', boot: '#0c0c14', trim: '#ffcc33', metal: '#222', glove: '#111' } }),
  popper: () => MT.makeRig({ size: 1.0, build: 'chibi', weapon: null, outfit: 'tunic', hat: { style: 'pointed', color: '#ff2e88' }, hair: 'short', colors: { cloth: '#2ee6ff', pants: '#ffcc33', boot: '#ff2e88', hair: '#ffcc33', trim: '#fff' } }),
  mime: () => MT.makeRig({ size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hat: { style: 'band', color: '#111' }, hair: 'short', colors: { skin: '#f6f6f6', cloth: '#f2f2f2', pants: '#1a1a1a', boot: '#111', glove: '#fff', hair: '#111', trim: '#222' } }),
  heckler: () => MT.makeRig({ size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'spiky', colors: { cloth: '#d02828', pants: '#3a4a7a', boot: '#222', hair: '#6a3a1a', trim: '#fff' } }),
  hecklerKing: () => MT.makeRig({ size: 1.15, build: 'chibi', weapon: null, outfit: 'coat', hat: { style: 'crown', color: '#ffcc33' }, hair: 'spiky', colors: { cloth: '#ffcc33', coat: '#d02828', pants: '#3a4a7a', boot: '#222', hair: '#6a3a1a', trim: '#fff' } }),
  brute: () => MT.makeRig({ size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hat: { style: 'helmet', color: '#8a5a32' }, hair: 'bald', colors: { skin: '#8a5a32', cloth: '#e8e0b8', pants: '#8a5a32', boot: '#3a2410', glove: '#8a5a32', trim: '#ff3344', metal: '#8a5a32' } }),
  lance: () => MT.makeRig({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', colors: { cloth: '#7a2ab0', coat: '#7a2ab0', pants: '#111', boot: '#111', glove: '#fff', hair: '#e0e0f0', trim: '#ffcc33', skin: '#f0c8a0' } }),
  penny: () => MT.makeRig({ size: 1.2, build: 'heroic', weapon: null, outfit: 'robe', hair: 'long', colors: { cloth: '#20b0a8', pants: '#20b0a8', boot: '#111', glove: '#fff', hair: '#ff8ad8', trim: '#ffd23a', skin: '#f0c8a0' } }),
  annc: () => MT.makeRig({ size: 1.2, build: 'bulky', weapon: null, outfit: 'coat', hair: 'bald', colors: { cloth: '#222', coat: '#222', pants: '#111', boot: '#111', skin: '#d8a880', trim: '#fff' } }),
  paparazzi: () => MT.makeRig({ size: .9, build: 'chibi', weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#444' }, hair: 'short', colors: { cloth: '#8a7a5a', coat: '#8a7a5a', pants: '#333', boot: '#111', hair: '#222' } })
};
MT.cachedRig = function (key) { MT._rigs = MT._rigs || {}; if (!MT._rigs[key]) MT._rigs[key] = ENEMY_RIG[key] ? ENEMY_RIG[key]() : null; return MT._rigs[key]; };
MT.hostRig = k => MT.cachedRig(k);
const BLOB = () => { try { return new E.Blob({ R: 6, colors: { dk: '#5a6478', base: '#c8d0e0', lt: '#f0f4ff', spec: '#fff', eye: '#fff', pupil: '#14081c' }, feet: true, mouth: true }); } catch (e) { return null; } };

// ---- animation (rigs updated each step; skipped when MT.cfg.skipRigs) ----
World.prototype.animate = function (dt) {
  for (const c of this.cs) {
    if (c.state === 'gone') continue; if (!c.rig) c.rig = MT.contestantRig(c); if (!c.rig) continue;
    const boat = c.boatT > 0, pose = c.state === 'dying' ? 'die' : boat ? c.boatPose : c.pose;
    c.rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, facing: c.face, point: c.state === 'alive' && !boat && (c.fireOn || c.laserOn || c.fireCd > 0), hurt: c.hurtT > 0, flip: c.slideT > 0 ? c.slideU : 0, pose, expr: boat ? 'smile' : undefined, down: c.state === 'dying' ? c.down : 0, land: c.landK > 0 ? c.landK : undefined });
  }
  for (const e of this.enemies) this.animEnemy(e, dt);
};
World.prototype.animEnemy = function (e, dt) {
  const A = MT.ENEMIES[e.kind]; const key = e.kind === 'discoBig' ? null : e.kind;
  if (key === 'clapbot') { if (!e.blob) e.blob = BLOB(); if (e.blob) e.blob.update(dt, { squash: e.state === 'squat' ? -.35 : e.state === 'hop' ? .3 : 0, walk: e.state === 'hop' ? 1 : 0 }); return; }
  if (!ENEMY_RIG[key]) return; if (!e.rig) e.rig = MT.cachedRigFresh(key); if (!e.rig) return;
  const o = { x: e.x, y: e.y, z: e.z, vx: e.vx || 0, vy: e.vy || 0, facing: e.face, hurt: e.flash > 0 };
  if (key === 'goon' || key === 'brute') { if (e.state === 'wind') o.attack = E.move('bash', Math.min(.45, 1 - e.t2 / .32 * .55)); else if (e.state === 'tele') o.pose = 'crouch'; else if (e.state === 'charge') o.sprint = true; else if (e.state === 'stunned') o.pose = 'kneel'; }
  if (key === 'heckler' || key === 'hecklerKing') { if (e.state === 'throw') o.attack = E.move('throw', Math.min(.6, 1 - e.t2 / .45)); }
  if (key === 'mime') { o.pose = 'guard'; if (e.state === 'tele') { o.x += Math.sin(e.t * 60) * .8; } }
  if (key === 'popper') { o.point = false; }
  e.rig.update(dt, o);
};
MT.cachedRigFresh = k => ENEMY_RIG[k] ? ENEMY_RIG[k]() : null;

// ---- painters ----
MT.paint = {};
function shadow(r, x, y, rad, a) { r.shadow(x, y, rad, a === undefined ? .45 : a); }
MT.paint.contestant = function (r, c, w) {
  if (c.state === 'gone') return; const t = w.time;
  if (c.state === 'out') return;
  shadow(r, c.x, c.y, 6, c.state === 'drop' ? .25 : .5);
  r.decal(() => r.groundRing(c.x, c.y, 8, c.color, .8));
  if (c.state === 'drop') r.queue(c.x, c.y, 0, g => { const [sx, sy] = r.w(c.x, c.y, c.z + 14), [tx, ty] = r.w(c.x, c.y, 200); px.line(g, sx, sy, tx, ty, '#c8d0e0', 1); }, {});
  const blink = c.invuln > 0 && c.state !== 'dying' && c.addons.shield <= 0 && (Math.floor(t * 24) % 2 === 0);
  if (c.rig) r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { alpha: blink ? .35 : 1, flash: c.flash > 0 ? '#ffffff' : undefined, ghost: c.ghostT > 0 ? { color: c.color, life: .25, alpha: .5, owner: c } : undefined });
  else r.queue(c.x, c.y, c.z, g => { const [sx, sy] = r.w(c.x, c.y, c.z); px.disc(g, sx, sy - 8, 6, c.color); }, {});
  // number plate / arrow
  if (c.arrowT > 0 || c.state === 'dying') r.queue(c.x, c.y, 40, g => { const [sx, sy] = r.w(c.x, c.y, 44 + Math.sin(t * 6) * 2); px.poly(g, [[sx - 4, sy - 4], [sx + 4, sy - 4], [sx, sy + 2]], c.color); E.font.text(g, 'P' + (c.slot + 1), sx, sy - 13, '#fff', { align: 'center', shadow: '#000', outline: false }); }, { emissive: true });
  if (c.addons.shield > 0) r.queue(c.x, c.y, 10, g => { const [sx, sy] = r.w(c.x, c.y, 12), u = (r.w(c.x + 12, c.y, 12)[0] - sx); px.blend(g, .35, 'add', () => px.disc(g, sx, sy, u, '#4a8aff')); if (Math.floor(t * 8) % 2) E.font.text(g, 'K', sx, sy - 3, '#ffcc33', { align: 'center', outline: false }); }, { emissive: true });
  if (c.addons.records > 0) for (let k = 0; k < 2; k++) { const a = (c.recA || 0) + k * Math.PI, x = c.x + Math.cos(a) * 26, y = c.y + Math.sin(a) * 26; r.sprite(x, y, 12, MT.spr.record, { anchor: 'center', glow: 1 }); }
  if (c.laserOn && c.laserLen) { const a = c.laserA, x0 = c.x + Math.cos(a) * 10, y0 = c.y + Math.sin(a) * 10, x1 = x0 + Math.cos(a) * c.laserLen, y1 = y0 + Math.sin(a) * c.laserLen; r.queue((x0 + x1) / 2, (y0 + y1) / 2, 14, g => { const [ax, ay] = r.w(x0, y0, 14), [bx, by] = r.w(x1, y1, 14); px.glow(g, 1); px.line(g, ax, ay, bx, by, '#7affff', 3); px.line(g, ax, ay, bx, by, '#ffffff', 1); }, { emissive: true }); w.game.lights.add(x0 + Math.cos(a) * c.laserLen * .5, y0 + Math.sin(a) * c.laserLen * .5, 14, 50, .6, { color: '#7affff' }); }
};
const CONF = ['#ff2e88', '#2ee6ff', '#ffcc33', '#fff'];
MT.paint.enemy = function (r, e, w) {
  if (e.hidden) return;
  const t = w.time + e.seed * 7, K = e.kind;
  if (K === 'crate') { r.shape('crate', e.x, e.y, 0, { facing: e.seed * 3, scale: .8 }); if (e.carryKey) r.sprite(e.x, e.y, 28, MT.spr.key, { anchor: 'center', glow: 1 }); return; }
  if (K === 'lock') { r.queue(e.x, e.y, 12, g => { const [sx, sy] = r.w(e.x, e.y, 14); px.disc(g, sx, sy, 5, '#14081c'); px.disc(g, sx, sy, 4, e.flash > 0 ? '#fff' : '#ffcc33'); px.rect(g, sx - 1, sy - 1, 2, 4, '#14081c'); }, {}); return; }
  if (K === 'segment') { r.queue(e.x, e.y, 6, g => { const [sx, sy] = r.w(e.x, e.y, 6); px.disc(g, sx, sy, 3.6, '#14081c'); px.disc(g, sx, sy, 3, e.flash > 0 ? '#fff' : (e.idx % 2 ? '#3a3a4a' : '#ffcc33')); px.dot(g, sx - 1, sy - 1, '#ffffff'); }, {}); return; }
  shadow(r, e.x, e.y, e.r * .9, .4);
  if (K === 'disco' || K === 'discoBig') { r.queue(e.x, e.y, 12, g => { const [sx, sy] = r.w(e.x, e.y, 12 + e.r), rad = e.r * 1.25 * (e.big ? 1.1 : 1); px.disc(g, sx, sy, rad + 1, '#14081c'); px.disc(g, sx, sy, rad, e.flash > 0 ? '#fff' : '#9aa0b8'); for (let i = -2; i <= 2; i++) { px.line(g, sx - rad, sy + i * rad / 3, sx + rad, sy + i * rad / 3, '#c8d0e8', 1); px.line(g, sx + i * rad / 3, sy - rad, sx + i * rad / 3, sy + rad, '#c8d0e8', 1); } const a = (e.spin || 0); for (let i = 0; i < 4; i++) { const gx = sx + Math.cos(a + i * 1.7) * rad * .6, gy = sy + Math.sin(a * 1.3 + i * 2.1) * rad * .6; px.dot(g, gx, gy, i % 2 ? '#ff2e88' : '#2ee6ff'); px.dot(g, gx + 1, gy, '#fff'); } if (e.state === 'flare') { px.blend(g, .6, 'add', () => px.disc(g, sx, sy, rad * 1.7, '#ffffff')); } }, { emissive: e.state === 'flare' }); return; }
  if (K === 'tank') { r.queue(e.x, e.y, 6, g => { const a = e.body_a || 0, ca = Math.cos(a), sa = Math.sin(a), P = (fx, fy, z) => r.w(e.x + ca * fx - sa * fy, e.y + sa * fx + ca * fy, z); const quad = (pts, c) => px.poly(g, pts.map(p => P(...p)), c); const fl = e.flash > 0;
      for (const sd of [-1, 1]) quad([[-11, sd * 8, 3], [11, sd * 8, 3], [11, sd * 12, 3], [-11, sd * 12, 3]], '#14081c');
      quad([[-11, -8, 6], [12, -8, 6], [12, 8, 6], [-11, 8, 6]], fl ? '#fff' : '#4a5a6a'); quad([[-9, -6, 9], [10, -6, 9], [10, 6, 9], [-9, 6, 9]], fl ? '#fff' : '#6a7a8c');
      const tc = Math.cos(e.turret || 0), ts = Math.sin(e.turret || 0), rc = (e.recoil > 0 ? -3 : 0); const [bx, by] = r.w(e.x, e.y, 14), [ex, ey] = r.w(e.x + tc * (16 + rc), e.y + ts * (16 + rc), 14);
      px.disc(g, bx, by, 6, '#14081c'); px.disc(g, bx, by, 5, fl ? '#fff' : '#8a9aac'); px.line(g, bx, by, ex, ey, '#14081c', 4); px.line(g, bx, by, ex, ey, '#cdd6e2', 2); px.disc(g, ex, ey, 2.4, e.state === 'aim' && Math.floor(t * 20) % 2 ? '#ffffff' : '#ff3344'); }, { emissive: e.state === 'aim' });
    if (e.state === 'aim') r.decal(() => { const [ax, ay] = r.w(e.x, e.y, 1), [bx, by] = r.w(e.x + Math.cos(e.turret) * 160, e.y + Math.sin(e.turret) * 160, 1); px.line(r.tgt, ax, ay, bx, by, '#ff5a5a', 1); }); return; }
  if (K === 'snake') { r.queue(e.x, e.y, 8, g => { const [sx, sy] = r.w(e.x, e.y, 8); const rr = e.state === 'rear' ? 6 : 5.4; px.disc(g, sx, sy, rr + 1, '#14081c'); px.disc(g, sx, sy, rr, e.flash > 0 ? '#fff' : '#2a2a3a'); const a = e.face || 0; const [fx, fy] = [Math.cos(a), Math.sin(a) * .8]; px.rect(g, Math.round(sx + fx * 5 - 1), Math.round(sy + fy * 5 - 3), 3, 2, '#ffd23a'); px.rect(g, Math.round(sx + fx * 5 - 1), Math.round(sy + fy * 5 + 1), 3, 2, '#ffd23a'); px.dot(g, sx + fx * 2, sy - 2, '#ff3344'); px.dot(g, sx + fx * 2 + 2, sy - 2, '#ff3344'); }, {}); return; }
  if (K === 'clapbot') { if (!e.blob) return r.queue(e.x, e.y, 6, g => { const [sx, sy] = r.w(e.x, e.y, 7); px.disc(g, sx, sy, 5, '#c8d0e0'); }, {});
    r.actor(e.x, e.y, e.state === 'hop' ? 4 : 0, (g, ox, oy) => { e.blob.draw(g, ox, oy, r.view); const h = Math.sin(w.time * 20) * 3; px.disc(g, ox - 8 + h, oy - 8, 2.2, '#ffcc33'); px.disc(g, ox + 8 - h, oy - 8, 2.2, '#ffcc33'); px.line(g, ox, oy - 12, ox, oy - 16, '#ccc', 1); px.dot(g, ox, oy - 17, '#ff3344'); }, { flash: e.flash > 0 ? '#fff' : undefined }); return; }
  if (e.rig) {
    const alpha = K === 'mime' ? .45 : 1, popFlash = K === 'popper' && e.state === 'fuse' ? (Math.floor(t * 14) % 2 ? '#ff3344' : '#ffffff') : null;
    r.actor(e.x, e.y, e.z || 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { alpha, flash: e.flash > 0 ? '#ffffff' : popFlash || (e.vulnerable ? '#ffe0a0' : undefined), flashMix: popFlash ? .5 : e.vulnerable ? .25 : .75, every: (K === 'goon' || K === 'clapbot') ? undefined : undefined });
    if (K === 'mime') r.queue(e.x, e.y, 20, g => { const hw = 9, P = (dx, dy, z) => r.w(e.x + dx, e.y + dy, z); for (const [a, b] of [[[-hw, -hw], [hw, -hw]], [[hw, -hw], [hw, hw]], [[hw, hw], [-hw, hw]], [[-hw, hw], [-hw, -hw]]]) { const p = P(a[0], a[1], 0), q = P(b[0], b[1], 0), p2 = P(a[0], a[1], 30), q2 = P(b[0], b[1], 30); px.blend(g, .5, 'add', () => { px.line(g, p[0], p[1], q[0], q[1], '#9ad8ff', 1); px.line(g, p2[0], p2[1], q2[0], q2[1], '#9ad8ff', 1); px.line(g, p[0], p[1], p2[0], p2[1], '#9ad8ff', 1); }); } if (e.state === 'tele') { const [sx, sy] = r.w(e.x, e.y, 34); E.font.text(g, '!', sx, sy - 6, '#ff3344', { align: 'center', outline: false }); } }, { emissive: true });
    if (K === 'brute') { if (e.state === 'stunned') r.queue(e.x, e.y, 40, g => { for (let i = 0; i < 3; i++) { const a = w.time * 4 + i * 2.1, [sx, sy] = r.w(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9, 38); px.dot(g, sx, sy, '#ffe068'); px.dot(g, sx + 1, sy, '#fff'); } }, { emissive: true }); }
    if (K === 'hecklerKing' && e.carryKey) r.sprite(e.x, e.y, 36, MT.spr.key, { anchor: 'center', glow: 1 });
  } else r.queue(e.x, e.y, 6, g => { const [sx, sy] = r.w(e.x, e.y, 8); px.disc(g, sx, sy, e.r, '#c04060'); }, {});
  if (e.carryKey && K !== 'hecklerKing' && K !== 'crate') r.sprite(e.x, e.y, (K === 'brute' ? 52 : 34), MT.spr.key, { anchor: 'center', glow: 1 });
};
// telegraphs drawn on the floor
MT.paint.telegraphs = function (r, w) {
  for (const e of w.enemies) { if (!e.alive || e.hidden) continue;
    if (e.kind === 'brute' && e.state === 'tele') r.decal(() => { const a = MT.angTo(e, e.tgt || e), L = 160; const [ax, ay] = r.w(e.x, e.y, 1), [bx, by] = r.w(e.x + Math.cos(e.face) * L, e.y + Math.sin(e.face) * L, 1); px.line(r.tgt, ax, ay, bx, by, '#ff3344', 2); r.groundRing(e.x, e.y, 14 + (1 - e.t2 / .85) * 14, '#ff5a5a', .9); });
    if (e.kind === 'mime' && e.state === 'tele') r.decal(() => r.groundDisc(e.x, e.y, 36, '#ff3344', .25));
    if (e.kind === 'popper' && e.state === 'fuse') r.decal(() => r.groundRing(e.x, e.y, 10 + (1 - e.t2 / .6) * 8, '#ffcc33', .8));
    if ((e.kind === 'heckler' || e.kind === 'hecklerKing') && e.state === 'throw' && e.aimAt) r.decal(() => { r.groundRing(e.aimAt.x, e.aimAt.y, 10, '#ff3344', .9); r.groundDisc(e.aimAt.x, e.aimAt.y, 10, '#ff3344', .2); });
    if (e.kind === 'goon' && e.state === 'wind') r.decal(() => r.groundArc(e.x, e.y, 6, 20, e.face - .6, e.face + .6, '#ff5a5a', .45));
  }
  for (const l of w.lobs) if (l.kind === 'tomato') r.decal(() => { r.groundRing(l.tx, l.ty, 10, '#ff3344', .9); r.groundDisc(l.tx, l.ty, 10 * Math.min(1, l.t / .7), '#ff3344', .25); });
  for (const p of w.pops) if (p.kind === 'shadow') r.decal(() => r.groundDisc(p.x, p.y, 8 + (1 - p.t / .6) * 6, '#000', .5));
  if (w.puddles) for (const p of w.puddles) r.decal(() => r.groundDisc(p.x, p.y, p.r, '#a01820', Math.min(.55, p.t / 3)));
  for (const d of w.decals) r.decal(() => { if (d.kind === 'tomato') r.groundDisc(d.x, d.y, 9, '#b02020', Math.min(.5, d.t / 3)); else r.groundDisc(d.x, d.y, 7, '#000', Math.min(.45, d.t / 3)); });
};
MT.paint.bullets = function (r, w) {
  w.pShots.draw(r);
  for (const b of w.fShots.list) {
    r.queue(b.x, b.y, b.z, g => {
      const [sx, sy] = r.w(b.x, b.y, b.z), u = Math.max(1.4, (r.w(b.x + b.r, b.y, b.z)[0] - sx)); px.glow(g, 1);
      if (b.kind === 'card') { const a = b.spinA || 0, c = Math.cos(a) * u, s2 = Math.sin(a) * u; px.poly(g, [[sx - c - s2 * .5, sy - s2 + c * .3], [sx + c - s2 * .5, sy + s2 + c * .3], [sx + c + s2 * .5, sy + s2 - c * .3], [sx - c + s2 * .5, sy - s2 - c * .3]], '#14081c'); px.disc(g, sx, sy, u * .8, '#ff6a9a'); px.dot(g, sx, sy, '#fff'); }
      else if (b.kind === 'beam') { px.line(g, sx - b.vx * .03, sy - b.vy * .02, sx, sy, '#ffe9a0', 2); px.disc(g, sx, sy, u, '#ffe9a0'); }
      else if (b.kind === 'shell') { px.disc(g, sx, sy, u + 1, '#14081c'); px.disc(g, sx, sy, u, '#ff7a30'); px.dot(g, sx, sy, '#fff'); }
      else { px.disc(g, sx, sy, u + 1, '#14081c'); px.disc(g, sx, sy, u, b.color); px.dot(g, sx, sy, '#ffffff'); }
    }, { emissive: true });
  }
  for (const k of w.rockets) r.sprite(k.x, k.y, 12, MT.spr.rocket, { anchor: 'center', rot: k.a + Math.PI / 2, glow: 1 });
  for (const l of w.lobs) { r.shadow(l.x, l.y, 3, .4); r.sprite(l.x, l.y, Math.max(2, l.z), l.kind === 'bag' ? MT.spr.bag : l.kind === 'tomato' ? MT.spr.tomato : MT.spr.tot, { anchor: 'center' }); }
};
MT.paint.pickups = function (r, w) {
  for (const p of w.pickups) {
    if (p.ttl < 2.5 && Math.floor(p.ttl * 8) % 2) continue; const bob = Math.sin(w.time * 4 + p.id) * 1.5 + 5 + p.z;
    let spr = null;
    if (p.kind === 'bill') spr = MT.spr.bill; else if (p.kind === 'stack') spr = MT.spr.stack; else if (p.kind === 'bar') spr = MT.spr.bar; else if (p.kind === 'case') spr = MT.spr.case; else if (p.kind === 'prize') spr = MT.spr.prize[p.col || 'red'];
    else if (p.kind === 'key') spr = MT.spr.key; else if (p.kind === 'bomb') spr = MT.spr.bomb; else if (p.kind === 'life') spr = MT.spr.life; else if (p.kind === 'statue') spr = MT.spr.statue; else if (p.kind === 'cap') spr = MT.capSprite(p.w);
    if (p.pedestal) r.queue(p.x, p.y, 0, g => { const [sx, sy] = r.w(p.x, p.y, 0), u = r.w(p.x + 10, p.y, 0)[0] - sx; px.disc(g, sx, sy, u, '#14081c'); px.disc(g, sx, sy - 1, u * .85, '#caa030'); px.disc(g, sx, sy - 2, u * .6, '#ffe068'); }, {});
    r.shadow(p.x, p.y, 4, .35);
    if (spr) r.sprite(p.x, p.y, bob + 4, spr, { anchor: 'center', glow: p.kind === 'cap' || p.kind === 'key' || p.kind === 'statue' ? 1 : .4 });
    if (p.kind === 'cap') r.queue(p.x, p.y, bob + 8, g => { const [sx, sy] = r.w(p.x, p.y, bob + 4); const W = MT.WEAPONS[p.w]; E.font.text(g, W ? W.letter : '?', sx, sy - 3, '#ffffff', { align: 'center', outline: false }); }, { emissive: true });
    if (p.kind === 'key' || p.kind === 'cap' || p.kind === 'statue') w.game.lights.add(p.x, p.y, 16, 28, .5, { color: p.kind === 'cap' ? '#9ad8ff' : '#ffcc33' });
  }
};
