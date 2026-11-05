// ---------------------------------------------------------------- the sets: floors, walls, doors, outside dressing, the jumbotron, lights
MT.sets = (() => {
  const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixc = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  const n2 = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
  // the logo decal: "MASH TV" rasterized once, sampled by the studio floor
  let logoData = null;
  function logo() {
    if (logoData !== null) return logoData;
    logoData = false;
    try {
      if (typeof document === 'undefined') return false;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 40; const g = cv.getContext('2d');
      E.font.title(g, 'MASH TV', 80, 6, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'], outline: '#1a0a24', depth: 0 });
      logoData = { w: 160, h: 40, d: g.getImageData(0, 0, 160, 40).data };
    } catch (e) { logoData = false; }
    return logoData;
  }
  const C = {
    studioA: hx('#1c0f2c'), studioB: hx('#24143a'), gloss: hx('#3a2458'), mag: hx('#ff2e88'), gold: hx('#ffcc33'),
    conA: hx('#5a5a62'), conB: hx('#4e4e58'), yel: hx('#e8c020'), scuff: hx('#3a3a42'),
    slA: hx('#262a36'), slB: hx('#2e3240'), carpet: hx('#8a1020'), carpetHi: hx('#b02030'),
    grA: hx('#0e4a32'), grB: hx('#12583a'), grGold: hx('#c8a040')
  };
  function studioFloor(x, y) {
    const tx = Math.floor(x / 16), ty = Math.floor(y / 16), lx = x - tx * 16, ly = y - ty * 16;
    let c = (tx + ty) & 1 ? C.studioA : C.studioB;
    if (lx < 1 || ly < 1) c = mixc(c, C.mag, .25);
    if ((tx % 4 === 0 && lx < 1.2) || (ty % 4 === 0 && ly < 1.2)) c = mixc(c, C.gold, .45);
    if (ly > 10 && ly < 13 && lx > 2 && lx < 12) c = mixc(c, C.gloss, .5);   // the gloss
    const L = logo();
    if (L && Math.abs(x - 184) < 80 && Math.abs(y - 120) < 20) {
      const u = Math.floor(x - 104), v = Math.floor((y - 100) * 2);
      if (u >= 0 && u < L.w && v >= 0 && v < L.h) { const i = (v * L.w + u) * 4; if (L.d[i + 3] > 100) c = mixc(c, [L.d[i], L.d[i + 1], L.d[i + 2]], .55); }
    }
    if (Math.abs(Math.hypot(x - 184, y - 120) - 46) < 1) c = mixc(c, C.gold, .4);
    return c;
  }
  function warehouseFloor(x, y) {
    let c = n2(Math.floor(x / 3), Math.floor(y / 3)) < .5 ? C.conA : C.conB;
    if (n2(Math.floor(x / 9), Math.floor(y / 7)) > .93) c = mixc(c, C.scuff, .6);
    if (Math.abs(x - 44) < 1.5 || Math.abs(x - 324) < 1.5 || Math.abs(y - 36) < 1.5 || Math.abs(y - 204) < 1.5) c = C.yel;
    if ((x % 64) < 1 || (y % 64) < 1) c = mixc(c, hx('#333338'), .5);
    return c;
  }
  function rooftopFloor(x, y) {
    const tx = Math.floor(x / 12), ty = Math.floor(y / 8), lx = x % 12, ly = y % 8;
    let c = ((tx + ty * 3) % 3) ? C.slA : C.slB; if (lx < .8 || ly < .8) c = mixc(c, hx('#10121a'), .6);
    if (Math.abs(x - 184) < 22) { c = n2(Math.floor(x / 2), Math.floor(y / 2)) < .5 ? C.carpet : C.carpetHi; if (Math.abs(x - 184) > 20) c = C.gold; }
    const d = Math.hypot(x - 184, y - 120); if (Math.abs(d - 40) < 1.6) c = C.gold;
    if (d < 40 && Math.abs(x - 184) < 22 && Math.abs(y - 120) < 14 && (Math.abs(x - 184) < 2 || (Math.abs(y - 120) > 11))) c = mixc(c, C.gold, .7);
    return c;
  }
  function greenFloor(x, y) {
    const k = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1); let c = k ? C.grA : C.grB;
    const lx = x % 16, ly = y % 16; if (Math.abs(lx - 8) + Math.abs(ly - 8) < 1.5) c = C.grGold;
    return c;
  }
  const SETS = {
    studio: { name: 'STUDIO 9', floor: studioFloor, wall: { h: 26, top: '#ffcc33', side: '#4a1a5c', face: '#5a1e6c cloth', roof: 'plain', cut: true },
      ambient: .55, outside: '#140a24', sky: null, lightCols: ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a7aff'], bulbs: '#ffcc33', shutter: ['#c8a040', '#7a5a20'] },
    warehouse: { name: 'MEGAMART PRIZE WAREHOUSE', floor: warehouseFloor, wall: { h: 26, top: '#9aa0aa', side: '#5a606a', face: '#7a808c planks', roof: 'plain', cut: true },
      ambient: .6, outside: '#16161c', lightCols: ['#d8f0ff', '#d8f0ff', '#ffb040', '#d8f0ff'], bulbs: '#ffb040', shutter: ['#8a8f9a', '#4a4f5a'] },
    rooftop: { name: 'THE ROOFTOP GALA', floor: rooftopFloor, wall: { h: 14, top: '#ffcc33', side: '#2a4a6a', face: '#3a6a8a glaze', roof: 'plain', cut: true },
      ambient: .4, outside: '#0a0c1a', lightCols: ['#ffd890', '#ffd890', '#90e0ff', '#ffd890'], bulbs: '#ffe0a0', shutter: ['#b89a50', '#5a4a28'] },
    greenroom: { name: 'THE GREEN ROOM', floor: greenFloor, wall: { h: 26, top: '#c8a040', side: '#4a2a14', face: '#6a3a1a planks', roof: 'plain', cut: true },
      ambient: .6, outside: '#120a06', lightCols: ['#ffcf80', '#ffcf80', '#ffcf80', '#ffcf80'], bulbs: '#ffcf80', shutter: ['#8a6030', '#4a3018'] }
  };
  // audience sprites: head and shoulders, recolored per seat
  const AUD = [
    ['..hh..', '.hhhh.', '.ssss.', '.s..s.', '..ss..', 'cccccc', 'cccccc'],
    ['.hhhh.', 'hhhhhh', '.ssss.', '.s..s.', '..ss..', 'cccccc', 'cccccc'],
    ['......', '..hh..', '.hssh.', '.s..s.', '..ss..', '.cccc.', 'cccccc'],
    ['h....h', '.hhhh.', '.ssss.', '.s..s.', '..ss..', 'cccccc', 'cccccc']
  ];
  const AUDPAL = [['#3a2a1a', '#f0c8a0', '#e8443a'], ['#e8d060', '#d8a880', '#3b82f6'], ['#1a1a1a', '#8a5a3a', '#22c55e'], ['#c84a2a', '#f0d0b0', '#ff2e88'],
    ['#6a6a6a', '#e0b090', '#9a7aff'], ['#2a1a0a', '#6a4028', '#ffcc33'], ['#f0f0f0', '#f0c8a0', '#2ee6ff'], ['#4a2a6a', '#d8a880', '#f5b700']];
  let audSpr = null;
  const audience = () => audSpr || (audSpr = AUDPAL.map((p, i) => E.sprite(AUD[i % AUD.length], { h: p[0], s: p[1], c: p[2] })));
  const SIGNS = ['MASH!', 'KA-CHING!', 'HI MOM', '$$$', 'LANCE!'];

  // ---------------------------------------------------------------- per-frame dressing
  function seats(side) {   // audience seat positions on a bleacher block
    const out = [];
    for (let row = 0; row < 4; row++) for (let k = 0; k < 12; k++) {
      const x = side === 'W' ? -24 - row * 22 : 392 + row * 22, y = 18 + k * 18 + (row & 1) * 9;
      out.push([x, y, 6 + row * 8, (row * 12 + k) % 8, row, k]);
    }
    return out;
  }
  const SEATS = { W: seats('W'), E: seats('E') };
  const FRONT = Array.from({ length: 14 }, (_, k) => [30 + k * 24, 262 + (k & 1) * 4, 2, (k * 3) % 8, 0, k]);
  function drawBleachers(r, W, set) {
    const shade = E.tones(set === 'warehouse' ? '#4a4a52' : set === 'rooftop' ? '#2a2a40' : '#3a1a4a');
    for (const side of ['W', 'E']) {
      for (let row = 0; row < 4; row++) {
        const x0 = side === 'W' ? -34 - row * 22 : 382 + row * 22;
        r.queue(x0 + 10, 120, 0, g => r.box(g, x0, 6, 0, x0 + 20, 234, 4 + row * 8, shade.lt, shade.sh), { bias: -2 });
      }
    }
    const R = W ? W.ratings.R : 30, prime = W && W.ratings.prime > 0, t = MT.game ? MT.game.time : 0, spr = audience();
    for (const side of ['W', 'E']) for (const s of SEATS[side]) {
      let bob = Math.abs(Math.sin(t * (2 + R / 20) + s[5] * .7 + s[4])) * (1 + R / 25);
      if (prime) bob = Math.max(0, Math.sin(t * 6 - s[5] * .5)) * 6;
      const z = s[2] + 2 + bob;
      r.sprite(s[0], s[1], z, spr[s[3]], { outline: false });
      if ((s[5] + s[4]) % 9 === 0 && R > 40) r.queue(s[0], s[1], z + 9, g => { const p = r.w(s[0], s[1], z + 12); const txt = SIGNS[(s[5] + s[4]) % SIGNS.length]; const w = E.font.width(txt); px.rect(g, p[0] - w / 2 - 2, p[1] - 4, w + 4, 9, '#fff7e8'); E.font.text(g, txt, p[0] - w / 2, p[1] - 3, '#1a0a24', { outline: false }); });
    }
    for (const s of FRONT) {
      const bob = Math.abs(Math.sin(t * (2 + R / 20) + s[5])) * (1 + R / 30);
      r.sprite(s[0], s[1], s[2] + bob, spr[s[3]], { outline: false });
    }
  }
  function drawCranes(r, set) {
    const tn = MT.game ? MT.game.time : 0, mt = E.tones('#3a3a48'), rd = E.tones('#c8d0e0');
    for (const [x, y] of [[54, 272], [314, 272]]) {
      r.queue(x, y, 0, g => {
        r.box(g, x - 10, y - 4, 0, x + 10, y + 4, 6, mt.lt, mt.sh);
        const a = Math.sin(tn * .4 + x) * .4, top = r.w(x, y, 40), arm = r.w(x + Math.cos(a) * 30, y - 20 + Math.sin(a) * 8, 52), base = r.w(x, y, 6);
        px.line(g, base[0], base[1], top[0], top[1], mt.base, 2); px.line(g, top[0], top[1], arm[0], arm[1], rd.base, 2);
        px.rect(g, arm[0] - 4, arm[1] - 3, 8, 6, '#1a1a22'); px.disc(g, arm[0] + 4, arm[1], 2, '#2ee6ff'); px.dot(g, arm[0] - 3, arm[1] - 4, '#ff3344');
      });
    }
    // the ON AIR and APPLAUSE signs at the front
    r.queue(184, 290, 0, g => {
      const p = r.w(184, 290, 30), W = MT.W, on = W && (W.ratings.applause > 0 || W.ratings.prime > 0) && Math.floor(tn * 6) % 2 === 0;
      px.rect(g, p[0] - 70, p[1] - 6, 46, 12, '#1a0a14'); E.font.text(g, 'ON AIR', p[0] - 64, p[1] - 3, Math.floor(tn * 2) % 2 ? '#ff3344' : '#7a1a22', { outline: false });
      px.rect(g, p[0] + 22, p[1] - 6, 56, 12, '#1a0a14'); E.font.text(g, 'APPLAUSE', p[0] + 26, p[1] - 3, on ? '#ffcc33' : '#5a4a20', { outline: false });
    });
  }
  function drawSkyline(r) {
    const tn = MT.game ? MT.game.time : 0;
    r.queue(184, -60, 0, g => {
      for (let i = 0; i < 30; i++) {
        const x = -150 + i * 23, h = 40 + ((i * 37) % 7) * 14, base = r.w(x, -70, 0), top = r.w(x, -70, h);
        px.rect(g, base[0] - 9, top[1], 18, base[1] - top[1], '#0e1226');
        for (let k = 0; k < h / 8; k++) for (let j = 0; j < 3; j++) if (((i * 7 + k * 3 + j) % 5) < 2) px.dot(g, base[0] - 6 + j * 5, top[1] + 3 + k * 6, (i + k) % 3 ? '#ffd890' : '#7ae0ff');
      }
    }, { bias: -40 });
    // fireworks every few seconds
    const k = Math.floor(tn / 2.6), u = (tn % 2.6) / 2.6;
    if (u < .6) {
      const fx = 40 + (k * 97) % 290, fz = 110 + (k * 31) % 40;
      r.queue(fx, -80, fz, g => {
        const p = r.w(fx, -80, fz), rad = u * 34, col = ['#ff2e88', '#ffcc33', '#2ee6ff', '#9aff6a'][k % 4];
        for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; px.dot(g, p[0] + Math.cos(an) * rad, p[1] + Math.sin(an) * rad * .8 + u * u * 10, col); }
      }, { emissive: true, bias: -30 });
      if (u < .15 && MT.game) MT.game.lights.add(fx, 0, fz, 120, .3, { color: '#ffd0a0' });
    }
  }
  function drawWarehouseRacks(r) {
    const mt = E.tones('#4a5a7a'), pr = ['#e8e8f0', '#3a3a48', '#c84a2a', '#3b82f6'];
    for (const y of [-28, -52]) for (let i = 0; i < 6; i++) {
      const x = 24 + i * 64;
      r.queue(x, y, 0, g => {
        r.box(g, x - 28, y - 6, 0, x + 28, y + 6, 4, mt.lt, mt.sh); r.box(g, x - 28, y - 6, 24, x + 28, y + 6, 27, mt.lt, mt.sh);
        for (let j = 0; j < 3; j++) { const c = E.tones(pr[(i + j) % 4]); r.box(g, x - 24 + j * 17, y - 4, 4, x - 12 + j * 17, y + 4, 18, c.lt, c.sh); }
      });
    }
  }
  function drawJumbotron(r, W) {
    const x0 = 124, x1 = 244, y = -40, z0 = 50, z1 = 112;
    r.queue(184, y, z0, g => {
      const a = r.w(x0, y, z1), b = r.w(x1, y, z0), w = b[0] - a[0], h = b[1] - a[1];
      if (w < 8 || h < 8) return;
      px.rect(g, a[0] - 3, a[1] - 3, w + 6, h + 6, '#2a2a36'); px.rect(g, a[0] - 2, a[1] - 2, w + 4, h + 4, '#0a0a10');
      MT.jumbo.drawScreen(g, a[0], a[1], w, h, W);
      const tn = MT.game ? MT.game.time : 0;
      for (let i = 0; i < 24; i++) { const on = (i + Math.floor(tn * 8)) % 4 === 0; const t = i / 24; px.dot(g, a[0] - 2 + t * (w + 4), a[1] - 4, on ? '#ffcc33' : '#6a5020'); px.dot(g, a[0] - 2 + t * (w + 4), b[1] + 3, on ? '#ffcc33' : '#6a5020'); }
    }, { emissive: true });
    // the truss and lamps
    r.queue(184, -14, 40, g => { const a = r.w(-20, -14, 44), b = r.w(388, -14, 44); px.line(g, a[0], a[1], b[0], b[1], '#5a5a6a', 2); for (let i = 0; i < 10; i++) { const p = r.w(-20 + i * 45, -14, 44); px.rect(g, p[0] - 2, p[1], 5, 4, '#2a2a36'); } });
  }
  function drawMarquee(r, set) {   // chasing bulbs along the wall tops
    const s = SETS[set], tn = MT.game ? MT.game.time : 0, h = s.wall.h + .5, k = Math.floor(tn * 10);
    r.queue(184, 2, h, g => {
      for (let i = 0; i <= 46; i++) { const x = 4 + i * 7.83; if (x > 158 && x < 210) continue; const p = r.w(x, 2, h); px.dot(g, p[0], p[1], (i + k) % 3 === 0 ? s.bulbs : '#4a3a20'); }
    }, { emissive: true, bias: 1 });
    for (const xs of [2, 366]) r.queue(xs, 120, h, g => {
      for (let i = 0; i <= 30; i++) { const y = 4 + i * 7.8; if (y > 94 && y < 146) continue; const p = r.w(xs, y, h); px.dot(g, p[0], p[1], (i + k) % 3 === 0 ? s.bulbs : '#4a3a20'); }
    }, { emissive: true, bias: 1 });
  }
  function lights(r, set, W) {
    const s = SETS[set], L = MT.game.lights, tn = MT.game.time;
    for (let i = 0; i < 4; i++) {
      const a = tn * .35 + i * Math.PI / 2, x = 184 + Math.cos(a) * 110, y = 120 + Math.sin(a * 1.3) * 60;
      L.add(x, y, 0, 90, set === 'rooftop' ? .45 : .5, { color: s.lightCols[i] });
    }
    if (set === 'rooftop') { const a = Math.sin(tn * .5) * .8; L.add(184 + Math.sin(a) * 150, 60 + Math.cos(a) * 40, 0, 70, .5, { color: '#c0e8ff' }); }
    if (W && W.ratings.prime > 0 && !(MT.game.settings.reduceMotion) && Math.floor(tn * 8) % 2 === 0 && MT.game.settings.flashes !== false) L.add(184, 120, 0, 260, .25, { color: '#ffffff' });
  }
  function outside(r, set, W) {
    if (set === 'greenroom') {   // panelling, framed headshots of Lance, sofas
      for (const x of [60, 150, 230, 310]) r.queue(x, -2, 0, g => { const p = r.w(x, -2, 40); px.rect(g, p[0] - 10, p[1] - 8, 20, 16, '#c8a040'); px.rect(g, p[0] - 8, p[1] - 6, 16, 12, '#2a1a3a'); if (MT.cast && MT.cast.lance && !MT.cfg.skipRigs) MT.cast.lance.drawPortrait(g, p[0] - 7, p[1] - 6, 12, { zoom: 3 }); });
      return;
    }
    drawBleachers(r, W, set); drawCranes(r, set); drawJumbotron(r, W);
    if (set === 'rooftop') drawSkyline(r);
    if (set === 'warehouse') drawWarehouseRacks(r);
  }
  return { SETS, outside, lights, drawMarquee, get: id => SETS[id] || SETS.studio, audience };
})();

