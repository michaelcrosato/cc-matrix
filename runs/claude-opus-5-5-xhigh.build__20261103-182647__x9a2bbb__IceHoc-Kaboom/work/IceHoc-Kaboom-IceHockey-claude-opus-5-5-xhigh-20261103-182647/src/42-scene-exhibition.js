/* ---- EXHIBITION (12.2, 12.3): SIDES (every joined player a token; push left for HOME, right for AWAY, ✕ ready; Start on
 * a free pad or 2 on the keyboard joins) and SETUP (three big cards, HOME / ARENA / AWAY, then option chips; FACE OFF!) ---- */
const Setup = (() => {
  const st = { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: null, diff: null, cheat: 'off', sides: [] };
  const teams = () => TEAM_ORDER.filter(id => !TEAMS[id].locked || Save.data.finished);
  /** a match config for deep links, the dev panel and quick tests */
  function quickCfg(d = {}) {
    const home = TEAMS[d.home] ? d.home : 'muskrats', away = TEAMS[d.away] && d.away !== home ? d.away : home === 'drillers' ? 'muskrats' : 'drillers', arena = ARENAS[d.arena] ? d.arena : 'icebox';
    const cfg = { mode: 'exhibition', home, away, arena, humans: [{ team: 0, input: game.input, name: 'P1' }], intros: false, flood: 'never' };
    if (d.warp) cfg.onStart = m => { game.after(.3, () => Dev.warp(d.warp)); };
    if (d.dev) cfg.onStart = m => { game.after(.3, () => Dev.open()); };
    return cfg;
  }
  /** the configured exhibition */
  function cfg() {
    const humans = [];
    st.sides.forEach((p, i) => { if (p.side >= 0) humans.push({ team: p.side, input: p.input, name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], tag: 'P' + (i + 1) }); });
    const cheats = {}; if (st.cheat === 'all') for (const c of Save.cheatsOpen()) cheats[c[0]] = true; else if (st.cheat !== 'off') cheats[st.cheat] = true;
    return { mode: 'exhibition', home: st.home, away: st.away, arena: st.arena, periods: st.periods, periodLen: st.len || +S('periodLen') || 120, difficulty: st.diff || S('difficulty'), humans, cheats, seed: (Date.now() % 1e9) | 0 };
  }
  return { st, quickCfg, cfg, teams };
})();

