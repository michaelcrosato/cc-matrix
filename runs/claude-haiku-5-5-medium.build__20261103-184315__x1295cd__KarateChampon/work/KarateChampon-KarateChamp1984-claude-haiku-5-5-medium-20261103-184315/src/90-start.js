// ---------------------------------------------------------------- the input preset (Appendix B), the data check, the game, the scenes, the start
KC.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'Pad1'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  triangle: ['KeyE', 'Pad3'], cross: ['Enter', 'Pad0']
};

// the data check (data 1 in the test plan): every id a table refers to exists
KC.validateData = () => {
  const errs = [];
  const R = KC.DATA.roster, S = KC.DATA.stages;
  for (const n of KC.DATA.ladder) {
    if (n.opponent && !R[n.opponent]) errs.push('opponent ' + n.opponent);
    if (n.stage && !S[n.stage] && !KC.DATA.bonusStages[n.stage]) errs.push('stage ' + n.stage);
    if (n.lesson && !KC.DATA.lessons[n.lesson]) errs.push('lesson ' + n.lesson);
  }
  for (const p of Object.keys(KC.DATA.matrix)) for (const s of Object.keys(KC.DATA.matrix[p])) if (!KC.DATA.techniques[KC.DATA.matrix[p][s]]) errs.push('matrix ' + p + s);
  for (const k of Object.keys(KC.DATA.lessons)) for (const d of KC.DATA.lessons[k].drills) if (!KC.DATA.techniques[d]) errs.push('drill ' + d);
  for (const id of KC.DATA.playableIds) if (!R[id]) errs.push('roster ' + id);
  return errs;
};

// the title's hub-less data check and the boot
KC.boot = () => {
  const game = KC.game;
  const errs = KC.validateData();
  if (errs.length) throw new Error('data: ' + errs.join(', '));
  KC.A.defineAll(game.audio);
  KC.View.drawStage;
  return true;
};

