// WIRETAP: the front of the game. Attract mode (10 s idle on the title or its menus: a reel of bot-played vignettes from
// every system; any input exits), the title (a live diorama of the corner at night), its menus, the About & Credits pages,
// the touch-only notice, and the global systems every scene runs first.
const REEL = [
  { id: 'corner', s: 12, cap: 'THE CORNER', go: () => game.go('field', { m: 'tee', il: 'i1', attract: true }), tick: t => { if (Math.abs(t - 4) < .01 || Math.abs(t - 8) < .01) game.rotateView(90); } },
  { id: 'eyes', s: 10, cap: 'EYES ON', go: () => game.go('field', { m: 'eyes', attract: true }) },
  { id: 'tail', s: 10, cap: 'THE TAIL', go: () => game.go('field', { m: 'tail', attract: true }) },
  { id: 'chase', s: 10, cap: 'THE CHASE', go: () => game.go('field', { m: 'phones', attract: true }) },
  { id: 'wire', s: 11, cap: 'THE WIRE', go: () => game.go('room', { room: 'wire', cast: [['hal', 2.6, 2.4, -Math.PI / 2, 'sit'], ['dana', 3.6, 2.6, -Math.PI / 2, 'sit']], run: () => Wire.run('s1', () => {}, { attract: true }) }) },
  { id: 'board', s: 7, cap: 'THE BOARD', go: () => game.go('room', { room: 'office', cast: [['dana', 4, 3, -Math.PI / 2]], run: () => { Board.open({}); } }), tick: (t, dt) => { Attract.pinT = (Attract.pinT || 0) + dt; if (Attract.pinT > .9) { Attract.pinT = 0; const sl = TIERS[0].slots.find(s => !STATE.board.pins[s[0]]); if (sl) { STATE.board.pins[sl[0]] = sl[2]; sfx('pin'); UI.refresh(); } else if (!STATE.board.links.length) { STATE.board.links.push(['tee', 'P1']); sfx('string'); UI.refresh(); } } } },
  { id: 'box', s: 9, cap: 'THE BOX', go: () => game.go('room', { room: 'box', cast: [['corey', 3.5, 1.9, Math.PI / 2, 'sit'], ['lou', 5.2, 3, Math.PI * .8], ['dana', 3.5, 3.4, -Math.PI / 2]], run: () => Box.open('corey', () => {}) }), tick: (t, dt) => { Attract.boxT = (Attract.boxT || 0) + dt; if (Attract.boxT > 2.2 && UI.top() && UI.top().id === 'box') { Attract.boxT = 0; Attract.boxN = (Attract.boxN || 0) + 1; const bs = UI.top(); bs.keys[Attract.boxN % 2 ? 'boxRight' : 'boxBottom'](bs); } } },
  { id: 'game', s: 10, cap: 'THE GAME', go: () => game.go('versus', { mode: 'local', seats: [{ id: 0, name: 'Tee', side: 'corner', role: 'lt' }, { id: 1, name: 'Det. A', side: 'detail', role: 'det' }, { id: 2, name: 'Det. B', side: 'detail', role: 'det' }], len: 300, seed: 5 }) },
  { id: 'count', s: 9, cap: 'THE COUNT', go: () => game.go('field', { m: 'count', attract: true }) }
];
const Attract = {
  on: false, i: 0, t: 0, idle: 0, saved: null,
  start() {
    if (this.on) return; this.on = true; this.saved = JSON.stringify(STATE); this.i = 0; this.t = 0; UI.closeAll(); Talk.skip();
    STATE = freshState(); for (const id of CREW4) { addFact('face:' + id, 0, true); addFact('obs:' + id + ':' + { tee: 'lieutenant', rook: 'muscle', corey: 'stash', pigeon: 'lookout' }[id], 0, true); }
    addEvidence({ id: 'pager', kind: 'seizure', text: "Corey's pager" }); STATE.numbers.P1.known = true; STATE.flags.pocketsMet = true; STATE.flags.dreLine = true; STATE.tips = { all: 1 };
    for (const k of Object.keys(TIPS_ALL)) STATE.tips[k] = 1;
    this.play();
  },
  play() { const v = REEL[this.i % REEL.length]; this.t = 0; this.v = v; UI.closeAll(); Talk.skip(); STATE.board = { pins: {}, links: [] }; game.resetCamera && game.resetCamera(); v.go(); },
  stop() { if (!this.on) return; this.on = false; UI.closeAll(); Talk.skip(); if (this.saved) STATE = JSON.parse(this.saved); this.idle = 0; game.splitScreen(0); game.resetCamera && game.resetCamera(); game.go('title', {}); },
  tick(dt) {
    if (!this.on) return false;
    if (this.anyInput()) { this.stop(); return true; }
    this.t += dt; if (this.v.tick) this.v.tick(this.t, dt);
    if (this.t >= this.v.s) { this.i++; this.play(); }
    return false;
  },
  anyInput() {
    const I = game.input; let any = false;
    try { any = I.anyPressed(); } catch (e) {}
    if (Prompt.mouseMoved > 6 && this.t > .5) any = true;
    const ax = I.padAxes || []; if (ax.some(v => Math.abs(v) > .3)) any = true;
    if (this.tapped) { this.tapped = false; any = true; }
    return any;
  },
  overlay(r) {
    if (!this.on) return;
    r.overlay(g => {
      const bh = Math.round(r.H * .09); px.rect(g, 0, 0, r.W, bh, '#000'); px.rect(g, 0, r.H - bh, r.W, bh, '#000');
      E.font.title(g, 'WIRETAP', 10, 4, { scale: 1, colors: ['#fff6dc', '#ffcf7a', '#e08a2a'] });
      px.rect(g, r.W - 46, 5, 36, 11, '#c82a2a'); E.font.text(g, 'DEMO', r.W - 28, 7, '#ffffff', { align: 'center', outline: false });
      E.font.text(g, this.v ? this.v.cap : '', r.W / 2, r.H - bh + 4, '#ffb347', { align: 'center', outline: false });
      if (Math.floor(game.real * 2) % 2) { const w = Touch.only ? E.font.width('Tap to return') : 60; if (Touch.only) E.font.text(g, 'Tap to return', r.W / 2, r.H - 12, '#e8e4dc', { align: 'center', outline: false }); else Glyph.prompt(g, 'confirm', 'Press any button', Math.round(r.W / 2) - w, r.H - 13, '#e8e4dc'); }
    });
  }
};
const TIPS_ALL = { move: 1, cover: 1, eyes: 1, watch: 1, photo: 1, heat: 1, made: 1, chase: 1, van: 1, tail: 1, tee: 1, wire: 1, board: 1, paper: 1, lens: 1, annex: 1 };

