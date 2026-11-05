/* ---- THE FRONT END: the title (the village green at golden hour, a batter knocking up, Doris, the logo, PRESS),
 * the main menu (STORY, QUICK MATCH, VERSUS, SUPER OVER SHOWDOWN, NETS, EXTRAS), match setup, the versus lobby (1-4
 * players on one screen), Extras (Settings, Controls, About/Credits) and the results. After 10 s without input on any
 * of these screens the attract mode starts. Touch-only devices: no touch controls; "Controller or keyboard required"
 * and a Settings button; the attract mode still runs. ---- */
const Idle = {
  t: 0, last: null,
  /** any input at all: an action, a key, a click, the mouse moving, a stick past the dead zone, a touch */
  any(I) {
    const p = I.pointer && I.pointer(), mt = (I.mouse ? I.mouse.t : -99) + ':' + (p ? p[0] + ',' + p[1] : ''), moved = this.last !== null && mt !== this.last; this.last = mt;
    return I.anyPressed() || moved || !!(I.clicked && I.clicked()) || hyp(...I.move()) > .3;
  },
  step(dt) { const P = K.game.players || [K.game.input]; if (P.some(I => this.any(I))) this.t = 0; else this.t += dt; if (P.some(I => I.anyPressed() && (I.lastDevice === 'gamepad' || I.lastDevice === 'keyboard'))) K.sawKeys = true; return this.t; },
  reset() { this.t = 0; }
};
K.idle = Idle;
// touch only: no fine pointer (mouse, trackpad, pen) and some sign of touch. Touch points alone aren't enough: iOS WebKit
// can report 0 of them, so a coarse pointer or touch events count too. A TV with a remote (no pointer, no touch) isn't
// gated, and a key press or a controller connecting lifts the gate
const touchOnly = () => { try { return !matchMedia('(any-pointer: fine)').matches && ((navigator.maxTouchPoints || 0) > 0 || matchMedia('(any-pointer: coarse)').matches || 'ontouchstart' in window) && !K.sawKeys; } catch (e) { return false; } };
K.touchOnly = touchOnly;
addEventListener('keydown', () => { K.sawKeys = true; });
addEventListener('gamepadconnected', () => { K.sawKeys = true; });
addEventListener('keydown', e => { if (e.code === 'Backquote' && !HUB && K.dev) { e.preventDefault && e.preventDefault(); K.dev.toggle(); } });
/* the title's little world: the green in the three-quarter view, a batter knocking up, a bowler, Doris */
const TitleWorld = {
  rigs: null, t: 0,
  init() {
    if (this.rigs) return;
    const ker = TEAMS.ker;
    this.rigs = { bat: Cast.rig(ker.players.find(p => p.id === 'edie'), 'bat'), bowl: Cast.rig(ker.players.find(p => p.id === 'basil'), 'field'), keep: Cast.rig(ker.players.find(p => p.id === 'pip'), 'keep'), crumb: Cast.extra('crumb') };
  },
  step(dt) {
    this.init(); this.t += dt; const B = Ground.get('green'), t = this.t, cyc = t % 3.2;
    const sw = cyc > 2.2 && cyc < 2.9 ? Anim.stroke('drive', cyc - 2.2, .13, .5) : null;
    this.rigs.bat.update(dt, { x: B.OX + 66, y: B.OY - 470, z: 0, vx: 0, vy: 0, facing: Math.PI, attack: sw, crouch: sw ? .2 : .35 });
    const bx = B.OX + 56, by = B.OY - 470 + 120 - Math.max(0, Math.min(1, (cyc - .8) / 1.4)) * 60;
    this.rigs.bowl.update(dt, { x: bx, y: by, z: 0, vx: 0, vy: cyc > .8 && cyc < 2.2 ? -45 : 0, facing: -Math.PI / 2, attack: cyc > 2.05 && cyc < 2.6 ? Anim.stroke('spinArm', cyc - 2.05, .16, .3) : null });
    this.rigs.keep.update(dt, { x: B.OX + 62, y: B.OY - 500, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, crouch: .9, pose: 'crouch' });
    this.rigs.crumb.update(dt, { x: B.OX - 50, y: B.OY - 575, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: Math.floor(t / 4) % 2 ? 'wave' : null });
  },
  draw(r) {
    const B = Ground.get('green'), g = K.game, t = this.t, cyc = t % 3.2;
    g.lights.enabled = true; g.lights.ambient = .78;
    r.sky(['#ffb870', '#ffd8a0', '#fff0c8']);
    B.map.drawFloor(r); B.map.queueWalls(r);
    for (const [id, x, y, f] of GROUNDS.green.props) K.drawProp(r, id, B.OX + x, B.OY + y, f);
    for (const tg of GROUNDS.green.targets) if (tg.shape) r.shape(tg.shape, B.OX + tg.at[0], B.OY + tg.at[1], 0, { facing: tg.face || 0 });
    r.shape('KERFUFFLE:stumps', B.OX + 60, B.OY - 490, 0, { facing: Math.PI / 2 }); r.shape('KERFUFFLE:teaUrn', B.OX - 70, B.OY - 580, 0); r.shape('KERFUFFLE:cakeStand', B.OX - 84, B.OY - 580, 0); r.shape('table', B.OX - 76, B.OY - 584, 0);
    const cowX = B.OX - 130 + Math.sin(t * .05) * 110, cowY = B.OY - 470 + Math.cos(t * .04) * 30;
    r.shape('KERFUFFLE:cow', cowX, cowY, 0, { facing: Math.cos(t * .05) > 0 ? 0 : Math.PI, params: { step: Math.floor(t * 6) % 16 } });
    for (const [k, rig] of Object.entries(this.rigs)) { r.shadow(rig.x, rig.y, 5, .35); r.actor(rig.x, rig.y, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view)); void k; }
    if (cyc > 2.05 && cyc < 3.1) { const k = clamp((cyc - 2.25) / .3, 0, 1), bx = B.OX + 56, by = B.OY - 470 + 60 - k * 40, bz = 30 - k * 22 + (cyc > 2.55 ? (cyc - 2.55) * 160 : 0); r.queue(bx, by, bz, gg => { const [sx, sy] = r.w(bx + (cyc > 2.55 ? (cyc - 2.55) * -300 : 0), by + (cyc > 2.55 ? (cyc - 2.55) * 200 : 0), bz); px.disc(gg, sx, sy, 2, '#b8202a'); }); }
    g.lights.add(B.OX - 600, B.OY - 800, 300, 1400, .35, { color: '#ffb060' });
    g.focus(B.OX, B.OY - 545, 0);
  }
};
function titleLogo(g, r, y) {
  E.font.title(g, 'CRICKET', r.W / 2, y, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#c8402a'], depth: 3, depthColor: '#3a1a10' });
  E.font.title(g, 'KERFUFFLE', r.W / 2, y + 26, { align: 'center', scale: 4, colors: ['#ffffff', '#c8f0a8', '#5ab04a', '#1e5a2a'], depth: 3, depthColor: '#0e2a14' });
  UI.text(g, 'Over-the-top arcade cricket, with tea', r.W / 2, y + 62, '#fff4d8', { align: 'center' });
}
scenes.title = {
  view: 'threequarter', camera: { zoom: false },
  enter() { if (K.deepLink) { const d = K.deepLink; K.deepLink = null; game.after(.02, () => K.runDeep(d)); } Audio.music('title'); Idle.reset(); this.state = 'press'; this.t = 0; K.game.setView(Views.v.story); game.input.consumeAll(); this.menu = mainMenu(); this.sub = null; game.allowJoin(false); Play.m = null; MatchView.m = null; },
  update(dt) {
    this.t += dt; TitleWorld.step(dt);
    const I = game.input, idle = Idle.step(dt);
    if (idle > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    if (touchOnly()) { const c = I.clicked && I.clicked(); if (c && this.gateBtn && c[0] >= this.gateBtn[0] && c[0] < this.gateBtn[0] + this.gateBtn[2] && c[1] >= this.gateBtn[1] && c[1] < this.gateBtn[1] + this.gateBtn[3]) game.menu('settings'); return; }
    if (this.state === 'press') { if (I.pressed('confirm') || I.pressed('start') || I.pressed('shot') || (I.clicked && I.clicked())) { I.consumeAll(); this.state = 'menu'; K.sfx('confirm'); } return; }
    const L = this.sub || this.menu; L.update(dt, I);
  },
  back() { if (this.sub) { this.sub = null; return true; } if (this.state === 'menu') { this.state = 'press'; return true; } return false; },
  draw(r) {
    TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, r.W, 92, '#1a0a00'));
      titleLogo(g, r, 10);
      if (touchOnly()) {
        const w = 220, x = r.W / 2 - w / 2, y = 112; UI.panel(g, x, y, w, 96);
        UI.text(g, 'Controller or keyboard required', r.W / 2, y + 10, UI.gold, { align: 'center' });
        px.rect(g, r.W / 2 - 60, y + 28, 40, 22, '#3a3a52'); px.disc(g, r.W / 2 - 52, y + 39, 4, '#8a8aa0'); px.disc(g, r.W / 2 - 28, y + 37, 2, '#5fd38a'); px.disc(g, r.W / 2 - 24, y + 41, 2, '#ff6b6b');
        px.rect(g, r.W / 2 + 10, y + 28, 50, 22, '#e8e4d8'); for (let i = 0; i < 4; i++) px.rect(g, r.W / 2 + 13 + i * 12, y + 31, 9, 7, '#a8a498');
        this.gateBtn = [r.W / 2 - 50, y + 62, 100, 24]; px.rect(g, ...this.gateBtn, '#5a4410'); UI.text(g, 'SETTINGS', r.W / 2, y + 70, '#ffffff', { align: 'center' });
        return;
      }
      if (this.state === 'press') { if (Math.floor(this.t * 2) % 2 === 0) Glyphs.row(g, r.W / 2, r.H - 60, game.input, [['confirm', 'PRESS TO PLAY']], { align: 'center' }); UI.text(g, 'v1.0 - my-3D2dge ' + E.versionLabel().replace(/[^\x20-\x7e]/g, '-'), r.W / 2, r.H - 12, '#5a4a30', { align: 'center', font: 'tiny' }); return; }
      const L = this.sub || this.menu, n = L.visible().length; L.y = Math.max(92, Math.round(r.H - 64 - n * L.rowH)); UI.panel(g, Math.round(r.W / 2 - 122), L.y - 8, 244, n * L.rowH + 6, { alpha: .8 }); L.draw(g, r);
      UI.footer(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
function mainMenu() {
  return new UIList({ w: 210, rowH: 17, items: [
    { label: 'STORY: THE GRAND KERFUFFLE', act: () => { scenes.title.sub = storyMenu(); }, help: 'Five matches to save the village green from Lord Thrumpton.' },
    { label: 'QUICK MATCH', act: () => game.go('setup', { mode: 'quick' }), help: 'Any two teams, any ground. Up to four players can join.' },
    { label: 'VERSUS (2-4 PLAYERS)', act: () => game.go('setup', { mode: 'versus' }), help: 'Friends on one screen: versus, co-op or two against two.' },
    { label: 'SUPER OVER SHOWDOWN', act: () => game.go('showdown'), help: 'One over against the Thrumptonator 3000, or defend 14. High scores.' },
    { label: 'NETS', act: () => game.go('nets'), help: "Mrs Crumb's lessons, free practice and the Six Machine." },
    { label: 'EXTRAS', act: () => { scenes.title.sub = extrasMenu(); }, help: 'Settings, controls, about and credits.' }
  ] });
}
function storyMenu() {
  const save = Story.latest();
  return new UIList({ w: 200, rowH: 17, onBack: () => { scenes.title.sub = null; }, items: [
    { label: 'CONTINUE', hidden: () => !save, act: () => { Story.load(); game.go('storymap'); }, help: save ? 'Chapter ' + Math.min(5, (save.data && save.data.chapter) || 1) + ' - ' + (save.place || '') : '' },
    { label: 'NEW GAME', act: () => { if (save && !scenes.title.confirmNew) { scenes.title.confirmNew = true; K.sfx('cancel'); return; } scenes.title.confirmNew = false; Story.newGame(); game.go('cutscene', { scene: 'prologue', next: { scene: 'storymap' } }); }, help: () => scenes.title.confirmNew ? 'Press again to start over (your story save will be replaced).' : 'Start the Grand Kerfuffle from the beginning.' },
    { label: 'BACK', act: () => { scenes.title.sub = null; } }
  ] });
}
function extrasMenu() {
  return new UIList({ w: 200, rowH: 17, onBack: () => { scenes.title.sub = null; }, items: [
    { label: 'SETTINGS', act: () => game.menu('settings') },
    { label: 'CONTROLS', act: () => game.menu('controls') },
    { label: 'ABOUT & CREDITS', act: () => game.go('about') },
    { label: 'BACK', act: () => { scenes.title.sub = null; } }
  ] });
}
/* ---- match setup (Quick Match and Versus): one row at a time, values change with left / right or a click on the arrows ---- */
const TIMES = ['Ground default', 'Day', 'Dusk', 'Night'], WEATHERS = ['Ground default', 'Clear', 'Overcast', 'Rain', 'Fog'];
scenes.setup = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    this.mode = d.mode || 'quick'; Idle.reset(); K.game.setView(Views.v.story);
    const un = Profile.data.unlocked, teams = TEAM_IDS.filter(t => un.includes(t) || this.mode === 'versus');
    this.o = this.o || { a: 0, b: 1, ground: 0, overs: [1, 2, 3, 5].indexOf(K.settings('defOvers')), wickets: [2, 3, 5, 10].indexOf(K.settings('defWickets')), diff: 0, time: 0, weather: 0, kerf: K.settings('kerfuffleRules') };
    if (this.o.overs < 0) this.o.overs = 1; if (this.o.wickets < 0) this.o.wickets = 2;
    this.teams = teams; this.o.a = Math.min(this.o.a, teams.length - 1); this.o.b = Math.min(this.o.b, teams.length - 1); if (this.o.a === this.o.b) this.o.b = (this.o.a + 1) % teams.length;
    this.sides = { 1: 0 };
    if (this.mode === 'versus') { game.allowJoin({ max: 4, onJoin: (input, n) => { this.sides[n] = n % 2 ? 1 : 0; K.sfx('confirm'); } }); }
    const o = this.o, cyc = (k, n, d) => { o[k] = (o[k] + d + n) % n; }, D = ['County', 'Village', 'Test', 'Kerfuffle!'];
    const tname = k => TEAMS[this.teams[o[k]]].name;
    // the next team for one side; landing on the other side's team swaps the two (so with two teams the row still works)
    const pickTeam = (k, d) => { const other = k === 'a' ? 'b' : 'a', prev = o[k]; cyc(k, this.teams.length, d); if (o[k] === o[other]) o[other] = prev; };
    const teamHelp = () => this.mode === 'versus' ? "Every team. Picking the other side's team swaps the two." : this.teams.length + ' of ' + TEAM_IDS.length + ' teams unlocked. Beat a team to unlock it.';
    this.list = new UIList({ w: 260, rowH: 14, y: 56, onBack: () => game.go('title'), items: [
      { label: this.mode === 'versus' ? 'HOME TEAM' : 'YOUR TEAM', value: () => tname('a'), left: () => pickTeam('a', -1), right: () => pickTeam('a', 1), help: teamHelp },
      { label: this.mode === 'versus' ? 'AWAY TEAM' : 'OPPONENTS', value: () => tname('b'), left: () => pickTeam('b', -1), right: () => pickTeam('b', 1), help: teamHelp },
      { label: 'GROUND', value: () => GROUNDS[GROUND_IDS[o.ground]].name, left: () => cyc('ground', GROUND_IDS.length, -1), right: () => cyc('ground', GROUND_IDS.length, 1) },
      { label: 'OVERS', value: () => [1, 2, 3, 5][o.overs], left: () => cyc('overs', 4, -1), right: () => cyc('overs', 4, 1) },
      { label: 'WICKETS', value: () => [2, 3, 5, 10][o.wickets], left: () => cyc('wickets', 4, -1), right: () => cyc('wickets', 4, 1) },
      { label: 'DIFFICULTY', value: () => D[o.diff === 0 ? D.indexOf(game.settings.difficulty || 'County') : o.diff - 1] || 'County', left: () => { o.diff = ((o.diff === 0 ? D.indexOf(game.settings.difficulty || 'County') + 1 : o.diff) + 2) % 4 + 1; }, right: () => { o.diff = (o.diff === 0 ? D.indexOf(game.settings.difficulty || 'County') + 1 : o.diff) % 4 + 1; } },
      { label: 'TIME OF DAY', value: () => TIMES[o.time], left: () => cyc('time', TIMES.length, -1), right: () => cyc('time', TIMES.length, 1) },
      { label: 'WEATHER', value: () => WEATHERS[o.weather], left: () => cyc('weather', WEATHERS.length, -1), right: () => cyc('weather', WEATHERS.length, 1) },
      { label: 'KERFUFFLE RULES', value: () => (o.kerf ? 'ON' : 'OFF'), left: () => { o.kerf = !o.kerf; }, right: () => { o.kerf = !o.kerf; }, help: 'Items, specials, stadium targets and chaos events. Off: purist arcade.' },
      { label: 'PLAY', act: () => this.start(), help: () => this.mode === 'versus' ? 'Players: press START on a pad, or 2 on the keyboard, to join. Left / right picks a side.' : 'You bat or bowl after the toss. Beat a team to unlock it.' }
    ] });
  },
  exit() { game.allowJoin(false); },
  start() {
    const o = this.o, P = game.players, humans = { 0: [], 1: [] };
    if (this.mode === 'versus') P.forEach((I, i) => humans[this.sides[i + 1] || 0].push(I)); else humans[0] = [game.input];
    if (!humans[0].length && !humans[1].length) humans[0] = [game.input];
    const D = ['county', 'village', 'test', 'kerfuffle'];
    const cfg = { mode: this.mode, teams: [this.teams[o.a], this.teams[o.b]], ground: GROUND_IDS[o.ground], overs: [1, 2, 3, 5][o.overs], wickets: [2, 3, 5, 10][o.wickets], difficulty: o.diff ? D[o.diff - 1] : K.settings('difficulty'),
      timeOfDay: o.time ? ['day', 'dusk', 'night'][o.time - 1] : null, weather: o.weather ? ['clear', 'overcast', 'rain', 'fog'][o.weather - 1] : null, kerfuffleRules: o.kerf, humans, toss: true };
    game.go('match', { cfg, hooks: { onEnd: (m, r) => { if (r.won && this.mode === 'quick') { const opp = m.teams[1].id; if (Profile.unlock(opp)) r.unlocked = opp; const next = TEAM_IDS.find(t => !Profile.data.unlocked.includes(t)); if (next && r.won) Profile.unlock(next); } Profile.stat('matches'); if (r.won) Profile.stat('wins'); game.go('results', { m, r }); } } });
  },
  update(dt) {
    const I = game.input; if (Idle.step(dt) > 10) { game.go('attract', { segment: K.attractNext || 0 }); return; }
    if (this.mode === 'versus') for (let i = 1; i < game.players.length; i++) { const q = game.players[i]; if (q.pressed('left')) this.sides[i + 1] = 0; if (q.pressed('right')) this.sides[i + 1] = 1; }
    this.list.update(dt, I);
  },
  back() { game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      UI.text(g, this.mode === 'versus' ? 'VERSUS' : 'QUICK MATCH', r.W / 2, 12, UI.gold, { align: 'center', scale: 2 });
      const o = this.o, ta = TEAMS[this.teams[o.a]], tb = TEAMS[this.teams[o.b]];
      for (const [t, x] of [[ta, 16], [tb, r.W - 16 - 54]]) { if (r.W < 400) break; UI.panel(g, x, 40, 54, 70, { border: t.chip }); Cast.rig(t.players[0], 'field').drawPortrait(g, x + 7, 46, 40, { zoom: 3, turn: .3, bg: '#22382a' }); UI.text(g, t.code, x + 27, 90, '#ffffff', { align: 'center' }); UI.text(g, t.nick.replace('The ', '').toUpperCase().slice(0, 10), x + 27, 100, t.chip, { align: 'center', font: 'tiny' }); }
      this.list.draw(g, r);
      if (this.mode === 'versus') {
        const P = game.players, y = r.H - 54; UI.text(g, 'PLAYERS', r.W / 2, y - 12, UI.gold, { align: 'center' });
        for (let i = 0; i < 4; i++) { const q = P[i], side = this.sides[i + 1] || 0, x = r.W / 2 - 150 + i * 76; px.rect(g, x, y, 70, 22, q ? E.PLAYER_COLORS[i] : '#2a2a2a'); UI.text(g, 'P' + (i + 1), x + 4, y + 3, '#ffffff'); UI.text(g, q ? (side ? tb.code : ta.code) : 'JOIN', x + 66, y + 3, '#ffffff', { align: 'right' }); if (q) UI.text(g, q.device === 'gamepad' || q.lastDevice === 'gamepad' ? 'PAD' : q.half === 'right' ? 'KEYS R' : 'KEYS', x + 4, y + 13, '#e8e8e8', { font: 'tiny' }); }
      }
      UI.footer(g, r, game.input, [['up', 'ROW'], ['left', 'CHANGE'], ['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
/* ---- the results: banner, margin, Player of the Match, 3 key stats, the Wisden-style report, stars (story),
 * highlights, then Rematch / Continue / Menu ---- */
scenes.results = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) {
    this.m = d.m; this.r = d.r || {}; this.t = 0; this.hl = null; Idle.reset();
    const m = this.m, r = this.r;
    Audio.music('tea');
    if (r.won !== null && r.won !== undefined) Audio.sting(r.won ? 'win' : 'lose');
    this.list = new UIList({ w: 200, rowH: 16, items: [
      { label: d.continueLabel || 'CONTINUE', hidden: () => !d.onContinue, act: () => d.onContinue() },
      { label: 'HIGHLIGHTS', hidden: () => !(m && m.highlights.some(h => h.frames)), act: () => this.playHighlights() },
      { label: 'REMATCH', hidden: () => !!d.onContinue || !Play.cfg, act: () => game.go('match', { cfg: Object.assign({}, Play.cfg, { seed: (Play.cfg.seed || 1) + 7 }), hooks: K.lastHooks }) },
      { label: 'MENU', act: () => game.go('title') }
    ] });
  },
  playHighlights() {
    const m = this.m, top = m.highlights.filter(h => h.frames).sort((a, b) => b.w - a.w).slice(0, 3);   // (only moments with a recording)
    if (!top.length) return; this.hl = { list: top, i: 0 }; MatchView.attach(m); MatchView.replay = { frames: top[0].frames, t: 0, len: top[0].frames.length / 30, speed: .6, cam: 'wide', ball: top[0].frames[0].ball };
  },
  update(dt) {
    this.t += dt; const I = game.input;
    if (this.hl) {
      MatchView.updateRigs(dt); MatchView.direct(dt);
      if (!MatchView.replay || I.pressed('confirm') || I.pressed('cancel')) { I.consumeAll(); this.hl.i++; const h = this.hl.list[this.hl.i]; if (h) MatchView.replay = { frames: h.frames, t: 0, len: h.frames.length / 30, speed: .6, cam: 'wide', ball: h.frames[0].ball }; else { this.hl = null; MatchView.replay = null; } }
      return;
    }
    if (this.t > .6) this.list.update(dt, I);
  },
  draw(r) {
    const m = this.m, res = (m && m.result) || {}, R = this.r;
    if (this.hl) { MatchView.draw(r); r.overlay(g => { px.rect(g, 0, 0, r.W, 3, '#c8202a'); UI.text(g, 'HIGHLIGHTS ' + (this.hl.i + 1) + '/' + this.hl.list.length, r.W / 2, 8, '#ffffff', { align: 'center' }); UI.footer(g, r, game.input, [['confirm', 'NEXT'], ['cancel', 'DONE']]); }); return; }
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      const win = res.winner ? TEAMS[res.winner] : null;
      E.font.title(g, res.tie ? 'TIED!' : win ? win.code + ' WIN!' : 'RESULT', r.W / 2, 8, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', win ? win.chip : '#ffb347', '#3a1a10'], depth: 2 });
      UI.text(g, res.text || '', r.W / 2, 38, '#ffffff', { align: 'center' });
      if (R.pom) { const p = playerById(R.pom); if (p) { UI.panel(g, 16, 54, 74, 86); Cast.rig(p, 'field').drawPortrait(g, 33, 60, 40, { zoom: 3, turn: .3, bg: '#22382a' }); UI.text(g, 'PLAYER OF', 53, 104, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, 'THE MATCH', 53, 111, UI.gold, { align: 'center', font: 'tiny' }); UI.text(g, p.short.slice(0, 11), 53, 122, '#ffffff', { align: 'center' }); } }
      if (m) { const stats = keyStats(m); stats.forEach((s, i) => { const x = r.W / 2 - 60 + i * 60; UI.text(g, s[0], x, 56, '#ffffff', { align: 'center', scale: 2 }); UI.text(g, s[1], x, 74, '#a8b8a8', { align: 'center', font: 'tiny' }); }); }
      UI.panel(g, Math.max(96, r.W / 2 - 110), 88, Math.min(260, r.W - 110), 58, { bg: ['#f0e8d0', '#e0d4b0'], border: '#8a6a3a' });
      UI.text(g, 'THE KERFUFFLE ALMANACK', Math.max(96, r.W / 2 - 110) + Math.min(260, r.W - 110) / 2, 92, '#5a3a1a', { align: 'center', font: 'tiny', shadow: false });
      UI.para(g, R.report || '', Math.max(96, r.W / 2 - 110) + 6, 100, Math.min(260, r.W - 110) - 12, '#2a1a0a', { font: 'tiny', shadow: false });
      if (R.stars) { R.stars.forEach((s, i) => { UI.text(g, s[1] ? '★' : '-', r.W / 2 - 140, 152 + i * 11, s[1] ? '#ffd36a' : '#5a5a5a'); UI.text(g, s[0], r.W / 2 - 130, 152 + i * 11, s[1] ? '#ffffff' : '#8a8a8a'); }); }
      if (R.unlocked) UI.text(g, 'UNLOCKED: ' + TEAMS[R.unlocked].name.toUpperCase(), r.W / 2, R.stars ? 188 : 156, '#6aff8a', { align: 'center' });
      this.list.y = Math.max(R.stars ? 190 : 166, r.H - 80); this.list.draw(g, r);
      UI.footer(g, r, game.input, [['confirm', 'SELECT']]);
    });
  }
};
function keyStats(m) {
  const all = m.innings.filter(i => !i.posted);
  const sixes = all.reduce((s, i) => s + i.sixes, 0), fours = all.reduce((s, i) => s + i.fours, 0), wk = all.reduce((s, i) => s + i.wkts, 0);
  return [[String(sixes), 'SIXES'], [String(fours), 'FOURS'], [String(wk), 'WICKETS']];
}
/* ---- About / Credits: paged, one topic per page ---- */
scenes.about = {
  view: 'threequarter', camera: { zoom: false },
  enter(d) { this.page = 0; this.t = 0; this.ending = !!(d && d.ending); Idle.reset(); Audio.music(this.ending ? 'title' : 'tea'); this.screens = null; },
  /** the pages laid out for this screen: a long topic continues on a second screen ("2/2") */
  layout(W, H) {
    const w = Math.min(W - 30, 420), maxH = H - 58, out = [], lh = E.font.lineHeight({}) + 2;
    for (const P of ABOUT) {
      let cur = { title: P.title, rows: [] }, h = 0; const parts = [];
      for (const line of P.lines) { const label = Array.isArray(line) ? line[0] : null, text = Array.isArray(line) ? line[1] : line, wr = E.font.wrap(String(text), w - 8, {}); parts.push({ label, wr }); }
      const turn = () => { out.push(cur); cur = { title: P.title, rows: [], cont: true }; h = 0; };
      for (const p of parts) {
        const need = (p.label ? lh : 0) + p.wr.length * lh + 4;
        if (need <= maxH) { if (h + need > maxH && cur.rows.length) turn(); cur.rows.push(p); h += need; continue; }
        // an answer taller than a whole screen: its lines run on over as many screens as it needs
        let wr = p.wr, label = p.label;
        while (wr.length) {
          const head = label ? lh : 0, room = Math.floor((maxH - h - head - 4) / lh);
          if (room < Math.min(3, wr.length) && cur.rows.length) { turn(); continue; }
          const take = Math.max(1, Math.min(wr.length, room));
          cur.rows.push({ label, wr: wr.slice(0, take) }); h += head + take * lh + 4; wr = wr.slice(take); label = null;
        }
      }
      out.push(cur);
    }
    return out;
  },
  update(dt) {
    this.t += dt; const I = game.input; if (!this.screens) this.screens = this.layout(game.W || 427, game.H || 240); const n = this.screens.length;
    if (I.pressed('right') || I.pressed('confirm') || I.pressed('shot')) { I.consumeAll(); if (this.page < n - 1) { this.page++; K.sfx('pageTurn'); } else if (this.t > .5) game.go('title'); }
    if (I.pressed('left')) { this.page = Math.max(0, this.page - 1); K.sfx('pageTurn'); }
    if (I.pressed('cancel')) { I.consumeAll(); game.go('title'); }
    const c = I.clicked && I.clicked(); if (c) { if (c[0] > K.game.W / 2) { if (this.page < n - 1) this.page++; else game.go('title'); } else this.page = Math.max(0, this.page - 1); }
  },
  back() { game.go('title'); return true; },
  draw(r) {
    TitleWorld.step(1 / 60); TitleWorld.draw(r);
    if (!this.screens || this.screensW !== r.W || this.screensH !== r.H) { this.screens = this.layout(r.W, r.H); this.screensW = r.W; this.screensH = r.H; this.page = Math.min(this.page, this.screens.length - 1); }
    const P = this.screens[this.page];
    r.overlay(g => {
      px.blend(g, .82, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#06100a'));
      UI.text(g, (this.page + 1) + ' / ' + this.screens.length, 8, 10, '#a8a090');
      UI.text(g, P.title + (P.cont ? ' (CONT.)' : ''), r.W / 2, 8, UI.gold, { align: 'center', scale: 2 });
      let y = 30; const w = Math.min(r.W - 30, 420), x = Math.round(r.W / 2 - w / 2), lh = E.font.lineHeight({}) + 2;
      for (const p of P.rows) { if (p.label) { UI.text(g, p.label, x, y, '#ffd36a'); y += lh; } for (const l of p.wr) { UI.text(g, l, x + 8, y, '#ffffff'); y += lh; } y += 4; }
      UI.footer(g, r, game.input, [['left', 'PAGE'], ['confirm', 'NEXT'], ['cancel', 'BACK']]);
    });
  }
};
K.titleLogo = titleLogo; K.TitleWorld = TitleWorld;
