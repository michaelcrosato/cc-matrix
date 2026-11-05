/* ---- the title and main menu: the Ol' Icebox at night, two teams skating lazily, the logo slams in ---- */
const Title = (() => {
  let bgMatch = null;
  /** a quiet all-AI match behind the menus (no clock, no booth, no HUD) */
  function backdrop(arena = 'icebox') {
    if (bgMatch && M === bgMatch && M.cfg.arena === arena) return;
    const away = Save.data.story.done ? 'grizzlies' : 'drillers';
    Match.start({ home: 'muskrats', away, arena, periods: 99, len: 9999, attract: true, noTalk: true, noResults: true, noClock: true, intros: false, replays: false, noFights: true, aiSkill: [.4, .4], seed: 7 });
    M.attractHud = true; M.attractNoReplay = true; bgMatch = M;
  }
  function drawBackdrop(r, dim = .45) {
    Draw.world(r);
    for (let i = 0; i < 2; i++) { const a = game.time * .5 + i * PI; L.add(Rink.C.x + Math.cos(a) * 260, Rink.C.y + Math.sin(a * 1.3) * 120, 10, 120, 1.4, { color: '#ffffff' }); }
    L.ambient = .32;
    r.overlay(g => px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05070c')));
  }
  return { backdrop, drawBackdrop, get bg() { return bgMatch; } };
})();

scenes.title = (() => {
  let stage = 'press', t = 0, menu = null, logoT = 0;
  const tiles = () => [
    { id: 'story', label: Save.data.story.chapter > 1 || Save.stars() ? 'CUP RUN' : 'CUP RUN', sub: Save.data.story.chapter > 1 ? 'Continue: chapter ' + Save.data.story.chapter : 'New story', pick: () => game.go('storymap', null, { fade: 'wipe' }) },
    { id: 'exhibition', label: 'EXHIBITION', sub: '1-4 players', pick: () => game.go('sides', null, { fade: 'wipe' }) },
    { id: 'practice', label: 'PRACTICE', sub: "Marge's drills", pick: () => game.go('practice', null, { fade: 'wipe' }) },
    { id: 'records', label: 'RECORDS', sub: 'Stars and bests', pick: () => game.go('records', null, { fade: 'wipe' }) },
    { id: 'settings', label: 'SETTINGS', sub: 'Sound, camera, symbols', pick: () => game.menu('settings') },
    { id: 'about', label: 'ABOUT', sub: 'Credits and notes', pick: () => game.go('about', null, { fade: 'wipe' }) }
  ];
  function build() { menu = new UI.Tiles(tiles(), { layout: (r, its) => UI.grid(its.length, 3, r.W / 2, Math.round(r.H * .5), Math.min(124, Math.floor((r.W - 60) / 3)), 38, 8, 8), cancel: () => { stage = 'press'; } }); }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    get menuIndex() { return menu ? menu.i : -1; },
    enter(d) {
      t = 0; logoT = d && d.menu ? 9 : 0; stage = d && d.menu ? 'menu' : 'press'; build(); Title.backdrop('icebox'); Synth.music('theme'); UI.Idle.reset();
      Cam.apply('threequarter', .62); game.cam.smooth = .4; game.weather = null; game.input.consumeAll();
    },
    update(dt) {
      t += dt; logoT += dt; Glyphs.sync();
      if (M) { Match.step(dt); }
      game.focus(Rink.C.x + Math.sin(t * .1) * 120, Rink.C.y, 0);
      if (logoT > .55 && logoT - dt <= .55) { A.sfx('kaboom'); A.sfx('horn'); game.shake(4); P.explosion(Rink.C.x, Rink.C.y - 60, 40, 1.2, { shake: 0 }); }
      const idle = UI.Idle.update(dt);
      if (idle > 10 && !game.paused) return game.go('attract', null, { fade: 'dissolve' });
      if (Touch.only) { const c = game.input.clicked(); if (c && this.setBtn && c[0] > this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] > this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) game.menu('settings'); return; }
      if (stage === 'press') { if (logoT > .6 && (game.players.some(p => p.anyPressed()) || game.input.clicked())) { game.players.forEach(p => p.consumeAll()); stage = 'menu'; A.sfx('pick'); } return; }
      menu.update(dt);
    },
    draw(r) {
      Title.drawBackdrop(r, stage === 'menu' ? .55 : .35);
      r.overlay(g => {
        const sf = Hud.safe(r), k = Math.min(1, logoT / .55), sc = Math.max(3, Math.round(5 - k * 1.2)), y = Math.round(sf.y0 + (stage === 'menu' ? 2 : r.H * .18) - (1 - k) * 60);
        const sh = logoT > .55 && logoT < .9 ? Math.round(Math.sin(logoT * 80) * 3) : 0;
        UI.title(g, 'ICE HOC-KABOOM', r.W / 2 + sh, y, Math.min(sc, r.W < 360 ? 3 : 4), ['#ffffff', '#cfe8ff', '#ffd36a', '#ff7a2a', '#c01a1a']);
        UI.text(g, 'OVER-THE-TOP 3-ON-3 ARCADE HOCKEY', r.W / 2, y + 40, '#cfe8ff', { align: 'center' });
        if (Save.data.story.done) { px.rect(g, r.W / 2 - 4, y + 52, 8, 7, '#e8c040'); px.rect(g, r.W / 2 - 6, y + 50, 12, 3, '#ffe070'); UI.text(g, 'KABOOM CUP CHAMPIONS', r.W / 2, y + 62, UI.GOLD, { align: 'center' }); }
        if (Touch.only) {
          UI.panel(g, r.W / 2 - 130, r.H * .5, 260, 34, { border: '#ff7a5a' }); UI.text(g, 'Controller or keyboard required', r.W / 2, r.H * .5 + 6, '#ffffff', { align: 'center' }); UI.text(g, 'Connect one to play. The demo runs meanwhile.', r.W / 2, r.H * .5 + 18, UI.MUTED, { align: 'center' });
          this.setBtn = [Math.round(r.W / 2 - 60), Math.round(r.H * .5 + 48), 120, 30]; UI.panel(g, ...this.setBtn, { border: UI.GOLD }); UI.text(g, 'SETTINGS', r.W / 2, this.setBtn[1] + 9, UI.GOLD, { align: 'center', scale: 1 });
        } else if (stage === 'press') { if (Math.floor(t * 2) % 2 === 0) { const dev = game.input.lastDevice; UI.text(g, dev === 'gamepad' ? 'PRESS ANY BUTTON' : 'PRESS ANY KEY', r.W / 2, r.H * .62, '#ffffff', { align: 'center', scale: 2 }); } }
        else {
          menu.draw(g, r);
          const it = menu.items[menu.i]; UI.text(g, TEXT.menu[it.id] || '', r.W / 2, Math.round(r.H * .5) + 96, UI.MUTED, { align: 'center' });
          UI.legend(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
        }
        E.font.text(g, 'v' + VERSION + ' · '.replace('·', '-') + (E.versionLabel ? E.versionLabel().replace(/·/g, '-') : ''), sf.x0, r.H - 10, '#5a6a8a', { font: 'tiny', outline: false });
      });
    }
  };
})();

