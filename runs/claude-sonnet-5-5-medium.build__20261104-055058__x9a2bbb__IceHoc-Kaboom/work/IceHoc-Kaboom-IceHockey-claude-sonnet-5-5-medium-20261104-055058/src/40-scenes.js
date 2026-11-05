/* ---- SAVE, RECORDS, SHARED MENU BACKDROP, IDLE ---- */
const Save = (() => {
  const KEY = 'ihk:save'; let d = null;
  const def = () => ({ chapter: 1, unlocked: 1, stars: {}, choices: {}, drills: {}, records: { hardest: 0, biggestHit: 0, mostGoals: 0, fights: 0, kabooms: 0 }, cups: false, cheats: {}, seen: false });
  const load = () => { try { d = Object.assign(def(), HUB ? {} : E.store.get(KEY, {})); } catch (e) { d = def(); } return d; };
  const get = () => d || load();
  const write = () => { if (HUB) return; try { E.store.set(KEY, d); } catch (e) {} };
  const totalStars = () => Object.values(get().stars).reduce((a, b) => a + b, 0);
  const cheats = () => { const t = totalStars(), c = get().cheats; return { bigHeads: t >= 3, octopus: t >= 6, glow: t >= 9, always: t >= 12, retro: t >= 15 }; };
  return { get, write, load, totalStars, cheats, reset() { d = def(); write(); } };
})();

const Backdrop = (() => {
  let m = null, t = 0, last = 0;
  function ensure(arena = 'icebox', home = 'muskrats', away = 'drillers') {
    if (m && m.cfg.arena === arena && !m.over) return m;
    m = Match.create({ home, away, arena, humans: [], noItems: true, noFight: true, noBoom: true, periods: 9, periodLen: 999, noReplay: true, replays: false, ot: false, shootout: false, seed: 11, bg: true }); m.phase = 'faceoff'; m.hideHud = true; m.silent = true; return m;
  }
  function step(dt) { if (!m) ensure(); Flow.step(m, dt); if (m.phase !== 'play' && m.phase !== 'faceoff') { m.phase = 'play'; m.phaseNoPlay = false; } if (m.clock < 100) m.clock = 900; t += dt; }
  function draw(r, o = {}) {
    if (!m) ensure(); const mm = m; game.setZoom(o.zoom || .62); Cam.setView('threequarter'); const a = t * .12, cx = Rink.CX + Math.sin(a) * 260, cy = Rink.CY + Math.cos(a * 1.3) * 60; game.focus(cx, cy, 6);
    DrawMatch.draw(r, mm, t); const sp = Math.sin(t * .7); r.overlay(g => { px.blend(g, .25, 'add', () => { px.poly(g, [[r.W * (.3 + sp * .2), 0], [r.W * (.34 + sp * .2), 0], [r.W * (.6 + sp * .3), r.H], [r.W * (.45 + sp * .3), r.H]], '#9ab8ff'); px.poly(g, [[r.W * (.7 - sp * .2), 0], [r.W * (.74 - sp * .2), 0], [r.W * (.4 - sp * .3), r.H], [r.W * (.25 - sp * .3), r.H]], '#ffd890'); }); });
  }
  return { ensure, step, draw, get m() { return m; }, kill() { m = null; } };
})();

const Idle = (() => {
  let t = 0, lastP = [0, 0];
  const touchOnly = () => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !seenKey && !padSeen; } catch (e) { return false; } };
  let seenKey = false, padSeen = false;
  try { addEventListener('keydown', () => { seenKey = true; }); addEventListener('gamepadconnected', () => { padSeen = true; }); } catch (e) {}
  function tick(dt) {
    if (HUB) return false; const I = game.input; let act = false; try { act = I.anyPressed(); } catch (e) {}
    const p = UI.pointer(); if (p && (Math.abs(p[0] - lastP[0]) + Math.abs(p[1] - lastP[1]) > 8)) { act = true; lastP = [p[0], p[1]]; }
    if (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3) act = true; if (game.paused) act = true;
    if (act) t = 0; else t += dt; if (t >= 10) { t = 0; return true; } return false;
  }
  return { tick, reset() { t = 0; }, touchOnly };
})();

