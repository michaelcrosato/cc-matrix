// Start: the game object, its controls, the pause menu, the scenes, the deep links and the boot. The test handle (game.debug)
// is the same one the headless tests and tools read.
// Controls: the engine's menu keys, with the game's own actions. Mouse: the mouse aims and clicks (a click swings, winds up,
// picks a base or a pitch); the right button is the Batzooka. The pad: ✕ swings, □ is the Batzooka, L1 and R1 change pitch.
BZ.PRESET = Object.assign({}, E.Input.DEFAULT, {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'],
  left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Space', 'Enter', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'Pad1'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  power: ['KeyJ', 'Mouse2', 'Pad2'],
  prevPitch: ['KeyQ', 'Pad4'], nextPitch: ['KeyE', 'Pad5'],
  more: ['KeyM', 'Pad3']
});
delete BZ.PRESET.attack; delete BZ.PRESET.dash; delete BZ.PRESET.skill; delete BZ.PRESET.jump;

BZ.pauseItems = () => {
  const game = BZ.game;
  if (BZ.hubOn()) return [];   // a hub round: only Resume, Settings and Controls
  const here = game.sceneName;
  return [
    ['Playbook', () => { BZ.backScene = here; game.go('playbook'); }],
    ['Dev Mode', () => game.go('dev', { back: here })]
  ];
};

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, input: BZ.PRESET,
  menu: {
    items: BZ.pauseItems,
    controls: { confirm: 'Swing, wind up, release, pick', power: 'Batzooka and Fireball', prevPitch: 'Previous pitch', nextPitch: 'Next pitch',
      attack: false, dash: false, skill: false, jump: false, more: false, cancel: 'Back' },
    quit: BZ.hubOn() ? false : 'title'
  }
});
BZ.game = game;

// Scenes: the title and its screens, the match and the derby, the lessons, the About and the Playbook, and dev mode.
const scenes = {
  title: BZ.titleScene,
  attract: BZ.attractScene,
  exhibition: BZ.exhibitionScene,
  match: BZ.matchScene,
  results: BZ.resultsScene,
  derbySetup: BZ.derbySetupScene,
  derby: BZ.derbyScene,
  derbyResults: BZ.derbyResultsScene,
  training: BZ.trainingScene,
  lesson: BZ.lessonScene,
  about: BZ.aboutScene,
  playbook: BZ.playbookScene,
  dev: BZ.devScene,
  hubDerby: BZ.hubScene
};

// Deep links for the checks and the tools: #attract, #derby, #dev, #match, #training, #about, #touch.
const LINKS = { attract: 'attract', derby: 'derbySetup', dev: 'dev', match: 'exhibition', training: 'training', about: 'about', touch: 'title' };
const hash = (location.hash || '').replace('#', '').split('/')[0];
const startScene = BZ.hubOn() ? 'hubDerby' : (LINKS[hash] || 'title');

game.debug = {
  BZ,
  // jump to a scene for the tests and the tools: a match with the given options, the derby, or the attract mode
  warp: (what, opts = {}) => {
    if (what === 'match') return BZ.startMatch(game, Object.assign({ innings: 3, p1: 1, human: [false, true] }, opts));
    if (what === 'derby') return game.go('derbySetup');
    return game.go(what);
  },
  snapshot: () => {
    const M = BZ.M, D = BZ.D;
    return {
      scene: game.sceneName,
      phase: M ? M.phase : null,
      inning: M ? M.S.inning : null, top: M ? M.S.top : null, outs: M ? M.S.outs : null,
      count: M ? BZ.countText(M.S) : null, score: M ? M.S.score.slice() : null,
      over: M ? M.S.over : null, walkoff: M ? !!M.S.walkoff : null,
      bases: M ? M.S.bases.map(b => !!b) : null,
      batzookaMeter: BZ.meter ? BZ.meter.slice() : null,
      derby: D ? { phase: D.phase, score: D.players.map(p => p.score), finished: D.finished, hub: !!D.hub, state: BZ.hubState } : null,
      errors: game.errors.length
    };
  }
};

game.start({
  scenes, scene: startScene,
  boot: {
    title: 'BATZOOKA BASEBALL',
    steps: [
      ['Painting the field', () => { BZ.field = BZ.buildField(); }],
      ['Tuning the sound', () => BZ.define(game)]
    ]
  }
});
