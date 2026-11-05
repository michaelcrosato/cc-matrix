/* ---------- dojo menu, bonus menu, records, about, move list ---------- */
menuScene('dojoMenu', 'dojo', 'DOJO', () => [
  { label: 'LESSON I', sub: '7 DRILLS: THE BASICS', onPick: () => KC.game.go('practice', { lesson: 'I', stage: 'dojo' }) },
  { label: 'LESSON II', sub: '6 DRILLS: STEP IN, STRIKE THROUGH', onPick: () => KC.game.go('practice', { lesson: 'II', stage: 'harbor' }) },
  { label: 'LESSON III', sub: '8 DRILLS: SPINS, FLIPS, SWEEPS', onPick: () => KC.game.go('practice', { lesson: 'III', stage: 'log' }) },
  { label: 'ALL TECHNIQUES', sub: 'ALL 21 DRILLS, ONE BY ONE', onPick: () => KC.game.go('practice', { lesson: 'ALL', stage: 'dojo' }) },
  { label: 'FREE SPAR', sub: 'HIT A DUMMY. BOXES AND FRAME DATA ON', onPick: () => KC.startFreeSpar() },
  { label: 'TECHNIQUE LAB', sub: 'FRAME DATA AND MEASURED REACH, TECHNIQUE BY TECHNIQUE', onPick: () => KC.game.go('lab', { id: 'frontKick' }) },
  { label: 'MOVE LIST', sub: 'EVERY TECHNIQUE, LIVE', onPick: () => KC.game.go('moveList', { back: 'dojoMenu' }) }
]);
KC.startFreeSpar = () => { const g = KC.game; KC.dev.showBoxes = true; KC.dev.showInput = true; KC.dev.showFrame = true; g.go('fight', { mode: 'freeSpar', stage: 'dojo', ids: ['taro', 'kamaboko'], players: ['human', 'dummy'], intro: false, single: true, practice: true, hideScore: true, seed: 3, noSlow: true, onEnd: () => g.go('dojoMenu'), onStart: (b, sc) => { b.o.practice = true; b.infiniteTime = true; sc.dummyMode = 'stand'; }, draw: (r, sc) => r.overlay(gg => { KC.text(gg, 'DUMMY: ' + sc.dummyMode.toUpperCase() + '   (' + (KC.family() === 'key' ? 'TAB' : 'CREATE') + ' CHANGES IT)', r.W / 2, r.H - 30, '#ffd060', { align: 'center' }); }), update: (dt, sc) => { const I = KC.game.input; if (I.pressed('dummy')) { const L = ['stand', 'crouch', 'jump', 'block', 'attack']; sc.dummyMode = L[(L.indexOf(sc.dummyMode) + 1) % L.length]; KC.sfx('menuMove'); } if (sc.bout.phase === 'done') g.go('dojoMenu'); } }); };
const BONUS_OPTS = { boards: { n: 1, mat: 0 }, pots: {}, bull: {} };
menuScene('bonusMenu', 'courtyard', 'BONUS GAMES', function () {
  const o = this.opts = this.opts || { n: 1, mat: 0 }, ns = [3, 5, 7, 10], mats = KC.BONUS.boards.mats;
  return [
    { label: () => 'BREAK THE BOARDS  ' + ns[o.n] + ' ' + mats[o.mat][0], sub: 'LEFT/RIGHT: BOARDS (' + ns.join(',') + ') - UP/DOWN THEN LEFT/RIGHT FOR MATERIAL', adjust: d => { o.n = (o.n + d + ns.length) % ns.length; }, onPick: () => KC.game.go('bonus', { kind: 'boards', params: { n: ns[o.n], mat: o.mat } }) },
    { label: () => 'MATERIAL  ' + mats[o.mat][0] + ' X' + mats[o.mat][1], sub: 'PINE, ROOF TILE X1.5, ICE X2 - SCORE MULTIPLIER', adjust: d => { o.mat = (o.mat + d + mats.length) % mats.length; }, onPick: () => { o.mat = (o.mat + 1) % mats.length; } },
    { label: 'POTS AHOY!', sub: '16 FLYING POTS, BOULDERS AND BOWLS', onPick: () => KC.game.go('bonus', { kind: 'pots' }) },
    { label: 'STOP THE BULL', sub: 'THREE CHARGES. WATCH THE HORNS', onPick: () => KC.game.go('bonus', { kind: 'bull' }) },
    { label: 'RECORDS', sub: 'THE BONUS TABLES', onPick: () => KC.game.go('records', { mode: 'boards', after: () => KC.game.go('bonusMenu') }) }
  ];
});
/* ---- records ---- */
simpleScene('records', {
  enter(d) { this.d = d || {}; this.modes = ['story', 'boards', 'pots', 'bull']; this.i = Math.max(0, this.modes.indexOf(this.d.mode || 'story')); this.stage = new Stage('stadium'); this.t = 0; KC.music('select'); KC.game.follow(null); KC.current = this; },
  update(dt) {
    this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); const I = KC.game.input, p = I.pointer(), c = I.clicked();
    if (I.pressed('left') || (I.pressed('tLeft')) || I.pressed('dummy')) { this.i = (this.i + 3) % 4; KC.sfx('menuMove'); }
    if (I.pressed('right') || I.pressed('tRight')) { this.i = (this.i + 1) % 4; KC.sfx('menuMove'); }
    if (c) { for (let k = 0; k < 4; k++) if (this.tabs && Math.abs(c[0] - this.tabs[k]) < 36 && c[1] < 34) this.i = k; }
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('start')) { I.consumeAll(); KC.sfx('menuBack'); if (this.d.after) this.d.after(); else KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    backDrop(r, this); const names = { story: 'CHAMPON ROAD', boards: 'BOARDS', pots: 'POTS AHOY!', bull: 'STOP THE BULL' };
    r.overlay(g => { KC.title(g, 'RECORDS', r.W / 2, 8, 2); this.tabs = []; this.modes.forEach((m, k) => { const x = r.W / 2 + (k - 1.5) * 78; this.tabs[k] = x; KC.text(g, names[m], x, 30, k === this.i ? '#ffd060' : '#8a84a8', { align: 'center' }); if (k === this.i) px.rect(g, x - 34, 40, 68, 2, '#ffd060'); }); });
    KC.cab.drawTable(r, this.modes[this.i], 48, names[this.modes[this.i]]); KC.promptBar(r, [['confirm', 'BACK']]);
  }
});
/* ---- about / credits, paged ---- */
KC.aboutPages = () => {
  const A = KC.about(), si = A.sourceInformation, secs = [], lab = { date: 'DATE', source: 'SOURCE', plan: 'PLAN', genre: 'GENRE', perspective: 'PERSPECTIVE', tech: 'TECH', artDirection: 'ART DIRECTION', animation: 'ANIMATION', audio: 'AUDIO', online: 'ONLINE', testing: 'TESTING', research: 'RESEARCH', environment: 'ENVIRONMENT', model: 'MODEL', usage: 'USAGE' };
  const flat = [];
  for (const k in lab) flat.push([lab[k], si[k]]);
  secs.push({ title: 'SOURCE INFORMATION', items: flat });
  const Q = (qs, as) => qs.map((q, i) => [q, as[i]]);
  secs.push({ title: 'TESTING FEEDBACK', items: Q(['ISSUES CAUGHT', 'GAME BREAKING', 'MOST HELPFUL TEST', 'LEAST HELPFUL TEST'], A.testingFeedback) });
  secs.push({ title: 'ENGINE FEEDBACK', items: Q(['LIKED MOST', 'STUCK OR GUESSED WRONG', 'BUILT MYSELF', 'HARDEST PART', 'WHAT I CHANGED', 'CHANGE ONE THING'], A.engineFeedback) });
  secs.push({ title: 'PROMPT FEEDBACK', items: Q(['LIKED MOST', 'CONFUSING', 'HARDEST THING', 'WHAT I WOULD CHANGE'], A.promptFeedback) });
  secs.push({ title: 'CREDITS', items: [['GAME', 'KARATE CHAMPON, AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984, DATA EAST)'], ['ENGINE', 'MY-3D2DGE V0.85.2 BY MICHAEL CROSATO (MIT)'], ['ONLINE', 'AI HUB SESSION PROTOCOL V1 (CLIENT 1.4.0)'], ['OBJECTS', 'KENNEY AND KAYKIT CC0 ASSETS (CREDITED, NOT BUNDLED)'], ['MODEL', up(si.model)], ['MUSIC, SFX, VOICES', 'ALL WRITTEN IN CODE. NO AUDIO FILES']] });
  return secs;
};
simpleScene('about', {
  enter() {
    this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .3 }); KC.music('select'); KC.game.follow(null); this.pi = 0; this.scroll = 0; KC.current = this; this.build = null; KC.idle.t = 0; this.P = this.pages(KC.game.W);
  },
  pages(RW) {
    const W = RW - 40, out = [];
    for (const sec of KC.aboutPages()) { const lines = []; for (const [k, v] of sec.items) { const w = E.font.wrap(String(v), W - 10, {}); lines.push({ k, w }); } let page = { title: sec.title, rows: [], n: 0 }; for (const it of lines) { const h = it.w.length + 1; if (page.n + h > 11 && page.rows.length) { out.push(page); page = { title: sec.title + ' (CONT.)', rows: [], n: 0 }; } page.rows.push(it); page.n += h; } out.push(page); }
    return out;
  },
  update(dt) {
    this.stage.update(dt); KC.game.focus(200, 0, 50); const I = KC.game.input; if (!this.P) return;
    if (I.repeat('right', .4, .15) || I.pressed('tRight')) { this.pi = (this.pi + 1) % this.P.length; KC.sfx('menuMove'); }
    if (I.repeat('left', .4, .15) || I.pressed('tLeft')) { this.pi = (this.pi + this.P.length - 1) % this.P.length; KC.sfx('menuMove'); }
    const c = I.clicked(); if (c) { this.pi = c[0] > this.W2 / 2 ? (this.pi + 1) % this.P.length : (this.pi + this.P.length - 1) % this.P.length; KC.sfx('menuMove'); }
    if (I.pressed('cancel') || I.pressed('start')) { I.consumeAll(); KC.sfx('menuBack'); KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    this.W2 = r.W; if (!this.P) this.P = this.pages(r.W); backDrop(r, this); const pg = this.P[this.pi];
    r.overlay(g => {
      KC.panel(g, 10, 8, r.W - 20, r.H - 40, { alpha: .85 }); KC.title(g, pg.title, r.W / 2, 14, 1);
      let y = 32; for (const row of pg.rows) { KC.text(g, row.k, 22, y, '#ffd060'); y += 10; for (const ln of row.w) { KC.text(g, ln, 28, y, '#e8e0ff'); y += 9; } y += 2; }
      KC.text(g, 'PAGE ' + (this.pi + 1) + '/' + this.P.length + '   ◂ ▸', r.W / 2, r.H - 46, '#cfc8e8', { align: 'center' });
    });
    KC.promptBar(r, [['cancel', 'BACK']]);
  }
});
/* ---- the move list: one posture at a time, around a big R-stick icon. A view, so it works as a scene and as a pause overlay ---- */
class MoveListView {
  constructor(onClose) { this.onClose = onClose; this.post = 0; this.sel = 't'; this.me = new Karateka('taro', 0, {}); this.dum = new Karateka('negi', 1, {}); this.postures = ['n', 't', 'a', 'u', 'd']; this.t = 0; this.play = 0; this.rd = new Reader(KC.game.input); this.hot = []; this.rows = []; }
  update(dt) {
    this.t += dt; const I = KC.game.input;
    if (I.repeat('up', .4, .15)) { this.post = (this.post + 4) % 5; KC.sfx('menuMove'); } if (I.repeat('down', .4, .15)) { this.post = (this.post + 1) % 5; KC.sfx('menuMove'); }
    const R = this.rd.read(); if (R.tech) { this.sel = ({ u: 'u', d: 'd', l: 'a', r: 't' })[R.tech]; this.preview(); }
    const c = I.clicked(); if (c) { for (const h of this.hot) if (Math.hypot(c[0] - h.x, c[1] - h.y) < 14) { this.sel = h.s; this.preview(); } this.rows.forEach((x, i) => { if (Math.abs(c[1] - x.y) < 8 && c[0] < 120) { this.post = i; KC.sfx('menuMove'); } }); }
    if (I.pressed('cancel') || I.pressed('start')) { I.consumeAll(); KC.sfx('menuBack'); this.onClose(); return true; }
    this.me.x = 150; this.dum.x = 150 + PUSH + 28; this.me.frozen = false;
    if (this.play) { this.play--; this.me.step(this.dum, null); if (!this.me.tech) this.play = 0; }
    this.me.update(dt, this.dum); this.dum.update(dt, this.me); return false;
  }
  preview() { const id = KC.MATRIX[this.postures[this.post] + this.sel]; if (!id) return; KC.sfx('menuMove'); this.me.reset(); this.dum.reset(); this.me.x = 150; this.dum.x = 150 + PUSH + 30; this.me.start(id, this.dum, 'n', null); this.play = 600; }
  draw(r, bare) {
    const P = this.postures[this.post], id = KC.MATRIX[P + this.sel], t = KC.TECHS[id];
    r.actor(150, 0, 0, (g, ox, oy) => this.me.rig.draw(g, ox, oy, r.view)); r.actor(this.dum.x, 0, 0, (g, ox, oy) => this.dum.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H; if (bare) px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#07060d')); KC.title(g, 'MOVE LIST', W / 2, 6, 2);
      const names = { n: 'STAND', t: 'STEP IN', a: 'STEP BACK', u: 'JUMP', d: 'CROUCH' }; this.rows = [];
      this.postures.forEach((p, i) => { const y = 36 + i * 22; this.rows[i] = { y: y + 6 }; if (i === this.post) px.rect(g, 6, y - 3, 130, 19, '#4a2a3a'); drawStick(g, 'L', p === 'n' ? null : p === 't' ? 'r' : p === 'a' ? 'l' : p, 10, y, 13); KC.text(g, names[p], 34, y + 2, i === this.post ? '#ffd060' : '#cfc8e8'); });
      const cx = W - 90, cy = 90; this.hot = []; px.disc(g, cx, cy, 14, '#10101c'); px.disc(g, cx, cy, 12, '#3a3a52'); E.font.text(g, 'R', cx, cy - 3, '#ff9a6a', { align: 'center', outline: false });
      for (const [s, dx, dy] of [['u', 0, -34], ['t', 46, 0], ['d', 0, 34], ['a', -46, 0]]) { const tid = KC.MATRIX[P + s], tt = KC.TECHS[tid]; this.hot.push({ x: cx + dx, y: cy + dy, s }); px.rect(g, cx + dx - 34, cy + dy - 6, 68, 12, s === this.sel ? '#8a3a1a' : '#201830'); KC.text(g, tt ? tt.name.replace('LUNGE ', '').slice(0, 17) : '-', cx + dx, cy + dy - 3, tt ? (s === this.sel ? '#fff6d0' : '#cfc8e8') : '#5a5478', { align: 'center' }); }
      if (t) { KC.panel(g, 6, H - 84, W - 12, 42, { alpha: .85 }); KC.text(g, t.name + '  (' + t.jp + ')', 12, H - 80, '#ffd060'); KC.text(g, 'POINTS ' + t.pts.join('-') + (t.full ? '   * FULL POINT' : t.util ? '' : '   HALF POINT') + '   ' + up(t.height).replace('NONE', 'MOVE'), 12, H - 68, '#fff'); if (!t.util) KC.text(g, 'REACH ' + t.reach.join('-') + '  FRAMES ' + t.f.join('/') + (t.unblockable ? '  UNBLOCKABLE' : ''), 12, H - 57, '#9ad8ff'); KC.glyphTech(g, id || 'frontKick', W - 70, H - 80, {}); }
    });
    KC.promptBar(r, [['cancel', 'BACK']]);
  }
}
KC.MoveListView = MoveListView;
simpleScene('moveList', {
  enter(d) { this.d = d || {}; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .4 }); KC.game.follow(null); KC.current = this; KC.music('practice'); this.view = new MoveListView(() => KC.game.go('title', { menu: true })); if (this.d.back === 'dojoMenu') this.view.onClose = () => KC.game.go('dojoMenu'); },
  update(dt) { this.stage.update(dt); KC.game.focus(200, 0, 50); this.view.update(dt); },
  draw(r) { backDrop(r, this); this.view.draw(r); }
});
// the pause menu's Move list: an overlay over the running scene
KC.overlay = null;
KC.overlayStep = dt => { if (KC.overlay) { KC.overlay.update(dt); return true; } return false; };
KC.overlayDraw = r => { if (KC.overlay) KC.overlay.draw(r, true); };
KC.openMoveList = () => { KC.overlay = new MoveListView(() => { KC.overlay = null; }); KC.game.resume && KC.game.resume(); };