/* ---- attract mode: a looping AI reel through every feature, kiosk style; any input exits (PLAN 15.1) ---- */
scenes.attract = (() => {
  const SEG = [['PUCK DROP', 8], ['BIG HITS', 8], ['HIGHLIGHT GOAL', 12], ['GLOVES OFF', 10], ['KABOOM!', 10], ['FAN FRENZY', 7], ['THE CUP RUN', 8], ['THE FLOOD WAGON', 6], ['RECORDS', 5]];
  let seg = 0, t = 0, loop = 0, visited = new Set(), talk = null, did = {};
  const pairs = [['muskrats', 'drillers', 'icebox'], ['lumberjacks', 'bruisers', 'pond'], ['bruisers', 'muskrats', 'grindhouse'], ['marauders', 'lumberjacks', 'mall'], ['grizzlies', 'muskrats', 'dome']];
  function newMatch(intros) {
    const [h, a, ar] = pairs[loop % pairs.length];
    Match.start({ home: h, away: a, arena: ar, periods: 99, len: 999, attract: true, noTalk: false, noResults: true, intros: !!intros, replays: true, aiSkill: [.8, .8], seed: 100 + loop, cheats: { turbo: true } });
    M.attract = true; M.attractHud = false; Synth.music(M.arena.music || 'play');
    game.weather = M.arena.weather ? Object.assign({}, M.arena.weather) : null;
  }
  function begin(k) {
    seg = k; t = 0; did = {}; visited.add(k);
    const id = SEG[k][0];
    if (k === 0) newMatch(true);
    if (!M || !M.attract) newMatch(false);
    if (id === 'THE FLOOD WAGON') return game.go('flood', { auto: true, done: () => game.go('attract', { seg: 8, loop }, { fade: 'dissolve' }) }, { fade: 'dissolve' });
    if (id === 'THE CUP RUN') { talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a' }); }
  }
  const lineup = () => M.skaters.filter(s => s.state !== 'bin');
  function script(dt) {
    const id = SEG[seg][0], C = Rink.C;
    if (id === 'BIG HITS' && !did.hit && t > .5) {
      did.hit = true; const [a, b] = [M.skaters[0], M.skaters[3]];
      Object.assign(b, { x: C.x + 100, y: Rink.Y0 + 20, vx: 0, vy: 0, state: 'skate' }); Object.assign(a, { x: C.x + 100, y: Rink.Y0 + 90, vx: 0, vy: -240, facing: -PI / 2, state: 'skate', holdTurbo: true, turbo: 1 });
      if (M.phase !== 'play') Match.setPhase('play');
      Skater.check(a); Puck.take(b, M.puck);
    }
    if (id === 'BIG HITS' && did.hit && !did.glass && t > 1.6) { did.glass = true; Hits.breakPanel(Rink.panelAt(C.x + 100, Rink.Y0), 'shattered', M.skaters[3]); }
    if (id === 'HIGHLIGHT GOAL' && !did.set && t > .3) {
      did.set = true; if (M.phase !== 'play') Match.setPhase('play');
      const t0 = 0, g = Skater.attackGoal(t0), dir = -Rink.outDir(g.side), [c, w] = [M.skaters[0], M.skaters[1]];
      Object.assign(c, { x: g.x + dir * 120, y: C.y - 40, vx: -dir * 80, vy: 0, state: 'skate' }); Object.assign(w, { x: g.x + dir * 40, y: C.y + 34, vx: -dir * 30, vy: 0, state: 'skate' });
      for (const o of M.skaters.filter(s => s.team === 1)) Object.assign(o, { x: C.x - dir * 60, y: C.y + (o.slot - 1) * 60, vx: 0, vy: 0 });
      Puck.take(c, M.puck); M.goalies[1].slowT = 9;
    }
    if (id === 'HIGHLIGHT GOAL' && did.set && !did.pass && t > 1.1 && M.puck.owner === M.skaters[0]) { did.pass = true; const w = M.skaters[1]; Skater.pass(M.skaters[0], { to: w }); w.oneTimer = .9; M.goalies[1].track = null; M.goalies[1].x += 0; T._attractRead = T.goalieRead; T.goalieRead = 3; }
    if (id === 'HIGHLIGHT GOAL' && t > 4 && T._attractRead !== undefined) { T.goalieRead = T._attractRead; delete T._attractRead; }
    if (id === 'GLOVES OFF' && !did.fight && t > .3) { did.fight = true; if (M.phase !== 'play') Match.setPhase('play'); const a = M.skaters[2], b = M.skaters[5]; b.x = a.x + 20; b.y = a.y; M.fights = 0; M.lastFightClock = 1e9; Fight.begin(a, b); }
    if (id === 'KABOOM!' && !did.k && t > .3) {
      did.k = true; if (M.phase === 'fight' || M.phase !== 'play') { Fight.reset(); Match.setupFaceoff([C.x, C.y]); Match.setPhase('play'); M.puck.held = false; }
      Boom.start(0); const s = M.skaters[1], g = Skater.attackGoal(0), dir = -Rink.outDir(g.side);
      Object.assign(s, { x: g.x + dir * 110, y: C.y + 10, vx: 0, vy: 0, state: 'skate', facing: dir > 0 ? PI : 0 }); Puck.take(s, M.puck);
      s.ai.holdShoot = 0; s.shootHold = .19; s.winding = true; s.charge = .96; did.kStart = t;
    }
    if (id === 'KABOOM!' && did.k && !did.kShot && t - did.kStart > .6 && M.puck.owner === M.skaters[1]) { did.kShot = true; const s = M.skaters[1]; s.charge = 1; Skater.shoot(s, 'slap', 1, {}); }
    if (id === 'FAN FRENZY' && !did.items && t > .3) {
      did.items = true; if (M.phase !== 'play') { Match.setupFaceoff([C.x, C.y]); }
      for (let i = 0; i < 4; i++) { const s = M.skaters[i]; Items.throwOne(M.arena.items[i % M.arena.items.length], [s.x + 20, s.y]); }
      const s = M.skaters[4]; Items.throwOne('octopus', [s.x + s.vx * .8 + 10, s.y + s.vy * .8]);
    }
    if (id === 'THE CUP RUN') {
      const lines = [['marge', 'Sit down, shut up, and listen. I got a letter.'], ['glitterman', "Enjoy the barn, folks. I've ordered the parking meters. Gold ones."], ['snipes', "This barn's got more character than his whole bank account."]];
      const k = Math.floor(t / 2.6); if (k < 3 && !did['l' + k]) { did['l' + k] = true; const c = Rigs.cast(lines[k][0]); talk.voice = Synth.dialogVoice(c.voice); talk.say(lines[k][1], { name: c.name, portrait: c.rig, auto: 2.4, modal: false }); }
      if (talk) talk.update(dt);
    }
  }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    enter(d) { loop = d && d.loop !== undefined ? d.loop : 0; visited = d && d.visited ? d.visited : visited; if (d && d.seg !== undefined) { if (!M || !M.attract) newMatch(false); seg = d.seg; t = 0; visited.add(seg); did = {}; } else { loop = (loop || 0); visited = new Set(); begin(0); } game.input.consumeAll(); UI.Idle.reset(); },
    exit() { game.weather = null; if (T._attractRead !== undefined) { T.goalieRead = T._attractRead; delete T._attractRead; } },
    update(dt) {
      Glyphs.sync();
      // any input ends it (taps on a touch-only device don't: only the settings)
      const any = game.players.some(p => p.anyPressed()) || (!Touch.only && game.input.clicked()) || game.players.some(p => { const m = p.move(); return Math.hypot(m[0], m[1]) > .3; }) || UI.Idle.update(0) === 0 && false;
      if (any && !Touch.only) { game.players.forEach(p => p.consumeAll()); return game.go('title', { menu: false }, { fade: 'dissolve' }); }
      if (Touch.only && game.input.clicked()) { game.go('title'); return; }
      t += dt;
      if (SEG[seg][0] !== 'RECORDS' && M) { Match.step(dt); Talk.update(dt); Fx.step(dt); }
      script(dt);
      if (t > SEG[seg][1]) { if (seg + 1 >= SEG.length) { loop++; begin(0); } else begin(seg + 1); }
    },
    draw(r) {
      const id = SEG[seg][0];
      if (id === 'RECORDS') {
        r.sky(['#05070c', '#0a1020', '#141c34']);
        r.overlay(g => { UI.title(g, 'ICE HOC-KABOOM', r.W / 2, r.H * .18, 4); const R2 = Save.data.records; [['HARDEST SHOT', Math.round(R2.shot / 16 * 3.6) + ' KM/H'], ['BIGGEST HIT', Math.round(R2.hit)], ['MOST GOALS IN A GAME', R2.goals], ['STORY STARS', Save.stars() + '/15']].forEach(([a, b], i) => { UI.text(g, a, r.W / 2 - 10, r.H * .42 + i * 14, UI.MUTED, { align: 'right' }); UI.text(g, String(b), r.W / 2 + 10, r.H * .42 + i * 14, UI.GOLD); }); });
      } else if (M) { Draw.world(r); Hud.draw(r, 1 / 60); Talk.draw(r); if (talk && id === 'THE CUP RUN') talk.draw(r); }
      r.overlay(g => {
        const sf = Hud.safe(r);
        UI.panel(g, sf.x0, sf.y1 - 30, 52, 16, { border: '#ff4a4a' }); UI.text(g, 'DEMO', sf.x0 + 26, sf.y1 - 26, '#ff6a5a', { align: 'center' });
        UI.text(g, id, sf.x0 + 60, sf.y1 - 26, '#ffffff');
        if (Math.floor(game.time * 2) % 2 === 0) UI.text(g, Touch.only ? 'Controller or keyboard required' : game.input.lastDevice === 'gamepad' ? 'PRESS ANY BUTTON' : 'PRESS ANY KEY', r.W / 2, sf.y1 - 46, '#ffffff', { align: 'center', scale: Touch.only ? 1 : 2 });
        E.font.title(g, 'ICE HOC-KABOOM', sf.x1, sf.y1 - 24, { align: 'right', scale: 1, colors: ['#ffffff', '#ffd36a', '#ff7a2a'] });
      });
    },
    get state() { return { segment: seg, visited: [...visited], loop }; }
  };
})();

