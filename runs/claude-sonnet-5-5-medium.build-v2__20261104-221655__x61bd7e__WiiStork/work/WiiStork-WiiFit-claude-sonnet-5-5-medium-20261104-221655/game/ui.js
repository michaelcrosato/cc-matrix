// ui: bright round canvas widgets (Pills), prompts, captions, dialog, stars
(() => {
const E = My3D2dge, G = window.G, { px } = E;
const INK = '#20404c', ACC = '#2cc6e6', ACC2 = '#14a8c8', WHITE = '#f6fafa', MUTED = '#5f7f8a';
G.C = { INK, ACC, ACC2, WHITE, MUTED, CORAL: '#ff7a59', MINT: '#bfeee0', GOLD: '#f5b700', DANGER: '#e0553a' };
G.rr = (g, x, y, w, h, c) => { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); px.rect(g, x + 2, y, w - 4, h, c); px.rect(g, x + 1, y + 1, w - 2, h - 2, c); px.rect(g, x, y + 2, w, h - 4, c); };
G.txt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c || INK, Object.assign({ outline: false }, o || {}));
G.tw = (s, sc) => E.font.width(s, { scale: sc || 1 });
G.wrap = (s, w, sc) => E.font.wrap(s, w, { scale: sc || 1 });
G.drawStar = (g, x, y, rad, c, c2) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? rad * .45 : rad; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } px.poly(g, p, c || G.C.GOLD); if (c2) { px.disc(g, x, y, rad * .25, c2); } };
G.drawStars = (g, x, y, n, rad, total) => { total = total || 3; for (let i = 0; i < total; i++) G.drawStar(g, x + (i - (total - 1) / 2) * rad * 2.4, y, rad, i < n ? '#f5b700' : '#cfdde1', i < n ? '#fff3b0' : null); };

// ---- device-aware prompts -------------------------------------------------------------------------
G.keyLabel = (input, a) => {
  input = input || G.game.input; const dev = input.lastDevice;
  if (dev === 'gamepad' || dev === 'touch') return input.label(a, 'gamepad');
  const k = input.label(a, 'keyboard'), codes = input.map[a] || [], m = codes.some(c => /^Mouse/.test(c)) ? input.label(a, 'mouse') : '';
  return m && m !== k ? k + ' / ' + m : k;
};
G.leanLabel = input => { input = input || G.game.input; const s = G.leanSrc || 'key'; return input.lastDevice === 'gamepad' ? 'Left stick' : s === 'mouse' ? 'Move the mouse' : 'WASD'; };
G.prompt = (r, items, o) => {
  o = o || {}; const input = o.input || G.game.input;
  const parts = items.map(([a, verb]) => (a[0] === '@' ? a.slice(1) : G.keyLabel(input, a)) + ' ' + verb);
  r.overlay(g => {
    let x = r.W - 8; const y = r.H - 18, ca = G.game.cornerArea && G.game.cornerArea(); if (ca && ca.y1 > r.H - 30) x = Math.min(x, ca.x0 - 4);
    for (let i = parts.length - 1; i >= 0; i--) { const w = G.tw(parts[i]) + 12; G.rr(g, x - w, y, w, 13, 'rgba(255,255,255,.88)'); G.rr(g, x - w, y, w, 13, WHITE); G.txt(g, parts[i], x - w + 6, y + 3, INK); x -= w + 4; }
  });
};

