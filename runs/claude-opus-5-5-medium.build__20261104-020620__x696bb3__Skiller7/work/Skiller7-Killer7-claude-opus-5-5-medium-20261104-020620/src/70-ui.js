/* SKILLER7 — the canvas UI kit and the modal screens (10-foot: big type, few items, one idea a screen). Pad, keys and
 * mouse all drive the same focus lists: hover moves the focus, a click picks, a drag moves a slider. */
const INK = '#f4f1ea', PAPER = '#0b0a0c', RED = '#d81e2a', MUTED = '#8a8590', GOLD = '#e0b040';
const UI = S7.UI = { stack: [], marks: [], rects: [], last: null, flakes: [], t: 0 };
const txt = (g, s, x, y, c = INK, o = {}) => E.font.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: '#05040a' }, o));
const tw = (s, scale = 1) => E.font.width(String(s), { scale });
S7.txt = txt;
const box = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#16141a', '#0b0a0c'], border: '#3a343e' }, o));
const veil = (g, r, a = .7, c = '#05040a') => px.blend(g, a, 'normal', () => px.rect(g, 0, 0, r.W, r.H, c));
const px = E.px;
UI.box = box; UI.veil = veil;

/* ---- button glyphs: ✕ ○ □ △ drawn as shapes (the font has none); everything else as a key cap ---- */
function chip(g, label, x, y, o = {}) {
  const s = o.scale || 1, h = 9 * s + 2, ps = { '✕': 'x', '○': 'o', '□': 's', '△': 't' }[label];
  if (ps) {
    const w = h, cx = x + w / 2, cy = y + h / 2, c = { x: '#8ab4ff', o: '#ff6a6a', s: '#ff8ad8', t: '#6af0b0' }[ps], rr = 3 * s;
    px.disc(g, cx, cy, h / 2, '#1a1820'); px.disc(g, cx, cy, h / 2 - 1, '#2a2632');
    if (ps === 'x') { px.line(g, cx - rr, cy - rr, cx + rr, cy + rr, c, s + 1); px.line(g, cx - rr, cy + rr, cx + rr, cy - rr, c, s + 1); }
    else if (ps === 'o') { for (let a = 0; a < TAU; a += .3) px.dot(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, c); if (s > 1) for (let a = 0; a < TAU; a += .3) px.dot(g, cx + Math.cos(a) * (rr - 1), cy + Math.sin(a) * (rr - 1), c); }
    else if (ps === 's') { px.rect(g, cx - rr, cy - rr, rr * 2, 1 + (s > 1), c); px.rect(g, cx - rr, cy + rr - (s > 1), rr * 2 + 1, 1 + (s > 1), c); px.rect(g, cx - rr, cy - rr, 1 + (s > 1), rr * 2, c); px.rect(g, cx + rr - (s > 1), cy - rr, 1 + (s > 1), rr * 2, c); }
    else { px.line(g, cx, cy - rr, cx - rr, cy + rr - 1, c, s); px.line(g, cx, cy - rr, cx + rr, cy + rr - 1, c, s); px.line(g, cx - rr, cy + rr - 1, cx + rr, cy + rr - 1, c, s); }
    return w;
  }
  const xb = S7.game && S7.game.input.lastDevice === 'gamepad' ? { A: '#6ad06a', B: '#ff6a5a', X: '#6aa8ff', Y: '#ffd040' }[label] : null;
  const w = tw(label, s) + 6;
  box(g, x, y, w, h, { bg: xb ? [xb, E.shade ? xb : xb] : ['#2a2632', '#1a1820'], border: xb ? '#000' : '#6a6070', gradient: false });
  txt(g, label, x + 3, y + 2, xb ? '#0b0a0c' : INK, { scale: s, outline: false });
  return w;
}
UI.chip = chip;
/** a prompt: the action's glyph and a verb, e.g. [△] CHECK Murmel; returns its width */
function prompt(g, act, verb, x, y, o = {}) {
  const lab = S7.label(act), s = o.scale || 1;
  const w1 = chip(g, lab, x, y, { scale: s });
  txt(g, verb, x + w1 + 4, y + 1 + s, o.color || INK, { scale: s });
  return w1 + 4 + tw(verb, s);
}
UI.prompt = prompt;
const promptW = (act, verb, s = 1) => { const l = S7.label(act); return ('✕○□△'.includes(l) && l.length === 1 ? 9 * s + 2 : tw(l, s) + 6) + 4 + tw(verb, s); };
UI.promptW = promptW;
/** prompts in a row, centred at y */
UI.prompts = (g, r, list, y, s = 1) => { const ws = list.map(([a, v]) => promptW(a, v, s)), tot = ws.reduce((a, b) => a + b, 0) + (list.length - 1) * 14; let x = r.W / 2 - tot / 2; list.forEach(([a, v], i) => { prompt(g, a, v, x, y, { scale: s }); x += ws[i] + 14; }); };

/* ---- input for menus (a modal reads these) ---- */
const In = {
  up: () => S7.game.input.repeat('up', .3, .09), down: () => S7.game.input.repeat('down', .3, .09), left: () => S7.game.input.repeat('left', .3, .07), right: () => S7.game.input.repeat('right', .3, .07),
  ok: () => S7.game.input.pressed('confirm'), back: () => S7.game.input.pressed('cancel') || S7.game.input.pressed('pause'),
  l1: () => S7.game.input.pressed('ring') || S7.game.input.pressed('skill') && S7.game.input.lastDevice !== 'gamepad' && false, r1: () => S7.game.input.pressed('skill'),
  tri: () => S7.game.input.pressed('interact'), sq: () => S7.game.input.pressed('heal'),
  ptr: () => S7.game.input.pointer ? S7.game.input.pointer() : null, click: () => S7.game.input.clicked ? S7.game.input.clicked() : null,
  down0: () => S7.game.input.held.has('Mouse0'), key: c => S7.game.input.held.has(c)
};
UI.In = In;
const inRect = (p, r) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
UI.inRect = inRect;
let ptrMoved = false, lastPtr = null;
UI.tickPointer = () => { const p = In.ptr(); ptrMoved = !!(p && (!lastPtr || p[0] !== lastPtr[0] || p[1] !== lastPtr[1])); lastPtr = p; };
let prevHeld = new Set();
UI.pc = c => S7.game.input.held.has(c) && !prevHeld.has(c) || !!(S7.keyTaps && S7.keyTaps.has(c));   // a key or button pressed since the last UI step (a quick tap counts too)
UI.endTick = () => { prevHeld = new Set(S7.game.input.held); if (S7.keyTaps) S7.keyTaps.clear(); };

