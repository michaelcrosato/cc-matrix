/* ---- MODES: the Mega Cup (hub, story, saves), the join screen, Exhibition's setup, the Training Ground, results ---- */
TT.cup = null;
TT.cupSaved = () => { if (TT.cfg.session) return false; const s = E.store.get('thugby:cup', null); return !!(s && typeof s.round === 'number' && s.round < 4); };
TT.cupNew = () => { TT.cup = { round: 0, results: [], seeds: [], difficulty: TT.settings.difficulty || 'Pro', trained: false }; TT.cupSave(); };
TT.cupLoad = () => { const s = E.store.get('thugby:cup', null); TT.cup = s && typeof s.round === 'number' && Array.isArray(s.results) ? s : null; if (!TT.cup) TT.cupNew(); };
TT.cupSave = () => { if (TT.cfg.session || !TT.cup) return; try { E.store.set('thugby:cup', TT.cup); } catch (e) { /* blocked */ } };
TT.unlocks = () => E.store.get('thugby:unlocks', {}) || {};
TT.unlock = k => { const u = TT.unlocks(); u[k] = true; if (!TT.cfg.session) E.store.set('thugby:unlocks', u); };
TT.seatsJoined = null;   // the seats picked on the join screen (kept for the cup's matches and rematches)
TT.cupMatch = () => {
  const r = TT.CUP[TT.cup.round]; if (!r) return;
  const seats = (TT.seatsJoined || [{ input: TT.game.input, team: 0 }]).map(s => Object.assign({}, s, { team: 0 }));
  TT.game.go('match', { home: 'mud', away: r.opp, venue: r.venue, cup: r.id, suddenDeath: true, seats, seed: (Date.now() & 0xffff) + TT.cup.round });
};

/* ---- the cup hub: four rounds as big cards; play, train, the team sheet ---- */
TT.scenes.cup = Object.assign({}, FRONT, {
  enter() {
    if (!TT.cup) TT.cupLoad();
    TT.bg.ensure('park'); TT.audio.music('title'); this.sheet = -1;
    this.menu = new TT.ui.BigMenu([
      { id: 'play', label: () => TT.cup.round < 4 ? 'PLAY ' + TT.CUP[TT.cup.round].name : 'CUP WON!', disabled: TT.cup.round >= 4 },
      { id: 'players', label: 'PLAYERS (CO-OP)' }, { id: 'train', label: 'TRAINING GROUND' }, { id: 'sheet', label: 'TEAM SHEET' }, { id: 'back', label: 'MAIN MENU' }],
    { y: 126, w: 200, rowH: 17, scale: 1, onPick: (i, it) => this.pick(it.id), onCancel: () => TT.game.go('menu') });
  },
  pick(id) {
    const g = TT.game;
    if (id === 'play') g.go('story', { id: TT.CUP[TT.cup.round].id, next: 'cupMatch' });
    else if (id === 'players') g.go('join', { mode: 'cup' });
    else if (id === 'train') g.go('training', { cup: true });
    else if (id === 'sheet') { this.sheet = 0; }
    else g.go('menu');
  },
  update(dt) {
    TT.bg.step(dt);
    const g = TT.game, P = g.players;
    if (this.sheet >= 0) {
      if (P.some(I => I.repeat('right'))) this.sheet = (this.sheet + 1) % 7; if (P.some(I => I.repeat('left'))) this.sheet = (this.sheet + 6) % 7;
      if (P.some(I => I.pressed('cancel') || I.pressed('confirm'))) { P.forEach(I => I.consumeAll()); this.sheet = -1; }
      return;
    }
    this.menu.update(dt);
  },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, 'THE MEGA CUP', W / 2, 6, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd040', '#ff8a20'] });
      const cw = Math.min(96, Math.floor((W - 30) / 4));
      TT.CUP.forEach((c, i) => {
        const x = Math.round(W / 2 - 2 * (cw + 4) + i * (cw + 4)), y = 34, t = TT.teamById(c.opp), res = TT.cup.results[i], next = i === TT.cup.round, locked = i > TT.cup.round;
        E.ui.box(g, x, y, cw, 88, { bg: next ? ['#3a3010', '#1a1408'] : ['#1a2238', '#0c1020'], border: next ? '#ffe060' : '#4a5470', alpha: .94 });
        E.font.text(g, c.name, x + cw / 2, y + 5, '#ffe08a', { align: 'center', font: 'tiny', outline: false });
        if (!locked) TT.drawCrest(g, t, x + cw / 2, y + 30, 2); else E.font.text(g, '?', x + cw / 2, y + 22, '#5a6078', { align: 'center', scale: 2, outline: false });
        E.font.text(g, locked ? '???' : t.short, x + cw / 2, y + 48, '#ffffff', { align: 'center', outline: false });
        E.font.text(g, TT.venueById(c.venue).name, x + cw / 2, y + 58, '#a8b0c8', { align: 'center', font: 'tiny', outline: false, wrap: cw - 6 });
        E.font.text(g, res ? 'WON ' + res[0] + '-' + res[1] : next ? 'NEXT' : 'LOCKED', x + cw / 2, y + 74, res ? '#80ff90' : next ? '#ffe060' : '#5a6078', { align: 'center', outline: false });
      });
      if (this.sheet >= 0) {
        const d = TT.TEAMS[0].players[this.sheet];
        TT.ui.panel(g, W / 2 - 150, 40, 300, 150);
        TT.castRig('mud:' + this.sheet).drawPortrait(g, W / 2 - 140, 50, 60, { zoom: 3, bg: '#2a3450' });
        E.font.text(g, '"' + d.nick + '"', W / 2 - 70, 52, '#ffe08a', { outline: false, scale: 1 });
        E.font.text(g, d.name + ', ' + ROLES[this.sheet], W / 2 - 70, 64, '#ffffff', { outline: false, font: 'tiny' });
        [['SPEED', 'SPD'], ['POWER', 'POW'], ['HANDS', 'HND'], ['KICKING', 'KCK'], ['TACKLING', 'TKL']].forEach(([l, k], i) => { E.font.text(g, l, W / 2 - 70, 80 + i * 14, '#c8d0e8', { outline: false, font: 'tiny' }); E.ui.bar(g, W / 2 - 10, 80 + i * 14, 140, 6, d.stats[k] / 10, '#4aa0e0'); });
        TT.ui.footer(g, W, H, '{b:left}{b:right} PLAYER ' + (this.sheet + 1) + '/7   {b:cancel} BACK');
      } else { this.menu.draw(g, W); TT.ui.footer(g, W, H, '{b:up}{b:down} CHOOSE   {b:confirm} PICK   {b:cancel} BACK'); }
    });
  }
});

