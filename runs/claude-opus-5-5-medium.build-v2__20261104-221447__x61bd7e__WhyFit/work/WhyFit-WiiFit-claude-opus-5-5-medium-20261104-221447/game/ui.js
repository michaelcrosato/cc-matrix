// Canvas UI: bright and round. Pills on every screen, one prompt helper, the Plate, stars, the Card and Results.
const INK = '#20404c', ACC = '#2cc6e6', ACCD = '#14a8c8', PAPER = '#f6fafa', MUT = '#5f7f8a', MINT = '#bfeee0', CORAL = '#ff7a59';
G.COL = { INK, ACC, ACCD, PAPER, MUT, MINT, CORAL };
G.round = (g, x, y, w, h, c, rad) => { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); const R = Math.min(rad === undefined ? Math.floor(h / 2) : rad, Math.floor(h / 2), Math.floor(w / 2));
  px.rect(g, x + R, y, w - R * 2, h, c); px.rect(g, x, y + R, w, h - R * 2, c);
  for (const [a, b] of [[x + R, y + R], [x + w - R - 1, y + R], [x + R, y + h - R - 1], [x + w - R - 1, y + h - R - 1]]) px.disc(g, a, b, R - .5, c); };
G.panel = (g, x, y, w, h, o = {}) => { G.round(g, x + 1, y + 2, w, h, o.shadow || '#b9cfd6', o.rad === undefined ? 8 : o.rad); G.round(g, x, y, w, h, o.c || '#ffffff', o.rad === undefined ? 8 : o.rad); };
G.text = (g, s, x, y, c = INK, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
G.wrapText = (g, s, x, y, w, c = INK, o = {}) => { const lines = E.font.wrap(s, w, o), lh = E.font.lineHeight(o) + (o.gap === undefined ? 2 : o.gap); lines.forEach((l, i) => G.text(g, l, x, y + i * lh, c, o)); return lines.length * lh; };

G.Pills = class {
  constructor(items, o = {}) { this.items = items; this.o = Object.assign({ dir: 'v', scale: 1, pad: 12, gap: 4, h: 18 }, o); this.i = o.start || 0; this.mt = -1; this.grow = items.map(() => 0); while (this.items[this.i] && this.items[this.i].disabled && this.i < items.length - 1) this.i++; this.t = 0; }
  widths() { const o = this.o; return this.items.map(it => o.w || (E.font.width(it.label, { scale: o.scale }) + o.pad * 2 + (it.sub ? 0 : 0))); }
  rect(i) {
    const o = this.o, W = G.game.W, H = G.game.H, ws = this.widths(), h = o.h * o.scale;
    if (o.dir === 'h') { const total = ws.reduce((a, b) => a + b + o.gap, -o.gap), ax = typeof o.x === 'function' ? o.x(W, H, total) : (o.x === undefined ? (W - total) / 2 : o.x), ay = typeof o.y === 'function' ? o.y(W, H) : (o.y === undefined ? H - h - 22 : o.y); let x = ax; for (let k = 0; k < i; k++) x += ws[k] + o.gap; return [x, ay, ws[i], h]; }
    const mw = Math.max(...ws), total = this.items.length * (h + o.gap) - o.gap, ax = typeof o.x === 'function' ? o.x(W, H, mw) : (o.x === undefined ? (W - mw) / 2 : o.x), ay = typeof o.y === 'function' ? o.y(W, H, total) : (o.y === undefined ? (H - total) / 2 : o.y);
    return [ax, ay + i * (h + o.gap), mw, h];
  }
  hit(p) { for (let i = 0; i < this.items.length; i++) { const [x, y, w, h] = this.rect(i); if (p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) return i; } return -1; }
  move(d) { let n = this.i; for (let k = 0; k < this.items.length; k++) { n = (n + d + this.items.length) % this.items.length; if (!this.items[n].disabled) break; } if (n !== this.i) { this.i = n; G.sfx('tick'); } }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) { G.sfx('cancel', { vol: .2 }); return; } G.sfx('pick'); if (it.on) it.on(it, this.i); if (this.o.onPick) this.o.onPick(it, this.i); }
  update(dt, I = G.game.input) {
    this.t += dt; const o = this.o, back = o.dir === 'h' ? 'left' : 'up', fwd = o.dir === 'h' ? 'right' : 'down';
    if (I.repeat(back, .35, .14)) this.move(-1); if (I.repeat(fwd, .35, .14)) this.move(1);
    if (o.cross) { if (I.repeat(o.dir === 'h' ? 'up' : 'left', .35, .14)) this.move(-1); if (I.repeat(o.dir === 'h' ? 'down' : 'right', .35, .14)) this.move(1); }
    const M = I.mouse, p = I.pointer && I.pointer();
    if (M && p && M.t !== this.mt) { this.mt = M.t; const h = this.hit(p); if (h >= 0 && !this.items[h].disabled && h !== this.i) { this.i = h; G.sfx('tick'); } }
    const c = I.clicked && I.clicked();
    if (c && !(G.Dev && G.Dev.isOpen && c[0] < G.game.W / 3)) { const h = this.hit(c); if (h >= 0) { this.i = h; this.pick(); return; } }
    if (I.pressed('confirm')) { this.pick(); return; }
    if (I.pressed('cancel') && o.onBack) { G.sfx('cancel', { vol: .2 }); o.onBack(); }
    this.grow = this.grow.map((v, i) => v + ((i === this.i ? 1 : 0) - v) * Math.min(1, dt * 14));
  }
  draw(g) {
    const o = this.o;
    this.items.forEach((it, i) => { const [x, y, w, h] = this.rect(i), k = Math.round((this.grow[i] || 0) * 2), f = i === this.i;
      G.round(g, x - k + 1, y - k + 2, w + k * 2, h + k * 2, '#9db8c1'); G.round(g, x - k, y - k, w + k * 2, h + k * 2, it.disabled ? '#dfe7ea' : f ? ACC : '#ffffff');
      const c = it.disabled ? '#90a4ac' : f ? '#ffffff' : INK, ly = y + Math.round((h - 7 * o.scale) / 2);
      G.text(g, it.label, x + w / 2, ly, c, { align: 'center', scale: o.scale });
      if (it.mark) G.text(g, it.mark, x + w - 11, ly, f ? '#fff' : ACCD, {});
      if (it.check) px.rect(g, x + 5, ly + 2, 3, 3, f ? '#fff' : ACC); });
  }
};