const KC_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal' },
  { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English' },
  { key: 'hints', label: 'Tutorial hints', value: true },
  { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side' },
  { key: 'techNames', label: 'Technique names', value: true },
  { key: 'inputDisplay', label: 'Input display', value: false },
  { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern' }
];

KC.game = null;
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', id: 'karate-champon',
  defaults: { glyphs: 'playstation' },
  input: KC.INPUT,
  autoPause: !KC.SESSION,            // a session never pauses: the world goes on (the live pause)
  menu: {
    items: () => KC.SESSION ? [] : [
      ['Move list', () => game.go('moveList', { back: 'fight', resume: true })],
      KC.fightData && ['Retry match', () => game.go('fight', KC.fightData)],
      ['Dev mode', () => { KC.devReturn = KC.currentScene || 'fight'; game.go('dev', { back: KC.devReturn, resume: true }); }]
    ],
    settings: KC_SETTINGS,
    controls: { tUp: 'Technique up (high)', tDown: 'Technique down (low)', tLeft: 'Technique away', tRight: 'Technique toward' },
    quit: KC.SESSION ? false : 'title'
  }
});
KC.game = game;
KC.callLang = () => (game.settings && game.settings.calls === 'Japanese') ? 1 : 0;
KC.lastDevice = 'keyboard';
KC.touchGate = false;
KC.S = KC.makeScenes(game);
KC.makeScenes2(game, KC.S, KC.talk);
KC.makeBonus(game, KC.S);
KC.makeDev(game, KC.S);
KC.makeOnline(game, KC.S);
KC.makeKach(game, KC.S);
KC.makeLab(game, KC.S);
// the ladder's VS card for story matches and the fight's retry data
const wrapFight = KC.S.fight;
KC.S.fight.enter = function (data) {
  KC.currentScene = 'fight';
  if (data && !data.resume) KC.fightData = data;
  const F = KC.S.fight.F = (data && data.resume && KC.fightState) || KC.startFight(data || {});
  KC.fightState = F; this.F = F;
  KC.A.music(game, F.stage.music);
};
KC.S.fight.exit = () => { };
KC.S.fight.update = (function (orig) {
  return function (d) {
    const F = KC.fightState;
    game.focus(200, 0, 30);
    if (!F || !F.bout) return;
    if (KC.talk.update(d)) return;
    if (F.stopped) return;
    if (game.paused) return;
    const dirA = F.w.x < F.r.x ? 1 : -1, dirB = F.r.x < F.w.x ? 1 : -1;
    const iA = F.cpuW ? F.aiW.intent(F.r, d) : KC.readControl(game.input, dirA, F.prevW);
    const iB = F.cpuR ? F.aiR.intent(F.w, d) : (F.p2 === 'keys' ? KC.readKeys(game, F.prevR, dirB) : F.p2 === 'pad' ? (KC.padIntent(0, dirB, F.prevR) || { posture: 'n', tech: null }) : KC.readControl(game.input, dirB, F.prevR));
    if (iA && iA.tech) F.log = (F.log || []).concat([iA.tech]).slice(-12);
    if (KC.TOGGLES.freezeCpu && F.cpuR) { }
    F.bout.step(d, { a: () => iA, b: () => iB });
    KC.stepPoses(F, d);
    F.t += d;
    if (F.popup && F.popup.t > 0) F.popup.t -= d;
    if (F.bout.matchOver !== null && F.bout.phase === 'matchEnd' && F.bout.phaseT > F.bout.phaseLen - 0.01) { F.stopped = true; KC.endFight(F); }
    if (F.mode === 'attract' && game.input.anyPressed()) game.go('title');
  };
})();
KC.S.fight.draw = function (r) {
  const F = KC.fightState; if (!F) return;
  KC.View.drawStage ? KC.StagePaint(r, F.stage, game.time) : null;
  r.actor(200, 14, 0, (g, ox, oy) => F.judge.draw(g, ox, oy, r.view));
  KC.View.drawFighters(r, [F.w, F.r], { w: F.rigs.w, r: F.rigs.r });
  KC.View.hud(r, F.bout, { popup: F.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, F.popup) : null, bottom: F.hint });
  KC.devOverlay(r, F);
  KC.talk.draw(r);
};
// the dev toggles drawn over the fight: hit boxes, frame data and the input display
KC.devOverlay = (r, F) => {
  if (!KC.TOGGLES.hitBoxes && !KC.TOGGLES.frameData && !KC.TOGGLES.inputDisplay) return;
  r.overlay(g => {
    if (KC.TOGGLES.hitBoxes) for (const f of [F.w, F.r]) {
      const p0 = r.w(f.x - KC.BODY_W / 2, 0, f.z), p1 = r.w(f.x + KC.BODY_W / 2, 0, f.z + 66);
      E.px.line(g, p0[0], p1[1], p1[0], p1[1], '#ffe070', 1); E.px.line(g, p0[0], p0[1], p1[0], p0[1], '#ffe070', 1);
      E.px.line(g, p0[0], p0[1], p0[0], p1[1], '#ffe070', 1); E.px.line(g, p1[0], p0[1], p1[0], p1[1], '#ffe070', 1);
    }
    let y = 42;
    if (KC.TOGGLES.frameData) for (const f of [F.w, F.r]) {
      const T = f.tech && KC.DATA.techniques[f.tech.id];
      const txt = T ? f.r.short + ' ' + T.name + ' ph' + f.tech.ph + ' t' + f.tech.t : f.r.short + ' idle';
      E.font.text(g, txt, 6, y, '#c8f0c8', { outline: '#0b0814', font: 'tiny' }); y += 9;
    }
    if (KC.TOGGLES.inputDisplay) E.font.text(g, 'INPUT ' + (F.log || []).map(id => KC.DATA.techniques[id].name.split(' ')[0]).join(' '), 6, y, '#a8d8ff', { outline: '#0b0814', font: 'tiny' });
  });
};
// the second human on the keyboard: arrows posture, I J K L (and the numpad) technique, or the held codes
KC.readKeys = (game, prev, foeDir) => {
  const h = game.input.held || new Set();
  const has = (c) => (h.has ? h.has(c) : !!h[c]);
  let px = 'n';
  if (has('ArrowUp') && !has('ArrowDown')) px = 'u'; else if (has('ArrowDown') && !has('ArrowUp')) px = 'd';
  else if (has('ArrowLeft') && !has('ArrowRight')) px = 'l'; else if (has('ArrowRight') && !has('ArrowLeft')) px = 'r';
  const down = (c) => has(c) && !(prev['_' + c]);
  const tk = { u: ['KeyI', 'Numpad8'], d: ['KeyK', 'Numpad2', 'Numpad5'], l: ['KeyJ', 'Numpad4'], r: ['KeyL', 'Numpad6'] };
  let edge = null;
  for (const k of ['u', 'd', 'l', 'r']) for (const c of tk[k]) { if (down(c)) edge = edge || k; }
  for (const c of Object.values(tk).flat()) prev['_' + c] = has(c);
  const pr = (s) => (s === 'u' || s === 'd') ? s : KC.relDir(s, foeDir);
  return { posture: pr(px), tech: edge ? pr(edge) : null };
};

