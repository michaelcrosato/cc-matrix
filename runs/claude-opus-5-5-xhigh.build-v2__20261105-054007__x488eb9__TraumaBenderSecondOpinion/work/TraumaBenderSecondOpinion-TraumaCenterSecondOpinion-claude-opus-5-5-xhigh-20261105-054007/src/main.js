// The game's top level (19.5): input map, settings, the shell, the scenes, and the boot.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const inSession = G.inSession = !!(window.AIHub && window.AIHub.active);
const { attack, dash, skill, jump, ...base } = E.Input.DEFAULT;
const INPUT = { ...base,
  useTool: ['Pad7', 'Pad0', 'Mouse0', 'Space'], fine: ['Pad6', 'ShiftLeft', 'ShiftRight'], gift: ['Pad3', 'KeyF', 'Mouse1'], consult: ['Pad2', 'KeyC'],
  toolPrev: ['Pad4', 'KeyQ', 'WheelUp'], toolNext: ['Pad5', 'KeyE', 'WheelDown'], wheelHold: ['Mouse2'],
  curU: ['KeyW', 'ArrowUp'], curD: ['KeyS', 'ArrowDown'], curL: ['KeyA', 'ArrowLeft'], curR: ['KeyD', 'ArrowRight'],   // separate from up/down/left/right, which the left stick also presses
  nudgeU: ['Pad12'], nudgeD: ['Pad13'], nudgeL: ['Pad14'], nudgeR: ['Pad15'],
  tool1: ['Digit1'], tool2: ['Digit2'], tool3: ['Digit3'], tool4: ['Digit4'], tool5: ['Digit5'], tool6: ['Digit6'], tool7: ['Digit7'], tool8: ['Digit8'],
  interact: ['Pad0', 'KeyE', 'Enter'], skip: ['Pad2', 'ControlLeft'], log: ['Pad3', 'KeyB'], more: ['Pad3', 'KeyM'], dropIt: ['Pad1', 'KeyX', 'Backspace'],
  halves: { left: { useTool: ['Space', 'KeyF'], fine: ['ShiftLeft'], gift: ['KeyG'], curU: ['KeyW'], curD: ['KeyS'], curL: ['KeyA'], curR: ['KeyD'], toolPrev: ['KeyQ'], toolNext: ['KeyE'] }, right: { useTool: ['Slash', 'Numpad0'], fine: ['ShiftRight'], gift: ['Period'], curU: ['ArrowUp'], curD: ['ArrowDown'], curL: ['ArrowLeft'], curR: ['ArrowRight'], toolPrev: ['Comma'], toolNext: ['Semicolon'] } },
};

