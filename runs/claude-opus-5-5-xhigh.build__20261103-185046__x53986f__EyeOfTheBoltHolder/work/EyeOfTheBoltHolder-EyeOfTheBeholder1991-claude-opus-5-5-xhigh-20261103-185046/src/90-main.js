/* =====================================================================================
 * 90-main: the game (E.Game), its settings and saves, the scenes (title, attract, create, cutscene, play, over, credits,
 * about, hubcard), the boot (the 3D engine, every world, the shaders) and game.debug, the handle tests and tools read
 * ===================================================================================== */
const GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', group: 'Game', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], help: 'Easy: weaker blows, less hunger. Hard: harder blows, tougher monsters, more interrupted rests.', apply: (g, v) => { if (S && S.mode === 'campaign') S.diff = v; } },
  { key: 'menuTime', label: 'Time in menus', group: 'Game', type: 'select', value: 'slow', options: [['pause', 'Pause'], ['slow', 'Slow'], ['real', 'Real time']], help: 'How the dungeon runs while the Party, Cast or Map screen is open.', apply: (g, v) => { B.T.menuTime = v === 'pause' ? 0 : v === 'real' ? 1 : .25; } },
  { key: 'stepAnim', label: 'Step animation', group: 'Game', type: 'select', value: 'smooth', options: [['smooth', 'Smooth'], ['quick', 'Quick'], ['instant', 'Instant']], help: 'Instant moves a cell at once, as the old games did.', apply: (g, v) => { B.stepMode = v; } },
  { key: 'headBob', label: 'Head bob', group: 'Game', type: 'toggle', value: true, apply: (g, v) => { B.opt.bob = !!v; } },
  { key: 'hints', label: 'Hints', group: 'Game', type: 'toggle', value: true, help: 'First-time tips, and help with a puzzle you linger at.', apply: (g, v) => { B.opt.hints = !!v; } },
  { key: 'levelUp', label: 'Level up', group: 'Game', type: 'select', value: 'now', options: [['now', 'At once'], ['rest', 'On rest']], apply: (g, v) => { B.opt.levelUp = v; } },
  { key: 'voices', label: 'Voices volume', group: 'Game', type: 'slider', value: .8, min: 0, max: 1, step: .05, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: KEYS, id: 'eye-of-the-bolt-holder',
  menu: { items: () => B.pauseItems(), settings: (W3 ? W3.SETTINGS : []).concat(GAME_SETTINGS), controls: B.CONTROL_NAMES, saves: { version: 1, migrate: d => d }, quit: 'title' } });