KC.S.title.enter = KC.S.title.enter;
for (const k of Object.keys(KC.S)) if (!KC.S[k].pausable && !(k === 'fight')) KC.S[k].pausable = false;
KC.currentScene = 'title';

// the touch-only gate: a touch screen with no fine pointer, and no key or pad used yet
KC.updateTouchGate = () => {
  const mq = typeof window !== 'undefined' && window.matchMedia;
  const coarse = mq ? !window.matchMedia('(any-pointer: fine)').matches : false;
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  KC.touchGate = !!(coarse && touch && !KC.inputSeen);
  game.input.touchEnabled = false;
};
KC.updateTouchGate();

// the deep links (the tools and the tests use these), and the boot: the dojo's steps
const startName = KC.SESSION ? 'session' : (() => {
  const h = (typeof location !== 'undefined' && location.hash || '').replace('#', '').split('/')[0];
  return KC.S[h] ? h : 'title';
})();
game.start({
  scene: startName, scenes: KC.S,
  boot: {
    title: 'KARATE CHAMPON',
    steps: [
      ['Sweeping the dojo floor', () => { const e = KC.validateData(); if (e.length) throw new Error(e.join(', ')); }],
      ['Folding the gi', () => { KC.View.rigFor('taro', 'w'); }],
      ['Simmering the broth', () => { KC.A.defineAll(game.audio); }],
      ['Tuning the referee\'s whistle', () => { KC.A.speak; }],
      ['Raking the gravel', () => { KC.View.backdropFor(KC.DATA.stages.dojo); }]
    ]
  }
});

// the test and tools handle
game.debug = {
  snapshot() {
    const F = KC.fightState;
    return {
      scene: game.sceneName, version: KC.VERSION, node: (KC.save.load() || {}).node || 0,
      bout: F && F.bout ? { phase: F.bout.phase, clock: +F.bout.clock.toFixed(2), points: F.bout.points.slice(), roundWins: F.bout.roundWins.slice(), round: F.bout.round, matchOver: F.bout.matchOver } : null,
      fighters: F ? [F.w, F.r].map(f => ({ id: f.id, side: f.side, x: +f.x.toFixed(2), z: +f.z.toFixed(2), state: f.state, tech: f.tech ? f.tech.id : null })) : null,
      tune: Object.assign({}, KC.TUNE), touchGate: KC.touchGate
    };
  },
  setTune(k, v) { KC.TUNE[k] = v; },
  resetTune() { KC.resetTune(); }
};
KC.inputSeen = false;
