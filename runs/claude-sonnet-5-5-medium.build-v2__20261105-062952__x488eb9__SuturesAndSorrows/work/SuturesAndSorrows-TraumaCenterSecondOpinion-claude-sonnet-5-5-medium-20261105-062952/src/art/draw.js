// How the sim's objects, instruments and icons look. Draw never changes S.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), px = E.px, T = E.tones;
const Dr = G.Draw = {};
const TEAL = '#5ff0e0', DARK = '#0b2a30';
const geo = G.geo;
const halo = (g, x, y, r, col = TEAL, a = .35) => px.blend(g, a, 'add', () => { px.disc(g, x, y, r, col); px.disc(g, x, y, r * .55, '#ffffff'); });
const dashed = (g, pts, col, off = 0, step = 4) => { let acc = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay) || 1; for (let s = 0; s < L; s += step * 2) { const t0 = s / L, t1 = Math.min(1, (s + step) / L); px.line(g, ax + (bx - ax) * t0 + 0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1, col, 1); } } };
const brackets = (g, x, y, r, col = '#ffffff') => { const k = 3; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, x + sx * r, y + sy * r, x + sx * (r - k), y + sy * r, col, 1); px.line(g, x + sx * r, y + sy * r, x + sx * r, y + sy * (r - k), col, 1); } };
const ring = (g, x, y, r, col, n = 14, rot = 0) => { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rot; px.dot(g, Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), col); } };
Dr.halo = halo; Dr.ring = ring; Dr.brackets = brackets; Dr.dashed = dashed;
// ---- stamps into the tissue height field (before shade)
Dr.stamp = (F, S, ox, oy, opt = {}) => {
  const t = S.rt;
  for (const c of S.cuts || []) F.stampLine(c.pts.map(p => [p[0] + ox, p[1] + oy]), 1.7, -3.2, 'wound');
  for (const [x, y] of S.chars) F.stampDisc(x + ox, y + oy, 3, 1, 'char');
  for (const o of S.objs) {
    if (o.done && !o.keep) continue; const x = o.x + ox, y = o.y + oy;
    switch (o.type) {
      case 'pool': F.stampDisc(x, y, Math.max(2, o.r), 3.5, 'blood'); break;
      case 'wound': case 'arteryTear': { const f = o.sc / o.n, r = 3.4 * (1 - f) + .8; F.stampLine([[o.x - o.len / 2 + ox, y], [o.x + o.len / 2 + ox, y]], r, -5.5 * (1 - f) - .5, 'wound'); if (!o.art || f < 1) { F.stampLine([[o.x - o.len / 2 + ox, y - 4], [o.x + o.len / 2 + ox, y - 4]], 1.6, 2.2, 'muscle'); F.stampLine([[o.x - o.len / 2 + ox, y + 4], [o.x + o.len / 2 + ox, y + 4]], 1.6, 2.2, 'muscle'); } break; }
      case 'laceration': F.stampLine([[x - o.r * .7, y - 2], [x + o.r * .7, y + 2]], 2, -3, 'wound'); break;
      case 'patch': F.stampDisc(x, y, o.r, 1.6, 'artery'); break;
      case 'polyp': F.stampDisc(x, y, 4.5, 5, 'bowel'); break;
      case 'bleeder': F.stampDisc(x, y, 2.4, -2, 'artery'); break;
      case 'mass': if (!o.done) F.stampDisc(x, y, o.R || 20, 8, o.cut ? 'bowel' : 'liver'); break;
      case 'incision': if (o.prog > 0 && !o.cut) { const pts = []; let acc = 0; for (let i = 0; i < o.pts.length - 1; i++) { pts.push(o.pts[i]); acc += Math.hypot(o.pts[i + 1][0] - o.pts[i][0], o.pts[i + 1][1] - o.pts[i][1]); if (acc > o.prog) break; } pts.push(geo.polyAt(o.pts, o.prog)); F.stampLine(pts.map(p => [p[0] + ox, p[1] + oy]), 1.7, -3.2, 'wound'); } break;
      case 'spiral': if (o.prog > 0) { const pts = []; for (let s = 0; s <= o.prog; s += 6) pts.push(geo.polyAt(o.pts, s)); pts.push(geo.polyAt(o.pts, o.prog)); F.stampLine(pts.map(p => [p[0] + ox, p[1] + oy]), 1.5, -3, 'wound'); } break;
      case 'legato': { const n = 12; const s0 = o.state === 'under' ? o.s : o.s; const pts = []; for (let i = 0; i <= n; i++) pts.push(geo.polyAt(o.route, Math.max(0, s0 - i * 6))); F.stampLine(pts.map(p => [p[0] + ox, p[1] + oy]), o.gen ? 2.6 : 3.6, 5, o.state === 'up' ? 'hush' : null); break; }
      case 'tremolo': F.stampDisc(x, y, 22, 9 + Math.sin(t * 56) * .6, o.stage === 1 ? 'lav' : 'hush'); break;
      case 'lobe': if (!o.dead) F.stampDisc(x, y, 18, o.open ? 5 : 9, o.open ? 'hush' : 'lav'); break;
      case 'nest': if (!o.hid || o.mk > t) F.stampDisc(x, y, 7, 4, 'hush'); break;
      case 'bead': F.stampDisc(x, y, 3.4, 3 + (o.sq || 0) * 2, 'hush'); break;
      case 'fermata': if (!o.hid || o.mk > t) F.stampDisc(x, y, 14, 6, 'hush'); break;
      case 'mouth': F.stampDisc(x, y, 12, -3, 'lav'); F.stampDisc(x, y, 6, -6, 'wound'); break;
      case 'tendril': F.stampLine([[x, y - 24], [x + 6, y - 8], [x, y]], 2.8, 5, 'lav'); break;
      case 'voicebox': if (o.mk > t) F.stampDisc(x, y, 8, 5, 'hush'); break;
      case 'device': F.stampDisc(x, y, 18, 5, 'steel'); break;
      case 'lead': F.stampDisc(x, y, 5, 3, 'gold'); break;
    }
  }
};
// ---- overlays: markers, objects drawn with E.px, in screen pixels (ox, oy = design-space offset)
Dr.over = (g, S, ox, oy, cx) => {
  const t = S.rt, tool = cx.tool, lb = S.lb, mine = cx.mine;
  const ready = (o, f) => f && !o.done && G.Op.visible(S, o);
  for (const z of S.zones) { ring(g, z.x + ox, z.y + oy, z.r, '#ffffff', 18, t * .5); E.font.text(g, 'CLAMP', z.x + ox - 12, z.y + oy - 3, '#ffffff', { outline: false }); }
  for (const o of S.objs) {
    if (o.done && !o.keep) continue; const x = Math.round(o.x + ox), y = Math.round(o.y + oy), vis = G.Op.visible(S, o);
    if (o.hid && !vis) { if (cx.showHidden) ring(g, x, y, 5, '#6a8a90', 8); continue; }
    if (o.sub && !vis) continue;
    switch (o.type) {
      case 'shard': { const a = o.ax, L = 16; px.line(g, x - a[0] * L * .5, y - a[1] * L * .5, x + a[0] * L * .5, y + a[1] * L * .5, '#cfe4f4', 2); px.line(g, x - a[0] * L * .5, y - a[1] * L * .5 - 1, x + a[0] * L * .5, y + a[1] * L * .5 - 1, '#ffffff', 1); if (!o.free) { brackets(g, x, y, 9); px.line(g, x, y, x + a[0] * 14, y + a[1] * 14, '#ffffff66', 1); } if (o.cork) E.font.text(g, 'cork', x + 8, y - 4, '#e0c080', { outline: false }); break; }
      case 'hook': { const a = o.ax; px.line(g, x, y, x - a[0] * o.depth * .5, y - a[1] * o.depth * .5, '#a8b8c8', 2); for (let i = 1; i <= 4; i++) px.line(g, x - a[0] * i * 9, y - a[1] * i * 9, x - a[0] * i * 9 - a[1] * 4, y - a[1] * i * 9 + a[0] * 4, '#d8e8f4', 1); if (o.cut) brackets(g, x, y, 9); break; }
      case 'laceration': px.line(g, x - 6, y - 2, x + 6, y + 2, '#c83030', 2); dashedHatch(g, x, y, o.r, o, t); break;
      case 'patch': dashedHatch(g, x, y, o.r, o, t); break;
      case 'wound': case 'arteryTear': { const f = o.sc / o.n; if (o.art) { const b = (S.hb < .3) ? 1 : 0; px.disc(g, x + o.len / 2 * 0, y - 2 - b * 3, 2 + b, '#e03a2a'); } for (const s of o.st) { if (s.done) { px.line(g, s.a[0] + ox, s.a[1] + oy + 2, s.b[0] + ox, s.b[1] + oy - 2, '#58c0ff', 1); px.dot(g, s.a[0] + ox, s.a[1] + oy, '#9ad8ff'); px.dot(g, s.b[0] + ox, s.b[1] + oy, '#9ad8ff'); } } const nx = o.st.find(s => !s.done); for (const s of o.st) if (!s.done) { const hot = s === nx; px.disc(g, s.a[0] + ox, s.a[1] + oy, hot ? 3 : 2, hot ? '#58c0ff' : '#2a6aa8'); px.disc(g, s.b[0] + ox, s.b[1] + oy, hot ? 3 : 2, hot ? '#58c0ff' : '#2a6aa8'); if (hot) px.line(g, s.a[0] + ox, s.a[1] + oy, s.b[0] + ox, s.b[1] + oy, '#58c0ff66', 1); } break; }
      case 'bleeder': { const beat = S.hb < .25 ? 1 : 0; px.disc(g, x, y, 2, '#e04030'); px.line(g, x, y, x + (beat ? 2 : 0), y - 5 - beat * 4, '#c82020', 2); ring(g, x, y, 7, '#ff9a30', 10, t * 2); break; }
      case 'polyp': px.disc(g, x, y, 4, '#f08a8a'); px.dot(g, x - 1, y - 2, '#ffd0d0'); ring(g, x, y, 8, '#ff9a30', 10, t * 2); break;
      case 'incision': if (!o.cut && !o.slur || (o.slur && !o.cut)) { dashed(g, o.pts.map(p => [p[0] + ox, p[1] + oy]), '#b080ff'); const h = geo.polyAt(o.pts, o.prog); px.disc(g, h[0] + ox, h[1] + oy, 3, '#d8b8ff'); px.disc(g, h[0] + ox, h[1] + oy, 1, '#ffffff'); } break;
      case 'spiral': dashed(g, o.pts.map(p => [p[0] + ox, p[1] + oy]), '#d8b8ff', 0, 3); { const h = geo.polyAt(o.pts, o.prog); px.disc(g, h[0] + ox, h[1] + oy, 3, '#ffffff'); } break;
      case 'nerve': for (let i = 0; i < o.pts.length - 1; i++) { px.line(g, o.pts[i][0] + ox, o.pts[i][1] + oy, o.pts[i + 1][0] + ox, o.pts[i + 1][1] + oy, '#f0c030', 2); px.line(g, o.pts[i][0] + ox, o.pts[i][1] + oy - 1, o.pts[i + 1][0] + ox, o.pts[i + 1][1] + oy - 1, '#fff2a0', 1); } break;
      case 'mass': if (o.cut) brackets(g, x, y, 12); else px.dot(g, x, y, '#ffffff22'); break;
      case 'clot': px.disc(g, x, y, 6, o.sedated ? '#6a3a5a' : '#3a0a18'); px.dot(g, x - 2, y - 2, '#a85a7a'); if (!o.sedated) { px.line(g, x - 9, y, x + 9, y, '#7cf07c', 1); px.line(g, x, y - 9, x, y + 9, '#7cf07c', 1); } else brackets(g, x, y, 9); break;
      case 'screw': { px.disc(g, x, y, 6, '#9aaab8'); px.disc(g, x, y, 4, '#cfe0ee'); const a = (o.spin || 0); px.line(g, x - Math.cos(a) * 4, y - Math.sin(a) * 4, x + Math.cos(a) * 4, y + Math.sin(a) * 4, '#28303a', 1); px.line(g, x - Math.sin(a) * 4, y + Math.cos(a) * 4, x + Math.sin(a) * 4, y - Math.cos(a) * 4, '#28303a', 1); brackets(g, x, y, 9); if (o.prog > 0) E.font.text(g, Math.round(o.prog * 100) + '%', x + 9, y - 3, '#ffffff', { outline: false }); break; }
      case 'lead': px.disc(g, x, y, 5, '#e0b030'); ring(g, x, y, 9, '#ff9a30', 10, t * 2); E.font.text(g, 'solder', x + 10, y - 3, '#ffe0a0', { outline: false }); break;
      case 'wire': { const sym = ['▲', '●', '■'][o.sym], col = ['#ff7a6a', '#7ae07a', '#7aaaff'][o.sym]; px.line(g, x - 40, y, x + 40, y, '#d8d8e0', 2); px.line(g, x - 40, y - 1, x + 40, y - 1, col, 1); E.font.text(g, sym, x - 54, y - 3, '#fff', { outline: false }); if (o.mk > t) E.font.text(g, String(o.rank + 1), x + 46, y - 3, '#5ff0e0', { outline: false }); break; }
      case 'device': px.line(g, x, y, x, y + 10, '#d8d8e0', 1); brackets(g, x, y, 14); break;
      case 'retractorHandle': px.rect(g, x - 6, y - 5, 12, 10, o.open ? '#f0f0f8' : '#8a98a8'); px.rect(g, x - 5, y - 4, 10, 2, '#fff'); brackets(g, x, y, 11); E.font.text(g, o.open ? 'OPEN' : 'HOLD', x - 10, y + 12, '#fff', { outline: false }); break;
      // ---- HUSH
      case 'bead': { const sq = o.sq || 0; halo(g, x, y - 2, 4 - sq, TEAL, .35); px.ell(g, x, y - 1 + sq * 2, 3 + sq, 3 - sq, TEAL); px.dot(g, x - 1, y - 2, '#ffffff'); if (o.tele > 0) { const r = 2 + o.tele * 14; ring(g, o.tx + ox, o.ty + oy, r, '#9ff8ee', 12, t); } break; }
      case 'nest': { halo(g, x, y, 9, TEAL, .25); ring(g, x, y, 9 + Math.sin(t * 6) * 1.5, TEAL, 10, t); if (o.cut) brackets(g, x, y, 10); else if (tool === 'scalpel') E.font.text(g, 'slash', x + 10, y - 3, '#d8b8ff', { outline: false }); break; }
      case 'legato': { const n = o.gen ? 7 : 10; for (let i = n; i >= 0; i--) { const p = geo.polyAt(o.route, Math.max(0, o.s - i * 5)); const w = (o.gen ? 2 : 3) - (i / n); px.disc(g, p[0] + ox, p[1] + oy, Math.max(1, w), o.state === 'under' ? '#2a8a86' : TEAL); } if (!o.hid) { px.disc(g, x, y, o.gen ? 3 : 4, '#bffff6'); px.dot(g, x - 1, y - 1, '#0b2a30'); brackets(g, x, y, 10); const tn = o.tens || 0; if (o.free || o.prog > 0) { px.rect(g, x - 12, y - 14, 24, 3, '#0b2a30'); px.rect(g, x - 12, y - 14, Math.min(24, 24 * tn), 3, tn > 1 ? '#ff6a5a' : TEAL); } } else if (o.mk > t) halo(g, x, y, 6, TEAL, .4); break; }
      case 'tremolo': { halo(g, x, y, 24, o.stage === 1 ? '#a88af8' : TEAL, .2 + .15 * Math.sin(t * 56)); px.disc(g, x, y, 14, o.stage === 1 ? '#6a4ab0' : '#1c8a86'); px.disc(g, x - 3, y - 4, 4, '#c8b0f8'); E.font.text(g, 'amp ' + Math.round(o.amp * 10) / 10, x - 14, y + 18, '#e8d8ff', { outline: false }); if (o.stage === 3) brackets(g, x, y, 16); if (o.stage === 2 && o.amp <= .2) ring(g, x, y, 17, '#ff9a30', 14, t * 2); break; }
      case 'reed': { const tr = G.Op.byId(S, o.parent), fl = tr && tr.flare > 0, sh = Math.sin(t * 56 + o.a * 5) * (o.asleep > 0 ? 0 : 1.5); px.line(g, x, y + 6, x + sh, y - 8, o.asleep > 0 ? '#4a6a8a' : (fl ? '#ffffff' : TEAL), 2); px.disc(g, x + sh, y - 9, 2.5, fl ? '#ffffff' : '#a8fff4'); if (fl) { px.line(g, x - 7, y - 9, x + 7, y - 9, '#7cf07c', 1); px.line(g, x, y - 16, x, y - 2, '#7cf07c', 1); } break; }
      case 'lobe': if (!o.dead) { const op = o.open; halo(g, x, y, op ? 18 : 12, op ? '#ffffff' : TEAL, .25); px.disc(g, x, y, 14, op ? '#bffff6' : '#3a2a6a'); px.disc(g, x, y, 11, op ? TEAL : '#5a3c9a'); E.font.text(g, o.k, x - 2, y - 3, '#fff', { outline: false }); if (!op) ring(g, x, y, 17, '#8a68c8', 12, 0); else brackets(g, x, y, 17, '#ffffff'); } else { ring(g, x, y, 10, '#444', 8); } break;
      case 'fermata': { if (o.hid && !(o.mk > t)) break; const ey = o.eye > 0 ? 7 : 1; px.ell(g, x, y, 15, 9, '#e8f8f8'); px.ell(g, x, y, 15, 9 - (o.eye > 0 ? 0 : 7), o.eye > 0 ? '#e8f8f8' : '#3a6a70'); if (o.eye > 0) { px.disc(g, x, y, 5, TEAL); px.disc(g, x, y, 2, '#0b2a30'); ring(g, x, y, 12, '#ff9a30', 12, t * 3); } else px.line(g, x - 14, y, x + 14, y, '#0b2a30', 1); for (const d of o.domes) { const a = Math.min(1, (5 - d.age) / 5); ring(g, d.x + ox, d.y + oy, d.r, '#c8b0f8', 28, t * .3); px.blend(g, .12, 'add', () => px.disc(g, d.x + ox, d.y + oy, d.r, '#a88af8')); E.font.text(g, String(Math.ceil(5 - d.age)), d.x + ox - 2, d.y + oy - 3, '#fff', { outline: false }); } break; }
      case 'mouth': halo(g, x, y, 14, '#a88af8', .22); px.ell(g, x, y, 11, 8 + Math.sin(t * 5 + x), '#2a1a44'); px.ell(g, x, y, 7, 4 + Math.sin(t * 5 + x) * 1.5, '#c8506a'); ring(g, x, y, 15, '#ff9a30', 12, t * 2); break;
      case 'tendril': { const op = o.open; px.line(g, x, y - 24, x + 6, y - 8, op ? '#fff' : '#8a68c8', 3); px.line(g, x + 6, y - 8, x, y, op ? '#fff' : '#6a48a8', 3); if (op) { ring(g, x, y - 6, 14, '#d8b8ff', 12, t * 3); } break; }
      case 'voicebox': if (o.mk > t) { halo(g, x, y, 10, TEAL, .4); px.disc(g, x, y, 6, o.win ? '#ffffff' : TEAL); if (o.win) { px.line(g, x - 9, y, x + 9, y, '#7cf07c', 1); px.line(g, x, y - 9, x, y + 9, '#7cf07c', 1); } E.font.text(g, o.sedN + '/3', x + 10, y - 3, '#fff', { outline: false }); } break;
      case 'repeat': { const k = Math.min(1, o.age / 3); px.rect(g, x - 18, y - 30, 36, 60, '#d8b8ff33'); ring(g, x, y, 34 * (1 - k) + 8, '#ffffff', 22, t * 4); px.rect(g, x - 20, y - 26, 3, 52, '#fff'); px.rect(g, x - 14, y - 26, 1, 52, '#fff'); px.disc(g, x - 8, y - 8, 2, '#fff'); px.disc(g, x - 8, y + 8, 2, '#fff'); E.font.text(g, 'CUT!', x - 8, y + 34, '#fff', { outline: false }); break; }
      case 'note': { const k = o.prog / o.depth; halo(g, x, y, 8 + k * 10, '#ffffff', .4); px.disc(g, x, y, 4 + k * 3, '#ffffff'); brackets(g, x, y, 12); break; }
    }
  }
  // sonar lens, cautery beam etc. are drawn per player in the op scene
};
function dashedHatch(g, x, y, r, o, t) { const f = o.frac || 0; for (let i = -r; i < r; i += 4) { const hy = Math.sqrt(Math.max(0, r * r - i * i)); px.line(g, x + i - 2, y + hy * .5, x + i + 3, y - hy * .5, f > .5 ? '#9affb8' : '#4ae07c', 1); } }
// ---- instruments: tip at (x,y); gloved hand down and right
Dr.instrument = (g, tool, x, y, st = {}) => {
  const col = st.color || '#e8443a', t = st.t || 0, down = st.down, glove = '#e8e0d8';
  const hand = (hx, hy) => { px.ell(g, hx, hy, 7, 5, glove); px.ell(g, hx + 1, hy + 1, 7, 5, '#c8c0b8'); px.line(g, hx - 6, hy + 2, hx + 4, hy + 2, col, 1); };
  switch (tool) {
    case 'forceps': { const o = down ? 0 : 3; px.line(g, x, y, x + 14 + o, y + 18, '#cfe0ee', 2); px.line(g, x, y, x + 8 - o, y + 16, '#9aaab8', 2); px.line(g, x + 14 + o, y + 18, x + 24, y + 30, '#9aaab8', 3); px.line(g, x + 8 - o, y + 16, x + 20, y + 30, '#cfe0ee', 3); px.dot(g, x, y, '#fff'); hand(x + 26, y + 34); break; }
    case 'scalpel': { px.poly(g, [[x, y], [x + 9, y + 3], [x + 7, y + 8]], '#e8f2fa'); px.line(g, x, y, x + 8, y + 3, '#ffffff', 1); px.line(g, x + 8, y + 5, x + 28, y + 24, '#5a6a78', 3); px.rect(g, x + 26, y + 22, 8, 4, '#3a4654'); hand(x + 34, y + 30); if (Math.sin(t * 8) > .6) px.dot(g, x + 4, y + 2, '#fff'); break; }
    case 'suture': { px.line(g, x, y, x + 10, y + 12, '#cfe0ee', 2); px.line(g, x, y, x + 3, y + 5, '#fff', 1); px.line(g, x + 10, y + 12, x + 26, y + 30, '#9aaab8', 3); for (let i = 0; i < 12; i++) px.dot(g, x + 10 + i * 2, y + 12 + i * 1.7 + Math.sin(i + t * 6) * 1.5, '#58c0ff'); hand(x + 30, y + 34); break; }
    case 'salve': { px.line(g, x, y, x + 8, y + 14, '#b8a078', 4); px.disc(g, x, y, 3, '#7cf0a0'); px.disc(g, x - 1, y - 1, 1, '#d8ffe4'); px.line(g, x + 8, y + 14, x + 26, y + 32, '#8a7a5a', 3); hand(x + 30, y + 36); break; }
    case 'syringe': { const f = Math.min(1, st.fill || 0); px.rect(g, x + 4, y + 6, 8, 22, '#e8f4f8'); px.rect(g, x + 5, y + 28 - 20 * f, 6, 20 * f, f > 1.0 ? '#ffffff' : '#7ae0ff'); px.line(g, x + 8, y + 6, x, y, '#cfe0ee', 1); px.line(g, x + 8, y + 28, x + 8, y + 36, '#9aaab8', 2); px.rect(g, x + 3, y + 36, 10, 2, '#9aaab8'); hand(x + 14, y + 42); if (st.fill > 1.3) px.disc(g, x + 9, y + 12, 1, '#fff'); break; }
    case 'cautery': { const h = st.heat || 0; px.line(g, x, y, x + 12, y + 16, '#3a4654', 3); px.line(g, x + 12, y + 16, x + 28, y + 32, '#5a6a78', 4); px.disc(g, x, y, 2, down ? '#ffffff' : (h > .5 ? '#ff7a30' : '#ff9a30')); if (down) { px.blend(g, .5, 'add', () => px.disc(g, x, y, 5 + Math.sin(t * 40), '#ff7a30')); } hand(x + 32, y + 36); if (st.lock) E.font.text(g, 'HOT', x + 6, y - 10, '#ff7a30', { outline: false }); break; }
    case 'suction': { const sh = down ? Math.sin(t * 50) * 1 : 0; px.disc(g, x + sh, y, 4, '#9ad0e0'); px.disc(g, x + sh, y, 2, '#102830'); px.line(g, x + 3 + sh, y + 3, x + 24, y + 28, '#7aa8bc', 4); px.line(g, x + 24, y + 28, x + 40, y + 32, '#5a8498', 3); hand(x + 28, y + 34); break; }
    case 'sonar': { px.line(g, x, y, x + 12, y + 16, '#3a6a8a', 3); px.disc(g, x, y, 4, '#7ae0ff'); if (down) for (let i = 1; i < 4; i++) ring(g, x, y, ((t * 30 + i * 12) % 38), '#7ae0ff', 16); px.line(g, x + 12, y + 16, x + 28, y + 32, '#2a4a62', 4); hand(x + 32, y + 36); break; }
  }
};
// ---- tool icons: 20x20, one silhouette each
Dr.icon = (g, tool, x, y, col = '#fff') => {
  const c = col;
  switch (tool) {
    case 'forceps': px.line(g, x + 3, y + 2, x + 15, y + 17, c, 2); px.line(g, x + 17, y + 2, x + 5, y + 17, c, 2); px.rect(g, x + 8, y + 1, 4, 3, c); break;
    case 'scalpel': px.poly(g, [[x + 2, y + 17], [x + 4, y + 13], [x + 16, y + 3], [x + 18, y + 5], [x + 8, y + 17]], c); px.line(g, x + 4, y + 14, x + 16, y + 4, '#00000066', 1); break;
    case 'suture': { px.line(g, x + 3, y + 15, x + 16, y + 4, c, 2); px.ring ? 0 : 0; for (let i = 0; i < 6; i++) px.dot(g, x + 3 + i * 2, y + 6 + (i % 2) * 3, c); px.disc(g, x + 16, y + 4, 2, c); break; }
    case 'salve': px.rect(g, x + 4, y + 9, 12, 8, c); px.rect(g, x + 6, y + 6, 8, 3, c); px.rect(g, x + 8, y + 3, 4, 3, c); px.line(g, x + 6, y + 13, x + 14, y + 13, '#00000066', 1); break;
    case 'syringe': px.rect(g, x + 6, y + 5, 8, 9, c); px.line(g, x + 10, y + 14, x + 10, y + 19, c, 1); px.rect(g, x + 4, y + 3, 12, 2, c); px.rect(g, x + 9, y, 2, 3, c); px.line(g, x + 8, y + 8, x + 12, y + 8, '#00000066', 1); break;
    case 'cautery': px.line(g, x + 3, y + 17, x + 14, y + 6, c, 3); px.disc(g, x + 16, y + 4, 3, '#ff9a30'); px.dot(g, x + 18, y + 2, '#fff'); break;
    case 'suction': px.disc(g, x + 5, y + 5, 4, c); px.disc(g, x + 5, y + 5, 2, '#00000088'); px.line(g, x + 7, y + 8, x + 16, y + 17, c, 3); break;
    case 'sonar': px.disc(g, x + 6, y + 14, 3, c); for (let i = 1; i <= 3; i++) ring(g, x + 6, y + 14, 3 + i * 4, c, 7 + i * 2, -.2 * i); break;
  }
};
Dr.TOOL_ORDER = ['forceps', 'scalpel', 'suture', 'salve', 'syringe', 'cautery', 'suction', 'sonar'];
// wheel direction for each tool: N Forceps, NE Scalpel, E Suture, SE Salve, S Syringe, SW Cautery, W Suction, NW Sonar
Dr.WHEEL_ANGLE = tool => Dr.TOOL_ORDER.indexOf(tool) * Math.PI / 4 - Math.PI / 2;
})();
