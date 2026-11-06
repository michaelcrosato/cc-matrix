// HUSH's look and sound: teal bioluminescence with a dark core, lavender on bosses. Teal always means HUSH. Every attack telegraphs.
// Draw reads S and changes nothing. Sounds and presentation come from the sim's events (G.FeelExtra).
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, U = G.U, T = G.TUNING, defArt = G.defArt;
const TEAL = '#5ff0e0', CORE = '#0b2a30', LAV = '#bfa4ff';
const halo = (g, x, y, r, c = TEAL, a = .3) => px.ddisc(g, Math.round(x), Math.round(y), r, c, a);
const blob = (g, x, y, r, c = TEAL) => { px.disc(g, Math.round(x), Math.round(y), r + 1, CORE); px.disc(g, Math.round(x), Math.round(y), r, c); px.dot(g, Math.round(x) - 1, Math.round(y) - 1, '#ffffff'); };

defArt('bead', { over(g, o, S, x, y, C) {
  const X = Math.round(x), Y = Math.round(y), air = o.state === 'air', sq = o.squash;
  if (o.planned || air) { const k = air ? 0 : Math.max(0, 1 - (o.t - (T.staccatoBeat - .5)) / .5), R = 4 + k * 14, tx = o.tx + C.OX, ty = o.ty + C.OY; Pix.ring(g, tx, ty, R, o.bite ? '#ff7a6a' : TEAL, 2); if (o.bite) px.rect(g, Math.round(tx) - 1, Math.round(ty) - 1, 3, 3, '#ff7a6a'); }
  const lift = air ? Math.sin(Math.min(1, o.t / .22) * 3.14) * 9 : 0; if (lift) px.ell(g, X, Y + 1, 3, 1, '#04140f');
  const rx = 3 + sq * 2, ry = Math.max(1, 3 - sq * 1.5); halo(g, X, Y - lift, 8); px.ell(g, X, Math.round(Y - lift), rx, ry, CORE); px.ell(g, X, Math.round(Y - lift), Math.max(1, rx - 1), Math.max(1, ry - 1), TEAL); px.dot(g, X - 1, Math.round(Y - lift) - 1, '#ffffff');
  if (!air) Pix.burnRing(g, X, Y, 6);
} });
defArt('nest', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 11, 5, 'hush'); F.stampDisc(x - 2, y - 2, 6, 6, o.shellOff ? 'wound' : 'hush'); },
  over(g, o, S, x, y, C) { halo(g, x, y, 18, TEAL, .28 + Math.sin(C.t * 5) * .08); if (!o.shellOff) { Pix.ring(g, x, y, 13 + (Math.sin(C.t * 6) > 0 ? 0 : 1), '#c48cff', 2); Pix.text(g, 'SLASH', x - 14, y - 22, '#c48cff'); } else if (!o.free) { Pix.brackets(g, x, y, 9); Pix.arrow(g, x + o.pull.ax * 10, y + o.pull.ay * 10, o.pull.ax, o.pull.ay, 10, '#ffffff'); } },
});
const chain = (o, S, C) => { const pts = [], n = Math.max(3, o.segs * 1.5 | 0); if (o.state === 'roam') for (let i = 0; i <= n; i++) { const p = U.polyAt(o.route, ((o.s - i * 6) % o.routeLen + o.routeLen) % o.routeLen); pts.push([p.x + C.OX, p.y + C.OY]); } return pts; };
defArt('legato', {
  alwaysStamp: true,
  stamp(F, o, S, x, y, C) { const pts = chain(o, S, C); if (pts.length) F.stampLine(pts, o.segs <= 4 ? 4 : 6, 5 + Math.sin(C.t * 6) * 1); else if (o.anchor) F.stampDisc(o.anchor[0] + C.OX, o.anchor[1] + C.OY, 5, -2, 'wound'); },
  over(g, o, S, x, y, C) {
    if (o.state === 'roam') { if (o.hidden && !(o.marked > 0) && !(S.dev && S.dev.reveal)) return; halo(g, x, y, 11); blob(g, x, y, 3); return; }
    const a = o.anchor; if (!a) return; const ax = a[0] + C.OX, ay = a[1] + C.OY, zx = o.zone[0] + C.OX, zy = o.zone[1] + C.OY;
    px.line(g, Math.round(ax), Math.round(ay), Math.round(x), Math.round(y), TEAL, 3); px.line(g, Math.round(ax), Math.round(ay), Math.round(x), Math.round(y), CORE); const len = Math.hypot(x - ax, y - ay), n = len / 6 | 0; for (let i = 1; i <= n; i++) { const u = i * 6 / len, X = ax + (x - ax) * u, Y = ay + (y - ay) * u; if (i % 4 === 0) px.rect(g, Math.round(X) - 2, Math.round(Y) - 2, 4, 4, '#ffffff'); else px.dot(g, Math.round(X), Math.round(Y), '#c8fff8'); }
    halo(g, x, y, 10); blob(g, x, y, 3); if (o.state === 'surfaced') { Pix.brackets(g, x, y, 7 + (Math.sin(C.t * 6) > 0 ? 0 : 1)); const f = Math.max(0, o.surT / ((o.surfaceT ?? 7) + 3)); px.rect(g, Math.round(x) - 8, Math.round(y) + 10, Math.round(16 * f), 2, TEAL); }
    if (S.hands.some(h => h.held === o.id) || o.state === 'clamped') { Pix.ring(g, zx, zy, 18, o.barbOut ? '#ffd36a' : '#3a7a78', 2); if (o.barbOut) Pix.text(g, 'CLAMP', zx - 14, zy - 28, '#ffd36a'); }
    if (o.state === 'clamped') { px.rect(g, Math.round(x) - 6, Math.round(y) - 2, 12, 4, '#9aaab8'); px.dot(g, Math.round(x), Math.round(y), '#ffffff'); }
  },
});
defArt('barb', { over(g, o, S, x, y, C) { const X = Math.round(x), Y = Math.round(y); px.line(g, X - 3, Y + 3, X + 3, Y - 3, '#ffffff', 2); px.line(g, X + 3, Y - 3, X + 7, Y - 1, '#ffffff'); Pix.burnRing(g, X, Y, 7 + (Math.sin(C.t * 7) > 0 ? 0 : 1)); } });
defArt('tremolo', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 18, 8, o.stage > 1 ? 'wound' : 'lav'); F.stampDisc(x - 3, y - 3, 10, 9, 'hush'); },
  over(g, o, S, x, y, C) {
    const sh = o.amp * 2; const X = Math.round(x + Math.sin(C.t * 57) * sh), Y = Math.round(y + Math.cos(C.t * 61) * sh);
    halo(g, X, Y, 26, LAV, .3 * Math.max(.2, o.amp)); Pix.ring(g, x, y, 70, '#3a5a68', 3);
    if (o.stage === 1) { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + C.t * .3; px.line(g, Math.round(X + Math.cos(a) * 10), Math.round(Y + Math.sin(a) * 8), Math.round(X + Math.cos(a) * 17), Math.round(Y + Math.sin(a) * 13), TEAL); } }
    else if (o.stage === 2) { Pix.burnRing(g, X, Y, 15 + (Math.sin(C.t * 7) > 0 ? 0 : 1)); const f = o.burn / o.burnNeedAll; px.rect(g, X - 15, Y + 19, 30, 3, '#123034'); px.rect(g, X - 15, Y + 19, Math.round(30 * f), 3, '#ffa23c'); if (o.pinT > 0) { Pix.brackets(g, X, Y, 12, '#ffffff'); } else if (o.crawling) Pix.text(g, 'PIN', X - 8, Y - 26, '#ffffff'); }
    else if (!o.free) { Pix.brackets(g, X, Y, 10); Pix.arrow(g, X + o.pull.ax * 12, Y + o.pull.ay * 12, o.pull.ax, o.pull.ay, 14, '#ffffff'); }
    blob(g, X, Y, 4, o.stage > 1 ? LAV : TEAL);
  },
});
defArt('reed', { over(g, o, S, x, y, C) {
  const c = S.objs.find(q => q.id === o.owner), cx = c ? c.x + C.OX : x, cy = c ? c.y + C.OY : y, flare = G.beatWindow(S) && !o.sedated;
  const w = o.sedated ? 0 : Math.sin(C.t * 56 + o.id) * 2.4; px.line(g, Math.round(cx), Math.round(cy), Math.round(x + w), Math.round(y - w * .6), o.sedated ? '#3a5a68' : flare ? '#ffffff' : TEAL, flare ? 2 : 1);
  px.ell(g, Math.round(x + w), Math.round(y), 4, 3, o.sedated ? '#3a5a68' : flare ? '#ffffff' : TEAL); if (flare) halo(g, x, y, 11, '#ffffff', .4);
  if (!o.sedated) Pix.plusRing(g, x + w, y, 8 + (flare ? 1 : 0), flare ? '#ffffff' : G.MARK.plus);
} });
// ---- Da Capo
const repeatSign = (g, x, y, s, c, flip) => { const h = 18 * s, X = Math.round(x), Y = Math.round(y); px.rect(g, X, Y - h, 3 * s, h * 2, c); px.rect(g, X + (flip ? -5 : 5) * s, Y - h, s, h * 2, c); for (const dy of [-5, 5]) px.disc(g, X + (flip ? 5 : -5) * s, Y + dy * s, 2 * s, c); };
defArt('dacapo', { over(g, o, S, x, y, C) {
  const sp = o.spread ?? 92, x0 = x - sp - 34, x1 = x + sp + 34; for (let i = 0; i < 5; i++) { const yy = Math.round(y + (i - 2) * 6 + Math.sin(C.t * 2 + i) * 1); px.rect(g, Math.round(x0), yy, Math.round(x1 - x0), 1, '#2c8a86'); }
  repeatSign(g, x0, y, 1, TEAL, true); repeatSign(g, x1, y, 1, TEAL, false);
  if (o.countdown > 0) { E.font.text(g, String(Math.ceil(o.countdown)), Math.round(x), Math.round(y - 44), o.countdown < 3 && Math.sin(C.t * 10) > 0 ? '#ff7a6a' : '#ffffff', { scale: 3, align: 'center', outline: false, shadow: '#000' }); }
} });
const lobeCol = { A: '#ffa23c', B: '#c48cff', C: '#ffe08a' };
defArt('lobe', {
  stamp(F, o, S, x, y) { if (!o.dead) { F.stampDisc(x, y, 15 + (o.open ? 2 : 0), 7, o.open ? 'hush' : 'lav'); } else F.stampDisc(x, y, 12, 2, 'char'); },
  over(g, o, S, x, y, C) {
    if (o.dead) { Pix.text(g, '×', x - 3, y - 3, '#3a5a68'); return; } const col = lobeCol[o.kind];
    if (o.open) { halo(g, x, y, 22, TEAL, .35); blob(g, x, y, 4); if (o.kind === 'A') Pix.burnRing(g, x, y, 11); else if (o.kind === 'B') { if (o.stage) { Pix.brackets(g, x, y, 10); Pix.arrow(g, x, y - 12, 0, -1, 10, '#ffffff'); } else { Pix.ring(g, x, y, 13, col, 2); } } else { if (o.stage) Pix.hatch(g, x, y, 10, G.MARK.hatch, C.t * 6); else Pix.plusRing(g, x, y, 11, col); } const f = (o.coatT || 0) || (o.burnT || 0); if (f > 0) px.rect(g, Math.round(x) - 10, Math.round(y) + 16, Math.round(20 * Math.min(1, f)), 2, '#ffffff'); }
    else { Pix.ring(g, x, y, 15, '#5a4a8a'); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + C.t * .4; px.line(g, Math.round(x + Math.cos(a) * 6), Math.round(y + Math.sin(a) * 6), Math.round(x + Math.cos(a) * 14), Math.round(y + Math.sin(a) * 14), '#4a3a7a'); } }
    Pix.text(g, o.kind, x - 2, y - 28, col);
  },
});
// ---- Fermata
defArt('dome', {
  over(g, o, S, x, y, C) { const f = Math.max(0, o.t / 5); px.blend(g, .22, 'normal', () => px.disc(g, Math.round(x), Math.round(y), o.r, '#7a64c8')); Pix.ring(g, x, y, o.r, LAV); Pix.ring(g, x, y, o.r - 1, '#7a64c8', 3); Pix.ring(g, x, y, o.r * f, '#ffffff', 4); px.ell(g, Math.round(x), Math.round(y) - 3, 5, 3, LAV); px.ell(g, Math.round(x), Math.round(y) - 2, 3, 1, '#2a2050'); px.disc(g, Math.round(x), Math.round(y) - 7 + 7, 1, LAV); },
});
defArt('eye', {
  stamp(F, o, S, x, y) { F.stampDisc(x, y, 12, 4, 'lav'); },
  over(g, o, S, x, y, C) { const open = o.openT > 0, X = Math.round(x), Y = Math.round(y); halo(g, X, Y, open ? 22 : 12, open ? '#ffffff' : LAV, open ? .45 : .2); px.ell(g, X, Y, 12, open ? 8 : 2, CORE); if (open) { px.ell(g, X, Y, 10, 6, '#e8f8ff'); px.disc(g, X, Y, 4, TEAL); px.disc(g, X, Y, 2, '#04141a'); px.dot(g, X - 1, Y - 1, '#ffffff'); Pix.burnRing(g, X, Y, 14); } else px.rect(g, X - 11, Y, 22, 1, LAV); for (let i = 0; i < (o.need - o.hits); i++) px.rect(g, X - 8 + i * 6, Y - 18, 4, 3, TEAL); },
});
defArt('eyeRoot', { stamp(F, o, S, x, y) { F.stampDisc(x, y, 7, 3, 'lav'); }, over(g, o, S, x, y, C) { px.line(g, Math.round(o.ox + C.OX), Math.round(o.oy + C.OY), Math.round(x), Math.round(y), TEAL, 2); blob(g, x, y, 3); if (!o.free) { Pix.brackets(g, x, y, 8); Pix.arrow(g, x + o.pull.ax * 10, y + o.pull.ay * 10, o.pull.ax, o.pull.ay, 12, '#ffffff'); } } });
// ---- Cantor
defArt('cantorEx', { over(g, o, S, x, y, C) { for (const m of [[110, 66], [213, 40], [316, 62]]) { const X = m[0] + C.OX, Y = m[1] + C.OY, sing = .5 + .5 * Math.sin(C.t * 3 + m[0]); px.ell(g, X, Y, 16, 7 + sing * 5, CORE); px.ell(g, X, Y, 13, 5 + sing * 4, '#2a1a4a'); Pix.ellRing(g, X, Y, 16, 7 + sing * 5, LAV); } } });
defArt('baton', { over(g, o, S, x, y, C) { const ox = o.cx + C.OX, oy = o.cy + C.OY; px.line(g, Math.round(ox), Math.round(oy), Math.round(x), Math.round(y), o.paused ? '#ffffff' : TEAL, 2); blob(g, x, y, 4, o.paused ? '#ffffff' : TEAL); if (o.paused) { Pix.ring(g, x, y, 13, '#c48cff', 2); Pix.text(g, 'NOW', x - 8, y - 22, '#ffffff'); } halo(g, x, y, 14); } });
defArt('uvula', { stamp(F, o, S, x, y) { F.stampDisc(x, y, 8, 5, 'heart'); }, over(g, o, S, x, y, C) { const X = Math.round(x), Y = Math.round(y), w = Math.sin(C.t * 11) * 2; px.ell(g, X + w, Y + 4, 4, 7, '#ff8a9a'); px.ell(g, X + w, Y + 8, 3, 3, '#ffb0b8'); Pix.burnRing(g, X, Y + 4, 11); const f = (o.burnT || 0) / 1.5; if (f > 0) px.rect(g, X - 10, Y + 18, Math.round(20 * Math.min(1, f)), 2, '#ffa23c'); } });
defArt('voicebox', { stamp(F, o, S, x, y) { F.stampDisc(x, y, 10, 5, 'hush'); }, over(g, o, S, x, y, C) { const f = G.beatWindow(S); halo(g, x, y, 20, f ? '#ffffff' : TEAL, .4); blob(g, x, y, 5, f ? '#ffffff' : TEAL); Pix.plusRing(g, x, y, 11, f ? '#ffffff' : G.MARK.plus); for (let i = 0; i < o.need - o.hits; i++) px.rect(g, Math.round(x) - 7 + i * 6, Math.round(y) - 18, 4, 3, TEAL); } });
defArt('cantorRecap', { over(g, o, S, x, y, C) { const n = S.keep.recap || 0; for (let i = 0; i < o.need; i++) px.rect(g, C.OX + 148 + i * 22, C.OY + 16, 18, 5, i < n ? TEAL : '#123034'); } });
defArt('repeatSign', { over(g, o, S, x, y, C) { const k = 1 + (3 - o.t) * .6, c = Math.sin(C.t * 10) > 0 ? '#ffffff' : TEAL; repeatSign(g, x - 10, y, Math.max(1, Math.round(k)), c, false); halo(g, x, y, 30, TEAL, .35); Pix.ring(g, x, y, 18, '#c48cff', 2); Pix.text(g, 'SLASH', x - 14, y - 34, '#c48cff'); E.font.text(g, String(Math.ceil(o.t)), Math.round(x), Math.round(y + 26), '#ffffff', { align: 'center', outline: false, scale: 2 }); } });
defArt('lastNote', { stamp(F, o, S, x, y) { F.stampDisc(o.ox + (x - o.x), o.oy + (y - o.y), 8, -3, 'wound'); }, over(g, o, S, x, y, C) { const p = o.pull.prog / o.pull.depth; px.line(g, Math.round(o.ox + C.OX), Math.round(o.oy + C.OY), Math.round(x), Math.round(y), TEAL, 2); halo(g, x, y, 14 + p * 20, LAV, .35 + p * .2); const X = Math.round(x), Y = Math.round(y); px.ell(g, X - 3, Y + 4, 4, 3, '#ffffff'); px.rect(g, X, Y - 9, 2, 13, '#ffffff'); px.line(g, X + 1, Y - 9, X + 7, Y - 5, '#ffffff', 2); if (!o.free) { Pix.brackets(g, x, y, 10); Pix.arrow(g, x + o.pull.ax * 13, y + o.pull.ay * 13, o.pull.ax, o.pull.ay, 12, '#ffffff'); } } });
defArt('board', { alwaysStamp: true, stamp(F, o, S, x, y) { F.stampDisc(x, y, 6, 1, 'circuit'); }, over(g, o, S, x, y, C) { Pix.ring(g, x, y, 12, TEAL, 2); } });
// the case 9 readout: what Crane said, and what the board says
G.drawWireOrder = (g, S, x, y) => { const order = S.flags.wireOrder; if (!order) return; const read = S.flags.boardRead; Pix.panel(g, x, y, 112, 16, { alpha: .85 }); Pix.text(g, read ? 'BOARD:' : 'CRANE:', x + 4, y + 4, read ? '#5ff0e0' : '#ffd36a'); order.forEach((s, i) => { const done = i < (S.flags.wireI || 0), c = done ? '#3a5a68' : s === 'tri' ? '#e8c43a' : s === 'dot' ? '#e8606a' : '#7ac8e8'; G.drawSym(g, s, x + 52 + i * 18, y + 8, c); }); };

