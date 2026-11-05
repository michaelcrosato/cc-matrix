/* 99-main: building the game, the settings, the pause actions, the scene registry, hub detection, the boot. */
E.VIEWS.court = G.VIEW_COURT; E.VIEWS.servecamL = G.VIEW_SERVE[0]; E.VIEWS.servecamR = G.VIEW_SERVE[1];
G.hub = G.inHub();
G.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', group: 'Game', value: 'Normal', options: ['Easy', 'Normal', 'Hard', 'Pro'] },
  { key: 'assist', label: 'Timing assist', type: 'select', group: 'Game', value: 'Normal', options: ['Tight', 'Normal', 'Generous'], help: 'How wide the timing windows are' },
  { key: 'autoRun', label: 'Auto-run to the ball', type: 'toggle', group: 'Game', value: true },
  { key: 'autoReceive', label: 'Auto-receive', type: 'toggle', group: 'Game', value: false, help: 'Serves you do not press for are bumped for you' },
  { key: 'ring', label: 'Timing ring', type: 'toggle', group: 'Game', value: true },
  { key: 'matchCam', label: 'Match camera', type: 'select', group: 'Game', value: 'court', options: [['court', 'Broadcast'], ['servecam', 'Serve Cam']] },
  { key: 'textSpeed', label: 'Text speed', type: 'select', group: 'Game', value: 'Normal', options: ['Slow', 'Normal', 'Fast', 'Instant'], apply: (g, v) => { G.T.textSpeed = { Slow: 25, Normal: 45, Fast: 90, Instant: 200 }[v] || 45; } },
  { key: 'commentary', label: 'Commentary', type: 'toggle', group: 'Game', value: true },
  { key: 'voices', label: 'Voices', type: 'slider', group: 'Sound', value: .8, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } }
];
G.pauseItems = () => [
  ['How to Play', () => { G.game.resume(); G.overlay.push(G.howtoOverlay()); }],
  G.canPhoto() ? ['Take a Postcard', () => { G.game.resume(); G.photo.open(); }] : null,
  ['Dev Mode', () => { G.game.resume(); G.dev.open(); }]
];
const game = G.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'court', id: 'ahead-or-alive', bg: '#0a2d3d',
  menu: G.hub ? false : { items: G.pauseItems, settings: G.SETTINGS, quit: 'title', controls: { view: 'Camera', play: 'Hit (timed)', shot: 'Shot / Block', dive: 'Dive', call: 'Call' } },
  autoPause: !G.hub, corner: !G.hub, fullscreen: G.hub ? false : 'button', backGesture: !G.hub
});
G.initAudio(game);
if (!G.hub) G.setupSaves();
game.audio.voiceVolume = game.settings.voices === undefined ? .8 : game.settings.voices;
game.input.reserveCombo = [8, 9];
for (const k of ['glyphs']) if (game.settings[k] !== undefined) game.input.glyphs = game.settings[k];
if (game.settings.glyphs === undefined || game.settings.glyphs === 'auto') game.input.glyphs = 'playstation';
G.T.textSpeed = { Slow: 25, Normal: 45, Fast: 90, Instant: 200 }[game.settings.textSpeed] || G.T.textSpeed;
game.input.touchEnabled = !G.touchOnly();
G.mouseAim = true;
// the scene registry: each module adds its scenes to G.SCENES; every scene goes through G.wrapScene
G.SCENES = G.SCENES || {};
G.go = (name, data, o) => game.go(name, data, o);
G.canPhoto = () => !G.hub && (game.sceneName === 'location' || game.sceneName === 'results' || game.sceneName === 'casino');
G.startGame = () => {
  const scenes = {}; for (const k in G.SCENES) scenes[k] = G.wrapScene(k, G.SCENES[k]);
  game.start({ scenes, scene: G.hub ? 'hub' : 'title', boot: { title: 'AHEAD OR ALIVE', steps: [
    ['Raking the sand', () => G.courtMap()],
    ['Inflating volleyballs', () => { for (const id of G.FIGHTERS) G.rigFor(id); }],
    ['Chilling the smoothies', () => { G.backdrop('afternoon'); G.backdrop('sunset'); G.backdrop('night'); }],
    ['Counting Sonny\'s chips', () => { G.hostRig('sonny'); G.hostRig('pepper'); }],
    ['Polishing the golden sunglasses', () => { if (G.locMaps) G.locMaps(); }]
  ] } });
  game.debug = G.debugHandle();
  if (typeof setInterval === 'function' && typeof document !== 'undefined') setInterval(() => { G.pollPads(); G.pollDevCombo(); }, 250);
};
G.startGame();