/* ---- exhibition: sides (every joined player picks HOME or AWAY) ---- */
scenes.sides = (() => {
  let tok = [], t = 0;
  const join = () => { while (tok.length < game.players.length) tok.push({ side: 0, ready: false }); };
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter() { tok = []; t = 0; game.allowJoin({ max: 4 }); join(); tok[0].side = -1; Synth.music('menu'); UI.Idle.reset(); },
    exit() { game.allowJoin(false); },
    update(dt) {
      t += dt; Glyphs.sync(); join();
      if (UI.Idle.update(dt) > 10 && game.players.length === 1) return game.go('attract', null, { fade: 'dissolve' });
      game.players.forEach((p, i) => {
        const k = tok[i]; if (!k) return;
        if (p.repeat('left', .3, .2)) { if (!k.ready) { k.side = Math.max(-1, k.side - 1); A.sfx('move'); } }
        if (p.repeat('right', .3, .2)) { if (!k.ready) { k.side = Math.min(1, k.side + 1); A.sfx('move'); } }
        if (p.pressed('confirm') || p.pressed('pass')) { if (k.side !== 0) { k.ready = !k.ready; A.sfx(k.ready ? 'pick' : 'back'); } else A.sfx('deny'); }
        if (p.pressed('cancel')) { if (k.ready) k.ready = false; else if (i === 0) { game.go('title', { menu: true }); } A.sfx('back'); }
        if (p.pressed('start') && i === 0) { tok.forEach(x => { if (x.side !== 0) x.ready = true; }); }
      });
      // the mouse: a click on HOME or AWAY moves the keyboard player's token
      const c = game.input.clicked(), r = game.r;
      if (c && r) { const W = r.W; tok[0].side = c[0] < W * .38 ? -1 : c[0] > W * .62 ? 1 : 0; tok[0].ready = false; A.sfx('move'); }
      const active = tok.filter(k => k.side !== 0);
      if (active.length && active.every(k => k.ready)) {
        const humans = []; tok.forEach((k, i) => { if (k.side !== 0) humans.push({ input: game.players[i], team: k.side < 0 ? 0 : 1, color: E.PLAYER_COLORS[i], i }); });
        game.go('setup', { humans }, { fade: 'wipe' });
      }
    },
    draw(r) {
      r.sky(['#0a1020', '#121c34', '#1a2a48']);
      r.overlay(g => {
        const sf = Hud.safe(r);
        UI.title(g, 'EXHIBITION', r.W / 2, sf.y0, 3);
        UI.text(g, 'CHOOSE YOUR SIDE', r.W / 2, sf.y0 + 30, UI.MUTED, { align: 'center' });
        const cols = [r.W * .2, r.W * .5, r.W * .8];
        [['HOME', '#5a3a22'], ['CPU', '#2a3448'], ['AWAY', '#d8d8e0']].forEach(([lab, c], k) => { UI.panel(g, cols[k] - 50, sf.y0 + 46, 100, 120, { border: k === 1 ? '#3a4a6a' : UI.GOLD }); UI.text(g, lab, cols[k], sf.y0 + 52, k === 1 ? UI.MUTED : UI.GOLD, { align: 'center', scale: 2 }); });
        tok.forEach((k, i) => {
          const x = cols[k.side + 1], y = sf.y0 + 76 + i * 22, col = E.PLAYER_COLORS[i] || '#ffffff';
          px.rect(g, x - 40, y, 80, 18, k.ready ? col : '#141820'); px.rect(g, x - 39, y + 1, 78, 16, k.ready ? '#141820' : '#1e2638');
          UI.text(g, 'P' + (i + 1) + (k.ready ? ' READY' : ''), x, y + 5, col, { align: 'center' });
          if (!k.ready) { E.font.text(g, '<', x - 36, y + 5, col, { outline: false }); E.font.text(g, '>', x + 32, y + 5, col, { outline: false }); }
        });
        UI.text(g, game.players.length < 4 ? 'More players: press START on a free controller, or 2 on the keyboard' : 'Four players: full house!', r.W / 2, sf.y0 + 172, '#ffffff', { align: 'center' });
        if (game.players.length > 1 && game.players.some(p => p.keys === 'right' || p.device === 'keyboard-right')) UI.text(g, 'Keyboard: P1 WASD + F G H R T Y  ·  P2 arrows + . / , L ; \''.replace('·', '|'), r.W / 2, sf.y0 + 184, UI.MUTED, { align: 'center' });
        UI.legend(g, r, [['left', 'SIDE'], ['confirm', 'READY'], ['start', 'ALL READY'], ['cancel', 'BACK']]);
      });
    }
  };
})();