/** a focus list: items { label, value?() , onPick?(), onLeft?(), onRight?(), slider?: { get, set, min, max, step }, disabled? } */
class List {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.rects = []; this.drag = null; this.skip(); }
  skip(d = 1) { const n = this.items.length; for (let k = 0; k < n && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + n) % n; }
  update() {
    const n = this.items.length; if (!n) return;
    if (In.up()) { this.i = (this.i + n - 1) % n; this.skip(-1); S7.sfx('tick'); }
    if (In.down()) { this.i = (this.i + 1) % n; this.skip(1); S7.sfx('tick'); }
    const it = this.items[this.i], p = In.ptr();
    if (ptrMoved && p) this.rects.forEach((r, k) => { if (inRect(p, r) && !this.items[k].disabled && this.i !== k) { this.i = k; S7.sfx('tick'); } });
    const c = In.click();
    if (it && it.slider) {
      const sl = it.slider, st = sl.step || (sl.max - sl.min) / 20;
      if (In.left()) { sl.set(clamp(sl.get() - st, sl.min, sl.max)); S7.sfx('tick'); }
      if (In.right()) { sl.set(clamp(sl.get() + st, sl.min, sl.max)); S7.sfx('tick'); }
      const tr = this.track && this.track[this.i];
      if (tr && p && In.down0() && (this.drag === this.i || inRect(p, [tr[0] - 4, tr[1] - 4, tr[2] + 8, tr[3] + 8]))) { this.drag = this.i; const u = clamp((p[0] - tr[0]) / tr[2], 0, 1); sl.set(Math.round((sl.min + (sl.max - sl.min) * u) / st) * st); }
      if (!In.down0()) this.drag = null;
    } else if (it) { if (In.left() && it.onLeft) { it.onLeft(); S7.sfx('tick'); } if (In.right() && it.onRight) { it.onRight(); S7.sfx('tick'); } }
    if (c) { const k = this.rects.findIndex(r => inRect(c, r)); if (k >= 0 && !this.items[k].disabled) { this.i = k; const t = this.items[k]; if (t.slider) return; if (t.onRight && !t.onPick) { t.onRight(); S7.sfx('tick'); return; } if (t.onPick) { S7.sfx('confirm'); t.onPick(); } return; } }
    if (In.ok() && it && !it.disabled && it.onPick) { S7.sfx('confirm'); it.onPick(); }
  }
  draw(g, x, y, w, o = {}) {
    const s = o.scale || 2, rh = o.rh || (9 * s + 6), rows = o.rows || this.items.length, start = clamp(this.i - Math.floor(rows / 2), 0, Math.max(0, this.items.length - rows));
    this.rects = []; this.track = [];
    for (let k = 0; k < this.items.length; k++) {
      if (k < start || k >= start + rows) { this.rects[k] = [-99, -99, 0, 0]; continue; }
      const it = this.items[k], yy = y + (k - start) * rh, foc = k === this.i, col = it.disabled ? '#4a4650' : foc ? INK : '#b8b0bc';
      this.rects[k] = [x, yy - 2, w, rh];
      if (foc) { px.rect(g, x, yy - 2, 3, rh - 2, RED); px.blend(g, .35, 'normal', () => px.rect(g, x + 3, yy - 2, w - 3, rh - 2, '#3a1418')); }
      const lab = typeof it.label === 'function' ? it.label() : it.label;
      txt(g, lab, x + 8 + (foc ? 2 : 0), yy + 2, col, { scale: s });
      if (it.slider) {
        const sl = it.slider, tx = x + w - 120, ty = yy + rh / 2 - 3, u = (sl.get() - sl.min) / (sl.max - sl.min);
        px.rect(g, tx, ty, 90, 4, '#2a2630'); px.rect(g, tx, ty, Math.round(90 * u), 4, foc ? RED : '#8a3a40'); px.rect(g, tx + Math.round(90 * u) - 2, ty - 3, 4, 10, INK);
        txt(g, sl.fmt ? sl.fmt(sl.get()) : String(+sl.get().toFixed(2)), tx + 96, yy + 2 + (s - 1) * 2, col, { scale: 1 });
        this.track[k] = [tx, ty, 90, 4];
      } else if (it.value) { const v = String(it.value()); txt(g, (it.onLeft || it.onRight ? '← ' : '') + v + (it.onLeft || it.onRight ? ' →' : ''), x + w - 8 - tw((it.onLeft || it.onRight ? '← ' : '') + v + (it.onLeft || it.onRight ? ' →' : ''), s), yy + 2, foc ? GOLD : '#a09880', { scale: s }); }
    }
    if (this.items.length > rows) { if (start > 0) txt(g, '↑', x + w - 10, y - 10, MUTED); if (start + rows < this.items.length) txt(g, '↓', x + w - 10, y + rows * rh, MUTED); }
  }
}
UI.List = List;

