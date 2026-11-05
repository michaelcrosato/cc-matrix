/* 52-exhibition: Beach Match. First the options (points, sets, difficulty, court time, camera), then the join screen:
 * four slots (Left 1, Left 2, Right 1, Right 2), each a fighter on a pedestal and who holds it (CPU or P1-P4). Players join
 * with Start on a free pad or 2 on the keyboard (the halves); each moves her badge with left / right, picks a fighter
 * with up / down, an outfit with Option, and readies with Confirm. Any mix of 1-4 players and CPUs. */
G.EXH = { points: 1, sets: 0, diff: 1, tod: 1, cam: 0 };
G.EXH_OPTS = { points: [7, 11, 15, 21], sets: [1, 3], diff: ['Easy', 'Normal', 'Hard', 'Pro'], tod: ['Morning', 'Sunset', 'Night'], cam: ['Broadcast', 'Serve Cam'] };
// the join screen's keys: two unused actions first so a keyboard half's Option lands on H (or ,), clear of its Ready key
G.INPUT.JOIN = Object.assign({ up: G.INPUT.MENU.up, down: G.INPUT.MENU.down, left: G.INPUT.MENU.left, right: G.INPUT.MENU.right, _f: [], _g: [], alt: ['KeyF', 'Pad2'] }, { start: G.INPUT.MENU.start, pause: G.INPUT.MENU.pause, confirm: G.INPUT.MENU.confirm, cancel: G.INPUT.MENU.cancel });
G.SCENES.exhibition = {
  input: G.INPUT.JOIN,
  enter(d) {
    for (const q of G.game.players.slice(1)) G.game.removePlayer(q);
    this.phase = 'opts'; this.focus = new G.Focus(); this.t = 0; G.music('sunrise'); G.UI.theme = 'day';
    this.slots = [{ who: null, f: 0, o: 0 }, { who: null, f: 1, o: 0 }, { who: null, f: 4, o: 0 }, { who: null, f: 5, o: 0 }];
    this.pl = [];   // { input, slot, ready }
    this.rigs = {};
  },
  exit() { G.game.allowJoin(false); },
  optItems() { const W = G.game.W, H = G.game.H, x = Math.round(W / 2), y = Math.round(H * .24), E2 = G.EXH, O = G.EXH_OPTS;
    return G.UI.column([{ id: 'points', label: 'Points to win', right: '◀ ' + O.points[E2.points] + ' ▶', kind: 'stepper' }, { id: 'sets', label: 'Sets', right: '◀ ' + (O.sets[E2.sets] === 1 ? 'One set' : 'Best of 3') + ' ▶', kind: 'stepper' },
      { id: 'diff', label: 'CPU difficulty', right: '◀ ' + O.diff[E2.diff] + ' ▶', kind: 'stepper' }, { id: 'tod', label: 'Court time', right: '◀ ' + O.tod[E2.tod] + ' ▶', kind: 'stepper' }, { id: 'cam', label: 'Camera', right: '◀ ' + O.cam[E2.cam] + ' ▶', kind: 'stepper' },
      { id: 'next', label: 'Choose fighters ▶' }], x, y, 220, 20, 5, { align: 'left' }); },
  suitsFor(id) { const u = G.unlocks(), all = u.done ? G.SUITS.map(s => s.id) : [G.CAST[id].suit].concat(u.suits.filter(s => s !== G.CAST[id].suit)); return all; },
  join(input) {
    if (this.pl.some(p => p.input === input)) return;
    const free = [0, 2, 1, 3].find(k => !this.slots[k].who); if (free === undefined) return;
    this.slots[free].who = input; this.pl.push({ input, slot: free, ready: false }); G.sfx('ui_select');
  },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.phase === 'opts') {
      const f = this.focus.set(this.optItems()).update();
      if (f.back) { G.go('menu'); return; }
      if (f.lr && this.focus.cur.kind === 'stepper') { const k = this.focus.cur.id, n = G.EXH_OPTS[k].length; G.EXH[k] = (G.EXH[k] + f.lr + n) % n; G.sfx('ui_tick'); }
      if (f.pick && f.pick.id === 'next') { this.phase = 'join'; this.join(I); G.game.allowJoin({ max: 4, onJoin: q => this.join(q) }); }
      return;
    }
    // the join screen: each player's own controls
    for (const p of this.pl.slice()) {
      const q = p.input, s = this.slots[p.slot];
      if (!p.ready) {
        for (const [a, d] of [['left', -1], ['right', 1]]) if (q.repeat(a, .35, .2)) { let k = p.slot; for (let n = 0; n < 4; n++) { k = (k + d + 4) % 4; if (!this.slots[k].who) break; } if (!this.slots[k].who) { this.slots[k].who = q; this.slots[k].f = s.f; s.who = null; p.slot = k; G.sfx('ui_tick'); } }
        if (q.repeat('up', .35, .15)) { s.f = (s.f + 5) % 6; s.o = 0; G.sfx('ui_tick'); } if (q.repeat('down', .35, .15)) { s.f = (s.f + 1) % 6; s.o = 0; G.sfx('ui_tick'); }
        if (q.map.alt && q.pressed('alt')) { s.o = (s.o + 1) % this.suitsFor(G.FIGHTERS[s.f]).length; G.sfx('ui_tick'); }
        if (q.pressed('confirm')) { p.ready = true; G.sfx('ui_select'); G.voice.say(G.LINES[G.FIGHTERS[s.f]].bark[0], G.FIGHTERS[s.f]); }
        if (q.pressed('cancel')) { if (q === I) { this.phase = 'opts'; G.game.allowJoin(false); this.pl = this.pl.filter(x => x.input === I); for (const sl of this.slots) if (sl.who !== I) sl.who = null; } else { s.who = null; this.pl = this.pl.filter(x => x !== p); G.game.removePlayer(q); } G.sfx('ui_back'); }
      } else if (q.pressed('cancel')) { p.ready = false; G.sfx('ui_back'); }
    }
    const c = I.clicked(); if (c) { const L = this.slotRects(); L.forEach((r, k) => { if (c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h) { const me = this.pl.find(p => p.input === I); if (me && !me.ready) { const s = this.slots[me.slot]; if (k === me.slot) { me.ready = true; G.sfx('ui_select'); } else if (!this.slots[k].who) { this.slots[k].who = I; this.slots[k].f = s.f; s.who = null; me.slot = k; } } } }); }
    if (this.pl.length && this.pl.every(p => p.ready)) this.start();
  },
  start() {
    const used = new Set(this.slots.filter(s => s.who).map(s => s.f)), teams = [[], []], cpuPick = G.rshuffle('cosmetic', [0, 1, 2, 3, 4, 5].filter(f => !used.has(f)));
    this.slots.forEach((s, k) => {
      let f = s.f; if (!s.who) { f = cpuPick.length ? cpuPick.shift() : f; }
      const id = G.FIGHTERS[f], suits = this.suitsFor(id), suit = s.who ? suits[s.o % suits.length] : G.CAST[id].suit, p = s.who ? this.pl.find(x => x.input === s.who) : null;
      teams[k < 2 ? 0 : 1].push({ id, suit, acc: G.CAST[id].acc, input: s.who || null, base: .55, color: s.who ? s.who.color : null, name: s.who ? (s.who.name || 'P1') + ' ' + G.CAST[id].short : G.CAST[id].short, seat: p ? this.pl.indexOf(p) : null });
    });
    const tod = ['morning', 'sunset', 'night'][G.EXH.tod];
    const cfg = { mode: 'exhibition', teams, pointsToWin: G.EXH_OPTS.points[G.EXH.points], setsToWin: G.EXH_OPTS.sets[G.EXH.sets] === 3 ? 2 : 1, difficulty: G.EXH_OPTS.diff[G.EXH.diff], tod, weather: 'sunny', cam: G.EXH.cam ? 'servecam' : 'court', title: 'BEACH MATCH', subtitle: teams[0].map(p => G.CAST[p.id].short).join(' & ') + '  vs  ' + teams[1].map(p => G.CAST[p.id].short).join(' & ') };
    G.game.allowJoin(false);
    G.startMatch(cfg);
  },
  slotRects() { const W = G.game.W, H = G.game.H, cw = Math.round(W * .2), x0 = Math.round(W / 2 - (cw * 4 + 18) / 2), y = Math.round(H * .16), h = Math.round(H * .62); return [0, 1, 2, 3].map(k => ({ x: x0 + k * (cw + 6), y, w: cw, h })); },
  draw(r) {
    G.backdrop(['morning', 'sunset', 'night'][G.EXH.tod]).draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.title(g, 'BEACH MATCH', W / 2, Math.round(H * .03), { scale: 2 });
      if (this.phase === 'opts') { G.UI.panel(g, Math.round(W / 2) - 124, Math.round(H * .2), 248, Math.round(H * .6)); this.optItems().forEach((it, k) => G.UI.button(g, it, k === this.focus.i)); return; }
      const R = this.slotRects();
      R.forEach((rc, k) => {
        const s = this.slots[k], id = G.FIGHTERS[s.f], p = s.who ? this.pl.find(x => x.input === s.who) : null, side = k < 2 ? 'LEFT' : 'RIGHT';
        E.ui.box(g, rc.x, rc.y, rc.w, rc.h, { bg: k < 2 ? ['#1f5a8c', '#0a2d4d'] : ['#8c3a1f', '#4d1a0a'], border: s.who ? s.who.color || '#ffd36a' : '#5a6a70' });
        E.font.text(g, side + ' ' + (k % 2 + 1), rc.x + rc.w / 2, rc.y + 4, '#fff8e8', { align: 'center', outline: false });
        if (s.who) {
          const key = id + ':' + s.o; if (!this.rigs[k] || this.rigs[k].key !== key) { const suits = this.suitsFor(id); this.rigs[k] = G.anim.rig(G.makeRig(id, { suit: suits[s.o % suits.length], size: 1.9 })); this.rigs[k].key = key; }
          const rig = this.rigs[k]; rig.vb = p && p.ready ? { kind: 'fistpump', u: (this.t % 1.2) / 1.2, w: 1 } : null; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + Math.sin(this.t + k) * .4, expr: p && p.ready ? 'smile' : null });
          px.ell(g, rc.x + rc.w / 2, rc.y + rc.h - 44, 22, 5, '#0a1a22'); rig.draw(g, rc.x + rc.w / 2, rc.y + rc.h - 44, G.VIEW_COURT);
          E.font.text(g, G.CAST[id].short, rc.x + rc.w / 2, rc.y + rc.h - 36, '#ffd36a', { align: 'center', outline: false });
          const suits = this.suitsFor(id); E.font.text(g, G.ITEMS[suits[s.o % suits.length]].name, rc.x + rc.w / 2, rc.y + rc.h - 26, '#fff8e8', { align: 'center', outline: false });
          E.ui.box(g, rc.x + rc.w / 2 - 20, rc.y + 16, 40, 12, { bg: s.who.color || '#4a8aff', border: '#ffffff', gradient: false }); E.font.text(g, s.who.name || 'P1', rc.x + rc.w / 2, rc.y + 18, '#ffffff', { align: 'center', outline: false });
          E.font.text(g, p && p.ready ? 'READY!' : '↑↓ fighter  ◀▶ slot', rc.x + rc.w / 2, rc.y + rc.h - 14, p && p.ready ? '#7cff5a' : '#9fd3d6', { align: 'center', outline: false });
          if (p && !p.ready) { G.drawGlyph(g, rc.x + 4, rc.y + rc.h - 54, G.codeFor('alt', s.who), s.who); E.font.text(g, 'outfit', rc.x + 16, rc.y + rc.h - 53, '#fff8e8', { outline: false }); }
        } else { E.font.text(g, 'CPU', rc.x + rc.w / 2, rc.y + rc.h / 2 - 10, '#9fd3d6', { align: 'center', scale: 2, outline: false }); E.font.text(g, 'To join: Start', rc.x + rc.w / 2, rc.y + rc.h / 2 + 10, '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'on a pad, or 2', rc.x + rc.w / 2, rc.y + rc.h / 2 + 20, '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'on the keyboard', rc.x + rc.w / 2, rc.y + rc.h / 2 + 30, '#fff8e8', { align: 'center', outline: false }); }
      });
      // the split keyboard, as keycaps
      if (this.pl.some(p => p.input.half)) { const y = Math.round(H * .8); E.font.text(g, 'Keyboard P1: WASD move • F hit • G dive • H shot • R call', W / 2, y, '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'Keyboard P2: arrows move • . hit • / dive • , shot • L call', W / 2, y + 10, '#fff8e8', { align: 'center', outline: false }); }
    });
    if (this.phase === 'opts') G.promptBar(r, [['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]);
    else G.promptBar(r, [['confirm', 'Ready'], ['alt', 'Outfit'], ['cancel', 'Back']]);
  }
};
