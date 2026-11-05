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