/* ---- the modal stack: while one is open the sim is frozen (the play scene checks UI.modal()) ---- */
UI.modal = () => UI.stack[UI.stack.length - 1] || null;
UI.open = (name, arg) => {
  const f = SCREENS[name]; if (!f) throw new Error('unknown screen ' + name);
  const m = f(arg || {}); m.name = name; UI.stack.push(m); S7.UIOPEN = true; S7.game.input.consumeAll(); if (S7.keyTaps) S7.keyTaps.clear(); prevHeld = new Set(S7.game.input.held); emit('ui', { open: name });
  if (S7.game.audio) S7.game.audio.duck(true);
  return m;
};
UI.close = () => { const m = UI.stack.pop(); if (m && m.onClose) m.onClose(); S7.UIOPEN = UI.stack.length > 0; S7.game.input.consumeAll(); if (!S7.UIOPEN && S7.game.audio) S7.game.audio.duck(false); emit('ui', { close: m && m.name }); };
UI.closeAll = () => { while (UI.stack.length) UI.close(); };
UI.update = dt => { UI.t += dt; UI.tickPointer(); const m = UI.modal(); if (!m) { UI.endTick(); return false; } m.update(dt); UI.endTick(); return true; };
UI.draw = (g, r) => { for (const m of UI.stack) m.draw(g, r); };
UI.openFromPause = name => { const game = S7.game; if (game.shell && game.shell.hide) game.shell.hide(); game.resume && game.resume(); game.paused = false; UI.open(name); };
// the sim asks for screens through the bus
S7.bus.on('open', d => {
  if (!S7.game || S7.game.headless) return;
  if (d.screen === 'save') { if (S7.game.saves && S7.game.saves.show) { S7.game.saves.show('save', () => S7.say([['rosalind', 'The clock is wound. Your sins are not.']])); } return; }
  UI.open(d.screen, d);
});

/* ---- a page frame: a title, a body, the prompts at the bottom; 5% safe margins ---- */
function frame(g, r, title, o = {}) {
  veil(g, r, o.veil ?? .82);
  const mx = Math.round(r.W * .05), my = Math.round(r.H * .05);
  E.font.title(g, title, r.W / 2, my + 2, { scale: o.tscale || 3, colors: ['#ffffff', INK, '#c8c0b8'], outline: '#05040a', depth: 2, depthColor: '#3a0a10', align: 'center' });
  if (o.sub) txt(g, o.sub, r.W / 2 - tw(o.sub) / 2, my + 30 + ((o.tscale || 3) - 3) * 8, RED);
  return { x: mx, y: my, w: r.W - mx * 2, h: r.H - my * 2 };
}
UI.frame = frame;
const backPrompt = (g, r, extra = []) => UI.prompts(g, r, extra.concat([['cancel', 'BACK']]), r.H - Math.round(r.H * .05) - 12);

/* ================= the screens ================= */
const SCREENS = {};
UI.SCREENS = SCREENS;

SCREENS.difficulty = () => {
  const D = [['Bunny Hill', 'Half damage. Long reveals. Strong aim assist.'], ['Piste', 'As the mountain intends.'], ['Off-Piste', 'They hit harder, move quicker, fade faster.']];
  const L = new List(D.map(([d]) => ({ label: d.toUpperCase(), onPick: () => { UI.close(); S7.startNewGame(d); } })));
  L.i = 1;
  return { update() { L.update(); if (In.back()) UI.close(); }, draw(g, r) { const F = frame(g, r, 'NEW GAME', { sub: 'HOW STEEP?' }); L.draw(g, r.W / 2 - 110, F.y + 64, 220); const d = D[L.i][1]; txt(g, d, r.W / 2 - tw(d) / 2, F.y + 64 + 3 * 24 + 10, '#c8c0b8'); backPrompt(g, r, [['confirm', 'START']]); } };
};

