/* MAIN: the game, boot, scenes (title, play, attract, race), settings, saves, debug handle. */
const E = My3D2dge;
B.hubInfo = null; B.inSessionEarly = !!(typeof AIHub !== 'undefined' && AIHub.active);
B.inSession = () => !!(typeof AIHub !== 'undefined' && AIHub.active && B.hubInfo);
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', group: 'Game', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], apply: (g, v) => { if (B.S) B.S.diff = v; }, help: 'Easy: weaker monsters, half the hunger. Hard: tougher monsters, more interruptions.' },
  { key: 'menusTime', label: 'Time in menus', group: 'Game', type: 'select', value: 'slow', options: [['pause', 'Pause'], ['slow', 'Slow'], ['real', 'Real time']], apply: (g, v) => { B.T.menus = { pause: 0, slow: .25, real: 1 }[v]; B.TD.menus = B.T.menus; }, help: 'How fast the world runs while the Party, Cast and Camp screens are open.' },
  { key: 'stepAnim', label: 'Step animation', group: 'Game', type: 'select', value: 'smooth', options: [['smooth', 'Smooth'], ['quick', 'Quick'], ['instant', 'Instant']], apply: (g, v) => { B.opt.anim = v; } },
  { key: 'bob', label: 'Head bob', group: 'Game', type: 'toggle', value: true, apply: (g, v) => { B.opt.bob = v; } },
  { key: 'minimap', label: 'Minimap', group: 'Game', type: 'toggle', value: false, apply: (g, v) => { B.opt.minimap = v; }, help: 'A small map of what you have seen, top right.' },
  { key: 'hints', label: 'Hints', group: 'Game', type: 'toggle', value: true, apply: (g, v) => { B.opt.hints = v; }, help: 'First-time tips, and puzzle hints when you linger.' },
  { key: 'levelUp', label: 'Level up', group: 'Game', type: 'select', value: 'now', options: [['now', 'At once'], ['rest', 'On rest']], apply: (g, v) => { B.opt.lvlRest = v === 'rest'; } },
  { key: 'voices', label: 'Voices volume', group: 'Sound', type: 'slider', value: .8, min: 0, max: 1, step: .05 }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: UI.INPUT(), id: 'eye-of-the-bolt-holder',
  menu: { settings: [...E.World3D.SETTINGS, ...SETTINGS], quit: B.inSessionEarly ? false : 'title', saves: B.inSessionEarly ? false : { slots: 3, version: 1 }, controls: { fwd: 'Step forward', back: 'Step back', strafeL: 'Sidestep left', strafeR: 'Sidestep right', turnL: 'Turn left', turnR: 'Turn right', use: 'Use', putDown: 'Put down', throw: 'Throw', strike: 'Party Strike', party: 'Party', camp: 'Camp', examine: 'Examine', map: 'Map', journal: 'Journal', selPrev: false, selNext: 'Next member', handMain: 'Main hand', handOff: 'Off hand', m1: false, m2: false, m3: false, m4: false, m5: false, m6: false, tabL: false, tabR: false, alt: false, altB: false, altC: false, altD: false, up: false, down: false, left: false, right: false },
    items: () => B.inSession() ? [] : [['Party', () => { game.resume(); UI.open('party'); }], ['Journal', () => { game.resume(); UI.open('journal'); }], ['Dev Mode', () => { game.resume(); UI.open('dev'); }], ['About & Credits', () => { game.resume(); UI.open('about'); }]] } });
