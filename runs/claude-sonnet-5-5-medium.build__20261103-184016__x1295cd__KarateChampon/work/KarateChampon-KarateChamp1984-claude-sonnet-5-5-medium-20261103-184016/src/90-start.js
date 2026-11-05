/* ---------- start: the game, the pause menu, boot steps, deep links ---------- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', id: 'karate-champon', autoPause: !SESSION, input: KC_KEYS,
  menu: {
    items: () => [!SESSION && KC.canMoveList() && ['Move list', () => KC.openMoveList()], !SESSION && KC.canRetry() && ['Retry match', () => KC.retry()], !SESSION && ['Dev mode', () => KC.openDev()]],
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal', group: 'Game' },
      { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English', group: 'Game' },
      { key: 'hints', label: 'Tutorial hints', value: true, group: 'Game' },
      { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side', group: 'Game' },
      { key: 'techNames', label: 'Technique names', value: true, group: 'Game' },
      { key: 'inputDisplay', label: 'Input display', value: false, group: 'Game' },
      { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern', group: 'Game' },
      { key: 'voices', label: 'Voices volume', type: 'slider', value: .8, min: 0, max: 1, step: .05, group: 'Sound' }
    ],
    controls: { tUp: 'Technique UP (high)', tDown: 'Technique DOWN (low)', tLeft: 'Technique LEFT', tRight: 'Technique RIGHT' },
    quit: SESSION ? false : 'title'
  }
});
KC.game = game; game_ = game;
KC.cab = new E.Arcade(game, { id: 'karate-champon', lives: 1, hud: false });
KC.retry = () => { const c = KC.current; if (c && c.d && c.d.mode === 'story' && c.bout) { KC.Story.s.score = KC.Story.s.score; game.go('fight', c.d); } };
KC.canRetry = () => !!(KC.current && KC.current.d && KC.current.d.mode === 'story' && KC.current.bout && !KC.current.done) && game.scene && game.scene.name === 'fight';
KC.canMoveList = () => game.scene && ['fight', 'practice', 'bonus', 'freeSpar'].includes(game.scene.name);
KC.openDev = () => { KC.dev.open = true; KC.dev.from = game.scene && game.scene.name; game.resume && game.resume(); };
KC.sessionStart = null;
if (typeof addEventListener === 'function') { addEventListener('keydown', () => { KC._gateLifted = true; }); addEventListener('gamepadconnected', () => { KC._gateLifted = true; }); }
const boot = [
  ['Sweeping the dojo floor', () => { KC.defineAudio(game.audio); }],
  ['Folding the gi', () => { }],
  ['Simmering the broth', () => { }],
  ['Tuning the referee\'s whistle', () => { }],
  ['Raking the gravel', () => { KC.save.load(); if (!SESSION) { try { KC.dev.load(); } catch (e) { /* no stored tuning */ } if (/[?&]dev=1/.test(location.search)) KC.dev.enabledOnce = true; } const errs = KC.validateData(); if (errs.length) throw new Error('data: ' + errs.join('; ')); }]
];
const scenes = {};
for (const k in KC.scenes) scenes[k] = Object.assign({ name: k }, KC.scenes[k]);
KC.registered = scenes;
KC.touchOnlyInit = () => {};
let first = SESSION ? 'session' : 'title'; const hash = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/'); let firstData;
if (!SESSION && hash[0] && scenes[hash[0]]) {
  first = hash[0]; KC.Story.s = KC.Story.fresh();
  if (first === 'fight') firstData = { stage: hash[1] || 'dojo', ids: ['taro', hash[2] || 'kamaboko'], players: ['human', 'cpu'], mode: 'versus', seed: 4, belts: ['white', 'black1'] };
  else if (first === 'road') { KC.Story.s.node = +hash[1] || 0; KC.Story.s.belt = Math.min(9, KC.LADDER.slice(0, KC.Story.s.node).filter(n => n.promote).length); }
  else if (first === 'vscard') firstData = { node: KC.LADDER[+hash[1] || 2] };
  else if (first === 'promotion') firstData = { node: KC.LADDER[+hash[1] || 2], belt: 2 };
  else if (first === 'practice') firstData = { lesson: hash[1] || 'I' };
  else if (first === 'bonus') firstData = { kind: hash[1] || 'boards', auto: hash[2] === 'auto' };
  else if (first === 'cutscene') firstData = { id: hash[1] || 'prologue', stage: 'dojo', after: () => game.go('title') };
  else if (first === 'lab') firstData = { id: hash[1] };
  else if (first === 'results') { first = 'title'; }
  else if (first === 'continue') firstData = { node: KC.LADDER[2] };
  else if (first === 'gameover') firstData = { score: 1234 };
  else if (first === 'initials') firstData = { score: 1234, mode: 'story', done: () => game.go('title') };
  else if (first === 'credits') firstData = { story: false };
  else if (first === 'kachiCard') first = 'title';
}
game.start({ scenes, scene: first, data: firstData, boot: { title: 'KARATE CHAMPON', steps: boot } });
KC.test = { Bout, Karateka, KarateAI, Stage, Reader, Menu, Boards, Pots, BullStage, Net, Kachinuki };