// ------------------------------------------------------------------ ghosts of a Second Look: pale afterimages
const PALE = '#cfe8ff';
G.ghostArt = {
  lobe(g, q, OX, OY) { if (q.dead) return; Pix.ring(g, q.x + OX, q.y + OY, q.open ? 18 : 13, q.open ? '#ffffff' : PALE, q.open ? 0 : 2); if (q.open) Pix.text(g, 'OPEN', q.x + OX - 10, q.y + OY + 20, '#ffffff'); },
  bead(g, q, OX, OY) { Pix.ring(g, q.x + OX, q.y + OY, 4, PALE); px.line(g, Math.round(q.x + OX), Math.round(q.y + OY), Math.round(q.tx + OX), Math.round(q.ty + OY), PALE); },
  dome(g, q, OX, OY) { Pix.ring(g, q.x + OX, q.y + OY, q.r, PALE, 3); }, eye(g, q, OX, OY) { Pix.ring(g, q.x + OX, q.y + OY, q.open ? 16 : 8, q.open ? '#ffffff' : PALE); },
  repeatSign(g, q, OX, OY) { Pix.ring(g, q.x + OX, q.y + OY, 18, '#ffffff', 2); }, baton(g, q, OX, OY) { Pix.ring(g, q.x + OX, q.y + OY, q.pause ? 12 : 5, q.pause ? '#ffffff' : PALE); }, shard() {}, wound() {}, reed() {}, cantor() {}, dacapo() {},
};

