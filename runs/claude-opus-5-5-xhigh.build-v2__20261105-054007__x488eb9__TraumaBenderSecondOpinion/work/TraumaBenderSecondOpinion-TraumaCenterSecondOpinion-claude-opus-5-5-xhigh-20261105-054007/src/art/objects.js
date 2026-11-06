// How the things on the table look. Stamps go through the tissue painter (wet, lit, under the shading), overlays are hard pixels on top.
// defArt(type, { stamp(F, o, S, x, y), over(g, o, S, x, y, C), floor(g, ...) }). C: { t, cold (Long Breath), tool, OX, OY }. Draw never changes S.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, U = G.U;
const ART = G.ART = {};
const defArt = G.defArt = (type, spec) => { ART[type] = spec; };
const blink = (t, a = 1) => Math.sin(t * 6 * a) > 0;
const COL = { bracket: '#ffffff', guide: '#c48cff', dots: '#6cc8ff', hatch: '#6cf0a0', plus: '#ffe08a', burn: '#ffa23c', steel: '#d8e4ec', hush: '#5ff0e0', core: '#0b2a30', lav: '#bfa4ff', gold: '#f4d860' };
G.MARK = COL;

defArt('pool', {
  stamp(F, o, S, x, y) { const R = G.Op.poolR(o), id = o.id; F.stampDisc(x, y, R, 1.4, 'blood'); const a = id * 2.4; F.stampDisc(x + Math.cos(a) * R * .55, y + Math.sin(a) * R * .55, R * .62, 1.3, 'blood'); F.stampDisc(x + Math.cos(a + 2.1) * R * .5, y + Math.sin(a + 2.1) * R * .5, R * .55, 1.3, 'blood'); },
});
const lips = (F, o, x, y, open, len) => {
  const ca = Math.cos(o.ang || 0), sa = Math.sin(o.ang || 0), hl = len / 2 + 2, A = [x - ca * hl, y - sa * hl], B = [x + ca * hl, y + sa * hl];
  if (open > .02) { const w = 1.5 + open * ((o.gap || 8) - 2.4), n = 8; for (let i = 0; i <= n; i++) { const u = i / n, k = Math.sin(u * Math.PI), X = A[0] + (B[0] - A[0]) * u, Y = A[1] + (B[1] - A[1]) * u, W = Math.max(1, w * k + .6); F.stampDisc(X - sa * (W + 2), Y + ca * (W + 2), 2.8, 2.4); F.stampDisc(X + sa * (W + 2), Y - ca * (W + 2), 2.8, 2.4); F.stampDisc(X, Y, W, -4 * open - 1, 'wound'); } }
  else F.stampLine([A, B], 1.2, .8, 'wall');
};
const sewnBits = (g, o, S, ox, oy) => { for (let i = 0; i < o.sewn; i++) { const s = o.stitches[i], mx = (s.a[0] + s.b[0]) / 2 + ox, my = (s.a[1] + s.b[1]) / 2 + oy, dx = (s.b[0] - s.a[0]) * .24, dy = (s.b[1] - s.a[1]) * .24; px.line(g, Math.round(mx - dx), Math.round(my - dy), Math.round(mx + dx), Math.round(my + dy), '#5ad0ff'); px.dot(g, Math.round(mx - dx), Math.round(my - dy), '#ffffff'); px.dot(g, Math.round(mx + dx), Math.round(my + dy), '#ffffff'); } };
const sewMarks = (g, o, S, C) => { const st = G.Op.nextStitch(S, o); if (!st) return; const c = blink(C.t, 1) || C.tool === 'suture' ? COL.dots : '#2a6a90'; Pix.pair(g, st.a, st.b, c, C.OX, C.OY); px.dot(g, Math.round((st.a[0] + st.b[0]) / 2 + C.OX), Math.round((st.a[1] + st.b[1]) / 2 + C.OY), '#6cc8ff'); for (let i = o.sewn + 1; i < o.n; i++) { const q = o.stitches[i]; px.dot(g, Math.round(q.a[0] + C.OX), Math.round(q.a[1] + C.OY), '#2a6a90'); px.dot(g, Math.round(q.b[0] + C.OX), Math.round(q.b[1] + C.OY), '#2a6a90'); } };
defArt('wound', { stamp(F, o, S, x, y) { lips(F, o, x, y, 1 - o.sewn / o.n, o.len || 30); }, over(g, o, S, x, y, C) { sewnBits(g, o, S, C.OX, C.OY); sewMarks(g, o, S, C); } });
defArt('arteryTear', {
  stamp(F, o, S, x, y) { const ca = Math.cos(o.ang || 0), sa = Math.sin(o.ang || 0), L = (o.len || 16) / 2 + 8; F.stampLine([[x - ca * L, y - sa * L], [x + ca * L, y + sa * L]], 4, 2.2 + S.beatV * 1.5, 'artery'); lips(F, o, x, y, 1 - o.sewn / o.n, o.len || 16); },
  over(g, o, S, x, y, C) { sewnBits(g, o, S, C.OX, C.OY); sewMarks(g, o, S, C); const open = 1 - o.sewn / o.n; if (open > 0 && S.beatV > .35) { const k = S.beatV * 7 * open; for (let i = 0; i < 3; i++) { const a = -1.57 + (i - 1) * .5; px.line(g, Math.round(x), Math.round(y), Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), i === 1 ? '#ff4a3a' : '#c81e1e'); } } },
});
const coverStamp = (F, o, x, y) => { const c = o.cells, x0 = x - c.w * 2, y0 = y - c.h * 2; for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) if (c.g[j * c.w + i] === 1) F.stampDisc(x0 + (i + .5) * 4, y0 + (j + .5) * 4, 3, .8, 'gel'); };
const coverHatch = (g, o, x, y, C) => { const c = o.cells, x0 = x - c.w * 2, y0 = y - c.h * 2, p = (C.t * 6) | 0, col = COL.hatch; for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) if (c.g[j * c.w + i] === 0) for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) if (((a + b + p + i + j) & 3) === 0) px.dot(g, Math.round(x0 + i * 4 + a), Math.round(y0 + j * 4 + b), col); };
defArt('laceration', {
  stamp(F, o, S, x, y) { const r = o.r || 9, a = o.ang || 0, ca = Math.cos(a) * r * .75, sa = Math.sin(a) * r * .75; F.stampLine([[x - ca, y - sa], [x + ca, y + sa]], 1.6, -2.4, 'wound'); coverStamp(F, o, x, y); },
  over(g, o, S, x, y, C) { coverHatch(g, o, x, y, C); },
});
defArt('patch', { stamp(F, o, S, x, y) { F.stampDisc(x, y, o.r, 1.2, 'artery'); coverStamp(F, o, x, y); }, over(g, o, S, x, y, C) { coverHatch(g, o, x, y, C); } });
defArt('bleeder', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 3.2, -1.6, 'wound'); },
  over(g, o, S, x, y, C) { Pix.burnRing(g, x, y, 6 + (blink(C.t, .8) ? 0 : 1)); if (!o.paused) { const k = S.beatV * 8; if (k > 1.5) for (let i = 0; i < 2; i++) { const a = -1.2 - i * .7; px.line(g, Math.round(x), Math.round(y), Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), '#e0241e'); } } if (o.timer > 0 && o.timer0) { const f = o.timer / o.timer0; const n = Math.ceil(f * 8); for (let i = 0; i < n; i++) { const a = i / 8 * 6.283 - 1.57; px.dot(g, Math.round(x + Math.cos(a) * 10), Math.round(y + Math.sin(a) * 10), f < .3 ? '#ff5a4a' : '#ffd070'); } } },
});
defArt('polyp', { stamp(F, o, S, x, y) { F.stampDisc(x, y, 6, 5, 'bowel'); }, over(g, o, S, x, y, C) { Pix.burnRing(g, x, y, 8 + (blink(C.t, .7) ? 0 : 1)); const b = o.burnT || 0; if (b > 0) px.disc(g, Math.round(x), Math.round(y), Math.min(4, b * 8), '#2a1a18'); } });
defArt('mass', {
  stamp(F, o, S, x, y) { const lift = o.pull.prog / o.pull.depth; F.stampDisc(x, y, o.rx, 7 + lift * 4, 'liver'); F.stampDisc(x - 4, y - 3, o.rx * .6, 8 + lift * 4, 'bowel'); if (o.ringed) F.stampLine(U.ring(o.ox + (x - o.x), o.oy + (y - o.y), o.rx + 1, o.ry + 1, 20), 1.1, -2, 'wound'); },
  over(g, o, S, x, y, C) { if (o.ringed) { Pix.brackets(g, x, y, 12 + (blink(C.t, .7) ? 0 : 1)); if (!o.free) Pix.arrow(g, x + o.pull.ax * 13, y + o.pull.ay * 13, o.pull.ax, o.pull.ay, 12, COL.bracket); } },
});
defArt('shard', {
  stamp(F, o, S, x, y) { F.stampDisc(o.ox + (x - o.x), o.oy + (y - o.y), 4.5, -2.5, 'wound'); },
  over(g, o, S, x, y, C) {
    const a = Math.atan2(o.pull.ay, o.pull.ax), L = (o.len || 12), W = o.variant === 'cork' ? 5 : o.variant === 'frag' ? 4 : 3, ca = Math.cos(a), sa = Math.sin(a), body = o.variant === 'cork' ? '#c89a5a' : o.variant === 'frag' ? '#7a848e' : '#bfe8ee', dark = o.variant === 'cork' ? '#7a5428' : o.variant === 'frag' ? '#3c444c' : '#5a98a8', out = Math.min(1, .55 + o.pull.prog / o.pull.depth * .45);
    const tip = [x + ca * L * out, y + sa * L * out], baseL = [x - ca * 3 - sa * W, y - sa * 3 + ca * W], baseR = [x - ca * 3 + sa * W, y - sa * 3 - ca * W], mid = [x + ca * L * .3 - sa * W * .4, y + sa * L * .3 + ca * W * .4];
    px.poly(g, [tip, baseL, baseR], body); px.poly(g, [tip, baseL, mid], dark); px.line(g, Math.round(tip[0]), Math.round(tip[1]), Math.round(x + sa * W * .3), Math.round(y - ca * W * .3), '#ffffff');
    if (!o.free) { Pix.brackets(g, x, y, 8 + (blink(C.t, .7) ? 0 : 1)); if (C.tool === 'forceps') Pix.arrow(g, tip[0] + ca * 2, tip[1] + sa * 2, ca, sa, Math.max(6, o.pull.depth - o.pull.prog), '#ffffff'); }
  },
});
defArt('hook', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 5, -2.2, 'wound'); },
  over(g, o, S, x, y, C) {
    const p = o.pull, ca = p.ax, sa = p.ay, L = 26; px.line(g, Math.round(x - ca * 6), Math.round(y - sa * 6), Math.round(x + ca * L), Math.round(y + sa * L), '#8a98a4', 3); px.line(g, Math.round(x - ca * 6), Math.round(y - sa * 6), Math.round(x + ca * L), Math.round(y + sa * L), '#e8f0f8');
    for (let i = 0; i < 2; i++) { const bx = x + ca * (2 + i * 8), by = y + sa * (2 + i * 8), s = i ? 1 : -1; px.line(g, Math.round(bx), Math.round(by), Math.round(bx - ca * 5 - sa * s * 6), Math.round(by - sa * 5 + ca * s * 6), o.barbs > i ? '#ffffff' : '#44505a'); }
    Pix.brackets(g, x + ca * 10, y + sa * 10, 9); if (o.barbs <= 0 && !o.free && C.tool === 'forceps') Pix.arrow(g, x + ca * (L + 2), y + sa * (L + 2), ca, sa, 12, '#ffffff');
  },
});
defArt('clot', { stamp(F, o, S, x, y) { F.stampDisc(x, y, 7, 4, o.dosed ? 'liver' : 'clot'); }, over(g, o, S, x, y, C) { if (!o.dosed) Pix.plusRing(g, x, y, 9, COL.plus); else if (!o.free) { Pix.brackets(g, x, y, 8); Pix.arrow(g, x + o.pull.ax * 9, y + o.pull.ay * 9, o.pull.ax, o.pull.ay, 8, '#ffffff'); } } });
defArt('nerve', { over(g, o, S, x, y, C) { for (let i = 1; i < o.pts.length; i++) { const a = o.pts[i - 1], b = o.pts[i]; const p = Math.sin(C.t * 3 + i) > .6 ? '#fff4b0' : COL.gold; px.line(g, Math.round(a[0] + C.OX), Math.round(a[1] + C.OY), Math.round(b[0] + C.OX), Math.round(b[1] + C.OY), p, o.w >= 2 ? 2 : 1); } } });
defArt('guide', {
  stamp(F, o, S, x, y, C) { if (o.prog > 1) { const pts = [], n = Math.max(2, Math.ceil(o.prog / 3)); for (let i = 0; i <= n; i++) { const q = U.polyAt(o.pts, o.prog * i / n); pts.push([q.x + C.OX, q.y + C.OY]); } F.stampLine(pts, 1.3, -2.4, 'wound'); } },
  over(g, o, S, x, y, C) { Pix.dashed(g, o.pts, o.prog, o.beatLock && S.beatV > .3 ? '#ff5a6a' : COL.guide, 4, 3, C.OX, C.OY, -C.t * 14, o.short ? 1 : 2); const p = U.polyAt(o.pts, o.prog), X = Math.round(p.x + C.OX), Y = Math.round(p.y + C.OY); px.disc(g, X, Y, 2, '#ffffff'); Pix.ring(g, X, Y, 4 + (blink(C.t, .8) ? 0 : 1), COL.guide); if (o.label) Pix.text(g, o.label, X + 6, Y - 3, COL.guide); },
});
// a finished cut stays as a dark line, drawn from marks
G.drawMarks = (F, S, OX, OY) => { for (const m of S.marks) { if (m[0] === 'char') F.stampDisc(m[1] + OX, m[2] + OY, m[3], .4, 'char'); else if (m[0] === 'line') F.stampLine(m[1].map(p => [p[0] + OX, p[1] + OY]), m[2] || 1.2, -1.2, 'wound'); } };

