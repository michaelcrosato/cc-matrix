/* 99-main: build the game, register scenes, hub detection, boot. */
G.touchOnly = (() => { try { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(any-pointer: fine)').matches === false && (navigator.maxTouchPoints || 0) > 0; } catch (e) { return false; } })();
G.pauseItems = () => [
  ['Dev Mode', () => { if (G.openDev) G.openDev(); }],
  ['How to Play', () => { if (G.openHowto) G.openHowto(); }]
];
G.build = () => {
  const hub = G.hub;
  const game = G.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'court', id: 'ahead-or-alive', bg: '#0a2d3d',
    menu: hub ? false : { items: G.pauseItems(), settings: [
      { key: 'voices', label: 'Voices', group: 'Sound', type: 'slider', value: .8, apply: (g, v) => { g.audio.voiceVolume = v; if (g.audio._voxBus) g.audio._voxBus.gain.value = v; } },
      { key: 'difficulty', label: 'CPU difficulty', group: 'Game', options: ['Easy', 'Normal', 'Hard'], value: 'Normal', apply: (g, v) => { G.T.aiSkill = v === 'Easy' ? .3 : v === 'Hard' ? .8 : .55; } }
    ], controls: { play: 'Play', dive: 'Dive', call: 'Call', cam: 'Camera' }, quit: 'menu', saves: { slots: 3 } },
    autoPause: !hub, corner: !hub, fullscreen: hub ? false : true, touch: G.touchOnly ? 'never' : 'auto' });
  game._gameOpts = game.o;
  G.installAudio(game); G.installSaves(game);
  try { game.saves.canSave = true; } catch (e) { /* ok */ }
  if (G.touchOnly) { try { game.settings.set('touch', 'off'); } catch (e) { /* ok */ } }
  return game;
};
G.startGame = () => {
  const game = G.game || G.build();
  const scenes = {}; for (const k in G.scenes) scenes[k] = G.scenes[k];
  G.firstScene = G.hub ? 'hub' : 'title';
  game.start({ scenes, scene: G.firstScene });
  game.debug = G.debug();
  return game;
};
G.debug = () => ({
  snapshot() {
    const g = G.game, s = g.scene; const o = { scene: g.sceneName, errors: g.errors.length, attract: !!G.attract };
    if (s && s.m) o.match = s.m.state();
    if (G.state) o.state = { day: G.state.day, slot: G.state.slot, money: G.state.money, partner: G.state.partner, aff: G.state.aff };
    return o;
  },
  G,
  tools: { state: () => G.state, newVacation(seed = 5) { G.state = G.newState(seed); G.reseedWorld(); return G.state; } }
});
if (typeof document !== 'undefined' && document.getElementById('screen') && !window.__AOA_NOBOOT) { G.startGame(); const b = document.getElementById('e3-boot'); if (b) b.remove(); }
