(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const ABOUT = {"sourceInformation":{"date":"2026-11-04 07:33:22","source":"European football (an over-the-top arcade take on it: terraces, chants, flares, tifos, tactics, dives, VAR, tabloids, commentary clichés, cup magic)","plan":"PLAN.md (Europhoria Football, written by claude-opus-5-5 at max effort); where it and TASK.md disagree, TASK.md won (file and folder names use claude-sonnet-5-5-medium-20261104-073322)","genre":"Arcade sports: 5-a-side football with super strikes, slide tackles that send people flying, dives and VAR, a story-driven five-round Cup Run, 1 to 4 local players and online versus through AI Hub","perspective":"TV broadcast camera: side-on, raised 40 degrees (a custom engine View) scrolling with play; Classic (55) and Aerial (78) are options in Settings","tech":"my-3D2dge v0.85.2 (handoff package, full engine, with three small marked changes listed in engine/CHANGES-ENGINE.md); plain JavaScript in one IIFE, built by tools/build.mjs into one HTML file; AI Hub session.js 1.4.0 pasted unmodified; Playwright 1.63.0 and headless Chromium for checks; no other libraries, no network except the hub client","artDirection":"The engine's native HD pixel-art look at PS1 resolution: shaded volumetric Humanoid rigs in club kits (hoops, stripes, halves, sashes, shirt numbers), textured per-stadium pitches with weather and floodlights, code-drawn crests, stands full of fans, tabloid front pages, pixel-art PlayStation, Xbox, keyboard and mouse glyphs","animation":"The engine's Humanoid rig and E.MOVES (kick, sweep, bash, poses, flips) driven by each footballer's state, plus procedural slides, knockdowns, keeper dives and bicycle kicks (with a new whole-body tilt added to the engine rig), volleys, bicycle kicks, skill moves and goal celebrations; no motion-capture clips","audio":"No audio files. Sound effects, twelve original songs, a noise-bed crowd with team chants, and Animalese-style babble voices for Barry, Trev, Mags and the squad are all synthesised in code with the engine's synth and WebAudio","online":"AI Hub Session Protocol v1, shared-world, 2 to 4 players: the host's copy runs the match, the others send their intent and draw 15 Hz snapshots; passes the AI Hub harness at 2 and 4 players with latency and loss, host-leave and server scenarios","testing":"Headless Node tests of the simulation, scenes and a scripted whole-cup playthrough (game.advance, scripted intents) behind one command, node tools/test.mjs, which prints only failures and a count; the AI Hub harness through Playwright; screenshots only for what a script cannot check. No subagents or workflows used","research":"none beyond reading the supplied plan, the engine's API card, the sports kit and the AI Hub protocol README","environment":"Claude Code CLI (headless); Linux; browser unknown (checked in headless Chromium through Playwright)","model":"Anthropic, claude-sonnet-5-5, reasoning effort medium","usage":"unknown"},"testingFeedback":["About ten real issues: two set-piece soft-locks (a goalkeeper taking a goal kick never let go; a free-kick taker who was knocked over just before the whistle never shot because the AI's charge timer ran out while he lay down), a shootout that waited forever on an idle human taker, the match scene overwriting its own `view` property with the MatchView (an engine 'unknown view' warning on the second visit), a nested overlay in the results screen, and several wrong-looking visuals found by screenshots (over-zoomed camera, camouflage puddles, white net walls, overlapping notices).","Three would have been game-breaking: the goal-kick soft-lock, the knocked-down free-kick taker soft-lock and the idle shootout taker, because a match could never finish.","The AI-versus-AI soak: three whole matches simulated to full time at 120 steps a second in about three seconds each, which must end with a winner. It found both soft-locks at once, and the scripted whole-cup playthrough (a bot driving the human's footballer through every screen) then proved the flow from the prologue to the ending.","The half-keyboard mapping check and the 'content references' check: they passed first time and never failed again. The screenshots were not cheap either, but they were the only way to see that the camera, puddles and nets looked wrong."],"engineFeedback":["The headless fixed-step game (new E.Game in Node, game.advance, game.input.tap) and the Humanoid rigs: a whole 5-a-side match, a cup and a hub round could be tested without a browser, and the characters already look like footballers once they have a kit. The standard pause, settings, controls, boot and full-screen features saved a great deal of work, and TileMap plus r.shape-style props gave a stadium quickly.","A few times. game.go() cross-fades, so a scene change is not in place after a short game.advance (my tests failed until I advanced past the fade). The scene object is also the game's own property bag: storing a MatchView in `scene.view` silently replaced the scene's view id. And E.Backdrop is invisible under a ground-view floor, so the skyline had to be queued as world geometry.","The football itself: ball physics with curl, posts, bar and net, possession, tackles, fouls, advantage, cards, VAR, set pieces, shootouts, the Save Duel and the team AI, and then the cup flow (tabloids, talks, the map, team talks) and the dev panel. The engine gives rigs, maps and menus, but no sports rules.","Lateral whole-body motion: the rig could only lie along its facing, roll forward or hop, so I added a tilt state to the engine myself. Working out which engine pieces are private (audio buses and the noise buffer) for the crowd engine was the other friction.","Three changes, all marked `// EF:` and recorded in engine/CHANGES-ENGINE.md: E.Dialog's `voice` may be a function (babble per speaker); E.Humanoid takes a `kit` option (hoops, stripes, halves, sash, shirt number); and E.Humanoid.update takes `tilt: { axis, angle, lift }`, a whole-body tilt about the hips so keeper dives, diving headers and bicycle kicks lean for real.","A `game.go(scene, data, { fade: 0 })` default for headless games so tests need not know about the fade, and a documented way to reach the audio context for custom crowd sound."],"promptFeedback":["The plan was an unusually complete map: folder layout, module list, action table with keyboard halves, event names, tuning table and data shapes, so a medium-effort build never stalled on 'what should this be called'. TASK.md's insistence on a controller-first 10-foot UI, an attract mode, dev sliders and hub support gave the demo a clear definition of finished.","The plan names a dev folder and an HTML file after claude-opus-5-5-max and a different date, while TASK.md asks for sonnet-5-5-medium and today's stamp; it also says 'follow the plan' and 'TASK.md wins' without saying which parts of a 2,000-line plan are must-haves. A 45-60 minute demo with five clubs, nine drills, replays from turned angles, tifos and an album is also more than one medium-effort pass can deliver at full depth.","Scope: making every system real at once (rules, referee, VAR, Save Duel, shootouts, replay, co-op, online) and keeping all of them from soft-locking each other. Second hardest was making the crowd, commentary and menus feel like football on TV with nothing but code-drawn pixels and synthesised sound.","Mark the plan's features as must, should and could, and state once which names the build should use. Add a short list of 'definition of done' checks per system (the plan has this at the end; it would help earlier) and a note about the headless scene-change fade."],"aiHub":{"name":"Europhoria Football","tagline":"Fish out of water. Fans out of control.","description":"Over-the-top arcade football: a broke seaside club gets into Europe's biggest cup by a typo and rides its crowd's euphoria to the final. Slide tackles that launch people, super strikes, dives, VAR and two commentators who cannot stop punning.","type":"Game","genre":"Sports","source":"European football","series":"","players":"1–4","controls":"Stick/WASD move · ✕/J pass · □/K shoot (hold) · ○/L lob · R2/Shift sprint · R1/E skill · L1+R1/Space Europhoria","tags":["arcade","comedy","versus","co-op","story","pixel art"]}};
//# sourceURL=ef/00-core.js
/* ============ 00-core: namespace, registries, bus, tuning, settings, input preset, the Game ============ */
const EF = {};
const TITLE = 'Europhoria Football';
EF.session = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
EF.query = (() => { const o = {}; try { new URLSearchParams(location.search).forEach((v, k) => { o[k] = v; }); } catch (e) { /* node */ } return o; })();

/* ---- registries: the designers' language ---- */
const REG = {};
EF.def = (kind, id, spec) => { (REG[kind] = REG[kind] || new Map()).set(id, Object.assign({ id }, spec)); return spec; };
EF.get = (kind, id) => REG[kind] && REG[kind].get(id);
EF.all = kind => REG[kind] ? [...REG[kind].values()] : [];

/* ---- the event bus ---- */
const BUS = {};
EF.bus = {
  on(type, fn) { (BUS[type] = BUS[type] || []).push(fn); return () => EF.bus.off(type, fn); },
  off(type, fn) { const l = BUS[type]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(type, e = {}) { e.type = type; for (const fn of (BUS[type] || [])) { try { fn(e); } catch (err) { if (EF.game) EF.game.fail('event ' + type, err); else throw err; } } for (const fn of (BUS['*'] || [])) { try { fn(e); } catch (err) { if (EF.game) EF.game.fail('event *', err); } } }
};

/* ---- random streams: the sim never uses Math.random ---- */
EF.fxRng = E.rng(90210);
EF.fx = (a = 1, b) => b === undefined ? EF.fxRng() * a : a + EF.fxRng() * (b - a);

/* ---- tuning: every number the dev sliders move (Appendix A of the plan) ---- */
const TUNE = [
  // key, label, default, min, max, step, group
  ['runSpeed', 'Run speed', 86, 50, 140, 1, 'Players'],
  ['sprintMul', 'Sprint multiplier', 1.38, 1, 2, .01, 'Players'],
  ['accel', 'Acceleration', 620, 200, 1500, 10, 'Players'],
  ['staminaDrain', 'Stamina drain /s', .24, 0, 1, .01, 'Players'],
  ['staminaRegen', 'Stamina regen /s', .13, 0, 1, .01, 'Players'],
  ['passSpeed', 'Pass speed', 250, 120, 450, 5, 'Ball'],
  ['shotMin', 'Shot speed (min)', 230, 120, 400, 5, 'Ball'],
  ['shotMax', 'Shot speed (max)', 430, 250, 700, 5, 'Ball'],
  ['chargeTime', 'Shot charge time', .75, .2, 2, .05, 'Ball'],
  ['ballDrag', 'Ball roll drag', .9, .1, 3, .05, 'Ball'],
  ['bounce', 'Ball bounciness', .58, .1, .95, .01, 'Ball'],
  ['curl', 'Curl (aftertouch)', 3.2, 0, 8, .1, 'Ball'],
  ['tackleStrength', 'Tackle strength', 1, .2, 2.5, .05, 'Defending'],
  ['slideSpeed', 'Slide speed', 205, 100, 350, 5, 'Defending'],
  ['foulChance', 'Foul chance (referee)', 1, 0, 3, .05, 'Defending'],
  ['knockAir', 'Knock-down launch', 1, 0, 3, .05, 'Defending'],
  ['keeperSkill', 'Keeper skill', 1, .2, 1.8, .05, 'Keepers'],
  ['keeperReach', 'Keeper reach', 1, .5, 2, .05, 'Keepers'],
  ['euphGain', 'Euphoria gain', 1, 0, 4, .05, 'Euphoria'],
  ['euphDecay', 'Euphoria decay /s', .012, 0, .1, .002, 'Euphoria'],
  ['europhoriaSecs', 'Europhoria length (s)', 12, 4, 30, 1, 'Euphoria'],
  ['superPower', 'Super Strike power', 1, .4, 2, .05, 'Euphoria'],
  ['duelWindow', 'Save Duel window', 1, .4, 2, .05, 'Euphoria'],
  ['aiSkill', 'CPU skill', 1, .4, 1.6, .02, 'Opponents'],
  ['aiPress', 'CPU pressing', 1, .2, 1.8, .02, 'Opponents'],
  ['aiAggro', 'CPU aggression', 1, 0, 2, .05, 'Opponents'],
  ['halfSecs', 'Half length (s)', 120, 30, 300, 5, 'Match'],
  ['varChance', 'VAR overturn chance', .35, 0, 1, .01, 'Match'],
  ['gameSpeed', 'Game speed', 1, .3, 1.6, .05, 'Match'],
  ['crowdVol', 'Crowd loudness', 1, 0, 2, .05, 'Presentation']
];
EF.TUNE = TUNE;
EF.T = {}; EF.TDEF = {};
for (const t of TUNE) { EF.T[t[0]] = t[2]; EF.TDEF[t[0]] = t[2]; }
EF.tune = k => EF.T[k];
EF.resetTune = () => { Object.assign(EF.T, EF.TDEF); EF.saveTune(); };
EF.saveTune = () => { try { E.store.set('ef:tune', JSON.parse(JSON.stringify(EF.T))); } catch (e) { /* storage blocked */ } };
EF.loadTune = () => { const s = E.store.get('ef:tune', null); if (s && typeof s === 'object') for (const k in EF.TDEF) if (typeof s[k] === 'number') EF.T[k] = s[k]; };

/* ---- the Intent: what any controller asks of one footballer for one step ---- */
EF.B = (down = false, pressed = false, released = false, held = 0) => ({ down, pressed, released, held });
EF.ACTIONS = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive'];
EF.Intent = () => ({ move: [0, 0], aim: null, aimPoint: null, sprint: false, pass: EF.B(), shoot: EF.B(), lob: EF.B(), through: EF.B(), skill: EF.B(), sw: EF.B(), dive: EF.B(), euphoria: false, target: null });

/* ---- input preset (fresh object, order matters for the half keyboards) ---- */
EF.KEYS = {};
for (const k of ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel']) EF.KEYS[k] = E.Input.DEFAULT[k].slice();
Object.assign(EF.KEYS, {
  pass: ['KeyJ', 'Mouse0', 'Pad0'], shoot: ['KeyK', 'Mouse2', 'Pad2'], lob: ['KeyL', 'Mouse1', 'Pad1'], through: ['KeyI', 'Pad3'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad7'], skill: ['KeyE', 'Pad5'], switch: ['KeyQ', 'Pad4'], dive: ['KeyC', 'Pad6'],
  euphoria: ['Space']
});
EF.KEYS.confirm = ['Enter', 'Space', 'KeyJ', 'Pad0']; EF.KEYS.cancel = ['Escape', 'Backspace', 'Pad1'];
EF.KEYS.pause = ['Escape', 'KeyP', 'Pad9'];

/* ---- settings ---- */
EF.SETTINGS = [
  { key: 'glyphs', group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { g.input.glyphs = v; for (const p of g.players) p.glyphs = v; } },
  { key: 'prompts', group: 'Game', label: 'Button prompts', type: 'select', value: 'learning', options: [['always', 'Always'], ['learning', 'While learning'], ['off', 'Off']] },
  { key: 'difficulty', group: 'Game', label: 'Difficulty', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']] },
  { key: 'halfLen', group: 'Game', label: 'Half length', type: 'select', value: '120', options: [['60', '1:00'], ['120', '2:00'], ['180', '3:00'], ['240', '4:00']], apply: (g, v) => { if (!EF.session) EF.T.halfSecs = +v; } },
  { key: 'camera', group: 'Game', label: 'Camera', type: 'select', value: 'broadcast', options: [['broadcast', 'Broadcast (40°)'], ['threequarter', 'Classic (55°)'], ['aerial', 'Aerial (80°)']] },
  { key: 'commentary', group: 'Game', label: 'Commentary', type: 'toggle', value: true },
  { key: 'subtitles', group: 'Game', label: 'Commentary text', type: 'toggle', value: true },
  { key: 'crowdSound', group: 'Sound', label: 'Crowd', type: 'slider', value: 1, min: 0, max: 1, step: .05 },
  { key: 'voices', group: 'Sound', label: 'Voices', type: 'slider', value: 1, min: 0, max: 1, step: .05 }
];

/* ---- the broadcast camera view and the Game itself ---- */
E.VIEWS.broadcast = E.VIEWS.broadcast || new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
E.VIEWS.aerial = E.VIEWS.aerial || new E.View('aerial', 'Aerial', 0, 78, 1, 1);
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', bg: '#06070c', id: 'europhoria-football', input: EF.KEYS,
  corner: !EF.session,
  menu: {
    settings: EF.SETTINGS,
    controls: { pass: 'Pass / Tackle', shoot: 'Shoot / Slide', lob: 'Lob / Barge', through: 'Through ball / Switch', sprint: 'Sprint', skill: 'Skill move', switch: 'Switch / One-two', dive: 'Theatrics (dive)', euphoria: 'Europhoria' },
    items: EF.session ? [] : [['Dev mode', () => EF.Dev && EF.Dev.open()], ['Restart match', () => EF.restartMatch && EF.restartMatch()]],
    quit: EF.session ? false : 'title', saves: false } });
EF.game = game;
const A = game.audio, L = game.lights, PT = game.particles;
let shell = null;
try { if (!game.headless && E.Shell) shell = new E.Shell(game, { theme: { ink: '#fff6e0', paper: '#0d1430', accent: '#ffc83a', muted: '#9aa6c8', danger: '#ff5a4a', line: '#2a3a6a' } }); } catch (e) { /* the engine's own standard screens remain */ }
EF.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
EF.angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
EF.pick = (arr, rng) => arr[Math.floor((rng || EF.fxRng)() * arr.length) % arr.length];
EF.hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
EF.scenes = {};

//# sourceURL=ef/01-input.js
/* ============ 01-input: human controllers, mouse aim, the europhoria chord, touch-only detection ============ */
EF.HumanController = class HumanController {
  constructor(input, idx = 0) { this.input = input; this.idx = idx; this.lp = [0, 0]; this.mt = -99; this.swT = -9; this.skT = -9; this.chord = 0; this.mouseOn = false; }
  stick() { const m = this.input.move(); const d = game.view.screenDirToGround(m[0], m[1]); return d; }
  anyFace() { const I = this.input; return I.pressed('pass') || I.pressed('shoot') || I.pressed('lob') || I.pressed('through'); }
  read(f, M) {
    const I = this.input, it = EF.Intent(), now = M ? M.t : 0, B = (a) => ({ down: I.down(a), pressed: I.pressed(a), released: I.released(a), held: 0 });
    const m = I.move(), d = game.view.screenDirToGround(m[0], m[1]); it.move = [d[0], d[1]];
    it.sprint = I.down('sprint');
    for (const a of ['pass', 'shoot', 'lob', 'through', 'skill', 'dive']) it[a] = B(a);
    it.sw = B('switch');
    // mouse aim: on while the pointer moves, off after 3 s or when the stick is used
    let p = null; try { p = I.pointer && I.pointer(); } catch (e) { p = null; }
    if (p && (p[0] !== this.lp[0] || p[1] !== this.lp[1])) { this.lp = [p[0], p[1]]; if (I.lastDevice === 'mouse') this.mt = performance.now(); }
    if (Math.hypot(m[0], m[1]) > .3) this.mt = -99;
    this.mouseOn = performance.now() - this.mt < 3000 && I.lastDevice !== 'gamepad';
    if (this.mouseOn && this.idx === 0) { const g = game.mouseGround(); if (g) { it.aimPoint = { x: g[0], y: g[1] }; } }
    // the europhoria chord: L1 + R1 (switch + skill) within 120 ms, or the key
    if (I.pressed('switch')) this.swT = now; if (I.pressed('skill')) this.skT = now;
    if (I.pressed('euphoria') || ((I.pressed('switch') || I.pressed('skill')) && I.down('switch') && I.down('skill') && Math.abs(this.swT - this.skT) < .12)) { it.euphoria = true; if (!I.pressed('euphoria')) { it.skill.pressed = false; it.sw.pressed = false; } }
    return it;
  }
};
/** a controller that replays a script: for tests and the attract mode (cheats freely) */
EF.ScriptController = class { constructor(fn) { this.fn = fn; } read(f, M) { return this.fn(f, M) || EF.Intent(); } stick() { return [0, 0]; } anyFace() { return false; } };
EF.touchOnly = () => {
  if (EF.query.touchonly === '1') return true; if (EF.touchCleared) return false;
  try { const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches; const pads = (navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []); return coarse && !fine && !pads.length; } catch (e) { return false; }
};
if (typeof addEventListener === 'function') { addEventListener('keydown', () => { EF.touchCleared = true; }); addEventListener('gamepadconnected', () => { EF.touchCleared = true; }); }

//# sourceURL=ef/02-glyphs.js
/* ============ 02-glyphs: pixel-art controller, keyboard and mouse icons, and the prompt line ============ */
EF.Glyphs = (() => {
  const PS = { cross: '#6aa0ff', circle: '#ff5a5a', square: '#ff7ad0', tri: '#3ad6a0' }, XB = { A: '#3ad65a', B: '#ff5a4a', X: '#4a8aff', Y: '#ffd34a' };
  const PAD = { Pad0: ['cross', 'A'], Pad1: ['circle', 'B'], Pad2: ['square', 'X'], Pad3: ['tri', 'Y'], Pad4: ['L1', 'LB'], Pad5: ['R1', 'RB'], Pad6: ['L2', 'LT'], Pad7: ['R2', 'RT'], Pad8: ['Create', 'View'], Pad9: ['Options', 'Menu'], Pad10: ['L3', 'L3'], Pad11: ['R3', 'R3'], Pad12: ['up', 'up'], Pad13: ['down', 'down'], Pad14: ['left', 'left'], Pad15: ['right', 'right'] };
  const width = (kind, s = 1) => (/^(L1|R1|L2|R2|LB|RB|LT|RT)$/.test(kind) ? 16 : /^(Options|Create|Menu|View)$/.test(kind) ? 20 : 12) * s;
  /** draw a pad glyph in g at (x, y) top-left, scale s; style 'playstation' | 'xbox' */
  function pad(g, name, x, y, s, style) {
    const ps = style !== 'xbox', cx = x + 6 * s, cy = y + 6 * s, k = PAD[name] || [name, name], kind = ps ? k[0] : k[1];
    if (PS[kind] || XB[kind]) {
      if (ps) { px.disc(g, cx, cy, 6 * s, '#10131f'); px.disc(g, cx, cy, 5 * s - 1, '#1c2036'); const c = PS[kind], r = 3 * s;
        if (kind === 'cross') { px.line(g, cx - r, cy - r, cx + r, cy + r, c, Math.max(1, s)); px.line(g, cx - r, cy + r, cx + r, cy - r, c, Math.max(1, s)); }
        else if (kind === 'circle') { px.disc(g, cx, cy, r + 1, c); px.disc(g, cx, cy, Math.max(1, r - 1), '#1c2036'); }
        else if (kind === 'square') { px.rect(g, cx - r, cy - r, r * 2, r * 2, c); px.rect(g, cx - r + Math.max(1, s), cy - r + Math.max(1, s), r * 2 - 2 * Math.max(1, s), r * 2 - 2 * Math.max(1, s), '#1c2036'); }
        else { px.poly(g, [[cx, cy - r - 1], [cx + r + 1, cy + r], [cx - r - 1, cy + r]], c); px.poly(g, [[cx, cy - r + Math.max(1, s)], [cx + r - Math.max(1, s), cy + r - Math.max(1, s)], [cx - r + Math.max(1, s), cy + r - Math.max(1, s)]], '#1c2036'); } }
      else { px.disc(g, cx, cy, 6 * s, XB[kind]); px.disc(g, cx, cy, 6 * s - 1, shadeC(XB[kind])); E.font.text(g, kind, cx, cy - 3 * s, '#ffffff', { font: 'tiny', align: 'center', scale: Math.max(1, s), outline: false }); }
      return 12 * s;
    }
    if (/^(L1|R1|L2|R2|LB|RB|LT|RT)$/.test(kind)) { const w = 16 * s; px.rect(g, x, y + 2 * s, w, 8 * s, '#10131f'); px.rect(g, x + 1, y + 2 * s + 1, w - 2, 8 * s - 2, '#2a3050'); E.font.text(g, kind, x + w / 2, y + 3 * s + 1, '#e8ecff', { font: 'tiny', align: 'center', scale: Math.max(1, s), outline: false }); return w; }
    if (/^(Options|Create|Menu|View)$/.test(kind)) { const w = 20 * s; px.rect(g, x, y + 3 * s, w, 6 * s, '#10131f'); px.rect(g, x + 1, y + 3 * s + 1, w - 2, 6 * s - 2, '#2a3050'); E.font.text(g, kind.slice(0, 4).toUpperCase(), x + w / 2, y + 3 * s + 1, '#e8ecff', { font: 'tiny', align: 'center', scale: 1, outline: false }); return w; }
    px.disc(g, cx, cy, 6 * s, '#10131f'); px.disc(g, cx, cy, 5 * s, '#2a3050'); E.font.text(g, String(kind).slice(0, 2), cx, cy - 2 * s, '#e8ecff', { font: 'tiny', align: 'center', scale: Math.max(1, s), outline: false }); return 12 * s;
  }
  const shadeC = c => { const n = parseInt(c.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * .78).toString(16).padStart(2, '0')).join(''); };
  function key(g, label, x, y, s) {
    const w = Math.max(12, E.font.width(label, { font: 'tiny' }) + 8) * s | 0, h = 11 * s;
    px.rect(g, x, y + 1, w, h, '#0a0c14'); px.rect(g, x, y, w, h - 1, '#e8ecf4'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#c8cfe0'); E.font.text(g, label, x + w / 2, y + 2 * s, '#141826', { font: 'tiny', align: 'center', scale: s >= 2 ? 2 : 1, outline: false }); return w;
  }
  function mouse(g, btn, x, y, s) {
    px.rect(g, x + 1, y, 9 * s, 12 * s, '#e8ecf4'); px.rect(g, x + 2, y + 1, 9 * s - 2, 12 * s - 2, '#8a92b0');
    const lit = '#ffc83a'; if (btn === 0) px.rect(g, x + 2, y + 1, 4 * s, 5 * s, lit); else if (btn === 2) px.rect(g, x + 1 + 5 * s - 1, y + 1, 4 * s, 5 * s, lit); else px.rect(g, x + 1 + 4 * s, y + 1, s + 1, 5 * s, lit);
    px.rect(g, x + 2, y + 6 * s, 9 * s - 2, 1, '#10131f'); return 11 * s;
  }
  return { pad, key, mouse, width };
})();
/** a prompt: the icon for the action on the player's device, then the label. Draws in g (inside r.overlay). Returns the width. */
EF.prompt = (g, x, y, action, label, o = {}) => {
  const s = o.scale || 1, inp = game.players[o.player || 0] || game.input, dev = o.device || inp.lastDevice || 'keyboard', style = (game.settings && game.settings.glyphs) || 'playstation';
  const measure = !!o.measure; let w = 0; const icons = [];
  if (action === 'euphoria' && (dev === 'gamepad')) icons.push(['pad', 'Pad4'], ['plus'], ['pad', 'Pad5']);
  else if (action === 'euphoria') icons.push(['key', 'SPACE']);
  else {
    const map = inp.map && inp.map[action] || [], pads = map.filter(c => /^Pad\d+$/.test(c)), keys = map.filter(c => !/^Pad\d+$/.test(c) && !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (dev === 'gamepad' && pads.length) icons.push(['pad', pads[0]]);
    else if (dev === 'mouse' && keys.find(c => c.startsWith('Mouse'))) icons.push(['mouse', +keys.find(c => c.startsWith('Mouse')).slice(5)]);
    else if (keys.length) icons.push(['key', inp.codeLabel ? inp.codeLabel(keys.find(c => !c.startsWith('Mouse')) || keys[0]) : keys[0]]);
    else if (pads.length) icons.push(['pad', pads[0]]);
  }
  let cx = x; if (o.align === 'center') { const tot = EF.promptWidth(action, label, o); cx = x - tot / 2; } else if (o.align === 'right') { cx = x - EF.promptWidth(action, label, o); }
  const x0 = cx;
  for (const ic of icons) {
    if (ic[0] === 'pad') cx += EF.Glyphs.pad(g, ic[1], cx, y, s, style) + 2 * s;
    else if (ic[0] === 'key') cx += EF.Glyphs.key(g, ic[1], cx, y, s) + 2 * s;
    else if (ic[0] === 'mouse') cx += EF.Glyphs.mouse(g, ic[1], cx, y, s) + 2 * s;
    else if (ic[0] === 'plus') { E.font.text(g, '+', cx, y + 2 * s, '#ffffff', { scale: s, shadow: '#000', outline: false }); cx += 6 * s + 2; }
  }
  if (label) { E.font.text(g, label, cx, y + (o.scale > 1 ? 3 : 2), o.color || '#fff6e0', { scale: s >= 2 ? 2 : 1, shadow: '#000', outline: false }); cx += E.font.width(label, { scale: s >= 2 ? 2 : 1 }); }
  return cx - x0;
};
EF.promptWidth = (action, label, o = {}) => {
  const s = o.scale || 1, inp = game.players[o.player || 0] || game.input, dev = o.device || inp.lastDevice || 'keyboard'; let w = 0;
  if (action === 'euphoria' && dev === 'gamepad') w = 16 * s * 2 + 6 * s + 8;
  else if (action === 'euphoria') w = Math.max(12, E.font.width('SPACE', { font: 'tiny' }) + 8) * s + 2;
  else { const map = inp.map && inp.map[action] || [], pads = map.filter(c => /^Pad\d+$/.test(c)), keys = map.filter(c => !/^Pad\d+$/.test(c) && !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (dev === 'gamepad' && pads.length) w = EF.Glyphs.width((PADNAMES[pads[0]] || ['x'])[0], s) + 2 * s; else if (dev === 'mouse' && keys.find(c => c.startsWith('Mouse'))) w = 11 * s + 2 * s; else if (keys.length) w = Math.max(12, E.font.width(inp.codeLabel ? inp.codeLabel(keys.find(c => !c.startsWith('Mouse')) || keys[0]) : keys[0], { font: 'tiny' }) + 8) * s + 2 * s; else w = 12 * s; }
  return w + (label ? E.font.width(label, { scale: s >= 2 ? 2 : 1 }) : 0);
};
const PADNAMES = { Pad4: ['L1'], Pad5: ['R1'], Pad6: ['L2'], Pad7: ['R2'], Pad9: ['Options'], Pad8: ['Create'] };

//# sourceURL=ef/03-audio.js
/* ============ 03-audio: everything is synthesised: effects, songs, the crowd, the babble voices ============ */
const SFX = {
  kick: [{ wave: 'noise', freq: 1100, to: 220, dur: .07, vol: .32, filter: 'lowpass' }, { wave: 'sine', freq: 150, to: 80, dur: .08, vol: .3 }],
  pass: { wave: 'noise', freq: 800, to: 300, dur: .05, vol: .18, filter: 'lowpass' },
  shot: [{ wave: 'noise', freq: 1500, to: 200, dur: .11, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 190, to: 60, dur: .14, vol: .4 }],
  thud: { wave: 'sine', freq: 110, to: 60, dur: .1, vol: .3 }, bounce: { wave: 'sine', freq: 170, to: 100, dur: .07, vol: .2 },
  whistle: [{ wave: 'square', freq: 2300, vib: [28, .05], dur: .35, vol: .12, hold: true }, { wave: 'square', freq: 2380, vib: [31, .05], dur: .35, vol: .08, hold: true }],
  whistle2: [{ wave: 'square', freq: 2300, vib: [28, .05], dur: .12, vol: .12, hold: true }, { wave: 'square', freq: 2300, vib: [28, .05], dur: .12, vol: .12, hold: true, delay: .18 }, { wave: 'square', freq: 2300, vib: [28, .05], dur: .5, vol: .12, hold: true, delay: .36 }],
  post: [{ wave: 'triangle', freq: 1500, to: 1050, dur: .35, vol: .3 }, { wave: 'square', freq: 700, to: 500, dur: .2, vol: .1 }],
  net: { wave: 'noise', freq: 2400, to: 900, dur: .35, vol: .3, filter: 'bandpass' },
  slide: { wave: 'noise', freq: 600, to: 200, dur: .35, vol: .2, filter: 'lowpass' },
  tackle: [{ wave: 'noise', freq: 500, to: 160, dur: .1, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 70, dur: .1, vol: .3 }],
  cheer: [{ wave: 'noise', freq: 800, to: 1500, dur: 1.6, vol: .3, filter: 'bandpass', q: .5, attack: .25 }, { wave: 'noise', freq: 1400, to: 900, dur: 1.4, vol: .18, filter: 'bandpass', q: .7, attack: .35 }],
  groan: [{ wave: 'noise', freq: 500, to: 220, dur: 1.1, vol: .26, filter: 'bandpass', q: .6, attack: .15 }, { wave: 'saw', freq: 190, to: 110, dur: .9, vol: .05 }],
  ooh: [{ wave: 'noise', freq: 600, to: 1100, dur: .7, vol: .22, filter: 'bandpass', q: .6, attack: .2 }],
  card: [{ wave: 'square', freq: 440, dur: .08, vol: .16 }, { wave: 'square', freq: 660, dur: .14, vol: .16, delay: .09 }],
  varbeep: [{ wave: 'sine', freq: 880, dur: .1, vol: .16 }, { wave: 'sine', freq: 880, dur: .1, vol: .16, delay: .3 }, { wave: 'sine', freq: 1320, dur: .25, vol: .16, delay: .6 }],
  charge: { wave: 'saw', freq: 120, to: 480, dur: .6, vol: .06 },
  euphoriaFull: [{ wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .22 }, { wave: 'noise', freq: 2000, dur: .5, vol: .12, filter: 'highpass' }],
  europhoria: [{ wave: 'saw', freq: 110, to: 880, dur: 1.1, vol: .2, attack: .5 }, { wave: 'noise', freq: 400, to: 3000, dur: 1.2, vol: .25, filter: 'bandpass', attack: .6 }, { wave: 'square', freq: 'C4', arp: [0, 4, 7, 12, 16, 19], step: .09, dur: .8, vol: .12, delay: .9 }],
  superStrike: [{ wave: 'noise', freq: 4000, to: 150, dur: .5, vol: .45, filter: 'lowpass' }, { wave: 'saw', freq: 900, to: 60, dur: .6, vol: .25 }, { wave: 'sine', freq: 80, to: 40, dur: .5, vol: .5 }],
  duelTick: { wave: 'square', freq: 1000, dur: .04, vol: .1 }, duelWin: [{ wave: 'triangle', freq: 'E5', arp: [0, 4, 7], step: .07, dur: .25, vol: .25 }], duelLose: [{ wave: 'saw', freq: 300, to: 80, dur: .5, vol: .2 }],
  dive: { wave: 'noise', freq: 900, to: 400, dur: .25, vol: .2, filter: 'lowpass' }, save: [{ wave: 'noise', freq: 1600, to: 500, dur: .09, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 600, to: 800, dur: .15, vol: .18 }],
  skill: { wave: 'triangle', freq: 900, to: 1500, dur: .09, vol: .14 }, euTick: { wave: 'triangle', freq: 1200, to: 1700, dur: .05, vol: .08 },
  seagull: [{ wave: 'saw', freq: 900, to: 1500, dur: .18, vol: .14, vib: [30, .1] }, { wave: 'saw', freq: 1500, to: 800, dur: .22, vol: .14, delay: .2, vib: [30, .1] }],
  honk: { wave: 'saw', freq: 130, to: 170, dur: .35, vol: .2 }, drum: [{ wave: 'sine', freq: 140, to: 60, dur: .16, vol: .4 }, { wave: 'noise', freq: 300, dur: .06, vol: .1, filter: 'lowpass' }],
  clap: { wave: 'noise', freq: 1800, dur: .04, vol: .22, filter: 'bandpass', q: 2 }, boom: { wave: 'sine', freq: 70, to: 30, dur: .6, vol: .5 }, firework: [{ wave: 'noise', freq: 3000, to: 500, dur: .5, vol: .22, filter: 'lowpass' }, { wave: 'triangle', freq: 1800, to: 300, dur: .5, vol: .1 }],
  zap: { wave: 'square', freq: 200, to: 90, dur: .3, vol: .18 }, hammer: [{ wave: 'sine', freq: 100, to: 40, dur: .3, vol: .5 }, { wave: 'noise', freq: 500, dur: .1, vol: .3, filter: 'lowpass' }]
};
for (const k in SFX) A.define(k, SFX[k]);
EF.sfx = (name, o) => { try { A.sfx(name, o); } catch (e) { /* audio is optional */ } };

/* ---- songs: original, in the engine's format ---- */
const SONGS = {
  title: { bpm: 126, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'G4 . G4 . C5 - - . | G4 . G4 . C5 - - . | D5 . D5 . E5 . D5 C5 | D5 - - - . . . . | E5 . E5 . G5 - - . | E5 . E5 . G5 - - . | A5 . G5 . E5 . D5 . | C5 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . . C3 . . G2 . | C3 . . C3 . . G2 . | G2 . . G2 . . D3 . | G2 . . G2 . . D3 . | C3 . . C3 . . G2 . | C3 . . C3 . . G2 . | F2 . . F2 . . G2 . | C3 . . G2 . . C3 .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h k | k . h . s . h . | k . h . s . h k | k . h . s h h h' }] },
  cup: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'E4 . G4 . A4 . G4 . | E4 . G4 . C5 - - . | D4 . F4 . A4 . F4 . | D4 . E4 - - - . .' }, { wave: 'triangle', vol: .26, notes: 'A2 . . . E3 . . . | C3 . . . G3 . . . | D3 . . . A3 . . . | E3 . . . E3 . . .' }, { wave: 'drums', vol: .06, notes: 'k . . . s . . . | k . . . s . . .' }] },
  smoke: { bpm: 138, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' }, { wave: 'drums', vol: .08, notes: 'k . h . s . h k | k . h . s h h .' }] },
  ole: { bpm: 112, steps: 4, tracks: [
    { wave: 'pulse', vol: .07, notes: 'E5 . C5 . E5 . G5 . | A5 . G5 . E5 . C5 . | D5 . B4 . D5 . F5 . | E5 - - - . . . .' }, { wave: 'triangle', vol: .3, notes: 'A2 . E3 . A2 . E3 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . . .' }, { wave: 'drums', vol: .07, notes: 'k . h h s . h . | k . h h s . h h' }] },
  forge: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .05, notes: 'A3 . A3 . C4 . A3 . | A3 . A3 . D4 . C4 . | A3 . A3 . E4 . D4 . | C4 . A3 . G3 . A3 .' }, { wave: 'triangle', vol: .32, notes: 'A1 . A1 . A1 . A1 . | A1 . A1 . A1 . A1 . | F1 . F1 . F1 . F1 . | G1 . G1 . G1 . G1 .' }, { wave: 'drums', vol: .12, notes: 'k . k . s . k k | k . k . s . k s' }] },
  curva: { bpm: 90, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'A3 - - . C4 - - . | E4 - - . D4 - - . | C4 - - . A3 - - . | B3 - - - . . . .' }, { wave: 'triangle', vol: .28, notes: 'A2 . . . . . . . | C3 . . . . . . . | F2 . . . . . . . | E2 . . . . . . .' }, { wave: 'drums', vol: .09, notes: 'k . . . . . k . | . . . . k . . .' }] },
  gold: { bpm: 120, steps: 4, tracks: [
    { wave: 'pulse', vol: .06, notes: 'C5 . E5 . G5 . E5 . | C5 . F5 . A5 . F5 . | D5 . G5 . B5 . G5 . | C6 - - - . . . .' }, { wave: 'triangle', vol: .26, notes: 'C3 . G3 . C3 . G3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . . .' }, { wave: 'drums', vol: .08, notes: 'k . h . s . h . | k . h . s . h h' }] },
  rec: { bpm: 110, steps: 4, tracks: [{ wave: 'triangle', vol: .14, notes: 'C4 . E4 . G4 . E4 . | F4 . A4 . C5 . A4 . | G4 . B4 . D5 . B4 . | C5 - - - . . . .' }, { wave: 'triangle', vol: .24, notes: 'C3 . . . G2 . . . | F2 . . . C3 . . . | G2 . . . D3 . . . | C3 . . . . . . .' }] },
  victory: { bpm: 132, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'C5 . C5 . C5 . E5 . | G5 - - . E5 . G5 . | C6 - - - - - - - | . . . . . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . G3 . C3 . G3 . | C3 . G3 . E3 . G3 . | C3 - - - - - - - | . . . . . . . .' }, { wave: 'drums', vol: .08, notes: 'k . h . s . h k | k . h . s s s s' }] },
  defeat: { bpm: 70, steps: 4, tracks: [{ wave: 'triangle', vol: .18, notes: 'E4 - - - D4 - - - | C4 - - - A3 - - - | B3 - - - - - - - | . . . . . . . .' }, { wave: 'triangle', vol: .24, notes: 'A2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | . . . . . . . .' }] },
  tabloid: { bpm: 140, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'G4 . . G4 . . A4 . | B4 . . B4 . . C5 . | D5 . . D5 . . E5 . | D5 . C5 . B4 . A4 .' }, { wave: 'triangle', vol: .26, notes: 'G2 . D3 . G2 . D3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | D3 . A3 . D3 . D3 .' }, { wave: 'drums', vol: .08, notes: 'k . . . s . . . | k . . . s . h .' }] },
  attract: { bpm: 144, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'C5 . E5 . G5 . E5 . | A5 . G5 . E5 . C5 . | D5 . F5 . A5 . F5 . | G5 - - - . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . . C3 . . G2 . | A2 . . A2 . . E2 . | F2 . . F2 . . G2 . | G2 . . G2 . . D3 .' }, { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] }
};
EF.SONGS = SONGS;
EF.music = (name, o) => { try { if (name === null) A.music(null); else A.music(SONGS[name] || name, o); } catch (e) { /* silent */ } };

/* ---- crowd engine: a continuous noise bed that follows the mood, plus chants ---- */
EF.crowdAudio = (() => {
  let nodes = null, gain = 0, target = .15, lastChant = 0;
  const build = () => {
    const c = A.ctx; if (!c || c.state !== 'running' || !A._noise) return null;
    const src = c.createBufferSource(); src.buffer = A._noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = .5; const g = c.createGain(); g.gain.value = 0;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .3; lg.gain.value = 120; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    src.connect(bp); bp.connect(g); g.connect(A._sfxBus); src.start(); return { c, g, bp, src };
  };
  return {
    /** mood 0..1: how loud the stands are; call every update */
    update(dt, mood, volMul) {
      if (!nodes) nodes = build(); if (!nodes) return;
      const s = (game.settings && game.settings.crowdSound !== undefined ? game.settings.crowdSound : 1) * (volMul === undefined ? 1 : volMul) * EF.T.crowdVol;
      target = (.05 + mood * .2) * s; gain += (target - gain) * Math.min(1, dt * 2); nodes.g.gain.value = A.muted ? 0 : gain; nodes.bp.frequency.value = 500 + mood * 500;
    },
    stop() { if (nodes) { try { nodes.g.gain.value = 0; } catch (e) { /* closed */ } } },
    swell(amt = 1) { gain = Math.min(.6, gain + .14 * amt); },
    chant(team, t) {
      if (t - lastChant < 5) return; lastChant = t; const base = { kip: [['G4', 0], ['G4', .32], ['C5', .64]], hoo: [['G2', 0]], rpp: [['E5', 0], ['C5', .3]], svs: [['A4', 0], ['A4', .28], ['A4', .56]], acl: [['A3', 0], ['C4', .5], ['E4', 1], ['D4', 1.5]], opu: [['C4', 0]] }[team] || [['G4', 0]];
      const v = EF.game.settings.crowdSound === undefined ? 1 : EF.game.settings.crowdSound; const voices = base.map(([f, d]) => ({ wave: team === 'hoo' ? 'saw' : 'triangle', freq: f, dur: team === 'hoo' ? .8 : .24, vol: .12 * v, delay: d, to: team === 'hoo' ? 'C3' : undefined }));
      if (team === 'kip') for (let i = 0; i < 3; i++) voices.push({ wave: 'noise', freq: 1800, dur: .04, vol: .14 * v, filter: 'bandpass', q: 2, delay: 1.1 + i * .22 });
      if (team === 'svs') for (let i = 0; i < 3; i++) voices.push({ wave: 'sine', freq: 120, to: 60, dur: .14, vol: .3 * v, delay: i * .28 });
      EF.sfx(voices);
    }
  };
})();

/* ---- babble: Animalese-style gibberish voices ---- */
EF.babble = (() => {
  const hash = (a, b) => ((Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1 + 1) % 1;
  const pitchOf = id => (EF.SPEAKERS[id] && EF.SPEAKERS[id].pitch) || .9;
  const vol = () => (game.settings && game.settings.voices !== undefined ? game.settings.voices : 1);
  const VOW = 'aeiouAEIOU';
  /** a function for E.Dialog's voice: plays one blip per call */
  function voiceFor(id) { const p = pitchOf(id); return (i) => { const f = 190 * p * (.82 + hash(i, id.length) * .62); EF.sfx({ wave: p > 1 ? 'triangle' : 'square', freq: f, to: f * (1 + (hash(i, 3) - .5) * .5), dur: .055, vol: .1 * vol() }, { vary: .02 }); }; }
  /** speak a whole line at once (for commentary that is not typed through a Dialog) */
  function say(id, text, rate = 1) {
    const p = pitchOf(id), voices = []; let t = 0, n = 0; const words = text.split(/\s+/).slice(0, 14);
    for (const w of words) { const syl = Math.max(1, Math.min(4, (w.match(/[aeiouAEIOU]+/g) || ['a']).length)); for (let s = 0; s < syl; s++) { const f = 180 * p * (.8 + hash(n++, w.length) * .7); voices.push({ wave: p > 1 ? 'triangle' : 'square', freq: f, to: f * (.9 + hash(n, 5) * .35), dur: .07, vol: .09 * vol(), delay: t }); t += .085 / rate; } t += .06 / rate; }
    if (voices.length) EF.sfx(voices, { vary: .01 });
    return t;
  }
  return { voiceFor, say };
})();

//# sourceURL=ef/04-art.js
/* ============ 04-art: rigs in kits, crests, balls, cards, small drawing helpers ============ */
const GK_COLORS = ['#7ad84a', '#e86ad0', '#4ad0e8', '#ffa030'];
EF.makeRig = (data, kit, role, o = {}) => {
  const gk = role === 'GK' || o.gk;
  const colors = { skin: data.skin, hair: data.hairColor, cloth: kit.cloth, pants: kit.pants, boot: kit.boot, belt: kit.belt, trim: kit.trim, glove: gk ? (o.gloves || '#ffd34a') : kit.cloth };
  const rig = new E.Humanoid({ size: data.size || 1.1, build: data.build || 'heroic', weapon: null, outfit: 'shirt', hair: data.hair || 'short', sleeves: gk ? 'long' : 'short', colors, speedRef: 80,
    kit: kit.pattern ? { pattern: kit.pattern, color2: kit.color2, number: data.num, numberColor: kit.number } : { number: data.num, numberColor: kit.number, pattern: 'plain' } });
  return rig;
};
EF.gkKit = (M, side) => { const t0 = M.teams[0].kit.cloth, t1 = M.teams[1].kit.cloth; const pick = GK_COLORS.filter(c => c !== t0 && c !== t1); const c = pick[(side + ((M.teams[side].id || 'kip').length)) % pick.length]; return { cloth: c, color2: c, pattern: 'plain', pants: '#1a1d2a', boot: '#14161e', belt: '#1a1d2a', trim: c, glove: '#ffffff', number: '#141826' }; };
/** a crest, 14 px wide at scale 1 */
EF.drawCrest = (g, team, x, y, s = 1) => {
  const t = typeof team === 'string' ? EF.get('team', team) : team, c = t.crest, w = 12 * s, h = 14 * s, cx = x + w / 2;
  if (c.shape === 'shield') { px.poly(g, [[x, y], [x + w, y], [x + w, y + 8 * s], [cx, y + h], [x, y + 8 * s]], '#0a0c14'); px.poly(g, [[x + 1, y + 1], [x + w - 1, y + 1], [x + w - 1, y + 8 * s - 1], [cx, y + h - 2], [x + 1, y + 8 * s - 1]], c.c1); }
  else { px.disc(g, cx, y + 7 * s, 7 * s, '#0a0c14'); px.disc(g, cx, y + 7 * s, 7 * s - 1, c.c1); }
  const m = c.c2, mx = cx, my = y + 6.5 * s;
  switch (c.sym) {
    case 'fish': px.poly(g, [[mx - 4 * s, my], [mx, my - 2 * s], [mx + 3 * s, my], [mx, my + 2 * s]], m); px.poly(g, [[mx + 3 * s, my], [mx + 5 * s, my - 2 * s], [mx + 5 * s, my + 2 * s]], m); break;
    case 'boot': px.rect(g, mx - 3 * s, my - 3 * s, 2 * s, 5 * s, m); px.rect(g, mx - 3 * s, my + 1 * s, 6 * s, 2 * s, m); break;
    case 'sun': px.disc(g, mx, my, 2.5 * s, m); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px.line(g, mx + Math.cos(a) * 3.5 * s, my + Math.sin(a) * 3.5 * s, mx + Math.cos(a) * 5 * s, my + Math.sin(a) * 5 * s, m, 1); } break;
    case 'cog': px.disc(g, mx, my, 3 * s, m); px.disc(g, mx, my, 1.2 * s, c.c1); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; px.rect(g, mx + Math.cos(a) * 3.5 * s - 1, my + Math.sin(a) * 3.5 * s - 1, 2, 2, m); } break;
    case 'lock': px.rect(g, mx - 3 * s, my - 1 * s, 6 * s, 4 * s, m); px.line(g, mx - 2 * s, my - 1 * s, mx - 2 * s, my - 3 * s, m, 1); px.line(g, mx + 2 * s, my - 1 * s, mx + 2 * s, my - 3 * s, m, 1); px.line(g, mx - 2 * s, my - 3 * s, mx + 2 * s, my - 3 * s, m, 1); break;
    case 'crown': px.poly(g, [[mx - 4 * s, my + 2 * s], [mx - 4 * s, my - 2 * s], [mx - 2 * s, my], [mx, my - 3 * s], [mx + 2 * s, my], [mx + 4 * s, my - 2 * s], [mx + 4 * s, my + 2 * s]], m); break;
  }
};
EF.BALLSPR = {};
EF.ballSprite = (id, k) => { const key = id + k; if (EF.BALLSPR[key]) return EF.BALLSPR[key]; const b = EF.BALLS.find(x => x.id === id) || EF.BALLS[0]; const a = ['.www.', 'wwkww', 'wkkkw', 'wwkww', '.www.'], c = ['.www.', 'wkwkw', 'wwwww', 'wkwkw', '.www.']; return (EF.BALLSPR[key] = E.sprite(k ? c : a, { w: b.c1, k: b.c2 })); };
EF.shade = (c, k) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(c.substr(i, 2), 16) * k))).toString(16).padStart(2, '0')).join('');
EF.TEAMCOL = (t, side) => { const d = EF.get('team', t); return (side === 1 && d.away ? d.away : d.kit).cloth; };

//# sourceURL=ef/10-pitch.js
/* ============ 10-pitch: the pitch geometry, the stadium tile map, the ball ============ */
const TL = 16, FW = 44, FH = 26, ND = 2, STAND = 4, GOAL_TILES = 6;
const Pitch = EF.Pitch = {};
Pitch.COLS = ND + 1 + FW + 1 + ND; Pitch.ROWS = STAND + 1 + FH + 1 + 2;
Pitch.X0 = (ND + 1) * TL; Pitch.X1 = Pitch.X0 + FW * TL; Pitch.Y0 = (STAND + 1) * TL; Pitch.Y1 = Pitch.Y0 + FH * TL;
Pitch.CX = (Pitch.X0 + Pitch.X1) / 2; Pitch.CY = (Pitch.Y0 + Pitch.Y1) / 2; Pitch.GH = GOAL_TILES * TL / 2; Pitch.BAR = 28;
Pitch.BOXD = 84; Pitch.BOXH = 110; Pitch.SIXD = 36; Pitch.SIXH = 60; Pitch.SPOT = 58; Pitch.GRAV = 600;
const { X0, X1, Y0, Y1, CX, CY, GH, BAR } = Pitch;
Pitch.goalX = side => side === 0 ? X1 : X0;           // the goal side `side` attacks
Pitch.ownGoalX = side => side === 0 ? X0 : X1;
Pitch.inBox = (x, y, side) => Math.abs(y - CY) < Pitch.BOXH && (side === 0 ? x < X0 + Pitch.BOXD : x > X1 - Pitch.BOXD);   // inside side's own penalty area

Pitch.rows = (() => {
  const rows = [], goalRow = r => r > FH / 2 - GOAL_TILES / 2 && r <= FH / 2 + GOAL_TILES / 2;
  for (let R = 0; R < Pitch.ROWS; R++) {
    let s = ''; const r = R - STAND;
    for (let c = 0; c < Pitch.COLS; c++) {
      const field = c > ND && c <= ND + FW && r > 0 && r <= FH, endCol = c === ND || c === ND + FW + 1, net = c < ND || c > ND + FW + 1;
      if (r < 0) s += c >= ND && c <= ND + FW + 1 ? String(Math.min(5, R + 1)) : ',';
      else if (field) s += '.';
      else if (endCol && r > 0 && r <= FH) s += goalRow(r) ? '.' : '#';
      else if ((r === 0 || r === FH + 1) && c >= ND && c <= ND + FW + 1) s += '#';
      else if (net && goalRow(r)) s += c === 0 || c === Pitch.COLS - 1 ? 'N' : ':';
      else if (net && (goalRow(r + 1) || goalRow(r - 1))) s += 'N';
      else s += ',';
    }
    rows.push(s);
  }
  return rows;
})();

const lineAt = (x, y) => {
  const ex = Math.min(Math.abs(x - X0), Math.abs(x - X1)), ey = Math.min(Math.abs(y - Y0), Math.abs(y - Y1)), inside = x > X0 - 1.5 && x < X1 + 1.5 && y > Y0 - 1.5 && y < Y1 + 1.5;
  if (inside && (ex < 1.5 || ey < 1.5)) return true;
  if (Math.abs(x - CX) < 1 && inside) return true;
  if (Math.abs(Math.hypot(x - CX, y - CY) - 44) < 1) return true;
  if (Math.hypot(x - CX, y - CY) < 2) return true;
  for (const gx of [X0, X1]) {
    const dx = Math.abs(x - gx), dy = Math.abs(y - CY);
    if ((Math.abs(dx - Pitch.BOXD) < 1 && dy < Pitch.BOXH) || (Math.abs(dy - Pitch.BOXH) < 1 && dx < Pitch.BOXD)) return true;
    if ((Math.abs(dx - Pitch.SIXD) < 1 && dy < Pitch.SIXH) || (Math.abs(dy - Pitch.SIXH) < 1 && dx < Pitch.SIXD)) return true;
    if (Math.hypot(dx - Pitch.SPOT, dy) < 2) return true;
    if (Math.abs(Math.hypot(dx - Pitch.SPOT, dy) - 36) < 1 && dx > Pitch.BOXD) return true;
  }
  return false;
};
const SPONSOR_COLORS = ['#c8302a', '#2a5ab8', '#e8b020', '#2a8a4a'];
const mapCache = {};
Pitch.build = stadiumId => {
  if (mapCache[stadiumId]) return mapCache[stadiumId];
  const st = EF.get('stadium', stadiumId) || EF.get('stadium', 'rec'), [ga, gb] = st.grass, snow = !!st.snow, wet = !!st.wet;
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .06, y * .06) * .5;
    if (tag === 'net') { const mesh = Math.floor(x) % 4 === 0 || Math.floor(y) % 4 === 0; return mesh ? [150, 158, 168] : [44 + n * 8, 62 + n * 10, 52 + n * 8]; }
    if (tag === 'out') return snow ? [188 + n * 14, 196 + n * 12, 208 + n * 10] : [48 + n * 16, 52 + n * 14, 58 + n * 14];
    const k = Math.floor((x - X0) / 32) % 2 ? gb : ga;
    let col;
    if (lineAt(x, y)) { const w = snow ? 120 : 232 + n * 22; col = snow ? [w + 60, w + 70, w + 90] : [w, w + 4, w - 8]; }
    else {
      col = [k[0] + n * 16 + m * 8, k[1] + n * 18 + m * 10, k[2] + n * 14 + m * 8];
      if (snow) col = [200 + n * 22, 208 + n * 20, 220 + n * 16];
      const worn = Math.max(0, 1 - Math.hypot(x - CX, y - CY) / 60) + Math.max(0, 1 - Math.min(Math.abs(x - X0), Math.abs(x - X1)) / 40) * Math.max(0, 1 - Math.abs(y - CY) / 60);
      if (st.mud && worn > .35) col = [col[0] * .6 + 60 * worn, col[1] * .55 + 40 * worn, col[2] * .45 + 20 * worn];
      else if (worn > .5 && !snow) col = [col[0] + 18 * worn, col[1] + 8 * worn, col[2] - 8 * worn];
      if (wet) { const pud = E.noise2(x * .035 + 9, y * .035 + 4); if (pud > .84) col = [70 + n * 8, 100 + n * 8, 120 + n * 8]; }
    }
    return col;
  };
  const sc = st.standColor, hex = E.hex;
  const shade = (c, k) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(c.substr(i, 2), 16) * k))).toString(16).padStart(2, '0')).join('');
  const map = new E.TileMap({ rows: Pitch.rows, legend: { '#': 1, N: 2, 1: 6, 2: 5, 3: 4, 4: 3, 5: 3, '.': { floor: 'grass' }, ':': { floor: 'net' }, ',': { floor: 'out' } }, floorTex, outside: snow ? '#b8c0cc' : '#1e1c24', ao: 4,
    types: { 1: { h: 18, cut: true, cutH: 5, face: 'plank', side: shade(SPONSOR_COLORS[stadiumId.length % 4], .9), top: '#8a96b8', line: '#2a3450' }, 2: { h: 10, face: 'none', side: '#5a6070', top: '#8a92a2' },
      3: { h: 34, face: 'stone', side: shade(sc, .9), top: shade(sc, 1.08) }, 4: { h: 46, face: 'stone', side: shade(sc, .8), top: shade(sc, 1) }, 5: { h: 58, face: 'stone', side: shade(sc, .7), top: shade(sc, .94) }, 6: { h: 70, face: 'stone', side: shade(sc, .6), top: shade(sc, .86) } } });
  return (mapCache[stadiumId] = map);
};

/* ---- the ball ---- */
EF.Ball = class Ball {
  constructor() { this.x = CX; this.y = CY; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.spin = 0; this.owner = null; this.last = null; this.prev = null; this.roll = 0; this.path = null; this.pathT = 0; this.shotBy = null; this.shotT = 0; this.superT = 0; this.decoys = 0; this.fk = -1; this.fkT = 0; this.bounced = false; this.hit = null; this.aerial = 0; }
  stop() { this.vx = this.vy = this.vz = 0; this.spin = 0; this.path = null; }
  speed() { return Math.hypot(this.vx, this.vy); }
  /** advance a loose ball; returns an array of events [type, data] (post, bar, bounce, board) */
  step(dt, M) {
    const ev = [], T = EF.T, st = M.stadium;
    this.bounced = false; this.hit = null;
    if (this.owner) { return ev; }
    this.shotT += dt; this.fkT += dt; if (this.fkT > 7) this.fk = -1;
    if (this.path) this.applyPath(dt, M);
    const sp = Math.hypot(this.vx, this.vy);
    if (this.spin && sp > 20) { const k = this.spin * dt; this.vx += -this.vy * k; this.vy += this.vx * k; this.spin *= Math.exp(-dt * 1.3); }
    this.vz -= Pitch.GRAV * dt * (this.path && this.path.type === 'hammer' ? 1.4 : 1);
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
    if (this.z <= 0) {
      this.z = 0;
      if (this.vz < -40) { this.vz = -this.vz * T.bounce * (st.wet ? .8 : 1); this.bounced = true; ev.push(['bounce', { power: Math.min(1, Math.abs(this.vz) / 200) }]); if (st.uneven && M.rng() < .35) { this.vx += (M.rng() - .5) * 60; this.vy += (M.rng() - .5) * 60; } if (this.path && this.path.type === 'hammer') ev.push(['hammer', {}]); }
      else this.vz = 0;
      const fr = Math.exp(-dt * T.ballDrag * (st.friction || 1) * (st.snow ? .7 : 1) * (this.vz === 0 ? 1 : .4)); this.vx *= fr; this.vy *= fr;
      if (this.vz === 0 && Math.hypot(this.vx, this.vy) < 3) { this.vx = this.vy = 0; }
    } else { const af = Math.exp(-dt * .12); this.vx *= af; this.vy *= af; }
    this.roll += Math.hypot(this.vx, this.vy) * dt;
    // the goal frame: posts and crossbar, only where the ball crosses a goal line
    for (const side of [0, 1]) {
      const gx = side === 0 ? X1 : X0, dir = side === 0 ? 1 : -1, px_ = this.x - dt * this.vx;   // previous x
      const crossed = (px_ - gx) * dir < 0 && (this.x - gx) * dir >= 0 || Math.abs(this.x - gx) < 2.5 && Math.abs(this.vx) > 1 && ((this.x - gx) * dir >= 0);
      if ((px_ - gx) * dir < 0 && (this.x - gx) * dir >= 0) {
        const yy = this.y; const nearPost = Math.min(Math.abs(yy - (CY - GH)), Math.abs(yy - (CY + GH))) < 2.6;
        if (nearPost && this.z < BAR) { this.x = gx - dir * 2.6; this.vx = -this.vx * .55; this.vy += (M.rng() - .5) * 40; ev.push(['post', { x: gx, y: yy }]); }
        else if (Math.abs(yy - CY) < GH && this.z >= BAR - 3 && this.z < BAR + 3) { this.x = gx - dir * 2.6; this.vx = -this.vx * .5; this.vz = Math.abs(this.vz) * .4 - 40; ev.push(['bar', { x: gx, y: yy }]); }
      }
      // the net: past the line inside the frame, the ball is held
      if ((this.x - gx) * dir > 3 && Math.abs(this.y - CY) < GH && this.z < BAR) {
        const depth = (this.x - gx) * dir;
        if (depth > 40) { this.x = gx + dir * 40; this.vx *= -.15; }
        this.vx *= Math.exp(-dt * 6); this.vy *= Math.exp(-dt * 4);
        if (Math.abs(this.y - CY) > GH - 2) { this.y = CY + Math.sign(this.y - CY) * (GH - 2); this.vy *= -.2; }
      }
    }
    return ev;
  }
  /** super strike flight paths: modify velocity each step */
  applyPath(dt, M) {
    const p = this.path; p.t += dt; if (p.t > p.dur || this.speed() < 40) { this.path = null; return; }
    const sp = this.speed() || 1, nx = -this.vy / sp, ny = this.vx / sp;
    if (p.type === 'wobble') { const a = Math.sin(p.t * 14 + p.ph) * 520 * dt; this.vx += nx * a; this.vy += ny * a; }
    else if (p.type === 'zigzag') { const a = (Math.floor(p.t * 7) % 2 ? 1 : -1) * 900 * dt; this.vx += nx * a; this.vy += ny * a; }
    else if (p.type === 'around') { const a = Math.sin(p.t * 6) * 640 * dt; this.vx += nx * a; this.vy += ny * a; }
    else if (p.type === 'meteor') { if (p.t < .08) this.vz += 900 * dt; }
    else if (p.type === 'hammer') { if (this.bounced) { p.hits = (p.hits || 0) + 1; this.vz = Math.max(this.vz, 130); } }
  }
};

//# sourceURL=ef/11-footballer.js
/* ============ 11-footballer: the player entity, its actions, the keeper ============ */
const angDiff = E.angDiff;
EF.Footballer = class Footballer {
  constructor(M, side, slot, data, role) {
    this.M = M; this.side = side; this.slot = slot; this.data = data; this.role = role; this.id = side * 5 + slot; this.name = data.name;
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.facing = side === 0 ? 0 : Math.PI;
    this.stamina = 1; this.state = 'run'; this.stateT = 0; this.action = null; this.actionT = 0; this.actionDur = 0; this.cool = 0; this.stun = 0; this.downT = 0; this.cards = 0; this.sentOff = false;
    this.human = null; this.ctl = null; this.charge = 0; this.charging = false; this.buf = {}; this.aftertouch = 0; this.immune = 0; this.slideHit = false; this.sprinting = false; this.lowStamina = false;
    this.spot = [0, 0]; this.ai = { t: 0, plan: null, hold: 0, release: false, pressed: null, lastDecision: 0 }; this.pose = null; this.expr = null; this.skillDir = 0; this.celebrate = 0; this.prevOwner = false;
    this.k = { keep: 0, diveDir: 0, diveT: 0, outcome: null, holdT: 0, shotId: -1, tx: 0, ty: 0, tz: 0 }; this.lastFouled = -9; this.diveT = 0; this.jump = 0; this.hopT = 0; this.tilt = 0; this.tiltAxis = 0; this.mark = null; this.name3 = data.name.split(' ').pop();
  }
  get st() { return this.data; }
  get isGK() { return this.role === 'GK'; }
  get hasBall() { return this.M.ball.owner === this; }
  speedMax() {
    const T = EF.T, M = this.M, pace = .86 + (this.data.pace || 70) / 100 * .26;
    let s = T.runSpeed * pace * (this.sprinting ? T.sprintMul : 1) * (this.hasBall ? .94 : 1);
    if (M.europhoria && M.europhoria.side === this.side) s *= 1.18;
    if (M.talkBuff(this.side, 'hairdryer')) s *= 1.1;
    if (this.sprinting && this.lowStamina) s *= .8;
    if (M.stadium.snow) s *= .92; if (M.stadium.wet) s *= .97;
    if (this.isGK) s *= .9;
    return s * (this.side === 1 ? M.aiSpeed : 1);
  }
  /** one step: read the intent, do what it says */
  step(dt, intent) {
    const M = this.M, T = EF.T, ball = M.ball;
    this.cool = Math.max(0, this.cool - dt); this.immune = Math.max(0, this.immune - dt); this.celebrate = Math.max(0, this.celebrate - dt); this.aftertouch = Math.max(0, this.aftertouch - dt);
    this.jump = Math.max(0, this.jump - dt * 3);
    for (const a in this.buf) this.buf[a] = Math.max(0, this.buf[a] - dt);
    if (this.sentOff) { this.vx = this.vy = 0; return; }
    if (EF.dev.stamina && this.human !== null) { this.stamina = 1; this.lowStamina = false; }
    if (intent) { if (intent.euphoria) M.tryEuphoria(this.side); for (const a of EF.ACTIONS) if (intent[a].pressed) this.buf[a] = .13; }
    this.stateT += dt;
    // physics of being down, flying or stunned
    if (this.z > 0 || this.vz !== 0) { this.vz -= 640 * dt; this.z += this.vz * dt; if (this.z <= 0) { this.z = 0; this.vz = 0; if (this.state === 'flying') { this.state = 'down'; this.stateT = 0; M.emit('thud', { x: this.x, y: this.y, who: this.id }); } } }
    if (this.state === 'down') { this.downT -= dt; this.vx *= Math.exp(-dt * 5); this.vy *= Math.exp(-dt * 5); if (this.downT <= 0) { this.state = 'run'; this.stateT = 0; this.stun = 0; } this.integrate(dt); return; }
    if (this.state === 'flying') { this.integrate(dt); return; }
    if (this.state === 'diving') { this.vx *= Math.exp(-dt * 4); this.vy *= Math.exp(-dt * 4); this.diveT -= dt; if (this.diveT <= 0) { this.state = 'run'; this.stateT = 0; } this.integrate(dt); return; }
    if (this.state === 'slide') return this.slideStep(dt);
    if (this.state === 'barge') { this.bargeStep(dt); return; }
    if (this.state === 'keeperDive') { this.integrate(dt); this.k.diveT -= dt; if (this.k.diveT <= 0) { this.state = this.k.holding ? 'hold' : 'run'; this.stateT = 0; } return; }
    this.stun = Math.max(0, this.stun - dt);
    if (this.isGK && !this.human && M.mode !== 'penaltyHuman') return this.keeperStep(dt);
    if (this.stun > 0 || !intent) { this.vx = approach(this.vx, 0, 700 * dt); this.vy = approach(this.vy, 0, 700 * dt); this.integrate(dt); return; }
    // ---- run ----
    const mv = intent.move, ml = Math.min(1, Math.hypot(mv[0], mv[1]));
    this.sprinting = intent.sprint && ml > .2 && (!this.lowStamina);
    if (this.sprinting && ml > .2) this.stamina = Math.max(0, this.stamina - T.staminaDrain * dt * (this.M.stadium.snow ? 1.2 : 1) * (M.europhoria && M.europhoria.side === this.side ? .4 : 1));
    else this.stamina = Math.min(1, this.stamina + T.staminaRegen * dt * (M.talkBuff(this.side, 'shoulder') ? 1.25 : 1) * (ml < .2 ? 1.6 : 1));
    if (this.stamina <= .02) this.lowStamina = true; else if (this.stamina > .3) this.lowStamina = false;
    const sp = this.speedMax() * (this.state === 'skill' ? 1.1 : 1);
    const dx = mv[0] / (ml || 1) * ml * sp, dy = mv[1] / (ml || 1) * ml * sp, ac = T.accel * dt * (this.M.stadium.wet ? .85 : 1);
    if (this.state === 'skill') { if (this.stateT > this.actionDur) { this.state = 'run'; this.stateT = 0; this.action = null; } }
    else if (this.state === 'kick') { if (this.stateT > .22) { this.state = 'run'; this.stateT = 0; this.action = null; } }
    else if (this.state === 'air') { if (this.stateT > this.actionDur) { this.state = 'run'; this.stateT = 0; this.action = null; } }
    this.vx = approach(this.vx, dx, ac); this.vy = approach(this.vy, dy, ac);
    if (ml > .25) this.facing = E.approachAng(this.facing, Math.atan2(mv[1], mv[0]), dt * (this.hasBall ? 9 : 13));
    this.integrate(dt);
    this.act(intent, dt);
  }
  integrate(dt) {
    const M = this.M, P = Pitch; this.x += this.vx * dt; this.y += this.vy * dt;
    const lim = this.isGK ? [P.X0 - 6, P.X1 + 6, P.Y0 + 2, P.Y1 - 2] : [P.X0 - 24, P.X1 + 24, P.Y0 - 14, P.Y1 + 14];
    if (this.isGK) { this.x = clamp(this.x, this.side === 0 ? P.X0 - 4 : P.X1 - 120, this.side === 0 ? P.X0 + 120 : P.X1 + 4); this.y = clamp(this.y, lim[2], lim[3]); }
    else { this.x = clamp(this.x, lim[0], lim[1]); this.y = clamp(this.y, lim[2], lim[3]); }
  }
  aimDir(intent) {
    if (intent.aimPoint) return Math.atan2(intent.aimPoint.y - this.y, intent.aimPoint.x - this.x);
    const m = intent.move; return Math.hypot(m[0], m[1]) > .3 ? Math.atan2(m[1], m[0]) : this.facing;
  }
  /** the buttons */
  act(intent, dt) {
    const M = this.M, ball = M.ball, T = EF.T, own = this.hasBall;
    const want = a => this.buf[a] > 0, use = a => { this.buf[a] = 0; };
    if (intent.euphoria) M.tryEuphoria(this.side);
    if (this.state !== 'run' && this.state !== 'skill') return;
    if (own) {
      if (this.state === 'skill') return;
      if (want('pass') && this.cool <= 0) { use('pass'); return this.doPass(intent, false); }
      if (want('through') && this.cool <= 0) { use('through'); return this.doPass(intent, true); }
      if (want('lob') && this.cool <= 0) { use('lob'); return this.doLob(intent); }
      if (want('skill') && this.cool <= 0) { use('skill'); return this.doSkill(intent); }
      if (want('dive')) { use('dive'); return this.doDive(); }
      // the shot: hold to charge, release to shoot
      if (intent.shoot.down) { this.charging = true; this.charge = Math.min(1.6, this.charge + dt / T.chargeTime); }
      else if (this.charging) { this.charging = false; const c = this.charge; this.charge = 0; if (this.cool <= 0) this.doShot(intent, c); }
      return;
    }
    this.charging = false; this.charge = 0;
    const loose = !ball.owner;
    // air moves on a loose ball in reach
    if (loose && this.cool <= 0 && ball.z > 5 && ball.z < 40 && (want('shoot') || want('pass') || want('lob') || want('through'))) {
      const d = Math.hypot(ball.x - this.x, ball.y - this.y);
      if (d < 34) { const a = want('shoot') ? 'shoot' : want('pass') ? 'pass' : 'lob'; if (this.doAir(intent, a, d)) { use(a); return; } }
    }
    if (want('pass') && this.cool <= 0 && this.state === 'run') { use('pass'); return this.doPoke(); }
    if (want('shoot') && this.cool <= 0) { use('shoot'); return this.doSlide(intent); }
    if (want('lob') && this.cool <= 0) { use('lob'); return this.doBarge(intent); }
    if (want('dive')) { use('dive'); return this.doDive(); }
    if (want('through') || want('sw')) { use('through'); use('sw'); M.requestSwitch(this); }
  }
  /* ---- kicks ---- */
  mates() { return this.M.F.filter(f => f.side === this.side && f !== this && !f.sentOff); }
  pickMate(dir, through, aimPoint) {
    let best = null, bs = -9;
    for (const m of this.mates()) {
      if (m.isGK && !this.isGK && Math.hypot(m.x - this.x, m.y - this.y) > 90) continue;
      const a = Math.atan2(m.y - this.y, m.x - this.x), d = Math.hypot(m.x - this.x, m.y - this.y); if (d < 14) continue;
      let s;
      if (aimPoint) s = -Math.hypot(m.x - aimPoint.x, m.y - aimPoint.y) / 40;
      else { const ad = Math.abs(angDiff(a, dir)); if (ad > 1.25) continue; s = Math.cos(ad) * 1.4 - d / 420 + (through ? ((m.x - this.x) * (this.side ? -1 : 1)) / 600 : 0); }
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  }
  inaccuracy(extra = 0) {
    const M = this.M, pr = M.pressure(this), skill = (this.data.pass || 70) / 100, e = (1.05 - skill) * .22 + pr * .05 + extra;
    return (M.rng() - .5) * 2 * e * (this.side === 1 ? 1 / EF.T.aiSkill : 1) * (M.talkBuff(this.side, 'board') ? .8 : 1);
  }
  release(vx, vy, vz, o = {}) {
    const ball = this.M.ball; ball.owner = null; ball.prev = ball.last; ball.last = this; ball.vx = vx; ball.vy = vy; ball.vz = vz; ball.spin = 0; ball.shotBy = null;
    ball.x += Math.cos(this.facing) * 2; ball.y += Math.sin(this.facing) * 2; ball.z = Math.max(ball.z, .1);
    this.cool = o.cool === undefined ? .28 : o.cool; this.state = 'kick'; this.stateT = 0; this.action = o.action || 'pass'; this.actionDur = .25; this.charging = false; this.charge = 0;
    ball.target = o.target || null; ball.passer = o.passer ? this : null; ball.tpass = this.M.t;
  }
  doPass(intent, through) {
    const M = this.M, T = EF.T; let dir = this.aimDir(intent);
    const m = this.pickMate(dir, through, intent.aimPoint || null) || (intent.target && intent.target.side === this.side ? intent.target : null);
    let ta, d, sp;
    if (m) {
      const dd = Math.hypot(m.x - this.x, m.y - this.y); sp = clamp(dd * 1.55 + 110, 170, T.passSpeed * (through ? 1.12 : 1));
      const lead = through ? 62 : (dd / sp) * .8 * Math.hypot(m.vx, m.vy) / Math.max(1, Math.hypot(m.vx, m.vy)); let tx = m.x + m.vx * (dd / sp) * .85, ty = m.y + m.vy * (dd / sp) * .85;
      if (through) { const fx = this.side === 0 ? 1 : -1, ml = Math.hypot(m.vx, m.vy); tx = m.x + (ml > 20 ? m.vx / ml : fx) * 58; ty = m.y + (ml > 20 ? m.vy / ml : 0) * 58; }
      ta = Math.atan2(ty - this.y, tx - this.x);
    } else { ta = dir; sp = T.passSpeed * .85; }
    ta += this.inaccuracy(); this.facing = ta;
    this.release(Math.cos(ta) * sp, Math.sin(ta) * sp, 0, { target: m, passer: true, action: through ? 'through' : 'pass' });
    this.M.ball.passTo = m; M.emit('pass', { who: this.id, side: this.side, x: this.x, y: this.y, to: m ? m.id : -1, through, power: sp / 300 });
    if (intent.sw.down && m) M.oneTwo = { f: this, mate: m, t: M.t };
  }
  doLob(intent) {
    const M = this.M, dir = this.aimDir(intent), fx = this.side === 0 ? 1 : -1, wide = Math.abs(this.y - CY) > 100 && (this.x - CX) * fx > 60;
    let m = this.pickMate(dir, false, intent.aimPoint || null) || (intent.target && intent.target.side === this.side ? intent.target : null), tx, ty;
    if (wide && !m) m = this.mates().filter(f => !f.isGK).sort((a, b) => Math.hypot(a.x - Pitch.goalX(this.side) + fx * 40, a.y - CY) - Math.hypot(b.x - Pitch.goalX(this.side) + fx * 40, b.y - CY))[0];
    if (m) { tx = m.x + m.vx * .5; ty = m.y + m.vy * .5; if (wide) { tx = Pitch.goalX(this.side) - fx * 56; ty = CY + (m.y - CY) * .3; } } else { tx = this.x + Math.cos(dir) * 190; ty = this.y + Math.sin(dir) * 190; }
    tx += (M.rng() - .5) * 20 * (1.05 - (this.data.pass || 70) / 100); ty += (M.rng() - .5) * 20;
    const dd = Math.hypot(tx - this.x, ty - this.y), tf = clamp(dd / 210, .55, 1.25), vz = .5 * Pitch.GRAV * tf, a = Math.atan2(ty - this.y, tx - this.x), sp = dd / tf;
    this.facing = a; this.release(Math.cos(a) * sp, Math.sin(a) * sp, vz, { target: m, passer: true, action: 'lob' });
    M.emit('lob', { who: this.id, side: this.side, x: this.x, y: this.y, cross: wide, to: m ? m.id : -1 });
  }
  /** a shot from the meter (c 0..1.6) */
  doShot(intent, c, forced) {
    const M = this.M, T = EF.T, gx = Pitch.goalX(this.side), fx = this.side === 0 ? 1 : -1, mv = intent.move;
    c = clamp(c, .12, 1.6); const over = c > 1.15, sweet = c > .72 && c < .95;
    let aimY = Math.hypot(mv[0], mv[1]) > .25 ? clamp(mv[1], -1, 1) : (intent.aimPoint ? clamp((intent.aimPoint.y - CY) / GH, -1.1, 1.1) : 0);
    if (intent.aim) aimY = clamp(intent.aim[1], -1, 1);
    let gy = CY + aimY * (GH - 4), a = Math.atan2(gy - this.y, gx - this.x);
    const toGoal = Math.abs(angDiff(a, this.facing)), aimDir = this.aimDir(intent);
    if (toGoal > 1.35 && Math.abs(angDiff(aimDir, a)) > 1.1) a = aimDir;   // a shot the other way is a clearance
    const sup = M.europhoria && M.europhoria.side === this.side && !forced && c > .35;
    let sp = T.shotMin + (T.shotMax - T.shotMin) * Math.min(1, c) * (this.data.shoot ? .75 + this.data.shoot / 280 : 1);
    if (sup) sp *= T.superPower;
    let err = (1.05 - (this.data.shoot || 70) / 100) * .08 + M.pressure(this) * .03 + (over ? .1 : 0) - (sweet ? .04 : 0); if (this.side === 1) err /= T.aiSkill; if (sup) err *= .4;
    a += (M.rng() - .5) * 2 * err;
    let vz = 22 + 120 * Math.min(1, c) * Math.min(1, c) * M.rng() + (over ? 90 : 0);
    if (Pitch.inBox(this.x, this.y, 1 - this.side) === false && Math.hypot(gx - this.x, CY - this.y) > 230) vz += 24;
    this.facing = a; this.release(Math.cos(a) * sp, Math.sin(a) * sp, vz, { action: 'shot', cool: .35 });
    const ball = M.ball; ball.shotBy = this; ball.shotT = 0; ball.shotId = (ball.shotId || 0) + 1; ball.screamer = c > .85 && Math.hypot(gx - this.x, CY - this.y) > 150; this.aftertouch = .5;
    ball.shotAimY = gy;
    if (sup) { const sd = EF.get('super', M.teams[this.side].data.superId) || EF.get('super', 'wobble'); ball.path = { type: sd.path, t: 0, dur: 1.2, ph: M.rng() * 6 }; ball.superT = 1.4; ball.sup = sd; ball.decoys = sd.decoys || 0; M.useEuphoria(this.side); }
    else ball.sup = null;
    M.emit('shot', { who: this.id, side: this.side, x: this.x, y: this.y, power: Math.min(1, c), sweet, sup: !!sup, name: sup ? (EF.get('super', M.teams[this.side].data.superId) || {}).name : '' });
    if (sup) M.emit('superStrike', { who: this.id, side: this.side, x: this.x, y: this.y, name: ball.sup.name, color: ball.sup.color });
  }
  doAir(intent, a, d) {
    const M = this.M, ball = M.ball, gx = Pitch.goalX(this.side), toBall = Math.atan2(ball.y - this.y, ball.x - this.x), behind = Math.abs(angDiff(toBall, this.facing)) > 1.9 && ball.z > 12;
    let kind = ball.z > 15 ? 'header' : 'volley'; if (d > 18 && ball.z < 24) kind = 'divingHeader'; if (behind && a === 'shoot') kind = 'bicycle';
    const fx = this.side === 0 ? 1 : -1;
    if (kind === 'divingHeader') { this.vx += Math.cos(toBall) * 110; this.vy += Math.sin(toBall) * 110; }
    this.facing = kind === 'bicycle' ? Math.atan2(CY - this.y, gx - this.x) : toBall;
    let ta, sp, vz = 20 + M.rng() * 30;
    const dir = this.aimDir(intent);
    if (a === 'shoot') { const gy = CY + clamp(intent.move[1], -1, 1) * (GH - 6); ta = Math.atan2(gy - this.y, gx - this.x) + (M.rng() - .5) * (kind === 'bicycle' ? .25 : .12) * (1.15 - (this.data.shoot || 70) / 100); sp = (kind === 'volley' ? 340 : kind === 'bicycle' ? 360 : 290) * (.85 + (this.data.shoot || 70) / 330); if (kind === 'header' || kind === 'divingHeader') sp *= (this.data.name === 'NORMAN NEEDHAM' ? 1.2 : 1); }
    else { const m = this.pickMate(dir, false, intent.aimPoint || null); ta = m ? Math.atan2(m.y - this.y, m.x - this.x) : this.facing; sp = m ? clamp(Math.hypot(m.x - this.x, m.y - this.y) * 1.6 + 110, 160, 280) : 200; if (a === 'lob') vz = 150; }
    this.release(Math.cos(ta) * sp, Math.sin(ta) * sp, vz, { action: kind, cool: .45, passer: a !== 'shoot', target: null });
    ball.x = this.x + Math.cos(ta) * 4; ball.y = this.y + Math.sin(ta) * 4;
    this.state = 'air'; this.stateT = 0; this.actionDur = kind === 'bicycle' ? .6 : .42; this.jump = .8; this.tilt = kind === 'bicycle' ? 1 : kind === 'divingHeader' ? .8 : 0; this.hopT = this.actionDur;
    if (a === 'shoot') { ball.shotBy = this; ball.shotT = 0; ball.shotId = (ball.shotId || 0) + 1; ball.sup = null; ball.shotAimY = CY; ball.screamer = false; }
    M.emit(kind === 'bicycle' ? 'bicycle' : kind === 'volley' ? 'volley' : 'header', { who: this.id, side: this.side, x: this.x, y: this.y, shot: a === 'shoot' });
    ball.headerBy = this.id; ball.headerT = M.t; ball.headerKind = kind;
    return true;
  }
  /* ---- skill moves ---- */
  doSkill(intent) {
    const M = this.M, mv = intent.move, ml = Math.hypot(mv[0], mv[1]), ball = M.ball;
    const rel = ml > .3 ? angDiff(Math.atan2(mv[1], mv[0]), this.facing) : null;
    const foe = M.F.filter(f => f.side !== this.side && !f.sentOff && f.state !== 'down').map(f => [f, Math.hypot(f.x - this.x, f.y - this.y), Math.abs(angDiff(Math.atan2(f.y - this.y, f.x - this.x), this.facing))]).filter(([, d, a]) => d < 30 && a < .8).sort((a, b) => a[1] - b[1])[0];
    this.state = 'skill'; this.stateT = 0; this.cool = .35; this.immune = .5;
    if (rel !== null && Math.abs(rel) < .8) {
      if (foe) { this.action = 'nutmeg'; this.actionDur = .4; const f = foe[0]; f.stun = .6; f.facing += .1; ball.owner = null; ball.last = this; const a = this.facing; ball.x = this.x + Math.cos(a) * 12; ball.y = this.y + Math.sin(a) * 12; ball.vx = Math.cos(a) * 150; ball.vy = Math.sin(a) * 150; ball.vz = 0; ball.passTo = null; this.vx += Math.cos(a) * 70; this.vy += Math.sin(a) * 70; M.emit('nutmeg', { who: this.id, side: this.side, x: this.x, y: this.y, victim: f.id }); }
      else { this.action = 'rainbow'; this.actionDur = .55; ball.owner = null; ball.last = this; ball.vx = Math.cos(this.facing) * 110; ball.vy = Math.sin(this.facing) * 110; ball.vz = 210; ball.z = 1; this.vx += Math.cos(this.facing) * 60; this.vy += Math.sin(this.facing) * 60; this.cool = .2; M.emit('rainbow', { who: this.id, side: this.side, x: this.x, y: this.y }); }
    } else if (rel !== null && Math.abs(rel) > 2.3) { this.action = 'spin'; this.actionDur = .4; this.facing += Math.PI; this.vx = Math.cos(this.facing) * 70; this.vy = Math.sin(this.facing) * 70; M.emit('skill', { who: this.id, side: this.side, x: this.x, y: this.y, move: 'spin' }); }
    else { this.action = 'stepover'; this.actionDur = .38; this.skillDir = rel !== null ? Math.sign(rel) : (M.rng() < .5 ? 1 : -1); const a = this.facing + this.skillDir * 1.57; this.vx += Math.cos(a) * 95; this.vy += Math.sin(a) * 95; M.emit('skill', { who: this.id, side: this.side, x: this.x, y: this.y, move: 'stepover' }); }
  }
  /* ---- defending ---- */
  doPoke() {
    const M = this.M, o = M.ball.owner; this.state = 'kick'; this.stateT = 0; this.action = 'poke'; this.actionDur = .22; this.cool = .45;
    if (!o || o.side === this.side) return;
    const d = Math.hypot(o.x - this.x, o.y - this.y), ang = Math.abs(angDiff(Math.atan2(o.y - this.y, o.x - this.x), this.facing));
    if (d < 17 && ang < 1.2) M.resolveTackle(this, o, 'poke');
    else { this.cool = .6; }
  }
  doSlide(intent) {
    const T = EF.T; if (this.stamina < .03) return;
    this.state = 'slide'; this.stateT = 0; this.action = 'slide'; this.slideHit = false; this.cool = .9; this.slideDir = Math.hypot(intent.move[0], intent.move[1]) > .3 ? Math.atan2(intent.move[1], intent.move[0]) : this.facing; this.facing = this.slideDir;
    const sp = T.slideSpeed * (this.M.talkBuff(this.side, 'hairdryer') ? 1.1 : 1); this.vx = Math.cos(this.slideDir) * sp; this.vy = Math.sin(this.slideDir) * sp; this.M.emit('slide', { who: this.id, side: this.side, x: this.x, y: this.y });
  }
  slideStep(dt) {
    const M = this.M, ball = M.ball; this.vx *= Math.exp(-dt * 3.2); this.vy *= Math.exp(-dt * 3.2); this.integrate(dt);
    if (!this.slideHit) {
      const o = ball.owner;
      if (o && o.side !== this.side && Math.hypot(o.x - this.x, o.y - this.y) < 13) { this.slideHit = true; M.resolveTackle(this, o, 'slide'); }
      else {
        const v = M.F.find(f => f.side !== this.side && !f.sentOff && f !== o && f.state !== 'down' && f.state !== 'flying' && Math.hypot(f.x - this.x, f.y - this.y) < 11);
        if (v && this.stateT > .05) { this.slideHit = true; M.resolveTackle(this, v, 'slideNoBall'); }
        else if (!o && ball.z < 8 && Math.hypot(ball.x - this.x, ball.y - this.y) < 11) { this.slideHit = true; ball.last = this; ball.vx = Math.cos(this.slideDir) * 170; ball.vy = Math.sin(this.slideDir) * 170; ball.vz = 20; M.emit('clearance', { who: this.id, side: this.side }); M.tackleWon(this, null); }
      }
    }
    if (this.stateT > .42) { this.state = 'down'; this.downT = .35; this.stateT = 0; this.action = 'slideEnd'; }
  }
  doBarge(intent) {
    this.state = 'barge'; this.stateT = 0; this.action = 'barge'; this.slideHit = false; this.cool = .8; const a = Math.hypot(intent.move[0], intent.move[1]) > .3 ? Math.atan2(intent.move[1], intent.move[0]) : this.facing; this.facing = a; this.vx = Math.cos(a) * 150; this.vy = Math.sin(a) * 150; this.M.emit('barge', { who: this.id, side: this.side, x: this.x, y: this.y });
  }
  bargeStep(dt) {
    const M = this.M; this.vx *= Math.exp(-dt * 3); this.vy *= Math.exp(-dt * 3); this.integrate(dt);
    if (!this.slideHit) { const v = M.F.find(f => f.side !== this.side && !f.sentOff && f.state !== 'down' && f.state !== 'flying' && Math.hypot(f.x - this.x, f.y - this.y) < 12); if (v) { this.slideHit = true; M.resolveTackle(this, v, 'barge'); } }
    if (this.stateT > .3) { this.state = 'run'; this.stateT = 0; this.action = null; }
  }
  doDive() {
    const M = this.M; if (this.diveT > 0) return; this.state = 'diving'; this.diveT = 1.1; this.stateT = 0; this.action = 'dive'; this.cool = .5; M.resolveDive(this);
  }
  knock(from, power) {
    const T = EF.T, a = Math.atan2(this.y - from.y, this.x - from.x); this.state = 'flying'; this.stateT = 0; this.downT = 1.15; this.vx = Math.cos(a) * 120 * power; this.vy = Math.sin(a) * 120 * power; this.vz = 150 * power * T.knockAir; this.z = Math.max(this.z, .1); this.charging = false; this.charge = 0;
  }
  /* ---- the keeper (AI) ---- */
  keeperStep(dt) {
    const M = this.M, ball = M.ball, k = this.k, P = Pitch, gx = P.ownGoalX(this.side), dir = this.side === 0 ? 1 : -1, T = EF.T;
    const reach = 24 * T.keeperReach * (this.data.boss ? 1.4 : 1) * (this.data.size ? Math.sqrt(this.data.size) : 1) * .9;
    if (this.state === 'hold') {
      k.holdT -= dt; ball.x = this.x + dir * 6; ball.y = this.y; ball.z = 10; this.vx = this.vy = 0; this.stateT += dt;
      if (this.human && M.humanCtl(this.human)) return;
      if (k.holdT <= 0) this.distribute();
      return;
    }
    let tx, ty;
    const bd = Math.hypot(ball.x - gx, ball.y - CY), shotNow = ball.shotBy && ball.shotBy.side !== this.side && ball.shotT < 1.6;
    // incoming shot?
    if (!ball.owner && (Math.abs(ball.vx) > 80) && ((ball.vx * dir) < 0)) {
      const t = (gx - ball.x) / ball.vx;
      if (t > 0 && t < 1.2) {
        const yy = ball.y + ball.vy * t, zz = ball.z + ball.vz * t - .5 * P.GRAV * t * t;
        if (Math.abs(yy - CY) < GH + 14 && zz < P.BAR + 14 && zz > -4 && ball.shotId !== k.shotId && ball.speed() > 120) { k.shotId = ball.shotId; this.decideSave(t, yy, Math.max(0, zz)); }
      }
    }
    if (k.outcome && (ball.owner || ball.shotId !== k.shotId)) k.outcome = null;
    if (k.outcome) {
      // dive toward the ball's arrival, then act when it is within reach
      this.state = 'keeperDive'; k.diveT = .55; const tdx = k.tx - this.x, tdy = k.ty - this.y, d = Math.hypot(tdx, tdy) || 1, sp = 260 * T.keeperSkill; this.vx = tdx / d * Math.min(sp, d * 6); this.vy = tdy / d * Math.min(sp, d * 6); this.facing = Math.atan2(k.ty - CY, dir * 40) * 0 + (dir > 0 ? 0 : Math.PI);
      this.tilt = Math.sign(k.ty - this.y) || 1; k.dived = true; this.hopT = .5; M.emit('keeperDive', { who: this.id, side: this.side });
      return;
    }
    // positioning: on the line between the ball and the goal centre
    const bx = ball.x, by = ball.y, adv = clamp(bd * .17, 5, 40);
    tx = gx + dir * adv; ty = CY + (by - CY) * clamp(adv * .016 + .52, .45, .95); ty = clamp(ty, CY - GH + 6, CY + GH - 6);
    // sweep: a loose ball in the box closer to the keeper than anyone
    if (!ball.owner && Pitch.inBox(ball.x, ball.y, this.side) && ball.z < 20 && ball.speed() < 140 && M.nearestTo(ball.x, ball.y, f => !f.isGK && !f.sentOff) && this.canClaim()) { tx = ball.x; ty = ball.y; }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy), sp = 78 * (.8 + this.data.keep / 220) * T.keeperSkill;
    this.vx = approach(this.vx, d > 3 ? dx / d * Math.min(sp, d * 6) : 0, 900 * dt); this.vy = approach(this.vy, d > 3 ? dy / d * Math.min(sp, d * 6) : 0, 900 * dt); this.facing = E.approachAng(this.facing, Math.atan2(ball.y - this.y, ball.x - this.x), dt * 8); this.integrate(dt);
    // claim a loose ball
    if (!ball.owner && ball.z < 22 && M.mode === 'play' && Math.hypot(ball.x - this.x, ball.y - this.y) < 11 && ball.speed() < 190 && this.cool <= 0 && !(ball.last === this && ball.passTo)) this.catchBall(false);
  }
  canClaim() { const M = this.M, b = M.ball; const mine = Math.hypot(b.x - this.x, b.y - this.y); return !M.F.some(f => f.side !== this.side && !f.sentOff && Math.hypot(b.x - f.x, b.y - f.y) < mine * .8); }
  decideSave(t, yy, zz) {
    const M = this.M, k = this.k, T = EF.T, ball = M.ball, skill = (this.data.keep || 60) / 100 * T.keeperSkill, reach = 24 * T.keeperReach * (this.data.boss ? 1.5 : 1) * Math.sqrt(this.data.size || 1) * .9;
    const dist = Math.abs(yy - this.y), sp = ball.speed();
    let eff = reach * (.55 + skill * .6) + 10; if (ball.sup) eff *= .72; if (sp > 380) eff *= .9; if (this.data.boss && sp < 300) eff = 999;
    const catchable = sp < 270 * (.7 + skill * .5) && zz < 26, onFrame = Math.abs(yy - CY) < GH - 1 && zz < Pitch.BAR;
    k.tx = this.x + (this.side === 0 ? 1 : -1) * 3; k.ty = clamp(yy, CY - GH + 4, CY + GH - 4); k.tz = zz;
    if (!onFrame) { k.outcome = 'miss'; k.ty = clamp(yy, CY - GH + 6, CY + GH - 6); return; }
    if (dist > eff + 2) k.outcome = 'beat'; else if (catchable && dist < eff * .7) k.outcome = 'catch'; else k.outcome = 'parry';
    k.eta = M.t + t;
    // a super strike goes to the Save Duel: the outcome is the duel's
    if (ball.sup && onFrame) { k.outcome = null; M.startDuel(this, ball, t, k); }
  }
  /** called by the Match each step: the ball reaches the keeper's hands */
  keeperContact() {
    const M = this.M, ball = M.ball, k = this.k; if (!k.outcome || ball.owner) return;
    const d = Math.hypot(ball.x - this.x, ball.y - this.y), dz = Math.abs(ball.z - 12);
    if (d < 20 + (this.data.boss ? 12 : 0) && (dz < 26 || k.outcome === 'parry')) {
      const o = k.outcome; k.outcome = null;
      if (o === 'catch') { this.catchBall(true); }
      else if (o === 'parry') { const dir = this.side === 0 ? 1 : -1; const up = ball.y < this.y ? -1 : 1; ball.vx = dir * (80 + M.rng() * 90); ball.vy = up * (60 + M.rng() * 130) * (M.rng() < .5 ? 1 : -1); ball.vz = 60 + M.rng() * 80; ball.spin = 0; ball.path = null; ball.last = this; ball.shotBy = null; ball.sup = null; M.emit('save', { who: this.id, side: this.side, x: this.x, y: this.y, parry: true, shooter: ball.lastShooter }); M.afterSave(this, false); }
    }
  }
  catchBall(forced) {
    const M = this.M, ball = M.ball, dir = this.side === 0 ? 1 : -1; ball.owner = this; ball.prev = ball.last; ball.last = this; ball.path = null; ball.spin = 0; ball.vx = ball.vy = ball.vz = 0; ball.passTo = null;
    this.state = 'hold'; this.stateT = 0; this.k.holdT = 1.2 + M.rng() * .8; this.facing = dir > 0 ? 0 : Math.PI; this.vx = this.vy = 0;
    if (forced || (ball.shotBy && ball.shotBy.side !== this.side)) M.emit('save', { who: this.id, side: this.side, x: this.x, y: this.y, parry: false, catch: true, shooter: ball.shotBy ? ball.shotBy.id : -1 });
    ball.shotBy = null; ball.sup = null; M.afterSave(this, true);
  }
  distribute() {
    const M = this.M, ball = M.ball, tac = EF.get('tactic', M.teams[this.side].data.tactic), dir = this.side === 0 ? 1 : -1;
    const mates = this.mates().filter(f => !f.isGK); let tgt = null;
    if (M.rng() < (tac.longBall || .1) + .1) { // long kick
      tgt = mates.sort((a, b) => (b.x - a.x) * dir)[0]; const tx = tgt ? tgt.x : this.x + dir * 280, ty = tgt ? tgt.y : CY; const dd = Math.hypot(tx - this.x, ty - this.y), tf = clamp(dd / 240, .8, 1.5), a = Math.atan2(ty - this.y, tx - this.x);
      ball.owner = null; ball.vx = Math.cos(a) * dd / tf; ball.vy = Math.sin(a) * dd / tf; ball.vz = .5 * Pitch.GRAV * tf; ball.last = this; ball.passTo = tgt; this.cool = .5; M.emit('goalKick', { who: this.id, side: this.side, long: true });
    } else {
      tgt = mates.filter(f => Math.hypot(f.x - this.x, f.y - this.y) < 220).sort((a, b) => M.openness(b) - M.openness(a))[0] || mates[0]; const a = Math.atan2(tgt.y - this.y, tgt.x - this.x), dd = Math.hypot(tgt.x - this.x, tgt.y - this.y);
      ball.owner = null; ball.vx = Math.cos(a) * clamp(dd * 1.5 + 100, 160, 240); ball.vy = Math.sin(a) * clamp(dd * 1.5 + 100, 160, 240); ball.vz = 0; ball.last = this; ball.passTo = tgt; this.cool = .5; M.emit('throw', { who: this.id, side: this.side });
    }
    ball.target = tgt; ball.tpass = M.t; ball.passer = this; this.state = 'run'; this.stateT = 0;
  }
};

//# sourceURL=ef/12-match.js
/* ============ 12-match: the simulation: rules, referee, euphoria, set pieces, flow ============ */
EF.Match = class Match {
  constructor(o = {}) {
    this.o = o; this.seed = o.seed === undefined ? (EF.query.seed ? +EF.query.seed : 1337) : o.seed; this.rng = E.rng(this.seed);
    this.home = o.home || 'kip'; this.away = o.away || 'hoo'; this.stadiumId = o.stadium || (EF.get('team', this.home).stadium);
    this.stadium = EF.get('stadium', this.stadiumId) || EF.get('stadium', 'rec'); this.refData = EF.get('referee', o.ref || 'haltwhistle');
    this.rules = Object.assign({ needWinner: false, euphoria: true, shootoutOnly: false, training: false, halfSecs: EF.T.halfSecs, pure: false, aiOnly: false }, o.rules || {});
    this.halfSecs = this.rules.halfSecs; this.ball = new EF.Ball(); this.F = []; this.teams = []; this.t = 0; this.talk = o.talk || null; this.aiSpeed = 1; this.events = []; this.stats = [0, 1].map(() => this.newStats());
    for (const side of [0, 1]) {
      const id = side === 0 ? this.home : this.away, data = EF.get('team', id), kitKey = (side === 1 && o.awayKit) ? 'away' : 'kit', kit = (kitKey === 'away' && data.away) ? data.away : data.kit;
      const fm = EF.get('formation', (side === 0 && o.formation) ? o.formation : data.formation); const team = { id, data, kit, formation: fm, F: [], down: 0 };
      data.players.forEach((pd, i) => { const f = new EF.Footballer(this, side, i, pd, fm.slots[i][0]); team.F.push(f); this.F.push(f); });
      this.teams.push(team);
    }
    // the second team wears its away kit if the colours are too close
    if (this.teams[0].kit.cloth === this.teams[1].kit.cloth) this.teams[1].kit = this.teams[1].data.away || this.teams[1].kit;
    this.score = [0, 0]; this.half = 1; this.clock = 0; this.extra = false; this.golden = false; this.mode = 'kickoff'; this.modeT = 0; this.restartSide = 0; this.eu = [this.talk === 'shoulder' ? .15 : (o.euStart || 0), 0]; this.europhoria = null; this.euFull = [false, false];
    this.sp = null; this.adv = null; this.var = null; this.duel = null; this.slow = 1; this.shoot = null; this.suspect = [-99, -99]; this.refCard = null; this.fxEnts = []; this.nextEvent = 22 + this.rng() * 14; this.humans = []; this.frames = []; this.frameT = 0; this.replay = null; this.goals = []; this.oneTwo = null;
    this.ref = { x: Pitch.CX, y: Pitch.CY + 40, vx: 0, vy: 0, facing: 0, arm: 0 }; this.kickHold = 0; this.lastWhistle = 0; this.over = false; this.result = null; this.cheat = o.cheat || null; this.penaltyLive = false; this.duelSlow = 1;
    this.aiSpeed = o.aiSpeed || 1; if (EF.game && EF.game.settings) { const d = EF.game.settings.difficulty; if (!o.aiSpeed && !this.rules.training) this.aiSpeed = d === 'easy' ? .93 : d === 'hard' ? 1.05 : 1; }
    this.minutesShown = 0;
    if (this.rules.shootoutOnly) { this.startShootout(); } else this.kickoff(0, true);
  }
  newStats() { return { shots: 0, onTarget: 0, passes: 0, passesDone: 0, tackles: 0, fouls: 0, corners: 0, poss: 0, saves: 0, cards: 0, goals: 0, headerGoals: 0, nutmegs: 0, fkGoals: 0, superGoals: 0, busGoals: 0, supers: 0, skills: 0, dives: 0 }; }
  emit(type, data = {}) {
    const st = data.side !== undefined ? this.stats[data.side] : null;
    if (st) { if (type === 'shot') { st.shots++; this.pendingShot = { side: data.side, t: this.t }; } else if (type === 'pass' || type === 'lob') st.passes++; else if (type === 'skill' || type === 'rainbow' || type === 'nutmeg') { st.skills++; if (type === 'nutmeg') st.nutmegs++; this.addEu(data.side, type === 'nutmeg' ? .1 : .04, 'skill'); } else if (type === 'header' || type === 'volley' || type === 'bicycle') { this.addEu(data.side, .05); } }
    if (type === 'save' && data.shooter !== undefined && data.shooter >= 0 && this.F[data.shooter]) this.stats[this.F[data.shooter].side].onTarget++;
    if (type === 'goal' && !data.own) this.stats[data.side].onTarget++;
    data.t = +this.t.toFixed(2); this.seq = (this.seq || 0) + 1; this.events.push(Object.assign({ type, seq: this.seq }, data)); if (this.events.length > 60) this.events.shift(); EF.bus.emit(type, Object.assign({ match: this }, data)); }
  talkBuff(side, id) { return side === 0 && this.talk === id; }
  get minute() { const per = this.extra ? 15 : 45, base = this.extra ? 90 : this.half === 2 ? 45 : 0; return base + Math.min(per, Math.floor(this.clock / (this.extra ? this.halfSecs * .5 : this.halfSecs) * per)); }
  /* ---------- helpers ---------- */
  pressure(f) { let n = 0; for (const o of this.F) if (o.side !== f.side && !o.sentOff && Math.hypot(o.x - f.x, o.y - f.y) < 32) n++; return Math.min(3, n); }
  openness(f) { let m = 99; for (const o of this.F) if (o.side !== f.side && !o.sentOff) m = Math.min(m, Math.hypot(o.x - f.x, o.y - f.y)); return m; }
  nearestTo(x, y, pred) { let b = null, bd = 1e9; for (const f of this.F) { if (f.sentOff || (pred && !pred(f))) continue; const d = Math.hypot(f.x - x, f.y - y); if (d < bd) { bd = d; b = f; } } return b; }
  other(side) { return 1 - side; }
  /* ---------- euphoria ---------- */
  addEu(side, amt, why) {
    if (!this.rules.euphoria || this.europhoria && this.europhoria.side === side) return; const T = EF.T, was = this.eu[side];
    this.eu[side] = clamp(was + amt * T.euphGain * (this.cheat && this.cheat.euphoria && (this.cheat.side === undefined || this.cheat.side === side) ? this.cheat.euphoria : 1), 0, 1);
    if (this.eu[side] >= 1 && !this.euFull[side]) { this.euFull[side] = true; this.emit('euphoriaFull', { side }); }
  }
  tryEuphoria(side) {
    if (!this.rules.euphoria || this.europhoria || this.eu[side] < 1) return false; if (!['play', 'setpiece'].includes(this.mode)) return false;
    this.europhoria = { side, t: EF.T.europhoriaSecs }; this.emit('europhoria', { side }); return true;
  }
  useEuphoria(side) { this.stats[side].supers++; this.eu[side] = 0; this.euFull[side] = false; if (this.europhoria) this.europhoria.t = Math.min(this.europhoria.t, .6); }
  /* ---------- tackles, fouls, cards ---------- */
  resolveTackle(f, o, kind) {
    const M = this, T = EF.T, rng = this.rng, ref = this.refData, ball = this.ball;
    if (o.immune > 0 && kind !== 'slideNoBall') { f.cool = Math.max(f.cool, .5); M.emit('tackleFailed', { who: f.id, side: f.side, x: o.x, y: o.y, victim: o.id }); return; }
    const hasBall = ball.owner === o, behind = Math.abs(angDiff(f.facing, o.facing)) < 1.0;
    let win = {poke: .5, slide: .72, barge: .5, slideNoBall: 0}[kind] * T.tackleStrength * (.7 + (f.data.tackle || 70) / 150) / (.8 + (o.data.skill || 70) / 250) * (M.europhoria && M.europhoria.side === f.side ? 1.2 : 1) * (M.talkBuff(f.side, 'hairdryer') && M.minute < 15 ? 1.1 : 1) * (hasBall ? 1 : 0);
    if (f.side === 1) win *= T.aiSkill;
    let foulP = ({ poke: .06, slide: .28, barge: .16, slideNoBall: .85 }[kind]) * T.foulChance * ref.strict * (behind ? 2.1 : 1) * (kind === 'barge' && o.isGK ? 2 : 1);
    const won = rng() < win; foulP *= won ? .5 : 1.3;
    if (!hasBall && kind !== 'slideNoBall') foulP *= .9;
    // physical effects
    if (kind === 'barge') { const a = Math.atan2(o.y - f.y, o.x - f.x), m = 150 * (f.data.weight || 70) / (o.data.weight || 70); o.vx += Math.cos(a) * m; o.vy += Math.sin(a) * m; }
    if (rng() < foulP) { this.callFoul(f, o, clamp(.3 + (kind === 'slide' || kind === 'slideNoBall' ? .4 : kind === 'barge' ? .25 : 0) + (behind ? .25 : 0) + rng() * .2, 0, 1), kind); if (kind !== 'poke') o.knock(f, kind === 'slideNoBall' ? .9 : .6); return; }
    if (hasBall && won) {
      this.suspect[f.side] = kind === 'slide' ? this.t : this.suspect[f.side];
      if (kind === 'slide') { o.knock(f, 1); ball.owner = null; ball.last = f; const a = f.facing; ball.vx = Math.cos(a) * 110 + o.vx * .2; ball.vy = Math.sin(a) * 110 + o.vy * .2; ball.vz = 55; ball.z = 2; f.cool = .2; M.emit('knockdown', { who: o.id, side: o.side, x: o.x, y: o.y, by: f.id }); }
      else if (kind === 'barge') { ball.owner = null; ball.last = f; const a = Math.atan2(o.y - f.y, o.x - f.x); ball.vx = Math.cos(a) * 100; ball.vy = Math.sin(a) * 100; ball.vz = 30; ball.z = 2; o.stun = .35; }
      else { ball.owner = f; ball.last = f; ball.vx = ball.vy = 0; o.stun = .3; f.cool = .15; }
      this.tackleWon(f, o);
    } else { f.cool = Math.max(f.cool, kind === 'poke' ? .5 : .3); if (kind === 'poke') f.stun = .22; M.emit('tackleFailed', { who: f.id, side: f.side, x: o.x, y: o.y, victim: o.id }); }
  }
  tackleWon(f, o) { this.stats[f.side].tackles++; this.addEu(f.side, .045, 'tackle'); this.emit('tackleWon', { who: f.id, side: f.side, x: f.x, y: f.y, victim: o ? o.id : -1 }); }
  callFoul(off, vic, sev, kind) {
    const M = this, ball = this.ball, ref = this.refData, rng = this.rng; if (!['play'].includes(this.mode)) return;
    this.stats[off.side].fouls++;
    const inBox = Pitch.inBox(vic.x, vic.y, off.side), spot = { x: vic.x, y: vic.y };
    // advantage: the fouled side has the ball or is about to
    const vicHas = ball.owner && ball.owner.side === vic.side || (!ball.owner && Math.hypot(ball.x - vic.x, ball.y - vic.y) < 50 && ball.last && ball.last.side === vic.side);
    if (vicHas && sev < .8 && !inBox && !this.adv && this.rules.advantage !== false && (Pitch.goalX(vic.side) - vic.x) * (vic.side ? -1 : 1) > -400) {
      this.adv = { side: vic.side, t: 2.2, off, vic, spot, sev, kind }; this.suspect[off.side] = this.t; this.emit('advantage', { side: vic.side, who: off.id, x: vic.x, y: vic.y }); return;
    }
    this.punish(off, vic, sev, kind, spot, inBox);
  }
  punish(off, vic, sev, kind, spot, inBox) {
    const ref = this.refData, rng = this.rng; this.adv = null;
    this.emit('foul', { side: off.side, who: off.id, victim: vic.id, x: spot.x, y: spot.y, kind, sev });
    // cards
    let card = null; const p = clamp(sev * .55 * ref.strict + ((off.data.temper || 40) - 50) / 400 + (this.europhoria && this.europhoria.side === off.side ? .05 : 0), 0, .95);
    if (sev > .85 && rng() < .3 * ref.strict) card = 'red'; else if (rng() < p) card = 'yellow';
    if (card) { if (card === 'yellow' && off.cards >= 1) card = 'red'; this.giveCard(off, card); }
    if (inBox && !(this.stats && this.rules.training && !this.rules.penaltiesInTraining)) { this.awardPenalty(off, vic, sev); }
    else this.setPiece('freekick', vic.side, spot.x, spot.y, { foulBy: off.id });
  }
  giveCard(f, color) {
    this.refCard = { color, who: f.id, t: 2.4 }; this.stats[f.side].cards++;
    if (color === 'yellow') f.cards++; else { f.cards = 2; }
    this.emit('card', { who: f.id, side: f.side, color, x: f.x, y: f.y });
    if (color === 'red') { f.sentOff = true; this.teams[f.side].down++; f.x = f.side === 0 ? Pitch.X0 - 20 : Pitch.X1 + 20; f.y = Pitch.Y1 + 30; if (this.ball.owner === f) this.ball.owner = null; this.emit('sendOff', { who: f.id, side: f.side }); }
  }
  awardPenalty(off, vic, sev) {
    const side = vic.side, rng = this.rng; this.emit('penaltyAwarded', { side, who: vic.id, foul: off.id });
    const marginal = sev < .5 && this.refData.varHappy * EF.T.varChance > rng() * .7;
    this.pendingPen = { side, vic, marginal };
    this.startVar('penalty', () => this.setPiece('penalty', side, 0, 0, { taker: vic }), () => { this.emit('varDecision', { overturned: true, kind: 'penalty' }); this.setPiece('goalkick', 1 - side, 0, 0); }, marginal ? .9 : 0);
  }
  resolveDive(f) {
    const ref = this.refData, rng = this.rng, o = this.F.find(g => g.side !== f.side && !g.sentOff && Math.hypot(g.x - f.x, g.y - f.y) < 18 && g.state !== 'down'), ball = this.ball;
    this.stats[f.side].dives++; this.emit('dive', { who: f.id, side: f.side, x: f.x, y: f.y, contact: !!o });
    if (ball.owner === f) { ball.owner = null; ball.last = f; ball.vx = f.vx * .4; ball.vy = f.vy * .4; ball.vz = 0; f.cool = .6; }
    if (this.mode !== 'play') return;
    if (o) {
      const buy = .25 + ref.gull * .9 + (f.data.diver ? .15 : 0);
      if (rng() < buy) { this.emit('diveWon', { who: f.id, side: f.side }); this.punish(o, f, .4, 'dive', { x: f.x, y: f.y }, Pitch.inBox(f.x, f.y, o.side)); return; }
    }
    const book = (o ? .3 : .88) * ref.strict;
    if (rng() < book) { this.giveCard(f, f.cards >= 1 ? 'red' : 'yellow'); this.emit('diveBooked', { who: f.id, side: f.side }); this.setPiece('freekick', 1 - f.side, f.x, f.y, { indirect: true }); }
  }
  /* ---------- VAR ---------- */
  startVar(kind, onStand, onOver, forceP) {
    const ref = this.refData; let p = forceP !== undefined && forceP > 0 ? forceP : EF.T.varChance * (.4 + ref.varHappy);
    if (kind === 'goal') p *= (this.suspect[this.lastGoalSide] > this.t - 9 ? 1.8 : .2);
    const over = this.rng() < p; this.var = { kind, t: 0, dur: 2.9, over, onStand, onOver }; this.prevMode = this.mode; this.mode = 'var'; this.modeT = 0; this.emit('var', { kind });
  }
  /* ---------- the Save Duel ---------- */
  startDuel(keeper, ball, t, k) {
    if (this.duel || this.rules.noDuel) { k.outcome = 'beat'; return; }
    this.duel = { t: 0, dur: 1.0 * EF.T.duelWindow, keeper, side: keeper.side, press: null, q: null, k, eta: t }; this.emit('saveDuel', { side: keeper.side, who: keeper.id });
  }
  duelStep(dt) {
    const d = this.duel; d.t += dt; this.slow = d.done ? this.slow : .28;
    // a human defender pressing any face button: the ring's sweet spot is at 70%
    if (d.press === null) for (const h of this.humans) if (h.side === d.side && h.ctl && h.ctl.anyFace && h.ctl.anyFace()) { d.press = d.t; }
    const aiPress = d.aiAt === undefined ? (d.aiAt = d.dur * (.45 + this.rng() * .55 * (1.2 - Math.min(1, EF.T.aiSkill * .6)))) : d.aiAt;
    if (d.press === null && !this.humans.some(h => h.side === d.side) && d.t >= aiPress) d.press = d.t;
    if (d.press !== null || d.t >= d.dur) {
      const sweet = d.dur * .68, err = d.press === null ? 1 : Math.abs(d.press - sweet) / (d.dur * .32); d.q = clamp(1 - err, 0, 1);
      const human = this.humans.some(h => h.side === d.side); const need = human ? .45 : .5 / Math.max(.5, EF.T.aiSkill * .9);
      const save = d.q >= (human ? .45 : need) ; d.done = true; this.slow = 1; const k = d.k; k.outcome = save ? (d.q > .8 ? 'catch' : 'parry') : 'beat'; d.keeper.k.shotId = this.ball.shotId;
      if (!save) { k.ty = clamp(this.ball.shotAimY || Pitch.CY, Pitch.CY - Pitch.GH + 4, Pitch.CY + Pitch.GH - 4); } 
      this.emit('saveDuelResult', { side: d.side, save, q: d.q, perfect: d.q > .8 }); this.duelResult = { save, q: d.q, t: this.t }; this.duel = null;
    }
  }
  afterSave(keeper, held) { const s = keeper.side; this.stats[s].saves++; this.addEu(s, held ? .07 : .06, 'save'); if (this.ball.sup) this.ball.sup = null; this.slow = 1; this.duel = null; }
  /* ---------- humans ---------- */
  humanCtl(idx) { const h = this.humans.find(h => h.idx === idx); return h && h.ctl; }
  addHuman(idx, side, ctl, opts = {}) { const h = Object.assign({ idx, side, ctl, f: null, auto: true, swT: 0 }, opts); this.humans.push(h); return h; }
  claimed(except) { const s = new Set(); for (const h of this.humans) if (h !== except && h.f) s.add(h.f); return s; }
  assignHumans(dt) {
    const ball = this.ball;
    for (const h of this.humans) {
      h.swT = Math.max(0, h.swT - dt); const used = this.claimed(h), mates = this.F.filter(f => f.side === h.side && !f.sentOff && (!f.isGK || this.mode === 'penaltyHuman') && !used.has(f));
      if (!mates.length) { h.f = null; continue; }
      if (h.f && (h.f.sentOff || used.has(h.f) || (h.f.isGK && this.mode !== 'penaltyHuman'))) h.f = null;
      const dist = f => Math.hypot(f.x - ball.x, f.y - ball.y);
      if (this.mode === 'setpiece' && this.sp && this.sp.taker && this.sp.taker.side === h.side && !this.sp.taker.isGK) { if (!used.has(this.sp.taker)) h.f = this.sp.taker; continue; }
      if (this.mode === 'penaltyHuman' && this.shootoutHuman) { h.f = this.shootoutHuman(h.side) || h.f; continue; }
      if (!h.f) { h.f = mates.sort((a, b) => dist(a) - dist(b))[0]; continue; }
      if (h.manual) { if (h.f && ball.owner && ball.owner.side === h.side) h.manual = false; else continue; }
      if (h.auto && h.swT <= 0) {
        if (ball.owner && ball.owner.side === h.side && ball.owner !== h.f && mates.includes(ball.owner)) { h.f = ball.owner; h.swT = .5; }
        else if (!ball.owner || ball.owner.side !== h.side) { const n = mates.sort((a, b) => dist(a) - dist(b))[0]; if (n && n !== h.f && dist(h.f) - dist(n) > 22) { h.f = n; h.swT = .6; } }
      }
    }
    for (const f of this.F) f.human = null; for (const h of this.humans) if (h.f) h.f.human = h.idx;
  }
  requestSwitch(f) {
    const h = this.humans.find(h => h.f === f); if (!h) return; const used = this.claimed(h), ball = this.ball;
    const c = this.F.filter(g => g.side === h.side && !g.sentOff && !g.isGK && g !== f && !used.has(g)).sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0];
    if (c) { h.f = c; h.swT = 1.2; h.manual = true; this.emit('switch', { side: h.side, who: c.id }); }
  }
  intentFor(f) {
    if (f.human !== null) { const h = this.humans.find(h => h.idx === f.human); if (h && h.ctl) return h.ctl.read(f, this); }
    return EF.AI.intent(this, f);
  }
  /* ---------- restarts ---------- */
  formationSpot(f, attacking) { return EF.AI.spot(this, f); }
  kickoff(side, first) {
    const P = Pitch, ball = this.ball; this.restartSide = side; ball.stop(); ball.owner = null; ball.x = P.CX; ball.y = P.CY; ball.z = 0; ball.last = null; ball.fk = -1; ball.sup = null; ball.shotBy = null; ball.passTo = null; this.adv = null; this.sp = null; this.penaltyLive = false;
    for (const f of this.F) {
      if (f.sentOff) continue; const dir = f.side === 0 ? -1 : 1; const s = EF.AI.baseSpot(this, f, 'kickoff');
      f.x = s[0]; f.y = s[1]; f.vx = f.vy = 0; f.state = 'run'; f.stateT = 0; f.z = 0; f.vz = 0; f.stun = 0; f.cool = 0; f.charging = false; f.charge = 0; f.action = null; f.tilt = 0; f.facing = f.side === 0 ? 0 : Math.PI; f.celebrate = 0; f.k.outcome = null; f.k.holding = false; f.immune = 0;
    }
    const taker = this.F.filter(f => f.side === side && !f.sentOff && !f.isGK).sort((a, b) => b.data.pass - a.data.pass)[0]; taker.x = P.CX - (side === 0 ? 8 : -8); taker.y = P.CY; ball.owner = null; this.kickTaker = taker;
    this.mode = 'kickoff'; this.modeT = 0; this.kickHold = 0; this.duel = null; this.slow = 1; this.var = null; this.emit('kickoffSet', { side, first: !!first });
  }
  /** a restart: type 'throwin' | 'goalkick' | 'corner' | 'freekick' | 'penalty' */
  setPiece(type, side, x, y, o = {}) {
    const P = Pitch, ball = this.ball, rng = this.rng; const dirIn = side === 0 ? 1 : -1;
    if (type === 'goalkick') { x = side === 0 ? P.X0 + 28 : P.X1 - 28; y = P.CY + (rng() - .5) * 40; }
    if (type === 'corner') { x = o.right ? P.X1 : P.X0; y = o.low ? P.Y1 : P.Y0; }
    if (type === 'throwin') { y = y < P.CY ? P.Y0 : P.Y1; x = clamp(x, P.X0 + 8, P.X1 - 8); }
    if (type === 'penalty') { x = side === 0 ? P.X1 - P.SPOT : P.X0 + P.SPOT; y = P.CY; }
    if (type === 'freekick') { x = clamp(x, P.X0 + 6, P.X1 - 6); y = clamp(y, P.Y0 + 6, P.Y1 - 6); }
    this.adv = null; ball.stop(); ball.owner = null; ball.x = x; ball.y = y; ball.z = 0; ball.sup = null; ball.shotBy = null; ball.path = null; ball.passTo = null;
    let taker;
    if (type === 'goalkick') taker = this.F.find(f => f.side === side && f.isGK && !f.sentOff);
    else if (type === 'penalty') taker = o.taker && !o.taker.sentOff ? o.taker : this.F.filter(f => f.side === side && !f.sentOff && !f.isGK).sort((a, b) => b.data.shoot - a.data.shoot)[0];
    else taker = this.nearestTo(x, y, f => f.side === side && !f.sentOff && !f.isGK && f !== (o.excl || null));
    this.sp = { type, side, x, y, t: 0, taker, wait: type === 'penalty' ? 2.4 : type === 'freekick' ? 1.8 : type === 'throwin' ? 1.1 : 1.5, foulBy: o.foulBy, indirect: o.indirect, human: false };
    if (type === 'corner') this.stats[side].corners++;
    const away = type === 'throwin' ? (y < P.CY ? -1 : 1) * 5 : 0;
    taker.state = 'run'; taker.z = 0; taker.vz = 0; taker.stateT = 0; taker.stun = 0; taker.downT = 0; taker.celebrate = 0;
    taker.x = x - (type === 'throwin' || type === 'corner' ? 0 : dirIn * 8); taker.y = y + (type === 'throwin' ? away : type === 'corner' ? (y < P.CY ? -4 : 4) : 0); taker.vx = taker.vy = 0; taker.state = 'run'; taker.stateT = 0; taker.cool = 0;
    taker.facing = type === 'throwin' ? (y < P.CY ? Math.PI / 2 : -Math.PI / 2) : type === 'corner' ? Math.atan2(P.CY - y, P.goalX(side) - 30 * dirIn - x) : dirIn > 0 ? 0 : Math.PI;
    if (type === 'penalty') taker.facing = dirIn > 0 ? 0 : Math.PI;
    ball.x = taker.x + Math.cos(taker.facing) * 7; ball.y = taker.y + Math.sin(taker.facing) * 7; ball.owner = taker;
    this.mode = 'setpiece'; this.modeT = 0; this.sp.human = this.humans.some(h => h.side === side);
    // players to their places
    for (const f of this.F) {
      if (f === taker || f.sentOff) continue; f.vx = f.vy = 0; if (f.state === 'slide' || f.state === 'barge') { f.state = 'run'; }
      const s = EF.AI.setPieceSpot(this, f, this.sp); if (type === 'penalty' || type === 'freekick' || type === 'corner' || type === 'goalkick') { if (type === 'penalty' || !f.human) { f.x = s[0]; f.y = s[1]; f.facing = f.side === 0 ? 0 : Math.PI; f.state = 'run'; f.stun = 0; } }
    }
    this.emit(type === 'goalkick' ? 'goalKickSet' : type === 'throwin' ? 'throwInSet' : type + 'Set', { side, x, y, taker: taker.id, indirect: !!o.indirect }); if (type === 'freekick') this.emit('freekick', { side, x, y });
    this.whistle();
  }
  whistle() { this.emit('whistle', {}); }
  /* ---------- the step ---------- */
  update(dt0) {
    if (this.o.frozen || this.o.mirror) return;
    let dt = dt0 * this.slow * EF.T.gameSpeed; this.t += dt; this.modeT += dt;
    const ball = this.ball;
    if (this.mode === 'replay') return this.replayStep(dt0);
    this.assignHumans(dt);
    this.refStep(dt);
    const M = this.mode;
    if (M === 'halftime' || M === 'fulltime' || M === 'over') { if (M === 'halftime' && this.modeT > 4) { this.half = 2; this.clock = 0; this.kickoff(1); } if (M === 'fulltime' && this.modeT > 3) { this.finish(); } for (const f of this.F) this.stepFootballer(f, dt, true); this.followBall(); return; }
    if (this.var) { this.varStep(dt); for (const f of this.F) this.stepFootballer(f, dt, true); this.followBall(); return; }
    if (M === 'shootout') return this.shootoutStep(dt);
    if (M === 'goal' || M === 'celebrate') return this.goalStep(dt);
    if (M === 'kickoff') {
      for (const f of this.F) this.stepFootballer(f, dt, true);
      this.followBall(); this.updateEntities(dt);
      if (this.modeT > (this.o.quickKick ? .4 : 1.9)) { this.mode = 'play'; this.modeT = 0; this.ball.owner = this.kickTaker; this.kickHold = 2.2; this.whistle(); this.emit('kickoff', { side: this.restartSide }); }
      return;
    }
    if (M === 'setpiece') { this.spStep(dt); this.collisions(dt); this.updateEntities(dt); this.record(dt); if (this.mode === 'setpiece') { this.clockHold = true; return; } }
    this.kickHold = Math.max(0, this.kickHold - dt);
    if (this.duel) this.duelStep(dt);
    if (this.mode === 'play') this.playStep(dt);
    this.updateEntities(dt); this.record(dt);
  }
  stepFootballer(f, dt, frozen) {
    if (frozen) { f.step(dt, null); if (this.mode === 'kickoff' && !f.sentOff) { const s = EF.AI.baseSpot(this, f, 'kickoff'); const dx = s[0] - f.x, dy = s[1] - f.y, d = Math.hypot(dx, dy); if (d > 2 && f !== this.kickTaker) { f.x += dx / d * Math.min(d, 140 * dt); f.y += dy / d * Math.min(d, 140 * dt); f.facing = Math.atan2(dy, dx); f.vx = dx / d * 60; f.vy = dy / d * 60; } else if (f === this.kickTaker) { const tx = Pitch.CX - (this.restartSide === 0 ? 8 : -8), ty = Pitch.CY, ex = tx - f.x, ey = ty - f.y, ed = Math.hypot(ex, ey); if (ed > 2) { f.x += ex / ed * Math.min(ed, 140 * dt); f.y += ey / ed * Math.min(ed, 140 * dt); f.facing = Math.atan2(ey, ex); } } } return; }
    const intent = this.intentFor(f); f.step(dt, intent);
  }
  followBall() { const b = this.ball; if (b.owner) { const o = b.owner, k = o.isGK && o.state === 'hold' ? 6 : 8; b.x = o.x + Math.cos(o.facing) * k; b.y = o.y + Math.sin(o.facing) * k; b.z = o.isGK && o.state === 'hold' ? 10 : 0; b.vx = o.vx; b.vy = o.vy; b.vz = 0; b.roll += Math.hypot(o.vx, o.vy) * .01; } }
  playStep(dt) {
    const ball = this.ball, stat = this.stats;
    for (const f of this.F) this.stepFootballer(f, dt, false);
    this.collisions(dt);
    if (ball.owner) { this.followBall(); }
    else {
      const evs = ball.step(dt, this); for (const [t, d] of evs) { this.emit(t, Object.assign({ x: ball.x, y: ball.y }, d)); if (t === 'post' || t === 'bar') { this.addEu(ball.shotBy ? ball.shotBy.side : 0, .03); } }
      this.pickups(dt);
      for (const f of this.F) if (f.isGK) f.keeperContact();
      this.checkBounds();
    }
    if (this.mode === 'play' || this.mode === 'penaltyHuman') { this.checkAdv(dt); this.clockStep(dt); this.euStep(dt); this.possessionStats(dt); }
    if (ball.shotBy) { /* shot outcome tracked in checkBounds */ }
  }
  collisions(dt) {
    // players push each other apart a little; set-piece distances
    const F = this.F;
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const a = F[i], b = F[j]; if (a.sentOff || b.sentOff || a.state === 'down' || b.state === 'down' || a.state === 'flying' || b.state === 'flying') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 9; if (d < min && d > .01) { const p = (min - d) * .5, nx = dx / d, ny = dy / d; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; }
    }
    if (this.mode === 'setpiece' && this.sp) {
      const sp = this.sp, R = sp.type === 'freekick' ? 38 : sp.type === 'corner' ? 30 : 0;
      if (R) for (const f of F) { if (f === sp.taker || f.sentOff || f.side === sp.side || f.isGK) continue; const dx = f.x - sp.x, dy = f.y - sp.y, d = Math.hypot(dx, dy) || 1; if (d < R) { f.x = sp.x + dx / d * R; f.y = sp.y + dy / d * R; } }
      if (sp.type === 'penalty') for (const f of F) { if (f === sp.taker || f.sentOff || f.isGK) continue; const gxl = Pitch.goalX(sp.side); const inB = Math.abs(f.y - Pitch.CY) < Pitch.BOXH + 4 && Math.abs(f.x - gxl) < Pitch.BOXD + 4; if (inB) { f.x = gxl + (sp.side === 0 ? -1 : 1) * (Pitch.BOXD + 8); } }
    }
    if (this.kickHold > 0 && this.mode === 'play') for (const f of F) { if (f.side !== this.restartSide && !f.sentOff) { const dx = f.x - Pitch.CX, dy = f.y - Pitch.CY, d = Math.hypot(dx, dy) || 1; if (d < 46 && (f.side === 0 ? f.x > Pitch.CX - 2 : f.x < Pitch.CX + 2) || d < 46) { f.x = Pitch.CX + dx / d * 46; f.y = Pitch.CY + dy / d * 46; } } }
  }
  pickups(dt) {
    const ball = this.ball; if (ball.owner || ball.z > 9 || this.mode === 'goal') return;
    const sp = ball.speed(), r = sp > 230 ? 4.5 : 9; let best = null, bd = 1e9;
    for (const f of this.F) {
      if (f.sentOff || f.state === 'down' || f.state === 'flying' || f.state === 'diving' || f.stun > 0 || f.cool > 0 || f.isGK && f.state !== 'run') continue; if (f.state === 'slide' || f.state === 'barge') continue;
      if (f.isGK) continue; // keepers claim in their own step
      const d = Math.hypot(ball.x - f.x, ball.y - f.y); if (d < r + (f.state === 'skill' ? 2 : 0) && d < bd) { bd = d; best = f; }
    }
    if (!best) return;
    const last = ball.last, tgt = ball.passTo;
    if (last && last === best && ball.speed() > 60 && this.t - (ball.tpass || -9) < .25) return;
    if (this.kickHold > 0 && this.mode === 'play' && best.side !== this.restartSide) return;
    ball.owner = best; ball.prev = last; ball.spin = 0; ball.vx = ball.vy = 0; ball.path = null;
    if (last && last !== best) {
      if (last.side === best.side) { this.stats[best.side].passesDone++; this.addEu(best.side, .022, 'pass'); this.emit('passDone', { side: best.side, who: last.id, to: best.id, x: best.x, y: best.y }); if (this.oneTwo && this.oneTwo.f === best && this.t - this.oneTwo.t < 2.6) { this.emit('oneTwo', { side: best.side, who: best.id }); this.oneTwo = null; best.stamina = Math.min(1, best.stamina + .2); } if (this.oneTwo && this.oneTwo.mate === best && this.t - this.oneTwo.t < 2.6) {/* waiting for the return */} }
      else { if (tgt && tgt.side === last.side && ball.passer) { this.emit('intercept', { side: best.side, who: best.id, x: best.x, y: best.y }); this.addEu(best.side, .035, 'intercept'); } this.emit('possession', { side: best.side, who: best.id }); }
    }
    if (ball.shotBy && ball.shotBy.side !== best.side) { ball.shotBy = null; }
    ball.passTo = null; ball.sup = null;
    if (this.rules.training) this.emit('touch', { who: best.id, side: best.side });
  }
  checkBounds() {
    const ball = this.ball, P = Pitch; if (this.mode !== 'play' && this.mode !== 'penaltyHuman') return;
    const inX = ball.x < P.X0 - 2 || ball.x > P.X1 + 2, side = ball.x > P.X1 + 2 ? 0 : 1;
    if (inX) {
      if (Math.abs(ball.y - P.CY) < P.GH - 1 && ball.z < P.BAR) { return this.goalScored(side); }
      // behind the goal line: a goal kick or a corner
      const last = ball.last ? ball.last.side : 1 - side;
      if (last === side) { this.stats[side].shots += 0; this.shotOutcome('wide'); this.emit('out', { x: ball.x, y: ball.y }); return this.setPiece('goalkick', 1 - side, 0, 0); }
      this.shotOutcome('wide'); this.emit('out', { x: ball.x, y: ball.y }); return this.setPiece('corner', side, 0, 0, { right: side === 0, low: ball.y > P.CY });
    }
    if (ball.y < P.Y0 - 1 || ball.y > P.Y1 + 1) { const last = ball.last ? ball.last.side : 0; this.shotOutcome('wide'); this.emit('out', { x: ball.x, y: ball.y }); return this.setPiece('throwin', 1 - last, ball.x, ball.y); }
    // a shot passing the line wide/high, tracked for near-miss commentary
    if (ball.shotBy && ball.shotT > .1 && ball.shotT < 1.7) { const gx = P.goalX(ball.shotBy.side); if (Math.abs(ball.x - gx) < 10 && ball.z >= P.BAR) { this.emit('nearMiss', { side: ball.shotBy.side, who: ball.shotBy.id, over: true }); ball.shotBy = null; } }
  }
  shotOutcome(kind) {
    const ball = this.ball; if (ball.shotBy && kind === 'wide') { const gx = Pitch.goalX(ball.shotBy.side); if (Math.abs(ball.x - gx) < 60 && ball.shotT < 2) this.emit('nearMiss', { side: ball.shotBy.side, who: ball.shotBy.id, x: ball.x, y: ball.y }); }
    ball.shotBy = null;
  }
  clockStep(dt) {
    const T = EF.T; this.clock += dt;
    if (this.rules.training || this.o.noClock) return;
    const lim = this.extra ? this.halfSecs * .5 : this.halfSecs;
    if (this.clock >= lim) {
      if (this.extra) { this.emit('fulltimeWhistle', {}); return this.endRegular(); }
      if (this.half === 1) { this.mode = 'halftime'; this.modeT = 0; this.ball.owner = null; this.ball.stop(); this.emit('half', {}); this.whistle(); return; }
      this.endRegular();
    }
  }
  endRegular() {
    this.whistle();
    if (this.score[0] === this.score[1] && this.rules.needWinner) {
      if (!this.extra && !this.rules.noExtra) { this.extra = true; this.golden = true; this.clock = 0; this.emit('goldenGoal', {}); this.kickoff(0); return; }
      this.startShootout(); return;
    }
    this.mode = 'fulltime'; this.modeT = 0; this.ball.stop(); this.ball.owner = null; this.emit('fulltime', { score: this.score.slice() });
    for (const f of this.F) f.celebrate = this.winner() === f.side ? 99 : 0;
  }
  winner() { return this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : this.shoot ? (this.shoot.score[0] > this.shoot.score[1] ? 0 : 1) : -1; }
  finish() { this.mode = 'over'; this.over = true; this.result = { score: this.score.slice(), pens: this.shoot ? this.shoot.score.slice() : null, winner: this.winner(), stats: this.stats, goals: this.goals.slice() }; this.emit('matchOver', this.result); }
  euStep(dt) {
    const T = EF.T;
    if (this.europhoria) { this.europhoria.t -= dt; this.eu[this.europhoria.side] = clamp(this.europhoria.t / T.europhoriaSecs, 0, 1); if (this.europhoria.t <= 0) { const s = this.europhoria.side; this.eu[s] = 0; this.euFull[s] = false; this.europhoria = null; this.emit('europhoriaEnd', { side: s }); } }
    else for (const s of [0, 1]) { if (this.eu[s] < 1) this.eu[s] = Math.max(0, this.eu[s] - T.euphDecay * dt); }
    // the CPU lets it rip when it is full
    for (const s of [0, 1]) if (!this.europhoria && this.eu[s] >= 1 && !this.humans.some(h => h.side === s) && this.t - (this.euFullT || 0) > 1.2) { this.euFullT = this.t; if (this.rng() < .5 || this.cheat) this.tryEuphoria(s); }
    if (this.europhoria && !this.humans.some(h => h.side === this.europhoria.side)) { /* the AI shoots in range automatically */ }
  }
  possessionStats(dt) { const o = this.ball.owner; if (o) this.stats[o.side].poss += dt; }
  checkAdv(dt) {
    const a = this.adv; if (!a) return; a.t -= dt; const ball = this.ball;
    if (ball.owner && ball.owner.side !== a.side) { this.punish(a.off, a.vic, a.sev, a.kind, a.spot, false); return; }
    if (a.t <= 0) { this.emit('advantageOver', { side: a.side }); this.adv = null; this.addEu(a.side, .03); }
  }
  /* ---------- goals ---------- */
  goalScored(side) {
    const ball = this.ball, scorer = ball.last, own = scorer && scorer.side !== side; this.lastGoalSide = side;
    const info = { side, who: scorer ? scorer.id : -1, own, header: !!(ball.headerBy !== undefined && scorer && ball.headerBy === scorer.id && this.t - ball.headerT < .8 && ball.headerKind !== 'volley' && ball.headerKind !== 'bicycle'), fk: ball.fk === side && this.t - 0 < 1e9 && ball.fkT < 6, sup: !!(ball.superT > 0 && ball.shotBy && ball.shotBy.side === side), bus: false, x: ball.x, y: ball.y, pen: this.penaltyLive };
    info.bus = this.teams[1 - side].data.tactic === 'catenaccio' && this.teams[1 - side].F.filter(f => !f.sentOff && !f.isGK && Math.abs(f.x - Pitch.ownGoalX(1 - side)) < 90).length >= 3;
    if (ball.sup || ball.superT > 0 && ball.shotBy) info.sup = true;
    this.goalInfo = info; ball.sup = null; ball.path = null; ball.superT = 0;
    const accept = () => this.confirmGoal(info);
    this.mode = 'goalcheck'; this.ball.owner = null;
    this.startVar('goal', accept, () => { this.emit('varDecision', { overturned: true, kind: 'goal' }); this.setPiece('goalkick', 1 - side, 0, 0); });
    // most goals are not checked: skip the monitor when there is nothing to look at
    if (!(this.suspect[side] > this.t - 9) && this.rng() > .08) { const v = this.var; this.var = null; this.mode = 'play'; accept(); }
  }
  confirmGoal(info) {
    const side = info.side, scorer = info.who >= 0 ? this.F[info.who] : null; this.score[side]++; this.stats[side].goals++; if (info.header && !info.own) this.stats[side].headerGoals++; if (info.fk && !info.own) this.stats[side].fkGoals++; if (info.sup) this.stats[side].superGoals++; if (info.bus) this.stats[side].busGoals++;
    this.goals.push({ side, who: info.who, name: scorer ? scorer.name : '?', minute: this.minute, own: info.own, header: info.header, fk: info.fk, pen: info.pen, sup: info.sup }); this.addEu(side, .2); this.addEu(1 - side, -.0);
    this.mode = 'goal'; this.modeT = 0; this.ball.stop(); this.ball.owner = null; this.penaltyLive = false; this.sp = null; this.adv = null; this.slow = 1; this.duel = null;
    for (const f of this.F) { f.celebrate = f.side === side && !f.sentOff ? 4 : 0; f.charging = false; f.charge = 0; if (f.state === 'slide' || f.state === 'barge') f.state = 'run'; }
    if (scorer && scorer.side === side) { scorer.celebrate = 6; this.celebrant = scorer; } else this.celebrant = this.F.find(f => f.side === side && !f.isGK && !f.sentOff);
    this.emit('goal', { side, who: info.who, own: info.own, header: info.header, fk: info.fk, sup: info.sup, pen: info.pen, bus: info.bus, x: info.x, y: info.y, score: this.score.slice(), name: scorer ? scorer.name : '' });
    this.replayReady = this.frames.slice(-170);
  }
  goalStep(dt) {
    for (const f of this.F) this.stepFootballer(f, dt, true);
    // the scorer runs to the corner flag; the others jog toward him
    const c = this.celebrant; if (c) { const side = this.goalInfo ? this.goalInfo.side : 0, tx = Pitch.goalX(side) - (side === 0 ? 70 : -70), ty = c.y < Pitch.CY ? Pitch.Y0 + 40 : Pitch.Y1 - 40; const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy); if (d > 6) { c.x += dx / d * 80 * dt; c.y += dy / d * 80 * dt; c.facing = Math.atan2(dy, dx); c.vx = dx / d * 80; c.vy = dy / d * 80; } else { c.vx = c.vy = 0; }
      for (const f of this.F) if (f.side === side && f !== c && !f.isGK && !f.sentOff) { const ex = c.x - f.x, ey = c.y - f.y, ed = Math.hypot(ex, ey); if (ed > 24) { f.x += ex / ed * 60 * dt; f.y += ey / ed * 60 * dt; f.facing = Math.atan2(ey, ex); f.vx = ex / ed * 60; f.vy = ey / ed * 60; } else { f.vx = f.vy = 0; } } }
    if (this.mode === 'goal' && this.modeT > 1.4) { this.mode = 'celebrate'; this.modeT = 0; }
    if (this.mode === 'celebrate' && this.modeT > (this.o.noReplay ? 2.6 : 2.4)) {
      if (this.golden || (this.goalInfo && this.rules.sudden)) { this.finishGolden(); return; }
      if (!this.o.noReplay && this.replayReady && this.replayReady.length > 30) return this.startReplay();
      this.resumeAfterGoal();
    }
  }
  finishGolden() { this.mode = 'fulltime'; this.modeT = 0; for (const f of this.F) f.celebrate = this.winner() === f.side ? 99 : 0; this.emit('fulltime', { score: this.score.slice(), golden: true }); }
  resumeAfterGoal() { const side = this.goalInfo ? 1 - this.goalInfo.side : 0; this.replay = null; this.kickoff(side); }
  /* ---------- the replay ---------- */
  record(dt) { this.frameT += dt; if (this.frameT >= 1 / 30) { this.frameT = 0; this.frames.push(this.capture()); if (this.frames.length > 260) this.frames.shift(); } }
  capture() {
    const b = this.ball, round = v => Math.round(v * 10) / 10;
    return { b: [round(b.x), round(b.y), round(b.z), round(b.vx), round(b.vy), b.owner ? b.owner.id : -1, round(b.roll), b.sup ? 1 : 0],
      f: this.F.map(f => [round(f.x), round(f.y), round(f.z), +f.facing.toFixed(2), round(f.vx), round(f.vy), f.state, f.action || 0, +f.stateT.toFixed(2), +(f.tilt || 0).toFixed(2), +(f.jump || 0).toFixed(2), +(f.celebrate > 0 ? 1 : 0), f.sentOff ? 1 : 0, +f.stamina.toFixed(2), f.charging ? +Math.min(1.6, f.charge).toFixed(2) : 0]) };
  }
  restore(fr) {
    const b = this.ball, B = fr.b; b.x = B[0]; b.y = B[1]; b.z = B[2]; b.vx = B[3]; b.vy = B[4]; b.owner = B[5] >= 0 ? this.F[B[5]] : null; b.roll = B[6]; b.sup = B[7] ? { color: '#ffd84a' } : null;
    fr.f.forEach((a, i) => { const f = this.F[i]; f.x = a[0]; f.y = a[1]; f.z = a[2]; f.facing = a[3]; f.vx = a[4]; f.vy = a[5]; f.state = a[6]; f.action = a[7] || null; f.stateT = a[8]; f.tilt = a[9]; f.jump = a[10]; f.celebrate = a[11] ? 2 : 0; f.sentOff = !!a[12]; f.stamina = a[13]; f.charge = a[14]; f.charging = a[14] > 0; });
  }
  startReplay() {
    this.liveSave = this.capture(); this.liveMode = { half: this.half, clock: this.clock }; this.replay = { frames: this.replayReady, i: 0, t: 0, speed: 1 }; this.mode = 'replay'; this.modeT = 0; this.emit('replayStart', {});
  }
  replayStep(dt) {
    const r = this.replay; r.t += dt * (r.i > r.frames.length - 45 ? .55 : 1); r.i = Math.min(r.frames.length - 1, Math.floor(r.t * 30)); this.restore(r.frames[r.i]);
    if (r.i >= r.frames.length - 1 || this.skipReplay) { this.skipReplay = false; this.restore(this.liveSave); this.emit('replayEnd', {}); this.mode = 'celebrate'; this.replay = null; this.modeT = 99; this.replayReady = null; this.mode = 'goal'; this.modeT = 9; this.resumeAfterGoal(); }
  }
  varStep(dt) {
    const v = this.var; v.t += dt;
    if (v.t >= v.dur) { this.var = null; this.mode = this.prevMode === 'goalcheck' || v.kind === 'goal' ? 'play' : this.prevMode; this.emit('varDecision', { overturned: v.over, kind: v.kind }); if (v.over) v.onOver(); else v.onStand(); }
  }
  /* ---------- the referee and matchday entities ---------- */
  refStep(dt) {
    const r = this.ref, b = this.ball, tx = b.x - (b.vx > 30 ? -30 : 30) * 0 + 36 * (b.y > Pitch.CY ? -1 : 1) * 0, ty = b.y + 34, d = Math.hypot(tx - r.x, ty - r.y);
    const sp = Math.min(70, d * 2); r.vx = approach(r.vx, d > 2 ? (tx - r.x) / d * sp : 0, 400 * dt); r.vy = approach(r.vy, d > 2 ? (ty - r.y) / d * sp : 0, 400 * dt); r.x += r.vx * dt; r.y += r.vy * dt; r.y = clamp(r.y, Pitch.Y0 + 12, Pitch.Y1 + 8); if (Math.hypot(r.vx, r.vy) > 6) r.facing = Math.atan2(r.vy, r.vx);
    if (this.refCard) { this.refCard.t -= dt; if (this.refCard.t <= 0) this.refCard = null; }
  }
  updateEntities(dt) {
    this.nextEvent -= dt; const evs = this.stadium.events || [];
    if (this.nextEvent <= 0 && evs.length && !this.rules.training && !this.o.noEvents && this.mode === 'play') { this.nextEvent = 28 + this.rng() * 30; this.spawnEvent(this.rng() < .5 ? evs[Math.floor(this.rng() * evs.length)] : evs[0]); }
    for (const e of this.fxEnts) {
      e.t += dt;
      if (e.kind === 'seagull') { e.x += e.vx * dt; e.y += e.vy * dt; if (e.t < 2) { e.z = Math.max(0, e.z - 20 * dt); } else if (e.t > 6 + e.life) { e.z += 40 * dt; e.vx *= 1.01; } if (e.t > 3 && e.t < 6 && !this.ball.owner && Math.hypot(this.ball.x - e.x, this.ball.y - e.y) < 12 && this.ball.speed() < 30) { this.ball.vx += 25; this.ball.vy -= 15; } }
      else if (e.kind === 'invader') { e.x += e.vx * dt; if (e.t < 1) e.y += 0; for (const f of this.F) if (f.state === 'kick' && f.action === 'poke' && Math.hypot(f.x - e.x, f.y - e.y) < 17 && !e.caught) { e.caught = true; e.vx = 0; this.emit('invaderTackled', { who: f.id, side: f.side, kind: e.who }); } if (e.caught && e.t > e.catchT + 2) e.dead = true; if (e.caught && !e.catchT) e.catchT = e.t; }
      else if (e.kind === 'beachball') { e.vz -= 200 * dt; e.z += e.vz * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.z < 0) { e.z = 0; e.vz = 90 * (e.bounces++ < 5 ? 1 : 0); } }
      else if (e.kind === 'keith') { e.x += e.vx * dt; }
    }
    this.fxEnts = this.fxEnts.filter(e => !e.dead && e.t < (e.max || 20));
    if (this.flicker > 0) this.flicker -= dt;
  }
  spawnEvent(kind) {
    const P = Pitch, rng = this.rng, e = { kind, t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, life: rng() * 3 };
    if (kind === 'seagull') { e.x = P.CX + (rng() - .5) * 200; e.y = P.CY + (rng() - .5) * 140; e.z = 70; e.vx = (rng() - .5) * 18; e.vy = (rng() - .5) * 10; e.max = 12; }
    else if (kind === 'beachball') { e.kind = 'beachball'; e.x = P.CX + (rng() - .5) * 100; e.y = P.Y0 - 4; e.z = 60; e.vx = (rng() - .5) * 30; e.vy = 40; e.vz = 0; e.bounces = 0; e.max = 14; }
    else if (kind === 'invader' || kind === 'keith') { e.kind = 'invader'; e.who = kind === 'keith' ? 'keith' : 'stag'; e.x = P.X0 + 10; e.y = P.CY + (rng() - .5) * 120; e.vx = 62; e.max = 14; if (kind === 'keith') { e.max = 16; e.vx = 48; } }
    else if (kind === 'flicker') { this.flicker = 3.2; e.max = 3.2; e.kind = 'fxflag'; }
    else { e.kind = 'fxflag'; e.max = 7; }
    e.name = kind; this.fxEnts.push(e); this.emit('event', { name: kind });
  }
  /* ---------- the shootout ---------- */
  startShootout() {
    const P = Pitch; this.mode = 'shootout'; this.modeT = 0; this.ball.stop(); this.ball.owner = null;
    this.shoot = { kicks: [[], []], score: [0, 0], turn: 0, round: 0, phase: 'intro', t: 0, taker: null, over: false, sudden: false, order: [this.F.filter(f => f.side === 0 && !f.isGK && !f.sentOff), this.F.filter(f => f.side === 1 && !f.isGK && !f.sentOff)] };
    for (const f of this.F) { f.celebrate = 0; f.state = 'run'; f.stateT = 0; f.z = 0; f.vx = f.vy = 0; f.charging = false; if (!f.sentOff && !f.isGK) { f.x = P.CX + (f.side === 0 ? -30 : 30) + (f.slot % 3) * 6 * (f.side ? 1 : -1); f.y = P.CY - 50 + f.slot * 24; f.facing = f.side === 0 ? 0 : Math.PI; } }
    this.emit('shootoutStart', {});
  }
  shootoutStep(dt) {
    const S = this.shoot, P = Pitch, ball = this.ball; S.t += dt;
    for (const f of this.F) if (f !== S.taker) { if (f.isGK) { if (f.state === 'keeperDive') { f.step(dt, null); } else f.step(dt, null); } else f.step(dt, null); }
    if (S.phase === 'intro') { if (S.t > 1.8) this.nextPenalty(); return; }
    if (S.phase === 'ready') {
      // the taker's controls: a human, or the CPU after a pause
      this.assignHumans(dt); const t = S.taker;
      for (const f of this.F) if (f === t) { const intent = this.intentFor(f); if (((f.human === null && S.t > 1.8 + this.rng() * .3) || S.t > 12) && !S.aiGo) { S.aiGo = true; } f.step(dt, S.aiGo ? EF.AI.penaltyIntent(this, f) : (f.human !== null ? intent : null)); }
      if (ball.owner) this.followBall(); else this.followBall();
      if (!ball.owner) { S.phase = 'flight'; S.t = 0; this.penaltyLive = true; this.slow = 1; }
      return;
    }
    if (S.phase === 'flight') {
      const evs = ball.step(dt, this); for (const [t, d] of evs) this.emit(t, Object.assign({ x: ball.x, y: ball.y }, d));
      for (const f of this.F) if (f.isGK) f.keeperContact(); if (this.duel) this.duelStep(dt);
      let res = null; const gx = P.goalX(S.turn);
      if (!ball.owner) {
        if ((S.turn === 0 ? ball.x > P.X1 + 2 : ball.x < P.X0 - 2)) res = Math.abs(ball.y - P.CY) < P.GH - 1 && ball.z < P.BAR ? 'goal' : 'miss';
        else if (ball.y < P.Y0 - 8 || ball.y > P.Y1 + 8 || ball.speed() < 6 && S.t > .6 || S.t > 4) res = Math.abs(ball.x - gx) < 40 && S.t > 1 ? 'saved' : 'miss';
        if ((S.turn === 0 ? ball.x < P.X1 - 90 : ball.x > P.X0 + 90) && ball.speed() > 20 && S.t > .5 && ball.last && ball.last.isGK) res = 'saved';
      } else if (ball.owner && ball.owner.isGK) res = 'saved';
      if (res) { S.phase = 'result'; S.t = 0; S.res = res; this.penaltyLive = false; this.slow = 1; this.emit('shootoutKick', { side: S.turn, result: res, who: S.taker.id }); S.kicks[S.turn].push(res === 'goal'); if (res === 'goal') { S.score[S.turn]++; this.emit('goalShoot', { side: S.turn }); } else if (res === 'saved') this.emit('save', { side: 1 - S.turn, who: 0, shootout: true }); }
      return;
    }
    if (S.phase === 'result') {
      this.followBall(); if (S.t > 1.8) {
        const a = S.kicks[0].length, b = S.kicks[1].length, sa = S.score[0], sb = S.score[1];
        // decided? (best of five, then sudden death)
        const left = [Math.max(0, 5 - a), Math.max(0, 5 - b)]; let done = false;
        if (a <= 5 || b <= 5) { if (sa > sb + left[1] || sb > sa + left[0]) done = true; if (a >= 5 && b >= 5 && sa !== sb) done = true; }
        else if (a === b && sa !== sb) done = true;
        if (a >= 5 && b >= 5 && a === b && sa !== sb) done = true;
        if (done) { S.over = true; this.mode = 'fulltime'; this.modeT = 0; this.ball.stop(); this.emit('shootoutEnd', { score: S.score.slice() }); for (const f of this.F) f.celebrate = this.winner() === f.side ? 99 : 0; return; }
        S.turn = 1 - S.turn; this.nextPenalty();
      }
    }
  }
  nextPenalty() {
    const S = this.shoot, P = Pitch, side = S.turn, k = S.kicks[side].length; const order = S.order[side];
    const taker = order[k % order.length]; S.taker = taker; S.phase = 'ready'; S.t = 0; S.aiGo = false; S.res = null;
    const dirIn = side === 0 ? 1 : -1, ball = this.ball; ball.stop(); ball.x = side === 0 ? P.X1 - P.SPOT : P.X0 + P.SPOT; ball.y = P.CY; ball.z = 0;
    taker.x = ball.x - dirIn * 9; taker.y = P.CY; taker.facing = dirIn > 0 ? 0 : Math.PI; taker.vx = taker.vy = 0; taker.state = 'run'; taker.cool = 0; ball.owner = taker; ball.last = taker;
    const gk = this.F.find(f => f.side === 1 - side && f.isGK && !f.sentOff); gk.x = Pitch.goalX(side) - dirIn * 4; gk.y = P.CY; gk.state = 'run'; gk.vx = gk.vy = 0; gk.z = 0; gk.k.outcome = null; gk.facing = dirIn > 0 ? Math.PI : 0; gk.k.shotId = -1; gk.tilt = 0;
    this.sp = { type: 'penalty', side, x: ball.x, y: ball.y, t: 0, taker, wait: 9, shootout: true }; this.mode = 'shootout'; this.whistle(); this.emit('penaltyReady', { side, taker: taker.id });
    // humans: the taker's side, plus the keeper's side (keepers dive by stick: simplified to AI + duel)
    this.shootoutHuman = s => s === side ? taker : null; this.mode2 = 'penaltyHuman';
    for (const h of this.humans) h.f = h.side === side ? taker : h.f;
  }
  spStep(dt) {
    const sp = this.sp; if (!sp) { this.mode = 'play'; return; } sp.t += dt; const t = sp.taker, ball = this.ball;
    if (!t || t.sentOff) { this.mode = 'play'; this.sp = null; return; }
    // the taker is held at the ball while he waits
    t.vx = approach(t.vx, 0, 900 * dt); t.vy = approach(t.vy, 0, 900 * dt); ball.owner = t; this.followBall();
    for (const f of this.F) if (f !== t) { const intent = this.intentFor(f); if (f.human !== null) f.step(dt, intent); else if (!f.sentOff) { const s = EF.AI.setPieceSpot(this, f, sp), dx = s[0] - f.x, dy = s[1] - f.y, d = Math.hypot(dx, dy); if (d > 2) { f.x += dx / d * Math.min(d, 90 * dt); f.y += dy / d * Math.min(d, 90 * dt); f.facing = Math.atan2(dy, dx); f.vx = dx / d * 60; f.vy = dy / d * 60; } else { f.vx = f.vy = 0; } f.step(dt, null); } }
    if (t.isGK) { if (sp.t > sp.wait) { t.k.holdT = 0; t.state = 'run'; t.distribute(); this.afterTake(); } return; }
    const humanTaker = t.human !== null;
    if (t.state !== 'run') { t.step(dt, null); ball.owner = t; this.followBall(); return; }
    const intent = humanTaker ? this.intentFor(t) : (sp.t > sp.wait ? EF.AI.setPieceIntent(this, t, sp) : null);
    if (intent) { t.step(dt, intent); if (!ball.owner || ball.owner !== t) this.afterTake(); } else t.step(dt, null);
    if (ball.owner === t && sp.t > sp.wait + (humanTaker ? 25 : 5)) { t.state = 'run'; t.cool = 0; t.charging = false; const i2 = EF.Intent(); i2.move = [Math.cos(t.facing), Math.sin(t.facing)]; if (humanTaker || sp.type === 'penalty') t.doShot(i2, .6); else t.doPass(i2, false); if (ball.owner !== t) this.afterTake(); }
  }
  afterTake() {
    const sp = this.sp; if (!sp) return; const ball = this.ball; this.mode = 'play'; this.modeT = 0;
    if (sp.type === 'freekick') { ball.fk = sp.side; ball.fkT = 0; } if (sp.type === 'penalty') this.penaltyLive = true;
    this.kickHold = 0; this.restartSide = sp.side; this.sp = null; this.emit('setPieceTaken', { type: sp.type, side: sp.side });
  }
};


//# sourceURL=ef/13-ai.js
/* ============ 13-ai: the team brain: spots, pressing, carrying, set-piece routines ============ */
EF.AI = (() => {
  const P = Pitch, W = P.X1 - P.X0, H = P.Y1 - P.Y0, rngOf = M => M.rng;
  const tacOf = (M, side) => EF.get('tactic', M.teams[side].data.tactic) || EF.get('tactic', 'plucky');
  const toX = (side, u) => side === 0 ? P.X0 + u * W : P.X1 - u * W;
  const uOf = (side, x) => side === 0 ? (x - P.X0) / W : (P.X1 - x) / W;
  const busOn = (M, side) => { const tm = M.teams[side]; if (tm.data.tactic !== 'catenaccio') return false; const lead = M.score[side] - M.score[1 - side]; const late = M.clock > M.halfSecs * .45 && M.half === 2 || M.extra; return lead > 0 && late; };
  function baseSpot(M, f, mode) {
    const slot = M.teams[f.side].formation.slots[f.slot]; let u = slot[1], v = slot[2];
    if (mode === 'kickoff') { u = Math.min(u, .46); if (f.slot > 0) u = Math.min(u, .45); if (f.role === 'FWD') u = Math.min(u, .42); }
    return [toX(f.side, u), P.Y0 + v * H];
  }
  function spot(M, f) {
    const side = f.side, tac = tacOf(M, side), slot = M.teams[side].formation.slots[f.slot], role = EF.ROLE[slot[0]], ball = M.ball, owner = ball.owner;
    let [, u, v] = slot; const att = owner && owner.side === side, def = owner && owner.side !== side, ballU = uOf(side, ball.x);
    if (att) { u += role.att[0]; v += role.att[1]; } else if (def) u += role.def[0];
    u += (ballU - .5) * (f.role === 'DEF' ? .22 : f.role === 'FWD' ? .3 : .26) + (tac.line - .45) * (def ? .3 : .12);
    if (busOn(M, side) && f.role !== 'GK') { u = .1 + f.slot * .035; if (!M.busAnnounced) { M.busAnnounced = true; M.emit('bus', { side }); } }
    const r = role.range; u = clamp(u, r[0], r[1]); if (f.role === 'GK') return [toX(side, .03), P.CY];
    const by = (ball.y - P.Y0) / H; v = clamp(lerp(v, by, .18 + (att ? .06 : .12)), .1, .9);
    // man-marking
    if (f.data.markman && def) { const t = M.teams[1 - side].F.filter(g => !g.sentOff && !g.isGK).sort((a, b) => b.data.skill - a.data.skill)[0]; if (t) return [lerp(t.x, P.ownGoalX(side), .2), t.y]; }
    return [toX(side, u), P.Y0 + v * H];
  }
  function setPieceSpot(M, f, sp) {
    const side = f.side, dirOwn = side === 0 ? 1 : -1, gxOwn = P.ownGoalX(side), gxAtt = P.goalX(side), mine = sp.side === side, idx = f.slot, ball = M.ball;
    if (f.isGK) { if (sp.type === 'penalty' && !mine) return [gxOwn + dirOwn * 4, P.CY]; return [gxOwn + dirOwn * (sp.type === 'goalkick' && mine ? 12 : 14), P.CY]; }
    const t = sp.taker;
    switch (sp.type) {
      case 'penalty': { const edge = gxAtt + (sp.side === 0 ? -1 : 1) * 0; const bx = P.goalX(sp.side) + (sp.side === 0 ? -1 : 1) * -(P.BOXD + 18); const j = idx % 4 - 1.5; return [P.goalX(sp.side) - (sp.side === 0 ? 1 : -1) * (P.BOXD + 18), P.CY + j * 22 + (side === sp.side ? 0 : 11)]; }
      case 'corner': {
        const tgx = P.goalX(sp.side), inward = sp.side === 0 ? -1 : 1, spots = [[-34, -26], [-40, 0], [-30, 26], [-70, 40]];
        const s = spots[(idx + (mine ? 0 : 1)) % spots.length]; return [tgx - inward * s[0] + (mine ? 0 : inward * 6), P.CY + s[1] + (mine ? 0 : 6)];
      }
      case 'freekick': {
        const tgx = P.goalX(sp.side), toGoal = Math.atan2(P.CY - sp.y, tgx - sp.x), dd = Math.hypot(tgx - sp.x, P.CY - sp.y);
        if (!mine && !f.isGK) { const defs = M.F.filter(g => g.side === side && !g.isGK && !g.sentOff).sort((a, b) => Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y)); const k = defs.indexOf(f); if (dd < 330 && k >= 0 && k < 3) { const px = -Math.sin(toGoal), py = Math.cos(toGoal); return [sp.x + Math.cos(toGoal) * 40 + px * (k - 1) * 11, sp.y + Math.sin(toGoal) * 40 + py * (k - 1) * 11]; } return [lerp(sp.x, gxOwn, .5) + (idx - 2) * 6, lerp(sp.y, P.CY, .5) + (idx - 2) * 16]; }
        if (dd < 330) return [tgx - (sp.side === 0 ? 1 : -1) * (30 + (idx % 3) * 22), P.CY + ((idx % 4) - 1.5) * 24];
        const b = spot(M, f); return [lerp(b[0], sp.x, .35), lerp(b[1], sp.y, .25)];
      }
      case 'goalkick': { if (mine) { const b = baseSpot(M, f); return [lerp(b[0], toX(side, .55), .55), b[1]]; } return [toX(side, .45 + idx * .05), P.Y0 + (idx / 4) * H]; }
      case 'throwin': { const inward = sp.y < P.CY ? 1 : -1; const k = (idx % 3) - 1; return [clamp(sp.x + (mine ? (dirOwn * 30 + k * 24) : (k * 22 - dirOwn * 10)), P.X0 + 10, P.X1 - 10), sp.y + inward * (mine ? 34 + (idx % 2) * 30 : 30 + (idx % 2) * 24)]; }
    }
    return spot(M, f);
  }
  const mkB = (down, pressed) => ({ down, pressed, released: false, held: 0 });
  /** the carrier's plan, every few tenths of a second */
  function decideCarry(M, f, ai) {
    const side = f.side, tac = tacOf(M, side), T = EF.T, rng = M.rng, gx = P.goalX(side), dg = Math.hypot(gx - f.x, P.CY - f.y), skill = side === 1 ? T.aiSkill : .9 + (T.aiSkill - 1) * .4;
    const foes = M.F.filter(o => o.side !== side && !o.sentOff), keeper = foes.find(o => o.isGK), pr = M.pressure(f);
    const mates = M.F.filter(o => o.side === side && o !== f && !o.sentOff && !o.isGK);
    const range = tac.shootRange * (.8 + (f.data.shoot || 70) / 400) * (.9 + .1 * skill);
    const euf = M.europhoria && M.europhoria.side === side;
    const plan = { type: 'carry', move: null, action: null, hold: 0, aimY: 0, until: M.t + .22 + rng() * .2 };
    const toGoal = Math.atan2(P.CY - f.y, gx - f.x), fx = side === 0 ? 1 : -1;
    // dive for the penalty (theatrics), the Lucchetto way
    const near = foes.find(o => Math.hypot(o.x - f.x, o.y - f.y) < 18);
    if (near && (f.data.diver || tac.dive > .1) && rng() < (f.data.diver ? .09 : tac.dive * .05) && Pitch.inBox(f.x, f.y, 1 - side)) { plan.action = 'dive'; return plan; }
    // shoot
    const inZone = dg < range || (euf && dg < 360);
    const ka = keeper ? keeper.y : P.CY; plan.aimY = clamp((P.CY - ka) < 0 ? .72 : -.72, -1, 1) * (rng() < .6 ? 1 : -.6) + (rng() - .5) * .3;
    if (inZone && (Math.abs(f.y - P.CY) < 190) && rng() < (euf ? 1 : .55 + (pr ? .1 : 0))) { plan.action = 'shoot'; plan.hold = euf ? .55 * T.chargeTime : (.35 + rng() * .35) * T.chargeTime * (dg > 180 ? 1.2 : .8); plan.until = M.t + plan.hold + .5; return plan; }
    // pass when pressed, or by taste
    const best = pickPassTarget(M, f, mates, tac);
    if (best && (pr >= 1 && rng() < .75 || rng() < .09 * tac.tempo || (tac.shortBias && rng() < .12))) {
      const m = best.m, d = Math.hypot(m.x - f.x, m.y - f.y); const lobIt = (tac.longBall || 0) > rng() * 1.6 && d > 160 || (M.openness(f) < 24 && best.blocked); const thr = rng() < .22 && (m.x - f.x) * fx > 20 && !lobIt;
      plan.action = lobIt ? 'lob' : thr ? 'through' : 'pass'; plan.aim = Math.atan2(m.y - f.y, m.x - f.x); plan.until = M.t + .3; return plan;
    }
    // skill past a man
    if (near && rng() < .10 * (f.data.skill || 70) / 70 * T.aiAggro && pr <= 2) { plan.action = 'skill'; plan.aim = toGoal; return plan; }
    // dribble: toward goal, around the nearest man in front
    let ang = toGoal; const ahead = foes.filter(o => Math.abs(angDiff(Math.atan2(o.y - f.y, o.x - f.x), ang)) < .9 && Math.hypot(o.x - f.x, o.y - f.y) < 55).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
    if (ahead) { const side2 = Math.sign(angDiff(Math.atan2(ahead.y - f.y, ahead.x - f.x), ang)) || 1; ang -= side2 * .9; }
    if (tac.shortBias && dg > 220 && best && rng() < .5) ang = Math.atan2(best.m.y - f.y, best.m.x - f.x);
    plan.move = [Math.cos(ang), Math.sin(ang)]; plan.sprint = !near && f.stamina > .3; return plan;
  }
  function pickPassTarget(M, f, mates, tac) {
    let best = null, bs = -99; const fx = f.side === 0 ? 1 : -1;
    for (const m of mates) {
      const d = Math.hypot(m.x - f.x, m.y - f.y); if (d < 28 || d > 320) continue;
      const open = M.openness(m), fwd = ((m.x - f.x) * fx) / 200; let blocked = false;
      for (const o of M.F) { if (o.side === f.side || o.sentOff) continue; const t = clamp(((o.x - f.x) * (m.x - f.x) + (o.y - f.y) * (m.y - f.y)) / (d * d), 0, 1); if (Math.hypot(f.x + (m.x - f.x) * t - o.x, f.y + (m.y - f.y) * t - o.y) < 12) { blocked = true; break; } }
      const s = open / 40 + fwd * (1 - (tac.shortBias || 0) * .6) - d / 400 - (blocked ? 1.4 : 0) + (m.role === 'FWD' ? .3 : 0) + (tac.shortBias ? -Math.abs(d - 90) / 220 : 0);
      if (s > bs) { bs = s; best = { m, blocked }; }
    }
    return best;
  }
  function intent(M, f) {
    const I = EF.Intent(), ball = M.ball, T = EF.T, rng = M.rng, side = f.side, ai = f.ai, tac = tacOf(M, side), T0 = M.t;
    if (f.isGK || (EF.dev.freezeAI && f.human === null)) return I; if (M.rules.training && M.o.dummies && f.side === M.o.dummies) return I;
    const owner = ball.owner, dB = Math.hypot(ball.x - f.x, ball.y - f.y);
    const move = (tx, ty, sprint) => { const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy); if (d > 3) { const k = Math.min(1, d / 14); I.move = [dx / d * k, dy / d * k]; } I.sprint = !!sprint && f.stamina > .12 && d > 24; };
    const europ = M.europhoria && M.europhoria.side === side;
    // ---- with the ball ----
    if (owner === f) {
      if (!ai.plan || ai.plan.type !== 'carry' || T0 > ai.plan.until || f.cool > 0 && ai.plan.action === 'pass') { if (f.cool <= 0 || !ai.plan) ai.plan = decideCarry(M, f, ai); else { ai.plan = { type: 'carry', move: [Math.cos(f.facing), Math.sin(f.facing)], until: T0 + .15 }; } }
      const p = ai.plan; const react = ai.react = (ai.react === undefined ? 0 : ai.react);
      if (p.move) { I.move = p.move.slice(); I.sprint = !!p.sprint; }
      else { const gx = P.goalX(side); I.move = [Math.cos(Math.atan2(P.CY - f.y, gx - f.x)), Math.sin(Math.atan2(P.CY - f.y, gx - f.x))].map(v => v * .6); }
      if (p.action === 'shoot') { if (!p.t0) p.t0 = T0; I.aim = [0, p.aimY]; if (T0 - p.t0 < p.hold) { I.shoot.down = true; I.shoot.held = T0 - p.t0; } else if (f.charging) { /* release */ I.shoot.down = false; I.shoot.released = true; } else if (!f.charging && T0 - p.t0 < p.hold + .05) { I.shoot.down = true; } else { ai.plan = null; }
        const gx = P.goalX(side); I.move = [Math.cos(Math.atan2(P.CY - f.y, gx - f.x)) * .4, Math.sin(Math.atan2(P.CY - f.y, gx - f.x)) * .4]; }
      else if (p.action && !p.done) { p.done = true; const a = p.aim !== undefined ? p.aim : f.facing; I.move = [Math.cos(a), Math.sin(a)]; const b = I[p.action === 'dive' ? 'dive' : p.action]; b.pressed = true; b.down = true; if (p.action === 'dive') I.dive.pressed = true; if (p.action === 'skill') I.move = [Math.cos(a), Math.sin(a)]; ai.plan = { type: 'carry', until: T0 + .2, move: I.move.slice() }; }
      if (europ && M.eu[side] >= 1) I.euphoria = false;
      return I;
    }
    ai.plan = null;
    // ---- europhoria button for the CPU is handled by the match ----
    const spotT = spot(M, f);
    const mates = M.F.filter(o => o.side === side && !o.isGK && !o.sentOff), foes = M.F.filter(o => o.side !== side && !o.sentOff);
    const nearestMate = mates.slice().sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y));
    const foesNear = foes.filter(o => !o.isGK).sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y));
    const humanChasing = new Set(M.humans.map(h => h.f));
    // a pass coming to me, or a loose ball I am nearest to
    if (!owner) {
      const incoming = ball.passTo === f && ball.speed() > 30;
      const rank = nearestMate.filter(m => !humanChasing.has(m)).indexOf(f);
      const air = ball.z > 6 && ball.z < 40 && dB < 30;
      if (incoming || (rank === 0 && (!ball.passTo || ball.passTo.side !== side || ball.passTo === f)) || (rank === 1 && tac.press > .8 && ball.speed() < 40)) {
        const lead = clamp(dB / Math.max(80, ball.speed()), 0, .8); let tx = ball.x + ball.vx * lead, ty = ball.y + ball.vy * lead; if (!incoming && ball.z > 10 && ball.vz !== 0) { const t = Math.max(0, (ball.vz + Math.sqrt(Math.max(0, ball.vz * ball.vz + 2 * 600 * ball.z))) / 600); tx = ball.x + ball.vx * t * .8; ty = ball.y + ball.vy * t * .8; }
        move(tx, ty, dB > 40);
        if (air && f.cool <= 0 && rng() < .12 * T.aiSkill) { const own = Math.abs(P.goalX(side) - f.x) > Math.abs(P.ownGoalX(side) - f.x); const b = own ? (rng() < .5 ? I.shoot : I.pass) : I.lob; b.pressed = true; b.down = true; }
        return I;
      }
    }
    // an opponent has the ball: press it
    if (owner && owner.side !== side) {
      const nOpp = tac.pressers || 1, r = mates.filter(m => !humanChasing.has(m)).sort((a, b) => Math.hypot(a.x - owner.x, a.y - owner.y) - Math.hypot(b.x - owner.x, b.y - owner.y)).slice(0, Math.max(1, Math.round(nOpp * (.6 + tac.press * .5))));
      const d = Math.hypot(owner.x - f.x, owner.y - f.y);
      if (r.includes(f) && (d < 220 * T.aiPress * (.5 + tac.press) || mates.indexOf(f) >= 0 && f.role !== 'FWD')) {
        // approach from goal side
        const tx = owner.x + owner.vx * .25, ty = owner.y + owner.vy * .25;
        move(tx, ty, d > 36 && f.stamina > .2);
        if (d < 19 && f.cool <= 0 && f.state === 'run' && M.t - (ai.lastTackle || 0) > .5 / Math.max(.3, T.aiAggro)) {
          const behindMe = Math.abs(angDiff(f.facing, Math.atan2(owner.y - f.y, owner.x - f.x))) < 1.1;
          if (behindMe && rng() < .5 * T.aiAggro * (T.aiSkill) * tac.press) { I.pass.pressed = true; I.pass.down = true; ai.lastTackle = M.t; }
        } else if (d < 36 && d > 20 && f.cool <= 0 && f.state === 'run' && rng() < .004 * T.aiAggro * (tac.foul + .3) * 3 && owner.speed !== 0) { const a = Math.atan2(owner.y - f.y, owner.x - f.x); I.move = [Math.cos(a), Math.sin(a)]; I.shoot.pressed = true; I.shoot.down = true; ai.lastTackle = M.t; }
        else if (d < 19 && f.cool <= 0 && rng() < .002 * T.aiAggro * tac.foul) { I.lob.pressed = true; I.lob.down = true; }
        return I;
      }
    }
    // everyone else: to the spot, with a little life; attackers make runs
    let [tx, ty] = spotT;
    if (owner && owner.side === side && f.role !== 'DEF') { const wob = Math.sin(M.t * 1.3 + f.id * 2) * 22; ty += wob; if (rng() < .0006) ai.run = M.t + 1.4; if (ai.run > M.t) tx += (side === 0 ? 1 : -1) * 55; }
    move(tx, ty, Math.hypot(tx - f.x, ty - f.y) > 70);
    return I;
  }
  function setPieceIntent(M, t, sp, force) {
    const I = EF.Intent(), rng = M.rng, side = sp.side, gx = P.goalX(side), dd = Math.hypot(gx - sp.x, P.CY - sp.y); if (t.state !== 'run' || t.cool > 0) return I; sp.plan = sp.plan || { start: M.t, hold: .4 + rng() * .35, aimY: (rng() < .5 ? -1 : 1) * (.55 + rng() * .35) };
    const mates = M.F.filter(o => o.side === side && o !== t && !o.sentOff && !o.isGK);
    const aimAt = (x, y) => { const a = Math.atan2(y - t.y, x - t.x); I.move = [Math.cos(a), Math.sin(a)]; return a; };
    if (sp.type === 'penalty') { I.aim = [0, sp.plan.aimY]; const held = M.t - sp.plan.start; I.shoot.down = held < sp.plan.hold; if (!I.shoot.down && !t.charging && held < sp.plan.hold + .05) I.shoot.down = true; const a = Math.atan2(P.CY - t.y, gx - t.x); I.move = [Math.cos(a) * .3, Math.sin(a) * .3]; return I; }
    if (sp.type === 'freekick' && dd < 300 && !sp.indirect) { I.aim = [0, sp.plan.aimY * .8]; const held = M.t - sp.plan.start; I.shoot.down = held < sp.plan.hold; const a = Math.atan2(P.CY - t.y, gx - t.x); I.move = [Math.cos(a) * .3, Math.sin(a) * .3]; return I; }
    const best = pickPassTarget(M, t, mates, tacOf(M, side)); const m = best ? best.m : mates[0];
    if (sp.type === 'corner') { const a = aimAt(gx - (side === 0 ? 1 : -1) * 42, P.CY + (rng() - .5) * 50); I.lob.pressed = true; I.lob.down = true; return I; }
    if (sp.type === 'throwin' || sp.type === 'goalkick' || sp.type === 'freekick') { if (m) aimAt(m.x, m.y); I.pass.pressed = true; I.pass.down = true; if (sp.type === 'freekick' && m && Math.hypot(m.x - t.x, m.y - t.y) > 200) { I.pass.pressed = false; I.lob.pressed = true; } return I; }
    return I;
  }
  const penaltyIntent = (M, f) => setPieceIntent(M, f, M.sp);
  return { baseSpot, spot, setPieceSpot, intent, setPieceIntent, penaltyIntent, busOn };
})();

//# sourceURL=ef/20-view.js
/* ============ 20-view: the broadcast camera, the stands and crowd, the actors, the effects ============ */
EF.notices = [];
EF.notice = (text, color = '#fff6e0', dur = 2, scale = 2) => { EF.notices.push({ text, color, dur, t: 0, scale }); if (EF.notices.length > 3) EF.notices.shift(); };
const SKY = { harbour: ['#1c1c34', '#5a3a58'], palms: ['#6aa8e8', '#c8e0f0'], steel: ['#0a1020', '#2a3448'], walls: ['#1a1830', '#6a3a48'], dome: ['#05060f', '#2a2050'], sea: ['#8a9ab0', '#c8ccd0'] };
EF.MatchView = class MatchView {
  constructor(M, o = {}) {
    this.M = M; this.o = o; this.map = Pitch.build(M.stadiumId); this.st = M.stadium; this.rigs = new Map(); this.t = 0; this.fans = []; this.commentary = new EF.Commentary(M, { quiet: o.quiet }); this.mood = .3; this.camT = { x: Pitch.CX, y: Pitch.CY }; this.zoom = 1.15; this.shakeT = 0; this.trail = []; this.flash = 0; this.celebrations = {}; this.offs = []; this.refRig = null; this.fx = []; this.skip = 0; this.prevMode = ''; this.cardT = 0; this.goalT = 0; this.duelRing = null; this.varT = 0; this.picker = null;
    this.buildRigs(); this.buildCrowd(); this.hook();
    this.camPos = { x: Pitch.CX, y: Pitch.CY };
    this.gulls = [];
  }
  destroy() { this.commentary.destroy(); for (const o of this.offs) o(); this.offs = []; }
  buildRigs() {
    const M = this.M; for (const f of M.F) { const team = M.teams[f.side]; const kit = f.isGK ? EF.gkKit(M, f.side) : team.kit; const rig = EF.makeRig(f.data, kit, f.role, { gloves: '#ffffff' }); if (f.data.boss) rig.o.size = 1.8; this.rigs.set(f, rig); }
    const sp = EF.SPEAKERS.REF; this.refRig = new E.Humanoid({ size: 1.1, weapon: null, hair: 'short', hat: undefined, sleeves: 'short', colors: { skin: M.refData.skin, hair: '#2a2a2a', cloth: '#16161a', pants: '#16161a', boot: '#0a0a0a', trim: '#ffd84a', belt: '#16161a' } });
  }
  buildCrowd() {
    const M = this.M, st = this.st, rng = E.rng(M.seed + 77), homeK = M.teams[0].kit, awayK = M.teams[1].kit, tiers = st.tiers || 3, dens = Math.min(1, (st.crowd || 100) / 700);
    for (let R = 0; R < STAND; R++) {
      if (STAND - R > tiers + 0) {/* the back rows stay empty in small grounds */ if (st.crowd < 20) continue; }
      for (let c = ND; c <= ND + FW + 1; c++) for (const dx of [3, 8, 13]) {
        if (rng() > (st.crowd < 20 ? 0 : .35 + dens * .65) || (st.crowd < 20 && R < STAND - 1)) continue;
        const h = rng(), side = h < (st.homeShare ?? .7) ? 0 : 1, k = side ? awayK : homeK, z = [70, 58, 46, 34][R];
        const col = rng() < .55 ? k.cloth : rng() < .5 ? k.color2 || k.trim : ['#e8e0d0', '#3a4a6a', '#7a3a3a', '#caa84a'][Math.floor(rng() * 4)];
        this.fans.push({ x: c * TL + dx + rng() * 2, y: R * TL + 8 + rng() * 5, z, side, col, skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][Math.floor(rng() * 4)], ph: rng() * 9, R, c, hat: rng() < .15 });
      }
    }
  }
  hook() {
    const M = this.M, on = (t, fn) => this.offs.push(EF.bus.on(t, e => { if (e.match === M) fn(e); }));
    const hum = (s, d) => { for (const h of M.humans) if (h.side === s && h.idx === 0) try { game.input.rumble(.5, d || .2); } catch (e) { /* no pad */ } };
    on('goal', e => { this.goalT = 0; game.shake(6); game.flash('#ffffff', .25, .6); PT.bits(e.x, e.y, 20, 40, [EF.TEAMCOL(M.teams[e.side].id, e.side), '#ffffff', '#ffd84a']); EF.sfx('cheer'); EF.sfx('net'); EF.crowdAudio.swell(2); if (!e.own) EF.notice('GOAL!', '#ffe08a', 2.4, 4); else EF.notice('OWN GOAL!', '#ff9a8a', 2.4, 3); hum(e.side, .6); this.flash = 1; });
    on('shot', e => { EF.sfx('shot'); if (e.sup) game.shake(2); });
    on('pass', e => EF.sfx('pass')); on('lob', e => EF.sfx('kick')); on('goalKick', e => EF.sfx('kick')); on('throw', e => EF.sfx('pass'));
    on('thud', e => { PT.dust(e.x, e.y, 2, 5); EF.sfx('thud'); });
    on('bounce', e => { if (e.power > .3) EF.sfx('bounce', { vol: e.power }); });
    on('tackleWon', e => { PT.sparks(e.x, e.y, 8, 6); EF.sfx('tackle'); game.shake(1.5); }); on('tackleFailed', e => EF.sfx('thud', { vol: .4 }));
    on('slide', e => { PT.dust(e.x, e.y, 2, 8); EF.sfx('slide'); }); on('knockdown', e => { game.hitFx(e.x, e.y, 10, { power: 1, textScale: 0 }); EF.sfx('tackle'); EF.crowdAudio.swell(.6); });
    on('post', e => { PT.sparks(e.x, e.y, 16, 10); EF.sfx('post'); game.shake(2); EF.crowdAudio.swell(.8); EF.sfx('ooh'); }); on('bar', e => { PT.sparks(e.x, e.y, 28, 10); EF.sfx('post'); game.shake(2); EF.sfx('ooh'); });
    on('save', e => { EF.sfx('save'); EF.crowdAudio.swell(.8); EF.sfx('ooh'); if (e.shootout) return; if (!e.parry) EF.notice('SAVED!', '#9ae0ff', 1.4, 3); else EF.notice('PARRIED!', '#9ae0ff', 1.2, 3); });
    on('nearMiss', e => { EF.sfx('groan', { vol: .8 }); }); on('whistle', e => EF.sfx('whistle')); on('fulltimeWhistle', e => EF.sfx('whistle2')); on('fulltime', e => EF.sfx('whistle2')); on('half', e => EF.sfx('whistle2'));
    on('foul', e => { EF.notice('FOUL!', '#ffd8a0', 1.4, 3); EF.sfx('whistle2'); EF.sfx('groan', { vol: .5 }); }); on('advantage', e => EF.notice('ADVANTAGE!', '#9aff9a', 1.6, 3));
    on('card', e => { EF.notice(e.color === 'red' ? 'RED CARD!' : 'YELLOW CARD', e.color === 'red' ? '#ff6a5a' : '#ffe04a', 2, 3); EF.sfx('card'); EF.sfx('groan', { vol: .6 }); this.cardT = 2.4; this.cardColor = e.color; });
    on('dive', e => { EF.sfx('dive'); }); on('diveBooked', e => EF.notice('BOOKED FOR DIVING', '#ffe04a', 2, 2)); on('diveWon', e => EF.notice('...AND THE REF BUYS IT!', '#9aff9a', 1.8, 2));
    on('var', e => { EF.notice('VAR CHECK', '#9ad8ff', 2.8, 3); EF.sfx('varbeep'); this.varT = 0; }); on('varDecision', e => { EF.notice(e.overturned ? 'NO GOAL! DECISION OVERTURNED' : 'DECISION STANDS', e.overturned ? '#ff8a7a' : '#9aff9a', 2.2, 2); if (e.kind !== 'goal' && e.overturned) EF.sfx('groan'); });
    on('penaltyAwarded', e => EF.notice('PENALTY!', '#ffd84a', 2, 4)); on('nutmeg', e => { EF.notice('NUTMEG!', '#ffd84a', 1.5, 3); EF.sfx('skill'); PT.glints(e.x, e.y, 14, 8, '#ffd84a'); EF.crowdAudio.swell(.8); EF.sfx('ooh'); }); on('rainbow', e => { EF.notice('RAINBOW FLICK!', '#ff9aff', 1.4, 2); EF.sfx('skill'); }); on('skill', e => { EF.sfx('skill'); PT.glints(e.x, e.y, 10, 4, '#ffffff'); });
    on('bicycle', e => { EF.notice('BICYCLE KICK!', '#ffd84a', 1.6, 3); PT.glints(e.x, e.y, 16, 8, '#ffffff'); EF.sfx('ooh'); }); on('header', e => { if (e.shot) PT.dust(e.x, e.y, 18, 3); }); on('volley', e => { EF.notice('VOLLEY!', '#ffd84a', 1.1, 2); });
    on('euphoriaFull', e => { if (e.side === 0 || !M.humans.length) { EF.notice('CROWD READY! L1+R1', '#ffd84a', 2.2, 2); } EF.sfx('euphoriaFull'); });
    on('europhoria', e => { EF.notice('EUROPHORIA!', '#ff9a2a', 2.6, 4); EF.sfx('europhoria'); game.flash('#ffa030', .4, .7); game.shake(4); this.flash = 1; EF.crowdAudio.swell(2); const s = M.teams[e.side]; if (!M.humans.length || true) EF.crowdAudio.chant(s.id, M.t - 99 + 99 + 6); PT.ring(Pitch.CX, Pitch.CY, 10, 260, '#ffa030', .8); });
    on('superStrike', e => { EF.notice(e.name, e.color || '#ffd84a', 2.4, 3); EF.sfx('superStrike'); game.flash('#ffffff', .2, .6); game.shake(5); game.freeze && game.freeze(.12); });
    on('hammer', e => { EF.sfx('hammer'); game.shake(4); PT.dust(M.ball.x, M.ball.y, 2, 10); });
    on('saveDuel', e => { this.duelRing = { t: 0 }; EF.notice('SAVE DUEL!', '#9ae0ff', 1.4, 3); }); on('saveDuelResult', e => { EF.sfx(e.save ? 'duelWin' : 'duelLose'); EF.notice(e.save ? (e.perfect ? 'PERFECT SAVE!' : 'SAVED!') : 'BEATEN!', e.save ? '#9aff9a' : '#ff8a7a', 1.6, 3); });
    on('half', e => EF.notice('HALF TIME', '#fff6e0', 3, 3)); on('fulltime', e => EF.notice('FULL TIME', '#fff6e0', 3, 3)); on('goldenGoal', e => EF.notice('GOLDEN GOAL!', '#ffd84a', 3, 3)); on('shootoutStart', e => EF.notice('PENALTY SHOOTOUT!', '#ffd84a', 2.6, 3));
    on('kickoff', e => EF.notice('KICK OFF', '#fff6e0', 1.1, 2)); on('replayStart', e => { this.replayCamTurn = true; this.yawNow = 0; }); on('replayEnd', e => { if (this.replayCamTurn) { this.replayCamTurn = false; this.turnTo(0); } });
    on('bus', e => { EF.notice('THEY PARKED THE BUS!', '#ffd8a0', 2.4, 2); EF.sfx('honk'); }); on('event', e => { if (e.name === 'seagull') EF.sfx('seagull'); if (e.name === 'fireworks') { EF.sfx('firework'); } if (e.name === 'flare') EF.sfx('boom'); });
    on('shootoutKick', e => { EF.notice(e.result === 'goal' ? 'SCORED!' : e.result === 'saved' ? 'SAVED!' : 'MISSED!', e.result === 'goal' ? '#9aff9a' : '#ff8a7a', 1.6, 3); });
    on('invaderTackled', e => { EF.notice('INVADER TACKLED!', '#ffd84a', 2, 2); EF.sfx('cheer'); if (EF.Save) EF.Save.sticker('x:keith'); });
    on('passDone', e => { if (M.teams[e.side].id === 'rpp' && EF.fxRng() < .5) EF.sfx({ wave: 'triangle', freq: 'E5', to: 'C5', dur: .18, vol: .1 }); });
  }
  rig(f) { return this.rigs.get(f); }
  /** turn the camera to a yaw (degrees, relative to the broadcast angle) */
  turnTo(deg) { const d = deg - (this.yawNow || 0); if (d) { try { game.rotateView(d); } catch (err) { /* view */ } this.yawNow = deg; } }
  /** each step: rigs from state, the camera, the crowd, the sound */
  update(dt) {
    const M = this.M, ball = M.ball; this.t += dt; this.goalT += dt; this.varT += dt; this.cardT = Math.max(0, this.cardT - dt);
    for (const f of M.F) this.animate(f, dt);
    const r = M.ref, rr = this.refRig; rr.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx, vy: r.vy, facing: r.facing, pose: M.refCard ? 'cheer' : null });
    this.commentary.update(dt);
    if (M.mode === 'replay' && M.replay) { const u = M.replay.i / Math.max(1, M.replay.frames.length - 1); this.turnTo(u < .4 ? -32 : u < .75 ? 28 : -90 * 0 + 60); } else if (this.replayCamTurn && M.mode !== 'replay') { this.replayCamTurn = false; this.turnTo(0); }
    for (const n of EF.notices) n.t += dt; EF.notices = EF.notices.filter(n => n.t < n.dur);
    if (this.duelRing) { this.duelRing.t += dt; if (!M.duel) this.duelRing = null; }
    // the crowd's mood
    const tgt = clamp(.28 + Math.max(M.eu[0], M.eu[1]) * .5 + (M.europhoria ? .3 : 0) + (M.mode === 'goal' || M.mode === 'celebrate' ? .6 : 0) + (M.ball.speed() > 250 ? .1 : 0), 0, 1);
    this.mood += (tgt - this.mood) * Math.min(1, dt * 1.5); EF.crowdAudio.update(dt, this.mood);
    if (M.mode === 'play' && M.europhoria && this.t % 6 < dt) EF.crowdAudio.chant(M.teams[M.europhoria.side].id, this.t);
    this.updateCamera(dt);
    // super-strike trail
    if (ball.sup && !ball.owner) { this.trail.push({ x: ball.x, y: ball.y, z: ball.z + 3, t: 0, c: ball.sup.color || '#ffd84a' }); if (this.trail.length > 28) this.trail.shift(); } else if (this.trail.length) this.trail.shift();
    for (const t of this.trail) t.t += dt;
    // weather and lights
    if (M.europhoria && M.europhoria.side === 0 && EF.fxRng() < dt * 8) PT.add && 0;
  }
  animate(f, dt) {
    const rig = this.rig(f), M = this.M; let o = { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing };
    const st = f.state, u = f.stateT;
    if (f.celebrate > 0 && M.mode !== 'play' && st !== 'down') {
      const team = M.teams[f.side].data, style = f.celebStyle || team.celebration || 'cheer';
      o.pose = { cheer: 'cheer', robot: 'guard', flagdance: 'wave', badgekiss: 'kneel', helicopter: 'cheer', slide: 'kneel', fishslap: 'hips' }[style] || 'cheer'; o.expr = 'shout';
      if (style === 'helicopter') o.facing = this.t * 9; if (style === 'fishslap') o.attack = E.move('backslash', (this.t * 2) % 1);
      if (style === 'robot') { o.facing = Math.round(this.t * 2) * Math.PI / 2; }
      o.z = f.z + (style === 'cheer' ? Math.abs(Math.sin(this.t * 7 + f.id)) * 3 : 0);
    } else if (st === 'kick') { const k = f.action === 'poke' ? 'kick' : 'kick'; o.attack = E.move(k, clamp(u / (f.actionDur || .25), 0, 1)); if (f.action === 'shot') o.expr = 'shout'; }
    else if (st === 'slide') { o.attack = E.move('sweep', clamp(u / .42, 0, 1)); o.down = .75; o.facing = f.slideDir !== undefined ? f.slideDir : f.facing; }
    else if (st === 'barge') { o.attack = E.move('bash', clamp(u / .3, 0, 1)); o.lean = .4; }
    else if (st === 'down') { o.pose = 'down'; o.down = Math.min(1, u * 8); if (f.action === 'slideEnd') { o.down = 1; } o.expr = 'wince'; }
    else if (st === 'flying') { o.flip = clamp(u * 1.4, 0, 1); o.hurt = true; o.expr = 'wince'; }
    else if (st === 'diving') { o.down = Math.min(1, u * 6); o.pose = 'down'; o.expr = 'wince'; }
    else if (st === 'air') { o.air = true; const uu = clamp(u / (f.actionDur || .4), 0, 1); o.z = f.z + Math.sin(uu * Math.PI) * (f.jump > 0 ? 14 : 8); if (f.tilt) { o.tilt = { axis: 'right', angle: (f.action === 'bicycle' ? 1.45 : -1.15) * Math.sin(uu * Math.PI), lift: f.action === 'bicycle' ? 4 : 1 }; } o.attack = f.action === 'header' || f.action === 'divingHeader' ? undefined : E.move('kick', uu); o.expr = 'shout'; }
    else if (st === 'skill') { const uu = clamp(u / (f.actionDur || .38), 0, 1); o.z = f.z + Math.sin(uu * Math.PI) * 3; o.lean = (f.skillDir || 1) * Math.sin(uu * Math.PI * 2) * .5; if (f.action === 'rainbow') o.air = true; if (f.action === 'spin') o.flip = uu; o.sprint = true; }
    else if (st === 'keeperDive') { const uu = clamp(1 - f.k.diveT / .55, 0, 1); o.tilt = { axis: 'forward', angle: -(f.tilt > 0 ? 1 : -1) * (f.side === 0 ? 1 : -1) * 1.4 * Math.sin(Math.min(1, uu * 1.6) * Math.PI / 2 + (uu > .6 ? (uu - .6) * 1.2 : 0)), lift: 3 }; o.facing = f.side === 0 ? 0 : Math.PI; o.z = f.z + Math.sin(uu * Math.PI) * 4; o.expr = 'shout'; o.hurt = false; }
    else if (st === 'hold') { o.pose = 'guard'; o.vx = o.vy = 0; }
    else { o.sprint = f.sprinting; if (f.stun > 0) o.hurt = true; if (f.charging) o.lean = -.25; if (M.ball.owner === f) o.run = undefined; }
    if (f.immune > 0 && st !== 'skill') o.sprint = true;
    if (!f.data.boss) { /* normal size */ }
    rig.update(dt, o);
    // flare/scarf at europhoria: handled in draw
  }
  updateCamera(dt) {
    const M = this.M, b = M.ball, cp = this.camPos; let tx = b.x, ty = b.y, zt = .74, lead = .32;
    if (b.owner) { tx = b.owner.x + b.owner.vx * lead; ty = b.owner.y + b.owner.vy * lead * .5; } else { tx = b.x + b.vx * lead; ty = b.y + b.vy * lead * .6; }
    if (M.mode === 'setpiece' && M.sp) { if (M.sp.type === 'penalty') { tx = (M.sp.x + Pitch.goalX(M.sp.side)) / 2; ty = Pitch.CY; zt = 1.25; } else if (M.sp.type === 'corner') { tx = (M.sp.x + Pitch.CX) / 2 * .5 + M.sp.x * .5; ty = lerp(M.sp.y, Pitch.CY, .5); zt = .98; } else { tx = M.sp.x; ty = M.sp.y; zt = .98; } }
    if ((M.mode === 'goal' || M.mode === 'celebrate') && M.celebrant) { tx = M.celebrant.x; ty = M.celebrant.y; zt = 1.35; }
    if (M.mode === 'replay') { zt = 1.0; }
    if (M.mode === 'shootout') { const S = M.shoot; tx = Pitch.goalX(S.turn) - (S.turn === 0 ? 70 : -70); ty = Pitch.CY; zt = 1.2; }
    if (M.duel) { zt = 1.3; tx = lerp(tx, Pitch.goalX(M.duel.side === 0 ? 1 : 0), .5); }
    if (M.europhoria) zt = Math.min(zt, .8);
    if (M.mode === 'var') { zt = .95; }
    const zz = (this.zoom || 1) * ((game.settings && game.settings.zoom) || 1), hw = game.W / zz / 2, hv = game.H / (zz * Math.sin(game.view.pitch)) / 2;
    const rx = Math.max(0, (Pitch.X1 - Pitch.X0) / 2 - hw + 60), ry = Math.max(0, (Pitch.Y1 - Pitch.Y0) / 2 - hv + 70);
    tx = clamp(tx, Pitch.CX - rx, Pitch.CX + rx); ty = clamp(ty, Pitch.CY - ry, Pitch.CY + ry);
    const k = 1 - Math.exp(-dt * (M.mode === 'play' ? 5 : 3)); cp.x += (tx - cp.x) * k; cp.y += (ty - cp.y) * k;
    this.zoom += (zt - this.zoom) * (1 - Math.exp(-dt * 2.2));
    const pz = (game.settings && game.settings.zoom) || 1; if (Math.abs(this.zoomApplied - this.zoom * pz) > .02 || this.zoomApplied === undefined) { game.setZoom(this.zoom * pz > 3 ? 3 : this.zoom * pz); this.zoomApplied = this.zoom * pz; }
    game.focus(cp.x, cp.y, 6);
  }
  /* ---------- drawing ---------- */
  draw(r) {
    const M = this.M, view = E.charView(r.view), st = this.st, map = this.map;
    L.enabled = true; L.ambient = clamp(st.ambient * (M.flicker > 0 ? (Math.sin(this.t * 40) > 0 ? .4 : 1) : 1), .2, 1.1);
    map.drawFloor(r); this.skyline(r);
    map.queueWalls(r);
    this.drawBoards(r); this.drawFans(r); this.drawGoals(r); this.drawMarkings(r); if (this.extra) this.extra(r, view);
    // floodlights
    for (const [x, y] of [[Pitch.X0 - 22, Pitch.Y0 - 18], [Pitch.X1 + 22, Pitch.Y0 - 18], [Pitch.X0 - 22, Pitch.Y1 + 18], [Pitch.X1 + 22, Pitch.Y1 + 18], [Pitch.CX - 150, Pitch.Y0 - 18], [Pitch.CX + 150, Pitch.Y1 + 18]]) {
      r.queue(x, y, 0, g => { const [a, b] = r.w(x, y, 0), [c, d] = r.w(x, y, 120); px.line(g, Math.round(a), Math.round(b), Math.round(c), Math.round(d), '#3a3e4a', 2); px.rect(g, Math.round(c) - 6, Math.round(d) - 3, 12, 5, '#e8e4d0'); }, { solid: true });
      L.add(x, y, 90, 420, st.time === 'day' ? .25 : .95, { color: '#fff0c8' });
    }
    // actors, y sorted by the engine
    const refRig = this.refRig; r.shadow(M.ref.x, M.ref.y, 6, .3); r.actor(M.ref.x, M.ref.y, 0, (g, ox, oy) => refRig.draw(g, ox, oy, view));
    if (M.refCard) { const c = M.refCard.color === 'red' ? '#e8302a' : '#ffe04a', rx = M.ref.x, ry = M.ref.y; r.queue(rx, ry, 70, g => { const [x, y] = r.w(rx, ry, 40); px.rect(g, Math.round(x) - 4, Math.round(y) - 14, 8, 11, c); px.rect(g, Math.round(x) - 4, Math.round(y) - 14, 8, 1, '#ffffff'); }, { emissive: true }); }
    for (const f of M.F) {
      if (f.sentOff) continue; const rig = this.rig(f), sz = f.data.size || 1;
      r.shadow(f.x, f.y, 6 * Math.max(1, sz * .85), f.z > 1 ? .22 : .35);
      r.actor(f.x, f.y, f.z, (g, ox, oy) => rig.draw(g, ox, oy, view), { outline: true });
      if (f.state === 'slide' || f.state === 'barge') { r.queue(f.x, f.y, 1, g => { }, {}); }
    }
    this.drawEntities(r); this.drawBall(r); this.drawMarkers(r);
    if (this.st.snow || M.stadium.weather && M.stadium.weather.kind === 'fog') { /* weather is drawn by the engine; fog in the overlay */ }
    r.overlay(g => this.hud(g, r));
  }
  skyline(r) {
    const kind = this.st.skyline, M = this.M, y = -20, t = this.t;
    const col = this.st.time === 'day' ? '#7a8aa0' : '#0e0f18', col2 = this.st.time === 'day' ? '#9ab0c0' : '#1a1c2a', W = Pitch.COLS * TL;
    r.queue(W / 2, y - 40, 0, g => {
      const P = (x, z) => { const [a, b] = r.w(x, y, z); return [Math.round(a), Math.round(b)]; };
      const sky = SKY[kind] || SKY.sea; const [l, bt] = P(0, 0), [rr] = P(W, 0), [, top] = P(0, 220);
      // sky behind everything above the far stands
      for (let k = 0; k < 14; k++) { const yy = bt - 330 + k * 22; px.rect(g, l - 400, yy, rr - l + 800, 22, k < 7 ? sky[0] : sky[1]); }
      const pillar = (x, w, h, c) => { const [a, b] = P(x, 0), [, t2] = P(x, h); px.rect(g, a - w / 2, t2, w, b - t2, c); };
      if (kind === 'harbour') { for (let i = 0; i < 6; i++) pillar(80 + i * 130, 8, 70 + (i % 3) * 20, col); const [a, b] = P(W * .85, 0); px.rect(g, a - 5, b - 120, 10, 120, '#a09aa8'); px.rect(g, a - 7, b - 130, 14, 10, '#ffe08a'); const ang = t * 1.2; px.poly(g, [[a, b - 125], [a + Math.cos(ang) * 160, b - 125 + Math.sin(ang) * 30 - 40], [a + Math.cos(ang) * 160, b - 125 + Math.sin(ang) * 30 + 40]], 'rgba(255,240,180,0.12)'); }
      else if (kind === 'palms') { for (let i = 0; i < 9; i++) { const [a, b] = P(40 + i * 110, 0); px.line(g, a, b, a + 2, b - 60, '#5a4a2a', 3); px.poly(g, [[a, b - 62], [a - 20, b - 54], [a, b - 70], [a + 22, b - 52]], '#3a8a3a'); } const [d0, d1] = P(W * .45, 0); px.disc(g, d0, d1 - 80, 34, '#d8d0c0'); px.rect(g, d0 - 4, d1 - 120, 8, 12, '#c8c0b0'); }
      else if (kind === 'steel') { for (let i = 0; i < 7; i++) { pillar(60 + i * 120, 12, 100 + (i * 37 % 60), col2); const [a, b] = P(60 + i * 120, 0); px.rect(g, a - 6, b - 100 - (i * 37 % 60) - 4, 12, 4, '#ff7a1a'); } }
      else if (kind === 'walls') { for (let i = 0; i < 12; i++) { const [a, b] = P(20 + i * 62, 0); px.rect(g, a - 10, b - 50, 20, 50, col2); px.rect(g, a - 10, b - 56, 6, 6, col2); px.rect(g, a + 4, b - 56, 6, 6, col2); } const [a, b] = P(W * .2, 0); px.rect(g, a - 8, b - 110, 16, 110, col2); px.poly(g, [[a - 10, b - 110], [a, b - 128], [a + 10, b - 110]], '#5a2a2a'); }
      else if (kind === 'dome') { const [a, b] = P(W / 2, 0); for (let k = 0; k < 8; k++) { const ang = -Math.PI * .5 + (k - 3.5) * .16; px.line(g, a, b - 30, a + Math.cos(ang) * 220, b - 30 + Math.sin(ang) * 220, 'rgba(255,230,140,0.18)', 3); } px.disc(g, a, b - 20, 150, '#241c40'); px.disc(g, a, b - 20, 140, '#33285a'); }
      else { pillar(W * .3, 40, 20, col2); }
    }, { solid: true, bias: -50 });
  }
  drawBoards(r) {
    const st = this.st, texts = st.boards; if (!texts) return;
    const M = this.M;
    for (let i = 0; i < 4; i++) { const x = Pitch.X0 + 60 + i * 150, y0 = Pitch.Y0 - 7, y1 = Pitch.Y1 + 7; const txt = texts[i % texts.length].slice(0, 22);
      for (const [yy, dir] of [[y0, 0], [y1, 1]]) r.queue(x, yy, 12, g => { const [a, b] = r.w(x, yy, 11); const w = E.font.width(txt, { font: 'tiny' }) + 6; px.rect(g, Math.round(a - w / 2), Math.round(b - 8), w, 8, '#10131f'); E.font.text(g, txt, Math.round(a), Math.round(b - 7), ['#ffd84a', '#7aff9a', '#ff9a7a', '#9ad8ff'][i % 4], { font: 'tiny', align: 'center', outline: false }); }, { solid: dir === 0 }); }
  }
  drawMarkings(r) { /* the pitch lines are in the floor texture; a darker net shadow is in 'ao' */ }
  drawGoals(r) {
    const P = Pitch, M = this.M;
    for (const gx of [P.X0, P.X1]) {
      const dir = gx === P.X0 ? -1 : 1;
      for (const py of [P.CY - P.GH, P.CY + P.GH]) r.queue(gx, py, 0, g => { const [x, y] = r.w(gx, py, 0), [, y1] = r.w(gx, py, P.BAR); px.rect(g, Math.round(x) - 1, Math.round(y1), 3, Math.round(y - y1), '#f8f8f0'); }, { solid: true });
      r.queue(gx, P.CY - P.GH, P.BAR, g => { const [x0, y0] = r.w(gx, P.CY - P.GH, P.BAR), [x1, y1] = r.w(gx, P.CY + P.GH, P.BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f8f8f0', 2); }, { bias: 1 });
      // the net: back and roof lines
      r.queue(gx + dir * 24, P.CY, 4, g => { const gxb = gx + dir * 36; const A = r.w(gx, P.CY - P.GH, P.BAR), B = r.w(gxb, P.CY - P.GH, P.BAR - 8), C = r.w(gxb, P.CY + P.GH, P.BAR - 8), D = r.w(gx, P.CY + P.GH, P.BAR), E0 = r.w(gxb, P.CY - P.GH, 0), F0 = r.w(gxb, P.CY + P.GH, 0);
        const ln = (p, q) => px.line(g, Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), 'rgba(230,236,240,0.55)', 1);
        ln(A, B); ln(D, C); ln(B, C); ln(B, E0); ln(C, F0); for (let k = 1; k < 6; k++) { const f = k / 6, p = r.w(gxb, P.CY - P.GH + f * 2 * P.GH, P.BAR - 8), q = r.w(gx, P.CY - P.GH + f * 2 * P.GH, P.BAR); ln(p, q); const p2 = r.w(gxb, P.CY - P.GH + f * 2 * P.GH, 0); ln(p, p2); } }, { solid: false });
    }
  }
  drawFans(r) {
    const M = this.M, mood = this.mood, t = this.t, euS = M.europhoria ? M.europhoria.side : -1, kit = euS >= 0 ? M.teams[euS].kit : null;
    const goalSide = (M.mode === 'goal' || M.mode === 'celebrate') && M.goalInfo ? M.goalInfo.side : -1;
    for (const f of this.fans) {
      let up = 0, arms = false;
      if (goalSide === f.side) { up = Math.abs(Math.sin(t * 8 + f.ph)) * 5; arms = true; }
      else if (euS === f.side) { up = Math.abs(Math.sin(t * 6 + f.ph)) * 3.5; arms = true; }
      else up = Math.sin(t * (1.5 + mood * 2) + f.ph) * (.4 + mood * .8) * (mood > .5 ? 1.4 : 1);
      let col = f.col; if (kit && f.side === euS && f.R < 2) col = (f.R + Math.floor(f.c / 3)) % 2 ? kit.cloth : (kit.color2 || kit.trim);
      const z = f.z + Math.max(0, up);
      r.queue(f.x, f.y, z, g => { const [x, y] = r.w(f.x, f.y, z), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, col); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); if (f.hat) px.rect(g, X - 1, Y - 9, 3, 1, col); if (arms) { px.line(g, X - 2, Y - 4, X - 3, Y - 9, f.skin, 1); px.line(g, X + 1, Y - 4, X + 3, Y - 9, f.skin, 1); } if (euS === f.side && f.ph < .9 && f.R > 1) { px.rect(g, X + 2, Y - 11 - (t * 20 + f.ph * 50) % 3, 1, 3, '#ff4a2a'); } }, { solid: false });
    }
  }
  drawEntities(r) {
    for (const e of this.M.fxEnts) {
      if (e.kind === 'seagull') r.queue(e.x, e.y, e.z, g => { const [x, y] = r.w(e.x, e.y, e.z), X = Math.round(x), Y = Math.round(y), fl = Math.sin(this.t * 12) * 3; px.rect(g, X - 2, Y - 2, 5, 3, '#f4f4f0'); px.poly(g, [[X - 2, Y - 1], [X - 7, Y - 3 - fl], [X, Y - 2]], '#d8d8d4'); px.poly(g, [[X + 2, Y - 1], [X + 7, Y - 3 + fl], [X, Y - 2]], '#d8d8d4'); px.rect(g, X + 3, Y - 2, 2, 1, '#f0a020'); }, {});
      else if (e.kind === 'beachball') r.queue(e.x, e.y, e.z, g => { const [x, y] = r.w(e.x, e.y, e.z); px.disc(g, Math.round(x), Math.round(y), 5, '#ff5a4a'); px.rect(g, Math.round(x) - 5, Math.round(y) - 1, 10, 2, '#ffe04a'); px.rect(g, Math.round(x) - 1, Math.round(y) - 5, 2, 10, '#4a8aff'); }, {});
      else if (e.kind === 'invader') r.queue(e.x, e.y, 0, g => { const [x, y] = r.w(e.x, e.y, 0), X = Math.round(x), Y = Math.round(y), c = e.who === 'keith' ? '#f08a24' : '#8a8a90', fl = e.caught ? 0 : Math.sin(this.t * 14) * 2; px.rect(g, X - 4, Y - 14 + fl, 8, 10, c); px.rect(g, X - 3, Y - 4, 3, 4, '#2a2a30'); px.rect(g, X + 1, Y - 4, 3, 4, '#2a2a30'); px.rect(g, X - 3, Y - 20 + fl, 6, 6, '#e0b090'); if (e.who === 'keith') { px.rect(g, X - 5, Y - 22 + fl, 10, 3, '#5a3a1a'); px.poly(g, [[X - 8, Y - 10], [X - 4, Y - 14], [X - 4, Y - 6]], c); } else { px.line(g, X - 3, Y - 20 + fl, X - 5, Y - 26 + fl, '#d8d8d8', 1); px.line(g, X + 3, Y - 20 + fl, X + 5, Y - 26 + fl, '#d8d8d8', 1); } if (e.caught) E.font.text(g, 'OOF!', X, Y - 30, '#ffe04a', { font: 'tiny', align: 'center' }); }, {});
      else if (e.kind === 'fxflag' && e.name === 'flare') { if (EF.fxRng() < .5) PT.smoke(Pitch.X0 + 200 + EF.fx(200), Pitch.Y0 - 24, 40, 1, { size: 8, color: '#a02a2a' }); }
      else if (e.kind === 'fxflag' && e.name === 'fireworks') { if (EF.fxRng() < .08) { const x = EF.fx(Pitch.X0, Pitch.X1), z = 90 + EF.fx(60); PT.glints(x, Pitch.Y0 - 30, z, 14, ['#ffd84a', '#ff6a8a', '#8ad8ff'][Math.floor(EF.fxRng() * 3)]); EF.sfx('firework', { vol: .5 }); } }
      else if (e.kind === 'fxflag' && e.name === 'drone') r.queue(Pitch.CX + Math.sin(e.t * .5) * 160, Pitch.CY + Math.cos(e.t * .7) * 80, 110, g => { const X = Pitch.CX + Math.sin(e.t * .5) * 160, Y = Pitch.CY + Math.cos(e.t * .7) * 80; const [x, y] = r.w(X, Y, 110); px.rect(g, Math.round(x) - 4, Math.round(y) - 1, 8, 2, '#3a3a44'); px.dot(g, Math.round(x) - 5, Math.round(y) - 2, '#ff4a4a'); px.dot(g, Math.round(x) + 5, Math.round(y) - 2, '#4aff6a'); }, { emissive: true });
    }
  }
  drawBall(r) {
    const M = this.M, b = M.ball, id = this.st.ball === 'orange' ? 'orange' : (this.o.ball || 'classic');
    for (const t of this.trail) { const a = 1 - t.t * 2.2; if (a <= 0) continue; r.queue(t.x, t.y, t.z, g => { const [x, y] = r.w(t.x, t.y, t.z); px.blend(g, a * .6, 'add', () => px.disc(g, Math.round(x), Math.round(y), 4 * a + 1, t.c)); }, { emissive: true }); }
    if (b.sup && !b.owner && b.decoys) for (let i = 0; i < b.decoys; i++) { const o = (i + 1) * 9 * (i % 2 ? 1 : -1), a = Math.atan2(b.vy, b.vx) + Math.PI / 2; const dx = Math.cos(a) * o, dy = Math.sin(a) * o; r.sprite(b.x + dx, b.y + dy, b.z + 2.5, EF.ballSprite('gold', Math.floor(b.roll / 8) % 2), { anchor: 'center' }); }
    r.shadow(b.x, b.y, 3 - Math.min(1.8, b.z * .04), .4);
    r.sprite(b.x, b.y, b.z + 2.5, EF.ballSprite(id, Math.floor(b.roll / 8) % 2), { anchor: 'center', glow: b.sup ? 6 : 0 });
  }
  drawMarkers(r) {
    const M = this.M;
    for (const h of M.humans) { const f = h.f; if (!f || f.sentOff) continue; const c = E.PLAYER_COLORS[h.idx] || '#ffe08a';
      r.queue(f.x, f.y, 44, g => { const [x, y] = r.w(f.x, f.y, 46 + Math.sin(this.t * 6) * 1.2), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 4, Y - 6], [X + 4, Y - 6], [X, Y]], c); px.rect(g, X - 4, Y - 7, 8, 1, '#000'); E.font.text(g, 'P' + (h.idx + 1), X, Y - 15, c, { font: 'tiny', align: 'center', shadow: '#000', outline: false }); }, { emissive: true });
      // stamina and shot meter
      if (f.charging || f.stamina < .98) r.queue(f.x, f.y, 40, g => { const [x, y] = r.w(f.x, f.y, -3), X = Math.round(x), Y = Math.round(y); if (f.stamina < .98) E.ui.bar(g, X - 9, Y + 1, 18, 2, f.stamina, f.lowStamina ? '#ff6a4a' : '#7ae87a'); if (f.charging) { const c2 = Math.min(1.6, f.charge) / 1.6; E.ui.bar(g, X - 12, Y + 5, 24, 4, c2, f.charge > 1.15 ? '#ff4a4a' : f.charge > .72 && f.charge < .95 ? '#9aff4a' : '#ffd84a'); px.rect(g, X - 12 + Math.round(24 * .72 / 1.6), Y + 4, 1, 6, '#fff'); px.rect(g, X - 12 + Math.round(24 * .95 / 1.6), Y + 4, 1, 6, '#fff'); } }, { emissive: true });
      // mouse reticle
      if (h.ctl && h.ctl.mouseOn && h.idx === 0) { const g2 = game.mouseGround(); if (g2) r.queue(g2[0], g2[1], 0, g => { const [x, y] = r.w(g2[0], g2[1], 0), X = Math.round(x), Y = Math.round(y); px.line(g, X - 5, Y, X + 5, Y, c, 1); px.line(g, X, Y - 3, X, Y + 3, c, 1); }, { emissive: true }); }
    }
    // the ball's owner (CPU) gets a small dot; the receiver of a pass a ring
    if (M.ball.passTo && !M.ball.owner && M.ball.passTo.side === 0 && !M.ball.passTo.human) { const f = M.ball.passTo; r.queue(f.x, f.y, 0, g => { const [x, y] = r.w(f.x, f.y, 0); px.blend(g, .5, 'add', () => px.disc(g, Math.round(x), Math.round(y), 6, '#ffe08a')); }, { emissive: true }); }
  }
};

//# sourceURL=ef/21-commentary.js
/* ============ 21-commentary: Barry and Trev, the PA, and the line director ============ */
EF.Commentary = class Commentary {
  constructor(M, opts = {}) {
    this.M = M; this.cur = null; this.queue = []; this.last = {}; this.heard = E.store.get('ef:heard', 0); this.quiet = !!opts.quiet; this.paT = 40; this.offs = []; this.recent = [];
    const on = (t, fn) => this.offs.push(EF.bus.on(t, e => { if (e.match === this.M) fn(e); }));
    const F = id => this.M.F[id] ? this.M.F[id].name3 : 'THE PLAYER', TM = s => this.M.teams[s].data.short, kipSide = s => this.M.teams[s].id === 'kip';
    on('kickoff', e => { if (this.M.stats[0].passes + this.M.stats[1].passes < 3 && this.M.clock < 2) this.say('kickoff', 5, { team: this.M.teams[e.side].data.short }); });
    on('goal', e => this.say(e.own ? 'goal' : kipSide(e.side) ? 'goalKip' : 'goal', 10, { player: F(e.who), team: TM(e.side), score: this.M.score[0] + '-' + this.M.score[1] }, true));
    on('save', e => { if (!e.shootout) this.say('save', 5); });
    on('nearMiss', e => this.say(e.over ? 'near' : 'near', 4, { player: F(e.who) }));
    on('post', e => this.say('wood', 6)); on('bar', e => this.say('wood', 6));
    on('tackleWon', e => this.say('tackle', 2)); on('knockdown', e => this.say('slide', 5));
    on('foul', e => this.say('foul', 5)); on('advantage', e => this.say('advantage', 5)); on('card', e => this.say('card', 7));
    on('dive', e => this.say('dive', 4)); on('diveBooked', e => this.say('diveBooked', 8)); on('diveWon', e => this.say('diveWon', 6));
    on('var', e => this.say('var', 8)); on('varDecision', e => this.say(e.overturned ? 'varOver' : 'varStand', 8));
    on('superStrike', e => this.say('super', 9, { player: F(e.who) })); on('saveDuelResult', e => this.say(e.save ? 'duelSave' : 'duelGoal', 9));
    on('skill', e => this.say('skill', 2)); on('rainbow', e => this.say('skill', 3)); on('nutmeg', e => this.say('nutmeg', 6));
    on('header', e => { if (e.shot) this.say('header', 3); }); on('volley', e => this.say('volley', 3)); on('bicycle', e => this.say('bicycle', 7));
    on('penaltyAwarded', e => this.say('penalty', 8)); on('shootoutStart', e => this.say('shootout', 8));
    on('half', e => this.say('halftime', 6, { score: this.M.score[0] + '-' + this.M.score[1] })); on('fulltime', e => { const w = this.M.winner(); this.say(w === 0 && this.M.teams[0].id === 'kip' ? 'fulltimeWin' : w === 1 && this.M.teams[0].id === 'kip' ? 'fulltimeLose' : 'fulltime', 9, { score: this.M.score[0] + '-' + this.M.score[1] }, true); });
    on('goldenGoal', e => this.say('goldenGoal', 8)); on('europhoria', e => this.say('europhoria', 8)); on('euphoriaFull', e => this.say('euphoriaFull', 4));
    on('corner', e => this.say('corner', 2, { team: TM(e.side) })); on('cornerSet', e => this.say('corner', 2, { team: TM(e.side) })); on('freekick', e => this.say('freekick', 4)); on('throwInSet', e => this.say('throwin', 1)); on('goalKickSet', e => this.say('goalkick', 1));
    on('bus', e => this.say('bus', 8)); on('event', e => { const k = { seagull: 'seagull', beachball: 'beachball', invader: 'invader', keith: 'keith', flicker: 'flicker', flare: 'flare', drone: 'drone', fireworks: 'fireworks' }[e.name]; if (k) this.say(k, 6); });
    on('invaderTackled', e => this.say('invader', 6));
  }
  destroy() { for (const o of this.offs) o(); this.offs = []; }
  fill(t, vars) { const M = this.M; return t.replace(/\{(\w+)\}/g, (m, k) => k === 'stadium' ? M.stadium.name : vars[k] !== undefined ? vars[k] : k === 'score' ? M.score[0] + '-' + M.score[1] : k === 'team' ? M.teams[0].data.short : k === 'player' ? 'the lad' : ''); }
  say(kind, pri, vars = {}, force) {
    if (this.quiet || !EF.LINES[kind] || (EF.game.settings && EF.game.settings.commentary === false && EF.game.settings.subtitles === false)) return;
    const now = this.M.t, cd = { tackle: 14, skill: 12, near: 8, save: 7, foul: 6, throwin: 25, goalkick: 25, corner: 14, header: 10, volley: 8, euphoriaFull: 20 }[kind] || 4;
    if (!force && now - (this.last[kind] || -99) < cd) return; this.last[kind] = now;
    const pool = EF.LINES[kind]; let tries = 0, i; do { i = Math.floor(EF.fxRng() * pool.length); } while (this.recent.includes(kind + i) && tries++ < 6); this.recent.push(kind + i); if (this.recent.length > 40) this.recent.shift();
    const parts = pool[i].split(' // ').map(s => this.fill(s, vars)); const lines = parts.map((txt, k) => ({ who: kind === 'pa' ? 'PA' : (k % 2 === 0 ? 'BARRY' : 'TREV'), text: txt }));
    if (this.cur && this.cur.pri >= pri && !force) { if (this.queue.length < 2 && pri >= 4) this.queue.push({ pri, lines }); return; }
    this.start({ pri, lines });
  }
  start(item) { this.cur = { pri: item.pri, lines: item.lines, i: 0, t: 0, shown: 0 }; this.beginLine(); }
  beginLine() { const c = this.cur, ln = c.lines[c.i]; c.t = 0; c.shown = 0; c.dur = 1.2 + ln.text.length * .055; if (EF.game.settings && EF.game.settings.commentary !== false) EF.babble.say(ln.who, ln.text); this.heard++; if (this.heard === 50 && EF.Save) EF.Save.sticker('x:voices'); if (this.heard % 5 === 0) E.store.set('ef:heard', this.heard); }
  update(dt) {
    const c = this.cur; if (!c) { this.paT -= dt; if (this.paT <= 0 && this.M.mode === 'play') { this.paT = 55 + EF.fxRng() * 40; const sv = this.M.rng; this.say('pa', 1, {}, true); } if (this.queue.length) this.start(this.queue.shift()); return; }
    c.t += dt; c.shown = Math.min(c.lines[c.i].text.length, c.t * 38);
    if (c.t > c.dur) { if (c.i < c.lines.length - 1) { c.i++; this.beginLine(); } else { this.cur = null; if (this.queue.length) this.start(this.queue.shift()); } }
  }
};

//# sourceURL=ef/22-hud.js
/* ============ 22-hud: the 10-foot HUD ============ */
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const TXT = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
EF.USED = E.store.get('ef:used', {});
EF.useAction = a => { EF.USED[a] = (EF.USED[a] || 0) + 1; if (EF.USED[a] % 3 === 0 || EF.USED[a] < 4) E.store.set('ef:used', EF.USED); };
EF.showPrompt = a => { const m = game.settings && game.settings.prompts || 'learning'; return m === 'always' || (m === 'learning' && (EF.USED[a] || 0) < 3); };
EF.MatchView.prototype.hud = function (g, r) {
  const M = this.M, W = r.W, H = r.H, ca = game.cornerArea && game.cornerArea(), st = this.st;
  if (this.o.noHud) return;
  const t0 = M.teams[0], t1 = M.teams[1];
  // ---- the score bug ----
  const bx = 6, by = 6, bw = 150, bh = 30;
  E.ui.box(g, bx, by, bw, bh, { bg: ['#101830', '#0a1020'], border: '#5a6a9a', alpha: .92 });
  EF.drawCrest(g, t0.data, bx + 4, by + 3, 1); EF.drawCrest(g, t1.data, bx + bw - 18, by + 3, 1);
  TXT(g, t0.data.code, bx + 22, by + 4, '#c8d4ff', { font: 'tiny' }); TXT(g, t1.data.code, bx + bw - 38, by + 4, '#c8d4ff', { font: 'tiny', align: 'left' });
  TXT(g, String(M.score[0]), bx + 54, by + 5, '#ffffff', { scale: 3 }); TXT(g, '-', bx + 75, by + 7, '#9aa6c8', { scale: 2 }); TXT(g, String(M.score[1]), bx + 88, by + 5, '#ffffff', { scale: 3 });
  if (M.shoot) { TXT(g, '(' + M.shoot.score[0] + '-' + M.shoot.score[1] + ')', bx + 104, by + 10, '#ffd84a', { font: 'tiny' }); }
  const clockTxt = M.rules.training ? 'TRAINING' : M.mode === 'shootout' ? 'PENALTIES' : M.golden ? 'GOLDEN GOAL' : (M.half === 1 ? '1ST' : M.extra ? 'ET' : '2ND') + ' ' + (M.minute < 10 ? '0' : '') + M.minute + "'";
  TXT(g, clockTxt, bx + 4, by + bh + 3, '#ffe7a8', { font: 'tiny' });
  if (M.teams[0].down || M.teams[1].down) { TXT(g, (M.teams[0].down ? t0.data.code + ' -' + M.teams[0].down : '') + ' ' + (M.teams[1].down ? t1.data.code + ' -' + M.teams[1].down : ''), bx + 70, by + bh + 3, '#ff9a8a', { font: 'tiny' }); }
  // ---- the crowd gauges ----
  const gy = by + bh + 14, gw = 150;
  for (let s = 0; s < 2; s++) {
    const v = M.eu[s], full = v >= 1, eur = M.europhoria && M.europhoria.side === s, y = gy + s * 8, col = EF.TEAMCOL(M.teams[s].id, s);
    px.rect(g, bx, y, gw, 6, '#0a0c14'); px.rect(g, bx + 1, y + 1, gw - 2, 4, '#1a2036');
    const fw = Math.round((gw - 2) * v); px.rect(g, bx + 1, y + 1, fw, 4, eur ? (Math.floor(this.t * 12) % 2 ? '#ffd84a' : '#ff7a2a') : full && Math.floor(this.t * 6) % 2 ? '#ffffff' : col);
    if (s === 0 || M.humans.some(h => h.side === s)) TXT(g, eur ? 'EUROPHORIA!' : full ? 'CROWD READY' : 'CROWD', bx + gw + 4, y - 1, eur ? '#ffd84a' : '#9aa6c8', { font: 'tiny' });
  }
  // ---- notices ----
  let ny = 40 + (ca && ca.y1 < 40 ? 0 : 0); EF.notices.forEach(n => { const k = Math.min(1, n.t / .15), a = clamp((n.dur - n.t) / .3, 0, 1), sc = n.scale || 2; const y = Math.round(H * .22 + EF.notices.slice(0, EF.notices.indexOf(n)).reduce((a, m) => a + (m.scale || 2) * 9 + 4, 0)); if (a <= 0) return; TXT(g, n.text, W / 2, y - (1 - k) * 8, n.color, { scale: sc, align: 'center', outline: '#000', shadow: false }); });
  // ---- set-piece banner ----
  if (M.mode === 'setpiece' && M.sp) { const sp = M.sp, nm = { throwin: 'THROW-IN', goalkick: 'GOAL KICK', corner: 'CORNER', freekick: sp.indirect ? 'FREE KICK (INDIRECT)' : 'FREE KICK', penalty: 'PENALTY' }[sp.type]; TXT(g, nm + ' - ' + M.teams[sp.side].data.short, W / 2, H * .15, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false }); }
  if (M.mode === 'kickoff') TXT(g, 'KICK OFF: ' + M.teams[M.restartSide].data.short, W / 2, H * .15, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false });
  // ---- the radar ----
  const s2 = 2.2 / TL, rw = Math.round((Pitch.X1 - Pitch.X0) * s2), rh = Math.round((Pitch.Y1 - Pitch.Y0) * s2), rx = W - rw - 8, ry = (ca && ca.x0 < W - rw - 8 + rw && ca.y1 > 0 ? Math.ceil(ca.y1) + 4 : 8);
  if (!this.o.noRadar) { E.ui.box(g, rx - 2, ry - 2, rw + 4, rh + 4, { bg: '#143a1e', border: '#5a8a66', alpha: .72 }); px.rect(g, rx + rw / 2, ry, 1, rh, '#5a8a66');
    for (const f of M.F) if (!f.sentOff) { const c = EF.TEAMCOL(M.teams[f.side].id, f.side); px.rect(g, Math.round(rx + (f.x - Pitch.X0) * s2) - 1, Math.round(ry + (f.y - Pitch.Y0) * s2) - 1, f.human !== null ? 3 : 2, f.human !== null ? 3 : 2, c); }
    px.rect(g, Math.round(rx + (M.ball.x - Pitch.X0) * s2), Math.round(ry + (M.ball.y - Pitch.Y0) * s2), 2, 2, '#ffffff'); }
  // ---- fog in the second half at Lucchetto ----
  if (st.weather && st.weather.kind === 'fog') { const k = M.half === 2 || M.extra ? .28 : .1; px.blend(g, k, 'normal', () => px.rect(g, 0, 0, W, H, '#c8ccd4')); }
  if (this.flash > 0) { this.flash = Math.max(0, this.flash - .03); px.blend(g, this.flash * .35, 'add', () => px.rect(g, 0, 0, W, H, '#ffffff')); }
  // ---- the Save Duel ----
  const d = M.duel; if (d) { const cx = W / 2, cy = H / 2, k = clamp(d.t / d.dur, 0, 1), rad = 46 - k * 34, sweet = 12; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#000a1a'));
    for (let a = 0; a < 48; a++) { const an = a / 48 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(an) * 46), Math.round(cy + Math.sin(an) * 46), '#3a4a7a'); px.dot(g, Math.round(cx + Math.cos(an) * sweet), Math.round(cy + Math.sin(an) * sweet), '#9aff9a'); px.dot(g, Math.round(cx + Math.cos(an) * rad), Math.round(cy + Math.sin(an) * rad), k > .6 && k < .78 ? '#ffffff' : '#ffd84a'); px.dot(g, Math.round(cx + Math.cos(an) * (rad + 1)), Math.round(cy + Math.sin(an) * (rad + 1)), k > .6 && k < .78 ? '#ffffff' : '#ffd84a'); }
    TXT(g, 'SAVE DUEL!', cx, cy - 66, '#9ae0ff', { scale: 2, align: 'center', outline: '#000', shadow: false });
    const humanDef = M.humans.some(h => h.side === d.side); if (humanDef) EF.prompt(g, cx, cy + 56, 'pass', 'PRESS WHEN THE RINGS MEET!', { align: 'center', player: M.humans.find(h => h.side === d.side).idx }); else TXT(g, 'THE KEEPER READS IT...', cx, cy + 58, '#c8d4ff', { align: 'center' }); }
  // ---- VAR ----
  if (M.var) { const v = M.var; E.ui.box(g, W / 2 - 100, H * .3, 200, 54, { bg: ['#0a1830', '#050c1c'], border: '#9ad8ff', alpha: .94 }); TXT(g, 'VAR', W / 2, H * .3 + 5, '#9ad8ff', { scale: 3, align: 'center' }); TXT(g, v.kind === 'goal' ? 'CHECKING THE GOAL...' : 'CHECKING THE PENALTY...', W / 2, H * .3 + 30, '#e8f0ff', { align: 'center' }); E.ui.bar(g, W / 2 - 80, H * .3 + 44, 160, 5, v.t / v.dur, '#9ad8ff'); }
  // ---- replay ----
  if (M.mode === 'replay') { px.rect(g, 0, 0, W, 14, '#000'); px.rect(g, 0, H - 14, W, 14, '#000'); if (Math.floor(this.t * 2) % 2) px.disc(g, 14, 25, 4, '#ff3a3a'); TXT(g, 'REPLAY', 22, 22, '#ffffff', { scale: 2 }); EF.prompt(g, W - 8, H - 12, 'pass', 'SKIP', { align: 'right', scale: 1, player: 0 }); }
  // ---- cards ----
  // ---- the commentary box ----
  const cm = this.commentary.cur; if (cm && (!game.settings || game.settings.subtitles !== false) && !this.o.noCommentary && M.mode !== 'replay') {
    const ln = cm.lines[cm.i], txt = ln.text.slice(0, Math.floor(cm.shown)), bw2 = Math.min(W - 20, 360), x0 = Math.round((W - bw2) / 2), y0 = H - 40, lines = E.font.wrap(ln.text, bw2 - 16, {}).length;
    E.ui.box(g, x0, y0 - (lines > 1 ? 8 : 0), bw2, 28 + (lines > 1 ? 8 : 0), { bg: ['#101830', '#0a0f20'], border: ln.who === 'TREV' ? '#c88a5a' : ln.who === 'PA' ? '#8a8a9a' : '#5a8ac8', alpha: .88 });
    TXT(g, EF.SPEAKERS[ln.who].name, x0 + 6, y0 - (lines > 1 ? 4 : 0), ln.who === 'TREV' ? '#ffb87a' : ln.who === 'PA' ? '#c8c8d8' : '#8ac8ff', { font: 'tiny' });
    E.font.text(g, txt, x0 + 8, y0 + 6 - (lines > 1 ? 4 : 0), '#fff6e0', { wrap: bw2 - 16, shadow: '#000', outline: false });
  }
  // ---- context prompts for the first human ----
  this.drawPrompts(g, r);
  // ---- shootout tracker ----
  if (M.shoot) { const S = M.shoot; for (let s = 0; s < 2; s++) { for (let i = 0; i < Math.max(5, S.kicks[s].length); i++) { const v = S.kicks[s][i]; px.disc(g, W / 2 - 40 + i * 9, H * .1 + s * 10, 3, v === undefined ? '#3a4a6a' : v ? '#5aff7a' : '#ff5a4a'); } TXT(g, M.teams[s].data.code, W / 2 - 62, H * .1 + s * 10 - 3, '#c8d4ff', { font: 'tiny' }); } }
  // ---- goal celebration picker ----
  const sc = M.goalInfo && (M.mode === 'goal' || M.mode === 'celebrate') ? M.goalInfo : null; if (sc && M.humans.some(h => h.side === sc.side) && !sc.own) { const h = M.humans.find(h => h.side === sc.side); const y = H - 64; TXT(g, 'PICK A CELEBRATION', W / 2, y - 12, '#ffe7a8', { align: 'center', font: 'tiny' }); const opts = [['pass', 'ARMS UP'], ['shoot', 'KNEE SLIDE'], ['lob', 'THE ROBOT'], ['through', 'HELICOPTER']]; let wsum = 0; for (const [a, l] of opts) wsum += EF.promptWidth(a, l, { player: h.idx }) + 12; let x = W / 2 - wsum / 2; for (const [a, l] of opts) { x += EF.prompt(g, x, y, a, l, { player: h.idx }) + 12; } }
  if (M.mode === 'halftime' || M.mode === 'fulltime') this.statsPanel(g, r);
  if (M.mode === 'shootout' && M.shoot && M.shoot.phase === 'ready' && M.shoot.taker && M.shoot.taker.human !== null) { EF.prompt(g, W / 2, H - 52, 'shoot', 'HOLD TO CHARGE, RELEASE TO SHOOT. AIM WITH THE STICK', { align: 'center', player: M.shoot.taker.human }); }
};
EF.MatchView.prototype.statsPanel = function (g, r) {
  const M = this.M, W = r.W, H = r.H, x = W / 2 - 110, y = H * .34; E.ui.box(g, x, y, 220, 88, { bg: ['#101830', '#0a1020'], border: '#8a9ad0', alpha: .94 });
  TXT(g, M.mode === 'halftime' ? 'HALF TIME' : 'FULL TIME', W / 2, y + 5, '#ffd84a', { scale: 2, align: 'center' });
  TXT(g, M.teams[0].data.short + '  ' + M.score[0] + ' - ' + M.score[1] + '  ' + M.teams[1].data.short, W / 2, y + 22, '#ffffff', { align: 'center' });
  const rows = [['SHOTS', s => s.shots], ['ON TARGET', s => s.onTarget], ['PASSES', s => s.passesDone + '/' + s.passes], ['TACKLES', s => s.tackles], ['FOULS', s => s.fouls]];
  rows.forEach(([l, f], i) => { TXT(g, String(f(M.stats[0])), x + 40, y + 36 + i * 9, '#c8d4ff', { font: 'tiny', align: 'center' }); TXT(g, l, W / 2, y + 36 + i * 9, '#8a9ac8', { font: 'tiny', align: 'center' }); TXT(g, String(f(M.stats[1])), x + 180, y + 36 + i * 9, '#c8d4ff', { font: 'tiny', align: 'center' }); });
};
EF.MatchView.prototype.drawPrompts = function (g, r) {
  const M = this.M, W = r.W, H = r.H, h = M.humans[0]; if (!h || !h.f || M.mode === 'replay' || M.mode === 'var' || M.duel) return; const f = h.f, ball = M.ball, idx = h.idx; let items = [];
  const full = M.eu[h.side] >= 1 && !M.europhoria;
  if (M.mode === 'setpiece' && M.sp && M.sp.taker === f) { items = [['pass', 'PASS'], ['shoot', 'SHOOT (HOLD)'], ['lob', M.sp.type === 'corner' ? 'CROSS' : 'LOB']]; if (M.sp.type === 'penalty') items = [['shoot', 'HOLD, AIM, RELEASE']]; }
  else if (M.mode === 'play') {
    if (ball.owner === f) items = [['pass', 'PASS'], ['shoot', 'SHOOT'], ['lob', 'LOB'], ['through', 'THROUGH'], ['skill', 'SKILL'], ['dive', 'DIVE']].filter(([a]) => EF.showPrompt(a));
    else if (!ball.owner && ball.z > 6 && ball.z < 40 && Math.hypot(ball.x - f.x, ball.y - f.y) < 40) items = [['shoot', ball.z > 15 ? 'HEADER' : 'VOLLEY'], ['pass', 'HEAD IT ON']];
    else if (ball.owner && ball.owner.side !== f.side) items = [['pass', 'TACKLE'], ['shoot', 'SLIDE'], ['lob', 'BARGE'], ['through', 'SWITCH']].filter(([a]) => EF.showPrompt(a === 'pass' ? 'tackle' : a === 'shoot' ? 'slide' : a === 'lob' ? 'barge' : 'switch'));
  }
  if (full) items.unshift(['euphoria', 'EUROPHORIA!']);
  if (!items.length) return;
  let wsum = 0; for (const [a, l] of items) wsum += EF.promptWidth(a, l, { player: idx }) + 14; let x = W / 2 - wsum / 2; const y = H - 62 - (this.commentary.cur ? 0 : -12);
  px.blend(g, .5, 'normal', () => px.rect(g, Math.round(x) - 6, y - 4, Math.round(wsum) + 2, 18, '#000')); for (const [a, l] of items) { x += EF.prompt(g, x, y, a, l, { player: idx, color: a === 'euphoria' ? '#ffd84a' : '#fff6e0' }) + 14; }
};

//# sourceURL=ef/30-ui.js
/* ============ 30-ui: the 10-foot UI kit: menus that d-pad, stick, keys and the mouse all drive ============ */
EF.lastInput = 0; EF.lastPointer = [0, 0];
if (typeof addEventListener === 'function') for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { EF.lastInput = performance.now(); }, true);
EF.pollPads = () => { try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p) { if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) EF.lastInput = performance.now(); } } catch (e) { /* none */ } };
const UI = EF.UI = {};
UI.anyP = a => game.players.some(p => p.pressed(a));
UI.anyRep = a => game.players.some(p => p.repeat(a, .32, .09));
UI.eatAll = () => game.players.forEach(p => p.consumeAll && p.consumeAll());
UI.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#121a3a', '#0a1028'], border: '#5a6a9a', alpha: .94 }, o));
UI.footer = (g, r, items, player = 0) => {
  const h = 16; px.rect(g, 0, r.H - h - 2, r.W, h + 2, '#05060f'); let wsum = 0; for (const [a, l] of items) wsum += EF.promptWidth(a, l, { player }) + 14; let x = Math.round(r.W / 2 - wsum / 2);
  for (const [a, l] of items) x += EF.prompt(g, x, r.H - h, a, l, { player }) + 14;
};
UI.stadiumBg = (r, t) => {
  r.sky(['#06081a', '#141a3a', '#2a2050']);
  r.overlay(g => { const W = r.W, H = r.H; for (let i = 0; i < 40; i++) px.dot(g, Math.round((i * 97.3 + 13) % W), Math.round((i * 53.7 + 5) % (H * .5)), (i + Math.floor(t * 2)) % 7 ? '#8a94c8' : '#ffffff');
    // floodlight beams
    px.blend(g, .1, 'add', () => { for (const k of [.16, .84]) px.poly(g, [[W * k - 6, 0], [W * k + 6, 0], [W * k + (k < .5 ? 90 : -90), H], [W * k + (k < .5 ? -30 : 30), H]], '#fff2c0'); });
    px.rect(g, 0, Math.round(H * .74), W, Math.ceil(H * .26), '#10381c'); for (let i = 0; i < 12; i++) px.rect(g, i * Math.ceil(W / 12), Math.round(H * .74), Math.ceil(W / 24), Math.ceil(H * .26), '#134422');
    px.rect(g, 0, Math.round(H * .74), W, 2, '#e8ecf4'); });
};
/** Menu: items [{ label, sub?, type: 'button'|'toggle'|'slider'|'select', get, set, min, max, step, options, onPick, disabled, hint }] */
UI.Menu = class Menu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ x: null, y: 70, w: 220, h: 24, scale: 2, onCancel: null, title: null, align: 'center' }, o); this.rects = []; this.lp = [-1, -1]; this.hot = 0; }
  focusable(i) { return this.items[i] && !this.items[i].disabled && !this.items[i].header; }
  move(d) { let n = this.i; for (let k = 0; k < this.items.length; k++) { n = (n + d + this.items.length) % this.items.length; if (this.focusable(n)) { this.i = n; EF.sfx('select'); return; } } }
  adjust(it, d) {
    if (it.onAdjust) { it.onAdjust(d); return; }
    if (it.type === 'toggle') { it.set(!it.get()); EF.sfx('select'); }
    else if (it.type === 'slider') { const s = it.step || .05; it.set(clamp(+(it.get() + d * s).toFixed(4), it.min === undefined ? 0 : it.min, it.max === undefined ? 1 : it.max)); EF.sfx('euTick'); }
    else if (it.type === 'select') { const opts = it.options, k = opts.findIndex(o => (Array.isArray(o) ? o[0] : o) === it.get()); const n = (k + d + opts.length) % opts.length; it.set(Array.isArray(opts[n]) ? opts[n][0] : opts[n]); EF.sfx('select'); }
  }
  update(dt) {
    const o = this.o; if (!this.focusable(this.i)) this.move(1);
    if (UI.anyRep('up')) this.move(-1); else if (UI.anyRep('down')) this.move(1);
    const it = this.items[this.i];
    if (it) {
      if (UI.anyRep('left')) this.adjust(it, -1); else if (UI.anyRep('right')) this.adjust(it, 1);
      if (UI.anyP('confirm') || UI.anyP('start')) { UI.eatAll(); if (it.type === 'toggle') this.adjust(it, 1); else if (it.type === 'select') this.adjust(it, 1); else if (it.onPick) { EF.sfx('confirm'); it.onPick(this.i, it); } }
    }
    if (UI.anyP('cancel') && o.onCancel) { UI.eatAll(); EF.sfx('cancel'); o.onCancel(); return; }
    // the mouse: hover moves the focus, a click picks (the left half of a slider lowers it)
    const p = game.input.pointer && game.input.pointer(), c = game.input.clicked && game.input.clicked();
    if (p && (p[0] !== this.lp[0] || p[1] !== this.lp[1])) { this.lp = [p[0], p[1]]; this.rects.forEach((rc, k) => { if (rc && p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3] && this.focusable(k) && this.i !== k) { this.i = k; EF.sfx('select'); } }); }
    if (c) this.rects.forEach((rc, k) => { if (rc && c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3] && this.focusable(k)) { this.i = k; const it2 = this.items[k]; if (it2.type === 'slider') { const f = (c[0] - rc[0]) / rc[2]; it2.set(clamp(+(it2.min + (it2.max - it2.min) * f).toFixed(3), it2.min, it2.max)); } else if (it2.type === 'toggle' || it2.type === 'select') this.adjust(it2, c[0] < rc[0] + rc[2] * .3 ? -1 : 1); else if (it2.onPick) { EF.sfx('confirm'); it2.onPick(k, it2); } } });
  }
  draw(r) {
    const o = this.o, W = r.W, w = o.w, x = o.x === null ? Math.round((W - w) / 2) : o.x; this.rects = [];
    r.overlay(g => {
      let y = o.y; if (o.title) { TXT(g, o.title, W / 2, y - 28, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false }); }
      this.items.forEach((it, k) => {
        const h = it.h || o.h, foc = k === this.i && !it.header; this.rects[k] = it.header ? null : [x, y, w, h - 2];
        if (it.header) { TXT(g, it.label, x + w / 2, y + 4, '#8a9ac8', { align: 'center' }); y += h - 6; return; }
        const col = it.disabled ? '#5a6080' : foc ? '#ffffff' : '#c8d0ec';
        if (foc) { const pulse = Math.floor(this.hot += .02) % 2; px.rect(g, x - 3, y - 1, w + 6, h, '#0a1030'); px.rect(g, x - 2, y, w + 4, h - 2, '#ffc83a'); px.rect(g, x - 1, y + 1, w + 2, h - 4, '#1c2a5a'); px.poly(g, [[x - 10, y + h / 2 - 4], [x - 4, y + h / 2], [x - 10, y + h / 2 + 4]], '#ffc83a'); }
        const ty = y + Math.round((h - 2 - 7 * o.scale) / 2) + 1;
        if (it.type === 'slider') { TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); const bw = Math.round(w * .38), bx = x + w - bw - 8; px.rect(g, bx, y + 7, bw, 8, '#0a0c14'); const f = (it.get() - it.min) / (it.max - it.min); px.rect(g, bx + 1, y + 8, Math.round((bw - 2) * clamp(f, 0, 1)), 6, foc ? '#ffc83a' : '#6a7ab0'); TXT(g, it.fmt ? it.fmt(it.get()) : Math.round(it.get() * 100) + '%', bx - 6, ty + 2, col, { font: 'tiny', align: 'right' }); }
        else if (it.type === 'toggle') { TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); TXT(g, it.get() ? 'ON' : 'OFF', x + w - 8, ty, it.get() ? '#7aff9a' : '#ff8a7a', { scale: o.scale, align: 'right' }); }
        else if (it.type === 'select') { const cur = it.options.find(op => (Array.isArray(op) ? op[0] : op) === it.get()), nm = Array.isArray(cur) ? cur[1] : cur; TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); TXT(g, (foc ? '< ' : '') + nm + (foc ? ' >' : ''), x + w - 8, ty, foc ? '#ffe7a8' : '#aab4d8', { scale: o.scale, align: 'right' }); }
        else if (it.draw) { TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); it.draw(g, x, y, w, h, foc); }
        else { TXT(g, it.label, o.align === 'center' ? x + w / 2 : x + 8, ty, col, { scale: o.scale, align: o.align === 'center' ? 'center' : 'left' }); if (it.sub) TXT(g, it.sub, x + w - 8, ty + 4, '#8a9ac8', { font: 'tiny', align: 'right' }); }
        y += h;
      });
      const it = this.items[this.i]; if (it && it.hint) TXT(g, it.hint, W / 2, r.H - 34, '#c8d4ff', { align: 'center' });
    });
  }
};
EF.TXT = TXT;

//# sourceURL=ef/31-front.js
/* ============ 31-front: title, kick-about setup, penalties setup, sticker album, about ============ */
const OPPS = ['kip', 'hoo', 'rpp', 'svs', 'acl', 'opu', 'gulls'];
const teamOpts = () => OPPS.map(t => [t, EF.get('team', t).name]);
const ballOpts = () => { const u = EF.Save.load().unlocks; return EF.BALLS.filter(b => b.id === 'classic' || b.id === 'orange' || (b.id === 'leather' && u.leather) || (b.id === 'gold' && u.cup)).map(b => [b.id, b.name]); };
const stadOpts = () => ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium', 'rec'].map(s => [s, EF.get('stadium', s).name]);
EF.idle = 0;
EF.idleStep = (dt, scene) => {
  EF.pollPads(); const p = game.input.pointer && game.input.pointer(); if (p && (p[0] !== EF.lastPointer[0] || p[1] !== EF.lastPointer[1])) { EF.lastPointer = [p[0], p[1]]; EF.lastInput = performance.now(); }
  if (game.players.some(q => q.anyPressed && q.anyPressed())) EF.lastInput = performance.now();
  if (performance.now() - EF.lastInput > 10000 && !EF.session && !EF.noAttract) { EF.lastInput = performance.now(); game.go('attract', { from: scene }); }
};
/* ---- TITLE ---- */
const titleStage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'ground', side: '#2a6a34' } }, edges: 'open' });
const titleBg = new E.Backdrop({ sky: ['#05060f', '#141a3a', '#3a2a58'], moon: { x: .8, y: .2, r: 12, color: '#e8e4c8' }, stars: 50, layers: [{ kind: 'city', color: '#0c1024', y: .72, height: .22, parallax: 0 }, { kind: 'hills', color: '#101830', y: .8, height: .12, parallax: 0 }] });
EF.scenes.title = {
  view: 'side', views: ['side'], input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() {
    if (EF.pendingDrill) { const id = EF.pendingDrill; EF.pendingDrill = null; EF.startDrill(id); return; }
    EF.music('title'); game.resetCamera && game.resetCamera(); game.follow(null); game.cam.bounds = null; L.enabled = false; EF.lastInput = performance.now(); game.weather = null; EF.notices = []; game.input.touchEnabled = false;
    const kip = EF.get('team', 'kip'); this.rigs = kip.players.map((p, i) => ({ rig: EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: kip.kit }, { kit: kip.kit }], }, 0) : kip.kit, i === 0 ? 'GK' : p.pos, { gloves: '#fff' }), x: 530 + i * 34 })); this.t = 0; this.ball = { x: 700, z: 0, vz: 0 };
    const sv = EF.Save.load(), items = [];
    if (sv.started && sv.round < 5) items.push({ label: 'CONTINUE CUP RUN', sub: 'ROUND ' + (sv.round + 1), hint: 'Back to the Europhoria Cup: ' + EF.STORY.rounds[sv.round].name, onPick: () => game.go('cup', { resume: true }) });
    items.push({ label: sv.started && sv.round < 5 ? 'NEW CUP RUN' : 'CUP RUN', hint: 'Five rounds from the Smokehouse to the Euphorium. Co-op welcome.', onPick: () => { EF.Save.reset(); EF.Save.load().started = true; EF.Save.save(); game.go('cup', { fresh: true }); } });
    items.push({ label: 'KICK-ABOUT', hint: '5-a-side, one to four players, any teams.', onPick: () => game.go('setup') });
    items.push({ label: 'PENALTIES', hint: 'A shootout, and nothing else. Hold your nerve.', onPick: () => game.go('penaltysetup') });
    items.push({ label: 'TRAINING', hint: 'Nine drills with Mags, Sandra and the lads.', onPick: () => game.go('training') });
    items.push({ label: 'STICKER ALBUM', sub: EF.Save.count() + '/' + EF.STICKERS.length, hint: 'Collect them all.', onPick: () => game.go('album') });
    items.push({ label: 'OPTIONS', hint: 'Settings, sound, controls, button symbols.', onPick: () => game.menu('settings') });
    items.push({ label: 'ABOUT AND CREDITS', hint: 'Who made this, with what, and how.', onPick: () => game.go('about') });
    this.menu = new UI.Menu(items, { y: 88, w: 190, h: 17, scale: 1, x: 20 }); this.touch = EF.touchOnly();
    this.touchBtn = null;
  },
  update(dt) {
    if (!this.rigs) return; this.t += dt; EF.idleStep(dt, 'title');
    if (EF.touchOnly()) { const c = game.input.clicked && game.input.clicked(); if (c && this.touchRect && c[0] >= this.touchRect[0] && c[0] < this.touchRect[0] + this.touchRect[2] && c[1] >= this.touchRect[1] && c[1] < this.touchRect[1] + this.touchRect[3]) game.menu('settings'); return; }
    this.menu.update(dt);
    game.focus(430, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    this.rigs.forEach((h, i) => { const u = (this.t * .4 + i * .3) % 3; h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: i === 0 ? Math.PI : 0, vx: 0, vy: 0, pose: u < 2 ? 'cheer' : 'hips', expr: u < 2 ? 'shout' : 'smile', attack: i === 4 && u > 2.5 ? E.move('kick', (u - 2.5) * 2) : null }); });
    // the ball bounces
    this.ball.vz -= 400 * dt; this.ball.z += this.ball.vz * dt; if (this.ball.z < 0) { this.ball.z = 0; this.ball.vz = 150; }
  },
  draw(r) {
    if (!this.rigs) return; titleBg.draw(r); titleStage.draw(r); const view = E.charView(r.view);
    for (const x of [330, 760]) { r.prop('streetlamp', x, 0, 32, { size: 1.6, light: true }); }
    for (const h of this.rigs) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, view));
    r.sprite(this.ball.x, 0, 32 + this.ball.z + 3, EF.ballSprite('classic', Math.floor(this.t * 4) % 2), { anchor: 'center' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, 230, H, '#05060f'));
      E.font.title(g, 'EUROPHORIA', 120, 10, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.title(g, 'FOOTBALL', 120, 40, { align: 'center', scale: 3, colors: ['#e8f4ff', '#9ad8ff', '#4a8aff', '#2a4ab0'], depth: 3 });
      TXT(g, 'FISH OUT OF WATER. FANS OUT OF CONTROL.', 120, 70, '#ffe7a8', { font: 'tiny', align: 'center' });
      if (EF.touchOnly()) { const bw = 250, bx = Math.round((W - bw) / 2) + 30, by = Math.round(H * .3); UI.panel(g, bx - 6, by - 6, bw + 12, 96); TXT(g, 'CONTROLLER OR KEYBOARD REQUIRED', bx + bw / 2, by + 6, '#ffe08a', { scale: 1, align: 'center' }); TXT(g, 'Plug in a pad, or press a key.', bx + bw / 2, by + 22, '#c8d4ff', { align: 'center' }); px.rect(g, bx + 60, by + 44, bw - 120, 24, '#ffc83a'); px.rect(g, bx + 62, by + 46, bw - 124, 20, '#1c2a5a'); TXT(g, 'SETTINGS', bx + bw / 2, by + 51, '#ffffff', { scale: 2, align: 'center' }); this.touchRect = [bx + 60, by + 44, bw - 120, 24]; TXT(g, 'THE DEMO WILL PLAY ITSELF IN A MOMENT', bx + bw / 2, by + 78, '#8a9ac8', { font: 'tiny', align: 'center' }); }
      TXT(g, 'DEMO v1  -  my-3D2dge ' + E.version, 6, H - 20, '#6a7ab0', { font: 'tiny' });
    });
    if (!EF.touchOnly()) { this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT'], ['up', 'MOVE']])); }
  }
};
/* ---- KICK-ABOUT SETUP ---- */
EF.setup = { home: 'kip', away: 'hoo', stadium: 'smokehouse', ref: 'haltwhistle', half: '120', sides: [0, -1, -1, -1], joined: [true, false, false, false] };
EF.scenes.setup = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() {
    const S = EF.setup; EF.music('cup'); game.follow(null); L.enabled = false; EF.lastInput = performance.now();
    game.allowJoin({ max: 4, onJoin: (input, n) => { S.joined[n] = true; S.sides[n] = n % 2 ? 1 : 0; EF.sfx('confirm'); } });
    this.menu = new UI.Menu([
      { label: 'HOME', type: 'select', options: teamOpts(), get: () => S.home, set: v => { S.home = v; }, hint: 'The team on the left.' },
      { label: 'AWAY', type: 'select', options: teamOpts(), get: () => S.away, set: v => { S.away = v; } },
      { label: 'STADIUM', type: 'select', options: stadOpts(), get: () => S.stadium, set: v => { S.stadium = v; } },
      { label: 'REFEREE', type: 'select', options: EF.all('referee').map(x => [x.id, x.name]), get: () => S.ref, set: v => { S.ref = v; } },
      { label: 'HALF LENGTH', type: 'select', options: [['60', '1:00'], ['120', '2:00'], ['180', '3:00']], get: () => S.half, set: v => { S.half = v; } },
      { label: 'BALL', type: 'select', options: ballOpts(), get: () => EF.Save.load().ballId, set: v => { EF.Save.load().ballId = v; EF.Save.save(); }, hint: 'Win the cup and clear all five Gaffer\'s Challenges to unlock more.' },
      { label: 'PLAYERS', type: 'custom', h: 34, onAdjust: d => { const cyc = [0, -1, 1]; const k = cyc.indexOf(S.sides[0]); S.sides[0] = cyc[(k + (d > 0 ? 1 : 2)) % 3]; }, hint: 'Start (pad) or 2 (keyboard) joins. Left and right move you between the teams.',
        draw: (g, x, y, w, h, foc) => { const cols = [['HOME', 0], ['CPU', -1], ['AWAY', 1]], cw = 62, x0 = x + w - cw * 3 - 4; cols.forEach(([nm, sd], c) => { const cx = x0 + c * cw; px.rect(g, cx, y + 1, cw - 3, h - 4, foc ? '#2a3a7a' : '#161e44'); TXT(g, nm, cx + 3, y + 3, '#8a9ac8', { font: 'tiny' }); let n = 0; for (let i = 0; i < 4; i++) if (S.joined[i] && S.sides[i] === sd) { px.rect(g, cx + 3 + n * 14, y + 14, 13, 10, E.PLAYER_COLORS[i]); TXT(g, 'P' + (i + 1), cx + 9 + n * 14, y + 16, '#000', { font: 'tiny', align: 'center', shadow: false }); n++; } }); } },
      { label: 'KICK OFF', onPick: () => this.go() }, { label: 'BACK', onPick: () => game.go('title') }], { y: 28, w: 260, h: 16, scale: 1, onCancel: () => game.go('title') });
  },
  go() {
    const S = EF.setup, humans = []; for (let i = 0; i < 4; i++) if (S.joined[i] && S.sides[i] >= 0 && game.players[i]) humans.push({ idx: i, side: S.sides[i] });
    game.allowJoin(false);
    game.go('match', { mode: 'kickabout', home: S.home, away: S.away, stadium: S.stadium, ref: S.ref, humans, rules: { needWinner: false, halfSecs: +S.half }, seed: (Date.now() % 1000) });
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    const S = EF.setup; EF.idleStep(dt, 'setup');
    for (let i = 1; i < 4; i++) { const p = game.players[i]; if (p && S.joined[i]) { const cyc = [0, -1, 1]; if (p.pressed('left')) S.sides[i] = cyc[(cyc.indexOf(S.sides[i]) + 2) % 3]; if (p.pressed('right')) S.sides[i] = cyc[(cyc.indexOf(S.sides[i]) + 1) % 3]; } }
    this.menu.update(dt);
  },
  draw(r) {
    UI.stadiumBg(r, game.time); const S = EF.setup, menu = this.menu;
    r.overlay(g => { const W = r.W; E.font.title(g, 'KICK-ABOUT', W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
      const t0 = EF.get('team', S.home), t1 = EF.get('team', S.away);
      EF.drawCrest(g, t0, 24, 60, 3); EF.drawCrest(g, t1, W - 24 - 36, 60, 3); TXT(g, t0.nick, 42, 108, '#c8d4ff', { font: 'tiny', align: 'center' }); TXT(g, t1.nick, W - 42, 108, '#c8d4ff', { font: 'tiny', align: 'center' });
    });
    this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]));
  }
};
/* ---- PENALTIES SETUP ---- */
EF.penSetup = { home: 'kip', away: 'acl' };
EF.scenes.penaltysetup = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { const S = EF.penSetup; EF.music('cup'); L.enabled = false; EF.lastInput = performance.now(); game.allowJoin({ max: 2 });
    this.menu = new UI.Menu([{ label: 'YOUR TEAM', type: 'select', options: teamOpts(), get: () => S.home, set: v => { S.home = v; } }, { label: 'OPPONENT', type: 'select', options: teamOpts(), get: () => S.away, set: v => { S.away = v; } },
      { label: 'DIFFICULTY', type: 'select', options: [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], get: () => game.settings.difficulty, set: v => game.settings.set('difficulty', v) },
      { label: 'TO THE SPOT', onPick: () => { game.allowJoin(false); const humans = [{ idx: 0, side: 0 }]; if (game.players[1]) humans.push({ idx: 1, side: 1 }); game.go('match', { mode: 'penalties', home: S.home, away: S.away, stadium: 'euphorium', humans, rules: { shootoutOnly: true, needWinner: true, euphoria: false }, noEvents: true, seed: Date.now() % 997 }); } }, { label: 'BACK', onPick: () => game.go('title') }],
      { y: 56, w: 260, h: 20, scale: 1, onCancel: () => game.go('title') }); },
  exit() { game.allowJoin(false); },
  update(dt) { EF.idleStep(dt, 'penaltysetup'); this.menu.update(dt); },
  draw(r) { UI.stadiumBg(r, game.time); r.overlay(g => { E.font.title(g, 'PENALTIES', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); TXT(g, 'Stick to aim, hold to charge, release to shoot. Keep by diving the right way. Players 1 and 2 may share.', r.W / 2, 34, '#c8d4ff', { font: 'tiny', align: 'center' }); }); this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']])); }
};
/* ---- STICKER ALBUM ---- */
EF.scenes.album = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { this.page = 0; this.i = 0; this.per = 15; this.rigCache = {}; EF.music('cup'); L.enabled = false; EF.lastInput = performance.now(); this.rects = []; EF.newStickers = []; },
  update(dt) {
    EF.idleStep(dt, 'album'); const n = EF.STICKERS.length, pages = Math.ceil(n / this.per);
    if (UI.anyRep('left')) this.i = Math.max(0, this.i - 1); if (UI.anyRep('right')) this.i = Math.min(n - 1, this.i + 1); if (UI.anyRep('up')) this.i = Math.max(0, this.i - 5); if (UI.anyRep('down')) this.i = Math.min(n - 1, this.i + 5);
    if (UI.anyP('switch') || UI.anyP('skill')) { this.i = clamp(this.i + (UI.anyP('skill') ? this.per : -this.per), 0, n - 1); }
    this.page = Math.floor(this.i / this.per);
    const p = game.input.pointer && game.input.pointer(); if (p && (p[0] !== this.lp?.[0] || p[1] !== this.lp?.[1])) { this.lp = [p[0], p[1]]; this.rects.forEach(rc => { if (p[0] >= rc.x && p[0] < rc.x + rc.w && p[1] >= rc.y && p[1] < rc.y + rc.h) this.i = rc.k; }); }
    if (UI.anyP('cancel') || UI.anyP('confirm')) { UI.eatAll(); game.go('title'); }
  },
  rigFor(s) { if (!this.rigCache[s.id]) { const t = EF.get('team', s.ref), p = t.players[s.idx]; this.rigCache[s.id] = EF.makeRig(p, t.kit, p.pos, { gloves: '#fff' }); } return this.rigCache[s.id]; },
  draw(r) {
    UI.stadiumBg(r, game.time); const per = this.per, W = r.W, n = EF.STICKERS.length; this.rects = [];
    r.overlay(g => {
      E.font.title(g, 'STICKER ALBUM', W / 2, 6, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); TXT(g, EF.Save.count() + ' / ' + n + '   PAGE ' + (this.page + 1) + ' / ' + Math.ceil(n / per), W / 2, 28, '#c8d4ff', { align: 'center' });
      const cw = 62, ch = 52, gx = Math.round((W - cw * 5) / 2), gy = 42;
      for (let k = this.page * per; k < Math.min(n, (this.page + 1) * per); k++) {
        const s = EF.STICKERS[k], c = k - this.page * per, x = gx + (c % 5) * cw, y = gy + Math.floor(c / 5) * (ch + 4), own = EF.Save.has(s.id), foc = k === this.i;
        this.rects.push({ x, y, w: cw - 4, h: ch, k });
        px.rect(g, x, y, cw - 4, ch, foc ? '#ffc83a' : '#0a0c14'); px.rect(g, x + 1, y + 1, cw - 6, ch - 2, own ? (s.kind === 'shiny' ? '#4a3a10' : '#1c2a5a') : '#141a2a');
        if (own) {
          if (s.kind === 'player') { this.rigFor(s).drawPortrait(g, x + (cw - 4) / 2 - 16, y + 3, 32); } else if (s.kind === 'crest') EF.drawCrest(g, s.ref, x + (cw - 4) / 2 - 12, y + 6, 2); else if (s.kind === 'stadium') { const st = EF.get('stadium', s.ref); px.rect(g, x + 6, y + 8, cw - 16, 20, st.sky[0]); px.rect(g, x + 6, y + 22, cw - 16, 10, EF.shade('#487a3a', 1)); } else if (s.kind === 'shiny') { px.poly(g, [[x + 27, y + 6], [x + 31, y + 18], [x + 44, y + 18], [x + 34, y + 26], [x + 38, y + 38], [x + 27, y + 30], [x + 16, y + 38], [x + 20, y + 26], [x + 10, y + 18], [x + 23, y + 18]], Math.floor(game.time * 4) % 2 ? '#ffe08a' : '#ffc83a'); } else TXT(g, '*', x + 28, y + 12, '#ffd84a', { scale: 3, align: 'center' });
          TXT(g, s.name.split(' ').slice(0, 2).join(' ').slice(0, 14), x + 29, y + ch - 10, '#e8ecff', { font: 'tiny', align: 'center' });
        } else { TXT(g, '?', x + 29, y + 10, '#2a3a6a', { scale: 4, align: 'center' }); }
      }
      const s = EF.STICKERS[this.i]; const own = EF.Save.has(s.id); UI.panel(g, 20, r.H - 52, W - 40, 28); TXT(g, own ? s.name : '???', 28, r.H - 48, own ? '#ffe08a' : '#8a9ac8', { scale: 1 }); TXT(g, s.how, 28, r.H - 36, '#c8d4ff', { font: 'tiny' });
      UI.footer(g, r, [['cancel', 'BACK'], ['switch', 'PREV PAGE'], ['skill', 'NEXT PAGE']]);
    });
  }
};
/* ---- ABOUT AND CREDITS ---- */
EF.scenes.about = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { this.scroll = 0; EF.music('cup'); L.enabled = false; EF.lastInput = performance.now();
    const A0 = ABOUT.sourceInformation || {}, row = (k, v) => v ? [k + ': ' + v] : [];
    this.lines = [['EUROPHORIA FOOTBALL', 'h'], ['Over-the-top arcade football. A broke seaside club gets into the continent\'s biggest cup because of a typo.', ''], ['', ''], ['SOURCE INFORMATION', 'h'],
      ...[['Date', A0.date], ['Source', A0.source], ['Plan', A0.plan], ['Genre', A0.genre], ['Perspective', A0.perspective], ['Tech', A0.tech], ['Art direction', A0.artDirection], ['Animation', A0.animation], ['Audio', A0.audio], ['Online', A0.online], ['Testing', A0.testing], ['Research', A0.research], ['Environment', A0.environment], ['Model', A0.model], ['Usage', A0.usage]].map(([k, v]) => [k.toUpperCase() + ': ' + (v || 'unknown'), '']),
      ['', ''], ['TESTING FEEDBACK', 'h'], ...(ABOUT.testingFeedback || ['unknown']).map(s => [s, '']), ['', ''], ['ENGINE FEEDBACK', 'h'], ...(ABOUT.engineFeedback || ['unknown']).map(s => [s, '']), ['', ''], ['PROMPT FEEDBACK', 'h'], ...(ABOUT.promptFeedback || ['unknown']).map(s => [s, '']),
      ['', ''], ['CREDITS', 'h'], ['Engine: my-3D2dge (handoff package v0.85.2), with the changes listed in engine/CHANGES-ENGINE.md.', ''], ['Online: AI Hub Session Protocol v1, client 1.4.0.', ''], ['Everything is drawn and heard by code: no image or sound files.', ''], ['All clubs, players and people in this game are made up. Any resemblance to a real fish is a coincidence.', ''], ['Commentary by Barry and Trev, who are not real either.', '']];
  },
  update(dt) { EF.idleStep(dt, 'about'); if (UI.anyRep('down')) this.scroll += 12; if (UI.anyRep('up')) this.scroll = Math.max(0, this.scroll - 12); this.scroll += (game.input.pressed ? 0 : 0); if (UI.anyP('cancel') || UI.anyP('confirm')) { UI.eatAll(); game.go('title'); } },
  draw(r) {
    UI.stadiumBg(r, game.time); const W = r.W, H = r.H, bw = Math.min(W - 24, 380);
    r.overlay(g => { UI.panel(g, (W - bw) / 2, 8, bw, H - 34);
      let y = 14 - this.scroll, maxY = 0;
      for (const [t0, k] of this.lines) { const t = String(t0).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '-'); const lines = E.font.wrap(t, bw - 20, k === 'h' ? { scale: 1 } : { font: 'tiny' }); for (const ln of lines) { if (y > 4 && y < H - 30) TXT(g, ln, (W - bw) / 2 + 10, y, k === 'h' ? '#ffe08a' : '#dfe6ff', k === 'h' ? {} : { font: 'tiny' }); y += k === 'h' ? 11 : 8; } if (!lines.length) y += 6; }
      this.scroll = Math.min(this.scroll, Math.max(0, y + this.scroll - (H - 34)));
      UI.footer(g, r, [['cancel', 'BACK'], ['up', 'SCROLL']]); });
  }
};

//# sourceURL=ef/32-cup.js
/* ============ 32-cup: the Cup Run: tabloids, talks, the map, team talks, the tunnel, the ending ============ */
const rigCache = {};
EF.speakerRig = id => {
  if (rigCache[id]) return rigCache[id]; const sp = EF.SPEAKERS[id]; let rig;
  if (sp.team) { const t = EF.get('team', sp.team), p = t.players[sp.idx]; rig = EF.makeRig(p, t.kit, p.pos, {}); }
  else rig = new E.Humanoid(Object.assign({ size: 1.15, weapon: null }, sp.rig));
  return (rigCache[id] = rig);
};
EF.Talk = class Talk {
  constructor(lines, done, place = 'bottom') { this.lines = lines; this.i = 0; this.done = done; this.dlg = new E.Dialog(game, { place, lines: 3, border: '#ffc83a', bg: ['#101a40', '#0a1028'], speed: 38 }); this.next(); }
  next() { if (this.i >= this.lines.length) { this.finished = true; if (this.done) this.done(); return; } const [who, text] = this.lines[this.i++]; this.who = who; this.dlg.voice = EF.babble.voiceFor(who); const rig = EF.speakerRig(who); this.dlg.say(text, { name: EF.SPEAKERS[who].name, portrait: rig, portraitSize: 44, portraitOpts: { zoom: 3, turn: .4 }, onDone: () => this.next() }); }
  update(dt) { return this.dlg.update(dt); }
  draw(r) { this.dlg.draw(r); }
};
const wrapTxt = (g, text, x, y, w, c, o = {}) => { const lines = E.font.wrap(text, w, o); lines.forEach((ln, i) => E.font.text(g, ln, x, y + i * ((o.scale || 1) * 9 + 2), c, Object.assign({ outline: false }, o))); return lines.length; };
EF.drawTabloid = (r, t, paper, head, sub, photoTeams, o = {}) => {
  r.overlay(g => {
    const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#d8cfb8'); px.rect(g, 10, 6, W - 20, H - 40, '#efe8d4'); px.rect(g, 10, 6, W - 20, 3, '#14161e');
    E.font.title(g, paper, W / 2, 12, { align: 'center', scale: 2, colors: ['#e03a2a', '#b02018'], depth: 1, depthColor: '#4a0a08' });
    px.rect(g, 16, 34, W - 32, 1, '#14161e'); TXT(g, 'TUESDAY  -  PRICE: A KIPPER  -  EUROPHORIA CUP SPECIAL', W / 2, 38, '#4a4a54', { font: 'tiny', align: 'center', shadow: false });
    const k = Math.min(1, t * 4); const lines = E.font.wrap(head, W - 50, { scale: 2 }); lines.forEach((ln, i) => E.font.text(g, ln, W / 2, 50 + i * 20 + (1 - k) * 10, '#14161e', { scale: 2, align: 'center', outline: false }));
    const py = 50 + lines.length * 20 + 6; px.rect(g, 28, py, 110, 64, '#14161e'); px.rect(g, 30, py + 2, 106, 60, '#b8c8d8');
    px.rect(g, 30, py + 40, 106, 22, '#4a8a4a');
    if (photoTeams) { photoTeams.forEach((tm, i) => { const T = EF.get('team', tm); EF.drawCrest(g, T, 40 + i * 50, py + 8, 2); }); }
    wrapTxt(g, sub, 148, py + 2, W - 176, '#2a2a34', {});
    for (let i = 0; i < 4; i++) for (let l = 0; l < 3; l++) px.rect(g, 28 + i * ((W - 56) / 4), py + 76 + l * 7, (W - 56) / 4 - 8, 3, '#b0a890');
    UI.footer(g, r, [['confirm', 'TURN THE PAGE']]);
  });
};
EF.scenes.cup = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter(d) {
    d = d || {}; this.d = d; this.t = 0; this.step = null; this.queue = []; L.enabled = false; EF.music('tabloid'); EF.lastInput = performance.now(); this.sv = EF.Save.load(); this.pick = EF.cupPick || (EF.cupPick = { talk: null, formation: null });
    game.allowJoin(false);
    if (d.fresh) { EF.cupPick.talk = null; this.queue = [{ k: 'tabloid', p: EF.STORY.prologue.tabloid, teams: ['kip'] }, { k: 'talk', lines: EF.STORY.prologue.talk, place: EF.STORY.prologue.place }, { k: 'choice', prompt: 'READY TO GO TO EUROPE?', items: [['LET\'S PLAY', () => { EF.Save.sticker('x:mags'); this.sv.prologue = true; EF.Save.save(); this.push(this.roundSteps(0)); this.advance(); }], ['TRAINING FIRST', () => { EF.Save.sticker('x:mags'); game.go('training', { back: 'cup' }); }]] }]; }
    else if (d.post) this.queue = this.postSteps(d.res, d.round);
    else this.queue = this.roundSteps(this.sv.round);
    this.advance();
  },
  exit() { game.allowJoin(false); },
  push(steps) { this.queue.unshift(...steps); },
  roundSteps(i) {
    const rd = EF.STORY.rounds[i], steps = []; if (!rd) return [{ k: 'goto', to: 'ending' }];
    if (i === 4) { steps.push({ k: 'talk', lines: EF.STORY.villain.talk, place: EF.STORY.villain.place }, { k: 'choice', prompt: 'THE BARON LEANS IN...', items: EF.STORY.villain.choices.map(([l, id]) => [l, () => { this.sv.loyal = id === 'loyal'; if (id === 'loyal') EF.Save.sticker('x:loyal'); EF.Save.save(); this.push([{ k: 'talk', lines: EF.STORY.villain[id], place: EF.STORY.villain.place }]); this.advance(); }]) }); }
    steps.push({ k: 'bracket', round: i, travel: rd.travel }, { k: 'tabloid', p: rd.pre, teams: ['kip', rd.team] });
    if (rd.talk && rd.talk.length) steps.push({ k: 'talk', lines: rd.talk, place: EF.get('stadium', rd.stadium).name });
    steps.push({ k: 'teamtalk', round: i }, { k: 'tunnel', round: i }); return steps;
  },
  postSteps(res, i) {
    const rd = EF.STORY.rounds[i], win = res.winner === 0, steps = []; const sv = EF.Save.load();
    if (win) { sv.round = Math.max(sv.round, i + 1); EF.Save.save(); }
    steps.push({ k: 'tabloid', p: win ? rd.win : rd.lose, teams: ['kip', rd.team] });
    if (win && rd.after && rd.after.length) steps.push({ k: 'talk', lines: rd.after, place: EF.get('stadium', rd.stadium).name });
    if (win && i === 4) steps.push({ k: 'goto', to: 'ending' });
    else if (win) steps.push({ k: 'stickers' }, { k: 'goto', to: 'cup', data: { resume: true } });
    return steps;
  },
  advance() {
    const s = this.queue.shift(); this.t = 0; this.step = s; if (!s) return game.go('title'); EF.lastInput = performance.now();
    if (s.k === 'goto') { game.go(s.to, s.data); return; }
    if (s.k === 'talk') { EF.music('cup'); this.talk = new EF.Talk(s.lines, () => this.advance(), 'bottom'); }
    else if (s.k === 'tabloid') { EF.music('tabloid'); EF.sfx('whistle2', { vol: .3 }); }
    else if (s.k === 'choice') this.menu = new UI.Menu(s.items.map(([label, fn]) => ({ label, onPick: fn })), { y: 100, w: 230, h: 22, scale: 1 });
    else if (s.k === 'teamtalk') { game.allowJoin({ max: 4, onJoin: (inp, n) => { EF.sfx('confirm'); this.joined = (this.joined || 0) + 1; } }); this.ti = 0; this.sub = null; this.msg = null; this.talkIds = ['hairdryer', 'shoulder', 'board']; }
    else if (s.k === 'tunnel') { game.allowJoin(false); EF.music('title'); EF.sfx('whistle', { vol: .4 }); }
    else if (s.k === 'bracket') { EF.music('cup'); }
    else if (s.k === 'stickers') { if (!EF.newStickers || !EF.newStickers.length) return this.advance(); EF.sfx('euphoriaFull'); }
  },
  update(dt) {
    this.t += dt; const s = this.step; if (!s) return; EF.idleStep(dt, 'cup');
    if (s.k === 'talk') { this.talk.update(dt); if (this.talk.finished) return; }
    else if (s.k === 'tabloid' || s.k === 'stickers') { if (this.t > .3 && (UI.anyP('confirm') || UI.anyP('start'))) { UI.eatAll(); if (s.k === 'stickers') EF.newStickers = []; this.advance(); } }
    else if (s.k === 'bracket') { if (this.t > .5 && (UI.anyP('confirm') || UI.anyP('start'))) { UI.eatAll(); this.advance(); } }
    else if (s.k === 'choice') this.menu.update(dt);
    else if (s.k === 'teamtalk') this.teamTalkUpdate(dt, s);
    else if (s.k === 'tunnel') { if (this.t > 3.2 || (this.t > 1 && UI.anyP('confirm'))) { UI.eatAll(); this.launch(s.round); } }
  },
  teamTalkUpdate(dt, s) {
    if (this.sub === 'formation') { this.fm.update(dt); return; }
    if (this.msg) { this.msgT -= dt; if (this.msgT <= 0 || UI.anyP('confirm')) { UI.eatAll(); this.advance(); } return; }
    if (UI.anyRep('left')) { this.ti = (this.ti + 2) % 3; EF.sfx('select'); } if (UI.anyRep('right')) { this.ti = (this.ti + 1) % 3; EF.sfx('select'); }
    const c = game.input.clicked && game.input.clicked(); if (c && this.cardRects) this.cardRects.forEach((rc, k) => { if (c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3]) { this.ti = k; this.chooseTalk(); } });
    const p = game.input.pointer && game.input.pointer(); if (p && this.cardRects && (p[0] !== this.lpt?.[0])) { this.lpt = [p[0], p[1]]; this.cardRects.forEach((rc, k) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) this.ti = k; }); }
    if (UI.anyP('confirm')) { UI.eatAll(); this.chooseTalk(); }
  },
  chooseTalk() {
    const id = this.talkIds[this.ti]; EF.cupPick.talk = id; EF.cupPick.formation = null; EF.sfx('confirm');
    if (id === 'board') { this.sub = 'formation'; this.fm = new UI.Menu([['2-2', '2-2: TWO BACK, TWO UP'], ['1-2-1', '1-2-1: THE DIAMOND'], ['2-1-1', '2-1-1: SAFETY FIRST']].map(([f, l]) => ({ label: l, onPick: () => { EF.cupPick.formation = f; this.sub = null; this.sayTalk(id); } })), { y: 90, w: 250, h: 22, scale: 1, onCancel: () => { this.sub = null; } }); }
    else this.sayTalk(id);
  },
  sayTalk(id) { const t = EF.get('teamtalk', id), line = t.lines[Math.floor(EF.fxRng() * t.lines.length)]; this.msg = line; this.msgT = 4.2; EF.babble.say('MAGS', line); },
  launch(i) {
    const rd = EF.STORY.rounds[i], humans = [{ idx: 0, side: 0 }]; for (let k = 1; k < game.players.length && k < 4; k++) humans.push({ idx: k, side: 0 });
    const d = { mode: 'cup', round: i, home: 'kip', away: rd.team, stadium: rd.stadium, ref: rd.ref, humans, rules: { needWinner: true }, talk: EF.cupPick.talk, formation: EF.cupPick.formation, seed: 100 + i * 17, euStart: i === 4 ? (this.sv.loyal ? .2 : .1) : 0, onDone: res => game.go('cup', { post: true, res, round: i }) };
    game.go('match', d);
  },
  draw(r) {
    const s = this.step; if (!s) return; const W = r.W, H = r.H;
    if (s.k === 'tabloid') return EF.drawTabloid(r, this.t, s.p.paper, s.p.head, s.p.sub, s.teams);
    UI.stadiumBg(r, game.time);
    if (s.k === 'talk') { r.overlay(g => { TXT(g, s.place || '', W / 2, 10, '#ffe7a8', { scale: 1, align: 'center' }); const who = this.talk.who; px.rect(g, 0, 0, 0, 0, '#000'); const rig = EF.speakerRig(who); rig.drawPortrait(g, Math.round(W / 2 - 40), 28, 80, { zoom: 3, turn: .3 }); }); this.talk.draw(r); }
    else if (s.k === 'choice') { r.overlay(g => TXT(g, s.prompt, W / 2, 60, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false })); this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'SELECT']])); }
    else if (s.k === 'bracket') this.drawBracket(r, s);
    else if (s.k === 'teamtalk') this.drawTeamTalk(r, s);
    else if (s.k === 'tunnel') this.drawTunnel(r, s);
    else if (s.k === 'stickers') r.overlay(g => { UI.panel(g, W / 2 - 120, 40, 240, 120); TXT(g, 'NEW STICKERS!', W / 2, 48, '#ffe08a', { scale: 2, align: 'center' }); (EF.newStickers || []).slice(0, 8).forEach((id, i) => { const st = EF.STICKERS.find(x => x.id === id); TXT(g, st ? st.name : id, W / 2, 72 + i * 10, '#e8ecff', { font: 'tiny', align: 'center' }); }); UI.footer(g, r, [['confirm', 'GREAT']]); });
  },
  drawBracket(r, s) {
    const W = r.W, H = r.H, rds = EF.STORY.rounds, cur = s.round, k = Math.min(1, this.t / 2);
    r.overlay(g => {
      E.font.title(g, 'THE EUROPHORIA CUP', W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 });
      const x0 = 50, x1 = W - 50, y = Math.round(H * .46); px.line(g, x0, y, x1, y, '#3a4a7a', 3); px.line(g, x0, y, x1, y, '#5a6aa0', 1);
      const nx = i => x0 + (x1 - x0) * i / 5;
      // the start (Kipperton) and the five rounds
      EF.drawCrest(g, 'kip', nx(0) - 8, y - 7, 1); rds.forEach((rd, i) => { const x = nx(i + 1), done = i < cur, now = i === cur; px.disc(g, Math.round(x), y, now ? 8 : 6, '#0a0c14'); px.disc(g, Math.round(x), y, now ? 7 : 5, done ? '#5aff7a' : now ? '#ffc83a' : '#3a4a7a'); EF.drawCrest(g, rd.team, Math.round(x) - 8, y - 38, 1.3); TXT(g, rd.name, x, y + 14 + (i % 2) * 22, now ? '#ffe08a' : '#8a9ac8', { font: 'tiny', align: 'center' }); TXT(g, EF.get('stadium', rd.stadium).city, x, y + 22 + (i % 2) * 22, '#6a7ab0', { font: 'tiny', align: 'center' }); });
      // the minibus
      const from = nx(cur), to = nx(cur + 1), bx = Math.round(lerp(from, to - 22, k * .85)), by = y - 6 + Math.round(Math.sin(this.t * 14) * .6);
      px.rect(g, bx - 9, by - 7, 18, 8, '#f08a24'); px.rect(g, bx - 7, by - 6, 4, 3, '#9ad8ff'); px.rect(g, bx - 2, by - 6, 4, 3, '#9ad8ff'); px.rect(g, bx + 3, by - 6, 4, 3, '#9ad8ff'); px.disc(g, bx - 5, by + 1, 2, '#14161e'); px.disc(g, bx + 5, by + 1, 2, '#14161e');
      const rd = rds[cur]; UI.panel(g, W / 2 - 140, H - 80, 280, 52); TXT(g, rd.name + ': ' + EF.get('team', rd.team).name, W / 2, H - 76, '#ffe08a', { align: 'center' }); TXT(g, EF.get('stadium', rd.stadium).name + ', ' + EF.get('stadium', rd.stadium).city, W / 2, H - 65, '#c8d4ff', { font: 'tiny', align: 'center' }); wrapTxt(g, s.travel || ('Gaffer\'s challenge: ' + EF.CHALLENGES[rd.challenge].text), W / 2 - 132, H - 56, 264, '#9aa6c8', { font: 'tiny' });
      UI.footer(g, r, [['confirm', 'ON THE BUS']]);
    });
  },
  drawTeamTalk(r, s) {
    const W = r.W, H = r.H; r.overlay(g => {
      E.font.title(g, 'TEAM TALK', W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); TXT(g, 'MAGS MULLIGAN: "WELL, GAFFER, WHAT DO WE TELL THEM?"', W / 2, 28, '#c8d4ff', { font: 'tiny', align: 'center' });
      const cw = 118, gap = 8, x0 = Math.round((W - cw * 3 - gap * 2) / 2); this.cardRects = [];
      this.talkIds.forEach((id, i) => { const t = EF.get('teamtalk', id), x = x0 + i * (cw + gap), y = 44, foc = i === this.ti; this.cardRects.push([x, y, cw, 100]); px.rect(g, x, y + (foc ? -4 : 0), cw, 100, foc ? '#ffc83a' : '#0a0c14'); px.rect(g, x + 2, y + 2 + (foc ? -4 : 0), cw - 4, 96, foc ? '#24366e' : '#141c3c'); TXT(g, t.name, x + cw / 2, y + 8 + (foc ? -4 : 0), foc ? '#ffffff' : '#9aa6c8', { align: 'center', font: 'tiny' }); wrapTxt(g, t.sub, x + 8, y + 26 + (foc ? -4 : 0), cw - 16, '#ffe7a8', { font: 'tiny' }); wrapTxt(g, t.desc, x + 8, y + 56 + (foc ? -4 : 0), cw - 16, '#c8d4ff', { font: 'tiny' }); });
      const joinedN = Math.max(0, game.players.length - 1); TXT(g, joinedN ? 'CO-OP: ' + (joinedN + 1) + ' PLAYERS ON THE PITCH' : 'FOR CO-OP: PRESS START ON ANOTHER PAD, OR 2 ON THE KEYBOARD', W / 2, 156, joinedN ? '#7aff9a' : '#8a9ac8', { font: 'tiny', align: 'center' });
      if (this.msg) { UI.panel(g, 20, H - 70, W - 40, 40); wrapTxt(g, this.msg, 28, H - 64, W - 56, '#fff6e0', {}); }
      UI.footer(g, r, [['confirm', 'SAY IT'], ['left', 'CHOOSE']]);
    }); if (this.sub === 'formation') this.fm.draw(r);
  },
  drawTunnel(r, s) {
    const rd = EF.STORY.rounds[s.round], W = r.W, H = r.H, k = Math.min(1, this.t / .6), T0 = EF.get('team', 'kip'), T1 = EF.get('team', rd.team);
    r.overlay(g => {
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
      T0.players.forEach((p, i) => { if (!this.tr0) this.tr0 = {}; const rig = this.tr0[i] || (this.tr0[i] = EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: T0.kit }, { kit: T1.kit }] }, 0) : T0.kit, p.pos, {})); rig.drawPortrait(g, Math.round(lerp(-60, 10 + i * 43, k)), 90, 40, { zoom: 3, turn: .5 }); });
      T1.players.forEach((p, i) => { if (!this.tr1) this.tr1 = {}; const rig = this.tr1[i] || (this.tr1[i] = EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: T0.kit }, { kit: T1.kit }] }, 1) : T1.kit, p.pos, {})); rig.drawPortrait(g, Math.round(lerp(W + 20, W - 50 - i * 43, k)), 90, 40, { zoom: 3, turn: -.5 }); });
      EF.drawCrest(g, T0, W * .28 - 18, 36, 3); EF.drawCrest(g, T1, W * .72 - 18, 36, 3); E.font.title(g, 'VS', W / 2, 44, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#e0662a'], depth: 3 });
      TXT(g, T0.name, W * .28, 18, '#ffffff', { align: 'center' }); TXT(g, T1.name, W * .72, 18, '#ffffff', { align: 'center' });
      TXT(g, EF.get('stadium', rd.stadium).name, W / 2, H - 56, '#ffe08a', { scale: 2, align: 'center' }); TXT(g, 'REFEREE: ' + EF.get('referee', rd.ref).name + '   -   CHALLENGE: ' + EF.CHALLENGES[rd.challenge].text, W / 2, H - 36, '#c8d4ff', { font: 'tiny', align: 'center' });
      UI.footer(g, r, [['confirm', 'KICK OFF']]);
    });
  }
};
/* ---- the ending: ceremony, parade, credits ---- */
EF.scenes.ending = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter() { this.t = 0; EF.music('victory'); L.enabled = false; game.follow(null); game.cam.bounds = null; const sv = EF.Save.load(); sv.round = 5; sv.records.cups++; sv.unlocks.cup = 1; EF.Save.save(); EF.lastInput = performance.now() + 1e9;
    const kip = EF.get('team', 'kip'); this.rigs = kip.players.map((p, i) => ({ rig: EF.makeRig(p, i === 0 ? EF.gkKit({ teams: [{ kit: kip.kit }, { kit: kip.kit }] }, 0) : kip.kit, p.pos, {}), x: 440 + i * 26 })); this.credits = [['EUROPHORIA FOOTBALL', 'h'], ['', ''], ['A GAME OF THE BEAUTIFUL KIND', ''], ['', '']].concat((ABOUT.sourceInformation ? [['Built on my-3D2dge', ''], ['AI Hub session protocol v1', ''], ['Everything drawn and heard by code', '']] : [])).concat([['', ''], ['THE KIPPERS', 'h'], ...kip.players.map(p => [p.name, '']), ['MAGS MULLIGAN, GAFFER', ''], ['', ''], ['COMMENTARY', 'h'], ['BARRY AND TREV', ''], ['', ''], ['THANK YOU FOR PLAYING', 'h']]); },
  update(dt) {
    this.t += dt; game.focus(480 + 40, 0, 32 + (game.H / 2 - 42) / -game.view.bz);
    this.rigs.forEach((h, i) => h.rig.update(dt, { x: h.x, y: 0, z: 32 + Math.abs(Math.sin(this.t * 6 + i)) * (this.t > 14 ? 0 : 4), facing: 0, vx: 0, vy: 0, pose: 'cheer', expr: 'shout' }));
    if (EF.fxRng() < dt * 12) PT.bits(430 + EF.fx(130), 0, 70, 3, ['#f08a24', '#1c2a5a', '#ffd84a', '#ffffff']);
    if (this.t > 5 && (UI.anyP('confirm') || UI.anyP('start')) ) { UI.eatAll(); if (this.t > 30) game.go('title'); else this.t = Math.max(this.t, 30); }
    if (this.t > 70) game.go('title');
  },
  draw(r) {
    titleBg.draw(r); titleStage.draw(r); const view = E.charView(r.view); for (const h of this.rigs) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, view));
    r.queue(560, 0, 32, g => { const [x, y] = r.w(560, 0, 32), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 6, Y - 6, 12, 6, '#a07a10'); px.rect(g, X - 2, Y - 22, 4, 16, '#ffd84a'); px.poly(g, [[X - 9, Y - 38], [X + 9, Y - 38], [X + 5, Y - 22], [X - 5, Y - 22]], '#ffd84a'); px.rect(g, X - 8, Y - 38, 16, 2, '#fff2a0'); }, { emissive: true });
    r.overlay(g => { const W = r.W, H = r.H, t = this.t;
      if (t < 12) { const hd = t < 6 ? EF.STORY.rounds[4].win : { head: 'THE PARADE', sub: 'Down the harbour road on the back of a fish lorry, three thousand people and one very smug seagull.' }; px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, 280, H, '#05060f')); wrapTxt(g, hd.head, 10, 14, 262, '#ffe08a', { scale: 2 }); wrapTxt(g, hd.sub, 10, 70, 262, '#e8ecff', {}); }
      else if (t < 20) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, 280, H, '#05060f')); wrapTxt(g, EF.STORY.ending[2], 10, 40, 262, '#ffe08a', { scale: 2 }); TXT(g, 'AND THE MAGS MULLIGAN INVITATION TO THE NEXT ONE IS ALREADY IN THE POST.', 10, 110, '#c8d4ff', { font: 'tiny' }); }
      else { px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, W, H, '#05060f')); let y = H - (t - 20) * 16; for (const [s, k] of this.credits) { if (y > -10 && y < H + 10) TXT(g, s, W / 2, y, k === 'h' ? '#ffe08a' : '#e8ecff', { align: 'center', scale: k === 'h' ? 2 : 1 }); y += k === 'h' ? 20 : 12; } if (y < -20) { game.go('title'); } }
      UI.footer(g, r, [['confirm', 'SKIP']]); });
  }
};

//# sourceURL=ef/33-match.js
/* ============ 33-match: the match scene: a Match, its view, the controllers, the results ============ */
EF.lastMatchData = null;
EF.restartMatch = () => { if (EF.lastMatchData) game.go('match', EF.lastMatchData); };
EF.matchSong = id => ({ smoke: 'smoke', 'olé': 'ole', forge: 'forge', curva: 'curva', gold: 'gold', rec: 'rec' }[(EF.get('stadium', id) || {}).music] || 'smoke');
EF.scenes.match = {
  pausable: !EF.session, view: 'broadcast', input: EF.KEYS, res: 'ps1', touch: [], camera: { zoom: [.7, 1.8], start: 1 },
  enter(d) {
    d = d || {}; EF.lastMatchData = d; this.d = d; this.results = null; this.t = 0; EF.notices = [];
    game.input.touchEnabled = false;
    const cam = (game.settings && game.settings.camera) || 'broadcast'; try { game.setView(cam === 'aerial' ? 'aerial' : cam === 'threequarter' ? 'threequarter' : 'broadcast'); } catch (e) { /* view */ }
    const M = this.M = d.build ? d.build() : new EF.Match({ home: d.home || 'kip', away: d.away || 'hoo', stadium: d.stadium, ref: d.ref, seed: d.seed, rules: d.rules, talk: d.talk, formation: d.formation, awayKit: d.awayKit, cheat: d.cheat, aiSpeed: d.aiSpeed, dummies: d.dummies, noReplay: d.noReplay, euStart: d.euStart, noEvents: d.noEvents, quickKick: d.quickKick });
    if (!d.build) for (const h of (d.humans || [{ idx: 0, side: 0 }])) { const inp = game.players[h.idx] || game.input; M.addHuman(h.idx, h.side, new EF.HumanController(inp, h.idx)); }
    this.mv = new EF.MatchView(M, { ball: EF.Save.load().ballId, noHud: d.noHud, quiet: d.quiet, noRadar: false });
    const st = M.stadium; game.weather = st.weather && st.weather.kind !== 'fog' ? Object.assign({}, st.weather) : null;
    L.enabled = true; L.ambient = st.ambient; game.cam.bounds = null; game.follow(null);
    if (!d.noMusic) EF.music(d.music || EF.matchSong(M.stadiumId));
    this.menu = null; this.offs = [];
    if (d.extraWorld) this.mv.extra = d.extraWorld;
    if (d.onSetup) d.onSetup(M, this);
    this.mv.zoomApplied = undefined; this.mv.camPos = { x: Pitch.CX, y: Pitch.CY }; if (M.humans[0]) { /* camera starts at the centre */ }
    if (EF.query.dev === '1' && EF.Dev) EF.Dev.open();
    game.settings && game.settings.set && 0;
  },
  exit() { if (this.mv) this.mv.destroy(); game.weather = null; EF.crowdAudio.stop(); game.resetCamera && game.resetCamera(); L.enabled = false; EF.music(null); },
  back() { return false; },
  update(dt) {
    const M = this.M, d = this.d; if (!M) return;
    this.t += dt;
    if (d.attract && this.t > .6 && EF.activity(d.startedAt)) { game.go('title'); return; }
    if (this.results) { this.results.menu.update(dt); this.mv.update(dt * .2); return; }
    // human extras: use counts for prompts, replay skip, the celebration picker
    for (const h of M.humans) { const I = game.players[h.idx] || game.input; for (const a of ['pass', 'shoot', 'lob', 'through', 'skill', 'dive']) if (I.pressed(a)) EF.useAction(M.ball.owner === h.f ? a : a === 'pass' ? 'tackle' : a === 'shoot' ? 'slide' : a === 'lob' ? 'barge' : a);
      if (M.mode === 'replay' && (I.pressed('pass') || I.pressed('confirm'))) M.skipReplay = true;
      if ((M.mode === 'goal' || M.mode === 'celebrate') && M.goalInfo && M.goalInfo.side === h.side) { const pick = I.pressed('pass') ? 'cheer' : I.pressed('shoot') ? 'slide' : I.pressed('lob') ? 'robot' : I.pressed('through') ? 'helicopter' : null; if (pick) for (const f of M.F) if (f.side === h.side) f.celebStyle = pick; } }
    if (d.mode === 'cup' && !M.challengeDone) { const ch = EF.CHALLENGES[EF.STORY.rounds[d.round].challenge]; if (ch.test(M.stats[0])) { M.challengeDone = true; EF.notice('GAFFER\'S CHALLENGE COMPLETE!', '#ffe08a', 3, 2); EF.sfx('euphoriaFull'); } }
    if (d.onUpdate) d.onUpdate(M, dt, this);
    if (M.o.frozen && !d.hubClient) { this.mv.update(dt); return; }
    M.update(dt); this.mv.update(dt);
    if (M.over && !this.results && !d.noResults) this.buildResults();
    if (M.over && d.noResults && d.onOver) { d.onOver(M); }
  },
  buildResults() {
    const M = this.M, d = this.d, res = M.result, w = res.winner, win = w === 0, human = M.humans.some(h => h.side === 0);
    let extra = []; const cup = d.mode === 'cup', rd = cup ? EF.STORY.rounds[d.round] : null;
    if (cup) {
      const ch = EF.CHALLENGES[rd.challenge], done = ch.test(M.stats[0]); if (done) { EF.Save.load().challenges[rd.challenge] = 1; EF.Save.sticker('ch:' + rd.challenge); }
      extra.push((done ? '[x] ' : '[ ] ') + 'GAFFER\'S CHALLENGE: ' + ch.text); res.challenge = done;
      EF.Save.sticker('s:' + rd.stadium); EF.Save.sticker('c:' + rd.team); EF.Save.load().records.played++; EF.Save.load().records.goals += M.stats[0].goals; if (win) EF.Save.load().records.wins++;
      for (let i = 0; i < 5; i++) EF.Save.sticker('p:' + rd.team + ':' + i);
      if (M.stats[0].busGoals > 0) EF.Save.sticker('x:bus'); if (Object.keys(EF.Save.load().challenges).length === 5) { EF.Save.load().unlocks.leather = 1; EF.Save.load().ballId = EF.Save.load().ballId; }
      EF.Save.save();
    }
    const items = [];
    if (cup) { if (win) items.push({ label: 'CONTINUE', onPick: () => d.onDone && d.onDone(res) }); else { items.push({ label: 'TRY AGAIN', onPick: () => game.go('match', d) }); items.push({ label: 'QUIT TO TITLE', onPick: () => game.go('title') }); } }
    else if (d.mode === 'kickabout' || d.mode === 'penalties') { items.push({ label: 'REMATCH', onPick: () => game.go('match', Object.assign({}, d, { seed: (d.seed || 1) + 7 })) }); items.push({ label: 'SETUP', onPick: () => game.go(d.mode === 'penalties' ? 'penaltysetup' : 'setup') }); items.push({ label: 'TITLE', onPick: () => game.go('title') }); }
    else items.push({ label: 'CONTINUE', onPick: () => game.go('title') });
    this.results = { res, win, extra, menu: new EF.UI.Menu(items, { y: 156, w: 180, h: 18, scale: 1 }) }; EF.music(win ? 'victory' : 'defeat'); if (!human && !cup) EF.music('title');
  },
  draw(r) {
    const M = this.M; if (!M) return;
    if (this.d.noDraw) { r.overlay(g => px.rect(g, 0, 0, r.W, r.H, '#05060f')); return; }
    this.mv.draw(r);
    if (this.d.drawExtra) this.d.drawExtra(r, M, this);
    if (this.results) { r.overlay(g => this.resultsDraw(g, r)); this.results.menu.draw(r); }
  },
  resultsDraw(g, r) {
    const M = this.M, R = this.results, W = r.W, H = r.H, res = R.res; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#050810'));
    const x = W / 2 - 150, y = 12; UI.panel(g, x, y, 300, 140);
    const wn = res.winner, title = wn < 0 ? 'A DRAW' : wn === 0 ? (R.win && M.humans.length ? 'VICTORY!' : M.teams[0].data.short + ' WIN') : (M.humans.some(h => h.side === 0) ? 'DEFEAT' : M.teams[1].data.short + ' WIN');
    TXT(g, title, W / 2, y + 6, wn === 0 ? '#ffe08a' : '#ff9a8a', { scale: 3, align: 'center', outline: '#000', shadow: false });
    EF.drawCrest(g, M.teams[0].data, x + 14, y + 36, 1.4); EF.drawCrest(g, M.teams[1].data, x + 300 - 14 - 17, y + 36, 1.4);
    TXT(g, M.score[0] + ' - ' + M.score[1], W / 2, y + 34, '#ffffff', { scale: 3, align: 'center' }); if (res.pens) TXT(g, 'PENS ' + res.pens[0] + ' - ' + res.pens[1], W / 2, y + 58, '#ffd84a', { align: 'center' });
    TXT(g, M.teams[0].data.short, x + 14, y + 56, '#c8d4ff', { font: 'tiny' }); TXT(g, M.teams[1].data.short, x + 300 - 14, y + 56, '#c8d4ff', { font: 'tiny', align: 'right' });
    res.goals.slice(0, 6).forEach((gl, i) => TXT(g, gl.minute + "' " + gl.name + (gl.pen ? ' (PEN)' : gl.header ? ' (HEADER)' : gl.sup ? ' (SUPER)' : '') + (gl.own ? ' (OG)' : ''), gl.side === 0 ? x + 14 : x + 300 - 14, y + 70 + i * 8 - (0), gl.side === 0 ? '#e8ecff' : '#e8ecff', { font: 'tiny', align: gl.side === 0 ? 'left' : 'right' }));
    R.extra.forEach((s, i) => TXT(g, s, W / 2, y + 124 + i * 9, s.startsWith('[x]') ? '#9aff9a' : '#c8d4ff', { font: 'tiny', align: 'center' }));
    if (EF.newStickers && EF.newStickers.length) { TXT(g, EF.newStickers.length + ' NEW STICKER' + (EF.newStickers.length > 1 ? 'S' : '') + ' IN THE ALBUM', W / 2, y + 136, '#ffd84a', { font: 'tiny', align: 'center' }); }
    UI.footer(g, r, [['confirm', 'SELECT']]);
  }
};

//# sourceURL=ef/34-training.js
/* ============ 34-training: nine drills on the Rec, each a short list of steps counted from match events ============ */
EF.DRILL_CFG = {
  move: { dummies: 1, cones: [[300, 220], [420, 330], [540, 220], [640, 320]], eu: 1 }, passing: { dummies: 1, eu: 1 }, shooting: { dummies: 1, eu: 1 }, air: { dummies: 1, eu: 1 }, skills: { dummies: 1, eu: 1 },
  defending: { dummies: 0, live: true, ai: .7 }, setpieces: { dummies: 1, sp: ['penalty', 'freekick', 'corner'] }, euphoria: { dummies: 1, euCheat: 6 }, theatrics: { dummies: 0, live: true, ai: .6 }
};
EF.scenes.training = {
  view: 'side', input: EF.KEYS, res: 'ps1', touch: [], pausable: false,
  enter(d) {
    EF.music('cup'); L.enabled = false; EF.lastInput = performance.now(); this.back = d && d.back; const sv = EF.Save.load(); sv.drills = sv.drills || {};
    const items = EF.all('drill').sort((a, b) => a.n - b.n).map(dr => ({ label: dr.n + '. ' + dr.title, sub: sv.drills[dr.id] ? 'DONE' : '', hint: dr.teaches, onPick: () => this.start(dr.id) }));
    items.push({ label: this.back === 'cup' ? 'BACK TO THE CUP' : 'BACK', onPick: () => game.go(this.back === 'cup' ? 'cup' : 'title', this.back === 'cup' ? { resume: true } : undefined) });
    this.menu = new UI.Menu(items, { y: 40, w: 250, h: 17, scale: 1, onCancel: () => game.go(this.back === 'cup' ? 'cup' : 'title', this.back === 'cup' ? { resume: true } : undefined) });
  },
  start(id) { EF.startDrill(id, this.back); },
  update(dt) { EF.idleStep(dt, 'training'); this.menu.update(dt); },
  draw(r) { UI.stadiumBg(r, game.time); r.overlay(g => { E.font.title(g, 'TRAINING', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); }); this.menu.draw(r); r.overlay(g => UI.footer(g, r, [['confirm', 'START DRILL'], ['cancel', 'BACK']])); }
};
EF.startDrill = (id, back) => {
  const dr = EF.get('drill', id), cfg = EF.DRILL_CFG[id] || {}, C = {}; let si = 0, doneT = 0, finished = false, spT = 0, menu = null, offs = [], conesHit = {}, lastSP = 0;
  const bump = k => { C[k] = (C[k] || 0) + 1; };
  const d = { mode: 'training', home: 'kip', away: 'dummies', stadium: 'rec', ref: 'patience', humans: [{ idx: 0, side: 0 }], noResults: true, noReplay: true, noEvents: true, quickKick: true, seed: 5 + dr.n, quiet: true, noMusic: false, music: 'rec',
    rules: { training: true, euphoria: true, noExtra: true, advantage: false }, dummies: cfg.dummies === 1 ? 1 : undefined, aiSpeed: cfg.ai || 1,
    cheat: cfg.euCheat ? { euphoria: cfg.euCheat } : cfg.eu ? { euphoria: 1.5 } : null,
    onSetup(M, sc) {
      const on = (t, fn) => offs.push(EF.bus.on(t, e => { if (e.match === M) fn(e); }));
      on('passDone', e => { if (e.side === 0) bump('passes'); }); on('pass', e => { if (e.side === 0 && e.through) bump('throughs'); }); on('oneTwo', e => bump('onetwos'));
      on('goal', e => { if (e.side === 0) { bump('onTarget'); if (M.penaltyLive || e.pen) bump('penGoals'); if (e.fk) bump('fkGoals'); if (e.sup) bump('supers'); if (M.lastSP === 'corner') bump('cornerGoals'); } }); on('save', e => { if (e.side === 1 && !e.shootout) bump('onTarget'); });
      on('shot', e => { if (e.side === 0 && e.power > .85) bump('screamers'); }); on('lob', e => { if (e.side === 0 && Math.abs(e.x - Pitch.X1) < 190) bump('chips'); if (e.side === 0) bump('lobs'); });
      on('header', e => { if (e.side === 0) bump('headers'); }); on('volley', e => { if (e.side === 0) bump('volleys'); }); on('skill', e => { if (e.side === 0 && e.move === 'stepover') bump('stepovers'); }); on('nutmeg', e => { if (e.side === 0) bump('nutmegs'); }); on('rainbow', e => { if (e.side === 0) bump('rainbows'); });
      on('tackleWon', e => { if (e.side === 0) bump('tackles'); }); on('switch', e => bump('switches')); on('intercept', e => { if (e.side === 0) bump('intercepts'); });
      on('euphoriaFull', e => { if (e.side === 0) bump('euFull'); }); on('europhoria', e => { if (e.side === 0) bump('europhorias'); }); on('superStrike', e => { if (e.side === 0) bump('superShots'); });
      on('diveWon', e => bump('diveWins')); on('diveBooked', e => bump('diveBooked')); on('setPieceTaken', e => { M.lastSP = e.type; lastSP = M.t; });
      if (cfg.live) { M.rules.training = false; M.o.noClock = true; M.rules.euphoria = false; }
      if (id === 'defending') { M.kickoff(1); } if (cfg.sp) { M.o.spIdx = 0; M.setPiece(cfg.sp[0], 0, Pitch.X1 - 150, Pitch.CY + 30, {}); M.lastSP = cfg.sp[0]; }
      if (id === 'euphoria') { M.eu[0] = .4; }
      if (id === 'setpieces') EF.notice('SET PIECES: TAKE THEM ONE BY ONE', '#ffe7a8', 2.5, 2);
    },
    onUpdate(M, dt, sc) {
      if (finished) { if (menu) menu.update(dt); return; }
      const h = M.humans[0], f = h && h.f; if (f) { if (f.sprinting && Math.hypot(f.vx, f.vy) > 40) C.sprintSecs = (C.sprintSecs || 0) + dt; else if ((C.sprintSecs || 0) > 2 && Math.hypot(f.vx, f.vy) > 8 && Math.hypot(f.vx, f.vy) < 60) C.jogSecs = (C.jogSecs || 0) + dt;
        if (cfg.cones) cfg.cones.forEach((c, k) => { const cx = Pitch.X0 + c[0] * 1.2 - 100, cy = Pitch.Y0 + c[1] * .8 - 40; if (!conesHit[k] && Math.hypot(f.x - cx, f.y - cy) < 16) { conesHit[k] = 1; bump('cones'); EF.sfx('euTick'); } }); if (cfg.cones && Object.keys(conesHit).length >= cfg.cones.length) conesHit = {}; }
      // set-piece drills: take them in turn, start a new one when the last is over
      if (cfg.sp && (M.mode === 'kickoff' || (M.mode === 'play' && M.t - lastSP > 7 && lastSP > 0 && M.t - spT > 7))) { spT = M.t; const step = si < dr.steps.length ? si : 0, ty = cfg.sp[Math.min(step, cfg.sp.length - 1)]; M.setPiece(ty, 0, ty === 'corner' ? 0 : Pitch.X1 - (ty === 'freekick' ? 170 : 150), Pitch.CY + (ty === 'freekick' ? 60 : 0), {}); M.lastSP = ty; lastSP = M.t; }
      if (id === 'defending' && M.mode === 'play' && M.ball.owner && M.ball.owner.side === 0 && M.t % 4 < dt) { /* hand it back so the drill keeps flowing */ M.kickoff(1); }
      if (id === 'theatrics' && M.mode === 'play' && M.t - spT > 6) { spT = M.t; M.kickoff(0); }
      const stp = dr.steps[si]; if (stp && (C[stp.k] || 0) >= stp.n) { si++; EF.notice('STEP COMPLETE!', '#9aff9a', 1.4, 3); EF.sfx('euphoriaFull'); if (si >= dr.steps.length) { finished = true; const sv = EF.Save.load(); sv.drills = sv.drills || {}; sv.drills[id] = 1; EF.Save.save(); EF.sfx('duelWin'); menu = new UI.Menu([{ label: 'MORE TRAINING', onPick: () => game.go('training', { back }) }, { label: 'AGAIN', onPick: () => EF.startDrill(id, back) }], { y: 130, w: 180, h: 20, scale: 1, onCancel: () => game.go('training', { back }) }); } }
    },
    drawExtra(r, M, sc) {
      r.overlay(g => { const W = r.W, H = r.H, stp = dr.steps[Math.min(si, dr.steps.length - 1)]; UI.panel(g, 6, 62, Math.min(W - 12, 220), 52, { alpha: .88 }); TXT(g, dr.n + '. ' + dr.title + '  (' + Math.min(si + 1, dr.steps.length) + '/' + dr.steps.length + ')', 12, 66, '#ffe08a', { font: 'tiny' }); wrapTxt(g, stp.text, 12, 76, 208, '#fff6e0', { font: 'tiny' }); E.ui.bar(g, 12, 106, 208, 3, Math.min(1, (C[stp.k] || 0) / stp.n), '#7aff9a');
        if (finished) { UI.panel(g, W / 2 - 100, 50, 200, 70); TXT(g, 'DRILL COMPLETE!', W / 2, 60, '#9aff9a', { scale: 2, align: 'center' }); TXT(g, dr.who + ': "NOT BAD. NOT GOOD. BUT NOT BAD."', W / 2, 84, '#c8d4ff', { font: 'tiny', align: 'center' }); } });
      if (finished && menu) menu.draw(r);
    }
  };
  d.extraWorld = (r, view) => { if (cfg.cones) cfg.cones.forEach((c, k) => { const cx = Pitch.X0 + c[0] * 1.2 - 100, cy = Pitch.Y0 + c[1] * .8 - 40; r.queue(cx, cy, 0, g => { const [x, y] = r.w(cx, cy, 0), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 5, Y], [X + 5, Y], [X, Y - 11]], conesHit[k] ? '#5aff7a' : '#ff7a1a'); px.rect(g, X - 6, Y, 12, 2, '#e8e8e8'); }, {}); }); };
  game.go('match', d);
};

//# sourceURL=ef/40-attract.js
/* ============ 40-attract: ten idle seconds on a menu, then the machine plays itself ============ */
EF.activity = since => {
  EF.pollPads(); const p = game.input.pointer && game.input.pointer(); if (p && (p[0] !== EF.lastPointer[0] || p[1] !== EF.lastPointer[1])) { const moved = Math.hypot(p[0] - EF.lastPointer[0], p[1] - EF.lastPointer[1]); EF.lastPointer = [p[0], p[1]]; if (moved > 3 && EF.lastPointerSeen) EF.lastInput = performance.now(); EF.lastPointerSeen = true; }
  if (game.players.some(q => q.anyPressed && q.anyPressed())) EF.lastInput = performance.now();
  return EF.lastInput > since;
};
EF.CAPTIONS = ['SLIDE TACKLES THAT SEND PEOPLE FLYING', 'THE CROWD IS YOUR POWER BAR', 'FILL IT, THEN UNLEASH EUROPHORIA', 'SUPER STRIKES THAT BEND THE BALL TO THEIR WILL', 'THE SAVE DUEL: TIME THE RINGS', 'DIVES, CARDS AND THE DREADED VAR', 'SET PIECES: CORNERS, FREE KICKS, PENALTIES', 'FIVE ROUNDS FROM KIPPERTON TO THE EUPHORIUM', 'ONE TO FOUR PLAYERS, ONLINE VIA AI HUB'];
EF.ATTRACT = [
  { home: 'kip', away: 'hoo', stadium: 'smokehouse', ref: 'haltwhistle', sp: [['freekick', 14], ['corner', 30]] },
  { home: 'rpp', away: 'svs', stadium: 'stahlpresse', ref: 'ironside', sp: [['penalty', 12], ['freekick', 28]] },
  { home: 'acl', away: 'opu', stadium: 'lucchetto', ref: 'severo', sp: [['corner', 12], ['penalty', 26]] },
  { home: 'kip', away: 'opu', stadium: 'euphorium', ref: 'haltwhistle', shootout: true }
];
EF.attractData = (i, from) => {
  const sc = EF.ATTRACT[i % EF.ATTRACT.length], done = {}; const startedAt = performance.now();
  return { attract: true, startedAt, mode: 'attract', home: sc.home, away: sc.away, stadium: sc.stadium, ref: sc.ref, humans: [], noResults: true, music: 'attract', seed: 40 + i * 13, cheat: { euphoria: 7 },
    rules: sc.shootout ? { shootoutOnly: true, needWinner: true, euphoria: false } : { halfSecs: 34, needWinner: false, noExtra: true, advantage: true }, noEvents: false, aiSpeed: 1.04,
    onUpdate(M, dt, scn) {
      if (sc.sp && M.mode === 'play' && !M.rules.training) for (const [type, at] of sc.sp) if (!done[type + at] && M.clock > at && M.clock < at + 4) { done[type + at] = 1; const side = M.ball.owner ? M.ball.owner.side : 0; if (type === 'penalty') { M.emit('penaltyAwarded', { side, who: 0, foul: 0 }); M.setPiece('penalty', side, 0, 0, {}); } else if (type === 'corner') M.setPiece('corner', side, 0, 0, { right: side === 0, low: M.ball.y > Pitch.CY }); else M.setPiece('freekick', side, Pitch.goalX(side) - (side ? -1 : 1) * 190, Pitch.CY + 40, { foulBy: 0 }); }
      for (const f of M.F) { f.stamina = 1; f.lowStamina = false; }
      if (M.mode === 'shootout' && M.shoot && M.shoot.phase === 'ready' && !M.shoot.aiGo) M.shoot.t = Math.max(M.shoot.t, 1.2);
    },
    onOver: M => game.go('match', EF.attractData(i + 1)),
    drawExtra(r, M, scn) { r.overlay(g => { const W = r.W, H = r.H; px.rect(g, 0, H - 30, W, 30, '#05060f'); const cap = EF.CAPTIONS[Math.floor(game.time / 5) % EF.CAPTIONS.length]; TXT(g, cap, W / 2, H - 25, '#ffe7a8', { align: 'center' }); if (Math.floor(game.time * 1.6) % 2) TXT(g, 'PRESS ANY BUTTON', W / 2, H - 14, '#ffffff', { align: 'center', scale: 1 }); TXT(g, 'EUROPHORIA FOOTBALL', W - 6, H - 40 + 22, '#8a9ac8', { font: 'tiny', align: 'right' }); }); }
  };
};
EF.scenes.attract = { view: 'broadcast', input: EF.KEYS, res: 'ps1', touch: [], pausable: false, enter(d) { game.go('match', EF.attractData(((EF.attractIdx = (EF.attractIdx || 0) + 1) - 1) % EF.ATTRACT.length), { fade: 0 }); }, update() {}, draw() {} };

//# sourceURL=ef/41-devmode.js
/* ============ 41-devmode: tuning sliders, cheats, warps and info; reached from the pause menu or F1 ============ */
EF.dev = { stamina: false, freezeAI: false, noFouls: false, pure: false, aiOverlay: false, god: false };
EF.Dev = {
  on: false, tab: 0, i: 0, top: 0, tabs: ['TUNE', 'CHEATS', 'WARP', 'INFO'], msg: '', msgT: 0,
  open() { if (EF.session) return; try { game.resume(); } catch (e) { /* not paused */ } const sc0 = game.scene; if (sc0) { this._p = sc0.pausable; sc0.pausable = false; this._sc = sc0; } this.on = true; this.i = 0; this.top = 0; this.build(); EF.lastInput = performance.now(); game.input.consumeAll && game.input.consumeAll(); },
  close() { this.on = false; EF.saveTune(); if (this._sc) { this._sc.pausable = this._p; this._sc = null; } },
  toggle() { this.on ? this.close() : this.open(); },
  toast(s) { this.msg = s; this.msgT = 2; },
  M() { const sc = game.scene; return sc && sc.M; },
  build() {
    const D = this, M = () => D.M(), act = fn => () => { const m = M(); if (m) fn(m); else D.toast('NEEDS A MATCH'); };
    const tune = [{ label: 'RESET ALL TO DEFAULTS', onPick: () => { EF.resetTune(); D.toast('TUNING RESET'); } }];
    let grp = ''; for (const t of EF.TUNE) { if (t[6] !== grp) { grp = t[6]; tune.push({ header: true, label: '- ' + grp.toUpperCase() + ' -' }); } tune.push({ key: t[0], label: t[1], type: 'slider', min: t[3], max: t[4], step: t[5], def: t[2], get: () => EF.T[t[0]], set: v => { EF.T[t[0]] = v; } }); }
    const cheats = [
      { label: 'INFINITE STAMINA', type: 'toggle', get: () => EF.dev.stamina, set: v => { EF.dev.stamina = v; } }, { label: 'FREEZE THE CPU', type: 'toggle', get: () => EF.dev.freezeAI, set: v => { EF.dev.freezeAI = v; } },
      { label: 'NO FOULS CALLED', type: 'toggle', get: () => EF.dev.noFouls, set: v => { EF.dev.noFouls = v; EF.T.foulChance = v ? 0 : 1; } }, { label: 'PURE FOOTBALL (NO OTT)', type: 'toggle', get: () => EF.dev.pure, set: v => { EF.dev.pure = v; const m = M(); if (m) m.rules.euphoria = !v; EF.T.knockAir = v ? 0 : 1; } },
      { label: 'SHOW AI TARGETS', type: 'toggle', get: () => EF.dev.aiOverlay, set: v => { EF.dev.aiOverlay = v; } }, { label: 'FILL MY CROWD', onPick: act(m => { m.eu[0] = 1; m.euFull[0] = true; m.emit('euphoriaFull', { side: 0 }); }) },
      { label: 'FIRE EUROPHORIA (HOME)', onPick: act(m => { m.eu[0] = 1; m.tryEuphoria(0); }) }, { label: 'FIRE EUROPHORIA (AWAY)', onPick: act(m => { m.eu[1] = 1; m.tryEuphoria(1); }) },
      { label: 'SCORE FOR HOME', onPick: act(m => { m.score[0]++; }) }, { label: 'SCORE FOR AWAY', onPick: act(m => { m.score[1]++; }) },
      { label: 'CORNER FOR HOME', onPick: act(m => m.setPiece('corner', 0, 0, 0, { right: true })) }, { label: 'FREE KICK FOR HOME', onPick: act(m => m.setPiece('freekick', 0, Pitch.X1 - 180, Pitch.CY + 50, {})) },
      { label: 'PENALTY FOR HOME', onPick: act(m => m.setPiece('penalty', 0, 0, 0, {})) }, { label: 'PENALTY FOR AWAY', onPick: act(m => m.setPiece('penalty', 1, 0, 0, {})) },
      { label: 'START A SHOOTOUT', onPick: act(m => m.startShootout()) }, { label: 'TRIGGER A VAR CHECK', onPick: act(m => m.startVar('goal', () => m.emit('varDecision', { overturned: false, kind: 'goal' }), () => m.emit('varDecision', { overturned: true, kind: 'goal' }), 1)) },
      { label: 'RED CARD: RANDOM AWAY PLAYER', onPick: act(m => { const f = m.F.filter(x => x.side === 1 && !x.sentOff && !x.isGK)[0]; if (f) m.giveCard(f, 'red'); }) }, { label: 'SPAWN A SEAGULL', onPick: act(m => m.spawnEvent('seagull')) }, { label: 'SPAWN A PITCH INVADER', onPick: act(m => m.spawnEvent('invader')) },
      { label: 'END THE HALF', onPick: act(m => { m.clock = m.extra ? m.halfSecs * .5 : m.halfSecs; }) }, { label: 'END THE MATCH', onPick: act(m => { m.half = 2; m.clock = m.halfSecs; }) }, { label: 'UNLOCK ALL STICKERS', onPick: () => { EF.STICKERS.forEach(s => EF.Save.sticker(s.id)); D.toast('ALL STICKERS'); } }, { label: 'RESET SAVE DATA', onPick: () => { EF.Save.reset(); D.toast('SAVE RESET'); } }];
    const W = (label, scene, data) => ({ label, onPick: () => { D.close(); game.go(scene, data); } });
    const warp = [W('TITLE', 'title'), W('MATCH: KIPPERS V HOOFERS', 'match', { mode: 'kickabout', home: 'kip', away: 'hoo', humans: [{ idx: 0, side: 0 }], rules: { needWinner: false } }), W('MATCH: AI V AI', 'match', { mode: 'kickabout', home: 'rpp', away: 'svs', stadium: 'pasapasa', humans: [], rules: {} }), W('MATCH: SHOOTOUT ONLY', 'match', { mode: 'penalties', home: 'kip', away: 'acl', humans: [{ idx: 0, side: 0 }], rules: { shootoutOnly: true, needWinner: true } }),
      ...['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium', 'rec'].map(s => W('STADIUM: ' + EF.get('stadium', s).name, 'match', { mode: 'kickabout', home: 'kip', away: 'opu', stadium: s, humans: [{ idx: 0, side: 0 }], rules: {} })),
      ...EF.STORY.rounds.map((rd, i) => W('CUP ROUND ' + (i + 1) + ': ' + rd.name, 'match', { mode: 'cup', round: i, home: 'kip', away: rd.team, stadium: rd.stadium, ref: rd.ref, humans: [{ idx: 0, side: 0 }], rules: { needWinner: true }, onDone: res => game.go('cup', { post: true, res, round: i }) })),
      W('CUP: PROLOGUE', 'cup', { fresh: true }), W('ENDING', 'ending'), W('STICKER ALBUM', 'album'), W('ABOUT', 'about'), W('ATTRACT MODE', 'attract'), ...EF.all('drill').sort((a, b) => a.n - b.n).map(dr => ({ label: 'DRILL ' + dr.n + ': ' + dr.title, onPick: () => { D.close(); EF.startDrill(dr.id); } }))];
    this.lists = [tune, cheats, warp, []];
  },
  list() { return this.lists[this.tab]; },
  update(dt) {
    this.msgT = Math.max(0, this.msgT - dt); const P = game.players, any = a => P.some(p => p.pressed(a)), rep = a => P.some(p => p.repeat(a, .3, .05));
    if (any('cancel') || any('pause') && false) { UI.eatAll(); this.close(); return; }
    if (any('switch') || any('start')) { this.tab = (this.tab + 3) % 4; this.i = 0; this.top = 0; EF.sfx('select'); } if (any('skill')) { this.tab = (this.tab + 1) % 4; this.i = 0; this.top = 0; EF.sfx('select'); }
    const L = this.list(), foc = k => L[k] && !L[k].header;
    if (L.length) { const step = d => { let n = this.i; for (let k = 0; k < L.length; k++) { n = (n + d + L.length) % L.length; if (foc(n)) { this.i = n; return; } } }; if (!foc(this.i)) step(1); if (rep('up')) step(-1); if (rep('down')) step(1);
      const it = L[this.i]; if (it && it.type === 'slider') { const dd = rep('left') ? -1 : rep('right') ? 1 : 0; if (dd) { it.set(clamp(+(it.get() + dd * it.step * (game.input.down('sprint') ? 5 : 1)).toFixed(4), it.min, it.max)); } if (any('confirm')) { it.set(it.def); this.toast('RESET ' + it.label); } }
      else if (it && it.type === 'toggle') { if (any('confirm') || rep('left') || rep('right')) it.set(!it.get()); } else if (it && it.onPick && any('confirm')) { UI.eatAll(); it.onPick(); }
      const rows = this.rows(); if (this.i < this.top) this.top = this.i; if (this.i >= this.top + rows) this.top = this.i - rows + 1; }
    UI.eatAll();
  },
  rows() { return Math.max(6, Math.floor((game.H - 56) / 11)); },
  draw(r) {
    const W = r.W, H = r.H, rows = this.rows(), px0 = 6, pw = Math.min(W - 12, 250); const sc = game.scene, M = sc && sc.M;
    r.overlay(g => {
      px.blend(g, .8, 'normal', () => px.rect(g, px0, 4, pw, H - 8, '#06081a')); px.rect(g, px0, 4, pw, 1, '#ffc83a'); this.tabs.forEach((t, i) => { const x = px0 + 6 + i * 58; TXT(g, t, x, 9, i === this.tab ? '#ffc83a' : '#6a7ab0', { scale: 1 }); if (i === this.tab) px.rect(g, x, 19, 50, 1, '#ffc83a'); });
      TXT(g, 'DEV MODE   ' + (this.msgT > 0 ? this.msg : ''), px0 + 6, H - 14, this.msgT > 0 ? '#9aff9a' : '#6a7ab0', { font: 'tiny' });
      if (this.tab === 3) { const lines = this.info(); lines.forEach((l, i) => TXT(g, l, px0 + 8, 26 + i * 9, '#dfe6ff', { font: 'tiny' })); }
      else { const L = this.list(); for (let k = 0; k < rows; k++) { const it = L[this.top + k]; if (!it) break; const y = 24 + k * 11, foc = this.top + k === this.i; if (it.header) { TXT(g, it.label, px0 + 8, y + 1, '#8a9ac8', { font: 'tiny' }); continue; } if (foc) px.rect(g, px0 + 3, y - 1, pw - 6, 11, '#24366e');
        TXT(g, it.label, px0 + 8, y + 1, foc ? '#ffffff' : '#b8c2e8', { font: 'tiny' });
        if (it.type === 'slider') { const bw = 70, bx = px0 + pw - bw - 40, f = (it.get() - it.min) / (it.max - it.min); px.rect(g, bx, y + 2, bw, 5, '#0a0c14'); px.rect(g, bx, y + 2, Math.round(bw * clamp(f, 0, 1)), 5, it.get() === it.def ? '#6a7ab0' : '#ffc83a'); TXT(g, (+it.get().toFixed(3)).toString(), px0 + pw - 6, y + 1, it.get() === it.def ? '#8a9ac8' : '#ffc83a', { font: 'tiny', align: 'right' }); }
        else if (it.type === 'toggle') TXT(g, it.get() ? 'ON' : 'OFF', px0 + pw - 6, y + 1, it.get() ? '#7aff9a' : '#ff8a7a', { font: 'tiny', align: 'right' }); } }
      UI.footer(g, r, [['switch', 'TAB'], ['skill', 'TAB'], ['confirm', this.tab === 0 ? 'RESET ONE' : 'DO IT'], ['cancel', 'CLOSE']]);
    });
    if (EF.dev.aiOverlay && M) r.queue && M.F.forEach(f => { const s = EF.AI.spot(M, f); r.queue(s[0], s[1], 0, g => { const [x, y] = r.w(s[0], s[1], 0), [fx, fy] = r.w(f.x, f.y, 0); px.line(g, Math.round(fx), Math.round(fy), Math.round(x), Math.round(y), f.side ? '#ff8a7a' : '#7aa8ff', 1); }, { emissive: true }); });
  },
  info() {
    const sc = game.scene, M = sc && sc.M, l = ['SCENE: ' + (sc && sc.name || '?'), 'ENGINE: ' + E.versionLabel().slice(0, 36), 'ERRORS: ' + game.errors.length + (game.errors.length ? ' - ' + String(game.errors[game.errors.length - 1].message).slice(0, 40) : ''), 'SAVE: ' + EF.Save.count() + ' STICKERS, ROUND ' + EF.Save.load().round];
    if (M) l.push('MODE: ' + M.mode + '  HALF ' + M.half + '  CLOCK ' + M.clock.toFixed(1), 'SCORE: ' + M.score.join('-') + '  SEED ' + M.seed, 'BALL: ' + Math.round(M.ball.x) + ',' + Math.round(M.ball.y) + ',' + Math.round(M.ball.z) + ' V' + Math.round(M.ball.speed()), 'OWNER: ' + (M.ball.owner ? M.ball.owner.name : 'NONE'), 'EUPHORIA: ' + M.eu.map(v => v.toFixed(2)).join(' / ') + (M.europhoria ? '  EUROPHORIA' : ''), 'EVENTS: ' + M.events.slice(-4).map(e => e.type).join(','), 'CARDS: ' + M.stats.map(s => s.cards).join('/') + '  FOULS ' + M.stats.map(s => s.fouls).join('/'), 'REF: ' + M.refData.name, 'STADIUM: ' + M.stadium.name);
    return l;
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'F1' && !EF.session) { e.preventDefault(); EF.Dev.toggle(); } });

//# sourceURL=ef/42-hub.js
/* ============ 42-hub: AI Hub session protocol v1, shared-world: the host runs the match, the others send intents and draw snapshots ============ */
EF.RemoteController = class RemoteController {
  constructor() { this.m = [0, 0]; this.sp = false; this.h = 0; this.p = 0; this.r = 0; this.eu = false; }
  set(msg) { this.m = msg.m || [0, 0]; this.sp = !!msg.sp; this.h = msg.h | 0; this.p |= msg.p | 0; this.r |= msg.r | 0; if (msg.eu) this.eu = true; }
  read() { const it = EF.Intent(); it.move = this.m.slice(); it.sprint = this.sp; EF.ACTIONS.forEach((a, i) => { it[a] = { down: !!((this.h >> i) & 1), pressed: !!((this.p >> i) & 1), released: !!((this.r >> i) & 1), held: 0 }; }); it.euphoria = this.eu; this.p = 0; this.r = 0; this.eu = false; return it; }
  stick() { return this.m; } anyFace() { return (this.p & 15) !== 0; }
};
EF.Hub = {
  active: EF.session, info: null, M: null, remote: {}, snap: null, lastSnapAt: 0, lastIn: 0, bits: { p: 0, r: 0, eu: false }, finished: false, lastSeq: 0, sentSeq: 0,
  boot() {
    const H = this; if (!window.AIHub) return;
    AIHub.connect({ mode: 'shared-world', seats: [2, 4] }).then(info => {
      if (!info) { EF.session = false; game.go('title'); return; }
      H.info = info; H.setup(info); AIHub.ready();
    }).catch(e => { console.warn('hub', e); EF.session = false; game.go('title'); });
    AIHub.on('message', (data, from) => H.onMessage(data, from));
    AIHub.on('leave', e => H.onLeave(e)); AIHub.on('time-up', () => H.onTimeUp()); AIHub.on('end', () => { H.ended = true; EF.music(null); EF.crowdAudio.stop(); });
  },
  setup(info) {
    const H = this, server = !!info.server, host = info.isHost, ids = info.players.map(p => p.id);
    const build = () => {
      const M = new EF.Match({ home: 'kip', away: 'opu', stadium: 'euphorium', ref: 'haltwhistle', seed: info.seed || 7, rules: { halfSecs: 75, needWinner: false, noExtra: true, advantage: true }, noReplay: true, noEvents: false, mirror: !host, frozen: host });
      M.rules.halfSecs = 75; M.halfSecs = 75;
      const mine = info.players.find(p => p.id === info.me);
      const order = info.players.slice().sort((a, b) => (a.id === info.me ? -1 : b.id === info.me ? 1 : a.id - b.id));
      for (const p of order) { let ctl = null; if (host) { if (p.id === info.me && !server) ctl = new EF.HumanController(game.input, 0); else { ctl = new EF.RemoteController(); H.remote[p.id] = ctl; } } M.addHuman(p.id, p.id % 2, ctl); }
      H.M = M; return M;
    };
    game.go('match', { mode: 'hub', hub: true, build, hubClient: !host, noResults: true, noReplay: true, noDraw: server, onUpdate: (M, dt) => H.tick(M, dt), music: 'gold', onOver: M => H.finish(M), drawExtra: (r, M) => H.drawExtra(r, M) });
  },
  bitsOf(it) { let h = 0, p = 0, rr = 0; EF.ACTIONS.forEach((a, i) => { if (it[a].down) h |= 1 << i; if (it[a].pressed) p |= 1 << i; if (it[a].released) rr |= 1 << i; }); return [h, p, rr]; },
  tick(M, dt) {
    const info = this.info; if (!info || this.ended) return; const time = AIHub.time(), host = info.isHost;
    if (host) {
      if (M.o.frozen && time >= 0) { M.o.frozen = false; }
      this.lastSnapAt += dt; if (this.lastSnapAt >= .066) { this.lastSnapAt = 0; this.sendSnapshot(M); }
    } else {
      // the client: send what the local player is doing, apply the latest snapshot
      this.lastIn += dt; const me = M.humans[0], ctl = this.local || (this.local = new EF.HumanController(game.input, 0)), it = ctl.read(null, M); const [h, p, rr] = this.bitsOf(it); this.bits.p |= p; this.bits.r |= rr; if (it.euphoria) this.bits.eu = true; M.t += dt;
      if (this.lastIn >= .05 && time > -Infinity) { this.lastIn = 0; AIHub.send({ k: 'i', m: [+it.move[0].toFixed(2), +it.move[1].toFixed(2)], sp: it.sprint ? 1 : 0, h, p: this.bits.p, r: this.bits.r, eu: this.bits.eu ? 1 : 0 }, { to: info.host, reliable: false }); this.bits = { p: 0, r: 0, eu: false }; }
      if (this.snap) this.applySnap(M, this.snap, dt);
    }
  },
  sendSnapshot(M) {
    const ev = M.events.filter(e => e.seq > this.sentSeq).map(e => { const o = { type: e.type, seq: e.seq }; for (const k of ['x', 'y', 'side', 'who', 'name', 'color', 'sup', 'power', 'save', 'perfect', 'overturned', 'kind', 'own', 'header', 'fk', 'pen', 'parry', 'result', 'victim', 'move', 'shot', 'contact', 'cross', 'through', 'by']) if (e[k] !== undefined) o[k] = e[k]; return o; }); if (M.events.length) this.sentSeq = M.events[M.events.length - 1].seq;
    const h = {}; for (const hu of M.humans) if (hu.f) h[hu.idx] = hu.f.id;
    const m = { md: M.mode, hf: M.half, ck: +M.clock.toFixed(2), sc: M.score, eu: M.eu.map(v => +v.toFixed(3)), er: M.europhoria ? [M.europhoria.side, +M.europhoria.t.toFixed(2)] : null, ex: M.extra ? 1 : 0, gd: M.golden ? 1 : 0, rs: M.restartSide, sp: M.sp ? [M.sp.type, M.sp.side, Math.round(M.sp.x), Math.round(M.sp.y), M.sp.taker ? M.sp.taker.id : -1, M.sp.indirect ? 1 : 0] : null, va: M.var ? [M.var.kind, +M.var.t.toFixed(2), M.var.dur] : null, du: M.duel ? [M.duel.side, +M.duel.t.toFixed(2), M.duel.dur] : null, gi: M.goalInfo ? [M.goalInfo.side] : null, rf: [Math.round(M.ref.x), Math.round(M.ref.y)], cd: M.celebrant ? M.celebrant.id : -1, fl: M.flicker > 0 ? 1 : 0, cs: M.refCard ? [M.refCard.color, M.refCard.t] : null };
    try { AIHub.send({ k: 's', c: M.capture(), m, h, e: ev }, { reliable: false }); } catch (e) { /* too big */ }
  },
  onMessage(data, from) {
    if (!data || !this.info) return;
    if (data.k === 'i' && this.info.isHost) { const c = this.remote[from]; if (c) c.set(data); }
    else if (data.k === 's' && !this.info.isHost) this.snap = data;
  },
  applySnap(M, s, dt) {
    const k = 1 - Math.exp(-dt * 16), fr = s.c, m = s.m;
    if (!this.first) { M.restore(fr); this.first = true; } else {
      const B = fr.b, b = M.ball; b.x += (B[0] - b.x) * Math.min(1, k * 1.6); b.y += (B[1] - b.y) * Math.min(1, k * 1.6); b.z = B[2]; b.vx = B[3]; b.vy = B[4]; b.owner = B[5] >= 0 ? M.F[B[5]] : null; b.roll = B[6]; b.sup = B[7] ? { color: '#ffd84a' } : null;
      fr.f.forEach((a, i) => { const f = M.F[i]; const dx = a[0] - f.x, dy = a[1] - f.y; if (Math.hypot(dx, dy) > 60) { f.x = a[0]; f.y = a[1]; } else { f.x += dx * k; f.y += dy * k; } f.z = a[2]; f.facing = E.approachAng(f.facing, a[3], dt * 18); f.vx = a[4]; f.vy = a[5]; f.state = a[6]; f.action = a[7] || null; f.stateT = a[8]; f.tilt = a[9]; f.jump = a[10]; f.celebrate = a[11] ? 2 : 0; f.sentOff = !!a[12]; f.stamina = a[13]; f.charge = a[14]; f.charging = a[14] > 0; });
    }
    M.mode = m.md; M.half = m.hf; M.clock = m.ck; M.score = m.sc; M.eu = m.eu; M.europhoria = m.er ? { side: m.er[0], t: m.er[1] } : null; M.extra = !!m.ex; M.golden = !!m.gd; M.restartSide = m.rs;
    M.sp = m.sp ? { type: m.sp[0], side: m.sp[1], x: m.sp[2], y: m.sp[3], taker: M.F[m.sp[4]], indirect: !!m.sp[5] } : null; M.var = m.va ? { kind: m.va[0], t: m.va[1], dur: m.va[2] } : null; M.duel = m.du ? { side: m.du[0], t: m.du[1], dur: m.du[2] } : null; M.goalInfo = m.gi ? { side: m.gi[0] } : M.goalInfo; M.ref.x = m.rf[0]; M.ref.y = m.rf[1]; M.celebrant = m.cd >= 0 ? M.F[m.cd] : null; M.flicker = m.fl ? 1 : 0; M.refCard = m.cs ? { color: m.cs[0], t: m.cs[1] } : null;
    for (const hu of M.humans) { hu.f = s.h && s.h[hu.idx] !== undefined ? M.F[s.h[hu.idx]] : null; }
    for (const f of M.F) f.human = null; for (const hu of M.humans) if (hu.f) hu.f.human = hu.idx;
    for (const e of s.e || []) if (e.seq > this.lastSeq) { this.lastSeq = e.seq; const t = e.type; delete e.seq; delete e.type; M.emit(t, e); }
    M.over = false;
  },
  finish(M) {
    if (this.finished || !this.info || !this.info.isHost) return; this.finished = true; const res = M.result, ids = this.info.players.map(p => p.id), w = res.winner;
    const win = ids.filter(i => i % 2 === w), lose = ids.filter(i => i % 2 !== w); const standings = w < 0 ? [ids] : [win, lose].filter(a => a.length);
    const scores = {}; for (const i of ids) scores[i] = M.score[i % 2];
    try { AIHub.finish({ standings, scores, won: w < 0 ? undefined : undefined, stats: Object.fromEntries(ids.map(i => [i, { Goals: M.stats[i % 2].goals, Shots: M.stats[i % 2].shots, Tackles: M.stats[i % 2].tackles }])) }); } catch (e) { console.warn(e); }
  },
  onTimeUp() { const M = this.M; if (!M || !this.info || !this.info.isHost) return; const w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1; M.mode = 'over'; M.over = true; M.result = { score: M.score.slice(), winner: w, stats: M.stats, goals: M.goals.slice() }; this.finish(M); },
  onLeave(e) { const M = this.M; if (!M) return; if (this.info && this.info.isHost) { M.humans = M.humans.filter(h => h.idx !== e.id); delete this.remote[e.id]; } else { M.humans = M.humans.filter(h => h.idx !== e.id); } },
  drawExtra(r, M) {
    if (!this.info) return; const t = AIHub.time(); r.overlay(g => { const W = r.W, H = r.H;
      if (t < 0 && t > -Infinity) TXT(g, Math.ceil(-t / 1000) + '', W / 2, H * .3, '#ffe08a', { scale: 6, align: 'center', outline: '#000', shadow: false });
      const me = this.info.me, mySide = me % 2; TXT(g, 'YOU: ' + M.teams[mySide].data.short, W / 2, 6, '#' + 'c8d4ff'.slice(0), { font: 'tiny', align: 'center' });
      if (M.mode === 'over') TXT(g, 'FULL TIME', W / 2, H * .3, '#ffffff', { scale: 3, align: 'center', outline: '#000', shadow: false }); });
  }
};
EF.scenes.hubwait = { view: 'broadcast', input: EF.KEYS, res: 'ps1', touch: [], pausable: false, enter() { EF.Hub.boot(); }, update() {}, draw(r) { r.sky(['#06081a', '#141a3a']); r.overlay(g => TXT(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#ffe7a8', { scale: 2, align: 'center' })); } };

//# sourceURL=ef/43-saves.js
/* ============ 43-saves: cup progress, stickers, unlocks ============ */
EF.Save = {
  d: null,
  fresh() { return { round: 0, started: false, prologue: false, loyal: false, stickers: { 'p:kip:0': 1, 'p:kip:1': 1, 'p:kip:2': 1, 'p:kip:3': 1, 'p:kip:4': 1, 'c:kip': 1 }, challenges: {}, unlocks: {}, records: { played: 0, wins: 0, goals: 0, cups: 0 }, ballId: 'classic' }; },
  load() { if (!this.d) { const s = E.store.get('ef:save2', null); this.d = Object.assign(this.fresh(), s && typeof s === 'object' ? s : {}); } return this.d; },
  save() { E.store.set('ef:save2', this.d); },
  has(id) { return !!this.load().stickers[id]; },
  sticker(id) { const d = this.load(); if (d.stickers[id] || EF.session) return false; d.stickers[id] = 1; this.save(); EF.newStickers = (EF.newStickers || []).concat(id); return true; },
  count() { return Object.keys(this.load().stickers).length; },
  reset() { this.d = this.fresh(); this.save(); }
};
EF.Save.load();

//# sourceURL=ef/50-teams.js
/* ============ 50-teams: formations, tactics, referees, teams, stadiums, supers, celebrations (all data) ============ */
// formation slots: [role, u (0 own goal .. 1 their goal), v (0..1 across)]
EF.def('formation', '2-2', { slots: [['GK', .03, .5], ['DEF', .22, .3], ['DEF', .22, .7], ['FWD', .6, .32], ['FWD', .6, .68]], drop: 4 });
EF.def('formation', '1-2-1', { slots: [['GK', .03, .5], ['DEF', .22, .5], ['MID', .42, .28], ['MID', .42, .72], ['FWD', .64, .5]], drop: 3 });
EF.def('formation', '2-1-1', { slots: [['GK', .03, .5], ['DEF', .22, .32], ['DEF', .22, .68], ['MID', .45, .5], ['FWD', .68, .5]], drop: 3 });
EF.def('formation', '3-1', { slots: [['GK', .03, .5], ['DEF', .16, .25], ['DEF', .13, .5], ['DEF', .16, .75], ['FWD', .55, .5]], drop: 1 });
EF.ROLE = { GK: { att: [0, 0], def: [0, 0], range: [0, .1] }, DEF: { att: [.14, 0], def: [0, 0], range: [.08, .62] }, MID: { att: [.12, 0], def: [-.12, 0], range: [.15, .85] }, FWD: { att: [.18, 0], def: [-.12, 0], range: [.35, .95] } };

EF.def('tactic', 'plucky', { press: .55, line: .45, tempo: .7, passRisk: .5, longBall: .15, foul: .2, dive: .05, shootRange: 170 });
EF.def('tactic', 'routeone', { press: .4, line: .4, tempo: .5, passRisk: .7, longBall: .6, foul: .25, dive: .05, shootRange: 200 });
EF.def('tactic', 'keepball', { press: .55, line: .5, tempo: .85, passRisk: .2, longBall: .02, foul: .08, dive: .05, shootRange: 140, shortBias: .9 });
EF.def('tactic', 'gegenpress', { press: .95, line: .7, tempo: 1, passRisk: .5, longBall: .12, foul: .3, dive: .05, shootRange: 170, pressers: 2 });
EF.def('tactic', 'catenaccio', { press: .3, line: .15, tempo: .6, passRisk: .4, longBall: .35, foul: .55, dive: .5, shootRange: 150 });
EF.def('tactic', 'galacticos', { press: .6, line: .6, tempo: .9, passRisk: .6, longBall: .1, foul: .1, dive: .15, shootRange: 210, vain: true });

EF.def('referee', 'haltwhistle', { name: 'ARTHUR HALTWHISTLE', strict: 1.3, gull: .2, varHappy: .5, skin: '#e0b090' });
EF.def('referee', 'patience', { name: 'PIERRE PATIENCE', strict: .7, gull: .5, varHappy: .4, skin: '#f0c8a8' });
EF.def('referee', 'ironside', { name: 'INGRID IRONSIDE', strict: 1.1, gull: .3, varHappy: .5, skin: '#c89070' });
EF.def('referee', 'severo', { name: 'SERGIO SEVERO', strict: 1.2, gull: .7, varHappy: .9, skin: '#a87050' });

const P = (num, name, pos, o) => Object.assign({ num, name, pos, build: 'heroic', size: 1.1, hair: 'short', skin: '#e0b090', hairColor: '#4a3020', pace: 70, shoot: 70, pass: 70, tackle: 70, skill: 70, keep: 60, weight: 70, temper: 40 }, o);
EF.def('team', 'kip', { name: 'KIPPERTON ATHLETIC', short: 'KIPPERTON', code: 'KIP', nick: 'The Kippers', city: 'Kipperton', stadium: 'smokehouse', formation: '1-2-1', tactic: 'plucky', chant: 'KIP-PER-TON!', celebration: 'fishslap', manager: 'MAGS MULLIGAN',
  kit: { cloth: '#f08a24', color2: '#1c2a5a', pattern: 'hoops', pants: '#1c2a5a', boot: '#14182a', belt: '#1c2a5a', trim: '#f08a24', glove: '#ffd34a', number: '#ffffff' },
  away: { cloth: '#f4f2ec', color2: '#f08a24', pattern: 'sash', pants: '#f4f2ec', boot: '#14182a', belt: '#f4f2ec', trim: '#f08a24', glove: '#ffd34a', number: '#1c2a5a' },
  crest: { shape: 'shield', c1: '#1c2a5a', c2: '#f08a24', sym: 'fish' }, superId: 'kipper',
  players: [P(1, 'WALLY CRABB', 'GK', { build: 'bulky', size: 1.2, hair: 'bald', keep: 76, weight: 80, pace: 50 }), P(4, 'SANDRA OKAFOR', 'DEF', { build: 'bulky', size: 1.2, skin: '#6a4028', tackle: 88, weight: 95, temper: 40, pace: 58, nick: 'THE HARBOUR WALL' }),
    P(6, 'AGGIE NOWAK', 'MID', { size: 1.12, hair: 'ponytail', hairColor: '#d8b060', pass: 90, skill: 70 }), P(7, 'TOMMY TRAN', 'MID', { size: 1.08, hair: 'spiky', hairColor: '#14100c', skin: '#e8c090', pace: 95, skill: 92, nick: 'TWINKLETOES' }),
    P(9, 'DAZ PILCHARD', 'FWD', { size: 1.15, shoot: 90, pace: 80, captain: true, hairColor: '#8a4a20' })] });
EF.def('team', 'hoo', { name: 'AFC HOOFINGTON', short: 'HOOFINGTON', code: 'HOO', nick: 'The Hoofers', city: 'Hoofington', stadium: 'smokehouse', formation: '2-2', tactic: 'routeone', chant: 'HOOOOF!', celebration: 'cheer', manager: 'BRIAN BOOT',
  kit: { cloth: '#6a4a2a', color2: '#e8a830', pattern: 'stripes', pants: '#3a2a1a', boot: '#1a1208', belt: '#3a2a1a', trim: '#e8a830', glove: '#c8c8c8', number: '#ffffff' },
  away: { cloth: '#e8a830', color2: '#6a4a2a', pattern: 'halves', pants: '#6a4a2a', boot: '#1a1208', belt: '#6a4a2a', trim: '#6a4a2a', glove: '#c8c8c8', number: '#ffffff' },
  crest: { shape: 'shield', c1: '#6a4a2a', c2: '#e8a830', sym: 'boot' }, superId: 'meteor',
  players: [P(1, 'ALF STOPPARD', 'GK', { hair: 'bald', keep: 62, pace: 45 }), P(3, 'GAZ HOOPER', 'DEF', { hair: 'spiky', hairColor: '#c89a4a', tackle: 70 }), P(5, 'DUNCAN DUNSTABLE', 'DEF', { build: 'bulky', size: 1.2, weight: 92, tackle: 78, pace: 55, hair: 'bald' }),
    P(8, 'KEV LUMP', 'FWD', { hairColor: '#2a2a2a', pass: 45, shoot: 66 }), P(9, 'NORMAN NEEDHAM', 'FWD', { size: 1.18, hairColor: '#8a8a8a', shoot: 84, captain: true, nick: 'THE NODDER' })] });
EF.def('team', 'rpp', { name: 'REAL PASAPASA', short: 'PASAPASA', code: 'RPP', nick: 'Los Pasitos', city: 'Solera', stadium: 'pasapasa', formation: '1-2-1', tactic: 'keepball', chant: 'OLE!', celebration: 'flagdance', manager: 'DON DIEGO DUENDE',
  kit: { cloth: '#f4f2ec', color2: '#9a7ad0', pattern: 'plain', pants: '#f4f2ec', boot: '#2a2040', belt: '#9a7ad0', trim: '#9a7ad0', glove: '#9a7ad0', number: '#4a3a80' },
  away: { cloth: '#9a7ad0', color2: '#f4f2ec', pattern: 'plain', pants: '#9a7ad0', boot: '#f4f2ec', belt: '#f4f2ec', trim: '#f4f2ec', glove: '#f4f2ec', number: '#ffffff' },
  crest: { shape: 'round', c1: '#f4f2ec', c2: '#9a7ad0', sym: 'sun' }, superId: 'pasodoble',
  players: [P(1, 'PACO PORTERO', 'GK', { keep: 70, hairColor: '#14100c', skin: '#c89070' }), P(4, 'RAFA RONDO', 'DEF', { pass: 82, skin: '#c89070', hairColor: '#14100c' }), P(6, 'TITO TOQUE', 'MID', { pass: 92, skin: '#d8a880', hairColor: '#2a1a10', hair: 'spiky' }),
    P(8, 'IKER INTERIOR', 'MID', { pass: 88, skin: '#c89070', hairColor: '#14100c', hair: 'ponytail' }), P(10, 'PEPITO PASARELA', 'MID', { build: 'chibi', size: 1.0, skill: 96, pass: 94, pace: 82, shoot: 78, captain: true, skin: '#d8a880', hairColor: '#14100c' })] });
EF.def('team', 'svs', { name: 'SV STAHLPRESSE 04', short: 'STAHLPRESSE', code: 'SVS', nick: 'Die Pressen', city: 'Eisenhutte', stadium: 'stahlpresse', formation: '1-2-1', tactic: 'gegenpress', chant: 'HEY! HEY! HEY!', celebration: 'robot', manager: 'DR. HEIKE HOCHDRUCK',
  kit: { cloth: '#6a7078', color2: '#ff7a1a', pattern: 'halves', pants: '#3a3e44', boot: '#ff7a1a', belt: '#ff7a1a', trim: '#ff7a1a', glove: '#ff7a1a', number: '#ffffff' },
  away: { cloth: '#ff7a1a', color2: '#6a7078', pattern: 'halves', pants: '#3a3e44', boot: '#14181c', belt: '#6a7078', trim: '#6a7078', glove: '#6a7078', number: '#14181c' },
  crest: { shape: 'round', c1: '#6a7078', c2: '#ff7a1a', sym: 'cog' }, superId: 'hammer',
  players: [P(1, 'MANNI MAUER', 'GK', { keep: 74, hair: 'bald', skin: '#f0c8a8' }), P(2, 'FRANZI FLEISS', 'DEF', { pace: 88, tackle: 78, hair: 'ponytail', hairColor: '#d8c080', skin: '#f0c8a8' }), P(5, 'UWE UMSCHALT', 'MID', { pace: 84, pass: 76, hairColor: '#c8a050', skin: '#f0c8a8' }),
    P(7, 'JURGEN JAGD', 'MID', { pace: 90, tackle: 76, hair: 'spiky', hairColor: '#4a4a4a', skin: '#f0c8a8' }), P(9, 'KLAUS HAMMERSCHMIDT', 'FWD', { build: 'bulky', size: 1.25, shoot: 92, weight: 92, pace: 66, captain: true, hairColor: '#c89a4a', skin: '#f0c8a8' })] });
EF.def('team', 'acl', { name: 'AC LUCCHETTO', short: 'LUCCHETTO', code: 'ACL', nick: 'I Lucchetti', city: 'Castelfortezza', stadium: 'lucchetto', formation: '2-1-1', tactic: 'catenaccio', chant: 'Mmmmm...', celebration: 'badgekiss', manager: 'MAESTRO MASSIMO MURO',
  kit: { cloth: '#7a1a2a', color2: '#c8ccd4', pattern: 'stripes', pants: '#c8ccd4', boot: '#1a0a10', belt: '#7a1a2a', trim: '#c8ccd4', glove: '#c8ccd4', number: '#ffffff' },
  away: { cloth: '#c8ccd4', color2: '#7a1a2a', pattern: 'sash', pants: '#7a1a2a', boot: '#1a0a10', belt: '#c8ccd4', trim: '#7a1a2a', glove: '#7a1a2a', number: '#7a1a2a' },
  crest: { shape: 'shield', c1: '#7a1a2a', c2: '#c8ccd4', sym: 'lock' }, superId: 'chiave',
  players: [P(1, 'ROCCO RIPARO', 'GK', { keep: 82, hairColor: '#14100c', skin: '#d8a880' }), P(3, 'DINO DIFESA', 'DEF', { tackle: 80, hairColor: '#14100c', skin: '#d8a880' }), P(5, 'MARCO MARCATURA', 'DEF', { tackle: 84, hair: 'spiky', hairColor: '#14100c', skin: '#d8a880', markman: true }),
    P(7, 'FABIO FALLO', 'MID', { temper: 90, skill: 80, hair: 'ponytail', hairColor: '#14100c', skin: '#d8a880', diver: true }), P(10, 'SALVATORE SERRATURA', 'FWD', { pace: 90, shoot: 88, captain: true, hairColor: '#14100c', skin: '#d8a880' })] });
EF.def('team', 'opu', { name: 'OLYMPIQUE OPULENCE', short: 'OPULENCE', code: 'OPU', nick: 'Les Milliardaires', city: 'Aurelia', stadium: 'euphorium', formation: '1-2-1', tactic: 'galacticos', chant: '*polite clapping*', celebration: 'helicopter', manager: 'BARON VON BULLION',
  kit: { cloth: '#e8c040', color2: '#141414', pattern: 'stripes', pants: '#141414', boot: '#f4f4f4', belt: '#e8c040', trim: '#e8c040', glove: '#141414', number: '#141414' },
  away: { cloth: '#141414', color2: '#e8c040', pattern: 'hoops', pants: '#141414', boot: '#e8c040', belt: '#e8c040', trim: '#e8c040', glove: '#e8c040', number: '#e8c040' },
  crest: { shape: 'round', c1: '#e8c040', c2: '#141414', sym: 'crown' }, superId: 'botte',
  players: [P(1, 'GUNNAR VAULT', 'GK', { build: 'bulky', size: 1.7, hair: 'bald', keep: 94, weight: 95, pace: 45, nick: 'THE VAULT', boss: true, skin: '#f0c8a8' }), P(4, 'CASPIAN CASH', 'DEF', { tackle: 84, hairColor: '#d8c080', skin: '#f0c8a8' }), P(8, 'BENTLEY BLING', 'MID', { skill: 90, pass: 86, hair: 'spiky', hairColor: '#d8c080', skin: '#e0b090' }),
    P(11, 'SERGEI SOVEREIGN', 'MID', { pace: 96, hair: 'spiky', hairColor: '#2a2a2a', skin: '#f0c8a8' }), P(10, 'MAXIMILIEN D\'OR', 'FWD', { size: 1.16, skill: 94, shoot: 94, pace: 88, captain: true, hairColor: '#d8c080', skin: '#e0b090', vain: true })] });
EF.def('team', 'gulls', { name: 'GULL ROVERS', short: 'GULLS', code: 'GUL', nick: 'The Gulls', city: 'Gullsbury', stadium: 'rec', formation: '2-2', tactic: 'plucky', chant: 'SQUAWK!', celebration: 'cheer',
  kit: { cloth: '#eef0f6', color2: '#2a5ab8', pattern: 'plain', pants: '#2a5ab8', boot: '#1e2030', belt: '#2a5ab8', trim: '#2a5ab8', glove: '#eef0f6', number: '#2a5ab8' },
  away: { cloth: '#2a5ab8', color2: '#eef0f6', pattern: 'plain', pants: '#eef0f6', boot: '#1e2030', belt: '#eef0f6', trim: '#eef0f6', glove: '#eef0f6', number: '#ffffff' },
  crest: { shape: 'round', c1: '#eef0f6', c2: '#2a5ab8', sym: 'sun' }, superId: 'wobble',
  players: [P(1, 'NOOR BEACH', 'GK', {}), P(2, 'BEX TIDE', 'DEF', { hair: 'spiky' }), P(3, 'SAL SANDS', 'DEF', { hair: 'ponytail' }), P(7, 'DRAGO WAVE', 'FWD', {}), P(9, 'KIT SURF', 'FWD', { captain: true })] });
EF.def('team', 'dummies', { name: 'TRAINING DUMMIES', short: 'DUMMIES', code: 'DUM', nick: 'The Dummies', city: 'The Rec', stadium: 'rec', formation: '2-2', tactic: 'plucky', chant: '...', celebration: 'cheer',
  kit: { cloth: '#8a8a8a', color2: '#5a5a5a', pattern: 'plain', pants: '#5a5a5a', boot: '#3a3a3a', belt: '#5a5a5a', trim: '#8a8a8a', glove: '#8a8a8a', number: '#ffffff' }, away: null,
  crest: { shape: 'round', c1: '#8a8a8a', c2: '#5a5a5a', sym: 'cog' }, superId: 'wobble',
  players: [P(1, 'DUMMY', 'GK', {}), P(2, 'DUMMY', 'DEF', {}), P(3, 'DUMMY', 'DEF', {}), P(4, 'DUMMY', 'FWD', {}), P(5, 'DUMMY', 'FWD', {})] });
EF.CUP = ['hoo', 'rpp', 'svs', 'acl', 'opu'];
EF.REFS = ['haltwhistle', 'patience', 'ironside', 'severo', 'haltwhistle'];

/* ---- stadiums ---- */
EF.def('stadium', 'smokehouse', { name: 'THE SMOKEHOUSE', city: 'Kipperton', time: 'dusk', ambient: .62, weather: { kind: 'rain', amount: .7, wind: .4 }, grass: [[96, 134, 64], [84, 122, 56]], wet: true, mud: true, friction: 1.15, sky: ['#2a2a48', '#6a4a60', '#c8805a'], events: ['seagull', 'flicker', 'keith'], crowd: 600, homeShare: .8, tiers: 3,
  boards: ['SMOKY JOE\'S KIPPERS', 'GULL INSURANCE: WE COVER EVERYTHING', 'PIE-O-MATIC', 'EUROPHORIA COLA'], standColor: '#5a4a5a', roof: '#6a5a4a', music: 'smoke', skyline: 'harbour' });
EF.def('stadium', 'pasapasa', { name: 'ESTADIO PASAPASA', city: 'Solera', time: 'day', ambient: 1, weather: null, grass: [[128, 170, 74], [110, 154, 64]], wet: false, friction: .85, sky: ['#6aa8e8', '#a8d0f0', '#f0e8c8'], events: ['beachball'], crowd: 1400, homeShare: .85, tiers: 4,
  boards: ['EUROPHORIA COLA', 'PIE-O-MATIC', 'SOLERA SUN CREAM', 'BULLION BANK: MONEY TALKS'], standColor: '#e8e0d0', roof: '#c8603a', music: 'olé', skyline: 'palms' });
EF.def('stadium', 'stahlpresse', { name: 'STAHLPRESSE ARENA', city: 'Eisenhutte', time: 'night', ambient: .5, weather: { kind: 'snow', amount: .6, wind: .2 }, grass: [[196, 208, 220], [180, 194, 208]], wet: false, snow: true, friction: .7, sky: ['#0a1020', '#1a2438', '#3a4658'], events: ['invader', 'flicker'], crowd: 1600, homeShare: .85, tiers: 4, ball: 'orange',
  boards: ['STAHLPRESSE: WE PRESS HARDER', 'PIE-O-MATIC', 'EUROPHORIA COLA', 'HAMMER & SON FORGE'], standColor: '#4a5058', roof: '#3a3e44', music: 'forge', skyline: 'steel' });
EF.def('stadium', 'lucchetto', { name: 'STADIO LUCCHETTO', city: 'Castelfortezza', time: 'dusk', ambient: .55, weather: { kind: 'fog' }, grass: [[88, 124, 66], [78, 114, 58]], wet: false, friction: 1, uneven: true, sky: ['#1a1830', '#4a2a48', '#c0705a'], events: ['flare'], crowd: 1200, homeShare: .85, tiers: 3,
  boards: ['CASTELFORTEZZA LOCKSMITHS', 'PIE-O-MATIC', 'EUROPHORIA COLA', 'MURO & FIGLI DEFENCE'], standColor: '#6a5048', roof: '#7a3a2a', music: 'curva', skyline: 'walls' });
EF.def('stadium', 'euphorium', { name: 'THE EUPHORIUM', city: 'Aurelia', time: 'night', ambient: .58, weather: null, grass: [[70, 140, 74], [60, 126, 66]], wet: false, friction: 1, sky: ['#05060f', '#141838', '#3a2a58'], events: ['drone', 'fireworks'], crowd: 1600, homeShare: .5, tiers: 4,
  boards: ['BULLION BANK: MONEY TALKS', 'EUROPHORIA COLA', 'GOLD-PLATED EVERYTHING', 'PIE-O-MATIC (PREMIUM)'], standColor: '#8a7a40', roof: '#c8a838', music: 'gold', skyline: 'dome' });
EF.def('stadium', 'rec', { name: 'KIPPERTON REC', city: 'Kipperton', time: 'day', ambient: .95, weather: null, grass: [[104, 134, 70], [96, 126, 64]], wet: false, friction: 1, sky: ['#8a9ab0', '#b0bcc8', '#d0d4d4'], events: [], crowd: 8, homeShare: 1, tiers: 1,
  boards: ['KIPPERTON REC', 'NO BALL GAMES', 'DOGS ON LEADS', 'MIND THE GULLS'], standColor: '#6a6a60', roof: '#5a5a50', music: 'rec', skyline: 'sea' });

/* ---- super strikes (path of the ball is handled in the sim) ---- */
EF.def('super', 'kipper', { name: 'THE SMOKED KIPPER', path: 'wobble', color: '#f08a24' });
EF.def('super', 'meteor', { name: 'ROW Z RETURN', path: 'meteor', color: '#e8a830' });
EF.def('super', 'pasodoble', { name: 'EL PASODOBLE', path: 'zigzag', color: '#9a7ad0' });
EF.def('super', 'hammer', { name: 'DER HAMMERSCHLAG', path: 'hammer', color: '#ff7a1a' });
EF.def('super', 'chiave', { name: 'LA CHIAVE', path: 'around', color: '#c8ccd4' });
EF.def('super', 'botte', { name: 'LA BOTTE D\'OR', path: 'wobble', color: '#e8c040', decoys: 3 });
EF.def('super', 'wobble', { name: 'THE WOBBLER', path: 'wobble', color: '#eef0f6' });

EF.CELEBRATIONS = [['fishslap', 'THE FISH SLAP'], ['cheer', 'ARMS UP'], ['robot', 'THE ROBOT'], ['flagdance', 'CORNER FLAG DANCE'], ['badgekiss', 'THE BADGE KISS'], ['helicopter', 'THE HELICOPTER'], ['slide', 'KNEE SLIDE']];
EF.BALLS = [{ id: 'classic', name: 'THE CLASSIC', c1: '#f4f4f0', c2: '#2a2a30' }, { id: 'orange', name: 'WINTER ORANGE', c1: '#ff9a2a', c2: '#7a3a08' }, { id: 'leather', name: 'THE OLD LEATHER', c1: '#c89a60', c2: '#5a3a18' }, { id: 'gold', name: 'GOLDEN BALL', c1: '#ffd84a', c2: '#a87a10' }];

//# sourceURL=ef/51-story.js
/* ============ 51-story: speakers, the Cup Run beats, team talks, challenges, stickers, drills ============ */
EF.SPEAKERS = {
  MAGS: { name: 'MAGS MULLIGAN', pitch: .62, rig: { hat: 'cap', hair: 'short', build: 'bulky', outfit: 'coat', sleeves: 'long', colors: { cloth: '#3a4a5a', coat: '#4a5a6a', hair: '#8a8a8a', skin: '#d8a880', trim: '#f08a24' } } },
  DAZ: { name: 'DAZ PILCHARD', pitch: 1, team: 'kip', idx: 4 }, SANDRA: { name: 'SANDRA OKAFOR', pitch: .75, team: 'kip', idx: 1 }, AGGIE: { name: 'AGGIE NOWAK', pitch: 1.25, team: 'kip', idx: 2 }, TOMMY: { name: 'TOMMY TRAN', pitch: 1.35, team: 'kip', idx: 3 },
  NEEDHAM: { name: 'NORMAN NEEDHAM', pitch: .8, team: 'hoo', idx: 4 }, PEPITO: { name: 'PEPITO PASARELA', pitch: 1.5, team: 'rpp', idx: 4 }, KLAUS: { name: 'KLAUS HAMMERSCHMIDT', pitch: .55, team: 'svs', idx: 4 },
  SALVATORE: { name: 'SALVATORE SERRATURA', pitch: 1.0, team: 'acl', idx: 4 }, MAXIMILIEN: { name: 'MAXIMILIEN D\'OR', pitch: 1.1, team: 'opu', idx: 4 },
  BARON: { name: 'BARON VON BULLION', pitch: .5, rig: { hat: 'crown', hair: 'bald', outfit: 'coat', sleeves: 'long', build: 'bulky', colors: { cloth: '#14141a', coat: '#1c1c26', skin: '#f0c8a8', trim: '#e8c040' } } },
  BARRY: { name: 'BARRY', pitch: .85, rig: { hair: 'short', outfit: 'coat', sleeves: 'long', colors: { cloth: '#2a3a6a', coat: '#2a3a6a', hair: '#8a5a30', skin: '#e0b090' } } },
  TREV: { name: 'TREV', pitch: .68, rig: { hair: 'bald', outfit: 'coat', sleeves: 'long', colors: { cloth: '#6a2a2a', coat: '#6a2a2a', skin: '#c89070' } } },
  REF: { name: 'REFEREE', pitch: .9, rig: { hat: 'cap', hair: 'short', colors: { cloth: '#141414', pants: '#141414', trim: '#ffd84a', skin: '#e0b090' } } },
  PA: { name: 'THE PA', pitch: .95, rig: { hair: 'short', outfit: 'coat', colors: { cloth: '#4a4a5a', skin: '#e0b090' } } }
};
EF.def('teamtalk', 'hairdryer', { name: 'HAIRDRYER', sub: 'Get out there and TERRIFY them!', desc: '+10% speed and tackling for 15 minutes. The referee gets twitchy.', lines: ['"Get out there and TERRIFY them! Then come back and tell me what Europe tastes like!"', '"I want FEAR! I want SWEAT! I want a full English at half time!"', '"They put their boots on one at a time, just like you. Then you TREAD on them!"'] });
EF.def('teamtalk', 'shoulder', { name: 'ARM ROUND THE SHOULDER', sub: 'Just enjoy it. Your mum\'s watching.', desc: 'Stamina comes back 25% faster. The crowd starts warm.', lines: ['"Just enjoy it. Your mum\'s watching. And she brought a flask."', '"Win, lose, or draw, there are chips after. That is the law."', '"Look at that crowd. Six hundred people who could be anywhere else. Give them a show."'] });
EF.def('teamtalk', 'board', { name: 'TACTICS BOARD', sub: 'Here\'s the plan.', desc: 'Pick the shape. Passes find their man more often.', lines: ['"Here\'s the plan. Magnets on a fridge door. Nobody touch the magnets."', '"Draw this up, Aggie. No, not the pie. The PLAN."', '"Two at the back, two at the front, and one who knows where the ball is. That\'s you, Aggie."'] });

EF.STORY = {
  prologue: { tabloid: { paper: 'THE DAILY ROAR', head: 'FISH OUT OF WATER!', sub: 'Typo sends tiny Kipperton into the Europhoria Cup. "Rules are rules," shrugs the Federation.' }, place: 'THE SMOKEHOUSE, KIPPERTON',
    talk: [['MAGS', 'Right, you lot. Fourteen quid in the kitty, a minibus with three good tyres, and a letter that says EUROPE.'], ['DAZ', 'Gaffer, do they have chips in Europe?'], ['MAGS', 'They have EVERYTHING in Europe, Darren. Including teams that will eat us for breakfast.'], ['SANDRA', 'Let them try. I have an appetite and all.'], ['MAGS', 'That\'s the spirit. First up, at home: AFC Hoofington. Route-one merchants. Keep your heads up. Literally.']] },
  rounds: [
    { id: 'r1', name: 'QUALIFYING ROUND', team: 'hoo', ref: 'haltwhistle', stadium: 'smokehouse', challenge: 'header',
      pre: { paper: 'THE DAILY ROAR', head: 'THE LONG AND THE SHORT OF IT', sub: 'Hoofington\'s aerial bombardment heads for Kipperton\'s puddles.' }, talk: [['NEEDHAM', 'We don\'t pass, love. We \'oof.']],
      win: { head: 'KIP KIP HOORAY!', sub: 'Tiny Kipperton see off the Hoofers in the rain. Europe has been warned.' }, lose: { head: 'BATTERED!', sub: 'Kippers fried by the Hoofers\' high balls. Not the batter we hoped for.' },
      after: [['MAGS', 'Not bad. Not good. But not bad.'], ['TREV', 'A proper cold night, and they\'ve warmed it up.']] },
    { id: 'r2', name: 'ROUND OF 16', team: 'rpp', ref: 'patience', stadium: 'pasapasa', challenge: 'tackles', travel: 'The minibus heads south. A postcard: "WISH YOU WERE HERE (IT\'S HOT)".',
      pre: { paper: 'THE DAILY ROAR', head: 'PASS THE PARCEL', sub: 'Kippers must stop the passing masters... if they can find the ball.' }, talk: [['PEPITO', 'You will chase the ball until you are dizzy, little fishes.']],
      win: { head: 'SOLE-DESTROYING FOR SOLERA!', sub: 'Pasapasa pass themselves silly. Kipperton pass the test.' }, lose: { head: 'PASSED OUT', sub: 'Kippers chase shadows in the Solera sun and come up empty.' },
      after: [['AGGIE', 'I counted. They made 412 passes.'], ['MAGS', 'And we made two goals. Football\'s a funny old game.']] },
    { id: 'r3', name: 'QUARTER-FINAL', team: 'svs', ref: 'ironside', stadium: 'stahlpresse', challenge: 'nutmeg', travel: 'Snow chains on the minibus. The map turns white. Sandra sits on the heater.',
      pre: { paper: 'THE DAILY ROAR', head: 'PRESSED FOR TIME', sub: 'The Steel Machine never stops running. Kipperton\'s bus barely starts.' }, talk: [['KLAUS', 'We run. You run. We run more.']],
      win: { head: 'KIPPERS MELT THE STEEL!', sub: 'Stahlpresse pressed, Kipperton squeezed through. Cold fish, hot streak.' }, lose: { head: 'CRUSHED', sub: 'The Steel Machine presses the Kippers flat as a pancake.' },
      after: [['TOMMY', 'Did you see his face when it went through his legs?'], ['SANDRA', 'Did you see mine? Frozen solid.']] },
    { id: 'r4', name: 'SEMI-FINAL', team: 'acl', ref: 'severo', stadium: 'lucchetto', challenge: 'freekick',
      pre: { paper: 'THE DAILY ROAR', head: 'PADLOCK AND KEY', sub: 'Can Kipperton crack Europe\'s meanest defence? Locksmiths on standby.' }, talk: [['SALVATORE', 'Nobody scores against Lucchetto. Nobody. We lock the door and we eat the key.'], ['MAGS', 'They\'ll dive, they\'ll moan, and if they go ahead they\'ll park the bus. Don\'t fall for any of it.']],
      win: { head: 'THEY PARKED THE BUS - WE STOLE IT!', sub: 'Kipperton pick the lock and run off with the family silver.' }, lose: { head: 'LOCKED OUT', sub: 'Lucchetto turn the key on Kipperton\'s dream.' },
      after: [['DAZ', 'We are in the FINAL, Gaffer! Is that a good thing?'], ['MAGS', 'It is a very, very good thing, Darren.']] },
    { id: 'r5', name: 'THE FINAL', team: 'opu', ref: 'haltwhistle', stadium: 'euphorium', challenge: 'super',
      pre: { paper: 'THE DAILY ROAR', head: 'DAVID VS GOLDIATH', sub: 'Fish-oil floodlights meet the richest club on Earth.' }, talk: [['MAXIMILIEN', 'I have three Golden Boots. You have... boots.']],
      win: { head: 'THE PLAICE TO BE: KIPPERS ARE KINGS OF EUROPE!', sub: 'Kingsbridge Albion have demanded a recount.' }, lose: { head: 'SO CLOSE! GOLDEN BOYS BREAK KIPPER HEARTS', sub: 'The money wins. This time. Fish never forget.' }, after: [] }
  ],
  villain: { place: 'A HOTEL LOBBY, NIGHT', talk: [['BARON', 'Mister Pilchard. Fifty million. A gold-plated jet ski. And all the caviar you can eat.']], choices: [['I\'M A KIPPER, MATE. ALWAYS.', 'loyal'], ['...DOES THE JET SKI COME IN ORANGE?', 'joke']],
    loyal: [['DAZ', 'Kipper till I die, Baron. Now if you don\'t mind, I\'ve a minibus to catch.'], ['MAGS', 'Darren... I could kiss you. I won\'t. But I could.']], joke: [['DAZ', 'Only joking, Gaffer! Kipper till I die.'], ['MAGS', 'You nearly gave me a heart attack.']] },
  ending: ['The ceremony: a trophy the size of a small lighthouse.', 'The parade: down the harbour road on the back of a fish lorry.', 'Epilogue: "Kingsbridge Albion have demanded a recount."']
};
EF.CHALLENGES = {
  header: { text: 'SCORE A HEADER', test: s => s.headerGoals > 0 }, tackles: { text: 'WIN THE BALL BACK 5 TIMES', test: s => s.tackles >= 5 }, nutmeg: { text: 'NUTMEG AN OPPONENT', test: s => s.nutmegs > 0 },
  freekick: { text: 'SCORE FROM A FREE KICK', test: s => s.fkGoals > 0 }, super: { text: 'SCORE A SUPER STRIKE', test: s => s.superGoals > 0 }
};
EF.STICKERS = (() => {
  const out = [];
  for (const t of ['kip', 'hoo', 'rpp', 'svs', 'acl', 'opu']) { const T = EF.get('team', t); T.players.forEach((p, i) => out.push({ id: 'p:' + t + ':' + i, kind: 'player', ref: t, idx: i, name: p.name, how: t === 'kip' ? 'Yours from the start' : 'Play ' + T.name })); }
  for (const t of ['kip', 'hoo', 'rpp', 'svs', 'acl', 'opu']) { const T = EF.get('team', t); out.push({ id: 'c:' + t, kind: 'crest', ref: t, name: T.name + ' CREST', how: t === 'kip' ? 'Yours from the start' : 'Play ' + T.name }); }
  for (const s of ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium']) out.push({ id: 's:' + s, kind: 'stadium', ref: s, name: EF.get('stadium', s).name, how: 'Play a match there' });
  for (const k of Object.keys(EF.CHALLENGES)) out.push({ id: 'ch:' + k, kind: 'shiny', ref: k, name: 'SHINY: ' + EF.CHALLENGES[k].text, how: 'Gaffer\'s challenge: ' + EF.CHALLENGES[k].text.toLowerCase() });
  out.push({ id: 'x:mags', kind: 'special', name: 'MAGS MULLIGAN', how: 'Finish the prologue' }, { id: 'x:keith', kind: 'special', name: 'KIPPER KEITH', how: 'Tackle the pitch invader' }, { id: 'x:voices', kind: 'special', name: 'BARRY AND TREV', how: 'Hear 50 lines of commentary' },
    { id: 'x:bus', kind: 'special', name: 'THE BUS', how: 'Score past the parked bus' }, { id: 'x:loyal', kind: 'special', name: 'LOYAL KIPPER', how: 'Give the loyal answer' });
  return out;
})();

/* ---- training drills: each step is { text, count: key in the drill counters, n: how many } ---- */
EF.def('drill', 'move', { n: 1, title: 'ON YOUR MARKS', teaches: 'Run, sprint, stamina', who: 'MAGS', steps: [{ text: 'Run to the cones. Left stick or WASD.', k: 'cones', n: 4 }, { text: 'Hold SPRINT and run the length of the pitch.', k: 'sprintSecs', n: 3 }, { text: 'Now let your stamina recover: jog for a few seconds.', k: 'jogSecs', n: 3 }] });
EF.def('drill', 'passing', { n: 2, title: 'PASS MASTER', teaches: 'Pass, through ball, one-two', who: 'AGGIE', steps: [{ text: 'Pass to a teammate. Five times.', k: 'passes', n: 5 }, { text: 'Play two through balls into space.', k: 'throughs', n: 2 }, { text: 'Hold SWITCH and pass for a one-two.', k: 'onetwos', n: 1 }] });
EF.def('drill', 'shooting', { n: 3, title: 'HIT THE TARGET', teaches: 'Power, aim, curl, chip', who: 'DAZ', steps: [{ text: 'Hold SHOOT to charge, release to fire. Hit the target 3 times.', k: 'onTarget', n: 3 }, { text: 'Score a screamer: charge it right up.', k: 'screamers', n: 1 }, { text: 'Chip the keeper with LOB near the area.', k: 'chips', n: 1 }] });
EF.def('drill', 'air', { n: 4, title: 'HEADS UP', teaches: 'Lobs, headers, volleys', who: 'MAGS', steps: [{ text: 'Lob the ball to a teammate. Three times.', k: 'lobs', n: 3 }, { text: 'Meet a high ball with a header: press SHOOT or PASS when it drops by you.', k: 'headers', n: 1 }, { text: 'Volley one: press SHOOT as it dips.', k: 'volleys', n: 1 }] });
EF.def('drill', 'skills', { n: 5, title: 'SHOW BOAT', teaches: 'Step-over, nutmeg, rainbow flick', who: 'TOMMY', steps: [{ text: 'Do three step-overs: SKILL with the stick sideways.', k: 'stepovers', n: 3 }, { text: 'Nutmeg a dummy: SKILL while facing one, up close.', k: 'nutmegs', n: 1 }, { text: 'Rainbow flick: SKILL with the stick forward.', k: 'rainbows', n: 1 }] });
EF.def('drill', 'defending', { n: 6, title: 'THE HARBOUR WALL', teaches: 'Poke, slide, barge, switch', who: 'SANDRA', steps: [{ text: 'Win the ball with a tackle. Three times, no fouls.', k: 'tackles', n: 3 }, { text: 'Switch player with SWITCH.', k: 'switches', n: 2 }, { text: 'Intercept two passes.', k: 'intercepts', n: 2 }] });
EF.def('drill', 'setpieces', { n: 7, title: 'DEAD BALLS', teaches: 'Free kicks, corners, penalties', who: 'MAGS', steps: [{ text: 'Score a penalty. Aim with the stick, charge and release.', k: 'penGoals', n: 1 }, { text: 'Score a free kick.', k: 'fkGoals', n: 1 }, { text: 'Take a corner and score from it.', k: 'cornerGoals', n: 1 }] });
EF.def('drill', 'euphoria', { n: 8, title: 'FEED THE CROWD', teaches: 'Euphoria, Europhoria, Super Strike', who: 'DAZ', steps: [{ text: 'Fill the crowd gauge with passes and tricks.', k: 'euFull', n: 1 }, { text: 'Trigger Europhoria: L1 + R1, or SPACE.', k: 'europhorias', n: 1 }, { text: 'Hit a Super Strike. Charge and let rip.', k: 'supers', n: 1 }] });
EF.def('drill', 'theatrics', { n: 9, title: 'THE DARK ARTS', teaches: 'Dives and the referee', who: 'TOMMY', steps: [{ text: 'Run at a defender and dive after contact. Win a foul.', k: 'diveWins', n: 1 }, { text: 'Dive with nobody near. You get booked. On purpose. Now you know.', k: 'diveBooked', n: 1 }] });

//# sourceURL=ef/52-commentary.js
/* ============ 52-commentary: the lines. "text // reply": Barry says the first, Trev replies. {player} {team} {stadium} {score} ============ */
EF.LINES = {
  kickoff: ["And we're underway at {stadium}! Lovely evening for it, Trev. // It's raining sideways, Barry.", "Peep! Off we go. Two teams, one ball, and a lot of hope.", "We're live from {stadium}, and the pies are already cold. // Barry, they're always cold.", "Here we go then. {team} to get us started. // Please let there be goals. I've a bus to catch.", "The referee blows, and the cup run rolls on!", "Kickoff! Whatever happens, somebody's going home sad. // And somebody's going home with a fish supper.", "Away we go! Five a side, no hiding places. // Nowhere for me to hide, either.", "The crowd are in good voice. The tea urn's in even better voice. // Nobody tell the stewards.", "Football! Real football! Mostly shouting, but football! // Splendid.", "The ball rolls, the season's on the line. // The season is eight minutes long, Barry.", "A deep breath from {team} and the match is off!", "And that's the first pass of the night. Let's hope it's not the last. // Let's hope it's not backwards."],
  goal: ["OH, YOU BEAUTY! {player} has absolutely LEATHERED it! // Keeper had no chance. None. Nada. Zilch.", "GET IN! Back of the net from {player}!", "{team} lead, and the stand is a washing machine! // Spin cycle, Barry.", "It's in! It's in! {player} has done it!", "GOAL! And {player} wheels away like a man who's just found a tenner in an old coat.", "That is a GOAL worthy of any cup! // I'd pay money to see that again. // Oh wait, I did.", "Pandemonium! Utter pandemonium! {score}!", "The net's still shaking! {player} with the finish!", "{player}! Oh, {player}! That's gorgeous! // Frame that and put it over the fireplace.", "In off the post? No. Straight in. Lovely. // A lovely bit of finishing.", "What a strike! The keeper's still looking for it! // He'll find it in the net, Barry.", "And {team} roar into a lead that the crowd will remember for years! // Or at least until the pie queue."],
  goalKip: ["OH MY COD! KIPPERTON HAVE SCORED! // Don't, Barry.", "That's a plaice in history for {player}! // I'll let you off that one.", "KIPPERTON! The smell of success, and it's smoked! // Wonderful.", "Cod save the Kippers! {player} scores! // Stop it.", "The Smokehouse is in uproar and the fish oil floodlights are flickering with joy!", "A kipper in the net! {player} has hooked a beauty!", "The little club from the coast takes the lead! {score}! // I'm welling up. It's the onions.", "That's reel class from {player}! // I'm leaving.", "{player}! You absolute mackerel! In the best way!", "Fin-tastic! {player} finds the net for Kipperton! // Barry, that's the worst yet."],
  save: ["What a stop! The keeper keeps it out! // Fingertips and fury.", "Saved! The keeper's got a hand to that! // Reflexes like a cat. A big, hairy cat.", "Brilliant goalkeeping! He's denied it! // He had that covered.", "Down low, and he's smothered it! Great save!", "He's TIPPED it away! Outstanding! // Strictly speaking, that's his job.", "Keeper's up and he's claimed it. Safe hands.", "What a save! The crowd rise to him! // Fan-tastic. Sorry, I mean fantastic.", "Right place, right time, and the keeper holds firm.", "He got down well there. Not many keepers get down that well after a pie. // I know I don't.", "The gloves say no! Not today, said the keeper."],
  near: ["OHHH! Inches! INCHES! // He'll see that one in his sleep.", "Wide! By a whisker! // A hair's breadth. A thin hair, mind.", "That one's gone just past the post! Agonising!", "He's hit it into the car park! // Is that the road? I think he's hit the road.", "Over the bar! The ball's headed for Belgium! // Don't say that, they've enough to deal with.", "He should've scored! Surely! // The sort you put away with your eyes shut.", "A shocking miss! Blasted over! // That went into orbit.", "So close! The crowd can't believe it!", "Skewed it wide! The groundsman's got a ball to find. // Check the hedge.", "Straight at the keeper. The least he could do was aim.", "Not even close, that one! // It was close to the corner flag.", "Oh, you must hit the target! // The target's very big, Barry."],
  wood: ["DOINK! Off the woodwork! // You could hear that in the car park.", "Off the post! The ball's still rolling! // The post's sent a strong letter of complaint.", "Crossbar! It's come back off the bar! // Rattled the lot.", "The upright saves the keeper! What a strike!", "Hit the post! And away! The keeper must have a horseshoe in his glove! // Or a horse.", "That's rattled the frame! What a effort! // Rattled the goalie too.", "Clang! Off the iron!", "The bar shakes! Nobody's got a clue where it'll go next!", "Off the post and out! An inch inside and it's a goal. // An inch outside and it's the car park.", "The woodwork! And the crowd groan as one! // Like a whale."],
  tackle: ["Great tackle! Wins it cleanly. // Textbook. If the textbook was written by Sandra.", "He's snuffed that out! Lovely challenge! // Stopped him dead.", "In comes the challenge and the ball's gone! // Like a thief in the night.", "Ooh, that's a tackle! Man and ball, mostly ball. // Mostly.", "A good solid challenge there. Shoulder, leg, ball. In that order.", "Well timed! The attacker's left looking at his boots.", "That's hard but fair! The referee waves it on. // That's old-school.", "He's robbed him! The pocket's picked! // Pickpocket FC.", "Strong stuff! He's won it back! // He's been waiting all night for that.", "Textbook defending! A lesson in how to take a ball."],
  slide: ["He's taken man, ball, and most of the grass! // That's a booking in any country.", "WHAT A SLIDE! He's launched him into next week! // Is that the same week as the pies?", "In flies the sliding challenge and bodies go everywhere!", "That's a crunching tackle! The whole stand winced! // I've just felt it in my knee.", "Slide tackle! And he's cleared the lot! // Referee's looking at him very closely.", "The sliding challenge takes the ball and sends the attacker sprawling! // Airborne!", "Sliding in like a penguin on ice! Superb! // A very angry penguin.", "He's gone through the back of him! // Through the back, through the front, through the side...", "Both players are down! Good grief! // Somebody get the sponge.", "Oh my word, that's brought the house down! // And the player, Barry."],
  foul: ["The referee blows. Free kick! // You couldn't argue with that.", "That's a foul, and the referee's got his arm out. // Can't argue.", "Oh, he's clipped him! Free kick given!", "A reckless challenge, and the whistle goes. // Nothing in it, though. Everything in it, actually.", "That was never a fair challenge. // Never in a million years.", "Down he goes, and the referee gives it. Fair enough.", "The crowd want a card! But it's just a free kick for now. // For now.", "Late! Very late! And the whistle blows. // He arrived after the funeral.", "Dangerous play, and the ref blows up. // I'd have blown up too.", "Foul! A free kick in a dangerous position! // Danger zone, Barry."],
  advantage: ["Advantage played! Lovely bit of refereeing. // Flows like a good bitter.", "The referee waves play on! Advantage! // Wise.", "Good advantage there, the ball's still moving.", "Play on! The referee reads that beautifully.", "The referee keeps his whistle in his pocket. Advantage to {team}!", "Advantage, and they're still going! // Brave refereeing.", "The arm goes out. Advantage! // Not today, sir.", "Referee says play on, and so they do!"],
  card: ["The referee reaches for his pocket... and it's YELLOW!", "That's a booking! The name goes in the little black book. // He's got a very full book.", "Yellow card! Wholly deserved. // Any more of that and it'll be red.", "Cautioned. And not for the first time in his career. // Or the last, I'd wager.", "Out comes the card, and a lecture to go with it.", "A yellow for that, and the crowd bay for more. // Crowds. Pfft.", "He's in the book. Careful now. // Careful? He's got a sword for a leg.", "RED CARD! He's off! // Early bath. Don't spare the bubbles.", "That's a second yellow! The walk of shame begins. // Not much to see on the walk, mind.", "Down to four! They'll have to dig in now. // Four is a lot of ground to cover, Barry."],
  dive: ["Oh, he's gone down like a sack of spuds! // There was more contact at my wedding, Barry.", "Is he diving? Is he diving? He's diving! // Oscar material.", "That's a tumble worthy of Strictly. // Ten out of ten from the Russian judge.", "He's rolling over and over! // For a man who was never touched. Amazing.", "Down he goes. The agony! The theatre!", "The simulation is... generous. // I've seen more convincing sea shanties.", "The referee isn't buying it! // Cheaper at the market.", "He's been fouled, he says! Yes, by gravity!", "A dive! A dive! The stands are howling! // And the ref's all ears.", "He's writhing! He's pounding the turf! He's a tiny bit fine. // Miracle recovery."],
  diveBooked: ["Yellow card for the amateur dramatics. Quite right. // Absolutely.", "Booked for simulation! The theatre's closed tonight!", "The referee's seen right through that, and it's a yellow. // See-through as a pane of glass.", "He's cautioned for diving. The drama school will be furious. // Refund the fees.", "Booked! And the crowd roar their approval! // They love a diver getting his comeuppance.", "Pathetic. And the card shows. // No sympathy here.", "The referee isn't fooled. Out comes the yellow. Justice!", "That's a booking for the bad actor. Tough crowd tonight."],
  diveWon: ["And the referee gives it! He's bought it! // Fell for it hook, line and sinker.", "The ref's pointing to the spot! Or the free kick. Either way, a triumph of acting. // BAFTA material.", "He's won the foul! Cheeky, but clever!", "A clever bit of theatre pays off. // I'll allow it. Just this once.", "Was there contact? A bit. Enough? Apparently.", "He knew exactly what he was doing there. // And so did we, but the ref didn't."],
  var: ["Here we go. VAR. Put the kettle on. // Put two on.", "The referee's finger goes to his ear. It's going to VAR! // Nobody move.", "VAR is looking at it. We could be here a while. // Time for a pie.", "The check is on. All eyes on the big screen! // Mine's on the pie.", "Gentlemen, we are going to the monitor. // To the monitor!", "A VAR check. The tension is unbearable. // Mostly because of the queue for the loo.", "They're checking it. We wait. And wait. // And wait.", "VAR's on the case. The crowd's on the edge. // Of their seats and, probably, their nerves."],
  varStand: ["The decision stands! // Thank heavens for that.", "VAR says all clear. The goal stands! // Cue the roar.", "No change! The decision stands, and the crowd erupt!", "Checked and confirmed. The original decision stands. // Thumbs up from the ref."],
  varOver: ["It's been OVERTURNED! Oh, the cruelty! // The cruel, cruel machines.", "VAR rules it out! A shocking decision! // Well, a decision.", "The goal's been ruled out! The crowd can't believe it! // I can't believe it either, and I'm paid to.", "No goal! They've taken it away! // Shame."],
  super: ["WHAT HAS HE DONE TO THAT BALL?! // That's not football. That's sorcery.", "A SUPER STRIKE! The air's on fire! // And the ball's on holiday.", "{player} unleashes the fury of the terraces! // Hold onto your hats!", "It's a Europhoria special! The crowd's power in a boot!", "That ball has a mind of its own! // Several minds, by the look of it.", "THE CROWD HAVE LIFTED HIM! Look at that! // I'm lifting my pie in tribute.", "Unstoppable, surely? Unless the keeper's a wizard. // He is a bit wizardy."],
  duelSave: ["AND THE KEEPER'S GOT IT! FINGERTIPS! UNBELIEVABLE! // I've seen everything now.", "He's read it! He's SAVED it! What a performance! // Reflexes of a hungry cat.", "The Save Duel goes to the keeper! A masterclass in nerve!", "Denied! The sorcery is stopped dead!", "The goalkeeper wins the duel! The crowd's on its feet! // Mine's on the pie."],
  duelGoal: ["The keeper's beaten! No stopping that! // I can't look.", "The duel goes to the striker! In it goes!", "The Super Strike wins it! The keeper had no chance! // Neither did the net.", "Nothing the keeper could do about that. // A cannon in a boot."],
  skill: ["Lovely footwork! He's dancing past him! // Dancing on Ice.", "Step-over, step-over, and he's gone! // The defender's still turning.", "A flick, a trick, and he's through! // Lovely stuff.", "Oh, the skill! The skill on display! // Pure Saturday afternoon.", "He's tied him in knots! // A sailor's knot. A reef knot.", "Fancy footwork! The crowd love that. // The defender doesn't.", "That's pure showmanship! // And I'm all for it."],
  nutmeg: ["Through the legs! He'll hear about that in the canteen. // For a week.", "A NUTMEG! The poor lad's legs are in tatters! // His pride, too.", "The old nutmeg! Never goes out of fashion! // Never goes out of the defender's nightmares.", "Between the legs! Oh, that's cheeky! // Cheeky and brilliant.", "He's nutmegged him! The crowd roars! // I roared. In my head.", "Through the gate! Lovely! // Like threading a needle with a football."],
  header: ["Rises like a salmon! A kipper, actually, but you get the idea.", "A powerful header! // Good aerial prowess.", "He's met that with his head and it's flown! // Stunned a pigeon, I reckon.", "Heads it clear! A mighty clearance.", "The header's on target! // And the keeper's not impressed.", "He's got above his man and nodded it down! // Great leap.", "Bullet header! // Didn't half go.", "A beauty of a header! The big man delivers! // Brought down the house. And the ball."],
  volley: ["He's hit that on the volley! // Sweet as a nut.", "A volley! And what a connection! // Sound like a gunshot.", "The volley is hit with venom! // And a bit of vim.", "Hit first time! That was ferocious! // The ball won't be the same again.", "Straight off the bat! // Wrong sport, Barry.", "Magnificent strike, first time, no messing!"],
  bicycle: ["AN OVERHEAD KICK! ARE YOU KIDDING ME?! // I tried that once. Spent a week in traction.", "Bicycle kick! Upside down and still on target! // Gravity just got a note.", "He's gone airborne! What a connection! // Hair-raising.", "A scissors kick! The stadium gasps! // And the physio gasps loudest.", "That is a work of art! In the air! // I've got a lump in my throat."],
  penalty: ["PENALTY! The referee points to the spot! // No arguments.", "It's a penalty! And a nervy one at that! // I can't watch.", "The referee's given a spot kick. Big moment!", "Penalty! Can they convert from twelve yards? // Of course they can. Can't they?", "It's a penalty and the stadium's holding its breath. // And the pie queue's holding theirs.", "The spot kick is awarded. The ball goes down. The tension's unreal!", "The referee points, the keeper stares, and the world waits. // Dramatic, Barry."],
  shootout: ["It's penalties! The cruellest way to decide a match! // And the best.", "Shootout time! Five each, and nerves of steel required!", "The shootout begins! Pure drama! // My nails are gone.", "From the spot, the next man steps up. // Don't trip.", "Penalty shootout! Nobody can look! // Everyone's looking.", "Heartbreak or joy, in twelve yards. // Mostly heartbreak."],
  halftime: ["That's the half-time whistle. Time for a pie, Trev? // Two pies, Barry.", "Half time at {stadium}. Plenty to discuss. // Mainly pies.", "The players trudge off. The pie queue surges.", "Half time! A cuppa and a rethink for both sides. // And a pie.", "We're at the break, and the scoreline reads {score}. // Over to the pies."],
  fulltime: ["Full time! That's all, folks! {score}!", "The final whistle blows at {stadium}!", "It's all over! What a night of football! // What a night of pies.", "And the referee brings it to an end. {score}. // Drama, drama, drama.", "Full time, and the stadium is buzzing! // Or shuddering. Hard to tell."],
  fulltimeWin: ["They'll be dancing on the harbour wall in Kipperton tonight! // And eating chips.", "KIPPERTON WIN! Put the flags out! // And the fish.", "A famous victory for the Kippers! // Famous for being a bit fishy.", "The Kippers have done it! Wonderful! // I'm not crying. It's the rain."],
  fulltimeLose: ["Heartbreak for Kipperton. They gave everything. // Not quite enough, Barry.", "The Kippers are out of luck tonight. // And, possibly, out of the cup.", "A sad end for the plucky Kippers. // Chin up, lads. There are chips."],
  goldenGoal: ["It's golden goal! Next goal wins it! // No pressure.", "Extra time, sudden death! One goal and it's all over!", "Level at full time! Golden goal now! // My heart can't take it.", "The next goal wins the lot! Nerves of steel! // Or at least nerves."],
  europhoria: ["EUROPHORIA! The crowd have taken over! // The noise! The noise!", "The terraces are bouncing! It's Europhoria time!", "The fans have lifted them! Watch out, everybody! // Flares, scarves, the lot.", "The power of the crowd! It's overflowing! // Like a pint at the Smokehouse.", "Euphoria at its peak! Anything can happen now! // Brace yourselves.", "Europhoria! And the whole stadium's on its feet! // And the floodlights are fizzing."],
  euphoriaFull: ["The crowd are ready to explode! // Press the button, lads!", "The meter's full! Euphoria is bursting at the seams!", "The fans are on the edge, and so is everyone's coat! // What?"],
  skillMove: ["That's the way to beat a man!", "Cheeky bit of skill there. // A dash of flair."],
  seagull: ["And a seagull has taken possession! // Better first touch than some I've seen.", "A gull on the pitch! Stewards, please! // It's got more composure than the back four.", "The seagull's strutting about as if it owns the place. // It does, Barry. It lives here.", "There's a gull in the box! // Offside? // Nobody's asking."],
  beachball: ["A beach ball on the pitch! In the sun, why not!", "Somebody's lobbed a beach ball. The referee isn't amused. // I'd have kept it."],
  invader: ["A pitch invader! Steel Stag! He's running down the wing! // He's got more pace than their left back.", "The steward's chasing a man in a stag costume! Genuinely.", "Steel Stag's on! The crowd are loving it!"],
  keith: ["It's Kipper Keith! The mascot's on the pitch! // He's a kipper. On a pitch. Very sensible.", "KIPPER KEITH! A smoked fish in a flat cap! // A proud tradition."],
  flicker: ["The floodlights are flickering! Maybe the generator's on its last legs. // Or the fish oil's running low.", "The lights are going! Hold on! // Pitch dark and the pies are still hot."],
  flare: ["Flares in the curva! The pitch is choked with red smoke! // Atmosphere!", "The smoke bombs go off and the crowd roar!"],
  drone: ["A drone's buzzing the stadium! Nobody's allowed to do that! // I'd like one for the telly.", "There's a drone above the pitch! Is that allowed? // Probably not, Barry."],
  fireworks: ["Fireworks! The Euphorium lights up! // Gold everywhere.", "A fountain of sparks! Bling bling! // They'd gold-plate the sparks if they could."],
  rain: ["Proper weather, this. Separates the men from the boys. And the boys from their boots.", "The rain's coming down in sheets! // Wet sheets.", "The pitch is like a skating rink! // Keep it low, lads."],
  snow: ["Snow! The ball's orange, the pitch is white, and I'm freezing. // Wonderful.", "A flurry of snowflakes! The players slip and slide! // Brass monkeys."],
  bus: ["They've only gone and LITERALLY parked the bus! // Has it got a ticket?", "Lucchetto drop everyone back. The bus is in town! // Park and Ride.", "It's a wall of burgundy! The bus is parked! // And it's blocking the road."],
  corner: ["Corner kick. Lots of bodies in the box. // Elbows at the ready.", "It's a corner! The big men go up!", "The ball goes out, and it's a corner. Danger!", "A corner to {team}. Chance for a header!"],
  throwin: ["Throw-in. A chance to take stock.", "The ball goes out for a throw. Plenty of space."],
  goalkick: ["The keeper takes the goal kick.", "A goal kick, and a chance to reset."],
  freekick: ["A free kick in a great position! // Dangerous.", "The wall's lined up. A free kick! // A tasty one.", "Free kick! The keeper's building his wall, barking orders.", "Here comes the free kick. All eyes on the taker! // And the wall's eyes on the taker's eyes."],
  lead: ["{team} lead {score}! The crowd can feel it.", "What a game this is turning into! // Absolute rollercoaster."],
  pa: ["Would the owner of a tangerine minibus, registration KIP 1, please return to it. It is being towed.", "Today's attendance is announced as: plenty.", "Please do not feed the seagulls. They are already full.", "A reminder that the pie-o-matic is out of order. Again.", "Would Kevin from section C please stop waving the fish.", "The stewards remind fans that the pitch is for the players.", "Lost property: one scarf, one shoe, one very sad kipper.", "The referee has asked everyone to be quiet. Nobody has listened.", "Pies are now available at the kiosk. Pie-o-matic regrets any inconvenience.", "Please remember to recycle your fish bones.", "Today's match ball is kindly sponsored by a man named Gary.", "If you can hear this announcement, you are in the stadium. Congratulations.", "The half-time draw winner is ticket number 7. We lost the ticket.", "A fan has lost his hat. It is in the net.", "The home supporters are reminded that singing is encouraged. Shouting at the referee is mandatory.", "Please stand clear of the seagull.", "Today's mascot Kipper Keith has been asked to remove the cape.", "We apologise for the delay. The ball has been retrieved from a tree.", "Fans are asked not to throw anything on the pitch. Unless it is a very good hat.", "Pie. That is all."]
};

//# sourceURL=ef/90-start.js
/* ============ 90-start: wrappers, validation, the debug handle, boot, start ============ */
EF.validate = () => {
  const bad = [], need = (cond, msg) => { if (!cond) bad.push(msg); };
  for (const t of EF.all('team')) { need(EF.get('stadium', t.stadium), 'team ' + t.id + ' stadium ' + t.stadium); need(EF.get('formation', t.formation), 'team ' + t.id + ' formation'); need(EF.get('tactic', t.tactic), 'team ' + t.id + ' tactic'); need(EF.get('super', t.superId), 'team ' + t.id + ' super'); need(t.players.length === 5, 'team ' + t.id + ' needs 5 players'); }
  for (const rd of EF.STORY.rounds) { need(EF.get('team', rd.team), 'round ' + rd.id + ' team'); need(EF.get('stadium', rd.stadium), 'round ' + rd.id + ' stadium'); need(EF.get('referee', rd.ref), 'round ' + rd.id + ' ref'); need(EF.CHALLENGES[rd.challenge], 'round ' + rd.id + ' challenge'); for (const [who] of (rd.talk || []).concat(rd.after || [])) need(EF.SPEAKERS[who], 'speaker ' + who); }
  for (const k in EF.LINES) for (const ln of EF.LINES[k]) if (/[^\x20-\x7e]/.test(ln)) bad.push('non-ASCII in line pool ' + k + ': ' + ln.slice(0, 30));
  return bad;
};
EF.loadTune();
// every scene: the dev panel sits over it, and the pause menu's quit goes to the title
for (const name in EF.scenes) { const sc = EF.scenes[name]; sc.name = name; const u = sc.update, d = sc.draw; sc.update = function (dt) { if (EF.Dev.on) { EF.Dev.update(dt); return; } return u.call(this, dt); }; sc.draw = function (r) { d.call(this, r); if (EF.Dev.on) EF.Dev.draw(r); }; }
game.debug = { EF, E, game, validate: EF.validate, snapshot() { const sc = game.scene, M = sc && sc.M; return { scene: sc && sc.name, errors: game.errors.length, match: M ? { mode: M.mode, score: M.score, clock: +M.clock.toFixed(1), half: M.half, ball: [Math.round(M.ball.x), Math.round(M.ball.y)] } : null }; } };
const hashScene = ((typeof location !== 'undefined' && location.hash) || '').slice(1).split('/');
EF.firstScene = EF.session ? 'hubwait' : 'title';
EF.deep = () => {
  const [h, a, b] = hashScene; if (!h || EF.session) return null;
  const rd = a && /^r[1-5]$/.test(a) ? +a[1] - 1 : a === 'final' ? 4 : 0;
  switch (h) {
    case 'attract': return ['attract']; case 'setup': return ['setup']; case 'album': return ['album']; case 'about': return ['about']; case 'ending': return ['ending']; case 'training': return a ? ['match', null, a] : ['training'];
    case 'cup': return ['cup', a ? { round: rd, post: false, resume: true } : { resume: true }, rd];
    case 'match': { const st = a && EF.get('stadium', a) ? a : 'smokehouse'; return ['match', { mode: 'kickabout', home: 'kip', away: 'hoo', stadium: st, humans: [{ idx: 0, side: 0 }], rules: { needWinner: false }, seed: +EF.query.seed || 11, onSetup: M => { if (a === 'corner') M.setPiece('corner', 0, 0, 0, { right: true }); else if (a === 'freekick') M.setPiece('freekick', 0, Pitch.X1 - 170, Pitch.CY + 40, {}); else if (a === 'penalty') M.setPiece('penalty', 0, 0, 0, {}); else if (a === 'shootout') M.startShootout(); else if (a === 'super') { M.eu[0] = 1; M.tryEuphoria(0); } } }]; }
  }
  return null;
};
const bad = EF.validate(); if (bad.length) console.warn('content problems:\n' + bad.join('\n'));
if (!EF.noStart) {
  const dl = EF.deep(); let first = EF.firstScene, data;
  if (dl) { first = dl[0]; data = dl[1]; if (first === 'cup' && dl[1] && dl[1].round !== undefined) { EF.Save.load().round = dl[2]; EF.Save.load().started = true; } if (first === 'training') { /* menu */ } if (first === 'match' && dl[2] && !dl[1]) { EF.pendingDrill = dl[2]; first = 'title'; data = undefined; } }
  game.start({ scenes: EF.scenes, scene: first, data, boot: { title: 'EUROPHORIA FOOTBALL', steps: [['Pitching the pitch', () => { Pitch.build('smokehouse'); }], ['Inflating the ball', () => { EF.ballSprite('classic', 0); EF.ballSprite('classic', 1); }], ['Warming up the crowd', () => { for (const k in EF.SPEAKERS) if (!EF.SPEAKERS[k].rig || true) try { EF.speakerRig(k); } catch (e) { /* later */ } }]] } });
}

})();
