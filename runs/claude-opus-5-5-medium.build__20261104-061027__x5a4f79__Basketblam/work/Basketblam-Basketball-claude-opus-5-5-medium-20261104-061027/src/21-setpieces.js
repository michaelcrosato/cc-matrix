/* SET PIECES: the courts' own objects, drawn in code and depth sorted like props (a chain-link fence, a water tower, a
 * boombox, AC units; a beach umbrella, a lifeguard tower, surfboards; junk cars, tire stacks; tiki totems; pyro cannons,
 * TV cameras, the scorer's table and the Golden Blamboozle trophy), the Pier's Ferris wheel, the Scrapyard's crane, the
 * Caldera's glowing crater, and the Blam Dome's upper deck of fans. SHAPES.<id>(r, x, y, o) queues one. */
const SHAPES = {
  fence(r, x, y, o = {}) {
    const len = o.len || 200;
    r.queue(x, y, 0, g => {
      const [a0, b0] = r.w(x - len / 2, y, 0), [a1] = r.w(x + len / 2, y, 0), [, top] = r.w(x, y, 34);
      for (let k = Math.round(a0); k < a1; k += 3) for (let j = Math.round(top); j < b0; j += 3) if ((k + j) % 6 < 3) px.dot(g, k, j, '#7a8090');
      px.rect(g, Math.round(a0), Math.round(top), Math.round(a1 - a0), 2, '#a0a8b8');
      for (let k = Math.round(a0); k <= a1; k += 40) px.rect(g, k, Math.round(top), 2, Math.round(b0 - top), '#5a6070');
    }, { bias: -1 });
  },
  watertower(r, x, y) {
    r.queue(x, y, 0, g => {
      const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 60), [, ty2] = r.w(x, y, 100), t = E.tones('#6a4a3a');
      for (const dx of [-12, 12]) px.line(g, bx + dx, by, bx + dx * .6, ty, '#3a2a24', 2);
      px.line(g, bx - 12, by - 20, bx + 12, ty + 10, '#3a2a24', 1); px.line(g, bx + 12, by - 20, bx - 12, ty + 10, '#3a2a24', 1);
      px.rect(g, bx - 16, ty2, 32, ty - ty2, t.base); px.rect(g, bx - 16, ty2, 6, ty - ty2, t.sh); px.rect(g, bx + 10, ty2, 6, ty - ty2, t.lt);
      px.poly(g, [[bx - 19, ty2], [bx, ty2 - 14], [bx + 19, ty2]], '#4a3028');
      txt(g, 'NEON', bx, ty2 + 8, '#ff5ad8', 1, 'center', { outline: false });
    }, { bias: -2 });
  },
  boombox(r, x, y) {
    r.queue(x, y, 6, g => {
      const [bx, by] = r.w(x, y, 8), b = Math.sin(game.time * 12) > 0 ? 1 : 0;
      px.rect(g, bx - 9, by - 7, 18, 9, '#2a2a34'); px.rect(g, bx - 8, by - 6, 16, 7, '#3a3a4a'); px.rect(g, bx - 6, by - 10, 12, 2, '#5a5a6a');
      px.disc(g, bx - 4, by - 2, 2 + b, '#101014'); px.disc(g, bx + 4, by - 2, 2 + b, '#101014'); px.dot(g, bx, by - 4, '#ff3ca6');
    });
  },
  acunit(r, x, y) { r.queue(x, y, 0, g => { r.box(g, x - 8, y - 6, 0, x + 8, y + 6, 14, '#b8bcc8', '#8a8e9a'); const [bx, by] = r.w(x, y + 6, 7); px.disc(g, bx, by, 4, '#5a5e6a'); px.line(g, bx - 3, by, bx + 3, by, '#2a2e3a', 1); }); },
  umbrella(r, x, y, o = {}) {
    r.queue(x, y, 0, g => {
      const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 40), c = o.color || '#ff5a8a';
      px.line(g, bx, by, bx, ty, '#e0e0e0', 1);
      for (let k = 0; k < 6; k++) px.poly(g, [[bx, ty - 6], [bx - 22 + k * 7.3, ty + 4], [bx - 22 + (k + 1) * 7.3, ty + 4]], k % 2 ? '#ffffff' : c);
    });
  },
  lifeguard(r, x, y) {
    r.queue(x, y, 0, g => {
      const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 46);
      for (const dx of [-10, 10]) px.line(g, bx + dx, by, bx + dx * .7, ty, '#e8d8b0', 2);
      r.box(g, x - 12, y - 8, 46, x + 12, y + 8, 64, '#ff6a4a', '#c84a3a'); const [, ry] = r.w(x, y, 70); px.poly(g, [[bx - 16, ry + 4], [bx, ry - 6], [bx + 16, ry + 4]], '#ffffff');
      txt(g, 'LIFEGUARD', bx, by - 66, '#ffffff', 1, 'center', { font: 'tiny', outline: false });
    }, { bias: -2 });
  },
  surfboard(r, x, y, o = {}) { r.queue(x, y, 0, g => { const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 34); px.ell(g, bx, (by + ty) / 2, 4, (by - ty) / 2, o.color || '#2de2ff'); px.line(g, bx, ty + 3, bx, by - 3, '#ffffff', 1); }); },
  junkcar(r, x, y, o = {}) {
    const c = o.color || '#8a4a3a', t = E.tones(c);
    r.queue(x, y, 0, g => {
      r.box(g, x - 22, y - 9, 4, x + 22, y + 9, 16, t.lt, t.sh); r.box(g, x - 10, y - 8, 16, x + 12, y + 8, 26, t.base, t.deep);
      const [w1x, w1y] = r.w(x - 13, y + 9, 4), [w2x, w2y] = r.w(x + 13, y + 9, 4); px.disc(g, w1x, w1y, 4, '#1a1a1a'); px.disc(g, w2x, w2y, 4, '#1a1a1a');
      const [gx, gy] = r.w(x, y + 8, 22); px.rect(g, gx - 8, gy - 3, 16, 5, '#5a8aa0'); px.line(g, gx - 6, gy - 2, gx + 2, gy + 1, '#ffffff', 1);
    });
  },
  tires(r, x, y) { r.queue(x, y, 0, g => { for (let k = 0; k < 4; k++) { const [bx, by] = r.w(x, y, 4 + k * 7); px.ell(g, bx, by, 9, 4, '#1a1a1e'); px.ell(g, bx, by, 4, 2, '#3a3a3e'); } }); },
  totem(r, x, y) {
    r.queue(x, y, 0, g => {
      const cols = ['#8a4a2a', '#a05a2a', '#6a3a1a'];
      for (let k = 0; k < 3; k++) { const [bx, by] = r.w(x, y, k * 16); px.rect(g, bx - 7, by - 16, 14, 16, cols[k]); px.rect(g, bx - 4, by - 12, 3, 3, '#ffd23a'); px.rect(g, bx + 1, by - 12, 3, 3, '#ffd23a'); px.rect(g, bx - 4, by - 6, 8, 2, '#1a0a04'); }
      const [tx, ty] = r.w(x, y, 48); px.poly(g, [[tx - 12, ty], [tx, ty - 8], [tx + 12, ty]], '#3a8a3a');
    }, { bias: -1 });
  },
  pyro(r, x, y) {
    r.queue(x, y, 0, g => { r.box(g, x - 6, y - 6, 0, x + 6, y + 6, 16, '#4a4a54', '#2a2a34'); const [bx, by] = r.w(x, y, 16); px.rect(g, bx - 3, by - 6, 6, 6, '#1a1a20');
      if (FX.react.jump > .5) { px.blend(g, .8, 'add', () => { for (let k = 0; k < 6; k++) px.disc(g, bx + Math.sin(game.time * 30 + k) * 2, by - 10 - k * 8, 6 - k * .7, k < 3 ? '#ffe060' : '#ff5a1a'); }); L.add(x, y, 50, 120, .8, { color: '#ff9a3a' }); } }, { emissive: true });
  },
  tvcamera(r, x, y) {
    r.queue(x, y, 0, g => { const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 26); for (const dx of [-7, 0, 7]) px.line(g, bx, ty, bx + dx, by, '#2a2a30', 1);
      px.rect(g, bx - 8, ty - 7, 16, 8, '#1e1e26'); px.rect(g, bx + 6, ty - 6, 5, 6, '#3a3a46'); px.dot(g, bx - 6, ty - 6, Math.sin(game.time * 4) > 0 ? '#ff3a3a' : '#5a1a1a'); txt(g, 'BLAM', bx - 1, ty - 6, '#ffd23a', 1, 'center', { font: 'tiny', outline: false }); });
  },
  trophy(r, x, y) {
    r.queue(x, y, 0, g => { r.box(g, x - 6, y - 6, 0, x + 6, y + 6, 22, '#3a2a5a', '#2a1a40'); const [bx, by] = r.w(x, y, 22), sh = Math.sin(game.time * 3) > .7;
      px.rect(g, bx - 3, by - 6, 6, 6, '#c8a020'); px.disc(g, bx, by - 13, 7, '#ffd23a'); px.disc(g, bx - 2, by - 15, 3, '#fff0a0'); px.line(g, bx - 5, by - 13, bx + 5, by - 13, '#a07010', 1); if (sh) px.dot(g, bx + 3, by - 17, '#ffffff'); }, { emissive: true });
  }
};
// where each court puts them ([shape, x, y, opts])
const SETPIECES = {
  skybox: [['fence', XM, Y0 - 20, { len: 700 }], ['watertower', 60, 40], ['boombox', X0 - 34, Y0 - 8], ['acunit', X1 + 40, Y1 + 30], ['acunit', X0 - 40, Y1 + 30]],
  pier: [['umbrella', X0 - 40, Y1 + 30, { color: '#ff5a8a' }], ['umbrella', X1 + 40, Y1 + 34, { color: '#2de2ff' }], ['lifeguard', X1 + 44, Y0 + 40], ['surfboard', X0 - 40, Y0 + 30, { color: '#ffd23a' }], ['surfboard', X0 - 30, Y0 + 40, { color: '#ff7a5c' }]],
  scrapyard: [['junkcar', X0 - 40, Y1 + 34, { color: '#5a7a9a' }], ['junkcar', X1 + 44, Y0 + 60, { color: '#8a4a3a' }], ['tires', X1 + 40, Y1 + 30], ['tires', X0 - 44, Y0 + 70], ['fence', XM, Y0 - 20, { len: 700 }]],
  caldera: [['totem', X0 - 38, Y0 + 60], ['totem', X1 + 38, Y0 + 60], ['totem', XM - 120, Y1 + 34], ['totem', XM + 120, Y1 + 34]],
  dome: [['pyro', X0 - 30, Y0 - 10], ['pyro', X1 + 30, Y0 - 10], ['pyro', X0 - 30, Y1 + 20], ['pyro', X1 + 30, Y1 + 20], ['tvcamera', XM - 120, Y1 + 34], ['tvcamera', XM + 120, Y1 + 34], ['trophy', XM + 60, Y1 + 32]]
};
/** each court's objects, its silhouettes beyond the arena, and the Dome's upper deck */
function drawSetPieces(r, id, t, react) {
  for (const [s, x, y, o] of SETPIECES[id] || []) SHAPES[s](r, x, y, o);
  if (id === 'pier') r.queue(XM + 220, 2, 0, g => {   // the Ferris wheel turning beyond the boardwalk
    const [cx, cy] = r.w(XM + 220, 2, 110); for (let k = 0; k < 10; k++) { const a = t * .3 + k * TAU / 10, x = cx + Math.cos(a) * 40, y = cy + Math.sin(a) * 40; px.line(g, cx, cy, x, y, '#5a3a5a', 1); px.rect(g, x - 3, y, 6, 5, ['#ff5a8a', '#ffd23a', '#2de2ff'][k % 3]); }
    px.disc(g, cx, cy, 3, '#3a2a3a'); const [, by] = r.w(XM + 220, 2, 40); px.line(g, cx, cy, cx - 20, by, '#3a2a3a', 2); px.line(g, cx, cy, cx + 20, by, '#3a2a3a', 2);
  }, { bias: -5 });
  if (id === 'scrapyard') r.queue(X1 - 80, 2, 0, g => {   // the crane with its swinging magnet
    const [bx, by] = r.w(X1 - 80, 2, 60), [tx, ty] = r.w(X1 - 80, 2, 150), sw = Math.sin(t * .8) * 18;
    px.line(g, bx, by, tx, ty, '#c89a2a', 3); px.line(g, tx, ty, tx - 90, ty + 10, '#c89a2a', 3); px.line(g, tx - 70, ty + 8, tx - 70 + sw, ty + 50, '#2a2a2a', 1); px.rect(g, tx - 78 + sw, ty + 50, 16, 6, '#4a4a5a');
  }, { bias: -5 });
  if (id === 'caldera') { const [cx, cy] = [XM - 160, 2]; r.queue(cx, cy, 0, g => { const [x, y] = r.w(cx, cy, 120); px.blend(g, .7, 'add', () => { px.ddisc(g, x, y, 22 + Math.sin(t * 2) * 3, '#ff5a1a', .8); px.ddisc(g, x, y, 10, '#ffd060', .9); }); }, { emissive: true, bias: -5 }); if (S.fxRng() < .2) P.add({ kind: 'ember', x: XM - 160 + (S.fxRng() - .5) * 20, y: 2, z: 120, vz: 40, vx: (S.fxRng() - .5) * 20, life: 1.5 }); }
  if (get('court', id).upperDeck) {   // the Blam Dome's upper deck: a second ring of fans above the back wall, under the rafters
    r.queue(XM, 4, 64, g => {
      const [x0, y0] = r.w(0, 4, 64), [x1] = r.w(MAP_COLS * 16, 4, 64), rows = 3;
      for (let j = 0; j < rows; j++) { const y = Math.round(y0 - 14 - j * 11); px.rect(g, Math.round(x0), y + 4, Math.round(x1 - x0), 3, j % 2 ? '#2a2032' : '#3a2c44');
        for (let x = Math.round(x0) + (j % 2) * 4; x < x1; x += 8) { if (x < -8 || x > r.W + 8) continue; const h = E.hash2(x, j), up = react.jump > 0 ? Math.abs(Math.sin(t * 9 + h * 9)) * 3 * react.jump : Math.sin(t * 2 + h * 9) * .6; px.rect(g, x - 2, y - 2 - up, 4, 5, get('court', id).crowd[Math.floor(h * 60) % 6]); px.rect(g, x - 1, y - 5 - up, 3, 3, ['#e0b090', '#a87050', '#6a4028'][Math.floor(h * 30) % 3]); } }
      for (let k = 0; k < 6; k++) { const a = t * .7 + k, xx = r.W / 2 + Math.sin(a) * r.W * .45; px.blend(g, .15, 'add', () => px.line(g, xx, 0, xx + Math.cos(a) * 60, Math.round(y0), ['#ff3ca6', '#2de2ff', '#ffd23a'][k % 3], 2)); }
    }, { bias: -3 });
  }
}