/* ---- story scenes: a staged set, the cast standing in it, lines with portraits and babble; △ skips ---- */
TT.scenes.story = Object.assign({}, FRONT, {
  view: 'threequarter', views: ['threequarter'],
  enter(d) {
    this.d = d || {}; const st = TT.STORY[this.d.id] || TT.STORY.lost;
    this.st = st; this.lines = this.d.lines || st.lines; this.i = -1; this.t = 0; this.done = false;
    const kind = st.set; this.map = TT.makeSet(kind === 'podium' ? 'pitch' : kind);
    const g = TT.game; g.weather = null; g.lights.enabled = true; g.lights.ambient = kind === 'pub' ? .55 : kind === 'tunnel' ? .4 : .85;
    g.cam.bounds = null; g.focus(160, 100, 0); g.setZoom(1.4);
    TT.audio.music(kind === 'pub' ? (st.song ? 'third' : 'pub') : st.boss ? 'mayhem' : 'title');
    const ids = [...new Set(this.lines.map(l => l[0]))].filter(s => s !== 'barry' && s !== 'ros');
    this.actors = ids.map((id, k) => ({ id, rig: TT.castRig(id), x: 160 + (k - (ids.length - 1) / 2) * 34, y: 104 + (k % 2) * 8 }));
    this.talk = new E.Dialog(g, { lines: 3, place: 'bottom', border: '#e8c040', voice: null, speed: 40 });
    this.talk.onLetter = (ch, i) => { if (this.voice) TT.babble.letter(ch, this.voice, i); };
    this.next();
  },
  exit() { TT.game.setZoom(1); },
  next() {
    this.i++;
    if (this.i >= this.lines.length) return this.finish();
    const [who, text] = this.lines[this.i], last = this.i === this.lines.length - 1;
    this.voice = TT.castVoice(who); this.speaker = who;
    const o = { name: TT.castName(who), portrait: TT.castRig(who), portraitOpts: { zoom: 2.6, turn: .4 }, onDone: () => this.next() };
    if (last && this.st.choices && !this.d.lines) { o.choices = this.st.choices; o.onChoice = k => { this.choice = k; }; }
    this.talk.say(text, o);
  },
  finish() {
    if (this.done) return; this.done = true;
    const g = TT.game, id = this.d.id, nx = this.d.next;
    if (id === 'prologue') { if (this.choice === 0) { TT.cup.trained = true; TT.cupSave(); g.go('training', { cup: true }); } else g.go('cup'); return; }
    if (nx === 'cupMatch') return TT.cupMatch();
    if (id === 'victory') return g.go('story', { id: 'third' });
    if (id === 'third') return g.go('credits');
    if (nx) return g.go(nx);
    g.go('cup');
  },
  update(dt) {
    this.t += dt; const g = TT.game;
    if (g.players.some(I => I.pressed('tri'))) { g.players.forEach(I => I.consumeAll()); this.talk.open = false; this.choice = this.choice == null ? 1 : this.choice; return this.finish(); }
    this.talk.update(dt);
    for (const a of this.actors) a.rig.update(dt, { x: a.x, y: a.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: a.id === this.speaker ? (this.st.song ? 'cheer' : 'wave') : this.st.song ? 'cheer' : null, expr: a.id === this.speaker ? 'shout' : 'smile' });
    g.focus(160, 96, 0);
  },
  draw(r) {
    const st = this.st, kind = st.set;
    r.sky(kind === 'pub' ? ['#1a1008', '#2a1a10'] : kind === 'tunnel' ? ['#06060c', '#141420'] : ['#5a7090', '#9ab0c0']);
    this.map.drawFloor(r); this.map.queueWalls(r);
    if (kind === 'pub') { r.prop('barrel', 70, 60, 0, { size: 1.3 }); r.prop('barrel', 250, 60, 0, { size: 1.3 }); r.prop('lantern', 120, 40, 40, { anchor: 'top', light: true }); r.prop('lantern', 210, 40, 40, { anchor: 'top', light: true }); r.prop('lamp', 70, 140, 0, { light: true }); r.prop('banner', 160, 20, 50, { color: '#4aa0e0' }); r.prop('crate', 280, 150, 0); TT.game.lights.add(160, 100, 40, 160, .7, { color: '#ffb060' }); }
    else if (kind === 'tunnel') { r.prop('torch', 40, 30, 20, { light: true }); r.prop('torch', 280, 30, 20, { light: true }); TT.game.lights.add(160, 104, 60, 70, 1.4, { color: '#fff4d0' }); }
    else { for (const py of [130, 190]) r.queue(160, py * .5 + 40, 0, g => { const [x, y] = r.w(py, 30, 0), [, y1] = r.w(py, 30, 90); px.rect(g, Math.round(x), Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); }); r.queue(160, 30, 34, g => { const [x0, y0] = r.w(130, 30, 34), [x1] = r.w(190, 30, 34); px.rect(g, Math.round(x0), Math.round(y0), Math.round(x1 - x0) + 2, 2, '#f4f4f0'); }); r.prop('banner', 60, 20, 30, { color: '#4aa0e0' }); r.prop('banner', 260, 20, 30, { color: '#e8c040' }); if (this.d.id === 'victory') this.drawTrophy(r); }
    for (const a of this.actors) { r.shadow(a.x, a.y, 6, .4); r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, E.charView(r.view))); }
    if (this.d.id === 'third') { r.actor(250, 120, 0, (g, ox, oy) => { if (!this.chick) this.chick = new E.Blob({ R: 11, colors: { dk: '#c8b878', base: '#f4f0e0', lt: '#ffffff', spec: '#ffffff', eye: '#141010', pupil: '#000' }, wings: true, feet: true, mouth: true }); this.chick.update(1 / 60, { walk: .5, flap: Math.sin(this.t * 4) > 0 ? 1 : 0 }); this.chick.draw(g, ox, oy, E.charView(r.view)); px.rect(g, ox - 2, oy - 28, 5, 4, '#e02020'); }); }
    r.overlay(g => {
      E.ui.box(g, 0, 0, r.W, 18, { bg: '#000', border: '#000', alpha: .7, gradient: false });
      E.font.text(g, st.title, r.W / 2, 5, '#ffe08a', { align: 'center', outline: false });
      TT.prompt(g, '{b:confirm} NEXT  {b:tri} SKIP', 52, 5, TT.game.input);
    });
    this.talk.draw(r);
  },
  drawTrophy(r) {
    r.queue(160, 70, 0, g => {
      const [x, y] = r.w(160, 70, 0), X = Math.round(x), Y = Math.round(y), t = PR.t;
      px.rect(g, X - 10, Y - 6, 20, 6, '#5a2a8a'); px.rect(g, X - 3, Y - 26, 6, 20, '#c89a20'); px.poly(g, [[X - 14, Y - 56], [X + 14, Y - 56], [X + 8, Y - 26], [X - 8, Y - 26]], '#e8c040'); px.rect(g, X - 8, Y - 54, 4, 20, '#fff0a0');
      px.rect(g, X - 20, Y - 52, 6, 3, '#e8c040'); px.rect(g, X + 14, Y - 52, 6, 3, '#e8c040');
      for (let k = 0; k < 12; k++) px.rect(g, Math.round(X + Math.sin(t * 2 + k) * 60), Math.round(Y - 100 + ((t * 30 + k * 23) % 100)), 2, 2, ['#ff4040', '#40c0ff', '#ffe040', '#60ff80'][k % 4]);
    }, { emissive: true });
  }
});

