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