SCREENS.about = () => {
  const P = S7.ABOUT, st = { p: 0, scroll: 0 };
  const flip = d => { st.p = (st.p + d + P.length) % P.length; st.scroll = 0; S7.sfx('tick'); };
  return {
    update() { if (In.left() || In.l1() || S7.game.input.pressed('ring')) flip(-1); if (In.right() || In.r1()) flip(1); if (In.down()) st.scroll++; if (In.up()) st.scroll = Math.max(0, st.scroll - 1); const c = In.click(); if (c && UI.aboutArrows) { if (inRect(c, UI.aboutArrows[0])) flip(-1); else if (inRect(c, UI.aboutArrows[1])) flip(1); } if (In.back() || In.ok()) UI.close(); },
    draw(g, r) {
      const pg = P[st.p], F = frame(g, r, pg[0], { sub: (st.p + 1) + ' / ' + P.length, tscale: 2 });
      const lines = []; for (const para of pg[1]) { for (const l of E.font.wrap(para, F.w - 16, { scale: 1 })) lines.push(l); lines.push(''); }
      const per = Math.floor((F.h - 64) / 10); st.scroll = Math.min(st.scroll, Math.max(0, lines.length - per));
      lines.slice(st.scroll, st.scroll + per).forEach((l, i) => txt(g, l, F.x + 8, F.y + 44 + i * 10, l.endsWith(':') ? GOLD : INK));
      if (lines.length > per) txt(g, '↑↓ ' + (st.scroll + 1) + '-' + Math.min(lines.length, st.scroll + per) + ' / ' + lines.length, F.x + F.w - 70, F.y + 30, MUTED);
      UI.aboutArrows = [[F.x, r.H / 2 - 10, 16, 20], [F.x + F.w - 16, r.H / 2 - 10, 16, 20]]; txt(g, '←', F.x + 2, r.H / 2 - 6, RED, { scale: 2 }); txt(g, '→', F.x + F.w - 12, r.H / 2 - 6, RED, { scale: 2 });
      UI.prompts(g, r, [['left', 'PAGE'], ['down', 'SCROLL'], ['cancel', 'BACK']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};

SCREENS.help = () => ({
  update() { if (In.back() || In.ok()) UI.close(); },
  draw(g, r) {
    const F = frame(g, r, 'HOW TO PLAY', { tscale: 2 }), rows = [['move', 'Hold: walk the rail. Let go: stand.'], ['turn', 'Quick turn. On skis: hockey stop.'], ['left', 'Pick a way at a junction (or the stick, or a click).'], ['aim', 'Aim in first person.'], ['scan', 'Scan (while aiming): reveal the laughing.'], ['fire', 'Shoot. The warm spot thaws them at once.'], ['skill', 'Your persona\'s skill.'], ['ring', 'Hold: the Featherbed. Seven killers, one body.'], ['heal', 'Hold: drink Red to heal.'], ['interact', 'Check, talk, pay, rescue.']];
    rows.forEach(([a, t], i) => { prompt(g, a, '', F.x + 10, F.y + 40 + i * 15); txt(g, t, F.x + 64, F.y + 42 + i * 15, INK); });
    txt(g, 'Whiteouts are invisible. Listen for laughter, look for breath and footprints, then scan.', F.x + 10, F.y + 44 + rows.length * 15, GOLD);
    backPrompt(g, r);
  }
});

/* ---- the map: the area's rail graph as a schematic (visited edges solid, seen ones dotted) ---- */
SCREENS.map = () => {
  const areas = () => Object.keys(G.visited).filter(a => a !== 'room7' && S7.AREAS[a]);
  const st = { i: Math.max(0, areas().indexOf(G.area)) };
  return {
    update() { const A = areas(); if (In.left() || S7.game.input.pressed('ring')) st.i = (st.i + A.length - 1) % A.length; if (In.right() || In.r1()) st.i = (st.i + 1) % A.length; if (In.back() || In.ok() || S7.game.input.pressed('map')) UI.close(); },
    draw(g, r) {
      const A = areas(), id = A[st.i] || G.area, L = loadArea(id), area = L.area, F = frame(g, r, area.title, { sub: area.sub, tscale: 2 });
      const ns = Object.values(L.rails.nodes); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const n of ns) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
      const bw = F.w - 40, bh = F.h - 90, k = Math.min(bw / Math.max(1, x1 - x0), bh / Math.max(1, y1 - y0)), ox = F.x + 20 + (bw - (x1 - x0) * k) / 2, oy = F.y + 46 + (bh - (y1 - y0) * k) / 2, P = (x, y) => [ox + (x - x0) * k, oy + (y - y0) * k];
      for (const e of L.rails.edges) {
        if (e.hidden && !G.flags[e.hidden]) continue;
        const seen = G.seen[id + ':e:' + e.id], pts = e.path.pts;
        for (let i = 0; i < pts.length - 1; i += 1) { const a = P(pts[i][0], pts[i][1]), b = P(pts[i + 1][0], pts[i + 1][1]); if (seen) px.line(g, a[0], a[1], b[0], b[1], e.kind === 'ski' ? '#a0c0ff' : e.kind === 'lift' ? GOLD : INK, 2); else if (i % 2 === 0) px.line(g, a[0], a[1], b[0], b[1], '#5a5460', 1); }
        if (e.gate) { const m = e.path.at(e.len / 2), q = P(m.x, m.y), open = G.gates[id + ':' + e.gate]; px.rect(g, q[0] - 3, q[1] - 3, 7, 7, open ? '#3a3a40' : RED); if (open) px.line(g, q[0] - 4, q[1] + 4, q[0] + 4, q[1] - 4, INK); }
      }
      let icons = 0;
      for (const n of ns) {
        const q = P(n.x, n.y), seen = G.seen[id + ':n:' + n.id] || G.walker.node === n.id;
        px.disc(g, q[0], q[1], 2, seen ? INK : '#5a5460');
        if (icons < 20 && seen && n.label && (n.kind === 'door' || n.kind === 'exit' || n.kind === 'stop' && n.label)) { txt(g, n.kind === 'door' ? '7' : n.kind === 'exit' ? '→' + (n.to ? (S7.AREAS[n.to[0]] || {}).title || '' : '') : n.label, q[0] + 4, q[1] - 3, n.kind === 'door' ? RED : '#c8c0b8', { scale: 1 }); icons++; }
      }
      if (id === G.area) { const H = heroPos(), q = P(H.x, H.y); px.disc(g, q[0], q[1], 4, RED); px.disc(g, q[0], q[1], 2, INK); }
      for (const s of statuesHere()) if (id === G.area) { const q = P(s.st.at[0], s.st.at[1]); px.rect(g, q[0] - 2, q[1] - 2, 5, 5, '#80e0ff'); }
      const obj = S7.objective(); txt(g, obj, r.W / 2 - tw(obj) / 2, r.H - Math.round(r.H * .05) - 28, GOLD);
      UI.prompts(g, r, [['left', 'AREA'], ['cancel', 'BACK']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};

/* ---- items and the Dossier: tabs of big icons, one line each; pages of text ---- */
SCREENS.dossier = () => {
  const tabs = ['ITEMS', 'DOCUMENTS', 'LIFT PINS', 'EXPOSURES'], st = { t: 0, i: 0, read: null };
  const list = () => st.t === 0 ? Object.keys(G.items).filter(k => G.items[k]).map(k => [S7.ITEMS[k], G.items[k]]) : st.t === 1 ? G.dossier.map(k => [S7.ITEMS[k]]) : st.t === 2 ? G.pins.map(k => [S7.ITEMS[k]]) : G.exposures.map(k => [S7.ITEMS[k]]);
  return {
    update() {
      if (st.read) { if (In.back() || In.ok()) st.read = null; return; }
      if (S7.game.input.pressed('ring') || In.left() && false) { st.t = (st.t + 3) % 4; st.i = 0; S7.sfx('tick'); } if (In.r1()) { st.t = (st.t + 1) % 4; st.i = 0; S7.sfx('tick'); }
      if (In.left()) { st.t = (st.t + 3) % 4; st.i = 0; } if (In.right()) { st.t = (st.t + 1) % 4; st.i = 0; }
      const L = list(); if (In.up()) st.i = Math.max(0, st.i - 1); if (In.down()) st.i = Math.min(L.length - 1, st.i + 1);
      const c = In.click(); if (c && UI.dRects) { UI.dRects.tabs.forEach((rc, k) => { if (inRect(c, rc)) { st.t = k; st.i = 0; } }); UI.dRects.rows.forEach((rc, k) => { if (inRect(c, rc)) { st.i = k; st.read = L[k] && L[k][0]; } }); }
      const p = In.ptr(); if (ptrMoved && p && UI.dRects) UI.dRects.rows.forEach((rc, k) => { if (inRect(p, rc)) st.i = k; });
      if (In.ok() && L[st.i]) st.read = L[st.i][0];
      if (In.back()) UI.close();
    },
    draw(g, r) {
      const F = frame(g, r, 'ITEMS & DOSSIER', { tscale: 2 }), L = list(); UI.dRects = { tabs: [], rows: [] };
      let x = F.x + 10; tabs.forEach((t, k) => { const w = tw(t) + 12; UI.dRects.tabs.push([x, F.y + 32, w, 12]); if (k === st.t) px.rect(g, x, F.y + 32, w, 12, RED); txt(g, t, x + 6, F.y + 34, k === st.t ? INK : MUTED); x += w + 4; });
      if (st.read) { const it = st.read, lines = E.font.wrap(it.text || it.about || '', F.w - 40, { scale: 2 }); txt(g, it.name.toUpperCase(), F.x + 20, F.y + 56, GOLD, { scale: 1 }); lines.slice(0, 7).forEach((l, i) => txt(g, l, F.x + 20, F.y + 72 + i * 18, INK, { scale: 2 })); backPrompt(g, r); return; }
      if (!L.length) txt(g, 'NOTHING YET.', r.W / 2 - tw('NOTHING YET.', 2) / 2, F.y + 90, MUTED, { scale: 2 });
      const start = clamp(st.i - 3, 0, Math.max(0, L.length - 7));
      L.slice(start, start + 7).forEach(([it, n], k) => {
        const i = k + start, y = F.y + 52 + k * 20, foc = i === st.i; UI.dRects.rows[i] = [F.x + 10, y - 2, F.w - 20, 18];
        if (foc) px.rect(g, F.x + 10, y - 2, 3, 16, RED);
        drawIcon(g, it, F.x + 20, y - 1);
        txt(g, it.name + (n > 1 ? ' ×' + n : ''), F.x + 40, y + 1, foc ? INK : '#c8c0b8', { scale: foc ? 2 : 1 });
        if (foc) txt(g, (it.slogan || it.about || '').slice(0, 64), F.x + 40, y + 16 - 2, MUTED);
      });
      txt(g, 'LIFT PINS ' + G.pins.length + '/7   DOCUMENTS ' + G.dossier.length + '/8   RIME ' + G.rime + '   RED ' + Math.round(G.red), F.x + 10, F.y + F.h - 26, GOLD);
      backPrompt(g, r, [['confirm', 'READ'], ['ring', 'TAB']]);
    }
  };
};
function drawIcon(g, it, x, y) {
  const k = it.kind, c = k === 'pin' ? GOLD : k === 'doc' ? '#e8e0d0' : k === 'exposure' ? '#80e0ff' : it.icon === 'flower' ? '#ffffff' : it.icon === 'ember' ? '#ff7a2a' : GOLD;
  if (k === 'pin') { px.disc(g, x + 6, y + 6, 6, '#3a2a10'); px.disc(g, x + 6, y + 6, 5, c); txt(g, String(it.n), x + 4, y + 3, '#3a2a10', { outline: false }); }
  else if (k === 'doc' || k === 'exposure') { px.rect(g, x, y, 11, 14, c); for (let i = 0; i < 4; i++) px.rect(g, x + 2, y + 3 + i * 3, 7, 1, '#6a6460'); }
  else if (it.icon === 'flower') { for (let a = 0; a < TAU; a += TAU / 6) px.disc(g, x + 6 + Math.cos(a) * 4, y + 6 + Math.sin(a) * 4, 2, c); px.disc(g, x + 6, y + 6, 2, GOLD); }
  else if (it.icon === 'ember') { px.disc(g, x + 6, y + 7, 5, '#5a1a0a'); px.disc(g, x + 6, y + 7, 3, c); px.dot(g, x + 5, y + 5, '#ffe0a0'); }
  else { px.rect(g, x + 1, y + 5, 10, 3, c); px.disc(g, x + 2, y + 6, 3, c); px.rect(g, x + 8, y + 8, 2, 3, c); }
}
UI.drawIcon = drawIcon;

/* ---- the seven: portraits, weapon, skill, stats ---- */
UI.rigs = {};
UI.rig = id => UI.rigs[id] || (UI.rigs[id] = new E.Humanoid(Object.assign({ size: 1.3 }, (S7.PEOPLE[id] || {}).rig || (S7.PERSONAS[id] || {}).rig || {})));
SCREENS.personas = () => {
  const st = { i: ORDER.indexOf(G.persona) };
  return {
    update(dt) { if (In.left()) st.i = (st.i + 6) % 7; if (In.right()) st.i = (st.i + 1) % 7; const c = In.click(); if (c && UI.pRects) UI.pRects.forEach((rc, k) => { if (inRect(c, rc)) st.i = k; }); if (In.back() || In.ok()) UI.close(); for (const id of ORDER) UI.rig(id).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); },
    draw(g, r) { const F = frame(g, r, 'THE SEVEN', { tscale: 2, sub: 'OMA HOLLE\'S WARDROBE' }); UI.pRects = []; personaRow(g, r, F, st.i, true); personaCard(g, r, F, ORDER[st.i]); backPrompt(g, r, [['left', 'NEXT']]); }
  };
};
function personaRow(g, r, F, sel, ro) {
  const n = 7, w = Math.min(46, (F.w - 20) / n), x0 = r.W / 2 - n * w / 2;
  ORDER.forEach((id, k) => {
    const x = x0 + k * w, y = F.y + 44, R0 = G.roster[id], ok = R0.unlocked, foc = k === sel; UI.pRects[k] = [x, y, w - 2, w - 2];
    UI.rig(id).drawPortrait(g, x + 1, y + 1, w - 4, { zoom: 2.4, turn: .5, bg: foc ? ['#5a1a20', '#1a0a0e'] : ['#2a2630', '#101014'], tint: !ok ? '#202020' : R0.frozen ? '#80c0ff' : undefined });
    if (foc) { px.rect(g, x, y + w - 2, w - 2, 2, RED); }
    txt(g, String(k + 1), x + 2, y + 2, ok ? INK : MUTED);
    void ro;
  });
}
function personaCard(g, r, F, id) {
  const P = S7.PERSONAS[id], R0 = G.roster[id], W0 = S7.WEAPONS[P.weapon], y = F.y + 44 + 52;
  if (!R0.unlocked) { txt(g, 'THE COAT IS STILL WET.', r.W / 2 - tw('THE COAT IS STILL WET.', 2) / 2, y + 20, MUTED, { scale: 2 }); return; }
  txt(g, P.name.toUpperCase(), F.x + 16, y, INK, { scale: 2 }); txt(g, P.epithet, F.x + 16, y + 18, RED);
  txt(g, 'HP ' + Math.round(R0.hp) + ' / ' + R0.max + (R0.frozen ? '   FROZEN' : ''), F.x + 16, y + 30, R0.frozen ? '#80e0ff' : INK); E.ui.bar(g, F.x + 16, y + 40, 100, 5, R0.hp / R0.max, '#f4f1ea');
  txt(g, 'WEAPON  ' + W0.name, F.x + 16, y + 52, '#c8c0b8'); txt(g, 'SKILL   ' + P.skillName + (P.skillCost ? ' (' + P.skillCost + ' RED' + (P.skill === 'tuck' ? '/S' : '') + ')' : ''), F.x + 16, y + 62, '#c8c0b8');
  E.font.wrap(P.about, F.w / 2 - 20, { scale: 1 }).forEach((l, i) => txt(g, l, F.x + 16, y + 76 + i * 10, MUTED));
  const st = R0.stats, sx = r.W / 2 + 20; ['power', 'speed', 'crit', 'steady'].forEach((k, i) => { txt(g, k.toUpperCase(), sx, y + 2 + i * 16, INK); for (let s = 0; s < 5; s++) px.rect(g, sx + 60 + s * 12, y + 2 + i * 16, 10, 7, s < st[k] ? GOLD : '#3a3640'); });
}
UI.personaRow = personaRow; UI.personaCard = personaCard;

/* ---- Room 7: the Wardrobe and the Wax Bench ---- */
SCREENS.wardrobe = () => {
  const st = { i: ORDER.indexOf(G.persona) };
  return {
    update(dt) {
      if (In.left()) { st.i = (st.i + 6) % 7; S7.sfx('tick'); } if (In.right()) { st.i = (st.i + 1) % 7; S7.sfx('tick'); }
      const c = In.click(), p = In.ptr(); if (p && ptrMoved && UI.pRects) UI.pRects.forEach((rc, k) => { if (inRect(p, rc)) st.i = k; });
      const pick = () => { const id = ORDER[st.i]; if (S7.wardrobePick(id)) { S7.sfx('confirm'); UI.close(); } else S7.sfx('dry'); };
      if (c && UI.pRects) UI.pRects.forEach((rc, k) => { if (inRect(c, rc)) { st.i = k; pick(); } });
      if (In.ok()) pick(); if (In.back()) UI.close();
      for (const id of ORDER) UI.rig(id).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
    },
    draw(g, r) { const F = frame(g, r, 'THE WARDROBE', { tscale: 2, sub: 'SEVEN COATS. SEVEN HOOKS.' }); UI.pRects = []; personaRow(g, r, F, st.i); personaCard(g, r, F, ORDER[st.i]); backPrompt(g, r, [['confirm', 'WEAR THIS COAT']]); }
  };
};
SCREENS.waxbench = () => {
  const st = { i: ORDER.indexOf(G.persona), s: 0 }, STATS = [['power', '+12% damage a level'], ['speed', '+8% movement and reload'], ['crit', '+10% warm spot radius; from 3, +1 Rime a crit'], ['steady', '-15% sway, +0.4 s reveal']];
  const unlocked = () => ORDER.filter(id => G.roster[id].unlocked);
  return {
    update(dt) {
      const U = unlocked(); let k = U.indexOf(ORDER[st.i]); if (k < 0) k = 0;
      if (S7.game.input.pressed('ring') || In.left()) { k = (k + U.length - 1) % U.length; st.i = ORDER.indexOf(U[k]); S7.sfx('tick'); }
      if (In.r1() || In.right()) { k = (k + 1) % U.length; st.i = ORDER.indexOf(U[k]); S7.sfx('tick'); }
      if (In.up()) st.s = (st.s + 3) % 4; if (In.down()) st.s = (st.s + 1) % 4;
      const p = In.ptr(), c = In.click(); if (p && ptrMoved && UI.wRects) UI.wRects.forEach((rc, j) => { if (inRect(p, rc)) st.s = j; });
      const buy = () => { const id = ORDER[st.i]; if (S7.wax(id, STATS[st.s][0])) { S7.sfx('wax'); S7.barkLine('rosalind', 'Wax them well. The mountain notices.', 2.4); } else S7.sfx('dry'); };
      if (c && UI.wRects) UI.wRects.forEach((rc, j) => { if (inRect(c, rc)) { st.s = j; buy(); } });
      if (In.ok()) buy(); if (In.back()) UI.close();
      UI.rig(ORDER[st.i]).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
    },
    draw(g, r) {
      const F = frame(g, r, 'THE WAX BENCH', { tscale: 2, sub: 'WAX THE SKILLS. THE MOUNTAIN NOTICES.' }), id = ORDER[st.i], P = S7.PERSONAS[id], R0 = G.roster[id];
      UI.rig(id).drawPortrait(g, F.x + 16, F.y + 48, 64, { zoom: 3, turn: .5, bg: ['#5a1a20', '#1a0a0e'] });
      txt(g, P.name.toUpperCase(), F.x + 16, F.y + 118, INK, { scale: 1 }); txt(g, P.epithet, F.x + 16, F.y + 128, RED);
      UI.wRects = [];
      STATS.forEach(([k, d], j) => {
        const y = F.y + 50 + j * 26, x = F.x + 100, foc = j === st.s, lv = R0.stats[k], cost = S7.waxCost(id, k); UI.wRects[j] = [x - 4, y - 3, F.w - 104, 24];
        if (foc) px.rect(g, x - 4, y - 3, 3, 22, RED);
        txt(g, k.toUpperCase(), x, y, foc ? INK : '#c8c0b8', { scale: 2 }); for (let s = 0; s < 5; s++) px.rect(g, x + 90 + s * 16, y + 2, 13, 9, s < lv ? GOLD : '#3a3640');
        txt(g, cost === null ? 'MAX' : cost + ' RIME', x + 176, y + 2, cost !== null && G.rime >= cost ? INK : MUTED); if (foc) txt(g, d, x, y + 15, MUTED);
      });
      txt(g, 'RIME ' + G.rime, F.x + F.w - 70, F.y + 34, '#80e0ff', { scale: 1 });
      backPrompt(g, r, [['confirm', 'WAX'], ['left', 'PERSONA']]);
    }
  };
};

/* ---- the code lock: four dials ---- */
SCREENS.codelock = arg => {
  const st = { d: [0, 0, 0, 0], i: 0, msg: '' };
  const tryIt = () => { if (S7.codeOpen(arg.spot, st.d.join(''))) { UI.close(); } else { st.msg = 'CLICK. CLICK. NOTHING.'; S7.sfx('dry'); } };
  return {
    update() {
      if (In.left()) st.i = (st.i + 3) % 4; if (In.right()) st.i = (st.i + 1) % 4;
      if (In.up()) { st.d[st.i] = (st.d[st.i] + 1) % 10; S7.sfx('dial'); } if (In.down()) { st.d[st.i] = (st.d[st.i] + 9) % 10; S7.sfx('dial'); }
      for (let k = 0; k <= 9; k++) if (In.key('Digit' + k) && !UI['dk' + k]) { UI['dk' + k] = true; st.d[st.i] = k; st.i = Math.min(3, st.i + 1); S7.sfx('dial'); } else if (!In.key('Digit' + k)) UI['dk' + k] = false;
      const c = In.click(); if (c && UI.cRects) UI.cRects.forEach(([rc, i, d]) => { if (inRect(c, rc)) { st.i = i; if (d) { st.d[i] = (st.d[i] + d + 10) % 10; S7.sfx('dial'); } } });
      if (c && UI.cOpen && inRect(c, UI.cOpen)) tryIt();
      if (In.ok()) tryIt(); if (In.back()) UI.close();
    },
    draw(g, r) {
      const F = frame(g, r, 'THE SAFE', { tscale: 2, sub: 'FOUR DIALS. A DATE PEOPLE NEVER FORGET.' }); UI.cRects = [];
      for (let i = 0; i < 4; i++) {
        const x = r.W / 2 - 92 + i * 48, y = F.y + 70, foc = i === st.i;
        box(g, x, y, 40, 48, { bg: foc ? ['#3a1418', '#1a0a0e'] : ['#24202a', '#101014'], border: foc ? RED : '#4a4450' });
        E.font.title(g, String(st.d[i]), x + 20, y + 12, { scale: 3, colors: ['#ffffff', INK], outline: '#000', align: 'center', depth: 1 });
        txt(g, '↑', x + 16, y - 12, foc ? RED : MUTED); txt(g, '↓', x + 16, y + 52, foc ? RED : MUTED);
        UI.cRects.push([[x + 8, y - 16, 24, 14], i, 1], [[x + 8, y + 48, 24, 14], i, -1], [[x, y, 40, 48], i, 0]);
      }
      UI.cOpen = [r.W / 2 - 40, F.y + 150, 80, 18]; box(g, UI.cOpen[0], UI.cOpen[1], 80, 18, { bg: [RED, '#8a1018'] }); txt(g, 'OPEN', r.W / 2 - tw('OPEN', 1) / 2, F.y + 155, INK);
      if (st.msg) txt(g, st.msg, r.W / 2 - tw(st.msg) / 2, F.y + 176, RED);
      backPrompt(g, r, [['up', 'DIAL'], ['confirm', 'OPEN']]);
    }
  };
};

/* ---- an Exposure: the developed photograph, full screen ---- */
SCREENS.exposure = arg => {
  const it = S7.ITEMS[arg.item], st = { t: 0 };
  return {
    update(dt) { st.t += dt; if (st.t > .8 && (In.ok() || In.back() || In.click())) UI.close(); },
    draw(g, r) {
      veil(g, r, 1, '#1a1410');
      const w = r.W * .78, h = r.H * .7, x = (r.W - w) / 2, y = (r.H - h) / 2 - 6, dev = clamp(st.t / 1.6, 0, 1);
      px.rect(g, x - 4, y - 4, w + 8, h + 8, '#e8e0d0'); px.rect(g, x, y, w, h, dev < 1 ? E.shade('#3a3028', dev * .6) : '#4a3e32');
      for (let i = 0; i < 40; i++) px.dot(g, x + (i * 37 % w), y + (i * 53 % h), '#5a4e42');
      if (arg.item === 'exp_board') { for (let k = 0; k < 8; k++) { const cx = x + w * .2 + k * w * .08; px.line(g, x + w * .12, y + h * .18, x + w * .88, y + h * .18 - 6, '#d8d0c0'); px.disc(g, cx, y + h * .34, 5, '#d8d0c0'); px.line(g, cx, y + h * .19, cx, y + h * .3, '#d8d0c0'); } }
      else { for (let k = 0; k < 9; k++) px.rect(g, x + w * .1, y + h * .14 + k * 9, w * .8, 1, '#7a6e60'); }
      const lines = E.font.wrap(it.text, w - 30, { scale: 2 });
      px.blend(g, dev, 'normal', () => lines.forEach((l, i) => txt(g, l, x + w / 2 - tw(l, 2) / 2, y + h * .48 + i * 18, '#fff6d8', { scale: 2 })));
      txt(g, 'EXPOSURE DEVELOPED', x, y + h + 10, GOLD); if (st.t > .8) UI.prompts(g, r, [['confirm', 'CLOSE']], r.H - 18);
    }
  };
};

/* ---- results: the rank badge and six stats ---- */
SCREENS.results = () => {
  const st = { t: 0 }; S7.music && S7.music('stage');
  return {
    update(dt) { st.t += dt; if (st.t > 1 && (In.ok() || In.click())) { UI.close(); S7.closeResults(); } },
    onClose() { S7.closeResults(); },
    draw(g, r) {
      const R0 = G.resultsShow; if (!R0) return; const F = frame(g, r, 'TARGET 0' + R0.target, { sub: 'ELIMINATED', tscale: 3 }), s = R0.stats, cp = s.kills ? Math.round(s.crits / s.kills * 100) : 0;
      const col = { 'DOUBLE BLACK': '#f4f1ea', 'BLACK DIAMOND': '#f4f1ea', 'BLUE SQUARE': '#4a8aff', 'GREEN CIRCLE': '#3ac860' }[R0.rank], bx = r.W / 2, by = F.y + 74;
      if (R0.rank === 'GREEN CIRCLE') px.disc(g, bx, by, 14, col); else if (R0.rank === 'BLUE SQUARE') px.rect(g, bx - 13, by - 13, 26, 26, col);
      else { const d = R0.rank === 'DOUBLE BLACK' ? [-12, 12] : [0]; for (const o of d) { px.poly(g, [[bx + o, by - 15], [bx + o + 12, by], [bx + o, by + 15], [bx + o - 12, by]], '#000'); px.poly(g, [[bx + o, by - 12], [bx + o + 9, by], [bx + o, by + 12], [bx + o - 9, by]], '#1a1a1a'); } }
      txt(g, R0.rank, bx - tw(R0.rank, 2) / 2, by + 20, col, { scale: 2 });
      const rows = [[fmtClock(s.time), 'TIME'], [s.kills, 'WHITEOUTS THAWED'], [cp + '%', 'CRITICAL'], [s.red, 'RED COLLECTED'], [s.frozen, 'PERSONAS FROZEN'], [s.hints, 'HINTS BOUGHT']];
      rows.forEach(([v, l], i) => { const x = r.W / 2 - 150 + (i % 3) * 104, y = by + 44 + Math.floor(i / 3) * 30; txt(g, String(v), x + 44 - tw(String(v), 2) / 2, y, INK, { scale: 2 }); txt(g, l, x + 44 - tw(l) / 2, y + 16, MUTED); });
      txt(g, R0.note, r.W / 2 - tw(R0.note) / 2, F.y + F.h - 34, '#c8c0b8');
      if (st.t > 1) UI.prompts(g, r, [['confirm', 'CONTINUE']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};

/* ---- game over: the mountain keeps you ---- */
SCREENS.gameover = () => {
  const L = new List([{ label: 'CONTINUE', onPick: () => { UI.close(); S7.continueGame(); } }, { label: 'QUIT TO TITLE', onPick: () => { UI.close(); S7.game.go('title'); } }]);
  return { update() { L.update(); }, draw(g, r) { const F = frame(g, r, 'THE MOUNTAIN KEEPS YOU.', { tscale: 2, veil: .86 }); txt(g, 'The Sweep is down. Nobody is coming for the Sweep.', r.W / 2 - tw('The Sweep is down. Nobody is coming for the Sweep.') / 2, F.y + 40, MUTED); L.draw(g, r.W / 2 - 90, F.y + 80, 180); UI.prompts(g, r, [['confirm', 'PICK']], r.H - 20); } };
};

/* ---- skip a cutscene ---- */
SCREENS.skip = () => {
  const L = new List([{ label: 'SKIP SCENE', onPick: () => { UI.close(); S7.skipScene(); } }, { label: 'KEEP WATCHING', onPick: () => UI.close() }]);
  return { update() { L.update(); if (In.back()) UI.close(); }, draw(g, r) { veil(g, r, .6); txt(g, 'SKIP SCENE?', r.W / 2 - tw('SKIP SCENE?', 2) / 2, r.H / 2 - 40, INK, { scale: 2 }); L.draw(g, r.W / 2 - 80, r.H / 2 - 12, 160); } };
};
/** skipping a scene runs it to its end at once: pages turn, cards go (skip equals watch) */
S7.skipScene = () => {
  for (let i = 0; i < 120 * 90 && (G.cut || G.mode === 'talk' || G.mode === 'card'); i++) { const I = blankIntent(); if (i % 2 === 0) I.confirm = true; simUpdate(1 / 120, I); }
};
