// The game: input map, settings, standard shell, scenes, idle tracking for the attract mode.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), HUB = window.AIHub;
const inSession = G.inSession;
const { attack, dash, skill, jump, ...base } = E.Input.DEFAULT;
const INPUT = { ...base,
  useTool: ['Pad7', 'Pad0', 'Mouse0', 'Space'], fine: ['Pad6', 'ShiftLeft', 'ShiftRight'], gift: ['Pad3', 'KeyF', 'Mouse1'], consult: ['Pad2', 'KeyC'],
  toolPrev: ['Pad4', 'KeyQ', 'WheelUp'], toolNext: ['Pad5', 'KeyE', 'WheelDown'], wheelHold: ['Mouse2'],
  curU: ['KeyW', 'ArrowUp'], curD: ['KeyS', 'ArrowDown'], curL: ['KeyA', 'ArrowLeft'], curR: ['KeyD', 'ArrowRight'],
  nudgeU: ['Pad12'], nudgeD: ['Pad13'], nudgeL: ['Pad14'], nudgeR: ['Pad15'],
  tool1: ['Digit1'], tool2: ['Digit2'], tool3: ['Digit3'], tool4: ['Digit4'], tool5: ['Digit5'], tool6: ['Digit6'], tool7: ['Digit7'], tool8: ['Digit8'],
  interact: ['Pad0', 'KeyE', 'Enter'], skip: ['Pad2', 'ControlLeft'], log: ['Pad3', 'KeyB'], more: ['Pad3', 'KeyM'] };
const restartPhase = () => { const sc = G.game.scene; if (sc && sc.S && sc.view && !G.inSession) { G.dev.tagged = G.dev.tagged; const S = sc.S; if (S.chk) { Op_retry(S); sc.view.ecg = []; sc.view.objective = sc.def.phases[S.ph].obj; G.game.resume && G.game.resume(); } } };
const Op_retry = S => G.Op.retry(S);
const items = inSession ? [] : [['Dev Mode', () => G.openDev()], ['Restart Phase', restartPhase]];
const game = G.game = new E.Game({ canvas: 'screen', draw: true, id: G.GAME_TITLE, res: [426, 240], expand: true, view: 'overhead', touch: 'never', input: INPUT, live: inSession, autoPause: !inSession, corner: !inSession,
  menu: { items, saves: !inSession, quit: inSession ? false : 'title',
    controls: { useTool: 'Use tool', fine: 'Steady hand', gift: 'The Steady', consult: 'Consult', toolPrev: 'Previous tool', toolNext: 'Next tool', wheelHold: 'Tool wheel', tool1: false, tool2: false, tool3: false, tool4: false, tool5: false, tool6: false, tool7: false, tool8: false, curU: false, curD: false, curL: false, curR: false, nudgeU: false, nudgeD: false, nudgeL: false, nudgeR: false, interact: 'Talk, use', skip: 'Fast-forward', log: 'Backlog', more: 'More time (Hub)' },
    settings: [{ key: 'music', value: .1 }, { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] },
      { key: 'voices', label: 'Voices', type: 'slider', value: .9, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
      { key: 'difficulty', label: 'Difficulty', options: ['Intern', 'Resident', 'Attending'], value: 'Resident', apply: (g, v) => { G.prog.diff = v; G.saveProg && G.saveProg(); } },
      { key: 'assistSetting', label: 'Surgical assist', type: 'slider', value: .6, min: 0, max: 1, step: .05, apply: (g, v) => { G.TUNING.assist = v; G.DEFAULTS.assist = v; } },
      { key: 'cursorSpeed', label: 'Cursor speed', type: 'slider', value: 1, min: .5, max: 1.6, step: .05 },
      { key: 'swap', label: 'Swap sticks', value: false },
      { key: 'sustained', label: 'Sustained tools', options: ['Hold', 'Toggle'], value: 'Hold' },
      { key: 'hints', label: 'Hints', value: true },
      { key: 'blood', label: 'Blood color', options: ['Surgical red', 'Clinical teal'], value: 'Surgical red', apply: (g, v) => G.setBlood && G.setBlood(v) },
      { key: 'textSpeed', label: 'Text speed', options: ['Slow', 'Normal', 'Fast', 'Instant'], value: 'Normal' }] } });
G.music = name => { try { const s = G.SONGS[name]; game.audio.music(s || null, { fade: .6 }); } catch (e) {} };
G.setBlood = mode => { const M = G.MATS, i = G.matId('blood'), w = G.matId('wound'); if (!M || i < 0) return; const teal = mode === 'Clinical teal'; const bk = teal ? ['#021214', '#06343a', '#0a5a60', '#14808a'] : ['#180204', '#3c060a', '#680c10', '#8e1414'], wk = teal ? ['#010a0c', '#04262a', '#08464a', '#0e6068'] : ['#0c0104', '#2a0408', '#55090e', '#7a1216']; M[i].ramp = G.makeRamp(bk, 20); M[i].slow = G.makeRamp(bk, 20, true); M[w].ramp = G.makeRamp(wk, 20); M[w].slow = G.makeRamp(wk, 20, true); };
const ui = new E.Shell(game, { tv: true, theme: { paper: 'rgba(6,22,26,.94)', accent: '#5ff0e0', line: 'rgba(95,240,224,.35)', ink: '#e8fbf6', muted: '#8fb8b0', danger: '#ff7a6a' } });
G.shell = ui;
G.loadProg(); G.loadDev(); G.Audio.init(game);
// idle tracking: counts up when nothing happens; resets on any input or mouse move
G.idle = 0; let lastMouse = -1;
game.hook('input', dt => { const I = game.input; const m = I.mouse ? I.mouse.t : 0; const act = I.anyPressed() || I.held.size > 0 || I.clicked() || m !== lastMouse || Math.hypot(I.padMove[0], I.padMove[1]) > .25 || (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .25); lastMouse = m;
  if (act) G.idle = 0; else G.idle += dt; const n = game.scene && game.scene.__name; if (G.idle >= 10 && !inSession && ['title', 'menu', 'casefiles', 'lobby'].includes(n) && !game.paused && !game.shell_open) { G.idle = 0; game.go('attract'); } });
for (const k in G.scenes) G.scenes[k].__name = k;
// the saves: prog is the save data
game.saves.write = () => ({ data: { prog: G.prog }, place: 'Ward 3', level: 'Case ' + (G.prog.next + 1) });
game.saves.read = save => { if (save && save.data && save.data.prog) { G.prog = { ...G.prog, ...save.data.prog }; G.saveProg(); } };
game.saves.canSave = false;
game.debug = { snapshot: () => ({ scene: game.scene && game.scene.__name, case: G.run && G.run.caseId, idle: G.idle, errors: game.errors.length, vitals: game.scene && game.scene.S ? game.scene.S.vitals : null, music: game.settings.music, glyphs: game.settings.glyphs, prog: G.prog.next }) };
const start = () => game.start({ scene: inSession ? 'hubround' : 'title', scenes: G.scenes, boot: { title: G.GAME_TITLE, steps: [['Scrubbing in', () => { for (const id of ['quill', 'vale']) G.bust(id, 'neutral'); }], ['Warming the monitors', () => { G.bakeSite('abdomen', 426, 240, 11); }]] } });
if (inSession) { G.Hub.connect().then(info => { if (!info) { /* no hub after all: run as usual */ } }); }
start();
if (inSession) game.hook('enter', () => {});
})();
