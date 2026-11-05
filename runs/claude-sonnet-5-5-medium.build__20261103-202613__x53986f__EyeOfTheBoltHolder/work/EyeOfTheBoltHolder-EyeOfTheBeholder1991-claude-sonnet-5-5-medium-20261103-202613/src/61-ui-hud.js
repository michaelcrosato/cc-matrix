/* HUD + play controls: the party bar, compass, log, prompts, Hand, chevrons, boss bar, race HUD. */
UI.logs = []; UI.pops = []; UI.chev = []; UI.toast = null; UI.tips = {}; UI.hint = null;
/** a dwarf's beard over the lower face of a portrait box at x,y of size s, in the hair colour */
UI.beard = (g, m, x, y, s) => { if (m.race !== 'dwarf' || m.state === 'dead') return; const L = (B.LOOKS.dwarf || [])[(m.look || 0) % 6], a = m.appearance || {}; const c = a.hairc || (L && L.hair) || '#a05a2a'; g.fillStyle = c; const k = s / 26; g.fillRect(x + 8 * k, y + 17 * k, 10 * k, 5 * k); g.fillRect(x + 9 * k, y + 22 * k, 8 * k, 3 * k); g.fillRect(x + 7 * k, y + 15 * k, 2 * k, 4 * k); g.fillRect(x + 17 * k, y + 15 * k, 2 * k, 4 * k); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 9 * k, y + 21 * k, 8 * k, k); };
UI.icon = (g, id, x, y, s) => {
  const it = B.ITEMS[id]; if (!it) return; s = s || 12; const c = it.c || '#aaa', k = s / 12, R = (a, b, w, h, col) => { g.fillStyle = col || c; g.fillRect(Math.round(x + a * k), Math.round(y + b * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); }, dk = B.shade(c, -.35);
  switch (it.ic) {
    case 'blade': R(5, 0, 2, 8); R(3, 8, 6, 1.5, '#8a6a30'); R(5.5, 9.5, 1, 2.5, '#6a4a2a'); R(5, 0, 1, 8, '#ffffff'); break;
    case 'fist': R(3, 3, 6, 6, '#d8b890'); break;
    case 'mace': R(5.5, 4, 1.5, 8, '#8a6a40'); R(3, 0, 6, 5, c); R(4, 1, 4, 3, dk); break;
    case 'axe': R(5.5, 1, 1.5, 11, '#8a6a40'); R(6, 1, 5, 5, c); R(7, 2, 3, 3, dk); break;
    case 'staff': R(5.5, 0, 1.5, 12, '#8a6a40'); R(4.5, 0, 3.5, 2, c); break;
    case 'spear': R(5.5, 3, 1.2, 9, '#8a6a40'); R(4.8, 0, 3, 4, c); break;
    case 'bow': R(3, 1, 1.5, 10, c); R(4.5, 1, 3, 1, c); R(4.5, 10, 3, 1, c); R(8, 2, 0.8, 8, '#d8d0b0'); break;
    case 'xbow': R(1, 4, 10, 1.6, c); R(5, 5, 2, 6, '#6a4a2a'); R(2, 2, 1.5, 6, c); R(8.5, 2, 1.5, 6, c); break;
    case 'sling': R(2, 6, 8, 1.5, c); R(2, 3, 2, 4, c); R(8, 3, 2, 4, c); break;
    case 'dart': case 'arrow': R(5.5, 2, 1, 9, c); R(4.5, 0, 3, 3, '#e8e8f0'); R(4, 9, 4, 3, '#d8d0b0'); break;
    case 'potion': R(4, 5, 4, 6, c); R(3, 7, 6, 4, c); R(5, 2, 2, 3, '#cfe6f0'); R(5, 1, 2, 1.5, '#9a6a3a'); R(4, 6, 1, 2, '#fff'); break;
    case 'scroll': R(2, 3, 8, 6, c); R(1, 3, 2, 6, '#8a6a30'); R(9, 3, 2, 6, '#8a6a30'); R(4, 5, 4, 1, dk); break;
    case 'book': R(2, 1, 8, 10, c); R(2, 1, 1.5, 10, dk); R(5, 4, 4, 1, '#e8d8a0'); break;
    case 'note': R(2, 1, 8, 10, '#e8e0c0'); R(3, 4, 6, 1, '#6a5a40'); R(3, 7, 5, 1, '#6a5a40'); break;
    case 'key': R(2, 1, 4, 4, c); R(3, 2, 2, 2, '#1a1620'); R(4, 5, 1.5, 7, c); R(5.5, 8, 2.5, 1.2, c); R(5.5, 10, 2, 1.2, c); break;
    case 'rock': R(2, 4, 8, 6, c); R(3, 3, 5, 2, B.shade(c, .2)); break;
    case 'ration': R(2, 3, 8, 7, c); R(2, 5, 8, 1.5, '#8a6a40'); R(5, 3, 2, 7, '#8a6a40'); break;
    case 'armor': R(2, 1, 8, 10, c); R(1, 1, 2, 4, dk); R(9, 1, 2, 4, dk); R(5, 1, 2, 3, dk); break;
    case 'shield': R(2, 1, 8, 8, c); R(3, 9, 6, 2, c); R(5, 3, 2, 6, dk); break;
    case 'helm': R(2, 2, 8, 7, c); R(2, 9, 2, 2, c); R(8, 9, 2, 2, c); R(3, 5, 6, 1.5, '#1a1620'); break;
    case 'bracer': R(2, 3, 8, 6, c); R(3, 5, 6, 2, dk); break;
    case 'boots': R(2, 1, 4, 8, c); R(2, 8, 8, 3, c); break;
    case 'ring': R(3, 3, 6, 6, c); R(5, 5, 2, 2, '#1a1620'); R(4, 1, 4, 2, '#fff'); break;
    case 'wand': R(1, 9, 8, 1.5, '#6a4a3a'); R(8, 7, 3, 3, c); R(9, 8, 1, 1, '#fff'); break;
    case 'gear': R(3, 3, 6, 6, c); R(5, 0, 2, 2, c); R(5, 10, 2, 2, c); R(0, 5, 2, 2, c); R(10, 5, 2, 2, c); R(5, 5, 2, 2, '#1a1620'); break;
    case 'ward': R(2, 2, 8, 8, c); R(4, 4, 4, 4, '#1a1620'); R(5, 5, 2, 2, c); break;
    case 'symbol': R(4, 0, 4, 12, c); R(0, 4, 12, 4, c); R(5, 5, 2, 2, '#fff'); break;
    default: R(3, 3, 6, 6, c);
  }
};
UI.addLog = (text, kind) => { UI.logs.push({ text, kind, t: UI.game.real }); if (UI.logs.length > 40) UI.logs.shift(); };
UI.onEvent = (e) => {
  const S = B.S, p = S && S.party;
  switch (e.t) {
    case 'log': UI.addLog(e.text, e.kind); break;
    case 'mhit': break;
    case 'partyHit': UI.chev.push({ rel: e.rel, t: 0 }); UI.cardPop(e.m, null, 'hit'); break;
    case 'hurt': UI.cardPop(e.m, '-' + e.dmg, 'hurt'); break;
    case 'heal': UI.cardPop(e.m, '+' + e.n, 'heal'); break;
    case 'miss': if (e.m != null) UI.cardPop(e.m, 'MISS', 'miss', e.h); break;
    case 'levelup': UI.cardPop(e.m, 'LV' + e.lvl, 'heal'); UI.toast = { text: p.members[e.m].name + ' has reached level ' + e.lvl + '!', t: 3 }; break;
    case 'floor': UI.floorToast = { text: B.FLOORS[e.id].name, t: 3 }; break;
    case 'deed': UI.toast = { text: 'A hidden deed is done!', t: 3 }; break;
    case 'secretFound': UI.toast = { text: 'A secret is found!', t: 2.5 }; break;
  }
};
UI.cardPop = (m, text, kind, h) => { if (text) UI.pops.push({ m, text, kind, t: 0, h }); if (kind === 'hurt' || kind === 'hit') (UI.cardHurt[m] = .5); };
UI.cardHurt = {};
/** card rect for the member at formation position pos */
UI.cardRect = (r, pos, n) => {
  const gap = 3, gg = 4, cw = Math.max(46, Math.min(66, Math.floor((r.W - 8 - (n > 4 ? 12 : 6)) / n))), total = n * cw + (n > 4 ? 2 : 1) * 0; const rows = Math.ceil(n / 2);
  const groupW = 2 * cw + 2, tot = rows * groupW + (rows - 1) * gg; const x0 = Math.round((r.W - tot) / 2); const row = pos >> 1, col = pos & 1;
  return [x0 + row * (groupW + gg) + col * (cw + 2), r.H - 49, cw, 46];
};
UI.drawCard = (g, r, pos, n, o) => {
  const S = B.S, p = S.party, mi = p.formation[pos]; if (mi == null) return; const m = p.members[mi]; if (!m) return; const [x, y, w, h] = UI.cardRect(r, pos, n), sel = p.selected === mi, E = My3D2dge, P = UI.PAL;
  const down = m.state === 'down', dead = m.state === 'dead', hurt = UI.cardHurt[mi] > 0;
  E.ui.box(g, x, y, w, h, { bg: hurt ? ['#4a1418', '#2a0a0c'] : [P.bg1, P.bg2], border: sel ? P.focus : P.border, shadow: false });
  if (sel) { g.strokeStyle = P.focus; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); }
  if (!m.rig) m.rig = B.rigFor(m);
  if (dead) { g.fillStyle = '#1a1620'; g.fillRect(x + 3, y + 3, 26, 26); g.fillStyle = '#d8d0b8'; g.fillRect(x + 12, y + 10, 8, 6); g.fillRect(x + 14, y + 16, 4, 4); g.fillStyle = '#1a1620'; g.fillRect(x + 13, y + 12, 2, 2); g.fillRect(x + 17, y + 12, 2, 2); }
  else { m.rig.drawPortrait(g, x + 3, y + 3, 26, { zoom: 2.4, turn: .4, bg: hurt ? '#6a2a2a' : '#2a2438', tint: down ? '#707070' : undefined }); UI.beard(g, m, x + 3, y + 3, 26); }
  const fy = y + 30; g.fillStyle = '#1a1612'; g.fillRect(x + 3, fy, 26, 2); g.fillStyle = m.food <= 25 ? '#e05a3a' : P.food; g.fillRect(x + 3, fy, Math.round(26 * m.food / 100), 2);
  E.font.text(g, m.name.slice(0, 7), x + 32, y + 3, dead ? P.dim : P.text, { font: 'tiny', outline: false, shadow: '#000' });
  E.ui.bar(g, x + 32, y + 10, w - 36, 4, m.max ? m.hp / m.max : 0, dead ? '#444' : P.hp);
  E.font.text(g, dead ? 'DEAD' : down ? 'DOWN' : m.hp + '/' + m.max, x + 32, y + 16, down || dead ? P.bad : '#c8c0b0', { font: 'tiny', outline: false });
  // status icons
  let sx = x + 32; const ic = (c, f) => { g.fillStyle = c; g.fillRect(sx, y + 22, 4, 4); sx += 5; };
  if (m.status.poison > 0) ic('#6af06a'); if (m.status.held > 0) ic('#ffd040'); if (m.status.blessed > 0) ic('#fff0a0'); if (m.ward > 0) ic('#e8e8ff'); if (m.food <= 25) ic('#c8a040');
  // hand slots
  for (let k = 0; k < 2; k++) {
    const hs = k ? 'off' : 'main', hx = x + w - 33 + k * 15 + (w < 56 ? 1 : 0) - (w < 56 ? 4 : 0) + 1, hy = y + h - 16, ref = m.slots[hs], cd = m.cool[hs];
    g.fillStyle = '#0e0c0a'; g.fillRect(hx, hy, 14, 14); g.strokeStyle = sel && o.hover === hs ? P.focus : '#5a4a2a'; g.strokeRect(hx + .5, hy + .5, 13, 13);
    if (ref) UI.icon(g, ref.id, hx + 1, hy + 1, 12); else if (hs === 'main') UI.icon(g, 'fist', hx + 1, hy + 1, 12);
    if (dead) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(hx, hy, 14, 14); continue; }
    if (cd > 0) { const tot = 1.5; const f = Math.min(1, cd / tot); g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(hx, hy, 14, Math.ceil(14 * f)); }
    else if (ref && m.state === 'ok' && (Math.floor(UI.game.real * 2) % 5 === 0)) { g.fillStyle = 'rgba(255,240,160,.3)'; g.fillRect(hx, hy, 14, 14); }
  }
  // pops
  for (const q of UI.pops) if (q.m === mi) { const a = 1 - q.t / .8; E.font.text(g, q.text, x + w / 2, y + 12 - q.t * 14, q.kind === 'hurt' ? '#ff6a5a' : q.kind === 'heal' ? '#8aff9a' : '#ffe8a0', { align: 'center', font: 'normal', outline: '#000' }); }
  if (sel && UI.last() === 'gamepad') { UI.glyph(g, 'handOff', x + w - 33, y - 8); UI.glyph(g, 'handMain', x + w - 18, y - 8); }
};
UI.hud = (g, r, dt) => {
  const S = B.S, p = S.party, E = My3D2dge, P = UI.PAL, n = p.members.length;
  // chevrons and vignette
  for (const c of UI.chev) { const a = Math.max(0, 1 - c.t / .6); g.save(); g.globalAlpha = a * .8; g.fillStyle = '#e03a3a'; if (c.rel === 0) { g.globalAlpha = a * .25; g.fillRect(0, 0, r.W, r.H); } else if (c.rel === 3) { for (let i = 0; i < 3; i++) g.fillRect(2 + i * 4, r.H / 2 - 20 + i * 8, 3, 18 - i * 6); } else if (c.rel === 1) { for (let i = 0; i < 3; i++) g.fillRect(r.W - 5 - i * 4, r.H / 2 - 20 + i * 8, 3, 18 - i * 6); } else { for (let i = 0; i < 3; i++) g.fillRect(r.W / 2 - 20 + i * 14, r.H - 70 - i * 3, 12, 3); } g.restore(); }
  // compass
  const cx = Math.round(r.W / 2), W4 = B.DIRS, d = p.dir;
  E.ui.box(g, cx - 32, 3, 64, 16, { bg: [P.bg1, P.bg2], border: P.border, shadow: false });
  E.font.text(g, W4[(d + 3) % 4], cx - 24, 7, P.dim, { outline: false }); E.font.text(g, W4[(d + 1) % 4], cx + 20, 7, P.dim, { outline: false }); E.font.text(g, W4[d], cx, 5, P.focus, { align: 'center', scale: 2, outline: '#000' });
  if (B.opt.minimap) { const d = B.def(), F = B.F(), sz = 3, w = d.w * sz, h = d.h * sz, x0 = r.W - w - 6, y0 = 30; E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: ['#0e0c0a', '#0e0c0a'], border: P.border, shadow: false });
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { if (!F.seen[y * d.w + x]) continue; const c = B.chAt(S.floor, x, y); g.fillStyle = c === '#' ? '#6a5a3a' : c === '>' || c === '<' ? '#3a8aaa' : '#2a2418'; g.fillRect(x0 + x * sz, y0 + y * sz, sz, sz); }
    g.fillStyle = '#ff5a4a'; g.fillRect(x0 + p.cx * sz, y0 + p.cy * sz, sz, sz); }
  // floor toast
  if (UI.floorToast) { const t = UI.floorToast; E.font.text(g, t.text, 6, 6, P.text, { shadow: '#000', outline: false }); }
  // boss bar
  if (S.boss && S.floor === 'f4' && S.boss.awake && !S.boss.dead) { const b = S.boss, bw = Math.min(200, r.W - 40); const bx = Math.round((r.W - bw) / 2); E.font.text(g, 'THE BOLT-HOLDER', cx, 22, '#ffd8a0', { align: 'center', font: 'tiny', outline: '#000' }); E.ui.bar(g, bx, 29, bw, 6, b.hp / b.max, b.opened ? '#e8a030' : '#9a8a70'); for (let i = 0; i < 3; i++) { const id = ['glW', 'glE', 'glN'][i]; g.fillStyle = b.locks[id] ? '#50e8ff' : '#3a3440'; g.fillRect(cx - 10 + i * 8, 37, 6, 4); } }
  // race HUD
  if (S.race) { const rc = S.race, t = rc.t, mm = Math.floor(t / 60), ss = (t % 60).toFixed(1).padStart(4, '0'); E.ui.box(g, 4, 22, 92, 30, { bg: [P.bg1, P.bg2], border: P.border, shadow: false }); E.font.text(g, String(mm).padStart(2, '0') + ':' + ss, 9, 26, rc.go ? P.focus : P.dim, { scale: 2, outline: '#000' }); E.font.text(g, 'CP ' + rc.cp + '/' + B.FLOORS.rr.cps.length + '   CROWNS ' + rc.crowns, 9, 42, P.text, { font: 'tiny', outline: false }); }
  // party bar
  for (let pos = 0; pos < n; pos++) UI.drawCard(g, r, pos, n, { hover: UI.hoverHand && UI.hoverHand.pos === pos ? UI.hoverHand.h : null });
  const rows = Math.ceil(n / 2); for (let i = 0; i < rows; i++) { const [x, y, w] = UI.cardRect(r, i * 2, n); E.font.text(g, ['FRONT', 'MID', 'BACK'][i], x + w, y - 6, P.dim, { font: 'tiny', outline: false, align: 'center' }); }
  // log
  const now = UI.game.real; const recent = UI.logs.filter(l => now - l.t < 8).slice(-3);
  recent.forEach((l, i) => { const lines = UI.wrap(l.text, Math.min(r.W - 120, 230)); const a = Math.min(1, (8 - (now - l.t)) / 1.5); g.globalAlpha = a; UI.text(g, lines[0] + (lines.length > 1 ? '...' : ''), 6, r.H - 58 - (recent.length - 1 - i) * 9, l.kind === 'bad' ? P.bad : l.kind === 'good' ? P.good : l.kind === 'hint' ? '#ffe090' : P.text); g.globalAlpha = 1; });
  // Hand
  if (p.hand) { const ref = p.hand, it = B.ITEMS[ref.id], hx = Math.round(r.W / 2); E.ui.box(g, hx - 40, r.H - 66, 80, 14, { bg: [P.bg1, P.bg2], border: P.focus, shadow: false }); UI.icon(g, ref.id, hx - 38, r.H - 65, 12); UI.text(g, it.n + (ref.n ? ' ×' + ref.n : ''), hx - 24, r.H - 63, P.text, { font: 'normal' }); }
  // tooltip
  if (UI.tip) { E.ui.box(g, UI.tip.x + 6, UI.tip.y + 8, E.font.width(UI.tip.text) + 8, 12, { bg: [P.bg1, P.bg2], border: P.border, shadow: false }); UI.text(g, UI.tip.text, UI.tip.x + 10, UI.tip.y + 10); }
  // prompts
  UI.prompts(g, UI.playPrompts(), r.W - 4, r.H - 66, { right: true });
  // toast
  if (UI.toast) { const tw = E.font.width(UI.toast.text) + 14; E.ui.box(g, Math.round((r.W - tw) / 2), 42, tw, 14, { bg: ['#3a2a10', '#1a1208'], border: P.focus, shadow: false }); UI.text(g, UI.toast.text, r.W / 2, 45, '#ffe8a0', { align: 'center' }); }
  // first-time tip
  if (UI.tipLine) { const tw = Math.min(r.W - 20, E.font.width(UI.tipLine.text) + 12); E.ui.box(g, Math.round((r.W - tw) / 2), 62, tw, 14, { bg: [P.bg1, P.bg2], border: P.border, shadow: false }); UI.text(g, UI.tipLine.text, r.W / 2, 65, '#ffe090', { align: 'center' }); }
};
UI.playPrompts = () => {
  const S = B.S, p = S.party, F = B.F(), list = [], [fx, fy] = B.front(), ft = B.featureAt(p.cx, p.cy, p.dir), c = B.cell(fx, fy);
  if (ft && ft.k !== 'torch') list.push(['use', { lever: 'Pull lever', button: 'Press', catch: 'Press stone', plaque: 'Read', alcove: p.hand ? 'Place' : 'Take', candle: 'Light', clock: 'Wind clock', undergate: 'Insert ward', greatLock: 'Turn lock', shrine: 'Pray' }[ft.k] || 'Use']);
  else if (c === '+' || c === 'L' || c === 'M') list.push(['use', F.doors[B.key(fx, fy)].open ? 'Close' : 'Open']);
  else if (B.npcAt(fx, fy)) list.push(['use', 'Talk']);
  else if (p.hand) list.push(['use', 'Stow']); else if ((F.items[B.key(fx, fy)] || []).length || (F.items[B.key(p.cx, p.cy)] || []).length) list.push(['use', 'Take']);
  list.push(['strike', 'Strike']); if (p.hand) list.push(['throw', 'Throw']); list.push(['party', 'Party']); list.push(['map', 'Map']);
  return list.slice(0, 5);
};
/* ---- tips (first-time help) ---- */
UI.tipOnce = (key, text) => { if (B.opt.hints === false || UI.tips[key]) return; UI.tips[key] = true; UI.tipLine = { text, t: 6 }; };
UI.updateHud = (dt) => {
  const real = UI.game.real; for (const q of UI.pops) q.t += dt; UI.pops = UI.pops.filter(q => q.t < .8); for (const c of UI.chev) c.t += dt; UI.chev = UI.chev.filter(c => c.t < .6);
  for (const k in UI.cardHurt) UI.cardHurt[k] = Math.max(0, UI.cardHurt[k] - dt);
  if (UI.toast && (UI.toast.t -= dt) <= 0) UI.toast = null; if (UI.floorToast && (UI.floorToast.t -= dt) <= 0) UI.floorToast = null; if (UI.tipLine && (UI.tipLine.t -= dt) <= 0) UI.tipLine = null;
  const S = B.S; if (S && !S.camp) { const F = B.F(); if (F.mons.some(m => m.hp > 0 && m.aware && m.state !== 'asleep')) { const t = F.mons.find(m => m.hp > 0 && m.aware); UI.tipOnce('fight', 'Monsters! ' + UI.game.input.label('strike') + ' strikes with everyone who is ready.'); } }
};