const openDev = () => { if (G.Dev) G.Dev.open(); };
const restartPhase = () => { const sc = G.game.scene; if (sc && sc.S && G.Flow) G.Flow.restartPhase(sc); };
const game = G.game = new E.Game({ draw: !!window.GAME_DRAW, canvas: 'screen', id: G.GAME_TITLE, res: [426, 240], expand: true, view: 'overhead', touch: 'never', input: INPUT,
  live: inSession, autoPause: !inSession, corner: !inSession, bg: '#000000',
  menu: { items: () => { if (inSession) return []; const sc = game.scene, it = [['Dev Mode', openDev]]; if (sc && sc.S && sc.S.status === 'play' && sc === G.scenes.op) { if (sc.S.mode === 'lab') it.push(['Back to Case Files', () => { game.resume(); G.Flow.quitToFiles(); }]); else it.push(['Restart Phase', restartPhase]); } return it; },
    saves: !inSession, quit: inSession ? false : 'title',
    controls: { useTool: 'Use tool', fine: 'Steady hand', gift: 'The Steady', consult: 'Consult', toolPrev: 'Previous tool', toolNext: 'Next tool', wheelHold: 'Tool wheel', interact: 'Talk and use', skip: 'Fast-forward', log: 'Backlog', dropIt: 'Drop', curU: 'Cursor up', curD: 'Cursor down', curL: 'Cursor left', curR: 'Cursor right', nudgeU: false, nudgeD: false, nudgeL: false, nudgeR: false, more: false, tool1: false, tool2: false, tool3: false, tool4: false, tool5: false, tool6: false, tool7: false, tool8: false },
    settings: [
      { key: 'music', value: .1 },
      { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] },
      { key: 'voices', label: 'Voices', type: 'slider', value: .9, min: 0, max: 1, step: .05, group: 'Sound', help: 'The gibberish everyone talks in.', apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
      { key: 'difficulty', label: 'Difficulty', value: 'resident', options: [['intern', 'Intern'], ['resident', 'Resident'], ['attending', 'Attending']], help: 'Changeable between cases.' },
      { key: 'assist', label: 'Surgical assist', type: 'slider', value: .6, min: 0, max: 1, step: .05, help: 'How much the cursor helps on a pad. A mouse only gets slightly wider tolerances.' },
      { key: 'cursor', label: 'Cursor speed', type: 'slider', value: 1, min: .5, max: 1.6, step: .05, help: 'Stick and key speed.' },
      { key: 'swapSticks', label: 'Swap sticks', value: false, help: 'Cursor and wheel trade sticks, for left-handers.' },
      { key: 'sustain', label: 'Sustained tools', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']], help: 'Salve, Cautery, Suction, Sonar.' },
      { key: 'hints', label: 'Hints', value: true, help: 'The next tool glows when you idle or slip.' },
      { key: 'blood', label: 'Blood color', value: 'red', options: [['red', 'Surgical red'], ['teal', 'Clinical teal-grey']], apply: (g, v) => { if (G.setBloodColor) G.setBloodColor(v); } },
      { key: 'textSpeed', label: 'Text speed', value: 'normal', options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']] },
    ] } });
G.ui = new E.Shell(game, { tv: true, theme: { paper: 'rgba(6,22,26,.94)', accent: '#5ff0e0', line: 'rgba(95,240,224,.35)', ink: '#e8fbf6', muted: '#8fb8b0', danger: '#ff7a6a' } });

G.Screen = { cursor(g, show) { const c = g.screen && g.screen.canvas; if (c && c.style) c.style.cursor = show ? '' : 'none'; } };
G.Sfx.init(game); G.Babble.init(game); G.Choir.init(game); G.Music.init(game);
if (G.Attract) G.Attract.install(game);
if (G.Dev) G.Dev.install(game);

game.debug = { snapshot: () => { const sc = game.scene, S = sc && sc.S; return Object.assign({ scene: game.sceneName, title: G.GAME_TITLE, music: game.settings.music, glyphs: game.settings.glyphs }, S ? { caseId: S.caseId, ph: S.ph, status: S.status, vitals: S.vitals | 0, clock: S.clock | 0, tool: S.hands[0].tool, score: S.score | 0, objs: S.objs.length, hash: U_hash(S) } : {}, G.Flow ? { flow: G.Flow.debug() } : {}); } };
const U_hash = S => G.U.hash(Object.assign({}, S, { ev: [] }));

const boot = { title: G.TITLE_MAIN, steps: [
  ['Scrubbing in', () => { for (const id of ['vale', 'quill']) G.bust(id, {}); }],
  ['Hanging the films', () => { if (G.bakeShared) G.bakeShared(game); }],
] };
G.Flow.install(game);
game.hook('enter', () => { game.lights.enabled = false; game.cam.bounds = null; G.Sfx.stopLoops(); });
for (const k in G.scenes) { const sc = G.scenes[k], d = sc.draw, u = sc.update; if (k !== 'op') sc.update = function (dt) { if (G.Dev && G.Dev.panelOpen) return; u.call(this, dt); }; sc.draw = function (r) { d.call(this, r); r.overlay(g => { if (G.Dev && G.Dev.panelOpen) G.Dev.draw(g, r); if (G.Attract && G.Attract.active) G.HUD.ribbon(g, r.W, r.H, { t: game.real }); }); }; }
G.touchOnly = () => { if (typeof window.matchMedia !== 'function') return false; return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && game.input.padIndex === null; };
game.hook('input', () => { if (game.sceneName === 'op' || game.sceneName === 'hubround') { const show = game.paused || (G.Dev && G.Dev.panelOpen) || (game.sceneName === 'hubround' && game.scene.phase !== 'play'); if (show !== G.Screen.shown) { G.Screen.shown = show; G.Screen.cursor(game, show); } } else if (G.Screen.shown !== true) { G.Screen.shown = true; G.Screen.cursor(game, true); } });
const first = inSession ? (G.scenes.hubround ? 'hubround' : 'title') : 'title';
game.start({ scene: first, scenes: G.scenes, boot });

// a deep link for working: #op=caseId jumps straight to a case
if (typeof location !== 'undefined' && location.hash && !inSession) {
  const m = location.hash.match(/^#(\w+)(?:=(\w+))?$/); if (m && G.scenes[m[1]]) game.after(.05, () => game.go(m[1], m[1] === 'op' ? { caseId: m[2] || 'glasshouse' } : {}, { fade: 0 }), { keep: true });
}
})();
