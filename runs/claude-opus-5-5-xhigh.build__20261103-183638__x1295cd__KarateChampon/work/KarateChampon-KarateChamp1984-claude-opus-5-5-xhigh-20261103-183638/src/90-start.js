/* =====================================================================================================================
 * START: the game, its settings and pause menu, the scenes, the boot steps and the deep links (#title, #road/<node>,
 * #fight/<stage>/<opponent>, #versus, #kachinuki/<n>, #bonus/<id>, #practice/<lesson>, #lab/<techId>, #attract, #about,
 * #ending, #spar, #records, #credits). In an AI Hub session it boots straight into the session.
 * ===================================================================================================================== */
if (typeof window !== 'undefined' && window.ASSETS && window.ASSETS.kc) E.addAssets(window.ASSETS.kc);   // the cut set of store props (assets/kc-set.js)
E.VIEWS.kcside = new E.View('kcside', 'Arcade side', 0, 0, 1.2, 1);
E.VIEWS.kctatami = new E.View('kctatami', 'Tatami 2.5D', 0, 24, 1.2, 1);
const canRetry = () => !SESSION && KC.scene && KC.scene.bout && (KC.scene.mode === 'story' || KC.scene.mode === 'versus') && KC.scene.d && KC.scene.d.retry;
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'kcside', bg: '#07060d', id: 'karate-champon', defaults: { glyphs: 'playstation' }, autoPause: !SESSION,
  menu: {
    items: () => [['Move list', () => { game.resume(); KC.MoveList.open(); }], canRetry() && ['Retry match', () => { game.resume(); KC.scene.d.retry(); }], !SESSION && ['Dev mode', () => { game.resume(); KC.Dev.open(); }]],
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal' },
      { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English' },
      { key: 'hints', label: 'Tutorial hints', value: true },
      { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side', apply: (g, v) => { if (KC.scene && KC.scene.fighters) g.setView(v === 'Tatami 2.5D' ? 'kctatami' : 'kcside'); } },
      { key: 'techNames', label: 'Technique names', value: true },
      { key: 'inputDisplay', label: 'Input display', options: ['off', 'on'], value: 'off' },
      { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern', help: 'Classic: a white and red NES-style palette (unlocked by finishing the Champon Road)' },
      { key: 'voices', label: 'Voices', group: 'Sound', type: 'slider', value: .8, apply: (g, v) => { KC.Voice.vol = v; if (KC.Voice.bus) KC.Voice.bus.gain.value = v; } }
    ],
    controls: { tUp: 'Technique up (high)', tDown: 'Technique down (low)', tLeft: 'Technique left', tRight: 'Technique right', prev: 'Previous tab', next: 'Next tab', alt: 'More time / reset', skip: 'Skip', dev: false, click: false },
    quit: SESSION ? false : 'title'
  }
});
KC.game = game; KC.settings = game.settings; KC.hookSaves(game);
KC.settingsCalls = () => (game.settings.calls === 'Japanese' ? 'jp' : 'en');
if (SESSION) game.live = true;   // EC4: the world never pauses in a session
game.input.use(KC_KEYS);
// the palette option needs the story finished
const _set = game.settings.set.bind(game.settings);
game.settings.set = (k, v) => { if (k === 'palette' && v === 'Classic' && !KC.Save.unlocked('classic') && !(KC.DEV && KC.DEV.unlockAll)) { game.note('FINISH THE CHAMPON ROAD TO UNLOCK'); return _set(k, 'Modern'); } return _set(k, v); };
// any input lifts the touch-only gate and resets the idle timer
KC.idle = 0;
game.debugIdle = () => KC.idle;

const scenes = {
  title: KC.TitleScene, attract: KC.AttractScene, fight: KC.FightScene, road: KC.RoadScene, cutscene: KC.CutsceneScene, vscard: KC.VsCardScene,
  promotion: KC.PromotionScene, continue: KC.ContinueScene, gameover: KC.GameOverScene, initials: KC.InitialsScene, credits: KC.CreditsScene,
  practice: KC.PracticeScene, bonus: KC.BonusScene, versus: KC.VersusScene, results: KC.ResultsScene, dojo: KC.DojoScene, bonusMenu: KC.BonusMenuScene,
  records: KC.RecordsScene, about: KC.AboutScene, movelist: KC.MoveListScene, lab: KC.LabScene, session: KC.SessionScene
};
for (const k in scenes) if (!scenes[k]) throw new Error('scene ' + k + ' is missing');
// every scene: a panel over it (the move list, the dev panel) holds it; the dev hotkeys; the frame step; then the scene
for (const k in scenes) {
  const sc = scenes[k], up = sc.update, dr = sc.draw;
  sc.update = function (dt) {
    const I = game.input, pad = I.padPrev || [];
    if (KC.DEV.on && !SESSION && (I.pressed('dev') || (pad[10] && pad[11] && !this._l3r3))) KC.Dev.toggle();
    this._l3r3 = !!(pad[10] && pad[11]);
    if (KC.Overlay.step(dt)) return;
    if (KC.DEV.frozen && !SESSION && !(KC.anyPressed('next'))) return;
    up.call(this, dt);
  };
  sc.draw = function (r) { dr.call(this, r); KC.Overlay.draw(r); };
}
const boot = { title: 'KARATE CHAMPON', steps: [
  ['Sweeping the dojo floor', () => { const bad = KC.validateData(); if (bad.length) throw new Error('data: ' + bad.join('; ')); }],
  ['Folding the gi', () => { KC.Save.load(); KC.Dev.load(); }],
  ['Simmering the broth', () => { KC.defineSfx(game); }],
  ["Tuning the referee's whistle", () => { KC.Voice.vol = game.settings.voices; }],
  ['Raking the gravel', () => { for (const s of KC.DATA.stages) if (!KC.PAINT[s.id]) throw new Error('stage ' + s.id); }]
] };
// deep links
const [link, a1, a2] = (typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '').split('/');
let first = 'title', data;
if (SESSION) first = 'session';
else if (link === 'fight') { first = 'fight'; data = KC.Versus.quickData(a1 || 'dojo', a2 || 'kamaboko'); }
else if (link === 'road') { first = 'road'; KC.Story.newGame(); KC.Story.node = Math.max(0, Math.min(KC.DATA.ladder.length - 1, KC.DATA.ladder.findIndex(n => n.id === a1))); data = {}; }
else if (link === 'versus') first = 'versus';
else if (link === 'kachinuki') { first = 'versus'; data = { kachinuki: +a1 || 4 }; }
else if (link === 'bonus') { first = 'bonus'; data = { id: a1 || 'boards' }; }
else if (link === 'practice') { first = 'practice'; data = { lesson: a1 || 'lessonI' }; }
else if (link === 'lab') { first = 'lab'; data = { tech: a1 || 'frontKick' }; }
else if (link === 'spar') { first = 'fight'; data = KC.Versus.sparData(); }
else if (link === 'ending') { first = 'cutscene'; KC.Story.newGame(); data = KC.Story.endingData(); }
else if (['attract', 'about', 'records', 'credits', 'dojo', 'bonusMenu', 'movelist'].includes(link)) first = link;
game.start({ scenes, scene: first, data, boot });
game.debug = KC.debugHandle(game);
if (typeof window !== 'undefined') window.__game = { game, scenes, KC };
