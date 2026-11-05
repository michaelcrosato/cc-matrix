/* =====================================================================================
 * 62-ui-hud: the screens' stack (UI), and the play HUD over the full-screen view: the party bar (one card a member in
 * formation order: a live portrait, name, HP, food, two hand slots with cooldown wipes and pops, statuses), the compass,
 * the log, context prompts, the Hand, hit chevrons, the boss bar, hints, barks, the floor card and the fades
 * ===================================================================================== */
const UI = {
  W: 427, H: 240, stack: [], rigs: new Map(), log: [], hintQ: [], hint: null, bark: null, toast: null, chev: [], vign: 0, tip: null, floorToast: null,
  open(name, data) { const s = SCREENS[name]; if (!s) return; if (this.top() && this.top().name === name) return; this.stack.push({ name, s }); if (s.open) s.open(data || {}); game.input.consumeAll(); Sound.sfx('uiConfirm'); },
  close() { const t = this.stack.pop(); if (t && t.s.close) t.s.close(); game.input.consumeAll(); Sound.sfx('uiBack'); },
  closeAll() { while (this.stack.length) this.close(); },
  top() { return this.stack[this.stack.length - 1] || null; },
  is(name) { const t = this.top(); return !!t && t.name === name; },
  any() { return this.stack.length > 0; },
  /** the pointer is over the 3D view (not the cards or a screen) */
  inView() { const pt = game.input.pointer && game.input.pointer(); return !this.any() && !!pt && pt[1] < this.barTop() - 2; },
  memberAtPlace(p) { return S.party.form[p]; },
  rig(m) {
    let r = this.rigs.get(m.id); if (!r || r._look !== m.look) { r = B.rigOf(m.look); r._look = m.look; this.rigs.set(m.id, r); }
    return r;
  },
  barTop() { return this.H - 50; },
  say(text, c) { this.log.push({ text, c, t: game.real }); if (this.log.length > 60) this.log.shift(); },
  showHint(id) { const t = B.TXT[id] || id; this.hintQ.push({ text: t, t: 0 }); this.say(B.plainText(t), '#a8d8ff'); },
  /** sim events the HUD reacts to */
  event(e) {
    switch (e.t) {
      case 'msg': this.say(e.text, e.c); break;
      case 'hint': this.showHint(e.id); break;
      case 'bark': this.bark = { who: e.who, text: e.text, t: 0, dur: Math.max(2.6, e.text.length * .07) }; break;
      case 'hurt': if (e.n > 0 && e.side !== null && e.side !== undefined) { if (e.side === 0) this.vign = .5; else this.chev.push({ side: e.side, t: 0 }); } break;
      case 'floor': this.floorToast = { text: B.FLOORS[e.to].name, t: 0 }; break;
      case 'castMenu': if (!this.any()) this.open('cast', { m: e.m }); break;
      case 'levelUp': { const m = S.party.members[e.m]; if (m) this.toast = { text: m.name + ' has reached level ' + m.lvl + '!', t: 0, dur: 2.6 }; break; }
      case 'read': if (!e.plaque) this.open('reader', { note: e.note }); break;
      case 'examine': break;
    }
  },
  update(dt) {
    if (this.hint) { this.hint.t += dt; if (this.hint.t > 6) this.hint = null; }
    if (!this.hint && this.hintQ.length) this.hint = this.hintQ.shift();
    if (this.bark && (this.bark.t += dt) > this.bark.dur) this.bark = null;
    for (const c of this.chev) c.t += dt; this.chev = this.chev.filter(c => c.t < .6);
    this.vign = Math.max(0, this.vign - dt);
    if (this.floorToast && (this.floorToast.t += dt) > 3) this.floorToast = null;
    if (this.toast && (this.toast.t += dt) > (this.toast.dur || 2.5)) this.toast = null;
    if (S) for (const m of S.party.members) { const r = this.rig(m); r.update(dt, { x: 0, y: 0, hurt: m.fx.hurt > 0, expr: m.fx.hurt > 0 ? 'wince' : m.fx.lvl > 0 || m.fx.heal > 0 ? 'smile' : m.state === 'down' ? 'wince' : null }); }
  },
  /** the cards' rects: { m, x, y, w, h, por: [x, y, s], hands: { main: [x, y, s], off } }, by place, in rows of two */
  cards() {
    const W = this.W, H = this.H, P = S.party, places = [0, 1, 2, 3, 4, 5].filter(p => P.form[p] >= 0), n = places.length;
    const rows = new Set(places.map(p => p >> 1)).size, gap = 2, rowGap = 5;
    let cw = Math.min(68, Math.floor((W - 6 - (n - 1) * gap - (rows - 1) * rowGap) / Math.max(1, n))); const ch = 46;
    const total = n * cw + (n - 1) * gap + (rows - 1) * rowGap; let x = Math.round((W - total) / 2); const y = H - ch - 2;
    const out = []; let lastRow = -1;
    for (const p of places) {
      const row = p >> 1; if (lastRow >= 0 && row !== lastRow) x += rowGap; lastRow = row;
      const compact = cw < 60, ps = compact ? 22 : 28, hs = 15;
      const c = { p, mi: P.form[p], x, y, w: cw, h: ch, row, por: [x + 3, y + 3, ps] };
      c.hands = compact ? { main: [x + cw - hs - 2, y + 3, hs], off: [x + cw - hs - 2, y + 4 + hs, hs] } : { main: [x + cw - hs * 2 - 4, y + 4, hs], off: [x + cw - hs - 2, y + 4, hs] };
      out.push(c); x += cw + gap;
    }
    return out;
  },
  /** clicks on the cards: a hand slot uses that hand; a portrait selects; a right click opens the Party screen there */
  cardClicks() {
    const I = game.input, ck = I.clicked(), pt = I.pointer && I.pointer(), rc = I.pressed('rclick');
    const hit = (r, p) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[2];
    const out = [];
    for (const c of this.cards()) {
      if (ck) { for (const h of ['main', 'off']) if (hit(c.hands[h], ck)) { out.push({ c: 'select', m: c.mi }, { c: 'hand', m: c.mi, h }); return out; } if (ck[0] >= c.x && ck[0] < c.x + c.w && ck[1] >= c.y && ck[1] < c.y + c.h) { out.push({ c: 'select', m: c.mi }); return out; } }
      if (rc && pt && pt[0] >= c.x && pt[0] < c.x + c.w && pt[1] >= c.y && pt[1] < c.y + c.h) { out.push({ c: 'select', m: c.mi }, { ui: 'party', m: c.mi }); return out; }
    }
    return out;
  },
  /** the mouse's little helpers at the top right (shown only for the mouse) */
  helpers() {
    const ca = game.cornerArea(), x1 = (ca ? ca.x0 : this.W) - 4, y = 4, list = [['Map', 'map'], ['Camp', 'camp'], ['Party', 'party'], ['Journal', 'journal']];
    let x = x1; const out = [];
    for (const [label, ui] of list.slice().reverse()) { const w = TW(label) + 8; x -= w + 2; out.push({ x, y, w, h: 13, label, ui }); }
    return out;
  },
  helperClicks() { if (game.input.lastDevice !== 'mouse') return []; const ck = game.input.clicked(); if (!ck) return []; for (const h of this.helpers()) if (ck[0] >= h.x && ck[0] < h.x + h.w && ck[1] >= h.y && ck[1] < h.y + h.h) return [{ ui: h.ui }]; return []; }
};
B.UI = UI;
const SCREENS = {};
B.SCREENS = SCREENS;
/** status icons on a card */
function statusIcons(g, m, x, y) {
  const s = m.status, list = [];
  if (s.poison > 0) list.push(['#6ad06a', 'drop']); if (s.held > 0) list.push(['#c8c8d8', 'chain']); if (m.ward > 0) list.push(['#ffd36a', 'shield']);
  if (s.brace > 0) list.push(['#b8bcc8', 'shield']); if (m.food <= 25) list.push([m.food <= 0 ? '#ff5a4a' : '#c8a040', 'bowl']); if (m.pendingLvl) list.push(['#ffd36a', 'star']);
  list.forEach(([c, k], i) => {
    const ix = x + i * 7;
    if (k === 'drop') { px.disc(g, ix + 3, ix ? y + 4 : y + 4, 2, c); px.dot(g, ix + 3, y + 1, c); }
    else if (k === 'chain') { px.rect(g, ix + 1, y + 1, 2, 2, c); px.rect(g, ix + 3, y + 3, 2, 2, c); }
    else if (k === 'shield') { px.rect(g, ix + 1, y + 1, 4, 3, c); px.rect(g, ix + 2, y + 4, 2, 1, c); }
    else if (k === 'bowl') { px.rect(g, ix, y + 3, 6, 1, c); px.rect(g, ix + 1, y + 4, 4, 1, c); }
    else { px.dot(g, ix + 3, y + 1, c); px.rect(g, ix + 1, y + 2, 5, 1, c); px.dot(g, ix + 2, y + 4, c); px.dot(g, ix + 4, y + 4, c); }
  });
}
/** one hand slot: the item, the cooldown wipe, a ready glint, MISS or a number */
function handSlot(g, m, h, x, y, s, sel) {
  const it = m.slots[h], ready = m.cool[h] <= 0 && m.state === 'ok' && !(m.status.held > 0), two = h === 'off' && m.slots.main && IT(m.slots.main.id).two;
  px.rect(g, x, y, s, s, '#0a0908'); px.rect(g, x + 1, y + 1, s - 2, s - 2, ready ? '#3a3226' : '#211c16');
  if (two) { if (m.slots.main) { g.save(); g.globalAlpha = .35; icon(g, m.slots.main.id, x + 1.5, y + 1.5); g.restore(); } }
  else if (it) icon(g, it.id, x + 1.5, y + 1.5); else { px.rect(g, x + 5, y + 6, 5, 4, '#5a4a3a'); px.rect(g, x + 6, y + 4, 1, 2, '#5a4a3a'); px.rect(g, x + 8, y + 4, 1, 2, '#5a4a3a'); }
  if (m.cool[h] > 0) { const k = clamp(m.cool[h] / (m.coolMax[h] || 1), 0, 1), hh = Math.round((s - 2) * k); g.save(); g.globalAlpha = .62; px.rect(g, x + 1, y + 1 + (s - 2 - hh), s - 2, hh, '#000000'); g.restore(); }
  else if (ready && ((game.real * 2 + x * .1) % 3) < .15) px.dot(g, x + s - 3, y + 2, '#fff6c8');
  if (sel) { px.rect(g, x, y + s, s, 1, COL.focus); }
}
const ROW_LABEL = ['FRONT', 'MID', 'BACK'];
/** the play HUD */
function drawHud(g, r) {
  UI.W = r.W; UI.H = r.H;
  const W = r.W, H = r.H, P = S.party, sel = P.sel;
  // chevrons and the vignette for blows from the flanks and behind
  for (const c of UI.chev) { const a = 1 - c.t / .6, col = '#ff3a2a'; g.save(); g.globalAlpha = a * .9; const n = 3; for (let i = 0; i < n; i++) { if (c.side === 3) { const x = 4 + i * 5, y = H / 2 - 20; px.poly(g, [[x + 6, y], [x, y + 20], [x + 6, y + 40], [x + 9, y + 40], [x + 3, y + 20], [x + 9, y]], col); } else if (c.side === 1) { const x = W - 13 - i * 5, y = H / 2 - 20; px.poly(g, [[x + 3, y], [x + 9, y + 20], [x + 3, y + 40], [x, y + 40], [x + 6, y + 20], [x, y]], col); } else { const y = UI.barTop() - 14 - i * 5, x = W / 2 - 30; px.poly(g, [[x, y], [x + 30, y + 8], [x + 60, y], [x + 60, y + 3], [x + 30, y + 11], [x, y + 3]], col); } } g.restore(); }
  if (UI.vign > 0) { g.save(); g.globalAlpha = UI.vign * .6; px.rect(g, 0, 0, W, 3, '#c8201a'); px.rect(g, 0, 0, 3, H, '#c8201a'); px.rect(g, W - 3, 0, 3, H, '#c8201a'); g.restore(); }
  // the compass
  const cx = Math.round(W / 2), dir = P.dir;
  panel(g, cx - 34, 2, 68, 18, { alpha: .82, rivets: false });
  TXT(g, FACE[(dir + 3) % 4], cx - 26, 7, COL.dim); TXT(g, FACE[(dir + 1) % 4], cx + 21, 7, COL.dim);
  E.font.text(g, FACE[dir], cx - TW(FACE[dir], { scale: 2 }) / 2, 5, COL.focus, { scale: 2, shadow: '#000', outline: false });
  // the boss bar
  if (S.floor === 'f4' && S.boss && S.boss.awake && (S.boss.alive || S.boss.dead < 2)) {
    const Bs = S.boss, bw = Math.min(200, W - 120), bx = Math.round(cx - bw / 2);
    TXT(g, 'THE BOLT-HOLDER', cx - TW('THE BOLT-HOLDER') / 2, 23, '#ffd8a0');
    px.rect(g, bx - 1, 32, bw + 2, 8, '#0a0808'); E.ui.bar(g, bx, 33, bw, 6, Bs.hp / Bs.max, Bs.phase === 1 ? '#8a7a6a' : Bs.relocked ? '#c86a30' : '#e0463c');
    Object.keys(Bs.locks).forEach((id, i) => { const lx = bx + bw + 6 + i * 9; px.disc(g, lx, 36, 3, Bs.locks[id] ? '#ffd36a' : '#3a4050'); px.disc(g, lx, 36, 1, Bs.locks[id] ? '#fff6c8' : '#8ae0ff'); });
    if (Bs.phase === 1) TXT(g, 'Caged', bx - TW('Caged') - 5, 33, '#8a8e9a');
  }
  // the floor's name on arrival
  if (UI.floorToast) { const a = clamp(Math.min(UI.floorToast.t, 3 - UI.floorToast.t) * 2, 0, 1); g.save(); g.globalAlpha = a; TXT(g, UI.floorToast.text, 6, 6, '#ffe6b0'); g.restore(); }
  // the party bar
  const cards = UI.cards(); let lastRow = -1;
  for (const c of cards) {
    const m = P.members[c.mi], dead = m.state === 'dead', down = m.state === 'down', shake = m.fx.hurt > .3 && !game.reduceMotion ? Math.round(Math.sin(game.real * 60) * 1) : 0, x = c.x + shake;
    if (c.row !== lastRow) { TXT(g, ROW_LABEL[c.row], x + 1, c.y - 9, '#8a7e68', { font: 'tiny' }); lastRow = c.row; }
    const bg = m.fx.hurt > 0 ? ['#4a1612', '#200a08'] : m.fx.heal > 0 ? ['#16341c', '#0a160c'] : m.fx.lvl > 0 ? ['#3a2e10', '#1a1406'] : COL.bg;
    panel(g, x, c.y, c.w, c.h, { bg, border: c.mi === sel ? COL.focus : '#7a6236', rivets: false, alpha: .92 });
    if (c.mi === sel) { px.rect(g, x + 1, c.y + 1, c.w - 2, 1, '#ffe8a0'); }
    const [ppx, ppy, ps] = c.por;
    if (dead) { px.rect(g, ppx + shake, ppy, ps, ps, '#141210'); drawSkull(g, ppx + shake + ps / 2, ppy + ps / 2); }
    else UI.rig(m).drawPortrait(g, ppx + shake, ppy, ps, { zoom: ps > 24 ? 2.6 : 2.1, turn: .45, bg: '#2a2218', border: '#5a4a2a', tint: down ? '#606060' : undefined });
    // food strip under the portrait
    px.rect(g, ppx + shake, ppy + ps + 1, ps, 2, '#201a10'); px.rect(g, ppx + shake, ppy + ps + 1, Math.round(ps * m.food / 100), 2, m.food <= 25 ? '#e07a3a' : COL.food);
    // name, HP
    const nameY = c.y + c.h - 11, nx = ppx + shake;
    const nm = m.name.length > 7 ? m.name.slice(0, 7) : m.name;
    TXT(g, nm, nx, nameY - 1, dead ? '#6a5a50' : down ? '#a08070' : COL.text, { font: c.w < 60 ? 'tiny' : undefined });
    const hpx = c.w < 60 ? x + ps + 6 : x + ps + 6, hpw = c.x + c.w - hpx - 3 + shake;
    if (c.w >= 60) { E.ui.bar(g, hpx, c.y + 23, hpw, 4, dead ? 0 : m.hp / m.max, COL.hp); TXT(g, dead ? 'DEAD' : down ? 'DOWN' : m.hp + '/' + m.max, hpx, c.y + 29, dead || down ? '#ff8a6a' : '#d8ccb8', { font: 'tiny' }); }
    else { E.ui.bar(g, x + 3, nameY + 8, c.w - 6, 2, dead ? 0 : m.hp / m.max, COL.hp); }
    // the hands
    for (const h of ['main', 'off']) { const [hx, hy, hs] = c.hands[h]; handSlot(g, m, h, hx + shake, hy, hs, c.mi === sel && h === 'main'); }
    if (c.mi === sel && devOf() === 'pad') { const [mx, my, ms] = c.hands.main, [ox] = c.hands.off; if (c.w >= 60) { glyph(g, 'handMain', mx + 2, my + ms + 2); glyph(g, 'handOff', ox + 2, my + ms + 2); } }
    // spell slots (casters)
    if (B.isCaster(m) && c.w >= 60 && !dead) { const rs = B.readySpells(m), n = Object.values(rs).reduce((a, b) => a + b, 0); for (let k = 0; k < Math.min(8, n); k++) px.rect(g, hpx + k * 3, c.y + 36, 2, 2, COL.slot); }
    statusIcons(g, m, x + 3 + (c.w >= 60 ? ps + 3 : 0), c.y + (c.w >= 60 ? 39 : 2));
    if (m.pop) { const a = clamp(m.pop.t / .9, 0, 1), py = c.y - 4 - (1 - a) * 8; TXT(g, m.pop.n, c.x + c.w / 2 - TW(String(m.pop.n)) / 2, py, m.pop.c); }
    if (m.status.held > 0) { g.save(); g.globalAlpha = .35; px.rect(g, x + 1, c.y + 1, c.w - 2, c.h - 2, '#8ac8ff'); g.restore(); }
  }
  // the log: the newest three lines, fading after 8 s
  const top = UI.barTop(), lines = UI.log.filter(l => game.real - l.t < 8).slice(-3), lw = Math.min(W * .55, 230);
  lines.forEach((l, i) => { const a = clamp((8 - (game.real - l.t)) / 1.5, 0, 1); g.save(); g.globalAlpha = a; const wl = E.font.wrap(l.text, lw)[0]; TXT(g, wl + (wl.length < l.text.length ? '...' : ''), 5, top - 12 * (lines.length - i) - 12, l.c || COL.text); g.restore(); });
  // prompts for what is ahead
  if (!UI.any() && !S.talk) { const ps = contextPrompts(); if (ps.length) prompts(g, ps, W - 6, top - 12, { align: 'right' }); }
  // the Hand
  if (P.hand) {
    const pt = game.input.pointer && game.input.pointer(), mouse = game.input.lastDevice === 'mouse' && pt;
    if (mouse) { icon(g, P.hand.id, pt[0] + 4, pt[1] + 4, 2); }
    else { const nm = B.itemName(P.hand), w = TW(nm) + 34, hx = Math.round(W / 2 - w / 2), hy = top - 30; panel(g, hx, hy, w, 18, { alpha: .85, rivets: false }); icon(g, P.hand.id, hx + 4, hy + 3); TXT(g, nm, hx + 20, hy + 5, '#ffe6b0'); }
  }
  // the mouse's helpers
  if (game.input.lastDevice === 'mouse') for (const h of UI.helpers()) { panel(g, h.x, h.y, h.w, h.h, { alpha: .75, rivets: false }); TXT(g, h.label, h.x + 4, h.y + 3, COL.text); }
  // a hotspot under the mouse: its rim and its name
  const pt = game.input.pointer && game.input.pointer();
  if (pt && game.input.lastDevice === 'mouse' && !UI.any()) { const h = B.view.pick(pt[0], pt[1]); if (h) { const p = (Math.sin(game.real * 6) + 1) / 2; g.save(); g.globalAlpha = .5 + p * .3; for (let a = 0; a < 24; a++) { const q = a / 24 * TAU; px.dot(g, h.x + Math.cos(q) * h.r * .6, h.y + Math.sin(q) * h.r * .6, COL.focus); } g.restore(); const tw = TW(h.label) + 8; panel(g, clamp(pt[0] + 8, 2, W - tw - 2), pt[1] - 16, tw, 13, { alpha: .9, rivets: false }); TXT(g, h.label, clamp(pt[0] + 8, 2, W - tw - 2) + 4, pt[1] - 13, '#ffe6b0'); } }
  // the race clock
  if (S.race) drawRaceHud(g, r);
  // a hint
  if (UI.hint) { const h = UI.hint, a = clamp(Math.min(h.t * 3, (6 - h.t) * 2), 0, 1), w = Math.min(W - 40, 300); g.save(); g.globalAlpha = a; const lines2 = Math.ceil(richWidth(h.text) / (w - 16)) + 0; panel(g, W / 2 - w / 2, 44, w, 10 + lines2 * 11, { bg: ['#14202c', '#0a1016'], border: '#6a9ac8' }); rich(g, h.text, W / 2 - w / 2 + 8, 49, '#e0f0ff', { wrap: w - 16 }); g.restore(); }
  // a bark
  if (UI.bark) { const b = UI.bark, nm = (B.PEOPLE[b.who] || {}).name || '', t = (nm ? nm + ': ' : '') + b.text, w = Math.min(W - 40, TW(t) + 16); const a = clamp(Math.min(b.t * 4, (b.dur - b.t) * 3), 0, 1); g.save(); g.globalAlpha = a; const by = Math.round(H * .44); panel(g, W / 2 - w / 2, by, w, 16, { bg: ['#2a1a2a', '#140a14'], border: '#c8a0ff', rivets: false }); TXT(g, E.font.wrap(t, w - 12)[0], W / 2 - w / 2 + 6, by + 4, '#f0e0ff'); g.restore(); }
  // the Great Lock heaving
  if (P.busy) { const k = P.busy.t / P.busy.dur; panel(g, W / 2 - 50, H * .5 - 8, 100, 16, { rivets: false }); E.ui.bar(g, W / 2 - 44, H * .5 - 3, 88, 6, k, '#8ae0ff'); }
  if (UI.toast) { const t = UI.toast; const w = TW(t.text) + 16; panel(g, W / 2 - w / 2, 62, w, 16, { rivets: false }); TXT(g, t.text, W / 2 - w / 2 + 8, 66, '#ffe6b0'); }
}
B.drawHud = drawHud;
function drawSkull(g, x, y) { px.disc(g, x, y - 2, 6, '#d8cfb4'); px.rect(g, x - 4, y + 2, 8, 4, '#d8cfb4'); px.disc(g, x - 2, y - 2, 2, '#141210'); px.disc(g, x + 2, y - 2, 2, '#141210'); px.rect(g, x - 3, y + 4, 1, 2, '#141210'); px.rect(g, x - 1, y + 4, 1, 2, '#141210'); px.rect(g, x + 1, y + 4, 1, 2, '#141210'); }
B.drawSkull = drawSkull;
/** the prompts for what is ahead: up to four */
function contextPrompts() {
  const P = S.party, out = [], [fx, fy] = B.front(), fl = FL(), ft = B.featAt(P.cx, P.cy, P.dir), d = B.doorAt(fx, fy);
  const verbs = { lever: 'Pull lever', button: 'Press', catch: 'Press', alcove: P.hand ? 'Place' : 'Take', shrine: P.hand ? 'Place' : 'Take', gearNiche: 'Place gear', plaque: 'Read', candle: 'Light', greatLock: 'Turn lock', raiseShrine: 'Pray', undergate: 'Insert ward', clockFace: 'Look' };
  if (ft && verbs[ft.kind]) out.push(['use', verbs[ft.kind]]);
  else if (d && fl.doors[d.id].open < .85 && ['door', 'lock'].includes(d.kind)) out.push(['use', fl.doors[d.id].locked ? 'Unlock' : 'Open']);
  else if (d && d.kind === 'door' && fl.doors[d.id].open >= .85) out.push(['use', 'Close']);
  else if (!P.hand && (B.openFree(fx, fy) && B.itemsAt(fx, fy).length || B.itemsAt(P.cx, P.cy).length)) out.push(['use', 'Take']);
  else if (P.hand) out.push(['use', 'Stow']);
  if (P.hand) { out.push([devOf() === 'pad' ? 'use' : 'putDown', devOf() === 'pad' ? 'Hold: put down' : 'Put down']); out.push(['throw', 'Throw']); }
  if (B.monsAt(fx, fy).length || (S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === fx && S.boss.cy === fy) || B.lineTarget(6)) out.push(['strike', 'Strike']);
  if (out.length < 4) out.push(['party', 'Party']);
  if (out.length < 4 && !B.enemiesNear(6)) out.push(['camp', 'Camp']);
  return out.slice(0, 4);
}
B.contextPrompts = contextPrompts;
/** fades and the floor's card over a floor change; letterbox bars over a moment */
function drawTransit(g, r) {
  const T = S.transit, W = r.W, H = r.H;
  if (T) {
    let a = 0;
    if (T.k === 'fall') a = T.t < .55 ? T.t / .55 : clamp(1 - (T.t - .55) / .5, 0, 1);
    else a = T.t < .4 ? T.t / .4 : T.t > T.dur - .4 ? (T.dur - T.t) / .4 : 1;
    g.save(); g.globalAlpha = clamp(a, 0, 1); px.rect(g, 0, 0, W, H, '#000000'); g.restore();
    if (T.k !== 'fall' && T.swapped && T.t < T.dur - .2) {
      const F = B.FLOORS[S.floor], k = clamp(Math.min(T.t - .4, T.dur - .4 - T.t) * 3, 0, 1);
      g.save(); g.globalAlpha = k;
      E.font.title(g, F.name.toUpperCase(), W / 2, H / 2 - 24, { scale: 2, align: 'center', colors: ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'], depthColor: '#2a1a08' });
      TXT(g, F.card, W / 2 - TW(F.card) / 2, H / 2 + 6, '#d8c8a8');
      g.restore();
    }
  }
  if (S.moment) { const k = clamp(Math.min(S.moment.t, S.moment.dur - S.moment.t) * 2, 0, 1), bh = Math.round(H * .1 * k); px.rect(g, 0, 0, W, bh, '#000000'); px.rect(g, 0, H - bh, W, bh, '#000000'); }
  if (S.moment && S.moment.id === 'eyeDeath' && S.moment.t > 2.4 && S.moment.t < 3.8) { g.save(); g.globalAlpha = clamp(1 - Math.abs(S.moment.t - 3.1) / .7, 0, 1); px.rect(g, 0, 0, W, H, '#fff6e0'); g.restore(); }
}
B.drawTransit = drawTransit;
function drawRaceHud(g, r) {
  const R = S.race, t = typeof window !== 'undefined' && B.Hub && B.Hub.active ? Math.max(0, (B.Hub.time() || 0) / 1000) : R.t;
  panel(g, 4, 4, 112, 34, { alpha: .85 });
  E.font.text(g, B.clock(R.done && R.time !== null ? R.time : t), 10, 8, '#ffe6b0', { scale: 2, shadow: '#000', outline: false });
  TXT(g, R.label + '  ' + R.crowns + '★', 10, 26, '#d8ccb8');
  if (B.Hub && B.Hub.standings) B.Hub.standings(g, r);
}
