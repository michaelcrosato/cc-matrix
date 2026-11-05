/* =====================================================================================
 * 66-ui-map: the automap (what was seen, on parchment; L1 R1 visited floors; the d-pad pans a big one), the Journal
 * (Quests, Notes, Deeds, Log) and the Reader (a note's page)
 * ===================================================================================== */
const PARCH = ['#dcc9a0', '#bca77a'], INK = '#3a2614';
SCREENS.map = {
  f: null, ox: 0, oy: 0,
  open() { this.f = S.floor; this.ox = 0; this.oy = 0; },
  floors() { return B.FLOOR_ORDER.concat(['race']).filter(f => S.floors[f] && S.floors[f].visited); },
  update(dt) {
    const I = game.input;
    if (I.pressed('cancel') || I.pressed('map') && !I.held.has('Pad8') || (I.released && I.released('map') && I.lastDevice === 'gamepad' && this._armed)) { UI.close(); return; }
    this._armed = true;
    const fs = this.floors(); let k = fs.indexOf(this.f);
    if (I.pressed('mL')) { this.f = fs[(k + fs.length - 1) % fs.length]; this.ox = this.oy = 0; Sound.sfx('uiTab'); }
    if (I.pressed('mR')) { this.f = fs[(k + 1) % fs.length]; this.ox = this.oy = 0; Sound.sfx('uiTab'); }
    if (I.pressed('journal') || I.pressed('mAlt')) { UI.close(); UI.open('journal'); return; }
    const sp = 120 * dt; if (I.down('left')) this.ox += sp; if (I.down('right')) this.ox -= sp; if (I.down('up')) this.oy += sp; if (I.down('down')) this.oy -= sp;
    const ck = I.clicked(); if (ck && this._jb && ck[0] >= this._jb.x && ck[0] < this._jb.x + this._jb.w && ck[1] >= this._jb.y && ck[1] < this._jb.y + this._jb.h) { UI.close(); UI.open('journal'); }
  },
  draw(g, r) {
    const W = r.W, H = r.H, f = this.f, X = B.idx(f), fl = S.floors[f], P = S.party;
    g.save(); g.globalAlpha = .75; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
    const s = clamp(Math.floor(Math.min((W - 24) / X.W, (H - 64) / X.H)), 6, 10), mw = X.W * s, mh = X.H * s;
    const maxOx = Math.max(0, (mw - (W - 24)) / 2), maxOy = Math.max(0, (mh - (H - 64)) / 2); this.ox = clamp(this.ox, -maxOx, maxOx); this.oy = clamp(this.oy, -maxOy, maxOy);
    const x0 = Math.round(W / 2 - mw / 2 + this.ox), y0 = Math.round(26 + (H - 64) / 2 - mh / 2 + this.oy);
    parch(g, 6, 18, W - 12, H - 46);
    const seen = (x, y) => B.seen(x, y, f), dev = B.CHEATS.reveal;
    const near = (x, y) => [0, 1, 2, 3].some(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < X.W && ny < X.H && X.ch(nx, ny) !== '#' && seen(nx, ny); });
    for (let y = 0; y < X.H; y++) for (let x = 0; x < X.W; x++) {
      const ch = X.ch(x, y), cx = x0 + x * s, cy = y0 + y * s, k = key(x, y);
      if (ch === '#') { if (near(x, y) || dev) px.rect(g, cx, cy, s, s, '#6a4a2a'); continue; }
      if (!seen(x, y)) continue;
      const d = X.doorAt[k];
      if (d && (d.kind === 'secret' || d.kind === 'illusion') && fl.doors[d.id].open < .5 && !(d.kind === 'illusion' && S.flags[d.id]) && !dev) { px.rect(g, cx, cy, s, s, '#6a4a2a'); continue; }
      px.rect(g, cx, cy, s, s, (x + y) % 2 ? '#cbb58a' : '#c6b084');
      if (X.water[k]) px.rect(g, cx + 1, cy + s / 2 - 1, s - 2, 2, '#6a8a8a');
      if (d) { const open = fl.doors[d.id].open > .5, c = d.kind === 'gate' ? '#4a4a52' : d.kind === 'seal' ? '#6a4a9a' : d.kind === 'undergate' ? '#2a2a3a' : '#8a4a1a'; if (d.ns) px.rect(g, cx, cy + s / 2 - 1, s, 2, open ? '#b8a070' : c); else px.rect(g, cx + s / 2 - 1, cy, 2, s, open ? '#b8a070' : c); if (fl.doors[d.id].locked && d.kind === 'lock') px.dot(g, cx + s / 2, cy + s / 2, '#ffd36a'); }
      const st = X.stairAt[k]; if (st) { TXT(g, st.up ? '<' : '>', cx + 1, cy + s / 2 - 3, INK, { shadow: false, font: 'tiny' }); }
      const pl = X.plateAt[k]; if (pl && (fl.plateSeen[pl.id] || dev)) px.rect(g, cx + 2, cy + 2, s - 4, s - 4, '#8a7a5a');
      const pit = X.pitAt[k]; if (pit && (fl.pits[pit.id].open || dev) && !fl.pits[pit.id].bridged) px.rect(g, cx + 1, cy + 1, s - 2, s - 2, '#2a1a0a');
      const tp = X.tpAt[k]; if (tp && (fl.tpUsed[tp.id] || dev)) { px.disc(g, cx + s / 2, cy + s / 2, s / 3, fl.tps[tp.id] ? '#4a8ac8' : '#8a9aa8'); }
      if (X.spin[k] && (fl.spinSeen || dev)) { px.line(g, cx + 2, cy + 2, cx + s - 2, cy + s - 2, '#8a2a2a'); px.line(g, cx + s - 2, cy + 2, cx + 2, cy + s - 2, '#8a2a2a'); }
      for (const [id, n] of Object.entries(fl.npcs)) if (n.state === 'here' && n.x === x && n.y === y && !(id === 'ysolde')) px.disc(g, cx + s / 2, cy + s / 2, 2, '#2a6a3a');
    }
    // wall features: inscriptions (a quill), alcoves, levers
    for (const ft of X.featList) {
      if (!seen(ft.x, ft.y)) continue; const cx = x0 + ft.x * s + s / 2 + DX[ft.dir] * (s / 2 - 1), cy = y0 + ft.y * s + s / 2 + DY[ft.dir] * (s / 2 - 1);
      const c = ft.kind === 'plaque' ? '#2a2aa0' : ['alcove', 'shrine', 'gearNiche', 'clockFace'].includes(ft.kind) ? '#a06a1a' : ft.kind === 'lever' ? '#2a6a2a' : ft.kind === 'greatLock' ? '#2a8aa0' : null;
      if (c) px.rect(g, Math.round(cx) - 1, Math.round(cy) - 1, 2, 2, c);
    }
    // monsters: a Ranger tracks them within 4 cells; Dev reveal shows all
    const track = P.members.some(m => m.cls === 'R' && m.state === 'ok');
    if (f === S.floor) for (const m of fl.mons) if (m.hp > 0 && (dev || (track && Math.abs(m.cx - P.cx) + Math.abs(m.cy - P.cy) <= 4))) px.rect(g, x0 + m.cx * s + s / 2 - 1, y0 + m.cy * s + s / 2 - 1, 2, 2, '#b8201a');
    if (dev && B.Dev && B.Dev.overlays && B.Dev.overlays.wires) this.wires(g, f, x0, y0, s);
    // the party's arrow
    if (f === S.floor) { const ax = x0 + P.cx * s + s / 2, ay = y0 + P.cy * s + s / 2, d = P.dir, pulse = Math.sin(game.real * 6) > 0; px.disc(g, ax, ay, s / 3, pulse ? '#c8201a' : '#8a1010'); px.line(g, ax, ay, ax + DX[d] * s * .6, ay + DY[d] * s * .6, '#c8201a', 2); }
    // heading, tabs, legend
    const F = B.FLOORS[f]; E.font.title(g, F.name.toUpperCase(), W / 2, 4, { scale: 1, align: 'center', colors: ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'] });
    if (this.floors().length > 1 && devOf() !== 'mouse') { glyph(g, 'mL', 10, 4); glyph(g, 'mR', W - 22, 4); }
    const leg = [['#6a4a2a', 'Wall'], ['#8a4a1a', 'Door'], ['#4a4a52', 'Gate'], ['#8a7a5a', 'Plate'], ['#2a2aa0', 'Writing'], ['#a06a1a', 'Niche'], ['#c8201a', 'You']];
    let lx = 12; for (const [c, t] of leg) { px.rect(g, lx, H - 40, 6, 6, c); TXT(g, t, lx + 8, H - 41, INK, { shadow: false }); lx += TW(t) + 16; }
    this._jb = { x: W - 70, y: H - 24, w: 62, h: 14 }; panel(g, this._jb.x, this._jb.y, this._jb.w, this._jb.h, { rivets: false }); TXT(g, 'Journal', this._jb.x + 8, this._jb.y + 3, COL.text);
    prompts(g, [['journal', 'Journal'], ['cancel', 'Close']], W - 76, H - 21, { align: 'right' });
  },
  wires(g, f, x0, y0, s) {
    const X = B.idx(f), F = B.FLOORS[f];
    for (const w of F.wires || []) {
      const from = w.when.lever || w.when.catch || w.when.plate || (w.when.plates && w.when.plates[0]) || (w.when.buttons && w.when.buttons[0]) || w.when.alcove; if (!from) continue;
      const src = X.feats[from] || Object.values(X.plateAt).find(p => p.id === from); if (!src) continue;
      for (const a of w.do) { const d = X.doors[a[1]]; if (!d) continue; px.line(g, x0 + src.x * s + s / 2, y0 + src.y * s + s / 2, x0 + d.x * s + s / 2, y0 + d.y * s + s / 2, '#c8201a'); }
    }
  }
};
SCREENS.journal = {
  tab: 0, focus: 'n0', scroll: 0,
  open(d) { this.tab = d && d.tab !== undefined ? d.tab : 0; this.focus = 'n0'; this.scroll = 0; },
  tabs: ['Quests', 'Notes', 'Deeds', 'Log'],
  layout(W, H) {
    const out = []; this.tabs.forEach((t, i) => out.push({ id: 't' + i, x: 12 + i * 70, y: 22, w: 64, h: 14, act: () => { this.tab = i; this.scroll = 0; this.focus = 'n0'; }, label: t, tabI: i }));
    if (this.tab === 1) S.notes.forEach((n, i) => out.push({ id: 'n' + i, x: 16, y: 44 + i * 13, w: W - 32, h: 12, act: () => UI.open('reader', { note: n }), note: n }));
    return out;
  },
  update(dt) {
    const I = game.input;
    if (I.pressed('cancel') || I.pressed('journal')) { UI.close(); return; }
    if (I.pressed('mL')) { this.tab = (this.tab + 3) % 4; this.scroll = 0; Sound.sfx('uiTab'); }
    if (I.pressed('mR')) { this.tab = (this.tab + 1) % 4; this.scroll = 0; Sound.sfx('uiTab'); }
    if (this.tab === 3) { if (I.repeat('up', .3, .08)) this.scroll++; if (I.repeat('down', .3, .08)) this.scroll = Math.max(0, this.scroll - 1); const z = I.zoom && I.zoom(); if (z && z !== 1) this.scroll = Math.max(0, this.scroll + (z > 1 ? 1 : -1)); }
    const r = Focus.step(this.layout(UI.W, UI.H).filter(w => this.tab === 1 || w.tabI !== undefined), this.focus); this.focus = r.id;
  },
  draw(g, r) {
    const W = r.W, H = r.H, list = this.layout(W, H);
    g.save(); g.globalAlpha = .78; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
    E.font.title(g, 'JOURNAL', W / 2, 4, { scale: 1, align: 'center', colors: ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'] });
    parch(g, 6, 40, W - 12, H - 70);
    for (const w of list.filter(q => q.tabI !== undefined)) { panel(g, w.x, w.y, w.w, w.h, { rivets: false, border: w.tabI === this.tab ? COL.focus : '#6a5a3a' }); TXT(g, w.label, w.x + w.w / 2 - TW(w.label) / 2, w.y + 3, w.tabI === this.tab ? COL.focus : COL.dim); }
    const ink = (t, x, y, c = INK) => TXT(g, t, x, y, c, { shadow: false });
    let y = 46;
    if (this.tab === 0) {
      const Q = [['main', 'q_main'], ['wards', 'q_wards'], ['eye', 'q_eye'], ['tamsin', 'q_tamsin'], ['durgan', 'q_durgan'], ['clock', 'q_clock'], ['veil', 'q_veil']];
      for (const [k, t] of Q) { const st = S.quests[k] || (k === 'tamsin' && S.floors.f1 && S.floors.f1.visited ? null : null); if (!S.quests[k] && !(k === 'wards' && S.floors.f2 && S.floors.f2.visited)) continue; const done = S.quests[k] === 'done' || (k === 'tamsin' && (S.flags.joined_tamsin || S.flags.left_tamsin)) || (k === 'clock' && S.special.sq2) || (k === 'main' && S.won);
        for (const ln of E.font.wrap((done ? '+ ' : '• ') + B.TXT[t], W - 40)) { ink(ln, 16, y, done ? '#6a5a3a' : INK); y += 11; } y += 3; }
    } else if (this.tab === 1) {
      if (!S.notes.length) ink('Nothing written down yet.', 16, y);
      for (const w of list.filter(q => q.note)) { ink((B.TXT[w.note] || '').slice(0, Math.floor((W - 40) / 5)) + '...', w.x + 2, w.y + 2); }
      Focus.draw(g, list.filter(q => q.note), this.focus);
    } else if (this.tab === 2) {
      const n = Object.keys(S.special).length; ink('Hidden deeds found: ' + n + ' of 3', 16, y); y += 14;
      for (const id of ['sq1', 'sq2', 'sq3']) { ink((S.special[id] ? '+ ' + B.TXT[id] : '• ???'), 16, y, S.special[id] ? INK : '#7a6a4a'); y += 12; }
      y += 6; ink('Secrets found: ' + S.stats.secrets + ' of 3', 16, y); y += 14;
      for (const id of ['closet', 'I1', 'catch']) { ink(S.secrets[id] ? '+ ' + B.TXT['sec_' + id] : '• ???', 16, y, S.secrets[id] ? INK : '#7a6a4a'); y += 12; }
    } else {
      const lines = []; for (const l of S.log) for (const ln of E.font.wrap(l.text, W - 40)) lines.push(ln);
      const rows = Math.floor((H - 80) / 10), end = Math.max(0, lines.length - this.scroll), start = Math.max(0, end - rows);
      lines.slice(start, end).forEach((ln, i) => ink(ln, 14, 46 + i * 10));
    }
    prompts(g, [['mL', 'Tab'], ['cancel', 'Close']], W - 8, H - 22, { align: 'right' });
  }
};
SCREENS.reader = {
  note: null, page: 0,
  open(d) { this.note = d.note; this.page = 0; Sound.sfx('scroll'); },
  update() { const I = game.input; if (I.pressed('cancel') || I.pressed('confirm') && this.page >= this.pages().length - 1 || I.clicked()) { UI.close(); return; } if (I.repeat('right', .3, .1) || I.pressed('confirm')) this.page = Math.min(this.pages().length - 1, this.page + 1); if (I.repeat('left', .3, .1)) this.page = Math.max(0, this.page - 1); },
  pages() { const W = UI.W, lines = E.font.wrap(B.TXT[this.note] || '', Math.min(260, W - 60)), per = 10, out = []; for (let i = 0; i < lines.length; i += per) out.push(lines.slice(i, i + per)); return out.length ? out : [[]]; },
  draw(g, r) {
    const W = r.W, H = r.H, pw = Math.min(280, W - 40), ph = 150, x = W / 2 - pw / 2, y = H / 2 - ph / 2 - 20;
    g.save(); g.globalAlpha = .6; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
    parch(g, x, y, pw, ph);
    const it = Object.values(B.ITEMS).find(d => d.note === this.note), title = it ? it.name : 'Writing';
    TXT(g, title, x + pw / 2 - TW(title) / 2, y + 8, '#5a3a1a', { shadow: false });
    const pg = this.pages(); (pg[this.page] || []).forEach((l, i) => TXT(g, l, x + 12, y + 24 + i * 11, INK, { shadow: false }));
    if (pg.length > 1) TXT(g, (this.page + 1) + '/' + pg.length, x + pw - 24, y + ph - 12, '#5a3a1a', { shadow: false });
    prompts(g, [['cancel', 'Close']], x + pw, y + ph + 6, { align: 'right' });
  }
};
