/* 52-exhibition: Beach Match. Four columns (Left 1, Left 2, Right 1, Right 2), each a fighter on a pedestal and who
 * plays it: CPU or P1-P4. Players join with Start or Cross on a free pad, or 2 on the keyboard (the split halves). Each
 * player moves her badge between slots (left/right), picks a fighter (up/down), an outfit (Square / F), and readies
 * (Cross / Enter). Player 1 also sets the options (Triangle / R toggles to them). Any mix works: 1P with a CPU partner,
 * co-op, versus, 2v2, three players. */
G.EXH = { opts: { points: 7, sets: 1, diff: 'Normal', time: 'Sunset', cam: 'Broadcast' } };
const EX_POINTS = [7, 11, 15, 21], EX_TIMES = ['Morning', 'Sunset', 'Night'], EX_DIFF = ['Easy', 'Normal', 'Hard', 'Pro'];
G.exFighters = () => G.FIGHTERS.concat(G.unlocks && G.unlocks.finished ? ['sonny', 'pepper'] : []);
G.exSuits = id => {
  const c = G.CAST[id]; if (c.host) return [null];
  const owned = (G.unlocks && G.unlocks.suits) || [], all = G.unlocks && G.unlocks.finished;
  return [c.suit].concat(G.SUIT_IDS.filter(s => s !== c.suit && (all || owned.includes(s))));
};
G.scenes.exhibition = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter(d) {
    G.useInput('MENU'); G.applyLight('afternoon'); G.music('island'); G.game.setZoom(1.1); G.themeName = 'day';
    const prev = this.slots;
    this.slots = prev && d && d.keep ? prev : [0, 1, 2, 3].map(i => ({ cast: G.FIGHTERS[[4, 1, 0, 5][i]], suit: 0, who: null, rig: null }));
    if (!(d && d.keep)) this.slots[0].who = 1;
    this.ready = {}; this.mode = {}; this.optI = 0; this.t = 0; this.joined = new Set([1]);
    for (const s of this.slots) s.rig = G.makeRig(s.cast, { suit: G.exSuits(s.cast)[s.suit] });
    G.game.allowJoin({ max: 4, onJoin: (I, n) => { I.glyphs = G.setting('glyphs', 'playstation'); I.use(I.half ? E.Input.halfKeys(G.PRESETS.MENU, I.half) : G.PRESETS.MENU); const free = this.slots.find(s => !s.who); if (free) free.who = n; this.joined.add(n); G.sfx('ui_select'); } });   // (the engine's own note says who joined; the column's badge and prompts show where and on what)
  },
  exit() { G.game.allowJoin(false); G.game.setZoom(1); },
  inputOf(n) { return G.game.players.find(I => (I.player || 1) === n) || (n === 1 ? G.game.input : null); },
  slotOf(n) { return this.slots.findIndex(s => s.who === n); },
  setFighter(si, dir) { const s = this.slots[si], L = G.exFighters(); s.cast = L[(L.indexOf(s.cast) + dir + L.length) % L.length]; s.suit = 0; s.rig = G.makeRig(s.cast, { suit: G.exSuits(s.cast)[0] }); },
  setSuit(si) { const s = this.slots[si], L = G.exSuits(s.cast); s.suit = (s.suit + 1) % L.length; s.rig = G.makeRig(s.cast, { suit: L[s.suit] }); },
  optItems() {
    const W = G.game.W, H = G.game.H, o = G.EXH.opts, y = Math.round(H * .78), w = 74, x0 = Math.round(W / 2 - (w * 5 + 16) / 2);
    const L = [['Points', o.points, () => { o.points = EX_POINTS[(EX_POINTS.indexOf(o.points) + 1) % 4]; }], ['Sets', o.sets === 1 ? '1 set' : 'Best of 3', () => { o.sets = o.sets === 1 ? 3 : 1; }], ['CPU', o.diff, () => { o.diff = EX_DIFF[(EX_DIFF.indexOf(o.diff) + 1) % 4]; }], ['Court', o.time, () => { o.time = EX_TIMES[(EX_TIMES.indexOf(o.time) + 1) % 3]; }], ['Camera', o.cam === 'Broadcast' ? 'Broadcast' : 'Serve Cam', () => { o.cam = o.cam === 'Broadcast' ? 'Serve Cam' : 'Broadcast'; }]];
    return L.map(([k, v, f], i) => ({ id: 'o' + i, x: x0 + i * (w + 4), y, w, h: 24, label: k, value: String(v), onPress: f }));
  },
  colRect(i) { const W = G.game.W, H = G.game.H, cw = Math.round(W * .2), gap = Math.round(W * .02), x0 = Math.round(W / 2 - (cw * 4 + gap * 3 + 16) / 2) + (i >= 2 ? 16 : 0); return { x: x0 + i * (cw + gap), y: Math.round(H * .18), w: cw, h: Math.round(H * .52) }; },
  update(dt) {
    this.t += dt;
    for (const s of this.slots) G.Anim.idle(s.rig, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + Math.sin(this.t + s.cast.length) * .4, pose: this.ready[s.who] ? 'cheer' : null, expr: this.ready[s.who] ? 'smile' : null });
    const P1 = this.inputOf(1);
    // the mouse: click a column to move P1 there, click an option to change it
    const c = P1 && P1.clicked();
    if (c) {
      for (const it of this.optItems()) if (c[0] >= it.x && c[0] < it.x + it.w && c[1] >= it.y && c[1] < it.y + it.h) { it.onPress(); G.sfx('ui_select'); }
      for (let i = 0; i < 4; i++) { const R = this.colRect(i); if (c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h) { if (this.slots[i].who === 1) { if (c[1] < R.y + R.h * .55) this.setFighter(i, 1); else this.setSuit(i); } else if (!this.slots[i].who) { const cur = this.slotOf(1); if (cur >= 0) this.slots[cur].who = null; this.slots[i].who = 1; } G.sfx('ui_tick'); } }
      const sb = this.startRect; if (sb && c[0] >= sb.x && c[0] < sb.x + sb.w && c[1] >= sb.y && c[1] < sb.y + sb.h) this.ready[1] = true;
    }
    if (P1 && G.wheel && this.slotOf(1) >= 0) this.setFighter(this.slotOf(1), G.wheel > 0 ? 1 : -1);
    for (const n of this.joined) {
      const I = this.inputOf(n); if (!I) continue;
      const si = this.slotOf(n), rep = a => I.repeat(a, .35, .12);
      if (n === 1 && I.pressed('extra')) { this.mode[1] = this.mode[1] === 'opts' ? 'slot' : 'opts'; G.sfx('ui_tab'); continue; }
      if (n === 1 && this.mode[1] === 'opts') {
        if (rep('left')) { this.optI = (this.optI + 4) % 5; G.sfx('ui_tick'); }
        if (rep('right')) { this.optI = (this.optI + 1) % 5; G.sfx('ui_tick'); }
        if (I.pressed('confirm') || rep('up') || rep('down')) { this.optItems()[this.optI].onPress(); G.sfx('ui_select'); }
        if (I.pressed('cancel')) this.mode[1] = 'slot';
        continue;
      }
      if (this.ready[n]) { if (I.pressed('cancel')) { this.ready[n] = false; G.sfx('ui_back'); } continue; }
      const goL = rep('left'), goR = rep('right');
      if (goL || goR) {
        const dir = goL ? -1 : 1; let k = si;
        for (let step = 0; step < 4; step++) { k = (k + dir + 4) % 4; if (!this.slots[k].who) break; }
        if (!this.slots[k].who) { this.slots[si].who = null; this.slots[k].who = n; G.sfx('ui_tick'); }
      }
      if (rep('up')) { this.setFighter(this.slotOf(n), -1); G.sfx('ui_tick'); }
      if (rep('down')) { this.setFighter(this.slotOf(n), 1); G.sfx('ui_tick'); }
      if (I.pressed('alt')) { this.setSuit(this.slotOf(n)); G.sfx('ui_tick'); }
      if (I.pressed('confirm')) { this.ready[n] = true; G.sfx('ui_select'); G.voice.say(G.pickLine(this.slots[this.slotOf(n)].cast, 'bark') || 'Yes!', this.slots[this.slotOf(n)].cast, 'happy'); }
      if (I.pressed('cancel') && n === 1) { G.sfx('ui_back'); G.dropPlayers(); G.game.go('menu'); return; }
      if (I.pressed('cancel') && n > 1) { const p = G.game.players.find(q => q.player === n); this.slots[si].who = null; this.joined.delete(n); if (p) G.game.removePlayer(p); G.sfx('ui_back'); }
    }
    if ([...this.joined].every(n => this.ready[n])) this.start();
  },
  start() {
    const o = G.EXH.opts, teams = [[], []];
    this.slots.forEach((s, i) => {
      const side = i < 2 ? 0 : 1, I = s.who ? this.inputOf(s.who) : null;
      teams[side].push({ cast: s.cast, suit: G.exSuits(s.cast)[s.suit], ctl: I ? { kind: 'human', input: I } : { kind: 'ai' }, skill: G.DAY_SKILL.exhibition, kit: G.CAST[s.cast].host ? 'final' : null });
    });
    const tod = o.time === 'Night' ? 'night' : o.time === 'Morning' ? 'morning' : 'sunset';
    G.game.allowJoin(false);
    G.startMatch({ mode: 'exhibition', teams, pointsToWin: o.points, sets: o.sets, difficulty: o.diff, tod, camera: o.cam, seed: G.hashStr(JSON.stringify(this.slots.map(s => s.cast)) + Date.now() % 100000),
      onResults: (M, res) => G.resultsUI(M, res, { buttons: [['Rematch', () => G.startMatch(Object.assign({}, M.cfg, { seed: M.seed + 1 }))], ['Change setup', () => G.game.go('exhibition', { keep: true })], ['Title', () => { G.dropPlayers(); G.game.go('title'); }]] }) });
  },
  draw(r) {
    G.titleWorld.draw(r, { tod: 'afternoon' });
    r.overlay(g => {
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#183040'));
      G.ui.title(g, 'BEACH MATCH', r.W / 2, Math.round(r.H * .04), { scale: 2 });
      E.font.text(g, 'Join: Start or ' + (G.dev() === 'kbm' ? 'Enter' : G.btnName('confirm')) + ' on a free controller, or 2 on the keyboard', r.W / 2, Math.round(r.H * .04) + 18, '#9fd3d6', { align: 'center', shadow: '#000', outline: false });
      this.slots.forEach((s, i) => {
        const R = this.colRect(i), I = s.who ? this.inputOf(s.who) : null, col = s.who ? E.PLAYER_COLORS[s.who - 1] : '#8a94b0', c = G.CAST[s.cast];
        G.ui.panel(g, R.x, R.y, R.w, R.h, { alpha: .88, border: s.who ? col : '#3a5a62', title: (i < 2 ? 'LEFT ' : 'RIGHT ') + (i % 2 + 1) });
        const cx = R.x + R.w / 2, py = R.y + Math.round(R.h * .68);
        px.ell(g, cx, py + 2, 22, 6, '#0a2d3d'); px.ell(g, cx, py, 20, 5, col); px.ell(g, cx, py - 1, 16, 3, E.shade(col, .3));
        s.rig.draw(g, cx, py, E.VIEWS.court);
        E.font.text(g, c.name, cx, py + 9, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
        const suit = G.exSuits(s.cast)[s.suit]; E.font.text(g, G.fit(suit ? G.SUITS[suit].name : 'Match kit', R.w - 8), cx, py + 18, '#9fd3d6', { align: 'center', outline: false });
        // the controller badge
        const label = s.who ? 'P' + s.who : 'CPU', bw = E.font.width(label) + 12;
        E.ui.box(g, Math.round(cx - bw / 2), R.y + 10, bw, 12, { bg: s.who ? [col, E.shade(col, -.3)] : ['#3a3656', '#24203a'], border: '#fff8e8', alpha: 1 });
        E.font.text(g, label, cx, R.y + 12, '#fff8e8', { align: 'center', outline: false });
        if (s.who && this.ready[s.who]) { G.icon(g, 'check', cx + bw / 2 + 2, R.y + 13); E.font.text(g, 'READY', cx, R.y + 26, '#9ff3a8', { align: 'center', shadow: '#000', outline: false }); }
        else if (s.who && I) { let yy = R.y + 26; for (const [a, t] of [['move', 'Fighter'], ['alt', 'Outfit'], ['confirm', 'Ready']]) { const w = G.promptW(a, t, { input: I }); G.prompt(g, Math.round(cx - w / 2), yy, a, t, { input: I }); yy += 12; } }
        if (s.who && I && I.half) {   // the match's keys on this half, under the column two to a line (read from the match preset as the halves get it)
          const M = E.Input.halfKeys(G.PRESETS.MATCH, I.half), k = a => I.codeLabel((M[a] || []).find(c => !c.startsWith('Pad')) || '');
          [[['play', 'hit'], ['dive', 'dive']], [['shot', 'shot'], ['call', 'call']]].forEach((row, j) => E.font.text(g, row.map(([a, w]) => k(a) + ' ' + w).join(' · '), cx, R.y + R.h + 2 + j * 9, '#ffd36a', { align: 'center', shadow: '#000', outline: false }));
        }
        if (!s.who) { const bob = Math.sin(G.now() * 3) > 0; E.font.text(g, bob ? 'Press Start' : 'to join', cx, R.y + 28, '#8a94b0', { align: 'center', outline: false }); }
      });
      E.font.text(g, 'VS', r.W / 2, this.colRect(1).y + Math.round(this.colRect(1).h * .4), '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false });
      const its = this.optItems(), om = this.mode[1] === 'opts';
      its.forEach((it, i) => { E.ui.box(g, it.x, it.y, it.w, it.h, { bg: ['#174a5a', '#0c2e3a'], border: om && this.optI === i ? '#ffd36a' : '#5a8a92', alpha: .95 }); E.font.text(g, it.label, it.x + it.w / 2, it.y + 3, '#9fd3d6', { align: 'center', outline: false }); E.font.text(g, '◀ ' + it.value + ' ▶', it.x + it.w / 2, it.y + 13, '#fff8e8', { align: 'center', outline: false }); if (om && this.optI === i) G.ui.focus(g, it.x, it.y, it.w, it.h); });
      const I1 = this.inputOf(1);
      this.startRect = { x: Math.round(r.W / 2 - 50), y: Math.round(r.H * .9) - 6, w: 100, h: 14 };
      G.promptBar(g, r, [['extra', om ? 'Back to fighters' : 'Options'], ['confirm', om ? 'Change' : 'Ready'], ['cancel', 'Back']], { input: I1 });
    });
  }
};
/** players 2-4 leave (back to one player) */
G.dropPlayers = () => { const P = G.game.players; while (P.length > 1) G.game.removePlayer(P[P.length - 1]); };