/* ---- join: Start on a free pad, or 2 for the keyboard's right half; each seat picks HOME, AWAY or CPU ---- */
TT.scenes.join = Object.assign({}, FRONT, {
  enter(d) {
    this.mode = (d && d.mode) || 'exhibition';
    TT.bg.ensure(); const g = TT.game;
    const prev = TT.seatsJoined || [];
    this.seats = g.players.map((I, i) => ({ input: I, side: prev[i] ? prev[i].side || (prev[i].team ? 'AWAY' : 'HOME') : (i % 2 ? (this.mode === 'cup' ? 'HOME' : 'AWAY') : 'HOME') }));
    g.allowJoin({ max: 4, onJoin: (I) => { this.seats.push({ input: I, side: this.mode === 'cup' ? 'HOME' : (this.seats.length % 2 ? 'AWAY' : 'HOME') }); } });
  },
  exit() { TT.game.allowJoin(false); },
  update(dt) {
    TT.bg.step(dt); const g = TT.game;
    this.seats = this.seats.filter(s => g.players.includes(s.input));
    for (const s of this.seats) {
      const I = s.input;
      if (this.mode !== 'cup') { const opts = ['HOME', 'CPU', 'AWAY'], k = opts.indexOf(s.side); if (I.pressed('left')) { s.side = opts[Math.max(0, k - 1)]; TT.audio.sfx('select'); } if (I.pressed('right')) { s.side = opts[Math.min(2, k + 1)]; TT.audio.sfx('select'); } }
      if (I !== g.input && I.pressed('cancel')) { g.removePlayer(I); TT.audio.sfx('cancel'); }
    }
    if (g.input.pressed('confirm') || g.input.pressed('start') || g.input.pressed('x')) {
      if (!this.seats.some(s => s.side !== 'CPU')) { this.seats[0].side = 'HOME'; }
      g.players.forEach(I => I.consumeAll()); TT.audio.sfx('confirm');
      TT.seatsJoined = this.seats.filter(s => s.side !== 'CPU').map(s => ({ input: s.input, team: s.side === 'AWAY' ? 1 : 0, side: s.side }));
      if (this.mode === 'cup') g.go('cup'); else g.go('setup');
      return;
    }
    if (g.input.pressed('cancel')) { g.players.forEach(I => I.consumeAll()); while (g.players.length > 1) g.removePlayer(g.players[g.players.length - 1]); TT.seatsJoined = null; g.go(this.mode === 'cup' ? 'cup' : 'menu'); }
  },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, this.mode === 'cup' ? 'CO-OP: THE MUDLARKS' : 'PLAYERS', W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      E.font.text(g, 'PRESS START ON A CONTROLLER, OR 2 ON THE KEYBOARD, TO JOIN (UP TO 4)', W / 2, 32, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' });
      const cols = { HOME: W / 2 - 110, CPU: W / 2, AWAY: W / 2 + 110 };
      if (this.mode !== 'cup') { E.font.text(g, 'HOME', cols.HOME, 50, '#4aa0e0', { align: 'center', outline: '#000', scale: 2 }); E.font.text(g, 'CPU', cols.CPU, 50, '#a8b0c8', { align: 'center', outline: '#000', scale: 2 }); E.font.text(g, 'AWAY', cols.AWAY, 50, '#e85a4a', { align: 'center', outline: '#000', scale: 2 }); }
      for (let i = 0; i < 4; i++) {
        const s = this.seats[i], y = 76 + i * 28;
        if (!s) { E.font.text(g, 'P' + (i + 1) + '  ...', W / 2, y + 6, '#5a6078', { align: 'center', outline: false }); continue; }
        const x = this.mode === 'cup' ? W / 2 : cols[s.side], col = E.PLAYER_COLORS[i];
        E.ui.box(g, x - 46, y, 92, 22, { bg: ['#1a2238', '#0c1020'], border: col });
        E.font.text(g, 'P' + (i + 1), x - 40, y + 8, col, { outline: false, scale: 1 });
        E.font.text(g, s.input.half ? 'KEYS (' + s.input.half.toUpperCase() + ')' : s.input.lastDevice === 'gamepad' || s.input.pad != null ? 'PAD' : 'KEYS', x + 40, y + 8, '#c8d0e8', { align: 'right', font: 'tiny', outline: false });
        if (this.mode !== 'cup') TT.prompt(g, '{b:left}{b:right}', x, y + 24, s.input);
      }
      TT.ui.footer(g, W, H, this.mode === 'cup' ? '{b:confirm} DONE   {b:cancel} BACK' : '{b:left}{b:right} PICK A SIDE   {b:confirm} NEXT   {b:cancel} BACK');
    });
  }
});