B.game = game;
B.view = W3 ? View3D : NullView;
game.input.touchEnabled = false;
B.pauseItems = () => {
  if (Hub.active || !S || game.sceneName !== 'play') return [];
  return [['Journal', () => { game.resume(); UI.closeAll(); UI.open('journal'); }], ['About & Credits', () => { game.resume(); game.go('about', { from: 'play' }); }], ['Dev Mode', () => { game.resume(); UI.closeAll(); UI.open('dev'); }]];
};
game.saves.write = () => ({ data: B.serialize(), place: B.FLOORS[S.floor].name, level: Math.max(...S.party.members.map(m => m.lvl)) });
game.saves.read = save => { B.load(save.data); UI.closeAll(); UI.rigs.clear(); B.view.enter(S.floor); game.go('play', { loaded: true }); };
/** run a command now (the UI's), and let the view, the sound and the HUD see what it did; returns its events */
B.cmd = c => { if (!S) return []; const n = S.events.length; B.command(c); const evs = S.events.slice(n); S.events.length = n; Play.dispatch(evs); return evs; };
B.startCampaign = defs => { B.newGame({ seed: (Date.now() >>> 0) % 1000000, party: defs, diff: game.settings.difficulty || 'normal' }); UI.rigs.clear(); B.view.enter(S.floor); game.go('cutscene', { id: 'intro' }); };
const Play = {
  overT: 0, endT: 0, countdown: 0,
  dispatch(evs) {
    for (const e of evs) {
      B.view.event(e); Sound.event(e); UI.event(e);
      if ((e.t === 'arrived' || e.t === 'autosave') && S.mode === 'campaign' && !Hub.active && !B.Attract.on) game.saves.autosave();
      if (e.t === 'floor') { B.view.enter(e.to); Sound.floorSong(); }
      if (e.t === 'raceDone' || e.t === 'raceWipe') { if (!B.Attract.on) game.after(1, () => { if (game.sceneName === 'play') UI.open('raceResults'); }); }
      if (B.Dev.overlays.events) { (B.lastEvents || (B.lastEvents = [])).push(e.t + (e.id ? ' ' + e.id : '') + (e.uid ? ' #' + e.uid : '')); if (B.lastEvents.length > 40) B.lastEvents.splice(0, 20); }
    }
  }
};
B.Play = Play;
const scenes = Object.assign({}, B.scenesShell, B.scenesHub, B.scenesCut);
scenes.start = { enter() { if (Hub.active) { B.startRace(); return; } const h = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/'); if (h[0] === 'play') { B.newGame({ seed: 7 }); B.view.enter(S.floor); game.go('play', { newGame: true }, { fade: 0 }); return; } if (h[0] === 'warp' && B.FLOORS[h[1]]) { B.newGame({ seed: 7, party: h[5] === 'demo' ? 'demo' : undefined }); B.goFloor(h[1], [+h[2], +h[3], +h[4] || 0]); B.view.enter(S.floor); game.go('play', {}, { fade: 0 }); return; } if (h[0] === 'race') { B.startRace({ solo: true }); return; } if (h[0] === 'attract') { game.go('attract', null, { fade: 0 }); return; } game.go('title', null, { fade: 0 }); } };
scenes.attract = {
  input: KEYS,
  enter() { B.Attract.begin(); game.input.consumeAll(); this.t = 0; },
  exit() { B.Attract.end(); },
  update(dt) {
    this.t += dt; UI.update(dt);
    if (B.Attract.input(this.t > .3)) { game.input.consumeAll(); const from = B.Attract.from; B.Attract.from = null; game.go(from === 'play' && S ? 'play' : 'title', from === 'play' ? { resume: true } : null, { fade: .15 }); return; }
    B.Attract.step(dt);
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H;
    const v = B.Attract.V[B.Attract.vi];
    if (v.title || !S) { if (B.Stages) B.Stages.drawTitle(r); r.overlay(g => { E.font.title(g, 'EYE OF THE', r.W / 2, r.H * .3, { scale: 2, align: 'center', colors: TITLE_COLORS }); E.font.title(g, 'BOLT-HOLDER', r.W / 2, r.H * .3 + 20, { scale: 4, align: 'center', colors: TITLE_COLORS, depth: 3 }); TXT(g, B.TAGLINE, r.W / 2 - TW(B.TAGLINE) / 2, r.H * .3 + 58, '#e8d8b0'); }); }
    else { B.view.draw(r); r.overlay(g => { drawHud(g, r); drawTransit(g, r); if (UI.any()) UI.top().s.draw(g, r); PlayTalk.draw(g, r); }); }
    r.overlay(g => {
      panel(g, 4, r.H * .5 - 8, 40, 14, { rivets: false, border: '#c84a3a' }); TXT(g, 'DEMO', 12, r.H * .5 - 5, '#ff8a6a');
      if (v.name && !v.title) TXT(g, v.name, 4, r.H * .5 + 8, '#e8d8b0');
      if (Math.floor(game.real * 1.6) % 2) { const w = B.touchOnly() ? TW('Touch to return') : TW('Press') + 14 + TW('/ any key'); const x = r.W / 2 - w / 2, y = r.H * .82; if (B.touchOnly()) TXT(g, 'Touch to return', x, y, COL.focus); else { TXT(g, 'Press', x, y, COL.focus); glyph(g, 'confirm', x + TW('Press') + 2, y - 2, 'pad'); TXT(g, '/ any key', x + TW('Press') + 16, y, COL.focus); } }
    });
  }
};
scenes.play = {
  pausable: true, input: KEYS,
  enter(d) {
    d = d || {};
    if (!S) { B.newGame({ seed: 7 }); }
    UI.closeAll(); Play.overT = 0; Play.endT = 0; game.timeScale = 1; Idle.reset();
    B.view.enter(S.floor); Sound.song = null; Sound.floorSong();
    if (S.race) Play.countdown = Hub.active ? 0 : 3; else Play.countdown = 0;
    if (d.newGame) B.beginCampaign();
    if (Hub.active) { game.saves.canSave = false; game.saves.canLoad = false; game.o.menu.quit = false; }
  },
  back() { if (UI.any()) { UI.close(); return true; } return false; },
  update(dt) {
    const real = game.o.step || 1 / 120, I = game.input;
    UI.update(real);
    game.saves.canSave = B.canSaveHere(); if (Hub.active) game.saves.canLoad = false;
    if (Hub.active && Hub.ended) return;
    const top = UI.top();
    game.timeScale = top && ['party', 'cast', 'journal', 'map', 'reader', 'dev'].includes(top.name) ? B.T.menuTime : 1;
    let cmds = [];
    const locked = S.race && (Hub.active ? (window.AIHub.time() < 0) : Play.countdown > 0);
    if (!Hub.active && Play.countdown > 0) Play.countdown -= real;
    if (S.transit && S.transit.swapped && (I.anyPressed() || I.clicked())) B.cmd({ c: 'skipCard' });
    const talking = PlayTalk.update(real);   // a conversation takes the controls
    if (talking) cmds = [];
    else if (top) top.s.update(real);
    else if (B.autoPlay) { if (I.anyPressed()) { B.autoPlay = null; UI.toast = { text: 'Auto-play stopped.', t: 0 }; } else { cmds = B.Bot.tick(B.autoPlay, dt); if (B.autoPlay.done) { B.autoPlay = null; UI.toast = { text: 'Auto-play: the floor\'s walk is done.', t: 0 }; } } }
    else if (!locked && !S.over) {
      const raw = Controls.read(real).concat(UI.cardClicks(), UI.helperClicks());
      // the mouse in the view: a click on a hotspot uses it; with the Hand, low puts it down and high throws it
      const ck = I.clicked();
      if (ck && UI.inView() && !raw.some(c => c.c === 'hand' || c.c === 'select' || c.ui)) {
        const h = B.view.pick(ck[0], ck[1]);
        if (h) raw.push(h.cmd); else if (S.party.hand) raw.push({ c: ck[1] > UI.barTop() * .62 ? 'putDown' : 'throw' });
      }
      for (const c of raw) {
        if (c.ui === 'camp') { if (S.race) continue; if (B.enemiesNear(6)) { B.say('m_noRest', null, { rate: 1 }); continue; } B.cmd({ c: 'camp', op: 'open' }); if (S.camp) UI.open('camp'); }
        else if (c.ui === 'party') UI.open('party', { m: c.m !== undefined ? c.m : S.party.sel });
        else if (c.ui) UI.open(c.ui);
        else cmds.push(c);
      }
    }
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    if (!locked) B.update(dt, cmds, real); else S.events.length = 0;
    B.simMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
    Play.dispatch(S.events);
    B.view.step(dt); B.view.tickFx(real);
    if (S.race) Hub.step(real);
    Sound.ambience(real);
    if (S.over && !S.race) { Play.overT += real; if (Play.overT > 1.6) game.go('over'); }
    if (S.won) { Play.endT += real; if (Play.endT > .6 && game.sceneName === 'play') game.go('cutscene', { id: 'ending' }); }
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H;
    B.view.draw(r);
    r.overlay(g => {
      drawHud(g, r); drawTransit(g, r);
      if (UI.any()) UI.top().s.draw(g, r);
      PlayTalk.draw(g, r);
      if (B.Dev.overlays) B.Dev.drawOverlays(g, r);
      if (S.race) { const t = Hub.active ? -window.AIHub.time() / 1000 : Play.countdown; if (t > 0) { const n = Math.ceil(t); E.font.title(g, n > 3 ? '...' : String(n), r.W / 2, r.H * .3, { scale: 4, align: 'center', colors: TITLE_COLORS }); } else if (t > -1 && (Hub.active ? window.AIHub.time() < 1000 : Play.countdown > -1)) E.font.title(g, 'GO!', r.W / 2, r.H * .3, { scale: 4, align: 'center', colors: TITLE_COLORS }); }
      if (Hub.active && Hub.ended) { const t = Hub.ended.reason === 'finished' ? 'The round is over.' : 'The round ended: ' + Hub.ended.reason + '.'; panel(g, r.W / 2 - 100, r.H / 2 - 10, 200, 20); TXT(g, t, r.W / 2 - TW(t) / 2, r.H / 2 - 4, COL.focus); }
    });
  }
};
/* ---- the boot: the 3D engine, then every world behind the boot screen, then the shaders ---- */
const BOOT = [];
BOOT.push(['The hub', () => Hub.connect()]);
if (W3) {
  BOOT.push(['The 3D engine: three.js r182, Rapier 0.19.3', () => W3.init(game)]);
  BOOT.push(['The Rat Run', () => { View3D.build('race', { light: !!Hub.active }); if (Hub.active) Hub.ready(); }]);
  for (const f of B.FLOOR_ORDER) BOOT.push(['The ' + B.FLOORS[f].name.replace(/^The /, ''), () => { if (!Hub.active) View3D.build(f); }]);
  BOOT.push(['The stages', () => { if (!Hub.active) { Stages.build('A'); Stages.build('B'); Stages.build('D'); } }]);
  BOOT.push(['Building the shaders', () => { for (const w of W3.worlds) w.prepare(); }]);
}
BOOT.push(['The sounds', () => { Sound.init(); B.Dev.load(); for (const k of ['menuTime', 'stepAnim', 'headBob', 'hints', 'levelUp', 'voices']) { const sp = GAME_SETTINGS.find(s => s.key === k); if (sp && sp.apply) sp.apply(game, game.settings[k] === undefined ? sp.value : game.settings[k]); } }]);
game.start({ scenes, scene: 'start', boot: { title: 'Eye of the Bolt-Holder', version: B.VERSION, steps: BOOT } });
game.debug = {
  B, get S() { return S; },
  snapshot() {
    if (!S) return { scene: game.sceneName, ui: UI.top() && UI.top().name };
    const P = S.party, near = FL().mons.filter(m => m.hp > 0 && manhattan(m.cx, m.cy, P.cx, P.cy) <= 3).map(m => ({ type: m.type, cx: m.cx, cy: m.cy, hp: m.hp, st: m.st, aware: m.aware, wind: +m.wind.toFixed(2) }));
    return { scene: game.sceneName, floor: S.floor, cell: [P.cx, P.cy], dir: P.dir, tw: !!P.tw, hand: P.hand && P.hand.id, ui: UI.top() && UI.top().name, focus: UI.top() && UI.top().s.focus, talk: S.talk && S.talk.node, transit: S.transit && S.transit.k, camp: !!S.camp, over: S.over, won: S.won,
      party: P.members.map(m => ({ name: m.name, hp: m.hp, max: m.max, state: m.state, food: Math.round(m.food), lvl: m.lvl, cool: [+m.cool.main.toFixed(2), +m.cool.off.toFixed(2)], status: Object.keys(m.status) })), near, flags: S.flags, race: S.race, device: game.input.lastDevice };
  },
  state: () => S, hash: () => B.hash(), cmd: c => B.cmd(c),
  warp(f, x, y, d = 0) { if (!S) B.newGame({ seed: 7 }); S.talk = null; S.transit = null; S.moment = null; if (S.floor !== f) B.goFloor(f, [x, y, d]); else { const P = S.party; P.cx = x; P.cy = y; P.dir = d; P.at = [x, y]; P.tw = null; B._fovKey = null; B.look(); } B.view.enter(S.floor); },
  give(id, n) { const it = B.mkItem(id, n); if (!B.stow(it)) B.addItem(FL(), S.party.cx, S.party.cy, it); return it; },
  cheats: B.CHEATS, bot: B.Bot, UI, SCREENS,
  layout(screen, W, H) { const s = SCREENS[screen]; UI.W = W; UI.H = H; return s && s.layout ? s.layout(W, H) : screen === 'cards' ? UI.cards() : []; }
};
if (typeof window !== 'undefined') window.__game = game;
/* any key at all, bound or not, is input (the attract mode, idle): a count the idle checks compare */
if (typeof addEventListener === 'function') { B._keyAt = 0; addEventListener('keydown', () => { B._keyAt++; B._sawKeys = true; }, { capture: true }); }