scenes.sides = {
  enter() {
    game.allowJoin({ max: 4, onJoin: (input, n) => { Synth.sfx('menuSel'); syncSides(); } });
    syncSides(); Setup.st.sides.forEach((p, i) => { p.ready = false; }); Synth.music('menu'); UI.Idle.reset();
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    syncSides();
    const S2 = Setup.st.sides;
    for (const p of S2) {
      const I = p.input;
      if (I.repeat('left', .3, .2) && !p.ready) { p.side = p.side === 1 ? -1 : 0; Synth.sfx('menuMove'); }
      if (I.repeat('right', .3, .2) && !p.ready) { p.side = p.side === 0 ? -1 : 1; Synth.sfx('menuMove'); }
      if (I.pressed('confirm')) { p.ready = !p.ready; Synth.sfx(p.ready ? 'menuSel' : 'menuBack'); }
      if (I.pressed('cancel')) { if (p.ready) p.ready = false; else if (p === S2[0]) { Synth.sfx('menuBack'); game.go('title', { menu: true }); return; } }
    }
    // the mouse moves the keyboard player's token (a click on HOME or AWAY)
    const ck = game.input.clicked(); if (ck && this.boxes) { const k = this.boxes.findIndex(b => ck[0] >= b[0] && ck[0] < b[0] + b[2] && ck[1] >= b[1] && ck[1] < b[1] + b[3]); if (k >= 0) { S2[0].side = [0, -1, 1][k]; Synth.sfx('menuMove'); } if (this.goBox && ck[0] >= this.goBox[0] && ck[0] < this.goBox[0] + this.goBox[2] && ck[1] >= this.goBox[1] && ck[1] < this.goBox[1] + this.goBox[3]) S2.forEach(p => { p.ready = true; }); }
    if (S2.length && S2.every(p => p.ready)) { game.players.forEach(I => I.consumeAll()); game.go('setup', null, { fade: 'wipe' }); }
  },
  draw(r) {
    r.sky(['#0a1430', '#122248', '#1a3060']);
    r.overlay(g => {
      UI.title(g, 'CHOOSE SIDES', r.W / 2, 14, 3);
      const S2 = Setup.st.sides, cw = Math.min(130, (r.W - 40) / 3), x0 = r.W / 2 - cw * 1.5, y0 = 48, h = Math.min(r.H - 130, 118);
      this.boxes = [];
      ['HOME', 'CPU', 'AWAY'].forEach((lab, k) => { const x = x0 + k * cw + 4; UI.panel(g, x, y0, cw - 8, h, { border: k === 1 ? '#3a4a6a' : k === 0 ? '#e8b43a' : '#7ab8ff' }); E.font.text(g, lab, x + (cw - 8) / 2, y0 + 6, k === 1 ? UI.MUTED : UI.GOLD, { align: 'center', scale: 2, outline: '#000' }); this.boxes.push([x, y0, cw - 8, h]); });
      S2.forEach((p, i) => { const col = [1, 0, 2][p.side + 1], x = x0 + col * cw + cw / 2, y = y0 + 34 + i * 22; const c = E.PLAYER_COLORS[i];
        UI.panel(g, x - 40, y, 80, 18, { border: c, focus: p.ready, bg: p.ready ? ['#1c3a20', '#0a1a0c'] : undefined }); E.font.text(g, 'P' + (i + 1) + (p.ready ? ' ✓' : ''), x - 30, y + 6, c, { outline: '#000' }); E.font.text(g, p.input.half ? (p.input.half === 'left' ? 'WASD' : 'ARROWS') : p.input.pad !== undefined && p.input.pad !== null && p.input !== game.input ? 'PAD ' + (p.input.pad + 1) : Glyphs.dev(p.input) === 'gamepad' ? 'PAD' : 'KEYS', x + 34, y + 6, UI.MUTED, { align: 'right', font: 'tiny', outline: false }); if (p.ready) E.font.text(g, 'READY', x, y + 20, '#7ad87a', { align: 'center', font: 'tiny', outline: false }); });
      E.font.text(g, 'Press START on a free controller, or 2 on the keyboard, to join', r.W / 2, y0 + h + 6, '#cfe0f4', { align: 'center', outline: false });
      if (S2.some(p => p.input.half)) E.font.text(g, 'P1: WASD + F pass  G shoot  H deke  R saucer  T turbo     P2: ARROWS + . pass  / shoot  , deke  L saucer', r.W / 2, y0 + h + 17, UI.MUTED, { align: 'center', font: 'tiny', outline: false });
      this.goBox = [r.W / 2 - 50, r.H - 38, 100, 16]; UI.panel(g, this.goBox[0], this.goBox[1], 100, 16, { border: UI.GOLD }); E.font.text(g, 'ALL READY', r.W / 2, r.H - 34, UI.GOLD, { align: 'center', outline: '#000' });
      UI.legend(g, r, [['left', 'HOME / AWAY'], ['confirm', 'READY'], ['cancel', 'BACK']]);
    });
  }
};
function syncSides() {
  const S2 = Setup.st.sides, P2 = game.players;
  for (let i = 0; i < P2.length; i++) if (!S2[i] || S2[i].input !== P2[i]) S2[i] = { input: P2[i], side: i === 0 ? 0 : i === 1 ? 1 : i % 2 ? 1 : 0, ready: false };
  S2.length = P2.length;
}