/* ---- Exhibition's setup: the teams, the stadium, the weather, the time, the halves ---- */
TT.scenes.setup = Object.assign({}, FRONT, {
  enter() {
    TT.bg.ensure();
    const teams = TT.TEAMS.filter(t => !t.locked || TT.unlocks().meg);
    const S = this.s = this.s || { home: 0, away: 1, venue: 0, weather: 0, time: 0, halves: 0, sd: 0 };
    const W_ = ['Venue', 'Clear', 'Rain', 'Wind', 'Storm'], T_ = ['Venue', 'Day', 'Dusk', 'Night'], H_ = ['2 min', '3 min', '4 min', '5 min'];
    const cyc = (k, n, d) => { S[k] = (S[k] + d + n) % n; };
    const rows = [
      { k: 'home', label: 'HOME', value: () => teams[S.home].short, n: teams.length }, { k: 'away', label: 'AWAY', value: () => teams[S.away].short, n: teams.length },
      { k: 'venue', label: 'STADIUM', value: () => TT.VENUES[S.venue].name, n: 4 }, { k: 'weather', label: 'WEATHER', value: () => W_[S.weather].toUpperCase(), n: 5 },
      { k: 'time', label: 'TIME', value: () => T_[S.time].toUpperCase(), n: 4 }, { k: 'halves', label: 'HALVES', value: () => H_[S.halves].toUpperCase(), n: 4 },
      { k: 'sd', label: 'SUDDEN DEATH', value: () => S.sd ? 'OFF' : 'ON', n: 2 }, { k: 'play', label: 'KICK OFF!' }];
    this.teams = teams;
    this.menu = new TT.ui.BigMenu(rows, { y: 96, w: 260, rowH: 16, scale: 1, onLeft: (i, it) => it.n && cyc(it.k, it.n, -1), onRight: (i, it) => it.n && cyc(it.k, it.n, 1),
      onPick: (i, it) => { if (it.k === 'play') this.go(); else if (it.n) cyc(it.k, it.n, 1); }, onCancel: () => TT.game.go('join', { mode: 'exhibition' }) });
  },
  go() {
    const S = this.s, t = this.teams;
    const halves = [120, 180, 240, 300][S.halves];
    TT.game.go('match', { home: t[S.home].id, away: t[S.away].id, venue: TT.VENUES[S.venue].id, weather: ['venue', 'clear', 'rain', 'wind', 'storm'][S.weather], time: ['venue', 'day', 'dusk', 'night'][S.time], halfLength: halves, suddenDeath: !S.sd, seats: (TT.seatsJoined || [{ input: TT.game.input, team: 0 }]), seed: Date.now() & 0xffff });
  },
  update(dt) { TT.bg.step(dt); this.menu.update(dt); },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H, S = this.s;
      E.font.title(g, 'EXHIBITION', W / 2, 4, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      [S.home, S.away].forEach((k, j) => {
        const t = this.teams[k], x = j ? W / 2 + 10 : W / 2 - 140, y = 26;
        E.ui.box(g, x, y, 130, 64, { bg: ['#1a2238', '#0c1020'], border: t.home.cloth, alpha: .94 });
        TT.drawCrest(g, t, x + 16, y + 18, 2); E.font.text(g, t.name, x + 32, y + 6, '#ffffff', { font: 'tiny', outline: false, wrap: 96 });
        const avg = k2 => t.players.reduce((a, p) => a + Math.min(10, p.stats[k2]), 0) / 7;
        [['SPEED', avg('SPD')], ['POWER', avg('POW')], ['SKILL', (avg('HND') + avg('KCK')) / 2]].forEach(([l, v], i) => { E.font.text(g, l, x + 32, y + 26 + i * 12, '#a8b0c8', { font: 'tiny', outline: false }); E.ui.bar(g, x + 66, y + 26 + i * 12, 58, 5, v / 10, t.home.cloth === '#24242a' ? '#a8a8b0' : t.home.cloth); });
      });
      E.font.text(g, 'VS', W / 2, 52, '#ffe08a', { align: 'center', outline: '#000', scale: 2 });
      this.menu.draw(g, W);
      TT.ui.footer(g, W, H, '{b:up}{b:down} CHOOSE  {b:left}{b:right} CHANGE  {b:confirm} PICK  {b:cancel} BACK');
    });
  }
});