/* ---- exhibition: setup (home team, barn, away team; periods, length, difficulty, cheats) ---- */
scenes.setup = (() => {
  let humans = [], st = null, menu = null;
  const avail = () => TEAM_IDS.filter(id => !TEAMS[id].locked || Save.data.story.done);
  const CHEATS = [['bigheads', 'BIG HEADS'], ['octorain', 'OCTOPUS RAIN'], ['glowpuck', 'GLOW PUCK'], ['alwayskaboom', 'ALWAYS KABOOM'], ['retro', 'RETRO RIGS']];
  function cycle(key, list, d) { const i = list.indexOf(st[key]); st[key] = list[(i + d + list.length) % list.length]; }
  function card(kind) {
    return { kind, adjust: d => kind === 'arena' ? cycle('arena', ARENA_IDS, d) : cycle(kind, avail(), d), click: c => {}, pick: () => { menu.i = menu.items.findIndex(x => x.id === 'go'); },
      draw: (g, x, y, w, h, f) => {
        UI.panel(g, x, y, w, h, { border: f ? UI.GOLD : UI.EDGE });
        if (kind === 'arena') { const a = ARENAS[st.arena]; UI.text(g, 'BARN', x + w / 2, y + 4, UI.MUTED, { align: 'center' }); UI.text(g, a.name.toUpperCase(), x + w / 2, y + 30, '#ffffff', { align: 'center', wrap: w - 8 }); UI.text(g, a.town, x + w / 2, y + 52, UI.MUTED, { align: 'center' }); }
        else {
          const tm = TEAMS[st[kind]]; UI.text(g, kind === 'home' ? 'HOME (DARK)' : 'AWAY (WHITE)', x + w / 2, y + 4, UI.MUTED, { align: 'center' });
          px.sprite(g, LOGOS.sprite(tm.logo), Math.round(x + w / 2 - 12), y + 27, { scale: 2 }); UI.text(g, tm.short, x + w / 2, y + 66, '#ffffff', { align: 'center' });
          const avg = k => tm.skaters.reduce((s, p) => s + p[k], 0) / 3;
          [['SPEED', avg('spd')], ['SHOOTING', avg('sht')], ['HITTING', avg('hit')], ['GOALIE', tm.goalie.rfx]].forEach(([lab, v], i) => { UI.text(g, lab, x + 6, y + 80 + i * 10, UI.MUTED, { font: 'tiny' }); for (let p = 0; p < 5; p++) px.rect(g, x + w - 46 + p * 8, y + 81 + i * 10, 6, 5, p < Math.round(v) ? UI.GOLD : '#2a3448'); });
        }
        if (f) { E.font.text(g, '<', x + 3, y + h / 2, UI.GOLD, { outline: false }); E.font.text(g, '>', x + w - 7, y + h / 2, UI.GOLD, { outline: false }); }
      } };
  }
  function chip(id, label, opts, key) {
    return { id, adjust: d => { const i = opts.indexOf(st[key]); st[key] = opts[(i + d + opts.length) % opts.length]; }, pick: () => { const i = opts.indexOf(st[key]); st[key] = opts[(i + 1) % opts.length]; },
      draw: (g, x, y, w, h, f) => { UI.panel(g, x, y, w, h, { border: f ? UI.GOLD : UI.EDGE }); UI.text(g, label, x + w / 2, y + 3, UI.MUTED, { align: 'center', font: 'tiny' }); UI.text(g, String(st[key]), x + w / 2, y + 13, f ? UI.GOLD : '#ffffff', { align: 'center' }); } };
  }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter(d) {
      humans = (d && d.humans) || [{ input: game.input, team: 0, i: 0 }];
      st = { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: S().periodLen || '2:00', difficulty: S().difficulty || 'Pro', cheat: 'NONE' };
      const unlockedCheats = ['NONE', ...CHEATS.filter(c => Save.unlocked(c[0])).map(c => c[1])];
      const items = [Object.assign(card('home'), { id: 'home' }), Object.assign(card('arena'), { id: 'arena' }), Object.assign(card('away'), { id: 'away' }),
        chip('per', 'PERIODS', [1, 2, 3], 'periods'), chip('len', 'LENGTH', ['1:00', '1:30', '2:00', '3:00', '4:00'], 'len'), chip('diff', 'DIFFICULTY', ['Rookie', 'Pro', 'All-Star', 'Legend'], 'difficulty'), chip('cheat', 'CHEATS', unlockedCheats, 'cheat'),
        { id: 'go', label: 'FACE OFF!', pick: () => go() }];
      menu = new UI.Tiles(items, { start: 7, wrap: false, cancel: () => game.go('sides'), layout: r => {
        const w = Math.min(110, Math.floor((r.W - 40) / 3)), cy = 40, out = UI.grid(3, 3, r.W / 2, cy, w, 120, 8), cw = Math.min(70, Math.floor((r.W - 50) / 4)), chips = UI.grid(4, 4, r.W / 2, cy + 128, cw, 26, 6);
        return out.concat(chips, [{ x: Math.round(r.W / 2 - 60), y: cy + 160, w: 120, h: 24 }]); } });
      Synth.music('menu'); UI.Idle.reset();
    },
    update(dt) { Glyphs.sync(); menu.update(dt); if (UI.Idle.update(dt) > 10 && game.players.length === 1) game.go('attract', null, { fade: 'dissolve' }); },
    draw(r) { r.sky(['#0a1020', '#121c34', '#1a2a48']); r.overlay(g => { UI.title(g, 'SETUP', r.W / 2, 8, 2); menu.draw(g, r); UI.legend(g, r, [['left', 'CHANGE'], ['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
  };
  function go() {
    const cheat = CHEATS.find(c => c[1] === st.cheat), cheats = {};
    if (cheat) cheats[cheat[0] === 'alwayskaboom' ? 'alwaysKaboom' : cheat[0]] = true;
    Rigs.bigHeads = !!cheats.bigheads; Rigs.retro = !!cheats.retro; Rigs.glow = !!cheats.glowpuck;
    game.go('match', { home: st.home, away: st.away, arena: st.arena, periods: st.periods, len: Match.PERIOD_LEN[st.len] || 120, ot: true, shootout: true, difficulty: st.difficulty, cheats, humans, flood: true, exhibition: true }, { fade: 'iris' });
  }
})();

/* ---- results: the final score, three stars one by one, objectives, records ---- */
scenes.results = (() => {
  let m = null, t = 0, menu = null, story = 0, out = null, said = -1;
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
    enter(d) {
      m = d.m; story = d.story || 0; t = 0; said = -1;
      out = story ? Story.finish(m, story) : null;
      // records
      for (const s of m.skaters) { const st = m.stats[s.id]; if (s.ctrl !== 'cpu' || m.humans.some(h => h.team === s.team)) { Save.record('shot', st.topShot); Save.record('goals', st.goals); } }
      const hits = m.events.filter(e => e.type === 'hit' && m.humans.some(h => h.team === e.team)).map(e => e.power); if (hits.length) Save.record('hit', Math.max(...hits));
      const fw = m.events.filter(e => e.type === 'fight_end' && m.humans.some(h => h.team === e.winnerTeam)).length; if (fw) Save.add('fights', fw);
      const kb = m.humans.length ? m.kabooms[m.humans[0].team] : 0; if (kb) Save.add('kabooms', kb);
      const humanTeam = m.humans.length ? m.humans[0].team : 0, won = m.winner === humanTeam;
      Synth.music(won ? 'victory' : 'defeat');
      const items = story ? (out.won ? [{ label: 'CONTINUE', pick: () => game.go('cutscene', { id: Story.chapter(story).post, next: story === 5 ? 'ending' : 'storymap' }, { fade: 'wipe' }) }]
        : [{ label: 'RETRY', pick: () => Story.play(story) }, { label: 'BACK TO MAP', pick: () => game.go('storymap') }])
        : [{ label: 'REMATCH', pick: () => game.go('match', Object.assign({}, m.cfg, { seed: (m.cfg.seed || 1) + 7 })) }, { label: 'MAIN MENU', pick: () => game.go('title', { menu: true }) }];
      menu = new UI.Tiles(items, { layout: (r, its) => UI.grid(its.length, its.length, r.W / 2, r.H - 52, 110, 26, 10) });
    },
    update(dt) { t += dt; Glyphs.sync(); if (t > 1) menu.update(dt); const k = Math.floor((t - 1) / 1.6); if (k >= 0 && k < 3 && k !== said) { said = k; const s = m.stars[2 - k]; if (s) { const line = s.goalie ? U.pick(RNG.fx, TEXT.goalieStar) : TEXT.stars[(2 - k) * 0 + [0, 1, 2][k] + 3 * Math.floor(RNG.fx() * 4)]; Talk.sayAs('chuck', U.fill(line, { name: s.name, g: s.g, sv: s.sv })); A.sfx('star'); } } Talk.update(dt); },
    draw(r) {
      r.sky(['#05070c', '#0e1424', '#1a2440']);
      r.overlay(g => {
        const sf = Hud.safe(r), w = m.winner, ht = m.humans.length ? m.humans[0].team : 0;
        UI.title(g, w < 0 ? 'TIE GAME' : story ? (w === 0 ? 'VICTORY!' : 'DEFEAT') : (w === ht ? 'YOU WIN!' : m.teams[w].short + ' WIN'), r.W / 2, sf.y0, 3);
        for (const t2 of [0, 1]) { const x = r.W / 2 + (t2 ? 60 : -60); px.sprite(g, LOGOS.sprite(m.teams[t2].logo), x - 12, sf.y0 + 30, { scale: 1 }); UI.title(g, String(m.score[t2]), x, sf.y0 + 56, 3, ['#ffffff', '#e0e8ff', '#a0b0d0']); UI.text(g, m.teams[t2].abbr, x, sf.y0 + 84, UI.MUTED, { align: 'center' }); }
        UI.text(g, m.soWin !== undefined ? '(SHOOTOUT)' : m.ot ? '(OVERTIME)' : '', r.W / 2, sf.y0 + 64, UI.MUTED, { align: 'center' });
        // three stars, revealed one by one (third, second, first)
        (m.stars || []).forEach((s, i) => {
          const k = 2 - i, show = t > 1 + k * 1.6; if (!show) return;
          const x = Math.round(r.W / 2 + (i - 1) * 100 - 44), y = sf.y0 + 96;
          UI.panel(g, x, y, 88, 52, { border: UI.GOLD }); s.rig.drawPortrait(g, x + 3, y + 3, 30, { zoom: 2.6, bg: '#101420' });
          for (let j = 0; j <= i; j++) E.font.text(g, '★', x + 40 + j * 8, y + 4, UI.GOLD, { outline: false });
          UI.text(g, s.name.toUpperCase().slice(0, 12), x + 36, y + 16, '#ffffff', { font: { font: 'tiny' } }); UI.text(g, s.line, x + 4, y + 40, UI.MUTED, { font: 'tiny' });
        });
        if (out) {
          const ch = Story.chapter(story); ch.objectives.forEach((o, k) => { const on = out.stars[k] && t > 5 + k * .4; UI.text(g, (on ? '★ ' : '- ') + o.text, r.W / 2 - 90, sf.y0 + 156 + k * 10, on ? UI.GOLD : '#9fb0c8'); });
          if (out.unlocks.length && t > 6.5) UI.text(g, 'UNLOCKED: ' + out.unlocks.join(', '), r.W / 2, r.H - 70, '#7aff9a', { align: 'center' });
          if (!out.won && t > 5) UI.text(g, 'MARGE: "' + STORY.PEP[story - 1] + '"', r.W / 2, r.H - 70, '#ffd0ff', { align: 'center', wrap: r.W - 40 });
        }
        if (t > 1) menu.draw(g, r);
      });
      Talk.draw(r);
    }
  };
})();

/* ---- records: a few big numbers ---- */
scenes.records = {
  view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
  enter() { this.page = 0; UI.Idle.reset(); Synth.music('menu'); },
  update(dt) { Glyphs.sync(); if (UI.anyPressed('cancel') || UI.anyPressed('confirm') || game.input.clicked()) { game.players.forEach(p => p.consumeAll()); A.sfx('back'); game.go('title', { menu: true }); } if (UI.anyRepeat('left') || UI.anyRepeat('right') || UI.anyPressed('tabL') || UI.anyPressed('tabR')) this.page ^= 1; if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' }); },
  draw(r) {
    r.sky(['#0a1020', '#121c34', '#1a2a48']);
    r.overlay(g => {
      const R2 = Save.data.records, sf = Hud.safe(r);
      UI.title(g, 'RECORDS', r.W / 2, sf.y0, 3);
      const rows = this.page ? [['STORY STARS', Save.stars() + ' / 15'], ['DRILLS', Object.keys(Save.data.drills).length + ' / 7'], ['MARGE APPROVED', Object.keys(Save.data.drills).length >= 7 ? 'YES!' : 'NOT YET']]
        : [['HARDEST SHOT', Math.round(R2.shot / 16 * 3.6) + ' km/h'], ['BIGGEST HIT', Math.round(R2.hit)], ['MOST GOALS IN A GAME', R2.goals], ['FIGHTS WON', R2.fights], ['KABOOMS', R2.kabooms]];
      rows.forEach(([a, b], i) => { const y = sf.y0 + 40 + i * 30; UI.panel(g, r.W / 2 - 130, y, 260, 26); UI.text(g, a, r.W / 2 - 120, y + 9, UI.MUTED); UI.text(g, String(b), r.W / 2 + 120, y + 5, UI.GOLD, { align: 'right', scale: 2 }); });
      UI.text(g, 'PAGE ' + (this.page + 1) + ' / 2', r.W / 2, r.H - 34, UI.MUTED, { align: 'center' });
      UI.legend(g, r, [['left', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- about: credits, Source Information, the feedback pages and the engine changes (PLAN 12.1) ---- */
scenes.about = {
  view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', touch: [],
  enter() { this.page = 0; UI.Idle.reset(); Synth.music('menu'); },
  update(dt) {
    Glyphs.sync(); const n = ABOUT.length;
    const c = game.input.clicked(), r = game.r;
    if (UI.anyRepeat('right') || UI.anyPressed('tabR') || (c && r && c[0] > r.W - 40)) { this.page = (this.page + 1) % n; this.sc = 0; A.sfx('move'); }
    else if (UI.anyRepeat('left') || UI.anyPressed('tabL') || (c && r && c[0] < 40)) { this.page = (this.page + n - 1) % n; this.sc = 0; A.sfx('move'); }
    if (UI.anyRepeat('down')) this.sc = Math.min((this.sc || 0) + 1, Math.max(0, (this.nl || 0) - 4)); if (UI.anyRepeat('up')) this.sc = Math.max(0, (this.sc || 0) - 1);
    if (UI.anyPressed('cancel')) { A.sfx('back'); game.go('title', { menu: true }); }
    if (UI.Idle.update(dt) > 10) game.go('attract', null, { fade: 'dissolve' });
  },
  draw(r) {
    r.sky(['#0a1020', '#121c34', '#1a2a48']);
    r.overlay(g => {
      const [head, lines] = ABOUT[this.page], sf = Hud.safe(r), w = Math.min(r.W - 70, 560);
      UI.title(g, head, r.W / 2, sf.y0, 2);
      UI.panel(g, r.W / 2 - w / 2 - 6, sf.y0 + 24, w + 12, r.H - sf.y0 - 64);
      const all = []; for (const line of lines) { E.font.wrap(line, w - 6, {}).forEach((l, i) => all.push([l, i === 0 && line.startsWith('-')])); all.push(null); }
      this.nl = all.length; let y = sf.y0 + 30;
      for (const it of all.slice(this.sc || 0)) { if (y > r.H - 52) { E.font.text(g, 'MORE: DOWN', r.W / 2 + w / 2 - 50, r.H - 46, UI.GOLD, { outline: false }); break; } if (!it) { y += 3; continue; } UI.text(g, it[0], r.W / 2 - w / 2, y, it[1] ? '#ffffff' : '#d8e0f0'); y += 9; }
      E.font.text(g, '<', 14, r.H / 2, UI.GOLD, { scale: 2, outline: false }); E.font.text(g, '>', r.W - 24, r.H / 2, UI.GOLD, { scale: 2, outline: false });
      UI.text(g, (this.page + 1) + ' / ' + ABOUT.length, r.W / 2, r.H - 34, UI.MUTED, { align: 'center' });
      UI.legend(g, r, [['tabL', 'PREV'], ['tabR', 'NEXT'], ['down', 'SCROLL'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- the end credits: the roll over the run's best clips, then Marge, then the title with the Cup ---- */
scenes.credits = (() => {
  let t = 0, clips = [], ci = 0, ending = false, said = false;
  const ROLL = ['ICE HOC-KABOOM', '', 'A game by Claude (claude-opus-5-5)', 'for the cc-matrix', '', 'ENGINE', 'my-3D2dge v0.85.2 (MIT)', '', 'ONLINE', 'AI Hub session client 1.4.0', '', 'SOUND', 'Every song, sound and voice', 'synthesized in code', '', 'STARRING', 'The Mukluk Falls Muskrats', 'Coach Marge Pelletier', 'Old Gus and Doris', '', 'AND THE VILLAINS', 'Goldie Glitterman', 'The Gilded Grizzlies', '', 'No pucks were harmed', 'in the making of this game.', '', 'Thanks for playing!'];
  function nextClip() {
    const c = clips[ci++ % Math.max(1, clips.length)];
    if (c && c.cfg) { Match.start({ home: c.cfg.home, away: c.cfg.away, arena: c.cfg.arena, periods: 99, len: 999, attract: true, noTalk: true, noResults: true, intros: false }); M.attractHud = true; Match.setPhase('replay'); Replay.start(c.frames.slice(), .5); }
    else { Match.start({ home: 'muskrats', away: 'grizzlies', arena: 'icebox', periods: 99, len: 999, attract: true, noTalk: true, noResults: true, intros: false, aiSkill: [.8, .8] }); M.attractHud = true; }
  }
  return {
    view: 'threequarter', input: HOCKEY_KEYS, res: 'ps1', camera: { zoom: false }, touch: [],
    enter(d) { t = 0; ending = !!(d && d.ending); clips = Replay.highlights.slice(); ci = 0; said = false; nextClip(); Synth.music('credits'); },
    update(dt) {
      t += dt; Glyphs.sync();
      if (M) { if (M.phase === 'replay') { Replay.step(dt); if (Replay.done()) { Replay.stop(); nextClip(); } } else { Match.step(dt); } }
      if (t > ROLL.length * 1.1 + 6 && !said) { said = true; Talk.sayAs('marge', 'Same time next year.'); Synth.babble('Same time next year.', 'marge'); }
      Talk.update(dt);
      if (t > ROLL.length * 1.1 + 10 || (t > 2 && (UI.anyPressed('confirm') || UI.anyPressed('cancel')))) { game.players.forEach(p => p.consumeAll()); Replay.clearHighlights(); game.go('title', { menu: true }, { fade: 'white' }); }
    },
    draw(r) {
      if (M) Draw.world(r);
      r.overlay(g => {
        px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05070c'));
        ROLL.forEach((l, i) => { const y = r.H + 10 + i * 14 - t * 13; if (y < -10 || y > r.H + 10) return; if (i === 0) UI.title(g, l, r.W / 2, y, 2); else UI.text(g, l, r.W / 2, y, l === l.toUpperCase() && l.length < 22 ? UI.GOLD : '#ffffff', { align: 'center' }); });
        if (ending) UI.text(g, 'THE KABOOM CUP STAYS IN MUKLUK FALLS', r.W / 2, 10, UI.GOLD, { align: 'center' });
      });
      Talk.draw(r);
    }
  };
})();
