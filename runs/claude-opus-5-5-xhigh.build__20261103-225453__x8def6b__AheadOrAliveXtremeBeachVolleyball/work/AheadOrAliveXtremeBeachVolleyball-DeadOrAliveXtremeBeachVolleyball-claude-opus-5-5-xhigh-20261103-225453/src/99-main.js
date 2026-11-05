/* 99-main: build the game (session options in an AI Hub session), the settings, the pause actions, the scenes and the
 * boot, then start. */
if (!window.AOA_NO_BOOT) {
  const hub = G.hub, touchOnly = !hub && G.touchOnly();
  G.TOUCH_ONLY_AT_BOOT = touchOnly;
  const photoOK = () => !hub && !G.attract && G.photo && G.photo.allowed();
  const SETTINGS = [
    { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard', 'Pro'], value: 'Normal', help: 'How well the opponents play' },
    { key: 'assist', label: 'Timing assist', options: ['Tight', 'Normal', 'Generous'], value: 'Normal', help: 'How wide the timing windows are' },
    { key: 'autoMove', label: 'Auto-run to the ball', value: true, help: 'With the stick still, you run to the ball you are playing' },
    { key: 'autoReceive', label: 'Auto-receive', value: false, help: 'A first touch you miss is played OK for you' },
    { key: 'ring', label: 'Timing ring', value: true, help: 'The ring on the sand that shows where and when' },
    { key: 'matchCam', label: 'Match camera', options: ['Broadcast', 'Serve Cam'], value: 'Broadcast' },
    { key: 'textSpeed', label: 'Text speed', options: ['Slow', 'Normal', 'Fast', 'Instant'], value: 'Normal' },
    { key: 'commentary', label: 'Commentary', value: true, help: "Sonny's play-by-play" }
  ];
  const items = () => [
    ['How to Play', () => { G.game.resume(); G.howtoOverlay && G.howtoOverlay(); }],
    photoOK() && ['Take a Postcard', () => { G.game.resume(); G.photo.open(); }],
    !hub && G.devPanel && ['Dev Mode', () => { G.game.resume(); G.devPanel.open(); }]
  ];
  const game = G.game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'court', id: 'ahead-or-alive', bg: '#0a2d3d',
    menu: hub ? false : { items, settings: SETTINGS, controls: G.ACTION_NAMES, quit: 'title', saves: false },
    autoPause: !hub, corner: !hub, fullscreen: hub ? false : true, touch: (touchOnly || hub) ? 'never' : 'auto', backGesture: !hub
  });
  game.input.reserveCombo = [8, 9];   // engine patch 6: Create + Options is the AI Hub's
  game.audio.instruments = G.INSTRUMENTS;
  G.defineSounds();
  if (!hub) G.ui.shell = new E.Shell(game, { theme: { ink: '#fff8e8', paper: '#0a2d3d', accent: '#ffd36a', muted: '#9fd3d6', danger: '#ff5f7a', line: '#f6d38a', font: '"Trebuchet MS", system-ui, sans-serif', titleFont: '"Trebuchet MS", system-ui, sans-serif' } });
  G.tenFootCSS();
  // overlays run on real time while the game is frozen (the dev panel, photo mode)
  let lastReal = 0;
  const scenes = {};
  for (const k in G.scenes) scenes[k] = G.wrapScene(k, G.scenes[k]);
  const realTick = { update() { const n = game.real || 0; G.realDt = clamp(n - lastReal || 1 / 120, 0, .05); lastReal = n; G.tickWheel(); } };
  for (const k in scenes) { const u = scenes[k].update; scenes[k].update = function (dt) { realTick.update(); return u.call(this, dt); }; }
  const boot = { title: 'AHEAD OR ALIVE', version: G.VERSION, messages: ['Raking the sand', 'Inflating volleyballs', 'Chilling the smoothies', "Counting Sonny's chips", 'Polishing the golden sunglasses'], steps: [
    ['Raking the sand', () => { G.courtMap = G.makeCourtMap(); }],
    ['Inflating volleyballs', () => { G.Anim.init(); }],
    ['Chilling the smoothies', () => { G.loadUnlocks && G.loadUnlocks(); G.buildWorld && G.buildWorld(); }],
    ["Counting Sonny's chips", () => { for (const id of Object.keys(G.CAST)) G.portraitRig(id); }],
    ['Polishing the golden sunglasses', () => { G.afterBoot && G.afterBoot(); }]
  ] };
  game.debug = G.debugHandle ? G.debugHandle() : { snapshot: () => ({ scene: game.sceneName }) };
  const start = hub ? 'hub' : (location.hash || '').slice(1) && scenes[(location.hash || '').slice(1)] ? (location.hash || '').slice(1) : 'title';
  game.start({ scenes, scene: start, boot });
}
