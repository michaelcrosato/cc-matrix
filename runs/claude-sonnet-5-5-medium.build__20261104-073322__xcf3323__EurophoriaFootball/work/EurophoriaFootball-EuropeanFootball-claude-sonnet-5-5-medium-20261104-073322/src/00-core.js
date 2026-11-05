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
