/* 31-front: the title (the Euphorium at night, Daz doing keepy-uppies, fireworks, PRESS START, the main menu's tiles,
 * the touch-only notice), Kick-About's setup (teams, stadium, conditions, players picking sides), the penalties setup,
 * results, the Sticker Album and About & Credits. Every screen works with a pad, a keyboard or a mouse alone. */
/** a stage: a quiet stadium to stand people in (title, tunnel, ceremony), drawn by a MatchView */
class Stage {
  constructor(stadium, o = {}) {
    this.m = new Match({ home: o.home || 'kipperton', away: o.away || 'opulence', stadium, training: { quiet: true }, silent: true, noClock: true, seed: 5 });
    for (const f of this.m.players) { f.body.x = -9999; f.state = 'gone'; }
    this.m.ball.x = -9999; this.view = new MatchView(this.m, { noCamera: true, noZoom: true }); this.t = 0;
    if (o.weather !== false) game.weather = this.m.st.weather ? Object.assign({}, this.m.st.weather) : null;
  }
  update(dt) { this.t += dt; this.view.update(dt); }
  draw(r) { this.view.draw(r); }
}
EF.Stage = Stage;
const FRONT = {};
const goBack = to => () => game.go(to || 'title');
EF.FRONT = FRONT;
/* ---- the title ---- */
const titleScene = {
  touch: [], view: 'broadcast', idle: true,
  enter(d) {
    this.stage = new Stage('euphorium', { weather: false }); this.t = 0; this.phase = d && d.menu ? 'menu' : 'press'; this.fw = 2;
    const m = this.stage.m, daz = m.side[0].find(f => f.data.id === 'pilchard');
    daz.state = 'run'; daz.body.x = P.CX; daz.body.y = P.Y0 + 150; daz.facing = PI / 2; this.daz = daz; m.ball.x = P.CX + 6; m.ball.y = P.Y0 + 156;
    game.setView('broadcast'); game.setZoom(1.1); game.zoomBase = 1.1;
    EF.music('anthem'); EF.idle.reset();
    this.menu = new UIMenu({ onBack: () => { this.phase = 'press'; } });
    game.input.consumeAll();
  },
  exit() { game.weather = null; LIGHTS.enabled = false; },
  items(r) {
    const save = EF.Save.data, cup = save && save.cup, cont = cup && !cup.done ? 'CONTINUE: ' + ((EF.ROUNDS[cup.round] || {}).name || '') : 'NEW CUP RUN';
    const touchOnly = EF.touchOnly(), deny = 'CONTROLLER OR KEYBOARD REQUIRED';
    const L = [
      { label: 'CUP RUN', sub: cont, onPick: () => game.go('cup', {}), play: true },
      { label: 'KICK-ABOUT', sub: '1 TO 4 PLAYERS', onPick: () => game.go('setup', {}), play: true },
      { label: 'PENALTIES', sub: 'A SHOOTOUT', onPick: () => game.go('penaltysetup', {}), play: true },
      { label: 'TRAINING', sub: '9 DRILLS', onPick: () => game.go('training', {}), play: true },
      { label: 'STICKER ALBUM', sub: Object.keys(save.stickers).length + ' / ' + EF.all('sticker').length, onPick: () => game.go('album', {}) },
      { label: 'OPTIONS', sub: 'SETTINGS & CONTROLS', onPick: () => game.menu('settings') },
      { label: 'ABOUT & CREDITS', sub: 'HOW IT WAS MADE', onPick: () => game.go('about', {}) }
    ];
    if (touchOnly) for (const it of L) if (it.play) { it.disabled = true; it.why = deny; it.sub = deny; }
    const w = Math.min(200, Math.floor((r.W - 40) / 2)), rects = EF.layoutGrid(r, 8, 2, { w, h: 26, gap: 8, gapY: 5, y: Math.round(r.H * .34) });
    L.forEach((it, i) => { it.rect = rects[i]; it.scale = 2; });
    L[6].rect = [Math.round(r.W / 2 - w / 2), rects[6][1], w, 26];
    return L;
  },
  update(dt) {
    this.t += dt; this.stage.update(dt);
    const daz = this.daz, m = this.stage.m, u = (this.t * 1.6) % 1;
    // keepy-uppies: a touch every 0.6 s, the ball up and down
    daz.act = { name: 'touch', t: u * .3, dur: .3 };
    m.ball.z = Math.abs(Math.sin(this.t * PI * 1.6)) * 22; m.ball.x = daz.body.x + 5; m.ball.y = daz.body.y + 2; m.ball.roll += dt * 20;
    game.focus(P.CX + Math.sin(this.t * .1) * 60, P.Y0 + 70, 20);
    if ((this.fw -= dt) <= 0) { this.fw = 8; this.stage.view.firework(3); }
    if (EF.touchOnly()) { const c = game.input.clicked(); if (c && this.setBtn && c[0] > this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] > this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) { game.menu('settings'); EF.idle.tick(dt); return; } }
    if (this.phase === 'press') {
      if (game.players.some(I => I.anyPressed()) || game.input.clicked()) { this.phase = 'menu'; EF.sfx('menuPick'); game.players.forEach(I => I.consumeAll()); EF.idle.reset(); }
    } else {
      this.menu.set(this.items(game.r || { W: game.W, H: game.H }));
      this.menu.update(dt);
    }
    EF.idle.tick(dt);
  },
  draw(r) {
    this.stage.draw(r);
    const daz = this.daz, rig = this.stage.view.rigs[daz.id]; void rig;
    r.overlay(g => {
      px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, r.W, Math.round(r.H * .04) + 74, '#0a0c20'));
      EF.heading(g, 'EUROPHORIA', r.W / 2, Math.round(r.H * .04), 4);
      EF.heading(g, 'FOOTBALL', r.W / 2, Math.round(r.H * .04) + 34, 3, { colors: ['#ffffff', '#c8d8ff', '#6a8aff'] });
      E.font.text(g, 'OVER-THE-TOP ARCADE FOOTBALL', r.W / 2, Math.round(r.H * .04) + 62, '#ffe7a8', { align: 'center', outline: '#000' });
      if (this.phase === 'press') {
        if (Math.floor(this.t * 2) % 2 === 0) { const w = EF.promptWidth('start', 'PRESS START', { scale: 2 }); EF.prompt(g, Math.round(r.W / 2 - w / 2), Math.round(r.H * .62), 'start', 'PRESS START', { scale: 2 }); }
      } else { this.menu.draw(g); }
      if (EF.touchOnly()) {
        const w = 260, h = 64, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .72);
        EF.panel(g, x, y, w, h, { border: '#ff5a4a' });
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 8, '#ffffff', { align: 'center', outline: false });
        this.setBtn = [x + 70, y + 26, 120, 30]; EF.panel(g, this.setBtn[0], this.setBtn[1], 120, 30, { border: '#ffc83a' }); E.font.text(g, 'SETTINGS', r.W / 2, y + 33, '#ffe08a', { align: 'center', scale: 2, outline: false });
      }
      E.font.text(g, 'v' + EF.VERSION + '  ' + E.versionLabel(), 4, r.H - 9, '#6a7090', { font: 'tiny', outline: false });
      if (this.phase === 'menu') EF.footer(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.title = titleScene;

/* ---- Kick-About setup: teams, stadium, conditions, players ---- */
const KA = { home: 'kipperton', away: 'hoofington', kit: false, stadium: 'smokehouse', weather: 'stadium', time: 'stadium', ball: 'classic', half: null, diff: null, sides: {} };
EF.KA = KA;
const teamIds = () => EF.all('team').map(t => t.id), stadIds = () => EF.all('stadium').filter(s => !s.training).map(s => s.id);
const cyc = (list, v, d) => list[(list.indexOf(v) + d + list.length) % list.length];
const setupScene = {
  touch: [], view: 'broadcast', idle: true,
  enter(d) { this.step = 0; this.t = 0; this.menu = new UIMenu({ onBack: () => this.back() }); game.allowJoin(false); EF.music('menu'); EF.idle.reset(); this.stage = new Stage(KA.stadium, { weather: false }); game.setZoom(1); game.zoomBase = 1; },
  exit() { game.allowJoin(false); },
  back() { if (this.step > 0) { this.step--; if (this.step < 3) game.allowJoin(false); } else game.go('title', { menu: true }); },
  items(r) {
    const W = Math.min(r.W - 40, 380), x = Math.round(r.W / 2 - W / 2), y0 = Math.round(r.H * .24);
    const L = [];
    const team = id => EF.get('team', id);
    if (this.step === 0) {
      const tile = (side) => ({ kind: 'choice', label: side ? 'AWAY' : 'HOME', get: () => KA[side ? 'away' : 'home'], set: v => { KA[side ? 'away' : 'home'] = v; }, options: teamIds().map(id => [id, team(id).name]),
        draw: (g, X, Y, w, h, f) => { EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : '#2a3a6a' }); const t = team(KA[side ? 'away' : 'home']); EF.drawCrest(g, t, X + w / 2, Y + 34, 40); E.font.text(g, side ? 'AWAY' : 'HOME', X + w / 2, Y + 4, '#9aa6c8', { align: 'center', outline: false }); E.font.text(g, (f ? '< ' : '') + t.short + (f ? ' >' : ''), X + w / 2, Y + 60, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, t.name, X + w / 2, Y + 78, '#ffe08a', { align: 'center', outline: false }); E.font.text(g, EF.get('tactic', t.tactic).gimmick ? EF.get('tactic', t.tactic).gimmick.toUpperCase() : 'PLUCKY', X + w / 2, Y + 90, '#9aa6c8', { align: 'center', font: 'tiny', outline: false }); } });
      const a = tile(0), b = tile(1); const tw = Math.round(W / 2 - 6); a.rect = [x, y0, tw, 104]; b.rect = [x + W - tw, y0, tw, 104]; L.push(a, b);
      L.push({ label: 'NEXT: STADIUM', rect: [x + W / 2 - 90, y0 + 114, 180, 26], onPick: () => { this.step = 1; } });
    } else if (this.step === 1) {
      const ids = stadIds(), rects = EF.layoutGrid(r, ids.length, 3, { w: Math.round((W - 20) / 3), h: 56, y: y0 });
      ids.forEach((id, i) => { const s = EF.get('stadium', id); L.push({ rect: rects[i], label: s.name, sub: s.city, onPick: () => { KA.stadium = id; this.stage = new Stage(id, { weather: false }); this.step = 2; },
        draw: (g, X, Y, w, h, f) => { EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : KA.stadium === id ? '#5ae0ff' : '#2a3a6a', bg: [s.look.sky[0], s.look.sky[2]] }); px.rect(g, X + 3, Y + h - 16, w - 6, 13, s.look.grass[0]); for (let k = 0; k < w - 6; k += 8) px.rect(g, X + 3 + k, Y + h - 16, 4, 13, s.look.grass[1]); E.font.text(g, s.name, X + w / 2, Y + 6, '#ffffff', { align: 'center', outline: '#000' }); E.font.text(g, s.city + ' - ' + s.time.toUpperCase() + (s.weather ? ', ' + s.weather.kind.toUpperCase() : ''), X + w / 2, Y + 18, '#ffe08a', { align: 'center', font: 'tiny', outline: '#000' }); } }); });
    } else if (this.step === 2) {
      const rows = [
        { kind: 'choice', label: 'WEATHER', get: () => KA.weather, set: v => { KA.weather = v; }, options: [['stadium', 'As the stadium'], ['none', 'Clear'], ['rain', 'Rain'], ['snow', 'Snow'], ['fog', 'Fog']] },
        { kind: 'choice', label: 'TIME', get: () => KA.time, set: v => { KA.time = v; }, options: [['stadium', 'As the stadium'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']] },
        { kind: 'choice', label: 'BALL', get: () => KA.ball, set: v => { KA.ball = v; }, options: EF.Save.data.unlocks.balls.map(b => [b, EF.BALLS[b].name]) },
        { kind: 'choice', label: 'HALF LENGTH', get: () => game.settings.halfLen, set: v => game.settings.set('halfLen', v), options: [['90', '1:30'], ['120', '2:00'], ['180', '3:00'], ['240', '4:00']] },
        { kind: 'choice', label: 'DIFFICULTY', get: () => game.settings.difficulty, set: v => game.settings.set('difficulty', v), options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard'], ['europhoric', 'Europhoric']] },
        { label: 'NEXT: PLAYERS', onPick: () => { this.step = 3; game.allowJoin({ max: 4 }); KA.sides = {}; } }];
      const rects = EF.layoutColumn(r, rows.length, { w: W, h: 22, gap: 4, y: y0 });
      rows.forEach((it, i) => { it.rect = rects[i]; L.push(it); });
    } else {
      L.push({ label: 'START MATCH', rect: [x + W / 2 - 90, Math.round(r.H * .78), 180, 26], onPick: () => this.start(), disabled: !this.anyHuman(), why: 'MOVE A CONTROLLER TO A SIDE' });
    }
    return L;
  },
  anyHuman() { return game.players.some(I => (KA.sides[I.player] ?? (I === game.input ? 0 : 1)) !== -1); },
  update(dt) {
    this.t += dt; this.stage.update(dt); game.focus(P.CX + Math.sin(this.t * .2) * 200, P.CY, 0);
    if (this.step === 3) {
      // each player's icon: left HOME, centre CPU (sitting out), right AWAY
      for (const I of game.players) {
        const k = I.player; if (KA.sides[k] === undefined) KA.sides[k] = I === game.input ? 0 : 1;
        if (I.pressed('left')) { KA.sides[k] = KA.sides[k] === 1 ? -1 : 0; EF.sfx('menuMove'); I.consume && I.consume('left'); }
        if (I.pressed('right')) { KA.sides[k] = KA.sides[k] === 0 ? -1 : 1; EF.sfx('menuMove'); I.consume && I.consume('right'); }
      }
    }
    this.menu.set(this.items(game.r || { W: game.W, H: game.H }));
    this.menu.update(dt);
    EF.idle.tick(dt);
  },
  start() {
    const humans = game.players.map(I => ({ input: I, side: KA.sides[I.player] ?? 0 })).filter(h => h.side >= 0);
    const st = KA.stadium, wx = KA.weather;
    const weather = wx === 'stadium' ? null : wx === 'none' ? 'none' : wx === 'fog' ? 'none' : { kind: wx, amount: .7, wind: .2 };
    const surface = wx === 'rain' ? 'wet' : wx === 'snow' ? 'snow' : null;
    const draws = { allowed: 'allowed', golden: 'golden', pens: 'pens' }[game.settings.draws] || 'allowed';
    const o = { home: KA.home, away: KA.away, stadium: st, humans, weather, surface, ball: KA.ball, draws, time: KA.time, fog: wx === 'fog', back: 'setup',
      onEnd: (sum) => game.go('results', { summary: sum, next: () => game.go('setup', {}) }) };
    game.allowJoin(false);
    game.go('tunnel', { match: o, short: true });
  },
  draw(r) {
    this.stage.draw(r);
    r.overlay(g => {
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#101030'));
      EF.heading(g, 'KICK-ABOUT', r.W / 2, Math.round(r.H * .04), 3);
      E.font.text(g, ['1  TEAMS', '2  STADIUM', '3  CONDITIONS', '4  PLAYERS'][this.step], r.W / 2, Math.round(r.H * .04) + 30, '#ffe08a', { align: 'center', scale: 1, outline: '#000' });
      if (this.step === 3) {
        const y = Math.round(r.H * .3), W = Math.min(r.W - 40, 380), x0 = Math.round(r.W / 2 - W / 2);
        EF.panel(g, x0, y, W, 110);
        E.font.text(g, 'HOME', x0 + W * .17, y + 6, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, 'CPU', x0 + W * .5, y + 6, '#9aa6c8', { align: 'center', scale: 2, outline: false }); E.font.text(g, 'AWAY', x0 + W * .83, y + 6, '#ffffff', { align: 'center', scale: 2, outline: false });
        EF.drawCrest(g, EF.get('team', KA.home), x0 + W * .17, y + 34, 18); EF.drawCrest(g, EF.get('team', KA.away), x0 + W * .83, y + 34, 18);
        game.players.forEach((I, i) => { const s = KA.sides[I.player] ?? 0, cx = x0 + W * (s === 0 ? .17 : s === 1 ? .83 : .5), cy = y + 54 + i * 13; px.rect(g, Math.round(cx) - 26, cy - 1, 52, 11, E.PLAYER_COLORS[i]); E.font.text(g, I.name + ' ' + (I.lastDevice === 'gamepad' ? 'PAD' : 'KEYS'), Math.round(cx), cy + 1, '#000', { align: 'center', outline: false }); });
        E.font.text(g, game.players.length < 4 ? 'MORE PLAYERS: PRESS 2 ON THE KEYBOARD, OR START ON A PAD' : 'FOUR PLAYERS!', r.W / 2, y + 112, '#ffe7a8', { align: 'center', outline: '#000' });
      }
      this.menu.draw(g);
      EF.footer(g, r, this.step === 3 ? [['left', 'SIDE'], ['confirm', 'START'], ['cancel', 'BACK']] : [['confirm', 'SELECT'], ['left', 'CHANGE'], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.setup = setupScene;

/* ---- penalties setup ---- */
const PEN = { home: 'kipperton', away: 'pasapasa', stadium: 'euphorium', versus: false };
const penaltyScene = {
  touch: [], view: 'broadcast', idle: true,
  enter() { this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }) }); this.stage = new Stage(PEN.stadium, { weather: false }); this.t = 0; EF.music('menu'); EF.idle.reset(); game.allowJoin({ max: 2 }); },
  exit() { game.allowJoin(false); },
  update(dt) {
    this.t += dt; this.stage.update(dt); game.focus(P.X1 - 80, P.CY, 0);
    const r = game.r || { W: game.W, H: game.H }, W = Math.min(r.W - 40, 340);
    const rows = [
      { kind: 'choice', label: 'YOUR TEAM', get: () => PEN.home, set: v => { PEN.home = v; }, options: teamIds().map(id => [id, EF.get('team', id).name]) },
      { kind: 'choice', label: 'OPPONENT', get: () => PEN.away, set: v => { PEN.away = v; }, options: teamIds().map(id => [id, EF.get('team', id).name]) },
      { kind: 'choice', label: 'STADIUM', get: () => PEN.stadium, set: v => { PEN.stadium = v; this.stage = new Stage(v, { weather: false }); }, options: stadIds().map(id => [id, EF.get('stadium', id).name]) },
      { kind: 'choice', label: 'PLAYERS', get: () => game.players.length > 1 ? 'versus' : 'cpu', set: () => {}, options: [['cpu', '1 PLAYER vs CPU'], ['versus', '2 PLAYERS (P2 JOINED)']] },
      { label: 'START SHOOTOUT', onPick: () => this.start() }];
    EF.layoutColumn(r, rows.length, { w: W, h: 24, gap: 5, y: Math.round(r.H * .3) }).forEach((rc, i) => { rows[i].rect = rc; });
    this.menu.set(rows); this.menu.update(dt); EF.idle.tick(dt);
  },
  start() {
    const humans = [{ input: game.input, side: 0 }]; if (game.players[1]) humans.push({ input: game.players[1], side: 1 });
    game.allowJoin(false);
    game.go('match', { home: PEN.home, away: PEN.away, stadium: PEN.stadium, humans, shootoutOnly: true, draws: 'pens', onEnd: sum => game.go('results', { summary: sum, next: () => game.go('penaltysetup', {}) }) });
  },
  draw(r) {
    this.stage.draw(r);
    r.overlay(g => { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#101030')); EF.heading(g, 'PENALTIES', r.W / 2, Math.round(r.H * .05), 3); E.font.text(g, 'FIVE EACH, THEN SUDDEN DEATH. P2: PRESS 2 OR START TO JOIN', r.W / 2, Math.round(r.H * .05) + 30, '#ffe08a', { align: 'center', outline: '#000' }); this.menu.draw(g); EF.footer(g, r, [['confirm', 'SELECT'], ['left', 'CHANGE'], ['cancel', 'BACK']]); });
  }
};
EF.scenes.penaltysetup = penaltyScene;

/* ---- results ---- */
const resultsScene = {
  touch: [], view: 'broadcast',
  enter(d) { this.d = d || {}; this.s = this.d.summary || { home: 'kipperton', away: 'hoofington', score: [0, 0], goals: [], shots: [0, 0], poss: [50, 50], tackles: [0, 0], winner: -1 }; this.t = 0; this.menu = new UIMenu({}); const w = this.s.winner, kip = [this.s.home, this.s.away].indexOf('kipperton'); EF.music(w < 0 ? null : (kip < 0 || w === kip) ? 'victory' : 'defeat', { loop: false }); this.stickers = (this.d.stickers || []).slice(); this.stage = new Stage(this.s.stadium || 'smokehouse', { weather: false }); game.input.consumeAll(); },
  update(dt) {
    this.t += dt; this.stage.update(dt); game.focus(P.CX, P.CY - 80, 0);
    const r = game.r || { W: game.W, H: game.H };
    this.menu.set([{ label: this.d.label || 'CONTINUE', rect: [Math.round(r.W / 2 - 90), Math.round(r.H * .82), 180, 26], onPick: () => { if (this.d.next) this.d.next(); else game.go('title'); } }]);
    if (this.t > .6) this.menu.update(dt);
  },
  draw(r) {
    const s = this.s, t0 = EF.get('team', s.home), t1 = EF.get('team', s.away);
    this.stage.draw(r);
    r.overlay(g => {
      px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#0a0a20'));
      const W = Math.min(r.W - 30, 420), x = Math.round(r.W / 2 - W / 2), y = Math.round(r.H * .05);
      EF.panel(g, x, y, W, Math.round(r.H * .74));
      EF.heading(g, s.winner < 0 ? 'A DRAW' : EF.get('team', s.winner ? s.away : s.home).short + ' WIN!', r.W / 2, y + 6, 3);
      EF.drawCrest(g, t0, x + 40, y + 52, 36); EF.drawCrest(g, t1, x + W - 40, y + 52, 36);
      E.font.text(g, s.score[0] + ' - ' + s.score[1], r.W / 2, y + 38, '#ffffff', { align: 'center', scale: 4, outline: '#000' });
      if (s.pens) E.font.text(g, '(' + s.pens[0] + ' - ' + s.pens[1] + ' ON PENALTIES)', r.W / 2, y + 72, '#ffe08a', { align: 'center', outline: false });
      s.goals.slice(0, 4).forEach((gl, i) => E.font.text(g, gl.minute + '  ' + gl.name + (gl.super ? '  (SUPER STRIKE!)' : ''), gl.side ? x + W - 12 : x + 12, y + 86 + i * 11, '#dfe4f8', { align: gl.side ? 'right' : 'left', outline: false }));
      const sy = y + 136;
      [['SHOTS', s.shots], ['POSSESSION %', s.poss], ['TACKLES', s.tackles]].forEach(([k, v], i) => { const cx = x + W * (.2 + i * .3); E.font.text(g, v[0] + ' - ' + v[1], cx, sy, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, k, cx, sy + 18, '#9aa6c8', { align: 'center', outline: false }); });
      if (s.potm) { const rig = EF.portraitOf(s.potm.id); if (rig.update) rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2 }); rig.drawPortrait(g, x + 10, sy + 34, 30); E.font.text(g, 'PLAYER OF THE MATCH', x + 46, sy + 38, '#ffc83a', { outline: false }); E.font.text(g, s.potm.name, x + 46, sy + 50, '#ffffff', { scale: 1, outline: false }); }
      if (this.stickers.length) E.font.text(g, 'NEW STICKERS: ' + this.stickers.length, x + W - 12, sy + 44, '#ff9ae0', { align: 'right', outline: false });
      this.menu.draw(g);
      EF.footer(g, r, [['confirm', this.d.label || 'CONTINUE']]);
    });
  }
};
EF.scenes.results = resultsScene;

/* ---- the Sticker Album ---- */
const albumScene = {
  touch: [], view: 'broadcast', idle: true,
  enter() { this.page = 0; this.t = 0; this.flip = 0; this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }), onTab: d => this.turn(d) }); EF.music('credits'); EF.idle.reset(); },
  pages() {
    const S = EF.all('sticker'), pg = [];
    for (const t of EF.all('team')) pg.push({ title: t.name, list: S.filter(s => s.team === t.id) });
    pg.push({ title: 'STADIUMS', list: S.filter(s => s.kind === 'stadium') });
    pg.push({ title: "GAFFER'S CHALLENGES (SHINY)", list: S.filter(s => s.kind === 'shiny') });
    pg.push({ title: 'SPECIALS', list: S.filter(s => s.kind === 'special') });
    return pg;
  },
  turn(d) { const n = this.pages().length; this.page = (this.page + d + n) % n; this.flip = .3; },
  update(dt) {
    this.t += dt; this.flip = Math.max(0, this.flip - dt);
    const r = game.r || { W: game.W, H: game.H }, pg = this.pages()[this.page], cols = 3, w = Math.min(120, Math.floor((r.W - 50) / 3)), h = Math.min(74, Math.floor((r.H * .64 - 10) / 2));
    const rects = EF.layoutGrid(r, pg.list.length, cols, { w, h, gap: 8, y: Math.round(r.H * .17) });
    this.menu.set(pg.list.map((s, i) => ({ rect: rects[i], label: s.name, sticker: s, draw: (g, X, Y, W2, H2, f) => this.drawSticker(g, s, X, Y, W2, H2, f) })).concat([
      { label: '<', rect: [8, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(-1) }, { label: '>', rect: [r.W - 30, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(1) }]));
    this.menu.update(dt); EF.idle.tick(dt);
  },
  drawSticker(g, s, X, Y, w, h, f) {
    const got = EF.Save.data.stickers[s.id], shiny = got === 'shiny';
    EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : shiny ? '#ff9ae0' : '#c8b88a', bg: got ? ['#f4ecd8', '#e0d4b8'] : ['#2a2a3a', '#1a1a2a'] });
    if (!got) { E.font.text(g, '?', X + w / 2, Y + h / 2 - 14, '#5a5a7a', { align: 'center', scale: 3, outline: false }); E.font.text(g, s.how, X + w / 2, Y + h - 22, '#9aa6c8', { align: 'center', font: 'tiny', wrap: w - 8, outline: false }); return; }
    const cx = X + w / 2, cy = Y + h / 2 - 8;
    if (s.kind === 'player' || (s.kind === 'special' && ['mags', 'barry'].includes(s.ref))) { const rig = EF.portraitOf(s.ref); rig.drawPortrait(g, Math.round(cx - 18), Y + 4, 36); }
    else if (s.kind === 'crest') EF.drawCrest(g, EF.get('team', s.ref), cx, cy, 34);
    else if (s.kind === 'stadium') { const st = EF.get('stadium', s.ref); px.rect(g, X + 6, Y + 6, w - 12, h - 30, st.look.sky[1]); px.rect(g, X + 6, Y + h - 34, w - 12, 10, st.look.grass[0]); }
    else if (s.ref === 'bus') EF.drawBus(g, cx, cy + 12, .9);
    else if (s.ref === 'keith') { px.ell(g, Math.round(cx), Math.round(cy), 14, 8, '#c8803a'); px.poly(g, [[cx + 12, cy], [cx + 20, cy - 6], [cx + 20, cy + 6]], '#c8803a'); px.dot(g, Math.round(cx - 6), Math.round(cy - 2), '#141414'); }
    else if (s.ref === 'loyal') EF.drawCrest(g, EF.get('team', 'kipperton'), cx, cy, 30);
    else EF.drawTrophy(g, cx, cy + 18, .9, .4);
    if (shiny) px.blend(g, .3 + Math.sin(this.t * 4) * .15, 'add', () => px.poly(g, [[X + w * ((this.t * .5) % 1), Y], [X + w * ((this.t * .5) % 1) + 14, Y], [X + w * ((this.t * .5) % 1) - 10, Y + h], [X + w * ((this.t * .5) % 1) - 24, Y + h]], '#ffffff'));
    E.font.text(g, s.name, X + w / 2, Y + h - 16, '#1a1a2a', { align: 'center', font: 'tiny', outline: false, wrap: w - 6 });
    if (s.pos) E.font.text(g, s.pos, X + w - 6, Y + 4, '#8a2a2a', { align: 'right', font: 'tiny', outline: false });
  },
  draw(r) {
    r.sky(['#1a1420', '#2a2030', '#3a2a3a']);
    r.overlay(g => {
      const pg = this.pages()[this.page];
      for (let y = 0; y < r.H; y += 8) px.rect(g, 0, y, r.W, 1, '#3a2a3a');
      EF.heading(g, 'STICKER ALBUM', r.W / 2, Math.round(r.H * .02), 2);
      E.font.text(g, pg.title + '   (' + (this.page + 1) + '/' + this.pages().length + ')', r.W / 2, Math.round(r.H * .02) + 22, '#ffe08a', { align: 'center', outline: '#000' });
      if (this.flip > 0) px.blend(g, this.flip * 2, 'normal', () => px.rect(g, 0, 0, Math.round(r.W * this.flip / .3), r.H, '#e0d4b8'));
      this.menu.draw(g);
      const n = Object.keys(EF.Save.data.stickers).length;
      E.font.text(g, n + ' OF ' + EF.all('sticker').length + ' COLLECTED', r.W / 2, r.H - 34, '#c8b8d8', { align: 'center', outline: false });
      EF.footer(g, r, [[['switch', 'skill'], 'PAGE', { sep: '/' }], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.album = albumScene;

/* ---- About & Credits: the source information, the feedback and the credits, a page each ---- */
const aboutScene = {
  touch: [], view: 'broadcast', idle: true,
  enter() { this.page = 0; this.t = 0; this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }), onTab: d => this.turn(d) }); EF.music('credits'); EF.idle.reset(); },
  pages() {
    const A_ = EF.ABOUT || {}, si = A_.sourceInformation || {}, Q = EF.ABOUT_Q;
    const lab = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
    const keys = Object.keys(lab), pg = [];
    for (let i = 0; i < keys.length; i += 4) pg.push({ title: 'SOURCE INFORMATION', rows: keys.slice(i, i + 4).map(k => [lab[k], si[k] || 'unknown']) });
    const fb = (title, list, qs) => { for (let i = 0; i < qs.length; i += 2) pg.push({ title, rows: qs.slice(i, i + 2).map((q, j) => [q, (list || [])[i + j] || 'unknown']) }); };
    fb('TESTING FEEDBACK', A_.testingFeedback, Q.testing); fb('ENGINE FEEDBACK', A_.engineFeedback, Q.engine); fb('PROMPT FEEDBACK', A_.promptFeedback, Q.prompt);
    pg.push({ title: 'CREDITS', rows: EF.CREDITS });
    return pg;
  },
  turn(d) { const n = this.pages().length; this.page = (this.page + d + n) % n; },
  update(dt) {
    this.t += dt;
    const r = game.r || { W: game.W, H: game.H };
    this.menu.set([{ label: '<', rect: [6, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(-1) }, { label: '>', rect: [r.W - 28, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(1) }, { label: 'BACK', rect: [Math.round(r.W / 2 - 50), r.H - 52, 100, 22], onPick: () => game.go('title', { menu: true }) }]);
    if (UIK.anyDir(['right'])) this.turn(1); else if (UIK.anyDir(['left'])) this.turn(-1);
    this.menu.update(dt); EF.idle.tick(dt);
  },
  draw(r) {
    r.sky(['#0a0e24', '#141c3a', '#1a2450']);
    r.overlay(g => {
      const pg = this.pages()[this.page], W = Math.min(r.W - 70, 460), x = Math.round(r.W / 2 - W / 2), y = Math.round(r.H * .04);
      EF.heading(g, pg.title, r.W / 2, y, 2);
      E.font.text(g, 'PAGE ' + (this.page + 1) + ' OF ' + this.pages().length, r.W / 2, y + 20, '#9aa6c8', { align: 'center', outline: false });
      EF.panel(g, x, y + 32, W, r.H - y - 92);
      let yy = y + 40;
      for (const [k, v] of pg.rows) {
        E.font.text(g, k, x + 8, yy, '#ffc83a', { outline: false, wrap: W - 16 }); yy += E.font.wrap(k, W - 16).length * 10 + 2;
        const lines = E.font.wrap(String(v), W - 16); for (const l of lines.slice(0, 7)) { E.font.text(g, l, x + 8, yy, '#e8ecff', { outline: false }); yy += 10; }
        yy += 5; if (yy > r.H - 70) break;
      }
      this.menu.draw(g);
      EF.footer(g, r, [[['switch', 'skill'], 'PAGE', { sep: '/' }], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.about = aboutScene;
EF.ABOUT_Q = {
  testing: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engine: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'],
  prompt: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
};
EF.CREDITS = [['GAME', 'Europhoria Football: design, code, art, music and words made for this demo. All clubs, players and people are fictional.'], ['ENGINE', 'my-3D2dge v0.85.2 (handoff package) by Michael Crosato, with small changes for kit patterns and babble voices.'], ['ONLINE', 'AI Hub Session Protocol v1, session client 1.4.0.'], ['BUILT BY', 'Anthropic claude-opus-5-5 (reasoning effort medium) in Claude Code, from a plan by claude-opus-5-5 at max effort.'], ['THANKS', 'Everyone who ever stood on a terrace in the rain.']];
