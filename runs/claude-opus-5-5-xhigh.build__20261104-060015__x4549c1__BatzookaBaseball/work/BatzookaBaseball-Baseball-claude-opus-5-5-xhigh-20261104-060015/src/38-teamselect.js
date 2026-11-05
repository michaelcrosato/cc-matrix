/* =============================================================================
 * 38-teamselect: Exhibition setup. Two big team cards (away left, home right)
 * with the captain's rig turning, three stat stars and the park; rows for the
 * park, innings and difficulty; and the join row: Start on a free pad (or 2 on
 * the keyboard) joins, each player moves their card to a side (left away, right
 * home, middle CPU-only... a side with no humans is the CPU).
 * ========================================================================== */
BZ.scenes.teamSelect = {
  enter() {
    const g = BZ.game, unlocked = BZ.tour ? BZ.tour.unlocked() : { teams: [], parks: [] };
    this.teams = BZ.ids('teams').filter(id => !BZ.get('teams', id).hidden && (!BZ.get('teams', id).boss || unlocked.all));
    this.parks = BZ.PARK_ORDER.filter(id => !BZ.get('parks', id).locked || unlocked.all);
    this.away = this.teams.indexOf('krakens'); this.home = this.teams.indexOf('comets');
    this.park = 0; this.inn = [1, 3, 5, 9].indexOf(g.settings.innings || 3); if (this.inn < 0) this.inn = 1;
    this.diff = BZ.LEVEL_IDS.indexOf(g.settings.difficulty || 'pro');
    this.row = 0; this.t = 0;
    this.slots = [{ input: g.input, side: 0 }];   // players: their input and side (0 away, 1 home)
    g.allowJoin({ max: 4, onJoin: (inp) => { this.slots.push({ input: inp, side: this.slots.length % 2 }); BZ.sfx('coin'); } });
    BZ.music('menu'); BZ.idle = 0;
  },
  exit() { BZ.game.allowJoin(false); },
  rows() { return ['away', 'home', 'park', 'innings', 'difficulty', 'players', 'play']; },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && this.slots.length === 1 && !BZ.hubActive) { BZ.attract.start(); return; }
    const I = g.input, rows = this.rows();
    // each joined player moves their own card with left / right; player 1 runs the menu
    for (const s of this.slots.slice(1)) { if (s.input.pressed('left')) { s.side = 0; BZ.sfx('select'); } if (s.input.pressed('right')) { s.side = 1; BZ.sfx('select'); } if (s.input.pressed('cancel')) { g.removePlayer(s.input); this.slots = this.slots.filter(q => q !== s); BZ.sfx('cancel'); } }
    if (I.repeat('down')) { this.row = (this.row + 1) % rows.length; BZ.sfx('select'); }
    if (I.repeat('up')) { this.row = (this.row + rows.length - 1) % rows.length; BZ.sfx('select'); }
    const lr = I.repeat('right') ? 1 : I.repeat('left') ? -1 : 0, r = rows[this.row];
    if (lr) {
      BZ.sfx('select');
      if (r === 'away') this.away = (this.away + lr + this.teams.length) % this.teams.length;
      if (r === 'home') this.home = (this.home + lr + this.teams.length) % this.teams.length;
      if (r === 'park') this.park = (this.park + lr + this.parks.length) % this.parks.length;
      if (r === 'innings') this.inn = (this.inn + lr + 4) % 4;
      if (r === 'difficulty') this.diff = (this.diff + lr + 4) % 4;
      if (r === 'players') this.slots[0].side = lr > 0 ? 1 : 0;
    }
    // the mouse: hover picks the row, click on the arrows changes it, click PLAY plays
    if (I.lastDevice === 'mouse' && this.rects && !BZ.touchOnly) {
      const p = I.pointer(), c = I.clicked();
      this.rects.forEach((rc, k) => { if (p && p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) this.row = k; });
      if (c) this.rects.forEach((rc, k) => { if (c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3]) { if (rows[k] === 'play') this.play(); else { const dir = c[0] > rc[0] + rc[2] / 2 ? 1 : -1; this.row = k; this.click = dir; } } });
      if (this.click) { const d = this.click; this.click = 0; const rr = rows[this.row]; if (rr === 'away') this.away = (this.away + d + this.teams.length) % this.teams.length; if (rr === 'home') this.home = (this.home + d + this.teams.length) % this.teams.length; if (rr === 'park') this.park = (this.park + d + this.parks.length) % this.parks.length; if (rr === 'innings') this.inn = (this.inn + d + 4) % 4; if (rr === 'difficulty') this.diff = (this.diff + d + 4) % 4; if (rr === 'players') this.slots[0].side = d > 0 ? 1 : 0; }
    }
    if ((I.pressed('confirm') || I.pressed('south')) && !(I.held && I.held.has && I.held.has('Mouse0'))) { if (r === 'play' || I.pressed('start')) this.play(); else { this.row = rows.length - 1; BZ.sfx('select'); } }
    if (I.pressed('start') && r !== 'play') this.play();
    if (I.pressed('cancel') || I.pressed('east')) { BZ.sfx('cancel'); g.go('title'); }
  },
  play() {
    const g = BZ.game, humans = { 0: [], 1: [] };
    for (const s of this.slots) humans[s.side].push(s.input);
    g.settings.set('innings', [1, 3, 5, 9][this.inn]); g.settings.set('difficulty', BZ.LEVEL_IDS[this.diff]);
    const data = { mode: 'exhibition', away: this.teams[this.away], home: this.teams[this.home], park: this.parks[this.park], innings: [1, 3, 5, 9][this.inn], difficulty: BZ.LEVEL_IDS[this.diff], cpuLevel: BZ.LEVEL_IDS[this.diff], humans, seed: (Date.now() & 0xfffff), mercy: g.settings.mercy !== false };
    BZ.sfx('confirm');
    BZ.startMatch(data);
  },
  draw(r) {
    BZ.menuBg(r, this.t);
    const g0 = BZ.game, rows = this.rows();
    r.overlay(g => {
      E.font.title(g, 'EXHIBITION', r.W / 2, 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
      const cw = Math.min(150, (r.W - 30) / 2), cy = 24, ch = 78;
      [this.away, this.home].forEach((ti, side) => {
        const T = BZ.get('teams', this.teams[ti]), x = Math.round(r.W / 2 + (side ? 6 : -6 - cw)), sel = this.row === side;
        E.ui.box(g, x, cy, cw, ch, { bg: [T.colors[0], E.shade(T.colors[0], -.5)], border: sel ? '#fff6c0' : '#5a6aa0' });
        E.font.text(g, side ? 'HOME' : 'AWAY', x + 6, cy + 4, '#ffffff', { shadow: '#000' });
        E.font.text(g, T.nick, x + cw / 2, cy + 16, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
        E.font.text(g, T.city.toUpperCase(), x + cw / 2, cy + 31, '#e0e8ff', { align: 'center', shadow: '#000' });
        const rig = BZ.rigFor(T.captain, 'bench'); if (rig && BZ.cosmetic) { rig.facing = this.t * 1.5; rig.drawPortrait(g, x + 6, cy + 42, 32, { zoom: 1.8, turn: Math.sin(this.t) * .8, frame: true }); }
        ['POWER', 'SPEED', 'PITCH'].forEach((s, k) => { E.font.text(g, s, x + 46, cy + 43 + k * 10, '#ffffff', { shadow: '#000' }); E.font.text(g, '★'.repeat(T.stars[k]) + '·'.repeat(5 - T.stars[k]), x + 86, cy + 43 + k * 10, '#ffd040', { shadow: '#000' }); });
        if (sel) { E.font.text(g, '◂', x - 7, cy + ch / 2, '#fff6c0'); E.font.text(g, '▸', x + cw + 3, cy + ch / 2, '#fff6c0'); }
      });
      this.rects = [[r.W / 2 - 6 - cw, cy, cw, ch], [r.W / 2 + 6, cy, cw, ch]];
      const opts = [['PARK', BZ.get('parks', this.parks[this.park]).name.toUpperCase()], ['INNINGS', String([1, 3, 5, 9][this.inn])], ['DIFFICULTY', BZ.LEVELS[BZ.LEVEL_IDS[this.diff]].name]];
      let y = cy + ch + 5;
      opts.forEach(([k, v], i) => { const sel = this.row === i + 2, w = 220, x = Math.round(r.W / 2 - w / 2); E.ui.box(g, x, y, w, 16, { bg: sel ? ['#ffb030', '#c8501a'] : ['#2a3460', '#141a34'], border: sel ? '#fff6c0' : '#5a6aa0' }); E.font.text(g, k, x + 6, y + 4, sel ? '#1a0a00' : '#a8b8e8'); E.font.text(g, '◂ ' + v + ' ▸', x + w - 6, y + 4, sel ? '#1a0a00' : '#ffffff', { align: 'right' }); this.rects.push([x, y, w, 16]); y += 18; });
      // the players: a card each in their color, on their side
      const sel = this.row === 5, w = 152, x = Math.round(r.W / 2 - 110);
      E.ui.box(g, x, y, w, 24, { bg: sel ? ['#3a2a60', '#1a1030'] : ['#1a2040', '#0a0e1c'], border: sel ? '#fff6c0' : '#5a6aa0' }); this.rects.push([x, y, w, 24]);
      E.font.text(g, 'AWAY', x + 6, y + 8, '#a8b8e8'); E.font.text(g, 'HOME', x + w - 6, y + 8, '#a8b8e8', { align: 'right' });
      this.slots.forEach((s, k) => { const sx = s.side ? x + w / 2 + 12 + (k >> 1) * 22 : x + w / 2 - 34 - (k >> 1) * 22; E.ui.box(g, sx, y + 4, 20, 16, { bg: E.PLAYER_COLORS[(s.input.player - 1) % 4], border: '#ffffff' }); E.font.text(g, 'P' + s.input.player, sx + 10, y + 8, '#ffffff', { align: 'center', shadow: '#000' }); });
      const ps = this.row === 6, bx = Math.round(r.W / 2 + 46); E.ui.box(g, bx, y, 64, 24, { bg: ps ? ['#ffb030', '#c8501a'] : ['#2a6a3a', '#143a1a'], border: '#fff6c0' }); E.font.text(g, 'PLAY BALL!', bx + 32, y + 8, ps ? '#1a0a00' : '#ffffff', { align: 'center' }); this.rects.push([bx, y, 64, 24]);
      y += 27; E.font.text(g, 'More players: Start on a controller, or 2 on the keyboard', r.W / 2, y, '#8a90b8', { align: 'center' });
      BZ.legend(g, r, [['up', 'ROW'], ['left', 'CHANGE'], ['south', 'PLAY'], ['east', 'BACK']]);
      void g0; void rows;
    });
  }
};