/* ---- SCENES ---- */
const Scenes = (() => {
  const sc = {}; let ctxMatch = null; // { kind, ... } what the match scene is for
  const TITLE_ITEMS = () => { const sv = Save.get(), has = sv.chapter > 1 || Object.keys(sv.stars).length; return [{ label: 'CUP RUN', sub: has ? 'CONTINUE' : 'NEW GAME', onPick: () => { Synth.sfx('fanfare'); game.go('storymap'); } }, { label: 'EXHIBITION', sub: '1-4 PLAYERS', onPick: () => game.go('sides') }, { label: 'PRACTICE', sub: "MARGE'S DRILLS", onPick: () => game.go('practice') }, { label: 'RECORDS', sub: 'BRAG SHEET', onPick: () => game.go('records') }, { label: 'SETTINGS', sub: 'OPTIONS', onPick: () => game.menu('settings') }, { label: 'ABOUT', sub: 'CREDITS & INFO', onPick: () => game.go('about') }]; };
  // ---- title ----
  sc.title = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], res: 'ps1', expand: true,
    enter(d) { this.t = 0; this.state = Idle.touchOnly() ? 'touch' : 'press'; Backdrop.ensure('icebox'); Synth.music('theme'); Synth.reset && 0; Idle.reset(); this.tiles = new UI.Tiles(TITLE_ITEMS(), { cols: 3, w: 104, h: 36, gap: 6, y: 112 }); this.slam = 0; game.weather = null; Talk.reset(); Cam.reset(); game.cam.smooth = 0; },
    update(dt) {
      this.t += dt; Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' });
      const I = game.input;
      if (this.state === 'touch') { const c = I.clicked && I.clicked(); if (c && this.btn && c[0] > this.btn[0] && c[0] < this.btn[0] + this.btn[2] && c[1] > this.btn[1] && c[1] < this.btn[1] + this.btn[3]) game.menu('settings'); if (I.anyPressed()) this.state = 'press'; return; }
      if (this.state === 'press') { if (this.t > .6 && (I.anyPressed() || (I.clicked && I.clicked()))) { this.state = 'main'; this.tiles.items = TITLE_ITEMS(); Synth.sfx('ok'); I.consumeAll(); } return; }
      this.tiles.update(dt);
    },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.35)'); const u = clamp(this.t / .5, 0, 1), sc_ = 4 - (1 - u) * 1.5; UI.title(g, 'ICE HOC-KABOOM', r.W / 2, 28 + (1 - u) * -20, 4, ['#ffffff', '#ffe08a', '#ff9a2a', '#e0402a']); UI.txt(g, 'OVER-THE-TOP 3-ON-3 ARCADE HOCKEY', r.W / 2, 72, '#cfe0ff', { align: 'center' });
      if (this.state === 'press') { if (Math.floor(game.time * 2) % 2) Glyphs.text(g, 'PRESS ANY BUTTON', r.W / 2, 150, { align: 'center', color: '#ffe08a', scale: 2 }); }
      else if (this.state === 'touch') { UI.box(g, r.W / 2 - 100, 112, 200, 40, { border: '#ff6a6a' }); UI.txt(g, 'Controller or keyboard required', r.W / 2, 124, '#fff', { align: 'center' }); this.btn = [r.W / 2 - 40, 160, 80, 24]; UI.box(g, this.btn[0], this.btn[1], this.btn[2], this.btn[3], { border: UI.GOLD }); UI.txt(g, 'SETTINGS', r.W / 2, 168, UI.GOLD, { align: 'center' }); }
      else { this.tiles.draw(g, r); UI.legend(g, r, ['{pass} SELECT', '{deke} BACK']); }
      UI.txt(g, E.versionLabel ? E.versionLabel() + ' - game ' + VERSION : VERSION, 4, r.H - 8, '#667', { font: 'tiny' }); }); }
  };
  // ---- match scene ----
  function matchEnter(d) {
    ctxMatch = d; Fx.hook(); Talk.reset(); UI.clearBanners(); Replay.reset(); Cam.reset(); Synth.reset();
    const m = Match.create(d.cfg); m.ctx = d; Objectives.reset(d.cfg.story || null);
    game.cam.smooth = 0; Backdrop.kill(); Dev.attach(m); if (m.cfg.session) m.hideHud = false;
    Cam.snap(Rink.CX, Rink.CY); const s0 = Save.get(); if (!HUB) Talk.loadTips();
    if (S('intros') === 'Off' || m.cfg.noIntro) { m.phase = 'faceoff'; }
    Synth.music(m.arena.music === 'play' ? 'play' : m.arena.music);
    if (Save.cheats().bigHeads && Save.get().cheats.bigHeads) for (const s of m.sk) s.rig.o.headR = (s.rig.o.headR || 1) * 1.8;
    game.weather = m.arena.weather ? { kind: m.arena.weather, amount: .5 } : null;
    game.lights.enabled = true; Crowd.reset(); Synth.crowdStart();
    if (m.phase === 'faceoff') Match.faceoffNow(Rink.CX, Rink.CY, true);
    Talk.showTip('skate'); if (d.cfg.drill) Drills.begin(m, d.cfg.drill);
    if (d.cfg.startShootout) { m.ot = true; Shootout.begin(m); } if (d.cfg.startFlood) Flood.begin(m, () => Match.faceoffNow(Rink.CX, Rink.CY, true));
  }
  function musicLayers(m) { try { A.layer('drive', m.period >= 3 || m.ot ? 1 : 0, .5); A.layer('kaboom', m.kaboom[0] > 0 || m.kaboom[1] > 0 ? 1 : 0, .3); A.layer('kaboomdrums', m.kaboom[0] > 0 || m.kaboom[1] > 0 ? 1 : 0, .3); A.layer('fight', m.phase === 'fight' ? 1 : 0, .3); } catch (e) {} }
  sc.match = { pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], res: 'ps1', expand: true,
    enter: matchEnter, exit() { game.weather = null; game.setZoom(1); },
    update(dt) {
      const m = Match.cur(); if (!m) return; if (Dev.holds(m)) { Dev.update(dt); Cam.update(m, dt); Talk.update(dt); return; }
      Flow.step(m, dt); Drills.step(m, dt); Talk.update(dt); Cam.update(m, dt); Dev.update(dt); musicLayers(m);
      if (m.phase === 'play' && !(m.t % 7 < 0.01)) { /* tips */ }
      if (m.over && !m.handled) { m.handled = true; Scenes.matchDone(m); }
      if (game.input.pressed('camera')) { game.settings.set('camMode', S('camMode') === 'Broadcast' ? 'Overhead' : 'Broadcast'); }
    },
    draw(r) { const m = Match.cur(); if (!m) return; DrawMatch.draw(r, m, game.time); r.overlay(g => { Drills.draw(g, r, m); Dev.draw(g, r); }); }
  };
  function matchDone(m) {
    const d = m.ctx || {}; Results.compute(m); Results.record(m);
    if (m.cfg.drill) return Drills.finish(m);
    if (m.cfg.session) return;
    game.go('results', { m, ctx: d }, { fade: 'iris' });
  }
  function restartMatch() { const d = ctxMatch; if (d) game.go('match', { cfg: Object.assign({}, d.cfg, { seed: (Date.now() & 0xffffff) }), ret: d.ret, story: d.story }, { fade: 'wipe' }); }
  // ---- exhibition: sides ----
  const ex = { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 90, diff: -1, humans: [] };
  sc.sides = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter() { Backdrop.ensure(); this.tok = [{ pad: null, side: -1, ready: false, name: 'P1', input: game.players[0] }]; this.t = 0; game.allowJoin({ max: 4, onJoin: (inp) => { this.tok.push({ input: inp, side: -1, ready: false, name: 'P' + inp.player }); Synth.sfx('pickup'); } }); Idle.reset(); },
    exit() { game.allowJoin(false); },
    update(dt) {
      this.t += dt; Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' });
      const players = game.players; for (const p of players) if (!this.tok.find(k => k.input === p)) this.tok.push({ input: p, side: -1, ready: false, name: 'P' + p.player });
      for (const k of this.tok) { const I = k.input; if (!k.ready) { if (I.pressed('left')) { k.side = k.side === 1 ? -1 : 0; Synth.sfx('mv'); } if (I.pressed('right')) { k.side = k.side === 0 ? -1 : 1; Synth.sfx('mv'); } } if (I.pressed('confirm') && !k.ready) { k.ready = true; Synth.sfx('ok'); } else if (I.pressed('cancel')) { if (k.ready) k.ready = false; else if (k === this.tok[0]) { game.go('title'); return; } } }
      const c = game.input.clicked && game.input.clicked(); if (c) { const k = this.tok.find(q => q.input.lastDevice === 'keyboard' || q.input.lastDevice === 'mouse') || this.tok[0]; k.side = c[0] < game.W / 2 - 30 ? 0 : c[0] > game.W / 2 + 30 ? 1 : -1; }
      if (this.tok.every(k => k.ready) && this.t > .4) { ex.humans = this.tok.filter(k => k.side >= 0).map(k => ({ side: k.side, input: k.input, seat: k.input.player - 1 })); if (!this.tok.some(k => k.side >= 0)) ex.humans = [{ side: 0, input: this.tok[0].input, seat: 0 }]; game.go('setup'); }
    },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.6)'); UI.title(g, 'CHOOSE YOUR SIDES', r.W / 2, 14, 3); const cx = r.W / 2; UI.box(g, cx - 130, 52, 80, 110, { border: '#7aa7ff', alpha: .9 }); UI.box(g, cx + 50, 52, 80, 110, { border: '#ff8a6a', alpha: .9 }); UI.txt(g, 'HOME', cx - 90, 58, '#7aa7ff', { align: 'center', scale: 2 }); UI.txt(g, 'AWAY', cx + 90, 58, '#ff8a6a', { align: 'center', scale: 2 }); UI.txt(g, 'CPU', cx, 58, '#9ab', { align: 'center', scale: 2 });
      this.tok.forEach((k, i) => { const x = k.side === 0 ? cx - 90 : k.side === 1 ? cx + 90 : cx, y = 82 + i * 20, col = E.PLAYER_COLORS[(k.input.player || 1) - 1]; px.disc(g, x - 20, y + 5, 8, col); UI.txt(g, 'P' + k.input.player, x - 20, y + 2, '#000', { align: 'center' }); UI.txt(g, k.ready ? 'READY' : (k.input.device === 'keyboard' || !k.input.device ? 'KEYS' : 'PAD'), x + 6, y + 2, k.ready ? '#6ae06a' : '#cfe', {}); });
      UI.txt(g, 'Press START on a free controller, or 2 on the keyboard, to join', r.W / 2, 176, '#9ab', { align: 'center' }); Glyphs.text(g, '← ▸ MOVE   {pass} READY   {deke} BACK', r.W / 2, r.H - 12, { align: 'center', color: '#c8d4f0' });
      const ks = game.players.filter(p => p.half || game.players.length > 1); if (game.players.length > 1) UI.txt(g, 'P1: WASD + F G H R T Y     P2: ARROWS + . / , L ; \'', r.W / 2, 188, '#7a8ab0', { align: 'center', font: 'tiny' }); }); }
  };
  // ---- exhibition: setup ----
  const PL = [[1, 'Period 1'], [2, '2'], [3, '3']];
  sc.setup = { view: 'threequarter', input: HOCKEY_KEYS, touch: [], expand: true,
    enter() { Backdrop.ensure(); this.cols = [{ k: 'home' }, { k: 'arena' }, { k: 'away' }]; this.f = 3; this.i = 0; this.opts = [{ k: 'periods', l: 'PERIODS', v: [1, 2, 3] }, { k: 'len', l: 'LENGTH', v: [60, 90, 120, 180, 240] }, { k: 'diff', l: 'DIFFICULTY', v: [-1, 0, 1, 2, 3] }, { k: 'cheat', l: 'CHEATS', v: ['None'].concat(Object.entries(Save.cheats()).filter(([k, v]) => v).map(([k]) => k)) }]; this.o = 0; this.t = 0; ex.cheat = ex.cheat || 'None'; Idle.reset(); },
    ids() { return Save.get().cups ? TEAMS.map(t => t.id) : TEAMS.filter(t => t.id !== 'grizzlies').map(t => t.id); },
    update(dt) {
      this.t += dt; Backdrop.step(dt); if (Idle.tick(dt)) return game.go('attract', null, { fade: 'dissolve' }); const I = game.input;
      const rows = 5; if (I.pressed('up')) { this.i = (this.i + rows - 1) % rows; Synth.sfx('mv'); } if (I.pressed('down')) { this.i = (this.i + 1) % rows; Synth.sfx('mv'); }
      let h = 0; if (I.repeat('left', .35, .15)) h = -1; if (I.repeat('right', .35, .15)) h = 1;
      if (this.i === 0 && (h || I.pressed('confirm'))) this.cycleCard(h || 1); if (this.i === 1) { if (this.col === undefined) this.col = 1; }
      if (this.i === 0) { /* cards row: left/right changes the focused card; up/down moves */ }
      if (I.pressed('lob')) this.card = ((this.card || 0) + 1) % 3;
      if (this.i === 0 && I.pressed('switch')) this.card = ((this.card || 0) + 1) % 3;
      if (this.i >= 1 && this.i <= 4 && h) { const o = this.opts[this.i - 1]; const idx = o.v.indexOf(ex[o.k] != null && o.k !== 'cheat' ? ex[o.k] : ex.cheat); const ni = (idx + h + o.v.length) % o.v.length; if (o.k === 'cheat') ex.cheat = o.v[ni]; else ex[o.k] = o.v[ni]; Synth.sfx('mv'); }
      if (I.pressed('confirm') && this.i === 4 || (I.pressed('start') && true)) this.go(); else if (I.pressed('confirm') && this.i === 0) { }
      if (I.pressed('cancel')) game.go('sides');
      const c = I.clicked && I.clicked(); if (c) { if (c[1] > 168 && c[1] < 190) this.go(); }
    },
    cycleCard(d) { const ids = this.ids(), k = ['home', 'arena', 'away'][this.card || 0]; if (k === 'arena') { const idx = ARENA_LIST.indexOf(ex.arena); ex.arena = ARENA_LIST[(idx + d + 5) % 5]; Backdrop.kill(); Backdrop.ensure(ex.arena, ex[ 'home' ], ex.away); } else { const idx = ids.indexOf(ex[k]); let n = ids[(idx + d + ids.length) % ids.length]; if (n === ex[k === 'home' ? 'away' : 'home']) n = ids[(ids.indexOf(n) + d + ids.length) % ids.length]; ex[k] = n; } Synth.sfx('mv'); },
    go() { const ch = ex.cheat; const cfg = { home: ex.home, away: ex.away, arena: ex.arena, periods: ex.periods, periodLen: ex.len, diff: ex.diff < 0 ? undefined : ex.diff, humans: ex.humans, intros: true, cheats: ch, alwaysKaboom: ch === 'always', bigHeads: ch === 'bigHeads', retro: ch === 'retro', octoRain: ch === 'octopus' }; if (ch === 'glow') game.settings.set('puckTrail', 'Glow'); Save.get().cheats = { bigHeads: ch === 'bigHeads', retro: ch === 'retro' }; game.go('match', { cfg, ret: 'setup', kind: 'exh' }, { fade: 'wipe' }); },
    draw(r) { Backdrop.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,8,20,.62)'); UI.title(g, 'EXHIBITION', r.W / 2, 8, 3);
      const cw = 96, ch = 96, gap = 8, x0 = r.W / 2 - (cw * 3 + gap * 2) / 2; ['home', 'arena', 'away'].forEach((k, ci) => { const x = x0 + ci * (cw + gap), foc = this.i === 0 && (this.card || 0) === ci; UI.box(g, x - (foc ? 3 : 0), 34 - (foc ? 3 : 0), cw + (foc ? 6 : 0), ch + (foc ? 6 : 0), { border: foc ? UI.GOLD : '#4a5a8a', bg: foc ? ['#24346a', '#141c3c'] : UI.PANEL });
        if (k === 'arena') { const a = ARENAS[ex.arena]; px.rect(g, x + 6, 42, cw - 12, 38, a.sky[1]); px.rect(g, x + 6, 62, cw - 12, 18, `rgb(${a.floor.join(',')})`); UI.txt(g, a.name, x + cw / 2, 86, '#fff', { align: 'center' }); UI.txt(g, a.town, x + cw / 2, 98, '#9ab', { align: 'center', font: 'tiny' }); UI.txt(g, 'ARENA', x + cw / 2, 108, UI.GOLD, { align: 'center', font: 'tiny' }); }
        else { const t = TEAM[ex[k]]; Logo.draw(g, t.id, x + cw / 2, 58, 30); UI.txt(g, t.name.split(' ').slice(-1)[0].toUpperCase(), x + cw / 2, 80, '#fff', { align: 'center', scale: 1 }); const bars = [['SPD', t.skaters.reduce((a, s) => a + s[4][0], 0) / 3], ['SHT', t.skaters.reduce((a, s) => a + s[4][1], 0) / 3], ['HIT', t.skaters.reduce((a, s) => a + s[4][3], 0) / 3], ['GOL', t.rating[0] ]]; bars.forEach(([n, v], bi) => { UI.txt(g, n, x + 8, 92 + bi * 8, '#9ab', { font: 'tiny' }); px.rect(g, x + 28, 93 + bi * 8, 56, 4, '#05070f'); px.rect(g, x + 28, 93 + bi * 8, Math.round(56 * v / 5), 4, t.accent); }); UI.txt(g, k === 'home' ? 'HOME' : 'AWAY', x + cw / 2, 40, UI.GOLD, { align: 'center', font: 'tiny' }); } });
      this.opts.forEach((o, oi) => { const y = 138 + oi * 0, x = x0 + oi * 74, foc = this.i === oi + 1; UI.box(g, x, 134, 70, 28, { border: foc ? UI.GOLD : '#4a5a8a', bg: foc ? ['#24346a', '#141c3c'] : UI.PANEL }); UI.txt(g, o.l, x + 35, 138, '#9ab', { align: 'center', font: 'tiny' }); const v = o.k === 'cheat' ? ex.cheat : ex[o.k]; UI.txt(g, o.k === 'len' ? U.mmss(v) : o.k === 'diff' ? (v < 0 ? 'AUTO' : ['ROOKIE', 'PRO', 'ALL-STAR', 'LEGEND'][v]) : String(v).toUpperCase(), x + 35, 148, foc ? '#fff' : '#cfe', { align: 'center' }); });
      UI.box(g, r.W / 2 - 60, 168, 120, 22, { border: this.i === 4 ? UI.GOLD : '#4a5a8a', bg: this.i === 4 ? ['#6a3a1a', '#2a1408'] : UI.PANEL }); UI.txt(g, 'FACE OFF!', r.W / 2, 174, this.i === 4 ? '#ffe08a' : '#cfe', { align: 'center', scale: 2 });
      Glyphs.text(g, '↑↓ ROW   ←▸ CHANGE   {lob} NEXT CARD   {pass} FACE OFF   {deke} BACK', r.W / 2, r.H - 12, { align: 'center', color: '#c8d4f0' }); }); }
  };
  return { sc, matchDone, restartMatch, get ctx() { return ctxMatch; }, set ctx(v) { ctxMatch = v; }, ex };
})();