/* ---- the Training Ground: nine drills as cards; a tick on each one done ---- */
TT.scenes.training = Object.assign({}, FRONT, {
  enter(d) { this.d = d || {}; this.i = this.d.focus || 0; TT.bg.ensure('park'); TT.audio.music('pub'); this.boxes = []; },
  update(dt) {
    TT.bg.step(dt); const g = TT.game, P = g.players, n = TT.DRILLS.length;
    const old = this.i;
    if (P.some(I => I.repeat('right'))) this.i = (this.i + 1) % n; if (P.some(I => I.repeat('left'))) this.i = (this.i + n - 1) % n;
    if (P.some(I => I.repeat('down'))) this.i = (this.i + 3) % n; if (P.some(I => I.repeat('up'))) this.i = (this.i + n - 3) % n;
    const ptr = g.input.pointer && g.input.pointer(), c = g.input.clicked && g.input.clicked(), hit = p => this.boxes.findIndex(b => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]);
    if (ptr && g.input.mouse && g.input.mouse.t !== this._mt) { this._mt = g.input.mouse.t; const k = hit(ptr); if (k >= 0) this.i = k; }
    if (old !== this.i) TT.audio.sfx('select');
    if (P.some(I => I.pressed('confirm') || I.pressed('x')) || (c && hit(c) >= 0 && (this.i = hit(c)) >= 0)) { P.forEach(I => I.consumeAll()); TT.audio.sfx('confirm'); TT.trainingFrom = this.d; g.go('match', { drill: TT.DRILLS[this.i].id, home: 'mud', away: 'bad', venue: 'park', weather: 'clear', time: 'day', seats: [{ input: g.input, team: 0 }], seed: 5 }); return; }
    if (P.some(I => I.pressed('cancel'))) { P.forEach(I => I.consumeAll()); g.go(this.d.cup ? 'cup' : 'menu'); }
  },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H, done = E.store.get('thugby:drills', {}) || {}, cw = Math.min(124, Math.floor((W - 24) / 3)), ch = 52;
      E.font.title(g, 'TRAINING GROUND', W / 2, 4, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      this.boxes = [];
      TT.DRILLS.forEach((d, i) => {
        const x = Math.round(W / 2 - 1.5 * (cw + 4) + (i % 3) * (cw + 4)), y = 28 + Math.floor(i / 3) * (ch + 4), on = i === this.i;
        this.boxes.push([x, y, cw, ch]);
        E.ui.box(g, x, y, cw, ch, { bg: on ? ['#3a3010', '#1a1408'] : ['#1a2238', '#0c1020'], border: on ? '#ffe060' : '#4a5470', alpha: .94 });
        E.font.text(g, (i + 1) + '. ' + d.name, x + 6, y + 6, on ? '#ffe060' : '#ffffff', { outline: false, scale: 1 });
        E.font.text(g, d.teach, x + 6, y + 20, '#a8b0c8', { font: 'tiny', outline: false, wrap: cw - 12 });
        if (done[d.id]) E.font.text(g, '★ DONE', x + cw - 6, y + ch - 12, '#80ff90', { align: 'right', outline: false });
      });
      const rig = TT.castRig('gristle'); rig.drawPortrait(g, 8, H - 58, 32, { zoom: 2.4, bg: '#3a2a1a' });
      E.font.text(g, '"Drill ' + (this.i + 1) + '. ' + TT.DRILLS[this.i].teach + '. No excuses."', 46, H - 48, '#ffe8c0', { outline: false });
      TT.ui.footer(g, W, H, '{b:confirm} TRAIN   {b:view} IN A DRILL: SHOW ME   {b:cancel} BACK');
    });
  }
});
TT.drillNext = id => { const k = TT.DRILLS.findIndex(d => d.id === id); TT.drills.stop(); TT.game.go('training', Object.assign({}, TT.trainingFrom || {}, { focus: (k + 1) % TT.DRILLS.length })); };