// ------------------------------------------------------------------ the device of Case 9
defArt('screw', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 5, 2.4, 'steel'); },
  over(g, o, S, x, y, C) { const a = o.turn; px.line(g, Math.round(x - Math.cos(a) * 3), Math.round(y - Math.sin(a) * 3), Math.round(x + Math.cos(a) * 3), Math.round(y + Math.sin(a) * 3), '#10181c'); Pix.brackets(g, x, y, 7); const f = o.turn / o.need; for (let i = 0; i < 12; i++) if (i / 12 < f) { const b = i / 12 * 6.283 - 1.57; px.dot(g, Math.round(x + Math.cos(b) * 10), Math.round(y + Math.sin(b) * 10), '#ffffff'); } },
});
defArt('lead', { stamp(F, o, S, x, y) { F.stampDisc(x, y, 4, 1.6, 'gold'); }, over(g, o, S, x, y, C) { Pix.burnRing(g, x, y, 7); const f = Math.min(1, (o.burnT || 0) / .8); px.rect(g, Math.round(x) - 6, Math.round(y) + 9, Math.round(f * 12), 2, '#ffd070'); Pix.text(g, 'SOLDER', x - 15, y - 16, COL.burn); } });
const SYM = { tri: (g, x, y, c) => px.poly(g, [[x, y - 4], [x - 4, y + 3], [x + 4, y + 3]], c), dot: (g, x, y, c) => px.disc(g, x, y, 3, c), box: (g, x, y, c) => px.rect(g, x - 3, y - 3, 7, 7, c) };
G.drawSym = (g, sym, x, y, c) => SYM[sym](g, Math.round(x), Math.round(y), c);
defArt('wire', {
  over(g, o, S, x, y, C) { const col = o.sym === 'tri' ? '#e8c43a' : o.sym === 'dot' ? '#e8606a' : '#7ac8e8'; px.line(g, Math.round(x - 22), Math.round(y), Math.round(x + 22), Math.round(y + (o.bend || 0)), col, 2); SYM[o.sym](g, Math.round(x - 30), Math.round(y), col); if (S.flags.bypassed) Pix.ring(g, x, y + (o.bend || 0) / 2, 5, COL.guide, 2); },
});
defArt('can', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 22, 8, 'steel'); },
  over(g, o, S, x, y, C) { px.rect(g, Math.round(x) - 14, Math.round(y) - 9, 28, 18, '#28343c'); Pix.ellRing(g, x, y, 18, 12, '#8aa0b0'); const on = Math.sin(C.t * 8) > 0; px.disc(g, Math.round(x) + 9, Math.round(y) - 4, 2, on ? '#ff4a3a' : '#5a1410'); Pix.text(g, 'St.', x - 11, y - 3, '#8aa0b0'); if (o.liftable) { Pix.brackets(g, x, y, 22); Pix.arrow(g, x, y - 24, o.pull.ax, o.pull.ay, 12, '#ffffff'); } },
});
defArt('retractorHandle', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 5, 4, 'steel'); },
  over(g, o, S, x, y, C) { px.line(g, Math.round(x), Math.round(y), Math.round(o.tx + C.OX), Math.round(o.ty + C.OY), '#aab8c4', 2); Pix.brackets(g, x, y, 8 + (blink(C.t, .7) ? 0 : 1)); if (S.flags.quillHolds) Pix.text(g, 'QUILL HOLDS', x - 28, y + 11, '#bfe6dc'); else if (!o.gripped) Pix.text(g, 'HOLD', x - 10, y + 11, '#ffffff'); },
});
defArt('windowed', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 12, S.flags.windowOpen ? 6 : 1, S.flags.windowOpen ? 'hush' : 'wall'); },
  over(g, o, S, x, y, C) { if (S.flags.windowOpen) Pix.ring(g, x, y, 14, COL.guide, 2); else Pix.ring(g, x, y, 14, '#444a50', 2); },
});
})();
