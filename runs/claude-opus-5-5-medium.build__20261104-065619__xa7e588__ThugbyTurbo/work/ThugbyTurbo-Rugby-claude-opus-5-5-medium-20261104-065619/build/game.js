(() => {
'use strict';
const E = My3D2dge;
/* ==== 00-core.js ==== */
/* THUGBY TURBO: over-the-top arcade rugby sevens.
 * THE CORE LOOP: run at their line, pass it backwards, smash through or step round them, ground it over the line and kick
 * the conversion, while seven lunatics in the other colours try to flatten you, and the referee looks the other way.
 *
 * Layers: devices, AI brains, network intents, test scripts and the attract director all produce INTENTS (one per
 * on-field player per step); the MATCH SIMULATION reads only intents and writes only the match state; the PRESENTATION
 * (rigs, camera, HUD, effects, audio, commentary) reads only the state and the events it emits. */
const { px, clamp, lerp } = E;
const TT = {};
const TAU = Math.PI * 2, PI = Math.PI;

/* ---- config flags ---- */
TT.scenes = {};
TT.cfg = {
  present: typeof document !== 'undefined',   // rigs, particles, camera: off headless (tests turn them on)
  session: false,                              // inside an AI Hub session
  touchOnly: false
};

/* ---- geometry (world units; 16 a tile; display metres = units / 10.24, so the field is "100 m") ---- */
const T16 = 16;
const G = TT.G = {
  COLS: 86, ROWS: 48,
  X0: 176, X1: 1200, Y0: 96, Y1: 672, IN: 96, APRON: 48,
  CX: 688, CY: 384,
  POST: 29, BAR: 34, UPRIGHT: 120,
  M: 10.24
};
G.L22 = [G.X0 + 225, G.X1 - 225];
G.L10 = [G.CX - 102, G.CX + 102];
G.L5 = [G.X0 + 51, G.X1 - 51];
G.DEAD = [G.X0 - G.IN, G.X1 + G.IN];
G.BIN = { x: G.CX + 60, y: G.Y1 + 30 };
TT.metres = u => Math.round(u / G.M);

/* ---- the balance registry: every gameplay number the simulation reads (live, from the dev panel) ---- */
const TUNE_DEFS = [
  ['runSpeed', 'Run speed', 'Movement', 100, 60, 160, 5],
  ['turboMult', 'Turbo multiplier', 'Movement', 1.45, 1, 2.2, .05],
  ['turboTank', 'Turbo tank (s)', 'Movement', 3, 1, 8, .25],
  ['turboRegen', 'Turbo refill (/s)', 'Movement', .3, .05, 1, .05],
  ['accel', 'Acceleration', 'Movement', 850, 300, 2000, 50],
  ['passSpeed', 'Pass speed', 'Ball', 230, 120, 400, 10],
  ['catchBase', 'Catch chance', 'Ball', .95, .5, 1, .01],
  ['pressurePenalty', 'Catch pressure penalty', 'Ball', .12, 0, .4, .01],
  ['tackleRange', 'Tackle reach', 'Contact', 14, 8, 30, 1],
  ['tackleBase', 'Tackle success', 'Contact', .78, .3, 1, .01],
  ['bigHitCharge', 'Big hit charge time (s)', 'Contact', .7, .2, 2, .05],
  ['bigHitLaunch', 'Big hit launch', 'Contact', 1, .2, 3, .1],
  ['spillChance', 'Monster hit spill chance', 'Contact', .5, 0, 1, .05],
  ['fendWindow', 'Fend window (s)', 'Contact', .3, .05, .8, .05],
  ['fendBeat', 'Fend strength', 'Contact', .7, 0, 1, .05],
  ['sidestepPower', 'Sidestep power', 'Contact', 140, 40, 300, 10],
  ['sidestepEvade', 'Sidestep evade (s)', 'Contact', .25, .05, .6, .05],
  ['diveRange', 'Dive tackle reach', 'Contact', 30, 10, 60, 2],
  ['kickMax', 'Kick distance', 'Ball', 520, 200, 900, 20],
  ['windMult', 'Wind strength', 'Ball', 1, 0, 3, .1],
  ['bounceChaos', 'Oval bounce chaos', 'Ball', .6, 0, 1, .05],
  ['ruckTime', 'Ruck length (s)', 'Set pieces', 1.6, .5, 4, .1],
  ['mashWeight', 'Ruck mash weight', 'Set pieces', .05, .01, .12, .005],
  ['scrumPushWeight', 'Scrum push weight', 'Set pieces', .05, .01, .15, .005],
  ['hypeMult', 'Hype gain', 'Arcade', 1, 0, 3, .1],
  ['superTime', 'Super length (s)', 'Arcade', 4, 1, 10, .5],
  ['powerupEvery', 'Power-up every (s)', 'Arcade', 30, 5, 120, 5],
  ['hazardEvery', 'Hazard frequency', 'Arcade', 1, 0, 3, .1],
  ['aiReaction', 'CPU reaction (s)', 'CPU', .25, 0, 1, .05],
  ['aiAggression', 'CPU aggression', 'CPU', .5, 0, 1, .05],
  ['cpuMash', 'CPU mash rate (/s)', 'CPU', 9, 2, 20, 1],
  ['refRange', 'Ref sight range', 'Referee', 260, 60, 600, 10],
  ['refFov', 'Ref sight angle (rad)', 'Referee', 1.4, .4, 3.14, .05],
  ['sinBin', 'Sin bin (s)', 'Referee', 30, 5, 120, 5],
  ['halfLength', 'Half length (s)', 'Match', 120, 20, 600, 10],
  ['gameSpeed', 'Game speed', 'Match', 1, .25, 2, .05]
];
const TUNE = TT.TUNE = {
  defs: TUNE_DEFS.map(([key, label, group, value, min, max, step]) => ({ key, label, group, value, min, max, step })),
  base: {}, layers: {}, v: {},
  def(key) { return this.defs.find(d => d.key === key); },
  /** recompute the live values: base, then each layer (difficulty, match options) on top */
  _mix() { const v = Object.assign({}, this.base); for (const k in this.layers) Object.assign(v, this.layers[k]); for (const d of this.defs) this.v[d.key] = v[d.key]; },
  set(key, value) { const d = this.def(key); if (!d) return; this.base[key] = clamp(+value, d.min, d.max); if (this.layers.dev) delete this.layers.dev[key]; this._mix(); this.save(); },
  reset(key) { if (key) { const d = this.def(key); this.base[key] = d.value; } else for (const d of this.defs) this.base[d.key] = d.value; this._mix(); this.save(); },
  layer(name, values) { if (values) this.layers[name] = Object.assign({}, values); else delete this.layers[name]; this._mix(); },
  defaults() { const o = {}; for (const d of this.defs) o[d.key] = d.value; return o; },
  changed() { return this.defs.filter(d => Math.abs(this.base[d.key] - d.value) > 1e-9).map(d => d.key); },
  save() { if (TT.cfg.session) return; try { E.store.set('thugby:tune', this.changed().reduce((o, k) => (o[k] = this.base[k], o), {})); } catch (e) { /* storage blocked */ } },
  load() { let s = null; try { s = E.store.get('thugby:tune', null); } catch (e) { s = null; } for (const d of this.defs) this.base[d.key] = s && typeof s[d.key] === 'number' ? clamp(s[d.key], d.min, d.max) : d.value; this._mix(); }
};
for (const d of TUNE.defs) TUNE.base[d.key] = d.value;
TUNE._mix();

/* ---- the event bus: the simulation emits, everyone else listens ---- */
TT.bus = {
  h: {},
  on(name, fn) { (this.h[name] = this.h[name] || []).push(fn); return () => { this.h[name] = this.h[name].filter(f => f !== fn); }; },
  emit(name, data) {
    const l = this.h[name]; if (l) for (const f of l.slice()) try { f(data || {}, name); } catch (e) { if (TT.game) TT.game.fail('event ' + name, e); else throw e; }
    const a = this.h['*']; if (a) for (const f of a.slice()) try { f(data || {}, name); } catch (e) { if (TT.game) TT.game.fail('event *', e); else throw e; }
  }
};

/* ---- helpers ---- */
TT.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
TT.d2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
TT.angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
TT.segDist = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); };
TT.approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
TT.fmtClock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
TT.ascii = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '.');
/** a shuffle bag: draws each item once before repeating */
TT.bag = (items, rng) => { let left = []; return () => { if (!left.length) { left = items.slice(); for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; } } return left.pop(); }; };
TT.fxRng = E.rng(12345);
TT.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/* ==== 01-data.js ==== */
/* ---- CONTENT: teams, venues, power-ups, commentary, the Mega Cup's script, the drills (docs/DATA.md describes each) ---- */
const SKIN = { pale: '#f2cdb0', ruddy: '#e8a888', tan: '#d09a70', brown: '#a8714a', dark: '#6a4128' };
const ROLES = ['PROP', 'HOOKER', 'PROP', 'SCRUM-HALF', 'FLY-HALF', 'CENTRE', 'WING'];
const FORWARDS = [0, 1, 2];
// a player: [name, nickname, build, size, hair, hairColor, skin, hat|null, [SPD, POW, HND, KCK, TKL], extra]
const P_ = (name, nick, build, size, hair, hairColor, skin, hat, stats, extra) => ({ name, nick, build, size, hair, hairColor, skin, hat, stats: { SPD: stats[0], POW: stats[1], HND: stats[2], KCK: stats[3], TKL: stats[4] }, ...(extra || {}) });
TT.TEAMS = [
  { id: 'mud', name: 'MUDDINGTON MUDLARKS', short: 'MUD', city: 'Muddington',
    home: { cloth: '#4aa0e0', trim: '#5a3a1e', pants: '#3a2a1a', boot: '#1a1410' }, away: { cloth: '#e8dcc0', trim: '#4aa0e0', pants: '#3a2a1a', boot: '#1a1410' },
    crest: ['bird', '#4aa0e0', '#6a4422'], style: { aggression: .5, pass: .55, kick: .3, cheap: .1 }, diff: 0, voice: 1,
    players: [
      P_('Dougie McAllister', 'THE FRIDGE', 'bulky', 1.35, 'bald', '#5a3a22', SKIN.pale, { style: 'helmet', color: '#6a4422' }, [4, 9, 5, 3, 8], { captain: true }),
      P_('Kev Boatwright', 'GRAVY', 'bulky', 1.25, 'short', '#c8602a', SKIN.ruddy, { style: 'band', color: '#e8dcc0' }, [5, 8, 6, 3, 7]),
      P_('Sione Taufa', 'TINY', 'bulky', 1.42, 'short', '#1a1410', SKIN.brown, null, [4, 10, 4, 2, 8]),
      P_('Priya Nandakumar', 'POCKET ROCKET', 'heroic', 1.05, 'ponytail', '#1a1410', SKIN.brown, null, [8, 4, 9, 6, 6]),
      P_('Ffion Pritchard', 'BOOTS', 'heroic', 1.12, 'long', '#a0482a', SKIN.pale, null, [6, 5, 8, 9, 5]),
      P_('Marcus Odhiambo', 'THE BUS', 'heroic', 1.3, 'spiky', '#141010', SKIN.dark, null, [7, 8, 6, 4, 7]),
      P_('Jamie Whitlock', 'WHEELS', 'heroic', 1.1, 'spiky', '#f0d070', SKIN.pale, null, [10, 4, 7, 5, 4])] },
  { id: 'bad', name: 'BRAMBLEWICK BADGERS', short: 'BAD', city: 'Bramblewick',
    home: { cloth: '#24242a', trim: '#f0f0f0', pants: '#f0f0f0', boot: '#1a1a1e' }, away: { cloth: '#f0f0f0', trim: '#24242a', pants: '#24242a', boot: '#1a1a1e' },
    crest: ['badger', '#24242a', '#f0f0f0'], style: { aggression: .3, pass: .4, kick: .5, cheap: .05 }, diff: -1, voice: 2,
    players: [
      P_('Edna Pemberton', 'NAN', 'bulky', 1.25, 'short', '#c8c8c8', SKIN.pale, { style: 'helmet', color: '#e8dcc0' }, [3, 8, 6, 4, 8], { captain: true, hunch: .2 }),
      P_('Wilf Hollins', 'WILF', 'bulky', 1.2, 'short', '#6a4a2a', SKIN.ruddy, null, [4, 7, 5, 3, 6]),
      P_('Barnaby Pike', 'BARN DOOR', 'bulky', 1.38, 'bald', '#6a4a2a', SKIN.ruddy, null, [3, 9, 3, 2, 7]),
      P_('Pip Tanner', 'PIP', 'heroic', 1.0, 'spiky', '#c8602a', SKIN.pale, null, [7, 3, 7, 5, 5]),
      P_('Clementine Ashby', 'CLEM', 'heroic', 1.1, 'ponytail', '#f0d070', SKIN.pale, null, [5, 4, 7, 8, 4]),
      P_('Ollie Brock', 'BADGER', 'heroic', 1.25, 'short', '#1a1a1a', SKIN.tan, null, [6, 7, 5, 3, 6]),
      P_('Tilly Fenwick', 'TILLY', 'heroic', 1.08, 'long', '#1a1410', SKIN.pale, null, [8, 3, 6, 4, 4])] },
  { id: 'gul', name: 'PORT GRUMBLE GULLS', short: 'GUL', city: 'Port Grumble',
    home: { cloth: '#f4f4f0', trim: '#1fa89a', pants: '#1e2a50', boot: '#1a1a24' }, away: { cloth: '#1fa89a', trim: '#f4f4f0', pants: '#1e2a50', boot: '#1a1a24' },
    crest: ['gull', '#1fa89a', '#f4f4f0'], style: { aggression: .45, pass: .75, kick: .5, cheap: .1 }, diff: 0, voice: 3,
    players: [
      P_('Sal Pereira', 'SALTY', 'bulky', 1.32, 'short', '#1a1410', SKIN.tan, null, [4, 8, 5, 3, 7]),
      P_('Kenji Ito', 'KIPPER', 'bulky', 1.2, 'spiky', '#141010', SKIN.pale, null, [6, 7, 7, 3, 6]),
      P_('Mo Haddad', 'ANCHOR', 'bulky', 1.38, 'bald', '#1a1410', SKIN.tan, null, [4, 9, 4, 2, 8]),
      P_('Lulu Fairweather', 'LULU', 'heroic', 1.02, 'ponytail', '#c83a2a', SKIN.pale, null, [8, 4, 9, 6, 5]),
      P_('Jonty Swift', 'SILKY', 'heroic', 1.15, 'long', '#f0c040', SKIN.pale, { style: 'band', color: '#1fa89a' }, [7, 5, 9, 9, 4], { captain: true }),
      P_('Dexter Okoro', 'JET', 'heroic', 1.25, 'short', '#141010', SKIN.dark, null, [8, 7, 7, 4, 6]),
      P_('Bree Lindqvist', 'BREEZE', 'heroic', 1.1, 'long', '#f4ecd0', SKIN.pale, null, [10, 4, 8, 5, 4])] },
  { id: 'irn', name: 'FURNACE FORGE IRONSIDES', short: 'IRN', city: 'Furnace Forge',
    home: { cloth: '#3a3a44', trim: '#f07a1e', pants: '#18181c', boot: '#101012' }, away: { cloth: '#f07a1e', trim: '#3a3a44', pants: '#18181c', boot: '#101012' },
    crest: ['anvil', '#3a3a44', '#f07a1e'], style: { aggression: .85, pass: .35, kick: .25, cheap: .35 }, diff: 0, voice: 4,
    players: [
      P_('Grigor Petrov', 'THE KILN', 'bulky', 1.4, 'bald', '#1a1410', SKIN.tan, { style: 'helmet', color: '#f07a1e' }, [4, 10, 3, 2, 9]),
      P_('Rusty Nailor', 'RUSTY', 'bulky', 1.25, 'short', '#b0481e', SKIN.ruddy, { style: 'helmet', color: '#f07a1e' }, [5, 8, 5, 3, 8]),
      P_('Bertha Blunt', 'BIG BERTHA', 'bulky', 1.4, 'ponytail', '#141010', SKIN.pale, null, [4, 10, 4, 2, 9]),
      P_('Smudge Cole', 'SMUDGE', 'heroic', 1.05, 'spiky', '#141010', SKIN.ruddy, null, [7, 5, 7, 5, 6]),
      P_('Ingot Ingram', 'INGOT', 'heroic', 1.15, 'short', '#f0d070', SKIN.pale, { style: 'helmet', color: '#f07a1e' }, [6, 6, 7, 8, 6]),
      P_('Adaeze Okafor', 'ANVIL', 'bulky', 1.32, 'short', '#141010', SKIN.dark, null, [7, 9, 6, 3, 9], { captain: true }),
      P_('Flint Mackay', 'FLINT', 'heroic', 1.12, 'spiky', '#a8a8b0', SKIN.pale, null, [9, 6, 6, 4, 6])] },
  { id: 'meg', name: 'MEGACORP MAULERS', short: 'MEG', city: 'Megadome', locked: true,
    home: { cloth: '#e8c040', trim: '#5a2a8a', pants: '#3a1a5a', boot: '#1a1024' }, away: { cloth: '#5a2a8a', trim: '#e8c040', pants: '#3a1a5a', boot: '#1a1024' },
    crest: ['m', '#5a2a8a', '#e8c040'], style: { aggression: .7, pass: .6, kick: .45, cheap: .25, supers: 1 }, diff: 1, voice: 5,
    players: [
      P_('Brannigan', 'BIG UNIT', 'bulky', 2.0, 'bald', '#1a1410', SKIN.tan, { style: 'band', color: '#e8c040' }, [6, 12, 6, 3, 10], { captain: true, boss: true }),
      P_('Leverage Lou', 'LEVERAGE', 'bulky', 1.25, 'short', '#2a1a10', SKIN.pale, null, [6, 8, 7, 3, 7]),
      P_('Bonus Barrington', 'BONUS', 'bulky', 1.38, 'short', '#f0d070', SKIN.ruddy, null, [5, 9, 5, 2, 8]),
      P_('Synergy Jones', 'SYNERGY', 'heroic', 1.05, 'ponytail', '#8a4ad0', SKIN.brown, null, [9, 5, 9, 6, 6]),
      P_('Chad Sterling III', 'CHAD', 'heroic', 1.15, 'long', '#f0c040', SKIN.pale, null, [7, 6, 9, 10, 5]),
      P_('Vance Capitale', 'VANCE', 'heroic', 1.28, 'spiky', '#141010', SKIN.tan, null, [8, 8, 7, 5, 7]),
      P_('Hedge Fundsworth', 'HEDGE', 'heroic', 1.12, 'short', '#c8c8d0', SKIN.pale, null, [10, 5, 8, 6, 5])] }
];
TT.teamById = id => TT.TEAMS.find(t => t.id === id) || TT.TEAMS[0];

/* the cast off the pitch: portraits (and the referee on it); voices for the babble */
TT.CAST = {
  barry: { name: 'BARRY BELLOWS', o: { build: 'heroic', size: 1.1, hair: 'short', outfit: 'coat', colors: { coat: '#7a1a2a', cloth: '#f0f0f0', hair: '#8a6a4a', skin: SKIN.ruddy } }, voice: { wave: 'square', base: 330, rate: 1.2 } },
  ros: { name: 'ROS RUCKER', o: { build: 'heroic', size: 1.1, hair: 'short', outfit: 'coat', colors: { coat: '#1e2a50', cloth: '#e8e8e8', hair: '#b8b8c0', skin: SKIN.pale } }, voice: { wave: 'triangle', base: 220, rate: .9 } },
  gristle: { name: 'COACH GRISTLE', o: { build: 'bulky', size: 1.3, hair: 'bald', hat: { style: 'cap', color: '#6a5a3a' }, outfit: 'coat', colors: { coat: '#6a4a2a', cloth: '#d8c8a0', hair: '#a0a0a0', skin: SKIN.ruddy } }, voice: { wave: 'saw', base: 140, rate: .85, gravel: true } },
  nigel: { name: 'REF NIGEL BLEWITT', o: { build: 'heroic', size: 1.1, hair: 'short', outfit: 'shirt', sleeves: 'short', colors: { cloth: '#18181c', trim: '#3ac060', pants: '#18181c', boot: '#101010', hair: '#6a4a2a', skin: SKIN.pale } }, voice: { wave: 'pulse12', base: 260, rate: 1.1 } },
  dave: { name: 'BIG DAVE', o: { build: 'bulky', size: 1.35, hair: 'short', hat: { style: 'band', color: '#3a3a3a' }, outfit: 'coat', colors: { coat: '#e8e030', cloth: '#3a3a4a', hair: '#3a2a1a', skin: SKIN.ruddy } }, voice: { wave: 'triangle', base: 160, rate: .9 } },
  rupert: { name: 'SIR RUPERT GOLDBRICK', o: { build: 'heroic', size: 1.15, hair: 'short', hat: { style: 'crown', color: '#e8c040' }, outfit: 'coat', colors: { coat: '#5a2a8a', cloth: '#f0f0f0', hair: '#d8d8d8', skin: SKIN.pale } }, voice: { wave: 'square', base: 200, rate: .75 } },
  pa: { name: 'STADIUM PA', voice: { wave: 'square', base: 180, rate: 1, echo: true } }
};

/* ---- venues (one twist each) ---- */
TT.VENUES = [
  { id: 'park', name: 'MUDDINGTON PARK', time: 'day', weather: 'rain', rain: .7, wind: 0, hazard: 'mud', music: 'mud',
    grass: [70, 128, 56], stand: 'plank', standSide: '#6a4a32', standTop: '#8a6a48', sky: ['#7a8898', '#a8b4bc', '#c8ccc8'], skyline: 'hills',
    boards: ['THE MUDDY DUCK', 'PIES & PINTS', "BIG DAVE'S BUSES", 'CHANNEL THUD'] },
  { id: 'docks', name: 'PORT GRUMBLE DOCKS', time: 'dusk', weather: 'wind', rain: 0, wind: 1, hazard: 'chicken', music: 'shanty',
    grass: [64, 120, 60], stand: 'stone', standSide: '#7a7a80', standTop: '#9a9aa0', sky: ['#2a2048', '#c8504a', '#f0a050'], skyline: 'docks',
    boards: ['SEAGULL-PROOF CHIPS', 'KRAKEN INSURANCE', "GRUMBLE'S GRAVY", 'CHANNEL THUD'] },
  { id: 'furnace', name: 'THE FURNACE', time: 'night', weather: 'clear', rain: 0, wind: 0, hazard: 'flames', music: 'forge',
    grass: [52, 104, 50], stand: 'stone', standSide: '#2a2a32', standTop: '#3a3a44', sky: ['#08060c', '#2a0c0c', '#6a2010'], skyline: 'chimneys',
    boards: ['FORGEWORKS STEEL', 'TURBO TONIC', 'MEGA MEAT PIES', 'CHANNEL THUD'] },
  { id: 'dome', name: 'THE MEGADOME', time: 'night', weather: 'storm', rain: .9, wind: .3, hazard: 'lightning', music: 'mayhem',
    grass: [58, 116, 62], stand: 'stone', standSide: '#4a2a6a', standTop: '#e8c040', sky: ['#06040e', '#1a1030', '#3a2058'], skyline: 'city',
    boards: ['GOLDBRICK HOLDINGS', 'CHANNEL THUD', 'TURBO TONIC', 'MEGACORP'] }
];
TT.venueById = id => TT.VENUES.find(v => v.id === id) || TT.VENUES[0];

/* ---- power-ups thrown on by the crowd ---- */
TT.POWERUPS = {
  pie: { name: 'MEAT PIE', time: 6, line: 'Somebody\'s chucked a meat pie on the pitch!' },
  iron: { name: 'IRON SHOULDERS', time: 15, line: 'IRON SHOULDERS! He\'s a walking wardrobe!' },
  boot: { name: 'MEGA BOOT', time: 60, line: 'The MEGA BOOT! Stand well back!' },
  grease: { name: 'GREASE JERSEY', time: 8, line: 'Grease jersey! Slippery as a sardine!' },
  horn: { name: 'AIR HORN', time: 0, line: 'AIR HORN! The crowd\'s gone barmy!' }
};
TT.POWERUP_IDS = Object.keys(TT.POWERUPS);

/* ---- difficulty (the CPU's numbers; never its logic) ---- */
TT.DIFF = {
  Rookie: { aiReaction: .4, tackleBonus: -.12, cpuMash: 6, noise: .35, intercept: .5, scrumSigma: .25, early: .08, read: .25 },
  Pro: { aiReaction: .25, tackleBonus: 0, cpuMash: 9, noise: .2, intercept: 1, scrumSigma: .12, early: .03, read: .35 },
  Legend: { aiReaction: .14, tackleBonus: .08, cpuMash: 12, noise: .08, intercept: 1.5, scrumSigma: .06, early: 0, read: .45 }
};
TT.DIFF_ORDER = ['Rookie', 'Pro', 'Legend'];

/* ---- commentary: Barry (play-by-play) and Ros (colour) ---- */
TT.LINES = {
  kickoff: [['b', 'And we\'re underway at {$venue}!'], ['b', 'Big boot to get us going!'], ['r', 'Here we go. Mind the mud.'], ['b', 'Up it goes, and the crowd are on their feet!'], ['r', 'Somebody catch it. Anybody.'], ['b', 'KICK-OFF! Let the carnage commence!']],
  try: [['b', 'HE\'S GONE OVER! TRY TIME!'], ['b', 'Under the sticks! You could drive a bus through that gap!'], ['b', 'Dotted down! {$player}, take a bow!'], ['b', 'In at the corner! Somebody check the paint on that touchline!'], ['r', 'Textbook. If the textbook was written by a hurricane.'], ['b', 'TRY! {$team} are dancing!']],
  bigHit: [['b', 'OH, THAT\'S A BIG ONE!'], ['b', 'He\'ll feel that in the morning. And the morning after.'], ['b', 'Absolutely SHUDDERING!'], ['r', 'I felt that in my old knee, Barry.'], ['b', 'CRUNCH! Hear that from the car park!'], ['r', 'That\'s a lot of man arriving at once.']],
  monsterHit: [['b', 'MONSTER HIT! That\'s gone into orbit!'], ['b', 'Put him in Row Z!'], ['b', 'Somebody get that man a postcode, he\'s lost!'], ['r', 'He left his boots behind, Barry.'], ['b', 'SHUDDERING! Absolutely SHUDDERING!'], ['r', 'Air traffic control want a word.']],
  sidestep: [['b', 'Left him for dead!'], ['b', 'Feet like a ballroom dancer!'], ['r', 'Lovely footwork. Questionable haircut. Lovely footwork.'], ['b', 'Step! And step again!'], ['b', 'He\'s grabbed a handful of fresh air!'], ['r', 'That defender needs a sit down.']],
  fend: [['b', 'HAND-OFF! Right in the chops!'], ['b', 'He\'s fended him into next week!'], ['r', 'Stiff arm. Stiffer upper lip.'], ['b', 'Palmed off like a cold call!'], ['b', 'Get OFF me, says {$player}!'], ['r', 'Rude. Effective. Rude.']],
  dummy: [['b', 'Oh, the dummy! They\'ve bought it, the whole shop!'], ['r', 'Sold them a dummy and the extended warranty.'], ['b', 'Dummy! Nobody home!']],
  lineBreak: [['b', 'He\'s through! There\'s daylight!'], ['b', 'The line\'s been cut like a birthday cake!'], ['r', 'Somebody left the gate open.'], ['b', 'LINE BREAK! Run, {$player}, RUN!'], ['b', 'Open country ahead!'], ['r', 'That\'s a lot of green grass for one person.']],
  knockOn: [['b', 'Knock-on. Butter fingers.'], ['b', 'Dropped it like a hot pie!'], ['r', 'Hands like feet.'], ['b', 'Oh, it\'s gone forward off the hands!'], ['r', 'Somebody\'s greased that ball.'], ['b', 'Spilled! Scrum coming.']],
  forwardPass: [['b', 'Forward! The ref\'s not having that.'], ['r', 'Forward by a country mile, Barry.'], ['b', 'That\'s gone forward, he\'s blown it up!'], ['r', 'Backwards, lads. It\'s the one rule.']],
  turnover: [['b', 'JACKAL! He\'s pinched it!'], ['b', 'Turnover! Stolen like a pie at a buffet!'], ['r', 'Lovely thievery.'], ['b', 'They\'ve won it back at the breakdown!'], ['r', 'Somebody check his pockets.'], ['b', 'TURNOVER!']],
  scrum: [['b', 'Crouch... bind... SET! And they\'ve hit like freight trains!'], ['r', 'That scrum\'s going backwards, and so is their dignity.'], ['b', 'Big shove in the scrum!'], ['r', 'Six large people having a hug. Lovely.']],
  pushover: [['b', 'PUSHOVER TRY! They\'ve shoved them over the line like a wardrobe!'], ['r', 'Removal men. Professional removal men.']],
  lineout: [['b', 'He\'s been lifted so high he can see his house!'], ['b', 'Stolen at the lineout! Cheeky!'], ['r', 'Up he goes. Mind the floodlights.'], ['b', 'Clean ball off the top!']],
  convMade: [['b', 'Straight between the sticks!'], ['b', 'Bang! Two more!'], ['r', 'Never in doubt. Well. Slightly in doubt.'], ['b', 'Over! Sweet as a nut!']],
  convMiss: [['b', 'Wide! Hooked it like a fisherman.'], ['r', 'That\'s gone into the car park.'], ['b', 'Oh, pushed it wide!'], ['r', 'The posts were right there, Barry.']],
  doink: [['b', 'DOINK! Off the upright!'], ['r', 'The post says no.']],
  dropGoal: [['b', 'DROP GOAL! Cheeky, cheeky!'], ['r', 'Three points from nowhere.'], ['b', 'He\'s dropped it over! What a nerve!']],
  penalty: [['b', 'Penalty! The ref\'s arm is out!'], ['b', 'Advantage being played...'], ['r', 'The ref saw that one. Miracles happen.'], ['b', 'He\'s penalised them!']],
  advOver: [['b', 'Advantage over.'], ['r', 'Advantage over. Play on.']],
  cheapUnseen: [['b', 'Ooh... the ref\'s missed that one completely.'], ['b', 'What the ref doesn\'t see, Ros...'], ['r', '...is still assault, Barry.'], ['b', 'Behind his back! Cheeky!']],
  yellow: [['b', 'YELLOW CARD! Off to the sin bin, and I mean an actual bin!'], ['r', 'In the bin. Lid down. Think about it.'], ['b', 'He\'s been binned! Literally!']],
  red: [['b', 'RED CARD! Early bath!'], ['r', 'Off. And don\'t come back.']],
  refDown: [['r', 'THE REF\'S DOWN! Anything goes, Barry!'], ['b', 'Anything goes, Ros!'], ['b', 'They\'ve flattened the referee!']],
  onFire: [['b', 'HE\'S ON FIRE!'], ['b', 'Somebody call the fire brigade! Actually, don\'t, let it burn!'], ['r', 'Unstoppable. Possibly flammable.']],
  super: [['b', 'THUNDER RUN! Get out of the way!'], ['b', 'HURRICANE HIT INCOMING!'], ['r', 'Somebody\'s had the special sauce.']],
  powerup: [['b', 'Somebody\'s chucked a meat pie on the pitch!'], ['r', 'Is that... gravy?'], ['b', 'Here comes something from the crowd!']],
  chicken: [['b', 'It\'s CAPTAIN CLUCKY! The mascot\'s on the pitch again!'], ['r', 'That chicken has more caps than I do.']],
  flames: [['b', 'Mind the flames! That\'s a well-done winger!'], ['r', 'Toasted. Lightly buttered.']],
  lightning: [['b', 'Lightning strike! That\'s one way to clear a ruck!'], ['r', 'Somebody upstairs has opinions.']],
  mud: [['b', 'He\'s in the mud! Half man, half puddle!'], ['r', 'They\'ll never get that kit clean.']],
  hooter: [['b', 'There\'s the hooter! Ball has to go dead!'], ['r', 'Hooter\'s gone. Kick it out or keep it alive.']],
  half: [['b', 'Half-time here at {$venue}: {$score}.'], ['r', 'Oranges and orange cordial. Hold the oranges.']],
  full: [['b', 'FULL TIME! {$team} win it, {$score}!'], ['b', 'That\'s it! Somebody get the kettle on!'], ['r', 'Well. That happened.']],
  sudden: [['b', 'Golden point! Next score wins the lot!'], ['r', 'Sudden death. Hopefully not literally.']],
  intercept: [['b', 'INTERCEPTED! He\'s read that like a bedtime story!'], ['r', 'Picked off. Gift-wrapped.']],
  kickTouch: [['b', 'Found touch! Lovely boot!'], ['r', 'Into the stand. Somebody\'s got a souvenir.']],
  notStraight: [['b', 'Not straight! Squint as a pub darts board!'], ['r', 'He\'s thrown it to his cousin.']],
  ref: [['b', 'Hands away in the ruck!'], ['b', 'Offside! The ref\'s seen him!']]
};

/* ---- the Mega Cup: four rounds ---- */
TT.CUP = [
  { id: 'r1', name: 'ROUND ONE', opp: 'bad', venue: 'park' },
  { id: 'qf', name: 'QUARTER-FINAL', opp: 'gul', venue: 'docks' },
  { id: 'sf', name: 'SEMI-FINAL', opp: 'irn', venue: 'furnace' },
  { id: 'gf', name: 'GRAND FINAL', opp: 'meg', venue: 'dome' }
];
/* the script: [speaker, line]; speakers are cast ids or 'team:index' for a player (the portrait and voice are theirs) */
TT.STORY = {
  prologue: { set: 'pub', title: 'THE MUDDY DUCK', lines: [
    ['dave', 'So I\'m filling in the form, right. \'Mega Cup.\' I thought it was a tea thing.'],
    ['gristle', 'It\'s the TURBO SEVENS MEGA CUP, Dave. Live on Channel Thud. Against teams with dieticians.'],
    ['mud:0', 'We\'ve got a dietician.{w=.4} (He nods at the pie warmer.)'],
    ['mud:3', 'Is the pie warmer on the team sheet, coach?'],
    ['gristle', 'Gristle\'s Rule Number One: nobody laughs at the Mudlarks. Rule Number Two: we train. {shake}NOW.{/shake} Yes, you too, Dave.']],
    choices: ['TRAIN WITH GRISTLE', 'SKIP TO THE CUP'] },
  r1: { set: 'pitch', title: 'ROUND ONE: MUDDINGTON PARK', lines: [
    ['barry', 'Welcome to a damp Muddington Park, where the Mudlarks open their Mega Cup against the Bramblewick Badgers!'],
    ['ros', 'Damp is generous, Barry. I\'ve seen drier rivers.'],
    ['bad:0', 'I\'ve propped since before your dad had teeth, sonny. I\'ve had hip replacements tougher than you.'],
    ['gristle', 'She\'s seventy-four, lads. Do NOT go easy on her. {shake}She bites.{/shake}']],
    half: 'Rule Three: hold the ball. Rule Four: see Rule Three.',
    won: [['barry', 'The Mudlarks are through! Ros, are they any good?'], ['ros', 'They\'re... present, Barry.']] },
  qf: { set: 'pitch', title: 'QUARTER-FINAL: PORT GRUMBLE DOCKS', lines: [
    ['gul:4', 'Gorgeous evening. Gorgeous ground. Gorgeous me. Do try to keep up, darlings.'],
    ['gristle', 'Watch the wind. Watch the chicken. Don\'t ask about the chicken.'],
    ['mud:6', 'Coach, what\'s the deal with the chicken?'],
    ['gristle', 'I said DON\'T ASK.']],
    half: 'Pass it like it\'s hot. It IS hot. It\'s Port Grumble. Everything here\'s been deep-fried.',
    won: [['ros', 'That chicken has more caps than I do.'], ['barry', 'The Mudlarks march on to the semis!']] },
  sf: { set: 'tunnel', title: 'SEMI-FINAL: THE FURNACE', lines: [
    ['irn:5', 'We forge champions here. Everyone else, we melt down for scrap.'],
    ['gristle', 'Don\'t stand on the glowing bits. Wheels. Wheels, look at me. The GLOWING bits.'],
    ['mud:6', 'The glowing bits look fun though.']],
    half: 'They hit hard? Hit harder. Then hide behind Tiny.',
    won: [['barry', '{shake}A PUB TEAM IN THE MEGA CUP FINAL!{/shake} Somebody pinch me!'], ['ros', 'Gladly, Barry.']] },
  gf: { set: 'tunnel', title: 'GRAND FINAL: THE MEGADOME', boss: true, lines: [
    ['rupert', 'Charming little pub team. I\'ll buy the lot of you. The pub, the pies, the muddy bird. Name your price.'],
    ['mud:0', 'Not for sale.'],
    ['gristle', 'The pies are for sale. Two-fifty. WE\'RE not.'],
    ['meg:0', '{shake}RRRAAAAAAGGGHHHHH!{/shake}'],
    ['barry', 'BIG UNIT BRANNIGAN! Two metres of pure invoice!'],
    ['ros', 'You\'ll need two men to bring him down, minimum. Bring a ladder.']],
    half: 'I\'ve written the big speech. In my head. It\'s very moving. Pretend I said it. {shake}NOW GET OUT THERE!{/shake}' },
  victory: { set: 'podium', title: 'MEGA CUP CHAMPIONS', lines: [
    ['barry', '{shake}THE MUDDINGTON MUDLARKS ARE MEGA CUP CHAMPIONS!{/shake} A PUB TEAM, ROS! A PUB TEAM!'],
    ['ros', 'I need a lie down, Barry.'],
    ['rupert', 'I\'ll buy the trophy, then.'],
    ['gristle', 'Rule Five: no.']] },
  third: { set: 'pub', title: 'THE THIRD HALF', song: true, lines: [
    ['mud:0', '{wave}Oh Muddington, oh Muddington, your mud is in my soul...{/wave}'],
    ['bad:0', '{wave}We lost our boots, we lost our teeth...{/wave}'],
    ['dave', '{wave}...we never lost the ball!{/wave}'],
    ['gristle', 'Last orders!']] },
  lost: { set: 'pitch', title: 'BEATEN', lines: [['gristle', 'Rule Six: we go again.']] }
};

/* ---- the Training Ground: Coach Gristle's nine drills ---- */
TT.DRILLS = [
  { id: 'legs', name: 'LEGS', teach: 'Run, turbo, ground it', prompt: 'Run to their line on {b:turbo} TURBO, then {b:x} DIVE over it' },
  { id: 'hands', name: 'HANDS', teach: 'Pass it backwards', prompt: 'Pass both ways: {b:l1} UP and {b:r1} DOWN. Hold for a long pass' },
  { id: 'feet', name: 'FEET', teach: 'Step, spin, fend', prompt: '{b:x} SIDESTEP twice, {b:x}{b:x} SPIN once, {b:sq} FEND the defender' },
  { id: 'hit', name: 'HIT', teach: 'Tackle, big hit, dive', prompt: '{b:x} TACKLE, hold {b:x} for a BIG HIT, {b:sq} DIVE TACKLE' },
  { id: 'ruck', name: 'RUCK', teach: 'Mash the breakdown', prompt: 'Mash {b:x} to win rucks. First to the ball? {b:sq} JACKAL' },
  { id: 'boot', name: 'BOOT', teach: 'Grubber, punt, drop goal', prompt: 'Tap {b:ci} GRUBBER, hold {b:ci} PUNT to touch, {b:ci} DROP GOAL in their 22' },
  { id: 'set', name: 'SET PIECES', teach: 'Scrum and lineout', prompt: '{b:x} on SET, alternate {b:l1}{b:r1} to push. Lineout: pick a pod, {b:x} throw' },
  { id: 'posts', name: 'POSTS', teach: 'Convert a try', prompt: 'Place the tee, aim, hold {b:ci} for power' },
  { id: 'turbo', name: 'TURBO TIME', teach: 'Power-ups and supers', prompt: 'Grab the pie, then {b:tri} THUNDER RUN through them to score' }
];

/* ---- records seeded with the cast's initials ---- */
TT.RECORD_SEEDS = {
  margin: [['NAN', 34], ['BIG', 31], ['SLK', 28], ['ANV', 24], ['FRG', 21], ['GRV', 17], ['PIP', 14], ['RUS', 12], ['CLM', 10], ['DAV', 7]],
  tries: [['BIG', 9], ['WHL', 8], ['BRZ', 7], ['JET', 6], ['NAN', 5], ['BUS', 5], ['FLT', 4], ['TIL', 4], ['HDG', 3], ['DAV', 2]],
  hit: [['BIG', 61], ['ANV', 52], ['KLN', 47], ['FRG', 40], ['BRT', 36], ['TNY', 31], ['NAN', 27], ['SAL', 22], ['GRV', 18], ['DAV', 9]]
};

/* ==== 03-about.js ==== */
/* ---- ABOUT & CREDITS: the same text as the build's chat reply and exit-interview.json (generated from about.json) ---- */
TT.ABOUT = [{"title":"THUGBY TURBO","lines":["An original game inspired by rugby: over-the-top arcade rugby sevens. Every team, person and place is made up.","Made with the my-3D2dge engine v0.85.2 and the AI Hub session client 1.4.0.","Built by claude-opus-5-5 (Anthropic) at reasoning effort medium, from PLAN.md (written by claude-opus-5-5 at max effort).","The title was picked from 50 brainstormed riffs on \"rugby\" by a real random number generator: Python secrets.randbelow(50) gave entry 17, \"Thugby Turbo\"."]},{"title":"SOURCE INFORMATION","lines":["DATE: 2026-11-04 06:56:19","SOURCE: Rugby (over-the-top arcade style): rugby sevens played for laughs","PLAN: PLAN.md","GENRE: Arcade sports (rugby sevens) with a short story campaign, training drills and couch/online party multiplayer","PERSPECTIVE: TV broadcast camera: the pitch left to right seen from the stand at a 40 degree pitch (custom 'broadcast' view), with High (55 degrees) and Overhead options; conversions and penalty goals cut to a behind-the-kicker camera (custom views turned 90 or 270 degrees so the posts are straight up the screen) with an inset aim and power gauge","TECH: my-3D2dge engine v0.85.2 (full engine, canvas 2D and Web Audio, 3 small patches); AI Hub Session Protocol v1 client 1.4.0 (unmodified); plain JavaScript in one IIFE bundled by a Node build script into one self-contained HTML file; Node 24 and Playwright 1.63 (Chromium) for tests only; no other libraries","ART DIRECTION: The engine's native PS1-era pixel style (ps1 320x240, expand to fill the screen): procedural HD Humanoids dressed per player in team kits, textured striped pitch and stands, a bobbing crowd in team colours, code-drawn oval ball, goalposts, crests, power-up sprites, sin bin, sponsor boards, venue skylines, floodlights, weather and venue hazards","ANIMATION: The engine's native procedural Humanoid rig driven from match state (velocity gait, poses, E.MOVES attack specs for pass, kick, fend, tackle, spin), plus game-made states: superman dives, launched flips for monster hits, ruck and scrum crouches, lineout lifts, celebrations, stunned stars, skeleton flash when zapped","AUDIO: All in code with the engine's chip synth: seven songs (title glam stomp, four venue themes with drum and hype layers that follow play, pub piano, the club song), eight stings, about 30 sound effects (whistle, hooter, thuds, crunches, doink, crowd bed, claps, squawk, thunder), Animalese-style per-letter babble voices for commentators, coach, referee, cast and players","ONLINE: AI Hub shared-world sessions for 2-4 players (the host runs the match; each client runs its own player at once from its own stick while he is free-running and reports his position, the host takes it within limits and decides everything else; clients draw 12 Hz snapshots and reliable event bundles drive local commentary and effects; the game's own card; finish, time-up, leave, end, server host); local 1-4 players on one machine (pads and two keyboard halves)","TESTING: Headless Node tests behind one command (node test/run.mjs: 15 suites, 174 checks, about 25 s, including a scripted playthrough of the whole Mega Cup, a proof that each of the nine drills can be completed, the attract director, dev mode, and an in-process two-copy AI Hub loopback); Playwright screenshots of every key screen (test/browser.mjs); the real AI Hub harness in all four configurations (test/hub.mjs: all pass); a TASK.md requirement checker run against the shipped HTML (test/taskcheck.mjs: 59 of 59 pass; each TASK.md line quoted beside its evidence, every gameplay feature, power-up, hazard, mode screen and animation state on its own line, golden point included); key-press playthroughs of every mode on the shipped HTML (test/modes.mjs: Exhibition join, setup, full match, results and rematch; Training Ground to a completed drill; Records; About; Settings; Credits; Mega Cup); the engine's own tools/check.mjs on 14 screens (no errors)","RESEARCH: Read the handoff package (README, API.md, parts of AI_GUIDE.md, the sports kit, engine source around fonts, input half keyboards, dialogs, menus, settings, the arcade module, the store) and the AI Hub lib/hub README, retrofit notes and harness; no web research beyond those two repositories","ENVIRONMENT: Claude Code CLI (headless); Linux; browser unknown","MODEL: Anthropic, claude-opus-5-5, reasoning effort medium","USAGE: unknown cost and token count (no token or cost meter is available in this session); session time about 1 hour 30 minutes (06:56 to about 08:25)"]},{"title":"TESTING FEEDBACK","lines":["How many issues did testing catch?: About 19 issues: AI carriers almost never passed, then over-passed into 0-0 draws; three load-order crashes at boot (a duplicated identifier, the scene registry and key preset used before definition); a renderer field that shadowed a function and crashed the camera; kicks launching from a stale ball position after a teleport; defenders catching drop goals straight off the boot; penalty tries looking at the wrong player; the boss being launched instead of gang-tackled; a collapsed-scrum win not counting in the set-piece drill; an online human kicker stalling a kick-off; a key not bound to any action failing to end the attract demo; and five layout bugs seen in screenshots (kick widget, prompt and commentary overlap, menu overflow, dev panel footer, title prompt).","How many were critical / game breaking?: Four were game breaking: the three boot crashes and the camera-bounds crash; all were fixed before shipping.","The most helpful test: The scripted playthrough of the whole Mega Cup (menus, story, training, four autopiloted matches, initials, victory, credits), together with the per-drill auto scripts that prove each of the nine drills can be completed.","The least helpful test: The single-seed proof hash: it never failed, because the simulation was built deterministic from the start."]},{"title":"ENGINE FEEDBACK","lines":["What I liked most: game.advance with exact fixed steps and a headless Game: whole matches, the full cup and a two-copy network loopback run in seconds, and the same code draws in the browser.","Stuck or guessed wrong?: Yes, a few times: E.store prefixes keys (my3d2dge:) which a test assumed it did not; groundDisc draws immediately rather than as a decal; r.tgt is the buffer for drawing a skyline before the floor; and I named a field PR.map that clobbered my own function. Pad glyphs drawing as ? was flagged by the plan and fixed.","The most important thing I built: The match simulation itself: rugby rules and set pieces (rucks, scrums, lineouts, penalties, conversions, drop goals, advantage, cards), the team AI, and the intent layer that lets humans, the AI, tests, the attract director and network clients drive the same players.","The hardest part: Fitting a 10-foot interface into a 320x240 buffer: the 5x7 font at scale 1 is the readable minimum, so screens needed careful layout, and there is no built-in big-menu or button-badge widget.","What I changed in the engine, and why: Three small patches: PlayStation symbols added to the 5x7 font (labels drew as ?), Input.halfKeys honouring a per-action layout for two keyboard players, and an E.Dialog onLetter hook so every speaker can babble letter by letter.","One thing I would change: Controller-glyph badges and a scalable menu as standard widgets: prompts built from actions that draw a PlayStation, Xbox, keycap or mouse badge for the last device."]},{"title":"PROMPT FEEDBACK","lines":["What I liked most: It is concrete about what done means (attract mode, dev sliders, glyphs following the device, touch-only message, AI Hub) and it came with a detailed plan, so the work was building rather than guessing.","What was confusing: The plan's file names (max effort, an earlier date) differ from TASK.md's; TASK.md wins, as STAGE.md says, but it needed a moment. Feature-complete demo and the plan's very large scope (every animation polished, many patches) pull against each other at medium effort.","The hardest thing: Making a sport's AI look like rugby (shape, passing at the right moment) while keeping every set piece and arcade system reachable in play, the drills and the attract mode, plus an online shared world.","What I would change: Generate the plan's names from TASK.md's values, and say plainly which plan items are optional polish versus required features."]}];

/* ==== 05-keys.js ==== */
/* ---- THE CONTROLS: one preset for every play scene (PC keys, the pad's standard mapping, two keyboard halves) ---- */
TT.KEYS = (() => {
  const K = Object.assign({}, E.Input.DEFAULT);
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete K[k];
  Object.assign(K, {
    x: ['Space', 'Pad0'], sq: ['KeyF', 'Pad2'], ci: ['KeyC', 'Mouse2', 'Pad1'], tri: ['KeyR', 'Pad3'],
    l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7'], view: ['KeyV', 'Pad11'], mouseL: ['Mouse0']
  });
  K.confirm = ['Enter', 'Space', 'Pad0']; K.cancel = ['Escape', 'Backspace', 'Pad1'];
  Object.defineProperty(K, 'halves', { enumerable: false, value: {
    left: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], turbo: ['ShiftLeft'], x: ['Space'], sq: ['KeyF'], ci: ['KeyC'], tri: ['KeyR'], l1: ['KeyQ'], r1: ['KeyE'], view: ['KeyV'], mouseL: ['Mouse0'], start: ['Digit1'], pause: ['Escape', 'Digit1'], confirm: ['Space', 'Enter'], cancel: ['Escape'] },
    right: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], turbo: ['Comma', 'Numpad0'], x: ['Period', 'Numpad1'], sq: ['Slash', 'Numpad2'], ci: ['Semicolon', 'Numpad3'], tri: ['Quote', 'Numpad6'], l1: ['KeyK', 'Numpad4'], r1: ['KeyL', 'Numpad5'], view: ['KeyM'], mouseL: [], start: ['Digit2', 'NumpadEnter'], pause: ['Digit2', 'Backspace'], confirm: ['Period', 'NumpadEnter'], cancel: ['Backspace'] }
  } });
  return K;
})();

/* ==== 10-match.js ==== */
/* ---- THE MATCH SIMULATION: the whole truth of a match in one plain object (M), stepped from intents. Nothing here
 * draws, plays a sound or reads a device: it emits events on TT.bus. Randomness only from M.rng (seeded) ---- */
let M = null;
const BALL_G = 600, CARRY_Z = 13;
const FREE = { run: 1, pass: 1, fend: 1, charge: 1, sidestep: 1, spin: 1, kick: 1 };
const WATCHDOG = { walkout: 12, kickoff: 25, play: 9999, ruck: 8, scrum: 20, lineout: 18, penalty: 20, setkick: 40, try: 12, stop: 8, half: 30, full: 9999, sudden: 9999 };

TT.sim = {};
TT.emit = (name, data) => { if (!M) return; data = data || {}; M.events.push([M.t, name, data]); if (M.events.length > 60) M.events.shift(); TT.bus.emit(name, data); };
const emit = TT.emit;
const rnd = () => M.rng();
const U = (a, b) => a + (b - a) * M.rng();
const cheat = k => !!(M && M.cheats && M.cheats[k]);
const dirOf = team => (team === 0 ? 1 : -1) * (M.half === 2 ? -1 : 1);
const tryLineOf = team => dirOf(team) > 0 ? G.X1 : G.X0;     // the line team attacks
const ownLineOf = team => dirOf(team) > 0 ? G.X0 : G.X1;
const pl = id => M.players[id];
const teamPlayers = team => M.players.filter(p => p.team === team);
const onField = p => p.st !== 'binned' && p.st !== 'off';
const standing = p => onField(p) && !['tackled', 'ground', 'stunned', 'launched', 'diving', 'getup', 'held'].includes(p.st);
const isFree = p => !!FREE[p.st];
const holder = () => M.ball.st === 'held' ? pl(M.ball.holder) : null;
const statOf = (p, k) => p.data.stats[k] || 5;
TT.sim.dirOf = t => dirOf(t); TT.sim.tryLineOf = t => tryLineOf(t);

/** a new match: o = { home, away (team ids), venue, weather, time, halfLength, suddenDeath, cup, drill, attract, session,
 *  seed, difficulty, kits } */
TT.sim.create = o => {
  const seed = o.seed == null ? (Date.now() & 0xffffff) : o.seed;
  const teams = [TT.teamById(o.home || 'mud'), TT.teamById(o.away || 'bad')];
  const venue = TT.venueById(o.venue || 'park');
  // kits: the away side changes when the home jerseys are too alike
  const lum = h => { const c = E.hex(h); return .3 * c[0] + .59 * c[1] + .11 * c[2]; };
  const kits = [teams[0].home, Math.abs(lum(teams[0].home.cloth) - lum(teams[1].home.cloth)) < 60 || teams[0].id === teams[1].id ? teams[1].away : teams[1].home];
  M = {
    o, seed, rng: E.rng(seed), t: 0, teams, venue, kits,
    phase: 'walkout', sub: '', phaseT: 0, ph: {},
    half: 1, clock: 0, hooter: false, hooterT: 0, suddenDeath: false, over: false, winner: -1,
    score: [0, 0], hype: [0, 0], possession: 0, lastTouch: 0, kickoffTeam: 0,
    players: [], ref: null, pu: null, puT: 0, hazards: [], hazT: { a: 20, b: 40 }, wind: { a: 0, s: venue.wind ? .5 : 0, t: 15 },
    mud: [], adv: null, cards: [], megaBoot: [0, 0], lastScorer: [-1, -1], streak: { team: -1, pid: -1, n: 0 },
    stats: [0, 1].map(() => ({ poss: 0, terr: 0, tries: 0, conv: 0, convAtt: 0, pens: 0, tackles: 0, missed: 0, bigHits: 0, monsters: 0, metres: 0, breaks: 0, turnovers: 0, offloads: 0, cards: 0, passes: 0, kicks: 0, scrums: 0, lineouts: 0, rucks: 0 })),
    events: [], cheats: o.cheats || {}, watchdogs: 0, lastBig: null, bestHit: 0,
    useIt: null, drill: o.drill || null, ctlHint: {}
  };
  M.ball = { x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, st: 'dead', holder: -1, kind: '', from: -1, team: 0, target: -1, t: 0, rot: 0, spin: 0, forward: false, tried: {}, bounces: 0, pen: false, startX: 0, landing: null };
  let id = 0;
  for (const team of [0, 1]) teams[team].players.forEach((d, idx) => {
    M.players.push({ id: id++, team, idx, role: ROLES[idx], data: d, x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, facing: team ? PI : 0,
      st: 'run', stT: 0, turbo: 1, turboIdle: 0, cool: 0, evade: 0, evadeKind: '', fendT: 0, charge: 0, stun: 0, power: null, fire: 0,
      binT: 0, yellows: 0, cheap: 0, ctl: -1, mud: 0, sideCd: 0, fendCd: 0, xTapT: 9, kickHold: 0, passHold: { l1: 0, r1: 0 }, held: 0, heldBy: -1,
      superK: '', superT: 0, homing: -1, launch: null, tries: 0, tackles: 0, metres: 0, monsters: 0, celeb: idx % 6, scale: d.size, flash: 0,
      toasted: 0, zapped: 0, sold: 0, tx: 0, ty: 0, aiT: 0, aiPlan: null, lastHitBy: -1 });
  });
  M.ref = { x: G.CX, y: G.Y0 + 60, z: 0, vx: 0, vy: 0, facing: PI / 2, down: 0, call: '', callT: 0, signal: '', signalT: 0, card: '', cardT: 0 };
  if (venue.hazard === 'mud') {   // four to six mud patches, kept off the try lines' faces
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) M.mud.push({ x: U(G.X0 + 120, G.X1 - 120), y: U(G.Y0 + 60, G.Y1 - 60), r: U(40, 70), k: U(.6, 1) });
  }
  M.weather = o.weather && o.weather !== 'venue' ? o.weather : venue.weather;
  if (M.weather === 'wind' || M.weather === 'storm') M.wind.s = M.weather === 'wind' ? .6 : .4;
  M.halfLen = o.halfLength || TUNE.v.halfLength;
  formation('walkout', 0);
  setPhase(o.drill ? 'play' : (o.skipIntro ? 'kickoff' : 'walkout'));
  if (!o.drill && o.skipIntro) startKickoff(0);
  return M;
};

/* ---- phases ---- */
function setPhase(name, data) {
  M.phase = name; M.phaseT = 0; M.sub = ''; M.ph = data || {};
  emit('phase', { phase: name });
}
TT.sim.setPhase = setPhase;
function setSub(s) { M.sub = s; M.ph.subT = 0; }

/* ---- formations: where everyone stands for each restart ---- */
function formation(kind, team, at) {
  const d = dirOf(team), P = M.players;
  for (const p of P) {
    if (!onField(p)) continue;
    const own = p.team === team, dd = dirOf(p.team);
    let x = G.CX, y = G.CY;
    if (kind === 'walkout') { x = G.CX + (p.team ? 1 : -1) * (40 + p.idx * 6); y = G.Y1 + 30 + p.idx * 3; }
    else if (kind === 'kickoff') {
      if (own) { if (p.idx === 4) { x = G.CX - d * 8; y = G.CY; } else { const k = [-200, -60, 60, -130, 0, 130, 200][p.idx]; x = G.CX - d * (p.idx < 3 ? 14 : 24); y = G.CY + k; } }
      else { const spots = [[120, -70], [120, 0], [120, 70], [210, -40], [300, 0], [250, 140], [250, -150]]; x = G.CX + d * spots[p.idx][0]; y = G.CY + spots[p.idx][1]; }
    }
    if (kind !== 'walkout') { x = clamp(x, G.X0 - 80, G.X1 + 80); y = clamp(y, G.Y0 + 10, G.Y1 - 10); }
    p.x = x; p.y = y; p.z = 0; p.vx = p.vy = p.vz = 0; p.facing = dd > 0 ? 0 : PI;
    resetPlayer(p);
  }
}
function resetPlayer(p) {
  if (!onField(p)) return;
  p.st = 'run'; p.stT = 0; p.charge = 0; p.evade = 0; p.fendT = 0; p.stun = 0; p.held = 0; p.heldBy = -1; p.launch = null; p.homing = -1; p.kickHold = 0; p.passHold.l1 = p.passHold.r1 = 0;
  if (p.superK === 'hurricane') { p.superK = ''; p.superT = 0; }
}

/* ---- the ball ---- */
function giveBall(p, how) {
  const b = M.ball, wasTeam = b.team;
  b.st = 'held'; b.holder = p.id; b.team = p.team; b.from = p.id; b.target = -1; b.t = 0; b.vx = b.vy = b.vz = 0; b.forward = false; b.tried = {}; b.landing = null; b.kind = '';
  b.x = p.x; b.y = p.y; b.z = CARRY_Z; b.pen = false;
  if (M.possession !== p.team) { M.possession = p.team; if (how !== 'restart') emit('turnover', { team: p.team, pid: p.id, how }); }
  M.possession = p.team; M.lastTouch = p.team;
  p.carryStart = p.x; p.lineBroken = false;
  if (M.superCarry && M.superCarry !== p.id) M.superCarry = 0;
  void wasTeam;
  emit('gather', { pid: p.id, how });
}
TT.sim.giveBall = (id, how) => giveBall(pl(id), how || 'restart');
/** launch the ball: from (x, y, z) with a velocity; kind 'pass' | 'kick' | 'grubber' | 'bomb' | 'drop' | 'place' | 'kickoff' | 'spill' */
function launchBall(from, vx, vy, vz, kind, extra) {
  const b = M.ball;
  b.st = kind === 'spill' ? 'loose' : 'air'; b.kind = kind; b.holder = -1; b.from = from ? from.id : -1; b.team = from ? from.team : b.team;
  if (from) M.lastTouch = from.team;
  b.vx = vx; b.vy = vy; b.vz = vz; b.t = 0; b.tried = {}; b.bounces = 0; b.forward = false; b.target = -1; b.startX = b.x; b.landing = null; b.pen = false;
  Object.assign(b, extra || {});
  if (kind !== 'pass' && kind !== 'spill') b.landing = predictLanding();
}
/** where a ball in the air comes down (no wind): for the landing marker and the AI */
function predictLanding() {
  const b = M.ball; let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  for (let i = 0; i < 600; i++) { const dt = 1 / 60; vz -= BALL_G * dt; x += vx * dt; y += vy * dt; z += vz * dt; vx *= 1 - .3 * dt; vy *= 1 - .3 * dt; if (z <= 0) break; }
  return { x, y };
}
TT.sim.predictLanding = predictLanding;
/** a velocity that sends the ball from a to b, landing there, with the given apex (above the higher end) */
function arcTo(ax, ay, az, bx, by, bz, apex) {
  const top = Math.max(az, bz) + apex, vz = Math.sqrt(2 * BALL_G * Math.max(.5, top - az)), tUp = vz / BALL_G, tDown = Math.sqrt(2 * Math.max(.5, top - bz) / BALL_G), t = tUp + tDown;
  const drag = 1 + .15 * t;   // (a touch more speed against the air)
  return { vx: (bx - ax) / t * drag, vy: (by - ay) / t * drag, vz, t };
}
TT.sim.arcTo = arcTo;

function ballStep(dt) {
  const b = M.ball; b.t += dt;
  if (b.st === 'held') {
    const p = pl(b.holder);
    if (!p || !onField(p)) { b.st = 'loose'; return; }
    const f = p.facing, side = (p.idx % 2 ? -1 : 1);
    b.x = p.x + Math.cos(f) * 4 - Math.sin(f) * 3 * side; b.y = p.y + Math.sin(f) * 4 + Math.cos(f) * 3 * side; b.z = p.z + (p.st === 'tackled' || p.st === 'ground' ? 3 : CARRY_Z);
    b.vx = p.vx; b.vy = p.vy; b.vz = 0; b.rot += Math.hypot(p.vx, p.vy) * dt * .02;
    return;
  }
  if (b.st === 'dead' || b.st === 'placed') return;
  // air and loose: gravity, drag, wind, the oval bounce, rolling friction
  const air = b.z > .5 || b.vz > 0;
  if (air) {
    b.vz -= BALL_G * dt;
    const drag = 1 - .3 * dt; b.vx *= drag; b.vy *= drag;
    if (M.wind.s > 0 && b.z > 8) { const k = 40 * M.wind.s * TUNE.v.windMult * dt; b.vx += Math.cos(M.wind.a) * k; b.vy += Math.sin(M.wind.a) * k; }
    b.rot += dt * (b.kind === 'pass' ? 18 : 12);
  }
  const prevX = b.x;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.goalCheck) goalFlight(prevX);
  if (b.z <= 0) {
    b.z = 0;
    if (b.vz < -30) {   // the oval bounce: a random turn and a random rebound
      const chaos = TUNE.v.bounceChaos * (b.kind === 'grubber' ? 1.4 : 1), ang = (rnd() * 2 - 1) * 70 * PI / 180 * chaos, c = Math.cos(ang), s = Math.sin(ang);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
      b.vx = vx * .75; b.vy = vy * .75; b.vz = -b.vz * .45 * U(.3, 1.25) * (b.kind === 'grubber' && rnd() < .3 ? 1.6 : 1);
      if (onMud(b.x, b.y)) { b.vz *= .5; }
      b.bounces++; emit('bounce', { x: b.x, y: b.y, v: -b.vz });
      if (b.st === 'air') { b.st = 'loose'; if (b.forward) { /* a forward pass that hits the ground */ return forwardPassCall(b.x, b.y); } onBallGrounded(); }
    } else {
      b.vz = 0;
      const f = Math.exp(-(onMud(b.x, b.y) ? .9 : 1.4) * dt); b.vx *= f; b.vy *= f;
      if (b.st === 'air') { b.st = 'loose'; onBallGrounded(); }
    }
  }
  // catches: the receiver of a pass, interceptions, and anyone under a kick
  if (b.st === 'air' || (b.st === 'loose' && b.z < 30)) catches(dt);
  if (b.st === 'loose') pickups();
}
function onBallGrounded() {
  const b = M.ball;
  if (b.kind === 'kickoff' || b.kind === 'dropout') checkTen();
}
/** a kick-off that bounces before ten metres (or never got there) */
function checkTen() {
  const b = M.ball, k = M.kickoffCheck; if (!k) return;
  const gone = (b.x - k.x) * dirOf(k.team);
  M.kickoffCheck = null;
  if (k.kind === 'kickoff' && gone < 102) { stop('NOT TEN!', 1.4, () => freeKick(1 - k.team, G.CX + dirOf(k.team) * 10, G.CY, 'notTen')); }
}
function catches() {
  const b = M.ball;
  for (const p of M.players) {
    if (!standing(p) || b.tried[p.id] || p.st === 'ruck' || p.st === 'scrum' || p.st === 'lineout') continue;
    if (b.from === p.id && b.t < .35) continue;
    if (b.kind !== 'pass' && b.st === 'air' && b.vz > 0 && b.t < .5) continue;   // (a kick isn't caught off the boot)
    const reach = b.kind === 'pass' ? 10 : 11, d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d > reach || b.z > 30 || b.z < (b.st === 'air' ? 0 : -1)) continue;
    b.tried[p.id] = true;
    const ownTeam = p.team === b.team;
    if (b.kind === 'pass') {
      if (b.target === p.id || (ownTeam && d < 7)) return catchPass(p);
      if (!ownTeam && b.z < 24) {   // an interception
        const human = p.ctl >= 0, intent = M.intents && M.intents[p.id];
        const ch = human ? (intent && (intent.h.x || intent.p.x) && d < 12 ? .45 : 0) : (d < 7 ? .08 : .02) * (M.diff[p.team] ? M.diff[p.team].intercept : 1) * (p.idx >= 3 ? 1.2 : .8);
        if (rnd() < ch) { giveBall(p, 'intercept'); addHype(p.team, 12); emit('interception', { pid: p.id }); return; }
      }
      continue;
    }
    // a kick (or a ball in the air off a hand): a catch, contested when both sides are under it
    const rivals = M.players.filter(q => q !== p && q.team !== p.team && standing(q) && Math.hypot(b.x - q.x, b.y - q.y) < reach + 2);
    let taker = p;
    if (rivals.length && b.st === 'air' && b.z > 6) {
      const q = rivals[0], sp = contestScore(p), sq = contestScore(q);
      taker = sp >= sq ? p : q; const loser = taker === p ? q : p;
      knockDown(loser, .7, taker); emit('contest', { pid: taker.id, lost: loser.id });
    }
    const ch = clamp(TUNE.v.catchBase * (.9 + .01 * statOf(taker, 'HND')) - (b.kind === 'bomb' ? .12 : 0) - (wet() ? .06 : 0), .3, 1);
    if (taker.fire > 0 || rnd() < ch) {
      if (b.forward) return forwardPassCall(taker.x, taker.y);
      const wasKick = b.kind; giveBall(taker, 'catch'); emit('kickCaught', { pid: taker.id, kind: wasKick });
      if (M.kickoffCheck) M.kickoffCheck = null;
      return;
    }
    return fumble(taker);
  }
}
function contestScore(p) {
  const it = M.intents && M.intents[p.id], human = p.ctl >= 0;
  const timing = human ? (it && it.p.x ? .9 : .2) : clamp(.55 + (M.diff[p.team] ? (.12 - M.diff[p.team].scrumSigma) * 2 : 0) + U(-.25, .25), 0, 1);
  return timing * .6 + statOf(p, 'HND') * .04 + U(0, .1);
}
function catchPass(p) {
  const b = M.ball, passer = pl(b.from), longP = b.long;
  let ch = TUNE.v.catchBase * (.9 + .01 * statOf(p, 'HND')) - (longP ? .06 : 0) - (wet() ? .06 : 0) - (b.offload ? .1 : 0);
  if (M.players.some(q => q.team !== p.team && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 20)) ch -= TUNE.v.pressurePenalty;
  if (p.fire > 0 || (passer && passer.fire > 0) || M.drill) ch = 1;
  if (rnd() < clamp(ch, .3, 1)) {
    if (b.forward) return forwardPassCall(p.x, p.y);
    const from = b.from; giveBall(p, 'pass'); M.stats[p.team].passes++; emit('catch', { pid: p.id, from });
    return;
  }
  fumble(p);
}
function fumble(p) {
  const b = M.ball, d = dirOf(p.team);
  if (rnd() < .5) {   // knocked forward: a knock-on
    b.st = 'loose'; b.vx = d * 60; b.vy = U(-30, 30); b.vz = 40; b.z = 10; b.from = p.id; b.team = p.team;
    emit('knockOn', { pid: p.id });
    stop('KNOCK-ON', 1.6, () => scrum(1 - p.team, p.x, p.y, 'knockOn'), { call: 'KNOCK ON!' });
  } else {
    b.st = 'loose'; b.vx = -d * U(30, 70); b.vy = U(-50, 50); b.vz = 50; b.z = 10; b.from = p.id; b.team = p.team; b.tried = { [p.id]: true }; b.t = 0;
    emit('spill', { pid: p.id });
  }
}
function forwardPassCall(x, y) {
  const b = M.ball, team = b.team;
  emit('forwardPass', { team });
  stop('FORWARD PASS', 1.6, () => scrum(1 - team, x, y, 'forwardPass'), { call: 'FORWARD!' });
}
function pickups() {
  const b = M.ball; if (b.z > 9) return;
  let best = null, bd = 1e9;
  for (const p of M.players) {
    if (!standing(p) || !isFree(p) || p.cool > 0) continue;
    if (b.from === p.id && b.t < .3) continue;
    const fast = Math.hypot(b.vx, b.vy) > 210, d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < (fast ? 4.5 : 9) && d < bd) { best = p; bd = d; }
  }
  if (!best) return;
  const sprint = Math.hypot(best.vx, best.vy) > TUNE.v.runSpeed * 1.2;
  if (sprint && statOf(best, 'HND') < 8 && best.fire <= 0 && rnd() < .15 && !M.drill) { emit('fumbleSprint', { pid: best.id }); return fumble(best); }
  giveBall(best, 'pickup');
}
const wet = () => M.weather === 'rain' || M.weather === 'storm';
function onMud(x, y) { for (const m of M.mud) if (Math.hypot(x - m.x, y - m.y) < m.r) return true; return false; }
TT.sim.onMud = (x, y) => M && onMud(x, y);

/* ---- hype ---- */
function addHype(team, n) {
  if (team < 0) return;
  const before = M.hype[team];
  M.hype[team] = clamp(M.hype[team] + n * TUNE.v.hypeMult, 0, 100);
  if (before < 100 && M.hype[team] >= 100) emit('hypeFull', { team });
}
TT.sim.addHype = (t, n) => addHype(t, n);

/* ---- stoppages and restarts ---- */
/** play stops: a banner, the whistle, then next() (or the end of the half when the hooter has gone) */
function stop(label, secs, next, o = {}) {
  const b = M.ball; if (M.phase === 'stop') return;
  b.st = 'dead'; b.vx = b.vy = b.vz = 0;
  M.adv = null;
  setPhase('stop', { label, secs, next, call: o.call || '', noHooter: !!o.noHooter });
  emit('whistle', { label, call: o.call || '' });
  if (o.call) refCall(o.call);
}
TT.sim.stop = (l, s, n, o) => stop(l, s, n, o);
function refCall(text, signal) { M.ref.call = text; M.ref.callT = 1.6; if (signal) { M.ref.signal = signal; M.ref.signalT = 1.6; } emit('refCall', { text }); }
/** after a stoppage: the half ends if the hooter has gone, else the restart runs */
function afterStop(fn) {
  if (M.hooter && !M.suddenDeath && !M.drill) return endHalf();
  fn();
}
function endHalf() {
  M.ball.st = 'dead'; M.adv = null;
  if (M.half === 1) { setPhase('half'); emit('halftime', { score: M.score.slice() }); return; }
  // full time, or sudden death when level and it must have a winner
  if (M.score[0] === M.score[1] && (M.o.cup || M.o.suddenDeath) && !M.suddenDeath && !M.o.session) {
    M.suddenDeath = true; M.hooter = false; M.sdClock = 0; emit('suddenDeath', {}); startKickoff(rnd() < .5 ? 0 : 1); return;
  }
  fullTime();
}
function fullTime() {
  M.over = true; M.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  for (const p of M.players) if (onField(p)) { resetPlayer(p); if (p.team === M.winner) { p.st = 'celebrate'; p.stT = 0; } }
  setPhase('full'); emit('fulltime', { score: M.score.slice(), winner: M.winner });
}
TT.sim.endHalf = () => endHalf();
TT.sim.fullTime = () => fullTime();

/* ---- kick-offs and drop-outs ---- */
function startKickoff(team, kind = 'kickoff') {
  M.kickoffTeam = team;
  formation('kickoff', team);
  const kicker = teamPlayers(team).find(p => p.idx === 4 && onField(p)) || teamPlayers(team).find(onField);
  const d = dirOf(team);
  let x = G.CX, y = G.CY;
  if (kind === 'dropout') { x = ownLineOf(team) + d * 225; y = G.CY; for (const p of M.players) if (onField(p)) { if (p.team === team) p.x = Math.min(p.x * d, (x - d * 10) * d) * d; else p.x = x + d * (120 + p.idx * 25); } }
  kicker.x = x - d * 8; kicker.y = y; kicker.facing = d > 0 ? 0 : PI;
  M.ball.st = 'placed'; M.ball.x = x; M.ball.y = y; M.ball.z = 0; M.ball.holder = -1;
  setPhase('kickoff', { team, kind, kicker: kicker.id, x, y, aim: [x + d * 180, y + (rnd() < .5 ? -1 : 1) * 120], power: 0, holding: false, cpuT: U(1.1, 1.8) });
  emit(kind === 'kickoff' ? 'kickoffSetup' : 'dropOut', { team });
}
TT.sim.startKickoff = (t, k) => startKickoff(t, k);
function kickoffStep(dt) {
  const ph = M.ph, k = pl(ph.kicker), it = M.intents[k.id], d = dirOf(ph.team);
  k.vx = k.vy = 0; k.x = ph.x - d * 8; k.y = ph.y;
  for (const p of M.players) if (p !== k && onField(p)) { p.vx = p.vy = 0; }
  // the aim: the stick (or the mouse) moves the reticle across the receiving half
  if (k.ctl >= 0) {
    if (it.aim) { ph.aim[0] = it.aim[0]; ph.aim[1] = it.aim[1]; }
    else { ph.aim[0] += it.mx * 220 * dt * (d > 0 ? 1 : 1); ph.aim[1] += it.my * 220 * dt; }
    if (it.h.ci || it.h.x) { ph.holding = true; ph.power = Math.min(1, ph.power + dt / .9); }
    else if (ph.holding) return kickoffKick(ph.power);
    if (M.phaseT > 8) return kickoffKick(.55);
  } else if (M.phaseT > ph.cpuT) {
    ph.aim = [ph.x + d * U(130, 200), ph.y + (rnd() < .5 ? -1 : 1) * U(60, 170)];
    if (ph.kind === 'dropout') ph.aim = [ph.x + d * U(220, 330), ph.y + U(-150, 150)];
    return kickoffKick(-1);
  }
  ph.aim[0] = clamp(ph.aim[0], Math.min(ph.x, ph.x + d * 600), Math.max(ph.x, ph.x + d * 600));
  ph.aim[1] = clamp(ph.aim[1], G.Y0 - 30, G.Y1 + 30);
}
function kickoffKick(power) {
  const ph = M.ph, k = pl(ph.kicker), d = dirOf(ph.team);
  let tx = ph.aim[0], ty = ph.aim[1];
  if (power >= 0) {   // the human's power scales the distance to the reticle; the sweet spot is true
    const dist = Math.hypot(tx - ph.x, ty - ph.y), want = dist * clamp(.55 + power * .6, .5, 1.12), a = Math.atan2(ty - ph.y, tx - ph.x) + (power > .85 ? 0 : U(-.08, .08));
    tx = ph.x + Math.cos(a) * want; ty = ph.y + Math.sin(a) * want;
  }
  const v = arcTo(ph.x, ph.y, 0, tx, ty, 0, ph.kind === 'dropout' ? 70 : 90);
  M.ball.x = ph.x; M.ball.y = ph.y; M.ball.z = 4;
  launchBall(k, v.vx, v.vy, v.vz, ph.kind === 'dropout' ? 'dropout' : 'kickoff');
  M.kickoffCheck = { team: ph.team, x: ph.x, kind: ph.kind };
  k.st = 'kick'; k.stT = 0; k.cool = .4;
  M.stats[ph.team].kicks++;
  emit('kickoff', { team: ph.team, kind: ph.kind, pid: k.id });
  setPhase('play');
  void d;
}

/* ---- scoring ---- */
function score(team, pts, kind, pid) {
  M.score[team] += pts; M.lastScorer[team] = pid;
  emit('score', { team, pts, kind, pid });
  if (M.suddenDeath) { M.winner = team; return true; }
  return false;
}
function tryScored(p, how) {
  const team = p.team, tl = tryLineOf(team), d = dirOf(team);
  const gy = clamp(p.y, G.Y0 + 2, G.Y1 - 2);
  p.tries++; M.stats[team].tries++;
  // ON FIRE: two tries in a row by the same player
  if (M.streak.pid === p.id) M.streak.n++; else M.streak = { team, pid: p.id, n: 1 };
  for (const q of M.players) if (q.team !== team) q.fire = 0;
  if (M.streak.n >= 2 && p.fire <= 0) { p.fire = 90; emit('onFire', { pid: p.id }); }
  addHype(team, 15);
  const run = Math.abs(p.x - (p.carryStart == null ? p.x : p.carryStart));
  M.ball.st = 'dead';
  const ended = score(team, how === 'penaltyTry' ? 7 : 5, how || 'try', p.id);
  M.adv = null; M.superCarry = 0; if (p.superK === 'thunder') { p.superK = ''; p.superT = 0; emit('superEnd', { pid: p.id }); }
  for (const q of M.players) if (onField(q)) { if (q.st !== 'tackled') resetPlayer(q); if (q.team === team) { q.st = 'celebrate'; q.stT = 0; } }
  emit('try', { team, pid: p.id, x: p.x, y: gy, run, how: how || 'try' });
  refCall('TRY!', 'try');
  setPhase('try', { team, pid: p.id, y: gy, tl, how: how || 'try', ended });
  void d;
}
TT.sim.tryScored = (id, how) => tryScored(pl(id), how);

/* ---- the referee: runs behind the play, turns to the ball, sees (or misses) fouls ---- */
function refStep(dt) {
  const r = M.ref, b = M.ball;
  r.callT = Math.max(0, r.callT - dt); r.signalT = Math.max(0, r.signalT - dt); r.cardT = Math.max(0, r.cardT - dt);
  if (r.down > 0) { r.down -= dt; r.vx = r.vy = 0; if (r.down <= 0) { r.down = 0; emit('refUp', {}); } return; }
  const att = M.possession, d = dirOf(att);
  const tx = clamp(b.x - d * 50, G.X0 - 60, G.X1 + 60), ty = clamp(b.y - 40 - (b.y > G.CY ? 30 : 0), G.Y0 + 14, G.Y1 - 14);
  let dx = tx - r.x, dy = ty - r.y; const dd = Math.hypot(dx, dy);
  // steer round players
  for (const p of M.players) { const ex = r.x - p.x, ey = r.y - p.y, e = Math.hypot(ex, ey); if (e < 14 && e > .1) { dx += ex / e * 30; dy += ey / e * 30; } }
  const sp = dd > 8 ? 95 : 0, m = Math.hypot(dx, dy) || 1;
  r.vx = TT.approach(r.vx, dx / m * sp, 500 * dt); r.vy = TT.approach(r.vy, dy / m * sp, 500 * dt);
  r.x += r.vx * dt; r.y += r.vy * dt;
  r.facing = E.approachAng(r.facing, Math.atan2(b.y - r.y, b.x - r.x), 4 * dt);
}
/** does the referee see this? (down: no; dev cheats: blind or strict) */
function refSees(p) {
  if (cheat('refStrict')) return true;
  if (cheat('refBlind') || M.ref.down > 0 || M.o.drill) return false;
  const r = M.ref, d = Math.hypot(p.x - r.x, p.y - r.y);
  if (d > TUNE.v.refRange) return false;
  return Math.abs(TT.angDiff(r.facing, Math.atan2(p.y - r.y, p.x - r.x))) < TUNE.v.refFov / 2;
}
TT.sim.refSees = p => refSees(p);
/** a foul by p (offender) against team: called if seen (now or 0.3 s later); advantage when the victims have the ball */
function foul(p, kind, card, victim) {
  const seen = refSees(p);
  if (!seen) { M.pendingFoul = { pid: p.id, kind, card, t: .3, victim: victim ? victim.id : -1 }; emit('foulUnseen', { pid: p.id, kind }); return false; }
  return callFoul(p, kind, card, victim);
}
function callFoul(p, kind, card, victim) {
  const victims = 1 - p.team;
  M.stats[p.team].pens++;
  emit('foul', { pid: p.id, kind, card: !!card });
  if (card) giveCard(p, kind);
  // a penalty try: a foul on a carrier near the line with nobody between him and it
  const h = victim && victim.team === victims ? victim : holder();
  if (h && h.team === victims && Math.abs(tryLineOf(victims) - h.x) < 60 && !M.players.some(q => q.team === p.team && standing(q) && (q.x - h.x) * dirOf(victims) > 0 && q !== p)) {
    emit('penaltyTry', { team: victims });
    if (h.st === 'launched') { h.st = 'ground'; h.z = 0; h.launch = null; }
    tryScored(h, 'penaltyTry'); return true;
  }
  if (M.phase === 'play' && (M.possession === victims || (M.ball.st === 'loose' && M.ball.team === victims))) {
    M.adv = { team: victims, t: 0, x: h ? h.x : M.ball.x, mark: [p.x, p.y], kind };
    refCall('ADVANTAGE!', 'adv'); emit('advantage', { team: victims });
    return true;
  }
  stop('PENALTY', 1.6, () => penalty(victims, p.x, p.y, kind), { call: 'PENALTY!' });
  return true;
}
function giveCard(p, kind) {
  p.yellows++;
  const red = p.yellows >= 2;
  M.ref.card = red ? 'red' : 'yellow'; M.ref.cardT = 2.2;
  M.cards.push({ pid: p.id, team: p.team, red, t: M.clock });
  M.stats[p.team].cards++;
  if (M.ball.holder === p.id) { M.ball.st = 'loose'; M.ball.vz = 20; }
  p.st = red ? 'off' : 'binned'; p.binT = red ? 1e9 : TUNE.v.sinBin; p.x = G.BIN.x + (p.team ? 8 : -8); p.y = G.BIN.y; p.vx = p.vy = 0;
  if (p.ctl >= 0) p.ctl = -1;
  emit('card', { pid: p.id, red, kind });
  emit(red ? 'red' : 'sinBinIn', { pid: p.id });
}
function advStep(dt) {
  const a = M.adv; if (!a) return;
  a.t += dt; const h = holder();
  if (h && h.team === a.team && (h.x - a.x) * dirOf(a.team) > 100) { M.adv = null; emit('advantageOver', {}); refCall('ADVANTAGE OVER'); return; }
  if ((h && h.team !== a.team) || a.t > 5) {
    const m = a.mark, k = a.kind; M.adv = null;
    stop('PENALTY', 1.4, () => penalty(a.team, m[0], m[1], k), { call: 'PENALTY!' });
  }
}

/* ---- the clock, the hooter, possession and territory ---- */
function clockStep(dt) {
  const running = M.phase === 'play' || M.phase === 'ruck';
  if (!running || M.drill || cheat('noClock')) return;
  if (M.suddenDeath) { M.sdClock = (M.sdClock || 0) + dt; if (!M.o.cup && M.sdClock > 120 && !M.over) { fullTime(); } return; }
  M.clock += dt;
  if (!M.hooter && M.clock >= M.halfLen) { M.hooter = true; M.hooterT = 0; emit('hooter', {}); }
  if (M.hooter) M.hooterT += dt;
  const s = M.stats[M.possession]; if (s) s.poss += dt;
  const b = M.ball; if ((b.x - G.CX) * dirOf(0) > 0) M.stats[0].terr += dt; else M.stats[1].terr += dt;
  // the sin bin's clock
  for (const p of M.players) if (p.st === 'binned') { p.binT -= dt; if (p.binT <= 0) { p.st = 'run'; p.x = G.CX + (p.team ? 20 : -20); p.y = G.Y1 - 6; emit('sinBinOut', { pid: p.id }); } }
}

/* ---- out of play, tries, dead balls ---- */
function lawsStep() {
  const b = M.ball, h = holder();
  if (M.phase !== 'play') return;
  const x = b.x, y = b.y;
  // touch: the ball (or the carrier's feet) over a touchline
  const carrierOut = h && (h.y < G.Y0 || h.y > G.Y1) && h.x > G.X0 && h.x < G.X1;
  const ballOut = !h && (y < G.Y0 || y > G.Y1) && b.z < 40 && (x > G.X0 && x < G.X1);
  if (carrierOut || ballOut) {
    const lastTeam = h ? h.team : b.team, throwTeam = b.pen && !h ? b.team : 1 - lastTeam;
    const lx = clamp(x, G.X0 + 51, G.X1 - 51), side = y < G.CY ? 0 : 1;
    if (M.kickoffCheck && b.kind === 'kickoff' && !h) { const k = M.kickoffCheck; M.kickoffCheck = null; return stop('OUT ON THE FULL', 1.4, () => scrum(1 - k.team, G.CX, G.CY, 'kickoff')); }
    if (!h && (b.kind === 'kick' || b.kind === 'bomb' || b.kind === 'grubber')) emit('kickTouch', { team: b.team, pen: b.pen });
    emit('touch', { team: throwTeam });
    return stop('TOUCH', 1.5, () => lineout(throwTeam, lx, side), { call: 'TOUCH!' });
  }
  // in-goal: a carrier over the line he attacks
  if (h) {
    const tl = tryLineOf(h.team), d = dirOf(h.team), inGoal = (h.x - tl) * d > 0, deadX = tl + d * G.IN;
    if (inGoal && h.st !== 'tackled') {
      h.inGoalT = (h.inGoalT || 0) + 1 / 120;
      if (h.inGoalT > 2.5 || (h.x - deadX) * d > -16) return tryScored(h);
    } else h.inGoalT = 0;
    // a carrier in his own in-goal touching down: a drop-out (or a 5 m scrum if he carried it in)
    const own = ownLineOf(h.team), inOwn = (h.x - own) * d < 0;
    if (inOwn) { h.ownGoalT = (h.ownGoalT || 0) + 1 / 120; if (h.ownGoalT > 1.5) { const t = h.team; return stop('TOUCHDOWN', 1.4, () => startKickoff(t, 'dropout')); } } else h.ownGoalT = 0;
    if (h.x < G.DEAD[0] || h.x > G.DEAD[1]) { const t = h.team; return stop('DEAD BALL', 1.4, () => startKickoff(1 - t, 'dropout')); }
    // the line break: past every defender but the sweeper
    if (!h.lineBroken && M.phase === 'play') {
      const behind = teamPlayers(1 - h.team).filter(q => onField(q) && (q.x - h.x) * d < 0).length, total = teamPlayers(1 - h.team).filter(onField).length;
      if (total - behind <= 1 && (h.x - (h.carryStart || h.x)) * d > 20) { h.lineBroken = true; M.stats[h.team].breaks++; addHype(h.team, 8); emit('lineBreak', { pid: h.id }); }
    }
    return;
  }
  // a loose ball over the dead-ball line or touch-in-goal
  if (b.st === 'loose' || b.st === 'air') {
    const inGoalSide = x < G.X0 ? 0 : x > G.X1 ? 1 : -1;
    if (inGoalSide >= 0 && b.z < 30 && (x < G.DEAD[0] || x > G.DEAD[1] || y < G.Y0 || y > G.Y1)) {
      const lineX = inGoalSide ? G.X1 : G.X0, attackers = [0, 1].find(t => tryLineOf(t) === lineX), last = b.team;
      if (last === attackers) return stop('DEAD BALL', 1.4, () => startKickoff(1 - attackers, 'dropout'));
      return stop('DEAD BALL', 1.4, () => scrum(attackers, lineX - dirOf(attackers) * 51, clamp(y, G.Y0 + 51, G.Y1 - 51), 'dead'));
    }
    // a loose ball grounded in the in-goal by an attacker who reaches it
    if (inGoalSide >= 0 && b.z < 4) {
      const lineX = inGoalSide ? G.X1 : G.X0, attackers = [0, 1].find(t => tryLineOf(t) === lineX);
      const a = M.players.find(p => p.team === attackers && standing(p) && Math.hypot(p.x - x, p.y - y) < 8);
      if (a) { giveBall(a, 'pickup'); return tryScored(a); }
    }
    if (x < G.DEAD[0] - 60 || x > G.DEAD[1] + 60) return stop('DEAD BALL', 1.4, () => startKickoff(1 - b.team, 'dropout'));
  }
}

/* ---- the step ---- */
TT.sim.step = (dt, intents) => {
  if (!M || M.frozen) return;
  dt *= TUNE.v.gameSpeed;
  M.t += dt; M.phaseT += dt; if (M.ph.subT != null) M.ph.subT += dt;
  M.intents = intents;
  TT.sim.timers(dt);
  if (M.phaseT > (WATCHDOG[M.phase] || 9999)) { M.watchdogs++; emit('watchdog', { phase: M.phase, sub: M.sub }); watchdogRescue(); }
  M.megaBoot[0] = Math.max(0, M.megaBoot[0] - dt); M.megaBoot[1] = Math.max(0, M.megaBoot[1] - dt);
  if (M.pendingFoul) { const f = M.pendingFoul; f.t -= dt; if (f.t <= 0) { M.pendingFoul = null; const p = pl(f.pid); if (M.phase === 'play' && refSees(p)) callFoul(p, f.kind, f.card, f.victim >= 0 ? pl(f.victim) : null); else if (M.phase === 'play') { addHype(p.team, 8); emit('cheapUnseen', { pid: p.id, kind: f.kind }); } } }
  switch (M.phase) {
    case 'walkout': walkoutStep(dt); break;
    case 'kickoff': kickoffStep(dt); playersStep(dt, true); break;
    case 'play': playStep(dt); break;
    case 'ruck': TT.sp.ruckStep(dt); playersStep(dt); ballStep(dt); break;
    case 'scrum': TT.sp.scrumStep(dt); playersStep(dt, true); break;
    case 'lineout': TT.sp.lineoutStep(dt); playersStep(dt, true); break;
    case 'penalty': TT.sp.penaltyStep(dt); playersStep(dt, true); break;
    case 'setkick': TT.sp.setkickStep(dt); playersStep(dt, true); ballStep(dt); break;
    case 'try': tryStep(dt); playersStep(dt, true); break;
    case 'stop': stopStep(dt); playersStep(dt, true); ballStep(dt); break;
    case 'half': halfStep(dt); break;
    case 'full': playersStep(dt, true); break;
  }
  refStep(dt);
  clockStep(dt);
  if (M.phase === 'play' || M.phase === 'ruck') TT.arc.step(dt);
  else TT.arc.idle(dt);
  if (M.useIt) useItStep(dt);
};
function watchdogRescue() {
  const b = M.ball;
  if (M.phase === 'play') return;
  if (M.phase === 'full' || M.phase === 'half') return;
  // resolve whatever stalled by restarting with a scrum at the ball
  b.st = 'dead';
  const team = M.possession;
  scrum(team, clamp(b.x, G.X0 + 51, G.X1 - 51), clamp(b.y, G.Y0 + 51, G.Y1 - 51), 'watchdog');
}
function walkoutStep(dt) {
  // both teams jog out to their kick-off spots; captains meet; skippable
  const team = M.kickoffTeam, d = dirOf(team);
  for (const p of M.players) {
    const own = p.team === team, dd = dirOf(p.team);
    const spots = own ? [G.CX - d * 14, G.CY + [-200, -60, 60, -130, 0, 130, 200][p.idx]] : [G.CX + d * [120, 120, 120, 210, 300, 250, 250][p.idx], G.CY + [-70, 0, 70, -40, 0, 140, -150][p.idx]];
    const tx = spots[0], ty = spots[1], dx = tx - p.x, dy = ty - p.y, m = Math.hypot(dx, dy);
    const sp = m > 4 ? 75 : 0; p.vx = dx / (m || 1) * sp; p.vy = dy / (m || 1) * sp; p.x += p.vx * dt; p.y += p.vy * dt;
    p.facing = m > 4 ? Math.atan2(dy, dx) : (dd > 0 ? 0 : PI);
  }
  const skip = Object.values(M.intents || {}).some(it => it && (it.p.x || it.p.ci));
  if (M.phaseT > 5.5 || skip || M.o.attract && M.phaseT > 3) startKickoff(M.kickoffTeam);
}
function stopStep(dt) {
  for (const p of M.players) if (isFree(p)) { p.vx *= Math.exp(-4 * dt); p.vy *= Math.exp(-4 * dt); }
  if (M.phaseT >= (M.ph.secs || 1.5)) { const n = M.ph.next; if (M.ph.noHooter) n(); else afterStop(n); }
}
function tryStep() {
  const ph = M.ph;
  if (M.phaseT < 2.6) return;
  if (ph.ended) return fullTime();
  if (ph.how === 'penaltyTry') return afterStop(() => startKickoff(ph.team));
  if (M.drill && M.drill.noConversion) return;
  TT.sp.startSetKick(ph.team, 'conv', ph.y);
}
function halfStep() {
  const skip = Object.values(M.intents || {}).some(it => it && it.p.x);
  if (M.phaseT > 7 || (skip && M.phaseT > 1.2) || M.o.attract) {
    M.half = 2; M.clock = 0; M.hooter = false;
    for (const p of M.players) if (p.st === 'binned' || p.st === 'off') { /* stays */ } else resetPlayer(p);
    startKickoff(1);
  }
}
function useItStep(dt) {
  const u = M.useIt, h = holder();
  if (M.phase !== 'play' || !h || h.id !== u.pid || Math.hypot(h.x - u.x, h.y - u.y) > 14) { M.useIt = null; return; }
  u.t += dt;
  if (u.t > 3) { M.useIt = null; const t = h.team; stop('USE IT!', 1.4, () => scrum(1 - t, h.x, h.y, 'useIt'), { call: 'USE IT!' }); }
}

/* ---- open play: every player's step, the ball, the laws ---- */
function playStep(dt) {
  playersStep(dt);
  ballStep(dt);
  if (M.phase !== 'play') return;
  lawsStep();
  advStep(dt);
  if (M.phase === 'play' && M.hooter && M.hooterT > 30 && M.ball.st === 'held' && pl(M.ball.holder).st === 'tackled') endHalf();
  const h = holder(); if (h) { const g = (h.x - (h._mx == null ? h.x : h._mx)) * dirOf(h.team); if (g > 0) { M.stats[h.team].metres += g; h.metres += g; } h._mx = h.x; }
}

/* ==== 11-players.js ==== */
/* ---- PLAYERS: movement, turbo, the buttons (pass, kick, step, fend, tackle, big hit, dive, super) and contact ---- */
const NO_INTENT = { mx: 0, my: 0, turbo: false, p: {}, h: {}, r: {}, aim: null, click: -1 };

/** every player's step: states and timers, then (if free and play is live) the intent's actions and movement.
 *  hold: play isn't live (set pieces, stoppages): no actions, players walk to their spots (the AI's targets) */
function playersStep(dt, hold) {
  for (const p of M.players) {
    if (!onField(p)) continue;
    const it = (M.intents && M.intents[p.id]) || NO_INTENT;
    p.stT += dt; p.cool = Math.max(0, p.cool - dt); p.evade = Math.max(0, p.evade - dt); p.fendT = Math.max(0, p.fendT - dt);
    p.sideCd = Math.max(0, p.sideCd - dt); p.fendCd = Math.max(0, p.fendCd - dt); p.xTapT += dt; p.flash = Math.max(0, p.flash - dt);
    p.toasted = Math.max(0, p.toasted - dt); p.zapped = Math.max(0, p.zapped - dt);
    if (p.fire > 0) { p.fire -= dt; if (p.fire <= 0) { p.fire = 0; emit('fireOut', { pid: p.id }); } }
    if (p.power) { p.power.t -= dt; if (p.power.t <= 0) { emit('powerupEnd', { pid: p.id, kind: p.power.kind }); p.power = null; } }
    if (p.superT > 0) { p.superT -= dt; if (p.superT <= 0) { p.superK = ''; p.homing = -1; emit('superEnd', { pid: p.id }); } }
    if (onMud(p.x, p.y) && (p.st === 'tackled' || p.st === 'ground' || Math.hypot(p.vx, p.vy) > 40)) p.mud = Math.min(.6, p.mud + dt * (p.st === 'run' ? .01 : .05));
    stateStep(p, dt);
    if (p.st === 'tackled' && M.ball.holder === p.id && p.stT < .15 && M.phase === 'play' && !p.offloaded) {   // the offload window
      const side = it.p.l1 || it.r.l1 ? -1 : it.p.r1 || it.r.r1 ? 1 : 0;
      if (side) { const r = receivers(p, side).concat(receivers(p, -side)).find(q => Math.hypot(q.x - p.x, q.y - p.y) < 50); p.offloaded = true; if (r) { passTo(p, r, false); M.stats[p.team].offloads++; addHype(p.team, 6); emit('offload', { pid: p.id, to: r.id }); } }
    }
    if (p.st !== 'tackled') { p.offloaded = false; p.offTry = false; }
    if (isFree(p) && !hold && M.phase === 'play') { actions(p, it, dt); }
    if (isFree(p) && !hold) move(p, it, dt, hold);
    else if (p.st !== 'launched') { p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); }
    if (p.st === 'launched') launchedStep(p, dt);
    else { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (p.st !== 'launched' && p.st !== 'diving') p.z = Math.max(0, p.z + p.vz * dt), p.vz = p.z > 0 ? p.vz - 700 * dt : 0;
    // the stadium's bounds
    p.x = clamp(p.x, G.DEAD[0] - 40, G.DEAD[1] + 40); p.y = clamp(p.y, G.Y0 - 40, G.Y1 + 44);
  }
  separate();
  if (M.phase === 'play' && !hold) contactStep(dt);
}
TT.sim.playersStep = (dt, hold) => playersStep(dt, hold);

/** the timed states: falls, get-ups, the end of each move */
function stateStep(p, dt) {
  switch (p.st) {
    case 'pass': if (p.stT > .22) p.st = 'run'; break;
    case 'kick': if (p.stT > .35) p.st = 'run'; break;
    case 'sidestep': if (p.stT > .3) p.st = 'run'; break;
    case 'spin': if (p.stT > .45) { p.st = 'run'; p.vx *= .85; p.vy *= .85; } break;
    case 'fend': if (p.stT > .45) p.st = 'run'; break;
    case 'tackling': if (p.stT > .35) { p.st = 'ground'; p.stT = 0; p.stun = Math.max(p.stun, .45); } break;
    case 'diving': {
      const u = p.stT / .35; p.z = Math.max(0, Math.sin(clamp(u, 0, 1) * PI) * 5);
      if (p.stT > .35) { p.z = 0; p.st = 'ground'; p.stT = 0; p.stun = Math.max(p.stun, p.diveMiss ? 1.2 : .4); }
      break;
    }
    case 'ground': case 'stunned': if (p.stT > Math.max(.3, p.stun)) { p.st = 'getup'; p.stT = 0; } break;
    case 'getup': if (p.stT > .45) { p.st = 'run'; p.stT = 0; p.stun = 0; } break;
    case 'tackled':
      if (M.phase === 'play' && p.stT > .5 && M.ball.holder === p.id) TT.sp.startRuck(p);
      else if (M.phase === 'play' && p.stT > 1 && M.ball.holder !== p.id) { p.st = 'getup'; p.stT = 0; }
      break;
    case 'held': {   // the boss, held by one tackler: slowed, dragging him; a second tackle brings him down, else he shrugs it off
      p.held -= dt; const by = pl(p.heldBy);
      if (by && by.st === 'tackling') { by.x = p.x - Math.cos(p.facing) * 8; by.y = p.y - Math.sin(p.facing) * 8; by.stT = 0; }
      if (p.held <= 0) { p.st = 'run'; p.stT = 0; if (by) { knockDown(by, .9, p); by.vx = -Math.cos(p.facing) * 120; by.vy = -Math.sin(p.facing) * 120; } emit('shrug', { pid: p.id }); }
      break;
    }
    case 'celebrate': p.vx *= .9; p.vy *= .9; if (M.phase !== 'try' && M.phase !== 'full' && p.stT > 3) p.st = 'run'; break;
  }
}
function launchedStep(p, dt) {
  const L = p.launch; L.t += dt;
  p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 500 * dt; p.z += p.vz * dt;
  if (L.t > .1) for (const q of M.players) {   // a body in flight flattens whoever it lands on
    if (q === p || !standing(q) || L.hit[q.id]) continue;
    if (Math.hypot(q.x - p.x, q.y - p.y) < 10 && p.z < 30) { L.hit[q.id] = 1; knockDown(q, 1, p); emit('skittle', { pid: q.id }); if (M.ball.holder === q.id) spillBall(q, .5); }
  }
  if (Math.hypot(M.ref.x - p.x, M.ref.y - p.y) < 10 && p.z < 30 && M.ref.down <= 0 && !L.ref) { L.ref = 1; refDown(); }
  if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx *= .5; p.vy *= .5; p.st = 'ground'; p.stT = 0; p.stun = 1.1; emit('land', { pid: p.id, x: p.x, y: p.y, dist: Math.hypot(p.x - L.x0, p.y - L.y0) }); M.bestHit = Math.max(M.bestHit, Math.hypot(p.x - L.x0, p.y - L.y0)); }
}
function refDown() { M.ref.down = 8; emit('refDown', {}); }
TT.sim.refDown = () => refDown();

/** movement: the stick toward a speed, turbo, mud, power-ups; the AI and humans alike */
function move(p, it, dt, hold) {
  const carrying = M.ball.holder === p.id;
  let mx = it.mx || 0, my = it.my || 0;
  if (p.superK === 'hurricane') { const h = holder(); if (h && h.team !== p.team) { const dx = h.x - p.x, dy = h.y - p.y, dd = Math.hypot(dx, dy) || 1; mx = dx / dd; my = dy / dd; } }
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  if (p.st === 'kick' && p.kickHold > 0) { /* running straight while the meter fills */ }
  let top = TUNE.v.runSpeed * (.8 + .04 * statOf(p, 'SPD')) * (carrying ? .96 : 1);
  let acc = TUNE.v.accel * (1.15 - .03 * Math.min(10, statOf(p, 'POW')));
  // turbo: held (or toggled by the seat), drains a tank, refills after a pause
  const unlimited = p.fire > 0 || (p.power && p.power.kind === 'pie') || cheat('infTurbo') && p.team === 0 || M.drill;
  const wantTurbo = it.turbo && m > .2 && !hold;
  if (wantTurbo && (p.turbo > 0 || unlimited)) { top *= TUNE.v.turboMult; if (!unlimited) p.turbo = Math.max(0, p.turbo - dt / TUNE.v.turboTank); p.turboIdle = 0; p.turboOn = true; }
  else { p.turboOn = false; if (wantTurbo && p.turbo <= 0 && !p.sputter) { p.sputter = 1; emit('sputter', { pid: p.id }); } if (!wantTurbo) p.sputter = 0; p.turboIdle += dt; if (p.turboIdle > .6) p.turbo = Math.min(1, p.turbo + TUNE.v.turboRegen * dt); }
  if (p.st === 'charge') top *= 1.15;
  if (p.superK === 'thunder') top *= p.data.boss ? 1.2 : 1.35;
  if (p.superK === 'hurricane' && p.homing >= 0) top *= 2;
  if (onMud(p.x, p.y)) { top *= .8; acc *= .6; }
  if (p.st === 'spin') top *= .9;
  if (hold) top *= .8;
  if (p.data.boss && p.st === 'held') top *= .4;
  const tvx = mx * top, tvy = my * top;
  p.vx = TT.approach(p.vx, tvx, acc * dt); p.vy = TT.approach(p.vy, tvy, acc * dt);
  if (m > .15 && p.st !== 'sidestep') p.facing = E.approachAng(p.facing, Math.atan2(my, mx), (carrying ? 8 : 10) * dt);
}

/** keep bodies apart (except where they bind: rucks, scrums, lineouts, the held boss) */
function separate() {
  const P = M.players;
  for (let i = 0; i < P.length; i++) {
    const a = P[i]; if (!onField(a) || a.st === 'scrum' || a.st === 'ruck' || a.st === 'lift' || a.st === 'launched') continue;
    for (let j = i + 1; j < P.length; j++) {
      const b = P[j]; if (!onField(b) || b.st === 'scrum' || b.st === 'ruck' || b.st === 'lift' || b.st === 'launched') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 8 * (a.data.boss || b.data.boss ? 1.4 : 1);
      if (d < min && d > .01) { const k = (min - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
  }
}

/* ---- the buttons ---- */
function actions(p, it, dt) {
  const carrying = M.ball.holder === p.id;
  const P = it.p || {}, H = it.h || {}, R = it.r || {};
  if (P.tri && M.hype[p.team] >= 100 && !p.superK) return startSuper(p, carrying ? 'thunder' : 'hurricane');
  if (carrying) {
    // passes: L1 up the screen, R1 down; a hold of 0.25 s is a long pass; a click on a teammate passes to him
    for (const k of ['l1', 'r1']) {
      if (H[k]) p.passHold[k] += dt;
      if (R[k] || (H[k] && p.passHold[k] > .5)) { const long = p.passHold[k] > .25; p.passHold[k] = 0; return pass(p, k === 'l1' ? -1 : 1, long); }
      if (!H[k]) p.passHold[k] = 0;
    }
    if (it.click >= 0 && pl(it.click) && pl(it.click).team === p.team && it.click !== p.id) return passTo(p, pl(it.click), false, true);
    // kicks: tap ○ grubber; hold ○ the punt meter (a drop goal in their 22 facing the posts); the mouse's right button aims
    if (H.ci) { p.kickHold += dt; if (p.st !== 'kick' || p.stT > .3) { /* meter filling */ } if (p.kickHold > 1.6) { p.kickHold = 0; return kick(p, 1, it); } }
    else if (R.ci) { const h = p.kickHold; p.kickHold = 0; return kick(p, h < .2 ? -1 : clamp(h / .9, 0, 1), it); }
    else p.kickHold = 0;
    // ✕: a sidestep (twice quickly: a spin), or a dive over the line in the in-goal
    if (P.x) {
      const tl = tryLineOf(p.team);
      if ((p.x - tl) * dirOf(p.team) > 0) return tryDive(p);
      if (p.xTapT < .25 && p.st === 'sidestep') return spin(p);
      p.xTapT = 0;
      if (p.sideCd <= 0) return sidestep(p, it);
    }
    if (P.sq && p.fendCd <= 0) return fend(p);
    return;
  }
  // without the ball: ✕ tackles (tap) or charges a big hit (held, let go in range); □ dives; switching is the seat's
  if (H.x || P.x) {
    if (p.st !== 'charge') { p.st = 'charge'; p.stT = 0; p.charge = 0; }
    p.charge += dt;
  }
  if (p.st === 'charge' && !H.x && !P.x) {
    const c = p.charge; p.st = 'run'; p.charge = 0;
    if (c < .2) tackleTry(p, 'tackle'); else tackleTry(p, 'big', clamp(c / TUNE.v.bigHitCharge, 0, 1), c > 1.2);
    return;
  }
  if (P.sq && p.st !== 'charge') return diveTackle(p);
}
TT.sim.actions = (p, it, dt) => actions(p, it, dt);

/** the receivers a pass can reach: not in front, near, standing; side -1 up the screen (smaller y), +1 down */
function receivers(p, side) {
  const d = dirOf(p.team);
  return M.players.filter(q => q.team === p.team && q !== p && standing(q) && isFree(q) && (q.x - p.x) * d <= 4 && Math.hypot(q.x - p.x, q.y - p.y) < 220 && (side == null || Math.sign(q.y - p.y) === side))
    .sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y));
}
TT.sim.receivers = (p, side) => receivers(p, side);
function pass(p, side, long) {
  let list = receivers(p, side);
  if (!list.length && TT.settings.passAssist !== 'Off' && p.ctl >= 0) list = receivers(p, -side);
  if (!list.length && p.ctl < 0) list = receivers(p, null);
  if (!list.length) return dummy(p, side);
  const near = list.filter(q => Math.abs(q.y - p.y) < 110);
  const r = long ? (list[1] || list[0]) : (near[0] || list[0]);
  passTo(p, r, long && list.length > 1);
}
function passTo(p, r, long, clicked) {
  const b = M.ball, d = dirOf(p.team);
  const speed = long ? 300 : TUNE.v.passSpeed, dist = Math.hypot(r.x - p.x, r.y - p.y), t = dist / speed;
  let tx = r.x + r.vx * t * .9, ty = r.y + r.vy * t * .9;
  if (!clicked && (tx - p.x) * d > 0) tx = p.x - d * 2;   // (assisted passes never go forward: led flat at worst)
  const fl = Math.hypot(tx - p.x, ty - p.y) / speed;
  const v = { vx: (tx - b.x) / fl, vy: (ty - b.y) / fl, vz: BALL_G * fl / 2 };
  launchBall(p, v.vx, v.vy, v.vz, 'pass', { target: r.id, long: !!long, offload: p.st === 'tackled' });
  b.forward = (v.vx - p.vx) * d > 4 + Math.abs(p.vx) * .25 && !M.drill || ((v.vx - p.vx) * d > 4 && clicked);
  if (b.forward) emit('forwardThrown', { pid: p.id });
  if (p.st !== 'tackled') { p.st = 'pass'; p.stT = 0; }
  p.cool = .25; p.passSide = Math.sign(r.y - p.y);
  if (M.useIt && M.useIt.pid === p.id) M.useIt = null;
  if (p.superK === 'thunder') { p.superK = ''; p.superT = 0; emit('superEnd', { pid: p.id }); }
  emit('pass', { pid: p.id, to: r.id, long: !!long, offload: p.st === 'tackled' });
}
function dummy(p, side) {
  p.st = 'pass'; p.stT = 0; p.cool = .3; p.passSide = side; let sold = 0;
  for (const q of M.players) if (q.team !== p.team && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 40 && rnd() < .4) { q.st = 'stunned'; q.stT = 0; q.stun = .3; q.vx = 0; q.vy = side * 60; sold++; }
  if (sold) addHype(p.team, 4 * sold);
  emit('dummy', { pid: p.id, sold });
}
function sidestep(p, it) {
  const f = p.facing; let side = 0;
  if (Math.hypot(it.mx, it.my) > .3) { const cross = Math.cos(f) * it.my - Math.sin(f) * it.mx; side = cross >= 0 ? 1 : -1; }
  else { const o = nearestFoe(p); side = o ? ((Math.cos(f) * (o.y - p.y) - Math.sin(f) * (o.x - p.x)) > 0 ? -1 : 1) : 1; }
  const nx = -Math.sin(f) * side, ny = Math.cos(f) * side, pw = TUNE.v.sidestepPower;
  p.vx += nx * pw; p.vy += ny * pw; p.st = 'sidestep'; p.stT = 0; p.evade = TUNE.v.sidestepEvade; p.evadeKind = 'step'; p.sideCd = .6; p.stepSide = side;
  emit('stepMove', { pid: p.id });
}
function spin(p) { p.st = 'spin'; p.stT = 0; p.evade = .4; p.evadeKind = 'spin'; p.sideCd = .8; emit('spinMove', { pid: p.id }); }
function fend(p) { p.st = 'fend'; p.stT = 0; p.fendT = TUNE.v.fendWindow; p.fendCd = .8; emit('fendMove', { pid: p.id }); }
function tryDive(p) {
  p.st = 'diving'; p.stT = 0; p.diveMiss = false; p.vx = Math.cos(p.facing) * 120; p.vy = Math.sin(p.facing) * 120;
  addHype(p.team, 3); emit('tryDive', { pid: p.id });
  tryScored(p, 'try');
}
const nearestFoe = p => { let best = null, bd = 1e9; for (const q of M.players) if (q.team !== p.team && standing(q)) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } } return best; };
TT.sim.nearestFoe = p => nearestFoe(p);

/** kicks: power -1 a grubber; 0..1 a punt (stick back: a bomb; in their 22 facing the posts: a drop goal) */
function kick(p, power, it) {
  const d = dirOf(p.team), tl = tryLineOf(p.team), toPosts = Math.hypot(tl - p.x, G.CY - p.y), mega = M.megaBoot[p.team] > 0;
  const back = (it.mx || 0) * d < -.5, across = Math.abs(it.my || 0) > .6;
  let aimA = d > 0 ? 0 : PI;
  if (it.aim) aimA = Math.atan2(it.aim[1] - p.y, it.aim[0] - p.x);
  else if (Math.hypot(it.mx, it.my) > .3 && !back) aimA = Math.atan2(it.my, it.mx);
  // keep the aim in the forward cone
  const fwd = d > 0 ? 0 : PI; aimA = fwd + clamp(TT.angDiff(fwd, aimA), -1.22, 1.22);
  M.ball.x = p.x + Math.cos(p.facing) * 4; M.ball.y = p.y + Math.sin(p.facing) * 4;
  p.st = 'kick'; p.stT = 0; p.cool = .4; M.stats[p.team].kicks++;
  if (M.useIt && M.useIt.pid === p.id) M.useIt = null;
  if (p.superK === 'thunder') { p.superK = ''; p.superT = 0; emit('superEnd', { pid: p.id }); }
  const kck = statOf(p, 'KCK'), fire = p.fire > 0 ? 1.2 : 1;
  if (power < 0) {   // a grubber along the ground
    const a = fwd + clamp(TT.angDiff(fwd, aimA), -.8, .8), dist = U(140, 200) * fire * (mega ? 1.3 : 1);
    M.ball.z = 3; launchBall(p, Math.cos(a) * dist * .9, Math.sin(a) * dist * .9, 40, 'grubber');
    emit('kick', { pid: p.id, kind: 'grubber' }); return;
  }
  const inZone = ((tl - p.x) * d < 225 + 20 || toPosts < 300) && Math.abs(TT.angDiff(p.facing, Math.atan2(G.CY - p.y, tl - p.x))) < 1.2;
  if (inZone && !back && !(across && !it.aim) && !(it.aim && Math.abs(TT.angDiff(aimA, Math.atan2(G.CY - p.y, tl - p.x))) > .5)) {   // a drop goal
    const a = Math.atan2(G.CY - p.y, tl - p.x) + (it.my || 0) * .14 * d + (power > .9 || mega ? 0 : U(-1, 1) * (11 - kck) * PI / 180);
    const dist = lerp(160, TUNE.v.kickMax, power) * (.75 + .03 * kck) * (mega ? 1.6 : 1) * fire;
    M.ball.z = 4; const sp = Math.sqrt(BALL_G * dist / Math.sin(2 * .62));
    launchBall(p, Math.cos(a) * Math.cos(.62) * sp, Math.sin(a) * Math.cos(.62) * sp, Math.sin(.62) * sp, 'drop', { goalTeam: p.team });
    M.ball.goalCheck = { team: p.team, kind: 'drop', pid: p.id };
    emit('kick', { pid: p.id, kind: 'drop' }); return;
  }
  const sweet = power > .9;
  let dist = lerp(120, TUNE.v.kickMax, power) * (.75 + .03 * kck) * (sweet ? 1.08 : 1) * fire * (mega ? 1.6 : 1);
  let apex = lerp(60, 110, power), kind = 'kick';
  if (back) { apex = 150; dist *= .5; kind = 'bomb'; }
  const a = aimA + (sweet || mega ? 0 : U(-1, 1) * (11 - kck) * PI / 180);
  const tx = p.x + Math.cos(a) * dist, ty = p.y + Math.sin(a) * dist;
  const v = arcTo(p.x, p.y, 4, tx, ty, 0, apex);
  M.ball.z = 4; launchBall(p, v.vx, v.vy, v.vz, kind);
  emit('kick', { pid: p.id, kind, mega });
  if (mega) M.megaBoot[p.team] = 0;
}
TT.sim.kick = (p, power, it) => kick(p, power, it || NO_INTENT);

/* ---- contact ---- */
/** a tackle attempt by p: 'tackle' (a tap), 'big' (a charged hit: charge 0..1, over: held too long, a high shot), 'dive' */
function tackleTry(p, kind, charge = 0, over = false) {
  const h = holder();
  const range = kind === 'big' ? 18 : kind === 'dive' ? TUNE.v.diveRange : TUNE.v.tackleRange;
  const inFront = q => { const a = Math.atan2(q.y - p.y, q.x - p.x); return Math.abs(TT.angDiff(p.facing, a)) < 1.25; };
  if (h && h.team !== p.team && Math.hypot(h.x - p.x, h.y - p.y) < range + (h.data.boss ? 4 : 0) && (inFront(h) || Math.hypot(h.x - p.x, h.y - p.y) < 8)) return resolveTackle(p, h, kind, charge, over);
  // a cheap shot: an opponent without the ball in reach
  if (kind !== 'dive') {
    const v = M.players.find(q => q.team !== p.team && standing(q) && q !== h && Math.hypot(q.x - p.x, q.y - p.y) < 14 && inFront(q));
    if (v) return cheapShot(p, v);
  }
  // a whiff: a lunge at nothing (a missed big hit sprawls)
  if (kind === 'big') { p.st = 'tackling'; p.stT = 0; p.stun = 1; p.vx = Math.cos(p.facing) * 150; p.vy = Math.sin(p.facing) * 150; emit('whiff', { pid: p.id }); }
  else { p.st = 'tackling'; p.stT = .15; p.vx = Math.cos(p.facing) * 110; p.vy = Math.sin(p.facing) * 110; }
}
TT.sim.tackleTry = (p, k, c, o) => tackleTry(p, k, c, o);
function diveTackle(p) {
  p.st = 'diving'; p.stT = 0; p.vx = Math.cos(p.facing) * 170; p.vy = Math.sin(p.facing) * 170; p.diveMiss = true;
  emit('diveStart', { pid: p.id });
  const h = holder();
  if (h && h.team !== p.team && Math.hypot(h.x - p.x, h.y - p.y) < TUNE.v.diveRange && Math.abs(TT.angDiff(p.facing, Math.atan2(h.y - p.y, h.x - p.x))) < 1) { p.diveMiss = false; resolveTackle(p, h, 'dive', 0, false); }
}
function tackleChance(p, c, kind) {
  let ch = TUNE.v.tackleBase * (.9 + .02 * statOf(p, 'TKL') - .02 * Math.min(10, statOf(c, 'POW')));
  const a = Math.atan2(p.y - c.y, p.x - c.x), front = Math.abs(TT.angDiff(c.facing, a)) < 1.1;
  if (!front) ch += .1;
  if (c.turboOn) ch -= .05;
  if (p.ctl < 0 && M.diff[p.team]) ch += M.diff[p.team].tackleBonus;
  if (onMud(c.x, c.y)) ch += .1;
  if (kind === 'big') ch = .7 + .2 * (p.chargeU || 0);
  if (c.fire > 0) ch *= .6;
  if (c.power && c.power.kind === 'grease') ch *= .3;
  if (p.power && p.power.kind === 'iron') ch = 1;
  if (M.drill && M.drill.easyTackles && p.ctl >= 0) ch = Math.max(ch, .95);
  return clamp(ch, 0, 1);
}
TT.sim.tackleChance = (p, c, k) => tackleChance(p, c, k);
function resolveTackle(p, c, kind, charge, over) {
  p.chargeU = charge;
  const d = Math.hypot(c.x - p.x, c.y - p.y);
  // the carrier's moves: a sidestep or spin makes it whiff (a spin beats big hits too); a fend may beat it
  if (c.evade > 0 && (kind !== 'big' || c.evadeKind === 'spin') && !(p.superK === 'hurricane')) {
    p.st = 'tackling'; p.stT = 0; p.stun = .5; p.vx = Math.cos(p.facing) * 100; p.vy = Math.sin(p.facing) * 100;
    addHype(c.team, 6); M.stats[p.team].missed++; emit(c.evadeKind === 'spin' ? 'spin' : 'sidestep', { pid: c.id, beat: p.id }); return;
  }
  if ((cheat('god') && c.team === 0 && c.ctl >= 0) || c.superK === 'thunder') {   // unstoppable: tacklers bounce off and fly
    launch(p, c, .5); addHype(c.team, 3); emit('bounceOff', { pid: p.id, by: c.id }); return;
  }
  if (c.fendT > 0 && kind !== 'dive' && p.superK !== 'hurricane') {
    let beat = TUNE.v.fendBeat + .03 * (Math.min(10, statOf(c, 'POW')) - statOf(p, 'TKL'));
    if (kind === 'big') beat /= 2; if (c.fire > 0) beat *= 1.5; if (c.power && c.power.kind === 'iron') beat = 1; if (p.power && p.power.kind === 'iron') beat = 0;
    if (rnd() < beat) {
      const k = c.data.boss ? 40 : 20, a = Math.atan2(p.y - c.y, p.x - c.x);
      p.x += Math.cos(a) * k * .5; p.y += Math.sin(a) * k * .5; p.vx = Math.cos(a) * k * 4; p.vy = Math.sin(a) * k * 4;
      p.st = 'ground'; p.stT = 0; p.stun = .8; addHype(c.team, 6); M.stats[p.team].missed++;
      emit('fend', { pid: c.id, beat: p.id }); return;
    }
  }
  const monster = c.st !== 'held' && (kind === 'big' && charge >= .99) || p.superK === 'hurricane' || (p.power && p.power.kind === 'iron' && kind !== 'dive') || (p.data.boss && kind !== 'dive');
  const ok = p.superK === 'hurricane' || c.st === 'held' || rnd() < tackleChance(p, c, monster ? 'big' : kind);
  if (!ok) {   // a broken tackle
    p.st = 'tackling'; p.stT = .1; p.stun = .6; M.stats[p.team].missed++;
    c.vx *= .6; c.vy *= .6; addHype(c.team, 5);
    emit('brokenTackle', { pid: c.id, by: p.id }); return;
  }
  // the boss is only held by the first: a second tackle within the hold brings him down
  if (c.data.boss && c.st !== 'held' && kind !== 'big' && p.superK !== 'hurricane') {
    c.st = 'held'; c.held = 1.2; c.heldBy = p.id; p.st = 'tackling'; p.stT = 0; emit('gangHold', { pid: c.id, by: p.id }); return;
  }
  M.stats[p.team].tackles++; p.tackles++; addHype(p.team, monster ? 16 : kind === 'big' ? 10 : 4);
  if (c.st === 'held') { const first = pl(c.heldBy); if (first && first !== p) knockDown(first, .6, null); emit('gangTackle', { pid: c.id, by: p.id }); }
  const high = over && kind === 'big' && Math.abs(TT.angDiff(c.facing + PI, Math.atan2(p.y - c.y, p.x - c.x))) < 1.1;
  if (monster || kind === 'big') {
    M.stats[p.team].bigHits++;
    if (monster) { M.stats[p.team].monsters++; p.monsters++; }
    if (p.superK === 'hurricane') { p.superK = ''; p.superT = 0; p.homing = -1; emit('superEnd', { pid: p.id }); for (const q of M.players) if (q !== c && q !== p && standing(q) && Math.hypot(q.x - c.x, q.y - c.y) < 30) knockDown(q, 1, p); }
    emit(monster ? 'monsterHit' : 'bigHit', { pid: p.id, victim: c.id, x: c.x, y: c.y });
    if (monster) {
      launch(c, p, TUNE.v.bigHitLaunch);
      if (rnd() < TUNE.v.spillChance || p.superK === 'hurricane' || M.drill) spillBall(c, 1);
      else { M.ball.st = 'held'; }
      p.st = 'run'; p.stT = 0; p.vx *= .2; p.vy *= .2; p.flex = 1;
      if (high) foul(p, 'high', true, c);
      if (M.ball.st === 'held' && M.ball.holder === c.id) { /* he holds on in flight: a tackle when he lands */ c.landTackle = true; }
      return;
    }
  }
  // a completed tackle: both go down; a ruck follows (offload window first)
  c.st = 'tackled'; c.stT = 0; c.vx = (c.vx + p.vx) * .25; c.vy = (c.vy + p.vy) * .25; c.lastHitBy = p.id;
  p.st = kind === 'dive' ? 'diving' : 'tackling'; if (kind !== 'dive') p.stT = .12; p.diveMiss = false;
  if (kind === 'dive') emit('diveTackle', { pid: p.id, victim: c.id });
  emit('tackle', { pid: p.id, victim: c.id, kind, x: c.x, y: c.y, d });
  if (high) foul(p, 'high', true, c);
  // tackled over the line: a try all the same (arcade law)
  if ((c.x - tryLineOf(c.team)) * dirOf(c.team) > 0 && M.phase === 'play') tryScored(c, 'try');
}
function launch(c, by, k) {
  const a = Math.atan2(c.y - by.y, c.x - by.x), dist = U(30, 60) * k;
  if (M.ball.holder === c.id && !c.landTackle) { /* decided by the caller */ }
  c.st = 'launched'; c.stT = 0; c.launch = { t: 0, x0: c.x, y0: c.y, hit: { [by.id]: 1 }, flip: rnd() < .5 ? 1 : -1 };
  const vz = Math.sqrt(2 * 500 * U(20, 40) * Math.min(2, k)), tFly = 2 * vz / 500;
  c.vx = Math.cos(a) * dist / tFly; c.vy = Math.sin(a) * dist / tFly; c.vz = vz; c.z = 1;
  c.lastHitBy = by.id;
}
TT.sim.launch = (c, by, k) => launch(c, by, k);
function spillBall(c, k) {
  const b = M.ball, d = dirOf(c.team), fwd = rnd() < .5;
  b.st = 'loose'; b.holder = -1; b.from = c.id; b.team = c.team; b.t = 0; b.tried = { [c.id]: true }; b.kind = 'spill';
  b.vx = (fwd ? d : -d) * U(40, 90) * k + c.vx * .3; b.vy = U(-60, 60); b.vz = U(60, 120); b.z = Math.max(b.z, 12);
  M.lastTouch = c.team;
  emit('spill', { pid: c.id });
  if (fwd && M.phase === 'play') {
    b.knockOnPending = { team: c.team, x: c.x, y: c.y, t: .6 };
  }
}
TT.sim.spillBall = (c, k) => spillBall(c, k);
function knockDown(q, secs, by) {
  if (!onField(q) || q.st === 'launched') return;
  q.st = 'ground'; q.stT = 0; q.stun = secs; q.charge = 0; if (by) q.lastHitBy = by.id;
  if (M.ball.holder === q.id && M.phase === 'play') spillBall(q, .6);
}
TT.sim.knockDown = (q, s, by) => knockDown(q, s, by);
function cheapShot(p, v) {
  knockDown(v, 1.6, p); p.cheap++;
  p.st = 'tackling'; p.stT = .2;
  emit('cheapShot', { pid: p.id, victim: v.id });
  foul(p, 'cheap', p.cheap >= 2);
}
/** each step of open play: the knock-on judgement of a spilled ball, a body landing with the ball, homing supers */
function contactStep(dt) {
  const b = M.ball;
  if (b.knockOnPending) {
    const k = b.knockOnPending; k.t -= dt;
    const gathered = b.st === 'held';
    if (gathered && pl(b.holder).team === k.team) { b.knockOnPending = null; /* regathered: play on */ }
    else if (gathered || k.t <= 0 || b.z <= 0 && b.bounces > 0) {
      b.knockOnPending = null;
      if (!gathered || pl(b.holder).team !== k.team) { const opp = 1 - k.team; if (!gathered) { emit('knockOn', { team: k.team }); return stop('KNOCK-ON', 1.6, () => scrum(opp, k.x, k.y, 'knockOn'), { call: 'KNOCK ON!' }); } }
    }
  }
  // a launched carrier who held the ball is tackled where he lands
  for (const p of M.players) if (p.landTackle && p.st === 'ground') { p.landTackle = false; if (b.holder === p.id) { p.st = 'tackled'; p.stT = .3; } }
  // the Hurricane Hit homes in on the carrier
  for (const p of M.players) if (p.superK === 'hurricane') {
    const h = holder();
    if (!h || h.team === p.team) continue;
    p.homing = h.id;
    if (Math.hypot(h.x - p.x, h.y - p.y) < 12) resolveTackle(p, h, 'big', 1, false);
  }
  // Thunder Run: tacklers in the way fly
  for (const p of M.players) if (p.superK === 'thunder' && b.holder === p.id) {
    for (const q of M.players) if (q.team !== p.team && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 11) { launch(q, p, .6); emit('bounceOff', { pid: q.id, by: p.id }); }
  }
}

/* ---- supers ---- */
function startSuper(p, kind) {
  M.hype[p.team] = 0;
  p.superK = kind; p.superT = kind === 'thunder' ? TUNE.v.superTime * (p.data.boss ? 1.5 : 1) : 2;
  if (kind === 'thunder') M.superCarry = p.id;
  emit('superStart', { pid: p.id, kind });
}
TT.sim.startSuper = (p, k) => startSuper(p, k);

/* ==== 12-setpieces.js ==== */
/* ---- SET PIECES: the breakdown, scrum, lineout, penalties and free kicks, conversions and penalty goals ---- */
TT.sp = {};
const humansOf = team => M.players.filter(p => p.team === team && p.ctl >= 0).map(p => M.intents[p.id]).filter(Boolean);
const anyPress = (list, k) => list.reduce((n, it) => n + (it.p && it.p[k] ? 1 : 0), 0);
TT.sim.humansOf = t => humansOf(t);
/** walk a player toward a spot (sets the velocity; the players' step moves him); snap: put him there */
function placeTo(p, x, y, dt, speed = 95, face) {
  const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d < 1.5) { p.vx = 0; p.vy = 0; p.x = x; p.y = y; }
  else { const s = Math.min(speed, d / dt); p.vx = dx / d * s; p.vy = dy / d * s; if (face == null) p.facing = Math.atan2(dy, dx); }
  if (face != null && d < 6) p.facing = face;
}
const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += rnd(); return (s - 2) / .58; };
const diffOf = team => M.diff[team] || TT.DIFF.Pro;

/* ---- THE RUCK ---- */
TT.sp.startRuck = c => {
  const team = c.team, d = dirOf(team), b = M.ball;
  b.st = 'placed'; b.holder = -1; b.x = c.x - d * 8; b.y = c.y; b.z = 0; b.vx = b.vy = b.vz = 0;
  const near = (t, n) => M.players.filter(p => p.team === t && p !== c && standing(p) && p.st !== 'tackling' && Math.hypot(p.x - b.x, p.y - b.y) < 80)
    .sort((a, b2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(b2.x - b.x, b2.y - b.y)).slice(0, n);
  const att = near(team, 2).filter(p => p.idx !== 3), def = near(1 - team, rnd() < .5 ? 1 : 2);
  att.forEach(p => { p.st = 'ruck'; p.stT = 0; }); def.forEach(p => { p.st = 'ruck'; p.stT = 0; });
  const sum = l => l.reduce((s, p) => s + Math.min(10, statOf(p, 'POW')), 0);
  const ph = { team, x: b.x, y: b.y, tackled: c.id, att: att.map(p => p.id), def: def.map(p => p.id), bar: .2 + .1 * (att.length - def.length), powA: sum(att), powD: sum(def), jackal: false, done: false, outT: 0 };
  // a CPU jackal: the first defender there may get his hands on it
  const first = def[0];
  if (first && first.ctl < 0 && Math.hypot(first.x - b.x, first.y - b.y) < 30 && rnd() < .15 + .3 * M.teams[first.team].style.aggression * TUNE.v.aiAggression * 2) { ph.bar -= .5; ph.jackal = true; emit('jackal', { pid: first.id }); }
  setPhase('ruck', ph);
  M.stats[team].rucks++;
  emit('ruck', { team, x: b.x, y: b.y });
};
TT.sp.ruckStep = dt => {
  const ph = M.ph, team = ph.team, d = dirOf(team), b = M.ball, T = TUNE.v.ruckTime;
  if (ph.done) return;
  // the bodies bound over the ball
  ph.att.forEach((id, i) => { const p = pl(id); if (p.st === 'ruck') { p.x = lerp(p.x, b.x - d * 7, .2); p.y = lerp(p.y, b.y + (i ? 5 : -5), .2); p.facing = d > 0 ? 0 : PI; p.vx = p.vy = 0; } });
  ph.def.forEach((id, i) => { const p = pl(id); if (p.st === 'ruck') { p.x = lerp(p.x, b.x + d * 7, .2); p.y = lerp(p.y, b.y + (i ? -5 : 5), .2); p.facing = d > 0 ? PI : 0; p.vx = p.vy = 0; } });
  const c = pl(ph.tackled); if (c.st === 'tackled') { c.stT = Math.min(c.stT, .6); }
  // the contest: weight of bodies, mashing (humans' ✕; the CPU at its rate), the jackal
  ph.bar += .02 * (ph.powA - ph.powD) * dt;
  for (const t of [team, 1 - team]) {
    const H = humansOf(t), sign = t === team ? 1 : -1;
    if (H.length) {
      ph.bar += sign * anyPress(H, 'x') * TUNE.v.mashWeight;
      if (t !== team) for (const it of H) if (it.p.sq) {
        const who = M.players.find(p => p.team === t && p.ctl >= 0 && M.intents[p.id] === it);
        if (!ph.jackal && M.phaseT < .5 && who && Math.hypot(who.x - b.x, who.y - b.y) < 32) { ph.bar -= .5; ph.jackal = true; emit('jackal', { pid: who.id }); }
        else if (who && M.phaseT >= .5 && Math.hypot(who.x - b.x, who.y - b.y) < 32 && !ph.handsCalled) { ph.handsCalled = true; if (foul(who, 'hands', false)) return; }
      }
    } else {
      const rate = (cheat('cpuFrozen') ? 0 : (M.diff[t] ? M.diff[t].cpuMash : TUNE.v.cpuMash)) * (TUNE.v.cpuMash / 9);
      ph.bar += sign * rate * TUNE.v.mashWeight * dt * U(.8, 1.2);
    }
  }
  ph.bar = clamp(ph.bar, -1, 1);
  if (M.phaseT < T) return;
  // the result: the attack's scrum-half has it at the base, or a turnover
  ph.done = true;
  const won = ph.bar >= 0, t2 = won ? team : 1 - team;
  for (const id of ph.att.concat(ph.def)) { const p = pl(id); if (p.st === 'ruck') { p.st = 'getup'; p.stT = .1; } }
  if (c.st === 'tackled') { c.st = 'getup'; c.stT = 0; }
  const cands = M.players.filter(p => p.team === t2 && standing(p) && isFree(p));
  const sh = cands.find(p => p.idx === 3 && Math.hypot(p.x - b.x, p.y - b.y) < 60) || cands.sort((a, b2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(b2.x - b.x, b2.y - b.y))[0];
  // offside: a human defender in front of the line, closing on the ball as it comes out (if the ref sees it)
  const dA = dirOf(t2), line = b.x + dA * 10;
  for (const p of M.players) if (p.team !== t2 && p.ctl >= 0 && standing(p) && (p.x - line) * dA < 0 && Math.hypot(p.x - b.x, p.y - b.y) < 30 && !ph.att.concat(ph.def).includes(p.id)) { setPhase('play'); if (sh) giveBall(sh, 'ruck'); if (foul(p, 'offside', false)) return; }
  setPhase('play');
  if (!sh) { b.st = 'loose'; return; }
  sh.x = b.x - dA * 6; sh.y = b.y; sh.facing = dA > 0 ? 0 : PI;
  giveBall(sh, won ? 'ruck' : 'turnover');
  if (won) { emit('ruckWon', { team }); M.useIt = { pid: sh.id, x: sh.x, y: sh.y, t: 0 }; }
  else { M.stats[t2].turnovers++; addHype(t2, 8); emit('ruckTurnover', { team: t2, pid: sh.id }); }
};

/* ---- THE SCRUM ---- */
function scrum(team, x, y, why) {
  x = clamp(x, G.X0 + 51, G.X1 - 51); y = clamp(y, G.Y0 + 51, G.Y1 - 51);
  M.ball.st = 'dead'; M.ball.x = x; M.ball.y = y + 12; M.ball.z = 4; M.ball.holder = -1;
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  const ph = { team, x, y, why, bar: .15, timing: [null, null], early: -1, last: [null, null], cpuSet: [null, null], cpuNext: [0, 0], pushes: [0, 0], result: null, cx: x };
  for (const t of [0, 1]) { const D = diffOf(t); ph.cpuSet[t] = rnd() < (cheat('cpuFrozen') ? 0 : D.early) * .5 ? -1 : .5 + gauss() * D.scrumSigma; }
  setPhase('scrum', ph); setSub('setup');
  M.stats[team].scrums++;
  emit('scrum', { team, x, y, why });
}
TT.sp.scrum = (t, x, y, w) => scrum(t, x, y, w);
TT.sp.scrumStep = dt => {
  const ph = M.ph, feed = ph.team, other = 1 - feed, s = M.sub, st = ph.subT;
  const off = ph.bar * 16 * dirOf(feed);   // the scrum moves with the shove
  ph.cx = lerp(ph.cx, ph.x + off, .1);
  for (const p of M.players) {
    if (!onField(p)) continue;
    const dT = dirOf(p.team), cx = ph.cx;
    let tx, ty, face = dT > 0 ? 0 : PI;
    if (p.idx < 3) { tx = cx - dT * (s === 'setup' ? 18 : 8); ty = ph.y + (p.idx - 1) * 11 * dT; }
    else if (p.idx === 3) { tx = cx - dT * (p.team === feed ? 2 : 14); ty = ph.y + 16; }
    else { tx = clamp(ph.x - dT * (60 + (p.idx - 4) * 26), G.X0 - 60, G.X1 + 60); ty = clamp(ph.y + [0, -90, 120, -150][p.idx - 3] * (ph.y > G.CY ? -1 : 1), G.Y0 + 16, G.Y1 - 16); }
    placeTo(p, tx, ty, dt, 110, face);
    if (p.idx < 3) p.st = s === 'setup' ? 'run' : 'scrum';
  }
  const H = [humansOf(0), humansOf(1)];
  const setAt = .5;
  if (s === 'setup') { if (st > 1.5) { setSub('crouch'); M.ref.call = 'CROUCH!'; M.ref.callT = .8; emit('scrumCall', { word: 'CROUCH' }); } }
  else if (s === 'crouch' || s === 'bind') {
    for (const t of [0, 1]) if (H[t].length && anyPress(H[t], 'x')) { ph.early = t; }
    if (ph.early >= 0) { const t = ph.early; emit('earlyEngage', { team: t }); for (const p of M.players) if (p.st === 'scrum') p.st = 'run'; return stop('EARLY ENGAGEMENT', 1.4, () => freeKick(1 - t, ph.x, ph.y, 'early'), { call: 'FREE KICK!', noHooter: true }); }
    if (st > .6) { if (s === 'crouch') { setSub('bind'); M.ref.call = 'BIND!'; M.ref.callT = .8; emit('scrumCall', { word: 'BIND' }); } else { setSub('set'); ph.setT0 = M.phaseT; emit('scrumCall', { word: 'SET' }); } }
  } else if (s === 'set') {
    for (const t of [0, 1]) {
      if (H[t].length) { if (ph.timing[t] == null && anyPress(H[t], 'x')) ph.timing[t] = st - setAt; }
      else if (ph.cpuSet[t] < 0) { ph.early = t; }
      else if (ph.timing[t] == null && st >= ph.cpuSet[t]) ph.timing[t] = st - setAt;
    }
    if (ph.early >= 0) { const t = ph.early; emit('earlyEngage', { team: t }); for (const p of M.players) if (p.st === 'scrum') p.st = 'run'; return stop('EARLY ENGAGEMENT', 1.4, () => freeKick(1 - t, ph.x, ph.y, 'early'), { call: 'FREE KICK!', noHooter: true }); }
    if (st > setAt + .3) {
      for (const t of [0, 1]) { const tm = ph.timing[t], v = tm == null ? 0 : Math.abs(tm) <= .12 ? .25 : Math.abs(tm) <= .25 ? .1 : 0; ph.bar += (t === feed ? v : -v); ph.grade = ph.grade || []; ph.grade[t] = v >= .25 ? 'PERFECT' : v > 0 ? 'GOOD' : 'LATE'; }
      setSub('push'); emit('scrumEngage', { grade: ph.grade });
    }
  } else if (s === 'push') {
    const sum = t => M.players.filter(p => p.team === t && p.idx < 3 && onField(p)).reduce((a, p) => a + Math.min(12, statOf(p, 'POW')), 0);
    ph.bar += .01 * (sum(feed) - sum(other)) * dt;
    for (const t of [0, 1]) {
      const sign = t === feed ? 1 : -1;
      if (H[t].length) for (const it of H[t]) for (const k of ['l1', 'r1']) if (it.p[k]) { const w = ph.last[t] === k ? .5 : 1; ph.last[t] = k; ph.bar += sign * w * TUNE.v.scrumPushWeight; ph.pushes[t]++; }
      if (!H[t].length && !cheat('cpuFrozen')) { const rate = diffOf(t).cpuMash * .8 * (TUNE.v.cpuMash / 9); ph.bar += sign * rate * TUNE.v.scrumPushWeight * dt * U(.7, 1.3); }
    }
    ph.bar = clamp(ph.bar, -1, 1);
    if (st > 2) setSub('result');
  } else if (s === 'result' && !ph.result) {
    const win = ph.bar >= 0 ? feed : other; ph.result = win;
    for (const p of M.players) if (p.st === 'scrum') { p.st = 'run'; p.stT = 0; }
    addHype(win, 6);
    if (Math.abs(ph.bar) > .85) {
      const lose = 1 - win, nearLine = Math.abs(tryLineOf(win) - ph.x) < 50 + 51;
      emit('scrumCollapse', { team: lose }); emit('scrumWon', { team: win, steal: win !== feed, collapse: true });
      if (nearLine) { const hk = M.players.find(p => p.team === win && p.idx === 1 && onField(p)) || M.players.find(p => p.team === win && onField(p)); hk.x = tryLineOf(win) + dirOf(win) * 4; hk.y = ph.y; giveBall(hk, 'restart'); emit('pushoverTry', { team: win }); return tryScored(hk, 'pushover'); }
      return stop('SCRUM PENALTY', 1.2, () => penalty(win, ph.x, ph.y, 'collapse'), { call: 'PENALTY!', noHooter: true });
    }
    const sh = M.players.find(p => p.team === win && p.idx === 3 && onField(p)) || M.players.find(p => p.team === win && onField(p) && p.idx >= 3);
    const dW = dirOf(win); sh.x = ph.cx - dW * 16; sh.y = ph.y; sh.facing = dW > 0 ? 0 : PI;
    setPhase('play'); giveBall(sh, 'scrum'); M.useIt = { pid: sh.id, x: sh.x, y: sh.y, t: 0 };
    emit('scrumWon', { team: win, steal: win !== feed });
  }
};

/* ---- THE LINEOUT ---- */
function lineout(team, x, side) {
  const ty = side ? G.Y1 : G.Y0, s = side ? -1 : 1;
  M.ball.st = 'dead'; M.ball.holder = -1;
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  const ph = { team, x, ty, s, pods: [0, 1, 2].map(k => ty + s * (51 + 16 * k)), call: [-1, -1], lock: [false, false], needle: 0, throwV: null, quality: 0, defTiming: null, result: null, cpuThrowT: U(.5, 1) };
  setPhase('lineout', ph); setSub('setup');
  M.stats[team].lineouts++;
  emit('lineout', { team, x, side });
}
TT.sp.lineout = (t, x, s) => lineout(t, x, s);
const podWeights = [.4, .35, .25];
function cpuPod(hist) { let k = 0, r = rnd() * 1, acc = 0; for (let i = 0; i < 3; i++) { acc += podWeights[i]; if (r < acc) { k = i; break; } } if (hist && hist.length >= 2 && hist[hist.length - 1] === k && hist[hist.length - 2] === k) k = (k + 1) % 3; return k; }
TT.sp.lineoutStep = dt => {
  const ph = M.ph, att = ph.team, def = 1 - att, s = M.sub, st = ph.subT;
  const H = [humansOf(0), humansOf(1)];
  // positions: the hooker on the line throwing, two lines a metre apart, backs ten metres back
  for (const p of M.players) {
    if (!onField(p)) continue;
    const dT = dirOf(p.team), mine = p.team === att;
    let tx, ty, face;
    const podY = k => ph.pods[clamp(k, 0, 2)];
    if (mine && p.idx === 1) { tx = ph.x; ty = ph.ty - ph.s * 6; face = ph.s > 0 ? PI / 2 : -PI / 2; }
    else if (p.idx < 3) {
      const myCall = ph.call[p.team] >= 0 && s !== 'setup' && s !== 'call' ? ph.call[p.team] : null;
      const slot = mine ? (p.idx === 0 ? 0 : 1) : p.idx;
      const baseY = myCall != null ? podY(myCall) + (slot === 0 ? 0 : (slot === 1 ? -ph.s * 7 : ph.s * 7)) : ph.pods[0] + ph.s * slot * 16;
      tx = ph.x - dT * 6; ty = baseY; face = dT > 0 ? 0 : PI;
    } else if (p.idx === 3) { tx = ph.x - dT * 14; ty = ph.pods[2] + ph.s * 22; face = dT > 0 ? 0 : PI; }
    else { tx = clamp(ph.x - dT * (60 + (p.idx - 3) * 18), G.X0 - 40, G.X1 + 40); ty = ph.pods[2] + ph.s * (40 + (p.idx - 3) * 60); face = dT > 0 ? 0 : PI; }
    ty = clamp(ty, G.Y0 - 10, G.Y1 + 10);
    if (p.st !== 'lift') placeTo(p, tx, ty, dt, 110, face);
  }
  const thrower = M.players.find(p => p.team === att && p.idx === 1 && onField(p)) || M.players.find(p => p.team === att && onField(p));
  if (s === 'setup') { if (st > 1.2) { setSub('call'); for (const t of [0, 1]) if (!H[t].length) { ph.call[t] = t === att ? cpuPod(M.podHist = M.podHist || []) : -2; ph.lock[t] = true; } for (const t of [0, 1]) if (H[t].length) ph.call[t] = 1; } return; }
  if (s === 'call') {
    for (const t of [0, 1]) if (H[t].length && !ph.lock[t]) {
      for (const it of H[t]) {
        const up = it.p.l1 || it.p.up, dn = it.p.r1 || it.p.down;
        const towardTouch = ph.s > 0 ? up : dn, away = ph.s > 0 ? dn : up;
        if (towardTouch) ph.call[t] = Math.max(0, ph.call[t] - 1);
        if (away) ph.call[t] = Math.min(2, ph.call[t] + 1);
        if (it.pick != null) ph.call[t] = it.pick;
        if (it.p.x || it.pick != null) ph.lock[t] = true;
      }
    }
    if ((ph.lock[0] && ph.lock[1]) || st > 2.5) {
      if (ph.call[att] < 0) ph.call[att] = 1;
      if (ph.call[def] === -2) { ph.call[def] = rnd() < diffOf(def).read ? ph.call[att] : (ph.call[att] + 1 + Math.floor(rnd() * 2)) % 3; }
      if (ph.call[def] < 0) ph.call[def] = 1;
      (M.podHist = M.podHist || []).push(ph.call[att]);
      setSub('throw'); emit('lineoutCall', { pods: ph.call.slice() });
    }
    return;
  }
  if (s === 'throw') {
    ph.needle = Math.sin(st * 4.2);
    let thrown = false;
    if (H[att].length) { if (anyPress(H[att], 'x')) thrown = true; if (st > 4) thrown = true; }
    else if (st > ph.cpuThrowT) { ph.needle = clamp(gauss() * diffOf(att).scrumSigma * 2.2, -1, 1); thrown = true; }
    if (thrown) {
      const v = Math.abs(ph.needle); ph.throwV = ph.needle;
      if (v > .7) { emit('notStraight', { team: att }); return stop('NOT STRAIGHT', 1.5, () => scrum(def, ph.x, ph.pods[1] + ph.s * 30, 'notStraight'), { call: 'NOT STRAIGHT!', noHooter: true }); }
      ph.quality = v < .35 ? 1 - v / .35 * .3 : .4;
      setSub('flight');
      const pod = ph.pods[ph.call[att]], tx = ph.x, v2 = arcTo(thrower.x, thrower.y, 18, tx, pod, 58, 14);
      M.ball.st = 'air'; M.ball.kind = 'throw'; M.ball.x = thrower.x; M.ball.y = thrower.y; M.ball.z = 18; M.ball.vx = v2.vx; M.ball.vy = v2.vy; M.ball.vz = v2.vz; M.ball.holder = -1; M.ball.tried = {};
      ph.arrive = v2.t; thrower.st = 'pass'; thrower.stT = 0;
      // the lift: each side's jumper at its pod
      for (const t of [0, 1]) { const j = M.players.find(p => p.team === t && p.idx === (t === att ? 2 : 1) && onField(p)) || M.players.find(p => p.team === t && p.idx < 3 && onField(p)); if (j) { j.st = 'lift'; j.stT = 0; j.liftT = 0; j.x = ph.x - dirOf(t) * 6; j.y = ph.pods[ph.call[t]]; } ph['jumper' + t] = j ? j.id : -1; }
      emit('lineoutThrow', { quality: ph.quality });
    }
    return;
  }
  if (s === 'flight') {
    const b = M.ball;
    b.vz -= BALL_G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.max(0, b.z + b.vz * dt);
    for (const t of [0, 1]) { const j = pl(ph['jumper' + t]); if (j && j.st === 'lift') j.z = Math.min(44, j.z + dt * 140); }
    if (H[def].length && ph.defTiming == null && anyPress(H[def], 'x')) ph.defTiming = st - ph.arrive;
    if (st >= ph.arrive) {
      const ja = pl(ph['jumper' + att]), jd = pl(ph['jumper' + def]);
      let win = att;
      if (ph.call[def] === ph.call[att] && jd) {
        const timing = ph.defTiming != null ? clamp(1 - Math.abs(ph.defTiming) / .3, 0, 1) : (H[def].length ? 0 : clamp(1 - Math.abs(gauss() * diffOf(def).scrumSigma) / .3, 0, 1));
        const sa = .6 * ph.quality + .04 * statOf(ja, 'HND') + .15, sd = .6 * timing + .04 * statOf(jd, 'HND');
        win = sd > sa ? def : att;
      }
      ph.result = win; setSub('result'); ph.winJ = (win === att ? ja : jd).id;
      emit(win === att ? 'lineoutWon' : 'lineoutSteal', { team: win });
      if (win !== att) addHype(win, 8);
    }
    return;
  }
  if (s === 'result') {
    for (const t of [0, 1]) { const j = pl(ph['jumper' + t]); if (j) { j.z = Math.max(0, j.z - dt * 160); } }
    M.ball.x = pl(ph.winJ).x; M.ball.y = pl(ph.winJ).y; M.ball.z = pl(ph.winJ).z + 34;
    if (st > .45) {
      for (const p of M.players) if (p.st === 'lift') { p.st = 'run'; p.z = 0; }
      const win = ph.result, sh = M.players.find(p => p.team === win && p.idx === 3 && onField(p)) || M.players.find(p => p.team === win && onField(p) && p.idx >= 3);
      setPhase('play'); giveBall(sh, 'lineout'); M.useIt = { pid: sh.id, x: sh.x, y: sh.y, t: 0 };
    }
  }
};

/* ---- PENALTIES AND FREE KICKS: the captain's choice ---- */
function penalty(team, x, y, kind, free) {
  x = clamp(x, G.X0 + 20, G.X1 - 20); y = clamp(y, G.Y0 + 20, G.Y1 - 20);
  const d = dirOf(team), toLine = Math.abs(tryLineOf(team) - x);
  const opts = [['tap', 'TAP & GO', 'Quick tap. Run it!']];
  if (!free && toLine <= 400) opts.push(['goal', 'KICK AT GOAL', '3 points, ' + TT.metres(Math.hypot(tryLineOf(team) - x, G.CY - y)) + ' metres out']);
  opts.push(['touch', 'KICK FOR TOUCH', 'Boot it out, our throw']);
  M.ball.st = 'dead'; M.ball.x = x; M.ball.y = y; M.ball.z = 0; M.ball.holder = -1;
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  setPhase('penalty', { team, x, y, kind, free: !!free, opts, choice: 0, cpuT: U(1, 1.6) });
  emit(free ? 'freeKick' : 'penalty', { team, kind });
  void d;
}
function freeKick(team, x, y, why) { penalty(team, x, y, why, true); }
TT.sp.penalty = (t, x, y, k) => penalty(t, x, y, k);
TT.sp.freeKick = (t, x, y, w) => freeKick(t, x, y, w);
TT.sp.penaltyStep = dt => {
  const ph = M.ph, team = ph.team, d = dirOf(team), H = humansOf(team);
  for (const p of M.players) {
    if (!onField(p)) continue;
    const mine = p.team === team;
    let tx = p.x, ty = p.y;
    if (mine) { tx = Math.min((ph.x - d * (10 + p.idx * 4)) * d, p.x * d) * d; if (p.idx === 4) { tx = ph.x - d * 6; ty = ph.y; } }
    else if ((p.x - (ph.x + d * 102)) * d < 0) tx = ph.x + d * (106 + p.idx * 5);
    placeTo(p, clamp(tx, G.DEAD[0], G.DEAD[1]), clamp(ty, G.Y0, G.Y1), dt, 120);
  }
  let pick = -1;
  if (H.length) {
    for (const it of H) {
      if (it.p.left || it.p.l1) ph.choice = (ph.choice + ph.opts.length - 1) % ph.opts.length;
      if (it.p.right || it.p.r1) ph.choice = (ph.choice + 1) % ph.opts.length;
      if (it.pick != null && it.pick < ph.opts.length) { ph.choice = it.pick; pick = it.pick; }
      if (it.p.x) pick = ph.choice;
    }
    if (M.phaseT > 15) pick = ph.choice;
  } else if (M.phaseT > ph.cpuT) {
    const toLine = Math.abs(tryLineOf(team) - ph.x), diffS = M.score[team] - M.score[1 - team], late = M.hooter || M.clock > M.halfLen * .8;
    let c = 'touch';
    if (toLine < 60 || (late && diffS < 0 && diffS > -6 && toLine < 150)) c = 'tap';
    else if (ph.opts.some(o => o[0] === 'goal') && toLine < 300 && (Math.abs(diffS) <= 7 || late)) c = 'goal';
    else if (toLine < 140) c = 'tap';
    pick = ph.opts.findIndex(o => o[0] === c); if (pick < 0) pick = 0; ph.choice = pick;
  }
  if (pick < 0 || M.phaseT < .6) return;
  const choice = ph.opts[pick][0];
  emit('choice', { team, choice });
  const kicker = M.players.find(p => p.team === team && p.idx === 4 && onField(p)) || M.players.find(p => p.team === team && onField(p) && p.idx >= 3) || M.players.find(p => p.team === team && onField(p));
  if (choice === 'tap') {
    const tp = M.players.filter(p => p.team === team && onField(p)).sort((a, b) => Math.hypot(a.x - ph.x, a.y - ph.y) - Math.hypot(b.x - ph.x, b.y - ph.y))[0];
    for (const p of M.players) if (p.team !== team && onField(p) && (p.x - (ph.x + d * 102)) * d < 0) p.x = ph.x + d * 104;
    tp.x = ph.x; tp.y = ph.y; setPhase('play'); giveBall(tp, 'restart'); emit('tapGo', { team }); return;
  }
  if (choice === 'goal') return TT.sp.startSetKick(team, 'pen', ph.y, ph.x);
  // for touch: a punt toward the nearer touchline, downfield; the kicking team throws in
  kicker.x = ph.x - d * 4; kicker.y = ph.y;
  const side = ph.y < G.CY ? -1 : 1, tx = clamp(ph.x + d * U(140, 230), G.X0 + 60, G.X1 - 60), ty = side < 0 ? G.Y0 - 30 : G.Y1 + 30;
  const v = arcTo(ph.x, ph.y, 4, tx, ty, 0, 80);
  M.ball.x = ph.x; M.ball.y = ph.y; M.ball.z = 4;
  setPhase('play');
  launchBall(kicker, v.vx, v.vy, v.vz, 'kick', { pen: true });
  kicker.st = 'kick'; kicker.stT = 0;
};

/* ---- CONVERSIONS AND PENALTY GOALS: place the tee, aim, power, the flight ---- */
TT.sp.startSetKick = (team, kind, y, x) => {
  const d = dirOf(team), tl = tryLineOf(team);
  const kicker = M.players.filter(p => p.team === team && onField(p)).sort((a, b) => statOf(b, 'KCK') - statOf(a, 'KCK'))[0];
  const human = humansOf(team).length > 0;
  let dist = kind === 'pen' ? Math.abs(tl - x) : (human ? 51 : clamp(Math.abs(y - G.CY) * .5 + 51, 51, 200));
  y = clamp(y, G.Y0 + 20, G.Y1 - 20);
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  const ph = { team, kind, y, dist, tl, kicker: kicker.id, aim: 0, power: 0, holding: false, clock: 20, sway: 0, result: null, need: 0, cpuAim: 0, cpuPower: 0, human, flightT: 0 };
  setPhase('setkick', ph); setSub(kind === 'conv' && human ? 'place' : 'aim');
  M.stats[team].convAtt += kind === 'conv' ? 1 : 0;
  updateKickSpot(ph);
  if (!human) { const kck = statOf(kicker, 'KCK'); ph.cpuAim = gauss() * ((11 - kck) * 2.4 + diffOf(team).noise * 14); ph.cpuPower = clamp(ph.need + U(-.04, .12) - (kck < 6 ? .05 : 0), .2, 1); ph.cpuT = U(1.2, 2.2); }
  emit('setKick', { team, kind });
};
function updateKickSpot(ph) {
  const d = dirOf(ph.team);
  ph.kx = ph.tl - d * ph.dist; ph.ky = ph.y;
  M.ball.st = 'placed'; M.ball.x = ph.kx; M.ball.y = ph.ky; M.ball.z = 0; M.ball.holder = -1;
  // the power the kick needs to clear the bar at the posts (simulated)
  const k = pl(ph.kicker), D = Math.hypot(ph.tl - ph.kx, G.CY - ph.ky);
  ph.D = D; ph.need = clamp(kickPowerFor(D, k), .15, 1);
}
const KICK_ANGLE = .6;
function kickSpeed(power, k) { const range = TUNE.v.kickMax * 1.15 * (.75 + .03 * statOf(k, 'KCK')) * (M.megaBoot[k.team] > 0 ? 1.6 : 1) * (k.fire > 0 ? 1.2 : 1); return Math.sqrt(BALL_G * range * clamp(power, .05, 1.05) / Math.sin(2 * KICK_ANGLE)); }
function kickPowerFor(D, k) {
  // the least power whose flight is above the bar at distance D (with a little margin)
  for (let p = .1; p <= 1.001; p += .01) { const v = kickSpeed(p, k), vh = v * Math.cos(KICK_ANGLE), vz = v * Math.sin(KICK_ANGLE), t = D / (vh * .92), z = vz * t - BALL_G * t * t / 2; if (z > G.BAR + 6) return p; }
  return 1;
}
TT.sp.kickPowerFor = (D, k) => kickPowerFor(D, k);
TT.sp.setkickStep = dt => {
  const ph = M.ph, team = ph.team, d = dirOf(team), k = pl(ph.kicker), H = humansOf(team), s = M.sub, st = ph.subT;
  // everyone stands back: the kicking side behind the ball, the defenders behind their line
  for (const p of M.players) {
    if (!onField(p)) continue;
    if (p === k) { if (s === 'place' || s === 'aim') placeTo(p, ph.kx - d * 14, ph.ky - 6, dt, 100, Math.atan2(G.CY - ph.ky, ph.tl - ph.kx)); continue; }
    if (p.team === team) placeTo(p, clamp(ph.kx - d * (40 + p.idx * 6), G.DEAD[0], G.DEAD[1]), clamp(ph.ky + (p.idx - 3) * 22, G.Y0 + 10, G.Y1 - 10), dt, 90, d > 0 ? 0 : PI);
    else placeTo(p, ph.tl + d * (14 + (p.idx % 2) * 10), G.CY + (p.idx - 3) * 26, dt, 110, d > 0 ? PI : 0);
  }
  if (s === 'place' || s === 'aim') { ph.clock -= dt; if (ph.clock <= 0 && s !== 'flight') { ph.clock = 0; return fireSetKick(ph.holding ? ph.power : .4); } }
  if (s === 'place') {
    for (const it of H) {
      if (Math.abs(it.mx) > .3) ph.dist = clamp(ph.dist - it.mx * d * 140 * dt, 51, 400);
      if (Math.abs(it.my) > .3) ph.dist = clamp(ph.dist - it.my * 140 * dt, 51, 400);
      if (it.wheel) ph.dist = clamp(ph.dist + it.wheel * 12, 51, 400);
      if (it.p.x || it.p.ci) { setSub('aim'); break; }
    }
    updateKickSpot(ph);
    return;
  }
  if (s === 'aim') {
    ph.sway = Math.sin(M.t * 1.7) * (14 - statOf(k, 'KCK')) * .6 * (M.megaBoot[team] > 0 ? .5 : 1);
    if (H.length) {
      for (const it of H) {
        if (it.kickAim != null) ph.aim = clamp(it.kickAim * 60, -60, 60);
        else ph.aim = clamp(ph.aim + (it.mx || 0) * 70 * dt, -60, 60);
        if (it.h.ci) { ph.holding = true; const u = (ph.powT = (ph.powT || 0) + dt) / 1.0; ph.power = u <= 1 ? u : Math.max(0, 2 - u); }
        else if (ph.holding) return fireSetKick(ph.power);
      }
    } else if (st > ph.cpuT) { ph.aim = ph.cpuAim; return fireSetKick(ph.cpuPower, true); }
    return;
  }
  if (s === 'flight') {
    ph.flightT += dt;
    if (ph.result == null && (M.ball.goalCheck == null || M.ball.z <= 0 && M.ball.bounces > 0 || ph.flightT > 4)) { ph.result = ph.result == null ? (M.ball.goalResult || 'miss') : ph.result; }
    if (ph.result != null) { setSub('result'); }
    return;
  }
  if (s === 'result' && st > 1.6) {
    if (ph.ended) return fullTime();
    if (ph.kind === 'conv') return afterStop(() => startKickoff(team));
    if (ph.result === 'good') return afterStop(() => startKickoff(team));
    return afterStop(() => startKickoff(1 - team, 'dropout'));
  }
};
function fireSetKick(power, cpu) {
  const ph = M.ph, k = pl(ph.kicker), team = ph.team;
  setSub('flight'); ph.power = power;
  const base = Math.atan2(G.CY - ph.ky, ph.tl - ph.kx), D = ph.D;
  const band = M.megaBoot[team] > 0 ? .12 : .06, sweet = Math.abs(power - Math.min(1, ph.need + .08)) < band || power >= ph.need && power <= ph.need + band * 2;
  const hook = sweet ? 0 : U(-1, 1) * (12 - statOf(k, 'KCK')) * PI / 180 * (cpu ? .5 : 1);
  const a = base + Math.atan2(ph.aim + (cpu ? 0 : ph.sway), D) + hook;
  const v = kickSpeed(power, k);
  M.ball.x = ph.kx; M.ball.y = ph.ky; M.ball.z = 1;
  launchBall(k, Math.cos(a) * Math.cos(KICK_ANGLE) * v, Math.sin(a) * Math.cos(KICK_ANGLE) * v, Math.sin(KICK_ANGLE) * v, 'place');
  M.ball.goalCheck = { team, kind: ph.kind, pid: k.id };
  k.st = 'kick'; k.stT = 0;
  if (M.megaBoot[team] > 0) M.megaBoot[team] = 0;
  emit('kick', { pid: k.id, kind: 'place' });
}
/** a ball at the posts: through (between the uprights, above the bar), a doink, or wide */
function goalFlight(prevX) {
  const b = M.ball, gc = b.goalCheck; if (!gc || gc.done) return;
  const tl = tryLineOf(gc.team);
  if ((prevX - tl) * (b.x - tl) > 0) { if (b.z <= 0 && b.bounces > 0) { gc.done = true; b.goalResult = 'miss'; goalResult(gc, 'miss'); } return; }
  gc.done = true;
  const off = Math.abs(b.y - G.CY);
  let res = 'miss';
  if (off < G.POST && b.z > G.BAR) res = 'good';
  else if (Math.abs(off - G.POST) < 3 && b.z > G.BAR - 4 && b.z < G.UPRIGHT) { res = 'doink'; b.vx *= -.35; b.vy *= .5; }
  else if (off < G.POST && b.z <= G.BAR && b.z > G.BAR - 4) { res = 'doink'; b.vz = Math.abs(b.vz) * .3; b.vx *= -.3; }
  b.goalResult = res;
  goalResult(gc, res);
}
function goalResult(gc, res) {
  const team = gc.team;
  if (gc.kind === 'drop') {
    emit('dropGoalResult', { team, res, pid: gc.pid });
    if (res === 'good') { const ended = score(team, 3, 'dropGoal', gc.pid); addHype(team, 10); emit('dropGoal', { team, pid: gc.pid }); M.ball.goalCheck = null; if (ended) return fullTime(); return stop('DROP GOAL!', 2, () => startKickoff(team), {}); }
    M.ball.goalCheck = null; return;
  }
  const ph = M.ph;
  if (res === 'good') {
    const pts = gc.kind === 'conv' ? 2 : 3;
    const ended = score(team, pts, gc.kind === 'conv' ? 'conversion' : 'penaltyGoal', gc.pid);
    if (gc.kind === 'conv') M.stats[team].conv++;
    addHype(team, 5);
    emit(gc.kind === 'conv' ? 'conversion' : 'penaltyGoal', { team, made: true, pid: gc.pid });
    if (ended && M.phase === 'setkick') M.ph.ended = true;
  } else emit(res === 'doink' ? 'doink' : (gc.kind === 'conv' ? 'convMiss' : 'penMiss'), { team, made: false });
  if (M.phase === 'setkick') ph.result = res;
}
/** a simulation timer (match time) */
function setTimeoutSim(s, fn) { (M.timers = M.timers || []).push({ t: s, fn }); }
TT.sim.timers = dt => { if (!M || !M.timers) return; for (const t of M.timers.slice()) { t.t -= dt; if (t.t <= 0) { M.timers.splice(M.timers.indexOf(t), 1); t.fn(); } } };

/* ==== 13-arcade.js ==== */
/* ---- THE ARCADE LAYER: power-ups thrown by the crowd, each venue's hazard, the wind ---- */
TT.arc = {};
const FLAME_GRATES = (() => { const g = []; for (const side of [0, 1]) for (let i = 0; i < 8; i++) g.push({ x: G.X0 + 70 + i * 126, y: side ? G.Y1 - 32 : G.Y0 + 32 }); return g; })();
TT.FLAME_GRATES = FLAME_GRATES;

TT.arc.idle = dt => { stepHazards(dt, false); };
TT.arc.step = dt => {
  if (M.drill && !M.drill.arcade) { stepPowerup(dt, true); return; }
  stepPowerup(dt, false);
  stepHazards(dt, true);
  stepWind(dt);
};

/* ---- power-ups ---- */
function stepPowerup(dt, only) {
  const pu = M.pu;
  if (!pu) {
    if (only) return;
    M.puT += dt;
    const every = TUNE.v.powerupEvery;
    if (!M.puNext) M.puNext = every + U(-10, 10);
    if (M.puT > Math.max(5, M.puNext)) { M.puT = 0; M.puNext = every + U(-10, 10); spawnPowerup(TT.POWERUP_IDS[Math.floor(rnd() * TT.POWERUP_IDS.length)]); }
    return;
  }
  pu.t += dt;
  if (!pu.landed) {
    const u = clamp(pu.t / pu.dur, 0, 1);
    pu.x = lerp(pu.x0, pu.tx, u); pu.y = lerp(pu.y0, pu.ty, u); pu.z = lerp(60, 0, u) + Math.sin(u * PI) * 60;
    if (u >= 1) { pu.landed = true; pu.t = 0; emit('powerupLand', { kind: pu.kind }); }
    return;
  }
  if (pu.t > 15) { M.pu = null; emit('powerupGone', {}); return; }
  for (const p of M.players) if (standing(p) && isFree(p) && Math.hypot(p.x - pu.x, p.y - pu.y) < 11) { takePowerup(p, pu.kind); M.pu = null; return; }
}
function spawnPowerup(kind, at) {
  const b = M.ball;
  let tx, ty, tries = 0;
  do { tx = U(G.X0 + 60, G.X1 - 60); ty = U(G.Y0 + 60, G.Y1 - 60); tries++; } while (Math.hypot(tx - b.x, ty - b.y) < 80 && tries < 20);
  if (at) { tx = at[0]; ty = at[1]; }
  M.pu = { kind, x0: clamp(tx + U(-80, 80), G.X0, G.X1), y0: G.Y0 - 50, tx, ty, x: tx, y: G.Y0 - 50, z: 60, t: 0, dur: at && at[2] === 0 ? .01 : 1.1, landed: false };
  emit('powerupThrow', { kind });
}
TT.arc.spawnPowerup = (k, at) => spawnPowerup(k, at);
function takePowerup(p, kind) {
  const def = TT.POWERUPS[kind];
  if (kind === 'horn') addHype(p.team, 40);
  else if (kind === 'boot') M.megaBoot[p.team] = def.time;
  else { p.power = { kind, t: def.time }; if (kind === 'pie') p.turbo = 1; }
  emit('powerupTake', { pid: p.id, kind });
}
TT.arc.takePowerup = (p, k) => takePowerup(p, k);

/* ---- the wind: a new strength and direction every 15-25 s ---- */
function stepWind(dt) {
  if (!(M.weather === 'wind' || M.weather === 'storm')) return;
  M.wind.t -= dt;
  if (M.wind.t <= 0) { M.wind.t = U(15, 25); M.wind.a = U(0, TAU); M.wind.s = U(.2, 1) * (M.weather === 'storm' ? .6 : 1); emit('windShift', { a: M.wind.a, s: M.wind.s }); }
}

/* ---- hazards: the chicken, the flame jets, lightning (and the mud, which just sits there) ---- */
function stepHazards(dt, live) {
  const hz = M.venue.hazard, k = TUNE.v.hazardEvery;
  // live hazards run on
  for (const h of M.hazards.slice()) {
    h.t += dt;
    if (h.kind === 'chicken') {
      const u = h.t / h.dur, P = h.path; if (u >= 1) { M.hazards.splice(M.hazards.indexOf(h), 1); continue; }
      h.x = lerp(P[0], P[2], u); h.y = lerp(P[1], P[3], u) + Math.sin(u * 12) * 20;
      for (const p of M.players) if (standing(p) && !h.hit[p.id] && Math.hypot(p.x - h.x, p.y - h.y) < 16) { h.hit[p.id] = 1; knockDown(p, 1.1, null); p.vx = (p.x - h.x) * 6; p.vy = (p.y - h.y) * 6; emit('clucked', { pid: p.id }); }
      if (M.ref.down <= 0 && !h.refHit && Math.hypot(M.ref.x - h.x, M.ref.y - h.y) < 16) { h.refHit = 1; refDown(); }
    } else if (h.kind === 'flame') {
      if (h.t > h.warn && h.t < h.warn + 1.2) {
        if (!h.lit) { h.lit = 1; emit('flame', { x: h.x, y: h.y }); }
        for (const p of M.players) if (standing(p) && !h.hit[p.id] && Math.hypot(p.x - h.x, p.y - h.y) < 14) { h.hit[p.id] = 1; toast(p, 'toasted'); }
      }
      if (h.t > h.warn + 1.3) M.hazards.splice(M.hazards.indexOf(h), 1);
    } else if (h.kind === 'lightning') {
      if (h.t > 1.4 && !h.struck) {
        h.struck = 1; emit('lightning', { x: h.x, y: h.y });
        for (const p of M.players) if (onField(p) && p.st !== 'binned' && Math.hypot(p.x - h.x, p.y - h.y) < 36) toast(p, 'zapped');
        if (Math.hypot(M.ref.x - h.x, M.ref.y - h.y) < 36 && M.ref.down <= 0) refDown();
        M.scorch = (M.scorch || []).concat([[h.x, h.y]]).slice(-8);
      }
      if (h.t > 2) M.hazards.splice(M.hazards.indexOf(h), 1);
    }
  }
  if (!live || k <= 0) return;
  M.hazT.a -= dt * k;
  if (M.hazT.a > 0) return;
  if (hz === 'chicken') { M.hazT.a = U(50, 70); triggerHazard('chicken'); }
  else if (hz === 'flames') { M.hazT.a = U(9, 15); triggerHazard('flames'); }
  else if (hz === 'lightning') { M.hazT.a = U(20, 30); triggerHazard('lightning'); }
  else if (hz === 'mud') { M.hazT.a = U(25, 40); emit('mudCall', {}); }
  else M.hazT.a = 30;
}
function toast(p, how) {
  if (how === 'toasted') p.toasted = 1.5; else p.zapped = .5;
  knockDown(p, how === 'toasted' ? 1.2 : 1.5, null); p.st = 'stunned';
  emit(how, { pid: p.id });
}
/** a hazard now (the dev panel's and the attract director's too): any venue's */
function triggerHazard(kind) {
  const b = M.ball;
  if (kind === 'chicken') {
    const x = clamp(b.x + U(-60, 60), G.X0 + 40, G.X1 - 40), top = rnd() < .5;
    M.hazards.push({ kind: 'chicken', t: 0, dur: 6, path: [x - 80, top ? G.Y0 - 30 : G.Y1 + 30, x + 80, top ? G.Y1 + 30 : G.Y0 - 30], x, y: top ? G.Y0 - 30 : G.Y1 + 30, hit: {} });
    emit('chicken', {});
  } else if (kind === 'flames') {
    const near = FLAME_GRATES.slice().sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) { const g = near[i * 2 % near.length]; M.hazards.push({ kind: 'flame', t: 0, warn: 1 + i * .25, x: g.x, y: g.y, hit: {} }); }
    emit('flameWarn', {});
  } else if (kind === 'lightning') {
    const a = U(0, TAU), d = U(60, 200);
    M.hazards.push({ kind: 'lightning', t: 0, x: clamp(b.x + Math.cos(a) * d, G.X0 + 20, G.X1 - 20), y: clamp(b.y + Math.sin(a) * d, G.Y0 + 20, G.Y1 - 20), hit: {} });
    emit('lightningWarn', {});
  } else if (kind === 'mud') {
    const p = holder() || M.players[0];
    M.mud.push({ x: p.x + dirOf(p.team) * 30, y: p.y, r: 50, k: 1 });
    emit('mudCall', {});
  }
}
TT.arc.trigger = k => triggerHazard(k);

/* ==== 14-ai.js ==== */
/* ---- THE AI: one brain for every CPU player (both teams, and humans' teammates); difficulty and team style change its
 * numbers, never its logic. Team shapes every 0.25 s; decisions every 0.15 s plus the reaction delay. It speaks only in
 * intents: a stick and buttons, as a player would ---- */
TT.ai = {};
const blankIntent = () => ({ mx: 0, my: 0, turbo: false, p: {}, h: {}, r: {}, aim: null, click: -1 });
TT.blankIntent = blankIntent;

/** intents for every CPU player this step (into out[id]) */
TT.ai.intents = (out, dt) => {
  if (!M) return out;
  const live = M.phase === 'play' || M.phase === 'ruck';
  M.aiShapeT = (M.aiShapeT || 0) - dt;
  if (M.aiShapeT <= 0) { M.aiShapeT = .25; shapes(); }
  for (const p of M.players) {
    if (p.ctl >= 0 || !onField(p)) continue;
    const it = out[p.id] = blankIntent();
    if (!live || cheat('cpuFrozen') && p.team === 1) continue;
    brain(p, it, dt);
  }
  return out;
};

/* ---- shapes: a target spot for every player off the ball ---- */
function shapes() {
  const b = M.ball, h = holder();
  let att = M.possession, cx = b.x, cy = b.y;
  if (M.phase === 'ruck') { att = M.ph.team; cx = b.x; cy = b.y; }
  else if (b.st === 'air' && b.kind === 'pass' && pl(b.target)) { const r = pl(b.target); cx = r.x; cy = r.y; }
  else if (h) { cx = h.x; cy = h.y; att = h.team; }
  const d = dirOf(att), def = 1 - att;
  // attack: a staggered line behind the carrier, three each side
  const slots = [];
  for (let k = 1; k <= 3; k++) for (const s of [-1, 1]) {
    const open = (s > 0) === (cy < G.CY), sp = open ? 44 : 36;
    slots.push({ x: cx - d * (18 + 10 * k + (M.phase === 'ruck' ? 8 : 0)), y: clamp(cy + s * sp * k, G.Y0 + 20, G.Y1 - 20), k, used: false });
  }
  const mates = M.players.filter(p => p.team === att && onField(p) && (!h || p !== h) && p.st !== 'ruck');
  mates.sort((a, c) => (a.idx < 3 ? 0 : 1) - (c.idx < 3 ? 0 : 1) || a.idx - c.idx);
  for (const p of mates) {
    let best = null, bd = 1e9;
    for (const s of slots) { if (s.used) continue; if (p.idx < 3 && s.k > 2) continue; const dd = Math.hypot(s.x - p.x, s.y - p.y) + (p.idx >= 5 ? -s.k * 30 : 0); if (dd < bd) { bd = dd; best = s; } }
    if (!best) best = slots.find(s => !s.used) || { x: cx - d * 40, y: cy };
    best.used = true; p.tx = best.x; p.ty = best.y; p.role2 = 'support';
    if (M.phase === 'ruck' && p.idx === 3 && p.team === att) { p.tx = b.x - d * 14; p.ty = b.y; p.role2 = 'base'; }
  }
  // defence: a line across the field in front of the attack, man on man by y; the tackler, the cover and the sweeper
  const defs = M.players.filter(p => p.team === def && standing(p) && p.st !== 'ruck');
  const lineX = M.phase === 'ruck' ? cx + d * 16 : cx + d * 30;
  const nearLine = Math.abs(tryLineOf(att) - cx) < 200;
  let sweeper = defs.find(p => p.idx === 6) || defs.find(p => p.idx === 4);
  if (nearLine || defs.length < 5) sweeper = null;
  const atts = M.players.filter(p => p.team === att && onField(p) && p.st !== 'ruck').sort((a, c) => a.y - c.y);
  let tackler = null, cover = null;
  if (h && h.team === att && M.phase === 'play') {
    const byT = defs.filter(p => p !== sweeper || Math.hypot(p.x - h.x, p.y - h.y) < 60).sort((a, c) => intercept(a, h) - intercept(c, h));
    tackler = byT[0] || null; cover = byT[1] || null;
  }
  const line = defs.filter(p => p !== tackler && p !== cover && p !== sweeper).sort((a, c) => a.y - c.y);
  const ys = atts.length ? atts.map(a => a.y) : [cy];
  line.forEach((p, i) => {
    const k = line.length > 1 ? i / (line.length - 1) : .5, ay = ys[Math.round(k * (ys.length - 1))];
    const spread = defs.length < 7 ? 1.12 : 1;
    p.tx = clamp(lineX + (Math.abs(ay - cy) * .08) * d, G.DEAD[0] + 10, G.DEAD[1] - 10); p.ty = clamp(G.CY + (ay - G.CY) * spread, G.Y0 + 14, G.Y1 - 14); p.role2 = 'line';
  });
  if (sweeper) { sweeper.tx = clamp(cx + d * 140, G.DEAD[0], G.DEAD[1]); sweeper.ty = lerp(cy, G.CY, .5); sweeper.role2 = 'sweeper'; }
  if (tackler) { tackler.role2 = 'tackler'; }
  if (cover) { cover.role2 = 'cover'; cover.tx = h.x + d * 20; cover.ty = h.y + (G.CY - h.y) * .15; }
  // loose balls and kicks: the nearest two of each side go for it
  if (b.st === 'loose' || (b.st === 'air' && b.kind !== 'pass' && b.kind !== 'throw')) {
    const spot = b.st === 'air' && b.landing ? b.landing : { x: b.x + b.vx * .4, y: b.y + b.vy * .4 };
    for (const t of [0, 1]) {
      const near = M.players.filter(p => p.team === t && standing(p) && p.st !== 'ruck').sort((a, c) => Math.hypot(a.x - spot.x, a.y - spot.y) / speedOf(a) - Math.hypot(c.x - spot.x, c.y - spot.y) / speedOf(c)).slice(0, 2);
      near.forEach((p, i) => { p.tx = spot.x + (i ? -dirOf(t) * 14 : 0); p.ty = spot.y; p.role2 = 'chase'; });
    }
  }
  // off the pitch: keep the targets inside it
  for (const p of M.players) { if (p.tx == null) { p.tx = p.x; p.ty = p.y; } p.ty = clamp(p.ty, G.Y0 + 8, G.Y1 - 8); }
}
const speedOf = p => TUNE.v.runSpeed * (.8 + .04 * statOf(p, 'SPD'));
function intercept(p, h) { const t = Math.hypot(h.x - p.x, h.y - p.y) / speedOf(p); return Math.hypot(h.x + h.vx * t * .5 - p.x, h.y + h.vy * t * .5 - p.y) / speedOf(p) + (p.st === 'getup' ? .5 : 0); }
TT.ai.shapes = () => shapes();

/* ---- the brain ---- */
function brain(p, it, dt) {
  const b = M.ball, h = holder(), D = M.diff[p.team] || TT.DIFF.Pro, style = M.teams[p.team].style;
  p.ai = p.ai || { t: 0, btn: null, react: 0, plan: null };
  const ai = p.ai; ai.t -= dt;
  // a held button script (a long pass, a punt's meter, a big hit's charge)
  if (ai.btn) {
    const k = ai.btn; k.t -= dt;
    if (k.t > 0 && (!k.until || !k.until())) it.h[k.k] = true; else { it.r[k.k] = true; ai.btn = null; }
  }
  if (p.st === 'tackled' && h === p && !p.offTry) { p.offTry = true; if (rnd() < style.pass * .35) { const side = pickPass(p); if (side) it.p[side.k] = true; } return; }
  if (p.st === 'tackled' || !isFree(p)) return;
  if (h === p) return carrierBrain(p, it, dt, D, style);
  // the Hurricane Hit homes in by itself; the support and defence shapes
  let tx = p.tx, ty = p.ty, turbo = false;
  if (b.st === 'air' && b.kind === 'pass' && b.target === p.id) { const lead = predictBall(.25); tx = lead.x; ty = lead.y; }
  if (p.role2 === 'tackler' && h && h.team !== p.team) {
    const t = Math.min(.6, Math.hypot(h.x - p.x, h.y - p.y) / speedOf(p));
    tx = h.x + h.vx * t; ty = h.y + h.vy * t; turbo = Math.hypot(h.x - p.x, h.y - p.y) > 25;
    defendDecision(p, h, it, dt, D, style);
  }
  if (p.role2 === 'chase') turbo = true;
  if (p.role2 === 'support' && h && h.team === p.team && h.lineBroken) turbo = true;
  // a power-up within reach: one off-ball player goes for it
  if (M.pu && M.pu.landed && p.role2 !== 'tackler' && Math.hypot(M.pu.x - p.x, M.pu.y - p.y) < 100 && !M.players.some(q => q !== p && q.puChase && q.team === p.team)) { tx = M.pu.x; ty = M.pu.y; p.puChase = true; } else p.puChase = false;
  // cheap shots, when the ref isn't looking
  if (h && h.team !== p.team && !ai.btn && ai.t <= 0) {
    ai.t = .15;
    if (rnd() < style.cheap * .04 * (TUNE.v.aiAggression / .5)) {
      const v = M.players.find(q => q.team !== p.team && q !== h && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 13);
      if (v && !refSees(p) && Math.abs(TT.angDiff(p.facing, Math.atan2(v.y - p.y, v.x - p.x))) < 1) it.p.x = true;
    }
  }
  steer(p, it, tx, ty, turbo);
  // supers on defence: the Hurricane Hit when the carrier nears our line
  if (h && h.team !== p.team && M.hype[p.team] >= 100 && p.role2 === 'tackler' && Math.abs(tryLineOf(h.team) - h.x) < 120 && (style.supers || rnd() < .02)) it.p.tri = true;
}
function predictBall(t) { const b = M.ball; return { x: b.x + b.vx * t, y: b.y + b.vy * t }; }
function steer(p, it, tx, ty, turbo) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d > 3) { const s = d > 14 ? 1 : d / 14; it.mx = dx / d * s; it.my = dy / d * s; }
  it.turbo = turbo && p.turbo > .3 || (d > 90 && p.turbo > .5);
}
function defendDecision(p, h, it, dt, D, style) {
  const ai = p.ai, d = Math.hypot(h.x - p.x, h.y - p.y), facing = Math.abs(TT.angDiff(p.facing, Math.atan2(h.y - p.y, h.x - p.x))) < 1.1;
  ai.react = (ai.react || 0) + dt;
  if (ai.btn) return;
  const reaction = D.aiReaction * (TUNE.v.aiReaction / .25);
  if (ai.react < reaction) return;
  const aggr = clamp(style.aggression * (TUNE.v.aiAggression / .5), 0, 1);
  const headOn = Math.abs(TT.angDiff(h.facing + PI, Math.atan2(p.y - h.y, p.x - h.x))) < .7;
  if ((statOf(p, 'POW') >= 7 || aggr >= .6 || p.data.boss) && headOn && d < 40 && d > 22 && rnd() < .05 + aggr * .05) {
    ai.btn = { k: 'x', t: 2, until: () => { const hh = holder(); return !hh || hh.team === p.team || Math.hypot(hh.x - p.x, hh.y - p.y) < 15 || p.charge > TUNE.v.bigHitCharge * 1.05; } };
    return;
  }
  if (d < TUNE.v.tackleRange + 2 && facing) { if (rnd() < (.6 + .3 * aggr) * dt * 14) { it.p.x = true; ai.react = 0; } return; }
  const behind = (p.x - h.x) * dirOf(h.team) < 0;
  if (behind && d > 18 && d < TUNE.v.diveRange && speedOf(h) >= speedOf(p) * .95 && rnd() < dt * 2) { it.p.sq = true; ai.react = 0; }
}

/** the CPU carrier: run at the gaps, pass when pressed, step and fend, kick, ground it */
function carrierBrain(p, it, dt, D, style) {
  const ai = p.ai, d = dirOf(p.team), tl = tryLineOf(p.team), toLine = (tl - p.x) * d;
  const foes = M.players.filter(q => q.team !== p.team && standing(q));
  const nearF = foes.map(q => ({ q, d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, c) => a.d - c.d);
  const closest = nearF[0];
  // in their in-goal: dive, or run to the posts when nobody is near
  if (toLine < 0) {
    const free = !closest || closest.d > 60;
    if (!free || Math.abs(p.y - G.CY) < 30 || toLine < -60) { it.p.x = true; return; }
    steer(p, it, tl + d * 30, G.CY, true); return;
  }
  // the run: toward the line, steering for the widest gap, kept inside touch
  let bestA = d > 0 ? 0 : PI, bestS = -1e9;
  for (let k = -4; k <= 4; k++) {
    const a = (d > 0 ? 0 : PI) + k * .2; let s = 0;
    const ex = p.x + Math.cos(a) * 60, ey = p.y + Math.sin(a) * 60;
    if (ey < G.Y0 + 20 || ey > G.Y1 - 20) s -= 200;
    for (const f of nearF.slice(0, 5)) { const dd = Math.hypot(f.q.x - ex, f.q.y - ey); s += Math.min(dd, 80); }
    s -= Math.abs(k) * 6;
    if (s > bestS) { bestS = s; bestA = a; }
  }
  it.mx = Math.cos(bestA); it.my = Math.sin(bestA);
  const space = !closest || closest.d > 50;
  it.turbo = (space && toLine < 300) || p.turbo > .3 && toLine < 120 || p.lineBroken || closest && closest.d < 30 && p.turbo > .3;
  if (ai.btn) return;
  ai.t -= 0; if (ai.t > 0) return;
  ai.t = .1 + D.aiReaction * .3 * (TUNE.v.aiReaction / .25);
  const noise = () => (rnd() - .5) * D.noise;
  // supers: Thunder Run in their half with space ahead
  if (M.hype[p.team] >= 100 && toLine < 520 && (space || style.supers) && rnd() < .5) { it.p.tri = true; return; }
  // the use-it timer: the scrum-half gets it out
  if (M.useIt && M.useIt.pid === p.id && M.useIt.t > .4 + rnd()) { const side = pickPass(p); if (side) { passButton(p, it, side); return; } }
  const tackler = closest && closest.d < 60 ? closest.q : null, tD = closest ? closest.d : 999;
  // drop goal: the last moments, trailing by three or fewer, in range
  const behindBy = M.score[1 - p.team] - M.score[p.team];
  if (((M.hooter || M.clock > M.halfLen - 20) && M.half === 2 && behindBy > 0 && behindBy <= 3 || M.suddenDeath) && toLine < 260 && Math.abs(p.y - G.CY) < 160 && (!tackler || tackler.d > 18)) { ai.btn = { k: 'ci', t: .75 }; return; }
  // in our own 22 under pressure: find touch
  const own = (p.x - ownLineOf(p.team)) * d;
  if (own < 225 && tackler && rnd() < .5 + style.kick * .5) { it.mx = d * .6; it.my = p.y < G.CY ? -.8 : .8; ai.btn = { k: 'ci', t: .6 + rnd() * .3 }; return; }
  if (tackler) {
    const committing = Math.hypot(tackler.vx, tackler.vy) > 20 || tD < 18;
    if (tD < 26 && committing && p.sideCd <= 0 && rnd() < .25 * (statOf(p, 'HND') / 7) + noise()) { it.p.x = true; it.mx = -Math.sin(bestA) * (rnd() < .5 ? 1 : -1); it.my = Math.cos(bestA); return; }
    if (tD < 20 && statOf(p, 'POW') >= 6 && p.fendCd <= 0 && rnd() < .4 + noise()) { it.p.sq = true; return; }
    if (tD < 40 && !(p.lineBroken && tD > 22) && (tackler.x - p.x) * d > -6 && rnd() < style.pass * .5 + .1 + noise()) { const side = pickPass(p); if (side) { passButton(p, it, side); return; } }
    // a grubber or chip behind a flat line
    if (tD < 40 && rnd() < style.kick * .1 && toLine > 80 && toLine < 400) { it.mx = d; it.my = 0; it.p.ci = true; it.r.ci = true; return; }
  }
  if (!tackler && !p.lineBroken && toLine > 150 && rnd() < style.pass * .02) { const side = pickPass(p); if (side) { passButton(p, it, side); return; } }
  // offload in contact: handled at the tackle (the brain presses a pass button right after)
  if (p.st === 'tackled' && p.stT < .15) { const side = pickPass(p); if (side) it.p[side.k] = it.r[side.k] = true; }
}
/** the best receiver: his space minus defenders near the lane */
function pickPass(p) {
  let best = null, bs = -1e9;
  for (const side of [-1, 1]) {
    const list = receivers(p, side);
    list.slice(0, 2).forEach((r, i) => {
      let s = 0; for (const q of M.players) if (q.team !== p.team && standing(q)) { s += Math.min(80, Math.hypot(q.x - r.x, q.y - r.y)) * .5; if (TT.segDist(q, p, r) < 14) s -= 60; }
      s -= i * 10 + Math.abs(r.y - p.y) * .05;
      if (s > bs) { bs = s; best = { k: side < 0 ? 'l1' : 'r1', long: i === 1 }; }
    });
  }
  return best;
}
function passButton(p, it, side) {
  if (side.long) p.ai.btn = { k: side.k, t: .3 };
  else { it.h[side.k] = false; it.r[side.k] = true; }
}
TT.ai.pickPass = p => pickPass(p);

/** the CPU's intent for one player, as if a human gave it (autopilot seats: tests, the playthrough) */
TT.ai.intentFor = (p, dt) => {
  const it = blankIntent();
  if (!p || !onField(p)) return it;
  if (M.phase === 'play' || M.phase === 'ruck') brain(p, it, dt);
  // set pieces: a decent human's timing
  if (M.phase === 'scrum') { if (M.sub === 'set' && Math.abs(M.ph.subT - .5) < .02) it.p.x = true; if (M.sub === 'push' && Math.floor(M.t * 16) % 2) it.p[Math.floor(M.t * 8) % 2 ? 'l1' : 'r1'] = true; }
  if (M.phase === 'lineout') { if (M.sub === 'call' && M.ph.subT > .2) it.p.x = true; if (M.sub === 'throw' && Math.abs(M.ph.needle) < .15) it.p.x = true; }
  if (M.phase === 'ruck' && Math.floor(M.t * 20) % 2) it.p.x = true;
  if (M.phase === 'penalty' && M.phaseT > 1) it.p.x = true;
  if (M.phase === 'kickoff' && M.ph.kicker === p.id) { if (M.phaseT < 1.2) it.h.ci = true; else it.r.ci = true; }
  if (M.phase === 'setkick' && M.ph.kicker === p.id) { if (M.sub === 'place') it.p.x = true; else if (M.sub === 'aim') { if (M.ph.power < Math.min(1, M.ph.need + .07) && (M.ph.powT || 0) < .97) it.h.ci = true; else it.r.ci = true; } }
  if ((M.phase === 'walkout' || M.phase === 'half') && M.phaseT > 1) it.p.x = true;
  return it;
};

/* ==== 20-control.js ==== */
/* ---- CONTROL: seats (each human on a device, a remote player online, or a test script), the intent each seat's
 * player gets from its device, and who drives whom (auto-switch, L1/R1, ○, a click) ---- */
TT.seats = [];
TT.settings = {};   // (game.settings once the game exists)
TT.control = {};
const ACTS = ['x', 'sq', 'ci', 'tri', 'l1', 'r1'];

/** a seat: { kind: 'local' | 'remote' | 'script', input, team, pid, color, label, name, intent } */
TT.control.seat = (o) => Object.assign({ kind: 'local', input: null, team: 0, pid: -1, color: '#ffd23a', label: 'P1', name: 'P1', intent: null, turboOn: false, lastSwitch: 0 }, o);

/** the intent a local seat's devices give this step */
function deviceIntent(seat) {
  const I = seat.input, it = TT.blankIntent();
  if (!I) return it;
  const mv = I.move(), g = TT.game && TT.game.view && TT.game.view.screenDirToGround ? TT.game.view.screenDirToGround(mv[0], mv[1]) : mv;
  it.mx = g[0]; it.my = g[1];
  for (const a of ACTS) { it.p[a] = I.pressed(a); it.h[a] = I.down(a); it.r[a] = I.released(a); }
  for (const a of ['up', 'down', 'left', 'right']) it.p[a] = I.pressed(a);
  // the mouse's left button: power for set kicks and kick-offs (as ○ held)
  if (I.map && I.map.mouseL) { if (I.down('mouseL') && (M && (M.phase === 'setkick' || M.phase === 'kickoff'))) it.h.ci = true; if (I.released('mouseL') && M && (M.phase === 'setkick' || M.phase === 'kickoff')) it.r.ci = true; }
  // turbo: held, or toggled (Settings, Game, Turbo)
  if (TT.settings.turboMode === 'Toggle') { if (I.pressed('turbo')) seat.turboOn = !seat.turboOn; it.turbo = seat.turboOn; } else it.turbo = I.down('turbo');
  // the mouse in the world: a hovered teammate, the kick's aim
  if (TT.cfg.present && I.lastDevice === 'mouse' && TT.mouse) {
    const mg = TT.mouse.ground;
    if (mg) { if (I.down('ci') || I.released('ci')) it.aim = mg; if (M && M.phase === 'kickoff') it.aim = mg; }
    if (TT.mouse.click && seat === TT.seats.find(s => s.kind === 'local' && s.input === TT.game.input)) { it.click = TT.mouse.clickId; it.pick = TT.mouse.pick; }
    if (TT.mouse.kickAim != null && M && M.phase === 'setkick') it.kickAim = TT.mouse.kickAim;
    if (TT.mouse.wheel) it.wheel = TT.mouse.wheel;
  }
  if (seat.uiPick != null) { it.pick = seat.uiPick; seat.uiPick = null; }
  return it;
}
TT.control.deviceIntent = s => deviceIntent(s);

/** this step's intents: the CPU's, then each seat's for its player (after deciding who drives whom) */
TT.control.collect = dt => {
  const out = {};
  if (!M) return out;
  for (const s of TT.seats) s.intent = s.kind === 'local' ? deviceIntent(s) : s.auto && s.pid >= 0 ? TT.ai.intentFor(pl(s.pid), dt) : (s.intent || TT.blankIntent());
  assign(dt);
  for (const p of M.players) p.ctl = -1;
  TT.seats.forEach((s, i) => { if (s.pid >= 0 && pl(s.pid) && onField(pl(s.pid))) pl(s.pid).ctl = i; });
  TT.ai.intents(out, dt);
  TT.seats.forEach(s => { if (s.pid >= 0) out[s.pid] = s.intent; if (s.kind === 'remote' && s.intent) s.intent = Object.assign({}, s.intent, { p: {}, r: {} }); });
  return out;
};

/** who each seat drives */
function assign(dt) {
  const h = holder(), b = M.ball, mode = TT.settings.autoSwitch || 'Assisted';
  const taken = new Set();
  const ok = (p, s) => p && onField(p) && p.team === s.team && !taken.has(p.id);
  const nearestBall = (s, excl) => M.players.filter(p => ok(p, s) && p.id !== excl && standing(p)).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
  // the carrier goes to the nearest seat of his team
  if (h) {
    const mine = TT.seats.filter(s => s.team === h.team);
    if (mine.length) { const s = mine.slice().sort((a, c) => (a.pid >= 0 ? Math.hypot(pl(a.pid).x - h.x, pl(a.pid).y - h.y) : 999) - (c.pid >= 0 ? Math.hypot(pl(c.pid).x - h.x, pl(c.pid).y - h.y) : 999))[0]; if (s.pid !== h.id) { s.pid = h.id; s.lastSwitch = M.t; } taken.add(h.id); }
  }
  for (const s of TT.seats) {
    s.lastSwitch = s.lastSwitch || 0;
    if (s.pid >= 0 && taken.has(s.pid) && pl(s.pid) && pl(s.pid) === h && h.team === s.team) continue;
    let p = s.pid >= 0 ? pl(s.pid) : null;
    if (!ok(p, s)) p = nearestBall(s);
    const it = s.intent, live = M.phase === 'play' || M.phase === 'ruck';
    const defending = !h || h.team !== s.team;
    if (live && defending && it && p && p.superK !== 'hurricane') {
      // switching: L1 / R1 to the next teammate up / down the screen; ○ to the one nearest the ball; a click
      if (it.p.l1 || it.p.r1) {
        const side = it.p.l1 ? -1 : 1;
        const c = M.players.filter(q => ok(q, s) && q !== p && standing(q) && Math.sign(q.y - p.y) === side).sort((a, c2) => Math.abs(a.y - p.y) - Math.abs(c2.y - p.y))[0];
        if (c) { p = c; TT.emit('switch', { pid: c.id }); }
      } else if (it.p.ci && !(h && h.id === p.id)) { const c = nearestBall(s, p.id); if (c && Math.hypot(c.x - b.x, c.y - b.y) < Math.hypot(p.x - b.x, p.y - b.y)) { p = c; TT.emit('switch', { pid: c.id }); } }
      if (it.click >= 0 && ok(pl(it.click), s)) { p = pl(it.click); TT.emit('switch', { pid: p.id }); }
      // auto-switch
      const ballJustMoved = b.st === 'air' && b.t < dt * 1.5 && b.kind !== 'throw';
      if ((mode === 'Assisted' && (ballJustMoved || !standing(p) && M.t - s.lastSwitch > .6)) || (mode === 'Full' && M.t - s.lastSwitch > 1)) {
        const tgt = h || b, c = M.players.filter(q => ok(q, s) && standing(q)).sort((a, c2) => Math.hypot(a.x - tgt.x, a.y - tgt.y) - Math.hypot(c2.x - tgt.x, c2.y - tgt.y))[0];
        if (c && c !== p && (mode === 'Assisted' || Math.hypot(c.x - tgt.x, c.y - tgt.y) + 30 < Math.hypot(p.x - tgt.x, p.y - tgt.y))) { p = c; s.lastSwitch = M.t; }
      }
    }
    if (p && p.id !== s.pid) s.lastSwitch = M.t;
    s.pid = p ? p.id : -1;
    if (p) taken.add(p.id);
  }
}
TT.control.assign = dt => assign(dt);

/* ==== 30-render.js ==== */
/* ---- PRESENTATION: the stadium, the crowd, the posts, the players' rigs, the ball. Reads the match state only ---- */
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
TT.VIEW_IDS = ['broadcast', 'threequarter', 'topdown'];
/* behind the kicker: the posts straight up the screen (one view for each end) */
E.VIEWS.postsE = new E.View('postsE', 'Kicker', 270, 26, 1, 1);
E.VIEWS.postsW = new E.View('postsW', 'Kicker', 90, 26, 1, 1);
TT.pres = { rigs: [], maps: {}, crowd: null, t: 0 };
const PR = TT.pres;

/* ---- the stadium as a TileMap: a three-tier stand on the far side, stands behind each dead-ball line, boards on the
 * near side (they cut low when they would hide play) ---- */
function stadiumRows() {
  const rows = [];
  for (let r = 0; r < G.ROWS; r++) {
    let s = '';
    for (let c = 0; c < G.COLS; c++) {
      const x = c * 16 + 8, y = r * 16 + 8;
      if (r <= 2) s += ['5', '4', '3'][r];
      else if (r <= 44 && (c <= 1 || c >= G.COLS - 2)) s += c === 0 || c === G.COLS - 1 ? '6' : '7';
      else if (r === 45) s += c > 1 && c < G.COLS - 2 && !(c >= 42 && c <= 44) ? '8' : '.';
      else if (r > 45) s += ',';
      else if (x > G.X0 && x < G.X1 && y > G.Y0 && y < G.Y1) s += 'g';
      else if (x > G.DEAD[0] && x < G.DEAD[1] && y > G.Y0 && y < G.Y1) s += 'i';
      else s += 'a';
    }
    rows.push(s);
  }
  return rows;
}
const lineAt = (x, y) => {
  const near = (v, a, w = 1.1) => Math.abs(v - a) < w;
  const inF = y > G.Y0 - 1 && y < G.Y1 + 1, inX = x > G.DEAD[0] - 1 && x < G.DEAD[1] + 1;
  if (inF && (near(x, G.X0) || near(x, G.X1) || near(x, G.DEAD[0]) || near(x, G.DEAD[1]))) return 1;
  if (inX && (near(y, G.Y0) || near(y, G.Y1))) return 1;
  if (inF && (near(x, G.CX) || near(x, G.L22[0]) || near(x, G.L22[1]))) return 1;
  const dash = Math.floor(y / 16) % 2 === 0, dashX = Math.floor(x / 16) % 2 === 0;
  if (inF && dash && (near(x, G.L10[0]) || near(x, G.L10[1]) || near(x, G.L5[0]) || near(x, G.L5[1]))) return 1;
  if (x > G.X0 && x < G.X1 && dashX && (near(y, G.Y0 + 51) || near(y, G.Y1 - 51) || near(y, G.Y0 + 154) || near(y, G.Y1 - 154))) return .7;
  return 0;
};
function makeMap(venue, homeKit) {
  const gr = venue.grass, hc = E.hex(homeKit.cloth);
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
    if (tag === 'out') return [46 + n * 16, 44 + n * 16, 50 + n * 16];
    const l = tag !== 'apron' || true ? lineAt(x, y) : 0;
    if (l) { const w = 214 + n * 30 + m * 10; return [w, w + 3, w - 6].map(v => v * (l < 1 ? .9 : 1)); }
    const k = Math.floor((x - G.X0) / 32) % 2 ? 1.1 : .92, wear = Math.max(0, 1 - Math.abs(y - G.CY) / 300) * (Math.abs(x - G.CX) < 120 ? .12 : .04);
    let r = gr[0] * k + n * 18 + m * 14, g2 = gr[1] * k + n * 26 + m * 20, b = gr[2] * k + n * 14 + m * 10;
    if (tag === 'ingoal') { const st = (Math.floor((x + y) / 24) % 2) ? .1 : 0; r = lerp(r, hc[0], .14 + st); g2 = lerp(g2, hc[1], .14 + st); b = lerp(b, hc[2], .14 + st); }
    if (tag === 'apron') { r *= .78; g2 *= .8; b *= .78; }
    r = lerp(r, 120, wear); g2 = lerp(g2, 96, wear); b = lerp(b, 60, wear);
    return [r, g2, b];
  };
  const S = venue.standSide, Tp = venue.standTop, S2 = E.shade(S, -.12), S3 = E.shade(S, -.22);
  return new E.TileMap({
    rows: stadiumRows(), floorTex, outside: '#141218', ao: 4,
    legend: { 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, g: { floor: 'grass' }, i: { floor: 'ingoal' }, a: { floor: 'apron' }, '.': { floor: 'apron' }, ',': { floor: 'out' } },
    types: {
      3: { h: 34, face: venue.stand, side: S, top: Tp }, 4: { h: 46, face: venue.stand, side: S2, top: Tp }, 5: { h: 58, face: venue.stand, side: S3, top: Tp },
      6: { h: 52, face: venue.stand, side: S, top: Tp }, 7: { h: 36, face: venue.stand, side: S, top: Tp },
      8: { h: 14, cut: true, cutH: 4, face: 'plank', side: '#2a3450', top: '#d8dce8' }
    }
  });
}
TT.pres.map = (venue, kit) => { const k = venue.id + kit.cloth; return PR.maps[k] || (PR.maps[k] = makeMap(venue, kit)); };

/* ---- the crowd: two on each stand tile, in both teams' colours (home 70%), bobbing; up on scores, down on cards ---- */
function makeCrowd(kits) {
  const out = [];
  const tiers = [[0, 58], [1, 46], [2, 34]];
  for (const [r, z] of tiers) for (let c = 0; c < G.COLS; c++) for (const dx of [4, 12]) {
    const h = E.hash2(c * 7 + dx, r * 13 + 3);
    out.push({ x: c * 16 + dx, y: r * 16 + 8, z, side: h < .7 ? 0 : 1, h, ph: h * 9 });
  }
  for (let r = 3; r <= 44; r++) for (const c of [0, 1, G.COLS - 2, G.COLS - 1]) for (const dy of [5, 12]) {
    const h = E.hash2(c * 5 + dy, r * 11 + 1);
    out.push({ x: c * 16 + 8, y: r * 16 + dy, z: c === 0 || c === G.COLS - 1 ? 52 : 36, side: h < .7 ? 0 : 1, h, ph: h * 7 });
  }
  const skins = Object.values(SKIN);
  for (const f of out) { const kit = kits[f.side]; f.shirt = f.h * 10 % 1 < .7 ? kit.cloth : (f.h * 17 % 1 < .5 ? kit.trim : '#e8e4dc'); f.skin = skins[Math.floor(f.h * 50) % skins.length]; f.hair = ['#2a1a10', '#6a4a2a', '#c8a050', '#1a1410', '#a0a0a0'][Math.floor(f.h * 31) % 5]; f.flag = f.h * 97 % 1 < .06; }
  return out;
}

/* ---- the rigs: one Humanoid per player, dressed in the kit, its own hair, skin, build and headgear ---- */
function rigFor(p, kit) {
  const d = p.data;
  return new E.Humanoid({ weapon: null, build: d.build, size: d.size * .95, hair: d.hair, hat: d.hat || undefined, outfit: 'shirt', sleeves: 'short', hunch: d.hunch || 0,
    colors: { cloth: kit.cloth, trim: kit.trim, pants: kit.pants, boot: kit.boot, belt: kit.trim, hair: d.hairColor, skin: d.skin }, speedRef: 80 });
}
TT.pres.rigFor = rigFor;
TT.pres.setup = m => {
  PR.rigs = m.players.map(p => rigFor(p, m.kits[p.team]));
  PR.baseC = PR.rigs.map(r => ({ cloth: r.C.cloth, pants: r.C.pants }));
  PR.ref = new E.Humanoid(Object.assign({ weapon: null }, TT.CAST.nigel.o));
  PR.crowd = makeCrowd(m.kits);
  PR.chicken = new E.Blob({ R: 13, colors: { dk: '#c8b878', base: '#f4f0e0', lt: '#ffffff', spec: '#ffffff', eye: '#141010', pupil: '#000' }, wings: true, feet: true, mouth: true });
  PR.cheer = 0; PR.boo = 0; PR.scorer = -1;
  PR.cur = TT.pres.map(m.venue, m.kits[0]);
  PR.lastAnim = {};
};
const MUD = E.hex('#5a3a1e');
const mixHex = (a, b, k) => { const A = E.hex(a); return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], b[i], k)).toString(16).padStart(2, '0')).join(''); };

/** what a player's rig shows: from his state (and his anim timers) */
function rigState(p, m) {
  const s = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing };
  const t = p.stT;
  switch (p.st) {
    case 'tackled': case 'ground': s.down = 1; s.hurt = p.st === 'tackled'; break;
    case 'stunned': s.down = p.zapped > 0 || p.toasted > 0 ? 1 : .0; s.hurt = true; break;
    case 'getup': s.down = clamp(1 - t / .45, 0, 1); break;
    case 'diving': s.down = 1; s.z = p.z + 3; break;
    case 'launched': s.air = true; s.hurt = true; s.flip = (t * 1.6) % 1; s.expr = 'wince'; break;
    case 'ruck': s.pose = 'crouch'; s.run = 1; s.expr = 'angry'; break;
    case 'scrum': s.pose = 'crouch'; s.run = m.sub === 'push' ? 1 : 0; s.expr = 'angry'; break;
    case 'lift': s.pose = 'cheer'; s.air = true; break;
    case 'celebrate': s.pose = ['cheer', 'hips', 'guard', 'wave', 'cheer', 'kneel'][p.celeb]; s.expr = 'shout'; break;
    case 'pass': s.attack = E.move('cast', clamp(t / .22, 0, 1), t < .06 ? 'wind' : t < .14 ? 'active' : 'recover'); break;
    case 'kick': s.attack = E.move('kick', clamp(t / .35, 0, 1), t < .08 ? 'wind' : t < .18 ? 'active' : 'recover'); break;
    case 'fend': s.attack = E.move('jab', clamp(t / .45, 0, 1), t < .05 ? 'wind' : t < .3 ? 'active' : 'recover'); s.expr = 'angry'; break;
    case 'charge': s.stance = 'guard'; s.expr = p.charge > 1.2 ? 'shout' : 'angry'; s.sprint = true; break;
    case 'tackling': s.attack = E.move('bash', clamp(t / .35, 0, 1), t < .1 ? 'active' : 'recover'); s.down = clamp((t - .15) / .2, 0, 1); break;
    case 'sidestep': s.sprint = true; break;
    case 'spin': s.attack = E.move('spin', clamp(t / .45, 0, 1), 'active'); break;
    case 'held': s.run = 1; s.expr = 'shout'; break;
    case 'binned': s.pose = 'kneel'; s.expr = 'angry'; break;
  }
  if (p.flex && p.st === 'run' && t < 1) { s.pose = 'guard'; s.expr = 'shout'; } else p.flex = 0;
  if (p.turboOn) s.sprint = true;
  if (m.phase === 'kickoff' && m.ph.kicker === p.id) s.pose = 'crouch';
  if (m.phase === 'setkick' && m.ph.kicker === p.id && (m.sub === 'aim' || m.sub === 'place')) s.pose = 'crouch';
  return s;
}
TT.pres.rigState = rigState;

/** each update: rigs follow the state; the crowd's mood; kit mud */
TT.pres.update = (dt, m) => {
  PR.t += dt; PR.cheer = Math.max(0, PR.cheer - dt); PR.boo = Math.max(0, PR.boo - dt);
  if (!m || !PR.rigs.length) return;
  m.players.forEach((p, i) => {
    const rig = PR.rigs[i]; if (!rig) return;
    if (p.st === 'off') return;
    rig.update(dt, rigState(p, m));
    if (p.mud > .02) { rig.C.cloth = mixHex(PR.baseC[i].cloth, MUD, p.mud); rig.C.pants = mixHex(PR.baseC[i].pants, MUD, p.mud * .8); }
  });
  const r = m.ref;
  PR.ref.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx, vy: r.vy, facing: r.facing, down: r.down > 0 ? 1 : 0, hurt: r.down > 0, pose: r.signalT > 0 ? (r.signal === 'try' || r.signal === 'adv' ? 'wave' : 'cast') : (r.cardT > 0 ? 'cheer' : null) });
  for (const h of m.hazards) if (h.kind === 'chicken') PR.chicken.update(dt, { walk: 1, flap: 1, squash: Math.sin(PR.t * 20) * .15 });
};

/* ---- the oval ball (laces and panels), cached at 16 turns ---- */
const BALL_SPR = E.sprite(['..bbbbb..', '.bwwbwwb.', 'bbbwwwbbb', '.bwwbwwb.', '..bbbbb..'], { b: '#8a4a22', w: '#f0e8d8' });
const BALL_SPR2 = E.sprite(['...bbb...', '..bbwbb..', '.bbbwbbb.', '..bbwbb..', '...bbb...'], { b: '#8a4a22', w: '#f0e8d8' });

/* ---- skylines: each venue's silhouettes above the far stand ---- */
function drawSkyline(r, m) {
  const v = m.venue, sky = v.sky;
  const tod = m.o.time && m.o.time !== 'venue' ? m.o.time : v.time;
  const skyCols = tod === 'day' ? sky : tod === 'dusk' ? ['#2a2048', '#c8504a', '#f0a050'] : ['#05040c', '#141030', '#2a1a40'];
  r.sky(v.time === tod ? sky : skyCols);
  const [, topY] = r.w(G.CX, 0, 58);
  const baseY = Math.round(topY) + 2;
  PR.skyY = baseY;
  const W = r.W, ox = -r.w(0, 0, 0)[0];
  const t = PR.t;
  const draw = gg => {
    const col = tod === 'day' ? '#56606a' : tod === 'dusk' ? '#3a2438' : '#10101c';
    const col2 = tod === 'day' ? '#6a747c' : tod === 'dusk' ? '#4a2c40' : '#181828';
    if (v.skyline === 'hills') {
      for (let x = 0; x < W; x += 2) { const wx = x + ox * .3, h = 16 + Math.sin(wx * .012) * 8 + Math.sin(wx * .031) * 4; px.rect(gg, x, baseY - h, 2, h, col2); }
      const sx = Math.round(W * .7 - ox * .3 % W); px.rect(gg, sx, baseY - 40, 4, 24, col); px.poly(gg, [[sx - 1, baseY - 40], [sx + 2, baseY - 54], [sx + 5, baseY - 40]], col);
    } else if (v.skyline === 'docks') {
      for (let i = 0; i < 6; i++) { const cx = Math.round((i * 120 - ox * .4) % (W + 120)) - 40; px.rect(gg, cx, baseY - 50, 3, 50, col); px.rect(gg, cx - 18, baseY - 50, 40, 3, col); px.line(gg, cx + 20, baseY - 48, cx + 20, baseY - 30, col, 1); }
      const lx = Math.round(W * .85 - (ox * .2) % W); px.rect(gg, lx, baseY - 44, 6, 44, '#e8e0d0'); px.rect(gg, lx, baseY - 36, 6, 4, '#c83a2a'); px.rect(gg, lx - 1, baseY - 48, 8, 4, '#2a2a30');
      if (Math.sin(t * 2) > 0) px.rect(gg, lx + 1, baseY - 47, 4, 2, '#fff0a0');
      for (let i = 0; i < 5; i++) { const gx = Math.round((t * (20 + i * 5) + i * 90) % W), gy = baseY - 70 - i * 6 + Math.sin(t * 3 + i) * 3; px.line(gg, gx - 3, gy, gx, gy + 2, '#e8e8e8', 1); px.line(gg, gx, gy + 2, gx + 3, gy, '#e8e8e8', 1); }
    } else if (v.skyline === 'chimneys') {
      for (let i = 0; i < 7; i++) { const cx = Math.round((i * 90 - ox * .35) % (W + 90)) - 20, h = 40 + (i * 37 % 30); px.rect(gg, cx, baseY - h, 10, h, col); px.rect(gg, cx - 1, baseY - h, 12, 3, '#2a1818'); }
      px.blend(gg, .35, 'add', () => px.rect(gg, 0, baseY - 30, W, 30, '#6a1808'));
    } else if (v.skyline === 'city') {
      for (let i = 0; i < 14; i++) { const cx = Math.round((i * 46 - ox * .3) % (W + 46)) - 20, h = 30 + (i * 53 % 50); px.rect(gg, cx, baseY - h, 30, h, col); for (let wy = baseY - h + 4; wy < baseY - 4; wy += 6) for (let wx = cx + 3; wx < cx + 27; wx += 6) if (E.hash2(wx + i, wy) > .55) px.rect(gg, wx, wy, 2, 2, '#e8c860'); }
      const sx = Math.round(W * .4 - (ox * .3) % W); E.font.text(gg, 'GOLDBRICK HOLDINGS', sx, baseY - 92, '#e8c040', { outline: false, shadow: '#3a1a5a' });
    }
  };
  PR.drawSky = draw;
}

/* ---- the frame: sky and skyline, pitch and stands, crowd, posts, props, players, ball ---- */
TT.pres.drawWorld = (r, m) => {
  if (!m || !PR.cur) return;
  const v = m.venue, tod = m.o.time && m.o.time !== 'venue' ? m.o.time : v.time;
  drawSkyline(r, m);
  // the skyline sits behind the stand: drawn first, straight onto the buffer
  if (PR.drawSky && r.tgt) PR.drawSky(r.tgt);
  PR.cur.drawFloor(r);
  // mud patches, scorch marks, flame grates
  for (const md of m.mud) r.groundDisc(md.x, md.y, md.r, '#4a3018', .55 * md.k);
  for (const md of m.mud) r.groundDisc(md.x + 6, md.y - 4, md.r * .5, '#6a7a8a', .25);
  for (const s of (m.scorch || [])) r.groundDisc(s[0], s[1], 20, '#141010', .6);
  if (v.hazard === 'flames') for (const gr of TT.FLAME_GRATES) { r.groundDisc(gr.x, gr.y, 9, '#2a2a2a', 1); r.groundDisc(gr.x, gr.y, 6, '#7a2a10', .8); }
  PR.cur.queueWalls(r);
  // the crowd
  const scoreT = PR.cheer, booT = PR.boo, wave = m.phase !== 'play' && m.phaseT > 8;
  for (const f of PR.crowd) {
    let up = Math.sin(PR.t * 2 + f.ph) * .6;
    if (scoreT > 0 && f.side === PR.cheerSide) up = Math.abs(Math.sin(PR.t * 9 + f.ph)) * 5;
    if (wave) { const w = Math.sin(f.x * .02 - PR.t * 4); if (w > .85) up += 5; }
    if (booT > 0 && f.side !== PR.cheerSide) up = -1;
    const z = f.z + up;
    r.queue(f.x, f.y, z, g => {
      const [x, y] = r.w(f.x, f.y, z), X = Math.round(x), Y = Math.round(y);
      px.rect(g, X - 2, Y - 5, 4, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); px.rect(g, X - 1, Y - 9, 3, 1, f.hair);
      if (scoreT > 0 && f.side === PR.cheerSide) { px.rect(g, X - 3, Y - 10, 1, 4, f.skin); px.rect(g, X + 2, Y - 10, 1, 4, f.skin); }
      if (f.flag) { px.rect(g, X + 2, Y - 14, 1, 10, '#d8d8d8'); px.rect(g, X + 3, Y - 14, 6, 4, f.shirt); }
    });
  }
  // the posts on each try line, pads in the home colours
  for (const tl of [G.X0, G.X1]) {
    for (const py of [G.CY - G.POST, G.CY + G.POST]) r.queue(tl, py, 0, g => {
      const [x, y] = r.w(tl, py, 0), [, y1] = r.w(tl, py, G.UPRIGHT), [, yp] = r.w(tl, py, 20);
      px.rect(g, Math.round(x) - 1, Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); px.rect(g, Math.round(x), Math.round(y1), 1, Math.round(y - y1), '#c8c8c8');
      px.rect(g, Math.round(x) - 3, Math.round(yp), 6, Math.round(y - yp), m.kits[0].cloth); px.rect(g, Math.round(x) - 3, Math.round(yp), 2, Math.round(y - yp), m.kits[0].trim);
    });
    r.queue(tl, G.CY + G.POST, G.BAR, g => { const [x0, y0] = r.w(tl, G.CY - G.POST, G.BAR), [x1, y1] = r.w(tl, G.CY + G.POST, G.BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
    for (const cy of [G.Y0, G.Y1]) for (const cx of [tl, tl + (tl === G.X0 ? -G.IN : G.IN)]) r.queue(cx, cy, 0, g => { const [x, y] = r.w(cx, cy, 0); px.rect(g, Math.round(x), Math.round(y) - 12, 1, 12, '#e8e8e8'); px.rect(g, Math.round(x) + 1, Math.round(y) - 12, 4, 3, cx === tl ? '#e83a3a' : '#f0e040'); });
  }
  // sponsor boards on the near side: text on their faces
  const boards = v.boards;
  for (let i = 0; i < 9; i++) {
    const bx = 48 + i * 152, by = 45 * 16 + 1;
    r.queue(bx + 60, by, 8, g => { const [x, y] = r.w(bx + 60, by, 8); E.font.text(g, boards[i % boards.length], Math.round(x), Math.round(y) - 4, i % 2 ? '#ffe070' : '#ffffff', { align: 'center', outline: '#101020', font: 'tiny' }); }, { bias: 2 });
  }
  // props: benches, water bottles, kit bags, cones, the sin bin, cameramen, floodlights
  r.shape('bench', G.CX - 140, G.Y1 + 34, 0, { scale: 1.3 }); r.shape('bench', G.CX + 200, G.Y1 + 34, 0, { scale: 1.3 });
  for (let i = 0; i < 4; i++) r.prop('crate', G.CX - 260 + i * 160, G.Y1 + 26, 0, { size: .8 });
  for (const cx of [G.X0 + 150, G.X1 - 150]) r.prop('barrel', cx, G.Y1 + 36, 0, { size: .7, color: '#3a8ad0' });
  drawSinBin(r, m);
  if (tod !== 'day') for (const [fx, fy] of [[40, 40], [G.COLS * 16 - 40, 40], [40, G.Y1 + 50], [G.COLS * 16 - 40, G.Y1 + 50]]) {
    r.queue(fx, fy, 0, g => { const [x, y] = r.w(fx, fy, 0), [, yt] = r.w(fx, fy, 150); px.rect(g, Math.round(x) - 1, Math.round(yt), 3, Math.round(y - yt), '#5a5a64'); px.rect(g, Math.round(x) - 9, Math.round(yt) - 6, 19, 7, '#3a3a44'); for (let k = 0; k < 4; k++) px.rect(g, Math.round(x) - 8 + k * 5, Math.round(yt) - 5, 3, 4, '#fff8d0'); }, { emissive: true });
    TT.game.lights.add(fx, fy, 150, 420, .9, { color: '#fff4d8' });
  }
  if (tod !== 'day') { TT.game.lights.add(G.CX, G.CY, 60, 700, .55, { color: '#f8f0e0' }); TT.game.lights.add(G.X0 + 200, G.CY, 60, 500, .4); TT.game.lights.add(G.X1 - 200, G.CY, 60, 500, .4); }
  drawActors(r, m);
};
function drawSinBin(r, m) {
  const { x: bx, y: by } = G.BIN;
  r.queue(bx, by, 0, g => {
    const [x, y] = r.w(bx, by, 0), [, yt] = r.w(bx, by, 18), X = Math.round(x), Y = Math.round(y), H = Math.round(y - yt);
    px.rect(g, X - 16, Y - H, 32, H, '#2a6a3a'); px.rect(g, X - 16, Y - H, 32, 2, '#3a8a4a'); px.rect(g, X - 17, Y - H - 2, 34, 3, '#1e4a2a');
    E.font.text(g, 'SIN BIN', X, Y - H + 4, '#e8e8d0', { align: 'center', font: 'tiny', outline: false });
  });
  m.players.filter(p => p.st === 'binned').forEach((p, i) => {
    const rig = PR.rigs[p.id]; if (!rig) return;
    r.actor(bx - 8 + i * 8, by - 2, 4, (g, ox, oy) => rig.draw(g, ox, oy, E.charView(r.view)));
  });
}

/** the players, the referee, the chicken, the ball, the power-up, every marker on the grass */
function drawActors(r, m) {
  const view = E.charView(r.view);
  const b = m.ball;
  // the referee's eyes on the grass (Settings, Show the ref's view)
  if (TT.settings.refCone !== false && TT.settings.refCone !== 'Off' && m.ref.down <= 0 && (m.phase === 'play' || m.phase === 'ruck') || PR.dbg && PR.dbg.cone) r.sightCone({ x: m.ref.x, y: m.ref.y, facing: m.ref.facing }, { range: TUNE.v.refRange, fov: TUNE.v.refFov, alpha: .12, color: '#fff0a0' });
  // the landing marker of every kick in the air
  if (b.st === 'air' && b.landing && b.kind !== 'pass') { const k = (Math.sin(PR.t * 10) + 1) / 2; r.groundRing(b.landing.x, b.landing.y, 8 + k * 3, '#ffe060', .8); r.groundRing(b.landing.x, b.landing.y, 3, '#ffffff', .8); }
  // offside lines at rucks, scrums and lineouts
  if (m.phase === 'ruck' || m.phase === 'scrum' || (m.phase === 'lineout')) {
    for (const t of [0, 1]) {
      const d = dirOf(t), lx = m.phase === 'ruck' ? b.x - d * (t === m.ph.team ? 12 : -12) * -1 : (m.phase === 'scrum' ? m.ph.cx - d * 20 : m.ph.x - d * 51);
      const col = m.kits[t].cloth;
      r.decal(g => { for (let y = G.Y0; y < G.Y1; y += 12) { const [x0, y0] = r.w(lx, y, 0), [x1, y1] = r.w(lx, y + 6, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col, 1); } });
    }
  }
  // the use-it ring
  if (m.useIt) { const u = m.useIt; r.groundRing(u.x, u.y, 16 - u.t * 3, u.t > 2 ? '#ff5040' : '#ffe080', .8); }
  // seats' rings and chevrons
  TT.seats.forEach((s, i) => {
    if (s.pid < 0) return; const p = m.players[s.pid]; if (!p || p.st === 'binned' || p.st === 'off') return;
    r.groundRing(p.x, p.y, 9, s.color, .9); r.groundRing(p.x, p.y, 10, s.color, .5);
    r.queue(p.x, p.y, 56 * p.data.size, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size + 8), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], s.color); E.font.text(g, s.label, X, Y - 13, s.color, { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true, bias: 50 });
  });
  // the pass badges over the two receivers (L1 up the screen, R1 down)
  const h = b.st === 'held' ? m.players[b.holder] : null;
  if (h && h.ctl >= 0 && m.phase === 'play') {
    const seat = TT.seats[h.ctl], I = seat && seat.input;
    for (const side of [-1, 1]) {
      const list = receivers(h, side); const q = list.filter(x => Math.abs(x.y - h.y) < 110)[0] || list[0];
      if (q) r.queue(q.x, q.y, 50, g => { const [x, y] = r.w(q.x, q.y, 40 * q.data.size + 6); TT.glyph(g, side < 0 ? 'l1' : 'r1', Math.round(x), Math.round(y) - 6, I, true); }, { emissive: true, bias: 40 });
    }
  }
  // mouse hover: the teammate under the cursor (green: a legal pass; red: forward)
  if (TT.mouse && TT.mouse.hoverId >= 0 && m.players[TT.mouse.hoverId]) {
    const q = m.players[TT.mouse.hoverId], fwd = h && h.team === q.team && (q.x - h.x) * dirOf(h.team) > 4;
    r.groundRing(q.x, q.y, 12, fwd ? '#ff4040' : '#60ff80', 1);
  }
  // players
  for (const p of m.players) {
    if (p.st === 'binned' || p.st === 'off') continue;
    const rig = PR.rigs[p.id]; if (!rig) continue;
    r.shadow(p.x, p.y, 6 * p.data.size, .4);
    const opts = { xray: p.ctl >= 0 || b.holder === p.id ? { actors: true, color: p.ctl >= 0 && TT.seats[p.ctl] ? TT.seats[p.ctl].color : '#ffffff' } : undefined, pick: p };
    if (p.flash > 0) { opts.flash = '#ffffff'; opts.flashMix = .6; }
    if (p.fire > 0 || p.superK) opts.ghost = { color: p.superK === 'hurricane' ? '#80c0ff' : '#ff8030', life: .2, alpha: .5, owner: p };
    if (p.toasted > 0) { opts.flash = '#1a1008'; opts.flashMix = .7; }
    if (p.zapped > 0 && Math.floor(PR.t * 20) % 2 === 0) { if (!PR.skel) PR.skel = new E.Humanoid({ build: 'skeleton', weapon: null, size: 1.2 }); const sk = PR.skel; sk.update(0, { x: p.x, y: p.y, z: p.z, facing: p.facing, vx: 0, vy: 0 }); r.actor(p.x, p.y, p.z, (g, ox, oy) => sk.draw(g, ox, oy, view), { emissive: true }); continue; }
    r.actor(p.x, p.y, p.z, (g, ox, oy) => rig.draw(g, ox, oy, view), opts);
    if (p.st === 'stunned' || p.st === 'ground' && p.stun > .9 || p.held > 0) {
      r.queue(p.x, p.y, 30, g => { const [x, y] = r.w(p.x, p.y, 16 * p.data.size); for (let k = 0; k < 3; k++) { const a = PR.t * 6 + k * 2.1; px.rect(g, Math.round(x + Math.cos(a) * 7), Math.round(y - 6 + Math.sin(a) * 2), 2, 2, '#ffe040'); } }, { bias: 30 });
    }
    if (p.fire > 0 || p.superK === 'thunder') r.queue(p.x, p.y, 20, g => { const [x, y] = r.w(p.x, p.y, 10); px.blend(g, .7, 'add', () => { for (let k = 0; k < 5; k++) { const fx = x + Math.sin(PR.t * 13 + k * 2) * 5, fy = y - k * 5 - Math.abs(Math.sin(PR.t * 9 + k)) * 4; px.disc(g, Math.round(fx), Math.round(fy), 3 - k * .4, k < 2 ? '#ffd040' : '#ff6020'); } }); }, { emissive: true });
    if (p.power) { const ic = { pie: '#c88a3a', iron: '#a0a8b8', grease: '#e8e070' }[p.power.kind] || '#fff'; r.queue(p.x, p.y, 50, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size + 18); px.disc(g, Math.round(x), Math.round(y), 2, ic); }, { emissive: true }); }
    // the charge glow and its meter
    if (p.st === 'charge' && p.ctl >= 0) r.queue(p.x, p.y, 50, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size); const u = clamp(p.charge / TUNE.v.bigHitCharge, 0, 1); E.ui.bar(g, Math.round(x) - 10, Math.round(y) - 8, 20, 3, u, p.charge > 1.2 ? '#ff3020' : u >= 1 ? '#ffe040' : '#ff9040'); }, { emissive: true, bias: 40 });
    if (p.kickHold > .2 && p.ctl >= 0 && b.holder === p.id) r.queue(p.x, p.y, 50, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size); const u = clamp(p.kickHold / .9, 0, 1); E.ui.bar(g, Math.round(x) - 10, Math.round(y) - 8, 20, 3, u, u > .9 ? '#60ff80' : '#80c0ff'); }, { emissive: true, bias: 40 });
  }
  // the referee: his speech balloon, his card held high
  const rf = m.ref;
  r.shadow(rf.x, rf.y, 6, .4);
  r.actor(rf.x, rf.y, 0, (g, ox, oy) => PR.ref.draw(g, ox, oy, view));
  if (rf.callT > 0 && rf.call) r.queue(rf.x, rf.y, 60, g => { const [x, y] = r.w(rf.x, rf.y, 50); const w = E.font.width(rf.call) + 8; E.ui.box(g, Math.round(x - w / 2), Math.round(y) - 14, w, 12, { bg: '#ffffff', border: '#141010', gradient: false }); E.font.text(g, rf.call, Math.round(x), Math.round(y) - 11, '#141010', { align: 'center', outline: false }); }, { bias: 60 });
  if (rf.cardT > 0) r.queue(rf.x, rf.y, 50, g => { const [x, y] = r.w(rf.x, rf.y, 48); px.rect(g, Math.round(x) + 4, Math.round(y) - 6, 5, 7, rf.card === 'red' ? '#e02020' : '#f0d020'); }, { emissive: true, bias: 55 });
  // the chicken and the hazards' warnings
  for (const hz of m.hazards) {
    if (hz.kind === 'chicken') { r.shadow(hz.x, hz.y, 12, .4); r.actor(hz.x, hz.y, 4 + Math.abs(Math.sin(PR.t * 14)) * 3, (g, ox, oy) => { PR.chicken.draw(g, ox, oy, view); px.rect(g, ox - 2, oy - 34, 5, 4, '#e02020'); px.rect(g, ox + 4, oy - 24, 4, 2, '#f0a020'); }); }
    else if (hz.kind === 'flame') {
      if (hz.t < hz.warn) r.groundDisc(hz.x, hz.y, 12, '#ff8020', .3 + .3 * Math.sin(PR.t * 20));
      else if (hz.t < hz.warn + 1.2) { r.queue(hz.x, hz.y, 0, g => { const [x, y] = r.w(hz.x, hz.y, 0); px.blend(g, .85, 'add', () => { for (let k = 0; k < 8; k++) { const fy = y - k * 6 - (PR.t * 60 + k * 9) % 8; px.disc(g, Math.round(x + Math.sin(PR.t * 17 + k) * 3), Math.round(fy), 6 - k * .6, k < 3 ? '#fff0a0' : k < 6 ? '#ff9020' : '#c83010'); } }); }, { emissive: true }); TT.game.lights.add(hz.x, hz.y, 20, 80, 1, { color: '#ff8030' }); }
    } else if (hz.kind === 'lightning') {
      if (!hz.struck) { r.groundRing(hz.x, hz.y, 36, '#a0c0ff', .5 + .5 * Math.sin(PR.t * 25)); r.groundRing(hz.x, hz.y, 36 * (1 - hz.t / 1.4), '#ffffff', .6); }
      else if (hz.t < 1.6) r.queue(hz.x, hz.y, 0, g => { const [x, y] = r.w(hz.x, hz.y, 0); let cx = x, cy = 0; while (cy < y) { const nx = cx + (E.hash2(cy | 0, hz.x | 0) - .5) * 16, ny = cy + 14; px.line(g, Math.round(cx), Math.round(cy), Math.round(nx), Math.round(ny), '#ffffff', 2); cx = nx; cy = ny; } }, { emissive: true });
    }
  }
  // the power-up (and its shadow), blinking in its last three seconds
  if (m.pu) { const pu = m.pu; if (pu.landed || pu.z < 60) r.shadow(pu.x, pu.y, 5, .4); if (!(pu.landed && pu.t > 12 && Math.floor(PR.t * 8) % 2)) r.queue(pu.x, pu.y, pu.z, g => { const [x, y] = r.w(pu.x, pu.y, pu.z + 4 + (pu.landed ? Math.sin(PR.t * 4) * 2 : 0)); TT.drawPowerup(g, pu.kind, Math.round(x), Math.round(y)); }, { emissive: true }); }
  // the ball
  if (b.st !== 'dead' || m.phase === 'kickoff' || m.phase === 'setkick' || m.phase === 'stop') {
    r.shadow(b.x, b.y, 3, .45);
    const spr = Math.floor(b.rot * 4) % 2 ? BALL_SPR2 : BALL_SPR;
    r.sprite(b.x, b.y, b.z + 2, b.kind === 'pass' && b.st === 'air' ? BALL_SPR : spr, { anchor: 'center', rot: b.st === 'air' && b.kind === 'pass' ? 0 : (b.st === 'air' ? b.rot : Math.atan2(b.vy, b.vx)) });
    if (b.st === 'held' || b.st === 'placed' || b.st === 'loose') r.groundRing(b.x, b.y, 4, '#ffffff', .25);
  }
  // off-screen arrows for the ball and each seat's player
  if (m.phase === 'play' && b.st !== 'held') r.marker(b.x, b.y, b.z, { offscreen: 'arrow', color: '#ffffff', label: '' });
}

/* ---- the power-up sprites (12-14 px, with a glint) ---- */
const PU_SPR = {
  pie: E.sprite(['..yyyyyy..', '.yYYYYYYy.', 'yYbbbbbbYy', 'yYbBBBBbYy', 'sssssssss.', '.ssssssss.'], { y: '#c8822a', Y: '#e8a848', b: '#8a4a1a', B: '#a85a22', s: '#c8c8d0' }),
  iron: E.sprite(['.mmm..mmm.', 'mMMMmmMMMm', 'mMrMmmMrMm', '.mmm..mmm.', '..mmmmmm..'], { m: '#7a8290', M: '#b8c0cc', r: '#3a3a44' }),
  boot: E.sprite(['w...gggg..', 'ww.gGGGg..', '.wwgGGGg..', '..gGGGGggg', '..gGGGGGGg', '..gggggggg'], { g: '#c89a20', G: '#f0d050', w: '#ffffff' }),
  grease: E.sprite(['.jj....jj.', 'jJjjjjjjJj', '.jjJjjJjj.', '.jjjjjjjj.', '.jjJjjjjj.', '.jjjjjjjj.'], { j: '#d8c840', J: '#fff8a0' }),
  horn: E.sprite(['..........rr', '.....rrrrRRr', 'kkkrrRRRRRRr', 'kkkrrRRRRRRr', '.....rrrrRRr', '..........rr'], { r: '#c82020', R: '#f04040', k: '#2a2a30' })
};
TT.drawPowerup = (g, kind, x, y) => { const s = PU_SPR[kind]; if (!s) return; px.sprite(g, s, x - (s.width >> 1), y - (s.height >> 1)); if (Math.sin(PR.t * 5) > .7) px.rect(g, x + 2, y - 3, 1, 1, '#ffffff'); };

/* ==== 31-hud.js ==== */
/* ---- THE HUD: button badges that follow the last device, prompts, the TV score bug, the radar, banners, seat cards,
 * and the set pieces' widgets. Everything anchored to r.W and r.H ---- */
TT.hud = { banners: [], ui: {} };
const HUD = TT.hud;
const PS = { x: ['✕', '#6a9cf0'], ci: ['○', '#f05a64'], sq: ['□', '#e07ac8'], tri: ['△', '#4ad0a0'] };
const XB = { x: ['A', '#5ac85a'], ci: ['B', '#e8503a'], sq: ['X', '#3a86e8'], tri: ['Y', '#f0c830'] };
const PILLS = { l1: ['L1', 'LB'], r1: ['R1', 'RB'], turbo: ['R2', 'RT'], view: ['R3', 'RS'], start: ['OPT', 'MENU'], pause: ['OPT', 'MENU'] };
const PAD_ACT = { 0: 'x', 1: 'ci', 2: 'sq', 3: 'tri', 4: 'l1', 5: 'r1', 7: 'turbo', 9: 'start', 11: 'view' };
TT.glyphFamily = () => (TT.settings.glyphs === 'xbox' ? 'xbox' : 'playstation');
/** which face of the pad an action sits on, after the player's rebinding */
function padFace(I, act) {
  if (!I || !I.map || !I.map[act]) return act;
  const c = I.map[act].find(k => /^Pad\d+$/.test(k)); if (!c) return act;
  return PAD_ACT[+c.slice(3)] || act;
}
/** a badge for an action on the device used last: a pad button, a keycap, or a mouse button. Returns its width */
TT.glyph = (g, act, x, y, I, small, measure) => {
  I = I || TT.game.input;
  const dev = TT.forceDevice || (I.lastDevice === 'touch' ? 'keyboard' : I.lastDevice);
  if (dev === 'gamepad') {
    const face = padFace(I, act), fam = TT.glyphFamily();
    if (PS[face]) {
      if (measure) return 11;
      const [sym, col] = (fam === 'xbox' ? XB : PS)[face];
      px.disc(g, x, y, 5, '#141820'); px.disc(g, x, y, 4, '#2a3040');
      E.font.text(g, sym, x + (fam === 'xbox' ? 0 : 0), y - 3, col, { align: 'center', outline: false });
      return 11;
    }
    const lab = PILLS[face] ? PILLS[face][fam === 'xbox' ? 1 : 0] : face.toUpperCase();
    const w = E.font.width(lab, { font: 'tiny' }) + 6; if (measure) return w;
    E.ui.box(g, x - w / 2, y - 4, w, 9, { bg: '#2a3040', border: '#141820', gradient: false });
    E.font.text(g, lab, Math.round(x), y - 2, '#e8ecf8', { align: 'center', font: 'tiny', outline: false });
    return w;
  }
  const codes = (I.map && I.map[act]) || [];
  if (dev === 'mouse') {
    const mc = codes.find(c => c.startsWith('Mouse'));
    if (mc) { if (measure) return 9; const btn = +mc.slice(5); px.rect(g, x - 4, y - 5, 8, 11, '#e8e8f0'); px.rect(g, x - 4, y - 5, 8, 1, '#a0a0b0'); px.rect(g, btn === 2 ? x : x - 4, y - 5, 4, 5, '#f05a64'); px.rect(g, x, y - 5, 1, 5, '#6a6a78'); return 9; }
  }
  const kc = codes.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || codes[0] || '';
  const lab = (I.codeLabel ? I.codeLabel(kc) : kc).toUpperCase().replace('SHIFT', 'SHIFT').slice(0, 6);
  const w = Math.max(9, E.font.width(lab, { font: 'tiny' }) + 6); if (measure) return w;
  px.rect(g, x - w / 2, y - 4, w, 10, '#5a5e6a'); px.rect(g, x - w / 2, y - 5, w, 9, '#e4e6ec'); px.rect(g, x - w / 2 + 1, y - 4, w - 2, 1, '#ffffff');
  E.font.text(g, lab, Math.round(x), y - 3, '#20242c', { align: 'center', font: 'tiny', outline: false });
  return w;
};
/** a prompt with badges: "{b:x} TACKLE  {b:ci} SWITCH" centred at x (align 'left' starts there); returns its width */
TT.prompt = (g, str, x, y, I, o = {}) => {
  const parts = String(str).split(/(\{b:[a-z0-9]+\})/).filter(Boolean);
  const sc = o.scale || 1, fo = { scale: sc, outline: o.outline === undefined ? '#000' : o.outline, shadow: o.shadow };
  const widths = parts.map(s => s.startsWith('{b:') ? TT.glyph(g, s.slice(3, -1), 0, 0, I, false, true) + 2 : E.font.width(s, fo));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = o.align === 'left' ? x : Math.round(x - total / 2);
  parts.forEach((s, i) => {
    if (s.startsWith('{b:')) TT.glyph(g, s.slice(3, -1), cx + widths[i] / 2, y + 3 * sc, I);
    else E.font.text(g, s, cx, y, o.color || '#ffffff', fo);
    cx += widths[i];
  });
  return total;
};

/* ---- banners (TRY!, MONSTER HIT!...) ---- */
HUD.banner = (text, o = {}) => { HUD.banners = HUD.banners.filter(b => b.text !== text).slice(-2); HUD.banners.push({ text, t: 0, life: o.life || 1.6, colors: o.colors || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], scale: o.scale || 3, sub: o.sub || '' }); };
HUD.step = dt => { for (const b of HUD.banners) b.t += dt; HUD.banners = HUD.banners.filter(b => b.t < b.life); };

/* ---- the crests: a shield in the team's colours with its emblem ---- */
TT.drawCrest = (g, team, x, y, s = 1) => {
  const [kind, c1, c2] = team.crest, w = Math.round(12 * s), h = Math.round(14 * s);
  px.poly(g, [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 6], [x, y + h / 2], [x - w / 2, y + h / 6]], '#141820');
  px.poly(g, [[x - w / 2 + 1, y - h / 2 + 1], [x + w / 2 - 1, y - h / 2 + 1], [x + w / 2 - 1, y + h / 6], [x, y + h / 2 - 1], [x - w / 2 + 1, y + h / 6]], c1);
  const k = Math.max(1, Math.round(s));
  if (kind === 'bird') { px.rect(g, x - 3 * k, y - k, 5 * k, 2 * k, c2); px.rect(g, x + k, y - 2 * k, 2 * k, k, c2); px.rect(g, x - 4 * k, y - 2 * k, k, k, c2); }
  else if (kind === 'badger') { px.rect(g, x - 3 * k, y - 3 * k, 6 * k, 6 * k, c2); px.rect(g, x - k, y - 3 * k, 2 * k, 6 * k, c1); }
  else if (kind === 'gull') { px.line(g, x - 4 * k, y - k, x, y + k, c2, k); px.line(g, x, y + k, x + 4 * k, y - k, c2, k); px.rect(g, x - k, y + 2 * k, 2 * k, k, '#e8a030'); }
  else if (kind === 'anvil') { px.rect(g, x - 4 * k, y - 2 * k, 8 * k, 2 * k, c2); px.rect(g, x - 2 * k, y, 4 * k, 2 * k, c2); px.rect(g, x - k, y - 5 * k, 2 * k, 2 * k, '#ffd040'); }
  else { E.font.text(g, 'M', x, y - 3 * k, c2, { align: 'center', outline: false, scale: k }); }
};

/* ---- the match HUD ---- */
HUD.draw = (r, m) => {
  if (!m) return;
  r.overlay(g => {
    const W = r.W, H = r.H, big = TT.settings.uiScale !== 'Normal';
    HUD.scoreBug(g, m, 6, 6);
    HUD.radar(g, m, W, H);
    // banners
    HUD.banners.forEach((b, i) => {
      const k = b.t < .15 ? b.t / .15 : 1, y = Math.round(H * .3 + i * 30), sc = Math.max(1, Math.round(b.scale * (b.t < .15 ? .6 + .4 * k : 1)));
      E.font.title(g, b.text, W / 2, y, { align: 'center', scale: sc, colors: b.colors, depth: 2 });
      if (b.sub) E.font.text(g, b.sub, W / 2, y + 8 * sc + 6, '#ffffff', { align: 'center', outline: '#000' });
    });
    HUD.seatCards(g, m, W, H);
    HUD.widgets(g, m, W, H, r);
    HUD.prompts(g, m, W, H, big);
    if (m.ref.down > 0) E.font.text(g, 'REF DOWN! ANYTHING GOES!', W / 2, 30, '#ff7050', { align: 'center', outline: '#000' });
    if (m.adv) E.font.text(g, 'ADVANTAGE ' + m.teams[m.adv.team].short, W / 2, 30, '#ffe080', { align: 'center', outline: '#000' });
    if (TT.net && TT.net.waiting) E.font.text(g, 'WAITING FOR THE HOST...', W / 2, H / 2, '#ffffff', { align: 'center', outline: '#000', scale: 2 });
  });
};
HUD.scoreBug = (g, m, x, y) => {
  const t0 = m.teams[0], t1 = m.teams[1];
  E.ui.box(g, x, y, 150, 30, { bg: ['#1a2238', '#0c1020'], border: '#e8c040', alpha: .92 });
  TT.drawCrest(g, t0, x + 9, y + 9, .9); TT.drawCrest(g, t1, x + 82, y + 9, .9);
  E.font.text(g, t0.short, x + 17, y + 4, '#f0ecdc', { outline: false });
  E.font.text(g, String(m.score[0]), x + 58, y + 3, '#ffffff', { outline: false, scale: 2, align: 'right' });
  E.font.text(g, t1.short, x + 90, y + 4, '#f0ecdc', { outline: false });
  E.font.text(g, String(m.score[1]), x + 132, y + 3, '#ffffff', { outline: false, scale: 2, align: 'right' });
  // hype under each name
  for (const t of [0, 1]) {
    const hx = x + 4 + t * 73, full = m.hype[t] >= 100;
    E.ui.bar(g, hx, y + 21, 66, 4, m.hype[t] / 100, full ? (Math.floor(PR.t * 6) % 2 ? '#ffffff' : '#ff60c0') : m.kits[t].cloth);
    if (full) E.font.text(g, 'SUPER!', hx + 33, y + 24, '#ffe040', { align: 'center', font: 'tiny', outline: '#000' });
  }
  // the clock (sevens time), the half, the hooter
  const shown = m.drill ? 'TRAINING' : m.suddenDeath ? 'GOLDEN POINT' : (m.half === 1 ? '1ST ' : '2ND ') + TT.fmtClock(Math.min(420, m.clock * 420 / m.halfLen));
  E.ui.box(g, x, y + 31, 76, 11, { bg: '#0c1020', border: '#3a4460', alpha: .9, gradient: false });
  E.font.text(g, shown, x + 4, y + 33, m.hooter ? (Math.floor(PR.t * 4) % 2 ? '#ff6050' : '#ffffff') : '#c8d0e8', { font: 'tiny', outline: false });
  if (m.hooter && !m.suddenDeath) E.font.text(g, 'HOOTER', x + 80, y + 33, '#ff6050', { font: 'tiny', outline: '#000' });
  // the sin bin's seconds
  let bx = x + 4;
  for (const p of m.players) if (p.st === 'binned') { px.rect(g, bx, y + 45, 8, 6, '#2a6a3a'); E.font.text(g, String(Math.ceil(p.binT)), bx + 10, y + 45, m.kits[p.team].cloth, { font: 'tiny', outline: '#000' }); bx += 26; }
  // the wind
  if (m.wind.s > .05 && (m.weather === 'wind' || m.weather === 'storm')) {
    const wx = x + 140, wy = y + 37, a = m.wind.a, l = 4 + m.wind.s * 6;
    px.line(g, Math.round(wx - Math.cos(a) * l), Math.round(wy - Math.sin(a) * l * .6), Math.round(wx + Math.cos(a) * l), Math.round(wy + Math.sin(a) * l * .6), '#e8f0ff', 1);
    px.disc(g, Math.round(wx + Math.cos(a) * l), Math.round(wy + Math.sin(a) * l * .6), 1.5, '#ff8040');
    E.font.text(g, 'WIND', wx - 22, wy - 2, '#a8b8d8', { font: 'tiny', outline: '#000' });
  }
};
HUD.radar = (g, m, W) => {
  const s = .085, w = Math.round((G.DEAD[1] - G.DEAD[0]) * s), h = Math.round((G.Y1 - G.Y0) * s), ca = TT.game.cornerArea && TT.game.cornerArea();
  const x0 = W - w - 8, y0 = ca && ca.x0 < x0 + w && ca.y1 < 80 ? Math.ceil(ca.y1) + 4 : 8;
  E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#1e4a26', border: '#8ab090', alpha: .8, gradient: false });
  for (const lx of [G.X0, G.X1, G.CX]) px.rect(g, Math.round(x0 + (lx - G.DEAD[0]) * s), y0, 1, h, '#a8d0a8');
  for (const p of m.players) { if (!onField(p) || p.st === 'binned') continue; const X = Math.round(x0 + (p.x - G.DEAD[0]) * s), Y = Math.round(y0 + (p.y - G.Y0) * s); px.rect(g, X - 1, Y - 1, 3, 3, '#000'); px.rect(g, X, Y, 1, 1, m.kits[p.team].cloth); if (p.ctl >= 0 && TT.seats[p.ctl]) { px.rect(g, X - 2, Y - 2, 5, 1, TT.seats[p.ctl].color); px.rect(g, X - 2, Y + 2, 5, 1, TT.seats[p.ctl].color); } }
  const b = m.ball; px.rect(g, Math.round(x0 + (b.x - G.DEAD[0]) * s), Math.round(y0 + (b.y - G.Y0) * s), 2, 2, '#ffffff');
};
HUD.seatCards = (g, m, W, H) => {
  TT.seats.forEach((s, i) => {
    if (s.kind === 'script' || s.pid < 0) return; const p = m.players[s.pid]; if (!p) return;
    const cw = 98, x = i % 2 === 0 ? 6 + (i >> 1) * (cw + 4) : W - 6 - cw - (i >> 1) * (cw + 4), y = H - 40;
    E.ui.box(g, x, y, cw, 34, { bg: ['#1a2238', '#0c1020'], border: s.color, alpha: .85 });
    const rig = PR.rigs[p.id]; if (rig) rig.drawPortrait(g, x + 3, y + 3, 28, { zoom: 2.4, bg: '#2a3450' });
    E.font.text(g, s.label + ' ' + TT.ascii(p.data.nick).slice(0, 13), x + 34, y + 4, s.color, { font: 'tiny', outline: false });
    E.font.text(g, p.role, x + 34, y + 11, '#a8b0c8', { font: 'tiny', outline: false });
    E.ui.bar(g, x + 34, y + 19, cw - 40, 4, p.turbo, p.turboOn ? '#ffe040' : '#40c0ff');
    E.font.text(g, 'TURBO', x + 34, y + 25, '#6a7490', { font: 'tiny', outline: false });
    if (p.power) E.font.text(g, TT.POWERUPS[p.power.kind].name.split(' ')[0] + ' ' + Math.ceil(p.power.t), x + 60, y + 25, '#ffd040', { font: 'tiny', outline: false });
    if (p.fire > 0) E.font.text(g, 'ON FIRE', x + 60, y + 11, '#ff8030', { font: 'tiny', outline: false });
  });
};
/** the context prompts: what the buttons do now, for the first local seat */
HUD.prompts = (g, m, W, H, big) => {
  const s = TT.seats.find(q => q.kind === 'local'); if (!s || s.pid < 0) return;
  const p = m.players[s.pid], I = s.input, b = m.ball;
  let txt = '';
  if (m.phase === 'play') {
    if (b.holder === p.id) {
      const tl = tryLineOf(p.team), inGoal = (p.x - tl) * dirOf(p.team) > 0, zone = (tl - p.x) * dirOf(p.team) < 245;
      txt = inGoal ? '{b:x} DIVE! GROUND IT' : '{b:l1}{b:r1} PASS  {b:x} STEP  {b:sq} FEND  {b:ci} ' + (zone ? 'HOLD: DROP GOAL' : 'KICK');
      if (m.hype[p.team] >= 100) txt += '  {b:tri} THUNDER RUN';
    } else if (b.st === 'held' && m.players[b.holder].team !== p.team) {
      txt = '{b:x} TACKLE (HOLD: BIG HIT)  {b:sq} DIVE  {b:ci} SWITCH';
      if (m.hype[p.team] >= 100) txt += '  {b:tri} HURRICANE';
    } else txt = '{b:turbo} TURBO  {b:ci} SWITCH  {b:l1}{b:r1} SWITCH UP/DOWN';
  } else if (m.phase === 'ruck') txt = humansOf(m.ph.team).length && p.team === m.ph.team ? 'MASH {b:x} TO WIN THE RUCK!' : 'MASH {b:x}!   {b:sq} JACKAL (FIRST THERE)';
  else if (m.phase === 'walkout') txt = '{b:x} SKIP';
  else if (m.phase === 'half') txt = '{b:x} SECOND HALF';
  else if (m.phase === 'kickoff' && m.ph.kicker === p.id) txt = 'STICK AIMS  HOLD {b:ci} POWER, LET GO TO KICK';
  if (!txt) return;
  const y = (TT.comm.talk && TT.comm.talk.open ? H - 76 : H - (TT.seats.some(q => q.kind === 'local' && q.pid >= 0) ? 54 : 18)) - (big ? 6 : 0);
  E.ui.box(g, W / 2 - 150, y - 4, 300, big ? 18 : 15, { bg: '#0c1020', border: '#3a4460', alpha: .7, gradient: false });
  TT.prompt(g, txt, W / 2, y, I);
};

/* ---- the set pieces' widgets ---- */
HUD.widgets = (g, m, W, H, r) => {
  const cx = W / 2, cy = H / 2, ph = m.ph, s = m.sub, I = (TT.seats.find(q => q.kind === 'local') || {}).input;
  TT.mouse && (TT.mouse.kickAim = null, TT.mouse.cards = null);
  if (m.phase === 'ruck') {
    const v = ph.bar, w = 160, x = cx - w / 2, y = 62;
    E.ui.box(g, x - 4, y - 14, w + 8, 26, { bg: '#0c1020', border: '#e8c040', alpha: .85 });
    E.font.text(g, 'RUCK!', cx, y - 11, '#ffe080', { align: 'center', outline: false });
    px.rect(g, x, y, w / 2, 7, m.kits[1 - ph.team].cloth); px.rect(g, cx, y, w / 2, 7, m.kits[ph.team].cloth);
    const k = Math.round(cx + v * w / 2); px.rect(g, k - 2, y - 2, 4, 11, '#ffffff');
    E.font.text(g, m.teams[1 - ph.team].short, x + 2, y + 1, '#000', { font: 'tiny', outline: false }); E.font.text(g, m.teams[ph.team].short, x + w - 2, y + 1, '#000', { font: 'tiny', outline: false, align: 'right' });
  }
  if (m.phase === 'scrum') {
    const y = Math.round(H * .3);
    if (s === 'crouch' || s === 'bind') E.font.title(g, s.toUpperCase() + '...', cx, y - 10, { align: 'center', scale: 3, colors: ['#ffffff', '#c8d8ff'] });
    if (s === 'set') {
      const u = clamp(ph.subT / .5, 0, 1.3), rad = Math.round(lerp(40, 10, Math.min(1, u)));
      E.font.title(g, 'SET!', cx, y - 10, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ff8a40'] });
      const ptsR = n => { for (let a = 0; a < TAU; a += TAU / n) px.rect(g, Math.round(cx + Math.cos(a) * rad), Math.round(y + 40 + Math.sin(a) * rad * .6), 2, 2, u >= 1 ? '#60ff80' : '#ffffff'); };
      ptsR(28); for (let a = 0; a < TAU; a += TAU / 20) px.rect(g, Math.round(cx + Math.cos(a) * 10), Math.round(y + 40 + Math.sin(a) * 6), 1, 1, '#60ff80');
      TT.prompt(g, '{b:x} WHEN THE RING CLOSES', cx, y + 70, I);
    }
    if (s === 'push' || s === 'result') {
      const w = 180, x = cx - w / 2, v = ph.bar, feed = ph.team;
      E.ui.box(g, x - 4, y - 16, w + 8, 30, { bg: '#0c1020', border: '#e8c040', alpha: .85 });
      E.font.text(g, ph.grade ? 'SCRUM: ' + (ph.grade[0] || '') + ' / ' + (ph.grade[1] || '') : 'SCRUM', cx, y - 13, '#ffe080', { align: 'center', outline: false });
      px.rect(g, x, y, w / 2, 8, m.kits[1 - feed].cloth); px.rect(g, cx, y, w / 2, 8, m.kits[feed].cloth);
      const k = Math.round(cx + v * w / 2); px.rect(g, k - 2, y - 2, 4, 12, '#ffffff');
      if (s === 'push') TT.prompt(g, 'ALTERNATE {b:l1} {b:r1} TO SHOVE!', cx, y + 20, I);
    }
  }
  if (m.phase === 'lineout' && (s === 'call' || s === 'throw' || s === 'flight')) {
    const hu = [humansOf(0).length > 0, humansOf(1).length > 0], y = cy - 76, names = ['FRONT', 'MIDDLE', 'BACK'];
    TT.mouse && (TT.mouse.cards = []);
    for (let k = 0; k < 3; k++) {
      const x = cx - 105 + k * 72, mine = [0, 1].filter(t => hu[t] && ph.call[t] === k);
      E.ui.box(g, x, y, 66, 18, { bg: mine.length ? '#3a4a20' : '#141a2a', border: mine.length ? '#e8e060' : '#4a5470', alpha: .9 });
      E.font.text(g, names[k], x + 33, y + 6, '#ffffff', { align: 'center', outline: false });
      mine.forEach((t, j) => px.rect(g, x + 4 + j * 6, y + 3, 4, 4, m.kits[t].cloth));
      if (TT.mouse) TT.mouse.cards.push([x, y, 66, 18, k]);
    }
    if (s === 'call') TT.prompt(g, '{b:l1}{b:r1} PICK A POD  {b:x} CALL IT', cx, y + 24, I);
    if (s === 'throw' && hu[ph.team]) {
      const w = 160, x = cx - w / 2, yy = y + 30;
      px.rect(g, x, yy, w, 8, '#c83030'); px.rect(g, cx - w * .35, yy, w * .7, 8, '#e8c040'); px.rect(g, cx - w * .175, yy, w * .35, 8, '#40c060');
      const nx = Math.round(cx + ph.needle * w / 2); px.rect(g, nx - 1, yy - 3, 3, 14, '#ffffff');
      TT.prompt(g, '{b:x} THROW IN THE GREEN', cx, yy + 14, I);
    }
  }
  if (m.phase === 'kickoff' && m.ph.holding) { const w = 80; E.ui.bar(g, cx - w / 2, H - 80, w, 6, m.ph.power, m.ph.power > .85 ? '#60ff80' : '#ffd040'); }
  if (m.phase === 'penalty') {
    const hu = humansOf(ph.team).length > 0, n = ph.opts.length, cw = 104, y = cy - 50;
    E.font.title(g, ph.free ? 'FREE KICK' : 'PENALTY', cx, y - 26, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
    E.font.text(g, m.teams[ph.team].short + ' TO CHOOSE', cx, y - 8, '#c8d0e8', { align: 'center', outline: '#000' });
    TT.mouse && (TT.mouse.cards = []);
    ph.opts.forEach((o, i) => {
      const x = Math.round(cx - n * (cw + 6) / 2 + i * (cw + 6)), on = ph.choice === i;
      E.ui.box(g, x, y, cw, 50, { bg: on ? ['#3a4a70', '#1a2440'] : ['#1a2030', '#0c1020'], border: on ? '#ffe060' : '#4a5470', alpha: .95 });
      E.font.text(g, o[1], x + cw / 2, y + 10, on ? '#ffe060' : '#ffffff', { align: 'center', outline: false });
      E.font.text(g, o[2], x + cw / 2, y + 26, '#a8b0c8', { align: 'center', font: 'tiny', outline: false, wrap: cw - 8 });
      if (TT.mouse) TT.mouse.cards.push([x, y, cw, 50, i]);
    });
    if (hu) TT.prompt(g, '{b:l1}{b:r1} OR STICK CHOOSE  {b:x} PICK', cx, y + 58, I);
  }
  if (m.phase === 'setkick') HUD.kickWidget(g, m, W, H, I);
  if (m.phase === 'half') HUD.halftime(g, m, W, H);
  if (m.phase === 'stop' && ph.label) E.font.title(g, ph.label, cx, H * .3, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
};
/** the set kick: the posts from behind the kicker, the reticle (with its sway), the wind, the meter, the clock */
HUD.kickWidget = (g, m, W, H, I) => {
  const ph = m.ph, s = m.sub, k = m.players[ph.kicker], hu = ph.human;
  const bw = 104, bh = 76, x0 = 8, y0 = 62;
  E.ui.box(g, x0, y0, bw, bh, { bg: ['#2a3a60', '#3a6a3a'], border: '#e8c040', alpha: .95 });
  const D = Math.max(40, ph.D || 100), k2 = clamp(160 / D, .35, 1);
  const cx = x0 + bw / 2, gy = y0 + bh - 14, pw = Math.round(bw * .3 * k2), barY = Math.round(gy - (bh - 30) * .42 * k2), topY = Math.max(y0 + 6, Math.round(gy - (bh - 30) * .95 * k2)), sc = pw / 60 * 1.4;
  const ang = Math.atan2(G.CY - ph.ky, ph.tl - (ph.kx || ph.tl)) - (dirOf(ph.team) > 0 ? 0 : PI), off = clamp(Math.round(TT.angDiff(0, ang) * 30) * (dirOf(ph.team) > 0 ? 1 : -1), -bw / 2 + pw + 4, bw / 2 - pw - 4);
  const pcx = cx - off;
  px.rect(g, x0 + 2, gy, bw - 4, bh - (gy - y0) - 2, '#3a7a3a');
  px.rect(g, pcx - pw, topY, 2, gy - topY, '#f4f4f0'); px.rect(g, pcx + pw - 1, topY, 2, gy - topY, '#f4f4f0'); px.rect(g, pcx - pw, barY, pw * 2 + 1, 2, '#f4f4f0');
  px.rect(g, pcx - pw - 1, gy - 8, 4, 8, m.kits[0].cloth); px.rect(g, pcx + pw - 2, gy - 8, 4, 8, m.kits[0].cloth);
  const rx = Math.round(clamp(cx + (ph.aim + (hu ? ph.sway : 0)) * sc, x0 + 6, x0 + bw - 6)), ry = barY - 14;
  px.rect(g, rx - 5, ry, 11, 1, '#ff4040'); px.rect(g, rx, ry - 5, 1, 11, '#ff4040'); px.rect(g, rx - 2, ry - 2, 5, 5, '#ff8080');
  // the wind
  if (m.wind.s > .05) { const a = m.wind.a; px.line(g, x0 + 16, y0 + 14, Math.round(x0 + 16 + Math.cos(a) * 10), Math.round(y0 + 14 + Math.sin(a) * 6), '#ffffff', 1); E.font.text(g, 'WIND', x0 + 6, y0 + 22, '#e8f0ff', { font: 'tiny', outline: false }); }
  E.font.text(g, TT.metres(ph.D || 0) + ' M', x0 + bw - 6, y0 + 6, '#ffffff', { align: 'right', outline: '#000' });
  E.font.text(g, ph.kind === 'conv' ? 'CONVERSION' : 'PENALTY GOAL', W / 2, 50, '#ffe080', { align: 'center', outline: '#000' });
  if (s !== 'flight' && s !== 'result') E.font.text(g, ':' + String(Math.ceil(ph.clock)).padStart(2, '0'), x0 + 6, y0 + bh - 10, ph.clock < 6 ? '#ff6050' : '#ffffff', { font: 'tiny', outline: '#000' });
  // the meter: the mark the distance needs, the sweet band above it
  const mx = x0 + bw + 6, mh = bh - 10, my = y0 + 5;
  px.rect(g, mx, my, 8, mh, '#141820');
  const need = ph.need || .5, band = m.megaBoot[ph.team] > 0 ? .12 : .06;
  px.rect(g, mx + 1, Math.round(my + mh * (1 - Math.min(1, need + band * 2))), 6, Math.max(2, Math.round(mh * band * 2)), '#40c060');
  px.rect(g, mx, Math.round(my + mh * (1 - need)), 8, 1, '#ffffff');
  px.rect(g, mx + 2, Math.round(my + mh * (1 - ph.power)), 4, Math.round(mh * ph.power), '#ffd040');
  if (hu) {
    if (s === 'place') TT.prompt(g, 'STICK: MOVE THE TEE  {b:x} SET IT', W / 2, H - 92, I);
    if (s === 'aim') TT.prompt(g, 'STICK OR MOUSE: AIM  HOLD {b:ci} POWER, LET GO', W / 2, H - 92, I);
    if (TT.mouse && s === 'aim') TT.mouse.kickBox = [x0, y0, bw, bh, sc];
  }
  if (s === 'result' && ph.result) E.font.title(g, ph.result === 'good' ? (ph.kind === 'conv' ? 'CONVERTED!' : 'GOOD!') : ph.result === 'doink' ? 'DOINK!' : 'WIDE!', W / 2, 70, { align: 'center', scale: 2, colors: ph.result === 'good' ? ['#ffffff', '#80ff90'] : ['#ffffff', '#ff8070'] });
  void k;
};
HUD.halftime = (g, m, W, H) => {
  E.ui.box(g, W / 2 - 150, H / 2 - 70, 300, 130, { bg: ['#2a1c14', '#140c08'], border: '#e8c040', alpha: .95 });
  E.font.title(g, 'HALF-TIME', W / 2, H / 2 - 62, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
  E.font.text(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, W / 2, H / 2 - 36, '#ffffff', { align: 'center', outline: false, scale: 2 });
  const tiles = [['TRIES', m.stats[0].tries, m.stats[1].tries], ['TACKLES', m.stats[0].tackles, m.stats[1].tackles], ['BIG HITS', m.stats[0].bigHits, m.stats[1].bigHits], ['METRES', TT.metres(m.stats[0].metres), TT.metres(m.stats[1].metres)]];
  tiles.forEach(([lab, a, b], i) => { const x = W / 2 - 132 + i * 66, y = H / 2 - 14; E.ui.box(g, x, y, 62, 30, { bg: '#1a2238', border: '#4a5470', alpha: .9 }); E.font.text(g, lab, x + 31, y + 3, '#a8b0c8', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, a + ' - ' + b, x + 31, y + 14, '#ffffff', { align: 'center', outline: false }); });
  const line = M.o.cup && TT.STORY[M.o.cup] && TT.STORY[M.o.cup].half;
  if (line) { const rig = TT.castRig('gristle'); rig.drawPortrait(g, W / 2 - 144, H / 2 + 22, 30, { zoom: 2.4, bg: '#3a2a1a' }); E.font.text(g, '"' + line.replace(/\{[^}]*\}/g, '') + '"', W / 2 - 108, H / 2 + 24, '#ffe8c0', { outline: false, wrap: 250, font: 'tiny' }); }
};

/* ==== 32-audio.js ==== */
/* ---- AUDIO: every note, thud and voice written in code (the engine's chip synth). Songs with named layers, sound
 * effects, Animalese-style babble for every speaker, a crowd that follows the excitement, and the commentators ---- */
TT.audio = {};
const SONGS = TT.SONGS = {
  title: { bpm: 152, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'E4 . E4 G4 A4 . G4 E4 | D4 . D4 E4 G4 - - . | E4 . E4 G4 A4 . B4 A4 | G4 - E4 - D4 - - . | E4 . E4 G4 A4 . G4 E4 | D4 . D4 E4 G4 - A4 . | B4 - A4 - G4 - E4 - | E4 - - - . . . .' },
    { wave: 'saw', vol: .1, notes: 'E2 E2 . E2 E2 . E2 . | D2 D2 . D2 D2 . D2 . | C2 C2 . C2 C2 . C2 . | D2 D2 . D2 B1 . B1 .' },
    { wave: 'drums', vol: .14, notes: 'k . s . k k s . | k . s . k k s c' },
    { name: 'chant', wave: 'pulse', vol: .07, notes: '. . A3 . . . A3 C4 | . . A3 . . . A3 C4' }] },
  mud: { bpm: 126, steps: 2, tracks: [
    { name: 'base', wave: 'pulse', vol: .08, notes: 'C4 . E4 G4 C5 - G4 . | A4 . F4 A4 C5 - A4 . | G4 . E4 G4 B4 - G4 . | C5 - B4 - C5 - - .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . . .' },
    { name: 'drums', on: false, wave: 'drums', vol: .12, notes: 'k . s . k . s s | k . s . k k s .' },
    { name: 'hype', on: false, wave: 'square', vol: .05, notes: 'C5 E5 G5 E5 C5 E5 G5 E5 | F5 A5 C6 A5 F5 A5 C6 A5' }] },
  shanty: { bpm: 112, steps: 3, tracks: [
    { name: 'base', wave: 'pulse12', vol: .09, notes: 'D4 - D4 F4 - A4 | G4 - F4 E4 - D4 | C4 - E4 G4 - C5 | A4 - - . . . | D4 - D4 F4 - A4 | G4 - F4 E4 - C4 | D4 - F4 E4 - C4 | D4 - - . . .' },
    { wave: 'triangle', vol: .28, notes: 'D2 . A2 D3 . A2 | C2 . G2 C3 . G2 | F2 . C3 F3 . C3 | A2 . E3 A2 . . ' },
    { name: 'drums', on: false, wave: 'drums', vol: .12, notes: 'k . h s . h | k . k s . h' },
    { name: 'hype', on: false, wave: 'square', vol: .05, notes: 'A5 . F5 D5 . F5 | G5 . E5 C5 . E5' }] },
  forge: { bpm: 132, steps: 2, tracks: [
    { name: 'base', wave: 'saw', vol: .09, notes: 'A2 A2 . A2 C3 . A2 . | A2 A2 . G2 F2 . E2 . | A2 A2 . A2 C3 . D3 . | E3 - D3 - C3 - B2 .' },
    { wave: 'square', vol: .05, notes: 'A4 . . . . . E5 . | . . . . F5 - E5 . | A4 . . . . . G5 . | . . E5 - . . . .' },
    { name: 'drums', on: false, wave: 'drums', vol: .14, notes: 'k . t . s . t k | k k t . s . t t' },
    { name: 'hype', on: false, wave: 'pulse', vol: .05, notes: 'A5 C6 E6 C6 A5 C6 E6 C6' }] },
  mayhem: { bpm: 160, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'E4 G4 B4 E5 D5 B4 G4 B4 | C4 E4 G4 C5 B4 G4 E4 G4 | D4 F#4 A4 D5 C5 A4 F#4 A4 | B3 D#4 F#4 B4 A4 F#4 D#4 F#4' },
    { wave: 'saw', vol: .1, notes: 'E2 . E2 . E2 . E2 . | C2 . C2 . C2 . C2 . | D2 . D2 . D2 . D2 . | B1 . B1 . B1 . B1 .' },
    { name: 'drums', on: false, wave: 'drums', vol: .14, notes: 'k h s h k k s h | k h s h k s s s' },
    { name: 'hype', on: false, wave: 'pulse12', vol: .05, notes: 'E6 - B5 - G5 - B5 - | C6 - G5 - E5 - G5 -' }] },
  pub: { bpm: 118, steps: 2, tracks: [
    { wave: 'triangle', vol: .12, notes: 'C4 E4 G4 E4 F4 A4 C5 A4 | G4 B4 D5 B4 C5 - G4 . | A4 C5 E5 C5 F4 A4 C5 A4 | G4 . E4 . C4 - - .' },
    { wave: 'pulse', vol: .06, notes: 'C3 . G3 . F2 . C3 . | G2 . D3 . C3 . G2 . | A2 . E3 . F2 . C3 . | G2 . G2 . C3 . . .' }] },
  third: { bpm: 100, steps: 2, tracks: [
    { wave: 'square', vol: .08, notes: 'G4 - G4 A4 B4 - G4 - | C5 - B4 A4 G4 - - . | E4 - E4 F#4 G4 - E4 - | D4 - - - . . . . | G4 - G4 A4 B4 - G4 - | C5 - D5 C5 B4 - A4 - | G4 - B4 A4 G4 - F#4 - | G4 - - - . . . .' },
    { wave: 'triangle', vol: .26, notes: 'G2 . D3 . C3 . G2 . | E2 . B2 . D2 . A2 .' },
    { wave: 'drums', vol: .08, notes: 'k . h . s . h .' }] }
};
const STINGS = {
  try: { bpm: 180, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - G5 C6 - - -' }, { wave: 'saw', vol: .08, notes: 'C3 - - G2 - - C3 - - -' }] },
  monster: { bpm: 200, steps: 2, tracks: [{ wave: 'saw', vol: .14, notes: 'C3 C3 . F#3 - - - -' }] },
  fire: { bpm: 220, steps: 2, tracks: [{ wave: 'square', vol: .1, notes: 'E5 G5 A5 B5 D6 E6 - -' }] },
  yellow: { bpm: 90, steps: 2, tracks: [{ wave: 'saw', vol: .11, notes: 'G3 - F#3 - F3 - E3 - - -' }] },
  drop: { bpm: 140, steps: 2, tracks: [{ wave: 'triangle', vol: .16, notes: 'E5 - C5 - - -' }] },
  win: { bpm: 160, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 . C5 . C5 G4 A4 B4 C5 - E5 - G5 - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 . C3 . C3 . G2 . C3 - - - - - - -' }] },
  lose: { bpm: 100, steps: 2, tracks: [{ wave: 'triangle', vol: .14, notes: 'E4 - D#4 - D4 - C#4 - - - -' }] },
  roll: { bpm: 240, steps: 2, tracks: [{ wave: 'drums', vol: .16, notes: 's s s s s s s s s s s s k - -' }] }
};
TT.STINGS = STINGS;
const SFX = {
  whistle: { wave: 'square', freq: 2400, vib: [32, .06], dur: .28, vol: .12 },
  whistleLong: { wave: 'square', freq: 2400, vib: [30, .05], dur: .7, vol: .12 },
  hooter: { wave: 'saw', freq: 196, to: 190, dur: 1.2, vol: .2, vib: [6, .01] },
  thud: { wave: 'sine', freq: 110, to: 50, dur: .14, vol: .35 },
  crunch: { wave: 'noise', freq: 1400, to: 120, dur: .22, vol: .32, filter: 'lowpass' },
  boom: { wave: 'sine', freq: 80, to: 30, dur: .4, vol: .45 },
  pass: { wave: 'noise', freq: 2400, to: 900, dur: .1, vol: .1, filter: 'bandpass' },
  catch: { wave: 'noise', freq: 1600, to: 600, dur: .05, vol: .18 },
  punt: { wave: 'sine', freq: 160, to: 60, dur: .1, vol: .38 },
  tap: { wave: 'triangle', freq: 300, to: 160, dur: .06, vol: .2 },
  bok: { wave: 'triangle', freq: 300, to: 180, dur: .07, vol: .22 },
  doink: { wave: 'triangle', freq: 1200, to: 1180, dur: .7, vol: .22, vib: [12, .01] },
  engage: { wave: 'noise', freq: 600, to: 120, dur: .3, vol: .32 },
  horn: { wave: 'square', freq: 466, dur: .6, vol: .14, arp: [0, 4, 7], step: .04 },
  munch: { wave: 'noise', freq: 900, to: 400, dur: .12, vol: .16 },
  turbo: { wave: 'noise', freq: 600, to: 2000, dur: .18, vol: .08 },
  sputter: { wave: 'noise', freq: 300, to: 200, dur: .2, vol: .1 },
  super: { wave: 'square', freq: 'C4', dur: .5, vol: .12, arp: [0, 4, 7, 12, 16, 19, 24], step: .05 },
  flame: { wave: 'noise', freq: 400, to: 1200, dur: .9, vol: .2, filter: 'bandpass' },
  crack: { wave: 'noise', freq: 4000, to: 200, dur: .3, vol: .3 },
  thunder: { wave: 'noise', freq: 200, to: 40, dur: 1.6, vol: .35, filter: 'lowpass' },
  squawk: { wave: 'square', freq: 900, to: 1400, dur: .25, vol: .14, vib: [18, .2] },
  squelch: { wave: 'noise', freq: 300, to: 120, dur: .16, vol: .18, filter: 'lowpass' },
  ding: { wave: 'triangle', freq: 1760, dur: .4, vol: .2 },
  boo: { wave: 'saw', freq: 140, to: 110, dur: 1, vol: .1, vib: [5, .04] },
  clap: { wave: 'noise', freq: 2000, to: 1500, dur: .04, vol: .12 },
  roar: { wave: 'noise', freq: 500, to: 900, dur: 1.4, vol: .22, filter: 'lowpass' },
  groan: { wave: 'noise', freq: 600, to: 300, dur: .9, vol: .14, filter: 'lowpass' },
  oooh: { wave: 'triangle', freq: 260, to: 180, dur: .9, vol: .12, vib: [5, .03] }
};
TT.audio.init = game => {
  for (const k in SFX) game.audio.define(k, SFX[k]);
};
TT.audio.sfx = (name, o) => { if (TT.cfg.muted) return; try { TT.game.audio.sfx(name, o); } catch (e) { /* audio blocked */ } };
TT.audio.music = (id, o) => { if (TT.cfg.muted) return; const a = TT.game.audio; if (TT.audio.cur === id && a.pos && a.pos.playing) return; TT.audio.cur = id; a.music(id ? SONGS[id] : null, o || { fade: .6 }); };
TT.audio.sting = id => { if (TT.cfg.muted) return; try { TT.game.audio.sting(STINGS[id]); } catch (e) { /* none */ } };
TT.audio.layer = (name, v) => { try { TT.game.audio.layer(name, v, .6); } catch (e) { /* the song has no such layer */ } };

/* ---- babble: one syllable per letter, the speaker's own voice (wave, pitch, pace) ---- */
const VOWELS = 'aeiouyAEIOUY';
TT.babble = {
  last: 0,
  letter(ch, voice, i) {
    if (!ch || !/[a-zA-Z0-9]/.test(ch) || !voice) return;
    if (i % 2 && voice.rate < 1.1) return;   // (slower voices: every other letter)
    const code = ch.toLowerCase().charCodeAt(0), semi = ((code * 7) % 12) - 4 + (VOWELS.includes(ch) ? -2 : 0) + (ch === ch.toUpperCase() && /[A-Z]/.test(ch) ? 3 : 0);
    const f = voice.base * Math.pow(2, semi / 12), dur = (VOWELS.includes(ch) ? .07 : .05) / (voice.rate || 1);
    TT.audio.sfx({ wave: voice.wave, freq: f, to: f * .93, dur, vol: .09, vib: voice.vib });
    if (voice.gravel) TT.audio.sfx({ wave: voice.wave, freq: f / 2, to: f / 2 * .93, dur, vol: .05 });
    if (voice.echo) TT.game.after(.18, () => TT.audio.sfx({ wave: voice.wave, freq: f, to: f * .93, dur, vol: .04 }));
  },
  /** a short grunt burst for a player (tackles, rucks, scrums) */
  grunt(p) {
    const v = TT.playerVoice(p); for (let k = 0; k < 3; k++) TT.game.after(k * .06, () => TT.audio.sfx({ wave: v.wave, freq: v.base * (1 - k * .08), to: v.base * .8, dur: .06, vol: .08 }));
  }
};
TT.playerVoice = p => { const d = p.data || p; const base = clamp(320 - (d.size - 1) * 300 - (d.build === 'bulky' ? 50 : 0), 70, 320); return { wave: ['triangle', 'square', 'pulse', 'saw', 'pulse12'][(p.team * 2 + (p.idx || 0)) % 5], base: d.boss ? 70 : base, rate: d.build === 'bulky' ? .9 : 1.15, vib: d.hunch ? [8, .05] : undefined }; };

/* ---- the crowd bed: filtered noise that swells with the excitement ---- */
TT.crowd = {
  level: .3, t: 0,
  step(dt, m) {
    if (!m || TT.cfg.session && false) return;
    let want = .25;
    if (m.phase === 'play') { const b = m.ball, att = m.possession, toLine = Math.abs(tryLineOf(att) - b.x); want = toLine < 200 ? .6 : .35; const h = holder(); if (h && h.lineBroken) want = .8; }
    if (m.phase === 'setkick' && (m.sub === 'aim' || m.sub === 'place')) want = .15;
    this.level = lerp(this.level, want, dt * 1.5);
    this.t -= dt;
    const vol = (TT.settings.crowd == null ? .8 : TT.settings.crowd);
    if (this.t <= 0 && vol > 0) {
      this.t = .9;
      TT.audio.sfx({ wave: 'noise', freq: 380 + this.level * 500, to: 420 + this.level * 520, dur: 1.2, vol: .05 + this.level * .09 * vol, filter: 'lowpass' });
      if (m.phase === 'setkick' && (m.sub === 'aim') && !m.ph.human) TT.audio.sfx('clap');
    }
    if (m.phase === 'setkick' && m.sub === 'aim') { this.clapT = (this.clapT || 0) - dt; if (this.clapT <= 0) { this.clapT = Math.max(.25, .9 - (20 - m.ph.clock) * .04); TT.audio.sfx('clap', { vol: vol }); } }
  }
};

/* ---- commentary: the director picks a line by category, priority and cooldown, and puts it on the radio ---- */
TT.comm = {
  talk: null, last: {}, bags: {}, queue: [], busy: 0, used: new Set(), nextRos: false,
  init(game) {
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c040', voice: null, speed: 46 });
    this.talk.onLetter = (ch, i) => { if (TT.settings.commentary === 'On' && this.voice) TT.babble.letter(ch, this.voice, i); };
  },
  reset() { this.last = {}; this.bags = {}; this.queue = []; this.busy = 0; this.used = new Set(); if (this.talk) this.talk.close && (this.talk.open = false); },
  /** say a line of a category ({$player}, {$team}, {$score}, {$venue} filled in) */
  say(cat, vars = {}, prio = 1) {
    if (!this.talk || TT.settings.commentary === 'Off' || TT.cfg.quietComm) return;
    if (this.last[cat] && M && M.t - this.last[cat] < 6 && prio < 3) return;
    if (this.busy > 0 && prio < 2) return;
    const lines = TT.LINES[cat]; if (!lines) return;
    const rng = TT.fxRng;
    const bag = this.bags[cat] || (this.bags[cat] = TT.bag(lines, rng));
    let line = bag(); let tries = 0; while (this.used.has(line[1]) && tries++ < lines.length) line = bag();
    this.used.add(line[1]);
    this.last[cat] = M ? M.t : 0;
    const who = line[0] === 'r' ? 'ros' : 'barry';
    let text = line[1];
    const V = Object.assign({ venue: M ? M.venue.name : '', score: M ? M.teams[0].short + ' ' + M.score[0] + ', ' + M.teams[1].short + ' ' + M.score[1] : '' }, vars);
    text = text.replace(/\{\$(\w+)\}/g, (_, k) => TT.ascii(V[k] == null ? '' : V[k]));
    this.show(who, text);
    // Ros chips in a beat later, now and then
    if (who === 'barry' && TT.fxRng() < .35 && lines.some(l => l[0] === 'r')) {
      const ros = lines.filter(l => l[0] === 'r' && !this.used.has(l[1]));
      if (ros.length) { const l = ros[Math.floor(TT.fxRng() * ros.length)]; this.used.add(l[1]); TT.game.after(2.4, () => this.show('ros', l[1].replace(/\{\$(\w+)\}/g, (_, k) => TT.ascii(V[k] || '')))); }
    }
  },
  show(who, text) {
    const c = TT.CAST[who];
    this.voice = c.voice; this.busy = 2.2;
    this.talk.say(text, { name: c.name, portrait: TT.castRig(who), portraitOpts: { zoom: 2.6, turn: .4 }, auto: 2.2, modal: false, alpha: .85 });
  },
  step(dt) { this.busy = Math.max(0, this.busy - dt); if (this.talk) this.talk.update(dt); },
  draw(r) { if (this.talk && this.talk.open) this.talk.draw(r); }
};
/* the cast's rigs (portraits), made once */
const CAST_RIGS = {};
TT.castRig = id => {
  if (CAST_RIGS[id]) return CAST_RIGS[id];
  if (id.includes(':')) { const [tid, k] = id.split(':'), t = TT.teamById(tid), d = t.players[+k]; return CAST_RIGS[id] = rigFor({ data: d }, t.home); }
  const c = TT.CAST[id]; return CAST_RIGS[id] = new E.Humanoid(Object.assign({ weapon: null }, (c && c.o) || {}));
};
TT.castVoice = id => {
  if (id.includes(':')) { const [tid, k] = id.split(':'), t = TT.teamById(tid), d = t.players[+k]; return TT.playerVoice({ data: d, team: TT.TEAMS.indexOf(t), idx: +k }); }
  return (TT.CAST[id] || TT.CAST.barry).voice;
};
TT.castName = id => {
  if (id.includes(':')) { const [tid, k] = id.split(':'), d = TT.teamById(tid).players[+k]; return d.nick; }
  return (TT.CAST[id] || {}).name || id.toUpperCase();
};

/* ==== 33-fx.js ==== */
/* ---- EFFECTS: what the presentation does when the simulation emits (sound, particles, banners, the crowd, the
 * commentators, the replays). Listeners only: nothing here changes the match ---- */
TT.fx = { on: false };
const nick = id => (M && M.players[id] ? M.players[id].data.nick : '');
const teamName = t => (M ? M.teams[t].name : '');
const PTX = () => TT.game.particles;
const at = id => M.players[id];
const live = () => TT.cfg.present && TT.fx.on;
const noFreeze = () => TT.cfg.session;
TT.fx.install = () => {
  const B = TT.bus, S = TT.audio.sfx, C = (c, v, p) => TT.comm.say(c, v, p), ban = (t, o) => TT.hud.banner(t, o);
  const freeze = s => { if (!noFreeze() && !TT.replay.playing) TT.game.freeze(s); };
  const on = (n, f) => B.on(n, d => { if (live()) f(d); });
  on('whistle', () => S('whistle'));
  on('kickoff', d => { S('punt'); if (d.kind === 'kickoff') C('kickoff', {}); });
  on('kickoffSetup', () => TT.audio.sting('roll'));
  on('pass', d => { S('pass'); if (d.offload) ban('OFFLOAD!', { scale: 2, life: 1 }); });
  on('catch', () => S('catch'));
  on('kickCaught', () => S('catch'));
  on('bounce', d => { if (d.v > 40) S('bok'); });
  on('kick', d => { S(d.kind === 'grubber' ? 'tap' : 'punt'); if (d.mega) ban('MEGA BOOT!', { scale: 2 }); });
  on('tackle', d => { const p = at(d.victim); S('thud'); TT.babble.grunt(p); PTX().dust(p.x, p.y, 2, 6); if (TT.sim.onMud(p.x, p.y)) PTX().bits(p.x, p.y, 4, 6, ['#5a3a1e', '#7a5a2e']); else PTX().bits(p.x, p.y, 3, 3, ['#4a8a3a', '#6aa04a']); TT.game.shake(1); });
  on('bigHit', d => { const p = at(d.victim); S('crunch'); S('thud'); TT.game.hitFx(p.x, p.y, 18, { power: 1.2, rumble: true }); freeze(.08); TT.game.shake(4); C('bigHit', { player: nick(d.pid) }, 2); ban('BIG HIT!', { scale: 2, life: 1.1 }); PTX().sparks(p.x, p.y, 18, 10); });
  on('monsterHit', d => { const p = at(d.victim); S('crunch'); S('boom'); S('oooh'); TT.audio.sting('monster'); TT.game.hitFx(p.x, p.y, 20, { power: 2 }); freeze(.12); TT.game.flash('#ffffff', .1, .6); TT.game.shake(6); PTX().ring(p.x, p.y, 4, 40, '#ffffff', .4); PTX().text(p.x, p.y, 40, 'WHUMP', '#ffe040', { scale: 2, bounce: true }); ban('MONSTER HIT!', { colors: ['#ffffff', '#ffd040', '#ff6020', '#a01010'] }); C('monsterHit', { player: nick(d.pid) }, 3); TT.replay.trigger('monster', d.victim); TT.game.input.rumble(.8, .3); });
  on('brokenTackle', d => { S('thud'); if (TT.fxRng() < .4) C('fend', { player: nick(d.pid) }); });
  on('sidestep', d => { S('turbo'); C('sidestep', { player: nick(d.pid) }); });
  on('spin', d => { S('turbo'); C('sidestep', { player: nick(d.pid) }); ban('SPIN!', { scale: 2, life: .8 }); });
  on('fend', d => { S('thud'); C('fend', { player: nick(d.pid) }); ban('HAND-OFF!', { scale: 2, life: .9 }); });
  on('dummy', d => { if (d.sold) { C('dummy', {}); ban('DUMMY!', { scale: 2, life: .9 }); } });
  on('lineBreak', d => { C('lineBreak', { player: nick(d.pid) }, 2); ban('LINE BREAK!', { scale: 2 }); S('roar'); });
  on('interception', d => { C('intercept', { player: nick(d.pid) }, 2); ban('INTERCEPTED!', { scale: 2 }); S('oooh'); });
  on('knockOn', () => { C('knockOn', {}, 2); ban('KNOCK-ON', { scale: 2, colors: ['#ffffff', '#c8c8c8'] }); S('groan'); });
  on('forwardPass', () => { C('forwardPass', {}, 2); ban('FORWARD!', { scale: 2, colors: ['#ffffff', '#c8c8c8'] }); });
  on('ruck', d => { if (TT.fxRng() < .5) TT.babble.grunt(at(M.ph.att[0] != null ? M.ph.att[0] : 0)); void d; });
  on('jackal', d => { C('turnover', { player: nick(d.pid) }, 2); ban('JACKAL!', { scale: 2 }); });
  on('ruckTurnover', () => { C('turnover', {}, 1); ban('TURNOVER!', { scale: 2, life: 1 }); });
  on('scrum', () => C('scrum', {}));
  on('scrumCall', d => { if (d.word === 'SET') { S('engage'); TT.game.shake(2); } TT.babble.letter('a', TT.CAST.nigel.voice, 0); });
  on('scrumEngage', () => { S('engage'); M.players.filter(p => p.st === 'scrum').slice(0, 2).forEach(p => TT.babble.grunt(p)); });
  on('scrumWon', d => { if (d.steal) ban('SCRUM STEAL!', { scale: 2 }); });
  on('earlyEngage', () => ban('EARLY ENGAGEMENT', { scale: 2, colors: ['#ffffff', '#ff8070'] }));
  on('pushoverTry', () => { C('pushover', {}, 3); });
  on('lineoutThrow', () => S('pass'));
  on('lineoutWon', () => C('lineout', {}));
  on('lineoutSteal', () => { ban('STOLEN!', { scale: 2 }); C('lineout', {}, 2); });
  on('notStraight', () => { C('notStraight', {}, 2); ban('NOT STRAIGHT', { scale: 2, colors: ['#ffffff', '#c8c8c8'] }); });
  on('touch', () => {});
  on('kickTouch', () => C('kickTouch', {}));
  on('try', d => {
    const p = at(d.pid);
    TT.audio.sting('try'); S('roar'); TT.game.shake(3);
    ban(d.how === 'pushover' ? 'PUSHOVER TRY!' : d.how === 'penaltyTry' ? 'PENALTY TRY!' : 'TRY!', { scale: 4, life: 2.2, sub: TT.ascii(p.data.nick) + ' (' + M.teams[d.team].short + ')' });
    C('try', { player: nick(d.pid), team: teamName(d.team) }, 3);
    PR.cheer = 3; PR.cheerSide = d.team; PR.scorer = d.pid;
    PTX().bits(p.x, p.y, 20, 40, [M.kits[d.team].cloth, M.kits[d.team].trim, '#ffffff', '#ffe040']);
    const tod = M.o.time && M.o.time !== 'venue' ? M.o.time : M.venue.time;
    if (tod !== 'day') for (let k = 0; k < 4; k++) TT.game.after(k * .35, () => PTX().explosion(d.x + (k - 1.5) * 90, G.Y0 - 60, 140 + k * 10, 1.2, { debris: false, freeze: false, shake: 0 }));
    const run = d.run >= 200, big = d.how === 'pushover' || run;
    if (TT.settings.replays === 'All tries' || (TT.settings.replays !== 'Off' && big)) TT.replay.trigger('try', d.pid, true);
  });
  on('conversion', () => { ban('CONVERTED!', { scale: 3, colors: ['#ffffff', '#80ff90', '#20a040'] }); S('ding'); C('convMade', {}, 2); PR.cheer = 1.5; });
  on('penaltyGoal', () => { ban('PENALTY GOAL!', { scale: 3, colors: ['#ffffff', '#80ff90', '#20a040'] }); S('ding'); C('convMade', {}, 2); });
  on('convMiss', () => { ban('WIDE!', { scale: 3, colors: ['#ffffff', '#ff9080'] }); S('groan'); C('convMiss', {}, 2); });
  on('penMiss', () => { ban('WIDE!', { scale: 3, colors: ['#ffffff', '#ff9080'] }); S('groan'); C('convMiss', {}, 2); });
  on('doink', () => { S('doink'); ban('DOINK!', { scale: 3, colors: ['#ffffff', '#ffe060'] }); C('doink', {}, 3); });
  on('dropGoal', d => { TT.audio.sting('drop'); ban('DROP GOAL!', { scale: 3 }); C('dropGoal', { player: nick(d.pid) }, 3); PR.cheer = 2; PR.cheerSide = d.team; TT.replay.trigger('drop', d.pid); });
  on('dropGoalResult', d => { if (d.res === 'doink') { S('doink'); ban('DOINK!', { scale: 3 }); } else if (d.res === 'miss') S('groan'); });
  on('foulUnseen', () => {});
  on('cheapUnseen', () => { C('cheapUnseen', {}, 2); });
  on('cheapShot', d => { const v = at(d.victim); S('thud'); PTX().impact(v.x, v.y, 14, 1, '#ffffff'); });
  on('advantage', () => { TT.comm.say('penalty', {}, 1); });
  on('advantageOver', () => C('advOver', {}));
  on('penalty', () => { ban('PENALTY', { scale: 2 }); C('penalty', {}, 2); });
  on('freeKick', () => ban('FREE KICK', { scale: 2 }));
  on('card', d => { const p = at(d.pid); ban(d.red ? 'RED CARD!' : 'YELLOW CARD!', { scale: 3, colors: d.red ? ['#ffffff', '#ff4040', '#a01010'] : ['#ffffff', '#ffe040', '#c8a010'], sub: TT.ascii(p.data.nick) }); TT.audio.sting('yellow'); S('boo'); PR.boo = 2; PR.cheerSide = 1 - p.team; C(d.red ? 'red' : 'yellow', {}, 3); });
  on('sinBinOut', d => ban('BACK FROM THE BIN', { scale: 1, life: 1.2, sub: TT.ascii(nick(d.pid)) }));
  on('refDown', () => { ban('REF DOWN!', { scale: 3, colors: ['#ffffff', '#ff8060'] }); C('refDown', {}, 3); S('oooh'); });
  on('onFire', d => { ban("HE'S ON FIRE!", { scale: 3, colors: ['#fff8c0', '#ffd040', '#ff6020', '#c02010'], sub: TT.ascii(nick(d.pid)) }); TT.audio.sting('fire'); C('onFire', {}, 3); });
  on('superStart', d => { S('super'); ban(d.kind === 'thunder' ? 'THUNDER RUN!' : 'HURRICANE HIT!', { scale: 3, colors: d.kind === 'thunder' ? ['#ffffff', '#ffe040', '#ff8020'] : ['#ffffff', '#a0e0ff', '#4080ff'] }); C('super', {}, 3); TT.replay.trigger('super', d.pid); });
  on('hypeFull', d => { if (TT.seats.some(s => s.team === d.team && s.kind === 'local')) ban('SUPER READY!', { scale: 2, life: 1.2 }); });
  on('powerupThrow', d => { C(d.kind === 'pie' ? 'powerup' : 'powerup', {}, 1); });
  on('powerupTake', d => { const n = TT.POWERUPS[d.kind]; ban(n.name + '!', { scale: 2, sub: TT.ascii(nick(d.pid)) }); S(d.kind === 'pie' ? 'munch' : d.kind === 'horn' ? 'horn' : 'super'); TT.comm.show('barry', n.line); if (d.kind === 'horn') { PR.cheer = 2; PR.cheerSide = at(d.pid).team; } });
  on('chicken', () => { S('squawk'); C('chicken', {}, 2); ban('PITCH INVADER!', { scale: 2 }); });
  on('clucked', () => S('squawk'));
  on('flameWarn', () => {});
  on('flame', d => { S('flame'); PTX().fire(d.x, d.y, 4, 6, { size: 1.4 }); });
  on('toasted', () => C('flames', {}, 2));
  on('lightningWarn', () => {});
  on('lightning', d => { S('crack'); S('thunder'); TT.game.flash('#e0e8ff', .12, .8); TT.game.shake(4); PTX().sparks(d.x, d.y, 2, 16); C('lightning', {}, 2); });
  on('mudCall', () => C('mud', {}));
  on('hooter', () => { S('hooter'); ban('HOOTER!', { scale: 2 }); C('hooter', {}, 3); });
  on('halftime', () => { S('whistleLong'); C('half', {}, 3); });
  on('suddenDeath', () => { ban('GOLDEN POINT!', { scale: 3 }); C('sudden', {}, 3); });
  on('fulltime', d => { S('whistleLong'); TT.game.after(.4, () => S('whistle')); C('full', { team: d.winner >= 0 ? teamName(d.winner) : 'nobody', score: M.score[0] + '-' + M.score[1] }, 3); PR.cheer = 4; PR.cheerSide = d.winner >= 0 ? d.winner : 0; });
  on('switch', () => S('select'));
  on('sputter', d => { if (at(d.pid).ctl >= 0) S('sputter'); });
  on('refCall', d => { for (let i = 0; i < Math.min(6, d.text.length); i++) TT.game.after(i * .05, () => TT.babble.letter(d.text[i], TT.CAST.nigel.voice, i)); });
  on('land', d => { const p = at(d.pid); PTX().dust(p.x, p.y, 2, 10); S('thud'); });
  on('bounceOff', d => { const p = at(d.pid); PTX().impact(p.x, p.y, 16, 1.2, '#ffd040'); S('thud'); });
  on('gangHold', () => ban('HOLD HIM!', { scale: 2, life: .9 }));
  on('shrug', () => ban('SHRUGGED OFF!', { scale: 2, life: .9 }));
  on('stepMove', d => { if (at(d.pid).ctl >= 0) S('turbo'); });
  on('tryDive', d => { const p = at(d.pid); PTX().dust(p.x, p.y, 2, 12); });
};
/** the music's layers follow the match: drums in their 22, the hype layer when a meter is full or a player is on fire */
TT.fx.music = m => {
  if (!m) return;
  const b = m.ball, att = m.possession, near = Math.abs(tryLineOf(att) - b.x) < 225;
  const hot = m.hype[0] >= 100 || m.hype[1] >= 100 || m.players.some(p => p.fire > 0 || p.superK);
  if (near !== TT.fx._near) { TT.fx._near = near; TT.audio.layer('drums', near ? 1 : 0); }
  if (hot !== TT.fx._hot) { TT.fx._hot = hot; TT.audio.layer('hype', hot ? 1 : 0); }
};

/* ---- INSTANT REPLAY: the last 5 s of the state at 60 Hz; playback through the same presentation, 0.5x ---- */
TT.replay = {
  buf: [], playing: false, pending: null, lastT: -99, view: null, i: 0, step: 0,
  reset() { this.buf = []; this.playing = false; this.pending = null; this.lastT = -99; this.view = null; },
  record(m) {
    if (!m || this.playing) return;
    this.step ^= 1; if (this.step) return;
    this.buf.push({
      t: m.t, phase: m.phase,
      P: m.players.map(p => ({ x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, st: p.st, stT: p.stT, fire: p.fire, superK: p.superK, toasted: p.toasted, zapped: p.zapped, charge: p.charge, celeb: p.celeb, flex: p.flex, held: p.held, stun: p.stun, turboOn: p.turboOn, launch: p.launch, kickHold: 0, ctl: -1, power: p.power, mud: p.mud })),
      b: Object.assign({}, m.ball, { tried: null, landing: m.ball.landing }), r: Object.assign({}, m.ref)
    });
    if (this.buf.length > 300) this.buf.shift();
    if (this.pending && m.t >= this.pending.at) this.start(m);
  },
  trigger(kind, pid, isTry) {
    if (!M || TT.cfg.session || M.o.attract && kind !== 'try' && kind !== 'monster' && kind !== 'super' || TT.settings.replays === 'Off' || M.drill) return;
    if (!isTry && M.t - this.lastT < 30) return;
    if (this.pending || this.playing) return;
    this.pending = { at: M.t + 1, from: M.t - 2.5, pid, kind };
  },
  start(m) {
    const p = this.pending; this.pending = null; this.lastT = m.t;
    const i0 = this.buf.findIndex(f => f.t >= p.from); if (i0 < 0 || this.buf.length - i0 < 20) return;
    this.frames = this.buf.slice(i0); this.i = 0; this.playing = true; this.focus = p.pid; m.frozen = true;
    TT.bus.emit('replayStart', {}); TT.comm.show('barry', "Let's see that again!");
  },
  stop(m) { this.playing = false; this.view = null; if (m) m.frozen = false; TT.bus.emit('replayEnd', {}); this.buf = []; },
  /** each update while playing: the next frame (0.5x); returns the view the presentation draws */
  tick(dt, m, skip) {
    if (!this.playing) return null;
    this.i += dt * 60 * .5;
    if (skip || this.i >= this.frames.length - 1) { this.stop(m); return null; }
    const f = this.frames[Math.floor(this.i)];
    const v = Object.create(m);
    v.players = m.players.map((p, k) => Object.assign(Object.create(p), f.P[k]));
    v.ball = f.b; v.ref = Object.assign(Object.create(m.ref), f.r); v.phase = f.phase; v.ph = m.ph; v.hazards = []; v.pu = null; v.useIt = null;
    this.view = v; return v;
  }
};

/* ==== 40-ui.js ==== */
/* ---- UI: 10-foot widgets. Big menus (scale 2, an unmistakable focus, the mouse's hover moves it, a click picks it),
 * idle tracking for the attract mode, the touch-only check ---- */
TT.ui = {};
/** a big menu: items [{ label, desc, disabled, value() }]; o: { x, y, w, onPick, onCancel, onMove, scale, rowH, title } */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; Object.assign(this, { scale: 2, rowH: 22, w: 230, x: 'center', y: 70, onPick: null, onCancel: null, onMove: null, onLeft: null, onRight: null, title: '' }, o); this.boxes = []; this.skip(1); this.flash = 0; }
  skip(d) { for (let k = 0; k < this.items.length && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  update(dt) {
    const g = TT.game, P = g.players, n = this.items.length, old = this.i, I = g.input;
    this.flash += dt;
    if (P.some(q => q.repeat('up'))) { this.i = (this.i + n - 1) % n; this.skip(-1); }
    if (P.some(q => q.repeat('down'))) { this.i = (this.i + 1) % n; this.skip(1); }
    const ptr = I.pointer && I.pointer();
    if (ptr && I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = this.hit(ptr); if (k >= 0) this.i = k; }
    const c = I.clicked && I.clicked(); let clickPick = false;
    if (c) { const k = this.hit(c); if (k >= 0) { this.i = k; clickPick = true; } }
    if (this.i !== old) { TT.audio.sfx('select'); if (this.onMove) this.onMove(this.i); }
    const it = this.items[this.i];
    if (P.some(q => q.repeat('left')) && this.onLeft) { this.onLeft(this.i, it); TT.audio.sfx('select'); }
    if (P.some(q => q.repeat('right')) && this.onRight) { this.onRight(this.i, it); TT.audio.sfx('select'); }
    if ((P.some(q => q.pressed('confirm') || q.pressed('start')) || clickPick) && it && !it.disabled) { TT.audio.sfx('confirm'); P.forEach(q => q.consumeAll()); if (this.onPick) this.onPick(this.i, it); return true; }
    if (P.some(q => q.pressed('cancel')) && this.onCancel) { TT.audio.sfx('cancel'); P.forEach(q => q.consumeAll()); this.onCancel(); return true; }
    return false;
  }
  hit(p) { for (const b of this.boxes) if (p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3] && !this.items[b[4]].disabled) return b[4]; return -1; }
  draw(g, W) {
    const x = this.x === 'center' ? Math.round(W / 2 - this.w / 2) : this.x;
    this.boxes = [];
    if (this.title) E.font.text(g, this.title, x + this.w / 2, this.y - 16, '#ffe08a', { align: 'center', outline: '#000', scale: 1 });
    this.items.forEach((it, k) => {
      const y = this.y + k * this.rowH, on = k === this.i;
      this.boxes.push([x, y, this.w, this.rowH - 3, k]);
      if (on) { const pulse = (Math.sin(this.flash * 6) + 1) / 2; E.ui.box(g, x - 2, y - 2, this.w + 4, this.rowH + 1, { bg: ['#4a3a10', '#2a2008'], border: pulse > .5 ? '#ffe060' : '#e8b030' }); E.font.text(g, '▸', x + 6, y + 3, '#ffe060', { scale: this.scale > 1 ? 2 : 1, outline: false }); }
      else E.ui.box(g, x, y, this.w, this.rowH - 3, { bg: ['#141a2a', '#0c1020'], border: '#3a4460', alpha: .85 });
      const lab = typeof it.label === 'function' ? it.label() : it.label, val = it.value ? it.value() : '';
      const col = it.disabled ? '#5a6078' : on ? '#ffffff' : '#c8d0e8';
      E.font.text(g, lab, x + (this.scale > 1 ? 22 : 16), y + (this.rowH - 3) / 2 - 3.5 * Math.min(2, this.scale) + 1, col, { scale: Math.min(2, this.scale), outline: false });
      if (val) E.font.text(g, '< ' + val + ' >', x + this.w - 8, y + (this.rowH - 3) / 2 - 3.5, on ? '#ffe060' : '#a8b0c8', { align: 'right', outline: false });
    });
  }
}
TT.ui.BigMenu = BigMenu;
/** the description line under a menu, and the prompts: built from badges for the device used last */
TT.ui.footer = (g, W, H, txt) => { E.ui.box(g, 0, H - 20, W, 20, { bg: '#0c1020', border: '#0c1020', alpha: .75, gradient: false }); TT.prompt(g, txt, W / 2, H - 14, TT.game.input); };
TT.ui.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1a2238', '#0c1020'], border: '#e8c040', alpha: .92 }, o));

/* ---- any input (for the attract mode): keys, mouse buttons, movement over 8 px, pad buttons, sticks past .5, taps ---- */
TT.idle = { t: 0, ptr: null };
TT.anyInput = () => {
  const g = TT.game;
  let fresh = false;
  for (const I of g.players) {
    // any key or button at all, bound to an action or not: a code newly held
    const prev = I._ttHeld || new Set(); if (I.held) { for (const c of I.held) if (!prev.has(c)) fresh = true; I._ttHeld = new Set(I.held); }
  }
  if (fresh) return true;
  for (const I of g.players) {
    if (I.anyPressed && I.anyPressed()) return true;
    const m = I.move(); if (Math.hypot(m[0], m[1]) > .5) return true;
    if (I.clicked && I.clicked()) return true;
  }
  const p = g.input.pointer && g.input.pointer();
  if (p) { if (TT.idle.ptr && Math.hypot(p[0] - TT.idle.ptr[0], p[1] - TT.idle.ptr[1]) > 8) { TT.idle.ptr = p; return true; } if (!TT.idle.ptr) TT.idle.ptr = p; }
  return false;
};
/** count idle time on a front-end screen; after 10 s, the attract mode */
TT.idleStep = dt => {
  if (TT.cfg.session) return;
  if (TT.anyInput()) TT.idle.t = 0; else TT.idle.t += dt;
  if (TT.idle.t > 10) { TT.idle.t = 0; TT.attract.start(); }
};

/* ---- touch-only devices: no touch controls; the title says a controller or keyboard is needed ---- */
TT.checkTouchOnly = () => {
  if (typeof matchMedia !== 'function' || typeof document === 'undefined') { TT.cfg.touchOnly = false; return; }
  const coarse = matchMedia('(any-pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  TT.cfg.touchOnly = coarse && !fine && !TT.cfg.sawKeyOrPad;
};
if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
  const leave = () => { TT.cfg.sawKeyOrPad = true; TT.cfg.touchOnly = false; };
  addEventListener('keydown', leave); addEventListener('gamepadconnected', leave);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') leave(); });
}

/* ---- a staged set for the story scenes and the front end: a small TileMap room ---- */
TT.sets = {};
TT.makeSet = kind => {
  if (TT.sets[kind]) return TT.sets[kind];
  const rows = [], W = 20, H = 12;
  for (let r = 0; r < H; r++) { let s = ''; for (let c = 0; c < W; c++) s += r === 0 || c === 0 || c === W - 1 ? '#' : (kind === 'pub' && r === 3 && c > 3 && c < 14 ? 'b' : '.'); rows.push(s); }
  const floor = kind === 'pub' ? (x, y) => E.tex.planks(x, y) : kind === 'tunnel' ? (x, y) => { const n = E.hash2(x | 0, y | 0) * 14; return [52 + n, 50 + n, 58 + n]; } : (x, y) => { const n = E.hash2(x | 0, y | 0) * 20, k = Math.floor(x / 32) % 2 ? 1.08 : .94; return [70 * k + n, 130 * k + n, 56 * k + n]; };
  const types = {
    1: kind === 'pub' ? { h: 52, face: 'plaster', side: '#c8b48a', top: '#6a4a2a' } : kind === 'tunnel' ? { h: 52, face: 'stone', side: '#3a3a48', top: '#2a2a34' } : { h: 30, face: 'plank', side: '#3a4a6a', top: '#d8dce8' },
    2: { h: 18, face: 'plank', side: '#6a3a1a', top: '#8a5a2a' }
  };
  const map = new E.TileMap({ rows, legend: { '#': 1, b: 2, '.': { floor: 'floor' } }, types, floorTex: floor, outside: '#0c0a10', ao: 5 });
  return TT.sets[kind] = map;
};

/* ==== 41-front.js ==== */
/* ---- THE FRONT END: title, menu, records, about, credits. Behind them, a real match ticks over quietly under the
 * Megadome's lights (the presentation running a tiny CPU loop) ---- */
TT.bg = {
  ensure(venue) {
    if (M && M.o.backdrop && !M.over && (!venue || M.venue.id === venue)) return;
    TT.cfg.quietComm = true;
    TT.startMatch({ home: 'mud', away: 'meg', venue: venue || 'dome', seed: 99, backdrop: true, skipIntro: true, attract: true, seats: [] });
    TT.cfg.quietComm = false;
    const g = TT.game; g.lights.enabled = true; g.lights.ambient = .5; g.weather = null;
  },
  step(dt) {
    if (!M || !M.o.backdrop) return;
    const it = TT.control.collect(dt); TT.sim.step(dt, it); TT.pres.update(dt, M);
    if (M.phase === 'full') { const v = M.venue.id; M.over = true; TT.bg.ensure(v); }
    const b = M.ball; TT.game.focus(b.x, b.y + (G.CY - b.y) * .3, 8);
  },
  draw(r, dim = .45) { if (M && M.o.backdrop) TT.pres.drawWorld(r, M); r.overlay(g => px.blend(g, dim, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#202848'))); }
};
const FRONT = { view: 'broadcast', views: ['broadcast'], input: TT.KEYS, res: 'ps1', touch: [], camera: false };
const logo = (g, W, y, s = 4) => {
  E.font.title(g, 'THUGBY', W / 2, y, { align: 'center', scale: s, colors: ['#fff6c8', '#ffd040', '#ff8a20', '#c83010'], depth: 3, depthColor: '#3a0a04' });
  E.font.title(g, 'TURBO', W / 2, y + s * 9 + 2, { align: 'center', scale: s, colors: ['#e8f4ff', '#80c8ff', '#3a80f0', '#1a3aa0'], depth: 3, depthColor: '#0a1440' });
};
TT.logo = logo;

TT.scenes.title = Object.assign({}, FRONT, {
  enter() { TT.bg.ensure(); TT.audio.music('title'); TT.idle.t = 0; TT.checkTouchOnly(); TT.game.input.touchEnabled = false; this.t = 0; },
  update(dt) {
    this.t += dt; TT.bg.step(dt);
    const g = TT.game;
    if (TT.cfg.touchOnly) {
      const c = g.input.clicked && g.input.clicked();
      if (c && this.setBtn && c[0] >= this.setBtn[0] && c[0] < this.setBtn[0] + this.setBtn[2] && c[1] >= this.setBtn[1] && c[1] < this.setBtn[1] + this.setBtn[3]) g.menu('settings');
      TT.idle.t += dt; if (TT.idle.t > 10) { TT.idle.t = 0; TT.attract.start(); }
      return;
    }
    if (this.t > .4 && g.players.some(I => I.pressed('start') || I.pressed('confirm') || I.pressed('x')) || (g.input.clicked && g.input.clicked() && this.t > .4)) { g.players.forEach(I => I.consumeAll()); TT.audio.sfx('confirm'); g.go('menu'); return; }
    TT.idleStep(dt);
  },
  draw(r) {
    TT.bg.draw(r, .35);
    r.overlay(g => {
      const W = r.W, H = r.H, bob = Math.round(Math.sin(this.t * 2) * 2);
      logo(g, W, 30 + bob, 4);
      E.font.text(g, 'BIG HITS, BIGGER HAIR, SEVEN A SIDE', W / 2, 112, '#ffe8c0', { align: 'center', outline: '#000' });
      if (TT.cfg.touchOnly) {
        E.font.title(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, 140, { align: 'center', scale: 1, colors: ['#ffffff', '#ffd040'] });
        E.font.text(g, 'Connect a controller or a keyboard to play.', W / 2, 160, '#c8d0e8', { align: 'center', outline: '#000' });
        const bw = 120, bx = Math.round(W / 2 - bw / 2), by = 180; this.setBtn = [bx, by, bw, 26];
        E.ui.box(g, bx, by, bw, 26, { bg: ['#4a3a10', '#2a2008'], border: '#ffe060' }); E.font.text(g, 'SETTINGS', W / 2, by + 6, '#ffffff', { align: 'center', scale: 2, outline: false });
      } else if (Math.floor(this.t * 1.6) % 2 === 0) E.font.title(g, 'PRESS START', W / 2, 150, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      if (!TT.cfg.touchOnly) TT.ui.footer(g, W, H, '{b:start} START     LIVE ON CHANNEL THUD');
      E.font.text(g, 'CHANNEL THUD SPORT  ' + E.versionLabel(), 4, H - 30, '#6a7490', { font: 'tiny', outline: false });
    });
  }
});

const MENU_ITEMS = () => [
  { id: 'cup', label: () => TT.cupSaved() ? 'CONTINUE THE CUP' : 'MEGA CUP', desc: 'The story: the Mudlarks, a pub side, take on the Turbo Sevens Mega Cup.' },
  { id: 'newcup', label: 'NEW MEGA CUP', desc: 'Start the cup again from the Muddy Duck.', hidden: !TT.cupSaved() },
  { id: 'exhibition', label: 'EXHIBITION', desc: 'Any two teams, any stadium. 1 to 4 players: versus or co-op.' },
  { id: 'training', label: 'TRAINING GROUND', desc: "Coach Gristle's nine drills. Every move in the game, one at a time." },
  { id: 'records', label: 'RECORDS', desc: 'Biggest wins, most tries, the biggest hit. Initials only.' },
  { id: 'settings', label: 'SETTINGS', desc: 'Difficulty, half length, controller buttons, camera, sound...' },
  { id: 'about', label: 'ABOUT & CREDITS', desc: 'Who made this, how, and what they thought of it.' }
].filter(i => !i.hidden);
TT.scenes.menu = Object.assign({}, FRONT, {
  enter() {
    TT.bg.ensure(); TT.audio.music('title'); TT.idle.t = 0;
    const items = MENU_ITEMS();
    this.menu = new TT.ui.BigMenu(items, { y: 84, w: 240, rowH: 24, onPick: (i, it) => this.pick(it.id), onCancel: () => TT.game.go('title') });
  },
  pick(id) {
    const g = TT.game;
    if (id === 'cup') { if (TT.cupSaved()) { TT.cupLoad(); g.go('cup'); } else { TT.cupNew(); g.go('story', { id: 'prologue' }); } }
    else if (id === 'newcup') { TT.cupNew(); g.go('story', { id: 'prologue' }); }
    else if (id === 'exhibition') g.go('join', { mode: 'exhibition' });
    else if (id === 'training') g.go('training', {});
    else if (id === 'records') g.go('records', {});
    else if (id === 'settings') g.menu('settings');
    else if (id === 'about') g.go('about');
  },
  update(dt) { TT.bg.step(dt); if (TT.game.paused) return; this.menu.update(dt); TT.idleStep(dt); },
  draw(r) {
    TT.bg.draw(r, .5);
    r.overlay(g => {
      const W = r.W, H = r.H;
      logo(g, W, 10, 2);
      this.menu.draw(g, W);
      const it = this.menu.items[this.menu.i];
      E.ui.box(g, W / 2 - 170, H - 46, 340, 22, { bg: '#0c1020', border: '#3a4460', alpha: .85, gradient: false });
      E.font.text(g, it.desc, W / 2, H - 39, '#ffe8c0', { align: 'center', outline: false });
      TT.ui.footer(g, W, H, '{b:up}{b:down} CHOOSE   {b:confirm} PICK   {b:cancel} BACK');
    });
  }
});

/* ---- records: three tables, a page each (the arcade module's tables and initials) ---- */
TT.recordsInit = () => {
  if (TT.cab) return;
  TT.cab = new E.Arcade(TT.game, { id: 'thugby', idle: 10, demo: 300, scores: 8, hud: false });
  for (const mode of ['margin', 'tries', 'hit']) if (!TT.cab.table(mode).length) {
    const k = 'arcade:thugby:' + mode; try { E.store.set(k, TT.RECORD_SEEDS[mode].map(([name, score]) => ({ name, score }))); } catch (e) { /* storage blocked */ }
  }
};
TT.scenes.records = Object.assign({}, FRONT, {
  enter(d) { TT.recordsInit(); TT.bg.ensure(); this.page = 0; this.t = 0; this.attract = d && d.attract; TT.idle.t = 0; },
  update(dt) {
    this.t += dt; TT.bg.step(dt);
    const g = TT.game, P = g.players;
    if (this.attract) { if (TT.anyInput() && this.t > .5) { P.forEach(I => I.consumeAll()); g.go('title'); return; } if (this.t > 8) g.go('title'); this.page = Math.floor(this.t / 2.7) % 3; return; }
    if (P.some(I => I.pressed('right') || I.pressed('r1'))) { this.page = (this.page + 1) % 3; TT.audio.sfx('select'); }
    if (P.some(I => I.pressed('left') || I.pressed('l1'))) { this.page = (this.page + 2) % 3; TT.audio.sfx('select'); }
    const c = g.input.clicked && g.input.clicked(); if (c) { this.page = (this.page + 1) % 3; }
    if (P.some(I => I.pressed('cancel') || I.pressed('confirm'))) { P.forEach(I => I.consumeAll()); g.go('menu'); return; }
    TT.idleStep(dt);
  },
  draw(r) {
    TT.bg.draw(r, .6);
    const modes = [['margin', 'BIGGEST WINS (POINTS)'], ['tries', 'MOST TRIES IN A MATCH'], ['hit', 'BIGGEST HIT (METRES x10)']];
    const [mode, title] = modes[this.page];
    TT.cab.drawTable(r, mode, 50, title);
    r.overlay(g => { logo(g, r.W, 4, 1); if (!this.attract) TT.ui.footer(g, r.W, r.H, '{b:l1}{b:r1} PAGE ' + (this.page + 1) + '/3   {b:cancel} BACK'); });
  }
});

/* ---- about & credits: five pages; the same text as the build's chat reply ---- */
TT.scenes.about = Object.assign({}, FRONT, {
  enter() { this.page = 0; TT.bg.ensure(); TT.idle.t = 0; this.scroll = 0; },
  update(dt) {
    TT.bg.step(dt); const g = TT.game, P = g.players, n = TT.ABOUT.length;
    if (P.some(I => I.pressed('right') || I.pressed('r1'))) { this.page = (this.page + 1) % n; this.scroll = 0; TT.audio.sfx('select'); }
    if (P.some(I => I.pressed('left') || I.pressed('l1'))) { this.page = (this.page + n - 1) % n; this.scroll = 0; TT.audio.sfx('select'); }
    if (P.some(I => I.repeat('down'))) this.scroll++; if (P.some(I => I.repeat('up'))) this.scroll = Math.max(0, this.scroll - 1);
    const c = g.input.clicked && g.input.clicked(); if (c) { this.page = (this.page + (c[0] > g.W / 2 ? 1 : n - 1)) % n; this.scroll = 0; }
    if (P.some(I => I.pressed('cancel') || I.pressed('confirm'))) { P.forEach(I => I.consumeAll()); g.go('menu'); return; }
    TT.idleStep(dt);
  },
  draw(r) {
    TT.bg.draw(r, .75);
    r.overlay(g => {
      const W = r.W, H = r.H, pg = TT.ABOUT[this.page];
      E.font.title(g, pg.title, W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#ffb347'] });
      const lines = []; for (const para of pg.lines) { const ws = E.font.wrap(para, W - 30); for (const l of ws) lines.push(l); lines.push(''); }
      const vis = Math.floor((H - 70) / 10); this.scroll = Math.min(this.scroll, Math.max(0, lines.length - vis));
      lines.slice(this.scroll, this.scroll + vis).forEach((l, i) => E.font.text(g, l, 15, 32 + i * 10, l.endsWith(':') || /^[A-Z ]+:/.test(l) ? '#ffe8c0' : '#e0e4f0', { outline: false }));
      TT.ui.footer(g, W, H, '{b:l1}{b:r1} PAGE ' + (this.page + 1) + '/' + TT.ABOUT.length + '   {b:up}{b:down} SCROLL   {b:cancel} BACK');
    });
  }
});

TT.scenes.credits = Object.assign({}, FRONT, {
  enter() { this.t = 0; TT.audio.music('third'); TT.bg.ensure('park'); },
  update(dt) {
    this.t += dt; TT.bg.step(dt); const g = TT.game;
    if ((this.t > 3 && g.players.some(I => I.pressed('confirm') || I.pressed('cancel'))) || this.t > 46) { g.players.forEach(I => I.consumeAll()); g.go('title'); }
  },
  draw(r) {
    TT.bg.draw(r, .7);
    r.overlay(g => {
      const W = r.W, H = r.H, y0 = Math.round(H - this.t * 22);
      const roll = [['T', 'THUGBY TURBO'], ['', 'An original game inspired by rugby.'], ['', 'Every team, person and place is made up.'], ['', ''], ['H', 'DESIGN, CODE, ART, MUSIC, VOICES'], ['', 'claude-opus-5-5 (Anthropic), reasoning effort medium'], ['', 'from a plan written by claude-opus-5-5 at max effort'], ['', ''], ['H', 'ENGINE'], ['', 'my-3D2dge v0.85.2'], ['', ''], ['H', 'ONLINE'], ['', 'AI Hub Session Protocol v1, client 1.4.0'], ['', ''], ['H', 'STARRING'],
        ...TT.TEAMS[0].players.map(p => ['', p.name + ' "' + p.nick + '"']), ['', 'Coach Gordon Gristle'], ['', 'Big Dave'], ['', 'Nan Pemberton and the Bramblewick Badgers'], ['', 'Captain Clucky'], ['', ''], ['H', 'COMMENTARY'], ['', 'Barry Bellows and Ros Rucker'], ['', 'Referee: Nigel Blewitt'], ['', ''], ['H', 'NO MUDLARKS WERE HARMED'], ['', '(Several were muddied.)'], ['', ''], ['T', 'LAST ORDERS!']];
      roll.forEach(([k, s], i) => {
        const y = y0 + i * 14; if (y < -20 || y > H) return;
        if (k === 'T') E.font.title(g, s, W / 2, y, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd040', '#ff8a20'] });
        else E.font.text(g, s, W / 2, y, k === 'H' ? '#ffe08a' : '#e0e4f0', { align: 'center', outline: '#000' });
      });
      if (this.t > 3) TT.prompt(g, '{b:confirm} TITLE', W - 40, H - 14, TT.game.input);
    });
  }
});

/* ==== 42-modes.js ==== */
/* ---- MODES: the Mega Cup (hub, story, saves), the join screen, Exhibition's setup, the Training Ground, results ---- */
TT.cup = null;
TT.cupSaved = () => { if (TT.cfg.session) return false; const s = E.store.get('thugby:cup', null); return !!(s && typeof s.round === 'number' && s.round < 4); };
TT.cupNew = () => { TT.cup = { round: 0, results: [], seeds: [], difficulty: TT.settings.difficulty || 'Pro', trained: false }; TT.cupSave(); };
TT.cupLoad = () => { const s = E.store.get('thugby:cup', null); TT.cup = s && typeof s.round === 'number' && Array.isArray(s.results) ? s : null; if (!TT.cup) TT.cupNew(); };
TT.cupSave = () => { if (TT.cfg.session || !TT.cup) return; try { E.store.set('thugby:cup', TT.cup); } catch (e) { /* blocked */ } };
TT.unlocks = () => E.store.get('thugby:unlocks', {}) || {};
TT.unlock = k => { const u = TT.unlocks(); u[k] = true; if (!TT.cfg.session) E.store.set('thugby:unlocks', u); };
TT.seatsJoined = null;   // the seats picked on the join screen (kept for the cup's matches and rematches)
TT.cupMatch = () => {
  const r = TT.CUP[TT.cup.round]; if (!r) return;
  const seats = (TT.seatsJoined || [{ input: TT.game.input, team: 0 }]).map(s => Object.assign({}, s, { team: 0 }));
  TT.game.go('match', { home: 'mud', away: r.opp, venue: r.venue, cup: r.id, suddenDeath: true, seats, seed: (Date.now() & 0xffff) + TT.cup.round });
};

/* ---- the cup hub: four rounds as big cards; play, train, the team sheet ---- */
TT.scenes.cup = Object.assign({}, FRONT, {
  enter() {
    if (!TT.cup) TT.cupLoad();
    TT.bg.ensure('park'); TT.audio.music('title'); this.sheet = -1;
    this.menu = new TT.ui.BigMenu([
      { id: 'play', label: () => TT.cup.round < 4 ? 'PLAY ' + TT.CUP[TT.cup.round].name : 'CUP WON!', disabled: TT.cup.round >= 4 },
      { id: 'players', label: 'PLAYERS (CO-OP)' }, { id: 'train', label: 'TRAINING GROUND' }, { id: 'sheet', label: 'TEAM SHEET' }, { id: 'back', label: 'MAIN MENU' }],
    { y: 126, w: 200, rowH: 17, scale: 1, onPick: (i, it) => this.pick(it.id), onCancel: () => TT.game.go('menu') });
  },
  pick(id) {
    const g = TT.game;
    if (id === 'play') g.go('story', { id: TT.CUP[TT.cup.round].id, next: 'cupMatch' });
    else if (id === 'players') g.go('join', { mode: 'cup' });
    else if (id === 'train') g.go('training', { cup: true });
    else if (id === 'sheet') { this.sheet = 0; }
    else g.go('menu');
  },
  update(dt) {
    TT.bg.step(dt);
    const g = TT.game, P = g.players;
    if (this.sheet >= 0) {
      if (P.some(I => I.repeat('right'))) this.sheet = (this.sheet + 1) % 7; if (P.some(I => I.repeat('left'))) this.sheet = (this.sheet + 6) % 7;
      if (P.some(I => I.pressed('cancel') || I.pressed('confirm'))) { P.forEach(I => I.consumeAll()); this.sheet = -1; }
      return;
    }
    this.menu.update(dt);
  },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, 'THE MEGA CUP', W / 2, 6, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd040', '#ff8a20'] });
      const cw = Math.min(96, Math.floor((W - 30) / 4));
      TT.CUP.forEach((c, i) => {
        const x = Math.round(W / 2 - 2 * (cw + 4) + i * (cw + 4)), y = 34, t = TT.teamById(c.opp), res = TT.cup.results[i], next = i === TT.cup.round, locked = i > TT.cup.round;
        E.ui.box(g, x, y, cw, 88, { bg: next ? ['#3a3010', '#1a1408'] : ['#1a2238', '#0c1020'], border: next ? '#ffe060' : '#4a5470', alpha: .94 });
        E.font.text(g, c.name, x + cw / 2, y + 5, '#ffe08a', { align: 'center', font: 'tiny', outline: false });
        if (!locked) TT.drawCrest(g, t, x + cw / 2, y + 30, 2); else E.font.text(g, '?', x + cw / 2, y + 22, '#5a6078', { align: 'center', scale: 2, outline: false });
        E.font.text(g, locked ? '???' : t.short, x + cw / 2, y + 48, '#ffffff', { align: 'center', outline: false });
        E.font.text(g, TT.venueById(c.venue).name, x + cw / 2, y + 58, '#a8b0c8', { align: 'center', font: 'tiny', outline: false, wrap: cw - 6 });
        E.font.text(g, res ? 'WON ' + res[0] + '-' + res[1] : next ? 'NEXT' : 'LOCKED', x + cw / 2, y + 74, res ? '#80ff90' : next ? '#ffe060' : '#5a6078', { align: 'center', outline: false });
      });
      if (this.sheet >= 0) {
        const d = TT.TEAMS[0].players[this.sheet];
        TT.ui.panel(g, W / 2 - 150, 40, 300, 150);
        TT.castRig('mud:' + this.sheet).drawPortrait(g, W / 2 - 140, 50, 60, { zoom: 3, bg: '#2a3450' });
        E.font.text(g, '"' + d.nick + '"', W / 2 - 70, 52, '#ffe08a', { outline: false, scale: 1 });
        E.font.text(g, d.name + ', ' + ROLES[this.sheet], W / 2 - 70, 64, '#ffffff', { outline: false, font: 'tiny' });
        [['SPEED', 'SPD'], ['POWER', 'POW'], ['HANDS', 'HND'], ['KICKING', 'KCK'], ['TACKLING', 'TKL']].forEach(([l, k], i) => { E.font.text(g, l, W / 2 - 70, 80 + i * 14, '#c8d0e8', { outline: false, font: 'tiny' }); E.ui.bar(g, W / 2 - 10, 80 + i * 14, 140, 6, d.stats[k] / 10, '#4aa0e0'); });
        TT.ui.footer(g, W, H, '{b:left}{b:right} PLAYER ' + (this.sheet + 1) + '/7   {b:cancel} BACK');
      } else { this.menu.draw(g, W); TT.ui.footer(g, W, H, '{b:up}{b:down} CHOOSE   {b:confirm} PICK   {b:cancel} BACK'); }
    });
  }
});

/* ---- story scenes: a staged set, the cast standing in it, lines with portraits and babble; △ skips ---- */
TT.scenes.story = Object.assign({}, FRONT, {
  view: 'threequarter', views: ['threequarter'],
  enter(d) {
    this.d = d || {}; const st = TT.STORY[this.d.id] || TT.STORY.lost;
    this.st = st; this.lines = this.d.lines || st.lines; this.i = -1; this.t = 0; this.done = false;
    const kind = st.set; this.map = TT.makeSet(kind === 'podium' ? 'pitch' : kind);
    const g = TT.game; g.weather = null; g.lights.enabled = true; g.lights.ambient = kind === 'pub' ? .55 : kind === 'tunnel' ? .4 : .85;
    g.cam.bounds = null; g.focus(160, 100, 0); g.setZoom(1.4);
    TT.audio.music(kind === 'pub' ? (st.song ? 'third' : 'pub') : st.boss ? 'mayhem' : 'title');
    const ids = [...new Set(this.lines.map(l => l[0]))].filter(s => s !== 'barry' && s !== 'ros');
    this.actors = ids.map((id, k) => ({ id, rig: TT.castRig(id), x: 160 + (k - (ids.length - 1) / 2) * 34, y: 104 + (k % 2) * 8 }));
    this.talk = new E.Dialog(g, { lines: 3, place: 'bottom', border: '#e8c040', voice: null, speed: 40 });
    this.talk.onLetter = (ch, i) => { if (this.voice) TT.babble.letter(ch, this.voice, i); };
    this.next();
  },
  exit() { TT.game.setZoom(1); },
  next() {
    this.i++;
    if (this.i >= this.lines.length) return this.finish();
    const [who, text] = this.lines[this.i], last = this.i === this.lines.length - 1;
    this.voice = TT.castVoice(who); this.speaker = who;
    const o = { name: TT.castName(who), portrait: TT.castRig(who), portraitOpts: { zoom: 2.6, turn: .4 }, onDone: () => this.next() };
    if (last && this.st.choices && !this.d.lines) { o.choices = this.st.choices; o.onChoice = k => { this.choice = k; }; }
    this.talk.say(text, o);
  },
  finish() {
    if (this.done) return; this.done = true;
    const g = TT.game, id = this.d.id, nx = this.d.next;
    if (id === 'prologue') { if (this.choice === 0) { TT.cup.trained = true; TT.cupSave(); g.go('training', { cup: true }); } else g.go('cup'); return; }
    if (nx === 'cupMatch') return TT.cupMatch();
    if (id === 'victory') return g.go('story', { id: 'third' });
    if (id === 'third') return g.go('credits');
    if (nx) return g.go(nx);
    g.go('cup');
  },
  update(dt) {
    this.t += dt; const g = TT.game;
    if (g.players.some(I => I.pressed('tri'))) { g.players.forEach(I => I.consumeAll()); this.talk.open = false; this.choice = this.choice == null ? 1 : this.choice; return this.finish(); }
    this.talk.update(dt);
    for (const a of this.actors) a.rig.update(dt, { x: a.x, y: a.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: a.id === this.speaker ? (this.st.song ? 'cheer' : 'wave') : this.st.song ? 'cheer' : null, expr: a.id === this.speaker ? 'shout' : 'smile' });
    g.focus(160, 96, 0);
  },
  draw(r) {
    const st = this.st, kind = st.set;
    r.sky(kind === 'pub' ? ['#1a1008', '#2a1a10'] : kind === 'tunnel' ? ['#06060c', '#141420'] : ['#5a7090', '#9ab0c0']);
    this.map.drawFloor(r); this.map.queueWalls(r);
    if (kind === 'pub') { r.prop('barrel', 70, 60, 0, { size: 1.3 }); r.prop('barrel', 250, 60, 0, { size: 1.3 }); r.prop('lantern', 120, 40, 40, { anchor: 'top', light: true }); r.prop('lantern', 210, 40, 40, { anchor: 'top', light: true }); r.prop('lamp', 70, 140, 0, { light: true }); r.prop('banner', 160, 20, 50, { color: '#4aa0e0' }); r.prop('crate', 280, 150, 0); TT.game.lights.add(160, 100, 40, 160, .7, { color: '#ffb060' }); }
    else if (kind === 'tunnel') { r.prop('torch', 40, 30, 20, { light: true }); r.prop('torch', 280, 30, 20, { light: true }); TT.game.lights.add(160, 104, 60, 70, 1.4, { color: '#fff4d0' }); }
    else { for (const py of [130, 190]) r.queue(160, py * .5 + 40, 0, g => { const [x, y] = r.w(py, 30, 0), [, y1] = r.w(py, 30, 90); px.rect(g, Math.round(x), Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); }); r.queue(160, 30, 34, g => { const [x0, y0] = r.w(130, 30, 34), [x1] = r.w(190, 30, 34); px.rect(g, Math.round(x0), Math.round(y0), Math.round(x1 - x0) + 2, 2, '#f4f4f0'); }); r.prop('banner', 60, 20, 30, { color: '#4aa0e0' }); r.prop('banner', 260, 20, 30, { color: '#e8c040' }); if (this.d.id === 'victory') this.drawTrophy(r); }
    for (const a of this.actors) { r.shadow(a.x, a.y, 6, .4); r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, E.charView(r.view))); }
    if (this.d.id === 'third') { r.actor(250, 120, 0, (g, ox, oy) => { if (!this.chick) this.chick = new E.Blob({ R: 11, colors: { dk: '#c8b878', base: '#f4f0e0', lt: '#ffffff', spec: '#ffffff', eye: '#141010', pupil: '#000' }, wings: true, feet: true, mouth: true }); this.chick.update(1 / 60, { walk: .5, flap: Math.sin(this.t * 4) > 0 ? 1 : 0 }); this.chick.draw(g, ox, oy, E.charView(r.view)); px.rect(g, ox - 2, oy - 28, 5, 4, '#e02020'); }); }
    r.overlay(g => {
      E.ui.box(g, 0, 0, r.W, 18, { bg: '#000', border: '#000', alpha: .7, gradient: false });
      E.font.text(g, st.title, r.W / 2, 5, '#ffe08a', { align: 'center', outline: false });
      TT.prompt(g, '{b:confirm} NEXT  {b:tri} SKIP', 52, 5, TT.game.input);
    });
    this.talk.draw(r);
  },
  drawTrophy(r) {
    r.queue(160, 70, 0, g => {
      const [x, y] = r.w(160, 70, 0), X = Math.round(x), Y = Math.round(y), t = PR.t;
      px.rect(g, X - 10, Y - 6, 20, 6, '#5a2a8a'); px.rect(g, X - 3, Y - 26, 6, 20, '#c89a20'); px.poly(g, [[X - 14, Y - 56], [X + 14, Y - 56], [X + 8, Y - 26], [X - 8, Y - 26]], '#e8c040'); px.rect(g, X - 8, Y - 54, 4, 20, '#fff0a0');
      px.rect(g, X - 20, Y - 52, 6, 3, '#e8c040'); px.rect(g, X + 14, Y - 52, 6, 3, '#e8c040');
      for (let k = 0; k < 12; k++) px.rect(g, Math.round(X + Math.sin(t * 2 + k) * 60), Math.round(Y - 100 + ((t * 30 + k * 23) % 100)), 2, 2, ['#ff4040', '#40c0ff', '#ffe040', '#60ff80'][k % 4]);
    }, { emissive: true });
  }
});

/* ---- join: Start on a free pad, or 2 for the keyboard's right half; each seat picks HOME, AWAY or CPU ---- */
TT.scenes.join = Object.assign({}, FRONT, {
  enter(d) {
    this.mode = (d && d.mode) || 'exhibition';
    TT.bg.ensure(); const g = TT.game;
    const prev = TT.seatsJoined || [];
    this.seats = g.players.map((I, i) => ({ input: I, side: prev[i] ? prev[i].side || (prev[i].team ? 'AWAY' : 'HOME') : (i % 2 ? (this.mode === 'cup' ? 'HOME' : 'AWAY') : 'HOME') }));
    g.allowJoin({ max: 4, onJoin: (I) => { this.seats.push({ input: I, side: this.mode === 'cup' ? 'HOME' : (this.seats.length % 2 ? 'AWAY' : 'HOME') }); } });
  },
  exit() { TT.game.allowJoin(false); },
  update(dt) {
    TT.bg.step(dt); const g = TT.game;
    this.seats = this.seats.filter(s => g.players.includes(s.input));
    for (const s of this.seats) {
      const I = s.input;
      if (this.mode !== 'cup') { const opts = ['HOME', 'CPU', 'AWAY'], k = opts.indexOf(s.side); if (I.pressed('left')) { s.side = opts[Math.max(0, k - 1)]; TT.audio.sfx('select'); } if (I.pressed('right')) { s.side = opts[Math.min(2, k + 1)]; TT.audio.sfx('select'); } }
      if (I !== g.input && I.pressed('cancel')) { g.removePlayer(I); TT.audio.sfx('cancel'); }
    }
    if (g.input.pressed('confirm') || g.input.pressed('start') || g.input.pressed('x')) {
      if (!this.seats.some(s => s.side !== 'CPU')) { this.seats[0].side = 'HOME'; }
      g.players.forEach(I => I.consumeAll()); TT.audio.sfx('confirm');
      TT.seatsJoined = this.seats.filter(s => s.side !== 'CPU').map(s => ({ input: s.input, team: s.side === 'AWAY' ? 1 : 0, side: s.side }));
      if (this.mode === 'cup') g.go('cup'); else g.go('setup');
      return;
    }
    if (g.input.pressed('cancel')) { g.players.forEach(I => I.consumeAll()); while (g.players.length > 1) g.removePlayer(g.players[g.players.length - 1]); TT.seatsJoined = null; g.go(this.mode === 'cup' ? 'cup' : 'menu'); }
  },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, this.mode === 'cup' ? 'CO-OP: THE MUDLARKS' : 'PLAYERS', W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      E.font.text(g, 'PRESS START ON A CONTROLLER, OR 2 ON THE KEYBOARD, TO JOIN (UP TO 4)', W / 2, 32, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' });
      const cols = { HOME: W / 2 - 110, CPU: W / 2, AWAY: W / 2 + 110 };
      if (this.mode !== 'cup') { E.font.text(g, 'HOME', cols.HOME, 50, '#4aa0e0', { align: 'center', outline: '#000', scale: 2 }); E.font.text(g, 'CPU', cols.CPU, 50, '#a8b0c8', { align: 'center', outline: '#000', scale: 2 }); E.font.text(g, 'AWAY', cols.AWAY, 50, '#e85a4a', { align: 'center', outline: '#000', scale: 2 }); }
      for (let i = 0; i < 4; i++) {
        const s = this.seats[i], y = 76 + i * 28;
        if (!s) { E.font.text(g, 'P' + (i + 1) + '  ...', W / 2, y + 6, '#5a6078', { align: 'center', outline: false }); continue; }
        const x = this.mode === 'cup' ? W / 2 : cols[s.side], col = E.PLAYER_COLORS[i];
        E.ui.box(g, x - 46, y, 92, 22, { bg: ['#1a2238', '#0c1020'], border: col });
        E.font.text(g, 'P' + (i + 1), x - 40, y + 8, col, { outline: false, scale: 1 });
        E.font.text(g, s.input.half ? 'KEYS (' + s.input.half.toUpperCase() + ')' : s.input.lastDevice === 'gamepad' || s.input.pad != null ? 'PAD' : 'KEYS', x + 40, y + 8, '#c8d0e8', { align: 'right', font: 'tiny', outline: false });
        if (this.mode !== 'cup') TT.prompt(g, '{b:left}{b:right}', x, y + 24, s.input);
      }
      TT.ui.footer(g, W, H, this.mode === 'cup' ? '{b:confirm} DONE   {b:cancel} BACK' : '{b:left}{b:right} PICK A SIDE   {b:confirm} NEXT   {b:cancel} BACK');
    });
  }
});

/* ---- Exhibition's setup: the teams, the stadium, the weather, the time, the halves ---- */
TT.scenes.setup = Object.assign({}, FRONT, {
  enter() {
    TT.bg.ensure();
    const teams = TT.TEAMS.filter(t => !t.locked || TT.unlocks().meg);
    const S = this.s = this.s || { home: 0, away: 1, venue: 0, weather: 0, time: 0, halves: 0, sd: 0 };
    const W_ = ['Venue', 'Clear', 'Rain', 'Wind', 'Storm'], T_ = ['Venue', 'Day', 'Dusk', 'Night'], H_ = ['2 min', '3 min', '4 min', '5 min'];
    const cyc = (k, n, d) => { S[k] = (S[k] + d + n) % n; };
    const rows = [
      { k: 'home', label: 'HOME', value: () => teams[S.home].short, n: teams.length }, { k: 'away', label: 'AWAY', value: () => teams[S.away].short, n: teams.length },
      { k: 'venue', label: 'STADIUM', value: () => TT.VENUES[S.venue].name, n: 4 }, { k: 'weather', label: 'WEATHER', value: () => W_[S.weather].toUpperCase(), n: 5 },
      { k: 'time', label: 'TIME', value: () => T_[S.time].toUpperCase(), n: 4 }, { k: 'halves', label: 'HALVES', value: () => H_[S.halves].toUpperCase(), n: 4 },
      { k: 'sd', label: 'SUDDEN DEATH', value: () => S.sd ? 'OFF' : 'ON', n: 2 }, { k: 'play', label: 'KICK OFF!' }];
    this.teams = teams;
    this.menu = new TT.ui.BigMenu(rows, { y: 96, w: 260, rowH: 16, scale: 1, onLeft: (i, it) => it.n && cyc(it.k, it.n, -1), onRight: (i, it) => it.n && cyc(it.k, it.n, 1),
      onPick: (i, it) => { if (it.k === 'play') this.go(); else if (it.n) cyc(it.k, it.n, 1); }, onCancel: () => TT.game.go('join', { mode: 'exhibition' }) });
  },
  go() {
    const S = this.s, t = this.teams;
    const halves = [120, 180, 240, 300][S.halves];
    TT.game.go('match', { home: t[S.home].id, away: t[S.away].id, venue: TT.VENUES[S.venue].id, weather: ['venue', 'clear', 'rain', 'wind', 'storm'][S.weather], time: ['venue', 'day', 'dusk', 'night'][S.time], halfLength: halves, suddenDeath: !S.sd, seats: (TT.seatsJoined || [{ input: TT.game.input, team: 0 }]), seed: Date.now() & 0xffff });
  },
  update(dt) { TT.bg.step(dt); this.menu.update(dt); },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H, S = this.s;
      E.font.title(g, 'EXHIBITION', W / 2, 4, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      [S.home, S.away].forEach((k, j) => {
        const t = this.teams[k], x = j ? W / 2 + 10 : W / 2 - 140, y = 26;
        E.ui.box(g, x, y, 130, 64, { bg: ['#1a2238', '#0c1020'], border: t.home.cloth, alpha: .94 });
        TT.drawCrest(g, t, x + 16, y + 18, 2); E.font.text(g, t.name, x + 32, y + 6, '#ffffff', { font: 'tiny', outline: false, wrap: 96 });
        const avg = k2 => t.players.reduce((a, p) => a + Math.min(10, p.stats[k2]), 0) / 7;
        [['SPEED', avg('SPD')], ['POWER', avg('POW')], ['SKILL', (avg('HND') + avg('KCK')) / 2]].forEach(([l, v], i) => { E.font.text(g, l, x + 32, y + 26 + i * 12, '#a8b0c8', { font: 'tiny', outline: false }); E.ui.bar(g, x + 66, y + 26 + i * 12, 58, 5, v / 10, t.home.cloth === '#24242a' ? '#a8a8b0' : t.home.cloth); });
      });
      E.font.text(g, 'VS', W / 2, 52, '#ffe08a', { align: 'center', outline: '#000', scale: 2 });
      this.menu.draw(g, W);
      TT.ui.footer(g, W, H, '{b:up}{b:down} CHOOSE  {b:left}{b:right} CHANGE  {b:confirm} PICK  {b:cancel} BACK');
    });
  }
});

/* ---- the Training Ground: nine drills as cards; a tick on each one done ---- */
TT.scenes.training = Object.assign({}, FRONT, {
  enter(d) { this.d = d || {}; this.i = this.d.focus || 0; TT.bg.ensure('park'); TT.audio.music('pub'); this.boxes = []; },
  update(dt) {
    TT.bg.step(dt); const g = TT.game, P = g.players, n = TT.DRILLS.length;
    const old = this.i;
    if (P.some(I => I.repeat('right'))) this.i = (this.i + 1) % n; if (P.some(I => I.repeat('left'))) this.i = (this.i + n - 1) % n;
    if (P.some(I => I.repeat('down'))) this.i = (this.i + 3) % n; if (P.some(I => I.repeat('up'))) this.i = (this.i + n - 3) % n;
    const ptr = g.input.pointer && g.input.pointer(), c = g.input.clicked && g.input.clicked(), hit = p => this.boxes.findIndex(b => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]);
    if (ptr && g.input.mouse && g.input.mouse.t !== this._mt) { this._mt = g.input.mouse.t; const k = hit(ptr); if (k >= 0) this.i = k; }
    if (old !== this.i) TT.audio.sfx('select');
    if (P.some(I => I.pressed('confirm') || I.pressed('x')) || (c && hit(c) >= 0 && (this.i = hit(c)) >= 0)) { P.forEach(I => I.consumeAll()); TT.audio.sfx('confirm'); TT.trainingFrom = this.d; g.go('match', { drill: TT.DRILLS[this.i].id, home: 'mud', away: 'bad', venue: 'park', weather: 'clear', time: 'day', seats: [{ input: g.input, team: 0 }], seed: 5 }); return; }
    if (P.some(I => I.pressed('cancel'))) { P.forEach(I => I.consumeAll()); g.go(this.d.cup ? 'cup' : 'menu'); }
  },
  draw(r) {
    TT.bg.draw(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H, done = E.store.get('thugby:drills', {}) || {}, cw = Math.min(124, Math.floor((W - 24) / 3)), ch = 52;
      E.font.title(g, 'TRAINING GROUND', W / 2, 4, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      this.boxes = [];
      TT.DRILLS.forEach((d, i) => {
        const x = Math.round(W / 2 - 1.5 * (cw + 4) + (i % 3) * (cw + 4)), y = 28 + Math.floor(i / 3) * (ch + 4), on = i === this.i;
        this.boxes.push([x, y, cw, ch]);
        E.ui.box(g, x, y, cw, ch, { bg: on ? ['#3a3010', '#1a1408'] : ['#1a2238', '#0c1020'], border: on ? '#ffe060' : '#4a5470', alpha: .94 });
        E.font.text(g, (i + 1) + '. ' + d.name, x + 6, y + 6, on ? '#ffe060' : '#ffffff', { outline: false, scale: 1 });
        E.font.text(g, d.teach, x + 6, y + 20, '#a8b0c8', { font: 'tiny', outline: false, wrap: cw - 12 });
        if (done[d.id]) E.font.text(g, '★ DONE', x + cw - 6, y + ch - 12, '#80ff90', { align: 'right', outline: false });
      });
      const rig = TT.castRig('gristle'); rig.drawPortrait(g, 8, H - 58, 32, { zoom: 2.4, bg: '#3a2a1a' });
      E.font.text(g, '"Drill ' + (this.i + 1) + '. ' + TT.DRILLS[this.i].teach + '. No excuses."', 46, H - 48, '#ffe8c0', { outline: false });
      TT.ui.footer(g, W, H, '{b:confirm} TRAIN   {b:view} IN A DRILL: SHOW ME   {b:cancel} BACK');
    });
  }
});
TT.drillNext = id => { const k = TT.DRILLS.findIndex(d => d.id === id); TT.drills.stop(); TT.game.go('training', Object.assign({}, TT.trainingFrom || {}, { focus: (k + 1) % TT.DRILLS.length })); };

/* ---- results: the score, the Player of the Match, four big numbers; records; the cup goes on ---- */
TT.scenes.results = Object.assign({}, FRONT, {
  enter(r) {
    this.r = r; this.t = 0; TT.bg.ensure(TT.venueById(r.venue).id); TT.recordsInit();
    const humanTeams = [...new Set(r.seats)], humanWon = humanTeams.includes(r.winner);
    this.won = humanWon; this.cont = null;
    TT.audio.music(null); TT.audio.sting(humanWon || !humanTeams.length ? 'win' : 'lose');
    // records: margins, tries and hits by the human side
    this.entries = [];
    if (humanTeams.length && !TT.cfg.session) {
      const t = humanTeams[0], margin = r.score[t] - r.score[1 - t], tries = r.stats[t].tries, hit = r.hit * 10;
      if (margin > 0 && TT.cab.qualifies(margin, 'margin')) this.entries.push([margin, 'margin']);
      if (tries > 0 && TT.cab.qualifies(tries, 'tries')) this.entries.push([tries, 'tries']);
      if (hit > 0 && TT.cab.qualifies(hit, 'hit')) this.entries.push([hit, 'hit']);
    }
    this.nextEntry();
    const items = r.cup ? [{ id: 'cont', label: humanWon ? 'CONTINUE' : 'TRY AGAIN' }, { id: 'hub', label: 'CUP HUB' }] : [{ id: 'rematch', label: 'REMATCH' }, { id: 'menu', label: 'MAIN MENU' }];
    this.menu = new TT.ui.BigMenu(items, { y: 0, w: 140, rowH: 18, scale: 1, onPick: (i, it) => this.pick(it.id) });
    if (r.cup && !humanWon) { this.cont = 10; }
  },
  nextEntry() { const e = this.entries.shift(); if (e) TT.cab.enter(e[0], e[1], () => this.nextEntry()); },
  pick(id) {
    const g = TT.game, r = this.r;
    if (id === 'rematch') return g.go('match', Object.assign({}, TT.mdata, { seed: Date.now() & 0xffff }));
    if (id === 'menu') return g.go('menu');
    if (id === 'hub') return g.go('cup');
    if (id === 'cont') {
      if (!this.won) return TT.cupMatch();
      const k = TT.CUP.findIndex(c => c.id === r.cup);
      TT.cup.results[k] = [r.score[0], r.score[1]]; TT.cup.round = Math.max(TT.cup.round, k + 1); TT.cupSave();
      const st = TT.STORY[r.cup];
      if (TT.cup.round >= 4) { TT.unlock('meg'); TT.unlock('bigHeads'); E.store.set('thugby:cup', Object.assign({}, TT.cup)); return g.go('story', { id: 'victory' }); }
      return g.go('story', { id: r.cup, lines: st.won || [['barry', 'Through to the next round!']], next: 'cup' });
    }
  },
  update(dt) {
    this.t += dt; TT.bg.step(dt);
    if (TT.cab.entry) { TT.cab.update(dt); return; }
    if (this.cont != null) {
      this.cont -= dt;
      if (TT.game.players.some(I => I.pressed('confirm') || I.pressed('x'))) { TT.game.players.forEach(I => I.consumeAll()); return TT.cupMatch(); }
      if (this.cont <= 0) { this.cont = null; TT.game.go('cup'); }
      return;
    }
    if (this.t > 1) this.menu.update(dt);
  },
  draw(r) {
    TT.bg.draw(r, .65);
    const R = this.r;
    r.overlay(g => {
      const W = r.W, H = r.H, t0 = TT.teamById(R.home), t1 = TT.teamById(R.away);
      E.font.title(g, 'FULL TIME', W / 2, 6, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#ffb347'] });
      TT.drawCrest(g, t0, W / 2 - 100, 46, 2.4); TT.drawCrest(g, t1, W / 2 + 100, 46, 2.4);
      E.font.text(g, R.score[0] + ' - ' + R.score[1], W / 2, 36, '#ffffff', { align: 'center', outline: '#000', scale: 3 });
      E.font.text(g, R.winner < 0 ? 'A DRAW' : TT.teamById(R.winner ? R.away : R.home).name + ' WIN', W / 2, 64, '#ffe08a', { align: 'center', outline: '#000' });
      if (R.potm) { const rig = TT.castRig(R.potm.team + ':' + R.potm.idx), d = TT.teamById(R.potm.team).players[R.potm.idx]; TT.ui.panel(g, W / 2 - 110, 78, 220, 40); rig.drawPortrait(g, W / 2 - 106, 81, 34, { zoom: 2.5, bg: '#2a3450' }); E.font.text(g, 'PLAYER OF THE MATCH', W / 2 - 66, 82, '#ffe08a', { font: 'tiny', outline: false }); E.font.text(g, '"' + d.nick + '"', W / 2 - 66, 92, '#ffffff', { outline: false }); E.font.text(g, R.potm.tries + ' TRIES, ' + R.potm.tackles + ' TACKLES, ' + R.potm.metres + ' M', W / 2 - 66, 104, '#a8b0c8', { font: 'tiny', outline: false }); }
      const s = R.stats, tot = Math.max(1, s[0].poss + s[1].poss);
      [['TRIES', s[0].tries, s[1].tries], ['BIG HITS', s[0].bigHits, s[1].bigHits], ['METRES', TT.metres(s[0].metres), TT.metres(s[1].metres)], ['POSSESSION', Math.round(s[0].poss / tot * 100) + '%', Math.round(s[1].poss / tot * 100) + '%']].forEach(([l, a, b], i) => {
        const x = Math.round(W / 2 - 2 * 76 + i * 76), y = 124; E.ui.box(g, x, y, 72, 34, { bg: ['#1a2238', '#0c1020'], border: '#4a5470', alpha: .92 });
        E.font.text(g, l, x + 36, y + 4, '#a8b0c8', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, a + ' - ' + b, x + 36, y + 16, '#ffffff', { align: 'center', outline: false, scale: 1 });
      });
      if (this.cont != null) { E.font.title(g, 'CONTINUE? ' + Math.ceil(this.cont), W / 2, 168, { align: 'center', scale: 2, colors: ['#ffffff', '#ff8070'] }); TT.prompt(g, '{b:confirm} TRY AGAIN', W / 2, 192, TT.game.input); }
      else if (!TT.cab.entry) { this.menu.y = 168; this.menu.draw(g, W); }
      if (!TT.cab.entry) TT.ui.footer(g, W, H, '{b:confirm} PICK');
    });
    if (TT.cab.entry) TT.cab.draw(r);
  }
});

/* ---- jumps (the dev panel's JUMP tab, deep links) ---- */
TT.jump = k => {
  const g = TT.game, [a, b] = k.split(':');
  if (a === 'cup') { if (!TT.cup) TT.cupNew(); TT.cup.round = TT.CUP.findIndex(c => c.id === b); TT.cupMatch(); }
  else if (a === 'story') { if (!TT.cup) TT.cupNew(); g.go('story', { id: b, next: b === 'prologue' ? null : b === 'victory' || b === 'third' ? null : 'cup' }); }
  else if (a === 'drill') g.go('match', { drill: b, home: 'mud', away: 'bad', venue: 'park', weather: 'clear', time: 'day', seats: [{ input: g.input, team: 0 }], seed: 5 });
  else if (a === 'session') g.go('match', { home: 'mud', away: 'gul', venue: 'docks', halfLength: 75, noReplays: true, seats: [{ input: g.input, team: 0 }] });
  else g.go(a);
};

/* ==== 43-scene-match.js ==== */
/* ---- THE MATCH SCENE: a live match, a training drill, the attract demo, or an AI Hub session ---- */

TT.mouse = { ground: null, hoverId: -1, click: false, clickId: -1, pick: null, kickAim: null, wheel: 0 };
const diffShift = (name, k) => TT.DIFF_ORDER[clamp(TT.DIFF_ORDER.indexOf(name) + k, 0, 2)];

/** start a match: o = { home, away, venue, weather, time, halfLength, suddenDeath, cup, drill, attract, session, seed, seats } */
TT.startMatch = (o) => {
  TT.comm.reset(); TT.replay.reset(); TT.hud.banners = [];
  const halves = { '2 min': 120, '3 min': 180, '4 min': 240, '5 min': 300 }[TT.settings.halves] || 120;
  const m = TT.sim.create(Object.assign({ halfLength: o.halfLength || (o.attract ? 9999 : halves) }, o));
  const base = TT.settings.difficulty || 'Pro';
  m.diff = [0, 1].map(t => TT.DIFF[o.attract ? 'Pro' : diffShift(base, m.teams[t].diff || 0)]);
  if (o.attract) m.cheats = { noClock: true };
  if (TT.devCheats) Object.assign(m.cheats, TT.devCheats);
  // the seats: who plays (P1 on the home side by default)
  TT.seats = (o.seats || (o.attract ? [] : [{ input: TT.game.input, team: 0 }])).map((s, i) => TT.control.seat(Object.assign({ label: s.label || ('P' + (i + 1)), color: s.color || E.PLAYER_COLORS[i] || '#ffd23a' }, s)));
  TT.layerTune(m);
  if (TT.cfg.present) TT.pres.setup(m);
  if (o.drill) TT.drills.setup(m, o.drill);
  return m;
};
/** the match options layered over the balance values (half length) */
TT.layerTune = m => { TUNE.layer('match', { halfLength: m.halfLen }); };

TT.scenes.match = {
  view: 'broadcast', views: TT.VIEW_IDS, input: TT.KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: [.55, 1.3], start: .72 },
  enter(data) {
    data = data || {};
    TT.mdata = data;
    if (data.resume && M) { this.pausable = !TT.cfg.session; return; }
    this.pausable = !data.attract && !TT.cfg.session;
    TT.startMatch(data);
    TT.fx.on = true;
    const g = TT.game, tod = M.o.time && M.o.time !== 'venue' ? M.o.time : M.venue.time;
    g.lights.enabled = true; g.lights.ambient = tod === 'day' ? .95 : tod === 'dusk' ? .66 : .48;
    const w = M.weather;
    g.weather = w === 'rain' ? { kind: 'rain', amount: M.venue.rain || .6, wind: .2 } : w === 'storm' ? { kind: 'rain', amount: .9, wind: .4, lightning: .15 } : w === 'wind' ? { kind: 'leaves', amount: .3, wind: .8 } : null;
    g.cam.smooth = .22; g.cam.bounds = v => PR.cur ? PR.cur.bounds(v) : null;
    const v = TT.settings.camera === 'High' ? 'threequarter' : TT.settings.camera === 'Overhead' ? 'topdown' : 'broadcast';
    g.setView(v);
    TT.audio.music(data.drill ? 'pub' : M.venue.music);
    TT.fx._near = TT.fx._hot = undefined;
    this.endT = 0;
    if (data.attract) TT.attract.begin();
    if (TT.cfg.session && TT.net) TT.net.matchStarted();
  },
  exit() { if (this.kickCam) { TT.game.setView(this.kickCam); this.kickCam = null; } TT.fx.on = false; TT.game.weather = null; TT.dev.close(); TT.game.cam.frame && TT.game.cam.frame(null); },
  update(dt) {
    const g = TT.game;
    if (!M) return;
    if (M.o.attract) { if (TT.attract.step(dt)) return; }
    if (TT.dev.open && TT.dev.update(dt)) { /* the dev panel took the input */ }
    TT.mouseStep();
    if (g.players.some(I => I.pressed('view')) && !M.drill) { g.nextView(); g.note(g.view.label.toUpperCase() + ' CAMERA'); }
    // replays: any button skips
    let skip = false;
    if (TT.replay.playing) skip = g.players.some(I => I.pressed('x') || I.pressed('ci') || I.pressed('confirm'));
    const isClient = TT.cfg.session && TT.net && !TT.net.isHost;
    if (isClient) TT.net.clientStep(dt);
    else if (!TT.replay.playing) {
      const intents = TT.control.collect(dt);
      if (!(TT.dev.open && TT.dev.frozen)) TT.sim.step(dt, intents);
      if (TT.cfg.session && TT.net) TT.net.hostStep(dt);
    }
    if (!TT.cfg.session) TT.replay.record(M);
    const view = TT.replay.tick(dt, M, skip) || M;
    if (M.drill) TT.drills.step(dt);
    TT.pres.update(dt, view);
    TT.hud.step(dt); TT.comm.step(dt); TT.crowd.step(dt, M); TT.fx.music(M);
    // set kicks cut to the behind-the-kicker camera, then back to the player's view
    if (TT.cfg.present && !TT.cfg.session) {
      const kick = M.phase === 'setkick' && M.sub !== 'result';
      if (kick && !this.kickCam) { this.kickCam = g.view.id; g.setView(dirOf(M.ph.team) > 0 ? 'postsE' : 'postsW'); }
      else if (!kick && this.kickCam) { g.setView(this.kickCam); this.kickCam = null; }
    }
    TT.camStep(dt, view);
    // the end: the results (or the drill list, or the title after a demo)
    if (M.phase === 'full' && !M.drill) {
      this.endT += dt;
      if (this.endT > 4 && !TT.cfg.session && !M.o.attract) TT.toResults();
    }
  },
  draw(r) {
    if (!M) return;
    const view = TT.replay.view || M;
    TT.pres.drawWorld(r, view);
    // the kick-off reticle
    if (M.phase === 'kickoff') { const a = M.ph.aim; r.groundRing(a[0], a[1], 10, '#ffe060', .9); r.groundRing(a[0], a[1], 4, '#ffffff', .9); }
    if (TT.replay.playing) r.overlay(g => { px.rect(g, 0, 0, r.W, 18, '#000'); px.rect(g, 0, r.H - 18, r.W, 18, '#000'); E.font.text(g, 'INSTANT REPLAY', 8, 5, Math.floor(PR.t * 3) % 2 ? '#ff4040' : '#ffffff', { outline: false }); TT.prompt(g, '{b:x} SKIP', r.W - 40, r.H - 13, TT.game.input); });
    else TT.hud.draw(r, M);
    TT.comm.draw(r);
    if (M.drill) TT.drills.draw(r);
    if (M.o.attract) TT.attract.draw(r);
    if (TT.dev.open) TT.dev.draw(r);
    if (TT.cfg.session && TT.net) TT.net.draw(r);
  }
};
/** the mouse in the world: the teammate under it, a click on him, the set kick's aim, a pod or a card */
TT.mouseStep = () => {
  const g = TT.game, I = g.input, mo = TT.mouse;
  mo.click = false; mo.clickId = -1; mo.pick = null; mo.wheel = 0;
  if (!TT.cfg.present || I.lastDevice !== 'mouse') { mo.hoverId = -1; return; }
  mo.ground = g.mouseGround ? g.mouseGround() : null;
  const seat = TT.seats.find(s => s.input === I);
  mo.hoverId = -1;
  if (mo.ground && seat && M) {
    let best = -1, bd = 14;
    for (const p of M.players) if (p.team === seat.team && onField(p) && p.id !== seat.pid) { const d = Math.hypot(p.x - mo.ground[0], p.y - mo.ground[1]); if (d < bd) { bd = d; best = p.id; } }
    mo.hoverId = best;
  }
  const c = I.clicked && I.clicked();
  if (c) {
    mo.click = true; mo.clickId = mo.hoverId;
    if (mo.cards) for (const b of mo.cards) if (c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]) mo.pick = b[4];
  }
  const ptr = I.pointer && I.pointer();
  if (ptr && mo.kickBox && M && M.phase === 'setkick' && M.sub === 'aim') { const [x0, , bw, , sc] = mo.kickBox; mo.kickAim = clamp((ptr[0] - (x0 + bw / 2)) / sc / 60, -1, 1); } else mo.kickAim = null;
};
/** the broadcast camera: the ball (or its carrier) with a lead, pulled toward the middle; kicks framed; replays close */
TT.camStep = (dt, v) => {
  const g = TT.game; if (!v || !v.ball) return;
  const b = v.ball, att = v.possession;
  let x = b.x + dirOf(att) * 40, y = b.y + (G.CY - b.y) * .25, z = 8;
  if (v.phase === 'scrum' || v.phase === 'lineout') { x = v.ph.x != null ? v.ph.x : b.x; y = v.phase === 'lineout' ? lerp(v.ph.ty, G.CY, .35) : v.ph.y; }
  if (v.phase === 'setkick') { const d = dirOf(v.ph.team), kx = v.ph.kx || b.x; x = lerp(kx, v.ph.tl, .55); y = lerp(v.ph.ky || b.y, G.CY, .5); if (v.sub === 'flight') { x = lerp(b.x, v.ph.tl, .4); y = b.y; } }
  if (v.phase === 'kickoff') { x = lerp(v.ph.x, v.ph.aim[0], .4); y = lerp(v.ph.y, v.ph.aim[1], .4); }
  if (v.phase === 'walkout') { x = G.CX; y = G.CY + 60; }
  if (TT.replay.playing && TT.replay.focus >= 0) { const p = v.players[TT.replay.focus]; x = p.x; y = p.y; }
  if (b.st === 'air' && b.landing && b.kind !== 'pass' && v.phase === 'play') { x = lerp(b.x, b.landing.x, .5); y = lerp(b.y, b.landing.y, .5) + (G.CY - b.y) * .15; }
  g.focus(x, y, z);
};

/* ---- THE TRAINING GROUND: each drill a setup, a goal and an auto script (SHOW ME, and the tests' proof) ---- */
TT.drills = {
  list: TT.DRILLS,
  setup(m, id) {
    const def = TT.DRILLS.find(d => d.id === id) || TT.DRILLS[0];
    m.drill = { id: def.id, def, t: 0, done: false, doneT: 0, n: {}, msg: '', resetT: 0, part: 0, arcade: def.id === 'turbo', noConversion: def.id !== 'posts', easyTackles: def.id === 'hit' || def.id === 'ruck' };
    m.cheats = Object.assign({}, m.cheats, { noClock: true });
    this.listeners = [];
    const count = (ev, k, f) => this.listeners.push(TT.bus.on(ev, d => { if (!M || !M.drill || M.drill.done) return; if (!f || f(d)) { M.drill.n[k] = (M.drill.n[k] || 0) + 1; TT.audio.sfx('coin'); } }));
    const mine = d => d.pid != null && M.players[d.pid] && M.players[d.pid].team === 0;
    const me = d => d.pid != null && M.players[d.pid] && M.players[d.pid].ctl >= 0;
    if (id === 'legs') count('try', 'try', mine);
    if (id === 'hands') { count('pass', 'up', d => M.players[d.pid].team === 0 && M.players[d.to].y < M.players[d.pid].y && !d.long); count('pass', 'down', d => M.players[d.pid].team === 0 && M.players[d.to].y > M.players[d.pid].y && !d.long); count('pass', 'long', d => d.long); count('catch', 'caught', mine); }
    if (id === 'feet') { count('stepMove', 'step', me); count('spinMove', 'spin', me); count('fend', 'fend', mine); }
    if (id === 'hit') { count('tackle', 'tackle', d => M.players[d.pid].team === 0 && d.kind === 'tackle'); count('bigHit', 'big', mine); count('monsterHit', 'big', mine); count('diveTackle', 'dive', mine); count('switch', 'switch'); }
    if (id === 'ruck') { count('ruckWon', 'won', d => d.team === 0); count('jackal', 'jackal', mine); }
    if (id === 'boot') { count('kick', 'grubber', d => mine(d) && d.kind === 'grubber'); count('kickTouch', 'touch', d => d.team === 0); count('dropGoal', 'drop', d => d.team === 0); }
    if (id === 'set') { count('scrumWon', 'scrum', d => d.team === 0); count('lineoutWon', 'lineout', d => d.team === 0); count('lineoutSteal', 'lineout', d => d.team === 0); }
    if (id === 'posts') count('conversion', 'conv', d => d.team === 0);
    if (id === 'turbo') { count('powerupTake', 'pie', mine); count('superStart', 'super', mine); count('try', 'try', mine); }
    this.reset(m);
  },
  goals: {
    legs: n => [['GROUND IT OVER THE LINE', n.try >= 1]],
    hands: n => [['PASS UP THE LINE (L1)', n.up >= 1], ['PASS DOWN THE LINE (R1)', n.down >= 1], ['A LONG PASS (HOLD)', n.long >= 1], ['FIVE CATCHES', (n.caught || 0) >= 5]],
    feet: n => [['TWO SIDESTEPS', (n.step || 0) >= 2], ['ONE SPIN', n.spin >= 1], ['FEND THE DEFENDER', n.fend >= 1]],
    hit: n => [['A TACKLE', n.tackle >= 1], ['A BIG HIT', n.big >= 1], ['A DIVE TACKLE', n.dive >= 1], ['SWITCH PLAYER', n.switch >= 1]],
    ruck: n => [['WIN TWO RUCKS', (n.won || 0) >= 2], ['JACKAL ONE', n.jackal >= 1]],
    boot: n => [['A GRUBBER', n.grubber >= 1], ['A PUNT INTO TOUCH', n.touch >= 1], ['A DROP GOAL', n.drop >= 1]],
    set: n => [['WIN A SCRUM', n.scrum >= 1], ['WIN A LINEOUT', n.lineout >= 1]],
    posts: n => [['CONVERT THE TRY', n.conv >= 1]],
    turbo: n => [['GRAB THE PIE', n.pie >= 1], ['THUNDER RUN', n.super >= 1], ['SCORE', n.try >= 1]]
  },
  /** put the drill's pieces where its next step needs them */
  reset(m) {
    const d = m.drill, id = d.id, n = d.n;
    d.resetT = 0;
    for (const p of m.players) { p.st = 'off'; p.x = -500; p.y = -500; p.vx = p.vy = 0; p.ctl = -1; p.power = null; p.superK = ''; }
    m.ball.st = 'dead'; m.hazards = []; m.pu = null; m.useIt = null; m.adv = null; M.puT = 0;
    const H = idx => m.players[idx], A = idx => m.players[7 + idx];
    const put = (p, x, y) => { p.st = 'run'; p.stT = 0; p.x = x; p.y = y; p.z = 0; p.facing = dirOf(p.team) > 0 ? 0 : PI; p.turbo = 1; };
    const X = (u) => G.X0 + u;   // home attacks +x in the first half
    TT.sim.setPhase('play');
    if (id === 'legs') { put(H(6), X(225), G.CY); TT.sim.giveBall(6); }
    else if (id === 'hands') { put(H(3), X(300), G.CY - 60); [4, 5, 6, 2].forEach((k, i) => put(H(k), X(270 - i * 12), G.CY - 60 + (i + 1) * 45 * (i % 2 ? 1 : 1))); put(H(1), X(258), G.CY - 105); TT.sim.giveBall(3); }
    else if (id === 'feet') { put(H(5), X(250), G.CY); [0, 1, 2].forEach(k => { put(A(k), X(330 + k * 70), G.CY + (k - 1) * 30); A(k).st = 'run'; }); put(A(5), X(560), G.CY); TT.sim.giveBall(5); m.drill.bags = [7, 8, 9]; }
    else if (id === 'hit') { put(H(5), X(500), G.CY); put(H(6), X(500), G.CY + 120); put(A(6), X(700), G.CY + (n.tackle ? 40 : 0)); put(A(4), X(760), G.CY - 60); TT.sim.giveBall(13); }
    else if (id === 'ruck') {
      if ((n.won || 0) < 2) { put(H(5), X(400), G.CY); put(H(0), X(380), G.CY - 30); put(H(3), X(370), G.CY + 30); put(A(5), X(470), G.CY); put(A(0), X(520), G.CY + 40); TT.sim.giveBall(5); }
      else { put(H(5), X(450), G.CY); put(H(1), X(440), G.CY + 40); put(A(5), X(560), G.CY); put(A(3), X(600), G.CY + 30); TT.sim.giveBall(12); }
    }
    else if (id === 'boot') {
      if (!n.grubber) { put(H(4), X(820), G.CY); put(A(6), X(1010), G.CY - 100); TT.sim.giveBall(4); }
      else if (!n.touch) { put(H(4), X(300), G.CY + 150); TT.sim.giveBall(4); }
      else { put(H(4), X(1024 - 300), G.CY); TT.sim.giveBall(4); }
    }
    else if (id === 'set') {
      for (let k = 0; k < 7; k++) { put(H(k), X(500), G.CY); put(A(k), X(540), G.CY); }
      if (!n.scrum) TT.sp.scrum(0, X(500), G.CY, 'drill'); else TT.sp.lineout(0, X(500), 0);
    }
    else if (id === 'posts') { for (let k = 0; k < 7; k++) { put(H(k), X(1000), G.CY); put(A(k), X(1050), G.CY); } TT.sp.startSetKick(0, 'conv', G.Y0 + 90); }
    else if (id === 'turbo') {
      put(H(6), X(400), G.CY); [1, 3, 5].forEach((k, i) => put(A(k), X(620 + i * 70), G.CY + (i - 1) * 40));
      TT.sim.giveBall(6); m.hype[0] = 100; if (!n.pie) TT.arc.spawnPowerup('pie', [X(470), G.CY - 30, 0]);
    }
    // the human takes the piece
    if (TT.seats[0]) { const h = holder(); TT.seats[0].pid = h && h.team === 0 ? h.id : (m.players.find(p => p.team === 0 && p.st !== 'off') || {}).id; }
  },
  step(dt) {
    const m = M, d = m.drill; if (!d) return;
    d.t += dt;
    const goals = this.goals[d.id](d.n), all = goals.every(g => g[1]);
    if (all && !d.done) { d.done = true; d.doneT = 0; TT.audio.sting('win'); TT.hud.banner('DRILL COMPLETE!', { scale: 3 }); const done = E.store.get('thugby:drills', {}) || {}; done[d.id] = true; if (!TT.cfg.session) E.store.set('thugby:drills', done); TT.bus.emit('drillDone', { id: d.id }); }
    if (d.done) { d.doneT += dt; if (d.doneT > 2.5 && !d.stay) { if (TT.drillNext) TT.drillNext(d.id); } return; }
    // SHOW ME: the coach's auto script drives the human's player
    const I = TT.game.input;
    if (I.pressed('view') && !d.showMe && TT.seats[0]) { d.showMe = true; TT.seats[0].kind = 'script'; TT.comm.show('barry', 'Watch me, you muppets.'); TT.comm.talk.name = 'COACH GRISTLE'; }
    if (TT.seats[0] && TT.seats[0].kind === 'script') { TT.seats[0].intent = this.auto(d.id, TT.seats[0]); }
    // stoppages the drill didn't ask for, a tackle, a lost ball: reset in a second
    const bad = (m.phase === 'stop' && !(d.id === 'boot' && m.ph.label === 'DROP GOAL!')) || (m.phase === 'ruck' && d.id !== 'ruck') || (m.phase === 'play' && m.ball.st === 'held' && pl(m.ball.holder).team === 1 && d.id !== 'hit' && !(d.id === 'ruck' && (d.n.won || 0) >= 2)) || m.phase === 'full' || (m.phase === 'scrum' && d.id !== 'set') || (m.phase === 'lineout' && d.id !== 'set') || m.phase === 'penalty' || m.phase === 'kickoff';
    const idle = m.phase === 'play' && m.ball.st === 'dead';
    const tryDone = m.phase === 'try' && m.phaseT > 2;
    const kickDone = m.phase === 'setkick' && m.sub === 'result' && m.ph.subT > 1.2;
    const hitDone = d.id === 'hit' && m.phase === 'ruck';
    const ruckOut = d.id === 'ruck' && m.phase === 'play' && m.ball.st === 'held' && m.phaseT > .8;
    const setOut = d.id === 'set' && m.phase === 'play' && m.phaseT > .8;
    if (bad || idle || tryDone || kickDone || hitDone || ruckOut || setOut || (m.phase === 'play' && d.t > 25)) { d.resetT += dt; if (d.resetT > (hitDone ? .8 : 1)) { d.t = 0; this.reset(m); } }
  },
  /** the coach's (and the tests') way through each drill: an intent for the human's player */
  auto(id, seat) {
    const m = M, it = TT.blankIntent(), p = m.players[seat.pid]; if (!p) return it;
    const d = m.drill, n = d.n, t = m.t, dirX = dirOf(0), tick = Math.floor(t * 4);
    const run = (x, y, turbo) => { const dx = x - p.x, dy = y - p.y, l = Math.hypot(dx, dy) || 1; it.mx = dx / l; it.my = dy / l; it.turbo = !!turbo; };
    const tap = k => { if (tick % 2 === 0 && !d['_' + k + tick]) { d['_' + k + tick] = 1; it.p[k] = true; it.r[k] = true; } };
    if (m.phase === 'setkick') { if (m.sub === 'place') it.p.x = true; else if (m.sub === 'aim') { it.kickAim = 0; if (!d._pow) d._pow = 0; d._pow += 1 / 120; if (m.ph.power < Math.min(1, m.ph.need + .07) && d._pow < .97) it.h.ci = true; else { it.r.ci = true; d._pow = 0; } } return it; }
    if (m.phase === 'scrum') { if (m.sub === 'set' && m.ph.subT >= .48 && m.ph.subT < .55) it.p.x = true; if (m.sub === 'push') { const k = Math.floor(t * 20) % 2 ? 'l1' : 'r1'; it.p[k] = true; } return it; }
    if (m.phase === 'lineout') { if (m.sub === 'call' && m.ph.subT > .3) it.p.x = true; if (m.sub === 'throw' && Math.abs(m.ph.needle) < .2) it.p.x = true; return it; }
    if (m.phase === 'ruck') { if (Math.floor(t * 24) % 2) it.p.x = true; if (m.phaseT < .3) it.p.sq = true; return it; }
    const carrying = m.ball.holder === p.id;
    const tl = tryLineOf(0);
    if (id === 'legs' || (id === 'turbo' && n.super)) { run(tl + 30, G.CY, true); if ((p.x - tl) * dirX > 4) tap('x'); }
    else if (id === 'turbo') { if (m.pu) { run(m.pu.x, m.pu.y, true); } else { tap('tri'); run(tl + 30, G.CY, true); } }
    else if (id === 'hands') {
      it.mx = .1 * dirX;
      if (carrying && m.phaseT > .2 && p.stT > .5 && p.cool <= 0) {
        if (!n.up) tap('l1'); else if (!n.down) tap('r1');
        else if (!n.long) { d._lh = (d._lh || 0) + 1 / 120; if (d._lh < .35) it.h.l1 = true; else { it.r.l1 = true; d._lh = 0; } }
        else tap(p.y > G.CY ? 'l1' : 'r1');
      }
    }
    else if (id === 'feet') { run(p.x + dirX * 60, G.CY + Math.sin(t) * 40, false); const f = TT.sim.nearestFoe(p); if (f && Math.hypot(f.x - p.x, f.y - p.y) < 30) { if ((n.step || 0) < 2) tap('x'); else if (!n.spin) { tap('x'); if (p.st === 'sidestep' && p.stT > .05) it.p.x = true; } else if (!n.fend) { if (Math.hypot(f.x - p.x, f.y - p.y) < 24) tap('sq'); } } }
    else if (id === 'hit' || (id === 'ruck' && (n.won || 0) >= 2)) {
      const h = holder();
      if (!n.switch) { tap('ci'); tap('l1'); }
      if (h && h.team === 1) {
        const dd = Math.hypot(h.x - p.x, h.y - p.y); run(h.x, h.y, dd > 30);
        if (id === 'ruck') { if (dd < 12) tap('x'); }
        else if (!n.tackle) { if (dd < 11) tap('x'); }
        else if (!n.big) { if (dd > 16) it.h.x = p.st === 'charge' ? p.charge < TUNE.v.bigHitCharge * 1.05 : true; else it.r.x = true; }
        else if (!n.dive) { if (dd < 22) tap('sq'); }
      }
    }
    else if (id === 'ruck') { run(p.x + dirX * 80, p.y, false); }
    else if (id === 'boot') {
      if (!n.grubber) { if (carrying) { it.mx = dirX; tap('ci'); } else if (m.ball.st !== 'held') run(m.ball.x, m.ball.y, true); }
      else if (!n.touch) { if (carrying) { it.mx = dirX * .5; it.my = .9; d._kh = (d._kh || 0) + 1 / 120; if (d._kh < .7) it.h.ci = true; else { it.r.ci = true; d._kh = 0; } } }
      else if (!n.drop) { if (carrying) { it.mx = dirX * .2; d._dh = (d._dh || 0) + 1 / 120; if (d._dh < .85) it.h.ci = true; else { it.r.ci = true; d._dh = 0; } } }
    }
    return it;
  },
  draw(r) {
    const d = M.drill; if (!d) return;
    r.overlay(g => {
      const W = r.W, goals = this.goals[d.id](d.n), x = W - 150, y = 50;
      TT.ui.panel(g, x, y, 144, 22 + goals.length * 12);
      E.font.text(g, 'DRILL: ' + d.def.name, x + 6, y + 5, '#ffe080', { outline: false });
      goals.forEach(([lab, ok], i) => { E.font.text(g, (ok ? '★ ' : '• ') + lab, x + 6, y + 18 + i * 12, ok ? '#80ff90' : '#ffffff', { font: 'tiny', outline: false }); });
      E.ui.box(g, W / 2 - 170, 52, 340, 15, { bg: '#0c1020', border: '#3a4460', alpha: .8, gradient: false });
      TT.prompt(g, d.def.prompt, W / 2, 56, TT.game.input);
      if (!d.done) TT.prompt(g, d.showMe ? 'COACH IS SHOWING YOU' : '{b:view} SHOW ME', W - 78, y + 30 + goals.length * 12, TT.game.input);
    });
  },
  stop() { for (const off of this.listeners || []) off(); this.listeners = []; }
};

/* ---- THE ATTRACT MODE: CPU against CPU with the clock off; a director walks a showcase of every feature ---- */
TT.attract = {
  loop: 0, active: false,
  start() {
    if (TT.cfg.session) return;
    const pairs = [['mud', 'bad', 'park'], ['gul', 'irn', 'docks'], ['irn', 'mud', 'furnace'], ['meg', 'gul', 'dome']];
    const [h, a, v] = pairs[this.loop++ % pairs.length];
    TT.game.go('match', { attract: true, home: h, away: a, venue: v, seed: 1000 + this.loop });
  },
  begin() { this.active = true; this.t = 0; this.stepI = 0; this.stepT = 0; this.fired = []; this.grace = .6; },
  STEPS: ['walkout', 'run', 'passes', 'monster', 'jackal', 'knockon', 'touch', 'powerup', 'hazard', 'thunder', 'conversion', 'cheap', 'fire', 'dropgoal', 'end'],
  step(dt) {
    this.t += dt; this.grace -= dt;
    if (this.grace <= 0 && TT.anyInput()) { TT.game.players.forEach(I => I.consumeAll()); this.active = false; TT.idle.t = 0; TT.game.go('title'); return true; }
    this.stepT += dt;
    const s = this.STEPS[this.stepI];
    const ready = M.phase === 'play' && M.ball.st === 'held' && this.stepT > 3.5;
    const next = () => { this.fired.push(s); this.stepI++; this.stepT = 0; };
    if (s === 'walkout') { if (M.phase === 'play') next(); }
    else if (s === 'run' || s === 'passes') { if (this.stepT > 6) next(); }
    else if (ready || this.stepT > 12) {
      const F = TT.force;
      if (s === 'monster') F('monsterHit'); else if (s === 'jackal') F('ruck', { jackal: true }); else if (s === 'knockon') F('knockOn'); else if (s === 'touch') F('touch');
      else if (s === 'powerup') F('powerup', { kind: TT.POWERUP_IDS[this.loop % 5] }); else if (s === 'hazard') F('hazard', { kind: M.venue.hazard === 'mud' ? 'chicken' : M.venue.hazard });
      else if (s === 'thunder') F('thunderTry'); else if (s === 'conversion') { /* comes with the try */ } else if (s === 'cheap') F('yellow'); else if (s === 'fire') F('onFireTry'); else if (s === 'dropgoal') F('dropGoal');
      else if (s === 'end') { this.active = false; TT.game.go('records', { attract: true }); return true; }
      next();
    }
    return false;
  },
  draw(r) {
    r.overlay(g => {
      E.font.title(g, 'DEMO', r.W / 2, 40, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a'] });
      if (Math.floor(PR.t * 2) % 2) E.font.text(g, TT.cfg.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', r.W / 2, r.H - 30, '#ffffff', { align: 'center', outline: '#000', scale: 2 });
      E.font.title(g, 'THUGBY TURBO', r.W - 70, r.H - 64, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd040', '#e06020'] });
    });
  }
};

/* ---- results: after a match ---- */
TT.toResults = () => {
  if (!M) return;
  const s = M.stats, w = M.winner;
  const potmTeam = w >= 0 ? w : 0;
  let best = null, bs = -1;
  for (const p of M.players) if (p.team === potmTeam) { const v = p.tries * 10 + p.monsters * 4 + p.tackles + TT.metres(p.metres) / 10; if (v > bs) { bs = v; best = p; } }
  const r = { home: M.teams[0].id, away: M.teams[1].id, score: M.score.slice(), winner: w, stats: s.map(x => Object.assign({}, x)), potm: best ? { team: M.teams[potmTeam].id, idx: best.idx, tries: best.tries, tackles: best.tackles, metres: TT.metres(best.metres) } : null, cup: M.o.cup, seats: TT.seats.map(x => x.team), hit: TT.metres(M.bestHit), tries: Math.max(s[0].tries, s[1].tries), venue: M.venue.id };
  TT.game.go('results', r);
};

/* ==== 50-dev.js ==== */
/* ---- DEV MODE: from the pause menu. Live sliders for the balance (reset to defaults), cheats, one-press events,
 * debug overlays and jumps to every part of the game. ` toggles it once it has been opened ---- */
TT.devCheats = null;
/** one-press events (the dev panel's, the attract director's and the tests'): game.debug.force(name, opts) */
TT.force = (name, o = {}) => {
  if (!M) return false;
  const P = M.players, seat0 = TT.seats[0], b = M.ball;
  const carrierOf = t => { const h = holder(); if (h && h.team === t) return h; return P.filter(p => p.team === t && standing(p)).sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0] || P.find(p => p.team === t && onField(p)); };
  const toPlay = () => { if (M.phase !== 'play') { for (const p of P) if (onField(p) && p.st !== 'binned') resetPlayer(p); setPhase('play'); } };
  const t0 = o.team != null ? o.team : seat0 ? seat0.team : 0;
  switch (name) {
    case 'tryHome': case 'tryAway': { const t = name === 'tryHome' ? 0 : 1; toPlay(); const p = carrierOf(t); p.x = tryLineOf(t) + dirOf(t) * 20; p.y = G.CY + 40; giveBall(p, 'restart'); tryScored(p); return true; }
    case 'giveP1': { toPlay(); const p = seat0 && seat0.pid >= 0 ? P[seat0.pid] : carrierOf(0); giveBall(p, 'restart'); return true; }
    case 'to5m': { toPlay(); const p = carrierOf(t0); giveBall(p, 'restart'); p.x = tryLineOf(p.team) - dirOf(p.team) * 51; p.y = G.CY; return true; }
    case 'knockOn': { toPlay(); const p = carrierOf(M.possession); emit('knockOn', { pid: p.id }); stop('KNOCK-ON', 1.4, () => scrum(1 - p.team, p.x, p.y, 'knockOn'), { call: 'KNOCK ON!', noHooter: true }); return true; }
    case 'scrum': scrum(t0, b.x, b.y, 'dev'); return true;
    case 'touch': { toPlay(); const t = M.possession; emit('touch', { team: 1 - t }); stop('TOUCH', 1.2, () => lineout(1 - t, clamp(b.x, G.X0 + 51, G.X1 - 51), b.y < G.CY ? 0 : 1), { call: 'TOUCH!', noHooter: true }); return true; }
    case 'lineout': lineout(t0, clamp(b.x, G.X0 + 51, G.X1 - 51), 0); return true;
    case 'penalty': { const off = P.find(p => p.team !== t0 && onField(p)); toPlay(); stop('PENALTY', 1.2, () => penalty(t0, b.x, b.y, 'dev'), { call: 'PENALTY!', noHooter: true }); emit('foul', { pid: off.id, kind: 'dev' }); return true; }
    case 'yellow': { toPlay(); const off = P.filter(p => p.team === 1 - M.possession && standing(p))[0]; if (!off) return false; emit('cheapUnseen', { pid: off.id }); giveCard(off, 'cheap'); stop('PENALTY', 1.4, () => penalty(1 - off.team, off.x, off.y, 'cheap'), { call: 'PENALTY!', noHooter: true }); return true; }
    case 'kickoff': startKickoff(t0); return true;
    case 'dropout': startKickoff(t0, 'dropout'); return true;
    case 'ruck': { toPlay(); const c = carrierOf(M.possession); giveBall(c, 'restart'); c.st = 'tackled'; c.stT = .5; TT.sp.startRuck(c); if (o.jackal) { M.ph.bar -= .5; M.ph.jackal = true; const j = P.find(p => p.team !== c.team && standing(p)); if (j) emit('jackal', { pid: j.id }); } return true; }
    case 'monsterHit': { toPlay(); const c = carrierOf(M.possession); giveBall(c, 'restart'); const h = P.filter(p => p.team !== c.team && standing(p)).sort((a, d) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(d.x - c.x, d.y - c.y))[0]; if (!h) return false; h.x = c.x + dirOf(c.team) * 10; h.y = c.y; h.facing = Math.atan2(c.y - h.y, c.x - h.x); c.evade = 0; c.fendT = 0; resolveTackle(h, c, 'big', 1, false); return true; }
    case 'powerup': TT.arc.spawnPowerup(o.kind || 'pie'); return true;
    case 'hazard': TT.arc.trigger(o.kind || M.venue.hazard); return true;
    case 'onFire': { const p = seat0 && seat0.pid >= 0 ? P[seat0.pid] : carrierOf(0); p.fire = 90; emit('onFire', { pid: p.id }); return true; }
    case 'thunder': { toPlay(); const c = carrierOf(o.team != null ? o.team : M.possession); giveBall(c, 'restart'); M.hype[c.team] = 100; startSuper(c, 'thunder'); return true; }
    case 'hurricane': { toPlay(); const c = carrierOf(M.possession); giveBall(c, 'restart'); const d = P.filter(p => p.team !== c.team && standing(p)).sort((a, e) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(e.x - c.x, e.y - c.y))[0]; if (!d) return false; M.hype[d.team] = 100; startSuper(d, 'hurricane'); return true; }
    case 'thunderTry': { toPlay(); const t = M.possession, c = carrierOf(t); giveBall(c, 'restart'); c.x = tryLineOf(t) - dirOf(t) * 200; c.y = G.CY + 30; M.hype[t] = 100; startSuper(c, 'thunder'); return true; }
    case 'onFireTry': { toPlay(); const t = M.possession, c = carrierOf(t); giveBall(c, 'restart'); c.fire = 90; emit('onFire', { pid: c.id }); c.x = tryLineOf(t) - dirOf(t) * 120; c.y = G.CY - 60; return true; }
    case 'dropGoal': { toPlay(); const t = M.possession, c = carrierOf(t); giveBall(c, 'restart'); c.x = tryLineOf(t) - dirOf(t) * 160; c.y = G.CY; c.facing = dirOf(t) > 0 ? 0 : PI; for (const p of P) if (p.team !== t && onField(p) && Math.hypot(p.x - c.x, p.y - c.y) < 60) p.x += dirOf(t) * 80; TT.sim.kick(c, .85, Object.assign(TT.blankIntent(), { mx: dirOf(t) })); return true; }
    case 'replay': TT.replay.lastT = -99; TT.replay.trigger('dev', (holder() || P[0]).id, true); return true;
    case 'hooter': M.clock = M.halfLen; return true;
    case 'half': M.half = 1; endHalf(); return true;
    case 'full': M.half = 2; M.hooter = true; M.suddenDeath = true; fullTime(); return true;
    case 'sudden': M.score[1] = M.score[0]; M.half = 2; M.suddenDeath = false; endHalf(); return true;
    case 'scoreHome': M.score[0] = Math.max(0, M.score[0] + (o.n || 5)); return true;
    case 'scoreAway': M.score[1] = Math.max(0, M.score[1] + (o.n || 5)); return true;
    case 'clock': M.clock = Math.max(0, M.clock + (o.n || -30)); return true;
  }
  return false;
};

TT.dev = {
  open: false, enabled: false, frozen: true, tab: 0, i: 0, scroll: 0, confirmReset: 0, view: {}, holdT: 0,
  TABS: ['TUNING', 'CHEATS', 'EVENTS', 'VIEW', 'JUMP'],
  CHEATS: [['god', 'God mode (my team)'], ['infTurbo', 'Infinite turbo'], ['hypeFull', 'Hype always full'], ['alwaysFire', 'Always ON FIRE'], ['refBlind', 'Ref blind'], ['refStrict', 'Ref strict'], ['cpuFrozen', 'CPU frozen'], ['noClock', 'No clock'], ['bigHeads', 'Big heads']],
  EVENTS: [['tryHome', 'Score a try (home)'], ['tryAway', 'Score a try (away)'], ['giveP1', 'Give P1 the ball'], ['to5m', 'Ball to their 5 m line'], ['knockOn', 'Knock-on > scrum'], ['touch', 'Touch > lineout'], ['penalty', 'Foul > penalty'], ['yellow', 'Yellow card'], ['kickoff', 'Kick-off'], ['dropout', '22 drop-out'], ['ruck', 'A ruck now'], ['monsterHit', 'Monster hit on carrier'],
    ['powerup:pie', 'Spawn MEAT PIE'], ['powerup:iron', 'Spawn IRON SHOULDERS'], ['powerup:boot', 'Spawn MEGA BOOT'], ['powerup:grease', 'Spawn GREASE JERSEY'], ['powerup:horn', 'Spawn AIR HORN'],
    ['hazard:chicken', 'Hazard: chicken'], ['hazard:flames', 'Hazard: flame jets'], ['hazard:lightning', 'Hazard: lightning'], ['hazard:mud', 'Hazard: mud'], ['onFire', 'ON FIRE for P1'], ['thunder', 'Thunder Run'], ['hurricane', 'Hurricane Hit'], ['replay', 'Replay last 5 s'], ['hooter', 'The hooter'], ['half', 'Skip to half-time'], ['full', 'Skip to full time'], ['sudden', 'Sudden death'],
    ['scoreHome:5', 'Home +5'], ['scoreHome:-5', 'Home -5'], ['scoreAway:5', 'Away +5'], ['scoreAway:-5', 'Away -5'], ['clock:-30', 'Clock -30 s']],
  VIEWS: [['shape', 'AI shape slots'], ['cone', "Ref's sight cone (always)"], ['offside', 'Offside lines (always)'], ['ranges', 'Tackle and fend ranges'], ['lanes', 'Pass lanes and receivers'], ['skel', 'Rig skeletons'], ['fps', 'Frame-rate readout'], ['slow', 'Slow motion (0.25x)'], ['state', 'State readout'], ['step', 'Frame step (□ while FROZEN)']],
  JUMPS: () => [['cup:r1', 'Round one match'], ['cup:qf', 'Quarter-final match'], ['cup:sf', 'Semi-final match'], ['cup:gf', 'Grand final match'], ['story:prologue', 'Cutscene: prologue'], ['story:r1', 'Cutscene: round one'], ['story:qf', 'Cutscene: quarter-final'], ['story:sf', 'Cutscene: semi-final'], ['story:gf', 'Cutscene: grand final'], ['story:victory', 'The victory'], ['story:third', 'The third half'], ['credits', 'The credits']].concat(TT.DRILLS.map(d => ['drill:' + d.id, 'Drill: ' + d.name]), [['session', 'Session-style match (75 s halves)'], ['title', 'Title screen']]),
  rows() {
    const t = this.TABS[this.tab];
    if (t === 'TUNING') return [{ kind: 'reset', label: this.confirmReset > 0 ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS' }].concat(TUNE.defs.map(d => ({ kind: 'slider', d, label: d.label })));
    if (t === 'CHEATS') return this.CHEATS.map(([k, l]) => ({ kind: 'toggle', k, label: l }));
    if (t === 'EVENTS') return this.EVENTS.map(([k, l]) => ({ kind: 'event', k, label: l }));
    if (t === 'VIEW') return this.VIEWS.map(([k, l]) => ({ kind: 'view', k, label: l }));
    return this.JUMPS().map(([k, l]) => ({ kind: 'jump', k, label: l }));
  },
  openPanel() { this.enabled = true; this.open = true; this.frozen = true; TT.game.timeScale = this.view.slow ? .25 : 1; },
  close() { this.open = false; },
  /** runs every match step, open or not: the cheats that act each step, the ` toggle */
  tick() {
    if (!M) return;
    const c = TT.devCheats || {};
    if (c.hypeFull) M.hype[0] = M.hype[1] = 100;
    if (c.alwaysFire) for (const p of M.players) if (p.team === 0) p.fire = Math.max(p.fire, 5);
    if (this.view.slow) TT.game.timeScale = .25;
  },
  update(dt) {
    const I = TT.game.input, rows = this.rows();
    this.confirmReset = Math.max(0, this.confirmReset - dt);
    if (I.pressed('cancel') || I.pressed('ci')) { this.close(); I.consumeAll(); return true; }
    if (I.pressed('tri')) this.frozen = !this.frozen;
    // the mouse: hover focuses, click a tab or a row, drag a slider
    const ptr = I.pointer && I.pointer(), click = I.clicked && I.clicked();
    if (ptr && this.geo) {
      const g = this.geo;
      if (click) { const tb = g.tabs.find(t => click[0] >= t[0] && click[0] < t[0] + t[2] && click[1] >= t[1] && click[1] < t[1] + 12); if (tb) { this.tab = tb[3]; this.i = 0; this.scroll = 0; } }
      const k = g.rows.find(rw => ptr[0] >= rw[0] && ptr[0] < rw[0] + rw[2] && ptr[1] >= rw[1] && ptr[1] < rw[1] + rw[3]);
      if (k && I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; this.i = k[4]; }
      if (click && k) { this.i = k[4]; const row = rows[this.i]; if (row.kind === 'slider') { const u = clamp((click[0] - k[5]) / k[6], 0, 1), d = row.d; TUNE.set(d.key, Math.round((d.min + u * (d.max - d.min)) / d.step) * d.step); } else this.activate(row); }
      if (I.down('mouseL') && k && rows[k[4]].kind === 'slider' && ptr[0] >= k[5]) { const d = rows[k[4]].d, u = clamp((ptr[0] - k[5]) / k[6], 0, 1); TUNE.set(d.key, Math.round((d.min + u * (d.max - d.min)) / d.step) * d.step); }
    }
    if (!this.frozen) return false;   // LIVE: the keys go to the match
    if (I.pressed('l1')) { this.tab = (this.tab + 4) % 5; this.i = 0; this.scroll = 0; }
    if (I.pressed('r1')) { this.tab = (this.tab + 1) % 5; this.i = 0; this.scroll = 0; }
    if (I.repeat('up')) this.i = (this.i + rows.length - 1) % rows.length;
    if (I.repeat('down')) this.i = (this.i + 1) % rows.length;
    const row = rows[this.i];
    if (row && row.kind === 'slider') {
      const d = row.d, held = I.down('left') || I.down('right'); this.holdT = held ? this.holdT + dt : 0;
      const mult = this.holdT > 1.5 ? 5 : 1;
      if (I.repeat('left')) TUNE.set(d.key, +(TUNE.base[d.key] - d.step * mult).toFixed(4));
      if (I.repeat('right')) TUNE.set(d.key, +(TUNE.base[d.key] + d.step * mult).toFixed(4));
      if (I.pressed('sq')) TUNE.reset(d.key);
    }
    if (I.pressed('x') || I.pressed('confirm')) { if (row) this.activate(row); }
    if (this.view.step && I.pressed('sq') && (!row || row.kind !== 'slider')) { const it = TT.control.collect(1 / 120); TT.sim.step(1 / 120, it); }
    I.consumeAll();
    return true;
  },
  activate(row) {
    TT.audio.sfx('confirm');
    if (row.kind === 'reset') { if (this.confirmReset > 0) { TUNE.reset(); this.confirmReset = 0; TT.game.note('ALL DEFAULTS RESTORED'); } else this.confirmReset = 2; }
    else if (row.kind === 'toggle') {
      const c = TT.devCheats = TT.devCheats || {}; c[row.k] = !c[row.k]; if (M) M.cheats[row.k] = c[row.k];
      if (row.k === 'bigHeads') TT.applyBigHeads();
    }
    else if (row.kind === 'event') { const [n, v] = row.k.split(':'); const o = {}; if (v != null) { if (isNaN(+v)) o.kind = v; else o.n = +v; } TT.force(n, o); this.frozen = false; }
    else if (row.kind === 'view') { this.view[row.k] = !this.view[row.k]; PR.dbg = this.view; if (row.k === 'slow') TT.game.timeScale = this.view.slow ? .25 : 1; if (row.k === 'fps') TT.settings.set && TT.settings.spec('fps') && TT.settings.set('fps', !!this.view.fps); }
    else if (row.kind === 'jump') { this.close(); TT.jump(row.k); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pw = Math.round(W * .45), x0 = W - pw, rows = this.rows(), vis = Math.max(6, Math.floor((H - 80) / 15));
      E.ui.box(g, x0, 0, pw, H, { bg: ['#0c1428', '#060a14'], border: '#40e0a0', alpha: .94 });
      E.font.text(g, 'DEV MODE', x0 + 8, 6, '#40e0a0', { outline: false, scale: 2 });
      E.font.text(g, this.frozen ? 'FROZEN' : 'LIVE', W - 8, 8, this.frozen ? '#80c0ff' : '#ff8060', { align: 'right', outline: false });
      const tabs = [];
      let tx = x0 + 6;
      this.TABS.forEach((t, k) => { const w = E.font.width(t, { font: 'tiny' }) + 8; E.ui.box(g, tx, 26, w, 12, { bg: k === this.tab ? '#2a6a50' : '#141c30', border: k === this.tab ? '#40e0a0' : '#2a3450', gradient: false }); E.font.text(g, t, tx + 4, 29, '#ffffff', { font: 'tiny', outline: false }); tabs.push([tx, 26, w, k]); tx += w + 3; });
      if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + vis) this.scroll = this.i - vis + 1;
      const geoRows = [];
      rows.slice(this.scroll, this.scroll + vis).forEach((row, j) => {
        const k = j + this.scroll, y = 44 + j * 15, on = k === this.i;
        if (on) E.ui.box(g, x0 + 4, y - 2, pw - 8, 14, { bg: '#1e3a5a', border: '#ffe060', gradient: false });
        E.font.text(g, row.label, x0 + 8, y + 1, on ? '#ffffff' : '#c8d0e8', { outline: false, font: row.kind === 'slider' ? 'tiny' : undefined });
        let sx = 0, sw = 0;
        if (row.kind === 'slider') {
          const d = row.d, v = TUNE.base[d.key], u = (v - d.min) / (d.max - d.min); sw = Math.round(pw * .34); sx = W - sw - 46;
          px.rect(g, sx, y + 3, sw, 4, '#2a3450'); px.rect(g, sx, y + 3, Math.round(sw * u), 4, Math.abs(v - d.value) > 1e-9 ? '#ffb040' : '#40e0a0');
          px.rect(g, sx + Math.round(sw * (d.value - d.min) / (d.max - d.min)), y + 1, 1, 8, '#ffffff');
          E.font.text(g, String(+v.toFixed(3)), W - 8, y + 1, '#ffffff', { align: 'right', font: 'tiny', outline: false });
        } else if (row.kind === 'toggle' || row.kind === 'view') { const onv = row.kind === 'toggle' ? (TT.devCheats || {})[row.k] : this.view[row.k]; E.font.text(g, onv ? 'ON' : 'OFF', W - 10, y + 1, onv ? '#40e0a0' : '#6a7490', { align: 'right', outline: false }); }
        geoRows.push([x0 + 4, y - 2, pw - 8, 14, k, sx, sw]);
      });
      this.geo = { tabs, rows: geoRows };
      if (this.frozen) { TT.prompt(g, '{b:l1}{b:r1} TABS  {b:x} PICK  {b:sq} RESET', x0 + pw / 2, H - 26, TT.game.input); TT.prompt(g, '{b:tri} GO LIVE  {b:ci} CLOSE', x0 + pw / 2, H - 13, TT.game.input); }
      else TT.prompt(g, '{b:tri} FREEZE  {b:ci} CLOSE  MOUSE DRAGS', x0 + pw / 2, H - 13, TT.game.input);
      if (this.view.state && M) E.font.text(g, M.phase + ' ' + M.sub + ' t' + M.phaseT.toFixed(1) + ' poss ' + M.possession + ' ball ' + M.ball.st, 6, H - 60, '#40e0a0', { font: 'tiny', outline: '#000' });
    });
    // the world overlays
    if (!M) return;
    const v = this.view;
    if (v.shape) for (const p of M.players) if (onField(p) && p.tx != null) { r.groundRing(p.tx, p.ty, 3, M.kits[p.team].cloth, .9); }
    if (v.ranges) for (const p of M.players) if (onField(p)) { r.groundRing(p.x, p.y, TUNE.v.tackleRange, '#ff8060', .3); }
    if (v.lanes) { const h = holder(); if (h) for (const q of receivers(h, null)) r.groundRing(q.x, q.y, 6, '#60ff80', .8); }
    if (v.cone) PR.dbg = v;
    if (v.skel) for (const p of M.players) if (onField(p) && PR.rigs[p.id]) PR.rigs[p.id].debug(r);
  }
};
TT.applyBigHeads = () => { const on = (TT.devCheats && TT.devCheats.bigHeads) || TT.settings.bigHeads === 'On'; for (const rig of PR.rigs) { if (!rig.o) continue; rig.o.headR0 = rig.o.headR0 || rig.o.headR; rig.o.headR = rig.o.headR0 * (on ? 1.8 : 1); } };

/* ==== 60-net.js ==== */
/* ---- ONLINE: AI Hub shared-world sessions (lib/hub/README.md). The host's copy runs the one match; every other copy
 * sends what its player does and draws what the host sends. Outside a session nothing here runs ---- */
const ST_CODES = ['run', 'pass', 'kick', 'sidestep', 'spin', 'fend', 'charge', 'tackling', 'diving', 'tackled', 'ground', 'stunned', 'getup', 'launched', 'ruck', 'scrum', 'lift', 'celebrate', 'binned', 'off', 'held'];
const BALL_ST = ['held', 'air', 'loose', 'dead', 'placed'];
const PH_CODES = ['walkout', 'kickoff', 'play', 'ruck', 'scrum', 'lineout', 'penalty', 'setkick', 'try', 'stop', 'half', 'full'];
const BTN = ['x', 'sq', 'ci', 'tri', 'l1', 'r1', 'turbo'];
const FWD_EVENTS = new Set(['whistle', 'kickoff', 'pass', 'catch', 'kick', 'tackle', 'bigHit', 'monsterHit', 'brokenTackle', 'sidestep', 'spin', 'fend', 'dummy', 'lineBreak', 'interception', 'knockOn', 'forwardPass', 'jackal', 'ruckTurnover', 'scrum', 'scrumCall', 'scrumEngage', 'lineoutWon', 'lineoutSteal', 'notStraight', 'try', 'conversion', 'penaltyGoal', 'convMiss', 'penMiss', 'doink', 'dropGoal', 'cheapUnseen', 'penalty', 'freeKick', 'card', 'refDown', 'onFire', 'superStart', 'powerupTake', 'chicken', 'flame', 'lightning', 'hooter', 'halftime', 'fulltime', 'land', 'refCall']);
TT.net = {
  active: false, isHost: false, server: false, me: -1, info: null, card: null, started: false, ended: false, finished: false, waiting: false,
  seq: 0, sendT: 0, snapT: 0, evT: 0, evBuf: [], lastSnap: 0, remote: {}, pressLog: [], seen: {},
  /** at load: connect; null means no hub (the game runs on its own) */
  async connect() {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true });
    if (!info) return null;
    this.active = true; this.info = info; this.isHost = !!info.isHost; this.server = !!info.server; this.me = info.me;
    TT.cfg.session = true;
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => { this.started = true; TT.game.go('match', this.matchData()); });
    AIHub.on('message', (d, from) => this.onMessage(d, from));
    AIHub.on('leave', d => this.onLeave(d));
    AIHub.on('time-up', () => { if (this.isHost) this.finish(); });
    AIHub.on('end', () => this.onEnd());
    // the setup, the same on every copy without a message: the Mudlarks against one of four rivals, at a venue
    const rng = AIHub.rng('setup');
    const rivals = ['bad', 'gul', 'irn', 'meg'], venues = ['park', 'docks', 'furnace', 'dome'];
    this.setup = { away: rivals[Math.floor(rng() * 4)], venue: venues[Math.floor(rng() * 4)] };
    const lim = info.limitMs || 0;
    this.halfLen = lim ? Math.max(20, Math.min(75, (lim / 1000 - 40) / 2.6)) : 75;
    return info;
  },
  teamOf(id) { const ids = this.info.players.map(p => p.id); return ids.indexOf(id) % 2; },
  matchData() {
    const seats = this.info.players.map((p, i) => {
      const team = i % 2, local = p.id === this.me && !this.server;
      return { kind: this.isHost ? (local ? 'local' : 'remote') : (local ? 'local' : 'remote'), input: local ? TT.game.input : null, team, label: TT.ascii(p.name).slice(0, 8).toUpperCase(), color: p.color || E.PLAYER_COLORS[i], netId: p.id };
    });
    return { home: 'mud', away: this.setup.away, venue: this.setup.venue, halfLength: this.halfLen, session: true, seed: Math.floor(AIHub.rng('match')() * 1e6), seats, skipIntro: true };
  },
  matchStarted() {
    TT.cfg.noReplay = true;
    M.cheats = M.cheats || {};
    // the clients mirror the host: their copy is drawn from snapshots, never stepped
    if (!this.isHost) M.mirror = true;
    this.seq = 0; this.evBuf = [];
    if (!this.hooked) { this.hooked = true; TT.bus.on('*', (d, n) => { if (this.active && this.isHost && FWD_EVENTS.has(n) && !this.ended) this.evBuf.push([n, this.slim(d)]); }); }
  },
  slim(d) { const o = {}; for (const k in d) { const v = d[k]; if (typeof v === 'number') o[k] = Math.round(v * 10) / 10; else if (typeof v === 'string' || typeof v === 'boolean') o[k] = v; } return o; },
  /* ---- the host ---- */
  hostStep(dt) {
    if (!this.active || this.ended) return;
    if (AIHub.time() < 0) { M.frozen = true; return; } M.frozen = false;
    this.snapT -= dt; this.evT -= dt;
    if (this.snapT <= 0) { this.snapT = 1 / 12; AIHub.send(this.snapshot(), { reliable: false }); }
    if (this.evT <= 0 && this.evBuf.length) { this.evT = .2; AIHub.send({ t: 'e', l: this.evBuf.splice(0, 30) }, { reliable: true }); }
    if (M.over && !this.finished && M.phase === 'full' && M.phaseT > 2) this.finish();
  },
  snapshot() {
    const r2 = v => Math.round(v);
    const P = M.players.map(p => [r2(p.x), r2(p.y), r2(p.z), Math.round(p.facing * 100), ST_CODES.indexOf(p.st), Math.round(p.stT * 50), (p.fire > 0 ? 1 : 0) | (p.superK === 'thunder' ? 2 : 0) | (p.superK === 'hurricane' ? 4 : 0) | (p.turboOn ? 8 : 0), p.ctl, Math.round(p.turbo * 99), r2(p.vx), r2(p.vy)]);
    const b = M.ball, ph = M.ph || {};
    const q = { bar: ph.bar != null ? +ph.bar.toFixed(2) : undefined, sub: M.sub, team: ph.team, needle: ph.needle != null ? +ph.needle.toFixed(2) : undefined, call: ph.call, choice: ph.choice, power: ph.power != null ? +ph.power.toFixed(2) : undefined, aim: ph.aim, x: ph.x != null ? r2(ph.x) : undefined, y: ph.y != null ? r2(ph.y) : undefined, ty: ph.ty, label: ph.label, result: ph.result, kicker: ph.kicker, kx: ph.kx != null ? r2(ph.kx) : undefined, ky: ph.ky != null ? r2(ph.ky) : undefined, tl: ph.tl, D: ph.D != null ? r2(ph.D) : undefined, need: ph.need, clock: ph.clock != null ? Math.ceil(ph.clock) : undefined, opts: M.phase === 'penalty' ? ph.opts.map(o => [o[0], o[1], '']) : undefined, free: ph.free, kind: ph.kind, human: ph.human, sway: 0, cx: ph.cx != null ? r2(ph.cx) : undefined, pods: ph.pods, s: ph.s, holding: ph.holding, att: ph.att, def: ph.def };
    return { t: 's', at: Math.round(AIHub.time()), ph: PH_CODES.indexOf(M.phase), pt: Math.round(M.phaseT * 10), c: Math.round(M.clock * 10), h: M.half, hoo: M.hooter ? 1 : 0, sd: M.suddenDeath ? 1 : 0, sc: M.score, hy: M.hype.map(Math.round), b: [r2(b.x), r2(b.y), r2(b.z), BALL_ST.indexOf(b.st), b.holder], r: [r2(M.ref.x), r2(M.ref.y), Math.round(M.ref.facing * 100), M.ref.down > 0 ? 1 : 0], P, q, pu: M.pu ? [M.pu.kind, r2(M.pu.x), r2(M.pu.y), r2(M.pu.z)] : 0, sv: TT.seats.map(s => s.pid), ov: M.over ? 1 : 0, w: M.winner };
  },
  finish() {
    if (this.finished || !this.isHost) return; this.finished = true;
    const ids = this.info.players.map(p => p.id).filter(id => !this.left || !this.left[id]);
    const side = id => this.teamOf(id), w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    const standings = w < 0 ? [ids] : [ids.filter(id => side(id) === w), ids.filter(id => side(id) !== w)].filter(a => a.length);
    const scores = {}, stats = {};
    for (const id of ids) { const t = side(id); scores[id] = M.score[t]; stats[id] = { Tries: M.stats[t].tries, Tackles: M.stats[t].tackles, 'Big hits': M.stats[t].bigHits, Metres: TT.metres(M.stats[t].metres) }; }
    const awards = [];
    const best = M.players.filter(p => p.team === Math.max(0, w)).sort((a, b) => (b.tries * 10 + b.tackles) - (a.tries * 10 + a.tackles))[0];
    if (best) { const seat = TT.seats.find(s => s.team === best.team && s.netId != null); if (seat) awards.push({ id: seat.netId, title: 'Player of the Match', detail: TT.ascii(best.data.nick) }); }
    try { AIHub.send({ t: 's', ...this.snapshot(), over: 1 }, { reliable: true }); } catch (e) { /* the hub may be closing */ }
    AIHub.finish({ standings, scores, stats, awards, won: undefined });
  },
  onLeave(d) {
    this.left = this.left || {}; this.left[d.id] = true;
    const s = TT.seats.find(x => x.netId === d.id); if (s) { s.kind = 'script'; s.intent = null; s.pid = -1; TT.seats.splice(TT.seats.indexOf(s), 1); }
  },
  onEnd() {
    this.ended = true; this.active = false;
    try { TT.game.audio.music(null); TT.game.audio.mute && TT.game.audio.setVolume(0); } catch (e) { /* none */ }
    TT.cfg.muted = true;
    if (M) M.frozen = true;
  },
  /* ---- the messages ---- */
  onMessage(d, from) {
    if (!d || this.ended) return;
    if (d.t === 'i' && this.isHost) {
      const s = TT.seats.find(x => x.netId === from); if (!s) return;
      const it = TT.blankIntent(); it.mx = (d.m[0] || 0) / 100; it.my = (d.m[1] || 0) / 100;
      for (let k = 0; k < BTN.length; k++) if (d.h & (1 << k)) { if (BTN[k] === 'turbo') it.turbo = true; else it.h[BTN[k]] = true; }
      // presses of the last second, each once (by its id)
      const seen = this.seen[from] = this.seen[from] || {};
      for (const [id, a] of d.p || []) if (!seen[id]) { seen[id] = 1; const k = BTN[a]; if (k) { it.p[k] = true; if (k === 'l1' || k === 'r1' || k === 'ci' || k === 'x') it.r[k] = !it.h[k]; } }
      for (const a of ['up', 'down', 'left', 'right']) if (d.mv && d.mv.includes(a[0])) it.p[a] = true;
      // released buttons this report
      const prev = s.lastHeld || 0; for (let k = 0; k < BTN.length; k++) if ((prev & (1 << k)) && !(d.h & (1 << k))) it.r[BTN[k]] = true;
      s.lastHeld = d.h; s.intent = it;
      if (d.pos && d.pid === s.pid && M.phase === 'play') {
        const p = M.players[s.pid];
        if (p && (p.st === 'run' || p.st === 'charge')) { const now = M.t, el = Math.min(.3, now - (s.posT || now - 1 / 15)); s.posT = now; const max = TUNE.v.runSpeed * TUNE.v.turboMult * 1.3 * el + 20, dx = d.pos[0] - p.x, dy = d.pos[1] - p.y, dd = Math.hypot(dx, dy); if (dd > 0) { const k = Math.min(1, max / dd); p.x += dx * k; p.y += dy * k; } }
      }
      return;
    }
    if (d.t === 's' && !this.isHost) { this.applySnap(d); return; }
    if (d.t === 'e' && !this.isHost) { for (const [n, data] of d.l) TT.bus.emit(n, data); return; }
  },
  /* ---- a client: its intents out, the host's world in ---- */
  clientStep(dt) {
    if (!this.active || this.ended) return;
    const I = TT.game.input, mv = I.move(), gnd = TT.game.view.screenDirToGround(mv[0], mv[1]);
    let held = 0; for (let k = 0; k < BTN.length; k++) if (I.down(BTN[k])) held |= 1 << k;
    for (let k = 0; k < BTN.length; k++) if (I.pressed(BTN[k])) this.pressLog.push([++this.seq, k, M.t]);
    let dirs = ''; for (const a of ['up', 'down', 'left', 'right']) if (I.pressed(a)) dirs += a[0];
    if (dirs) this.pendingDirs = (this.pendingDirs || '') + dirs;
    this.pressLog = this.pressLog.filter(p => M.t - p[2] < 1);
    this.sendT -= dt;
    if (this.sendT <= 0) { this.sendT = 1 / 15; AIHub.send({ t: 'i', s: this.seq, m: [Math.round(gnd[0] * 100), Math.round(gnd[1] * 100)], h: held, p: this.pressLog.map(p => [p[0], p[1]]), mv: this.pendingDirs || '', pos: this.ownPos || undefined, pid: this.ownPid }, { reliable: false }); this.pendingDirs = ''; }
    // client-side feel: our own player runs at once from our own stick while he is free-running; the host takes it
    const me = TT.seats.find(x => x.kind === 'local'), p = me && me.pid >= 0 ? M.players[me.pid] : null;
    this.ownPid = p ? p.id : -1;
    if (p && M.phase === 'play' && (p.st === 'run' || p.st === 'charge')) {
      const top = TUNE.v.runSpeed * (.8 + .04 * statOf(p, 'SPD')) * (I.down('turbo') && p.turbo > 0 ? TUNE.v.turboMult : 1);
      p.vx = TT.approach(p.vx, gnd[0] * top, TUNE.v.accel * dt); p.vy = TT.approach(p.vy, gnd[1] * top, TUNE.v.accel * dt);
      p.x = clamp(p.x + p.vx * dt, G.DEAD[0] - 40, G.DEAD[1] + 40); p.y = clamp(p.y + p.vy * dt, G.Y0 - 40, G.Y1 + 44);
      if (Math.hypot(gnd[0], gnd[1]) > .15) p.facing = Math.atan2(gnd[1], gnd[0]);
      this.ownFree = true; this.ownPos = [Math.round(p.x), Math.round(p.y)];
    } else { this.ownFree = false; this.ownPos = null; }
    M.t += dt; M.phaseT += dt;
    this.waiting = AIHub.time() > 1000 && performance.now() - this.lastSnap > 1000;
  },
  applySnap(d) {
    if (d.at < (this.lastAt || -1e9)) return; this.lastAt = d.at; this.lastSnap = performance.now();
    const ph = PH_CODES[d.ph] || 'play';
    if (M.phase !== ph) { M.phase = ph; M.phaseT = d.pt / 10; }
    M.clock = d.c / 10; M.half = d.h; M.hooter = !!d.hoo; M.suddenDeath = !!d.sd; M.score = d.sc; M.hype = d.hy; M.over = !!d.ov; M.winner = d.w;
    const q = d.q || {}; M.ph = Object.assign({}, q); M.sub = q.sub || ''; if (M.ph.subT == null) M.ph.subT = 0;
    if (ph === 'kickoff' && !M.ph.aim) M.ph.aim = [G.CX, G.CY];
    d.P.forEach((a, i) => { const p = M.players[i]; if (!p) return; const own = i === this.ownPid && this.ownFree && ST_CODES[a[4]] === 'run' && Math.hypot(p.x - a[0], p.y - a[1]) < 48; if (own) { p.x = lerp(p.x, a[0], .08); p.y = lerp(p.y, a[1], .08); } else { p.x = a[0]; p.y = a[1]; } p.z = a[2]; p.facing = a[3] / 100; const st = ST_CODES[a[4]] || 'run'; if (p.st !== st) p.st = st; p.stT = a[5] / 50; p.fire = a[6] & 1 ? 1 : 0; p.superK = a[6] & 2 ? 'thunder' : a[6] & 4 ? 'hurricane' : ''; p.turboOn = !!(a[6] & 8); p.ctl = a[7]; p.turbo = a[8] / 99; if (!own) { p.vx = a[9]; p.vy = a[10]; } });
    const b = M.ball; b.x = d.b[0]; b.y = d.b[1]; b.z = d.b[2]; b.st = BALL_ST[d.b[3]] || 'dead'; b.holder = d.b[4];
    const r = M.ref; r.x = d.r[0]; r.y = d.r[1]; r.facing = d.r[2] / 100; r.down = d.r[3] ? 1 : 0;
    M.pu = d.pu ? { kind: d.pu[0], x: d.pu[1], y: d.pu[2], z: d.pu[3], landed: d.pu[3] < 1, t: 0 } : null;
    if (d.sv) d.sv.forEach((pid, i) => { if (TT.seats[i]) TT.seats[i].pid = pid; });
  },
  /** the session's overlays: the countdown, the end */
  draw(r) {
    r.overlay(g => {
      const t = AIHub.time();
      if (t < 0 && t > -4000) E.font.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H / 2 - 30, { align: 'center', scale: 5, colors: ['#ffffff', '#ffe08a', '#ff8a20'] });
      if (this.ended) { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#202030')); E.font.title(g, 'FULL TIME', r.W / 2, r.H / 2 - 20, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a'] }); }
    });
  }
};

/* ---- the game's own card: the venue at dusk, both teams, each human's name in the seat colour, the controls ---- */
TT.scenes.card = {
  view: 'broadcast', views: ['broadcast'], input: TT.KEYS, res: 'ps1', touch: [], camera: false, pausable: false,
  enter(d) {
    this.demo = d && d.demo;
    this.t = 0; this.answered = false;
    const setup = TT.net.setup || { away: 'gul', venue: 'docks' };
    TT.cfg.quietComm = true;
    TT.startMatch({ home: 'mud', away: setup.away, venue: setup.venue, seed: 3, attract: true, backdrop: true, skipIntro: true, seats: [] });
    TT.cfg.quietComm = false;
    TT.game.lights.enabled = true; TT.game.lights.ambient = .66;
    TT.audio.music('title');
  },
  update(dt) {
    this.t += dt;
    if (M) { TT.pres.update(dt, M); TT.game.focus(G.CX, G.CY, 8); }
    const I = TT.game.input, c = I.clicked && I.clicked();
    if (!this.demo && typeof AIHub !== 'undefined') {
      if (I.pressed('confirm') || I.pressed('x') || I.pressed('start') || (c && this.readyBtn && c[0] >= this.readyBtn[0] && c[0] < this.readyBtn[0] + this.readyBtn[2] && c[1] >= this.readyBtn[1] && c[1] < this.readyBtn[1] + this.readyBtn[3])) AIHub.answer('ready');
      if (I.pressed('tri') || (typeof document !== 'undefined' && TT.keyM) || (c && this.moreBtn && c[0] >= this.moreBtn[0] && c[0] < this.moreBtn[0] + this.moreBtn[2] && c[1] >= this.moreBtn[1] && c[1] < this.moreBtn[1] + this.moreBtn[3])) { TT.keyM = false; AIHub.answer('more'); }
    }
  },
  draw(r) {
    if (M) TT.pres.drawWorld(r, M);
    r.overlay(g => {
      const W = r.W, H = r.H, info = TT.net.info || { players: [{ id: 0, name: 'PLAYER ONE', color: '#e8443a' }, { id: 1, name: 'PLAYER TWO', color: '#3b82f6' }] }, card = TT.net.card || { left: 15000, ready: [] };
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, W, H, '#202848'));
      TT.logo(g, W, 6, 2);
      const away = TT.teamById((TT.net.setup || {}).away || 'gul');
      E.font.text(g, 'MUDDINGTON MUDLARKS  VS  ' + away.name, W / 2, 46, '#ffe8c0', { align: 'center', outline: '#000' });
      E.font.text(g, 'HOW TO WIN: score more points than the other team', W / 2, 58, '#ffffff', { align: 'center', outline: '#000' });
      info.players.forEach((p, i) => {
        const x = i % 2 ? W / 2 + 20 : W / 2 - 150, y = 74 + Math.floor(i / 2) * 22, ready = (card.ready || []).includes(p.id);
        E.ui.box(g, x, y, 130, 18, { bg: ['#1a2238', '#0c1020'], border: p.color, alpha: .92 });
        E.font.text(g, TT.ascii(p.name).slice(0, 14), x + 6, y + 6, p.color, { outline: false });
        E.font.text(g, (i % 2 ? 'AWAY' : 'HOME') + (ready ? ' ★' : ''), x + 124, y + 6, ready ? '#80ff90' : '#a8b0c8', { align: 'right', font: 'tiny', outline: false });
      });
      const I = TT.game.input, lines = ['{b:up}{b:down}{b:left}{b:right} RUN   {b:turbo} TURBO', '{b:l1}{b:r1} PASS (BACKWARDS!)   {b:x} STEP / TACKLE', '{b:sq} FEND / DIVE   {b:ci} KICK / SWITCH   {b:tri} SUPER'];
      lines.forEach((l, i) => TT.prompt(g, l, W / 2, 124 + i * 13, I));
      const left = card.left == null ? null : Math.ceil(card.left / 1000);
      E.font.text(g, card.paused ? 'PAUSED: players asked for more time' : card.starting ? 'STARTING...' : left != null ? 'STARTS IN ' + left : '', W / 2, 168, '#ffe08a', { align: 'center', outline: '#000', scale: 2 });
      const bw = 96; this.readyBtn = [W / 2 - bw - 6, H - 34, bw, 20]; this.moreBtn = [W / 2 + 6, H - 34, bw, 20];
      E.ui.box(g, ...this.readyBtn, { bg: ['#2a5a20', '#14300c'], border: '#80ff90' }); TT.prompt(g, '{b:confirm} READY', this.readyBtn[0] + bw / 2, H - 28, I);
      E.ui.box(g, ...this.moreBtn, { bg: ['#4a3a10', '#2a2008'], border: card.asked ? '#ffe060' : '#a08040' }); TT.prompt(g, '{b:tri} OR M: MORE TIME', this.moreBtn[0] + bw / 2, H - 28, I);
    });
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'KeyM' && TT.game && TT.game.scene === TT.scenes.card) TT.keyM = true; });

/* ==== 90-start.js ==== */
/* ---- START ---- */

const SESSION = typeof AIHub !== 'undefined' && AIHub.active;
TT.cfg.session = !!SESSION;
const SETTINGS = [
  { key: 'glyphs', group: 'Display', label: 'Controller buttons', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], apply: (g, v) => { for (const p of g.players || [g.input]) p.glyphs = v; } },
  { key: 'uiScale', group: 'Display', label: 'TV text size', options: ['Large', 'Normal'], value: 'Large', apply: (g, v) => { if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('tt-normal', v === 'Normal'); } },
  { key: 'camera', group: 'Display', label: 'Camera', options: ['Broadcast', 'High', 'Overhead'], value: 'Broadcast', help: 'R3 or V cycles them in play' },
  { key: 'difficulty', label: 'Difficulty', options: ['Pro', 'Rookie', 'Legend'], value: 'Pro', help: 'The CPU teams (each cup opponent shifts it a step)' },
  { key: 'halves', label: 'Half length', options: ['2 min', '3 min', '4 min', '5 min'], value: '2 min', help: 'Running clock; the TV clock shows 7:00' },
  { key: 'autoSwitch', label: 'Auto-switch', options: ['Assisted', 'Full', 'Manual'], value: 'Assisted', help: 'Who you control on defence' },
  { key: 'passAssist', label: 'Pass assist', options: ['On', 'Off'], value: 'On', help: 'Off: a pass with nobody that side is a dummy' },
  { key: 'turboMode', label: 'Turbo', options: ['Hold', 'Toggle'], value: 'Hold' },
  { key: 'commentary', label: 'Commentary', options: ['On', 'Text only', 'Off'], value: 'On' },
  { key: 'replays', label: 'Replays', options: ['Big moments', 'All tries', 'Off'], value: 'Big moments' },
  { key: 'refCone', label: "Show the ref's view", options: ['On', 'Off'], value: 'On' },
  { key: 'bigHeads', label: 'Big heads (after the cup)', options: ['Off', 'On'], value: 'Off', apply: () => { if (!TT.unlocks().bigHeads && TT.settings.bigHeads === 'On') TT.settings.bigHeads = 'Off'; TT.applyBigHeads && TT.applyBigHeads(); } },
  { key: 'crowd', group: 'Sound', label: 'Crowd volume', type: 'slider', value: .8 }
];
const game = TT.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', views: TT.VIEW_IDS, input: TT.KEYS, id: 'thugby-turbo', bg: '#06060c',
  corner: SESSION ? false : undefined, autoPause: SESSION ? false : undefined, fullscreen: SESSION ? false : undefined,
  menu: SESSION ? { items: [], settings: SETTINGS, quit: false, controls: { mouseL: false, view: 'Camera view' } } : {
    items: [['Restart match', () => { if (M && TT.mdata && !TT.mdata.drill) { game.resume(); game.go('match', Object.assign({}, TT.mdata, { seed: Date.now() & 0xffff })); } else if (M && M.drill) { game.resume(); TT.drills.reset(M); } }], ['DEV MODE', () => { game.resume(); TT.dev.openPanel(); }]],
    settings: SETTINGS, quit: 'title',
    controls: { x: 'Sidestep / Tackle', sq: 'Fend / Dive tackle', ci: 'Kick / Switch to ball', tri: 'Super', l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo', view: 'Camera view (Show me in drills)', mouseL: false }
  }
});
TT.settings = game.settings;
TT.audio.init(game);
TT.comm.init(game);
TT.fx.install();
TUNE.load();
// the dev panel's key, once dev mode has been opened
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'Backquote' && TT.dev.enabled && game.scene === TT.scenes.match) { if (TT.dev.open) TT.dev.close(); else TT.dev.openPanel(); } });
// glyphs on joiners too
const _add = game.addPlayer.bind(game); game.addPlayer = o => { const q = _add(o); if (q) q.glyphs = TT.settings.glyphs; return q; };
game.input.glyphs = TT.settings.glyphs;
// the match's own step also runs the dev cheats
const _mu = TT.scenes.match.update; TT.scenes.match.update = function (dt) { TT.dev.tick(); return _mu.call(this, dt); };

/* ---- game.debug: tests, tools/check.mjs and the attract director read and drive the game through it ---- */
game.debug = {
  snapshot() {
    const sc = Object.keys(TT.scenes).find(k => TT.scenes[k] === game.scene) || null;
    if (!M) return { scene: sc };
    return { scene: sc, phase: M.phase, sub: M.sub, half: M.half, clock: +M.clock.toFixed(2), score: M.score.slice(), hype: M.hype.map(Math.round), possession: M.possession,
      ball: { x: Math.round(M.ball.x), y: Math.round(M.ball.y), z: Math.round(M.ball.z), state: M.ball.st, holder: M.ball.holder },
      players: M.players.map(p => ({ id: p.id, team: p.team, role: p.role, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), st: p.st, ctl: p.ctl })),
      ref: { x: Math.round(M.ref.x), y: Math.round(M.ref.y), facing: +M.ref.facing.toFixed(2), down: M.ref.down > 0 }, cards: M.cards.length, powerup: M.pu && M.pu.kind, hazards: M.hazards.map(h => h.kind),
      lastEvents: M.events.slice(-8).map(e => e[1]), cup: TT.cup && { round: TT.cup.round, results: TT.cup.results }, attract: !!M.o.attract, dev: { open: TT.dev.open }, session: TT.cfg.session, replay: TT.replay.playing, drill: M.drill && { id: M.drill.id, done: M.drill.done, n: M.drill.n }, watchdogs: M.watchdogs, over: M.over };
  },
  teleport(id, x, y) { const p = M.players[id]; p.x = x; p.y = y; }, give(id) { TT.sim.giveBall(id, 'restart'); }, force: (n, o) => TT.force(n, o),
  tune: (k, v) => TUNE.set(k, v), seed: n => { M.rng = E.rng(n); }, step: s => game.advance(s), drill: id => TT.jump('drill:' + id), go: (s, d) => game.go(s, d)
};
window.__thugby = { game, TT, get M() { return M; } };

/* ---- start: the title (or a deep link: #match, #match/<venue>, #cup, #training, #training/<n>, #attract, #records, #about, #credits, #card) ---- */
const scenes = TT.scenes;
const [link, part] = (typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '').split('/');
let first = 'title', data;
if (!SESSION) {
  if (link === 'match') { first = 'match'; data = { home: 'mud', away: 'gul', venue: part || 'docks', seats: [{ input: game.input, team: 0 }] }; }
  else if (link === 'training' && part) { first = 'match'; data = { drill: TT.DRILLS[(+part - 1) || 0].id, home: 'mud', away: 'bad', venue: 'park', weather: 'clear', time: 'day', seats: [{ input: game.input, team: 0 }], seed: 5 }; }
  else if (link === 'attract') { first = 'match'; data = { attract: true, home: 'gul', away: 'irn', venue: 'furnace', seed: 11 }; }
  else if (link === 'card') { first = 'card'; data = { demo: true }; }
  else if (link === 'cup') { TT.cupLoad(); first = 'cup'; }
  else if (scenes[link] && ['menu', 'training', 'records', 'about', 'credits', 'title'].includes(link)) first = link;
}
game.start({
  scenes, scene: SESSION ? 'card' : first, data,
  boot: { title: 'THUGBY TURBO', version: '1.0', steps: [
    ['Mowing the stripes', () => { for (const v of TT.VENUES) TT.pres.map(v, TT.TEAMS[0].home); }],
    ['Inflating the oval balls', () => { TT.recordsInit(); }],
    ['Warming the pies', () => { TT.castRig('gristle'); TT.castRig('barry'); TT.castRig('ros'); }],
    ['Bribing the referee', () => { if (SESSION) TT.net.connect().then(info => { if (!info) { TT.cfg.session = false; game.go('title'); } else { AIHub.ready(); } }).catch(() => game.go('title')); }]
  ], messages: ['Checking for knock-ons', 'Hiding the chicken', 'Polishing the Mega Cup'] }
});

})();