/* ---- results: the score, the Player of the Match, four big numbers; records; the cup goes on ---- */
TT.scenes.results = Object.assign({}, FRONT, {
  enter(r) {
    this.r = r; this.t = 0; TT.bg.ensure(TT.venueById(r.venue).id); TT.recordsInit();
    const humanTeams = [...new Set(r.seats)], humanWon = humanTeams.includes(r.winner);
    this.won = humanWon; this.cont = null;
    TT.audio.music(null); TT.audio.sting(humanWon || !humanTeams.length ? 'win' : 'lose');
    // records: margins, tries and hits by the human side
    this.entries = [];
    if (humanTeams.length && !TT.cfg.session) {
      const t = humanTeams[0], margin = r.score[t] - r.score[1 - t], tries = r.stats[t].tries, hit = r.hit * 10;
      if (margin > 0 && TT.cab.qualifies(margin, 'margin')) this.entries.push([margin, 'margin']);
      if (tries > 0 && TT.cab.qualifies(tries, 'tries')) this.entries.push([tries, 'tries']);
      if (hit > 0 && TT.cab.qualifies(hit, 'hit')) this.entries.push([hit, 'hit']);
    }
    this.nextEntry();
    const items = r.cup ? [{ id: 'cont', label: humanWon ? 'CONTINUE' : 'TRY AGAIN' }, { id: 'hub', label: 'CUP HUB' }] : [{ id: 'rematch', label: 'REMATCH' }, { id: 'menu', label: 'MAIN MENU' }];
    this.menu = new TT.ui.BigMenu(items, { y: 0, w: 140, rowH: 18, scale: 1, onPick: (i, it) => this.pick(it.id) });
    if (r.cup && !humanWon) { this.cont = 10; }
  },
  nextEntry() { const e = this.entries.shift(); if (e) TT.cab.enter(e[0], e[1], () => this.nextEntry()); },
  pick(id) {
    const g = TT.game, r = this.r;
    if (id === 'rematch') return g.go('match', Object.assign({}, TT.mdata, { seed: Date.now() & 0xffff }));
    if (id === 'menu') return g.go('menu');
    if (id === 'hub') return g.go('cup');
    if (id === 'cont') {
      if (!this.won) return TT.cupMatch();
      const k = TT.CUP.findIndex(c => c.id === r.cup);
      TT.cup.results[k] = [r.score[0], r.score[1]]; TT.cup.round = Math.max(TT.cup.round, k + 1); TT.cupSave();
      const st = TT.STORY[r.cup];
      if (TT.cup.round >= 4) { TT.unlock('meg'); TT.unlock('bigHeads'); E.store.set('thugby:cup', Object.assign({}, TT.cup)); return g.go('story', { id: 'victory' }); }
      return g.go('story', { id: r.cup, lines: st.won || [['barry', 'Through to the next round!']], next: 'cup' });
    }
  },
  update(dt) {
    this.t += dt; TT.bg.step(dt);
    if (TT.cab.entry) { TT.cab.update(dt); return; }
    if (this.cont != null) {
      this.cont -= dt;
      if (TT.game.players.some(I => I.pressed('confirm') || I.pressed('x'))) { TT.game.players.forEach(I => I.consumeAll()); return TT.cupMatch(); }
      if (this.cont <= 0) { this.cont = null; TT.game.go('cup'); }
      return;
    }
    if (this.t > 1) this.menu.update(dt);
  },
  draw(r) {
    TT.bg.draw(r, .65);
    const R = this.r;
    r.overlay(g => {
      const W = r.W, H = r.H, t0 = TT.teamById(R.home), t1 = TT.teamById(R.away);
      E.font.title(g, 'FULL TIME', W / 2, 6, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#ffb347'] });
      TT.drawCrest(g, t0, W / 2 - 100, 46, 2.4); TT.drawCrest(g, t1, W / 2 + 100, 46, 2.4);
      E.font.text(g, R.score[0] + ' - ' + R.score[1], W / 2, 36, '#ffffff', { align: 'center', outline: '#000', scale: 3 });
      E.font.text(g, R.winner < 0 ? 'A DRAW' : TT.teamById(R.winner ? R.away : R.home).name + ' WIN', W / 2, 64, '#ffe08a', { align: 'center', outline: '#000' });
      if (R.potm) { const rig = TT.castRig(R.potm.team + ':' + R.potm.idx), d = TT.teamById(R.potm.team).players[R.potm.idx]; TT.ui.panel(g, W / 2 - 110, 78, 220, 40); rig.drawPortrait(g, W / 2 - 106, 81, 34, { zoom: 2.5, bg: '#2a3450' }); E.font.text(g, 'PLAYER OF THE MATCH', W / 2 - 66, 82, '#ffe08a', { font: 'tiny', outline: false }); E.font.text(g, '"' + d.nick + '"', W / 2 - 66, 92, '#ffffff', { outline: false }); E.font.text(g, R.potm.tries + ' TRIES, ' + R.potm.tackles + ' TACKLES, ' + R.potm.metres + ' M', W / 2 - 66, 104, '#a8b0c8', { font: 'tiny', outline: false }); }
      const s = R.stats, tot = Math.max(1, s[0].poss + s[1].poss);
      [['TRIES', s[0].tries, s[1].tries], ['BIG HITS', s[0].bigHits, s[1].bigHits], ['METRES', TT.metres(s[0].metres), TT.metres(s[1].metres)], ['POSSESSION', Math.round(s[0].poss / tot * 100) + '%', Math.round(s[1].poss / tot * 100) + '%']].forEach(([l, a, b], i) => {
        const x = Math.round(W / 2 - 2 * 76 + i * 76), y = 124; E.ui.box(g, x, y, 72, 34, { bg: ['#1a2238', '#0c1020'], border: '#4a5470', alpha: .92 });
        E.font.text(g, l, x + 36, y + 4, '#a8b0c8', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, a + ' - ' + b, x + 36, y + 16, '#ffffff', { align: 'center', outline: false, scale: 1 });
      });
      if (this.cont != null) { E.font.title(g, 'CONTINUE? ' + Math.ceil(this.cont), W / 2, 168, { align: 'center', scale: 2, colors: ['#ffffff', '#ff8070'] }); TT.prompt(g, '{b:confirm} TRY AGAIN', W / 2, 192, TT.game.input); }
      else if (!TT.cab.entry) { this.menu.y = 168; this.menu.draw(g, W); }
      if (!TT.cab.entry) TT.ui.footer(g, W, H, '{b:confirm} PICK');
    });
    if (TT.cab.entry) TT.cab.draw(r);
  }
});

/* ---- jumps (the dev panel's JUMP tab, deep links) ---- */
TT.jump = k => {
  const g = TT.game, [a, b] = k.split(':');
  if (a === 'cup') { if (!TT.cup) TT.cupNew(); TT.cup.round = TT.CUP.findIndex(c => c.id === b); TT.cupMatch(); }
  else if (a === 'story') { if (!TT.cup) TT.cupNew(); g.go('story', { id: b, next: b === 'prologue' ? null : b === 'victory' || b === 'third' ? null : 'cup' }); }
  else if (a === 'drill') g.go('match', { drill: b, home: 'mud', away: 'bad', venue: 'park', weather: 'clear', time: 'day', seats: [{ input: g.input, team: 0 }], seed: 5 });
  else if (a === 'session') g.go('match', { home: 'mud', away: 'gul', venue: 'docks', halfLength: 75, noReplays: true, seats: [{ input: g.input, team: 0 }] });
  else g.go(a);
};
