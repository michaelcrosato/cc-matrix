/* ---------- start: the game, its input map, its scenes, boot steps and a handle for tests ---------- */
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  ground: ['KeyJ', 'Mouse0', 'Pad0'], loft: ['KeyK', 'Mouse2', 'Pad2'], defend: ['KeyL', 'Pad1'], special: ['KeyE', 'Pad3'],
  run: ['Space', 'Pad5', 'Pad7'], cycle: ['KeyQ', 'ShiftLeft', 'Pad4'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'],
};
const hubMode = HUBON();
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 55, .75, 1);   // the TV camera behind the bowler
game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', views: ['broadcast'], input: KEYS, id: 'cricket-kerfuffle',
  menu: {
    items: [['Dev mode', () => { game.resume(); devOpen(); }]],
    controls: { ground: 'Drive • Quickie', loft: 'Loft • Swinger', defend: 'Block • Spinner', special: 'ON FIRE • Fireball', run: 'Run • Dive', cycle: 'Change the field', confirm: 'Confirm', cancel: 'Back', start: false, pause: 'Pause' },
    quit: hubMode ? false : 'title',
  },
});
defineSfx();
const SCENES = { title: titleScene, setup: setupScene, story: storyScene, cutscene: cutScene, results: resultsScene, howto: howtoScene, scores: scoresScene, about: aboutScene, match: matchScene, hubwait: hubScene };
game.debug = {
  snapshot: () => ({ scene: game.sceneName, errors: game.errors.length, m: MS && MS.M ? MS.M.snapshot() : null, dev: DEV.open }),
  match: () => MS && MS.M, session: () => MS, tv: TV, startMatch, T, DEV, devOpen, titleState, setupMode: () => setupMode, setMode: m => { setupMode = m; }, progress, CHAPTERS, cab: () => cab, scenes: SCENES, COMM, say,
};
game.start({
  scenes: SCENES, scene: hubMode ? 'hubwait' : 'title',
  boot: { title: TITLE, version: '1.0', steps: [
    ['Mowing the outfield', () => { buildMap('green'); }],
    ['Sharpening the pencils', () => { buildRigs('kerf', 'witt'); }],
    ['Warming up the commentators', () => { for (const k in SPEAKERS) speakerRigs[k] = SPEAKERS[k].rig(); }],
  ], messages: ['Brewing the tea', 'Locating the Cup', 'Persuading the cow'] },
});
