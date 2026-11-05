/* ---- THE GROUND, built from a recipe: a TileMap (16-unit cells) covering the boundary ellipse, the stands and the
 * surroundings; the floor painted by floorTex (mown stripes with grain, the square, the pitch with its creases and
 * footmarks, the rope, the surroundings), the stands as TileMap walls, the crowd as small figures queued in groups,
 * props as KERFUFFLE and engine shapes, and two painted far-end panoramas for the broadcast camera (whose low
 * orthographic view can't show the far stands the way a telephoto lens does). Sim coordinates (stumps at 0, 0) map to
 * the TileMap's world by + (OX, OY). ---- */
const hexRGB = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const OUT_TEX = { lane: '#7a6a4a', gravel: '#a8a090', sand: '#e8d4a0', dirt: '#b89868', track: '#3a3a4a' };
const Ground = {
  cache: {},
  get(id) { return this.cache[id] || (this.cache[id] = this.build(id)); },
  build(id) {
    const g = GROUNDS[id], M = 330, T16 = 16;
    const W = Math.ceil((2 * g.rx + 2 * M) / T16), H = Math.ceil((2 * g.ry + 2 * M) / T16), OX = W * 8, OY = H * 8 - G.MID_Y;
    const q = (x, y) => Math.sqrt((x / g.rx) ** 2 + ((y - G.MID_Y) / g.ry) ** 2);
    const rows = [], tiers = { village: [[1.2, 1.24, 'h']], terrace: [[1.16, 1.24, '1'], [1.24, 1.32, '2']], beach: [], bleachers: [[1.15, 1.22, '1'], [1.22, 1.29, '2'], [1.29, 1.36, '3']], dome: [[1.12, 1.2, '1'], [1.2, 1.28, '2'], [1.28, 1.36, '3'], [1.36, 1.6, '4']] }[g.stands] || [];
    for (let cy = 0; cy < H; cy++) {
      let s = '';
      for (let cx = 0; cx < W; cx++) {
        const x = cx * T16 + 8 - OX, y = cy * T16 + 8 - OY, qq = q(x, y);
        let ch = '.';
        if (g.seaSide && x * g.seaSide > g.rx * 1.1) ch = '~';
        for (const [a, b, c] of tiers) if (qq >= a && qq < b) {
          if (g.stands === 'village' && (Math.abs(x) < 70 || (y > 700 && Math.abs(x + 120) < 90) || Math.abs(x - 470) < 60)) continue;
          if (g.stands === 'terrace' && y > 600) continue;
          if (g.stands === 'bleachers' && Math.abs(x) < g.rx * .45) continue;
          if (g.stands === 'dome' && y > 900 && Math.abs(x) < 160) continue;
          ch = c;
        }
        s += ch;
      }
      rows.push(s);
    }
    const pal = g.pal, G1 = hexRGB(pal.g1), G2 = hexRGB(pal.g2), PI = hexRGB(pal.pitch), WO = hexRGB(pal.worn), OUTC = hexRGB(OUT_TEX[pal.outTag] || pal.out), ROPE = hexRGB(pal.rope), WHITE = [244, 242, 232];
    const floorTex = (mx, my, tag) => {
      const x = mx - OX, y = my - OY, n = E.hash2(Math.floor(mx), Math.floor(my)) - .5, m = E.noise2(mx * .05, my * .05) * .5;
      if (tag === 'water') { const w = E.noise2(mx * .03, my * .08 + 3) * .5 + .5, base = [42, 138, 208]; return [base[0] + w * 30 + n * 10, base[1] + w * 30 + n * 10, base[2] + w * 20]; }
      const qq = q(x, y), sc = T('boundaryScale');
      const rope = Math.abs(qq - sc) * Math.min(g.rx, g.ry);
      if (rope < 1.6) return ROPE.map(v => v + n * 14);
      if (rope < 2.6 && qq > sc) return [ROPE[0] * .35, ROPE[1] * .35, ROPE[2] * .35];
      if (qq > sc + .08) {
        if (g.pal.sand || pal.outTag === 'sand') { const s = hexRGB('#e8d4a0'); return [s[0] + n * 18 + m * 10, s[1] + n * 18 + m * 10, s[2] + n * 14]; }
        const k = clamp((qq - sc - .08) * 6, 0, 1), base = mixRGB(mixRGB(G1, G2, .5), OUTC, k);
        return [base[0] + n * 16 + m * 12, base[1] + n * 16 + m * 12, base[2] + n * 12];
      }
      // the pitch and its creases
      if (Math.abs(x) <= G.PITCH_HALF && y >= -20 && y <= 340) {
        const crease = (Math.abs(y - G.CREASE_S) < .8 && Math.abs(x) < 24) || (Math.abs(y - G.CREASE_B) < .8 && Math.abs(x) < 24) || (Math.abs(y - G.STUMPS_Y) < .8 && Math.abs(x) <= G.RETURN_X) || (Math.abs(y - G.BOWL_Y) < .8 && Math.abs(x) <= G.RETURN_X) || (Math.abs(Math.abs(x) - G.RETURN_X) < .8 && ((y > -8 && y < G.CREASE_S) || (y > G.CREASE_B && y < 328)));
        if (crease) return WHITE.map(v => v + n * 10);
        const endWear = Math.max(0, 1 - Math.min(Math.abs(y - G.CREASE_S), Math.abs(y - G.CREASE_B)) / 60), foot = (Math.abs(y - 296) < 14 && Math.abs(Math.abs(x) - 8) < 6) || (Math.abs(y - 28) < 10 && Math.abs(x - 6) < 5);
        const c = mixRGB(PI, WO, endWear * .7 + (foot ? .5 : 0)), crack = g.id === 'downs' && E.hash2(Math.floor(mx / 3), Math.floor(my / 5)) > .93 ? -26 : 0;
        return [c[0] + n * 14 + m * 8 + crack, c[1] + n * 14 + m * 8 + crack, c[2] + n * 10 + crack];
      }
      // the square: a lighter rectangle of old pitches
      const sq = Math.abs(x) < 70 && y > -40 && y < 360;
      // mown stripes (diagonal at the Hall)
      const sv = pal.diagonal ? (x + y) * .7 : x, k = Math.floor((sv + 2000) / 32) % 2;
      let c = k ? G1 : G2;
      if (sq) c = mixRGB(c, PI, .18);
      if (g.id === 'downs') c = mixRGB(c, [200, 170, 110], (E.noise2(mx * .01, my * .01) * .5 + .5) * .35);
      return [c[0] + n * 18 + m * 16, c[1] + n * 18 + m * 16, c[2] + n * 12 + m * 8];
    };
    const st = g.stands;
    const types = st === 'village' ? { h: { h: 12, top: '#3f7a32', side: '#2f5a26', face: 'hedge', roof: 'leaves' } }
      : st === 'terrace' ? { 1: { h: 8, top: '#c8bfa8', side: '#a89f88', face: 'stone', roof: 'slab', cut: true, cutH: 4 }, 2: { h: 16, top: '#c0b8a0', side: '#9a9280', face: 'stone', roof: 'slab', cut: true, cutH: 6 } }
      : st === 'bleachers' ? { 1: { h: 10, top: '#c8ccd8', side: '#8a8ea0', face: 'plank', roof: 'plain', cut: true, cutH: 4 }, 2: { h: 20, top: '#b8bcc8', side: '#7a7e90', face: 'plank', roof: 'plain', cut: true, cutH: 6 }, 3: { h: 30, top: '#a8acb8', side: '#6a6e80', face: 'plank', roof: 'plain', cut: true, cutH: 8 } }
      : st === 'dome' ? { 1: { h: 24, top: '#3a3450', side: '#2a2440', face: 'none', roof: 'plain', cut: true, cutH: 6 }, 2: { h: 48, top: '#342e4a', side: '#262038', face: 'none', roof: 'plain', cut: true, cutH: 8 }, 3: { h: 72, top: '#2e2844', side: '#221c34', face: 'none', roof: 'plain', cut: true, cutH: 10 }, 4: { h: 96, top: '#28223e', side: '#1c1830', face: 'none', roof: 'plain', cut: true, cutH: 12 } } : {};
    const leg2 = { '.': { floor: 'grass' }, '~': { floor: 'water', block: true } }; for (const k in types) leg2[k] = { tile: k === 'h' ? 9 : +k, floor: 'grass' };
    const types2 = {}; for (const k in types) types2[k === 'h' ? 9 : +k] = types[k];
    const map = new E.TileMap({ rows, legend: leg2, types: types2, floorTex, outside: OUT_TEX[pal.outTag] || pal.out, ao: 3, chunks: true });
    // the crowd: figures on the tiers (or on blankets and deck chairs round a village rope), in groups for drawing
    const crowd = [], rnd = E.rng(id.length * 977 + 3), shirts = [pal.accent, pal.accent2, '#e8e0d0', '#d84a3a', '#3a6ad8', '#e8c040', '#5aa04a', '#f0a0c0', '#8a5ad0'];
    const tierZ = { 1: (types[1] || {}).h, 2: (types[2] || {}).h, 3: (types[3] || {}).h, 4: (types[4] || {}).h };
    if (st === 'village' || st === 'beach') {
      for (let i = 0; i < (st === 'beach' ? 160 : 140); i++) {
        const a = rnd() * TAU, qq = 1.06 + rnd() * .1, x = Math.cos(a) * g.rx * qq, y = G.MID_Y + Math.sin(a) * g.ry * qq;
        if (Math.abs(x) < 60 && y < 0) continue; if (g.seaSide && x * g.seaSide > g.rx * .9) continue;
        crowd.push({ x, y, z: 0, shirt: shirts[Math.floor(rnd() * shirts.length)], skin: SKINS[Math.floor(rnd() * 5)], hat: rnd() < .3 ? (rnd() < .5 ? '#f4f0e0' : '#d8b04a') : null, ph: rnd() * 9, sit: rnd() < .55 });
      }
    } else {
      for (let cy = 0; cy < H; cy += 1) for (let cx = 0; cx < W; cx += 1) {
        const ch = rows[cy][cx]; if (!/[1-4]/.test(ch)) continue;
        if (rnd() > (st === 'dome' ? .55 : .65)) continue;
        const x = cx * T16 + 4 + rnd() * 8 - OX, y = cy * T16 + 4 + rnd() * 8 - OY;
        crowd.push({ x, y, z: tierZ[ch] || 0, shirt: shirts[Math.floor(rnd() * shirts.length)], skin: SKINS[Math.floor(rnd() * 6)], hat: rnd() < .2 ? '#f4f0e0' : null, ph: rnd() * 9, sit: false });
      }
    }
    crowd.sort((a, b) => a.y - b.y);
    const groups = []; for (let i = 0; i < crowd.length; i += 10) { const gp = crowd.slice(i, i + 10); groups.push({ list: gp, x: gp.reduce((s, c) => s + c.x, 0) / gp.length, y: gp.reduce((s, c) => s + c.y, 0) / gp.length, z: 0, scatter: 0 }); }
    const B = { id, recipe: g, map, OX, OY, W, H, crowd, groups, panos: {} };
    return B;
  },
  /** the far-end panorama for the broadcast camera: sky, far scenery, stands and crowd, the sight screen behind the batter
   *  and the scoreboard (numbers drawn live on top). Painted once per ground and end */
  pano(B, end, night) {
    const key = end + (night ? 'n' : 'd'); if (B.panos[key]) return B.panos[key];
    const g = B.recipe, pal = g.pal, Wd = 960, Ht = 170, c = E.mkCanvas(Wd, Ht);
    const x = E.ctx2d(c); if (!x) return null; x.imageSmoothingEnabled = false;
    const sky = night ? ['#05050f', '#0e0c26', '#1a1440'] : pal.sky, base = Ht - 1, rnd = E.rng(end.length * 31 + g.id.length);
    for (let y = 0; y < Ht; y++) { const t = y / Ht, col = t < .5 ? E.mix(sky[0], sky[1], t * 2) : E.mix(sky[1], sky[2], (t - .5) * 2); px.rect(x, 0, y, Wd, 1, col); }
    if (night) { for (let i = 0; i < 90; i++) px.dot(x, Math.floor(rnd() * Wd), Math.floor(rnd() * 90), rnd() < .3 ? '#ffffff' : '#a8a8d0'); px.disc(x, 780, 30, 9, '#f0ecd8'); px.disc(x, 784, 27, 8, sky[0]); }
    else { for (let i = 0; i < 7; i++) { const cx0 = rnd() * Wd, cy0 = 12 + rnd() * 40; for (let k = 0; k < 5; k++) px.disc(x, cx0 + k * 9 - 18, cy0 + Math.sin(k) * 3, 7 + rnd() * 5, k % 2 ? '#ffffff' : '#f4f6ff'); } }
    // far scenery
    const far = base - 70;
    if (g.id === 'bay') { px.rect(x, 0, far + 8, Wd, 26, '#2a8ad0'); for (let i = 0; i < 60; i++) px.rect(x, Math.floor(rnd() * Wd), far + 10 + Math.floor(rnd() * 20), 6, 1, '#7fd0ff'); }
    else if (g.id === 'dome') { for (let i = 0; i < 40; i++) { const bx = i * 26 + rnd() * 8, bh = 20 + rnd() * 40; px.rect(x, bx, far + 34 - bh, 20, bh, '#141030'); for (let k = 0; k < 6; k++) if (rnd() < .5) px.dot(x, bx + 3 + Math.floor(rnd() * 14), far + 36 - Math.floor(rnd() * bh), '#ffcf3a'); } }
    else { const hc = g.id === 'downs' ? ['#c8a070', '#b08858'] : g.id === 'hall' ? ['#7a9a7a', '#6a8a6a'] : ['#7aaa6a', '#6a9a5a']; for (let xx = 0; xx < Wd; xx++) { const h1 = 22 + Math.sin(xx * .012 + end.length) * 10 + Math.sin(xx * .041) * 4, h2 = 12 + Math.sin(xx * .02 + 2) * 8; px.rect(x, xx, far + 30 - h1, 1, h1, night ? '#1a2030' : hc[0]); px.rect(x, xx, far + 34 - h2, 1, h2, night ? '#141a28' : hc[1]); } }
    // the near stands / boundary scenery band
    const band = base - 40;
    const stand = (x0, w, h, col) => { px.rect(x, x0, band - h, w, h + 40, col); for (let yy = band - h + 2; yy < band + 14; yy += 4) for (let xx = x0 + 1; xx < x0 + w - 1; xx += 3) if (rnd() < .8) { const sc = ['#d84a3a', '#3a6ad8', '#e8c040', '#f0f0e8', '#5aa04a', pal.accent][Math.floor(rnd() * 6)]; px.rect(x, xx, yy, 2, 2, sc); px.dot(x, xx, yy - 1, '#e0b090'); } };
    if (g.stands === 'dome') { stand(0, Wd, 46, '#2a2440'); px.rect(x, 0, band - 50, Wd, 4, pal.accent); }
    else if (g.stands === 'bleachers') { stand(40, 340, 26, '#8a8ea0'); stand(580, 340, 26, '#8a8ea0'); }
    else if (g.stands === 'terrace') { stand(60, 320, 16, '#b8b0a0'); stand(580, 320, 16, '#b8b0a0'); }
    // a building behind the sight screen
    const mid = Wd / 2;
    if (g.id === 'green') { const b = end === 'S' ? { w: 150, h: 40, c: '#efe4c8', r: '#8a3a2a' } : { w: 110, h: 36, c: '#e8e0d0', r: '#6a3a2a' }; px.rect(x, mid + 90, band - b.h, b.w, b.h + 30, b.c); px.poly(x, [[mid + 84, band - b.h], [mid + 96 + b.w, band - b.h], [mid + 90 + b.w / 2, band - b.h - 20]], b.r); for (let i = 0; i < 4; i++) px.rect(x, mid + 100 + i * 32, band - b.h + 10, 14, 12, '#9fd8f0'); for (let i = 0; i < 5; i++) { const tx = 40 + i * 120 + rnd() * 30; px.disc(x, tx, band - 26, 18, '#3f8a3a'); px.disc(x, tx + 8, band - 34, 14, '#5aa04a'); px.rect(x, tx - 2, band - 12, 5, 14, '#5a3a22'); } px.rect(x, mid - 260, band - 10, 220, 10, '#3f7a32'); }
    if (g.id === 'hall') { px.rect(x, mid - 200, band - 70, 400, 74, '#c8b890'); for (let i = 0; i < 9; i++) px.rect(x, mid - 186 + i * 44, band - 56, 14, 26, '#3a5a7a'); px.rect(x, mid - 204, band - 76, 408, 6, '#6a6a7a'); }
    if (g.id === 'bay') { for (let i = 0; i < 6; i++) { const hx = 60 + i * 34; px.rect(x, hx, band - 22, 26, 26, ['#d83a3a', '#3a7ad8', '#1fb5a8', '#ffd23a'][i % 4]); px.poly(x, [[hx - 2, band - 22], [hx + 28, band - 22], [hx + 13, band - 32]], '#8a2a2a'); } for (let i = 0; i < 4; i++) { const tx = 700 + i * 60; px.rect(x, tx, band - 40, 3, 40, '#8a6a3a'); px.disc(x, tx + 1, band - 42, 12, '#3a9a4a'); } }
    if (g.id === 'downs') { px.rect(x, 120, band - 50, 90, 50, '#5a2a7a'); px.poly(x, [[110, band - 50], [220, band - 50], [165, band - 76]], '#c8ccd8'); px.rect(x, 760, band - 60, 8, 60, '#6a4a2a'); px.rect(x, 790, band - 60, 8, 60, '#6a4a2a'); px.rect(x, 750, band - 88, 56, 30, '#8a6a3a'); }
    // the sight screen behind the batter, the scoreboard to one side, and the boundary boards
    px.rect(x, mid - 46, band - 30, 92, 44, '#f4f2ea'); px.rect(x, mid - 46, band - 30, 92, 2, '#ffffff'); px.rect(x, mid - 46, band + 14, 92, 2, '#8a8a80');
    for (let i = 0; i < 4; i++) px.rect(x, mid - 42 + i * 28, band + 14, 2, 10, '#5a5a60');
    px.rect(x, mid - 240, band - 46, 110, 40, night ? '#141020' : '#1a2a1a'); px.rect(x, mid - 242, band - 48, 114, 3, pal.accent);
    const ads = ["CRUMB'S CAKES", 'LEANING WICKET ALES', 'THRUMPTON HOLDINGS', 'KERFUFFLE TEAS'];
    for (let i = 0; i < 8; i++) { const ax = i * 120 + (end === 'S' ? 0 : 60) - 30, col = [pal.accent, '#f4f0e0', pal.accent2, '#2a2a3a'][i % 4]; px.rect(x, ax, base - 12, 118, 12, col); E.font.text(x, ads[i % 4], ax + 59, base - 10, col === '#f4f0e0' ? '#2a2a3a' : '#ffffff', { align: 'center', font: 'tiny' }); }
    // the grass from the boards down to the bottom edge
    px.rect(x, 0, base - 1, Wd, 2, mixRGB(hexRGB(pal.g1), hexRGB(pal.g2), .5).map(v => Math.round(v)).reduce((s, v) => s + v.toString(16).padStart(2, '0'), '#'));
    const P = { cv: c, w: Wd, h: Ht, board: [mid - 240, band - 46, 110, 40] };
    B.panos[key] = P; return P;
  }
};
K.Ground = Ground;
/** a recipe's prop: engine props (palm, cactus) by r.prop, everything else a shape */
K.drawProp = (r, id, x, y, f) => { if (id === 'palm' || id === 'cactus') r.prop(id, x, y, 0, { size: 1.6 }); else r.shape(id, x, y, 0, { facing: f }); };
