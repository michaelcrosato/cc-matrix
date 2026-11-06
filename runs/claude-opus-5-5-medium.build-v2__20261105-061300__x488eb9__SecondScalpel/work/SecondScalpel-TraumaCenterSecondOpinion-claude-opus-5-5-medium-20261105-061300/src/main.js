// The game's top level: the engine's game, its input map, standard screens, boot, the idle watcher and attract's start.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const inSession = !!(window.AIHub && AIHub.active);
const { attack, dash, skill, jump, ...base } = E.Input.DEFAULT;
const INPUT = { ...base, useTool: ['Pad7', 'Pad0', 'Mouse0', 'Space'], fine: ['Pad6', 'ShiftLeft', 'ShiftRight'], gift: ['Pad3', 'KeyF', 'Mouse1'], consult: ['Pad2', 'KeyC'], drop: ['Pad1', 'KeyX', 'Backspace'],
  toolPrev: ['Pad4', 'KeyQ', 'WheelUp'], toolNext: ['Pad5', 'KeyE', 'WheelDown'], wheelHold: ['Mouse2'],
  curU: ['KeyW', 'ArrowUp'], curD: ['KeyS', 'ArrowDown'], curL: ['KeyA', 'ArrowLeft'], curR: ['KeyD', 'ArrowRight'], nudgeU: ['Pad12'], nudgeD: ['Pad13'], nudgeL: ['Pad14'], nudgeR: ['Pad15'],
  tool1: ['Digit1'], tool2: ['Digit2'], tool3: ['Digit3'], tool4: ['Digit4'], tool5: ['Digit5'], tool6: ['Digit6'], tool7: ['Digit7'], tool8: ['Digit8'],
  interact: ['Pad0', 'KeyE', 'Enter'], skip: ['Pad2', 'ControlLeft'], log: ['Pad3', 'KeyB'], more: ['Pad3', 'KeyM'],
  halves: { left: { curU: ['KeyW'], curD: ['KeyS'], curL: ['KeyA'], curR: ['KeyD'], useTool: ['KeyF'], fine: ['KeyG'], gift: ['KeyH'], toolPrev: ['KeyR'], toolNext: ['KeyT'], consult: [], drop: ['KeyY'], wheelHold: [], tool1: [], tool2: [], tool3: [], tool4: [], tool5: [], tool6: [], tool7: [], tool8: [], interact: ['KeyF'], skip: [], log: [], more: [], nudgeU: [], nudgeD: [], nudgeL: [], nudgeR: [] }, right: { curU: ['ArrowUp'], curD: ['ArrowDown'], curL: ['ArrowLeft'], curR: ['ArrowRight'], useTool: ['Period', 'Numpad1'], fine: ['Slash', 'Numpad2'], gift: ['Comma', 'Numpad3'], toolPrev: ['KeyL', 'Numpad4'], toolNext: ['Semicolon', 'Numpad5'], consult: [], drop: ['Quote', 'Numpad6'], wheelHold: [], tool1: [], tool2: [], tool3: [], tool4: [], tool5: [], tool6: [], tool7: [], tool8: [], interact: ['Period'], skip: [], log: [], more: [], nudgeU: [], nudgeD: [], nudgeL: [], nudgeR: [] } } };