scenes.setup = {
  enter() { this.i = 0; Setup.st.len = Setup.st.len || +S('periodLen') || 120; Setup.st.diff = Setup.st.diff || S('difficulty'); Synth.music('menu'); UI.Idle.reset(); },
  rows: ['home', 'arena', 'away', 'periods', 'len', 'diff', 'cheat', 'go'],
  change(k, d) {
    const st = Setup.st, tl = Setup.teams();
    const cyc = (list, v) => list[(list.indexOf(v) + d + list.length) % list.length];
    if (k === 'home') { st.home = cyc(tl, st.home); if (st.home === st.away) st.home = cyc(tl, st.home); }
    if (k === 'away') { st.away = cyc(tl, st.away); if (st.home === st.away) st.away = cyc(tl, st.away); }
    if (k === 'arena') st.arena = cyc(ARENA_ORDER, st.arena);
    if (k === 'periods') st.periods = cyc([1, 2, 3], st.periods);
    if (k === 'len') st.len = cyc([60, 90, 120, 180, 240], st.len);
    if (k === 'diff') st.diff = cyc(Match.DIFF_ORDER, st.diff);
    if (k === 'cheat') { const opts = ['off', ...Save.cheatsOpen().map(c => c[0])]; if (opts.length > 2) opts.push('all'); st.cheat = cyc(opts, st.cheat); }
    Synth.sfx('menuMove');
  },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    const rows = this.rows;
    if (UI.anyRep('up')) { this.i = (this.i + rows.length - 1) % rows.length; Synth.sfx('menuMove'); }
    if (UI.anyRep('down')) { this.i = (this.i + 1) % rows.length; Synth.sfx('menuMove'); }
    if (UI.anyRep('left')) this.change(rows[this.i], -1); if (UI.anyRep('right')) this.change(rows[this.i], 1);
    const p = UI.pointer(); if (p && UI.mouseMoved && this.hits) { const k = this.hits.findIndex(h => p[0] >= h.x && p[0] < h.x + h.w && p[1] >= h.y && p[1] < h.y + h.h); if (k >= 0 && this.hits[k].i !== this.i) { this.i = this.hits[k].i; Synth.sfx('menuMove'); } }
    const ck = game.input.clicked(); if (ck && this.hits) { const h = this.hits.find(h => ck[0] >= h.x && ck[0] < h.x + h.w && ck[1] >= h.y && ck[1] < h.y + h.h); if (h) { this.i = h.i; if (h.d) this.change(rows[h.i], h.d); else if (rows[h.i] === 'go') return this.go(); else this.change(rows[h.i], 1); } }
    if (UI.anyP('confirm') || UI.anyP('start')) { if (rows[this.i] === 'go' || UI.anyP('start')) return this.go(); this.change(rows[this.i], 1); }
    if (UI.anyP('cancel')) { Synth.sfx('menuBack'); game.go('sides'); }
  },
  go() { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); game.go('match', { cfg: Setup.cfg() }, { fade: 'iris' }); },
  draw(r) {
    r.sky(['#0a1430', '#122248', '#1a3060']);
    const st = Setup.st, rows = this.rows;
    r.overlay(g => {
      UI.title(g, 'EXHIBITION', r.W / 2, 8, 3);
      this.hits = [];
      const cw = Math.min(124, (r.W - 30) / 3), ch = 104, x0 = r.W / 2 - cw * 1.5, y0 = 40;
      const card = (k, i, x) => {
        const f = rows[this.i] === k; UI.panel(g, x + 3, y0, cw - 6, ch, { focus: f }); this.hits.push({ x: x + 3, y: y0, w: cw - 6, h: ch, i: rows.indexOf(k) });
        this.hits.push({ x: x + 3, y: y0 + ch / 2 - 10, w: 14, h: 20, i: rows.indexOf(k), d: -1 }, { x: x + cw - 17, y: y0 + ch / 2 - 10, w: 14, h: 20, i: rows.indexOf(k), d: 1 });
        E.font.text(g, '◂'.replace('◂', '<'), x + 8, y0 + ch / 2 - 4, f ? UI.GOLD : UI.MUTED, { outline: '#000' }); E.font.text(g, '>', x + cw - 12, y0 + ch / 2 - 4, f ? UI.GOLD : UI.MUTED, { outline: '#000' });
        E.font.text(g, k === 'home' ? 'HOME' : k === 'away' ? 'AWAY' : 'ARENA', x + cw / 2, y0 + 4, UI.MUTED, { align: 'center', font: 'tiny', outline: false });
        if (k === 'arena') { const A = ARENAS[st.arena], ic = '#' + A.ice.map(v => v.toString(16).padStart(2, '0')).join(''), rx = x + 20, ry = y0 + 30, rw = cw - 46, rh = 24; px.rect(g, rx - 3, ry - 3, rw + 6, rh + 6, A.snowbanks ? '#f4f8ff' : A.boards); px.rect(g, rx, ry, rw, rh, ic); px.rect(g, rx + rw / 2, ry, 1, rh, '#c8282e'); px.rect(g, rx + rw / 2 - 12, ry, 1, rh, '#2850be'); px.rect(g, rx + rw / 2 + 12, ry, 1, rh, '#2850be'); Logo.draw(g, A.home === 'grizzlies' && !Save.data.finished ? 'muskrats' : A.home, rx + rw / 2 - 8, ry + 4, 16); E.font.text(g, A.name, x + cw / 2, y0 + 12, f ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' }); E.font.text(g, A.town, x + cw / 2, y0 + 60, UI.MUTED, { align: 'center', outline: false }); const tags = []; if (A.hazards.includes('thinice')) tags.push('THIN ICE'); if (A.hazards.includes('pete')) tags.push('POLAR PETE'); if (A.hazards.includes('octopus')) tags.push('OCTOPI'); if (A.hazards.includes('rat')) tags.push('RATS'); if (A.hazards.includes('drop')) tags.push('DISCOUNT DROP'); if (A.snowbanks) tags.push('SNOWBANKS'); tags.slice(0, 3).forEach((t2, j) => E.font.text(g, t2, x + cw / 2, y0 + 72 + j * 10, '#ffb347', { align: 'center', outline: false })); return; }
        const id = st[k], t = TEAMS[id]; Logo.draw(g, id, x + cw / 2 - 20, y0 + 12, 40);
        E.font.text(g, t.short, x + cw / 2, y0 + 55, f ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' });
        const avg = j => Math.round(t.players.reduce((a, p) => a + p.r[j], 0) / 3), bars = [['SPEED', avg(0)], ['SHOOTING', avg(1)], ['HITTING', avg(3)], ['GOALIE', Math.round((t.goalie.r[0] + t.goalie.r[1]) / 2)]];
        bars.forEach(([lab, v], j) => { const yy = y0 + 66 + j * 9; E.font.text(g, lab, x + 10, yy, UI.MUTED, { font: 'tiny', outline: false }); for (let q = 0; q < 5; q++) px.rect(g, x + cw - 48 + q * 7, yy, 5, 5, q < v ? t.trim : '#2a3448'); });
      };
      card('home', 0, x0); card('arena', 1, x0 + cw); card('away', 2, x0 + cw * 2);
      const chips = [['periods', 'PERIODS', String(st.periods)], ['len', 'LENGTH', U.mmss(st.len)], ['diff', 'DIFFICULTY', String(st.diff).toUpperCase()], ['cheat', 'CHEATS', st.cheat === 'off' ? (Save.cheatsOpen().length ? 'OFF' : 'LOCKED') : st.cheat === 'all' ? 'ALL ON' : (Save.CHEATS.find(c => c[0] === st.cheat) || [, '?'])[1]]];
      const chw = Math.min(100, (r.W - 20) / 4), cx0 = r.W / 2 - chw * 2, cy = y0 + ch + 10;
      chips.forEach(([k, lab, val], j) => { const x = cx0 + j * chw + 2, f = rows[this.i] === k; UI.panel(g, x, cy, chw - 4, 26, { focus: f }); this.hits.push({ x, y: cy, w: chw - 4, h: 26, i: rows.indexOf(k) }); E.font.text(g, lab, x + (chw - 4) / 2, cy + 3, UI.MUTED, { align: 'center', font: 'tiny', outline: false }); E.font.text(g, val, x + (chw - 4) / 2, cy + 13, f ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' }); });
      const gy = cy + 34, f = rows[this.i] === 'go'; UI.panel(g, r.W / 2 - 60, gy, 120, 22, { focus: f, bg: f ? ['#3a5a1c', '#1a2a0c'] : undefined }); this.hits.push({ x: r.W / 2 - 60, y: gy, w: 120, h: 22, i: rows.indexOf('go') });
      E.font.title(g, 'FACE OFF!', r.W / 2, gy + 4, { align: 'center', scale: 2, colors: f ? ['#ffffff', '#ffe08a', '#ffb347'] : ['#e8e8e8', '#b8c0d0', '#8890a0'] });
      const hum = Setup.st.sides.filter(p => p.side >= 0).length; E.font.text(g, hum ? hum + ' PLAYER' + (hum > 1 ? 'S' : '') : 'CPU VS CPU (WATCH)', r.W / 2, gy + 28, UI.MUTED, { align: 'center', outline: false });
      UI.legend(g, r, [['up', 'MOVE'], ['left', 'CHANGE'], ['confirm', 'SELECT'], ['cancel', 'BACK']], r.H - 12);
    });
  }
};
