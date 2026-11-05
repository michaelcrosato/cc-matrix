/* THE MATCH SCENE: it ties the sim, human control, the AI, the camera, the rigs, the crowd, FX, commentary, replays, the
 * HUD, the play-call screen, the kick meter, halftime and the results together. Modes: exhibition, story, practice,
 * attract and hub. Also the PLAY-CALL screen (big cards in tabs, a 3 x 2 grid, FLIP, COACH SAYS, the Fiasco Card row,
 * the timer; split halves when both sides have humans). */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, S = FF.sim, Y = 16, F = FF.FIELD, bus = FF.bus, GL = FF.glyph, UI = FF.ui;
const hyp = Math.hypot;

/* ---------------- THE PLAY-CALL SCREEN ---------------- */
const TABS = { off: ['RUN', 'PASS', 'TRICK', 'SPECIAL'], def: ['BASE', 'PRESSURE', 'SPECIAL'] };
const PC = FF.PlayCall = {
  st: {},
  /** the choices for team t now: [{ tab, cards: [play] }] */
  options(t) {
    const off = t === S.poss;
    if (S.mode === 'kickoff') return off ? [{ tab: 'KICKOFF', cards: FF.data.kickoffs }] : [{ tab: 'RETURN', cards: FF.data.returns }];
    if (S.mode === 'pat' && off) { const st = PC.st[t]; if (st && st.two) return TABS.off.slice(0, 3).map(tab => ({ tab, cards: FF.data.plays.filter(p => p.tab === tab).slice(0, 6) })); return [{ tab: 'CONVERSION', cards: FF.data.pats }]; }
    if (off) return TABS.off.map(tab => ({ tab, cards: FF.data.plays.filter(p => p.tab === tab).slice(0, 6) }));
    return TABS.def.map(tab => ({ tab, cards: FF.data.dplays.filter(p => p.tab === tab && (!p.kickOnly || p.id === 'fg_block' || p.id === 'punt_block' || p.id === 'punt_return')).slice(0, 6) }));
  },
  begin() {
    for (const t of [0, 1]) {
      const coach = FF.coach.call(t);
      PC.st[t] = { tab: 0, i: 0, flip: false, row: false, ci: 0, armed: null, done: false, coach: coach.play && coach.play.id, coachCall: coach, two: false };
      const opts = PC.options(t); opts.forEach((o, k) => { const j = o.cards.findIndex(c => c.id === PC.st[t].coach); if (j >= 0) { PC.st[t].tab = k; PC.st[t].i = j; } });
    }
  },
  /** each step while the sim is in PLAYCALL: each human side's panel */
  update() {
    if (!PC.st[0]) PC.begin();
    for (const t of [0, 1]) {
      const hs = FF.control.byTeam(t).filter(h => !h.remote); if (!hs.length || S.calls[t]) continue;
      const st = PC.st[t], I = hs[0].input, opts = PC.options(t);
      if (st.tab >= opts.length) st.tab = 0;
      const cards = opts[st.tab].cards;
      if (hs[1]) { const I2 = hs[1].input; if (I2.pressed('b3')) { const order = ['WR1', 'WR2', 'RB']; hs[1].recv = order[(order.indexOf(hs[1].recv || 'WR1') + 1) % 3]; FF.sfx('menuMove'); } }
      if (st.row) {   // the Fiasco Card row
        const held = S.cards[t] || [];
        if (I.pressed('left')) st.ci = Math.max(0, st.ci - 1); if (I.pressed('right')) st.ci = Math.min(Math.max(0, held.length - 1), st.ci + 1);
        if (I.pressed('b1') || I.pressed('confirm')) { const id = held[st.ci]; if (id && PC.fits(t, id)) { st.armed = st.armed === id ? null : id; FF.sfx('cardFlip'); st.row = false; } else FF.sfx('menuBack'); }
        if (I.pressed('b2') || I.pressed('cancel') || I.pressed('b4')) st.row = false;
        continue;
      }
      if (I.pressed('lb') || I.pressed('rb')) { st.tab = (st.tab + (I.pressed('lb') ? -1 : 1) + opts.length) % opts.length; st.i = Math.min(st.i, opts[st.tab].cards.length - 1); FF.sfx('menuMove'); }
      const cols = 3, n = cards.length;
      if (I.repeat('left', .3, .1)) { if (st.i % cols === 0) { st.tab = (st.tab - 1 + opts.length) % opts.length; st.i = Math.min(st.i + cols - 1, opts[st.tab].cards.length - 1); } else st.i--; FF.sfx('menuMove'); }
      if (I.repeat('right', .3, .1)) { if (st.i % cols === cols - 1 || st.i === n - 1) { st.tab = (st.tab + 1) % opts.length; st.i = 0; } else st.i++; FF.sfx('menuMove'); }
      if (I.repeat('up', .3, .1) && st.i >= cols) { st.i -= cols; FF.sfx('menuMove'); }
      if (I.repeat('down', .3, .1) && st.i + cols < n) { st.i += cols; FF.sfx('menuMove'); }
      if (I.pressed('b3')) { st.flip = !st.flip; FF.sfx('menuMove'); }
      if (I.pressed('b4') && (S.cards[t] || []).length) { st.row = true; st.ci = 0; FF.sfx('cardFlip'); }
      // the mouse: hover focuses a card, a click picks; clicks on tabs, FLIP and the card slots
      const ptr = I.pointer && I.pointer(), lay = PC.layout(t);
      if (ptr && I.lastDevice === 'mouse' && lay) { const j = lay.cards.findIndex(r => inside(ptr, r)); if (j >= 0 && j < n) st.i = j; }
      const clk = I.clicked && I.clicked();
      if (clk && lay) {
        const tb = lay.tabs.findIndex(r => inside(clk, r)); if (tb >= 0 && tb < opts.length) { st.tab = tb; st.i = 0; FF.sfx('menuMove'); continue; }
        if (inside(clk, lay.flip)) { st.flip = !st.flip; continue; }
        const cs = lay.slots.findIndex(r => inside(clk, r)); if (cs >= 0) { const id = (S.cards[t] || [])[cs]; if (id && PC.fits(t, id)) { st.armed = st.armed === id ? null : id; FF.sfx('cardFlip'); } continue; }
        const j = lay.cards.findIndex(r => inside(clk, r)); if (j >= 0 && j < n) { st.i = j; PC.pick(t, cards[j], hs); continue; }
      }
      if (I.pressed('b1') || I.pressed('confirm')) PC.pick(t, cards[st.i], hs);
    }
  },
  fits(t, id) { const c = FF.card(id), off = t === S.poss; if (!c) return false; if (c.side === 'any') return true; if (c.side === 'kick') return S.mode === 'kickoff' || S.mode === 'pat' || true; return (c.side === 'off') === off; },
  pick(t, play, hs) {
    const st = PC.st[t]; FF.sfx('menuSelect');
    if (play.pat === 'two' && !st.two) { st.two = true; st.tab = 1; st.i = 0; return; }
    const call = { play: st.two ? FF.data.pats[1] : play, flip: st.flip, card: st.armed, human: true };
    if (st.two) call.two = play;
    S.calls[t] = call; st.done = true;
    if (FF.net && FF.net.sendCall) FF.net.sendCall(t, call);
    void hs;
  },
  /** where things are on screen for team t's panel (mouse hits and drawing) */
  layout(t) {
    const W = game.W, H = game.H, both = FF.control.byTeam(0).length && FF.control.byTeam(1).length;
    const pw = both ? Math.floor(W / 2) - 6 : Math.min(W - 16, 420), x0 = both ? (t === 0 ? 4 : W / 2 + 2) : Math.round((W - pw) / 2), y0 = 18;
    const cw = Math.floor((pw - 16) / 3), ch = Math.min(64, Math.floor((H - 120) / 2));
    const tabs = [0, 1, 2, 3].map(k => ({ x: x0 + 6 + k * Math.floor((pw - 12) / 4), y: y0 + 22, w: Math.floor((pw - 12) / 4) - 3, h: 14 }));
    const cards = [0, 1, 2, 3, 4, 5].map(k => ({ x: x0 + 6 + (k % 3) * (cw + 2), y: y0 + 40 + Math.floor(k / 3) * (ch + 4), w: cw, h: ch }));
    const flip = { x: x0 + pw - 50, y: y0 + 4, w: 44, h: 14 };
    const slots = [0, 1, 2].map(k => ({ x: x0 + 6 + k * 34, y: y0 + 46 + ch * 2 + 6, w: 30, h: 22 }));
    return { x0, y0, pw, cards, tabs, flip, slots };
  },
  draw(g) {
    const W = game.W, H = game.H;
    px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05050c'));
    for (const t of [0, 1]) {
      const hs = FF.control.byTeam(t).filter(h => !h.remote); if (!hs.length) continue;
      const st = PC.st[t]; if (!st) continue;
      const L = PC.layout(t), opts = PC.options(t), team = S.teams[t], off = t === S.poss, I = hs[0].input;
      UI.panel(g, L.x0, L.y0, L.pw, H - L.y0 - 30, { border: team.colors.primary, alpha: .92 });
      FF.hud.logo(g, team, L.x0 + 6, L.y0 + 4, 1);
      const hdr = S.mode === 'kickoff' ? (off ? 'KICKOFF' : 'RECEIVING') : S.mode === 'pat' ? (off ? 'CONVERSION' : 'DEFENSE') : off ? 'OFFENSE' : 'DEFENSE';
      E.font.text(g, team.short + ' ' + hdr, L.x0 + 22, L.y0 + 6, '#ffffff', { outline: false, shadow: '#000' });
      // the play clock
      const left = Math.max(0, FF.T.playcallTime - S.phaseTime);
      E.font.text(g, String(Math.ceil(left)), L.x0 + L.pw / 2 + 40, L.y0 + 2, left < 4 ? '#ff5a3a' : '#ffe040', { scale: 2, outline: '#000', align: 'center' });
      if (st.done) { E.font.title(g, 'READY', L.x0 + L.pw / 2, L.y0 + 80, { scale: 3, align: 'center', colors: ['#ffffff', '#c0ffb0', '#3ad04a'] }); E.font.text(g, 'WAITING FOR THE OTHER SIDE', L.x0 + L.pw / 2, L.y0 + 110, '#a9a6c0', { align: 'center', outline: false }); continue; }
      // flip toggle
      UI.button(g, L.flip, 'FLIP', false, { scale: 1, bg: st.flip ? ['#5a3a1a', '#3a240a'] : undefined });
      GL.chip(g, L.flip.x - 14, L.flip.y + 1, 'b3', { input: I });
      opts.forEach((o, k) => { const r = L.tabs[k]; const on = k === st.tab; E.ui.box(g, r.x, r.y, r.w, r.h, { bg: on ? [team.colors.primary, E.shade(team.colors.primary, -.4)] : ['#22223a', '#14142a'], border: on ? '#ffffff' : '#3a3a5a', alpha: 1 }); E.font.text(g, o.tab, r.x + r.w / 2, r.y + 3, on && FF.luminance(team.colors.primary) > .6 ? '#141418' : '#ffffff', { align: 'center', outline: false, font: o.tab.length > 7 ? 'tiny' : undefined }); });
      if (opts.length > 1) { GL.chip(g, L.tabs[0].x - 2, L.tabs[0].y - 13, 'lb', { input: I }); GL.chip(g, L.tabs[opts.length - 1].x + L.tabs[opts.length - 1].w - 18, L.tabs[0].y - 13, 'rb', { input: I }); }
      const cards = opts[st.tab].cards;
      cards.forEach((p, k) => drawCard(g, L.cards[k], p, k === st.i && !st.row, team, st, t));
      // the fiasco card slots
      const held = S.cards[t] || [];
      E.font.text(g, 'FIASCO CARDS', L.slots[0].x, L.slots[0].y - 8, '#c08aff', { font: 'tiny', outline: false });
      L.slots.forEach((r, k) => { const id = held[k]; drawFiascoCard(g, r, id, st.row && st.ci === k, st.armed === id && id, id && PC.fits(t, id)); });
      if (held.length) GL.row(g, L.slots[2].x + 38, L.slots[0].y + 6, [['b4', st.row ? 'BACK' : 'CARDS']], { input: I });
      if (st.armed) E.font.text(g, 'ARMED: ' + FF.card(st.armed).name, L.x0 + L.pw - 8, L.slots[0].y + 2, '#ffe060', { align: 'right', outline: false });
      if (st.row && held[st.ci]) E.font.text(g, FF.card(held[st.ci]).text, L.x0 + L.pw - 8, L.slots[0].y + 12, '#f4f0e6', { align: 'right', font: 'tiny', outline: false });
      if (hs[1] && off) E.font.text(g, 'P2 RUNS ' + (hs[1].recv || 'WR1') + ' (' + GL.label('b3', hs[1].input) + ' CHANGE)', L.x0 + 8, H - 48, E.PLAYER_COLORS[1], { font: 'tiny', outline: false });
      GL.row(g, L.x0 + L.pw - 8, H - 46, [['b1', 'PICK', { mouse: 'L' }], ['b3', 'FLIP'], ['lb', 'TABS']], { align: 'right', input: I, panel: true });
    }
    // the situation bar
    const t = S.poss, txt = S.mode === 'kickoff' ? S.teams[t].short + ' KICK OFF' : (S.mode === 'pat' ? 'CONVERSION' : ['1ST', '2ND', '3RD', '4TH'][S.down - 1] + ' & ' + S.toGo) + ' AT THE ' + yardText(S.los);
    E.font.text(g, txt, W / 2, 4, '#ffe040', { align: 'center', outline: '#000' });
  }
};
const inside = (p, r) => r && p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h;
function yardText(x) { const yd = Math.round((x - F.GOAL_L) / Y); if (yd === 50) return '50'; const t = yd < 50 ? (S.dir[0] > 0 ? 0 : 1) : (S.dir[0] > 0 ? 1 : 0); return S.teams[t].abbr + ' ' + Math.min(yd, 100 - yd); }
FF.yardText = yardText;
function drawCard(g, r, p, focus, team, st, t) {
  const pulse = focus ? Math.sin(game.real * 6) * .5 + .5 : 0, c = team.colors;
  const lift = focus ? 2 : 0;
  E.ui.box(g, r.x - lift, r.y - lift, r.w + lift * 2, r.h + lift * 2, { bg: focus ? [E.shade(c.primary, .1), E.shade(c.primary, -.45)] : [E.shade(c.primary, -.35), E.shade(c.primary, -.65)], border: focus ? E.mix('#ffb02e', '#ffffff', pulse) : '#5a5a7a', alpha: 1 });
  // the mini field with the play drawn on it
  const fx = r.x + 3, fy = r.y + 13, fw = r.w - 6, fh = r.h - 25;
  px.rect(g, fx, fy, fw, fh, '#2e6a2a'); for (let k = 1; k < 4; k++) px.rect(g, fx + Math.round(fw * k / 4), fy, 1, fh, '#4a8a3a');
  drawDiagram(g, p, fx, fy, fw, fh, st.flip, c);
  const nm = p.name, sc = E.font.width(nm) > r.w - 8 ? { font: 'tiny' } : {};
  E.font.text(g, nm, r.x + r.w / 2, r.y + 3, '#ffffff', Object.assign({ align: 'center', outline: false, shadow: '#000' }, sc));
  const badge = p.type ? p.type.toUpperCase() : p.tab;
  E.font.text(g, badge, r.x + 4, r.y + r.h - 10, '#ffe040', { font: 'tiny', outline: false });
  if (st.coach === p.id) { E.font.text(g, '★', r.x + r.w - 10, r.y + r.h - 11, '#ffe040', { outline: '#000' }); E.font.text(g, 'COACH SAYS', r.x + r.w - 14, r.y + r.h - 10, '#ffe040', { font: 'tiny', align: 'right', outline: false }); }
  void t;
}
function drawDiagram(g, p, x, y, w, h, flip, c) {
  const k = 1.6, ox = x + w * .32, oy = y + h / 2, fl = flip ? -1 : 1;
  const P = (q) => [ox + q[0] * k * 1.1, oy + q[1] * k * .55 * fl];
  if (p.side === 'off' && p.formation && FF.data.formations[p.formation]) {
    const fo = FF.data.formations[p.formation];
    px.line(g, ox + 1, y, ox + 1, y + h, '#a0c8ff');
    for (const [slot, sp] of Object.entries(fo)) {
      const a = p.assign[slot === 'K' ? 'K' : slot] || {}; const s0 = P(sp);
      const path = a.route || a.carry || a.pull; let prev = s0;
      if (path) { for (const q of path) { const n = P(q); px.line(g, prev[0], prev[1], n[0], n[1], a.carry ? '#ffe040' : '#ffffff'); prev = n; } px.disc(g, prev[0], prev[1], 1, a.carry ? '#ffe040' : '#ffffff'); }
      else if (a.block) { px.line(g, s0[0] + 2, s0[1], s0[0] + 4, s0[1], '#c0c0c0'); px.line(g, s0[0] + 4, s0[1] - 2, s0[0] + 4, s0[1] + 2, '#c0c0c0'); }
      px.disc(g, s0[0], s0[1], 1.5, slot === 'QB' ? '#ffe040' : c.trim);
    }
  } else if (p.side === 'def' && FF.data.formations[p.formation]) {
    const fd = FF.data.formations[p.formation];
    px.line(g, ox - 1, y, ox - 1, y + h, '#a0c8ff');
    for (const [slot, sp] of Object.entries(fd)) {
      const a = p.assign[slot] || {}, yy = typeof sp[1] === 'string' ? -10 : sp[1], s0 = [ox + sp[0] * k * 1.1, oy + yy * k * .55 * fl];
      if (a.zone) { const z = [ox + a.zone.at[0] * k * 1.1, oy + a.zone.at[1] * k * .55 * fl]; px.polyDither(g, ellPts(z[0], z[1], a.zone.r * k * .9, a.zone.r * k * .5), '#7ad0ff', .4, 0, 0); }
      if (a.rush) px.line(g, s0[0], s0[1], s0[0] - 8, s0[1] + (yy > 0 ? -2 : yy < 0 ? 2 : 0), '#ff6a5a');
      if (a.man) px.line(g, s0[0], s0[1], s0[0] - 4, s0[1], '#ffb030');
      if (a.spy) px.disc(g, s0[0] - 3, s0[1], 1, '#ff8af0');
      px.line(g, s0[0] - 1, s0[1] - 1, s0[0] + 1, s0[1] + 1, '#ffffff'); px.line(g, s0[0] - 1, s0[1] + 1, s0[0] + 1, s0[1] - 1, '#ffffff');
    }
  } else {
    // kicks, returns and conversions: an arc
    const big = p.kickoff === 'deep' || p.pat === 'kick' || p.id === 'punt' ? 1 : .5;
    let prev = [x + 6, y + h - 4]; for (let i = 1; i <= 10; i++) { const u = i / 10, n = [x + 6 + (w - 12) * u * big, y + h - 4 - Math.sin(u * Math.PI) * (h - 8) * (p.kickoff === 'squib' ? .2 : 1)]; px.line(g, prev[0], prev[1], n[0], n[1], '#ffe040'); prev = n; }
    if (p.lane !== undefined) px.line(g, x + w - 6, y + h / 2, x + 8, y + h / 2 + p.lane * 8, '#ffffff');
  }
}
const ellPts = (cx, cy, rx, ry) => { const o = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
function drawFiascoCard(g, r, id, focus, armed, fits) {
  const card = id && FF.card(id);
  E.ui.box(g, r.x, r.y, r.w, r.h, { bg: card ? (fits ? ['#5a2a8a', '#2a0a4a'] : ['#3a3a44', '#202028']) : ['#1a1a24', '#121218'], border: armed ? '#ffe060' : focus ? '#ffffff' : '#c8a040', alpha: 1 });
  if (card) { FF.cardArt(g, card.art, r.x + r.w / 2, r.y + r.h / 2 - 2); E.font.text(g, card.name.split(' ')[0], r.x + r.w / 2, r.y + r.h - 7, '#ffe890', { font: 'tiny', align: 'center', outline: false }); }
}
/** the art on a Fiasco Card, drawn by code */
FF.cardArt = (g, art, x, y) => {
  switch (art) {
    case 'cleats': px.poly(g, [[x - 6, y + 2], [x + 6, y + 2], [x + 6, y - 1], [x, y - 3], [x - 6, y - 1]], '#e04a3a'); for (let k = 0; k < 4; k++) px.rect(g, x - 5 + k * 3, y + 2, 1, 2, '#e0e0e0'); px.disc(g, x - 7, y, 2, '#ffb030'); break;
    case 'gloves': px.rect(g, x - 4, y - 4, 8, 7, '#7ad04a'); for (let k = 0; k < 4; k++) px.rect(g, x - 4 + k * 2, y - 7, 1, 3, '#7ad04a'); px.rect(g, x - 5, y + 2, 10, 2, '#ffe060'); break;
    case 'wall': for (let r2 = 0; r2 < 3; r2++) for (let k = 0; k < 3; k++) px.rect(g, x - 7 + k * 5 + (r2 % 2) * 2, y - 5 + r2 * 4, 4, 3, '#c0502a'); break;
    case 'sauce': px.rect(g, x - 2, y - 6, 4, 3, '#2a2a2a'); px.rect(g, x - 3, y - 3, 6, 8, '#e02a1a'); px.rect(g, x - 2, y - 1, 4, 2, '#ffe060'); break;
    case 'fist': px.disc(g, x, y, 5, '#f0c8a8'); for (let k = 0; k < 3; k++) px.line(g, x - 3 + k * 3, y - 4, x - 3 + k * 3, y - 1, '#a87050'); px.line(g, x + 6, y - 6, x + 9, y - 9, '#ffe060'); break;
    case 'butter': px.poly(g, [[x - 7, y + 3], [x + 5, y + 3], [x + 7, y - 1], [x - 5, y - 1]], '#ffe890'); px.poly(g, [[x - 7, y + 3], [x - 5, y - 1], [x - 5, y - 4], [x - 7, y]], '#e8c060'); break;
    case 'mascot': px.disc(g, x, y, 6, '#8a5a2a'); px.disc(g, x - 2, y - 1, 2, '#ffffff'); px.disc(g, x + 2, y - 1, 2, '#ffffff'); px.dot(g, x - 2, y - 1, '#000'); px.dot(g, x + 2, y, '#000'); break;
    case 'boot': px.rect(g, x - 2, y - 6, 4, 8, '#3a3a6a'); px.rect(g, x - 2, y + 1, 8, 3, '#3a3a6a'); px.glow(g, 1); px.disc(g, x + 6, y + 2, 2, '#ffe060'); px.glow(g, 0); break;
  }
};

/* ---------------- THE MATCH ---------------- */
const M = FF.match = {
  spec: null, mode: 'exhibition', results: null, halftimeShow: 0, playcallMusic: false,
  canRestart: () => M.mode === 'exhibition' || M.mode === 'practice',
  restart() { game.go('match', Object.assign({}, M.spec), { fade: 0 }); },
  /** set up a match from a spec: { home, away, stadium, humans: [{ input, team }], qLen, difficulty, mode, cheats, night, weather, cards, start, ... } */
  setup(spec) {
    M.spec = spec; M.mode = spec.mode || 'exhibition'; M.results = null; M.resultsMenu = null; M.halftimeShow = 0; M.onEnd = spec.onEnd || null; M.lastPhase = null; M.twoMin = {};
    FF.noSave = M.mode === 'attract' || M.mode === 'hub' || !!spec.noSave;
    FF.Rigs.clear(); FF.fx.clear();
    const home = FF.team(spec.home), away = FF.team(spec.away);
    FF.Stadium.build(spec.stadium || home.stadium, home, away, { night: spec.night, density: spec.density });
    game.cam.bounds = v => FF.Stadium.map.bounds(v);
    S.newMatch(Object.assign({ seed: spec.seed || (Math.floor(FF.rf() * 1e6) + 1) }, spec));
    S.hubHalf = !!spec.hubHalf; S.noOT = !!spec.noOT; S.cpuCallDelay = spec.cpuCallDelay || .9;
    FF.control.setup(spec.humans || []);
    FF.cast.build(); FF.cam.view = null; FF.cam.reset(); FF.cam.x = S.los || 1024;
    FF.Stadium.applyLights(game, { weather: spec.weather });
    FF.Stadium.E = .3;
    if (spec.lightsAt) S.lightsAt = spec.lightsAt;
    PC.st = {};
    M.music();
    FF.crowdAudio.start(FF.Stadium.cur.stands.density);
    if (spec.after) spec.after();
  },
  music() { if (M.mode === 'attract') FF.music.play('ATTRACT'); else FF.music.play(FF.Stadium.cur.music); },
  update(dt) {
    if (M.results) return M.updateResults(dt);
    if (FF.replay.play) { FF.replay.update(dt); presentation(dt, true); return; }
    // an instant replay before the next phase
    if ((S.phase === 'DEAD' || S.phase === 'CELEBRATE') && S.phaseT <= dt * 1.5 && FF.replay.wanted() && !FF.fast && M.mode !== 'hub') { FF.replay.begin(FF.replay.last); return; }
    if (S.phase === 'PLAYCALL') { if (M.lastPhase !== 'PLAYCALL') { PC.begin(); if (FF.control.humans.some(h => !h.cpu && !h.remote) && M.mode !== 'attract') FF.music.play('HUDDLE'); } PC.update(); }
    else if (M.lastPhase === 'PLAYCALL' && M.mode !== 'attract') M.music();
    M.lastPhase = S.phase;
    FF.control.update();
    if (S.phase === 'HALFTIME' && M.mode === 'exhibition') { if (!M.halftimeShow) { M.halftimeShow = 6; FF.music.play('HALFTIME'); } M.halftimeShow -= dt; if (M.halftimeShow < 5.5 && (game.input.pressed('b1') || game.input.pressed('confirm'))) S.phaseT = 0; }
    if (S.phase === 'HALFTIME' && S.phaseT <= dt && M.mode === 'exhibition') { M.halftimeShow = 0; game.after(.1, () => M.music()); }
    // the two-minute warning and the hurry-up tempo
    if ((S.quarter === 2 || S.quarter === 4) && S.qLen >= 120 && S.clock <= 120 && !M.twoMin[S.quarter] && S.phase === 'LIVE') { M.twoMin[S.quarter] = true; bus.emit('twoMinute', {}); }
    if (S.lightsAt && S.quarter === S.lightsAt.quarter && S.playNo >= S.lightsAt.play && !S.lightsDone) { S.lightsDone = true; FF.ots.lightsOut(true, S.lightsAt.plays || 3); if (M.onLights) M.onLights(); }
    S.update(dt);
    if (S.phase === 'FINAL' && !M.results && S.phaseTime > 2.2) M.showResults();
    FF.replay.record();
    presentation(dt, false);
    if (S.lights !== M.lightsShown) { M.lightsShown = S.lights; FF.Stadium.applyLights(game, { lightsOut: S.lights, weather: game.weather }); }
  },
  showResults() {
    M.results = FF.results.compute();
    if (M.mode === 'exhibition' || M.mode === 'story') FF.records.update(M.results);
    FF.music.sting(S.winner >= 0 && FF.control.humanOn(S.winner) ? 'STING_WIN' : 'STING_LOSE');
    if (M.onEnd) { const f = M.onEnd; M.onEnd = null; if (f(M.results) === 'handled') { M.results = null; return; } }
    M.resultsMenu = new UI.Menu({ items: () => FF.results.actions(M), layout: (W, H, it) => it.map((x, i) => ({ x: W / 2 - 160 + i * (320 / it.length) + 2, y: H - 46, w: 320 / it.length - 4, h: 24 })), grid: true, onPick: it => it.fn() });
  },
  updateResults(dt) {
    if (FF.replay.play) { FF.replay.update(dt); presentation(dt, true); return; }
    S.update(dt); presentation(dt, false);
    if (M.resultsMenu) M.resultsMenu.update();
  },
  watchHighlights() {
    const list = FF.replay.highlights.slice(); if (!list.length) return;
    const next = () => { const c = list.shift(); if (c) FF.replay.begin(c, { reel: true, caption: c.why, onDone: next }); };
    next();
  },
  draw(r) {
    const replay = !!FF.replay.play;
    FF.Stadium.draw(r, { lines: !replay && (S.phase === 'PLAYCALL' || S.phase === 'PRESNAP' || S.phase === 'LIVE') });
    FF.fx.draw(r);
    if (replay) FF.replay.drawActors(r);
    else drawAthletes(r);
    FF.cast.draw(r);
    if (!replay) FF.hud.world(r);
    r.overlay(g => {
      if (replay) { FF.replay.overlay(g); return; }
      if (S.phase === 'PLAYCALL' && FF.control.humans.some(h => !h.cpu && !h.remote) && M.mode !== 'attract') PC.draw(g);
      else FF.hud.draw(g);
      if (S.phase === 'HALFTIME' && M.halftimeShow > 0) FF.results.halftime(g);
      if (S.phase === 'COIN') coin(g);
      if (M.results) FF.results.draw(g, M);
      if (M.overlay) M.overlay(g);
    });
  }
};
function presentation(dt, replay) {
  if (FF.fast) return;
  if (!replay) for (const a of S.all) if (a.on || S.phase !== 'IDLE') FF.Rigs.drive(a, dt, { carry: S.ball.holder === a, fire: a.hot > 0 && S.ball.holder === a });
  if (!replay) FF.cam.update(dt, M.camOpt || {});
  FF.cast.update(dt); FF.Stadium.update(dt); FF.fx.update(dt); FF.talk.update(dt);
  FF.crowdAudio.update(FF.Stadium.E);
  // the music's layers: the red zone, and hurry-up in the last minute of a half
  if (!replay && S.teams[0]) {
    const rz = S.mode === 'normal' && S.yardline(S.los, S.poss) >= 80; if (rz !== M.rz) { M.rz = rz; FF.music.layer('redzone', rz ? 1 : 0); }
    const hurry = (S.quarter === 2 || S.quarter >= 4) && S.clock < 60 && S.clock > 0; if (hurry !== M.hurry) { M.hurry = hurry; const song = FF.SONGS[FF.Stadium.cur.music]; if (song && game.audio.song) game.audio.tempo(song.bpm * (hurry ? 1.08 : 1)); }
  }
}
function drawAthletes(r) {
  const view = E.charView(r.view), C = FF.control;
  for (const a of S.all) {
    if (!a.on && S.phase === 'IDLE') continue;
    const rig = FF.Rigs.of(a), b = a.b;
    if (!r.visible(b.x, b.y, b.z + 20) && !r.visible(b.x, b.y, b.z)) { delete C.screen[a.id]; continue; }
    r.shadow(b.x, b.y, a.b.r, .35);
    r.actor(b.x, b.y, b.z, (g, ox, oy) => { rig.draw(g, ox, oy, view); if (a.on) C.screen[a.id] = [ox, oy, 30 * (a.p.boss || 1.3)]; }, { pick: a.id, emissive: false, flash: a.hot > 0 && Math.floor(game.time * 10) % 2 ? '#ff8a2a' : undefined, flashMix: .25, ghost: a.afterburn > 0 ? { color: '#3af0f0', life: .25, alpha: .5, owner: a.b } : undefined });
    if (S.lights && a.on) r.queue(b.x, b.y, b.z + 16, g => { const p = r.w(b.x, b.y, b.z + 16); px.glow(g, 1); px.rect(g, Math.round(p[0]) - 3, Math.round(p[1]), 6, 1, a.team === 0 && S.teams[0].id === 'fiascos' ? '#7aff6a' : S.teams[a.team].colors.glow); px.rect(g, Math.round(p[0]) - 2, Math.round(p[1]) - 10, 4, 1, S.teams[a.team].colors.glow); px.glow(g, 0); }, { emissive: true });
    if (a.hot > 0 && S.lights !== undefined) game.lights.add(b.x, b.y, 20, 60, .6, { color: '#ff8a2a' });
  }
  const B = S.ball;
  if (B.state !== 'held') drawFlyingBall(r, B);
  if (S.lights) { const bx = B.x, by = B.y, bz = B.z; r.queue(bx, by, bz + 4, g => { const p = r.w(bx, by, bz + 4); px.glow(g, 1); px.disc(g, p[0], p[1], 2, '#ffe890'); px.glow(g, 0); }, { emissive: true }); }
}
function drawFlyingBall(r, B) { FF.drawFlyingBall(r, B.x, B.y, B.z, B.vx, B.vy, B.state); }
function coin(g) {
  const W = game.W, H = game.H, t = 1.6 - S.phaseT, y = H * .35 - Math.sin(Math.min(1, t / 1.2) * Math.PI) * 40;
  const w = Math.abs(Math.cos(t * 14)) * 12 + 1;
  px.ell(g, W / 2, y, w, 12, '#c8a030'); px.ell(g, W / 2, y, Math.max(1, w - 2), 10, '#ffd84a');
  E.font.text(g, 'COIN TOSS', W / 2, H * .18, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
  if (t > 1.2) E.font.text(g, S.teams[1 - S.halfKick].short + ' WIN THE TOSS AND RECEIVE', W / 2, H * .5, '#ffe040', { align: 'center', outline: '#000' });
}
})();