/* ---- the Technique Lab: the hero against a standing dummy; frame data and the measured contact gap ---- */
KC.measureGap = id => {
  let best = -1;
  for (let g = 0; g <= 150; g++) {
    const b = new Bout({ ids: ['taro', 'ebi'], seed: 3, ctrl: [null, null], intro: false }); b.start(); while (b.phase !== 'fight') b.step();
    const a = b.f[0], d = b.f[1]; a.x = 150; d.x = 150 + PUSH + g; a.frozen = d.frozen = false; a.start(id, d, 'n', 'r'); let hit = false; b.on('point', () => { hit = true; });
    for (let n = 0; n < 500 && (a.tech || b.pending); n++) { b.fightStep(); if (b.phase !== 'fight') break; } if (hit) best = g;
  }
  return best;
};
simpleScene('lab', {
  pausable: true,
  enter(d) { this.stage = new Stage('dojo'); this.i = Math.max(0, KC.SCORING.findIndex(t => t.id === (d && d.id))); this.me = new Karateka('taro', 0, {}); this.dum = new Karateka('kamaboko', 1, {}); this.gaps = {}; this.t = 0; this.slow = false; this.boxes = true; KC.music('practice'); KC.game.follow(null); KC.current = this; this.play(); },
  cur() { return KC.SCORING[this.i]; },
  play() { const t = KC.SCORING[this.i]; this.me.reset(); this.dum.reset(); this.me.x = 150; this.dum.x = 150 + PUSH + Math.round((t.reach[0] + t.reach[1]) / 2); this.dum.face = -1; this.me.frozen = false; this.me.start(t.id, this.dum, 'n', 'r'); if (this.gaps[t.id] === undefined) this.gaps[t.id] = KC.measureGap(t.id); this.run = true; },
  update(dt) {
    const I = KC.game.input; this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50);
    if (I.pressed('tabR')) { this.i = (this.i + 1) % KC.SCORING.length; this.play(); } if (I.pressed('tabL')) { this.i = (this.i + KC.SCORING.length - 1) % KC.SCORING.length; this.play(); }
    // live sliders for this technique: up/down picks startup, active, recovery or max reach; left/right change it; start copies the JSON
    const T0 = this.cur(); this.fld = this.fld || 0;
    if (I.repeat('up', .4, .15)) this.fld = (this.fld + 3) % 4; if (I.repeat('down', .4, .15)) this.fld = (this.fld + 1) % 4;
    const dx = I.repeat('left', .35, .08) ? -1 : I.repeat('right', .35, .08) ? 1 : 0;
    if (dx) { if (this.fld < 3) T0.f[this.fld] = Math.max(1, T0.f[this.fld] + dx); else T0.reach[1] = Math.max(T0.reach[0] + 1, T0.reach[1] + dx); T0._spec = null; this.gaps[T0.id] = undefined; this.play(); }
    if (I.pressed('start')) { try { navigator.clipboard.writeText(JSON.stringify({ id: T0.id, f: T0.f, reach: T0.reach, pts: T0.pts, travel: T0.travel })); this.note = 'COPIED JSON'; } catch (e) { this.note = 'CLIPBOARD BLOCKED'; } }
    if (I.pressed('confirm') || I.pressed('tDown')) { this.play(); } if (I.pressed('tLeft')) this.slow = !this.slow; if (I.pressed('tUp')) this.boxes = !this.boxes;
    if (I.pressed('cancel')) { I.consumeAll(); KC.game.go('dojoMenu'); return; }
    const steps = this.slow ? (Math.floor(this.t * 120) % 4 === 0 ? 1 : 0) : Math.max(1, Math.round(dt * 120));
    for (let k = 0; k < steps; k++) { if (this.me.tech) this.me.step(this.dum, null); }
    this.me.update(dt, this.dum); this.dum.update(dt, this.me); if (!this.me.tech && this.t % 3 < dt) this.play();
  },
  draw(r) {
    this.stage.draw(r); this.me.draw(r); this.dum.draw(r); const t = this.cur(), f = this.me.fr || t.f.map(v => v * 2);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.panel(g, 6, 6, W - 12, 62, { alpha: .85 }); KC.title(g, 'TECHNIQUE LAB', W / 2, 9, 1);
      KC.text(g, (this.i + 1) + '/15  ' + t.name + '  (' + t.jp + ')', 12, 24, '#ffd060'); KC.text(g, 'STARTUP ' + (f[0] >> 1) + '  ACTIVE ' + (f[1] >> 1) + '  RECOVERY ' + (f[2] >> 1) + ' FRAMES   ' + up(t.height) + (t.unblockable ? '  UNBLOCKABLE' : ''), 12, 35, '#fff');
      KC.text(g, 'TABLE REACH ' + t.reach.join('-') + ' + TRAVEL ' + t.travel + '   MEASURED CONTACT GAP ' + this.gaps[t.id], 12, 46, '#9ad8ff'); KC.text(g, 'POINTS ' + t.pts.join('-') + (t.full ? '  FULL' : '  HALF') + '   EDIT: ' + ['STARTUP', 'ACTIVE', 'RECOVERY', 'MAX REACH'][this.fld || 0] + ' (UP/DOWN, LEFT/RIGHT)  START = COPY JSON ' + (this.note || ''), 12, 57, '#ffe8a0');
      if (this.boxes) for (const q of [this.me, this.dum]) { const [sx, sy] = r.w(q.x, 0, q.z); px.rect(g, Math.round(sx - 9), Math.round(sy - 64), 18, 1, '#44ff88'); px.rect(g, Math.round(sx - 9), Math.round(sy), 18, 1, '#44ff88'); px.rect(g, Math.round(sx - 9), Math.round(sy - 64), 1, 64, '#44ff88'); px.rect(g, Math.round(sx + 9), Math.round(sy - 64), 1, 64, '#44ff88'); }
    });
    KC.promptBar(r, [['confirm', 'REPLAY'], ['cancel', 'BACK']]);
  }
});