/* the systems every scene runs first: device prompts, ambience, the idle timer and attract, Create+Options */
const Globals = {
  tick(dt) {
    Prompt.tick(); Amb.tick();
    if (Attract.on) return Attract.tick(dt);
    const sc = game.sceneName, idleScene = sc === 'title' && (!UI.top() || ['title', 'episodes', 'vsetup', 'touch'].includes(UI.top().id));
    if (idleScene && !game.paused && !(ui && ui.screen)) {
      let any = false; try { any = game.input.anyPressed(); } catch (e) {}
      const ax = game.input.padAxes || []; if (ax.some(v => Math.abs(v) > .3) || Prompt.mouseMoved > 6) any = true;
      Prompt.mouseMoved = 0;
      this.idle = any ? 0 : (this.idle || 0) + dt;
      if (this.idle > 10 && !HUB) { this.idle = 0; Attract.start(); return true; }
    } else this.idle = 0;
    return false;
  }
};

/* ---- the title ---- */
const Title = {
  pausable: false, view: 'iso', views: ['iso'], camera: false,
  enter(d = {}) {
    World.setMood('night', .5); Music.play('theme'); game.splitScreen(0);
    this.sim = new CornerSim({ rate: .3, patrol: true, night: true, rnd: E.rng(77) }); this.civs = []; for (let i = 0; i < 6; i++) { const s = SIDEWALK[i * 3 % SIDEWALK.length], p = C(s[0], s[1]); const a = new Agent({ id: 'tc' + i, x: p.x, y: p.y, seed: 300 + i }); a.civT = i; this.civs.push(a); }
    this.t = 0; this.rot = 0; game.follow(null); game.cam.bounds = v => World.map.bounds(v); if (ui) ui.hud({});
    UI.closeAll(); Touch.check();
    if (Touch.only) this.touchPanel(); else if (d.episodes) this.episodes(); else this.menu();
  },
  exit() { UI.closeAll(); game.lights.enabled = false; game.weather = null; },
  menu() {
    const latest = (() => { try { return game.saves.latest(); } catch (e) { return null; } })();
    const items = [latest && ['Continue', () => { UI.closeAll(); game.saves.load(latest.slot); }], ['New Case', () => { UI.closeAll(); Director.newGame(); }], ['Episodes', () => { UI.close(); this.episodes(); }],
      ['The Game (versus)', () => { UI.close(); this.vsetup(); }], ['Settings', () => game.menu('settings')], ['About & Credits', () => { UI.close(); About.open(() => this.menu()); }]].filter(Boolean);
    UI.open({ id: 'title', cls: 'title', legend: [['confirm', 'Select']], render(el) { el.append(h('div.menu', items.map(([l, f]) => btn(l, f, 'menu-item')))); },
      model(s) { s.confirm = () => { UI.closeAll(); Director.newGame(); }; } });
  },
  episodes() {
    UI.open({ id: 'episodes', cls: 'title', legend: [['confirm', 'Start'], ['cancel', 'Back']], cancel: () => { UI.close(); this.menu(); },
      render(el) { el.append(h('div.panel.dark.eplist', h('div.kicker', { text: 'EPISODES' }), ...EPIS.slice(1).map(e => btn('Episode ' + e.n + ' · ' + e.title, () => { UI.closeAll(); Director.preset(e.n); })), btn('Back', () => { UI.close(); Title.menu(); }))); } });
  },
  vsetup() {
    const o = { side: 'detail', len: 5, p2: false };
    game.allowJoin && game.allowJoin({ max: 2, onJoin: () => { o.p2 = true; sfx('confirm'); UI.refresh(); } });
    const s = UI.open({ id: 'vsetup', cls: 'title', legend: [['confirm', 'Select'], ['cancel', 'Back']], cancel: () => { game.allowJoin && game.allowJoin(false); UI.close(); this.menu(); },
      render(el) { el.append(h('div.panel.dark.eplist', h('div.kicker', { text: 'THE GAME · CORNER VS DETAIL' }),
        h('p.small', { text: 'The Detail hides among civilians and builds a 100-point case. The Corner makes $' + VS.quotaPerMin * o.len + ' and calls out cops.' }),
        btn('Player 1: ' + (o.side === 'detail' ? 'The Detail (detective)' : 'The Corner (lieutenant)'), () => { o.side = o.side === 'detail' ? 'corner' : 'detail'; UI.refresh(s); }),
        btn('Round: ' + o.len + ' minutes', () => { o.len = o.len === 3 ? 5 : o.len === 5 ? 8 : 3; UI.refresh(s); }),
        h('p.small', { text: o.p2 || (game.players && game.players.length > 1) ? 'Player 2 is in: split screen.' : 'Player 2: press Start on a second controller, or Enter on the keyboard\'s right half.' }),
        btn('Start the round', () => { const two = game.players && game.players.length > 1, seats = [{ id: 0, name: 'P1', side: o.side, role: o.side === 'detail' ? 'det' : 'lt', human: true, ctl: new HumanCtl(game.input) }];
          if (two) seats.push({ id: 1, name: 'P2', side: o.side === 'detail' ? 'corner' : 'detail', role: o.side === 'detail' ? 'lt' : 'det', human: true, ctl: new HumanCtl(game.players[1]) });
          if (!seats.some(x => x.side === 'corner')) seats.push({ id: 5, name: 'Tee (bot)', side: 'corner', role: 'lt' });
          if (seats.filter(x => x.side === 'detail').length < 2) seats.push({ id: 6, name: 'Det. (bot)', side: 'detail', role: 'det' });
          seats.push({ id: 7, name: 'Moe (bot)', side: 'corner', role: 'lookout' });
          game.allowJoin && game.allowJoin(false); UI.closeAll(); game.go('versus', { mode: 'local', seats, len: o.len * 60, seed: Math.floor(Math.random() * 1e6), countdown: 3 }); }, 'primary'),
        btn('Back', () => { game.allowJoin && game.allowJoin(false); UI.close(); Title.menu(); }))); } });
  },
  touchPanel() {
    UI.open({ id: 'touch', cls: 'title', legend: [], render(el) { el.append(h('div.panel.dark.touchpanel', h('h1', { text: 'Controller or keyboard required' }), h('p.lede', { text: 'Connect a controller or keyboard to play. The demo will run in the meantime.' }), btn('Settings', () => game.menu('settings'), 'primary big'))); } });
  },
  update(dt) {
    if (Globals.tick(dt)) return;
    if (UI.update(dt)) {}
    this.t += dt; this.sim.update(dt, {});
    for (const a of this.civs) Field.civTick(a, dt);
    if ((this.rot += dt) > 20) { this.rot = 0; game.rotateView(90); }
    if (Touch.only && !(UI.top() && UI.top().id === 'touch')) { UI.closeAll(); this.touchPanel(); }
    if (!Touch.only && UI.top() && UI.top().id === 'touch') { UI.closeAll(); this.menu(); }
    game.focus(31 * T + Math.sin(this.t * .1) * 20, 32 * T, 10);
  },
  draw(r) {
    World.draw(r); this.sim.drawPolice(r); for (const a of [...this.sim.agents, ...this.civs]) a.draw(r);
    r.overlay(g => {
      const x = Math.round(r.W * .07), y = Math.round(r.H * .1);
      px.line(g, 0, y + 30, r.W, y + 34, '#0a0a0a'); px.rect(g, x + 150, y + 33, 3, 2, '#e8e4dc'); px.rect(g, x + 155, y + 34, 3, 2, '#e8e4dc');
      E.font.title(g, 'WIRETAP', x, y, { scale: 4, colors: ['#fff6dc', '#ffcf7a', '#e08a2a'], depth: 3, depthColor: '#3a1a0a' });
      E.font.text(g, "Somebody's always listening.", x + 2, y + 42, '#e9dcb5', { shadow: '#000', outline: false });
      E.font.text(g, E.versionLabel ? 'my-3D2dge ' + E.versionLabel() : '', r.W - 6, r.H - 10, '#6a6458', { align: 'right', font: 'tiny', outline: false });
    });
  }
};