// ---------------------------------------------------------------- the jumbotron's screen (also drawn small in the lower third)
MT.jumbo = {
  drawScreen(g, x, y, w, h, W) {
    const tn = MT.game ? MT.game.time : 0, L = MT.lines && MT.lines.current;
    px.rect(g, x, y, w, h, '#0c0618');
    if (L && L.speaker && MT.cast && MT.cast.portraitOf(L.speaker) && !MT.cfg.skipRigs) {
      const rig = MT.cast.portraitOf(L.speaker), sz = Math.min(w, h) - 4;
      rig.drawPortrait(g, Math.round(x + (w - sz) / 2), Math.round(y + 2), sz, { zoom: 2.6, bg: '#2a1446' });
      E.font.text(g, MT.TEXT.speakers[L.speaker] || L.speaker, x + 3, y + h - 9, '#ffcc33', { outline: false, shadow: '#000' });
    } else if (W && W.jumboClock !== undefined && W.jumboClock !== null) {
      E.font.text(g, MT.fmtTime(W.jumboClock), x + w / 2, y + h / 2 - 7, '#ff3344', { align: 'center', scale: 2, outline: false });
    } else {
      const k = Math.floor(tn / 4) % 3;
      if (k === 0) MT.drawLogo(g, x + w / 2, y + h / 2 - 12, Math.max(1, Math.floor(w / 80)), true);
      else if (k === 1 && W) { E.font.text(g, 'RATINGS', x + w / 2, y + 6, '#2ee6ff', { align: 'center', outline: false }); E.font.text(g, String(Math.round(W.ratings.R)), x + w / 2, y + h / 2 - 4, '#ffcc33', { align: 'center', scale: 2, outline: false }); }
      else { const sp = MT.TEXT.sponsors[Math.floor(tn / 12) % MT.TEXT.sponsors.length]; E.font.text(g, sp[0], x + w / 2, y + h / 2 - 10, '#ff2e88', { align: 'center', scale: 2, outline: false }); E.font.text(g, sp[1].slice(0, 26), x + w / 2, y + h / 2 + 8, '#fff7e8', { align: 'center', font: 'tiny', outline: false }); }
    }
    for (let yy = y; yy < y + h; yy += 2) px.blend(g, .25, 'multiply', () => px.rect(g, x, yy, w, 1, '#404040'));
  }
};

