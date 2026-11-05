// The play-call screen: big cards (the routes and blocks drawn on a strip of field), tabs, FLIP, the Fiasco Card row,
// the COACH SAYS star and the play clock. One panel per human side (split halves head to head, each hidden from the
// other once picked). Pads, keys and the mouse all drive it.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, ui = FF.ui, glyph = FF.glyph, YD = 16;
class PlayCall {
  constructor(m, side, players) {
    this.m = m; this.side = side; this.players = players; this.tab = 0; this.focus = new ui.Focus({ wrap: false }); this.row = 'grid'; this.ci = 0;
    this.flip = false; this.card = null; this.done = false; this.t = 0; this.rcv = 0;
    const o = m.options(side); this.opt = o; this.role = o.role;
    this.suggest = FF.coach.suggest(m, side);
    const tabOf = o.tabs.findIndex(t => (o.plays[t] || []).includes(this.suggest)); if (tabOf >= 0) this.tab = tabOf;
    this.focusSuggest = true;
  }
  get I() { return game.players[this.players[0]] || game.input; }
  plays() { return this.opt.plays[this.opt.tabs[this.tab]] || []; }
  pick(id) {
    if (this.done) return;
    const card = this.card && FF.cardFits(this.card, this.cardRole(id)) ? this.card : null;
    this.done = true; game.audio.sfx('menuSelect');
    if (FF.net && FF.net.isClient && FF.net.isClient()) FF.net.sendCall(this.side, id, this.flip, card);
    else this.m.callPlay(this.side, id, this.flip, card);
    if (this.players[1] !== undefined && this.role === 'off') FF.control.coopSlot = ['WR1', 'WR2', 'RB'][this.rcv % 3];
  }
  cardRole(id) { const p = FF.data.plays[id]; return p && (p.type === 'fg' || p.type === 'punt' || p.type === 'kickoff' || p.kick) ? 'kick' : this.role === 'def' || this.role === 'return' ? 'def' : 'off'; }
  /** this panel's rects (for drawing and the mouse) */
  layout(r, x0, w) {
    const top = 34, cw = Math.floor((w - 28) / 3), ch = Math.min(70, Math.floor((r.H - top - 92) / 2)), L = { cards: [], tabs: [], slots: [], flip: null };
    const ids = this.plays();
    ids.slice(0, 6).forEach((id, k) => L.cards.push({ x: x0 + 8 + (k % 3) * (cw + 6), y: top + 20 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch, id }));
    const tw = Math.floor((w - 16) / Math.max(1, this.opt.tabs.length));
    this.opt.tabs.forEach((t, k) => L.tabs.push({ x: x0 + 8 + k * tw, y: top + 2, w: tw - 4, h: 15, t, k }));
    const sy = top + 20 + 2 * (ch + 6) + 4; for (let k = 0; k < 3; k++) L.slots.push({ x: x0 + 8 + k * 62, y: sy, w: 58, h: 30, k });
    L.flip = { x: x0 + w - 74, y: sy + 6, w: 64, h: 18 };
    return L;
  }
  update(dt, r, x0, w) {
    if (this.done) return;
    this.t += dt;
    const L = this.layout(r, x0, w), I = this.I;
    const ids = this.plays();
    if (this.row === 'grid') {
      this.focus.set(L.cards.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h, id: c.id })));
      if (this.focusSuggest) { const k = L.cards.findIndex(c => c.id === this.suggest); if (k >= 0) this.focus.i = k; this.focusSuggest = false; }
      const k0 = this.focus.i;
      // tabs: shoulders, Q/E, clicks; walking off the grid's side edge turns the tab
      const P = this.players.map(p => game.players[p]).filter(Boolean);
      for (const p of P) {
        if (p.pressed('lb')) this.setTab(this.tab - 1); else if (p.pressed('rb')) this.setTab(this.tab + 1);
        if (p.pressed('b3')) { if (this.players[1] !== undefined && p === game.players[this.players[1]]) { this.rcv++; game.audio.sfx('menuMove'); } else { this.flip = !this.flip; game.audio.sfx('menuMove'); } }
        if (p.pressed('b4') && this.m.cards[this.side].length) { this.row = 'cards'; this.ci = 0; game.audio.sfx('cardFlip'); return; }
        if (p.repeat('left', .32, .09) && k0 % 3 === 0) { this.setTab(this.tab - 1); return; }
        if (p.repeat('right', .32, .09) && (k0 % 3 === 2 || k0 === ids.length - 1)) { this.setTab(this.tab + 1); return; }
      }
      const c = game.input.clicked();
      if (c) { const t = L.tabs.find(t => c[0] >= t.x && c[0] < t.x + t.w && c[1] >= t.y && c[1] < t.y + t.h); if (t) { this.setTab(t.k); return; } if (c[0] >= L.flip.x && c[0] < L.flip.x + L.flip.w && c[1] >= L.flip.y && c[1] < L.flip.y + L.flip.h) { this.flip = !this.flip; return; } const s = L.slots.find(s => c[0] >= s.x && c[0] < s.x + s.w && c[1] >= s.y && c[1] < s.y + s.h); if (s) { this.toggleCard(s.k); return; } }
      const it = this.focus.update(P.length === 1 ? P[0] : undefined);
      if (it) this.pick(it.id);
    } else {
      const P = this.players.map(p => game.players[p]).filter(Boolean), held = this.m.cards[this.side];
      for (const p of P) {
        if (p.repeat('left', .32, .09)) { this.ci = (this.ci + held.length - 1) % held.length; game.audio.sfx('menuMove'); }
        if (p.repeat('right', .32, .09)) { this.ci = (this.ci + 1) % held.length; game.audio.sfx('menuMove'); }
        if (p.pressed('b1') || p.pressed('confirm')) { this.toggleCard(this.ci); this.row = 'grid'; return; }
        if (p.pressed('b2') || p.pressed('cancel') || p.pressed('b4')) { this.row = 'grid'; game.audio.sfx('menuBack'); return; }
      }
      const c = game.input.clicked(); if (c) { const s = L.slots.find(s => c[0] >= s.x && c[0] < s.x + s.w && c[1] >= s.y && c[1] < s.y + s.h); if (s) { this.toggleCard(s.k); this.row = 'grid'; } }
    }
  }
  setTab(k) { const n = this.opt.tabs.length; if (n < 2) return; this.tab = (k + n) % n; this.focus.i = 0; game.audio.sfx('menuMove'); }
  toggleCard(k) { const id = this.m.cards[this.side][k]; if (!id) return; if (this.card === id) { this.card = null; game.audio.sfx('menuBack'); return; } const fits = this.role === 'off' ? FF.cardFits(id, 'off') || FF.cardFits(id, 'kick') : this.role === 'kick' ? FF.cardFits(id, 'kick') || FF.cardFits(id, 'off') : FF.cardFits(id, 'def'); if (!fits) { game.audio.sfx('menuBack'); return; } this.card = id; game.audio.sfx('cardFlip'); }
  draw(g, r, x0, w, hidden) {
    const m = this.m, t = m.teams[this.side], L = this.layout(r, x0, w), left = Math.max(0, m.phaseT);
    ui.panel(g, x0 + 2, 6, w - 4, r.H - 12 - 2, { alpha: .9, border: t.colors.primary === '#1a1a2a' ? t.colors.secondary : t.colors.primary, bg: ['#141432', '#08081a'] });
    // the top bar
    ui.logo(g, t, x0 + 8, 10, 1);
    E.font.text(g, this.role === 'off' ? 'OFFENSE' : this.role === 'def' ? 'DEFENSE' : this.role === 'kick' ? 'KICKOFF' : 'RETURN', x0 + 24, 12, '#ffd84a', { outline: false });
    const dd = m.callKind === 'kickoff' ? 'KICKOFF' : m.callKind === 'pat' ? 'AFTER THE TD' : m.callKind === 'two' ? '2-POINT TRY' : FF.u.ord(m.down) + ' & ' + m.toGo + '  ' + m.spotText();
    E.font.text(g, dd, x0 + 24, 22, '#e8e4f0', { font: 'tiny', outline: false });
    E.font.title(g, String(Math.ceil(left)), x0 + w - 14, 10, { scale: 2, colors: left < 4 ? ['#ffe0e0', '#ff5a4a'] : ['#ffffff', '#ffd84a'], align: 'right', outline: '#000' });
    ui.bar(g, x0 + w - 74, 28, 50, 3, m.meter[this.side] / 100, '#c05aff', '#2a1a3a'); E.font.text(g, 'FIASCO', x0 + w - 104, 26, '#c8a0ff', { font: 'tiny', outline: false });
    if (this.done || hidden) {
      E.font.title(g, this.done ? 'READY' : 'CALLING...', x0 + w / 2, r.H / 2 - 20, { scale: 3, colors: ['#ffffff', '#a0ffb0', '#3ac85a'], align: 'center', outline: '#000' });
      if (this.done && this.card) E.font.text(g, 'CARD: ' + FF.data.cards[this.card].name, x0 + w / 2, r.H / 2 + 10, '#d8a0ff', { align: 'center', outline: false });
      return;
    }
    // tabs
    for (const tb of L.tabs) { const on = tb.k === this.tab; E.ui.box(g, tb.x, tb.y, tb.w, tb.h, { bg: on ? ['#ffb02e', '#c86a10'] : ['#2a2848', '#1a1830'], border: on ? '#fff0c0' : '#4a4868', alpha: .95 }); E.font.text(g, tb.t, tb.x + tb.w / 2, tb.y + 4, on ? '#1a0a00' : '#c8c4e0', { align: 'center', outline: false }); }
    if (L.tabs.length > 1) { glyph.chip(g, L.tabs[0].x - 1, L.tabs[0].y - 4, 'lb', { I: this.I, scale: 1 }); const lt = L.tabs[L.tabs.length - 1]; glyph.chip(g, lt.x + lt.w - 14, lt.y - 4, 'rb', { I: this.I }); }
    // the cards
    L.cards.forEach((c, k) => {
      const f = this.row === 'grid' && this.focus.i === k, pl = FF.data.plays[c.id], s = f ? 1.06 : 1, cx = c.x - (c.w * (s - 1)) / 2, cy = c.y - (c.h * (s - 1)) / 2, cw = c.w * s, chh = c.h * s;
      const typ = pl.type === 'run' ? ['#3a8a3a', 'RUN'] : pl.type === 'pass' ? (pl.tab === 'TRICK' ? ['#a050e0', 'TRICK'] : ['#3a6ad8', 'PASS']) : pl.side === 'def' ? ['#c83a3a', pl.tab === 'RETURN' ? 'RETURN' : 'DEF'] : ['#c8a020', 'KICK'];
      E.ui.box(g, Math.round(cx), Math.round(cy), Math.round(cw), Math.round(chh), { bg: f ? ['#3a2a5a', '#1c1430'] : ['#22223e', '#141428'], border: f ? E.mix('#ffb02e', '#fff4c0', (Math.sin(game.real * 6) + 1) / 2) : '#4a4868', alpha: .97 });
      this.drawDiagram(g, pl, Math.round(cx) + 3, Math.round(cy) + 13, Math.round(cw) - 6, Math.round(chh) - 16, t);
      E.font.text(g, pl.name, Math.round(cx) + 4, Math.round(cy) + 3, f ? '#fff4d8' : '#e8e4f0', { outline: '#000' });
      px.rect(g, Math.round(cx + cw) - 26, Math.round(cy) + 3, 22, 7, typ[0]); E.font.text(g, typ[1].slice(0, 5), Math.round(cx + cw) - 15, Math.round(cy) + 4, '#ffffff', { font: 'tiny', align: 'center', outline: false });
      if (c.id === this.suggest) { E.font.text(g, '★', Math.round(cx + cw) - 10, Math.round(cy + chh) - 11, '#ffd84a', { outline: '#000' }); if (f) E.font.text(g, 'COACH SAYS', Math.round(cx + cw) - 14, Math.round(cy + chh) - 9, '#ffd84a', { font: 'tiny', align: 'right', outline: '#000' }); }
      if (f && this.flip) E.font.text(g, 'FLIP', Math.round(cx) + 4, Math.round(cy + chh) - 9, '#3af0f0', { font: 'tiny', outline: '#000' });
    });
    // the Fiasco Card row
    const held = m.cards[this.side];
    L.slots.forEach(sl => {
      const id = held[sl.k], f = this.row === 'cards' && this.ci === sl.k, armed = id && this.card === id, fits = id && (this.role === 'def' ? FF.cardFits(id, 'def') : FF.cardFits(id, 'off') || FF.cardFits(id, 'kick'));
      E.ui.box(g, sl.x, sl.y, sl.w, sl.h, { bg: id ? (armed ? ['#ffd84a', '#c89a1a'] : ['#5a1a8a', '#2a0a4a']) : ['#1a1828', '#121020'], border: f ? '#ffffff' : id ? '#e8c040' : '#3a3850', alpha: .95 });
      if (id) { FF.cardArt(g, id, sl.x + 4, sl.y + 4, 16); E.font.text(g, FF.data.cards[id].name.split(' ')[0], sl.x + 23, sl.y + 6, armed ? '#1a0a00' : fits ? '#ffe8a0' : '#6a6080', { font: 'tiny', outline: false }); E.font.text(g, FF.data.cards[id].name.split(' ').slice(1).join(' '), sl.x + 23, sl.y + 14, armed ? '#1a0a00' : fits ? '#ffe8a0' : '#6a6080', { font: 'tiny', outline: false }); if (armed) E.font.text(g, 'ARMED', sl.x + 23, sl.y + 22, '#1a0a00', { font: 'tiny', outline: false }); }
      else E.font.text(g, '—', sl.x + sl.w / 2, sl.y + 11, '#3a3850', { align: 'center', outline: false });
    });
    if (this.row === 'cards' && held[this.ci]) E.font.text(g, FF.data.cards[held[this.ci]].text, x0 + 8, L.slots[0].y + 34, '#e8d0ff', { outline: false });
    // FLIP
    E.ui.box(g, L.flip.x, L.flip.y, L.flip.w, L.flip.h, { bg: this.flip ? ['#3af0f0', '#1a8a8a'] : ['#24223c', '#141428'], border: '#5a5878', alpha: .95 });
    E.font.text(g, 'FLIP', L.flip.x + 34, L.flip.y + 5, this.flip ? '#0a2020' : '#e8e4f0', { outline: false }); glyph.chip(g, L.flip.x + 4, L.flip.y + 9, 'b3', { I: this.I });
    // the prompts
    const list = this.row === 'grid' ? [['b1', 'PICK'], ['b3', 'FLIP']].concat(held.length ? [['b4', 'CARDS']] : []) : [['b1', 'ARM'], ['b2', 'BACK']];
    ui.prompts(g, list, x0 + w / 2, r.H - 20, { I: this.I, align: 'center' });
    if (this.players[1] !== undefined && this.role === 'off') E.font.text(g, 'P' + (this.players[1] + 1) + ' RUNS ' + ['WR1', 'WR2', 'RB'][this.rcv % 3] + ' (□ CHANGE)', x0 + 8, r.H - 34, '#a0e8ff', { font: 'tiny', outline: false });
  }
  /** a play drawn on a strip of field: routes with arrows, blocks as T bars, zones as dithered circles, rushes as arrows */
  drawDiagram(g, pl, x, y, w, h, team) {
    px.rect(g, x, y, w, h, '#1e4a26');
    for (let k = 1; k < 5; k++) px.rect(g, x + Math.round(k * w / 5), y, 1, h, '#2a5a32');
    const losX = x + Math.round(w * .38); px.rect(g, losX, y, 1, h, '#5a8aff');
    const sx = w / 34, sy = h / 34, fl = this.flip ? -1 : 1, P = (xy, f = fl) => [losX + xy[0] * sx, y + h / 2 + xy[1] * f * sy];
    const col = team.colors.primary === '#1a1a2a' ? team.colors.secondary : E.shade(team.colors.primary, .25);
    if (pl.side === 'off' && pl.formation) {
      const fo = FF.data.formations[pl.formation] || {}, A = pl.assign || {};
      for (const sl in fo) { const p = P(fo[sl]); px.rect(g, Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3, sl === 'QB' || sl === 'K' ? '#ffffff' : col); }
      for (const sl in A) {
        const a = A[sl], from = fo[sl]; if (!from) continue; let p0 = P(from);
        const path = a.route || a.carry || a.pull || a.fake;
        if (path) { for (const q of path) { const p1 = P(q); px.line(g, p0[0], p0[1], p1[0], p1[1], a.carry ? '#ffd84a' : '#ffffff'); p0 = p1; } const last = path[path.length - 1], prev = path.length > 1 ? P(path[path.length - 2]) : P(from), e = P(last), an = Math.atan2(e[1] - prev[1], e[0] - prev[0]); px.poly(g, [[e[0] + Math.cos(an) * 3, e[1] + Math.sin(an) * 3], [e[0] + Math.cos(an + 2.4) * 3, e[1] + Math.sin(an + 2.4) * 3], [e[0] + Math.cos(an - 2.4) * 3, e[1] + Math.sin(an - 2.4) * 3]], a.carry ? '#ffd84a' : '#ffffff'); }
        else if (a.block) { const p1 = [p0[0] + 4, p0[1]]; px.line(g, p0[0], p0[1], p1[0], p1[1], '#c8c4d0'); px.line(g, p1[0], p1[1] - 2, p1[0], p1[1] + 2, '#c8c4d0'); }
      }
      if (pl.qb && pl.qb.keep) { let p0 = P(fo.QB); for (const q of pl.qb.keep) { const p1 = P(q); px.line(g, p0[0], p0[1], p1[0], p1[1], '#ffd84a'); p0 = p1; } }
      if (pl.type === 'punt' || pl.type === 'fg') { const p = P([pl.type === 'punt' ? -12 : -9.5, 0]); px.line(g, p[0], p[1], x + w - 3, y + h / 2 + (pl.type === 'punt' ? 0 : 0), '#ffd84a'); }
    } else if (pl.side === 'def' && pl.formation) {
      const fo = FF.data.formations[pl.formation] || {}, A = pl.assign || {};
      for (const sl in fo) { const sp = fo[sl], yy = typeof sp[1] === 'string' ? (sp[1] === 'WR1' ? -13 : 12) : sp[1], p = P([sp[0], yy]), a = A[sl] || {};
        if (a.zone) { const z = P(a.zone.at); px.polyDither(g, Array.from({ length: 10 }, (_, i) => [z[0] + Math.cos(i / 10 * Math.PI * 2) * a.zone.r * sx, z[1] + Math.sin(i / 10 * Math.PI * 2) * a.zone.r * sy]), '#5a8aff', .35, 0, 0); px.line(g, p[0], p[1], z[0], z[1], '#a0c0ff'); }
        if (a.rush) { const t = P([-3, 0]); px.line(g, p[0], p[1], (p[0] + t[0]) / 2, (p[1] + t[1]) / 2, '#ff6a5a'); }
        if (a.man) { const o = FF.data.formations.pro[a.man]; if (o) { const t = P(o); px.line(g, p[0], p[1], t[0], t[1], '#ffb0a0'); } }
        if (a.spy) { px.rect(g, Math.round(p[0]) - 2, Math.round(p[1]) - 2, 5, 5, '#ffd84a'); }
        px.line(g, p[0] - 1, p[1] - 1, p[0] + 1, p[1] + 1, '#ff6a5a'); px.line(g, p[0] - 1, p[1] + 1, p[0] + 1, p[1] - 1, '#ff6a5a'); }
    } else {
      // kickoffs, returns, PATs: a big arrow
      const text = { kickoff: 'DEEP', return: 'RETURN', two: 'GO FOR 2' }[pl.type] || pl.name; void text;
      const a = pl.kick === 'onside' ? 10 : pl.kick === 'squib' ? 20 : 30, lane = pl.lane || 0;
      if (pl.type === 'return' || pl.type === 'puntreturn') { const p0 = [x + w - 8, y + h / 2], p1 = [x + 10, y + h / 2 + lane * h * .3]; px.line(g, p0[0], p0[1], p1[0], p1[1], '#ffd84a', 2); px.poly(g, [[p1[0] - 4, p1[1]], [p1[0] + 2, p1[1] - 3], [p1[0] + 2, p1[1] + 3]], '#ffd84a'); }
      else { const p0 = [x + 8, y + h / 2]; for (let k = 0; k <= 8; k++) { const t = k / 8, xx = p0[0] + t * (w - 16) * a / 30, yy = p0[1] - Math.sin(t * Math.PI) * h * .4 * (pl.kick === 'squib' ? .2 : 1); px.rect(g, Math.round(xx), Math.round(yy), 2, 2, '#ffd84a'); } }
    }
  }
}
FF.PlayCall = PlayCall;
/** the Fiasco Cards' art, drawn by code */
FF.cardArt = (g, id, x, y, s) => {
  const c = (dx, dy, w, h, col) => px.rect(g, Math.round(x + dx * s / 16), Math.round(y + dy * s / 16), Math.max(1, Math.round(w * s / 16)), Math.max(1, Math.round(h * s / 16)), col);
  px.rect(g, x, y, s, s, '#2a0a4a');
  if (id === 'ROCKET_CLEATS') { c(3, 8, 10, 4, '#e8e4dc'); c(2, 11, 12, 2, '#18161e'); c(1, 12, 3, 3, '#ff7a2a'); c(0, 13, 2, 2, '#ffd84a'); }
  else if (id === 'GLUE_GLOVES') { c(4, 4, 8, 9, '#f0c040'); c(4, 2, 2, 3, '#f0c040'); c(7, 1, 2, 4, '#f0c040'); c(10, 2, 2, 3, '#f0c040'); c(5, 13, 6, 2, '#e8e4dc'); }
  else if (id === 'BRICK_WALL') { for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) c((r % 2) * 2 + k * 5, 2 + r * 3.5, 4, 3, '#c85a3a'); }
  else if (id === 'HOT_SAUCE') { c(6, 1, 4, 3, '#e8e4dc'); c(5, 4, 6, 10, '#c8201a'); c(6, 7, 4, 3, '#ffd84a'); c(7, 11, 2, 2, '#ff7a2a'); }
  else if (id === 'MEGA_HIT') { c(4, 4, 8, 8, '#f0c8a8'); c(4, 3, 8, 2, '#e0b090'); c(2, 8, 3, 3, '#ffd84a'); c(12, 2, 3, 3, '#ffd84a'); }
  else if (id === 'BUTTERFINGERS') { c(2, 8, 12, 5, '#ffe890'); c(3, 7, 10, 2, '#fff4c0'); c(2, 13, 12, 1, '#c8a040'); }
  else if (id === 'MASCOT_MAYHEM') { c(3, 3, 10, 10, '#a87a4a'); c(5, 6, 2, 2, '#ffffff'); c(9, 6, 2, 2, '#ffffff'); c(6, 10, 4, 1, '#3a2010'); }
  else if (id === 'SUPER_FOOT') { c(5, 2, 4, 8, '#18161e'); c(5, 9, 9, 4, '#18161e'); c(5, 13, 10, 1, '#ffd84a'); c(1, 6, 3, 1, '#ffffff'); c(0, 9, 4, 1, '#ffffff'); }
};
})();