/* ---- About & Credits: the same text as the exit interview ---- */
const About = {
  open(back) {
    const X = CREDITS.exitInterview || {}, SI = X.sourceInformation || {}, Q = CREDITS.questions || {};
    const pages = [
      ['Credits', CREDITS.credits || []],
      ['Source Information', [['Date', SI.date], ['Source', SI.source], ['Genre', SI.genre], ['Perspective', SI.perspective], ['Tech', SI.tech], ['Art direction', SI.artDirection], ['Animation', SI.animation], ['Audio', SI.audio], ['Online', SI.online], ['Testing', SI.testing], ['Research', SI.research], ['Environment', SI.environment], ['Model', SI.model], ['Usage', SI.usage]].map(([k, v]) => k + ': ' + (v || 'unknown'))],
      ['Testing Feedback', (Q.testing || []).map((q, i) => q + '\n' + ((X.testingFeedback || [])[i] || 'unknown'))],
      ['Engine Feedback', (Q.engine || []).map((q, i) => q + '\n' + ((X.engineFeedback || [])[i] || 'unknown'))],
      ['Prompt Feedback', (Q.prompt || []).map((q, i) => q + '\n' + ((X.promptFeedback || [])[i] || 'unknown'))]];
    let pi = 0;
    const s = UI.open({ id: 'about', cls: 'about', legend: [['tabPrev', 'Page'], ['tabNext', 'Page'], ['cancel', 'Back']], tab: d => { pi = (pi + d + pages.length) % pages.length; UI.refresh(s, 0); }, cancel: () => { UI.close(); back && back(); },
      render(el) { const [t, lines] = pages[pi]; el.append(h('div.panel.manila.aboutpanel', h('div.tabs', pages.map((p, i) => h('span' + (i === pi ? '.on' : ''), { text: p[0] }))), h('h1', { text: t }), h('div.scroll.doc', lines.map(l => h('p', { text: l }))),
        h('div.row', btn('◀ Previous', () => { pi = (pi + pages.length - 1) % pages.length; UI.refresh(s, 0); }), btn('Next ▶', () => { pi = (pi + 1) % pages.length; UI.refresh(s, 1); }), btn('Back', () => { UI.close(); back && back(); })))); } });
  }
};
