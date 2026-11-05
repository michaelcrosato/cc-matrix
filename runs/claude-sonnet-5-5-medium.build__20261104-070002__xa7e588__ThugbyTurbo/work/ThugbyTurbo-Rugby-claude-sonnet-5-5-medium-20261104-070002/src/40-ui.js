/* THUGBY TURBO — 10-foot menus (big text, one focus, pad/keys/mouse), shared backdrop, store helpers. */
const store = E.store;
const UI = { stars: [], t: 0, portraits: null };
function mkMenu(items, o = {}) { return Object.assign({ items, i: 0, rects: [], x: 'center', y: 80, w: 180, sp: 21, scale: 2, hoverT: 0 }, o); }
function menuStep(m, inp, game, dt) {
  const n = m.items.length; if (!n) return null; let moved = false;
  const vis = m.items.map((it, i) => i).filter(i => !m.items[i].hidden);
  const go = d => { let k = m.i; do { k = (k + d + n) % n; } while (m.items[k].hidden || m.items[k].disabled && false); m.i = k; moved = true; game.audio.sfx('select'); };
  if (inp.repeat('down', .35, .1)) go(1); if (inp.repeat('up', .35, .1)) go(-1);
  const it = m.items[m.i];
  let dx = 0; if (inp.repeat('right', .35, .12)) dx = 1; if (inp.repeat('left', .35, .12)) dx = -1; if (inp.pressed('r1')) dx = dx || 1; if (inp.pressed('l1')) dx = dx || -1;
  if (dx && it && it.adjust) { it.adjust(dx); game.audio.sfx('select'); }
  // mouse
  const pm = inp.pointer && inp.pointer(); if (pm && m.rects.length) { if (!m._pm || Math.abs(pm[0] - m._pm[0]) + Math.abs(pm[1] - m._pm[1]) > 1) { m._pm = pm.slice(); for (let i = 0; i < m.rects.length; i++) { const q = m.rects[i]; if (q && pm[0] >= q[0] && pm[0] <= q[0] + q[2] && pm[1] >= q[1] && pm[1] <= q[1] + q[3] && m.i !== i) { m.i = i; game.audio.sfx('select'); } } } }
  const ck = inp.clicked && inp.clicked(); if (ck && m.rects.length) { for (let i = 0; i < m.rects.length; i++) { const q = m.rects[i]; if (q && ck[0] >= q[0] && ck[0] <= q[0] + q[2] && ck[1] >= q[1] && ck[1] <= q[1] + q[3]) { m.i = i; if (m.items[i].adjust && !m.items[i].fn) { m.items[i].adjust(ck[0] > q[0] + q[2] / 2 ? 1 : -1); } else { game.audio.sfx('confirm'); return m.items[i]; } } } }
  if (inp.pressed('confirm') || inp.pressed('x')) { const c = m.items[m.i]; if (c && !c.disabled) { if (c.fn) { game.audio.sfx('confirm'); return c; } else if (c.adjust) c.adjust(1); } else if (c) game.audio.sfx('cancel'); }
  if (inp.pressed('cancel') || inp.pressed('ci')) { if (m.onBack) { game.audio.sfx('cancel'); m.onBack(); } }
  return null;
}
function menuDraw(g, m, W, H, inp) {
  const sc = m.scale, lh = m.sp; const x0 = m.x === 'center' ? W / 2 : m.x; m.rects = [];
  m.items.forEach((it, i) => {
    if (it.hidden) { m.rects.push(null); return; } const y = m.y + (m.map ? m.map(i) : i) * lh, sel = i === m.i;
    const label = typeof it.label === 'function' ? it.label() : it.label; const w = Math.max(m.w, E.font.width(label, { scale: sc }) + 24);
    const bx = m.x === 'center' ? x0 - w / 2 : x0; m.rects.push([bx, y - 2, w, lh - 2]);
    if (sel) { E.ui.box(g, bx, y - 2, w, lh - 2, { bg: ['#3a5a9a', '#1a2a5a'], border: '#ffe070', alpha: .95 }); px.poly(g, [[bx - 8, y + 3], [bx - 2, y + 7], [bx - 8, y + 11]], '#ffe070'); }
    else E.ui.box(g, bx, y - 2, w, lh - 2, { bg: ['#1c2038', '#10121f'], border: '#3a4060', alpha: .8 });
    E.font.text(g, label, x0, y + (sc > 1 ? 1 : 3), it.disabled ? '#707890' : sel ? '#ffffff' : '#c0c8e8', { scale: sc, align: m.x === 'center' ? 'center' : 'left', shadow: '#000', outline: false });
    if (sel && it.adjust) { E.font.text(g, '<', bx + 4, y + 3, '#ffe070', { scale: 1 }); E.font.text(g, '>', bx + w - 12, y + 3, '#ffe070', { scale: 1 }); }
  });
}
function backdrop(r, t, dim) {
  r.overlay(g => {
    const W = r.W, H = r.H; E.ui.box(g, 0, 0, W, H, { bg: ['#14204a', '#e8782a'], border: false, gradient: true, alpha: 1 }); 
    // stadium: crowd bands, pitch trapezoid, floodlights
    for (let i = 0; i < 3; i++) { px.rect(g, 0, H * .38 + i * 8, W, 8, ['#2a2a3a', '#343448', '#3e3e58'][i]); for (let x = 0; x < W; x += 5) { const h = E.hash2(x, i); px.rect(g, x, H * .38 + i * 8 + 1 + Math.sin(t * 3 + x) * .8, 3, 3, ['#e8443a', '#3b82f6', '#f5b700', '#f2f2f2', '#22c55e'][Math.floor(h * 5)]); } }
    px.poly(g, [[0, H * .62], [W, H * .62], [W, H], [0, H]], '#2f7a34'); for (let i = 0; i < 9; i++) px.poly(g, [[i * W / 9 - 40 + 30, H * .62], [(i + 1) * W / 9 - 40 + 30, H * .62], [(i + 1) * W / 9 * 1.6 - W * .3, H], [i * W / 9 * 1.6 - W * .3, H]], i & 1 ? '#378a3c' : '#2f7a34');
    for (const lx of [W * .12, W * .88]) { px.rect(g, lx - 1, H * .1, 3, H * .3, '#202030'); px.rect(g, lx - 10, H * .08, 21, 7, '#fff8d0'); px.polyDither(g, [[lx - 8, H * .15], [lx + 8, H * .15], [lx + 60 * Math.sign(W / 2 - lx), H * .8], [lx - 20 * Math.sign(W / 2 - lx), H * .8]], '#fff8d0', .08, r.ix, r.iy); }
    if (dim) px.rect(g, 0, 0, W, H, 'rgba(0,0,0,0.5)');
  });
}
function titleLogo(g, W, y, t) { E.font.title(g, 'THUGBY', W / 2, y, { scale: 4, colors: ['#ffe070', '#ff8020'], align: 'center', outline: '#000', depth: 3, depthColor: '#5a1a00' }); E.font.title(g, 'TURBO', W / 2, y + 30 + Math.sin(t * 3) * 1.5, { scale: 3, colors: ['#ff6a50', '#d8203a'], align: 'center', outline: '#000', depth: 2, depthColor: '#401010' }); }
function getPortraits() { if (!UI.portraits) UI.portraits = mkPortraits(); return UI.portraits; }
function header(g, W, text, sub) { E.font.title(g, text, W / 2, 10, { scale: 2, colors: ['#ffe070', '#ff9030'], align: 'center', outline: '#000' }); if (sub) E.font.text(g, sub, W / 2, 30, '#c0c8e8', { align: 'center', shadow: '#000', outline: false }); }
function footer(g, W, H, inp, str) { prompt(g, str, W / 2, H - 14, inp, { align: 'center' }); }
const loadJSON = (k, d) => { try { return store.get(k, d); } catch (e) { return d; } };
const saveJSON = (k, v) => { try { store.set(k, v); } catch (e) { /* storage blocked */ } };

// ---------- records (arcade tables with initials)
const REC = { cats: [['margin', 'BIGGEST WIN MARGIN', 'pts'], ['tries', 'MOST TRIES IN A MATCH', ''], ['hits', 'MOST BIG HITS', ''], ['metres', 'MOST METRES RUN', 'm']] };
function getRecords() { const r = loadJSON('thugby:records', null); if (r) return r; const d = {}; REC.cats.forEach(([k], c) => { d[k] = [['ROS', 12 - c * 3], ['BAZ', 9 - c * 2], ['NIG', 6 - c], ['MAX', 4], ['PIE', 2]].map(([n, s]) => ({ n, s: Math.max(1, s) })); }); return d; }
function qualifies(cat, val) { const t = getRecords()[cat]; return val > 0 && (t.length < 5 || val > t[t.length - 1].s); }
function addRecord(cat, val, name) { const r = getRecords(); r[cat].push({ n: name, s: val }); r[cat].sort((a, b) => b.s - a.s); r[cat] = r[cat].slice(0, 5); saveJSON('thugby:records', r); }