// Prompts: only here, showing what the player used last.
const CONFIRM = { confirm: 'Enter / Click', cancel: 'Esc / Right click', pause: 'Esc' };
G.promptLabel = (a, I = G.game.input) => {
  if (G.source(I) === 'pad' || I.lastDevice === 'gamepad') return I.label(a, 'gamepad');
  if (CONFIRM[a]) return CONFIRM[a];
  const k = I.label(a, 'keyboard'), m = I.label(a, 'mouse'); return m && m !== k && /click|wheel|button/i.test(m) ? k + ' / ' + m : k;
};
G.leanLabel = (I = G.game.input) => ({ pad: 'Left stick', keys: 'WASD', mouse: 'Move the mouse' })[G.source(I)];
G.prompt = (r, list, o = {}) => r.overlay(g => { // list: [[action or special, verb]]
  let x = r.W - 8; const y = (o.y === undefined ? r.H - 15 : o.y);
  for (let n = list.length - 1; n >= 0; n--) { const [a, v] = list[n], lab = a === 'lean' ? G.leanLabel() : G.promptLabel(a), s = lab + '  ' + v, w = E.font.width(s) + 10; x -= w; G.round(g, x + 1, y + 1, w, 12, '#9db8c1'); G.round(g, x, y, w, 12, '#ffffff'); G.text(g, lab, x + 5, y + 3, ACCD); G.text(g, v, x + 5 + E.font.width(lab + '  '), y + 3, INK); x -= 4; }
});

// The Plate: the game's signature. A white disc, the ring, the dot, a fading trail.
G.drawPlate = (g, bal, x, y, R = 26, o = {}) => {
  const wob = bal.lean > .75; px.disc(g, x + 1, y + 2, R + 1, '#9db8c1'); px.disc(g, x, y, R, '#ffffff'); px.disc(g, x, y, R - 2, wob ? '#ffeee8' : '#f2f8fa');
  px.rect(g, x - R + 3, y, R * 2 - 6, 1, '#dbe7ea'); px.rect(g, x, y - R + 3, 1, R * 2 - 6, '#dbe7ea');
  const rx = x + bal.ringX * R, ry = y - bal.ringY * R, rr = Math.max(3, bal.R * R), inR = bal.inRing;
  const N = 28; for (let i = 0; i < N; i++) { const a = i / N * 6.283; if (!inR && i % 2) continue; px.rect(g, rx + Math.cos(a) * rr, ry + Math.sin(a) * rr, inR ? 2 : 1, inR ? 2 : 1, inR ? '#37cfa6' : ACCD); }
  if (inR) { for (let i = 0; i < N; i++) { const a = i / N * 6.283 + (o.t || 0); px.rect(g, rx + Math.cos(a) * (rr + 1), ry + Math.sin(a) * (rr + 1), 1, 1, MINT); } }
  const t = bal.trail, n = t.length / 2; for (let i = 0; i < n; i++) { const a = i / n; if (a < .2) continue; const c = E.mix('#f2f8fa', CORAL, a * .8); px.rect(g, x + t[i * 2] * R, y - t[i * 2 + 1] * R, 2, 2, c); }
  const dx = x + bal.px * R, dy = y - bal.py * R; px.disc(g, dx, dy, 3, bal.stumbleT > 0 ? '#e0553a' : CORAL); px.disc(g, dx - 1, dy - 1, 1, '#ffd2c4');
};

