/* Europhoria Football: the game (built by tools/build.mjs from src/; one IIFE on my-3D2dge) */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const EF_ABOUT = {"sourceInformation":{"date":"2026-11-04 07:17:39","source":"European football (over the top arcade style)","plan":"PLAN.md","genre":"Arcade sports: 5-a-side football (four outfield players and a keeper a side) with a story-driven cup run, Kick-About, Penalties and Training","perspective":"A TV broadcast camera: side-on, raised 40 degrees, scrolling with play (a custom engine View); Classic three-quarter and Aerial top-down in Settings; turned cameras for replays","tech":"my-3D2dge v0.85.2 (the handoff package, full engine, five small changes listed in engine/CHANGES-ENGINE.md); its mocap player (readable.js, mocap.js) with a 31-clip set cut from Quaternius, Mesh2Motion and CMU; the AI Hub session client 1.4.0; plain JavaScript (ES2022) in one IIFE built from 40 source fragments into a single HTML file; Node 24 and Playwright 1.63 for the tests","artDirection":"my-3D2dge's native PS1-era pixel art (ps1 resolution, expanded to any screen): HD Humanoid rigs in team kits with hoops, stripes, halves, sashes and shirt numbers; textured TileMap stadiums with tiered stands, code-drawn crowds, LED boards, floodlight pylons, nets that ripple and a skyline per city; crests, tabloid pages, a travel map and stickers painted in code","animation":"The engine's procedural Humanoid rig (gait from velocity, attack specs for passes, shots, volleys, pokes and step-overs, poses and faces), mocap clips through Mocap.drive (slide tackles, celebrations, throws, get-ups, dodges), and a new whole-body tilt for keeper dives, diving headers, bicycle kicks, launched players and theatrical dives","audio":"All in code, no audio files: the engine's chip synth for about 40 effects and 16 original songs (the Europhoria anthem and its variations, Europhoria layers that come in during play); a WebAudio crowd engine (a noise bed that follows the mood, OOOHs, roars, boos, whistles, claps) with sung team chants by an 8-voice formant choir; Animalese-style babble voices for the two commentators, the cast and the echoing stadium PA","online":"AI Hub Session Protocol v1, shared-world, 2-4 players: a host-authoritative match, snapshots 14 a second and coalesced events 5 a second, client interpolation, the game's own card (the tunnel walkout), server mode, leaving, time-up and finish; it passes the hub harness's automatic check in all four scenarios","testing":"One command, node tools/test.mjs, 19 suites printing only failures and a count: unit physics, rules, Euphoria and super strikes, AI with a balance soak and a difficulty curve (a bot-driven human side against the CPU at Easy, Normal and Hard), content, UI by pad, keyboard, mouse and touch-only, saves, attract mode, dev mode, all nine training drills, determinism, lint, a full scripted playthrough of the cup and every mode, a fake-hub loopback with latency, jitter and loss, a browser sweep that draws every scene and moment, an audio and input check in Chromium (every kind of sound measured at the master output, the volume sliders, the pause menu's Dev mode, mouse aim, click to pass and shoot), browser checks with the engine's checker at three screen sizes, the real AI Hub harness in four scenarios, and a TASK.md suite that checks every requirement line by line against the running game; screenshots only for looks (561 checks)","research":"Read the engine's handoff docs (README, API.md, parts of AI_GUIDE.md and API-INDEX.md), the SPORTS kit, the template page and test, the mocap player's header and clip catalogs, and the AI Hub README, harness and session client; no web research","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-opus-5-5, reasoning effort xhigh","usage":"Session time about 3 hours 40 minutes (07:17 to about 10:55); token count and API cost unknown (no usage meter was available to this session)"},"testingFeedback":["About 39: 27 in the game and 12 in the tests themselves. The game's: players frozen on their set-piece spots after every restart, keepers who never saved corner-bound shots, a crash when red cards left a side with no outfield players, three crashes at load or on entering a scene (a registry used before it existed, front-end scenes losing their own methods, story data read before it was defined), two training drills that crashed looking up a hidden keeper, a draw-time crash in the attract mode's scripted Save Duel, difficulty that also weakened or strengthened the human's own teammates (so it barely changed anything), humans auto-switched onto their own goalkeeper, passes that under-led moving receivers, a team with no captain, two short commentary pools, mocap clips that never loaded (the game looked for window.Mocap, but the player is a top-level const), an attract-mode exit slowed by a slow-motion moment, Math.random in the simulation, two syntax errors in commentary text, and screen problems (the PA box over the score and the notices, set-piece prompts and the replay tag under the commentary, the logo over the menu, unknown glyphs, a washed-out snow pitch, the results over the LED boards).","8 were critical: the frozen players, the red-card crash, the three load and scene crashes, the two broken training drills (counted as one), and the two syntax errors that would have stopped the game from loading at all.","The AI-versus-AI smoke run in Node and the scripted playthrough that grew out of it: seeded matches for every tactic printing goals, shots, passes, fouls and a stuck-ball counter found the frozen players, the keeper balance and the red-card crash within minutes; the playthrough then drove the whole cup, the ending, Kick-About, Penalties, a drill, About and the attract mode through the real input. Last, a suite that checks TASK.md line by line against the running game found the mocap clips had never loaded: the game had quietly fallen back to its procedural poses.","Still screenshots of the super strike: timing a browser screenshot from outside the page to a 0.6-second slow-motion charge-up gave confusing frames, while the headless test that every super path reaches the goal answered the real question. (The opposite lesson: headless tests skip drawing, so the browser sweep that draws every moment was worth adding late; it caught the attract mode's draw-time crash.)"],"engineFeedback":["Headless by default with exact fixed steps: the same game.advance drives unit tests, a full playthrough of the game in under two minutes and four networked copies in lockstep. And the Humanoid rig: dressed, shaded characters with kick specs, poses, faces and portraits for free.","A few times: E.store prefixes its keys (a test read localStorage directly), tools/check.mjs cannot take a ?query (I added a #touchonly deep link), clips cut with a SET: prefix lose it in the set, the mocap player is a top-level const and not window.Mocap (I checked the wrong one, and the clips silently never played until late), and canvas lighting with floodlights makes a night pitch read as day until the ambient is lowered.","The football itself: a match simulation (ball physics with woodwork and nets, footballers, keepers, team AI, rules, set pieces, the referee, Euphoria) with a presentation layer that only reads its state and events, so replays, bots, tests, the attract mode and the network host all use the same code path.","Depth and framing in a custom 40-degree view: the goal nets, the LED board faces and the tifo had to be queued at the right anchors to sort against players, and the camera's zoom stacks the scene's start, the player's zoom and the director's own.","Five changes, all marked // EF: and listed in CHANGES-ENGINE.md: dialog voices that can be functions (a babble syllable per letter), named audio buses with now() and the noise buffer, football kit patterns and shirt numbers on the Humanoid, a whole-body tilt state for dives and acrobatics, and accented letters in the 5x7 font.","A built-in tilt or orientation channel on the Humanoid for dives, falls and acrobatics, together with kit patterns, so sports and action games do not have to patch the rig."],"promptFeedback":["It is concrete about the deliverable and the test discipline (one command, only failures, no subagents judging) and leaves the genre, look and scope to the builder; the attached plan made the size of the game explicit.","The plan was written for another run (its file and folder names carry a different model, effort and date), so the names had to be re-derived from TASK.md; and the plan asks for more than TASK.md does, so how much of it is required had to be judged.","Fitting a whole sports game, a story mode, training, the attract mode, dev tools and networked play into one coherent single-file build where every feature is real and tested.","Tie the plan's file names to TASK.md's run name (or mark them as placeholders), and say whether a plan's extra scope is required or optional."],"aiHub":{"name":"Europhoria Football","tagline":"Over-the-top arcade football","description":"A broke seaside club rides its fans' euphoria through Europe's grandest cup: 5-a-side arcade football with super strikes, dives, VAR and a crowd that powers your team.","type":"Game","genre":"Sports","source":"European football","series":"","players":"1–4","controls":"Stick/WASD move · ✕/J pass · □/K shoot · ○/L lob · R1/E skill · R2/Shift sprint · L1+R1/Space Europhoria","tags":["arcade","pixel art","comedy","versus","co-op","story"]}};
/* ==== src/00-core.js ==== */
/* EUROPHORIA FOOTBALL - the core: the EF namespace, registries (the designers' language), the event bus, the tuning
 * table (dev sliders), random streams, small helpers, deep links; then the broadcast view, the input preset, the
 * settings and the Game itself (the Game reads all three when it is made). */
const EF = { version: '1.0.0', ABOUT: EF_ABOUT };
const ease = E.ease;
EF.scenes = {};
window.EF = EF;   // the test and dev handle

/* ---- registries: EF.def(kind, id, spec), EF.get(kind, id), EF.all(kind) ---- */
const REG = {};
EF.def = (kind, id, spec) => { const r = REG[kind] || (REG[kind] = new Map()); spec.id = id; spec.kind = kind; r.set(id, spec); return spec; };
EF.get = (kind, id) => { const r = REG[kind]; return r ? r.get(id) || null : null; };
EF.all = kind => REG[kind] ? [...REG[kind].values()] : [];
EF.kinds = () => Object.keys(REG);
EF.lines = (pool, entries) => EF.def('lines', pool, { entries });

/* ---- the event bus: the match emits, presentation listens ---- */
EF.bus = {
  _h: {}, log: [], logOn: false,
  on(type, fn) { (this._h[type] || (this._h[type] = [])).push(fn); return () => this.off(type, fn); },
  off(type, fn) { const l = this._h[type]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(type, ev = {}) {
    ev.type = type;
    if (this.logOn) { this.log.push(ev); if (this.log.length > 4000) this.log.splice(0, 1000); }
    for (const k of [type, '*']) { const l = this._h[k]; if (l) for (const fn of l.slice()) try { fn(ev); } catch (e) { game.fail('bus ' + type, e); } }
    return ev;
  }
};

/* ---- tuning: every important gameplay number, live in dev mode (Appendix A) ---- */
EF.TUNE = [
  // key, default, min, max, step, group, what it does
  ['runSpeed', 88, 60, 130, 1, 'Movement', 'base run speed (u/s), before the pace stat'],
  ['sprintMul', 1.45, 1.1, 2, .05, 'Movement', 'sprint multiplier'],
  ['accel', 900, 300, 2000, 50, 'Movement', 'acceleration (u/s2)'],
  ['staminaDrain', 20, 5, 50, 1, 'Movement', 'stamina per second of sprint'],
  ['staminaRegen', 14, 5, 40, 1, 'Movement', 'stamina per second at rest'],
  ['ballFriction', 1.1, .3, 3, .05, 'Ball', 'rolling decay on grass'],
  ['ballBounce', .55, .1, .9, .05, 'Ball', 'restitution on grass'],
  ['ballGravity', 600, 300, 1000, 10, 'Ball', 'gravity on the ball'],
  ['trapSpeed', 210, 120, 320, 5, 'Ball', 'the fastest ball trapped at 9 units'],
  ['passSpeedMin', 150, 80, 250, 5, 'Passing & Shooting', 'slowest ground pass'],
  ['passSpeedMax', 300, 200, 450, 5, 'Passing & Shooting', 'fastest ground pass'],
  ['passAssistDeg', 70, 0, 90, 5, 'Passing & Shooting', 'the High pass-assist cone (degrees)'],
  ['shotChargeTime', .8, .3, 2, .05, 'Passing & Shooting', 'seconds to full power'],
  ['shotSpeedMax', 420, 250, 600, 10, 'Passing & Shooting', 'fastest shot'],
  ['curlStrength', 3.2, 0, 8, .1, 'Passing & Shooting', 'aftertouch spin per second'],
  ['keeperReaction', .18, .05, .5, .01, 'Keepers', 'seconds before a keeper moves'],
  ['keeperReach', 48, 24, 80, 1, 'Keepers', 'lateral dive reach'],
  ['tackleReach', 9, 4, 16, .5, 'Defending & Rules', 'standing tackle reach'],
  ['slideSpeed', 190, 100, 300, 5, 'Defending & Rules', 'slide tackle speed'],
  ['foulStrictness', 1, 0, 2, .05, 'Defending & Rules', 'x the referee\'s own strictness'],
  ['diveSuccess', 1, 0, 2, .05, 'Defending & Rules', 'x the referee\'s gullibility'],
  ['euphoriaGain', 1, 0, 4, .1, 'Euphoria', 'x every Euphoria gain'],
  ['euphoriaDecay', 1.5, 0, 6, .1, 'Euphoria', 'Euphoria lost per second'],
  ['europhoriaTime', 8, 3, 20, .5, 'Euphoria', 'seconds of Europhoria'],
  ['superSpeed', 520, 300, 800, 10, 'Euphoria', 'super strike speed'],
  ['aiReaction', .25, .05, .8, .01, 'AI', 'seconds between CPU decisions (Normal)'],
  ['aiAccuracy', .8, .3, 1, .05, 'AI', 'CPU decision accuracy'],
  ['aiAggression', .5, 0, 1, .05, 'AI', 'how hard the CPU presses and tackles'],
  ['halfLength', 120, 20, 300, 10, 'Match', 'real seconds a half (overrides Settings while changed)'],
  ['gameSpeed', 1, .25, 2, .05, 'Match', 'game speed (time scale)']
];
EF.T = {}; EF.TDEF = {};
for (const [k, v] of EF.TUNE) { EF.T[k] = v; EF.TDEF[k] = v; }
EF.tune = k => EF.T[k];
EF.tuneSet = (k, v) => { const row = EF.TUNE.find(r => r[0] === k); if (!row) return; v = clamp(+v, row[2], row[3]); v = Math.round(v / row[4]) * row[4]; EF.T[k] = +v.toFixed(4); EF.tuneSave(); };
EF.tuneChanged = k => k ? Math.abs(EF.T[k] - EF.TDEF[k]) > 1e-9 : EF.TUNE.some(r => Math.abs(EF.T[r[0]] - r[1]) > 1e-9);
EF.tuneReset = k => { for (const r of EF.TUNE) if (!k || r[0] === k) EF.T[r[0]] = r[1]; EF.tuneSave(); };
EF.tuneSave = () => { if (EF.inSession) return; const o = {}; for (const r of EF.TUNE) if (EF.tuneChanged(r[0])) o[r[0]] = EF.T[r[0]]; E.store.set('ef:tuning', o); };
EF.tuneLoad = () => { const o = E.store.get('ef:tuning', {}); if (o && typeof o === 'object') for (const r of EF.TUNE) if (typeof o[r[0]] === 'number') EF.T[r[0]] = clamp(o[r[0]], r[2], r[3]); };

/* ---- random streams: the match's own (seeded, the sim's only randomness) and the cosmetic one ---- */
EF.fxRng = E.rng(0xEF5EED);
EF.fx = (a = 0, b = 1) => a + (b - a) * EF.fxRng();
EF.fxPick = l => l[Math.floor(EF.fxRng() * l.length) % l.length];

/* ---- helpers ---- */
const H = EF.H = {
  d: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  d2: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  ang: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
  segDist(o, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); },
  angDiff: (a, b) => E.angDiff(a, b),
  norm(x, y) { const l = Math.hypot(x, y); return l > 1e-6 ? [x / l, y / l] : [0, 0]; },
  gauss(R) { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); },
  pick: (R, l) => l[Math.floor(R() * l.length) % l.length],
  shuffle(R, l) { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  mmss: s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'),
  fill(s, vars) { return String(s).replace(/\{\$(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m); },
  ease: E.ease
};

/* ---- deep links: #scene/part, ?seed=N, ?touchonly=1, ?dev=1 ---- */
EF.link = (() => {
  const h = (location.hash || '').replace(/^#/, ''), q = String(location.search || '');
  const qp = k => { const m = new RegExp('[?&]' + k + '=([^&#]*)').exec(q); return m ? decodeURIComponent(m[1]) : null; };
  const [scene, part, extra] = (h === 'touchonly' ? '' : h).split('/');
  return { scene: scene || null, part: part || null, extra: extra || null, seed: qp('seed') !== null ? +qp('seed') : null, touchonly: qp('touchonly') === '1' || /(^|\/)touchonly$/.test(h), dev: qp('dev') === '1' };
})();

/* ---- the AI Hub session (session.js ran first, so this is known from the first line) ---- */
EF.inSession = !!(window.AIHub && window.AIHub.active);

/* ---- the views: the broadcast camera (side-on, raised 40 degrees) and a low pitchside one for replays ---- */
E.VIEWS.broadcast = E.VIEWS.broadcast || new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
E.VIEWS.pitchside = E.VIEWS.pitchside || new E.View('pitchside', 'Pitchside', 0, 22, 1, 1);
EF.CAMERAS = { broadcast: 'broadcast', classic: 'threequarter', aerial: 'topdown' };

/* ---- the controls (section 2): a fresh preset, the game's actions in this order (half keyboards take them in turn) ---- */
EF.KEYS = (() => {
  const D = E.Input.DEFAULT, K = {};
  for (const a of ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel']) K[a] = D[a].slice();
  Object.assign(K, {
    pass: ['KeyJ', 'Pad0'], shoot: ['KeyK', 'Pad2'], lob: ['KeyL', 'Pad1'], through: ['KeyI', 'Pad3'],
    sprint: ['ShiftLeft', 'ShiftRight', 'Pad7'], skill: ['KeyE', 'Pad5'], switch: ['KeyQ', 'Pad4'], dive: ['KeyC', 'Pad6'],
    euphoria: ['Space'],
    // the mouse's buttons in play (read only while mouse aim is on), and the dev panel
    mpass: ['Mouse0'], mshoot: ['Mouse2'], mlob: ['Mouse1'], dev: ['Backquote', 'F1']
  });
  return K;
})();
EF.ACTIONS = ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive', 'euphoria'];

/* ---- the game's settings (section 6.31) ---- */
EF.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard'], ['europhoric', 'Europhoric']], help: 'How sharp the CPU teams are' },
  { key: 'halfLength', label: 'Half length', type: 'select', value: '120', options: [['90', '1:30'], ['120', '2:00'], ['180', '3:00'], ['240', '4:00']], help: 'Real time per half (45 game minutes)' },
  { key: 'passAssist', label: 'Pass assist', type: 'select', value: 'high', options: [['off', 'Off'], ['low', 'Low'], ['high', 'High']], help: 'How far a pass bends toward a teammate' },
  { key: 'shotAssist', label: 'Shot assist', type: 'toggle', value: true, help: 'With no aim, shots go to the corner farther from the keeper' },
  { key: 'switching', label: 'Switching', type: 'select', value: 'assisted', options: [['auto', 'Auto'], ['assisted', 'Assisted'], ['manual', 'Manual']], help: 'Assisted: automatic, but never while you sprint' },
  { key: 'cards', label: 'Cards', type: 'select', value: 'normal', options: [['off', 'Off'], ['normal', 'Normal'], ['strict', 'Strict']] },
  { key: 'draws', label: 'Draws (Kick-About)', type: 'select', value: 'allowed', options: [['allowed', 'Allowed'], ['golden', 'Golden goal'], ['penalties', 'Penalties']] },
  { key: 'prompts', label: 'Button prompts', type: 'select', value: 'learning', options: [['always', 'Always'], ['learning', 'While learning'], ['off', 'Off']] },
  { key: 'commentary', label: 'Commentary', type: 'toggle', value: true },
  { key: 'replays', label: 'Goal replays', type: 'toggle', value: true },
  { key: 'camera', label: 'Camera', type: 'select', value: 'broadcast', options: [['broadcast', 'Broadcast'], ['classic', 'Classic'], ['aerial', 'Aerial']] },
  { key: 'radar', label: 'Radar', type: 'toggle', value: true },
  { key: 'voices', group: 'Sound', label: 'Voices', type: 'slider', value: .8, apply: g => g.audio.bus && g.audio.bus('voices') },
  { key: 'crowd', group: 'Sound', label: 'Crowd', type: 'slider', value: .8, apply: g => g.audio.bus && g.audio.bus('crowd') },
  { key: 'glyphs', group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']],
    apply: (g, v) => { g.input.glyphs = v; for (const p of g.players || []) p.glyphs = v; } }
];

/* ---- the Game ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', bg: '#06070c', id: 'europhoria-football',
  input: EF.KEYS, corner: !EF.inSession,
  menu: {
    settings: EF.SETTINGS,
    controls: { pass: 'Pass / Tackle', shoot: 'Shoot / Slide', lob: 'Lob / Barge', through: 'Through ball / Switch', sprint: 'Sprint', skill: 'Skill move',
      switch: 'Switch / One-two', dive: 'Theatrics', euphoria: 'Europhoria', mpass: false, mshoot: false, mlob: false, dev: false },
    items: EF.inSession ? [] : [['Restart match', () => EF.restartMatch && EF.restartMatch()], ['Dev mode', () => EF.Dev && EF.Dev.open(true)]],
    quit: EF.inSession ? false : 'title', saves: false
  }
});
EF.game = game;
const P_ = game.particles, L_ = game.lights, A_ = game.audio;
try { new E.Shell(game, { theme: { ink: '#fff6e0', paper: '#0d1430', accent: '#ffc83a', muted: '#9aa6c8', danger: '#ff5a4a', line: '#2a3a6a' } }); } catch (e) { game.fail('shell', e); }
EF.tuneLoad();
EF.halfLength = () => EF.tuneChanged('halfLength') ? EF.T.halfLength : +(game.settings.halfLength || 120);
EF.DIFF = { easy: { react: .38, acc: .6, agg: .3, keeper: .26, eu: .8, cpuSuper: .15, shotErr: 2, pace: .88 }, normal: { react: .25, acc: .8, agg: .5, keeper: .19, eu: 1, cpuSuper: .3, shotErr: 1, pace: 1 },
  hard: { react: .16, acc: .9, agg: .7, keeper: .15, eu: 1.15, cpuSuper: .45, shotErr: .75, pace: 1.05 }, europhoric: { react: .1, acc: .97, agg: .85, keeper: .12, eu: 1.3, cpuSuper: .55, shotErr: .55, pace: 1.1 } };
/** the difficulty's numbers: they shape the CPU's sides only (a human's teammates play at Normal) */
EF.diff = () => EF.DIFF[game.settings.difficulty] || EF.DIFF.normal;
/* ==== src/01-input.js ==== */
/* INPUT (section 2): the HumanController turns one player's device into an Intent for the footballer he holds: the
 * stick (screen direction turned to the ground), the buttons, the Europhoria chord (switch + skill within 120 ms),
 * mouse aim (a reticle on the pitch; clicks pass, shoot, lob, switch). Also touch-only detection (section 6.33). */
const ACT_KEYS = ['pass', 'shoot', 'lob', 'through', 'skill', 'switch', 'dive'];
class HumanController {
  constructor(m, slot) { this.m = m; this.slot = slot; this.raw = null; this.lastT = -1; this.pend = null; this.mouseT = -9; this.lastPtr = null; this.mouse = false; this.held = {}; }
  get input() { return this.slot.input; }
  /** the device read once a step: { move, aim, aimPoint, sprint, buttons..., euphoria, target } */
  read() {
    const m = this.m; if (this.lastT === m.t && this.raw) return this.raw;
    this.lastT = m.t;
    const I = this.input, it = EF.Intent.make();
    if (!I || EF.blockInput) { this.raw = it; return it; }
    const mv = I.move(), k = Math.min(1, Math.hypot(mv[0], mv[1]));
    if (k > .05) { const d = game.view.screenDirToGround(mv[0], mv[1]); it.move = [d[0] * k, d[1] * k]; }
    it.sprint = I.down('sprint');
    const B = a => ({ down: I.down(a), pressed: I.pressed(a), released: I.released(a) });
    it.pass = B('pass'); it.shoot = B('shoot'); it.lob = B('lob'); it.through = B('through'); it.skill = B('skill'); it.sw = B('switch'); it.dive = B('dive');
    it.euphoria = I.pressed('euphoria');
    // the chord: switch and skill within 120 ms make Europhoria; alone, each waits that long, then acts
    const now = game.real || m.t;
    if (it.sw.pressed || it.skill.pressed) {
      const which = it.sw.pressed ? 'sw' : 'skill', other = which === 'sw' ? 'skill' : 'sw';
      if ((it.sw.pressed && it.skill.pressed) || (this.pend && this.pend.a === other && now - this.pend.t < .12)) { it.euphoria = true; this.pend = null; it.sw.pressed = it.skill.pressed = false; }
      else { this.pend = { a: which, t: now }; it[which].pressed = false; }
    }
    if (this.pend && now - this.pend.t >= .12) { it[this.pend.a].pressed = true; this.pend = null; }
    // mouse aim: on while the mouse moves over the canvas in play; off after 3 s still, or when a stick is used
    const ptr = I.pointer && I.pointer();
    if (ptr && (!this.lastPtr || Math.abs(ptr[0] - this.lastPtr[0]) + Math.abs(ptr[1] - this.lastPtr[1]) > 1)) { this.mouseT = now; this.mouse = true; }
    this.lastPtr = ptr ? ptr.slice() : null;
    if (this.mouse && (now - this.mouseT > 3 || I.lastDevice === 'gamepad')) this.mouse = false;
    if (this.mouse && this.slot.n === 0) {
      const g = game.mouseGround && game.mouseGround();
      if (g) {
        it.aimPoint = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y };
        const f = this.slot.fb;
        if (f) { const d = H.norm(it.aimPoint.x - f.body.x, it.aimPoint.y - f.body.y); it.aim = d; }
        // a click on a teammate: pass to him (with the ball) or switch to him (without)
        const mp = I.pressed('mpass'), ms = I.down('mshoot'), mr = I.released('mshoot'), ml = I.pressed('mlob');
        if (mp || ml) {
          const mate = m.side[this.slot.side].filter(q => q !== f && !q.sentOff).sort((a, b) => H.d(a.body, it.aimPoint) - H.d(b.body, it.aimPoint))[0];
          if (mate && H.d(mate.body, it.aimPoint) < 22) it.target = mate;
          if (mp) it.pass.pressed = true; if (ml) it.lob.pressed = true;
          if (mp && f && !f.hasBall() && it.target) { m.giveTo(this.slot, it.target); it.pass.pressed = false; }
        }
        if (ms) it.shoot.down = true; if (mr) it.shoot.released = true;
        if (I.pressed('mshoot')) it.shoot.pressed = true;
      }
    }
    // celebration picks and the Save Duel use the face buttons: kept as they are
    this.raw = it; return it;
  }
  /** what a set piece, a keeper's distribution, the Save Duel or a celebration reads: presses this step */
  peek() { const r = this.read(); return { move: r.move, pass: r.pass.pressed, shoot: r.shoot.pressed, lob: r.lob.pressed, through: r.through.pressed, skill: r.skill.pressed, sw: r.sw.pressed, dive: r.dive.pressed, shootDown: r.shoot.down, cel: -1, aimPoint: r.aimPoint }; }
  intent(f, dt) {
    const it = this.read(), m = this.m;
    if (m.lastKick && m.lastKick.human === this.slot && m.lastKick.curlT > 0) m.lastKick.aftertouch(it.move, dt);
    if (f !== this.slot.fb) return m.brains[f.side].intent(f, dt);
    return it;
  }
}
EF.HumanController = HumanController;

/* ---- touch-only devices: no touch controls; a notice and the settings button (section 6.33) ---- */
EF.touchState = { forced: EF.link.touchonly, cleared: false };
EF.touchOnly = () => {
  const T = EF.touchState; if (T.cleared) return false; if (T.forced) return true;
  try {
    const coarse = matchMedia('(any-pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
    return coarse && !fine && !pads;
  } catch (e) { return false; }
};
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { EF.touchState.cleared = true; EF.touchState.forced = false; }, { capture: true });
  addEventListener('gamepadconnected', () => { EF.touchState.cleared = true; EF.touchState.forced = false; });
}
/* ==== src/02-glyphs.js ==== */
/* GLYPHS AND PROMPTS (section 2.3): the pad's buttons drawn by code (the pixel font has no ✕ ○ □ △): PlayStation
 * shapes by default, Xbox letters in Settings; keycaps for the keyboard, a mouse with its button lit. Prompts follow the
 * device each player used last. EF.prompt(g, x, y, action, label, { input, scale, color }) returns its width. */
const PS = { 0: ['cross', '#6aa0ff'], 1: ['circle', '#ff5a5a'], 2: ['square', '#ff7ad0'], 3: ['triangle', '#3ad6a0'] };
const XB = { 0: ['A', '#4ac84a'], 1: ['B', '#e84a4a'], 2: ['X', '#4a8ae8'], 3: ['Y', '#e8c83a'] };
const PILLS = { playstation: { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 16: 'PS' }, xbox: { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS', 16: 'XBOX' } };
EF.Glyphs = {
  style(input) { const g = (input && input.glyphs) || game.settings.glyphs; return g === 'xbox' ? 'xbox' : 'playstation'; },
  /** the code an action is bound to on a device (the logic of input.label) */
  code(input, a, device) {
    const m = input && input.map && input.map[a]; if (!m) return null;
    const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis')), pads = real.filter(c => /^Pad\d+$/.test(c)), keys = real.filter(c => !/^Pad\d+$/.test(c));
    return device === 'gamepad' ? pads[0] || keys[0] : keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0] || null;
  },
  /** width in pixels of a glyph for a code at scale s */
  width(input, code, s = 1) {
    if (!code) return 0;
    if (/^Pad\d+$/.test(code)) { const i = +code.slice(3), st = this.style(input); if (i <= 3) return 11 * s; if (i >= 12 && i <= 15) return 11 * s; const t = PILLS[st][i] || '?'; return (E.font.width(t, { font: 'tiny' }) + 6) * s; }
    if (code.startsWith('Mouse')) return 9 * s;
    const t = input && input.codeLabel ? input.codeLabel(code) : code; return Math.max(11, E.font.width(String(t).toUpperCase(), { font: t.length > 2 ? 'tiny' : 'normal' }) + 6) * s;
  },
  /** draw a glyph for a code with its top-left at (x, y), scale s; returns its width */
  draw(g, input, code, x, y, s = 1, dim = false) {
    if (!code) return 0;
    x = Math.round(x); y = Math.round(y);
    const S = v => Math.round(v * s);
    if (/^Pad\d+$/.test(code)) {
      const i = +code.slice(3), st = this.style(input);
      if (i <= 3) {
        const [k, col] = (st === 'xbox' ? XB : PS)[i], cx = x + S(5.5), cy = y + S(5.5), rr = S(5.5);
        px.disc(g, cx, cy, rr, dim ? '#2a2a34' : '#14141c'); px.disc(g, cx, cy, rr - Math.max(1, s), dim ? '#3a3a48' : '#2a2c3a');
        const c = dim ? '#6a6a78' : col;
        if (st === 'xbox') { px.disc(g, cx, cy, rr - Math.max(1, s), dim ? '#3a3a48' : col); E.font.text(g, k, cx, cy - S(3.5), '#ffffff', { align: 'center', scale: s, outline: false }); }
        else if (k === 'cross') { px.line(g, cx - S(2.5), cy - S(2.5), cx + S(2.5), cy + S(2.5), c, Math.max(1, s)); px.line(g, cx + S(2.5), cy - S(2.5), cx - S(2.5), cy + S(2.5), c, Math.max(1, s)); }
        else if (k === 'circle') { px.disc(g, cx, cy, S(3), c); px.disc(g, cx, cy, S(3) - Math.max(1, s), '#2a2c3a'); }
        else if (k === 'square') { px.rect(g, cx - S(2.5), cy - S(2.5), S(5), S(5), c); px.rect(g, cx - S(2.5) + Math.max(1, s), cy - S(2.5) + Math.max(1, s), S(5) - 2 * Math.max(1, s), S(5) - 2 * Math.max(1, s), '#2a2c3a'); }
        else { const p = [[cx, cy - S(3)], [cx + S(3), cy + S(2.5)], [cx - S(3), cy + S(2.5)]]; px.poly(g, p, c); const q = [[cx, cy - S(1.2)], [cx + S(1.4), cy + S(1.5)], [cx - S(1.4), cy + S(1.5)]]; px.poly(g, q, '#2a2c3a'); }
        return 11 * s;
      }
      if (i >= 12 && i <= 15) { const cx = x + S(5.5), cy = y + S(5.5); px.rect(g, cx - S(1.5), y, S(3), S(11), '#3a3c48'); px.rect(g, x, cy - S(1.5), S(11), S(3), '#3a3c48'); const d = [[0, -1], [0, 1], [-1, 0], [1, 0]][i - 12]; px.rect(g, cx - S(1.5) + d[0] * S(4), cy - S(1.5) + d[1] * S(4), S(3), S(3), '#ffffff'); return 11 * s; }
      const t = PILLS[st][i] || '?', w = (E.font.width(t, { font: 'tiny' }) + 6) * s;
      E.ui.box(g, x, y + S(1), w, S(9), { bg: dim ? '#2a2a34' : '#22242e', border: dim ? '#4a4a58' : '#8a90a8' });
      E.font.text(g, t, x + S(3), y + S(3), dim ? '#8a8a98' : '#ffffff', { font: 'tiny', scale: s, outline: false });
      return w;
    }
    if (code.startsWith('Mouse')) {
      const b = +code.slice(5) || 0, w = S(9);
      px.rect(g, x + S(1), y, S(7), S(11), '#d8dce8'); px.rect(g, x + S(2), y + S(1), S(5), S(9), '#2a2c3a');
      const lit = '#ffc83a'; if (b === 0) px.rect(g, x + S(2), y + S(1), S(2), S(4), lit); else if (b === 2) px.rect(g, x + S(5), y + S(1), S(2), S(4), lit); else px.rect(g, x + S(4), y + S(1), S(1), S(4), lit);
      px.rect(g, x + S(4), y + S(1), S(1), S(4), b === 1 ? lit : '#8a8ea0');
      return w;
    }
    const raw = input && input.codeLabel ? input.codeLabel(code) : code, t = String(raw).toUpperCase(), small = t.length > 2, w = this.width(input, code, s);
    px.rect(g, x, y + S(1), w, S(10), dim ? '#4a4a58' : '#a8acbc'); px.rect(g, x + Math.max(1, s), y + S(1), w - 2 * Math.max(1, s), S(8), dim ? '#3a3a48' : '#e8eaf2');
    E.font.text(g, t, x + w / 2, y + S(small ? 3 : 2), dim ? '#8a8a98' : '#1a1c28', { align: 'center', font: small ? 'tiny' : 'normal', scale: s, outline: false });
    return w;
  }
};
/** the device a prompt shows for a player */
EF.deviceOf = input => (input && input.lastDevice) || 'keyboard';
EF.promptCode = (input, a) => {
  const dev = EF.deviceOf(input);
  if (dev === 'mouse' && (a === 'pass' || a === 'shoot' || a === 'lob')) return { pass: 'Mouse0', shoot: 'Mouse2', lob: 'Mouse1' }[a];
  if (a === 'euphoria' && dev === 'gamepad') return null;   // the chord: drawn as two pills
  return EF.Glyphs.code(input, a, dev === 'gamepad' ? 'gamepad' : 'keyboard');
};
EF.promptWidth = (a, label, o = {}) => {
  const I = o.input || game.input, s = o.scale || 1, dev = EF.deviceOf(I);
  let w = 0;
  if (a === 'euphoria' && dev === 'gamepad') w = EF.Glyphs.width(I, 'Pad4', s) + EF.Glyphs.width(I, 'Pad5', s) + 2 * s + E.font.width('+', { scale: s }) + 2 * s;
  else w = EF.Glyphs.width(I, EF.promptCode(I, a), s);
  return w + (label ? 3 * s + E.font.width(label, { scale: o.textScale || s }) : 0);
};
/** draw a prompt: the action's glyph on this player's device, then the label; returns its width */
EF.prompt = (g, x, y, a, label, o = {}) => {
  const I = o.input || game.input, s = o.scale || 1, dev = EF.deviceOf(I), ts = o.textScale || s;
  let w = 0;
  if (Array.isArray(a)) { for (const one of a) { w += EF.Glyphs.draw(g, I, EF.promptCode(I, one), x + w, y, s) + 2 * s; } w -= 2 * s; }
  else if (a === 'euphoria' && dev === 'gamepad') { w += EF.Glyphs.draw(g, I, 'Pad4', x, y, s); E.font.text(g, '+', x + w + s, y + 2 * s, '#ffffff', { scale: s, outline: '#000' }); w += E.font.width('+', { scale: s }) + 2 * s; w += EF.Glyphs.draw(g, I, 'Pad5', x + w, y, s); }
  else if (/^Pad\d+$|^Mouse\d$|^Key|^Digit|^Enter$|^Escape$|^Space$/.test(a)) w += EF.Glyphs.draw(g, I, a, x, y, s, o.dim);
  else w += EF.Glyphs.draw(g, I, EF.promptCode(I, a), x, y, s, o.dim);
  if (label) { E.font.text(g, label, x + w + 3 * s, y + Math.round((11 * s - 7 * ts) / 2), o.color || '#ffffff', { scale: ts, outline: o.outline === undefined ? '#0b0814' : o.outline, shadow: o.shadow }); w += 3 * s + E.font.width(label, { scale: ts }); }
  return w;
};
/** a row of prompts, centred at x: [[action, label], ...] */
EF.prompts = (g, x, y, list, o = {}) => {
  const gap = 10 * (o.scale || 1), ws = list.map(([a, l]) => EF.promptWidth(a, l, o)), total = ws.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : Math.round(x - total / 2);
  list.forEach(([a, l], i) => { EF.prompt(g, cx, y, a, l, o); cx += ws[i] + gap; });
  return total;
};
/* ==== src/03-audio.js ==== */
/* AUDIO (section 6.22), all in code, no files: the engine's chip synth for effects and songs; a WebAudio crowd engine
 * (a bed of filtered noise that follows the mood, OOOHs, roars, boos, whistles, claps and sung chants) and babble
 * voices (Animalese-style syllables through vowel formants) on the engine's own context through named buses.
 * Headless every call is a no-op. */
const SFX = {
  touch: { wave: 'noise', freq: 1400, to: 500, dur: .03, vol: .12, filter: 'bandpass' },
  pass: { wave: 'noise', freq: 1100, to: 300, dur: .06, vol: .26, filter: 'lowpass' },
  kick: { wave: 'noise', freq: 900, to: 160, dur: .08, vol: .34, filter: 'lowpass' },
  shot: { wave: 'noise', freq: 700, to: 120, dur: .12, vol: .42, filter: 'lowpass' },
  thump: { wave: 'sine', freq: 130, to: 60, dur: .1, vol: .38 },
  screamer: { wave: 'noise', freq: 300, to: 3200, dur: .32, vol: .28, filter: 'bandpass' },
  superCharge: { wave: 'square', freq: 'C4', arp: [0, 4, 7, 12, 16, 19, 24], step: .07, dur: .55, vol: .14 },
  superRelease: { wave: 'noise', freq: 200, to: 60, dur: .5, vol: .5, filter: 'lowpass' },
  sizzle: { wave: 'noise', freq: 4000, to: 7000, dur: .5, vol: .14, filter: 'highpass' },
  grass: { wave: 'sine', freq: 110, to: 70, dur: .06, vol: .2 },
  splash: { wave: 'noise', freq: 2400, to: 600, dur: .25, vol: .28, filter: 'bandpass' },
  crunch: { wave: 'noise', freq: 3000, to: 1200, dur: .08, vol: .2, filter: 'highpass' },
  doink: { wave: 'triangle', freq: 1400, to: 1100, dur: .45, vol: .34, vib: [18, .01] },
  net: { wave: 'noise', freq: 3000, to: 1800, dur: .3, vol: .26, filter: 'highpass' },
  catch: { wave: 'noise', freq: 600, to: 300, dur: .06, vol: .4, filter: 'lowpass' },
  parry: { wave: 'square', freq: 220, to: 110, dur: .08, vol: .28 },
  whistle: { wave: 'square', freq: 2300, vib: [32, .05], dur: .26, vol: .14 },
  whistleLong: { wave: 'square', freq: 2300, vib: [32, .05], dur: .7, vol: .14, hold: true },
  card: { wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .3, filter: 'bandpass' },
  slide: { wave: 'noise', freq: 500, to: 180, dur: .32, vol: .24, filter: 'lowpass' },
  thud: { wave: 'sine', freq: 90, to: 40, dur: .18, vol: .45 },
  swish: { wave: 'noise', freq: 2000, to: 5000, dur: .14, vol: .14, filter: 'bandpass' },
  nutmeg: { wave: 'triangle', freq: 'E6', to: 'B6', dur: .18, vol: .2 },
  chime: { wave: 'triangle', freq: 'G5', arp: [0, 7], step: .06, dur: .2, vol: .2 },
  stab: { wave: 'saw', freq: 'C4', arp: [0, 4, 7, 12], step: 0, dur: .4, vol: .2 },
  tick: { wave: 'square', freq: 1800, dur: .025, vol: .12 },
  perfect: { wave: 'triangle', freq: 'C6', arp: [0, 7, 12], step: .05, dur: .3, vol: .26 },
  buzz: { wave: 'saw', freq: 110, to: 80, dur: .35, vol: .26 },
  beep: { wave: 'sine', freq: 1200, dur: .08, vol: .16 },
  ding: { wave: 'triangle', freq: 'E5', to: 'C5', dur: .7, vol: .22 },
  squawk: { wave: 'saw', freq: 1200, to: 700, dur: .18, vol: .16, vib: [30, .1] },
  boing: { wave: 'sine', freq: 180, to: 600, dur: .25, vol: .3 },
  powerDown: { wave: 'saw', freq: 300, to: 40, dur: .9, vol: .2 },
  horn: { wave: 'square', freq: 'A3', dur: .6, vol: .2, hold: true },
  shimmer: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12, 16], step: .04, dur: .3, vol: .14 },
  heartbeat: { wave: 'sine', freq: 60, to: 40, dur: .12, vol: .5 },
  coin: { wave: 'square', freq: 'B5', arp: [0, 5], step: .05, dur: .15, vol: .12 },
  typewriter: { wave: 'noise', freq: 3500, to: 2000, dur: .02, vol: .14, filter: 'bandpass' },
  paper: { wave: 'noise', freq: 1200, to: 3000, dur: .3, vol: .14, filter: 'bandpass' },
  firework: { wave: 'noise', freq: 400, to: 80, dur: .6, vol: .3, filter: 'lowpass' }
};
for (const k in SFX) A_.define(k, SFX[k]);
EF.sfx = (name, o) => { if (EF.muteAll) return; try { A_.sfx(name, o); } catch (e) { /* sound off */ } };

/* ---- songs (the engine's format; original melodies, Appendix D) ---- */
const SONG = {
  anthem: { bpm: 108, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: 'G4 - C5 - E5 - G5 - | F5 - E5 D5 E5 - C5 - | A4 - D5 - F5 - A5 - | G5 - - - - - . . | E5 - G5 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .' },
    { name: 'counter', wave: 'square', vol: .06, notes: 'E4 - E4 - G4 - C5 - | C5 - C5 B4 C5 - A4 - | F4 - F4 - A4 - D5 - | D5 - - - B4 - . . | C5 - E5 - G5 - G5 F5 | E5 - C5 - D5 - B4 - | A4 - C5 B4 A4 - G4 - | E4 - - - - - . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . E3 . C3 . | F2 . A2 . G2 . B2 . | A2 . F2 . G2 . G2 . | C3 . G2 . C3 . . .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h h' }] },
  menu: { bpm: 128, steps: 4, tracks: [
    { wave: 'pulse', vol: .08, notes: 'C5 . E5 . G5 . E5 . | F5 . A5 . C6 . A5 . | D5 . F5 . A5 . F5 . | G5 . B5 . D6 . B5 .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . C3 . C3 . G2 . | F2 . F2 . F2 . C3 . | D3 . D3 . D3 . A2 . | G2 . G2 . G2 . D3 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k k h . s . h h' }] },
  travel: { bpm: 116, steps: 2, tracks: [
    { wave: 'sine', vol: .16, notes: 'E5 - G5 E5 D5 - C5 - | D5 - E5 - G4 - - - | E5 - G5 E5 A5 - G5 - | E5 D5 C5 D5 C5 - - - ' },
    { wave: 'triangle', vol: .26, notes: 'C3 G2 C3 G2 | G2 D3 G2 D3 | C3 G2 A2 E2 | F2 G2 C3 .' },
    { wave: 'drums', vol: .08, notes: 'k h s h k h s h' }] },
  tabloid: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'A4 . . A4 C5 . . . | A4 . . A4 E5 . D5 . | A4 . . A4 C5 . . . | G4 . A4 . . . . .' },
    { wave: 'triangle', vol: .26, notes: 'A2 . A2 . A2 . A2 . | F2 . F2 . F2 . F2 . | A2 . A2 . A2 . A2 . | E2 . E2 . E2 . E2 .' },
    { wave: 'drums', vol: .08, notes: 't t t . t t t . t t t . t . t t' }] },
  dressing: { bpm: 84, steps: 2, tracks: [
    { wave: 'triangle', vol: .14, notes: 'E4 - - G4 A4 - - - | G4 - - E4 D4 - - - | C4 - - E4 G4 - - A4 | G4 - - - - - - -' },
    { wave: 'sine', vol: .2, notes: 'A2 - - - E3 - - - | F2 - - - C3 - - - | C3 - - - G2 - - - | G2 - - - D3 - - -' }] },
  matchbed: { bpm: 140, steps: 4, tracks: [
    { name: 'eudrums', wave: 'drums', vol: .14, on: false, notes: 'k . h k s . h . | k k h . s . h k' },
    { name: 'eubass', wave: 'saw', vol: .1, on: false, notes: 'C2 C2 G2 C2 C2 G2 C3 G2 | C2 C2 G2 C2 Bb1 Bb1 F2 Bb1' },
    { name: 'eubrass', wave: 'saw', vol: .08, on: false, notes: '. . C5 . . . E5 . | . . G5 . . . E5 .' },
    { name: 'tension', wave: 'triangle', vol: .12, on: false, notes: 'A3 - - - - - - - - - - - - - - - | C4 - - - - - - - - - - - - - - -' },
    { name: 'heart', wave: 'drums', vol: .18, on: false, notes: 'k k . . . . . . k k . . . . . .' }] },
  halftime: { bpm: 132, steps: 2, tracks: [
    { wave: 'pulse', vol: .1, notes: 'C5 E5 G5 Bb5 A5 - F5 - | G5 E5 C5 D5 C5 - - -' },
    { wave: 'triangle', vol: .26, notes: 'C3 G2 C3 G2 | F2 C3 G2 C3' },
    { wave: 'drums', vol: .07, notes: 'k h s h' }] },
  goal: { bpm: 150, steps: 2, loop: false, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - G5 C6 - | - - - - - - - -' },
    { wave: 'saw', vol: .1, notes: 'E4 G4 C5 E5 - C5 E5 - | - - - - - - - -' },
    { wave: 'drums', vol: .12, notes: 'k k s k s s s s' }] },
  tension: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'A3 - - - - - - - - - - - - - - -' }, { wave: 'triangle', vol: .1, notes: 'C4 - - - - - - - - - - - - - - -' }, { wave: 'triangle', vol: .08, notes: 'E4 - - - - - - - D4 - - - - - - -' },
    { wave: 'drums', vol: .2, notes: 'k k . . k k . . k k . . k k . .' }] },
  victory: { bpm: 128, steps: 2, loop: false, tracks: [
    { wave: 'pulse', vol: .14, notes: 'G4 C5 E5 G5 - E5 G5 - | C6 - - - - - . .' },
    { wave: 'triangle', vol: .26, notes: 'C3 - G2 - C3 - E3 - | C3 - - - - - . .' },
    { wave: 'drums', vol: .1, notes: 'k . s . k k s . | k . . . . . . .' }] },
  defeat: { bpm: 70, steps: 2, loop: false, tracks: [
    { wave: 'saw', vol: .12, notes: 'G4 - F#4 - F4 - E4 - - - - - - - . .' },
    { wave: 'triangle', vol: .2, notes: 'C3 - B2 - Bb2 - A2 - - - - - - - . .' }] },
  villain: { bpm: 96, steps: 3, tracks: [
    { wave: 'saw', vol: .09, notes: 'A4 - C5 E5 - D5 C5 - B4 | A4 - - E4 - - A4 - - | F4 - A4 C5 - B4 A4 - G#4 | A4 - - - - - . . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . . E3 . . E3 . . | A2 . . E3 . . E3 . . | F2 . . C3 . . C3 . . | E2 . . B2 . . E3 . .' }] },
  ceremony: { bpm: 132, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .13, notes: 'G4 - C5 - E5 - G5 - | F5 - E5 D5 E5 - C5 - | A4 - D5 - F5 - A5 - | G5 - - - - - . . | E5 - G5 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .' },
    { wave: 'saw', vol: .06, notes: 'C4 - E4 - G4 - C5 - | A3 - C4 - F4 - A4 - | D4 - F4 - A4 - D5 - | G3 - B3 - D4 - G4 - | C4 - E4 - G4 - C5 - | F3 - A3 - G3 - B3 - | A3 - F3 - G3 - G3 - | C4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 C3 G2 G2 C3 C3 G2 G2 | F2 F2 C3 C3 F2 F2 C3 C3 | D3 D3 A2 A2 D3 D3 A2 A2 | G2 G2 D3 D3 G2 G2 B2 B2' },
    { wave: 'drums', vol: .12, notes: 'k h s h k k s h | k h s k k h s s' }] },
  credits: { bpm: 96, steps: 2, tracks: [
    { wave: 'triangle', vol: .16, notes: 'G5 - C6 - E6 - G6 - | F6 - E6 D6 E6 - C6 - | A5 - D6 - F6 - A6 - | G6 - - - - - . . | E6 - G6 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .' },
    { wave: 'sine', vol: .14, notes: 'C4 . G3 . C4 . G3 . | F3 . C4 . F3 . C4 . | D4 . A3 . D4 . A3 . | G3 . D4 . G3 . B3 .' }] },
  training: { bpm: 100, steps: 2, tracks: [
    { wave: 'pulse', vol: .08, notes: 'E5 . G5 . A5 - G5 . | E5 . D5 . C5 - . . | D5 . E5 . G5 - E5 . | D5 . C5 . A4 - . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h h' }] },
  attract: { bpm: 150, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'G4 . C5 . E5 . G5 . F5 . E5 D5 E5 . C5 . | A4 . D5 . F5 . A5 . G5 - - - - . . . | E5 . G5 . C6 . B5 A5 G5 . E5 . F5 . D5 . | C5 . E5 D5 C5 . B4 . C5 - - - - . . .' },
    { wave: 'saw', vol: .07, notes: 'C3 C3 C4 C3 G2 G2 G3 G2 | F2 F2 F3 F2 C3 C3 C4 C3 | D3 D3 D4 D3 A2 A2 A3 A2 | G2 G2 G3 G2 G2 G2 B2 G2' },
    { wave: 'drums', vol: .13, notes: 'k . h k s . h . k k h . s . h k' }] }
};
EF.SONGS = SONG;
EF.music = (id, o) => { if (EF.muteAll) return; try { A_.music(id ? SONG[id] || id : null, o); EF.musicNow = id; } catch (e) { /* off */ } };
EF.layer = (name, vol, fade) => { try { A_.layer(name, vol, fade); } catch (e) { /* off */ } };
EF.sting = id => { try { A_.sting(SONG[id], { at: 'bar' }); } catch (e) { /* off */ } };

/* ---- WebAudio helpers on the engine's context (null headless) ---- */
const WA = {
  ctx() { return A_.ready || A_.ctx ? A_.ctx : null; },
  bus(name) { return A_.bus ? A_.bus(name) : null; },
  noise(c, dur) { const s = c.createBufferSource(); s.buffer = A_.noiseBuffer(); s.loop = true; return s; },
  bp(c, f, q) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; },
  env(c, t, a, h, r, v) { const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + a + h); g.gain.linearRampToValueAtTime(0, t + a + h + r); return g; }
};
const VOWEL = { a: [800, 1200], e: [500, 1800], i: [300, 2300], o: [500, 900], u: [350, 700] };

/* ---- the crowd engine (section 6.22.3) ---- */
EF.crowdAudio = {
  on: false, ex: 0, want: 0, size: .6,
  start(size) {
    this.stop(); this.size = clamp(size / 1600, .15, 1); this.want = .2; this.ex = .2;
    const c = WA.ctx(), bus = WA.bus('crowd'); if (!c || !bus) return;
    try {
      this.nodes = [[300, .7, .6], [900, 1, .45], [2500, 1.2, .2]].map(([f, q, v]) => { const s = WA.noise(c), b = WA.bp(c, f, q), g = c.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(bus); s.start(); return { s, g, v }; });
      this.on = true;
    } catch (e) { if (EF.audioDebug) throw e; this.on = false; }
  },
  stop() { if (this.nodes) for (const n of this.nodes) { try { n.s.stop(); n.s.disconnect(); n.g.disconnect(); } catch (e) { if (EF.audioDebug) throw e; /* gone */ } } this.nodes = null; this.on = false; },
  /** excitement 0..1 (the crowd's mood); smoothed up fast and down slowly */
  set(ex, dt) { this.want = clamp(ex, 0, 1); this.ex = approach(this.ex, this.want, dt * (this.want > this.ex ? 3.3 : .7)); const c = WA.ctx(); if (!this.on || !c) return; const lvl = this.size * (.25 + .75 * this.ex) * .5, t = A_.now(); for (const n of this.nodes) n.g.gain.setTargetAtTime(lvl * n.v * (EF.mutedCrowd ? 0 : 1), t, .1); },
  react(kind) {
    const c = WA.ctx(), bus = WA.bus('crowd'); if (!c || !bus || EF.mutedCrowd) return;
    const t = A_.now() + .01, S = this.size;
    try {
      if (kind === 'ooh') { const s = WA.noise(c), g = WA.env(c, t, .12, .35, .45, .22 * S); for (const [f0, f1] of [[400, 600], [800, 1000]]) { const b = WA.bp(c, f0, 8); b.frequency.setValueAtTime(f0, t); b.frequency.linearRampToValueAtTime(f1, t + .8); s.connect(b); b.connect(g); } g.connect(bus); s.start(t); s.stop(t + 1.1); }
      else if (kind === 'roar') { const s = WA.noise(c), b = WA.bp(c, 1400, .6), g = WA.env(c, t, .15, 1.8, 1.2, .3 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t); s.stop(t + 3.3); this.ex = 1; }
      else if (kind === 'boo') { const s = WA.noise(c), g = WA.env(c, t, .2, .8, .6, .45 * S); const b = WA.bp(c, 330, 6); b.frequency.setValueAtTime(360, t); b.frequency.linearRampToValueAtTime(240, t + 1.5); s.connect(b); b.connect(g); for (let i = 0; i < 4; i++) { const o = c.createOscillator(), og = WA.env(c, t, .2, .7, .5, .03 * S); o.type = 'sawtooth'; o.frequency.setValueAtTime(120 + i * 13, t); o.frequency.linearRampToValueAtTime(90 + i * 9, t + 1.4); const ob = WA.bp(c, 400, 3); o.connect(ob); ob.connect(og); og.connect(bus); o.start(t); o.stop(t + 1.6); } g.connect(bus); s.start(t); s.stop(t + 1.7); }
      else if (kind === 'whistles') { for (let i = 0; i < 5; i++) { const o = c.createOscillator(), t0 = t + EF.fx(0, .5), g = WA.env(c, t0, .02, .12, .08, .06 * S); o.type = 'sine'; o.frequency.setValueAtTime(EF.fx(2200, 3200), t0); o.frequency.linearRampToValueAtTime(EF.fx(2600, 3600), t0 + .2); o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + .3); } }
      else if (kind === 'clap') { for (let i = 0; i < 12; i++) { const s = WA.noise(c), t0 = t + EF.fx(0, .06), b = WA.bp(c, 1500, 1.4), g = WA.env(c, t0, .002, .01, .05, .14 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + .1); } }
      else if (kind === 'gasp') { const s = WA.noise(c), b = WA.bp(c, 2200, 2), g = WA.env(c, t, .05, .1, .4, .3 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t); s.stop(t + .6); }
    } catch (e) { if (EF.audioDebug) throw e; /* the context went away */ }
  },
  /** a sung chant (registry 'chant'): syllables on notes with vowels, a choir of 8 detuned voices, claps */
  chant(id) {
    const ch = EF.get('chant', id), c = WA.ctx(), bus = WA.bus('crowd'); if (!ch || !c || !bus || EF.mutedCrowd) return;
    const beat = 60 / (ch.bpm || 120); let t = A_.now() + .05; const S = this.size;
    try {
      for (let rep = 0; rep < (ch.reps || 2); rep++) for (const [note, vowel, beats, clap] of ch.notes) {
        if (note === '.') { if (clap) this.clapAt(t, S); t += beats * beat; continue; }
        const f = 440 * Math.pow(2, (E.noteNum ? E.noteNum(note) - 69 : noteToMidi(note) - 69) / 12) * (ch.detune ? Math.pow(2, ch.detune / 1200) : 1), [F1, F2] = VOWEL[vowel] || VOWEL.a, dur = beats * beat * .9;
        const g = WA.env(c, t, .04, Math.max(.02, dur - .12), .08, .05 * S);
        for (let v = 0; v < 8; v++) { const o = c.createOscillator(); o.type = v % 2 ? 'square' : 'sawtooth'; o.frequency.value = f * Math.pow(2, (v - 3.5) * 3.4 / 1200) * (v > 5 ? .5 : 1); const b1 = WA.bp(c, F1, 6), b2 = WA.bp(c, F2, 8); o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); o.start(t); o.stop(t + dur + .1); }
        g.connect(bus); if (clap) this.clapAt(t, S); t += beats * beat;
      }
    } catch (e) { if (EF.audioDebug) throw e; /* gone */ }
  },
  clapAt(t, S) { const c = WA.ctx(), bus = WA.bus('crowd'); if (!c || !bus) return; for (let i = 0; i < 10; i++) { const s = WA.noise(c), t0 = t + EF.fx(0, .05), b = WA.bp(c, 1600, 1.4), g = WA.env(c, t0, .002, .01, .05, .12 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + .1); } }
};
const NOTE_I = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteToMidi = n => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return 69; return 12 * (+m[3] + 1) + NOTE_I[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };

/* ---- babble voices (section 6.22.4): a syllable per letter, through the vowel's formants; consonants are noise ---- */
const LETTER_PITCH = {}; 'abcdefghijklmnopqrstuvwxyz'.split('').forEach((ch, i) => { LETTER_PITCH[ch] = 1 + (((i * 7) % 13) - 6) * .025; });
const NEXT_VOWEL = (line, i) => { for (let k = i; k < Math.min(line.length, i + 4); k++) { const c = line[k].toLowerCase(); if ('aeiou'.includes(c)) return c; } return 'a'; };
EF.babble = {
  busy: 0,
  /** a voice function for E.Dialog (engine change 1): called for each newly shown letter */
  voiceFor(id) { const prof = EF.Cast.voice(id); return (ch, i, line) => this.syllable(prof, ch, i, line); },
  syllable(prof, ch, i, line) {
    const c = WA.ctx(), bus = WA.bus('voices'); if (!c || !bus || EF.mutedVoices) return;
    if (ch === ' ' || ch === ',' || ch === '.' || ch === '!' || ch === '?' || ch === '-' || ch === "'") return;
    if (i % 2 === 1 && !'aeiouAEIOU'.includes(ch)) return;   // every other consonant: a quicker chatter
    try {
      const t = A_.now() + .005, lc = ch.toLowerCase(), cap = ch !== lc, end = line.slice(i).search(/[.!?]/), q = end >= 0 ? line[i + end] : '.';
      const contour = q === '?' ? 1 + .12 * (1 - Math.min(1, end / 8)) : q === '!' ? 1.08 : 1 - .06 * (1 - Math.min(1, Math.max(0, end) / 8));
      const f = (prof.f0 || 140) * (LETTER_PITCH[lc] || 1) * contour * (cap ? 1.06 : 1) * EF.fx(.97, 1.03), dur = .055 / (prof.rate || 1);
      const vowel = 'aeiou'.includes(lc) ? lc : NEXT_VOWEL(line, i), [F1, F2] = VOWEL[vowel], fs = prof.formant || 1;
      const g = WA.env(c, t, .005, dur * .6, .03, (cap || q === '!' ? .2 : .14));
      const o = c.createOscillator(); o.type = prof.wave === 'pulse' ? 'square' : 'sawtooth'; o.frequency.value = f;
      if (prof.vibrato) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = f * prof.vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
      const b1 = WA.bp(c, F1 * fs, 5), b2 = WA.bp(c, F2 * fs, 7); o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g);
      let out = g;
      if (prof.echo) { const d = c.createDelay(); d.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .35; g.connect(d); d.connect(fb); fb.connect(d); const mix = c.createGain(); g.connect(mix); d.connect(mix); out = mix; }
      out.connect(bus); o.start(t); o.stop(t + dur + .05);
      if (prof.breath) { const s = WA.noise(c), hb = c.createBiquadFilter(); hb.type = 'highpass'; hb.frequency.value = 2500; const ng = WA.env(c, t, .005, dur * .5, .03, .05 * prof.breath); s.connect(hb); hb.connect(ng); ng.connect(bus); s.start(t); s.stop(t + dur + .05); }
      if ('szfx'.includes(lc) || lc === 'c' && line[i + 1] === 'h') { const s = WA.noise(c), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4200; const ng = WA.env(c, t, .002, .01, .01, .07); s.connect(hp); hp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + .03); }
      else if ('tkpbdg'.includes(lc)) { const s = WA.noise(c), bp = WA.bp(c, 2000, 2), ng = WA.env(c, t, .001, .004, .004, .1); s.connect(bp); bp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + .015); }
    } catch (e) { if (EF.audioDebug) throw e; /* gone */ }
  },
  /** a short shout (celebrations): babble a word at once */
  shout(id, word) { const prof = EF.Cast.voice(id), line = word; for (let i = 0; i < line.length; i++) game.after(i * .05, () => this.syllable(Object.assign({}, prof, { f0: (prof.f0 || 140) * 1.15 }), line[i], i, line)); }
};
/** stop every sound of ours: music, the crowd engine (the hub's end, leaving a match) */
EF.silence = () => { EF.music(null); EF.crowdAudio.stop(); };
/* ==== src/04-art.js ==== */
/* ART (section 8.2): kits as rig colours, crests painted by code, the balls, cards, the whistle, the kipper and other
 * props as string sprites. Everything is drawn with the engine's pixel primitives. */
const hexDist = (a, b) => { const A = E.hex(a), B = E.hex(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
EF.Art = {
  /** the kits two teams wear: the away side changes when its shirt is too close to the home side's */
  pickKits(home, away) { return ['home', hexDist(home.kits.home.shirt, away.kits.home.shirt) < 120 || hexDist(home.kits.home.color2 || '#000', away.kits.home.shirt) < 60 ? 'away' : 'home']; },
  /** a player's rig colours and kit option from his team's kit */
  kitFor(team, kitName, p) {
    const k = p.pos === 'GK' ? team.kits.keeper : team.kits[kitName] || team.kits.home;
    const colors = { cloth: k.shirt, pants: k.shorts, belt: k.shorts, trim: k.socks, boot: p.boots || '#1a1a20', glove: k.glove || p.skin, skin: p.skin, hair: p.hairColor || '#3a2a1a' };
    return { colors, kit: { pattern: k.pattern || 'plain', color2: k.color2, number: p.num, numberColor: k.number || '#ffffff' } };
  },
  rigFor(team, kitName, p, o = {}) {
    const { colors, kit } = this.kitFor(team, kitName, p);
    const hat = p.band ? { style: 'band', color: team.kits.home.color2 || '#ffffff' } : p.hat || null;
    const r = new E.Humanoid(Object.assign({ weapon: null, build: p.build || 'heroic', size: (p.size || 1.1) * (o.scale || 1.12), hair: p.hair || 'short', hat, sleeves: p.pos === 'GK' ? 'long' : 'short', colors, kit, speedRef: 88 }, o.rig || {}));
    if (EF.Anim && EF.Anim.lib) Mocap.drive(r, EF.Anim.lib);
    return r;
  }
};
/* ---- crests: a shape, a field, a ring and up to two charges (section 8.2) ---- */
EF.drawCrest = (g, team, x, y, size) => {
  const c = team.crest || {}, s = size / 24, X = v => Math.round(x + v * s), Y = v => Math.round(y + v * s);
  const field = c.field || '#333', ring = c.ring || '#fff', ft = E.tones(field), rt = E.tones(ring);
  const shape = c.shape || 'shield';
  const shield = [[-11, -12], [11, -12], [11, 2], [0, 12], [-11, 2]];
  if (shape === 'shield') { px.poly(g, shield.map(([a, b]) => [X(a), Y(b)]), rt.sh); px.poly(g, shield.map(([a, b]) => [X(a * .82), Y(b * .82 - 1)]), ft.base); px.poly(g, [[X(-9), Y(-11)], [X(0), Y(-11)], [X(0), Y(9)], [X(-9), Y(1)]], ft.lt); }
  else { px.disc(g, X(0), Y(0), Math.max(2, 12 * s), rt.sh); px.disc(g, X(0), Y(0), Math.max(1.5, 10 * s), ft.base); if (shape === 'roundel') px.disc(g, X(0), Y(0), Math.max(1, 7.5 * s), ft.lt); }
  const ch = c.charges || [], one = ch.length === 1;
  ch.forEach((name, i) => { const ox = one ? 0 : i === 0 ? -3.2 : 3.2; EF.drawCharge(g, name, X(ox), Y(0), s * (one ? 1 : .8), ring, field); });
  if (size >= 40) px.line(g, X(-8), Y(-10), X(8), Y(-10), rt.hi);
};
EF.drawCharge = (g, name, x, y, s, col, bg) => {
  const t = E.tones(col), P2 = (a, b) => [Math.round(x + a * s), Math.round(y + b * s)], poly = (pts, c) => px.poly(g, pts.map(p => P2(p[0], p[1])), c), L = (a, b, c2, d, c) => { const p = P2(a, b), q = P2(c2, d); px.line(g, p[0], p[1], q[0], q[1], c, Math.max(1, Math.round(s))); };
  const disc = (a, b, r, c) => { const p = P2(a, b); px.disc(g, p[0], p[1], Math.max(.8, r * s), c); };
  switch (name) {
    case 'kipper': poly([[-7, 0], [-3, -3], [3, -3], [6, 0], [3, 3], [-3, 3]], t.base); poly([[6, 0], [9, -3], [9, 3]], t.sh); disc(-4, -1, .9, bg); L(-1, -2, -1, 2, t.sh); L(2, -2, 2, 2, t.sh); break;
    case 'anchor': L(0, -7, 0, 6, t.base); L(-4, -4, 4, -4, t.base); L(-6, 3, 0, 7, t.base); L(6, 3, 0, 7, t.base); disc(0, -8, 1.4, t.base); break;
    case 'boot': poly([[-5, -6], [0, -6], [0, 1], [7, 2], [7, 6], [-5, 6]], t.base); L(-5, 5, 7, 5, t.sh); disc(-3, 6, .9, t.hi); disc(3, 6, .9, t.hi); break;
    case 'sun': disc(0, -1, 4, t.base); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; L(Math.cos(a) * 5, -1 + Math.sin(a) * 5, Math.cos(a) * 7.5, -1 + Math.sin(a) * 7.5, t.lt); } break;
    case 'arrows': L(-6, 4, 6, 4, t.base); poly([[6, 2], [9, 4], [6, 6]], t.base); L(6, 8, -6, 8, t.lt); poly([[-6, 6], [-9, 8], [-6, 10]], t.lt); break;
    case 'cog': disc(0, 0, 5, t.base); disc(0, 0, 2, bg); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; disc(Math.cos(a) * 6, Math.sin(a) * 6, 1.4, t.base); } break;
    case 'hammer': L(-5, 6, 4, -3, t.lt); poly([[1, -7], [7, -1], [9, -3], [3, -9]], t.base); break;
    case 'padlock': poly([[-5, -1], [5, -1], [5, 7], [-5, 7]], t.base); L(-3, -1, -3, -5, t.lt); L(3, -1, 3, -5, t.lt); L(-3, -6, 3, -6, t.lt); disc(0, 3, 1.2, bg); break;
    case 'laurel': for (let k = 0; k < 5; k++) { disc(-7 + k * .6, 6 - k * 3, 1.2, t.lt); disc(7 - k * .6, 6 - k * 3, 1.2, t.lt); } break;
    case 'crown': poly([[-7, 4], [-7, -3], [-3.5, 1], [0, -5], [3.5, 1], [7, -3], [7, 4]], t.base); L(-7, 4, 7, 4, t.sh); disc(0, -5, 1, t.hi); break;
    case 'coins': for (let k = 0; k < 3; k++) { poly([[-5, 5 - k * 3], [5, 5 - k * 3], [5, 7 - k * 3], [-5, 7 - k * 3]], k % 2 ? t.lt : t.base); } break;
    default: disc(0, 0, 4, t.base);
  }
};
/* ---- the balls: 4 frames of their panels turning (section 8.2) ---- */
const ballFrames = (c) => [
  ['.ABA.', 'AAKAA', 'BKKKB', 'AAKAA', '.ABA.'], ['.AAB.', 'AKAAB', 'AKKAA', 'BAAKA', '.BAA.'],
  ['.AAA.', 'BAKAB', 'AKKKA', 'BAKAB', '.AAA.'], ['.BAA.', 'AAKBA', 'AKKAA', 'BAKAA', '.AAB.']
].map(rows => E.sprite(rows, c));
EF.BALLS = {
  classic: { name: 'CLASSIC', frames: ballFrames({ A: '#f6f6f0', B: '#d8dce4', K: '#26262e' }) },
  orange: { name: 'WINTER ORANGE', frames: ballFrames({ A: '#ff8a2a', B: '#e86a1a', K: '#5a2a10' }) },
  golden: { name: 'THE GOLDEN BALL', frames: ballFrames({ A: '#ffe070', B: '#e8b030', K: '#a86a10' }), glow: true },
  leather: { name: 'OLD LEATHER', frames: ballFrames({ A: '#a86a3a', B: '#8a5226', K: '#f0d8a8' }) }
};
EF.SPR = {
  cardY: E.sprite(['yyy', 'yYy', 'yyy', 'yyy'], { y: '#ffd83a', Y: '#fff0a0' }),
  cardR: E.sprite(['rrr', 'rRr', 'rrr', 'rrr'], { r: '#e8202a', R: '#ff7a7a' }),
  whistle: E.sprite(['.kk', 'kkk'], { k: '#c8ccd4' }),
  kipper: E.sprite(['..oooo.o', '.oOOOOoo', 'ookOOOoo', '.oOOOOoo', '..oooo.o'], { o: '#c87a2a', O: '#e8a050', k: '#1a1010' }),
  kipperBall: E.sprite(['.oooo.o', 'okOOOoo', 'oOOOOoo', '.oooo.o'], { o: '#d07a20', O: '#f0a040', k: '#1a1010' }),
  coin: [E.sprite(['.yyy.', 'yYYYy', 'yYyYy', 'yYYYy', '.yyy.'], { y: '#c89a30', Y: '#ffe070' }), E.sprite(['.y.', 'yYy', 'yYy', 'yYy', '.y.'], { y: '#c89a30', Y: '#ffe070' }), E.sprite(['y', 'Y', 'Y', 'Y', 'y'], { y: '#c89a30', Y: '#ffe070' })],
  pie: E.sprite(['.cccc.', 'cCCCCc', 'bbbbbb', '.bbbb.'], { c: '#d8a050', C: '#f0c878', b: '#a86a2a' }),
  flag: [E.sprite(['ffff', 'fFff', 'fff.', 'ff..'], { f: '#f08a24', F: '#ffb860' }), E.sprite(['.fff', 'ffFf', 'ffff', 'f...'], { f: '#f08a24', F: '#ffb860' }), E.sprite(['fff.', 'fFff', 'ffff', '.ff.'], { f: '#f08a24', F: '#ffb860' })],
  gull: E.sprite(['w.....w', 'ww...ww', '.wwkww.', '..www..', '...o...'], { w: '#f4f4f0', k: '#1a1a1a', o: '#f0a020' }),
  confetti: ['#ffd83a', '#ff5a7a', '#5ad0ff', '#7aff7a', '#ffffff', '#c87aff']
};
/* ==== src/05-anim.js ==== */
/* ANIMATION (section 8.3): the football kick specs (the engine's attack specs: wind, strike, recover), the clip library
 * (mocap clips through Mocap.drive), and the rig state each footballer's look becomes. Procedural moves (dives,
 * headers, bicycle kicks, launches) are body tilts set by the simulation (engine change 3). */
EF.KICKS = (() => {
  const K = {
    touch: { spec: { rel: true, kick: true, a0: .2, a1: 0, z0: .08, z1: .12, reach: 4 }, wind: .03, active: .04, recover: .08 },
    pass: { spec: { rel: true, kick: true, a0: .6, a1: -.1, z0: .15, z1: .2, reach: 6, twist: .4 }, wind: .08, active: .08, recover: .16 },
    shot: { spec: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.1, reach: 7, lean: -.25, lunge: 2 }, wind: .1, active: .1, recover: .26 },
    shotHard: { spec: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.4, reach: 7.5, lean: -.35, lunge: 2.5, hop: 1 }, wind: .12, active: .1, recover: .32, clip: '10_02' },
    chip: { spec: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: 1.4, reach: 5.5, lean: -.4 }, wind: .08, active: .08, recover: .2 },
    volley: { spec: { rel: true, kick: true, a0: .4, a1: -.2, z0: .9, z1: 1.2, reach: 7, hop: 2, lean: -.4, twist: .6 }, wind: .06, active: .08, recover: .24 },
    header: { spec: { rel: true, kick: false, hand: 'both', a0: 1.2, a1: 1.2, z0: -8, z1: -8, reach: 2, blade: 0, lean: .5 }, wind: .05, active: .08, recover: .2 },
    bicycle: { spec: { rel: true, kick: true, a0: .1, a1: 0, z0: 2.2, z1: 1.5, reach: 6 }, wind: .08, active: .1, recover: .25 },
    poke: { spec: { rel: true, kick: true, a0: .3, a1: 0, z0: .1, z1: .1, reach: 7.5, lunge: 3 }, wind: .05, active: .08, recover: .15 },
    stepover: { spec: { rel: true, kick: true, a0: .9, a1: -.3, z0: .2, z1: .25, reach: 5 }, wind: .05, active: .12, recover: .16 },
    rainbow: { spec: { rel: true, kick: true, a0: 3, a1: 2.6, z0: .1, z1: 1.3, reach: 4 }, wind: .08, active: .12, recover: .2 },
    penalty: { spec: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.2, reach: 7.5, lean: -.3, lunge: 2.5 }, wind: .1, active: .1, recover: .3 },
    throwIn: { spec: { hand: 'both', a0: 0, a1: 0, z0: 18, z1: 10, reach: 4, blade: 0 }, wind: .15, active: .1, recover: .2 }
  };
  for (const k in K) K[k].total = K[k].wind + K[k].active + K[k].recover;
  return K;
})();
/** a kick's attack state at time t into it, for rig.update (or null once it has finished) */
EF.kickState = (name, t) => {
  const K = EF.KICKS[name]; if (!K || t < 0 || t > K.total) return null;
  if (t < K.wind) return { spec: K.spec, phase: 'wind', u: t / K.wind };
  if (t < K.wind + K.active) return { spec: K.spec, phase: 'active', u: (t - K.wind) / K.active };
  return { spec: K.spec, phase: 'recover', u: (t - K.wind - K.active) / K.recover };
};
/* ==== src/10-match.js ==== */
/* THE MATCH: pure simulation. It reads Intents, moves bodies, applies the rules and emits events on EF.bus. It never
 * reads input devices, plays sounds or draws: the bots, the attract mode, replays, tests and the network host all drive
 * it the same way. Its only randomness is this.rng (seeded). Other fragments add methods to Match.prototype:
 * the ball (12), footballers (13), keepers (14), team AI (15), rules and set pieces (16), the referee (17),
 * Euphoria and super strikes (18), matchday events (20). */
class Match {
  /** o: { home, away, stadium, seed, halfLength, humans: [{ input, side, ctl }], kind: 'kickabout' | 'cup' | 'penalties' |
   *  'training' | 'attract' | 'session', draws: 'allowed' | 'golden' | 'penalties' | 'cup', shootoutOnly, weather, time,
   *  ball, referee, buffs: [{}, {}], euphoria: [a, b], kits: ['home', 'away'], formation: [id, id], cheats, pure } */
  constructor(o = {}) {
    this.o = o;
    this.seed = o.seed !== undefined ? o.seed >>> 0 : (EF.seedNext = ((EF.seedNext || Date.now()) * 1103515245 + 12345) >>> 0);
    this.rng = E.rng(this.seed);
    this.kind = o.kind || 'kickabout';
    this.t = 0;                         // match time (seconds of sim)
    this.teams = [EF.get('team', o.home || 'kipperton'), EF.get('team', o.away || 'hoofington')];
    this.stadium = EF.get('stadium', o.stadium || this.teams[0].stadium);
    this.weather = o.weather || this.stadium.weather || null;
    this.timeOfDay = o.time || this.stadium.time || 'day';
    this.pitch = EF.Pitch.get(this.stadium, this.weather);
    this.surface = this.weather && this.weather.kind === 'snow' ? 'snow' : this.weather && this.weather.kind === 'rain' ? 'wet' : this.stadium.surface || 'grass';
    this.ballStyle = o.ball || (this.surface === 'snow' ? 'orange' : 'classic');
    this.halfLen = o.halfLength || EF.halfLength();
    this.draws = o.draws || 'allowed';
    this.pure = !!o.pure; this.cheats = Object.assign({}, o.cheats || {});
    this.buffs = [Object.assign({}, (o.buffs || [])[0] || {}), Object.assign({}, (o.buffs || [])[1] || {})];
    this.diff = o.diff || EF.diff();
    this.kits = o.kits || EF.Art.pickKits(this.teams[0], this.teams[1]);
    this.formation = [0, 1].map(s => EF.get('formation', (o.formation || [])[s] || this.teams[s].formation));
    this.tactic = [0, 1].map(s => EF.get('tactic', this.teams[s].tactic));
    // the state the presentation, replays and the network read
    this.mode = 'kickoff'; this.modeT = 0; this.half = 1; this.clock = 0; this.stopT = 0; this.stoppage = 0; this.stoppageShown = false;
    this.score = [0, 0]; this.goals = []; this.euphoria = (o.euphoria || [0, 0]).slice(); this.europhoria = null; this.superUsed = false;
    this.owner = null; this.lastTouch = null; this.lastKick = null; this.passChain = [0, 0]; this.possT = [0, 0];
    this.kickoffSide = 0; this.firstKick = 0; this.kickHold = 0; this.golden = false; this.over = false; this.result = null;
    this.setpiece = null; this.shootout = null; this.var = null; this.pendingCard = null; this.advantage = null; this.celebration = null;
    this.notice = null; this.bus = null; this.fog = 0; this.lightsOut = 0; this.events = [];   // matchday events live
    this.eventsDone = { 1: 0, 2: 0 }; this.slowmo = null; this.duel = null; this.lastFoul = null;
    this.stats = { shots: [0, 0], onTarget: [0, 0], passes: [0, 0], passesDone: [0, 0], tackles: [0, 0], fouls: [0, 0], corners: [0, 0], freekicks: [0, 0],
      cards: [0, 0], saves: [0, 0], supers: [0, 0], skills: [0, 0], headers: [0, 0], recoveries: [0, 0], nutmegs: [0, 0], per: {} };
    this.ball = new EF.Ball(this);
    this.players = []; this.side = [[], []];
    for (const s of [0, 1]) this.buildSide(s);
    this.ref = new EF.Referee(this, EF.get('referee', o.referee || this.stadium.referee || 'haltwhistle'));
    this.brains = [new EF.TeamBrain(this, 0), new EF.TeamBrain(this, 1)];
    this.humans = [];
    for (const h of o.humans || []) this.addHuman(h);
    this.onEnd = o.onEnd || null;
    this.eventOn = !this.pure && o.events !== false;
    if (o.shootoutOnly) this.startShootout(true);
    else this.startKickoff(0, true);
  }
  /* ---- sides and directions: side 0 attacks +x in the first half; the ends swap at half time ---- */
  dir(s) { const d = this.half === 2 ? -1 : 1; return s === 0 ? d : -d; }
  goalX(s) { return this.dir(s) > 0 ? EF.P.X1 : EF.P.X0; }       // the goal side s attacks
  ownGoalX(s) { return this.dir(s) > 0 ? EF.P.X0 : EF.P.X1; }    // the goal side s defends
  /** u: 0 at side s's own goal line .. 1 at the one it attacks */
  u(s, x) { const P = EF.P; return this.dir(s) > 0 ? (x - P.X0) / P.L : (P.X1 - x) / P.L; }
  xOfU(s, u) { const P = EF.P; return this.dir(s) > 0 ? P.X0 + u * P.L : P.X1 - u * P.L; }
  keeper(s) { return this.side[s].find(f => f.role === 'GK' && !f.sentOff && !f.ghost) || null; }
  outfield(s) { return this.side[s].filter(f => f.role !== 'GK' && !f.sentOff && !f.ghost); }
  active(s) { return this.side[s].filter(f => !f.sentOff && !f.ghost); }
  team(s) { return this.teams[s]; }
  emit(type, ev = {}) { ev.t = this.t; if (ev.side === undefined && ev.who) ev.side = ev.who.side; if (ev.who && typeof ev.who === 'object') { ev.whoId = ev.who.id; } ev.match = this; return EF.bus.emit(type, ev); }
  get minute() { return this.minuteAt(this.clock); }
  minuteAt(c) { if (this.half >= 3) return 90 + Math.min(15, c / 60 * 15); return (this.half - 1) * 45 + c / this.halfLen * 45; }
  get clockText() {
    if (this.shootout) return 'PENS';
    const m = this.minute, base = this.half >= 3 ? 90 : this.half * 45;
    if (this.half >= 3) return 'ET ' + Math.min(105, Math.floor(m) + 1) + "'";
    if (m >= base) return base + '+' + Math.min(this.stoppage || 1, Math.floor(m - base) + 1) + "'";
    return Math.floor(m) + 1 + "'";
  }
  /** a footballer's side's Euphoria factor (the team's crowd, difficulty for the CPU, the underdog boost) */
  euFactor(s) { const t = this.teams[s], cpu = !this.humans.some(h => h.side === s); return (t.crowd && t.crowd.factor || 1) * (cpu && this.kind !== 'attract' ? this.diff.eu : 1) * (this.buffs[s].euphoriaGain || 1); }
  /* ---- the squads ---- */
  buildSide(s) {
    const T = this.teams[s], F = this.formation[s], roles = Object.keys(F.roles);
    const roster = T.players.slice().sort((a, b) => (a.pos === 'GK' ? 0 : 1) - (b.pos === 'GK' ? 0 : 1));
    const gk = roster.find(p => p.pos === 'GK'), out = roster.filter(p => p !== gk);
    const order = { DEF: 0, MID: 1, FWD: 2 };
    out.sort((a, b) => order[a.pos] - order[b.pos]);
    const outRoles = roles.filter(r => !F.roles[r].keeper);
    const assign = [[gk, roles.find(r => F.roles[r].keeper)]].concat(out.map((p, i) => [p, outRoles[i]]));
    for (const [p, slot] of assign) {
      const f = new EF.Footballer(this, s, this.side[s].length, p, slot);
      this.side[s].push(f); this.players.push(f);
    }
    this.players.forEach((f, i) => { f.id = i; });
  }
  /** change side s's formation during the match (a team talk, a red card, catenaccio's 3-1): slots are reassigned */
  setFormation(s, id) {
    const F = EF.get('formation', id); if (!F) return; this.formation[s] = F;
    const roles = Object.keys(F.roles).filter(r => !F.roles[r].keeper), out = this.side[s].filter(f => f.role !== 'GK');
    out.forEach((f, i) => { f.slot = roles[Math.min(i, roles.length - 1)]; });
  }
  /* ---- humans: each controls one footballer at a time and switches on his own ---- */
  addHuman(h) {
    const slot = { input: h.input || null, side: h.side, fb: null, n: this.humans.length, ctl: h.ctl || null, remote: !!h.remote, id: h.id !== undefined ? h.id : this.humans.length,
      color: h.color || E.PLAYER_COLORS[this.humans.length] || '#ffe08a', name: h.name || (h.input && h.input.name) || 'P' + (this.humans.length + 1), used: {}, cpu: false, stats: { Goals: 0, Shots: 0, Tackles: 0 } };
    this.humans.push(slot);
    slot.ctl = slot.ctl || new EF.HumanController(this, slot);
    this.pickFor(slot, true);
    return slot;
  }
  removeHuman(slot) { const i = this.humans.indexOf(slot); if (i < 0) return; if (slot.fb) slot.fb.human = null; this.humans.splice(i, 1); }
  /** the footballer a human should hold: the nearest to the ball not held by another (never the keeper in open play) */
  pickFor(slot, first) {
    const s = slot.side, free = this.outfield(s).filter(f => !f.human || f.human === slot);
    if (!free.length) return;
    const b = this.ball, c = free.slice().sort((a, b2) => H.d(a.body, b) - H.d(b2.body, b))[0];
    const pref = first && free.find(f => f.data.captain) || c;
    this.giveTo(slot, first ? pref : c);
  }
  giveTo(slot, f) {
    if (!f || f.sentOff || (f.human && f.human !== slot)) return false;
    if (slot.fb === f) return true;
    if (slot.fb) slot.fb.human = null;
    slot.fb = f; f.human = slot; slot.switchT = this.t;
    return true;
  }
  /** switch: the teammate nearest the ball not held by anyone, then the next on another press */
  switchHuman(slot, next) {
    const s = slot.side, b = this.ball.pos();
    const list = this.outfield(s).filter(f => (!f.human || f.human === slot) && f.state !== 'off').sort((a, c) => H.d(a.body, b) - H.d(c.body, b));
    if (!list.length) return;
    let pick = list[0];
    if (pick === slot.fb || next) { const i = list.indexOf(slot.fb); pick = list[(i + 1) % list.length]; if (!next && list[0] !== slot.fb) pick = list[0]; }
    if (pick !== slot.fb) { this.giveTo(slot, pick); this.emit('switch', { who: pick, human: slot }); }
  }
  humanOf(f) { return f.human; }
  hasHuman(s) { return this.humans.some(h => h.side === s && !h.cpu); }
  /** the intent for footballer f this step: his human's, else his team's bot */
  intentFor(f, dt) {
    if (this.script) { const it = this.script(f, dt); if (it) return it; }
    if (f.human && !f.human.cpu && !this.cheats.watch && !(EF.Dev && EF.Dev.takesInput())) return f.human.ctl.intent(f, dt);
    return this.brains[f.side].intent(f, dt);
  }

  /* ---- the step ---- */
  update(dt) {
    if (this.over && this.mode === 'over') return;
    this.t += dt; this.modeT += dt;
    if (this.notice) { this.notice.t += dt / Math.max(.05, game.timeScale || 1); if (this.notice.t > this.notice.dur) this.notice = null; }
    if (this.slowmo) { this.slowmo.t -= dt / Math.max(.05, game.timeScale); if (this.slowmo.t <= 0) { this.slowmo = null; this.wantScale = 1; } }
    this.euphoriaStep(dt);
    const M = this.mode;
    if (M === 'shootout') { this.shootoutStep(dt); this.stepBodies(dt, true); return; }
    if (M === 'var') { this.varStep(dt); this.stepBodies(dt, true); return; }
    if (M === 'card') { this.cardStep(dt); this.stepBodies(dt, true); return; }
    if (M === 'goal' || M === 'celebrate') { this.goalStep(dt); this.stepBodies(dt, M === 'celebrate'); this.ball.update(dt); return; }
    if (M === 'replay') { this.replayWait(dt); return; }
    if (M === 'halftime') { if (this.modeT > 4.2) this.secondHalf(); this.stepBodies(dt, true); return; }
    if (M === 'fulltime') { this.stepBodies(dt, true); if (this.modeT > 3 && !this.over) this.finish(); return; }
    if (M === 'kickoff' || M === 'setpiece') this.setpieceStep(dt);
    // play (and set pieces once taken): the clock, the bodies, the ball, the rules
    if (this.mode === 'play' || (this.mode === 'setpiece' && this.setpiece && this.setpiece.taken)) this.clockStep(dt);
    for (const b of this.brains) b.update(dt);
    this.stepBodies(dt, false);
    if (this.mode === 'play' || this.mode === 'setpiece' || this.mode === 'kickoff') this.ball.update(dt);
    this.ownerBall(dt);
    this.ref.update(dt);
    this.advantageStep(dt);
    if (this.eventOn) this.eventsStep(dt);
    if (this.owner) this.possT[this.owner.side] += dt;
    this.kickHold = Math.max(0, this.kickHold - dt);
  }
  /** every footballer's step; frozen: no intents (they walk to their spots or stand) */
  stepBodies(dt, frozen) {
    for (const f of this.players) {
      const it = frozen || f.frozen ? f.idleIntent() : this.intentFor(f, dt);
      f.step(dt, it, frozen);
    }
    this.separate();
    if (!frozen) this.pickup();
  }
  /** keep bodies from overlapping (cheap pairs: ten players) */
  separate() {
    const L = this.players;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (a.sentOff || b.sentOff || a.ghost || b.ghost) continue;
      const A = a.body, B = b.body, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), m = A.r + B.r - 1;
      if (d < m && d > 1e-4 && Math.abs(A.z - B.z) < 14) {
        const k = (m - d) / 2, ux = dx / d, uy = dy / d;
        A.x -= ux * k; A.y -= uy * k; B.x += ux * k; B.y += uy * k;
        const cs = (A.vx - B.vx) * ux + (A.vy - B.vy) * uy;
        if (cs > 220 && this.mode === 'play') this.collide(a, b, cs);
      }
    }
  }
  /* ---- possession ---- */
  setOwner(f, how) {
    const was = this.owner;
    if (f === was) return;
    if (was && was.holding) { was.holding = false; was.holdT = 0; }
    this.owner = f;
    if (f) {
      const b = this.ball; b.owner = f; b.superPath = null; b.spin = 0; b.decoys = null; f.ownT = 0;
      const prev = this.lastTouch; this.touch(f);
      if (b.pass && b.pass.from && b.pass.from !== f) {
        if (b.pass.from.side === f.side) {
          this.stats.passesDone[f.side]++; this.passChain[f.side]++; this.passChain[1 - f.side] = 0;
          this.emit('passDone', { who: f, from: b.pass.from, kind: b.pass.kind, chain: this.passChain[f.side] });
          if (b.pass.oneTwo && b.pass.from.human) this.oneTwoReturn(b.pass.from, f);
        } else { this.passChain = [0, 0]; this.passChain[f.side] = 0; this.emit('intercept', { who: f, from: b.pass.from }); this.stats.recoveries[f.side]++; }
      } else if (prev && prev.side !== f.side && how !== 'restart') { this.passChain = [0, 0]; this.emit('recover', { who: f, from: prev }); this.stats.recoveries[f.side]++; }
      b.pass = null;
      this.emit('possess', { who: f, how });
      // auto switching: a pass reaching a teammate, or the human side losing the ball
      for (const h of this.humans) if (h.side === f.side && f !== h.fb && !f.human && f.role !== 'GK' && this.autoSwitch(h)) this.giveTo(h, f);
      // the human side lost it: control goes to the teammate nearest the ball (unless he is already the man)
      for (const h of this.humans) if (h.side !== f.side && h.fb && !h.cpu && this.autoSwitch(h) && how !== 'restart') {
        const near = this.outfield(h.side).filter(q => !q.human || q.human === h).sort((a, c) => H.d(a.body, f.body) - H.d(c.body, f.body))[0];
        if (near && near !== h.fb && H.d(near.body, f.body) + 20 < H.d(h.fb.body, f.body)) this.giveTo(h, near);
      }
    } else this.ball.owner = null;
  }
  autoSwitch(h) { const m = game.settings.switching; if (h.remote) return true; if (m === 'manual') return false; if (m === 'assisted' && h.fb && h.fb.lastIntent && h.fb.lastIntent.sprint) return false; return true; }
  touch(f) { this.lastTouch = f; f.lastTouchT = this.t; this.emit('touch', { who: f }); }
  /** a loose ball: whoever reaches it first takes it (section 6.2) */
  pickup() {
    const b = this.ball; if (this.owner || b.superPath || this.mode === 'goal' || b.held) return;
    if (!(this.mode === 'play' || (this.mode === 'setpiece' && this.setpiece && this.setpiece.taken) || this.mode === 'kickoff')) return;
    const sp = Math.hypot(b.vx, b.vy), vzOk = b.z < 9 || (b.z < 17 && Math.abs(b.vz) < 90 && sp < 170);
    if (!vzOk) return;
    let best = null, bd = 1e9;
    for (const f of this.players) {
      if (!f.canTake()) continue;
      if (this.kickHold > 0 && f.side !== this.kickoffSide && Math.hypot(b.x - EF.P.CX, b.y - EF.P.CY) < 60) continue;
      if (this.setpiece && this.setpiece.taken && this.setpiece.taker === f && !this.setpiece.touched && f.role !== 'GK') continue;   // (a taker cannot touch it twice)
      const d = Math.hypot(b.x - f.body.x, b.y - f.body.y), reach = (sp > EF.T.trapSpeed ? 4.5 : 9) + (f.role === 'GK' && f.inOwnBox() ? 3 : 0);
      if (d < reach && d < bd) { bd = d; best = f; }
    }
    if (!best) return;
    if (this.setpiece && this.setpiece.taken) this.setpiece.touched = true;
    const pass = b.pass;
    if (pass && pass.from && pass.from.side !== best.side && sp > 110 && best.role !== 'GK') {   // an interception: take it, or deflect it
      const p = .35 + .5 * best.stat('tackle') / 100;
      if (this.rng() > p) {
        const a = Math.atan2(b.vy, b.vx) + (this.rng() - .5) * 1.6, s2 = sp * .55;
        b.vx = Math.cos(a) * s2; b.vy = Math.sin(a) * s2; b.vz = 30 + this.rng() * 30; b.pass = null; best.cool = .25; this.touch(best);
        this.emit('deflect', { who: best }); return;
      }
    }
    if (sp > EF.T.trapSpeed && best.role !== 'GK') {   // a heavy first touch: it bobbles ahead
      const k = 4 + (1 - best.stat('skill') / 100) * 6, a = best.facing;
      this.touch(best); b.pass = null;
      b.vx = Math.cos(a) * (40 + k * 6); b.vy = Math.sin(a) * (40 + k * 6); b.vz = 20; best.cool = .12; return;
    }
    this.setOwner(best, 'trap');
  }
  /** the owned ball sits ahead of its owner's feet (section 6.2) */
  ownerBall(dt) {
    const f = this.owner, b = this.ball; if (!f) return;
    if (f.state === 'down' || f.state === 'launched' || f.sentOff) { this.setOwner(null); return; }
    f.ownT += dt;
    if (f.role === 'GK' && f.holding) { const h = f.handPoint(); b.x = h[0]; b.y = h[1]; b.z = h[2]; b.vx = b.vy = b.vz = 0; return; }
    const B = f.body, sp = Math.hypot(B.vx, B.vy), sprint = f.sprinting && sp > 100;
    const off = sp < 15 ? 5 : sprint ? 10 + 2 * Math.sin(f.stride * 2) : 7 + 2 * Math.sin(f.stride * 2);
    b.x = B.x + Math.cos(f.facing) * off; b.y = B.y + Math.sin(f.facing) * off; b.z = 0; b.vx = B.vx; b.vy = B.vy; b.vz = 0; b.onGround = true;
    b.roll += sp * dt; b.spin = 0;
    // the ball against the boards: it cannot be dribbled through them
    const P = EF.P; b.y = clamp(b.y, P.Y0 + 3, P.Y1 - 3);
  }
  /* ---- notices for the HUD (KICK OFF, GOAL!, ADVANTAGE! ...) ---- */
  note(text, o = {}) { this.notice = { text, t: 0, dur: o.dur || 1.6, color: o.color || null, sub: o.sub || null, big: o.big !== false }; this.emit('notice', { text, sub: o.sub }); }
  /** slow motion for a moment (super strikes, bicycle kicks, the Save Duel), counted in real time */
  slow(scale, seconds) { this.slowmo = { t: seconds }; this.wantScale = scale; }
  /** a step for anything waiting on a mode (the presentation's replay holds the match) */
  replayWait() { /* the replay player releases it (EF.Replay) */ }
  snapshotLite() { return { mode: this.mode, half: this.half, clock: +this.clock.toFixed(2), minute: Math.floor(this.minute), score: this.score.slice(), euphoria: this.euphoria.map(v => Math.round(v)), owner: this.owner ? this.owner.data.name : null }; }
}
EF.Match = Match;
/* ==== src/11-pitch.js ==== */
/* THE PITCH (section 6.1): 52 x 32 tiles of grass inside boards, a goal at each end with its net, an apron, stands.
 * Built from rows like the SPORTS kit's cage: the north stand (6 rows of tiers), the north apron, the boards, the field,
 * the south boards (cut low before the camera), the south apron (dugouts, the fourth official), the outside. West and
 * east: the end stand (4 tiers), the low end boards, the goal-end apron (where the ball goes out), the field. */
const P = EF.P = (() => {
  const T = 16, NS = 6, END = 4, APR = 3, FW = 52, FH = 32;
  const COLS = END + 1 + APR + FW + APR + 1 + END, ROWS = NS + 1 + 1 + FH + 1 + 2 + 2;
  const X0 = (END + 1 + APR) * T, X1 = X0 + FW * T, Y0 = (NS + 2) * T, Y1 = Y0 + FH * T;
  return { T, NS, END, APR, FW, FH, COLS, ROWS, X0, X1, Y0, Y1, L: X1 - X0, W: Y1 - Y0, CX: (X0 + X1) / 2, CY: (Y0 + Y1) / 2,
    GH: 48, BAR: 36, NET: 30, BOX_D: 112, BOX_H: 160, GA_D: 40, GA_H: 88, SPOT: 80, CIRCLE: 64, ARC: 72, POST: 2,
    BOARD_N: (NS + 1) * T, BOARD_S: Y1 + T, END_W: END * T, END_E: (COLS - END) * T };
})();
/** the field's paint: lines within w of a marking (section 6.1) */
P.isLine = (x, y, w = 1) => {
  const { X0, X1, Y0, Y1, CX, CY } = P;
  if (x < X0 - w || x > X1 + w || y < Y0 - w || y > Y1 + w) return false;
  const ex = Math.min(Math.abs(x - X0), Math.abs(x - X1)), ey = Math.min(Math.abs(y - Y0), Math.abs(y - Y1));
  if (ex < w + .5 || ey < w + .5) return true;
  if (Math.abs(x - CX) < w && y > Y0 && y < Y1) return true;
  const dc = Math.hypot(x - CX, y - CY); if (Math.abs(dc - P.CIRCLE) < w || dc < 2.2) return true;
  for (const gx of [X0, X1]) {
    const into = Math.abs(x - gx), dy = Math.abs(y - CY), s = gx === X0 ? 1 : -1;
    if ((Math.abs(into - P.BOX_D) < w && dy <= P.BOX_H) || (into <= P.BOX_D && Math.abs(dy - P.BOX_H) < w)) return true;
    if ((Math.abs(into - P.GA_D) < w && dy <= P.GA_H) || (into <= P.GA_D && Math.abs(dy - P.GA_H) < w)) return true;
    const sx = gx + s * P.SPOT; if (Math.hypot(x - sx, y - CY) < 1.8) return true;
    if (Math.abs(Math.hypot(x - sx, y - CY) - P.ARC) < w && into > P.BOX_D) return true;
  }
  for (const cx of [X0, X1]) for (const cy of [Y0, Y1]) if (Math.abs(Math.hypot(x - cx, y - cy) - 8) < w && Math.abs(x - cx) < 9 && Math.abs(y - cy) < 9) return true;
  return false;
};
P.inField = (x, y) => x >= P.X0 && x <= P.X1 && y >= P.Y0 && y <= P.Y1;
/** inside the penalty area that side s defends (gx: the goal line's x) */
P.inBoxAt = (gx, x, y) => Math.abs(x - gx) <= P.BOX_D && Math.abs(y - P.CY) <= P.BOX_H && (gx === P.X0 ? x >= P.X0 - 2 : x <= P.X1 + 2);
P.inGoalAreaAt = (gx, x, y) => Math.abs(x - gx) <= P.GA_D && Math.abs(y - P.CY) <= P.GA_H;
/** the ball over a goal line: -1 (west), 1 (east) or 0 */
P.crossedGoalLine = b => b.x < P.X0 - b.r ? -1 : b.x > P.X1 + b.r ? 1 : 0;
P.inGoal = b => P.crossedGoalLine(b) !== 0 && Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2;
P.overTouchline = b => b.y < P.Y0 - 7 || b.y > P.Y1 + 7;

/* ---- surfaces: grass, wet, hard, snow, mud, puddles (section 6.2) ---- */
EF.SURF = { grass: { fr: 1, bo: .55 }, wet: { fr: .7, bo: .45 }, hard: { fr: .8, bo: .6 }, snow: { fr: 1.7, bo: .35 }, mud: { fr: 3, bo: .2 }, puddle: { fr: 4, bo: .12 } };

/* ---- the stadium's map and its look, built once a stadium and weather ---- */
const PITCH_CACHE = new Map();
EF.Pitch = {
  get(st, weather) {
    const key = st.id + ':' + (weather ? weather.kind : 'clear');
    if (!PITCH_CACHE.has(key)) PITCH_CACHE.set(key, this.build(st, weather));
    return PITCH_CACHE.get(key);
  },
  build(st, weather) {
    const rr = E.rng((st.id.length * 7919 + st.id.charCodeAt(0) * 31) >>> 0);
    const snow = weather && weather.kind === 'snow', wet = weather && weather.kind === 'rain';
    const puddles = [], mud = [];
    if (wet) for (let i = 0; i < (st.puddles || 4); i++) puddles.push({ x: P.X0 + 60 + rr() * (P.L - 120), y: P.Y0 + 40 + rr() * (P.W - 80), r: 7 + rr() * 9 });
    for (const m of st.mud || []) mud.push({ x: P.X0 + m[0] * P.L, y: P.Y0 + m[1] * P.W, r: m[2] });
    const tiers = st.stands || {}, north = Math.min(P.NS, (tiers.north && tiers.north.tiers) || 5), end = Math.min(P.END, (tiers.end && tiers.end.tiers) || 4);
    const tierH = (tiers.north && tiers.north.heights) || [34, 44, 54, 64, 74, 84];
    const rows = [];
    for (let r = 0; r < P.ROWS; r++) {
      let s = '';
      for (let c = 0; c < P.COLS; c++) {
        const x = c * P.T + 8, y = r * P.T + 8;
        let ch = ',';
        if (r < P.NS) { const tier = P.NS - 1 - r; ch = tier < north ? String.fromCharCode(65 + tier) : ','; }   // A front tier .. F back
        else if (r === P.NS) ch = c < P.END || c >= P.COLS - P.END ? endCh(c) : ':';
        else if (r === P.NS + 1) ch = c < P.END || c >= P.COLS - P.END ? endCh(c) : c === P.END || c === P.COLS - P.END - 1 ? 'e' : 'b';
        else if (r <= P.NS + 1 + P.FH) {
          if (c < P.END || c >= P.COLS - P.END) ch = endCh(c);
          else if (c === P.END || c === P.COLS - P.END - 1) ch = 'e';
          else if (x < P.X0 || x > P.X1) ch = Math.abs(y - P.CY) < P.GH + 4 && Math.abs((x < P.X0 ? P.X0 : P.X1) - x) < P.NET + 4 ? 'n' : ':';
          else ch = '.';
        }
        else if (r === P.NS + 2 + P.FH) ch = c < P.END || c >= P.COLS - P.END ? endCh(c) : c === P.END || c === P.COLS - P.END - 1 ? 'e' : 's';
        else if (r <= P.NS + 4 + P.FH) ch = c < P.END || c >= P.COLS - P.END ? ',' : ';';
        s += ch;
      }
      rows.push(s);
    }
    function endCh(c) { const tier = c < P.END ? P.END - 1 - c : c - (P.COLS - P.END); return tier < end ? String.fromCharCode(97 + 6 + tier) : ','; }   // g h i j: end tiers
    const seat = (tiers.north && tiers.north.seats) || st.seats || '#3a3a52', seat2 = st.seats2 || E.shade(seat, .15);
    const types = {
      1: { h: 26, face: 'plank', side: st.boardSide || '#24304e', top: '#d8dce8', line: '#1a2236' },
      2: { h: 26, cut: true, cutH: 5, face: 'plank', side: st.boardSide || '#24304e', top: '#d8dce8', line: '#1a2236' },
      3: { h: 18, face: 'plank', side: st.boardSide || '#24304e', top: '#c8ccd8', line: '#1a2236' }
    };
    const legend = { '.': { floor: 'grass' }, ':': { floor: 'apron' }, ';': { floor: 'apron' }, ',': { floor: 'out' }, n: { floor: 'net' }, b: 1, s: 2, e: 3 };
    for (let t = 0; t < P.NS; t++) { const id = 10 + t; types[id] = { h: tierH[t] || 34 + t * 10, face: st.standFace || 'stone', side: E.shade(st.standSide || '#4a4a5c', -t * .05), top: t % 2 ? seat2 : seat, roof: 'plain', line: '#141420' }; legend[String.fromCharCode(65 + t)] = id; }
    for (let t = 0; t < P.END; t++) { const id = 20 + t; types[id] = { h: [28, 38, 48, 58][t], face: st.standFace || 'stone', side: E.shade(st.standSide || '#4a4a5c', -t * .06), top: t % 2 ? seat2 : seat, roof: 'plain', line: '#141420' }; legend[String.fromCharCode(97 + 6 + t)] = id; }
    const grass = (st.grass || ['#3f7a34', '#4a8a3c']).map(E.hex), lines = E.hex(st.lines || '#e8ece0'), wear = st.wear || .3;
    const apron = E.hex(st.apron || '#3a4a3a'), out = E.hex(st.outside || '#22242c'), netC = E.hex('#2e5a30');
    const snowC = E.hex('#e8eef6'), mudC = E.hex('#5a4228'), pud = E.hex('#5a7a90');
    const floorTex = (x, y, tag) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
      if (tag === 'out') return [out[0] + n * 14, out[1] + n * 14, out[2] + n * 16];
      if (tag === 'apron' || tag === 'net') {
        if (tag === 'net' && (Math.floor(x) % 4 === 0 || Math.floor(y) % 4 === 0)) return [netC[0] * .7, netC[1] * .7, netC[2] * .7];
        const c = snow ? snowC : apron; return [c[0] + n * 16 + m * 10, c[1] + n * 16 + m * 10, c[2] + n * 16 + m * 10];
      }
      const stripe = Math.floor((x - P.X0) / 32) % 2 ? 1 : 0, g = stripe ? grass[1] : grass[0];
      let c = [g[0] + n * 18 + m * 16, g[1] + n * 22 + m * 22, g[2] + n * 14 + m * 12];
      // wear: the goalmouths and the centre circle, by stadium
      const wg = Math.min(Math.hypot((x - P.X0) * .9, y - P.CY), Math.hypot((x - P.X1) * .9, y - P.CY)), wc = Math.hypot(x - P.CX, y - P.CY);
      const w = wear * (Math.max(0, 1 - wg / 70) * .8 + Math.max(0, 1 - wc / 50) * .4) * (.6 + m);
      if (w > 0) c = [lerp(c[0], 118, w), lerp(c[1], 96, w), lerp(c[2], 60, w)];
      for (const q of mud) { const d = Math.hypot(x - q.x, y - q.y) / q.r + n * .4; if (d < 1) { const k = clamp((1 - d) * 2, 0, 1); c = [lerp(c[0], mudC[0] + n * 20, k), lerp(c[1], mudC[1] + n * 16, k), lerp(c[2], mudC[2] + n * 10, k)]; } }
      if (snow) { const k = clamp(.5 + m * .5 + E.noise2(x * .013, y * .02) * .25, .25, .85); c = [lerp(c[0], snowC[0] - 30 + n * 16, k), lerp(c[1], snowC[1] - 22 + n * 16, k), lerp(c[2], snowC[2] - 12 + n * 12, k)]; }
      if (P.isLine(x, y)) { const k = snow ? .9 : .92; const lw = lines[0] + n * 20; c = [lerp(c[0], lw, k), lerp(c[1], lines[1] + n * 20, k), lerp(c[2], lines[2] + n * 20, k)]; if (snow) c = [c[0] * .9, c[1] * .92, c[2] * .75]; }
      for (const q of puddles) { const d = Math.hypot(x - q.x, (y - q.y) * 1.3) / q.r + n * .25; if (d < 1) { const k = d < .7 ? 1 : (1 - d) / .3; c = [lerp(c[0], pud[0] + m * 30, k), lerp(c[1], pud[1] + m * 30, k), lerp(c[2], pud[2] + m * 30, k)]; } }
      if (wet && E.hash2(Math.floor(x / 3), Math.floor(y / 2)) > .93) c = [c[0] + 30, c[1] + 34, c[2] + 40];   // the wet sheen
      return c;
    };
    const map = new E.TileMap({ rows, legend, types, floorTex, outside: st.outside || '#16181e', ao: 4 });
    return { map, rows, puddles, mud, snow, wet, stadium: st,
      surfaceAt(x, y, base) {
        for (const q of puddles) if (Math.hypot(x - q.x, (y - q.y) * 1.3) < q.r * .85) return 'puddle';
        for (const q of mud) if (Math.hypot(x - q.x, y - q.y) < q.r * .8) return 'mud';
        return base;
      } };
  }
};
/* ==== src/12-ball.js ==== */
/* THE BALL (section 6.2): an E.Body that rolls by the surface, bounces, curls by its spin, drifts in the wind, rings
 * off the woodwork, bulges the net, and follows a super strike's path when it has one. */
class Ball extends E.Body {
  constructor(m) {
    super({ x: P.CX, y: P.CY, r: 3, friction: 0, bounce: EF.T.ballBounce, gravity: EF.T.ballGravity });
    this.m = m; this.spin = 0; this.roll = 0; this.owner = null; this.pass = null; this.trail = []; this.superPath = null; this.decoys = null;
    this.held = false; this.dead = false; this.prevX = this.x; this.prevY = this.y; this.shot = null; this.screamer = false; this.lastBounce = 0;
  }
  pos() { return { x: this.x, y: this.y, z: this.z }; }
  speed() { return Math.hypot(this.vx, this.vy); }
  place(x, y, z = 0) { this.x = x; this.y = y; this.z = z; this.vx = this.vy = this.vz = 0; this.spin = 0; this.onGround = z <= 0; this.superPath = null; this.decoys = null; this.prevX = x; this.prevY = y; this.trail.length = 0; this.pass = null; this.shot = null; this.screamer = false; }
  /** kick it: velocity, lift, spin; who kicked it and what kind of kick (for passes and shots) */
  kick(vx, vy, vz, o = {}) {
    const m = this.m; if (m.owner) m.setOwner(null);
    this.vx = vx; this.vy = vy; this.vz = vz || 0; this.onGround = !(vz > 0); this.spin = o.spin || 0; this.superPath = null; this.held = false;
    this.pass = o.pass || null; this.shot = o.shot || null; this.screamer = !!o.screamer; this.dead = false; this.heldBy = null; this.inNet = false;
    if (o.who) { m.lastKick = o.who; m.touch(o.who); o.who.cool = o.cool !== undefined ? o.cool : .3; }
    m.kickHold = 0;
  }
  /** the surface under the ball now */
  surface() { return this.m.pitch.surfaceAt(this.x, this.y, this.m.surface); }
  /** where the ball will be after t seconds of free flight (no bounces): for keepers, air moves and the AI */
  predict(t) {
    const g = this.gravity, z = Math.max(0, this.z + this.vz * t - .5 * g * t * t);
    if (this.z <= .5 && this.vz <= 0) { const k = EF.T.ballFriction * EF.SURF[this.surface()].fr, f = (1 - Math.exp(-k * t)) / k; return { x: this.x + this.vx * f, y: this.y + this.vy * f, z: 0 }; }
    return { x: this.x + this.vx * t, y: this.y + this.vy * t, z };
  }
  /** when and where it crosses the goal line at x = gx in flight (y, z), or null */
  crossing(gx) {
    if (Math.abs(this.vx) < 1 || Math.sign(gx - this.x) !== Math.sign(this.vx)) return null;
    const t = (gx - this.x) / this.vx; if (t < 0 || t > 3) return null;
    const p = this.predict(t); return { t, y: p.y, z: p.z };
  }
  update(dt) {
    const m = this.m; if (this.owner) return;
    if (this.held) { if (this.heldBy && !this.heldBy.sentOff) { const h = this.heldBy.handPoint(); this.x = h[0]; this.y = h[1]; this.z = h[2]; } return; }
    this.prevX = this.x; this.prevY = this.y;
    if (this.superPath) { this.followPath(dt); this.trailPush(); return; }
    const surf = EF.SURF[this.surface()] || EF.SURF.grass, sp = Math.hypot(this.vx, this.vy);
    this.gravity = EF.T.ballGravity; this.bounce = EF.T.ballBounce * surf.bo / .55;
    if (this.spin && sp > 20) { const k = this.spin * dt, vx0 = this.vx, vy0 = this.vy; this.vx += -vy0 * k; this.vy += vx0 * k; this.spin *= Math.exp(-1.4 * dt); }
    if (this.z <= .5 && Math.abs(this.vz) < 30) {
      const f = Math.exp(-dt * EF.T.ballFriction * surf.fr); this.vx *= f; this.vy *= f;
      if (m.stadium.uneven && sp > 40 && m.rng() < dt * .8) { const a = (m.rng() - .5) * .5, c = Math.cos(a), s = Math.sin(a), vx = this.vx; this.vx = vx * c - this.vy * s; this.vy = vx * s + this.vy * c; }
      if (sp < 2) { this.vx = this.vy = 0; }
    } else { const f = Math.exp(-dt * .12); this.vx *= f; this.vy *= f; }
    const W = m.weather; if (W && W.wind && this.z > 14) this.vy += W.wind * 20 * dt * (m.stadium.windDir || 1);
    super.update(dt, m.pitch.map);
    if (this.hitWall) { this.spin = 0; if (sp > 60) m.emit('boards', { x: this.x, y: this.y, z: this.z, speed: sp }); }
    if (this.bounced) { this.lastBounce = m.t; m.emit('bounce', { x: this.x, y: this.y, z: 0, surf: this.surface(), speed: Math.abs(this.vz) }); if (this.surface() === 'puddle') { this.vx *= .3; this.vy *= .3; this.vz *= .3; m.emit('splash', { x: this.x, y: this.y }); } }
    this.roll += sp * dt;
    this.woodwork(dt);
    this.netStep();
    this.trailPush();
    if (!this.dead) m.ballRules(this);
  }
  trailPush() { const T = this.trail; if (this.screamer || this.superPath || T.length) { T.push([this.x, this.y, this.z]); if (T.length > 14 || (!this.screamer && !this.superPath)) T.shift(); } }
  /** posts and bar: cylinders of radius 2 (section 6.2) */
  woodwork() {
    const m = this.m, r = this.r + P.POST;
    for (const gx of [P.X0, P.X1]) {
      if (Math.abs(this.x - gx) > 8) continue;
      for (const py of [P.CY - P.GH, P.CY + P.GH]) {
        const dx = this.x - gx, dy = this.y - py, d = Math.hypot(dx, dy);
        if (d < r && this.z < P.BAR + 1) {
          const nx = dx / (d || 1), ny = dy / (d || 1), vn = this.vx * nx + this.vy * ny;
          if (vn < 0) { this.vx -= 1.7 * vn * nx; this.vy -= 1.7 * vn * ny; this.x = gx + nx * r; this.y = py + ny * r; this.spin = 0; m.emit('woodwork', { x: this.x, y: this.y, z: this.z, speed: -vn, who: m.lastKick, part: 'post' }); }
        }
      }
      if (Math.abs(this.y - P.CY) < P.GH) {
        const dx = this.x - gx, dz = this.z - P.BAR, d = Math.hypot(dx, dz);
        if (d < r) {
          const nx = dx / (d || 1), nz = dz / (d || 1), vn = this.vx * nx + this.vz * nz;
          if (vn < 0) { this.vx -= 1.7 * vn * nx; this.vz -= 1.7 * vn * nz; this.x = gx + nx * r; this.z = P.BAR + nz * r; this.onGround = false; this.spin = 0; m.emit('woodwork', { x: this.x, y: this.y, z: this.z, speed: -vn, who: m.lastKick, part: 'bar' }); }
        }
      }
    }
  }
  /** inside a goal: the net's sides, back and top stop it softly and ripple */
  netStep() {
    const s = this.x < P.X0 - this.r ? -1 : this.x > P.X1 + this.r ? 1 : 0; if (!s) return;
    const gx = s < 0 ? P.X0 : P.X1, back = gx + s * P.NET, inside = Math.abs(this.y - P.CY) < P.GH + 1 && this.z < P.BAR + 1 && (s < 0 ? this.x > back - 2 : this.x < back + 2);
    if (!inside || !this.inNet) { if (inside && P.inGoal(this)) this.inNet = true; else return; }
    let hit = null;
    if (s < 0 ? this.x < back + this.r : this.x > back - this.r) { this.x = back - s * this.r; this.vx *= -.2; hit = [this.x, this.y, this.z]; }
    if (Math.abs(this.y - P.CY) > P.GH - this.r) { this.y = P.CY + Math.sign(this.y - P.CY) * (P.GH - this.r); this.vy *= -.2; hit = [this.x, this.y, this.z]; }
    if (this.z > P.BAR - this.r) { this.z = P.BAR - this.r; this.vz = Math.min(0, this.vz) * .2; hit = [this.x, this.y, this.z]; }
    if (hit) { this.vx *= .6; this.vy *= .6; EF.Nets.hit(s < 0 ? 0 : 1, hit, Math.min(1, this.speed() / 300 + .3)); if (this.m.mode === 'goal') this.m.emit('netHit', { x: hit[0], y: hit[1], z: hit[2] }); }
  }
  /* ---- super strikes: a path from the shooter to the goal (registry super, section 6.9) ---- */
  startPath(kind, from, to, o = {}) {
    const m = this.m; if (m.owner) m.setOwner(null);
    const d = Math.hypot(to.x - from.x, to.y - from.y), dur = Math.max(.35, d / (o.speed || EF.T.superSpeed)) * (kind === 'meteor' ? 1.9 : kind === 'around' ? 1.25 : 1);
    this.superPath = { kind, t: 0, dur, from: Object.assign({}, from), to: Object.assign({}, to), o, bumps: kind === 'around' ? this.aroundBumps(from, to) : null, bounces: 0, side: o.side };
    this.decoys = kind === 'split' ? [{ k: -1, alive: true }, { k: 1, alive: true }] : null;
    this.pass = null; this.shot = { super: true, side: o.side }; this.spin = 0; this.held = false;
  }
  aroundBumps(from, to) {   // every body near the straight path pushes a bulge away from it
    const bumps = [], L = Math.hypot(to.x - from.x, to.y - from.y) || 1, ux = (to.x - from.x) / L, uy = (to.y - from.y) / L;
    for (const f of this.m.players) {
      const rx = f.body.x - from.x, ry = f.body.y - from.y, along = rx * ux + ry * uy, across = -rx * uy + ry * ux;
      if (along > 20 && along < L - 4 && Math.abs(across) < 26) bumps.push({ u: along / L, k: (across > 0 ? -1 : 1) * (26 - Math.abs(across) + 10) });
    }
    return bumps;
  }
  pathAt(sp, u) {
    const { from, to, kind, o } = sp, L = Math.hypot(to.x - from.x, to.y - from.y) || 1, nx = -(to.y - from.y) / L, ny = (to.x - from.x) / L;
    let x = lerp(from.x, to.x, u), y = lerp(from.y, to.y, u), z = lerp(from.z || 4, to.z, u), off = 0;
    if (kind === 'wobble') off = Math.sin(u * TAU * (o.freq || 3.5)) * (o.amp || 16) * Math.sin(u * Math.PI);
    else if (kind === 'zigzag') { const K = [0, 1, -1, .6, 0], i = Math.min(3, Math.floor(u * 4)), f = u * 4 - i; off = lerp(K[i], K[i + 1], f) * (o.amp || 30); }
    else if (kind === 'hammer') z = Math.abs(Math.sin(u * Math.PI * 3)) * 22 * (1 - u * .4) + (to.z * u);
    else if (kind === 'meteor') { if (u < .45) { const k = u / .45; z = (from.z || 4) + ease.outQuad(k) * 320; x = lerp(from.x, lerp(from.x, to.x, .7), k); y = lerp(from.y, lerp(from.y, to.y, .7), k); } else { const k = (u - .45) / .55; z = lerp(320, to.z, ease.inQuad(k)); x = lerp(lerp(from.x, to.x, .7), to.x, k); y = lerp(lerp(from.y, to.y, .7), to.y, k); } }
    else if (kind === 'around' && sp.bumps) for (const b of sp.bumps) off += b.k * Math.exp(-Math.pow((u - b.u) / .09, 2));
    return { x: x + nx * off, y: y + ny * off, z: Math.max(0, z) };
  }
  followPath(dt) {
    const sp = this.superPath, m = this.m, u0 = sp.t / sp.dur; sp.t += dt; const u = Math.min(1.02, sp.t / sp.dur);
    const p = this.pathAt(sp, Math.min(1, u)), q = this.pathAt(sp, Math.min(1, u + .01));
    this.vx = (q.x - p.x) / (sp.dur * .01); this.vy = (q.y - p.y) / (sp.dur * .01); this.vz = (q.z - p.z) / (sp.dur * .01);
    this.x = p.x; this.y = p.y; this.z = p.z; this.roll += EF.T.superSpeed * dt;
    if (sp.kind === 'hammer') { const b = Math.floor(u * 3); if (b > sp.bounces && b < 3) { sp.bounces = b; m.emit('hammer', { x: this.x, y: this.y }); } }
    if (sp.kind === 'around' || sp.kind === 'rocket' || sp.kind === 'hammer' || sp.kind === 'zigzag') {   // through a body: it goes down
      for (const f of m.players) if (f.side !== sp.side && f.role !== 'GK' && f.state !== 'down' && f.state !== 'launched' && H.d2(f.body.x, f.body.y, this.x, this.y) < 7 && this.z < 26) f.knock(Math.atan2(this.vy, this.vx), 1.2, 'super');
    }
    if (u0 < .86 && u >= .86) m.superAtKeeper(this);
    if (!this.superPath) return;
    if (u >= 1) {   // it reaches the goal line: in (unless a save took it)
      this.superPath = null; this.decoys = null;
      const s = sp.to.x < P.CX ? -1 : 1; this.vx = s * EF.T.superSpeed * .6; this.vy = 0; this.vz = 0;
      this.x = (s < 0 ? P.X0 : P.X1) + s * (this.r + 1); this.inNet = true;
      m.emit('decoysBurst', { x: this.x, y: this.y });
      m.ballRules(this, true);
    }
  }
}
EF.Ball = Ball;

/* ---- the nets: a 7 x 4 mesh a side that springs back from where the ball hit it (drawn by the match view) ---- */
EF.Nets = {
  mesh: [null, null],
  reset() { this.mesh = [this.make(), this.make()]; },
  make() { const pts = []; for (let i = 0; i < 8 * 5; i++) pts.push({ d: 0, v: 0 }); return pts; },
  hit(i, p, k) {
    const M = this.mesh[i] || (this.mesh[i] = this.make());
    for (let j = 0; j < 8; j++) for (let q = 0; q < 5; q++) {
      const y = P.CY - P.GH + j / 7 * P.GH * 2, z = q / 4 * P.BAR, d = Math.hypot(y - p[1], z - p[2]);
      M[j * 5 + q].v += k * 90 * Math.max(0, 1 - d / 40);
    }
  },
  update(dt) {
    for (const M of this.mesh) if (M) for (const n of M) { n.v += (-60 * n.d - 8 * n.v) * dt; n.d += n.v * dt; n.d = clamp(n.d, -4, 10); }
  }
};
EF.Nets.reset();
/* ==== src/13-footballer.js ==== */
/* THE FOOTBALLER (sections 6.3 - 6.7): a Body with stats and stamina, driven by one Intent a step (Footballer.act is the
 * only way he does anything). The state machine: run, kick, poke, slide, barge, skill, air, down, launched, getup,
 * dive (theatrics), celebrate, keeper-dive, keeper-hold, off (sent off), setpiece. The presentation reads `look`. */
const B0 = () => ({ down: false, pressed: false, released: false });
EF.Intent = {
  make() { return { move: [0, 0], aim: null, aimPoint: null, sprint: false, pass: B0(), shoot: B0(), lob: B0(), through: B0(), skill: B0(), sw: B0(), dive: B0(), euphoria: false, target: null, air: null, power: null, keeperDive: null, cel: -1 }; },
  idle: null
};
EF.Intent.idle = EF.Intent.make();
class Footballer {
  constructor(m, side, idx, data, slot) {
    this.m = m; this.side = side; this.idx = idx; this.data = data; this.slot = slot; this.team = m.teams[side];
    this.role = data.pos === 'GK' ? 'GK' : String(slot).replace(/[LR]$/, '');
    this.body = new E.Body({ x: P.CX, y: P.CY, r: 5, friction: 0, gravity: 700 });
    this.facing = side ? Math.PI : 0; this.stamina = 100; this.state = 'run'; this.stT = 0; this.action = null;
    this.cool = 0; this.stun = 0; this.downT = 0; this.invuln = 0; this.cards = 0; this.sentOff = false; this.ghost = false; this.human = null;
    this.charge = 0; this.charging = false; this.kickName = null; this.kickT = 0; this.kickDur = 0; this.tilt = null; this.pose = null; this.expr = null;
    this.contactT = -9; this.contactBy = null; this.stride = 0; this.sprinting = false; this.skillCool = 0; this.curlT = 0; this.ownT = 0; this.lastTouchT = -9;
    this.order = null; this.frozen = false; this.holding = false; this.clip = null; this.glow = 0; this.sweat = false; this.lastIntent = EF.Intent.idle;
    this.look = { pose: null, expr: null, tilt: null, down: 0, air: false, sprint: false, hurt: false, spin: 0, clip: null };
    this.rating = 6; this.goalsN = 0;
  }
  get name() { return this.data.name; }
  get short() { const n = this.data.short || this.data.name.split(' ').slice(-1)[0]; return n; }
  stat(k) {
    const v = (this.data.stats && this.data.stats[k]) || 50, m = this.m, b = m.buffs[this.side];
    let x = v;
    if (k === 'pass' && b.pass) x += b.pass;
    if (k === 'tackle' && b.hairdryer && m.minute < 15) x += 10;
    return x;
  }
  get x() { return this.body.x; } get y() { return this.body.y; }
  hasBall() { return this.m.owner === this; }
  inOwnBox() { return P.inBoxAt(this.m.ownGoalX(this.side), this.body.x, this.body.y); }
  canTake() { const s = this.state; return !this.sentOff && !this.ghost && this.cool <= 0 && this.stun <= 0 && s !== 'down' && s !== 'launched' && s !== 'getup' && s !== 'dive' && s !== 'celebrate' && s !== 'off' && s !== 'keeper-dive' && !this.frozen && this.body.z < 10; }
  handPoint() { const B = this.body; return [B.x + Math.cos(this.facing) * 4, B.y + Math.sin(this.facing) * 4, B.z + 12]; }
  idleIntent() { const it = EF.Intent.make(); if (this.order && this.order.to) { const d = H.d2(this.order.to[0], this.order.to[1], this.body.x, this.body.y); if (d > 3) it.move = [(this.order.to[0] - this.body.x) / d, (this.order.to[1] - this.body.y) / d]; if (d < 30) { it.move[0] *= d / 30; it.move[1] *= d / 30; } } return it; }
  setState(s, dur) { this.state = s; this.stT = 0; this.stDur = dur || 0; }
  playKick(name, dur) { this.kickName = name; this.kickT = 0; this.kickDur = dur || (EF.KICKS[name] ? EF.KICKS[name].total : .35); }
  speedMax(it) {
    const T = EF.T, m = this.m, eu = m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0;
    let v = T.runSpeed * (.85 + .3 * this.stat('pace') / 100);
    const tired = this.stamina < 25 && !eu && !m.cheats['stamina' + this.side];
    if (it && it.sprint && this.state === 'run') { v *= tired ? 1.15 : this.hasBall() ? T.sprintMul - .1 : T.sprintMul; }
    if (eu) v *= 1.12;
    if (m.buffs[this.side].hairdryer && m.minute < 15) v *= 1.1;
    if (this.role === 'GK') v *= .95;
    if (!m.hasHuman(this.side) && m.humans.length && m.kind !== 'attract') v *= m.diff.pace || 1;   // difficulty: the CPU's pace
    if (m.surface === 'snow') v *= .94;
    return v;
  }
  /* ---- the step ---- */
  step(dt, it, frozen) {
    const m = this.m, B = this.body, T = EF.T;
    this.cool = Math.max(0, this.cool - dt); this.stun = Math.max(0, this.stun - dt); this.invuln = Math.max(0, this.invuln - dt);
    this.skillCool = Math.max(0, this.skillCool - dt); this.curlT = Math.max(0, this.curlT - dt); this.stT += dt; this.kickT += dt;
    if (this.kickName && this.kickT > this.kickDur) this.kickName = null;
    this.lastIntent = it;
    if (this.ghost && !this.sentOff) return;
    if (this.sentOff) { if (!this.ghost) this.walkOff(dt); return; }
    const s = this.state;
    let want = [0, 0], max = 0;
    if (s === 'run' || s === 'kick' || s === 'setpiece') {
      max = this.speedMax(it); want = it.move;
      if (this.stun > 0) max *= .35;
      if (this.turnSlow > 0) { this.turnSlow -= dt; max *= .7; }
      if (s === 'kick' && this.stT > (this.stDur || .12)) this.setState('run');
      if (this.role === 'GK' && this.keeperMove) max *= this.keeperMove;
      const vx = want[0] * max, vy = want[1] * max, acc = T.accel * (frozen ? .7 : 1);
      B.vx = approach(B.vx, vx, acc * dt); B.vy = approach(B.vy, vy, acc * dt);
      const mv = Math.hypot(want[0], want[1]);
      if (mv > .2) {
        const a = Math.atan2(want[1], want[0]), was = this.facing;
        this.facing = E.approachAng(this.facing, a, dt * (this.hasBall() ? 9 : 14));
        if (this.hasBall() && Math.abs(E.angDiff(was, a)) > 1.75 && !this.turnSlow) this.turnSlow = .2;
      } else if (it.aim && !this.hasBall()) this.facing = E.approachAng(this.facing, Math.atan2(it.aim[1], it.aim[0]), dt * 10);
      if (s !== 'setpiece' && !frozen) this.act(it, dt);
    } else this.stateStep(dt, it);
    // stamina: sprinting drains, rest regains (faster at 34+ Euphoria, with the arm round the shoulder)
    const sp = Math.hypot(B.vx, B.vy), eu = m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0;
    this.sprinting = !!it.sprint && sp > T.runSpeed * .9 && (s === 'run' || s === 'kick');
    if (this.sprinting && !eu && !m.cheats['stamina' + this.side] && m.kind !== 'attract') { this.stamina = Math.max(0, this.stamina - T.staminaDrain * dt); this.restT = 0; }
    else { this.restT = (this.restT || 0) + dt; if (this.restT > .5) this.stamina = Math.min(100, this.stamina + T.staminaRegen * dt * (m.euphoria[this.side] >= 34 ? 1.25 : 1) * (m.buffs[this.side].regen || 1)); }
    this.sweat = this.stamina < 25;
    this.stride += dt * sp / 7;
    B.update(dt, m.pitch.map);
    // the pitch's limits for bodies: the field, the aprons, not the stands
    B.x = clamp(B.x, P.END_W + 20, P.END_E - 20); B.y = clamp(B.y, P.Y0 - 10, P.Y1 + 30);
    this.updateLook(dt, it);
  }
  /** the special states: timers, motion, contacts */
  stateStep(dt, it) {
    const m = this.m, B = this.body, s = this.state, brake = k => { B.vx = approach(B.vx, 0, k * dt); B.vy = approach(B.vy, 0, k * dt); };
    if (s === 'down') { brake(500); this.downT -= dt; if (this.downT <= 0) this.setState('getup', .5); }
    else if (s === 'getup') { brake(600); if (this.stT >= this.stDur) { this.setState('run'); this.tilt = null; this.clip = null; } }
    else if (s === 'launched') {
      this.spinA = (this.spinA || 0) + dt * 15;
      if (B.onGround && this.stT > .2) { this.setState('down'); this.downT = .9 + m.rng() * .5; brake(2000); m.emit('knockdown', { who: this, x: B.x, y: B.y, power: 1 }); }
    }
    else if (s === 'slide') this.slideStep(dt);
    else if (s === 'poke') this.pokeStep(dt);
    else if (s === 'barge') this.bargeStep(dt);
    else if (s === 'skill') this.skillStep(dt, it);
    else if (s === 'air') this.airStep(dt);
    else if (s === 'dive') { const f = Math.exp(-dt * 3.5); B.vx *= f; B.vy *= f; if (this.stT > 1.2) this.setState('getup', .5); }
    else if (s === 'keeper-dive' || s === 'keeper-hold' || s === 'keeper-throw' || s === 'smother') this.keeperState(dt, it);
    else if (s === 'super') this.superHold(dt);
    else if (s === 'stumble') { brake(300); if (this.stT > .4) this.setState('run'); }
    else this.setState('run');
  }
  /** the presentation's view of him (rig state), set each step so replays and clients see the same */
  updateLook(dt, it) {
    const L = this.look, s = this.state, B = this.body;
    L.sprint = this.sprinting; L.hurt = this.stun > 0 || s === 'stumble'; L.air = B.z > 2 && s !== 'keeper-dive' && s !== 'launched' && s !== 'air';
    L.pose = this.pose || (this.role === 'GK' && s === 'run' && H.d(B, this.m.ball) < 220 && !this.hasBall() ? 'guard' : null);
    L.expr = this.expr || (s === 'down' || s === 'launched' || s === 'dive' ? 'wince' : this.charging ? 'shout' : null);
    L.down = s === 'down' ? 1 : s === 'getup' ? Math.max(0, 1 - this.stT / .45) : s === 'dive' && this.stT > .45 ? 1 : 0;
    if (this.clip) this.clip.t += dt * (this.clip.speed || 1);
    L.tilt = this.tilt; L.clip = this.clip; L.proc = this.proc || null;
    L.spin = this.spinT > 0 ? this.spinA : 0;
    if (this.spinT > 0) this.spinT -= dt;
  }
  walkOff(dt) {
    const B = this.body, tx = P.CX - 60, ty = P.Y1 + 34, d = H.d2(tx, ty, B.x, B.y);
    if (d < 6) { this.ghost = true; B.x = -999; B.y = -999; return; }
    B.vx = (tx - B.x) / d * 50; B.vy = (ty - B.y) / d * 50; this.facing = Math.atan2(B.vy, B.vx); B.x += B.vx * dt; B.y += B.vy * dt;
    this.state = 'off'; this.look.pose = null; this.look.expr = 'angry'; this.stride += dt * 7;
  }
  /* ---- the buttons (section 2.1): with the ball and without it ---- */
  act(it, dt) {
    const m = this.m;
    if (it.euphoria) m.triggerEuphoria(this.side, this);
    if (this.role === 'GK' && !this.human) { this.keeperAct && this.keeperAct(it, dt); return; }
    if (this.hasBall()) {
      if (it.shoot.down || (this.charging && !it.shoot.released)) {
        if (!this.charging) { this.charging = true; this.charge = 0; }
        const k = (m.euphoria[this.side] >= 67 ? 1.25 : 1) / EF.T.shotChargeTime;
        this.charge = Math.min(1, this.charge + dt * k);
        if (it.power !== null && it.power !== undefined && this.charge >= it.power) return this.shoot(this.charge, it);
        if (!it.shoot.down) return this.shoot(this.charge, it);
        return;
      }
      if (this.charging) return this.shoot(this.charge, it);
      if (this.cool > 0) return;
      if (it.pass.pressed) return it.sw.down && this.human ? this.passBall(it, 'oneTwo') : this.passBall(it, 'ground');
      if (it.through.pressed) return this.passBall(it, 'through');
      if (it.lob.pressed) return this.lobBall(it);
      if (it.skill.pressed) return this.skillMove(it);
      if (it.dive.pressed) return this.theatrics();
      return;
    }
    this.charging = false; this.charge = 0;
    // the air-ball window: shoot finishes, pass cushions (section 6.5)
    if ((it.shoot.pressed || it.pass.pressed || it.air) && this.canTake() !== undefined) {
      const w = this.airWindow();
      if (w && (it.air || it.shoot.pressed || it.pass.pressed)) return this.airMove(w, it.air ? it.air : it.pass.pressed ? 'cushion' : 'finish', it);
    }
    if (this.cool > 0) return;
    const opp = m.owner && m.owner.side !== this.side, loose = !m.owner;
    if (it.pass.pressed && (opp || loose)) return this.poke();
    if (it.shoot.pressed && (opp || loose)) return this.slide(it);
    if (it.lob.pressed) return this.barge();
    if ((it.through.pressed || it.sw.pressed) && this.human) return m.switchHuman(this.human, it.sw.pressed && this.human.fb === this && false);
    if (it.dive.pressed) return this.theatrics();
  }
  /* ---- passing (section 6.4) ---- */
  /** the receiver for a pass in direction dir: the teammate it points at, within the assist cone */
  receiver(dir, kind) {
    const m = this.m, B = this.body, assist = game.settings.passAssist, cone = (assist === 'off' ? 20 : assist === 'low' ? 35 : EF.T.passAssistDeg) * Math.PI / 180;
    const d0 = Math.atan2(dir[1], dir[0]), backward = Math.cos(d0) * m.dir(this.side) < -.5;
    let best = null, bs = -1e9;
    for (const f of m.side[this.side]) {
      if (f === this || f.sentOff || f.state === 'down' || f.state === 'launched') continue;
      if (f.role === 'GK' && !backward) continue;
      const a = Math.atan2(f.body.y - B.y, f.body.x - B.x), da = Math.abs(E.angDiff(a, d0)); if (da > cone) continue;
      const d = H.d(f.body, B), opp = m.side[1 - this.side].reduce((mn, o) => Math.min(mn, H.d(o.body, f.body)), 999), open = Math.min(1, opp / 40);
      const sc = Math.cos(da) - d / 1200 + .15 * open + (kind === 'through' && f.role === 'FWD' ? .1 : 0);
      if (sc > bs) { bs = sc; best = f; }
    }
    return best;
  }
  pressure() { const B = this.body; return this.m.side[1 - this.side].some(o => !o.sentOff && H.d(o.body, B) < 12); }
  passBall(it, kind) {
    const m = this.m, B = this.body, b = m.ball, T = EF.T;
    const dir = it.aim || (Math.hypot(it.move[0], it.move[1]) > .2 ? it.move : [Math.cos(this.facing), Math.sin(this.facing)]);
    let to = it.target && it.target.side === this.side && it.target !== this ? it.target : this.receiver(dir, kind);
    let tx, ty, sp;
    if (it.aimPoint && !it.target && !to) { tx = it.aimPoint.x; ty = it.aimPoint.y; }
    if (to) {
      const d = H.d(to.body, B);
      if (kind === 'through') {
        const runDir = m.dir(this.side), lead = 50 + m.rng() * 40;
        tx = to.body.x + runDir * lead + to.body.vx * .3; ty = to.body.y + to.body.vy * .4;
        to.order = { kind: 'run', to: [tx, ty], t: 1.6 };
      } else {   // lead him by the ball's real travel time (it slows as it rolls)
        const kf = T.ballFriction * (EF.SURF[m.surface] || EF.SURF.grass).fr, tTo = (dd, v) => { const q = 1 - dd * kf / v; return q > .05 ? -Math.log(q) / kf : dd / v * 2.5; };
        tx = to.body.x; ty = to.body.y;
        for (let i = 0; i < 3; i++) { const dd = H.d2(tx, ty, B.x, B.y); sp = clamp(dd * 1.5 + 90, T.passSpeedMin, T.passSpeedMax); const tt = tTo(dd, sp); tx = to.body.x + to.body.vx * tt; ty = to.body.y + to.body.vy * tt; }
      }
    } else if (tx === undefined) { tx = B.x + dir[0] * 120; ty = B.y + dir[1] * 120; }
    tx = clamp(tx, P.X0 - 20, P.X1 + 20); ty = clamp(ty, P.Y0 + 4, P.Y1 - 4);
    const d = H.d2(tx, ty, B.x, B.y); if (!sp) sp = clamp(d * 1.5 + 90, T.passSpeedMin, T.passSpeedMax) * (kind === 'through' ? 1.05 : 1);
    let a = Math.atan2(ty - B.y, tx - B.x);
    const sig = (100 - this.stat('pass')) / 100 * .06 * (this.pressure() ? 2 : 1); a += H.gauss(m.rng) * sig;
    b.kick(Math.cos(a) * sp, Math.sin(a) * sp, 0, { who: this, pass: { from: this, to, kind: kind === 'oneTwo' ? 'oneTwo' : kind, oneTwo: kind === 'oneTwo' } });
    this.facing = a; this.playKick('pass'); this.setState('kick', .12);
    m.stats.passes[this.side]++;
    if (kind === 'oneTwo' && to) { to.order = { kind: 'oneTwo', back: this, t: 2.5 }; this.order = { kind: 'run', to: [B.x + m.dir(this.side) * 110, B.y], t: 1.2 }; }
    m.emit('pass', { who: this, to, kind });
    this.useAction(kind === 'through' ? 'through' : 'pass');
  }
  lobBall(it) {
    const m = this.m, B = this.body, b = m.ball, gx = m.goalX(this.side), dg = H.d2(gx, P.CY, B.x, B.y), k = m.keeper(1 - this.side);
    // a chip over the keeper when he's off his line
    if (dg < 160 && k && Math.abs(k.body.x - gx) > 24 && !it.target) {
      const tx = gx - m.dir(this.side) * 4, ty = clamp(P.CY + (it.move[1] || 0) * 20, P.CY - P.GH + 8, P.CY + P.GH - 8);
      const v = E.arc({ x: B.x, y: B.y, z: 0 }, { x: tx, y: ty, z: P.BAR - 8 }, EF.T.ballGravity, { apex: 45 });
      b.kick(v.vx, v.vy, v.vz, { who: this, shot: { side: this.side, power: .5, chip: true, target: { y: ty, z: P.BAR - 8 } } });
      this.playKick('chip'); this.setState('kick', .15); m.stats.shots[this.side]++; m.emit('shot', { who: this, power: .5, chip: true, x: B.x, y: B.y }); this.useAction('lob'); return;
    }
    const wide = Math.abs(B.y - P.CY) > 150 && this.m.u(this.side, B.x) > .7;
    const dir = it.aim || (Math.hypot(it.move[0], it.move[1]) > .2 ? it.move : [Math.cos(this.facing), Math.sin(this.facing)]);
    let to = it.target && it.target.side === this.side ? it.target : null, tx, ty, kind = 'lob';
    if (!to && wide && !it.aimPoint) {   // a cross: to the penalty spot area, or the teammate nearest it
      kind = 'cross'; const spot = { x: gx - m.dir(this.side) * (P.SPOT + 10), y: P.CY };
      to = m.side[this.side].filter(f => f !== this && f.role !== 'GK' && !f.sentOff).sort((a2, c) => H.d(a2.body, spot) - H.d(c.body, spot))[0] || null;
      tx = spot.x + (to ? (to.body.x - spot.x) * .5 : 0); ty = spot.y + (to ? (to.body.y - spot.y) * .5 : 0);
    } else if (it.aimPoint && !to) { tx = it.aimPoint.x; ty = it.aimPoint.y; }
    else { to = to || this.receiver(dir, 'lob'); if (to) { const lead = .55; tx = to.body.x + to.body.vx * lead; ty = to.body.y + to.body.vy * lead; } else { tx = B.x + dir[0] * 160; ty = B.y + dir[1] * 160; } }
    tx = clamp(tx, P.X0 - 10, P.X1 + 10); ty = clamp(ty, P.Y0 + 6, P.Y1 - 6);
    const d = H.d2(tx, ty, B.x, B.y), sig = (100 - this.stat('pass')) / 100 * 18;
    tx += H.gauss(m.rng) * sig; ty += H.gauss(m.rng) * sig;
    const v = E.arc({ x: B.x, y: B.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: kind === 'cross' ? 55 : d > 250 ? 55 : 30 });
    b.kick(v.vx, v.vy, v.vz, { who: this, pass: { from: this, to, kind, land: [tx, ty] } });
    if (to) to.order = { kind: 'meet', to: [tx, ty], t: v.t + .4 };
    this.facing = Math.atan2(ty - B.y, tx - B.x); this.playKick('chip'); this.setState('kick', .15);
    m.stats.passes[this.side]++; m.emit('pass', { who: this, to, kind }); if (kind === 'cross') m.emit('cross', { who: this });
    this.useAction('lob');
  }
  /* ---- shooting (section 6.5) ---- */
  shoot(p, it) {
    const m = this.m, B = this.body, b = m.ball, T = EF.T, gx = m.goalX(this.side), k = m.keeper(1 - this.side);
    this.charging = false; this.charge = 0;
    // a super strike: charged to 0.9 in the side's Europhoria
    if (m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0 && !m.superUsed && p >= .9 && !m.pure) return m.superStrike(this, it);
    let ty;
    const ay = it.aim ? it.aim[1] : it.move[1];
    if (it.aimPoint) ty = clamp(it.aimPoint.y, P.CY - P.GH + 5, P.CY + P.GH - 5);
    else if (Math.abs(ay) > .25) ty = P.CY + clamp(ay, -1, 1) * (P.GH - 6);
    else if (game.settings.shotAssist !== false && k) ty = P.CY + (k.body.y > P.CY ? -1 : 1) * (P.GH - 9);
    else ty = P.CY + (m.rng() - .5) * 20;
    const screamer = p >= .78 && p <= .9 && !m.pure, speed = (180 + p * (T.shotSpeedMax - 180)) * (screamer ? 1.15 : 1);
    let tz = 3 + p * 22 + (it.lift || 0); if (p > .95 && m.rng() < .5) tz += 26;
    const d = H.d2(gx, ty, B.x, B.y); let a = Math.atan2(ty - B.y, gx - B.x);
    const across = Math.abs(E.angDiff(a, this.facing)) > 1.75;
    const cpu = !this.human || this.human.cpu, sig = ((100 - this.stat('shoot')) / 100 * .08 + (this.pressure() ? .04 : 0) + (across ? .05 : 0)) * (cpu && !m.hasHuman(this.side) ? m.diff.shotErr || 1 : 1);
    a += H.gauss(m.rng) * sig; tz = Math.max(1, tz + H.gauss(m.rng) * sig * 60);
    const t = d / speed, g = T.ballGravity, vz = Math.max(10, (tz + .5 * g * t * t) / t);
    b.kick(Math.cos(a) * speed, Math.sin(a) * speed, Math.min(vz, 170), { who: this, shot: { side: this.side, power: p, target: { y: ty, z: tz }, screamer }, screamer });
    this.facing = a; this.curlT = .4; this.playKick(p > .7 ? 'shotHard' : 'shot'); this.setState('kick', .18);
    m.stats.shots[this.side]++; if (this.human) this.human.stats.Shots++;
    m.emit('shot', { who: this, power: p, screamer, target: { y: ty, z: tz }, x: B.x, y: B.y, speed });
    this.useAction('shoot');
  }
  /** aftertouch: the stick across the ball's path just after a shot curls it */
  aftertouch(stick, dt) {
    const b = this.m.ball; if (this.curlT <= 0 || this.m.owner || b.superPath || this.m.lastKick !== this) return;
    const sp = Math.hypot(b.vx, b.vy) || 1, across = (stick[0] * -b.vy + stick[1] * b.vx) / sp;
    if (Math.abs(across) > .3) { b.spin = clamp(b.spin + across * EF.T.curlStrength * dt, -1.6, 1.6); if (!this._curled) { this._curled = true; this.m.emit('curl', { who: this }); } }
    if (this.curlT <= dt) this._curled = false;
  }
  /* ---- air moves: headers, volleys, bicycle kicks, diving headers (section 6.5) ---- */
  airWindow() {
    const m = this.m, b = m.ball; if (m.owner || b.superPath || b.held) return null;
    const B = this.body;
    for (let t = 0; t <= .6; t += 1 / 30) {
      const p = b.predict(t), d = H.d2(p.x, p.y, B.x, B.y);
      if (p.z >= 4 && p.z <= 40 && d <= 7 + 150 * t) return { t, x: p.x, y: p.y, z: p.z, d };
    }
    return null;
  }
  airMove(w, intent, it) {
    const m = this.m, B = this.body, gx = m.goalX(this.side), toGoal = Math.atan2(P.CY - B.y, gx - B.x);
    const facingGoal = Math.abs(E.angDiff(this.facing, toGoal)) < 1.92, sprint = it.sprint;
    let kind;
    if (w.z > 22) kind = facingGoal || intent === 'cushion' ? 'header' : 'bicycle';
    else if (w.z >= 8) kind = 'volley';
    else kind = sprint ? 'divingHeader' : 'volley';
    if (w.z < 14 && w.z >= 4 && sprint && intent === 'finish' && m.rng() < .5 && kind !== 'volley') kind = 'divingHeader';
    this.air = { kind, intent, tc: Math.max(.08, w.t), x: w.x, y: w.y, z: w.z, done: false, sx: B.x, sy: B.y, aim: it.aimPoint, ay: it.aim ? it.aim[1] : it.move[1] };
    this.setState('air', this.air.tc + .55);
    if (kind === 'bicycle') { m.slow(.35, .55); this.facing = toGoal + Math.PI; }
    else if (kind !== 'divingHeader') this.facing = Math.atan2(w.y - B.y, w.x - B.x) * .3 + toGoal * .7;
    m.emit('air', { who: this, kind });
    this.useAction('air');
  }
  airStep(dt) {
    const m = this.m, B = this.body, A = this.air, b = m.ball; if (!A) { this.setState('run'); return; }
    const tLeft = A.tc - this.stT;
    if (!A.done) {
      const d = H.d2(A.x, A.y, B.x, B.y), need = tLeft > .02 ? Math.min(240, d / tLeft) : 0, a = Math.atan2(A.y - B.y, A.x - B.x);
      B.vx = Math.cos(a) * need; B.vy = Math.sin(a) * need;
      if (A.kind === 'header' && A.z > 28 && B.onGround && tLeft < .3) B.vz = 150;
      if (A.kind === 'divingHeader') { this.tilt = { axis: 'right', angle: clamp(this.stT / A.tc, 0, 1) * 1.3, pivot: 'hips', lift: 6 }; this.facing = a; }
      if (A.kind === 'bicycle') this.tilt = { axis: 'right', angle: -clamp(this.stT / A.tc, 0, 1) * 2.4, pivot: 'hips', lift: 4 + 10 * Math.sin(clamp(this.stT / A.tc, 0, 1) * Math.PI / 2) };
      if (A.kind === 'header') this.tilt = { axis: 'right', angle: .35 * Math.sin(clamp(this.stT / A.tc, 0, 1.4) * Math.PI), pivot: 'feet' };
      if (tLeft <= 0) {
        A.done = true;
        const dd = Math.hypot(b.x - B.x, b.y - B.y), dz = Math.abs(b.z - (A.kind === 'header' ? B.z + 26 : A.kind === 'bicycle' ? 22 : A.kind === 'divingHeader' ? 8 : 12));
        if (dd < 14 && dz < 20 && !m.owner && !b.superPath) this.airStrike(A, dd + dz * .3);
        else m.emit('airMiss', { who: this, kind: A.kind });
        if (A.kind === 'bicycle' || A.kind === 'divingHeader') { this.setState('down'); this.downT = .7; this.clip = null; }
      }
    } else {
      const f = Math.exp(-dt * 6); B.vx *= f; B.vy *= f;
      if (this.stT > this.stDur) { this.setState('run'); this.tilt = null; }
    }
  }
  airStrike(A, miss) {
    const m = this.m, B = this.body, b = m.ball, gx = m.goalX(this.side), k = m.keeper(1 - this.side);
    const q = clamp(1 - miss / 20, .2, 1), atGoal = A.intent === 'finish' && Math.abs(gx - B.x) < 330;
    let speed = { header: 240, bicycle: 420, volley: 340, divingHeader: 290 }[A.kind] * (.85 + .25 * q), tx, ty, tz;
    if (atGoal) {
      tx = gx; ty = A.aim ? clamp(A.aim.y, P.CY - P.GH + 5, P.CY + P.GH - 5) : Math.abs(A.ay) > .25 ? P.CY + clamp(A.ay, -1, 1) * (P.GH - 6) : k ? P.CY + (k.body.y > P.CY ? -1 : 1) * (P.GH - 10) : P.CY;
      tz = A.kind === 'header' ? 6 : A.kind === 'bicycle' ? 18 : 10;
      const err = (1 - q) * .12 + (100 - this.stat('shoot')) / 100 * .06, a = Math.atan2(ty - B.y, tx - B.x) + H.gauss(m.rng) * err;
      const d = H.d2(tx, ty, B.x, B.y), t = d / speed, g = EF.T.ballGravity, vz = clamp((tz - b.z + .5 * g * t * t) / t, -120, 160);
      b.kick(Math.cos(a) * speed, Math.sin(a) * speed, vz, { who: this, shot: { side: this.side, power: .8, air: A.kind, target: { y: ty, z: tz } } });
      m.stats.shots[this.side]++; if (this.human) this.human.stats.Shots++;
      m.emit('shot', { who: this, power: .8, air: A.kind, x: B.x, y: B.y, speed });
    } else {   // a cushioned header or volley to a teammate, or a clearance up the pitch
      const mate = this.receiver([m.dir(this.side), 0], 'lob');
      if (mate && A.intent === 'cushion') { const v = E.arc({ x: b.x, y: b.y, z: b.z }, { x: mate.body.x, y: mate.body.y, z: 0 }, EF.T.ballGravity, { apex: Math.max(b.z + 8, 20) }); b.kick(v.vx, v.vy, v.vz, { who: this, pass: { from: this, to: mate, kind: 'air' } }); }
      else { const a = (m.dir(this.side) > 0 ? 0 : Math.PI) + (m.rng() - .5) * 1.2; b.kick(Math.cos(a) * 260, Math.sin(a) * 260, 140, { who: this, pass: { from: this, to: null, kind: 'clear' } }); }
    }
    this.cool = .3; this.playKick(A.kind === 'volley' ? 'volley' : A.kind === 'bicycle' ? 'bicycle' : 'header');
    if (A.kind === 'header' || A.kind === 'divingHeader') m.stats.headers[this.side]++;
    m.emit(A.kind === 'divingHeader' ? 'header' : A.kind, { who: this, atGoal, quality: q, x: b.x, y: b.y, z: b.z });
  }
  /* ---- skill moves (section 6.6) ---- */
  skillMove(it) {
    const m = this.m; if (this.skillCool > 0 || this.state !== 'run') { if (this.state === 'skill' && this.skill && this.stT < .3 && this.skill.kind !== 'rainbow' && this.skill.kind !== 'spin') this.startSkill('rainbow'); return; }
    const mv = Math.hypot(it.move[0], it.move[1]) > .3 ? Math.atan2(it.move[1], it.move[0]) : null, rel = mv === null ? null : E.angDiff(mv, this.facing);
    const front = this.defenderAhead(16, .5);
    let kind;
    if (rel === null) kind = front ? 'nutmeg' : 'stepover';
    else if (Math.abs(rel) > 2.36) kind = 'spin';
    else if (Math.abs(rel) < .7) kind = front ? 'nutmeg' : this.defenderAhead(40, .9) ? 'stepover' : 'knockon';
    else kind = 'stepover';
    this.startSkill(kind, rel !== null && rel < 0 ? -1 : 1);
  }
  defenderAhead(range, cone) { const B = this.body; return this.m.side[1 - this.side].find(o => !o.sentOff && o.state !== 'down' && H.d(o.body, B) < range && Math.abs(E.angDiff(H.ang(B, o.body), this.facing)) < cone) || null; }
  startSkill(kind, sideSign = 1) {
    const m = this.m; this.skill = { kind, sign: sideSign, resolved: false, victim: null };
    const dur = { stepover: .35, nutmeg: .4, spin: .45, rainbow: .5, knockon: .3 }[kind];
    this.setState('skill', dur); this.skillCool = .6; this.stamina = Math.max(0, this.stamina - 8);
    if (kind === 'spin') { this.spinT = .45; this.spinA = 0; this.invuln = .45; }
    this.playKick(kind === 'rainbow' ? 'rainbow' : kind === 'stepover' ? 'stepover' : 'touch');
    m.emit('skillStart', { who: this, kind });
    this.useAction('skill');
  }
  skillStep(dt, it) {
    const m = this.m, B = this.body, S = this.skill, b = m.ball, f = this.facing; if (!S) { this.setState('run'); return; }
    const u = this.stT / this.stDur, sp = this.speedMax(it) * .7;
    if (S.kind === 'spin') { this.spinA = -u * TAU; B.vx = Math.cos(f) * sp * .5; B.vy = Math.sin(f) * sp * .5; }
    else if (S.kind === 'stepover') { const side = f + S.sign * Math.PI / 2; B.vx = Math.cos(f) * sp * .6 + (u > .6 ? Math.cos(side) * 60 : 0); B.vy = Math.sin(f) * sp * .6 + (u > .6 ? Math.sin(side) * 60 : 0); }
    else { B.vx = Math.cos(f) * sp; B.vy = Math.sin(f) * sp; }
    if (!S.resolved && u > .5) {
      S.resolved = true; const R = m.rng;
      if (S.kind === 'stepover') {
        const d = this.defenderAhead(22, .8);
        if (d) { const ch = clamp(.35 + .5 * (this.stat('skill') - d.stat('tackle')) / 100, .15, .9); if (R() < ch) { d.stumble(.4, S.sign); this.burst = 12; m.addEuphoria(this.side, 8, 'skill'); m.stats.skills[this.side]++; m.emit('skill', { who: this, kind: 'stepover', victim: d }); } else m.emit('skillFail', { who: this, kind: 'stepover' }); }
        else { m.addEuphoria(this.side, 3, 'skill'); m.emit('skill', { who: this, kind: 'stepover' }); }
      } else if (S.kind === 'nutmeg') {
        const d = this.defenderAhead(20, .6);
        if (d && this.hasBall()) {
          if (R() < .45 + .4 * this.stat('skill') / 100) {   // through the legs: the ball rolls past him, you go round
            m.setOwner(null); b.x = d.body.x + Math.cos(f) * 2; b.y = d.body.y + Math.sin(f) * 2; b.vx = Math.cos(f) * 120; b.vy = Math.sin(f) * 120; b.vz = 0;
            d.stumble(.6, 1); d.cool = .6; this.order = { kind: 'run', to: [d.body.x + Math.cos(f) * 30, d.body.y + Math.sin(f) * 30 + 14 * S.sign], t: .6 };
            m.addEuphoria(this.side, 12, 'nutmeg'); m.stats.nutmegs[this.side]++; m.stats.skills[this.side]++; m.emit('nutmeg', { who: this, victim: d }); m.emit('skill', { who: this, kind: 'nutmeg', victim: d });
          } else { m.setOwner(d, 'tackle'); this.stumble(.4, 1); m.emit('skillFail', { who: this, kind: 'nutmeg', victim: d }); }
        } else m.emit('skill', { who: this, kind: 'nutmeg' });
      } else if (S.kind === 'spin') { m.addEuphoria(this.side, 6, 'skill'); m.stats.skills[this.side]++; m.emit('skill', { who: this, kind: 'spin' }); }
      else if (S.kind === 'rainbow') {
        if (this.hasBall()) {
          const d = this.defenderAhead(24, .9); m.setOwner(null); b.kick(Math.cos(f) * 75, Math.sin(f) * 75, 110, { who: this, cool: .25 });
          if (d) { d.stumble(.6, 1); d.cool = .6; }
          m.addEuphoria(this.side, 12, 'rainbow'); m.stats.skills[this.side]++; m.emit('rainbow', { who: this, victim: d }); m.emit('skill', { who: this, kind: 'rainbow', victim: d });
        }
      } else if (S.kind === 'knockon') {
        if (this.hasBall()) { m.setOwner(null); b.kick(Math.cos(f) * 130, Math.sin(f) * 130, 0, { who: this, cool: .2 }); this.order = { kind: 'chase', t: .8 }; m.addEuphoria(this.side, 2, 'skill'); m.emit('skill', { who: this, kind: 'knockon' }); }
      }
    }
    if (this.stT >= this.stDur) {
      if (this.burst) { const side = f + S.sign * Math.PI / 2; B.x += Math.cos(side) * this.burst * .6; B.y += Math.sin(side) * this.burst * .6; this.burst = 0; }
      this.skill = null; this.spinT = 0; this.setState('run');
    }
  }
  stumble(t, sign) { this.setState('stumble', t); this.stun = t; this.clip = { name: sign < 0 ? 'Dodge_left' : 'Dodge_right', t: 0, w: .7 }; this.m.emit('stumble', { who: this }); }
  /* ---- defending (section 6.7) ---- */
  poke() { this.setState('poke', .25); this.pokeHit = false; this.playKick('poke'); this.useAction('tackle'); this.m.emit('poke', { who: this }); }
  pokeStep(dt) {
    const m = this.m, B = this.body, b = m.ball, reach = EF.T.tackleReach * (m.europhoria && m.europhoria.side === this.side ? 1.25 : 1);
    B.vx = approach(B.vx, Math.cos(this.facing) * 40, 900 * dt); B.vy = approach(B.vy, Math.sin(this.facing) * 40, 900 * dt);
    if (!this.pokeHit && this.stT > .08) {
      this.pokeHit = true;
      const toe = [B.x + Math.cos(this.facing) * 6, B.y + Math.sin(this.facing) * 6], c = m.owner;
      const db = H.d2(b.x, b.y, toe[0], toe[1]);
      if (db < reach && b.z < 8 && (!c || (c.side !== this.side && c.invuln <= 0))) {
        if (c) { c.contactT = m.t; c.contactBy = this; c.cool = .35; }
        m.setOwner(null); const a = this.facing + (m.rng() - .5) * .8; b.kick(Math.cos(a) * 90, Math.sin(a) * 90, 10, { who: this, cool: .05 });
        m.stats.tackles[this.side]++; if (this.human) this.human.stats.Tackles++;
        m.emit('tackleWon', { who: this, victim: c, kind: 'poke' }); if (c) m.addEuphoria(this.side, 6, 'tackle');
      } else if (c && c.side !== this.side && H.d(c.body, { x: toe[0], y: toe[1] }) < 9) {
        c.contactT = m.t; c.contactBy = this; m.ref.judge(this, c, { kind: 'poke', speed: Math.hypot(B.vx, B.vy) + 60 });
      } else { this.stun = .3; m.emit('tackleFailed', { who: this, kind: 'poke' }); }
    }
    if (this.stT >= this.stDur) this.setState('run');
  }
  slide(it) {
    const m = this.m, B = this.body, wet = m.surface === 'wet' ? 1.25 : 1, sp = EF.T.slideSpeed * wet;
    const dir = it && Math.hypot(it.move[0], it.move[1]) > .3 ? Math.atan2(it.move[1], it.move[0]) : this.facing;
    this.facing = dir; B.vx = Math.cos(dir) * sp; B.vy = Math.sin(dir) * sp;
    this.setState('slide', .45 * wet + .6); this.slideHit = new Set(); this.slideBall = false;
    this.clip = { name: 'Slide_Loop', t: 0, w: 1 };
    m.emit('slide', { who: this }); this.useAction('slide');
  }
  slideStep(dt) {
    const m = this.m, B = this.body, b = m.ball, moving = this.stT < this.stDur - .6;
    const f = Math.exp(-3 * dt); B.vx *= f; B.vy *= f;
    if (!moving) { B.vx = approach(B.vx, 0, 400 * dt); B.vy = approach(B.vy, 0, 400 * dt); }
    if (moving) {
      // the capsule along the feet: ball first is fair; man first is a foul (and he's launched)
      const fx = B.x + Math.cos(this.facing) * 12, fy = B.y + Math.sin(this.facing) * 12, seg = { x: fx, y: fy };
      const ballOwned = m.owner && m.owner.side !== this.side;
      if (!this.slideBall && b.z < 8 && (!m.owner || ballOwned) && H.segDist(b, B, seg) < 4 + b.r && (!m.owner || m.owner.invuln <= 0)) {
        this.slideBall = true; const victim = m.owner;
        if (victim) { victim.contactT = m.t; victim.contactBy = this; }
        m.setOwner(null); b.kick(Math.cos(this.facing) * 150, Math.sin(this.facing) * 150, 20, { who: this, cool: .2 });
        m.stats.tackles[this.side]++; if (this.human) this.human.stats.Tackles++;
        m.emit('tackleWon', { who: this, victim, kind: 'slide' }); m.addEuphoria(this.side, victim ? 8 : 4, 'tackle');
        if (victim && H.d(victim.body, B) < 10 && m.rng() < .5) victim.knock(this.facing, .6, 'slide');
      }
      for (const o of m.side[1 - this.side]) {
        if (o.sentOff || this.slideHit.has(o) || o.state === 'down' || o.state === 'launched' || o.invuln > 0) continue;
        if (H.segDist(o.body, B, seg) < 4 + o.body.r && Math.abs(o.body.z) < 6) {
          this.slideHit.add(o); o.contactT = m.t; o.contactBy = this;
          const late = !this.slideBall;
          if (late) { m.ref.judge(this, o, { kind: 'slide', speed: Math.hypot(B.vx, B.vy), late: o.lastTouchT < m.t - .4 && !o.hasBall() }); o.launch(this.facing); }
        }
      }
    }
    if (this.stT >= this.stDur) { this.setState('run'); this.clip = null; }
  }
  barge() { const B = this.body; this.setState('barge', .3); B.vx += Math.cos(this.facing) * 60; B.vy += Math.sin(this.facing) * 60; this.bargeHit = false; this.useAction('barge'); this.m.emit('barge', { who: this }); }
  bargeStep(dt) {
    const m = this.m, B = this.body; B.vx = approach(B.vx, 0, 200 * dt); B.vy = approach(B.vy, 0, 200 * dt);
    if (!this.bargeHit && this.stT > .08) {
      const sh = { x: B.x + Math.cos(this.facing) * 5, y: B.y + Math.sin(this.facing) * 5 };
      for (const o of m.side[1 - this.side]) {
        if (o.sentOff || o.state === 'down' || H.d(o.body, sh) > 7 + o.body.r) continue;
        this.bargeHit = true; o.contactT = m.t; o.contactBy = this;
        const behind = Math.abs(E.angDiff(H.ang(o.body, B), o.facing)) > 2.1;
        if (behind) m.ref.judge(this, o, { kind: 'barge', speed: Math.hypot(B.vx, B.vy) + 40, fromBehind: true });
        const R = m.rng;
        if (this.stat('weight') + R() * 30 > o.stat('weight') + R() * 30 && o.invuln <= 0) {
          if (o.hasBall()) { m.setOwner(null); const a = H.ang(B, o.body); m.ball.kick(Math.cos(a) * 60, Math.sin(a) * 60, 10, { who: this, cool: .1 }); m.emit('tackleWon', { who: this, victim: o, kind: 'barge' }); m.stats.tackles[this.side]++; m.addEuphoria(this.side, 6, 'tackle'); if (this.human) this.human.stats.Tackles++; }
          if (this.stat('weight') > 85 && R() < .35) o.knock(H.ang(B, o.body), .7, 'barge'); else o.stumble(.4, R() < .5 ? -1 : 1);
          o.body.vx += Math.cos(this.facing) * 80; o.body.vy += Math.sin(this.facing) * 80;
        } else { B.vx = -Math.cos(this.facing) * 60; B.vy = -Math.sin(this.facing) * 60; this.stun = .3; m.emit('bargeBounce', { who: this, victim: o }); }
        m.emit('bargeHit', { who: this, victim: o }); break;
      }
    }
    if (this.stT >= this.stDur) this.setState('run');
  }
  /** knocked down: power 1+ launches him (a cartwheel through the air), less puts him down */
  knock(angle, power, cause) {
    const m = this.m; if (this.sentOff || this.state === 'down' || this.state === 'launched') return;
    if (m.owner === this) m.setOwner(null);
    if (power >= 1) return this.launch(angle);
    this.setState('down'); this.downT = .8 + power * .6; this.body.vx = Math.cos(angle) * 60 * power; this.body.vy = Math.sin(angle) * 60 * power;
    this.clip = null; this.charging = false; m.emit('knockdown', { who: this, cause, power, x: this.body.x, y: this.body.y });
  }
  launch(angle) {
    const m = this.m; if (m.owner === this) m.setOwner(null);
    const B = this.body; B.vz = 120; B.onGround = false; B.vx = Math.cos(angle) * 110; B.vy = Math.sin(angle) * 110; this.spinA = 0;
    this.setState('launched'); this.charging = false; this.tilt = { axis: 'forward', angle: 0, pivot: 'hips' }; this.clip = null;
    m.emit('launched', { who: this, x: B.x, y: B.y });
  }
  /** a collision at speed (section 6.7): the slower one goes down */
  /* ---- theatrics (section 6.10) ---- */
  theatrics() {
    const m = this.m; if (this.state !== 'run' && this.state !== 'kick') return;
    if (m.owner === this) m.setOwner(null);
    const B = this.body; B.vx = Math.cos(this.facing) * 110; B.vy = Math.sin(this.facing) * 110;
    this.setState('dive', 1.2); this.tilt = { axis: 'right', angle: 0, pivot: 'hips' }; this.charging = false;
    m.ref.judgeDive(this); m.emit('dive', { who: this, x: B.x, y: B.y }); this.useAction('dive');
  }
  /** a human's first uses of each action (the prompts While learning) */
  useAction(a) { if (this.human) this.human.used[a] = (this.human.used[a] || 0) + 1; }
}
EF.Footballer = Footballer;
/* a body-to-body collision at a closing speed over 220 knocks the slower one down */
Match.prototype.collide = function (a, b, cs) {
  if (a.invuln > 0 || b.invuln > 0 || this.mode !== 'play') return;
  const slow = Math.hypot(a.body.vx, a.body.vy) < Math.hypot(b.body.vx, b.body.vy) ? a : b, fast = slow === a ? b : a;
  if (slow.side === fast.side || slow.state !== 'run') return;
  slow.contactT = this.t; slow.contactBy = fast;
  if (cs > 260) { slow.knock(H.ang(fast.body, slow.body), .6, 'collision'); this.ref.judge(fast, slow, { kind: 'collision', speed: cs * .6 }); }
};
/* ==== src/14-keeper.js ==== */
/* GOALKEEPERS (section 6.8): positioning comes from the team brain; here the keeper reads shots after his reaction
 * time, dives, catches, parries and tips, claims crosses, smothers at a forward's feet and gives the ball out. */
const _emit0 = Match.prototype.emit;
Match.prototype.emit = function (type, ev = {}) { if (type === 'shot') this.keeperRead(ev); return _emit0.call(this, type, ev); };
/** a shot is struck: the keeper it is aimed at reads it (his reaction time, by his keep stat and difficulty) */
Match.prototype.keeperRead = function (ev) {
  const s = ev.side !== undefined ? ev.side : ev.who && ev.who.side, k = this.keeper(1 - s); if (!k || k.state === 'down') return;
  const cpu = !this.hasHuman(1 - s) || this.kind === 'attract', base = cpu ? this.diff.keeper : EF.T.keeperReaction;
  const jit = 1 + (this.rng() - .5) * .8 * (1 - k.stat('keep') / 100);
  k.read = { t: Math.max(.04, base * jit * (ev.screamer ? 1.3 : 1) * (EF.T.keeperReaction / .18)), speed: ev.speed || Math.hypot(this.ball.vx, this.ball.vy), screamer: !!ev.screamer, from: ev.who, chip: !!ev.chip };
  k.save = null;
};
Object.assign(Footballer.prototype, {
  keeperReach() { const m = this.m, eu = m.europhoria && m.europhoria.side === this.side && m.europhoria.t > 0; return EF.T.keeperReach * (eu ? 1.3 : 1) * (this.data.boss ? 1.4 : 1) * (m.cheats['keeper' + this.side] ? 2 : 1); },
  /** the keeper's own decisions each step (he is never a human's in open play) */
  keeperAct(it, dt) {
    const m = this.m, b = m.ball, B = this.body, gx = m.ownGoalX(this.side);
    if (m.owner === this) { if (this.inOwnBox() || this.holding) return this.keeperHold(dt); const it2 = EF.Intent.make(); it2.move = [m.dir(this.side), 0]; return this.lobBall(it2); }
    if (this.read) {
      this.read.t -= dt;
      if (this.read.t <= 0) { const r = this.read; this.read = null; this.keeperDecide(r); }
      return;
    }
    if (m.owner || b.superPath || b.held) {
      // the smother: a forward through on goal, at his feet
      const c = m.owner;
      if (c && c.side !== this.side && H.d(c.body, B) < 13 && P.inBoxAt(gx, c.body.x, c.body.y) && this.cool <= 0) {
        this.setState('smother', .55); this.tilt = { axis: 'right', angle: 0, pivot: 'feet' }; this.facing = H.ang(B, c.body);
        const R = m.rng(); if (R < .35 + .4 * (this.stat('keep') - c.stat('skill')) / 100 + (m.cheats['keeper' + this.side] ? 1 : 0)) { m.setOwner(this, 'smother'); this.holding = true; m.addEuphoria(this.side, 6, 'save'); m.emit('save', { who: this, kind: 'smother', shooter: c }); m.stats.saves[this.side]++; }
        else { this.cool = .8; m.emit('smotherMiss', { who: this }); }
      }
      return;
    }
    // a loose ball in the air over his area: claim it
    if (b.z > 6 && b.z < 36 && P.inBoxAt(gx, b.x, b.y) && H.d(b, B) < 14 && this.cool <= 0) {
      const att = m.side[1 - this.side].some(o => H.d(o.body, b) < H.d(B, b) - 4);
      if (!att || m.rng() < this.stat('keep') / 140) { m.setOwner(this, 'catch'); this.holding = true; this.clip = null; m.emit('catch', { who: this, kind: 'cross' }); m.stats.saves[this.side]++; return; }
    }
    // a shot already flying at goal that he never read (a deflection): read it now
    if (b.shot && b.shot.side !== this.side && !this.save && Math.sign(b.vx) === Math.sign(gx - b.x) && Math.abs(b.vx) > 120 && Math.abs(b.x - gx) < 260) this.read = { t: .12, speed: b.speed(), screamer: b.screamer };
    if (this.save) this.keeperSaveStep(dt);
  },
  /** where the shot meets him, how well he reaches it (q), and so the outcome (section 6.8) */
  keeperDecide(r) {
    const m = this.m, b = m.ball, B = this.body, gx = m.ownGoalX(this.side); if (m.owner || b.superPath) return;
    const c = b.crossing(B.x) || b.crossing(gx); if (!c) return;
    const atLine = b.crossing(gx) || c, onTarget = Math.abs(atLine.y - P.CY) < P.GH + 1 && atLine.z < P.BAR + 1;
    const dy = c.y - B.y, need = Math.max(0, Math.abs(dy) - 6), reach = this.keeperReach() + 12, cover = Math.min(reach, 260 * Math.max(.05, c.t) * 1.15 + 10);
    let q = need <= 4 ? 1 - need / 20 : Math.pow(clamp(1.25 - need / Math.max(1, cover), 0, 1), .7);
    if (c.z > 30) q *= .7; if (r.chip) q *= .55;
    const speed = r.speed, sf = Math.max(.3, 1 - (speed - 200) / 600);
    let Q = q * sf * this.stat('keep') / 100 * (r.screamer ? .75 : 1) * (this.data.boss ? 1.25 : 1) + (m.rng() - .5) * .2;
    if (m.cheats['keeper' + this.side]) Q = 1;
    if (m.cheats['nokeeper' + this.side]) Q = 0;
    let outcome = Q > .7 && speed < 260 ? 'catch' : Q > .35 ? (c.z > 24 || Math.abs(c.y - P.CY) > P.GH - 10 ? 'tip' : 'parry') : 'miss';
    if (this.data.boss && speed < 300 && q > .45) outcome = 'catch';   // the Vault catches anything under 300 he reaches
    if (!onTarget) outcome = Math.abs(atLine.y - P.CY) < P.GH + 14 && q > .5 && m.rng() < .3 ? 'tip' : 'leave';
    this.save = { outcome, at: c.t, t: 0, y: c.y, z: c.z, dy, q: Q };
    if (Math.abs(dy) >= 9 || c.z > 30) {   // a dive: lateral speed to meet it, tilted about his forward axis
      const v = clamp(dy / Math.max(c.t, .12), -260, 260), right = Math.sign(Math.cos(this.facing) * dy || 1);
      B.vx = 0; B.vy = v; this.diveV = v; this.diveSign = right; this.diveHigh = c.z > 18;
      this.setState('keeper-dive', Math.max(.35, c.t) + .5);
      m.emit('keeperDive', { who: this, high: this.diveHigh, dir: Math.sign(dy) });
    }
  },
  keeperSaveStep(dt) {
    const m = this.m, b = m.ball, S = this.save; if (!S) return; S.t += dt;
    if (m.owner || b.superPath) { this.save = null; return; }
    if (S.t < S.at - .01) return;
    const hands = [this.body.x, this.body.y + (this.state === 'keeper-dive' ? Math.sign(S.dy) * 6 : 0)], d = H.d2(b.x, b.y, hands[0], hands[1]);
    this.save = null;
    if (S.outcome === 'miss' || S.outcome === 'leave' || d > 30) { m.emit('keeperBeaten', { who: this }); return; }
    const gx = m.ownGoalX(this.side), out = gx === P.X0 ? 1 : -1, sp = b.speed();
    if (S.outcome === 'catch') {
      m.setOwner(this, 'catch'); this.holding = true; m.stats.saves[this.side]++;
      m.addEuphoria(this.side, b.screamer ? 10 : 6, 'save'); m.emit('save', { who: this, kind: 'catch', shooter: m.lastKick }); m.emit('catch', { who: this, kind: 'shot' });
    } else if (S.outcome === 'parry') {
      const away = Math.sign(b.y - P.CY) || (m.rng() < .5 ? -1 : 1), k = .4 + m.rng() * .2;
      b.vx = out * sp * k * .7; b.vy = away * sp * k * .7; b.vz = 40 + m.rng() * 40; b.spin = 0; b.shot = null; b.pass = null; m.touch(this);
      m.stats.saves[this.side]++; m.addEuphoria(this.side, 6, 'save'); m.emit('save', { who: this, kind: 'parry', shooter: m.lastKick }); m.emit('parry', { who: this });
    } else if (S.outcome === 'tip') {   // over the bar or round the post: a corner
      const high = S.z > 20; b.shot = null; b.pass = null; m.touch(this); m.tipped = this;
      if (high) { b.vz = 160; b.vx = -out * Math.max(60, Math.abs(b.vx) * .5); }
      else { b.vy = (Math.sign(b.y - P.CY) || 1) * 160; b.vx = -out * 80; }
      m.stats.saves[this.side]++; m.addEuphoria(this.side, 6, 'save'); m.emit('save', { who: this, kind: 'tip', shooter: m.lastKick }); m.emit('tip', { who: this });
    }
  },
  /** dives, holding, throws and the smother: the keeper's own states */
  keeperState(dt) {
    const m = this.m, B = this.body, s = this.state;
    if (s === 'keeper-dive') {
      const u = clamp(this.stT / Math.max(.2, this.stDur - .5), 0, 1);
      B.vy = (this.diveV || 0) * (1 - u * .8); B.vx = approach(B.vx, 0, 600 * dt);
      const lift = this.diveHigh ? 14 * Math.sin(Math.min(1, u * 1.2) * Math.PI) : 2 * Math.sin(u * Math.PI);
      this.tilt = { axis: 'forward', angle: this.diveSign * (this.diveHigh ? 1.35 : 1.55) * Math.min(1, u * 2.2), pivot: 'feet', lift };
      this.look.pose = 'cast';
      if (this.save) this.keeperSaveStep(dt);
      if (this.stT >= this.stDur) { this.tilt = { axis: 'forward', angle: this.diveSign * 1.5, pivot: 'feet' }; this.setState('down'); this.downT = .5; this.clip = null; this.afterDive = true; }
    } else if (s === 'smother') {
      const u = clamp(this.stT / this.stDur, 0, 1); this.tilt = { axis: 'right', angle: 1.35 * Math.min(1, u * 2.5), pivot: 'feet', lift: 2 };
      B.vx = Math.cos(this.facing) * 90 * (1 - u); B.vy = Math.sin(this.facing) * 90 * (1 - u);
      if (this.stT >= this.stDur) { this.setState(m.owner === this ? 'run' : 'down', 0); this.downT = .45; this.tilt = null; }
    } else if (s === 'keeper-throw') {
      B.vx = approach(B.vx, 0, 600 * dt); B.vy = approach(B.vy, 0, 600 * dt);
      if (this.stT > .32 && this.throwPending) { const t = this.throwPending; this.throwPending = null; this.holding = false; m.ball.kick(t.vx, t.vy, t.vz, { who: this, pass: { from: this, to: t.to, kind: 'throw' }, cool: .5 }); m.emit('keeperThrow', { who: this, to: t.to }); }
      if (this.stT >= this.stDur) { this.setState('run'); this.clip = null; }
    } else this.setState('run');
    if (s !== 'keeper-dive' && this.save) this.keeperSaveStep(dt);
  },
  /** holding the ball: up to 2 s (the human side may throw with pass or kick long with shoot), then the AI gives it out */
  keeperHold(dt) {
    const m = this.m, B = this.body; this.holding = true; this.holdT = (this.holdT || 0) + dt; this.tilt = null;
    B.vx = approach(B.vx, 0, 500 * dt); B.vy = approach(B.vy, 0, 500 * dt);
    this.facing = E.approachAng(this.facing, m.dir(this.side) > 0 ? 0 : Math.PI, dt * 6);
    const h = m.humans.find(q => q.side === this.side && !q.cpu), wait = h && m.kind !== 'attract' ? 2 : 1.1;
    let how = null, dir = null;
    if (h && h.ctl && this.holdT > .35) { const pr = h.ctl.peek(); if (pr.pass) { how = 'throw'; dir = pr.move; } else if (pr.shoot || pr.lob) { how = 'kick'; dir = pr.move; } }
    if (!how && this.holdT >= wait) how = m.tactic[this.side].gimmick === 'routeone' || m.rng() < .25 ? 'kick' : 'throw';
    if (!how) return;
    this.holdT = 0;
    const mates = m.outfield(this.side), dirA = dir && Math.hypot(dir[0], dir[1]) > .3 ? Math.atan2(dir[1], dir[0]) : null;
    if (how === 'throw') {
      const open = mates.map(f => ({ f, open: Math.min(...m.outfield(1 - this.side).map(o => H.d(o.body, f.body)).concat([200])), d: H.d(f.body, B), a: H.ang(B, f.body) }))
        .filter(o => o.open > 26).sort((a, c) => (dirA !== null ? Math.abs(E.angDiff(a.a, dirA)) * 120 : 0) + a.d - ((dirA !== null ? Math.abs(E.angDiff(c.a, dirA)) * 120 : 0) + c.d));
      const t = open[0] ? open[0].f : mates[0]; if (!t) return;
      const near = H.d(t.body, B) < 120, v = E.arc({ x: B.x, y: B.y, z: 10 }, { x: t.body.x + t.body.vx * .3, y: t.body.y + t.body.vy * .3, z: 0 }, EF.T.ballGravity, near ? { apex: 11 } : { apex: 28 });
      this.throwPending = { vx: v.vx, vy: v.vy, vz: v.vz, to: t }; this.setState('keeper-throw', .7); this.clip = { name: 'OverhandThrow', t: 0, w: 1, mask: 'upper' };
      m.setOwner(null); m.ball.held = true; const hp = this.handPoint(); m.ball.place(hp[0], hp[1], hp[2]); m.ball.held = true;
      setTimeoutBall(m, this, .32);
    } else {
      const fwd = mates.slice().sort((a, c) => m.u(this.side, c.body.x) - m.u(this.side, a.body.x))[0];
      const dist = 300 + m.rng() * 150, a = dirA !== null ? dirA : fwd ? H.ang(B, fwd.body) : (m.dir(this.side) > 0 ? 0 : Math.PI);
      const tx = clamp(B.x + Math.cos(a) * dist, P.X0 + 30, P.X1 - 30), ty = clamp(B.y + Math.sin(a) * dist * .6, P.Y0 + 20, P.Y1 - 20);
      const v = E.arc({ x: B.x, y: B.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 75 });
      this.holding = false; m.setOwner(null); m.ball.place(B.x + Math.cos(a) * 6, B.y + Math.sin(a) * 6, 0);
      m.ball.kick(v.vx, v.vy, v.vz, { who: this, pass: { from: this, to: fwd || null, kind: 'goalkick' }, cool: .5 });
      this.playKick('shotHard'); this.setState('kick', .3); m.emit('keeperKick', { who: this });
    }
  }
});
/** the throw's release waits for the arm: the ball rides in his hand until then */
function setTimeoutBall(m, k) { m.ball.heldBy = k; }
/* ==== src/15-team-ai.js ==== */
/* TEAM AI (section 6.13): one TeamBrain a side. Each step: the phase (attack, defend, transition, loose), formation
 * spots from where the ball is, the pressers and markers; then an Intent for each footballer it runs, the same kind a
 * human's controller gives. The ball carrier decides by utility every aiReaction seconds. */
const ROLE_DEF = {
  DEF: { att: [.14, 0], def: [0, 0], pull: [.45, .55], uRange: [.08, .62] },
  MID: { att: [.12, .06], def: [-.12, -.04], pull: [.55, .45], uRange: [.15, .85] },
  FWD: { att: [.18, 0], def: [-.12, 0], pull: [.5, .6], uRange: [.35, .95] }
};
class TeamBrain {
  constructor(m, s) { this.m = m; this.s = s; this.phase = 'loose'; this.phaseT = 0; this.mem = new Map(); this.pressers = []; this.marks = new Map(); this.lostT = -9; this.scanT = 0; this.had = false; }
  get tac() { return this.m.tactic[this.s]; }
  /** difficulty shapes the CPU's sides; a side with a human plays at Normal around him */
  get diff() { return this.m.hasHuman(this.s) && this.m.kind !== 'attract' ? EF.DIFF.normal : this.m.diff; }
  memOf(f) { let o = this.mem.get(f); if (!o) { o = { decT: 0, plan: null, tackleT: 0, airT: 0 }; this.mem.set(f, o); } return o; }
  update(dt) {
    const m = this.m, s = this.s, own = m.owner, has = own && own.side === s;
    const ph = !own ? 'loose' : has ? 'attack' : 'defend';
    if (this.had && !has && own) this.lostT = m.t;
    this.had = has;
    if (ph !== this.phase) { this.phase = ph; this.phaseT = 0; } else this.phaseT += dt;
    this.scanT -= dt;
    if (this.scanT <= 0) { this.scanT = .2; this.assign(); }
  }
  /** pressers, markers and chasers, a few times a second */
  assign() {
    const m = this.m, s = this.s, out = m.outfield(s).filter(f => f.state !== 'off'), b = m.ball, tac = this.tac;
    this.pressers = []; this.marks.clear(); this.chasers = [];
    if (this.phase === 'defend' && m.owner) {
      const c = m.owner, uB = m.u(s, c.body.x), zone = uB < (tac.press || .5) + .25;
      const swarm = tac.gimmick === 'gegenpress' && m.t - this.lostT < 3 ? 3 : 0;
      const n = Math.max(1, swarm || (zone ? tac.pressers || 1 : 1));
      this.pressers = out.slice().sort((a, b2) => H.d(a.body, c.body) - H.d(b2.body, c.body)).slice(0, n);
      this.pressZone = zone || swarm > 0;
      const opp = m.outfield(1 - s).filter(o => o !== c);
      for (const f of out) {
        if (this.pressers.includes(f)) continue;
        const sp = this.spot(f); let best = null, bd = 1e9;
        for (const o of opp) { const d = H.d2(o.body.x, o.body.y, sp[0], sp[1]); if (d < bd && ![...this.marks.values()].includes(o)) { bd = d; best = o; } }
        if (best && bd < 160) this.marks.set(f, best);
      }
    }
    if (!m.owner) {
      const p = b.predict(.3);
      this.chasers = out.slice().sort((a, c) => H.d2(a.body.x, a.body.y, p.x, p.y) - H.d2(c.body.x, c.body.y, p.x, p.y)).slice(0, 2);
    }
  }
  /** a footballer's formation spot now (section 6.13, step 2) */
  spot(f) {
    const m = this.m, s = this.s, F = m.formation[s], R = F.roles[f.slot] || F.roles[Object.keys(F.roles)[1]], tac = this.tac, b = m.ball;
    if (f.role === 'GK') return [m.ownGoalX(s) + m.dir(s) * 12, P.CY];
    const D = ROLE_DEF[f.role] || ROLE_DEF.MID, base = R.base, side = base[1] < .5 ? -1 : base[1] > .5 ? 1 : 0;
    const att = R.att || [D.att[0], D.att[1] * side], def = R.def || [D.def[0], D.def[1] * side], pull = R.pull || D.pull, ur = R.uRange || D.uRange;
    const attack = this.phase === 'attack', bu = m.u(s, b.x), bv = (b.y - P.Y0) / P.W;
    let u = base[0] + (attack ? att[0] : def[0]) + pull[0] * (bu - .5), v = base[1] + (attack ? att[1] : def[1]) + pull[1] * (bv - .5);
    if (f.role === 'DEF') u += ((tac.line === undefined ? .5 : tac.line) - .5) * .2;
    u = clamp(u, ur[0], ur[1]); v = .5 + (v - .5) * (tac.width || .8);
    if (m.mode === 'kickoff' || (m.setpiece && m.setpiece.kind === 'kickoff')) u = Math.min(u, .47);
    return [m.xOfU(s, u), P.Y0 + clamp(v, .06, .94) * P.W];
  }
  /** the intent for footballer f (not a human's) this step */
  intent(f, dt) {
    const m = this.m, it = EF.Intent.make(), B = f.body, b = m.ball, mem = this.memOf(f);
    const go = (x, y, sprint, slow) => { const d = H.d2(x, y, B.x, B.y); if (d > 2) { const k = slow ? clamp(d / 40, .25, 1) : clamp(d / 14, .2, 1); it.move = [(x - B.x) / d * k, (y - B.y) / d * k]; } it.sprint = !!sprint && d > 40; return d; };
    if (f.state === 'setpiece' || f.frozen) { if (f.order && f.order.to) go(f.order.to[0], f.order.to[1], false, true); return it; }
    if (m.cheats['euphoria' + this.s] || (m.euphoria[this.s] >= 100 && m.owner && m.owner.side === this.s && m.u(this.s, m.owner.body.x) > .5 && m.rng() < dt * 2 && !this.tac.noEuphoria)) it.euphoria = m.euphoria[this.s] >= 100 && !m.europhoria;
    if (f.role === 'GK') return this.keeperIntent(f, it, go);
    // orders: runs after a through ball, meeting a lob, a one-two's return, chasing a knock-on
    const o = f.order;
    if (o) {
      o.t -= dt;
      if (o.t <= 0) f.order = null;
      else if (o.kind === 'oneTwo') { if (m.owner === f && f.ownT > .3) { it.target = o.back; it.pass.pressed = true; f.order = null; return it; } }
      else if (o.kind === 'chase') { if (!m.owner) { go(b.x, b.y, true); return it; } f.order = null; }
      else if (o.to && m.owner !== f) { go(o.to[0], o.to[1], true); if (o.kind === 'meet' && !m.owner) this.airTry(f, it, mem); return it; }
    }
    if (m.owner === f) return this.carrier(f, it, mem, go, dt);
    if (m.mode === 'kickoff' || (m.kickHold > 0 && f.side !== m.kickoffSide)) {
      const sp = this.spot(f); let [tx, ty] = sp;
      if (f.side !== m.kickoffSide) { const cd = H.d2(tx, ty, P.CX, P.CY); if (cd < 70) { tx = P.CX + (tx - P.CX) / (cd || 1) * 70; ty = P.CY + (ty - P.CY) / (cd || 1) * 70; } }
      go(tx, ty, false, true); return it;
    }
    if (!m.owner) {
      if (this.chasers && this.chasers.includes(f) && !b.superPath) {
        const p = b.predict(Math.min(.6, H.d(B, b) / 160)); go(p.x, p.y, true);
        this.airTry(f, it, mem);
        return it;
      }
      const sp = this.spot(f); go(sp[0], sp[1], false, true); return it;
    }
    if (this.phase === 'defend') {
      const c = m.owner;
      // the keeper holds it: everyone stands off 60
      if (c.role === 'GK' && c.holding) { const sp = this.spot(f); const d = H.d2(sp[0], sp[1], c.body.x, c.body.y); if (d < 64) { sp[0] = c.body.x + (sp[0] - c.body.x) / (d || 1) * 64; sp[1] = c.body.y + (sp[1] - c.body.y) / (d || 1) * 64; } go(sp[0], sp[1]); return it; }
      if (this.pressers.includes(f)) return this.press(f, c, it, mem, go, dt);
      const mk = this.marks.get(f);
      if (mk) { const gx = m.ownGoalX(this.s), tx = lerp(mk.body.x, gx, .12), ty = mk.body.y; go(lerp(tx, b.x, .3), lerp(ty, b.y, .3), H.d(B, mk.body) > 60); return it; }
      const sp = this.spot(f); go(sp[0], sp[1], H.d2(sp[0], sp[1], B.x, B.y) > 80); return it;
    }
    // attacking without the ball: spots, and the far forward's run in behind
    let sp = this.spot(f);
    if (f.role === 'FWD' && m.owner && m.u(this.s, m.owner.body.x) > .35) {
      const fwds = m.outfield(this.s).filter(q => q.role === 'FWD' && q !== m.owner);
      const far = fwds.sort((a, c) => H.d(c.body, m.owner.body) - H.d(a.body, m.owner.body))[0];
      if (far === f) { const last = this.lastDefenderU(); sp = [m.xOfU(this.s, clamp(last + .04, .4, .92)), sp[1]]; }
    }
    go(sp[0], sp[1], H.d2(sp[0], sp[1], B.x, B.y) > 70);
    return it;
  }
  lastDefenderU() { const m = this.m; let u = 0; for (const o of m.outfield(1 - this.s)) u = Math.max(u, m.u(this.s, o.body.x)); return u; }
  /** a CPU player meets a ball in the air: a header, a volley, a clearance (section 6.5: CPU players use the same rules) */
  airTry(f, it, mem) {
    const m = this.m; if (m.t - mem.airT < .8) return;
    const w = f.airWindow(); if (!w || w.d > 30) return;
    mem.airT = m.t;
    const nearGoal = m.u(this.s, f.body.x) > .72, own = m.u(this.s, f.body.x) < .4;
    if (this.tac.gimmick === 'routeone' && own) it.air = 'clear';
    else it.air = nearGoal ? 'finish' : own ? 'clear' : 'cushion';
    it.sprint = nearGoal && w.z < 14;
  }
  /** pressing the carrier: close down goal-side, then poke, slide or barge by the tactic's aggression */
  press(f, c, it, mem, go, dt) {
    const m = this.m, B = f.body, gx = m.ownGoalX(this.s), agg = (EF.T.aiAggression / .5) * this.diff.agg * (this.tac.aggr || 1);
    const goalSide = { x: c.body.x + (gx - c.body.x) * .08, y: c.body.y + (P.CY - c.body.y) * .05 };
    const d = H.d(B, c.body);
    if (d > 24) { go(goalSide.x, goalSide.y, true); return it; }
    go(c.body.x + c.body.vx * .15, c.body.y + c.body.vy * .15, d > 14);
    f.facing = E.approachAng(f.facing, H.ang(B, c.body), dt * 10);
    mem.tackleT -= dt; if (mem.tackleT > 0 || f.cool > 0 || m.kickHold > 0) return it;
    const R = m.rng(), behind = Math.abs(E.angDiff(H.ang(c.body, B), c.facing)) > 2.1, temper = f.stat('temper') / 100;
    if (d < EF.T.tackleReach + 6 && R < dt * agg * 3 * (behind ? .5 + temper : 1)) { it.pass.pressed = true; mem.tackleT = .5; }
    else if (d < 30 && R < dt * agg * .8 * (this.pressZone ? 1 : .4) * (1 + (this.tac.foul || .2))) { it.shoot.pressed = true; mem.tackleT = .9; }
    else if (d < 12 && R < dt * agg * .6 && f.stat('weight') > 70) { it.lob.pressed = true; mem.tackleT = .6; }
    return it;
  }
  /** the keeper: on the bisector of the angle to the posts, out to rush a forward through on goal (section 6.8) */
  keeperIntent(f, it, go) {
    const m = this.m, s = this.s, b = m.ball, gx = m.ownGoalX(s), B = f.body;
    if (m.owner === f) return it;
    const c = m.owner, bd = H.d2(b.x, b.y, gx, P.CY);
    if (c && c.side !== s && bd < 130 && P.inBoxAt(gx, c.body.x, c.body.y) && !m.outfield(s).some(d => H.segDist(d.body, c.body, { x: gx, y: P.CY }) < 10 && H.d(d.body, { x: gx, y: P.CY }) < H.d(c.body, { x: gx, y: P.CY }))) {
      go(c.body.x, c.body.y, true); f.keeperMove = 1.1; return it;
    }
    f.keeperMove = 1;
    if (!c && b.speed() < 140 && P.inBoxAt(gx, b.x, b.y) && b.z < 8 && !m.outfield(1 - s).some(o => H.d(o.body, b) < H.d(B, b))) { go(b.x, b.y, true); return it; }
    // on the bisector of the angle to the posts: from the goal centre toward the ball, closer to the line as it nears
    const dist = clamp(8 + (400 - bd) * .06, 6, 36), ax = b.x - gx, ay = b.y - P.CY, al = Math.hypot(ax, ay) || 1, px = gx + ax / al * dist, py = P.CY + ay / al * dist * .9;
    go(px, clamp(py, P.CY - P.GH + 2, P.CY + P.GH - 2), false, true);
    it.aim = [b.x - B.x, b.y - B.y];
    return it;
  }
  /* ---- the ball carrier's decision (section 6.13, step 4) ---- */
  carrier(f, it, mem, go, dt) {
    const m = this.m, s = this.s, B = f.body, tac = this.tac, gx = m.goalX(s), diff = this.diff;
    if (m.setpiece && m.setpiece.taker === f && !m.setpiece.taken) return it;
    const P0 = mem.plan;
    if (P0 && P0.kind === 'shoot') { it.shoot.down = true; it.power = P0.power; it.aimPoint = P0.aim; it.move = P0.move || it.move; return it; }
    mem.decT -= dt;
    if (P0 && P0.kind === 'dribble' && mem.decT > 0) { go(P0.to[0], P0.to[1], P0.sprint); this.avoid(f, it); return it; }
    mem.plan = null;
    const react = EF.T.aiReaction * (diff.react / .25);
    mem.decT = react * (.8 + m.rng() * .4);
    if (f.ownT < .12 && f.order && f.order.kind !== 'oneTwo') return it;
    const opts = this.options(f), noise = (1 - EF.T.aiAccuracy * diff.acc / .8) * .3;
    let best = null, bs = -1;
    for (const o of opts) { const v = o.v + H.gauss(m.rng) * noise; if (v > bs) { bs = v; best = o; } }
    if (!best) return it;
    if (m.kind === 'attract' && m.attractForce) best = m.attractForce(f, opts) || best;
    switch (best.kind) {
      case 'shoot': mem.plan = { kind: 'shoot', power: best.power, aim: best.aim }; it.shoot.down = true; it.power = best.power; it.aimPoint = best.aim; break;
      case 'pass': it.target = best.to; it.pass.pressed = true; break;
      case 'through': it.target = best.to; it.through.pressed = true; break;
      case 'lob': it.target = best.to; it.lob.pressed = true; break;
      case 'cross': it.lob.pressed = true; break;
      case 'skill': it.skill.pressed = true; it.move = best.move; break;
      case 'dive': it.dive.pressed = true; break;
      default: mem.plan = { kind: 'dribble', to: best.to, sprint: best.sprint }; go(best.to[0], best.to[1], best.sprint); this.avoid(f, it);
    }
    return it;
  }
  /** steer a dribbler round the defender in front */
  avoid(f, it) { const d = f.defenderAhead(26, .8); if (!d) return; const a = Math.atan2(it.move[1], it.move[0]), side = E.angDiff(H.ang(f.body, d.body), a) > 0 ? -1 : 1; const na = a + side * .7; it.move = [Math.cos(na), Math.sin(na)]; }
  options(f) {
    const m = this.m, s = this.s, B = f.body, tac = this.tac, gx = m.goalX(s), opp = m.active(1 - s), mates = m.outfield(s).filter(q => q !== f && q.state !== 'down' && q.state !== 'launched');
    const out = [], dg = H.d2(gx, P.CY, B.x, B.y), myU = m.u(s, B.x), k = m.keeper(1 - s), eu = m.europhoria && m.europhoria.side === s && m.europhoria.t > 0;
    const pressed = opp.some(o => H.d(o.body, B) < 18), chain = m.passChain[s];
    // shoot
    const ang = Math.abs(Math.atan2(P.CY - B.y, gx - B.x) - (m.dir(s) > 0 ? 0 : Math.PI)), angF = Math.max(0, Math.cos(Math.min(1.5, ang)));
    const tri = { x: gx, y: P.CY }, blockers = opp.filter(o => o.role !== 'GK' && H.segDist(o.body, B, tri) < 10 && H.d(o.body, tri) < dg).length;
    let sh = clamp(1 - dg / (tac.shootRange || 170), 0, 1) * Math.pow(angF, .6) * (1 - .3 * blockers) * (eu ? 1.5 : 1) * (tac.shootBias || 1);
    if (tac.gimmick === 'keepball' && chain < 4 && dg > 70) sh *= .3;
    if (m.bus && m.bus.side !== s && dg < 200) sh *= .7;
    const corner = k ? P.CY + (k.body.y > P.CY ? -1 : 1) * (P.GH - 10) : P.CY;
    if (sh > 0) out.push({ kind: 'shoot', v: sh * 1.25 + (dg < 90 ? .3 : 0), power: eu && !m.superUsed ? .95 : dg < 90 ? .45 + m.rng() * .2 : .6 + m.rng() * .3, aim: { x: gx, y: corner + (m.rng() - .5) * 12 } });
    // passes
    for (const t of mates) {
      const lane = opp.reduce((mn, o) => Math.min(mn, H.segDist(o.body, B, t.body)), 99), laneClear = clamp((lane - 4) / 20, 0, 1);
      const open = Math.min(1, opp.reduce((mn, o) => Math.min(mn, H.d(o.body, t.body)), 99) / 40), prog = clamp(m.u(s, t.body.x) - myU + .5, 0, 1), d = H.d(t.body, B);
      if (d > 360) continue;
      const short = d < 160, risk = 1 - laneClear;
      let v = laneClear * open * (.4 + .6 * prog) * (short ? (tac.shortBias || .6) + .3 : 1) * (1 - risk * (1 - (tac.passRisk || .4)));
      if (tac.gimmick === 'keepball' && pressed && prog < .5) v *= 2;
      v *= .8 + (pressed ? .35 : 0);
      out.push({ kind: 'pass', to: t, v });
      if (t.role === 'FWD' && m.u(s, t.body.x) > myU && m.u(s, t.body.x) > .5) {
        const behind = this.lastDefenderU(), space = clamp((.95 - behind) * 3, 0, 1);
        out.push({ kind: 'through', to: t, v: space * open * .7 * (1 - (tac.passRisk === undefined ? .4 : 1 - tac.passRisk) * .3) });
      }
      if ((tac.longBall || 0) > .2 && d > 140) out.push({ kind: 'lob', to: t, v: (tac.longBall || .1) * .9 * open * (.5 + prog) * (tac.gimmick === 'routeone' && t.role === 'FWD' ? 1.6 : 1) });
    }
    // a cross from wide in the final third with teammates in the box
    if (Math.abs(B.y - P.CY) > 140 && myU > .7) { const inBox = mates.filter(t => P.inBoxAt(gx, t.body.x, t.body.y)).length; if (inBox) out.push({ kind: 'cross', v: .5 + .2 * inBox + (tac.longBall || 0) * .4 }); }
    // dribble: into space toward goal
    const toGoal = Math.atan2(P.CY - B.y, gx - B.x) * .6 + (m.dir(s) > 0 ? 0 : Math.PI) * .4, ahead = [B.x + Math.cos(toGoal) * 80, B.y + Math.sin(toGoal) * 80];
    const space = opp.reduce((mn, o) => Math.min(mn, H.d2(o.body.x, o.body.y, ahead[0], ahead[1])), 200);
    out.push({ kind: 'dribble', to: [clamp(ahead[0], P.X0 + 10, P.X1 - 10), clamp(ahead[1], P.Y0 + 20, P.Y1 - 20)], sprint: space > 60 && f.stamina > 35, v: clamp(space / 80, 0, 1.2) * (tac.dribble || .4) + .1 });
    // skill: a defender in front
    const dfd = f.defenderAhead(22, .7);
    if (dfd && f.skillCool <= 0) out.push({ kind: 'skill', v: (tac.skill || .3) * f.stat('skill') / 100 * 1.2, move: [Math.cos(f.facing + (m.rng() < .5 ? 1.4 : -1.4)), Math.sin(f.facing + 1.4)] });
    // dive: in the box with a defender close (Lucchetto do it on purpose)
    if (P.inBoxAt(gx, B.x, B.y) && opp.some(o => o.role !== 'GK' && H.d(o.body, B) < 10)) out.push({ kind: 'dive', v: (tac.dive || 0) * f.stat('temper') / 100 * 1.4 });
    return out;
  }
}
EF.TeamBrain = TeamBrain;
/* ==== src/16-rules.js ==== */
/* THE RULES (sections 6.11, 6.12): the match's modes, the clock (game minutes, stoppage time), goals, the ball out of
 * play, half time, full time, golden-goal extra time and the shootout. Set pieces are in 17, the referee in 18. */
Object.assign(Match.prototype, {
  setMode(m) { this.mode = m; this.modeT = 0; },
  /** a kickoff: the kicking side's forwards in the circle, everyone else in their own half */
  startKickoff(s, first) {
    this.kickoffSide = s; if (first) this.firstKick = s;
    this.ball.place(P.CX, P.CY, 0); this.setOwner(null); this.ball.inNet = false; EF.Nets.reset();
    this.startSetpiece('kickoff', s, {});
    if (!first) this.emit('kickoffSetup', { side: s });
  },
  /** the clock: half length real seconds = 45 game minutes; stoppage time; the end of a half */
  clockStep(dt) {
    if (this.cheats.freezeClock) return;
    this.clock += dt;
    const H2 = this.half >= 3 ? 60 : this.halfLen, m = this.minute, base = this.half >= 3 ? 105 : this.half * 45;
    if (this.half < 3 && !this.stoppageShown && m >= base - 1) {
      this.stoppage = clamp(Math.round(this.stopT / 12), 1, 5); this.stoppageShown = true;
      this.emit('stoppage', { minutes: this.stoppage }); this.note('+' + this.stoppage, { sub: 'ADDED TIME', dur: 2 });
    }
    const end = this.half >= 3 ? H2 : H2 * (1 + (this.stoppage || 1) / 45);
    if (this.clock >= end) {
      const danger = this.u(0, this.ball.x) > .67 || this.u(1, this.ball.x) > .67;
      if (!danger || this.clock >= end + 15 || this.half >= 3) this.endHalf();
    }
  },
  endHalf() {
    this.setOwner(null); this.ball.vx *= .2; this.ball.vy *= .2; this.setpiece = null;
    if (this.half === 1) { this.setMode('halftime'); this.emit('whistle', { kind: 'half' }); this.emit('half', { half: 1 }); this.note('HALF TIME', { dur: 3 }); return; }
    const level = this.score[0] === this.score[1];
    const goGolden = level && this.half === 2 && (this.draws === 'cup' || this.draws === 'golden');
    const goPens = level && ((this.half === 2 && this.draws === 'penalties') || (this.half === 3 && (this.draws === 'cup' || this.draws === 'golden')));
    if (goGolden) { this.half = 3; this.clock = 0; this.golden = true; this.stopT = 0; this.emit('whistle', { kind: 'end' }); this.emit('extraTime', {}); this.note('GOLDEN GOAL', { sub: 'EXTRA TIME: THE NEXT GOAL WINS IT', dur: 2.6 }); this.startKickoff(this.firstKick, false); return; }
    if (goPens) { this.emit('whistle', { kind: 'end' }); this.startShootout(false); return; }
    this.fullTime();
  },
  secondHalf() {
    this.half = 2; this.clock = 0; this.stopT = 0; this.stoppage = 0; this.stoppageShown = false;
    this.emit('secondHalf', {}); this.startKickoff(1 - this.firstKick, false);
    if (this.stadium.fog2) this.fogTarget = .7;
    if (this.stadium.night2) this.timeOfDay = 'night';
  },
  fullTime() {
    if (this.mode === 'fulltime' || this.over) return;
    this.setMode('fulltime'); this.setOwner(null); this.setpiece = null;
    this.emit('whistle', { kind: 'full' }); this.emit('fulltime', { score: this.score.slice() }); this.note('FULL TIME', { dur: 3 });
  },
  finish() {
    if (this.over) return;
    const pens = this.shootout ? this.shootout.score.slice() : null;
    const w = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : pens ? (pens[0] > pens[1] ? 0 : 1) : -1;
    const per = this.players.map(f => ({ f, r: f.rating + f.goalsN * 1.5 })).sort((a, b) => b.r - a.r);
    const potm = (per.find(p => w < 0 || p.f.side === w) || per[0]).f;
    this.result = { score: this.score.slice(), pens, winner: w, goals: this.goals.slice(), stats: this.stats, potm, minute: Math.floor(this.minute), teams: this.teams.map(t => t.id), stadium: this.stadium.id, golden: this.golden };
    this.over = true; this.setMode('over');
    this.emit('matchOver', { result: this.result });
    if (this.onEnd) try { this.onEnd(this.result); } catch (e) { game.fail('match end', e); }
  },
  /* ---- the ball out of play, a goal, the crowd (section 6.11) ---- */
  ballRules(b, superArrived) {
    const live = this.mode === 'play' || this.mode === 'kickoff' || (this.mode === 'setpiece' && this.setpiece && this.setpiece.taken);
    if (!live) return;
    const cross = P.crossedGoalLine(b);
    if (cross) {
      b.dead = true;
      const gx = cross < 0 ? P.X0 : P.X1, scorer = this.goalX(0) === gx ? 0 : 1;
      if (superArrived || (Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2)) { b.inNet = true; return this.goalScored(scorer); }
      const defending = 1 - scorer, lt = this.lastTouch;
      this.emit('out', { kind: 'goalline', x: b.x, y: b.y, side: scorer, shot: !!b.shot });
      if (b.shot && b.shot.side === scorer) this.emit('nearMiss', { who: this.lastKick, y: b.y, z: b.z });
      if ((lt && lt.side === defending) || this.tipped) { this.tipped = null; return this.restart('corner', scorer, { gx, y: b.y }); }
      return this.restart('goalkick', defending, { gx });
    }
    if (P.overTouchline(b) || (b.z > 18 && (b.y < P.Y0 - 2 || b.y > P.Y1 + 2))) {
      b.dead = true; const side = this.lastTouch ? 1 - this.lastTouch.side : 0;
      this.emit('crowdBall', { x: b.x, y: b.y, z: b.z, north: b.y < P.CY });
      return this.restart('throwback', side, { x: clamp(b.x, P.X0 + 40, P.X1 - 40), north: b.y < P.CY });
    }
  },
  goalScored(s) {
    const b = this.ball, lt = this.lastTouch, own = lt && lt.side !== s;
    const scorer = own ? lt : (this.lastKick && this.lastKick.side === s ? this.lastKick : lt);
    this.score[s]++; b.dead = true; this.setOwner(null); this.setpiece = null; this.advantage = null;
    const g = { side: s, who: scorer, name: scorer ? scorer.data.name : '?', minute: Math.floor(this.minute) + 1, own, super: !!(b.shot && b.shot.super), kind: b.shot && b.shot.air || (b.shot && b.shot.chip ? 'chip' : b.screamer ? 'screamer' : 'shot'), half: this.half, t: this.t, pen: !!(b.shot && b.shot.pen), freekick: !!(b.shot && b.shot.freekick), corner: this.lastCornerT !== undefined && this.t - this.lastCornerT < 6, bus: !!this.bus && this.bus.side !== s };
    this.goals.push(g); if (scorer && !own) { scorer.goalsN++; scorer.rating += 1; if (scorer.human) scorer.human.stats.Goals++; }
    this.addEuphoria(s, 35, 'goal'); this.addEuphoria(1 - s, -10, 'conceded');
    this.passChain = [0, 0];
    this.setMode('goal'); this.lastGoal = g;
    this.emit(own ? 'ownGoal' : 'goal', { who: scorer, side: s, goal: g, x: b.x, y: b.y });
    this.note(own ? 'OWN GOAL!' : this.golden ? 'GOLDEN GOAL!' : 'GOAL!', { sub: g.name + "  " + g.minute + "'", dur: 2.2 });
    // VAR: a goal scored within 3 s of an unpunished foul by the scoring side, by the referee's taste for it
    const lf = this.lastFoul;
    if (lf && !lf.punished && lf.by === s && this.t - lf.t < 3 && this.rng() < this.ref.data.varHappy) this.varPending = { kind: 'goal', foul: lf, goal: g };
    if (this.golden) this.goldenWin = true;
    if (scorer && !own) this.startCelebration(scorer);
  },
  /** goal -> celebrate -> (VAR) -> replay -> kickoff */
  goalStep(dt) {
    this.stopT += dt;
    if (this.mode === 'goal' && this.modeT > 1.3) { this.setMode('celebrate'); this.emit('celebrateStart', { who: this.celebration && this.celebration.who }); }
    else if (this.mode === 'celebrate') {
      this.celebrationStep(dt);
      if (this.modeT > (this.celebration ? this.celebration.dur + 1.2 : 2.4)) this.afterGoal();
    }
  },
  afterGoal() {
    this.endCelebration();
    if (this.varPending) { const v = this.varPending; this.varPending = null; return this.startVar(v); }
    if (this.wantReplay()) { this.setMode('replay'); this.emit('replayStart', { goal: this.lastGoal }); if (!this.replayHook) this.endReplay(); return; }
    this.resumeAfterGoal();
  },
  wantReplay() { return game.settings.replays !== false && this.kind !== 'session' && this.kind !== 'training' && !this.o.noReplay; },
  endReplay() { if (this.mode !== 'replay') return; this.emit('replayEnd', {}); this.resumeAfterGoal(); },
  resumeAfterGoal() {
    if (this.goldenWin) { this.emit('goldenGoal', { side: this.lastGoal.side }); return this.fullTime(); }
    const g = this.lastGoal, s = g ? 1 - g.side : 0;
    if (this.pendingCards && this.pendingCards.length) { this.queued = { kind: 'kickoff', side: s, info: {} }; return this.startCard(); }
    this.startKickoff(s, false);
  },
  /** a restart: cards wait for it, then VAR for a penalty, then the set piece (section 6.10) */
  restart(kind, side, info) {
    this.setOwner(null); this.advantage = null;
    this.emit('whistle', { kind: kind === 'throwback' ? 'none' : 'short', restart: kind });
    const card = this.pendingCards && this.pendingCards.length;
    this.queued = { kind, side, info };
    if (card) return this.startCard();
    if (kind === 'penalty' && !this.o.noVar && this.rng() < Math.max(.5, this.ref.data.varHappy)) return this.startVar({ kind: 'penalty', foul: info.foul, side });
    this.startSetpiece(kind, side, info);
  },
  continueRestart() { const q = this.queued; this.queued = null; if (!q) return this.setMode('play'); if (q.kind === 'kickoff') return this.startKickoff(q.side, false); if (q.kind === 'freekick-overturn') return this.startSetpiece('freekick', q.side, q.info); this.startSetpiece(q.kind, q.side, q.info); },
  /* ---- the shootout (section 6.12): 5 each, alternating, then sudden death; ends early when one side can't catch up ---- */
  startShootout(only) {
    this.setOwner(null); this.setpiece = null; this.golden = false;
    const order = [0, 1].map(s => this.side[s].filter(f => !f.sentOff).slice().sort((a, b) => (a.role === 'GK') - (b.role === 'GK') || b.stat('shoot') - a.stat('shoot')));
    this.shootout = { kicks: [[], []], score: [0, 0], turn: this.firstKick, order, idx: [0, 0], n: 0, state: 'setup', t: 0, sudden: false, winner: null, only: !!only, kick: null };
    this.setMode('shootout'); this.half = this.half < 3 && !only ? this.half : this.half;
    this.shootGoalX = P.X1;
    this.emit('shootoutStart', {}); this.note('PENALTIES', { sub: only ? 'BEST OF FIVE' : 'IT GOES TO A SHOOTOUT', dur: 2 });
    this.nextShootoutKick();
  },
  nextShootoutKick() {
    const S = this.shootout, s = S.turn, taker = S.order[s][S.idx[s] % S.order[s].length], keeper = this.keeper(1 - s) || this.side[1 - s][0];
    S.idx[s]++; S.state = 'setup'; S.t = 0;
    S.kick = new EF.PenaltyKick(this, taker, keeper, { shootout: true, gx: this.shootGoalX });
  },
  shootoutStep(dt) {
    const S = this.shootout; if (!S || S.winner !== null) { if (S && this.modeT > 2.5 && !this.over) this.endShootout(); return; }
    const K = S.kick; if (!K) return;
    K.update(dt);
    if (K.done) {
      S.t += dt;
      if (S.t < 1.4) return;
      const s = S.turn; S.kicks[s].push(K.scored); if (K.scored) S.score[s]++;
      this.emit('shootoutKick', { side: s, scored: K.scored, who: K.taker, panenka: K.panenka, kind: K.outcome });
      // can either side still catch up?
      const n0 = S.kicks[0].length, n1 = S.kicks[1].length, left0 = Math.max(0, 5 - n0), left1 = Math.max(0, 5 - n1);
      if (!S.sudden) {
        if (S.score[0] + left0 < S.score[1] || S.score[1] + left1 < S.score[0]) S.winner = S.score[0] > S.score[1] ? 0 : 1;
        else if (n0 === 5 && n1 === 5) { if (S.score[0] !== S.score[1]) S.winner = S.score[0] > S.score[1] ? 0 : 1; else { S.sudden = true; this.note('SUDDEN DEATH', { dur: 1.6 }); this.emit('suddenDeath', {}); } }
      } else if (n0 === n1 && S.score[0] !== S.score[1]) S.winner = S.score[0] > S.score[1] ? 0 : 1;
      if (S.winner !== null) { this.modeT = 0; this.emit('shootoutEnd', { winner: S.winner, score: S.score.slice() }); this.note(this.teams[S.winner].short + ' WIN ON PENALTIES', { sub: S.score[0] + ' - ' + S.score[1], dur: 2.6 }); return; }
      S.turn = 1 - S.turn; S.n++; this.nextShootoutKick();
    }
  },
  endShootout() { const S = this.shootout; S.kick = null; this.finish(); }
});
/* ==== src/17-setpieces.js ==== */
/* SET PIECES (section 6.11): each restart runs setup (the players placed) -> aim (a human taker gets up to 6 s, then
 * auto) -> take -> play. Kinds: kickoff, goalkick, corner, freekick, penalty, throwback (the crowd throws it back). */
const hasPress = (m, s, a) => { const h = m.humans.find(q => q.side === s && !q.cpu); return h ? h.ctl.peek()[a] : false; };
Object.assign(Match.prototype, {
  humanFor(s) { return this.humans.find(q => q.side === s && !q.cpu) || null; },
  /** a set piece is taken: the placement orders (t 99) end, everyone plays */
  clearPlacement() { for (const f of this.players) { if (f.order && f.order.t > 50) f.order = null; f.frozen = false; } },
  startSetpiece(kind, s, info) {
    const m = this, b = this.ball, dir = this.dir(s), gx = this.goalX(s);
    for (const f of this.players) { f.order = null; f.frozen = false; if (f.state !== 'down' && f.state !== 'launched' && f.state !== 'getup' && !f.sentOff) { f.setState('run'); f.tilt = null; f.clip = null; } f.read = null; f.save = null; f.charging = false; }
    const SP = this.setpiece = { kind, side: s, info, t: 0, stage: 'setup', taker: null, spot: null, taken: false, touched: false, wall: [], ring: null, reticle: null, wait: 0 };
    this.setMode(kind === 'kickoff' ? 'kickoff' : 'setpiece');
    const place = (f, x, y, snap) => { f.order = { to: [clamp(x, P.X0 - 30, P.X1 + 30), clamp(y, P.Y0 + 4, P.Y1 - 4)], t: 99 }; if (snap) { f.body.x = f.order.to[0]; f.body.y = f.order.to[1]; f.body.vx = f.body.vy = 0; } };
    const near = (side, x, y, excl) => this.outfield(side).filter(f => f !== excl && f.state !== 'down').sort((a, c) => H.d2(a.body.x, a.body.y, x, y) - H.d2(c.body.x, c.body.y, x, y))[0];
    if (kind === 'kickoff') {
      b.place(P.CX, P.CY, 0);
      const kickers = this.outfield(s).sort((a, c) => (c.role === 'FWD') - (a.role === 'FWD') || H.d2(a.body.x, a.body.y, P.CX, P.CY) - H.d2(c.body.x, c.body.y, P.CX, P.CY));
      SP.taker = kickers[0] || this.keeper(s) || this.side[s][0];
      for (const f of this.players) { if (f.sentOff) continue; const sp = this.brains[f.side].spot(f); let x = sp[0], y = sp[1]; const own = this.dir(f.side); if ((x - P.CX) * own > -8) x = P.CX - own * 30; if (f.side !== s && H.d2(x, y, P.CX, P.CY) < 72) { const d = H.d2(x, y, P.CX, P.CY) || 1; x = P.CX + (x - P.CX) / d * 72; y = P.CY + (y - P.CY) / d * 72; } if (f.role === 'GK') { x = this.ownGoalX(f.side) + own * 10; y = P.CY; } place(f, x, y, true); f.facing = own > 0 ? 0 : Math.PI; }
      place(SP.taker, P.CX - dir * 7, P.CY, true); SP.taker.facing = dir > 0 ? 0 : Math.PI;
      if (kickers[1]) place(kickers[1], P.CX - dir * 6, P.CY + 22, true);
      SP.setupT = .9; SP.autoT = 3;
    } else if (kind === 'goalkick') {
      const k = this.keeper(s) || near(s, info.gx, P.CY), x = info.gx + this.dir(s) * P.GA_D, y = P.CY + (this.rng() < .5 ? -1 : 1) * 40;
      b.place(x, y, 0); SP.taker = k; place(k, x - this.dir(s) * 6, y, false);
      for (const f of this.players) if (f !== k && !f.sentOff) { const sp = this.brains[f.side].spot(f); let px2 = sp[0]; if (f.side !== s && P.inBoxAt(info.gx, px2, sp[1])) px2 = info.gx + this.dir(s) * (P.BOX_D + 10); place(f, px2, sp[1], false); }
      SP.setupT = 1.1; SP.autoT = 1.4;
    } else if (kind === 'corner') {
      const cy = info.y < P.CY ? P.Y0 + 3 : P.Y1 - 3, cx = info.gx + (info.gx === P.X0 ? 3 : -3), into = info.gx === P.X0 ? 1 : -1;
      b.place(cx, cy, 0); this.lastCornerT = this.t + 3; this.stats.corners[s]++;
      const taker = near(s, cx, cy); SP.taker = taker; place(taker, cx - into * 4, cy + (cy < P.CY ? -5 : 5), true);
      SP.ring = { x: info.gx + into * (P.SPOT + 6), y: P.CY + (cy < P.CY ? -12 : 12) };
      const att = this.outfield(s).filter(f => f !== taker), slots = [[into * 14, (cy < P.CY ? -1 : 1) * 30], [into * 20, (cy < P.CY ? 1 : -1) * 34], [into * (P.SPOT + 4), 0], [into * (P.BOX_D + 16), (cy < P.CY ? 1 : -1) * 30]];
      att.forEach((f, i) => place(f, info.gx + slots[i % 4][0], P.CY + slots[i % 4][1], false));
      const defn = this.outfield(1 - s); defn.forEach((f, i) => { const a = att[i % Math.max(1, att.length)]; const tx = a ? (a.order.to[0] + info.gx) / 2 + into * 2 : info.gx + into * 20, ty = a ? a.order.to[1] + (P.CY - a.order.to[1]) * .2 : P.CY; place(f, tx, ty, false); });
      const k = this.keeper(1 - s); if (k) place(k, info.gx + into * 6, P.CY + (cy < P.CY ? -10 : 10), false);
      const kk = this.keeper(s); if (kk) place(kk, this.ownGoalX(s) + this.dir(s) * 30, P.CY, false);
      SP.setupT = 1.2; SP.autoT = 1.6; SP.into = into; SP.cornerY = cy;
      this.emit('corner', { side: s, x: cx, y: cy });
    } else if (kind === 'freekick' || kind === 'penalty') {
      const fx = clamp(info.x, P.X0 + 6, P.X1 - 6), fy = clamp(info.y, P.Y0 + 6, P.Y1 - 6);
      if (kind === 'penalty') { SP.pen = new EF.PenaltyKick(this, info.taker && !info.taker.sentOff && info.taker.state !== 'off' ? info.taker : this.bestShooter(s), this.keeper(1 - s), { gx, live: true }); SP.taker = SP.pen.taker; this.emit('penaltyAwarded', { side: s }); this.stats.freekicks[s]++; return; }
      b.place(fx, fy, 0); this.stats.freekicks[s]++;
      const dg = H.d2(gx, P.CY, fx, fy), shootable = dg < 320 && Math.abs(fy - P.CY) < 220;
      const taker = this.bestShooter(s, fx, fy); SP.taker = taker; const a = Math.atan2(P.CY - fy, gx - fx);
      place(taker, fx - Math.cos(a) * 10, fy - Math.sin(a) * 10, true); taker.facing = a;
      SP.shootable = shootable; SP.reticle = { y: 0, z: .35 };
      for (const f of this.players) if (f !== taker && !f.sentOff) { const sp = this.brains[f.side].spot(f); let x = sp[0], y = sp[1]; if (f.side !== s && H.d2(x, y, fx, fy) < 40) { const d = H.d2(x, y, fx, fy) || 1; x = fx + (x - fx) / d * 42; y = fy + (y - fy) / d * 42; } if (f.role === 'GK' && f.side !== s) { x = this.ownGoalX(f.side) + this.dir(f.side) * 8; y = P.CY + (fy - P.CY) * .15; } place(f, x, y, false); }
      if (shootable) {   // the wall: two defenders 40 out on the line to goal
        const def = this.outfield(1 - s).sort((p, q) => H.d2(p.body.x, p.body.y, fx, fy) - H.d2(q.body.x, q.body.y, fx, fy)).slice(0, 2);
        def.forEach((f, i) => { const wx = fx + Math.cos(a) * 40 - Math.sin(a) * (i ? 6 : -6), wy = fy + Math.sin(a) * 40 + Math.cos(a) * (i ? 6 : -6); place(f, wx, wy, true); f.facing = a + Math.PI; SP.wall.push(f); });
      }
      SP.setupT = 1.1; SP.autoT = shootable ? 1.8 : 1.2;
      this.emit('freekick', { side: s, x: fx, y: fy, shootable });
    } else if (kind === 'throwback') {
      const y = info.north ? P.Y0 - 18 : P.Y1 + 14, x = info.x, recv = near(s, x, info.north ? P.Y0 + 30 : P.Y1 - 30);
      SP.taker = recv; SP.throwFrom = { x, y, z: info.north ? 40 : 10 }; b.place(x, y, SP.throwFrom.z); b.held = true;
      if (recv) place(recv, x, info.north ? P.Y0 + 26 : P.Y1 - 26, false);
      SP.setupT = .9; SP.autoT = 0;
      this.note('INTO THE CROWD!', { dur: 1.4 });
      this.emit('crowdThrow', { side: s, x, y });
    }
    if (this.mode === 'kickoff') this.emit('kickoffSetup', { side: s });
  },
  bestShooter(s, x, y) { const list = this.outfield(s).filter(f => f.state !== 'down' && f.state !== 'launched'); return list.sort((a, b) => b.stat('shoot') - a.stat('shoot') + (x !== undefined ? (H.d2(a.body.x, a.body.y, x, y) - H.d2(b.body.x, b.body.y, x, y)) * .02 : 0))[0] || this.side[s][0]; },
  setpieceStep(dt) {
    const SP = this.setpiece; if (!SP) { this.setMode('play'); return; }
    SP.t += dt; if (!SP.taken) this.stopT += dt;
    if (SP.pen) { SP.pen.update(dt); if (SP.pen.done && this.setpiece === SP) { this.setpiece = null; this.clearPlacement(); if (this.mode === 'setpiece') this.setMode('play'); } return; }
    const m = this, s = SP.side, b = this.ball, T = SP.taker, h = this.humanFor(s);
    if (SP.stage === 'setup') {
      if (SP.t >= SP.setupT) {
        SP.stage = 'aim'; SP.t = 0;
        for (const f of this.players) if (f.order && f.order.to && H.d2(f.order.to[0], f.order.to[1], f.body.x, f.body.y) > 26 && f !== T) { f.body.x = f.order.to[0]; f.body.y = f.order.to[1]; }
        if (h && T && T.role !== 'GK' && h.fb !== T && (SP.kind !== 'throwback')) this.giveTo(h, T);
        if (SP.kind === 'kickoff') { this.emit('whistle', { kind: 'kickoff' }); this.emit('kickoff', { side: s }); this.note('KICK OFF', { dur: 1 }); }
        if (SP.kind === 'throwback') return this.takeThrowback();
        if (T) { const tp = SP.kind === 'corner' ? [b.x - SP.into * 4, b.y + (b.y < P.CY ? -5 : 5)] : [b.x - Math.cos(T.facing) * 6, b.y - Math.sin(T.facing) * 6]; T.body.x = tp[0]; T.body.y = tp[1]; T.body.vx = T.body.vy = 0; }
      }
      return;
    }
    if (SP.stage !== 'aim' || SP.taken) return;
    const human = h && h.fb === T && T && !h.cpu, limit = human ? (SP.kind === 'corner' ? 4 : 6) : SP.autoT;
    if (SP.kind === 'kickoff' || SP.kind === 'goalkick' || (SP.kind === 'freekick' && !SP.shootable)) {
      // a live restart: the taker has the ball; the other side keeps its distance until it's played
      if (SP.kind === 'goalkick') {
        if (human || (h && T && T.role === 'GK')) {
          const pr = h ? h.ctl.peek() : {};
          if (pr.pass) return this.takeGoalKick('short', pr.move);
          if (pr.lob || pr.shoot) return this.takeGoalKick('long', pr.move);
        }
        if (SP.t >= (h ? 2.6 : limit)) return this.takeGoalKick(this.tactic[s].gimmick === 'routeone' || this.rng() < .3 ? 'long' : 'short');
        return;
      }
      this.setOwner(T, 'restart'); SP.taken = true; this.kickHold = SP.kind === 'kickoff' ? 2.5 : 1.5; this.clearPlacement();
      this.setpiece = null; this.setMode('play'); return;
    }
    if (SP.kind === 'corner') {
      if (human) {
        const mv = h.ctl.peek().move; SP.ring.x = clamp(SP.ring.x + mv[0] * 120 * dt, Math.min(SP.info.gx, SP.info.gx + SP.into * P.BOX_D), Math.max(SP.info.gx, SP.info.gx + SP.into * P.BOX_D)); SP.ring.y = clamp(SP.ring.y + mv[1] * 120 * dt, P.CY - P.BOX_H, P.CY + P.BOX_H);
        const pr = h.ctl.peek(); if (pr.lob || pr.pass) return this.takeCorner('cross', pr.move); if (pr.shoot) return this.takeCorner('short');
        if (SP.t >= limit) return this.takeCorner('cross');
      } else if (SP.t >= limit) {
        const att = this.outfield(s).filter(f => f !== T); const tgt = att[Math.floor(this.rng() * att.length)];
        if (tgt) { SP.ring.x = tgt.order ? tgt.order.to[0] : tgt.body.x; SP.ring.y = tgt.order ? tgt.order.to[1] : tgt.body.y; }
        return this.takeCorner(this.rng() < .15 ? 'short' : 'cross');
      }
      return;
    }
    if (SP.kind === 'freekick') {   // a shootable free kick: the reticle across the frame, power from the shoot button
      const gx = this.goalX(s);
      if (human) {
        const pr = h.ctl.peek(), R = SP.reticle; R.y = clamp(R.y + pr.move[1] * 1.6 * dt * (this.dir(s) > 0 ? 1 : 1), -1, 1); R.z = clamp(R.z - pr.move[0] * this.dir(s) * 1.2 * dt, 0, 1);
        if (pr.pass) return this.takeFreeKick('pass'); if (pr.lob) return this.takeFreeKick('lob');
        if (pr.shootDown) { SP.charge = Math.min(1, (SP.charge || 0) + dt / EF.T.shotChargeTime); T.charging = true; T.charge = SP.charge; }
        else if (SP.charge > 0) return this.takeFreeKick('shoot');
        if (SP.t >= limit + 2) { SP.charge = SP.charge || .7; return this.takeFreeKick('shoot'); }
      } else if (SP.t >= limit) {
        const dg = H.d2(gx, P.CY, b.x, b.y);
        if (dg < 270 || this.rng() < .5) { SP.reticle = { y: (this.rng() < .5 ? -1 : 1) * (.6 + this.rng() * .3), z: .35 + this.rng() * .4 }; SP.charge = .62 + this.rng() * .25; return this.takeFreeKick('shoot'); }
        return this.takeFreeKick(this.rng() < .5 ? 'pass' : 'lob');
      }
    }
  },
  takeGoalKick(how, mv) {
    const SP = this.setpiece, T = SP.taker, b = this.ball, s = SP.side, dir = this.dir(s);
    SP.taken = true; this.setpiece = null; this.setMode('play'); this.clearPlacement();
    const mates = this.outfield(s);
    if (how === 'short') {
      const a = mv && Math.hypot(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : null;
      const t = mates.sort((p, q) => (a !== null ? Math.abs(E.angDiff(H.ang(b, p.body), a)) * 200 : 0) + H.d(p.body, b) - ((a !== null ? Math.abs(E.angDiff(H.ang(b, q.body), a)) * 200 : 0) + H.d(q.body, b)))[0];
      if (t) { const d = H.d(t.body, b), sp = clamp(d * 1.5 + 90, EF.T.passSpeedMin, EF.T.passSpeedMax), an = H.ang(b, t.body); b.kick(Math.cos(an) * sp, Math.sin(an) * sp, 0, { who: T, pass: { from: T, to: t, kind: 'ground' } }); }
    } else {
      const a = mv && Math.hypot(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : (dir > 0 ? 0 : Math.PI) + (this.rng() - .5) * .6, dist = 300 + this.rng() * 120;
      const tx = clamp(b.x + Math.cos(a) * dist, P.X0 + 30, P.X1 - 30), ty = clamp(b.y + Math.sin(a) * dist, P.Y0 + 20, P.Y1 - 20), v = E.arc(b, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 70 });
      b.kick(v.vx, v.vy, v.vz, { who: T, pass: { from: T, to: null, kind: 'goalkick' } });
    }
    T.playKick('shotHard'); this.emit('goalKick', { side: s, how });
  },
  takeCorner(how, mv) {
    const SP = this.setpiece, T = SP.taker, b = this.ball, s = SP.side;
    SP.taken = true; SP.stage = 'taken'; this.setMode('play'); this.setpiece = null; this.clearPlacement();
    if (how === 'short') { const t = this.outfield(s).filter(f => f !== T).sort((p, q) => H.d(p.body, b) - H.d(q.body, b))[0]; if (t) { const a = H.ang(b, t.body), d = H.d(t.body, b); b.kick(Math.cos(a) * clamp(d * 1.5 + 90, 150, 260), Math.sin(a) * clamp(d * 1.5 + 90, 150, 260), 0, { who: T, pass: { from: T, to: t, kind: 'ground' } }); } }
    else {
      const R = SP.ring, v = E.arc(b, { x: R.x + (this.rng() - .5) * 10, y: R.y + (this.rng() - .5) * 10, z: 0 }, EF.T.ballGravity, { apex: 55 });
      const sideSign = mv ? Math.sign(mv[1] || mv[0]) : 0;
      b.kick(v.vx, v.vy, v.vz, { who: T, spin: sideSign * .35, pass: { from: T, to: null, kind: 'cross', land: [R.x, R.y] } });
      const att = this.outfield(s).filter(f => f !== T).sort((p, q) => H.d2(p.body.x, p.body.y, R.x, R.y) - H.d2(q.body.x, q.body.y, R.x, R.y));
      for (const f of att.slice(0, 2)) f.order = { kind: 'meet', to: [R.x + (f === att[0] ? 0 : 18), R.y], t: v.t + .3 };
      const h = this.humanFor(s); if (h && att[0]) this.giveTo(h, att[0]);
      this.emit('cross', { who: T, corner: true });
    }
    T.playKick('chip'); this.emit('cornerTaken', { side: s, how });
    for (const f of this.players) if (f !== T && f.order && f.order.t > 50) f.order = null;
  },
  takeFreeKick(how) {
    const SP = this.setpiece, T = SP.taker, b = this.ball, s = SP.side, gx = this.goalX(s);
    SP.taken = true; this.setMode('play'); this.setpiece = null; T.charging = false; this.clearPlacement();
    for (const f of this.players) if (f.order && f.order.t > 50) f.order = null;
    if (how === 'shoot') {
      const R = SP.reticle, ty = P.CY + R.y * (P.GH - 6), tz = 4 + R.z * (P.BAR - 10), p = SP.charge || .7, speed = 200 + p * (EF.T.shotSpeedMax - 200);
      const d = H.d2(gx, ty, b.x, b.y), t = d / speed, g = EF.T.ballGravity, sig = (100 - T.stat('shoot')) / 100 * .05;
      const a = Math.atan2(ty - b.y, gx - b.x) + H.gauss(this.rng) * sig, vz = (tz + .5 * g * t * t) / t;
      b.kick(Math.cos(a) * speed, Math.sin(a) * speed, vz, { who: T, shot: { side: s, power: p, freekick: true, target: { y: ty, z: tz } } });
      T.curlT = .6; T.playKick('shotHard'); this.stats.shots[s]++;
      for (const w of SP.wall) { w.body.vz = 150; w.body.onGround = false; }   // the wall jumps
      this.emit('shot', { who: T, power: p, freekick: true, x: b.x, y: b.y, speed });
      // the CPU taker bends it round the wall
      if (!this.humanFor(s) || this.humanFor(s).fb !== T) b.spin = (R.y > 0 ? -1 : 1) * this.dir(s) * .5 * (this.rng() < .7 ? 1 : 0);
    } else { this.setOwner(T, 'restart'); const it = EF.Intent.make(); it.move = [this.dir(s), 0]; if (how === 'pass') T.passBall(it, 'ground'); else T.lobBall(it); }
    this.emit('freekickTaken', { side: s, how });
  },
  takeThrowback() {
    const SP = this.setpiece, b = this.ball, T = SP.taker, s = SP.side; SP.taken = true; this.setpiece = null; this.setMode('play'); b.held = false; this.clearPlacement();
    const tx = T ? T.body.x : b.x, ty = T ? T.body.y : P.CY, v = E.arc(b, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 50 });
    b.kick(v.vx, v.vy, v.vz, { pass: { from: null, to: T, kind: 'throwback' } }); this.lastTouch = null; this.lastKick = null;
    if (T) { T.order = { kind: 'meet', to: [tx, ty], t: v.t + .2 }; const h = this.humanFor(s); if (h) this.giveTo(h, T); }
    for (const f of this.players) if (f.order && f.order.t > 50) f.order = null;
    this.emit('throwback', { side: s });
  }
});

/* ---- the penalty kick (section 6.11), shared by penalties in play and the shootout ---- */
class PenaltyKick {
  constructor(m, taker, keeper, o) {
    this.m = m; this.taker = taker; this.keeper = keeper; this.o = o; this.gx = o.gx; this.dir = Math.sign(o.gx - P.CX); this.spot = { x: o.gx - this.dir * P.SPOT, y: P.CY };
    this.state = 'setup'; this.t = 0; this.cursor = { x: 0, y: .3 }; this.power = 0; this.charging = false; this.done = false; this.scored = false; this.outcome = null; this.panenka = false;
    this.guess = null; this.dived = false; this.diveT = 0; this.kickT = 0; this.early = false;
    const b = m.ball; b.place(this.spot.x, this.spot.y, 0); m.setOwner(null);
    for (const f of m.players) { if (f.sentOff) continue; f.order = null; f.read = null; f.save = null; f.setState('run'); f.tilt = null; f.clip = null; }
    // everyone else outside the box and arc; in a shootout, at the halfway line
    for (const f of m.players) {
      if (f === taker || f === keeper || f.sentOff) continue;
      let x, y;
      if (o.shootout) { x = P.CX + (f.side ? 1 : -1) * 6 * (1 + f.idx % 3); y = P.CY + (f.idx - 2) * 14 + (f.side ? 6 : -6); }
      else { x = o.gx - this.dir * (P.BOX_D + 14 + (f.idx % 2) * 18); y = P.CY + (f.idx - 2) * 34 + (f.side ? 9 : -9); }
      f.body.x = x; f.body.y = y; f.body.vx = f.body.vy = 0; f.facing = this.dir > 0 ? 0 : Math.PI; f.frozen = true; f.order = { to: [x, y], t: 99 };
    }
    taker.body.x = this.spot.x - this.dir * 16; taker.body.y = P.CY; taker.facing = this.dir > 0 ? 0 : Math.PI; taker.frozen = true; taker.order = { to: [taker.body.x, taker.body.y], t: 99 };
    if (keeper) { keeper.body.x = o.gx - this.dir * 3; keeper.body.y = P.CY; keeper.facing = this.dir > 0 ? Math.PI : 0; keeper.frozen = true; keeper.order = { to: [keeper.body.x, P.CY], t: 99 }; }
    this.hT = m.humanFor(taker.side); this.hK = keeper ? m.humanFor(keeper.side) : null;
    if (this.hT && taker.role !== 'GK') m.giveTo(this.hT, taker);
    m.emit('penaltySetup', { who: taker, keeper, shootout: !!o.shootout });
  }
  update(dt) {
    const m = this.m, b = m.ball, T = this.taker, K = this.keeper; this.t += dt;
    if (this.state === 'setup') { if (this.t > 1) { this.state = 'aim'; this.t = 0; m.emit('whistle', { kind: 'short' }); } return; }
    if (this.state === 'aim') {
      const humanT = this.hT && !this.hT.cpu, humanK = this.hK && !this.hK.cpu;
      if (humanT) {
        const pr = this.hT.ctl.peek(); this.cursor.x = clamp(this.cursor.x + pr.move[1] * 1.8 * dt, -1, 1); this.cursor.y = clamp(this.cursor.y - pr.move[0] * this.dir * 1.4 * dt + (pr.move[1] === 0 ? 0 : 0), 0, 1);
        if (pr.shootDown) { this.charging = true; this.power = Math.min(1, this.power + dt / EF.T.shotChargeTime); T.charging = true; T.charge = this.power; }
        else if (this.charging) this.runUp();
        else if (this.t > 6) { this.power = .65; this.runUp(); }
      } else if (this.t > .9 + (T.idx % 3) * .25) {
        const R = m.rng; this.cursor.x = [-1, -.85, 0, .85, 1][Math.floor(R() * 5)] * (.75 + R() * .25); this.cursor.y = R() < .4 ? .8 : .2;
        this.power = R() < .08 ? .12 : .45 + R() * .5; if (m.forcePanenka && !m.panenkaDone && m.shootout && m.shootout.n >= 2) { m.panenkaDone = true; this.power = .12; } if (this.power < .2) this.cursor.x = 0; this.runUp();
      }
      if (humanK) this.keeperHuman(dt);
      return;
    }
    if (this.state === 'runup') {
      if (this.hK && !this.hK.cpu) this.keeperHuman(dt);
      const u = this.t / .5; T.order = { to: [lerp(this.spot.x - this.dir * 16, this.spot.x - this.dir * 5, Math.min(1, u)), P.CY], t: 99 };
      if (this.t >= .5) this.strike();
      return;
    }
    if (this.state === 'flight') {
      this.kickT += dt;
      if (K && !this.dived && (!this.hK || this.hK.cpu)) this.cpuDive();
      if (K && !this.resolved && Math.sign(b.x - (K.body.x - this.dir * 2)) === this.dir) this.resolve();
      if (!this.o.live) {
        // the shootout keeps the ball: it is scored once over the line between the posts, else missed when it stops or leaves
        if (!this.outcome || this.outcome === 'goal') {
          b.update(dt);
          if (P.crossedGoalLine(b) && Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2) { this.scored = true; this.outcome = 'goal'; b.inNet = true; if (!this.done) { this.done = true; m.emit('goal', { who: T, side: T.side, shootout: true, x: b.x, y: b.y }); } }
          else if (P.crossedGoalLine(b) || this.kickT > 2.5) { if (!this.done) { this.done = true; this.outcome = this.outcome || 'miss'; m.emit('penaltyMiss', { who: T, how: b.z > P.BAR ? 'over' : 'wide' }); } }
        } else { b.update(dt); if (!this.done && this.kickT > .8) this.done = true; }
      } else if (this.resolved || this.kickT > .8) this.done = true;
    }
  }
  keeperHuman() {
    const pr = this.hK.ctl.peek(), mv = pr.move; this.keeperAim = { x: mv[1], high: mv[0] * -this.dir > .4 };
    if (pr.pass && !this.dived) { this.guess = { col: Math.abs(mv[1]) < .35 ? 0 : Math.sign(mv[1]), high: this.keeperAim.high }; this.dive(); if (this.state === 'aim' || (this.state === 'runup' && this.t < .25)) { this.early = true; this.m.emit('keeperEarly', {}); } }
  }
  runUp() {
    this.state = 'runup'; this.t = 0; this.taker.charging = false; const m = this.m;
    if (this.early && this.guess && (!this.hT || this.hT.cpu) && m.rng() < .6) { this.cursor.x = -this.guess.col * .9 || (m.rng() < .5 ? -.9 : .9); }   // the CPU taker sees an early dive and changes sides
    m.emit('penaltyRun', { who: this.taker });
  }
  strike() {
    const m = this.m, b = m.ball, T = this.taker, p = this.power, cx = this.cursor.x, high = this.cursor.y > .55;
    this.state = 'flight'; this.t = 0; this.kickT = 0;
    let ty = P.CY + cx * (P.GH - 8), tz = high ? 24 : 5, speed = 200 + p * 220;
    if (p < .2 && Math.abs(cx) < .35) { this.panenka = true; speed = 120; ty = P.CY; tz = 16; }
    if (p > .9 && m.rng() < .25) tz = P.BAR + 14;
    const sig = (100 - T.stat('shoot')) / 100 * .03; ty += H.gauss(m.rng) * sig * 120;
    const d = H.d2(this.gx, ty, b.x, b.y), t = d / speed, g = EF.T.ballGravity, a = Math.atan2(ty - b.y, this.gx - b.x);
    const vz = this.panenka ? (tz + .5 * g * t * t) / t : (tz + .5 * g * t * t) / t;
    b.kick(Math.cos(a) * speed, Math.sin(a) * speed, vz, { who: T, shot: { side: T.side, power: p, pen: true, target: { y: ty, z: tz } } });
    this.target = { y: ty, z: tz, speed }; T.playKick('penalty'); T.frozen = false; T.order = null;
    m.stats.shots[T.side]++; if (T.human) T.human.stats.Shots++;
    m.emit('penaltyTaken', { who: T, panenka: this.panenka, shootout: !!this.o.shootout });
    if (K_has(this)) this.keeper.read = null;
    if (this.o.live) { if (m.setpiece) m.setpiece.taken = true; for (const f of m.players) { if (f !== this.keeper) { f.frozen = false; f.order = null; } } }
  }
  cpuDive() {
    const m = this.m, K = this.keeper; if (this.kickT < .02) return;
    const R = m.rng, diff = m.diff, smart = diff.acc - .5;
    let col = R() < .26 ? 0 : R() < .5 ? -1 : 1;
    if (R() < smart * .6) col = Math.abs(this.target.y - P.CY) < 14 ? 0 : Math.sign(this.target.y - P.CY);
    this.guess = { col, high: R() < .35 }; this.dive();
  }
  dive() {
    const K = this.keeper, g = this.guess; this.dived = true; if (!K) return;
    K.frozen = false; K.order = null;
    if (g.col === 0) { K.setState('run'); K.look.pose = 'guard'; return; }
    K.diveV = g.col * 230; K.diveSign = Math.sign(Math.cos(K.facing) * g.col) || 1; K.diveHigh = g.high; K.save = null; K.read = null;
    K.setState('keeper-dive', .7); this.m.emit('keeperDive', { who: K, high: g.high, dir: g.col });
  }
  /** the keeper's dive meets the ball, or not (section 6.11: by the keeper rules, with the dive committed) */
  resolve() {
    const m = this.m, b = m.ball, K = this.keeper; this.resolved = true; if (!K) return;
    const onTarget = Math.abs(this.target.y - P.CY) < P.GH - 1 && this.target.z < P.BAR - 1;
    if (!onTarget) { this.outcome = this.target.z >= P.BAR ? 'over' : 'wide'; return; }
    const col = Math.abs(this.target.y - P.CY) < 14 ? 0 : Math.sign(this.target.y - P.CY), g = this.guess || { col: 9 };
    let saved = false;
    if (this.panenka) saved = g.col === 0 && m.rng() < .85;
    else if (g.col === col) { const hi = this.target.z > 16; saved = m.rng() < clamp(.55 + .35 * K.stat('keep') / 100 - this.power * .25 + (hi === !!g.high ? .1 : -.25), .05, .95); }
    if (m.cheats['keeper' + K.side]) saved = true;
    if (m.cheats['nokeeper' + K.side]) saved = false;
    if (saved) {
      this.outcome = 'saved';
      const away = this.dir * -1; b.vx = away * 120; b.vy = (m.rng() - .5) * 160; b.vz = 60; b.shot = null; m.touch(K);
      m.stats.saves[K.side]++; m.addEuphoria(K.side, 10, 'save'); m.emit('save', { who: K, kind: 'penalty', shooter: this.taker });
      if (this.o.shootout) { this.done = true; }
    } else this.outcome = 'goal';
  }
}
const K_has = pk => !!pk.keeper;
EF.PenaltyKick = PenaltyKick;
/* ==== src/18-referee.js ==== */
/* THE REFEREE (section 6.10): a character on the pitch with a personality (strictness, gullibility, VAR-happiness). He
 * judges contact (fouls, cards, advantage), theatrics, and runs VAR; the ball can knock him over. */
class Referee {
  constructor(m, data) {
    this.m = m; this.data = data || EF.get('referee', 'haltwhistle');
    this.body = new E.Body({ x: P.CX, y: P.CY + 80, r: 5, friction: 0, gravity: 700 }); this.facing = -Math.PI / 2;
    this.state = 'run'; this.stT = 0; this.signal = null; this.signalT = 0; this.downT = 0; this.stride = 0;
    this.look = { pose: null, expr: null, down: 0, point: false, signal: null, tilt: null, clip: null };
  }
  get strict() { const s = game.settings.cards; return this.data.strictness * EF.T.foulStrictness * (s === 'strict' ? 1.3 : 1) * (this.m.buffs.some(b => b.hairdryer) && this.m.minute < 90 ? 1.2 : 1); }
  sign(kind, t = 1.2) { this.signal = kind; this.signalT = t; }
  update(dt) {
    const m = this.m, B = this.body, b = m.ball; this.stT += dt;
    if (this.signalT > 0) { this.signalT -= dt; if (this.signalT <= 0) this.signal = null; }
    if (this.state === 'down') { B.vx = approach(B.vx, 0, 400 * dt); B.vy = approach(B.vy, 0, 400 * dt); this.downT -= dt; if (this.downT <= 0) { this.state = 'run'; this.look.clip = null; } }
    else {
      // follow play 60-90 from the ball, off the line between the ball and either goal (the passing lanes)
      let tx, ty;
      if (m.mode === 'card' && this.cardFor) { tx = this.cardFor.body.x + 14; ty = this.cardFor.body.y + 6; }
      else if (m.setpiece && m.setpiece.pen) { tx = m.setpiece.pen.spot.x - m.setpiece.pen.dir * 30; ty = P.CY + 70; }
      else if (m.shootout) { tx = P.X1 - 120; ty = P.CY + 90; }
      else { const side = b.y > P.CY ? -1 : 1; tx = b.x - m.dir(m.owner ? m.owner.side : 0) * 40; ty = b.y + side * 70; }
      tx = clamp(tx, P.X0 + 20, P.X1 - 20); ty = clamp(ty, P.Y0 + 14, P.Y1 - 14);
      const d = H.d2(tx, ty, B.x, B.y), sp = d > 60 ? 95 : d > 12 ? 60 : 0;
      B.vx = approach(B.vx, d > 1 ? (tx - B.x) / d * sp : 0, 400 * dt); B.vy = approach(B.vy, d > 1 ? (ty - B.y) / d * sp : 0, 400 * dt);
      const look = m.mode === 'card' && this.cardFor ? this.cardFor.body : b; this.facing = E.approachAng(this.facing, Math.atan2(look.y - B.y, look.x - B.x), dt * 6);
      // the ball hits him: over he goes, comically
      if (!m.owner && !b.superPath && b.speed() > 90 && b.z < 22 && H.d(B, b) < 6 && m.mode === 'play' && this.stT > 1) {
        this.state = 'down'; this.downT = 1.3; this.stT = 0; this.look.clip = { name: 'Fall_On_Face', t: 0, w: 1 };
        b.vx *= -.4; b.vy *= -.4; m.emit('refHit', { x: B.x, y: B.y });
      }
    }
    B.update(dt, m.pitch.map); this.stride += dt * Math.hypot(B.vx, B.vy) / 7;
    const L = this.look; L.down = this.state === 'down' && !L.clip ? 1 : 0; L.signal = this.signal;
    L.pose = this.signal === 'card' ? 'cheer' : this.signal === 'advantage' ? 'cast' : this.signal === 'ear' ? null : null;
    L.point = this.signal === 'point' || this.signal === 'whistle';
    L.expr = this.signal === 'card' ? 'angry' : this.state === 'down' ? 'wince' : null;
  }
  /** contact on a tackle, slide, barge or collision: a foul? a card? (section 6.10) */
  judge(by, victim, info) {
    const m = this.m; if (m.mode !== 'play' && !(m.mode === 'setpiece' && m.setpiece && m.setpiece.taken)) return;
    if (by.side === victim.side) return;
    const fromBehind = info.fromBehind !== undefined ? info.fromBehind : Math.abs(E.angDiff(H.ang(victim.body, by.body), victim.facing)) > 2.1;
    const late = !!info.late, sev = (info.speed || 100) / 175 * (fromBehind ? 1.5 : 1) * (late ? 1.4 : 1) * (info.kind === 'slide' ? 1.2 : 1) * (info.mul || 1);
    const k = sev * this.strict;
    if (k <= .5) { m.emit('fairChallenge', { who: by, victim }); return; }
    m.foul(by, victim, k, { sev, kind: info.kind, fromBehind, late });
  }
  /** theatrics: contact or a close opponent, and he may buy it; nobody near, and it's a booking */
  judgeDive(diver) {
    const m = this.m; if (m.mode !== 'play') return;
    const opp = m.active(1 - diver.side).filter(o => o.role !== 'GK' || H.d(o.body, diver.body) < 14), B = diver.body;
    let near = null, nd = 99; for (const o of opp) { const d = H.d(o.body, B); if (d < nd) { nd = d; near = o; } }
    const contact = diver.contactT > m.t - .5 && diver.contactBy, closing = near && nd < 8 && ((near.body.vx - B.vx) * (B.x - near.body.x) + (near.body.vy - B.vy) * (B.y - near.body.y)) > 0;
    if (contact || closing) {
      const p = Math.max(.1, this.data.gullibility * EF.T.diveSuccess * (1.2 - nd / 14));
      if (m.rng() < p) { m.addEuphoria(diver.side, 5, 'diveWon'); m.emit('diveWon', { who: diver, by: contact ? diver.contactBy : near }); m.foul(contact ? diver.contactBy : near, diver, .62, { sev: .5, kind: 'dive', dive: true }); }
      else m.emit('diveIgnored', { who: diver });
    } else if (nd > 14) {
      m.addEuphoria(diver.side, -20, 'diveBooked'); m.emit('diveBooked', { who: diver }); m.note('SIMULATION!', { sub: diver.data.name, dur: 1.8 });
      if (game.settings.cards !== 'off') m.queueCard(diver, 'yellow', 'simulation');
      m.lastFoul = null; m.restart('freekick', 1 - diver.side, { x: B.x, y: B.y });
    } else m.emit('diveIgnored', { who: diver });
  }
}
EF.Referee = Referee;
Object.assign(Match.prototype, {
  /** a foul: the free kick or penalty, the card, advantage when the fouled side keeps the ball */
  foul(by, victim, k, info) {
    const gxDef = this.ownGoalX(by.side), x = victim.body.x, y = victim.body.y, box = P.inBoxAt(gxDef, x, y);
    const cardsOff = game.settings.cards === 'off';
    let card = null;
    if (!cardsOff && !info.dive) { if (k > 2.6) card = 'red'; else if (k > 1.35) card = 'yellow'; }
    if (card === 'red' && (by.role === 'GK' || this.outfield(by.side).length <= 2)) card = 'yellow';
    this.lastFoul = { t: this.t, by: by.side, sev: info.sev, punished: false, x, y, victim, tackler: by, card };
    this.stats.fouls[by.side]++; by.rating -= .3;
    this.emit('foul', { who: by, victim, k, card, box, kind: info.kind });
    const keeps = this.owner && this.owner.side === victim.side && this.owner !== victim;
    if (!box && keeps && !info.dive) { this.advantage = { t: .8, foul: this.lastFoul, by, card, side: victim.side }; return; }
    this.lastFoul.punished = true;
    if (card) this.queueCard(by, card, info.kind);
    this.ref.sign(box ? 'point' : 'whistle', 1.4);
    if (box) { this.note('PENALTY!', { dur: 1.6 }); return this.restart('penalty', victim.side, { x, y, foul: this.lastFoul, taker: null }); }
    this.restart('freekick', victim.side, { x, y, foul: this.lastFoul });
  },
  advantageStep(dt) {
    const A = this.advantage; if (!A) return;
    A.t -= dt;
    const lost = this.owner && this.owner.side !== A.side;
    if (lost) { this.advantage = null; A.foul.punished = true; if (A.card) this.queueCard(A.by, A.card, 'foul'); return this.restart('freekick', A.side, { x: A.foul.x, y: A.foul.y, foul: A.foul }); }
    if (A.t <= 0) {
      this.advantage = null; A.foul.punished = true; this.ref.sign('advantage', 1.2);
      this.note('ADVANTAGE!', { dur: 1.3, big: false }); this.emit('advantage', { side: A.side, card: A.card });
      if (A.card) this.queueCard(A.by, A.card, 'later');
    }
  },
  queueCard(who, color, why) { (this.pendingCards || (this.pendingCards = [])).push({ who, color, why }); },
  /* ---- cards: shown at the next stoppage (section 6.10) ---- */
  startCard() {
    const c = this.pendingCards.shift(); if (!c || c.who.sentOff) return this.pendingCards.length ? this.startCard() : this.continueRestart();
    this.cardNow = c; this.ref.cardFor = c.who; this.setMode('card'); this.setOwner(null);
    for (const f of this.players) f.order = null;
  },
  cardStep(dt) {
    const c = this.cardNow; this.stopT += dt; if (!c) return this.continueRestart();
    if (this.modeT > .5 && !c.shown) {
      c.shown = true; this.ref.sign('card', 1.6); c.who.cards++;
      let color = c.color; if (color === 'yellow' && c.who.cards >= 2) color = 'second';
      c.final = color; this.stats.cards[c.who.side]++;
      this.emit('card', { who: c.who, color: color === 'second' ? 'red' : color, second: color === 'second', why: c.why });
      this.note(color === 'yellow' ? 'YELLOW CARD' : 'RED CARD', { sub: c.who.data.name + (color === 'second' ? ' - SECOND YELLOW' : ''), dur: 1.8, color: color === 'yellow' ? '#ffe040' : '#ff3a3a' });
      c.who.pose = null; c.who.clip = { name: color === 'yellow' ? 'Shrug' : 'Angry', t: 0, w: 1, mask: 'upper' };
    }
    if (this.modeT > 2.2) {
      if ((c.final === 'red' || c.final === 'second') && (this.outfield(c.who.side).length > 2 || c.who.role === 'GK')) this.sendOff(c.who);
      c.who.clip = null; this.cardNow = null; this.ref.cardFor = null;
      if (this.pendingCards.length) return this.startCard();
      this.continueRestart();
    }
  },
  sendOff(f) {
    if (f.sentOff) return;
    f.sentOff = true; f.state = 'off'; if (this.owner === f) this.setOwner(null);
    const F = this.formation[f.side], drop = F.drop;
    if (f.slot !== drop) { const d = this.side[f.side].find(q => q.slot === drop && !q.sentOff); if (d) d.slot = f.slot; }
    if (f.human) { const h = f.human; f.human = null; h.fb = null; this.pickFor(h); }
    this.emit('sendOff', { who: f });
  },
  /* ---- VAR (section 6.10): 2.5 s, the referee's hand to his ear, then the decision ---- */
  startVar(v) {
    this.var = Object.assign({ t: 0, decided: false }, v); this.setMode('var'); this.setOwner(null);
    this.ref.sign('ear', 2.4); this.emit('var', { kind: v.kind }); this.note('VAR CHECK', { sub: v.kind === 'goal' ? 'CHECKING THE GOAL' : 'CHECKING THE PENALTY', dur: 2.4, big: false });
  },
  varStep(dt) {
    const V = this.var; this.stopT += dt; if (!V) return this.setMode('play');
    if (this.modeT > 2.5 && !V.decided) {
      V.decided = true;
      const sev = V.foul ? V.foul.sev : 1;
      if (V.kind === 'penalty') {
        V.overturn = this.forceVar ? this.forceVar === 'overturn' : sev < .8 && this.rng() < .5;
        this.ref.sign(V.overturn ? 'var' : 'point', 1.4);
        this.note(V.overturn ? 'NO PENALTY' : 'PENALTY STANDS', { dur: 1.6 });
      } else {
        V.overturn = sev > .6 && this.rng() < .5;
        this.ref.sign(V.overturn ? 'var' : 'whistle', 1.4);
        this.note(V.overturn ? 'NO GOAL' : 'GOAL STANDS', { sub: V.overturn ? 'FOUL IN THE BUILD-UP' : null, dur: 1.6 });
      }
      this.emit('varDecision', { kind: V.kind, overturned: V.overturn });
    }
    if (this.modeT > 4.1) {
      this.var = null;
      if (V.kind === 'penalty') { if (V.overturn) return this.startSetpiece('freekick', 1 - V.side, { x: V.foul ? V.foul.x : P.CX, y: V.foul ? V.foul.y : P.CY }); return this.startSetpiece('penalty', V.side, { taker: null }); }
      if (V.overturn) { const g = V.goal; this.score[g.side]--; this.goals.pop(); if (g.who) g.who.goalsN--; if (g.who && g.who.human) g.who.human.stats.Goals--; this.goldenWin = false; this.lastGoal = null; return this.startSetpiece('freekick', 1 - g.side, { x: V.foul.x, y: V.foul.y }); }
      if (this.wantReplay()) { this.setMode('replay'); this.emit('replayStart', { goal: this.lastGoal }); if (!this.replayHook) this.endReplay(); return; }
      this.resumeAfterGoal();
    }
  }
});
/* ==== src/19-euphoria.js ==== */
/* EUPHORIA (section 6.9): each side's crowd, 0-100, fed by good football; full, it unlocks EUROPHORIA: speed, free
 * sprinting, longer tackles, a longer-reaching keeper and one SUPER STRIKE, which a human keeper meets in the SAVE DUEL.
 * Also here: the parked bus (catenaccio), the Golden Moment (galacticos) and goal celebrations (section 6.21). */
const GAINS = { passDone: ev => 2 + Math.min(6, Math.max(0, (ev.chain || 1) - 1)), onTarget: ev => 5 + (ev.screamer ? 4 : 0), woodwork: () => 7 };
const _emit1 = Match.prototype.emit;
Match.prototype.emit = function (type, ev = {}) {
  const r = _emit1.call(this, type, ev);
  if (GAINS[type] && !this.pure) { const s = type === 'woodwork' ? (this.lastKick ? this.lastKick.side : null) : ev.side !== undefined ? ev.side : ev.who && ev.who.side; if (s !== null && s !== undefined) this.addEuphoria(s, GAINS[type](ev), type); }
  if (type === 'shot' && ev.who && !(this.ball.shot && this.ball.shot.super)) {   // on target? (the predicted crossing inside the frame)
    const c = this.ball.crossing(this.goalX(ev.who.side)); if (c && Math.abs(c.y - P.CY) < P.GH && c.z < P.BAR) { this.stats.onTarget[ev.who.side]++; this.emit('onTarget', { who: ev.who, side: ev.who.side, screamer: ev.screamer }); }
  }
  return r;
};
Object.assign(Match.prototype, {
  addEuphoria(s, v, why) {
    if (this.pure || s === null || s === undefined) return;
    if (this.europhoria && this.europhoria.side === s && v > 0) return;
    const was = this.euphoria[s], k = v > 0 ? EF.T.euphoriaGain * this.euFactor(s) : 1;
    this.euphoria[s] = clamp(was + v * k, 0, 100);
    const now = this.euphoria[s];
    if (v > 0) this.emit('euphoriaGain', { side: s, amount: now - was, why, level: now });
    for (const th of [34, 67]) if (was < th && now >= th) this.emit('euphoriaLevel', { side: s, level: th });
    if (was < 100 && now >= 100) { this.emit('euphoriaFull', { side: s }); }
  },
  euphoriaStep(dt) {
    const T = EF.T;
    for (const s of [0, 1]) {
      if (this.cheats['euphoria' + s] && !this.pure && !(this.europhoria && this.europhoria.side === s)) this.euphoria[s] = 100;
      if (!(this.europhoria && this.europhoria.side === s) && this.euphoria[s] > 0 && this.euphoria[s] < 100 && this.mode === 'play') this.euphoria[s] = Math.max(0, this.euphoria[s] - T.euphoriaDecay * dt);
    }
    const EU = this.europhoria;
    if (EU) {
      EU.t -= dt; this.euphoria[EU.side] = Math.max(0, 100 * EU.t / EU.dur);
      if (EU.t <= 0 && !this.superSeq && !(this.ball.superPath)) { this.europhoria = null; this.euphoria[EU.side] = 0; this.emit('europhoriaEnd', { side: EU.side }); }
    }
    if (this.superSeq) this.superSeqStep(dt);
    if (this.duel) this.duelStep(dt);
    this.gimmickStep(dt);
  },
  triggerEuphoria(s, who) {
    if (this.pure || this.europhoria || this.euphoria[s] < 100) return false;
    if (this.mode !== 'play' && this.mode !== 'setpiece' && this.mode !== 'kickoff') return false;
    const dur = EF.T.europhoriaTime; this.europhoria = { side: s, t: dur, dur, who }; this.superUsed = false;
    this.emit('europhoria', { side: s, who }); this.note('EUROPHORIA!', { sub: this.teams[s].name, dur: 1.8, color: '#ffc83a' });
    return true;
  },
  /* ---- the super strike: 0.6 s of charge-up in slow motion, then the strike along its path ---- */
  superStrike(f, it) {
    const gx = this.goalX(f.side), k = this.keeper(1 - f.side), def = EF.get('super', f.data.captain && f.data.super ? f.data.super : 'rocket') || EF.get('super', 'rocket');
    this.superUsed = true; this.stats.supers[f.side]++; f.charging = false; f.charge = 0;
    const ty = P.CY + (k && k.body.y > P.CY ? -1 : 1) * (P.GH - 10), tz = 8 + this.rng() * 14;
    this.superSeq = { who: f, def, t: 0, to: { x: gx, y: ty, z: tz } };
    f.setState('super', .6); f.body.vx = f.body.vy = 0; f.facing = Math.atan2(ty - f.body.y, gx - f.body.x);
    this.slow(.3, .6);
    this.emit('superCharge', { who: f, super: def.id, name: def.name });
    this.note(def.name, { dur: 1.6, color: def.color || '#ffc83a' });
  },
  superSeqStep(dt) {
    const S = this.superSeq, f = S.who; S.t += dt / Math.max(.05, game.timeScale);
    f.body.z = Math.min(6, S.t * 12); f.body.vz = 0;
    const b = this.ball; if (this.owner !== f) this.setOwner(f);
    if (S.t >= .6) {
      this.superSeq = null; f.body.z = 0; f.setState('kick', .2); f.playKick('shotHard');
      this.setOwner(null);
      b.startPath(S.def.path, { x: b.x, y: b.y, z: 4 }, S.to, Object.assign({ side: f.side, speed: EF.T.superSpeed }, S.def.params || {}));
      b.superDef = S.def; this.lastKick = f; this.touch(f); this.stats.shots[f.side]++;
      if (this.bus && this.bus.side !== f.side) this.bus.smash = true;
      this.emit('superStrike', { who: f, super: S.def.id, name: S.def.name, path: S.def.path, side: f.side });
      this.slow(.5, .3);
    }
  },
  /** the super reaches the keeper: the Save Duel (a human defends), else a CPU keeper's chance (section 6.9) */
  superAtKeeper(b) {
    const sp = b.superPath, s = sp.side, d = 1 - s, k = this.keeper(d);
    if (!k) return;
    const h = this.humans.find(q => q.side === d && !q.cpu && !q.remote) || this.humans.find(q => q.side === d && !q.cpu);
    if (this.cheats['keeper' + d]) return this.superSaved(b, k, 'catch');
    if ((h && this.kind !== 'attract') || (this.kind === 'attract' && this.attractDuel)) {
      sp.paused = true; b.superPathHold = sp; b.superPath = null; b.vx = b.vy = b.vz = 0; b.held = true; b.heldBy = null;
      this.duel = { t: 0, dur: 1, keeper: k, human: this.kind === 'attract' ? null : h, press: null, result: null, b, sp, deadline: 1.14, startAt: EF.inSession && window.AIHub && AIHub.time ? AIHub.time() : 0 };
      game.timeScale = .3; this.wantScale = .3; this.slowmo = { t: 2 };
      this.emit('saveDuel', { who: k, human: h ? h.id : null }); return;
    }
    const chance = this.kind === 'attract' ? (this.attractSave || 0) : this.hasHuman(s) ? this.diff.cpuSuper : .25;
    if (this.rng() < chance) this.superSaved(b, k, this.rng() < .5 ? 'catch' : 'parry');
    else { k.diveSign = Math.sign(Math.cos(k.facing) * (sp.to.y - k.body.y)) || 1; k.diveV = clamp((sp.to.y - k.body.y) * 3, -200, 200); k.diveHigh = sp.to.z > 16; k.setState('keeper-dive', .8); this.emit('superBeaten', { who: k }); }
  },
  duelPress(at) { const D = this.duel; if (D && D.press === null) D.press = at !== undefined ? at : D.t; },
  duelStep(dt) {
    const D = this.duel, real = dt / Math.max(.05, game.timeScale); D.t += real;
    if (D.result) { D.after += real; if (D.after > .7) { this.duel = null; this.wantScale = 1; this.slowmo = { t: .01 }; } return; }
    if (D.human && !D.human.remote && D.press === null && D.human.ctl.peek().pass) D.press = D.t;
    if (D.press !== null || D.t > D.deadline + .3) {
      const err = D.press === null ? 9 : Math.abs(D.press - D.dur);
      D.result = err <= .06 ? 'perfect' : err <= .14 ? 'good' : 'miss'; D.after = 0;
      this.emit('saveDuelResult', { who: D.keeper, result: D.result, err });
      this.note(D.result === 'perfect' ? 'PERFECT!' : D.result === 'good' ? 'GOOD!' : 'MISS!', { dur: 1.2, color: D.result === 'miss' ? '#ff5a4a' : '#7aff9a' });
      const b = D.b, sp = D.sp;
      if (D.result === 'perfect') { this.superSaved(b, D.keeper, 'catch'); this.addEuphoria(D.keeper.side, 15, 'duel'); }
      else if (D.result === 'good') this.superSaved(b, D.keeper, 'parry');
      else { b.held = false; b.superPath = sp; sp.paused = false; b.superPathHold = null; D.keeper.diveSign = 1; D.keeper.diveV = clamp((sp.to.y - D.keeper.body.y) * 3, -200, 200); D.keeper.diveHigh = true; D.keeper.setState('keeper-dive', .8); D.keeper.into = true; }
    }
  },
  superSaved(b, k, how) {
    b.superPath = null; b.superPathHold = null; b.decoys = null; b.shot = null; b.held = false; this.touch(k);
    const out = this.ownGoalX(k.side) === P.X0 ? 1 : -1;
    if (how === 'catch') { this.setOwner(k, 'catch'); k.holding = true; this.emit('save', { who: k, kind: 'super', shooter: this.lastKick }); }
    else { b.vx = out * 150; b.vy = (this.rng() - .5) * 220; b.vz = 90; this.emit('save', { who: k, kind: 'superParry', shooter: this.lastKick }); this.emit('parry', { who: k }); }
    this.stats.saves[k.side]++; this.emit('superSaved', { who: k, how });
    k.tilt = null; k.setState('run'); k.look.pose = 'cheer';
  },
  /* ---- tactics' gimmicks: catenaccio's bus and 3-1, the galacticos' Golden Moment (section 6.13) ---- */
  gimmickStep(dt) {
    if (this.pure || this.kind === 'training' || this.shootout) return;
    for (const s of [0, 1]) {
      const g = this.tactic[s].gimmick, lead = this.score[s] > this.score[1 - s];
      if (g === 'catenaccio' && lead && this.minute >= 60 && this.half < 3 && !this.bus && !this.busDone) {
        const gx = this.ownGoalX(s); this.bus = { side: s, x: gx + this.dir(s) * 12, y: P.CY, w: 60, d: 18, h: 30, t: 0, state: 'arrive', from: P.Y1 + 60 };
        this.emit('bus', { side: s }); this.note('THE BUS IS PARKED', { dur: 2, big: false });
        if (this.formation[s].id !== '3-1') this.setFormation(s, '3-1');
      }
      if (g === 'galacticos' && !this.goldenMoment && this.minute >= 80 && this.half === 2 && this.score[s] <= this.score[1 - s] && !this.europhoria) {
        this.goldenMoment = true; this.euphoria[s] = 100; this.triggerEuphoria(s, this.side[s].find(f => f.data.captain));
        this.emit('goldenMoment', { side: s }); this.note('THE GOLDEN MOMENT', { sub: this.teams[s].name, dur: 2 });
      }
    }
    const BU = this.bus; if (!BU) return;
    BU.t += dt;
    if (BU.state === 'arrive') { const u = Math.min(1, BU.t / 2.5); BU.y = lerp(BU.from, P.CY, ease.outCubic(u)); if (u >= 1) BU.state = 'parked'; }
    if (BU.smash && BU.state === 'parked' && (!this.ball.superPath || Math.abs(this.ball.x - BU.x) < 20)) { BU.state = 'leave'; BU.t = 0; this.addEuphoria(1 - BU.side, 10, 'bus'); this.emit('busSmashed', { side: BU.side }); }
    if (BU.state === 'leave') { BU.y = P.CY + ease.inQuad(Math.min(1, BU.t / 2)) * 420; if (BU.t > 2) { this.bus = null; this.busDone = true; return; } }
    // the bus is solid: the ball bounces off it, bodies stay out
    const b = this.ball, inX = Math.abs(b.x - BU.x) < BU.d / 2 + b.r, inY = Math.abs(b.y - BU.y) < BU.w / 2 + b.r;
    if (inX && inY && b.z < BU.h && !b.superPath && !this.owner) {
      const ox = BU.d / 2 + b.r - Math.abs(b.x - BU.x), oy = BU.w / 2 + b.r - Math.abs(b.y - BU.y);
      if (ox < oy) { b.x += Math.sign(b.x - BU.x) * ox; b.vx = -b.vx * .5; } else { b.y += Math.sign(b.y - BU.y) * oy; b.vy = -b.vy * .5; }
      if (BU.state === 'parked' && this.t - (BU.hitT || -9) > .4) { BU.hitT = this.t; this.emit('busHit', { x: b.x, y: b.y }); }
    }
    for (const f of this.players) { const B = f.body; if (Math.abs(B.x - BU.x) < BU.d / 2 + 5 && Math.abs(B.y - BU.y) < BU.w / 2 + 5) { const ox = BU.d / 2 + 5 - Math.abs(B.x - BU.x), oy = BU.w / 2 + 5 - Math.abs(B.y - BU.y); if (ox < oy) B.x += Math.sign(B.x - BU.x || 1) * ox; else B.y += Math.sign(B.y - BU.y || 1) * oy; } }
  },
  /* ---- celebrations (section 6.21): the scorer runs to the corner or his fans; four to pick from for 1.2 s ---- */
  startCelebration(f) {
    const all = EF.all('celebration'), sig = EF.get('celebration', f.data.celebration || f.team.celebration) || all[0];
    const R = this.rng, others = H.shuffle(R, all.filter(c => c !== sig && !c.pair)).slice(0, 3), offer = [sig].concat(others);
    const cx = f.body.x > P.CX ? P.X1 - 30 : P.X0 + 30, cy = f.body.y > P.CY ? P.Y1 - 20 : P.Y0 + 20;
    this.celebration = { who: f, offer, pick: null, t: 0, dur: 2.6, to: [lerp(f.body.x, cx, .7), lerp(f.body.y, cy, .7)], human: f.human && !f.human.cpu ? f.human : null };
    f.order = { kind: 'celebrate', to: this.celebration.to, t: 6 };
    for (const q of this.side[f.side]) if (q !== f && q.role !== 'GK') q.order = { kind: 'pile', to: [this.celebration.to[0] + (q.idx - 2) * 8, this.celebration.to[1] + 8], t: 6 };
  },
  celebrationStep(dt) {
    const C = this.celebration; if (!C) return; C.t += dt; const f = C.who;
    if (!C.pick) {
      if (C.human) { const pr = C.human.ctl.peek(); const i = pr.pass ? 0 : pr.shoot ? 1 : pr.lob ? 2 : pr.through ? 3 : pr.cel >= 0 ? pr.cel : -1; if (i >= 0) C.pick = C.offer[i]; }
      if (!C.pick && (C.t > 1.2 || !C.human)) C.pick = C.offer[0];
      if (C.pick) { C.playT = 0; f.clip = C.pick.clip ? { name: C.pick.clip, t: 0, w: 1, speed: C.pick.speed || 1 } : null; f.proc = C.pick.proc || null; f.expr = 'shout';
        if (C.pick.proc === 'fishslap') { const mate = this.outfield(f.side).filter(q => q !== f).sort((a, b) => H.d(a.body, f.body) - H.d(b.body, f.body))[0]; if (mate) { mate.proc = 'fishslap'; mate.order = { kind: 'pile', to: [f.body.x + 10, f.body.y], t: 6 }; C.partner = mate; } }
        this.addEuphoria(f.side, C.pick.euphoria || 8, 'celebration'); this.emit('celebrate', { who: f, id: C.pick.id, name: C.pick.name }); if (C.pick.card && game.settings.cards !== 'off') this.queueCard(f, 'yellow', 'shirt'); }
    }
    if (C.pick) { C.playT += dt; if (C.pick.travel && C.playT < 1) { const a = f.facing; f.body.vx = Math.cos(a) * C.pick.travel * (1 - C.playT); f.body.vy = Math.sin(a) * C.pick.travel * (1 - C.playT); } }
    for (const q of this.side[f.side]) if (q !== f && q.order && q.order.kind === 'pile' && !q.clip && H.d(q.body, f.body) < 26) { q.clip = { name: q.idx % 2 ? 'Victory' : 'Cheer_One_arm', t: 0, w: 1 }; q.expr = 'shout'; }
    f.celebrate = C;
  },
  endCelebration() { const C = this.celebration; if (C) { C.who.celebrate = null; C.who.clip = null; C.who.pose = null; C.who.tilt = null; C.who.proc = null; C.who.expr = null; } for (const q of this.players) { if (q.order && (q.order.kind === 'pile' || q.order.kind === 'celebrate')) q.order = null; q.clip = null; q.pose = null; q.proc = null; q.expr = null; } this.celebration = null; }
});
/* the super's charge-up as a footballer state */
Object.assign(Footballer.prototype, {
  superHold() { const B = this.body; B.vx = B.vy = 0; this.look.pose = 'cast'; }
});
/* ==== src/20-events.js ==== */
/* MATCHDAY EVENTS (section 6.20): registry 'event' { stadiums, chance, when: { minute: [a, b], ballLoose }, start(m),
 * update(m, dt) -> true when finished, lines }. At most one a half; none at set pieces or in the last 5 minutes. All
 * through m.rng, so a seed replays them. The presentation draws each from its state (m.events). */
Object.assign(Match.prototype, {
  eventsStep(dt) {
    for (const ev of this.events.slice()) { let done = false; try { done = ev.def.update(this, ev, dt); } catch (e) { game.fail('event ' + ev.def.id, e); done = true; } ev.t += dt; if (done) { this.events.splice(this.events.indexOf(ev), 1); if (ev.def.done) ev.def.done(this, ev); this.emit('eventEnd', { id: ev.def.id }); } }
    if (this.mode !== 'play' || this.half >= 3 || this.eventsDone[this.half] || this.minute > 85 || this.events.length || this.kind === 'training') return;
    this.evCheckT = (this.evCheckT || 0) - dt; if (this.evCheckT > 0) return; this.evCheckT = 1;
    for (const def of EF.all('event')) {
      if (def.cosmetic || !(this.stadium.events || []).includes(def.id)) continue;
      const w = def.when || {}, mn = this.minute;
      if (w.minute && (mn < w.minute[0] * (this.half === 1 ? .5 : 1) || mn > w.minute[1])) continue;
      if (w.night && this.timeOfDay === 'day') continue;
      if (w.ballLoose && (this.owner || this.ball.speed() > 60 || this.ball.z > 2)) continue;
      if (this.rng() > (def.chance || .5) / 25 * (this.forceEvent === def.id ? 999 : 1)) continue;
      this.startEvent(def.id); break;
    }
  },
  startEvent(id) {
    const def = EF.get('event', id); if (!def) return null;
    const ev = { def, t: 0, id }; this.events.push(ev); this.eventsDone[this.half] = 1;
    try { def.start(this, ev); } catch (e) { game.fail('event ' + id, e); }
    this.emit('event', { id, name: def.name }); return ev;
  }
});
/* seagull: lands on a loose, slow ball and pins it until a player runs within 10 */
EF.def('event', 'seagull', { name: 'SEAGULL', stadiums: ['smokehouse'], chance: .7, when: { minute: [10, 80], ballLoose: true }, lines: 'event-seagull',
  start(m, ev) { const b = m.ball; ev.x = b.x + 60; ev.y = b.y - 40; ev.z = 70; ev.state = 'fly'; },
  update(m, ev, dt) {
    const b = m.ball;
    if (ev.state === 'fly') { ev.x = lerp(ev.x, b.x, dt * 3); ev.y = lerp(ev.y, b.y, dt * 3); ev.z = Math.max(4, ev.z - dt * 60); if (ev.z <= 4.5 && H.d2(ev.x, ev.y, b.x, b.y) < 4) { if (m.owner) { ev.state = 'away'; return false; } ev.state = 'sit'; b.held = true; b.heldBy = null; b.vx = b.vy = 0; m.emit('gullLand', {}); } return ev.t > 6; }
    if (ev.state === 'sit') { ev.x = b.x; ev.y = b.y; ev.z = 4; if (m.players.some(f => H.d(f.body, b) < 10) || ev.t > 9 || m.mode !== 'play') { ev.state = 'away'; b.held = false; m.emit('gullAway', {}); } return false; }
    ev.z += dt * 50; ev.x += dt * 90; ev.y -= dt * 30; return ev.z > 160;
  } });
/* beach ball: a fan throws one on; it deflects the real ball and bodies for 20 s, then the referee pops it */
EF.def('event', 'beachball', { name: 'BEACH BALL', stadiums: ['pasapasa'], chance: .7, when: { minute: [10, 80] }, lines: 'event-beachball',
  start(m, ev) { ev.body = new E.Body({ x: P.CX + (m.rng() - .5) * 300, y: P.Y0 - 10, r: 7, bounce: .9, gravity: 200, friction: 0 }); ev.body.z = 40; ev.body.vy = 90; ev.body.vz = 60; ev.body.onGround = false; },
  update(m, ev, dt) {
    const B = ev.body, b = m.ball; B.vx *= Math.exp(-dt * .6); B.vy *= Math.exp(-dt * .6); B.update(dt, m.pitch.map);
    B.x = clamp(B.x, P.X0 + 8, P.X1 - 8); B.y = clamp(B.y, P.Y0 + 8, P.Y1 - 8);
    const d = H.d(B, b); if (d < 10 && Math.abs(b.z - B.z) < 12 && !m.owner) { const a = H.ang(B, b), sp = Math.max(60, b.speed() * .8); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; B.vx -= Math.cos(a) * 40; B.vy -= Math.sin(a) * 40; B.vz = 70; m.emit('beachHit', {}); }
    for (const f of m.players) if (H.d(f.body, B) < 12) { const a = H.ang(f.body, B); B.vx = Math.cos(a) * 110; B.vy = Math.sin(a) * 110; B.vz = 90; B.onGround = false; }
    if (ev.t > 20 && !ev.popped) { ev.popped = true; m.emit('beachPop', { x: B.x, y: B.y }); }
    return ev.t > 20.4;
  } });
/* pitch invader: Kipper Keith (the Smokehouse) or the Steel Stag; stewards chase; a human who tackles him gets Euphoria and a sticker */
const invader = (id, who, stadium) => EF.def('event', id, { name: who, stadiums: [stadium], chance: .6, when: { minute: [20, 75] }, lines: 'event-invader', who,
  start(m, ev) { ev.body = new E.Body({ x: P.X0 + 80 + m.rng() * (P.L - 160), y: P.Y1 + 20, r: 6, gravity: 700 }); ev.zig = 0; ev.stewards = [0, 1].map(i => new E.Body({ x: ev.body.x + (i ? 30 : -30), y: P.Y1 + 34, r: 5, gravity: 700 })); ev.kind = id; ev.facing = -Math.PI / 2; },
  update(m, ev, dt) {
    const B = ev.body; ev.zig += dt;
    if (!ev.caught) { const tx = B.x + Math.sin(ev.zig * 2.4) * 60, ty = P.Y0 - 20; const d = H.d2(tx, ty, B.x, B.y) || 1; B.vx = (tx - B.x) / d * 95; B.vy = (ty - B.y) / d * 95; ev.facing = Math.atan2(B.vy, B.vx); }
    else { B.vx = approach(B.vx, 0, 300 * dt); B.vy = approach(B.vy, 0, 300 * dt); }
    B.update(dt, m.pitch.map); B.x += B.vx * 0;
    for (const s of ev.stewards) { const d = H.d(s, B) || 1; s.vx = (B.x - s.x) / d * 88; s.vy = (B.y - s.y) / d * 88; s.update(dt, m.pitch.map); if (d < 9 && !ev.caught && ev.t > 3) { ev.caught = 'stewards'; ev.caughtT = ev.t; m.emit('invaderCaught', { by: 'stewards' }); } }
    const b = m.ball; if (!m.owner && H.d(B, b) < 8 && b.z < 20) { const a = H.ang(B, b), sp = Math.max(60, b.speed() * .7); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; m.emit('invaderBall', {}); }
    for (const f of m.players) {
      if (!ev.caught && H.d(f.body, B) < 9 && (f.state === 'slide' || f.state === 'poke' || f.state === 'barge')) {
        ev.caught = 'player'; ev.caughtT = ev.t; if (f.human) { m.addEuphoria(f.side, 10, 'invader'); m.emit('invaderTackled', { who: f, id }); } else m.emit('invaderCaught', { by: 'player' });
      }
    }
    if (ev.caught) { ev.down = true; return ev.t - ev.caughtT > 2.5; }
    return B.y < P.Y0 - 10 || ev.t > 14;
  } });
invader('invader-keith', 'KIPPER KEITH', 'smokehouse'); invader('invader-stag', 'THE STEEL STAG', 'stahlpresse');
/* floodlight flicker (night matches): the lights stutter and fail for 4 s */
EF.def('event', 'floodlight', { name: 'FLOODLIGHT FAILURE', stadiums: ['smokehouse', 'stahlpresse'], chance: .6, when: { minute: [15, 80], night: true }, lines: 'event-floodlight',
  start(m, ev) { m.lightsOut = 0; },
  update(m, ev) { const t = ev.t; m.lightsOut = t < .8 ? (Math.floor(t * 12) % 2) : t < 4.8 ? 1 : t < 5.4 ? (Math.floor(t * 14) % 2) : 0; if (t > 5.4) { m.lightsOut = 0; return true; } return false; } });
/* flare smoke (Lucchetto): red smoke drifts across a band of the pitch for 15 s; cosmetic */
EF.def('event', 'flaresmoke', { name: 'FLARE SMOKE', stadiums: ['lucchetto'], chance: .7, when: { minute: [10, 80] }, lines: 'event-smoke',
  start(m, ev) { ev.x = P.X0 + m.rng() * P.L; ev.dir = m.rng() < .5 ? -1 : 1; },
  update(m, ev, dt) { ev.x += ev.dir * dt * 22; return ev.t > 15; } });
/* drone (the Euphorium): a camera drone flies over; cosmetic */
EF.def('event', 'drone', { name: 'DRONE', stadiums: ['euphorium'], chance: .7, when: { minute: [10, 80] }, lines: 'event-drone',
  start(m, ev) { ev.x = P.X0 - 60; ev.y = P.CY + (m.rng() - .5) * 200; },
  update(m, ev, dt) { ev.x += dt * 70; ev.y += Math.sin(ev.t * 1.3) * dt * 20; return ev.x > P.X1 + 80; } });
/* fireworks: at goals and Europhoria in the Euphorium (the presentation fires them; listed for the dev menu) */
EF.def('event', 'fireworks', { name: 'FIREWORKS', stadiums: ['euphorium'], chance: 0, cosmetic: true, lines: 'event-fireworks',
  start(m, ev) { ev.n = 0; }, update(m, ev) { return ev.t > 3; } });
/* ==== src/21-camera.js ==== */
/* THE CAMERA (section 6.14): a TV director. Focus: the ball plus 0.3 s of its flight, pulled toward the human's
 * player, raised with lofted balls; zoom by context (set pieces, corners, goals, the super strike, the shootout);
 * slow motion, hit-stop, shake and flashes (the engine's, which follow the comfort settings). */
EF.Camera = {
  z: 1, want: 1, yaw: 0, wantYaw: 0, shake: 0,
  reset(m, map) {
    const c = game.cam; c.smooth = .15; c.bounds = v => map.bounds(v); c.frame && c.frame(null);
    this.z = 1; this.want = 1; this.yaw = 0; this.wantYaw = 0; game.resetCamera(); game.setZoom(1);
    if (m) { const b = m.ball; game.focus(b.x, b.y, 0); }
  },
  view() { const v = EF.CAMERAS[game.settings.camera] || 'broadcast'; return v; },
  update(dt, m, src) {
    const b = src.ball, T = game.timeScale || 1, real = dt / Math.max(.05, T);
    let fx = b.x + (b.vx || 0) * .3, fy = b.y + (b.vy || 0) * .3, fz = (b.z || 0) * .4, zoom = 1, yaw = 0;
    const h = m.humans.find(q => q.fb && !q.cpu && !q.remote);
    if (h && h.fb && !src.replay) { fx = lerp(fx, h.fb.body.x, .25); fy = lerp(fy, h.fb.body.y, .25); }
    const SP = m.setpiece, mode = m.mode;
    if (src.replay) { zoom = 1.18; yaw = src.replay.yaw; fx = b.x; fy = b.y; }
    else if (mode === 'shootout' || (SP && SP.pen)) { const pk = m.shootout ? m.shootout.kick : SP.pen; if (pk) { fx = lerp(pk.spot.x, pk.gx, .45); fy = P.CY; zoom = 1.25; } }
    else if (SP && SP.kind === 'corner' && !SP.taken) { fx = lerp(b.x, SP.info.gx + SP.into * 70, .6); fy = lerp(b.y, P.CY, .55); zoom = .92; }
    else if (SP && !SP.taken && SP.kind === 'freekick' && SP.shootable) { const gx = m.goalX(SP.side); fx = lerp(b.x, gx, .5); fy = lerp(b.y, P.CY, .5); zoom = .95; }
    else if (SP && !SP.taken && SP.stage !== 'setup' && SP.kind !== 'kickoff') { zoom = 1.12; }
    else if (mode === 'goal' || mode === 'celebrate') { const c = m.celebration; if (c) { fx = c.who.body.x; fy = c.who.body.y; } zoom = 1.2; }
    else if (m.superSeq) { fx = m.superSeq.who.body.x; fy = m.superSeq.who.body.y; zoom = 1.15; }
    else if (m.duel) { const k = m.duel.keeper; fx = lerp(b.x, k.body.x, .6); fy = lerp(b.y, k.body.y, .6); zoom = 1.18; }
    else if (mode === 'card' && m.cardNow) { fx = m.cardNow.who.body.x; fy = m.cardNow.who.body.y; zoom = 1.12; }
    else if (mode === 'kickoff') { fx = P.CX; fy = P.CY; zoom = 1.05; }
    // co-op and versus: when humans are far apart, widen toward them
    const hs = m.humans.filter(q => q.fb && !q.cpu && !q.remote);
    if (hs.length > 1 && !src.replay) { let span = 0; for (const q of hs) span = Math.max(span, H.d(q.fb.body, b)); zoom = Math.min(zoom, clamp(1.15 - (span - 120) / 600, .82, 1)); }
    this.want = zoom; this.wantYaw = yaw;
    this.z = approach(this.z, this.want, real * 1.2 * Math.max(.2, Math.abs(this.want - this.z) * 4));
    if (Math.abs(game.zoomGame || 0) !== this.z) game.setZoom(this.z), game.zoomGame = this.z;
    if (this.yaw !== this.wantYaw) { const d = this.wantYaw - this.yaw; game.rotateView(d); this.yaw = this.wantYaw; }
    game.focus(fx, fy, fz);
  }
};
/* ==== src/22-replay.js ==== */
/* ACTION REPLAY (section 6.15): a ring buffer of the last 8 s at 60 Hz (every other step) of the ball, every
 * footballer, the referee and the event actors, with the sound cues; played back after a goal from 4.5 s before it,
 * at half speed, from a turned camera, with a REPLAY tag. The rigs are driven from the recorded states. */
const clone = o => o ? JSON.parse(JSON.stringify(o)) : o;
class Replay {
  constructor(m) { this.m = m; this.buf = []; this.max = 8 * 60; this.step = 0; this.playing = null; this.proxy = null; }
  record() {
    const m = this.m; if (this.step++ % 2) return;
    const b = m.ball, fr = { t: m.t, b: [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.roll, b.superPath ? b.superPath.kind : null, b.screamer ? 1 : 0, b.decoys ? 1 : 0], p: [], r: null, ev: [], bus: m.bus ? [m.bus.x, m.bus.y, m.bus.side, m.bus.state] : null, cues: this.cues || [] };
    this.cues = [];
    for (const f of m.players) { const B = f.body, L = f.look; fr.p.push([B.x, B.y, B.z, B.vx, B.vy, f.facing, f.kickName, f.kickT, f.state, { pose: L.pose, expr: L.expr, tilt: L.tilt ? Object.assign({}, L.tilt) : null, down: L.down, air: L.air, sprint: L.sprint, hurt: L.hurt, spin: L.spin, clip: L.clip ? Object.assign({}, L.clip) : null }, f.sentOff, f.ghost, f.charging ? f.charge : 0]); }
    const R = m.ref, RB = R.body; fr.r = [RB.x, RB.y, RB.z, RB.vx, RB.vy, R.facing, clone(R.look)];
    for (const e of m.events) fr.ev.push({ id: e.id, x: e.x || (e.body && e.body.x), y: e.y || (e.body && e.body.y), z: e.z || (e.body && e.body.z) || 0, state: e.state, caught: e.caught, popped: e.popped });
    this.buf.push(fr); if (this.buf.length > this.max) this.buf.shift();
  }
  cue(type) { (this.cues || (this.cues = [])).push(type); }
  /** start playing: from 4.5 s before the goal to 0.8 s after it, at half speed */
  start(goalT) {
    if (!this.buf.length) return false;
    const t0 = Math.max(this.buf[0].t, goalT - 4.5), t1 = Math.min(this.buf[this.buf.length - 1].t, goalT + .8);
    if (t1 - t0 < .5) return false;
    this.playing = { t: t0, t0, t1, yaw: EF.fxRng() < .5 ? -45 : 45, i: 0 };
    this.makeProxy();
    return true;
  }
  makeProxy() {
    const m = this.m;
    this.proxy = { replay: this.playing, ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, roll: 0, r: 3, trail: [], superPath: null, screamer: false, decoys: null, speed() { return Math.hypot(this.vx, this.vy); } },
      players: m.players.map(f => ({ id: f.id, side: f.side, data: f.data, team: f.team, role: f.role, idx: f.idx, body: { x: 0, y: 0, z: 0, vx: 0, vy: 0, r: 5 }, facing: 0, look: {}, kickName: null, kickT: 0, state: 'run', human: null, sentOff: false, ghost: false, charge: 0, charging: false, celebrate: null, short: f.short, stamina: 100 })),
      ref: { body: { x: 0, y: 0, z: 0, vx: 0, vy: 0 }, facing: 0, look: {}, data: m.ref.data }, events: [], bus: null, m };
  }
  stop() { this.playing = null; this.proxy = null; }
  /** advance the replay clock (dt is real game dt): returns false when it has ended */
  advance(dt) {
    const P0 = this.playing; if (!P0) return false;
    P0.t += dt * .5; if (P0.t >= P0.t1) return false;
    const B = this.buf; let i = Math.max(0, P0.i); while (i < B.length - 2 && B[i + 1].t <= P0.t) i++; P0.i = i;
    const a = B[i], c = B[Math.min(B.length - 1, i + 1)], k = c.t > a.t ? clamp((P0.t - a.t) / (c.t - a.t), 0, 1) : 0, X = this.proxy;
    const bb = X.ball; [bb.x, bb.y, bb.z, bb.vx, bb.vy, bb.vz, bb.roll] = a.b.slice(0, 7).map((v, j) => lerp(v, c.b[j], k));
    bb.superPath = a.b[7] ? { kind: a.b[7] } : null; bb.screamer = !!a.b[8]; bb.decoys = a.b[9] ? [{ k: -1, alive: true }, { k: 1, alive: true }] : null;
    if (bb.screamer || bb.superPath) { bb.trail.push([bb.x, bb.y, bb.z]); if (bb.trail.length > 14) bb.trail.shift(); } else bb.trail.length = 0;
    a.p.forEach((q, j) => { const f = X.players[j], n = c.p[j]; for (const [key, idx] of [['x', 0], ['y', 1], ['z', 2], ['vx', 3], ['vy', 4]]) f.body[key] = lerp(q[idx], n[idx], k); f.facing = q[5] + E.angDiff(q[5], n[5]) * k; f.kickName = q[6]; f.kickT = q[7] + (q[6] === n[6] ? (n[7] - q[7]) * k : 0); f.state = q[8]; f.look = q[9]; f.sentOff = q[10]; f.ghost = q[11]; f.charge = q[12]; f.charging = q[12] > 0; });
    const R = X.ref; [R.body.x, R.body.y, R.body.z, R.body.vx, R.body.vy] = a.r.slice(0, 5).map((v, j) => lerp(v, c.r[j], k)); R.facing = a.r[5]; R.look = a.r[6];
    X.events = a.ev; X.bus = a.bus ? { x: a.bus[0], y: a.bus[1], side: a.bus[2], state: a.bus[3], w: 60, d: 18, h: 30 } : null;
    if (i !== this.lastCueI) { this.lastCueI = i; for (const cue of a.cues) EF.bus.emit('replayCue', { cue }); }
    return true;
  }
}
EF.Replay = Replay;
/* ==== src/23-commentary.js ==== */
/* COMMENTARY (section 6.17): BARRY BELLOW (play-by-play) and TREV BRICKLEY (co-commentary), on the radio box with live
 * portraits and babble voices. Each event maps to a line pool (registry 'lines'); priorities, an 8 s cooldown per
 * event, 3.5 s between lines, a higher priority interrupts, no line twice in a match, {$vars}, replies, idle chatter.
 * The PA (the stadium's announcer) has its own box at the top with a chime. */
const COMM = {
  kickoff: ['kickoff', 10], goal: ['goal', 100], ownGoal: ['ownGoal', 100], superStrike: ['super', 95], penaltyAwarded: ['penalty', 80], woodwork: ['woodwork', 70],
  var: ['var', 60], diveBooked: ['diveBooked', 55], diveWon: ['diveWon', 55], dive: ['dive', 52], save: ['save', 50], nearMiss: ['nearMiss', 45], launched: ['launched', 42], foul: ['foul', 40],
  europhoria: ['europhoria', 85], bus: ['bus', 85], busSmashed: ['busSmashed', 86], goldenMoment: ['goldenMoment', 85], half: ['halftime', 90], fulltime: ['fulltime', 90], extraTime: ['extratime', 80],
  shootoutStart: ['shootout', 80], advantage: ['advantage', 30], corner: ['corner', 15], refHit: ['refHit', 50], celebrate: ['celebrate', 35], stoppage: ['stoppage', 20], replayStart: ['replay', 20],
  nutmeg: ['nutmeg', 32], rainbow: ['skill', 30], tackleWon: ['tackle', 25], header: ['header', 45], volley: ['volley', 45], bicycle: ['bicycle', 47], sendOff: ['red', 85], keeperEarly: ['keeperEarly', 40]
};
class Commentary {
  constructor(m) {
    this.m = m; this.used = new Set(); this.cool = {}; this.lastT = -99; this.cur = 0; this.queue = []; this.idleT = 0; this.heard = 0; this.on = game.settings.commentary !== false && m.kind !== 'training';
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', speed: 36, border: '#ffc83a', bg: '#0d1430', nameColor: '#ffc83a', voice: null });
    this.pa = new E.Dialog(game, { lines: 2, place: 'top', speed: 32, border: '#9aa6c8', bg: '#16182a', nameColor: '#9aa6c8', voice: null });
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.event(ev); });
    this.paQueue = [];
  }
  dispose() { if (this.unsub) this.unsub(); this.talk.close(); this.pa.close(); }
  vars(ev) {
    const m = this.m, who = ev && ev.who && ev.who.data ? ev.who : m.lastKick || m.owner, s = who ? who.side : ev && ev.side !== undefined ? ev.side : 0, k = m.keeper(1 - s);
    return { player: who ? who.short : 'him', team: m.teams[s].short === 'KIP' ? 'Kipperton' : titleCase(m.teams[s].name), opp: titleCase(m.teams[1 - s].name), score: m.score[0] + '-' + m.score[1], minute: Math.floor(m.minute) + 1, stadium: titleCase(m.stadium.name), keeper: k ? k.short : 'the keeper', ref: titleCase(m.ref.data.name).split(' ').slice(-1)[0], city: titleCase(m.stadium.city) };
  }
  event(ev) {
    if (!this.on) return;
    const m = this.m; let map = COMM[ev.type]; if (!map) {
      if (ev.type === 'card') map = ev.color === 'red' ? ['red', 85] : ['card', 65];
      else if (ev.type === 'saveDuelResult') map = ['duel-' + ev.result, 90];
      else if (ev.type === 'event') map = ['event-' + ev.id.replace(/^invader-.*/, 'invader'), 60];
      else if (ev.type === 'shootoutKick') map = [ev.panenka && ev.scored ? 'panenka' : ev.scored ? 'shootoutScore' : 'shootoutMiss', 70];
      else if (ev.type === 'skill' && ev.kind !== 'knockon') map = ['skill', 30];
      else if (ev.type === 'invaderTackled') map = ['invaderTackled', 70];
      else if (ev.type === 'gullLand') map = ['event-seagull', 60];
      else if (ev.type === 'superSaved') map = ['superSaved', 92];
      else return;
    }
    if ((ev.type === 'header' || ev.type === 'volley') && !ev.atGoal) return;
    if (ev.type === 'tackleWon' && ev.kind !== 'slide') return;
    if (ev.type === 'goal' && ev.shootout) return;
    this.say(map[0], map[1], ev, ev.type);
  }
  /** a line from a pool, if it may speak now */
  say(pool, pri, ev, key) {
    const m = this.m, now = m.t, P0 = EF.get('lines', pool); if (!P0) return false;
    if (key && this.cool[key] > now) return false;
    if (this.talk.open && pri <= this.cur) { if (pri >= 60 && this.queue.length < 2) this.queue.push([pool, pri, ev, key]); return false; }
    if (!this.talk.open && now - this.lastT < 3.5 && pri < 60) return false;
    const vars = this.vars(ev), ok = P0.entries.filter((e, i) => !this.used.has(pool + i) && (!e.when || safeWhen(e.when, m, ev)));
    const list = ok.length ? ok : P0.entries.filter(e => !e.when || safeWhen(e.when, m, ev)); if (!list.length) return false;
    const e = EF.fxPick(list); this.used.add(pool + P0.entries.indexOf(e));
    if (key) this.cool[key] = now + 8;
    this.show(e.who, e.text, vars, pri); this.queue = this.queue.filter(q => q[1] > pri);
    if (e.reply) this.queue.unshift(['__reply', pri, { reply: e.reply, vars }, null]);
    return true;
  }
  show(who, text, vars, pri) {
    this.cur = pri; this.lastT = this.m.t; this.idleT = 0; this.heard++;
    this.talk.say(H.fill(text, vars), { name: EF.Cast.name(who), portrait: EF.Cast.rig(who), portraitSize: 30, portraitOpts: { zoom: 3, turn: .35 }, auto: 1.8, modal: false, alpha: .86, voice: EF.babble.voiceFor(who) });
    EF.bus.emit('commentaryLine', { who, match: this.m });
  }
  /** the PA: "ding-dong", a line at the top in the announcer's echoing voice */
  announce(text) { this.paQueue.push(text); }
  update(dt) {
    this.talk.update(dt); this.pa.update(dt);
    // the PA: a slim strip under the score bug, typed out with the announcer's echoing voice
    const S = this.paStrip;
    if (S) { const was = Math.floor(S.shown); S.shown = Math.min(S.text.length, S.shown + dt * 30); for (let i = was; i < Math.floor(S.shown); i++) EF.babble.syllable(EF.Cast.voice('pa'), S.text[i], i, S.text); S.t += dt; if (S.t > S.text.length / 30 + 2.6) this.paStrip = null; }
    else if (this.paQueue.length) { const t = this.paQueue.shift(); EF.sfx('ding'); this.paStrip = { text: t, shown: 0, t: 0 }; }
    if (!this.on) return;
    if (!this.talk.open) {
      this.cur = 0;
      const q = this.queue.shift();
      if (q) { if (q[0] === '__reply') this.show(q[2].reply.who, q[2].reply.text, q[2].vars, q[1]); else this.say(q[0], q[1], q[2], null); }
      else if (this.m.mode === 'play') { this.idleT += dt; if (this.idleT > 12) { this.idleT = 0; this.idle(); } }
    }
  }
  idle() {
    const m = this.m, w = m.weather && m.weather.kind, pools = ['idle', 'idle-' + m.stadium.id];
    if (w) pools.push('weather-' + w); else if (m.timeOfDay === 'day') pools.push('weather-sun');
    if (m.fog > .3) pools.push('weather-fog');
    if (m.score[0] !== m.score[1]) pools.push('idle-lead');
    for (const p of H.shuffle(EF.fxRng, pools)) if (this.say(p, 5, {}, null)) return;
  }
  draw(r) {
    if (this.on || this.talk.open) this.talk.draw(r);
    const S = this.paStrip; if (!S) return;
    r.overlay(g => { const mx = Math.max(6, Math.round(r.W * .035)), y = Math.max(5, Math.round(r.H * .035)) + 34, w = Math.min(r.W - 2 * mx - 110, 300), lines = E.font.wrap('PA  ' + S.text, w - 8); E.ui.box(g, mx, y, w, 6 + lines.length * 9, { bg: '#16182a', border: '#5a6a8a', alpha: .82 }); let n = Math.floor(S.shown) + 4; lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, n)); n -= ln.length + 1; E.font.text(g, part, mx + 4, y + 3 + i * 9, i === 0 ? '#c8d0e8' : '#c8d0e8', { outline: false }); }); E.font.text(g, 'PA', mx + 4, y + 3, '#ffc83a', { outline: false }); });
  }
}
const titleCase = s => String(s).toLowerCase().replace(/(^|[\s'-])([a-zà-ü])/g, (a, b, c) => b + c.toUpperCase());
const safeWhen = (fn, m, ev) => { try { return !!fn(m, ev || {}); } catch (e) { return false; } };
EF.Commentary = Commentary;
EF.titleCase = titleCase;
/* ==== src/24-hud.js ==== */
/* THE HUD (section 6.16), 10-foot: in screen pixels, inside a safe margin, clear of the corner's buttons. The score bug
 * with crests and Euphoria gauges, name tags, the power meter, reticles, the radar, notices, context and set-piece
 * prompts, the Save Duel ring, shootout dots, the VAR lower third, off-screen arrows. */
EF.HUD = {
  margin(r) { return [Math.max(6, Math.round(r.W * .035)), Math.max(5, Math.round(r.H * .035))]; },
  draw(r, m, src, o = {}) {
    const [mx, my] = this.margin(r);
    this.world(r, m, src);
    r.overlay(g => {
      if (!src.replay) this.tags(g, r, m);
      if (m.kind !== 'training') this.scoreBug(g, r, m, mx, my);
      if (game.settings.radar !== false && !src.replay && !m.shootout && m.kind !== 'training') this.radar(g, r, m, mx, my);
      if (src.replay) this.replayTag(g, r, mx, my);
      else {
        this.notice(g, r, m);
        if (m.shootout) this.shootoutDots(g, r, m, my);
        if (m.mode === 'var') this.varBar(g, r, m);
        this.prompts(g, r, m, mx, my);
        if (m.duel) this.duelText(g, r, m);
        this.arrows(g, r, m);
      }
      if (EF.tuneChanged() && !EF.inSession) E.font.text(g, 'DEV TUNING', r.W - mx, r.H - my - 8, '#ff7a3a', { align: 'right', font: 'tiny', outline: '#000' });
    });
  },
  /* ---- world-anchored: the power meter, reticles, the Save Duel ring ---- */
  world(r, m, src) {
    if (src.replay) return;
    const SP = m.setpiece;
    for (const f of m.players) if (f.charging && f.charge > 0 && !f.ghost) {
      const B = f.body; r.queue(B.x, B.y, 46, g => { const p = r.w(B.x, B.y, 44), x = Math.round(p[0]) - 13, y = Math.round(p[1]) - 6; px.rect(g, x - 1, y - 1, 28, 6, '#0a0a12'); px.rect(g, x, y, Math.round(26 * f.charge), 4, f.charge > .9 ? '#ff5a3a' : '#ffd36a'); px.rect(g, x + Math.round(26 * .78), y - 1, Math.round(26 * .12), 1, '#ffe070'); px.rect(g, x + Math.round(26 * .78), y + 4, Math.round(26 * .12), 1, '#ffe070'); if (f.charge >= .78 && f.charge <= .9) px.rect(g, x, y, Math.round(26 * f.charge), 1, '#ffffff'); }, { emissive: true, bias: 10 });
    }
    if (SP && SP.kind === 'corner' && SP.ring && !SP.taken && SP.stage === 'aim') { const R = SP.ring; r.decal(() => { r.groundRing(R.x, R.y, 18, '#ffe040', 1); r.groundRing(R.x, R.y, 17, '#ffe040', 1); r.groundRing(R.x, R.y, 8 + Math.sin(m.t * 6) * 3, '#ffffff', .8); }); }
    if (SP && SP.kind === 'freekick' && SP.shootable && SP.reticle && !SP.taken && SP.stage === 'aim') {
      const gx = m.goalX(SP.side), R = SP.reticle, y = P.CY + R.y * (P.GH - 6), z = 4 + R.z * (P.BAR - 10);
      r.queue(gx, y, z, g => { const p = r.w(gx, y, z), X = Math.round(p[0]), Y = Math.round(p[1]); px.line(g, X - 5, Y, X - 2, Y, '#ffe040'); px.line(g, X + 2, Y, X + 5, Y, '#ffe040'); px.line(g, X, Y - 5, X, Y - 2, '#ffe040'); px.line(g, X, Y + 2, X, Y + 5, '#ffe040'); px.dot(g, X, Y, '#ffffff'); }, { emissive: true, bias: 20 });
    }
    const pk = m.shootout ? m.shootout.kick : SP && SP.pen;
    if (pk && pk.state === 'aim' && pk.hT && !pk.hT.cpu) {
      const y = P.CY + pk.cursor.x * (P.GH - 8), z = 4 + pk.cursor.y * 22;
      r.queue(pk.gx, y, z, g => { const p = r.w(pk.gx, y, z), X = Math.round(p[0]), Y = Math.round(p[1]); px.rect(g, X - 4, Y - 4, 9, 1, '#ffe040'); px.rect(g, X - 4, Y + 4, 9, 1, '#ffe040'); px.rect(g, X - 4, Y - 4, 1, 9, '#ffe040'); px.rect(g, X + 4, Y - 4, 1, 9, '#ffe040'); }, { emissive: true, bias: 20 });
    }
    if (pk && pk.keeperAim && pk.hK && !pk.hK.cpu && !pk.dived) { const y = P.CY + clamp(pk.keeperAim.x, -1, 1) * 30, z = pk.keeperAim.high ? 26 : 6; r.queue(pk.gx, y, z, g => { const p = r.w(pk.gx, y, z); px.disc(g, p[0], p[1], 3, '#6aa0ff'); }, { emissive: true, bias: 20 }); }
    for (const h of m.humans) if (h.ctl && h.ctl.mouse && h.ctl.raw && h.ctl.raw.aimPoint) { const a = h.ctl.raw.aimPoint; r.decal(() => { r.groundRing(a.x, a.y, 5, '#ffffff', .8); r.groundRing(a.x, a.y, 2, h.color, 1); }); }
    if (m.duel && !m.duel.result) {
      const D = m.duel, k = D.keeper.body, u = clamp(D.t / D.dur, 0, 1.3), rad = lerp(46, 12, Math.min(1, u)) * (u > 1 ? 1 - (u - 1) * 2 : 1);
      r.decal(() => { r.groundRing(k.x, k.y, 12, '#ffffff', .9); if (rad > 2) r.groundRing(k.x, k.y, rad, Math.abs(D.t - D.dur) < .06 ? '#7aff9a' : Math.abs(D.t - D.dur) < .14 ? '#ffe040' : '#ff7a3a', 1); });
    }
  },
  /* ---- name tags over the humans' footballers (a triangle in their colour, the name, stamina under 60) ---- */
  tags(g, r, m) {
    const humans = m.humans.filter(h => h.fb && !h.cpu);
    const list = humans.length ? humans.map(h => [h.fb, h.color, m.humans.length > 1 || m.kind === 'session' ? h.name : null]) : m.owner ? [[m.owner, '#ffffff', null]] : [];
    for (const [f, col, who] of list) {
      if (f.ghost || f.sentOff) continue;
      const p = r.w(f.body.x, f.body.y, f.body.z + 40), X = Math.round(p[0]), Y = Math.round(p[1]);
      if (X < -10 || X > r.W + 10 || Y < -10 || Y > r.H + 20) continue;
      px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], col); px.line(g, X - 4, Y - 5, X + 4, Y - 5, '#0b0814');
      const name = (who ? who + ' ' : '') + f.short; E.font.text(g, name, X, Y - 15, '#ffffff', { align: 'center', outline: '#0b0814' });
      if (f.stamina < 60) { const w = 18; px.rect(g, X - w / 2 - 1, Y - 18, w + 2, 3, '#0b0814'); px.rect(g, X - w / 2, Y - 17, Math.round(w * f.stamina / 100), 1, f.stamina < 25 ? '#ff5a3a' : '#7aff9a'); if (f.sweat) px.rect(g, X + w / 2 + 2, Y - 20, 1, 2, '#7ac8ff'); }
    }
  },
  scoreBug(g, r, m, mx, my) {
    const y = my, x = mx, T = m.teams, w = 172;
    E.ui.box(g, x, y, w, 30, { bg: ['#0d1430', '#16224a'], border: '#2a3a6a', alpha: .92 });
    EF.drawCrest(g, T[0], x + 11, y + 11, 14); EF.drawCrest(g, T[1], x + w - 11, y + 11, 14);
    E.font.text(g, T[0].short, x + 22, y + 5, '#fff6e0', { outline: false });
    E.font.text(g, T[1].short, x + w - 22, y + 5, '#fff6e0', { outline: false, align: 'right' });
    E.font.text(g, m.score[0] + ' - ' + m.score[1], x + w / 2, y + 3, '#ffffff', { align: 'center', scale: 2, outline: '#0b0814' });
    const clock = m.clockText; E.font.text(g, clock, x + w / 2, y + 19, m.golden ? '#ffc83a' : '#c8d0e8', { align: 'center', outline: false });
    // Euphoria gauges: three segments, flashing when full; Europhoria drains
    for (const s of [0, 1]) {
      const gx = s ? x + w - 60 : x + 6, gy = y + 22, v = m.euphoria[s], eu = m.europhoria && m.europhoria.side === s, full = v >= 100 && !eu, col = eu ? '#ffc83a' : full && Math.floor(m.t * 6) % 2 ? '#ffffff' : T[s].kits.home.shirt;
      for (let k = 0; k < 3; k++) { const sx = gx + k * 18, fill = clamp((v - k * 33.34) / 33.33, 0, 1); px.rect(g, sx, gy, 16, 4, '#0a0a14'); px.rect(g, sx + 1, gy + 1, Math.round(14 * fill), 2, col); }
      for (let c = 0; c < m.side[s].filter(f => f.sentOff).length; c++) px.rect(g, s ? x + w - 8 - c * 5 : x + 24 + c * 5, y + 14, 3, 5, '#e8202a');
    }
    if (m.pure) E.font.text(g, 'PURE FOOTBALL', x + w / 2, y + 32, '#9aa6c8', { align: 'center', font: 'tiny', outline: '#000' });
  },
  radar(g, r, m, mx, my) {
    const s = 1 / 9, w = Math.round(P.L * s), h = Math.round(P.W * s), ca = game.cornerArea(), x0 = r.W - mx - w, y0 = ca && ca.x0 < x0 + w && ca.y1 > my ? Math.ceil(ca.y1) + 4 : my;
    E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#123a1e', border: '#5a8a6a', alpha: .78 });
    px.line(g, x0 + w / 2, y0, x0 + w / 2, y0 + h, '#3a6a4a');
    for (const gx of [0, w]) px.rect(g, x0 + gx - 1, y0 + h / 2 - 5, 2, 10, '#ffffff');
    for (const f of m.players) {
      if (f.ghost) continue; const X = Math.round(x0 + (f.body.x - P.X0) * s), Y = Math.round(y0 + (f.body.y - P.Y0) * s), c = m.teams[f.side].kits[m.kits[f.side]].shirt;
      if (f.side === 0) px.disc(g, X, Y, 1.6, c); else px.rect(g, X - 1, Y - 1, 3, 3, c);
      if (f.human && !f.human.cpu) { px.rect(g, X - 2, Y - 3, 5, 1, f.human.color); }
    }
    const b = m.ball; px.rect(g, Math.round(x0 + (b.x - P.X0) * s), Math.round(y0 + (b.y - P.Y0) * s), 2, 2, '#ffffff');
  },
  notice(g, r, m) {
    const N = m.notice; if (!N) return;
    const k = N.t < .15 ? N.t / .15 : 1, y = Math.round(r.H * .3), sc = N.big ? (N.text.length > 12 ? 3 : 4) : 2;
    const cols = N.color ? [E.shade(N.color, .5), N.color, E.shade(N.color, -.2)] : ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'];
    if (k >= 1 || Math.floor(N.t * 30) % 2) E.font.title(g, N.text, r.W / 2, y - (1 - k) * 20, { align: 'center', scale: sc, colors: cols, depth: N.big ? 3 : 2 });
    if (N.sub) E.font.text(g, N.sub, r.W / 2, y + 8 * sc + 6, '#ffffff', { align: 'center', outline: '#0b0814', scale: 1 });
  },
  shootoutDots(g, r, m, my) {
    const S = m.shootout, y = my + 40;
    for (const s of [0, 1]) {
      const n = Math.max(5, S.kicks[s].length), x0 = r.W / 2 + (s ? 14 : -14 - n * 9);
      E.font.text(g, m.teams[s].short, s ? x0 + n * 9 + 4 : x0 - 4, y - 1, '#ffffff', { align: s ? 'left' : 'right', outline: '#000' });
      for (let i = 0; i < n; i++) { const k = S.kicks[s][i], X = x0 + i * 9; px.disc(g, X + 3, y + 3, 3.5, '#0a0a14'); if (k === true) px.disc(g, X + 3, y + 3, 2.5, '#5aff7a'); else if (k === false) { px.line(g, X + 1, y + 1, X + 5, y + 5, '#ff4a4a'); px.line(g, X + 5, y + 1, X + 1, y + 5, '#ff4a4a'); } }
    }
  },
  varBar(g, r, m) {
    const y = Math.round(r.H * .72), w = Math.min(r.W - 40, 260), x = Math.round((r.W - w) / 2);
    E.ui.box(g, x, y, w, 26, { bg: ['#101828', '#1a2a48'], border: '#7ac8ff' });
    px.rect(g, x + 4, y + 4, 34, 18, '#7ac8ff'); E.font.text(g, 'VAR', x + 21, y + 9, '#0a1020', { align: 'center', outline: false });
    const d = m.var && m.var.decided ? (m.var.overturn ? (m.var.kind === 'goal' ? 'NO GOAL' : 'NO PENALTY') : m.var.kind === 'goal' ? 'GOAL STANDS' : 'PENALTY STANDS') : 'CHECKING' + '...'.slice(0, Math.floor(m.t * 3) % 4);
    E.font.text(g, d, x + 46, y + 9, '#ffffff', { outline: false });
  },
  duelText(g, r, m) { const D = m.duel; if (D.result) return; const I = D.human && D.human.input ? D.human.input : D.mine ? game.input : null; E.font.title(g, 'SAVE DUEL!', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 3, colors: ['#ffffff', '#7ac8ff', '#3a6aff'] }); if (I) EF.prompts(g, r.W / 2, Math.round(r.H * .2) + 30, [['pass', 'ON THE RING']], { input: I, scale: 2, textScale: 1 }); },
  replayTag(g, r, mx, my) {
    for (let y = 0; y < r.H; y += 3) px.blend(g, .12, 'multiply', () => px.rect(g, 0, y, r.W, 1, '#000000'));
    const ca = game.cornerArea(), ty = ca && ca.x0 < r.W - mx ? Math.ceil(ca.y1) + 4 : my;
    E.ui.box(g, r.W - mx - 74, ty, 74, 20, { bg: '#c81a2a', border: '#ffffff' }); E.font.text(g, 'REPLAY', r.W - mx - 33, ty + 7, '#ffffff', { align: 'center', outline: false });
    if (Math.floor(game.real * 2) % 2) px.disc(g, r.W - mx - 66, ty + 10, 3, '#ffffff');
    EF.prompts(g, mx, my + 36, [['confirm', 'SKIP']], { align: 'left', input: game.input });
  },
  /* ---- prompts: near the controlled player (while learning), and the set piece's bar at the bottom ---- */
  prompts(g, r, m, mx, my) {
    const mode = game.settings.prompts, by = r.H - my - 64, SP = m.setpiece;
    for (const h of m.humans) {
      if (h.cpu || h.remote || !h.fb || !h.input) continue;
      const f = h.fb, I = h.input, learn = a => mode === 'always' || (mode === 'learning' && (h.used[a] || 0) < 3);
      const list = [];
      if (m.euphoria[h.side] >= 100 && !m.europhoria && !m.pure && m.mode === 'play') list.push(['euphoria', 'EUROPHORIA!']);
      if (m.europhoria && m.europhoria.side === h.side && !m.superUsed && f.hasBall()) list.push(['shoot', 'HOLD: SUPER STRIKE']);
      if (m.mode === 'play' && !f.hasBall() && !m.owner && f.airWindow && f.airWindow()) { const w = f.airWindow(); list.push(['shoot', w.z > 22 ? 'HEADER' : 'VOLLEY']); }
      else if (m.mode === 'play' && mode !== 'off') {
        if (f.hasBall()) { if (learn('pass')) list.push(['pass', 'PASS']); if (learn('shoot')) list.push(['shoot', 'SHOOT']); if (learn('lob')) list.push(['lob', 'LOB']); if (learn('skill')) list.push(['skill', 'SKILL']); }
        else if (m.owner && m.owner.side !== h.side) { if (learn('tackle')) list.push(['pass', 'TACKLE']); if (learn('slide')) list.push(['shoot', 'SLIDE']); if (learn('barge')) list.push(['lob', 'BARGE']); }
      }
      if (list.length && !(SP && !SP.taken)) { const p = r.w(f.body.x, f.body.y, f.body.z), X = Math.round(p[0]), Y = Math.round(p[1]) + 8; if (X > 0 && X < r.W && Y < r.H - 12) EF.prompts(g, X, Y, list.slice(0, 3), { input: I }); }
    }
    // the set piece's bar
    const h = SP && !SP.taken ? m.humanFor(SP.side) : null;
    let bar = null, I = h && h.input;
    if (SP && !SP.taken && h && SP.stage === 'aim' && SP.taker === h.fb) {
      if (SP.kind === 'corner') bar = [['up', 'AIM THE RING'], ['lob', 'CROSS'], ['shoot', 'SHORT']];
      else if (SP.kind === 'freekick' && SP.shootable) bar = [['up', 'AIM'], ['shoot', 'HOLD: SHOOT'], ['pass', 'PASS'], ['lob', 'LOB']];
      else if (SP.kind === 'goalkick') bar = [['pass', 'SHORT'], ['lob', 'LONG']];
    }
    if (SP && SP.kind === 'goalkick' && !SP.taken && h && SP.stage === 'aim') bar = [['pass', 'SHORT'], ['lob', 'LONG']];
    const pk = m.shootout ? m.shootout.kick : SP && SP.pen;
    if (pk && (pk.state === 'aim' || pk.state === 'runup')) {
      if (pk.hT && !pk.hT.cpu && pk.state === 'aim') { bar = [['up', 'AIM'], ['shoot', 'HOLD: POWER (LIGHT + CENTRE: PANENKA)']]; I = pk.hT.input; }
      else if (pk.hK && !pk.hK.cpu && !pk.dived) { bar = [['left', 'PICK A SIDE'], ['pass', 'DIVE']]; I = pk.hK.input; }
    }
    if (m.celebration && m.celebration.human && !m.celebration.pick) { const C = m.celebration; bar = C.offer.map((c, i) => [['pass', 'shoot', 'lob', 'through'][i], c.name]); I = C.human.input; }
    if (bar && I) { const w = EF.prompts(g, -9999, -9999, bar, { input: I }); E.ui.box(g, Math.round(r.W / 2 - w / 2 - 8), by - 5, w + 16, 21, { bg: '#0d1430', border: '#ffc83a', alpha: .9 }); EF.prompts(g, r.W / 2, by, bar, { input: I }); }
  },
  /** arrows at the screen's edge for the ball and the humans' footballers when they are off it */
  arrows(g, r, m) {
    const pts = [[m.ball, '#ffffff']].concat(m.humans.filter(h => h.fb && !h.cpu).map(h => [h.fb.body, h.color]));
    for (const [o, c] of pts) {
      const p = r.w(o.x, o.y, o.z || 0), X = p[0], Y = p[1]; if (X >= 0 && X <= r.W && Y >= 0 && Y <= r.H) continue;
      const cx = clamp(X, 8, r.W - 8), cy = clamp(Y, 40, r.H - 8), a = Math.atan2(Y - cy, X - cx);
      px.poly(g, [[cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a + 2.4) * 5, cy + Math.sin(a + 2.4) * 5], [cx + Math.cos(a - 2.4) * 5, cy + Math.sin(a - 2.4) * 5]], c);
    }
  }
};
/* ==== src/25-view.js ==== */
/* THE MATCH VIEW (section 8): the stadium under its sky and skyline, the crowd, floodlights, goals with nets that
 * ripple, corner flags, LED boards, dugouts and the fourth official; the footballers and the referee as HD rigs driven
 * from their state (live, or a replay's), the ball with its trails, matchday event actors, weather, fog and light. */
// (vendor/mocap/mocap.js declares `const Mocap`: a global binding, not a property of window)
EF.Anim = { lib: null, load() { if (!this.lib && typeof Mocap !== 'undefined' && window.MOCAP && MOCAP.EF) this.lib = Mocap.load(MOCAP.EF); return this.lib; } };
const CLIP_WIN = { Get_Up_From_Side: [3.2, 5.2], Get_Up_From_Back: [2.4, 4.6], Get_Up_Face_Down: [2, 4.2], Greeting: [0, 2.4], Breakdance_Helicopter: [1, 7], '10_02': [1.6, 2.6], '11_01': [2.4, 3.6] };
EF.Anim.sample = (rig, L) => {
  const lib = EF.Anim.lib; if (!lib || !L || !L.clip) { rig.mocap = null; return; }
  const c = lib.clip(L.clip.name); if (!c) { rig.mocap = null; return; }
  const w = CLIP_WIN[L.clip.name], t = w ? w[0] + (L.clip.t % (w[1] - w[0])) : (c.loop === false ? Math.min(c.dur, L.clip.t) : L.clip.t % c.dur);
  rig.mocap = lib.sample(c, t, rig._mbuf || (rig._mbuf = new Float32Array(lib.P * 3))); rig.mocapW = L.clip.w === undefined ? 1 : L.clip.w; rig.mocapMask = L.clip.mask || null;
};
/** procedural celebrations and poses over a rig's solved joints: arms out, the robot's square arms */
EF.Anim.post = (rig, proc, t) => {
  const J = rig.J; if (!J.shL || !proc) return;
  if (proc === 'armsOut' || proc === 'aeroplane') { const lean = proc === 'aeroplane' ? Math.sin(t * 2) * 1.5 : 0; J.elbowL = [J.shL[0], J.shL[1] - 4.4, J.shL[2] + .4 + lean]; J.handL = [J.shL[0] + .5, J.shL[1] - 8.8, J.shL[2] + .8 + lean * 2]; J.elbowR = [J.shR[0], J.shR[1] + 4.4, J.shR[2] + .4 - lean]; J.handR = [J.shR[0] + .5, J.shR[1] + 8.8, J.shR[2] + .8 - lean * 2]; }
  if (proc === 'robot') { const k = Math.floor(t * 4) % 2 ? 1 : -1; J.elbowL = [J.shL[0], J.shL[1] - 3, J.shL[2] - 3]; J.handL = [J.shL[0] + 4, J.shL[1] - 3, J.shL[2] - 3 + 3 * k]; J.elbowR = [J.shR[0], J.shR[1] + 3, J.shR[2] - 3]; J.handR = [J.shR[0] + 4, J.shR[1] + 3, J.shR[2] - 3 - 3 * k]; }
  if (proc === 'fishslap') { const k = Math.sin(t * 9); J.elbowR = [J.shR[0] + 2, J.shR[1] + 2, J.shR[2] + 1]; J.handR = [J.shR[0] + 5 + k * 2, J.shR[1] + k * 4, J.shR[2] + 2]; }
};
class MatchView {
  constructor(m) {
    this.m = m; this.rigs = new Map(); this.t = 0; this.evRigs = new Map(); this.decals = []; this.ledT = 0; this.ledMsg = null; this.flashes = [];
    EF.Anim.load();
    const kits = m.kits;
    for (const f of m.players) this.rigs.set(f.id, EF.Art.rigFor(f.team, kits[f.side], f.data));
    this.refRig = new E.Humanoid({ weapon: null, build: 'heroic', size: 1.08, hair: 'short', colors: { cloth: '#141418', pants: '#141418', belt: '#141418', trim: '#e8d040', boot: '#0a0a0e', skin: '#e8b890', hair: '#3a2a1a' }, kit: { pattern: 'plain', color2: '#e8d040' }, speedRef: 88 });
    if (EF.Anim.lib) Mocap.drive(this.refRig, EF.Anim.lib);
    this.crowd = new EF.CrowdView(m);
    this.managers = [0, 1].map(s => { const T = m.teams[s], mg = s === 0 && T.id === 'kipperton' ? EF.Cast.rig('mags') : new E.Humanoid({ weapon: null, size: 1.05, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { cloth: '#2a2a34', coat: T.kits.home.shirt, pants: '#22222a', skin: '#e0b090', hair: '#3a3030' } }); return { rig: mg, x: P.CX + (s ? 130 : -130), y: P.Y1 + 30, vx: 0, t: 0 }; });
    this.fourth = new E.Humanoid({ weapon: null, size: 1, colors: { cloth: '#141418', pants: '#141418', trim: '#e8d040', skin: '#d8a880', hair: '#2a2020' } });
    EF.Nets.reset();
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.on(ev); });
  }
  dispose() { if (this.unsub) this.unsub(); this.crowd.dispose(); }
  rigOf(f) { return this.rigs.get(f.id); }
  /* ---- effects from the match's events ---- */
  on(ev) {
    const m = this.m, Pa = game.particles, b = m.ball, team = s => m.teams[s];
    const rumble = (who, k, t) => { const h = who && who.human; if (h && h.input && h.input.rumble) h.input.rumble(k, t); };
    switch (ev.type) {
      case 'shot': if (ev.who) { Pa.dust(ev.who.body.x, ev.who.body.y, 1, 3); rumble(ev.who, .25 + (ev.power || .5) * .5, .12); } if (ev.screamer) { game.freeze(.05); } this.photoFlash(); break;
      case 'woodwork': game.shake(4); Pa.sparks(ev.x, ev.y, ev.z, 8, null, { color: '#ffffff' }); rumble(m.lastKick, .6, .2); break;
      case 'goal': case 'ownGoal': if (ev.shootout) break; { const c = team(ev.side).kits.home.shirt; game.flash(c, .14, .5); game.shake(3); Pa.bits(b.x, b.y, 20, 30, EF.SPR.confetti); this.ledMsg = { text: 'GOAL!', t: 4, side: ev.side }; if (m.stadium.id === 'euphorium') this.fireworks(4); for (const h of m.humans) if (h.side === ev.side && h.input && h.input.rumble) h.input.rumble(.8, .4); } break;
      case 'knockdown': case 'launched': if (ev.x !== undefined) game.hitFx(ev.x, ev.y, 12, { power: ev.type === 'launched' ? .9 : .5, rumble: false, sound: null }); rumble(ev.who, .5, .2); break;
      case 'slide': { const f = ev.who; Pa.dust(f.body.x, f.body.y, 1, 6); if (m.surface === 'wet' || m.surface === 'snow') Pa.bits(f.body.x, f.body.y, 2, 6, m.surface === 'snow' ? ['#ffffff', '#e0e8f0'] : ['#8ab0c8', '#c8d8e8']); } break;
      case 'tackleWon': Pa.dust(ev.who.body.x, ev.who.body.y, 1, 4); rumble(ev.who, .4, .12); if (ev.victim) rumble(ev.victim, .4, .12); break;
      case 'europhoria': { const c = team(ev.side).kits.home.shirt; game.flash(c, .2, .6); this.ledMsg = { text: 'EUROPHORIA!', t: EF.T.europhoriaTime, side: ev.side }; if (m.stadium.id === 'euphorium') this.fireworks(5); } break;
      case 'superCharge': { const f = ev.who; Pa.ring(f.body.x, f.body.y, 4, 46, EF.get('super', ev.super).color || '#ffc83a', .5); Pa.glints(f.body.x, f.body.y, 14, 18, '#fff6c0'); game.flash('#ffffff', .08, .4); } break;
      case 'superStrike': game.shake(5); break;
      case 'hammer': game.shake(6); Pa.dust(ev.x, ev.y, 1, 10); break;
      case 'bounce': if (ev.surf === 'snow' && ev.speed > 40) Pa.bits(ev.x, ev.y, 1, 4, ['#ffffff', '#e8f0f8']); break;
      case 'splash': Pa.bits(ev.x, ev.y, 2, 10, ['#9ac0d8', '#c8e0f0', '#ffffff']); break;
      case 'busSmashed': Pa.bits(m.bus ? m.bus.x : b.x, m.bus ? m.bus.y : b.y, 14, 30, ['#c8e8ff', '#ffffff', '#7a1a2a']); game.shake(6); break;
      case 'beachPop': Pa.bits(ev.x, ev.y, 10, 16, ['#ff4a4a', '#ffe040', '#4a8aff', '#ffffff']); break;
      case 'save': if (ev.who) { Pa.glints(ev.who.body.x, ev.who.body.y, 14, 6, '#ffffff'); } break;
      case 'decoysBurst': Pa.bits(ev.x, ev.y, 16, 24, ['#ffe070', '#ffd040', '#ffffff']); break;
      case 'saveDuelResult': if (ev.result !== 'miss') game.flash('#ffffff', .1, .4); break;
      case 'refHit': Pa.impact && Pa.impact(ev.x, ev.y, 14, 1, '#ffffff'); break;
    }
  }
  photoFlash() { for (let i = 0; i < 3; i++) this.flashes.push({ x: EF.fxRng() < .5 ? P.X0 - 30 : P.X1 + 30, y: P.CY + EF.fx(-120, 120), t: EF.fx(0, .4) }); }
  fireworks(n) { for (let i = 0; i < n; i++) game.after(i * .35, () => { const x = EF.fx(P.X0, P.X1), y = EF.fx(-40, 40), c = EF.fxPick(['#ff5a7a', '#5ad0ff', '#ffe040', '#7aff7a', '#c87aff']); game.particles.explosion(x, y, 240 + EF.fx(0, 80), .7, { debris: false, freeze: false, shake: 0 }); game.particles.glints(x, y, 260, 24, c); game.lights.add(x, y, 200, 300, .6, { color: c }); }); }
  /* ---- the step: rigs from the source's state (live or a replay's proxies) ---- */
  update(dt, src) {
    this.t += dt; const m = this.m, rdt = src.replay ? dt * .5 : dt;
    for (const f of src.players) {
      const rig = this.rigs.get(f.id); if (!rig) continue;
      const L = f.look || {}, B = f.body, kick = f.kickName ? EF.kickState(f.kickName, f.kickT) : null;
      EF.Anim.sample(rig, L);
      let pose = L.pose, facing = f.facing + (L.spin || 0);
      if (f.state === 'keeper-dive') pose = 'cheer';
      if (f.state === 'launched') { L.tilt = { axis: 'forward', angle: (this.t * 15) % TAU, pivot: 'hips' }; }
      rig.update(rdt, { x: B.x, y: B.y, z: B.z, vx: B.vx, vy: B.vy, facing, attack: kick, pose, expr: L.expr, tilt: L.tilt, down: L.down, air: L.air, sprint: L.sprint, hurt: L.hurt, crouch: f.role === 'GK' && pose === 'guard' ? 1 : 0 });
      if (L.proc) EF.Anim.post(rig, L.proc, this.t);
    }
    const R = src.ref, RL = R.look || {};
    EF.Anim.sample(this.refRig, RL);
    this.refRig.update(rdt, { x: R.body.x, y: R.body.y, z: R.body.z, vx: R.body.vx, vy: R.body.vy, facing: R.facing, pose: RL.pose, point: RL.point, expr: RL.expr, down: RL.down });
    this.crowd.update(rdt);
    EF.Nets.update(rdt);
    for (const mg of this.managers) { mg.t += rdt; const pace = Math.sin(mg.t * .4) * 30, tx = (mg.x0 || (mg.x0 = mg.x)) + pace; mg.vx = (tx - mg.x) * 2; mg.x += mg.vx * rdt; }
    this.managers.forEach((mg, s) => { const st = this.crowd.state[s]; mg.rig.update(rdt, { x: mg.x, y: mg.y, z: 0, vx: mg.vx, vy: 0, facing: -Math.PI / 2 + (mg.vx > 3 ? .8 : mg.vx < -3 ? -.8 : 0), pose: st === 'jump' ? 'cheer' : st === 'despair' ? 'hips' : st === 'boo' ? 'guard' : null, expr: st === 'jump' ? 'shout' : st === 'despair' ? 'angry' : null }); });
    this.fourth.update(rdt, { x: P.CX, y: P.Y1 + 24, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: m.stoppageShown && m.minute % 45 < 46 && m.minute % 45 > 43 ? 'cheer' : null });
    // event actors: the invader and stewards get rigs
    for (const ev of src.events || []) {
      if (ev.id && ev.id.startsWith('invader')) {
        let er = this.evRigs.get(ev.id); if (!er) { er = { inv: new E.Humanoid({ weapon: null, size: 1.15, build: 'bulky', colors: ev.id === 'invader-keith' ? { cloth: '#c87a2a', pants: '#c87a2a', skin: '#c87a2a', hair: '#c87a2a', boot: '#3a2a1a' } : { cloth: '#7a5a3a', pants: '#5a4028', skin: '#e0b090', hair: '#5a4028' } }), st: [0, 1].map(() => new E.Humanoid({ weapon: null, size: 1.08, sleeves: 'long', colors: { cloth: '#e8f040', pants: '#2a2a34', trim: '#c0c8d0', skin: '#e0b090', hair: '#3a2a20' } })) }; this.evRigs.set(ev.id, er); }
        const live = m.events.find(e => e.id === ev.id);
        if (live) { const B = live.body; er.inv.update(rdt, { x: B.x, y: B.y, z: 0, vx: B.vx, vy: B.vy, facing: live.facing || 0, down: live.caught ? 1 : 0, expr: 'shout' }); live.stewards.forEach((s, i) => er.st[i].update(rdt, { x: s.x, y: s.y, z: 0, vx: s.vx, vy: s.vy, facing: Math.atan2(s.vy, s.vx) })); er.live = live; }
      }
    }
    if (this.ledMsg) { this.ledMsg.t -= dt; if (this.ledMsg.t <= 0) this.ledMsg = null; }
    for (const fl of this.flashes) fl.t -= dt; this.flashes = this.flashes.filter(f => f.t > -.15);
  }
  /* ---- drawing ---- */
  draw(r, src) {
    const m = this.m, st = m.stadium, b = src.ball, map = m.pitch.map;
    this.lighting(r, src);
    r.sky(this.skyColors());
    this.skyline(r);
    map.drawFloor(r);
    map.queueWalls(r);
    this.decalsDraw(r);
    this.crowd.draw(r, src);
    this.boards(r);
    this.pylons(r);
    for (const gx of [P.X0, P.X1]) this.goal(r, gx);
    for (const cx of [P.X0, P.X1]) for (const cy of [P.Y0, P.Y1]) this.flag(r, cx, cy);
    this.apron(r, src);
    if (st.jumbotron && m.kind !== 'title') this.jumbotron(r);
    if (src.bus) this.bus(r, src.bus);
    this.events(r, src);
    // the footballers, the referee
    const eu = m.europhoria;
    for (const f of src.players) {
      if (f.ghost) continue;
      const B = f.body, rig = this.rigs.get(f.id); if (!rig || !r.visible(B.x, B.y, B.z)) continue;
      r.shadow(B.x, B.y, 6, .38);
      const glow = eu && eu.side === f.side && !src.replay ? .25 + .2 * Math.sin(this.t * 8) : 0;
      r.actor(B.x, B.y, B.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), glow > 0 ? { flash: m.teams[f.side].kits.home.color2 || '#ffffff', flashMix: glow } : undefined);
      if (f.celebrate && f.celebrate.pick && f.celebrate.pick.prop === 'kipper') { const h = rig.hand('R'); r.sprite(h[0], h[1], h[2] - 2, EF.SPR.kipper, { anchor: 'center' }); }
    }
    const R = src.ref; r.shadow(R.body.x, R.body.y, 6, .38); r.actor(R.body.x, R.body.y, R.body.z, (g, ox, oy) => this.refRig.draw(g, ox, oy, r.view));
    if (R.look && R.look.signal === 'card' && m.cardNow) { const h = this.refRig.hand('R'); r.sprite(h[0], h[1], h[2] + 2, m.cardNow.final === 'yellow' ? EF.SPR.cardY : EF.SPR.cardR, { anchor: 'center', scale: 2 }); }
    if (R.look && R.look.point) { const h = this.refRig.hand('L'); r.sprite(h[0], h[1], h[2], EF.SPR.whistle, { anchor: 'center' }); }
    this.ballDraw(r, src);
    if (m.fog > .01) this.fogDraw(r, m.fog);
    if (src.events) for (const ev of src.events) if (ev.id === 'flaresmoke') this.smokeDraw(r, ev);
  }
  skyColors() { const st = this.m.stadium, night = this.m.timeOfDay === 'night'; return night && st.time !== 'night' ? ['#06070e', '#121428', '#28203a'] : st.sky || ['#1a2a5a', '#4a6aa0', '#a0b8d0']; }
  lighting(r, src) {
    const m = this.m, st = m.stadium, L = game.lights, night = m.timeOfDay === 'night', dusk = m.timeOfDay === 'dusk';
    if (!night && !dusk && !m.lightsOut) { L.enabled = false; return; }
    L.enabled = true;
    const out = m.lightsOut && !src.replay;
    L.ambient = out ? .14 : night ? (st.lights.night || .42) * .75 : (st.lights.ambient || .6);
    if (out) return;
    const k = night ? .72 : .5, col = st.lights.color || '#fff0d0';
    for (const [x, y] of [[P.X0 + 40, P.Y0 - 60], [P.X1 - 40, P.Y0 - 60], [P.X0 + 40, P.Y1 + 80], [P.X1 - 40, P.Y1 + 80]]) L.add(x, y, 220, 470, k, { color: col });
    L.add(P.CX, P.CY, 220, 300, k * .35, { color: col });
  }
  /* ---- the skyline behind the north stand: silhouettes by stadium ---- */
  skyline(r) {
    const m = this.m, st = m.stadium, g = r.ctx, kinds = st.skyline || [], night = m.timeOfDay !== 'day', c0 = st.skyColor || '#1a1a28', t = this.t;
    const at = (x, z) => r.w(x, -40, z), base = at(0, 0)[1];
    if (base < -10) return;
    const ct = E.tones(c0), win = night ? '#ffd870' : '#c8d0d8';
    const rect = (x, w, h, c) => { const a = at(x, h), b = at(x + w, 0); px.rect(g, Math.round(a[0]), Math.round(a[1]), Math.max(1, Math.round(b[0] - a[0])), Math.max(1, Math.round(b[1] - a[1])), c); };
    const poly = (pts, c) => px.poly(g, pts.map(([x, z]) => at(x, z)), c);
    for (const k of kinds) {
      if (k === 'hills' || k === 'mountains') { const H2 = k === 'mountains' ? 230 : 120, pts = [[-200, 0]]; for (let x = -200; x <= 1300; x += 60) pts.push([x, 60 + (Math.sin(x * .011) * .5 + .5) * H2 * (k === 'mountains' ? (Math.abs(Math.sin(x * .004)) * .8 + .4) : .6)]); pts.push([1300, 0]); poly(pts, ct.sh); if (k === 'mountains') for (let x = -200; x <= 1300; x += 60) { const h = 60 + (Math.sin(x * .011) * .5 + .5) * H2 * (Math.abs(Math.sin(x * .004)) * .8 + .4); if (h > 170) poly([[x - 16, h - 26], [x, h], [x + 16, h - 26]], '#e8eef8'); } }
      if (k === 'harbour') { rect(-100, 1300, 70, ct.base); for (let x = 40; x < 1100; x += 150) { rect(x, 30, 110, ct.sh); poly([[x + 15, 180], [x + 15, 110], [x + 60, 110]], ct.lt); } }
      if (k === 'chimneys') for (const x of [120, 300, 820, 980]) { rect(x, 16, 190, ct.deep); if (EF.fxRng() < .2) game.particles.smoke(x + 8, -40, 200, 1, { size: 1.6, color: '#5a5a66' }); }
      if (k === 'lighthouse') { const x = 1010; poly([[x - 14, 0], [x + 14, 0], [x + 8, 190], [x - 8, 190]], '#e8e0d0'); rect(x - 14, 28, 40, '#c83a3a'); rect(x - 12, 24, 120, '#c83a3a'); rect(x - 10, 12, 200, '#2a2a30'); const beam = Math.sin(t * .9); if (night) { const a = at(x, 196); px.blend(g, .35, 'add', () => px.poly(g, [[a[0], a[1]], [a[0] + beam * 260, a[1] - 30], [a[0] + beam * 260, a[1] + 10]], '#fff6c0')); r.glowDisc(g, a[0], a[1], 10, '#fff6c0', .9); } }
      if (k === 'palms') for (const x of [60, 260, 760, 1000]) { rect(x, 6, 120, '#5a4028'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, p0 = at(x + 3, 120), p1 = at(x + 3 + Math.cos(a) * 40, 120 + Math.sin(a) * 18 - 10); px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a6a2a', 3); } }
      if (k === 'dome') { const x = 540; const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; pts.push([x + Math.cos(a) * 170, 70 + Math.sin(a) * 120]); } pts.push([x - 170, 0], [x + 170, 0]); poly(pts.slice(0, 17).concat([[x - 170, 70], [x - 170, 0], [x + 170, 0], [x + 170, 70]]), st.id === 'euphorium' ? '#3a2e10' : ct.base); if (st.id === 'euphorium') for (let i = 1; i < 8; i++) { const a = Math.PI * i / 8, p0 = at(x + Math.cos(a) * 170, 70 + Math.sin(a) * 120), p1 = at(x, 70); px.line(g, p0[0], p0[1], p1[0], p1[1], '#c8a040'); } else rect(x - 8, 16, 220, ct.sh); }
      if (k === 'searchlights' && night) for (let i = 0; i < 3; i++) { const x = 200 + i * 340, a = Math.sin(t * .5 + i * 2) * .6, p0 = at(x, 40); px.blend(g, .22, 'add', () => px.poly(g, [[p0[0] - 3, p0[1]], [p0[0] + 3, p0[1]], [p0[0] + Math.sin(a) * 300 + 30, -40], [p0[0] + Math.sin(a) * 300 - 30, -40]], '#a0c8ff')); }
      if (k === 'steelworks') { for (const x of [80, 260, 860]) { rect(x, 70, 90, ct.deep); rect(x + 20, 14, 200, ct.deep); const a = at(x + 27, 200); if (night) r.glowDisc(g, a[0], a[1], 8, '#ff8a3a', .8); if (EF.fxRng() < .2) game.particles.smoke(x + 27, -40, 205, 1, { size: 1.6, color: '#8a8a96' }); } for (let x = 0; x < 1100; x += 90) rect(x, 50, 50 + (x % 7) * 6, ct.sh); }
      if (k === 'walls') { rect(-100, 1300, 60, ct.base); for (let x = -100; x < 1200; x += 24) rect(x, 12, 72, ct.base); }
      if (k === 'belltower') { const x = 700; rect(x, 34, 240, ct.lt); poly([[x - 4, 240], [x + 17, 280], [x + 38, 240]], ct.sh); rect(x + 10, 14, 220, '#1a1410'); }
      if (k === 'cypress') for (const x of [150, 420, 900, 1060]) poly([[x - 10, 0], [x + 10, 0], [x, 150]], '#1e3a24');
      if (k === 'seawall') { rect(-100, 1300, 26, '#7a7a80'); rect(-100, 1300, 8, '#5a5a62'); }
      if (night && (k === 'harbour' || k === 'steelworks' || k === 'walls')) for (let i = 0; i < 26; i++) { const x = (i * 97) % 1150 - 40, z = 14 + (i * 37) % 50; const a = at(x, z); if (E.hash2(i, 3) > .4) px.rect(g, Math.round(a[0]), Math.round(a[1]), 2, 2, win); }
    }
  }
  /* ---- the LED boards on the north boards' face: sponsors, GOAL!, the team's colours in Europhoria ---- */
  boards(r) {
    const m = this.m, st = m.stadium, list = st.boards || [], seg = 208, msg = this.ledMsg;
    for (let i = 0, x = P.END_W + 16; x < P.END_E - 16; x += seg, i++) {
      const x0 = x, x1 = Math.min(P.END_E - 16, x + seg - 4);
      r.queue((x0 + x1) / 2, P.Y0 - .5, 12, g => {
        const a = r.w(x0, P.Y0 - .2, 23), b = r.w(x1, P.Y0 - .2, 3), X0 = Math.round(a[0]), Y0 = Math.round(a[1]), W = Math.round(b[0] - a[0]), Hh = Math.round(b[1] - a[1]);
        if (W < 4 || Hh < 3) return;
        const cyc = Math.floor((this.t / 4 + i * .37)) % list.length, side = msg ? msg.side : 0, tc = msg ? m.teams[side].kits.home : null;
        px.rect(g, X0, Y0, W, Hh, msg ? (Math.floor(this.t * 6) % 2 ? tc.shirt : tc.color2 || '#000') : '#0a0c14');
        const text = msg ? msg.text : list[cyc] || '', sc = Hh >= 16 ? 2 : 1, tw = E.font.width(text, { scale: sc }), sx = tw > W - 4 ? X0 + W - ((this.t * 40 + i * 50) % (tw + W)) : X0 + (W - tw) / 2;
        const col = msg ? (Math.floor(this.t * 6) % 2 ? tc.color2 || '#fff' : tc.shirt) : ['#ffd83a', '#7af0ff', '#ff7aa0', '#a0ff7a'][i % 4];
        if (tw > W - 4) { g.save(); g.beginPath(); g.rect(X0, Y0, W, Hh); g.clip(); E.font.text(g, text, Math.round(sx), Y0 + Math.round((Hh - 7 * sc) / 2), col, { scale: sc, outline: false }); g.restore(); px.reset(g); }
        else E.font.text(g, text, Math.round(sx), Y0 + Math.round((Hh - 7 * sc) / 2), col, { scale: sc, outline: false });
        px.rect(g, X0, Y0, W, 1, '#3a4058');
      }, { bias: 3 });
    }
  }
  /* ---- floodlight pylons at the north corners: a lattice tower and a bank of lamps ---- */
  pylons(r) {
    const m = this.m, lit = m.timeOfDay !== 'day' && !m.lightsOut;
    for (const x of [P.END_W + 6, P.END_E - 6]) {
      const y = 6, top = 230;
      r.queue(x, y, top / 2, g => {
        const a = r.w(x - 10, y, 0), b = r.w(x + 10, y, 0), c = r.w(x - 3, y, top), d = r.w(x + 3, y, top);
        const steel = '#5a5e6a', lt = '#8a8e9a';
        px.line(g, a[0], a[1], c[0], c[1], steel, 2); px.line(g, b[0], b[1], d[0], d[1], steel, 2);
        for (let k = 0; k < 10; k++) { const u0 = k / 10, u1 = (k + 1) / 10, p0 = [lerp(a[0], c[0], u0), lerp(a[1], c[1], u0)], p1 = [lerp(b[0], d[0], u1), lerp(b[1], d[1], u1)], p2 = [lerp(b[0], d[0], u0), lerp(b[1], d[1], u0)], p3 = [lerp(a[0], c[0], u1), lerp(a[1], c[1], u1)]; px.line(g, p0[0], p0[1], p1[0], p1[1], lt); px.line(g, p2[0], p2[1], p3[0], p3[1], lt); }
        const L0 = r.w(x - 18, y, top + 30), L1 = r.w(x + 18, y, top);
        px.rect(g, Math.round(L0[0]), Math.round(L0[1]), Math.round(L1[0] - L0[0]), Math.round(L1[1] - L0[1]), '#2a2c34');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const p = r.w(x - 14 + i * 9.3, y, top + 5 + j * 9), on = lit && !(m.lightsOut); px.rect(g, Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3, on ? '#fffbe8' : '#6a6a70'); }
      }, { emissive: lit });
      if (lit) r.queue(x, y, top + 15, g => { const p = r.w(x, y, top + 15); r.glowDisc(g, p[0], p[1], 26, '#fff0c0', .8); }, { emissive: true });
    }
  }
  /* ---- a goal: posts, bar, the net's back, sides and roof as a mesh that ripples ---- */
  goal(r, gx) {
    const s = gx === P.X0 ? -1 : 1, i = s < 0 ? 0 : 1, M = EF.Nets.mesh[i], net = '#e8ecf0', back = gx + s * P.NET;
    const D = (j, q) => M ? M[j * 5 + q].d * s : 0;
    r.queue(back, P.CY - P.GH, 0, g => {   // the back and far side, behind everything in the mouth
      px.blend(g, .55, 'normal', () => {
        for (let j = 0; j < 8; j++) { const y = P.CY - P.GH + j / 7 * P.GH * 2; const pts = []; for (let q = 0; q < 5; q++) pts.push(r.w(back + D(j, q), y, q / 4 * P.BAR * .9)); for (let q = 0; q < 4; q++) px.line(g, pts[q][0], pts[q][1], pts[q + 1][0], pts[q + 1][1], net); }
        for (let q = 0; q < 5; q++) { const z = q / 4 * P.BAR * .9; for (let j = 0; j < 7; j++) { const a = r.w(back + D(j, q), P.CY - P.GH + j / 7 * P.GH * 2, z), b = r.w(back + D(j + 1, q), P.CY - P.GH + (j + 1) / 7 * P.GH * 2, z); px.line(g, a[0], a[1], b[0], b[1], net); } }
        for (let k = 0; k <= 4; k++) { const x = lerp(gx, back, k / 4), a = r.w(x, P.CY - P.GH, 0), b = r.w(x, P.CY - P.GH, P.BAR * lerp(1, .9, k / 4)); px.line(g, a[0], a[1], b[0], b[1], net); }
        for (let k = 0; k <= 6; k++) { const y = P.CY - P.GH + k / 6 * P.GH * 2, a = r.w(gx, y, P.BAR), b = r.w(back, y, P.BAR * .9); px.line(g, a[0], a[1], b[0], b[1], net); }
      });
    }, { bias: -2 });
    r.queue(gx, P.CY + P.GH + 1, 0, g => {   // the near side net
      px.blend(g, .5, 'normal', () => { for (let k = 0; k <= 4; k++) { const x = lerp(gx, back, k / 4), a = r.w(x, P.CY + P.GH, 0), b = r.w(x, P.CY + P.GH, P.BAR * lerp(1, .9, k / 4)); px.line(g, a[0], a[1], b[0], b[1], net); } for (let q = 0; q <= 4; q++) { const a = r.w(gx, P.CY + P.GH, q / 4 * P.BAR), b = r.w(back, P.CY + P.GH, q / 4 * P.BAR * .9); px.line(g, a[0], a[1], b[0], b[1], net); } });
    }, { bias: 1 });
    for (const py of [P.CY - P.GH, P.CY + P.GH]) r.queue(gx, py, P.BAR / 2, g => { const a = r.w(gx, py, 0), b = r.w(gx, py, P.BAR + 1); px.rect(g, Math.round(a[0]) - 1, Math.round(b[1]), 3, Math.round(a[1] - b[1]), '#f4f4f0'); px.rect(g, Math.round(a[0]) + 1, Math.round(b[1]), 1, Math.round(a[1] - b[1]), '#a8acb8'); });
    r.queue(gx, P.CY + P.GH, P.BAR, g => { const a = r.w(gx, P.CY - P.GH, P.BAR), b = r.w(gx, P.CY + P.GH, P.BAR); px.line(g, a[0], a[1], b[0], b[1], '#f4f4f0', 3); px.line(g, a[0], a[1] + 1, b[0], b[1] + 1, '#a8acb8'); }, { bias: 2 });
  }
  flag(r, cx, cy) {
    const m = this.m, wind = (m.weather && m.weather.wind) || .2, k = m.teams[0].kits.home;
    const spr = EF.SPR.flag[Math.floor(this.t * (4 + wind * 8) + cx) % 3];
    r.queue(cx, cy, 0, g => { const a = r.w(cx, cy, 0), b = r.w(cx, cy, 22); px.line(g, a[0], a[1], b[0], b[1], '#e8e8e0'); px.sprite(g, k.shirt === '#f08a24' ? spr : E.recolor(spr, { '#f08a24': k.shirt, '#ffb860': E.shade(k.shirt, .3) }), Math.round(b[0]) + 1, Math.round(b[1])); });
  }
  /* ---- the south apron: dugouts with the managers, the fourth official, photographers' flashes ---- */
  apron(r, src) {
    const m = this.m;
    for (const s of [0, 1]) {
      const x = P.CX + (s ? 130 : -130), y = P.Y1 + 40, col = m.teams[s].kits.home.shirt;
      r.queue(x, y + 8, 0, g => { r.box(g, x - 34, y, 0, x + 34, y + 10, 16, '#2a2e3a', '#3a4050'); px.blend(g, .4, 'normal', () => r.box(g, x - 36, y - 4, 16, x + 36, y + 10, 18, '#a8c8e0', '#7a98b0')); const a = r.w(x - 30, y, 6); px.rect(g, Math.round(a[0]), Math.round(a[1]), Math.round(60 * (r.view.zoom || 1)), 2, col); });
      const mg = this.managers[s]; r.shadow(mg.x, mg.y, 5, .3); r.actor(mg.x, mg.y, 0, (g, ox, oy) => mg.rig.draw(g, ox, oy, r.view));
    }
    r.actor(P.CX, P.Y1 + 24, 0, (g, ox, oy) => this.fourth.draw(g, ox, oy, r.view));
    if (m.stoppageShown && Math.floor(m.minute) % 45 >= 43 && m.half < 3 && !src.replay) {
      r.queue(P.CX, P.Y1 + 23, 30, g => { const p = r.w(P.CX, P.Y1 + 23, 34); px.rect(g, Math.round(p[0]) - 9, Math.round(p[1]) - 6, 18, 11, '#101418'); E.font.text(g, '+' + m.stoppage, Math.round(p[0]), Math.round(p[1]) - 4, '#7aff6a', { align: 'center', outline: false }); }, { emissive: true });
    }
    for (const f of this.flashes) if (f.t < 0) r.queue(f.x, f.y, 10, g => { const p = r.w(f.x, f.y, 10); r.glowDisc(g, p[0], p[1], 6, '#ffffff', 1); }, { emissive: true });
  }
  jumbotron(r) {
    const m = this.m, x0 = P.CX - 90, x1 = P.CX + 90;
    r.queue(P.CX, 2, 150, g => {
      const a = r.w(x0, 2, 190), b = r.w(x1, 2, 120), X = Math.round(a[0]), Y = Math.round(a[1]), W = Math.round(b[0] - a[0]), Hh = Math.round(b[1] - a[1]);
      px.rect(g, X - 3, Y - 3, W + 6, Hh + 6, '#2a2a34'); px.rect(g, X, Y, W, Hh, '#06081a');
      const msg = m.mode === 'replay' ? 'REPLAY' : this.ledMsg ? this.ledMsg.text : null;
      if (msg) E.font.text(g, msg, X + W / 2, Y + Hh / 2 - 7, Math.floor(this.t * 4) % 2 ? '#ffd83a' : '#ffffff', { align: 'center', scale: 2, outline: false });
      else { EF.drawCrest(g, m.teams[0], X + 14, Y + Hh / 2, Math.min(24, Hh - 4)); EF.drawCrest(g, m.teams[1], X + W - 14, Y + Hh / 2, Math.min(24, Hh - 4)); E.font.text(g, m.score[0] + ' - ' + m.score[1], X + W / 2, Y + Hh / 2 - 7, '#ffffff', { align: 'center', scale: 2, outline: false }); }
    }, { emissive: true });
  }
  bus(r, BU) {
    const x = BU.x, y = BU.y, d = BU.d / 2, w = BU.w / 2, h = BU.h;
    r.queue(x, y + w, h / 2, g => {
      r.box(g, x - d, y - w, 4, x + d, y + w, h, '#c8ccd4', '#7a1a2a');
      const a = r.w(x - d, y + w, h - 6), b = r.w(x + d, y + w, h - 16); px.rect(g, Math.round(a[0]) + 1, Math.round(a[1]), Math.max(1, Math.round(b[0] - a[0]) - 2), Math.max(1, Math.round(b[1] - a[1])), BU.state === 'leave' ? '#3a3a40' : '#8ac0e8');
      for (const wy of [y - w + 10, y + w - 10]) { const p = r.w(x, wy, 4); px.disc(g, p[0], p[1], 3, '#1a1a1a'); }
      const t = r.w(x, y, h + 1); E.font.text(g, 'ACL', t[0], t[1] - 6, '#c8ccd4', { align: 'center', font: 'tiny', outline: '#3a0a10' });
    });
  }
  events(r, src) {
    for (const ev of src.events || []) {
      if (ev.id === 'seagull') { const z = ev.z || 0, fl = Math.floor(this.t * 10) % 2; r.shadow(ev.x, ev.y, 3, .3); r.sprite(ev.x, ev.y, z, fl && ev.state !== 'sit' ? E.recolor(EF.SPR.gull, {}) : EF.SPR.gull, { anchor: 'bottom', scale: 1 }); }
      else if (ev.id === 'beachball' && !ev.popped) { const x = ev.x, y = ev.y, z = ev.z || 0; r.shadow(x, y, 6, .3); r.queue(x, y, z, g => { const p = r.w(x, y, z + 7), rr = 7 * (r.view.zoom || 1); px.disc(g, p[0], p[1], rr, '#ffffff'); px.poly(g, [[p[0], p[1]], [p[0] - rr, p[1] - rr * .3], [p[0] - rr * .3, p[1] - rr]], '#ff4a4a'); px.poly(g, [[p[0], p[1]], [p[0] + rr, p[1] - rr * .3], [p[0] + rr * .3, p[1] - rr]], '#4a8aff'); px.poly(g, [[p[0], p[1]], [p[0] - rr * .6, p[1] + rr * .8], [p[0] + rr * .6, p[1] + rr * .8]], '#ffe040'); }); }
      else if (ev.id && ev.id.startsWith('invader')) {
        const er = this.evRigs.get(ev.id); if (!er || !er.live) continue; const B = er.live.body;
        r.shadow(B.x, B.y, 7, .35); r.actor(B.x, B.y, 0, (g, ox, oy) => er.inv.draw(g, ox, oy, r.view));
        if (!er.live.caught) { const hd = er.inv.worldOffset(er.inv.J.head); if (ev.id === 'invader-keith') r.sprite(B.x + hd[0], B.y + hd[1], hd[2] - 3, EF.SPR.kipper, { anchor: 'center', scale: 2 }); else r.queue(B.x, B.y, hd[2] + 4, g => { const p = r.w(B.x + hd[0], B.y + hd[1], hd[2] + 4); px.line(g, p[0] - 2, p[1], p[0] - 7, p[1] - 7, '#c8a878', 2); px.line(g, p[0] + 2, p[1], p[0] + 7, p[1] - 7, '#c8a878', 2); px.line(g, p[0] - 5, p[1] - 4, p[0] - 9, p[1] - 4, '#c8a878'); px.line(g, p[0] + 5, p[1] - 4, p[0] + 9, p[1] - 4, '#c8a878'); }); }
        er.live.stewards.forEach((s, i) => { r.shadow(s.x, s.y, 5, .3); r.actor(s.x, s.y, 0, (g, ox, oy) => er.st[i].draw(g, ox, oy, r.view)); });
      }
      else if (ev.id === 'drone') { const x = ev.x, y = ev.y, z = 110; r.shadow(x, y, 5, .25); r.queue(x, y, z, g => { const p = r.w(x, y, z); px.rect(g, p[0] - 5, p[1] - 1, 10, 3, '#2a2a30'); px.rect(g, p[0] - 7, p[1] - 3, 4, 1, '#8a8a90'); px.rect(g, p[0] + 3, p[1] - 3, 4, 1, '#8a8a90'); if (Math.floor(this.t * 3) % 2) px.rect(g, p[0], p[1] + 2, 1, 1, '#ff3a3a'); }, { emissive: true }); }
    }
  }
  decalsDraw(r) {
    const m = this.m;
    if (m.surface === 'snow' && EF.fxRng() < .3) for (const f of m.players) if (Math.hypot(f.body.vx, f.body.vy) > 50 && !f.ghost) this.decals.push({ x: f.body.x, y: f.body.y, t: 6 });
    if (this.decals.length > 220) this.decals.splice(0, this.decals.length - 220);
    for (const d of this.decals) d.t -= 1 / 60;
    this.decals = this.decals.filter(d => d.t > 0);
    if (this.decals.length) r.decal(g => { for (const d of this.decals) { const p = r.w(d.x, d.y, 0); px.rect(g, Math.round(p[0]), Math.round(p[1]), 2, 1, d.t > 3 ? '#b8c4d4' : '#ccd6e2'); } });
  }
  /* ---- the ball: its shadow, its sprite by style, trails, the split super's decoys ---- */
  ballDraw(r, src) {
    const m = this.m, b = src.ball, style = EF.BALLS[m.ballStyle] || EF.BALLS.classic, def = m.ball.superDef;
    r.shadow(b.x, b.y, Math.max(1.5, 3 - Math.min(1.5, b.z * .05)), Math.max(.15, .45 - b.z * .004));
    const T = b.trail || [];
    if (T.length > 1) {
      const col = b.superPath ? (def && def.color) || '#ffc83a' : '#ffffff';
      r.queue(b.x, b.y, b.z, g => { for (let i = 1; i < T.length; i++) { const a = r.w(T[i - 1][0], T[i - 1][1], T[i - 1][2] + 3), c = r.w(T[i][0], T[i][1], T[i][2] + 3); px.blend(g, i / T.length * .8, 'add', () => px.line(g, a[0], a[1], c[0], c[1], col, b.superPath ? 3 : 2)); } }, { emissive: true, bias: -.5 });
      if (b.superPath && def) { const kind = def.trail; if (kind === 'smoke') game.particles.smoke(b.x, b.y, b.z + 3, 1, { size: .8, color: '#8a8a90' }); else if (kind === 'fire') game.particles.fire(b.x, b.y, b.z + 3, 1, { size: .8 }); else if (kind === 'gold' || kind === 'sparkle') game.particles.glints(b.x, b.y, b.z + 3, 1, def.color); else if (kind === 'sparks') game.particles.sparks(b.x, b.y, b.z + 3, 2, null, { color: '#ffa040' }); }
    }
    const fr = style.frames[Math.floor((b.roll || 0) / 5) % 4];
    if (b.superPath && def && def.ball === 'kipper') r.sprite(b.x, b.y, b.z + 3, EF.SPR.kipperBall, { anchor: 'center', rot: Math.atan2(b.vy, b.vx) });
    else r.sprite(b.x, b.y, b.z + 2.5, fr, { anchor: 'center', glow: style.glow || b.superPath ? .6 : 0 });
    if (b.decoys) { const sp = Math.hypot(b.vx, b.vy) || 1, nx = -b.vy / sp, ny = b.vx / sp, k = 26; for (const d of b.decoys) if (d.alive) r.sprite(b.x + nx * k * d.k, b.y + ny * k * d.k, b.z + 2.5, EF.BALLS.golden.frames[Math.floor(this.t * 20) % 4], { anchor: 'center', glow: .6 }); }
  }
  fogDraw(r, k) {
    r.overlay(g => { for (let i = 0; i < 4; i++) { const y0 = Math.round(r.H * (i / 4)), hgt = Math.round(r.H / 4) + 1, a = k * (.25 + i * .05); px.polyDither(g, [[0, y0], [r.W, y0], [r.W, y0 + hgt], [0, y0 + hgt]], '#c8ccd4', a, Math.round(this.t * 6) + i * 3, 0); } });
  }
  smokeDraw(r, ev) {
    const x = ev.x; r.queue(x, P.CY, 30, g => { for (let i = 0; i < 6; i++) { const p = r.w(x + Math.sin(this.t + i) * 40 - i * 20 * ev.dir, P.Y0 + 40 + i * 70, 20); px.ddisc(g, p[0], p[1], 40, '#d8483a', .4, r.ix, r.iy); } }, { bias: 5 });
  }
}
EF.MatchView = MatchView;
/* ==== src/26-crowd.js ==== */
/* THE CROWD (section 6.18): fans on every tier, drawn by code in their side's colours; a mood per side that follows the
 * danger, goals and misses; states that set the animation: idle, tense, jump, despair, boo, scarf wall (Euphoria 67+),
 * the Mexican wave (67+ and two goals up), Europhoria (flares and the tifo). The front row are classic rigs. */
class CrowdView {
  constructor(m) {
    this.m = m; this.fans = []; this.rows = []; this.rigs = []; this.state = ['idle', 'idle']; this.stateT = [0, 0]; this.mood = [.3, .3]; this.tifo = [0, 0]; this.wave = -1; this.waveT = 0;
    const st = m.stadium, size = (st.crowd && st.crowd.size) || 800, home = (st.crowd && st.crowd.home) || .7, dens = clamp(size / 1500, .005, 1), map = m.pitch.map, R = E.rng(st.id.length * 131 + 7);
    const kit = s => m.teams[s].kits.home, skins = ['#f0c8a8', '#e0b090', '#c89070', '#8a5a3a', '#6a4028', '#f4d8c0'], hairs = ['#2a1a10', '#5a3a20', '#c8a050', '#1a1210', '#8a8a8a', '#a84a20'];
    const make = (x, y, z, side, faceX, rowKey) => {
      if (R() > dens) return;
      const k = kit(side), r = R(), shirt = r < .45 ? k.shirt : r < .7 ? (k.color2 || k.shirt) : r < .8 ? k.socks || k.shirt : ['#3a3a48', '#5a4a3a', '#2a3a5a', '#6a2a2a'][Math.floor(R() * 4)];
      const kind = R() < .12 ? 'flag' : R() < .3 ? 'scarf' : R() < .035 ? 'drum' : 'plain';
      const f = { x, y, z, side, shirt, scarf: k.color2 || '#ffffff', skin: skins[Math.floor(R() * skins.length)], hair: hairs[Math.floor(R() * hairs.length)], kind, ph: R() * TAU, faceX, rowKey, hat: R() < .15 ? k.shirt : null };
      this.fans.push(f); return f;
    };
    // the north stand: tier rows, two rows of fans a tier; west of a split the home side, mixed in the middle, away to the east
    const tierH = (st.stands && st.stands.north && st.stands.north.heights) || [34, 44, 54, 64, 74, 84];
    for (let r = 0; r < P.NS; r++) {
      const tier = P.NS - 1 - r, n = Math.min(P.NS, (st.stands && st.stands.north && st.stands.north.tiers) || 5); if (tier >= n) continue;
      for (const dy of [5, 11]) {
        const row = { key: 'n' + r + dy, y: r * P.T + dy, z: tierH[tier], fans: [], front: tier === 0 && dy === 11 };
        for (let x = 6; x < P.COLS * P.T - 6; x += 6.5 + (R() - .5) * 1.5) {
          const u = x / (P.COLS * P.T), side = u < .3 ? (R() < .92 ? 0 : 1) : u > .78 ? (R() < .8 ? 1 : 0) : R() < home ? 0 : 1;
          const f = make(x, row.y, row.z, side, 0, row.key); if (f) row.fans.push(f);
        }
        this.rows.push(row);
      }
    }
    // the end stands: columns of tiers; west for the home side, east for the away side
    const endN = Math.min(P.END, (st.stands && st.stands.end && st.stands.end.tiers) || 4);
    for (const west of [true, false]) for (let t = 0; t < endN; t++) {
      const c = west ? P.END - 1 - t : P.COLS - P.END + t, z = [28, 38, 48, 58][t];
      for (const dx of [5, 11]) {
        const x = c * P.T + (west ? 16 - dx : dx);
        for (let y0 = (P.NS) * P.T; y0 < (P.NS + 3 + P.FH) * P.T; y0 += 64) {
          const row = { key: (west ? 'w' : 'e') + t + dx + y0, x, y: y0 + 32, z, fans: [], end: true };
          for (let y = y0 + 4; y < y0 + 64; y += 6.5 + (R() - .5) * 1.5) { const side = west ? (R() < .9 ? 0 : 1) : (R() < .9 ? 1 : 0); const f = make(x, y, z, side, west ? 1 : -1, row.key); if (f) row.fans.push(f); }
          this.rows.push(row);
        }
      }
    }
    // the front row of the north stand: real (classic) rigs that cheer, wave and boo
    if (size > 50) for (let i = 0; i < 18; i++) {
      const x = P.X0 + 20 + i * (P.L - 40) / 17 + (R() - .5) * 20, side = x < P.CX - 120 ? 0 : x > P.CX + 160 ? 1 : (R() < home ? 0 : 1), k = kit(side);
      const rig = new E.Humanoid({ style: 'classic', size: .9, weapon: null, colors: { cloth: R() < .5 ? k.shirt : k.color2 || k.shirt, pants: '#2a2a34', skin: skins[Math.floor(R() * 6)], hair: hairs[Math.floor(R() * 6)] } });
      this.rigs.push({ rig, x, y: (P.NS - 1) * P.T + 13, z: tierH[0], side, ph: R() * 9 });
    }
    // the rec: a few parents on a bench
    if (size <= 50) for (let i = 0; i < 6; i++) { const rig = new E.Humanoid({ style: 'classic', size: .95, weapon: null, colors: { cloth: ['#5a6a8a', '#8a5a4a', '#4a7a5a'][i % 3], pants: '#3a3a44', skin: skins[i % 6], hair: hairs[i % 6] } }); this.rigs.push({ rig, x: P.CX - 80 + i * 26, y: P.Y0 - 30, z: 0, side: 0, ph: i }); }
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.on(ev); });
  }
  dispose() { if (this.unsub) this.unsub(); }
  set(s, st, t) { this.state[s] = st; this.stateT[s] = t || 2.5; }
  on(ev) {
    const m = this.m;
    switch (ev.type) {
      case 'goal': case 'ownGoal': this.set(ev.side, 'jump', 4); this.set(1 - ev.side, 'despair', 3); this.mood[ev.side] = 1; break;
      case 'nearMiss': case 'woodwork': { const a = m.lastKick ? m.lastKick.side : 0; this.set(a, 'despair', 1.6); this.set(1 - a, 'jump', 1); break; }
      case 'save': this.set(ev.who.side, 'jump', 1.5); break;
      case 'diveBooked': this.set(1 - ev.who.side, 'boo', 2.5); this.set(ev.who.side, 'despair', 2); break;
      case 'card': this.set(ev.who.side, 'boo', 2.4); this.set(1 - ev.who.side, 'jump', 1); break;
      case 'foul': this.set(ev.victim.side, 'boo', 1.5); break;
      case 'europhoria': this.set(ev.side, 'europhoria', EF.T.europhoriaTime); break;
      case 'europhoriaEnd': if (this.state[ev.side] === 'europhoria') this.set(ev.side, 'idle', .1); break;
      case 'superStrike': this.set(0, 'tense', 1.5); this.set(1, 'tense', 1.5); break;
      case 'shot': if (ev.who) this.set(ev.who.side, 'tense', .7); break;
    }
  }
  update(dt) {
    const m = this.m;
    for (const s of [0, 1]) {
      this.stateT[s] -= dt;
      if (this.stateT[s] <= 0 && this.state[s] !== 'idle' && this.state[s] !== 'scarf' && this.state[s] !== 'wave') this.state[s] = 'idle';
      const danger = m.ball ? clamp(m.u(s, m.ball.x) * 1.4 - .5, 0, 1) : 0;
      this.mood[s] = approach(this.mood[s], .25 + danger * .5 + m.euphoria[s] / 300, dt * .3);
      const eu = m.euphoria[s], lead = m.score[s] - m.score[1 - s];
      if (this.stateT[s] <= 0) this.state[s] = eu >= 67 && lead >= 2 ? 'wave' : eu >= 67 ? 'scarf' : 'idle';
      this.tifo[s] = approach(this.tifo[s], this.state[s] === 'europhoria' ? 1 : 0, dt * (this.state[s] === 'europhoria' ? 1 : .7));
    }
    this.waveT += dt;
    for (const R2 of this.rigs) {
      const st = this.state[R2.side], t = m.t + R2.ph, ex = st === 'jump' || st === 'europhoria';
      R2.rig.update(dt, { x: R2.x, y: R2.y, z: R2.z + (ex ? Math.abs(Math.sin(t * 8)) * 3 : 0), vx: 0, vy: 0, facing: Math.PI / 2, pose: ex || st === 'scarf' ? 'cheer' : st === 'wave' && Math.sin(this.waveT * 2 - R2.x / 90) > .6 ? 'cheer' : st === 'boo' ? 'guard' : st === 'despair' ? 'kneel' : null, expr: ex ? 'shout' : st === 'boo' ? 'angry' : st === 'despair' ? 'wince' : 'smile' });
    }
  }
  /** a fan's look this frame: rise (jump), arms (0 down .. 2 up), lean */
  fanPose(f, t) {
    const st = this.state[f.side], ph = f.ph;
    if (st === 'jump' || st === 'europhoria') return { up: Math.abs(Math.sin(t * 7 + ph)) * 2.5, arms: 2 };
    if (st === 'despair') return { up: 0, arms: 3 };
    if (st === 'boo') return { up: 0, arms: Math.sin(t * 9 + ph) > 0 ? 1 : 0, boo: true };
    if (st === 'scarf') return { up: 0, arms: 2, sway: Math.sin(t * 2.6 + f.x * .02) * 1.2, scarf: true };
    if (st === 'wave') { const w = Math.sin(t * 2 - (f.x + f.y) / 90); return w > .7 ? { up: 2, arms: 2 } : { up: 0, arms: 0 }; }
    if (st === 'tense') return { up: 0, arms: 1 };
    return { up: Math.max(0, Math.sin(t * 2.2 + ph)) * .4 * this.mood[f.side], arms: f.kind === 'flag' ? 2 : f.kind === 'drum' ? 1 : 0 };
  }
  draw(r, src) {
    const m = this.m, t = m.t, zoom = (r.view.zoom || 1), s = Math.max(1, Math.round(zoom * .9)), flareOn = [this.state[0] === 'europhoria', this.state[1] === 'europhoria'];
    for (const row of this.rows) {
      if (!row.fans.length) continue;
      const ax = row.end ? row.x : P.COLS * P.T / 2;
      if (!r.visible(ax, row.y, row.z, row.end ? 40 : 2000, 40, 40)) continue;
      r.queue(ax, row.y, row.z, g => {
        for (const f of row.fans) {
          const p = r.w(f.x, f.y, f.z), X = Math.round(p[0]), Y = Math.round(p[1]);
          if (X < -8 || X > r.W + 8 || Y < -12 || Y > r.H + 12) continue;
          const q = this.fanPose(f, t), up = Math.round(q.up * s), sw = Math.round((q.sway || 0) * s);
          const by = Y - 3 * s - up, hy = by - 2 * s;
          px.rect(g, X - s - s + sw, by, 3 * s + s, 3 * s, f.shirt);                    // body
          px.rect(g, X - s + sw, hy, 2 * s, 2 * s, f.skin);                              // head
          px.rect(g, X - s + sw, hy, 2 * s, s, f.hat || f.hair);
          const ac = f.shirt;
          if (q.arms === 2) { px.rect(g, X - 3 * s + sw, hy - s, s, 3 * s, ac); px.rect(g, X + 2 * s + sw, hy - s, s, 3 * s, ac); if (q.scarf || f.kind === 'scarf') px.rect(g, X - 3 * s + sw, hy - 2 * s, 6 * s, s, f.scarf); }
          else if (q.arms === 3) { px.rect(g, X - 2 * s + sw, hy - s, s, 2 * s, ac); px.rect(g, X + s + sw, hy - s, s, 2 * s, ac); }
          else if (q.arms === 1) { px.rect(g, X - 3 * s + sw, by, s, 2 * s, ac); px.rect(g, X + 2 * s + sw, by, s, 2 * s, ac); }
          if (f.kind === 'flag' && (q.arms === 2 || this.mood[f.side] > .5)) { const fx2 = X + 2 * s + sw, fy = hy - 5 * s, wv = Math.sin(t * 6 + f.ph) > 0 ? 1 : 0; px.rect(g, fx2, fy, s, 6 * s, '#d8d0c0'); px.rect(g, fx2 + s, fy + wv * s, 4 * s, 3 * s, f.scarf); px.rect(g, fx2 + s, fy + wv * s, 4 * s, s, f.shirt); }
          if (f.kind === 'drum') { px.rect(g, X - s, by + s, 3 * s, 2 * s, '#e8e0d0'); if (Math.sin(t * 8 + f.ph) > .5) px.rect(g, X - 2 * s, by - s, s, s, '#ffffff'); }
          if (q.boo) px.rect(g, X - s + sw, hy + s, s, s, '#1a1010');
        }
      }, { bias: .5 });
    }
    for (const R2 of this.rigs) if (r.visible(R2.x, R2.y, R2.z)) r.actor(R2.x, R2.y, R2.z, (g, ox, oy) => R2.rig.draw(g, ox, oy, r.view), { every: 3, key: R2.rig, outline: false });
    // flares in the front rows of a side in Europhoria: fire, smoke and red light
    for (const s2 of [0, 1]) if (flareOn[s2] && EF.fxRng() < .5) {
      const x = s2 === 0 ? EF.fx(P.X0 - 40, P.CX - 140) : EF.fx(P.CX + 140, P.X1 + 40), y = (P.NS - 1) * P.T + 12, z = 34;
      game.particles.fire(x, y, z + 2, 1, { size: .7 }); if (EF.fxRng() < .3) game.particles.smoke(x, y, z + 8, 1, { size: 1, color: '#c84a4a' });
      game.lights.add(x, y, z, 70, .5, { color: '#ff4a2a' });
    }
    // the tifo: unrolled over the side's part of the north stand
    for (const s2 of [0, 1]) if (this.tifo[s2] > .02) this.drawTifo(r, s2, this.tifo[s2]);
  }
  drawTifo(r, s, k) {
    const m = this.m, team = m.teams[s], x0 = s === 0 ? P.X0 - 80 : P.CX + 120, x1 = s === 0 ? P.CX - 120 : P.X1 + 80, y = 4, top = ((m.stadium.stands.north.heights || [])[Math.min(4, (m.stadium.stands.north.tiers || 5) - 1)] || 70) + 26;
    r.queue((x0 + x1) / 2, (P.NS - 1) * P.T + 14, top, g => {
      const a = r.w(x0, (P.NS - 1) * P.T + 14, 30), b = r.w(x1, y, top), X0 = Math.round(a[0]), X1 = Math.round(lerp(a[0], b[0], k)), Y0 = Math.round(b[1]), Y1 = Math.round(a[1]);
      if (X1 - X0 < 4) return;
      const k1 = team.kits.home, t1 = E.tones(k1.shirt), t2 = E.tones(k1.color2 || '#ffffff');
      px.rect(g, X0, Y0, X1 - X0, Y1 - Y0, t1.base);
      for (let i = 0; i < 6; i++) px.rect(g, X0, Y0 + Math.round((Y1 - Y0) * i / 6), X1 - X0, Math.max(1, Math.round((Y1 - Y0) / 14)), t1.lt);
      const cs = Math.min(Y1 - Y0 - 8, 48); if (k > .55 && cs > 12) EF.drawCrest(g, team, Math.round(lerp(X0, X1, .25)), Math.round((Y0 + Y1) / 2), cs);
      if (k > .7) E.font.text(g, team.tifo || team.short, Math.round(lerp(X0, X1, .62)), Math.round((Y0 + Y1) / 2) - 7, t2.hi, { align: 'center', scale: 2, outline: t1.deep });
      px.rect(g, X1 - 2, Y0, 3, Y1 - Y0, t2.base);
    }, { bias: 2 });
  }
}
EF.CrowdView = CrowdView;
/* ==== src/27-cast.js ==== */
/* THE CAST: the story's characters (the manager, the commentators, the villain, the referee, the PA) as rigs with
 * their voices, and any player of any team by id (portraits, tabloid photos, stickers). */
EF.CAST = {
  mags: { name: 'MAGS MULLIGAN', role: 'MANAGER, KIPPERTON ATHLETIC', rig: { size: 1.1, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'long', hat: { style: 'cap', color: '#3a3a44' }, colors: { cloth: '#1c2a5a', coat: '#5a4a3a', pants: '#2a2a30', skin: '#f0c8a8', hair: '#c8c8c8', trim: '#f08a24' } }, voice: { f0: 215, wave: 'saw', breath: .25, rate: 1, formant: 1 } },
  barry: { name: 'BARRY BELLOW', role: 'COMMENTATOR', rig: { size: 1.05, outfit: 'coat', sleeves: 'long', hair: 'spiky', hat: { style: 'band', color: '#2a2a2a' }, colors: { cloth: '#e8e0d0', coat: '#7a2a3a', pants: '#2a2a30', skin: '#f0c0a0', hair: '#a86a3a' } }, voice: { f0: 160, wave: 'saw', rate: 1.1, formant: 1.08 } },
  trev: { name: 'TREV BRICKLEY', role: 'CO-COMMENTATOR', rig: { size: 1.1, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'bald', hat: { style: 'band', color: '#2a2a2a' }, colors: { cloth: '#c8d0e0', coat: '#2a3a5a', pants: '#2a2a30', skin: '#e0b090', hair: '#8a8a8a' } }, voice: { f0: 95, wave: 'pulse', rate: .85, formant: .9 } },
  baron: { name: 'BARON VON BULLION', role: 'OWNER, OLYMPIQUE OPULENCE', rig: { size: 1.15, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'crown', color: '#e8c040' }, colors: { cloth: '#f4f0e0', coat: '#141414', pants: '#141414', skin: '#f0d8c0', hair: '#e8e8e8', trim: '#e8c040' } }, voice: { f0: 80, wave: 'saw', vibrato: .03, rate: .8, formant: .85 } },
  pa: { name: 'STADIUM ANNOUNCER', role: 'PA', rig: { size: 1, outfit: 'shirt', hair: 'short', colors: { cloth: '#6a6a7a', skin: '#e0b090', hair: '#3a3030' } }, voice: { f0: 120, wave: 'pulse', echo: true, rate: .95, formant: 1 } },
  ref: { name: 'THE REFEREE', role: 'REFEREE', rig: { size: 1.05, build: 'heroic', hair: 'short', colors: { cloth: '#141418', pants: '#141418', trim: '#e8d040', skin: '#e8b890', hair: '#3a2a1a' } }, voice: { f0: 135, wave: 'saw', rate: 1.05, formant: 1 } },
  clerk: { name: 'A FEDERATION CLERK', role: 'CONTINENTAL FEDERATION', rig: { size: 1, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#e8e8f0', coat: '#3a3a4a', pants: '#2a2a34', skin: '#e8c0a0', hair: '#5a4a3a' } }, voice: { f0: 170, wave: 'pulse', rate: 1.2, formant: 1.1 } }
};
EF.Cast = {
  _rigs: {},
  /** a story character's rig (cached) or a player's: 'mags', or 'kipperton:pilchard' */
  rig(id) {
    if (this._rigs[id]) return this._rigs[id];
    let r;
    if (EF.CAST[id]) r = new E.Humanoid(Object.assign({ weapon: null }, EF.CAST[id].rig));
    else { const p = this.player(id); r = p ? EF.Art.rigFor(p.team, 'home', p.p) : new E.Humanoid({ weapon: null }); }
    this._rigs[id] = r; r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); return r;
  },
  player(id) {
    if (!id || !id.includes(':')) { for (const t of EF.all('team')) { const p = t.players.find(q => q.id === id); if (p) return { team: t, p }; } return null; }
    const [tid, pid] = id.split(':'), t = EF.get('team', tid); if (!t) return null; const p = t.players.find(q => q.id === pid); return p ? { team: t, p } : null;
  },
  name(id) { if (EF.CAST[id]) return EF.CAST[id].name; const p = this.player(id); return p ? p.p.name : String(id).toUpperCase(); },
  voice(id) { if (EF.CAST[id]) return EF.CAST[id].voice; const p = this.player(id); return p ? Object.assign({ rate: 1, formant: 1 }, p.p.voice) : { f0: 140, wave: 'saw' }; }
};
/* ==== src/30-ui.js ==== */
/* THE 10-FOOT UI KIT (section 6.23): a screen stack of canvas screens with focusable widgets. D-pad, stick, arrows and
 * WASD move the focus (to the nearest widget that way); confirm / Enter / a click picks; cancel / Esc / a right click
 * goes back; the mouse's hover moves the focus while it moves; L1/R1 (Q/E) turn tabs and pages. Big type, few
 * choices per screen, a prompt footer. A screen: { id, title, widgets, layout(r), draw(g, r), update(dt), onBack,
 * footer: [[action, label]] }. Widgets: { id, kind: 'tile' | 'button' | 'slider' | 'toggle' | 'choice', x, y, w, h,
 * title, text, icon(g, x, y, w, h, focused), onPick, get, set, options, min, max, step, disabled } */
const UIK = EF.UI = {
  stack: [], t: 0, lastPtr: null, hoverOn: false, sound: true,
  set(list) { this.stack = list.slice(); for (const s of this.stack) this.init(s); },
  push(s) { this.init(s); this.stack.push(s); EF.sfx('confirm'); game.input.consumeAll(); return s; },
  pop() { const s = this.stack.pop(); if (s && s.onClose) s.onClose(); EF.sfx('cancel'); game.input.consumeAll(); return s; },
  replace(s) { this.stack.pop(); return this.push(s); },
  top() { return this.stack[this.stack.length - 1] || null; },
  init(s) { s.focus = s.focus || 0; s.t = 0; if (s.widgets && s.widgets[s.focus] && s.widgets[s.focus].disabled) s.focus = Math.max(0, s.widgets.findIndex(w => !w.disabled)); },
  focusId() { const s = this.top(); return s && s.widgets && s.widgets[s.focus] ? s.widgets[s.focus].id : null; },
  focused() { const s = this.top(); return s && s.widgets ? s.widgets[s.focus] : null; },
  setFocus(id) { const s = this.top(); if (!s) return; const i = s.widgets.findIndex(w => w.id === id); if (i >= 0) s.focus = i; },
  /** any player's menu press */
  pressed(a) { return game.players.some(I => I.pressed(a)); },
  repeat(a) { return game.players.some(I => I.repeat ? I.repeat(a, .32, .08) : I.pressed(a)); },
  update(dt) {
    const s = this.top(); if (!s) return false; this.t += dt; s.t += dt;
    if (s.layout) s.layout(game.r || { W: game.W, H: game.H });
    if (s.update && s.update(dt) === true) return true;
    const W = s.widgets || [], I = game.input;
    // the mouse: hover focuses while it moves; a click picks what is under it
    const ptr = I.pointer && I.pointer();
    if (ptr && (!this.lastPtr || Math.abs(ptr[0] - this.lastPtr[0]) + Math.abs(ptr[1] - this.lastPtr[1]) > 2)) { const i = this.hit(W, ptr); if (i >= 0 && i !== s.focus && !W[i].disabled) { s.focus = i; this.moved(); } }
    this.lastPtr = ptr ? ptr.slice() : null;
    const click = I.clicked && I.clicked();
    if (click) { const i = this.hit(W, click); if (i >= 0) { s.focus = i; const w = W[i]; if (w.kind === 'slider') { this.sliderAt(w, click[0]); return true; } this.pick(s, w); return true; } }
    if (!W.length) { if (this.pressed('cancel')) this.back(s); return true; }
    const f = W[s.focus];
    if (this.repeat('up')) this.nav(s, 0, -1); else if (this.repeat('down')) this.nav(s, 0, 1);
    else if (this.repeat('left')) { if (f && (f.kind === 'slider' || f.kind === 'choice' || f.kind === 'toggle')) this.adjust(f, -1); else this.nav(s, -1, 0); }
    else if (this.repeat('right')) { if (f && (f.kind === 'slider' || f.kind === 'choice' || f.kind === 'toggle')) this.adjust(f, 1); else this.nav(s, 1, 0); }
    if (this.pressed('confirm') || this.pressed('start')) { if (f) this.pick(s, f); }
    else if (this.pressed('cancel') || game.input.pressed('mshoot')) this.back(s);
    if (s.tabs && (this.pressed('switch') || this.pressed('skill'))) { const d = this.pressed('switch') ? -1 : 1; s.tabs.set((s.tabs.get() + d + s.tabs.n) % s.tabs.n); EF.sfx('select'); }
    return true;
  },
  hit(W, p) { for (let i = W.length - 1; i >= 0; i--) { const w = W[i]; if (p[0] >= w.x && p[0] < w.x + w.w && p[1] >= w.y && p[1] < w.y + w.h) return i; } return -1; },
  moved() { EF.sfx('select', { vol: .5 }); for (const I of game.players) if (I.lastDevice === 'gamepad' && I.rumble) I.rumble(.1, .03); },
  nav(s, dx, dy) {
    const W = s.widgets, f = W[s.focus]; if (!f) { s.focus = 0; return; }
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2; let best = -1, bs = 1e9;
    W.forEach((w, i) => {
      if (i === s.focus || w.disabled || w.noFocus) return;
      const x = w.x + w.w / 2, y = w.y + w.h / 2, ddx = x - cx, ddy = y - cy, along = ddx * dx + ddy * dy;
      if (along <= 2) return;
      const across = Math.abs(ddx * dy - ddy * dx), sc = along + across * 2.2;
      if (sc < bs) { bs = sc; best = i; }
    });
    if (best < 0 && s.wrap !== false) {   // wrap round in a list
      const order = W.map((w, i) => [i, w]).filter(([, w]) => !w.disabled && !w.noFocus).sort((a, b) => dy ? (a[1].y - b[1].y) || (a[1].x - b[1].x) : (a[1].x - b[1].x) || (a[1].y - b[1].y));
      const k = order.findIndex(([i]) => i === s.focus); if (order.length > 1) best = order[(k + (dx + dy > 0 ? 1 : -1) + order.length) % order.length][0];
    }
    if (best >= 0) { s.focus = best; this.moved(); if (s.onFocus) s.onFocus(W[best]); }
  },
  adjust(w, d) {
    if (w.kind === 'slider') { const v = clamp(+(w.get() + d * (w.step || .05)).toFixed(4), w.min, w.max); w.set(v); EF.sfx('select', { vol: .4 }); }
    else if (w.kind === 'choice') { const o = w.options, i = o.findIndex(x => (Array.isArray(x) ? x[0] : x) === w.get()), n = o[(i + d + o.length) % o.length]; w.set(Array.isArray(n) ? n[0] : n); EF.sfx('select'); }
    else if (w.kind === 'toggle') { w.set(!w.get()); EF.sfx('select'); }
  },
  sliderAt(w, x) { const u = clamp((x - w.x - 8) / Math.max(1, w.w - 16), 0, 1), v = w.min + u * (w.max - w.min); w.set(Math.round(v / (w.step || .05)) * (w.step || .05)); },
  pick(s, w) {
    if (!w || w.disabled) { EF.sfx('cancel'); if (w && w.whyNot) EF.toast(w.whyNot); return; }
    if (w.kind === 'toggle') return this.adjust(w, 1);
    if (w.kind === 'choice') return this.adjust(w, 1);
    if (w.onPick) { EF.sfx('confirm'); game.input.consumeAll(); w.onPick(w); }
  },
  back(s) { if (s.onBack) { EF.sfx('cancel'); game.input.consumeAll(); s.onBack(); } else if (this.stack.length > 1) this.pop(); },
  /* ---- drawing ---- */
  draw(r) {
    const s = this.top(); if (!s) return;
    if (s.layout) s.layout(r);
    r.overlay(g => {
      if (s.draw) s.draw(g, r);
      (s.widgets || []).forEach((w, i) => this.drawWidget(g, r, w, i === s.focus && !w.noFocus, s));
      if (s.after) s.after(g, r);
      if (s.footer) { const list = typeof s.footer === 'function' ? s.footer() : s.footer; const y = r.H - Math.max(5, Math.round(r.H * .035)) - 12; EF.prompts(g, r.W / 2, y, list, { input: game.input }); }
    });
  },
  drawWidget(g, r, w, foc, s) {
    const pulse = foc ? .5 + .5 * Math.sin(this.t * 6) : 0, x = Math.round(w.x), y = Math.round(w.y), W = Math.round(w.w), Hh = Math.round(w.h);
    if (w.kind === 'custom') { w.drawFn(g, x, y, W, Hh, foc); return; }
    const bg = w.disabled ? ['#14182a', '#1a1e30'] : foc ? ['#1c2a5c', '#2a3a74'] : ['#0d1430', '#16224a'];
    if (foc) { px.rect(g, x - 2, y - 2, W + 4, Hh + 4, E.shade('#ffc83a', -.3 + pulse * .3)); }
    E.ui.box(g, x, y, W, Hh, { bg, border: foc ? '#ffc83a' : w.disabled ? '#2a3050' : '#2a3a6a', alpha: w.alpha || .95 });
    const tc = w.disabled ? '#5a6280' : foc ? '#ffffff' : '#e8e0d0';
    if (w.kind === 'tile') {
      const iconH = w.icon ? Math.min(Hh - 30, W - 12) : 0;
      if (w.icon) w.icon(g, x + W / 2, y + 6 + iconH / 2, Math.min(iconH, W - 12) * .82, foc);
      const ts = W > 110 && E.font.width(w.title, { scale: 2 }) < W - 8 ? 2 : 1;
      E.font.text(g, w.title, x + W / 2, y + Hh - (w.text ? 26 : 14) - (ts === 2 ? 4 : 0), tc, { align: 'center', scale: ts, outline: '#0b0814' });
      if (w.text) E.font.text(g, w.text, x + W / 2, y + Hh - 13, w.disabled ? '#4a5270' : '#9aa6c8', { align: 'center', outline: false, wrap: W - 8 });
    } else if (w.kind === 'button') {
      const ts = w.scale || (Hh >= 22 ? 2 : 1);
      E.font.text(g, w.title, w.align === 'left' ? x + 10 : x + W / 2, y + Math.round((Hh - 7 * ts) / 2), tc, { align: w.align === 'left' ? 'left' : 'center', scale: ts, outline: '#0b0814' });
      if (w.right) E.font.text(g, typeof w.right === 'function' ? w.right() : w.right, x + W - 10, y + Math.round((Hh - 7) / 2), '#ffc83a', { align: 'right', outline: false });
    } else if (w.kind === 'slider' || w.kind === 'choice' || w.kind === 'toggle') {
      E.font.text(g, w.title, x + 10, y + Math.round((Hh - 7) / 2), tc, { outline: '#0b0814' });
      const vx = x + Math.round(W * .52), vw = W - Math.round(W * .52) - 10;
      if (w.kind === 'slider') {
        const v = w.get(), u = (v - w.min) / ((w.max - w.min) || 1);
        px.rect(g, vx, y + Hh / 2 - 2, vw, 4, '#0a0a14'); px.rect(g, vx, y + Hh / 2 - 2, Math.round(vw * u), 4, foc ? '#ffc83a' : '#9aa6c8'); px.rect(g, vx + Math.round(vw * u) - 2, y + Hh / 2 - 5, 4, 10, '#ffffff');
        const txt = w.fmt ? w.fmt(v) : String(+v.toFixed(2)); E.font.text(g, txt, vx - 4, y + Math.round((Hh - 7) / 2), '#ffc83a', { align: 'right', outline: false });
        if (w.changed && w.changed()) E.font.text(g, '*', x + W - 6, y + 2, '#ff7a3a', { outline: false });
      } else {
        const v = w.get(), lab = w.kind === 'toggle' ? (v ? 'ON' : 'OFF') : (() => { const o = w.options.find(o2 => (Array.isArray(o2) ? o2[0] : o2) === v); return o ? (Array.isArray(o) ? o[1] : o) : String(v); })();
        E.font.text(g, '←', vx, y + Math.round((Hh - 7) / 2), foc ? '#ffc83a' : '#5a6280', { outline: false });
        E.font.text(g, String(lab).toUpperCase(), vx + vw / 2, y + Math.round((Hh - 7) / 2), '#ffffff', { align: 'center', outline: false });
        E.font.text(g, '→', vx + vw - 5, y + Math.round((Hh - 7) / 2), foc ? '#ffc83a' : '#5a6280', { outline: false });
      }
    }
    if (w.badge) E.font.text(g, w.badge, x + W - 4, y + 4, '#ffc83a', { align: 'right', font: 'tiny', outline: '#000' });
  },
  /* ---- layouts ---- */
  /** a grid of widgets centred in an area: cols, cell size, gap */
  grid(W, x0, y0, w, h, cols, cw, ch, gap = 8) {
    const rows = Math.ceil(W.length / cols), tw = cols * cw + (cols - 1) * gap, th = rows * ch + (rows - 1) * gap, ox = Math.round(x0 + (w - tw) / 2), oy = Math.round(y0 + (h - th) / 2);
    W.forEach((wd, i) => { const c = i % cols, rr = Math.floor(i / cols), inRow = Math.min(cols, W.length - rr * cols), rowOff = (cols - inRow) * (cw + gap) / 2; wd.x = ox + rowOff + c * (cw + gap); wd.y = oy + rr * (ch + gap); wd.w = cw; wd.h = ch; });
  },
  /** a column of rows */
  column(W, x, y, w, h, gap = 4) { W.forEach((wd, i) => { wd.x = x; wd.y = y + i * (h + gap); wd.w = w; wd.h = h; }); },
  /** a standard back-drop panel and a title */
  panel(g, r, title, sub) {
    const my = EF.HUD.margin(r)[1];
    if (title) E.font.title(g, title, r.W / 2, my + 4, { align: 'center', scale: r.W > 360 ? 3 : 2, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
    if (sub) E.font.text(g, sub, r.W / 2, my + 32, '#c8d0e8', { align: 'center', outline: '#0b0814' });
  }
};
/* a toast: a short message at the top (stickers earned, saved, unlocks) */
EF.toasts = [];
EF.toast = (text, o = {}) => { EF.toasts.push({ text, sub: o.sub || null, t: 0, dur: o.dur || 2.6, icon: o.icon || null }); if (o.sound !== false) EF.sfx(o.sound || 'shimmer'); };
EF.drawToasts = (r, dt) => {
  if (!EF.toasts.length) return;
  const T = EF.toasts[0]; T.t += dt; if (T.t > T.dur) { EF.toasts.shift(); return; }
  r.overlay(g => { const k = Math.min(1, T.t / .25, (T.dur - T.t) / .25), w = Math.min(r.W - 20, Math.max(140, E.font.width(T.text) + 50)), x = Math.round(r.W / 2 - w / 2), y = Math.round(-40 + k * (40 + Math.max(5, r.H * .035) + 36));
    E.ui.box(g, x, y, w, T.sub ? 30 : 20, { bg: ['#2a1a4a', '#3a2a6a'], border: '#ffc83a' }); if (T.icon) T.icon(g, x + 14, y + (T.sub ? 15 : 10)); E.font.text(g, T.text, x + (T.icon ? 28 : w / 2), y + 6, '#ffe08a', { align: T.icon ? 'left' : 'center', outline: false }); if (T.sub) E.font.text(g, T.sub, x + (T.icon ? 28 : w / 2), y + 17, '#c8d0e8', { align: T.icon ? 'left' : 'center', outline: false }); });
};
/* ==== src/31-front.js ==== */
/* THE FRONT END (section 6.23): the title over the Euphorium at night, the main menu, Kick-About's setup with the
 * controller side picker, Penalties' setup, the results, the Sticker Album, About & Credits. All 10-foot: big tiles,
 * few choices per screen, glyph footers; pad, keyboard and mouse alike. */
/* ---- the stage: a stadium behind the menus (the Euphorium at night, Daz doing keepy-uppies) ---- */
EF.Stage = {
  st: null,
  get(stadium) {
    if (this.st && this.st.id === stadium) return this.st;
    const m = new EF.Match({ home: 'kipperton', away: 'opulence', stadium, kind: 'title', seed: 7, halfLength: 999, noReplay: true, humans: [], events: false });
    for (const f of m.players) f.ghost = true;
    const daz = m.players.find(f => f.data.id === 'pilchard'); daz.ghost = false; daz.body.x = P.CX + 20; daz.body.y = P.Y0 + 120; daz.facing = Math.PI / 2;
    m.ref.body.x = -999; m.ref.body.y = -999;
    this.st = { id: stadium, m, view: new EF.MatchView(m), daz, t: 0, fw: 3 };
    return this.st;
  },
  update(dt, o = {}) {
    const S = this.get(o.stadium || 'euphorium'), m = S.m, d = S.daz; S.t += dt; m.t += dt;
    const ph = S.t * 1.9, u = Math.abs(Math.sin(ph * Math.PI / 2)), k = Math.floor(ph) % 4;
    m.ball.x = d.body.x + 6; m.ball.y = d.body.y + 2; m.ball.z = 4 + u * 26; m.ball.roll += dt * 40;
    if (Math.floor(ph) !== S.lastK) { S.lastK = Math.floor(ph); d.kickName = k === 3 ? 'header' : 'touch'; d.kickT = 0; }
    d.kickT += dt; d.look.expr = 'smile';
    S.fw -= dt; if (S.fw <= 0 && m.stadium.id === 'euphorium') { S.fw = 8; S.view.fireworks(3); EF.sfx('firework', { vol: .4 }); }
    S.view.update(dt, m);
    game.focus(P.CX + Math.sin(S.t * .07) * 200, P.Y0 + 10, 0);
  },
  draw(r, o = {}) { const S = this.get(o.stadium || 'euphorium'); S.view.draw(r, S.m); if (o.dim) r.overlay(g => px.blend(g, o.dim, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05060e'))); },
  enter() { game.setView('broadcast'); game.resetCamera(); game.setZoom(.92); game.cam.smooth = .4; game.cam.bounds = null; game.weather = null; }
};
/* ---- tile icons drawn by code ---- */
EF.icon = name => (g, cx, cy, s, foc) => {
  cx = Math.round(cx); cy = Math.round(cy); const k = s / 24, S = v => Math.round(v * k), gold = foc ? '#ffd83a' : '#c8a040';
  switch (name) {
    case 'cup': px.poly(g, [[cx - S(8), cy - S(10)], [cx + S(8), cy - S(10)], [cx + S(5), cy + S(2)], [cx - S(5), cy + S(2)]], gold); px.rect(g, cx - S(2), cy + S(2), S(4), S(5), gold); px.rect(g, cx - S(6), cy + S(7), S(12), S(3), E.shade(gold, -.3)); px.rect(g, cx - S(11), cy - S(8), S(3), S(6), gold); px.rect(g, cx + S(8), cy - S(8), S(3), S(6), gold); px.rect(g, cx - S(5), cy - S(8), S(2), S(6), '#fff6c0'); break;
    case 'ball': px.disc(g, cx, cy, S(10), '#f4f4f0'); px.disc(g, cx, cy, S(3.5), '#26262e'); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; px.disc(g, cx + Math.cos(a) * S(8), cy + Math.sin(a) * S(8), S(2.2), '#26262e'); } break;
    case 'glove': px.rect(g, cx - S(7), cy - S(4), S(14), S(12), '#3ac06a'); for (let i = 0; i < 4; i++) px.rect(g, cx - S(7) + i * S(3.6), cy - S(11), S(3), S(8), '#3ac06a'); px.rect(g, cx + S(7), cy - S(2), S(4), S(6), '#3ac06a'); px.rect(g, cx - S(7), cy + S(6), S(14), S(3), '#f4f4f0'); break;
    case 'cone': px.poly(g, [[cx, cy - S(11)], [cx + S(7), cy + S(8)], [cx - S(7), cy + S(8)]], '#ff7a1a'); px.rect(g, cx - S(4), cy - S(2), S(8), S(3), '#ffffff'); px.rect(g, cx - S(9), cy + S(8), S(18), S(3), '#c85a10'); break;
    case 'sticker': px.rect(g, cx - S(8), cy - S(11), S(16), S(22), '#f4f0e0'); px.rect(g, cx - S(6), cy - S(9), S(12), S(14), '#3a4a8a'); px.disc(g, cx, cy - S(4), S(3), '#f0c8a8'); px.rect(g, cx - S(4), cy, S(8), S(5), '#f08a24'); px.rect(g, cx - S(6), cy + S(6), S(12), S(2), '#9aa6c8'); break;
    case 'cog': px.disc(g, cx, cy, S(8), '#9aa6c8'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; px.disc(g, cx + Math.cos(a) * S(9), cy + Math.sin(a) * S(9), S(2.5), '#9aa6c8'); } px.disc(g, cx, cy, S(3.5), '#16224a'); break;
    case 'info': px.disc(g, cx, cy, S(10), '#3a6aff'); px.rect(g, cx - S(1.5), cy - S(2), S(3), S(9), '#ffffff'); px.rect(g, cx - S(1.5), cy - S(7), S(3), S(3), '#ffffff'); break;
    case 'whistle': px.disc(g, cx + S(2), cy + S(2), S(7), '#c8ccd4'); px.rect(g, cx - S(10), cy - S(3), S(12), S(6), '#c8ccd4'); px.disc(g, cx + S(2), cy + S(2), S(3), '#5a5e6a'); break;
    case 'boot': px.poly(g, [[cx - S(8), cy - S(9)], [cx, cy - S(9)], [cx, cy + S(1)], [cx + S(10), cy + S(3)], [cx + S(10), cy + S(8)], [cx - S(8), cy + S(8)]], '#1a1a20'); px.rect(g, cx - S(8), cy + S(6), S(18), S(2), '#f08a24'); break;
    case 'pens': px.rect(g, cx - S(11), cy - S(8), S(22), S(2), '#f4f4f0'); px.rect(g, cx - S(11), cy - S(8), S(2), S(14), '#f4f4f0'); px.rect(g, cx + S(9), cy - S(8), S(2), S(14), '#f4f4f0'); px.disc(g, cx, cy + S(9), S(3), '#f4f4f0'); px.disc(g, cx, cy + S(9), S(1.2), '#26262e'); break;
  }
};
EF.sceneBase = (stadium, dim) => ({ view: 'broadcast', views: ['broadcast'], input: EF.KEYS, res: 'ps1', touch: [], camera: { zoom: false } });
const RESERVED = ['enter', 'update', 'draw', 'scene', 'music', 'stadium', 'idle', 'dim', 'hideUI'];
const front = (o) => Object.assign(EF.sceneBase(), Object.fromEntries(Object.entries(o).filter(([k]) => !RESERVED.includes(k))), {
  enter(d) { EF.Stage.enter(); if (o.music !== null) EF.music(o.music || 'menu'); if (o.enter) o.enter.call(this, d || {}); if (EF.Attract) EF.Attract.reset(); },
  update(dt) { EF.Stage.update(dt, { stadium: o.stadium }); if (o.update && o.update.call(this, dt)) return; EF.UI.update(dt); if (EF.Attract) EF.Attract.watch(dt, o.idle !== false); },
  draw(r) { EF.Stage.draw(r, { stadium: o.stadium, dim: typeof o.dim === 'function' ? o.dim.call(this) : o.dim === undefined ? .55 : o.dim }); if (o.draw) o.draw.call(this, r); if (!(o.hideUI && o.hideUI.call(this))) EF.UI.draw(r); EF.drawToasts(r, 1 / 60); },
  back() { const s = EF.UI.top(); if (s) { EF.UI.back(s); return true; } return false; }
}, o.scene || {});

/* ---- TITLE ---- */
EF.titleTiles = () => {
  const sv = EF.Save.data(), cup = sv.cup, touch = EF.touchOnly(), why = 'CONTROLLER OR KEYBOARD REQUIRED';
  const cupText = cup && !cup.done ? 'CONTINUE: ' + EF.CUP.rounds[Math.min(4, cup.round)].short : cup && cup.done ? 'WON! PLAY AGAIN' : 'NEW CUP RUN';
  const T = (id, title, text, icon, onPick, playable = true) => ({ id, kind: 'tile', title, text, icon: EF.icon(icon), onPick, disabled: playable && touch, whyNot: why });
  return [
    T('cup', 'CUP RUN', cupText, 'cup', () => game.go('cup', { fresh: !cup || cup.done })),
    T('kickabout', 'KICK-ABOUT', '1-4 PLAYERS', 'ball', () => game.go('setup', { mode: 'kickabout' })),
    T('penalties', 'PENALTIES', 'SHOOTOUT', 'pens', () => game.go('setup', { mode: 'penalties' })),
    T('training', 'TRAINING', Object.keys(sv.drills).length + '/9 DRILLS', 'cone', () => game.go('training', {})),
    T('album', 'STICKER ALBUM', Object.keys(sv.stickers).length + '/51', 'sticker', () => game.go('album', {}), false),
    T('options', 'OPTIONS', 'SETTINGS', 'cog', () => game.menu('settings'), false),
    T('about', 'ABOUT & CREDITS', 'THE MAKING OF', 'info', () => game.go('about', {}), false)
  ];
};
EF.scenes.title = front({ music: 'anthem', idle: true, dim() { return this.state === 'press' ? .1 : .5; }, hideUI() { return this.state === 'press'; },
  enter(d) {
    this.state = d.menu || (EF.titleSeen && !d.press) ? 'menu' : 'press'; EF.titleSeen = true;
    const scr = { id: 'main', widgets: EF.titleTiles(), focus: d.focus || 0, footer: () => [['confirm', 'SELECT'], ['cancel', 'BACK']],
      layout(r) { const top = Math.round(r.H * .3), cw = Math.min(104, Math.floor((r.W - 40) / 4) - 6), ch = Math.min(70, Math.floor((r.H - top - 30) / 2) - 6); EF.UI.grid(this.widgets, 0, top, r.W, r.H - top - 26, 4, cw, ch, 6); },
      onBack: () => { this.state = 'press'; } };
    if (EF.touchOnly()) scr.widgets.push({ id: 'settings', kind: 'button', title: 'SETTINGS', onPick: () => game.menu('settings') });
    EF.UI.set([scr]);
  },
  update(dt) {
    if (this.state === 'press') {
      const I = game.input, any = game.players.some(p => p.pressed('start') || p.pressed('confirm')) || (I.clicked && I.clicked());
      if (EF.touchOnly() && I.clicked && I.clicked()) { const c = I.clicked(); if (this.setBtn && c[0] >= this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] >= this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) { game.menu('settings'); return true; } }
      if (any) { this.state = 'menu'; EF.sfx('confirm'); game.input.consumeAll(); }
      if (EF.Attract) EF.Attract.watch(dt, true);
      return true;
    }
    const top = EF.UI.top(); if (top && top.id === 'main') { const ws = EF.titleTiles(); top.widgets.forEach((w, i) => { if (ws[i]) { w.text = ws[i].text; w.disabled = ws[i].disabled; } }); }
  },
  draw(r) {
    const [mx, my] = EF.HUD.margin(r), press = this.state === 'press';
    r.overlay(g => {
      const ly = press ? Math.round(r.H * .16) : my, sc = press ? (r.W >= 400 ? 4 : 3) : 3;
      E.font.title(g, 'EUROPHORIA', r.W / 2, ly, { align: 'center', scale: sc, colors: ['#fffbe8', '#ffe08a', '#ffc83a', '#e0662a'], depth: 3, depthColor: '#5a2a10' });
      E.font.title(g, 'FOOTBALL', r.W / 2, ly + sc * 9 + 4, { align: 'center', scale: sc - 1, colors: ['#ffffff', '#c8d8ff', '#6a8aff'], depth: 2, depthColor: '#1a2a6a' });
      if (press) E.font.text(g, 'OVER-THE-TOP ARCADE FOOTBALL', r.W / 2, ly + sc * 9 + 4 + (sc - 1) * 9 + 6, '#fff6e0', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, E.versionLabel().replace(/·/g, '-') + '  -  EUROPHORIA ' + EF.version, r.W - mx, r.H - my - 7, '#6a7090', { font: 'tiny', outline: false, align: 'right' });
      if (press) {
        if (EF.touchOnly()) {
          const w = Math.min(r.W - 30, 280), x = Math.round((r.W - w) / 2), y = Math.round(r.H * .62);
          E.ui.box(g, x, y, w, 56, { bg: ['#2a0c18', '#4a1428'], border: '#ff5a4a' });
          E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 8, '#ffffff', { align: 'center', outline: false });
          E.font.text(g, 'Connect a pad or a keyboard to play', r.W / 2, y + 20, '#e8c0c8', { align: 'center', outline: false });
          this.setBtn = [Math.round(r.W / 2 - 50), y + 32, 100, 18]; E.ui.box(g, ...this.setBtn, { bg: '#16224a', border: '#ffc83a' }); E.font.text(g, 'SETTINGS', r.W / 2, y + 37, '#ffc83a', { align: 'center', outline: false });
        } else if (Math.floor(game.real * 2) % 2 === 0) { const I = game.input, w = EF.promptWidth('start', 'PRESS START', { input: I, scale: 2 }); EF.prompt(g, Math.round(r.W / 2 - w / 2), Math.round(r.H * .66), I.lastDevice === 'gamepad' ? 'Pad9' : 'start', 'PRESS START', { input: I, scale: 2 }); }
        const rec = EF.Save.data().records; if (rec.cupsWon) E.font.text(g, 'CUPS WON: ' + rec.cupsWon + (rec.fastestCup ? '   FASTEST CUP: ' + H.mmss(rec.fastestCup) : ''), r.W / 2, r.H - my - 20, '#ffe08a', { align: 'center', outline: '#000' });
      }
    });
  }
});

/* ---- the controller side picker (section 6.27): each joined player moves left (HOME), centre (CPU) or right (AWAY) ---- */
EF.sidePicker = (o) => {
  game.allowJoin({ max: 4 });
  const st = { pos: new Map(), ready: new Set(), t: 0 };
  const pos = I => st.pos.has(I) ? st.pos.get(I) : (I === game.input ? -1 : 0);
  return { id: 'players', title: o.title || 'PLAYERS', widgets: [{ id: 'go', kind: 'button', title: o.goLabel || 'START MATCH', onPick: () => done() }],
    layout(r) { this.widgets[0].x = r.W / 2 - 80; this.widgets[0].y = r.H - 58; this.widgets[0].w = 160; this.widgets[0].h = 22; },
    update(dt) {
      st.t += dt;
      for (const I of game.players) {
        if (I.pressed('left')) { st.pos.set(I, Math.max(o.coop ? -1 : -1, pos(I) - 1)); st.ready.delete(I); EF.sfx('select'); }
        if (I.pressed('right')) { st.pos.set(I, Math.min(o.coop ? 0 : 1, pos(I) + 1)); st.ready.delete(I); EF.sfx('select'); }
        if (I !== game.input && I.pressed('confirm')) { st.ready.add(I); EF.sfx('confirm'); }
        if (I !== game.input && I.pressed('cancel')) { game.removePlayer(I); st.pos.delete(I); }
      }
      if (game.input.pressed('cancel')) { game.allowJoin(false); EF.UI.pop(); game.input.consumeAll(); return true; }
      return false;
    },
    draw(g, r) {
      EF.UI.panel(g, r, o.title || 'PLAYERS', game.players.length < 4 ? 'PRESS START ON A PAD, OR 2 ON THE KEYBOARD, TO JOIN' : 'FOUR PLAYERS!');
      const cy = Math.round(r.H * .3), cols = [r.W * .22, r.W * .5, r.W * .78], labels = o.coop ? [o.homeName || 'HOME', 'SITTING OUT', ''] : [o.homeName || 'HOME', 'CPU', o.awayName || 'AWAY'];
      labels.forEach((l, i) => { if (!l) return; E.ui.box(g, Math.round(cols[i] - 58), cy - 4, 116, 116, { bg: ['#0d1430', '#16224a'], border: i === 1 ? '#3a4a6a' : '#ffc83a', alpha: .9 }); E.font.text(g, l, cols[i], cy + 2, i === 1 ? '#9aa6c8' : '#ffe08a', { align: 'center', outline: false }); if (o.teams && i !== 1 && o.teams[i ? 1 : 0]) EF.drawCrest(g, o.teams[i ? 1 : 0], cols[i], cy + 26, 22); });
      game.players.forEach((I, k) => {
        const p = pos(I), x = Math.round(cols[p + 1]), y = cy + 46 + k * 15, c = E.PLAYER_COLORS[k] || '#fff';
        px.rect(g, x - 34, y, 68, 13, '#0a0a14'); px.rect(g, x - 34, y, 4, 13, c);
        E.font.text(g, I.name + ' ' + (I.device === 'gamepad' || I.lastDevice === 'gamepad' ? 'PAD' : 'KEYS'), x - 26, y + 3, '#ffffff', { outline: false });
        if (st.ready.has(I) || I === game.input) E.font.text(g, 'OK', x + 30, y + 3, '#7aff9a', { align: 'right', outline: false });
      });
      EF.prompts(g, r.W / 2, r.H - 30, [['left', 'MOVE'], ['confirm', 'READY'], ['start', 'JOIN']], { input: game.input });
    },
    onBack: () => { game.allowJoin(false); EF.UI.pop(); } };
  function done() {
    const humans = game.players.map(I => ({ input: I, side: pos(I) < 0 ? 0 : pos(I) > 0 ? 1 : null })).filter(h => h.side !== null);
    if (!humans.length) { EF.toast('PICK A SIDE FIRST', { sound: 'cancel' }); return; }
    game.allowJoin(false); o.onDone(humans);
  }
};

/* ---- KICK-ABOUT and PENALTIES setup (section 6.23): teams, stadium, conditions, players ---- */
EF.scenes.setup = front({
  enter(d) {
    const pens = d.mode === 'penalties', S = this.sel = Object.assign({ home: 'kipperton', away: 'pasapasa', kit: 'auto', stadium: 'smokehouse', weather: 'auto', time: 'auto', ball: 'auto' }, EF.lastSetup || {}, d.sel || {});
    const teamChoice = (key, label) => ({ id: key, kind: 'custom', title: label, drawFn: (g, x, y, w, h, foc) => { E.ui.box(g, x, y, w, h, { bg: foc ? ['#1c2a5c', '#2a3a74'] : ['#0d1430', '#16224a'], border: foc ? '#ffc83a' : '#2a3a6a' }); const T = EF.get('team', S[key]); E.font.text(g, label, x + w / 2, y + 5, '#9aa6c8', { align: 'center', outline: false }); EF.drawCrest(g, T, x + w / 2, y + h / 2 + 2, Math.min(48, h - 40)); E.font.text(g, T.name, x + w / 2, y + h - 22, '#ffffff', { align: 'center', outline: '#000', wrap: w - 6 }); E.font.text(g, '←  ' + EF.get('tactic', T.tactic).name + '  →', x + w / 2, y + h - 11, foc ? '#ffc83a' : '#5a6280', { align: 'center', outline: false }); },
      kindAdjust: true, get: () => S[key], set: v => { S[key] = v; }, options: EF.TEAM_IDS });
    const teams = { id: 'teams', title: pens ? 'PENALTIES: TEAMS' : 'KICK-ABOUT: TEAMS', widgets: [teamChoice('home', 'HOME'), teamChoice('away', 'AWAY'),
      { id: 'kit', kind: 'choice', title: 'AWAY KIT', options: [['auto', 'Auto'], ['home', 'Home kit'], ['away', 'Away kit']], get: () => S.kit, set: v => { S.kit = v; } },
      { id: 'next', kind: 'button', title: 'NEXT', onPick: () => EF.UI.push(pens ? players() : stadium()) }],
      layout(r) { const w = Math.min(150, (r.W - 40) / 2), h = Math.min(120, r.H - 120); this.widgets[0].x = r.W / 2 - w - 6; this.widgets[1].x = r.W / 2 + 6; for (const k of [0, 1]) { this.widgets[k].y = 50; this.widgets[k].w = w; this.widgets[k].h = h; } this.widgets[2].x = r.W / 2 - 110; this.widgets[2].y = 56 + h; this.widgets[2].w = 220; this.widgets[2].h = 18; this.widgets[3].x = r.W / 2 - 60; this.widgets[3].y = 80 + h; this.widgets[3].w = 120; this.widgets[3].h = 22; },
      draw(g, r) { EF.UI.panel(g, r, pens ? 'PENALTIES' : 'KICK-ABOUT', 'PICK THE TEAMS'); },
      footer: () => [['left', 'CHANGE'], ['confirm', 'NEXT'], ['cancel', 'BACK']], onBack: () => game.go('title', { menu: true, focus: pens ? 2 : 1 }) };
    for (const w of teams.widgets.slice(0, 2)) { w.kind = 'choice'; w.custom = true; }
    const stadium = () => ({ id: 'stadium', widgets: EF.CUP_STADIUMS.map(id => { const st = EF.get('stadium', id); return { id, kind: 'tile', title: st.name.replace('THE ', '').replace('ESTADIO ', '').replace('STADIO ', '').replace(' ARENA', ''), text: st.city, icon: (g, cx, cy, s, foc) => EF.stadiumThumb(g, st, cx, cy, s * 1.6, foc), onPick: () => { S.stadium = id; EF.UI.push(conditions()); } }; }),
      layout(r) { EF.UI.grid(this.widgets, 0, 44, r.W, r.H - 70, Math.min(5, Math.floor((r.W - 20) / 84)), 78, 78, 6); }, draw(g, r) { EF.UI.panel(g, r, 'STADIUM', 'WHERE TO PLAY'); }, focus: EF.CUP_STADIUMS.indexOf(S.stadium), footer: () => [['confirm', 'PICK'], ['cancel', 'BACK']] });
    const balls = () => [['auto', 'Auto']].concat(Object.keys(EF.BALLS).map(k => [k, EF.BALLS[k].name.replace('THE ', '')]));
    const conditions = () => ({ id: 'conditions', widgets: [
      { id: 'weather', kind: 'choice', title: 'WEATHER', options: [['auto', 'As the stadium'], ['sun', 'Sun'], ['rain', 'Rain'], ['snow', 'Snow'], ['fog', 'Fog']], get: () => S.weather, set: v => { S.weather = v; } },
      { id: 'time', kind: 'choice', title: 'TIME', options: [['auto', 'As the stadium'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']], get: () => S.time, set: v => { S.time = v; } },
      { id: 'ball', kind: 'choice', title: 'BALL', options: balls(), get: () => S.ball, set: v => { if (v !== 'auto' && !EF.Save.data().unlocks.balls.includes(v)) { S.ball = v; EF.toast('LOCKED: ' + (v === 'golden' ? 'WIN THE CUP' : 'FINISH ALL 5 CHALLENGES'), { sound: 'cancel' }); } else S.ball = v; } },
      { id: 'half', kind: 'choice', title: 'HALF LENGTH', options: EF.SETTINGS.find(s => s.key === 'halfLength').options, get: () => game.settings.halfLength, set: v => game.settings.set('halfLength', v) },
      { id: 'diff', kind: 'choice', title: 'DIFFICULTY', options: EF.SETTINGS.find(s => s.key === 'difficulty').options, get: () => game.settings.difficulty, set: v => game.settings.set('difficulty', v) },
      { id: 'draws', kind: 'choice', title: 'DRAWS', options: EF.SETTINGS.find(s => s.key === 'draws').options, get: () => game.settings.draws, set: v => game.settings.set('draws', v) },
      { id: 'next', kind: 'button', title: 'NEXT', onPick: () => EF.UI.push(players()) }],
      layout(r) { const w = Math.min(300, r.W - 30); EF.UI.column(this.widgets.slice(0, 6), Math.round(r.W / 2 - w / 2), 44, w, 19, 3); const b = this.widgets[6]; b.x = r.W / 2 - 60; b.y = 44 + 6 * 22 + 4; b.w = 120; b.h = 22; },
      draw(g, r) { EF.UI.panel(g, r, 'CONDITIONS', EF.get('stadium', S.stadium).name); }, footer: () => [['left', 'CHANGE'], ['confirm', 'NEXT'], ['cancel', 'BACK']] });
    const players = () => EF.sidePicker({ title: 'PLAYERS', teams: [EF.get('team', S.home), EF.get('team', S.away)], homeName: EF.get('team', S.home).short, awayName: EF.get('team', S.away).short, goLabel: pens ? 'START SHOOTOUT' : 'START MATCH', onDone: humans => {
      EF.lastSetup = Object.assign({}, S);
      const opts = EF.matchOptsFrom(S, humans, pens);
      game.go('tunnel', { opts, short: true, next: { scene: 'match', data: { opts, again: { mode: d.mode, sel: S } } } });
    } });
    EF.UI.set([teams]);
  },
  scene: {}
});
/* left and right on a team carousel change the team */
EF.matchOptsFrom = (S, humans, pens) => {
  const st = EF.get('stadium', S.stadium), home = EF.get('team', S.home), away = EF.get('team', S.away);
  let kits = EF.Art.pickKits(home, away); if (S.kit !== 'auto') kits = ['home', S.kit];
  const weather = S.weather === 'auto' ? undefined : S.weather === 'sun' ? null : { kind: S.weather, amount: S.weather === 'fog' ? .5 : .7, wind: .2 };
  const o = { home: S.home, away: S.away, stadium: S.stadium, kind: pens ? 'penalties' : 'kickabout', draws: game.settings.draws, kits, humans, referee: H.pick(Math.random, ['haltwhistle', 'patience', 'ironside', 'severo']), shootoutOnly: !!pens };
  if (weather !== undefined) o.weather = weather; if (S.time !== 'auto') o.time = S.time; if (S.ball !== 'auto' && EF.Save.data().unlocks.balls.includes(S.ball)) o.ball = S.ball;
  if (S.weather === 'fog') o.fogStart = .6;
  return o;
};
/** a painted thumbnail of a stadium: its stands, its pitch, its weather */
EF.stadiumThumb = (g, st, cx, cy, s, foc) => {
  const w = Math.round(s * 1.5), h = Math.round(s), x = Math.round(cx - w / 2), y = Math.round(cy - h / 2), sky = st.sky || ['#3a6aa0', '#8ab0d0', '#c8d8e0'];
  px.rect(g, x, y, w, Math.round(h * .35), sky[0]); px.rect(g, x, y + Math.round(h * .2), w, Math.round(h * .15), sky[1]);
  px.rect(g, x, y + Math.round(h * .3), w, Math.round(h * .22), st.seats || '#3a3a52');
  for (let i = 0; i < w; i += 3) px.rect(g, x + i, y + Math.round(h * .32) + (i % 2), 1, 1, i % 6 ? '#e8e0d0' : '#ffc83a');
  const gr = st.grass || ['#3f7a34', '#4a8a3c']; for (let i = 0; i < 6; i++) px.rect(g, x + Math.round(i * w / 6), y + Math.round(h * .52), Math.ceil(w / 6), h - Math.round(h * .52), gr[i % 2]);
  px.rect(g, x + Math.round(w / 2), y + Math.round(h * .52), 1, h - Math.round(h * .52), '#e8ece0');
  const W2 = st.weather; if (W2 && W2.kind === 'rain') for (let i = 0; i < 14; i++) px.rect(g, x + ((i * 37) % w), y + ((i * 23) % h), 1, 3, '#a8c8e8');
  if (W2 && W2.kind === 'snow') for (let i = 0; i < 18; i++) px.rect(g, x + ((i * 41) % w), y + ((i * 29) % h), 1, 1, '#ffffff');
  if (st.time === 'night') px.disc(g, x + w - 6, y + 5, 2, '#fff0c0');
  if (foc) { px.rect(g, x, y, w, 1, '#ffc83a'); px.rect(g, x, y + h - 1, w, 1, '#ffc83a'); }
};
/* the setup's team carousels: left/right steps through the six teams */
const _adjust0 = EF.UI.adjust.bind(EF.UI);
EF.UI.adjust = function (w, d) { if (w.custom) { const o = w.options, i = o.indexOf(w.get()); w.set(o[(i + d + o.length) % o.length]); EF.sfx('select'); return; } return _adjust0(w, d); };
const _drawW0 = EF.UI.drawWidget.bind(EF.UI);
EF.UI.drawWidget = function (g, r, w, foc, s) { if (w.custom && w.drawFn) return w.drawFn(g, Math.round(w.x), Math.round(w.y), Math.round(w.w), Math.round(w.h), foc); return _drawW0(g, r, w, foc, s); };

/* ---- RESULTS (section 6.23) ---- */
EF.scenes.results = front({ music: null,
  enter(d) {
    const R = this.res = d.result, opts = d.opts || {}; this.d = d;
    const win = R.winner, human = (opts.humans || []).map(h => h.side);
    EF.music(win >= 0 && human.includes(win) ? 'victory' : win >= 0 && human.length && !human.includes(win) ? 'defeat' : 'victory');
    this.stickers = d.stickers || [];
    const W = [{ id: 'cont', kind: 'button', title: d.contLabel || 'CONTINUE', onPick: () => { if (d.next) d.next(); else game.go('setup', d.again || { mode: 'kickabout' }); } }];
    if (!d.next) W.push({ id: 'title', kind: 'button', title: 'TITLE', onPick: () => game.go('title', { menu: true }) });
    EF.UI.set([{ id: 'results', widgets: W, layout(r) { const n = this.widgets.length; this.widgets.forEach((w, i) => { w.w = 110; w.h = 22; w.x = Math.round(r.W / 2 - (n * 116) / 2 + i * 116); w.y = r.H - 50; }); }, footer: () => [['confirm', 'SELECT']], onBack: () => { if (!d.next) game.go('title', { menu: true }); } }]);
    this.potmRig = R.potm ? EF.Art.rigFor(R.potm.team, 'home', R.potm.data) : null;
  },
  draw(r) {
    const R = this.res, T = R.teams.map(t => EF.get('team', t)); if (!R) return;
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), cx = r.W / 2;
      E.ui.box(g, Math.round(cx - 130), my + 26, 260, 160, { bg: ['#0d1430', '#16224a'], border: '#2a3a6a', alpha: .92 });
      E.font.title(g, R.winner < 0 ? 'A DRAW' : T[R.winner].short + ' WIN', cx, my + 2, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      EF.drawCrest(g, T[0], cx - 90, my + 52, 34); EF.drawCrest(g, T[1], cx + 90, my + 52, 34);
      E.font.text(g, R.score[0] + ' - ' + R.score[1], cx, my + 38, '#ffffff', { align: 'center', scale: 4, outline: '#000' });
      if (R.pens) E.font.text(g, '(' + R.pens[0] + ' - ' + R.pens[1] + ' ON PENALTIES)', cx, my + 72, '#ffc83a', { align: 'center', outline: '#000' });
      R.goals.slice(0, 4).forEach((gl, i) => E.font.text(g, gl.minute + "'  " + gl.name + (gl.own ? ' (OG)' : gl.super ? ' (SUPER)' : ''), gl.side ? cx + 30 : cx - 30, my + 84 + i * 10, '#c8d0e8', { align: gl.side ? 'left' : 'right', outline: '#000' }));
      const st = R.stats;
      const sy = my + 130; [['SHOTS', st.shots[0], st.shots[1]], ['TACKLES', st.tackles[0], st.tackles[1]], ['SAVES', st.saves[0], st.saves[1]]].forEach(([k, a, b], i) => { E.font.text(g, a + '   ' + k + '   ' + b, cx, sy + i * 11, '#ffffff', { align: 'center', outline: '#000' }); });
      if (this.potmRig && r.W > 300) { E.ui.box(g, mx, my + 34, 74, 92, { bg: ['#0d1430', '#16224a'], border: '#ffc83a' }); this.potmRig.drawPortrait(g, mx + 5, my + 40, 64, { zoom: 2.4, turn: .3 }); E.font.text(g, 'PLAYER OF THE MATCH', mx + 37, my + 108, '#ffc83a', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, R.potm.short, mx + 37, my + 116, '#ffffff', { align: 'center', font: 'tiny', outline: false }); }
      if (this.stickers.length && r.W > 300) { E.ui.box(g, r.W - mx - 84, my + 34, 84, 40, { bg: ['#2a1a4a', '#3a2a6a'], border: '#ffc83a' }); E.font.text(g, 'STICKERS', r.W - mx - 42, my + 40, '#ffe08a', { align: 'center', outline: false }); E.font.text(g, '+' + this.stickers.length, r.W - mx - 42, my + 52, '#ffffff', { align: 'center', scale: 2, outline: false }); }
    });
  }
});

/* ---- THE STICKER ALBUM (section 6.23): a page per team, then stadiums, challenges and specials; L1/R1 turn pages ---- */
EF.scenes.album = front({ music: 'credits',
  enter(d) { this.page = d.page || 0; this.flip = 0; this.rigs = {}; EF.UI.set([{ id: 'album', widgets: [], tabs: { n: EF.ALBUM_PAGES.length, get: () => this.page, set: v => { this.flip = v > this.page ? 1 : -1; this.page = v; } }, footer: () => [['switch', ''], ['skill', 'PAGE'], ['left', 'PAGE'], ['cancel', 'BACK']], onBack: () => game.go('title', { menu: true, focus: 4 }) }]); },
  update(dt) {
    this.flip = approach(this.flip, 0, dt * 4);
    if (EF.UI.pressed('left') || EF.UI.pressed('right')) { const d = EF.UI.pressed('left') ? -1 : 1; this.page = (this.page + d + EF.ALBUM_PAGES.length) % EF.ALBUM_PAGES.length; this.flip = d; EF.sfx('paper'); }
    const c = game.input.clicked && game.input.clicked(); if (c) { const d = c[0] < game.W / 2 ? -1 : 1; this.page = (this.page + d + EF.ALBUM_PAGES.length) % EF.ALBUM_PAGES.length; this.flip = d; EF.sfx('paper'); game.input.consumeAll(); }
  },
  draw(r) {
    const pg = EF.ALBUM_PAGES[this.page], list = EF.all('sticker').filter(s => s.page === pg.id), sv = EF.Save.data().stickers, k = 1 - Math.abs(this.flip);
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), pw = Math.round(Math.min(r.W - 2 * mx, 380) * Math.max(.05, k)), ph = r.H - 2 * my - 20, x0 = Math.round(r.W / 2 - pw / 2), y0 = my;
      E.ui.box(g, x0, y0, pw, ph, { bg: ['#e8dcc0', '#d8c8a0'], border: '#8a6a3a' });
      if (k < .4) return;
      E.font.text(g, pg.title, r.W / 2, y0 + 6, '#3a2a1a', { align: 'center', scale: 2, outline: false });
      E.font.text(g, (this.page + 1) + ' / ' + EF.ALBUM_PAGES.length + '   ' + Object.keys(sv).length + ' / 51', r.W / 2, y0 + ph - 11, '#6a5a3a', { align: 'center', outline: false });
      const cols = list.length > 6 ? 4 : 3, cw = Math.min(88, Math.floor((pw - 20) / cols) - 6), ch = Math.min(Math.floor((ph - 44) / Math.ceil(list.length / cols)) - 6, 90);
      list.forEach((s, i) => {
        const c = i % cols, rr = Math.floor(i / cols), rowN = Math.min(cols, list.length - rr * cols), x = Math.round(r.W / 2 - (rowN * (cw + 6)) / 2 + c * (cw + 6)), y = y0 + 26 + rr * (ch + 6), got = sv[s.id], shiny = got === 'shiny' || (got && s.shiny);
        px.rect(g, x, y, cw, ch, got ? (shiny ? '#ffe070' : '#f8f4e8') : '#b8a888'); px.rect(g, x + 2, y + 2, cw - 4, ch - 18, got ? '#3a4a8a' : '#8a7a5a');
        if (got) EF.drawSticker(g, s, x + 2, y + 2, cw - 4, ch - 18, this);
        else E.font.text(g, '?', x + cw / 2, y + (ch - 18) / 2 - 6, '#5a4a3a', { align: 'center', scale: 2, outline: false });
        E.font.text(g, got ? s.name : s.how, x + cw / 2, y + ch - 14, got ? '#2a1a10' : '#5a4a3a', { align: 'center', font: got && E.font.width(s.name) < cw - 4 ? 'normal' : 'tiny', outline: false, wrap: cw - 4 });
        if (shiny && got) for (let q = 0; q < 3; q++) { const t = (game.real * .7 + q * .33) % 1; px.rect(g, x + Math.round(t * cw), y + 3, 2, 2, '#ffffff'); }
      });
    });
  }
});
EF.drawSticker = (g, s, x, y, w, h, owner) => {
  if (s.kind === 'player') { const key = s.team + ':' + s.ref; const rig = owner.rigs[key] || (owner.rigs[key] = EF.Cast.rig(key)); rig.drawPortrait(g, x + w / 2 - Math.min(w, h) / 2, y, Math.min(w, h), { zoom: 2.4, turn: .3, bg: '#3a4a8a' }); const t = EF.get('team', s.team); EF.drawCrest(g, t, x + w - 8, y + 8, 12); }
  else if (s.kind === 'crest') EF.drawCrest(g, EF.get('team', s.team), x + w / 2, y + h / 2, Math.min(w, h) - 8);
  else if (s.kind === 'stadium') EF.stadiumThumb(g, EF.get('stadium', s.ref), x + w / 2, y + h / 2, Math.min(w / 1.6, h) - 4, false);
  else if (s.kind === 'challenge') { EF.icon(s.ref === 'superGoal' ? 'ball' : s.ref === 'header' ? 'boot' : s.ref === 'nutmeg' ? 'boot' : s.ref === 'freekickGoal' ? 'pens' : 'glove')(g, x + w / 2, y + h / 2, Math.min(w, h) - 10, true); }
  else { const id = s.ref === 'barry' ? 'barry' : s.ref === 'keith' ? null : s.ref === 'bus' ? null : s.ref === 'pilchard' ? 'kipperton:pilchard' : s.ref; if (id) { const rig = owner.rigs[id] || (owner.rigs[id] = EF.Cast.rig(id)); rig.drawPortrait(g, x + w / 2 - Math.min(w, h) / 2, y, Math.min(w, h), { zoom: 2.4, turn: .3, bg: '#3a4a8a' }); } else if (s.ref === 'keith') { px.sprite(g, EF.SPR.kipper, x + w / 2 - 8, y + h / 2 - 5, { scale: 2 }); } else { px.rect(g, x + 6, y + h / 2 - 6, w - 12, 14, '#c8ccd4'); px.rect(g, x + 6, y + h / 2 - 6, w - 12, 4, '#7a1a2a'); px.disc(g, x + 14, y + h / 2 + 8, 3, '#1a1a1a'); px.disc(g, x + w - 14, y + h / 2 + 8, 3, '#1a1a1a'); } }
};

/* ---- ABOUT & CREDITS (section 6.32): Source Information, the three feedbacks, the credits; one block per page ---- */
EF.aboutPages = () => {
  const A = EF.ABOUT, S = A.sourceInformation || {}, f = (k, v) => [k, v || 'unknown'];
  const tq = ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'];
  const eq = ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'];
  const pq = ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'];
  const pages = [
    { title: 'SOURCE INFORMATION', rows: [f('Date', S.date), f('Source', S.source), f('Plan', S.plan), f('Genre', S.genre), f('Perspective', S.perspective), f('Tech', S.tech), f('Art Direction', S.artDirection)] },
    { title: 'SOURCE INFORMATION', rows: [f('Animation', S.animation), f('Audio', S.audio), f('Online', S.online), f('Testing', S.testing)] },
    { title: 'SOURCE INFORMATION', rows: [f('Research', S.research), f('Environment', S.environment), f('Model', S.model), f('Usage', S.usage)] },
    { title: 'TESTING FEEDBACK', rows: tq.map((q, i) => f(q, (A.testingFeedback || [])[i])) },
    { title: 'ENGINE FEEDBACK', rows: eq.slice(0, 3).map((q, i) => f(q, (A.engineFeedback || [])[i])) },
    { title: 'ENGINE FEEDBACK', rows: eq.slice(3).map((q, i) => f(q, (A.engineFeedback || [])[i + 3])) },
    { title: 'PROMPT FEEDBACK', rows: pq.map((q, i) => f(q, (A.promptFeedback || [])[i])) },
    { title: 'CREDITS', rows: [['Game', 'Europhoria Football, made by Claude (Anthropic, claude-opus-5-5) from TASK.md and PLAN.md.'], ['Engine', 'my-3D2dge v' + E.version + ' by Michael Crosato (the handoff package), changed as CHANGES-ENGINE.md says.'], ['Motion', 'Quaternius Universal Animation Library (CC0); Mesh2Motion (CC0); CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu, free for all uses, created with funding from NSF EIA-0196217.'], ['Online', 'AI Hub Session Protocol v1, client session.js 1.4.0.'], ['Sound', 'Every note, crowd and voice synthesised in code.'], ['Thanks', 'Kipperton. Population 3,112. Never change.']] }
  ];
  return pages;
};
EF.scenes.about = front({ music: 'credits',
  enter() { this.page = 0; this.pages = EF.aboutPages(); EF.UI.set([{ id: 'about', widgets: [], tabs: { n: this.pages.length, get: () => this.page, set: v => { this.page = v; } }, footer: () => [['switch', ''], ['skill', 'PAGE'], ['left', 'PAGE'], ['cancel', 'BACK']], onBack: () => game.go('title', { menu: true, focus: 6 }) }]); },
  update() { if (EF.UI.pressed('left') || EF.UI.pressed('up')) { this.page = (this.page + this.pages.length - 1) % this.pages.length; EF.sfx('select'); } if (EF.UI.pressed('right') || EF.UI.pressed('down') || EF.UI.pressed('confirm')) { this.page = (this.page + 1) % this.pages.length; EF.sfx('select'); } const c = game.input.clicked && game.input.clicked(); if (c) { this.page = (this.page + (c[0] < game.W / 2 ? this.pages.length - 1 : 1)) % this.pages.length; EF.sfx('select'); game.input.consumeAll(); } },
  draw(r) {
    const p = this.pages[this.page];
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), w = r.W - 2 * mx, x = mx, y = my, h = r.H - 2 * my - 18;
      E.ui.box(g, x, y, w, h, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .95 });
      E.font.text(g, p.title, r.W / 2, y + 6, '#ffc83a', { align: 'center', scale: 2, outline: '#000' });
      E.font.text(g, (this.page + 1) + ' / ' + this.pages.length, x + w - 8, y + 8, '#9aa6c8', { align: 'right', outline: false });
      let yy = y + 28; const lim = y + h - 6;
      for (const [k, v] of p.rows) { if (yy > lim) break; E.font.text(g, k, x + 8, yy, '#ffe08a', { outline: false, wrap: w - 16 }); yy += E.font.wrap(k, w - 16).length * 9 + 1; const lines = E.font.wrap(String(v), w - 22); for (const ln of lines) { if (yy > lim) break; E.font.text(g, ln, x + 14, yy, '#ffffff', { outline: false }); yy += 9; } yy += 4; }
    });
  }
});
/* ==== src/32-cup.js ==== */
/* THE CUP RUN (section 6.24): the bracket, the beat player (tabloid, travel, talk, team talk, challenge, tunnel,
 * match, result), losing and CONTINUE?, the tunnel walkout (also the AI Hub card), and the ending: the trophy, the
 * harbour parade, the closing tabloid and the credits. */
const CUPS = EF.Cup = {
  data() { return EF.Save.data(); },
  start() { const d = this.data(); d.cup = { round: 0, results: [], flags: {}, teamTalks: 0, started: Date.now(), playT: 0, prologue: false, done: false, retries: 0 }; EF.Save.write(); },
  round() { const c = this.data().cup; return c ? EF.CUP.rounds[Math.min(4, c.round)] : EF.CUP.rounds[0]; },
  /** the match options for the current round, from the team talk and flags */
  matchOpts(humans) {
    const c = this.data().cup, R = this.round(), tt = EF.get('teamtalk', c.talk || 'arm'), buffs = [Object.assign({}, tt.buff || {}), {}];
    let eu = tt.euphoria || 0; if (R.id === 'r5') eu += c.flags.loyal ? 20 : c.flags.joke ? 10 : 0;
    return { home: 'kipperton', away: R.opp, stadium: R.stadium, kind: 'cup', draws: 'cup', referee: R.referee, buffs, euphoria: [eu, 0], formation: [c.formation || null, null], humans, challenge: R.challenge, roundIndex: c.round };
  }
};
/* ---- the tabloid page (THE DAILY ROAR) ---- */
EF.drawTabloid = (g, r, st, t, photoRig) => {
  const k = Math.min(1, t / .6), spin = (1 - ease.outCubic(k)) * 6, sc = .3 + .7 * ease.outBack(k), w = Math.round(Math.min(r.W - 30, 330) * sc), h = Math.round(Math.min(r.H - 40, 200) * sc), cx = r.W / 2, cy = r.H / 2 - 8;
  const x = Math.round(cx - w / 2 + Math.sin(spin) * 20 * (1 - k)), y = Math.round(cy - h / 2);
  px.rect(g, x + 4, y + 4, w, h, '#05060a'); px.rect(g, x, y, w, h, '#ece6d6');
  for (let i = 0; i < h; i += 3) px.rect(g, x, y + i, w, 1, i % 6 ? '#e4dccb' : '#efe9da');
  if (k < .85) return;
  px.rect(g, x + 4, y + 4, w - 8, 18, '#c8202a'); E.font.title(g, 'THE DAILY ROAR', cx, y + 6, { align: 'center', scale: 1, colors: ['#ffffff', '#ffe0e0'], outline: '#5a0a10', depth: 0 });
  E.font.text(g, 'EUROPHORIA CUP SPECIAL   ·   ONE KIPPER'.replace('·', '-'), cx, y + 25, '#3a3a3a', { align: 'center', font: 'tiny', outline: false });
  const hl = E.font.wrap(st.headline, w - 16, { scale: 2 }), hs = hl.length > 2 ? 1 : 2, lines = hs === 2 ? hl : E.font.wrap(st.headline, w - 16);
  lines.forEach((ln, i) => E.font.text(g, ln, cx, y + 34 + i * (hs === 2 ? 17 : 10), '#141414', { align: 'center', scale: hs, outline: false }));
  const ty = y + 38 + lines.length * (hs === 2 ? 17 : 10), pw = Math.min(90, Math.round(w * .3)), ph = Math.min(h - (ty - y) - 8, 80);
  if (photoRig && ph > 20) { px.rect(g, x + 8, ty, pw, ph, '#3a3a3a'); photoRig.drawPortrait(g, x + 10, ty + 2, Math.min(pw - 4, ph - 4), { zoom: 2.2, turn: .4, bg: '#7a7a7a' }); px.blend(g, .35, 'multiply', () => px.rect(g, x + 8, ty, pw, ph, '#b8b0a0')); }
  const tx = x + 14 + pw, tw = w - pw - 22;
  E.font.text(g, st.sub, tx, ty, '#141414', { outline: false, wrap: tw });
  const sl = E.font.wrap(st.sub, tw).length; E.font.text(g, st.body || '', tx, ty + sl * 9 + 6, '#4a4a4a', { outline: false, wrap: tw });
};
/* ---- the travel map: a fictional Europe, the minibus "The Old Trout" on a dotted route ---- */
const LANDS = [[[.1, .1], [.45, .05], [.55, .18], [.48, .3], [.36, .34], [.3, .26], [.2, .3], [.12, .22]], [[.36, .34], [.6, .25], [.82, .3], [.86, .55], [.7, .62], [.62, .8], [.55, .88], [.5, .72], [.42, .64], [.3, .62], [.14, .7], [.1, .9], [.3, .96], [.26, .78], [.2, .72], [.3, .52], [.38, .42]], [[.88, .1], [.96, .2], [.92, .4], [.84, .26]]];
EF.drawTravel = (g, r, st, t) => {
  const [mx, my] = EF.HUD.margin(r), w = r.W - 2 * mx, h = r.H - 2 * my - 30, x0 = mx, y0 = my + 20, snow = st.snow && t > 1;
  px.rect(g, x0, y0, w, h, '#2a5a8a'); for (let i = 0; i < 30; i++) px.rect(g, x0 + (i * 53) % w, y0 + (i * 37) % h, 3, 1, '#3a6a9a');
  for (const L of LANDS) { const pts = L.map(([u, v]) => [x0 + u * w, y0 + v * h]); px.poly(g, pts, snow ? '#e8eef6' : '#7a9a5a'); px.poly(g, pts.map(([a, b]) => [a + 2, b - 2]), snow ? '#f8fbff' : '#8aaa6a'); }
  const C = EF.CUP.cities, A = C[st.from], B = C[st.to], ax = x0 + A[0] * w, ay = y0 + A[1] * h, bx = x0 + B[0] * w, by = y0 + B[1] * h;
  for (const k in C) { const c = C[k], X = x0 + c[0] * w, Y = y0 + c[1] * h; px.disc(g, X, Y, 3, '#c8202a'); E.font.text(g, c[2], X, Y + 5, '#ffffff', { align: 'center', font: 'tiny', outline: '#1a1a1a' }); }
  const u = clamp((t - .4) / 3, 0, 1), mxp = lerp(ax, bx, ease.inOut(u)), myp = lerp(ay, by, ease.inOut(u)) - Math.abs(Math.sin(u * 30)) * 2;
  for (let i = 0; i <= 24; i++) { const q = i / 24; if (q > u) px.rect(g, Math.round(lerp(ax, bx, q)), Math.round(lerp(ay, by, q)), 2, 2, '#ffe070'); }
  const dir = bx > ax ? 1 : -1;   // the Old Trout
  px.rect(g, mxp - 9, myp - 9, 18, 8, '#f08a24'); px.rect(g, mxp - 9, myp - 9, 18, 2, '#ffffff'); px.rect(g, mxp + (dir > 0 ? 3 : -8), myp - 7, 5, 3, '#8ac0e8');
  px.disc(g, mxp - 5, myp - 1, 2, '#1a1a1a'); px.disc(g, mxp + 5, myp - 1, 2, '#1a1a1a'); if (Math.floor(t * 6) % 2) px.rect(g, mxp - dir * 11, myp - 4, 2, 2, '#9a9aa0');
  if (st.postcard && t > 1.2) { const pw = Math.min(w - 20, 220); E.ui.box(g, Math.round(r.W / 2 - pw / 2), y0 + h - 40, pw, 30, { bg: ['#f4ecd8', '#e8dcc0'], border: '#8a6a3a' }); E.font.text(g, st.postcard, r.W / 2, y0 + h - 30, '#3a2a1a', { align: 'center', outline: false, wrap: pw - 10 }); }
  E.font.text(g, 'ON THE ROAD: ' + B[2], r.W / 2, my + 4, '#ffe08a', { align: 'center', scale: 2, outline: '#000' });
};
/* ---- the cup scene: the bracket and the beats ---- */
EF.scenes.cup = front({ music: 'menu', stadium: 'smokehouse', idle: true, dim: .65,
  enter(d) {
    if (d.fresh) CUPS.start(); if (!CUPS.data().cup) CUPS.start();
    this.beat = null; this.step = -1; this.t = 0; this.talk = new E.Dialog(game, { lines: 3, speed: 30, border: '#ffc83a', bg: '#0d1430' });
    if (d.after) return this.afterMatch(d.after, d.match);
    if (d.post) return this.post(d.post);
    if (d.round !== undefined) { CUPS.data().cup.round = d.round; CUPS.data().cup.prologue = true; }
    if (d.beat) return this.play(d.beat, d.then);
    this.bracket();
  },
  bracket() {
    const c = CUPS.data().cup; this.beat = null; EF.music('menu');
    EF.UI.set([{ id: 'bracket', widgets: [{ id: 'go', kind: 'button', title: c.round === 0 && !c.prologue ? 'KICK OFF THE CUP RUN' : c.done ? 'BACK TO THE TITLE' : 'PLAY ' + CUPS.round().name, onPick: () => this.next() }],
      layout(r) { const w = this.widgets[0]; w.w = 220; w.h = 22; w.x = r.W / 2 - 110; w.y = r.H - 52; },
      draw: (g, r) => this.drawBracket(g, r), footer: () => [['confirm', 'GO'], ['cancel', 'TITLE']], onBack: () => game.go('title', { menu: true }) }]);
  },
  drawBracket(g, r) {
    const c = CUPS.data().cup, [mx, my] = EF.HUD.margin(r);
    E.font.title(g, 'THE EUROPHORIA CUP', r.W / 2, my, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    const n = 5, cw = Math.min(78, Math.floor((r.W - 2 * mx) / n) - 4), ch = 94, x0 = Math.round(r.W / 2 - (n * (cw + 4)) / 2), y = my + 26;
    EF.CUP.rounds.forEach((R, i) => {
      const x = x0 + i * (cw + 4), cur = i === c.round && !c.done, res = c.results[i], T = EF.get('team', R.opp);
      E.ui.box(g, x, y, cw, ch, { bg: cur ? ['#1c2a5c', '#2a3a74'] : ['#0d1430', '#16224a'], border: cur ? '#ffc83a' : res ? '#5aff7a' : '#2a3a6a' });
      E.font.text(g, R.short, x + cw / 2, y + 4, cur ? '#ffc83a' : '#9aa6c8', { align: 'center', font: 'tiny', outline: false });
      if (i <= c.round || res) EF.drawCrest(g, T, x + cw / 2, y + 34, 26); else { px.disc(g, x + cw / 2, y + 34, 12, '#2a3050'); E.font.text(g, '?', x + cw / 2, y + 28, '#5a6280', { align: 'center', scale: 2, outline: false }); }
      E.font.text(g, i <= c.round || res ? T.short : '???', x + cw / 2, y + 52, '#ffffff', { align: 'center', outline: false });
      E.font.text(g, EF.get('stadium', R.stadium).city, x + cw / 2, y + 63, '#7a86a8', { align: 'center', font: 'tiny', outline: false });
      if (res) E.font.text(g, res.score.join('-') + (res.pens ? ' P' : ''), x + cw / 2, y + 74, '#5aff7a', { align: 'center', scale: 1, outline: false });
      if (cur) { const bx = x + cw / 2 + Math.sin(game.real * 3) * 4; px.rect(g, bx - 7, y + ch + 3, 14, 6, '#f08a24'); px.disc(g, bx - 4, y + ch + 10, 2, '#1a1a1a'); px.disc(g, bx + 4, y + ch + 10, 2, '#1a1a1a'); }
    });
    if (c.done) E.font.text(g, 'CHAMPIONS OF EUROPE!', r.W / 2, y + ch + 16, '#ffe08a', { align: 'center', scale: 2, outline: '#000' });
  },
  /** the next thing in the cup: the prologue, the villain, a round's pre-match beat */
  next() {
    const c = CUPS.data().cup;
    if (c.done) return game.go('title', { menu: true });
    if (!c.prologue) return this.play('prologue', () => { c.prologue = true; EF.Save.sticker('mags'); EF.Save.write(); this.next(); });
    if (c.round === 4 && !c.flags.villain) return this.play('villain', () => this.next());
    this.play('r' + (c.round + 1) + '-pre');
  },
  /** run a beat's steps in order */
  play(id, then) { this.beat = EF.get('beat', id); this.step = -1; this.then = then || null; this.nextStep(); },
  nextStep() {
    const B = this.beat; this.step++; this.t = 0; game.input.consumeAll();
    if (!B || this.step >= B.steps.length) { const f = this.then; this.beat = null; this.then = null; if (f) return f(); return this.bracket(); }
    const st = B.steps[this.step], c = CUPS.data().cup;
    EF.UI.set([]);
    if (st.kind === 'tabloid') { EF.music('tabloid'); EF.sfx('paper'); this.photo = st.photo ? EF.Cast.rig(st.photo.team + ':' + st.photo.player) : null; if (this.photo && st.photo.pose) this.photo.update(.5, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: st.photo.pose, expr: st.photo.expr }); }
    else if (st.kind === 'travel') { EF.music('travel'); }
    else if (st.kind === 'talk') {
      EF.music(st.villain ? 'villain' : 'dressing');
      const lines = st.lines.slice(), sayNext = () => {
        const ln = lines.shift(); if (!ln) return this.nextStep();
        const last = !lines.length, who = ln[0];
        this.talk.say(ln[1], { name: EF.Cast.name(who), portrait: EF.Cast.rig(who), portraitSize: 40, portraitOpts: { zoom: 2.6, turn: .35 }, voice: EF.babble.voiceFor(who), place: 'bottom',
          choices: last && st.choices ? st.choices : null, onChoice: i => this.choice(st, i), onDone: () => { if (!(last && st.choices)) sayNext(); } });
      };
      this.speaker = st.lines[0][0]; sayNext();
    }
    else if (st.kind === 'teamtalk') this.teamTalk();
    else if (st.kind === 'challenge') { EF.sfx('coin'); }
    else if (st.kind === 'tunnel') { const R = CUPS.round(); game.go('tunnel', { opts: CUPS.matchOpts(this.humans()), next: { scene: 'cup', data: { resumeMatch: true } } }); this.leaving = true; }
    else if (st.kind === 'match') this.startMatch();
  },
  humans() { return [{ input: game.input, side: 0 }].concat((EF.cupCoop || []).filter(I => game.players.includes(I)).map(I => ({ input: I, side: 0 }))); },
  choice(st, i) {
    const c = CUPS.data().cup;
    if (this.beat.id === 'prologue') { if (i === 1) { c.prologue = true; EF.Save.sticker('mags'); EF.Save.write(); return game.go('training', { back: { scene: 'cup', data: {} } }); } return this.nextStep(); }
    if (this.beat.id === 'villain') { c.flags.villain = true; if (i === 0) { c.flags.loyal = true; EF.Save.sticker('loyal'); } else c.flags.joke = true; EF.Save.write(); return this.play(i === 0 ? 'villain-loyal' : 'villain-joke', () => this.next()); }
    this.nextStep();
  },
  /** the team talk: three cards; the tactics board asks for a formation; extra players may join for co-op */
  teamTalk() {
    const c = CUPS.data().cup, talks = ['hairdryer', 'arm', 'tactics'].map(id => EF.get('teamtalk', id));
    game.allowJoin({ max: 4, onJoin: I => { EF.cupCoop = (EF.cupCoop || []).concat([I]); } });
    EF.music('dressing');
    const pick = tt => {
      c.talk = tt.id; c.teamTalks++; EF.Save.write();
      const line = tt.lines[c.teamTalks % tt.lines.length];
      if (tt.formation) { EF.UI.push({ id: 'formation', widgets: ['2-2', '1-2-1', '2-1-1'].map(f => ({ id: f, kind: 'tile', title: f, text: f === '2-2' ? 'TWO AND TWO' : f === '1-2-1' ? 'THE DIAMOND' : 'THE KIPPER', icon: (g, cx, cy, s) => EF.drawFormation(g, f, cx, cy, s), onPick: () => { c.formation = f; EF.Save.write(); EF.UI.set([]); this.say('mags', line, () => this.nextStep()); } })),
        layout(r) { EF.UI.grid(this.widgets, 0, 40, r.W, r.H - 70, 3, 96, 96, 8); }, draw: (g, r) => EF.UI.panel(g, r, 'TACTICS BOARD', 'PICK THE FORMATION'), footer: () => [['confirm', 'PICK']] }); return; }
      EF.UI.set([]); this.say('mags', line, () => this.nextStep());
    };
    EF.UI.set([{ id: 'teamtalk', widgets: talks.map(tt => ({ id: tt.id, kind: 'tile', title: tt.name, text: tt.desc, icon: (g, cx, cy, s) => EF.icon(tt.id === 'hairdryer' ? 'whistle' : tt.id === 'arm' ? 'sticker' : 'cone')(g, cx, cy, s), onPick: () => pick(tt) })),
      layout(r) { EF.UI.grid(this.widgets, 0, 40, r.W, r.H - 74, 3, Math.min(124, Math.floor((r.W - 30) / 3) - 6), 104, 6); },
      draw: (g, r) => { EF.UI.panel(g, r, 'TEAM TALK', 'WHAT DOES MAGS SAY?'); if (game.players.length > 1) E.font.text(g, game.players.length + ' KIPPERS PLAYING (CO-OP)', r.W / 2, r.H - 36, '#7aff9a', { align: 'center', outline: '#000' }); else E.font.text(g, 'A FRIEND CAN JOIN: START ON A PAD, OR 2 ON THE KEYBOARD', r.W / 2, r.H - 36, '#9aa6c8', { align: 'center', font: 'tiny', outline: '#000' }); },
      footer: () => [['confirm', 'PICK']] }]);
  },
  say(who, text, done) { this.talk.say(text, { name: EF.Cast.name(who), portrait: EF.Cast.rig(who), portraitSize: 40, portraitOpts: { zoom: 2.6, turn: .35 }, voice: EF.babble.voiceFor(who), onDone: done }); },
  startMatch() {
    game.allowJoin(false);
    const opts = CUPS.matchOpts(this.humans());
    game.go('match', { opts, label: CUPS.round().name, onEnd: (res, m) => game.go('cup', { after: res, match: m }) });
  },
  afterMatch(res, m) {
    const c = CUPS.data().cup, idx = c.round, R = CUPS.round(), won = res.winner === 0;
    c.playT = (c.playT || 0) + (m ? m.t : 0);
    const stickers = m ? EF.matchStickers(m, res) : [];
    EF.quietStickers = true;
    if (m && m.challengeDone && EF.Save.sticker('ch:' + R.challenge, true)) stickers.push('ch:' + R.challenge);
    EF.quietStickers = false;
    if (EF.all('challenge').every(ch => EF.Save.has('ch:' + ch.id))) EF.Save.unlock('balls', 'leather');
    let final = false;
    if (won) {
      c.results[idx] = { opp: R.opp, score: res.score.slice(), pens: res.pens };
      const margin = res.score[0] - res.score[1], rec = CUPS.data().records; if (!rec.biggestWin || margin > rec.biggestWin.margin) rec.biggestWin = { margin, score: res.score.slice(), opp: R.opp };
      if (idx === 4) { final = true; c.done = true; rec.cupsWon = (rec.cupsWon || 0) + 1; if (!rec.fastestCup || c.playT < rec.fastestCup) rec.fastestCup = Math.round(c.playT); EF.Save.unlock('balls', 'golden'); }
      else c.round++;
    }
    EF.Save.write();
    game.go('results', { result: res, opts: { humans: [{ side: 0 }] }, stickers, contLabel: 'CONTINUE', next: () => game.go('cup', { post: { won, round: idx, final } }) });
  },
  post(p) {
    if (p.won) { if (p.final) return game.go('ending', {}); return this.play('r' + (p.round + 1) + '-win', () => this.bracket()); }
    this.play('r' + (p.round + 1) + '-loss', () => this.continueScreen());
  },
  /** CONTINUE? 10 s, arcade style: confirm retries the round from its team talk, cancel goes to the title */
  continueScreen() {
    const c = CUPS.data().cup; this.cont = 10; EF.music('defeat');
    EF.UI.set([{ id: 'continue', widgets: [{ id: 'yes', kind: 'button', title: 'CONTINUE', onPick: () => { c.retries++; EF.Save.write(); this.cont = null; this.play('r' + (c.round + 1) + '-pre-retry'); } }, { id: 'no', kind: 'button', title: 'GIVE UP', onPick: () => { this.cont = null; game.go('title', { menu: true }); } }],
      layout(r) { this.widgets.forEach((w, i) => { w.w = 110; w.h = 22; w.x = Math.round(r.W / 2 - 116 + i * 122); w.y = Math.round(r.H * .62); }); },
      draw: (g, r) => { E.font.title(g, 'KNOCKED OUT!', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 3, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'] }); E.font.text(g, 'CONTINUE?', r.W / 2, Math.round(r.H * .38), '#ffffff', { align: 'center', scale: 2, outline: '#000' }); E.font.text(g, String(Math.max(0, Math.ceil(this.cont || 0))), r.W / 2, Math.round(r.H * .46), '#ffc83a', { align: 'center', scale: 3, outline: '#000' }); },
      footer: () => [['confirm', 'RETRY'], ['cancel', 'GIVE UP']], onBack: () => { this.cont = null; game.go('title', { menu: true }); } }]);
  },
  update(dt) {
    this.t += dt;
    if (this.cont !== null && this.cont !== undefined) { const was = Math.ceil(this.cont); this.cont -= dt; if (Math.ceil(this.cont) < was) EF.sfx('tick'); if (this.cont <= 0) { this.cont = null; game.go('title', { menu: true }); } }
    if (this.talk.open) { this.talk.update(dt); return true; }
    const B = this.beat; if (!B) return false;
    const st = B.steps[this.step]; if (!st) return false;
    if (st.kind === 'tabloid' || st.kind === 'travel' || st.kind === 'challenge') {
      if (st.kind === 'tabloid' && Math.floor(this.t * 12) !== Math.floor((this.t - dt) * 12) && this.t < .6) EF.sfx('typewriter');
      const go = EF.UI.pressed('confirm') || EF.UI.pressed('start') || (game.input.clicked && game.input.clicked()) || (st.kind === 'travel' && this.t > 5.5);
      if (go && this.t > .5) { EF.sfx('confirm'); this.nextStep(); }
      return true;
    }
    if (st.kind === 'teamtalk') return false;
    return true;
  },
  draw(r) {
    const B = this.beat, st = B && B.steps[this.step];
    if (st) r.overlay(g => {
      if (st.kind === 'tabloid') EF.drawTabloid(g, r, st, this.t, this.photo);
      else if (st.kind === 'travel') EF.drawTravel(g, r, st, this.t);
      else if (st.kind === 'challenge') { const R = CUPS.round(), ch = EF.get('challenge', R.challenge), w = Math.min(r.W - 40, 260), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .3); E.ui.box(g, x, y, w, 80, { bg: ['#2a1a4a', '#3a2a6a'], border: '#ffc83a' }); E.font.text(g, "THE GAFFER'S CHALLENGE", r.W / 2, y + 8, '#ffc83a', { align: 'center', outline: false }); E.font.text(g, ch.name, r.W / 2, y + 26, '#ffffff', { align: 'center', scale: 2, outline: '#000', wrap: w - 10 }); E.font.text(g, 'Optional. Do it for a SHINY sticker.', r.W / 2, y + 60, '#c8d0e8', { align: 'center', outline: false }); }
      if (st.kind === 'tabloid' || st.kind === 'travel' || st.kind === 'challenge') EF.prompts(g, r.W / 2, r.H - Math.max(5, Math.round(r.H * .035)) - 12, [['confirm', 'CONTINUE']], { input: game.input });
    });
    this.talk.draw(r);
  },
  scene: {}
});
/* a round's beat again after CONTINUE: straight to the team talk */
/* resuming after the tunnel: the cup scene goes straight to the match */
const _cupEnter = EF.scenes.cup.enter;
EF.scenes.cup.enter = function (d) { if (d && d.resumeMatch) { EF.Stage.enter(); this.talk = new E.Dialog(game, { lines: 3, speed: 30 }); this.beat = null; return this.startMatch(); } return _cupEnter.call(this, d); };
EF.drawFormation = (g, f, cx, cy, s) => {
  const F = EF.get('formation', f), w = s * 1.2, h = s * .8;
  px.rect(g, cx - w / 2, cy - h / 2, w, h, '#2a6a3a'); px.rect(g, cx - w / 2, cy, w, 1, '#8ac08a');
  for (const k in F.roles) { const [u, v] = F.roles[k].base; px.disc(g, cx - w / 2 + v * w, cy + h / 2 - u * h, 3, F.roles[k].keeper ? '#3ac06a' : '#f08a24'); }
};

/* ---- THE TUNNEL (section 6.24): the walkout, the handshakes, the coin toss; also the AI Hub's card ---- */
EF.scenes.tunnel = Object.assign(EF.sceneBase(), {
  enter(d) {
    this.d = d; this.t = 0; this.card = !!d.card; const o = d.opts;
    const m = this.m = new EF.Match({ home: o.home, away: o.away, stadium: o.stadium, kind: 'title', seed: 3, halfLength: 999, noReplay: true, humans: [], events: false, kits: o.kits, weather: o.weather, time: o.time });
    this.view = new EF.MatchView(m); this.dur = d.short ? 5 : 9;
    m.players.forEach((f, i) => { f.body.x = P.CX + (f.side ? 8 : -8); f.body.y = P.Y1 + 50 + (f.idx) * 10; f.facing = -Math.PI / 2; });
    m.ref.body.x = P.CX; m.ref.body.y = P.Y1 + 40;
    EF.Stage.enter(); game.setZoom(1.1); game.cam.smooth = .5;
    const W = m.weather; game.weather = W && (W.kind === 'rain' || W.kind === 'snow') ? { kind: W.kind, amount: W.amount * .6, wind: W.wind || 0 } : null;
    EF.music('anthem'); EF.crowdAudio.start(m.stadium.crowd.size); EF.crowdAudio.set(.8, 1);
    this.coin = 0;
    if (this.card) EF.Hub && EF.Hub.cardEnter && EF.Hub.cardEnter(this);
  },
  exit() { this.view.dispose(); EF.crowdAudio.stop(); game.weather = null; },
  update(dt) {
    const m = this.m, t = this.t += dt; m.t += dt;
    const lineY = P.CY + 30, k = this.card ? Math.min(1, t / 6) : Math.min(1, t / (this.dur * .55));
    m.players.forEach(f => {
      const slot = f.idx, tx = P.CX + (f.side ? 1 : -1) * (24 + slot * 18), ty = lineY - (f.side ? 0 : 0);
      const startY = P.Y1 + 50 + slot * 10, walk = clamp(k * 1.6 - slot * .12, 0, 1), x = lerp(P.CX + (f.side ? 8 : -8), tx, ease.inOut(clamp(walk * 1.4 - .4, 0, 1))), y = lerp(startY, ty, ease.inOut(Math.min(1, walk * 1.3)));
      f.body.vx = (x - f.body.x) / Math.max(dt, 1e-3); f.body.vy = (y - f.body.y) / Math.max(dt, 1e-3); f.body.x = x; f.body.y = y;
      f.facing = walk >= 1 ? Math.PI / 2 : Math.atan2(f.body.vy, f.body.vx || .0001);
      if (walk >= 1) { f.body.vx = f.body.vy = 0; }
      f.look.pose = !this.card && t > this.dur * .6 && t < this.dur * .8 && f.side === 1 ? null : walk >= 1 ? null : null;
    });
    // the handshakes: the away line walks along the home line, arms out
    if (!this.card && t > this.dur * .6 && t < this.dur * .82) { const u = (t - this.dur * .6) / (this.dur * .22); for (const f of m.side[1]) { f.body.x = P.CX + 24 + f.idx * 18 - u * 140; f.body.y = lineY + 10; f.facing = Math.PI; f.body.vx = -60; } }
    m.ref.body.x = P.CX; m.ref.body.y = lerp(P.Y1 + 40, lineY - 20, Math.min(1, k * 1.4)); m.ref.facing = Math.PI / 2;
    for (const f of m.players) f.updateLook(dt, EF.Intent.idle);
    for (const f of m.side[1]) f.look.pose = !this.card && t > this.dur * .6 && t < this.dur * .82 ? 'cast' : null;
    this.view.update(dt, m);
    EF.crowdAudio.set(.7, dt);
    game.focus(P.CX, lineY + 10, 0);
    if (!this.card && t > this.dur * .84) this.coin += dt;
    if (this.card) { if (EF.Hub && EF.Hub.cardStep) EF.Hub.cardStep(dt, this); return; }
    const skip = t > .6 && (EF.UI.pressed('confirm') || EF.UI.pressed('start') || (game.input.clicked && game.input.clicked()));
    if (t > this.dur + .4 || skip) { game.input.consumeAll(); const n = this.d.next; game.go(n.scene, n.data); }
  },
  draw(r) {
    this.view.draw(r, this.m);
    const m = this.m;
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r);
      if (this.card) { if (EF.Hub && EF.Hub.cardDraw) EF.Hub.cardDraw(g, r, this); return; }
      E.ui.box(g, Math.round(r.W / 2 - 150), my, 300, 34, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .9 });
      EF.drawCrest(g, m.teams[0], Math.round(r.W / 2 - 132), my + 17, 22); EF.drawCrest(g, m.teams[1], Math.round(r.W / 2 + 132), my + 17, 22);
      E.font.text(g, m.teams[0].short + '  V  ' + m.teams[1].short, r.W / 2, my + 5, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
      E.font.text(g, m.stadium.name + '  -  ' + (this.d.label || EF.titleCase(m.stadium.city)), r.W / 2, my + 23, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      if (this.coin > 0) { const fr = EF.SPR.coin[Math.floor(this.coin * 12) % 3], up = Math.sin(Math.min(1, this.coin / 1.2) * Math.PI) * 30; px.sprite(g, fr, Math.round(r.W / 2 - 3), Math.round(r.H * .45 - up), { scale: 2 }); if (this.coin > 1.2) E.font.text(g, m.teams[m.rng() < .5 ? 0 : 1].short + ' KICK OFF', r.W / 2, Math.round(r.H * .52), '#ffe08a', { align: 'center', scale: 2, outline: '#000' }); }
      EF.prompts(g, r.W / 2, r.H - my - 12, [['confirm', 'SKIP']], { input: game.input });
    });
  }
});

/* ---- THE ENDING (section 6.24): the trophy lift, the harbour parade, the closing tabloid, the credits ---- */
const HARBOUR_ROWS = (() => {
  const rows = [], C = 90, R = 22;
  for (let r = 0; r < R; r++) { let s = ''; for (let c = 0; c < C; c++) s += r < 4 ? (c % 7 === 6 ? ':' : (c % 7 < 3 ? 'H' : 'h')) : r < 6 ? ':' : r < 12 ? '.' : r < 14 ? ':' : r === 14 ? 'q' : '~'; rows.push(s); }
  return rows;
})();
EF.scenes.ending = Object.assign(EF.sceneBase(), {
  enter() {
    this.t = 0; this.phase = 'ceremony'; this.pt = 0;
    const m = this.m = new EF.Match({ home: 'kipperton', away: 'opulence', stadium: 'euphorium', kind: 'title', seed: 5, halfLength: 999, noReplay: true, humans: [], events: false });
    this.view = new EF.MatchView(m); m.ref.body.x = -999;
    for (const f of m.side[1]) f.ghost = true;
    m.side[0].forEach((f, i) => { f.body.x = P.CX - 40 + i * 20; f.body.y = P.CY + 10; f.facing = Math.PI / 2; });
    this.daz = m.side[0].find(f => f.data.id === 'pilchard');
    EF.Stage.enter(); game.setZoom(1.25); EF.music('ceremony');
    this.harbour = new E.TileMap({ rows: HARBOUR_ROWS, legend: { H: 1, h: 2, ':': { floor: 'pave' }, '.': { floor: 'road' }, q: 3, '~': { floor: 'water', block: true } },
      types: { 1: { h: 44, face: 'plaster', roof: 'tiles', side: '#e8dcc8', top: '#b85a3a' }, 2: { h: 38, face: 'timber', roof: 'tiles', side: '#d8c8a8', top: '#8a4a3a', beam: '#5a3a2a' }, 3: { h: 6, face: 'stone', side: '#7a7a80', top: '#9a9aa0' } },
      floorTex: (x, y, tag) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5; if (tag === 'water') { const w = E.noise2(x * .05 + this.t * .3, y * .08) * 30; return [40 + w * .3, 90 + w, 140 + w + n * 10]; } if (tag === 'road') return [70 + n * 14, 70 + n * 14, 78 + n * 14]; return [150 + n * 20, 140 + n * 20, 128 + n * 20]; } });
    this.fans = []; for (let i = 0; i < 70; i++) this.fans.push({ x: i * 20 + EF.fx(0, 10), y: i % 2 ? 5 * 16 + 4 : 12 * 16 + 10, c: EF.fxPick(['#f08a24', '#1c2a5a', '#ffffff', '#f08a24']), ph: EF.fx(0, 9) });
    this.credits = ['EUROPHORIA FOOTBALL', '', 'A BROKE SEASIDE CLUB.', 'A TYPO.', 'A CUP.', '', 'MADE BY CLAUDE', '(ANTHROPIC, CLAUDE-OPUS-5-5)', '', 'ENGINE: MY-3D2DGE BY MICHAEL CROSATO', '', 'MOTION: QUATERNIUS, MESH2MOTION,', 'THE CMU MOTION CAPTURE DATABASE', '', 'ONLINE: AI HUB SESSIONS', '', 'COMMENTARY: BARRY BELLOW AND TREV BRICKLEY', 'MANAGER: MAGS MULLIGAN', '', 'THE KIPPERS:', 'WALLY CRABB', 'SANDRA OKAFOR', 'AGGIE NOWAK', 'TOMMY TRAN', 'DAZ PILCHARD', '', 'KINGSBRIDGE ALBION HAVE DEMANDED A RECOUNT.', '', 'THANK YOU FOR PLAYING'];
  },
  exit() { this.view.dispose(); game.lights.enabled = false; },
  update(dt) {
    const t = this.t += dt, m = this.m; m.t += dt;
    const skip = EF.UI.pressed('confirm') || EF.UI.pressed('start') || (game.input.clicked && game.input.clicked());
    if (this.phase === 'ceremony') {
      for (const f of m.side[0]) { f.body.z = f === this.daz ? 8 : Math.abs(Math.sin(t * 6 + f.idx)) * 6; f.look.pose = 'cheer'; f.look.expr = 'shout'; f.updateLook(dt, EF.Intent.idle); f.look.pose = 'cheer'; f.look.expr = 'shout'; }
      if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) { game.particles.bits(P.CX + EF.fx(-80, 80), P.CY + EF.fx(-20, 20), 60, 20, EF.SPR.confetti); if (EF.fxRng() < .5) this.view.fireworks(1); }
      this.view.update(dt, m); game.focus(P.CX, P.CY, 20);
      if (t > 9 || (skip && t > 1)) { this.phase = 'parade'; this.pt = 0; game.lights.enabled = false; EF.music('anthem'); game.input.consumeAll(); }
    } else if (this.phase === 'parade') {
      this.pt += dt; const x = 40 + this.pt * 60;
      game.cam.bounds = v => this.harbour.bounds(v); game.focus(x + 60, 8 * 16, 0);
      for (const f of m.side[0]) { const rig = this.view.rigOf(f); rig.update(dt, { x: x + f.idx * 10 - 20, y: 8 * 16 + 4 + (f.idx % 2) * 6, z: 26 + Math.abs(Math.sin(this.pt * 6 + f.idx)) * 4, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'shout' }); }
      if (EF.fxRng() < dt * 6) game.particles.bits(x + EF.fx(-40, 80), EF.fxRng() < .5 ? 5 * 16 : 12 * 16, 20, 4, ['#f08a24', '#1c2a5a', '#ffffff']);
      if (this.pt > 22 || (skip && this.pt > 1)) { this.phase = 'tabloid'; this.tt = 0; game.input.consumeAll(); EF.sfx('paper'); this.photo = EF.Cast.rig('kipperton:pilchard'); this.photo.update(.5, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'shout' }); }
    } else if (this.phase === 'tabloid') { this.tt += dt; if ((skip && this.tt > .8) || this.tt > 8) { this.phase = 'credits'; this.ct = 0; EF.music('credits'); game.input.consumeAll(); } }
    else if (this.phase === 'credits') { this.ct += dt; if (this.ct > this.credits.length * 1.1 + 6 || (skip && this.ct > 1)) { game.go('title', { menu: true }); } }
  },
  draw(r) {
    if (this.phase === 'ceremony') {
      this.view.draw(r, this.m);
      r.queue(P.CX, P.CY + 2, 4, g => r.box(g, P.CX - 60, P.CY - 4, 0, P.CX + 60, P.CY + 8, 6, '#e8e0d0', '#c8b8a0'));
      const d = this.daz, rig = this.view.rigOf(d), h = rig.hand('R');
      r.queue(h[0], h[1], h[2] + 8, g => EF.drawTrophy(g, r, h[0], h[1], h[2] + 2, 1.4), { emissive: true, bias: 5 });
      r.overlay(g => { E.font.title(g, 'CHAMPIONS OF EUROPE!', r.W / 2, Math.round(r.H * .1), { align: 'center', scale: r.W > 380 ? 3 : 2, colors: ['#fffbe8', '#ffe08a', '#ffc83a', '#e0662a'], depth: 3 }); E.font.text(g, 'KIPPERTON ATHLETIC LIFT THE EUROPHORIA CUP', r.W / 2, Math.round(r.H * .1) + 32, '#ffffff', { align: 'center', outline: '#000' }); });
    } else if (this.phase === 'parade' || this.phase === 'credits' || this.phase === 'tabloid') {
      r.sky(['#5a9ad8', '#9ac8f0', '#e8f0f8']);
      this.harbour.drawFloor(r); this.harbour.queueWalls(r);
      const x = 40 + (this.pt || 0) * 60, ty = 8 * 16 + 4;
      r.queue(x, ty + 14, 10, g => { r.box(g, x - 34, ty - 10, 6, x + 34, ty + 14, 24, '#2a4a8a', '#f08a24'); r.box(g, x + 10, ty - 6, 24, x + 28, ty + 10, 44, '#ffffff', '#e8e0d0'); const a = r.w(x - 20, ty + 14, 6), b = r.w(x + 20, ty + 14, 6); px.disc(g, a[0], a[1], 5, '#1a1a1a'); px.disc(g, b[0], b[1], 5, '#1a1a1a'); const n = r.w(x - 10, ty, 26); E.font.text(g, 'KIPPERTON', n[0], n[1] - 2, '#ffffff', { font: 'tiny', outline: '#000' }); });
      r.prop('banner', x + 20, ty, 44, { color: '#f08a24' });
      for (const f of this.m.side[0]) { const rig = this.view.rigOf(f); r.actor(rig.x, rig.y, rig.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
      for (const fan of this.fans) r.queue(fan.x, fan.y, 0, g => { const p = r.w(fan.x, fan.y, 0), up = Math.abs(Math.sin(this.t * 6 + fan.ph)) * 3; px.rect(g, p[0] - 2, p[1] - 8 - up, 5, 6, fan.c); px.rect(g, p[0] - 1, p[1] - 11 - up, 3, 3, '#f0c8a8'); px.rect(g, p[0] - 3, p[1] - 13 - up, 1, 4, fan.c); px.rect(g, p[0] + 3, p[1] - 13 - up, 1, 4, fan.c); });
      for (let i = 0; i < 4; i++) { const gx = x + 100 * Math.sin(this.t * .3 + i * 2), gy = 60 + i * 30; r.sprite(gx, gy, 90 + i * 10, EF.SPR.gull, {}); }
      for (let i = 0; i < 6; i++) r.prop(i % 2 ? 'barrel' : 'crate', 100 + i * 240, 13 * 16, 6);
      if (this.phase === 'tabloid') r.overlay(g => EF.drawTabloid(g, r, EF.get('beat', 'ending').steps[0], this.tt, this.photo));
      if (this.phase === 'credits') r.overlay(g => { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000')); this.credits.forEach((ln, i) => { const y = Math.round(r.H + 10 + i * 14 - this.ct * 14); if (y > -10 && y < r.H + 10) E.font.text(g, ln, r.W / 2, y, i === 0 ? '#ffc83a' : '#ffffff', { align: 'center', scale: i === 0 ? 2 : 1, outline: '#000' }); }); });
      if (this.phase === 'parade') r.overlay(g => E.font.text(g, 'THE KIPPERTON HOMECOMING', r.W / 2, Math.max(5, Math.round(r.H * .035)) + 4, '#ffffff', { align: 'center', scale: 2, outline: '#000' }));
    }
    r.overlay(g => EF.prompts(g, r.W / 2, r.H - Math.max(5, Math.round(r.H * .035)) - 12, [['confirm', 'SKIP']], { input: game.input }));
  }
});
/** the Europhoria Cup: a big-eared silver cup on a plinth */
EF.drawTrophy = (g, r, x, y, z, s = 1) => {
  const p = r.w(x, y, z), X = Math.round(p[0]), Y = Math.round(p[1]), k = v => Math.round(v * s * (r.view.zoom || 1));
  px.rect(g, X - k(5), Y - k(3), k(10), k(3), '#4a3a2a'); px.rect(g, X - k(2), Y - k(8), k(4), k(5), '#c8ccd8');
  px.poly(g, [[X - k(6), Y - k(20)], [X + k(6), Y - k(20)], [X + k(3), Y - k(8)], [X - k(3), Y - k(8)]], '#d8dce8');
  px.rect(g, X - k(4), Y - k(19), k(2), k(9), '#ffffff');
  px.rect(g, X - k(10), Y - k(18), k(3), k(7), '#c8ccd8'); px.rect(g, X + k(7), Y - k(18), k(3), k(7), '#c8ccd8');
  r.glowDisc(g, X, Y - k(14), k(5), '#fff6c0', .25);
};
/* ==== src/33-match.js ==== */
/* THE MATCH SCENE: builds a Match from options (Kick-About, a cup tie, Penalties, a session, training, attract), runs it
 * (or plays a replay), and drives the view, the HUD, the commentary, the camera and the sound from its events.
 * data: { opts (Match options), onEnd(result), backTo, label } */
EF.scenes = EF.scenes || {};
/* ---- the match's sound: effects, whistles and the crowd from its events ---- */
class MatchAudio {
  constructor(m) {
    this.m = m; this.unsub = EF.bus.on('*', ev => { if (ev.match === m || ev.type === 'replayCue') this.on(ev); });
    EF.crowdAudio.start(m.stadium.crowd ? m.stadium.crowd.size : 600); this.chantT = 6; this.oleT = 0;
  }
  dispose() { if (this.unsub) this.unsub(); EF.crowdAudio.stop(); }
  on(ev) {
    const m = this.m, C = EF.crowdAudio, s = EF.sfx;
    switch (ev.type) {
      case 'replayCue': s(ev.cue === 'shot' ? 'shot' : ev.cue === 'woodwork' ? 'doink' : 'touch', { pitch: .7 }); break;
      case 'touch': if (!m.replay) s('touch'); break;
      case 'pass': s('pass'); break;
      case 'shot': s(ev.screamer ? 'shot' : 'kick'); if (ev.screamer) s('screamer'); if (m.replayRec) m.replayRec.cue('shot'); break;
      case 'bounce': if (ev.speed > 30) s(ev.surf === 'puddle' || ev.surf === 'wet' ? 'splash' : ev.surf === 'snow' ? 'crunch' : 'grass', { vol: clamp(ev.speed / 200, .2, 1) }); break;
      case 'boards': s('thump'); break;
      case 'woodwork': s('doink'); C.react('ooh'); if (m.replayRec) m.replayRec.cue('woodwork'); break;
      case 'netHit': s('net'); break;
      case 'goal': case 'ownGoal': s('net'); C.react('roar'); EF.sting('goal'); if (!ev.shootout) { game.after(1.6, () => EF.crowdAudio.chant(m.teams[ev.side].chant)); } break;
      case 'nearMiss': C.react('ooh'); break;
      case 'catch': s('catch'); break;
      case 'parry': case 'tip': s('parry'); break;
      case 'save': C.react(ev.kind === 'catch' ? 'clap' : 'ooh'); break;
      case 'whistle': if (ev.kind === 'half') { s('whistle'); game.after(.35, () => s('whistleLong')); } else if (ev.kind === 'full') { s('whistle'); game.after(.3, () => s('whistle')); game.after(.6, () => s('whistleLong')); } else if (ev.kind === 'end') { s('whistleLong'); } else if (ev.kind !== 'none') s(ev.kind === 'kickoff' ? 'whistleLong' : 'whistle'); break;
      case 'card': s('card'); C.react('boo'); break;
      case 'foul': C.react('whistles'); break;
      case 'slide': s('slide'); break;
      case 'knockdown': case 'launched': s('thud'); break;
      case 'skill': s('swish'); if (ev.kind === 'nutmeg' || ev.kind === 'rainbow') C.react('gasp'); break;
      case 'nutmeg': s('nutmeg'); EF.crowdAudio.chant('ole'); break;
      case 'euphoriaLevel': s('chime'); if (ev.level >= 67) EF.crowdAudio.chant(m.teams[ev.side].chant); break;
      case 'euphoriaFull': s('chime', { pitch: 1.5 }); break;
      case 'europhoria': s('stab'); for (const t of ['eudrums', 'eubass', 'eubrass']) EF.layer(t, 1, .4); EF.crowdAudio.chant(m.teams[ev.side].chant); break;
      case 'europhoriaEnd': for (const t of ['eudrums', 'eubass', 'eubrass']) EF.layer(t, 0, 1); break;
      case 'superCharge': s('superCharge'); break;
      case 'superStrike': s('superRelease'); s('sizzle'); break;
      case 'saveDuel': EF.layer('heart', 1, .1); EF.layer('tension', 1, .2); break;
      case 'saveDuelResult': EF.layer('heart', 0, .3); EF.layer('tension', 0, .5); s(ev.result === 'miss' ? 'buzz' : 'perfect'); break;
      case 'var': for (let i = 0; i < 4; i++) game.after(i * .5, () => s('beep')); break;
      case 'diveBooked': C.react('boo'); break;
      case 'gullLand': case 'gullAway': s('squawk'); break;
      case 'beachHit': s('boing'); break;
      case 'beachPop': s('kick', { pitch: 2 }); break;
      case 'event': if (ev.id === 'floodlight') s('powerDown'); if (ev.id === 'fireworks') s('firework'); break;
      case 'bus': s('horn'); break;
      case 'busHit': s('thump', { pitch: .6 }); break;
      case 'busSmashed': s('superRelease'); break;
      case 'shootoutStart': EF.layer('tension', 1, .5); EF.layer('heart', 1, .5); break;
      case 'shootoutEnd': EF.layer('tension', 0, .5); EF.layer('heart', 0, .5); C.react('roar'); break;
      case 'shootoutKick': if (!ev.scored) C.react('ooh'); else C.react('roar'); break;
      case 'passDone': if (ev.chain >= 5 && m.teams[ev.who.side].chant === 'pasapasa') EF.crowdAudio.chant('ole'); break;
      case 'refHit': C.react('gasp'); break;
      case 'half': EF.music('halftime'); break;
      case 'secondHalf': EF.music('matchbed'); break;
      case 'kickoff': if (m.half === 1 && m.clock < 1) game.after(.8, () => EF.crowdAudio.chant(m.teams[0].chant)); break;
    }
  }
  update(dt, view) {
    const m = this.m, mood = view ? Math.max(view.crowd.mood[0], view.crowd.mood[1]) : .3;
    EF.crowdAudio.set(m.mode === 'goal' || m.mode === 'celebrate' ? 1 : m.mode === 'var' ? .35 : mood, dt);
    this.chantT -= dt; if (this.chantT <= 0 && m.mode === 'play') { this.chantT = 14 + EF.fx(0, 10); const s = m.euphoria[0] >= m.euphoria[1] ? 0 : 1; EF.crowdAudio.chant(m.teams[s].chant); }
  }
}
EF.MatchAudio = MatchAudio;
/* ---- the scene ---- */
EF.cur = null;   // { m, view, comm, replay, audio } of the match on screen
EF.scenes.match = {
  view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], input: EF.KEYS, res: 'ps1', touch: [], camera: { zoom: [.7, 1.7], start: 1 },
  get pausable() { return !EF.inSession && !(EF.cur && EF.cur.attract); },
  enter(d) {
    d = d || {}; const o = Object.assign({}, d.opts || EF.defaultMatchOpts());
    if (o.seed === undefined && EF.link.seed !== null) o.seed = EF.link.seed;
    if (!o.humans) o.humans = [{ input: game.input, side: 0 }];
    const m = new EF.Match(o);
    const cur = EF.cur = { m, view: new EF.MatchView(m), comm: new EF.Commentary(m), replay: new EF.Replay(m), audio: EF.inSession && AIHub.server ? null : new MatchAudio(m), d, endT: 0, ended: false, ht: null, attract: !!d.attract, label: d.label || null, src: m };
    m.replayRec = cur.replay;
    m.replayHook = r => cur.replay;
    EF.Camera.reset(m, m.pitch.map); game.setView(EF.CAMERAS[game.settings.camera] || 'broadcast');
    const W = m.weather; game.weather = W && (W.kind === 'rain' || W.kind === 'snow') ? { kind: W.kind, amount: W.amount, wind: W.wind || 0 } : null;
    m.fog = o.fogStart || 0; m.fogTarget = o.fogStart || m.fogTarget || 0;
    EF.music(o.kind === 'attract' ? 'attract' : 'matchbed');
    m.onEnd = r => { cur.result = r; cur.endT = 0; };
    if (o.kind !== 'training' && o.kind !== 'attract' && !o.shootoutOnly) cur.comm.announce(H.fill(EF.PA_LINES[0], { stadium: EF.titleCase(m.stadium.name), crowd: String(m.stadium.capacity || 3112) }));
    if (o.challenge) { const ch = EF.get('challenge', o.challenge), st = { side: 0 }; cur.chUnsub = EF.bus.on('*', ev => { if (ev.match === m && !m.challengeDone && ch.test(ev, st)) { m.challengeDone = true; EF.toast("GAFFER'S CHALLENGE COMPLETE!", { sub: ch.name }); } }); cur.challenge = ch; cur.chState = st; }
    cur.lineUnsub = EF.bus.on('commentaryLine', ev => { if (ev.match === m && !EF.inSession) { const d2 = EF.Save.data(); d2.heard = (d2.heard || 0) + 1; if (d2.heard >= 50) EF.Save.sticker('barrytrev'); } });
    cur.keithUnsub = EF.bus.on('invaderTackled', ev => { if (ev.match === m && ev.id === 'invader-keith') m.keithTackled = true; });
    game.input.consumeAll();
    EF.bus.emit('matchStart', { match: m });
  },
  exit() { const c = EF.cur; if (c) { c.view.dispose(); c.comm.dispose(); if (c.audio) c.audio.dispose(); for (const u of [c.chUnsub, c.lineUnsub, c.keithUnsub]) if (u) u(); } EF.cur = null; game.timeScale = 1; game.weather = null; EF.music(null); },
  update(dt) {
    const c = EF.cur; if (!c) return;
    const m = c.m;
    if (EF.Dev && EF.Dev.frozen()) { c.view.update(0, c.src); EF.Camera.update(dt, m, c.src); return; }
    // the replay: the match waits while the recording plays
    if (m.mode === 'replay') {
      if (!c.replay.playing) { if (!c.replay.start(m.lastGoal ? m.lastGoal.t : m.t)) { m.endReplay(); } else { c.comm.say('replay', 20, {}, 'replayStart'); } }
      const skip = !c.attract && (game.input.pressed('confirm') || game.input.clicked());
      if (c.replay.playing && (skip || !c.replay.advance(dt))) { c.replay.stop(); m.endReplay(); }
      c.src = c.replay.proxy || m;
    } else { m.update(dt); c.replay.record(); c.src = m; }
    if (m.fogTarget !== undefined) m.fog = approach(m.fog || 0, m.fogTarget, dt * .1);
    game.timeScale = (m.wantScale || 1) * EF.T.gameSpeed;
    c.view.update(dt, c.src); c.comm.update(dt); if (c.audio) c.audio.update(dt, c.view);
    EF.Camera.update(dt, m, c.src);
    if (EF.Hub && EF.Hub.matchStep) EF.Hub.matchStep(dt, c);
    if (c.result && !c.ended) { c.endT += dt / Math.max(.05, game.timeScale); if (c.endT > 1.2) { c.ended = true; game.timeScale = 1; if (c.d.onEnd) c.d.onEnd(c.result, m); else game.go('results', { result: c.result, opts: m.o, again: c.d }); } }
  },
  draw(r) {
    const c = EF.cur; if (!c) return;
    c.view.draw(r, c.src);
    EF.HUD.draw(r, c.m, c.src);
    if (c.m.mode === 'halftime') r.overlay(g => EF.halftimePanel(g, r, c.m));
    c.comm.draw(r);
    if (c.attract && EF.attractOverlay) EF.attractOverlay(r, c);
    if (EF.Hub && EF.Hub.matchOverlay) EF.Hub.matchOverlay(r, c);
  }
};
EF.defaultMatchOpts = () => ({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse', kind: 'kickabout', draws: game.settings.draws || 'allowed' });
EF.restartMatch = () => { const c = EF.cur; if (!c) return; game.resume && game.resume(); const d = Object.assign({}, c.d, { opts: Object.assign({}, c.m.o, { seed: undefined, onEnd: undefined }) }); delete d.opts.humans; d.opts.humans = c.m.humans.filter(h => h.input).map(h => ({ input: h.input, side: h.side })); game.go('match', d); };
/** the half-time overlay: the score, two big stats, a line */
EF.halftimePanel = (g, r, m) => {
  const w = Math.min(r.W - 40, 280), x = Math.round((r.W - w) / 2), y = Math.round(r.H * .18), h = 116;
  E.ui.box(g, x, y, w, h, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .94 });
  E.font.title(g, 'HALF TIME', r.W / 2, y + 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
  EF.drawCrest(g, m.teams[0], x + 30, y + 54, 24); EF.drawCrest(g, m.teams[1], x + w - 30, y + 54, 24);
  E.font.text(g, m.score[0] + ' - ' + m.score[1], r.W / 2, y + 44, '#ffffff', { align: 'center', scale: 3, outline: '#000' });
  const tot = Math.max(1, m.possT[0] + m.possT[1]), pos = Math.round(m.possT[0] / tot * 100);
  E.font.text(g, 'SHOTS  ' + m.stats.shots[0] + ' - ' + m.stats.shots[1], r.W / 2, y + 74, '#c8d0e8', { align: 'center', outline: false });
  E.font.text(g, 'POSSESSION  ' + pos + '% - ' + (100 - pos) + '%', r.W / 2, y + 88, '#c8d0e8', { align: 'center', outline: false });
};
/* ==== src/34-training.js ==== */
/* TRAINING (section 6.25): the drill list (nine drills, each with a tick), and the drill runner on the match scene: the
 * coach explains each step in a short dialog, the drill runs on the Rec with a counter, success plays a fanfare and
 * the next step; the last step completes the drill (saved). */
EF.scenes.training = front({ music: 'training', stadium: 'rec', dim: .45,
  enter(d) {
    this.back = d.back || null; const sv = EF.Save.data();
    EF.UI.set([{ id: 'drills', focus: d.focus || 0, widgets: EF.DRILLS.map((id, i) => { const D = EF.get('drill', id); return { id, kind: 'tile', title: (i + 1) + '. ' + D.title, text: D.teaches, badge: sv.drills[id] ? 'DONE ✓'.replace('✓', '') + '★' : '', icon: EF.icon(['boot', 'ball', 'pens', 'boot', 'ball', 'whistle', 'pens', 'cup', 'whistle'][i]), onPick: () => EF.startDrill(id, this.back) }; }),
      layout(r) { const cw = Math.min(132, Math.floor((r.W - 24) / 3) - 6), ch = Math.min(56, Math.floor((r.H - 80) / 3) - 6); EF.UI.grid(this.widgets, 0, 34, r.W, r.H - 60, 3, cw, ch, 6); },
      draw: (g, r) => EF.UI.panel(g, r, 'TRAINING', Object.keys(sv.drills).length + ' OF 9 DRILLS DONE'), footer: () => [['confirm', 'START'], ['cancel', 'BACK']],
      onBack: () => { if (this.back) game.go(this.back.scene, this.back.data); else game.go('title', { menu: true, focus: 3 }); } }]);
  }
});
EF.startDrill = (id, back) => {
  game.go('match', { opts: { home: 'kipperton', away: 'reserves', stadium: 'rec', kind: 'training', seed: 11, halfLength: 999, noReplay: true, humans: [{ input: game.input, side: 0 }], cheats: { freezeClock: true }, draws: 'allowed', noVar: true },
    drill: id, back, label: 'TRAINING', onEnd: () => {} });
};
class DrillRunner {
  constructor(cur, id, back) {
    this.cur = cur; this.m = cur.m; this.id = id; this.def = EF.get('drill', id); this.back = back; this.run = { step: 0, count: 0, of: 0 }; this.phase = 'say'; this.t = 0;
    this.talk = new E.Dialog(game, { lines: 3, speed: 34, border: '#ffc83a', bg: '#0d1430' });
    const m = this.m; m.cheats.freezeClock = true; m.eventOn = false; m.o.noReplay = true;
    m.script = (f, dt) => this.def.script ? this.def.script(m, f, this.run) : null;
    m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; }
    try { this.def.setup(m, this.run); } catch (e) { game.fail('drill setup ' + id, e); }
    this.unsub = EF.bus.on('*', ev => { if (ev.match === m) this.on(ev); });
    this.begin();
  }
  dispose() { if (this.unsub) this.unsub(); }
  get st() { return this.def.steps[this.run.step]; }
  say(lines, done) { const who = this.def.coach; this.talk.say(lines, { name: EF.Cast.name(who), portrait: EF.Cast.rig(who === 'okafor' ? 'kipperton:okafor' : who), portraitSize: 40, portraitOpts: { zoom: 2.6, turn: .35 }, voice: EF.babble.voiceFor(who), onDone: done }); }
  begin() {
    const st = this.st, run = this.run; run.count = 0; run.of = st.goal ? st.goal.count : 0; this.phase = 'say';
    try { if (st.setup) st.setup(this.m, run); else if (run.reset) run.reset(this.run.step === 0); } catch (e) { game.fail('drill step', e); }
    this.say(st.say, () => { this.phase = 'run'; this.t = 0; game.input.consumeAll(); });
  }
  on(ev) {
    if (this.phase !== 'run') return;
    const st = this.st, g = st.goal;
    if (st.fail && ev.type === st.fail.event && st.fail.where(ev)) { this.run.count = 0; EF.toast('NO FOULS! START AGAIN', { sound: 'buzz' }); return; }
    if (g && ev.type === g.event && safeWhen(() => g.where(ev, this.m, this.run), null, null)) { this.run.count++; EF.sfx('coin'); if (this.run.count >= g.count) this.stepDone(); }
  }
  stepDone() {
    this.phase = 'done'; EF.sfx('perfect'); EF.toast('NICE ONE!', { sound: null }); this.run.step++;
    if (this.run.step >= this.def.steps.length) { EF.Save.drill(this.id); EF.music('victory'); const last = this.def.steps[this.def.steps.length - 1]; this.say([last.done || 'That is the drill done. Champion stuff.'], () => this.exit(true)); return; }
    this.m.ballClearT = 0; game.after(.8, () => this.begin());
  }
  exit() { const b = this.back; game.go('training', { focus: EF.DRILLS.indexOf(this.id), back: b }); }
  /** true while the coach talks (the match waits) */
  update(dt) {
    this.t += dt;
    if (this.talk.open) { this.talk.update(dt); return true; }
    if (this.phase !== 'run') return false;
    const m = this.m, st = this.st, run = this.run;
    if (st.test && safeWhen(() => st.test(m, run), null, null)) return this.stepDone(), false;
    if (this.def.tick) this.def.tick(m, run, dt);
    // a goal or the ball out: reset the drill's situation rather than restart a match
    const resetNeeded = (m.mode === 'goal' && m.modeT > 1) || m.mode === 'celebrate' || m.mode === 'card' || ((m.mode === 'setpiece' || m.mode === 'kickoff') && !st.retry && m.setpiece && (m.setpiece.kind === 'goalkick' || m.setpiece.kind === 'throwback' || m.setpiece.kind === 'kickoff' || (m.setpiece.kind === 'corner' && this.id !== 'setpieces') || (m.setpiece.kind === 'freekick' && this.id === 'theatrics')));
    if (resetNeeded) { m.endCelebration(); m.setpiece = null; m.setMode('play'); m.pendingCards = []; for (const f of m.players) { f.order = null; f.frozen = false; f.setState('run'); f.tilt = null; } if (st.retry) st.retry(m, run); else if (run.reset) run.reset(this.def.id === 'air'); }
    else if (st.retry && m.mode === 'play' && !m.owner && m.ball.speed() < 5 && !m.ball.held && (this.idle = (this.idle || 0) + dt) > 2.5) { this.idle = 0; st.retry(m, run); }
    else if (m.mode === 'play' && !m.owner && m.ball.speed() < 3 && !st.retry && run.reset && (this.idle = (this.idle || 0) + dt) > 3) { this.idle = 0; run.reset(this.def.id === 'air'); }
    if (m.owner) this.idle = 0;
    if (st.skippable && game.input.pressed('through')) this.stepDone();
    return false;
  }
  draw(r) {
    const st = this.st;
    r.overlay(g => {
      const [mx, my] = EF.HUD.margin(r), w = Math.min(r.W - 2 * mx, 300), x = Math.round(r.W / 2 - w / 2);
      E.ui.box(g, x, my, w, 30, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .92 });
      E.font.text(g, 'DRILL ' + this.def.n + ': ' + this.def.title, r.W / 2, my + 4, '#ffc83a', { align: 'center', outline: false });
      if (st) { const of = this.run.of, c = this.run.count; E.font.text(g, 'STEP ' + (this.run.step + 1) + '/' + this.def.steps.length + (of ? '   ' + Math.min(c, of) + ' / ' + of : '') + (st.hint ? '   ' + st.hint : ''), r.W / 2, my + 17, '#ffffff', { align: 'center', font: (st.hint || '').length > 20 ? 'tiny' : 'normal', outline: false }); if (st.skippable) EF.prompts(g, r.W / 2, my + 34, [['through', 'SKIP BONUS']], { input: game.input }); }
    });
    if (this.run.cones) for (const c of this.run.cones) r.queue(c.x, c.y, 0, g => { const p = r.w(c.x, c.y, 0); px.poly(g, [[p[0], p[1] - 9], [p[0] + 4, p[1]], [p[0] - 4, p[1]]], c.hit ? '#7aff9a' : '#ff7a1a'); px.rect(g, p[0] - 2, p[1] - 5, 4, 1, '#ffffff'); });
    this.talk.draw(r);
  }
}
EF.DrillRunner = DrillRunner;
/* the match scene runs a drill when it is given one */
const _mEnter = EF.scenes.match.enter, _mUpdate = EF.scenes.match.update, _mDraw = EF.scenes.match.draw, _mExit = EF.scenes.match.exit;
EF.scenes.match.enter = function (d) { _mEnter.call(this, d); if (d && d.drill && EF.cur) EF.cur.drill = new DrillRunner(EF.cur, d.drill, d.back); };
EF.scenes.match.update = function (dt) { const c = EF.cur; if (c && c.drill && c.drill.update(dt)) { c.view.update(dt * 0, c.src); EF.Camera.update(dt, c.m, c.src); return; } _mUpdate.call(this, dt); };
EF.scenes.match.draw = function (r) { _mDraw.call(this, r); const c = EF.cur; if (c && c.drill) c.drill.draw(r); EF.drawToasts(r, 1 / 60); };
EF.scenes.match.exit = function () { const c = EF.cur; if (c && c.drill) c.drill.dispose(); _mExit.call(this); };
/* ==== src/40-attract.js ==== */
/* THE ATTRACT MODE (section 6.29): after 10 s without input on the title or a menu, a looping AI showcase that cheats
 * freely: MATCHDAY LIVE (Europhoria, a super strike, the Save Duel, a goal, a celebration, the replay), SET-PIECE
 * SPECIAL (a corner and a bicycle kick), THE DARK ARTS (a dive, a penalty, VAR, a booking), SHOOTOUT (with a Panenka),
 * WEATHER REPORT (rain, snow, fog and flares, fireworks), TITLE CARD. Any input goes back to the title. */
EF.Attract = {
  idle: 0, segment: null, poked: false, lastPtr: null, loops: 0,
  reset() { this.idle = 0; this.poked = false; },
  /** any input at all: a key, the mouse, a click, the wheel, a touch, a pad's button or stick */
  input() {
    if (this.poked) { this.poked = false; return true; }
    for (const I of game.players) { if (I.anyPressed && I.anyPressed()) return true; const mv = I.move ? I.move() : [0, 0]; if (Math.hypot(mv[0], mv[1]) > .3) return true; for (const a of ['confirm', 'cancel', 'start', 'pass', 'shoot', 'up', 'down', 'left', 'right']) if (I.down(a)) return true; }
    const I = game.input, p = I.pointer && I.pointer(); if (p && this.lastPtr && Math.abs(p[0] - this.lastPtr[0]) + Math.abs(p[1] - this.lastPtr[1]) > 4) { this.lastPtr = p.slice(); return true; } this.lastPtr = p ? p.slice() : null;
    if (I.clicked && I.clicked()) return true;
    try { for (const pad of navigator.getGamepads ? navigator.getGamepads() : []) if (pad && (pad.buttons.some(b => b.pressed) || pad.axes.some(a => Math.abs(a) > .3))) return true; } catch (e) { /* none */ }
    return false;
  },
  /** on the title and menus: count the idle time, start the attract mode at 10 s */
  watch(dt, on) {
    if (EF.inSession || !on || game.paused || (EF.Dev && EF.Dev.isOpen)) { this.idle = 0; return; }
    if (this.input()) { this.idle = 0; return; }
    this.idle += dt;
    if (this.idle >= 10) { this.idle = 0; game.go('attract', {}); }
  }
};
if (typeof addEventListener === 'function') for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { EF.Attract.poked = true; }, { capture: true, passive: true });
const SEGMENTS = [
  { id: 'live', title: 'MATCHDAY LIVE', dur: 30 }, { id: 'setpiece', title: 'SET-PIECE SPECIAL', dur: 15 }, { id: 'dark', title: 'THE DARK ARTS', dur: 15 },
  { id: 'shootout', title: 'SHOOTOUT', dur: 15 }, { id: 'weather', title: 'WEATHER REPORT', dur: 10 }, { id: 'card', title: 'EUROPHORIA FOOTBALL', dur: 5 }
];
EF.scenes.attract = Object.assign(EF.sceneBase(), {
  enter() { this.seg = -1; this.t = 0; EF.Attract.loops = (EF.Attract.loops || 0); this.next(); game.input.consumeAll(); EF.Attract.poked = false; EF.Attract.lastPtr = null; },
  exit() { if (EF.cur) EF.scenes.match.exit(); EF.Attract.segment = null; },
  /** start a match for a segment, cheating */
  match(o, sub) {
    if (EF.cur) EF.scenes.match.exit();
    const opts = Object.assign({ kind: 'attract', seed: 1000 + this.seg * 7 + EF.Attract.loops, halfLength: 120, humans: [], cheats: { stamina0: true, stamina1: true }, draws: 'allowed' }, o);
    EF.scenes.match.enter({ opts, attract: true, label: sub, onEnd: () => {} });
    EF.cur.m.o.noReplay = false; game.setView('broadcast');
    return EF.cur.m;
  },
  next() {
    this.seg = (this.seg + 1) % SEGMENTS.length; if (this.seg === 0) EF.Attract.loops++;
    const S = SEGMENTS[this.seg]; this.t = 0; this.st = {}; EF.Attract.segment = S.id;
    const stads = EF.CUP_STADIUMS, L = EF.Attract.loops;
    if (S.id === 'live') { const sd = stads[L % 5], opp = ['hoofington', 'pasapasa', 'stahlpresse', 'lucchetto', 'opulence'][L % 5]; const m = this.match({ home: 'kipperton', away: opp, stadium: sd }); m.attractDuel = true; m.attractSave = 0; }
    else if (S.id === 'setpiece') { const m = this.match({ home: 'kipperton', away: 'stahlpresse', stadium: 'stahlpresse' }); m.cheats.nokeeper1 = true; }
    else if (S.id === 'dark') { const m = this.match({ home: 'lucchetto', away: 'kipperton', stadium: 'lucchetto', referee: 'severo' }); m.cheats.nokeeper1 = true; m.forceVar = 'stand'; }
    else if (S.id === 'shootout') { const m = this.match({ home: 'kipperton', away: 'opulence', stadium: 'euphorium', shootoutOnly: true }); m.forcePanenka = true; }
    else if (S.id === 'weather') { this.weatherCut(0); }
    else { if (EF.cur) EF.scenes.match.exit(); EF.Stage.enter(); EF.music('anthem'); }
  },
  weatherCut(i) {
    this.st.cut = i; this.st.cutT = 0;
    const C = [{ stadium: 'smokehouse', time: 'night' }, { stadium: 'stahlpresse' }, { stadium: 'lucchetto', time: 'night' }, { stadium: 'euphorium' }][i];
    const m = this.match(Object.assign({ home: 'kipperton', away: ['hoofington', 'stahlpresse', 'lucchetto', 'opulence'][i] }, C), ['RAIN AT THE SMOKEHOUSE', 'SNOW AND THE ORANGE BALL', 'FOG AND FLARES', 'FIREWORKS IN THE EUPHORIUM'][i]);
    m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; }
    if (i === 2) { m.fog = .6; m.fogTarget = .6; m.euphoria[0] = 100; m.triggerEuphoria(0); m.startEvent('flaresmoke'); }
    if (i === 3) EF.cur.view.fireworks(6);
    m.setOwner(m.side[0][4], 'attract');
  },
  update(dt) {
    if (EF.Attract.input() || (EF.touchOnly() && game.input.clicked && game.input.clicked())) { game.input.consumeAll(); EF.Attract.idle = 0; game.timeScale = 1; game.go('title', { menu: !EF.touchOnly(), focus: 0, press: EF.touchOnly() }); return; }
    const S = SEGMENTS[this.seg]; this.t += dt;
    if (S.id === 'card') { EF.Stage.update(dt); if (this.t > S.dur) this.next(); return; }
    const c = EF.cur; if (!c) return;
    EF.scenes.match.update(dt);
    const m = c.m, st = this.st;
    if (S.id === 'live') {
      if (!st.given && this.t > .8 && m.mode === 'kickoff') { m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; } }
      if (!st.given && this.t > 1.2) { st.given = true; const cap = m.side[0].find(f => f.data.captain); cap.body.x = m.goalX(0) - m.dir(0) * 230; cap.body.y = P.CY + 20; cap.facing = m.dir(0) > 0 ? 0 : Math.PI; m.setOwner(cap, 'attract'); m.euphoria[0] = 100; st.cap = cap; }
      if (st.given && !st.eu && this.t > 2) { st.eu = m.triggerEuphoria(0, st.cap); }
      if (st.eu && !st.shot && this.t > 2.8 && m.owner === st.cap) { st.shot = true; m.script = (f) => { if (f === st.cap && m.owner === f && !m.superUsed) { const it = EF.Intent.make(); it.shoot.down = true; it.power = .97; return it; } return null; }; }
    } else if (S.id === 'setpiece') {
      if (!st.corner && this.t > 1) { st.corner = true; m.setpiece = null; m.startSetpiece('corner', 0, { gx: m.goalX(0), y: P.Y0 }); }
      const b = m.ball;
      if (st.corner && !st.bike && b.pass && b.pass.kind === 'cross' && b.vz < 0 && b.z < 50) {
        const land = b.pass.land || [b.x, b.y], f = m.outfield(0).filter(q => q !== m.lastKick).sort((p, q) => H.d2(p.body.x, p.body.y, land[0], land[1]) - H.d2(q.body.x, q.body.y, land[0], land[1]))[0];
        const w = f && f.airWindow(); if (w) { st.bike = true; f.facing = Math.atan2(P.CY - f.body.y, m.goalX(0) - f.body.x) + Math.PI; const it = EF.Intent.make(); f.airMove(w, 'finish', it); f.air.kind = 'bicycle'; m.slow(.35, .6); m.emit('air', { who: f, kind: 'bicycle' }); }
      }
    } else if (S.id === 'dark') {
      if (!st.dive && this.t > 1) {
        st.dive = true; m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; }
        const fallo = m.side[0].find(f => f.data.id === 'fallo'), d = m.outfield(1)[0], gx = m.goalX(0);
        fallo.body.x = gx - m.dir(0) * 70; fallo.body.y = P.CY - 20; fallo.facing = m.dir(0) > 0 ? 0 : Math.PI; d.body.x = fallo.body.x - m.dir(0) * 6; d.body.y = fallo.body.y + 3;
        m.setOwner(fallo, 'attract'); m.ref.data = Object.assign({}, m.ref.data, { gullibility: 1, varHappy: 1 }); st.fallo = fallo; st.def = d; st.diveAt = this.t + .6;
      }
      if (st.diveAt && this.t > st.diveAt && st.fallo.state === 'run') { st.diveAt = null; st.fallo.contactT = m.t; st.fallo.contactBy = st.def; st.fallo.theatrics(); }
      if (!st.sim && this.t > 11) { st.sim = true; m.setpiece = null; m.setMode('play'); m.pendingCards = []; for (const f of m.players) { f.order = null; f.frozen = false; f.setState('run'); } const x = m.side[0][3]; x.body.x = P.CX; x.body.y = P.CY + 100; for (const o of m.side[1]) if (H.d(o.body, x.body) < 40) o.body.x += 80; m.setOwner(x, 'attract'); game.after(.5, () => { if (EF.cur && EF.cur.m === m) x.theatrics(); }); }
    } else if (S.id === 'weather') {
      st.cutT += dt; if (st.cutT > 2.5 && st.cut < 3) this.weatherCut(st.cut + 1);
    }
    if (this.t > S.dur) this.next();
  },
  draw(r) {
    const S = SEGMENTS[this.seg];
    if (S.id === 'card') {
      EF.Stage.draw(r, { dim: .3 });
      r.overlay(g => { E.font.title(g, 'EUROPHORIA', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffc83a', '#e0662a'], depth: 3 }); E.font.title(g, 'FOOTBALL', r.W / 2, Math.round(r.H * .2) + 40, { align: 'center', scale: 3, colors: ['#ffffff', '#c8d8ff', '#6a8aff'], depth: 2 }); if (Math.floor(game.real * 2) % 2) EF.prompts(g, r.W / 2, Math.round(r.H * .62), [['start', 'PRESS START']], { input: game.input, scale: 2 }); const rec = EF.Save.data().records; E.font.text(g, rec.fastestCup ? 'FASTEST CUP: ' + H.mmss(rec.fastestCup) : 'FASTEST CUP: NOT YET WON', r.W / 2, Math.round(r.H * .74), '#ffe08a', { align: 'center', outline: '#000' }); E.font.text(g, rec.biggestWin ? 'BIGGEST WIN: ' + rec.biggestWin.score.join('-') + ' V ' + EF.get('team', rec.biggestWin.opp).short : 'BIGGEST WIN: -', r.W / 2, Math.round(r.H * .74) + 11, '#ffe08a', { align: 'center', outline: '#000' }); });
    } else if (EF.cur) EF.scenes.match.draw(r);
    r.overlay(g => {
      const y = r.H - Math.max(5, Math.round(r.H * .035)) - 14, w = Math.min(r.W - 20, 260);
      E.ui.box(g, Math.round(r.W / 2 - w / 2), y - 4, w, 18, { bg: '#0a0c18', border: '#ffc83a', alpha: .85 });
      if (Math.floor(game.real * 1.5) % 2) E.font.text(g, EF.touchOnly() ? 'DEMO  -  TAP FOR THE TITLE' : 'DEMO  -  PRESS ANY BUTTON', r.W / 2, y + 1, '#ffffff', { align: 'center', outline: false });
      if (S.id !== 'card') E.font.title(g, S.title, r.W / 2, Math.round(r.H * .14), { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'], depth: 1 });
      if (S.id === 'weather' && EF.cur && EF.cur.label) E.font.text(g, EF.cur.label, r.W / 2, Math.round(r.H * .14) + 20, '#c8d0e8', { align: 'center', outline: '#000' });
    });
  }
});
/* the attract match: a scripted Save Duel with nobody pressing (it fails), forced VAR and Panenka, a beaten keeper */
EF.attractOverlay = null;
/* ==== src/41-devmode.js ==== */
/* DEV MODE (section 6.30): from the pause menu, ` or F1 in any scene, or ?dev=1; never in AI Hub sessions. A drawer on
 * the right with four tabs: TUNE (every EF.T slider, its default, reset one or all, kept until reset), CHEATS, WARP
 * (every deep link, triggers, the animation gallery and the sound test) and INFO. The match plays on behind it with the
 * humans' footballers given to the CPU; FREEZE stops it. */
const DEV = EF.Dev = {
  isOpen: false, tab: 0, focus: 0, scroll: 0, frozenOn: false, step: false, confirmReset: false, show: { hit: false, ai: false, path: false, bones: false }, t: 0,
  TABS: ['TUNE', 'CHEATS', 'WARP', 'INFO'],
  open(fromPause) { if (EF.inSession) return; if (fromPause && game.paused) game.resume(); this.isOpen = true; this.focus = 0; this.scroll = 0; game.input.consumeAll(); EF.sfx('confirm'); },
  close() { this.isOpen = false; this.confirmReset = false; game.input.consumeAll(); EF.sfx('cancel'); },
  takesInput() { return this.isOpen; },
  frozen() { if (this.step) { this.step = false; return false; } return this.frozenOn; },
  m() { return EF.cur && EF.cur.m; },
  rows() {
    const m = this.m(), T = this.tab, R = [];
    if (T === 0) {
      R.push({ kind: 'button', label: 'RESET ALL TO DEFAULTS', run: () => { EF.tuneReset(); EF.toast('TUNING RESET', { sound: 'confirm' }); } });
      let grp = null;
      for (const row of EF.TUNE) { if (row[5] !== grp) { grp = row[5]; R.push({ kind: 'head', label: grp.toUpperCase() }); } R.push({ kind: 'slider', key: row[0], label: row[0], min: row[2], max: row[3], step: row[4], def: row[1], help: row[6] }); }
    } else if (T === 1) {
      const ch = (label, key) => R.push({ kind: 'toggle', label, get: () => !!(m && m.cheats[key]), set: v => { if (m) m.cheats[key] = v; } });
      R.push({ kind: 'toggle', label: 'FREEZE THE MATCH', get: () => this.frozenOn, set: v => { this.frozenOn = v; } });
      R.push({ kind: 'button', label: 'STEP ONE FRAME (FROZEN)', run: () => { this.step = true; } });
      ch('INFINITE STAMINA: HOME', 'stamina0'); ch('INFINITE STAMINA: AWAY', 'stamina1'); ch('EUPHORIA ALWAYS FULL: HOME', 'euphoria0'); ch('EUPHORIA ALWAYS FULL: AWAY', 'euphoria1');
      ch('INVINCIBLE KEEPER: HOME', 'keeper0'); ch('INVINCIBLE KEEPER: AWAY', 'keeper1'); ch('WATCH MODE (CPU PLAYS ALL)', 'watch'); ch('FREEZE THE CLOCK', 'freezeClock');
      R.push({ kind: 'toggle', label: 'PURE FOOTBALL (NO OTT)', get: () => !!(m && m.pure), set: v => { if (m) { m.pure = v; m.eventOn = !v; if (v) { m.europhoria = null; m.euphoria = [0, 0]; } } } });
      R.push({ kind: 'button', label: 'A GOAL FOR HOME', run: () => m && this.goal(0) }); R.push({ kind: 'button', label: 'A GOAL FOR AWAY', run: () => m && this.goal(1) });
      R.push({ kind: 'button', label: "CLOCK TO 44'", run: () => { if (m) { m.half = 1; m.clock = m.halfLen * 43.5 / 45; } } }); R.push({ kind: 'button', label: "CLOCK TO 89'", run: () => { if (m) { if (m.half === 1) { m.half = 2; } m.clock = m.halfLen * 43.5 / 45; } } });
      R.push({ kind: 'toggle', label: 'SLOW MOTION 0.25X', get: () => EF.T.gameSpeed === .25, set: v => EF.tuneSet('gameSpeed', v ? .25 : 1) });
      R.push({ kind: 'toggle', label: 'SHOW HITBOXES', get: () => this.show.hit, set: v => { this.show.hit = v; } }); R.push({ kind: 'toggle', label: 'SHOW THE AI', get: () => this.show.ai, set: v => { this.show.ai = v; } });
      R.push({ kind: 'toggle', label: 'SHOW BALL PATH + AIR WINDOW', get: () => this.show.path, set: v => { this.show.path = v; } }); R.push({ kind: 'toggle', label: 'SHOW SKELETONS', get: () => this.show.bones, set: v => { this.show.bones = v; } });
      R.push({ kind: 'toggle', label: 'MUTE THE CROWD', get: () => !!EF.mutedCrowd, set: v => { EF.mutedCrowd = v; } });
    } else if (T === 2) {
      const go = (label, fn) => R.push({ kind: 'button', label, run: () => { this.close(); fn(); } });
      R.push({ kind: 'head', label: 'SCENES' });
      for (const l of ['title', 'attract', 'setup', 'match', 'cup', 'ending', 'album', 'about', 'training']) go('#' + l, () => EF.go('#' + l));
      R.push({ kind: 'head', label: 'MATCH PARTS' });
      for (const s of EF.CUP_STADIUMS) go('#match/' + s, () => EF.go('#match/' + s));
      for (const p of ['corner', 'freekick', 'penalty', 'shootout', 'super', 'duel', 'halftime', 'extratime', 'results']) go('#match/' + p, () => EF.go('#match/' + p));
      R.push({ kind: 'head', label: 'CUP ROUNDS' });
      for (let i = 1; i <= 5; i++) go('#cup/r' + i + ' (PRE-MATCH)', () => EF.go('#cup/r' + i));
      R.push({ kind: 'head', label: 'TRIGGER NOW (IN A MATCH)' });
      const trig = (label, fn) => R.push({ kind: 'button', label, run: () => { const mm = this.m(); if (!mm) return EF.toast('START A MATCH FIRST', { sound: 'cancel' }); this.close(); fn(mm); } });
      trig('A CORNER', mm => mm.restart('corner', 0, { gx: mm.goalX(0), y: P.Y0 }));
      trig('A FREE KICK', mm => mm.restart('freekick', 0, { x: mm.goalX(0) - mm.dir(0) * 190, y: P.CY + 30 }));
      trig('A PENALTY', mm => mm.restart('penalty', 0, {}));
      trig('A SUPER STRIKE', mm => EF.parts.super(mm)); trig('A SAVE DUEL', mm => EF.parts.duel(mm));
      trig('A FOUL: YELLOW', mm => { const a = mm.outfield(1)[0], v = mm.outfield(0)[0]; mm.foul(a, v, 1.6, { sev: 1.2, kind: 'slide' }); });
      trig('A FOUL: RED', mm => { const a = mm.outfield(1)[0], v = mm.outfield(0)[0]; mm.foul(a, v, 3, { sev: 2, kind: 'slide' }); });
      trig('A DIVE', mm => { const f = mm.outfield(1)[1]; mm.setOwner(f, 'dev'); f.theatrics(); });
      trig('VAR', mm => mm.startVar({ kind: 'penalty', foul: { sev: .6, x: mm.goalX(0) - mm.dir(0) * 40, y: P.CY }, side: 0 }));
      trig('A REPLAY OF THE LAST GOAL', mm => { if (mm.lastGoal) { mm.setMode('replay'); } else EF.toast('NO GOAL YET', { sound: 'cancel' }); });
      for (const ev of EF.all('event')) trig('EVENT: ' + ev.name, mm => { if (ev.id === 'fireworks') EF.cur.view.fireworks(5); else mm.startEvent(ev.id); });
      for (const c of EF.all('celebration')) trig('CELEBRATION: ' + c.name, mm => { const f = mm.outfield(0)[0]; mm.setMode('celebrate'); mm.startCelebration(f); mm.celebration.pick = c; mm.celebration.human = null; mm.celebration.playT = 0; f.clip = c.clip ? { name: c.clip, t: 0, w: 1, speed: c.speed || 1 } : null; f.proc = c.proc || null; mm.lastGoal = mm.lastGoal || { side: 0, t: mm.t }; });
      R.push({ kind: 'head', label: 'GALLERIES' });
      go('ANIMATION GALLERY', () => game.go('devanim', { move: 'pass' })); go('SOUND TEST', () => game.go('soundtest', {}));
      R.push({ kind: 'head', label: 'SAVE' });
      R.push({ kind: 'button', label: 'UNLOCK EVERYTHING', run: () => { if (!this.confirmReset) { this.confirmReset = 'unlock'; EF.toast('PRESS AGAIN TO CONFIRM', { sound: 'cancel' }); return; } this.confirmReset = false; const d = EF.Save.data(); for (const s of EF.all('sticker')) d.stickers[s.id] = s.shiny ? 'shiny' : true; d.unlocks.balls = Object.keys(EF.BALLS); for (const id of EF.DRILLS) d.drills[id] = true; if (!d.cup) EF.Cup.start(); d.cup.prologue = true; EF.Save.write(); EF.toast('EVERYTHING UNLOCKED', { sound: 'confirm' }); } });
      R.push({ kind: 'button', label: 'RESET THE SAVE', run: () => { if (this.confirmReset !== 'reset') { this.confirmReset = 'reset'; EF.toast('PRESS AGAIN TO CONFIRM', { sound: 'cancel' }); return; } this.confirmReset = false; EF.Save.reset(); EF.toast('SAVE RESET', { sound: 'confirm' }); } });
    } else {
      const snap = game.debug.snapshot(), add = (k, v) => R.push({ kind: 'info', label: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) });
      add('VERSION', 'EUROPHORIA ' + EF.version + ' / ' + E.versionLabel().replace(/·/g, '-')); add('SCENE', snap.scene); if (m) { add('SEED', m.seed); add('MODE', m.mode + ' (HALF ' + m.half + ', ' + m.clockText + ')'); add('BODIES', m.players.length + 1 + ' + BALL'); add('FANS', EF.cur.view.crowd.fans.length); add('STADIUM', m.stadium.id); }
      add('PARTICLES', game.particles.list ? game.particles.list.length : '-'); add('LIGHTS', game.lights.list ? game.lights.list.length : '-'); add('FRAME', game.stats ? JSON.stringify(game.stats).slice(0, 60) : '-'); add('HUB', EF.inSession ? 'SESSION' : 'NONE');
      for (const k of Object.keys(snap)) if (!['scene'].includes(k)) add(k.toUpperCase(), snap[k]);
    }
    return R;
  },
  goal(s) { const m = this.m(); if (!m || (m.mode !== 'play' && m.mode !== 'setpiece' && m.mode !== 'kickoff')) return; m.lastKick = m.outfield(s)[0]; m.lastTouch = m.lastKick; m.goalScored(s); },
  update(dt) {
    this.t += dt;
    const I = game.input;
    if (!EF.inSession && (I.pressed('dev'))) { if (this.isOpen) this.close(); else this.open(); return; }
    if (!this.isOpen) return;
    const R = this.rows(), sel = () => R[this.focus];
    const skip = d => { let i = this.focus; for (let k = 0; k < R.length; k++) { i = (i + d + R.length) % R.length; if (R[i].kind !== 'head') { this.focus = i; return; } } };
    if (R[this.focus] && R[this.focus].kind === 'head') skip(1);
    if (I.pressed('switch') || I.pressed('skill')) { this.tab = (this.tab + (I.pressed('switch') ? 3 : 1)) % 4; this.focus = 0; this.scroll = 0; EF.sfx('select'); return; }
    if (I.repeat('up', .3, .06)) skip(-1); if (I.repeat('down', .3, .06)) skip(1);
    const r = sel(); if (!r) return;
    const held = Math.max(I.heldTime ? I.heldTime('left') : 0, I.heldTime ? I.heldTime('right') : 0);
    if (r.kind === 'slider' && (I.repeat('left', .25, .04) || I.repeat('right', .25, .04))) { const d = I.down('left') ? -1 : 1, acc = held > 1.2 ? 5 : 1; EF.tuneSet(r.key, EF.T[r.key] + d * r.step * acc); }
    if (r.kind === 'slider' && I.pressed('shoot')) { EF.tuneReset(r.key); EF.sfx('select'); }
    if (I.pressed('confirm') || I.pressed('pass')) { if (r.kind === 'button') r.run(); else if (r.kind === 'toggle') r.set(!r.get()); }
    if (I.pressed('cancel')) this.close();
    // the mouse: hover moves the focus, a click toggles or runs, a drag sets a slider
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked(), L = this.layout;
    if (L && p && p[0] >= L.x) { const i = Math.floor((p[1] - L.y0) / L.rh) + this.scroll; if (i >= 0 && i < R.length && R[i].kind !== 'head') this.focus = i; }
    if (L && c && c[0] >= L.x) {
      if (c[1] < L.y0) { const t = Math.floor((c[0] - L.x) / (L.w / 4)); this.tab = clamp(t, 0, 3); this.focus = 0; this.scroll = 0; }
      else { const i = Math.floor((c[1] - L.y0) / L.rh) + this.scroll, rr = R[i]; if (rr) { this.focus = i; if (rr.kind === 'button') rr.run(); else if (rr.kind === 'toggle') rr.set(!rr.get()); else if (rr.kind === 'slider') { const u = clamp((c[0] - L.sx) / L.sw, 0, 1); EF.tuneSet(rr.key, rr.min + u * (rr.max - rr.min)); } } }
    }
    const vis = L ? L.n : 12; if (this.focus < this.scroll) this.scroll = this.focus; if (this.focus >= this.scroll + vis) this.scroll = this.focus - vis + 1;
  },
  draw(r) {
    this.world(r);
    if (!this.isOpen) return;
    const R = this.rows();
    r.overlay(g => {
      const w = Math.max(170, Math.round(r.W * .42)), x = r.W - w, rh = 11, y0 = 22, n = Math.floor((r.H - y0 - 14) / rh);
      this.layout = { x, w, y0, rh, n, sx: x + Math.round(w * .5), sw: Math.round(w * .3) };
      px.blend(g, .9, 'normal', () => px.rect(g, x, 0, w, r.H, '#0a0e20')); px.rect(g, x, 0, 1, r.H, '#ffc83a');
      this.TABS.forEach((t, i) => { const tx = x + i * w / 4; px.rect(g, tx + 1, 2, w / 4 - 2, 14, i === this.tab ? '#ffc83a' : '#1c2448'); E.font.text(g, t, tx + w / 8, 5, i === this.tab ? '#0a0e20' : '#c8d0e8', { align: 'center', font: 'tiny', outline: false }); });
      for (let k = 0; k < n; k++) {
        const i = k + this.scroll, row = R[i]; if (!row) break; const y = y0 + k * rh, foc = i === this.focus;
        if (foc) px.rect(g, x + 2, y - 1, w - 4, rh, '#24305c');
        if (row.kind === 'head') { E.font.text(g, row.label, x + 6, y + 1, '#ffc83a', { font: 'tiny', outline: false }); continue; }
        E.font.text(g, row.label.length > 26 ? row.label.slice(0, 26) : row.label, x + 6, y + 1, foc ? '#ffffff' : '#c8d0e8', { font: row.kind === 'info' || row.kind === 'slider' ? 'tiny' : 'tiny', outline: false });
        if (row.kind === 'slider') { const v = EF.T[row.key], u = (v - row.min) / (row.max - row.min), sx = this.layout.sx, sw = this.layout.sw; px.rect(g, sx, y + 3, sw, 3, '#1a1a2a'); px.rect(g, sx, y + 3, Math.round(sw * u), 3, EF.tuneChanged(row.key) ? '#ff9a3a' : '#7a86c8'); px.rect(g, sx + Math.round(sw * row.def - sw * row.min) / (row.max - row.min) * 0, y + 2, 1, 5, '#ffffff'); E.font.text(g, String(+v.toFixed(3)) + (EF.tuneChanged(row.key) ? ' *' : ''), x + w - 4, y + 1, '#ffe08a', { align: 'right', font: 'tiny', outline: false }); const dx = sx + Math.round((row.def - row.min) / (row.max - row.min) * sw); px.rect(g, dx, y + 1, 1, 7, '#5aff7a'); }
        else if (row.kind === 'toggle') E.font.text(g, row.get() ? 'ON' : 'OFF', x + w - 6, y + 1, row.get() ? '#5aff7a' : '#7a7a8a', { align: 'right', font: 'tiny', outline: false });
        else if (row.kind === 'info') E.font.text(g, row.value.slice(0, 48), x + Math.round(w * .34), y + 1, '#ffe08a', { font: 'tiny', outline: false });
      }
      const foc = R[this.focus], help = foc && foc.help ? foc.help : foc && foc.kind === 'slider' ? '' : '';
      px.rect(g, x, r.H - 12, w, 12, '#141a34'); E.font.text(g, help || 'L1/R1 TABS   ↑↓ ROW   ←→ CHANGE   ✕ RUN   □ RESET   ○ CLOSE'.replace(/✕/g, 'X').replace(/□/g, 'SQ').replace(/○/g, 'O'), x + 4, r.H - 9, '#9aa6c8', { font: 'tiny', outline: false });
    });
  },
  /** the debug views over a match: hitboxes, the AI's spots and decisions, the ball's path, skeletons */
  world(r) {
    const c = EF.cur; if (!c || !(this.show.hit || this.show.ai || this.show.path || this.show.bones)) return;
    const m = c.m;
    if (this.show.hit) for (const f of m.players) { if (f.ghost) continue; r.decal(() => r.groundRing(f.body.x, f.body.y, f.body.r, f.side ? '#ff5a5a' : '#5aa0ff', 1)); if (f.state === 'slide') { const B = f.body; r.queue(B.x, B.y, 2, g => { const a = r.w(B.x, B.y, 2), b = r.w(B.x + Math.cos(f.facing) * 12, B.y + Math.sin(f.facing) * 12, 2); px.line(g, a[0], a[1], b[0], b[1], '#ff3a3a', 2); }, { emissive: true }); } }
    if (this.show.ai) for (const s of [0, 1]) for (const f of m.outfield(s)) { const sp = m.brains[s].spot(f); r.decal(() => r.groundRing(sp[0], sp[1], 4, s ? '#ffa0a0' : '#a0c0ff', .8)); r.textAt(f.body.x, f.body.y, 46, f.slot + (m.brains[s].pressers.includes(f) ? ' P' : ''), '#ffffff'); }
    if (this.show.ai && m.owner) { const mem = m.brains[m.owner.side].memOf(m.owner); if (mem.plan) r.textAt(m.owner.body.x, m.owner.body.y, 56, mem.plan.kind.toUpperCase(), '#ffe040'); }
    if (this.show.path && !m.owner) { const b = m.ball; r.queue(b.x, b.y, 0, g => { let prev = null; for (let t = 0; t <= 1; t += .05) { const p = b.predict(t), q = r.w(p.x, p.y, p.z); if (prev) px.line(g, prev[0], prev[1], q[0], q[1], p.z >= 4 && p.z <= 40 ? '#5aff7a' : '#ffffff'); prev = q; } }, { emissive: true }); }
    if (this.show.bones) for (const f of m.players) { const rig = c.view.rigOf(f); if (rig && !f.ghost) rig.debug(r); }
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'F1') e.preventDefault(); }, { capture: true });
const _uiUpdate = EF.UI.update.bind(EF.UI);
EF.UI.update = function (dt) { if (DEV.isOpen) return true; return _uiUpdate(dt); };

/* ---- deep links (section 4.4): #scene/part, used by tests, the checker and the WARP tab ---- */
EF.parts = {
  /** nobody of the other side within 70 of the striker: the dev trigger shows its moment every time */
  clear(m, f) { for (const o of m.side[1 - f.side]) { if (o.role === 'GK') continue; const d = H.d(o.body, f.body); if (d < 70) { const a = d > 1 ? H.ang(f.body, o.body) : Math.PI / 2; o.body.x = clamp(f.body.x + Math.cos(a) * 80, P.X0 + 10, P.X1 - 10); o.body.y = clamp(f.body.y + Math.sin(a) * 80, P.Y0 + 10, P.Y1 - 10); o.body.vx = o.body.vy = 0; o.stun = .8; } } },
  super(m) { m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; } const cap = m.side[0].find(f => f.data.captain); cap.body.x = m.goalX(0) - m.dir(0) * 200; cap.body.y = P.CY; cap.facing = m.dir(0) > 0 ? 0 : Math.PI; this.clear(m, cap); m.setOwner(cap, 'dev'); const h = m.humans.find(q => q.side === 0); if (h) m.giveTo(h, cap); m.euphoria[0] = 100; m.triggerEuphoria(0, cap); },
  duel(m) { m.setpiece = null; m.setMode('play'); for (const f of m.players) { f.order = null; f.frozen = false; } const cap = m.side[1].find(f => f.data.captain); cap.body.x = m.goalX(1) - m.dir(1) * 190; cap.body.y = P.CY; cap.facing = m.dir(1) > 0 ? 0 : Math.PI; this.clear(m, cap); m.setOwner(cap, 'dev'); m.euphoria[1] = 100; m.triggerEuphoria(1, cap); m.script = f => f === cap && m.owner === f ? Object.assign(EF.Intent.make(), { shoot: { down: true, pressed: false, released: false }, power: .97 }) : null; }
};
EF.deepLink = L => {
  const s = L.scene, p = L.part;
  const mo = o => ({ opts: Object.assign(EF.defaultMatchOpts(), { humans: [{ input: game.input, side: 0 }] }, o) });
  if (s === 'match') {
    if (p && EF.get('stadium', p)) { const st = EF.get('stadium', p), opp = { smokehouse: 'hoofington', pasapasa: 'pasapasa', stahlpresse: 'stahlpresse', lucchetto: 'lucchetto', euphorium: 'opulence' }[p] || 'hoofington'; return ['match', mo({ stadium: p, away: opp })]; }
    if (p === 'shootout') return ['match', mo({ shootoutOnly: true, kind: 'penalties', stadium: 'euphorium', away: 'opulence' })];
    if (p) { EF.pendingPart = p; return ['match', mo({})]; }
    return ['match', mo({})];
  }
  if (s === 'cup') { if (p) { const i = p === 'final' ? 4 : Math.max(0, +p.replace('r', '') - 1); if (!EF.Save.data().cup) EF.Cup.start(); return ['cup', { round: i, beat: 'r' + (i + 1) + '-pre' }]; } return ['cup', {}]; }
  if (s === 'training') return p && EF.get('drill', p) ? (EF.pendingDrill = p, ['training', {}]) : ['training', {}];
  if (s === 'dev' && p === 'anim') return ['devanim', { move: L.extra || 'pass' }];
  if (s === 'dev' && p === 'sound') return ['soundtest', {}];
  if (s === 'setup') return ['setup', { mode: p === 'penalties' ? 'penalties' : 'kickabout' }];
  if (EF.scenes[s]) return [s, {}];
  return null;
};
EF.go = hash => { const [scene, part, extra] = hash.replace(/^#/, '').split('/'); const r = EF.deepLink({ scene, part, extra }); if (r) game.go(r[0], r[1]); };
/* a match part from a deep link, once the match exists */
const _mEnter2 = EF.scenes.match.enter;
EF.scenes.match.enter = function (d) {
  _mEnter2.call(this, d);
  const p = EF.pendingPart, m = EF.cur && EF.cur.m; EF.pendingPart = null; if (!p || !m) return;
  if (p === 'corner') m.startSetpiece('corner', 0, { gx: m.goalX(0), y: P.Y0 });
  else if (p === 'freekick') m.startSetpiece('freekick', 0, { x: m.goalX(0) - m.dir(0) * 190, y: P.CY + 30 });
  else if (p === 'penalty') m.startSetpiece('penalty', 0, {});
  else if (p === 'super') EF.parts.super(m);
  else if (p === 'duel') EF.parts.duel(m);
  else if (p === 'halftime') { m.clock = m.halfLen * 1.2; m.stoppageShown = true; m.stoppage = 1; m.ball.x = P.CX; m.endHalf(); }
  else if (p === 'extratime') { m.half = 2; m.draws = 'golden'; m.score = [1, 1]; m.endHalf(); }
  else if (p === 'results') { m.score = [2, 1]; m.goals = [{ side: 0, name: 'DAZ PILCHARD', minute: 12 }, { side: 1, name: 'NORMAN NEEDHAM', minute: 40 }, { side: 0, name: 'TOMMY TRAN', minute: 77 }]; m.half = 2; m.fullTime(); }
};
const _tEnter = EF.scenes.training.enter;
EF.scenes.training.enter = function (d) { _tEnter.call(this, d); if (EF.pendingDrill) { const id = EF.pendingDrill; EF.pendingDrill = null; game.after(.05, () => EF.startDrill(id, null)); } };

/* ---- the animation gallery: every move on a loop, on a chosen rig, in every view, at 1x, 0.25x or frame by frame ---- */
const GALLERY = ['pass', 'shot', 'shotHard', 'chip', 'volley', 'header', 'bicycle', 'divingHeader', 'slide', 'poke', 'barge', 'launched', 'getup', 'keeperLow', 'keeperHigh', 'catch', 'parry', 'tip', 'throw', 'theatrics', 'stepover', 'spin', 'rainbow', 'tired', 'refCard', 'refAdvantage', 'refVar', 'refWhistle'].concat(EF.all('celebration').map(c => 'cel:' + c.id));
EF.scenes.devanim = Object.assign(EF.sceneBase(), {
  views: ['broadcast', 'threequarter', 'topdown', 'side', 'iso'],
  enter(d) {
    this.i = Math.max(0, GALLERY.indexOf(d.move)); this.t = 0; this.speed = 1; this.rigI = 0; this.vi = 0;
    this.m = new EF.Match({ home: 'kipperton', away: 'opulence', stadium: 'rec', kind: 'title', seed: 1, halfLength: 999, humans: [], events: false });
    for (const f of this.m.players) f.ghost = true; this.m.ref.body.x = -999;
    this.view = new EF.MatchView(this.m); EF.Stage.enter(); game.setZoom(2.2); game.cam.smooth = 0; EF.music(null);
  },
  exit() { this.view.dispose(); game.setView('broadcast'); },
  update(dt) {
    const I = game.input;
    if (I.pressed('cancel')) return game.go('title', { menu: true });
    if (I.pressed('right')) { this.i = (this.i + 1) % GALLERY.length; this.t = 0; } if (I.pressed('left')) { this.i = (this.i + GALLERY.length - 1) % GALLERY.length; this.t = 0; }
    if (I.pressed('up')) this.rigI = (this.rigI + 1) % 4; if (I.pressed('down')) { this.vi = (this.vi + 1) % this.views.length; game.setView(this.views[this.vi]); }
    if (I.pressed('confirm')) this.speed = this.speed === 1 ? .25 : this.speed === .25 ? 0 : 1;
    if (this.speed === 0 && I.pressed('pass')) this.t += 1 / 30;
    this.t += dt * this.speed;
    const name = GALLERY[this.i], dur = 1.6, u = (this.t % dur) / dur, f = this.m.side[this.rigI === 3 ? 1 : 0][[4, 0, 2, 4][this.rigI]], rig = this.view.rigOf(f);
    f.ghost = true; this.shown = { f, rig };
    const st = EF.galleryState(name, u, this.t), S = Object.assign({ x: P.CX, y: P.CY, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }, st);
    if (st.clip) EF.Anim.sample(rig, { clip: st.clip }); else rig.mocap = null;
    rig.update(dt * Math.max(this.speed, .001), S); if (st.proc) EF.Anim.post(rig, st.proc, this.t);
    this.ball = st.ball || null;
    game.focus(P.CX, P.CY, 12);
  },
  draw(r) {
    r.sky(['#2a3a5a', '#4a6a8a', '#8aa0b0']); this.m.pitch.map.drawFloor(r); this.m.pitch.map.queueWalls(r);
    const s = this.shown; if (s) { r.shadow(P.CX, P.CY, 6, .4); r.actor(P.CX, P.CY, s.rig.z || 0, (g, ox, oy) => s.rig.draw(g, ox, oy, r.view)); if (this.ball) r.sprite(P.CX + this.ball[0], P.CY + this.ball[1], this.ball[2], EF.BALLS.classic.frames[0], { anchor: 'center' }); }
    r.overlay(g => { E.ui.box(g, 6, 6, 220, 30, { bg: '#0d1430', border: '#ffc83a' }); E.font.text(g, 'ANIMATION: ' + GALLERY[this.i].toUpperCase(), 12, 11, '#ffc83a', { outline: false }); E.font.text(g, (this.i + 1) + '/' + GALLERY.length + '  VIEW ' + this.views[this.vi].toUpperCase() + '  SPEED ' + (this.speed || 'STEP'), 12, 22, '#c8d0e8', { font: 'tiny', outline: false }); EF.prompts(g, r.W / 2, r.H - 16, [['left', 'MOVE'], ['up', 'RIG'], ['down', 'VIEW'], ['confirm', 'SPEED'], ['cancel', 'BACK']], { input: game.input }); });
  }
});
/** a gallery move's rig state at u (0..1 of its loop) */
EF.galleryState = (name, u, t) => {
  const kick = n => ({ attack: EF.kickState(n, u * (EF.KICKS[n].total + .3)) });
  if (EF.KICKS[name]) return Object.assign(kick(name), { ball: [6, 0, name === 'header' ? 26 : 2] });
  switch (name) {
    case 'divingHeader': return { tilt: { axis: 'right', angle: Math.min(1, u * 2) * 1.3, pivot: 'hips', lift: 6 * Math.sin(Math.min(1, u * 1.5) * Math.PI) } };
    case 'bicycleKick': return {};
    case 'slide': return { clip: { name: 'Slide_Loop', t: u * 2, w: 1 } };
    case 'barge': return { attack: { spec: { a0: 0, a1: 0, z0: 9, z1: 9, reach: 6, lunge: 4, blade: 0 }, phase: u < .3 ? 'wind' : u < .6 ? 'active' : 'recover', u: u < .3 ? u / .3 : u < .6 ? (u - .3) / .3 : (u - .6) / .4 } };
    case 'launched': return { tilt: { axis: 'forward', angle: u * TAU * 1.5, pivot: 'hips', lift: Math.sin(u * Math.PI) * 18 } };
    case 'getup': return { clip: { name: 'Get_Up_From_Side', t: u * 2, w: 1 } };
    case 'keeperLow': return { pose: 'cheer', tilt: { axis: 'forward', angle: 1.55 * Math.min(1, u * 2.2), pivot: 'feet', lift: 2 * Math.sin(u * Math.PI) } };
    case 'keeperHigh': return { pose: 'cheer', tilt: { axis: 'forward', angle: 1.35 * Math.min(1, u * 2.2), pivot: 'feet', lift: 14 * Math.sin(Math.min(1, u * 1.2) * Math.PI) } };
    case 'catch': return { pose: u < .5 ? 'cast' : 'guard', crouch: 1 };
    case 'parry': return { attack: EF.kickState('throwIn', u * .6) ? { spec: { a0: .2, a1: -.4, z0: 20, z1: 24, reach: 8, blade: 0 }, phase: u < .3 ? 'wind' : 'active', u: u < .3 ? u / .3 : Math.min(1, (u - .3) / .3) } : null };
    case 'tip': return { pose: 'cheer', z: Math.sin(u * Math.PI) * 10 };
    case 'throw': return { clip: { name: 'OverhandThrow', t: u * 1.3, w: 1, mask: 'upper' } };
    case 'theatrics': return u < .4 ? { tilt: { axis: 'right', angle: u / .4 * 1.4, pivot: 'hips', lift: 8 * Math.sin(u / .4 * Math.PI) } } : { tilt: { axis: 'forward', angle: (u - .4) / .6 * TAU * 2, pivot: 'hips' }, expr: 'wince' };
    case 'spin': return { facing: Math.PI / 2 - u * TAU };
    case 'tired': return { pose: 'kneel', expr: 'wince' };
    case 'refCard': return { pose: 'cheer', expr: 'angry' };
    case 'refAdvantage': return { pose: 'cast' };
    case 'refVar': return { point: true, aim: Math.sin(u * TAU) * .6 };
    case 'refWhistle': return { point: true, expr: 'shout' };
  }
  if (name.startsWith('cel:')) { const c = EF.get('celebration', name.slice(4)); return { clip: c.clip ? { name: c.clip, t: t * (c.speed || 1), w: 1 } : null, proc: c.proc || null, pose: c.clip ? null : 'cheer', expr: 'shout' }; }
  return {};
};
/* ---- the sound test: every effect, song, chant and voice ---- */
EF.scenes.soundtest = front({ music: null, enter() {
  const list = [].concat(Object.keys(SFX).map(k => ['SFX', k, () => EF.sfx(k)]), Object.keys(EF.SONGS).map(k => ['SONG', k, () => EF.music(k)]), EF.all('chant').map(c => ['CHANT', c.id, () => { EF.crowdAudio.start(800); EF.crowdAudio.chant(c.id); }]), Object.keys(EF.CAST).concat(['kipperton:pilchard', 'opulence:dor']).map(id => ['VOICE', id, () => { const v = EF.babble.voiceFor(id), line = 'Hello! This is ' + EF.Cast.name(id) + ', how are you today?'; for (let i = 0; i < line.length; i++) game.after(i * .03, () => v(line[i], i, line)); }]), [['CROWD', 'ooh', () => { EF.crowdAudio.start(800); EF.crowdAudio.react('ooh'); }], ['CROWD', 'roar', () => { EF.crowdAudio.start(800); EF.crowdAudio.react('roar'); }], ['CROWD', 'boo', () => { EF.crowdAudio.start(800); EF.crowdAudio.react('boo'); }], ['CROWD', 'whistles', () => EF.crowdAudio.react('whistles')], ['CROWD', 'clap', () => EF.crowdAudio.react('clap')], ['MUSIC', 'stop', () => EF.music(null)]]);
  EF.UI.set([{ id: 'sounds', widgets: list.map(([k, n, fn], i) => ({ id: k + n, kind: 'button', title: k + ': ' + n, align: 'left', scale: 1, onPick: fn })), page: 0,
    layout(r) { const per = Math.floor((r.H - 60) / 13), f = this.focus, p0 = Math.floor(f / per) * per; this.widgets.forEach((w, i) => { const k = i - p0; w.noFocus = false; if (k < 0 || k >= per) { w.x = -999; w.y = -999; w.w = 0; w.h = 0; } else { w.x = r.W / 2 - 110; w.y = 40 + k * 13; w.w = 220; w.h = 12; } }); },
    draw: (g, r) => EF.UI.panel(g, r, 'SOUND TEST', 'EVERY SOUND IS MADE IN CODE'), footer: () => [['confirm', 'PLAY'], ['cancel', 'BACK']], onBack: () => { EF.music(null); EF.crowdAudio.stop(); game.go('title', { menu: true }); } }]);
} });
/* ==== src/42-hub.js ==== */
/* AI HUB SESSIONS (section 6.28; AI Hub Session Protocol v1, mode shared-world, 2-4 players). The host's copy runs
 * the match; the others send it their player's input and draw the world it sends: snapshots 14 a second (unreliable,
 * under 1,100 bytes) and the events, coalesced, at most 5 a second (reliable). Clients draw 100 ms behind, interpolating.
 * The game's own card is the tunnel scene. A draw stands. Nothing here runs outside a session. */
const ST_CODES = ['run', 'kick', 'poke', 'slide', 'barge', 'skill', 'air', 'down', 'launched', 'getup', 'dive', 'celebrate', 'keeper-dive', 'keeper-hold', 'keeper-throw', 'smother', 'off', 'setpiece', 'stumble', 'super'];
const MODE_CODES = ['kickoff', 'play', 'setpiece', 'goal', 'celebrate', 'replay', 'var', 'card', 'halftime', 'fulltime', 'shootout', 'over'];
const KICK_CODES = [null].concat(Object.keys(EF.KICKS));
const POSE_CODES = [null, 'guard', 'cheer', 'cast', 'kneel', 'hips', 'crouch', 'wave'];
const CLIP_CODES = [null, 'Slide_Loop', 'OverhandThrow', 'Victory', 'Cheer_One_arm', 'Cheering_Two_Hands', 'Dance_Simple', 'Angry', 'Backflip', 'Shrug', 'Greeting', 'Cartwheel', 'Breakdance_Helicopter', 'Dodge_left', 'Dodge_right', 'Get_Up_From_Side'];
const SP_CODES = [null, 'kickoff', 'goalkick', 'corner', 'freekick', 'penalty', 'throwback'];
const FWD_EVENTS = ['goal', 'ownGoal', 'shot', 'pass', 'woodwork', 'save', 'catch', 'parry', 'tip', 'whistle', 'card', 'foul', 'slide', 'knockdown', 'launched', 'tackleWon', 'skill', 'nutmeg', 'rainbow', 'header', 'volley', 'bicycle', 'europhoria', 'europhoriaEnd', 'euphoriaLevel', 'euphoriaFull', 'superCharge', 'superStrike', 'saveDuel', 'saveDuelResult', 'var', 'varDecision', 'diveBooked', 'diveWon', 'dive', 'notice', 'half', 'fulltime', 'kickoff', 'corner', 'penaltyAwarded', 'crowdBall', 'nearMiss', 'netHit', 'event', 'bus', 'busSmashed', 'celebrate', 'celebrateStart', 'stoppage', 'advantage', 'sendOff', 'hammer', 'splash'];
const r1 = v => Math.round(v), q100 = v => Math.round(v * 100);
EF.Hub = {
  role: null, info: null, sent: 0, received: 0, ended: null, card: null, me: null, snaps: [], evSeq: 0, evOut: [], evIn: -1, lastSnap: -1, lastEv: -1, lastIn: -1, menuOpen: false, presses: [0, 0, 0, 0, 0, 0, 0, 0], seq: 0,
  get active() { return EF.inSession && !!this.info; },
  send(data, reliable) { if (this.ended) return false; try { const ok = AIHub.send(data, { reliable: !!reliable }); if (ok !== false) this.sent++; return ok; } catch (e) { return false; } },
  /** connect; with null, play as a normal game */
  async connect() {
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { info = null; }
    if (!info) { EF.inSession = false; game.go('title', {}); return; }
    this.info = info; this.me = info.me; this.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
    AIHub.on('message', (d, from) => this.message(d, from));
    AIHub.on('card', c => { this.card = c; this.cardAt = performance.now(); });
    AIHub.on('start', s => { this.started = true; this.startIn = s && s.in; if (game.sceneName === 'tunnel') this.goMatch(); });
    AIHub.on('leave', ev => this.leave(ev));
    AIHub.on('time-up', () => { if (this.role !== 'client') this.finish(true); });
    AIHub.on('end', ev => this.end(ev));
    this.opts = this.setup(info);
    game.go('tunnel', { card: true, opts: this.opts, next: { scene: 'match', data: {} } });
  },
  /** the round from the shared seed: two teams, a stadium, its weather; seats alternate HOME and AWAY */
  setup(info) {
    const R = AIHub.rng('setup'), teams = H.shuffle(R, EF.TEAM_IDS), st = EF.CUP_STADIUMS[Math.floor(R() * 5)];
    const players = info.players || [], sides = players.map((p, i) => i % 2), n0 = sides.filter(s => s === 0).length, n1 = sides.length - n0;
    const half = clamp(((info.limitMs || 240000) / 1000 - 50) / 2, 45, 90);
    const buffs = [{}, {}]; if (players.length === 3) buffs[n0 < n1 ? 0 : 1].euphoriaGain = 1.5;
    this.sideOf = {}; players.forEach((p, i) => { this.sideOf[p.id] = sides[i]; });
    return { home: teams[0], away: teams[1], stadium: st, kind: 'session', seed: Math.floor(R() * 1e9), halfLength: half, draws: 'allowed', buffs, noVar: false, kits: EF.Art.pickKits(EF.get('team', teams[0]), EF.get('team', teams[1])), weather: R() < .3 ? { kind: R() < .5 ? 'rain' : 'snow', amount: .6, wind: .2 } : undefined };
  },
  humans() {
    const info = this.info, out = [];
    (info.players || []).forEach(p => {
      const side = this.sideOf[p.id], local = p.id === this.me && this.role !== 'server';
      if (this.role === 'client') out.push({ id: p.id, side, name: p.name, color: p.color, remote: !local, input: local ? game.input : null, ctl: { peek: () => ({ move: [0, 0] }), intent: () => EF.Intent.make() } });
      else out.push(local ? { input: game.input, side, id: p.id, name: p.name, color: p.color } : { remote: true, side, id: p.id, name: p.name, color: p.color, ctl: new RemoteController(p.id) });
    });
    return out;
  },
  /* ---- the card: the tunnel scene in card mode ---- */
  cardEnter(sc) { if (!this.readied) { this.readied = true; try { AIHub.ready(); } catch (e) { /* hub gone */ } } sc.answered = null; },
  cardStep(dt, sc) {
    if (this.started && !this.goneMatch) return this.goMatch();
    const I = game.input, c = I.clicked && I.clicked();
    if (this.ended) return;
    if (I.pressed('confirm') || I.pressed('start') || (c && sc.readyBtn && inBox(c, sc.readyBtn))) { if (sc.answered !== 'ready') { sc.answered = 'ready'; AIHub.answer('ready'); EF.sfx('confirm'); } }
    if (I.pressed('through') || (c && sc.moreBtn && inBox(c, sc.moreBtn)) || this.keyT) { this.keyT = false; AIHub.answer('more'); EF.sfx('select'); }
  },
  cardDraw(g, r, sc) {
    const [mx, my] = EF.HUD.margin(r), info = this.info, c = this.card || {}, o = this.opts, T = [EF.get('team', o.home), EF.get('team', o.away)];
    const w = Math.min(r.W - 2 * mx, 360), bh = Math.min(r.H - 2 * my - 26, 196), x = Math.round(r.W / 2 - w / 2), y = Math.max(my + 22, Math.round((r.H - bh) / 2));
    E.font.title(g, 'EUROPHORIA FOOTBALL', r.W / 2, y - 20, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    E.ui.box(g, x, y, w, bh, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .92 });
    for (const s of [0, 1]) { const cx = s ? x + w - 50 : x + 50; EF.drawCrest(g, T[s], cx, y + 24, 26); E.font.text(g, T[s].short + (s ? ' (AWAY)' : ' (HOME)'), cx, y + 42, '#ffffff', { align: 'center', font: 'tiny', outline: false });
      (info.players || []).filter(p => this.sideOf[p.id] === s).forEach((p, i) => { const ready = (c.ready || []).includes(p.id); E.font.text(g, (ready ? '✓ ' : '  ').replace('✓', '*') + String(p.name).slice(0, 14) + (p.id === this.me ? ' (YOU)' : ''), cx, y + 52 + i * 10, p.color || '#fff', { align: 'center', outline: '#000' }); }); }
    E.font.text(g, 'HOW TO WIN', r.W / 2, y + 8, '#ffc83a', { align: 'center', outline: false });
    E.font.text(g, 'Outscore the other side before the final whistle', r.W / 2, y + 18, '#ffffff', { align: 'center', font: 'tiny', outline: false, wrap: w - 150 });
    E.font.text(g, EF.get('stadium', o.stadium).name, r.W / 2, y + 40, '#9aa6c8', { align: 'center', font: 'tiny', outline: false });
    const cy = y + 84; EF.prompts(g, r.W / 2, cy, [['up', 'MOVE'], ['pass', 'PASS'], ['shoot', 'SHOOT (HOLD)'], ['lob', 'LOB']], { input: game.input }); EF.prompts(g, r.W / 2, cy + 14, [['sprint', 'SPRINT'], ['skill', 'SKILL'], ['euphoria', 'EUROPHORIA']], { input: game.input });
    const left = c.paused ? 'PAUSED' : c.starting ? 'STARTING...' : c.left !== null && c.left !== undefined ? Math.max(0, Math.ceil((c.left - (performance.now() - (this.cardAt || 0))) / 1000)) + ' S' : '...';
    E.font.text(g, left, r.W / 2, cy + 34, c.paused ? '#ff7a6a' : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
    const bw = 104, by = y + bh - 28; sc.readyBtn = [Math.round(r.W / 2 - bw - 6), by, bw, 20]; sc.moreBtn = [Math.round(r.W / 2 + 6), by, bw, 20];
    E.ui.box(g, ...sc.readyBtn, { bg: sc.answered === 'ready' ? ['#1a5a2a', '#2a7a3a'] : ['#1c2a5c', '#2a3a74'], border: '#ffc83a' }); EF.prompt(g, sc.readyBtn[0] + 6, by + 4, 'confirm', sc.answered === 'ready' ? 'READY!' : 'READY', { input: game.input });
    E.ui.box(g, ...sc.moreBtn, { bg: c.asked ? ['#5a3a1a', '#7a4a2a'] : ['#1c2a5c', '#2a3a74'], border: '#9aa6c8' }); EF.prompt(g, sc.moreBtn[0] + 6, by + 4, game.input.lastDevice === 'gamepad' ? 'Pad3' : 'KeyT', c.asked ? 'ASKED' : 'MORE TIME', { input: game.input });
    if (this.ended) this.endDraw(g, r);
  },
  goMatch() { if (this.goneMatch) return; this.goneMatch = true; game.go('match', { opts: Object.assign({}, this.opts, { humans: this.humans() }), session: true, onEnd: res => this.finish(false, res) }); },
  /* ---- the match in a session: the countdown, the host's sending, the client's mirror ---- */
  sessionUpdate(dt, c) {
    const m = c.m, now = AIHub.time();
    if (this.ended) { c.view.update(dt, c.src); return true; }
    this.menuStep(dt);
    if (this.role === 'client') { this.clientStep(dt, c, now); return true; }
    if (now < 0) { c.view.update(dt, m); EF.Camera.update(dt, m, m); this.hostSend(m, now); return true; }
    return false;
  },
  matchStep(dt, c) { if (!EF.inSession || !this.info || this.role === 'client' || this.ended) return; this.hostSend(c.m, AIHub.time()); },
  hostSend(m, now) {
    if (!m.hubBus) { m.hubBus = EF.bus.on('*', ev => { if (ev.match === m && FWD_EVENTS.includes(ev.type)) this.evOut.push([++this.evSeq, Math.round(AIHub.time()), ev.type, this.evData(ev)]); }); }
    const t = performance.now();
    if (t - this.lastSnap >= 1000 / 14) { this.lastSnap = t; this.send(this.snapshot(m, now), false); }
    if (this.evOut.length && t - this.lastEv >= 200) { this.lastEv = t; this.send({ t: 'E', list: this.evOut.splice(0, 40) }, true); }
  },
  evData(ev) {
    const d = {}; if (ev.who && ev.who.id !== undefined && ev.who.data) d.w = ev.who.id; if (ev.side !== undefined) d.s = ev.side;
    for (const k of ['x', 'y', 'z']) if (typeof ev[k] === 'number') d[k] = r1(ev[k]);
    for (const k of ['kind', 'color', 'result', 'text', 'sub', 'id', 'power', 'screamer', 'level', 'overturned', 'second', 'super', 'name', 'chain', 'surf']) if (ev[k] !== undefined && ev[k] !== null && typeof ev[k] !== 'object') d[k] = ev[k];
    if (ev.victim && ev.victim.id !== undefined) d.v = ev.victim.id; if (ev.goal) d.g = { kind: ev.goal.kind, name: ev.goal.name, minute: ev.goal.minute, own: ev.goal.own, super: ev.goal.super };
    if (ev.type === 'saveDuel') d.at = Math.round(AIHub.time()), d.h = ev.human;
    if (ev.type === 'celebrateStart' && ev.who) { const C = ev.match.celebration; if (C) { d.o = C.offer.map(x => x.id); d.h = C.human ? C.human.id : null; } }
    return d;
  },
  snapshot(m, now) {
    const b = m.ball, own = m.owner ? m.owner.id : -1;
    const p = m.players.map(f => { const L = f.look, B = f.body, tl = L.tilt; return [r1(B.x), r1(B.y), r1(B.z), r1(B.vx), r1(B.vy), q100(f.facing + (L.spin || 0)), ST_CODES.indexOf(f.state), Math.max(0, KICK_CODES.indexOf(f.kickName)), q100(f.kickT), tl ? (tl.axis === 'forward' ? 1 : 2) : 0, tl ? q100(tl.angle) : 0, tl ? r1(tl.lift || 0) : 0, Math.max(0, POSE_CODES.indexOf(L.pose)), L.clip ? Math.max(0, CLIP_CODES.indexOf(L.clip.name)) : 0, L.clip ? q100(L.clip.t) : 0, (f.sentOff ? 1 : 0) | (f.ghost ? 2 : 0) | (f.charging ? 4 : 0) | (L.down ? 8 : 0) | (L.sprint ? 16 : 0) | (L.hurt ? 32 : 0)]; });
    const R = m.ref, EU = m.europhoria;
    return { t: 's', at: Math.round(now), b: [r1(b.x), r1(b.y), r1(b.z), r1(b.vx), r1(b.vy), r1(b.vz), own, b.superPath ? 1 : 0], p, r: [r1(R.body.x), r1(R.body.y), q100(R.facing), R.state === 'down' ? 1 : 0, R.signal ? ['whistle', 'point', 'card', 'advantage', 'ear', 'var'].indexOf(R.signal) + 1 : 0],
      m: [MODE_CODES.indexOf(m.mode), Math.round(m.clock * 10), m.half, m.score[0], m.score[1], r1(m.euphoria[0]), r1(m.euphoria[1]), EU ? EU.side : -1, EU ? Math.round(EU.t * 10) : 0, SP_CODES.indexOf(m.setpiece ? m.setpiece.kind : null), m.stoppage, m.superUsed ? 1 : 0],
      c: m.humans.map(h => [h.id, h.fb ? h.fb.id : -1]), o: m.over ? 1 : 0 };
  },
  /* ---- the client: interpolate the host's world 100 ms behind ---- */
  clientStep(dt, c, now) {
    const m = c.m;
    // send this player's input 15 times a second (counters for presses, so a lost packet loses none)
    const I = game.input, t = performance.now();
    if (!this.menuOpen && this.role === 'client') {
      const mv = I.move(), d = Math.hypot(mv[0], mv[1]) > .05 ? game.view.screenDirToGround(mv[0], mv[1]) : [0, 0], k = Math.min(1, Math.hypot(mv[0], mv[1]));
      ['pass', 'shoot', 'lob', 'through', 'skill', 'switch', 'dive', 'euphoria'].forEach((a, i) => { if (I.pressed(a)) { this.presses[i]++; EF.sfx('touch', { vol: .5 }); if (I.rumble) I.rumble(.15, .05); } });
      this.held = (I.down('sprint') ? 1 : 0) | (I.down('pass') ? 2 : 0) | (I.down('shoot') ? 4 : 0) | (I.down('lob') ? 8 : 0) | (I.down('through') ? 16 : 0) | (I.down('skill') ? 32 : 0) | (I.down('switch') ? 64 : 0) | (I.down('dive') ? 128 : 0);
      this.mv = [q100(d[0] * k), q100(d[1] * k)];
      if (t - this.lastIn >= 1000 / 15) { this.lastIn = t; this.send({ t: 'i', s: ++this.seq, at: Math.round(now), m: this.mv, h: this.held, c: this.presses.slice() }, false); }
      if (m.duel && m.duel.mine && m.duel.press === null && I.pressed('pass')) { m.duel.press = (now - m.duel.startAt) / 1000; this.send({ t: 'duel', at: Math.round(now) }, true); }
    }
    // apply the snapshots: 100 ms behind the newest, interpolated (extrapolated up to 150 ms)
    const S = this.snaps; if (S.length) {
      const target = S[S.length - 1].at - 100 + (now - (this.lastRecvAt || now));
      let a = S[0], b2 = S[0]; for (let i = 0; i < S.length - 1; i++) if (S[i].at <= target && S[i + 1].at >= target) { a = S[i]; b2 = S[i + 1]; break; } else if (S[i + 1].at < target) { a = S[i + 1]; b2 = S[i + 1]; }
      const span = b2.at - a.at, k2 = span > 0 ? clamp((target - a.at) / span, 0, 1) : 0, ex = span <= 0 ? clamp((target - a.at) / 1000, 0, .15) : 0;
      this.apply(m, a, b2, k2, ex);
    }
    if (m.duel) m.duel.t = (now - m.duel.startAt) / 1000;
    if (m.notice) { m.notice.t += dt; if (m.notice.t > m.notice.dur) m.notice = null; }
    m.t += dt;
    c.view.update(dt, m); c.comm.update(dt); if (c.audio) c.audio.update(dt, c.view); EF.Camera.update(dt, m, m);
  },
  apply(m, a, b, k, ex) {
    const L = (i, arrA, arrB) => arrA[i] + (arrB[i] - arrA[i]) * k;
    const ball = m.ball, ba = a.b, bb = b.b;
    ball.x = L(0, ba, bb) + ba[3] * ex; ball.y = L(1, ba, bb) + ba[4] * ex; ball.z = Math.max(0, L(2, ba, bb)); ball.vx = bb[3]; ball.vy = bb[4]; ball.vz = bb[5]; ball.roll += Math.hypot(ball.vx, ball.vy) / 120;
    m.owner = bb[6] >= 0 ? m.players[bb[6]] : null; ball.owner = m.owner;
    if (bb[7]) { if (!ball.superPath) ball.superPath = { kind: 'rocket', t: 0 }; ball.trail.push([ball.x, ball.y, ball.z]); if (ball.trail.length > 12) ball.trail.shift(); } else { ball.superPath = null; ball.trail.length = 0; }
    m.players.forEach((f, i) => {
      const pa = a.p[i], pb = b.p[i]; if (!pa || !pb) return;
      const B = f.body; B.x = L(0, pa, pb) + pa[3] * ex; B.y = L(1, pa, pb) + pa[4] * ex; B.z = L(2, pa, pb); B.vx = pb[3]; B.vy = pb[4];
      f.facing = pa[5] / 100 + E.angDiff(pa[5] / 100, pb[5] / 100) * k; f.state = ST_CODES[pb[6]] || 'run'; f.kickName = KICK_CODES[pb[7]] || null; f.kickT = pb[8] / 100;
      const Lk = f.look; Lk.tilt = pb[9] ? { axis: pb[9] === 1 ? 'forward' : 'right', angle: L(10, pa, pb) / 100, pivot: pb[9] === 1 ? 'feet' : 'hips', lift: pb[11] } : null;
      Lk.pose = POSE_CODES[pb[12]] || null; Lk.clip = pb[13] ? { name: CLIP_CODES[pb[13]], t: pb[14] / 100, w: 1, mask: CLIP_CODES[pb[13]] === 'OverhandThrow' ? 'upper' : null } : null;
      const fl = pb[15]; f.sentOff = !!(fl & 1); f.ghost = !!(fl & 2); f.charging = !!(fl & 4); Lk.down = fl & 8 ? 1 : 0; Lk.sprint = !!(fl & 16); Lk.hurt = !!(fl & 32); Lk.spin = 0; Lk.air = B.z > 2;
      Lk.expr = f.state === 'down' || f.state === 'launched' ? 'wince' : f.state === 'celebrate' ? 'shout' : null;
    });
    const R = m.ref, ra = a.r, rb = b.r; R.body.x = L(0, ra, rb); R.body.y = L(1, ra, rb); R.facing = rb[2] / 100; R.look.down = rb[3]; R.signal = rb[4] ? ['whistle', 'point', 'card', 'advantage', 'ear', 'var'][rb[4] - 1] : null; R.look.signal = R.signal; R.look.point = R.signal === 'point' || R.signal === 'whistle'; R.look.pose = R.signal === 'card' ? 'cheer' : R.signal === 'advantage' ? 'cast' : null;
    const M = b.m; m.mode = MODE_CODES[M[0]] || 'play'; m.clock = M[1] / 10; m.half = M[2]; m.score = [M[3], M[4]]; m.euphoria = [M[5], M[6]]; m.europhoria = M[7] >= 0 ? { side: M[7], t: M[8] / 10, dur: EF.T.europhoriaTime } : null;
    const spk = SP_CODES[M[9]]; m.setpiece = spk ? { kind: spk, taken: false, stage: 'aim', side: 0 } : null; m.stoppage = M[10]; m.superUsed = !!M[11];
    for (const [id, fid] of b.c) { const h = m.humans.find(q => q.id === id); if (h) { if (h.fb && h.fb.human === h) h.fb.human = null; h.fb = fid >= 0 ? m.players[fid] : null; if (h.fb) h.fb.human = h; } }
    if (b.o && !m.overShown) { m.overShown = true; m.over = true; }
  },
  /** a host's event, replayed on this copy's mirror: sounds, commentary, the crowd, notices, the duel */
  replayEvent([seq, at, type, d]) {
    const m = EF.cur && EF.cur.m; if (!m) return;
    const ev = Object.assign({}, d, { match: m }); if (d.w !== undefined) ev.who = m.players[d.w]; if (d.v !== undefined) ev.victim = m.players[d.v]; if (d.s !== undefined) ev.side = d.s;
    if (d.g) ev.goal = d.g;
    if (type === 'notice') m.notice = { text: d.text, t: 0, dur: 1.8, sub: d.sub || null, big: true };
    if (type === 'goal' || type === 'ownGoal') { m.lastGoal = Object.assign({ side: d.s, t: m.t }, d.g || {}); }
    if (type === 'saveDuel') { const k = ev.who; m.duel = { t: 0, dur: 1, keeper: k, human: null, press: null, result: null, startAt: d.at, mine: d.h === this.me }; }
    if (type === 'saveDuelResult' && m.duel) { m.duel.result = d.result; game.after(.7, () => { if (EF.cur && EF.cur.m === m) m.duel = null; }); }
    if (type === 'celebrateStart' && d.o) { m.celebration = { who: ev.who, offer: d.o.map(id => EF.get('celebration', id)), pick: null, t: 0, human: d.h === this.me ? m.humans.find(h => h.id === this.me) : null }; game.after(1.4, () => { if (EF.cur && EF.cur.m === m) m.celebration = null; }); }
    if (type === 'card' && ev.who) { m.cardNow = { who: ev.who, final: d.color === 'yellow' ? 'yellow' : 'red', shown: true }; }
    EF.bus.emit(type, ev);
  },
  /* ---- messages ---- */
  message(d, from) {
    this.received++;
    if (!d || typeof d !== 'object' || this.ended) return;
    if (d.t === 's' && this.role === 'client') { this.lastRecvAt = AIHub.time(); this.snaps.push(d); while (this.snaps.length > 12) this.snaps.shift(); this.snaps.sort((a, b) => a.at - b.at); return; }
    if (d.t === 'E' && this.role === 'client') { for (const e of d.list || []) if (e[0] > this.evIn) { this.evIn = e[0]; this.replayEvent(e); } return; }
    if (this.role === 'client') return;
    const m = EF.cur && EF.cur.m, h = m && m.humans.find(q => q.id === from); if (!h || !h.ctl || !h.ctl.feed) return;
    if (d.t === 'i') h.ctl.feed(d);
    else if (d.t === 'duel') { h.ctl.duelAt = d.at; if (m.duel && m.duel.human === h && m.duel.press === null) m.duel.press = (d.at - (m.duel.startAt || 0)) / 1000; }
    else if (d.t === 'cel') h.ctl.cel = d.k;
    else if (d.t === 'menu') h.cpu = !!d.open;
  },
  leave(ev) {
    const m = EF.cur && EF.cur.m; if (!m) return;
    const h = m.humans.find(q => q.id === ev.id); if (h) { h.cpu = true; h.left = true; if (h.fb) h.fb.human = null; }
    if (this.info && this.info.players) { const p = this.info.players.find(q => q.id === ev.id); if (p) p.left = true; }
  },
  /** the host, once: a last snapshot with over, then finish with standings, scores, stats and awards */
  finish(timeUp, res) {
    if (this.role === 'client' || this.finished || this.ended) return;
    const m = EF.cur && EF.cur.m; if (!m) return;
    this.finished = true;
    try { this.send(Object.assign(this.snapshot(m, AIHub.time()), { o: 1 }), true); } catch (e) { /* gone */ }
    const players = (this.info.players || []).filter(p => !p.left), sideOf = this.sideOf, w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    const standings = w < 0 ? [players.map(p => p.id)] : [players.filter(p => sideOf[p.id] === w).map(p => p.id), players.filter(p => sideOf[p.id] !== w).map(p => p.id)].filter(g => g.length);
    const scores = {}, stats = {}; for (const p of players) { scores[p.id] = m.score[sideOf[p.id]]; const h = m.humans.find(q => q.id === p.id); stats[p.id] = h ? Object.assign({}, h.stats) : { Goals: 0, Shots: 0, Tackles: 0 }; }
    const best = players.map(p => ({ p, s: (stats[p.id].Goals * 3 + stats[p.id].Shots + stats[p.id].Tackles) })).sort((a, b) => b.s - a.s)[0];
    const awards = best ? [{ id: best.p.id, title: 'Player of the Match', detail: stats[best.p.id].Goals + ' goals, ' + stats[best.p.id].Tackles + ' tackles' }] : [];
    try { AIHub.finish({ standings, scores, stats, awards }); } catch (e) { /* hub gone */ }
    if (timeUp && m.mode !== 'fulltime' && m.mode !== 'over') m.fullTime();
  },
  end(ev) {
    this.ended = (ev && ev.reason) || 'finished';
    EF.silence(); try { game.input.clear(); } catch (e) { /* no input */ }
    if (EF.cur && EF.cur.audio) EF.cur.audio.dispose();
  },
  endDraw(g, r) {
    const why = this.ended, m = EF.cur && EF.cur.m;
    const text = why === 'void' || why === 'host-left' ? 'ROUND VOID' : why === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'FULL TIME';
    px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
    E.font.title(g, text, r.W / 2, Math.round(r.H * .32), { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    if (m && text === 'FULL TIME') E.font.text(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, r.W / 2, Math.round(r.H * .32) + 34, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
    if (why === 'host-left') E.font.text(g, 'THE HOST LEFT', r.W / 2, Math.round(r.H * .32) + 34, '#c8d0e8', { align: 'center', outline: '#000' });
  },
  /* ---- the session's own settings overlay (Options or Esc): nothing pauses; the player's footballer goes to the CPU ---- */
  menuStep() {
    const I = game.input; let create = false;
    try { const pad = I.padIndex !== null && I.padIndex !== undefined && navigator.getGamepads()[I.padIndex]; create = !!(pad && pad.buttons[8] && pad.buttons[8].pressed); } catch (e) { /* none */ }
    if (I.pressed('pause') && !create) { this.menuOpen = !this.menuOpen; this.send({ t: 'menu', open: this.menuOpen }, true); if (this.menuOpen) this.openMenu(); else EF.UI.set([]); game.input.consumeAll(); const h = EF.cur && EF.cur.m.humans.find(q => q.id === this.me); if (h && this.role !== 'client') h.cpu = this.menuOpen; }
    if (this.menuOpen) EF.UI.update(1 / 120);
  },
  openMenu() {
    const S = game.settings, sl = (key, label) => ({ id: key, kind: 'slider', title: label, min: 0, max: 1, step: .05, get: () => S[key], set: v => S.set(key, v), fmt: v => Math.round(v * 100) + '%' });
    EF.UI.set([{ id: 'session-settings', widgets: [sl('volume', 'VOLUME'), sl('music', 'MUSIC'), sl('effects', 'EFFECTS'), sl('voices', 'VOICES'), sl('crowd', 'CROWD'), { id: 'glyphs', kind: 'choice', title: 'BUTTON SYMBOLS', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], get: () => S.glyphs, set: v => S.set('glyphs', v) }, { id: 'close', kind: 'button', title: 'BACK TO THE MATCH', onPick: () => { this.menuOpen = false; this.send({ t: 'menu', open: false }, true); EF.UI.set([]); const h = EF.cur && EF.cur.m.humans.find(q => q.id === this.me); if (h && this.role !== 'client') h.cpu = false; } }],
      layout(r) { const w = Math.min(260, r.W - 30); EF.UI.column(this.widgets, Math.round(r.W / 2 - w / 2), 50, w, 18, 3); },
      draw: (g, r) => { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05060e')); EF.UI.panel(g, r, 'SESSION SETTINGS', 'THE MATCH GOES ON: YOUR PLAYER IS ON AUTO'); }, footer: () => [['left', 'CHANGE'], ['pause', 'CLOSE']], onBack: () => { this.menuOpen = false; this.send({ t: 'menu', open: false }, true); EF.UI.set([]); } }]);
  },
  matchOverlay(r, c) {
    if (!this.active) return;
    const now = AIHub.time();
    r.overlay(g => {
      if (now < 0 && isFinite(now)) { const n = Math.ceil(-now / 1000); E.font.title(g, n > 0 ? String(n) : 'GO!', r.W / 2, Math.round(r.H * .3), { align: 'center', scale: 5, colors: ['#ffffff', '#ffe08a', '#ffb347'], depth: 3 }); }
      if (this.ended) this.endDraw(g, r);
    });
    if (this.menuOpen) EF.UI.draw(r);
  }
};
const inBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];
/** the host's view of a remote player: the newest input message, presses from its counters, neutral after 500 ms */
class RemoteController {
  constructor(id) { this.id = id; this.last = null; this.lastT = -1e9; this.seen = [0, 0, 0, 0, 0, 0, 0, 0]; this.pend = [0, 0, 0, 0, 0, 0, 0, 0]; this.cel = -1; this.raw = null; this.rawT = -1; }
  feed(d) { if (this.last && d.s <= this.last.s) return; this.last = d; this.lastT = performance.now(); (d.c || []).forEach((n, i) => { if (n > this.seen[i]) { this.pend[i] += n - this.seen[i]; this.seen[i] = n; } }); }
  read(m) {
    if (this.rawT === m.t && this.raw) return this.raw;
    this.rawT = m.t; const it = EF.Intent.make(), d = this.last;
    if (!d || performance.now() - this.lastT > 500) { this.raw = it; return it; }
    it.move = [(d.m[0] || 0) / 100, (d.m[1] || 0) / 100]; const hb = d.h || 0; it.sprint = !!(hb & 1);
    const keys = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive'], bits = [2, 4, 8, 16, 32, 64, 128];
    keys.forEach((k, i) => { const down = !!(hb & bits[i]), pr = this.pend[i] > 0; if (pr) this.pend[i]--; it[k] = { down: down || pr, pressed: pr, released: !down && !pr && this['was' + k] }; this['was' + k] = down || pr; });
    if (this.pend[7] > 0) { this.pend[7]--; it.euphoria = true; }
    it.cel = this.cel; this.cel = -1;
    this.raw = it; return it;
  }
  peek() { const m = EF.cur && EF.cur.m, r = this.read(m || { t: -1 }); return { move: r.move, pass: r.pass.pressed, shoot: r.shoot.pressed, lob: r.lob.pressed, through: r.through.pressed, skill: r.skill.pressed, sw: r.sw.pressed, dive: r.dive.pressed, shootDown: r.shoot.down, cel: r.cel }; }
  intent(f, dt) { const m = f.m, it = this.read(m); if (m.lastKick && m.lastKick.human && m.lastKick.human.ctl === this && m.lastKick.curlT > 0) m.lastKick.aftertouch(it.move, dt); return it; }
}
EF.RemoteController = RemoteController;
/* ---- the waiting scene: CONNECTING... over the stadium ---- */
EF.scenes.hubwait = Object.assign(EF.sceneBase(), {
  enter() { this.t = 0; EF.Stage.enter(); if (!this.started) { this.started = true; EF.Hub.connect(); } },
  update(dt) { this.t += dt; EF.Stage.update(dt); },
  draw(r) { EF.Stage.draw(r, { dim: .4 }); r.overlay(g => { E.font.title(g, 'EUROPHORIA FOOTBALL', r.W / 2, Math.round(r.H * .3), { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] }); E.font.text(g, 'CONNECTING' + '...'.slice(0, Math.floor(this.t * 3) % 4), r.W / 2, Math.round(r.H * .5), '#ffffff', { align: 'center', scale: 2, outline: '#000' }); }); }
});
/* the match scene in a session: the host keeps sending, the client mirrors; the server draws nothing */
const _mUpd3 = EF.scenes.match.update, _mDraw3 = EF.scenes.match.draw;
EF.scenes.match.update = function (dt) { const c = EF.cur; if (EF.inSession && c && EF.Hub.info && EF.Hub.sessionUpdate(dt, c)) return; _mUpd3.call(this, dt); };
EF.scenes.match.draw = function (r) { if (EF.inSession && EF.Hub.role === 'server') { r.sky(['#000000', '#000000']); return; } _mDraw3.call(this, r); };
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (EF.inSession && e.code === 'KeyT' && game.sceneName === 'tunnel') EF.Hub.keyT = true; });
/* ==== src/43-saves.js ==== */
/* SAVES (section 6.31): the cup's progress, stickers, unlocks, records and drills, versioned with a migration; the cup
 * autosaves through game.saves (slot 'auto') and everything else is kept with E.store. Nothing is saved in a session. */
EF.Save = {
  V: 1, d: null,
  fresh() { return { v: 1, cup: null, stickers: {}, unlocks: { balls: ['classic', 'orange'] }, records: { fastestCup: null, biggestWin: null, cupsWon: 0 }, drills: {}, heard: 0, seen: {} }; },
  migrate(o) {
    if (!o || typeof o !== 'object') return this.fresh();
    if (!o.v) { const n = this.fresh(); if (o.stickers) n.stickers = o.stickers; if (o.round !== undefined) n.cup = { round: o.round, results: o.results || [], flags: {}, teamTalks: 0, started: Date.now() }; return n; }   // v0: a flat shape
    return Object.assign(this.fresh(), o, { v: 1 });
  },
  load() { if (EF.inSession) { this.d = this.fresh(); return; } this.d = this.migrate(E.store.get('ef:save', null)); },
  data() { if (!this.d) this.load(); return this.d; },
  write() { if (EF.inSession || EF.noSave) return; E.store.set('ef:save', this.d); try { const S = game.saves; S.write = () => ({ data: this.d, place: this.d.cup ? EF.CUP.rounds[Math.min(this.d.cup.round, 4)].name : 'TITLE', level: this.d.cup ? this.d.cup.round + 1 : 0 }); S.read = s => { this.d = this.migrate(s.data); }; S.autosave(); } catch (e) { /* storage blocked */ } },
  reset() { this.d = this.fresh(); this.write(); },
  cupState() { const d = this.data(); return d.cup ? { round: d.cup.round, results: d.cup.results.map(r => r.score.join('-')), done: !!d.cup.done } : null; },
  sticker(id, shiny) {
    const d = this.data(); if (d.stickers[id] && !(shiny && d.stickers[id] !== 'shiny')) return false;
    d.stickers[id] = shiny ? 'shiny' : true; this.write();
    const st = EF.get('sticker', id); if (st && !EF.quietStickers) EF.toast('STICKER: ' + st.name, { sub: shiny ? 'SHINY!' : 'ADDED TO YOUR ALBUM', icon: (g, x, y) => { px.rect(g, x - 6, y - 8, 12, 16, shiny ? '#ffe070' : '#e8e0d0'); px.rect(g, x - 4, y - 6, 8, 12, '#3a4a8a'); } });
    return true;
  },
  has(id) { return !!this.data().stickers[id]; },
  unlock(kind, id) { const u = this.data().unlocks; u[kind] = u[kind] || []; if (!u[kind].includes(id)) { u[kind].push(id); this.write(); EF.toast('UNLOCKED: ' + (EF.BALLS[id] ? EF.BALLS[id].name : id)); } },
  drill(id) { this.data().drills[id] = true; this.write(); }
};
/* ==== src/50-teams.js ==== */
/* TEAMS, FORMATIONS, TACTICS, REFEREES, SUPERS, CELEBRATIONS (section 7.1): content as data. Adding a team means
 * adding an entry here (and its stadium in 51); the code reads it all by id. */
const ST = (pace, shoot, pass, tackle, skill, keep, weight, temper) => ({ pace, shoot, pass, tackle, skill, keep, weight, temper });
const pl = (id, name, num, pos, o, stats) => Object.assign({ id, name, num, pos, build: 'heroic', size: 1.1, hair: 'short', skin: '#e8b890', hairColor: '#4a3020', stats, voice: { f0: 140, wave: 'saw' } }, o);
EF.def('team', 'kipperton', { name: 'KIPPERTON ATHLETIC', short: 'KIP', nick: 'THE KIPPERS', city: 'KIPPERTON', stadium: 'smokehouse', formation: '2-1-1', tactic: 'plucky', chant: 'kipperton', celebration: 'fishslap', crowd: { factor: 1 }, manager: 'mags', tifo: 'KIPPER ARMY',
  kits: { home: { shirt: '#f08a24', color2: '#1c2a5a', pattern: 'hoops', shorts: '#1c2a5a', socks: '#f08a24', number: '#ffffff' }, away: { shirt: '#eef0f4', color2: '#f08a24', pattern: 'sash', shorts: '#eef0f4', socks: '#1c2a5a', number: '#1c2a5a' }, keeper: { shirt: '#3ac06a', color2: '#1a5a30', pattern: 'plain', shorts: '#1a1a1a', socks: '#3ac06a', glove: '#f4f4f0' } },
  crest: { shape: 'shield', field: '#1c2a5a', ring: '#f08a24', charges: ['kipper', 'anchor'] },
  players: [
    pl('crabb', 'WALLY CRABB', 1, 'GK', { build: 'bulky', size: 1.18, hair: 'bald', skin: '#e0b090', hairColor: '#c8c8c8', voice: { f0: 110, wave: 'pulse' }, bio: 'Forty-one. A part-time lighthouse keeper with enormous gloves.' }, ST(60, 30, 55, 40, 20, 76, 80, 30)),
    pl('okafor', 'SANDRA OKAFOR', 4, 'DEF', { short: 'OKAFOR', nick: 'THE HARBOUR WALL', build: 'bulky', size: 1.16, hair: 'short', skin: '#7a4a2a', hairColor: '#1a1210', voice: { f0: 190, wave: 'saw' }, bio: 'Barges like a trawler. The coach of the defending drills.' }, ST(70, 50, 62, 88, 45, 10, 95, 40)),
    pl('nowak', 'AGGIE NOWAK', 6, 'MID', { build: 'heroic', size: 1.1, hair: 'ponytail', skin: '#f0c8a8', hairColor: '#c8a050', voice: { f0: 220, wave: 'saw' }, bio: 'The brains. Her grandmother never misses a match.' }, ST(74, 66, 90, 60, 70, 10, 55, 35)),
    pl('tran', 'TOMMY TRAN', 7, 'FWD', { short: 'TRAN', nick: 'TWINKLETOES', build: 'heroic', size: 1.06, hair: 'spiky', skin: '#e8c098', hairColor: '#141010', voice: { f0: 175, wave: 'saw' }, celebration: 'backflip', bio: 'Step-overs for breakfast.' }, ST(95, 72, 70, 40, 92, 10, 45, 45)),
    pl('pilchard', 'DAZ PILCHARD', 9, 'FWD', { captain: true, super: 'smoked-kipper', build: 'heroic', size: 1.14, hair: 'short', skin: '#f0c8a8', hairColor: '#5a3a22', voice: { f0: 150, wave: 'saw' }, celebration: 'fishslap', bio: 'Captain, local hero, part-time fish-van driver.' }, ST(80, 90, 70, 45, 75, 10, 60, 50))
  ] });
EF.def('team', 'hoofington', { name: 'AFC HOOFINGTON', short: 'HOO', nick: 'THE HOOFERS', city: 'HOOFINGTON', stadium: 'smokehouse', formation: '2-2', tactic: 'routeone', chant: 'hoofington', celebration: 'cheer', crowd: { factor: .9 }, tifo: 'HOOF IT',
  kits: { home: { shirt: '#6a4a2a', color2: '#e8a830', pattern: 'stripes', shorts: '#2a1a10', socks: '#e8a830', number: '#ffffff' }, away: { shirt: '#e8a830', color2: '#6a4a2a', pattern: 'plain', shorts: '#6a4a2a', socks: '#6a4a2a', number: '#2a1a10' }, keeper: { shirt: '#3a3a48', color2: '#e8a830', pattern: 'plain', shorts: '#1a1a1a', socks: '#3a3a48', glove: '#e8a830' } },
  crest: { shape: 'roundel', field: '#6a4a2a', ring: '#e8a830', charges: ['boot'] },
  players: [
    pl('stoppard', 'ALF STOPPARD', 1, 'GK', { build: 'bulky', size: 1.14, hair: 'short', skin: '#e8b890', hairColor: '#8a6a4a', voice: { f0: 105, wave: 'pulse' } }, ST(55, 30, 40, 40, 15, 70, 82, 50)),
    pl('hooper', 'GAZ HOOPER', 3, 'DEF', { build: 'bulky', size: 1.14, hair: 'bald', skin: '#f0c8a8', voice: { f0: 120, wave: 'pulse' } }, ST(62, 40, 45, 75, 30, 10, 84, 60)),
    pl('dunstable', 'DUNCAN DUNSTABLE', 5, 'DEF', { build: 'bulky', size: 1.2, hair: 'short', skin: '#d8a880', hairColor: '#3a2a1a', voice: { f0: 100, wave: 'pulse' } }, ST(58, 35, 40, 78, 25, 10, 92, 65)),
    pl('lump', 'KEV LUMP', 8, 'FWD', { build: 'bulky', size: 1.12, hair: 'spiky', skin: '#f0c8a8', hairColor: '#c86a2a', voice: { f0: 125, wave: 'saw' } }, ST(66, 62, 50, 55, 35, 10, 78, 60)),
    pl('needham', 'NORMAN NEEDHAM', 9, 'FWD', { short: 'NEEDHAM', nick: 'THE NODDER', captain: true, super: 'row-z', build: 'heroic', size: 1.2, hair: 'short', skin: '#e8b890', hairColor: '#2a1a10', voice: { f0: 115, wave: 'pulse' }, header: 95 }, ST(68, 80, 50, 50, 40, 10, 80, 55))
  ] });
EF.def('team', 'pasapasa', { name: 'REAL PASAPASA', short: 'RPP', nick: 'LOS PASITOS', city: 'SOLERA', stadium: 'pasapasa', formation: '1-2-1', tactic: 'keepball', chant: 'pasapasa', celebration: 'cornerflag', crowd: { factor: 1 }, tifo: 'OLÉ OLÉ',
  kits: { home: { shirt: '#f4f2ec', color2: '#9a7ad0', pattern: 'plain', shorts: '#f4f2ec', socks: '#9a7ad0', number: '#6a4aa0' }, away: { shirt: '#9a7ad0', color2: '#f4f2ec', pattern: 'sash', shorts: '#5a4a80', socks: '#f4f2ec', number: '#ffffff' }, keeper: { shirt: '#e86a3a', color2: '#f4f2ec', pattern: 'plain', shorts: '#2a2a2a', socks: '#e86a3a', glove: '#f4f2ec' } },
  crest: { shape: 'circle', field: '#f4f2ec', ring: '#9a7ad0', charges: ['sun', 'arrows'] },
  players: [
    pl('portero', 'PACO PORTERO', 1, 'GK', { size: 1.12, hair: 'short', skin: '#d8a070', hairColor: '#1a1210', voice: { f0: 135, wave: 'saw' } }, ST(64, 30, 70, 40, 40, 72, 60, 30)),
    pl('rondo', 'RAFA RONDO', 4, 'DEF', { size: 1.1, hair: 'long', skin: '#d8a070', hairColor: '#2a1a10', voice: { f0: 145, wave: 'saw' } }, ST(72, 45, 82, 68, 65, 10, 60, 40)),
    pl('toque', 'TITO TOQUE', 6, 'MID', { size: 1.06, hair: 'spiky', skin: '#e8b890', hairColor: '#3a2a1a', voice: { f0: 170, wave: 'saw' } }, ST(76, 60, 94, 55, 82, 10, 45, 30)),
    pl('interior', 'IKER INTERIOR', 8, 'MID', { size: 1.08, hair: 'short', skin: '#c89060', hairColor: '#1a1210', voice: { f0: 155, wave: 'saw' } }, ST(78, 66, 88, 52, 80, 10, 50, 30)),
    pl('pasarela', 'PEPITO PASARELA', 10, 'FWD', { captain: true, super: 'pasodoble', build: 'chibi', size: 1.02, hair: 'spiky', skin: '#e0b080', hairColor: '#141010', voice: { f0: 230, wave: 'saw' }, celebration: 'cornerflag' }, ST(86, 80, 92, 40, 94, 10, 35, 40))
  ] });
EF.def('team', 'stahlpresse', { name: 'SV STAHLPRESSE 04', short: 'SVS', nick: 'DIE PRESSEN', city: 'EISENHUTTE', stadium: 'stahlpresse', formation: '1-2-1', tactic: 'gegenpress', chant: 'stahlpresse', celebration: 'robot', crowd: { factor: 1.05 }, tifo: 'STAHL!',
  kits: { home: { shirt: '#6a7078', color2: '#ff7a1a', pattern: 'halves', shorts: '#2a2e34', socks: '#ff7a1a', number: '#ffffff' }, away: { shirt: '#ff7a1a', color2: '#2a2e34', pattern: 'plain', shorts: '#2a2e34', socks: '#2a2e34', number: '#2a2e34' }, keeper: { shirt: '#c8e040', color2: '#2a2e34', pattern: 'plain', shorts: '#2a2e34', socks: '#c8e040', glove: '#2a2e34' } },
  crest: { shape: 'shield', field: '#2a2e34', ring: '#ff7a1a', charges: ['cog', 'hammer'] },
  players: [
    pl('mauer', 'MANNI MAUER', 1, 'GK', { build: 'bulky', size: 1.16, hair: 'short', skin: '#f0d0b0', hairColor: '#e0c060', voice: { f0: 110, wave: 'pulse' } }, ST(60, 30, 60, 45, 30, 78, 84, 40)),
    pl('fleiss', 'FRANZI FLEISS', 2, 'DEF', { size: 1.08, hair: 'ponytail', skin: '#f0d0b0', hairColor: '#e8d080', voice: { f0: 205, wave: 'saw' } }, ST(90, 50, 70, 80, 55, 10, 60, 50)),
    pl('umschalt', 'UWE UMSCHALT', 5, 'MID', { size: 1.12, hair: 'short', skin: '#e8c0a0', hairColor: '#5a4030', voice: { f0: 130, wave: 'pulse' } }, ST(84, 62, 78, 74, 60, 10, 66, 55)),
    pl('jagd', 'JÜRGEN JAGD', 7, 'FWD', { size: 1.1, hair: 'spiky', skin: '#f0d0b0', hairColor: '#2a2a2a', voice: { f0: 145, wave: 'saw' } }, ST(92, 76, 64, 66, 66, 10, 60, 60)),
    pl('hammerschmidt', 'KLAUS HAMMERSCHMIDT', 9, 'FWD', { short: 'HAMMERSCHMIDT', captain: true, super: 'hammerschlag', build: 'bulky', size: 1.24, hair: 'bald', skin: '#f0d0b0', voice: { f0: 95, wave: 'pulse' } }, ST(76, 88, 62, 70, 50, 10, 90, 60))
  ] });
EF.def('team', 'lucchetto', { name: 'AC LUCCHETTO', short: 'ACL', nick: 'I LUCCHETTI', city: 'CASTELFORTEZZA', stadium: 'lucchetto', formation: '2-1-1', tactic: 'catenaccio', chant: 'lucchetto', celebration: 'badgekiss', crowd: { factor: 1 }, tifo: 'LA CHIAVE SIAMO NOI',
  kits: { home: { shirt: '#7a1a2a', color2: '#c8ccd4', pattern: 'plain', shorts: '#7a1a2a', socks: '#c8ccd4', number: '#c8ccd4' }, away: { shirt: '#c8ccd4', color2: '#7a1a2a', pattern: 'stripes', shorts: '#c8ccd4', socks: '#7a1a2a', number: '#7a1a2a' }, keeper: { shirt: '#1a1a1a', color2: '#7a1a2a', pattern: 'plain', shorts: '#1a1a1a', socks: '#1a1a1a', glove: '#c8ccd4' } },
  crest: { shape: 'shield', field: '#7a1a2a', ring: '#c8ccd4', charges: ['padlock', 'laurel'] },
  players: [
    pl('riparo', 'ROCCO RIPARO', 1, 'GK', { size: 1.16, hair: 'long', skin: '#d8a880', hairColor: '#1a1210', voice: { f0: 120, wave: 'pulse' } }, ST(62, 30, 60, 50, 30, 80, 70, 55)),
    pl('difesa', 'DINO DIFESA', 3, 'DEF', { build: 'bulky', size: 1.14, hair: 'short', skin: '#d8a880', hairColor: '#1a1210', voice: { f0: 110, wave: 'pulse' } }, ST(66, 40, 62, 86, 40, 10, 80, 75)),
    pl('marcatura', 'MARCO MARCATURA', 5, 'DEF', { size: 1.12, hair: 'short', skin: '#e0b090', hairColor: '#3a2a1a', voice: { f0: 125, wave: 'pulse' } }, ST(72, 45, 64, 84, 45, 10, 74, 80)),
    pl('fallo', 'FABIO FALLO', 7, 'MID', { size: 1.08, hair: 'long', skin: '#e0b090', hairColor: '#2a1a10', voice: { f0: 160, wave: 'saw' }, bio: 'The diver. Goes down at the first touch.' }, ST(78, 62, 76, 60, 72, 10, 50, 90)),
    pl('serratura', 'SALVATORE SERRATURA', 10, 'FWD', { short: 'SERRATURA', captain: true, super: 'chiave', size: 1.12, hair: 'short', skin: '#d8a070', hairColor: '#141010', voice: { f0: 135, wave: 'saw' } }, ST(86, 86, 72, 50, 80, 10, 60, 65))
  ] });
EF.def('team', 'opulence', { name: 'OLYMPIQUE OPULENCE', short: 'OPU', nick: 'LES MILLIARDAIRES', city: 'AURELIA', stadium: 'euphorium', formation: '1-2-1', tactic: 'galacticos', chant: 'opulence', celebration: 'helicopter', crowd: { factor: 1.3 }, owner: 'baron', tifo: 'MONEY TALKS', boss: true,
  kits: { home: { shirt: '#e8c040', color2: '#141414', pattern: 'stripes', shorts: '#141414', socks: '#e8c040', number: '#141414' }, away: { shirt: '#141414', color2: '#e8c040', pattern: 'sash', shorts: '#141414', socks: '#e8c040', number: '#e8c040' }, keeper: { shirt: '#8a3ad0', color2: '#e8c040', pattern: 'plain', shorts: '#141414', socks: '#8a3ad0', glove: '#e8c040' } },
  crest: { shape: 'shield', field: '#141414', ring: '#e8c040', charges: ['crown', 'coins'] },
  players: [
    pl('vault', 'GUNNAR VAULT', 1, 'GK', { short: 'VAULT', nick: 'THE VAULT', boss: true, build: 'bulky', size: 1.5, hair: 'short', skin: '#f0d0b0', hairColor: '#e8e0c0', voice: { f0: 80, wave: 'pulse' }, bio: 'The boss keeper. Reach +40%. Catches anything under 300.' }, ST(62, 40, 60, 60, 30, 90, 95, 40)),
    pl('cash', 'CASPIAN CASH', 4, 'DEF', { size: 1.14, hair: 'short', skin: '#e8c0a0', hairColor: '#c8a050', voice: { f0: 130, wave: 'saw' } }, ST(82, 60, 80, 84, 70, 10, 75, 45)),
    pl('bling', 'BENTLEY BLING', 8, 'MID', { size: 1.1, hair: 'spiky', skin: '#8a5a3a', hairColor: '#e8c040', voice: { f0: 160, wave: 'saw' } }, ST(86, 78, 88, 60, 90, 10, 55, 50)),
    pl('sovereign', 'SERGEI SOVEREIGN', 11, 'FWD', { size: 1.12, hair: 'short', skin: '#f0d0b0', hairColor: '#2a1a10', voice: { f0: 140, wave: 'saw' } }, ST(96, 84, 74, 45, 86, 10, 60, 50)),
    pl('dor', "MAXIMILIEN D'OR", 10, 'FWD', { short: "D'OR", captain: true, super: 'botte-dor', build: 'heroic', size: 1.16, hair: 'long', skin: '#e8c0a0', hairColor: '#e8c040', voice: { f0: 150, wave: 'saw' }, celebration: 'helicopter' }, ST(90, 94, 86, 40, 92, 10, 58, 70))
  ] });

/* formations: u from the own goal line (0) to the other (1), v across from the north touchline (0) */
EF.def('formation', '2-2', { name: '2-2', roles: { GK: { base: [.03, .5], keeper: true }, DEFL: { base: [.22, .3] }, DEFR: { base: [.22, .7] }, FWDL: { base: [.6, .32] }, FWDR: { base: [.6, .68] } }, drop: 'FWDR' });
EF.def('formation', '1-2-1', { name: '1-2-1', roles: { GK: { base: [.03, .5], keeper: true }, DEF: { base: [.22, .5] }, MIDL: { base: [.42, .28] }, MIDR: { base: [.42, .72] }, FWD: { base: [.64, .5] } }, drop: 'MIDR' });
EF.def('formation', '2-1-1', { name: '2-1-1', roles: { GK: { base: [.03, .5], keeper: true }, DEFL: { base: [.22, .32] }, DEFR: { base: [.22, .68] }, MID: { base: [.45, .5] }, FWD: { base: [.68, .5] } }, drop: 'MID' });
EF.def('formation', '3-1', { name: '3-1', roles: { GK: { base: [.03, .5], keeper: true }, DEFL: { base: [.16, .25] }, DEF: { base: [.13, .5] }, DEFR: { base: [.16, .75] }, FWD: { base: [.55, .5] } }, drop: 'DEFL' });

/* tactics (section 6.13) */
EF.def('tactic', 'plucky', { name: 'PLUCKY', press: .55, pressers: 1, line: .45, width: .8, tempo: .7, passRisk: .5, shortBias: .6, longBall: .2, dribble: .45, skill: .4, shootRange: 175, shootBias: 1, foul: .2, dive: .05, gimmick: null });
EF.def('tactic', 'routeone', { name: 'ROUTE ONE', press: .4, pressers: 1, line: .4, width: .85, tempo: .5, passRisk: .6, shortBias: .3, longBall: .6, dribble: .25, skill: .1, shootRange: 190, shootBias: 1.1, foul: .25, dive: 0, gimmick: 'routeone' });
EF.def('tactic', 'keepball', { name: 'KEEP BALL', press: .55, pressers: 1, line: .5, width: .6, tempo: .85, passRisk: .2, shortBias: .9, longBall: .05, dribble: .25, skill: .3, shootRange: 170, shootBias: .8, foul: .1, dive: .1, gimmick: 'keepball' });
EF.def('tactic', 'gegenpress', { name: 'GEGENPRESS', press: .9, pressers: 2, line: .7, width: .8, tempo: 1, passRisk: .5, shortBias: .6, longBall: .15, dribble: .4, skill: .3, shootRange: 180, shootBias: 1, foul: .3, dive: .05, aggr: 1.2, gimmick: 'gegenpress' });
EF.def('tactic', 'catenaccio', { name: 'CATENACCIO', press: .3, pressers: 1, line: .15, width: .7, tempo: .6, passRisk: .4, shortBias: .5, longBall: .35, dribble: .35, skill: .35, shootRange: 175, shootBias: 1, foul: .6, dive: .5, aggr: 1.1, gimmick: 'catenaccio' });
EF.def('tactic', 'galacticos', { name: 'GALACTICOS', press: .55, pressers: 1, line: .55, width: .85, tempo: .9, passRisk: .5, shortBias: .6, longBall: .15, dribble: .7, skill: .8, shootRange: 190, shootBias: 1.1, foul: .2, dive: .1, gimmick: 'galacticos' });

/* referees (section 7.1) */
EF.def('referee', 'haltwhistle', { name: 'ARTHUR HALTWHISTLE', strictness: 1.3, gullibility: .2, varHappy: .4, voice: { f0: 135, wave: 'saw' }, line: 'The best referee in Europe. He says so himself.' });
EF.def('referee', 'patience', { name: 'PIERRE PATIENCE', strictness: .7, gullibility: .5, varHappy: .3, voice: { f0: 150, wave: 'saw' }, line: 'Lets the game flow. And flow. And flow.' });
EF.def('referee', 'ironside', { name: 'INGRID IRONSIDE', strictness: 1.1, gullibility: .3, varHappy: .5, voice: { f0: 200, wave: 'saw' }, line: 'Has never smiled on a pitch. Allegedly.' });
EF.def('referee', 'severo', { name: 'SERGIO SEVERO', strictness: 1.2, gullibility: .7, varHappy: .9, voice: { f0: 140, wave: 'saw' }, line: 'Dramatic. Falls for everything. Loves VAR.' });

/* super strikes (section 6.9): one per captain, and the team super */
EF.def('super', 'smoked-kipper', { name: 'THE SMOKED KIPPER', path: 'wobble', params: { amp: 18, freq: 3.5 }, trail: 'smoke', color: '#f08a24', ball: 'kipper' });
EF.def('super', 'row-z', { name: 'ROW Z RETURN', path: 'meteor', params: {}, trail: 'fire', color: '#e8a830' });
EF.def('super', 'pasodoble', { name: 'EL PASODOBLE', path: 'zigzag', params: { amp: 30 }, trail: 'sparkle', color: '#9a7ad0' });
EF.def('super', 'hammerschlag', { name: 'DER HAMMERSCHLAG', path: 'hammer', params: {}, trail: 'sparks', color: '#ff7a1a' });
EF.def('super', 'chiave', { name: 'LA CHIAVE', path: 'around', params: {}, trail: 'smoke', color: '#c8ccd4' });
EF.def('super', 'botte-dor', { name: "LA BOTTE D'OR", path: 'split', params: {}, trail: 'gold', color: '#e8c040' });
EF.def('super', 'rocket', { name: 'ROCKET', path: 'rocket', params: {}, trail: 'fire', color: '#ff6a3a' });

/* celebrations (section 6.21): clip and procedural recipe, how long, how much Euphoria */
EF.def('celebration', 'kneeslide', { name: 'KNEE SLIDE', clip: 'Slide_Loop', proc: 'armsOut', travel: 120, dur: 2.2, euphoria: 8 });
EF.def('celebration', 'backflip', { name: 'BACKFLIP', clip: 'Backflip', dur: 2.2, euphoria: 12 });
EF.def('celebration', 'cartwheel', { name: 'CARTWHEEL', clip: 'Cartwheel', dur: 2.4, euphoria: 10 });
EF.def('celebration', 'aeroplane', { name: 'AEROPLANE', proc: 'aeroplane', travel: 80, dur: 2.4, euphoria: 8 });
EF.def('celebration', 'robot', { name: 'THE ROBOT', clip: 'Dance_Simple', speed: .6, proc: 'robot', dur: 2.6, euphoria: 9 });
EF.def('celebration', 'shirt', { name: 'SHIRT OVER HEAD', clip: 'Cheering_Two_Hands', proc: 'hood', dur: 2.4, euphoria: 15, card: true });
EF.def('celebration', 'cornerflag', { name: 'CORNER-FLAG DANCE', clip: 'Dance_Simple', dur: 2.6, euphoria: 10 });
EF.def('celebration', 'badgekiss', { name: 'BADGE KISS', clip: 'Greeting', dur: 2.2, euphoria: 6 });
EF.def('celebration', 'helicopter', { name: 'HELICOPTER', clip: 'Breakdance_Helicopter', dur: 2.6, euphoria: 12 });
EF.def('celebration', 'fishslap', { name: 'THE FISH SLAP', proc: 'fishslap', dur: 2.6, euphoria: 14, prop: 'kipper' });
EF.def('celebration', 'cheer', { name: 'BOTH ARMS UP', clip: 'Cheering_Two_Hands', dur: 2.2, euphoria: 6 });
/* ==== src/51-stadiums.js ==== */
/* STADIUMS (section 7.2): each with its weather, time of day, pitch, stands, skyline, crowd, events, boards and lights.
 * The training ground (rec) has no stands. */
EF.def('stadium', 'smokehouse', { name: 'THE SMOKEHOUSE', city: 'KIPPERTON', capacity: 3112, time: 'dusk', night2: true, referee: 'haltwhistle',
  weather: { kind: 'rain', amount: .7, wind: .4 }, surface: 'grass', mud: [[.04, .5, 40], [.96, .5, 40]], puddles: 6, grass: ['#3c7232', '#468238'], wear: .6, lines: '#e0e4d8', apron: '#3a3e36', outside: '#14161a',
  stands: { north: { tiers: 3, heights: [30, 40, 50], seats: '#2e3444', roof: 'corrugated' }, end: { tiers: 2, kind: 'terrace' } }, seats: '#2e3444', seats2: '#363c4c', standSide: '#3e4250', boardSide: '#1e2a46',
  crowd: { size: 600, home: .82 }, sky: ['#141a34', '#3a3050', '#c86a4a'], skyline: ['chimneys', 'harbour', 'lighthouse'], skyColor: '#1a1c28',
  lights: { ambient: .55, night: .42, color: '#fff0d0' }, boards: ["SMOKY JOE'S KIPPERS", 'GULL INSURANCE: WE COVER EVERYTHING', 'PIE-O-MATIC', 'FISH-OIL FLOODLIGHTS LTD'],
  events: ['seagull', 'floodlight', 'invader-keith'], music: null, windDir: 1, thumb: '#3c7232' });
EF.def('stadium', 'pasapasa', { name: 'ESTADIO PASAPASA', city: 'SOLERA', capacity: 41000, time: 'day', referee: 'patience',
  weather: null, surface: 'hard', mud: [], puddles: 0, grass: ['#4a9a3a', '#58ac44'], wear: .15, lines: '#f4f4ec', apron: '#b08a5a', outside: '#c8a070',
  stands: { north: { tiers: 5, heights: [30, 40, 50, 60, 70], seats: '#e8e0d0' }, end: { tiers: 4 } }, seats: '#e8e0d0', seats2: '#d8c8b0', standSide: '#d8d0c0', standFace: 'plaster', boardSide: '#6a4aa0',
  crowd: { size: 1400, home: .75 }, sky: ['#3a7ad0', '#7ab0e8', '#e8d8b0'], skyline: ['palms', 'dome', 'hills'], skyColor: '#c89a6a',
  lights: { ambient: .95, color: '#fff8e0' }, boards: ['EUROPHORIA COLA', 'SIESTA MATTRESSES: SLEEP THROUGH THE SECOND HALF', 'PIE-O-MATIC', 'OLÉ AIRWAYS'],
  events: ['beachball'], music: null, thumb: '#58ac44' });
EF.def('stadium', 'stahlpresse', { name: 'STAHLPRESSE ARENA', city: 'EISENHUTTE', capacity: 52000, time: 'night', referee: 'ironside',
  weather: { kind: 'snow', amount: .6, wind: .1 }, surface: 'snow', mud: [], puddles: 0, grass: ['#3a6a3a', '#447444'], wear: .2, lines: '#e8ecf0', apron: '#5a5e66', outside: '#1a1c22',
  stands: { north: { tiers: 6, heights: [32, 44, 56, 68, 80, 92], seats: '#3a3e46' }, end: { tiers: 4 } }, seats: '#3a3e46', seats2: '#ff7a1a', standSide: '#4a4e58', standFace: 'stone', boardSide: '#2a2e34',
  crowd: { size: 1600, home: .8 }, sky: ['#05060c', '#121828', '#2a3048'], skyline: ['steelworks', 'mountains'], skyColor: '#141824',
  lights: { ambient: .4, night: .4, color: '#e8f0ff' }, boards: ['STAHLPRESSE: WE PRESS HARDER', 'GULL INSURANCE: WE COVER EVERYTHING', 'EUROPHORIA COLA', 'IRON LUNG THROAT SWEETS'],
  events: ['invader-stag', 'floodlight'], music: null, thumb: '#e8ecf0' });
EF.def('stadium', 'lucchetto', { name: 'STADIO LUCCHETTO', city: 'CASTELFORTEZZA', capacity: 38000, time: 'dusk', night2: true, fog2: true, uneven: true, referee: 'severo',
  weather: null, surface: 'grass', mud: [[.5, .5, 30]], puddles: 0, grass: ['#3e7634', '#48823c'], wear: .45, lines: '#e8e8dc', apron: '#5a4a3a', outside: '#1e1a18',
  stands: { north: { tiers: 4, heights: [32, 42, 52, 62], seats: '#5a2a30' }, end: { tiers: 4 } }, seats: '#5a2a30', seats2: '#6a3a3a', standSide: '#7a6a5a', standFace: 'stone', boardSide: '#4a1a22',
  crowd: { size: 1200, home: .8 }, sky: ['#1a1428', '#4a2a3a', '#d87a4a'], skyline: ['walls', 'belltower', 'cypress'], skyColor: '#2a1e1e',
  lights: { ambient: .55, night: .45, color: '#ffe0b0' }, boards: ['CASTELFORTEZZA LOCKSMITHS', 'NONNA GINA PASTA', 'EUROPHORIA COLA', 'VAR: VERY ANNOYING REPLAYS'],
  events: ['flaresmoke'], music: null, thumb: '#48823c' });
EF.def('stadium', 'euphorium', { name: 'THE EUPHORIUM', city: 'AURELIA', capacity: 90000, time: 'night', referee: 'haltwhistle',
  weather: null, surface: 'grass', mud: [], puddles: 0, grass: ['#3e8a3a', '#4a9a44'], wear: 0, lines: '#ffffff', apron: '#2a2a3a', outside: '#0e0e16',
  stands: { north: { tiers: 6, heights: [34, 46, 58, 70, 82, 94], seats: '#c8a040' }, end: { tiers: 4 } }, seats: '#c8a040', seats2: '#e8c040', standSide: '#3a3448', standFace: 'stone', boardSide: '#141414',
  crowd: { size: 1600, home: .5 }, sky: ['#04040c', '#0c0c24', '#2a1a4a'], skyline: ['dome', 'searchlights'], skyColor: '#0c0a18', jumbotron: true,
  lights: { ambient: .45, night: .45, color: '#fff8f0' }, boards: ['BULLION BANK: MONEY TALKS', 'EUROPHORIA COLA', 'GOLDEN BOOT POLISH', 'CAVIAR EXPRESS'],
  events: ['drone', 'fireworks'], music: null, thumb: '#4a9a44' });
EF.def('stadium', 'rec', { name: 'KIPPERTON REC', city: 'KIPPERTON', capacity: 8, time: 'day', referee: 'haltwhistle', training: true,
  weather: null, surface: 'grass', mud: [[.3, .7, 24], [.7, .3, 20]], puddles: 0, grass: ['#4a7a3e', '#527e44'], wear: .5, lines: '#d8dcd0', apron: '#5a6a4a', outside: '#5a6450',
  stands: { north: { tiers: 1, heights: [16], seats: '#6a5a4a' }, end: { tiers: 1 } }, seats: '#6a5a4a', seats2: '#5a4a3a', standSide: '#6a6050', standFace: 'plank', boardSide: '#3a4a3a',
  crowd: { size: 8, home: 1 }, sky: ['#7a8aa0', '#a8b4c4', '#c8ccd0'], skyline: ['seawall'], skyColor: '#5a6470',
  lights: { ambient: .85, color: '#f0f0ff' }, boards: ['KIPPERTON REC: NO DOGS', 'MAGS MULLIGAN FISH: FRESH TODAY'], events: [], music: null, thumb: '#527e44' });
EF.CUP_STADIUMS = ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium'];
EF.TEAM_IDS = ['kipperton', 'hoofington', 'pasapasa', 'stahlpresse', 'lucchetto', 'opulence'];
/* ==== src/52-story.js ==== */
/* THE STORY (section 7.3): the cup's rounds and beats, team talks, Gaffer's Challenges and the sticker album (7.5).
 * Tone: British football broadcasting and tabloid back pages, turned up; affectionate, never mean. */
EF.CUP = {
  name: 'THE EUROPHORIA CUP',
  rounds: [
    { id: 'r1', name: 'QUALIFYING ROUND', short: 'QUALIFIER', opp: 'hoofington', stadium: 'smokehouse', referee: 'haltwhistle', challenge: 'header', home: true, city: 'kipperton' },
    { id: 'r2', name: 'ROUND OF 16', short: 'LAST 16', opp: 'pasapasa', stadium: 'pasapasa', referee: 'patience', challenge: 'recover5', city: 'solera' },
    { id: 'r3', name: 'QUARTER-FINAL', short: 'QUARTERS', opp: 'stahlpresse', stadium: 'stahlpresse', referee: 'ironside', challenge: 'nutmeg', city: 'eisenhutte' },
    { id: 'r4', name: 'SEMI-FINAL', short: 'SEMIS', opp: 'lucchetto', stadium: 'lucchetto', referee: 'severo', challenge: 'freekickGoal', city: 'castelfortezza' },
    { id: 'r5', name: 'FINAL', short: 'FINAL', opp: 'opulence', stadium: 'euphorium', referee: 'haltwhistle', challenge: 'superGoal', city: 'aurelia' }
  ],
  // the map of a fictional Europe: cities in map units (0..1)
  cities: { kipperton: [.32, .2, 'KIPPERTON'], solera: [.22, .78, 'SOLERA'], eisenhutte: [.62, .36, 'EISENHUTTE'], castelfortezza: [.56, .7, 'CASTELFORTEZZA'], aurelia: [.42, .5, 'AURELIA'] }
};
const TAB = (headline, sub, body, photo) => ({ kind: 'tabloid', headline, sub, body, photo });
const TALK = (lines, o = {}) => Object.assign({ kind: 'talk', lines }, o);
EF.def('beat', 'prologue', { steps: [
  TAB('FISH OUT OF WATER!', "Typo sends tiny Kipperton into the Europhoria Cup. 'Rules are rules,' shrugs the Federation.", 'Population 3,112. Floodlights powered by fish oil. Fourteen pounds in the kitty. Europe, brace yourselves.', { team: 'kipperton', player: 'pilchard', pose: 'cheer', expr: 'smile' }),
  TALK([['clerk', 'Dear Kingsbridge Albion. Oh. No. Dear... Kipperton Athletic. You are invited to the Europhoria Cup.'], ['clerk', 'An invitation is an invitation. Those are the rules. Please do not tell anyone.']], { place: 'the Federation' }),
  TALK([['mags', 'Right, you lot. Fourteen quid in the kitty, a minibus with three good tyres, and a letter that says EUROPE.'], ['pilchard', 'Gaffer, do they have chips in Europe?'], ['mags', 'They have EVERYTHING in Europe, Darren. Including teams that will eat us for breakfast.'], ['okafor', "Let 'em try. I've got an appetite and all."], ['mags', "That's the spirit. First up, at home: AFC Hoofington. Route-one merchants. Keep your heads up. Literally."]],
    { place: 'the Smokehouse', choices: ["LET'S PLAY", 'TRAINING FIRST'], sticker: 'mags' })
] });
EF.def('beat', 'r1-pre', { round: 0, steps: [
  TAB('THE LONG AND THE SHORT OF IT', "Hoofington's aerial bombardment heads for Kipperton's puddles.", 'The Hoofers have not completed a pass along the ground since 1994. They have never needed to.', { team: 'hoofington', player: 'needham', pose: 'hips', expr: 'angry' }),
  TALK([['needham', "We don't pass, love. We 'oof."], ['mags', 'Then we keep it on the floor, where they cannot reach it. Short passes, quick feet.']]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r1-win', { steps: [TAB('KIP KIP HOORAY!', 'Kippers net a famous win in the Smokehouse rain.', 'Fans danced on the harbour wall until the tide came in.', { team: 'kipperton', player: 'pilchard', pose: 'cheer', expr: 'shout' }), TALK([['mags', 'Not bad. Not good. But not bad.'], ['trev', 'A proper cold night, and they have warmed it up.']])] });
EF.def('beat', 'r1-loss', { steps: [TAB('BATTERED!', 'Kipperton sunk by the Hoofington long ball.', 'The fish-oil floodlights were switched off early to save money.', { team: 'hoofington', player: 'needham', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r2-pre', { round: 1, steps: [
  { kind: 'travel', from: 'kipperton', to: 'solera', postcard: "WISH YOU WERE HERE (IT'S HOT)" },
  TAB('PASS THE PARCEL', 'Kippers must stop the passing masters... if they can find the ball.', 'Real Pasapasa completed 1,204 passes in their last match. Their opponents completed a crossword.', { team: 'pasapasa', player: 'pasarela', pose: 'hips', expr: 'smile' }),
  TALK([['pasarela', 'You will chase the ball until you are dizzy, little fishes.'], ['okafor', "I've chased gulls off a chip van in a gale. I can chase a ball."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r2-win', { steps: [TAB('SOLE-DESTROYING FOR SOLERA!', 'Kippers pinch the ball and the points in the sunshine.', 'Real Pasapasa fans waved their handkerchiefs. Some in surrender.', { team: 'kipperton', player: 'nowak', pose: 'cheer', expr: 'smile' }), TALK([['nowak', 'I counted. They made 412 passes.'], ['mags', "And we made two goals. Football's a funny old game."]])] });
EF.def('beat', 'r2-loss', { steps: [TAB('PASSED OUT', 'Kippers left dizzy by the passing masters.', 'Several Kipperton players are still looking for the ball.', { team: 'pasapasa', player: 'pasarela', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r3-pre', { round: 2, steps: [
  { kind: 'travel', from: 'solera', to: 'eisenhutte', postcard: 'SNOW CHAINS FITTED (TWO OF THEM)', snow: true },
  TAB('PRESSED FOR TIME', "The Steel Machine never stops running. Kipperton's bus barely starts.", 'SV Stahlpresse 04 train by running up a mountain. Twice. Before breakfast.', { team: 'stahlpresse', player: 'hammerschmidt', pose: 'guard', expr: 'angry' }),
  TALK([['hammerschmidt', 'We run. You run. We run more.'], ['tran', "Then I'll just have to run round you, big man."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r3-win', { steps: [TAB('KIPPERS MELT THE STEEL!', 'Fish-oil fire burns through the snow.', 'Even the Steel Stag was seen applauding. Then he was escorted out.', { team: 'kipperton', player: 'tran', pose: 'cheer', expr: 'shout' }), TALK([['tran', 'Did you see his face when it went through his legs?'], ['okafor', 'Did you see mine? Frozen solid.']])] });
EF.def('beat', 'r3-loss', { steps: [TAB('CRUSHED', 'The Steel Machine presses Kipperton flat.', 'The minibus has been towed home. So has the team.', { team: 'stahlpresse', player: 'hammerschmidt', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r4-pre', { round: 3, steps: [
  { kind: 'travel', from: 'eisenhutte', to: 'castelfortezza', postcard: 'THE PASTA IS INCREDIBLE. SEND HELP.' },
  TAB('PADLOCK AND KEY', "Can Kipperton crack Europe's meanest defence? Locksmiths on standby.", 'AC Lucchetto have not conceded at home since the invention of the padlock.', { team: 'lucchetto', player: 'serratura', pose: 'hips', expr: 'smile' }),
  TALK([['serratura', 'Nobody scores against Lucchetto. Nobody. We lock the door and we eat the key.'], ['mags', "They'll dive, they'll moan, and if they go ahead they'll park the bus. Don't fall for any of it."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r4-win', { steps: [TAB('THEY PARKED THE BUS - WE STOLE IT!', 'Kippers pick the lock and drive off into the final.', 'Castelfortezza locksmiths report record business.', { team: 'kipperton', player: 'okafor', pose: 'cheer', expr: 'shout' })] });
EF.def('beat', 'r4-loss', { steps: [TAB('LOCKED OUT', 'Lucchetto throw away the key on Kipperton.', 'The bus is still parked there. Nobody dares move it.', { team: 'lucchetto', player: 'fallo', pose: 'cheer', expr: 'smile' })] });
EF.def('beat', 'villain', { steps: [
  TALK([['baron', 'Mister Pilchard. Fifty million. A gold-plated jet ski. And all the caviar you can eat.'], ['pilchard', 'All of it?'], ['baron', 'All of it. Sign for Opulence, and the final... well. Who needs a final?']],
    { place: 'a hotel lobby, night', choices: ["I'M A KIPPER, MATE. ALWAYS.", '...DOES THE JET SKI COME IN ORANGE?'], villain: true })
] });
EF.def('beat', 'villain-loyal', { steps: [TALK([['pilchard', "I'm a Kipper, mate. Always. Keep your jet ski."], ['baron', 'You will regret this, little fish.'], ['mags', 'He will not. Get to bed, Darren.']])] });
EF.def('beat', 'villain-joke', { steps: [TALK([['pilchard', 'Only joking, Gaffer! Kipper till I die.'], ['mags', 'You nearly gave me a heart attack.'], ['baron', 'Hmph. We shall see who laughs at the final.']])] });
EF.def('beat', 'r5-pre', { round: 4, steps: [
  { kind: 'travel', from: 'castelfortezza', to: 'aurelia', postcard: 'THE STADIUM IS MADE OF GOLD. ACTUAL GOLD.' },
  TAB('DAVID VS GOLDIATH', 'Fish-oil floodlights meet the richest club on Earth.', "Olympique Opulence's keeper alone cost more than the town of Kipperton. Twice.", { team: 'opulence', player: 'dor', pose: 'hips', expr: 'smile' }),
  TALK([['dor', 'I have three Golden Boots. You have... boots.'], ['pilchard', "These boots have been in the family for years, mate."], ['mags', "This is it. Feed the crowd, look after the ball, and when the moment comes: hit it like a train."]]),
  { kind: 'teamtalk' }, { kind: 'challenge' }, { kind: 'tunnel' }, { kind: 'match' }
] });
EF.def('beat', 'r5-loss', { steps: [TAB('SO CLOSE!', 'Golden boys break Kipper hearts.', 'But Kipperton have never been prouder. Probably.', { team: 'opulence', player: 'dor', pose: 'cheer', expr: 'smile' })] });
EF.def('beat', 'ending', { steps: [TAB('THE PLAICE TO BE: KIPPERS ARE KINGS OF EUROPE!', 'Typo club lifts the Europhoria Cup.', 'Kingsbridge Albion have demanded a recount.', { team: 'kipperton', player: 'pilchard', pose: 'cheer', expr: 'shout' })] });

/* team talks (section 7.3): Mags says one line of three for each */
EF.def('teamtalk', 'hairdryer', { name: 'HAIRDRYER', desc: '+10% speed and tackling for 15 minutes. The ref gets stricter.', lines: ['Get out there and TERRIFY them!', 'I want to see fire! FIRE! Not the fish-oil kind!', 'If you lose, you are walking home. All of you.'], buff: { hairdryer: true } });
EF.def('teamtalk', 'arm', { name: 'ARM ROUND THE SHOULDER', desc: 'Stamina recovers 25% faster. Start with 15 Euphoria.', lines: ["Just enjoy it. Your mum's watching.", 'Whatever happens, I am proud of you. Now go and win.', 'Deep breaths. Smell that? That is Europe. And kippers.'], buff: { regen: 1.25 }, euphoria: 15 });
EF.def('teamtalk', 'tactics', { name: 'TACTICS BOARD', desc: 'Pick the formation. Passing +10% accuracy.', lines: ["Here's the plan.", 'Magnets on the board. Watch the magnets.', 'This is you. This is them. Do not be them.'], buff: { pass: 10 }, formation: true });

/* the Gaffer's Challenges (section 7.3): an optional objective per round; a shiny sticker; all five unlock Old Leather */
EF.def('challenge', 'header', { name: 'SCORE A HEADER', test: (ev, st) => ev.type === 'goal' && ev.goal && !ev.goal.own && (ev.goal.kind === 'header' || ev.goal.kind === 'divingHeader') && ev.side === st.side });
EF.def('challenge', 'recover5', { name: 'WIN THE BALL BACK 5 TIMES', test: (ev, st) => { if ((ev.type === 'tackleWon' || ev.type === 'intercept' || ev.type === 'recover') && ev.who && ev.who.side === st.side) st.n = (st.n || 0) + 1; return st.n >= 5; }, progress: st => (st.n || 0) + '/5' });
EF.def('challenge', 'nutmeg', { name: 'NUTMEG AN OPPONENT', test: (ev, st) => ev.type === 'nutmeg' && ev.who && ev.who.side === st.side });
EF.def('challenge', 'freekickGoal', { name: 'SCORE FROM A FREE KICK', test: (ev, st) => ev.type === 'goal' && ev.goal && ev.goal.freekick && ev.side === st.side });
EF.def('challenge', 'superGoal', { name: 'SCORE A SUPER STRIKE', test: (ev, st) => ev.type === 'goal' && ev.goal && ev.goal.super && ev.side === st.side });

/* the sticker album (section 7.5): 51 stickers */
for (const t of EF.TEAM_IDS) {
  const T = EF.get('team', t);
  for (const p of T.players) EF.def('sticker', 'p:' + t + ':' + p.id, { kind: 'player', team: t, ref: p.id, name: p.name, pos: p.pos, how: t === 'kipperton' ? 'A KIPPER FROM THE START' : 'PLAY ' + T.short + ' IN ANY MODE', page: t });
  EF.def('sticker', 'crest:' + t, { kind: 'crest', team: t, name: T.name, how: 'PLAY ' + T.short, page: t });
}
for (const s of EF.CUP_STADIUMS) { const S = EF.get('stadium', s); EF.def('sticker', 'stadium:' + s, { kind: 'stadium', ref: s, name: S.name, how: 'PLAY AT ' + S.name, page: 'stadiums' }); }
for (const c of EF.all('challenge')) EF.def('sticker', 'ch:' + c.id, { kind: 'challenge', ref: c.id, name: c.name, how: "THE GAFFER'S CHALLENGE", shiny: true, page: 'challenges' });
EF.def('sticker', 'mags', { kind: 'special', ref: 'mags', name: 'MAGS MULLIGAN', how: 'FINISH THE PROLOGUE', page: 'specials' });
EF.def('sticker', 'keith', { kind: 'special', ref: 'keith', name: 'KIPPER KEITH', how: 'TACKLE THE PITCH INVADER', page: 'specials' });
EF.def('sticker', 'barrytrev', { kind: 'special', ref: 'barry', name: 'BARRY AND TREV', how: 'HEAR 50 COMMENTARY LINES', page: 'specials' });
EF.def('sticker', 'bus', { kind: 'special', ref: 'bus', name: 'THE BUS', how: 'SCORE PAST THE PARKED BUS', page: 'specials' });
EF.def('sticker', 'loyal', { kind: 'special', ref: 'pilchard', name: 'LOYAL KIPPER', how: 'TURN DOWN THE BARON', page: 'specials' });
EF.ALBUM_PAGES = [...EF.TEAM_IDS.map(t => ({ id: t, title: EF.get('team', t).name })), { id: 'stadiums', title: 'STADIUMS' }, { id: 'challenges', title: "GAFFER'S CHALLENGES" }, { id: 'specials', title: 'SPECIALS' }];
/** stickers earned by a match: its teams' players and crests, its stadium, the bus, the invader */
EF.matchStickers = (m, r) => {
  const got = [];
  EF.quietStickers = true;
  for (const T of m.teams) { for (const p of T.players) if (EF.Save.sticker('p:' + T.id + ':' + p.id)) got.push('p:' + T.id + ':' + p.id); if (EF.Save.sticker('crest:' + T.id)) got.push('crest:' + T.id); }
  if (EF.get('sticker', 'stadium:' + m.stadium.id) && EF.Save.sticker('stadium:' + m.stadium.id)) got.push('stadium:' + m.stadium.id);
  if (m.goals.some(g => g.bus && !g.own) && EF.Save.sticker('bus')) got.push('bus');
  if (m.keithTackled && EF.Save.sticker('keith')) got.push('keith');
  EF.quietStickers = false;
  return got;
};
/* a round's beat again after CONTINUE: straight to the team talk */
for (let i = 1; i <= 5; i++) { const pre = EF.get('beat', 'r' + i + '-pre'); EF.def('beat', 'r' + i + '-pre-retry', { round: i - 1, steps: pre.steps.filter(s => ['teamtalk', 'challenge', 'tunnel', 'match'].includes(s.kind)) }); }
/* ==== src/53-lines.js ==== */
/* COMMENTARY LINES (section 7.4): every pool, original lines only. b = BARRY BELLOW, t = TREV BRICKLEY; a third item
 * is the partner\'s reply; a fourth a condition on the match. */
const LN = (pool, arr) => EF.lines(pool, arr.map(a => ({ who: a[0] === 'b' ? 'barry' : 'trev', text: a[1], reply: a[2] ? { who: a[2][0] === 'b' ? 'barry' : 'trev', text: a[2][1] } : null, when: a[3] || null })));
const KIP = (m, ev) => ev.who && ev.who.team && ev.who.team.id === 'kipperton';
const RAIN = m => m.weather && m.weather.kind === 'rain', SNOW = m => m.weather && m.weather.kind === 'snow';
LN('kickoff', [
  ['b', "And we\'re underway at {$stadium}! Lovely evening for it, Trev.", ['t', "It\'s raining sideways, Barry."], RAIN],
  ['b', "We\'re off! The ball is round, the grass is green, and {$team} are ready."],
  ['b', 'Here we go again! The referee checks his watch, and we are LIVE.', ['t', 'He checked it twice. Thorough man.']],
  ['t', "Kick-off. Let\'s see who\'s had a proper pre-match meal."],
  ['b', "The whistle goes and so do we! Welcome to {$stadium}!"],
  ['b', 'Ninety minutes of football. Well, five of yours, but it feels like ninety!', ['t', 'Feels like a hundred and ninety at my age.']],
  ['t', 'Big game, this. Bigger than my first car.'],
  ['b', "Off we go! {$opp} in their famous kit, {$team} in theirs."],
  ['b', "They\'re away! And the crowd are making a racket!", ['t', "Racket\'s a tennis word, Barry."]],
  ['t', 'Kick-off. Eyes on the ball, everyone. Even the linesmen. Especially the linesmen.'],
  ['b', 'Snow on the pitch, steel in the stands, and here we GO!', null, SNOW],
  ['b', 'The second half is underway!', ['t', 'Same pitch. Different direction. Football.'], m => m.half === 2],
  ['b', 'Restart! {$team} need something special now.', null, m => m.half === 2 && m.score[0] !== m.score[1]],
  ['t', 'Back underway. Somebody tell the substitutes to stop eating.']
]);
LN('goal', [
  ['b', 'OH, YOU BEAUTY! {$player} has absolutely LEATHERED it!'],
  ['b', 'GET IN! Back of the net from {$player}!', ['t', 'Keeper had no chance. None. Nada. Zilch.']],
  ['b', '{$team} score, and the away end is a washing machine!'],
  ['b', 'GOOOAL! {$player}! What a moment! What a MAN!', ['t', 'Decent finish, that.']],
  ['b', "It\'s in! It\'s in! {$player} sticks it in the onion bag!"],
  ['b', "THAT is why you pay the entrance fee! {$player}!", ['t', 'Some of them got in free, Barry.']],
  ['t', "Lovely. Picked his spot, didn\'t panic. Like parking a car."],
  ['b', 'GOAL! {$score}! You could not write it!', ['t', 'Somebody just did, on the scoreboard.']],
  ['b', 'Top bins! TOP BINS! {$player} has found the corner!'],
  ['b', "He\'s done it! {$player}! The net is still wobbling!"],
  ['t', "That\'s a goal. I\'ve checked. Twice."],
  ['b', 'Unbelievable! {$player} with the coolest finish since the invention of the fridge!'],
  ['b', 'OH MY COD! KIPPERTON HAVE SCORED!', ['t', "I\'ll allow the pun. Just this once."], KIP],
  ['b', "That\'s a plaice in history for {$player}!", null, KIP],
  ['b', 'Fish and chips for everyone! {$player} scores for the Kippers!', ['t', "I\'ll have mushy peas, ta."], KIP],
  ['b', "The harbour will be shaking tonight! {$player}!", null, KIP],
  ['b', "Reel it in! {$player} has hooked a big one!", ['t', "That\'s fishing, Barry. This is football."], KIP],
  ['t', 'Kipperton score. Somewhere a lighthouse is flashing on and off.', null, KIP],
  ['b', 'GOLDEN GOAL! {$player} WINS IT!', ['t', "Game over. Everybody go home. Carefully."], m => m.golden]
]);
LN('ownGoal', [
  ['b', "OH NO! It\'s gone in off {$player}! An own goal!", ['t', 'He will want the ground to swallow him. It might, in this mud.']],
  ['t', "Own goal. Wrong end, son. Wrong end entirely."],
  ['b', 'Disaster! {$player} turns it into his own net!'],
  ['b', "You can\'t legislate for that! {$player}, of all people!", ['t', 'You could, actually. Kick it the other way.']],
  ['t', 'That will be on a blooper tape until the end of time.'],
  ['b', "An own goal! The worst kind of goal! Unless it\'s yours!"],
  ['t', "Unlucky. Well. Not unlucky. Bad. But unlucky."],
  ['b', 'Oh dear oh dear. {$player} has given them a present!']
]);
LN('super', [
  ['b', 'WHAT HAS HE DONE TO THAT BALL?!', ['t', "That\'s not football. That\'s sorcery."]],
  ['b', 'A SUPER STRIKE! The ball is on FIRE, Trev!', ['t', 'Somebody fetch a bucket.']],
  ['b', 'Physics has left the building!'],
  ['t', "I\'d like to see the science on that. Actually, no I wouldn\'t."],
  ['b', 'Is it a bird? Is it a plane? It is a FOOTBALL with ideas!'],
  ['b', 'He has hit that so hard the ball needs a lie down!'],
  ['t', 'In my day the ball went in straight lines. Mostly.'],
  ['b', 'EUROPHORIA! And {$player} has unleashed the SUPER STRIKE!'],
  ['b', 'The crowd are on their feet! The ball is on a JOURNEY!', ['t', 'Has it packed a lunch?']],
  ['b', 'That ball has just been given a ticket to the moon!'],
  ['t', 'If I tried that my hamstring would emigrate.'],
  ['b', 'THE SMOKED KIPPER! Daz Pilchard, you magnificent fish!', null, (m, ev) => ev.super === 'smoked-kipper'],
  ['b', "ROW Z RETURN! He\'s hoofed it into orbit!", ['t', "And it\'s coming back. Duck."], (m, ev) => ev.super === 'row-z'],
  ['b', 'EL PASODOBLE! The ball is DANCING!', null, (m, ev) => ev.super === 'pasodoble'],
  ['b', 'DER HAMMERSCHLAG! Bang! Bang! BANG!', ['t', 'My fillings felt that.'], (m, ev) => ev.super === 'hammerschlag'],
  ['b', "LA CHIAVE! It\'s picking its way through everybody!", null, (m, ev) => ev.super === 'chiave'],
  ['b', "LA BOTTE D\'OR! Three balls! Which one is real?!", ['t', "The one that counts, Barry."], (m, ev) => ev.super === 'botte-dor']
]);
LN('superSaved', [
  ['b', 'SAVED! He has stopped the unstoppable!', ['t', "Don\'t tell the ball. It\'ll be devastated."]],
  ['b', 'The keeper has said NO to physics!'],
  ['t', 'Big gloves. Bigger heart. Biggest save.'],
  ['b', 'Unbelievable! The super strike is denied!'],
  ['t', "I\'ve seen some saves. That\'s a save."],
  ['b', 'He has eaten that super strike for breakfast!']
]);
LN('duel-perfect', [
  ['b', "AND THE KEEPER\'S GOT IT! FINGERTIPS! UNBELIEVABLE!"],
  ['b', 'PERFECT! Timing like a Swiss railway!', ['t', 'Better than my railway.']],
  ['t', "Caught it clean. Didn\'t even blink."],
  ['b', 'He has read it like a bedtime story!'],
  ['b', 'A PERFECT SAVE! The crowd do not know what to do with themselves!'],
  ['t', 'Textbook. If the textbook was written by a wizard.']
]);
LN('duel-good', [
  ['b', 'PUSHED AWAY! Not caught, but it is not in!', ['t', 'Not pretty. Effective.']],
  ['b', 'A strong hand! The keeper gets a touch!'],
  ['t', "Got enough on it. That\'s all you need."],
  ['b', 'Parried! Somebody clear it!'],
  ['b', 'Good save! Good save! Is there a rebound?!'],
  ['t', 'He will feel that in the morning.']
]);
LN('duel-miss', [
  ['b', "OH! He\'s gone the wrong way, and so has his dignity!", ['t', 'The ball and the keeper are both in the net.']],
  ['b', 'Too late! The keeper is beaten by the super strike!'],
  ['t', 'Mistimed. Happens to the best. Happened to me every week.'],
  ['b', 'He dived at the right time! Just in the wrong century!'],
  ['b', 'In it goes, and the keeper goes with it!'],
  ['t', 'Unlucky, son. That was never yours.']
]);
LN('penalty', [
  ['b', 'PENALTY! The referee points to the spot!', ['t', 'Clumsy. Very clumsy.']],
  ['b', "It\'s a penalty! The crowd can\'t believe it! Half of them, anyway!"],
  ['t', 'Stonewall penalty, that. Like a stone wall falling on a man.'],
  ['b', 'Spot kick! Who has the nerve?'],
  ['b', '{$ref} has given it! There will be letters about this!', ['t', 'Strongly worded ones.']],
  ['t', 'You cannot do that in the box. Or anywhere, really.'],
  ['b', 'PENALTY! Hold onto your scarves, everybody!'],
  ['b', 'The referee had no doubt! None whatsoever!'],
  ['t', 'Nervy moment, this. For everyone except the referee.'],
  ['b', 'Twelve yards. One kick. A whole town watching!'],
  ['t', 'Pick a corner and stick to it. That is my advice. I missed four.'],
  ['b', "It\'s a penalty and the keeper is doing star jumps on his line!"]
]);
LN('woodwork', [
  ['b', 'DOINK! Off the woodwork!', ['t', 'You could hear that in the car park.']],
  ['b', 'Off the post! So close! SO close!'],
  ['b', "The bar! It\'s rattled the bar!", ['t', 'The bar is fine. The striker is not.']],
  ['t', 'Inch to the left and we are all celebrating.'],
  ['b', 'The woodwork denies {$player}! The goalposts are on their side!'],
  ['b', 'CLANG! The frame of the goal is still vibrating!'],
  ['t', "Hit the post. That\'s a bad day at the office."],
  ['b', 'OHHH! It came back off the upright!'],
  ['t', 'Posts never get the credit they deserve.'],
  ['b', 'That one rang out like the church bells in {$city}!'],
  ['b', 'Off the bar and out! Somebody get the striker a hug!'],
  ['t', 'Painted white so you can see them. Should paint them invisible.']
]);
LN('var', [
  ['b', 'Here we go. VAR. Put the kettle on.', ['t', 'Put two on.']],
  ['b', 'The referee has his finger to his ear. Somebody is talking to him.'],
  ['t', 'VAR. Three people in a van watching telly.'],
  ['b', 'A VAR check! The crowd hold their breath!', ['t', 'They are going a bit blue, Barry.']],
  ['b', 'The screens are rolling. The tension is unbearable!'],
  ['t', 'In my day the only video was of the Christmas party.'],
  ['b', 'Checking. Checking. Still checking!'],
  ['t', "Take your time, lads. Not like there\'s a match on."],
  ['b', 'The longest seconds in football! VAR is looking at it!'],
  ['t', "They\'re zooming in. They\'ll find a pixel to blame."],
  ['b', "Is it? Isn\'t it? Only the van knows!"],
  ['t', 'Thousands of people, all looking at one man listening to his ear.']
]);
LN('diveBooked', [
  ['t', 'Yellow card for the amateur dramatics. Quite right.'],
  ['b', 'SIMULATION! Nobody was within a mile of him!', ['t', 'The nearest man was in the car park.']],
  ['b', 'He has been booked for diving! The crowd are booing the house down!'],
  ['t', 'If you want to act, join a theatre.'],
  ['b', 'Not this time! The referee was not fooled!'],
  ['t', "That\'s the worst dive I\'ve seen since my holiday in Margate."],
  ['b', 'Down he went with nobody near him, and up goes the yellow card!'],
  ['t', 'Embarrassing. Good. He deserves to be embarrassed.']
]);
LN('diveWon', [
  ['b', 'Down he goes, and the referee buys it!', ['t', 'There was a touch. A whisper of a touch.']],
  ['t', "He\'s made the most of that. Made a meal of it. Made a three-course meal."],
  ['b', 'Free kick given! Some in here will call that clever!'],
  ['t', 'Clever, I call it cheating with a smile.'],
  ['b', 'The referee has fallen for it! Hook, line and sinker!'],
  ['b', 'A free kick! And that is the dark arts, ladies and gentlemen!'],
  ['t', 'He went down like he was shot. By a pea.'],
  ['b', 'Given! The crowd think it was soft! Very soft!', ['t', 'Softer than a feather pillow.']]
]);
LN('dive', [
  ['b', "Oh, he\'s gone down like a sack of spuds!", ['t', 'There was more contact at my wedding, Barry.']],
  ['b', 'Down he goes! Is that a dive?'],
  ['t', 'Theatrical, that. Somebody hand him an award.'],
  ['b', 'He has thrown himself to the turf!'],
  ['t', 'Gravity did not need that much help.'],
  ['b', 'What a tumble! Triple salchow and a forward roll!'],
  ['t', 'And the referee waves play on. Get up, son.'],
  ['b', 'Is he hurt? Is he acting? Is he both?'],
  ['t', 'I have seen better acting in a school nativity.'], ['b', 'He is rolling! Once, twice, three times!', ['t', 'Four. I counted four.']], ['b', 'Down like a felled tree!'], ['t', 'Get up. The grass is wet.'], ['b', 'Clutching his shin! Or is it his knee? Or the other shin?']
]);
LN('save', [
  ['b', 'What a save by {$keeper}!', ['t', 'Big hands. You need big hands.']],
  ['b', 'SAVED! {$keeper} says not today!'],
  ['t', 'Good positioning. Did his homework, that lad.'],
  ['b', 'Fingertip save! He has stretched every inch of himself!'],
  ['b', '{$keeper} gets down well to that!', ['t', 'At his age, getting down is easy. Getting up is the hard part.']],
  ['t', 'Should have scored. Keeper made it look easy. It was not easy.'],
  ['b', "He\'s saved it! The wall of {$stadium}!"],
  ['b', 'A wonderful stop from {$keeper}!'],
  ['t', 'Right hand, left hand. Doesn\'t matter. Stop it.'],
  ['b', 'Denied! {$keeper} is having the game of his life!'],
  ['t', "Keepers are a strange breed, Barry. I\'ve met several."],
  ['b', 'He has smothered it! Safe hands!'],
  ['t', "Caught. Cuddled. Put to bed."],
  ['b', 'Superb! {$keeper} keeps them in it!']
]);
LN('nearMiss', [
  ['b', 'OHHH! Inches! INCHES!', ['t', "He\'ll see that one in his sleep."]],
  ['b', 'Wide! So close!'],
  ['t', 'Should be hitting the target from there. Every time.'],
  ['b', "Over the bar! That\'s gone into the crowd!", ['t', 'Somebody in row Z has a souvenir.']],
  ['b', 'Just past the post! The crowd were already celebrating!'],
  ['t', 'Wrong side of the post. The side with no net.'],
  ['b', 'Agonising! That was nearly a goal for the ages!'],
  ['t', 'Snatched at it. Calm down, take a breath, then shoot.'],
  ['b', 'Off target! But what an effort!'],
  ['t', 'Effort, yes. Goal, no.'],
  ['b', 'Whoosh! Past the post like a train!'],
  ['b', 'Everybody in {$city} just went OOOH!'],
  ['t', "If that\'s going in, it\'s going in. It wasn\'t going in."],
  ['b', 'Close! Close enough to smell it!']
]);
LN('launched', [
  ['b', "He\'s taken man, ball, and most of the grass!", ['t', "That\'s a booking in any country."]],
  ['b', 'He has sent him into orbit! Houston, we have a problem!'],
  ['t', 'Cartwheel and a half, that. Seven out of ten.'],
  ['b', 'Up in the air he goes! Like a pancake on Shrove Tuesday!'],
  ['t', "That\'s a tackle from the old days. The bad old days."],
  ['b', 'OOF! The whole stadium felt that one!'],
  ['t', "He\'ll want to have a word with whoever did that. A short word."],
  ['b', 'He has been flattened! Is there a stretcher in the building?']
]);
LN('foul', [
  ['b', 'Foul! The referee has seen that!'],
  ['t', 'Clumsy. Late. All the things your mum told you not to be.'],
  ['b', "Free kick! That\'s a cynical one!", ['t', 'Cynical is a big word for a little kick.']],
  ['b', '{$ref} blows up! He was having none of that!'],
  ['t', 'Went right through him. Like a hot knife through a kipper.'],
  ['b', 'A foul in a dangerous position!'],
  ['t', 'Professional foul. Not very professional.'],
  ['b', 'He has clipped his heels! Down he goes!'],
  ['t', 'That will annoy the manager. Everything annoys the manager.'],
  ['b', 'The whistle goes! Somebody has been naughty!'],
  ['t', "You can\'t do that. You just can\'t. Ever."],
  ['b', 'Tasty challenge! Too tasty for the referee!']
]);
LN('card', [
  ['b', 'The referee reaches for his pocket... and it is YELLOW!'],
  ['t', 'Deserved. Should have been a lecture as well.'],
  ['b', 'Yellow card for {$player}! He is walking a tightrope now!', ['t', 'In football boots. Never easy.']],
  ['b', 'Into the book he goes! {$player} is cautioned!'],
  ['t', "That\'s his name in the little book. Every referee loves his little book."],
  ['b', 'A yellow card, and {$player} cannot believe it!'],
  ['t', 'He can believe it. He just does not want to.'],
  ['b', 'Booked! The crowd are booing, but the referee is unmoved!'],
  ['t', 'A referee is like a lighthouse. Unmoved, and slightly flashing.'],
  ['b', 'Yellow card! {$ref} is having a busy evening!'],
  ['t', 'One more of those and he is having an early bath.'],
  ['b', "A caution! He\'ll have to be careful now!"],
  ['b', 'Shirt over his head, and a yellow card for the trouble!', ['t', 'Worth it, he says. Probably.'], (m, ev) => ev.why === 'shirt']
]);
LN('red', [
  ['b', "It\'s RED! {$player} is off!", ['t', 'Early bath. Bring a towel.']],
  ['b', 'A red card! The referee has had enough!'],
  ['t', "That\'s a long walk, that. Longest walk in football."],
  ['b', "Off he goes! {$team} are down to four outfield players!"],
  ['t', "He\'ll be watching the rest on the telly. In the dressing room. Alone."],
  ['b', 'Second yellow, and that means RED!', null, (m, ev) => ev.who && ev.who.cards >= 2],
  ['b', 'Sent off! The crowd are stunned!'],
  ['t', "Brainless. Absolutely brainless. I\'ve done it myself."]
]);
LN('europhoria', [
  ['b', 'EUROPHORIA! The fans have lifted them to another level!', ['t', "Never seen a crowd like it. Except last week."]],
  ['b', 'Listen to that noise! {$team} are in EUROPHORIA!'],
  ['t', 'The crowd is worth a goal start here. Maybe two.'],
  ['b', 'The tifo is up! The flares are lit! This is EUROPHORIA!'],
  ['b', 'You can feel it in the commentary box! The floor is shaking!', ['t', 'That might be the pies, Barry.']],
  ['t', "When the crowd\'s like this, your legs don\'t get tired. Mine did, but yours won\'t."],
  ['b', '{$team} are flying! Euphoria has turned to EUROPHORIA!'],
  ['b', 'The noise! The colour! The sheer, glorious nonsense of it all!'],
  ['t', 'They can smell a goal. I can smell onions. One of us is right.'],
  ['b', 'Here comes the surge! {$team} are unstoppable right now!'],
  ['t', 'Now is the time. Strike while the iron is hot.'],
  ['b', 'EUROPHORIA! Somebody has turned the stadium up to eleven!']
]);
LN('bus', [
  ['b', "They\'ve only gone and LITERALLY parked the bus!", ['t', 'Has it got a ticket?']],
  ['b', 'A BUS! In front of the goal! Is that allowed?!', ['t', "I\'ve checked the rules. Nothing about buses."]],
  ['t', 'Classic Lucchetto. One-nil up, and out comes the bus.'],
  ['b', 'The bus is parked! The handbrake is ON!'],
  ['t', "Clever. Diabolical. Clever. That\'s catenaccio for you."],
  ['b', 'You will need to go round it, over it, or THROUGH it!'],
  ['b', 'The driver has got out and he is not moving it!', ['t', 'Union rules, Barry.']],
  ['t', 'Shoot round the sides, or chip it. Or bring a tow truck.']
]);
LN('busSmashed', [
  ['b', 'THE BUS HAS BEEN SMASHED! THE WINDOWS ARE GONE!', ['t', "That\'s the deposit lost."]],
  ['b', 'The super strike has sent the bus packing!'],
  ['t', 'Never mind parking it. Somebody call a scrapyard.'],
  ['b', 'The bus is reversing out of there! Beep beep beep!'],
  ['t', "Insurance company won\'t like that one."],
  ['b', 'They parked the bus and Kipperton have STOLEN it!']
]);
LN('goldenMoment', [
  ['b', "The Golden Moment! {$team} have decided it\'s their time!", ['t', 'Money cannot buy you love. But it can buy you this.']],
  ['b', "Maximilien D\'Or raises his arm, and the crowd go GOLDEN!"],
  ['t', "Here it comes. The bit where the rich get richer."],
  ['b', 'Uh oh. Uh oh. The Golden Moment has arrived!'],
  ['t', "Brace yourselves, Kipperton. Here\'s the bill."]
]);
LN('halftime', [
  ['b', "That\'s the half-time whistle. Time for a pie, Trev?", ['t', 'Two pies, Barry.']],
  ['b', 'Half time at {$stadium}! {$score}!'],
  ['t', "Half time. The managers will be having words. Short ones, with feeling."],
  ['b', 'The players trudge off! What a half that was!', ['t', 'It was a half. Yes. That is what it was.']],
  ['b', "Half time, and {$team} have plenty to think about!"],
  ['t', 'Orange slices and a hairdryer. The two pillars of half time.'],
  ['b', 'Half time! Go and put the kettle on, everybody at home!'],
  ['t', "Pies, tea, a quick stretch, and a long think. I\'ll do the first two."],
  ['b', 'That is the end of the first half! Phew!'],
  ['t', 'Score is {$score}. Plenty of football left. Well. Half of it.'],
  ['b', 'Half time! The fans are queuing for the toilets already!', ['t', "Smart fans. Smarter than the players."]],
  ['b', 'The whistle goes for the break with the crowd on their feet!']
]);
LN('fulltime', [
  ['b', "They\'ll be dancing on the harbour wall in Kipperton tonight!", ['t', 'Mind the gulls.'], m => (m.teams[0].id === 'kipperton' && m.score[0] > m.score[1]) || (m.teams[1].id === 'kipperton' && m.score[1] > m.score[0])],
  ['b', "It\'s all over! {$score}!"],
  ['t', 'Full time. Good game. Bit of everything. Including a lot of nothing.'],
  ['b', 'The final whistle goes! What a match!', ['t', 'It was a match. I agree.']],
  ['b', "That\'s the end! The players fall to the turf!"],
  ['t', "Final whistle. Shake hands, swap shirts, don\'t swap the smelly ones."],
  ['b', 'FULL TIME! The crowd are going home happy! About half of them!'],
  ['t', 'Over. Done. In the history books. The small history books.'],
  ['b', 'It is over! Football, bloody football!', ['t', 'Language, Barry.']],
  ['t', 'A draw. Nobody loses. Nobody wins. Everybody goes home damp.', null, m => m.score[0] === m.score[1]],
  ['b', 'Honours even! Nothing to separate them!', null, m => m.score[0] === m.score[1]],
  ['b', 'Full time, and Kipperton have done it again!', null, m => (m.teams[0].id === 'kipperton' && m.score[0] > m.score[1])],
  ['t', "That\'s football. Ninety minutes, two teams, one ball, and a lot of shouting."],
  ['b', 'The referee blows for time! What a night at {$stadium}!']
]);
LN('extratime', [
  ['b', 'Level at full time! Golden goal extra time! Next goal WINS!', ['t', 'No pressure, lads.']],
  ['b', 'Extra time! The legs are heavy, the hearts are heavier!'],
  ['t', 'Golden goal. First one to score goes home with the biscuits.'],
  ['b', 'We go again! Sudden death... I mean golden goal!'],
  ['t', "I hated extra time. Mostly because I always got cramp."],
  ['b', 'Fifteen more minutes! Who has the nerve?']
]);
LN('shootout', [
  ['b', "It\'s PENALTIES! The cruellest way to lose, the sweetest way to win!", ['t', "Nobody wants to take one. Everybody wants to take one."]],
  ['b', 'A shootout! Hide behind your sofas!'],
  ['t', 'Pick your spot. Don\'t change your mind. Simple. Not simple.'],
  ['b', 'Penalties! Five each, then sudden death!'],
  ['t', "I missed one in a cup final once. Still think about it in the bath."],
  ['b', 'Twelve yards! A whole season comes down to twelve yards!'],
  ['t', "It\'s a lottery, they say. It isn\'t. It\'s nerve."],
  ['b', 'The tension in here could power the floodlights!', ['t', 'Better than fish oil.']]
]);
LN('shootoutScore', [
  ['b', 'SCORES! Cool as you like!'], ['b', 'In! Into the corner!', ['t', 'Keeper went the right way. Too slowly.']],
  ['t', 'Never in doubt. Well. Slightly in doubt.'], ['b', 'Buried it! Ice in the veins!'],
  ['b', "He\'s scored! Pressure? What pressure?"], ['t', 'Good penalty, that. Hard and low.'],
  ['b', 'Top corner! Unstoppable!'], ['t', 'That one was in before he hit it.'],
  ['b', 'GOAL! The shootout goes on!'], ['b', 'Smashed it home! What a penalty!']
]);
LN('shootoutMiss', [
  ['b', 'SAVED! The keeper is the hero!', ['t', 'Read it like a book. A short book.']],
  ['b', 'Missed! Oh, the agony!'], ['t', 'Changed his mind. Never change your mind.'],
  ['b', "Over the bar! That\'s gone into orbit!", ['t', 'Leaned back. Always lean back, always over.']],
  ['b', 'The keeper guesses right and keeps it out!'], ['t', 'He looked nervous walking up. Very nervous.'],
  ['b', 'Off the post! Oh no!'], ['b', 'Saved! The crowd go wild!'],
  ['t', "Nobody remembers the ones who scored. Everyone remembers that."], ['b', 'Denied! The shootout swings!']
]);
LN('panenka', [
  ['b', 'A PANENKA! He chipped it down the middle! The CHEEK of it!', ['t', 'Either a genius or a lunatic. Often both.']],
  ['b', 'The cheekiest penalty you will ever see!'],
  ['t', 'Chipped it. In a shootout. I need a lie down.'],
  ['b', 'Oh he has dinked it! The keeper is lying on the floor in shame!'],
  ['t', 'If that was saved he would never be forgiven. It was not saved.'],
  ['b', 'Ice cold! A Panenka! Somebody give that man a medal!']
]);
LN('advantage', [
  ['b', 'Advantage! The referee waves play on!', ['t', 'Good refereeing, that. Let it flow.']],
  ['b', 'Play on! {$ref} is letting the game breathe!'],
  ['t', "He\'ll come back to that. Referees always come back to it."],
  ['b', 'The referee spreads his arms! Advantage!'],
  ['t', 'Sensible. A free kick is less than what they have.'],
  ['b', 'No whistle! Advantage played!']
]);
LN('corner', [
  ['b', 'Corner kick! Everybody up!', ['t', 'Big lads in the box. Big lads only.']],
  ['b', 'A corner! Danger here!'], ['t', "Get it in the mixer. That\'s all you can do."],
  ['b', 'Corner! The keeper is shouting at everybody!'], ['t', 'Near post, far post, or the head of a defender. Usually the last one.'],
  ['b', 'A corner! The crowd behind the goal are on their feet!'], ['t', 'Corners win cups. And lose them.'],
  ['b', 'Another corner! The pressure is building!']
]);
LN('refHit', [
  ['b', 'OH! The referee has been hit by the ball!', ['t', 'Best touch of the game, that.']],
  ['b', 'Down goes the referee! Is there a referee for the referee?'],
  ['t', "Ball hit the ref. Ref hit the floor. Nobody\'s sure what to do."],
  ['b', 'The referee is flat out! The crowd are delighted!'],
  ['t', "He\'ll be fine. Referees are made of tough stuff. And whistles."],
  ['b', "Right in the whistle! He won\'t forget that!"]
]);
LN('celebrate', [
  ['b', 'And what a celebration!', ['t', 'He practised that in the mirror.']],
  ['b', 'Look at him go! The fans love it!'], ['t', 'Celebrations were a handshake in my day. Two if it was a cup tie.'],
  ['b', 'The whole team pile on! Somebody check he can breathe!'], ['t', 'Careful. Hamstrings are fragile things.'],
  ['b', 'He is milking it! And why not!'], ['b', 'The fish slap! The legendary Kipperton fish slap!', ['t', "I\'ll never get used to that."], (m, ev) => ev.id === 'fishslap'],
  ['b', 'A backflip! The man is a gymnast!', null, (m, ev) => ev.id === 'backflip'], ['b', 'The robot! Beep boop, goal!', null, (m, ev) => ev.id === 'robot'],
  ['t', 'Shirt over the head. He knows that is a booking. He does not care.', null, (m, ev) => ev.id === 'shirt']
]);
LN('stoppage', [
  ['b', 'The board goes up! Added time!', ['t', 'Squeaky bum time, this.']],
  ['b', 'A few more minutes to play!'], ['t', 'Added time. The longest minutes there are.'],
  ['b', "The fourth official has his board out! Plenty of time, if you\'re quick!"],
  ['t', 'Concentrate now. Games are lost in added time. I lost several.'],
  ['b', 'Into the final minutes we go!']
]);
LN('replay', [
  ['b', "Let\'s see that again!", ['t', 'Watch the run. Watch the finish. Watch me nod.']],
  ['b', 'Here it is again! Look at that!'], ['t', 'Slow it down, and it still looks good.'],
  ['b', 'One more time for the people at the back!'], ['t', 'See the keeper there? He went the wrong way. Then the other wrong way.'],
  ['b', 'In glorious slow motion!'], ['t', 'Look at the defending. Actually, do not look at the defending.'],
  ['b', 'Roll the tape! What a goal!']
]);
LN('nutmeg', [
  ['b', "Through the legs! He\'ll hear about that in the canteen.", ['t', 'Nutmegged. Worst feeling in football. After losing.']],
  ['b', 'NUTMEG! The crowd give him an OLÉ!'], ['t', 'Legs open, ball through. Close your legs, son.'],
  ['b', 'Megs! He has gone right through him!'], ['t', "That\'s going on social media. Whatever that is."],
  ['b', "He\'s put it through his legs and run round him!"], ['t', 'Embarrassing for the defender. Very embarrassing.'],
  ['b', 'A nutmeg! Pure cheek!'], ['t', "I got nutmegged once in 1987. I\'m still not over it."],
  ['b', 'Olé! Through the legs and away!']
]);
LN('skill', [
  ['b', 'Look at the feet on that!', ['t', 'Quick feet. Quick brain. Quick everything.']],
  ['b', 'A step-over! And another! And he is gone!'], ['t', 'Show-boating. I like it. Do not tell anyone.'],
  ['b', 'Over his head! A rainbow flick! Outrageous!'], ['t', 'You do not see that in the lower leagues. You see it in the hospital.'],
  ['b', 'Silky! Absolutely silky!'], ['t', "He\'s bamboozled him. Totally bamboozled."],
  ['b', 'A spin turn! He has left his man for dead!'], ['t', 'Turned him inside out, then outside in.'],
  ['b', 'Tricks! Flicks! The crowd love it!'], ['t', 'Very nice. Now pass it.'],
  ['b', 'Samba on the snow!', null, SNOW]
]);
LN('tackle', [
  ['b', 'What a tackle! Took the ball clean!', ['t', "Timing. That\'s all a tackle is. Timing and a bit of madness."]],
  ['b', 'Slide tackle! Ball first, man second!'], ['t', 'That is how you tackle. Show the kids that one.'],
  ['b', 'He has won it back with a crunching challenge!'], ['t', 'Fair and square. And loud.'],
  ['b', 'In he goes! Wins the ball!'], ['t', 'Went to ground. Got the ball. Got up. Textbook.'],
  ['b', 'A sliding tackle in the snow! He has cleared a path!', null, SNOW], ['b', 'Sliding through the puddles! What a tackle!', null, RAIN],
  ['t', 'Superb. Absolutely superb. I would buy that man a pint.'], ['b', 'Crunch! That was felt in the back row!', ['t', 'Clean though. Clean as a whistle.']], ['b', 'He has nicked it off his toes!'], ['b', 'Clean as a whistle! Not like the referee\'s!']
]);
LN('header', [
  ['b', 'Rises like a salmon! A kipper, actually, but you get the idea.', null, KIP],
  ['b', 'A header! He has met it with his forehead!', ['t', "Eyes open. Always eyes open."]],
  ['b', 'Up he goes! Bullet header!'], ['t', 'Attacked the ball. Wanted it more.'],
  ['b', 'A diving header! He has thrown himself at it!'], ['t', 'Brave. You need to be brave. And have a hard head.'],
  ['b', 'He has nodded it goalwards!'], ['t', 'Good contact. Good direction. Good lad.'],
  ['b', "Headed at goal! He\'s won the aerial battle!"], ['t', "Big lad. Big jump. Big head. In a good way."],
  ['b', 'The Nodder rises! Needham at full stretch!', null, (m, ev) => ev.who && ev.who.data.id === 'needham'],
  ['b', 'Up like a rocket! What a leap!']
]);
LN('volley', [
  ['b', 'ON THE VOLLEY! He has hit it before it bounced!', ['t', 'Watch the ball onto the foot. That is all a volley is.']],
  ['b', 'A volley! Sweet as you like!'], ['t', "Didn\'t let it bounce. Never let it bounce."],
  ['b', 'He has leathered it on the half volley!'], ['t', 'Timing. Pure timing.'],
  ['b', 'Side-foot volley! Technique!'], ['t', 'That is a hard skill. Harder than it looks.'],
  ['b', 'Bang! First time!'], ['t', "Hit it first time. No thinking. Thinking\'s for defenders."],
  ['b', 'A volley from the edge of the box!'], ['t', "If that\'s on target it\'s a goal. It might be."],
  ['b', 'Smashed on the volley!']
]);
LN('bicycle', [
  ['b', 'AN OVERHEAD KICK! ARE YOU KIDDING ME?!', ['t', 'I tried that once. Spent a week in traction.']],
  ['b', 'A BICYCLE KICK! Upside down and brilliant!'], ['t', 'Back of the neck. That is where you land. Every time.'],
  ['b', 'He has gone over the top! Overhead!'], ['t', "That\'s for the highlights reel. And his physio."],
  ['b', 'SCISSOR KICK! The crowd can not believe it!'], ['t', 'I would not try that at home. Or anywhere.'],
  ['b', 'Acrobatics! Gymnastics! Football!'], ['t', 'Show-off. Brilliant show-off.']
]);
LN('keeperEarly', [
  ['b', 'The keeper has gone early!', ['t', 'Patience, son. Patience.']], ['t', 'Gone before the kick. The taker saw it.'],
  ['b', 'He has committed! Will the taker change his mind?'], ['t', 'Dive too early and you look daft. Dive too late and you look dafter.']
]);
LN('event-seagull', [
  ['b', 'And a seagull has taken possession!', ['t', 'Better first touch than some I have seen.']],
  ['b', 'A seagull is sitting on the ball! The referee does not know what to do!'], ['t', 'Gulls in Kipperton. Bigger than the full-backs.'],
  ['b', 'The seagull is not giving it back! Somebody shoo it!'], ['t', "Typical gull. Takes your chips, takes your ball."],
  ['b', 'Off it flies! The gull has had its fun!']
]);
LN('event-beachball', [
  ['b', 'A beach ball is on the pitch! Two balls! Chaos!', ['t', 'Which one do they kick? Both, apparently.']],
  ['b', 'Somebody has thrown a beach ball on! It is bouncing all over!'], ['t', "Holiday atmosphere. I\'d like a deckchair."],
  ['b', 'The real ball has just bounced off the beach ball!'], ['t', 'Pop it, ref. Go on. Pop it.']
]);
LN('event-invader', [
  ['b', 'A pitch invader! Is that... is that a giant kipper?!', ['t', 'That is Kipper Keith. He does this every week.']],
  ['b', 'Somebody is on the pitch! The stewards are giving chase!'], ['t', 'Hi-vis jackets. Not built for speed.'],
  ['b', "He\'s dodging the stewards! He\'s got better feet than the midfield!"], ['t', 'Somebody tackle him. Anybody.'],
  ['b', 'A stag on the pitch! Antlers and everything!', ['t', 'The Steel Stag. Club mascot. Legally a mascot.'], m => m.stadium.id === 'stahlpresse']
]);
LN('invaderTackled', [
  ['b', "He\'s been TACKLED by a player! The crowd are loving it!", ['t', 'Best tackle of the night, that.']],
  ['b', 'Brought down by {$player}! The invader is out of the game!'], ['t', "That\'s a sticker for the album, that."],
  ['b', 'Justice! {$player} has flattened the pitch invader!']
]);
LN('event-floodlight', [
  ['b', "And the floodlights have gone! We can\'t see a thing!", ['t', 'The fish-oil generator, I expect.']],
  ['b', 'Lights out at the stadium! Is there a fuse box?'], ['t', 'Somebody put fifty pence in the meter.'],
  ['b', "They\'re back! The lights are back on!"], ['t', 'Football in the dark. Like my Sunday league.']
]);
LN('event-flaresmoke', [
  ['b', 'Red smoke is pouring across the pitch from the curva!', ['t', "Atmospheric. Can\'t see a thing, but atmospheric."]],
  ['b', 'The Lucchetto fans have lit the flares! The pitch is a red mist!'], ['t', "Smells like a barbecue. A sad barbecue."],
  ['b', 'Through the smoke he comes!'], ['t', 'Good for hiding a foul, that smoke.'],
  ['b', 'The curva are making it look like a volcano in here!']
]);
LN('event-drone', [
  ['b', "There\'s a drone over the pitch! Somebody wants a better view!", ['t', 'Probably the owner. Watching his money.']],
  ['b', 'A camera drone buzzes over the Euphorium!'], ['t', 'In my day the cameraman sat on a ladder.'],
  ['b', 'The drone is getting the aerial shot of a lifetime!']
]);
LN('event-fireworks', [
  ['b', 'FIREWORKS! The Euphorium is lit up!', ['t', 'They do like a fuss here.']],
  ['b', 'Bang! Fizz! The sky is gold and silver!'], ['t', 'Very nice. Is anyone watching the football?']
]);
LN('weather-rain', [
  ['t', 'Proper weather, this. Separates the men from the boys. And the boys from their boots.'],
  ['b', 'The rain is coming down in sheets!', ['t', 'Fitted sheets.']],
  ['t', 'Wet ball, wet pitch. Shoot from anywhere. The keeper hates this.'],
  ['b', 'Puddles all over the pitch! The ball keeps stopping dead!'],
  ['t', 'You need studs on a night like this. Long ones. And a snorkel.'],
  ['b', "It\'s a proper northern night at the Smokehouse!", ['t', 'Wet, windy, and smelling of fish. Lovely.']]
]);
LN('weather-snow', [
  ['b', "It\'s a winter wonderland! The orange ball is out!", ['t', 'Never trust a white ball in the snow.']],
  ['t', 'Snow slows the ball down. Pass it harder. Or get a sledge.'],
  ['b', 'The groundstaff have cleared the lines! Heroes, the lot of them!'],
  ['t', 'Cold enough to freeze the eyebrows off a polar bear.'],
  ['b', 'Footprints in the snow! You can see every run!', ['t', "And every mistake. That one\'s mine."]],
  ['b', 'The snow keeps falling! The steel keeps pressing!']
]);
LN('weather-fog', [
  ['b', "The fog\'s rolled in! I can barely see the far touchline!", ['t', 'Use the radar, lads. Use the radar.']],
  ['t', 'Fog. Perfect for a team that likes to hide.'],
  ['b', 'Shapes in the mist! Is that a player or a lamppost?', ['t', 'Could be both. Lucchetto have tall defenders.']],
  ['t', 'In fog you shout. Call for it. Loud.'],
  ['b', 'The mist is thick at Castelfortezza!']
]);
LN('weather-sun', [
  ['b', 'Glorious sunshine! Not a cloud in the sky!', ['t', 'I forgot my sun cream. Again.']],
  ['t', 'Hard pitch. Ball runs quick. Keep it on the floor.'],
  ['b', 'The heat is shimmering off the stands!'],
  ['t', 'Weather for a siesta. Not for chasing a ball.'],
  ['b', 'Sunshine and football! Is there anything better?', ['t', 'Shade, Barry. Shade is better.']]
]);
LN('idle', [
  ['b', "What do you make of it so far, Trev?", ['t', "It\'s football, Barry. I make football of it."]],
  ['t', 'The key is to keep the ball. If you have the ball, they cannot score. Usually.'],
  ['b', 'Fascinating tactical battle here!', ['t', 'Is it?']],
  ['t', 'Back in my day we had a ball made of leather and regret.'],
  ['b', 'The fans are in fine voice tonight!'],
  ['t', 'Shape is important. Diamond, square, whatever. Just have a shape.'],
  ['b', 'Any predictions, Trev?', ['t', 'Somebody will score. Probably. Or not.']],
  ['t', "Midfield\'s like a kitchen. Somebody\'s got to do the washing up."],
  ['b', 'A cagey spell, this.', ['t', 'Cagey. Like a parrot.']],
  ['t', 'Communication. You have to talk. My wife says I never talk.'],
  ['b', 'The Europhoria Cup. The grandest prize in European football!'],
  ['t', 'The cup is heavier than it looks. I held one once. I was carrying it for someone.'],
  ['b', 'Five against five! Every player matters!', ['t', 'Even the keeper. Especially the keeper.']],
  ['t', 'Patience. Pass, pass, pass, then bang.'],
  ['b', 'What a stadium this is!', ['t', 'Nice seats. Bit small for my knees.']],
  ['t', 'If in doubt, kick it out. Old saying. Bad saying.'],
  ['b', 'Tell us about your playing days, Trev.', ['t', 'Short, Barry. Very short. Mostly in the bath.']]
]);
LN('idle-lead', [
  ['b', '{$score} it is, and the game is still alive!'], ['t', 'A one-goal lead is a dangerous thing. Two is worse. Trust me.'],
  ['b', "The team behind need to throw the kitchen sink at it now!", ['t', 'And the fridge.']], ['t', 'Game management, they call it. I call it kicking it into row Z.'],
  ['b', 'There is a long way to go at {$score}!'], ['t', 'Never write anyone off. Except me, in a sprint.']
]);
LN('idle-smokehouse', [['b', 'The Smokehouse, home of the Kippers. You can smell the smokehouse from here!', ['t', 'I can smell it from home.']], ['t', 'Floodlights powered by fish oil. True story.'], ['b', 'The lighthouse is sweeping its beam over the terraces!']]);
LN('idle-pasapasa', [['b', 'The Estadio Pasapasa, cathedral of the short pass!', ['t', 'Four hundred passes a match. I counted once. Fell asleep.']], ['t', 'They wave white handkerchiefs here. At good play. And at bad referees.'], ['b', 'Solera in the sunshine! What a setting!']]);
LN('idle-stahlpresse', [['b', 'The Stahlpresse Arena! Fifty-two thousand and not one of them sitting down!', ['t', 'The seats are just for decoration.']], ['t', 'They run here. They never stop running. My legs hurt watching.'], ['b', 'The steelworks are glowing behind the stand!']]);
LN('idle-lucchetto', [['b', 'Stadio Lucchetto. The fortress. The padlock. The place where goals come to die.', ['t', 'Cheerful.']], ['t', 'The curva drum has not stopped since the warm-up.'], ['b', 'The old bell tower watches over Castelfortezza!']]);
LN('idle-euphorium', [['b', 'The Euphorium! Gold everywhere! Even the pies are gold!', ['t', 'Twelve quid for a gold pie. I checked.']], ['t', 'Built with money. Lots of money. All of the money.'], ['b', 'Ninety thousand in the Euphorium tonight!']]);
LN('idle-rec', [['t', 'The rec. Where it all began. Mud, cones and a dog called Brian.'], ['b', 'Training at the rec!'], ['t', 'Keep the mud off your kit. Mags does the washing.']]);
/* the PA\'s lines (section 6.17): attendance, scorers, jokes */
EF.PA_LINES = [
  "Good evening, and welcome to {$stadium}. Tonight\'s attendance: {$crowd}.",
  'Would the owner of a minibus with three wheels please move it. It is blocking a tractor.',
  'Lost child at the north stand. His name is Darren. He is forty-four.',
  'The pie stand is now serving. The pies are hot. Some of them.',
  'Please do not feed the seagulls. They are already fed. By you. Every week.',
  'A reminder: flares are not permitted. That includes the big ones.',
  'Will the gentleman who parked his bus in front of the goal please move it.',
  'The half-time draw: ticket number four four seven. Your prize is a kipper.',
  "Today\'s man of the match sponsor is Smoky Joe\'s Kippers. Smoky Joe: we smoke so you don\'t have to.",
  'Please remain in your seats. Please. We are asking nicely.',
  'The referee would like to remind everyone that he can hear you.',
  'Will a member of the medical staff please report to the dugout. Bring biscuits.',
  'A big welcome to our visitors. Please enjoy the weather. You have no choice.',
  'The lost property office has a left boot, a scarf, and a man called Kevin.',
  'Goal for the home side. Scored by {$player}. Time: {$minute} minutes.',
  'Goal scored by {$player}, at {$minute} minutes. Please do not climb the floodlights.',
  'Five minutes of added time. Five. Count them.',
  'Thank you for coming. Mind the steps. Mind the gulls. Mind each other.',
  'The tea bar is closing. The tea bar is always closing.',
  'Would whoever is beating the drum please let somebody else have a go.'
];
/* ==== src/54-drills.js ==== */
/* TRAINING DRILLS (section 7.6): registry 'drill' { title, coach, teaches, setup(m, run), steps: [{ say, goal: { event,
 * count, where(ev, m, run) } | { test(m, run) }, setup(m, run), hint }] }. Dummies are the reserves, driven by scripts. */
EF.def('team', 'reserves', { name: 'KIPPERTON RESERVES', short: 'RES', nick: 'THE BIBS', city: 'KIPPERTON', stadium: 'rec', formation: '2-1-1', tactic: 'plucky', chant: 'kipperton', celebration: 'cheer', crowd: { factor: 1 }, tifo: 'BIBS',
  kits: { home: { shirt: '#e8f040', color2: '#c8d020', pattern: 'plain', shorts: '#2a2a34', socks: '#e8f040', number: '#2a2a34' }, away: { shirt: '#e8f040', color2: '#c8d020', pattern: 'plain', shorts: '#2a2a34', socks: '#e8f040', number: '#2a2a34' }, keeper: { shirt: '#5a5a6a', color2: '#e8f040', pattern: 'plain', shorts: '#2a2a34', socks: '#5a5a6a', glove: '#e8f040' } },
  crest: { shape: 'circle', field: '#e8f040', ring: '#2a2a34', charges: ['cone'] },
  players: [pl('res1', 'BIG DAVE', 1, 'GK', { build: 'bulky', size: 1.15, hair: 'bald' }, ST(50, 30, 40, 40, 20, 60, 80, 30)), pl('res2', 'LITTLE DAVE', 2, 'DEF', { size: 1.02 }, ST(60, 40, 50, 55, 40, 10, 50, 30)), pl('res3', 'DAVE THE POST', 3, 'DEF', { size: 1.1 }, ST(40, 30, 40, 50, 20, 10, 70, 20)), pl('res4', 'NEW DAVE', 4, 'MID', { size: 1.06, hair: 'spiky' }, ST(60, 50, 60, 50, 50, 10, 50, 30)), pl('res5', 'OLD DAVE', 5, 'FWD', { captain: true, super: 'rocket', size: 1.06, hair: 'bald', hairColor: '#c8c8c8' }, ST(55, 60, 50, 40, 40, 10, 55, 60))] });
const stand = (f, x, y, face) => { f.body.x = x; f.body.y = y; f.body.vx = f.body.vy = 0; f.facing = face === undefined ? Math.PI : face; f.order = null; f.frozen = false; f.setState('run'); };
const ballTo = (m, f) => { m.setpiece = null; m.setMode('play'); m.ball.held = false; m.setOwner(f, 'drill'); const h = m.humans[0]; if (h && f.side === 0 && f.role !== 'GK') m.giveTo(h, f); };
const gk = (m, s) => m.side[s].find(f => f.role === 'GK');
const hide = f => { f.body.x = -900 - f.id * 30; f.body.y = -900; f.ghost = true; };
const show = f => { f.ghost = false; };
EF.def('drill', 'move', { title: 'ON YOUR MARKS', coach: 'mags', teaches: 'Run, sprint, stamina', n: 1,
  setup(m, run) { for (const f of m.side[1]) hide(f); for (const f of m.side[0]) if (f.data.id !== 'tran') hide(f); const t = m.side[0].find(f => f.data.id === 'tran'); show(t); stand(t, P.X0 + 80, P.CY, 0); m.giveTo(m.humans[0], t); m.ball.place(t.body.x + 8, P.CY); run.cones = []; for (let i = 0; i < 6; i++) run.cones.push({ x: P.X0 + 160 + i * 70, y: P.CY + (i % 2 ? 50 : -50), hit: false }); },
  steps: [
    { say: ['Weave through the cones. Left, right, left. Go near each one, in order.'], hint: 'RUN PAST EACH CONE', test(m, run) { const f = m.humans[0].fb, c = run.cones.find(q => !q.hit); if (!c) return true; if (H.d2(c.x, c.y, f.body.x, f.body.y) < 16) { c.hit = true; EF.sfx('coin'); } run.count = run.cones.filter(q => q.hit).length; run.of = 6; return false; } },
    { say: ['Now sprint the straight. Hold sprint and go. Watch the bar under your name.'], hint: 'HOLD SPRINT ALONG THE STRAIGHT', setup(m, run) { run.cones = []; run.sprintD = 0; }, test(m, run) { const f = m.humans[0].fb; if (f.sprinting) run.sprintD += Math.hypot(f.body.vx, f.body.vy) / 120; run.count = Math.min(250, Math.round(run.sprintD)); run.of = 250; return run.sprintD >= 250; } },
    { say: ['Sprinting costs stamina. Stop and get your breath back. Under 25 and you are slow.'], hint: 'STAND STILL UNTIL STAMINA IS FULL', setup(m) { m.humans[0].fb.stamina = 30; }, test(m, run) { const f = m.humans[0].fb; run.count = Math.round(f.stamina); run.of = 100; return f.stamina >= 98; } }
  ] });
EF.def('drill', 'passing', { title: 'PASS MASTER', coach: 'mags', teaches: 'Pass, through ball, one-two', n: 2,
  setup(m, run) { for (const f of m.side[1]) hide(f); for (const f of m.side[0]) { show(f); } const [gk, a, b, c, d] = m.side[0]; hide(gk); stand(a, P.CX - 120, P.CY - 80, 0); stand(b, P.CX - 40, P.CY + 60, 0); stand(c, P.CX + 60, P.CY - 60, 0); stand(d, P.CX - 140, P.CY + 20, 0); ballTo(m, d); run.movers = [a, b, c]; },
  steps: [
    { say: ['Five passes to your teammates. Point the stick at a man and press pass. Feet, not faces.'], goal: { event: 'passDone', count: 5, where: ev => ev.who.side === 0 } },
    { say: ['Now a through ball, into the space in front of a runner. Twice.'], goal: { event: 'passDone', count: 2, where: ev => ev.kind === 'through' } },
    { say: ['A one-two. Hold switch and press pass: give it, run on, and get it back.'], goal: { event: 'passDone', count: 1, where: (ev, m) => ev.kind === 'oneTwo' || (ev.from && ev.from.order && ev.from.order.kind === 'oneTwo') } }
  ],
  script(m, f, run) { if (f.side === 0 && run.movers.includes(f) && m.owner !== f && !f.human) { const it = EF.Intent.make(), t = m.t + f.idx * 2, tx = f.order && f.order.to ? f.order.to[0] : P.CX + Math.sin(t * .6) * 120 + f.idx * 30, ty = f.order && f.order.to ? f.order.to[1] : P.CY + Math.cos(t * .5 + f.idx) * 120; const d = H.d2(tx, ty, f.body.x, f.body.y); if (d > 4) it.move = [(tx - f.body.x) / d * .55, (ty - f.body.y) / d * .55]; return it; } if (f.side === 0 && m.owner === f && !f.human && f.order && f.order.kind === 'oneTwo') return null; if (f.side === 0 && m.owner === f && !f.human) { const it = EF.Intent.make(); return it; } return null; } });
EF.def('drill', 'shooting', { title: 'HIT THE TARGET', coach: 'mags', teaches: 'Power, aim, the sweet spot, curl, chip', n: 3,
  setup(m, run) { for (const f of m.side[1]) hide(f); const k = gk(m, 1); show(k); stand(k, P.X1 - 10, P.CY, Math.PI); for (const f of m.side[0]) hide(f); const s = m.side[0].find(f => f.data.id === 'pilchard'); show(s); run.shooter = s; run.reset = () => { stand(s, P.X1 - 150, P.CY + 20, 0); ballTo(m, s); stand(k, P.X1 - 10, P.CY, Math.PI); k.read = null; k.save = null; }; run.reset(); run.corners = [false, false, false, false]; },
  steps: [
    { say: ['Hit all four corners. Push the stick up or down as you shoot to aim. Hold shoot for power.'], hint: 'AIM: STICK UP/DOWN WHILE SHOOTING', setup(m, run) { gk(m, 1).frozen = true; }, test(m, run) { const b = m.ball; if (b.shot && P.crossedGoalLine(b) === 1 && !run.cross) { run.cross = true; const top = b.z > 16, left = b.y < P.CY; if (Math.abs(b.y - P.CY) < P.GH && b.z < P.BAR && Math.abs(b.y - P.CY) > 18) { const i = (top ? 2 : 0) + (left ? 0 : 1); if (!run.corners[i]) { run.corners[i] = true; EF.sfx('coin'); } } } if (!b.shot) run.cross = false; run.count = run.corners.filter(Boolean).length; run.of = 4; return run.count >= 4; } },
    { say: ['Now a Screamer. Let go of shoot when the meter is in the gold. Hit it like a train.'], setup(m) { gk(m, 1).frozen = false; }, goal: { event: 'shot', count: 1, where: ev => ev.screamer } },
    { say: ['Curl one round the dummy. Shoot, then push the stick across the ball while it flies.'], setup(m, run) { const d = m.side[1][1]; show(d); stand(d, P.X1 - 90, P.CY + 12, Math.PI); d.frozen = true; }, goal: { event: 'curl', count: 1, where: ev => true } },
    { say: ['And a chip. When the keeper comes off his line, press lob near the box.'], setup(m, run) { const d = m.side[1][1]; hide(d); gk(m, 1).chipMe = true; }, goal: { event: 'goal', count: 1, where: (ev, m) => ev.goal && ev.goal.kind === 'chip' } }
  ],
  script(m, f, run) { if (f.role === 'GK' && f.side === 1 && f.chipMe && m.owner && m.owner.side === 0) { const it = EF.Intent.make(), tx = P.X1 - 50, d = H.d2(tx, P.CY, f.body.x, f.body.y); if (d > 3) it.move = [(tx - f.body.x) / d, (P.CY - f.body.y) / d]; return it; } return null; } });
EF.def('drill', 'air', { title: 'HEADS UP', coach: 'mags', teaches: 'Lobs, crosses, headers, volleys, bicycle kicks', n: 4,
  setup(m, run) { for (const f of m.side[1]) hide(f); const k = gk(m, 1); show(k); for (const f of m.side[0]) hide(f); const w = m.side[0].find(f => f.data.id === 'tran'), s = m.side[0].find(f => f.data.id === 'pilchard'); show(w); show(s); run.w = w; run.s = s;
    run.reset = (cross) => { stand(k, P.X1 - 8, P.CY, Math.PI); stand(s, P.X1 - 90, P.CY + 10, 0); stand(w, P.X1 - 120, P.Y0 + 40, 0); if (cross) { ballTo(m, w); m.humans[0].fb = null; m.giveTo(m.humans[0], w); } }; run.reset(true); },
  steps: [
    { say: ['Get wide and cross it. Press lob out on the wing and it goes into the box.'], goal: { event: 'cross', count: 1, where: ev => true } },
    { say: ['Now finish one. When the ball is in the air, a prompt shows: press shoot to head it in.'], setup(m, run) { run.autoCross = true; }, goal: { event: 'goal', count: 1, where: (ev) => ev.goal && (ev.goal.kind === 'header' || ev.goal.kind === 'divingHeader') } },
    { say: ['A volley. When it drops to knee height, shoot before it bounces.'], setup(m, run) { run.autoCross = 'low'; }, goal: { event: 'goal', count: 1, where: (ev) => ev.goal && ev.goal.kind === 'volley' } },
    { say: ['Bonus. Back to goal, ball in the air: shoot. Overhead kick. Do not tell your mother.'], setup(m, run) { run.autoCross = 'back'; }, goal: { event: 'bicycle', count: 1, where: ev => true }, skippable: true }
  ],
  tick(m, run, dt) { if (!run.autoCross) return; run.ct = (run.ct || 0) - dt; if (run.ct > 0 || m.owner && m.owner.side === 0 && m.owner !== run.w) return; if (m.mode !== 'play') return; if (!m.ball.shot && (m.owner === null || m.owner === run.w) && run.ct <= 0) { run.ct = 4; const k = gk(m, 1); stand(k, P.X1 - 8, P.CY, Math.PI); stand(run.s, P.X1 - 80, P.CY + (run.autoCross === 'back' ? 0 : 10), run.autoCross === 'back' ? Math.PI : 0); m.giveTo(m.humans[0], run.s); const b = m.ball; m.setOwner(null); b.place(P.X1 - 120, P.Y0 + 40, 0); const tgt = { x: run.s.body.x + (run.autoCross === 'back' ? 0 : 6), y: run.s.body.y, z: run.autoCross === 'low' ? 12 : 28 }; const v = E.arc(b, tgt, EF.T.ballGravity, { apex: 60 }); b.kick(v.vx, v.vy, v.vz, { who: run.w, pass: { from: run.w, to: run.s, kind: 'cross' } }); } } });
EF.def('drill', 'skills', { title: 'SHOW BOAT', coach: 'mags', teaches: 'Step-over, nutmeg, spin, rainbow', n: 5,
  setup(m, run) { for (const f of m.side[0]) hide(f); const t = m.side[0].find(f => f.data.id === 'tran'); show(t); run.t = t; for (const f of m.side[1]) hide(f); run.reset = () => { stand(t, P.CX - 140, P.CY, 0); ballTo(m, t); const d = m.side[1][1 + (run.step % 4)]; for (const q of m.side[1]) hide(q); show(d); stand(d, P.CX - 60, P.CY, Math.PI); d.frozen = false; run.dummy = d; }; run.reset(); },
  steps: [
    { say: ['Beat the dummy with a step-over. Press skill with the stick sideways.'], goal: { event: 'skill', count: 1, where: ev => ev.kind === 'stepover' && ev.victim } },
    { say: ['Nutmeg him. Run straight at him and press skill when he is right in front.'], goal: { event: 'nutmeg', count: 1, where: ev => true } },
    { say: ['A spin turn: skill with the stick pulled back.'], goal: { event: 'skill', count: 1, where: ev => ev.kind === 'spin' } },
    { say: ['And the rainbow flick: tap skill twice, quickly. Over his head!'], goal: { event: 'rainbow', count: 1, where: ev => true } }
  ],
  script(m, f, run) { if (f === run.dummy) { const it = EF.Intent.make(), o = m.owner; if (o && o.side === 0 && H.d(o.body, f.body) < 50) { const d = H.d(o.body, f.body); it.move = [(o.body.x - f.body.x) / d * .25, (o.body.y - f.body.y) / d * .25]; } return it; } return null; } });
EF.def('drill', 'defending', { title: 'THE HARBOUR WALL', coach: 'okafor', teaches: 'Poke, slide, barge, switching, interceptions', n: 6,
  setup(m, run) { for (const f of m.side[0]) hide(f); const sa = m.side[0].find(f => f.data.id === 'okafor'), ag = m.side[0].find(f => f.data.id === 'nowak'); show(sa); show(ag); run.sa = sa; run.ag = ag; for (const f of m.side[1]) hide(f); const [, a, b, c] = m.side[1]; show(a); show(b); show(c); run.att = [a, b, c];
    run.reset = () => { stand(sa, P.CX - 60, P.CY, 0); stand(ag, P.CX - 100, P.CY + 120, 0); m.giveTo(m.humans[0], sa); stand(a, P.CX + 40, P.CY, Math.PI); stand(b, P.CX + 80, P.CY - 90, Math.PI); stand(c, P.CX + 80, P.CY + 90, Math.PI); ballTo(m, a); }; run.reset(); },
  steps: [
    { say: ["Win it back three times. Pass button to poke, shoot to slide, lob to barge. Ball first. If you foul, it doesn't count."], goal: { event: 'tackleWon', count: 3, where: (ev, m) => ev.who.side === 0 } , fail: { event: 'foul', where: ev => ev.who.side === 0 } },
    { say: ['Now switch. The free man is your other player. Press switch to take him.'], goal: { event: 'switch', count: 1, where: (ev, m, run) => ev.who === run.ag } },
    { say: ['Read the pass and step into it. Intercept two.'], goal: { event: 'intercept', count: 2, where: ev => ev.who.side === 0 } }
  ],
  script(m, f, run) { if (f.side === 1 && run.att.includes(f)) { const it = EF.Intent.make(); if (m.owner === f) { run.pT = (run.pT || 0) + 1 / 120; if (run.pT > 1.4) { run.pT = 0; const to = run.att.filter(q => q !== f)[Math.floor(m.rng() * 2)]; it.target = to; it.pass.pressed = true; } else it.move = [-.25, Math.sin(m.t * 2) * .3]; } return it; } return null; } });
EF.def('drill', 'setpieces', { title: 'DEAD BALLS', coach: 'mags', teaches: 'Corners, free kicks, penalties, saving penalties', n: 7,
  setup(m, run) { for (const f of m.side.flat()) show(f); },
  steps: [
    { say: ['A corner. Move the ring with the stick, then lob to cross it. Get on the end of it!'], setup(m) { m.startSetpiece('corner', 0, { gx: m.goalX(0), y: P.Y0 }); }, goal: { event: 'goal', count: 1, where: (ev, m) => ev.side === 0 && ev.goal && ev.goal.corner }, retry: m => m.startSetpiece('corner', 0, { gx: m.goalX(0), y: P.Y0 }) },
    { say: ['A free kick over the wall. Aim the cross-hair with the stick, hold shoot, and curl it.'], setup(m) { m.startSetpiece('freekick', 0, { x: m.goalX(0) - m.dir(0) * 200, y: P.CY - 40 }); }, goal: { event: 'goal', count: 1, where: (ev) => ev.side === 0 && ev.goal && ev.goal.freekick }, retry: m => m.startSetpiece('freekick', 0, { x: m.goalX(0) - m.dir(0) * 200, y: P.CY - 40 }) },
    { say: ['A penalty. Aim at a corner, hold shoot for power. Too much and it goes over.'], setup(m) { m.startSetpiece('penalty', 0, {}); }, goal: { event: 'goal', count: 1, where: (ev) => ev.side === 0 && ev.goal && ev.goal.pen }, retry: m => m.startSetpiece('penalty', 0, {}) },
    { say: ['Now you are in goal. Pick a side with the stick, and press pass to dive as he kicks.'], setup(m) { m.startSetpiece('penalty', 1, {}); }, goal: { event: 'save', count: 1, where: ev => ev.kind === 'penalty' }, retry: m => m.startSetpiece('penalty', 1, {}) }
  ] });
EF.def('drill', 'euphoria', { title: 'FEED THE CROWD', coach: 'mags', teaches: 'Euphoria, Europhoria, Super Strikes, the Save Duel', n: 8,
  setup(m, run) { for (const f of m.side.flat()) show(f); m.cheats.euphoria0 = false; },
  steps: [
    { say: ['The crowd is your power bar. Passes, tricks and tackles fill it. Fill it to the top.'], setup(m) { m.euphoria[0] = 40; }, test(m, run) { run.count = Math.round(m.euphoria[0]); run.of = 100; return m.euphoria[0] >= 100 || !!m.europhoria; } },
    { say: ['Full! Press L1 and R1 together (Space on a keyboard) for EUROPHORIA!'], setup(m) { m.euphoria[0] = 100; }, goal: { event: 'europhoria', count: 1, where: ev => ev.side === 0 } },
    { say: ['In Europhoria, charge a shot to the top and let go: a SUPER STRIKE. Score one.'], setup(m) { if (!m.europhoria) { m.euphoria[0] = 100; m.triggerEuphoria(0); } m.superUsed = false; const s = m.side[0].find(f => f.data.captain); stand(s, m.goalX(0) - m.dir(0) * 180, P.CY, m.dir(0) > 0 ? 0 : Math.PI); ballTo(m, s); }, goal: { event: 'goal', count: 1, where: (ev) => ev.side === 0 && ev.goal && ev.goal.super }, retry: (m) => { m.europhoria = null; m.euphoria[0] = 100; m.triggerEuphoria(0); m.superUsed = false; const s = m.side[0].find(f => f.data.captain); stand(s, m.goalX(0) - m.dir(0) * 180, P.CY, m.dir(0) > 0 ? 0 : Math.PI); ballTo(m, s); } },
    { say: ['Their turn. When a super comes at you, a ring shrinks round your keeper. Press pass right on it.'], setup(m, run) { run.duel = 0; }, goal: { event: 'saveDuelResult', count: 1, where: ev => ev.result !== 'miss' } }
  ],
  tick(m, run, dt) { if (run.step !== 3 || m.duel || m.superSeq || (m.ball.superPath)) return; run.duel -= dt; if (run.duel > 0) return; run.duel = 5; m.europhoria = null; m.euphoria[1] = 100; m.triggerEuphoria(1); m.superUsed = false; const s = m.side[1][4]; s.body.x = m.goalX(1) - m.dir(1) * 170; s.body.y = P.CY; s.facing = m.dir(1) > 0 ? 0 : Math.PI; ballTo(m, s); run.cpuSuper = s; },
  script(m, f, run) { if (run.step === 3 && f === run.cpuSuper && m.owner === f) { const it = EF.Intent.make(); it.shoot.down = true; it.power = .95; return it; } return null; } });
EF.def('drill', 'theatrics', { title: 'THE DARK ARTS', coach: 'mags', teaches: 'Dives and the referee', n: 9,
  setup(m, run) { for (const f of m.side[0]) hide(f); const f0 = m.side[0].find(f => f.data.id === 'tran'); show(f0); run.me = f0; for (const f of m.side[1]) hide(f); run.def = m.side[1][2]; show(run.def); m.ref.data = Object.assign({}, m.ref.data, { gullibility: .9 }); run.reset = () => { stand(f0, m.goalX(0) - m.dir(0) * 100, P.CY, m.dir(0) > 0 ? 0 : Math.PI); ballTo(m, f0); stand(run.def, f0.body.x + m.dir(0) * 30, P.CY + 6, m.dir(0) > 0 ? Math.PI : 0); }; run.reset(); },
  steps: [
    { say: ["I don't like it, but you should know it. When a defender touches you, press theatrics (L2, or C). The ref might buy it."], goal: { event: 'diveWon', count: 1, where: ev => ev.who.side === 0 }, retry: (m, run) => run.reset() },
    { say: ['Now try it with nobody near you. Go on. Dive.'], setup(m, run) { hide(run.def); }, goal: { event: 'diveBooked', count: 1, where: ev => ev.who.side === 0 }, done: 'Booked. Now you know. Never do that in a real match. Well. Hardly ever.' }
  ],
  script(m, f, run) { if (f === run.def && run.step === 0) { const it = EF.Intent.make(), me = run.me, d = H.d(me.body, f.body); if (d > 4) it.move = [(me.body.x - f.body.x) / d * .7, (me.body.y - f.body.y) / d * .7]; return it; } return null; } });
EF.DRILLS = ['move', 'passing', 'shooting', 'air', 'skills', 'defending', 'setpieces', 'euphoria', 'theatrics'];
/* ==== src/55-chants.js ==== */
/* CHANTS (section 7.8): each team's, sung by the crowd engine's choir: [note, vowel, beats, clap]. '.' rests (a clap). */
EF.def('chant', 'kipperton', { bpm: 120, reps: 2, words: 'KIP-PER-TON!', notes: [['G4', 'i', 1], ['G4', 'e', 1], ['C5', 'o', 2], ['.', '', .5, true], ['.', '', .5, true], ['.', '', 1, true]] });
EF.def('chant', 'kipperton2', { bpm: 108, reps: 1, words: "WE'RE GOING UP THE COAST", notes: [['G4', 'i', 1], ['C5', 'o', 1], ['E5', 'i', 1], ['G5', 'u', 1], ['F5', 'e', 1], ['E5', 'o', 1], ['D5', 'o', 1], ['C5', 'o', 2]] });
EF.def('chant', 'hoofington', { bpm: 90, reps: 1, words: 'HOOOOOF!', notes: [['G2', 'u', 2], ['C3', 'u', 2]] });
EF.def('chant', 'pasapasa', { bpm: 112, reps: 2, words: 'O-LÉ!', notes: [['E5', 'o', 1], ['C5', 'e', 2], ['.', '', 1]] });
EF.def('chant', 'stahlpresse', { bpm: 132, reps: 2, words: 'HEY! HEY! HEY!', notes: [['.', '', .5, true], ['A4', 'e', .5], ['.', '', .5, true], ['A4', 'e', .5], ['.', '', .5, true], ['A4', 'e', 1]] });
EF.def('chant', 'lucchetto', { bpm: 70, reps: 1, words: 'MMMMMM', notes: [['A3', 'u', 1], ['C4', 'u', 1], ['E4', 'u', 1], ['D4', 'u', 1], ['C4', 'u', 2]] });
EF.def('chant', 'opulence', { bpm: 100, reps: 1, detune: 30, words: 'GOLF CLAPS', notes: [['.', '', 1, true], ['.', '', 1, true], ['G4', 'o', 1], ['C5', 'o', 1], ['E5', 'o', 2]] });
EF.def('chant', 'ole', { bpm: 100, reps: 1, words: 'OLÉ!', notes: [['C5', 'o', .5], ['G5', 'e', 1]] });
/* ==== src/90-start.js ==== */
/* START: game.debug (the tests' and tools' handle), EF.test hooks, the deep links, the content check, game.start. */
game.debug = {
  snapshot() {
    const c = EF.cur, m = c && c.m, sc = game.sceneName;
    const o = { scene: sc, part: EF.link.part, errors: game.errors.length, ui: EF.UI ? { screen: EF.UI.top && EF.UI.top() ? EF.UI.top().id : null, focus: EF.UI.focusId ? EF.UI.focusId() : null } : null,
      attract: EF.Attract ? { active: sc === 'attract', segment: EF.Attract.segment, idle: +(EF.Attract.idle || 0).toFixed(2) } : null, dev: EF.Dev ? { open: EF.Dev.isOpen, changed: EF.tuneChanged() } : null,
      hub: { active: EF.inSession, role: EF.Hub ? EF.Hub.role : null, sent: EF.Hub ? EF.Hub.sent : 0, received: EF.Hub ? EF.Hub.received : 0 }, touchOnly: EF.touchOnly(), cup: EF.Save ? EF.Save.cupState() : null };
    if (m) Object.assign(o, { mode: m.mode, half: m.half, clock: +m.clock.toFixed(2), minute: Math.floor(m.minute), stoppage: m.stoppage, score: m.score.slice(), ball: [Math.round(m.ball.x), Math.round(m.ball.y), Math.round(m.ball.z)], owner: m.owner ? m.owner.data.name : null,
      humans: m.humans.map(h => ({ p: h.n, id: h.fb ? h.fb.id : null, name: h.fb ? h.fb.data.name : null, x: h.fb ? Math.round(h.fb.body.x) : 0, y: h.fb ? Math.round(h.fb.body.y) : 0, state: h.fb ? h.fb.state : null })),
      euphoria: m.euphoria.map(Math.round), europhoria: m.europhoria ? { side: m.europhoria.side, t: +m.europhoria.t.toFixed(2) } : null, cards: m.stats.cards.slice(), sentOff: m.players.filter(f => f.sentOff).length,
      setpiece: m.setpiece ? m.setpiece.kind : null, shootout: m.shootout ? { score: m.shootout.score.slice(), kicks: m.shootout.kicks.map(k => k.length), winner: m.shootout.winner } : null, stadium: m.stadium.id, weather: m.weather ? m.weather.kind : null, replay: !!(c.replay && c.replay.playing), seed: m.seed });
    return o;
  },
  teleport(x, y, z = 0) { const c = EF.cur; if (!c) return; const h = c.m.humans[0]; const f = h && h.fb; if (!f) return; f.body.x = x; f.body.y = y; f.body.z = z; f.body.vx = f.body.vy = 0; }
};
/* ---- test hooks (section 11.2) ---- */
EF.test = {
  startMatch(o = {}) {
    const opts = Object.assign({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse', kind: 'kickabout', seed: 1, halfLength: 60, noReplay: true }, o);
    if (!opts.humans) opts.humans = o.humans === null ? [] : [{ input: game.input, side: 0 }];
    game.go('match', { opts, onEnd: o.onEnd || (r => { EF.test.lastResult = r; }) }, { fade: 0 }); game.advance(1 / 120);
    return EF.cur && EF.cur.m;
  },
  m() { return EF.cur && EF.cur.m; },
  giveBall(side, idx, x, y) { const m = this.m(); if (!m) return; const f = m.side[side][idx]; if (x !== undefined) { f.body.x = x; f.body.y = y; } m.setpiece = null; m.setMode('play'); for (const q of m.players) { q.order = null; q.frozen = false; } m.setOwner(f, 'test'); m.ball.held = false; const h = m.humans.find(q => q.side === side); if (h && f.role !== 'GK') m.giveTo(h, f); return f; },
  place(id, x, y) { const m = this.m(); const f = m.players[id]; f.body.x = x; f.body.y = y; f.body.vx = f.body.vy = 0; },
  setEuphoria(side, v) { const m = this.m(); m.euphoria[side] = v; },
  cheat(name, on = true) { const m = this.m(); if (m) m.cheats[name] = on; },
  simUntil(pred, max = 30) { for (let t = 0; t < max; t += 1 / 120) { game.advance(1 / 120); if (pred(this.m())) return true; } return false; }
};
/* ---- the content check (section 4.6): every reference resolves, every text draws ---- */
EF.validate = () => {
  const out = [], need = (kind, id, where) => { if (id && !EF.get(kind, id)) out.push(where + ': no ' + kind + ' "' + id + '"'); };
  const drawable = /^[\x20-\x7EÉÈÁÓÜÖÄÑÇéèáóüöäñç♥★←→↑↓•×♪▸©]*$/;
  const text = (s, where) => { if (typeof s === 'string' && !drawable.test(s.replace(/\{\$\w+\}/g, ''))) out.push(where + ': undrawable character in "' + s.slice(0, 40) + '"'); };
  for (const t of EF.all('team')) {
    need('stadium', t.stadium, 'team ' + t.id); need('formation', t.formation, 'team ' + t.id); need('tactic', t.tactic, 'team ' + t.id); need('chant', t.chant, 'team ' + t.id); need('celebration', t.celebration, 'team ' + t.id);
    if (t.players.length !== 5) out.push('team ' + t.id + ': ' + t.players.length + ' players'); if (t.players.filter(p => p.captain).length !== 1) out.push('team ' + t.id + ': captains'); if (t.players.filter(p => p.pos === 'GK').length !== 1) out.push('team ' + t.id + ': keepers');
    for (const p of t.players) { text(p.name, 'player ' + p.id); if (p.captain) need('super', p.super, 'player ' + p.id); if (p.celebration) need('celebration', p.celebration, 'player ' + p.id); }
    text(t.name, 'team ' + t.id);
  }
  for (const s of EF.all('stadium')) { for (const e of s.events || []) need('event', e, 'stadium ' + s.id); need('referee', s.referee, 'stadium ' + s.id); for (const b of s.boards || []) text(b, 'stadium ' + s.id); }
  for (const l of EF.all('lines')) for (const e of l.entries) { text(e.text, 'lines ' + l.id); if (e.reply) text(e.reply.text, 'lines ' + l.id); if (!EF.CAST[e.who]) out.push('lines ' + l.id + ': no speaker ' + e.who); }
  for (const b of EF.all('beat')) for (const st of b.steps || []) { if (st.team) need('team', st.team, 'beat ' + b.id); if (st.photo) { need('team', st.photo.team, 'beat ' + b.id); } for (const k of ['headline', 'sub', 'body']) text(st[k], 'beat ' + b.id); for (const ln of st.lines || []) text(ln[1], 'beat ' + b.id); }
  for (const s of EF.all('sticker')) text(s.name, 'sticker ' + s.id);
  return out;
};
/* every scene shows the dev drawer (menus wait while it is open) and the toasts */
for (const id of Object.keys(EF.scenes)) {
  const S = EF.scenes[id], u = S.update, d = S.draw;
  S.update = function (dt) { if (EF.Dev) EF.Dev.update(dt); if (EF.Dev && EF.Dev.isOpen && id !== 'match' && id !== 'attract') return; return u.call(this, dt); };
  S.draw = function (r) { d.call(this, r); if (EF.Dev) EF.Dev.draw(r); };
}
/* ---- boot and start ---- */
EF.boot = () => {
  game.input.touchEnabled = false;   // no touch controls (section 2.5)
  EF.Anim.load();
  const bad = EF.validate(); if (bad.length) game.fail('content', new Error(bad.slice(0, 6).join('; ')));
};
(() => {
  const L = EF.link, scenes = EF.scenes;
  let scene = 'title', data;
  if (EF.inSession) scene = scenes.hubwait ? 'hubwait' : 'title';
  else if (L.scene && EF.deepLink) { const r = EF.deepLink(L); if (r) { scene = r[0]; data = r[1]; } }
  else if (L.scene === 'match') scene = 'match';
  if (!scenes[scene]) scene = scenes.title ? 'title' : 'match';
  game.start({ scenes, scene, data, boot: { title: 'EUROPHORIA FOOTBALL', version: EF.version, steps: [['Mowing the stripes', () => EF.boot()], ['Warming up the crowd', () => { if (EF.Save) EF.Save.load(); }], ['Polishing the cup', () => { if (EF.Dev && L.dev && !EF.inSession) game.after(.2, () => EF.Dev.open()); }]], messages: ['Smoking the kippers', 'Inflating the beach ball', 'Parking the bus', 'Chalking the lines', 'Bribing nobody'] } });
})();
})();