window.__game = { game, B, UI };
game.input.touchEnabled = false;   // no touch controls: a touch-only device gets the notice and the settings button
addEventListener('keydown', () => { UI.seenKeys = true; });
// the hub's rule: while Create (Pad8) is held, Options (Pad9) belongs to the hub's corner bar, not to the game's pause menu
{ const op = game.pause.bind(game); game.pause = (r) => { if (B.inSessionEarly && game.input.held && game.input.held.has('Pad8')) return false; return op(r); }; }
UI.game = game; const V = B.View; B.game = game;
const scenes = B.scenes;
B.quit = () => { B.Music.stop(); if (B.inSession()) return; game.go('title'); };
/* ---- saves ---- */
if (game.saves && !B.inSessionEarly) game.saves.write = () => ({ data: B.serialize(), place: B.FLOORS[B.S.floor].name, level: Math.max(...B.S.party.members.map(m => m.lvl)) });
if (game.saves && !B.inSessionEarly) game.saves.read = (save) => { if (!B.deserialize(save.data)) return; game.go('play', { resume: true }); };
B.autosave = () => { try { if (!B.inSession() && !(B.S.race) && !UI.attract) game.saves.autosave(); } catch (e) { } };
if (game.saves && !B.inSessionEarly) game.saves.canSave = true;
/* ---- the boot ---- */
const BOOT = [
  ['Starting up', async () => { B.hubInfo = await Promise.resolve(window.__hubInfo || null).catch(() => null); }],
  ['The 3D engine', async () => { if (!E.World3D) throw new Error('The 3D libraries could not load. Check the connection and reload.'); await E.World3D.init(game); }],
  ['Sound', () => { B.Music.init(game); B.babble.init(game); UI.dlg = new E.Dialog(game, { speed: 42, lines: 3, bg: '#1c1813', border: '#b8924a', color: '#f0e6d0', nameColor: '#ffd36a', voice: null }); UI.dlg.voice = null; }],
  ['A showcase dungeon', () => { if (B.inSession()) B.startRace(Math.floor(AIHub.rng('deal')() * 2147483646) + 1); else B.startGame(4242, null, 'normal'); }],
  ['Worlds of lock and stone', () => { V.build(game, B.inSession() ? ['rr'] : null); }],
  ['Building the shaders', () => { V.enter(B.inSession() ? 'rr' : 'f1'); V.prepareAll(); if (B.inSession()) AIHub.ready(); }]
];
/* ---- play scene ---- */
scenes.play = {
  view: 'iso', input: UI.INPUT(), pausable: true,
  enter(d) {
    UI.attract = false; UI.screen = null; UI.logs = []; UI.pops = []; UI.chev = []; UI.cardHurt = {}; game.timeScale = 1; UI.tips = d && d.resume ? UI.tips : {};
    for (const m of B.S.party.members) m.rig = null;
    V.enter(B.S.floor); B.Music.cur = null; B.Music.play(B.FLOORS[B.S.floor].song); B.S.events.length = 0; UI.floorToast = { text: B.FLOORS[B.S.floor].name, t: 3 };
    if (d && d.intro) { UI.cutscene(B.INTRO, () => { UI.tipOnce('move', UI.game.input.label('fwd') + ' / stick to step, ' + UI.game.input.label('turnL') + ' ' + UI.game.input.label('turnR') + ' to turn'); }); }
  },
  update(dt) {
    const S = B.S; UI.updateHud(dt);
    if (UI.curCut && game.input.pressed('cancel')) { game.input.consume('cancel'); UI.curCut.skip(); }
    const modal = UI.dlg && UI.dialogUpdate(dt);
    if (!modal) { if (UI.screen) { UI.screen.update(dt); } else UI.controls(dt); }
    if (S.camp && !UI.screen) UI.open('camp');
    B.update(dt); UI.pump();
    if (S.over && !UI.overShown) { UI.overShown = true; B.Music.stop(); B.Music.sting('gameOver'); UI.open('over'); } if (!S.over) UI.overShown = false;
    if (S.ended && !UI.endShown) { UI.endShown = true; UI.open('ending'); }
    if (S.race) B.raceTick && B.raceTick(dt);
    B.Music.update(dt, UI.engaged());
    V.update(dt); UI.talkHooks && UI.talkHooks(dt);
  },
  draw(r) {
    if (V.cur) V.cur.draw(r);
    r.overlay(g => { if (UI.screen && UI.screen.fullscreen) { } UI.hud(g, r); UI.devOverlay && UI.devOverlay(g, r); if (UI.screen) { UI.screen.draw(g, r); } if (UI.dlg) UI.dlg.draw(r); UI.drawFade(g, r); });
  },
  back() { if (UI.screen) { UI.close(); return true; } return false; }
};
UI.drawFade = (g, r) => { if (UI.fade && UI.fade.a > 0) { g.save(); g.globalAlpha = UI.fade.a; g.fillStyle = '#000'; g.fillRect(0, 0, r.W, r.H); g.restore(); } };
game.debug = {
  snapshot() { const S = B.S; if (!S) return { scene: game.sceneName }; const p = S.party; return { scene: game.sceneName, floor: S.floor, cell: [p.cx, p.cy], dir: p.dir, screen: UI.screen && UI.screen.id, hand: p.hand && p.hand.id, party: p.members.map(m => ({ n: m.name, hp: m.hp, max: m.max, st: m.state, food: m.food, lvl: m.lvl })), mons: B.F().mons.filter(m => m.hp > 0).map(m => ({ t: m.type, x: m.cx, y: m.cy, s: m.state })), flags: S.flags, errors: game.errors.length }; },
  state: () => B.S, hash: () => B.hash(B.S), cmd: c => B.cmd(c), warp: (f, x, y, d) => { B.warp(f, x, y, d); }, give: (id) => B.give(id), cheats: B.CHEATS, B, UI
};