// ---- Pills -----------------------------------------------------------------------------------------------
class Pills {
  constructor(items, o) { this.items = items; this.i = 0; this.o = Object.assign({ x: 'center', y: 96, w: 150, h: 19, gap: 4, scale: 1, cancel: true, dir: 'v' }, o || {}); this.rects = []; this.lastPtr = null; this.pop = 0; this.skipFirst = true; }
  first() { const i = this.items.findIndex(it => !it.disabled); this.i = Math.max(0, i); }
  update(dt, input) {
    input = input || G.game.input; this.pop += dt;
    const n = this.items.length, vertical = this.o.dir === 'v'; let res = null;
    const mv = d => { let k = this.i; for (let j = 0; j < n; j++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; this.pop = 0; G.snd('tick'); } };
    if (input.repeat(vertical ? 'up' : 'left')) mv(-1); else if (input.repeat(vertical ? 'down' : 'right')) mv(1);
    const it = this.items[this.i];
    if (it && it.choices && !it.disabled) { const l = input.repeat(vertical ? 'left' : 'up'), r2 = input.repeat(vertical ? 'right' : 'down'); if (l || r2) { it.idx = (it.idx + (r2 ? 1 : -1) + it.choices.length) % it.choices.length; G.snd('tick'); res = { change: this.i }; } }
    const p = input.pointer && input.pointer();
    if (p && (!this.lastPtr || Math.abs(p[0] - this.lastPtr[0]) + Math.abs(p[1] - this.lastPtr[1]) > 1)) { this.lastPtr = p; const h = this.hit(p[0], p[1]); if (h >= 0 && h !== this.i && !this.items[h].disabled) { this.i = h; this.pop = 0; G.snd('tick'); } }
    const c = input.clicked && input.clicked();
    if (c) { const h = this.hit(c[0], c[1]); if (h >= 0 && !this.items[h].disabled) { this.i = h; if (this.items[h].choices && !this.items[h].noClickPick) { this.items[h].idx = (this.items[h].idx + 1) % this.items[h].choices.length; G.snd('tick'); return { change: h }; } G.snd('ok'); return { pick: h }; } }
    if (input.pressed('confirm') && it && !it.disabled) { if (it.choices && !it.pickable) { it.idx = (it.idx + 1) % it.choices.length; G.snd('tick'); return { change: this.i }; } G.snd('ok'); return { pick: this.i }; }
    if (this.o.cancel && input.pressed('cancel')) { G.snd('back'); return { cancel: true }; }
    return res;
  }
  hit(x, y) { for (let i = 0; i < this.rects.length; i++) { const q = this.rects[i]; if (x >= q[0] && x < q[0] + q[2] && y >= q[1] && y < q[1] + q[3]) return i; } return -1; }
  label(it) { return it.choices ? it.label + ': ' + it.choices[it.idx] : it.label; }
  draw(r) {
    const o = this.o, n = this.items.length, W = o.w, H = o.h, vertical = o.dir === 'v', tot = vertical ? n * (H + o.gap) - o.gap : n * (W + o.gap) - o.gap;
    this.rects.length = 0;
    r.overlay(g => {
      for (let i = 0; i < n; i++) {
        const it = this.items[i], foc = i === this.i;
        let x = vertical ? (o.x === 'center' ? (r.W - W) / 2 : o.x) : (o.x === 'center' ? (r.W - tot) / 2 : o.x) + i * (W + o.gap);
        let y = vertical ? (o.y === 'center' ? (r.H - tot) / 2 : o.y) + i * (H + o.gap) : o.y;
        let w = W, h = H; if (foc) { const k = Math.min(1, this.pop * 8), gr = 1 + 3 * k; x -= gr / 2; w += gr; y -= gr / 4; h += gr / 2; }
        this.rects[i] = [x, y, w, h];
        G.rr(g, x, y + 1, w, h, 'rgba(32,64,76,.25)'); G.rr(g, x, y, w, h, foc ? ACC2 : '#c8dde2'); G.rr(g, x + 1, y + 1, w - 2, h - 2, foc ? ACC : (it.disabled ? '#e6eef0' : WHITE));
        const lab = this.label(it), sc = o.scale; G.txt(g, lab, x + w / 2, y + (h - 7 * sc) / 2 + 0.5, foc ? '#ffffff' : it.disabled ? '#9db3ba' : INK, { align: 'center', scale: sc, shadow: foc ? '#0e7d96' : undefined });
        if (it.sub && foc) G.txt(g, it.sub, x + w / 2, y + h + 3, MUTED, { align: 'center' });
      }
    });
  }
}
G.Pills = Pills;

// ---- captions (Tare's, the instructor's): one thought, two lines at most ----------------------------------------
G.cap = null;
G.caption = (text, who, secs) => { G.cap = { text, who: who || 'Tare', t: 0, dur: secs || Math.max(2.6, text.length / 14) }; const m = text; if (who) G.capTalk(who, m); };
G.capTalk = (who, text) => { let i = 0; const id = G.cap; const tick = () => { if (G.cap !== id || i >= text.length) return; G.babble(who, text[i], 1); i += 2; if (G.game.audio && G.game.audio.ctx) setTimeout(tick, 45 / (G.CAST && (Object.values(G.CAST).find(c => c.name === who) || {}).speed || 1)); }; tick(); };
G.tick = dt => { if (G.cap) { G.cap.t += dt; if (G.cap.t > G.cap.dur) G.cap = null; } };
G.drawCaption = (r, y, cx) => {
  const c = G.cap; if (!c) return; const lines = G.wrap(c.text, 240, 1).slice(0, 2), w = Math.max(...lines.map(l => G.tw(l))) + 16, h = lines.length * 9 + 8, x = Math.max(4, (cx == null ? r.W / 2 : cx) - w / 2); y = y == null ? r.H - 64 : y;
  const a = G.clamp(Math.min(c.t * 6, (c.dur - c.t) * 6), 0, 1); if (a <= 0) return;
  r.overlay(g => px.blend(g, a, 'normal', () => { G.rr(g, x, y + 1, w, h, 'rgba(32,64,76,.25)'); G.rr(g, x - 1, y - 1, w + 2, h + 2, ACC); G.rr(g, x, y, w, h, WHITE); G.txt(g, c.who, x + 6, y - 9, ACC2, { shadow: undefined }); lines.forEach((l, i) => G.txt(g, l, x + 8, y + 4 + i * 9, INK)); }));
};

// ---- modal dialog (Tare's portrait) -----------------------------------------------------------------------
G.makeTalk = game => {
  const t = new E.Dialog(game, { voice: G.voice, bg: ['#ffffff', '#eaf6f8'], border: ACC, color: INK, nameColor: ACC2, lines: 2, width: 330, speed: 45 });
  t.shadow = null; return t;
};
G.say = (lines, o) => { const t = G.talk; if (!t) return; const who = (o && o.name) || 'Tare'; t.name = who; if (who === 'Tare') { t.say(lines, Object.assign({ name: 'Tare', portrait: G.tareFace }, o || {})); } else t.say(lines, Object.assign({ name: who }, o || {})); };

// ---- big number ------------------------------------------------------------------------------------------------
G.bigNum = (g, n, x, y, sc, col) => E.font.text(g, String(n), x, y, col || ACC2, { scale: sc || 3, align: 'center', outline: false, shadow: '#bfe3ea' });
// bright studio background shades
G.sky = (r, y0, y1) => { for (let y = 0; y < y1 - y0; y += 2) { const t = y / (y1 - y0); r.overlay(g => px.rect(g, 0, y0 + y, r.W, 2, E.mix('#8fd3f4', '#d8f3fb', t))); } };
})();