const openDev = () => { G.game.resume(); G.Dev.toggle(true); };
const restartPhase = () => { const op = G.op; if (op && G.game.scene === G.SCENES.op) { G.game.resume(); G.Op.retry(op.S); op.ov.ecg.length = 0; op.done = false; } };
const items = () => { const g = G.game; if (inSession) return []; const L = [['Dev Mode', openDev]]; if (g && g.scene === G.SCENES.op && G.op) L.push(['Restart Phase', restartPhase]); return L; };
const opt = window.__gameOptions || {};
const game = G.game = new E.Game(Object.assign({ canvas: 'screen', id: G.GAME_TITLE, res: [426, 240], expand: true, view: 'overhead', touch: 'never', input: INPUT, live: inSession, autoPause: !inSession, corner: !inSession,
  menu: { items, saves: !inSession, quit: inSession ? false : 'title',
    controls: { useTool: 'Use tool', fine: 'Steady hand', gift: 'The Steady', consult: 'Consult', drop: 'Drop', toolPrev: 'Previous tool', toolNext: 'Next tool', wheelHold: 'Tool wheel', curU: 'Aim up', curD: 'Aim down', curL: 'Aim left', curR: 'Aim right', nudgeU: 'Nudge up', nudgeD: 'Nudge down', nudgeL: 'Nudge left', nudgeR: 'Nudge right', interact: 'Talk, use', skip: 'Fast-forward', log: 'Backlog', more: false, tool1: false, tool2: false, tool3: false, tool4: false, tool5: false, tool6: false, tool7: false, tool8: false },
    settings: [{ key: 'music', value: .1 }, { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] },
      { key: 'voices', label: 'Voices', type: 'slider', min: 0, max: 1, step: .05, value: .9, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
      { key: 'difficulty', label: 'Difficulty', options: [['intern', 'Intern'], ['resident', 'Resident'], ['attending', 'Attending']], value: 'resident', apply: (g, v) => { if (G.prog && G.applyDiff) G.applyDiff(v); } },
      { key: 'assist', label: 'Surgical assist', type: 'slider', min: 0, max: 1, step: .05, value: .6 }, { key: 'cursorSpeed', label: 'Cursor speed', type: 'slider', min: .5, max: 1.5, step: .05, value: 1 }, { key: 'swapSticks', label: 'Swap sticks', value: false }, { key: 'sustain', label: 'Sustained tools', options: ['Hold', 'Toggle'], value: 'Hold' }, { key: 'hints', label: 'Hints', value: true }, { key: 'blood', label: 'Blood color', options: ['Surgical', 'Clinical'], value: 'Surgical', apply: (g, v) => { if (G.setBloodColor) G.setBloodColor(v === 'Clinical'); } }, { key: 'textSpeed', label: 'Text speed', type: 'slider', min: .5, max: 2, step: .1, value: 1, apply: (g, v) => { if (G.story) { G.story.talk.speed = 46 * v; G.story._speed = 46 * v; } } }] } }, opt));
