// MASH TV: drawing a World: floor, outside dressing, walls, doors, props, entities, lights.
const WPD = World.prototype;
MT.fitZoom = function (game, map, extra) {
  const b = map.bounds(game.view); const bw = b.x1 - b.x0, bh = b.y1 - b.y0; if (!(bw > 0)) return 1;
  const W = game.W || 427, H = game.H || 240, z = Math.min(W / (bw + 8), (H - 40 - (extra || 0)) / (bh + 4));
  return MT.clamp(z, .6, 1.6) * MT.T.camZoom;
};
WPD.drawOutside = function (r) {
  const S = MT.SETS[this.set], t = this.time, R = this.rat.R / 100;
  // bleachers east and west
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -130 : 378, x1 = side < 0 ? -10 : 498;
    r.queue(side < 0 ? -70 : 438, 120, 0, g => { for (let step = 0; step < 4; step++) { const xa = side < 0 ? -10 - (step + 1) * 30 : 378 + step * 30, xb = xa + 30; r.box(g, xa, 8, 0, xb, 232, 6 + step * 6, S.neon === '#ff2e88' ? '#5a2a8a' : '#4a4a58', '#2a1a4a'); } }, {});
    for (const a of this.audience) { if ((a.x < 0) !== (side < 0)) continue; const bob = Math.sin(t * (2 + R * 4) + a.ph) * (1 + R * 3), cheer = this.rat.prime > 0 || (this.cheerT > 0 && ((a.ph * 3) | 0) % 2); r.queue(a.x, a.y, 14 + Math.floor((side < 0 ? -a.x - 10 : a.x - 378) / 30) * 6, g => { const [sx, sy] = r.w(a.x, a.y, 14 + Math.floor((side < 0 ? -a.x - 10 : a.x - 378) / 30) * 6 + bob); const c = ['#ff2e88', '#2ee6ff', '#ffcc33', '#7affb0', '#ff8a30', '#c8a0ff', '#fff', '#ff5a5a'][a.v]; px.rect(g, sx - 3, sy, 7, 6, c); px.disc(g, sx, sy - 3, 3, ['#f0c8a0', '#d89a70', '#8a5a40', '#f4d0b0'][a.v % 4]); px.rect(g, sx - 3, sy - 6, 7, 2, ['#222', '#6a3a1a', '#e0c060', '#a03020'][(a.v >> 1) % 4]); if (cheer) { px.rect(g, sx - 5, sy - 4, 1, 4, c); px.rect(g, sx + 5, sy - 4, 1, 4, c); } if (a.sign) { px.rect(g, sx - 8, sy - 14, 17, 7, '#fff7e8'); E.font.text(g, a.sign, sx, sy - 13, '#14081c', { align: 'center', font: 'tiny', outline: false }); } }, {}); }
  }
  // north truss & signs, south dolly track
  r.queue(184, -20, 70, g => { const [a, b] = [r.w(20, -20, 76), r.w(348, -20, 76)]; px.rect(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), 3, '#8a90a0'); px.rect(g, Math.round(a[0]), Math.round(a[1]) + 3, Math.round(b[0] - a[0]), 1, '#3a3a50'); for (let i = 0; i < 12; i++) { const [lx, ly] = r.w(36 + i * 26, -20, 74); px.disc(g, lx, ly + 3, 2, Math.floor(t * 4 + i) % 3 === 0 ? '#fff7a0' : '#ffcc33'); } const [sx, sy] = r.w(184, -20, 90); const on = Math.floor(t * 2) % 2; px.rect(g, sx - 26, sy, 52, 11, '#14081c'); E.font.text(g, 'ON AIR', sx, sy + 2, on ? '#ff3344' : '#7a1020', { align: 'center', outline: false }); }, {});
  r.queue(184, 262, 0, g => { const [a] = r.w(20, 262, 0), [b] = r.w(348, 262, 0), [, y] = r.w(20, 262, 0); px.rect(g, Math.round(a), Math.round(y), Math.round(b - a), 2, '#6a6a80'); px.rect(g, Math.round(a), Math.round(y) + 4, Math.round(b - a), 2, '#6a6a80'); }, {});
  for (const cx of [54, 314]) r.queue(cx, 268, 0, g => { const [sx, sy] = r.w(cx, 268, 0); px.rect(g, sx - 6, sy - 8, 12, 8, '#2a2a3a'); px.rect(g, sx - 3, sy - 14, 6, 6, '#14081c'); px.disc(g, sx + 4, sy - 11, 2, '#7a9aff'); px.rect(g, sx - 1, sy - 30, 3, 22, '#6a6a80'); }, {});
};
WPD.drawWalls = function (r) {
  const S = MT.SETS[this.set]; this.map.queueWalls(r);
  // marquee bulbs along the top of the north, east and west walls
  const t = this.time;
  r.queue(184, 8, 27, g => { for (let i = 0; i < 23; i++) { const [sx, sy] = r.w(8 + i * 16, 14, 27); const on = Math.floor(t * 6 - i * .5) % 3 === 0; px.rect(g, sx - 1, sy - 1, 2, 2, on ? '#fff7a0' : S.trim === '#ffcc33' ? '#8a6a18' : '#555'); } }, { emissive: true });
  r.queue(8, 120, 27, g => { for (let i = 0; i < 14; i++) for (const x of [14, 354]) { const [sx, sy] = r.w(x, 8 + i * 16, 27); const on = Math.floor(t * 6 + i * .5) % 3 === 0; px.rect(g, sx - 1, sy - 1, 2, 2, on ? '#fff7a0' : '#8a6a18'); } }, { emissive: true });
};
WPD.drawDoors = function (r) {
  const t = this.time;
  for (const dn in this.doors) {
    const d = this.doors[dn], D = MT.DOORS[dn]; const open = d.state === 'opening' || d.state === 'open', exit = d.state === 'exit', closing = d.state === 'closing';
    const col = exit ? '#30ff70' : open || closing ? '#ff3344' : '#552030', pulse = Math.floor(t * 6) % 2;
    r.queue(D.x, D.y, 30, g => {
      const [sx, sy] = r.w(D.x - D.dx * 4, D.y - D.dy * 4, 32); px.disc(g, sx, sy, 3, '#14081c'); px.disc(g, sx, sy, 2.2, (exit || open) && pulse ? col : (exit || open ? '#a02030' : '#552030')); if (exit || open) px.blend(g, .4, 'add', () => px.disc(g, sx, sy, 7, col));
      if (exit) { const nm = (MT.ROOMS[d.exit] || {}).name || 'NEXT', ty = (MT.ROOMS[d.exit] || {}).type || 'battle'; const [tx, ty2] = r.w(D.x - D.dx * 10, D.y - D.dy * 10, 40); const wd = E.font.width(nm) + 10; px.rect(g, Math.round(tx - wd / 2), Math.round(ty2 - 14), wd, 14, '#14081c'); px.rect(g, Math.round(tx - wd / 2 + 1), Math.round(ty2 - 13), wd - 2, 12, '#0c3a1c'); E.font.text(g, nm, Math.round(tx), Math.round(ty2 - 11), '#aaffc8', { align: 'center', outline: false }); const keyRoom = MT.ROOMS[d.exit] && MT.ROOMS[d.exit].key; E.font.text(g, (MT.TEXT.roomTypes[ty] || '') + (keyRoom ? '  ★' : ''), Math.round(tx), Math.round(ty2 + 2), keyRoom ? '#ffcc33' : '#c8c0e0', { align: 'center', outline: false, shadow: '#000' }); }
    }, { emissive: true });
    if (exit) this.game.lights.add(D.x - D.dx * 8, D.y - D.dy * 8, 16, 40, .8, { color: '#30ff70' }); else if (open) this.game.lights.add(D.x - D.dx * 8, D.y - D.dy * 8, 16, 34, .6, { color: '#ff3344' });
    if (open || closing || exit) r.decal(() => { for (let k = 0; k < 6; k++) { const o = (k - 2.5) * 8; const p = r.w(D.x + D.dx * 0 + (D.dx === 0 ? o : 0) - D.dx * 10, D.y + (D.dy === 0 ? o : 0) - D.dy * 10, 0); px.rect(r.tgt, Math.round(p[0]) - 2, Math.round(p[1]), 4, 2, k % 2 ? '#14081c' : '#f0c828'); } });
  }
};
WPD.drawSetProps = function (r) {
  const S = MT.SETS[this.set], t = this.time;
  const corners = [[22, 22], [346, 22], [22, 218], [346, 218]];
  for (const [x, y] of corners) {
    if (this.set === 'studio') r.queue(x, y, 0, g => { const [sx, sy] = r.w(x, y, 0), [, ty] = r.w(x, y, 20); px.rect(g, sx - 1, ty, 2, sy - ty, '#8a90a0'); px.disc(g, sx, ty, 4, '#14081c'); px.disc(g, sx, ty, 3, '#fff7a0'); }, { emissive: false });
    else if (this.set === 'warehouse') r.shape('crate', x, y, 0, { facing: x * .3, scale: .9 });
    else if (this.set === 'rooftop') r.prop('lamp', x, y, 0, { light: true });
    else r.prop('lamp', x, y, 0, { light: true });
  }
  if (this.set === 'greenroom') { r.shape('table', 60, 40, 0, {}); r.shape('chair', 80, 46, 0, {}); }
  // sweeping spotlights
  const g = this.game; if (this.set === 'studio' || this.set === 'rooftop') for (let i = 0; i < 4; i++) { const [x, y] = corners[i], a = Math.sin(t * .5 + i * 1.7) * .8 + (i < 2 ? Math.PI / 2 : -Math.PI / 2); g.lights.add(x + Math.cos(a) * 80, y + Math.sin(a) * 60, 10, 70, .3, { color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a60ff'][i] }); }
  if (this.set === 'rooftop' && Math.floor(t / 4) !== Math.floor((t - .016) / 4)) g.lights.add(184, -40, 40, 200, .25, { color: ['#ff6a30', '#ffd23a', '#7affff'][Math.floor(t / 4) % 3] });
};
WPD.drawHazards = function (r) {
  for (const h of this.hazards) {
    if (h.kind === 'conveyor') for (let i = 0; i < h.rows.length; i++) { const y0 = 16 + h.rows[i] * 16, y1 = y0 + 32, dir = h.dirs[i]; r.decal(() => { const a = r.w(16, y0, 0), b = r.w(352, y1, 0); px.rect(r.tgt, Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(b[1] - a[1]), h.warn ? '#5a2a2a' : '#25252e'); for (let x = 0; x < 336; x += 16) { const xx = 16 + ((x + (this.time * 40 * dir * h.speedK) % 16 + 16) % 336); const p = r.w(xx, y0 + 16, 0); px.line(r.tgt, p[0] - dir * 3, p[1] - 3, p[0], p[1], h.warn ? '#ff5a5a' : '#f0c828', 1); px.line(r.tgt, p[0] - dir * 3, p[1] + 3, p[0], p[1], h.warn ? '#ff5a5a' : '#f0c828', 1); } }); }
    if (h.kind === 'pyro') for (const v of h.vents) {
      r.decal(() => { const p = r.w(v.x, v.y, 0); px.rect(r.tgt, Math.round(p[0]) - 6, Math.round(p[1]) - 3, 12, 6, '#14081c'); for (let k = -4; k <= 4; k += 2) px.rect(r.tgt, Math.round(p[0]) + k, Math.round(p[1]) - 2, 1, 4, v.state === 'tele' ? '#ff6a3a' : '#444'); if (v.state === 'tele') r.groundRing(v.x, v.y, 12, '#ff5a3a', .6 + Math.sin(this.time * 30) * .3); });
      if (v.state === 'fire') { this.game.particles.fire(v.x, v.y, 2, 1, { size: 5 }); r.queue(v.x, v.y, 12, g => { const [sx, sy] = r.w(v.x, v.y, 0), [, ty] = r.w(v.x, v.y, 34); px.glow(g, 1); px.ell(g, sx, (sy + ty) / 2, 8, (sy - ty) / 2, '#ff6a20'); px.ell(g, sx, (sy + ty) / 2 + 2, 5, (sy - ty) / 2 - 3, '#ffd23a'); }, { emissive: true }); this.game.lights.add(v.x, v.y, 14, 44, .8, { color: '#ff7a30' }); }
    }
  }
};
WPD.drawRoomExtras = function (r) {
  const rm = this.rm; if (!rm) return;
  if (rm.id === '3-4' || rm.locks) { r.queue(90, 10, 0, g => { const [a, b] = r.w(24, 14, 26), [c, d] = r.w(120, 14, 0); px.rect(g, Math.round(a), Math.round(b), Math.round(c - a), Math.round(d - b), this.safeOpen ? '#06060a' : '#5a5a70'); px.rect(g, Math.round(a), Math.round(b), Math.round(c - a), 1, '#ffcc33'); if (!this.safeOpen) E.font.text(g, 'VAULT', Math.round((a + c) / 2), Math.round(b + 3), '#ffd23a', { align: 'center', outline: false }); }, {}); }
  if (this.keyCage && !this.keyCage.open) { const k = this.keyCage; r.queue(k.x, k.y, 10, g => { const [sx, sy] = r.w(k.x, k.y, 0), u = r.w(k.x + 14, k.y, 0)[0] - sx; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, x = sx + Math.cos(a) * u, y = sy + Math.sin(a) * u * .6; px.rect(g, Math.round(x), Math.round(y - 14), 1, 14, '#c8d0e0'); } px.ell(g, sx, sy - 14, u, u * .6, '#8a90a0'); if (this.survive) { const left = Math.max(0, Math.ceil(this.survive.len - this.survive.t)); E.font.text(g, String(left), sx, sy - 28, '#fff', { align: 'center', scale: 2, shadow: '#000', outline: false }); } }, {}); }
};
WPD.draw = function (r) {
  const S = MT.SETS[this.set] || MT.SETS.studio, g = this.game;
  g.lights.enabled = true; g.lights.ambient = S.ambient;
  this.map.drawFloor(r);
  MT.paint.telegraphs(r, this);
  this.drawOutside(r);
  this.drawWalls(r); this.drawDoors(r); this.drawSetProps(r); this.drawHazards(r); this.drawRoomExtras(r);
  MT.paint.pickups(r, this);
  for (const e of this.enemies) if (e.alive) MT.paint.enemy(r, e, this);
  if (this.boss && !this.boss.gone) MT.paint.boss(r, this.boss, this);
  for (const c of this.cs) MT.paint.contestant(r, c, this);
  MT.paint.bullets(r, this);
  if (this.rat.prime > 0) { const t = this.time; g.lights.add(184, 120, 30, 220, .15 + (Math.floor(t * 8) % 2) * .1, { color: ['#ff2e88', '#2ee6ff', '#ffcc33'][Math.floor(t * 4) % 3] }); }
};
