/* Densha de Halo! • 99-start: the game. It compiles the routes once, builds the scenery, sets the input map and the
 * settings, registers the scenes, and starts on the title (or on a deep link: #stage=S3, #attract, #gallery ...). */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;

/* the routes, compiled and dressed once (the sim and the renderer read them; nothing writes to them after) */
DH.compiled = {};
for (const id of ['halo', 'depot']) { const r = DH.compileRoute(DH.ROUTES[id]); DH.buildScenery(r); DH.placeLineside(r); DH.compiled[id] = r; }

/* the controls: the actions the drive uses; the engine's jump, attack, dash and skill are removed (section 2) */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  power: ['Pad7'], brake: ['Pad6'],
  leverUp: ['KeyW', 'ArrowUp', 'Pad12', 'PadAxisUp'], leverDown: ['KeyS', 'ArrowDown', 'Pad13', 'PadAxisDown'],
  neutral: ['KeyN', 'Pad5'], eb: ['Backspace', 'KeyX', 'Pad4'], call: ['KeyE', 'Mouse0', 'Pad0'], horn: ['Space', 'Pad2'],
  ats: ['KeyQ', 'Pad3'], view: ['KeyC', 'Pad1']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', input: KEYS,
  menu: {
    items: [
      ['Retry stage', () => { const S = DH.currentDrive; if (S) game.go('briefing', { stage: S.st.id }); }],
      ['Dev Mode', () => { DH.suspended = DH.currentS || null; game.go('dev', { back: 'drive', backData: { resume: true } }); }],
      ['How to Drive', () => game.go('help')]
    ],
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Expert'], value: 'Normal' },
      { key: 'buttons', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
      { key: 'subtitles', label: 'Subtitles', options: ['On', 'Off'], value: 'On' },
      { key: 'autoCalls', label: 'Auto calls', options: ['Off', 'On'], value: 'Off' },
      { key: 'guide', label: 'Braking guide', options: ['On', 'Off'], value: 'On' },
      { key: 'tips', label: 'Show tips', options: ['On', 'Off'], value: 'On' },
      { key: 'stopCam', label: 'Stop Cam', options: ['On', 'Off'], value: 'On' },
      { key: 'lever', label: 'Lever direction', options: ['Up = Power', 'Up = Brake'], value: 'Up = Power' }
    ],
    quit: 'title'
  }
});
DH.game = game;
DH.Sound.attach(game);
game.input.glyphs = 'playstation';

const scenes = Object.assign(DH.makeScenes(game), DH.makeHubScenes(game), DH.makeDuelScenes(game));
// the drive keeps a reference for the pause menu's retry (set when it starts)
const driveEnter = scenes.drive.enter;
scenes.drive.enter = function (data) { DH.currentDrive = { st: DH.stageById(data.stage) }; return driveEnter.call(this, data); };
scenes.dev = Object.assign({}, scenes.dev);

// the input's sources: a pad or a key seen (touch-only detection, section 4.15)
window.addEventListener && window.addEventListener('gamepadconnected', () => { DH.seenPad = true; });
window.addEventListener && window.addEventListener('keydown', () => { DH.seenKey = true; });
window.addEventListener && window.addEventListener('wheel', (e) => { const I = game.input; if (!I || !game.input.tap) return; if (e.deltaY < 0) I.tap('power'); else if (e.deltaY > 0) I.tap('brake'); }, { passive: true });

// the boot: the title, or a deep link (section 3.3): #stage=S3, #attract, #dev, #halomap, #results=S1, #about, #help
const hash = (window.location && window.location.hash) || '';
let start = 'title', startData = null;
if (window.AIHub && window.AIHub.active) start = 'hubBoot';   // a session: the round, straight away (section 4.23)
if (/#attract/.test(hash)) start = 'attract';
else if (/#dev/.test(hash)) start = 'dev';
else if (/#halomap/.test(hash)) start = 'map';
else if (/#about/.test(hash)) start = 'about';
else if (/#help/.test(hash)) start = 'help';
else if (/#log/.test(hash)) start = 'log';
const m = /#stage=(S\d|PR)/.exec(hash);
if (m) { start = 'briefing'; DH.deepStage = m[1]; }

game.start({ scenes, scene: start, sceneData: startData, boot: { title: 'DENSHA DE HALO!', steps: [['Compiling the Halo Line', () => {}]] } });
DH.started = start;

// a handle for the tests and tools (game.debug.snapshot, teleport-like helpers through the sim)
game.debug = {
  snapshot: () => (DH.liveSim ? Object.assign({ scene: game.sceneName }, DH.liveSim.snapshot()) : { scene: game.sceneName }),
  scene: () => game.sceneName
};
window.__dh = { game, DH, snapshot: () => game.debug.snapshot() };
})();