if (typeof document !== 'undefined') G.ui = new E.Shell(game, { tv: true, theme: { paper: 'rgba(6,22,26,.94)', accent: '#5ff0e0', line: 'rgba(95,240,224,.35)', ink: '#e8fbf6', muted: '#8fb8b0', danger: '#ff7a6a' } });
G.applyDiff = v => { G.prog.diff = v; G.saveProg(); };
game.saves.write = () => ({ data: G.prog, place: G.game.scene === G.SCENES.ward ? 'Between cases' : 'Night shift', level: 'Case ' + ((G.prog.flow / 4 | 0) + 1) });
game.saves.read = (save) => { G.prog = Object.assign({}, G.prog, save.data); G.saveProg(); G.flowGo(G.prog.flow); };
G.sfx = new G.Sfx(game); G.babble = new G.Babble(game); G.choir = new G.Choir(game); G.music = new G.Music(game);
for (const k in E.SHAPES) void k;
if (window.ASSETS && window.ASSETS.ward) E.addAssets(window.ASSETS.ward);
// the dev panel runs over every pausable scene
for (const name in G.SCENES) { const sc = G.SCENES[name], up = sc.update, dr = sc.draw; if (!sc.pausable) continue; sc.update = function (dt) { up.call(this, dt); if (!inSession) G.Dev.update(dt); }; sc.draw = function (r) { dr.call(this, r); if (!inSession) G.Dev.draw(r); }; }
const grainTile = () => { if (G._grain) return G._grain; const c = E.mkCanvas(96, 96), g = c.getContext('2d'); let a = 77; for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { a = (a * 1664525 + 1013904223) >>> 0; const v = a >>> 24, r = (a >>> 16) & 63, b = (a >>> 8) & 63, q = (a >>> 2) & 31; E.px.rect(g, x, y, 1, 1, 'rgb(' + Math.min(255, v * .7 + r | 0) + ',' + Math.min(255, v * .75 + q | 0) + ',' + Math.min(255, v * .7 + b | 0) + ')'); } E.px.reset(g); return (G._grain = c); };
G.drawGrain = r => r.overlay(g => { const c = grainTile(), a = g.globalAlpha; E.px.reset(g); g.globalAlpha = .12; for (let y = 0; y < r.H; y += 96) for (let x = 0; x < r.W; x += 96) g.drawImage(c, x, y); g.globalAlpha = a; E.px.reset(g); });
for (const name of ['title', 'menu', 'difficulty', 'chart', 'results', 'lost', 'casefiles', 'about', 'credits', 'ward', 'lobby', 'story']) { const sc = G.SCENES[name], dr = sc.draw; sc.draw = function (r) { dr.call(this, r); G.drawGrain(r); }; }
// idle: any pressed action, held code, mouse move, click, stick
const IDLE_SCENES = { title: 1, menu: 1, casefiles: 1, lobby: 1 };
G.idle = 0; let lastMouse = -1;
game.hook('input', dt => { const I = game.input, a = I.padAim, m = I.padMove; const active = I.anyPressed() || I.held.size > 0 || I.clicked() || I.mouse.t !== lastMouse || (a && Math.hypot(a[0], a[1]) > .25) || (m && Math.hypot(m[0], m[1]) > .25); lastMouse = I.mouse.t; if (active) { G.idle = 0; G.lastPress = true; } else G.idle += dt; if (!inSession && !game.paused && !(game.shell && game.shell.screen) && G.idle >= 10 && game.scene && IDLE_SCENES[G.sceneName(game.scene)]) { G.idle = 0; game.go('attract'); } });
G.sceneName = sc => { for (const k in G.SCENES) if (G.SCENES[k] === sc) return k; return null; };
G.drawTitleArt = (r, t) => { const T = G.SCENES.title; T.t = t; const d = T.draw; d.call(T, r); };
G.story = G.makeStory(game); G.storyView = new G.StoryView(game); G.wardStory = G.makeWardStory(game);
game.debug = { snapshot() { const S = G.op && G.op.S; return { scene: G.sceneName(game.scene), flow: G.prog.flow, op: S ? { caseId: S.caseId, phase: S.phaseI, v: S.v, clock: S.clock, done: S.done, objs: S.objs.length } : null, attract: !!G.attractOn, music: game.settings.music, hub: G.Hub ? G.Hub.phase : null }; } };
G.deepLink = () => { const h = typeof location !== 'undefined' ? location.hash.slice(1) : ''; if (!h || inSession) return; const [a, c, p] = h.split('-'); if (a === 'op') game.go('op', { caseId: c, mode: 'files', phase: +p || 0, difficulty: 'resident' }); else if (a === 'story') game.go('story', { id: c, then: () => game.go('menu') }); else if (a === 'ward') game.go('ward', { map: c || 'ward3', after: +p || 3 }); else if (G.SCENES[a]) game.go(a, a === 'chart' ? { caseId: c || 'c2', mode: 'files' } : a === 'about' ? { back: 'menu' } : {}); };
game.start({ scene: inSession ? 'hubround' : 'title', scenes: G.SCENES, boot: { title: G.GAME_TITLE, steps: [['Scrubbing in', () => { G.loadProg(); G.Dev.load(); }], ['Painting the theatre', () => { G.bust('quill', 'neutral'); G.deepLink(); }], ...(inSession ? [['Calling the round', () => { G.Hub.connect(); }]] : [])] } });
})();