// ------------------------------------------------------------------ sound and picture from the strains' events
const pan = x => (x - 213) / 213;
const Fx = G.FeelExtra = {
  tk(game, S, V, e) { G.Choir.staccato(pan(e[1]), .09); G.Sfx.noise(.012, 4200, 3000, 1, .1); },
  nestSpit(game, S, V, e) { G.Sfx.tone(300, 800, .1, 'sine', .12, { pan: pan(e[1]) }); game.particles.glints(e[1] + V.OX, e[2] + V.OY, 0, 3, TEAL); },
  beadLand(game, S, V, e) { G.Sfx.tick(); game.particles.bits(e[1] + V.OX, e[2] + V.OY, 0, 2, [TEAL]); },
  beadBite(game, S, V, e) { G.Sfx.rip(); game.particles.bits(e[1] + V.OX, e[2] + V.OY, 0, 6, ['#c81e1e', '#ff4a3a']); game.input.rumble(.3, .06); },
  beadDie(game, S, V, e) { G.Sfx.tone(1200, 300, .1, 'square', .08, { pan: pan(e[1]) }); game.particles.glints(e[1] + V.OX, e[2] + V.OY, 0, 5, TEAL); },
  strainDead(game, S, V, e) { G.Sfx.swell(); game.shake(3); game.input.rumble(.7, .4); game.particles.glints(e[1] + V.OX, e[2] + V.OY, 0, 22, TEAL); game.flash(TEAL, .15, .35); G.Choir.note(220, 1, { to: 110, vol: .2 }); },
  strainHit(game, S, V, e) { G.Sfx.swell(); game.shake(2.5); game.input.rumble(.7, .4); game.particles.glints(e[1] + V.OX, e[2] + V.OY, 0, 12, TEAL); },
  nestOpen(game, S, V, e) { G.Sfx.noise(.1, 1800, 500, 1, .3); },
  legatoDive(game, S, V, e) { G.Choir.legato(pan(e[1]), .12); },
  legatoSing(game, S, V, e) { G.Choir.legato(pan(e[1]), .09); },
  legatoUp(game, S, V, e) { G.Sfx.found(); game.input.rumble(.3, .1); game.particles.glints(e[1] + V.OX, e[2] + V.OY, 0, 6, TEAL); },
  barbOut(game, S, V, e) { G.Sfx.tone(600, 400, .12, 'square', .12); game.input.rumble(.3, .1); },
  clamp(game, S, V, e) { G.Sfx.clink(); G.Sfx.palm(); },
  legatoSnap(game, S, V, e) { G.Sfx.rip(); game.shake(3); G.Choir.note(400, .4, { to: 900, vol: .16 }); V.popups.push({ x: e[1], y: e[2] - 12, text: 'SNAPPED', color: '#ff7a6a', scale: 1, life: 1, t: 1 }); },
  legatoDone(game, S, V, e) { G.Sfx.chime(); },
  tremBurn(game, S, V, e) { if (Math.random() < .3) game.particles.sparks(e[1] + V.OX, e[2] + V.OY, 0, 1, Math.random() * 6.28); },
  tremTear(game, S, V, e) { G.Sfx.rip(); game.shake(4); game.input.rumble(.7, .4); G.Sfx.swell(); },
  tremSing(game, S, V, e) { G.Choir.tremolo(pan(e[1]), .05 + .09 * e[2]); },
  shellCrack(game, S, V, e) { G.Sfx.noise(.3, 2400, 300, .8, .5); game.shake(3); game.flash(LAV, .12, .4); game.input.rumble(.7, .4); },
  reedWake(game, S, V, e) { G.Sfx.tone(180, 360, .2, 'sawtooth', .12, { lp: 900 }); },
  sedate(game, S, V, e) { G.Sfx.tone(700, 300, .18, 'sine', .15, { pan: pan(e[1]) }); game.particles.glints(e[1] + V.OX, e[2] + V.OY, 0, 5, '#ffe08a'); },
  reedSpit(game, S, V, e) { G.Sfx.noise(.1, 1600, 500, 1, .3); V.popups.push({ x: e[1], y: e[2] - 12, text: 'NOT ON THE FLARE', color: '#ffa890', scale: 1, life: 1, t: 1 }); },
  lobeDead(game, S, V, e) { G.Sfx.swell(); G.Choir.note(262, .6, { to: 131, vol: .14 }); game.shake(2); game.particles.glints(e[1] + V.OX, e[2] + V.OY, 0, 10, TEAL); },
  lobeOpen(game, S, V, e) { const k = e[3] === 'A' ? 0 : e[3] === 'B' ? 1 : 2; G.Choir.dacapo(pan(e[1]), .12, k); },
  daCapoStart(game, S, V, e) { G.Sfx.tone(800, 800, .1, 'square', .12); },
  daCapo(game, S, V, e) { G.Choir.dacapoAll(0, .14); game.shake(3); game.flash(TEAL, .15, .4); V.popups.push({ x: 213, y: 84, text: 'FROM THE TOP', color: TEAL, scale: 2, life: 1.3, t: 1.3 }); game.input.rumble(.7, .4); },
  capoSing(game, S, V, e) { G.Choir.dacapoAll(pan(e[1]), .07); },
  domeRise(game, S, V, e) { G.Choir.fermata(pan(e[1]), .08); G.Sfx.tone(120, 200, .4, 'sine', .15); },
  domeFall(game, S, V, e) { G.Sfx.noise(.2, 400, 1800, 1, .18); },
  eyeOpen(game, S, V, e) { G.Sfx.tone(1400, 900, .1, 'sine', .22); game.input.rumble(.3, .08); },
  eyeHit(game, S, V, e) { G.Sfx.rip(); G.Choir.note(494, .3, { to: 900, vol: .14 }); game.shake(2); },
  fermSing(game, S, V, e) { G.Choir.fermata(pan(e[1]), .06); },
  cantorSing(game, S, V, e) { G.Choir.cantorChord(e[1] === 3 ? .13 : .07, [0, 3, -2, 5][e[1] % 4]); },
  batonsDown(game, S, V, e) { G.Sfx.swell(); },
  hush(game, S, V, e) { const on = e[1] === 1; G.Sfx.silence(on); V.quiet = on; if (on) { G.Music.stop(); V.bark = null; G.Choir.cantorChord(.13, 0); const L = G.Sfx.loop('static'); if (L) L.set(0); } else game.input.rumble(.5, .2); },
  readout(game, S, V, e) { V.quiet = false; G.OpScene.pushBark(V, S, 'quill', e[1] + ', Doctor.', 3); V.quiet = S.silent > 0; },
  recapWind(game, S, V, e) { G.Choir.dacapoAll(0, .13); G.Sfx.alarm(); },
  recapFire(game, S, V, e) { game.shake(5); game.flash(TEAL, .2, .6); game.input.rumble(1, .5); },
  recapCount(game, S, V, e) { G.Sfx.chime(); V.popups.push({ x: 213, y: 60, text: e[1] + ' / 6', color: TEAL, scale: 2, life: 1, t: 1 }); },
  noteDraw(game, S, V, e) { G.Choir.scream(4); game.input.rumble(.5, 1); },
  noteOut(game, S, V, e) { G.Choir.mute(true); G.Sfx.silence(true); G.Music.stop(); V.quiet = true; V.bark = null; game.flash('#ffffff', .4); game.shake(4); },
  oneBeep(game, S, V, e) { V.quiet = false; G.Choir.mute(false); G.Sfx.silence(false); G.Sfx.beep(80); },
  lurch(game, S, V, e) { G.Sfx.noise(.5, 300, 90, .7, .5); const L = G.Sfx.loop('creak'); if (L) { L.set(.1); V.loops.creak = 1; } },
  lurchWarn(game, S, V, e) { V.popups.push({ x: 213, y: 70, text: 'SHE IS GOING TO ROLL', color: '#ffd36a', scale: 2, life: 1.4, t: 1.4 }); },
};
})();