// ---------------------------------------------------------------- the MASH TV logo: a CRT with bunny ears, the title in a magenta-to-gold gradient
MT.drawLogo = (g, cx, y, scale = 3, small = false) => {
  const s = scale, F = E.font, tn = MT.game ? MT.game.real : 0;
  if (!small) {
    const w = 64 * s, h = 30 * s, x = Math.round(cx - w / 2), yy = Math.round(y - 6 * s);
    px.line(g, cx - 4 * s, yy, cx - 16 * s, yy - 14 * s, '#c8d0e0', Math.max(1, s / 2)); px.line(g, cx + 4 * s, yy, cx + 14 * s, yy - 16 * s, '#c8d0e0', Math.max(1, s / 2));
    px.disc(g, cx - 16 * s, yy - 14 * s, s, '#ff3344'); px.disc(g, cx + 14 * s, yy - 16 * s, s, '#ff3344');
    px.rect(g, x - 2, yy - 2, w + 4, h + 4, '#0e0618'); px.rect(g, x, yy, w, h, '#3a1a4e'); px.rect(g, x + s * 2, yy + s * 2, w - s * 4, h - s * 6, '#140a24');
    for (let i = 0; i < 3; i++) px.disc(g, x + w - s * 6 - i * s * 4, yy + h - s * 2, s, i === 0 ? '#ffcc33' : '#7a5a8a');
    const sp = (Math.sin(tn * 3) + 1) / 2; px.dot(g, x + w - s * 4, yy + s * 3, sp > .5 ? '#ffffff' : '#ffcc33');
  }
  F.title(g, 'MASH TV', cx, y, { scale: s, align: 'center', colors: ['#ff2e88', '#ff7a5a', '#ffcc33'], outline: '#1a0a24', depth: Math.max(1, s - 1), depthColor: '#5a0a3a' });
};
