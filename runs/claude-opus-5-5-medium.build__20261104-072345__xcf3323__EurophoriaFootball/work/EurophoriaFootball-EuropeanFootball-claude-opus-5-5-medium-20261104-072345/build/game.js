(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
let EF_ABOUT = null;
EF_ABOUT = {"sourceInformation":{"date":"2026-11-04 07:23:45","source":"European football (over the top arcade style)","plan":"PLAN.md","genre":"Arcade sports: 5-a-side football with a story-driven cup run, Kick-About, Penalties and Training","perspective":"TV-broadcast side-on camera raised 40 degrees and scrolling with play (a custom engine View), with Classic three-quarter and Aerial options; replays from a turned camera","tech":"my-3D2dge v0.85.2 (handoff package, two small engine changes listed in engine/CHANGES-ENGINE.md), AI Hub session client 1.4.0 pasted unmodified, plain JavaScript in one IIFE built from numbered fragments into one HTML file; Node 24 and Playwright 1.63 for tests and screenshots","artDirection":"my-3D2dge's native PS1-era pixel style: HD Humanoid rigs in club kits with hoops, stripes, halves, sashes and numbers; code-drawn stadiums with tiered crowds, LED sponsor boards, nets, floodlights and per-city skylines; crests, tabloids, a travel map, the trophy, the team bus and a trawler drawn in code","animation":"the engine's procedural Humanoid rig driven from each footballer's state: kick specs for passes, shots, volleys, pokes and slides, poses and expressions, the roll (flip) for launched players and dives, lying down along the dive direction for goalkeeper dives, celebrations built from poses and attack specs; no mocap clips","audio":"all in code: the engine's chip synth for SFX and 15 original songs (the Europhoria anthem and its variations), a WebAudio crowd engine (a band-passed noise bed that follows the crowd's mood, OOOHs, roars, boos, whistles, claps), sung team chants from formant voices, and Animalese-style babble voices for the commentators, the PA, the story characters and players; no audio files","online":"AI Hub Session Protocol v1, shared-world, 2-4 players: the game's own card (the tunnel), host-run match with input messages using cumulative press counters, 14 Hz snapshots and coalesced reliable events, client interpolation 100 ms behind, server mode, leave, time-up, finish with standings, stats and Player of the Match, and an in-session settings overlay","testing":"headless Node tests behind one command (node tools/test.mjs: unit, rules, content, ui, saves, attract, dev, determinism, playthrough, hubsim, lint, plus an AI balance soak), the AI Hub harness in Chromium for all four scenarios (tools/hubcheck.mjs), the engine's check tool and Playwright screenshots only for what a script can't check","research":"read the engine handoff README, API.md in full, parts of API-INDEX.md and the engine source (Dialog, Settings, Shell, Input halves, Humanoid torso and moves, Audio internals), the SPORTS kit, the template's test, and the AI Hub README; no web research","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-opus-5-5, reasoning effort medium","usage":"unknown cost and token count (no estimates available in the session); session time about 1 hour 25 minutes (07:23 to about 08:48)"},"testingFeedback":["About 18 real issues: a crowd throw-back that re-triggered forever (a soft lock), far too many red cards, own goals from lobbing to your own keeper and from a keeper standing behind his line, keepers not reading chips, passes that ignored ball friction and missed moving receivers, low AI pass completion and shot counts, a non-ASCII commentary line, an idle watcher that never fired headless, menu focus skipping disabled touch-only tiles, a training crash after the last drill step, a net collision that drew solid white blocks, a Save Duel that re-entered itself in a loop, commentary covering the set-piece prompts, an unreadable ball sprite, and an invincible-keeper cheat with holes.","Four were game breaking: the crowd throw-back soft lock, the training crash, the Save Duel loop, and goals counted after a keeper teleported behind his own line.","The scripted playthrough of the whole Cup Run (title, every story beat, five matches, the ending, then Kick-About, Penalties, Training, About and the album), with the AI Hub harness a close second: it proved the online flow in all four scenarios.","The lint scan for forbidden browser APIs: it mostly produced false positives (EF.prompt looked like prompt()) and never found a real problem."],"engineFeedback":["The exact fixed-step headless mode: game.advance and input.tap made the whole game, including a two-copy online loopback, testable in Node in seconds; and the standard pause, settings, rebinding and full-screen features came for free.","Yes: TileMap walls used for goal nets render as solid boxes, scene changes fade so tests saw the old scene, input.tap only counts during a step, the boot runs asynchronously, and the camera zoom is the scene's start times setZoom times the player's, which took a few screenshots to get right.","The football itself: ball physics with posts, bar and nets, footballers with every action, goalkeepers, the team AI, the rules and set pieces, the referee, Euphoria and super strikes; plus a 10-foot UI kit, button glyphs, the crowd and babble audio and the hub netcode.","Football-specific animation on a rig with no whole-body tilt: keeper dives, bicycle kicks and diving headers had to be faked with the roll, lying down along a turned facing and height offsets.","Two changes: Dialog voices may be a function called per revealed letter (for babble voices), and the Humanoid torso paints kit patterns (hoops, stripes, halves, sash) and shirt numbers.","A whole-body tilt or rotation state for the Humanoid (sideways and forward falls at any angle), and a public audio bus API so games can route their own WebAudio through the master volume."],"promptFeedback":["It is precise about the deliverable, the controller-first 10-foot UX, the attract mode, dev mode and the exit interview, and the plan it came with was deep enough to build from directly.","TASK.md asks to pick the title with a random number generator while STAGE.md says to use the plan's title (I used the plan's, which it had picked that way), and the plan's folder names carried another run's model and timestamp.","The scope: a feature-complete cup run with story, nine drills, penalties, local multiplayer, online shared-world netcode, attract mode and dev mode, all verified without playing by hand.","Give a prioritised must-have and nice-to-have list with a time budget, and say whether optional parts of the plan (mocap clips, every listed animation) may be simplified."],"aiHub":{"name":"Europhoria Football","tagline":"Over-the-top arcade football","description":"A broke seaside club rides its fans' euphoria through Europe's grandest cup: 5-a-side arcade football with super strikes, dives, VAR and a crowd that powers your team.","type":"Game","genre":"Sports","source":"European football","series":"","players":"1–4","controls":"Stick/WASD move, ✕/J pass, □/K shoot (hold), ○/L lob, R1/E skill, R2/Shift sprint, L1+R1/Space Europhoria","tags":["arcade","pixel art","comedy","versus","co-op","retro"]}};

/* ===== 00-core.js ===== */
/* EUROPHORIA FOOTBALL: over-the-top arcade football on my-3D2dge.
 * 00-core: the EF namespace, the registries (the designers' language), the event bus, the live tuning table (dev
 * sliders), random streams, deep links, the broadcast view, the input preset, the game's settings and the Game itself. */
const EF = {};
EF.scenes = {};
const VERSION = '1.0.0';
EF.VERSION = VERSION;
const PI = Math.PI;

/* ---- registries: EF.def(kind, id, spec), EF.get(kind, id), EF.all(kind) ---- */
const REG = {};
EF.def = (kind, id, spec) => { (REG[kind] = REG[kind] || new Map()).set(id, Object.assign({ id }, spec)); return REG[kind].get(id); };
EF.get = (kind, id) => (REG[kind] && REG[kind].get(id)) || null;
EF.all = kind => REG[kind] ? [...REG[kind].values()] : [];
EF.lines = (pool, entries) => { const old = EF.get('lines', pool); EF.def('lines', pool, { list: (old ? old.list : []).concat(entries) }); };

/* ---- the event bus: the match emits, presentation listens ---- */
EF.bus = {
  _h: {},
  on(type, fn) { (this._h[type] = this._h[type] || []).push(fn); return () => this.off(type, fn); },
  off(type, fn) { const l = this._h[type]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(type, ev) {
    ev.type = type;
    for (const k of [type, '*']) for (const fn of (this._h[k] || []).slice()) { try { fn(ev); } catch (e) { game.fail('event ' + type, e); } }
    return ev;
  }
};

/* ---- the tuning table (Appendix A): live dev sliders, kept until reset ---- */
EF.TUNE = [
  ['runSpeed', 88, 60, 130, 1, 'Movement'], ['sprintMul', 1.45, 1.1, 2, .05, 'Movement'], ['accel', 900, 300, 2000, 50, 'Movement'],
  ['staminaDrain', 20, 5, 50, 1, 'Movement'], ['staminaRegen', 14, 5, 40, 1, 'Movement'],
  ['ballFriction', 1.1, .3, 3, .05, 'Ball'], ['ballBounce', .55, .1, .9, .05, 'Ball'], ['ballGravity', 600, 300, 1000, 10, 'Ball'], ['trapSpeed', 210, 120, 320, 5, 'Ball'],
  ['passSpeedMin', 150, 80, 250, 5, 'Passing & Shooting'], ['passSpeedMax', 300, 200, 450, 5, 'Passing & Shooting'], ['passAssistDeg', 70, 0, 90, 5, 'Passing & Shooting'],
  ['shotChargeTime', .8, .3, 2, .05, 'Passing & Shooting'], ['shotSpeedMax', 420, 250, 600, 10, 'Passing & Shooting'], ['curlStrength', 3.2, 0, 8, .1, 'Passing & Shooting'],
  ['keeperReaction', .18, .05, .5, .01, 'Keepers'], ['keeperReach', 48, 24, 80, 1, 'Keepers'],
  ['tackleReach', 9, 4, 16, .5, 'Defending & Rules'], ['slideSpeed', 190, 100, 300, 5, 'Defending & Rules'], ['foulStrictness', 1, 0, 2, .05, 'Defending & Rules'], ['diveSuccess', 1, 0, 2, .05, 'Defending & Rules'],
  ['euphoriaGain', 1, 0, 4, .1, 'Euphoria'], ['euphoriaDecay', 1.5, 0, 6, .1, 'Euphoria'], ['europhoriaTime', 8, 3, 20, .5, 'Euphoria'], ['superSpeed', 520, 300, 800, 10, 'Euphoria'],
  ['aiReaction', .25, .05, .8, .01, 'AI'], ['aiAccuracy', .8, .3, 1, .05, 'AI'], ['aiAggression', .5, 0, 1, .05, 'AI'],
  ['halfLength', 120, 20, 300, 10, 'Match'], ['gameSpeed', 1, .25, 2, .05, 'Match']
];
EF.T = {}; EF.TDEF = {};
for (const [k, v] of EF.TUNE) { EF.T[k] = v; EF.TDEF[k] = v; }
EF.tuneLoad = () => {
  if (window.AIHub && AIHub.active) return;
  const saved = E.store.get('ef:tuning', null);
  if (saved && typeof saved === 'object') for (const k in saved) if (k in EF.T && typeof saved[k] === 'number') EF.T[k] = saved[k];
};
EF.tuneSave = () => { const d = {}; for (const k in EF.T) if (EF.T[k] !== EF.TDEF[k]) d[k] = EF.T[k]; E.store.set('ef:tuning', d); };
EF.tuneReset = k => { if (k) EF.T[k] = EF.TDEF[k]; else for (const j in EF.T) EF.T[j] = EF.TDEF[j]; EF.tuneSave(); };
EF.tuneChanged = () => Object.keys(EF.T).filter(k => Math.abs(EF.T[k] - EF.TDEF[k]) > 1e-9);

/* ---- random streams: the match draws from its own seeded rng; cosmetics from fxRng ---- */
EF.fxRng = E.rng(0xEF0F);
EF.fx = (a = 0, b = 1) => a + EF.fxRng() * (b - a);
EF.fxPick = l => l[Math.floor(EF.fxRng() * l.length)];

/* ---- small helpers ---- */
const hyp = Math.hypot, sgn = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const segDist = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return hyp(a.x + vx * u - o.x, a.y + vy * u - o.y); };
EF.segDist = segDist;
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
EF.mmss = mmss;
// a gaussian-ish error from an rng
const gauss = rng => (rng() + rng() + rng() - 1.5) / .5;

/* ---- deep links: #scene/part and ?seed= ?touchonly=1 ?dev=1 ---- */
const LINK = (() => {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1), q = (typeof location !== 'undefined' && location.search) || '';
  const [scene, part, extra] = h.split('/');
  const num = k => { const m = new RegExp('[?&]' + k + '=(\\d+)').exec(q); return m ? +m[1] : null; };
  return { scene: scene || null, part: part || null, extra: extra || null, seed: num('seed'), touchonly: /[?&]touchonly=1/.test(q), dev: /[?&]dev=1/.test(q) };
})();
EF.LINK = LINK;
const SESSION = !!(typeof window !== 'undefined' && window.AIHub && AIHub.active);
EF.SESSION = SESSION;

/* ---- the broadcast camera: side-on, raised 40 degrees (and the replay's low pitchside camera) ---- */
E.VIEWS.broadcast = E.VIEWS.broadcast || new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
E.VIEWS.pitchside = E.VIEWS.pitchside || new E.View('pitchside', 'Pitchside', 0, 24, 1, 1);
EF.CAMS = { broadcast: 'broadcast', classic: 'threequarter', aerial: 'topdown' };

/* ---- the input preset: DEFAULT's moves and menu keys, then the game's actions in this order (half keyboards give them
 * F G H R T Y V B and . / , L ; ' K M in turn) ---- */
EF.KEYS = {};
for (const k of ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel']) EF.KEYS[k] = E.Input.DEFAULT[k].slice();
Object.assign(EF.KEYS, {
  pass: ['KeyJ', 'Pad0'], shoot: ['KeyK', 'Pad2'], lob: ['KeyL', 'Pad1'], through: ['KeyI', 'Pad3'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad7'], skill: ['KeyE', 'Pad5'], switch: ['KeyQ', 'Pad4'], dive: ['KeyC', 'Pad6'], euphoria: ['Space']
});
// confirm/cancel keep Enter/Space/Escape/Backspace (and the pad's ✕ ○); J and K stay game buttons in play
EF.KEYS.confirm = ['Enter', 'Space', 'NumpadEnter', 'Pad0'];
EF.KEYS.cancel = ['Escape', 'Backspace', 'Pad1'];
EF.ACTIONS = ['pass', 'shoot', 'lob', 'through', 'sprint', 'skill', 'switch', 'dive', 'euphoria'];

/* ---- the game's settings (group Game unless noted) ---- */
const opt = (key, label, value, options, o = {}) => Object.assign({ key, label, type: 'select', value, options, group: 'Game' }, o);
EF.SETTINGS = [
  opt('difficulty', 'Difficulty', 'normal', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard'], ['europhoric', 'Europhoric']]),
  opt('halfLen', 'Half length', '120', [['90', '1:30'], ['120', '2:00'], ['180', '3:00'], ['240', '4:00']]),
  opt('passAssist', 'Pass assist', 'high', [['off', 'Off'], ['low', 'Low'], ['high', 'High']]),
  opt('shotAssist', 'Shot assist', 'on', [['on', 'On'], ['off', 'Off']]),
  opt('switching', 'Switching', 'assisted', [['auto', 'Auto'], ['assisted', 'Assisted'], ['manual', 'Manual']]),
  opt('cards', 'Cards', 'normal', [['off', 'Off'], ['normal', 'Normal'], ['strict', 'Strict']]),
  opt('draws', 'Kick-About draws', 'allowed', [['allowed', 'Allowed'], ['golden', 'Golden goal'], ['pens', 'Penalties']]),
  opt('prompts', 'Prompts', 'learning', [['always', 'Always'], ['learning', 'While learning'], ['off', 'Off']]),
  opt('commentary', 'Commentary', 'on', [['on', 'On'], ['off', 'Off']]),
  opt('replays', 'Replays', 'on', [['on', 'On'], ['off', 'Off']]),
  opt('camera', 'Camera', 'broadcast', [['broadcast', 'Broadcast'], ['classic', 'Classic'], ['aerial', 'Aerial']], { apply: (g, v) => { if (g.scene && g.scene.isMatch) g.setView(EF.CAMS[v] || 'broadcast'); } }),
  opt('radar', 'Radar', 'on', [['on', 'On'], ['off', 'Off']]),
  { key: 'voices', label: 'Voices', type: 'slider', value: .8, group: 'Sound', apply: (g, v) => EF.babble && EF.babble.volume(v) },
  { key: 'crowd', label: 'Crowd', type: 'slider', value: .8, group: 'Sound', apply: (g, v) => EF.crowdAudio && EF.crowdAudio.volume(v) },
  { key: 'glyphs', group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']],
    apply: (g, v) => { g.input.glyphs = v; for (const p of g.players || []) p.glyphs = v; } }
];

/* ---- the Game ---- */
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', bg: '#06070c', id: 'europhoria-football',
  input: EF.KEYS, corner: !SESSION, autoPause: !SESSION,
  menu: {
    settings: EF.SETTINGS,
    controls: { pass: 'Pass / Tackle', shoot: 'Shoot / Slide', lob: 'Lob / Barge', through: 'Through ball / Switch', sprint: 'Sprint', skill: 'Skill move', switch: 'Switch / One-two', dive: 'Theatrics', euphoria: 'Europhoria' },
    items: SESSION ? [] : [['Restart match', () => EF.restartMatch && EF.restartMatch()], ['Dev mode', () => EF.Dev && EF.Dev.open(true)]],
    quit: SESSION ? false : 'title', saves: false
  } });
EF.game = game;
const I0 = game.input;
I0.touchEnabled = false;
if (!game.headless) new E.Shell(game, { theme: { ink: '#fff6e0', paper: 'rgba(13,20,48,.94)', accent: '#ffc83a', muted: '#9aa6c8', danger: '#ff5a4a', line: 'rgba(255,200,58,.35)' } });
const A = game.audio, PFX = game.particles, LIGHTS = game.lights;
EF.tuneLoad();
EF.settingHalf = () => (EF.T.halfLength !== EF.TDEF.halfLength ? EF.T.halfLength : +(game.settings.halfLen || 120));
EF.diff = () => ({ easy: { react: .38, acc: .6, agg: .3, keeper: .26, gain: .8, cpuSave: .15 }, normal: { react: .25, acc: .8, agg: .5, keeper: .19, gain: 1, cpuSave: .3 },
  hard: { react: .16, acc: .9, agg: .7, keeper: .15, gain: 1.15, cpuSave: .45 }, europhoric: { react: .1, acc: .97, agg: .85, keeper: .12, gain: 1.3, cpuSave: .55 } })[game.settings.difficulty || 'normal'] || { react: .25, acc: .8, agg: .5, keeper: .19, gain: 1, cpuSave: .3 };


/* ===== 01-input.js ===== */
/* 01-input: controllers that turn devices into Intents: HumanController (a pad, the keyboard or half of it, with mouse
 * aim), RemoteController (a hub client's input messages), ScriptController (tests, training dummies, the attract mode).
 * Also the Europhoria chord (L1 + R1 / Q + E within 120 ms), the mouse's buttons and touch-only detection. */
const BTN = ['pass', 'shoot', 'lob', 'through', 'skill', 'switch', 'dive'];
// the mouse: its buttons read by our own listeners, so a click never fires a pass from a gamepad session
EF.mouse = { down: [false, false, false], pressed: [false, false, false], released: [false, false, false], moved: -99, x: 0, y: 0, wheel: 0 };
EF.mouseFeed = (type, button = 0) => {
  const M = EF.mouse;
  if (type === 'down') { M.down[button] = true; M.pressed[button] = true; }
  if (type === 'up') { M.down[button] = false; M.released[button] = true; }
  if (type === 'move') M.moved = game.real;
};
EF.mouseEndStep = () => { const M = EF.mouse; M.pressed = [false, false, false]; M.released = [false, false, false]; };
if (!game.headless && typeof addEventListener === 'function') {
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.target && e.target.id === 'screen') EF.mouseFeed('down', e.button); });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse') EF.mouseFeed('up', e.button); });
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) EF.mouseFeed('move'); });
  addEventListener('contextmenu', e => { if (e.target && e.target.id === 'screen') e.preventDefault(); });
  addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
}
const bstate = (I, a) => ({ down: I.down(a), pressed: I.pressed(a), released: I.released(a) });
class HumanController {
  constructor(input) { this.I = input; this.mouseAim = false; this.chordT = { switch: -9, skill: -9 }; this.sprinting = false; this.used = {}; }
  get device() { return this.mouseAim ? 'mouse' : this.I.lastDevice; }
  /** this step's Intent for the footballer the slot holds */
  intent(m, sl) {
    const I = this.I, mv = I.move(), M = EF.mouse;
    const d = hyp(mv[0], mv[1]) > .05 ? game.view.screenDirToGround(mv[0], mv[1]) : [0, 0];
    const l = hyp(d[0], d[1]), ml = Math.min(1, hyp(mv[0], mv[1])), move = l > 1e-6 ? [d[0] / l * ml, d[1] / l * ml] : [0, 0];
    // mouse aim: on while the mouse moves over the canvas (player 1 only), off after 3 s still or when the stick moves
    if (I === game.input) {
      if (game.real - M.moved < .05) this.mouseAim = true;
      if (game.real - M.moved > 3 || (I.lastDevice === 'gamepad' && ml > .3)) this.mouseAim = false;
    }
    const it = { move, aim: null, aimPoint: null, sprint: I.down('sprint'), euphoria: false, target: null };
    for (const a of BTN) it[a === 'switch' ? 'sw' : a] = bstate(I, a);
    if (this.mouseAim) {
      const g = game.mouseGround && game.mouseGround();
      if (g && sl.f) { it.aimPoint = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y }; it.aim = [it.aimPoint.x - sl.f.body.x, it.aimPoint.y - sl.f.body.y]; }
      const mb = k => ({ down: M.down[k], pressed: M.pressed[k], released: M.released[k] });
      const or = (a, b) => ({ down: a.down || b.down, pressed: a.pressed || b.pressed, released: a.released || b.released });
      it.pass = or(it.pass, mb(0)); it.shoot = or(it.shoot, mb(2)); it.lob = or(it.lob, mb(1));
      // a click on a teammate: a pass to him (with the ball) or a switch to him (without)
      if (M.pressed[0] && it.aimPoint) {
        const t = m.side[sl.side].filter(p => !p.sentOff && p !== sl.f && hyp(p.body.x - it.aimPoint.x, p.body.y - it.aimPoint.y) < 14)[0];
        if (t) it.target = t.id;
      }
    }
    // the Europhoria chord: switch + skill within 120 ms, or its own key
    const now = game.real;
    if (I.pressed('switch')) this.chordT.switch = now;
    if (I.pressed('skill')) this.chordT.skill = now;
    const chord = Math.abs(this.chordT.switch - this.chordT.skill) < .12 && (I.pressed('switch') || I.pressed('skill'));
    it.euphoria = I.pressed('euphoria') || chord;
    if (chord) { it.sw = {}; it.skill = {}; }
    this.sprinting = it.sprint;
    for (const a of BTN) if (I.pressed(a)) this.used[a] = (this.used[a] || 0) + 1;
    return it;
  }
  peek(m, sl) { return this.intent(m, sl); }
  duelPressed() { return this.I.pressed('pass') || this.I.pressed('confirm') || EF.mouse.pressed[0]; }
  celebPick() { const I = this.I; return I.pressed('pass') ? 0 : I.pressed('shoot') ? 1 : I.pressed('lob') ? 2 : I.pressed('through') ? 3 : -1; }
}
EF.HumanController = HumanController;
/** a hub client's input: the newest message by sequence; presses from cumulative counters (a lost packet loses none) */
class RemoteController {
  constructor() { this.msg = null; this.last = [0, 0, 0, 0, 0, 0, 0, 0]; this.at = -9; this.pressed = {}; this.sprinting = false; this.duel = false; this.cel = -1; }
  feed(msg, now) {
    if (this.msg && msg.s <= this.msg.s) return;
    this.msg = msg; this.at = now;
    const keys = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive', 'euphoria'];
    (msg.c || []).forEach((c, i) => { if (c > this.last[i]) { this.pressed[keys[i]] = true; this.last[i] = c; } });
  }
  intent(m, sl) {
    const g = this.msg, fresh = g && game.real - this.at < .5;
    const it = { move: [0, 0], aim: null, aimPoint: null, sprint: false, euphoria: false, target: null };
    const held = fresh ? g.h : 0, bits = { sprint: 1, pass: 2, shoot: 4, lob: 8, through: 16, skill: 32, sw: 64, dive: 128 };
    if (fresh) { it.move = [g.m[0] / 100, g.m[1] / 100]; if (g.a) it.aim = [g.a[0] / 100, g.a[1] / 100]; }
    it.sprint = !!(held & 1); this.sprinting = it.sprint;
    for (const k of ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive']) {
      const down = !!(held & bits[k]), pr = !!this.pressed[k], was = !!(this.prevHeld & bits[k]);
      it[k] = { down: down || pr, pressed: pr, released: was && !down };
    }
    it.euphoria = !!this.pressed.euphoria;
    this.prevHeld = held; this.pressed = {};
    return it;
  }
  peek(m, sl) { return this.intent(m, sl); }
  duelPressed() { if (this.duel) { this.duel = false; return true; } return false; }
  celebPick() { const c = this.cel; this.cel = -1; return c; }
}
EF.RemoteController = RemoteController;
/** a scripted controller: fn(m, slot) returns an Intent (tests, training, the attract mode) */
class ScriptController {
  constructor(fn) { this.fn = fn; this.sprinting = false; }
  intent(m, sl) { const it = this.fn(m, sl) || NO_INTENT; this.sprinting = !!it.sprint; return it; }
  peek(m, sl) { return this.fn(m, sl, true) || NO_INTENT; }
  duelPressed(m, sl) { return !!(this.duelFn && this.duelFn(m, sl)); }
  celebPick() { return -1; }
}
EF.ScriptController = ScriptController;

/* ---- touch-only devices: no touch controls; the notice and the settings button ---- */
let touchOnlyNow = null;
EF.touchOnly = () => {
  if (touchOnlyNow !== null) return touchOnlyNow;
  if (LINK.touchonly) return (touchOnlyNow = true);
  try {
    const mm = typeof matchMedia === 'function' ? matchMedia : null;
    const coarse = mm && mm('(any-pointer: coarse)').matches, fine = mm && mm('(any-pointer: fine)').matches;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
    return (touchOnlyNow = !!(coarse && !fine && !pads));
  } catch (e) { return (touchOnlyNow = false); }
};
EF.clearTouchOnly = () => { touchOnlyNow = false; };
if (!game.headless && typeof addEventListener === 'function') {
  addEventListener('keydown', () => { if (touchOnlyNow) touchOnlyNow = false; });
  addEventListener('gamepadconnected', () => { touchOnlyNow = false; });
}


/* ===== 02-glyphs.js ===== */
/* 02-glyphs: button icons drawn by code (the pixel font has no ✕ ○ □ △): PlayStation shapes (the default) or Xbox
 * letters for a pad, keycaps for the keyboard, a mouse with its button lit. EF.prompt draws an action's icon for the
 * player's own binding on the device they used last, then its label. */
const PAD_PS = { Pad0: ['x', '#6aa0ff'], Pad1: ['o', '#ff5a5a'], Pad2: ['s', '#ff7ad0'], Pad3: ['t', '#3ad6a0'], Pad4: ['L1'], Pad5: ['R1'], Pad6: ['L2'], Pad7: ['R2'], Pad8: ['CREATE'], Pad9: ['OPTIONS'], Pad10: ['L3'], Pad11: ['R3'], Pad12: ['d', 'up'], Pad13: ['d', 'down'], Pad14: ['d', 'left'], Pad15: ['d', 'right'] };
const PAD_XB = { Pad0: ['A', '#3ac060'], Pad1: ['B', '#e84a4a'], Pad2: ['X', '#3a8af0'], Pad3: ['Y', '#f0c030'], Pad4: ['LB'], Pad5: ['RB'], Pad6: ['LT'], Pad7: ['RT'], Pad8: ['VIEW'], Pad9: ['MENU'], Pad10: ['LS'], Pad11: ['RS'], Pad12: ['d', 'up'], Pad13: ['d', 'down'], Pad14: ['d', 'left'], Pad15: ['d', 'right'] };
const MOUSE_OF = { pass: 0, shoot: 2, lob: 1, confirm: 0, cancel: 2 };
EF.Glyphs = { PAD_PS, PAD_XB };
const isPad = c => /^Pad\d+$/.test(c);
/** the code an action's prompt shows for an input on a device */
function promptCode(input, action, device) {
  const m = (input.map && input.map[action]) || EF.KEYS[action] || [];
  if (device === 'gamepad') return m.find(isPad) || null;
  if (device === 'mouse' && MOUSE_OF[action] != null) return 'Mouse' + MOUSE_OF[action];
  return m.find(c => !isPad(c) && !c.startsWith('Mouse') && !c.startsWith('PadAxis')) || null;
}
EF.promptCode = promptCode;
function glyphStyle(input) { const v = (input && input.glyphs) || game.settings.glyphs || 'playstation'; return v === 'xbox' ? 'xbox' : 'playstation'; }
EF.glyphStyle = glyphStyle;
/** draw one icon for a code at (x, y) (top-left), s = scale; returns its width */
function drawIcon(g, code, x, y, s = 1, style = 'playstation', input = game.input) {
  const S = 11 * s, cx = x + S / 2, cy = y + S / 2;
  if (!code) return 0;
  if (isPad(code)) {
    const def = (style === 'xbox' ? PAD_XB : PAD_PS)[code] || ['?'];
    const [k, col] = def;
    if (k.length === 1 && col) {   // a face button: a disc with its symbol
      px.disc(g, Math.round(cx), Math.round(cy), Math.round(S / 2), '#14141c'); px.disc(g, Math.round(cx), Math.round(cy), Math.round(S / 2) - s, '#2a2a36');
      const r = 3 * s;
      if (style === 'xbox') E.font.text(g, k, Math.round(cx), Math.round(cy - 3.5 * Math.max(1, s * .9)), col, { align: 'center', scale: Math.max(1, Math.round(s)), outline: false });
      else if (k === 'x') { px.line(g, cx - r, cy - r, cx + r, cy + r, col, Math.max(1, s)); px.line(g, cx - r, cy + r, cx + r, cy - r, col, Math.max(1, s)); }
      else if (k === 'o') { px.disc(g, Math.round(cx), Math.round(cy), Math.round(r + .5), col); px.disc(g, Math.round(cx), Math.round(cy), Math.max(1, Math.round(r + .5) - Math.max(1, s)), '#2a2a36'); }
      else if (k === 's') { px.rect(g, Math.round(cx - r), Math.round(cy - r), Math.round(r * 2), Math.max(1, s), col); px.rect(g, Math.round(cx - r), Math.round(cy + r - Math.max(1, s) + 1), Math.round(r * 2), Math.max(1, s), col); px.rect(g, Math.round(cx - r), Math.round(cy - r), Math.max(1, s), Math.round(r * 2), col); px.rect(g, Math.round(cx + r - Math.max(1, s) + 1), Math.round(cy - r), Math.max(1, s), Math.round(r * 2), col); }
      else if (k === 't') { const t = [[cx, cy - r - s * .5], [cx + r + s * .5, cy + r], [cx - r - s * .5, cy + r]]; for (let i = 0; i < 3; i++) px.line(g, t[i][0], t[i][1], t[(i + 1) % 3][0], t[(i + 1) % 3][1], col, Math.max(1, s)); }
      return S;
    }
    if (k === 'd') {   // the d-pad: a cross with one arm lit
      px.rect(g, Math.round(cx - 1.5 * s), Math.round(y), Math.round(3 * s), Math.round(S), '#3a3a48'); px.rect(g, Math.round(x), Math.round(cy - 1.5 * s), Math.round(S), Math.round(3 * s), '#3a3a48');
      const lit = { up: [cx - 1.5 * s, y, 3 * s, 4 * s], down: [cx - 1.5 * s, y + S - 4 * s, 3 * s, 4 * s], left: [x, cy - 1.5 * s, 4 * s, 3 * s], right: [x + S - 4 * s, cy - 1.5 * s, 4 * s, 3 * s] }[col];
      if (lit) px.rect(g, Math.round(lit[0]), Math.round(lit[1]), Math.round(lit[2]), Math.round(lit[3]), '#f4f4f0');
      return S;
    }
    // a shoulder, trigger or system button: a pill with its name
    const fs = Math.max(1, Math.round(s)), w = E.font.width(k, { scale: fs }) + 6 * s;
    px.rect(g, Math.round(x + s), Math.round(y), Math.round(w - 2 * s), Math.round(S), '#14141c'); px.rect(g, Math.round(x), Math.round(y + s), Math.round(w), Math.round(S - 2 * s), '#14141c');
    px.rect(g, Math.round(x + s), Math.round(y + s), Math.round(w - 2 * s), Math.round(S - 2 * s), '#3a3a4c');
    E.font.text(g, k, Math.round(x + w / 2), Math.round(y + (S - 7 * fs) / 2), '#f4f4f0', { align: 'center', scale: fs, outline: false });
    return w;
  }
  if (code.startsWith('Mouse')) {   // a mouse, the button lit
    const b = +code.slice(5), w = 8 * s, h = S;
    px.rect(g, Math.round(x + s), Math.round(y), Math.round(w - 2 * s), Math.round(h), '#e8e8f0'); px.rect(g, Math.round(x), Math.round(y + 2 * s), Math.round(w), Math.round(h - 4 * s), '#e8e8f0');
    px.rect(g, Math.round(x + s), Math.round(y + s), Math.round(w - 2 * s), Math.round(h - 2 * s), '#30303c');
    const lit = b === 0 ? [x + s, y + s, w / 2 - s, h * .45] : b === 2 ? [x + w / 2, y + s, w / 2 - s, h * .45] : [x + w / 2 - s, y + 2 * s, 2 * s, h * .3];
    px.rect(g, Math.round(lit[0]), Math.round(lit[1]), Math.max(1, Math.round(lit[2])), Math.round(lit[3]), '#ffc83a');
    px.rect(g, Math.round(x + w / 2 - s * .5), Math.round(y + s), Math.max(1, Math.round(s)), Math.round(h * .45), '#14141c');
    return w;
  }
  // a keycap with the key's name
  const lab = input.codeLabel ? input.codeLabel(code) : code.replace(/^Key|^Digit/, '');
  const fs = Math.max(1, Math.round(s)), tw = E.font.width(lab, { scale: fs }), w = Math.max(S, tw + 6 * s);
  px.rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(S), '#14141c');
  px.rect(g, Math.round(x + s), Math.round(y + s), Math.round(w - 2 * s), Math.round(S - 3 * s), '#e8e4d8');
  px.rect(g, Math.round(x + s), Math.round(y + S - 2 * s), Math.round(w - 2 * s), Math.round(s), '#8a8478');
  E.font.text(g, lab, Math.round(x + w / 2), Math.round(y + s + (S - 3 * s - 7 * fs) / 2), '#1a1a22', { align: 'center', scale: fs, outline: false });
  return w;
}
EF.drawIcon = drawIcon;
const deviceOf = input => (input && input.lastDevice === 'gamepad') ? 'gamepad' : input && input.lastDevice === 'mouse' ? 'mouse' : 'keyboard';
EF.deviceOf = deviceOf;
/** the icon for an action plus its label; o: { input, scale, color, device, shadow }. Returns the width drawn */
EF.prompt = (g, x, y, action, label, o = {}) => {
  const input = o.input || game.input, dev = o.device || deviceOf(input), s = o.scale || 1, codes = [].concat(action);
  let w = 0;
  codes.forEach((a, i) => { if (i) { E.font.text(g, o.sep || '+', Math.round(x + w + 1), Math.round(y + 2 * s), o.color || '#fff6e0', { scale: Math.max(1, Math.round(s)), shadow: '#000', outline: false }); w += 7 * s; } w += drawIcon(g, promptCode(input, a, dev), x + w, y, s, glyphStyle(input), input) + 2 * s; });
  if (label) { E.font.text(g, label, Math.round(x + w + 1), Math.round(y + (11 * s - 7 * Math.max(1, Math.round(s))) / 2), o.color || '#fff6e0', { scale: Math.max(1, Math.round(s)), shadow: '#000', outline: false }); w += E.font.width(label, { scale: Math.max(1, Math.round(s)) }) + 3; }
  return w;
};
EF.promptWidth = (action, label, o = {}) => {
  const input = o.input || game.input, dev = o.device || deviceOf(input), s = o.scale || 1, codes = [].concat(action);
  let w = 0;
  for (const [i, a] of codes.entries()) { if (i) w += 7 * s; const c = promptCode(input, a, dev); w += (c ? (isPad(c) ? ((style => { const d = (style === 'xbox' ? PAD_XB : PAD_PS)[c] || ['?']; return d[0].length === 1 ? 11 * s : E.font.width(d[0], { scale: Math.max(1, Math.round(s)) }) + 6 * s; })(glyphStyle(input))) : c.startsWith('Mouse') ? 8 * s : Math.max(11 * s, E.font.width(input.codeLabel ? input.codeLabel(c) : c, { scale: Math.max(1, Math.round(s)) }) + 6 * s)) : 0) + 2 * s; }
  if (label) w += E.font.width(label, { scale: Math.max(1, Math.round(s)) }) + 4;
  return w;
};
/** a row of prompts centred at x: [[action, label], ...] */
EF.promptRow = (g, cx, y, list, o = {}) => {
  const gap = 10 * (o.scale || 1), widths = list.map(([a, l]) => EF.promptWidth(a, l, o)), total = widths.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
  let x = Math.round(cx - total / 2);
  list.forEach(([a, l, oo], i) => { EF.prompt(g, x, y, a, l, oo ? Object.assign({}, o, oo) : o); x += widths[i] + gap; });
  return total;
};


/* ===== 03-audio.js ===== */
/* 03-audio: every sound is code. SFX on the engine's chip synth; songs in its song format (original compositions); the
 * crowd engine (a noise bed through band-pass filters that follows the crowd's mood, OOOHs, roars, boos, whistles,
 * claps); sung chants (a choir of formant voices); and Animalese-style babble voices for every speaker. Silent headless. */
const SFX = {
  touch: { wave: 'noise', freq: 700, to: 300, dur: .04, vol: .14, filter: 'lowpass' },
  pass: { wave: 'noise', freq: 900, to: 250, dur: .06, vol: .24, filter: 'lowpass' },
  kick: { wave: 'noise', freq: 1100, to: 180, dur: .09, vol: .34, filter: 'lowpass' },
  thump: { wave: 'sine', freq: 120, to: 60, dur: .09, vol: .3 },
  screamer: [{ wave: 'sine', freq: 90, to: 40, dur: .14, vol: .45 }, { wave: 'noise', freq: 400, to: 3000, dur: .35, vol: .2, filter: 'highpass' }],
  superCharge: { wave: 'saw', freq: 'C4', arp: [0, 4, 7, 12, 16, 19, 24], step: .05, dur: .5, vol: .14 },
  superBoom: [{ wave: 'sine', freq: 80, to: 30, dur: .5, vol: .5 }, { wave: 'noise', freq: 2000, to: 200, dur: .6, vol: .3, filter: 'lowpass' }],
  splash: { wave: 'noise', freq: 2500, to: 800, dur: .2, vol: .18, filter: 'highpass' },
  crunch: { wave: 'noise', freq: 1200, to: 400, dur: .1, vol: .16, filter: 'bandpass' },
  doink: [{ wave: 'triangle', freq: 1400, to: 1100, dur: .35, vol: .3 }, { wave: 'sine', freq: 2800, to: 2700, dur: .5, vol: .08 }],
  net: { wave: 'noise', freq: 4000, to: 1500, dur: .3, vol: .16, filter: 'highpass' },
  catch: { wave: 'noise', freq: 600, to: 200, dur: .06, vol: .3, filter: 'lowpass' },
  parry: { wave: 'noise', freq: 1500, to: 400, dur: .08, vol: .3, filter: 'bandpass' },
  whistle: { wave: 'square', freq: 2300, vib: [30, .05], dur: .25, vol: .1 },
  whistleLong: { wave: 'square', freq: 2300, vib: [30, .05], dur: .7, vol: .1 },
  card: { wave: 'noise', freq: 3000, to: 1000, dur: .05, vol: .2, filter: 'highpass' },
  slide: { wave: 'noise', freq: 500, to: 150, dur: .3, vol: .2, filter: 'lowpass' },
  knock: { wave: 'sine', freq: 100, to: 40, dur: .15, vol: .4 },
  swish: { wave: 'noise', freq: 1500, to: 4000, dur: .12, vol: .12, filter: 'highpass' },
  nutmeg: { wave: 'triangle', freq: 'E6', arp: [0, 7], step: .06, dur: .14, vol: .14 },
  segment: { wave: 'triangle', freq: 'G5', arp: [0, 4, 7], step: .04, dur: .14, vol: .14 },
  europhoria: [{ wave: 'saw', freq: 'C4', dur: .6, vol: .14 }, { wave: 'saw', freq: 'E4', dur: .6, vol: .12 }, { wave: 'saw', freq: 'G4', dur: .6, vol: .12 }, { wave: 'square', freq: 'C5', dur: .6, vol: .08 }],
  tick: { wave: 'square', freq: 1800, dur: .02, vol: .08 },
  perfect: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12], step: .05, dur: .3, vol: .2 },
  miss: { wave: 'saw', freq: 200, to: 90, dur: .4, vol: .2 },
  varBeep: { wave: 'sine', freq: 1000, dur: .08, vol: .14 },
  chime: [{ wave: 'sine', freq: 'E5', dur: .4, vol: .18 }, { wave: 'sine', freq: 'C5', dur: .6, vol: .16 }],
  gull: { wave: 'sine', freq: 1600, to: 900, dur: .25, vol: .14, vib: [14, .08] },
  boing: { wave: 'sine', freq: 200, to: 600, dur: .2, vol: .2, vib: [20, .1] },
  powerDown: { wave: 'saw', freq: 300, to: 40, dur: 1, vol: .14 },
  horn: [{ wave: 'saw', freq: 'F3', dur: .6, vol: .14 }, { wave: 'saw', freq: 'A3', dur: .6, vol: .1 }],
  shimmer: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12, 16], step: .04, dur: .4, vol: .12 },
  heartbeat: { wave: 'sine', freq: 60, to: 40, dur: .12, vol: .4 },
  menuMove: { wave: 'square', freq: 'A5', dur: .03, vol: .06 },
  menuPick: { wave: 'square', freq: 'C6', arp: [0, 7], step: .04, dur: .1, vol: .1 },
  menuBack: { wave: 'square', freq: 'E5', to: 'A4', dur: .08, vol: .08 },
  typewriter: { wave: 'noise', freq: 3000, dur: .02, vol: .1, filter: 'highpass' },
  smash: [{ wave: 'noise', freq: 3000, to: 600, dur: .5, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 70, to: 30, dur: .4, vol: .4 }]
};
for (const [k, v] of Object.entries(SFX)) A.define(k, v);
EF.sfx = (name, o) => { try { A.sfx(name, o); } catch (e) { /* sound must never break play */ } };

/* ---- songs (original). The anthem is the game's theme; the rest are built on its chords ---- */
const ANTHEM_LEAD = 'G4 - C5 - E5 - G5 - | F5 - E5 D5 E5 - C5 - | A4 - D5 - F5 - A5 - | G5 - - - - - . . | E5 - G5 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .';
const ANTHEM_BASS = 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . E3 . C3 . | F2 . A2 . G2 . B2 . | A2 . F2 . G2 . G2 . | C3 . G2 . C3 . . .';
EF.SONGS = {
  anthem: { bpm: 108, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: ANTHEM_LEAD },
    { name: 'counter', wave: 'square', vol: .05, notes: 'E4 - E4 - G4 - C5 - | C5 - C5 B4 C5 - A4 - | F4 - F4 - A4 - D5 - | D5 - - - B4 - . . | C5 - E5 - G5 - G5 F5 | E5 - C5 - D5 - B4 - | A4 - C5 B4 A4 - G4 - | E4 - - - - - . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: ANTHEM_BASS },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h h' }] },
  menu: { bpm: 128, steps: 4, tracks: [
    { wave: 'pulse', vol: .08, notes: 'C5 . E5 G5 . E5 C5 . | F5 . A5 C6 . A5 F5 . | D5 . F5 A5 . F5 D5 . | G5 . B5 D6 . B5 G5 . ' },
    { wave: 'triangle', vol: .28, notes: 'C3 . C3 . G2 . G2 . | F2 . F2 . C3 . C3 . | D3 . D3 . A2 . A2 . | G2 . G2 . B2 . D3 . ' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h k | k . h . s . h h' }] },
  travel: { bpm: 116, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'G5 - - A5 B5 - G5 - | E5 - - - D5 - - - | C5 - - D5 E5 - G5 - | A5 - - - - - . . | G5 - - A5 B5 - D6 - | C6 - B5 - A5 - G5 - | E5 - G5 - A5 - F#5 - | G5 - - - - - . .' },
    { wave: 'triangle', vol: .26, notes: 'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | A2 . E3 . A2 . E3 . | D3 . A2 . D3 . F#2 .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . | k h h . s . h .' }] },
  tabloid: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'C5 . C5 . Eb5 . . C5 | . . G4 . Bb4 . C5 . | C5 . C5 . Eb5 . F5 . | G5 . . . . . . . ' },
    { wave: 'triangle', vol: .26, notes: 'C3 . . C3 . . C3 . | Ab2 . . Ab2 . . Bb2 . ' },
    { wave: 'drums', vol: .08, notes: 't t t t t t t t | t t t t s . s .' }] },
  dressing: { bpm: 84, steps: 2, tracks: [
    { wave: 'triangle', vol: .14, notes: 'E4 - G4 - | A4 - - - | G4 - E4 - | D4 - - - | C4 - E4 - | F4 - - - | E4 - D4 - | C4 - - - ' },
    { wave: 'sine', vol: .2, notes: 'C3 - - - | F2 - - - | C3 - - - | G2 - - - | A2 - - - | F2 - - - | G2 - - - | C3 - - - ' }] },
  europhoria: { bpm: 140, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . h k s . h . | k k h . s . h k' },
    { name: 'bass', wave: 'saw', vol: .1, on: false, notes: 'C2 C2 C3 C2 G2 G2 G3 G2 | C2 C2 C3 C2 Bb2 Bb2 Bb3 Bb2' },
    { name: 'brass', wave: 'saw', vol: .07, on: false, notes: '. . C5 . . . E5 . | . . G5 . . . E5 . | . . C5 . . . E5 . | . . Bb5 . G5 . E5 .' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'E5 . G5 . A5 . C6 . | B5 . G5 . E5 . . . | D5 . F5 . A5 . B5 . | C6 - - . . . . . ' },
    { wave: 'triangle', vol: .24, notes: 'C3 . E3 . G3 . E3 . | C3 . E3 . G3 . E3 . | D3 . F3 . A3 . F3 . | C3 . G2 . C3 . . . ' },
    { wave: 'drums', vol: .06, notes: 'k . c . s . c . ' }] },
  goal: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'C5 . E5 . G5 . C6 - | - - G5 . C6 - - - ' },
    { wave: 'saw', vol: .06, notes: 'E4 . G4 . C5 . E5 - | - - E5 . G5 - - - ' },
    { wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . C3 - | G2 . G2 . C3 - - - ' }] },
  tension: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .1, notes: 'A3 - - - - - - - - - - - - - - - ' }, { wave: 'triangle', vol: .08, notes: 'C4 - - - - - - - - - - - - - - - ' }, { wave: 'triangle', vol: .08, notes: 'E4 - - - - - - - - - - - - - - - ' },
    { wave: 'drums', vol: .16, notes: 'k k . . ' }] },
  victory: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'G4 . C5 . E5 . G5 - | - . E5 . G5 - - - | A5 . G5 . F5 . E5 . | D5 . E5 . C5 - - - ' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | C3 . G2 . C3 . . . | F2 . C3 . F2 . C3 . | G2 . G2 . C3 - - - ' },
    { wave: 'drums', vol: .1, notes: 'k . s . k . s . | k . s . k k s s' }] },
  defeat: { bpm: 70, steps: 2, tracks: [
    { wave: 'saw', vol: .1, notes: 'Bb3 - A3 - Ab3 - G3 - - - - - . . . .' },
    { wave: 'triangle', vol: .2, notes: 'G2 - - - - - - - C2 - - - - - . .' }] },
  villain: { bpm: 96, steps: 2, tracks: [
    { wave: 'pulse', vol: .09, notes: 'A4 - C5 B4 - A4 | E4 - - - - - | F4 - A4 G#4 - F4 | E4 - - - - - | D4 - F4 E4 - D4 | C4 - E4 A4 - - | B4 - G#4 E4 - - | A4 - - - - - ' },
    { wave: 'triangle', vol: .22, notes: 'A2 . E3 . E3 . | A2 . E3 . E3 . | D2 . A2 . A2 . | E2 . B2 . B2 . ' }] },
  ceremony: { bpm: 132, steps: 2, tracks: [
    { wave: 'pulse', vol: .13, notes: ANTHEM_LEAD }, { wave: 'saw', vol: .05, notes: 'E4 - E4 - G4 - C5 - | C5 - C5 B4 C5 - A4 - | F4 - F4 - A4 - D5 - | D5 - - - B4 - . . | C5 - E5 - G5 - G5 F5 | E5 - C5 - D5 - B4 - | A4 - C5 B4 A4 - G4 - | E4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: ANTHEM_BASS }, { wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k s s s' }] },
  credits: { bpm: 96, steps: 2, tracks: [
    { wave: 'triangle', vol: .14, notes: ANTHEM_LEAD.replace(/([A-G]#?b?)(\d)/g, (s, n, o) => n + (+o + 1)) },
    { wave: 'sine', vol: .14, notes: ANTHEM_BASS.replace(/([A-G]#?b?)(\d)/g, (s, n, o) => n + (+o + 1)) }] },
  training: { bpm: 100, steps: 4, tracks: [
    { wave: 'pulse12', vol: .07, notes: 'E5 . . G5 . . A5 . | . . G5 . E5 . D5 . | C5 . . E5 . . G5 . | . . A5 . G5 . . . ' },
    { wave: 'triangle', vol: .24, notes: 'C3 . . C3 . . G2 . | A2 . . A2 . . E2 . | F2 . . F2 . . C3 . | G2 . . G2 . . G2 . ' },
    { wave: 'drums', vol: .07, notes: 'k . c . s . c . | k . c k s . c . ' }] },
  attract: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: ANTHEM_LEAD.replace(/ - /g, ' . ') },
    { wave: 'saw', vol: .08, notes: 'C2 C3 C2 C3 G1 G2 G1 G2 | F1 F2 F1 F2 C2 C3 C2 C3 | D2 D3 D2 D3 A1 A2 A1 A2 | G1 G2 G1 G2 B1 B2 D2 D3' },
    { wave: 'drums', vol: .12, notes: 'k . h k s . h . | k k h . s . h k' }] }
};
EF.music = (id, o = {}) => { try { const s = id && EF.SONGS[id]; A.music(s || null, Object.assign({ fade: .6 }, o)); EF.musicNow = id; } catch (e) { /* no sound */ } };

/* ---- WebAudio helpers on the engine's own context: buses for the crowd and the voices ---- */
const AU = {
  ctx() { try { return A._init ? A._init() : A.ctx; } catch (e) { return null; } },
  bus(name) {
    const c = this.ctx(); if (!c || !A._master) return null;
    this._b = this._b || {};
    if (!this._b[name]) { const g = c.createGain(); g.gain.value = game.settings[name] != null ? game.settings[name] : .8; g.connect(A._master); this._b[name] = g; }
    return this._b[name];
  },
  noise() { return A._noise || null; }
};
EF.AU = AU;
/* ---- the crowd engine ---- */
EF.crowdAudio = {
  on: false, level: 0, ex: 0, nodes: null,
  volume(v) { const b = AU.bus('crowd'); if (b) b.gain.value = v; },
  start(size = .7) {
    this.size = size; const c = AU.ctx(), bus = AU.bus('crowd'); if (!c || !bus || this.nodes) { this.on = true; return; }
    try {
      const mk = (f, q, v) => { const s = c.createBufferSource(); s.buffer = AU.noise(); s.loop = true; s.playbackRate.value = .5 + EF.fx() * .1; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(bp); bp.connect(g); g.connect(bus); s.start(); return { s, bp, g, v }; };
      this.nodes = [mk(300, .7, .5), mk(900, 1, .35), mk(2500, 1.2, .18)]; this.on = true;
    } catch (e) { this.nodes = null; }
  },
  stop() { if (this.nodes) for (const n of this.nodes) { try { n.s.stop(); } catch (e) { /* stopped */ } } this.nodes = null; this.on = false; },
  update(dt, mood) {
    const k = mood > this.ex ? 1 - Math.exp(-dt / .3) : 1 - Math.exp(-dt / 1.5); this.ex += (mood - this.ex) * k;
    if (!this.nodes) return;
    const c = AU.ctx(); if (!c) return;
    const lv = (this.size || .7) * (.25 + .75 * clamp(this.ex, 0, 1.4));
    for (const n of this.nodes) n.g.gain.setTargetAtTime(lv * n.v * .5, c.currentTime, .1);
  },
  /** a formant swept "OOOH" (near misses, the woodwork), a roar, boos, whistles, claps */
  react(kind, amt = 1) {
    const c = AU.ctx(), bus = AU.bus('crowd'); if (!c || !bus || !AU.noise()) return;
    try {
      const t = c.currentTime, s = c.createBufferSource(); s.buffer = AU.noise(); s.loop = true;
      const g = c.createGain(); g.gain.value = 0; s.connect(g);
      const out = c.createGain(); out.gain.value = 1; out.connect(bus);
      const fmt = (f0, f1, q, dur) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = q; b.frequency.setValueAtTime(f0, t); b.frequency.linearRampToValueAtTime(f1, t + dur); g.connect(b); b.connect(out); return b; };
      let dur = 1;
      if (kind === 'ooh') { dur = 1.1; fmt(400, 620, 6, .8); fmt(800, 1000, 7, .8); g.gain.linearRampToValueAtTime(.9 * amt, t + .15); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'roar') { dur = 3.2; fmt(500, 700, 1.2, 1); fmt(1500, 1800, 1.5, 1); g.gain.linearRampToValueAtTime(1.4 * amt, t + .2); g.gain.linearRampToValueAtTime(.6 * amt, t + 1.8); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'boo') { dur = 1.8; fmt(350, 250, 8, 1.6); fmt(700, 550, 8, 1.6); g.gain.linearRampToValueAtTime(.9 * amt, t + .3); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'groan') { dur = 1.4; fmt(500, 300, 5, 1.2); g.gain.linearRampToValueAtTime(.6 * amt, t + .1); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'clap') { dur = .08; fmt(1200, 1200, 1, .05); g.gain.setValueAtTime(.9 * amt, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); }
      else if (kind === 'hum') { dur = 2.4; fmt(300, 320, 10, 2); g.gain.linearRampToValueAtTime(.5 * amt, t + .5); g.gain.linearRampToValueAtTime(0, t + dur); }
      s.start(t); s.stop(t + dur + .05);
      if (kind === 'whistle') for (let i = 0; i < 4; i++) { const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; const tt = t + i * .12 + EF.fx() * .1; o.frequency.setValueAtTime(2200 + EF.fx() * 900, tt); o.frequency.linearRampToValueAtTime(2800 + EF.fx() * 600, tt + .15); og.gain.setValueAtTime(0, tt); og.gain.linearRampToValueAtTime(.05, tt + .02); og.gain.linearRampToValueAtTime(0, tt + .2); o.connect(og); og.connect(bus); o.start(tt); o.stop(tt + .25); }
    } catch (e) { /* no sound */ }
  }
};
/* ---- sung chants: a choir of formant voices on a melody ---- */
const VOWEL = { a: [800, 1200], e: [500, 1800], i: [300, 2300], o: [500, 900], u: [350, 700] };
const noteHz = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return 220; const k = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 4) * 12; return 440 * Math.pow(2, k / 12); };
EF.noteHz = noteHz;
EF.chant = {
  sing(id, o = {}) {
    const ch = EF.get('chant', id); if (!ch) return;
    const c = AU.ctx(), bus = AU.bus('crowd'); if (!c || !bus) return;
    try {
      let t = c.currentTime + .05; const beat = 60 / (ch.bpm || 120), voices = o.voices || 7, det = ch.detune || 0;
      const reps = o.reps || 1;
      for (let r = 0; r < reps; r++) for (const [syl, note, len, vow] of ch.notes) {
        const dur = (len || 1) * beat;
        if (syl === 'clap') { for (let v = 0; v < 3; v++) setTimeout(() => EF.crowdAudio.react('clap', .6), Math.max(0, (t - c.currentTime + v * .01) * 1000)); t += dur; continue; }
        if (syl !== '.') for (let v = 0; v < voices; v++) {
          const f = noteHz(note) * Math.pow(2, ((EF.fx() - .5) * 24 + det) / 1200) * (v % 3 === 0 ? .5 : 1), osc = c.createOscillator(); osc.type = v % 2 ? 'sawtooth' : 'square'; osc.frequency.value = f;
          const [f1, f2] = VOWEL[vow || 'a'] || VOWEL.a, g = c.createGain(), b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter();
          b1.type = b2.type = 'bandpass'; b1.frequency.value = f1; b2.frequency.value = f2; b1.Q.value = 5; b2.Q.value = 7;
          const tt = t + EF.fx() * .03; g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.05 / voices * 4, tt + .03); g.gain.setValueAtTime(.05 / voices * 4, tt + dur * .7); g.gain.linearRampToValueAtTime(0, tt + dur * .95);
          osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(bus); osc.start(tt); osc.stop(tt + dur);
        }
        t += dur;
      }
    } catch (e) { /* no sound */ }
  }
};
/* ---- babble voices: each revealed letter a 50-70 ms formant syllable ---- */
const LETTER_PITCH = {}; 'abcdefghijklmnopqrstuvwxyz'.split('').forEach((ch, i) => { LETTER_PITCH[ch] = 1 + (((i * 7) % 13) - 6) / 40; });
const VOWEL_OF = ch => 'aeiou'.includes(ch) ? ch : { y: 'i', w: 'u', h: 'a', r: 'e', l: 'e', m: 'u', n: 'e' }[ch] || 'a';
EF.babble = {
  vol: .8, last: 0,
  volume(v) { this.vol = v; const b = AU.bus('voices'); if (b) b.gain.value = v; },
  speakers: {},
  profile(id) { return this.speakers[id] || { f0: 150, wave: 'saw', rate: 1, formant: 1, breath: 0, vib: 0, echo: 0 }; },
  /** a voice function for E.Dialog (called once per revealed letter) */
  voiceFor(id) {
    const p = this.profile(id); let n = 0;
    return (ch, i, txt) => {
      n++; if (ch === ' ' || n % (p.rate > 1 ? 1 : 2)) return;
      const lc = ch.toLowerCase(); if (!/[a-z!?]/.test(lc)) return;
      const rest = txt.slice(i), q = rest.indexOf('?'), dot = rest.search(/[.!]/), up = q >= 0 && (dot < 0 || q < dot);
      const contour = 1 + (up ? .12 : -.04) * Math.max(0, 1 - (Math.min(q < 0 ? 99 : q, 30)) / 30) + (ch === ch.toUpperCase() && /[A-Z]/.test(ch) ? .02 : 0);
      this.syl(lc, p, contour, txt.includes('!') ? 1.25 : 1);
    };
  },
  syl(ch, p, contour = 1, loud = 1) {
    const c = AU.ctx(), bus = AU.bus('voices'); if (!c || !bus) return;
    try {
      const t = c.currentTime + .01, dur = .055 + EF.fx() * .015, f = p.f0 * (LETTER_PITCH[ch] || 1) * contour;
      const o = c.createOscillator(); o.type = p.wave === 'pulse' ? 'square' : 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (contour > 1 ? 1.06 : .96), t + dur);
      if (p.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = f * p.vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
      const [f1, f2] = VOWEL[VOWEL_OF(ch)], b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), g = c.createGain();
      b1.type = b2.type = 'bandpass'; b1.frequency.value = f1 * (p.formant || 1); b2.frequency.value = f2 * (p.formant || 1); b1.Q.value = 4; b2.Q.value = 6;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22 * loud, t + .005); g.gain.setValueAtTime(.22 * loud, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g);
      let out = g;
      if (p.echo) { const d = c.createDelay(.5), fb = c.createGain(); d.delayTime.value = .18; fb.gain.value = .35; g.connect(d); d.connect(fb); fb.connect(d); d.connect(bus); }
      out.connect(bus); o.start(t); o.stop(t + dur + .02);
      if (/[szfx]/.test(ch) || /[tkpbd]/.test(ch)) {
        const s = c.createBufferSource(); s.buffer = AU.noise(); const hp = c.createBiquadFilter(), ng = c.createGain(); hp.type = /[szfx]/.test(ch) ? 'highpass' : 'bandpass'; hp.frequency.value = /[szfx]/.test(ch) ? 4000 : 2000;
        ng.gain.setValueAtTime(.12, t); ng.gain.linearRampToValueAtTime(0, t + (/[szfx]/.test(ch) ? .014 : .005)); s.connect(hp); hp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + .03);
      }
      if (p.breath) { const s = c.createBufferSource(); s.buffer = AU.noise(); const bp = c.createBiquadFilter(), ng = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f1; ng.gain.setValueAtTime(p.breath * .2, t); ng.gain.linearRampToValueAtTime(0, t + dur); s.connect(bp); bp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + dur); }
    } catch (e) { /* no sound */ }
  },
  /** a short shout ("WAHEY!") as babble */
  shout(id, text) { const p = this.profile(id), fn = this.voiceFor(id); for (let i = 0; i < text.length; i++) setTimeout(() => fn(text[i], i, text), i * 45); }
};


/* ===== 04-art.js ===== */
/* 04-art: everything drawn by code that is not a rig: crests (shields, roundels, charges), the balls, cards and the
 * whistle, the kipper, fans, the skylines behind the stands, tifos, the team bus, the trophy, the minibus, the trawler. */
const T_ = E.tones;
/* ---- crests: a shape, a field, a ring and charges, at any size ---- */
const CHARGES = {
  kipper: (g, cx, cy, s, c) => { px.ell(g, cx, cy, s * .32, s * .12, c); px.poly(g, [[cx + s * .28, cy], [cx + s * .45, cy - s * .14], [cx + s * .45, cy + s * .14]], c); px.dot(g, Math.round(cx - s * .2), Math.round(cy - s * .03), '#141414'); },
  anchor: (g, cx, cy, s, c) => { px.line(g, cx, cy - s * .3, cx, cy + s * .3, c, Math.max(1, s * .07)); px.line(g, cx - s * .2, cy - s * .18, cx + s * .2, cy - s * .18, c, Math.max(1, s * .06)); px.line(g, cx - s * .25, cy + s * .15, cx, cy + s * .32, c, Math.max(1, s * .06)); px.line(g, cx + s * .25, cy + s * .15, cx, cy + s * .32, c, Math.max(1, s * .06)); },
  boot: (g, cx, cy, s, c) => { px.rect(g, Math.round(cx - s * .12), Math.round(cy - s * .3), Math.round(s * .22), Math.round(s * .45), c); px.rect(g, Math.round(cx - s * .12), Math.round(cy + s * .08), Math.round(s * .42), Math.round(s * .17), c); for (let i = 0; i < 3; i++) px.dot(g, Math.round(cx - s * .08 + i * s * .14), Math.round(cy + s * .28), c); },
  sun: (g, cx, cy, s, c) => { px.disc(g, Math.round(cx), Math.round(cy - s * .08), Math.max(1, Math.round(s * .16)), c); for (let i = 0; i < 8; i++) { const a = i * PI / 4; px.line(g, cx + Math.cos(a) * s * .22, cy - s * .08 + Math.sin(a) * s * .22, cx + Math.cos(a) * s * .32, cy - s * .08 + Math.sin(a) * s * .32, c); } },
  arrows: (g, cx, cy, s, c) => { for (const d of [-1, 1]) { const y = cy + s * .24 + d * s * .05; px.line(g, cx - s * .3, y, cx + s * .3, y, c); px.line(g, cx + d * s * .3, y, cx + d * s * .2, y - s * .06, c); } },
  cog: (g, cx, cy, s, c) => { px.disc(g, Math.round(cx), Math.round(cy), Math.max(1, Math.round(s * .26)), c); for (let i = 0; i < 8; i++) { const a = i * PI / 4; px.rect(g, Math.round(cx + Math.cos(a) * s * .3 - s * .05), Math.round(cy + Math.sin(a) * s * .3 - s * .05), Math.max(1, Math.round(s * .1)), Math.max(1, Math.round(s * .1)), c); } px.disc(g, Math.round(cx), Math.round(cy), Math.max(1, Math.round(s * .1)), '#141414'); },
  hammer: (g, cx, cy, s, c) => { px.line(g, cx - s * .2, cy + s * .25, cx + s * .15, cy - s * .15, '#8a5a2a', Math.max(1, s * .06)); px.rect(g, Math.round(cx + s * .05), Math.round(cy - s * .3), Math.round(s * .25), Math.round(s * .14), c); },
  padlock: (g, cx, cy, s, c) => { px.rect(g, Math.round(cx - s * .2), Math.round(cy - s * .05), Math.round(s * .4), Math.round(s * .32), c); px.line(g, cx - s * .12, cy - s * .05, cx - s * .12, cy - s * .22, c, Math.max(1, s * .06)); px.line(g, cx + s * .12, cy - s * .05, cx + s * .12, cy - s * .22, c, Math.max(1, s * .06)); px.line(g, cx - s * .12, cy - s * .22, cx + s * .12, cy - s * .22, c, Math.max(1, s * .06)); px.dot(g, Math.round(cx), Math.round(cy + s * .08), '#141414'); },
  laurel: (g, cx, cy, s, c) => { for (let i = 0; i < 5; i++) for (const d of [-1, 1]) px.dot(g, Math.round(cx + d * s * (.36 - i * .02)), Math.round(cy + s * (-.25 + i * .12)), '#6aa040'); },
  crown: (g, cx, cy, s, c) => { px.poly(g, [[cx - s * .28, cy - s * .02], [cx - s * .28, cy - s * .3], [cx - s * .14, cy - s * .14], [cx, cy - s * .34], [cx + s * .14, cy - s * .14], [cx + s * .28, cy - s * .3], [cx + s * .28, cy - s * .02]], c); },
  coins: (g, cx, cy, s, c) => { for (let i = 0; i < 3; i++) px.ell(g, cx, cy + s * (.08 + i * .08), s * .2, s * .05, i % 2 ? '#c8a030' : c); }
};
EF.CHARGES = CHARGES;
EF.drawCrest = (g, team, cx, cy, size) => {
  const c = team.crest, f = T_(c.field), r = T_(c.ring), s = size;
  cx = Math.round(cx); cy = Math.round(cy);
  if (c.shape === 'shield') {
    const pts = k => [[cx - s * .42 * k, cy - s * .45 * k], [cx + s * .42 * k, cy - s * .45 * k], [cx + s * .42 * k, cy + s * .05 * k], [cx, cy + s * .5 * k], [cx - s * .42 * k, cy + s * .05 * k]];
    px.poly(g, pts(1.1), '#0a0a10'); px.poly(g, pts(1), r.base); px.poly(g, pts(.84), f.base); px.poly(g, pts(.84).slice(0, 3).concat([[cx, cy + s * .1]]), f.lt);
  } else {
    px.disc(g, cx, cy, Math.round(s * .52), '#0a0a10'); px.disc(g, cx, cy, Math.round(s * .48), r.base); px.disc(g, cx, cy, Math.round(s * .38), f.base);
    if (c.shape === 'roundel') px.disc(g, cx, cy, Math.round(s * .2), f.lt);
  }
  const ch = c.charges || [];
  ch.forEach((k, i) => { const fn = CHARGES[k]; if (fn) fn(g, cx + (ch.length > 1 && (k === 'kipper' || k === 'hammer') ? 0 : 0), cy + (ch.length > 1 ? (i ? s * .08 : -s * .06) : 0), s * (ch.length > 1 ? .8 : 1), i ? r.lt : r.hi); });
};
/* ---- balls: 4 frames each ---- */
const ballFrames = (w, k) => ['.ooooo.|owwkwwo|owkkkwo|owwkwwo|okwwwko|owwwwwo|.ooooo.', '.ooooo.|owwwkwo|okwwwwo|owwkwwo|owkkkwo|owwkwwo|.ooooo.', '.ooooo.|okwwwko|owwwwwo|owwkwwo|owkkkwo|owwwwwo|.ooooo.', '.ooooo.|owwkwwo|owwwwko|okwwwwo|owwkwwo|owkkkwo|.ooooo.']
  .map(s => E.sprite(s.split('|'), { w, k, o: '#141418' }));
EF.BALLS = {
  classic: { name: 'CLASSIC', frames: ballFrames('#f4f4f0', '#2a2a30') },
  orange: { name: 'WINTER ORANGE', frames: ballFrames('#ff8a2a', '#8a2a0a') },
  gold: { name: 'THE GOLDEN BALL', frames: ballFrames('#ffd84a', '#a8781a') },
  leather: { name: 'OLD LEATHER', frames: ballFrames('#a8703a', '#5a3418') }
};
EF.KIPPER_SPR = E.sprite(['...oo....', '.oooooo.o', 'ooKooooooo', '.oooooo.o', '...oo....'], { o: '#c8803a', K: '#141414' });
EF.CARD = { yellow: E.sprite(['yyy', 'yyy', 'yyy', 'yyy'], { y: '#ffe020' }, 1), red: E.sprite(['rrr', 'rrr', 'rrr', 'rrr'], { r: '#ff2a2a' }, 1) };
EF.FISH_PROP = E.sprite(['.oo..', 'oooo.o', '.oo..'], { o: '#d0a060' });

/* ---- fans: tiny people in their side's colours: idle, arms up, jumping; a scarf, a flag or a drum ---- */
EF.drawFan = (g, x, y, f, st, t) => {
  // st: 0 idle, 1 arms up, 2 jump, 3 scarf held up, 4 boo (head down), 5 despair (hands on head)
  const bob = st === 2 ? -Math.abs(Math.sin(t * 9 + f.ph)) * 3 : st === 1 ? -Math.abs(Math.sin(t * 6 + f.ph)) : Math.sin(t * 2 + f.ph) * .5;
  const X = Math.round(x), Y = Math.round(y + bob);
  px.rect(g, X - 2, Y - 6, 4, 6, f.shirt); px.rect(g, X - 2, Y - 6, 1, 6, f.shirtSh);
  px.rect(g, X - 1, Y - 9, 3, 3, f.skin); px.rect(g, X - 1, Y - 10, 3, 1, f.hair);
  if (st === 1 || st === 2) { px.rect(g, X - 3, Y - 11, 1, 5, f.shirt); px.rect(g, X + 2, Y - 11, 1, 5, f.shirt); }
  else if (st === 3) { const sw = Math.round(Math.sin(t * 3 + f.ph * .2) * 1.5); px.rect(g, X - 4 + sw, Y - 12, 9, 2, f.scarf); px.rect(g, X - 4 + sw, Y - 12, 2, 2, f.scarf2); px.rect(g, X + 3 + sw, Y - 12, 2, 2, f.scarf2); }
  else if (st === 5) { px.rect(g, X - 3, Y - 10, 1, 3, f.shirt); px.rect(g, X + 2, Y - 10, 1, 3, f.shirt); }
  else if (st === 4) { px.rect(g, X - 1, Y - 8, 3, 1, '#00000060'); }
  if (f.kind === 1 && st !== 3) { px.rect(g, X - 3, Y - 4, 7, 1, f.scarf); }
  if (f.kind === 2) { const w = Math.sin(t * 4 + f.ph) * 2; px.line(g, X + 3, Y - 6, X + 3, Y - 16, '#c8c0a0'); px.rect(g, X + 3, Y - 16, 6 + Math.round(w), 4, f.scarf); px.rect(g, X + 3, Y - 14, 6 + Math.round(w), 2, f.scarf2); }
  if (f.kind === 3) { px.rect(g, X - 2, Y - 3, 5, 3, '#e8e0d0'); if (Math.sin(t * 8 + f.ph) > .6) px.rect(g, X + 3, Y - 7, 1, 1, '#fff'); }
};
/* ---- skylines: silhouettes behind the north stand, by stadium ---- */
EF.drawSkyline = (g, r, st, t, base, W) => {
  const sky = st.look.sky || ['#102040', '#304070', '#6080a0'], dark = E.shade ? E.shade(sky[0], -.2) : '#06060c', mid = sky[1];
  const night = st.time === 'night', sil = night ? '#06060e' : st.time === 'dusk' ? '#2a1a2a' : '#5a7088';
  for (const [kind, u, h, o = {}] of st.skyline || []) {
    const x = Math.round(u * W), y = base;
    if (kind === 'chimney') { px.rect(g, x - 5, y - h, 10, h, sil); px.rect(g, x - 6, y - h, 12, 3, sil); if (o.glow) { px.rect(g, x - 4, y - h + 4, 8, 2, '#ff7a2a'); } if (o.smoke) for (let i = 0; i < 6; i++) { const k = ((t * .15 + i / 6) % 1); px.disc(g, Math.round(x + k * 30 + Math.sin(t + i) * 3), Math.round(y - h - 4 - k * 50), Math.round(3 + k * 7), night ? '#2a2a34' : '#8a8a90'); } }
    else if (kind === 'lighthouse') { px.poly(g, [[x - 7, y], [x + 7, y], [x + 4, y - h], [x - 4, y - h]], sil); for (let k = 0; k < 3; k++) px.rect(g, x - 6 + k, y - h * (.3 + k * .25), 12 - k * 2, 4, '#c83a3a'); px.rect(g, x - 5, y - h - 8, 10, 8, '#ffe8a0'); if (o.beam) { const a = t * 1.2; const dx = Math.cos(a) * 120, dy = Math.sin(a) * 14; px.blend(g, .35, 'add', () => px.poly(g, [[x, y - h - 4], [x + dx, y - h - 4 + dy - 14], [x + dx, y - h - 4 + dy + 14]], '#fff0a0')); } }
    else if (kind === 'harbour') { for (let i = 0; i < 5; i++) { const bx = x - 80 + i * 40; px.poly(g, [[bx - 12, y - 4], [bx + 12, y - 4], [bx + 8, y], [bx - 8, y]], sil); px.line(g, bx, y - 4, bx, y - 22, sil); } }
    else if (kind === 'palm') { px.line(g, x, y, x + 4, y - h, sil, 3); for (let i = 0; i < 6; i++) { const a = i / 6 * PI - PI; px.line(g, x + 4, y - h, x + 4 + Math.cos(a) * 18, y - h + Math.sin(a) * 6 + 6, sil, 2); } }
    else if (kind === 'dome') { px.rect(g, x - 30, y - h * .5, 60, h * .5, sil); px.ell(g, x, y - h * .5, 30, 26, sil); px.rect(g, x - 2, y - h * .5 - 34, 4, 10, sil); }
    else if (kind === 'hills' || kind === 'mountains') { const m = kind === 'mountains'; px.poly(g, [[x - 140, y], [x - 70, y - h * (m ? 1 : .6)], [x - 20, y - h * (m ? .6 : .4)], [x + 40, y - h * (m ? 1.1 : .7)], [x + 140, y]], m && night ? '#141826' : sil); if (m) px.poly(g, [[x + 25, y - h * .95], [x + 40, y - h * 1.1], [x + 55, y - h * .95]], '#e8ecf4'); }
    else if (kind === 'tower') { px.rect(g, x - 9, y - h, 18, h, sil); px.poly(g, [[x - 11, y - h], [x + 11, y - h], [x, y - h - 18]], sil); px.rect(g, x - 3, y - h + 10, 6, 8, night ? '#ffd890' : '#1a1a1a'); }
    else if (kind === 'walls') { px.rect(g, x - 60, y - h, 120, h, sil); for (let i = 0; i < 12; i++) px.rect(g, x - 60 + i * 10, y - h - 5, 6, 5, sil); }
    else if (kind === 'cypress') { px.ell(g, x, y - h / 2, 5, h / 2, '#1a2a1a'); }
    else if (kind === 'ribs') { for (let i = -2; i <= 2; i++) px.line(g, x + i * 26, y, x + i * 10, y - h, '#c8a040', 2); px.ell(g, x, y - h, 30, 6, '#c8a040'); }
    else if (kind === 'searchlight') { const a = Math.sin(t * .7 + u * 9) * .5 - PI / 2; px.blend(g, .25, 'add', () => px.poly(g, [[x - 3, y], [x + 3, y], [x + Math.cos(a + .08) * 260, y + Math.sin(a + .08) * 260], [x + Math.cos(a - .08) * 260, y + Math.sin(a - .08) * 260]], '#e0e8ff')); }
    else if (kind === 'seawall') { px.rect(g, 0, y - h, W, h, '#6a6a6a'); px.rect(g, 0, y - h, W, 2, '#8a8a8a'); }
  }
  if (st.id === 'euphorium') { for (let i = 0; i < 4; i++) { const a = t * .6 + i * 1.7; px.blend(g, .2, 'add', () => px.line(g, W / 2, base - 10, W / 2 + Math.cos(a) * W, base - 40 + Math.sin(a) * 30, ['#ff3aa0', '#3affd0', '#ffe03a', '#3a8aff'][i], 1)); } }
};
/* ---- tifo: the side's banner over its stand: its crest and slogan ---- */
EF.drawTifo = (g, team, x, y, w, h, u) => {
  const k = team.kits.home, f = T_(k.shirt), c2 = T_(k.color2 || '#ffffff');
  const hh = Math.round(h * u);
  px.rect(g, Math.round(x), Math.round(y), Math.round(w), hh, f.base);
  for (let i = 0; i < w; i += 16) px.rect(g, Math.round(x + i), Math.round(y), 8, hh, f.lt);
  px.rect(g, Math.round(x), Math.round(y), Math.round(w), 2, c2.base); if (hh > 2) px.rect(g, Math.round(x), Math.round(y + hh - 2), Math.round(w), 2, c2.base);
  if (u > .6) { EF.drawCrest(g, team, x + w * .18, y + h * .5, h * .7); E.font.title(g, team.tifo || team.short, Math.round(x + w * .58), Math.round(y + h * .5 - 10), { align: 'center', scale: 2, colors: [c2.hi, c2.base], depth: 1 }); }
};
/* ---- vehicles and the trophy, drawn at a screen point ---- */
EF.drawBus = (g, x, y, s, livery = '#7a1a2a', broken = false) => {
  const w = 60 * s, h = 26 * s; x = Math.round(x - w / 2); y = Math.round(y - h);
  px.rect(g, x, y, w, h, livery); px.rect(g, x, y + h - 6 * s, w, 6 * s, '#2a2a2a');
  for (let i = 0; i < 6; i++) px.rect(g, x + 4 * s + i * 9 * s, y + 4 * s, 7 * s, 8 * s, broken && i % 2 ? '#3a3a3a' : '#a8d0f0');
  px.rect(g, x, y + 14 * s, w, 2 * s, '#c8ccd4');
  for (const wx of [x + 10 * s, x + w - 10 * s]) { px.disc(g, Math.round(wx), Math.round(y + h), Math.round(5 * s), '#141414'); px.disc(g, Math.round(wx), Math.round(y + h), Math.round(2 * s), '#8a8a8a'); }
  E.font.text(g, 'AC LUCCHETTO', Math.round(x + w / 2), Math.round(y + 17 * s), '#fff', { font: 'tiny', align: 'center', outline: false });
};
EF.drawMinibus = (g, x, y, s, t) => {
  const w = 30 * s, h = 14 * s, b = Math.round(Math.sin(t * 12) * s * .6); x = Math.round(x - w / 2); y = Math.round(y - h + b);
  px.rect(g, x, y, w, h, '#e0e0d0'); px.rect(g, x, y + h * .55, w, h * .2, '#f08a24'); px.rect(g, x + w - 7 * s, y + 2 * s, 6 * s, 5 * s, '#a8d0f0'); for (let i = 0; i < 2; i++) px.rect(g, x + 3 * s + i * 7 * s, y + 2 * s, 5 * s, 4 * s, '#a8d0f0');
  for (const wx of [x + 6 * s, x + w - 6 * s]) px.disc(g, Math.round(wx), Math.round(y + h - b), Math.round(3 * s), '#141414');
};
EF.drawTrophy = (g, x, y, s, shine = 0) => {
  const m = T_('#d8dce8'), gold = T_('#e8c040');
  x = Math.round(x); y = Math.round(y);
  px.rect(g, x - 9 * s, y - 6 * s, 18 * s, 6 * s, '#3a2a1a'); px.rect(g, x - 7 * s, y - 9 * s, 14 * s, 3 * s, gold.base);
  px.rect(g, x - 2 * s, y - 18 * s, 4 * s, 9 * s, m.base);
  px.ell(g, x, y - 24 * s, 9 * s, 8 * s, m.sh); px.ell(g, x - 1 * s, y - 25 * s, 7 * s, 7 * s, m.base); px.rect(g, x - 9 * s, y - 32 * s, 18 * s, 4 * s, m.lt);
  for (const d of [-1, 1]) { px.ell(g, x + d * 11 * s, y - 25 * s, 4 * s, 6 * s, m.sh); px.ell(g, x + d * 11 * s, y - 25 * s, 2 * s, 4 * s, '#00000000'); }
  px.rect(g, x - 3 * s, y - 29 * s, 2 * s, 8 * s, m.hi);
  if (shine > 0) px.blend(g, shine, 'add', () => px.disc(g, x - 3 * s, y - 27 * s, 3 * s, '#ffffff'));
};
EF.drawTrawler = (g, x, y, s, t) => {
  const w = 120 * s; x = Math.round(x - w / 2); y = Math.round(y);
  px.poly(g, [[x, y - 30 * s], [x + w, y - 30 * s], [x + w - 12 * s, y - 6 * s], [x + 12 * s, y - 6 * s]], '#2a4a7a'); px.rect(g, x, y - 32 * s, w, 3 * s, '#f08a24');
  px.rect(g, x + w * .6, y - 52 * s, 26 * s, 22 * s, '#e8e4d8'); for (let i = 0; i < 3; i++) px.rect(g, x + w * .6 + 3 * s + i * 8 * s, y - 48 * s, 5 * s, 5 * s, '#a8d0f0');
  px.line(g, x + w * .3, y - 32 * s, x + w * .3, y - 74 * s, '#5a3a22', 2); px.rect(g, x + w * .3, y - 74 * s, 18 * s, 10 * s, '#f08a24');
  for (const wx of [x + 18 * s, x + 45 * s, x + w - 45 * s, x + w - 18 * s]) { px.disc(g, Math.round(wx), Math.round(y - 4 * s), Math.round(7 * s), '#141414'); px.disc(g, Math.round(wx), Math.round(y - 4 * s), Math.round(3 * s), '#8a8a8a'); }
  E.font.text(g, 'THE OLD TROUT II', Math.round(x + w * .35), Math.round(y - 24 * s), '#fff6e0', { align: 'center', outline: false });
};


/* ===== 10-pitch.js ===== */
/* 10-pitch: the pitch's geometry (world units, 1 tile = 16), the stadium's TileMap (stands, boards, aprons, nets) and
 * its floor texture by stadium (stripes, wear, mud, snow, wet sheen, puddles, lines). */
const TS = 16;
const P = (() => {
  const WS = 3, WB = 1, WA = 3, FW = 52, NS = 4, NA = 1, NB = 1, FH = 32, SB = 1, SA = 2;
  const COLS = WS + WB + WA + FW + WA + WB + WS, ROWS = NS + NA + NB + FH + SB + SA;
  const X0 = (WS + WB + WA) * TS, X1 = X0 + FW * TS, Y0 = (NS + NA + NB) * TS, Y1 = Y0 + FH * TS;
  return { WS, WB, WA, FW, NS, NA, NB, FH, SB, SA, COLS, ROWS, X0, X1, Y0, Y1, CX: (X0 + X1) / 2, CY: (Y0 + Y1) / 2, L: X1 - X0, W: Y1 - Y0,
    GH: 48, BAR: 36, NET: 32, BOX_D: 112, BOX_W: 160, GA_D: 40, GA_W: 88, SPOT: 80, CIRCLE: 64 };
})();
EF.Pitch = P;
// side s attacks toward goalX(s, half): side 0 attacks +x in the first half
P.attackDir = (s, swapped) => (s === 0) !== !!swapped ? 1 : -1;
P.goalLineX = dir => dir > 0 ? P.X1 : P.X0;
P.inBox = (goalDir, x, y) => { const gx = P.goalLineX(goalDir); return Math.abs(y - P.CY) < P.BOX_W && (goalDir > 0 ? x > gx - P.BOX_D && x <= gx + 4 : x < gx + P.BOX_D && x >= gx - 4); };
P.inGoalArea = (goalDir, x, y) => { const gx = P.goalLineX(goalDir); return Math.abs(y - P.CY) < P.GA_W && Math.abs(x - gx) < P.GA_D; };
P.inField = (x, y, m = 0) => x > P.X0 - m && x < P.X1 + m && y > P.Y0 - m && y < P.Y1 + m;
P.clampField = (x, y, m = 6) => [clamp(x, P.X0 + m, P.X1 - m), clamp(y, P.Y0 + m, P.Y1 - m)];
// the uv frame of a side: u from its own goal line (0) to the opponent's (1), v from the north touchline (0) to the south (1)
P.toWorld = (dir, u, v) => [dir > 0 ? P.X0 + u * P.L : P.X1 - u * P.L, P.Y0 + v * P.W];
P.toUV = (dir, x, y) => [dir > 0 ? (x - P.X0) / P.L : (P.X1 - x) / P.L, (y - P.Y0) / P.W];

/* ---- markings ---- */
function isLine(x, y) {
  const { X0, X1, Y0, Y1, CX, CY } = P, w = 1.2;
  if (x > X0 - w && x < X1 + w && (Math.abs(y - Y0) < w || Math.abs(y - Y1) < w)) return true;
  if (y > Y0 - w && y < Y1 + w && (Math.abs(x - X0) < w || Math.abs(x - X1) < w)) return true;
  if (y > Y0 && y < Y1 && Math.abs(x - CX) < w * .9) return true;
  const dc = hyp(x - CX, y - CY);
  if (Math.abs(dc - P.CIRCLE) < w * .9 || dc < 2) return true;
  for (const [gx, d] of [[X0, 1], [X1, -1]]) {
    const ix = (x - gx) * d;   // distance into the pitch from that goal line
    if (ix >= -w && ix <= P.BOX_D + w && Math.abs(y - CY) <= P.BOX_W + w && (Math.abs(ix - P.BOX_D) < w || Math.abs(Math.abs(y - CY) - P.BOX_W) < w)) return true;
    if (ix >= -w && ix <= P.GA_D + w && Math.abs(y - CY) <= P.GA_W + w && (Math.abs(ix - P.GA_D) < w || Math.abs(Math.abs(y - CY) - P.GA_W) < w)) return true;
    if (hyp(ix - P.SPOT, y - CY) < 1.8) return true;
    if (ix > P.BOX_D && Math.abs(hyp(ix - P.SPOT, y - CY) - 72) < w * .9) return true;
    for (const cy of [Y0, Y1]) if (Math.abs(hyp(ix, y - cy) - 8) < w * .8 && ix > 0) return true;
  }
  return false;
}

/* ---- the stadium's map: rows from the layout, floor texture from the stadium's look ---- */
function buildMap(st) {
  const { COLS, ROWS, WS, WB, WA, FW, NS, NA, NB, FH } = P, rows = [];
  const fieldC0 = WS + WB + WA, fieldR0 = NS + NA + NB, goalR0 = Math.floor((P.CY - P.GH) / TS), goalR1 = Math.ceil((P.CY + P.GH) / TS) - 1;
  for (let R = 0; R < ROWS; R++) {
    let s = '';
    for (let c = 0; c < COLS; c++) {
      const inBoardsX = c >= WS && c < COLS - WS, inBoardsY = R >= NS + NA && R < fieldR0 + FH + 1;
      const fieldRow = R >= fieldR0 && R < fieldR0 + FH, fieldCol = c >= fieldC0 && c < fieldC0 + FW;
      const westApron = c >= WS + WB && c < fieldC0, eastApron = c >= fieldC0 + FW && c < fieldC0 + FW + WA;
      if (R < NS) s += c < WS || c >= COLS - WS ? '5' : String(NS - R);   // north stand tiers: the back row (R = 0) highest
      else if (R < NS + NA) s += (c < WS || c >= COLS - WS) ? '4' : 'a';
      else if (!inBoardsY) s += R === fieldR0 + FH + 1 || R === fieldR0 + FH + 2 ? (c < WS || c >= COLS - WS ? '4' : 's') : ',';
      else if (c < WS) s += String(4 + Math.min(2, WS - 1 - c));   // west end stand
      else if (c >= COLS - WS) s += String(4 + Math.min(2, c - (COLS - WS)));
      else if (R === NS + NA || R === fieldR0 + FH) s += 'B';   // touchline boards
      else if (c === WS || c === COLS - WS - 1) s += 'E';   // end boards
      else if (fieldRow && fieldCol) s += '.';
      else if (fieldRow && (westApron || eastApron)) {
        const back = c === WS + WB || c === COLS - WS - WB - 1, inMouth = R >= goalR0 && R <= goalR1, side = R === goalR0 - 1 || R === goalR1 + 1;
        if (inMouth) s += back ? 'N' : ':';
        else if (side) s += 'N';
        else s += 'a';
      } else s += 'a';
    }
    rows.push(s);
  }
  const look = st.look || {}, grass = (look.grass || ['#3f7a34', '#4a8a3c']).map(E.hex), lineC = E.hex(look.lines || '#ece8dc');
  const snow = st.surface === 'snow', wet = st.surface === 'wet', hard = st.surface === 'hard';
  const mud = st.mud || [], puddles = [];
  const prng = E.rng(st.seed || 7);
  for (let i = 0; i < (st.puddles || 0); i++) puddles.push([P.X0 + 80 + prng() * (P.L - 160), P.Y0 + 40 + prng() * (P.W - 80), 10 + prng() * 10]);
  const wear = look.wear || 0;
  const tagAt = (x, y) => {
    for (const [u, v, r] of mud) { const mx = P.X0 + u * P.L, my = P.Y0 + v * P.W; if (hyp(x - mx, (y - my) * .8) < r) return 'mud'; }
    for (const [px_, py_, r] of puddles) if (hyp(x - px_, (y - py_) * 1.4) < r) return 'puddle';
    return null;
  };
  const apronC = E.hex(look.apron || '#3a3d44'), seats = (look.seats || ['#3a3a48', '#4a4a5a']).map(E.hex);
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) - .5;
    if (tag === 'net') { const mesh = (Math.floor(x) % 4 === 0) || (Math.floor(y) % 4 === 0); const g = snow ? 200 : 70; return mesh ? [g * .5, g * .6, g * .5] : [g * .7 + n * 10, g + n * 14, g * .7 + n * 10]; }
    if (tag === 'apron') { const k = 1 + n * .25 + m * .2; return [apronC[0] * k, apronC[1] * k, apronC[2] * k]; }
    if (tag === 'side') { const k = 1 + n * .3; return [apronC[0] * k * .9, apronC[1] * k * .95, apronC[2] * k]; }
    if (tag === 'out') return [24 + n * 10, 24 + n * 10, 30 + n * 10];
    const t2 = tagAt(x, y);
    if (t2 === 'puddle') { const s = 1 + m * .3; return [70 * s, 96 * s, 120 * s + n * 20, .1]; }
    if (snow) {
      if (isLine(x, y)) return [56 + n * 20, 110 + n * 20, 50 + n * 10];   // the lines brushed clear down to the grass
      const lineNear = isLine(x + 2, y) || isLine(x - 2, y) || isLine(x, y + 2) || isLine(x, y - 2);
      if (lineNear) return [150 + n * 20, 170 + n * 16, 150 + n * 20];
      const w = 226 + n * 22 + m * 20; return [w - 6, w, w + 8];
    }
    let [r, g, b] = grass[Math.floor((x - P.X0) / 32) % 2 ? 1 : 0];
    const k = 1 + n * .18 + m * .16; r *= k; g *= k; b *= k;
    // wear: the goalmouths and the centre circle
    if (wear > 0) {
      const wv = Math.max(0, 1 - Math.min(hyp(x - P.X0 - 20, (y - P.CY) * .7), hyp(x - P.X1 + 20, (y - P.CY) * .7)) / 60, 1 - hyp(x - P.CX, y - P.CY) / 70) * wear;
      if (wv > 0) { r = lerp(r, 120 + n * 20, wv * .6); g = lerp(g, 100 + n * 20, wv * .6); b = lerp(b, 60, wv * .6); }
    }
    if (t2 === 'mud') { r = 90 + n * 20 + m * 20; g = 66 + n * 14; b = 40 + n * 10; }
    if (isLine(x, y) && t2 !== 'mud') { const w = 1 + n * .1; return [lineC[0] * w, lineC[1] * w, lineC[2] * w]; }
    if (wet) { const sheen = (Math.floor(x + y * .5) % 7 === 0) ? 1.18 : 1; r *= sheen; g *= sheen; b *= sheen * 1.06; }
    if (hard) { r *= 1.06; g *= 1.02; b *= .92; }
    return [r, g, b];
  };
  const tiers = look.tiers || [34, 44, 54, 64];
  const seatSide = E.shade((look.seats || ['#3a3a48'])[0], -.35), seatTop = E.shade((look.seats || ['#3a3a48'])[0], -.15);
  const tierType = h => ({ h, face: look.standFace || 'plank', side: look.standSide && look.standFace ? look.standSide : seatSide, top: look.standTop && look.standFace ? look.standTop : seatTop, roof: 'plain', line: '#0a0a12' });
  const map = new E.TileMap({ rows, floorTex, outside: false, ao: 4,
    legend: { '.': { floor: 'grass' }, ':': { floor: 'net' }, a: { floor: 'apron' }, s: { floor: 'side' }, ',': { floor: 'out' }, B: 8, E: 9, N: { floor: 'net' },
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
    types: { 1: tierType(tiers[0]), 2: tierType(tiers[1]), 3: tierType(tiers[2]), 4: tierType(tiers[3] || 64), 5: tierType((tiers[3] || 64) + 8), 6: tierType((tiers[3] || 64) + 16), 7: tierType((tiers[3] || 64) + 16),
      8: { h: 26, cut: true, cutH: 6, face: 'plank', side: look.boards || '#1c2a5a', top: '#2a2e3a', line: '#0e1430' },
      9: { h: 18, face: 'plank', side: look.boards || '#1c2a5a', top: '#2a2e3a', line: '#0e1430' },
      10: { h: P.BAR + 4, face: 'none', side: '#c8ccd8', top: '#e8ecf4' } } });
  map.tagAt = tagAt; map.puddles = puddles; map.seats = seats;
  return map;
}
EF.buildMap = buildMap;


/* ===== 11-match.js ===== */
/* 11-match: the Match, pure simulation. It reads Intents (from human, bot, remote and script controllers), moves the
 * ball and the footballers, applies the rules and emits events on EF.bus. It never reads devices, plays sounds or draws.
 * Modes: kickoff/setpiece, play, dead (a stoppage with a restart pending), goal, var, halftime, fulltime, shootout, over. */
const SURF = { grass: [1, .55], wet: [.7, .45], hard: [.8, .6], snow: [1.7, .35], mud: [3, .2], puddle: [4, .15] };
let FID = 0;
class Match {
  constructor(o) {
    this.o = o = Object.assign({ home: 'kipperton', away: 'hoofington', stadium: null, seed: 1, slots: [], draws: 'allowed', buffs: [] }, o);
    this.seed = o.seed >>> 0 || 1; this.rng = E.rng(this.seed);
    this.teams = [EF.get('team', o.home), EF.get('team', o.away)];
    this.st = Object.assign({}, EF.get('stadium', o.stadium || this.teams[0].stadium));
    if (o.weather) this.st.weather = o.weather === 'none' ? null : Object.assign({}, this.st.weather, o.weather);
    if (o.surface) this.st.surface = o.surface;
    if (o.time && o.time !== 'stadium' && o.time !== this.st.time) {
      const SK = { day: ['#4a9ae8', '#8ac8f0', '#f0e8c0'], dusk: ['#2a1a3a', '#6a3a4a', '#d0806a'], night: ['#04040c', '#10142a', '#2a2a40'] };
      this.st.time = o.time; this.st.look = Object.assign({}, this.st.look, { sky: SK[o.time] }); this.st.lights = Object.assign({}, this.st.lights, { ambient: { day: 1, dusk: .62, night: .45 }[o.time], flood: o.time !== 'day', color: (this.st.lights && this.st.lights.color) || '#fff0d0' });
    }
    if (o.fog) this.st.fogAll = true;
    this.surface = this.st.surface || 'grass';
    this.map = o.map || buildMap(this.st);
    this.ref = EF.get('referee', o.referee || this.st.referee || 'haltwhistle');
    this.halfLen = o.halfLength || 120;
    this.t = 0; this.clock = 0; this.half = o.shootoutOnly ? 5 : 1; this.swapped = false; this.score = [0, 0]; this.stopped = 0; this.stoppage = 0; this.boardShown = false;
    this.mode = 'kickoff'; this.modeT = 0; this.owner = null; this.last = null; this.lastTouch = -1; this.kickHold = 0;
    this.euph = [0, 0]; this.euroT = [0, 0]; this.superUsed = [false, false]; this.superFlight = null; this.duel = null;
    this.stats = [0, 1].map(() => ({ shots: 0, onTarget: 0, passes: 0, passDone: 0, tackles: 0, poss: 0, corners: 0, fouls: 0, cards: 0, recover: 0 }));
    this.goals = []; this.events = []; this.evSeq = 0; this.chain = [0, 0]; this.shot = null; this.foul = null; this.deferred = []; this.cards = [];
    this.flags = {}; this.cheats = Object.assign({}, EF.Dev ? EF.Dev.cheats : {}); this.bus = null; this.celebration = null;
    this.buff = { speed: [1, 1], tackle: [1, 1], regen: [1, 1], passAcc: [1, 1], strict: 1, gain: [1, 1] };
    const d = EF.diff(); this.diff = d;
    // the footballers: 5 a side, roles from the formation, keepers first
    this.players = [];
    for (let s = 0; s < 2; s++) {
      const team = this.teams[s], form = EF.get('formation', (o.formation && o.formation[s]) || team.formation), roles = Object.keys(form.roles);
      const order = team.players.slice().sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos]);
      order.forEach((pd, i) => this.players.push(new Footballer(this, s, i, pd, roles[i] || 'FWD', form)));
    }
    this.side = [0, 1].map(s => this.players.filter(f => f.side === s));
    this.keeper = [0, 1].map(s => this.side[s].find(f => f.gk));
    for (const b of o.buffs || []) applyBuff(this, b.side, b.kind);
    if (o.startEuph) for (let s = 0; s < 2; s++) this.euph[s] = clamp(o.startEuph[s] || 0, 0, 100);
    // the ball
    const b = this.ball = new E.Body({ x: P.CX, y: P.CY, r: 3, friction: 0, bounce: EF.T.ballBounce, gravity: EF.T.ballGravity });
    b.spin = 0; b.roll = 0; b.to = null; b.kind = null; b.lastT = 0;
    // humans: each slot holds one footballer of its side at a time
    this.slots = (o.slots || []).map((s, i) => Object.assign({ i, side: 0, f: null, ctl: null, held: 0, menu: false }, s));
    this.brains = [new TeamBrain(this, 0), new TeamBrain(this, 1)];
    this.events = [];
    if (o.shootoutOnly) this.startShootout(); else if (o.training) this.mode = 'play'; else this.kickoff(this.rng() < .5 ? 0 : 1, true);
    this.kickoffSide0 = this.sp ? this.sp.side : 0;
    for (const sl of this.slots) if (!sl.f) this.assignSlot(sl);
  }
  /* ---- frames of reference ---- */
  dir(s) { return P.attackDir(s, this.swapped); }
  goalX(s) { return P.goalLineX(this.dir(s)); }           // the goal side s attacks
  ownGoalX(s) { return P.goalLineX(-this.dir(s)); }
  get minute() {
    if (this.half >= 5) return 120;
    if (this.half === 3) return 90 + Math.min(15, this.clock / 60 * 15);
    return (this.half - 1) * 45 + this.clock / this.halfLen * 45;
  }
  minuteLabel() {
    if (this.half >= 5 || this.mode === 'shootout') return 'PENS';
    const m = this.minute, base = this.half === 1 ? 45 : this.half === 2 ? 90 : 105;
    if (this.half === 3) return 'ET ' + Math.floor(m) + "'";
    return m >= base ? base + '+' + Math.max(1, Math.ceil(m - base)) + "'" : Math.floor(m) + "'";
  }
  get session() { return !!this.o.session; }
  emit(type, d = {}) {
    const ev = Object.assign({ t: this.t, n: ++this.evSeq }, d);
    this.events.push([type, ev]); if (this.events.length > 64) this.events.shift();
    if (!this.o.silent) EF.bus.emit(type, Object.assign(ev, { match: this }));
    return ev;
  }
  gain(s, v, why) {
    if (this.cheats.pure || this.o.pure) return;
    const k = v > 0 ? EF.T.euphoriaGain * (this.buff.gain[s] || 1) * (this.teams[s].crowd && this.teams[s].crowd.factor || 1) * (this.isCpuSide(s) ? this.diff.gain : 1) : 1;
    const before = this.euph[s];
    if (this.euroT[s] > 0) return;
    this.euph[s] = clamp(this.euph[s] + v * k, 0, 100);
    if (Math.floor(before / 33.4) !== Math.floor(this.euph[s] / 33.4) && this.euph[s] > before) this.emit('euphoriaGain', { side: s, v: this.euph[s], why });
    if (before < 100 && this.euph[s] >= 100) this.emit('euphoriaFull', { side: s });
  }
  isCpuSide(s) { return !this.slots.some(sl => sl.side === s && !sl.menu); }
  humanSide(s) { return this.slots.some(sl => sl.side === s); }

  /* ---- slots (humans) ---- */
  assignSlot(sl, f) {
    const free = this.side[sl.side].filter(p => !p.gk && !p.sentOff && !this.slots.some(o => o !== sl && o.f === p));
    if (!f) f = free.sort((a, b) => dist(a.body, this.ball) - dist(b.body, this.ball))[0];
    if (!f || (this.slots.some(o => o !== sl && o.f === f))) return;
    if (sl.f) sl.f.human = null;
    sl.f = f; f.human = sl.i;
  }
  switchSlot(sl, next) {
    const cands = this.side[sl.side].filter(p => !p.gk && !p.sentOff && p !== sl.f && !this.slots.some(o => o !== sl && o.f === p) && p.state !== 'off');
    if (!cands.length) return;
    cands.sort((a, b) => dist(a.body, this.ball) - dist(b.body, this.ball));
    let pick = cands[0];
    if (next && sl.lastSwitchT > this.t - 1 && cands.length > 1) pick = cands[(sl.switchN = (sl.switchN || 0) + 1) % cands.length];
    else sl.switchN = 0;
    sl.lastSwitchT = this.t; this.assignSlot(sl, pick); this.emit('switch', { slot: sl.i, who: pick.id });
  }

  /* ---- the main step ---- */
  update(dt, realDt = dt) {
    this.t += dt; this.modeT += dt; this.realDt = realDt;
    this.cheats = EF.Dev ? EF.Dev.cheats : this.cheats;
    // Europhoria counts down through stoppages
    for (let s = 0; s < 2; s++) if (this.euroT[s] > 0) { this.euroT[s] = Math.max(0, this.euroT[s] - dt); this.euph[s] = 100 * this.euroT[s] / EF.T.europhoriaTime; if (this.euroT[s] === 0) { this.euph[s] = 0; this.emit('europhoriaEnd', { side: s }); } }
    if (this.cheats.fullEuph0 && this.euroT[0] <= 0) this.euph[0] = 100;
    if (this.cheats.fullEuph1 && this.euroT[1] <= 0) this.euph[1] = 100;
    const m = this.mode;
    if (m === 'over') { this.stepBodies(dt, false); return; }
    if (m === 'halftime') { this.stepBodies(dt, false); if (this.modeT > 4.5) this.secondHalf(); return; }
    if (m === 'fulltime') { this.stepBodies(dt, false); if (this.modeT > 3) this.afterFullTime(); return; }
    if (m === 'shootout') { this.shootoutStep(dt); return; }
    if (m === 'goal') { this.stepBodies(dt, false); this.ballLoose(dt, true); this.celebrateStep(dt); return; }
    if (m === 'var') { this.stepBodies(dt, false); this.varStep(dt); this.stopped += dt; return; }
    if (m === 'dead') {
      this.stepBodies(dt, false); this.ballLoose(dt, true); this.stopped += dt;
      if (this.dead && (this.dead.t -= dt) <= 0) { const fn = this.dead.then; this.dead = null; fn(); }
      return;
    }
    if (m === 'setpiece' || m === 'kickoff') { this.setpieceStep(dt); this.runClock(dt); return; }
    // play
    this.kickHold = Math.max(0, this.kickHold - dt);
    this.stepBodies(dt, true);
    if (this.mode !== 'play') return;
    this.superStep(dt);
    if (this.mode !== 'play') return;
    // the invincible keeper cheat: anything heading into his goal is his
    for (let s = 0; s < 2; s++) if (this.cheats['keeper' + s] && !this.owner && !this.superFlight) {
      const k = this.keeper[s], gx = this.ownGoalX(s), b = this.ball;
      if (k && !k.sentOff && (b.x - gx) * (P.CX - gx) > 0 && Math.abs(b.x - gx) < 26 && Math.abs(b.y - P.CY) < P.GH + 8 && b.z < P.BAR + 4 && b.vx * (gx - P.CX) > 0 && !(this.last && this.last === k)) { k.body.x = gx + (gx > P.CX ? -6 : 6); k.body.y = b.y; k.setState('run'); keeperCatch(k, 'cheat'); }
    }
    if (!this.superFlight) this.ballStep(dt);
    if (this.mode !== 'play') return;
    this.foulStep(dt);
    this.eventsStep(dt);
    if (this.owner) this.stats[this.owner.side].poss += dt; else if (this.last) this.stats[this.last.side].poss += dt * .5;
    for (let s = 0; s < 2; s++) if (this.euroT[s] <= 0 && this.euph[s] > 0 && this.euph[s] < 100) this.euph[s] = Math.max(0, this.euph[s] - EF.T.euphoriaDecay * dt);
    this.goldenMoment();
    this.runClock(dt);
  }
  runClock(dt) {
    if (this.o.training || this.cheats.freezeClock || this.o.noClock) return;
    this.clock += dt;
    if (this.half === 3) { if (this.clock >= 60) this.endExtraTime(); return; }
    const m = this.minute, base = this.half * 45;
    if (!this.boardShown && m >= base - 1) {
      this.stoppage = clamp(Math.round(this.stopped / 12), 1, 5); this.boardShown = true;
      this.emit('board', { add: this.stoppage });
    }
    if (this.boardShown && m >= base + this.stoppage) {
      const u = P.toUV(1, this.ball.x, this.ball.y)[0], danger = u < .25 || u > .75;
      if (!danger || m >= base + this.stoppage + 2 || this.mode !== 'play') this.endHalf();
    }
  }
  endHalf() {
    this.owner = null; this.sp = null; this.foul = null;
    if (this.half === 1) { this.mode = 'halftime'; this.modeT = 0; this.emit('whistle', { kind: 'half' }); this.emit('half', {}); }
    else this.fullTime();
  }
  secondHalf() {
    this.half = 2; this.clock = 0; this.stopped = 0; this.boardShown = false; this.swapped = !this.swapped;
    this.kickoff(1 - this.kickoffSide0, true);
  }
  fullTime() {
    this.owner = null; this.sp = null; this.mode = 'fulltime'; this.modeT = 0; this.emit('whistle', { kind: 'full' });
    this.emit('fulltime', { score: this.score.slice() });
  }
  afterFullTime() {
    const draw = this.score[0] === this.score[1], rule = this.o.draws;
    if (draw && this.half < 3 && (rule === 'cup' || rule === 'golden') && !this.session) {
      this.half = 3; this.clock = 0; this.emit('extraTime', {}); this.kickoff(this.rng() < .5 ? 0 : 1, true); return;
    }
    if (draw && (rule === 'cup' || rule === 'pens') && !this.session) { this.startShootout(); return; }
    this.finish();
  }
  endExtraTime() { if (this.o.draws === 'cup' || this.o.draws === 'pens') { this.mode = 'fulltime'; this.modeT = 0; this.emit('whistle', { kind: 'full' }); } else this.fullTime(); }
  finish() {
    this.mode = 'over'; this.modeT = 0;
    const w = this.winner();
    this.emit('over', { winner: w, score: this.score.slice(), pens: this.so ? this.so.score.slice() : null });
  }
  winner() {
    if (this.score[0] !== this.score[1]) return this.score[0] > this.score[1] ? 0 : 1;
    if (this.so && this.so.score[0] !== this.so.score[1]) return this.so.score[0] > this.so.score[1] ? 0 : 1;
    return -1;
  }
  goldenMoment() {
    for (let s = 0; s < 2; s++) {
      const t = this.teams[s], tac = EF.get('tactic', t.tactic);
      if (tac && tac.gimmick === 'galacticos' && !this.flags['golden' + s] && this.half === 2 && this.minute >= 80 && this.score[s] <= this.score[1 - s] && !this.cheats.pure) {
        this.flags['golden' + s] = true; this.euph[s] = 100; this.emit('goldenMoment', { side: s }); this.triggerEurophoria(s);
      }
    }
  }

  /* ---- bodies: every footballer's step (controls on in play) ---- */
  stepBodies(dt, live) {
    const intents = new Map();
    if (live) {
      for (const sl of this.slots) {
        if (!sl.f || sl.f.sentOff) this.assignSlot(sl);
        if (!sl.f || sl.menu) continue;
        const it = sl.ctl ? sl.ctl.intent(this, sl, dt) : null;
        if (it) { intents.set(sl.f, it); this.slotActions(sl, it); }
      }
      this.autoSwitch();
      for (const b of this.brains) b.update(dt, intents);
    }
    for (const f of this.players) {
      const it = live ? (intents.get(f) || f.botIntent || NO_INTENT) : NO_INTENT;
      f.step(dt, it, live);
    }
    this.ref && refStep(this, dt);
  }
  slotActions(sl, it) {
    const f = sl.f;
    if (it.sw && it.sw.pressed && this.owner !== f && !(it.pass && it.pass.down)) this.switchSlot(sl, true);
    else if (it.through && it.through.pressed && this.owner !== f && this.owner && this.owner.side !== sl.side) this.switchSlot(sl, true);
    else if (it.through && it.through.pressed && !this.owner && this.owner !== f) this.switchSlot(sl, true);
    if (it.target && this.owner !== f) { const t = this.players.find(p => p.id === it.target); if (t && t.side === sl.side && !t.gk) this.assignSlot(sl, t); }
    if (it.euphoria && this.euph[sl.side] >= 100 && this.euroT[sl.side] <= 0) this.triggerEurophoria(sl.side);
  }
  autoSwitch() {
    for (const sl of this.slots) {
      if (sl.menu || !sl.f) continue;
      const rule = sl.switching || game.settings.switching || 'assisted';
      if (rule === 'manual') continue;
      if (rule === 'assisted' && sl.ctl && sl.ctl.sprinting) continue;
      const f = sl.f, b = this.ball;
      // a pass on its way to a teammate: take him; the other side has it: the nearer of us
      if (b.to && b.to.side === sl.side && b.to !== f && !b.to.gk && this.owner !== f && !this.slots.some(o => o.f === b.to)) { this.assignSlot(sl, b.to); continue; }
      if (this.owner && this.owner.side === sl.side && this.owner !== f && !this.owner.gk && !this.slots.some(o => o.f === this.owner)) { this.assignSlot(sl, this.owner); continue; }
      if ((!this.owner || this.owner.side !== sl.side) && this.t - (sl.lastSwitchT || -9) > .8) {
        const near = this.side[sl.side].filter(p => !p.gk && !p.sentOff && !this.slots.some(o => o !== sl && o.f === p)).sort((a, c) => dist(a.body, b) - dist(c.body, b))[0];
        if (near && near !== f && dist(near.body, b) + 40 < dist(f.body, b)) { this.assignSlot(sl, near); sl.lastSwitchT = this.t; }
      }
    }
  }

  /* ---- the ball ---- */
  ballStep(dt) {
    const b = this.ball;
    if (this.owner) { this.ownedBall(dt); return; }
    this.ballLoose(dt, false);
  }
  ownedBall(dt) {
    const b = this.ball, o = this.owner, ob = o.body;
    if (o.gk && o.state === 'keeper-hold') { b.x = ob.x + Math.cos(o.facing) * 3; b.y = ob.y + Math.sin(o.facing) * 3; b.z = ob.z + 14; b.vx = b.vy = b.vz = 0; return; }
    const sp = hyp(ob.vx, ob.vy), off = sp < 10 ? 5 : o.sprinting ? 11 + Math.sin(this.t * 9) * 2 : 7 + 2 * Math.sin(this.t * 12);
    b.x = ob.x + Math.cos(o.facing) * off; b.y = ob.y + Math.sin(o.facing) * off; b.z = 0; b.vx = ob.vx; b.vy = ob.vy; b.vz = 0; b.onGround = true; b.spin = 0;
    b.roll += sp * dt;
  }
  surfaceAt(x, y) {
    const t = this.map.tagAt ? this.map.tagAt(x, y) : null;
    return SURF[t || this.surface] || SURF.grass;
  }
  ballLoose(dt, dead) {
    const b = this.ball;
    if (this.owner) { this.ownedBall(dt); return; }
    const vx0 = b.vx, vy0 = b.vy, sp = hyp(b.vx, b.vy), [fr, bo] = this.surfaceAt(b.x, b.y);
    if (b.spin && sp > 20) { const k = b.spin * dt; b.vx += -vy0 * k; b.vy += vx0 * k; b.spin *= Math.exp(-dt * 1.4); }
    if (b.z <= .5) { const f = Math.exp(-dt * EF.T.ballFriction * fr); b.vx *= f; b.vy *= f; }
    else { const f = Math.exp(-dt * .12); b.vx *= f; b.vy *= f; const w = this.st.weather && this.st.weather.wind; if (w) b.vy += w * 20 * dt; }
    // the lucchetto pitch: small random deflections
    if (this.st.uneven && b.z <= .5 && sp > 40 && this.rng() < dt * 1.5) { const a = (this.rng() - .5) * .25, c = Math.cos(a), s = Math.sin(a); const nx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = nx; }
    b.bounce = EF.T.ballBounce * bo / .55; b.gravity = EF.T.ballGravity;
    const inGoal = this.insideGoal(b.x, b.y);
    if (inGoal) { const f = Math.exp(-dt * 5); b.vx *= f; b.vy *= f; b.spin = 0; }
    b.update(dt, this.map);
    this.netStep(b);
    if (b.hitWall && sp > 60) this.emit('bounce', { kind: inGoal ? 'net' : 'boards', x: b.x, y: b.y, s: sp });
    if (b.bounced && sp > 30) this.emit('bounce', { kind: 'ground', x: b.x, y: b.y, s: sp, surf: this.map.tagAt(b.x, b.y) || this.surface });
    b.roll += hyp(b.vx, b.vy) * dt;
    this.woodwork(b);
    if (this.bus) this.busHit(b);
    if (this.o.training && this.o.training.ballStep) { this.o.training.ballStep(this, dt); }
    if (dead || this.mode !== 'play') return;
    // interceptions and touches are in the footballers' steps; here: goals and out of play
    for (const gx of [P.X0, P.X1]) {
      const past = gx === P.X0 ? b.x < gx - b.r : b.x > gx + b.r;
      if (!past) continue;
      if (b.prevPast === gx) continue;
      const dirIn = gx === P.X1 ? 1 : -1;   // the side attacking this goal has dir === dirIn
      const attSide = this.dir(0) === dirIn ? 0 : 1;
      if (Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2) { b.prevPast = gx; this.goalScored(attSide); return; }
      if (this.o.training) { this.o.training.out && this.o.training.out(this, 'goalline'); return; }
      // out: over the goal line
      const lastAtt = this.last && this.last.side === attSide;
      this.restartLater(lastAtt ? 'goalkick' : 'corner', lastAtt ? 1 - attSide : attSide, b.y);
      return;
    }
    b.prevPast = null;
    if (b.y < P.Y0 - 20 || b.y > P.Y1 + 20 || b.x < P.X0 - 60 || b.x > P.X1 + 60) {
      if (this.o.training) { this.o.training.out && this.o.training.out(this, 'crowd'); return; }
      this.crowdThrow(); return;
    }
    if (b.y < P.Y0 - 3 || b.y > P.Y1 + 3) {
      // between the touchline and the boards: rolling along the apron, it comes back off the boards. A ball resting there is
      // given back by the fans
      if (sp < 8 && b.z < 1) { this.crowdThrow(); return; }
    }
  }
  /** the nets: inside a goal the ball is held by the back, the sides and the roof (soft: it barely bounces) */
  netStep(b) {
    for (const gx of [P.X0, P.X1]) {
      const d = gx === P.X0 ? -1 : 1, depth = (b.x - gx) * d;
      if (depth <= 0 || depth > P.NET + 24 || Math.abs(b.y - P.CY) > P.GH + 4 || b.z > P.BAR) continue;
      let hit = false;
      if (depth > P.NET - b.r) { b.x = gx + d * (P.NET - b.r); if (b.vx * d > 0) { b.vx = -b.vx * .15; hit = true; } }
      for (const sy of [-1, 1]) { const edge = P.CY + sy * P.GH; if ((b.y - edge) * sy > -b.r) { b.y = edge - sy * b.r; if (b.vy * sy > 0) { b.vy = -b.vy * .15; hit = true; } } }
      const roof = lerp(P.BAR, P.BAR - 6, clamp(depth / P.NET, 0, 1)); if (b.z > roof - b.r) { b.z = roof - b.r; if (b.vz > 0) b.vz = 0; }
      if (hit && this.t - (b.netT || -9) > .3) { b.netT = this.t; this.emit('bounce', { kind: 'net', x: b.x, y: b.y, s: 100 }); }
    }
  }
  insideGoal(x, y) { return (x < P.X0 || x > P.X1) && Math.abs(y - P.CY) < P.GH + 2; }
  woodwork(b) {
    if (b.z > P.BAR + 6) return;
    for (const gx of [P.X0, P.X1]) {
      if (Math.abs(b.x - gx) > 8) continue;
      for (const py of [P.CY - P.GH, P.CY + P.GH]) {
        if (b.z > P.BAR) continue;
        const dx = b.x - gx, dy = b.y - py, d = hyp(dx, dy);
        if (d < 5 && d > .01) {
          const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; b.x = gx + nx * 5.1; b.y = py + ny * 5.1; b.spin = 0; this.woodworkHit(b, 'post'); }
        }
      }
      if (Math.abs(b.y - P.CY) < P.GH) {
        const dx = b.x - gx, dz = b.z - P.BAR, d = hyp(dx, dz);
        if (d < 5 && d > .01) {
          const nx = dx / d, nz = dz / d, vn = b.vx * nx + b.vz * nz;
          if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vz -= 1.7 * vn * nz; b.x = gx + nx * 5.1; b.z = P.BAR + nz * 5.1; b.onGround = false; this.woodworkHit(b, 'bar'); }
        }
      }
    }
  }
  woodworkHit(b, kind) {
    if (this.t - (b.woodT || -9) < .2) return; b.woodT = this.t;
    const s = this.last ? this.last.side : 0;
    this.emit('woodwork', { kind, x: b.x, y: b.y, z: b.z, side: s, who: this.last && this.last.id });
    if (this.last) this.gain(this.last.side, 7, 'woodwork');
    if (this.shot) this.shot.done = true;
  }
  busHit(b) {
    const k = this.bus; if (!k.on) return;
    if (b.z > 30) return;
    if (b.x > k.x0 && b.x < k.x1 && b.y > k.y0 && b.y < k.y1) {
      if (this.superFlight) return;
      // bounce back out the way it came
      const fromFront = (b.vx > 0) === (k.x0 > P.CX);
      if (fromFront) { b.vx = -b.vx * .5; b.x = b.vx < 0 ? k.x0 - 1 : k.x1 + 1; } else { b.vy = -b.vy * .5; }
      this.emit('busHit', { x: b.x, y: b.y });
      if (this.shot) this.shot.done = true;
    }
  }

  /* ---- possession and kicks ---- */
  takeBall(f) {
    const b = this.ball, prev = this.last;
    if (b.superPath) return;
    const wasPass = b.to && b.kind && (b.kind === 'pass' || b.kind === 'through' || b.kind === 'lob' || b.kind === 'cross');
    this.owner = f; b.spin = 0; b.superPath = null; b.superName = null;
    if (wasPass && prev && prev.side === f.side && prev !== f) {
      this.stats[f.side].passDone++; this.chain[f.side]++; this.chain[1 - f.side] = 0;
      this.emit('passDone', { side: f.side, who: f.id, from: prev.id, kind: b.kind, chain: this.chain[f.side] });
      this.gain(f.side, Math.min(8, 2 + this.chain[f.side] - 1), 'pass');
      if (b.oneTwo && b.oneTwo.from === f) this.emit('oneTwo', { side: f.side, who: f.id });
    } else if (prev && prev.side !== f.side) {
      this.chain[f.side] = 1; this.chain[1 - f.side] = 0;
      if (b.kind === 'pass' || b.kind === 'through' || b.kind === 'lob' || b.kind === 'cross') this.emit('intercept', { side: f.side, who: f.id });
      this.stats[f.side].recover++;
      this.emit('recover', { side: f.side, who: f.id });
    }
    b.to = null; b.kind = null; this.last = f; this.lastTouch = f.side;
    if (this.shot) this.shot.done = true;
    this.emit('touch', { who: f.id, side: f.side });
    if (b.oneTwo && b.oneTwo.mate === f) { f.oneTwoT = .35; f.oneTwoTo = b.oneTwo.from; }
    b.oneTwo = null;
  }
  kickBall(f, vx, vy, vz, kind, to) {
    const b = this.ball; this.owner = null; this.last = f; this.lastTouch = f.side; this.kickHold = 0;
    b.vx = vx; b.vy = vy; b.vz = vz; b.onGround = vz <= 0; b.spin = 0; b.kind = kind; b.to = to || null; b.kickT = this.t; b.superPath = null; b.superName = null;
    if (b.z < 0) b.z = 0;
    f.cool = .3;
  }

  /* ---- goals ---- */
  goalScored(side) {
    const by = this.last, own = by && by.side !== side;
    if (this.o.training) { this.o.training.goal && this.o.training.goal(this, side, by); return; }
    this.score[side]++;
    const g = { side, who: by ? by.id : null, name: by ? (own ? by.data.name + ' (OG)' : by.data.name) : '?', minute: this.minuteLabel(), own: !!own, kind: (this.shot && this.shot.kind) || (this.ball.kind || 'shot'), t: this.t, super: !!this.ball.superName };
    this.goals.push(g);
    if (by && !own) by.goals++;
    this.mode = 'goal'; this.modeT = 0; this.owner = null; this.shot = null; this.foul = null;
    this.celebration = { side, scorer: own ? null : by, t: 0, pick: -1, picked: false, cpu: !this.humanSide(side) || !by || !by.human === null };
    this.gain(side, 35, 'goal'); this.euph[1 - side] = Math.max(0, this.euph[1 - side] - 10);
    this.emit(own ? 'ownGoal' : 'goal', Object.assign({}, g));
    if (this.half === 3) this.flags.goldenGoal = true;
    if (this.bus && this.bus.on && g.super) { this.bus.on = false; this.emit('busGone', { side: this.bus.side }); }
    if (this.bus && this.bus.on && side !== this.bus.side) this.emit('busBeaten', { side });
  }
  celebrateStep(dt) {
    const c = this.celebration; if (!c) { this.afterGoal(); return; }
    c.t += dt;
    const f = c.scorer;
    if (f && !f.sentOff && c.t < 3.4) {
      // the scorer runs to the nearest corner flag; teammates run in to him
      const cx = this.ball.x > P.CX ? P.X1 - 12 : P.X0 + 12, cy = f.body.y < P.CY ? P.Y0 + 12 : P.Y1 - 12;
      if (!c.target) c.target = [lerp(f.body.x, cx, .6), lerp(f.body.y, cy, .6)];
      if (c.pick < 0 && c.t > 1.4) c.pick = celebrationFor(this, f, -1);
      for (const p of this.side[c.side]) {
        if (p.gk || p.sentOff) continue;
        p.celebrate = c.t > 1.2 ? (p === f ? EF.get('celebration', c.pick < 0 ? 'cheer' : c.pick) : 'pile') : null;
        const tx = p === f ? c.target[0] : f.body.x + (p.idx - 2) * 8, ty = p === f ? c.target[1] : f.body.y + 6;
        p.goTo(tx, ty, p === f ? 120 : 100, dt);
      }
      for (const p of this.side[1 - c.side]) { p.dejected = true; p.goTo(p.body.x, p.body.y, 0, dt); }
    }
    if (c.t >= (c.long ? 4.2 : 3.6)) this.afterGoal();
  }
  pickCelebration(k) {
    const c = this.celebration; if (!c || c.picked || !c.scorer || c.t > 2.4) return;
    const list = celebrationChoices(this, c.scorer); c.picked = true; c.pick = list[k] || list[0];
    const cel = EF.get('celebration', c.pick); c.long = true;
    this.emit('celebrate', { side: c.side, who: c.scorer.id, kind: c.pick, name: cel.name });
    this.gain(c.side, cel.euphoria || 8, 'celebrate');
    if (cel.yellow) this.deferred.push({ f: c.scorer, kind: 'yellow', why: 'shirt' });
  }
  afterGoal() {
    const c = this.celebration; this.celebration = null;
    if (c && !c.picked && c.scorer) { const sig = c.pick < 0 ? 'cheer' : c.pick; this.emit('celebrate', { side: c.side, who: c.scorer.id, kind: sig, name: (EF.get('celebration', sig) || {}).name || '' }); }
    for (const p of this.players) { p.celebrate = null; p.dejected = false; }
    if (this.flags.goldenGoal) { this.flags.goldenGoal = false; this.emit('goldenGoal', {}); this.fullTime(); return; }
    if (this.onReplay && this.onReplay(c) && !this.session) { this.mode = 'dead'; this.dead = { t: 999, then: () => {} }; this.replayWait = true; return; }
    this.kickoff(c ? 1 - c.side : 0, false);
  }
  replayDone() { if (this.replayWait) { this.replayWait = false; this.dead = null; this.kickoff(1 - (this.goals.length ? this.goals[this.goals.length - 1].side : 0), false); } }

  /* ---- restarts ---- */
  restartLater(kind, side, y) {
    this.owner = null; this.shot = null;
    const b = this.ball;
    this.mode = 'dead'; this.modeT = 0;
    this.emit('out', { kind, side });
    this.dead = { t: 1.1, then: () => this.startSetpiece(kind, side, { y }) };
    this.applyDeferred();
  }
  crowdThrow() {
    const b = this.ball, side = this.last ? 1 - this.last.side : 0;
    this.owner = null; this.mode = 'dead'; this.modeT = 0; this.shot = null;
    const fx = clamp(b.x, P.X0 + 30, P.X1 - 30), fy = b.y < P.CY ? P.Y0 - 40 : P.Y1 + 30;
    this.emit('crowdThrow', { side, x: fx, y: fy });
    this.applyDeferred();
    this.dead = { t: 1.2, then: () => {
      const tgt = this.side[side].filter(p => !p.gk && !p.sentOff).sort((p, q) => hyp(p.body.x - fx, p.body.y - fy) - hyp(q.body.x - fx, q.body.y - fy))[0];
      b.x = fx; b.y = fy < P.CY ? P.Y0 + 3 : P.Y1 - 3; b.z = 30;
      const tx = tgt ? tgt.body.x : P.CX, ty = tgt ? tgt.body.y : P.CY;
      const v = E.arc({ x: b.x, y: b.y, z: b.z }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 50 });
      b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.onGround = false; b.kind = 'throw'; b.to = tgt || null; this.last = null; this.lastTouch = -1;
      this.mode = 'play'; this.modeT = 0;
      // nobody of the other side may take it for a moment
      for (const p of this.side[1 - side]) p.cool = Math.max(p.cool, .6);
    } };
  }
  applyDeferred() {
    for (const d of this.deferred.splice(0)) giveCard(this, d.f, d.kind, d.why);
  }
  kickoff(side, fresh) {
    this.owner = null; this.shot = null; this.foul = null; this.superFlight = null;
    const b = this.ball; b.x = P.CX; b.y = P.CY; b.z = 0; b.vx = b.vy = b.vz = 0; b.spin = 0; b.superPath = null; b.to = null; b.kind = null; b.prevPast = null;
    this.startSetpiece('kickoff', side, {});
    this.emit('kickoff', { side, fresh: !!fresh, half: this.half });
    this.applyDeferred();
  }
}
EF.Match = Match;
const POS_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
const NO_INTENT = { move: [0, 0], aim: null, sprint: false, pass: {}, shoot: {}, lob: {}, through: {}, skill: {}, sw: {}, dive: {}, euphoria: false, target: null, none: true };
EF.NO_INTENT = NO_INTENT;
function applyBuff(m, s, kind) {
  if (kind === 'hairdryer') { m.buff.speed[s] = 1.1; m.buff.tackle[s] = 1.1; m.buff.strict = 1.2; m.flags.hairdryer = s; }
  if (kind === 'arm') { m.buff.regen[s] = 1.25; m.euph[s] = Math.min(100, m.euph[s] + 15); }
  if (kind === 'tactics') { m.buff.passAcc[s] = .9; }
  if (kind === 'underdog') { m.buff.gain[s] = 1.5; }
  if (kind === 'loyal') { m.euph[s] = Math.min(100, m.euph[s] + 20); }
  if (kind === 'jetski') { m.euph[s] = Math.min(100, m.euph[s] + 10); }
}
EF.applyBuff = applyBuff;


/* ===== 12-players.js ===== */
/* 12-players: the Footballer: body, stats, stamina, its state machine and every action (pass, through ball, lob, cross,
 * chip, shot with the meter and the sweet spot, aftertouch curl, air moves, skill moves, poke, slide, barge, theatrics),
 * contact and knockdowns. Footballer.step(dt, intent) is the only way a footballer does anything. */
const AIR_KINDS = { header: [22, 40, 260], bicycle: [22, 40, 420], volley: [8, 22, 360], divingHeader: [4, 14, 290] };
class Footballer {
  constructor(m, side, idx, data, role, form) {
    this.m = m; this.side = side; this.idx = idx; this.id = side * 5 + idx; this.data = data; this.role = role; this.gk = role === 'GK';
    this.spec = form.roles[role] || {}; this.form = form;
    this.st = Object.assign({ pace: 70, shoot: 60, pass: 60, tackle: 60, skill: 60, keep: 20, weight: 60, temper: 40 }, data.stats);
    this.body = new E.Body({ x: P.CX, y: P.CY, r: 5, friction: 0, gravity: 700 });
    this.facing = 0; this.stamina = 100; this.state = 'run'; this.stateT = 0; this.act = null; this.cool = 0; this.stun = 0; this.skillCd = 0;
    this.meter = 0; this.charging = false; this.cards = 0; this.sentOff = false; this.human = null; this.goals = 0; this.shots = 0; this.tackles = 0; this.saves = 0;
    this.downT = 0; this.air = null; this.slideHit = null; this.contactT = -9; this.lastSkillT = -9; this.oneTwoT = 0; this.runTo = null; this.botIntent = null;
    this.celebrate = null; this.dejected = false; this.sprinting = false; this.flip = 0; this.lift = 0; this.wrong = 0; this.glow = false; this.curlT = 0;
  }
  get name() { return this.data.name; }
  get dir() { return this.m.dir(this.side); }
  get hasBall() { return this.m.owner === this; }
  speed() {
    const m = this.m, euro = m.euroT[this.side] > 0, hd = m.flags.hairdryer === this.side && m.half === 1 && m.minute < 15 ? 1.1 : 1;
    return EF.T.runSpeed * (.85 + .3 * this.st.pace / 100) * (euro ? 1.12 : 1) * hd * (this.cards && this.m.o.cheatSlow ? .9 : 1);
  }
  setState(s, t = 0) { this.state = s; this.stateT = t; }
  doAct(name, dur) { this.act = { name, t: 0, dur }; }
  /** move toward (x, y) at up to speed (scripted moves: celebrations, set pieces, walk-offs) */
  goTo(x, y, speed, dt) {
    const b = this.body, dx = x - b.x, dy = y - b.y, d = hyp(dx, dy), sp = d > 2 ? Math.min(speed, d * 4) : 0;
    b.vx = approach(b.vx, d > 2 ? dx / d * sp : 0, 700 * dt); b.vy = approach(b.vy, d > 2 ? dy / d * sp : 0, 700 * dt);
    if (sp > 5) this.facing = E.approachAng(this.facing, Math.atan2(dy, dx), dt * 10);
    b.update(dt, this.m.map);
  }
  face(a, dt, rate = 12) { this.facing = E.approachAng(this.facing, a, dt * rate); }

  step(dt, it, live) {
    const m = this.m, b = this.body;
    this.cool = Math.max(0, this.cool - dt); this.stun = Math.max(0, this.stun - dt); this.skillCd = Math.max(0, this.skillCd - dt); this.oneTwoT = Math.max(0, this.oneTwoT - dt);
    this.stateT += dt; this.curlT = Math.max(0, this.curlT - dt); this.wrong = Math.max(0, this.wrong - dt);
    if (this.act) { this.act.t += dt; if (this.act.t >= this.act.dur) this.act = null; }
    this.glow = m.euroT[this.side] > 0;
    if (this.sentOff) { this.offStep(dt); return; }
    if (this.gk && keeperStep(this, dt, it, live)) return;
    switch (this.state) {
      case 'down': this.decel(dt, 500); if (this.stateT >= this.downT) { this.setState('getup'); this.downT = .35; } b.update(dt, m.map); return;
      case 'getup': this.decel(dt, 600); if (this.stateT >= .35) this.setState('run'); b.update(dt, m.map); return;
      case 'launched': this.flip = Math.min(1, this.stateT / .6); b.update(dt, m.map); if (b.onGround && this.stateT > .15) { this.setState('down'); this.downT = .9 + m.rng() * .5; this.flip = 0; m.emit('knockdown', { who: this.id, x: b.x, y: b.y, kind: 'land' }); } return;
      case 'dive': this.diveStep(dt); return;
      case 'slide': this.slideStep(dt); return;
      case 'poke': this.pokeStep(dt); return;
      case 'barge': this.bargeStep(dt); return;
      case 'air': this.airStep(dt); return;
      case 'skill': this.skillStep(dt, it); return;
      case 'stunned': this.decel(dt, 400); b.update(dt, m.map); if (this.stateT >= this.downT) this.setState('run'); return;
    }
    if (!live || this.celebrate || this.dejected) {
      if (!live && !this.celebrate && !this.dejected && m.mode !== 'goal') this.decel(dt, 500);
      if (m.mode === 'setpiece' || m.mode === 'kickoff') return;   // set pieces move them
      if (!this.celebrate && !this.dejected) b.update(dt, m.map);
      this.regen(dt, false); return;
    }
    // ---- running, with or without the ball ----
    const mv = it.move || [0, 0], ml = hyp(mv[0], mv[1]);
    const wantSprint = !!it.sprint && ml > .2, euro = m.euroT[this.side] > 0, inf = m.cheats['stamina' + this.side] || m.o.infStamina;
    let mul = 1;
    this.sprinting = false;
    if (wantSprint && (this.stamina > 0 || euro || inf)) { mul = this.stamina < 25 && !euro && !inf ? 1.15 : EF.T.sprintMul; if (this.hasBall) mul *= .93; this.sprinting = true; }
    const sp = this.speed() * mul * (this.hasBall ? .95 : 1) * (this.wrong > 0 ? .5 : 1);
    const acc = EF.T.accel;
    b.vx = approach(b.vx, mv[0] * sp, acc * dt); b.vy = approach(b.vy, mv[1] * sp, acc * dt);
    if (ml > .2) {
      const want = Math.atan2(mv[1], mv[0]), turn = Math.abs(E.angDiff(this.facing, want));
      if (this.hasBall && turn > 1.75) { b.vx *= .985; b.vy *= .985; }
      this.face(want, dt, this.hasBall ? 9 : 14);
    } else if (it.faceTo) this.face(it.faceTo, dt, 8);
    this.regen(dt, this.sprinting && !euro && !inf);
    b.update(dt, m.map);
    this.actions(dt, it);
    this.pickup();
  }
  decel(dt, k) { const b = this.body; b.vx = approach(b.vx, 0, k * dt); b.vy = approach(b.vy, 0, k * dt); }
  regen(dt, sprinting) {
    if (sprinting) { this.stamina = Math.max(0, this.stamina - EF.T.staminaDrain * dt); this.restT = 0; return; }
    this.restT = (this.restT || 0) + dt;
    if (this.restT > .5) this.stamina = Math.min(100, this.stamina + EF.T.staminaRegen * dt * (this.m.euph[this.side] >= 34 ? 1.25 : 1) * (this.m.buff.regen[this.side] || 1));
  }
  /** a loose ball within reach becomes his */
  pickup() {
    const m = this.m, b = m.ball;
    if (m.owner || m.mode !== 'play' || this.cool > 0 || this.stun > 0 || b.superPath || m.superFlight) return;
    if (this.state !== 'run') return;
    if (m.kickHold > 0 && m.sp && this.side !== m.sp.side) return;
    const d = hyp(b.x - this.body.x, b.y - this.body.y), sp = hyp(b.vx, b.vy);
    // a block: an opponent's shot hits him and flies off (often out for a corner)
    if (b.kind === 'shot' && m.last && m.last.side !== this.side && !this.gk && sp > EF.T.trapSpeed && d < 7 && b.z < 16 && m.t - (b.kickT || 0) > .08) {
      const a = Math.atan2(b.vy, b.vx) + (m.rng() < .5 ? -1 : 1) * (.6 + m.rng() * .9), k = .35 + m.rng() * .25;
      b.vx = Math.cos(a) * sp * k; b.vy = Math.sin(a) * sp * k; b.vz = 30 + m.rng() * 60; b.onGround = false; b.kind = 'block'; m.last = this; m.lastTouch = this.side; this.cool = .3;
      if (m.shot) m.shot.done = true; m.emit('block', { who: this.id, side: this.side }); m.gain(this.side, 4, 'block'); return;
    }
    if (b.z >= 9) return;
    if (d < (sp > EF.T.trapSpeed ? 4.5 : 9)) {
      // an opponent's moving pass: intercepted, or deflected off his shins
      const pass = b.to && m.last && m.last.side !== this.side && sp > 60;
      if (pass && m.rng() * 100 > this.st.tackle + 30) {
        const a = Math.atan2(b.vy, b.vx) + (m.rng() - .5) * 1.5; b.vx = Math.cos(a) * sp * .55; b.vy = Math.sin(a) * sp * .55; b.to = null; m.last = this; this.cool = .25;
        m.emit('deflect', { who: this.id }); return;
      }
      if (sp > EF.T.trapSpeed * .8) { const k = 4 + (100 - this.st.skill) / 100 * 6; this.body.vx *= .7; this.body.vy *= .7; }
      m.takeBall(this);
    }
  }

  /* ---- with the ball and without it ---- */
  actions(dt, it) {
    const m = this.m, has = this.hasBall, b = m.ball;
    if (this.cool > 0 && !this.charging) return;
    // aftertouch: just after a shot, the stick across the ball's path curls it
    if (this.curlT > 0 && m.last === this && !m.owner && it.move && !it.bot) {
      const sp = hyp(b.vx, b.vy) || 1, across = (it.move[0] * -b.vy + it.move[1] * b.vx) / sp;
      if (Math.abs(across) > .3) { b.spin = clamp(b.spin + across * EF.T.curlStrength * dt, -1.6, 1.6); if (!this.curled) { this.curled = true; m.emit('curl', { who: this.id }); } }
    }
    if (has) {
      if (this.oneTwoT > 0 && this.oneTwoTo && this.oneTwoT - dt <= 0) { this.passTo(this.oneTwoTo, 'pass', true); return; }
      const P_ = it.pass || {}, S = it.shoot || {}, L = it.lob || {}, T = it.through || {}, K = it.skill || {}, D = it.dive || {};
      if (S.down) {
        if (!this.charging) { this.charging = true; this.meter = 0; }
        const k = (m.euph[this.side] >= 67 ? 1.2 : 1) / EF.T.shotChargeTime;
        this.meter = Math.min(1, this.meter + dt * k);
        if (!it.bot || this.meter < (it.power || 0)) return;
      }
      if (this.charging && (!S.down || (it.bot && this.meter >= (it.power || 0)))) { this.charging = false; const p = this.meter; this.meter = 0; this.shoot(p, it); return; }
      if (P_.pressed) { if (it.sw && it.sw.down) this.oneTwo(it); else this.pass(it); return; }
      if (T.pressed) { this.through(it); return; }
      if (L.pressed) { this.lob(it); return; }
      if (K.pressed) { this.skill(it); return; }
      if (D.pressed) { this.theatrics(); return; }
      return;
    }
    this.charging = false; this.meter = 0;
    const win = (it.pass && it.pass.pressed) || (it.shoot && it.shoot.pressed) || it.airTry ? airWindow(this) : null;
    if (win && ((it.shoot && it.shoot.pressed) || (it.pass && it.pass.pressed) || it.airTry)) { this.startAir(win, it.airTry ? (it.airMode || 'shoot') : it.pass && it.pass.pressed ? 'pass' : 'shoot', it); return; }
    if (m.kickHold > 0 && m.sp && this.side !== m.sp.side) return;
    if (it.pass && it.pass.pressed) { this.poke(); return; }
    if (it.shoot && it.shoot.pressed) { this.slide(it); return; }
    if (it.lob && it.lob.pressed) { this.barge(); return; }
    if (it.dive && it.dive.pressed) { this.theatrics(); return; }
  }
  aimDir(it) {
    if (it.aim && hyp(it.aim[0], it.aim[1]) > .1) return Math.atan2(it.aim[1], it.aim[0]);
    if (it.move && hyp(it.move[0], it.move[1]) > .2) return Math.atan2(it.move[1], it.move[0]);
    return this.facing;
  }
  /** the teammate a pass goes to: the one the direction points at, within the pass assist's cone */
  pickReceiver(a, it, o = {}) {
    const m = this.m, b = this.body;
    if (it.target != null) { const t = m.players.find(p => p.id === it.target && p.side === this.side && p !== this); if (t) return t; }
    if (it.passTo != null) { const t = m.players.find(p => p.id === it.passTo); if (t && t !== this) return t; }
    const assist = { off: 20, low: 35, high: EF.T.passAssistDeg }[it.assist || game.settings.passAssist || 'high'] * PI / 180;
    let best = null, bs = -9;
    for (const t of m.side[this.side]) {
      if (t === this || t.sentOff || t.state === 'off') continue;
      const ta = Math.atan2(t.body.y - b.y, t.body.x - b.x), da = Math.abs(E.angDiff(a, ta));
      if (t.gk && Math.cos(E.angDiff(a, Math.atan2(0, -this.dir))) < .6) continue;
      if (da > Math.max(assist, .15)) continue;
      const d = dist(t.body, b), open = Math.min(1, nearestFoe(m, t, this.side) / 40);
      const s = Math.cos(da) - d / 1200 + .15 * open + (o.forward ? (t.body.x - b.x) * this.dir / 400 : 0);
      if (s > bs) { bs = s; best = t; }
    }
    return best;
  }
  pressure() { return nearestFoe(this.m, this, this.side) < 12; }
  pass(it) {
    const a = this.aimDir(it), r = it.aimPoint && it.target == null ? null : this.pickReceiver(a, it);
    if (r) return this.passTo(r, 'pass', false, it);
    const sp = 210; this.kickDir(a, sp, 0, 'pass', null, it.aimPoint);
  }
  passTo(r, kind, oneTwoReturn, it = {}) {
    const m = this.m, b = this.body, d0 = dist(r.body, b), sp = clamp(d0 * 1.5 + 90, EF.T.passSpeedMin, EF.T.passSpeedMax);
    // lead him: where he will be when a rolling ball (slowed by the surface) gets there
    const k = EF.T.ballFriction * m.surfaceAt(b.x, b.y)[0], arrive = d => (d * k / sp < .92 ? -Math.log(1 - d * k / sp) / k : d / sp * 2.5);
    let tx = r.body.x, ty = r.body.y;
    for (let i = 0; i < 3; i++) { const t = arrive(hyp(tx - b.x, ty - b.y)); tx = r.body.x + r.body.vx * t; ty = r.body.y + r.body.vy * t; }
    const err = (100 - this.st.pass) / 100 * .06 * (this.pressure() ? 2 : 1) * (m.buff.passAcc[this.side] || 1);
    const a = Math.atan2(ty - b.y, tx - b.x) + gauss(m.rng) * err;
    this.kickDir(a, sp, 0, kind, r);
    if (oneTwoReturn) { this.oneTwoTo = null; }
  }
  kickDir(a, sp, vz, kind, to, point) {
    const m = this.m;
    if (point) { a = Math.atan2(point.y - this.body.y, point.x - this.body.x); sp = clamp(hyp(point.x - this.body.x, point.y - this.body.y) * 1.5 + 90, EF.T.passSpeedMin, EF.T.passSpeedMax); }
    m.kickBall(this, Math.cos(a) * sp, Math.sin(a) * sp, vz, kind, to);
    this.facing = a; this.doAct('pass', .3);
    m.stats[this.side].passes++;
    m.emit('pass', { side: this.side, who: this.id, to: to ? to.id : null, kind });
  }
  oneTwo(it) {
    const a = this.aimDir(it), r = this.pickReceiver(a, it);
    if (!r || dist(r.body, this.body) > 220) return this.pass(it);
    this.passTo(r, 'pass');
    this.m.ball.oneTwo = { from: this, mate: r };
    const g = { x: this.m.goalX(this.side), y: P.CY }, ga = angTo(this.body, g);
    this.runTo = { x: this.body.x + Math.cos(ga) * 70, y: this.body.y + Math.sin(ga) * 50, t: 1.6 };
  }
  through(it) {
    const m = this.m, a = this.aimDir(it), r = this.pickReceiver(a, it, { forward: true });
    if (!r) return this.pass(it);
    const g = { x: m.goalX(this.side), y: P.CY }, ga = angTo(r.body, g), lead = 50 + m.rng() * 40;
    let tx = r.body.x + Math.cos(ga) * lead, ty = r.body.y + Math.sin(ga) * lead * .6;[tx, ty] = P.clampField(tx, ty, 14);
    const d = hyp(tx - this.body.x, ty - this.body.y), tr = hyp(tx - r.body.x, ty - r.body.y) / (r.speed() * 1.2) + .2;
    const sp = clamp(d / tr * 1.15, 160, 330);
    const err = (100 - this.st.pass) / 100 * .05;
    this.kickDir(Math.atan2(ty - this.body.y, tx - this.body.x) + gauss(m.rng) * err, sp, 0, 'through', r);
    r.runTo = { x: tx, y: ty, t: 1.4 };
  }
  lob(it) {
    const m = this.m, b = this.body, gx = m.goalX(this.side), dg = hyp(gx - b.x, P.CY - b.y), k = m.keeper[1 - this.side];
    let tx, ty, apex, kind = 'lob', to = null;
    if (dg < 170 && k && Math.abs(k.body.x - gx) > 24 && !it.aimPoint) {   // a chip over the keeper
      tx = gx - this.dir * 6; ty = P.CY + clamp(b.y - P.CY, -30, 30) * .3; apex = 45; kind = 'chip';
      const v = E.arc({ x: m.ball.x, y: m.ball.y, z: 0 }, { x: tx, y: ty, z: 20 }, EF.T.ballGravity, { apex });
      m.kickBall(this, v.vx, v.vy, v.vz, 'chip', null); this.doAct('chip', .35);
      this.shots++; m.stats[this.side].shots++;
      m.shot = { by: this, side: this.side, t0: m.t, kind: 'chip', speed: hyp(v.vx, v.vy), done: false };
      m.emit('shot', { side: this.side, who: this.id, power: .4, kind: 'chip' }); if (k) keeperRead(k, m.shot); return;
    }
    const u = P.toUV(this.dir, b.x, b.y)[0], wide = Math.abs(b.y - P.CY) > 150;
    if (it.aimPoint) { tx = it.aimPoint.x; ty = it.aimPoint.y; }
    else if (wide && u > .68) {   // a cross toward the penalty spot, or the teammate nearest it
      const spot = { x: gx - this.dir * P.SPOT, y: P.CY };
      to = m.side[this.side].filter(t => t !== this && !t.gk && !t.sentOff).sort((p, q) => dist(p.body, spot) - dist(q.body, spot))[0];
      tx = to ? lerp(to.body.x, spot.x, .4) : spot.x; ty = to ? lerp(to.body.y, spot.y, .5) : spot.y; kind = 'cross';
      if (to) to.runTo = { x: tx, y: ty, t: 1.6 };
    } else {
      to = this.pickReceiver(this.aimDir(it), it, { forward: true });
      if (to) { const lead = .55; tx = to.body.x + to.body.vx * lead; ty = to.body.y + to.body.vy * lead; }
      else { const a = this.aimDir(it); tx = b.x + Math.cos(a) * 160; ty = b.y + Math.sin(a) * 160; }
    }
    [tx, ty] = P.clampField(tx, ty, 8);
    const d = hyp(tx - b.x, ty - b.y); apex = kind === 'cross' ? 55 : d > 250 ? 55 : 30;
    const v = E.arc({ x: m.ball.x, y: m.ball.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex });
    const err = (100 - this.st.pass) / 100 * .04;
    const c = Math.cos(gauss(m.rng) * err), s = Math.sin(gauss(m.rng) * err);
    m.kickBall(this, v.vx * c - v.vy * s, v.vx * s + v.vy * c, v.vz, kind, to); this.doAct('chip', .35);
    m.stats[this.side].passes++;
    m.emit('pass', { side: this.side, who: this.id, to: to ? to.id : null, kind });
  }
  /** a shot from the meter: power 0..1; aimed across the goal mouth */
  shoot(p, it, from) {
    const m = this.m, b = this.body, side = this.side;
    if (m.euroT[side] > 0 && !m.superUsed[side] && p >= .9 && !m.cheats.pure) { startSuper(m, this, it); return; }
    const gx = m.goalX(side), k = m.keeper[1 - side];
    let aimY;
    if (it.aimPoint) aimY = clamp((it.aimPoint.y - P.CY) / (P.GH - 6), -1, 1);
    else if (it.aimY != null) aimY = it.aimY;
    else {
      const mv = it.move || [0, 0], across = mv[1];
      if (Math.abs(across) > .25) aimY = clamp(across * 1.2, -1, 1);
      else if ((it.assist || game.settings.shotAssist) !== 'off') aimY = k && k.body.y > P.CY ? -.75 : .75;
      else aimY = 0;
    }
    const ty = P.CY + aimY * (P.GH - 6), sweet = p >= .78 && p <= .9;
    let sp = 180 + p * (EF.T.shotSpeedMax - 180); if (sweet) sp *= 1.15;
    let vz = 25 + p * 90; if (p > .95 && m.rng() < .5) vz += 40;
    const across = Math.abs(E.angDiff(this.facing, Math.atan2(ty - b.y, gx - b.x))) > 1.75;
    const err = (100 - this.st.shoot) / 100 * .08 + (this.pressure() ? .04 : 0) + (across ? .05 : 0);
    const a = Math.atan2(ty - b.y, gx - b.x) + gauss(m.rng) * err;
    const dgx = Math.abs(gx - b.x); if (dgx < 120) vz *= .55 + dgx / 270;   // (close in: kept down)
    m.kickBall(this, Math.cos(a) * sp, Math.sin(a) * sp, vz, 'shot', null);
    this.facing = a; this.doAct(p > .7 ? 'shotHard' : 'shot', .4); this.curlT = .4; this.curled = false;
    if (sweet) game.headless || m.o.silent || m.session ? null : game.freeze(.05);
    registerShot(m, this, sp, sweet, 'shot', p);
  }

  /* ---- air moves: header, bicycle kick, volley, diving header ---- */
  startAir(win, mode, it) {
    const m = this.m, b = this.body, gx = m.goalX(this.side), toGoal = Math.atan2(P.CY - b.y, gx - b.x), faceGoal = Math.abs(E.angDiff(this.facing, toGoal)) < 1.92;
    let kind;
    if (win.z >= 22) kind = faceGoal || mode === 'pass' ? 'header' : 'bicycle';
    else if (win.z >= 8) kind = 'volley';
    else kind = this.sprinting ? 'divingHeader' : 'volley';
    if (win.z < 8 && !this.sprinting) kind = 'volley';
    this.air = { kind, mode, t: 0, x: win.x, y: win.y, z: win.z, it };
    this.setState('air');
    if (kind === 'header' && win.z > 28) b.jump(150);
    if (kind === 'bicycle') { b.jump(140); m.emit('slowmo', { k: .35, t: .4 }); }
    m.emit('air', { who: this.id, kind });
  }
  airStep(dt) {
    const m = this.m, b = this.body, a = this.air, ball = m.ball; a.t += dt;
    const dx = a.x - b.x, dy = a.y - b.y, d = hyp(dx, dy);
    if (d > 3 && a.t < .4) { const sp = Math.min(220, d / Math.max(.05, .4 - a.t)); b.vx = dx / d * sp; b.vy = dy / d * sp; } else this.decel(dt, 600);
    if (a.kind === 'divingHeader') this.lift = Math.min(1, a.t / .2);
    b.update(dt, m.map);
    const [lo, hi] = AIR_KINDS[a.kind];
    const bd = hyp(ball.x - b.x, ball.y - b.y), contactZ = ball.z - b.z;
    if (!m.owner && !ball.superPath && bd < 11 && contactZ > lo - 6 && contactZ < hi + 10 && m.mode === 'play') {
      this.airContact(); return;
    }
    if (a.t > .6) { this.air = null; this.lift = 0; if (a.kind === 'divingHeader' || a.kind === 'bicycle') { this.setState('down'); this.downT = .5; } else this.setState('run'); }
  }
  airContact() {
    const m = this.m, a = this.air, b = this.body, side = this.side, it = a.it || {};
    const [, , baseSp] = AIR_KINDS[a.kind], gx = m.goalX(side);
    m.last = this; m.lastTouch = side; m.owner = null;
    if (a.mode === 'clear') {   // a defender heads it away, upfield and wide
      const ang = Math.atan2((m.ball.y < P.CY ? -1 : 1) * .7, this.dir), sp = 200 + m.rng() * 60;
      m.kickBall(this, Math.cos(ang) * sp, Math.sin(ang) * sp, 90 + m.rng() * 40, 'clear', null); this.doAct(a.kind === 'header' ? 'header' : 'volley', .3);
      m.emit('clearance', { side, who: this.id });
    } else if (a.mode === 'pass') {   // cushioned to a teammate
      const r = this.pickReceiver(this.aimDir(it), it);
      const tx = r ? r.body.x : b.x + Math.cos(this.facing) * 60, ty = r ? r.body.y : b.y + Math.sin(this.facing) * 60;
      const v = E.arc({ x: m.ball.x, y: m.ball.y, z: m.ball.z }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: m.ball.z + 10 });
      m.kickBall(this, v.vx, v.vy, v.vz, 'pass', r); this.doAct(a.kind === 'header' ? 'header' : 'volley', .3);
      m.emit('pass', { side, who: this.id, to: r ? r.id : null, kind: 'pass' });
    } else {
      const mv = it.move || [0, 0];
      let aimY = it.aimY != null ? it.aimY : Math.abs(mv[1]) > .25 ? clamp(mv[1] * 1.2, -1, 1) : (m.keeper[1 - side].body.y > P.CY ? -.7 : .7);
      const ty = P.CY + aimY * (P.GH - 6), q = 1 - Math.min(1, hyp(a.x - b.x, a.y - b.y) / 14);
      const err = (100 - this.st.shoot) / 100 * .1 + (1 - q) * .08 + (a.kind === 'bicycle' ? .05 : 0);
      const ang = Math.atan2(ty - m.ball.y, gx - m.ball.x) + gauss(m.rng) * err;
      const sp = baseSp * (.85 + m.rng() * .3), vz = a.kind === 'header' || a.kind === 'divingHeader' ? -40 + m.rng() * 60 : 20 + m.rng() * 40;
      m.kickBall(this, Math.cos(ang) * sp, Math.sin(ang) * sp, vz, 'shot', null);
      this.doAct(a.kind, .4);
      registerShot(m, this, sp, false, a.kind, .7);
      m.emit(a.kind === 'divingHeader' ? 'header' : a.kind, { who: this.id, side });
    }
    this.air = null; this.lift = 0; this.cool = .3;
    if (a.kind === 'divingHeader' || a.kind === 'bicycle') { this.setState('down'); this.downT = .7; } else this.setState('run');
  }

  /* ---- skill moves ---- */
  skill(it) {
    const m = this.m; if (this.skillCd > 0) return;
    const b = this.body, mv = it.move || [0, 0], ml = hyp(mv[0], mv[1]), fx = Math.cos(this.facing), fy = Math.sin(this.facing);
    const fwd = ml > .3 ? (mv[0] * fx + mv[1] * fy) / ml : 0, side = ml > .3 ? (mv[0] * -fy + mv[1] * fx) / ml : 0;
    const foe = m.side[1 - this.side].filter(o => !o.sentOff && o.state !== 'down').map(o => ({ o, d: dist(o.body, b), a: Math.abs(E.angDiff(this.facing, angTo(b, o.body))) })).filter(e => e.a < .9).sort((p, q) => p.d - q.d)[0];
    let kind = it.skillKind;
    if (!kind) {
      if (m.t - this.lastSkillT < .3 && this.lastSkill !== 'rainbow') kind = 'rainbow';
      else if (fwd < -.5) kind = 'spin';
      else if (Math.abs(side) > .5) kind = 'stepover';
      else if (foe && foe.d < 16) kind = 'nutmeg';
      else if (fwd > .5 && (!foe || foe.d > 40)) kind = 'knockon';
      else kind = foe && foe.d < 22 ? 'nutmeg' : 'stepover';
    }
    this.lastSkillT = m.t; this.lastSkill = kind; this.skillCd = .6; this.stamina = Math.max(0, this.stamina - 8);
    const S = { stepover: .35, spin: .45, rainbow: .3, nutmeg: .3, knockon: .15 }[kind];
    this.skillK = { kind, foe: foe && foe.d < (kind === 'rainbow' ? 24 : kind === 'nutmeg' ? 18 : 22) ? foe.o : null, side: sgn(side) || 1, done: false };
    this.setState('skill'); this.doAct(kind, S);
    m.emit('skill', { who: this.id, side: this.side, kind });
  }
  skillStep(dt, it) {
    const m = this.m, b = this.body, k = this.skillK, dur = this.act ? this.act.dur : .3;
    const fx = Math.cos(this.facing), fy = Math.sin(this.facing);
    this.decel(dt, 300);
    if (!k.done && this.stateT >= dur * .5) {
      k.done = true;
      const o = k.foe, skill = this.st.skill, r = m.rng();
      if (k.kind === 'stepover') {
        const ch = clamp(.35 + .5 * (skill - (o ? o.st.tackle : 50)) / 100, .15, .9);
        if (o && r < ch) { o.wrongFoot(.4); m.gain(this.side, 8, 'skill'); m.emit('skillWin', { who: this.id, kind: 'stepover' }); }
        b.vx += -fy * k.side * 90; b.vy += fx * k.side * 90;
      } else if (k.kind === 'nutmeg') {
        const ch = .45 + .4 * skill / 100;
        if (o && r < ch) {
          const ball = m.ball; m.owner = null; ball.vx = fx * 120; ball.vy = fy * 120; ball.to = this; ball.kind = 'nutmeg'; this.cool = .15; m.last = this;
          o.wrongFoot(.5); b.vx += -fy * 70 + fx * 60; b.vy += fx * 70 + fy * 60;
          m.gain(this.side, 12, 'nutmeg'); m.emit('nutmeg', { who: this.id, side: this.side, victim: o.id }); m.emit('skillWin', { who: this.id, kind: 'nutmeg' });
        } else if (o) { m.takeBall(o); m.emit('skillFail', { who: this.id }); }
      } else if (k.kind === 'spin') { m.gain(this.side, 6, 'skill'); this.facing = Math.atan2(-fy, -fx); m.emit('skillWin', { who: this.id, kind: 'spin' }); }
      else if (k.kind === 'rainbow') {
        const ball = m.ball; m.owner = null; ball.vx = fx * 60; ball.vy = fy * 60; ball.vz = 110; ball.onGround = false; ball.to = this; ball.kind = 'rainbow'; m.last = this; this.cool = .2;
        if (o) o.wrongFoot(.6);
        m.gain(this.side, 12, 'rainbow'); m.emit('rainbow', { who: this.id, side: this.side }); m.emit('skillWin', { who: this.id, kind: 'rainbow' });
      } else if (k.kind === 'knockon') {
        const ball = m.ball; m.owner = null; ball.vx = fx * 150; ball.vy = fy * 150; ball.to = this; ball.kind = 'knockon'; m.last = this; this.cool = .2;
        m.gain(this.side, 2, 'skill');
      }
    }
    if (k.kind === 'spin' && !k.done) b.vx = b.vy = 0;
    b.update(dt, m.map);
    if (this.stateT >= dur) { this.setState('run'); if (k.kind !== 'nutmeg' && k.kind !== 'rainbow' && k.kind !== 'knockon' && !m.owner && dist(m.ball, b) < 14) {} }
  }
  wrongFoot(t) { if (this.gk) return; this.setState('stunned'); this.downT = t; this.wrong = t; this.m.emit('wrongFoot', { who: this.id }); }

  /* ---- defending ---- */
  poke() { this.setState('poke'); this.doAct('poke', .25); this.pokeDone = false; this.m.emit('poke', { who: this.id }); }
  pokeStep(dt) {
    const m = this.m, b = this.body; this.decel(dt, 500); b.update(dt, m.map);
    if (!this.pokeDone && this.stateT > .08) {
      this.pokeDone = true;
      const reach = EF.T.tackleReach * (m.euroT[this.side] > 0 ? 1.25 : 1) * (m.buff.tackle[this.side] || 1);
      const toe = { x: b.x + Math.cos(this.facing) * reach, y: b.y + Math.sin(this.facing) * reach }, ball = m.ball, o = m.owner;
      const ballNear = hyp(ball.x - toe.x, ball.y - toe.y) < 6 && ball.z < 8;
      if (ballNear && (!o || o.side !== this.side)) {
        if (o) { m.owner = null; o.stun = .25; this.tackleWon(o, false); }
        m.last = this; m.lastTouch = this.side; ball.vx = Math.cos(this.facing) * 80 + b.vx * .3; ball.vy = Math.sin(this.facing) * 80 + b.vy * .3; ball.to = null; ball.kind = 'tackle';
        this.cool = 0;
      } else if (o && o.side !== this.side && dist(o.body, toe) < 7) {
        m.contact(this, o, { closing: hyp(b.vx - o.body.vx, b.vy - o.body.vy) + 40, kind: 'poke' });
      } else m.emit('tackleFailed', { who: this.id });
    }
    if (this.stateT > .25 + (this.pokeDone ? .15 : 0)) this.setState('run');
  }
  slide(it) {
    const m = this.m, b = this.body, mv = it.move || [0, 0];
    const a = hyp(mv[0], mv[1]) > .2 ? Math.atan2(mv[1], mv[0]) : this.facing; this.facing = a;
    const sp = EF.T.slideSpeed * (m.surface === 'wet' ? 1.25 : 1);
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
    this.setState('slide'); this.doAct('slide', .55); this.slideHit = { ball: false, men: new Set() };
    m.emit('slide', { who: this.id, side: this.side });
  }
  slideStep(dt) {
    const m = this.m, b = this.body, f = Math.exp(-dt * 3); b.vx *= f; b.vy *= f;
    b.update(dt, m.map);
    if (this.stateT < .45) {
      const fx = Math.cos(this.facing), fy = Math.sin(this.facing), tip = { x: b.x + fx * 10, y: b.y + fy * 10 };
      const ball = m.ball, o = m.owner;
      const capsule = p => segDist(p, b, tip);
      if (!this.slideHit.ball && ball.z < 8 && capsule(ball) < 6 && (!o || o.side !== this.side)) {
        this.slideHit.ball = true;
        if (o) { m.owner = null; o.stun = .4; this.tackleWon(o, true); }
        ball.vx = fx * 150; ball.vy = fy * 150; ball.vz = 20; ball.onGround = false; ball.to = null; ball.kind = 'tackle'; m.last = this; m.lastTouch = this.side; this.cool = .3;
      }
      for (const v of m.side[1 - this.side]) {
        if (v.sentOff || v.gk && v.state === 'keeper-hold' || this.slideHit.men.has(v) || !['run', 'skill', 'poke', 'barge', 'stunned'].includes(v.state)) continue;
        if (capsule(v.body) < 8) {
          this.slideHit.men.add(v);
          const closing = hyp(b.vx - v.body.vx, b.vy - v.body.vy) + 60;
          if (this.slideHit.ball) { if (m.rng() < .4) v.knock('stumble'); continue; }
          v.knock('launch', this.facing);
          m.contact(this, v, { closing, kind: 'slide' });
        }
      }
    }
    if (this.stateT >= .6) this.setState('run');
  }
  barge() {
    const b = this.body; b.vx += Math.cos(this.facing) * 60; b.vy += Math.sin(this.facing) * 60;
    this.setState('barge'); this.doAct('barge', .3); this.bargeDone = false; this.m.emit('barge', { who: this.id });
  }
  bargeStep(dt) {
    const m = this.m, b = this.body; this.decel(dt, 200); b.update(dt, m.map);
    if (!this.bargeDone && this.stateT > .08 && this.stateT < .25) {
      const sh = { x: b.x + Math.cos(this.facing) * 6, y: b.y + Math.sin(this.facing) * 6 }, o = m.owner;
      for (const v of m.side[1 - this.side]) {
        if (v.sentOff || v.gk || hyp(v.body.x - sh.x, v.body.y - sh.y) > 9) continue;
        this.bargeDone = true;
        const behind = Math.abs(E.angDiff(v.facing, angTo(v.body, b))) > 2.1;
        if (behind) { m.contact(this, v, { closing: 160, kind: 'barge', behind: true }); v.knock('down'); break; }
        if (this.st.weight + m.rng() * 30 > v.st.weight + m.rng() * 30) {
          v.knock('stumble'); if (o === v) { m.owner = null; const ball = m.ball; ball.vx = Math.cos(this.facing) * 60; ball.vy = Math.sin(this.facing) * 60; ball.to = null; m.last = this; this.tackleWon(v, false); }
          m.emit('bargeWin', { who: this.id, victim: v.id });
        } else { this.knock('stumble'); m.emit('bargeFail', { who: this.id }); }
        break;
      }
    }
    if (this.stateT > .3) this.setState('run');
  }
  tackleWon(victim, slide) {
    const m = this.m; this.tackles++; m.stats[this.side].tackles++;
    m.gain(this.side, slide ? 8 : 6, 'tackle'); m.emit('tackleWon', { who: this.id, side: this.side, victim: victim.id, slide });
  }
  knock(kind, angle) {
    const m = this.m, b = this.body;
    if (this.gk && this.state.startsWith('keeper')) return;
    if (m.owner === this) { m.owner = null; const ball = m.ball; ball.vx = b.vx * .6 + (angle != null ? Math.cos(angle) * 50 : 0); ball.vy = b.vy * .6 + (angle != null ? Math.sin(angle) * 50 : 0); ball.to = null; }
    this.charging = false; this.meter = 0; this.air = null; this.lift = 0;
    this.contactT = m.t;
    if (kind === 'launch') { this.setState('launched'); b.vz = 120; b.onGround = false; b.z = Math.max(b.z, 1); if (angle != null) { b.vx = Math.cos(angle) * 70; b.vy = Math.sin(angle) * 70; } m.emit('launch', { who: this.id, x: b.x, y: b.y }); }
    else if (kind === 'down') { this.setState('down'); this.downT = .8 + m.rng() * .6; m.emit('knockdown', { who: this.id, x: b.x, y: b.y, kind }); }
    else { this.setState('stunned'); this.downT = .4; }
  }
  theatrics() {
    const m = this.m; this.setState('dive'); this.diveJudged = false; this.doAct('dive', 1.2);
    const b = this.body; b.vx = Math.cos(this.facing) * 90; b.vy = Math.sin(this.facing) * 90; b.vz = 60; b.onGround = false;
    if (m.owner === this) { m.owner = null; m.ball.vx = b.vx * .5; m.ball.vy = b.vy * .5; m.ball.to = null; }
    m.emit('dive', { who: this.id, side: this.side });
  }
  diveStep(dt) {
    const m = this.m, b = this.body; if (b.onGround) this.decel(dt, 260); b.update(dt, m.map);
    if (!this.diveJudged && this.stateT > .3) { this.diveJudged = true; judgeDive(m, this); }
    if (this.stateT >= 1.2) { this.setState('getup'); }
  }
  offStep(dt) {
    const b = this.body;
    if (this.state !== 'off') return;
    if (this.stateT < 6) { this.goTo(P.CX + 20, P.Y1 + 30, 50, dt); this.stateT += 0; }
    if (hyp(b.x - P.CX - 20, b.y - P.Y1 - 30) < 8) { b.x = -9999; b.y = -9999; this.state = 'gone'; }
  }
}
EF.Footballer = Footballer;
function nearestFoe(m, f, side) { let d = 999; for (const o of m.side[1 - side]) if (!o.sentOff) d = Math.min(d, dist(o.body, f.body)); return d; }
EF.nearestFoe = nearestFoe;
/** where the ball will be: a quick integration (gravity, bounces, rolling, curl) for t seconds, sampled every step */
function predictBall(m, T = .6, step = 1 / 60) {
  const b = m.ball, out = []; let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, spin = b.spin || 0;
  const g = b.gravity || EF.T.ballGravity, [fr] = m.surfaceAt(x, y);
  for (let t = step; t <= T + 1e-6; t += step) {
    const sp = hyp(vx, vy); if (spin && sp > 20) { const k = spin * step, ovx = vx; vx += -vy * k; vy += ovx * k; spin *= Math.exp(-step * 1.4); }
    if (z <= .5 && vz <= 0) { const f = Math.exp(-step * EF.T.ballFriction * fr); vx *= f; vy *= f; }
    x += vx * step; y += vy * step; vz -= g * step; z += vz * step;
    if (z < 0) { z = 0; vz = Math.abs(vz) > 30 ? -vz * (b.bounce || .55) : 0; }
    out.push({ t, x, y, z });
  }
  return out;
}
EF.predictBall = predictBall;
/** the air-ball window: a point on the ball's coming path a footballer can reach, with the ball between 4 and 40 high */
function airWindow(f) {
  const m = f.m, b = m.ball;
  if (m.owner || b.superPath || (b.z < 4 && b.vz < 40)) return null;
  if (f.state !== 'run' || f.gk) return null;
  const path = predictBall(m, .6, 1 / 30), sp = f.speed() * 1.2;
  for (const p of path) {
    if (p.z < 4 || p.z > 40) continue;
    const d = hyp(p.x - f.body.x, p.y - f.body.y);
    if (d <= 10 + p.t * sp && d < 46) return p;
  }
  return null;
}
EF.airWindow = airWindow;
/** a shot: the keeper reads it, stats count it, the crowd leans in */
function registerShot(m, f, sp, sweet, kind, p) {
  const side = f.side, gx = m.goalX(side), path = predictBall(m, 1.6, 1 / 60);
  let cross = null;
  for (const q of path) if ((gx > P.CX ? q.x >= gx : q.x <= gx)) { cross = q; break; }
  const onTarget = !!cross && Math.abs(cross.y - P.CY) < P.GH - 2 && cross.z < P.BAR - 1;
  f.shots++; m.stats[side].shots++; if (onTarget) m.stats[side].onTarget++;
  m.shot = { by: f, side, t0: m.t, kind, speed: sp, sweet, onTarget, cross, done: false, read: false };
  m.emit('shot', { side, who: f.id, power: p, sweet, kind, onTarget, speed: sp });
  if (onTarget) { m.gain(side, 5 + (sweet ? 4 : 0), 'onTarget'); m.emit('onTarget', { side, who: f.id }); }
  if (sweet) m.emit('screamer', { side, who: f.id });
  const k = m.keeper[1 - side]; if (k) keeperRead(k, m.shot);
}
EF.registerShot = registerShot;


/* ===== 13-keeper.js ===== */
/* 13-keeper: positioning on the angle's bisector, reading shots after a reaction time, dives that reach or don't,
 * catches, parries and tips, smothering, claiming crosses, holding and distributing. */
function keeperStep(k, dt, it, live) {
  const m = k.m, b = k.body, gx = m.ownGoalX(k.side), into = gx === P.X0 ? 1 : -1, ball = m.ball;
  if ((b.x - gx) * into < 3 && Math.abs(b.y - P.CY) < P.GH + 8) b.x = gx + into * 3;   // never behind his own line
  if (['down', 'getup', 'launched', 'stunned'].includes(k.state)) return false;
  if (m.mode === 'shootout' || (m.sp && m.sp.kind === 'penalty' && m.sp.keeper === k)) { keeperPenaltyStep(k, dt); return true; }
  if (k.state === 'keeper-dive') {
    const d = k.dive; d.t += dt;
    const u = Math.min(1, d.t / d.dur);
    b.vx = approach(b.vx, 0, 400 * dt); b.vy = d.vy * (1 - u);
    if (d.high) { b.z = Math.sin(Math.min(1, u * 1.3) * PI) * d.high; }
    k.flip = 0; k.tiltSide = d.side; k.diveU = u;
    b.update(dt, m.map);
    if (d.t >= (d.until || d.dur + .25)) { k.diveU = 0; b.z = 0; if (m.owner === k) k.setState('keeper-hold'); else { k.setState('down'); k.downT = .45; } }
    keeperShotResolve(k);
    return true;
  }
  if (k.state === 'keeper-hold') {
    b.vx = approach(b.vx, 0, 500 * dt); b.vy = approach(b.vy, 0, 500 * dt); b.update(dt, m.map);
    k.facing = into > 0 ? 0 : PI;
    if (m.owner !== k) { k.setState('run'); return true; }
    if (m.mode !== 'play') return true;
    k.holdT = (k.holdT || 0) + dt;
    const human = m.humanSide(k.side) && !m.o.attract;
    let kind = null;
    if (human) { const sl = m.slots.find(s => s.side === k.side && s.ctl); const hi = sl && sl.ctl && sl.ctl.peek ? sl.ctl.peek(m, sl) : null; if (hi && hi.pass) kind = 'throw'; else if (hi && hi.shoot) kind = 'long'; }
    if (!kind && k.holdT > (human ? 2 : 1.1 + m.rng() * .6)) kind = keeperChoice(k);
    if (kind) keeperDistribute(k, kind);
    return true;
  }
  if (!live && m.mode !== 'play') { k.decel(dt, 500); b.update(dt, m.map); return true; }
  // ---- positioning ----
  k.read && keeperReadStep(k, dt);
  if (k.state === 'keeper-dive') return true;
  const gc = { x: gx, y: P.CY }, bd = dist(ball, gc), carrier = m.owner && m.owner.side !== k.side ? m.owner : null;
  let tx, ty, speed = 110;
  const ang = Math.atan2(ball.y - P.CY, (ball.x - gx) * into), depth = clamp(8 + (400 - bd) * .06, 6, 36);
  tx = gx + into * Math.cos(ang) * depth; ty = clamp(P.CY + Math.sin(ang) * depth * 1.3, P.CY - P.GH - 4, P.CY + P.GH + 4);
  // rush a carrier through on goal
  if (carrier && dist(carrier.body, gc) < 120 && !m.side[k.side].some(p => p !== k && !p.sentOff && segDist(p.body, carrier.body, gc) < 10)) {
    tx = carrier.body.x; ty = carrier.body.y; speed = 140;
    if (dist(carrier.body, b) < 12 && k.cool <= 0) keeperSmother(k, carrier);
  }
  // a loose ball in the box: go and get it
  const loose = !m.owner && !ball.superPath && P.inBox(-into, ball.x, ball.y) && hyp(ball.vx, ball.vy) < 200;
  if (loose && (!m.shot || m.shot.done)) {
    const nearest = m.players.filter(p => !p.sentOff && p !== k).reduce((a, p) => Math.min(a, dist(p.body, ball)), 999);
    if (dist(b, ball) < nearest + 20) { tx = ball.x; ty = ball.y; speed = 130; }
  }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy), sp = Math.min(speed * (m.euroT[k.side] > 0 ? 1.1 : 1), d * 5);
  b.vx = approach(b.vx, d > 1 ? dx / d * sp : 0, 800 * dt); b.vy = approach(b.vy, d > 1 ? dy / d * sp : 0, 800 * dt);
  k.face(Math.atan2(ball.y - b.y, ball.x - b.x), dt, 10);
  b.update(dt, m.map);
  k.set = bd < 200;
  keeperShotResolve(k);
  // catch what comes to him: loose and slow in his box, or a cross he can claim
  if (!m.owner && !ball.superPath && m.mode === 'play' && k.cool <= 0 && P.inBox(-into, b.x, b.y)) {
    const bdist = hyp(ball.x - b.x, ball.y - b.y), sp2 = hyp(ball.vx, ball.vy);
    const reachZ = 34 * (k.data.size || 1);
    if (bdist < 10 && ball.z < reachZ && (sp2 < 190 || ball.z > 10) && (!m.shot || m.shot.done || m.shot.outcome === 'catch')) keeperCatch(k, 'claim');
  }
  return true;
}
function keeperChoice(k) {
  const m = k.m, tac = EF.get('tactic', m.teams[k.side].tactic);
  if (tac && tac.gimmick === 'routeone') return 'long';
  const open = m.side[k.side].filter(p => p !== k && !p.sentOff && dist(p.body, k.body) < 200 && nearestFoe(m, p, k.side) > 30);
  return open.length ? 'throw' : 'long';
}
function keeperDistribute(k, kind) {
  const m = k.m, b = k.body, ball = m.ball, gx0 = m.ownGoalX(k.side), in0 = gx0 === P.X0 ? 1 : -1;
  if ((b.x - gx0) * in0 < 8) b.x = gx0 + in0 * 8;
  const mates = m.side[k.side].filter(p => p !== k && !p.sentOff);
  let tgt;
  if (kind === 'throw') tgt = mates.slice().sort((p, q) => (dist(p.body, b) - nearestFoe(m, p, k.side) * 2) - (dist(q.body, b) - nearestFoe(m, q, k.side) * 2))[0];
  else tgt = mates.slice().sort((p, q) => (q.body.x - p.body.x) * k.dir)[0];
  if (!tgt) return;
  k.holdT = 0; k.setState('run'); m.owner = null;
  ball.x = b.x + k.dir * 6; ball.y = b.y; ball.z = kind === 'throw' ? 14 : 2;
  const tx = tgt.body.x + tgt.body.vx * .5, ty = tgt.body.y + tgt.body.vy * .5;
  const v = E.arc({ x: ball.x, y: ball.y, z: ball.z }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: kind === 'throw' ? (dist(tgt.body, b) < 120 ? 16 : 30) : 70 });
  m.kickBall(k, v.vx, v.vy, v.vz, kind === 'throw' ? 'pass' : 'lob', tgt);
  k.doAct(kind === 'throw' ? 'throw' : 'shotHard', .45); k.cool = .5;
  m.emit('distribute', { who: k.id, kind });
}
function keeperCatch(k, why) {
  const m = k.m; m.owner = k; m.last = k; m.lastTouch = k.side; m.ball.to = null; m.ball.kind = null; m.ball.spin = 0;
  k.setState('keeper-hold'); k.holdT = 0; k.cool = .4;
  if (m.shot) m.shot.done = true;
  m.chain[k.side] = 0; m.chain[1 - k.side] = 0;
  m.emit('catch', { who: k.id, side: k.side, why });
}
function keeperSmother(k, carrier) {
  const m = k.m; k.cool = .8;
  const win = m.rng() < .35 + k.st.keep / 100 * .45;
  k.dive = { t: 0, dur: .3, vy: 0, side: 0, high: 0 }; k.setState('keeper-dive'); k.doAct('smother', .5);
  if (win) { m.owner = null; keeperCatch(k, 'smother'); k.setState('keeper-dive'); m.emit('save', { who: k.id, side: k.side, kind: 'smother' }); m.gain(k.side, 6, 'save'); }
  m.emit('smother', { who: k.id, win });
}
/** a shot is coming: after his reaction time he decides where to go and how it ends */
function keeperRead(k, shot) {
  if (!shot || shot.kind === 'super') return;
  const m = k.m, cpu = m.isCpuSide(k.side);
  const base = (cpu ? m.diff.keeper / .19 : 1) * EF.T.keeperReaction, stat = 1.4 - .8 * k.st.keep / 100;
  k.read = { shot, wait: base * stat * (shot.sweet ? 1.3 : 1), t: 0 };
}
function keeperReadStep(k, dt) {
  const r = k.read, m = k.m, s = r.shot;
  if (s.done || m.shot !== s) { k.read = null; return; }
  r.t += dt; if (r.t < r.wait) return;
  k.read = null;
  // where does it cross? (predicted again now, with any curl)
  const gx = m.ownGoalX(k.side), path = predictBall(m, 1.4, 1 / 60);
  let cross = null; for (const q of path) if ((gx > P.CX ? q.x >= gx - 2 : q.x <= gx + 2)) { cross = q; break; }
  if (!cross) { s.outcome = 'miss'; return; }
  const onT = Math.abs(cross.y - P.CY) < P.GH + 2 && cross.z < P.BAR + 2;
  const b = k.body, need = cross.y - b.y, needZ = cross.z;
  const boss = k.data.boss ? 1.4 : 1, euro = m.euroT[k.side] > 0 ? 1.3 : 1, inv = m.cheats['keeper' + k.side];
  const tAvail = Math.max(.05, cross.t);
  const reach = EF.T.keeperReach * Math.min(1, tAvail / .35) * boss * euro + 12 * (k.data.size || 1);
  const reachable = Math.abs(need) <= reach && needZ < 44 * (k.data.size || 1);
  const sp = s.speed || 250;
  const q = reachable ? (1 - Math.abs(need) / reach) * .6 + .4 : 0;
  const speedF = Math.max(.2, 1 - (sp - 200) / 400);
  let score = q * speedF * (k.st.keep / 100) * 1.7 * (s.sweet ? .75 : 1) + (m.rng() - .5) * .3;
  if (k.data.boss && sp < 300) score += .4;
  let outcome;
  if (m.forceGoal && onT) outcome = 'goal';
  else if (inv) outcome = 'catch';
  else if (!onT) outcome = 'miss';
  else if (!reachable) outcome = 'goal';
  else if (score > .62 && sp < 300) outcome = 'catch';
  else if (score > .3) outcome = needZ > 24 || Math.abs(cross.y - P.CY) > P.GH - 12 ? 'tip' : 'parry';
  else outcome = 'goal';
  s.outcome = outcome; s.cross = cross; s.keeper = k;
  if (Math.abs(need) > 10 || needZ > 26) {
    const dur = .35, high = needZ > 20 ? Math.min(14, needZ * .35) : 2;
    const vy = (outcome === 'goal' ? need * .75 : need) / dur * 1.4;
    k.dive = { t: 0, dur, vy, side: sgn(need) || 1, high, until: Math.max(dur + .25, cross.t + .2) }; k.setState('keeper-dive'); k.doAct(high > 6 ? 'diveHigh' : 'diveLow', dur + .25);
    m.emit('keeperDive', { who: k.id, side: sgn(need), high: high > 6 });
  } else if (outcome !== 'miss') { k.dive = { t: 0, dur: .2, vy: 0, side: 0, high: 0, until: Math.max(.45, cross.t + .2) }; k.setState('keeper-dive'); k.doAct('catch', .4); }
}
/** the ball reaches him: catch, parry or tip, as he read it */
function keeperShotResolve(k) {
  const m = k.m, s = m.shot; if (!s || s.done || s.keeper !== k || !s.outcome || m.owner) return;
  const ball = m.ball, gx = m.ownGoalX(k.side), into = gx === P.X0 ? 1 : -1;
  const reached = (ball.x - k.body.x) * into <= 4 && Math.abs(ball.y - k.body.y) < 30;
  if (!reached) return;
  if (s.outcome === 'goal' || s.outcome === 'miss') { s.done = true; return; }
  s.done = true; k.saves++;
  m.gain(k.side, s.sweet ? 10 : 6, 'save');
  if (s.outcome === 'catch') { keeperCatch(k, 'save'); m.emit('save', { who: k.id, side: k.side, kind: 'catch', from: s.by && s.by.id }); return; }
  m.last = k; m.lastTouch = k.side; ball.spin = 0; ball.to = null; ball.kind = 'save';
  if (s.outcome === 'parry' && m.rng() < .5) s.outcome = 'tip';   // (turned round the post: a corner)
  if (s.outcome === 'parry') {
    const sp = hyp(ball.vx, ball.vy) * (.4 + m.rng() * .2), away = sgn(ball.y - P.CY) || (m.rng() < .5 ? -1 : 1), a = Math.atan2(away * .8, into);
    ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.vz = 40 + m.rng() * 40; ball.onGround = false;
    m.emit('save', { who: k.id, side: k.side, kind: 'parry', from: s.by && s.by.id }); m.emit('parry', { who: k.id });
  } else {
    if ((s.cross && s.cross.z > 24)) { ball.vz = 150; ball.vx *= .35; ball.vy *= .5; }
    else { ball.vy = (sgn(ball.y - P.CY) || 1) * 230; ball.vx *= .22; ball.vz = Math.max(ball.vz, 30); }
    ball.onGround = false;
    m.emit('save', { who: k.id, side: k.side, kind: 'tip', from: s.by && s.by.id }); m.emit('tip', { who: k.id });
  }
}


/* ===== 14-ai.js ===== */
/* 14-ai: TeamBrain, one per side: the phase (attack, defend, transition, loose), formation spots from the role specs and
 * the tactic, pressing, marking, runs, the ball carrier's choice by utility, air balls, gimmicks (the bus, gegenpressing,
 * keep-ball, route one) and when to trigger Europhoria. Bots produce Intents exactly as a player's buttons would. */
const btn = on => on ? { pressed: true, down: true } : {};
class TeamBrain {
  constructor(m, side) {
    this.m = m; this.side = side; this.tac = Object.assign({ press: .5, pressers: 1, line: .5, width: .8, tempo: .7, passRisk: .5, shortBias: .7, longBall: .2, dribble: .4, skill: .3, shootRange: 190, shootBias: 1, foul: .2, dive: .1, gimmick: null }, EF.get('tactic', m.teams[side].tactic) || {});
    this.phase = 'loose'; this.phaseT = 0; this.lostT = -9; this.had = false;
  }
  get dir() { return this.m.dir(this.side); }
  update(dt, intents) {
    const m = this.m, s = this.side, own = m.owner;
    const ph = !own ? 'loose' : own.side === s ? 'attack' : 'defend';
    if (ph !== this.phase) { if (this.phase === 'attack' && ph !== 'attack') this.lostT = m.t; this.phase = ph; this.phaseT = 0; } else this.phaseT += dt;
    this.gimmicks();
    // Europhoria: full and the ball in the attacking half (or ours)
    if (m.euph[s] >= 100 && m.euroT[s] <= 0 && m.isCpuSide(s) && !m.cheats.pure) {
      const u = P.toUV(this.dir, m.ball.x, m.ball.y)[0];
      if ((own && own.side === s && u > .45) || m.o.attract) m.triggerEurophoria(s);
    }
    const ballUV = P.toUV(this.dir, m.ball.x, m.ball.y);
    // the chasers of a loose ball, the pressers of a carrier
    const out = m.side[s].filter(f => !f.gk && !f.sentOff);
    const free = out.filter(f => !intents.has(f));
    const humanF = out.filter(f => intents.has(f));
    const target = this.ballTarget();
    const byBall = out.slice().sort((a, b) => dist(a.body, target) - dist(b.body, target));
    const gegen = this.tac.gimmick === 'gegenpress' && m.t - this.lostT < 3;
    const nPress = gegen ? 3 : this.tac.pressers || 1;
    const pressZone = ballUV[0] < this.tac.press + .35 || gegen || P.inBox(-this.dir, m.ball.x, m.ball.y);
    const chasers = new Set(byBall.filter(f => !intents.has(f) || true).slice(0, ph === 'loose' ? (dist(byBall[0].body, target) < 30 ? 1 : 2) : nPress));
    for (const f of free) {
      if (f.state !== 'run') { f.botIntent = NO_INTENT; continue; }
      const di = s === 1 && m.o.training && EF.dummyIntent ? EF.dummyIntent(m, f) : null; if (di) { f.botIntent = di; continue; }
      f.botIntent = this.think(f, dt, { ph, ballUV, chase: chasers.has(f) && !humanF.includes(f), pressZone, target });
    }
  }
  /** where the ball is going: its spot in 0.3 s, or where the receiver will take it */
  ballTarget() {
    const m = this.m, b = m.ball;
    if (m.owner) return { x: m.owner.body.x + m.owner.body.vx * .25, y: m.owner.body.y + m.owner.body.vy * .25 };
    const p = predictBall(m, .5, 1 / 20); for (const q of p) if (q.z < 10 && q.t > .25) return q;
    return p[p.length - 1] || b;
  }
  spot(f, ph, ballUV) {
    const sp = f.spec, t = this.tac, att = ph === 'attack';
    const base = sp.base || [.4, .5], d = att ? (sp.att || [0, 0]) : (sp.def || [0, 0]), pull = sp.pull || [.5, .5], ur = sp.uRange || [.1, .9];
    let u = base[0] + d[0] + pull[0] * (ballUV[0] - .5), v = base[1] + d[1] + pull[1] * (ballUV[1] - .5);
    if (f.role.startsWith('DEF')) u += (t.line - .5) * .2;
    u = clamp(u, ur[0], ur[1]); v = clamp(.5 + (v - .5) * (t.width || .8), .06, .94);
    return P.toWorld(this.dir, u, v);
  }
  think(f, dt, c) {
    const m = this.m, b = f.body, ball = m.ball, s = this.side, it = { bot: true, move: [0, 0], sprint: false, pass: {}, shoot: {}, lob: {}, through: {}, skill: {}, dive: {}, sw: {} };
    const goTo = (x, y, sprint, stop = 4) => { const dx = x - b.x, dy = y - b.y, d = hyp(dx, dy); if (d > stop) { const k = Math.min(1, d / 30); it.move = [dx / d * k, dy / d * k]; } it.sprint = sprint && d > 30; };
    // a run he was asked to make (a through ball, a one-two, a cross)
    if (f.runTo && f.runTo.t > 0 && m.owner !== f) { f.runTo.t -= dt; goTo(f.runTo.x, f.runTo.y, true, 3); if (ball.to === f || !m.owner) this.airTry(f, it); return it; }
    if (m.owner === f) return this.carrier(f, dt, it);
    if (!m.owner) {
      if (ball.to === f || c.chase) { const t = ball.to === f ? this.ballTarget() : c.target; goTo(t.x, t.y, true, 1); this.airTry(f, it); return it; }
      const [x, y] = this.spot(f, m.last && m.last.side === s ? 'attack' : 'defend', c.ballUV); goTo(x, y, false, 6); this.airTry(f, it);
      return it;
    }
    if (m.owner.side === s) {
      // support: the formation's attacking spot, with the far forward running in behind
      let [x, y] = this.spot(f, 'attack', c.ballUV);
      if (f.role.startsWith('FWD') && m.owner.body.x * this.dir < x * this.dir) { const a = nearestFoe(m, f, s); if (a > 30) x += this.dir * 20; }
      // stay out of the carrier's way
      if (dist({ x, y }, m.owner.body) < 40) y += y < m.owner.body.y ? -30 : 30;
      goTo(x, y, dist({ x, y }, b) > 80, 6);
      if (m.owner.gk && m.owner.state === 'keeper-hold') it.sprint = false;
      return it;
    }
    // defending
    const carrier = m.owner;
    if (carrier.gk && carrier.state === 'keeper-hold') { const [x, y] = this.spot(f, 'defend', c.ballUV); const dk = dist({ x, y }, carrier.body); goTo(dk < 60 ? x + this.dir * -40 : x, y, false, 6); return it; }
    if (c.chase && c.pressZone) {
      const cb = carrier.body, lead = { x: cb.x + cb.vx * .2, y: cb.y + cb.vy * .2 };
      const ownG = { x: m.ownGoalX(s), y: P.CY }, ga = angTo(lead, ownG);
      const d = dist(b, cb);
      const tx = d > 20 ? lead.x + Math.cos(ga) * 6 : lead.x, ty = d > 20 ? lead.y + Math.sin(ga) * 6 : lead.y;
      goTo(tx, ty, d > 40, 1);
      it.faceTo = angTo(b, cb);
      const agg = m.diff.agg * (EF.T.aiAggression / .5) * (.6 + this.tac.press * .8) * (m.o.attract ? 1.4 : 1);
      const front = Math.abs(E.angDiff(f.facing, angTo(b, cb))) < .8, behind = Math.abs(E.angDiff(carrier.facing, angTo(cb, b))) > 2.1;
      if (d < EF.T.tackleReach + 6 && front && f.cool <= 0 && m.rng() < agg * 3 * dt) it.pass = btn(true);
      else if (d < 30 && d > 10 && f.cool <= 0 && (!behind || m.rng() < this.tac.foul + f.st.temper / 300) && m.rng() < agg * .8 * dt * (.5 + this.tac.foul)) { it.shoot = btn(true); it.move = [Math.cos(angTo(b, lead)), Math.sin(angTo(b, lead))]; }
      else if (d < 10 && !front && m.rng() < agg * dt) it.lob = btn(true);
      return it;
    }
    // mark the opponent nearest the spot, goal side, in the lane to the ball
    const [sx, sy] = this.spot(f, 'defend', c.ballUV);
    const opp = m.side[1 - s].filter(o => !o.gk && !o.sentOff && o !== carrier).sort((p, q) => hyp(p.body.x - sx, p.body.y - sy) - hyp(q.body.x - sx, q.body.y - sy))[0];
    let tx = sx, ty = sy;
    if (opp && hyp(opp.body.x - sx, opp.body.y - sy) < 120) { const mx = lerp(opp.body.x, ball.x, .35), my = lerp(opp.body.y, ball.y, .35); tx = lerp(sx, mx, .6); ty = lerp(sy, my, .6); }
    goTo(tx, ty, dist({ x: tx, y: ty }, b) > 60, 5);
    it.faceTo = angTo(b, ball);
    // intercept a pass coming through
    if (ball.to && ball.to.side !== s && segDist(b, ball, ball.to.body) < 30) { const t = this.ballTarget(); goTo(t.x, t.y, true, 1); }
    return it;
  }
  /** an attacker in the box meets a ball in the air; a defender heads it clear */
  airTry(f, it) {
    const m = this.m, b = m.ball;
    if (b.z < 5 && b.vz < 30) return;
    const u = P.toUV(this.dir, f.body.x, f.body.y)[0];
    if (hyp(b.x - f.body.x, b.y - f.body.y) > 50) return;
    const w = airWindow(f); if (!w) return;
    if (u > .7 && m.rng() < .5) { it.airTry = true; it.airMode = 'shoot'; it.aimY = (m.rng() - .5) * 1.6; }
    else if (u < .35 && m.rng() < .4) { it.airTry = true; it.airMode = 'clear'; }
  }
  /** the ball carrier: shoot, pass, through ball, lob or cross, dribble, a skill move or a dive, by utility */
  carrier(f, dt, it) {
    const m = this.m, b = f.body, s = this.side, t = this.tac, dir = this.dir, gx = m.goalX(s), g = { x: gx, y: P.CY };
    const plan = f.plan;
    if (plan && m.t < plan.until) return this.followPlan(f, plan, it);
    const react = EF.T.aiReaction * (m.diff.react / .25) * (m.o.attract ? .5 : 1) / (t.tempo + .3);
    const dg = dist(b, g), acc = EF.T.aiAccuracy * (m.diff.acc / .8);
    const noise = () => gauss(m.rng) * (1 - Math.min(1, acc)) * .3;
    const foes = m.side[1 - s].filter(o => !o.sentOff);
    const opts = [];
    // shoot
    const range = (t.shootRange || 190) * 1.2 * (m.euroT[s] > 0 ? 1.3 : 1);
    if (dg < range) {
      const a1 = Math.atan2(P.CY - P.GH - b.y, gx - b.x), a2 = Math.atan2(P.CY + P.GH - b.y, gx - b.x), open = clamp(Math.abs(E.angDiff(a1, a2)) / .7, 0, 1);
      const blockers = foes.filter(o => !o.gk && segDist(o.body, b, g) < 12).length;
      let v = (1 - dg / range) * (.4 + .6 * open) * (1 - .3 * blockers) * (t.shootBias || 1) * (m.euroT[s] > 0 ? 1.5 : 1) * 2.1;
      if (t.gimmick === 'keepball' && m.chain[s] < 4) v *= .3;
      if (m.bus && m.bus.on && m.bus.side !== s) v *= .6;
      opts.push({ k: 'shoot', v: v + noise() });
    }
    // passes
    for (const r of m.side[s]) {
      if (r === f || r.sentOff || r.state === 'off') continue;
      const d = dist(r.body, b); if (d < 24 || d > 420) continue;
      const laneD = foes.reduce((a, o) => Math.min(a, segDist(o.body, b, r.body)), 99), lane = clamp((laneD - 9) / 16, 0, 1);
      const open = Math.min(1, nearestFoe(m, r, s) / 40), progress = clamp(((r.body.x - b.x) * dir) / 220 + .5, 0, 1);
      const short = d < 150;
      let v = lane * open * (.4 + .6 * progress) * (short ? t.shortBias || .7 : .7) * (1 - (1 - lane) * (1 - t.passRisk)) * .9;
      if (r.gk) v *= f.pressure() ? .5 : .15;
      if (t.gimmick === 'keepball' && f.pressure() && progress < .5) v *= 2;
      if (lane < .4 && d > 60 && !r.gk && open > .6) opts.push({ k: 'lob', r, v: open * (.3 + .5 * progress) * (t.longBall + .25) * .65 + noise() });
      opts.push({ k: 'pass', r, v: v + noise() });
      if (r.role.startsWith('FWD') && progress > .6 && d > 80) { const sp = nearestFoe(m, r, s); if (sp > 40) opts.push({ k: 'through', r, v: clamp((sp - 30) / 50, 0, 1) * .5 * t.tempo + noise() }); }
    }
    // route one: hoof it to the striker
    if (t.gimmick === 'routeone') { const st = m.side[s].filter(r => r.role.startsWith('FWD') && r !== f).sort((a, c) => (c.body.x - a.body.x) * dir)[0]; if (st) opts.push({ k: 'lob', r: st, v: .45 * t.longBall + .2 + noise() }); }
    // a cross from wide in the final third
    const uv = P.toUV(dir, b.x, b.y);
    if (uv[0] > .7 && Math.abs(b.y - P.CY) > 140) opts.push({ k: 'cross', v: .5 + t.longBall * .4 + noise() });
    // dribble into space
    const ahead = foes.filter(o => (o.body.x - b.x) * dir > -4 && dist(o.body, b) < 90).reduce((a, o) => Math.min(a, dist(o.body, b)), 90);
    opts.push({ k: 'dribble', v: ahead / 80 * (t.dribble + .3) * .9 + noise() });
    const front = foes.filter(o => !o.gk && dist(o.body, b) < 20 && Math.abs(E.angDiff(f.facing, angTo(b, o.body))) < .9)[0];
    if (front && f.skillCd <= 0) opts.push({ k: 'skill', v: (t.skill + .1) * f.st.skill / 100 * .9 + noise() });
    if (front && P.inBox(dir, b.x, b.y) && t.dive > 0) opts.push({ k: 'dive', v: t.dive * f.st.temper / 100 * .6 + noise() });
    opts.sort((a, c) => c.v - a.v);
    const pick = opts[0] || { k: 'dribble' };
    f.plan = Object.assign({ until: m.t + react * (.7 + m.rng() * .6), t0: m.t }, pick);
    if (pick.k === 'shoot') { f.plan.power = m.euroT[s] > 0 && !m.superUsed[s] ? .96 : clamp(.5 + dg / 500 + m.rng() * .25, .4, .9); f.plan.aimY = (m.rng() < .5 ? -1 : 1) * (.45 + m.rng() * .45); f.plan.until = m.t + 2; }
    return this.followPlan(f, f.plan, it);
  }
  followPlan(f, p, it) {
    const m = this.m, b = f.body, s = this.side, dir = this.dir, gx = m.goalX(s);
    const toGoal = Math.atan2(P.CY - b.y, gx - b.x);
    let a = toGoal;
    // dribble round the nearest foe ahead
    const foe = m.side[1 - s].filter(o => !o.sentOff && !o.gk && dist(o.body, b) < 40 && Math.abs(E.angDiff(toGoal, angTo(b, o.body))) < 1).sort((p1, q) => dist(p1.body, b) - dist(q.body, b))[0];
    if (foe) a += E.angDiff(angTo(b, foe.body), toGoal) > 0 ? -.9 : .9;
    if (Math.abs(b.y - P.CY) > P.W / 2 - 20) a = E.lerpAngle ? E.lerpAngle(a, toGoal, .5) : a;
    it.move = [Math.cos(a), Math.sin(a)]; it.sprint = !foe || dist(foe.body, b) > 25;
    if (f.cool > 0) return it;
    switch (p.k) {
      case 'shoot':
        it.move = [Math.cos(toGoal), Math.sin(toGoal)]; it.sprint = false;
        it.shoot = { down: true }; it.power = p.power; it.aimY = p.aimY; it.assist = 'off';
        if (f.meter >= p.power) { it.shoot = { down: false, released: true }; f.plan = null; }
        break;
      case 'pass': it.pass = btn(true); it.passTo = p.r.id; f.plan = null; it.assist = 'high'; break;
      case 'through': it.through = btn(true); it.passTo = p.r.id; f.plan = null; break;
      case 'lob': it.lob = btn(true); it.passTo = p.r ? p.r.id : null; f.plan = null; break;
      case 'cross': it.lob = btn(true); f.plan = null; break;
      case 'skill': it.skill = btn(true); f.plan = null; break;
      case 'dive': it.dive = btn(true); f.plan = null; break;
    }
    if (it.passTo != null) { const r = m.players.find(q => q.id === it.passTo); if (r) it.aim = [r.body.x - b.x, r.body.y - b.y]; }
    return it;
  }
  gimmicks() {
    const m = this.m, s = this.side;
    if (this.tac.gimmick === 'catenaccio' && !m.cheats.pure && !m.o.training) {
      const leading = m.score[s] > m.score[1 - s];
      if (leading && m.minute >= 60 && m.half >= 2 && !m.bus) {
        const gx = m.ownGoalX(s), into = gx === P.X0 ? 1 : -1, x0 = into > 0 ? gx + 6 : gx - 24;
        m.bus = { side: s, on: true, x0, x1: x0 + 18, y0: P.CY - 30, y1: P.CY + 30, t: m.t };
        m.emit('bus', { side: s });
      }
      if (m.bus && m.bus.on && !leading) { m.bus.on = false; m.emit('busGone', { side: s }); }
    }
  }
}
EF.TeamBrain = TeamBrain;


/* ===== 16-referee.js ===== */
/* 16-referee: the referee on the pitch (he follows play, the ball can knock him over), foul judgement by severity,
 * advantage, cards (a second yellow is a red), sending off, theatrics judgement and the VAR check. */
function refStep(m, dt) {
  let o = m.official;
  if (!o) {
    o = m.official = { body: new E.Body({ x: P.CX - 40, y: P.CY + 60, r: 4, friction: 0, gravity: 700 }), facing: -PI / 2, sig: null, sigT: 0, downT: 0 };
  }
  const b = o.body, ball = m.ball;
  o.sigT = Math.max(0, o.sigT - dt); if (o.sigT <= 0) o.sig = null;
  if (o.downT > 0) { o.downT -= dt; b.vx = approach(b.vx, 0, 300 * dt); b.vy = approach(b.vy, 0, 300 * dt); b.update(dt, m.map); return; }
  let tx, ty;
  if (m.mode === 'var') { tx = P.CX; ty = P.Y1 - 10; }
  else if (m.foulSpot && m.mode === 'dead') { tx = m.foulSpot.x - 20; ty = m.foulSpot.y + 16; }
  else {
    const s = m.owner ? m.dir(m.owner.side) : (m.last ? m.dir(m.last.side) : 1);
    tx = ball.x - s * 50; ty = ball.y + (ball.y < P.CY ? 60 : -60);
  }
  [tx, ty] = P.clampField(tx, ty, 10);
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy), sp = Math.min(105, d * 3);
  b.vx = approach(b.vx, d > 2 ? dx / d * sp : 0, 500 * dt); b.vy = approach(b.vy, d > 2 ? dy / d * sp : 0, 500 * dt);
  o.facing = E.approachAng(o.facing, Math.atan2(ball.y - b.y, ball.x - b.x), dt * 6);
  b.update(dt, m.map);
  // the ball hits him: he goes over
  if (!m.owner && m.mode === 'play' && !ball.superPath && ball.z < 22 && hyp(ball.x - b.x, ball.y - b.y) < 6 && hyp(ball.vx, ball.vy) > 110) {
    o.downT = 1.3; ball.vx *= -.4; ball.vy *= -.4; ball.vz = 30; ball.onGround = false; m.emit('refHit', { x: b.x, y: b.y });
  }
}
function refSignal(m, sig, t = 1.4) { if (!m.official) refStep(m, 0); m.official.sig = sig; m.official.sigT = t; }
/** contact between a tackler and a victim: a foul when it is hard enough for this referee */
Match.prototype.contact = function (tackler, victim, o) {
  const m = this; victim.contactT = m.t;
  if (m.mode !== 'play' || m.o.training && !m.o.training.fouls) return;
  const behind = o.behind != null ? o.behind : Math.abs(E.angDiff(victim.facing, angTo(victim.body, tackler.body))) > 2.1;
  const late = m.owner !== victim && dist(m.ball, victim.body) > 30;
  const sev = (o.closing || 120) / 220 * (behind ? 1.5 : 1) * (late ? 1.4 : 1) * (o.kind === 'slide' ? 1.2 : 1);
  const strict = (m.ref ? m.ref.strictness : 1) * EF.T.foulStrictness * (m.buff.strict || 1) * (game.settings.cards === 'strict' ? 1.3 : 1);
  const k = sev * strict;
  m.emit('contact', { who: tackler.id, victim: victim.id, k, kind: o.kind });
  if (k <= .5 || m.foul) return;
  const card = game.settings.cards === 'off' || m.o.noCards ? null : k > 3.2 ? 'red' : k > 1.2 ? 'yellow' : null;
  const oppGoal = m.goalX(victim.side), inBox = P.inBox(oppGoal > P.CX ? 1 : -1, victim.body.x, victim.body.y);
  m.foul = { t: m.t, side: victim.side, x: victim.body.x, y: victim.body.y, offender: tackler, victim, k, sev, card, inBox, kind: o.kind };
  m.stats[tackler.side].fouls++;
  m.emit('foul', { who: tackler.id, victim: victim.id, side: victim.side, k, card, inBox, kind: o.kind });
};
Match.prototype.foulStep = function (dt) {
  const m = this, f = m.foul; if (!f) return;
  const el = m.t - f.t, keeps = m.owner && m.owner.side === f.side;
  if (f.inBox && el > .25) return m.whistleFoul(f);
  if (el > .8) {
    if (keeps && !f.card) { m.emit('advantage', { side: f.side }); refSignal(m, 'advantage'); m.advFoul = f; m.foul = null; return; }
    if (keeps && f.card) { m.emit('advantage', { side: f.side }); refSignal(m, 'advantage'); m.deferred.push({ f: f.offender, kind: f.card, why: 'foul' }); m.advFoul = f; m.foul = null; return; }
    return m.whistleFoul(f);
  }
  if (el > .3 && !keeps && !m.owner && hyp(m.ball.vx, m.ball.vy) < 40) return m.whistleFoul(f);
  if (el > .3 && m.owner && m.owner.side !== f.side) return m.whistleFoul(f);
};
Match.prototype.whistleFoul = function (f) {
  const m = this; m.foul = null; m.owner = null; m.shot = null;
  m.mode = 'dead'; m.modeT = 0; m.foulSpot = { x: f.x, y: f.y };
  m.emit('whistle', { kind: 'foul' }); refSignal(m, 'whistle', .8);
  const restart = () => {
    m.foulSpot = null;
    if (f.inBox) {
      m.emit('penaltyAwarded', { side: f.side, who: f.victim.id });
      refSignal(m, 'point', 1.2);
      // VAR checks every penalty
      m.mode = 'var'; m.modeT = 0; m.varCheck = { kind: 'penalty', foul: f, t: 0 }; m.emit('var', { kind: 'penalty' });
      return;
    }
    m.startSetpiece('freekick', f.side, { x: f.x, y: f.y });
  };
  m.applyDeferred();
  if (f.card) { m.dead = { t: .9, then: () => { giveCard(m, f.offender, f.card, 'foul'); m.mode = 'dead'; m.dead = { t: 1.3, then: restart }; } }; }
  else m.dead = { t: 1.0, then: restart };
};
Match.prototype.varStep = function (dt) {
  const m = this, v = m.varCheck; if (!v) { m.mode = 'play'; return; }
  v.t += dt; refSignal(m, v.t < 2 ? 'ear' : 'tv', .2);
  if (v.t < 2.6) return;
  m.varCheck = null;
  if (v.kind === 'penalty') {
    const soft = v.foul.sev < .8 || v.foul.dive;
    const over = soft && m.rng() < .5;
    m.emit('varDecision', { kind: 'penalty', overturned: over });
    if (over) m.startSetpiece('goalkick', 1 - v.foul.side, {});
    else m.startSetpiece('penalty', v.foul.side, {});
  } else if (v.kind === 'goal') {
    m.emit('varDecision', { kind: 'goal', overturned: false });
    m.kickoff(1 - v.side, false);
  }
};
function giveCard(m, f, kind, why) {
  if (!f || f.sentOff || game.settings.cards === 'off' || m.o.noCards) return;
  const second = kind === 'yellow' && f.cards >= 1;
  if (kind === 'yellow') f.cards++;
  m.stats[f.side].cards++;
  refSignal(m, 'card', 1.6);
  m.cards.push({ who: f.id, kind: second ? 'second' : kind, minute: m.minuteLabel(), why });
  m.emit('card', { who: f.id, side: f.side, kind: second ? 'red' : kind, second, why });
  m.gain(1 - f.side, 3, 'card');
  if (kind === 'red' || second) sendOff(m, f);
}
EF.giveCard = giveCard;
function sendOff(m, f) {
  f.sentOff = true; f.setState('off'); f.cards = Math.max(f.cards, 2);
  if (m.owner === f) m.owner = null;
  for (const sl of m.slots) if (sl.f === f) { sl.f = null; f.human = null; m.assignSlot(sl); }
  m.emit('sendOff', { who: f.id, side: f.side });
}
/** theatrics: contact or an opponent close and closing may win a foul; nobody near is a booking for simulation */
function judgeDive(m, f) {
  if (m.mode !== 'play') return;
  const foes = m.side[1 - f.side].filter(o => !o.sentOff && !o.gk), near = foes.map(o => ({ o, d: dist(o.body, f.body) })).sort((a, b) => a.d - b.d)[0];
  const d = near ? near.d : 99, contact = m.t - f.contactT < .5, gull = (m.ref ? m.ref.gullibility : .4) * EF.T.diveSuccess;
  if (contact || d < 8) {
    if (m.rng() < Math.max(.1, gull * (1.2 - d / 14))) {
      const oppGoal = m.goalX(f.side), inBox = P.inBox(oppGoal > P.CX ? 1 : -1, f.body.x, f.body.y);
      m.foul = { t: m.t - 1, side: f.side, x: f.body.x, y: f.body.y, offender: near.o, victim: f, k: .7, sev: .6, card: null, inBox, kind: 'dive', dive: true };
      m.gain(f.side, 5, 'dive'); m.emit('diveWon', { who: f.id, side: f.side, inBox });
      m.whistleFoul(m.foul);
    } else m.emit('diveIgnored', { who: f.id });
    return;
  }
  if (d > 14 && !contact) {
    m.owner = null; m.mode = 'dead'; m.modeT = 0; m.foulSpot = { x: f.body.x, y: f.body.y };
    m.emit('whistle', { kind: 'foul' }); m.emit('diveBooked', { who: f.id, side: f.side });
    m.euph[f.side] = Math.max(0, m.euph[f.side] - 20);
    m.dead = { t: .9, then: () => { giveCard(m, f, 'yellow', 'simulation'); m.mode = 'dead'; m.dead = { t: 1.2, then: () => { m.foulSpot = null; m.startSetpiece('freekick', 1 - f.side, { x: f.body.x, y: f.body.y }); } }; } };
    return;
  }
  m.emit('diveIgnored', { who: f.id });
}


/* ===== 17-euphoria.js ===== */
/* 17-euphoria: Europhoria (the crowd's burst), Super Strikes along their paths (registry 'super'), the Save Duel
 * (a timing ring in real time: PERFECT within 60 ms, GOOD within 140 ms, else MISS) and the CPU keeper's chance. */
Match.prototype.triggerEurophoria = function (s) {
  const m = this;
  if (m.euph[s] < 100 || m.euroT[s] > 0 || m.cheats.pure || m.o.pure) return false;
  m.euroT[s] = EF.T.europhoriaTime; m.superUsed[s] = false; m.euph[s] = 100;
  m.emit('europhoria', { side: s });
  return true;
};
const SUPER_PATHS = {
  // each: (u 0..1, base {x, y, z}, ctx) -> {x, y, z} offsets applied across the straight path (nx, ny: its normal)
  wobble: (u, c) => ({ lat: Math.sin(u * PI * 7) * 18 * Math.sin(u * PI), up: Math.sin(u * PI) * 20 }),
  zigzag: (u, c) => { const k = u * 4, tri = (k % 1 < .5 ? k % 1 : 1 - k % 1) * 2 - .5; return { lat: (Math.floor(k) % 2 ? -1 : 1) * tri * 52 * Math.sin(u * PI), up: 8 }; },
  hammer: (u, c) => ({ lat: 0, up: Math.abs(Math.sin(u * PI * 3)) * 26 * (1 - u * .4), hit: true }),
  meteor: (u, c) => ({ lat: 0, up: Math.sin(Math.min(1, u * 1.2) * PI) * 320, slow: u < .5 }),
  around: (u, c) => ({ lat: Math.sin(u * PI * 2) * 40 * (c.side || 1), up: 10 + Math.sin(u * PI) * 10 }),
  split: (u, c) => ({ lat: 0, up: 12 + Math.sin(u * PI) * 12, split: true }),
  rocket: (u, c) => ({ lat: 0, up: 10 + Math.sin(u * PI) * 6 })
};
EF.SUPER_PATHS = SUPER_PATHS;
function startSuper(m, f, it) {
  const s = f.side; m.superUsed[s] = true;
  const def = EF.get('super', f.data.captain && f.data.super ? f.data.super : 'rocket') || EF.get('super', 'rocket');
  const gx = m.goalX(s), aimY = it && it.aimY != null ? it.aimY : (m.rng() < .5 ? -.6 : .6);
  const to = { x: gx + m.dir(s) * 10, y: P.CY + aimY * (P.GH - 10), z: 14 };
  const ball = m.ball, from = { x: ball.x, y: ball.y, z: 2 };
  const d = hyp(to.x - from.x, to.y - from.y);
  m.superFlight = { f, def, side: s, phase: 'charge', t: 0, from, to, dur: Math.max(.45, d / EF.T.superSpeed) * (def.path === 'meteor' ? 1.8 : def.path === 'zigzag' || def.path === 'around' ? 1.3 : 1), outcome: null, hits: 0, lat: m.rng() < .5 ? -1 : 1 };
  m.owner = null; m.last = f; m.lastTouch = s; ball.vx = ball.vy = ball.vz = 0; ball.superPath = def.path; ball.superName = def.name; ball.kind = 'super';
  f.doAct('shotHard', .6); f.lift = 1;
  f.shots++; m.stats[s].shots++; m.stats[s].onTarget++;
  m.shot = null;
  m.emit('superStrike', { side: s, who: f.id, name: def.name, path: def.path, id: def.id });
  m.emit('slowmo', { k: .3, t: .5 });
}
Match.prototype.superStep = function (dt) {
  const m = this, S = m.superFlight; if (!S) return;
  const ball = m.ball, k = m.keeper[1 - S.side];
  S.t += S.phase === 'duel' ? 0 : dt;
  if (S.phase === 'charge') {
    ball.x = S.from.x; ball.y = S.from.y; ball.z = 2 + S.t * 30;
    if (S.t >= .3) { S.phase = 'flight'; S.t = 0; S.f.lift = 0; S.from.z = ball.z; m.emit('superRelease', { side: S.side, path: S.def.path }); this.superDecide(); }
    return;
  }
  if (S.phase === 'duel') { this.duelStep(); if (S.phase === 'duel') return; }
  const u = Math.min(1, S.t / S.dur), pth = SUPER_PATHS[S.def.path] || SUPER_PATHS.rocket, off = pth(u, { side: S.lat });
  const dx = S.to.x - S.from.x, dy = S.to.y - S.from.y, L = hyp(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  let bu = u; if (S.def.path === 'meteor') bu = u < .5 ? u * .15 : .075 + (u - .5) / .5 * .925;
  const px_ = lerp(S.from.x, S.to.x, bu) + nx * off.lat, py_ = lerp(S.from.y, S.to.y, bu) + ny * off.lat, pz = lerp(S.from.z, S.to.z, u) + off.up;
  ball.vx = (px_ - ball.x) / Math.max(dt, 1e-4); ball.vy = (py_ - ball.y) / Math.max(dt, 1e-4); ball.vz = (pz - ball.z) / Math.max(dt, 1e-4);
  ball.x = px_; ball.y = py_; ball.z = Math.max(0, pz); ball.roll += 30 * dt;
  if (off.hit && Math.abs(Math.sin(u * PI * 3)) < .08 && m.t - (S.lastHit || -9) > .12) { S.lastHit = m.t; S.hits++; m.emit('hammer', { x: ball.x, y: ball.y }); }
  ball.decoys = off.split ? [-1, 1].map(sd => ({ x: px_ + nx * 28 * sd * Math.sin(u * PI * .9 + .2), y: py_ + ny * 28 * sd * Math.sin(u * PI * .9 + .2), z: pz })) : null;
  // through bodies: they are knocked flying
  for (const p of m.players) if (p.side !== S.side && !p.gk && !p.sentOff && p.state === 'run' && hyp(p.body.x - ball.x, p.body.y - ball.y) < 7 && ball.z < 26) p.knock('launch', Math.atan2(dy, dx));
  // the bus: smashed
  if (m.bus && m.bus.on && ball.x > m.bus.x0 - 6 && ball.x < m.bus.x1 + 6 && Math.abs(ball.y - P.CY) < 34) { m.bus.on = false; m.emit('busSmash', { side: m.bus.side }); m.gain(S.side, 10, 'bus'); }
  if (S.phase === 'flight' && S.duelAt != null && u >= S.duelAt) { S.phase = 'duel'; S.duel.t = 0; m.duel = S.duel; m.emit('saveDuel', { side: 1 - S.side, slot: S.duel.slot }); return; }
  // the keeper goes for it
  if (k && u > .55 && k.state !== 'keeper-dive' && !S.dived) {
    S.dived = true; const need = S.to.y - k.body.y;
    k.dive = { t: 0, dur: .3, vy: (S.outcome === 'goal' ? need * .6 : need) / .3, side: sgn(need) || 1, high: 8, until: .6 }; k.setState('keeper-dive'); k.doAct('diveHigh', .6);
  }
  if (u >= .92 && S.outcome !== 'goal' && !S.resolved) {
    S.resolved = true; ball.superPath = null; ball.decoys = null; m.superFlight = null;
    if (S.outcome === 'perfect') { keeperCatch(k, 'super'); m.gain(k.side, 15, 'duel'); m.emit('save', { who: k.id, side: k.side, kind: 'super' }); }
    else { ball.vx = -m.dir(S.side) * 160; ball.vy = (m.rng() - .5) * 220; ball.vz = 120; ball.onGround = false; m.last = k; m.lastTouch = k.side; m.emit('save', { who: k.id, side: k.side, kind: 'superParry' }); m.emit('parry', { who: k.id }); }
    return;
  }
  if (u >= 1) {
    // into the net: the ball goes on along its last direction, the goal is found by the ball's own step
    ball.superPath = null; ball.decoys = null; m.superFlight = null;
    ball.vx = m.dir(S.side) * 220; ball.vy = 0; ball.vz = 0; ball.z = Math.min(ball.z, P.BAR - 8);
    if (k && S.outcome === 'goal' && S.duel) { k.body.x = lerp(k.body.x, ball.x, .7); }
    m.ballLoose(1 / 120, false);
  }
};
/** who saves it: a human keeper's side gets the Save Duel; else the CPU keeper's chance by difficulty */
Match.prototype.superDecide = function () {
  const m = this, S = m.superFlight, def = 1 - S.side;
  const inv = m.cheats['keeper' + def];
  const duelSlot = m.slots.filter(sl => sl.side === def && !sl.menu && sl.ctl).sort((a, b) => (a.f ? dist(a.f.body, m.keeper[def].body) : 999) - (b.f ? dist(b.f.body, m.keeper[def].body) : 999))[0];
  if (inv) { S.outcome = 'perfect'; return; }
  if (duelSlot && !m.o.attractDuel) { S.duelAt = .55; S.duel = { slot: duelSlot.i, t: 0, target: 1.0, pressed: null, result: null }; S.outcome = 'pending'; return; }
  if (m.o.attractDuel) { S.duelAt = .55; S.duel = { slot: -1, t: 0, target: 1.0, pressed: null, result: null, forced: 'miss' }; S.outcome = 'pending'; return; }
  const ch = m.diff.cpuSave * (m.keeper[def].data.boss ? 1.4 : 1);
  S.outcome = m.rng() < ch ? (m.rng() < .5 ? 'perfect' : 'good') : 'goal';
  m.emit('cpuSuperSave', { outcome: S.outcome });
};
Match.prototype.duelPress = function (at) {
  const d = this.duel; if (!d || d.pressed != null) return;
  d.pressed = at != null ? at : d.t;
};
Match.prototype.duelStep = function () {
  const m = this, S = m.superFlight, d = S.duel;
  d.t += m.realDt || 1 / 120;
  const sl = m.slots[d.slot];
  if (sl && d.pressed == null && sl.ctl && sl.ctl.duelPressed && sl.ctl.duelPressed(m, sl)) d.pressed = d.t;
  if (d.forced === 'miss' && d.t >= d.target + .2) d.pressed = d.target + .3;
  const late = d.t > d.target + .3;
  if (d.pressed == null && !late) return;
  const delta = d.pressed == null ? 9 : Math.abs(d.pressed - d.target);
  d.result = delta <= .06 ? 'perfect' : delta <= .14 ? 'good' : 'miss';
  S.outcome = d.result === 'miss' ? 'goal' : d.result;
  m.duel = null; S.phase = 'flight'; S.duelAt = null;
  m.emit('saveDuelResult', { result: d.result, delta, side: 1 - S.side });
};
EF.duelJudge = delta => delta <= .06 ? 'perfect' : delta <= .14 ? 'good' : 'miss';


/* ===== 18-setpieces.js ===== */
/* 18-setpieces: kickoff, goal kick, corner, free kick (with the wall), penalty (6 zones, the Panenka, the keeper's
 * guess) and the shootout (5 each, then sudden death; it ends early when one side can't catch up). Each restart: setup
 * (everyone placed), aim (a human taker has up to 6 s), take, play. Also the celebrations' choices. */
const SP_AIM_MAX = 6;
Match.prototype.startSetpiece = function (kind, side, o = {}) {
  const m = this, ball = m.ball, dir = m.dir(side), gx = m.goalX(side), ogx = m.ownGoalX(side);
  m.owner = null; m.shot = null; m.superFlight = null; ball.superPath = null; ball.decoys = null; ball.spin = 0; ball.vx = ball.vy = ball.vz = 0; ball.z = 0; ball.to = null; ball.kind = null; ball.prevPast = null;
  m.mode = kind === 'kickoff' ? 'kickoff' : 'setpiece'; m.modeT = 0;
  const sp = m.sp = { kind, side, t: 0, phase: 'setup', aimT: 0, ring: null, aimY: 0, aimZ: .4, power: 0, charging: false, zone: [1, 1], keeperDive: null, taken: false };
  let bx = P.CX, by = P.CY;
  if (kind === 'goalkick') { bx = ogx + dir * P.GA_D; by = P.CY + (o.y != null && o.y < P.CY ? -30 : 30); }
  if (kind === 'corner') { bx = gx - dir * 2; by = (o.y != null ? o.y : P.CY) < P.CY ? P.Y0 + 2 : P.Y1 - 2; sp.ring = { x: gx - dir * P.SPOT * .9, y: P.CY }; m.stats[side].corners++; }
  if (kind === 'freekick') { [bx, by] = P.clampField(o.x, o.y, 6); if (P.inBox(dir, bx, by)) bx = gx - dir * (P.BOX_D + 6); }
  if (kind === 'penalty') { bx = gx - dir * P.SPOT; by = P.CY; }
  ball.x = bx; ball.y = by;
  const dg = hyp(gx - bx, P.CY - by);
  sp.shootable = kind === 'freekick' && dg < 320;
  // the taker
  const mates = m.side[side].filter(f => !f.sentOff), foes = m.side[1 - side].filter(f => !f.sentOff);
  const outfield = mates.filter(f => !f.gk);
  let taker;
  if (kind === 'goalkick') taker = m.keeper[side];
  else if (kind === 'kickoff') taker = outfield.filter(f => f.role.startsWith('FWD') || f.role === 'MID').sort((a, b) => b.st.pass - a.st.pass)[0] || outfield[0];
  else if (kind === 'penalty' || sp.shootable) taker = outfield.slice().sort((a, b) => (b.data.captain ? 30 : 0) + b.st.shoot - (a.data.captain ? 30 : 0) - a.st.shoot)[0];
  else taker = outfield.slice().sort((a, b) => hyp(a.body.x - bx, a.body.y - by) - hyp(b.body.x - bx, b.body.y - by))[0];
  if (!taker) taker = mates[0];
  sp.taker = taker; sp.keeper = m.keeper[1 - side];
  const human = m.slots.find(sl => sl.side === side && !sl.menu);
  sp.human = human || null; sp.keeperHuman = kind === 'penalty' ? m.slots.find(sl => sl.side === 1 - side && !sl.menu) || null : null;
  if (human && !taker.gk) m.assignSlot(human, taker);
  // everyone placed
  const place = (f, x, y, face) => { const [cx, cy] = P.clampField(x, y, 4); f.body.x = cx; f.body.y = cy; f.body.z = 0; f.body.vx = f.body.vy = 0; f.facing = face != null ? face : (f.dir > 0 ? 0 : PI); f.setState(f.gk ? 'run' : 'run'); f.charging = false; f.meter = 0; f.air = null; f.lift = 0; f.plan = null; f.runTo = null; f.celebrate = null; f.dejected = false; };
  const spotOf = (f, ph) => m.brains[f.side].spot(f, ph, P.toUV(m.dir(f.side), bx, by));
  for (const f of m.players) {
    if (f.sentOff) continue;
    const fd = m.dir(f.side), fog = m.ownGoalX(f.side);
    if (f.gk) { place(f, fog + fd * 8, P.CY, fd > 0 ? 0 : PI); f.setState('run'); continue; }
    let [x, y] = spotOf(f, f.side === side ? 'attack' : 'defend');
    if (kind === 'kickoff') { const [u, v] = P.toUV(fd, x, y); [x, y] = P.toWorld(fd, Math.min(u, .46), v); if (f.side !== side && hyp(x - P.CX, y - P.CY) < P.CIRCLE + 6) { const a = Math.atan2(y - P.CY, x - P.CX); x = P.CX + Math.cos(a) * (P.CIRCLE + 8); y = P.CY + Math.sin(a) * (P.CIRCLE + 8); } }
    if (kind === 'goalkick' && f.side !== side && P.inBox(-dir, x, y)) x = ogx + dir * (P.BOX_D + 14);
    if (kind === 'corner') {
      const spots = f.side === side ? [[P.SPOT * .55, -30], [P.SPOT * .5, 34], [P.SPOT, 0], [P.BOX_D + 20, 10]] : [[P.GA_D * .6, -22], [P.GA_D * .6, 22], [P.SPOT * .8, 0], [P.BOX_D - 10, 30]];
      const k = f.side === side ? outfield.filter(q => q !== taker).indexOf(f) : foes.filter(q => !q.gk).indexOf(f);
      const s2 = spots[k] || spots[0]; x = gx - dir * s2[0]; y = P.CY + s2[1] * (by < P.CY ? 1 : -1);
    }
    if (kind === 'penalty') { const k = (f.idx * 37 + f.side * 11) % 7; x = gx - dir * (P.BOX_D + 14 + k * 3); y = P.CY + (k - 3) * 22 + (f.side ? 9 : 0); }
    place(f, x, y);
  }
  // the free kick's wall: two defenders 40 from the ball on the line to goal
  sp.wall = [];
  if (sp.shootable) {
    const a = Math.atan2(P.CY - by, gx - bx), wx = bx + Math.cos(a) * 40, wy = by + Math.sin(a) * 40;
    foes.filter(f => !f.gk).sort((p, q) => q.st.weight - p.st.weight).slice(0, 2).forEach((f, i) => { place(f, wx + Math.cos(a + PI / 2) * (i ? 6 : -6), wy + Math.sin(a + PI / 2) * (i ? 6 : -6), a + PI); sp.wall.push(f); });
    sp.aimY = by < P.CY ? .6 : -.6; sp.aimZ = .55;
  }
  if (kind === 'penalty') { const k = sp.keeper; place(k, m.goalX(side) - dir * 2, P.CY, dir > 0 ? PI : 0); }
  const back = Math.atan2(P.CY - by, gx - bx);
  place(taker, bx - Math.cos(back) * (kind === 'penalty' ? 14 : 7), by - Math.sin(back) * (kind === 'penalty' ? 14 : 7), back);
  if (kind === 'kickoff') { taker.facing = dir > 0 ? 0 : PI; taker.body.x = P.CX - dir * 6; taker.body.y = P.CY; }
  if (kind === 'goalkick') { taker.body.x = bx - dir * 8; taker.body.y = by; }
  if (m.official) { m.official.body.x = P.CX - 30; m.official.body.y = P.CY + 70; }
  m.emit('setpiece', { kind, side, taker: taker.id, shootable: sp.shootable });
};
Match.prototype.setpieceStep = function (dt) {
  const m = this, sp = m.sp; if (!sp) { m.mode = 'play'; return; }
  sp.t += dt;
  for (const f of m.players) { if (sp.wall.includes(f) && sp.jump) { f.body.z = Math.max(0, Math.sin(Math.min(1, (m.t - sp.jump) / .35) * PI) * 10); } f.step(dt, NO_INTENT, false); }
  refStep(m, dt);
  if (sp.phase === 'setup') { if (sp.t >= (sp.kind === 'kickoff' ? 1.0 : .7)) { sp.phase = 'aim'; sp.t = 0; m.emit('whistle', { kind: 'restart', sp: sp.kind }); } return; }
  if (sp.phase === 'aim') {
    const ctl = sp.human && sp.human.ctl, it = ctl && ctl.peek ? ctl.peek(m, sp.human) : null, taker = sp.taker;
    const t = m.dir(sp.side), gx = m.goalX(sp.side);
    if (sp.kind === 'penalty') return penaltyAim(m, sp, it, dt);
    if (it) {
      const mv = it.move || [0, 0];
      if (sp.kind === 'corner' && sp.ring) { sp.ring.x = clamp(sp.ring.x + mv[0] * 110 * dt, Math.min(gx, gx - t * P.BOX_D), Math.max(gx, gx - t * P.BOX_D)); sp.ring.y = clamp(sp.ring.y + mv[1] * 110 * dt, P.CY - P.BOX_W + 20, P.CY + P.BOX_W - 20); }
      if (sp.shootable) { sp.aimY = clamp(sp.aimY + mv[1] * 1.6 * dt, -1, 1); sp.aimZ = clamp(sp.aimZ - (it.sprint ? 0 : 0), 0, 1); if (Math.abs(mv[0]) > .3) sp.aimZ = clamp(sp.aimZ + mv[0] * -t * 1.2 * dt, 0, 1); }
      taker.facing = sp.kind === 'goalkick' || sp.kind === 'kickoff' ? (hyp(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : taker.facing) : taker.facing;
      if (sp.shootable && it.shoot && it.shoot.down) { sp.charging = true; sp.power = Math.min(1, sp.power + dt / EF.T.shotChargeTime); return; }
      if (sp.shootable && sp.charging) return takeSetpiece(m, 'shot', it);
      if (it.pass && it.pass.pressed) return takeSetpiece(m, 'pass', it);
      if (it.lob && it.lob.pressed) return takeSetpiece(m, sp.kind === 'corner' ? 'cross' : 'lob', it);
      if (it.shoot && it.shoot.pressed && sp.kind === 'corner') return takeSetpiece(m, 'short', it);
      if (it.shoot && it.shoot.pressed && sp.kind !== 'corner') return takeSetpiece(m, sp.kind === 'goalkick' ? 'lob' : 'shot', it);
      if (it.through && it.through.pressed) return takeSetpiece(m, sp.kind === 'corner' ? 'cross' : 'pass', it);
      if (sp.t > SP_AIM_MAX) return takeSetpiece(m, sp.kind === 'corner' ? 'cross' : sp.shootable ? 'shot' : 'pass', null);
      return;
    }
    // the CPU's taker
    if (sp.t > (m.o.attract ? .5 : .8 + (sp.kind === 'kickoff' ? 0 : .4))) {
      if (sp.kind === 'corner') { const tgt = m.side[sp.side].filter(f => f !== taker && !f.gk && !f.sentOff).sort((a, b) => b.st.shoot - a.st.shoot)[0]; if (tgt) sp.ring = { x: tgt.body.x, y: tgt.body.y }; return takeSetpiece(m, m.rng() < .85 ? 'cross' : 'short', null); }
      if (sp.shootable) { sp.power = .75 + m.rng() * .15; sp.aimY = (m.rng() < .5 ? -1 : 1) * (.5 + m.rng() * .4); sp.aimZ = .5 + m.rng() * .3; return takeSetpiece(m, m.rng() < .75 ? 'shot' : 'lob', null); }
      if (sp.kind === 'goalkick') return takeSetpiece(m, keeperChoice(taker) === 'long' ? 'lob' : 'pass', null);
      return takeSetpiece(m, 'pass', null);
    }
  }
};
function takeSetpiece(m, how, it) {
  const sp = m.sp, f = sp.taker, ball = m.ball, side = sp.side, dir = m.dir(side), gx = m.goalX(side);
  it = it || {};
  m.mode = 'play'; m.modeT = 0; sp.phase = 'taken'; m.lastSp = sp; m.sp = sp.kind === 'kickoff' ? sp : null;
  f.setState('run'); f.cool = 0;
  if (sp.kind === 'kickoff') { m.kickHold = 2.5; m.emit('kickoffTaken', { side }); }
  const mates = m.side[side].filter(p => p !== f && !p.sentOff && !p.gk);
  if (how === 'pass') {
    const mv = it.move || [0, 0], a = hyp(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : null;
    const r = (a != null ? f.pickReceiver(a, {}) : null) || mates.sort((p, q) => dist(p.body, f.body) - dist(q.body, f.body))[0];
    if (r) f.passTo(r, 'pass'); else f.kickDir(dir > 0 ? 0 : PI, 200, 0, 'pass', null);
  } else if (how === 'lob') {
    const mv = it.move || [0, 0];
    const r = mates.sort((p, q) => (q.body.x - p.body.x) * dir)[0];
    let tx = r ? r.body.x : f.body.x + dir * 300, ty = r ? r.body.y : P.CY;
    if (hyp(mv[0], mv[1]) > .3) { const a = Math.atan2(mv[1], mv[0]); tx = f.body.x + Math.cos(a) * 360; ty = f.body.y + Math.sin(a) * 360; }
    [tx, ty] = P.clampField(tx, ty, 10);
    const v = E.arc({ x: ball.x, y: ball.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 60 });
    m.kickBall(f, v.vx, v.vy, v.vz, 'lob', r || null); f.doAct('shotHard', .4);
    m.emit('pass', { side, who: f.id, to: r ? r.id : null, kind: 'lob' });
  } else if (how === 'cross') {
    const r = sp.ring || { x: gx - dir * P.SPOT, y: P.CY };
    const v = E.arc({ x: ball.x, y: ball.y, z: 0 }, { x: r.x, y: r.y, z: 4 }, EF.T.ballGravity, { apex: 55 });
    const to = mates.sort((p, q) => dist(p.body, r) - dist(q.body, r))[0];
    m.kickBall(f, v.vx, v.vy, v.vz, 'cross', to || null); f.doAct('shotHard', .4);
    const mv = it.move || [0, 0]; m.ball.spin = clamp(mv[0] * dir * .4, -.5, .5);
    if (to) to.runTo = { x: r.x, y: r.y, t: 1.4 };
    m.emit('pass', { side, who: f.id, to: to ? to.id : null, kind: 'cross' }); m.emit('cornerTaken', { side });
  } else if (how === 'short') {
    const r = mates.sort((p, q) => dist(p.body, f.body) - dist(q.body, f.body))[0];
    if (r) f.passTo(r, 'pass');
  } else if (how === 'shot') {
    if (sp.shootable) {
      // over the wall: the reticle's height lifts it; the stick curls it (aftertouch)
      const p = Math.max(.35, sp.power || .7), ty = P.CY + sp.aimY * (P.GH - 6), sp2 = 200 + p * 200;
      const d = hyp(gx - ball.x, ty - ball.y), tt = d / sp2, tz = 6 + sp.aimZ * (P.BAR - 10);
      const vz = (tz + .5 * EF.T.ballGravity * tt * tt) / tt;
      const a = Math.atan2(ty - ball.y, gx - ball.x) + gauss(m.rng) * (100 - f.st.shoot) / 100 * .05;
      m.kickBall(f, Math.cos(a) * sp2, Math.sin(a) * sp2, Math.min(vz, 220), 'shot', null);
      m.ball.spin = -sgn(sp.aimY || 1) * dir * .5;
      f.doAct('shotHard', .4); f.curlT = .5; f.curled = false;
      sp.jump = m.t;
      registerShot(m, f, sp2, p >= .78 && p <= .9, 'freekick', p);
      m.flags.fkShot = { t: m.t, side };
      const s = m.lastSp; s.jump = m.t; s.wall = sp.wall; m.wallJump = { t: m.t, wall: sp.wall };
    } else { f.shoot(.7, { aimY: (m.rng() - .5) * 1.4 }); }
  }
  sp.taken = true;
  m.emit('setpieceTaken', { kind: sp.kind, side, how });
}

/* ---- penalties ---- */
function penaltyAim(m, sp, it, dt) {
  const taker = sp.taker, k = sp.keeper;
  sp.aimT += dt;
  // the keeper's guess (a human picks with the stick and ✕; the CPU guesses when the kick comes)
  const kh = sp.keeperHuman && sp.keeperHuman.ctl && sp.keeperHuman.ctl.peek ? sp.keeperHuman.ctl.peek(m, sp.keeperHuman) : null;
  if (kh && !sp.keeperDive) {
    const mv = kh.move || [0, 0];
    sp.kAim = Math.abs(mv[1]) > .4 ? sgn(mv[1]) : 0;
    if (kh.pass && kh.pass.pressed) { sp.keeperDive = { side: sp.kAim, t: sp.aimT, early: !sp.charging || sp.power < .3 }; m.emit('keeperGuess', { side: sp.kAim }); }
  }
  if (it) {
    const mv = it.move || [0, 0];
    sp.zone = [Math.abs(mv[1]) > .35 ? (mv[1] < 0 ? 0 : 2) : 1, Math.abs(mv[0]) > .5 ? (mv[0] * m.dir(sp.side) > 0 ? 1 : 0) : sp.zone[1]];
    if (it.shoot && it.shoot.down) { sp.charging = true; sp.power = Math.min(1, sp.power + dt / EF.T.shotChargeTime); return; }
    if (sp.charging || sp.aimT > SP_AIM_MAX + 2) return kickPenalty(m, sp);
    return;
  }
  // the CPU's taker: a zone, a power, now and then a Panenka; it may change its mind if the keeper went early
  if (sp.aimT > (m.o.attract ? .7 : 1.1)) {
    if (!sp.cpuPick) { const pan = m.rng() < (m.o.attract ? .3 : .08); sp.cpuPick = true; sp.zone = pan ? [1, 0] : [Math.floor(m.rng() * 3), m.rng() < .5 ? 1 : 0]; sp.power = pan ? .12 : .5 + m.rng() * .35; }
    if (sp.keeperDive && sp.keeperDive.early && sp.zone[0] === (sp.keeperDive.side < 0 ? 0 : sp.keeperDive.side > 0 ? 2 : 1)) sp.zone[0] = sp.keeperDive.side < 0 ? 2 : 0;
    kickPenalty(m, sp);
  }
}
function kickPenalty(m, sp) {
  const f = sp.taker, k = sp.keeper, ball = m.ball, side = sp.side, dir = m.dir(side), gx = m.goalX(side);
  const zy = [-1, 0, 1][sp.zone[0]], high = sp.zone[1] === 1, p = sp.power;
  const panenka = p < .2 && zy === 0;
  let ty = P.CY + zy * (P.GH - 10), tz = high ? 26 : 5, speed = panenka ? 110 : 220 + p * 180;
  if (p > .9 && m.rng() < .25) tz = P.BAR + 14;   // blazed over
  ty += gauss(m.rng) * (100 - f.st.shoot) / 100 * 8;
  const d = Math.abs(gx - ball.x), tt = d / speed, vz = (tz + .5 * EF.T.ballGravity * tt * tt) / tt;
  m.mode = sp.so ? 'shootout' : 'play'; m.sp = null; sp.phase = 'taken';
  m.kickBall(f, dir * speed, (ty - ball.y) / tt, vz, 'shot', null); f.doAct('shotHard', .45);
  // the keeper's dive: a human's pick, or the CPU's guess
  let ks = sp.keeperDive ? sp.keeperDive.side : null;
  if (ks == null) { const r = m.rng(); ks = r < .38 ? -1 : r < .76 ? 1 : 0; if (m.cheats['keeper' + k.side]) ks = zy; }
  const right = ks === zy;
  let outcome;
  if (tz > P.BAR) outcome = 'over';
  else if (panenka) outcome = ks === 0 ? 'catch' : 'goal';
  else if (right) outcome = m.rng() < .25 + k.st.keep / 100 * .45 - (p > .85 ? .2 : 0) ? (m.rng() < .5 ? 'catch' : 'parry') : 'goal';
  else outcome = high && zy !== 0 && m.rng() < .08 ? 'post' : 'goal';
  if (m.cheats['keeper' + k.side]) outcome = 'catch';
  if (m.forceGoal && tz <= P.BAR) outcome = 'goal';
  const kind = panenka ? 'panenka' : 'penalty';
  m.shot = { by: f, side, t0: m.t, kind, speed, onTarget: tz < P.BAR, done: false, outcome: outcome === 'catch' || outcome === 'parry' ? outcome : outcome === 'goal' ? 'goal' : 'miss', keeper: k, cross: { y: ty, z: tz, t: tt } };
  f.shots++; m.stats[side].shots++;
  if (ks !== 0) { const need = (P.CY + ks * (P.GH - 10)) - k.body.y; k.dive = { t: 0, dur: .32, vy: need / .32 * 1.2, side: ks, high: high ? 12 : 3, until: tt + .5 }; k.setState('keeper-dive'); k.doAct(high ? 'diveHigh' : 'diveLow', .6); }
  else { k.dive = { t: 0, dur: .2, vy: 0, side: 0, high: 0, until: tt + .4 }; k.setState('keeper-dive'); }
  if (outcome === 'post') { m.shot.outcome = 'miss'; ball.vy *= 1.15; }
  m.emit('penaltyTaken', { side, who: f.id, panenka, zone: sp.zone, outcome });
  m.emit('shot', { side, who: f.id, power: p, kind, onTarget: tz < P.BAR });
  sp.result = outcome;
  if (sp.so) sp.so.pending = { side, outcome, t: 0, who: f.id };
}
function keeperPenaltyStep(k, dt) {
  const m = k.m, b = k.body;
  if (k.state === 'keeper-dive') {
    const d = k.dive; d.t += dt; const u = Math.min(1, d.t / d.dur);
    b.vy = d.vy * (1 - u); b.vx = 0; if (d.high) b.z = Math.sin(Math.min(1, u * 1.3) * PI) * d.high; k.diveU = u; k.tiltSide = d.side;
    b.update(dt, m.map); keeperShotResolve(k);
    if (d.t > d.until) { k.diveU = 0; b.z = 0; k.setState(m.owner === k ? 'keeper-hold' : 'run'); }
    return;
  }
  b.vx = approach(b.vx, 0, 400 * dt); b.vy = approach(b.vy, 0, 400 * dt); b.update(dt, m.map);
  if (m.sp && m.sp.kind === 'penalty') { b.y = P.CY + Math.sin(m.t * 3) * 4 + (m.sp.kAim || 0) * 6; }
  if (k.state === 'keeper-hold' && m.mode === 'play') { k.holdT = (k.holdT || 0) + dt; if (k.holdT > 1) keeperDistribute(k, 'throw'); }
}

/* ---- the shootout ---- */
Match.prototype.startShootout = function () {
  const m = this; m.half = 5; m.mode = 'shootout'; m.modeT = 0; m.owner = null;
  const first = m.rng() < .5 ? 0 : 1;
  m.so = { first, turn: first, taken: [0, 0], score: [0, 0], kicks: [[], []], sudden: false, wait: 1.5, pending: null, order: [0, 1].map(s => m.side[s].filter(f => !f.sentOff).sort((a, b) => (a.gk ? 1 : 0) - (b.gk ? 1 : 0) || b.st.shoot - a.st.shoot)) };
  m.emit('shootoutStart', { first });
  for (const f of m.players) f.celebrate = null;
};
Match.prototype.shootoutStep = function (dt) {
  const m = this, so = m.so;
  if (m.sp && m.sp.kind === 'penalty') { m.setpieceStep(dt); return; }
  // the kick on its way: the ball's own step, the keeper's
  for (const f of m.players) { if (f.gk) keeperPenaltyStep(f, dt); else { f.decel(dt, 500); f.body.update(dt, m.map); } }
  if (!m.owner && !m.superFlight) m.ballLoose(dt, true);
  const b = m.ball;
  if (so.pending) {
    const pd = so.pending; pd.t += dt;
    const gx = m.goalX(pd.side), past = gx > P.CX ? b.x > gx + b.r : b.x < gx - b.r;
    if (!pd.scored && past && Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2) pd.scored = true;
    if (pd.t > 1.6) {
      const goal = !!pd.scored && pd.outcome === 'goal';
      so.kicks[pd.side].push(goal); so.taken[pd.side]++; if (goal) so.score[pd.side]++;
      m.emit('shootoutKick', { side: pd.side, goal, who: pd.who, score: so.score.slice() });
      so.pending = null; so.turn = 1 - pd.side; so.wait = 1.2;
      if (m.shootoutDecided()) { m.emit('shootoutEnd', { score: so.score.slice(), winner: so.score[0] > so.score[1] ? 0 : 1 }); m.finish(); return; }
    }
    return;
  }
  so.wait -= dt;
  if (so.wait > 0) return;
  // next kick: the taker in order, everyone else in the centre circle
  const s = so.turn, list = so.order[s], taker = list[so.taken[s] % list.length];
  m.startSetpiece('penalty', s, {}); m.mode = 'shootout';
  const sp = m.sp; sp.taker = taker; sp.so = so;
  const dir = m.dir(s), gx = m.goalX(s);
  for (const f of m.players) if (!f.gk && f !== taker && !f.sentOff) { f.body.x = P.CX + (f.idx - 2) * 14; f.body.y = P.CY + (f.side ? 20 : -20); f.facing = PI / 2; }
  taker.body.x = gx - dir * (P.SPOT + 14); taker.body.y = P.CY; taker.facing = dir > 0 ? 0 : PI;
  const kp = m.keeper[1 - s]; kp.body.x = gx - dir * 2; kp.body.y = P.CY;
  const okp = m.keeper[s]; okp.body.x = P.CX + 50; okp.body.y = P.CY + 40;
  const human = m.slots.find(sl => sl.side === s && !sl.menu); sp.human = human || null;
  sp.keeperHuman = m.slots.find(sl => sl.side === 1 - s && !sl.menu) || null;
  if (human && !taker.gk) m.assignSlot(human, taker);
};
Match.prototype.shootoutDecided = function () {
  const so = this.so, [a, b] = so.taken, [sa, sb] = so.score;
  if (a <= 5 && b <= 5 && !(a === 5 && b === 5)) {
    const leftA = 5 - a, leftB = 5 - b;
    if (sa + leftA < sb || sb + leftB < sa) return true;
    return false;
  }
  return a === b && sa !== sb;
};

/* ---- celebrations ---- */
function celebrationFor(m, f, k) {
  const sig = (f.data.celebration) || m.teams[f.side].celebration || 'kneeslide';
  return EF.get('celebration', sig) ? sig : 'kneeslide';
}
function celebrationChoices(m, f) {
  const sig = celebrationFor(m, f, -1), pool = EF.all('celebration').filter(c => !c.hidden).map(c => c.id).filter(id => id !== sig);
  const r = E.rng(m.goals.length * 31 + f.id * 7 + m.seed), out = [sig];
  while (out.length < 4 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
EF.celebrationChoices = celebrationChoices;


/* ===== 20-events.js ===== */
/* 20-events: matchday events (registry 'event'): a seagull that sits on the ball, a beach ball from the crowd, a pitch
 * invader with stewards, the floodlights failing, flare smoke, a camera drone and fireworks. At most one a half, never
 * at a set piece or in the last minutes; all through the match's rng, so a seed replays them. */
EF.def('event', 'seagull', { name: 'SEAGULL', chance: .8, start(m, e) { e.x = m.ball.x; e.y = m.ball.y; e.t = 0; e.landed = false; },
  update(m, e, dt) {
    e.t += dt; const b = m.ball;
    if (!e.landed) { if (!m.owner && hyp(b.vx, b.vy) < 60) { e.landed = true; e.x = b.x; e.y = b.y; m.emit('gullLand', {}); } if (e.t > 12) return true; return false; }
    if (!e.gone) { b.x = e.x; b.y = e.y; b.vx = b.vy = 0; if (m.owner) m.owner = null;
      const near = m.players.some(p => !p.sentOff && hyp(p.body.x - e.x, p.body.y - e.y) < 12);
      if (near || e.t > 14) { e.gone = true; e.goneT = e.t; m.emit('gullAway', {}); } }
    return e.gone && e.t - e.goneT > 2;
  } });
EF.def('event', 'beachball', { name: 'BEACH BALL', chance: .8, start(m, e) {
    e.body = new E.Body({ x: lerp(P.X0, P.X1, .3 + m.rng() * .4), y: P.Y0 - 10, r: 7, friction: 0, bounce: .9, gravity: 200 }); e.body.vy = 80; e.body.vz = 80; e.body.z = 30; e.t = 0;
  },
  update(m, e, dt) {
    e.t += dt; const k = e.body; k.vx *= Math.exp(-dt * .3); k.vy *= Math.exp(-dt * .3); k.update(dt, m.map);
    const b = m.ball;
    if (!m.owner && hyp(b.x - k.x, b.y - k.y) < 10 && Math.abs(b.z - k.z) < 12) { const a = Math.atan2(b.y - k.y, b.x - k.x), sp = hyp(b.vx, b.vy); b.vx = Math.cos(a) * Math.max(60, sp * .7); b.vy = Math.sin(a) * Math.max(60, sp * .7); k.vx -= Math.cos(a) * 40; k.vy -= Math.sin(a) * 40; k.vz = 70; m.emit('beachHit', {}); }
    for (const p of m.players) if (hyp(p.body.x - k.x, p.body.y - k.y) < 10 && k.z < 14) { const a = Math.atan2(k.y - p.body.y, k.x - p.body.x); k.vx = Math.cos(a) * 90; k.vy = Math.sin(a) * 90; k.vz = 90; }
    if (e.t > 20 && !e.popped) { e.popped = true; m.emit('beachPop', { x: k.x, y: k.y }); }
    return e.popped;
  } });
const invader = (who) => ({ name: who === 'keith' ? 'KIPPER KEITH' : 'THE STEEL STAG', chance: .7, who, start(m, e) {
    e.body = new E.Body({ x: P.X0 + 40, y: P.Y1 + 20, r: 5, friction: 0, gravity: 700 }); e.t = 0; e.stewards = [0, 1].map(i => new E.Body({ x: P.X0 + 10 - i * 14, y: P.Y1 + 24, r: 5, friction: 0, gravity: 700 })); e.who = this.who;
    m.emit('invader', { who: this.who });
  },
  update(m, e, dt) {
    e.t += dt; const k = e.body;
    if (!e.caught) {
      const tx = lerp(P.X0, P.X1, Math.min(1, e.t / 14)), ty = P.CY + Math.sin(e.t * 1.7) * 160;
      const dx = tx - k.x, dy = ty - k.y, d = hyp(dx, dy) || 1; k.vx = dx / d * 95; k.vy = dy / d * 95; k.update(dt, m.map);
      e.stewards.forEach((s, i) => { const ex = k.x - s.x, ey = k.y - s.y, dd = hyp(ex, ey) || 1; s.vx = ex / dd * (80 + i * 6); s.vy = ey / dd * (80 + i * 6); s.update(dt, m.map); });
      const b = m.ball; if (!m.owner && hyp(b.x - k.x, b.y - k.y) < 7 && b.z < 20) { b.vx *= -.6; b.vy *= -.6; }
      // tackled by a human: euphoria and a sticker
      for (const p of m.players) if (p.human != null && (p.state === 'slide' || p.state === 'poke' || p.state === 'barge') && hyp(p.body.x - k.x, p.body.y - k.y) < 12) { e.caught = true; e.caughtT = e.t; m.gain(p.side, 10, 'invader'); m.emit('invaderTackled', { who: this.who, by: p.id }); break; }
      if (e.t > 15 || e.stewards.some(s => hyp(s.x - k.x, s.y - k.y) < 8)) { e.caught = true; e.caughtT = e.t; m.emit('invaderCaught', { who: this.who }); }
    } else {
      const dx = P.CX - k.x, dy = P.Y1 + 40 - k.y, d = hyp(dx, dy) || 1; k.vx = dx / d * 60; k.vy = dy / d * 60; k.update(dt, m.map);
      e.stewards.forEach((s, i) => { s.x = k.x - 8 + i * 16; s.y = k.y; });
      if (e.t - e.caughtT > 4) return true;
    }
    return false;
  } });
EF.def('event', 'invader-keith', invader('keith'));
EF.def('event', 'invader-stag', invader('stag'));
EF.def('event', 'floodlight', { name: 'FLOODLIGHT FAILURE', chance: .6, night: true, start(m, e) { e.t = 0; m.emit('floodFail', {}); }, update(m, e, dt) { e.t += dt; e.dark = e.t < 4 && (e.t > .6 || Math.sin(e.t * 40) > 0); if (e.t > 4 && !e.back) { e.back = true; m.emit('floodBack', {}); } return e.t > 5; } });
EF.def('event', 'flaresmoke', { name: 'FLARE SMOKE', chance: .9, start(m, e) { e.t = 0; e.y = P.CY + (m.rng() - .5) * 200; m.emit('flareSmoke', {}); }, update(m, e, dt) { e.t += dt; return e.t > 15; } });
EF.def('event', 'drone', { name: 'CAMERA DRONE', chance: .9, start(m, e) { e.t = 0; m.emit('drone', {}); }, update(m, e, dt) { e.t += dt; e.x = lerp(P.X0 - 60, P.X1 + 60, e.t / 12); e.y = P.CY + Math.sin(e.t) * 80; return e.t > 12; } });
EF.def('event', 'fireworks', { name: 'FIREWORKS', chance: .9, start(m, e) { e.t = 0; m.emit('fireworks', {}); }, update(m, e, dt) { e.t += dt; return e.t > 6; } });
Match.prototype.eventsStep = function (dt) {
  const m = this;
  if (m.cheats.pure || m.o.pure || m.o.training || m.session && false) return;
  if (!m.evPlan) {
    m.evPlan = [];
    const list = (m.st.events || []).map(id => EF.get('event', id)).filter(Boolean).filter(e => !e.night || m.st.time !== 'day');
    for (let h = 1; h <= 2; h++) if (list.length) { const e = list[Math.floor(m.rng() * list.length)]; if (m.rng() < e.chance) m.evPlan.push({ id: e.id, half: h, minute: (h - 1) * 45 + 10 + m.rng() * 28 }); }
  }
  if (m.ev) { const def = EF.get('event', m.ev.id); if (def.update(m, m.ev, dt)) { m.emit('eventEnd', { id: m.ev.id }); m.ev = null; } return; }
  const next = m.evPlan.find(p => !p.done && p.half === m.half && m.minute >= p.minute);
  if (next && m.mode === 'play' && !m.sp && m.minute < m.half * 45 - 5) { next.done = true; m.startEvent(next.id); }
};
Match.prototype.startEvent = function (id) {
  const def = EF.get('event', id); if (!def) return;
  if (this.ev) this.emit('eventEnd', { id: this.ev.id });
  this.ev = { id }; def.start.call(def, this, this.ev); this.emit('event', { id, name: def.name });
};


/* ===== 21-view.js ===== */
/* 21-view: the MatchView draws a Match (live, from a replay's frames, or a hub client's mirror): the sky and skyline,
 * the stands and their crowd (mood, scarves, the tifo, flares), the boards' LED text, goals and nets, corner flags,
 * floodlights, the rigs (animated from each footballer's state), the ball and its trails, events, weather, fog and
 * smoke; and the broadcast camera director. */
const KICK = {
  touch: { rel: true, kick: true, a0: .2, a1: 0, z0: .08, z1: .12, reach: 4, wind: .03, active: .04, recover: .08 },
  pass: { rel: true, kick: true, a0: .6, a1: -.1, z0: .15, z1: .2, reach: 6, wind: .08, active: .08, recover: .16, twist: .4 },
  shot: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.1, reach: 7, wind: .12, active: .1, recover: .26, lean: -.25, lunge: 2 },
  shotHard: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.5, reach: 7.5, wind: .14, active: .1, recover: .3, lean: -.35, lunge: 3, twist: .6 },
  chip: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: 1.4, reach: 5.5, wind: .1, active: .08, recover: .2, lean: -.4 },
  volley: { rel: true, kick: true, a0: .4, a1: -.2, z0: .9, z1: 1.2, reach: 7, wind: .06, active: .1, recover: .2, hop: 2, lean: -.4, twist: .6 },
  bicycle: { rel: true, kick: true, a0: .1, a1: 0, z0: 2.2, z1: 1.5, reach: 6, wind: .1, active: .1, recover: .3 },
  poke: { rel: true, kick: true, a0: .3, a1: 0, z0: .1, z1: .1, reach: 7.5, lunge: 3, wind: .05, active: .08, recover: .15 },
  slide: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: .15, reach: 8, wind: .04, active: .3, recover: .2, crouch: .9, lean: -.5, lunge: 2 },
  barge: E.MOVES.bash,
  stepover: { rel: true, kick: true, a0: .9, a1: -.3, z0: .12, z1: .12, reach: 5, wind: .04, active: .1, recover: .16 },
  rainbow: { rel: true, kick: true, a0: 3, a1: 2.6, z0: .1, z1: 1.3, reach: 4, wind: .05, active: .08, recover: .16 },
  nutmeg: { rel: true, kick: true, a0: .2, a1: -.1, z0: .05, z1: .1, reach: 6, wind: .05, active: .06, recover: .12 },
  knockon: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: .2, reach: 6, wind: .03, active: .05, recover: .1 },
  spin: null,
  throw: E.MOVES.throw, header: { rel: true, a0: 0, a1: 0, z0: 2, z1: 2, reach: 3, wind: .05, active: .08, recover: .2, lean: .5, hop: 2 },
  divingHeader: null, smother: null, catch: E.MOVES.cast, diveHigh: null, diveLow: null, dive: null, jab: E.MOVES.jab
};
EF.KICKS = KICK;
const kickState = (act) => {
  const sp = KICK[act.name]; if (!sp) return null;
  const tot = (sp.wind || .1) + (sp.active || .1) + (sp.recover || .2), u = clamp(act.t / act.dur, 0, 1) * tot;
  if (u < sp.wind) return { spec: sp, phase: 'wind', u: u / sp.wind };
  if (u < sp.wind + sp.active) return { spec: sp, phase: 'active', u: (u - sp.wind) / sp.active };
  return { spec: sp, phase: 'recover', u: Math.min(1, (u - sp.wind - sp.active) / sp.recover) };
};
const kitClash = (a, b) => { const A = E.hex(a), B = E.hex(b); return Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]) < 150; };
EF.kitFor = (m, s) => {
  const t = m.teams[s];
  if (s === 0) return t.kits.home;
  return kitClash(t.kits.home.shirt, m.teams[0].kits.home.shirt) ? t.kits.away : t.kits.home;
};
function makeRig(f, kit, keeperKit) {
  const d = f.data, k = f.gk ? keeperKit : kit;
  return new E.Humanoid({ weapon: null, build: d.build || 'heroic', size: (d.size || 1.08) * (d.boss ? 1 : 1), hair: d.hair || 'short', sleeves: f.gk ? 'long' : 'short',
    kit: { pattern: k.pattern || 'plain', color2: k.color2, number: d.num, numberColor: k.numberColor || (E.hex(k.shirt).reduce((a, b) => a + b) > 450 ? '#1a1a2a' : '#ffffff') },
    colors: { skin: d.skin || '#e0b090', hair: d.hairColor || '#3a2418', cloth: k.shirt, pants: k.shorts, boot: '#1a1a20', belt: k.shorts, trim: k.socks || k.color2, glove: k.glove || d.skin || '#e0b090' }, speedRef: 80 });
}
EF.makeRig = makeRig;
EF.refRig = () => new E.Humanoid({ weapon: null, build: 'heroic', size: 1.06, hair: 'bald', sleeves: 'short', colors: { skin: '#e8c0a0', hair: '#6a5a4a', cloth: '#141414', pants: '#141414', boot: '#0a0a0a', belt: '#141414', trim: '#e8d040' }, speedRef: 80 });
class MatchView {
  constructor(m, o = {}) {
    this.m = m; this.o = o; this.t = 0;
    const kit0 = EF.kitFor(m, 0), kit1 = EF.kitFor(m, 1);
    this.kits = [kit0, kit1];
    this.rigs = m.players.map(f => makeRig(f, f.side ? kit1 : kit0, m.teams[f.side].kits.keeper));
    this.refRig = EF.refRig();
    this.mood = [0, 0]; this.crowdState = [0, 0]; this.crowdT = [0, 0]; this.wave = -1; this.flash = 0;
    this.boardText = null; this.boardT = 0; this.fireworks = [];
    this.buildCrowd();
    this.zoomT = 1; this.zoomNow = 1;
    this.trail = [];
    this.replay = null;
  }
  buildCrowd() {
    const m = this.m, st = m.st, map = m.map, fans = this.fans = [], size = (st.crowd && st.crowd.size) || 600, home = (st.crowd && st.crowd.home) || .7;
    const r = E.rng(st.seed || 3);
    const teamCols = s => { const k = this.kits[s]; return [k.shirt, k.color2 || k.shorts, k.shorts]; };
    const skins = ['#e0b090', '#a87050', '#6a4028', '#f0c8a8', '#c89070'], hairs = ['#1a1210', '#3a2418', '#6a4a2a', '#c8a060', '#888'];
    const cells = [];
    for (let R = 0; R < P.NS; R++) for (let c = P.WS; c < P.COLS - P.WS; c++) cells.push({ c, R, z: map.height(c, R), end: false });
    for (let R = P.NS; R < P.ROWS - P.SA; R++) for (let c = 0; c < P.WS; c++) { cells.push({ c, R, z: map.height(c, R), end: 'w' }); cells.push({ c: P.COLS - 1 - c, R, z: map.height(P.COLS - 1 - c, R), end: 'e' }); }
    const per = Math.max(.15, Math.min(2, size / cells.length));
    for (const cell of cells) {
      if (!cell.z) continue;
      const n = Math.floor(per * (cell.end ? 1.1 : 2) + r());
      for (let i = 0; i < n; i++) {
        const x = cell.c * TS + 3 + (i % 2) * 8 + r() * (cell.end ? 9 : 3), y = cell.R * TS + 4 + r() * (cell.end ? 10 : 6);
        // the home end is west, the away end east; the long stand mixed by the home share
        const side = cell.end === 'w' ? 0 : cell.end === 'e' ? 1 : (r() < home ? 0 : 1);
        const cols = teamCols(side), sh = cols[Math.floor(r() * 2)];
        fans.push({ x, y, z: cell.z, side, shirt: sh, shirtSh: E.shade(sh, -.25), skin: skins[Math.floor(r() * 5)], hair: hairs[Math.floor(r() * 5)], scarf: cols[0], scarf2: cols[1], ph: r() * 9, kind: r() < .25 ? 1 : r() < .06 ? 2 : r() < .03 ? 3 : 0, front: cell.R === P.NS - 1 || cell.c === P.WS - 1 || cell.c === P.COLS - P.WS });
      }
    }
    // flares in the front rows (lit at Europhoria)
    this.flares = fans.filter(f => f.front && r() < .08);
  }
  /* ---- the camera director ---- */
  camera(dt) {
    const m = this.m, rf = this.replay && this.replay.frame(), b = rf ? rf.ball : m.ball;
    let fx = b.x + (b.vx || 0) * .3, fy = b.y + (b.vy || 0) * .3, fz = (b.z || 0) * .4, zoom = .9;
    const hum = m.slots.map(sl => sl.f).filter(Boolean);
    if (hum.length && !this.replay) { const h = hum[0].body; fx = lerp(fx, h.x, .25); fy = lerp(fy, h.y, .25); }
    if (m.mode === 'setpiece' || m.mode === 'kickoff') { const sp = m.sp; if (sp && sp.kind === 'corner') { fx = lerp(b.x, P.goalLineX(m.dir(sp.side)) - m.dir(sp.side) * 90, .6); fy = lerp(b.y, P.CY, .6); zoom = .9; } else if (sp && sp.kind === 'penalty') { zoom = 1.3; } else zoom = 1.1; }
    if (m.mode === 'shootout') zoom = 1.3;
    if (m.mode === 'goal' && m.celebration && m.celebration.scorer) { const s = m.celebration.scorer.body; fx = s.x; fy = s.y; zoom = 1.3; }
    if (m.superFlight && m.superFlight.phase === 'charge') zoom = 1.3;
    if (m.duel && m.superFlight) { const k = m.keeper[1 - m.superFlight.side].body; fx = k.x + (m.ball.x - k.x) * .3; fy = k.y - 30; fz = 0; zoom = 1.2; }
    if (m.mode === 'halftime' || m.mode === 'fulltime') zoom = .9;
    if (this.replay) zoom = 1.2;
    if (this.o.zoom) zoom = this.o.zoom;
    this.zoomNow = approach(this.zoomNow, zoom, dt * .8);
    if (Math.abs((game.zoomBase || 0) - this.zoomNow) > .01 && !this.o.noZoom) { game.setZoom(this.zoomNow); game.zoomBase = this.zoomNow; }
    game.focus(fx, fy, fz);
  }
  /* ---- the rigs, from each footballer's state ---- */
  rigState(f, rig, dt, src) {
    const m = this.m, b = src.body || src, t = this.t;
    const s = { x: b.x, y: b.y, z: b.z || 0, vx: b.vx || 0, vy: b.vy || 0, facing: src.facing, sprint: !!src.sprinting };
    const st = src.state, act = src.act;
    if (act && KICK[act.name]) s.attack = kickState(act);
    if (act && act.name === 'spin') s.facing += clamp(act.t / act.dur, 0, 1) * TAU;
    switch (st) {
      case 'slide': s.attack = { spec: KICK.slide, phase: 'active', u: .5 }; s.crouch = true; s.z = 0; break;
      case 'launched': s.flip = (src.flip || 0) * .99; s.air = true; s.hurt = true; s.expr = 'wince'; break;
      case 'down': s.down = 1; s.expr = 'wince'; s.attack = null; break;
      case 'getup': s.down = 0; break;
      case 'stunned': s.hurt = true; s.expr = 'wince'; break;
      case 'dive': { const k = src.stateT || 0; if (k < .45) { s.flip = Math.min(.95, k / .5); s.air = true; } else { s.down = 1; s.expr = 'wince'; } s.attack = null; break; }
      case 'air': s.air = true; if (src.air && src.air.kind === 'bicycle') { s.flip = Math.min(.5, (src.air.t || 0) / .8); s.attack = { spec: KICK.bicycle, phase: 'active', u: .5 }; } if (src.air && src.air.kind === 'divingHeader') { s.down = Math.min(1, (src.air.t || 0) * 5); s.z = 4; } break;
      case 'keeper-dive': { const u = src.diveU || 0, side = src.tiltSide || 0; if (side) { s.facing = Math.atan2(side, 0); s.down = Math.min(1, u * 3); } else s.pose = 'cast'; s.point = true; break; }
      case 'keeper-hold': s.pose = 'cast'; break;
      case 'off': s.expr = 'angry'; break;
    }
    if (src.gk && st === 'run' && src.set) s.pose = 'guard';
    if (src.lift) s.z += src.lift * 6;
    const cel = src.celebrate;
    if (cel) {
      const a = cel === 'pile' ? 'pile' : cel.anim, k = t * 1.0;
      s.expr = 'shout';
      if (a === 'pile' || a === 'cheer') { s.pose = 'cheer'; s.z += Math.abs(Math.sin(t * 7 + f.idx)) * 4; }
      else if (a === 'kneeslide') { s.pose = 'kneel'; }
      else if (a === 'backflip') { s.flip = (t * .9) % 1; s.air = true; s.z += Math.sin(((t * .9) % 1) * PI) * 12; }
      else if (a === 'cartwheel') { s.flip = (t * 1.1) % 1; s.facing += PI / 2; s.air = true; }
      else if (a === 'aeroplane') { s.pose = 'cast'; s.facing += Math.sin(t * 3) * .4; }
      else if (a === 'robot') { s.attack = { spec: E.MOVES.jab, phase: Math.floor(t * 3) % 2 ? 'active' : 'wind', u: (t * 3) % 1 }; }
      else if (a === 'shirt') { s.pose = 'cheer'; }
      else if (a === 'dance') { s.run = .6; s.pose = 'wave'; }
      else if (a === 'badgekiss') { s.pose = 'kneel'; s.expr = 'smile'; }
      else if (a === 'helicopter') { s.down = .8; s.facing = t * 9; }
      else if (a === 'fishslap') { s.attack = { spec: E.MOVES.jab, phase: (t * 2.5) % 1 < .3 ? 'active' : 'recover', u: ((t * 2.5) % 1) }; }
    }
    if (src.dejected) { s.pose = Math.sin(f.idx) > 0 ? 'kneel' : null; s.expr = 'wince'; }
    rig.update(dt, s);
  }
  update(dt) {
    const m = this.m; this.t += dt;
    const frame = this.replay && this.replay.frame();
    m.players.forEach((f, i) => this.rigState(f, this.rigs[i], dt, frame ? frame.p[i] : f));
    const o = frame ? frame.ref : m.official;
    if (o) {
      const sig = o.sig, s = { x: o.body ? o.body.x : o.x, y: o.body ? o.body.y : o.y, z: 0, vx: o.body ? o.body.vx : 0, vy: o.body ? o.body.vy : 0, facing: o.facing };
      if (sig === 'card') { s.pose = 'cheer'; s.expr = 'angry'; } else if (sig === 'advantage' || sig === 'tv') s.pose = 'cast'; else if (sig === 'point') s.point = true; else if (sig === 'ear') s.pose = 'wave'; else if (sig === 'whistle') s.expr = 'shout';
      if ((o.downT || 0) > 0) { s.down = 1; s.expr = 'wince'; }
      this.refRig.update(dt, s);
    }
    // the crowd's mood: danger, goals, conceding
    for (let s = 0; s < 2; s++) {
      const u = P.toUV(m.dir(s), m.ball.x, m.ball.y)[0];
      const target = clamp((u - .4) * 1.4 + m.euph[s] / 160, 0, 1);
      this.mood[s] = approach(this.mood[s], target, dt * (target > this.mood[s] ? 2 : .6));
      this.crowdT[s] = Math.max(0, this.crowdT[s] - dt); if (this.crowdT[s] <= 0) this.crowdState[s] = m.euph[s] >= 67 ? 3 : 0;
    }
    if (m.euph[0] >= 67 && m.score[0] - m.score[1] >= 2 || m.euph[1] >= 67 && m.score[1] - m.score[0] >= 2) this.wave = (this.wave < 0 ? 0 : this.wave + dt * .35) % 1; else this.wave = -1;
    this.boardT = Math.max(0, this.boardT - dt); if (this.boardT <= 0) this.boardText = null;
    if (!this.o.noCamera) this.camera(dt);
    for (const fw of this.fireworks) fw.t -= dt; this.fireworks = this.fireworks.filter(f => f.t > 0);
    // trails behind fast balls
    const b = frame ? frame.ball : m.ball, sp = hyp(b.vx || 0, b.vy || 0);
    if (sp > 300 || b.superPath) { this.trail.push({ x: b.x, y: b.y, z: b.z, t: .25 }); }
    for (const q of this.trail) q.t -= dt; this.trail = this.trail.filter(q => q.t > 0);
  }
  react(type, ev) {
    const m = this.m, s = ev.side;
    const set = (side, st, t) => { if (side == null || side < 0) return; this.crowdState[side] = st; this.crowdT[side] = t; };
    if (type === 'goal') { set(ev.side, 2, 4); set(1 - ev.side, 5, 3); this.boardText = 'GOAL! GOAL! GOAL!'; this.boardT = 5; if (m.st.id === 'euphorium') this.firework(4); }
    if (type === 'ownGoal') { set(ev.side, 2, 3); set(1 - ev.side, 5, 3); this.boardText = 'GOAL!'; this.boardT = 4; }
    if (type === 'save' || type === 'woodwork') { const d = m.last ? 1 - m.last.side : 0; set(type === 'save' ? ev.side : d, 1, 1.5); set(type === 'save' ? 1 - ev.side : 1 - d, 5, 1.5); }
    if (type === 'diveBooked' || type === 'card') { set(ev.side, 4, 2); }
    if (type === 'europhoria') { set(ev.side, 2, 2); this.boardText = 'EUROPHORIA!'; this.boardT = EF.T.europhoriaTime; this.boardSide = ev.side; if (m.st.id === 'euphorium') this.firework(3); }
    if (type === 'nutmeg') set(ev.side, 1, 1.2);
    if (type === 'fireworks') this.firework(8);
  }
  firework(n) { for (let i = 0; i < n; i++) this.fireworks.push({ x: P.X0 + EF.fx() * P.L, y: -40 - EF.fx() * 40, z: 160 + EF.fx() * 80, t: 1.4 + i * .3, c: EF.fxPick(['#ff5a5a', '#ffe03a', '#3aff9a', '#5aa0ff', '#ff7ad0']), boom: false }); }

  /* ---- drawing ---- */
  draw(r) {
    const m = this.m, st = m.st, frame = this.replay && this.replay.frame(), t = this.t, ev = m.ev;
    const night = st.time === 'night', dusk = st.time === 'dusk';
    // lights: the stadium's ambient, the floodlights at the corners (failing in the floodlight event)
    const dark = ev && ev.id === 'floodlight' && ev.dark;
    LIGHTS.enabled = !!(st.lights && st.lights.ambient < 1) || dark;
    LIGHTS.ambient = dark ? .14 : (st.lights ? st.lights.ambient : 1) + (m.half === 2 && dusk ? -.1 : 0);
    r.sky(st.look.sky || ['#102040', '#304070', '#6080a0']);
    const top = r.w(P.CX, 0, (st.look.tiers || [64])[3] + 4);
    EF.drawSkyline(r.ctx, r, st, t, Math.round(top[1]), r.bw);
    if (night) for (let i = 0; i < 30; i++) { const x = (E.hash2(i, 7) * r.bw) | 0, y = (E.hash2(i, 9) * Math.max(10, top[1] - 20)) | 0; px.dot(r.ctx, x, y, i % 3 ? '#8890b0' : '#ffffff'); }
    // the fireworks over the stands
    for (const fw of this.fireworks) { if (fw.t < 1.2 && !fw.boom) { fw.boom = true; PFX.explosion(fw.x, fw.y, fw.z, 1.4, { debris: false, shake: 0 }); PFX.glints(fw.x, fw.y, fw.z, 24, fw.c); A.sfx('explode', { vol: .25 }); } }
    m.map.drawFloor(r); m.map.queueWalls(r);
    this.drawStands(r, t);
    this.drawBoards(r, t);
    this.drawGoals(r);
    this.drawFlags(r, t);
    if (st.lights && st.lights.flood) this.drawFloodlights(r, dark);
    // the dugouts and the fourth official
    for (const dx of [-120, 120]) r.queue(P.CX + dx, P.Y1 + 30, 0, g => { const w = r.w(P.CX + dx - 30, P.Y1 + 38, 0), w2 = r.w(P.CX + dx + 30, P.Y1 + 38, 18); px.rect(g, Math.round(w[0]), Math.round(w2[1]), Math.round(w2[0] - w[0]), Math.round(w[1] - w2[1]), '#2a3a5a'); px.rect(g, Math.round(w[0]) + 2, Math.round(w2[1]) + 2, Math.round(w2[0] - w[0]) - 4, Math.round(w[1] - w2[1]) - 6, '#a8c8e0'); });
    if (m.boardShown && m.half <= 2 && m.minute > m.half * 45 - 2 && m.minute < m.half * 45 + 1.5) r.queue(P.CX, P.Y1 + 14, 0, g => { const [x, y] = r.w(P.CX, P.Y1 + 14, 30); px.rect(g, Math.round(x) - 9, Math.round(y) - 6, 18, 12, '#141414'); E.font.text(g, '+' + m.stoppage, Math.round(x), Math.round(y) - 4, '#ff3a3a', { align: 'center', outline: false }); }, { emissive: true });
    // the bus
    if (m.bus && m.bus.on) { const k = m.bus, cx = (k.x0 + k.x1) / 2; r.queue(cx, P.CY + 30, 0, g => { const [x, y] = r.w(cx, P.CY + 30, 0), [, yt] = r.w(cx, P.CY - 30, 30); EF.drawBus(g, x, y, Math.max(.6, (y - yt) / 40), '#7a1a2a', false); }, { bias: 2 }); }
    // the players
    const view = E.charView(r.view);
    m.players.forEach((f, i) => {
      const src = frame ? frame.p[i] : { x: f.body.x, y: f.body.y, z: f.body.z, gone: f.state === 'gone' };
      if (src.gone || src.x < -1000) return;
      r.shadow(src.x, src.y, 6, .35);
      const rig = this.rigs[i], glow = frame ? src.glow : f.glow;
      r.actor(src.x, src.y, src.z, (g, ox, oy) => rig.draw(g, ox, oy, view), glow ? { flash: Math.floor(this.t * 6) % 2 ? '#ffffff' : '#ffe08a', flashMix: .22, emissive: true } : {});
      if (!frame && f.celebrate && f.celebrate.anim === 'shirt') r.queue(src.x, src.y, 30, g => { const [x, y] = r.w(src.x, src.y, 30); px.ell(g, Math.round(x), Math.round(y), 5, 4, this.kits[f.side].shirt); }, { bias: 3 });
      if (!frame && f.celebrate && f.celebrate.anim === 'fishslap') { const h = this.rigs[i].hand ? this.rigs[i].hand('R') : null; if (h) r.sprite(h.x !== undefined ? h.x : h[0], h.y !== undefined ? h.y : h[1], (h.z !== undefined ? h.z : h[2]) || 16, EF.FISH_PROP, { anchor: 'center' }); }
    });
    // the referee
    const o = frame ? frame.ref : m.official;
    if (o) { const ox = o.body ? o.body.x : o.x, oy = o.body ? o.body.y : o.y; r.shadow(ox, oy, 5, .3); r.actor(ox, oy, 0, (g, x, y) => this.refRig.draw(g, x, y, view)); if (o.sig === 'card' && !frame) { const c = m.cards[m.cards.length - 1]; r.sprite(ox, oy, 40, c && c.kind !== 'yellow' ? EF.CARD.red : EF.CARD.yellow, { anchor: 'center' }); } }
    // the ball, its shadow, its trail, the decoys
    const b = frame ? frame.ball : m.ball, style = this.o.ball || (st.ballStyle) || 'classic';
    const frames = (EF.BALLS[b.superName && m.superFlight && m.superFlight.def.ball === 'gold' ? 'gold' : style] || EF.BALLS.classic).frames;
    for (const q of this.trail) r.queue(q.x, q.y, q.z + 2, g => { const [x, y] = r.w(q.x, q.y, q.z + 2); px.blend(g, q.t * 2, 'add', () => px.disc(g, Math.round(x), Math.round(y), 2, m.superFlight ? (m.superFlight.def.color || '#ffd040') : '#ffffff')); }, { emissive: true });
    if (!(b.x < -1000)) {
      r.shadow(b.x, b.y, 3 - Math.min(1.5, (b.z || 0) * .03), .45 - Math.min(.3, (b.z || 0) * .004));
      const kipper = m.superFlight && m.superFlight.def.ball === 'kipper' && m.superFlight.phase !== 'charge';
      if (kipper) r.sprite(b.x, b.y, (b.z || 0) + 2.5, EF.KIPPER_SPR, { anchor: 'center', glow: true });
      else r.sprite(b.x, b.y, (b.z || 0) + 2.5, frames[Math.floor((b.roll || 0) / 5) % 4], { anchor: 'center', glow: !!b.superPath });
      if (b.decoys) for (const d of b.decoys) r.sprite(d.x, d.y, d.z + 2.5, EF.BALLS.gold.frames[Math.floor(t * 20) % 4], { anchor: 'center', glow: true });
      if (night || dark) LIGHTS.add(b.x, b.y, (b.z || 0) + 4, 18, dark ? .7 : .2, { color: '#ffffff' });
    }
    // matchday events' actors
    if (ev) this.drawEvent(r, ev, view, t);
    if (m.euroT[0] > 0 || m.euroT[1] > 0) for (const f of this.flares) if (m.euroT[f.side] > 0) LIGHTS.add(f.x, f.y, f.z + 8, 40, .6, { color: '#ff3a2a' });
    // fog (Lucchetto's second half) and flare smoke
    const fog = st.fogAll || (st.fogSecondHalf && m.half >= 2);
    if (fog || (ev && ev.id === 'flaresmoke')) r.overlay(g => {
      if (fog) for (let i = 0; i < 4; i++) px.polyDither(g, [[0, r.H * (.1 + i * .1)], [r.W, r.H * (.1 + i * .1)], [r.W, r.H], [0, r.H]], '#c8c8d0', .12 + i * .04, r.ix + i * 3, r.iy);
      if (ev && ev.id === 'flaresmoke') { const [, sy] = r.w(P.CX, ev.y, 0); const k = Math.min(1, ev.t / 2) * Math.min(1, (15 - ev.t) / 2); for (let i = 0; i < 3; i++) px.polyDither(g, [[0, sy - 40 - i * 10], [r.W, sy - 60 - i * 10], [r.W, sy + 30], [0, sy + 50]], i ? '#e04a3a' : '#c8a0a0', .25 * k, r.ix + Math.round(t * 20) + i, r.iy); }
    });
  }
  drawStands(r, t) {
    const m = this.m, st = m.st, euro = [m.euroT[0] > 0, m.euroT[1] > 0];
    for (const f of this.fans) {
      if (!r.visible(f.x, f.y, f.z, 20, 20, 20)) continue;
      let s = this.crowdState[f.side];
      if (euro[f.side]) s = (Math.floor(t * 2 + f.ph) % 3 === 0) ? 2 : 3;
      if (this.wave >= 0) { const u = (f.x - P.X0) / P.L; if (Math.abs(u - this.wave) < .06) s = 1; }
      if (s === 0 && this.mood[f.side] > .7 && Math.sin(t * 3 + f.ph) > .8) s = 1;
      r.queue(f.x, f.y, f.z, g => { const [x, y] = r.w(f.x, f.y, f.z); EF.drawFan(g, x, y, f, s, t); });
    }
    // flares: fire and smoke in the front rows of a side in Europhoria
    for (const f of this.flares) if (euro[f.side] && EF.fxRng() < .15) { PFX.fire(f.x, f.y, f.z + 6, 1, { size: .6 }); if (EF.fxRng() < .3) PFX.smoke(f.x, f.y, f.z + 10, 1, { size: .8, color: '#c84a3a' }); }
    // the tifo: unrolled over the side's end of the long stand during its Europhoria
    for (let s = 0; s < 2; s++) {
      if (m.euroT[s] <= 0) continue;
      const u = Math.min(1, (EF.T.europhoriaTime - m.euroT[s]) / 1) * Math.min(1, m.euroT[s] / .6);
      const homeEnd = (s === 0) !== m.swapped ? 0 : 1;
      const x0 = homeEnd === 0 ? P.X0 - 40 : P.CX + 40, x1 = homeEnd === 0 ? P.CX - 40 : P.X1 + 40, z = (st.look.tiers || [64])[3];
      r.queue((x0 + x1) / 2, 2, z, g => { const a = r.w(x0, 4, z + 30), b = r.w(x1, 4, z - 10); EF.drawTifo(g, m.teams[s], a[0], a[1], b[0] - a[0], b[1] - a[1], u); }, { bias: 2 });
    }
  }
  drawBoards(r, t) {
    const m = this.m, st = m.st, boards = st.boards || ['EUROPHORIA'], y = P.Y0 - 0.5;
    const euroSide = m.euroT[0] > 0 ? 0 : m.euroT[1] > 0 ? 1 : -1;
    const segs = 6, segW = (P.X1 - P.X0 + 120) / segs;
    for (let i = 0; i < segs; i++) {
      const x0 = P.X0 - 60 + i * segW, x1 = x0 + segW - 4;
      r.queue((x0 + x1) / 2, y, 0, g => {
        const a = r.w(x0, y, 21), b = r.w(x1, y, 5);
        const X = Math.round(a[0]), Y = Math.round(a[1]), W = Math.round(b[0] - a[0]), H = Math.max(4, Math.round(b[1] - a[1]));
        if (W < 4) return;
        const bg = euroSide >= 0 ? this.kits[euroSide].shirt : this.boardText ? '#c8202a' : '#0a0c18';
        px.rect(g, X, Y, W, H, bg);
        for (let k = 0; k < W; k += 2) if ((k + i) % 6 === 0) px.rect(g, X + k, Y, 1, H, '#00000030');
        const text = this.boardText || boards[(i + Math.floor(t / 6)) % boards.length], tw = E.font.width(text);
        const off = Math.round((t * 30) % (tw + W)), fs = H >= 9 ? 1 : null;
        if (fs) { g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip(); E.font.text(g, text, X + W - off, Y + Math.round((H - 7) / 2), euroSide >= 0 ? (E.hex(this.kits[euroSide].shirt).reduce((p, q) => p + q) > 450 ? '#141414' : '#ffffff') : this.boardText ? '#ffffff' : ['#ffc83a', '#5ae0ff', '#ff7ad0'][i % 3], { outline: false }); g.restore(); }
      }, { emissive: true, bias: 1 });
    }
  }
  drawGoals(r) {
    for (const gx of [P.X0, P.X1]) {
      const back = gx === P.X0 ? gx - P.NET : gx + P.NET, gH = P.GH, bar = P.BAR;
      // the net: back and sides, a dithered mesh
      r.queue(back, P.CY, 0, g => {
        for (let i = 0; i <= 8; i++) { const yy = P.CY - gH + i * gH / 4; const a = r.w(back, yy, 0), b = r.w(back, yy, bar - 6); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#d8dce8'); }
        for (let k = 0; k <= 4; k++) { const z = k * (bar - 6) / 4, a = r.w(back, P.CY - gH, z), b = r.w(back, P.CY + gH, z); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8ccd8'); }
      }, { bias: -2 });
      for (const py of [P.CY - gH, P.CY + gH]) r.queue((gx + back) / 2, py, 0, g => {
        for (let k = 0; k <= 4; k++) { const z = k * (bar - 6) / 4, a = r.w(gx, py, bar * (k / 4)), b = r.w(back, py, z); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8ccd8'); }
        for (let i = 0; i <= 3; i++) { const xx = lerp(gx, back, i / 3), a = r.w(xx, py, 0), b = r.w(xx, py, lerp(bar, bar - 6, i / 3)); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8ccd8'); }
      });
      // the roof of the net
      r.queue((gx + back) / 2, P.CY, bar, g => { const a = r.w(gx, P.CY - gH, bar), b = r.w(gx, P.CY + gH, bar), c = r.w(back, P.CY + gH, bar - 6), d = r.w(back, P.CY - gH, bar - 6); px.polyDither(g, [a, b, c, d], '#e8ecf4', .3, r.ix, r.iy); }, { bias: 1 });
      // the posts and the bar
      for (const py of [P.CY - gH, P.CY + gH]) r.queue(gx, py, 0, g => { const [x, y] = r.w(gx, py, 0), [, y1] = r.w(gx, py, bar); px.rect(g, Math.round(x) - 1, Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); px.rect(g, Math.round(x) + 1, Math.round(y1), 1, Math.round(y - y1), '#a8acb8'); }, { bias: 1 });
      r.queue(gx, P.CY + gH, bar, g => { const a = r.w(gx, P.CY - gH, bar), b = r.w(gx, P.CY + gH, bar); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#f4f4f0', 2); }, { bias: 2 });
    }
  }
  drawFlags(r, t) {
    const col = this.kits[0].shirt;
    for (const x of [P.X0, P.X1]) for (const y of [P.Y0, P.Y1]) r.queue(x, y, 0, g => {
      const [px0, py0] = r.w(x, y, 0), [, py1] = r.w(x, y, 22); px.line(g, Math.round(px0), Math.round(py0), Math.round(px0), Math.round(py1), '#e8e8e0');
      const w = Math.round(Math.sin(t * 5 + x) * 1.5); px.poly(g, [[px0, py1], [px0 + 7 + w, py1 + 2], [px0, py1 + 5]], col);
    });
  }
  drawFloodlights(r, dark) {
    const m = this.m, col = (m.st.lights && m.st.lights.color) || '#fff0d0';
    for (const [x, y] of [[P.X0 - 70, -20], [P.X1 + 70, -20], [P.X0 - 70, P.Y1 + 60], [P.X1 + 70, P.Y1 + 60]]) {
      const far = y < 0;
      if (far) r.queue(x, y, 0, g => {
        const [bx, by] = r.w(x, y, 0), [tx, ty] = r.w(x, y, 190);
        px.line(g, Math.round(bx) - 3, Math.round(by), Math.round(tx), Math.round(ty), '#5a5a68', 1); px.line(g, Math.round(bx) + 3, Math.round(by), Math.round(tx), Math.round(ty), '#5a5a68', 1);
        for (let k = 1; k < 8; k++) { const yy = lerp(by, ty, k / 8); px.line(g, Math.round(lerp(bx - 3, tx, k / 8)), Math.round(yy), Math.round(lerp(bx + 3, tx, (k + 1) / 8)), Math.round(lerp(by, ty, (k + 1) / 8)), '#4a4a58'); }
        px.rect(g, Math.round(tx) - 10, Math.round(ty) - 8, 20, 9, '#2a2a34');
        if (!dark) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) px.rect(g, Math.round(tx) - 9 + i * 5, Math.round(ty) - 7 + j * 4, 3, 3, '#fffbe8');
      }, { emissive: !dark });
      if (!dark) LIGHTS.add(lerp(x, P.CX, .35), lerp(y, P.CY, .35), 120, 480, .55, { color: col });
    }
  }
  drawEvent(r, ev, view, t) {
    if (ev.id === 'seagull') {
      const gx = ev.landed ? ev.x : lerp(P.X0, ev.x, Math.min(1, ev.t / 3)), gy = ev.landed ? ev.y : ev.y - 60 * (1 - Math.min(1, ev.t / 3)), gz = ev.landed && !ev.gone ? 6 : ev.gone ? 6 + (ev.t - ev.goneT) * 40 : 60 * (1 - Math.min(1, ev.t / 3)) + 6;
      if (!this.gull) this.gull = new E.Blob({ R: 4, wings: true, feet: true, colors: { dk: '#a8acb8', base: '#f4f4f0', lt: '#ffffff', spec: '#fff', eye: '#141414', pupil: '#141414' } });
      this.gull.update(1 / 60, { flap: ev.landed && !ev.gone ? 0 : 1, squash: Math.sin(t * 9) * .05 });
      r.actor(gx, gy, gz, (g, x, y) => this.gull.draw(g, x, y, view));
    }
    if (ev.id === 'beachball' && ev.body && !ev.popped) { const k = ev.body; r.shadow(k.x, k.y, 6, .3); r.queue(k.x, k.y, k.z + 7, g => { const [x, y] = r.w(k.x, k.y, k.z + 7); px.disc(g, Math.round(x), Math.round(y), 6, '#f4f4f0'); px.poly(g, [[x, y - 6], [x + 6, y], [x, y]], '#ff4a4a'); px.poly(g, [[x, y + 6], [x - 6, y], [x, y]], '#3a8aff'); px.poly(g, [[x - 6, y], [x, y - 6], [x, y]], '#ffd03a'); }); }
    if ((ev.id === 'invader-keith' || ev.id === 'invader-stag') && ev.body) {
      if (!this.invRig) { this.invRig = new E.Humanoid({ weapon: null, build: 'bulky', size: 1.1, colors: ev.id === 'invader-keith' ? { cloth: '#c8803a', pants: '#c8803a', skin: '#e0b090' } : { cloth: '#8a6a4a', pants: '#5a4a3a', skin: '#e0b090' } }); this.stewRigs = [0, 1].map(() => new E.Humanoid({ weapon: null, size: 1.05, colors: { cloth: '#d8f03a', pants: '#2a2a3a', skin: '#c89070' } })); }
      const k = ev.body; this.invRig.update(1 / 60, { x: k.x, y: k.y, z: 0, vx: k.vx, vy: k.vy, facing: Math.atan2(k.vy, k.vx), pose: ev.caught ? null : 'cheer' });
      r.shadow(k.x, k.y, 6, .3); r.actor(k.x, k.y, 0, (g, x, y) => this.invRig.draw(g, x, y, view));
      r.queue(k.x, k.y, 34, g => { const [x, y] = r.w(k.x, k.y, 32); if (ev.id === 'invader-keith') { px.ell(g, Math.round(x), Math.round(y), 8, 5, '#c8803a'); px.poly(g, [[x + 7, y], [x + 12, y - 4], [x + 12, y + 4]], '#c8803a'); px.dot(g, Math.round(x - 4), Math.round(y - 1), '#141414'); } else { px.ell(g, Math.round(x), Math.round(y), 5, 5, '#8a6a4a'); for (const d of [-1, 1]) { px.line(g, x + d * 3, y - 3, x + d * 9, y - 12, '#e8d8b0'); px.line(g, x + d * 6, y - 7, x + d * 11, y - 7, '#e8d8b0'); } } }, { bias: 3 });
      ev.stewards.forEach((s, i) => { this.stewRigs[i].update(1 / 60, { x: s.x, y: s.y, z: 0, vx: s.vx, vy: s.vy, facing: Math.atan2(s.vy, s.vx) }); r.actor(s.x, s.y, 0, (g, x, y) => this.stewRigs[i].draw(g, x, y, view)); });
    }
    if (ev.id === 'drone' && ev.x != null) r.queue(ev.x, ev.y, 90, g => { const [x, y] = r.w(ev.x, ev.y, 90); px.rect(g, Math.round(x) - 4, Math.round(y) - 1, 8, 3, '#2a2a34'); for (const d of [-6, 6]) px.rect(g, Math.round(x + d) - 2, Math.round(y) - 3 + (Math.floor(t * 30) % 2), 4, 1, '#c8c8d0'); px.dot(g, Math.round(x), Math.round(y) + 2, Math.floor(t * 4) % 2 ? '#ff3a3a' : '#3a3a3a'); }, { emissive: true });
  }
}
EF.MatchView = MatchView;


/* ===== 22-replay.js ===== */
/* 22-replay: a ring buffer of the last 8 s at 60 Hz (the ball, every footballer's state, the referee, the sounds), and a
 * player that shows a goal again at half speed from a turned camera, with a REPLAY tag and scanlines. */
const REC_HZ = 60, REC_MAX = 8 * REC_HZ;
const snapF = f => ({ x: f.body.x, y: f.body.y, z: f.body.z, vx: f.body.vx, vy: f.body.vy, facing: f.facing, state: f.state, stateT: f.stateT, act: f.act ? { name: f.act.name, t: f.act.t, dur: f.act.dur } : null,
  flip: f.flip, diveU: f.diveU, tiltSide: f.tiltSide, sprinting: f.sprinting, lift: f.lift, glow: f.glow, celebrate: f.celebrate, dejected: f.dejected, set: f.set, gk: f.gk, air: f.air ? { kind: f.air.kind, t: f.air.t } : null, gone: f.state === 'gone' || f.body.x < -1000 });
class Recorder {
  constructor(m) { this.m = m; this.frames = []; this.acc = 0; this.sfx = []; }
  step(dt) {
    this.acc += dt; if (this.acc < 1 / REC_HZ) return; this.acc -= 1 / REC_HZ;
    const m = this.m, b = m.ball, o = m.official;
    this.frames.push({ t: m.t, p: m.players.map(snapF), ball: { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, roll: b.roll, superPath: b.superPath, superName: b.superName, decoys: b.decoys ? b.decoys.map(d => Object.assign({}, d)) : null },
      ref: o ? { x: o.body.x, y: o.body.y, vx: o.body.vx, vy: o.body.vy, facing: o.facing, sig: o.sig, downT: o.downT } : null, sfx: this.sfx.splice(0) });
    if (this.frames.length > REC_MAX) this.frames.shift();
  }
  cue(name) { this.sfx.push(name); }
  clip(t0, t1) { return this.frames.filter(f => f.t >= t0 && f.t <= t1); }
}
EF.Recorder = Recorder;
class ReplayPlayer {
  constructor(frames, o = {}) { this.frames = frames; this.i = 0; this.u = 0; this.speed = o.speed || .5; this.done = !frames.length; this.yaw = o.yaw || 45; this.played = -1; }
  frame() { return this.frames[Math.min(this.frames.length - 1, Math.floor(this.i))] || null; }
  update(dt) {
    if (this.done) return;
    this.i += dt * REC_HZ * this.speed;
    const k = Math.floor(this.i);
    for (let j = this.played + 1; j <= Math.min(k, this.frames.length - 1); j++) for (const s of this.frames[j].sfx) EF.sfx(s, { pitch: .6 });
    this.played = Math.max(this.played, k);
    if (this.i >= this.frames.length - 1) this.done = true;
  }
}
EF.ReplayPlayer = ReplayPlayer;


/* ===== 23-commentary.js ===== */
/* 23-commentary: BARRY BELLOW (play-by-play) and TREV BRICKLEY (the deadpan ex-centre-half) on a radio box, and the
 * stadium's PA announcer at the top. Events map to line pools (registry 'lines'), by priority, with cooldowns, no repeats
 * in a match, the partner's reply straight after, variables, and idle chatter. Every line is spoken in babble. */
EF.SPEAKERS = {
  barry: { name: 'BARRY BELLOW', voice: { f0: 160, wave: 'saw', rate: 1.1, formant: 1.05 }, rig: { hair: 'short', colors: { cloth: '#8a2a3a', hair: '#6a4a2a', skin: '#f0c8a8', hat: '#2a2a30' }, hat: { style: 'band', color: '#2a2a30' } } },
  trev: { name: 'TREV BRICKLEY', voice: { f0: 95, wave: 'pulse', rate: .85, formant: .9 }, rig: { hair: 'bald', build: 'bulky', colors: { cloth: '#3a4a6a', hair: '#8a7a6a', skin: '#e0b090', hat: '#2a2a30' }, hat: { style: 'band', color: '#2a2a30' } } },
  pa: { name: 'STADIUM ANNOUNCER', voice: { f0: 120, wave: 'saw', rate: 1, echo: 1 } },
  mags: { name: 'MAGS MULLIGAN', voice: { f0: 215, wave: 'saw', rate: 1, breath: .25 }, rig: { hair: 'long', hat: 'cap', colors: { cloth: '#2a4a3a', coat: '#2a4a3a', hair: '#a8a8a8', skin: '#f0c8a8', hat: '#5a4a3a', trim: '#f08a24' }, outfit: 'coat' } },
  baron: { name: 'BARON VON BULLION', voice: { f0: 80, wave: 'saw', rate: .9, vib: .03 }, rig: { build: 'bulky', hair: 'bald', hat: { style: 'crown', color: '#e8c040' }, outfit: 'coat', colors: { cloth: '#141414', coat: '#2a1a3a', hair: '#e8c040', skin: '#f0d0b0', trim: '#e8c040' } } },
  ref: { name: 'THE REFEREE', voice: { f0: 135, wave: 'saw', rate: 1.2 } },
  trevcard: { name: 'TREV BRICKLEY', voice: { f0: 95, wave: 'pulse', rate: .85, formant: .9 } }
};
for (const [id, s] of Object.entries(EF.SPEAKERS)) EF.babble.speakers[id] = Object.assign({ formant: 1, breath: 0, vib: 0, echo: 0 }, s.voice);
EF.initSpeakers = () => { for (const t of EF.all('team')) for (const p of t.players) EF.babble.speakers[p.id] = Object.assign({ f0: 150, wave: 'saw', rate: 1, formant: 1 }, p.voice || { f0: 110 + (p.id.length * 17) % 150, wave: p.id.length % 2 ? 'saw' : 'pulse' }); };
const RIGS = {};
/** a speaker's portrait rig (story characters, commentators, players) */
EF.portraitOf = id => {
  if (RIGS[id]) return RIGS[id];
  const sp = EF.SPEAKERS[id];
  if (sp && sp.rig) return (RIGS[id] = new E.Humanoid(Object.assign({ weapon: null, build: 'heroic', size: 1.1, sleeves: 'long' }, sp.rig)));
  for (const t of EF.all('team')) { const p = t.players.find(q => q.id === id); if (p) { const k = p.pos === 'GK' ? t.kits.keeper : t.kits.home; return (RIGS[id] = makeRig({ data: p, gk: p.pos === 'GK' }, k, t.kits.keeper)); } }
  return (RIGS[id] = new E.Humanoid({ weapon: null }));
};
EF.speakerName = id => { const s = EF.SPEAKERS[id]; if (s) return s.name; for (const t of EF.all('team')) { const p = t.players.find(q => q.id === id); if (p) return p.name; } return id.toUpperCase(); };
const PRIORITY = { goal: 100, goalKip: 100, goldengoal: 100, owngoal: 95, super: 95, duelPerfect: 90, duelGood: 90, duelMiss: 90, red: 85, penalty: 80, shootout: 78, busSmash: 76, bus: 75, woodwork: 70, card: 65, var: 60, varDecision: 62, simulation: 58, dive: 55, save: 50, miss: 45, header: 45, bicycle: 48, volley: 44, europhoria: 47, launch: 40, foul: 38, refHit: 42, skill: 30, nutmeg: 34, tackle: 25, kickoff: 20, secondhalf: 20, halftime: 60, fulltime: 70, fulltimeKip: 72, corner: 18, freekick: 18, crowdThrow: 15, advantage: 22, block: 28, event: 40, idle: 5, weather: 6 };
class Commentary {
  constructor(m, o = {}) {
    this.m = m; this.o = o; this.used = new Set(); this.cool = {}; this.lastT = -9; this.queue = []; this.idle = 0; this.heard = 0;
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffc83a' });
    this.pa = new E.Dialog(game, { lines: 1, place: 'top', border: '#5ae0ff' });
    this.paIdle = 18;
  }
  vars(ev) {
    const m = this.m, who = ev && ev.who != null ? m.players[ev.who] : (m.last || m.owner), side = ev && ev.side != null ? ev.side : who ? who.side : 0;
    const t = m.teams[side] || m.teams[0], o = m.teams[1 - side] || m.teams[1];
    return { player: who ? who.data.name : 'HIM', team: t.name, opp: o.name, score: m.score[0] + '-' + m.score[1], minute: Math.floor(m.minute), stadium: m.st.name, keeper: m.keeper[1 - side] ? m.keeper[1 - side].data.name : 'THE KEEPER', ref: m.ref ? m.ref.name : 'THE REFEREE', home: m.teams[0].name, away: m.teams[1].name };
  }
  pick(pool, ev) {
    const P_ = EF.get('lines', pool); if (!P_) return null;
    const ok = P_.list.filter((e, i) => !this.used.has(pool + i) && (!e.when || e.when(this.m, ev)));
    if (!ok.length) return null;
    const e = ok[Math.floor(EF.fxRng() * ok.length)]; this.used.add(pool + P_.list.indexOf(e));
    return e;
  }
  /** an event happened: maybe a line from its pool, now or next */
  hear(pool, ev = {}) {
    if (game.settings.commentary === 'off' || this.o.silent) return false;
    const m = this.m, pr = PRIORITY[pool] || 10;
    if (this.m.t - (this.cool[pool] || -99) < 8 && pr < 90) return false;
    const busy = this.talk.open, curPr = this.curPr || 0;
    if (busy && pr <= curPr) return false;
    if (!busy && this.m.t - this.lastT < (pr >= 60 ? 0 : 3.5)) return false;
    const e = this.pick(pool, ev); if (!e) return false;
    this.cool[pool] = this.m.t; this.queue = [];
    this.say(e.who, e.text, ev, pr);
    if (e.reply) this.queue.push([e.reply.who, e.reply.text, ev, pr]);
    return true;
  }
  say(who, text, ev, pr) {
    const sp = EF.SPEAKERS[who] || EF.SPEAKERS.barry;
    this.talk.voice = EF.babble.voiceFor(who);
    this.talk.say(text, { name: sp.name, portrait: EF.portraitOf(who), portraitOpts: { zoom: 3, turn: .4 }, auto: 2.2, modal: false, alpha: .85, vars: this.vars(ev) });
    this.curPr = pr; this.lastT = this.m.t; this.idle = 0; this.heard++;
    EF.bus.emit('line', { who, text, match: this.m });
  }
  announce(text) {
    if (this.o.silent) return;
    EF.sfx('chime'); this.pa.voice = EF.babble.voiceFor('pa');
    this.pa.say(text, { name: 'PA', auto: 3, modal: false, alpha: .8, vars: this.vars({}) });
  }
  update(dt) {
    const m = this.m;
    this.talk.update(dt); this.pa.update(dt);
    if (!this.talk.open) { this.curPr = 0; if (this.queue.length) { const [w, t, ev, pr] = this.queue.shift(); this.say(w, t, ev, pr); } }
    if (m.mode === 'play') {
      this.idle += dt;
      if (this.idle > 12 && !this.talk.open) { this.idle = 0; const w = m.st.weather && m.st.weather.kind; const pool = EF.fxRng() < .35 && (w || (m.st.fogSecondHalf && m.half >= 2)) ? 'weather-' + (m.st.fogSecondHalf && m.half >= 2 ? 'fog' : w) : 'idle'; this.hear(pool, {}); }
      this.paIdle -= dt;
      if (this.paIdle <= 0 && !this.pa.open) { this.paIdle = 35 + EF.fxRng() * 30; const e = this.pick('pa', {}); if (e) this.announce(e.text); }
    }
  }
  draw(r) { this.talk.draw(r); this.pa.draw(r); }
}
EF.Commentary = Commentary;
/** what each event says (the pool), with any condition */
EF.commentaryFor = (c, type, ev) => {
  const m = c.m, kip = s => m.teams[s] && m.teams[s].id === 'kipperton';
  switch (type) {
    case 'kickoff': return c.hear(ev.half === 2 && ev.fresh ? 'secondhalf' : ev.fresh ? 'kickoff' : 'restart', ev);
    case 'goal': return c.hear(m.flags.goldenGoal ? 'goldengoal' : m.ball.superName ? 'superGoal' : kip(ev.side) && EF.fxRng() < .6 ? 'goalKip' : 'goal', ev);
    case 'ownGoal': return c.hear('owngoal', ev);
    case 'woodwork': return c.hear('woodwork', ev);
    case 'save': return c.hear('save', ev);
    case 'shot': if (!ev.onTarget && ev.kind !== 'penalty') return c.hear('miss', ev); return;
    case 'header': return c.hear('header', ev);
    case 'bicycle': return c.hear('bicycle', ev);
    case 'volley': return c.hear('volley', ev);
    case 'tackleWon': return c.hear('tackle', ev);
    case 'launch': return c.hear('launch', ev);
    case 'foul': return c.hear('foul', ev);
    case 'card': return c.hear(ev.kind === 'red' ? 'red' : 'card', ev);
    case 'diveWon': return c.hear('dive', ev);
    case 'diveBooked': return c.hear('simulation', ev);
    case 'var': return c.hear('var', ev);
    case 'varDecision': return c.hear(ev.overturned ? 'varOverturn' : 'varStands', ev);
    case 'penaltyAwarded': return c.hear('penalty', ev);
    case 'shootoutKick': return c.hear(ev.goal ? 'shootoutGoal' : 'shootoutMiss', ev);
    case 'shootoutStart': return c.hear('shootout', ev);
    case 'superStrike': return c.hear('super', ev);
    case 'saveDuelResult': return c.hear(ev.result === 'perfect' ? 'duelPerfect' : ev.result === 'good' ? 'duelGood' : 'duelMiss', ev);
    case 'nutmeg': return c.hear('nutmeg', ev);
    case 'rainbow': case 'skillWin': return c.hear('skill', ev);
    case 'europhoria': return c.hear('europhoria', ev);
    case 'half': return c.hear('halftime', ev);
    case 'fulltime': { const w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1; return c.hear(w >= 0 && kip(w) ? 'fulltimeKip' : 'fulltime', Object.assign({}, ev, { side: w < 0 ? 0 : w })); }
    case 'bus': return c.hear('bus', ev);
    case 'busSmash': return c.hear('busSmash', ev);
    case 'refHit': return c.hear('refHit', ev);
    case 'crowdThrow': return c.hear('crowdThrow', ev);
    case 'advantage': return c.hear('advantage', ev);
    case 'block': return c.hear('block', ev);
    case 'setpiece': if (ev.kind === 'corner') return c.hear('corner', ev); if (ev.kind === 'freekick') return c.hear('freekick', ev); return;
    case 'event': return c.hear('event-' + ev.id, ev);
    case 'gullAway': return c.hear('event-gullAway', ev);
    case 'invaderTackled': return c.hear('event-tackled', ev);
    case 'extraTime': return c.hear('extratime', ev);
    case 'goldenMoment': return c.hear('goldenMoment', ev);
  }
};


/* ===== 24-hud.js ===== */
/* 24-hud: the 10-foot HUD in screen pixels: the score bug (crests, codes, score, clock, Euphoria gauges, red cards), name
 * tags with stamina, the power meter with its gold sweet spot, reticles (corner ring, free-kick target, penalty zones, mouse
 * aim), the radar (shapes and colours), big notices, context prompts, the Save Duel ring, the celebration picker, the
 * shootout's dots and off-screen arrows. Kept inside a safe margin and clear of the corner's buttons. */
class HUD {
  constructor() { this.notes = []; this.toasts = []; this.t = 0; }
  notice(text, o = {}) { this.notes = this.notes.filter(n => n.text !== text); this.notes.push(Object.assign({ text, t: o.t || 1.8, max: o.t || 1.8, colors: o.colors || ['#fffbe8', '#ffe08a', '#ffb347'], sub: o.sub || null, scale: o.scale || 3 }, o)); if (this.notes.length > 1) this.notes.shift(); }
  toast(title, text, o = {}) { this.toasts.push(Object.assign({ title, text, t: o.t || 3, max: o.t || 3 }, o)); if (this.toasts.length > 3) this.toasts.shift(); }
  update(dt) { this.t += dt; for (const n of this.notes) n.t -= dt; this.notes = this.notes.filter(n => n.t > 0); for (const n of this.toasts) n.t -= dt; this.toasts = this.toasts.filter(n => n.t > 0); }
  draw(r, m, view, o = {}) {
    const W = r.W, H = r.H, mx = Math.round(W * .03), my = Math.round(H * .03);
    // world-space bits first (queued): tags, meters, rings
    this.worldBits(r, m, view, o);
    r.overlay(g => {
      if (!o.noBug) this.scoreBug(g, m, mx, my);
      if (game.settings.radar !== 'off' && !o.noRadar) this.radar(g, r, m, view, mx, my);
      this.setpieceBar(g, r, m, o);
      this.prompts(g, r, m, view, o);
      this.celebPicker(g, r, m, o);
      if (m.mode === 'shootout' || m.so) this.shootout(g, r, m);
      this.duelBits(g, r, m);
      this.notices(g, r);
      this.toastsDraw(g, r, mx, my);
      if (m.mode === 'halftime' || (m.mode === 'fulltime' && !o.noFull)) this.halftime(g, r, m);
      if (EF.tuneChanged().length && !m.session) { E.font.text(g, 'DEV TUNED', W - mx, H - my - 8, '#ff7ad0', { align: 'right', font: 'tiny', outline: '#000' }); }
      this.arrows(g, r, m, view);
    });
  }
  scoreBug(g, m, x, y) {
    const t0 = m.teams[0], t1 = m.teams[1], w = 168, h = 30;
    E.ui.box(g, x, y, w, h + 12, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .9 });
    EF.drawCrest(g, t0, x + 12, y + 12, 16); EF.drawCrest(g, t1, x + w - 12, y + 12, 16);
    E.font.text(g, t0.short, x + 24, y + 6, '#fff6e0', { scale: 1, outline: false, shadow: '#000' });
    E.font.text(g, t1.short, x + w - 24, y + 6, '#fff6e0', { scale: 1, outline: false, shadow: '#000', align: 'right' });
    const sc = m.score[0] + ' - ' + m.score[1];
    E.font.text(g, sc, x + w / 2, y + 3, '#ffffff', { scale: 2, outline: '#000', align: 'center' });
    const clk = m.minuteLabel();
    E.font.text(g, clk, x + w / 2, y + 20, m.half >= 3 ? '#ffc83a' : '#c8d0f0', { align: 'center', outline: false, shadow: '#000' });
    // the Euphoria gauges: 3 segments, flashing when full
    for (let s = 0; s < 2; s++) {
      const gx = s ? x + w - 58 : x + 6, gy = y + h + 2, v = m.euph[s] / 100, full = m.euph[s] >= 100 || m.euroT[s] > 0;
      const col = full ? (Math.floor(this.t * 8) % 2 ? '#ffffff' : '#ffc83a') : '#ff7a2a';
      for (let k = 0; k < 3; k++) {
        const segV = clamp(v * 3 - k, 0, 1);
        px.rect(g, gx + k * 18, gy, 16, 6, '#1a1a2a'); px.rect(g, gx + k * 18 + 1, gy + 1, Math.round(14 * segV), 4, m.euroT[s] > 0 ? EF.kitFor(m, s).shirt : col);
      }
      if (m.teams[s] && m.side[s].some(f => f.sentOff)) for (const [i] of m.side[s].filter(f => f.sentOff).entries()) px.rect(g, s ? x + w - 6 - i * 5 : x + 2 + i * 5, y + h - 4, 3, 5, '#ff2a2a');
    }
    E.font.text(g, 'EUPHORIA', x + w / 2, y + h + 2, '#ffc83a', { font: 'tiny', align: 'center', outline: false });
  }
  radar(g, r, m, view, mx, my) {
    const s = .14, w = Math.round(P.L * s), h = Math.round(P.W * s), ca = game.cornerArea();
    const x0 = r.W - mx - w, y0 = ca && ca.x0 < x0 + w ? Math.ceil(ca.y1) + 4 : my;
    E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#123a1a', border: '#6a9070', alpha: .75 });
    px.rect(g, x0 + Math.round(w / 2), y0, 1, h, '#3a6a3a');
    for (const f of m.players) {
      if (f.sentOff) continue;
      const x = Math.round(x0 + (f.body.x - P.X0) * s), y = Math.round(y0 + (f.body.y - P.Y0) * s), c = EF.kitFor(m, f.side).shirt;
      if (f.side === 0) px.disc(g, x, y, 2, c); else px.rect(g, x - 2, y - 2, 4, 4, c);
      if (f.side === 0) px.dot(g, x, y, '#000'); else px.dot(g, x, y, '#000');
      if (f.human != null) { const pc = E.PLAYER_COLORS[(m.slots[f.human] && m.slots[f.human].color) || f.human] || '#fff'; px.rect(g, x - 3, y - 4, 6, 1, pc); }
    }
    px.rect(g, Math.round(x0 + (m.ball.x - P.X0) * s), Math.round(y0 + (m.ball.y - P.Y0) * s), 2, 2, '#ffffff');
  }
  worldBits(r, m, view, o) {
    const t = this.t;
    for (const sl of m.slots) {
      const f = sl.f; if (!f || f.sentOff || m.mode === 'shootout' && !(m.sp && m.sp.taker === f)) continue;
      const b = f.body, col = E.PLAYER_COLORS[sl.color != null ? sl.color : sl.i] || '#ffe08a', z = 38 * (f.data.size || 1.08);
      r.queue(b.x, b.y, z, g => {
        const [x, y] = r.w(b.x, b.y, z), X = Math.round(x), Y = Math.round(y);
        px.poly(g, [[X - 4, Y - 6], [X + 4, Y - 6], [X, Y - 1]], col); px.poly(g, [[X - 3, Y - 5], [X + 3, Y - 5], [X, Y - 2]], E.shade(col, .3));
        const name = (sl.label || ('P' + (sl.i + 1)));
        E.font.text(g, name, X, Y - 15, col, { align: 'center', outline: '#000', font: 'tiny' });
        if (f.stamina < 60) { px.rect(g, X - 8, Y - 19, 16, 2, '#1a1a1a'); px.rect(g, X - 8, Y - 19, Math.round(16 * f.stamina / 100), 2, f.stamina < 25 ? '#ff4a3a' : '#6ad04a'); }
        if (f.charging) {
          const v = f.meter, bw = 28, bx = X - bw / 2, by = Y - 25;
          px.rect(g, bx - 1, by - 1, bw + 2, 6, '#000'); px.rect(g, bx, by, Math.round(bw * v), 4, v > .95 ? (Math.floor(t * 20) % 2 ? '#fff' : '#ff3a2a') : '#ff9a3a');
          px.rect(g, bx + Math.round(bw * .78), by, Math.round(bw * .12), 4, v >= .78 && v <= .9 ? '#fff6a0' : '#c8a020');
          if (m.euroT[f.side] > 0 && !m.superUsed[f.side]) px.rect(g, bx + Math.round(bw * .9), by - 2, 1, 8, '#ff3aa0');
        }
      }, { emissive: true, bias: 50 });
      // the mouse's reticle on the pitch
      if (sl.ctl && sl.ctl.mouseAim && m.mode === 'play') { const gpt = game.mouseGround(); if (gpt) { const gx = gpt[0] !== undefined ? gpt[0] : gpt.x, gy = gpt[1] !== undefined ? gpt[1] : gpt.y; r.decal(() => { r.groundRing(gx, gy, 6, '#ffc83a', .9); r.groundRing(gx, gy, 2, '#ffffff', .9); }); } }
    }
    if (!m.slots.length && m.owner && !o.noTags) { const f = m.owner, b = f.body; r.queue(b.x, b.y, 40, g => { const [x, y] = r.w(b.x, b.y, 40); E.font.text(g, f.data.name, Math.round(x), Math.round(y) - 8, '#fff6e0', { align: 'center', outline: '#000', font: 'tiny' }); }, { emissive: true, bias: 50 }); }
    const sp = m.sp;
    if (sp && sp.phase === 'aim' && sp.human) {
      if (sp.kind === 'corner' && sp.ring) r.decal(() => { r.groundRing(sp.ring.x, sp.ring.y, 14 + Math.sin(t * 6) * 2, '#ffc83a', .9); r.groundRing(sp.ring.x, sp.ring.y, 4, '#ffffff', .9); });
      if (sp.shootable) { const gx = m.goalX(sp.side), y = P.CY + sp.aimY * (P.GH - 6), z = 6 + sp.aimZ * (P.BAR - 10); r.queue(gx, y, z, g => { const [x, yy] = r.w(gx, y, z); px.disc(g, Math.round(x), Math.round(yy), 4, '#ffc83a'); px.disc(g, Math.round(x), Math.round(yy), 2, '#000000'); px.dot(g, Math.round(x), Math.round(yy), '#ffffff'); }, { emissive: true, bias: 60 }); }
      if (sp.kind === 'penalty') { const gx = m.goalX(sp.side); for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { const y = P.CY + [-1, 0, 1][a] * (P.GH - 10), z = b ? 26 : 6, on = sp.zone[0] === a && sp.zone[1] === b; r.queue(gx, y, z, g => { const [x, yy] = r.w(gx, y, z); px.rect(g, Math.round(x) - 4, Math.round(yy) - 4, 8, 8, on ? '#ffc83a' : '#ffffff30'); if (on) px.rect(g, Math.round(x) - 2, Math.round(yy) - 2, 4, 4, '#000'); }, { emissive: true, bias: 60 }); } }
    }
    if (sp && sp.phase === 'aim' && (sp.kind === 'penalty' && sp.charging || sp.shootable && sp.charging)) { const f = sp.taker, b = f.body; r.queue(b.x, b.y, 44, g => { const [x, y] = r.w(b.x, b.y, 44); px.rect(g, Math.round(x) - 15, Math.round(y) - 1, 30, 6, '#000'); px.rect(g, Math.round(x) - 14, Math.round(y), Math.round(28 * sp.power), 4, '#ff9a3a'); if (sp.kind === 'penalty') px.rect(g, Math.round(x) - 14, Math.round(y), Math.round(28 * .2), 4, '#5ae0ff'); }, { emissive: true, bias: 60 }); }
    // the Save Duel's ring round the keeper
    if (m.duel && m.superFlight) {
      const k = m.keeper[1 - m.superFlight.side], d = m.duel, u = clamp(d.t / d.target, 0, 1.4), rad = lerp(40, 10, Math.min(1, u)) + (u > 1 ? (u - 1) * 20 : 0);
      r.decal(() => { r.groundRing(k.body.x, k.body.y, 10, '#ffffff', .9); r.groundRing(k.body.x, k.body.y, rad, Math.abs(d.t - d.target) < .06 ? '#5aff7a' : '#ffc83a', .95); });
    }
  }
  setpieceBar(g, r, m, o) {
    const sp = m.sp, y = r.H - Math.round(r.H * .03) - 96;
    if (!sp || sp.phase !== 'aim' || !sp.human || o.noPrompts) return;
    const I = sp.human.ctl && sp.human.ctl.I, opt = { input: I || game.input, scale: 1, device: sp.human.ctl && sp.human.ctl.device };
    const list = sp.kind === 'corner' ? [['lob', 'CROSS'], ['shoot', 'SHORT'], ['up', 'AIM']] : sp.kind === 'penalty' ? [['shoot', 'HOLD: POWER'], ['up', 'AIM']] : sp.shootable ? [['shoot', 'HOLD: SHOOT'], ['pass', 'PASS'], ['lob', 'CHIP']] : sp.kind === 'goalkick' ? [['pass', 'SHORT'], ['lob', 'LONG']] : [['pass', 'KICK OFF']];
    E.ui.box(g, r.W / 2 - 130, y - 4, 260, 20, { bg: '#0d1430', border: '#ffc83a', alpha: .8 });
    E.font.text(g, { kickoff: 'KICK OFF', goalkick: 'GOAL KICK', corner: 'CORNER', freekick: 'FREE KICK', penalty: 'PENALTY' }[sp.kind], r.W / 2 - 124, y + 2, '#ffc83a', { outline: false });
    EF.promptRow(g, r.W / 2 + 30, y, list, opt);
    if (sp.kind === 'penalty' && sp.keeperHuman && sp.keeperHuman !== sp.human) {
      const kI = sp.keeperHuman.ctl && sp.keeperHuman.ctl.I;
      EF.promptRow(g, r.W / 2, y - 22, [['up', 'GUESS'], ['pass', 'DIVE']], { input: kI || game.input });
    }
  }
  prompts(g, r, m, view, o) {
    if (o.noPrompts || game.settings.prompts === 'off' || m.mode !== 'play') return;
    for (const sl of m.slots) {
      const f = sl.f; if (!f || !sl.ctl || !sl.ctl.I) continue;
      const I = sl.ctl.I, learning = game.settings.prompts !== 'always', used = sl.ctl.used || {};
      const show = a => !learning || (used[a] || 0) < 3;
      const [sx, sy] = r.w(f.body.x, f.body.y, 46), items = [];
      if (m.euph[sl.side] >= 100 && m.euroT[sl.side] <= 0) items.push([I.half || EF.deviceOf(I) === 'gamepad' ? ['switch', 'skill'] : 'euphoria', 'EUROPHORIA!']);
      else if (!m.owner && airWindow(f)) { const w = airWindow(f); items.push(['shoot', w.z >= 22 ? 'HEADER' : 'VOLLEY']); }
      else if (m.owner === f) { if (show('pass')) items.push(['pass', 'PASS']); if (show('shoot')) items.push(['shoot', 'SHOOT']); if (show('skill')) items.push(['skill', 'SKILL']); }
      else if (m.owner && m.owner.side !== f.side) { if (show('pass')) items.push(['pass', 'TACKLE']); if (show('shoot')) items.push(['shoot', 'SLIDE']); if (show('switch')) items.push(['switch', 'SWITCH']); }
      if (m.euroT[sl.side] > 0 && !m.superUsed[sl.side] && m.owner === f) items.unshift(['shoot', 'FULL POWER: SUPER STRIKE!']);
      if (!items.length) continue;
      EF.promptRow(g, clamp(sx, 60, r.W - 60), clamp(sy - 34, 50, r.H - 40), items.slice(0, 3), { input: I, device: sl.ctl.device });
    }
  }
  celebPicker(g, r, m, o) {
    const c = m.celebration; if (!c || !c.scorer || c.picked || c.t < .4 || c.t > 2.4 || o.noPrompts) return;
    const sl = m.slots.find(s => s.side === c.side && s.ctl && s.ctl.I); if (!sl) return;
    const list = EF.celebrationChoices(m, c.scorer), acts = ['pass', 'shoot', 'lob', 'through'];
    const y = r.H - Math.round(r.H * .03) - 92;
    E.ui.box(g, r.W / 2 - 200, y - 18, 400, 40, { bg: '#0d1430', border: '#ffc83a', alpha: .88 });
    E.font.text(g, 'CELEBRATE!', r.W / 2, y - 14, '#ffc83a', { align: 'center', outline: false });
    EF.promptRow(g, r.W / 2, y, list.map((id, i) => [acts[i], (EF.get('celebration', id) || {}).name || id]), { input: sl.ctl.I, device: sl.ctl.device });
    const k = 1 - (c.t - .4) / 2; px.rect(g, r.W / 2 - 190, y + 16, Math.round(380 * k), 2, '#ffc83a');
  }
  shootout(g, r, m) {
    const so = m.so; if (!so) return;
    const y = Math.round(r.H * .03) + 52, x = Math.round(r.W * .03);
    E.ui.box(g, x, y, 168, 34, { bg: '#0d1430', border: '#ffc83a', alpha: .88 });
    for (let s = 0; s < 2; s++) {
      E.font.text(g, m.teams[s].short, x + 6, y + 5 + s * 14, '#fff6e0', { outline: false });
      const n = Math.max(5, so.kicks[0].length, so.kicks[1].length);
      for (let i = 0; i < n; i++) { const k = so.kicks[s][i], cx = x + 40 + i * 12, cy = y + 9 + s * 14; px.disc(g, cx, cy, 4, '#1a1a2a'); if (k === true) px.disc(g, cx, cy, 3, '#5aff7a'); else if (k === false) { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, '#ff3a3a'); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, '#ff3a3a'); } }
    }
  }
  duelBits(g, r, m) {
    if (!m.duel) return;
    const sl = m.slots[m.duel.slot];
    E.font.title(g, 'SAVE DUEL!', r.W / 2, Math.round(r.H * .1), { align: 'center', scale: 3, colors: ['#ffffff', '#5ae0ff', '#3a8aff'] });
    if (sl && sl.ctl && sl.ctl.I) EF.promptRow(g, r.W / 2, Math.round(r.H * .1) + 30, [['pass', 'WHEN THE RINGS MEET!']], { input: sl.ctl.I, scale: 2, device: sl.ctl.device });
  }
  notices(g, r) {
    this.notes.forEach((n, i) => {
      const u = 1 - n.t / n.max, pop = u < .12 ? u / .12 : 1, sc = Math.max(1, Math.round(n.scale * (u < .12 ? .6 + pop * .4 : 1)));
      const y = Math.round(r.H * (.26 + i * .14));
      E.font.title(g, n.text, r.W / 2, y, { align: 'center', scale: sc, colors: n.colors, depth: 2 });
      if (n.sub) E.font.text(g, n.sub, r.W / 2, y + sc * 8 + 6, '#fff6e0', { align: 'center', scale: 1, outline: '#000' });
    });
  }
  toastsDraw(g, r, mx, my) {
    this.toasts.forEach((n, i) => {
      const k = Math.min(1, (n.max - n.t) * 4, n.t * 3), w = 180, x = Math.round(r.W - mx - w * k), y = Math.round(r.H * .45 + i * 34);
      E.ui.box(g, x, y, w, 30, { bg: ['#2a1a4a', '#16224a'], border: '#ff7ad0', alpha: .92 });
      E.font.text(g, n.title, x + 8, y + 5, '#ff9ae0', { outline: false });
      E.font.text(g, n.text, x + 8, y + 16, '#fff6e0', { outline: false });
    });
  }
  halftime(g, r, m) {
    const w = 300, h = 120, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .3);
    E.ui.box(g, x, y, w, h, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .92 });
    E.font.title(g, m.mode === 'halftime' ? 'HALF TIME' : 'FULL TIME', r.W / 2, y + 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    EF.drawCrest(g, m.teams[0], x + 40, y + 56, 30); EF.drawCrest(g, m.teams[1], x + w - 40, y + 56, 30);
    E.font.text(g, m.score[0] + ' - ' + m.score[1], r.W / 2, y + 42, '#ffffff', { align: 'center', scale: 3, outline: '#000' });
    const st = m.stats, tp = st[0].poss + st[1].poss || 1;
    E.font.text(g, 'SHOTS  ' + st[0].shots + ' - ' + st[1].shots, r.W / 2, y + 78, '#c8d0f0', { align: 'center', outline: false });
    E.font.text(g, 'POSSESSION  ' + Math.round(st[0].poss / tp * 100) + '% - ' + Math.round(st[1].poss / tp * 100) + '%', r.W / 2, y + 92, '#c8d0f0', { align: 'center', outline: false });
  }
  arrows(g, r, m, view) {
    const b = m.ball, [x, y] = r.w(b.x, b.y, b.z);
    if (x < 0 || x > r.W || y < 0 || y > r.H) { const cx = clamp(x, 10, r.W - 10), cy = clamp(y, 10, r.H - 10), a = Math.atan2(y - r.H / 2, x - r.W / 2); px.poly(g, [[cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a + 2.4) * 5, cy + Math.sin(a + 2.4) * 5], [cx + Math.cos(a - 2.4) * 5, cy + Math.sin(a - 2.4) * 5]], '#ffffff'); }
  }
}
EF.HUD = HUD;


/* ===== 30-ui.js ===== */
/* 30-ui: the 10-foot UI kit. A menu is a set of items laid out each frame (big tiles, buttons, choices, sliders,
 * toggles) with a focus: the d-pad, the stick, arrows and WASD move it to the nearest item that way; ✕ / Enter / Space /
 * a click picks; ○ / Esc / Backspace / a right click goes back; the mouse's hover moves the focus; L1 / R1 (Q / E) turn
 * tabs and pages. Every screen draws a prompt footer in the player's own buttons. */
const UIK = {
  anyDir(dirs = ['up', 'down', 'left', 'right']) { for (const I of game.players) for (const d of dirs) if (I.repeat(d, .32, .09)) return d; return null; },
  any(a) { return game.players.some(I => I.pressed(a)); },
  input() { return game.players.find(I => I.anyPressed && I.anyPressed()) || game.input; },
  ptr: null, ptrMoved: false,
  tick() {
    const p = game.input.pointer ? game.input.pointer() : null;
    this.ptrMoved = !!(p && (!this.ptr || p[0] !== this.ptr[0] || p[1] !== this.ptr[1]));
    this.ptr = p ? [p[0], p[1]] : null;
  }
};
EF.UIK = UIK;
class UIMenu {
  constructor(o) { this.o = o; this.items = []; this.i = o.focus || 0; this.t = 0; this.onBack = o.onBack || null; this.tab = 0; }
  set(items) { this.items = items; if (this.i >= items.length) this.i = Math.max(0, items.length - 1); while (this.items[this.i] && this.items[this.i].disabled && !this.items[this.i].why && this.i < this.items.length - 1) this.i++; }
  get cur() { return this.items[this.i]; }
  /** returns true when it used the input this step */
  update(dt) {
    this.t += dt; UIK.tick();
    const it = this.cur, I = game.input;
    // mouse: hover focuses (only while the pointer moves), a click picks, a right click is back
    const p = UIK.ptr, clicked = I.clicked ? I.clicked() : null;
    if (p && UIK.ptrMoved) { const k = this.hit(p); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; EF.sfx('menuMove'); } }
    if (clicked) { const k = this.hit(clicked); if (k >= 0 && !this.items[k].disabled) { this.i = k; const item = this.items[k]; if (item.kind === 'slider' && item.rect) { const u = clamp((clicked[0] - item.rect[0] - 8) / (item.rect[2] - 16), 0, 1); item.set(item.min + u * (item.max - item.min)); EF.sfx('menuMove'); } else this.pick(item); return true; } }
    if (EF.mouse.pressed[2] && this.onBack) { EF.sfx('menuBack'); this.onBack(); return true; }
    if (EF.mouse.down[0] && p && it && it.kind === 'slider' && it.rect && this.hit(p) === this.i) { const u = clamp((p[0] - it.rect[0] - 8) / (it.rect[2] - 16), 0, 1); it.set(it.min + u * (it.max - it.min)); }
    // tabs and pages
    if (this.o.onTab) { for (const P_ of game.players) { if (P_.pressed('switch')) { this.o.onTab(-1); EF.sfx('menuMove'); return true; } if (P_.pressed('skill')) { this.o.onTab(1); EF.sfx('menuMove'); return true; } } }
    const d = UIK.anyDir();
    if (d) {
      if (it && (d === 'left' || d === 'right') && (it.kind === 'choice' || it.kind === 'slider' || it.kind === 'toggle')) { this.adjust(it, d === 'left' ? -1 : 1); return true; }
      const k = this.nearest(d); if (k >= 0) { this.i = k; EF.sfx('menuMove'); for (const P_ of game.players) P_.rumble && P_.rumble(.1, .03); }
      return true;
    }
    if (UIK.any('confirm') || UIK.any('pass')) { if (it && !it.disabled) this.pick(it); else if (it && it.disabled && it.why) { EF.sfx('miss'); this.o.onDenied && this.o.onDenied(it); } return true; }
    if ((UIK.any('cancel') || UIK.any('lob')) && this.onBack) { EF.sfx('menuBack'); this.onBack(); return true; }
    if (UIK.any('shoot') && it && it.onAlt) { it.onAlt(); EF.sfx('menuMove'); return true; }
    return false;
  }
  adjust(it, d) {
    if (it.kind === 'choice') { const opts = it.options, k = opts.findIndex(o => o[0] === it.get()); it.set(opts[(k + d + opts.length) % opts.length][0]); }
    else if (it.kind === 'toggle') it.set(!it.get());
    else if (it.kind === 'slider') { const st = it.step || (it.max - it.min) / 20; it.set(clamp(+(it.get() + d * st).toFixed(4), it.min, it.max)); }
    EF.sfx('menuMove');
  }
  pick(it) {
    if (it.kind === 'choice') return this.adjust(it, 1);
    if (it.kind === 'toggle') return this.adjust(it, 1);
    if (it.kind === 'slider') return;
    EF.sfx('menuPick'); for (const P_ of game.players) P_.consumeAll && P_.consumeAll();
    it.onPick && it.onPick(it);
  }
  hit(p) { for (let k = 0; k < this.items.length; k++) { const r = this.items[k].rect; if (r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]) return k; } return -1; }
  nearest(d) {
    const c = this.cur && this.cur.rect; if (!c) return this.items.length ? 0 : -1;
    const cx = c[0] + c[2] / 2, cy = c[1] + c[3] / 2, dx = { left: -1, right: 1, up: 0, down: 0 }[d], dy = { up: -1, down: 1, left: 0, right: 0 }[d];
    let best = -1, bs = 1e9;
    this.items.forEach((it, k) => {
      if (k === this.i || !it.rect || it.disabled && !it.why) return;
      const r = it.rect, x = r[0] + r[2] / 2, y = r[1] + r[3] / 2, vx = x - cx, vy = y - cy, along = vx * dx + vy * dy;
      if (along <= 2) return;
      const across = Math.abs(vx * dy) + Math.abs(vy * dx), s = along + across * 2.2;
      if (s < bs) { bs = s; best = k; }
    });
    if (best < 0 && this.o.wrap !== false) {   // wrap round in a list
      const order = this.items.map((it, k) => ({ k, r: it.rect })).filter(e => e.r && !(this.items[e.k].disabled && !this.items[e.k].why));
      if (dy && order.length) { order.sort((a, b) => a.r[1] - b.r[1] || a.r[0] - b.r[0]); best = dy > 0 ? order[0].k : order[order.length - 1].k; if (best === this.i) best = -1; }
    }
    return best;
  }
  /** draws every item (the layout gave each its rect) */
  draw(g, o = {}) {
    this.items.forEach((it, k) => {
      const [x, y, w, h] = it.rect || [0, 0, 0, 0]; if (!w) return;
      const f = k === this.i, pulse = f ? (Math.sin(this.t * 5) * .5 + .5) : 0;
      if (it.draw) return it.draw(g, x, y, w, h, f, pulse, it);
      E.ui.box(g, x, y, w, h, { bg: f ? ['#26326a', '#1a2450'] : ['#141c3a', '#0d1430'], border: f ? (pulse > .5 ? '#ffe08a' : '#ffc83a') : '#2a3a6a', alpha: it.disabled ? .55 : .94 });
      if (f) { px.rect(g, x - 2, y + 2, 2, h - 4, '#ffc83a'); px.rect(g, x + w, y + 2, 2, h - 4, '#ffc83a'); }
      const sc = it.scale || (h >= 30 ? 2 : 1), col = it.disabled ? '#7a84a8' : f ? '#ffffff' : '#dfe4f8';
      const lx = it.align === 'left' ? x + 10 : x + w / 2;
      let ty = y + Math.round((h - 7 * sc - (it.sub ? 10 : 0)) / 2);
      if (it.icon) it.icon(g, x + 8, y + h / 2, f);
      if (it.kind === 'choice' || it.kind === 'toggle' || it.kind === 'slider') {
        E.font.text(g, it.label, x + 10, y + Math.round((h - 7) / 2), col, { outline: false, shadow: '#000' });
        const v = it.get();
        if (it.kind === 'slider') { const bx = x + w * .5, bw = w * .5 - 14, u = (v - it.min) / (it.max - it.min); px.rect(g, Math.round(bx), y + Math.round(h / 2) - 2, Math.round(bw), 4, '#0a0e20'); px.rect(g, Math.round(bx), y + Math.round(h / 2) - 2, Math.round(bw * u), 4, '#ffc83a'); px.rect(g, Math.round(bx + bw * u) - 2, y + Math.round(h / 2) - 5, 4, 10, '#ffffff'); E.font.text(g, it.fmt ? it.fmt(v) : String(+v.toFixed(2)), Math.round(bx - 6), y + Math.round((h - 7) / 2), '#ffe08a', { align: 'right', outline: false }); if (it.changed && it.changed()) E.font.text(g, '*', x + w - 8, y + 3, '#ff7ad0', { outline: false }); }
        else { const lab = it.kind === 'toggle' ? (v ? 'ON' : 'OFF') : ((it.options.find(o2 => o2[0] === v) || [, String(v)])[1]); E.font.text(g, (f ? '< ' : '') + lab + (f ? ' >' : ''), x + w - 10, y + Math.round((h - 7) / 2), '#ffe08a', { align: 'right', outline: false }); }
        return;
      }
      E.font.text(g, it.label, lx, ty, col, { align: it.align === 'left' ? 'left' : 'center', scale: sc, outline: false, shadow: '#000' });
      if (it.sub) E.font.text(g, it.sub, lx, ty + 7 * sc + 4, it.disabled ? '#6a7090' : '#ffc83a', { align: it.align === 'left' ? 'left' : 'center', outline: false, shadow: '#000' });
    });
  }
}
EF.UIMenu = UIMenu;
/** the footer: menu prompts in the player's own buttons */
EF.footer = (g, r, list, o = {}) => {
  const y = r.H - Math.round(r.H * .04) - 12;
  px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 6, r.W, 24, '#05070f'));
  EF.promptRow(g, r.W / 2, y, list, Object.assign({ scale: 1 }, o));
};
EF.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#141c3a', '#0d1430'], border: '#ffc83a', alpha: .94 }, o));
EF.heading = (g, text, x, y, scale = 3, o = {}) => E.font.title(g, text, Math.round(x), Math.round(y), Object.assign({ align: 'center', scale, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }, o));
EF.textBlock = (g, text, x, y, w, o = {}) => E.font.text(g, text, Math.round(x), Math.round(y), o.color || '#e8ecff', Object.assign({ wrap: w, outline: false, shadow: '#000', lineGap: 3 }, o));
/** a column of rects centred on the screen: n items of h with a gap */
EF.layoutColumn = (r, n, o = {}) => {
  const w = Math.min(o.w || 260, r.W - 40), h = o.h || 30, gap = o.gap || 8, total = n * h + (n - 1) * gap, y0 = o.y != null ? o.y : Math.round((r.H - total) / 2 + (o.dy || 0)), x = Math.round(o.x != null ? o.x : r.W / 2 - w / 2);
  return Array.from({ length: n }, (_, i) => [x, y0 + i * (h + gap), w, h]);
};
EF.layoutGrid = (r, n, cols, o = {}) => {
  const w = o.w || 120, h = o.h || 60, gx = o.gap || 10, gy = o.gapY || gx, rows = Math.ceil(n / cols), tw = cols * w + (cols - 1) * gx, th = rows * h + (rows - 1) * gy;
  const x0 = Math.round(o.x != null ? o.x : r.W / 2 - tw / 2), y0 = Math.round(o.y != null ? o.y : (r.H - th) / 2);
  return Array.from({ length: n }, (_, i) => [x0 + (i % cols) * (w + gx), y0 + Math.floor(i / cols) * (h + gy), w, h]);
};


/* ===== 31-front.js ===== */
/* 31-front: the title (the Euphorium at night, Daz doing keepy-uppies, fireworks, PRESS START, the main menu's tiles,
 * the touch-only notice), Kick-About's setup (teams, stadium, conditions, players picking sides), the penalties setup,
 * results, the Sticker Album and About & Credits. Every screen works with a pad, a keyboard or a mouse alone. */
/** a stage: a quiet stadium to stand people in (title, tunnel, ceremony), drawn by a MatchView */
class Stage {
  constructor(stadium, o = {}) {
    this.m = new Match({ home: o.home || 'kipperton', away: o.away || 'opulence', stadium, training: { quiet: true }, silent: true, noClock: true, seed: 5 });
    for (const f of this.m.players) { f.body.x = -9999; f.state = 'gone'; }
    this.m.ball.x = -9999; this.view = new MatchView(this.m, { noCamera: true, noZoom: true }); this.t = 0;
    if (o.weather !== false) game.weather = this.m.st.weather ? Object.assign({}, this.m.st.weather) : null;
  }
  update(dt) { this.t += dt; this.view.update(dt); }
  draw(r) { this.view.draw(r); }
}
EF.Stage = Stage;
const FRONT = {};
const goBack = to => () => game.go(to || 'title');
EF.FRONT = FRONT;
/* ---- the title ---- */
const titleScene = {
  touch: [], view: 'broadcast', idle: true,
  enter(d) {
    this.stage = new Stage('euphorium', { weather: false }); this.t = 0; this.phase = d && d.menu ? 'menu' : 'press'; this.fw = 2;
    const m = this.stage.m, daz = m.side[0].find(f => f.data.id === 'pilchard');
    daz.state = 'run'; daz.body.x = P.CX; daz.body.y = P.Y0 + 150; daz.facing = PI / 2; this.daz = daz; m.ball.x = P.CX + 6; m.ball.y = P.Y0 + 156;
    game.setView('broadcast'); game.setZoom(1.1); game.zoomBase = 1.1;
    EF.music('anthem'); EF.idle.reset();
    this.menu = new UIMenu({ onBack: () => { this.phase = 'press'; } });
    game.input.consumeAll();
  },
  exit() { game.weather = null; LIGHTS.enabled = false; },
  items(r) {
    const save = EF.Save.data, cup = save && save.cup, cont = cup && !cup.done ? 'CONTINUE: ' + ((EF.ROUNDS[cup.round] || {}).name || '') : 'NEW CUP RUN';
    const touchOnly = EF.touchOnly(), deny = 'CONTROLLER OR KEYBOARD REQUIRED';
    const L = [
      { label: 'CUP RUN', sub: cont, onPick: () => game.go('cup', {}), play: true },
      { label: 'KICK-ABOUT', sub: '1 TO 4 PLAYERS', onPick: () => game.go('setup', {}), play: true },
      { label: 'PENALTIES', sub: 'A SHOOTOUT', onPick: () => game.go('penaltysetup', {}), play: true },
      { label: 'TRAINING', sub: '9 DRILLS', onPick: () => game.go('training', {}), play: true },
      { label: 'STICKER ALBUM', sub: Object.keys(save.stickers).length + ' / ' + EF.all('sticker').length, onPick: () => game.go('album', {}) },
      { label: 'OPTIONS', sub: 'SETTINGS & CONTROLS', onPick: () => game.menu('settings') },
      { label: 'ABOUT & CREDITS', sub: 'HOW IT WAS MADE', onPick: () => game.go('about', {}) }
    ];
    if (touchOnly) for (const it of L) if (it.play) { it.disabled = true; it.why = deny; it.sub = deny; }
    const w = Math.min(200, Math.floor((r.W - 40) / 2)), rects = EF.layoutGrid(r, 8, 2, { w, h: 26, gap: 8, gapY: 5, y: Math.round(r.H * .34) });
    L.forEach((it, i) => { it.rect = rects[i]; it.scale = 2; });
    L[6].rect = [Math.round(r.W / 2 - w / 2), rects[6][1], w, 26];
    return L;
  },
  update(dt) {
    this.t += dt; this.stage.update(dt);
    const daz = this.daz, m = this.stage.m, u = (this.t * 1.6) % 1;
    // keepy-uppies: a touch every 0.6 s, the ball up and down
    daz.act = { name: 'touch', t: u * .3, dur: .3 };
    m.ball.z = Math.abs(Math.sin(this.t * PI * 1.6)) * 22; m.ball.x = daz.body.x + 5; m.ball.y = daz.body.y + 2; m.ball.roll += dt * 20;
    game.focus(P.CX + Math.sin(this.t * .1) * 60, P.Y0 + 70, 20);
    if ((this.fw -= dt) <= 0) { this.fw = 8; this.stage.view.firework(3); }
    if (EF.touchOnly()) { const c = game.input.clicked(); if (c && this.setBtn && c[0] > this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] > this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) { game.menu('settings'); EF.idle.tick(dt); return; } }
    if (this.phase === 'press') {
      if (game.players.some(I => I.anyPressed()) || game.input.clicked()) { this.phase = 'menu'; EF.sfx('menuPick'); game.players.forEach(I => I.consumeAll()); EF.idle.reset(); }
    } else {
      this.menu.set(this.items(game.r || { W: game.W, H: game.H }));
      this.menu.update(dt);
    }
    EF.idle.tick(dt);
  },
  draw(r) {
    this.stage.draw(r);
    const daz = this.daz, rig = this.stage.view.rigs[daz.id]; void rig;
    r.overlay(g => {
      px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, r.W, Math.round(r.H * .04) + 74, '#0a0c20'));
      EF.heading(g, 'EUROPHORIA', r.W / 2, Math.round(r.H * .04), 4);
      EF.heading(g, 'FOOTBALL', r.W / 2, Math.round(r.H * .04) + 34, 3, { colors: ['#ffffff', '#c8d8ff', '#6a8aff'] });
      E.font.text(g, 'OVER-THE-TOP ARCADE FOOTBALL', r.W / 2, Math.round(r.H * .04) + 62, '#ffe7a8', { align: 'center', outline: '#000' });
      if (this.phase === 'press') {
        if (Math.floor(this.t * 2) % 2 === 0) { const w = EF.promptWidth('start', 'PRESS START', { scale: 2 }); EF.prompt(g, Math.round(r.W / 2 - w / 2), Math.round(r.H * .62), 'start', 'PRESS START', { scale: 2 }); }
      } else { this.menu.draw(g); }
      if (EF.touchOnly()) {
        const w = 260, h = 64, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .72);
        EF.panel(g, x, y, w, h, { border: '#ff5a4a' });
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, y + 8, '#ffffff', { align: 'center', outline: false });
        this.setBtn = [x + 70, y + 26, 120, 30]; EF.panel(g, this.setBtn[0], this.setBtn[1], 120, 30, { border: '#ffc83a' }); E.font.text(g, 'SETTINGS', r.W / 2, y + 33, '#ffe08a', { align: 'center', scale: 2, outline: false });
      }
      E.font.text(g, 'v' + EF.VERSION + '  ' + E.versionLabel(), 4, r.H - 9, '#6a7090', { font: 'tiny', outline: false });
      if (this.phase === 'menu') EF.footer(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.title = titleScene;

/* ---- Kick-About setup: teams, stadium, conditions, players ---- */
const KA = { home: 'kipperton', away: 'hoofington', kit: false, stadium: 'smokehouse', weather: 'stadium', time: 'stadium', ball: 'classic', half: null, diff: null, sides: {} };
EF.KA = KA;
const teamIds = () => EF.all('team').map(t => t.id), stadIds = () => EF.all('stadium').filter(s => !s.training).map(s => s.id);
const cyc = (list, v, d) => list[(list.indexOf(v) + d + list.length) % list.length];
const setupScene = {
  touch: [], view: 'broadcast', idle: true,
  enter(d) { this.step = 0; this.t = 0; this.menu = new UIMenu({ onBack: () => this.back() }); game.allowJoin(false); EF.music('menu'); EF.idle.reset(); this.stage = new Stage(KA.stadium, { weather: false }); game.setZoom(1); game.zoomBase = 1; },
  exit() { game.allowJoin(false); },
  back() { if (this.step > 0) { this.step--; if (this.step < 3) game.allowJoin(false); } else game.go('title', { menu: true }); },
  items(r) {
    const W = Math.min(r.W - 40, 380), x = Math.round(r.W / 2 - W / 2), y0 = Math.round(r.H * .24);
    const L = [];
    const team = id => EF.get('team', id);
    if (this.step === 0) {
      const tile = (side) => ({ kind: 'choice', label: side ? 'AWAY' : 'HOME', get: () => KA[side ? 'away' : 'home'], set: v => { KA[side ? 'away' : 'home'] = v; }, options: teamIds().map(id => [id, team(id).name]),
        draw: (g, X, Y, w, h, f) => { EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : '#2a3a6a' }); const t = team(KA[side ? 'away' : 'home']); EF.drawCrest(g, t, X + w / 2, Y + 34, 40); E.font.text(g, side ? 'AWAY' : 'HOME', X + w / 2, Y + 4, '#9aa6c8', { align: 'center', outline: false }); E.font.text(g, (f ? '< ' : '') + t.short + (f ? ' >' : ''), X + w / 2, Y + 60, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, t.name, X + w / 2, Y + 78, '#ffe08a', { align: 'center', outline: false }); E.font.text(g, EF.get('tactic', t.tactic).gimmick ? EF.get('tactic', t.tactic).gimmick.toUpperCase() : 'PLUCKY', X + w / 2, Y + 90, '#9aa6c8', { align: 'center', font: 'tiny', outline: false }); } });
      const a = tile(0), b = tile(1); const tw = Math.round(W / 2 - 6); a.rect = [x, y0, tw, 104]; b.rect = [x + W - tw, y0, tw, 104]; L.push(a, b);
      L.push({ label: 'NEXT: STADIUM', rect: [x + W / 2 - 90, y0 + 114, 180, 26], onPick: () => { this.step = 1; } });
    } else if (this.step === 1) {
      const ids = stadIds(), rects = EF.layoutGrid(r, ids.length, 3, { w: Math.round((W - 20) / 3), h: 56, y: y0 });
      ids.forEach((id, i) => { const s = EF.get('stadium', id); L.push({ rect: rects[i], label: s.name, sub: s.city, onPick: () => { KA.stadium = id; this.stage = new Stage(id, { weather: false }); this.step = 2; },
        draw: (g, X, Y, w, h, f) => { EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : KA.stadium === id ? '#5ae0ff' : '#2a3a6a', bg: [s.look.sky[0], s.look.sky[2]] }); px.rect(g, X + 3, Y + h - 16, w - 6, 13, s.look.grass[0]); for (let k = 0; k < w - 6; k += 8) px.rect(g, X + 3 + k, Y + h - 16, 4, 13, s.look.grass[1]); E.font.text(g, s.name, X + w / 2, Y + 6, '#ffffff', { align: 'center', outline: '#000' }); E.font.text(g, s.city + ' - ' + s.time.toUpperCase() + (s.weather ? ', ' + s.weather.kind.toUpperCase() : ''), X + w / 2, Y + 18, '#ffe08a', { align: 'center', font: 'tiny', outline: '#000' }); } }); });
    } else if (this.step === 2) {
      const rows = [
        { kind: 'choice', label: 'WEATHER', get: () => KA.weather, set: v => { KA.weather = v; }, options: [['stadium', 'As the stadium'], ['none', 'Clear'], ['rain', 'Rain'], ['snow', 'Snow'], ['fog', 'Fog']] },
        { kind: 'choice', label: 'TIME', get: () => KA.time, set: v => { KA.time = v; }, options: [['stadium', 'As the stadium'], ['day', 'Day'], ['dusk', 'Dusk'], ['night', 'Night']] },
        { kind: 'choice', label: 'BALL', get: () => KA.ball, set: v => { KA.ball = v; }, options: EF.Save.data.unlocks.balls.map(b => [b, EF.BALLS[b].name]) },
        { kind: 'choice', label: 'HALF LENGTH', get: () => game.settings.halfLen, set: v => game.settings.set('halfLen', v), options: [['90', '1:30'], ['120', '2:00'], ['180', '3:00'], ['240', '4:00']] },
        { kind: 'choice', label: 'DIFFICULTY', get: () => game.settings.difficulty, set: v => game.settings.set('difficulty', v), options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard'], ['europhoric', 'Europhoric']] },
        { label: 'NEXT: PLAYERS', onPick: () => { this.step = 3; game.allowJoin({ max: 4 }); KA.sides = {}; } }];
      const rects = EF.layoutColumn(r, rows.length, { w: W, h: 22, gap: 4, y: y0 });
      rows.forEach((it, i) => { it.rect = rects[i]; L.push(it); });
    } else {
      L.push({ label: 'START MATCH', rect: [x + W / 2 - 90, Math.round(r.H * .78), 180, 26], onPick: () => this.start(), disabled: !this.anyHuman(), why: 'MOVE A CONTROLLER TO A SIDE' });
    }
    return L;
  },
  anyHuman() { return game.players.some(I => (KA.sides[I.player] ?? (I === game.input ? 0 : 1)) !== -1); },
  update(dt) {
    this.t += dt; this.stage.update(dt); game.focus(P.CX + Math.sin(this.t * .2) * 200, P.CY, 0);
    if (this.step === 3) {
      // each player's icon: left HOME, centre CPU (sitting out), right AWAY
      for (const I of game.players) {
        const k = I.player; if (KA.sides[k] === undefined) KA.sides[k] = I === game.input ? 0 : 1;
        if (I.pressed('left')) { KA.sides[k] = KA.sides[k] === 1 ? -1 : 0; EF.sfx('menuMove'); I.consume && I.consume('left'); }
        if (I.pressed('right')) { KA.sides[k] = KA.sides[k] === 0 ? -1 : 1; EF.sfx('menuMove'); I.consume && I.consume('right'); }
      }
    }
    this.menu.set(this.items(game.r || { W: game.W, H: game.H }));
    this.menu.update(dt);
    EF.idle.tick(dt);
  },
  start() {
    const humans = game.players.map(I => ({ input: I, side: KA.sides[I.player] ?? 0 })).filter(h => h.side >= 0);
    const st = KA.stadium, wx = KA.weather;
    const weather = wx === 'stadium' ? null : wx === 'none' ? 'none' : wx === 'fog' ? 'none' : { kind: wx, amount: .7, wind: .2 };
    const surface = wx === 'rain' ? 'wet' : wx === 'snow' ? 'snow' : null;
    const draws = { allowed: 'allowed', golden: 'golden', pens: 'pens' }[game.settings.draws] || 'allowed';
    const o = { home: KA.home, away: KA.away, stadium: st, humans, weather, surface, ball: KA.ball, draws, time: KA.time, fog: wx === 'fog', back: 'setup',
      onEnd: (sum) => game.go('results', { summary: sum, next: () => game.go('setup', {}) }) };
    game.allowJoin(false);
    game.go('tunnel', { match: o, short: true });
  },
  draw(r) {
    this.stage.draw(r);
    r.overlay(g => {
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#101030'));
      EF.heading(g, 'KICK-ABOUT', r.W / 2, Math.round(r.H * .04), 3);
      E.font.text(g, ['1  TEAMS', '2  STADIUM', '3  CONDITIONS', '4  PLAYERS'][this.step], r.W / 2, Math.round(r.H * .04) + 30, '#ffe08a', { align: 'center', scale: 1, outline: '#000' });
      if (this.step === 3) {
        const y = Math.round(r.H * .3), W = Math.min(r.W - 40, 380), x0 = Math.round(r.W / 2 - W / 2);
        EF.panel(g, x0, y, W, 110);
        E.font.text(g, 'HOME', x0 + W * .17, y + 6, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, 'CPU', x0 + W * .5, y + 6, '#9aa6c8', { align: 'center', scale: 2, outline: false }); E.font.text(g, 'AWAY', x0 + W * .83, y + 6, '#ffffff', { align: 'center', scale: 2, outline: false });
        EF.drawCrest(g, EF.get('team', KA.home), x0 + W * .17, y + 34, 18); EF.drawCrest(g, EF.get('team', KA.away), x0 + W * .83, y + 34, 18);
        game.players.forEach((I, i) => { const s = KA.sides[I.player] ?? 0, cx = x0 + W * (s === 0 ? .17 : s === 1 ? .83 : .5), cy = y + 54 + i * 13; px.rect(g, Math.round(cx) - 26, cy - 1, 52, 11, E.PLAYER_COLORS[i]); E.font.text(g, I.name + ' ' + (I.lastDevice === 'gamepad' ? 'PAD' : 'KEYS'), Math.round(cx), cy + 1, '#000', { align: 'center', outline: false }); });
        E.font.text(g, game.players.length < 4 ? 'MORE PLAYERS: PRESS 2 ON THE KEYBOARD, OR START ON A PAD' : 'FOUR PLAYERS!', r.W / 2, y + 112, '#ffe7a8', { align: 'center', outline: '#000' });
      }
      this.menu.draw(g);
      EF.footer(g, r, this.step === 3 ? [['left', 'SIDE'], ['confirm', 'START'], ['cancel', 'BACK']] : [['confirm', 'SELECT'], ['left', 'CHANGE'], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.setup = setupScene;

/* ---- penalties setup ---- */
const PEN = { home: 'kipperton', away: 'pasapasa', stadium: 'euphorium', versus: false };
const penaltyScene = {
  touch: [], view: 'broadcast', idle: true,
  enter() { this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }) }); this.stage = new Stage(PEN.stadium, { weather: false }); this.t = 0; EF.music('menu'); EF.idle.reset(); game.allowJoin({ max: 2 }); },
  exit() { game.allowJoin(false); },
  update(dt) {
    this.t += dt; this.stage.update(dt); game.focus(P.X1 - 80, P.CY, 0);
    const r = game.r || { W: game.W, H: game.H }, W = Math.min(r.W - 40, 340);
    const rows = [
      { kind: 'choice', label: 'YOUR TEAM', get: () => PEN.home, set: v => { PEN.home = v; }, options: teamIds().map(id => [id, EF.get('team', id).name]) },
      { kind: 'choice', label: 'OPPONENT', get: () => PEN.away, set: v => { PEN.away = v; }, options: teamIds().map(id => [id, EF.get('team', id).name]) },
      { kind: 'choice', label: 'STADIUM', get: () => PEN.stadium, set: v => { PEN.stadium = v; this.stage = new Stage(v, { weather: false }); }, options: stadIds().map(id => [id, EF.get('stadium', id).name]) },
      { kind: 'choice', label: 'PLAYERS', get: () => game.players.length > 1 ? 'versus' : 'cpu', set: () => {}, options: [['cpu', '1 PLAYER vs CPU'], ['versus', '2 PLAYERS (P2 JOINED)']] },
      { label: 'START SHOOTOUT', onPick: () => this.start() }];
    EF.layoutColumn(r, rows.length, { w: W, h: 24, gap: 5, y: Math.round(r.H * .3) }).forEach((rc, i) => { rows[i].rect = rc; });
    this.menu.set(rows); this.menu.update(dt); EF.idle.tick(dt);
  },
  start() {
    const humans = [{ input: game.input, side: 0 }]; if (game.players[1]) humans.push({ input: game.players[1], side: 1 });
    game.allowJoin(false);
    game.go('match', { home: PEN.home, away: PEN.away, stadium: PEN.stadium, humans, shootoutOnly: true, draws: 'pens', onEnd: sum => game.go('results', { summary: sum, next: () => game.go('penaltysetup', {}) }) });
  },
  draw(r) {
    this.stage.draw(r);
    r.overlay(g => { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#101030')); EF.heading(g, 'PENALTIES', r.W / 2, Math.round(r.H * .05), 3); E.font.text(g, 'FIVE EACH, THEN SUDDEN DEATH. P2: PRESS 2 OR START TO JOIN', r.W / 2, Math.round(r.H * .05) + 30, '#ffe08a', { align: 'center', outline: '#000' }); this.menu.draw(g); EF.footer(g, r, [['confirm', 'SELECT'], ['left', 'CHANGE'], ['cancel', 'BACK']]); });
  }
};
EF.scenes.penaltysetup = penaltyScene;

/* ---- results ---- */
const resultsScene = {
  touch: [], view: 'broadcast',
  enter(d) { this.d = d || {}; this.s = this.d.summary || { home: 'kipperton', away: 'hoofington', score: [0, 0], goals: [], shots: [0, 0], poss: [50, 50], tackles: [0, 0], winner: -1 }; this.t = 0; this.menu = new UIMenu({}); const w = this.s.winner, kip = [this.s.home, this.s.away].indexOf('kipperton'); EF.music(w < 0 ? null : (kip < 0 || w === kip) ? 'victory' : 'defeat', { loop: false }); this.stickers = (this.d.stickers || []).slice(); this.stage = new Stage(this.s.stadium || 'smokehouse', { weather: false }); game.input.consumeAll(); },
  update(dt) {
    this.t += dt; this.stage.update(dt); game.focus(P.CX, P.CY - 80, 0);
    const r = game.r || { W: game.W, H: game.H };
    this.menu.set([{ label: this.d.label || 'CONTINUE', rect: [Math.round(r.W / 2 - 90), Math.round(r.H * .82), 180, 26], onPick: () => { if (this.d.next) this.d.next(); else game.go('title'); } }]);
    if (this.t > .6) this.menu.update(dt);
  },
  draw(r) {
    const s = this.s, t0 = EF.get('team', s.home), t1 = EF.get('team', s.away);
    this.stage.draw(r);
    r.overlay(g => {
      px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#0a0a20'));
      const W = Math.min(r.W - 30, 420), x = Math.round(r.W / 2 - W / 2), y = Math.round(r.H * .05);
      EF.panel(g, x, y, W, Math.round(r.H * .74));
      EF.heading(g, s.winner < 0 ? 'A DRAW' : EF.get('team', s.winner ? s.away : s.home).short + ' WIN!', r.W / 2, y + 6, 3);
      EF.drawCrest(g, t0, x + 40, y + 52, 36); EF.drawCrest(g, t1, x + W - 40, y + 52, 36);
      E.font.text(g, s.score[0] + ' - ' + s.score[1], r.W / 2, y + 38, '#ffffff', { align: 'center', scale: 4, outline: '#000' });
      if (s.pens) E.font.text(g, '(' + s.pens[0] + ' - ' + s.pens[1] + ' ON PENALTIES)', r.W / 2, y + 72, '#ffe08a', { align: 'center', outline: false });
      s.goals.slice(0, 4).forEach((gl, i) => E.font.text(g, gl.minute + '  ' + gl.name + (gl.super ? '  (SUPER STRIKE!)' : ''), gl.side ? x + W - 12 : x + 12, y + 86 + i * 11, '#dfe4f8', { align: gl.side ? 'right' : 'left', outline: false }));
      const sy = y + 136;
      [['SHOTS', s.shots], ['POSSESSION %', s.poss], ['TACKLES', s.tackles]].forEach(([k, v], i) => { const cx = x + W * (.2 + i * .3); E.font.text(g, v[0] + ' - ' + v[1], cx, sy, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, k, cx, sy + 18, '#9aa6c8', { align: 'center', outline: false }); });
      if (s.potm) { const rig = EF.portraitOf(s.potm.id); if (rig.update) rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2 }); rig.drawPortrait(g, x + 10, sy + 34, 30); E.font.text(g, 'PLAYER OF THE MATCH', x + 46, sy + 38, '#ffc83a', { outline: false }); E.font.text(g, s.potm.name, x + 46, sy + 50, '#ffffff', { scale: 1, outline: false }); }
      if (this.stickers.length) E.font.text(g, 'NEW STICKERS: ' + this.stickers.length, x + W - 12, sy + 44, '#ff9ae0', { align: 'right', outline: false });
      this.menu.draw(g);
      EF.footer(g, r, [['confirm', this.d.label || 'CONTINUE']]);
    });
  }
};
EF.scenes.results = resultsScene;

/* ---- the Sticker Album ---- */
const albumScene = {
  touch: [], view: 'broadcast', idle: true,
  enter() { this.page = 0; this.t = 0; this.flip = 0; this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }), onTab: d => this.turn(d) }); EF.music('credits'); EF.idle.reset(); },
  pages() {
    const S = EF.all('sticker'), pg = [];
    for (const t of EF.all('team')) pg.push({ title: t.name, list: S.filter(s => s.team === t.id) });
    pg.push({ title: 'STADIUMS', list: S.filter(s => s.kind === 'stadium') });
    pg.push({ title: "GAFFER'S CHALLENGES (SHINY)", list: S.filter(s => s.kind === 'shiny') });
    pg.push({ title: 'SPECIALS', list: S.filter(s => s.kind === 'special') });
    return pg;
  },
  turn(d) { const n = this.pages().length; this.page = (this.page + d + n) % n; this.flip = .3; },
  update(dt) {
    this.t += dt; this.flip = Math.max(0, this.flip - dt);
    const r = game.r || { W: game.W, H: game.H }, pg = this.pages()[this.page], cols = 3, w = Math.min(120, Math.floor((r.W - 50) / 3)), h = Math.min(74, Math.floor((r.H * .64 - 10) / 2));
    const rects = EF.layoutGrid(r, pg.list.length, cols, { w, h, gap: 8, y: Math.round(r.H * .17) });
    this.menu.set(pg.list.map((s, i) => ({ rect: rects[i], label: s.name, sticker: s, draw: (g, X, Y, W2, H2, f) => this.drawSticker(g, s, X, Y, W2, H2, f) })).concat([
      { label: '<', rect: [8, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(-1) }, { label: '>', rect: [r.W - 30, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(1) }]));
    this.menu.update(dt); EF.idle.tick(dt);
  },
  drawSticker(g, s, X, Y, w, h, f) {
    const got = EF.Save.data.stickers[s.id], shiny = got === 'shiny';
    EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : shiny ? '#ff9ae0' : '#c8b88a', bg: got ? ['#f4ecd8', '#e0d4b8'] : ['#2a2a3a', '#1a1a2a'] });
    if (!got) { E.font.text(g, '?', X + w / 2, Y + h / 2 - 14, '#5a5a7a', { align: 'center', scale: 3, outline: false }); E.font.text(g, s.how, X + w / 2, Y + h - 22, '#9aa6c8', { align: 'center', font: 'tiny', wrap: w - 8, outline: false }); return; }
    const cx = X + w / 2, cy = Y + h / 2 - 8;
    if (s.kind === 'player' || (s.kind === 'special' && ['mags', 'barry'].includes(s.ref))) { const rig = EF.portraitOf(s.ref); rig.drawPortrait(g, Math.round(cx - 18), Y + 4, 36); }
    else if (s.kind === 'crest') EF.drawCrest(g, EF.get('team', s.ref), cx, cy, 34);
    else if (s.kind === 'stadium') { const st = EF.get('stadium', s.ref); px.rect(g, X + 6, Y + 6, w - 12, h - 30, st.look.sky[1]); px.rect(g, X + 6, Y + h - 34, w - 12, 10, st.look.grass[0]); }
    else if (s.ref === 'bus') EF.drawBus(g, cx, cy + 12, .9);
    else if (s.ref === 'keith') { px.ell(g, Math.round(cx), Math.round(cy), 14, 8, '#c8803a'); px.poly(g, [[cx + 12, cy], [cx + 20, cy - 6], [cx + 20, cy + 6]], '#c8803a'); px.dot(g, Math.round(cx - 6), Math.round(cy - 2), '#141414'); }
    else if (s.ref === 'loyal') EF.drawCrest(g, EF.get('team', 'kipperton'), cx, cy, 30);
    else EF.drawTrophy(g, cx, cy + 18, .9, .4);
    if (shiny) px.blend(g, .3 + Math.sin(this.t * 4) * .15, 'add', () => px.poly(g, [[X + w * ((this.t * .5) % 1), Y], [X + w * ((this.t * .5) % 1) + 14, Y], [X + w * ((this.t * .5) % 1) - 10, Y + h], [X + w * ((this.t * .5) % 1) - 24, Y + h]], '#ffffff'));
    E.font.text(g, s.name, X + w / 2, Y + h - 16, '#1a1a2a', { align: 'center', font: 'tiny', outline: false, wrap: w - 6 });
    if (s.pos) E.font.text(g, s.pos, X + w - 6, Y + 4, '#8a2a2a', { align: 'right', font: 'tiny', outline: false });
  },
  draw(r) {
    r.sky(['#1a1420', '#2a2030', '#3a2a3a']);
    r.overlay(g => {
      const pg = this.pages()[this.page];
      for (let y = 0; y < r.H; y += 8) px.rect(g, 0, y, r.W, 1, '#3a2a3a');
      EF.heading(g, 'STICKER ALBUM', r.W / 2, Math.round(r.H * .02), 2);
      E.font.text(g, pg.title + '   (' + (this.page + 1) + '/' + this.pages().length + ')', r.W / 2, Math.round(r.H * .02) + 22, '#ffe08a', { align: 'center', outline: '#000' });
      if (this.flip > 0) px.blend(g, this.flip * 2, 'normal', () => px.rect(g, 0, 0, Math.round(r.W * this.flip / .3), r.H, '#e0d4b8'));
      this.menu.draw(g);
      const n = Object.keys(EF.Save.data.stickers).length;
      E.font.text(g, n + ' OF ' + EF.all('sticker').length + ' COLLECTED', r.W / 2, r.H - 34, '#c8b8d8', { align: 'center', outline: false });
      EF.footer(g, r, [[['switch', 'skill'], 'PAGE', { sep: '/' }], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.album = albumScene;

/* ---- About & Credits: the source information, the feedback and the credits, a page each ---- */
const aboutScene = {
  touch: [], view: 'broadcast', idle: true,
  enter() { this.page = 0; this.t = 0; this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }), onTab: d => this.turn(d) }); EF.music('credits'); EF.idle.reset(); },
  pages() {
    const A_ = EF.ABOUT || {}, si = A_.sourceInformation || {}, Q = EF.ABOUT_Q;
    const lab = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
    const keys = Object.keys(lab), pg = [];
    for (let i = 0; i < keys.length; i += 4) pg.push({ title: 'SOURCE INFORMATION', rows: keys.slice(i, i + 4).map(k => [lab[k], si[k] || 'unknown']) });
    const fb = (title, list, qs) => { for (let i = 0; i < qs.length; i += 2) pg.push({ title, rows: qs.slice(i, i + 2).map((q, j) => [q, (list || [])[i + j] || 'unknown']) }); };
    fb('TESTING FEEDBACK', A_.testingFeedback, Q.testing); fb('ENGINE FEEDBACK', A_.engineFeedback, Q.engine); fb('PROMPT FEEDBACK', A_.promptFeedback, Q.prompt);
    pg.push({ title: 'CREDITS', rows: EF.CREDITS });
    return pg;
  },
  turn(d) { const n = this.pages().length; this.page = (this.page + d + n) % n; },
  update(dt) {
    this.t += dt;
    const r = game.r || { W: game.W, H: game.H };
    this.menu.set([{ label: '<', rect: [6, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(-1) }, { label: '>', rect: [r.W - 28, Math.round(r.H / 2) - 15, 22, 30], onPick: () => this.turn(1) }, { label: 'BACK', rect: [Math.round(r.W / 2 - 50), r.H - 52, 100, 22], onPick: () => game.go('title', { menu: true }) }]);
    if (UIK.anyDir(['right'])) this.turn(1); else if (UIK.anyDir(['left'])) this.turn(-1);
    this.menu.update(dt); EF.idle.tick(dt);
  },
  draw(r) {
    r.sky(['#0a0e24', '#141c3a', '#1a2450']);
    r.overlay(g => {
      const pg = this.pages()[this.page], W = Math.min(r.W - 70, 460), x = Math.round(r.W / 2 - W / 2), y = Math.round(r.H * .04);
      EF.heading(g, pg.title, r.W / 2, y, 2);
      E.font.text(g, 'PAGE ' + (this.page + 1) + ' OF ' + this.pages().length, r.W / 2, y + 20, '#9aa6c8', { align: 'center', outline: false });
      EF.panel(g, x, y + 32, W, r.H - y - 92);
      let yy = y + 40;
      for (const [k, v] of pg.rows) {
        E.font.text(g, k, x + 8, yy, '#ffc83a', { outline: false, wrap: W - 16 }); yy += E.font.wrap(k, W - 16).length * 10 + 2;
        const lines = E.font.wrap(String(v), W - 16); for (const l of lines.slice(0, 7)) { E.font.text(g, l, x + 8, yy, '#e8ecff', { outline: false }); yy += 10; }
        yy += 5; if (yy > r.H - 70) break;
      }
      this.menu.draw(g);
      EF.footer(g, r, [[['switch', 'skill'], 'PAGE', { sep: '/' }], ['cancel', 'BACK']]);
    });
  }
};
EF.scenes.about = aboutScene;
EF.ABOUT_Q = {
  testing: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engine: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'],
  prompt: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
};
EF.CREDITS = [['GAME', 'Europhoria Football: design, code, art, music and words made for this demo. All clubs, players and people are fictional.'], ['ENGINE', 'my-3D2dge v0.85.2 (handoff package) by Michael Crosato, with small changes for kit patterns and babble voices.'], ['ONLINE', 'AI Hub Session Protocol v1, session client 1.4.0.'], ['BUILT BY', 'Anthropic claude-opus-5-5 (reasoning effort medium) in Claude Code, from a plan by claude-opus-5-5 at max effort.'], ['THANKS', 'Everyone who ever stood on a terrace in the rain.']];


/* ===== 32-cup.js ===== */
/* 32-cup: the Cup Run. The bracket, then each round's beats in order (the prologue first): a travel map, a tabloid back
 * page, talks with portraits and choices, the team talk (three cards; the tactics board picks a formation; friends can
 * join here for co-op), the Gaffer's Challenge, the tunnel, the match, the result, stickers and the autosave. Losing
 * gives CONTINUE? with a countdown. The final leads to the ending: the trophy, the parade, the back page, the credits. */
EF.Cup = {
  get s() { return EF.Save.data.cup; },
  newRun() { EF.Save.data.cup = { round: 0, results: [], flags: {}, talks: [], challenges: {}, done: false, started: game.real, prologue: false }; EF.Save.save(); },
  matchOpts(round, talk, formation) {
    const R = EF.ROUNDS[round], humans = game.players.map(I => ({ input: I, side: 0 }));
    const buffs = [{ side: 0, kind: talk || 'arm' }];
    if (R.villain && this.s.flags.loyal) buffs.push({ side: 0, kind: 'loyal' }); else if (R.villain && this.s.flags.jetski) buffs.push({ side: 0, kind: 'jetski' });
    return { home: 'kipperton', away: R.opp, stadium: R.stadium, referee: R.referee, humans, draws: 'cup', buffs, formation: formation ? [formation, null] : null, cup: round,
      onEnd: (sum, m) => game.go('cup', { after: sum, round }) };
  }
};
// the Gaffer's Challenge: watched during a cup match
const CH = { st: {}, id: null, done: false };
EF.bus.on('*', ev => {
  const m = LIVE.m; if (!m || ev.match !== m || m.o.cup == null || !CH.id || CH.done) return;
  const c = EF.get('challenge', CH.id); if (!c) return;
  if (c.test(m, ev, CH.st)) { CH.done = true; EF.Cup.s.challenges[CH.id] = true; EF.Save.save(); LIVE.hud && LIVE.hud.toast("GAFFER'S CHALLENGE", 'COMPLETE: ' + c.title, { t: 4 }); EF.sfx('perfect'); EF.bus.emit('challengeDone', { id: CH.id }); }
});
const cupScene = {
  touch: [], view: 'broadcast', idle: true,
  enter(d) {
    d = d || {}; this.t = 0; this.q = []; this.cur = null; this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffc83a' }); this.menu = new UIMenu({ onBack: () => this.back() });
    game.allowJoin(false); EF.idle.reset();
    if (!EF.Cup.s && LINK.scene === 'cup' && LINK.part) { EF.Cup.newRun(); const k = LINK.part === 'final' ? 4 : clamp((+LINK.part.slice(1) || 1) - 1, 0, 4); EF.Cup.s.round = k; EF.Cup.s.prologue = true; LINK.part = null; this.q = this.roundBeats(k); this.next(); return; }
    if (d.after) { this.afterMatch(d.after, d.round); return; }
    if (d.round != null) { this.q = this.roundBeats(d.round); this.next(); return; }
    this.q = [{ kind: 'bracket' }]; this.next();
  },
  exit() { game.allowJoin(false); },
  back() { if (this.cur && this.cur.kind === 'bracket') game.go('title', { menu: true }); },
  next() {
    this.cur = this.q.shift() || { kind: 'bracket' }; this.cur.t = 0; this.talk.close(); EF.idle.reset();
    const c = this.cur;
    const music = { bracket: 'menu', tabloid: 'tabloid', travel: 'travel', talk: c.villain ? 'villain' : 'dressing', teamtalk: 'dressing', challenge: 'dressing', result: null, knocked: 'defeat' }[c.kind];
    if (music !== undefined && EF.musicNow !== music) EF.music(music);
    if (c.kind === 'tabloid') EF.sfx('typewriter');
    if (c.kind === 'talk') this.runTalk(c);
    if (c.kind === 'teamtalk') { game.allowJoin({ max: 4 }); }
    if (c.kind === 'go') { const o = EF.Cup.matchOpts(c.round, EF.Cup.s.talks[c.round], EF.Cup.s.formation); CH.id = EF.ROUNDS[c.round].challenge; CH.st = {}; CH.done = !!EF.Cup.s.challenges[CH.id] && false; game.allowJoin(false); EF.Save.save(); game.go('tunnel', { match: o }); }
    if (c.kind === 'fn') { c.fn(); this.next(); }
  },
  runTalk(c) {
    const lines = c.lines.slice(), say = () => {
      const [who, text] = lines.shift(), last = !lines.length;
      this.talk.voice = EF.babble.voiceFor(who);
      this.talk.say(text, { name: EF.speakerName(who), portrait: EF.portraitOf(who), portraitOpts: { zoom: 3, turn: .35 }, choices: last && c.choices ? c.choices : null,
        onChoice: i => { if (c.onChoice) c.onChoice(i); }, onDone: () => { if (lines.length) say(); else this.next(); } });
    };
    say();
  },
  roundBeats(k) {
    const R = EF.ROUNDS[k], s = EF.Cup.s, q = [];
    if (k === 0 && !s.prologue) {
      q.push({ kind: 'tabloid', paper: EF.PROLOGUE.tabloid });
      q.push({ kind: 'talk', lines: EF.PROLOGUE.talk, choices: EF.PROLOGUE.choices, onChoice: i => { s.prologue = true; EF.Save.sticker('x-mags'); EF.Save.save(); if (i === 1) { this.q = []; game.go('training', { fromCup: true }); } } });
    }
    if (R.postcard) q.push({ kind: 'travel', to: R.city, round: k, postcard: R.postcard });
    q.push({ kind: 'tabloid', paper: R.pre });
    if (R.villain) q.push({ kind: 'talk', villain: true, lines: EF.VILLAIN.talk, choices: EF.VILLAIN.choices, onChoice: i => { if (i === 0) { s.flags.loyal = true; EF.Save.sticker('x-loyal'); this.q.unshift({ kind: 'talk', lines: EF.VILLAIN.loyal }); } else { s.flags.jetski = true; this.q.unshift({ kind: 'talk', lines: EF.VILLAIN.joke }); } EF.Save.save(); } });
    q.push({ kind: 'talk', lines: R.talk });
    q.push({ kind: 'teamtalk', round: k });
    q.push({ kind: 'challenge', id: R.challenge, round: k });
    q.push({ kind: 'go', round: k });
    return q;
  },
  afterMatch(sum, k) {
    const s = EF.Cup.s, R = EF.ROUNDS[k], kipWon = sum.winner === 0;
    s.results[k] = { opp: R.opp, score: sum.score, pens: sum.pens, won: kipWon };
    if (s.challenges[R.challenge]) EF.Save.sticker('g-' + R.challenge, true);
    if (Object.keys(s.challenges).length >= 5) EF.Save.unlockBall('leather');
    this.q = [{ kind: 'result', sum, round: k }, { kind: 'tabloid', paper: Object.assign({ photo: kipWon ? 'pilchard' : R.pre.photo }, kipWon ? R.win : R.loss) }];
    if (kipWon) {
      if (R.after && R.after.length) this.q.push({ kind: 'talk', lines: R.after });
      if (k === 4) { this.q.push({ kind: 'fn', fn: () => { s.done = true; s.round = 5; EF.Save.data.records.cupsWon++; const tm = game.real - (s.started || 0); if (!EF.Save.data.records.fastestCup || tm < EF.Save.data.records.fastestCup) EF.Save.data.records.fastestCup = tm; EF.Save.unlockBall('gold'); EF.Save.save(); game.go('ending', {}); } }); }
      else this.q.push({ kind: 'fn', fn: () => { s.round = k + 1; EF.Save.save(); } }, { kind: 'bracket' });
    } else this.q.push({ kind: 'knocked', round: k });
    this.next();
  },
  items(r) {
    const c = this.cur, W = Math.min(r.W - 40, 400), x = Math.round(r.W / 2 - W / 2), s = EF.Cup.s;
    if (c.kind === 'bracket') {
      const L = [];
      const rr = s ? s.round : 0, rects = EF.layoutColumn(r, 5, { w: W, h: 26, gap: 4, y: Math.round(r.H * .2) });
      EF.ROUNDS.forEach((R, i) => { const res = s && s.results[i], cur = s && i === rr && !s.done; L.push({ rect: rects[i], disabled: !cur, label: R.name, R, i, res, draw: (g, X, Y, w, h, f) => {
        EF.panel(g, X, Y, w, h, { border: f ? '#ffc83a' : cur ? '#5ae0ff' : '#2a3a6a', alpha: cur || res ? .95 : .6 });
        EF.drawCrest(g, EF.get('team', R.opp), X + 14, Y + h / 2, 18);
        E.font.text(g, R.name, X + 28, Y + 4, cur ? '#ffffff' : '#9aa6c8', { outline: false }); E.font.text(g, 'vs ' + EF.get('team', R.opp).name + ' at ' + EF.get('stadium', R.stadium).name, X + 28, Y + 15, '#ffe08a', { font: 'tiny', outline: false });
        if (res) E.font.text(g, res.score[0] + '-' + res.score[1] + (res.pens ? ' (P ' + res.pens[0] + '-' + res.pens[1] + ')' : '') + (res.won ? '  WON' : '  LOST'), X + w - 8, Y + 9, res.won ? '#5aff7a' : '#ff5a5a', { align: 'right', outline: false });
        else if (cur) { E.font.text(g, 'PLAY', X + w - 8, Y + 9, '#ffc83a', { align: 'right', outline: false }); EF.drawMinibus(g, X + w - 60, Y + h - 4, .7, this.t); }
      }, onPick: () => { this.q = this.roundBeats(i); this.next(); } }); });
      L.push({ label: s ? 'NEW CUP RUN' : 'START THE CUP RUN', rect: [x + W / 2 - 90, rects[4][1] + 34, 180, 24], onPick: () => { EF.Cup.newRun(); this.q = this.roundBeats(0); this.next(); } });
      if (s && !s.done) this.menu.i = Math.min(this.menu.i, L.length - 1);
      if (!s) { L.forEach(it => { if (it.R) it.disabled = true; }); }
      return L;
    }
    if (c.kind === 'teamtalk') {
      const T = EF.all('teamtalk'), w = Math.min(130, Math.floor((W - 16) / 3)), rects = EF.layoutGrid(r, 3, 3, { w, h: 96, y: Math.round(r.H * .22) });
      if (c.pickForm) { const F = ['2-2', '1-2-1', '2-1-1'], fr = EF.layoutGrid(r, 3, 3, { w, h: 60, y: Math.round(r.H * .3) }); return F.map((f, i) => ({ rect: fr[i], label: f, sub: ['ALL OUT ATTACK', 'THE DIAMOND', 'THE CLASSIC'][i], onPick: () => { EF.Cup.s.formation = f; EF.Save.save(); this.next(); } })); }
      return T.map((tt, i) => ({ rect: rects[i], label: tt.name, tt, draw: (g, X, Y, w2, h, f) => { EF.panel(g, X, Y, w2, h, { border: f ? '#ffc83a' : '#2a3a6a' }); E.font.text(g, tt.name, X + w2 / 2, Y + 8, '#ffffff', { align: 'center', outline: false, wrap: w2 - 10 }); EF.textBlock(g, tt.desc, X + 6, Y + 40, w2 - 12, { color: '#ffe08a', font: 'tiny' }); }, onPick: () => {
        EF.Cup.s.talks[c.round] = tt.id; EF.Save.save(); const line = EF.fxPick(tt.lines);
        this.talk.voice = EF.babble.voiceFor('mags');
        this.talk.say(line, { name: 'MAGS MULLIGAN', portrait: EF.portraitOf('mags'), onDone: () => { if (tt.id === 'tactics') { c.pickForm = true; this.menu.i = 0; } else { EF.Cup.s.formation = null; this.next(); } } });
      } }));
    }
    if (c.kind === 'challenge' || c.kind === 'tabloid' || c.kind === 'travel' || c.kind === 'result') return [{ label: 'CONTINUE', rect: [x + W / 2 - 80, r.H - Math.round(r.H * .04) - 44, 160, 22], onPick: () => this.next() }];
    if (c.kind === 'knocked') return [{ label: 'CONTINUE? (' + Math.max(0, Math.ceil(10 - c.t)) + ')', rect: [x + W / 2 - 100, Math.round(r.H * .66), 200, 26], onPick: () => { this.q = [{ kind: 'teamtalk', round: c.round }, { kind: 'challenge', id: EF.ROUNDS[c.round].challenge, round: c.round }, { kind: 'go', round: c.round }]; this.next(); } },
      { label: 'GIVE UP', rect: [x + W / 2 - 100, Math.round(r.H * .66) + 32, 200, 22], onPick: () => { EF.Cup.s.round = c.round; EF.Save.save(); game.go('title', { menu: true }); } }];
    return [];
  },
  update(dt) {
    this.t += dt; const c = this.cur; c.t += dt;
    if (this.talk.open) { this.talk.update(dt); return; }
    if (c.kind === 'knocked' && c.t > 10) { EF.Cup.s.round = c.round; EF.Save.save(); game.go('title', { menu: true }); return; }
    this.menu.set(this.items(game.r || { W: game.W, H: game.H }));
    if (c.kind === 'bracket' && this.menu.cur && this.menu.cur.disabled && this.menu.items.length) { const k = this.menu.items.findIndex(it => !it.disabled); if (k >= 0) this.menu.i = k; }
    if (c.t > .35) this.menu.update(dt);
    if (c.kind === 'bracket' || c.kind === 'teamtalk' || c.kind === 'challenge' || c.kind === 'tabloid') EF.idle.tick(dt);
  },
  draw(r) {
    const c = this.cur;
    if (c.kind === 'tabloid') this.drawTabloid(r, c.paper, c.t);
    else if (c.kind === 'travel') this.drawTravel(r, c);
    else {
      r.sky(c.villain ? ['#0a0410', '#1a0a20', '#2a1030'] : ['#0a0e24', '#141c3a', '#1a2450']);
      r.overlay(g => {
        for (let y = 0; y < r.H; y += 6) px.rect(g, 0, y, r.W, 1, '#ffffff08');
        if (c.kind === 'bracket') { EF.heading(g, 'THE EUROPHORIA CUP', r.W / 2, Math.round(r.H * .04), 3); E.font.text(g, 'THE KIPPERS\' ROAD TO GLORY', r.W / 2, Math.round(r.H * .04) + 28, '#ffe08a', { align: 'center', outline: '#000' }); }
        if (c.kind === 'talk') { EF.drawCrest(g, EF.get('team', 'kipperton'), r.W / 2, r.H * .32, 60); E.font.text(g, c.villain ? 'THE GRAND HOTEL AURELIA. MIDNIGHT.' : 'THE DRESSING ROOM', r.W / 2, r.H * .08, '#ffe08a', { align: 'center', outline: '#000' }); if (c.villain) { const rig = EF.portraitOf('baron'); rig.drawPortrait(g, Math.round(r.W / 2 - 40), Math.round(r.H * .14), 80); } }
        if (c.kind === 'teamtalk') { EF.heading(g, c.pickForm ? 'TACTICS BOARD' : 'TEAM TALK', r.W / 2, Math.round(r.H * .04), 3); E.font.text(g, c.pickForm ? 'PICK A FORMATION' : 'HOW DOES MAGS FIRE THEM UP?  (FRIENDS: PRESS 2 OR START TO JOIN FOR CO-OP: ' + game.players.length + ' PLAYING)', r.W / 2, Math.round(r.H * .04) + 28, '#ffe08a', { align: 'center', outline: '#000', wrap: r.W - 40 }); }
        if (c.kind === 'challenge') { const ch = EF.get('challenge', c.id), w = Math.min(r.W - 60, 320), x = r.W / 2 - w / 2, y = r.H * .25; EF.panel(g, x, y, w, 110, { border: '#ff9ae0' }); E.font.text(g, "THE GAFFER'S CHALLENGE", r.W / 2, y + 10, '#ff9ae0', { align: 'center', outline: false }); EF.heading(g, ch.title, r.W / 2, y + 34, 2, { colors: ['#ffffff', '#ffe08a'] }); E.font.text(g, 'OPTIONAL: COMPLETE IT FOR A SHINY STICKER', r.W / 2, y + 70, '#c8d0f0', { align: 'center', outline: false }); E.font.text(g, EF.ROUNDS[c.round].name + ': vs ' + EF.get('team', EF.ROUNDS[c.round].opp).name, r.W / 2, y + 86, '#9aa6c8', { align: 'center', outline: false }); }
        if (c.kind === 'result') { const s = c.sum, w = c.sum.winner === 0; EF.heading(g, w ? 'THROUGH!' : 'OUT...', r.W / 2, r.H * .12, 4, { colors: w ? ['#ffffff', '#5aff7a', '#20a040'] : ['#ffffff', '#ff5a5a', '#a02020'] }); E.font.text(g, 'KIPPERTON ' + s.score[0] + ' - ' + s.score[1] + ' ' + EF.get('team', s.away).name + (s.pens ? '  (PENS ' + s.pens[0] + '-' + s.pens[1] + ')' : ''), r.W / 2, r.H * .36, '#ffffff', { align: 'center', scale: 1, outline: '#000' }); const ch = EF.get('challenge', EF.ROUNDS[c.round].challenge); E.font.text(g, "GAFFER'S CHALLENGE: " + ch.title + (EF.Cup.s.challenges[ch.id] ? '  DONE!' : '  NOT THIS TIME'), r.W / 2, r.H * .46, EF.Cup.s.challenges[ch.id] ? '#ff9ae0' : '#9aa6c8', { align: 'center', outline: false }); }
        if (c.kind === 'knocked') { EF.heading(g, 'KNOCKED OUT!', r.W / 2, r.H * .2, 4, { colors: ['#ffffff', '#ff5a5a', '#a02020'] }); E.font.text(g, 'THE DREAM IS NOT OVER YET. TRY THE ROUND AGAIN?', r.W / 2, r.H * .46, '#ffe08a', { align: 'center', outline: '#000' }); }
        this.menu.draw(g);
        if (!this.talk.open) EF.footer(g, r, c.kind === 'bracket' ? [['confirm', 'SELECT'], ['cancel', 'TITLE']] : [['confirm', 'CONTINUE']]);
      });
    }
    this.talk.draw(r);
  },
  /** THE DAILY ROAR: a back page dropping in with a spin */
  drawTabloid(r, p, t) {
    r.sky(['#2a2420', '#3a3228', '#4a4034']);
    r.overlay(g => {
      const u = Math.min(1, t / .5), w = Math.min(r.W - 30, 380) * (.3 + .7 * E.ease.outBack(u)), h = Math.min(r.H - 40, 200) * (.3 + .7 * E.ease.outBack(u)), x = r.W / 2 - w / 2, y = r.H * .44 - h / 2;
      px.rect(g, Math.round(x + 4), Math.round(y + 4), Math.round(w), Math.round(h), '#00000080');
      px.rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), '#ece6d6');
      for (let k = 0; k < h; k += 3) if (E.hash2(k, 3) > .7) px.rect(g, Math.round(x), Math.round(y + k), Math.round(w), 1, '#e0d8c6');
      if (u < 1) return;
      px.rect(g, Math.round(x), Math.round(y), Math.round(w), 22, '#c8202a');
      E.font.title(g, 'THE DAILY ROAR', Math.round(x + 8), Math.round(y + 3), { scale: 2, colors: ['#ffffff', '#ffe0e0'], depth: 0, outline: '#600' });
      E.font.text(g, 'EUROPHORIA CUP SPECIAL   ' + 'PRICE: ONE KIPPER', Math.round(x + w - 6), Math.round(y + 8), '#ffe0e0', { align: 'right', font: 'tiny', outline: false });
      const lines = E.font.wrap(p.headline, w - 20, { scale: 3 }).length > 2 ? 2 : 3;
      E.font.text(g, p.headline, Math.round(x + w / 2), Math.round(y + 28), '#141414', { align: 'center', scale: lines, wrap: w - 16, outline: false });
      const ph = { x: x + 10, y: y + h - 86, w: 80, h: 76 };
      px.rect(g, Math.round(ph.x - 1), Math.round(ph.y - 1), ph.w + 2, ph.h + 2, '#141414'); px.rect(g, Math.round(ph.x), Math.round(ph.y), ph.w, ph.h, '#8a8478');
      if (p.photo) EF.portraitOf(p.photo).drawPortrait(g, Math.round(ph.x + 6), Math.round(ph.y + 4), 68, { tint: '#8a8a8a' });
      EF.textBlock(g, p.sub, x + 100, y + h - 82, w - 112, { color: '#2a2a2a', shadow: false });
      E.font.text(g, 'FULL STORY: PAGES 2, 3, 4, 5 AND 94', Math.round(x + 100), Math.round(y + h - 18), '#6a6a6a', { font: 'tiny', outline: false });
      EF.footer(g, r, [['confirm', 'CONTINUE']]);
    });
    this.menu.draw && r.overlay(g => this.menu.draw(g));
  },
  /** the travel map: a fictional Europe, the minibus "The Old Trout" on a dotted road */
  drawTravel(r, c) {
    r.sky(['#2a5a8a', '#3a6a9a', '#4a7aaa']);
    r.overlay(g => {
      const W = r.W, H = r.H, X = u => Math.round(W * u), Y = v => Math.round(H * v);
      const land = [[.05, .2], [.2, .1], [.35, .16], [.5, .08], [.7, .12], [.92, .18], [.95, .5], [.85, .7], [.7, .9], [.55, .82], [.42, .95], [.3, .8], [.15, .85], [.08, .6]];
      const snow = c.round === 2;
      px.poly(g, land.map(([u, v]) => [X(u), Y(v)]), snow ? '#e8ecf4' : '#5a8a4a'); px.poly(g, land.map(([u, v]) => [X(u * .96 + .02), Y(v * .96 + .02)]), snow ? '#d8dce8' : '#6a9a54');
      const C = { kipperton: [.18, .22], solera: [.3, .78], eisenhutte: [.66, .3], castelfortezza: [.56, .7], aurelia: [.8, .55] };
      for (const [k, [u, v]] of Object.entries(C)) { px.disc(g, X(u), Y(v), 3, '#141414'); px.disc(g, X(u), Y(v), 2, k === c.to ? '#ffc83a' : '#ffffff'); E.font.text(g, k.toUpperCase(), X(u), Y(v) + 5, '#141414', { align: 'center', font: 'tiny', outline: false }); }
      const order = ['kipperton', 'solera', 'eisenhutte', 'castelfortezza', 'aurelia'], i = order.indexOf(c.to), from = C[order[Math.max(0, i - 1)]], to = C[c.to];
      const u = Math.min(1, c.t / 3);
      for (let k = 0; k <= 20; k++) if (k % 2 === 0) px.dot(g, X(lerp(from[0], to[0], k / 20)), Y(lerp(from[1], to[1], k / 20) - Math.sin(k / 20 * PI) * .08), '#c8202a');
      EF.drawMinibus(g, X(lerp(from[0], to[0], u)), Y(lerp(from[1], to[1], u) - Math.sin(u * PI) * .08), 1, this.t);
      EF.panel(g, X(.58), Y(.04), X(.4), 34, { bg: ['#f4ecd8', '#e8dcc0'], border: '#c8202a' });
      E.font.text(g, 'POSTCARD', X(.6), Y(.04) + 4, '#c8202a', { font: 'tiny', outline: false }); E.font.text(g, c.postcard, X(.6), Y(.04) + 14, '#2a2a2a', { outline: false, wrap: X(.38) });
      E.font.text(g, 'THE OLD TROUT HEADS FOR ' + c.to.toUpperCase(), W / 2, H - 46, '#ffffff', { align: 'center', outline: '#000' });
      EF.footer(g, r, [['confirm', 'CONTINUE']]);
    });
    r.overlay(g => this.menu.draw(g));
  }
};
EF.scenes.cup = cupScene;

/* ---- the tunnel: the walkout, the handshakes, the coin toss (and, in a hub session, the card) ---- */
const tunnelScene = {
  touch: [], view: 'broadcast',
  enter(d) {
    this.d = d || {}; this.t = 0; const o = this.d.match || { home: 'kipperton', away: 'hoofington', stadium: 'smokehouse' };
    this.stage = new Stage(o.stadium || EF.get('team', o.home).stadium, { home: o.home, away: o.away });
    const m = this.stage.m; this.m = m;
    m.players.forEach((f, i) => { f.state = 'run'; f.body.x = P.CX + (f.side ? 10 : -10); f.body.y = P.Y1 + 30 + f.idx * 12; f.facing = -PI / 2; f.walk = i * .25; });
    m.official = null; this.len = this.d.short ? 3.5 : this.d.card ? 1e9 : 8;
    game.setView('broadcast'); game.setZoom(1.4); game.zoomBase = 1.4;
    EF.music('anthem'); EF.crowdAudio.start(.6);
    this.coin = 0;
  },
  exit() { EF.crowdAudio.stop(); },
  update(dt) {
    this.t += dt; const m = this.m;
    m.players.forEach(f => {
      const k = Math.max(0, this.t - f.walk), tx = P.CX + (f.side ? 1 : -1) * (14 + f.idx * 16), ty = P.CY + 40;
      const along = Math.min(1, k / 3.2), sx = P.CX + (f.side ? 10 : -10), sy = P.Y1 + 30 + f.idx * 4;
      const x = lerp(sx, tx, along), y = lerp(sy, ty, along);
      f.body.vx = (x - f.body.x) / dt; f.body.vy = (y - f.body.y) / dt; f.body.x = x; f.body.y = y;
      f.facing = along < 1 ? Math.atan2(f.body.vy, f.body.vx) : PI / 2;
      if (along >= 1) { f.body.vx = f.body.vy = 0; }
    });
    this.stage.update(dt);
    game.focus(P.CX, lerp(P.Y1 + 20, P.CY + 30, Math.min(1, this.t / 4)), 10);
    if (this.t > 5) this.coin = Math.min(1, (this.t - 5) / 1);
    if (this.d.card && EF.Hub) { EF.Hub.cardUpdate(dt, this); return; }
    const skip = this.t > .5 && (game.players.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked());
    if (this.t > this.len || skip) { game.players.forEach(I => I.consumeAll()); game.go('match', this.d.match); }
  },
  draw(r) {
    this.stage.draw(r);
    const m = this.m;
    r.overlay(g => {
      if (this.d.card && EF.Hub) { EF.Hub.cardDraw(g, r, this); return; }
      const t0 = m.teams[0], t1 = m.teams[1];
      const w = Math.min(r.W - 40, 360), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .05);
      EF.panel(g, x, y, w, 46, { alpha: .85 });
      EF.drawCrest(g, t0, x + 22, y + 23, 30); EF.drawCrest(g, t1, x + w - 22, y + 23, 30);
      E.font.text(g, t0.name, x + 44, y + 8, '#ffffff', { outline: false }); E.font.text(g, t1.name, x + w - 44, y + 8, '#ffffff', { align: 'right', outline: false });
      E.font.text(g, 'vs', r.W / 2, y + 8, '#ffc83a', { align: 'center', scale: 2, outline: false });
      E.font.text(g, m.st.name + ', ' + m.st.city + '.  REFEREE: ' + (m.ref ? m.ref.name : ''), r.W / 2, y + 30, '#ffe08a', { align: 'center', font: 'tiny', outline: false });
      if (this.coin > 0) { const k = Math.abs(Math.cos(this.coin * PI * 6)); const cx = Math.round(r.W / 2), cy = Math.round(r.H * .5 - Math.sin(this.coin * PI) * 30); px.ell(g, cx, cy, 7, Math.max(1, Math.round(7 * k)), '#e8c040'); }
      EF.footer(g, r, [['confirm', 'SKIP']]);
    });
  }
};
EF.scenes.tunnel = tunnelScene;

/* ---- the ending: the trophy, the parade, the back page, the credits ---- */
const endingScene = {
  touch: [], view: 'broadcast',
  enter() {
    this.t = 0; this.phase = 0; this.stage = new Stage('euphorium', { weather: false }); this.m = this.stage.m;
    this.m.side[0].forEach((f, i) => { f.state = 'run'; f.body.x = P.CX - 32 + i * 16; f.body.y = P.Y0 + 70; f.facing = PI / 2; f.celebrate = i === 4 ? null : 'pile'; });
    game.setView('broadcast'); game.setZoom(1.6); game.zoomBase = 1.6;
    EF.music('ceremony'); EF.crowdAudio.start(1); EF.crowdAudio.react('roar', 1.4);
    this.confetti = 0; this.credits = 0;
  },
  exit() { EF.crowdAudio.stop(); },
  update(dt) {
    this.t += dt; const m = this.m;
    const skip = game.players.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked();
    if (this.phase === 0) {
      this.stage.update(dt); game.focus(P.CX, P.Y0 + 40, 20);
      if ((this.confetti -= dt) <= 0) { this.confetti = .15; PFX.bits(P.CX + EF.fx(-80, 80), P.Y0 + 70 + EF.fx(-40, 40), 80, 6, ['#f08a24', '#1c2a5a', '#ffffff', '#ffc83a']); }
      if (this.t % 2 < dt) this.stage.view.firework(2);
      if (this.t > 7 || (skip && this.t > 1)) { this.phase = 1; this.t = 0; EF.music('anthem'); }
    } else if (this.phase === 1) { if (this.t > 9 || (skip && this.t > 1)) { this.phase = 2; this.t = 0; EF.music('tabloid'); } }
    else if (this.phase === 2) { if (this.t > 6 || (skip && this.t > 1)) { this.phase = 3; this.t = 0; EF.music('credits'); } }
    else { this.credits += dt * 22; if (this.credits > this.creditH + 260 || (skip && this.t > 1)) game.go('title', { menu: true }); }
  },
  draw(r) {
    const t = this.t;
    if (this.phase === 0) {
      this.stage.draw(r);
      const daz = this.m.side[0][4], b = daz.body;
      r.queue(P.CX, P.Y0 + 64, 0, g => { const [x, y] = r.w(P.CX, P.Y0 + 64, 0); px.rect(g, Math.round(x) - 50, Math.round(y) - 8, 100, 10, '#e8e4d8'); px.rect(g, Math.round(x) - 50, Math.round(y) + 2, 100, 4, '#a8a498'); });
      const lift = Math.min(1, Math.max(0, (t - 1.5) / 1.5));
      r.queue(b.x, b.y, 34 + lift * 10, g => { const [x, y] = r.w(b.x, b.y, 34 + lift * 10); EF.drawTrophy(g, x, y, 1, .3 + Math.sin(t * 6) * .2); }, { emissive: true, bias: 5 });
      daz.celebrate = lift > .2 ? { anim: 'cheer' } : null;
      r.overlay(g => { EF.heading(g, 'CHAMPIONS OF EUROPE!', r.W / 2, Math.round(r.H * .06), 3); E.font.text(g, 'KIPPERTON ATHLETIC LIFT THE EUROPHORIA CUP', r.W / 2, Math.round(r.H * .06) + 30, '#ffe08a', { align: 'center', outline: '#000' }); EF.footer(g, r, [['confirm', 'NEXT']]); });
    } else if (this.phase === 1) {
      // the parade: Kipperton harbour by day, the team on the trawler on wheels, the town on both sides
      r.sky(['#6aaee8', '#a8d4f0', '#e8f0e0']);
      r.overlay(g => {
        const W = r.W, H = r.H, road = Math.round(H * .72);
        px.rect(g, 0, Math.round(H * .45), W, Math.round(H * .12), '#3a6a9a'); for (let x = 0; x < W; x += 6) px.rect(g, x + Math.round(t * 8) % 6, Math.round(H * .48 + Math.sin(x * .1 + t) * 2), 3, 1, '#8ab8e0');
        EF.drawSkyline(g, r, EF.get('stadium', 'smokehouse'), t, Math.round(H * .45), W);
        px.rect(g, 0, Math.round(H * .57), W, road - Math.round(H * .57), '#8a8478'); px.rect(g, 0, road, W, H - road, '#4a4a50');
        for (let i = 0; i < 40; i++) { const x = (i * 23 + 5) % W, f = { shirt: i % 2 ? '#f08a24' : '#1c2a5a', shirtSh: '#2a2a2a', skin: ['#e0b090', '#a87050', '#f0c8a8'][i % 3], hair: '#3a2418', scarf: '#f08a24', scarf2: '#1c2a5a', ph: i, kind: i % 3 }; EF.drawFan(g, x, Math.round(H * .64), f, i % 2 ? 2 : 3, t); EF.drawFan(g, (x + 11) % W, H - 6, f, i % 3 ? 1 : 2, t); }
        const tx = ((t * 40) % (W + 300)) - 150;
        EF.drawTrawler(g, tx, road + 10, 1, t);
        for (let i = 0; i < 5; i++) { const f = { shirt: '#f08a24', shirtSh: '#1c2a5a', skin: '#e0b090', hair: '#3a2418', scarf: '#ffffff', scarf2: '#1c2a5a', ph: i, kind: 0 }; EF.drawFan(g, tx - 40 + i * 14, road - 20, f, 2, t); }
        for (let i = 0; i < 4; i++) { const gx = (t * 30 + i * 90) % W, gy = H * .2 + Math.sin(t * 2 + i) * 10; px.line(g, gx - 4, gy, gx, gy - 2, '#ffffff'); px.line(g, gx, gy - 2, gx + 4, gy, '#ffffff'); }
        if (EF.fxRng() < .5) for (let k = 0; k < 2; k++) px.rect(g, Math.round(EF.fx(0, W)), Math.round(EF.fx(0, H * .7)), 2, 2, EF.fxPick(['#f08a24', '#1c2a5a', '#ffffff']));
        EF.heading(g, 'THE PARADE', W / 2, Math.round(H * .04), 3); E.font.text(g, 'ALL 3,112 OF KIPPERTON TURN OUT. AND THEIR CATS.', W / 2, Math.round(H * .04) + 28, '#1c2a5a', { align: 'center', outline: '#fff' });
        EF.footer(g, r, [['confirm', 'NEXT']]);
      });
    } else if (this.phase === 2) cupScene.drawTabloid.call({ menu: {} }, r, EF.ENDING.tabloid, t);
    else {
      r.sky(['#04040c', '#0a0a1a', '#141428']);
      r.overlay(g => {
        const lines = ['EUROPHORIA FOOTBALL', '', 'STARRING', 'KIPPERTON ATHLETIC', 'WALLY CRABB  SANDRA OKAFOR  AGGIE NOWAK', 'TOMMY TRAN  DAZ PILCHARD', 'MANAGER: MAGS MULLIGAN', '', 'COMMENTARY', 'BARRY BELLOW AND TREV BRICKLEY', '', 'THE OPPOSITION', ...EF.all('team').filter(t => t.id !== 'kipperton').map(t => t.name), '', 'THE REFEREES', ...EF.all('referee').map(x => x.name), '', ...EF.CREDITS.flatMap(([k, v]) => [k, ...E.font.wrap(v, r.W - 60)]), '', 'KINGSBRIDGE ALBION HAVE DEMANDED A RECOUNT.', '', 'THANKS FOR PLAYING!'];
        this.creditH = lines.length * 14;
        lines.forEach((l, i) => { const y = Math.round(r.H + 10 + i * 14 - this.credits); if (y > -10 && y < r.H) E.font.text(g, l, r.W / 2, y, i === 0 ? '#ffc83a' : /^[A-Z ]+$/.test(l) && l.length < 20 ? '#ffe08a' : '#e8ecff', { align: 'center', scale: i === 0 ? 2 : 1, outline: false }); });
        EF.footer(g, r, [['confirm', 'SKIP']]);
      });
    }
  }
};
EF.scenes.ending = endingScene;


/* ===== 33-match.js ===== */
/* 33-match: the match scene. It builds a Match from options (teams, stadium, conditions, humans and their sides, cup
 * buffs, draws rule), runs it with its view, HUD, commentary, crowd engine and replay recorder, turns the match's events
 * into sound, crowd, notices, camera moments and rumble, and hands the result on. */
const LIVE = { m: null, view: null, hud: null, com: null, rec: null, opts: null, slow: 0 };
EF.LIVE = LIVE;
/** what the presentation does with each match event */
function present(type, ev) {
  const m = LIVE.m; if (!m || ev.match !== m) return;
  const H = LIVE.hud, V = LIVE.view, C = LIVE.com, CA = EF.crowdAudio, rec = LIVE.rec, quiet = !!LIVE.opts.quiet;
  const rumble = (k, s) => { for (const sl of m.slots) if (sl.ctl && sl.ctl.I && sl.ctl.I.rumble) sl.ctl.I.rumble(k, s); };
  const slowmo = (k, t) => { if (!m.session) { game.timeScale = k * EF.T.gameSpeed; LIVE.slow = t; } };
  V && V.react(type, ev);
  if (C && !quiet) EF.commentaryFor(C, type, ev);
  const who = ev.who != null ? m.players[ev.who] : null, team = ev.side != null ? m.teams[ev.side] : null;
  switch (type) {
    case 'pass': EF.sfx('pass', { vol: .7 }); rec && rec.cue('pass'); break;
    case 'touch': EF.sfx('touch'); break;
    case 'shot': EF.sfx(ev.power > .75 ? 'screamer' : 'kick'); rec && rec.cue('kick'); rumble(.3 + (ev.power || .5) * .5, .12); if (ev.onTarget) { CA.react('ooh', .4); } break;
    case 'screamer': H.notice('SCREAMER!', { t: 1, scale: 2, colors: ['#ffffff', '#ffe08a', '#ff7a2a'] }); break;
    case 'woodwork': EF.sfx('doink'); rec && rec.cue('doink'); CA.react('ooh'); game.shake(3); rumble(.6, .2); H.notice('DOINK!', { t: 1, scale: 3, colors: ['#ffffff', '#c8ccd8', '#8a90a8'] }); break;
    case 'bounce': if (ev.kind === 'net') { EF.sfx('net'); rec && rec.cue('net'); } else if (ev.kind === 'boards') EF.sfx('thump', { vol: .6 }); else if (ev.surf === 'puddle' || ev.surf === 'wet') EF.sfx('splash', { vol: .5 }); else if (ev.surf === 'snow') EF.sfx('crunch', { vol: .5 }); else EF.sfx('thump', { vol: .35 }); if (ev.surf === 'puddle') PFX.bits(ev.x, ev.y, 2, 6, ['#8ab0d0', '#c8e0f0']); break;
    case 'goal': case 'ownGoal':
      EF.sfx('net'); EF.sfx('whistleLong'); CA.react('roar', 1.2); game.flash('#ffffff', .15, .5); game.shake(4); rumble(.9, .5);
      H.notice(type === 'ownGoal' ? 'OWN GOAL!' : 'GOAL!', { t: 2.6, scale: 5, sub: (ev.name || '') + ' ' + (ev.minute || '') });
      try { A.sting(EF.SONGS.goal, { at: 'now' }); } catch (e) { /* no sound */ }
      PFX.sparks(m.ball.x, m.ball.y, 16, 20, null, { color: '#ffe08a' }); PFX.ring(m.ball.x, m.ball.y, 4, 40, '#fff6c0', .5);
      if (team) game.after(0.8, () => EF.chant.sing(team.chant, { reps: 2 }));
      if (C && who && m.goals.length) game.after(3.2, () => C.announce('GOAL FOR ' + team.name + ', SCORED BY NUMBER ' + (who.data.num) + ', ' + who.data.name + '!'));
      break;
    case 'catch': EF.sfx('catch'); break;
    case 'save': EF.sfx(ev.kind === 'catch' ? 'catch' : 'parry'); CA.react('ooh', .8); rumble(.5, .15); if (ev.kind === 'tip') H.notice('TIPPED OVER!', { t: 1, scale: 2 }); else if (ev.kind === 'parry' || ev.kind === 'catch') H.notice('SAVE!', { t: 1, scale: 3, colors: ['#ffffff', '#5ae0ff', '#3a8aff'] }); break;
    case 'whistle': EF.sfx(ev.kind === 'full' ? 'whistleLong' : 'whistle'); if (ev.kind === 'full') { game.after(0.3, () => EF.sfx('whistle')); game.after(0.6, () => EF.sfx('whistleLong')); } if (ev.kind === 'half') game.after(0.3, () => EF.sfx('whistle')); break;
    case 'kickoff': if (ev.fresh) H.notice(m.half === 3 ? 'GOLDEN GOAL!' : ev.half === 2 ? 'SECOND HALF' : 'KICK OFF', { t: 1.6, scale: 3, sub: m.half === 3 ? 'NEXT GOAL WINS IT' : null }); if (ev.fresh && m.teams[ev.side]) game.after(0.6, () => EF.chant.sing(m.teams[ev.side].chant)); break;
    case 'half': H.notice('HALF TIME', { t: 3 }); EF.music('halftime'); game.after(4.2, () => EF.music(null)); break;
    case 'fulltime': H.notice('FULL TIME', { t: 3 }); break;
    case 'extraTime': H.notice('EXTRA TIME', { t: 2.4, sub: 'GOLDEN GOAL: THE NEXT ONE WINS IT' }); break;
    case 'tackleWon': EF.sfx('thump'); rumble(.3, .1); break;
    case 'slide': EF.sfx('slide'); if (m.surface === 'wet') PFX.bits(who.body.x, who.body.y, 2, 6, ['#8ab0d0', '#c8e0f0']); else PFX.dust(who.body.x, who.body.y, 1, 4); break;
    case 'launch': EF.sfx('knock'); game.hitFx(ev.x, ev.y, 12, { power: .8, sound: 'hit', damage: null }); CA.react('ooh', .6); break;
    case 'knockdown': EF.sfx('knock'); PFX.dust(ev.x, ev.y, 1, 6); break;
    case 'foul': CA.react('whistle'); break;
    case 'advantage': H.notice('ADVANTAGE!', { t: 1.2, scale: 2 }); break;
    case 'card': EF.sfx('card'); CA.react('boo', .7); H.notice(ev.kind === 'red' ? (ev.second ? 'SECOND YELLOW... RED!' : 'RED CARD!') : 'YELLOW CARD', { t: 2, scale: 3, colors: ev.kind === 'red' ? ['#ffffff', '#ff5a5a', '#c8202a'] : ['#ffffff', '#ffe060', '#e0a020'], sub: who ? who.data.name : '' }); break;
    case 'diveBooked': H.notice('SIMULATION!', { t: 1.8, scale: 3, colors: ['#ffffff', '#ff9ae0', '#c83a90'] }); CA.react('boo'); break;
    case 'diveWon': H.notice(ev.inBox ? 'HE BOUGHT A PENALTY!' : 'FREE KICK!', { t: 1.4, scale: 2 }); break;
    case 'var': H.notice('VAR CHECK', { t: 2.5, scale: 3, colors: ['#ffffff', '#5ae0ff', '#3a6aff'] }); CA.react('hum'); for (let i = 0; i < 3; i++) game.after(.3 + i * .5, () => EF.sfx('varBeep')); break;
    case 'varDecision': H.notice(ev.kind === 'goal' ? 'GOAL STANDS' : ev.overturned ? 'NO PENALTY' : 'PENALTY STANDS', { t: 2, scale: 3 }); CA.react(ev.overturned ? 'boo' : 'roar', .6); break;
    case 'penaltyAwarded': H.notice('PENALTY!', { t: 1.6, scale: 4 }); CA.react('roar', .5); break;
    case 'crowdThrow': H.notice('INTO THE CROWD!', { t: 1.4, scale: 2 }); break;
    case 'setpiece': if (ev.kind === 'corner') H.notice('CORNER', { t: 1, scale: 2 }); if (ev.kind === 'goalkick') H.notice('GOAL KICK', { t: 1, scale: 2 }); if (ev.kind === 'freekick') H.notice('FREE KICK', { t: 1, scale: 2 }); break;
    case 'skill': EF.sfx('swish'); break;
    case 'nutmeg': EF.sfx('nutmeg'); H.notice('NUTMEG!', { t: 1, scale: 2, colors: ['#ffffff', '#ffe08a', '#ff9a3a'] }); CA.react('ooh', .5); break;
    case 'rainbow': H.notice('RAINBOW FLICK!', { t: 1, scale: 2 }); break;
    case 'euphoriaGain': EF.sfx('segment'); break;
    case 'euphoriaFull': H.notice(m.teams[ev.side].short + ': EUROPHORIA READY', { t: 1.6, scale: 2, colors: ['#ffffff', '#ffc83a', '#ff7a2a'] }); EF.chant.sing(m.teams[ev.side].chant, { reps: 2 }); break;
    case 'europhoria':
      EF.sfx('europhoria'); game.flash(EF.kitFor(m, ev.side).shirt, .25, .6); CA.react('roar', 1); rumble(.8, .4);
      H.notice('EUROPHORIA!', { t: 2.2, scale: 5, colors: ['#ffffff', '#ff7ad0', '#ffc83a', '#ff5a2a'], sub: m.teams[ev.side].name + ': ONE SUPER STRIKE UNLOCKED' });
      if (!m.session) { EF.music('europhoria', { fade: .2 }); for (const t of ['drums', 'bass', 'brass']) try { A.layer(t, 1, .4); } catch (e) { /* */ } }
      break;
    case 'europhoriaEnd': if (!m.session) EF.music(null); break;
    case 'superStrike': EF.sfx('superCharge'); H.notice(ev.name, { t: 2, scale: 4, colors: ['#ffffff', '#ffe08a', '#ff3aa0', '#7a3aff'] }); game.flash('#ffffff', .2, .4); PFX.ring(who.body.x, who.body.y, 4, 60, '#ffe08a', .6); break;
    case 'superRelease': EF.sfx('superBoom'); game.shake(5); rumble(1, .4); break;
    case 'hammer': EF.sfx('superBoom', { vol: .5 }); game.shake(4); PFX.dust(ev.x, ev.y, 1, 12); break;
    case 'slowmo': slowmo(ev.k, ev.t / Math.max(.1, ev.k)); break;
    case 'saveDuel': H.notes = []; try { A.music(EF.SONGS.tension); } catch (e) { /* */ } break;
    case 'saveDuelResult': EF.sfx(ev.result === 'miss' ? 'miss' : 'perfect'); H.notice(ev.result.toUpperCase() + (ev.result === 'miss' ? '' : '!'), { t: 1.6, scale: 4, colors: ev.result === 'miss' ? ['#ffffff', '#ff5a5a', '#a02020'] : ['#ffffff', '#5aff7a', '#20a040'] }); rumble(.9, .3); EF.music(null); break;
    case 'bus': H.notice('THEY\'VE PARKED THE BUS!', { t: 2.4, scale: 3 }); EF.sfx('horn'); break;
    case 'busSmash': H.notice('BUS SMASHED!', { t: 2, scale: 3 }); EF.sfx('smash'); game.shake(6); break;
    case 'busGone': EF.sfx('horn'); break;
    case 'refHit': CA.react('ooh'); EF.sfx('knock'); break;
    case 'event': if (ev.id === 'floodlight') { EF.sfx('powerDown'); } if (ev.id === 'seagull') EF.sfx('gull'); if (ev.id === 'beachball') EF.sfx('boing'); if (ev.id.startsWith('invader')) CA.react('roar', .4); H.notice(ev.name, { t: 1.6, scale: 2, colors: ['#ffffff', '#5ae0ff', '#3a8aff'] }); if (C && ev.id === 'floodlight') game.after(1.5, () => C.announce('APOLOGIES. THE FISH-OIL GENERATOR HAS HAD A MOMENT.')); break;
    case 'gullAway': EF.sfx('gull'); break;
    case 'beachHit': EF.sfx('boing', { vol: .5 }); break;
    case 'beachPop': EF.sfx('card'); PFX.bits(ev.x, ev.y, 10, 10, ['#ff4a4a', '#3a8aff', '#ffd03a']); break;
    case 'invaderTackled': H.notice('INVADER STOPPED!', { t: 1.6, scale: 2 }); CA.react('roar', .7); break;
    case 'shootoutStart': H.notice('PENALTY SHOOTOUT', { t: 2.4, scale: 3 }); try { A.music(EF.SONGS.tension); } catch (e) { /* */ } break;
    case 'shootoutKick': if (ev.goal) { CA.react('roar', .8); EF.sfx('net'); } else { CA.react('groan'); EF.sfx('miss'); } H.notice(ev.goal ? 'SCORED!' : 'MISSED!', { t: 1, scale: 3 }); break;
    case 'shootoutEnd': EF.music(null); H.notice(m.teams[ev.winner].name + ' WIN THE SHOOTOUT', { t: 3, scale: 2 }); break;
    case 'penaltyTaken': if (ev.panenka) H.notice('PANENKA!', { t: 1.2, scale: 3 }); break;
    case 'goldenMoment': H.notice('GOLDEN MOMENT!', { t: 2.4, scale: 3, colors: ['#ffffff', '#ffe060', '#c89020'], sub: "MAXIMILIEN D'OR'S EUROPHORIA" }); break;
    case 'board': H.notice('+' + ev.add + ' MINUTES', { t: 1.6, scale: 2, colors: ['#ffffff', '#ff5a5a', '#c8202a'] }); break;
    case 'celebrate': if (who) EF.babble.shout(who.data.id, EF.fxPick(['WAHEY!', 'YEESH!', 'GET IN!', 'OLE!', 'YES YES YES!'])); break;
    case 'oneTwo': H.notice('ONE-TWO!', { t: .8, scale: 2 }); break;
  }
}
EF.present = present;
EF.bus.on('*', ev => { if (LIVE.m && ev.match === LIVE.m) present(ev.type, ev); });

/** human slots from the players who joined: [{ input, side }] */
EF.slotsFor = humans => (humans || []).map((h, i) => ({ side: h.side, ctl: h.ctl || new HumanController(h.input), color: h.input && h.input.player ? h.input.player - 1 : i, label: h.label || (h.input && h.input.name) || ('P' + (i + 1)), switching: h.switching }));
EF.buildMatch = o => {
  const humans = o.humans != null ? o.humans : [{ input: game.input, side: 0 }];
  const m = new Match(Object.assign({}, o, { slots: EF.slotsFor(humans), seed: o.seed != null ? o.seed : (LINK.seed != null ? LINK.seed : (Math.floor(Math.random() * 1e9) >>> 0)), halfLength: o.halfLength || EF.settingHalf() }));
  return m;
};
EF.attach = (m, o = {}) => {
  LIVE.m = m; LIVE.opts = o; LIVE.view = new MatchView(m, { ball: o.ball, noCamera: o.noCamera });
  LIVE.hud = new HUD(); LIVE.com = new Commentary(m, { silent: o.quiet }); LIVE.rec = new Recorder(m); LIVE.slow = 0;
  m.onReplay = c => {
    if (game.settings.replays === 'off' || m.session || o.noReplay || game.headless && !o.headlessReplay && !EF.headlessReplays) return false;
    const g = m.goals[m.goals.length - 1]; if (!g) return false;
    const frames = LIVE.rec.clip(g.t - 4.5, g.t + .8); if (frames.length < 20) return false;
    LIVE.view.replay = new ReplayPlayer(frames, { speed: .5 }); EF.sfx('swish');
    if (LIVE.com) LIVE.com.hear('replay', {});
    game.rotateView(45); EF.bus.emit('replayStart', { match: m });
    return true;
  };
  game.weather = m.st.weather ? Object.assign({}, m.st.weather) : null;
  EF.crowdAudio.start(clamp(((m.st.crowd && m.st.crowd.size) || 600) / 1600, .2, 1));
  return LIVE;
};
EF.replayEnd = () => { const m = LIVE.m, v = LIVE.view; if (!v || !v.replay) return; v.replay = null; game.rotateView(-45); game.resetCamera && game.resetCamera(); game.zoomBase = 0; EF.bus.emit('replayEnd', { match: m }); m.replayDone(); };
/** one step of whatever match is live (the match, training and attract scenes call it) */
EF.liveStep = (dt, o = {}) => {
  const m = LIVE.m; if (!m) return;
  const real = dt / Math.max(.05, game.timeScale);
  if (LIVE.slow > 0) { LIVE.slow -= real; if (LIVE.slow <= 0) game.timeScale = EF.T.gameSpeed; }
  else { const base = EF.T.gameSpeed * (EF.Dev.cheats.slow ? .25 : 1); if (Math.abs(game.timeScale - base) > 1e-6 && !m.session) game.timeScale = base; }
  const v = LIVE.view;
  if (v.replay) {
    v.replay.update(dt); v.update(dt); LIVE.hud.update(dt); LIVE.com.update(dt);
    const skip = game.players.some(I => I.pressed('confirm') || I.pressed('pass')) || EF.mouse.pressed[0];
    if (v.replay.done || skip) EF.replayEnd();
    return;
  }
  // celebration picks
  if (m.celebration && !m.celebration.picked) for (const sl of m.slots) if (sl.side === m.celebration.side && sl.ctl && sl.ctl.celebPick) { const k = sl.ctl.celebPick(); if (k >= 0) m.pickCelebration(k); }
  if (!o.frozen) { m.update(dt, real); LIVE.rec.step(dt); }
  v.update(dt); LIVE.hud.update(dt); LIVE.com.update(dt);
  const mood = Math.max(v.mood[0], v.mood[1]) * .8 + (m.mode === 'goal' ? .6 : 0) + (m.euroT[0] > 0 || m.euroT[1] > 0 ? .4 : 0);
  EF.crowdAudio.update(dt, mood);
};
EF.liveDraw = (r, o = {}) => {
  if (!LIVE.m) return;
  LIVE.view.draw(r);
  if (!o.noHud) LIVE.hud.draw(r, LIVE.m, LIVE.view, o);
  if (LIVE.view.replay) r.overlay(g => { for (let y = 0; y < r.H; y += 3) px.blend(g, .18, 'multiply', () => px.rect(g, 0, y, r.W, 1, '#000')); E.font.title(g, 'REPLAY', Math.round(r.W * .05), Math.round(r.H * .88), { scale: 2, colors: ['#ffffff', '#ff5a5a'], depth: 1 }); EF.prompt(g, Math.round(r.W * .05) + 100, Math.round(r.H * .88) + 2, 'confirm', 'SKIP'); });
  if (!o.noCommentary && !LIVE.m.duel) LIVE.com.draw(r);
};
EF.detach = () => { EF.crowdAudio.stop(); LIVE.m = null; LIVE.view = null; game.weather = null; game.timeScale = EF.T.gameSpeed; LIGHTS.enabled = false; game.zoomBase = 0; };
/** the summary a results screen shows */
EF.summary = m => {
  const tp = m.stats[0].poss + m.stats[1].poss || 1;
  const rating = f => 6 + f.goals * 1.5 + f.tackles * .3 + f.saves * .5 + f.shots * .1 - f.cards * .8 + (m.winner() === f.side ? .5 : 0);
  const potm = m.players.slice().sort((a, b) => rating(b) - rating(a))[0];
  return { home: m.teams[0].id, away: m.teams[1].id, score: m.score.slice(), pens: m.so ? m.so.score.slice() : null, winner: m.winner(), goals: m.goals.map(g => ({ side: g.side, name: g.name, minute: g.minute, kind: g.kind, super: g.super })),
    potm: potm ? { id: potm.data.id, name: potm.data.name, side: potm.side } : null, shots: [m.stats[0].shots, m.stats[1].shots], poss: [Math.round(m.stats[0].poss / tp * 100), Math.round(m.stats[1].poss / tp * 100)], tackles: [m.stats[0].tackles, m.stats[1].tackles], cards: m.cards.slice(), stadium: m.st.id };
};
EF.restartMatch = () => { const o = LIVE.opts && LIVE.opts.restart; if (o) { game.resume(); game.go('match', o); } };
const matchScene = {
  isMatch: true, pausable: !SESSION, touch: [], view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], camera: { zoom: [.8, 1.8], start: 1 },
  enter(o) {
    o = o || {};
    if (!o.home && LINK.scene === 'match') o = EF.deepMatch(LINK.part);
    game.setView(EF.CAMS[game.settings.camera] || 'broadcast');
    this.o = o; this.endT = 0; this.done = false;
    const m = o.match || EF.buildMatch(o);
    EF.attach(m, { ball: o.ball, restart: Object.assign({}, o, { match: null }) });
    if (o.after) o.after(m);
    EF.music(null);
    game.input.consumeAll();
  },
  exit() { EF.detach(); },
  update(dt) {
    const m = LIVE.m; if (!m) return;
    if (this.o.session) {
      const H = EF.Hub; if (H.ended) return;
      const menu = EF.Hub.overlayUpdate(dt);
      if (AIHub.time() < 0) { LIVE.view.update(dt); LIVE.hud.update(dt); return; }
      if (H.role === 'client') { H.clientStep(dt); LIVE.view.update(dt); LIVE.hud.update(dt); LIVE.com.update(dt); EF.crowdAudio.update(dt, Math.max(LIVE.view.mood[0], LIVE.view.mood[1])); return; }
      EF.liveStep(dt); H.hostStep(dt); void menu; return;
    }
    if (EF.Dev.cheats.watch) EF.Dev.syncSlots(true);
    EF.liveStep(dt);
    if (m.mode === 'over' && !this.done && !LIVE.view.replay) {
      this.endT += dt;
      if (this.endT > 2.5) {
        this.done = true; const sum = EF.summary(m), o = this.o;
        EF.bus.emit('matchOver', { summary: sum, match: m, opts: o });
        if (o.onEnd) o.onEnd(sum, m); else game.go('results', { summary: sum, next: () => game.go(o.back || 'title') });
      }
    }
  },
  draw(r) {
    if (this.o.session && EF.Hub.role === 'server') { r.sky(['#000000', '#000000', '#000000']); return; }
    EF.liveDraw(r);
    if (this.o.session) {
      const t = AIHub.time();
      if (t < 0 && t > -Infinity) r.overlay(g => EF.heading(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H * .35, 6));
      EF.Hub.overlayDraw(r);
    }
  }
};

EF.scenes.match = matchScene;
/** deep links into a match: #match, #match/<stadium>, #match/corner, freekick, penalty, shootout, super, duel */
EF.deepMatch = part => {
  const st = part && EF.get('stadium', part) ? part : null;
  const o = { home: 'kipperton', away: st ? (EF.all('team').find(t => t.stadium === st && t.id !== 'kipperton') || { id: 'hoofington' }).id : 'hoofington', stadium: st || 'smokehouse', draws: 'allowed' };
  if (part === 'shootout') o.shootoutOnly = true;
  o.after = m => {
    if (part === 'corner') m.startSetpiece('corner', 0, { y: P.Y0 });
    if (part === 'freekick') m.startSetpiece('freekick', 0, { x: m.goalX(0) - m.dir(0) * 180, y: P.CY + 30 });
    if (part === 'penalty') m.startSetpiece('penalty', 0, {});
    if (part === 'super' || part === 'duel') { m.mode = 'play'; m.sp = null; const f = m.side[0].find(p => p.data.captain); m.euph[0] = 100; m.triggerEurophoria(0); m.owner = f; f.body.x = m.goalX(0) - m.dir(0) * 200; f.body.y = P.CY; if (part === 'duel') { m.euph[1] = 100; m.triggerEurophoria(1); const g = m.side[1].find(p => p.data.captain); m.owner = g; g.body.x = m.goalX(1) - m.dir(1) * 200; g.body.y = P.CY; } }
  };
  return o;
};


/* ===== 34-training.js ===== */
/* 34-training: nine drills at Kipperton Rec (registry 'drill'). Each step: Mags (or Sandra for defending) says what to
 * do, then the drill runs with a counter on the HUD until its goal is met. Dummies are footballers that stand, walk or
 * press. A drill's last step completes it (saved). */
const ev_ = (type, count, where) => ({ type, count, where });
const isGoal = kind => (m, e) => e.type === 'goal' && e.side === 0 && (!kind || [].concat(kind).includes(e.kind));
EF.def('drill', 'move', { n: 1, title: 'ON YOUR MARKS', coach: 'mags', teaches: 'Run, sprint, stamina', dummies: 'gone', mates: 0,
  steps: [
    { say: 'Weave through the six cones. In order. The flashing one.', cones: true, goal: (m, st) => st.cone >= 6, label: st => 'CONES ' + (st.cone || 0) + '/6' },
    { say: 'Now SPRINT down the straight. Hold sprint. Feel the wind in your hair, Darren.', goal: (m, st, f) => { if (f.sprinting) st.sp = (st.sp || 0) + 1 / 120; return st.sp > 2; }, label: st => 'SPRINT ' + Math.min(2, st.sp || 0).toFixed(1) + '/2.0 S' },
    { say: 'Puffed out? Stand still and get your breath back. Stamina comes back when you stop sprinting.', start: m => { m.slots[0].f.stamina = 20; }, goal: (m, st, f) => f.stamina >= 90, label: (st, m) => 'STAMINA ' + Math.round(m.slots[0].f.stamina) + '/90' }] });
EF.def('drill', 'passing', { n: 2, title: 'PASS MASTER', coach: 'mags', teaches: 'Pass, through ball, one-two', dummies: 'static', mates: 3,
  steps: [
    { say: 'Five passes to your teammates. Point the stick at who you want. Feet, not faces.', count: ev_('passDone', 5) },
    { say: 'Now two through balls into space. Let your forward run onto it.', count: ev_('passDone', 2, e => e.kind === 'through') },
    { say: 'One-two. Hold switch and pass, then run. The ball comes back to you.', count: ev_('oneTwo', 1) }] });
EF.def('drill', 'shooting', { n: 3, title: 'HIT THE TARGET', coach: 'mags', teaches: 'Power, aim, the sweet spot, curl, the chip', dummies: 'keeper', mates: 0,
  steps: [
    { say: 'Hold shoot to fill the meter, let go to hit it. Aim with the stick, up or down the screen. Score in the corners: four times.', count: ev_('goal', 4, e => e.corner), label: st => 'CORNERS ' + (st.n || 0) + '/4' },
    { say: 'See the gold band on the meter? Let go in the gold for a SCREAMER.', count: ev_('screamer', 1) },
    { say: 'After you shoot, push the stick across the ball to bend it. Curl one.', count: ev_('curl', 1) },
    { say: 'Keeper off his line? Press lob near the goal to chip him.', count: ev_('goal', 1, e => e.kind === 'chip') }] });
EF.def('drill', 'air', { n: 4, title: 'HEADS UP', coach: 'mags', teaches: 'Lobs, crosses, headers, volleys, the bicycle kick', dummies: 'keeper', mates: 2,
  steps: [
    { say: 'Get wide in their half and press lob to cross it into the box.', count: ev_('pass', 1, e => e.kind === 'cross'), start: m => { const f = m.slots[0].f; f.body.x = m.goalX(0) - m.dir(0) * 150; f.body.y = P.Y0 + 50; m.takeBall(f); } },
    { say: 'Now score a header. When the ball is in the air near you, press shoot.', count: ev_('goal', 1, e => e.kind === 'header' || e.kind === 'divingHeader'), feed: 'cross' },
    { say: 'A volley this time: meet a lower ball before it lands.', count: ev_('goal', 1, e => e.kind === 'volley' || e.kind === 'bicycle' || e.kind === 'header'), feed: 'low' },
    { say: 'Bonus: back to goal and a high ball? That is a bicycle kick. Try it, or press start to skip.', count: ev_('bicycle', 1), feed: 'back', optional: true }] });
EF.def('drill', 'skills', { n: 5, title: 'SHOW BOAT', coach: 'mags', teaches: 'Step-over, nutmeg, spin, rainbow flick, knock-on', dummies: 'static', mates: 0,
  steps: [{ say: 'Skill button with the stick: sideways a STEP-OVER, back a SPIN, at a dummy a NUTMEG, twice quick a RAINBOW. Beat dummies with four different moves.', goal: (m, st) => (st.kinds || new Set()).size >= 4, on: (m, e, st) => { if (e.type === 'skillWin') (st.kinds = st.kinds || new Set()).add(e.kind); }, label: st => 'MOVES ' + (st.kinds ? st.kinds.size : 0) + '/4' }] });
EF.def('drill', 'defending', { n: 6, title: 'THE HARBOUR WALL', coach: 'okafor', teaches: 'Poke, slide, barge, switching, interceptions', dummies: 'attack', mates: 2, fouls: true,
  steps: [
    { say: 'Without the ball: pass pokes it, shoot slides, lob barges. Win it back three times. Clean, mind.', count: ev_('tackleWon', 3), alt: ev_('recover', 3) },
    { say: 'Switch to the free man with the switch button. Do it now.', count: ev_('switch', 1) },
    { say: 'Read their passes. Step in front: intercept two.', count: ev_('intercept', 2) }] });
EF.def('drill', 'setpieces', { n: 7, title: 'DEAD BALLS', coach: 'mags', teaches: 'Corners, free kicks, penalties, keeping', dummies: 'keeper', mates: 2,
  steps: [
    { say: 'A corner. Move the ring with the stick, press lob to cross, then attack it.', count: ev_('goal', 1), sp: 'corner' },
    { say: 'A free kick. Aim the target, hold shoot for power, curl it with the stick.', count: ev_('goal', 1), sp: 'freekick' },
    { say: 'A penalty. Pick a corner with the stick and hold shoot. Very gently down the middle is a Panenka.', count: ev_('goal', 1), sp: 'penalty' },
    { say: 'Now you are in goal. Push up or down to guess, and press pass to dive.', count: ev_('save', 1), sp: 'penaltyKeep', alt: ev_('penaltyTaken', 1, e => e.outcome !== 'goal') }] });
EF.def('drill', 'euphoria', { n: 8, title: 'FEED THE CROWD', coach: 'mags', teaches: 'Euphoria, Europhoria, Super Strikes, the Save Duel', dummies: 'press', mates: 2, gain: 3,
  steps: [
    { say: 'The crowd is your power bar. Passes, tricks, tackles and shots fill it. Fill it up!', goal: m => m.euph[0] >= 100, label: (st, m) => 'EUPHORIA ' + Math.round(m.euph[0]) + '%' },
    { say: 'Full! Press switch and skill together (or Space) for EUROPHORIA.', count: ev_('europhoria', 1, e => e.side === 0) },
    { say: 'In Europhoria, a shot at FULL power is a SUPER STRIKE. Score one!', count: ev_('goal', 1, e => e.super), start: m => { if (m.euroT[0] <= 0) { m.euph[0] = 100; m.triggerEurophoria(0); } m.superUsed[0] = false; const f = m.slots[0].f; f.body.x = m.goalX(0) - m.dir(0) * 200; f.body.y = P.CY; m.takeBall(f); } },
    { say: 'Their captain has a Super Strike too. When the rings meet round your keeper, press pass!', count: ev_('saveDuelResult', 1, e => e.result !== 'miss'), alt: ev_('saveDuelResult', 1), duel: true }] });
EF.def('drill', 'theatrics', { n: 9, title: 'THE DARK ARTS', coach: 'mags', teaches: 'Theatrics and the referee', dummies: 'press', mates: 0, fouls: true,
  steps: [
    { say: 'I do not condone it. But: press theatrics when a defender touches you, and the referee might buy it.', count: ev_('diveWon', 1) },
    { say: 'Now dive with nobody near you. Go on. That is what a booking looks like. Now you know.', count: ev_('diveBooked', 1) }] });
const DRILL = { d: null, step: 0, st: {}, m: null };
EF.DRILL = DRILL;
function drillMatch(d) {
  const mates = d.mates;
  const m = EF.buildMatch({ home: 'kipperton', away: 'hoofington', stadium: 'rec', draws: 'allowed', humans: [{ input: game.input, side: 0 }], training: {
    fouls: !!d.fouls,
    goal: (mm, side, by) => { const kind = mm.shot ? mm.shot.kind : mm.ball.kind; const corner = Math.abs(mm.ball.y - P.CY) > P.GH * .45; mm.emit('goal', { side, who: by && by.id, kind: kind || 'shot', corner, super: !!mm.ball.superName }); drillReset(mm, .8); },
    out: (mm) => drillReset(mm, .5) }, noCards: !d.fouls, seed: 9 });
  // everyone not in the drill goes off; dummies are the other side
  const keepMates = m.side[0].filter(f => !f.gk && f !== m.slots[0].f).slice(0, mates);
  for (const f of m.players) {
    const keep = f === m.slots[0].f || keepMates.includes(f) || (f.gk && f.side === 1 && d.dummies !== 'gone') || (f.side === 1 && !f.gk && (d.dummies === 'static' || d.dummies === 'attack' || d.dummies === 'press'));
    if (!keep) { f.state = 'gone'; f.sentOff = true; f.body.x = -9999; }
  }
  m.gainBoost = d.gain || 1; m.buff.gain[0] = d.gain || 1;
  return m;
}
function drillReset(m, t) {
  const f = m.slots[0].f; if (!f) return;
  m.owner = null; m.shot = null; m.mode = 'dead'; m.dead = { t, then: () => { m.mode = 'play'; drillPlace(m); } };
}
function drillPlace(m) {
  const d = DRILL.d, f = m.slots[0].f, s = d.steps[DRILL.step] || {}, b = m.ball;
  f.state = 'run'; f.body.vx = f.body.vy = 0;
  const dir = m.dir(0), gx = m.goalX(0);
  f.body.x = gx - dir * (d.id === 'shooting' ? 150 : d.id === 'move' ? 380 : 260); f.body.y = P.CY + (d.id === 'air' ? -90 : 0); f.facing = dir > 0 ? 0 : PI;
  b.x = f.body.x + dir * 7; b.y = f.body.y; b.z = 0; b.vx = b.vy = b.vz = 0; b.superPath = null; b.prevPast = null;
  if (s.feed && d.id === 'air') {   // a teammate on the wing crosses it in
    const w = m.side[0].find(p => p !== f && !p.sentOff && !p.gk); if (w) { w.body.x = gx - dir * 120; w.body.y = P.Y0 + 30; m.takeBall(w); m.last = w; w.plan = { k: 'cross', until: m.t + 1.2 }; f.body.x = gx - dir * (s.feed === 'low' ? 90 : 70); f.body.y = P.CY + 10; if (s.feed === 'back') f.facing = dir > 0 ? PI : 0; }
  } else if (d.id !== 'defending' && d.id !== 'theatrics' || DRILL.step > 10) m.takeBall(f);
  else { const a = m.side[1].find(p => !p.sentOff && !p.gk); if (a) { a.body.x = f.body.x + dir * 120; a.body.y = P.CY; m.takeBall(a); } }
  // dummies stand in a line between the player and the goal
  let k = 0; for (const o of m.side[1]) { if (o.sentOff || o.gk) continue; o.body.x = f.body.x + dir * (70 + k * 45); o.body.y = P.CY + ((k % 2) ? 26 : -26) * (d.id === 'skills' ? .3 : 1); o.state = 'run'; k++; }
  let j = 0; for (const t of m.side[0]) { if (t === f || t.sentOff || t.gk) continue; t.body.x = f.body.x + dir * (60 + j * 50); t.body.y = P.CY + (j % 2 ? 90 : -90); j++; }
  if (s.sp) {
    if (s.sp === 'corner') m.startSetpiece('corner', 0, { y: P.Y0 });
    if (s.sp === 'freekick') m.startSetpiece('freekick', 0, { x: gx - dir * 170, y: P.CY + 40 });
    if (s.sp === 'penalty') m.startSetpiece('penalty', 0, {});
    if (s.sp === 'penaltyKeep') { m.startSetpiece('penalty', 1, {}); }
  }
  if (s.duel) { const cap = m.side[1].find(p => p.data.captain) || m.side[1].find(p => !p.gk); cap.sentOff = false; cap.state = 'run'; cap.body.x = m.goalX(1) - m.dir(1) * 190; cap.body.y = P.CY; m.euph[1] = 100; m.euroT[1] = 0; m.triggerEurophoria(1); m.superUsed[1] = false; m.takeBall(cap); cap.plan = { k: 'shoot', power: .97, aimY: .5, until: m.t + 3 }; }
}
EF.drillPlace = drillPlace;
// dummies: stand still, walk, attack with the ball, or press
const dummyIntent = (m, f) => {
  const d = DRILL.d; if (!d || m !== DRILL.m) return null;
  if (d.dummies === 'static' || d.dummies === 'keeper') return { bot: true, move: [0, Math.sin(m.t + f.idx) * .1], pass: {}, shoot: {}, lob: {}, through: {}, skill: {}, dive: {}, sw: {} };
  return null;
};
EF.dummyIntent = dummyIntent;
const trainingScene = {
  touch: [], view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], pausable: !SESSION, isMatch: true, camera: { zoom: [.8, 1.8], start: 1 }, idle: false,
  enter(d) {
    d = d || {}; this.d = d; this.list = true; this.t = 0; this.menu = new UIMenu({ onBack: () => d.fromCup ? game.go('cup', { round: 0 }) : game.go('title', { menu: true }) }); this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffc83a' });
    EF.music('training'); game.setView(EF.CAMS[game.settings.camera] || 'broadcast');
    const id = d.drill || (LINK.scene === 'training' && LINK.part);
    if (id && EF.get('drill', id)) { if (LINK.part === id) LINK.part = null; this.startDrill(EF.get('drill', id)); }
    else { this.stage = new Stage('rec', { weather: false }); }
  },
  exit() { if (DRILL.m) { EF.detach(); DRILL.m = null; } DRILL.d = null; },
  startDrill(d) {
    this.list = false; DRILL.d = d; DRILL.step = 0; DRILL.st = {}; DRILL.done = false;
    const m = DRILL.m = drillMatch(d); EF.attach(m, { quiet: true, noReplay: true }); drillPlace(m);
    this.coach(d.steps[0]);
  },
  coach(s) {
    const d = DRILL.d; DRILL.st = {}; this.talk.voice = EF.babble.voiceFor(d.coach);
    this.talk.say(s.say, { name: EF.speakerName(d.coach), portrait: EF.portraitOf(d.coach), onDone: () => { if (s.start) s.start(DRILL.m); else drillPlace(DRILL.m); if (s.start && !s.sp) {} } });
    if (s.cones) { const m = DRILL.m, f = m.slots[0].f; DRILL.st.cones = Array.from({ length: 6 }, (_, i) => ({ x: f.body.x + m.dir(0) * (60 + i * 50), y: P.CY + (i % 2 ? 40 : -40) })); DRILL.st.cone = 0; }
  },
  stepDone() {
    const d = DRILL.d; EF.sfx('perfect'); LIVE.hud.notice('NICE!', { t: 1.2, scale: 3, colors: ['#ffffff', '#5aff7a', '#20a040'] });
    DRILL.step++;
    if (DRILL.step >= d.steps.length) { DRILL.done = true; EF.Save.data.drills[d.id] = true; EF.Save.save(); EF.bus.emit('drillDone', { id: d.id }); this.talk.voice = EF.babble.voiceFor(d.coach); this.talk.say('That is ' + d.title + ' done. Back to the list.', { name: EF.speakerName(d.coach), portrait: EF.portraitOf(d.coach), onDone: () => this.toList() }); return; }
    this.coach(d.steps[DRILL.step]);
  },
  toList() { EF.detach(); DRILL.m = null; DRILL.d = null; this.list = true; this.stage = new Stage('rec', { weather: false }); EF.music('training'); },
  update(dt) {
    this.t += dt;
    if (this.list) {
      this.stage.update(dt); game.focus(P.CX, P.CY, 0);
      const r = game.r || { W: game.W, H: game.H }, D = EF.all('drill'), w = Math.min(130, Math.floor((r.W - 50) / 3)), rects = EF.layoutGrid(r, D.length, 3, { w, h: 40, gap: 6, y: Math.round(r.H * .2) });
      this.menu.set(D.map((d, i) => ({ rect: rects[i], label: d.n + '. ' + d.title, sub: (EF.Save.data.drills[d.id] ? 'DONE  ' : '') + d.teaches, scale: 1, onPick: () => this.startDrill(d), draw: (g, X, Y, W2, H2, f) => { EF.panel(g, X, Y, W2, H2, { border: f ? '#ffc83a' : EF.Save.data.drills[d.id] ? '#5aff7a' : '#2a3a6a' }); E.font.text(g, d.n + '. ' + d.title, X + 6, Y + 6, '#ffffff', { outline: false }); E.font.text(g, d.teaches, X + 6, Y + 18, '#ffe08a', { font: 'tiny', wrap: W2 - 12, outline: false }); if (EF.Save.data.drills[d.id]) E.font.text(g, 'DONE', X + W2 - 6, Y + 6, '#5aff7a', { align: 'right', outline: false }); } })));
      this.menu.update(dt); return;
    }
    if (this.talk.open || !LIVE.view) { this.talk.update(dt); if (LIVE.view && !this.list) { LIVE.view.update(dt); LIVE.view.camera(dt); } return; }
    const m = DRILL.m, d = DRILL.d, s = d.steps[DRILL.step]; if (!m || !s) return;
    EF.liveStep(dt);
    const f = m.slots[0].f;
    if (s.cones && DRILL.st.cones) { const c = DRILL.st.cones[DRILL.st.cone]; if (c && hyp(f.body.x - c.x, f.body.y - c.y) < 14) { DRILL.st.cone++; EF.sfx('segment'); } }
    if (s.optional && game.input.pressed('start')) return this.stepDone();
    if (s.goal && s.goal(m, DRILL.st, f)) return this.stepDone();
    if (s.count && (DRILL.st.n || 0) >= s.count.count) return this.stepDone();
  },
  draw(r) {
    if (this.list) {
      this.stage.draw(r);
      r.overlay(g => { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#101030')); EF.heading(g, 'TRAINING', r.W / 2, Math.round(r.H * .04), 3); E.font.text(g, 'KIPPERTON REC. MIND THE PUDDLES.', r.W / 2, Math.round(r.H * .04) + 28, '#ffe08a', { align: 'center', outline: '#000' }); this.menu.draw(g); EF.footer(g, r, [['confirm', 'START DRILL'], ['cancel', 'BACK']]); });
      return;
    }
    const m = DRILL.m, d = DRILL.d, s = d.steps[DRILL.step];
    if (s && s.cones && DRILL.st.cones) DRILL.st.cones.forEach((c, i) => { if (i < DRILL.st.cone) return; r.queue(c.x, c.y, 0, g => { const [x, y] = r.w(c.x, c.y, 0); px.poly(g, [[x - 3, y], [x + 3, y], [x, y - 8]], i === DRILL.st.cone && Math.floor(this.t * 6) % 2 ? '#ffffff' : '#ff7a1a'); }); });
    EF.liveDraw(r, { noBug: true, noCommentary: true });
    r.overlay(g => {
      const lab = s ? (s.label ? s.label(DRILL.st, m) : s.count ? (s.count.type.toUpperCase() + ' ' + (DRILL.st.n || 0) + '/' + s.count.count) : '') : 'DONE!';
      EF.panel(g, 8, 8, 200, 36);
      E.font.text(g, d.n + '. ' + d.title + '  (' + Math.min(d.steps.length, DRILL.step + 1) + '/' + d.steps.length + ')', 14, 13, '#ffc83a', { outline: false });
      E.font.text(g, lab, 14, 27, '#ffffff', { outline: false });
      if (s && s.optional) EF.prompt(g, 220, 16, 'start', 'SKIP');
    });
    this.talk.draw(r);
  }
};
EF.scenes.training = trainingScene;
// counting the step's events
EF.bus.on('*', ev => {
  const d = DRILL.d, m = DRILL.m; if (!d || !m || ev.match !== m) return;
  const s = d.steps[DRILL.step]; if (!s) return;
  if (s.on) s.on(m, ev, DRILL.st);
  for (const c of [s.count, s.alt]) if (c && ev.type === c.type && (!c.where || c.where(ev))) { DRILL.st.n = (DRILL.st.n || 0) + 1; EF.sfx('segment'); break; }
});


/* ===== 40-attract.js ===== */
/* 40-attract: the idle watcher (10 s without input on the title and the menus starts the attract mode) and the attract
 * scene: a looping, scripted showcase of AI-versus-AI football that cheats freely (stamina, Euphoria, forced goals) to
 * show the most: a super strike and its Save Duel, a corner and a bicycle kick, the dark arts with VAR, a shootout with a
 * Panenka, a weather report, and the title card. Any input goes straight back to the title. */
EF.idle = {
  t: 0, last: null,
  reset() { this.t = 0; },
  anyInput() {
    if (game.players.some(I => I.anyPressed())) return true;
    if (game.real - EF.mouse.moved < .06 || EF.mouse.pressed.some(Boolean)) return true;
    if (game.input.clicked && game.input.clicked()) return true;
    const z = game.input.zoom && game.input.zoom(); if (typeof z === 'number' && Math.abs(z - 1) > 1e-6) return true;
    for (const I of game.players) { const m = I.move(); if (hyp(m[0], m[1]) > .3) return true; }
    return false;
  },
  tick(dt) {
    if (SESSION) return;
    if (this.anyInput()) { this.t = 0; return; }
    this.t += dt;
    if (this.t >= 10) { this.t = 0; game.go('attract', {}, { fade: 0 }); }
  }
};
const SEGS = [
  { id: 'live', name: 'MATCHDAY LIVE', dur: 30 },
  { id: 'setpiece', name: 'SET-PIECE SPECIAL', dur: 15 },
  { id: 'darkarts', name: 'THE DARK ARTS', dur: 15 },
  { id: 'shootout', name: 'SHOOTOUT', dur: 15 },
  { id: 'weather', name: 'WEATHER REPORT', dur: 10 },
  { id: 'card', name: 'TITLE CARD', dur: 5 }
];
EF.ATTRACT_SEGS = SEGS;
let attractLoop = 0;
const attractScene = {
  touch: [], view: 'broadcast', camera: { zoom: [.8, 1.8], start: 1 },
  enter() { this.seg = -1; this.t = 0; this.segT = 0; this.seen = new Set(); this.loop = attractLoop++; EF.music(null); this.nextSeg(); game.input.consumeAll(); this.grace = .3; },
  exit() { EF.detach(); game.timeScale = EF.T.gameSpeed; },
  match(o) {
    EF.detach();
    const m = new Match(Object.assign({ draws: 'allowed', halfLength: 60, seed: 100 + this.loop * 7 + this.seg, slots: [], attract: true, infStamina: true }, o));
    EF.attach(m, { headlessReplay: true }); this.m = m; return m;
  },
  nextSeg() {
    this.seg = (this.seg + 1) % SEGS.length; this.segT = 0; const S = SEGS[this.seg]; this.seen.add(S.id); this.step = 0; this.wcut = -1;
    const stad = ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium'][this.loop % 5], owners = { smokehouse: 'hoofington', pasapasa: 'pasapasa', stahlpresse: 'stahlpresse', lucchetto: 'lucchetto', euphorium: 'opulence' };
    if (S.id === 'live') { const m = this.match({ home: 'kipperton', away: owners[stad], stadium: stad, attractDuel: true }); m.forceGoal = true; this.setupSuper(m); EF.music('attract'); }
    if (S.id === 'setpiece') { const m = this.match({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse' }); m.forceGoal = true; m.startSetpiece('corner', 0, { y: P.Y0 }); }
    if (S.id === 'darkarts') { const m = this.match({ home: 'lucchetto', away: 'kipperton', stadium: 'lucchetto', referee: 'severo' }); m.forceGoal = true; m.ref = Object.assign({}, m.ref, { gullibility: 9 }); m.mode = 'play'; m.sp = null; this.diver = m.side[0].find(f => f.data.id === 'fallo') || m.side[0][3]; const gx = m.goalX(0); this.diver.body.x = gx - m.dir(0) * 70; this.diver.body.y = P.CY + 20; m.takeBall(this.diver); const def = m.side[1].find(f => !f.gk); def.body.x = this.diver.body.x + m.dir(0) * 7; def.body.y = this.diver.body.y + 3; }
    if (S.id === 'shootout') { this.match({ home: 'kipperton', away: owners[stad], stadium: stad, shootoutOnly: true, draws: 'pens' }); }
    if (S.id === 'weather') this.weatherCut(0);
    if (S.id === 'card') { EF.detach(); this.m = null; this.stage = new Stage('euphorium', { weather: false }); EF.music('anthem'); game.setZoom(1.3); game.zoomBase = 1.3; }
  },
  weatherCut(k) {
    this.wcut = k; const W = [['smokehouse', 'hoofington'], ['stahlpresse', 'stahlpresse'], ['lucchetto', 'lucchetto'], ['euphorium', 'opulence']][k];
    const m = this.match({ home: 'kipperton', away: W[1], stadium: W[0], fog: k === 2 });
    m.mode = 'play'; m.sp = null; m.owner = m.side[0][3]; m.ball.x = P.CX; m.ball.y = P.CY;
    if (k === 2) { m.euph[1] = 100; m.triggerEurophoria(1); }
    if (k === 3) { LIVE.view.firework(10); m.startEvent('fireworks'); }
  },
  setupSuper(m) {
    m.mode = 'play'; m.sp = null; const s = 0, cap = m.side[s].find(f => f.data.captain);
    cap.body.x = m.goalX(s) - m.dir(s) * 230; cap.body.y = P.CY + 20; m.takeBall(cap);
    m.euph[s] = 100; m.triggerEurophoria(s); cap.plan = { k: 'shoot', power: .97, aimY: .5, until: m.t + 5 };
  },
  update(dt) {
    this.t += dt; this.segT += dt; this.grace -= dt;
    if (this.grace <= 0 && EF.idle.anyInput()) { game.players.forEach(I => I.consumeAll()); EF.mouse.pressed = [false, false, false]; game.go('title', { menu: true }, { fade: 0 }); return; }
    const S = SEGS[this.seg], m = this.m;
    if (S.id === 'card') { this.stage.update(dt); game.focus(P.CX, P.CY - 60, 0); }
    else if (m) {
      EF.liveStep(dt);
      if (LIVE.view && LIVE.view.replay && LIVE.view.replay.i > 60 * 2.4) EF.replayEnd();   // (keep the reel moving)
      if (S.id === 'setpiece') this.forceBicycle(m);
      if (S.id === 'darkarts') this.darkArts(m);
      if (S.id === 'live' && m.mode === 'play' && !m.superFlight && m.goals.length && this.step === 0 && this.segT > 14) { this.step = 1; }
      if (S.id === 'weather') { const k = Math.min(3, Math.floor(this.segT / 2.5)); if (k !== this.wcut) this.weatherCut(k); }
    }
    if (this.segT >= S.dur) this.nextSeg();
  },
  forceBicycle(m) {
    if (this.step === 0 && m.ball.kind === 'cross' && !m.owner) {
      const r = m.ball.to || m.side[0].find(f => !f.gk), path = predictBall(m, 1.2, 1 / 60), p = path.find(q => q.z > 22 && q.z < 34 && q.t > .3);
      if (r && p) { r.body.x = p.x - m.dir(0) * 2; r.body.y = p.y; r.facing = m.dir(0) > 0 ? PI : 0; r.state = 'run'; this.step = 1; this.bic = r; }
    }
    if (this.step === 1 && this.bic && !m.owner) { const w = airWindow(this.bic); if (w && w.z >= 22) { this.bic.facing = m.dir(0) > 0 ? PI : 0; this.bic.startAir(w, 'shoot', { aimY: .3, move: [0, 0] }); this.step = 2; } }
    if (this.step === 2 && m.mode === 'goal') this.step = 3;
  },
  darkArts(m) {
    if (this.step === 0 && this.segT > .6 && this.diver && m.mode === 'play') { const d = m.side[1].find(f => !f.gk); this.diver.contactT = m.t; this.diver.theatrics(); this.step = 1; }
    if (this.step === 1 && m.varCheck) { m.varCheck.foul.sev = 2; m.varCheck.foul.dive = false; this.step = 2; }
    if (this.step === 2 && m.mode === 'play' && m.goals.length) { this.step = 3; this.t3 = this.segT; }
    if (this.step === 3 && m.mode === 'play' && this.segT - this.t3 > 2.5) { const f = m.side[1].find(f2 => !f2.gk && !f2.sentOff); if (f) { for (const o of m.side[0]) if (dist(o.body, f.body) < 20) o.body.x += 40; f.theatrics(); } this.step = 4; }
  },
  draw(r) {
    const S = SEGS[this.seg];
    if (S.id === 'card') {
      this.stage.draw(r);
      r.overlay(g => {
        EF.heading(g, 'EUROPHORIA', r.W / 2, Math.round(r.H * .14), 4); EF.heading(g, 'FOOTBALL', r.W / 2, Math.round(r.H * .14) + 34, 3, { colors: ['#ffffff', '#c8d8ff', '#6a8aff'] });
        const rec = EF.Save.data.records;
        E.font.text(g, 'CUPS WON: ' + rec.cupsWon + (rec.fastestCup ? '   FASTEST CUP: ' + mmss(rec.fastestCup) : '') + (rec.biggestWin ? '   BIGGEST WIN: ' + rec.biggestWin.score.join('-') + ' vs ' + rec.biggestWin.vs : ''), r.W / 2, Math.round(r.H * .55), '#ffe08a', { align: 'center', outline: '#000' });
        if (Math.floor(this.t * 2) % 2) { const w = EF.promptWidth('start', 'PRESS START', { scale: 2 }); EF.prompt(g, Math.round(r.W / 2 - w / 2), Math.round(r.H * .66), 'start', 'PRESS START', { scale: 2 }); }
      });
    } else if (this.m) EF.liveDraw(r);
    r.overlay(g => {
      const y = r.H - 22; px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, r.W, 20, '#05070f'));
      E.font.text(g, 'DEMO', 10, y, '#ff5a5a', { scale: 1, outline: false });
      E.font.text(g, S.name, 44, y, '#ffc83a', { outline: false });
      const w = EF.promptWidth('confirm', 'PRESS ANY BUTTON'); EF.prompt(g, r.W - w - 10, y - 2, 'confirm', 'PRESS ANY BUTTON');
    });
  }
};
EF.scenes.attract = attractScene;


/* ===== 41-devmode.js ===== */
/* 41-devmode: the dev panel, a drawer over any scene (the pause menu's Dev mode, ` or F1, ?dev=1; never in a hub
 * session). TUNE: every live gameplay variable as a slider, its default, a reset each and RESET ALL. CHEATS: stamina,
 * Euphoria, keepers, watch mode, pure football, the clock, goals, slow motion, freeze and step, debug views. WARP: every
 * scene and part, set pieces and events now, unlocks, a save reset, the sound test and the animation gallery. INFO. */
const TABS = ['TUNE', 'CHEATS', 'WARP', 'INFO'];
EF.Dev = {
  isOpen: false, tab: 0, cheats: {}, confirmReset: false, scroll: 0, stepOnce: false,
  open(fromPause) { if (SESSION) return false; if (fromPause && game.paused) game.resume(); this.isOpen = true; this.menu = new UIMenu({ onBack: () => this.close(), onTab: d => { this.tab = (this.tab + d + TABS.length) % TABS.length; this.menu.i = 0; }, wrap: true }); game.input.consumeAll(); return true; },
  close() { this.isOpen = false; this.syncSlots(false); game.input.consumeAll(); },
  toggle() { if (this.isOpen) this.close(); else this.open(); },
  syncSlots(on) { const m = LIVE.m; if (m) for (const sl of m.slots) sl.menu = !!(on || this.cheats.watch); },
  set(k, v) { this.cheats[k] = v; if (k === 'muteCrowd') EF.crowdAudio.volume(v ? 0 : game.settings.crowd); },
  /** the warp list: scenes, parts and things to trigger now */
  warps() {
    const m = LIVE.m, W = [];
    const go = (label, scene, data) => W.push({ label, onPick: () => { this.close(); game.go(scene, data || {}); } });
    go('TITLE', 'title'); go('ATTRACT MODE', 'attract'); go('KICK-ABOUT SETUP', 'setup'); go('PENALTIES SETUP', 'penaltysetup');
    for (const st of EF.all('stadium').filter(s => !s.training)) go('MATCH AT ' + st.name, 'match', EF.deepMatch(st.id));
    for (const p of ['corner', 'freekick', 'penalty', 'shootout', 'super', 'duel']) go('MATCH: ' + p.toUpperCase(), 'match', EF.deepMatch(p));
    EF.ROUNDS.forEach((R, i) => W.push({ label: 'CUP: ' + R.name + ' (PRE-MATCH)', onPick: () => { this.close(); if (!EF.Cup.s) EF.Cup.newRun(); EF.Cup.s.round = i; EF.Cup.s.prologue = true; game.go('cup', { round: i }); } }));
    go('THE ENDING', 'ending'); go('STICKER ALBUM', 'album'); go('ABOUT & CREDITS', 'about'); go('RESULTS SCREEN', 'results');
    for (const d of EF.all('drill')) go('TRAINING: ' + d.title, 'training', { drill: d.id });
    go('ANIMATION GALLERY', 'animgallery'); go('SOUND TEST', 'soundtest');
    if (m && LIVE.view) {
      const now = (label, fn) => W.push({ label: 'NOW: ' + label, onPick: () => { fn(m); this.close(); } });
      now('CORNER', mm => mm.startSetpiece('corner', 0, { y: P.Y0 })); now('FREE KICK', mm => mm.startSetpiece('freekick', 0, { x: mm.goalX(0) - mm.dir(0) * 190, y: P.CY - 20 })); now('PENALTY', mm => mm.startSetpiece('penalty', 0, {}));
      now('HALF TIME', mm => { mm.clock = mm.halfLen * 1.2; mm.boardShown = true; mm.stoppage = 1; mm.endHalf(); }); now('EXTRA TIME', mm => { mm.score = [1, 1]; mm.o.draws = 'cup'; mm.half = 2; mm.fullTime(); }); now('SHOOTOUT', mm => mm.startShootout());
      for (const e of EF.all('event')) now('EVENT ' + e.name, mm => { mm.mode = 'play'; mm.sp = null; mm.startEvent(e.id); });
      now('SUPER STRIKE', mm => { mm.mode = 'play'; mm.sp = null; const f = (mm.slots[0] && mm.slots[0].f) || mm.side[0][4]; mm.euph[0] = 100; mm.euroT[0] = 0; mm.triggerEurophoria(0); mm.superUsed[0] = false; mm.takeBall(f); f.body.x = mm.goalX(0) - mm.dir(0) * 200; f.body.y = P.CY; });
      now('SAVE DUEL', mm => { mm.mode = 'play'; mm.sp = null; const c = mm.side[1].find(f => f.data.captain); mm.euph[1] = 100; mm.euroT[1] = 0; mm.triggerEurophoria(1); mm.superUsed[1] = false; mm.takeBall(c); c.body.x = mm.goalX(1) - mm.dir(1) * 200; c.body.y = P.CY; c.plan = { k: 'shoot', power: .97, aimY: .4, until: mm.t + 3 }; });
      now('YELLOW CARD', mm => giveCard(mm, mm.side[1].find(f => !f.gk && !f.sentOff), 'yellow', 'dev')); now('RED CARD', mm => giveCard(mm, mm.side[1].find(f => !f.gk && !f.sentOff), 'red', 'dev'));
      now('A DIVE', mm => { mm.mode = 'play'; mm.sp = null; const f = (mm.slots[0] && mm.slots[0].f) || mm.side[0][3]; f.theatrics(); });
      now('VAR CHECK', mm => { mm.owner = null; mm.mode = 'var'; mm.varCheck = { kind: 'penalty', foul: { side: 0, sev: .5, victim: mm.side[0][3] }, t: 0 }; mm.emit('var', { kind: 'penalty' }); });
      now('THE BUS', mm => { const s = mm.side.findIndex(sd => EF.get('tactic', mm.teams[mm.side.indexOf(sd)].tactic).gimmick === 'catenaccio'); const side = s >= 0 ? s : 1; const gx = mm.ownGoalX(side), into = gx === P.X0 ? 1 : -1, x0 = into > 0 ? gx + 6 : gx - 24; mm.bus = { side, on: true, x0, x1: x0 + 18, y0: P.CY - 30, y1: P.CY + 30 }; mm.emit('bus', { side }); });
      now('A GOAL + CELEBRATION + REPLAY', mm => { mm.mode = 'play'; mm.sp = null; mm.last = mm.side[0][4]; mm.ball.x = mm.goalX(0) + mm.dir(0) * 6; mm.ball.y = P.CY; mm.ball.z = 4; mm.ball.vx = mm.dir(0) * 100; mm.goalScored(0); });
    }
    W.push({ label: 'UNLOCK EVERYTHING', onPick: () => { for (const s of EF.all('sticker')) EF.Save.data.stickers[s.id] = s.shiny ? 'shiny' : true; for (const b of Object.keys(EF.BALLS)) EF.Save.unlockBall(b); for (const d of EF.all('drill')) EF.Save.data.drills[d.id] = true; EF.Save.save(); } });
    W.push({ label: this.confirmReset ? 'REALLY RESET THE SAVE? PICK AGAIN' : 'RESET THE SAVE', onPick: () => { if (this.confirmReset) { EF.Save.reset(); this.confirmReset = false; } else this.confirmReset = true; } });
    return W;
  },
  cheatList() {
    const T = (k, label) => ({ kind: 'toggle', label, get: () => !!this.cheats[k], set: v => { this.set(k, v); if (k === 'watch') this.syncSlots(true); } });
    const B = (label, fn) => ({ label, onPick: () => { const m = LIVE.m; if (m) fn(m); } });
    return [T('stamina0', 'INFINITE STAMINA: HOME'), T('stamina1', 'INFINITE STAMINA: AWAY'), T('fullEuph0', 'EUPHORIA ALWAYS FULL: HOME'), T('fullEuph1', 'EUPHORIA ALWAYS FULL: AWAY'), T('keeper0', 'INVINCIBLE KEEPER: HOME'), T('keeper1', 'INVINCIBLE KEEPER: AWAY'),
      T('watch', 'CPU CONTROLS EVERYONE (WATCH)'), T('pure', 'PURE FOOTBALL (NO OTT)'), T('freezeClock', 'FREEZE THE CLOCK'), T('slow', 'SLOW MOTION 0.25x'), T('freeze', 'FREEZE THE SIM'),
      B('STEP ONE FRAME (WHILE FROZEN)', () => { this.stepOnce = true; }), B('GOAL FOR HOME', m => { m.score[0]++; m.emit('goal', { side: 0, name: 'DEV', minute: m.minuteLabel() }); }), B('GOAL FOR AWAY', m => { m.score[1]++; m.emit('goal', { side: 1, name: 'DEV', minute: m.minuteLabel() }); }),
      B("CLOCK TO 44'", m => { m.half = 1; m.clock = m.halfLen * 44 / 45; }), B("CLOCK TO 89'", m => { if (m.half === 1) { m.half = 2; m.swapped = !m.swapped; } m.clock = m.halfLen * 44 / 45; }),
      T('showBoxes', 'SHOW HITBOXES'), T('showAI', 'SHOW THE AI'), T('showPath', 'SHOW THE BALL PATH'), T('showBones', 'SHOW SKELETONS'), T('muteCrowd', 'MUTE THE CROWD')];
  },
  tuneList() {
    const L = [{ label: 'RESET ALL TO DEFAULTS', onPick: () => { EF.tuneReset(); EF.sfx('menuPick'); } }];
    let grp = null;
    for (const [k, def, min, max, step, g] of EF.TUNE) {
      if (g !== grp) { grp = g; L.push({ label: '- ' + g.toUpperCase() + ' -', disabled: true, header: true }); }
      L.push({ kind: 'slider', label: k + ' (' + def + ')', min, max, step, get: () => EF.T[k], set: v => { EF.T[k] = +(+v).toFixed(4); EF.tuneSave(); }, changed: () => Math.abs(EF.T[k] - def) > 1e-9, fmt: v => String(+v.toFixed(3)), onAlt: () => EF.tuneReset(k) });
    }
    return L;
  },
  update(dt) {
    if (!this.isOpen) return false;
    this.syncSlots(true);
    const r = { W: game.W, H: game.H }, x = Math.round(r.W * .58), w = r.W - x - 6;
    const list = this.tab === 0 ? this.tuneList() : this.tab === 1 ? this.cheatList() : this.tab === 2 ? this.warps() : [];
    const rowH = 15, top = 40, vis = Math.floor((r.H - top - 30) / rowH);
    const i = this.menu.i; this.scroll = clamp(this.scroll, Math.max(0, i - vis + 1), Math.min(i, Math.max(0, list.length - vis)));
    list.forEach((it, k) => { const row = k - this.scroll; it.rect = row >= 0 && row < vis ? [x + 4, top + row * rowH, w - 8, rowH - 2] : null; it.scale = 1; it.align = 'left'; });
    this.menu.set(list);
    // tabs by click
    const c = game.input.clicked(); if (c && c[1] < 34 && c[0] > x) { const t = Math.floor((c[0] - x) / (w / 4)); if (t >= 0 && t < 4) { this.tab = t; this.menu.i = 0; } }
    if (game.input.pressed('cancel') || EF.devKey) { EF.devKey = false; this.close(); return true; }
    this.menu.update(dt);
    if (LIVE.m && this.cheats.freeze && !this.stepOnce) return true;
    this.stepOnce = false;
    return true;
  },
  draw(r) {
    const m = LIVE.m;
    if (m && LIVE.view && (this.cheats.showBoxes || this.cheats.showAI || this.cheats.showPath || this.cheats.showBones)) {
      if (this.cheats.showPath) for (const q of predictBall(m, 1, 1 / 20)) r.queue(q.x, q.y, q.z, g => { const [x, y] = r.w(q.x, q.y, q.z); px.dot(g, Math.round(x), Math.round(y), '#ff3aa0'); }, { emissive: true });
      for (const f of m.players) {
        if (f.sentOff) continue;
        if (this.cheats.showBoxes) r.decal(() => r.groundRing(f.body.x, f.body.y, f.body.r, f.side ? '#ff5a5a' : '#5aa0ff', 1));
        if (this.cheats.showBones) LIVE.view.rigs[f.id].debug && LIVE.view.rigs[f.id].debug(r);
        if (this.cheats.showAI && !f.gk) { const sp = m.brains[f.side].spot(f, m.owner && m.owner.side === f.side ? 'attack' : 'defend', P.toUV(m.dir(f.side), m.ball.x, m.ball.y)); r.decal(() => r.groundRing(sp[0], sp[1], 4, f.side ? '#ff9a9a' : '#9ac8ff', .8)); if (m.owner === f && f.plan) r.textAt(f.body.x, f.body.y, 50, f.plan.k.toUpperCase(), '#ffe08a'); }
      }
    }
    if (!this.isOpen) { if (Object.keys(this.cheats).some(k => this.cheats[k]) && !SESSION) r.overlay(g => E.font.text(g, 'CHEATS ON', 4, r.H - 18, '#ff7ad0', { font: 'tiny', outline: '#000' })); return; }
    r.overlay(g => {
      const x = Math.round(r.W * .58), w = r.W - x - 6;
      E.ui.box(g, x, 4, w, r.H - 8, { bg: ['#0a0e20', '#141c3a'], border: '#ff7ad0', alpha: .92 });
      TABS.forEach((t, i) => { const tx = x + 4 + i * (w - 8) / 4; px.rect(g, Math.round(tx), 8, Math.round((w - 8) / 4) - 2, 14, i === this.tab ? '#ff7ad0' : '#2a2a4a'); E.font.text(g, t, Math.round(tx + (w - 8) / 8), 11, i === this.tab ? '#141414' : '#c8c8e8', { align: 'center', font: 'tiny', outline: false }); });
      E.font.text(g, 'DEV MODE', x + 6, 26, '#ff7ad0', { outline: false });
      if (this.tab === 3) {
        const snap = game.debug && game.debug.snapshot ? game.debug.snapshot() : {};
        const lines = ['VERSION ' + EF.VERSION + '  ' + E.versionLabel(), 'SCENE ' + game.sceneName + (m ? '  MODE ' + m.mode + '  SEED ' + m.seed : ''), 'BODIES ' + (m ? m.players.length + 2 : 0) + '  PARTICLES ' + (PFX.list ? PFX.list.length : '?') + '  FANS ' + (LIVE.view ? LIVE.view.fans.length : 0),
          'STATS ' + JSON.stringify(game.stats || {}).slice(0, 80), ...JSON.stringify(snap).match(/.{1,52}/g).slice(0, 18)];
        lines.forEach((l, i) => E.font.text(g, l, x + 6, 40 + i * 9, '#c8d0f0', { font: 'tiny', outline: false }));
      } else this.menu.items.forEach((it, k) => { if (!it.rect) return; if (it.header) { E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, '#ff7ad0', { font: 'tiny', outline: false }); return; } const f = k === this.menu.i; px.rect(g, it.rect[0], it.rect[1], it.rect[2], it.rect[3], f ? '#2a3a7a' : '#121a36'); if (f) px.rect(g, it.rect[0], it.rect[1], 2, it.rect[3], '#ffc83a');
        if (it.kind === 'slider') { const u = (it.get() - it.min) / (it.max - it.min); E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, it.changed() ? '#ff9ae0' : '#e8ecff', { font: 'tiny', outline: false }); px.rect(g, it.rect[0] + it.rect[2] * .62, it.rect[1] + 5, Math.round(it.rect[2] * .26), 3, '#0a0e20'); px.rect(g, it.rect[0] + it.rect[2] * .62, it.rect[1] + 5, Math.round(it.rect[2] * .26 * u), 3, '#ffc83a'); E.font.text(g, it.fmt(it.get()), it.rect[0] + it.rect[2] - 3, it.rect[1] + 3, '#ffe08a', { align: 'right', font: 'tiny', outline: false }); }
        else if (it.kind === 'toggle') { E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, '#e8ecff', { font: 'tiny', outline: false }); E.font.text(g, it.get() ? 'ON' : 'OFF', it.rect[0] + it.rect[2] - 3, it.rect[1] + 3, it.get() ? '#5aff7a' : '#8a8aa8', { align: 'right', font: 'tiny', outline: false }); }
        else E.font.text(g, it.label, it.rect[0] + 4, it.rect[1] + 3, '#e8ecff', { font: 'tiny', outline: false }); });
      EF.promptRow(g, x + w / 2, r.H - 20, [[['switch', 'skill'], 'TAB', { sep: '/' }], ['shoot', 'RESET'], ['cancel', 'CLOSE']], { input: game.input });
    });
  }
};
if (!game.headless && typeof addEventListener === 'function') addEventListener('keydown', e => {
  if (SESSION) return;
  if (e.code === 'F1' || e.code === 'Backquote') { e.preventDefault(); if (EF.Dev.isOpen) EF.devKey = true; else EF.Dev.open(); }
});
/* ---- the animation gallery: every move on a loop, on a chosen rig, at 1x or 0.25x ---- */
const GALLERY = ['pass', 'shot', 'shotHard', 'chip', 'volley', 'header', 'bicycle', 'divingHeader', 'slide', 'poke', 'barge', 'launched', 'down', 'getup', 'diveLow', 'diveHigh', 'catch', 'throw', 'dive', 'stepover', 'spin', 'rainbow', 'nutmeg', 'kneeslide', 'backflip', 'cartwheel', 'aeroplane', 'robot', 'shirt', 'dance', 'badgekiss', 'helicopter', 'fishslap', 'cheer', 'refCard', 'refVar', 'tired'];
EF.GALLERY = GALLERY;
const animScene = {
  touch: [], view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'],
  enter() {
    this.k = Math.max(0, GALLERY.indexOf(LINK.scene === 'dev' && LINK.part === 'anim' ? LINK.extra : '')); this.t = 0; this.slow = false; this.stage = new Stage('rec', { weather: false });
    const m = this.stage.m; this.f = m.side[0][4]; this.f.state = 'run'; this.f.body.x = P.CX; this.f.body.y = P.CY; game.setZoom(2.2); game.zoomBase = 2.2;
    this.menu = new UIMenu({ onBack: () => game.go('title', { menu: true }), onTab: d => { this.k = (this.k + d + GALLERY.length) % GALLERY.length; this.t = 0; } });
  },
  update(dt) {
    const sp = this.slow ? .25 : 1; this.t += dt * sp; const f = this.f, mv = GALLERY[this.k], u = (this.t % 1.4) / 1.4;
    f.state = 'run'; f.act = null; f.celebrate = null; f.flip = 0; f.diveU = 0; f.tiltSide = 0; f.body.z = 0; f.air = null; f.lift = 0; f.gk = false; f.set = false;
    if (KICK[mv] || ['spin', 'throw', 'catch'].includes(mv)) f.act = { name: mv, t: u * .5, dur: .5 };
    else if (mv === 'slide') { f.state = 'slide'; }
    else if (mv === 'launched') { f.state = 'launched'; f.flip = u; f.body.z = Math.sin(u * PI) * 20; }
    else if (mv === 'down') f.state = 'down'; else if (mv === 'getup') f.state = u < .5 ? 'down' : 'getup';
    else if (mv === 'diveLow' || mv === 'diveHigh') { f.state = 'keeper-dive'; f.diveU = Math.min(1, u * 2); f.tiltSide = 1; f.body.z = mv === 'diveHigh' ? Math.sin(Math.min(1, u * 1.3) * PI) * 14 : 2; }
    else if (mv === 'dive') { f.state = 'dive'; f.stateT = u * 1.2; }
    else if (mv === 'divingHeader' || mv === 'bicycle') { f.state = 'air'; f.air = { kind: mv, t: u * .6 }; }
    else if (mv === 'refCard' || mv === 'refVar') { f.celebrate = { anim: mv === 'refCard' ? 'cheer' : 'aeroplane' }; }
    else if (mv === 'tired') { f.dejected = true; }
    else f.celebrate = EF.get('celebration', mv) ? EF.get('celebration', mv) : { anim: mv };
    if (UIK.any('confirm')) this.slow = !this.slow;
    if (game.input.pressed('right')) { this.k = (this.k + 1) % GALLERY.length; this.t = 0; } if (game.input.pressed('left')) { this.k = (this.k - 1 + GALLERY.length) % GALLERY.length; this.t = 0; }
    if (game.input.pressed('up')) game.nextView();
    this.menu.update(dt);
    this.stage.update(dt * sp); game.focus(P.CX, P.CY, 14);
    this.f.dejected = mv === 'tired';
  },
  draw(r) { this.stage.draw(r); r.overlay(g => { EF.heading(g, 'ANIMATION: ' + GALLERY[this.k].toUpperCase(), r.W / 2, 8, 2); E.font.text(g, (this.k + 1) + '/' + GALLERY.length + '  ' + (this.slow ? '0.25x' : '1x') + '  VIEW: ' + game.view.label, r.W / 2, 30, '#ffe08a', { align: 'center', outline: '#000' }); EF.footer(g, r, [['left', 'MOVE'], ['confirm', 'SPEED'], ['up', 'VIEW'], ['cancel', 'BACK']]); }); }
};
EF.scenes.animgallery = animScene;
/* ---- the sound test: every SFX, song, chant and voice ---- */
const soundScene = {
  touch: [], view: 'broadcast',
  enter() { this.menu = new UIMenu({ onBack: () => { EF.music(null); game.go('title', { menu: true }); } }); this.scroll = 0; },
  list() {
    const L = [];
    for (const k of Object.keys(SFX)) L.push({ label: 'SFX: ' + k, onPick: () => EF.sfx(k) });
    for (const k of Object.keys(EF.SONGS)) L.push({ label: 'SONG: ' + k, onPick: () => EF.music(k) });
    for (const c of EF.all('chant')) L.push({ label: 'CHANT: ' + c.id, onPick: () => EF.chant.sing(c.id) });
    for (const k of ['ooh', 'roar', 'boo', 'whistle', 'groan', 'hum']) L.push({ label: 'CROWD: ' + k, onPick: () => EF.crowdAudio.react(k) });
    for (const id of Object.keys(EF.SPEAKERS)) L.push({ label: 'VOICE: ' + EF.SPEAKERS[id].name, onPick: () => EF.babble.shout(id, 'Hello there! Is this thing on? Lovely.') });
    L.push({ label: 'STOP MUSIC', onPick: () => EF.music(null) });
    return L;
  },
  update(dt) {
    const L = this.list(), vis = Math.floor((game.H - 70) / 14), i = this.menu.i; this.scroll = clamp(this.scroll, Math.max(0, i - vis + 1), Math.min(i, L.length - vis));
    L.forEach((it, k) => { const row = k - this.scroll; it.rect = row >= 0 && row < vis ? [Math.round(game.W / 2 - 130), 36 + row * 14, 260, 12] : null; it.scale = 1; it.align = 'left'; });
    this.menu.set(L); this.menu.update(dt); if (!EF.crowdAudio.on) EF.crowdAudio.start(.5); EF.crowdAudio.update(dt, .3);
  },
  exit() { EF.crowdAudio.stop(); },
  draw(r) { r.sky(['#0a0e24', '#141c3a', '#1a2450']); r.overlay(g => { EF.heading(g, 'SOUND TEST', r.W / 2, 8, 2); this.menu.draw(g); EF.footer(g, r, [['confirm', 'PLAY'], ['cancel', 'BACK']]); }); }
};
EF.scenes.soundtest = soundScene;


/* ===== 42-hub.js ===== */
/* 42-hub: AI Hub sessions (Session Protocol v1, shared-world, 2-4 players). Connect with our own card (the tunnel), set
 * the round up from the shared seed, ready with no key press, start on the hub's clock. The host runs the match: remote
 * players' footballers follow their input messages (cumulative press counters: a lost packet loses no press); it sends
 * snapshots 14 a second (unreliable, small) and the match's events at most 5 a second (reliable). Clients draw a mirror
 * interpolated 100 ms behind and send their input 15 a second. Leaving hands a footballer to the CPU; time-up finishes at
 * once; on end everything stops. Options or Esc opens our own SESSION SETTINGS overlay: nothing pauses. */
const ST_CODES = ['run', 'slide', 'poke', 'barge', 'skill', 'air', 'down', 'getup', 'launched', 'dive', 'stunned', 'keeper-dive', 'keeper-hold', 'off', 'gone'];
const ACT_CODES = [null, 'pass', 'shot', 'shotHard', 'chip', 'volley', 'header', 'bicycle', 'divingHeader', 'poke', 'slide', 'barge', 'stepover', 'spin', 'rainbow', 'nutmeg', 'knockon', 'throw', 'smother', 'catch', 'diveHigh', 'diveLow', 'dive', 'touch'];
const MODE_CODES = ['kickoff', 'setpiece', 'play', 'dead', 'goal', 'var', 'halftime', 'fulltime', 'shootout', 'over'];
const SP_CODES = [null, 'kickoff', 'goalkick', 'corner', 'freekick', 'penalty'];
const FWD_EVENTS = new Set(['goal', 'ownGoal', 'whistle', 'card', 'sendOff', 'var', 'varDecision', 'superStrike', 'superRelease', 'saveDuel', 'saveDuelResult', 'europhoria', 'europhoriaEnd', 'euphoriaFull', 'kickoff', 'half', 'fulltime', 'setpiece', 'penaltyAwarded', 'woodwork', 'save', 'shot', 'celebrate', 'event', 'bus', 'busSmash', 'shootoutStart', 'shootoutKick', 'shootoutEnd', 'advantage', 'diveBooked', 'diveWon', 'nutmeg', 'board', 'crowdThrow', 'tackleWon', 'launch', 'pass', 'header', 'bicycle', 'volley', 'catch', 'parry', 'screamer', 'goldenMoment', 'refHit']);
const R1 = v => Math.round(v), R100 = v => Math.round(v * 100);
EF.Hub = {
  on: false, info: null, card: null, role: null, sent: 0, received: 0, ended: null, menuOpen: false, snaps: [], evQ: [], evSeq: 0, applied: 0, lastSnap: 0, lastEv: 0, lastIn: 0, counters: [0, 0, 0, 0, 0, 0, 0, 0], inSeq: 0, finished: false, readied: false, pending: [],
  send(data, o) { if (this.ended) return false; try { const ok = AIHub.send(data, o); if (ok !== false) this.sent++; return ok; } catch (e) { return false; } },
  async connect() {
    this.on = true;
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
    if (!info) { this.on = false; game.go('title'); return; }
    this.info = info; this.role = AIHub.server ? 'server' : AIHub.isHost ? 'host' : 'client';
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => this.start());
    AIHub.on('message', (d, from) => this.message(d, from));
    AIHub.on('leave', e => this.leave(e));
    AIHub.on('time-up', () => this.timeUp());
    AIHub.on('end', e => this.end(e));
    this.setup();
    game.go('tunnel', { card: true, match: this.opts }, { fade: 0 });
    // the match is built: ready, with no key press
    this.readied = true; try { AIHub.ready(); } catch (e) { game.fail('hub ready', e); }
  },
  setup() {
    const R = AIHub.rng('setup'), T = EF.all('team').map(t => t.id), S = EF.all('stadium').filter(s => !s.training).map(s => s.id);
    const a = T[Math.floor(R() * T.length)]; let b = T[Math.floor(R() * T.length)]; if (b === a) b = T[(T.indexOf(a) + 1) % T.length];
    const stadium = S[Math.floor(R() * S.length)], seed = Math.floor(R() * 1e9);
    const players = this.info.players || [], limit = (this.info.limitMs || 240000) / 1000;
    const half = clamp(Math.min(90, (limit - 50) / 2), 45, 90);
    const slots = players.map((p, i) => ({ side: i % 2, hubId: p.id, label: String(p.name || 'P' + (i + 1)).slice(0, 12).toUpperCase(), color: i, local: p.id === AIHub.me && !AIHub.server }));
    const humans = [0, 1].map(s => slots.filter(x => x.side === s).length), buffs = [];
    if (players.length === 3) { const lone = humans[0] === 1 ? 0 : 1; buffs.push({ side: lone, kind: 'underdog' }); }
    this.opts = { home: a, away: b, stadium, seed, halfLength: half, draws: 'allowed', session: true, buffs, hubSlots: slots, noReplay: true };
  },
  buildMatch() {
    const o = this.opts;
    const slots = o.hubSlots.map(s => Object.assign({}, s, { ctl: s.local ? new HumanController(game.input) : this.role === 'client' ? null : new RemoteController() }));
    const m = new Match(Object.assign({}, o, { slots }));
    for (const sl of m.slots) if (!sl.ctl && this.role !== 'client') sl.menu = true;
    if (this.role === 'client') { m.mirror = true; for (const sl of m.slots) if (!sl.local) sl.ctl = null; }
    this.m = m; return m;
  },
  start() { if (this.ended) return; game.go('match', { session: true, match: this.buildMatch(), noReplay: true }, { fade: 0 }); this.startedAt = game.real; },
  /* ---- the card (the tunnel scene in card mode) ---- */
  cardUpdate(dt, sc) {
    const c = this.card || {};
    const ready = game.players.some(I => I.pressed('confirm') || I.pressed('pass')), more = game.players.some(I => I.pressed('through')) || (typeof window !== 'undefined' && this._tKey);
    this._tKey = false;
    const clk = game.input.clicked();
    if (ready || (clk && this.readyBtn && inR(clk, this.readyBtn))) { try { AIHub.answer('ready'); } catch (e) { /* */ } EF.sfx('menuPick'); }
    if (more || (clk && this.moreBtn && inR(clk, this.moreBtn))) { try { AIHub.answer('more'); } catch (e) { /* */ } EF.sfx('menuMove'); }
    void c; void dt; void sc;
  },
  cardDraw(g, r, sc) {
    const c = this.card || {}, info = this.info || { players: [] }, W = Math.min(r.W - 30, 400), x = Math.round(r.W / 2 - W / 2), y = Math.round(r.H * .05), o = this.opts;
    EF.panel(g, x, y, W, Math.round(r.H * .86), { alpha: .9 });
    EF.heading(g, 'EUROPHORIA FOOTBALL', r.W / 2, y + 6, 2);
    const t0 = EF.get('team', o.home), t1 = EF.get('team', o.away);
    EF.drawCrest(g, t0, x + 30, y + 44, 26); EF.drawCrest(g, t1, x + W - 30, y + 44, 26);
    E.font.text(g, t0.name + '  vs  ' + t1.name, r.W / 2, y + 32, '#ffffff', { align: 'center', outline: false }); E.font.text(g, EF.get('stadium', o.stadium).name, r.W / 2, y + 44, '#ffe08a', { align: 'center', font: 'tiny', outline: false });
    E.font.text(g, 'HOW TO WIN: OUTSCORE THE OTHER SIDE BEFORE THE FINAL WHISTLE', r.W / 2, y + 60, '#ffc83a', { align: 'center', outline: false, wrap: W - 20 });
    const cols = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
    (info.players || []).forEach((p, i) => { const s = i % 2, px0 = s ? x + W * .55 : x + 16, py = y + 80 + Math.floor(i / 2) * 14; px.rect(g, px0, py, 8, 8, cols[i % 4]); E.font.text(g, String(p.name || 'P' + (i + 1)).slice(0, 14).toUpperCase() + ((c.ready || []).includes(p.id) ? '  OK' : ''), px0 + 12, py, '#ffffff', { outline: false }); E.font.text(g, s ? t1.short : t0.short, px0 + W * .38, py, '#9aa6c8', { outline: false }); });
    EF.promptRow(g, r.W / 2, y + 116, [['up', 'MOVE'], ['pass', 'PASS'], ['shoot', 'SHOOT (HOLD)'], ['lob', 'LOB'], ['sprint', 'SPRINT']]);
    EF.promptRow(g, r.W / 2, y + 132, [['skill', 'SKILL'], ['switch', 'SWITCH'], ['dive', 'THEATRICS'], [EF.deviceOf(game.input) === 'gamepad' ? ['switch', 'skill'] : 'euphoria', 'EUROPHORIA']]);
    const left = c.paused ? 'PAUSED' : c.starting ? 'STARTING...' : c.left != null ? Math.ceil(c.left / 1000) + ' S' : '...';
    E.font.text(g, 'STARTS IN: ' + left + (c.asking ? '   (' + c.asking + ' ASKED FOR MORE TIME)' : ''), r.W / 2, y + 150, '#c8d0f0', { align: 'center', outline: false });
    this.readyBtn = [Math.round(r.W / 2 - 150), y + 166, 140, 26]; this.moreBtn = [Math.round(r.W / 2 + 10), y + 166, 140, 26];
    EF.panel(g, ...this.readyBtn, { border: '#5aff7a' }); EF.prompt(g, this.readyBtn[0] + 10, this.readyBtn[1] + 7, 'confirm', 'READY');
    EF.panel(g, ...this.moreBtn, { border: c.asked ? '#ff9ae0' : '#ffc83a' }); EF.prompt(g, this.moreBtn[0] + 10, this.moreBtn[1] + 7, 'through', c.asked ? 'MORE TIME (ASKED)' : 'MORE TIME (T)');
  },
  /* ---- messages ---- */
  message(d, from) {
    this.received++;
    if (!d || typeof d !== 'object') return;
    const m = this.m;
    if (this.role !== 'client') {
      if (!m) return;
      const sl = m.slots.find(s => s.hubId === from); if (!sl) return;
      if (d.t === 'i' && sl.ctl && sl.ctl.feed) sl.ctl.feed(d, game.real);
      if (d.t === 'duel' && m.duel && m.duel.slot === sl.i) m.duelPress(d.at);
      if (d.t === 'cel' && sl.ctl) sl.ctl.cel = d.k;
      if (d.t === 'menu') sl.menu = !!d.open;
    } else {
      if (d.t === 's') { this.snaps.push(Object.assign(d, { rt: game.real })); if (this.snaps.length > 12) this.snaps.shift(); if (d.over) this.lastOver = d; }
      if (d.t === 'E') for (const e of d.list) if (e[0] > this.applied) { this.applied = e[0]; this.pending.push(e); }
    }
  },
  leave(e) { const m = this.m; if (!m) return; const sl = m.slots.find(s => s.hubId === e.id); if (sl) { sl.ctl = null; sl.menu = true; sl.left = true; if (sl.f) sl.f.human = null; sl.f = null; } },
  timeUp() { if (this.role !== 'client' && !this.finished) this.finish(); },
  end(e) {
    this.ended = e || { reason: 'finished' };
    EF.music(null); EF.crowdAudio.stop(); try { A.music(null); A.mute(true); } catch (er) { /* */ }
    game.input.consumeAll();
  },
  finish() {
    const m = this.m; if (!m || this.finished) return; this.finished = true;
    this.send(this.snapshot(m, true), { reliable: true });
    const players = (this.info.players || []).map(p => p.id).filter(id => { const sl = m.slots.find(s => s.hubId === id); return sl && !sl.left; });
    const sideOf = id => (m.slots.find(s => s.hubId === id) || {}).side;
    const w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    const standings = w < 0 ? [players] : [players.filter(id => sideOf(id) === w), players.filter(id => sideOf(id) !== w)].filter(a => a.length);
    const scores = {}, stats = {};
    for (const id of players) { const s = sideOf(id), sl = m.slots.find(x => x.hubId === id), f = sl && sl.f; scores[id] = m.score[s]; stats[id] = { Goals: m.goals.filter(g => g.side === s && !g.own).length, Shots: m.stats[s].shots, Tackles: m.stats[s].tackles }; void f; }
    let best = null, bv = -1; for (const id of players) { const v = (stats[id].Goals * 3 + stats[id].Tackles + stats[id].Shots * .5) + (sideOf(id) === w ? 2 : 0); if (v > bv) { bv = v; best = id; } }
    const awards = best != null ? [{ id: best, title: 'Player of the Match', detail: m.teams[sideOf(best)].name + ' ' + m.score[0] + '-' + m.score[1] }] : [];
    try { AIHub.finish({ standings, scores, stats, awards }); } catch (e) { game.fail('hub finish', e); }
  },
  /* ---- the host's side ---- */
  snapshot(m, over) {
    const b = m.ball, o = m.official;
    const p = m.players.map(f => { const b2 = f.body, fl = (f.cards & 3) | (f.glow ? 4 : 0) | (f.human != null ? 8 : 0) | (f.sprinting ? 16 : 0) | (f.set ? 32 : 0) | (f.dejected ? 64 : 0) | (f.celebrate ? 128 : 0);
      return [R1(b2.x), R1(b2.y), R1(b2.z), R1(b2.vx), R1(b2.vy), R100(f.facing), Math.max(0, ST_CODES.indexOf(f.state)), Math.max(0, ACT_CODES.indexOf(f.act ? f.act.name : null)), f.act ? R100(f.act.t / f.act.dur) : 0, fl, R100(f.diveU || 0), f.tiltSide || 0, f.celebrate && f.celebrate.id ? f.celebrate.id : f.celebrate === 'pile' ? 1 : 0]; });
    const sp = m.sp && m.sp.phase !== 'taken' ? [SP_CODES.indexOf(m.sp.kind), m.sp.taker ? m.sp.taker.id : -1, m.sp.side, m.sp.phase === 'aim' ? 1 : 0] : 0;
    return { t: 's', n: ++this.snapN, at: Math.round(AIHub.time()), b: [R1(b.x), R1(b.y), R1(b.z), R1(b.vx), R1(b.vy), R1(b.vz), Math.round(b.roll || 0) % 1000, m.owner ? m.owner.id : -1, b.superPath ? 1 : 0],
      p, r: o ? [R1(o.body.x), R1(o.body.y), R100(o.facing), o.sig ? ['whistle', 'card', 'advantage', 'point', 'ear', 'tv'].indexOf(o.sig) + 1 : 0, o.downT > 0 ? 1 : 0] : 0,
      m: [MODE_CODES.indexOf(m.mode), Math.round(m.clock * 10), m.half, m.score[0], m.score[1], R1(m.euph[0]), R1(m.euph[1]), Math.round(m.euroT[0] * 10), Math.round(m.euroT[1] * 10), m.swapped ? 1 : 0, m.stoppage, m.boardShown ? 1 : 0],
      c: m.slots.map(s => s.f ? s.f.id : -1), sp, d: m.duel ? [m.duel.slot, Math.round(m.duel.t * 100)] : 0, so: m.so ? [m.so.kicks[0].map(k => k ? 1 : 0).join(''), m.so.kicks[1].map(k => k ? 1 : 0).join(''), m.so.score[0], m.so.score[1]] : 0, over: over ? 1 : 0 };
  },
  hostStep(dt) {
    const m = this.m; if (!m || this.ended) return;
    const now = game.real;
    if (now - this.lastSnap >= 1 / 14) { this.lastSnap = now; this.send(this.snapshot(m), { reliable: false }); }
    if (this.evQ.length && now - this.lastEv >= .2) { this.lastEv = now; const list = this.evQ.splice(0, 40); this.send({ t: 'E', n: ++this.evN, list }, { reliable: true }); }
    if (m.mode === 'over' && !this.finished && m.modeT > 1.5) this.finish();
  },
  hostEvent(type, ev) {
    if (!FWD_EVENTS.has(type) || this.role === 'client') return;
    const d = {}; for (const k of ['who', 'side', 'kind', 'name', 'minute', 'result', 'id', 'overturned', 'goal', 'second', 'power', 'onTarget', 'fresh', 'half', 'slot', 'add', 'inBox', 'super']) if (ev[k] !== undefined && ev[k] !== null) d[k] = typeof ev[k] === 'number' ? Math.round(ev[k] * 100) / 100 : ev[k];
    this.evQ.push([++this.evSeq, Math.round(AIHub.time()), type, d]);
    if (this.evQ.length > 60) this.evQ.shift();
  },
  /* ---- the client's side ---- */
  clientStep(dt) {
    const m = this.m; if (!m || this.ended) return;
    const sl = m.slots.find(s => s.local);
    // input to the host, 15 a second; every press counted
    if (sl && sl.ctl && !this.menuOpen) {
      const it = sl.ctl.intent(m, sl), keys = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive'];
      keys.forEach((k, i) => { if (it[k] && it[k].pressed) this.counters[i]++; }); if (it.euphoria) this.counters[7]++;
      const bits = (it.sprint ? 1 : 0) | (it.pass.down ? 2 : 0) | (it.shoot.down ? 4 : 0) | (it.lob.down ? 8 : 0) | (it.through.down ? 16 : 0) | (it.skill.down ? 32 : 0) | (it.sw.down ? 64 : 0) | (it.dive.down ? 128 : 0);
      if (game.real - this.lastIn >= 1 / 15) { this.lastIn = game.real; this.send({ t: 'i', s: ++this.inSeq, at: Math.round(AIHub.time()), m: [R100(it.move[0]), R100(it.move[1])], a: it.aim ? [R100(clamp(it.aim[0] / 100, -1, 1)), R100(clamp(it.aim[1] / 100, -1, 1))] : 0, h: bits, c: this.counters.slice() }, { reliable: false }); }
      if (m.duel && m.duel.slot === sl.i && !m.duel.sent && sl.ctl.duelPressed()) { m.duel.sent = true; this.send({ t: 'duel', at: m.duel.t }, { reliable: true }); }
      if (m.celebration && !m.celebration.sent) { const k = sl.ctl.celebPick(); if (k >= 0) { m.celebration.sent = true; this.send({ t: 'cel', k }, { reliable: true }); } }
      if (it.pass.pressed || it.shoot.pressed) { EF.sfx('touch'); sl.ctl.I.rumble && sl.ctl.I.rumble(.15, .05); }
    }
    this.applyMirror(dt);
    for (const e of this.pending.splice(0)) { const [, , type, d] = e; const ev = Object.assign({ match: m, t: m.t }, d); EF.bus.emit(type, ev); if (type === 'saveDuel') m.duel = { slot: d.slot, t: 0, target: 1 }; if (type === 'saveDuelResult') m.duel = null; if (type === 'goal' || type === 'ownGoal') m.celebration = { side: d.side, t: 0, scorer: d.who != null ? m.players[d.who] : null, picked: false }; if (type === 'kickoff') m.celebration = null; }
    if (m.duel) m.duel.t += dt / Math.max(.05, game.timeScale);
    if (m.celebration) { m.celebration.t += dt; if (m.celebration.t > 3.5) m.celebration = null; }
  },
  applyMirror(dt) {
    const m = this.m, S = this.snaps; if (!S.length) return;
    const rt = game.real - .1;
    let a = S[0], b = S[S.length - 1];
    for (let i = 0; i < S.length - 1; i++) if (S[i].rt <= rt && S[i + 1].rt >= rt) { a = S[i]; b = S[i + 1]; break; }
    let u = b.rt > a.rt ? clamp((rt - a.rt) / (b.rt - a.rt), 0, 1) : 1;
    if (rt > b.rt) { a = b; u = 0; }   // late: hold (extrapolate a little by velocity)
    const ext = rt > b.rt ? Math.min(.15, rt - b.rt) : 0, L = (p, q) => p + (q - p) * u;
    const fresh = this.lastOver || b;
    m.players.forEach((f, i) => {
      const A1 = a.p[i], B1 = b.p[i]; if (!A1 || !B1) return;
      f.body.x = L(A1[0], B1[0]) + B1[3] * ext; f.body.y = L(A1[1], B1[1]) + B1[4] * ext; f.body.z = L(A1[2], B1[2]); f.body.vx = B1[3]; f.body.vy = B1[4];
      f.facing = B1[5] / 100; const st = ST_CODES[B1[6]] || 'run'; if (st !== f.state) { f.state = st; f.stateT = 0; } else f.stateT += dt;
      const an = ACT_CODES[B1[7]]; f.act = an ? { name: an, t: B1[8] / 100 * .4, dur: .4 } : null;
      const fl = B1[9]; f.cards = fl & 3; f.glow = !!(fl & 4); f.sprinting = !!(fl & 16); f.set = !!(fl & 32); f.dejected = !!(fl & 64);
      f.celebrate = fl & 128 ? (B1[12] && EF.get('celebration', B1[12]) ? EF.get('celebration', B1[12]) : 'pile') : null;
      f.diveU = B1[10] / 100; f.tiltSide = B1[11]; f.sentOff = st === 'off' || st === 'gone';
    });
    const bb = m.ball, A2 = a.b, B2 = b.b;
    bb.x = L(A2[0], B2[0]) + B2[3] * ext; bb.y = L(A2[1], B2[1]) + B2[4] * ext; bb.z = L(A2[2], B2[2]); bb.vx = B2[3]; bb.vy = B2[4]; bb.vz = B2[5]; bb.roll = (bb.roll || 0) + hyp(bb.vx, bb.vy) * dt; bb.superPath = B2[8] ? 'rocket' : null;
    m.owner = B2[7] >= 0 ? m.players[B2[7]] : null;
    if (b.r) { if (!m.official) refStep(m, 0); const o = m.official; o.body.x = L(a.r ? a.r[0] : b.r[0], b.r[0]); o.body.y = L(a.r ? a.r[1] : b.r[1], b.r[1]); o.facing = b.r[2] / 100; o.sig = ['whistle', 'card', 'advantage', 'point', 'ear', 'tv'][b.r[3] - 1] || null; o.downT = b.r[4] ? 1 : 0; }
    const M = fresh.m; m.mode = MODE_CODES[M[0]] || 'play'; m.clock = M[1] / 10; m.half = M[2]; m.score = [M[3], M[4]]; m.euph = [M[5], M[6]]; m.euroT = [M[7] / 10, M[8] / 10]; m.swapped = !!M[9]; m.stoppage = M[10]; m.boardShown = !!M[11];
    m.slots.forEach((s, i) => { const id = b.c[i]; const f = id >= 0 ? m.players[id] : null; if (s.f && s.f !== f) s.f.human = null; s.f = f; if (f) f.human = i; });
    if (b.sp) { const kind = SP_CODES[b.sp[0]], taker = m.players[b.sp[1]], local = m.slots.find(s => s.local); m.sp = m.sp && m.sp.kind === kind ? m.sp : { kind, side: b.sp[2], ring: { x: m.goalX(b.sp[2]) - m.dir(b.sp[2]) * 70, y: P.CY }, zone: [1, 0], aimY: 0, aimZ: .5, power: 0, wall: [] }; m.sp.taker = taker; m.sp.phase = b.sp[3] ? 'aim' : 'setup'; m.sp.human = local && local.f === taker ? local : null; m.sp.shootable = kind === 'freekick'; }
    else m.sp = null;
    if (b.so) { m.so = m.so || { kicks: [[], []], score: [0, 0] }; m.so.kicks = [b.so[0].split('').map(c => c === '1'), b.so[1].split('').map(c => c === '1')]; m.so.score = [b.so[2], b.so[3]]; }
    m.t += dt;
  }
};
const inR = (p, r) => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
EF.Hub.snapN = 0; EF.Hub.evN = 0;
EF.bus.on('*', ev => { if (EF.Hub.on && EF.Hub.m && ev.match === EF.Hub.m && EF.Hub.role !== 'client') EF.Hub.hostEvent(ev.type, ev); });
if (!game.headless && typeof addEventListener === 'function') addEventListener('keydown', e => { if (SESSION && e.code === 'KeyT') EF.Hub._tKey = true; });
/* ---- the waiting scene and the session settings overlay ---- */
EF.scenes.hubwait = {
  touch: [], view: 'broadcast',
  enter() { this.t = 0; this.stage = new Stage('euphorium', { weather: false }); EF.Hub.connect(); },
  update(dt) { this.t += dt; this.stage.update(dt); game.focus(P.CX, P.CY - 40, 0); if (EF.Hub.info && !EF.Hub.ended) EF.Hub.cardUpdate(dt, this); },
  draw(r) { this.stage.draw(r); r.overlay(g => { EF.heading(g, 'EUROPHORIA FOOTBALL', r.W / 2, r.H * .3, 3); E.font.text(g, 'CONNECTING' + '...'.slice(0, 1 + Math.floor(this.t * 3) % 3), r.W / 2, r.H * .5, '#ffe08a', { align: 'center', scale: 2, outline: '#000' }); }); }
};
EF.Hub.settingsMenu = () => {
  const M = new UIMenu({ onBack: () => EF.Hub.toggleMenu(false) });
  const sl = (k, label) => ({ kind: 'slider', label, min: 0, max: 1, step: .1, get: () => game.settings[k], set: v => game.settings.set(k, v) });
  M.list = () => [sl('volume', 'VOLUME'), sl('music', 'MUSIC'), sl('effects', 'EFFECTS'), sl('voices', 'VOICES'), sl('crowd', 'CROWD'), { kind: 'choice', label: 'BUTTON SYMBOLS', get: () => game.settings.glyphs, set: v => game.settings.set('glyphs', v), options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] }, { label: 'BACK TO THE MATCH', onPick: () => EF.Hub.toggleMenu(false) }];
  return M;
};
EF.Hub.toggleMenu = on => {
  const H = EF.Hub; H.menuOpen = on; if (on) H.menu = H.settingsMenu();
  const m = H.m; if (!m) return;
  const sl = m.slots.find(s => s.local);
  if (sl) { if (H.role === 'client') H.send({ t: 'menu', open: on }, { reliable: true }); else sl.menu = on; }
  game.input.consumeAll();
};
EF.Hub.overlayUpdate = dt => {
  const H = EF.Hub, I = game.input;
  const createHeld = I.held && (I.held.has ? I.held.has('Pad8') : false);
  if (!H.menuOpen && (I.pressed('pause') && !createHeld)) { H.toggleMenu(true); return true; }
  if (!H.menuOpen) return false;
  const r = { W: game.W, H: game.H }, L = H.menu.list(); EF.layoutColumn(r, L.length, { w: 260, h: 20, gap: 4 }).forEach((rc, i) => { L[i].rect = rc; L[i].scale = 1; });
  H.menu.set(L); H.menu.update(dt);
  return true;
};
EF.Hub.overlayDraw = r => {
  const H = EF.Hub;
  if (H.ended) { r.overlay(g => { px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#000010')); const why = H.ended.reason, m = H.m; EF.heading(g, why === 'void' || why === 'host-left' ? 'ROUND VOID' : why === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'FULL TIME', r.W / 2, r.H * .3, 3); if (m && why !== 'sat-out') E.font.text(g, m.teams[0].name + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].name, r.W / 2, r.H * .5, '#ffffff', { align: 'center', outline: '#000' }); }); return; }
  if (H.menuOpen) r.overlay(g => { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#000010')); EF.heading(g, 'SESSION SETTINGS', r.W / 2, 16, 2); E.font.text(g, 'THE MATCH GOES ON: THE CPU HAS YOUR PLAYER', r.W / 2, 38, '#ffe08a', { align: 'center', outline: '#000' }); H.menu.draw(g); EF.footer(g, r, [['confirm', 'CHANGE'], ['cancel', 'BACK']]); });
};


/* ===== 43-saves.js ===== */
/* 43-saves: the save (versioned, with a migration): cup progress, stickers, unlocks, records, drills. Kept with
 * E.store and mirrored to the engine's autosave slot (game.saves) after each cup round. Stickers are earned by events. */
const SAVE_V = 1;
const freshSave = () => ({ v: SAVE_V, cup: null, stickers: {}, unlocks: { balls: ['classic', 'orange'] }, records: { fastestCup: null, biggestWin: null, cupsWon: 0 }, drills: {}, lines: 0 });
EF.Save = {
  data: null,
  migrate(d) {
    if (!d || typeof d !== 'object') return freshSave();
    if (!d.v) { const n = freshSave(); if (d.round != null) n.cup = { round: d.round, results: d.results || [], flags: {} }; if (d.stickers) n.stickers = d.stickers; return n; }   // v0: a flat shape
    return Object.assign(freshSave(), d, { unlocks: Object.assign(freshSave().unlocks, d.unlocks || {}), records: Object.assign(freshSave().records, d.records || {}) });
  },
  load() { this.data = this.migrate(SESSION ? null : E.store.get('ef:save', null)); return this.data; },
  save() { if (SESSION) return; E.store.set('ef:save', this.data); try { if (this.data.cup && game.saves && game.saves.autosave) game.saves.autosave(); } catch (e) { /* storage blocked */ } },
  reset() { this.data = freshSave(); this.save(); },
  sticker(id, shiny) {
    const d = this.data, s = EF.get('sticker', id); if (!s) return false;
    const had = d.stickers[id]; if (had === 'shiny' || (had && !shiny)) return false;
    d.stickers[id] = shiny ? 'shiny' : true; this.save();
    EF.bus.emit('sticker', { id, name: s.name, shiny: !!shiny });
    if (LIVE.hud) LIVE.hud.toast('STICKER!', s.name + (shiny ? ' (SHINY)' : '')); else EF.pendingToasts.push(['STICKER!', s.name]);
    EF.sfx('shimmer');
    return true;
  },
  has(id) { return !!this.data.stickers[id]; },
  unlockBall(id) { const b = this.data.unlocks.balls; if (!b.includes(id)) { b.push(id); this.save(); EF.bus.emit('unlock', { id }); } }
};
EF.pendingToasts = [];
if (game.saves) {
  game.saves.write = () => ({ data: EF.Save.data, place: EF.Save.data.cup ? (EF.ROUNDS[EF.Save.data.cup.round] || {}).name || 'CUP RUN' : 'KIPPERTON', level: EF.Save.data.cup ? EF.Save.data.cup.round : 0 });
  game.saves.read = save => { if (save && save.data) { EF.Save.data = EF.Save.migrate(save.data); E.store.set('ef:save', EF.Save.data); } };
}
/* ---- stickers: 30 players, 6 crests, 5 stadiums, 5 shiny challenges, 5 specials ---- */
EF.initStickers = () => {
  for (const t of EF.all('team')) {
    for (const p of t.players) EF.def('sticker', 'p-' + p.id, { kind: 'player', ref: p.id, team: t.id, name: p.name, pos: p.pos, how: t.id === 'kipperton' ? 'In the squad from the start' : 'Play against ' + t.name });
    EF.def('sticker', 'c-' + t.id, { kind: 'crest', ref: t.id, team: t.id, name: t.name, how: t.id === 'kipperton' ? 'Your own club' : 'Play against ' + t.name });
  }
  for (const s of EF.all('stadium')) if (!s.training) EF.def('sticker', 's-' + s.id, { kind: 'stadium', ref: s.id, name: s.name, how: 'Play a match at ' + s.name });
  for (const c of EF.all('challenge')) EF.def('sticker', 'g-' + c.id, { kind: 'shiny', ref: c.id, name: c.title, how: "Gaffer's Challenge: " + c.title, shiny: true });
  EF.def('sticker', 'x-mags', { kind: 'special', ref: 'mags', name: 'MAGS MULLIGAN', how: 'Finish the prologue' });
  EF.def('sticker', 'x-keith', { kind: 'special', ref: 'keith', name: 'KIPPER KEITH', how: 'Tackle the pitch invader' });
  EF.def('sticker', 'x-barrytrev', { kind: 'special', ref: 'barry', name: 'BARRY & TREV', how: 'Hear 50 lines of commentary' });
  EF.def('sticker', 'x-bus', { kind: 'special', ref: 'bus', name: 'THE BUS', how: 'Score past the parked bus' });
  EF.def('sticker', 'x-loyal', { kind: 'special', ref: 'loyal', name: 'LOYAL KIPPER', how: 'Turn down the Baron' });
};
// stickers from what happens in matches
EF.bus.on('matchOver', ev => {
  if (SESSION || !ev.match || ev.match.o.attract) return;
  const m = ev.match;
  for (const t of m.teams) { EF.Save.sticker('c-' + t.id); for (const p of t.players) EF.Save.sticker('p-' + p.id); }
  EF.Save.sticker('s-' + m.st.id);
  const s = ev.summary, w = s.winner, gd = Math.abs(s.score[0] - s.score[1]);
  const kipSide = m.teams[0].id === 'kipperton' ? 0 : m.teams[1].id === 'kipperton' ? 1 : -1;
  if (kipSide >= 0 && w === kipSide && (!EF.Save.data.records.biggestWin || gd > EF.Save.data.records.biggestWin.gd)) { EF.Save.data.records.biggestWin = { gd, score: s.score.slice(), vs: m.teams[1 - kipSide].name }; EF.Save.save(); }
});
EF.bus.on('invaderTackled', ev => { if (ev.match && !ev.match.o.attract && ev.who === 'keith') EF.Save.sticker('x-keith'); });
EF.bus.on('busBeaten', ev => { if (ev.match && !ev.match.o.attract) EF.Save.sticker('x-bus'); });
EF.bus.on('line', ev => { if (!EF.Save.data || (ev.match && ev.match.o.attract)) return; EF.Save.data.lines = (EF.Save.data.lines || 0) + 1; if (EF.Save.data.lines >= 50) EF.Save.sticker('x-barrytrev'); });


/* ===== 50-teams.js ===== */
/* 50-teams: the clubs, formations, tactics, referees, super strikes and celebrations. All original. Adding a team is
 * adding an entry: its players, kits, crest, formation, tactic, chant and celebration. */
const pl = (id, name, num, pos, o) => Object.assign({ id, name, num, pos }, o);
const S = (pace, shoot, pass, tackle, skill, keep, weight, temper) => ({ pace, shoot, pass, tackle, skill, keep, weight, temper });
EF.def('team', 'kipperton', { name: 'KIPPERTON ATHLETIC', short: 'KIP', nick: 'THE KIPPERS', city: 'KIPPERTON', stadium: 'smokehouse', formation: '2-1-1', tactic: 'plucky', chant: 'kipperton', celebration: 'fishslap', manager: 'mags', crowd: { factor: 1 },
  kits: { home: { shirt: '#f08a24', color2: '#1c2a5a', pattern: 'hoops', shorts: '#1c2a5a', socks: '#f08a24' }, away: { shirt: '#eef0f4', color2: '#f08a24', pattern: 'sash', shorts: '#eef0f4', socks: '#1c2a5a' }, keeper: { shirt: '#3ac06a', color2: '#1a5a30', shorts: '#1a1a1a', socks: '#3ac06a', glove: '#f4f4f0' } },
  crest: { shape: 'shield', field: '#1c2a5a', ring: '#f08a24', charges: ['kipper', 'anchor'] }, tifo: 'KIPPER ARMY',
  players: [
    pl('crabb', 'WALLY CRABB', 1, 'GK', { build: 'bulky', size: 1.16, hair: 'bald', skin: '#e0b090', hairColor: '#c8c8c8', stats: S(55, 30, 55, 40, 20, 78, 80, 30), voice: { f0: 110, wave: 'pulse' }, bio: 'A part-time lighthouse keeper. Huge gloves.' }),
    pl('okafor', 'SANDRA OKAFOR', 4, 'DEF', { nick: 'THE HARBOUR WALL', build: 'bulky', size: 1.14, hair: 'short', skin: '#7a4a2a', hairColor: '#1a1210', stats: S(66, 45, 60, 88, 45, 10, 95, 40), voice: { f0: 190, wave: 'saw' }, bio: 'Barges like a trawler.' }),
    pl('nowak', 'AGGIE NOWAK', 6, 'MID', { build: 'heroic', size: 1.08, hair: 'ponytail', skin: '#f0c8a8', hairColor: '#e0b060', stats: S(74, 66, 90, 60, 70, 10, 55, 30), voice: { f0: 230, wave: 'saw' }, bio: 'The brains. Her grandmother never misses a game.' }),
    pl('tran', 'TOMMY TRAN', 7, 'FWD', { nick: 'TWINKLETOES', build: 'heroic', size: 1.04, hair: 'spiky', skin: '#e8c098', hairColor: '#1a1a1a', stats: S(95, 72, 70, 40, 92, 10, 45, 45), voice: { f0: 200, wave: 'pulse' }, bio: 'Step-overs for breakfast.' }),
    pl('pilchard', 'DAZ PILCHARD', 9, 'FWD', { captain: true, super: 'smoked-kipper', build: 'heroic', size: 1.12, hair: 'short', skin: '#f0c8a8', hairColor: '#5a3a22', stats: S(82, 90, 70, 45, 75, 10, 62, 50), voice: { f0: 150, wave: 'saw' }, celebration: 'fishslap', bio: 'Captain. Asked if Europe has chips.' })] });
EF.def('team', 'hoofington', { name: 'AFC HOOFINGTON', short: 'HOO', nick: 'THE HOOFERS', city: 'HOOFINGTON', stadium: 'smokehouse', formation: '2-2', tactic: 'routeone', chant: 'hoofington', celebration: 'twohands', crowd: { factor: .9 },
  kits: { home: { shirt: '#6a4a2a', color2: '#e8a830', pattern: 'stripes', shorts: '#3a2a1a', socks: '#e8a830' }, away: { shirt: '#e8a830', color2: '#6a4a2a', pattern: 'plain', shorts: '#e8a830', socks: '#6a4a2a' }, keeper: { shirt: '#3a3a3a', color2: '#e8a830', shorts: '#222', socks: '#3a3a3a', glove: '#e8a830' } },
  crest: { shape: 'roundel', field: '#6a4a2a', ring: '#e8a830', charges: ['boot'] }, tifo: 'HOOF IT!',
  players: [
    pl('stoppard', 'ALF STOPPARD', 1, 'GK', { build: 'bulky', size: 1.14, hair: 'short', skin: '#e8b898', hairColor: '#8a6a4a', stats: S(50, 40, 40, 40, 20, 66, 80, 40), bio: 'Long kicks only.' }),
    pl('hooper', 'GAZ HOOPER', 3, 'DEF', { build: 'bulky', size: 1.12, hair: 'bald', skin: '#f0c8a8', hairColor: '#aa8866', stats: S(60, 45, 45, 75, 30, 10, 85, 55), bio: 'Heads everything.' }),
    pl('dunstable', 'DUNCAN DUNSTABLE', 5, 'DEF', { build: 'bulky', size: 1.16, hair: 'short', skin: '#c89070', hairColor: '#2a1a10', stats: S(56, 40, 45, 78, 25, 10, 92, 60), bio: 'Weight 92. Mostly pies.' }),
    pl('lump', 'KEV LUMP', 8, 'FWD', { build: 'heroic', size: 1.08, hair: 'spiky', skin: '#f0c8a8', hairColor: '#c8a060', stats: S(70, 60, 50, 60, 40, 10, 70, 60), bio: '"Lump it!"' }),
    pl('needham', 'NORMAN NEEDHAM', 9, 'FWD', { nick: 'THE NODDER', captain: true, super: 'row-z', build: 'heroic', size: 1.14, hair: 'long', skin: '#e0b090', hairColor: '#4a3020', stats: S(66, 78, 50, 50, 45, 10, 80, 50), bio: 'Headers 95. Feet 40.' })] });
EF.def('team', 'pasapasa', { name: 'REAL PASAPASA', short: 'RPP', nick: 'LOS PASITOS', city: 'SOLERA', stadium: 'pasapasa', formation: '1-2-1', tactic: 'keepball', chant: 'pasapasa', celebration: 'flagdance', crowd: { factor: 1 },
  kits: { home: { shirt: '#f4f2ec', color2: '#9a7ad0', pattern: 'plain', shorts: '#f4f2ec', socks: '#9a7ad0' }, away: { shirt: '#9a7ad0', color2: '#f4f2ec', pattern: 'plain', shorts: '#6a4aa0', socks: '#f4f2ec' }, keeper: { shirt: '#e8d040', color2: '#3a3a3a', shorts: '#3a3a3a', socks: '#e8d040', glove: '#3a3a3a' } },
  crest: { shape: 'circle', field: '#f4f2ec', ring: '#9a7ad0', charges: ['sun', 'arrows'] }, tifo: 'OLE OLE',
  players: [
    pl('portero', 'PACO PORTERO', 1, 'GK', { build: 'heroic', size: 1.1, hair: 'short', skin: '#c89070', hairColor: '#1a1210', stats: S(60, 30, 70, 40, 40, 70, 60, 30) }),
    pl('rondo', 'RAFA RONDO', 4, 'DEF', { build: 'heroic', size: 1.08, hair: 'long', skin: '#d8a880', hairColor: '#2a1a10', stats: S(70, 50, 82, 72, 70, 10, 60, 35) }),
    pl('toque', 'TITO TOQUE', 6, 'MID', { build: 'heroic', size: 1.04, hair: 'short', skin: '#e0b090', hairColor: '#3a2418', stats: S(76, 60, 92, 55, 82, 10, 50, 30), bio: 'One touch, always.' }),
    pl('interior', 'IKER INTERIOR', 8, 'MID', { build: 'heroic', size: 1.06, hair: 'spiky', skin: '#d0a078', hairColor: '#1a1a1a', stats: S(78, 66, 88, 55, 80, 10, 52, 35) }),
    pl('pasarela', 'PEPITO PASARELA', 10, 'FWD', { captain: true, super: 'pasodoble', build: 'chibi', size: 1.14, hair: 'spiky', skin: '#e8c098', hairColor: '#2a1a10', stats: S(86, 80, 94, 40, 95, 10, 35, 40), bio: 'Tiny. Never loses the ball.' })] });
EF.def('team', 'stahlpresse', { name: 'SV STAHLPRESSE 04', short: 'SVS', nick: 'DIE PRESSEN', city: 'EISENHUTTE', stadium: 'stahlpresse', formation: '1-2-1', tactic: 'gegenpress', chant: 'stahlpresse', celebration: 'robot', crowd: { factor: 1.05 },
  kits: { home: { shirt: '#6a7078', color2: '#ff7a1a', pattern: 'halves', shorts: '#3a3e44', socks: '#ff7a1a' }, away: { shirt: '#ff7a1a', color2: '#3a3e44', pattern: 'plain', shorts: '#ff7a1a', socks: '#3a3e44' }, keeper: { shirt: '#2a8ad0', color2: '#1a1a1a', shorts: '#1a1a1a', socks: '#2a8ad0', glove: '#f0f0f0' } },
  crest: { shape: 'shield', field: '#6a7078', ring: '#ff7a1a', charges: ['cog', 'hammer'] }, tifo: 'STAHL!',
  players: [
    pl('mauer', 'MANNI MAUER', 1, 'GK', { build: 'bulky', size: 1.16, hair: 'short', skin: '#f0d0b0', hairColor: '#e0c080', stats: S(55, 30, 55, 40, 30, 74, 85, 30) }),
    pl('fleiss', 'FRANZI FLEISS', 2, 'DEF', { build: 'heroic', size: 1.08, hair: 'ponytail', skin: '#f0c8a8', hairColor: '#c86030', stats: S(84, 50, 70, 80, 55, 10, 65, 55), bio: 'Never stops running.' }),
    pl('umschalt', 'UWE UMSCHALT', 5, 'MID', { build: 'heroic', size: 1.08, hair: 'short', skin: '#e8c0a0', hairColor: '#6a4a2a', stats: S(80, 62, 78, 76, 62, 10, 70, 55) }),
    pl('jagd', 'JURGEN JAGD', 7, 'MID', { build: 'heroic', size: 1.06, hair: 'spiky', skin: '#f0c8a8', hairColor: '#1a1a1a', stats: S(86, 70, 70, 70, 66, 10, 60, 60), bio: 'The hunter.' }),
    pl('hammerschmidt', 'KLAUS HAMMERSCHMIDT', 9, 'FWD', { captain: true, super: 'hammerschlag', build: 'bulky', size: 1.2, hair: 'bald', skin: '#e8b898', hairColor: '#aa8866', stats: S(72, 88, 60, 66, 55, 10, 92, 60) })] });
EF.def('team', 'lucchetto', { name: 'AC LUCCHETTO', short: 'ACL', nick: 'THE PADLOCKS', city: 'CASTELFORTEZZA', stadium: 'lucchetto', formation: '2-1-1', tactic: 'catenaccio', chant: 'lucchetto', celebration: 'badgekiss', crowd: { factor: 1 },
  kits: { home: { shirt: '#7a1a2a', color2: '#c8ccd4', pattern: 'plain', shorts: '#c8ccd4', socks: '#7a1a2a' }, away: { shirt: '#c8ccd4', color2: '#7a1a2a', pattern: 'sash', shorts: '#7a1a2a', socks: '#c8ccd4' }, keeper: { shirt: '#1a1a1a', color2: '#e0e040', shorts: '#1a1a1a', socks: '#1a1a1a', glove: '#e0e040' } },
  crest: { shape: 'shield', field: '#7a1a2a', ring: '#c8ccd4', charges: ['padlock', 'laurel'] }, tifo: 'LA CHIAVE SIAMO NOI',
  players: [
    pl('riparo', 'ROCCO RIPARO', 1, 'GK', { build: 'heroic', size: 1.12, hair: 'long', skin: '#d8a880', hairColor: '#1a1210', stats: S(58, 30, 60, 40, 30, 80, 70, 40) }),
    pl('difesa', 'DINO DIFESA', 3, 'DEF', { build: 'bulky', size: 1.12, hair: 'short', skin: '#d0a078', hairColor: '#2a1a10', stats: S(64, 40, 60, 90, 40, 10, 80, 75) }),
    pl('marcatura', 'MARCO MARCATURA', 5, 'DEF', { build: 'heroic', size: 1.1, hair: 'short', skin: '#e0b090', hairColor: '#3a2418', stats: S(70, 40, 62, 86, 45, 10, 75, 70), bio: 'Man-marks your best player.' }),
    pl('fallo', 'FABIO FALLO', 7, 'MID', { build: 'heroic', size: 1.06, hair: 'spiky', skin: '#e8c098', hairColor: '#1a1a1a', stats: S(78, 60, 72, 66, 70, 10, 50, 90), bio: 'Goes down at the first touch.' }),
    pl('serratura', 'SALVATORE SERRATURA', 10, 'FWD', { captain: true, super: 'la-chiave', build: 'heroic', size: 1.1, hair: 'short', skin: '#d8a880', hairColor: '#1a1210', stats: S(86, 86, 70, 45, 80, 10, 60, 70) })] });
EF.def('team', 'opulence', { name: 'OLYMPIQUE OPULENCE', short: 'OPU', nick: 'LES MILLIARDAIRES', city: 'AURELIA', stadium: 'euphorium', formation: '1-2-1', tactic: 'galacticos', chant: 'opulence', celebration: 'helicopter', crowd: { factor: 1.3 }, boss: true,
  kits: { home: { shirt: '#e8c040', color2: '#141414', pattern: 'stripes', shorts: '#141414', socks: '#e8c040' }, away: { shirt: '#141414', color2: '#e8c040', pattern: 'plain', shorts: '#141414', socks: '#e8c040' }, keeper: { shirt: '#8a2ad0', color2: '#e8c040', shorts: '#141414', socks: '#8a2ad0', glove: '#e8c040' } },
  crest: { shape: 'shield', field: '#141414', ring: '#e8c040', charges: ['crown', 'coins'] }, tifo: 'MONEY TALKS',
  players: [
    pl('vault', 'GUNNAR VAULT', 1, 'GK', { nick: 'THE VAULT', boss: true, build: 'bulky', size: 1.55, hair: 'bald', skin: '#f0d0b0', hairColor: '#e0c080', stats: S(60, 30, 60, 40, 30, 90, 99, 40), bio: 'The boss keeper. Reach plus forty per cent.' }),
    pl('cash', 'CASPIAN CASH', 4, 'DEF', { build: 'heroic', size: 1.1, hair: 'long', skin: '#f0c8a8', hairColor: '#e8c870', stats: S(80, 60, 75, 82, 70, 10, 72, 50) }),
    pl('bling', 'BENTLEY BLING', 8, 'MID', { build: 'heroic', size: 1.08, hair: 'spiky', skin: '#8a5a3a', hairColor: '#e8c040', stats: S(84, 76, 86, 60, 90, 10, 60, 50) }),
    pl('sovereign', 'SERGEI SOVEREIGN', 11, 'MID', { build: 'heroic', size: 1.1, hair: 'short', skin: '#f0d0b0', hairColor: '#2a1a10', stats: S(96, 80, 72, 50, 84, 10, 62, 50) }),
    pl('dor', "MAXIMILIEN D'OR", 10, 'FWD', { captain: true, super: 'botte-dor', build: 'heroic', size: 1.14, hair: 'long', skin: '#e8c098', hairColor: '#e8c040', stats: S(90, 94, 84, 45, 92, 10, 65, 70), bio: 'Three Golden Boots. Vain.' })] });

/* ---- formations: base [u, v] per role; u from own goal (0) to theirs (1), v across ---- */
const R_DEF = { att: [.14, 0], def: [0, 0], pull: [.45, .55], uRange: [.08, .62] }, R_FWD = { att: [.18, 0], def: [-.12, 0], pull: [.5, .6], uRange: [.35, .95] };
const R_MID = (out) => ({ att: [.12, .06 * out], def: [-.12, -.04 * out], pull: [.55, .45], uRange: [.15, .85] });
EF.def('formation', '2-2', { roles: { GK: { base: [.03, .5], keeper: true }, DEFL: Object.assign({ base: [.22, .3] }, R_DEF), DEFR: Object.assign({ base: [.22, .7] }, R_DEF), FWDL: Object.assign({ base: [.6, .32] }, R_FWD), FWDR: Object.assign({ base: [.6, .68] }, R_FWD) }, drop: 'FWDR' });
EF.def('formation', '1-2-1', { roles: { GK: { base: [.03, .5], keeper: true }, DEF: Object.assign({ base: [.22, .5] }, R_DEF), MIDL: Object.assign({ base: [.42, .28] }, R_MID(-1)), MIDR: Object.assign({ base: [.42, .72] }, R_MID(1)), FWD: Object.assign({ base: [.64, .5] }, R_FWD) }, drop: 'MIDR' });
EF.def('formation', '2-1-1', { roles: { GK: { base: [.03, .5], keeper: true }, DEFL: Object.assign({ base: [.22, .32] }, R_DEF), DEFR: Object.assign({ base: [.22, .68] }, R_DEF), MID: Object.assign({ base: [.45, .5] }, R_MID(0)), FWD: Object.assign({ base: [.68, .5] }, R_FWD) }, drop: 'MID' });
EF.def('formation', '3-1', { roles: { GK: { base: [.03, .5], keeper: true }, DEFL: Object.assign({ base: [.16, .25] }, R_DEF), DEF: Object.assign({ base: [.13, .5] }, R_DEF), DEFR: Object.assign({ base: [.16, .75] }, R_DEF), FWD: Object.assign({ base: [.55, .5] }, R_FWD) }, drop: 'DEFL' });

/* ---- tactics ---- */
EF.def('tactic', 'plucky', { press: .55, pressers: 1, line: .45, width: .8, tempo: .7, passRisk: .5, shortBias: .8, longBall: .2, dribble: .45, skill: .4, shootRange: 200, shootBias: 1, foul: .2, dive: .05, gimmick: null });
EF.def('tactic', 'routeone', { press: .4, pressers: 1, line: .4, width: .85, tempo: .5, passRisk: .7, shortBias: .4, longBall: .6, dribble: .25, skill: .1, shootRange: 210, shootBias: 1.1, foul: .25, dive: .02, gimmick: 'routeone' });
EF.def('tactic', 'keepball', { press: .55, pressers: 1, line: .5, width: .6, tempo: .85, passRisk: .2, shortBias: .9, longBall: .05, dribble: .25, skill: .3, shootRange: 170, shootBias: .8, foul: .1, dive: .1, gimmick: 'keepball' });
EF.def('tactic', 'gegenpress', { press: .9, pressers: 2, line: .7, width: .8, tempo: 1, passRisk: .5, shortBias: .7, longBall: .2, dribble: .4, skill: .3, shootRange: 210, shootBias: 1.1, foul: .3, dive: .05, gimmick: 'gegenpress' });
EF.def('tactic', 'catenaccio', { press: .3, pressers: 1, line: .15, width: .7, tempo: .6, passRisk: .4, shortBias: .6, longBall: .35, dribble: .35, skill: .3, shootRange: 200, shootBias: 1, foul: .6, dive: .5, gimmick: 'catenaccio' });
EF.def('tactic', 'galacticos', { press: .6, pressers: 1, line: .55, width: .8, tempo: .85, passRisk: .5, shortBias: .7, longBall: .15, dribble: .7, skill: .8, shootRange: 220, shootBias: 1.2, foul: .2, dive: .15, gimmick: 'galacticos' });

/* ---- referees ---- */
EF.def('referee', 'haltwhistle', { name: 'ARTHUR HALTWHISTLE', strictness: 1.3, gullibility: .2, varHappy: .4, voice: { f0: 135, wave: 'saw' } });
EF.def('referee', 'patience', { name: 'PIERRE PATIENCE', strictness: .7, gullibility: .5, varHappy: .3, voice: { f0: 150, wave: 'pulse' } });
EF.def('referee', 'ironside', { name: 'INGRID IRONSIDE', strictness: 1.1, gullibility: .3, varHappy: .5, voice: { f0: 200, wave: 'saw' } });
EF.def('referee', 'severo', { name: 'SERGIO SEVERO', strictness: 1.2, gullibility: .7, varHappy: .9, voice: { f0: 120, wave: 'saw' } });

/* ---- super strikes ---- */
EF.def('super', 'smoked-kipper', { name: 'THE SMOKED KIPPER', path: 'wobble', trail: 'smoke', color: '#f08a24', ball: 'kipper' });
EF.def('super', 'row-z', { name: 'ROW Z RETURN', path: 'meteor', trail: 'fire', color: '#e8a830' });
EF.def('super', 'pasodoble', { name: 'EL PASODOBLE', path: 'zigzag', trail: 'stars', color: '#9a7ad0' });
EF.def('super', 'hammerschlag', { name: 'DER HAMMERSCHLAG', path: 'hammer', trail: 'sparks', color: '#ff7a1a' });
EF.def('super', 'la-chiave', { name: 'LA CHIAVE', path: 'around', trail: 'stars', color: '#c8ccd4' });
EF.def('super', 'botte-dor', { name: "LA BOTTE D'OR", path: 'split', trail: 'gold', color: '#e8c040', ball: 'gold' });
EF.def('super', 'rocket', { name: 'ROCKET!', path: 'rocket', trail: 'fire', color: '#ff5a2a' });

/* ---- celebrations ---- */
EF.def('celebration', 'kneeslide', { name: 'KNEE SLIDE', anim: 'kneeslide', euphoria: 8 });
EF.def('celebration', 'backflip', { name: 'BACKFLIP', anim: 'backflip', euphoria: 12 });
EF.def('celebration', 'cartwheel', { name: 'CARTWHEEL', anim: 'cartwheel', euphoria: 10 });
EF.def('celebration', 'aeroplane', { name: 'AEROPLANE', anim: 'aeroplane', euphoria: 8 });
EF.def('celebration', 'robot', { name: 'THE ROBOT', anim: 'robot', euphoria: 10 });
EF.def('celebration', 'shirt', { name: 'SHIRT OVER HEAD', anim: 'shirt', euphoria: 15, yellow: true });
EF.def('celebration', 'flagdance', { name: 'CORNER FLAG DANCE', anim: 'dance', euphoria: 10 });
EF.def('celebration', 'badgekiss', { name: 'BADGE KISS', anim: 'badgekiss', euphoria: 6 });
EF.def('celebration', 'helicopter', { name: 'HELICOPTER', anim: 'helicopter', euphoria: 12 });
EF.def('celebration', 'fishslap', { name: 'THE FISH SLAP', anim: 'fishslap', euphoria: 14 });
EF.def('celebration', 'twohands', { name: 'BOTH ARMS UP', anim: 'cheer', euphoria: 6 });
EF.def('celebration', 'cheer', { name: 'FIST PUMP', anim: 'cheer', euphoria: 5, hidden: true });


/* ===== 51-stadiums.js ===== */
/* 51-stadiums: each ground's name, time and weather, pitch, stands and skyline, crowd, lights, sponsor boards and
 * matchday events. The training ground is one too. */
EF.def('stadium', 'smokehouse', { name: 'THE SMOKEHOUSE', city: 'KIPPERTON', capacity: 3112, time: 'dusk', referee: 'haltwhistle', seed: 11,
  weather: { kind: 'rain', amount: .7, wind: .4 }, surface: 'wet', mud: [[.04, .5, 36], [.96, .5, 36]], puddles: 6,
  look: { grass: ['#3a7030', '#448038'], wear: .6, lines: '#e0e4d8', tiers: [12, 22, 32, 42], standSide: '#3a3a48', standTop: '#4a4a58', seats: ['#2a3a6a', '#f08a24'], boards: '#1c2a5a', apron: '#2e3238', sky: ['#1a1a3a', '#4a3050', '#c06040'], roof: 'corrugated' },
  skyline: [['chimney', .1, 70, { smoke: true }], ['chimney', .2, 90, { smoke: true }], ['harbour', .5, 30], ['lighthouse', .86, 110, { beam: true }], ['chimney', .7, 60, { smoke: true }]],
  crowd: { size: 600, home: .8 }, lights: { ambient: .6, flood: true, color: '#fff0d0' },
  boards: ["SMOKY JOE'S KIPPERS", 'GULL INSURANCE: WE COVER EVERYTHING', 'PIE-O-MATIC', 'KIPPERTON FISH OIL: IT POWERS THE LIGHTS'],
  events: ['seagull', 'floodlight', 'invader-keith'] });
EF.def('stadium', 'pasapasa', { name: 'ESTADIO PASAPASA', city: 'SOLERA', capacity: 48000, time: 'day', referee: 'patience', seed: 22,
  weather: null, surface: 'hard', mud: [], puddles: 0,
  look: { grass: ['#5a9a3a', '#6aac44'], wear: .1, lines: '#f4f4ec', tiers: [14, 27, 40, 53], standSide: '#e8e0d0', standTop: '#f4ecdc', seats: ['#f4f2ec', '#9a7ad0'], boards: '#6a4aa0', apron: '#b06a40', sky: ['#4a9ae8', '#8ac8f0', '#f0e8c0'], roof: 'terracotta' },
  skyline: [['palm', .08, 60], ['dome', .3, 90], ['hills', .55, 50], ['palm', .78, 70], ['palm', .92, 55]],
  crowd: { size: 1400, home: .75 }, lights: { ambient: 1, flood: false },
  boards: ['EUROPHORIA COLA', 'SOLERA SUNSCREEN FACTOR 90', 'PASAPASA PAELLA PALACE', 'TIKI TAKA TAXIS'],
  events: ['beachball'] });
EF.def('stadium', 'stahlpresse', { name: 'STAHLPRESSE ARENA', city: 'EISENHUTTE', capacity: 61000, time: 'night', referee: 'ironside', seed: 33,
  weather: { kind: 'snow', amount: .6, wind: .2 }, surface: 'snow', mud: [], puddles: 0, ballStyle: 'orange',
  look: { grass: ['#3a6a34', '#447a3c'], wear: 0, lines: '#ffffff', tiers: [16, 31, 46, 61], standSide: '#4a4e56', standTop: '#5a5e66', seats: ['#6a7078', '#ff7a1a'], boards: '#3a3e44', apron: '#e8ecf0', sky: ['#05060e', '#10142a', '#2a2a40'], roof: 'truss' },
  skyline: [['chimney', .12, 110, { glow: true, smoke: true }], ['mountains', .4, 80], ['chimney', .62, 90, { glow: true, smoke: true }], ['mountains', .85, 100]],
  crowd: { size: 1600, home: .8 }, lights: { ambient: .45, flood: true, color: '#e8f0ff' },
  boards: ['STAHLPRESSE: WE PRESS HARDER', 'EISENHUTTE BOLTS', 'HEAVY METAL INSURANCE', 'SNOW CHAINS 4 U'],
  events: ['invader-stag', 'floodlight'] });
EF.def('stadium', 'lucchetto', { name: 'STADIO LUCCHETTO', city: 'CASTELFORTEZZA', capacity: 38000, time: 'dusk', referee: 'severo', seed: 44, uneven: true,
  weather: null, fogSecondHalf: true, surface: 'grass', mud: [], puddles: 0,
  look: { grass: ['#3e7434', '#488240'], wear: .3, lines: '#e8e8dc', tiers: [14, 26, 38, 50], standSide: '#7a6a5a', standTop: '#8a7a6a', seats: ['#7a1a2a', '#c8ccd4'], boards: '#7a1a2a', apron: '#5a4a3a', sky: ['#2a1a3a', '#6a3a4a', '#d0806a'], roof: 'old' },
  skyline: [['walls', .15, 50], ['tower', .4, 110], ['cypress', .6, 60], ['cypress', .66, 70], ['walls', .85, 50]],
  crowd: { size: 1200, home: .85 }, lights: { ambient: .6, flood: true, color: '#fff0d8' },
  boards: ['CASTELFORTEZZA LOCKSMITHS', 'CATENACCIO CAPPUCCINO', 'PARK YOUR BUS HERE', 'PADLOCK PIZZERIA'],
  events: ['flaresmoke'] });
EF.def('stadium', 'euphorium', { name: 'THE EUPHORIUM', city: 'AURELIA', capacity: 99000, time: 'night', referee: 'haltwhistle', seed: 55,
  weather: null, surface: 'grass', mud: [], puddles: 0,
  look: { grass: ['#3a8a3a', '#46a046'], wear: 0, lines: '#ffffff', tiers: [16, 32, 48, 64], standSide: '#3a3020', standTop: '#c8a040', seats: ['#e8c040', '#141414'], boards: '#141414', apron: '#2a2418', sky: ['#04040c', '#120c28', '#3a1a4a'], roof: 'dome' },
  skyline: [['ribs', .2, 120], ['searchlight', .35, 100], ['ribs', .5, 140], ['searchlight', .68, 100], ['ribs', .8, 120]],
  crowd: { size: 1600, home: .5 }, lights: { ambient: .45, flood: true, color: '#fff8e0' }, jumbotron: true,
  boards: ['BULLION BANK: MONEY TALKS', 'EUROPHORIA COLA', 'GOLD-PLATED JET SKIS', 'AURELIA CAVIAR CO.'],
  events: ['drone', 'fireworks'] });
EF.def('stadium', 'rec', { name: 'KIPPERTON REC', city: 'KIPPERTON', capacity: 8, time: 'day', referee: 'haltwhistle', seed: 66, training: true,
  weather: null, surface: 'grass', mud: [[.5, .5, 30]], puddles: 2,
  look: { grass: ['#4a7a3a', '#527e40'], wear: .8, lines: '#d8dcd0', tiers: [10, 10, 10, 10], standSide: '#6a6a5a', standTop: '#7a7a6a', seats: ['#5a6a4a', '#6a7a5a'], boards: '#4a5a3a', apron: '#5a6a4a', sky: ['#8a9ab0', '#b0bccc', '#d8dce0'], roof: 'none' },
  skyline: [['seawall', .5, 20], ['lighthouse', .9, 90]],
  crowd: { size: 8, home: 1 }, lights: { ambient: .9, flood: false },
  boards: ['KIPPERTON REC', 'NO BALL GAMES (EXCEPT THIS ONE)'], events: [] });


/* ===== 52-story.js ===== */
/* 52-story: the Cup Run as data. The premise: a clerk at the Continental Federation typed KIPPERTON instead of
 * KINGSBRIDGE, and an invitation is an invitation. Five rounds, each with its beats (travel, tabloid, talk, team talk,
 * challenge, tunnel, match, result), the villain's offer before the final, and the Gaffer's Challenges. */
EF.ROUNDS = [
  { id: 'r1', name: 'QUALIFYING ROUND', opp: 'hoofington', stadium: 'smokehouse', referee: 'haltwhistle', challenge: 'header', city: 'kipperton',
    pre: { headline: 'THE LONG AND THE SHORT OF IT', sub: "Hoofington's aerial bombardment heads for Kipperton's puddles.", photo: 'needham' },
    talk: [['needham', "We don't pass, love. We 'oof."], ['mags', 'Heads up, all of you. Literally.']],
    win: { headline: 'KIP KIP HOORAY!', sub: 'Kippers through as Hoofington are left all at sea.' }, loss: { headline: 'BATTERED!', sub: 'Kipperton fried in their own chip pan.' },
    after: [['mags', 'Not bad. Not good. But not bad.'], ['trev', "A proper cold night, and they've warmed it up."]] },
  { id: 'r2', name: 'ROUND OF 16', opp: 'pasapasa', stadium: 'pasapasa', referee: 'patience', challenge: 'recover5', city: 'solera', postcard: "WISH YOU WERE HERE (IT'S HOT)",
    pre: { headline: 'PASS THE PARCEL', sub: 'Kippers must stop the passing masters... if they can find the ball.', photo: 'pasarela' },
    talk: [['pasarela', 'You will chase the ball until you are dizzy, little fishes.'], ['tran', 'Dizzy? I do forty step-overs before breakfast.']],
    win: { headline: 'SOLE-DESTROYING FOR SOLERA!', sub: 'The passing masters passed out.' }, loss: { headline: 'PASSED OUT', sub: 'Kippers spend ninety minutes chasing shadows.' },
    after: [['nowak', 'I counted. They made four hundred and twelve passes.'], ['mags', "And we made the goals. Football's a funny old game."]] },
  { id: 'r3', name: 'QUARTER-FINAL', opp: 'stahlpresse', stadium: 'stahlpresse', referee: 'ironside', challenge: 'nutmeg', city: 'eisenhutte', postcard: 'SNOW CHAINS ON. THREE OF THEM.',
    pre: { headline: 'PRESSED FOR TIME', sub: "The Steel Machine never stops running. Kipperton's bus barely starts.", photo: 'hammerschmidt' },
    talk: [['hammerschmidt', 'We run. You run. We run more.'], ['okafor', 'Run all you like, pet. You still have to get past me.']],
    win: { headline: 'KIPPERS MELT THE STEEL!', sub: 'Snowbound minnows hammer the hammers.' }, loss: { headline: 'CRUSHED', sub: 'Pressed flat in the Eisenhutte snow.' },
    after: [['tran', 'Did you see his face when it went through his legs?'], ['okafor', 'Did you see mine? Frozen solid.']] },
  { id: 'r4', name: 'SEMI-FINAL', opp: 'lucchetto', stadium: 'lucchetto', referee: 'severo', challenge: 'freekick', city: 'castelfortezza', postcard: 'THE CASTLE HAS SEVEN LOCKS. WE COUNTED.',
    pre: { headline: 'PADLOCK AND KEY', sub: "Can Kipperton crack Europe's meanest defence? Locksmiths on standby.", photo: 'serratura' },
    talk: [['serratura', 'Nobody scores against Lucchetto. Nobody. We lock the door and we eat the key.'], ['mags', "They'll dive, they'll moan, and if they go ahead they'll park the bus. Don't fall for any of it."]],
    win: { headline: 'THEY PARKED THE BUS - WE STOLE IT!', sub: 'Padlocks picked. Kippers in the final.' }, loss: { headline: 'LOCKED OUT', sub: 'Catenaccio clamps the Kippers.' },
    after: [['pilchard', 'Gaffer. Gaffer! We are in a European final!'], ['mags', "Calm down, Darren. Then don't calm down."]] },
  { id: 'r5', name: 'FINAL', opp: 'opulence', stadium: 'euphorium', referee: 'haltwhistle', challenge: 'super', city: 'aurelia', postcard: 'AURELIA: EVEN THE PIGEONS WEAR GOLD.', villain: true,
    pre: { headline: 'DAVID VS GOLDIATH', sub: 'Fish-oil floodlights meet the richest club on Earth.', photo: 'dor' },
    talk: [['dor', 'I have three Golden Boots. You have... boots.'], ['pilchard', 'Nice boots, though. Comfy.']],
    win: { headline: 'THE PLAICE TO BE: KIPPERS ARE KINGS OF EUROPE!', sub: 'Kingsbridge Albion have demanded a recount.' }, loss: { headline: 'SO CLOSE!', sub: 'Golden boys break Kipper hearts.' },
    after: [] }
];
EF.PROLOGUE = {
  tabloid: { headline: 'FISH OUT OF WATER!', sub: "Typo sends tiny Kipperton into the Europhoria Cup. 'Rules are rules,' shrugs the Federation.", photo: 'pilchard' },
  talk: [['mags', 'Right, you lot. Fourteen quid in the kitty, a minibus with three good tyres, and a letter that says EUROPE.'], ['pilchard', 'Gaffer, do they have chips in Europe?'], ['mags', 'They have EVERYTHING in Europe, Darren. Including teams that will eat us for breakfast.'], ['okafor', "Let 'em try. I've got an appetite and all."], ['mags', 'That is the spirit. First up, at home: AFC Hoofington. Route-one merchants. Keep your heads up.']],
  choices: ["LET'S PLAY", 'TRAINING FIRST']
};
EF.VILLAIN = {
  talk: [['baron', 'Mister Pilchard. Fifty million. A gold-plated jet ski. And all the caviar you can eat.'], ['pilchard', '...']],
  choices: ["I'M A KIPPER, MATE. ALWAYS.", '...DOES THE JET SKI COME IN ORANGE?'],
  loyal: [['baron', 'Pah! Loyalty. How very... cheap.'], ['mags', 'That is my boy.']],
  joke: [['pilchard', 'Only joking, Gaffer! Kipper till I die.'], ['mags', 'You nearly gave me a heart attack.']]
};
EF.ENDING = { tabloid: { headline: 'THE PLAICE TO BE!', sub: 'KIPPERS ARE KINGS OF EUROPE. Kingsbridge Albion have demanded a recount.', photo: 'pilchard' } };
EF.def('teamtalk', 'hairdryer', { name: 'HAIRDRYER', icon: 'hairdryer', desc: '+10% speed and tackling for 15 minutes. The referee is stricter.', lines: ['Get out there and TERRIFY them!', 'If you lose, you are walking home. All of you.', 'I want to see SPLINTERS!'] });
EF.def('teamtalk', 'arm', { name: 'ARM ROUND THE SHOULDER', icon: 'arm', desc: 'Stamina returns 25% faster. Euphoria starts at +15.', lines: ["Just enjoy it. Your mum's watching.", 'Whatever happens, there is a fish supper waiting.', 'You are already legends. Now go and prove it.'] });
EF.def('teamtalk', 'tactics', { name: 'TACTICS BOARD', icon: 'board', desc: 'Pick the formation. Passing 10% more accurate.', lines: ['Here is the plan. Arrows. Lots of arrows.', 'Triangles, people. Pass in triangles.', 'This magnet is you, Darren. Stay near the goal.'] });
/* ---- the Gaffer's Challenges: an event condition by a Kipperton player ---- */
EF.def('challenge', 'header', { title: 'SCORE A HEADER', test: (m, ev, st) => ev.type === 'goal' && ev.side === 0 && (ev.kind === 'header' || ev.kind === 'divingHeader') });
EF.def('challenge', 'recover5', { title: 'WIN THE BALL BACK 5 TIMES', test: (m, ev, st) => { if (ev.type === 'recover' && ev.side === 0) st.n = (st.n || 0) + 1; return (st.n || 0) >= 5; }, progress: st => (st.n || 0) + '/5' });
EF.def('challenge', 'nutmeg', { title: 'NUTMEG AN OPPONENT', test: (m, ev) => ev.type === 'nutmeg' && ev.side === 0 });
EF.def('challenge', 'freekick', { title: 'SCORE FROM A FREE KICK', test: (m, ev) => ev.type === 'goal' && ev.side === 0 && ev.kind === 'freekick' });
EF.def('challenge', 'super', { title: 'SCORE A SUPER STRIKE', test: (m, ev) => ev.type === 'goal' && ev.side === 0 && ev.super });
/* ---- chants (sung by the crowd engine) ---- */
EF.def('chant', 'kipperton', { bpm: 120, notes: [['KIP', 'G4', 1, 'i'], ['PER', 'G4', 1, 'e'], ['TON', 'C5', 2, 'o'], ['clap', '', .5], ['clap', '', .5], ['clap', '', 1]] });
EF.def('chant', 'hoofington', { bpm: 70, notes: [['HOOOOF', 'G2', 2, 'u'], ['HOOOOF', 'C3', 3, 'u']] });
EF.def('chant', 'pasapasa', { bpm: 110, notes: [['O', 'E5', 1, 'o'], ['LE', 'C5', 2, 'e'], ['O', 'E5', 1, 'o'], ['LE', 'C5', 2, 'e']] });
EF.def('chant', 'stahlpresse', { bpm: 130, notes: [['HEY', 'A4', 1, 'e'], ['.', '', 1], ['HEY', 'A4', 1, 'e'], ['.', '', 1], ['HEY', 'A4', 1, 'e'], ['clap', '', 1]] });
EF.def('chant', 'lucchetto', { bpm: 70, notes: [['MMM', 'A3', 1, 'u'], ['MMM', 'C4', 1, 'u'], ['MMM', 'E4', 2, 'o'], ['MMM', 'D4', 1, 'u'], ['MMM', 'C4', 2, 'u']] });
EF.def('chant', 'opulence', { bpm: 108, detune: 30, notes: [['clap', '', 1], ['.', '', 1], ['clap', '', 1], ['.', '', 1], ['DA', 'G4', 1, 'a'], ['DA', 'C5', 1, 'a'], ['DA', 'E5', 1, 'a'], ['DAA', 'G5', 2, 'a']] });


/* ===== 53-lines.js ===== */
/* 53-lines: the commentary pools. BARRY (play-by-play, excitable, puns) and TREV (deadpan, practical). Variables:
 * {$player} {$team} {$opp} {$score} {$minute} {$stadium} {$keeper} {$ref}. All original. */
const B = (text, reply, when) => ({ who: 'barry', text, reply: reply ? { who: 'trev', text: reply } : null, when });
const Tv = (text, reply, when) => ({ who: 'trev', text, reply: reply ? { who: 'barry', text: reply } : null, when });
const raining = m => m.st.weather && m.st.weather.kind === 'rain';
EF.lines('kickoff', [
  B("And we're underway at {$stadium}! Lovely evening for it, Trev.", "It's raining sideways, Barry.", raining), B("We are off! {$home} against {$away}, and the noise here is ridiculous!"), B('Here we go, here we go, here we GO!', 'You do that every week.'),
  B('The whistle goes and so do we! What a night at {$stadium}.'), Tv('Right. Let us see what they have got.', 'Not a lot of romance in you, Trev.'), B('Kick-off! The Europhoria Cup is alive!'),
  B('{$home} get us started. Ninety minutes of chaos coming up.', 'Ninety-odd. There is always stoppage time.'), B('The referee is {$ref}, and he has the whistle. Off we go!'), Tv('Pitch looks heavy. Somebody will end up in the mud.', 'Please let it be the referee.'),
  B('And they are away! Grab a pie, settle in, hold onto something.'), B('The ball is rolling! Well, it was. Now it is being kicked.'), Tv('Kick-off. Nobody panic.')]);
EF.lines('secondhalf', [B('Second half underway! Fresh legs, fresh hope.'), Tv('They will have had a word at half time. Possibly several.'), B('We go again! Forty-five minutes to decide it.', 'Plus stoppage. Always plus stoppage.'), B('The teams are back out. Did they have oranges, Trev?', 'Jelly babies these days, Barry.'), B('Here comes the second half, and here comes the drama!'), Tv('Same pitch, same ball, different story. Probably.'), B('Back underway! {$score} is the score, and anything can happen.'), B('Second half! The crowd have found their voices again.'), Tv('First ten minutes after the break. That is when things go wrong.'), B('Off we go again at {$stadium}!'), B('Restart! Nobody has touched the pies yet. That is how tense it is.'), Tv('Right. Concentrate.')]);
EF.lines('restart', [B('And we restart.'), B('Back to the centre circle, and away we go again.'), Tv('Here we go again.'), B('The game restarts. Hearts still racing.')]);
EF.lines('goal', [
  B('OH, YOU BEAUTY! {$player} has absolutely LEATHERED it!'), B('GET IN! Back of the net from {$player}!', 'Keeper had no chance. None. Nada. Zilch.'), B('{$team} lead, and the away end is a washing machine!'), B('GOAL! {$player}! That is going on the end-of-season DVD!', 'Do they still make DVDs, Barry?'),
  B('IT IS IN! {$player} with the finish of a lifetime!'), B('THE NET BULGES! {$team} score!', 'Shot was always going in. Saw it from the car park.'), B('{$player}! You cannot STOP that! Nobody can stop that!'), B('Oh, that is GLORIOUS! {$player} finds the corner!'),
  B('A GOAL! The roof has come off {$stadium}, and there is no roof!'), Tv('That is a goal. Good finish. Composed.', 'Composed? It nearly broke the net!'), B('{$player} SCORES! Somebody check on the keeper!'), B('WHAT A GOAL! It is {$score} and I have lost my headset!'),
  B('BOOM! {$player} with the thunderbolt!', 'Thunderbolt and lightning, very very frightening.'), B('That is the stuff of dreams for {$player}!'), Tv('Clinical. You do not see that every week.')]);
EF.lines('goalKip', [B('OH MY COD! KIPPERTON HAVE SCORED!'), B("That's a plaice in history for {$player}!"), B('THE KIPPERS! The Kippers have done it again!', 'Somebody smoke that and serve it on toast.'), B('Get the bunting out in Kipperton! {$player}!'), B('They will be dancing on the harbour wall tonight! GOAL!'), B('A KIPPERTON GOAL! Fourteen pounds in the kitty and a goal in Europe!', 'Thirteen. They bought a pie.'), B('HOLY MACKEREL! What a goal from {$player}!'), B('The fish-oil floodlights are flickering with joy! GOAL!'), B('Oh, I could weep. I could absolutely weep. GOAL, KIPPERTON!'), B('Reel it in, {$player}! REEL IT IN! What a goal!'), Tv('Kipperton. Scoring in Europe. I have seen it all now.'), B('That is not a goal, that is a FISH SUPPER for the soul!')]);
EF.lines('superGoal', [B('WHAT HAS HE DONE TO THAT BALL?!', "That's not football. That's sorcery."), B('A SUPER STRIKE! The laws of physics have left the stadium!'), B('I have never seen a ball do THAT! GOAL!', 'Neither has the keeper.'), B('UNSTOPPABLE! That ball had a mind of its own!'), Tv('I would like to see that again. Slowly. With a scientist.'), B('The crowd lifted that ball into the net! EUROPHORIA!'), B('That is the greatest goal ever scored! Possibly twice!'), B('It wobbled! It bent! It went IN!', 'Like my uncle at a wedding.'), B('Super strike! Supernatural! Super everything!'), B('Somebody call the Federation. That cannot be legal. GOAL!'), Tv('The goalkeeper is still looking for it.'), B('The ball went to the moon and came back with a goal!')]);
EF.lines('goldengoal', [B('GOLDEN GOAL! IT IS ALL OVER! {$player} WINS IT!'), B('Sudden death, and it is sudden JOY for {$team}!'), Tv('Golden goal. Brutal way to lose. Lovely way to win.'), B('THAT IS IT! THE NEXT GOAL WON IT AND IT HAS BEEN SCORED!'), B('Golden! Golden! GOLDEN! {$team} are through!')]);
EF.lines('owngoal', [B('Oh dear. Oh dear oh dear. Into his own net!', 'He will be sat at the back of the bus for that.'), B('An own goal! The {$opp} defender will want the ground to swallow him!'), Tv('Own goal. Happens to the best. Happened to me twice.'), B('Disaster! It has gone in off the wrong player!'), B('Calamity at the back! That is an own goal!', 'Somebody give him a hug.'), B('Oh no! He turned it into his own net! What a way to concede!'), Tv('Bad bounce. Worse decision.'), B('A gift! A wrapped gift with a bow on top!'), B('That is going in the blooper reel, sadly.'), B('Own goal! The crowd do not know whether to laugh or cry!'), Tv('He will want to watch that back. Then never again.'), B('Through his own keeper legs! Unlucky!')]);
EF.lines('woodwork', [B('DOINK! Off the woodwork!', 'You could hear that in the car park.'), B('OFF THE POST! So close for {$player}!'), B('It cannons off the bar! The goal frame is still shaking!'), B('Woodwork! {$player} is holding his head!', 'Inches. Football is a game of inches.'), B('CLANG! The post says no!'), Tv('Hit the frame. That is the keeper buying a lottery ticket tonight.'), B('OHHH! Off the upright!'), B('The crossbar has been rattled! Somebody tighten the bolts!'), B('Post and out! The agony!', 'He will see that one in his sleep.'), B('Off the woodwork again! The goal is cursed!'), Tv('That is the post doing the defending.'), B('BOING! Did you hear that? BOING!')]);
EF.lines('save', [B('What a save from {$keeper}!'), B('SAVED! {$keeper} gets a strong hand to it!', 'Strong wrists. You need strong wrists.'), B('Denied! The keeper is having a blinder!'), B('Oh, the keeper has pulled off a stunner!'), Tv('Good positioning, that. Made it look easy.', 'It was not easy, Trev! It was magnificent!'), B('Fingertips! He has tipped it away!'), B('SAVE! {$keeper} says not tonight!'), B('The keeper is a wall! A big gloved wall!'), Tv('Kept his shape. Kept his eyes open. Saved it.'), B('Parried! And it is scrambled away!'), B('What reactions! Like a cat! A big cat in gloves!', 'A cat in gloves would not catch much.'), B('He gets down brilliantly to save!'), B('Clawed away! {$keeper} earns his wages there!')]);
EF.lines('miss', [B('OHHH! Inches! INCHES!', "He'll see that one in his sleep."), B('Wide! {$player} has dragged it wide!'), B('Over the bar! That one is going into orbit!', 'Row Z. Lovely view from up there.'), B('Just past the post! The crowd were already celebrating!'), Tv('Should have hit the target. You have to make the keeper work.'), B('So close! The side netting fools half the crowd!'), B('Off target! {$player} cannot believe it!'), B('Skied it! Somebody fetch a ladder!'), B('Wide of the mark! Oh, that was a chance!', 'That was a sitter, Barry. A sitter.'), B('Ballooned over! The seagulls are scattering!'), Tv('Head over the ball. Every time. They never learn.'), B('Just wide! Agonising!')]);
EF.lines('header', [B('Rises like a salmon! A kipper, actually, but you get the idea.'), B('A big header from {$player}!'), B('Up he goes! What a leap!', 'Spring in his boots, that lad.'), B('He meets it with his forehead! Thwack!'), Tv('Good header. Eyes open, neck muscles. Textbook.'), B('A diving header! He has thrown himself at it!'), B('Head and shoulders above the rest! Literally!'), B('Bonk! Straight off the noggin!', 'Technical term, that.'), B('Towering header! The air traffic controllers are worried!'), B('He nods it goalward!'), Tv('You do not see many proper headers these days. Lovely.'), B('Off the head! Into the mixer!')]);
EF.lines('bicycle', [B('AN OVERHEAD KICK! ARE YOU KIDDING ME?!', 'I tried that once. Spent a week in traction.'), B('A BICYCLE KICK! Upside down and outrageous!'), B('He is horizontal! He is in the air! He is LEGEND!'), B('Scissor kick! The crowd have lost their minds!', 'And their pies.'), Tv('Bicycle kick. Do not try that at home. Or anywhere.'), B('Acrobatics! Gymnastics! Football!'), B('Overhead! Over the top! Over the moon!'), B('He has gone full circus with that one!'), B('A bicycle kick at {$stadium}! Book the open-top bus!'), Tv('Brave. Daft. Brave.'), B('He has flipped himself and the game upside down!'), B('That is the kind of thing you see in your dreams!')]);
EF.lines('volley', [B('On the volley! {$player} catches it sweetly!'), B('VOLLEY! Never let it touch the ground!', 'The grass will be offended.'), B('He has hit that on the full!'), B('A thumping volley!'), Tv('Lovely technique, that volley. Over the ball.'), B('First time! Bang!'), B('What a strike on the volley!'), B('Side-foot volley! Cheeky!', 'Cheeky is the word.'), B('He leathers it before it lands!'), B('A volley that would make a tennis player jealous!'), Tv('Hard to keep those down. He kept it down.'), B('Volleyed with venom!')]);
EF.lines('tackle', [B('Great tackle by {$player}!'), B('Wins it back! Superb!', 'Timing. It is all timing.'), B('Crunching! But fair! I think!'), Tv('That is how you tackle. Ball first.'), B('He has nicked it off his toes!'), B('Robbed! {$player} with the pickpocket!'), B('A clean tackle! The crowd love it!'), B('Dispossessed! Back the other way!'), Tv('Read it. Stepped in. Simple.', 'Simple for you, maybe.'), B('Snap! Ball won!'), B('He slides in and takes the ball cleanly!'), B('What a challenge!')]);
EF.lines('launch', [B("He's taken man, ball, and most of the grass!", "That's a booking in any country."), B('OH! He has been sent into orbit!'), B('That is a cartwheel! Not a voluntary one!'), B('Somebody call air traffic control! He is AIRBORNE!', 'Has he got a parachute?'), Tv('That will leave a mark. Several marks.'), B('Wipeout! Total wipeout!'), B('He has gone up like a firework!'), B('Flying! He is flying! Not on purpose!'), Tv('Late. Very late. Next week late.'), B('Down he goes, and up, and down again!'), B('That is a tackle you can see from space!'), B('Launched! Absolutely launched!')]);
EF.lines('foul', [B('Foul! The referee has seen that.'), B('Whistle! That was clumsy.', 'Clumsy is generous.'), Tv('Free kick. Fair decision.'), B('He has brought him down!'), B('Foul given! The crowd agree. Loudly.'), B('That is a foul all day long!'), Tv('Silly. Needless. Free kick.'), B('Oh, he has clattered him!', 'Clattered. Good word.'), B('A foul, and the players are not happy!'), B('{$ref} blows for a foul.'), Tv('You cannot do that. Well, you can, but you get a free kick against you.'), B('A cynical one, that!')]);
EF.lines('card', [B('The referee reaches for his pocket... and it is YELLOW!'), B('Booked! {$player} goes in the book!', 'He will have to be careful now.'), Tv('Yellow card. Deserved.'), B('Out comes the yellow!'), B('A caution for {$player}!'), B('Yellow! The referee is having none of it!'), Tv('He will be walking a tightrope now.'), B('In the book he goes!', 'It is a very full book tonight.'), B('A yellow card, and the protests begin!'), B('{$ref} flashes the yellow!'), Tv('Professional foul. Professional booking.'), B('Booking! The crowd whistle!')]);
EF.lines('red', [B('RED CARD! {$player} is OFF!', 'Early bath. Bring a rubber duck.'), B('It is RED! He is going! He is gone!'), B('Sent off! {$team} are down to four!'), Tv('Red card. Cannot argue. He will argue, though.'), B('Second yellow and that is RED!'), B('Off you go, son! Off you go!'), B('A straight red! The referee did not hesitate!', 'He never does. It is his favourite colour.'), B('The long walk... {$player} is sent packing!'), Tv('Down to four. That changes everything.'), B('Red card! Somebody has to leave the party!'), B('He is off! He is taking his shin pads with him!'), B('Dismissed! A disastrous moment for {$team}!')]);
EF.lines('dive', [B("Oh, he's gone down like a sack of spuds!", 'There was more contact at my wedding, Barry.'), B('And the referee buys it! Free kick!'), B('He went down very easily there!'), Tv('Theatrical. The Royal Shakespeare Company would be proud.'), B('A dive? A foul? The referee says foul!'), B('Down he goes! And he has won it!', 'Disgraceful. Effective, but disgraceful.'), B('He has gone down clutching his everything!'), B('The referee has fallen for it!'), Tv('He knew what he was doing there.'), B('Is it a foul? The referee thinks so!'), B('What a performance! Give the man an award!'), B('Down in a heap, and the whistle goes!')]);
EF.lines('simulation', [Tv('Yellow card for the amateur dramatics. Quite right.'), B('SIMULATION! Booked for diving!', 'Nobody within ten yards. Embarrassing.'), B('He dived! And the referee has seen right through it!'), B('Booked for a dive! The crowd boo him to the rafters!'), Tv('Diving. Booked. Good.'), B('Oh, that is a terrible dive! And a yellow card!'), B('No contact, no foul, but a booking!', 'And a boo. A big boo.'), B('The referee is not having it! Simulation!'), Tv('That will be on the internet by midnight.'), B('He went down like he had been shot by a sniper. Nobody near him!'), B('Booked for theatrics! The cheek of it!'), B('The dive of the season! And the booking of the season!')]);
EF.lines('var', [B('Here we go. VAR. Put the kettle on.', 'Put two on.'), B('The referee has his finger in his ear. VAR is looking at it.'), B('We have a VAR check. Everybody hold your breath.'), Tv('VAR. I am going to need a cushion.'), B('Hold on, hold on! VAR wants a look!'), B('The video referee is checking this one.', 'Somewhere in a van, a man is squinting.'), B('VAR CHECK! The longest seconds in football!'), B('The crowd are humming. VAR is reviewing.'), Tv('They will look at it from fourteen angles.'), B('Is it? Isn\'t it? VAR will decide!'), B('A VAR review! Tension!'), Tv('In my day we had a man with a flag and good eyesight.')]);
EF.lines('varStands', [B('The decision STANDS!'), B('VAR agrees! On we go!', 'Took long enough.'), Tv('Right call, eventually.'), B('Confirmed! The crowd explode!'), B('VAR says yes!'), B('It stands! The referee points!')]);
EF.lines('varOverturn', [B('OVERTURNED! No penalty!', 'There was nothing in it.'), B('VAR has changed its mind! No penalty!'), Tv('Soft. Very soft. Rightly overturned.'), B('The referee draws the box... and it is NO PENALTY!'), B('Overturned! The {$team} players cannot believe it!'), B('No penalty! VAR giveth and VAR taketh away!')]);
EF.lines('penalty', [B('PENALTY! The referee points to the spot!'), B('It is a penalty! {$team} have a huge chance!', 'Twelve yards. Just you and the keeper.'), Tv('Penalty. Clear as day.'), B('SPOT KICK! The crowd are on their feet!'), B('He has given a penalty!'), B('Penalty to {$team}!', 'Nerves of steel needed now.'), B('Down in the box, and it is a PENALTY!'), Tv('That is a penalty in every league in the world.'), B('The spot beckons!'), B('Penalty! Hearts are pounding in {$stadium}!'), B('A penalty, and the keeper is bouncing on his line!'), Tv('Pressure on the taker now.')]);
EF.lines('shootout', [B('PENALTIES! It has come down to penalties!', 'I cannot watch. I will watch.'), B('The shootout! Heroes and villains, coming right up!'), Tv('Shootout. A lottery, they say. It is not. It is nerve.'), B('Five each, and then sudden death!'), B('Here comes the drama! A penalty shootout!'), B('The cruellest way to lose! The sweetest way to win!')]);
EF.lines('shootoutGoal', [B('SCORED! Cool as you like!'), B('Into the corner! No chance for the keeper!'), Tv('Picked his spot. Hit it. Easy.'), B('It is in! The pressure is back on!', 'Buckets of nerve.'), B('He sends the keeper the wrong way!'), B('GOAL! Ice in his veins!')]);
EF.lines('shootoutMiss', [B('SAVED! The keeper guesses right!'), B('Missed! He has blazed it over!', 'Row Z again.'), Tv('Changed his mind on the run-up. Fatal.'), B('Off the post! Heartbreak!'), B('He has missed! The keeper is the hero!'), B('No! The keeper stands tall!')]);
EF.lines('super', [B('WHAT HAS HE DONE TO THAT BALL?!', "That's not football. That's sorcery."), B('SUPER STRIKE! Stand back, everybody!'), B('He is charging up! The ball is glowing!'), B('Here it comes! The SUPER STRIKE!', 'Somebody warn the keeper.'), Tv('I have no idea what is happening. I like it.'), B('The crowd have powered this one up!'), B('EUROPHORIA in his boots! Look at it go!'), B('This is not a shot, it is a weather event!'), Tv('In my day the ball just went straight.', 'This is not your day, Trev!'), B('The ball is on FIRE! Or something! Is that legal?'), B('Hold on to your hats! Hold on to your seats!'), B('A Super Strike! Physics has resigned!')]);
EF.lines('duelPerfect', [B("AND THE KEEPER'S GOT IT! FINGERTIPS! UNBELIEVABLE!"), B('PERFECT! He has caught the uncatchable!', 'Caught a comet. Barehanded.'), B('What a save! The Save Duel is won!'), Tv('Perfect timing. Perfect save.'), B('He has stopped a Super Strike! Is he human?!'), B('Clutched to his chest! The crowd go berserk!')]);
EF.lines('duelGood', [B('He gets a hand to it! Parried away!'), B('Pushed away! Just enough!', 'Enough is enough.'), Tv('Not clean. But it is out.'), B('A strong palm! The Super Strike is beaten off!'), B('Deflected! Wild scenes!'), B('He has repelled the Super Strike!')]);
EF.lines('duelMiss', [B('Too late! It is a Super Strike and it is IN!'), B('The keeper and the ball are BOTH in the net!', 'Someone untangle him.'), Tv('Mistimed it. Easy to say from up here.'), B('He went too early! Or too late! Either way: GOAL!'), B('No chance! The Save Duel is lost!'), B('Into the net, keeper and all!')]);
EF.lines('nutmeg', [B('Through the legs! He will hear about that in the canteen.'), B('NUTMEG! Oh, that is cheeky!', 'His mum will have seen that.'), B('Megs! Megs! MEGS!'), Tv('Cheeky. Very cheeky. Very good.'), B('Through his legs and away!'), B('A nutmeg! The crowd go OLE!'), B('He has gone right through him!', 'Like a draught through a door.'), B('Shoot the gap! Nutmeg!'), Tv('Legs too far apart. Basic mistake.'), B('Oh, the humiliation! Right through the legs!'), B('That is a nutmeg you can frame!'), B('Megged! Absolutely megged!')]);
EF.lines('skill', [B('Oh, the step-over! Showboating!'), B('Look at those feet! Look at them!', 'Size eleven. Quick for size eleven.'), B('A spin and he is away!'), B('Rainbow flick! Over his head! Unbelievable!'), Tv('Bit of flair. I approve. Quietly.'), B('Skills! He has got the skills!'), B('He has turned him inside out!'), B('Twinkle toes! Absolute twinkle toes!'), B('Ole! The crowd love that!', 'The defender does not.'), Tv('Showing off. Works, though.'), B('Ankles broken! Somebody call a physio!'), B('What a trick!')]);
EF.lines('europhoria', [B('EUROPHORIA! The crowd have lifted {$team} into another dimension!'), B('The tifo is up! The flares are lit! EUROPHORIA!', 'The fire brigade are on standby.'), B('Listen to that noise! {$team} are flying!'), Tv('When the crowd gets like this, the players run through walls.'), B('Europhoria! Every player is glowing! Literally glowing!'), B('Here we go! The crowd is the twelfth man and he is HUGE!'), B('The noise! The colour! The EUROPHORIA!', 'My ears are ringing, Barry.'), B('They have unleashed the crowd! Watch out, {$opp}!'), Tv('Momentum. You cannot buy it.', 'Unless you are Opulence.'), B('The whole stadium is bouncing!'), B('One super strike is unlocked! Somebody hit it!'), B('Pure, unfiltered EUROPHORIA!')]);
EF.lines('halftime', [B("That's the half-time whistle. Time for a pie, Trev?", 'Two pies, Barry.'), B('Half time! {$score} at {$stadium}!'), Tv('Half time. Some work to do in that dressing room.'), B('The referee blows for the break!', 'Somebody will get the hairdryer.'), B('Half time, and what a half!'), Tv('Forty-five gone. Forty-five to go.'), B('The players troop off. Oranges all round!'), B('Half time! I need a sit down. I am sitting down. I need another one.'), B('That is the break! Catch your breath, everybody!'), Tv('Tactically, it has been interesting. Chaotically, it has been very interesting.'), B('Half time and the crowd are still singing!'), B('Into the dressing rooms! What will be said in there?', 'Mostly swearing.')]);
EF.lines('fulltime', [B('FULL TIME! It is all over at {$stadium}!'), B('The final whistle! {$score}!', 'Fair result, that.'), Tv('Full time. Right. Pub.'), B('That is it! The referee calls time!'), B('It is over! What a match!'), B('Full time, and the players collapse!', 'They have given everything.'), B('The whistle blows! Celebrations for {$team}!'), Tv('Ninety minutes. Plenty to talk about.'), B('That is the end! I need a lie down!'), B('Full time! {$team} take it!'), Tv('Tired legs out there. Tired voice in here.'), B('FULL TIME! History is written!')]);
EF.lines('fulltimeKip', [B('They will be dancing on the harbour wall in Kipperton tonight!'), B('KIPPERTON WIN! The smokehouses of the north coast are glowing!', 'Fish suppers on the house.'), B('The Kippers do it! The minnows have bitten the big fish!'), Tv('Kipperton. Through. Unbelievable. Believe it.'), B('Full time and Kipperton are celebrating like they have won the lottery!'), B('A famous night for Kipperton Athletic!', 'Their bus has three good tyres and a fourth good night.')]);
EF.lines('bus', [B("They've only gone and LITERALLY parked the bus!", 'Has it got a ticket?'), B('A BUS! There is a BUS in front of the goal!'), Tv('Catenaccio. Taken to its logical conclusion.'), B('Lucchetto have parked the team bus in the goalmouth!', 'Handbrake on and everything.'), B('The bus is parked! Get round it, chip it, or blow it up!'), B('I have seen teams park the bus. I have never SEEN the bus!'), Tv('Shoot over it. Or round it. Not through it.'), B('Honk honk! The Padlocks have parked up!'), B('There is a coach in the six-yard box! An actual coach!', 'Their coach is driving it.'), B('The bus! THE BUS!'), Tv('Is that even in the rules?', 'I have checked. It is not NOT in the rules.'), B('Somebody call a traffic warden!')]);
EF.lines('busSmash', [B('THE BUS IS SMASHED! The windows are gone!'), B('A Super Strike straight through the bus! It is driving off!', 'Insurance will not cover that.'), B('They have broken the bus! Kipperton have broken the bus!'), Tv('That is one way to unlock a defence.'), B('The bus is reversing out of here at speed!'), B('BUS DESTROYED! The Padlocks are padlocked no more!')]);
EF.lines('refHit', [B('OH! It has hit the referee!', 'Occupational hazard.'), B('The referee is down! Flattened by the ball!'), Tv('Ref in the way. Again.'), B('Somebody check on {$ref}! He took that full in the face!'), B('The referee is the best defender on the pitch!'), B('Down goes the referee! The crowd cheer, which is unkind!')]);
EF.lines('crowdThrow', [B('Into the crowd! And a fan throws it back!'), B('That has gone into the stands!', 'The fan has a decent arm on him.'), Tv('No throw-ins here. The crowd does it.'), B('Lumped into the crowd! They give it back, eventually!'), B('A fan catches it! And chucks it back on!'), B('Row F has the ball. Row F returns the ball.')]);
EF.lines('block', [B('Blocked! Thrown his body in the way!'), Tv('Brave block, that. Took one for the team.'), B('It hits the defender and spins away!', 'Right in the midriff. Ouch.'), B('Charged down!')]);
EF.lines('advantage', [B('Advantage played! Good refereeing!'), Tv('Advantage. Sensible.'), B('Play on! The referee waves advantage!', 'He will come back to that.'), B('Advantage! The move continues!')]);
EF.lines('corner', [B('Corner kick.'), B('A corner! Big men forward!', 'Big men and Tommy.'), Tv('Corner. Get it in the mixer.'), B('Corner to {$team}!')]);
EF.lines('freekick', [B('Free kick in a dangerous area!'), B('Free kick! Who fancies this one?', 'Everyone fancies it. One gets to take it.'), Tv('Wall needs to be tight here.'), B('A free kick, and the wall is wobbling!')]);
EF.lines('replay', [B("Let's see that again..."), B('Here it is again, in glorious slow motion!'), Tv('Watch the movement here. Lovely.'), B('One more time! Just one more time!'), B('The replay! Look at it!'), Tv('Slowed down, it still looks fast.')]);
EF.lines('extratime', [B('EXTRA TIME! Golden goal! The next goal wins it!'), Tv('Extra time. Legs like jelly now.'), B('Golden goal extra time! Sudden death!', 'Sudden something, anyway.'), B('We go again! Next goal is the winner!')]);
EF.lines('goldenMoment', [B('GOLDEN MOMENT! Maximilien D\'Or has summoned Europhoria on his own!', 'Money cannot buy you love. It can buy you that.'), B('The Golden Moment! Opulence are glowing!'), Tv('Ridiculous. Absolutely ridiculous.')]);
EF.lines('event-seagull', [B('And a seagull has taken possession!', 'Better first touch than some I have seen.'), B('A seagull on the ball! Somebody shoo it!'), Tv('The gull is holding its position. Good discipline.'), B('The seagull is sat on the ball like it owns the place!', 'It probably does, round here.')]);
EF.lines('event-gullAway', [B('And the gull flaps off! Play on!'), Tv('Gull gone. Shame. It was our best player.'), B('Off it goes! Squawking!')]);
EF.lines('event-beachball', [B('A beach ball! There is a beach ball on the pitch!', 'Somebody brought their holiday.'), B('Inflatable chaos! A beach ball is in play!'), Tv('That will deflect a few.'), B('The crowd have lobbed a beach ball on! Lovely!')]);
EF.lines('event-invader-keith', [B('It is Kipper Keith! The mascot is on the pitch!', 'In a giant smoked fish costume.'), B('A pitch invader! It is Keith! Run, Keith!'), Tv('The stewards will catch him. Eventually. They are not fast.'), B('Kipper Keith is doing laps! Somebody tackle that fish!')]);
EF.lines('event-invader-stag', [B('The Steel Stag is on the pitch! Antlers and all!'), B('A pitch invader in a stag costume!', 'Hope it is a costume.'), Tv('Stewards in pursuit. Hi-vis everywhere.'), B('The Stag is galloping across the pitch!')]);
EF.lines('event-tackled', [B('TACKLED! The invader is down! What a challenge!', 'Best tackle of the night.'), B('Somebody has taken the mascot out! The crowd love it!'), Tv('Clean tackle. On a fish.')]);
EF.lines('event-floodlight', [B('The floodlights have gone! We are in the dark!', 'Somebody feed the meter.'), B('Lights out! The fish-oil generator has given up!'), Tv('Can they see the ball? Can anyone?'), B('Darkness at {$stadium}! Only the ball is glowing!')]);
EF.lines('event-flaresmoke', [B('Red smoke drifting across the pitch from the curva!', 'Atmospheric. And slightly toxic.'), B('The flares are lit and the smoke is everywhere!'), Tv('Hard to see in that. Hard to breathe as well.'), B('The curva has filled the place with smoke!')]);
EF.lines('event-drone', [B('A camera drone buzzing overhead!', 'Watch your heads.'), Tv('There is a drone. It is better positioned than their midfield.'), B('The drone gets a lovely aerial shot!')]);
EF.lines('event-fireworks', [B('Fireworks over the Euphorium!', 'Somebody has more money than sense.'), B('Look at that sky! Fireworks!'), Tv('Bangs. Lots of bangs.')]);
EF.lines('weather-rain', [Tv('Proper weather, this. Separates the men from the boys. And the boys from their boots.'), B('The rain is coming down in sheets!', 'Big sheets. King size.'), Tv('Wet ball. Skids off the surface. Shoot low.'), B('Puddles everywhere! Somebody bring a mop!')]);
EF.lines('weather-snow', [B('The snow is falling, and the orange ball is out!', 'Very festive.'), Tv('Cold. My fingers are cold. My nose is cold.'), B('A winter wonderland at {$stadium}!'), Tv('Snow slows the ball down. Pass it harder.')]);
EF.lines('weather-fog', [B('The fog is rolling in! Can anybody see anything?', 'I can see you, Barry. Sadly.'), Tv('Use the radar. That is what it is for.'), B('Pea soup! Thick pea soup!')]);
EF.lines('idle', [B('{$score}, and it is end to end stuff.'), Tv('Midfield is a bit congested.', 'Like the ring road at five.'), B('What a cup run this has been for both sides!'), Tv('You want a bit more width from {$team}.'), B('The atmosphere at {$stadium} is electric!'), B('I had a pie before kick-off, Trev.', 'I know. I can smell it.'), Tv('Keep the ball. Simple as that.'), B('{$minute} minutes gone.'), B('The fans are in fine voice tonight!'), Tv('Somebody needs to take control of this game.'), B('Lovely stadium, {$stadium}. I came here on my holidays once.', 'Was it raining?'), B('This is why we love football, Trev.', 'Is it?'), Tv('Tired legs starting to show.'), B('Both sides going for it!'), B('The Europhoria Cup! Is there anything better?', 'A nap.'), Tv('The referee is letting it flow. I like that.'), B('Every pass, every tackle, the crowd are with them!'), Tv('Concentration. That is what wins these.')]);
EF.lines('pa', [{ who: 'pa', text: "Would the owner of a minibus with three wheels please return to it. It is rolling." }, { who: 'pa', text: "Today's attendance: a lot. Thank you for coming." }, { who: 'pa', text: 'Lost child at the pie stand. He says he is not lost, he is hungry.' }, { who: 'pa', text: 'Please do not feed the seagulls. They are already overpaid.' }, { who: 'pa', text: 'Tonight\'s match ball is sponsored by somebody. Thank you, somebody.' }, { who: 'pa', text: 'Would Mister Keith please take off the fish costume and return to his seat.' }, { who: 'pa', text: 'The half-time draw has been won by ticket number seven. Again.' }, { who: 'pa', text: 'Reminder: the flares are for the tifo only. Please stop cooking sausages on them.' }, { who: 'pa', text: 'A white van is parked across the exit. It is blocking a bus. A team bus.' }, { who: 'pa', text: 'Please keep the gangways clear. The Mexican wave needs room.' }, { who: 'pa', text: 'Pies are now half price. They were never full price.' }, { who: 'pa', text: 'Would the referee\'s mum please stop shouting. He can hear you.' }, { who: 'pa', text: 'The away fans are reminded that the home fans are louder. Thank you.' }, { who: 'pa', text: 'Your man of the match vote closes in ten minutes. It is already Daz.' }, { who: 'pa', text: 'Kipperton Fish Oil: it powers the floodlights. Mostly.' }, { who: 'pa', text: 'Lost: one shin pad. Found: one shin pad. Please collect.' }, { who: 'pa', text: 'A reminder that the drone is not ours. We do not know whose it is.' }, { who: 'pa', text: 'Stewards to the main stand. Somebody has started a conga.' }, { who: 'pa', text: 'The tea urn is fixed. Repeat: the tea urn is fixed.' }, { who: 'pa', text: 'Car park C is full. Car park D does not exist. Please stop looking for it.' }]);


/* ===== 90-start.js ===== */
/* 90-start: the About data, content validation, game.debug (the tests' and tools' handle), test hooks, the dev panel
 * wrapped round every scene, and the start: a hub session connects; otherwise the title (or the deep link). */
EF.ABOUT = EF_ABOUT || { sourceInformation: {}, testingFeedback: [], engineFeedback: [], promptFeedback: [] };
/** every reference between entries, every text the font must draw, the pools' sizes; problems go to game.fail */
EF.validate = () => {
  const P_ = [], ok = s => /^[\x20-\x7E]*$/.test(s);
  for (const t of EF.all('team')) {
    if (!EF.get('stadium', t.stadium)) P_.push('team ' + t.id + ': stadium ' + t.stadium);
    if (!EF.get('formation', t.formation)) P_.push('team ' + t.id + ': formation');
    if (!EF.get('tactic', t.tactic)) P_.push('team ' + t.id + ': tactic');
    if (!EF.get('chant', t.chant)) P_.push('team ' + t.id + ': chant');
    if (!EF.get('celebration', t.celebration)) P_.push('team ' + t.id + ': celebration');
    if (t.players.length !== 5) P_.push('team ' + t.id + ': 5 players');
    if (t.players.filter(p => p.captain).length !== 1) P_.push('team ' + t.id + ': one captain');
    if (t.players.filter(p => p.pos === 'GK').length !== 1) P_.push('team ' + t.id + ': one keeper');
    for (const p of t.players) { if (p.captain && !EF.get('super', p.super)) P_.push('captain ' + p.id + ': super'); if (!ok(p.name)) P_.push('font: ' + p.name); }
  }
  for (const s of EF.all('stadium')) for (const e of s.events || []) if (!EF.get('event', e)) P_.push('stadium ' + s.id + ': event ' + e);
  for (const R of EF.ROUNDS) { if (!EF.get('team', R.opp) || !EF.get('stadium', R.stadium) || !EF.get('challenge', R.challenge) || !EF.get('referee', R.referee)) P_.push('round ' + R.id); for (const [w] of R.talk) if (!EF.speakerName(w)) P_.push('speaker ' + w); }
  for (const l of EF.all('lines')) for (const e of l.list) { if (!ok(e.text) || (e.reply && !ok(e.reply.text))) P_.push('font in lines ' + l.id); if (!EF.SPEAKERS[e.who] && e.who !== 'pa') P_.push('speaker ' + e.who); }
  for (const s of EF.all('sticker')) if (!ok(s.name)) P_.push('font: sticker ' + s.id);
  if (P_.length) game.fail('content', new Error(P_.join('; ')));
  return P_;
};
EF.lineCount = () => EF.all('lines').reduce((a, l) => a + l.list.length + l.list.filter(e => e.reply).length, 0);
/* ---- the handle tests and tools read ---- */
game.debug = {
  snapshot() {
    const m = LIVE.m, sc = game.scene || {};
    return { scene: game.sceneName, part: sc.step != null ? sc.step : sc.phase || null, mode: m ? m.mode : null, half: m ? m.half : null, clock: m ? +m.clock.toFixed(2) : null, minute: m ? Math.floor(m.minute) : null, stoppage: m ? m.stoppage : null,
      score: m ? m.score.slice() : null, ball: m ? [Math.round(m.ball.x), Math.round(m.ball.y), Math.round(m.ball.z)] : null, owner: m && m.owner ? m.owner.data.name : null,
      humans: m ? m.slots.map(sl => sl.f ? { p: sl.i, id: sl.f.id, name: sl.f.data.name, x: Math.round(sl.f.body.x), y: Math.round(sl.f.body.y), state: sl.f.state } : null) : [],
      euphoria: m ? m.euph.map(Math.round) : null, europhoria: m ? m.euroT.map(v => +v.toFixed(1)) : null, cards: m ? m.cards.length : 0, sentOff: m ? m.players.filter(f => f.sentOff && f.state !== 'gone').length : 0,
      setpiece: m && m.sp ? m.sp.kind : null, shootout: m && m.so ? m.so.score.slice() : null, stadium: m ? m.st.id : null, weather: game.weather ? game.weather.kind : null,
      cup: EF.Save.data && EF.Save.data.cup ? { round: EF.Save.data.cup.round, results: EF.Save.data.cup.results.length } : null,
      attract: { active: game.sceneName === 'attract', segment: game.sceneName === 'attract' && sc.seg != null ? EF.ATTRACT_SEGS[sc.seg].id : null, idle: +EF.idle.t.toFixed(2) },
      dev: { open: EF.Dev.isOpen, changed: EF.tuneChanged().length }, hub: { active: SESSION, role: EF.Hub.role, sent: EF.Hub.sent, received: EF.Hub.received },
      ui: { focus: sc.menu ? sc.menu.i : null }, errors: game.errors.length };
  },
  teleport(x, y, z = 0) { const m = LIVE.m, f = m && m.slots[0] && m.slots[0].f; if (f) { f.body.x = x; f.body.y = y; f.body.z = z; } }
};
/* ---- test hooks ---- */
EF.test = {
  startMatch(o = {}) { game.go('match', Object.assign({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse', seed: 1, draws: 'allowed' }, o), { fade: 0 }); game.advance(1 / 60); return LIVE.m; },
  giveBall(side, idx, x, y) { const m = LIVE.m, f = m.side[side][idx]; m.mode = 'play'; m.sp = null; if (x != null) { f.body.x = x; f.body.y = y; } m.takeBall(f); return f; },
  place(id, x, y) { const f = LIVE.m.players[id]; f.body.x = x; f.body.y = y; },
  setEuphoria(side, v) { LIVE.m.euph[side] = v; },
  simUntil(pred, max = 60) { let t = 0; while (t < max && !pred()) { game.advance(1 / 60); t += 1 / 60; } return t < max; },
  cheat(name, on = true) { EF.Dev.set(name, on); }
};
/* ---- the dev panel over every scene, the touch-only and hub wrappers ---- */
for (const [id, sc] of Object.entries(EF.scenes)) {
  const up = sc.update, dr = sc.draw;
  sc.update = function (dt) {
    EF.mouseEndStepPending = true;
    if (EF.pendingToasts.length && LIVE.hud) for (const [a, b] of EF.pendingToasts.splice(0)) LIVE.hud.toast(a, b);
    if (EF.Dev.update(dt)) { if (this.isMatch && !(EF.Dev.cheats.freeze && !EF.Dev.stepOnce)) { EF.Dev.syncSlots(true); up.call(this, dt); } else if (!this.isMatch) { /* menus wait */ } EF.mouseEndStep(); return; }
    up.call(this, dt);
    EF.mouseEndStep();
  };
  sc.draw = function (r) { dr.call(this, r); EF.Dev.draw(r); };
  if (SESSION) sc.pausable = false;
}
/* ---- boot ---- */
window.__EF = EF;
const startScene = () => {
  if (SESSION) return 'hubwait';
  const s = LINK.scene;
  if (s === 'dev' && LINK.part === 'anim') return 'animgallery';
  if (s && EF.scenes[s]) return s;
  return 'title';
};
game.start({ scenes: EF.scenes, scene: startScene(), boot: { title: 'EUROPHORIA FOOTBALL', steps: [
  ['Calling the squads', () => { EF.initSpeakers(); EF.initStickers(); }],
  ['Opening the sticker album', () => { EF.Save.load(); for (const st of EF.all('sticker')) if (st.team === 'kipperton' && !EF.Save.data.stickers[st.id]) EF.Save.data.stickers[st.id] = true; }],
  ['Checking the rule book', () => { EF.validate(); }]
] } });
if (LINK.dev && !SESSION) game.after(.2, () => EF.Dev.open());


})();