G.starSprite = (g, x, y, on, s = 1, k = 1) => { const R = 6 * s * k, c = on ? '#f5c84b' : '#dbe6ea', d = on ? '#c99a1e' : '#b7c7cd', pts = (rr, ro) => { const o = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? rr * .45 : rr; o.push([x + Math.cos(a) * q, y + Math.sin(a) * q + ro]); } return o; }; px.poly(g, pts(R, 1), d); px.poly(g, pts(R, 0), c); };
G.starsFor = (def, pct) => { const s = def.stars, D = G.DEV; return pct >= s[2] * D.star3 ? 3 : pct >= s[1] * D.star2 ? 2 : pct >= s[0] * D.star1 ? 1 : 0; };

// a one-line HUD strip for an activity
G.hudTop = (g, r, left, right) => { if (left) { const w = E.font.width(left) + 12; G.round(g, 8, 8, w, 14, 'rgba(255,255,255,.92)'); G.text(g, left, 14, 12); } if (right) { const w = E.font.width(right) + 12, cx = r.W / 2 - w / 2; G.round(g, cx, 8, w, 14, '#ffffff'); G.text(g, right, cx + 6, 12); } };
G.fmtT = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// Dialog ----------------------------------------------------------------------------------------------------------
G.talk = new E.Dialog(game, { bg: ['#ffffff', '#eaf6f8'], border: '#2cc6e6', color: '#20404c', nameColor: '#14a8c8', voice: (ch, i, t) => { G.babble(t.name, ch); } });
G.talk.shadow = null;
G.speaker = who => {
  if (who === 'tare') return { name: 'TARE', portrait: G.tarePortrait('neutral'), portraitSize: 32 };
  if (who === 'birch' || who === 'alder') { G.iRigs = G.iRigs || {}; const rig = G.iRigs[who] = G.iRigs[who] || (() => { const q = G.instructorRig(who, 1.2); q.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); return q; })(); return { name: who.toUpperCase(), portrait: rig, portraitSize: 32 }; }
  if (G.CAST[who]) { G.rRigs = G.rRigs || {}; const rig = G.rRigs[who] = G.rRigs[who] || (() => { const q = G.regularRig(who, 1.2); q.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); return q; })(); return { name: G.CAST[who].name.toUpperCase(), portrait: rig, portraitSize: 32 }; }
  return { name: String(who).toUpperCase() };
};
G.say = (who, lines, o = {}) => { G.talkFace = o.face || null; G.talk.say(Array.isArray(lines) ? lines : [lines], Object.assign(G.speaker(who), o)); };
G.chat = (who, line, secs = 3.2) => { if (G.silentChat) return; G.talkFace = null; G.talk.say(line, Object.assign(G.speaker(who), { auto: secs, modal: false, place: 'top' })); };
G.coach = () => (G.state && G.state.instructor) || 'alder';
G.coachLine = key => { const c = G.coach(), b = G.LINES[c][key]; return Array.isArray(b) ? G.pick(b) : b; };
// a filled template line
G.fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

// member card -----------------------------------------------------------------------------------------------------
G.drawCard = (g, r, x, y, w, h, st, focused, o = {}) => {
  G.panel(g, x, y, w, h, { c: focused ? '#eafaff' : '#ffffff', shadow: focused ? ACC : '#b9cfd6' });
  if (!st) { G.text(g, o.empty || 'New Member', x + w / 2, y + h / 2 - 3, ACCD, { align: 'center' }); return; }
  if (o.rig) { o.rig.drawPortrait(g, x + 6, y + 6, 34, { zoom: 2.4, bg: '#d8f3fb' }); }
  G.text(g, st.name, x + 46, y + 8); G.text(g, 'Spine Age', x + 46, y + 22, MUT); G.text(g, String(st.age), x + 46 + E.font.width('Spine Age '), y + 22, CORAL); G.text(g, st.finished ? 'Stay complete' : 'Day ' + st.day, x + 46, y + 34, MUT);
};
