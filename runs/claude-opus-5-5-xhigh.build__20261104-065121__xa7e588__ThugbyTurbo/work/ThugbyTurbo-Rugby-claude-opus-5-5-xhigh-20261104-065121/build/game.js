/* THUGBY TURBO: over-the-top arcade rugby sevens, on the my-3D2dge engine. Built by build.mjs from src/. */
(() => {
'use strict';

/* ==== 00-core.js ==== */
/* THUGBY TURBO — the core loop, in one sentence:
 * Run at their line, pass it backwards, smash through or step round them, ground it over the line and kick the
 * conversion, while seven lunatics in the other colours try to flatten you, and the referee looks the other way.
 *
 * Layers: devices, AI brains, network intents, test scripts and the attract director all produce INTENTS (one per
 * on-field player, per step); the MATCH SIMULATION reads only intents and writes only its own plain state; the
 * PRESENTATION (rigs, camera, HUD, effects, audio, commentary) reads that state and the event bus. So the same
 * presentation draws a live match, an instant replay, an online client and the attract demo, and the same simulation
 * runs headless for tests and as the host of an online match.
 */
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const TT = { scenes: {} };
const HEADLESS = typeof document === 'undefined' || !document.getElementById;
TT.cfg = { present: !HEADLESS, headless: HEADLESS };
const PI = Math.PI, TAU = Math.PI * 2;

/* ---- pitch geometry (world units; 16 = one tile; display metres = units / 10.24, so the field is "100 m") ---- */
const T = 16;
const G = TT.G = {
  T, COLS: 86, ROWS: 48,
  X0: 176, X1: 1200, CX: 688,          // try lines and halfway
  Y0: 96, Y1: 672, CY: 384,            // touchlines and the centre
  ING: 96,                             // in-goal depth
  DX0: 80, DX1: 1296,                  // dead-ball lines
  L22: 225, L10: 102, L5: 51, L15: 154,
  POSTW: 29, BAR: 34, POSTH: 120,      // the posts: uprights at CY ± POSTW, crossbar height, upright tops
  M: 10.24                             // units per metre
};
G.W = G.X1 - G.X0; G.H = G.Y1 - G.Y0;
const metres = u => u / G.M;
TT.metres = metres;

/* ---- the event bus: the simulation emits; commentary, audio, hype, stats, replays, banners, records listen ---- */
TT.bus = {
  h: {},
  on(name, fn) { (this.h[name] || (this.h[name] = [])).push(fn); return () => { this.h[name] = this.h[name].filter(f => f !== fn); }; },
  emit(name, data) {
    const l = this.h[name]; if (l) for (const f of l.slice()) { try { f(data, name); } catch (e) { if (TT.game) TT.game.fail('bus:' + name, e); else throw e; } }
    const a = this.h['*']; if (a) for (const f of a.slice()) { try { f(data, name); } catch (e) { if (TT.game) TT.game.fail('bus:*', e); else throw e; } }
  },
  clear(name) { if (name) delete this.h[name]; else this.h = {}; }
};

/** the game's own storage: E.store, with a memory copy so unlocks, records and ticks last the visit where storage is blocked */
TT.store = { kept: {}, get(k, fb) { if (k in this.kept) return this.kept[k]; const v = E.store.get(k, undefined); return v === undefined ? fb : v; }, set(k, v) { this.kept[k] = v; return E.store.set(k, v); } };
/* ---- the balance registry: every important gameplay number, live (dev sliders), with a reset to defaults ---- */
const TUNE_SPECS = [
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
  specs: TUNE_SPECS.map(([key, label, group, value, min, max, step]) => ({ key, label, group, value, min, max, step })),
  v: {},
  set(key, v) {
    const s = this.specs.find(q => q.key === key); if (!s || typeof v !== 'number' || !isFinite(v)) return undefined;
    const n = Math.round(clamp(v, s.min, s.max) / s.step) * s.step;
    this.v[key] = +n.toFixed(4); this.save(); return this.v[key];
  },
  reset(key) { for (const s of this.specs) if (!key || s.key === key) this.v[s.key] = s.value; this.save(); },
  defaults() { const o = {}; for (const s of this.specs) o[s.key] = s.value; return o; },
  changed() { return this.specs.filter(s => Math.abs(this.v[s.key] - s.value) > 1e-9).map(s => s.key); },
  save() { if (TT.cfg.headless || TT.noStore) return; const ch = {}; for (const k of this.changed()) ch[k] = this.v[k]; TT.store.set('thugby:tune', ch); },
  load() {
    this.reset(); if (TT.cfg.headless || TT.noStore) return;
    const s = TT.store.get('thugby:tune', null);
    if (s && typeof s === 'object') for (const k in s) { const sp = this.specs.find(q => q.key === k); if (sp && typeof s[k] === 'number') this.v[k] = clamp(s[k], sp.min, sp.max); }
  }
};
TUNE.reset();

/* ---- difficulty: a layer over TUNE (Rookie, Pro, Legend), so "reset to defaults" keeps the chosen difficulty ---- */
TT.DIFF = {
  Rookie: { name: 'Rookie', react: .15, tackle: -.12, mash: -3, noise: .35, intercept: .5, sigma: .25, early: .08, read: .25, kick: 1.5 },
  Pro: { name: 'Pro', react: 0, tackle: 0, mash: 0, noise: .2, intercept: 1, sigma: .12, early: .03, read: .35, kick: 1 },
  Legend: { name: 'Legend', react: -.07, tackle: .03, mash: 2, noise: .1, intercept: 1.3, sigma: .07, early: 0, read: .42, kick: .7 }
};
TT.DIFF_ORDER = ['Rookie', 'Pro', 'Legend'];
TT.diffStep = (name, k) => TT.DIFF_ORDER[clamp(TT.DIFF_ORDER.indexOf(name) + k, 0, 2)];

/* ---- cheats (dev panel): toggles read by the simulation ---- */
TT.cheats = { god: false, infTurbo: false, hypeFull: false, onFire: false, refBlind: false, refStrict: false, cpuFrozen: false, noClock: false, bigHeads: false };

/* ---- small helpers ---- */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const segDist = (px0, py0, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((px0 - ax) * vx + (py0 - ay) * vy) / l, 0, 1); return Math.hypot(ax + vx * u - px0, ay + vy * u - py0); };
const sgn = v => v < 0 ? -1 : 1;
const r1 = v => Math.round(v * 10) / 10;
TT.util = { dist, dist2, angTo, angDiff, segDist, sgn, r1 };
/** a seeded generator with the helpers the simulation uses (never Math.random in the simulation) */
TT.makeRng = seed => {
  const f = E.rng(seed >>> 0 || 1);
  const R = () => f();
  R.range = (a, b) => a + (b - a) * f();
  R.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  R.chance = p => f() < p;
  R.pick = l => l[Math.floor(f() * l.length)];
  R.gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += f(); return (s - 2) / .577; };
  return R;
};
/** cosmetic randomness (particles, crowd, line choice): never affects play */
TT.fx = TT.makeRng(Date.now ? (Date.now() & 0xffffff) : 99);
/** strip what the pixel font cannot draw (hub names): accents removed, anything else a dot */
TT.clean = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '.').slice(0, 14);


/* ==== 01-data-teams.js ==== */
/* ---- TEAMS: kits, crests, rosters (sevens: three forwards, four backs), AI styles. Designers edit these tables ----
 * a player: [name, nickname, role, build, size, hair, hairColor, skin, hat, stats [SPD, POW, HND, KCK, TKL], extra]
 * roles: P prop, H hooker, SH scrum-half, FH fly-half, C centre, W wing. Stats 1-10 (the boss goes past it on purpose). */
const SKIN = { pale: '#f2cfb0', light: '#e0b090', tan: '#c8946a', brown: '#a87050', dark: '#6a4028', deep: '#4e2e1c' };
TT.ROLE_ORDER = ['P', 'H', 'P', 'SH', 'FH', 'C', 'W'];
TT.ROLE_NAME = { P: 'PROP', H: 'HOOKER', SH: 'SCRUM-HALF', FH: 'FLY-HALF', C: 'CENTRE', W: 'WING' };
const TEAMS = TT.TEAMS = {
  mud: {
    id: 'mud', name: 'MUDDINGTON MUDLARKS', short: 'MUD', place: 'Muddington', venue: 'muddington', diff: 'Pro',
    home: { cloth: '#4aa0e0', trim: '#5a3a1e', pants: '#3a2a1a', boot: '#1a1410' }, away: { cloth: '#e8dcc0', trim: '#4aa0e0', pants: '#3a2a1a', boot: '#1a1410' },
    crest: { bg: '#4aa0e0', fg: '#6a4424', art: 'bird' },
    style: { aggr: .5, pass: .55, kick: .3, cheap: .1, line: 1 },
    blurb: 'The pub side from the Muddy Duck. Big hearts, bigger lunches.',
    players: [
      ['Dougie McAllister', 'The Fridge', 'P', 'bulky', 1.35, 'bald', '#3a2a1a', SKIN.pale, { style: 'helmet', color: '#6a4424' }, [4, 9, 5, 3, 8], { captain: true }],
      ['Kev Boatwright', 'Gravy', 'H', 'bulky', 1.25, 'short', '#c8602a', SKIN.pale, { style: 'band', color: '#e8dcc0' }, [5, 8, 6, 3, 7]],
      ['Sione Taufa', 'Tiny', 'P', 'bulky', 1.42, 'short', '#141010', SKIN.brown, null, [4, 10, 4, 2, 8]],
      ['Priya Nandakumar', 'Pocket Rocket', 'SH', 'heroic', 1.05, 'ponytail', '#141010', SKIN.brown, null, [8, 4, 9, 6, 6]],
      ['Ffion Pritchard', 'Boots', 'FH', 'heroic', 1.12, 'long', '#9a3a1a', SKIN.pale, null, [6, 5, 8, 9, 5]],
      ['Marcus Odhiambo', 'The Bus', 'C', 'heroic', 1.3, 'spiky', '#141010', SKIN.dark, null, [7, 8, 6, 4, 7]],
      ['Jamie Whitlock', 'Wheels', 'W', 'heroic', 1.1, 'spiky', '#f0d070', SKIN.pale, null, [10, 4, 7, 5, 4]]
    ]
  },
  bad: {
    id: 'bad', name: 'BRAMBLEWICK BADGERS', short: 'BAD', place: 'Bramblewick', venue: 'muddington', diff: 'Rookie',
    home: { cloth: '#24242a', trim: '#f0f0f0', pants: '#f0f0f0', boot: '#141414' }, away: { cloth: '#f0f0f0', trim: '#24242a', pants: '#24242a', boot: '#141414' },
    crest: { bg: '#f0f0f0', fg: '#24242a', art: 'badger' },
    style: { aggr: .3, pass: .4, kick: .5, cheap: .05, line: .9 },
    blurb: 'A village side. Their captain is seventy-four and bites.',
    players: [
      ['Edna Pemberton', 'Nan', 'P', 'bulky', 1.25, 'short', '#c8c8c8', SKIN.pale, { style: 'helmet', color: '#e8dcc0' }, [3, 8, 6, 4, 8], { captain: true, hunch: .2, voice: 'nan' }],
      ['Wilf Hollins', 'Wilf', 'H', 'bulky', 1.2, 'short', '#5a3a22', SKIN.light, null, [4, 7, 5, 3, 6]],
      ['Barnaby Pike', 'Barn Door', 'P', 'bulky', 1.38, 'bald', '#3a2a1a', '#e8a890', null, [3, 9, 3, 2, 7]],
      ['Pip Tanner', 'Pip', 'SH', 'heroic', 1.0, 'spiky', '#c8602a', SKIN.pale, null, [7, 3, 7, 5, 5]],
      ['Clementine Ashby', 'Clem', 'FH', 'heroic', 1.1, 'ponytail', '#f0d070', SKIN.pale, null, [5, 4, 7, 8, 4]],
      ['Ollie Brock', 'Badger', 'C', 'heroic', 1.25, 'short', '#202020', SKIN.light, null, [6, 7, 5, 3, 6]],
      ['Tilly Fenwick', 'Tilly', 'W', 'heroic', 1.08, 'long', '#141010', SKIN.tan, null, [8, 3, 6, 4, 4]]
    ]
  },
  gul: {
    id: 'gul', name: 'PORT GRUMBLE GULLS', short: 'GUL', place: 'Port Grumble', venue: 'docks', diff: 'Pro',
    home: { cloth: '#f4f4f0', trim: '#1fa89a', pants: '#1e2a50', boot: '#141820' }, away: { cloth: '#1fa89a', trim: '#f4f4f0', pants: '#1e2a50', boot: '#141820' },
    crest: { bg: '#1fa89a', fg: '#f4f4f0', art: 'gull' },
    style: { aggr: .45, pass: .75, kick: .5, cheap: .1, line: 1, react: .05 },
    blurb: 'A flashy harbour side. Run it, kick it, admire it.',
    players: [
      ['Sal Pereira', 'Salty', 'P', 'bulky', 1.32, 'short', '#141010', SKIN.tan, null, [4, 8, 5, 3, 7]],
      ['Kenji Ito', 'Kipper', 'H', 'bulky', 1.2, 'spiky', '#141010', SKIN.light, null, [6, 7, 7, 3, 6]],
      ['Mo Haddad', 'Anchor', 'P', 'bulky', 1.38, 'bald', '#141010', SKIN.tan, null, [4, 9, 4, 2, 8]],
      ['Lulu Fairweather', 'Lulu', 'SH', 'heroic', 1.02, 'ponytail', '#c8402a', SKIN.pale, null, [8, 4, 9, 6, 5]],
      ['Jonty Swift', 'Silky', 'FH', 'heroic', 1.15, 'long', '#f0c850', SKIN.light, { style: 'band', color: '#1fa89a' }, [7, 5, 9, 9, 4], { captain: true }],
      ['Dexter Okoro', 'Jet', 'C', 'heroic', 1.25, 'short', '#141010', SKIN.dark, null, [8, 7, 7, 4, 6]],
      ['Bree Lindqvist', 'Breeze', 'W', 'heroic', 1.1, 'long', '#f4ecd0', SKIN.pale, null, [10, 4, 8, 5, 4]]
    ]
  },
  irn: {
    id: 'irn', name: 'FURNACE FORGE IRONSIDES', short: 'IRN', place: 'Furnace Forge', venue: 'furnace', diff: 'Pro',
    home: { cloth: '#3a3a44', trim: '#f07a1e', pants: '#18181c', boot: '#101010' }, away: { cloth: '#f07a1e', trim: '#3a3a44', pants: '#18181c', boot: '#101010' },
    crest: { bg: '#3a3a44', fg: '#f07a1e', art: 'anvil' },
    style: { aggr: .85, pass: .35, kick: .25, cheap: .35, line: 1.2 },
    blurb: 'Foundry hard men and women. They hit like a drop forge.',
    players: [
      ['Grigor Petrov', 'The Kiln', 'P', 'bulky', 1.4, 'bald', '#141010', '#b88a6a', { style: 'helmet', color: '#f07a1e' }, [4, 10, 3, 2, 9]],
      ['Rusty Nailor', 'Rusty', 'H', 'bulky', 1.25, 'short', '#a84a1e', SKIN.pale, { style: 'helmet', color: '#f07a1e' }, [5, 8, 5, 3, 8]],
      ['Bertha Blunt', 'Big Bertha', 'P', 'bulky', 1.4, 'ponytail', '#141010', SKIN.light, { style: 'helmet', color: '#f07a1e' }, [4, 10, 4, 2, 9]],
      ['Smudge Cole', 'Smudge', 'SH', 'heroic', 1.05, 'spiky', '#141010', SKIN.tan, null, [7, 5, 7, 5, 6]],
      ['Ingot Ingram', 'Ingot', 'FH', 'heroic', 1.15, 'short', '#f0d070', SKIN.pale, null, [6, 6, 7, 8, 6]],
      ['Adaeze Okafor', 'Anvil', 'C', 'bulky', 1.32, 'short', '#141010', SKIN.dark, { style: 'helmet', color: '#f07a1e' }, [7, 9, 6, 3, 9], { captain: true }],
      ['Flint Mackay', 'Flint', 'W', 'heroic', 1.12, 'spiky', '#a8a8a8', SKIN.pale, null, [9, 6, 6, 4, 6]]
    ]
  },
  meg: {
    id: 'meg', name: 'MEGACORP MAULERS', short: 'MEG', place: 'The Megadome', venue: 'megadome', diff: 'Legend', locked: true,
    home: { cloth: '#e8c040', trim: '#5a2a8a', pants: '#3a1a5a', boot: '#1a1024' }, away: { cloth: '#5a2a8a', trim: '#e8c040', pants: '#3a1a5a', boot: '#1a1024' },
    crest: { bg: '#5a2a8a', fg: '#e8c040', art: 'm' },
    style: { aggr: .7, pass: .6, kick: .45, cheap: .25, line: 1.1, supers: 1 },
    blurb: 'A billionaire\'s bought-in super team. Their prop is a postcode.',
    players: [
      ['Brannigan', 'BIG UNIT', 'P', 'bulky', 2.0, 'bald', '#141010', SKIN.light, { style: 'band', color: '#e8c040' }, [6, 12, 6, 3, 10], { captain: true, boss: true, voice: 'unit' }],
      ['Leverage Lou', 'Lou', 'H', 'bulky', 1.25, 'short', '#2a1a10', SKIN.pale, null, [6, 8, 7, 3, 7]],
      ['Bonus Barrington', 'Bonus', 'P', 'bulky', 1.38, 'short', '#f0d070', SKIN.pale, null, [5, 9, 5, 2, 8]],
      ['Synergy Jones', 'Synergy', 'SH', 'heroic', 1.05, 'ponytail', '#9a5ae0', SKIN.brown, null, [9, 5, 9, 6, 6]],
      ['Chad Sterling III', 'Chad', 'FH', 'heroic', 1.15, 'long', '#f0c850', SKIN.pale, null, [7, 6, 9, 10, 5]],
      ['Vance Capitale', 'Vance', 'C', 'heroic', 1.28, 'spiky', '#141010', SKIN.tan, null, [8, 8, 7, 5, 7]],
      ['Hedge Fundsworth', 'Hedge', 'W', 'heroic', 1.12, 'short', '#d8d8e0', SKIN.pale, null, [10, 5, 8, 6, 5]]
    ]
  }
};
TT.TEAM_ORDER = ['mud', 'bad', 'gul', 'irn', 'meg'];
for (const id in TEAMS) {
  const tm = TEAMS[id];
  tm.roster = tm.players.map(([name, nick, role, build, size, hair, hairC, skin, hat, st, extra], i) => Object.assign({
    i, name, nick, role, build, size, hair, hairC, skin, hat,
    spd: st[0], pow: st[1], hnd: st[2], kck: st[3], tkl: st[4]
  }, extra || {}));
  // sevens order: loosehead prop, hooker, tighthead prop, scrum-half, fly-half, centre, wing
  const props = tm.roster.filter(p => p.role === 'P'), byRole = r => tm.roster.find(p => p.role === r);
  tm.roster = [props[0], byRole('H'), props[1], byRole('SH'), byRole('FH'), byRole('C'), byRole('W')];
  tm.roster.forEach((p, k) => { p.slot = k; });
}
/** the three-bar card numbers for a team (SPEED, POWER, SKILL), 0..1 */
TT.teamBars = id => {
  const R = TEAMS[id].roster, avg = k => R.reduce((a, p) => a + p[k], 0) / R.length;
  return [avg('spd') / 10, Math.min(1, avg('pow') / 10), (avg('hnd') + avg('kck') + avg('tkl')) / 30];
};
/** the off-pitch cast: coach, bus driver, commentators, referee, owner (portraits and cutscenes) */
TT.CAST = {
  gristle: { name: 'COACH GRISTLE', build: 'bulky', size: 1.3, hair: 'bald', hairC: '#b8b8b8', skin: SKIN.pale, hat: { style: 'cap', color: '#5a4430' }, outfit: 'coat', colors: { cloth: '#6a5038', coat: '#6a5038', pants: '#3a3028', trim: '#3a2a1a' }, voice: 'gristle' },
  dave: { name: 'BIG DAVE', build: 'bulky', size: 1.35, hair: 'short', hairC: '#3a2a1a', skin: SKIN.light, hat: { style: 'band', color: '#2a2a3a' }, outfit: 'coat', colors: { cloth: '#e8e030', coat: '#e8e030', pants: '#2a3048', trim: '#c8c8c8' }, voice: 'dave' },
  barry: { name: 'BARRY BELLOWS', build: 'heroic', size: 1.1, hair: 'short', hairC: '#7a5a3a', skin: SKIN.pale, hat: { style: 'band', color: '#202028' }, outfit: 'coat', colors: { cloth: '#f0f0f0', coat: '#7a1a2a', pants: '#2a2a32', trim: '#e8c040' }, voice: 'barry' },
  ros: { name: 'ROS RUCKER', build: 'heroic', size: 1.1, hair: 'short', hairC: '#a8a8b0', skin: SKIN.light, outfit: 'coat', colors: { cloth: '#e8e8f0', coat: '#1e2a50', pants: '#1a1a24', trim: '#c8c8d8' }, voice: 'ros', ear: true },
  nigel: { name: 'NIGEL BLEWITT', build: 'heroic', size: 1.1, hair: 'short', hairC: '#6a4a2a', skin: SKIN.pale, outfit: 'shirt', colors: { cloth: '#1a1a1e', pants: '#1a1a1e', trim: '#3ac850', boot: '#0e0e10' }, voice: 'nigel' },
  rupert: { name: 'SIR RUPERT GOLDBRICK', build: 'heroic', size: 1.15, hair: 'short', hairC: '#e8e8e8', skin: SKIN.pale, hat: { style: 'crown', color: '#e8c040' }, outfit: 'coat', colors: { cloth: '#f0e8d8', coat: '#5a2a8a', pants: '#3a1a5a', trim: '#e8c040' }, voice: 'rupert', monocle: true },
  pa: { name: 'STADIUM PA', voice: 'pa' }
};


/* ==== 02-data-venues.js ==== */
/* ---- VENUES: { id, name, time, weather, wind, grass, stands, sky, skyline, boards, hazard, music } (one twist each) ---- */
TT.VENUES = {
  muddington: {
    id: 'muddington', name: 'MUDDINGTON PARK', short: 'Muddington Park', time: 'day', weather: { kind: 'rain', amount: .7, wind: .15 },
    hazard: 'mud', music: 'mud', grass: [96, 150, 70], ingoal: [86, 140, 64], apron: [76, 120, 58],
    stand: { face: 'plank', side: '#6a4a30', top: '#8a6a48', tiers: ['#5a3e28', '#6a4a30', '#7a5638'] },
    sky: ['#7a8898', '#a0acb8', '#c0c8cc'], skyline: 'hills', skyCol: ['#5a6a58', '#46584a', '#3a4a3e'],
    boards: [['THE MUDDY DUCK', '#5a3a1e', '#f0e0a0'], ['PIES & PINTS', '#2a5a2a', '#f8f0d0'], ['BIG DAVE\'S BUSES', '#e8e030', '#1a1a1a'], ['CHANNEL THUD', '#c82a2a', '#ffffff']],
    crowd: .55, ambient: .95, tint: '#fff4e0', lights: false
  },
  docks: {
    id: 'docks', name: 'PORT GRUMBLE DOCKS', short: 'Port Grumble Docks', time: 'dusk', weather: { kind: 'leaves', amount: .15, wind: .6 },
    hazard: 'chicken', wind: true, music: 'shanty', grass: [92, 140, 72], ingoal: [80, 128, 66], apron: [70, 106, 60],
    stand: { face: 'stone', side: '#6a6a72', top: '#8a8a92', tiers: ['#5a5a64', '#66666e', '#727278'] },
    sky: ['#2a2a5a', '#c8603a', '#f0a050'], skyline: 'docks', skyCol: ['#3a2a3a', '#2a2030', '#1e1828'],
    boards: [['SEAGULL-PROOF CHIPS', '#1fa89a', '#ffffff'], ['KRAKEN INSURANCE', '#1e2a50', '#f0c040'], ['GRUMBLE\'S GRAVY', '#6a3a1a', '#f8e8c0'], ['CHANNEL THUD', '#c82a2a', '#ffffff']],
    crowd: .75, ambient: .68, tint: '#ffc890', lights: true
  },
  furnace: {
    id: 'furnace', name: 'THE FURNACE', short: 'The Furnace', time: 'night', weather: { kind: 'ash', amount: .35, wind: .1 },
    hazard: 'flames', music: 'forge', grass: [70, 112, 54], ingoal: [62, 100, 50], apron: [56, 72, 50],
    stand: { face: 'stone', side: '#2a2a30', top: '#3a3a42', tiers: ['#222228', '#2a2a30', '#32323a'] },
    sky: ['#0a0608', '#2a0e0a', '#5a1a0e'], skyline: 'chimneys', skyCol: ['#1a1014', '#140c10', '#100a0c'],
    boards: [['FORGEWORKS STEEL', '#3a3a44', '#f07a1e'], ['TURBO TONIC', '#2ac850', '#101010'], ['MEGA MEAT PIES', '#c8602a', '#fff0c0'], ['CHANNEL THUD', '#c82a2a', '#ffffff']],
    crowd: .85, ambient: .5, tint: '#ffb070', lights: true
  },
  megadome: {
    id: 'megadome', name: 'THE MEGADOME', short: 'The Megadome', time: 'night', weather: { kind: 'rain', amount: .9, wind: .3, lightning: .25 },
    hazard: 'lightning', music: 'mega', grass: [84, 138, 76], ingoal: [92, 64, 130], apron: [52, 40, 70],
    stand: { face: 'stone', side: '#3a1a5a', top: '#5a2a8a', tiers: ['#2e1448', '#3a1a5a', '#46206a'] },
    sky: ['#06060e', '#141428', '#2a2a48'], skyline: 'city', skyCol: ['#1a1a30', '#141428', '#10101e'],
    boards: [['GOLDBRICK HOLDINGS', '#5a2a8a', '#e8c040'], ['CHANNEL THUD', '#c82a2a', '#ffffff'], ['TURBO TONIC', '#2ac850', '#101010'], ['MEGA MEAT PIES', '#c8602a', '#fff0c0']],
    crowd: 1, ambient: .48, tint: '#d0c0ff', lights: true, jumbotron: true
  }
};
TT.VENUE_ORDER = ['muddington', 'docks', 'furnace', 'megadome'];
/** Exhibition weather choices: venue default, or one of these */
TT.WEATHERS = {
  venue: { label: 'VENUE DEFAULT' },
  clear: { label: 'CLEAR', w: null },
  rain: { label: 'RAIN', w: { kind: 'rain', amount: .7, wind: .15 } },
  wind: { label: 'GALE', w: { kind: 'leaves', amount: .25, wind: .8 }, wind: true },
  storm: { label: 'STORM', w: { kind: 'rain', amount: .95, wind: .4, lightning: .3 }, wind: true }
};
TT.TIMES = { day: { label: 'DAY', ambient: .95 }, dusk: { label: 'DUSK', ambient: .66 }, night: { label: 'NIGHT', ambient: .46 } };
/** the Mega Cup: four rounds */
TT.CUP = [
  { round: 'ROUND ONE', opp: 'bad', venue: 'muddington', pre: 'r1', half: 'r1h', won: 'r1w' },
  { round: 'QUARTER-FINAL', opp: 'gul', venue: 'docks', pre: 'r2', half: 'r2h', won: 'r2w' },
  { round: 'SEMI-FINAL', opp: 'irn', venue: 'furnace', pre: 'r3', half: 'r3h', won: 'r3w' },
  { round: 'GRAND FINAL', opp: 'meg', venue: 'megadome', pre: 'r4', half: 'r4h', won: 'victory' }
];


/* ==== 03-data-content.js ==== */
/* ---- POWER-UPS (thrown on by the crowd) ---- */
TT.POWERUPS = {
  pie: { id: 'pie', name: 'MEAT PIE', time: 6, desc: 'Turbo refilled and unlimited' },
  iron: { id: 'iron', name: 'IRON SHOULDERS', time: 15, desc: 'Tackles and fends always win; hits are monster hits' },
  boot: { id: 'boot', name: 'MEGA BOOT', time: 60, desc: 'The team\'s next kick goes 1.6x and true' },
  grease: { id: 'grease', name: 'GREASE JERSEY', time: 8, desc: 'Tackles on him fail 70% of the time' },
  horn: { id: 'horn', name: 'AIR HORN', time: 0, desc: '+40 hype at once' }
};
TT.POWERUP_ORDER = ['pie', 'iron', 'boot', 'grease', 'horn'];

/* ---- COMMENTARY: Barry Bellows (play-by-play, breathless) and Ros Rucker (colour, bone-dry). 'R:' marks Ros; a pair
 * [barry, ros] is a line and its reply. {$player} nickname, {$team}, {$score}, {$venue} ---- */
TT.LINES = {
  kickoff: ['And we\'re underway at {$venue}!', 'Big boot to get us going!', 'R:Here we go. Mind the mud.', 'Off we go! Seven a side and no mercy!', 'R:Ball\'s in the air. So are my hopes.', 'Kick-off! Hold onto your pies, folks!', ['Away we go!', 'R:Somebody wake the forwards.']],
  try: ['HE\'S GONE OVER! TRY TIME!', 'Under the sticks! You could drive a bus through that gap!', 'Dotted down! {$player}, take a bow!', 'In at the corner! Somebody check the paint on that touchline!', 'R:Textbook. If the textbook was written by a hurricane.', 'TRY! {$team} are dancing!', 'Over the whitewash! Get in!', ['Five points! FIVE!', 'R:He can count, everyone.']],
  bigHit: ['OH, THAT\'S A BIG ONE!', 'He\'ll feel that in the morning. And the morning after.', 'Absolutely SHUDDERING!', 'R:I felt that in my old knee, Barry.', 'BANG! Bring a mop!', 'Hit him like a falling fridge!', ['WALLOP!', 'R:Medically speaking, that\'s a wallop.']],
  monsterHit: ['MONSTER HIT! That\'s gone into orbit!', 'Put him in Row Z!', 'Somebody get that man a postcode, he\'s lost!', 'R:He\'s seen the curvature of the earth there.', 'Air traffic control want a word!', 'He\'s been posted second class!', ['GOOD NIGHT VIENNA!', 'R:And good morning, physio.']],
  step: ['Left him for dead!', 'Feet like a ballroom dancer!', 'R:Lovely footwork. Questionable haircut. Lovely footwork.', 'Stepped him like a puddle!', 'Ooh, the sidestep! He\'s tackled thin air!', 'Shimmy, shimmy, GONE!', 'R:That defender\'s gone to the wrong postcode.'],
  fend: ['HAND-OFF! Right in the chops!', 'He\'s fended him into next week!', 'R:A palm like a dinner plate.', 'Stiff arm! Talk to the hand!', 'Shoved him away like a bad pint!', 'R:That\'s what we used to call a polite no.'],
  dummy: ['Oh, the dummy! They\'ve bought it, the whole shop!', 'Sold a dummy! Sold it twice!', 'R:They fell for that? I\'m embarrassed for them.', 'The dummy! Hook, line and sinker!', 'Pretended to pass and they ALL went!', 'R:Oldest trick in the book. They clearly can\'t read.'],
  lineBreak: ['He\'s through! There\'s daylight!', 'The line\'s been cut like a birthday cake!', 'R:Defence has gone for a sit down.', 'Clean break! Somebody chase him!', 'He\'s in the clear! Run, lad, RUN!', 'Through the gap like a ferret down a drainpipe!'],
  knockOn: ['Knock-on. Butter fingers.', 'Dropped it like a hot pie!', 'R:Hands like feet, Barry.', 'Oh dear. It\'s gone forward off the hands.', 'Spilled it! Scrum coming!', 'R:Greasy ball. Greasier hands.'],
  forwardPass: ['Forward! The ref\'s not having that.', 'R:Forward by a country mile, Barry.', 'That\'s gone forward. Whistle!', 'Forward pass! Backwards, lads, BACKWARDS!', 'R:It\'s the one rule. The one.', 'Not legal! That\'s gone the wrong way!'],
  turnover: ['JACKAL! He\'s pinched it!', 'Turnover! Stolen like a pie at a buffet!', 'R:Lovely work over the ball.', 'They\'ve won it back at the breakdown!', 'Ripped it clean out of there!', 'R:Possession is nine-tenths of the law. The other tenth is elbows.'],
  ruck: ['They\'ve recycled it!', 'Quick ball from the ruck!', 'R:Lots of bodies. Some of them moving.', 'Good clean ball!', 'In they go! It\'s a pile-on!', 'R:Somewhere under that is a rugby ball.'],
  scrum: ['Crouch... bind... SET! And they\'ve hit like freight trains!', 'R:That scrum\'s going backwards, and so is their dignity.', 'Scrum time! The big lads earn their pies now!', 'Push, push, PUSH!', 'R:Six blokes, one ball, no oxygen.', 'Scrum won! Clean as a whistle!'],
  pushover: ['PUSHOVER TRY! They\'ve shoved them over the line like a wardrobe!', 'They\'ve marched them over! Removal men!', 'R:That\'s the most organised that pack has ever been.', 'PUSHOVER! Furniture removal service!', 'Over they go, the whole pack!', 'R:I\'d like to see the video of that. Slowly.'],
  lineout: ['He\'s been lifted so high he can see his house!', 'Stolen at the lineout! Cheeky!', 'R:Lovely lift. Lovely throw. Lovely.', 'Up he goes! Mind the satellites!', 'Clean take at the lineout!', 'R:They\'ve called that move "The Wardrobe". I don\'t know why.'],
  notStraight: ['Not straight! Wonky throw!', 'R:Straighter lines in a bowl of spaghetti.', 'That throw\'s gone sideways! Scrum!', 'Not straight, says the ref!', 'R:He threw it like he was skimming stones.', 'Crooked! The ref\'s seen that one.'],
  convMade: ['Straight between the sticks!', 'Bang! Two more!', 'R:Over. Never in doubt. I doubted it.', 'Through the middle!', 'Converted! Lovely strike!', 'R:Sweet as a nut.'],
  convMissed: ['Wide! Hooked it like a fisherman.', 'Oh, pushed it wide!', 'R:Not a kicker\'s day.', 'Missed! The crowd groans!', 'Short! Not enough on it!', 'R:Somewhere a goalkicking coach is weeping.'],
  doink: ['DOINK! Off the upright!', 'R:The post took that personally.', 'Off the woodwork! Agony!', 'DOINK! Hear that from the car park!', 'Clattered the upright!', 'R:Wrong sort of contact, that.'],
  pengoal: ['Penalty goal! Three points!', 'Over it goes! Three on the board!', 'R:Points are points, Barry.', 'Slotted! Three more!', 'He\'s nailed it!', 'R:Simple game, sometimes.'],
  dropGoal: ['DROP GOAL! Cheeky, cheeky!', 'Snapped it over! Three points!', 'R:Didn\'t even break sweat.', 'Off the deck and over! Drop goal!', 'He\'s had a pop and it\'s GONE!', 'R:Lovely. Rude, but lovely.'],
  penalty: ['Penalty! The ref\'s arm is out!', 'Penalty given!', 'R:Daft, that. Absolutely daft.', 'The whistle goes! Penalty!', 'Ref\'s seen that one! Penalty!', 'R:Someone\'s getting a talking-to in the dressing room.'],
  advantage: ['Advantage being played...', 'Ref says play on, advantage!', 'R:Arm out. Play on.', 'Advantage! Keep going!', 'Play on, play on!', 'R:The ref\'s being generous today.'],
  advOver: ['Advantage over.', 'R:Advantage over. Back to normal madness.', 'That\'s advantage over!', 'Advantage done!', 'And the arm comes down.', 'R:Advantage, used.'],
  cheapUnseen: ['Ooh... the ref\'s missed that one completely.', ['What the ref doesn\'t see, Ros...', 'R:...is still assault, Barry.'], 'Behind the ref\'s back! Cheeky!', 'R:Nobody saw that. Except everybody.', 'The ref\'s looking at the clouds!', 'Off the ball! Naughty, naughty!'],
  cheapSeen: ['The ref\'s seen that! Off the ball!', 'Caught red-handed!', 'R:Not subtle, that.', 'Right in front of the ref! Daft!', 'Late hit! Whistle!', 'R:Good eyes, Nigel. For once.'],
  yellow: ['YELLOW CARD! Off to the sin bin, and I mean an actual bin!', 'Sin bin! In you get, son!', 'R:Mind the bin juice.', 'Yellow! He\'s binned!', 'Off to the dumpster! Ten minutes of thinking!', 'R:It smells of fish in there, I\'m told.'],
  red: ['RED CARD! Early bath!', 'He\'s off! Red card!', 'R:That\'s his evening sorted then.', 'Sent off! Off you pop!', 'Red! Walk of shame!', 'R:Mum\'s not going to be pleased.'],
  sinOut: ['He\'s back from the bin!', 'Out of the dumpster and back in the fight!', 'R:Smells better than he did.', 'Back to full strength!', 'Released from the sin bin!', 'R:Rehabilitated. Allegedly.'],
  refDown: ['R:THE REF\'S DOWN! Anything goes, Barry!', 'Anything goes, Ros!', 'The referee\'s been flattened!', 'R:Somebody get Nigel a cup of tea.', 'Nobody\'s watching! It\'s CHAOS!', 'Ref down! The lunatics have the asylum!'],
  refUp: ['The ref\'s back on his feet!', 'R:Nigel lives.', 'Order restored! Sort of!', 'And Nigel\'s up!', 'The ref\'s back in business!', 'R:Pretend that never happened.'],
  onFire: ['HE\'S ON FIRE!', 'Somebody call the fire brigade! Actually, don\'t, let it burn!', 'R:Unstoppable. Possibly flammable.', 'He\'s smoking hot!', 'BOOMSHAKALAKA! On fire!', 'R:Health and safety are taking notes.'],
  super: ['THUNDER RUN! Get out of the way!', 'HURRICANE HIT INCOMING!', 'R:This is not a recognised rugby technique.', 'The SUPER\'s on! Batten down the hatches!', 'Full hype! Here it comes!', 'R:I believe this is the bit they practise.'],
  pie: [['Somebody\'s chucked a meat pie on the pitch!', 'R:Is that... gravy?'], 'A pie from the stands! Turbo time!', 'R:Steak and ale. Excellent choice.', 'Pie on the pitch! Grab it!', 'Pastry power!', 'R:Best thing on the field today.'],
  iron: ['IRON SHOULDERS! He\'s a walking wardrobe!', 'Iron shoulders! Don\'t get in his way!', 'R:Rivets and all. Lovely.', 'He\'s armour-plated!', 'Built like a battleship now!', 'R:Health and safety.'],
  boot: ['The MEGA BOOT! Stand well back!', 'Golden boot! It\'s got wings!', 'R:That boot has a pilot\'s licence.', 'Mega boot on the pitch!', 'Next kick goes to the moon!', 'R:Mind the floodlights.'],
  grease: ['Grease jersey! Slippery as a sardine!', 'Greased up! Nobody can hold him!', 'R:I don\'t want to know where that came from.', 'Like trying to catch a bar of soap!', 'Slippery customer!', 'R:Lard. That\'s lard.'],
  horn: ['AIR HORN! The crowd\'s gone barmy!', 'PARP! Hype through the roof!', 'R:My ears, Barry. My ears.', 'Air horn! The place is bouncing!', 'Listen to that racket!', 'R:Ninety decibels of pure nonsense.'],
  chicken: ['It\'s CAPTAIN CLUCKY! The mascot\'s on the pitch again!', 'The chicken! The CHICKEN!', 'R:That chicken has more caps than I do.', 'Captain Clucky\'s flattening everyone!', 'Mind the beak!', 'R:Somebody stop that bird.'],
  flames: ['Mind the flames! That\'s a well-done winger!', 'TOASTED! Medium rare!', 'R:Smells like a barbecue.', 'He\'s been flame-grilled!', 'Fire from below! Hot hot hot!', 'R:Health and safety have left the building.'],
  lightning: ['Lightning strike! That\'s one way to clear a ruck!', 'ZAPPED! I could see his bones!', 'R:That\'s an act of God, Barry.', 'Lightning on the pitch! Ka-BOOM!', 'Struck by lightning! He\'s glowing!', 'R:Not covered by insurance.'],
  mud: ['He\'s in the mud! Half man, half puddle!', 'Bogged down! Wellies required!', 'R:That\'s more mud than pitch.', 'Mud, glorious mud!', 'Stuck in the swamp!', 'R:Lovely day for it.'],
  wind: ['The wind\'s picked up! Watch the high ball!', 'Gusty out there!', 'R:Kickers hate this.', 'Here comes the wind!', 'The flags are standing straight out!', 'R:Hold onto your hats.'],
  hooter: ['There\'s the hooter! Ball has to go dead!', 'HOOTER! Last play!', 'R:Time\'s up. Whoever\'s got it, don\'t drop it.', 'The hooter\'s gone!', 'That\'s the hooter! Next stoppage ends it!', 'R:Here comes the panic.'],
  halftime: ['Half-time here at {$venue}: {$score}.', 'That\'s the half! {$score}.', 'R:Oranges and shouting, then.', 'Half-time! Time for a pie!', 'Break time, {$score}!', 'R:I\'ll get the teas in.'],
  fulltime: ['FULL TIME! {$team} win it, {$score}!', 'That\'s it! Somebody get the kettle on!', 'R:Good game. Mostly legal.', 'FULL TIME! What a match!', 'It\'s all over! {$team} take it!', 'R:I need a lie down.'],
  draw: ['FULL TIME! It\'s a draw, {$score}!', 'Honours even!', 'R:Nobody wins. Everybody hurts.', 'All square at the end!', 'Level pegging! A draw!', 'R:Very diplomatic.'],
  suddenDeath: ['Golden point! Next score wins the lot!', 'SUDDEN DEATH! Nerves of steel!', 'R:I can\'t watch.', 'Extra time! Next score takes it!', 'Golden point, here we go!', 'R:My heart, Barry.'],
  interception: ['INTERCEPTED! He\'s read it like a newspaper!', 'Picked off! And he\'s away!', 'R:Telegraphed that pass, they did.', 'Intercepted! Daylight ahead!', 'Snaffled it out of the air!', 'R:Lovely hands. Wrong team.'],
  offload: ['Offload in the tackle! Keep it alive!', 'Out of the back of the hand!', 'R:Sevens rugby. Never die.', 'Pop pass! Still going!', 'The offload! Gorgeous!', 'R:That\'s the good stuff.'],
  tackle: ['Good tackle!', 'Brought down!', 'R:Solid.', 'Wrapped up!', 'Down he goes!', 'R:Textbook, that.', 'Cut him in half!'],
  brokenTackle: ['He\'s broken the tackle!', 'Bounced off him!', 'R:Ooh, weak arms.', 'Shrugged him off!', 'Not enough! Still going!', 'R:Tackle like a wet tissue.'],
  missedTackle: ['Missed him!', 'Grasped at fresh air!', 'R:That one\'s going on the blooper reel.', 'Whiffed it!', 'Over-committed! Missed!', 'R:Defending like a revolving door.'],
  diveTackle: ['Diving tap tackle! Brilliant!', 'Ankle tap! Down he goes!', 'R:Last ditch. Lovely.', 'Full stretch! Brought him down!', 'Superman dive!', 'R:Fingertips. Enough.'],
  gangHold: ['They\'ve got hold of BIG UNIT... just about!', 'One man isn\'t enough!', 'R:Two men, minimum. Bring a ladder.', 'Hanging off him like a coat!', 'Somebody help him!', 'R:Like tackling a lorry.'],
  touch: ['Out of play!', 'Into touch!', 'R:Lineout coming.', 'Over the line and out!', 'Touch!', 'R:Neat.'],
  kickTouch: ['Great kick to touch!', 'Found the line! Lovely!', 'R:Precise. Annoyingly so.', 'Into touch, deep in their half!', 'A kicker\'s kick, that!', 'R:Nice territory.'],
  bomb: ['Up and under! Bombs away!', 'A garryowen! Get under it!', 'R:Snow on that one.', 'High ball! Who wants it?', 'That\'s up with the seagulls!', 'R:Hang time, Barry. Lovely hang time.'],
  grubber: ['Grubber kick! Chase it!', 'Little dink in behind!', 'R:Bouncing like a drunk ferret.', 'Through the legs! Grubber!', 'Kicked along the deck!', 'R:Oval ball, Barry. Anything can happen.'],
  dropout: ['Twenty-two drop-out!', 'Drop-out coming!', 'R:Long or short? Long, probably.', 'They\'ll restart from the twenty-two!', 'Drop-out!', 'R:Reset.'],
  notTen: ['Not ten! That kick-off\'s gone nowhere!', 'Short kick-off! Free kick!', 'R:Didn\'t get it ten metres. Embarrassing.', 'Not far enough!', 'R:Dreadful.', 'Shanked it short!'],
  freeKick: ['Free kick!', 'R:Free kick. No shot at goal.', 'Free kick awarded!', 'Tap and go from the free kick!', 'Free kick, play on!', 'R:A small mercy.'],
  penTry: ['PENALTY TRY! Seven points!', 'The ref\'s gone under the posts! Penalty try!', 'R:Daft. Absolutely daft.', 'Penalty try awarded!', 'Seven points! No kick needed!', 'R:That\'s what cynical gets you.'],
  replay: ['Let\'s see that again!', 'Have a look at this!', 'R:Slow it down for me.', 'Replay! Watch this!', 'One more time!', 'R:Pause it there. Ouch.'],
  jackal: ['JACKAL! Hands on the ball!', 'Over the ball and stealing!', 'R:Lovely low body position.', 'In like a ferret!', 'Pilfered it!', 'R:Fox in the henhouse.']
};
TT.REF_CALLS = { crouch: 'CROUCH!', bind: 'BIND!', set: 'SET!', useIt: 'USE IT!', advantage: 'ADVANTAGE!', playOn: 'PLAY ON!', hands: 'HANDS AWAY!', penalty: 'PENALTY!', knockOn: 'KNOCK ON!', forward: 'FORWARD!', notStraight: 'NOT STRAIGHT!', try: 'TRY!', scrum: 'SCRUM!', touch: 'LINEOUT!', free: 'FREE KICK!', card: 'IN THE BIN!', red: 'OFF!', ten: 'NOT TEN!', drop: 'DROP-OUT!', offside: 'OFFSIDE!', highShot: 'HIGH SHOT!', offBall: 'OFF THE BALL!', early: 'EARLY!' };

/* ---- THE MEGA CUP STORY (E.Story nodes: { who, say, choices }; ALL CAPS shouts shake; {w=.4} pauses) ---- */
TT.STORY = {
  prologue: { set: 'pub', music: 'pub', nodes: [
    { who: 'dave', say: 'So I\'m filling in the form, right. \'Mega Cup.\' I thought it was a tea thing.' },
    { who: 'gristle', say: 'It\'s the {shake}TURBO SEVENS MEGA CUP{/shake}, Dave. Live on Channel Thud. Against teams with dieticians.' },
    { who: 'fridge', say: 'We\'ve got a dietician.{w=.4} (He nods at the pie warmer.)' },
    { who: 'gristle', say: 'Gristle\'s Rule Number One: nobody laughs at the Mudlarks.{w=.3} Rule Number Two: we train. Now.{w=.3} Yes, you too, Dave.' },
    { who: 'dave', say: 'I drive the bus, Gordon.', choices: [{ text: 'TRAIN WITH GRISTLE', set: 'train' }, { text: 'SKIP TO THE CUP' }] }
  ] },
  r1: { set: 'pitch', music: 'mud', home: 'mud', away: 'bad', nodes: [
    { who: 'barry', say: 'Welcome to a damp Muddington Park, where the Mudlarks open their Mega Cup against the Bramblewick Badgers!' },
    { who: 'ros', say: 'Damp is generous, Barry. I\'ve seen drier rivers.' },
    { who: 'nan', say: 'I\'ve propped since before your dad had teeth, sonny. I\'ve had hip replacements tougher than you.' },
    { who: 'gristle', say: 'She\'s seventy-four, lads. Do {shake}NOT{/shake} go easy on her. She bites.' }
  ] },
  r1h: { nodes: [{ who: 'gristle', say: 'Rule Three: hold the ball.{w=.3} Rule Four: see Rule Three.' }] },
  r1w: { nodes: [{ who: 'barry', say: 'The Mudlarks are through! Ros, are they any good?' }, { who: 'ros', say: 'They\'re...{w=.5} present, Barry.' }] },
  r2: { set: 'pitch', music: 'shanty', home: 'mud', away: 'gul', nodes: [
    { who: 'barry', say: 'The quarter-finals! Port Grumble Docks at sunset, and the Gulls are strutting!' },
    { who: 'jonty', say: 'Gorgeous evening. Gorgeous ground. Gorgeous me. Do try to keep up, darlings.' },
    { who: 'gristle', say: 'Watch the wind. Watch the chicken.{w=.3} Don\'t ask about the chicken.' }
  ] },
  r2h: { nodes: [{ who: 'gristle', say: 'Pass it like it\'s hot.{w=.3} It IS hot. It\'s Port Grumble. Everything here\'s been deep-fried.' }] },
  r2w: { nodes: [{ who: 'barry', say: 'The Mudlarks are into the semis! Unbelievable!' }, { who: 'ros', say: 'That chicken has more caps than I do.' }] },
  r3: { set: 'pitch', music: 'forge', home: 'mud', away: 'irn', nodes: [
    { who: 'barry', say: 'Semi-final night at The Furnace! You can smell the hot metal from here!' },
    { who: 'anvil', say: 'We forge champions here. Everyone else, we melt down for scrap.' },
    { who: 'gristle', say: 'Don\'t stand on the glowing bits.{w=.3} Wheels. Wheels, look at me. The {shake}GLOWING{/shake} bits.' }
  ] },
  r3h: { nodes: [{ who: 'gristle', say: 'They hit hard? Hit harder.{w=.3} Then hide behind Tiny.' }] },
  r3w: { nodes: [{ who: 'barry', say: '{shake}A PUB TEAM IN THE MEGA CUP FINAL!{/shake} Somebody pinch me!' }, { who: 'ros', say: 'Gladly, Barry.' }] },
  r4: { set: 'tunnel', music: 'mega', home: 'mud', away: 'meg', nodes: [
    { who: 'rupert', say: 'Charming little pub team. I\'ll buy the lot of you. The pub, the pies, the muddy bird. Name your price.' },
    { who: 'fridge', say: 'Not for sale.' },
    { who: 'gristle', say: 'The pies are for sale. Two-fifty.{w=.3} {shake}WE\'RE{/shake} not.' },
    { who: 'unit', say: 'RAAAAAAAAAAARGH!', spotlight: true },
    { who: 'barry', say: '{shake}BIG UNIT BRANNIGAN!{/shake} Two metres of pure invoice!' },
    { who: 'ros', say: 'You\'ll need two men to bring him down, minimum. Bring a ladder.' }
  ] },
  r4h: { nodes: [{ who: 'gristle', say: 'I\'ve written the big speech. In my head. It\'s very moving. Pretend I said it.{w=.4} {shake}NOW GET OUT THERE!{/shake}' }] },
  lost: { nodes: [{ who: 'gristle', say: 'Rule Six: we go again.' }] },
  victory: { set: 'podium', music: 'victory', nodes: [
    { who: 'barry', say: '{shake}THE MUDDINGTON MUDLARKS ARE MEGA CUP CHAMPIONS!{/shake} A PUB TEAM, ROS! A PUB TEAM!' },
    { who: 'ros', say: 'I need a lie down, Barry.' },
    { who: 'rupert', say: 'I\'ll buy the trophy, then.' },
    { who: 'gristle', say: 'Rule Five: no.' }
  ] },
  third: { set: 'pub', music: 'third', party: true, nodes: [
    { who: 'barry', say: 'And so to the third half, back at the Muddy Duck. Everybody\'s here. Even the chicken.' },
    { who: 'nan', say: 'Somebody get these children a shandy.' },
    { who: 'choir', say: '{wave}Oh Muddington, oh Muddington, your mud is in my soul...{/wave}' },
    { who: 'choir', say: '{wave}We lost our boots, we lost our teeth, we never lost the ball...{/wave}' },
    { who: 'gristle', say: 'Last orders!' }
  ] }
};
/** who speaks in the story: a cast id (TT.CAST) or [teamId, slot]; the voice is looked up from it */
TT.SPEAKERS = {
  dave: 'dave', gristle: 'gristle', barry: 'barry', ros: 'ros', rupert: 'rupert', nigel: 'nigel',
  fridge: ['mud', 0], nan: ['bad', 0], jonty: ['gul', 4], anvil: ['irn', 5], unit: ['meg', 0], choir: 'choir'
};

/* ---- TRAINING GROUND: Coach Gristle's nine drills (each also a tutorial; SHOW ME plays its auto script) ---- */
TT.DRILLS = [
  { id: 'legs', name: 'LEGS', teach: 'Run, turbo, and ground it', goal: 'Turbo to the line and dive over', coach: 'Run. Faster. Hold {b:turbo} for turbo. In the in-goal, {b:x} to dive.' },
  { id: 'hands', name: 'HANDS', teach: 'Pass backwards, both ways', goal: 'Five passes, both ways, then a long one', coach: '{b:l1} passes up the line, {b:r1} down it. Hold for a long one. Never forwards!' },
  { id: 'feet', name: 'FEET', teach: 'Sidestep, spin and fend', goal: 'Two sidesteps, one spin, one fend', coach: '{b:x} sidesteps. Tap it twice to spin. {b:sq} fends the big lad off.' },
  { id: 'hit', name: 'HIT', teach: 'Tackle, big hit, dive, switch', goal: 'A tackle, a BIG HIT, a dive tackle and a switch', coach: '{b:x} tackles. HOLD {b:x} and let go for a BIG HIT. {b:sq} dives. {b:ci} switches.' },
  { id: 'ruck', name: 'RUCK', teach: 'Win the breakdown', goal: 'Win two rucks by mashing, then jackal one', coach: 'MASH {b:x} at the ruck. First man in on defence: {b:sq} to jackal!' },
  { id: 'boot', name: 'BOOT', teach: 'Grubber, punt to touch, drop goal', goal: 'A grubber, a kick to touch, a drop goal', coach: 'Tap {b:ci} for a grubber. Hold it for a punt. In their 22, hold it for a drop goal.' },
  { id: 'set', name: 'SET PIECES', teach: 'Scrum and lineout', goal: 'Win a scrum and a lineout', coach: 'Scrum: {b:x} on SET, then {b:l1} {b:r1} {b:l1} {b:r1}. Lineout: pick a pod, {b:x} to throw.' },
  { id: 'posts', name: 'POSTS', teach: 'Conversions', goal: 'Convert a try from out wide', coach: 'Move the tee back for a better angle, aim, then hold {b:ci} and let go in the band.' },
  { id: 'turbo', name: 'TURBO TIME', teach: 'Power-ups and supers', goal: 'Take the pie, then THUNDER RUN to score', coach: 'Grab the pie. Hype\'s full: {b:tri} for THUNDER RUN. Straight through them!' }
];

/* ---- records (E.Arcade tables), seeded with the cast's initials ---- */
TT.RECORD_SEED = {
  margin: [['NAN', 34], ['BIG', 31], ['JON', 28], ['ANV', 24], ['GRI', 21], ['DAV', 17], ['ROS', 14], ['BAR', 12], ['PIP', 9], ['CLU', 5]],
  tries: [['WHE', 9], ['BRE', 8], ['HED', 7], ['JET', 6], ['FRI', 5], ['NAN', 4], ['SAL', 4], ['TIL', 3], ['LUL', 3], ['BUS', 2]],
  hit: [['BIG', 84], ['ANV', 71], ['KIL', 66], ['TIN', 60], ['BER', 55], ['FRI', 48], ['NAN', 40], ['BUS', 36], ['RUS', 30], ['MOH', 24]]
};
TT.RECORD_TITLES = { margin: 'BIGGEST WINS (MARGIN)', tries: 'MOST TRIES IN A MATCH', hit: 'BIGGEST HIT (METRES FLOWN x10)' };


/* ==== 04-data-about.js ==== */
/* ---- ABOUT & CREDITS: five pages (L1 / R1 turn them), the same text as the build's report and exit-interview.json ---- */
TT.ABOUT_INFO = {
  date: '2026-11-04 06:51:21',
  source: 'Rugby (over-the-top arcade style): rugby union sevens played for laughs. An original game; every team, person and place is made up.',
  plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
  genre: 'Arcade sports (rugby sevens) with a short story campaign, a training mode and 1-4 player local and online multiplayer',
  perspective: 'A TV broadcast camera (a custom 40-degree view panning with the ball), with High (55) and Overhead (80) options and a low behind-the-kicker camera for conversions and penalty goals',
  tech: 'my-3D2dge engine v0.85.2 (the handoff package\'s full engine, with four small patches), plain JavaScript, Canvas 2D and Web Audio; the AI Hub session client 1.4.0 (unmodified); no other libraries; one self-contained HTML file',
  artDirection: 'The engine\'s native PS1-era pixel style at 320x240 (expanded to fill any screen): procedural HD Humanoid players dressed in team kits, a painted pitch with its markings and crests, stands with a bobbing crowd, sponsor boards, floodlights, venue skylines, canvas lighting, particles and string-sprite power-ups',
  animation: 'The engine\'s native procedural Humanoid rig, driven from each player\'s state; new rugby moves as attack specs in the E.MOVES format (passes, fend, tackle, big hit, kicks, throw-in, jackal) and solvePose wrappers (the ball carried in the arm, two hands ready, lineout lift, aeroplane arms, the referee\'s signals), plus dives, launches with flips, rucks, scrums and celebrations',
  audio: 'All in code with the engine\'s chip synth: seven songs with named layers (drums in the opponents\' 22, a hype layer), stings (try, monster hit, ON FIRE, sad trombone), 40 sound effects (whistles, the hooter, hits, DOINK, air horn, chicken), a crowd bed that follows the excitement, and Animalese-style babble voices for every speaker',
  online: 'AI Hub Session Protocol v1, shared-world mode, 2-4 players: the host runs the match, clients send intents and draw the host\'s snapshots, the game\'s own session card, time-up, leavers to CPU, server-hosted rounds. Also 1-4 players on one machine',
  testing: 'One command (node test/run.mjs) rebuilds and runs 71 headless checks in 7 suites that play the game through game.advance and game.debug (rules, contact, set pieces, arcade systems, a 12-match CPU soak with a phase watchdog, input and glyphs, replays, a determinism proof, all nine drills by their bots, the attract mode, dev mode, saves, 4-player local play, AI Hub sessions on an in-process hub with latency and loss, a scripted playthrough of the whole Mega Cup, and the campaign\'s other branches, every Exhibition weather and time, records and initials and the About pages through button presses); --browser adds 6 Chromium checks of the HTML file (a standard-mapping controller through navigator.getGamepads with PlayStation and, after the Settings option, Xbox prompts; keyboard and mouse hover, clicks and right-button kicks; the attract mode; a touch-only phone and its SETTINGS button; 1920x1080 and 1280x720 with DEV MODE from the pause menu); --hub runs the real AI Hub harness in all four configurations (two players; four at 150 ms with 5% loss; host leaving; server-hosted), every check passing. Screenshots only for the look. No real controller was available: the pad was simulated',
  research: 'The engine handoff package (README, API card, AI guide sections, the sports kit, the arcade and story module headers, engine source around fonts, input labels, half keyboards, dialogs, settings, views and the Humanoid) and the AI Hub protocol README, harness and arena example. No web research on rugby (general knowledge)',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'Cost and tokens unknown (not visible to the model); session time about 1 hour 45 minutes (06:51 to about 08:35)'
};
TT.FEEDBACK = {
  testing: [
    'How many issues did testing catch? About 39: 26 by the headless suites (crashes, stalls, wrong rules, unreachable moves, drills that could not be finished, balance), 3 in a real browser (2 by the AI Hub harness, and the touch stick turning itself back on for touch-only phones), and about 10 layout and look problems by screenshots.',
    'How many were critical / game breaking? 7: the game did not boot (a scene table used before it existed; storage used before it was defined, which only crashed in a real browser), tapped and held kicks never fired for humans (the meter read 0 on its first frame), kicks and passes left from the wrong spot, the session card could swallow Ready, and three drills could not be completed.',
    'The most helpful test: the scripted drills and the whole-cup playthrough, driven through the same intents a player gives; they found the dead kick button and the unreachable spin, which a CPU-only soak never would. The AI Hub harness was a close second: it found a crash only a real browser shows.',
    'The least helpful test: the defensive-shape metric. Its thresholds were mine and moved with every balance change; a screenshot of the line told me more.'
  ],
  engine: [
    'What I liked most: the Humanoid rig. Plain numbers (down, flip, crouch, attack specs) give fourteen distinct dressed people who run, tackle, dive, flip and celebrate; and the fixed-step headless game.advance made a whole match testable in milliseconds.',
    'Did I get stuck or guess wrong? A few wrong guesses: a custom view\'s yaw sign for the behind-the-kicker camera, that E.store keeps nothing where localStorage is missing, and that the pixel font had no PlayStation symbols.',
    'The most important thing I built myself: the match simulation as a plain state machine (laws, set pieces, the CPU brain, the arcade layer) that reads only intents, so live play, replays, the attract demo, drills, tests and online clients all share it.',
    'The hardest part: making set pieces (scrum, lineout, ruck, set kicks) read clearly with procedural rigs and compact widgets at 320x240, across a room.',
    'What I changed in the engine: (1) the 5x7 font got ✕ ○ □ △ (they drew as ?), plus · and ◂; (2) Input.halfKeys takes a preset\'s own per-action half-keyboard layouts; (4) E.Dialog calls onLetter for each letter, for per-letter babble voices; (5) E.Dialog takes a box width and left edge, so the commentary fits between the HUD cards. The plan\'s E.Menu scale patch was not needed: the 10-foot menus are the game\'s own.',
    'One thing I would change: named pose layers on the Humanoid (a carry, arms up, a signal) blended over the solver, instead of wrapping solvePose by hand.'
  ],
  prompt: [
    'What I liked most: it asks for a complete, polished vertical slice with real infrastructure (dev mode, attract, local and online play, tests) instead of a toy, and the plan made the scope concrete.',
    'What was confusing: the plan\'s file names and date belong to another run; STAGE.md settles it (TASK.md wins), so the files use this run\'s names.',
    'The hardest thing: the breadth. Every law and set piece, the arcade layer, five modes, three input devices with their glyphs, and an online protocol, all in one coherent game.',
    'What I would change: say which plan details are optional when time is short, and give a target length for the story campaign and the online round.'
  ]
};
TT.ABOUT = [
  { title: 'THUGBY TURBO', rows: [
    ['', 'Over-the-top arcade rugby sevens. Big hits, bigger hair, seven a side.'],
    ['MADE WITH', 'The my-3D2dge engine v0.85.2 and the AI Hub session client 1.4.0, by Anthropic\'s claude-opus-5-5 (reasoning effort xhigh), from PLAN.md.'],
    ['THE TITLE', 'Fifty playful riffs on "rugby" were brainstormed; a real random number generator (Python\'s secrets.randbelow(50), OS entropy) drew entry 17: Thugby Turbo.'],
    ['', 'An original game inspired by rugby. Every team, person, place and sponsor is made up.'],
    ['HOW TO PLAY', 'Run at their line and pass it BACKWARDS (L1 / R1 or Q / E). Tackle with X (Space), hold it for a BIG HIT. Kick with O (C). Turbo on R2 (Shift). Fill the hype meter for a SUPER on TRIANGLE (R).']
  ] },
  { title: 'SOURCE INFORMATION', rows: Object.entries({ Date: 'date', Source: 'source', Plan: 'plan', Genre: 'genre', Perspective: 'perspective', Tech: 'tech', 'Art direction': 'artDirection', Animation: 'animation', Audio: 'audio', Online: 'online', Testing: 'testing', Research: 'research', Environment: 'environment', Model: 'model', Usage: 'usage' }).map(([h, k]) => [h.toUpperCase(), TT.ABOUT_INFO[k]]) },
  { title: 'TESTING FEEDBACK', rows: TT.FEEDBACK.testing.map(t => ['', t]) },
  { title: 'ENGINE FEEDBACK', rows: TT.FEEDBACK.engine.map(t => ['', t]) },
  { title: 'PROMPT FEEDBACK', rows: TT.FEEDBACK.prompt.map(t => ['', t]) }
];
TT.CREDITS = [
  ['THUGBY TURBO', 'A Channel Thud presentation'],
  ['DESIGN, CODE, ART, MUSIC AND VOICES', 'Claude (claude-opus-5-5), from a plan by Claude at max effort'],
  ['ENGINE', 'my-3D2dge v0.85.2 by Michael Crosato'],
  ['ONLINE', 'AI Hub Session Protocol v1, client 1.4.0'],
  ['STARRING', 'The Muddington Mudlarks: The Fridge, Gravy, Tiny, Pocket Rocket, Boots, The Bus and Wheels'],
  ['AND', 'Coach Gordon Gristle, Big Dave, Barry Bellows, Ros Rucker, referee Nigel Blewitt, Sir Rupert Goldbrick, BIG UNIT Brannigan, Nan Pemberton and Captain Clucky'],
  ['THE CLUB SONG', 'Oh Muddington, oh Muddington, your mud is in my soul. We lost our boots, we lost our teeth, we never lost the ball.'],
  ['', 'Rule Seven: thanks for playing.']
];


/* ==== 10-match.js ==== */
/* =====================================================================================================================
 * THE MATCH SIMULATION. It reads only intents (from seats: devices, the network, tests) and the CPU brain, and writes
 * only its own plain state. Nothing here draws, plays a sound or reads Math.random: it emits events on TT.bus.
 * Files 10-15 extend Match.prototype: 10 core (players, movement, ball, control), 11 play (passing, kicking, carrier
 * moves, contact), 12 laws (touch, scoring, fouls, the referee, advantage, cards), 13 set pieces, 14 AI, 15 arcade.
 * ===================================================================================================================== */
const FREE = { free: 1, pass: 1, kick: 1 };          // states that accept movement
const BUTTONS = ['x', 'sq', 'ci', 'tri', 'l1', 'r1'];
TT.emptyIntent = () => ({ mx: 0, my: 0, turbo: false, pr: {}, hd: {}, rl: {}, aim: null, click: null, mkick: null, hold: {} });

class Match {
  /** o: { home, away, venue, weather ('venue' | key), time, halfLen, sudden, cup, drill, attract, session, seed, diff,
   *  homeDiff, awayDiff, seats: [{ kind, input, team, label, color }], kits } */
  constructor(o) {
    this.o = o = Object.assign({ home: 'mud', away: 'bad', venue: 'muddington', weather: 'venue', time: null, seed: 7, diff: 'Pro', sudden: false, halfLen: null }, o);
    this.rng = TT.makeRng(o.seed);
    this.venue = TT.VENUES[o.venue] || TT.VENUES.muddington;
    this.time = o.time || this.venue.time;
    const wk = o.weather && o.weather !== 'venue' ? TT.WEATHERS[o.weather] : null;
    this.weather = wk ? wk.w : this.venue.weather;
    this.windy = wk ? !!wk.wind : !!this.venue.wind;
    this.rain = !!(this.weather && this.weather.kind === 'rain');
    this.hazardKind = o.noHazard ? null : this.venue.hazard;
    this.t = 0; this.phase = 'intro'; this.sub = ''; this.phaseT = 0; this.over = false; this.result = null;
    this.half = 1; this.clock = 0; this.hooter = false; this.sudden = false; this.suddenT = 0;
    this.score = [0, 0]; this.hype = [0, 0]; this.dir = [1, -1]; this.poss = 0; this.lastScore = -1;
    this.teamIds = [o.home, o.away];
    this.teams = this.teamIds.map(id => TT.TEAMS[id]);
    this.kits = this.pickKits();
    this.diffs = [TT.DIFF[o.homeDiff || o.diff] || TT.DIFF.Pro, TT.DIFF[o.awayDiff || o.diff] || TT.DIFF.Pro];
    this.stats = [0, 1].map(() => ({ poss: 0, terr: 0, tries: 0, convs: 0, convAtt: 0, pens: 0, tackles: 0, missed: 0, bigHits: 0, monsters: 0, metres: 0, breaks: 0, turnovers: 0, offloads: 0, cards: 0, passes: 0, kicks: 0, scrums: 0, lineouts: 0, rucks: 0 }));
    this.players = [];
    for (let team = 0; team < 2; team++) this.teams[team].roster.forEach((d, slot) => this.players.push(this.makePlayer(team, slot, d)));
    this.ball = { x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, st: 'dead', holder: -1, kind: '', from: -1, to: -1, team: 0, rot: 0, spin: 0, t: 0, land: null, fwd: false, long: false, tried: {}, aimTeam: -1, power: 0, mega: false };
    this.ref = { x: G.CX, y: G.Y0 + 60, z: 0, vx: 0, vy: 0, f: PI / 2, down: 0, call: null, callT: 0, signal: '', sigT: 0, card: '' };
    this.setp = null; this.adv = null; this.cards = []; this.pending = null;
    this.powerups = []; this.puT = 18 + this.rng() * 10; this.hazards = []; this.hazT = 14 + this.rng() * 8;
    this.wind = { s: this.windy ? .5 : 0, a: this.rng() * TAU, t: 15 };
    this.events = []; this.log = []; this.banners = []; this.replayAsk = null; this.lastPassT = -9; this.lastKickT = -9;
    this.seats = (o.seats || []).map((s, i) => Object.assign({ i, pid: -1, kind: 'local', team: 0, label: 'P' + (i + 1), color: E.PLAYER_COLORS[i] || '#ffe08a', I: TT.emptyIntent(), held: {}, heldT: {}, lastSwitch: 0 }, s));
    this.watchdog = 0; this.ruckCount = 0; this.tryRun = null; this.counts = {};
    this.onFireTeam = -1; this.triesRow = {}; this.useIt = 0;
    this.kickoffTeam = 0;
    if (o.halfLen) this.halfLenOverride = o.halfLen;
    this.formation('kickoff', 0, true);
  }
  get halfLen() { return this.halfLenOverride || TUNE.v.halfLength; }
  /** kits: the away side wears its change strip when the two home jerseys are too alike */
  pickKits() {
    const [a, b] = this.teams, lum = h => { const c = E.hex(h); return .3 * c[0] + .59 * c[1] + .11 * c[2]; };
    const clash = Math.abs(lum(a.home.cloth) - lum(b.home.cloth)) < 60 || a.id === b.id;
    return [a.home, clash ? b.away : b.home];
  }
  makePlayer(team, slot, d) {
    return {
      id: team * 7 + slot, team, slot, role: d.role, d, name: d.name, nick: d.nick, boss: !!d.boss,
      spd: d.spd, pow: d.pow, hnd: d.hnd, kck: d.kck, tkl: d.tkl, size: d.size,
      x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, f: team ? PI : 0,
      st: 'free', stT: 0, stDur: 0, turbo: TUNE.v.turboTank, turboIdle: 9, turboOn: false,
      cool: 0, evade: 0, fendT: 0, stepCd: 0, fendCd: 0, lastStep: -9, charge: -1, chargeT: 0, stun: 0, mud: 0,
      ctl: -1, pu: null, fire: 0, sup: null, binT: 0, yellow: 0, cheap: 0, red: false, held: 0, holdBy: -1,
      tries: 0, tackles: 0, metres: 0, monsters: 0, breaks: 0, turnovers: 0, hitBest: 0, inGoalT: 0,
      ai: { tx: G.CX, ty: G.CY, dec: 0, wait: 0, plan: null, buy: 0, chase: false },
      a: { pose: '', down: 0, flip: 0, air: 0, act: '', u: 0, expr: '', hurt: 0, cele: 0, crouch: 0, lean: 0, spin: 0 },
      pk: 0, pkMode: '', pressT: {}
    };
  }
  /* ------------------------------------------------------------------ helpers */
  P(id) { return this.players[id]; }
  team(t) { return this.players.filter(p => p.team === t); }
  onPitch(p) { return p.st !== 'bin' && p.st !== 'off'; }
  able(p) { return FREE[p.st] === 1 || p.st === 'step' || p.st === 'spin'; }
  standing(p) { return this.onPitch(p) && p.st !== 'down' && p.st !== 'launch' && p.st !== 'dive' && p.st !== 'tdive' && p.st !== 'up'; }
  carrier() { return this.ball.st === 'held' ? this.players[this.ball.holder] : null; }
  oppLine(t) { return this.dir[t] > 0 ? G.X1 : G.X0; }
  ownLine(t) { return this.dir[t] > 0 ? G.X0 : G.X1; }
  /** how far toward the opponents' line (along team t's attack direction) */
  adv1(t, x) { return (x - G.CX) * this.dir[t]; }
  inGoal(t, x) { return this.dir[t] > 0 ? x > G.X1 : x < G.X0; }
  emit(name, data = {}) { const e = Object.assign({ t: this.t }, data); this.events.push([name, e]); TT.bus.emit(name, Object.assign({ m: this }, e)); }
  banner(text, o = {}) { this.emit('banner', Object.assign({ text }, o)); }
  refCall(key) { this.ref.call = TT.REF_CALLS[key] || key; this.ref.callT = 1.4; this.emit('refCall', { text: this.ref.call }); }
  hypeAdd(t, n) { if (t < 0 || t > 1) return; const k = n * TUNE.v.hypeMult; this.hype[t] = clamp(this.hype[t] + k, 0, 100); }
  setSt(p, st, dur = 0) { p.st = st; p.stT = 0; p.stDur = dur; }
  /** the seat driving team t's players, if any human is on that team (for set-piece presses) */
  seatsOf(t) { return this.seats.filter(s => s.team === t && s.kind !== 'cpu'); }
  /* ------------------------------------------------------------------ the step */
  step(dt) {
    if (this.over) return;
    dt *= TUNE.v.gameSpeed;
    if (dt <= 0) return;
    this.t += dt; this.phaseT += dt;
    this.control(dt);
    for (const p of this.players) p.I = p.ctl >= 0 ? this.seats[p.ctl].I : this.ai(p, dt);
    const h = this['ph_' + this.phase];
    if (h) h.call(this, dt);
    this.refStep(dt);
    this.arcadeStep(dt);
    this.statsStep(dt);
    this.watch(dt);
    for (const s of this.seats) s.I.pr = {}; // presses are one-shot
  }
  /** a phase that runs too long resolves itself (and says so: tests fail on it) */
  watch(dt) {
    const lim = { play: 1e9, ruck: 8, scrum: 14, lineout: 12, kickoff: 25, setkick: 40, penalty: 25, dead: 6, try: 14, intro: 12, half: 30, dropout: 25 }[this.phase] || 1e9;
    if (this.phaseT > lim) { this.emit('watchdog', { phase: this.phase, sub: this.sub }); this.counts.watchdog = (this.counts.watchdog || 0) + 1; this.resolveStuck(); }
  }
  resolveStuck() {
    const ph = this.phase;
    if (ph === 'ruck') this.ruckEnd(true);
    else if (ph === 'scrum' || ph === 'lineout') this.restartPlay(this.setp ? this.setp.team : this.poss, this.setp ? this.setp.x : G.CX, G.CY);
    else if (ph === 'setkick') this.setKickResult(false, 'miss');
    else if (ph === 'penalty') this.penaltyChoose(0);
    else if (ph === 'try' || ph === 'dead') this.afterDead();
    else if (ph === 'kickoff' || ph === 'dropout') this.kickoffKick(null);
    else if (ph === 'intro') this.goPhase('kickoff');
    else if (ph === 'half') this.secondHalf();
  }
  goPhase(ph, sub = '') { this.phase = ph; this.sub = sub; this.phaseT = 0; this.emit('phase', { phase: ph }); if (ph === 'kickoff') this.kickoffSetup(this.kickoffTeam, 'kickoff'); }
  /* ------------------------------------------------------------------ movement */
  speedOf(p) {
    let s = TUNE.v.runSpeed * (.8 + .04 * Math.min(10, p.spd));
    if (this.ball.holder === p.id && this.ball.st === 'held') s *= .96;
    if (this.inMud(p)) s *= .8;
    if (p.charge >= 0) s *= 1.15;
    if (p.sup && p.sup.kind === 'thunder') s *= 1.35;
    if (p.sup && p.sup.kind === 'hurricane') s *= 2;
    if (p.held > 0) s *= .4;
    if (p.boss) s *= .95;
    return s;
  }
  turboActive(p) { return p.turboOn && (p.turbo > 0 || this.unlimitedTurbo(p)); }
  unlimitedTurbo(p) { return p.fire > 0 || (p.pu && p.pu.kind === 'pie') || (TT.cheats.infTurbo && this.isHumanTeam(p.team)) || (this.o.attract); }
  isHumanTeam(t) { return this.seats.some(s => s.team === t && s.kind !== 'cpu'); }
  /** move a free player by its intent: velocity eases to the stick at the acceleration, turbo, facing */
  movePlayer(p, I, dt, mult = 1) {
    const m = Math.hypot(I.mx, I.my), mx = m > 1 ? I.mx / m : I.mx, my = m > 1 ? I.my / m : I.my;
    p.turboOn = !!I.turbo && m > .2;
    const tb = this.turboActive(p);
    let sp = this.speedOf(p) * mult * (tb ? TUNE.v.turboMult : 1);
    let acc = TUNE.v.accel * (1.15 - .03 * Math.min(10, p.pow)) * (this.inMud(p) ? .6 : 1);
    const tx = mx * sp, ty = my * sp, dx = tx - p.vx, dy = ty - p.vy, d = Math.hypot(dx, dy), step = acc * dt;
    if (d <= step) { p.vx = tx; p.vy = ty; } else { p.vx += dx / d * step; p.vy += dy / d * step; }
    if (m > .15) p.f = E.approachAng(p.f, Math.atan2(my, mx), dt * (this.ball.holder === p.id ? 8 : 10));
    // turbo tank
    if (tb && !this.unlimitedTurbo(p)) { const was = p.turbo; p.turbo = Math.max(0, p.turbo - dt); p.turboIdle = 0; if (p.turbo <= 0 && was > 0) this.emit('sputter', { id: p.id }); }
    else { p.turboIdle += dt; if (p.turboIdle > .6) p.turbo = Math.min(TUNE.v.turboTank, p.turbo + TUNE.v.turboRegen * TUNE.v.turboTank * dt); }
    if (this.unlimitedTurbo(p)) p.turbo = TUNE.v.turboTank;
    p.x += p.vx * dt; p.y += p.vy * dt;
    this.bound(p);
  }
  /** keep bodies inside the stadium (the stands stop them; out of play is a rule, not a wall) */
  bound(p) {
    p.x = clamp(p.x, G.DX0 - 40, G.DX1 + 40); p.y = clamp(p.y, G.Y0 - 38, G.Y1 + 38);
  }
  /** ease a body with no intent to a stop */
  brake(p, dt, k = 600) { p.vx = approach(p.vx, 0, k * dt); p.vy = approach(p.vy, 0, k * dt); p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); }
  /** walk a body toward a spot (formations at stoppages); returns true when there */
  walkTo(p, x, y, dt, speed = 1) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d < 2) { p.vx = p.vy = 0; p.x = x; p.y = y; return true; }
    const sp = Math.min(d / dt, this.speedOf(p) * speed);
    p.vx = approach(p.vx, dx / d * sp, 900 * dt); p.vy = approach(p.vy, dy / d * sp, 900 * dt);
    p.f = E.approachAng(p.f, Math.atan2(dy, dx), dt * 10);
    p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p);
    return false;
  }
  inMud(p) { return this.hazardKind === 'mud' && this.mudAt(p.x, p.y); }
  mudAt(x, y) { if (!this.mudBlobs) this.makeMud(); for (const b of this.mudBlobs) if ((x - b.x) ** 2 / (b.rx * b.rx) + (y - b.y) ** 2 / (b.ry * b.ry) < 1) return true; return false; }
  makeMud() {
    const R = TT.makeRng(77); this.mudBlobs = [];
    const n = 5 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) this.mudBlobs.push({ x: G.X0 + 120 + R() * (G.W - 240), y: G.Y0 + 70 + R() * (G.H - 140), rx: 40 + R() * 40, ry: 26 + R() * 24 });
  }
  /* ------------------------------------------------------------------ the players' common step (states, timers) */
  stepPlayers(dt, freeMove = true) {
    for (const p of this.players) {
      if (!this.onPitch(p)) { this.binStep(p, dt); continue; }
      p.stT += dt; p.cool = Math.max(0, p.cool - dt); p.evade = Math.max(0, p.evade - dt); p.fendT = Math.max(0, p.fendT - dt);
      p.stepCd = Math.max(0, p.stepCd - dt); p.fendCd = Math.max(0, p.fendCd - dt); p.ai.buy = Math.max(0, p.ai.buy - dt);
      if (this.inMud(p)) p.mud = Math.min(.6, p.mud + dt * .03);
      if (p.held > 0) { p.held -= dt; if (p.held <= 0) this.gangShrug(p); }
      switch (p.st) {
        case 'free': case 'pass': case 'kick':
          if (p.st !== 'free' && p.stT >= p.stDur) this.setSt(p, 'free');
          if (freeMove) this.movePlayer(p, p.I, dt, p.st === 'free' ? 1 : .55); else this.brake(p, dt);
          this.actions(p, p.I, dt);
          break;
        case 'step': p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); if (p.I && p.I.pr.x && p.stT > .02 && this.ball.holder === p.id && this.ball.st === 'held') { this.doSpin(p); break; } if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'spin': this.movePlayer(p, p.I, dt, .85); p.a.spin = p.stT / p.stDur; if (p.stT >= p.stDur) { this.setSt(p, 'free'); p.vx *= .85; p.vy *= .85; } break;
        case 'lunge': p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); if (p.stT >= p.stDur) this.setSt(p, 'stumble', .5); break;
        case 'stumble': this.brake(p, dt, 300); if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'dive': this.diveStep(p, dt); break;
        case 'tdive': { const k = Math.exp(-dt * 4); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; this.bound(p); if (p.stT >= p.stDur) this.setSt(p, 'down', .5); break; }
        case 'down': this.brake(p, dt, 500); if (p.stT >= p.stDur && !p.pin) this.setSt(p, 'up', .4); break;
        case 'up': this.brake(p, dt); if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'launch': this.launchStep(p, dt); break;
        case 'stun': this.brake(p, dt); if (p.stT >= p.stDur) this.setSt(p, 'free'); break;
        case 'cele': this.brake(p, dt, 200); break;
        case 'ruck': case 'set': break;   // the set piece moves them
      }
      if (p.charge >= 0) this.chargeStep(p, dt);
    }
    this.separate();
  }
  /** players push apart a little (no stacking), except those locked in rucks and set pieces */
  separate() {
    const L = this.players;
    for (let i = 0; i < L.length; i++) {
      const a = L[i]; if (!this.onPitch(a) || a.st === 'ruck' || a.st === 'set' || a.st === 'launch') continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j]; if (!this.onPitch(b) || b.st === 'ruck' || b.st === 'set' || b.st === 'launch') continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 8 + (a.boss || b.boss ? 6 : 0);
        if (d > 0 && d < min) { const k = (min - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
      }
    }
  }
  /* ------------------------------------------------------------------ the ball */
  stepBall(dt) {
    const b = this.ball;
    b.rot += dt * (b.st === 'air' ? (b.kind === 'pass' ? 18 : 12) : b.st === 'loose' ? Math.hypot(b.vx, b.vy) * .08 : 0);
    if (b.st === 'held') {
      const c = this.players[b.holder];
      if (!c) { b.st = 'loose'; return; }
      const f = c.f, side = c.team ? -1 : 1;
      b.x = c.x + Math.cos(f) * 3 + Math.cos(f + PI / 2) * 3 * side; b.y = c.y + Math.sin(f) * 3 + Math.sin(f + PI / 2) * 3 * side;
      b.z = c.z + (c.st === 'down' || c.st === 'tdive' ? 3 : 15 * c.size); b.vx = c.vx; b.vy = c.vy; b.vz = 0;
      return;
    }
    if (b.st === 'dead' || b.st === 'placed') { b.vx = b.vy = b.vz = 0; return; }
    b.t += dt;
    const x0 = b.x, y0 = b.y;
    if (b.st === 'air' || b.z > 0.5) {
      b.vz -= 600 * dt;
      const drag = Math.exp(-dt * .3); b.vx *= drag; b.vy *= drag;
      if (this.wind.s > 0 && b.kind !== 'pass') { const w = 40 * this.wind.s * TUNE.v.windMult * dt; b.vx += Math.cos(this.wind.a) * w; b.vy += Math.sin(this.wind.a) * w; }
    } else { const f = Math.exp(-dt * (this.rain ? 1.1 : 1.4)); b.vx *= f; b.vy *= f; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    // the goal plane: kicks at the posts are judged as they cross the try line
    if (b.aimTeam >= 0) this.postCheck(b, x0, y0);
    if (b.z <= 0 && b.vz < 0) {
      b.z = 0;
      if (b.vz < -30) {
        // the oval bounce: the ground velocity turned by up to 70 degrees, the rebound anything from dead to lively
        const ch = TUNE.v.bounceChaos * (b.kind === 'grubber' ? 1.4 : 1);
        const a = (this.rng() * 2 - 1) * 70 * PI / 180 * ch, c = Math.cos(a), s = Math.sin(a);
        const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
        const hk = b.kind === 'grubber' && this.rng() < .3 ? 1.6 : 1;
        b.vx = vx * .8; b.vy = vy * .8; b.vz = -b.vz * .45 * (.3 + this.rng() * .95) * hk;
        if (b.vz < 12) b.vz = 0;
        this.emit('bounce', { x: b.x, y: b.y, v: Math.abs(b.vz) });
      } else b.vz = 0;
      if (b.st === 'air') this.ballLands();
      b.st = 'loose';
    }
    // the ball is not stopped by anything but the ground; the stands' fronts stop a rolling ball
    if (b.x < 30) { b.x = 30; b.vx = Math.abs(b.vx) * .4; } if (b.x > G.COLS * T - 30) { b.x = G.COLS * T - 30; b.vx = -Math.abs(b.vx) * .4; }
    if (b.y < 50) { b.y = 50; b.vy = Math.abs(b.vy) * .4; } if (b.y > G.Y1 + 60) { b.y = G.Y1 + 60; b.vy = -Math.abs(b.vy) * .4; }
  }
  /** a pass or kick in the air came down without being caught */
  ballLands() {
    const b = this.ball;
    if (b.kind === 'pass' && b.fwd) { this.forwardPass(b.from, b.x, b.y); return; }
    if (b.kind === 'kickoff' && this.kickoffCheck(null)) return;
    if (b.kind === 'pass') this.emit('spill', { x: b.x, y: b.y });
    b.aimTeam = -1;
  }
  /** release the ball from its holder into the air: velocity (vx, vy, vz) and what it is */
  release(p, vx, vy, vz, kind, to = -1) {
    const b = this.ball;
    if (p) { b.x = p.x + Math.cos(p.f) * 4; b.y = p.y + Math.sin(p.f) * 4; }   // from the passer's or kicker's hands
    b.st = 'air'; b.holder = -1; b.vx = vx; b.vy = vy; b.vz = vz; b.kind = kind; b.from = p ? p.id : -1; b.to = to; b.t = 0;
    b.team = p ? p.team : b.team; b.tried = {}; b.fwd = false; b.z = Math.max(b.z, kind === 'pass' ? 14 : 4);
    b.t0Key = this.t; b.spillFwd = false;
    if (p) { this.poss = p.team; p.cool = .25; }
    b.land = this.predictLanding();
  }
  /** where the ball in the air will come down (no wind, no bounce): for landing rings and catchers */
  predictLanding() {
    const b = this.ball, g = 600, t = (b.vz + Math.sqrt(Math.max(0, b.vz * b.vz + 2 * g * b.z))) / g;
    const k = (1 - Math.exp(-.3 * t)) / .3;   // horizontal drag
    return { x: b.x + b.vx * k, y: b.y + b.vy * k, t };
  }
  /** a player takes the ball */
  give(p, how = 'catch') {
    const b = this.ball, prevTeam = b.st === 'held' ? this.players[b.holder].team : b.team;
    b.st = 'held'; b.holder = p.id; b.kind = ''; b.to = -1; b.aimTeam = -1; b.t = 0; b.team = p.team;
    if (this.poss !== p.team || prevTeam !== p.team) { this.emit('possession', { team: p.team, id: p.id, how }); }
    this.poss = p.team; p.inGoalT = 0; p.carryX = p.x;
    this.emit('catch', { id: p.id, how });
  }
  /* ------------------------------------------------------------------ control: which player each seat drives */
  control(dt) {
    for (const s of this.seats) {
      if (s.kind === 'cpu') continue;
      let p = this.players[s.pid];
      if (!p || p.team !== s.team || !this.onPitch(p) || p.ctl !== s.i) { this.assign(s, this.bestFor(s)); p = this.players[s.pid]; }
      const I = s.I, c = this.carrier();
      // the team gains the ball: the seat takes the carrier (with two humans on a side, the nearer one)
      if (c && c.team === s.team && c.id !== s.pid && c.ctl < 0) {
        const mates = this.seats.filter(q => q.team === s.team && q.kind !== 'cpu' && q !== s);
        const nearer = mates.every(q => { const qp = this.players[q.pid]; return !qp || dist(this.players[s.pid] || c, c) <= dist(qp, c) || this.players[q.pid] === c; });
        if (nearer && this.phase !== 'scrum' && this.phase !== 'lineout') this.assign(s, c.id);
      }
      if (this.phase === 'setkick' || this.phase === 'penalty') continue;
      const cur = this.players[s.pid];
      const mine = c && c.team === s.team;
      if (!mine && this.phase === 'play') {
        // buttons: L1 / R1 move up / down the line, O to the man nearest the ball, a click on a teammate
        if (I.pr.l1 || I.pr.r1) this.switchLine(s, I.pr.l1 ? -1 : 1);
        else if (I.pr.ci && !(cur && cur.sup)) this.assign(s, this.nearestBall(s.team, s));
        if (I.click >= 0 && I.click !== null) { const q = this.players[I.click]; if (q && q.team === s.team && this.canTake(q, s)) this.assign(s, q.id); }
        // auto-switch (Settings, Game): Assisted on each pass or kick, and when no one is in range; Full: always the best
        const mode = this.o.autoSwitch || 'Assisted';
        if (mode !== 'Manual' && cur && !(cur.sup && cur.sup.kind === 'hurricane') && cur.charge < 0) {
          if (mode === 'Full' && this.t - s.lastSwitch > .5) { const b = this.bestDefender(s.team, s); if (b >= 0 && b !== s.pid) this.assign(s, b, true); }
          if (mode === 'Assisted' && (this.ball.t < .02 && this.ball.st === 'air' && this.ball.team !== s.team && this.t - s.lastSwitch > .3)) { const b = this.bestDefender(s.team, s); if (b >= 0 && b !== s.pid) this.assign(s, b, true); }
          if (cur.st === 'down' || cur.st === 'up' || cur.st === 'dive' || cur.st === 'launch') { if (this.t - s.lastSwitch > .4) { const b = this.bestDefender(s.team, s); if (b >= 0 && b !== s.pid) this.assign(s, b, true); } }
        }
      }
      if (this.phase === 'play' && this.ball.st !== 'held' && this.ball.team === s.team && this.ball.kind === 'pass' && this.ball.to >= 0) {
        const rcv = this.players[this.ball.to]; if (rcv && rcv.ctl < 0 && rcv.team === s.team && this.ball.t > .05) this.assign(s, rcv.id);
      }
    }
  }
  canTake(p, s) { return p && p.team === s.team && this.onPitch(p) && (p.ctl < 0 || p.ctl === s.i) && p.st !== 'down' && p.st !== 'launch' && !(this.parked && this.parked.has(p.id)); }
  assign(s, id, auto) {
    if (id < 0 || id === undefined) return;
    const old = this.players[s.pid]; if (old && old.ctl === s.i) old.ctl = -1;
    const p = this.players[id]; if (!p) return;
    if (p.ctl >= 0 && p.ctl !== s.i) return;
    s.pid = id; p.ctl = s.i; s.lastSwitch = this.t;
    if (p.charge >= 0 && !s.I.hd.x) p.charge = -1;
    this.emit('switch', { seat: s.i, id, auto: !!auto });
  }
  bestFor(s) {
    const c = this.carrier();
    if (c && c.team === s.team && (c.ctl < 0 || c.ctl === s.i)) return c.id;
    const b = this.bestDefender(s.team, s); if (b >= 0) return b;
    const any = this.players.find(p => this.canTake(p, s)); return any ? any.id : -1;
  }
  nearestBall(team, s) {
    let best = -1, bd = 1e9; const b = this.ball;
    for (const p of this.players) if (p.team === team && this.canTake(p, s)) { const d = dist2(p.x, p.y, b.x, b.y); if (d < bd) { bd = d; best = p.id; } }
    return best;
  }
  /** the defender best placed to make the tackle: the soonest to reach where the ball is going */
  bestDefender(team, s) {
    const b = this.ball, c = this.carrier(), tx = c ? c.x + c.vx * .3 : (b.land && b.st === 'air' ? b.land.x : b.x), ty = c ? c.y + c.vy * .3 : (b.land && b.st === 'air' ? b.land.y : b.y);
    let best = -1, bd = 1e9;
    for (const p of this.players) {
      if (p.team !== team || !this.canTake(p, s || { i: -9, team })) continue;
      if (p.st === 'down' || p.st === 'up' || p.st === 'dive') continue;
      const d = dist2(p.x, p.y, tx, ty) / (this.speedOf(p) * .01 + 1);
      if (d < bd) { bd = d; best = p.id; }
    }
    return best;
  }
  /** move a seat's control one man up (-1, toward the far touchline: smaller y) or down the line */
  switchLine(s, side) {
    const cur = this.players[s.pid]; if (!cur) return;
    const c = this.players.filter(p => p.team === s.team && p.id !== cur.id && this.canTake(p, s) && (p.y - cur.y) * side > 0)
      .sort((a, b) => Math.abs(a.y - cur.y) - Math.abs(b.y - cur.y))[0];
    if (c) this.assign(s, c.id);
  }
}
TT.Match = Match;


/* ==== 11-play.js ==== */
/* ---- OPEN PLAY: what a player's buttons do (with the ball and without it), passing, kicking, catching and contact ---- */
Object.assign(Match.prototype, {
  /** one free player's buttons this step (humans) or commands (the CPU brain: I.cmd) */
  actions(p, I, dt) {
    const b = this.ball, has = b.st === 'held' && b.holder === p.id;
    if (has) this.carrierActions(p, I, dt); else this.defenderActions(p, I, dt);
  },
  carrierActions(p, I, dt) {
    const cmd = I.cmd, t = this.t;
    if (this.phase !== 'play') return;
    p.charge = -1;
    if (cmd) {   // the CPU's (and the attract director's) decisions
      if (cmd.pass !== undefined) { const r = typeof cmd.pass === 'number' ? this.players[cmd.pass] : this.passTarget(p, cmd.pass, cmd.long); if (r) this.doPass(p, r, !!cmd.long); else this.dummy(p, cmd.pass); }
      else if (cmd.kick) this.doKick(p, cmd.kick.kind, cmd.kick.x, cmd.kick.y, cmd.kick.power, cmd.kick.touch ? { exact: true, apex: 45 } : {});
      else if (cmd.step) this.doStep(p, cmd.step);
      else if (cmd.spin) this.doSpin(p);
      else if (cmd.fend) this.doFend(p);
      else if (cmd.super) this.doSuper(p);
      else if (cmd.ground) this.doGround(p);
      return;
    }
    // L1 / R1: a tap passes short (on letting go), held past .25 s it passes long (at once)
    for (const k of ['l1', 'r1']) {
      if (I.pr[k]) p.pressT[k] = t;
      if (p.pressT[k] !== undefined && p.pressT[k] !== null) {
        const held = t - p.pressT[k], side = k === 'l1' ? -1 : 1;
        if (I.rl[k] || !I.hd[k] || held >= .25) {
          p.pressT[k] = null;
          if (p.cool > 0 && held < .25) continue;
          const r = this.passTarget(p, side, held >= .25);
          if (r) this.doPass(p, r, held >= .25); else this.dummy(p, side);
          return;
        }
      }
    }
    if (I.click !== null && I.click >= 0) { const r = this.players[I.click]; if (r && r.team === p.team && r.id !== p.id && this.standing(r)) { this.doPass(p, r, dist(p, r) > 110); return; } }
    if (I.mkick && I.mkick.done) { this.mouseKick(p, I.mkick); return; }
    // O: a tap is a grubber; held, the meter fills (the stick aims; pulled back is a bomb; in their 22, a drop goal)
    if (I.pr.ci) { p.pk = 0.0001; p.pkT = t; p.pkDir = p.f; }
    if (p.pk > 0) {
      const held = t - p.pkT;
      if (I.hd.ci && !I.rl.ci) { p.pk = clamp(held / .9, .0001, 1); p.pkMode = this.kickMode(p, I); return; }
      p.pk = 0;
      if (held < .2) { const a = this.stickAim(p, I, PI / 4); return this.doKick(p, 'grubber', p.x + Math.cos(a) * 170, p.y + Math.sin(a) * 170, .5); }
      return this.kickByMode(p, this.kickMode(p, I), Math.min(1, held / .9), I);
    }
    if (I.pr.x) {
      if (this.inGoal(p.team, p.x)) return this.doGround(p);
      if (t - p.lastStep < .3 && p.st === 'step') return this.doSpin(p);   // a second tap during the sidestep: a spin
      p.lastStep = t;
      const side = Math.abs(I.my) > .3 || Math.abs(I.mx) > .3 ? this.stickSide(p, I) : this.awaySide(p);
      return this.doStep(p, side);
    }
    if (I.pr.sq) return this.doFend(p);
    if (I.pr.tri) return this.doSuper(p);
  },
  /** which side (+1 / -1, perpendicular to the run, +1 = to the runner's right) the stick says */
  stickSide(p, I) { const rx = -Math.sin(p.f), ry = Math.cos(p.f); return (I.mx * rx + I.my * ry) >= 0 ? 1 : -1; },
  awaySide(p) {
    const d = this.nearestFoe(p); if (!d) return 1;
    const rx = -Math.sin(p.f), ry = Math.cos(p.f); return ((d.x - p.x) * rx + (d.y - p.y) * ry) > 0 ? -1 : 1;
  },
  nearestFoe(p, max = 1e9) { let best = null, bd = max; for (const q of this.players) if (q.team !== p.team && this.standing(q)) { const d = dist(p, q); if (d < bd) { bd = d; best = q; } } return best; },
  /** the stick's direction as a kick's aim, within a cone either side of the attack direction */
  stickAim(p, I, cone) {
    const fwd = this.dir[p.team] > 0 ? 0 : PI;
    if (Math.hypot(I.mx, I.my) < .3) return fwd;
    let a = Math.atan2(I.my, I.mx), d = angDiff(fwd, a);
    if (Math.abs(d) > PI / 2 + .2) return fwd + (d > 0 ? cone : -cone) * .3;   // pulled back: straight (a bomb uses this)
    return fwd + clamp(d, -cone, cone);
  },
  /** what a held kick is: a drop goal in range facing the posts; a bomb with the stick pulled back; else a punt */
  kickMode(p, I) {
    const back = (I.mx * this.dir[p.team]) < -.5;
    if (back) return 'bomb';
    const gx = this.oppLine(p.team), dg = dist2(p.x, p.y, gx, G.CY), facing = Math.abs(angDiff(p.f, Math.atan2(G.CY - p.y, gx - p.x))) < 1.2;
    const in22 = this.adv1(p.team, p.x) > G.W / 2 - G.L22;
    const toTouch = Math.abs(I.my) > .6 && Math.abs(I.mx) < .5;
    if ((in22 || (dg < 300 && facing)) && !toTouch) return 'drop';
    return 'punt';
  },
  kickByMode(p, mode, power, I) {
    if (mode === 'drop') { const gx = this.oppLine(p.team), a = Math.atan2(G.CY - p.y, gx - p.x) + clamp(I.my * this.dir[p.team], -1, 1) * 8 * PI / 180; return this.doKick(p, 'drop', p.x + Math.cos(a) * 200, p.y + Math.sin(a) * 200, power); }
    const a = this.stickAim(p, I, 70 * PI / 180), dist0 = 300;
    return this.doKick(p, mode === 'bomb' ? 'bomb' : 'punt', p.x + Math.cos(a) * dist0, p.y + Math.sin(a) * dist0, power);
  },
  /** the mouse: right button held and let go kicks toward the cursor (the meter fills toward it) */
  mouseKick(p, mk) {
    const gx = this.oppLine(p.team), facing = Math.abs(angDiff(p.f, Math.atan2(G.CY - p.y, gx - p.x))) < 1.2;
    const in22 = this.adv1(p.team, p.x) > G.W / 2 - G.L22, toPosts = Math.abs(mk.y - G.CY) < 60 && Math.abs(mk.x - gx) < 80;
    if ((in22 || facing) && toPosts) return this.doKick(p, 'drop', mk.x, mk.y, mk.power);
    const d = dist2(p.x, p.y, mk.x, mk.y);
    if (mk.power < .2 || d < 150) return this.doKick(p, 'grubber', mk.x, mk.y, .5);
    return this.doKick(p, (mk.x - p.x) * this.dir[p.team] < -10 ? 'bomb' : 'punt', mk.x, mk.y, mk.power, { exact: true });
  },
  /* ---- passing ---- */
  /** legal receivers: teammates not in front of the passer, within 220, standing; side -1 up the screen, +1 down */
  legalReceivers(p, side) {
    const d = this.dir[p.team];
    return this.players.filter(r => r.team === p.team && r.id !== p.id && this.standing(r) && FREE[r.st] && !(this.parked && this.parked.has(r.id)) && (r.x - p.x) * d <= 4 && dist(p, r) < 220 && (!side || (r.y - p.y) * side > 0));
  },
  passTarget(p, side, long) {
    let L = this.legalReceivers(p, side);
    if (!L.length && (this.o.passAssist !== false)) L = this.legalReceivers(p, -side);
    if (!L.length) return null;
    L.sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y));
    const near = L.filter(r => Math.abs(r.y - p.y) < 110 || dist(p, r) < 110);
    if (long) return L[1] || L[0];
    return near[0] || L[0];
  },
  doPass(p, r, long, offload) {
    const sp = (long ? 300 : TUNE.v.passSpeed) * (offload ? .8 : 1);
    let tx = r.x, ty = r.y;
    for (let k = 0; k < 2; k++) { const tt = dist2(p.x, p.y, tx, ty) / sp; tx = r.x + r.vx * tt * .9; ty = r.y + r.vy * tt * .9; }
    const tt = Math.max(.12, dist2(p.x, p.y, tx, ty) / sp);
    const v = E.arc({ x: this.ball.x, y: this.ball.y, z: 14 }, { x: tx, y: ty, z: 14 }, 600, { time: tt });
    this.release(p, v.vx, v.vy, v.vz, 'pass', r.id);
    this.ball.long = !!long; this.ball.offload = !!offload;
    // forward, judged as the law does, relative to the passer's own run
    this.ball.fwd = ((v.vx - p.vx) * this.dir[p.team]) > 4;
    this.setSt(p, 'pass', .22); p.a.act = long ? 'passL' : 'pass'; p.a.u = 0; p.a.side = (r.y - p.y) > 0 ? 1 : -1;
    this.stats[p.team].passes++; this.lastPassT = this.t;
    this.emit('pass', { id: p.id, to: r.id, long: !!long, offload: !!offload, fwd: this.ball.fwd });
    if (offload) { this.stats[p.team].offloads++; this.hypeAdd(p.team, 6); this.emit('offload', { id: p.id }); }
    if (p.sup && p.sup.kind === 'thunder') this.endSuper(p);
  },
  /** a pass button with nobody there: the carrier sells it, and defenders who see it may buy it */
  dummy(p, side) {
    if (p.cool > 0) return;
    p.cool = .4; this.setSt(p, 'pass', .2); p.a.act = 'dummy'; p.a.u = 0; p.a.side = side;
    let sold = 0;
    for (const q of this.players) if (q.team !== p.team && this.standing(q) && dist(p, q) < 40 && Math.abs(angDiff(q.f, angTo(q, p))) < 1.2 && this.rng() < .4) { q.ai.buy = .3; q.ai.buySide = side; sold++; if (q.st === 'free') { q.vx *= .3; q.vy *= .3; q.f += side * .8; } }
    if (sold) { this.hypeAdd(p.team, 4 * sold); this.emit('dummy', { id: p.id, sold }); }
  },
  /* ---- kicking ---- */
  doKick(p, kind, tx, ty, power = .7, o = {}) {
    const kck = Math.min(10, p.kck), mega = !!(this.megaBoot && this.megaBoot[p.team] > 0), fire = p.fire > 0;
    let a = Math.atan2(ty - p.y, tx - p.x), d = dist2(p.x, p.y, tx, ty), vz, apex;
    const sweet = power > .9 || mega;
    const hook = sweet ? 0 : (this.rng() * 2 - 1) * (11 - kck) * PI / 180 * (1 - power * .5);
    if (kind === 'grubber') { d = clamp(d, 120, 200); a += hook * .5; const sp = d * 1.25; this.release(p, Math.cos(a) * sp, Math.sin(a) * sp, 40, 'grubber'); this.ball.z = 3; }
    else {
      let len = lerp(120, TUNE.v.kickMax, power) * (.75 + .03 * kck);
      if (o.exact) len = Math.min(len, d * 1.02);
      if (sweet) len *= 1.08; if (mega) len *= 1.6; if (fire) len *= 1.2;
      apex = o.apex || (kind === 'bomb' ? 150 : kind === 'drop' ? 55 + power * 25 : 60 + power * 50);
      if (kind === 'bomb') len *= .5;
      if (kind === 'drop') a += hook * .6; else a += hook;
      const lx = p.x + Math.cos(a) * len, ly = p.y + Math.sin(a) * len;
      const v = E.arc({ x: p.x, y: p.y, z: 8 }, { x: lx, y: ly, z: 0 }, 600, { apex });
      this.release(p, v.vx, v.vy, v.vz, kind); this.ball.z = 8;
      if (kind === 'drop') this.ball.aimTeam = p.team;
    }
    this.ball.mega = mega; this.ball.power = power;
    if (mega) this.megaBoot[p.team] = 0;
    this.setSt(p, 'kick', .35); p.a.act = kind === 'drop' ? 'drop' : 'kick'; p.a.u = 0;
    this.stats[p.team].kicks++; this.lastKickT = this.t;
    this.emit('kick', { id: p.id, kind, power, mega, x: p.x, y: p.y });
    if (p.sup && p.sup.kind === 'thunder') this.endSuper(p);
  },
  /* ---- running moves ---- */
  doStep(p, side) {
    if (p.stepCd > 0) return;
    const rx = -Math.sin(p.f) * side, ry = Math.cos(p.f) * side, sp = this.speedOf(p) * .9;
    p.vx = Math.cos(p.f) * sp * .7 + rx * TUNE.v.sidestepPower; p.vy = Math.sin(p.f) * sp * .7 + ry * TUNE.v.sidestepPower;
    this.setSt(p, 'step', .22); p.evade = TUNE.v.sidestepEvade; p.stepCd = .6; p.a.act = 'step'; p.a.side = side; p.a.u = 0;
    this.emit('sidestep', { id: p.id, side });
  },
  doSpin(p) {
    this.setSt(p, 'spin', .4); p.evade = .4; p.stepCd = .8; p.a.act = 'spin'; p.a.u = 0; p.spinBeat = 0;
    this.emit('spin', { id: p.id });
  },
  doFend(p) {
    if (p.fendCd > 0) return;
    p.fendT = TUNE.v.fendWindow * (p.fire > 0 ? 1.5 : 1); p.fendCd = .8; p.a.act = 'fend'; p.a.u = 0; p.a.fendT = .5;
    this.emit('fendOut', { id: p.id });
  },
  /** grounding in the in-goal: a dive, then the try */
  doGround(p) {
    if (!this.inGoal(p.team, p.x)) return;
    const d = this.dir[p.team];
    this.setSt(p, 'tdive', .45); p.vx = d * 110 + p.vx * .3; p.vy *= .5; p.a.act = 'tdive'; p.a.u = 0; p.dived = true;
    this.hypeAdd(p.team, 3);
  },
  /* ---- without the ball ---- */
  defenderActions(p, I, dt) {
    const cmd = I.cmd, t = this.t;
    if (this.phase !== 'play') { p.charge = -1; return; }
    if (cmd) {
      if (cmd.tackle) this.doTackle(p, false);
      else if (cmd.big) { if (p.charge < 0) { p.charge = 0; p.chargeT = 0; } if (cmd.big === 'go') this.doTackle(p, true, p.charge); }
      else if (cmd.dive) this.doDive(p);
      else if (cmd.super) this.doSuper(p);
      else if (cmd.cheap !== undefined) { const v = this.players[cmd.cheap]; if (v) this.cheapShot(p, v); }
      else if (cmd.jackal) this.jackal(p);
      return;
    }
    if (I.pr.x) { p.pressT.x = t; }
    if (p.pressT.x !== null && p.pressT.x !== undefined) {
      const held = t - p.pressT.x;
      if (I.hd.x && !I.rl.x) { if (held > .15 && p.charge < 0) { p.charge = 0; p.chargeT = 0; this.emit('chargeStart', { id: p.id }); } }
      else { p.pressT.x = null; if (p.charge >= 0) this.doTackle(p, true, p.charge); else this.doTackle(p, false); }
    }
    if (I.pr.sq) { if (this.phase === 'ruck') this.jackal(p); else this.doDive(p); }
    if (I.pr.tri) this.doSuper(p);
  },
  chargeStep(p, dt) {
    if (!FREE[p.st]) { p.charge = -1; return; }
    p.chargeT += dt; p.charge = Math.min(1, p.chargeT / TUNE.v.bigHitCharge);
    // the CPU lets go itself when the carrier is close (its decision sets cmd.big = 'go')
  },
  /** a tackle (or, held and let go, a big hit). No carrier in reach: a shoulder on a man without the ball, or a whiff */
  doTackle(p, big, ch = 0) {
    const c = this.carrier(), over = p.chargeT > 1.2;
    p.charge = -1; const chT = p.chargeT; p.chargeT = 0;
    if (p.cool > 0 || !FREE[p.st]) return;
    const range = (big ? 18 : TUNE.v.tackleRange) + (c ? (c.size - 1) * 8 : 0) + (p.size - 1) * 6;
    if (!c || c.team === p.team || dist(p, c) > range + 4 || (Math.abs(angDiff(p.f, angTo(p, c))) > 70 * PI / 180 && !(c.held > 0))) {
      // a man without the ball, in front and close: a cheap shot (a foul if the referee sees it)
      const v = this.players.find(q => q.team !== p.team && this.standing(q) && q !== c && dist(p, q) < 14 + (q.size - 1) * 6 && Math.abs(angDiff(p.f, angTo(p, q))) < 1.2);
      if (v && !big) return this.cheapShot(p, v);
      // a whiff: a short lunge at nothing
      this.setSt(p, 'lunge', .18); p.vx = Math.cos(p.f) * 120; p.vy = Math.sin(p.f) * 120; p.a.act = 'lunge'; p.a.u = 0; p.cool = .4;
      if (c && c.team !== p.team && dist(p, c) < 34) { this.stats[p.team].missed++; this.emit('missedTackle', { id: p.id, on: c.id }); }
      if (big) { this.setSt(p, 'down', 1.0); p.a.act = 'sprawl'; }
      return;
    }
    this.contact(p, c, big ? (ch >= 1 ? 'monster' : 'big') : 'tackle', { over: over && big, charge: ch, chT });
  },
  /** tackler p meets carrier c: kind 'tackle' | 'big' | 'monster' | 'dive' | 'hurricane' */
  contact(p, c, kind, o = {}) {
    const front = Math.abs(angDiff(c.f, angTo(c, p))) < 1.0;   // the tackler meets him head on
    const D = this.diffs[p.team], human = this.isHumanTeam(p.team) && p.ctl >= 0;
    // a sidestep or spin in its window: the tackle meets thin air
    if (c.evade > 0 && kind !== 'hurricane') {
      this.setSt(p, 'stumble', .5); p.vx *= .2; p.vy *= .2; p.a.act = 'whiff';
      this.stats[p.team].missed++; this.hypeAdd(c.team, 6); this.emit('missedTackle', { id: p.id, on: c.id, beaten: true });
      if (kind === 'monster' || kind === 'big' || kind === 'dive') this.setSt(p, 'down', kind === 'dive' ? 1.2 : 1.0);
      return;
    }
    // THUNDER RUN: unstoppable; tacklers bounce off like skittles
    if (c.sup && c.sup.kind === 'thunder' && kind !== 'hurricane') return this.skittle(p, c);
    if (TT.cheats.god && this.isHumanTeam(c.team) && !this.isHumanTeam(p.team)) return this.brokenTackle(p, c);
    const iron = p.pu && p.pu.kind === 'iron', cIron = c.pu && c.pu.kind === 'iron';
    // the fend: the stiff arm out
    if (c.fendT > 0 && kind !== 'hurricane' && !iron) {
      let beat = TUNE.v.fendBeat + .03 * (Math.min(12, c.pow) - Math.min(10, p.tkl));
      if (kind === 'big' || kind === 'monster') beat /= 2;
      if (cIron || c.boss) beat = 1;
      if (this.rng() < beat) return this.fended(p, c);
    }
    let chance;
    if (kind === 'hurricane' || iron) chance = 1;
    else if (kind === 'big' || kind === 'monster') chance = .7 + .2 * (o.charge || 0);
    else chance = TUNE.v.tackleBase * (.9 + .02 * Math.min(10, p.tkl) - .02 * Math.min(12, c.pow)) + (front ? 0 : .1) + (human ? 0 : D.tackle) - (this.turboActive(c) ? .05 : 0) + (kind === 'dive' ? .05 : 0) + (this.inMud(c) ? .1 : 0);
    if (c.pu && c.pu.kind === 'grease' && kind !== 'hurricane') chance *= .3;
    if (c.fire > 0 && kind !== 'hurricane') chance *= .6;
    if (cIron && kind !== 'hurricane') chance *= .5;
    if (this.rng() >= chance) return this.brokenTackle(p, c, kind);
    // the boss is held, not felled, by one man: a second within a second brings him down
    if (c.boss && kind !== 'hurricane' && !(c.held > 0 && c.holdBy !== p.id)) return this.gangHold(p, c);
    if (o.over && front && kind !== 'hurricane') this.foul(p, 'highShot', { victim: c.id });
    this.tackled(p, c, kind === 'big' && iron ? 'monster' : kind, o);
  },
  tackled(p, c, kind, o = {}) {
    const d = angTo(p, c);
    this.stats[p.team].tackles++; p.tackles++;
    c.held = 0; c.holdBy = -1;
    if (c.sup) this.endSuper(c);
    if (kind === 'monster' || kind === 'hurricane') return this.monsterHit(p, c, kind);
    if (kind === 'big') {
      this.stats[p.team].bigHits++; this.hypeAdd(p.team, 10);
      this.setSt(p, 'lunge', .12); p.a.act = 'hit'; p.a.u = 0; p.vx = Math.cos(d) * 60; p.vy = Math.sin(d) * 60;
      this.setSt(c, 'down', 9); c.pin = true; c.tackledT = 0; c.vx = Math.cos(d) * 90; c.vy = Math.sin(d) * 90; c.a.act = 'hitBack';
      this.emit('bigHit', { id: p.id, on: c.id, x: c.x, y: c.y });
    } else {
      this.hypeAdd(p.team, 4);
      this.setSt(p, 'lunge', .14); p.a.act = kind === 'dive' ? 'dive' : 'tackle'; p.a.u = 0; p.vx = Math.cos(d) * 50; p.vy = Math.sin(d) * 50;
      this.setSt(c, 'down', 9); c.pin = true; c.tackledT = 0; c.vx *= .4; c.vy *= .4; c.a.act = 'tackled';
      this.emit(kind === 'dive' ? 'diveTackle' : 'tackle', { id: p.id, on: c.id, x: c.x, y: c.y });
    }
    p.tackleBy = c.id; c.tackler = p.id; p.afterTackle = .55;
  },
  /** a full-charge hit (or HURRICANE HIT): the carrier launched, flipped, the ball maybe loose */
  monsterHit(p, c, kind) {
    const d = angTo(p, c), L = TUNE.v.bigHitLaunch * (kind === 'hurricane' ? 1.4 : 1), dist0 = (30 + this.rng() * 30) * L;
    this.stats[p.team].monsters++; this.stats[p.team].bigHits++; p.monsters++;
    this.hypeAdd(p.team, 16);
    this.setSt(p, 'lunge', .14); p.a.act = 'hit'; p.a.u = 0; p.vx = Math.cos(d) * 40; p.vy = Math.sin(d) * 40;
    const tAir = .55 + .1 * L;
    this.setSt(c, 'launch', tAir); c.vx = Math.cos(d) * dist0 / tAir; c.vy = Math.sin(d) * dist0 / tAir; c.vz = 300 * tAir / 2 + 20 * L; c.z = 1; c.a.act = 'launch'; c.launchFrom = [c.x, c.y]; c.launchBy = p.id;
    const spill = kind === 'hurricane' || this.rng() < TUNE.v.spillChance;
    this.emit('monsterHit', { id: p.id, on: c.id, x: c.x, y: c.y, kind });
    if (kind === 'hurricane') { for (const q of this.players) if (q !== c && q !== p && this.standing(q) && dist(q, c) < 30) this.knockDown(q, 1.0, angTo(c, q)); this.endSuper(p); }
    if (spill && this.ball.holder === c.id) {
      const b = this.ball, fwdK = this.rng() < .5 ? 1 : -1;
      b.st = 'air'; b.holder = -1; b.kind = 'spill'; b.from = c.id; b.team = c.team; b.t = 0;
      b.vx = c.vx * .5 + this.dir[c.team] * fwdK * 40; b.vy = c.vy * .5 + (this.rng() - .5) * 60; b.vz = 120; b.z = 18;
      b.spillFwd = fwdK > 0; b.spillTeam = c.team;
      this.emit('spillHit', { id: c.id });
    } else c.pin = true;
    c.tackler = p.id;
    if (kind !== 'hurricane') this.replayAsk = { kind: 'monster', id: c.id, t: this.t };
  },
  launchStep(p, dt) {
    p.vz -= 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; this.bound(p);
    p.a.flip = clamp(p.stT / p.stDur, 0, 1);
    // flying bodies flatten whoever they hit, the referee included
    for (const q of this.players) if (q !== p && q.id !== p.launchBy && this.standing(q) && dist(q, p) < 12 && p.z < 40) this.knockDown(q, 1.0, Math.atan2(p.vy, p.vx));
    if (!this.ref.down && dist(this.ref, p) < 12 && p.z < 40) this.refDown();
    if (p.z <= 0 && p.vz < 0) {
      p.z = 0; p.vz = 0; p.vx *= .5; p.vy *= .5; p.a.flip = 0;
      const flown = p.launchFrom ? dist2(p.x, p.y, p.launchFrom[0], p.launchFrom[1]) : 0;
      const by = this.players[p.launchBy]; if (by) by.hitBest = Math.max(by.hitBest, metres(flown));
      this.emit('land', { id: p.id, x: p.x, y: p.y, metres: metres(flown) });
      this.setSt(p, 'down', this.ball.holder === p.id ? 9 : 1.2); p.a.act = 'landed'; p.pin = this.ball.holder === p.id; p.tackledT = .3;
    }
  },
  knockDown(q, t, a) {
    if (q.st === 'bin' || q.st === 'off') return;
    this.setSt(q, 'down', t); q.vx = Math.cos(a) * 70; q.vy = Math.sin(a) * 70; q.a.act = 'flat'; q.charge = -1;
    if (this.ball.holder === q.id && this.ball.st === 'held') this.spillFrom(q, false);
    this.emit('knocked', { id: q.id });
  },
  skittle(p, c) {
    const a = angTo(c, p) + (this.rng() - .5);
    this.setSt(p, 'launch', .45); p.vx = Math.cos(a) * 110; p.vy = Math.sin(a) * 110; p.vz = 150; p.z = 1; p.a.act = 'launch'; p.launchBy = c.id; p.launchFrom = [p.x, p.y];
    this.hypeAdd(c.team, 3); this.emit('skittle', { id: p.id, by: c.id });
  },
  brokenTackle(p, c, kind) {
    this.setSt(p, 'down', kind === 'big' || kind === 'monster' ? 1.0 : .6); p.a.act = 'flat'; p.vx *= .2; p.vy *= .2;
    c.vx *= .6; c.vy *= .6; c.stagger = .4;
    this.stats[p.team].missed++; this.hypeAdd(c.team, 5);
    this.emit('brokenTackle', { id: p.id, on: c.id });
  },
  fended(p, c) {
    const a = angTo(c, p), push = c.boss ? 40 : 20;
    this.setSt(p, 'down', .8); p.vx = Math.cos(a) * push * 4; p.vy = Math.sin(a) * push * 4; p.a.act = 'fended';
    c.a.act = 'fend'; c.a.u = .5; this.hypeAdd(c.team, 6);
    this.emit('fend', { id: c.id, on: p.id });
  },
  gangHold(p, c) {
    c.held = 1.5; c.holdBy = p.id;
    this.setSt(p, 'set'); p.hanging = c.id; p.a.act = 'hang'; p.a.u = 0;
    this.emit('gangHold', { id: p.id, on: c.id });
  },
  gangShrug(c) {
    const h = this.players[c.holdBy]; c.holdBy = -1; c.held = 0;
    if (h && h.hanging === c.id) { h.hanging = -1; const a = angTo(c, h); this.setSt(h, 'launch', .4); h.vx = Math.cos(a) * 100; h.vy = Math.sin(a) * 100; h.vz = 130; h.z = 1; h.launchBy = c.id; h.launchFrom = [h.x, h.y]; this.emit('shrug', { id: c.id, off: h.id }); }
  },
  /** the hanging tackler is dragged along */
  hangStep() {
    for (const h of this.players) if (h.hanging >= 0 && h.hanging !== undefined && h.st === 'set') {
      const c = this.players[h.hanging];
      if (!c || !(c.held > 0)) { h.hanging = -1; this.setSt(h, 'down', .6); continue; }
      h.x = c.x - Math.cos(c.f) * 6; h.y = c.y - Math.sin(c.f) * 6 + 3; h.f = c.f;
    }
  },
  doDive(p) {
    if (p.cool > 0 || !FREE[p.st]) return;
    const sp = TUNE.v.diveRange / .35;
    this.setSt(p, 'dive', .35); p.vx = Math.cos(p.f) * sp + p.vx * .3; p.vy = Math.sin(p.f) * sp + p.vy * .3; p.vz = 60; p.z = 1; p.a.act = 'dive'; p.cool = .5; p.diveHit = false;
    this.emit('dive', { id: p.id });
  },
  diveStep(p, dt) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 600 * dt; p.z = Math.max(0, p.z + p.vz * dt); this.bound(p);
    const c = this.carrier();
    if (!p.diveHit && c && c.team !== p.team && FREE[c.st] && dist(p, c) < 10 + (c.size - 1) * 6) { p.diveHit = true; this.contact(p, c, 'dive'); if (p.st !== 'dive') return; }
    if (p.stT >= p.stDur) { this.setSt(p, 'down', p.diveHit ? .6 : 1.2); p.z = 0; p.a.act = 'flat'; }
  },
  /** a shoulder on a man without the ball: flattened; a foul only if the referee sees it */
  cheapShot(p, v) {
    const a = angTo(p, v);
    this.setSt(p, 'lunge', .14); p.vx = Math.cos(a) * 60; p.vy = Math.sin(a) * 60; p.a.act = 'shoulder'; p.cool = .6;
    this.setSt(v, 'down', 1.6); v.vx = Math.cos(a) * 80; v.vy = Math.sin(a) * 80; v.a.act = 'flat';
    if (this.ball.holder === v.id && this.ball.st === 'held') this.spillFrom(v, false);
    p.cheap++;
    this.emit('cheapShot', { id: p.id, on: v.id });
    const seen = this.foul(p, 'offBall', { victim: v.id });
    if (!seen) { this.hypeAdd(p.team, 8); this.emit('cheapUnseen', { id: p.id }); }
  },
  /** the ball knocked out of a carrier's hands: loose, and forward of him a knock-on */
  spillFrom(c, fwd) {
    const b = this.ball, d = this.dir[c.team];
    b.st = 'air'; b.holder = -1; b.kind = 'spill'; b.from = c.id; b.team = c.team; b.t = 0;
    b.vx = d * (fwd ? 60 : -30) + (this.rng() - .5) * 40; b.vy = (this.rng() - .5) * 60; b.vz = 70; b.z = 14;
    b.spillFwd = fwd; b.spillTeam = c.team;
  },
  /* ---- catching, gathering and interceptions ---- */
  catchStep() {
    const b = this.ball;
    if (b.st !== 'air' && b.st !== 'loose') return;
    if (b.t < .08 && b.from >= 0) return;
    if (b.st === 'air' && b.kind !== 'pass' && b.kind !== 'spill' && b.vz > 0 && b.t < .45) return;   // a kick still climbing off the boot
    const reachZ = b.st === 'air' ? 30 : 9;
    // interceptions: a pass that flies past an opponent below head height
    if (b.st === 'air' && b.kind === 'pass') {
      for (const q of this.players) {
        if (q.team === b.team || !FREE[q.st] || b.tried[q.id] || b.z > 24) continue;
        const d = dist2(q.x, q.y, b.x, b.y), human = q.ctl >= 0;
        const lane = human && q.I.hd && q.I.hd.x ? 12 : 10;
        if (d > lane) continue;
        b.tried[q.id] = 1;
        const chance = human ? (q.I.hd && q.I.hd.x ? .45 : .05) : .15 * this.diffs[q.team].intercept;
        if (this.rng() < chance) { this.give(q, 'intercept'); this.hypeAdd(q.team, 12); this.stats[q.team].turnovers++; this.emit('interception', { id: q.id }); return; }
      }
    }
    // the intended receiver first, then whoever is nearest
    const cands = this.players.filter(q => FREE[q.st] && q.cool <= 0 && b.z < reachZ + (q.size - 1) * 10).map(q => [q, dist2(q.x, q.y, b.x, b.y)]).filter(([q, d]) => d < (b.st === 'loose' ? (Math.hypot(b.vx, b.vy) > 210 ? 4.5 : 9) : 10) + (q.size - 1) * 6);
    if (!cands.length) return;
    cands.sort((a, c) => (a[0].id === b.to ? -1 : 0) - (c[0].id === b.to ? -1 : 0) || a[1] - c[1]);
    const [q] = cands[0];
    if (b.tried[q.id] && b.st === 'air') return;
    b.tried[q.id] = 1;
    if (b.st === 'air') this.tryCatch(q, cands); else this.gather(q);
  },
  tryCatch(q, cands) {
    const b = this.ball, from = this.players[b.from];
    if (b.kind === 'kickoff' && this.kickoffCheck(q)) return;
    let chance;
    if (b.kind === 'pass') {
      chance = TUNE.v.catchBase * (.9 + .01 * q.hnd) - (b.long ? .06 : 0) - (b.offload ? .1 : 0) - (this.players.some(o => o.team !== q.team && this.standing(o) && dist(o, q) < 20) ? TUNE.v.pressurePenalty : 0) - (this.rain ? .06 : 0);
      if (q.fire > 0 || (from && from.fire > 0)) chance = 1;
      if (q.team !== b.team) chance *= .7;
    } else {
      chance = .82 + .015 * q.hnd - (this.rain ? .06 : 0);
      // a contested high ball: the chaser and the receiver both up for it
      const rival = cands.find(([o]) => o.team !== q.team);
      if (rival && (b.kind === 'bomb' || b.kind === 'kickoff' || b.kind === 'punt')) {
        const [o] = rival, sq = (p0) => (p0.ctl >= 0 ? (p0.I.hd.x ? .65 : .45) : .5 - this.diffs[p0.team].sigma * .6) + .02 * p0.hnd + this.rng() * .35;
        const win = sq(q) >= sq(o) ? q : o, lose = win === q ? o : q;
        this.knockDown(lose, .7, angTo(win, lose));
        this.emit('contest', { id: win.id, beat: lose.id });
        q = win;
      }
    }
    if (q.ctl >= 0 && b.kind !== 'pass' && q.I.hd.x) chance += .05;
    if (this.rng() < chance) {
      const wasFwd = b.kind === 'pass' && b.fwd;
      if (wasFwd && q.team === b.team) return this.forwardPass(b.from, q.x, q.y);
      const kind = b.kind, how = kind === 'pass' ? (q.team === b.team ? 'pass' : 'intercept') : 'kick';
      this.give(q, how);
      if (how === 'intercept') { this.hypeAdd(q.team, 12); this.stats[q.team].turnovers++; this.emit('interception', { id: q.id }); }
      if (kind !== 'pass') { this.emit('kickCaught', { id: q.id }); q.a.act = 'highCatch'; q.a.u = 0; }
      return;
    }
    // dropped: forward off the hands is a knock-on, else it spills loose
    const fwd = this.rng() < .5;
    if (fwd) return this.knockOn(q);
    b.vx = (this.rng() - .5) * 60 - this.dir[q.team] * 30; b.vy = (this.rng() - .5) * 60; b.vz = 40; b.st = 'air'; b.kind = 'spill'; b.from = q.id; b.team = q.team; b.t = 0; b.spillFwd = false; b.spillTeam = q.team;
    this.emit('fumble', { id: q.id });
  },
  /** a loose ball picked up (a sprinting gather may be fumbled forward) */
  gather(q) {
    const b = this.ball;
    if (b.kind === 'kickoff' && this.kickoffCheck(q)) return;
    if (this.turboActive(q) && Math.hypot(q.vx, q.vy) > this.speedOf(q) * 1.2 && q.hnd < 8 && this.rng() < .15) return this.knockOn(q);
    const fromSpill = b.kind === 'spill' || b.kind === 'grubber';
    this.give(q, 'gather');
    if (fromSpill && b.spillTeam !== undefined && b.spillTeam !== q.team) { this.stats[q.team].turnovers++; this.emit('turnover', { id: q.id, how: 'loose' }); }
    // an attacker gathering a loose ball in the opponents' in-goal has grounded it: a try
    if (this.inGoal(q.team, q.x) && b.st === 'held') this.tryScored(q, q.x, q.y, 'ground');
  },
  /** a spill that went forward: the knock-on is called when it lands or is gathered */
  spillLanded() {
    const b = this.ball;
    if (b.kind === 'spill' && b.spillFwd) { const c = this.players[b.from]; b.spillFwd = false; if (c) this.knockOn(c, true); }
  }
});


/* ==== 12-laws.js ==== */
/* ---- THE LAWS: open play, the clock and the hooter, touch and dead balls, scoring, knock-ons and forward passes, the
 * referee (who calls only what he sees), fouls, advantage, cards and the sin bin ---- */
Object.assign(Match.prototype, {
  ph_play(dt) {
    this.clockStep(dt);
    this.stepPlayers(dt);
    this.hangStep();
    const wasAir = this.ball.st === 'air';
    this.stepBall(dt);
    if (wasAir && this.ball.st === 'loose') this.spillLanded();
    if (this.phase !== 'play') return;
    this.catchStep();
    if (this.phase !== 'play') return;
    this.carrierChecks(dt);
    if (this.phase !== 'play') return;
    this.outOfPlay();
    if (this.phase !== 'play') return;
    this.advStep(dt);
    this.foulChecks(dt);
  },
  clockStep(dt) {
    if (TT.cheats.noClock || this.o.noClock) return;
    if (this.sudden) { this.suddenT += dt; if (!this.o.cup && this.suddenT >= 120 && !this.hooter) { this.hooter = true; this.emit('hooter', {}); } return; }
    this.clock += dt;
    if (!this.hooter && this.clock >= this.halfLen) { this.hooter = true; this.emit('hooter', {}); this.banner('HOOTER!', { color: '#ff6a3a' }); }
    for (const p of this.players) if (p.st === 'bin') { p.binT -= dt; }
  },
  /** the clock shown: sevens time, 0:00 to 7:00 a half */
  tvClock() { return Math.min(420, this.clock * 420 / this.halfLen); },
  /* ---- the carrier: tackled (offload, then the ruck), the in-goal, line breaks, metres, "use it" ---- */
  carrierChecks(dt) {
    const c = this.carrier(); if (!c) return;
    const d = this.dir[c.team];
    if (c.prevX !== undefined && FREE[c.st]) { const g = (c.x - c.prevX) * d; if (g > 0) { this.stats[c.team].metres += g; c.metres += g; } }
    c.prevX = c.x;
    if (c.stagger > 0) { c.stagger -= dt; c.vx *= .97; c.vy *= .97; }
    if (c.st === 'down' && c.pin) {
      c.tackledT = (c.tackledT || 0) + dt;
      if (this.inGoal(c.team, c.x)) return this.tryScored(c, c.x, c.y, c.dived ? 'dive' : 'tackled');
      if (this.inOwnGoal(c)) { this.whistle('held', () => this.scrumSetup(1 - c.team, this.ownLine(c.team) + d * G.L5, c.y, '5m')); return; }
      // the offload: in the first moments of the tackle, L1 / R1 (or the CPU's choice) pops it to a supporter
      if (c.tackledT < .15 && !c.offTried) {
        let side = 0;
        if (c.ctl >= 0) { if (c.I.pr.l1) side = -1; else if (c.I.pr.r1) side = 1; }
        else if (this.rng() < (this.teams[c.team].style.pass * .25) * dt * 60 / 9) side = this.rng() < .5 ? -1 : 1;
        if (side) {
          c.offTried = true;
          const r = this.legalReceivers(c, 0).filter(q => dist(q, c) < 50).sort((a, b) => dist(a, c) - dist(b, c))[0];
          if (r) { c.pin = false; this.doPass(c, r, false, true); this.setSt(c, 'down', .8); return; }
        }
      }
      if (c.tackledT >= .45) return this.startRuck(c);
      return;
    }
    c.offTried = false;
    if (c.st === 'down' && c.dived && this.inGoal(c.team, c.x)) return this.tryScored(c, c.x, c.y, 'dive');
    if (FREE[c.st] && this.inGoal(c.team, c.x)) {
      c.inGoalT += dt;
      const deadLine = d > 0 ? G.DX1 : G.DX0;
      if (c.inGoalT > 2.5 || Math.abs(c.x - deadLine) < 16) return this.tryScored(c, c.x, c.y, 'walk');
    } else c.inGoalT = 0;
    // a line break: past every opponent but the last man
    if (!this.breakDone && FREE[c.st]) {
      const foes = this.players.filter(q => q.team !== c.team && this.standing(q));
      const behind = foes.filter(q => (q.x - c.x) * d < -4).length;
      if (foes.length > 2 && behind >= foes.length - 1 && this.adv1(c.team, c.x) > -G.W / 2 + 120) {
        this.breakDone = true; this.stats[c.team].breaks++; c.breaks++; this.hypeAdd(c.team, 8); this.emit('lineBreak', { id: c.id });
        this.tryRun = { id: c.id, x: c.x, t: this.t };
      }
    }
    // "USE IT!": the ball at the base of a ruck must be played within three seconds
    if (this.useIt > 0 && c.id === this.useItId) {
      if (dist2(c.x, c.y, this.useItX, this.useItY) > 18 || c.st !== 'free') this.useIt = 0;
      else { this.useIt -= dt; if (this.useIt <= 0) { this.refCall('useIt'); this.whistle('useIt', () => this.scrumSetup(1 - c.team, c.x, c.y)); } }
    }
  },
  inOwnGoal(c) { return this.dir[c.team] > 0 ? c.x < G.X0 : c.x > G.X1; },
  /* ---- touch, touch-in-goal and the dead-ball lines ---- */
  outOfPlay() {
    const b = this.ball, c = this.carrier();
    if (c) {
      if (FREE[c.st] && (c.y < G.Y0 || c.y > G.Y1) && c.x > G.DX0 && c.x < G.DX1) {
        if (c.x >= G.X0 && c.x <= G.X1) return this.touch(1 - c.team, c.x, c.y < G.Y0 ? G.Y0 : G.Y1, false);
        return this.deadBall(c.team, c.x);
      }
      if (FREE[c.st] && (c.x < G.DX0 || c.x > G.DX1)) return this.deadBall(c.team, c.x);
      return;
    }
    if (b.st !== 'air' && b.st !== 'loose') return;
    if (b.y < G.Y0 || b.y > G.Y1) {
      if (b.x >= G.X0 && b.x <= G.X1) {
        const fromPen = this.kickForTouch !== undefined && this.kickForTouch === b.team && b.kind !== 'spill';
        const team = fromPen ? b.team : 1 - b.team;
        if (b.kind === 'kickoff') return this.whistle('kickoffOut', () => this.scrumSetup(1 - b.team, G.CX, G.CY));
        this.kickForTouch = undefined;
        return this.touch(team, b.x, b.y < G.Y0 ? G.Y0 : G.Y1, b.kind === 'punt' || b.kind === 'bomb' || b.kind === 'grubber');
      }
      return this.deadBall(b.team, b.x);
    }
    if (b.x < G.DX0 || b.x > G.DX1) return this.deadBall(b.team, b.x);
  },
  touch(team, x, y, kicked) {
    const lx = clamp(x, G.X0 + G.L5, G.X1 - G.L5);
    this.emit(kicked ? 'kickTouch' : 'touch', { team, x: lx, y });
    this.refCall('touch');
    this.whistle('touch', () => this.lineoutSetup(team, lx, y));
  },
  /** the ball dead beyond a dead-ball line (or touch-in-goal): put there by the attackers, a 22 drop-out; by the
   *  defenders, a 5 m scrum to the attackers */
  deadBall(lastTeam, x) {
    const east = x > G.CX, attackers = this.dir[0] > 0 === east ? 0 : 1, defenders = 1 - attackers;
    if (lastTeam === attackers) { this.emit('deadBall', { team: defenders }); this.refCall('drop'); this.whistle('dead', () => this.dropoutSetup(defenders)); }
    else { this.emit('deadBall', { team: attackers }); this.whistle('dead', () => this.scrumSetup(attackers, this.ownLine(defenders) + this.dir[defenders] * G.L5, this.ball.y, '5m')); }
  },
  /** kicks at the posts are judged as they cross the try line: between the uprights and over the crossbar */
  postCheck(b, x0) {
    const line = this.oppLine(b.aimTeam);
    if ((x0 - line) * (b.x - line) > 0) return;
    const dy = Math.abs(b.y - G.CY);
    const team = b.aimTeam; b.aimTeam = -1;
    if (Math.abs(dy - G.POSTW) < 2.5 && b.z < G.POSTH && b.z > 2) {
      b.vx = -b.vx * .4; b.vy = (this.rng() - .5) * 80; b.x = line - this.dir[team] * 2;
      this.emit('doink', { team });
      if (b.kind === 'setkick') this.pendingKick = 'doink';
      return;
    }
    const good = dy < G.POSTW && b.z > G.BAR;
    if (b.kind === 'drop') { if (good) this.dropGoal(team); else this.emit('dropMiss', { team }); }
    else if (b.kind === 'setkick') this.pendingKick = good ? 'good' : 'miss';
  },
  /* ---- scoring ---- */
  addScore(team, pts, how) {
    this.score[team] += pts; this.lastScore = team; this.emit('score', { team, pts, how });
    if (this.adv && this.adv.team === team) { this.adv = null; this.emit('advOver', {}); }
    // ON FIRE ends when the other team scores
    for (const p of this.players) if (p.team !== team && p.fire > 0) { p.fire = 0; this.emit('fireOut', { id: p.id }); }
    for (const p of this.players) if (p.team !== team) this.triesRow[p.id] = 0;
  },
  tryScored(p, x, y, how) {
    if (this.phase !== 'play' && this.phase !== 'scrum') return;
    const pts = how === 'penalty' ? 7 : 5;
    this.addScore(p.team, pts, 'try');
    this.stats[p.team].tries++; p.tries++;
    this.triesRow[p.id] = (this.triesRow[p.id] || 0) + 1;
    const run = this.tryRun && this.tryRun.id === p.id ? Math.abs(p.x - this.tryRun.x) : 0;
    this.ball.st = 'dead'; this.ball.holder = p.id;
    this.hypeAdd(p.team, 15);
    this.emit('try', { id: p.id, team: p.team, x, y, how, run });
    this.refCall('try'); this.ref.signal = 'try'; this.ref.sigT = 2;
    if (this.triesRow[p.id] >= 2 && !(p.fire > 0)) { p.fire = 90; this.emit('onFire', { id: p.id }); }
    const replay = how === 'pushover' || run >= 200 || this.breakDone || this.lastSuperTry || this.o.replays === 'All tries';
    if (replay) this.replayAsk = { kind: 'try', id: p.id, t: this.t, force: true };
    this.lastSuperTry = false;
    this.goPhase('try'); this.tryAt = { x, y, team: p.team, how, id: p.id };
    for (const q of this.players) if (q.team === p.team && this.onPitch(q)) { if (q.st !== 'down') this.setSt(q, 'cele'); q.a.cele = (q.slot * 3 + this.score[p.team]) % 6; }
    this.setSt(p, 'cele'); p.a.cele = p.slot % 6;
    if (this.sudden) this.suddenWin = p.team;
  },
  ph_try(dt) {
    this.stepPlayers(dt, false); this.stepBall(dt);
    if (this.phaseT > 2.6) {
      const at = this.tryAt;
      if (this.sudden) return this.fullTime();
      if (at.how === 'penalty') return this.afterScore(at.team);
      this.setKickSetup(at.team, at.x, at.y, 'conv');
    }
  },
  dropGoal(team) {
    this.addScore(team, 3, 'drop'); this.hypeAdd(team, 10);
    this.emit('dropGoal', { team, id: this.ball.from });
    this.replayAsk = { kind: 'drop', id: this.ball.from, t: this.t };
    this.ball.st = 'dead';
    this.whistle('drop', () => this.afterScore(team), 1.6);
  },
  /** after any score: sudden death ends; the hooter ends the half; else the scoring team kicks off */
  afterScore(scorer) {
    if (this.sudden && this.lastScore >= 0) return this.fullTime();
    if (this.hooter) return this.endHalf();
    this.kickoffTeam = scorer;
    this.goPhase('kickoff');
  },
  /* ---- stoppages ---- */
  /** the whistle: play stops, a beat, then next() (the hooter ends the half instead) */
  whistle(kind, next, wait = 1.1) {
    this.ball.st = this.ball.st === 'held' ? 'held' : 'dead';
    this.adv = null; this.useIt = 0; this.breakDone = false;
    this.emit('whistle', { kind });
    this.pending = next; this.goPhase('dead'); this.deadWait = wait;
    for (const p of this.players) { p.charge = -1; if (p.sup && p.sup.kind === 'hurricane') this.endSuper(p); }
  },
  ph_dead(dt) {
    this.stepPlayers(dt, false); this.hangStep();
    if (this.ball.st === 'air' || this.ball.st === 'loose') this.stepBall(dt);
    if (this.phaseT >= this.deadWait) this.afterDead();
  },
  afterDead() {
    const next = this.pending; this.pending = null;
    for (const p of this.players) { if (p.st === 'down' && p.pin) { p.pin = false; this.setSt(p, 'up', .4); } if (p.hanging >= 0 && p.hanging !== undefined) { p.hanging = -1; this.setSt(p, 'free'); } p.held = 0; }
    if (this.hooter && !this.sudden) return this.endHalf();
    if (this.sudden && this.hooter) return this.fullTime();
    if (next) next(); else this.restartPlay(this.poss, this.ball.x, this.ball.y);
  },
  knockOn(q, fromSpill) {
    const b = this.ball;
    b.st = 'dead'; b.holder = -1;
    this.emit('knockOn', { id: q.id, team: q.team });
    this.refCall('knockOn');
    this.whistle('knockOn', () => this.scrumSetup(1 - q.team, b.x, b.y));
  },
  forwardPass(fromId, x, y) {
    const p = this.players[fromId], team = p ? p.team : this.ball.team;
    this.ball.st = 'dead'; this.ball.holder = -1;
    this.emit('forwardPass', { id: fromId, team });
    this.refCall('forward');
    this.whistle('forward', () => this.scrumSetup(1 - team, x, y));
  },
  /** play goes on from (x, y) with team's nearest player holding the ball (a tap, the end of a set piece) */
  restartPlay(team, x, y) {
    const p = this.players.filter(q => q.team === team && this.standing(q)).sort((a, b) => dist2(a.x, a.y, x, y) - dist2(b.x, b.y, x, y))[0];
    for (const q of this.players) if (q.st === 'set' || q.st === 'ruck' || q.st === 'cele') this.setSt(q, 'free');
    this.setp = null; this.goPhase('play');
    if (p) { p.x = clamp(x, G.DX0 + 10, G.DX1 - 10); p.y = clamp(y, G.Y0 + 10, G.Y1 - 10); this.give(p, 'restart'); }
  },
  /* ---- the half, full time and sudden death ---- */
  endHalf() {
    this.hooter = false;
    if (this.half === 1) {
      this.goPhase('half'); this.ball.st = 'dead';
      this.emit('halftime', { score: this.score.slice() });
      return;
    }
    const level = this.score[0] === this.score[1];
    if (level && !this.sudden && (this.o.cup || this.o.sudden)) return this.suddenDeath();
    this.fullTime();
  },
  ph_half(dt) {
    this.stepPlayers(dt, false);
    const go = this.seats.some(s => s.I.pr.x || s.I.pr.ci) || this.phaseT > (this.o.cup ? 9 : 7) || this.o.attract || this.o.session || this.o.drill;
    if (go && this.phaseT > 1.5) this.secondHalf();
  },
  secondHalf() {
    this.half = 2; this.clock = 0; this.hooter = false; this.dir = [this.dir[0] * -1, this.dir[1] * -1];
    this.kickoffTeam = 1; this.emit('secondHalf', {});
    this.goPhase('kickoff');
  },
  suddenDeath() {
    this.sudden = true; this.suddenT = 0; this.hooter = false;
    this.emit('suddenDeath', {}); this.banner('GOLDEN POINT!', { color: '#ffd040' });
    this.kickoffTeam = 0; this.goPhase('kickoff');
  },
  fullTime() {
    if (this.over) return;
    this.over = true; this.goPhase('full');
    const w = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
    this.result = { winner: w, score: this.score.slice() };
    for (const p of this.players) if (this.onPitch(p)) { if (p.team === w) { this.setSt(p, 'cele'); p.a.cele = p.slot % 6; } else if (w >= 0) { this.setSt(p, 'free'); p.a.sad = 1; } }
    this.emit('fulltime', { winner: w, score: this.score.slice() });
  },
  ph_full(dt) { this.stepPlayers(dt, false); },
  /* ---- the referee: runs behind play on the far side, turns to the ball, calls what he sees ---- */
  refStep(dt) {
    const R = this.ref;
    R.callT = Math.max(0, R.callT - dt); R.sigT = Math.max(0, R.sigT - dt); if (R.sigT <= 0) R.signal = this.adv ? 'advantage' : '';
    if (R.down > 0) { R.down -= dt; R.vx = R.vy = 0; if (R.down <= 0) { R.down = 0; this.emit('refUp', {}); } return; }
    const b = this.ball, t = this.poss, d = this.dir[t] || 1;
    let tx = b.x - d * 50, ty = Math.min(b.y, G.CY) - 40;
    if (this.setp && this.setp.kind === 'setkick') { tx = this.oppLine(this.setp.team) + this.dir[this.setp.team] * 20; ty = G.CY - 60; }
    ty = clamp(ty, G.Y0 - 20, G.Y1 - 40); tx = clamp(tx, G.DX0, G.DX1);
    // steer round players
    for (const p of this.players) if (this.onPitch(p) && dist(p, R) < 18) { const a = angTo(p, R); tx += Math.cos(a) * 20; ty += Math.sin(a) * 20; }
    const dx = tx - R.x, dy = ty - R.y, dd = Math.hypot(dx, dy), sp = dd > 4 ? Math.min(95, dd * 3) : 0;
    R.vx = approach(R.vx, dd ? dx / dd * sp : 0, 500 * dt); R.vy = approach(R.vy, dd ? dy / dd * sp : 0, 500 * dt);
    R.x += R.vx * dt; R.y += R.vy * dt;
    R.f = E.approachAng(R.f, Math.atan2(b.y - R.y, b.x - R.x), dt * 4);
  },
  /** does the referee see p now? (the setting cheats aside) */
  refSees(p) {
    if (this.ref.down > 0 || TT.cheats.refBlind) return false;
    if (TT.cheats.refStrict) return true;
    const R = this.ref, d = dist(R, p);
    if (d > TUNE.v.refRange) return false;
    return Math.abs(angDiff(R.f, angTo(R, p))) <= TUNE.v.refFov / 2;
  },
  /** a foul by p: called only if the referee sees it (now, or 0.3 s later as he turns); returns whether it was seen */
  foul(p, kind, o = {}) {
    if (this.ref.down > 0) { this.emit('foulUnseen', { id: p.id, kind, refDown: true }); return false; }
    if (this.refSees(p)) { this.callFoul(p, kind, o); return true; }
    (this.foulsLater || (this.foulsLater = [])).push({ id: p.id, kind, o, t: this.t + .3 });
    return false;
  },
  foulChecks() {
    if (!this.foulsLater || !this.foulsLater.length) return;
    const due = this.foulsLater.filter(f => f.t <= this.t); this.foulsLater = this.foulsLater.filter(f => f.t > this.t);
    for (const f of due) { const p = this.players[f.id]; if (p && this.refSees(p) && this.phase === 'play') { this.callFoul(p, f.kind, f.o); return; } }
  },
  callFoul(p, kind, o) {
    const victim = 1 - p.team;
    const card = kind === 'highShot' || (kind === 'offBall' && (p.cheap >= 2 || this.rng() < .35)) ? 'yellow' : null;
    this.emit('foul', { id: p.id, kind, card });
    this.refCall(kind === 'highShot' ? 'highShot' : kind === 'offBall' ? 'offBall' : kind === 'hands' ? 'hands' : kind === 'offside' ? 'offside' : 'penalty');
    this.stats[p.team].pens++;
    const c = this.carrier();
    // a penalty try: a foul on a carrier close to the line with no defender between him and it
    if (c && c.team === victim && o.victim === c.id && this.adv1(victim, c.x) > G.W / 2 - 60 && !this.players.some(q => q.team === p.team && this.standing(q) && (q.x - c.x) * this.dir[victim] > 0 && Math.abs(q.y - c.y) < 60)) {
      if (card) this.giveCard(p, card);
      return this.penaltyTry(victim, c);
    }
    if (this.phase === 'play' && c && c.team === victim && kind !== 'hands') {
      this.adv = { team: victim, t: 5, x0: c.x, mark: { x: p.x, y: p.y }, kind, offender: p.id, card };
      this.ref.signal = 'advantage'; this.ref.sigT = 5; this.refCall('advantage');
      this.emit('advantage', { team: victim });
      return;
    }
    if (card) this.giveCard(p, card);
    this.penaltyAward(victim, p.x, p.y, kind);
  },
  penaltyTry(team, c) {
    this.ball.st = 'held'; this.ball.holder = c.id;
    this.emit('penTry', { team });
    this.ref.signal = 'try'; this.ref.sigT = 2;
    this.tryScored(c, this.oppLine(team), G.CY, 'penalty');
  },
  advStep(dt) {
    const A = this.adv; if (!A) return;
    A.t -= dt;
    const c = this.carrier();
    const gained = c && c.team === A.team ? (c.x - A.x0) * this.dir[A.team] : 0;
    if (gained >= 100) { this.adv = null; this.ref.signal = ''; if (A.card) this.giveCard(this.players[A.offender], A.card); this.emit('advOver', { team: A.team }); this.refCall('playOn'); return; }
    const lost = (c && c.team !== A.team) || (this.ball.st === 'loose' && this.ball.team !== A.team && this.ball.t > .6);
    if (lost || A.t <= 0) {
      this.adv = null;
      const off = this.players[A.offender];
      if (A.card && off) this.giveCard(off, A.card);
      this.penaltyAward(A.team, A.mark.x, A.mark.y, A.kind);
    }
  },
  /** a yellow card: the sin bin (an actual bin); a second: red, off for the match */
  giveCard(p, card) {
    if (!p || !this.onPitch(p)) return;
    p.yellow++;
    const red = p.yellow >= 2;
    if (this.ball.holder === p.id && this.ball.st === 'held') { this.ball.st = 'dead'; this.ball.holder = -1; }
    if (p.ctl >= 0) { const s = this.seats[p.ctl]; p.ctl = -1; if (s) s.pid = -1; }
    if (red) { this.setSt(p, 'off'); p.red = true; }
    else { this.setSt(p, 'bin'); p.binT = TUNE.v.sinBin; }
    p.x = G.CX + 60 + (p.team ? 10 : -10); p.y = G.Y1 + 30; p.vx = p.vy = 0;
    this.stats[p.team].cards++;
    this.ref.card = red ? 'red' : 'yellow'; this.ref.signal = 'card'; this.ref.sigT = 2.4;
    this.emit('card', { id: p.id, team: p.team, red });
    this.banner(red ? 'RED CARD!' : 'SIN BIN!', { color: red ? '#ff3a3a' : '#ffd040' });
  },
  binStep(p, dt) {
    p.vx = p.vy = 0;
    if (p.st === 'bin' && p.binT <= 0) {
      this.setSt(p, 'free'); p.x = G.CX + 40 * (p.team ? 1 : -1); p.y = G.Y1 + 14;
      this.emit('sinBinOut', { id: p.id });
    }
  },
  statsStep(dt) {
    if (this.phase !== 'play' && this.phase !== 'ruck') return;
    const c = this.carrier();
    if (c) this.stats[c.team].poss += dt;
    const b = this.ball;
    for (const t of [0, 1]) if (this.adv1(t, b.x) > 0) this.stats[t].terr += dt;
  }
});


/* ==== 13-setpieces.js ==== */
/* ---- SET PIECES: the walk-out, kick-offs and 22 drop-outs, rucks, scrums, lineouts, set kicks (conversions and penalty
 * goals) and the penalty's choice. Humans play each one through their seat's intent; the CPU by its difficulty ---- */
const POD_NAMES = ['FRONT', 'MIDDLE', 'BACK'];
TT.POD_NAMES = POD_NAMES;
Object.assign(Match.prototype, {
  /** a human seat's intent for team t (the first one), or null: set pieces read its presses */
  humanI(t) { const s = this.seats.find(q => q.team === t && q.kind !== 'cpu'); return s ? s.I : null; },
  humanSeats(t) { return this.seats.filter(q => q.team === t && q.kind !== 'cpu'); },
  /** a set kick or a restart is the human's to take: their seat moves to the kicker */
  seatToKicker(team, id) { const s = this.humanSeats(team)[0]; if (s && id >= 0 && s.pid !== id && this.players[id] && this.players[id].ctl < 0) this.assign(s, id); },
  /** kick-off formation spots for the kicking team k and the receivers (snap: place them there now) */
  formation(kind, k, snap) {
    const spots = {};
    const kick = [[-24, -190], [-24, -120], [-24, -50], [-30, 40], [-4, 0], [-24, 120], [-24, 190]];
    const recv = [[110, -90], [115, 0], [110, 90], [190, -30], [250, 70], [200, 170], [320, -150]];
    const base = kind === 'dropout' ? this.ownLine(k) + this.dir[k] * G.L22 : G.CX;
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const d = this.dir[k], [dx, dy] = (p.team === k ? kick : recv)[p.slot];
      spots[p.id] = [base + d * dx, G.CY + dy * (p.team === k ? 1 : (k ? -1 : 1))];
      if (kind === 'dropout' && p.team !== k) spots[p.id][0] = base + d * (dx * .8 + 60);
    }
    if (snap) for (const p of this.players) if (spots[p.id]) { p.x = spots[p.id][0]; p.y = spots[p.id][1]; p.vx = p.vy = 0; p.f = p.team === k ? (this.dir[k] > 0 ? 0 : PI) : (this.dir[k] > 0 ? PI : 0); this.setSt(p, 'free'); }
    return spots;
  },
  /* ---- the walk-out: both teams jog out of the tunnel to their places ---- */
  ph_intro(dt) {
    if (!this.introInit) {
      this.introInit = true; this.introSpots = this.formation('kickoff', this.kickoffTeam, false);
      for (const p of this.players) { p.x = G.CX + (p.team ? 14 : -14) + (p.slot - 3) * 3; p.y = G.Y1 + 30 + p.slot * 4; p.f = -PI / 2; }
    }
    for (const p of this.players) { const s = this.introSpots[p.id]; if (s) this.walkTo(p, s[0], s[1], dt, .8); }
    const skip = this.seats.some(s => s.I.pr.x || s.I.pr.ci || s.I.pr.tri) || this.o.skipIntro;
    if (skip || this.phaseT > 5.5 || this.players.every(p => { const s = this.introSpots[p.id]; return !s || dist2(p.x, p.y, s[0], s[1]) < 3; })) this.goPhase('kickoff');
  },
  /* ---- kick-off and 22 drop-out ---- */
  kickoffSetup(team, kind) {
    this.ball.st = 'dead'; this.ball.holder = -1; this.adv = null; this.breakDone = false; this.tryRun = null; this.kickForTouch = undefined;
    const kicker = this.players.filter(p => p.team === team && this.onPitch(p)).sort((a, b) => (b.slot === 4) - (a.slot === 4) || b.kck - a.kck)[0];
    const spots = this.formation(kind, team, false);
    const base = kind === 'dropout' ? this.ownLine(team) + this.dir[team] * G.L22 : G.CX;
    if (kicker) spots[kicker.id] = [base - this.dir[team] * 6, G.CY];
    if (kicker) this.seatToKicker(team, kicker.id);
    this.setp = { kind, team, kicker: kicker ? kicker.id : -1, spots, aim: { x: base + this.dir[team] * 170, y: G.CY + (team ? 1 : -1) * 120 }, power: 0, charging: false, t: 0, base };
    for (const p of this.players) if (p.st === 'cele' || p.st === 'set' || p.st === 'ruck') this.setSt(p, 'free');
    if (kind === 'dropout') this.goPhaseOnly('dropout');
    this.emit('kickoffSetup', { team, kind });
  },
  goPhaseOnly(ph) { this.phase = ph; this.sub = ''; this.phaseT = 0; this.emit('phase', { phase: ph }); },
  dropoutSetup(team) { this.kickoffSetup(team, 'dropout'); this.emit('dropout', { team }); },
  ph_dropout(dt) { this.ph_kickoff(dt); },
  ph_kickoff(dt) {
    const S = this.setp; if (!S) return this.kickoffSetup(this.kickoffTeam, 'kickoff');
    S.t += dt;
    for (const p of this.players) if (this.onPitch(p) && S.spots[p.id] && p.st === 'free') this.walkTo(p, S.spots[p.id][0], S.spots[p.id][1], dt, 1.2);
    else if (this.onPitch(p)) this.stepPlayers1(p, dt);
    const k = this.players[S.kicker]; if (!k) return this.kickoffKick(null);
    k.f = this.dir[S.team] > 0 ? 0 : PI;
    this.ball.x = k.x + Math.cos(k.f) * 4; this.ball.y = k.y; this.ball.z = 12; this.ball.st = 'dead';
    if (S.t < .9) return;
    const d = this.dir[S.team], I = k.ctl >= 0 ? this.seats[k.ctl].I : null;
    if (I) {
      // the reticle: the stick (or the mouse on the ground) aims it on the receiving half; O (or the left button) held powers it
      if (I.aim) { S.aim.x = I.aim.x; S.aim.y = I.aim.y; }
      else { S.aim.x += I.mx * 220 * dt; S.aim.y += I.my * 220 * dt; }
      S.aim.x = d > 0 ? clamp(S.aim.x, S.base + 40, G.X1 + 40) : clamp(S.aim.x, G.X0 - 40, S.base - 40);
      S.aim.y = clamp(S.aim.y, G.Y0 - 20, G.Y1 + 20);
      if (I.hd.ci || I.hd.x) { S.charging = true; S.power = Math.min(1, S.power + dt / .9); }
      else if (S.charging) { S.charging = false; this.kickoffKick(S); }
      else if (S.t > 14) { S.power = .8; this.kickoffKick(S); }
    } else if (S.t > 1.7) {
      const side = this.rng() < .5 ? -1 : 1, long = this.setp.kind === 'dropout' ? 220 + this.rng() * 120 : 120 + this.rng() * 80;
      S.aim = { x: S.base + d * long, y: G.CY + side * (80 + this.rng() * 140) }; S.power = .82 + this.rng() * .08;
      this.kickoffKick(S);
    }
  },
  /** the kick-off leaves the boot: a drop kick toward the reticle; the power decides how far (.85 lands on it) */
  kickoffKick(S) {
    S = S || this.setp || { team: this.kickoffTeam, kicker: -1, aim: { x: G.CX + this.dir[this.kickoffTeam] * 160, y: G.CY }, power: .85, kind: 'kickoff', base: G.CX };
    const k = this.players[S.kicker] || this.players.find(p => p.team === S.team && this.standing(p));
    const d0 = dist2(k.x, k.y, S.aim.x, S.aim.y), len = d0 * clamp(S.power / .85, .3, 1.5) * (this.megaBoot && this.megaBoot[S.team] > 0 ? 1.3 : 1);
    const a = Math.atan2(S.aim.y - k.y, S.aim.x - k.x) + (this.rng() - .5) * (11 - Math.min(10, k.kck)) * PI / 180 * .5;
    const v = E.arc({ x: k.x, y: k.y, z: 8 }, { x: k.x + Math.cos(a) * len, y: k.y + Math.sin(a) * len, z: 0 }, 600, { apex: 70 + 30 * S.power });
    this.ball.st = 'held'; this.ball.holder = k.id;
    this.release(k, v.vx, v.vy, v.vz, S.kind === 'dropout' ? 'dropoutk' : 'kickoff');
    this.ball.kickBase = S.base; this.ball.kickTeam = S.team;
    this.setSt(k, 'kick', .35); k.a.act = 'drop'; k.a.u = 0;
    this.setp = null; this.phase = 'play'; this.sub = ''; this.phaseT = 0;
    this.emit(S.kind === 'dropout' ? 'dropoutKick' : 'kickoff', { team: S.team, id: k.id });
  },
  /** a kick-off must go ten metres: checked as it lands or is caught */
  kickoffCheck(catcher) {
    const b = this.ball; if (b.kind !== 'kickoff') return false;
    const gone = (b.x - b.kickBase) * this.dir[b.kickTeam];
    b.kind = 'kickoffDone';
    if (gone < G.L10 && (!catcher || catcher.team === b.kickTeam || gone < G.L10 - 10)) {
      this.emit('notTen', { team: b.kickTeam }); this.refCall('ten');
      const t = 1 - b.kickTeam;
      this.whistle('notTen', () => this.penaltyAward(t, G.CX + this.dir[t] * 0, G.CY, 'notTen', true));
      return true;
    }
    return false;
  },
  /** players who are in no set-piece state still need their timers stepped */
  stepPlayers1(p, dt) {
    p.stT += dt;
    if (p.st === 'down' && p.stT >= p.stDur && !p.pin) this.setSt(p, 'up', .4);
    else if (p.st === 'up' && p.stT >= p.stDur) this.setSt(p, 'free');
    else if ((p.st === 'stun' || p.st === 'stumble' || p.st === 'pass' || p.st === 'kick' || p.st === 'lunge' || p.st === 'step' || p.st === 'spin') && p.stT >= p.stDur) this.setSt(p, 'free');
    else if (p.st === 'launch') this.launchStep(p, dt);
    else if (p.st === 'dive' || p.st === 'tdive') { if (p.stT >= p.stDur) { p.z = 0; this.setSt(p, 'down', .5); } }
    if (p.st !== 'launch') this.brake(p, dt);
  },
  /* ---- the ruck ---- */
  startRuck(c) {
    if (this.hooter && !this.sudden) { this.ball.st = 'dead'; return this.whistle('hooterTackle', null, .8); }
    const d = this.dir[c.team], b = this.ball;
    b.st = 'placed'; b.holder = -1; b.x = c.x - d * 7; b.y = c.y; b.z = 0; b.team = c.team;
    const att = c.team, def = 1 - att, mark = { x: b.x, y: b.y };
    const near = (t, n) => this.players.filter(p => p.team === t && this.standing(p) && FREE[p.st] && p.ctl < 0 && p.id !== c.id && dist(p, mark) < 80 && !(t === att && p.slot === 3)).sort((a, q) => dist(a, mark) - dist(q, mark)).slice(0, n);
    const cA = near(att, 2), cD = near(def, this.rng() < .5 ? 1 : 2);
    this.setp = { kind: 'ruck', x: mark.x, y: mark.y, att, bar: .35 + .1 * (cA.length - cD.length), t: 0, comm: [[], []], go: [cA.map(p => p.id), cD.map(p => p.id)], tackled: c.id, tackler: c.tackler, jackal: -1, first: -1, sub: 'contest' };
    this.ruckCount++; this.stats[att].rucks++;
    this.goPhase('ruck');
    this.emit('ruck', { x: mark.x, y: mark.y, att });
  },
  ph_ruck(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    this.clockStep(dt);
    S.t += dt;
    const att = S.att, def = 1 - att, d = this.dir[att], mark = S;
    // a human defender near the ball may jackal (SQUARE), in the ruck or about to join it
    for (const s of this.humanSeats(def)) { const p = this.players[s.pid]; if (p && s.I.pr.sq && (p.st === 'ruck' || FREE[p.st]) && dist(p, mark) < 30) this.jackal(p); }
    // those going in run to their places in the ruck; each human who runs his man into the ruck zone joins it
    const spotOf = (p, k) => { const side = p.team === att ? -1 : 1, n = S.comm[p.team === att ? 0 : 1].indexOf(p.id); return [mark.x + d * side * (9 + Math.floor(Math.max(0, n) / 2) * 7), mark.y + ((Math.max(0, n) % 2) ? 6 : -6)]; };
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const k = p.team === att ? 0 : 1;
      if (p.st === 'ruck') { const [sx, sy] = spotOf(p); p.x = lerp(p.x, sx, Math.min(1, dt * 8)); p.y = lerp(p.y, sy, Math.min(1, dt * 8)); p.f = p.team === att ? (d > 0 ? 0 : PI) : (d > 0 ? PI : 0); continue; }
      if (p.id === S.tackled) { p.stT += dt; this.brake(p, dt); continue; }
      if (S.go[k].includes(p.id) && this.standing(p) && FREE[p.st]) {
        if (this.walkTo(p, mark.x - d * (p.team === att ? 10 : -10), mark.y, dt, 1.2) || dist(p, mark) < 12) { S.comm[k].push(p.id); S.go[k] = S.go[k].filter(i => i !== p.id); this.setSt(p, 'ruck'); this.emit('ruckJoin', { id: p.id }); if (k === 1 && S.first < 0) S.first = p.id; }
        continue;
      }
      if (p.ctl >= 0 && FREE[p.st] && dist(p, mark) < 16 && S.t > .1) { S.comm[k].push(p.id); this.setSt(p, 'ruck'); this.emit('ruckJoin', { id: p.id }); if (k === 1 && S.first < 0) S.first = p.id; if (k === 1 && S.t < .35 && S.first === p.id) S.jackalOk = true; continue; }
      if (FREE[p.st]) this.movePlayer(p, p.I, dt);
      else this.stepPlayers1(p, dt);
    }
    this.separate();
    // the contest: commitment and POW push the bar; humans mash X (each press counts), the CPU mashes by its rate
    const pow = k => S.comm[k].reduce((a, id) => a + Math.min(12, this.players[id].pow), 0);
    S.bar += dt * .02 * (pow(0) - pow(1));
    for (const k of [0, 1]) {
      const t = k === 0 ? att : def, side = k === 0 ? 1 : -1, hs = this.humanSeats(t).filter(s => { const p = this.players[s.pid]; return p && (p.st === 'ruck' || p.id === S.tackled); });
      if (hs.length) { for (const s of hs) if (s.I.pr.x) { S.bar += side * TUNE.v.mashWeight; this.emit('mash', { team: t }); } }
      else if (S.comm[k].length || k === 0) { const rate = Math.max(0, TUNE.v.cpuMash + this.diffs[t].mash) * (.8 + this.rng() * .4); S.bar += side * rate * TUNE.v.mashWeight * dt; }
    }
    // the jackal: the first defender to the ball, quick enough, presses SQUARE (the CPU decides)
    const fp = this.players[S.first];
    if (fp && S.jackal < 0 && fp.ctl < 0 && S.t < .5 && fp.st === 'ruck' && this.rng() < .5 * dt * 10 * this.teams[fp.team].style.aggr) this.jackal(fp);
    S.bar = clamp(S.bar, -1.2, 1.2);
    if (S.t >= TUNE.v.ruckTime) this.ruckEnd();
  },
  jackal(p) {
    const S = this.setp; if (!S || S.kind !== 'ruck' || p.team === S.att) return;
    if (S.jackal >= 0) return;
    if ((S.first === p.id || dist(p, S) < 20) && S.t < .5 && (S.first < 0 || S.first === p.id)) {
      S.jackal = p.id; S.bar -= .5; if (p.st !== 'ruck') { S.comm[1].push(p.id); this.setSt(p, 'ruck'); }
      p.a.act = 'jackal'; this.emit('jackal', { id: p.id });
    } else { this.emit('handsInRuck', { id: p.id }); this.foul(p, 'hands'); }
  },
  /** the ruck's result: the attack's scrum-half takes it at the base, or the defence turns it over */
  ruckEnd(force) {
    const S = this.setp; if (!S) return;
    const att = S.att, win = S.bar >= 0 ? att : 1 - att;
    for (const p of this.players) if (p.st === 'ruck' || (p.id === S.tackled && p.st === 'down')) { p.pin = false; this.setSt(p, 'up', .35); }
    const tk = this.players[S.tackled]; if (tk) tk.pin = false;
    let rcv;
    if (win === att) {
      rcv = this.players.find(p => p.team === att && p.slot === 3 && this.standing(p) && FREE[p.st]) || this.players.filter(p => p.team === att && this.standing(p) && FREE[p.st]).sort((a, b) => dist(a, S) - dist(b, S))[0];
    } else {
      rcv = this.players[S.jackal] || this.players.filter(p => p.team === win && this.onPitch(p) && p.st !== 'down').sort((a, b) => dist(a, S) - dist(b, S))[0];
      this.stats[win].turnovers++; if (rcv) rcv.turnovers++; this.hypeAdd(win, 8);
      this.emit('turnover', { id: rcv ? rcv.id : -1, how: S.jackal >= 0 ? 'jackal' : 'ruck' });
    }
    this.setp = null; this.goPhase('play');
    if (!rcv) { this.ball.st = 'loose'; return; }
    const d = this.dir[win];
    const bx = S.x - d * 12, by = S.y;
    if (dist2(rcv.x, rcv.y, bx, by) > 40) { rcv.x = bx - d * 6; rcv.y = by + 8; }
    else { rcv.x = lerp(rcv.x, bx, .5); rcv.y = lerp(rcv.y, by, .5); }
    this.setSt(rcv, 'free'); rcv.f = d > 0 ? 0 : PI;
    this.give(rcv, 'ruck');
    this.emit('ruckWon', { team: win, id: rcv.id });
    if (win === att) { this.useIt = 3; this.useItId = rcv.id; this.useItX = rcv.x; this.useItY = rcv.y; }
    this.offsideCheck(S, win);
  },
  /** defenders ahead of their offside line closing on the ball as it comes out: offside, if seen */
  offsideCheck(S, win) {
    const def = 1 - win, d = this.dir[win];
    for (const p of this.players) {
      if (p.team !== def || !this.standing(p) || p.st === 'up') continue;
      const ahead = (p.x - S.x) * d < 10 && dist(p, S) < 30 && dist(p, S) > 12;
      if (ahead && p.ctl >= 0) { this.foul(p, 'offside'); return; }
    }
  },
  /* ---- the scrum ---- */
  scrumSetup(team, x, y, tag) {
    x = clamp(x, G.X0 + G.L5, G.X1 - G.L5); y = clamp(y, G.Y0 + G.L5, G.Y1 - G.L5);
    this.ball.st = 'dead'; this.ball.holder = -1;
    this.setp = { kind: 'scrum', team, x, y, sub: 'setup', t: 0, bar: .15, timing: [0, 0], tq: ['', ''], early: -1, setT: 0, last: ['', ''], cpuEarly: [this.rng() < this.diffs[0].early, this.rng() < this.diffs[1].early], cpuT: [this.rng.gauss() * this.diffs[0].sigma, this.rng.gauss() * this.diffs[1].sigma], tag, shift: 0 };
    this.stats[team].scrums++;
    this.goPhase('scrum', 'setup');
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'off') { p.pin = false; if (p.st !== 'down' && p.st !== 'launch') this.setSt(p, 'free'); }
    this.emit('scrum', { team, x, y });
    this.refCall('scrum');
  },
  /** where each player stands for the scrum */
  scrumSpots() {
    const S = this.setp, spots = {};
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const d = this.dir[p.team], back = -d, sh = S.shift || 0;
      if (p.slot <= 2) { const lat = [-12, 0, 12][p.slot] * (p.team ? -1 : 1); spots[p.id] = [S.x + back * (p.slot === 1 ? 9 : 11) + sh, S.y + lat]; }
      else if (p.slot === 3) spots[p.id] = p.team === S.team ? [S.x + back * 3, S.y + 22] : [S.x + back * 24, S.y - 18];
      else { const k = p.slot - 4, lat = [-60, 70, 150][k] * (S.y > G.CY ? -1 : 1); spots[p.id] = [S.x + back * (G.L5 + 22 + k * 10), clamp(S.y + lat, G.Y0 + 16, G.Y1 - 16)]; }
    }
    return spots;
  },
  ph_scrum(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    const spots = this.scrumSpots();
    const A = S.team, B = 1 - A;
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const s = spots[p.id];
      if (p.slot <= 2 && S.sub !== 'setup') { p.x = lerp(p.x, s[0], Math.min(1, dt * 10)); p.y = lerp(p.y, s[1], Math.min(1, dt * 10)); p.f = this.dir[p.team] > 0 ? 0 : PI; if (p.st !== 'set') this.setSt(p, 'set'); continue; }
      if (p.st === 'free') { this.walkTo(p, s[0], s[1], dt, 1.3); if (dist2(p.x, p.y, s[0], s[1]) < 3) p.f = this.dir[p.team] > 0 ? 0 : PI; } else this.stepPlayers1(p, dt);
    }
    this.ball.x = S.x + (S.sub === 'push' || S.sub === 'set' ? 0 : -this.dir[A] * 2); this.ball.y = S.y + 14; this.ball.z = 8;
    const H = [this.humanI(0), this.humanI(1)];
    if (S.sub === 'setup') {
      if (S.t > 1.5) { for (const p of this.players) if (spots[p.id] && this.onPitch(p) && p.st !== 'off') { p.x = spots[p.id][0]; p.y = spots[p.id][1]; if (p.slot <= 2) this.setSt(p, 'set'); } S.sub = 'crouch'; S.t = 0; this.refCall('crouch'); this.emit('scrumCall', { call: 'crouch' }); }
      return;
    }
    if (S.sub === 'crouch' || S.sub === 'bind') {
      // pressing before the ring nearly closes is an early engagement: a free kick to the other side
      for (const t of [0, 1]) if (H[t] && H[t].pr.x && (S.sub === 'crouch' || S.t < .6 - .25)) return this.scrumEarly(t);
      for (const t of [0, 1]) if (!H[t] && S.cpuEarly[t] && S.sub === 'bind' && S.t > .2) return this.scrumEarly(t);
      if (S.sub === 'bind') for (const t of [0, 1]) if (H[t] && H[t].pr.x && !S.tq[t]) this.scrumTime(t, S.t - .6);
      if (S.t >= .6) { if (S.sub === 'crouch') { S.sub = 'bind'; S.t = 0; this.refCall('bind'); this.emit('scrumCall', { call: 'bind' }); } else { S.sub = 'set'; S.t = 0; S.setT = this.t; this.refCall('set'); this.emit('scrumCall', { call: 'set' }); this.emit('scrumEngage', {}); } }
      return;
    }
    if (S.sub === 'set') {
      for (const t of [0, 1]) {
        if (H[t] && H[t].pr.x && !S.tq[t]) this.scrumTime(t, S.t);
        if (!H[t] && !S.tq[t] && S.t >= Math.max(0, S.cpuT[t])) this.scrumTime(t, S.cpuT[t]);
      }
      if (S.t > .3) { for (const t of [0, 1]) if (!S.tq[t]) S.tq[t] = 'LATE'; S.sub = 'push'; S.t = 0; }
      return;
    }
    if (S.sub === 'push') {
      const pow = t => this.players.filter(p => p.team === t && p.slot <= 2 && this.onPitch(p)).reduce((a, p) => a + Math.min(12, p.pow), 0);
      S.bar += dt * .01 * (pow(A) - pow(B)) * .5;
      for (const t of [0, 1]) {
        const side = t === A ? 1 : -1, hs = this.humanSeats(t);
        if (hs.length) for (const s of hs) for (const k of ['l1', 'r1']) if (s.I.pr[k]) { const alt = S.last[t] !== k; S.bar += side * TUNE.v.scrumPushWeight * (alt ? 1 : .5); S.last[t] = k; this.emit('push', { team: t }); }
        if (!hs.length) { const rate = Math.max(0, TUNE.v.cpuMash + this.diffs[t].mash) * (.8 + this.rng() * .4); S.bar += side * rate * TUNE.v.scrumPushWeight * dt * .9; }
      }
      S.bar = clamp(S.bar, -1, 1);
      S.shift = S.bar * 12 * this.dir[A];
      if (S.t >= 2.0 || Math.abs(S.bar) >= 1) this.scrumResult();
    }
  },
  scrumTime(t, off) {
    const S = this.setp, a = Math.abs(off), side = t === S.team ? 1 : -1;
    if (a <= .12) { S.tq[t] = 'PERFECT'; S.bar += side * .25; }
    else if (a <= .25) { S.tq[t] = 'GOOD'; S.bar += side * .1; }
    else S.tq[t] = 'LATE';
    this.emit('scrumTiming', { team: t, q: S.tq[t] });
  },
  scrumEarly(t) {
    const S = this.setp;
    this.emit('earlyEngage', { team: t }); this.refCall('early');
    for (const p of this.players) if (p.st === 'set') this.setSt(p, 'up', .3);
    this.setp = null;
    this.whistle('early', () => this.penaltyAward(1 - t, S.x, S.y, 'early', true), .8);
  },
  scrumResult() {
    const S = this.setp, A = S.team, win = S.bar >= 0 ? A : 1 - A, lose = 1 - win;
    for (const p of this.players) if (p.st === 'set') this.setSt(p, 'free');
    this.hypeAdd(win, 6);
    this.emit('scrumWon', { team: win, steal: win !== A });
    if (Math.abs(S.bar) >= .85) {
      const toLine = Math.abs(this.oppLine(win) - S.x);
      for (const p of this.players) if (p.team === lose && p.slot <= 2) this.setSt(p, 'down', 1);
      this.emit('collapse', { team: lose });
      if (toLine < 50 + G.L5) {
        const sh = this.players.find(p => p.team === win && p.slot === 1 && this.onPitch(p)) || this.players.find(p => p.team === win && this.onPitch(p));
        this.setp = null; this.goPhase('play'); this.give(sh, 'scrum');
        sh.x = this.oppLine(win) + this.dir[win] * 6; sh.y = S.y;
        this.emit('pushover', { team: win });
        return this.tryScored(sh, sh.x, S.y, 'pushover');
      }
      this.setp = null;
      return this.whistle('collapse', () => this.penaltyAward(win, S.x, S.y, 'collapse'), .9);
    }
    const sh = this.players.find(p => p.team === win && p.slot === 3 && this.standing(p)) || this.players.filter(p => p.team === win && this.standing(p) && p.slot > 2)[0] || this.players.find(p => p.team === win && this.standing(p));
    this.setp = null; this.goPhase('play');
    if (!sh) { this.ball.st = 'loose'; return; }
    const d = this.dir[win];
    sh.x = S.x - d * 22; sh.y = S.y + 10; this.setSt(sh, 'free'); sh.f = d > 0 ? 0 : PI;
    this.give(sh, 'scrum');
    if (win !== A) { this.stats[win].turnovers++; this.emit('turnover', { id: sh.id, how: 'scrum' }); }
  },
  /* ---- the lineout ---- */
  lineoutSetup(team, x, ty) {
    this.ball.st = 'dead'; this.ball.holder = -1;
    const s = ty <= G.Y0 + 1 ? 1 : -1;
    const w = [.4, .35, .25]; let cpuCall = 0; { const r = this.rng(); cpuCall = r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2; }
    if (this.lastCalls && this.lastCalls.length >= 2 && this.lastCalls.every(c => c === cpuCall)) cpuCall = (cpuCall + 1) % 3;
    this.setp = { kind: 'lineout', team, x, ty, s, sub: 'call', t: 0, calls: [1, 1], picked: [false, false], cpuCall, needle: 0, q: 0, qT: '', pressT: -1, arriveT: 0, timing: 0, result: '' };
    this.stats[team].lineouts++;
    this.goPhase('lineout', 'call');
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'down' && p.st !== 'launch') this.setSt(p, 'free');
    this.emit('lineout', { team, x, ty });
  },
  podY(S, k) { return S.ty + S.s * (G.L5 + 16 * k); },
  lineoutSpots() {
    const S = this.setp, spots = {};
    for (const p of this.players) {
      if (!this.onPitch(p)) continue;
      const d = this.dir[p.team], own = p.team === S.team, call = S.calls[p.team];
      if (p.slot === 1 && own) spots[p.id] = [S.x, S.ty - S.s * 6];
      else if (p.slot <= 2) { const k = own ? (p.slot === 0 ? 0 : 1) : (p.slot === 0 ? 0 : p.slot === 1 ? 1 : 2); const jumper = own ? p.slot === 0 : p.slot === 1; const py = this.podY(S, call) + (jumper ? 0 : S.s * 9) + (own ? 0 : 0); spots[p.id] = [S.x - d * 9, k === 2 && !own ? this.podY(S, (call + 1) % 3) : py]; }
      else if (p.slot === 3) spots[p.id] = [S.x - d * 22, this.podY(S, 2) + S.s * 26];
      else { const k = p.slot - 4; spots[p.id] = [S.x - d * (G.L5 + 30 + k * 8), clamp(this.podY(S, 2) + S.s * (60 + k * 80), G.Y0 + 16, G.Y1 - 16)]; }
    }
    return spots;
  },
  ph_lineout(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    const A = S.team, B = 1 - A, H = [this.humanI(0), this.humanI(1)];
    // the calls: up / down, L1 / R1 or a click on a pod (the CPU by weights; a CPU defence reads it by its difficulty)
    for (const t of [0, 1]) {
      const I = H[t];
      if (I && S.sub !== 'flight' && S.sub !== 'done') {
        let c = S.calls[t];
        if (I.pr.l1 || I.pr.up) c = Math.max(0, c - 1);
        if (I.pr.r1 || I.pr.down) c = Math.min(2, c + 1);
        if (I.podClick !== undefined && I.podClick !== null && I.podClick >= 0) c = I.podClick;
        if (c !== S.calls[t]) { S.calls[t] = c; S.picked[t] = true; this.emit('podPick', { team: t, pod: c }); }
      }
    }
    if (!H[A] && S.t > .4) S.calls[A] = S.cpuCall;
    if (!H[B] && S.t > .9 && !S.defRead) { S.defRead = true; S.calls[B] = this.rng() < this.diffs[B].read ? (H[A] ? S.calls[A] : S.cpuCall) : (S.cpuCall + 1 + Math.floor(this.rng() * 2)) % 3; }
    const spots = this.lineoutSpots();
    for (const p of this.players) {
      if (!this.onPitch(p) || p.st === 'set') continue;
      const s = spots[p.id]; if (!s) continue;
      if (p.st === 'free') { this.walkTo(p, s[0], s[1], dt, 1.4); if (dist2(p.x, p.y, s[0], s[1]) < 3) p.f = p.slot === 1 && p.team === A ? (S.s > 0 ? PI / 2 : -PI / 2) : (S.s > 0 ? -PI / 2 : PI / 2) + (p.slot > 2 ? 0 : 0); }
      else this.stepPlayers1(p, dt);
    }
    const thrower = this.players.find(p => p.team === A && p.slot === 1 && this.onPitch(p)) || this.players.find(p => p.team === A && this.standing(p));
    this.ball.x = thrower.x; this.ball.y = thrower.y - S.s * 2; this.ball.z = 22;
    if (S.sub === 'call') {
      const ready = H[A] ? (H[A].pr.x || S.t > 6) : S.t > 1.6;
      if (ready && S.t > .5) { S.sub = 'throw'; S.t = 0; for (const p of this.players) if (spots[p.id]) { p.x = spots[p.id][0]; p.y = spots[p.id][1]; } }
      return;
    }
    if (S.sub === 'throw') {
      S.needle = 1 - Math.abs(((S.t * 1.25) % 2) - 1);
      let go = false;
      if (H[A]) { if (H[A].pr.x && S.t > .1) go = true; else if (S.t > 5) go = true; }
      else if (S.t > .6 + this.rng() * .02) { S.needle = clamp(.5 + this.rng.gauss() * this.diffs[A].sigma * 1.2, 0, 1); go = true; }
      if (go) {
        const off = Math.abs(S.needle - .5);
        S.q = off < .15 ? 1 : off < .35 ? .6 : 0; S.qT = off < .15 ? 'GOOD THROW' : off < .35 ? 'WOBBLY' : 'NOT STRAIGHT';
        if (S.q === 0) { this.emit('notStraight', { team: A }); this.refCall('notStraight'); this.setp = null; return this.whistle('notStraight', () => this.scrumSetup(B, S.x + this.dir[A] * 0, S.ty + S.s * (G.L15)), .9); }
        S.sub = 'flight'; S.t = 0; S.arriveT = this.t + .65;
        thrower.a.act = 'throwIn'; thrower.a.u = 0;
        this.emit('lineoutThrow', { team: A, q: S.qT, pod: S.calls[A] });
        S.cpuPress = this.rng.gauss() * this.diffs[B].sigma;
        for (const p of this.players) if (p.team !== undefined && p.slot <= 2 && p.st === 'free' && this.onPitch(p)) { const jumper = (p.team === A && p.slot === 0) || (p.team === B && p.slot === 1); if (jumper) { this.setSt(p, 'set'); p.a.act = 'lift'; } }
      }
      return;
    }
    if (S.sub === 'flight') {
      const u = clamp(S.t / .65, 0, 1), py = this.podY(S, S.calls[A]);
      this.ball.x = thrower.x - this.dir[A] * 6 * u; this.ball.y = lerp(thrower.y, py, u); this.ball.z = 22 + Math.sin(u * PI) * 36 + u * 36;
      for (const p of this.players) if (p.st === 'set' && p.a.act === 'lift') p.z = Math.min(56, p.z + dt * 140);
      if (H[B] && H[B].pr.x && S.pressT < 0) S.pressT = this.t;
      if (S.t >= .65) this.lineoutResult();
    }
  },
  lineoutResult() {
    const S = this.setp, A = S.team, B = 1 - A;
    const jA = this.players.find(p => p.team === A && p.slot === 0 && this.onPitch(p)), jB = this.players.find(p => p.team === B && p.slot === 1 && this.onPitch(p));
    let win = A;
    if (S.calls[B] === S.calls[A] && jB) {
      const timing = S.pressT >= 0 ? clamp(1 - Math.abs(S.pressT - S.arriveT) / .3, 0, 1) : (this.humanI(B) ? 0 : clamp(1 - Math.abs(S.cpuPress) / .3, 0, 1));
      const att = .6 * S.q + .04 * (jA ? jA.hnd : 5) + .15, def = .6 * timing + .04 * jB.hnd;
      if (def > att) win = B;
    }
    const jumper = win === A ? jA : jB;
    for (const p of this.players) if (p.st === 'set') { p.z = 0; this.setSt(p, 'free'); }
    this.hypeAdd(win, win === A ? 2 : 8);
    this.emit('lineoutWon', { team: win, steal: win !== A, id: jumper ? jumper.id : -1 });
    if (jumper) { jumper.a.act = 'highCatch'; jumper.a.u = 0; }
    const sh = this.players.find(p => p.team === win && p.slot === 3 && this.standing(p)) || this.players.find(p => p.team === win && this.standing(p));
    this.lastCalls = (this.lastCalls || []).concat(S.cpuCall).slice(-2);
    this.setp = null; this.goPhase('play');
    if (!sh) return;
    const d = this.dir[win];
    sh.x = S.x - d * 18; sh.y = this.podY(S, S.calls[A]) + S.s * 10; this.setSt(sh, 'free'); sh.f = d > 0 ? 0 : PI;
    this.give(sh, 'lineout');
    if (win !== A) { this.stats[win].turnovers++; this.emit('turnover', { id: sh.id, how: 'lineout' }); }
  },
  /* ---- set kicks: conversions and penalty goals, in the behind-the-kicker camera ---- */
  setKickSetup(team, x, y, purpose) {
    const d = this.dir[team], line = this.oppLine(team);
    const kicker = this.players.filter(p => p.team === team && this.onPitch(p)).sort((a, b) => (b.slot === 4) - (a.slot === 4) || b.kck - a.kck)[0];
    const gy = clamp(y, G.Y0 + 8, G.Y1 - 8);
    if (kicker) this.seatToKicker(team, kicker.id);
    let dd = purpose === 'conv' ? G.L5 : Math.abs(line - x);
    if (purpose === 'conv' && (!kicker || kicker.ctl < 0)) dd = clamp(Math.abs(gy - G.CY) * .8 + G.L5, G.L5, 200);
    this.setp = { kind: 'setkick', team, purpose, kicker: kicker ? kicker.id : -1, gy, gx: x, d: dd, sub: purpose === 'conv' ? 'place' : 'aim', t: 0, aim: 0, power: 0, charging: false, clockT: 20, sway: 0, swayP: this.rng() * 6, result: '', resT: 0 };
    this.ball.st = 'dead'; this.ball.holder = -1;
    this.goPhase('setkick', this.setp.sub);
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'launch') { p.pin = false; this.setSt(p, 'free'); }
    if (purpose === 'conv') this.stats[team].convAtt++;
    this.emit('setKick', { team, purpose });
  },
  teePos() { const S = this.setp, d = this.dir[S.team], line = this.oppLine(S.team); return S.purpose === 'conv' ? { x: line - d * S.d, y: S.gy } : { x: S.gx, y: S.gy }; },
  /** the meter's mark for the distance: the power the kick needs to clear the bar (0..1) */
  setKickNeed() {
    const S = this.setp, k = this.players[S.kicker], tee = this.teePos(), line = this.oppLine(S.team);
    const D = Math.hypot(line - tee.x, G.CY - tee.y);
    for (let p = .2; p <= 1.001; p += .02) if (this.setKickHeight(p, D, k) > G.BAR + 4) return p;
    return 1.05;
  },
  setKickVel(power, k) { return lerp(200, 520, power) * (.85 + .015 * Math.min(10, k ? k.kck : 6)) * (this.megaBoot && this.megaBoot[this.setp.team] > 0 ? 1.3 : 1); },
  setKickHeight(power, D, k) {
    const v = this.setKickVel(power, k), el = 38 * PI / 180, vh = v * Math.cos(el), vz = v * Math.sin(el);
    const t = -Math.log(1 - Math.min(.999, D * .3 / vh)) / .3;
    return vz * t - 300 * t * t;
  },
  ph_setkick(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    const k = this.players[S.kicker], d = this.dir[S.team], tee = this.teePos();
    const I = k && k.ctl >= 0 ? this.seats[k.ctl].I : null;
    const line = this.oppLine(S.team);
    // everyone else: the kicking team behind the kicker, the defenders behind their posts
    for (const p of this.players) {
      if (!this.onPitch(p) || p === k) continue;
      if (p.st !== 'free') { this.stepPlayers1(p, dt); continue; }
      const tx = p.team === S.team ? tee.x - d * (40 + p.slot * 6) : line + d * (24 + (p.slot % 3) * 10), ty = p.team === S.team ? G.CY + (p.slot - 3) * 30 : G.CY + (p.slot - 3) * 26;
      this.walkTo(p, tx, ty, dt, .9);
    }
    if (k) { k.x = tee.x - d * (S.sub === 'flight' || S.sub === 'result' ? -2 : 10); k.y = tee.y + (S.sub === 'flight' || S.sub === 'result' ? 0 : 6); k.f = Math.atan2(G.CY - tee.y, line - tee.x); k.vx = k.vy = 0; }
    if (S.sub !== 'flight' && S.sub !== 'result') { this.ball.x = tee.x; this.ball.y = tee.y; this.ball.z = 3; }
    if (S.sub !== 'flight' && S.sub !== 'result') { S.clockT -= dt; if (S.clockT <= 0) { S.power = Math.max(S.power, .7); return this.setKickGo(); } }
    const kck = k ? Math.min(10, k.kck) : 6;
    S.swayP += dt * (1.3 + (10 - kck) * .08); S.sway = Math.sin(S.swayP) * (3 + (10 - kck) * 1.6) * (I ? this.diffs[S.team].kick : 0);
    if (S.sub === 'place') {
      if (I) {
        const mv = I.placeMove || 0;   // the intent layer turns the stick for the view: + moves the tee back
        S.d = clamp(S.d + mv * 160 * dt, G.L5, 400);
        if (I.pr.x || I.pr.ci || S.t > 12) { S.sub = 'aim'; S.t = 0; this.sub = 'aim'; }
      } else if (S.t > 1.2) { S.sub = 'aim'; S.t = 0; this.sub = 'aim'; }
      return;
    }
    if (S.sub === 'aim' || S.sub === 'power') {
      if (I) {
        if (I.aimY !== undefined && I.aimY !== null) S.aim = clamp(I.aimY - G.CY, -90, 90);
        else S.aim = clamp(S.aim + (I.aimMove || 0) * 70 * dt, -90, 90);
        if (I.hd.ci || I.mhold) { if (!S.charging) { S.charging = true; S.power = 0; S.sub = 'power'; this.sub = 'power'; } S.power = Math.min(1.05, S.power + dt / 1.1); }
        else if (S.charging) { S.charging = false; return this.setKickGo(); }
      } else {
        if (S.t > 1.0 && !S.charging) { S.charging = true; S.sub = 'power'; this.sub = 'power'; const need = this.setKickNeed(); S.cpuPower = clamp(Math.max(need + .05, .86) + this.rng.gauss() * .05 * this.diffs[S.team].kick, .3, 1.05); S.aim = 0; S.cpuErr = this.rng.gauss() * (12 - kck) * PI / 180 * .35 * this.diffs[S.team].kick; }
        if (S.charging) { S.power = Math.min(1.05, S.power + dt / 1.1); if (S.power >= S.cpuPower) { S.charging = false; return this.setKickGo(); } }
      }
      return;
    }
    if (S.sub === 'flight') {
      this.stepBall(dt);
      if (this.pendingKick && !S.result) { S.result = this.pendingKick; S.resT = 0; }
      if (S.result) { S.resT += dt; if (S.resT > 1.1) return this.setKickResult(S.result === 'good', S.result); }
      else if (S.t > 3.2 || (this.ball.st === 'loose' && S.t > .8)) return this.setKickResult(false, 'miss');
      return;
    }
  },
  /** the kick leaves the tee: toward the reticle, with the wind; a hook unless the meter stopped in the band */
  setKickGo() {
    const S = this.setp, k = this.players[S.kicker], tee = this.teePos(), line = this.oppLine(S.team), d = this.dir[S.team];
    const kck = k ? Math.min(10, k.kck) : 6, mega = this.megaBoot && this.megaBoot[S.team] > 0;
    const band = S.power >= .82 && S.power <= .95 || (mega && S.power >= .7 && S.power <= 1);
    let a = Math.atan2(G.CY + S.aim + S.sway - tee.y, line - tee.x);
    if (!band) a += (this.rng() * 2 - 1) * (12 - kck) * PI / 180 * (k && k.ctl >= 0 ? 1 : .4);
    if (S.cpuErr) a += S.cpuErr;
    const v = this.setKickVel(Math.min(1, S.power), k) * (S.power > 1 ? .97 : 1), el = 38 * PI / 180;
    this.ball.st = 'air'; this.ball.holder = -1; this.ball.x = tee.x; this.ball.y = tee.y; this.ball.z = 3;
    this.ball.vx = Math.cos(a) * v * Math.cos(el); this.ball.vy = Math.sin(a) * v * Math.cos(el); this.ball.vz = v * Math.sin(el);
    this.ball.kind = 'setkick'; this.ball.aimTeam = S.team; this.ball.from = S.kicker; this.ball.team = S.team; this.ball.t = 0; this.ball.tried = {};
    if (mega) this.megaBoot[S.team] = 0;
    this.pendingKick = null; S.sub = 'flight'; S.t = 0; this.sub = 'flight'; S.band = band;
    if (k) { k.a.act = 'placeKick'; k.a.u = 0; this.setSt(k, 'kick', .5); }
    this.emit('setKickGo', { team: S.team, band, power: S.power });
  },
  setKickResult(good, how) {
    const S = this.setp; if (!S) return;
    const team = S.team;
    this.setp = null; this.pendingKick = null;
    if (good) {
      const pts = S.purpose === 'conv' ? 2 : 3;
      this.addScore(team, pts, S.purpose);
      if (S.purpose === 'conv') { this.stats[team].convs++; this.hypeAdd(team, 5); }
      this.emit(S.purpose === 'conv' ? 'convMade' : 'penGoal', { team });
    } else this.emit(how === 'doink' ? 'doinkMiss' : 'convMissed', { team, purpose: S.purpose });
    this.ball.st = 'dead';
    if (S.purpose === 'conv') { const scorer = team; this.whistle('conv', () => this.afterScore(scorer), .5); }
    else if (good) this.whistle('pen', () => this.afterScore(team), .5);
    else this.whistle('penMiss', () => this.dropoutSetup(1 - team), .5);
  },
  /* ---- the penalty: the captain's choice on three big cards ---- */
  penaltyAward(team, x, y, kind, free) {
    if (this.hooter && !this.sudden && !free) { this.ball.st = 'dead'; return this.whistle('pen', null, .8); }
    x = clamp(x, G.X0 + G.L5, G.X1 - G.L5); y = clamp(y, G.Y0 + 20, G.Y1 - 20);
    this.ball.st = 'dead'; this.ball.holder = -1; this.adv = null;
    const line = this.oppLine(team), canGoal = !free && Math.hypot(line - x, G.CY - y) < 400;
    this.setp = { kind: 'penalty', team, x, y, sub: 'choose', sel: canGoal ? 1 : 0, opts: ['tap', canGoal ? 'goal' : null, 'touch'], free: !!free, foul: kind, t: 0 };
    this.goPhase('penalty');
    for (const p of this.players) if (this.onPitch(p) && (p.st === 'set' || p.st === 'ruck' || p.st === 'cele')) this.setSt(p, 'free');
    this.ref.signal = 'penalty'; this.ref.sigT = 2.5;
    this.emit(free ? 'freeKick' : 'penalty', { team, x, y, kind });
  },
  ph_penalty(dt) {
    const S = this.setp; if (!S) return this.goPhase('play');
    S.t += dt;
    for (const p of this.players) if (this.onPitch(p)) { if (p.st === 'free') this.brake(p, dt); else this.stepPlayers1(p, dt); }
    this.ball.x = S.x; this.ball.y = S.y; this.ball.z = 0;
    const I = this.humanI(S.team), n = S.opts.length, ok = i => !!S.opts[i];
    if (I) {
      if (I.pr.left || I.pr.up || I.pr.l1) { let i = S.sel; do { i = (i + n - 1) % n; } while (!ok(i)); S.sel = i; this.emit('menuMove', {}); }
      if (I.pr.right || I.pr.down || I.pr.r1) { let i = S.sel; do { i = (i + 1) % n; } while (!ok(i)); S.sel = i; this.emit('menuMove', {}); }
      if (I.cardHover !== undefined && I.cardHover !== null && ok(I.cardHover)) S.sel = I.cardHover;
      if ((I.pr.x || I.cardClick) && S.t > .4) return this.penaltyChoose(S.sel);
      if (S.t > 15) return this.penaltyChoose(S.sel);
    } else if (S.t > 1.4) {
      // the CPU: a kick at goal within 300 when it is close or late; to touch from far; a tap near the line or trailing late
      const line = this.oppLine(S.team), dl = Math.hypot(line - S.x, G.CY - S.y), diff = this.score[S.team] - this.score[1 - S.team], late = this.half === 2 && this.clock > this.halfLen * .75;
      let c = 2;
      if (Math.abs(line - S.x) < 50) c = 0;
      else if (S.opts[1] && dl < 300 && (Math.abs(diff) <= 7 || late)) c = 1;
      else if (late && diff < -3) c = 0;
      this.penaltyChoose(c);
    }
  },
  penaltyChoose(i) {
    const S = this.setp; if (!S) return;
    const opt = S.opts[i] || 'tap', team = S.team, d = this.dir[team];
    this.emit('choice', { team, opt });
    if (opt === 'goal') return this.setKickSetup(team, S.x, S.y, 'pen');
    if (opt === 'tap') {
      // tap and go: the offenders are put back ten metres
      for (const p of this.players) if (p.team !== team && this.onPitch(p) && (p.x - S.x) * d < G.L10) p.x = S.x + d * G.L10 + (p.slot - 3) * 2 * d;
      this.emit('tapGo', { team });
      return this.restartPlay(team, S.x, S.y);
    }
    // kick for touch: the kicker punts at the nearer touchline; his team throws in at the lineout
    const k = this.players.filter(p => p.team === team && this.standing(p)).sort((a, b) => (b.slot === 4) - (a.slot === 4) || b.kck - a.kck)[0];
    this.setp = null; this.goPhase('play');
    k.x = S.x; k.y = S.y; this.setSt(k, 'free'); this.give(k, 'restart');
    const ty = S.y < G.CY ? G.Y0 - 70 : G.Y1 + 70, tx = clamp(S.x + d * (140 + Math.min(10, k.kck) * 14), G.X0 + 60, G.X1 - 60);
    this.kickForTouch = team;
    this.doKick(k, 'punt', tx, ty, .95, { exact: true, apex: 45 });
  }
});


/* ==== 14-ai.js ==== */
/* ---- THE CPU BRAIN. Both CPU teams and a human's CPU teammates run it; difficulty and each team's style change its
 * numbers, never its logic. Shapes per team every .25 s; each player's decision every .15 s plus its reaction ---- */
Object.assign(Match.prototype, {
  aggr(t) { return clamp(this.teams[t].style.aggr + (TUNE.v.aiAggression - .5), 0, 1); },
  react(t) { return Math.max(0, TUNE.v.aiReaction + this.diffs[t].react + (this.teams[t].style.react || 0)); },
  /** an intent that runs p toward (x, y): arriving gently, turbo when asked */
  seek(p, x, y, turbo, slow) {
    const I = TT.emptyIntent(), dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d > 3) { const k = Math.min(1, d / (slow ? 40 : 18)); I.mx = dx / d * k; I.my = dy / d * k; }
    I.turbo = !!turbo && d > 40;
    return I;
  },
  ai(p, dt) {
    if (!this.onPitch(p)) return TT.emptyIntent();
    if (TT.cheats.cpuFrozen && !this.isHumanTeam(p.team)) return TT.emptyIntent();
    if (this.parked && this.parked.has(p.id)) return TT.emptyIntent();
    if (this.forced && this.forced[p.id]) { const f = this.forced[p.id]; if (f.t > this.t) return f.I; delete this.forced[p.id]; }
    if (this.phase === 'play') return this.aiPlay(p, dt);
    if (this.phase === 'ruck') return this.aiRuck(p, dt);
    return TT.emptyIntent();
  },
  /** the team shapes: recomputed every .25 s (attack slots, defence assignments) */
  shapes() {
    if (this.shapeT && this.t - this.shapeT < .25) return this.shape;
    this.shapeT = this.t;
    const b = this.ball, c = this.carrier(), S = this.shape = { att: c ? c.team : (b.st === 'air' && b.kind === 'pass' ? b.team : this.poss), slots: {}, def: {} };
    const at = S.att, d = this.dir[at];
    const cx = c ? c.x : b.x, cy = c ? c.y : b.y;
    // attack: six support slots in a staggered line behind the carrier, three each side, wider to the open side
    const open = (G.Y1 - cy) > (cy - G.Y0) ? 1 : -1, slots = [];
    for (let k = 1; k <= 3; k++) for (const side of [open, -open]) {
      const gap = side === open ? 58 : 46;
      slots.push({ x: cx - d * (18 + 10 * k), y: clamp(cy + side * gap * k, G.Y0 + 20, G.Y1 - 20), k, side });
    }
    const sup = this.players.filter(p => p.team === at && this.standing(p) && (!c || p.id !== c.id) && p.ctl < 0);
    // forwards to the near slots, backs wider, the wing the widest open-side slot; then nearest first (with hysteresis)
    const prev = this.prevSlots || {}, used = new Set();
    const order = sup.slice().sort((a, q) => (a.slot <= 2 ? 0 : a.slot === 6 ? 2 : 1) - (q.slot <= 2 ? 0 : q.slot === 6 ? 2 : 1));
    for (const p of order) {
      let best = -1, bd = 1e9;
      slots.forEach((s, i) => {
        if (used.has(i)) return;
        let cost = dist2(p.x, p.y, s.x, s.y) + (p.slot <= 2 ? s.k * 30 : p.slot === 6 ? (s.side === open ? -s.k * 40 : 60) : 0);
        if (prev[p.id] === i) cost -= 20;
        if (cost < bd) { bd = cost; best = i; }
      });
      if (best >= 0) { used.add(best); S.slots[p.id] = slots[best]; }
    }
    this.prevSlots = {}; for (const id in S.slots) this.prevSlots[id] = slots.indexOf(S.slots[id]);
    // defence: the tackler (soonest to the carrier), the cover, the sweeper deep; the rest man on man by y order
    const df = 1 - at, defs = this.players.filter(p => p.team === df && this.standing(p) && p.ctl < 0);
    const tx = c ? c.x + c.vx * .3 : b.x, ty = c ? c.y + c.vy * .3 : b.y;
    const byTime = defs.slice().sort((a, q) => dist2(a.x, a.y, tx, ty) / this.speedOf(a) - dist2(q.x, q.y, tx, ty) / this.speedOf(q));
    const humanDef = this.players.find(p => p.team === df && p.ctl >= 0 && this.standing(p) && dist2(p.x, p.y, tx, ty) < 60);
    S.tackler = humanDef ? -1 : (byTime[0] ? byTime[0].id : -1);
    S.cover = byTime[humanDef ? 0 : 1] ? byTime[humanDef ? 0 : 1].id : -1;
    const ownLine = this.ownLine(df), toLine = Math.abs(cx - ownLine);
    const sweeper = defs.find(p => p.slot === 6 && p.id !== S.tackler && p.id !== S.cover) || defs.find(p => p.slot === 4 && p.id !== S.tackler && p.id !== S.cover);
    S.sweeper = sweeper && toLine > 200 ? sweeper.id : -1;
    const lineX = cx + d * 30;
    const rest = defs.filter(p => p.id !== S.tackler && p.id !== S.cover && p.id !== S.sweeper).sort((a, q) => a.y - q.y);
    const atts = this.players.filter(p => p.team === at && this.standing(p) && (!c || p.id !== c.id)).sort((a, q) => a.y - q.y);
    const wide = defs.length < 6 ? 1.25 : 1;
    // man on man by y order, but the line always spans the width (spaced wider with a man in the bin)
    const span = 70 * wide, mid = (rest.length - 1) / 2, half = mid * span + span * .6;
    const ccy = clamp(cy, G.Y0 + 20 + half, G.Y1 - 20 - half);   // the line fits inside the field: wide of the ball, it spreads to the open side
    rest.forEach((p, i) => {
      const m = atts[Math.round(i * (atts.length - 1) / Math.max(1, rest.length - 1))];
      const even = ccy + (i - mid) * span + (i >= mid ? span * .6 : -span * .6);
      const my = m ? lerp(m.y, even, .7) : even;
      S.def[p.id] = { x: clamp(lineX, G.DX0 + 10, G.DX1 - 10), y: clamp(my, G.Y0 + 14, G.Y1 - 14) };
    });
    if (S.cover >= 0) S.def[S.cover] = { x: cx + d * 50, y: lerp(cy, G.CY, .3) };
    if (S.sweeper >= 0) S.def[S.sweeper] = { x: cx + d * 140, y: lerp(cy, G.CY, .5) };
    return S;
  },
  aiPlay(p, dt) {
    const b = this.ball, c = this.carrier(), S = this.shapes();
    if (c === p) return this.aiCarrier(p, dt);
    if (p.ai.buy > 0) { const I = TT.emptyIntent(); I.mx = Math.cos(p.f + (p.ai.buySide || 1) * .8) * .6; I.my = Math.sin(p.f + (p.ai.buySide || 1) * .8) * .6; return I; }
    // a super on, a pie on the floor, a kick in the air, a loose ball: the special cases first
    if (p.sup && p.sup.kind === 'hurricane' && c && c.team !== p.team) { const I = this.seek(p, c.x + c.vx * .2, c.y + c.vy * .2, true); if (dist(p, c) < 16) I.cmd = { tackle: true }; return I; }
    const pu = this.powerups.find(q => q.on && !q.taken && dist(q, p) < 100 && q.chaser === p.id);
    if (pu) return this.seek(p, pu.x, pu.y, true);
    if (b.st === 'air' && b.kind !== 'pass' && b.land) return this.aiKickChase(p, S);
    if (b.st === 'loose' || (b.st === 'air' && b.kind === 'spill')) return this.aiLoose(p, S);
    if (!c) { const s = S.slots[p.id] || S.def[p.id]; return s ? this.seek(p, s.x, s.y) : this.seek(p, b.x, b.y); }
    if (c.team === p.team) {
      // support: run the slot (staying behind the carrier); a pass coming to him: run on to it
      if (b.st === 'air' && b.to === p.id) { const I = this.seek(p, p.x + this.dir[p.team] * 30, p.y); I.turbo = false; return I; }
      const s = S.slots[p.id]; if (!s) return this.seek(p, c.x - this.dir[p.team] * 30, c.y + (p.slot - 3) * 30);
      const d = this.dir[p.team], tx = (s.x - c.x) * d > -6 ? c.x - d * 6 : s.x;
      const I = this.seek(p, tx, s.y, this.breakDone && this.tryRun && this.tryRun.id === c.id, true);
      // a cheap shot on a defender, when the referee is looking the other way
      return this.aiCheap(p, I) || I;
    }
    return this.aiDefend(p, c, S, dt);
  },
  aiDefend(p, c, S, dt) {
    const t = p.team, d = this.dir[c.team];
    if (c.held > 0 && c.holdBy !== p.id && dist(p, c) < 90) { const I = this.seek(p, c.x, c.y, true); if (dist(p, c) < TUNE.v.tackleRange + 8 + (c.size - 1) * 8 && this.t >= p.ai.dec) { p.ai.dec = this.t + .1; I.cmd = { tackle: true }; } return I; }
    if (S.tackler === p.id || dist(p, c) < 26) {
      const lead = clamp(dist(p, c) / 220, 0, .5);
      const I = this.seek(p, c.x + c.vx * lead, c.y + c.vy * lead, dist(p, c) > 40);
      this.aiTackle(p, c, I, dt);
      return I;
    }
    // the human team's sweeper rule: within 200 of the line he joins the line
    const s = S.def[p.id];
    if (s) { const I = this.seek(p, s.x, s.y, Math.abs(s.x - p.x) > 120); if (!(S.cover === p.id)) { const ahead = (p.x - c.x) * d; if (ahead < 0) I.turbo = true; } return this.aiCheap(p, I) || this.aiSuperDef(p, c, I) || I; }
    return this.seek(p, c.x + d * 40, c.y);
  },
  /** the tackler's decisions: after its reaction, in reach and facing: a tackle, a big hit or a dive */
  aiTackle(p, c, I, dt) {
    const A = p.ai, aggr = this.aggr(p.team), dd = dist(p, c), facing = Math.abs(angDiff(p.f, angTo(p, c))) < 1.1;
    if (this.t < A.dec) return;
    A.dec = this.t + .15 + this.react(p.team) * (.6 + this.rng() * .8);
    const headOn = Math.abs(angDiff(c.f, angTo(c, p))) < .8;   // the tackler is in front of the runner
    if (p.boss || p.pu && p.pu.kind === 'iron') { if (dd < 40 && headOn && p.charge < 0) { I.cmd = { big: true }; return; } }
    // a big hit: wound up from 40 out at a man coming head on, let go in reach
    if (p.charge >= 0) { I.cmd = { big: dd < 16 + (c.size - 1) * 8 ? 'go' : true }; if (p.chargeT > 1.0) I.cmd = { big: 'go' }; return; }
    if ((p.pow >= 7 || aggr >= .6) && headOn && dd < 40 && dd > 18 && this.rng() < .35 * aggr) { I.cmd = { big: true }; return; }
    // a dive: chasing a faster man from behind
    const behind = Math.abs(angDiff(c.f, angTo(c, p))) > 2.2;
    if (behind && dd > 16 && dd < 30 && this.speedOf(c) >= this.speedOf(p) * .95 && this.rng() < .5) { I.cmd = { dive: true }; return; }
    if (dd < TUNE.v.tackleRange + 3 + (c.size - 1) * 8 && facing && this.rng() < .6 + .3 * aggr) I.cmd = { tackle: true };
  },
  /** a shoulder on an opponent without the ball, when the ref is turned away (a team's cheapShots rate) */
  aiCheap(p, I) {
    const rate = this.teams[p.team].style.cheap; if (rate <= 0 || this.rng() > rate * .02) return null;
    if (this.refSees(p) && this.ref.down <= 0 && this.rng() > .2) return null;   // (now and then it misjudges where the ref is looking)
    const v = this.players.find(q => q.team !== p.team && this.standing(q) && FREE[q.st] && this.ball.holder !== q.id && dist(p, q) < 14 && Math.abs(angDiff(p.f, angTo(p, q))) < 1.2);
    if (!v) return null;
    I.cmd = { cheap: v.id }; return I;
  },
  aiSuperDef(p, c, I) {
    if (this.hype[p.team] < 100 || p.sup) return null;
    const toLine = Math.abs(this.oppLine(c.team) - c.x);
    if (toLine < 120 && dist(p, c) < 120 && (this.teams[p.team].style.supers || this.rng() < .02)) { I.cmd = { super: true }; return I; }
    return null;
  },
  aiKickChase(p, S) {
    const b = this.ball, L = b.land, kt = b.team;
    if (!this.kickRoles || this.kickRoles.t !== b.t0Key) {
      const rk = p.team; void rk;
      const recv = this.players.filter(q => q.team !== kt && this.standing(q)).sort((a, q) => dist2(a.x, a.y, L.x, L.y) - dist2(q.x, q.y, L.x, L.y));
      const chase = this.players.filter(q => q.team === kt && this.standing(q) && q.id !== b.from).sort((a, q) => (dist2(a.x, a.y, L.x, L.y) / this.speedOf(a)) - (dist2(q.x, q.y, L.x, L.y) / this.speedOf(q)));
      this.kickRoles = { t: b.t0Key, catch: recv[0] ? recv[0].id : -1, back: recv[1] ? recv[1].id : -1, chase: chase.slice(0, 2).map(q => q.id) };
    }
    const R = this.kickRoles;
    if (p.id === R.catch) return this.seek(p, L.x, L.y, true);
    if (p.id === R.back) return this.seek(p, L.x + this.dir[p.team] * -30, L.y + 20, true);
    if (R.chase.includes(p.id)) return this.seek(p, L.x, L.y, true);
    const s = S.slots[p.id] || S.def[p.id];
    if (p.team === kt) return this.seek(p, L.x - this.dir[kt] * 60 + (p.slot - 3) * 8, clamp(L.y + (p.slot - 3) * 50, G.Y0 + 20, G.Y1 - 20));
    return s ? this.seek(p, s.x, s.y) : this.seek(p, L.x + this.dir[p.team] * -80, L.y + (p.slot - 3) * 40);
  },
  aiLoose(p, S) {
    const b = this.ball, k = Math.min(1, Math.hypot(b.vx, b.vy) / 200);
    const rx = b.x + b.vx * .5 * k, ry = b.y + b.vy * .5 * k;
    const mine = this.players.filter(q => q.team === p.team && this.standing(q) && FREE[q.st]).sort((a, q) => dist2(a.x, a.y, rx, ry) - dist2(q.x, q.y, rx, ry));
    if (mine.indexOf(p) >= 0 && mine.indexOf(p) < 2) return this.seek(p, rx, ry, true);
    const d = this.dir[p.team];
    return this.seek(p, rx - d * (40 + p.slot * 10), clamp(ry + (p.slot - 3) * 45, G.Y0 + 20, G.Y1 - 20));
  },
  /** the CPU carrier: run at the widest gap, pass when pressed, step or fend a committed tackler, kick when it pays */
  aiCarrier(p, dt) {
    const A = p.ai, d = this.dir[p.team], gx = this.oppLine(p.team), noise = this.diffs[p.team].noise, style = this.teams[p.team].style;
    const foes = this.players.filter(q => q.team !== p.team && this.standing(q));
    const near = foes.map(q => [q, dist(p, q)]).sort((a, q) => a[1] - q[1]);
    const closest = near[0] ? near[0][1] : 999, tk = near[0] && near[0][0];
    // the in-goal: dive to ground it, or carry on to the posts when nobody is close
    if (this.inGoal(p.team, p.x)) {
      const I = this.seek(p, gx + d * 30, G.CY, true);
      if (closest < 60 || Math.abs(p.y - G.CY) < 30 || p.inGoalT > 1.2) I.cmd = { ground: true };
      return I;
    }
    // steer: ahead, away from the defenders in front, toward the posts near the line, 20 inside touch
    let ty = p.y, tx = p.x + d * 90;
    for (const [q, dq] of near) { if (dq > 90 || (q.x - p.x) * d < -10) continue; ty += (p.y - q.y > 0 ? 1 : -1) * (90 - dq) * .9; }
    const toLine = Math.abs(gx - p.x);
    if (toLine < 120) ty = lerp(ty, G.CY, .25);
    ty = clamp(ty, G.Y0 + 22, G.Y1 - 22);
    const I = this.seek(p, tx, ty);
    I.mx = d * .85 + I.mx * .3; const m = Math.hypot(I.mx, I.my); I.mx /= m; I.my /= m;
    const space = closest > 60;
    I.turbo = (space || toLine < 160) && (p.turbo > TUNE.v.turboTank * .3 || this.unlimitedTurbo(p));
    if (this.t < A.dec) return I;
    A.dec = this.t + .15 + this.react(p.team) * (.5 + this.rng() * .5);
    const r = this.rng() + (this.rng() - .5) * noise;
    // supers: THUNDER RUN in the opponents' half with space ahead
    if (this.hype[p.team] >= 100 && !p.sup && this.adv1(p.team, p.x) > -40 && r < (style.supers ? .5 : .3)) { I.cmd = { super: true }; return I; }
    // a drop goal: the last 20 s, trailing by 3 or less, in range
    const diff = this.score[p.team] - this.score[1 - p.team], late = this.half === 2 && this.halfLen - this.clock < 20 && !this.hooter;
    if (late && diff <= 0 && diff >= -3 && toLine < 280 && closest > 18 && Math.abs(p.y - G.CY) < 140) { I.cmd = { kick: { kind: 'drop', x: gx, y: G.CY, power: .9 } }; return I; }
    if (tk && closest < 30 && (tk.x - p.x) * d > -6) {
      const committing = closest < 22 && Math.abs(angDiff(tk.f, angTo(tk, p))) < .9;
      if (committing && p.stepCd <= 0 && r < .25 * (.5 + p.spd / 20) * (1 + (this.o.attract ? 1 : 0))) { I.cmd = this.rng() < .25 ? { spin: true } : { step: this.awaySide(p) }; return I; }
      if (closest < 16 && p.pow >= 6 && p.fendCd <= 0 && r < .4) { I.cmd = { fend: true }; return I; }
      // a pass to the man with the most space
      if (r < .55 + style.pass * .4 && p.cool <= 0) {
        const L = this.legalReceivers(p, 0).filter(q => dist(q, p) < 160);
        let best = null, bs = -1e9;
        for (const q of L) {
          const lane = foes.some(f => segDist(f.x, f.y, p.x, p.y, q.x, q.y) < 12);
          const sp = foes.reduce((a, f) => Math.min(a, dist(f, q)), 999) - (lane ? 80 : 0) + (this.rng() - .5) * 60 * noise;
          if (sp > bs) { bs = sp; best = q; }
        }
        if (best && bs > closest - 10) { I.cmd = { pass: best.id, long: dist(best, p) > 100 }; return I; }
      }
    }
    // kicks: deep in the own 22 under pressure, to touch; a flat line ahead, a grubber or a bomb
    const own22 = this.adv1(p.team, p.x) < -G.W / 2 + G.L22;
    if (own22 && closest < 40 && r < .5 + style.kick * .5) { const ty2 = p.y < G.CY ? G.Y0 - 70 : G.Y1 + 70; I.cmd = { kick: { kind: 'punt', x: p.x + d * 260, y: ty2, power: .9, touch: true } }; return I; }
    if (!own22 && closest < 34 && closest > 14 && r < style.kick * .12) {
      const flat = foes.filter(q => Math.abs((q.x - p.x) * d) < 50).length >= 4;
      if (flat) { I.cmd = this.rng() < .5 ? { kick: { kind: 'grubber', x: p.x + d * 170, y: p.y, power: .5 } } : { kick: { kind: 'bomb', x: p.x + d * 200, y: p.y, power: .8 } }; return I; }
    }
    return I;
  },
  /** at a ruck: the attack's scrum-half to the base, the others in a shape round it; the defence behind its line */
  aiRuck(p, dt) {
    const S = this.setp; if (!S) return TT.emptyIntent();
    const att = S.att, d = this.dir[att], base = { x: S.x - d * 12, y: S.y };
    if (p.team === att) {
      if (p.slot === 3) return this.seek(p, base.x - d * 4, base.y + 6, true);
      const k = [0, 1, 2, -1, 1, 2, 3][p.slot], side = p.slot % 2 ? 1 : -1, open = (G.Y1 - S.y) > (S.y - G.Y0) ? 1 : -1;
      return this.seek(p, base.x - d * (20 + k * 10), clamp(base.y + open * side * (30 + Math.abs(k) * 40), G.Y0 + 20, G.Y1 - 20));
    }
    const line = S.x + d * 18;
    const rank = this.players.filter(q => q.team === p.team && this.standing(q) && q.st !== 'ruck').sort((a, q) => a.y - q.y).indexOf(p);
    const n = this.players.filter(q => q.team === p.team && this.standing(q) && q.st !== 'ruck').length;
    if (p.slot === 6 || (p.slot === 4 && n > 5)) return this.seek(p, S.x + d * 130, lerp(S.y, G.CY, .5));
    return this.seek(p, line, clamp(S.y + (rank - (n - 1) / 2) * 50, G.Y0 + 15, G.Y1 - 15));
  }
});


/* ==== 15-arcade.js ==== */
/* ---- THE ARCADE LAYER: hype and supers (THUNDER RUN, HURRICANE HIT), ON FIRE, crowd-thrown power-ups, venue hazards
 * (mud, the chicken, flame jets, lightning), wind, the referee flattened; and force(): every dev EVENT, also used by the
 * attract director and the tests ---- */
const GRATES = [];
for (let i = 0; i < 8; i++) { const x = G.X0 + 70 + i * (G.W - 140) / 7; GRATES.push({ x, y: G.Y0 + 32 }, { x, y: G.Y1 - 32 }); }
TT.GRATES = GRATES;
Object.assign(Match.prototype, {
  doSuper(p) {
    if (this.hype[p.team] < 100 && !(TT.cheats.hypeFull && this.isHumanTeam(p.team)) && !this.o.attract) return false;
    if (p.sup) return false;
    const has = this.ball.st === 'held' && this.ball.holder === p.id;
    if (!has) { const c = this.carrier(); if (!c || c.team === p.team) return false; }
    this.hype[p.team] = 0;
    p.sup = { kind: has ? 'thunder' : 'hurricane', t: has ? TUNE.v.superTime * (p.boss ? 1.5 : 1) : 2, retarget: 1 };
    this.emit('superStart', { id: p.id, kind: p.sup.kind, boss: p.boss });
    this.banner(has ? (p.boss ? 'UNIT TRAIN!' : 'THUNDER RUN!') : 'HURRICANE HIT!', { color: '#ffd040', big: true });
    return true;
  },
  endSuper(p) { if (!p.sup) return; const k = p.sup.kind; p.sup = null; this.emit('superEnd', { id: p.id, kind: k }); },
  arcadeStep(dt) {
    const live = this.phase === 'play' || this.phase === 'ruck';
    if (TT.cheats.hypeFull) for (const t of [0, 1]) if (this.isHumanTeam(t)) this.hype[t] = 100;
    if (this.o.attract && this.o.attractHype) this.hype = [100, 100];
    for (const p of this.players) {
      if (p.sup) {
        p.sup.t -= dt;
        if (p.sup.kind === 'hurricane') {
          const c = this.carrier();
          if (!c || c.team === p.team) { if (p.sup.retarget-- <= 0 || !c) this.endSuper(p); }
          else if (FREE[p.st] && this.phase === 'play') { const a = angTo(p, c), sp = this.speedOf(p) * 1.1; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.f = a; if (dist(p, c) < 16 + (c.size - 1) * 8) this.contact(p, c, 'hurricane'); }
        }
        if (p.sup && (p.sup.t <= 0 || (p.sup.kind === 'thunder' && this.ball.holder !== p.id))) this.endSuper(p);
      }
      if (p.fire > 0 && live) { p.fire -= dt; if (p.fire <= 0) { p.fire = 0; this.emit('fireOut', { id: p.id }); } }
      if (p.pu && p.pu.t > 0) { p.pu.t -= dt; if (p.pu.t <= 0) { this.emit('powerupEnd', { id: p.id, kind: p.pu.kind }); p.pu = null; } }
    }
    if (TT.cheats.onFire) { const s = this.seats[0]; const p = s && this.players[s.pid]; if (p && !(p.fire > 0)) { p.fire = 90; this.emit('onFire', { id: p.id }); } }
    if (this.megaBoot) for (const t of [0, 1]) if (this.megaBoot[t] > 0) this.megaBoot[t] -= dt;
    // the wind shifts every 15-25 s
    if (this.windy) { this.wind.t -= dt; if (this.wind.t <= 0) { this.wind.t = 15 + this.rng() * 10; this.wind.s = this.rng(); this.wind.a = this.rng() * TAU; this.emit('windShift', { s: this.wind.s }); } }
    if (!live) { this.hazardStep(dt, false); return; }
    // power-ups: a fan in the stand throws one on every 30 s (+-10) of open play
    if (!this.o.noPowerups && this.phase === 'play') {
      this.puT -= dt;
      if (this.puT <= 0 && !this.powerups.some(q => !q.taken)) { this.puT = TUNE.v.powerupEvery + (this.rng() * 20 - 10); this.throwPowerup(); }
    }
    this.powerupStep(dt);
    this.hazardStep(dt, true);
  },
  throwPowerup(kind, at) {
    kind = kind || TT.POWERUP_ORDER[Math.floor(this.rng() * TT.POWERUP_ORDER.length)];
    const b = this.ball;
    let x, y, n = 0;
    do { x = G.X0 + 80 + this.rng() * (G.W - 160); y = G.Y0 + 50 + this.rng() * (G.H - 100); n++; } while (n < 20 && dist2(x, y, b.x, b.y) < 80);
    if (at) { x = at.x; y = at.y; }
    const fromX = clamp(x + (this.rng() - .5) * 200, G.X0, G.X1), fromY = G.Y0 - 70;
    const q = { kind, x, y, z: 0, fx: fromX, fy: fromY, t: 0, fly: 1.1, on: false, taken: false, life: 15, chaser: -1 };
    this.powerups.push(q);
    this.emit('powerupThrow', { kind, x, y });
    return q;
  },
  powerupStep(dt) {
    for (const q of this.powerups) {
      if (q.taken) continue;
      q.t += dt;
      if (!q.on) { if (q.t >= q.fly) { q.on = true; q.t = 0; this.emit('powerupLand', { kind: q.kind, x: q.x, y: q.y }); const ch = this.players.filter(p => p.ctl < 0 && this.standing(p) && this.ball.holder !== p.id && dist(p, q) < 100).sort((a, b) => dist(a, q) - dist(b, q))[0]; q.chaser = ch ? ch.id : -1; } continue; }
      if (q.t >= q.life) { q.taken = true; this.emit('powerupGone', { kind: q.kind }); continue; }
      const p = this.players.find(o => this.standing(o) && FREE[o.st] && dist(o, q) < 10 + (o.size - 1) * 4);
      if (p) this.takePowerup(p, q);
    }
    this.powerups = this.powerups.filter(q => !q.taken || q.t < 1);
  },
  takePowerup(p, q) {
    q.taken = true; q.t = 0;
    const k = q.kind, P = TT.POWERUPS[k];
    if (k === 'horn') this.hypeAdd(p.team, 40);
    else if (k === 'boot') { this.megaBoot = this.megaBoot || [0, 0]; this.megaBoot[p.team] = P.time; }
    else { p.pu = { kind: k, t: P.time }; if (k === 'pie') p.turbo = TUNE.v.turboTank; }
    this.emit('powerupTake', { id: p.id, kind: k, team: p.team });
    this.banner(P.name + '!', { color: '#ffe08a' });
  },
  /* ---- hazards ---- */
  hazardStep(dt, live) {
    for (const h of this.hazards) h.t += dt;
    const k = this.hazardKind, every = TUNE.v.hazardEvery;
    if (live && k && k !== 'mud' && every > 0) {
      this.hazT -= dt * every;
      if (this.hazT <= 0) { this.startHazard(k); this.hazT = k === 'chicken' ? 50 + this.rng() * 20 : k === 'flames' ? 14 + this.rng() * 10 : 20 + this.rng() * 10; }
    }
    for (const h of this.hazards) {
      if (h.kind === 'chicken') this.chickenStep(h, dt);
      else if (h.kind === 'flame') this.flameStep(h, dt);
      else if (h.kind === 'bolt') this.boltStep(h, dt);
    }
    this.hazards = this.hazards.filter(h => !h.done);
    if (this.hazardKind === 'mud' && live && this.ball.holder >= 0 && this.ball.st === 'held') { const c = this.players[this.ball.holder]; if (c && this.inMud(c) && !c.mudSaid) { c.mudSaid = true; this.emit('mud', { id: c.id }); } }
  },
  startHazard(kind, o = {}) {
    const b = this.ball;
    if (kind === 'chicken') {
      const top = this.rng() < .5, x = clamp(b.x + (this.rng() - .5) * 160, G.X0 + 40, G.X1 - 40);
      const h = { kind: 'chicken', x, y: top ? G.Y0 - 30 : G.Y1 + 30, tx: x + (this.rng() - .5) * 200, ty: top ? G.Y1 + 40 : G.Y0 - 40, t: 0, warn: 1, life: 7, hit: {} };
      h.sp = dist2(h.x, h.y, h.tx, h.ty) / 6;
      this.hazards.push(h); this.emit('hazardWarn', { kind: 'chicken' });
    } else if (kind === 'flames') {
      const near = GRATES.slice().sort((a, q) => dist2(a.x, a.y, b.x, b.y) - dist2(q.x, q.y, b.x, b.y));
      const pick = near.slice(0, 6).filter(() => this.rng() < .75).slice(0, 4);
      if (!pick.length) pick.push(near[0]);
      pick.forEach((g, i) => this.hazards.push({ kind: 'flame', x: g.x, y: g.y, t: -i * .35, warn: 1.0, burn: 1.2, hit: {} }));
      this.emit('hazardWarn', { kind: 'flames' });
    } else if (kind === 'lightning') {
      const a = this.rng() * TAU, r = o.near ? 10 : 60 + this.rng() * 140;
      this.hazards.push({ kind: 'bolt', x: clamp(b.x + Math.cos(a) * r, G.X0 + 20, G.X1 - 20), y: clamp(b.y + Math.sin(a) * r, G.Y0 + 20, G.Y1 - 20), t: 0, warn: 1.4, hit: false });
      this.emit('hazardWarn', { kind: 'lightning' });
    } else if (kind === 'mud') {
      const c = this.carrier(); if (c) { c.mud = .6; this.emit('mud', { id: c.id }); }
    }
  },
  chickenStep(h, dt) {
    if (h.t < h.warn) return;
    const a = Math.atan2(h.ty - h.y, h.tx - h.x); h.f = a;
    h.x += Math.cos(a) * h.sp * dt; h.y += Math.sin(a) * h.sp * dt;
    if (!h.on) { h.on = true; this.emit('hazard', { kind: 'chicken' }); }
    for (const p of this.players) if (this.standing(p) && !h.hit[p.id] && dist(p, h) < 14 && p.st !== 'set' && p.st !== 'ruck') { h.hit[p.id] = 1; this.knockDown(p, 1.1, a + (this.rng() - .5)); this.emit('chickenHit', { id: p.id }); }
    if (!this.ref.down && dist(this.ref, h) < 14) this.refDown();
    if (dist2(h.x, h.y, h.tx, h.ty) < 8 || h.t > h.warn + h.life) h.done = true;
  },
  flameStep(h, dt) {
    if (h.t < h.warn || h.t > h.warn + h.burn) { if (h.t > h.warn + h.burn + .3) h.done = true; return; }
    if (!h.lit) { h.lit = true; this.emit('hazard', { kind: 'flames', x: h.x, y: h.y }); }
    for (const p of this.players) if (this.standing(p) && !h.hit[p.id] && dist(p, h) < 12) {
      h.hit[p.id] = 1; this.setSt(p, 'stun', 1.2); p.a.act = 'toasted'; p.toast = 2.5; p.charge = -1;
      if (this.ball.holder === p.id && this.ball.st === 'held') this.spillFrom(p, false);
      this.emit('toasted', { id: p.id });
    }
  },
  boltStep(h) {
    if (h.t < h.warn || h.hit) { if (h.hit && h.t > h.warn + .8) h.done = true; return; }
    h.hit = true;
    this.emit('hazard', { kind: 'lightning', x: h.x, y: h.y });
    for (const p of this.players) if (this.onPitch(p) && p.st !== 'launch' && dist(p, h) < 36) {
      this.setSt(p, 'stun', 1.5); p.a.act = 'zapped'; p.zap = .25; p.charge = -1;
      if (this.ball.holder === p.id && this.ball.st === 'held') this.spillFrom(p, false);
      this.emit('zapped', { id: p.id });
    }
    if (!this.ref.down && dist(this.ref, h) < 36) this.refDown();
  },
  refDown() {
    if (this.o.session && false) return;
    this.ref.down = 8; this.ref.vx = this.ref.vy = 0;
    this.emit('refDown', {});
    this.banner('REF DOWN!', { color: '#ff6a3a', sub: 'ANYTHING GOES!' });
  },
  /* ---- force(name): every dev-panel EVENT (and the attract director's showcase, and the tests) ---- */
  force(name, o = {}) {
    const team = o.team !== undefined ? o.team : (this.seats[0] ? this.seats[0].team : 0);
    const me = () => { const s = this.seats[0]; return s && s.pid >= 0 ? this.players[s.pid] : this.players.find(p => p.team === team && this.standing(p)); };
    const playable = () => { if (this.phase !== 'play') { for (const p of this.players) if (p.st === 'set' || p.st === 'ruck' || p.st === 'cele') this.setSt(p, 'free'); this.setp = null; this.pending = null; this.goPhase('play'); } };
    const giveTo = p => { playable(); for (const q of this.players) if (q.pin) { q.pin = false; } if (!this.standing(p)) this.setSt(p, 'free'); this.give(p, 'force'); return p; };
    switch (name) {
      case 'tryHome': case 'tryAway': { const t = name === 'tryHome' ? 0 : 1, p = this.players.find(q => q.team === t && this.standing(q)) || this.players[t * 7]; giveTo(p); p.x = this.oppLine(t) + this.dir[t] * 20; p.y = G.CY + (o.wide ? 200 : 40); return this.tryScored(p, p.x, p.y, 'force'); }
      case 'give': return giveTo(o.id !== undefined ? this.players[o.id] : me());
      case 'ball5m': { const p = giveTo(me()); p.x = this.oppLine(p.team) - this.dir[p.team] * (G.L5 + 4); p.y = G.CY + 60; return p; }
      case 'knockOn': { const p = giveTo(this.players.find(q => q.team === team && this.standing(q))); return this.knockOn(p); }
      case 'touch': { playable(); return this.touch(o.team !== undefined ? o.team : team, clamp(this.ball.x, G.X0 + 80, G.X1 - 80), o.far ? G.Y0 : G.Y1, false); }
      case 'penalty': { playable(); return this.penaltyAward(team, clamp(this.ball.x, G.X0 + 100, G.X1 - 100), this.ball.y, 'force'); }
      case 'freeKick': { playable(); return this.penaltyAward(team, this.ball.x, this.ball.y, 'force', true); }
      case 'scrum': { playable(); return this.scrumSetup(team, clamp(this.ball.x, G.X0 + 80, G.X1 - 80), this.ball.y); }
      case 'yellow': { const p = this.players.find(q => q.team === (o.team !== undefined ? o.team : 1 - team) && this.onPitch(q) && q.ctl < 0 && q.slot > 0); return this.giveCard(p, 'yellow'); }
      case 'kickoff': { this.setp = null; this.pending = null; this.kickoffTeam = team; for (const p of this.players) if (p.st === 'set' || p.st === 'ruck' || p.st === 'cele') this.setSt(p, 'free'); return this.goPhase('kickoff'); }
      case 'dropout': { this.setp = null; this.pending = null; return this.dropoutSetup(o.team !== undefined ? o.team : team); }
      case 'ruck': { const c = this.carrier() || giveTo(me()); this.setSt(c, 'down', 9); c.pin = true; return this.startRuck(c); }
      case 'monster': { let c = this.carrier(); if (!c) c = giveTo(this.players.find(q => q.team === 1 - team && this.standing(q))); const h = this.players.filter(q => q.team !== c.team && this.standing(q)).sort((a, b) => dist(a, c) - dist(b, c))[0]; if (!h) return; h.x = c.x + Math.cos(c.f) * 12; h.y = c.y + Math.sin(c.f) * 12; h.f = angTo(h, c); return this.tackled(h, c, 'monster'); }
      case 'powerup': return this.throwPowerup(o.kind, o.at);
      case 'hazard': { const k = o.kind || this.hazardKind || 'lightning'; if (k === 'mud') return this.startHazard('mud'); return this.startHazard(k, o); }
      case 'fire': { const p = o.id !== undefined ? this.players[o.id] : me(); p.fire = 90; return this.emit('onFire', { id: p.id }); }
      case 'thunder': { const p = this.carrier() && this.carrier().team === team ? this.carrier() : giveTo(me()); this.hype[p.team] = 100; return this.doSuper(p); }
      case 'hurricane': { let c = this.carrier(); if (!c || c.team === team) { if (!c) c = giveTo(this.players.find(q => q.team === 1 - team && this.standing(q))); } const p = me(); if (p.team === c.team) return; this.hype[p.team] = 100; return this.doSuper(p); }
      case 'hooter': this.clock = this.halfLen; return;
      case 'halftime': if (this.half === 1) { this.clock = this.halfLen; this.hooter = true; this.setp = null; this.pending = null; return this.endHalf(); } return;
      case 'fulltime': { this.half = 2; this.clock = this.halfLen; this.setp = null; this.pending = null; this.hooter = true; return this.endHalf(); }
      case 'sudden': { this.score[1] = this.score[0]; this.half = 2; this.setp = null; this.pending = null; return this.suddenDeath(); }
      case 'score': this.score[o.team || 0] = Math.max(0, this.score[o.team || 0] + (o.n || 5)); return;
      case 'clock': this.clock = clamp(this.clock + (o.n || -30), 0, this.halfLen); if (this.clock < this.halfLen) this.hooter = false; return;
      case 'refDown': return this.refDown();
      case 'dropGoal': { const p = giveTo(this.players.find(q => q.team === team && q.slot === 4 && this.standing(q)) || me()); p.x = this.oppLine(p.team) - this.dir[p.team] * 140; p.y = G.CY + 20; p.f = this.dir[p.team] > 0 ? 0 : PI; return this.doKick(p, 'drop', this.oppLine(p.team), G.CY, .95); }
      case 'cheap': { const p = this.players.find(q => q.team === team && this.standing(q) && this.ball.holder !== q.id && q.ctl < 0); const v = this.players.find(q => q.team !== team && this.standing(q) && this.ball.holder !== q.id); if (!p || !v) return; playable(); p.x = v.x - 10; p.y = v.y; p.f = 0; p.cool = 0; this.setSt(p, 'free'); return this.cheapShot(p, v); }
    }
  }
});


/* ==== 20-stadium.js ==== */
/* ---- THE STADIUM: the pitch (a TileMap whose floor is painted with the markings, the venue's grass and the home crest
 * in each in-goal), the stands and their crowd, the sponsor boards, the posts, flags, the sin bin (an actual bin), the
 * dugouts, floodlight towers and the skyline beyond the far stand ---- */
const CREST_ART = {
  bird: ['.....##.....', '....####....', '...##o###...', '..########..', '.###########', '##########..', '.########...', '..######....', '...#..#.....', '...#..#.....'],
  badger: ['..##....##..', '.####..####.', '.##########.', '##w##ww##w##', '##w##ww##w##', '#w#w####w#w#', '.##########.', '..########..', '...######...', '....####....'],
  gull: ['............', '##........##', '.###....###.', '..###..###..', '...######...', '....####....', '....#oo#....', '.....##.....', '....####....', '...#....#...'],
  anvil: ['...#..#.#...', '..#.##.#....', '############', '.##########.', '...######...', '....####....', '....####....', '..########..', '.##########.', '............'],
  m: ['#..........#', '##........##', '###......###', '####....####', '##.##..##.##', '##..####..##', '##...##...##', '##........##', '##........##', '##........##']
};
TT.crestArt = CREST_ART;
const Stadium = TT.Stadium = {
  cache: {},
  /** the stadium for a venue with a home side (its crest is painted in the in-goals) */
  get(venueId, homeId) {
    const k = venueId + ':' + homeId;
    return this.cache[k] || (this.cache[k] = this.build(TT.VENUES[venueId], TT.TEAMS[homeId]));
  },
  build(V, home) {
    const COLS = G.COLS, ROWS = G.ROWS, rows = [];
    for (let r = 0; r < ROWS; r++) {
      let s = '';
      for (let c = 0; c < COLS; c++) {
        const y = r * T + 8, x = c * T + 8;
        if (r <= 2) s += c < 2 || c > COLS - 3 ? '5' : String(5 - r);     // the far stand's three tiers
        else if (r === 3) s += c < 2 || c > COLS - 3 ? '5' : 'b';            // the boards along the far touchline
        else if (r >= ROWS - 3) s += r === ROWS - 3 ? (c >= 41 && c <= 44 ? 't' : (c < 2 || c > COLS - 3 ? 't' : 'k')) : 't';   // the near barrier (a gap at the tunnel), the track
        else if (c < 2 || c > COLS - 3) s += c === 0 || c === COLS - 1 ? '7' : '6';   // the end stands
        else if (y < G.Y0 || y > G.Y1 || x < G.DX0 || x > G.DX1) s += 'a';
        else if (x < G.X0 || x > G.X1) s += 'g';
        else s += '.';
      }
      rows.push(s);
    }
    const st = V.stand, tone = c => E.tones(c);
    const floorTex = this.floorTex(V, home);
    const map = new E.TileMap({
      rows, floorTex, outside: '#141418', ao: 4,
      legend: { '.': { floor: 'grass' }, g: { floor: 'ingoal' }, a: { floor: 'apron' }, t: { floor: 'track' }, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, b: 8, k: 9 },
      types: {
        3: { h: 30, face: st.face, side: st.tiers[2], top: tone(st.tiers[2]).lt },
        4: { h: 42, face: st.face, side: st.tiers[1], top: tone(st.tiers[1]).lt },
        5: { h: 54, face: st.face, side: st.tiers[0], top: tone(st.tiers[0]).lt },
        6: { h: 30, face: st.face, side: st.tiers[2], top: tone(st.tiers[2]).lt },
        7: { h: 44, face: st.face, side: st.tiers[0], top: tone(st.tiers[0]).lt },
        8: { h: 12, face: 'none', side: '#1a1a22', top: '#2a2a34' },
        9: { h: 6, cut: true, cutH: 3, face: 'none', side: '#3a3a44', top: '#6a6a74' }
      }
    });
    // the crowd: two on each stand tile, in the two teams' colours (home 70%), each with its own bob
    const crowd = [];
    const R = TT.makeRng(V.id.length * 131 + 7);
    for (let r = 0; r < 3; r++) for (let c = 2; c < COLS - 2; c++) for (const dx of [4, 12]) if (R() < .25 + .75 * V.crowd) crowd.push({ x: c * T + dx, y: r * T + 10, z: [54, 42, 30][r], row: r, ph: R() * 9, home: R() < .7, shade: R(), skin: ['#f2cfb0', '#e0b090', '#a87050', '#6a4028'][Math.floor(R() * 4)], hat: R() < .2, flag: R() < .05 });
    for (const c of [0, 1, COLS - 2, COLS - 1]) for (let r = 4; r < ROWS - 4; r++) for (const dy of [4, 12]) if (R() < .2 + .6 * V.crowd) crowd.push({ x: c * T + 8 + (R() - .5) * 6, y: r * T + dy, z: c === 0 || c === COLS - 1 ? 44 : 30, row: 3 + (c === 0 || c === COLS - 1 ? 0 : 1), ph: R() * 9, home: R() < .7, shade: R(), skin: ['#f2cfb0', '#e0b090', '#a87050', '#6a4028'][Math.floor(R() * 4)], end: c < 3 ? -1 : 1 });
    return { map, crowd, V, home };
  },
  /** the painted pitch: mown stripes, worn white lines (dashed where the laws dash them), the in-goals' crest, mud */
  floorTex(V, home) {
    const [gr, gg, gb] = V.grass, [ir, ig, ib] = V.ingoal, [ar, ag, ab] = V.apron;
    const crest = CREST_ART[home.crest.art], cb = E.hex(home.crest.bg), cf = E.hex(home.crest.fg);
    const mud = TT.mudBlobsFor(V.id);
    const dash = (v, on = 8) => Math.floor(v / on) % 2 === 0;
    const line = (x, y) => {
      const inField = x >= G.DX0 - 1 && x <= G.DX1 + 1 && y >= G.Y0 - 1 && y <= G.Y1 + 1;
      if (!inField) return false;
      if (Math.abs(y - G.Y0) < 1.1 || Math.abs(y - G.Y1) < 1.1) return true;                       // touchlines (and touch-in-goal)
      if (Math.abs(x - G.X0) < 1.1 || Math.abs(x - G.X1) < 1.1) return true;                       // try lines
      if (Math.abs(x - G.DX0) < 1.1 || Math.abs(x - G.DX1) < 1.1) return true;                     // dead-ball lines
      if (x < G.X0 || x > G.X1) return false;
      if (Math.abs(x - G.CX) < 1.1) return true;                                                     // halfway
      if (Math.abs(x - (G.X0 + G.L22)) < 1.1 || Math.abs(x - (G.X1 - G.L22)) < 1.1) return true;    // the 22s
      if ((Math.abs(x - (G.CX - G.L10)) < 1 || Math.abs(x - (G.CX + G.L10)) < 1) && dash(y, 10)) return true;   // the 10s, dashed
      if ((Math.abs(x - (G.X0 + G.L5)) < 1 || Math.abs(x - (G.X1 - G.L5)) < 1) && dash(y, 10)) return true;     // the 5 m lines, dashed
      for (const ly of [G.Y0 + G.L5, G.Y0 + G.L15, G.Y1 - G.L15, G.Y1 - G.L5]) if (Math.abs(y - ly) < 1 && (Math.abs(x - G.CX) % 102 < 12 || x - G.X0 < 70 || G.X1 - x < 70) && dash(x, 6)) return true;
      if (Math.abs(y - G.CY) < 1 && Math.abs(x - G.CX) < 6) return true;                            // the centre mark
      return false;
    };
    return (x, y, tag) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
      if (tag === 'track') { const v = 52 + n * 16 + m * 10; return [v, v - 2, v + 4]; }
      if (tag === 'apron') return [ar + n * 14 + m * 12, ag + n * 18 + m * 16, ab + n * 12];
      let [r, g, b] = tag === 'ingoal' ? [ir, ig, ib] : [gr, gg, gb];
      const stripe = Math.floor((x - G.X0) / 32) % 2 === 0 ? 1.1 : .92;
      r = r * stripe + n * 18 + m * 16; g = g * stripe + n * 26 + m * 22; b = b * stripe + n * 14 + m * 10;
      if (tag === 'ingoal') {
        // the home crest, 96 x 80, painted at 60%
        const cx = x < G.CX ? (G.DX0 + G.X0) / 2 : (G.DX1 + G.X1) / 2, u = Math.floor((x - cx + 48) / 8), v = Math.floor((y - G.CY + 40) / 8);
        if (u >= 0 && u < 12 && v >= 0 && v < 10) { const ch = crest[v][u]; if (ch !== '.') { const c = ch === '#' ? cf : ch === 'w' || ch === 'o' ? [240, 240, 240] : cb; r = lerp(r, c[0], .55); g = lerp(g, c[1], .55); b = lerp(b, c[2], .55); } }
        else if (u >= -1 && u <= 12 && v >= -1 && v <= 10) { r = lerp(r, cb[0], .3); g = lerp(g, cb[1], .3); b = lerp(b, cb[2], .3); }
      }
      if (mud) for (const bl of mud) {
        const q = (x - bl.x) ** 2 / (bl.rx * bl.rx) + (y - bl.y) ** 2 / (bl.ry * bl.ry);
        if (q < 1.25) { const k = q < 1 ? 1 : (1.25 - q) * 4; const pud = q < .25 && E.hash2(Math.floor(x / 3), Math.floor(y / 3)) > .6; r = lerp(r, pud ? 120 : 92 + n * 20, k * .9); g = lerp(g, pud ? 112 : 62 + n * 14, k * .9); b = lerp(b, pud ? 120 : 34 + n * 10, k * .9); }
      }
      if (line(x, y)) { const w = 222 + n * 26 + m * 10; return [w, w + 4, w - 6]; }
      return [r, g, b];
    };
  }
};
/** the mud patches at a venue (the same ones the simulation slows players in) */
TT.mudBlobsFor = id => {
  if (id !== 'muddington') return null;
  const R = TT.makeRng(77), out = [], n = 5 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) out.push({ x: G.X0 + 120 + R() * (G.W - 240), y: G.Y0 + 70 + R() * (G.H - 140), rx: 40 + R() * 40, ry: 26 + R() * 24 });
  return out;
};


/* ==== 30-render.js ==== */
/* ---- PRESENTATION: reads a view state V (the live match, an instant-replay frame or an online client's mirror, all with
 * the same fields) and draws it: rigs posed from each player's state, the ball, the stadium, hazards, lights, camera ---- */
const V3l = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** the rugby move set as attack specs (the engine's E.MOVES format), timed by the presentation */
const SPECS = TT.SPECS = {
  pass: { rel: true, hand: 'both', a0: 1.3, a1: -1.0, z0: -5, z1: -3, reach: 6.5, wind: .06, active: .08, recover: .16, lean: .15, twist: 1.2, blade: 0 },
  passL: { rel: true, hand: 'both', a0: 1.8, a1: -1.3, z0: -5, z1: -2, reach: 7, wind: .09, active: .09, recover: .2, lean: .2, twist: 1.8, lunge: 1, blade: 0 },
  dummy: { rel: true, hand: 'both', a0: 1.4, a1: .9, z0: -5, z1: -4, reach: 6, wind: .1, active: .04, recover: .16, lean: .15, twist: 1, blade: 0 },
  offload: { rel: true, hand: 'L', a0: .6, a1: -.5, z0: -4, z1: -2, reach: 6, wind: .04, active: .06, recover: .14, blade: 0 },
  fend: { rel: true, hand: 'L', a0: .1, a1: 0, z0: 0, z1: .5, r0: 3, r1: 9.5, wind: .05, active: .08, recover: .34, lean: .3, blade: 0, hold: .6 },
  tackle: { rel: true, hand: 'both', a0: .5, a1: 0, z0: -9, z1: -11, r0: 4, r1: 8, wind: .05, active: .1, recover: .24, lunge: 4, crouch: .7, lean: .7, blade: 0 },
  dive: { rel: true, hand: 'both', a0: .3, a1: 0, z0: -2, z1: -2, r0: 6, r1: 9, wind: .04, active: .25, recover: .2, blade: 0 },
  hit: { rel: true, hand: 'L', a0: .35, a1: 0, z0: -3, z1: -3, r0: 2, r1: 5, wind: .06, active: .08, recover: .34, lunge: 5, crouch: .3, lean: .65, twist: 1.4, blade: 0, hold: .5 },
  shoulder: { rel: true, hand: 'L', a0: .5, a1: .1, z0: -3, z1: -3, r0: 2, r1: 4, wind: .05, active: .07, recover: .24, lunge: 3, lean: .5, twist: 1.2, blade: 0 },
  lunge: { rel: true, hand: 'both', a0: .4, a1: 0, z0: -8, z1: -9, r0: 4, r1: 7, wind: .05, active: .1, recover: .2, lunge: 3, crouch: .6, lean: .6, blade: 0 },
  kick: Object.assign({}, E.MOVES.kick, { reach: 7, recover: .26 }),
  drop: Object.assign({}, E.MOVES.kick, { z0: .3, z1: 1.1, reach: 7, wind: .1, recover: .3, lean: -.15 }),
  placeKick: Object.assign({}, E.MOVES.kick, { z0: .3, z1: 1.25, reach: 7.5, wind: .16, active: .1, recover: .5, lean: -.3, hold: .8 }),
  throwIn: { rel: true, hand: 'both', plane: 'side', a0: 2.6, a1: .3, reach: 7, wind: .22, active: .08, recover: .22, lean: .2, blade: 0 },
  spin: { rel: true, hand: 'both', a0: .4, a1: .4, spin: true, z0: -6, z1: -6, reach: 5, wind: .04, active: .32, recover: .1, blade: 0 },
  jackal: { rel: true, hand: 'both', plane: 'side', a0: -1.2, a1: -1.3, reach: 7, wind: .06, active: .4, recover: .2, crouch: .8, lean: .8, blade: 0 },
  highCatch: { rel: true, hand: 'both', plane: 'side', a0: 1.4, a1: 1.2, reach: 7.5, wind: .02, active: .25, recover: .25, hop: 3, blade: 0 }
};
for (const k in SPECS) SPECS[k].name = k;
const mirrorSpec = (s, side) => side >= 0 ? s : (s._m || (s._m = Object.assign({}, s, { a0: -s.a0, a1: -s.a1, _m: null, name: s.name + 'M' })));
const specState = (spec, e) => {
  const tot = spec.wind + spec.active + spec.recover;
  if (e < 0 || e > tot) return null;
  if (e < spec.wind) return { spec, phase: 'wind', u: e / spec.wind };
  if (e < spec.wind + spec.active) return { spec, phase: 'active', u: (e - spec.wind) / spec.active };
  return { spec, phase: 'recover', u: Math.min(1, (e - spec.wind - spec.active) / spec.recover) };
};
const BALL_SIDE = E.sprite(['..hhhhh..', '.hbbwbbh.', 'hbbwwwbbh', 'dbbbwbbbd', '.dbbbbbd.', '..ddddd..'], { h: '#c08a5a', b: '#8a5a32', w: '#f4f0e0', d: '#5a3a1e' });
const BALL_END = E.sprite(['.hhh.', 'hbwbh', 'hbbbd', 'dbbbd', '.ddd.'], { h: '#c08a5a', b: '#8a5a32', w: '#f4f0e0', d: '#5a3a1e' });
const STARS = [E.sprite(['..y..', '.yYy.', '..y..'], { y: '#f0d040', Y: '#ffffff' }), E.sprite(['y...y', '..Y..', 'y...y'], { y: '#f0d040', Y: '#ffffff' })];
TT.BALL_SPR = BALL_SIDE;
/** dress a rig from a roster entry and a kit */
TT.makeRig = (d, kit, o = {}) => {
  const rig = new E.Humanoid(Object.assign({
    size: d.size || 1.1, build: d.build || 'heroic', weapon: null, outfit: d.outfit || 'shirt', sleeves: 'short', hair: d.hair || 'short', hat: d.hat || null, hunch: d.hunch || 0,
    colors: Object.assign({ skin: d.skin || '#e0b090', hair: d.hairC || '#3a2a1a', cloth: kit.cloth, coat: kit.coat || kit.cloth, trim: kit.trim, pants: kit.pants, boot: kit.boot || '#1a1410', belt: kit.trim, glove: d.skin || '#e0b090' }, d.colors || {})
  }, o));
  rig._base = Object.assign({}, rig.C);
  const base = rig.solvePose;
  rig.solvePose = function () { base.call(this); if (this._tt) TT.poseFix(this, this._tt); };
  return rig;
};
/** the poses the engine has no word for: the ball carried in the crook of the arm, two hands ready, arms up (the lineout),
 *  aeroplane arms (a try), the referee's arm signals */
TT.poseFix = (rig, P) => {
  const J = rig.J, o = rig.o, L = o.armUpper + o.armLower;
  if (!J.shL || !J.hipC) return;
  if (P.carry > 0) {
    const w = P.carry, hip = J.hipC, sh = J.shL;
    J.handL = V3l(J.handL, [hip[0] + 2.6, -.9, hip[2] + o.torso * .42], w);
    J.elbowL = V3l(J.elbowL, [sh[0] - .4, sh[1] - .7, sh[2] - o.armUpper * .9], w);
  }
  if (P.two > 0) {
    const w = P.two, c = J.shC;
    J.handL = V3l(J.handL, [c[0] + 4.2, -1.3, c[2] - 3.5], w); J.handR = V3l(J.handR, [c[0] + 4.2, 1.3, c[2] - 3.5], w);
    J.elbowL = V3l(J.elbowL, [c[0] + 1.8, -2.6, c[2] - 4.5], w); J.elbowR = V3l(J.elbowR, [c[0] + 1.8, 2.6, c[2] - 4.5], w);
  }
  if (P.up > 0) {
    const w = P.up;
    J.handL = V3l(J.handL, [J.shL[0] + .8, J.shL[1] - .6, J.shL[2] + L * .95], w); J.handR = V3l(J.handR, [J.shR[0] + .8, J.shR[1] + .6, J.shR[2] + L * .95], w);
    J.elbowL = V3l(J.elbowL, [J.shL[0] + .5, J.shL[1] - 1, J.shL[2] + L * .45], w); J.elbowR = V3l(J.elbowR, [J.shR[0] + .5, J.shR[1] + 1, J.shR[2] + L * .45], w);
  }
  if (P.aero > 0) {
    const w = P.aero;
    J.handL = V3l(J.handL, [J.shL[0], J.shL[1] - L * .95, J.shL[2] + 1], w); J.handR = V3l(J.handR, [J.shR[0], J.shR[1] + L * .95, J.shR[2] - 1], w);
    J.elbowL = V3l(J.elbowL, [J.shL[0], J.shL[1] - L * .48, J.shL[2] + .6], w); J.elbowR = V3l(J.elbowR, [J.shR[0], J.shR[1] + L * .48, J.shR[2]], w);
  }
  if (P.armR) {   // the referee: 'up' (a try, a card held high), 'out' (advantage), 'pen' (out and up)
    const a = P.armR, e = a === 'up' ? [.6, .4, L * .98] : a === 'out' ? [L * .55, L * .7, 0] : [L * .5, L * .55, L * .55];
    J.handR = [J.shR[0] + e[0], J.shR[1] + e[1], J.shR[2] + e[2]];
    J.elbowR = [J.shR[0] + e[0] * .5, J.shR[1] + e[1] * .5 + .4, J.shR[2] + e[2] * .5];
  }
};
const CELES = ['cheer', 'aero', 'guard', 'hips', 'bow', 'slide'];
class Pres {
  /** the presentation of one match: its rigs and their animation clocks, the camera, the crowd's mood */
  constructor(m) {
    this.m = m; this.t = 0; this.excite = 0; this.cheer = 0; this.boo = 0; this.cheerTeam = 0; this.wave = 0;
    this.stadium = Stadium.get(m.venue.id, m.teamIds[0]);
    this.rigs = m.players.map(p => TT.makeRig(p.d, m.kits[p.team]));
    this.A = m.players.map(() => ({ act: '', t: 9, lastSt: '', lastStT: 0, carry: 0, two: 0, up: 0, aero: 0, sq: 0, seen: 0 }));
    this.refRig = TT.makeRig(TT.CAST.nigel, { cloth: '#1a1a1e', trim: '#3ac850', pants: '#1a1a1e', boot: '#0e0e10' }, { hair: 'short' });
    this.refA = { armR: null };
    this.fxT = 0; this.punch = 0; this.letter = 0; this.flashT = 0;
    this.camZoom = 1; this.kickFrame = false;
    if (TT.cheats.bigHeads || (TT.game && TT.game.settings && TT.game.settings.bigHeads)) this.bigHeads(true);
  }
  bigHeads(on) { for (const r of this.rigs.concat(this.refRig)) { if (r._headR === undefined) r._headR = r.o.headR; r.o.headR = on ? r._headR * 1.8 : r._headR; } }
  /** pose every rig from its player's state (V: the view state) */
  update(dt, V) {
    this.t += dt;
    const ball = V.ball;
    V.players.forEach((p, i) => {
      const rig = this.rigs[i], A = this.A[i];
      if (p.st === 'off') return;
      // an action (re)started: its clock back to zero
      const act = p.a.act || '';
      if (act !== A.act || (p.stT < A.lastStT - .01) || p.st !== A.lastSt) { if (act !== A.act || p.st !== A.lastSt) A.t = 0; }
      A.act = act; A.lastSt = p.st; A.lastStT = p.stT; A.t += dt;
      const has = ball.st === 'held' && ball.holder === p.id;
      A.carry = approach(A.carry, has && p.st !== 'pass' && p.st !== 'kick' ? 1 : 0, dt * 8);
      A.two = approach(A.two, has && p.st === 'free' && p.ctl >= 0 && (p.I && (p.I.hd.l1 || p.I.hd.r1)) ? 1 : 0, dt * 10);
      const s = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.f };
      let up = 0, aero = 0;
      const spec = (name, side = 1) => specState(mirrorSpec(SPECS[name], side), A.t);
      switch (p.st) {
        case 'free': case 'pass': case 'kick': case 'step': case 'spin': case 'stumble': case 'lunge':
          if (p.st === 'pass') s.attack = spec(act === 'passL' ? 'passL' : act === 'dummy' ? 'dummy' : act === 'offload' ? 'offload' : 'pass', this.passSide(p, V));
          else if (p.st === 'kick') s.attack = spec(act === 'placeKick' ? 'placeKick' : act === 'drop' ? 'drop' : 'kick');
          else if (p.st === 'spin') s.attack = spec('spin');
          else if (p.st === 'lunge') s.attack = spec(act === 'hit' ? 'hit' : act === 'shoulder' ? 'shoulder' : act === 'whiff' || act === 'lunge' ? 'lunge' : 'tackle');
          else if (p.st === 'step') { s.dash = true; s.vx = p.vx; s.vy = p.vy; }
          else if (p.st === 'stumble') s.hurt = true;
          if (!s.attack && p.fendT > 0) s.attack = specState(SPECS.fend, Math.min(.2, SPECS.fend.wind + SPECS.fend.active * .99));
          if (!s.attack && act === 'fend' && A.t < .45) s.attack = spec('fend');
          if (!s.attack && act === 'highCatch' && A.t < .5) s.attack = spec('highCatch');
          if (!s.attack && act === 'throwIn' && A.t < .5) s.attack = spec('throwIn');
          if (p.charge >= 0) { s.stance = 'guard'; s.sprint = true; }
          if (p.turboOn && Math.hypot(p.vx, p.vy) > 60) s.sprint = true;
          if (p.a.sad) s.expr = 'wince';
          break;
        case 'dive': s.down = .9; s.attack = spec('dive'); break;
        case 'tdive': s.down = 1; s.expr = 'shout'; break;
        case 'down': s.down = 1; s.expr = act === 'launch' || act === 'landed' || act === 'flat' ? 'wince' : null; break;
        case 'up': s.down = 0; break;
        case 'launch': s.air = true; s.flip = clamp(p.a.flip, 0, .999); s.expr = 'shout'; break;
        case 'stun': s.hurt = true; s.expr = 'wince'; break;
        case 'cele': {
          const k = CELES[(p.a.cele || 0) % CELES.length];
          s.expr = 'shout';
          if (k === 'aero') { aero = 1; s.vx = Math.cos(this.t * 2 + i) * 30; s.vy = Math.sin(this.t * 2 + i) * 30; s.facing = Math.atan2(s.vy, s.vx); }
          else if (k === 'slide') s.down = A.t < 1.2 ? .4 : 0;
          else if (k === 'bow') s.pose = A.t % 2 < 1 ? 'kneel' : 'hips';
          else s.pose = k;
          break;
        }
        case 'ruck': s.pose = 'crouch'; s.run = .55; s.lean = .4; if (act === 'jackal') s.attack = spec('jackal'); break;
        case 'set':
          if (act === 'lift') { up = 1; s.air = p.z > 6; }
          else if (act === 'hang') { s.pose = 'crouch'; s.run = .8; }
          else { s.pose = 'crouch'; s.run = V.setp && V.setp.sub === 'push' ? .7 : 0; }
          break;
        case 'bin': s.pose = 'kneel'; s.expr = 'angry'; break;
      }
      if (V.phase === 'scrum' && p.slot === 1 && p.st === 'set') { s.pose = 'crouch'; }
      A.up = approach(A.up, up, dt * 8); A.aero = approach(A.aero, aero, dt * 6);
      rig._tt = { carry: A.carry, two: A.two, up: A.up, aero: A.aero };
      // mud builds up on the kits at Muddington; the flame-grilled are briefly blackened
      if (p.mud > 0 || p.toast > 0) { const b = rig._base, k = Math.min(.6, p.mud || 0); rig.C.cloth = E.mix ? E.mix(b.cloth, '#5a3a1e', k) : b.cloth; rig.C.pants = E.mix ? E.mix(b.pants, '#4a2e18', k) : b.pants; if (p.toast > 0) { p.toast -= dt; rig.C.skin = '#3a3030'; rig.C.cloth = '#2a2a2a'; } else rig.C.skin = b.skin; rig.C.clothDk = E.shade(rig.C.cloth, -.3); rig.C.clothLt = E.shade(rig.C.cloth, .25); }
      if (TT.cfg.present) rig.update(dt, s);
    });
    // the referee: runs, faces the ball, signals
    const R = V.ref, ra = R.sigT > 0 || R.signal ? (R.signal === 'try' || R.signal === 'card' ? 'up' : R.signal === 'advantage' ? 'out' : R.signal === 'penalty' ? 'pen' : null) : null;
    this.refRig._tt = { armR: ra };
    if (TT.cfg.present) this.refRig.update(dt, { x: R.x, y: R.y, z: 0, vx: R.vx, vy: R.vy, facing: R.f, down: R.down > 0 ? 1 : 0, expr: R.callT > 0 ? 'shout' : null });
    this.excite = approach(this.excite, this.targetExcite(V), dt * .8);
    this.cheer = Math.max(0, this.cheer - dt); this.boo = Math.max(0, this.boo - dt); this.punch = Math.max(0, this.punch - dt * 4);
    if (V.phase !== 'play' && V.phase !== 'ruck' && V.phaseT > 8) this.wave += dt * 160; else this.wave = -999;
  }
  passSide(p, V) { const b = V.ball; if (b.st !== 'air') return p.a.side || 1; const a = Math.atan2(b.vy, b.vx); return angDiff(p.f, a) > 0 ? -1 : 1; }
  targetExcite(V) {
    const b = V.ball, c = b.st === 'held' ? V.players[b.holder] : null;
    if (!c) return .25;
    const toLine = Math.abs((V.dir[c.team] > 0 ? G.X1 : G.X0) - c.x);
    return clamp(.3 + (toLine < 250 ? (250 - toLine) / 250 * .6 : 0) + (c.turboOn ? .1 : 0), 0, 1);
  }
  /* ---------------------------------------------------------------- the camera */
  camera(dt, V, game, o = {}) {
    const b = V.ball, c = b.st === 'held' ? V.players[b.holder] : null;
    let fx = c ? c.x : b.x, fy = c ? c.y : b.y, fz = 10;
    const att = c ? c.team : (V.poss || 0);
    if (V.phase === 'scrum' || V.phase === 'lineout' || V.phase === 'ruck' || V.phase === 'penalty') { const S = V.setp; if (S) { fx = S.x; fy = S.kind === 'lineout' ? S.ty + S.s * 70 : S.y; } }
    if (V.phase === 'kickoff' || V.phase === 'dropout') { const S = V.setp; if (S && S.aim) { fx = lerp(fx, S.aim.x, .35); fy = lerp(fy, S.aim.y, .35); } }
    fx += (V.dir[att] || 1) * 40 * (V.phase === 'play' ? 1 : 0);
    fy = lerp(fy, G.CY, .25);
    if (b.st === 'air' && b.kind !== 'pass' && b.land && b.vz !== 0 && Math.hypot(b.land.x - b.x, b.land.y - b.y) > 60) { fx = (b.x + b.land.x) / 2; fy = lerp((b.y + b.land.y) / 2, G.CY, .2); this.kickFrame = true; } else this.kickFrame = false;
    if (o.focus) { fx = o.focus.x; fy = o.focus.y; }
    game.focus(fx, fy, fz);
  }
  /* ---------------------------------------------------------------- drawing */
  draw(r, V, o = {}) {
    const S = this.stadium, Vn = S.V, view = E.charView(r.view);
    this.drawSky(r, V);
    S.map.drawFloor(r);
    // ground marks: the ref's eyes, offside lines, the landing ring, the seat rings, the kick-off reticle, lineout pods
    if (o.refCone && V.ref.down <= 0 && (V.phase === 'play' || V.phase === 'ruck')) r.sightCone({ x: V.ref.x, y: V.ref.y, z: 0, facing: V.ref.f }, { range: TUNE.v.refRange, fov: TUNE.v.refFov, alpha: .14, color: '#fff0a0' });
    this.groundMarks(r, V, o);
    S.map.queueWalls(r);
    this.drawCrowd(r, V);
    this.drawBoards(r, V);
    this.drawPosts(r, V);
    this.drawDressing(r, V);
    this.drawHazards(r, V);
    this.drawPowerups(r, V);
    // the players, the referee, the ball
    V.players.forEach((p, i) => {
      if (p.st === 'off') return;
      const rig = this.rigs[i];
      if (p.st === 'bin') { this.drawBinned(r, p, rig, view); return; }
      r.shadow(p.x, p.y, 6 * p.size, p.z > 4 ? .2 : .35);
      const fire = p.fire > 0 || (p.sup && p.sup.kind === 'thunder'), glow = p.charge >= 0 ? (p.chargeT > 1.2 ? '#ff4030' : '#ffe08a') : null;
      const ctl = p.ctl >= 0 || (V.ball.st === 'held' && V.ball.holder === p.id);
      const zap = p.zap > 0 && Math.floor(this.t * 20) % 2;
      r.actor(p.x, p.y, p.z, (g, ox, oy) => (zap ? this.skeleton(rig) : rig).draw(g, ox, oy, view), {
        xray: ctl ? { actors: true, color: ctl && p.ctl >= 0 ? (o.seatColor && o.seatColor(p.ctl)) || '#ffe08a' : '#ffffff' } : false,
        flash: glow || (p.pu && p.pu.kind === 'iron' ? '#a0b0c8' : p.pu && p.pu.kind === 'grease' && Math.floor(this.t * 8) % 2 ? '#e8e070' : false), flashMix: glow ? .35 + .25 * Math.sin(this.t * 20) : .3,
        ghost: fire || (p.sup && p.sup.kind === 'hurricane') || p.st === 'launch' ? { color: fire ? '#ff8030' : '#a0d0ff', life: .25, alpha: .5, owner: p } : null,
        emissive: false, pick: { kind: 'player', id: p.id }
      });
      if (p.zap > 0) p.zap -= 1 / 60;
      if (p.st === 'stun' || (p.st === 'down' && p.a.act === 'landed')) r.sprite(p.x, p.y, p.z + 34 * p.size, STARS[Math.floor(this.t * 6) % 2], { anchor: 'center' });
    });
    const R = V.ref;
    r.shadow(R.x, R.y, 6, .35);
    r.actor(R.x, R.y, 0, (g, ox, oy) => this.refRig.draw(g, ox, oy, view));
    if (R.signal === 'card' && R.sigT > 0) r.queue(R.x, R.y, 46, g => { const [x, y] = r.w(R.x + 3, R.y, 46); px.rect(g, Math.round(x) - 2, Math.round(y) - 6, 5, 7, R.card === 'red' ? '#e83030' : '#f0d020'); px.rect(g, Math.round(x) - 2, Math.round(y) - 6, 5, 1, '#ffffff'); }, { bias: 2 });
    this.drawBall(r, V);
    // off-screen arrows at the screen's edge: the ball, and each controlled player in his seat's colour
    if (r.visible && r.marker && V.phase !== 'setkick') {
      const b = V.ball; if (!r.visible(b.x, b.y, b.z) && b.st !== 'dead') r.marker(b.x, b.y, b.z, { color: '#ffffff', label: 'BALL' });
      for (const p of V.players) if (p.ctl >= 0 && p.st !== 'bin' && p.st !== 'off' && !r.visible(p.x, p.y, p.z + 20)) r.marker(p.x, p.y, p.z + 20, { color: (o.seatColor && o.seatColor(p.ctl)) || '#ffe060', label: o.seatLabel ? o.seatLabel(p.ctl) : '' });
    }
    this.lights(r, V);
  }
  skeleton(rig) {
    if (!this._skel) this._skel = new E.Humanoid({ build: 'skeleton', size: 1.15, weapon: null });
    this._skel.update(1 / 60, { x: rig.x, y: rig.y, z: rig.z, facing: rig.facing, hurt: true });
    return this._skel;
  }
  drawBinned(r, p, rig, view) {
    // the sin bin: the binned player sulks inside the dumpster on the touchline
    r.actor(p.x, p.y, 4, (g, ox, oy) => rig.draw(g, ox, oy, view));
  }
  drawBall(r, V) {
    const b = V.ball;
    if (b.st === 'held' && V.players[b.holder]) {
      const p = V.players[b.holder], rig = this.rigs[b.holder];
      if (TT.cfg.present && rig.J && rig.J.handL && p.st !== 'set') { const [hx, hy, hz] = rig.hand('L'); r.sprite(hx, hy, hz - 2, BALL_SIDE, { anchor: 'center', rot: p.f, bias: 1 }); return; }
    }
    if (b.st === 'dead' && V.phase !== 'setkick' && V.phase !== 'kickoff' && V.phase !== 'dropout' && V.phase !== 'scrum' && V.phase !== 'lineout' && V.phase !== 'penalty') return;
    r.shadow(b.x, b.y, 3 - Math.min(1.5, b.z * .03), .4);
    const kickish = b.st === 'air' && b.kind !== 'pass';
    const spr = kickish && Math.abs(Math.sin(b.rot)) > .6 ? BALL_END : BALL_SIDE;
    r.sprite(b.x, b.y, b.z + 3, spr, { anchor: 'center', rot: kickish ? 0 : (b.st === 'air' ? Math.atan2(b.vy, b.vx) : b.rot * .3), glow: b.mega ? .8 : 0 });
    if (b.mega && b.st === 'air') r.queue(b.x, b.y, b.z + 3, g => { const [x, y] = r.w(b.x, b.y, b.z + 3); r.glowDisc(g, x, y, 8, '#ff8030', .7); }, { emissive: true });
  }
  /** decals on the grass */
  groundMarks(r, V, o) {
    const b = V.ball, S = V.setp;
    r.decal(g => {
      // the landing ring of every kick, both teams
      if (b.st === 'air' && b.kind !== 'pass' && b.land) { const k = .6 + .4 * Math.sin(this.t * 10); r.groundRing(b.land.x, b.land.y, 10 + 3 * k, '#ffe060', .8); r.groundRing(b.land.x, b.land.y, 4, '#ffffff', .6); }
      // offside lines at rucks, scrums and lineouts (dashed, team colour)
      if (S && (S.kind === 'ruck' || S.kind === 'scrum' || S.kind === 'lineout')) for (const t of [0, 1]) {
        const d = V.dir[t], ox = S.kind === 'lineout' ? S.x - d * G.L10 : S.x - d * (S.kind === 'scrum' ? 22 : 16), col = V.kits[t].cloth;
        for (let y = G.Y0; y < G.Y1; y += 16) { const [x0, y0] = r.w(ox, y, 0), [x1, y1] = r.w(ox, y + 8, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col, 1); }
      }
      if (S && S.kind === 'ruck') r.groundRing(S.x, S.y, 16, '#ffffff', .25);
      // USE IT: a countdown ring round the ball at the base
      if (V.useIt > 0 && b.st === 'held') { const k = V.useIt / 3; r.groundArc(b.x, b.y, 9, 11, -PI / 2, -PI / 2 + TAU * k, '#ff8040', .8); }
      // the kick-off reticle and the lineout pods
      if (S && (S.kind === 'kickoff' || S.kind === 'dropout') && S.aim) { r.groundRing(S.aim.x, S.aim.y, 14, '#ffe060', .9); r.groundRing(S.aim.x, S.aim.y, 6, '#ffffff', .8); }
      if (S && S.kind === 'lineout') for (let k = 0; k < 3; k++) { const py = S.ty + S.s * (G.L5 + 16 * k), mine = o.myTeam !== undefined ? S.calls[o.myTeam] === k : false; r.groundRing(S.x, py, 7, mine ? '#ffe060' : '#ffffff', mine ? .9 : .35); }
      // the controlled players' rings in their seat colours
      for (const p of V.players) if (p.ctl >= 0 && p.st !== 'bin' && p.st !== 'off') { const c = (o.seatColor && o.seatColor(p.ctl)) || '#ffe060'; r.groundRing(p.x, p.y, 8 * p.size, c, .9); r.groundRing(p.x, p.y, 9 * p.size, '#000000', .3); }
      for (const q of V.powerups) if (q.on && !q.taken) r.groundRing(q.x, q.y, 9 + Math.sin(this.t * 6) * 2, '#fff0a0', .5);
    });
  }
  drawSky(r, V) {
    const Vn = this.stadium.V, night = V.time === 'night', dusk = V.time === 'dusk';
    const sky = V.time === Vn.time ? Vn.sky : night ? ['#06060e', '#141428', '#2a2a48'] : dusk ? ['#2a2a5a', '#c8603a', '#f0a050'] : ['#7aa0c8', '#a8c4dc', '#d0dce4'];
    r.sky(sky);
    // the skyline above the far stand's top edge, wherever the camera is
    const [, topY] = r.w(G.CX, 0, 54);
    const k = Vn.skyline, cols = Vn.skyCol;
    const W = r.W;
    this.skylineY = topY;
    r.queue(G.CX, -40, 0, gg => {
      const [sx0] = r.w(0, 0, 0), y0 = Math.round(topY);
      if (y0 < -10 || (r.view.yawDeg || 0) !== 0) return;
      const R = (n) => E.hash2(n, 3);
      if (k === 'hills') {
        for (let x = 0; x < W; x += 2) { const wx = x - sx0 * .3, h = 14 + Math.sin(wx * .012) * 8 + Math.sin(wx * .031) * 4; px.rect(gg, x, y0 - h, 2, h + 2, cols[0]); }
        for (let x = 0; x < W; x += 2) { const wx = x - sx0 * .5, h = 8 + Math.sin(wx * .02 + 2) * 5; px.rect(gg, x, y0 - h, 2, h + 2, cols[1]); }
        const sx = Math.round(W * .7 - sx0 * .3 % W); px.rect(gg, sx, y0 - 34, 3, 26, '#4a4a52'); px.poly(gg, [[sx - 2, y0 - 34], [sx + 5, y0 - 34], [sx + 1.5, y0 - 46]], '#3a3a42');
      } else if (k === 'docks') {
        for (let i = 0; i < 6; i++) { const x = Math.round(((i * 97 - sx0 * .4) % (W + 80) + W + 80) % (W + 80) - 40); px.rect(gg, x, y0 - 40, 3, 40, cols[1]); px.rect(gg, x - 18, y0 - 40, 36, 3, cols[1]); px.line(gg, x + 14, y0 - 38, x + 14, y0 - 22, cols[1], 1); }
        const lx = Math.round(W * .15 - sx0 * .2 % W); px.rect(gg, lx, y0 - 30, 6, 30, '#e8e0d0'); px.rect(gg, lx, y0 - 24, 6, 4, '#c83a2a'); px.rect(gg, lx - 1, y0 - 34, 8, 4, '#f0d060');
        for (let i = 0; i < 5; i++) { const gx = (this.t * 12 + i * 70) % W, gy = y0 - 50 + Math.sin(this.t * 2 + i) * 6; px.line(gg, gx - 3, gy, gx, gy + 2, '#f0f0f0', 1); px.line(gg, gx, gy + 2, gx + 3, gy, '#f0f0f0', 1); }
      } else if (k === 'chimneys') {
        for (let i = 0; i < 7; i++) { const x = Math.round(((i * 71 - sx0 * .35) % (W + 60) + W + 60) % (W + 60) - 30), h = 30 + R(i) * 30; px.rect(gg, x, y0 - h, 8, h, cols[0]); px.rect(gg, x - 1, y0 - h, 10, 3, '#2a1a1a'); const sp = (this.t * 20 + i * 13) % 30; px.dot(gg, x + 3 + Math.sin(this.t + i) * 2, y0 - h - sp, sp < 10 ? '#ffb040' : '#5a4040'); }
        px.rect(gg, 0, y0 - 4, W, 4, '#5a1a0e');
      } else if (k === 'city') {
        for (let i = 0; i < 14; i++) { const x = Math.round(((i * 37 - sx0 * .3) % (W + 40) + W + 40) % (W + 40) - 20), h = 24 + R(i) * 50, w = 14 + R(i + 9) * 12; px.rect(gg, x, y0 - h, w, h, cols[i % 3]); for (let wy = y0 - h + 4; wy < y0 - 4; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (E.hash2(wx, wy) > .55) px.dot(gg, wx, wy, '#f0d880'); }
        const gx = Math.round(W * .55 - sx0 * .3 % W); E.font.text(gg, 'GOLDBRICK', gx, y0 - 70, '#e8c040', { font: 'tiny', outline: '#000' });
      }
    }, { bias: -9999 });
  }
  drawCrowd(r, V) {
    const S = this.stadium, k1 = V.kits[0], k2 = V.kits[1], t = this.t, ex = this.excite, cheer = this.cheer, ct = this.cheerTeam, wave = this.wave;
    const rows = [[], [], [], [], []];
    for (const f of S.crowd) rows[f.row].push(f);
    rows.forEach((L, ri) => {
      if (!L.length) return;
      const f0 = L[0], end = f0.end !== undefined;
      const qy = end ? G.CY : f0.y, qx = end ? (f0.end < 0 ? 20 : G.COLS * T - 20) : G.CX;
      r.queue(qx, qy, f0.z, g => {
        for (const f of L) {
          const mine = f.home ? 0 : 1, jump = (cheer > 0 && mine === ct) ? Math.abs(Math.sin(t * 10 + f.ph)) * 4 : 0;
          const wv = wave > 0 && Math.abs(f.x - (wave % (G.COLS * T))) < 30 ? 4 : 0;
          const bob = Math.sin(t * (2 + ex * 6) + f.ph) * (.4 + ex * 1.2) + jump + wv;
          const [x, y] = r.w(f.x, f.y, f.z + bob), X = Math.round(x), Y = Math.round(y);
          const kit = mine ? k2 : k1, shirt = f.shade < .6 ? kit.cloth : f.shade < .85 ? kit.trim : '#e8e0d0';
          px.rect(g, X - 2, Y - 5, 4, 5, shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin);
          if (f.hat) px.rect(g, X - 2, Y - 9, 4, 1, kit.cloth);
          if ((jump > 1 || wv) && (f.ph * 10 | 0) % 2) { px.dot(g, X - 3, Y - 8, f.skin); px.dot(g, X + 2, Y - 8, f.skin); }
          if (f.flag) { px.rect(g, X + 2, Y - 14, 1, 9, '#d8d8d8'); px.rect(g, X + 3, Y - 14, 5, 4, kit.cloth); px.rect(g, X + 3, Y - 12, 5, 1, kit.trim); }
        }
      }, { bias: ri < 3 ? 1 : 1 });
    });
  }
  /** sponsor boards along the far touchline, their text facing the camera */
  drawBoards(r, V) {
    const B = this.stadium.V.boards, segW = 160, y = 3 * T + T, z = 6;
    for (let i = 0, x = 2 * T + 8; x < (G.COLS - 2) * T - 8; x += segW, i++) {
      const [name, bg, fg] = B[i % B.length], x0 = x, x1 = Math.min(x + segW - 4, (G.COLS - 2) * T - 8);
      r.queue((x0 + x1) / 2, y + .5, z, g => {
        const [ax, ay] = r.w(x0, y, 12), [bx] = r.w(x1, y, 12), [, by] = r.w(x0, y, 0);
        const X0 = Math.round(ax), X1 = Math.round(bx), Y0 = Math.round(ay), Y1 = Math.round(by);
        const led = V.phase === 'try' && Math.floor(this.t * 6) % 2;
        px.rect(g, X0, Y0, X1 - X0, Y1 - Y0, led ? '#f0d040' : bg); px.rect(g, X0, Y0, X1 - X0, 1, E.shade(bg, .3)); px.rect(g, X0, Y1 - 1, X1 - X0, 1, E.shade(bg, -.4));
        const txt = led ? 'TRY!' : name, s = E.font.width(txt, { font: 'tiny' }) < X1 - X0 - 4 ? 'tiny' : 'tiny';
        E.font.text(g, txt, (X0 + X1) / 2, Y0 + Math.max(1, ((Y1 - Y0) - 5) / 2), led ? '#202020' : fg, { align: 'center', font: s, outline: false });
      }, { bias: 3 });
    }
  }
  /** the goalposts: padded uprights, crossbar; depth sorted with the ball */
  drawPosts(r, V) {
    for (const gx of [G.X0, G.X1]) {
      for (const py of [G.CY - G.POSTW, G.CY + G.POSTW]) r.queue(gx, py, 0, g => {
        const [x, y0] = r.w(gx, py, 0), [, y1] = r.w(gx, py, G.POSTH), [, yp] = r.w(gx, py, 20), X = Math.round(x);
        px.rect(g, X - 1, Math.round(y1), 2, Math.round(y0 - y1), '#f4f4f0'); px.rect(g, X, Math.round(y1), 1, Math.round(y0 - y1), '#c8c8c8');
        const pad = V.kits[0].cloth; px.rect(g, X - 3, Math.round(yp), 6, Math.round(y0 - yp), pad); px.rect(g, X - 3, Math.round(yp), 2, Math.round(y0 - yp), E.shade(pad, .25)); px.rect(g, X + 1, Math.round(yp), 2, Math.round(y0 - yp), E.shade(pad, -.3));
      }, { hides: false });
      r.queue(gx, G.CY + G.POSTW, G.BAR, g => { const [x0, y0] = r.w(gx, G.CY - G.POSTW, G.BAR), [x1, y1] = r.w(gx, G.CY + G.POSTW, G.BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
    }
  }
  drawDressing(r, V) {
    const t = this.t;
    // corner flags
    for (const x of [G.DX0, G.X0, G.X1, G.DX1]) for (const y of [G.Y0, G.Y1]) r.queue(x, y, 0, g => { const [X, Y] = r.w(x, y, 0), [, Yt] = r.w(x, y, 16); px.rect(g, Math.round(X), Math.round(Yt), 1, Math.round(Y - Yt), '#e8e8e8'); const fl = Math.sin(t * 6 + x) > 0 ? 1 : 0; px.rect(g, Math.round(X) + 1, Math.round(Yt), 4 + fl, 3, x === G.X0 || x === G.X1 ? '#e83a3a' : '#f0d040'); });
    // the sin bin: a green dumpster stencilled SIN BIN
    const bx = G.CX + 60, by = G.Y1 + 30;
    r.queue(bx, by + 8, 0, g => {
      r.box(g, bx - 18, by - 8, 0, bx + 18, by + 8, 16, '#3a7a3a', '#2a5a2a');
      const [x, y] = r.w(bx, by + 8, 10); E.font.text(g, 'SIN BIN', Math.round(x), Math.round(y) - 3, '#e8f0d0', { align: 'center', font: 'tiny', outline: false });
      const [lx0, ly0] = r.w(bx - 19, by - 9, 17), [lx1] = r.w(bx + 19, by - 9, 17); px.rect(g, Math.round(lx0), Math.round(ly0) - 2, Math.round(lx1 - lx0), 2, '#1e4a1e');
    }, { bias: 2 });
    // the dugouts, water bottles, kit bags and the cameramen on the near touchline
    for (const [dx, col] of [[-170, V.kits[0].cloth], [170, V.kits[1].cloth]]) {
      const x = G.CX + dx, y = G.Y1 + 70;
      r.queue(x, y, 0, g => { r.box(g, x - 34, y - 6, 0, x + 34, y + 6, 18, E.shade(col, -.2), E.shade(col, -.45)); const [X, Y] = r.w(x, y + 6, 6); E.font.text(g, dx < 0 ? 'HOME' : 'AWAY', Math.round(X), Math.round(Y) - 6, '#ffffff', { align: 'center', font: 'tiny', outline: false }); });
      for (let k = 0; k < 4; k++) r.queue(x - 24 + k * 5, G.Y1 + 44, 0, g => { const [X, Y] = r.w(x - 24 + k * 5, G.Y1 + 44, 0); px.rect(g, Math.round(X), Math.round(Y) - 5, 2, 5, k % 2 ? '#3ab0e8' : '#e8e8f0'); });
    }
    // floodlight towers on the far corners (lamps lit at dusk and night)
    for (const x of [24, G.COLS * T - 24]) r.queue(x, 20, 0, g => {
      const [X, Y] = r.w(x, 20, 0), [, Yt] = r.w(x, 20, 170), xi = Math.round(X);
      px.rect(g, xi - 1, Math.round(Yt), 3, Math.round(Y - Yt), '#5a5a64'); px.rect(g, xi - 1, Math.round(Yt), 1, Math.round(Y - Yt), '#7a7a84');
      const lit = V.time !== 'day';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) px.rect(g, xi - 7 + j * 4, Math.round(Yt) - 10 + i * 3, 3, 2, lit ? '#fff8d0' : '#a8a8b0');
      px.rect(g, xi - 8, Math.round(Yt) - 1, 17, 1, '#3a3a44');
    }, { emissive: V.time !== 'day', bias: -5 });
    // the jumbotron at the Megadome: the score, and the scorer's face on a try
    if (this.stadium.V.jumbotron) r.queue(G.CX, 2, 54, g => {
      const [x, y] = r.w(G.CX, 2, 54), X = Math.round(x) - 40, Y = Math.round(y) - 38;
      px.rect(g, X - 2, Y - 2, 84, 38, '#1a1a24'); px.rect(g, X, Y, 80, 34, '#06080e');
      if (V.phase === 'try' && this.lastScorer >= 0 && this.rigs[this.lastScorer]) { this.rigs[this.lastScorer].drawPortrait(g, X + 2, Y + 2, 30, { zoom: 2.4, turn: .3, bg: '#203060' }); E.font.text(g, 'TRY!', X + 58, Y + 12, '#ffe060', { align: 'center', outline: false }); }
      else { E.font.text(g, V.teams[0].short + ' ' + V.score[0], X + 40, Y + 6, '#ffe060', { align: 'center', outline: false }); E.font.text(g, V.teams[1].short + ' ' + V.score[1], X + 40, Y + 18, '#a0d0ff', { align: 'center', outline: false }); }
    }, { emissive: true, bias: 4 });
  }
  drawPowerups(r, V) {
    for (const q of V.powerups) {
      if (q.taken) continue;
      let x = q.x, y = q.y, z = 2;
      if (!q.on) { const u = clamp(q.t / q.fly, 0, 1); x = lerp(q.fx, q.x, u); y = lerp(q.fy, q.y, u); z = 60 * (1 - u) + Math.sin(u * PI) * 50; }
      else if (q.life - q.t < 3 && Math.floor(this.t * 8) % 2) continue;
      r.shadow(x, y, 5, .3);
      r.sprite(x, y, z + Math.sin(this.t * 4) * 1.5, TT.PU_SPR[q.kind], { anchor: 'bottom', glow: .4 });
    }
  }
  drawHazards(r, V) {
    const t = this.t;
    if (V.hazardKind === 'flames') for (const gr of TT.GRATES) r.decal(() => { r.groundDisc(gr.x, gr.y, 7, '#2a2020', .9); r.groundRing(gr.x, gr.y, 7, '#5a3a2a', .9); });
    for (const h of V.hazards) {
      if (h.kind === 'chicken' && h.t >= h.warn) {
        if (!this.chick) this.chick = new E.Blob({ R: 14, colors: { dk: '#c8c0a8', base: '#f8f4e8', lt: '#ffffff', spec: '#ffffff', eye: '#141414', pupil: '#000000' }, wings: true, feet: true, mouth: false });
        this.chick.update(1 / 60, { walk: 1, flap: 1, look: [Math.cos(h.f || 0), Math.sin(h.f || 0)], squash: Math.sin(t * 18) * .1 });
        r.shadow(h.x, h.y, 12, .4);
        r.actor(h.x, h.y, Math.abs(Math.sin(t * 9)) * 3, (g, ox, oy) => { this.chick.draw(g, ox, oy, r.view); px.poly(g, [[ox - 3, oy - 34], [ox + 3, oy - 34], [ox, oy - 40]], '#e83a2a'); px.rect(g, ox - 3, oy - 35, 6, 2, '#e83a2a'); px.poly(g, [[ox + 6, oy - 22], [ox + 13, oy - 20], [ox + 6, oy - 18]], '#f0a020'); E.font.text(g, 'C', ox, oy - 16, '#3a6ae8', { align: 'center', font: 'tiny', outline: false }); }, { pick: { kind: 'chicken' } });
      }
      if (h.kind === 'flame') {
        if (h.t >= 0 && h.t < h.warn) r.decal(() => r.groundDisc(h.x, h.y, 8 + Math.sin(t * 20) * 2, '#ff8030', .4 + .4 * (h.t / h.warn)));
        else if (h.t >= h.warn && h.t < h.warn + h.burn) r.queue(h.x, h.y, 0, g => {
          for (let i = 0; i < 6; i++) { const u = (t * 3 + i / 6) % 1, [x, y] = r.w(h.x + Math.sin(i * 2 + t * 9) * 3, h.y, u * 46); px.disc(g, Math.round(x), Math.round(y), Math.max(1, 5 * (1 - u)), u < .3 ? '#fff0a0' : u < .6 ? '#ffa030' : '#e83a1a'); }
        }, { emissive: true });
      }
      if (h.kind === 'bolt') {
        if (h.t < h.warn) r.decal(() => { const k = h.t / h.warn; r.groundRing(h.x, h.y, 36, '#c0e0ff', .3 + .5 * k); r.groundRing(h.x, h.y, 36 * (1 - k), '#ffffff', .6); });
        else if (h.t < h.warn + .25) r.queue(h.x, h.y, 0, g => {
          let [x, y] = r.w(h.x, h.y, 260); const [, yb] = r.w(h.x, h.y, 0);
          while (y < yb) { const nx = x + (E.hash2(Math.floor(y), Math.floor(t * 30)) - .5) * 14, ny = Math.min(yb, y + 10); px.line(g, Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), '#ffffff', 2); px.line(g, Math.round(x) + 1, Math.round(y), Math.round(nx) + 1, Math.round(ny), '#a0c8ff', 1); x = nx; y = ny; }
        }, { emissive: true });
        else r.decal(() => r.groundDisc(h.x, h.y, 22, '#1a1414', .5));
      }
    }
  }
  /** light every scene: the day's ambient, floodlight pools at dusk and night, glows on fire */
  lights(r, V) {
    const L = TT.game ? TT.game.lights : null; if (!L) return;
    const T0 = TT.TIMES[V.time] || TT.TIMES.day;
    L.enabled = true; L.ambient = T0.ambient;
    if (V.time !== 'day') {
      for (const [x, y] of [[G.X0 + 120, G.Y0 + 60], [G.CX, G.Y0 + 40], [G.X1 - 120, G.Y0 + 60], [G.X0 + 120, G.Y1 - 60], [G.CX, G.Y1 - 40], [G.X1 - 120, G.Y1 - 60]]) L.add(x, y, 0, 360, V.time === 'night' ? .85 : .5, { color: '#fff4d8' });
    }
    for (const p of V.players) if (p.fire > 0 || (p.sup && p.sup.kind === 'thunder')) L.add(p.x, p.y, 20, 60, .9, { color: '#ff9040' });
    for (const h of V.hazards) if (h.kind === 'flame' && h.t >= h.warn - .3 && h.t < h.warn + h.burn) L.add(h.x, h.y, 10, 70, 1.1, { color: '#ff8030' });
  }
}
TT.Pres = Pres;
/* the power-ups, as string sprites with a glint */
TT.PU_SPR = {
  pie: E.sprite(['....w.w.....', '.....w......', '..oooooooo..', '.oyyyyyyyyo.', 'ossyyyyyyyso', 'oyyyyyyyyyyo', 'gggggggggggg', '.gGggggggGg.'], { o: '#a0602a', y: '#d8a050', s: '#f0d090', w: '#e8e8f0', g: '#a8a8b8', G: '#e8e8f8' }),
  iron: E.sprite(['.mmm....mmm.', 'mMMmm..mmMMm', 'mMmmmmmmmmMm', 'mmm.r..r.mmm', '.mm......mm.', '..m......m..'], { m: '#7a8090', M: '#d0d8e8', r: '#3a3a44' }),
  boot: E.sprite(['ww........ww', '.www....www.', '..wwyyyyww..', '....yYyy....', '....yyyy....', '....yyyyyyy.', '....yyyyyyyy', '.....kkkkkk.'], { y: '#e0b030', Y: '#fff0a0', w: '#f0f0f8', k: '#5a4a2a' }),
  grease: E.sprite(['..cccccccc..', '.cCccccccCc.', 'cccccccccccc', '.cc.cccc.cc.', '...cccccc...', '...cWcccc...', '...cccccc...', '...cccccc...'], { c: '#e8d040', C: '#fff8b0', W: '#ffffff' }),
  horn: E.sprite(['......rrr...', '.....rrrrr..', 'kkkkrrrrrrr.', 'kKkkrrRrrrrr', 'kkkkrrrrrrr.', '.....rrrrr..', '......rrr...'], { r: '#e83a2a', R: '#ff9a8a', k: '#2a2a30', K: '#6a6a74' })
};


/* ==== 31-hud.js ==== */
/* ---- THE HUD: the TV score bug, banners, the radar, a card per human seat, context prompts with the device's badges,
 * the in-world chevrons and receiver badges, and the big set-piece widgets ---- */
const BANNERS = { try: ['TRY!', '#ffe060'], monsterHit: ['MONSTER HIT!', '#ff7040'], lineBreak: ['LINE BREAK!', '#80ff90'], onFire: ['ON FIRE!', '#ff9030'], pushover: ['PUSHOVER TRY!', '#ffe060'], dropGoal: ['DROP GOAL!', '#ffe060'], convMade: ['CONVERTED!', '#80ff90'], convMissed: ['WIDE!', '#ff7070'], doinkMiss: ['DOINK!', '#ff7070'], penGoal: ['PENALTY GOAL!', '#80ff90'], knockOn: ['KNOCK-ON', '#ffffff'], forwardPass: ['FORWARD!', '#ffffff'], advantage: ['ADVANTAGE', '#a0d0ff'], penTry: ['PENALTY TRY!', '#ffe060'], notTen: ['NOT TEN!', '#ffffff'], notStraight: ['NOT STRAIGHT!', '#ffffff'], interception: ['INTERCEPTED!', '#80ff90'], jackal: ['JACKAL!', '#ffe060'], earlyEngage: ['EARLY ENGAGEMENT', '#ffffff'], collapse: ['SCRUM PENALTY!', '#ffe060'], penalty: ['PENALTY', '#ffe060'], freeKick: ['FREE KICK', '#ffe060'] };
class Hud {
  constructor(scene) { this.sc = scene; this.banners = []; this.t = 0; this.subs = []; }
  listen() {
    this.subs.push(TT.bus.on('*', (d, name) => {
      if (name === 'banner') return this.push(d.text, d.color || '#ffe060', d.sub);
      const b = BANNERS[name]; if (!b) return;
      let text = b[0];
      if (name === 'lineoutWon' && d.steal) text = 'STOLEN!';
      if (name === 'try' && d.how === 'pushover') return;
      this.push(text, b[1], name === 'try' && d.m ? d.m.players[d.id].nick.toUpperCase() : name === 'onFire' && d.m ? d.m.players[d.id].nick.toUpperCase() : null);
    }));
    this.subs.push(TT.bus.on('lineoutWon', d => { if (d.steal) this.push('STOLEN!', '#80ff90'); }));
    this.subs.push(TT.bus.on('hooter', () => this.push('HOOTER!', '#ff8040', 'BALL HAS TO GO DEAD')));
  }
  unlisten() { this.subs.forEach(f => f()); this.subs = []; }
  push(text, color, sub) { this.banners = this.banners.filter(b => b.text !== text); this.banners.push({ text, color, sub, t: 0, life: text.length > 10 ? 2 : 1.6 }); if (this.banners.length > 2) this.banners.shift(); }
  update(dt) { this.t += dt; for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.life); }
  /** the whole HUD over the match (V: the view state; ctx: seats, the scene's flags) */
  draw(r, V, ctx) {
    r.overlay(g => {
      if (ctx.replay) return this.replayBars(g, r, ctx);
      this.world(g, r, V, ctx);
      this.scoreBug(g, r, V, ctx);
      this.radar(g, r, V, ctx);
      this.cards(g, r, V, ctx);
      this.setPiece(g, r, V, ctx);
      this.prompts(g, r, V, ctx);
      this.drawBanners(g, r);
      if (V.windy || V.wind && V.wind.s > 0) this.windsock(g, r, V);
      if (V.phase === 'half') this.halftime(g, r, V, ctx);
      if (ctx.waiting) UI.txt(g, 'WAITING FOR THE HOST...', r.W / 2, 56, '#ffe060', { align: 'center' });
    });
  }
  scoreBug(g, r, V, ctx) {
    const x = 4, y = 4, w = 150;
    UI.panel(g, x, y, w, 30, { bg: ['#141a2c', '#0a0e18'], border: '#e8c040', alpha: .9 });
    for (const t of [0, 1]) {
      const yy = y + 3 + t * 13, tm = V.teams[t];
      px.rect(g, x + 3, yy, 4, 10, V.kits[t].cloth); px.rect(g, x + 3, yy + 9, 4, 1, V.kits[t].trim);
      UI.txt(g, tm.short, x + 10, yy + 1, '#f4f0e0');
      UI.txt(g, String(V.score[t]), x + 50, yy + 1, '#ffe060', { align: 'right' });
      // hype: the bar, flashing SUPER when full
      const hv = V.hype[t] / 100, full = V.hype[t] >= 100;
      UI.bar(g, x + 54, yy + 3, 38, 5, hv, full ? (Math.floor(this.t * 6) % 2 ? '#ffe060' : '#ff8030') : '#c040e0');
      if (full) UI.prompt(g, '{b:tri}', x + 94, yy - 1, ctx.I, {});
      // sin-bin icons: a little green dumpster with the seconds
      let bx = x + 106 + (full ? 6 : 0);
      for (const p of V.players) if (p.team === t && p.st === 'bin') { px.rect(g, bx, yy + 2, 7, 6, '#3a7a3a'); px.rect(g, bx, yy + 1, 7, 1, '#1e4a1e'); UI.txt(g, String(Math.ceil(Math.max(0, p.binT))), bx + 8, yy + 1, '#a0e0a0', { font: 'tiny' }); bx += 20; }
    }
    // the clock: the half and sevens time (HOOTER flashing past it), or GOLDEN POINT
    const cl = V.sudden ? 'GOLDEN POINT' : (V.half === 1 ? '1ST ' : '2ND ') + TT.mmss(V.tvClock ? V.tvClock() : V.clockShown || 0);
    UI.panel(g, x, y + 31, 74, 13, { bg: '#0a0e18', border: '#3a4660', alpha: .9 });
    UI.txt(g, V.hooter && Math.floor(this.t * 3) % 2 ? 'HOOTER!' : cl, x + 37, y + 34, V.hooter ? '#ff8040' : V.sudden ? '#ffd040' : '#c8d8f0', { align: 'center' });
    if (V.adv) UI.txt(g, 'ADVANTAGE ' + V.teams[V.adv.team].short, x + 78, y + 34, '#a0d0ff');
    if (V.ref && V.ref.down > 0) UI.txt(g, 'REF DOWN ' + Math.ceil(V.ref.down), x + 78, y + 34, Math.floor(this.t * 4) % 2 ? '#ff6a3a' : '#ffe060');
  }
  radar(g, r, V, ctx) {
    const s = .07, w = Math.round((G.DX1 - G.DX0) * s), h = Math.round((G.Y1 - G.Y0) * s), ca = TT.game && TT.game.cornerArea && TT.game.cornerArea();
    const x0 = r.W - w - 6, y0 = ca && ca.x0 < x0 + w ? Math.ceil(ca.y1) + 4 : 6;
    UI.panel(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#1e4a26', border: '#6a9070', alpha: .75 });
    const X = x => Math.round(x0 + (x - G.DX0) * s), Y = y => Math.round(y0 + (y - G.Y0) * s);
    px.rect(g, X(G.X0), y0, 1, h, '#a8d0a8'); px.rect(g, X(G.X1), y0, 1, h, '#a8d0a8'); px.rect(g, X(G.CX), y0, 1, h, '#6a9a6a');
    for (const p of V.players) { if (p.st === 'bin' || p.st === 'off') continue; const c = V.kits[p.team].cloth; px.rect(g, X(p.x) - 1, Y(p.y) - 1, 3, 3, '#000000'); px.rect(g, X(p.x) - 1, Y(p.y) - 1, 2, 2, c); if (p.ctl >= 0) { const sc = ctx.seatColor(p.ctl); px.rect(g, X(p.x) - 2, Y(p.y) - 2, 4, 1, sc); px.rect(g, X(p.x) - 2, Y(p.y) + 2, 4, 1, sc); } }
    const b = V.ball; px.rect(g, X(b.x), Y(b.y), 2, 2, '#ffffff');
  }
  /** a card per human seat: the controlled player's live portrait, nickname, turbo, power-up */
  cards(g, r, V, ctx) {
    const seats = ctx.seats.filter(s => s.kind !== 'cpu' && s.kind !== 'remoteHidden');
    seats.forEach((s, k) => {
      const p = V.players[s.pid]; if (!p) return;
      const w = 104, h = 30, left = k % 2 === 0, row = Math.floor(k / 2), x = left ? 4 : r.W - w - 4, y = r.H - h - 4 - row * (h + 3) - (ctx.dialogUp ? 0 : 0);
      UI.panel(g, x, y, w, h, { bg: ['#141a2c', '#0a0e18'], border: s.color, alpha: .88 });
      const rig = ctx.pres && ctx.pres.rigs[p.id];
      if (rig && TT.cfg.present) rig.drawPortrait(g, x + 3, y + 3, 24, { zoom: 2.2, turn: .4, bg: E.shade(V.kits[p.team].cloth, -.5) });
      UI.txt(g, s.label, x + 30, y + 3, s.color);
      UI.txt(g, p.nick.toUpperCase().slice(0, 13), x + 30 + UI.w(s.label) + 4, y + 3, '#f0ecdc');
      const tank = clamp(p.turbo / TUNE.v.turboTank, 0, 1), inf = p.fire > 0 || (p.pu && p.pu.kind === 'pie');
      UI.txt(g, 'TURBO', x + 30, y + 14, '#8090b0', { font: 'tiny' });
      UI.bar(g, x + 52, y + 14, 48, 5, inf ? 1 : tank, inf ? (Math.floor(this.t * 8) % 2 ? '#ffe060' : '#ff8030') : tank < .25 ? '#e84a3a' : '#40d0ff');
      if (p.pu) { UI.txt(g, TT.POWERUPS[p.pu.kind].name.split(' ')[0] + ' ' + Math.ceil(p.pu.t), x + 30, y + 21, '#ffe08a', { font: 'tiny' }); }
      else if (p.fire > 0) UI.txt(g, 'ON FIRE ' + Math.ceil(p.fire), x + 30, y + 21, '#ff9030', { font: 'tiny' });
      else if (p.sup) UI.txt(g, p.sup.kind === 'thunder' ? 'THUNDER RUN' : 'HURRICANE', x + 30, y + 21, '#ffe060', { font: 'tiny' });
    });
  }
  /** the world-anchored bits: the seat chevrons and labels, the L1 / R1 badges over the two receivers, USE IT */
  world(g, r, V, ctx) {
    for (const p of V.players) {
      if (p.ctl < 0 || p.st === 'bin' || p.st === 'off') continue;
      const s = ctx.seats[p.ctl]; if (!s) continue;
      const [x, y] = r.w(p.x, p.y, p.z + 40 * p.size + 4), X = Math.round(x), Y = Math.round(y) + Math.round(Math.sin(this.t * 5) * 1.5);
      px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], '#000000'); px.poly(g, [[X - 3, Y - 5], [X + 3, Y - 5], [X, Y - 1]], s.color);
      UI.txt(g, s.label, X, Y - 14, s.color, { align: 'center' });
      if (p.charge >= 0) { UI.bar(g, X - 12, Y - 20, 24, 4, p.charge, p.chargeT > 1.2 ? '#ff3020' : p.charge >= 1 ? '#ffe060' : '#ff9030'); if (p.charge >= 1 && p.chargeT <= 1.2) UI.txt(g, 'MONSTER!', X, Y - 30, '#ffe060', { align: 'center', font: 'tiny' }); if (p.chargeT > 1.2) UI.txt(g, 'TOO HIGH!', X, Y - 30, '#ff4030', { align: 'center', font: 'tiny' }); }
      if (p.pk > 0) { UI.bar(g, X - 12, Y - 20, 24, 4, p.pk, p.pk > .9 ? '#80ff90' : '#ffe060', { mark: .9 }); UI.txt(g, (p.pkMode || 'punt').toUpperCase(), X, Y - 30, '#ffe060', { align: 'center', font: 'tiny' }); }
    }
    // the receivers for the human carrier: L1 above, R1 below (only legal ones), green; the mouse's hover shows red if forward
    const b = V.ball, c = b.st === 'held' ? V.players[b.holder] : null;
    if (c && c.ctl >= 0 && V.phase === 'play' && V.legalReceivers) {
      const s = ctx.seats[c.ctl], I = s && s.input;
      for (const side of [-1, 1]) {
        const q = V.passTarget(c, side, false); if (!q || (q.y - c.y) * side <= 0) continue;
        const [x, y] = r.w(q.x, q.y, q.z + 40 * q.size + 6);
        UI.glyph(g, side < 0 ? 'l1' : 'r1', x - 6, y - 12, I, {});
      }
      if (ctx.hoverId >= 0 && V.players[ctx.hoverId]) {
        const q = V.players[ctx.hoverId];
        if (q.team === c.team && q.id !== c.id) { const fwd = (q.x - c.x) * V.dir[c.team] > 4, [x, y] = r.w(q.x, q.y, 0); px.rect(g, Math.round(x) - 8, Math.round(y) + 3, 16, 2, fwd ? '#ff3a3a' : '#40ff60'); UI.txt(g, fwd ? 'FORWARD' : 'PASS', Math.round(x), Math.round(y) + 6, fwd ? '#ff6a6a' : '#80ff90', { align: 'center', font: 'tiny' }); }
      }
    }
    // the referee's balloon
    const R = V.ref;
    if (R.callT > 0 && R.call) { const [x, y] = r.w(R.x, R.y, 46), w = UI.w(R.call) + 8; px.rect(g, Math.round(x - w / 2), Math.round(y - 12), w, 11, '#ffffff'); px.rect(g, Math.round(x - w / 2), Math.round(y - 12), w, 1, '#c8c8c8'); px.poly(g, [[x - 2, y - 2], [x + 3, y - 2], [x, y + 2]], '#ffffff'); UI.txt(g, R.call, x, y - 10, '#1a1a24', { align: 'center', shadow: false }); }
    // the scrum, ruck and lineout calls float over play as the ref says them
  }
  prompts(g, r, V, ctx) {
    const s = ctx.seats.find(q => q.kind === 'local'); if (!s || ctx.attract || ctx.drill) return;
    const I = s.input, p = V.players[s.pid]; if (!p) return;
    let txt = '';
    const b = V.ball, has = b.st === 'held' && b.holder === p.id, ph = V.phase;
    if (ph === 'play') {
      if (has) {
        if (V.inGoal(p.team, p.x)) txt = '{b:x} DIVE OVER!';
        else {
          const drop = V.adv1(p.team, p.x) > G.W / 2 - G.L22;
          txt = '{b:l1}{b:r1} PASS  {b:x} STEP  {b:sq} FEND  ' + (drop ? '{b:ci} HOLD: DROP GOAL' : '{b:ci} KICK');
          if (V.hype[p.team] >= 100) txt += '  {b:tri} THUNDER RUN';
        }
      } else if (b.st === 'held' && V.players[b.holder].team !== p.team) {
        txt = '{b:x} TACKLE (HOLD: BIG HIT)  {b:sq} DIVE  {b:ci} SWITCH';
        if (V.hype[p.team] >= 100) txt += '  {b:tri} HURRICANE';
      } else if (b.st === 'air' && b.kind === 'pass' && b.team !== p.team) txt = 'HOLD {b:x} NEAR THE PASS: INTERCEPT';
      else txt = '{b:turbo} TURBO  {b:ci} SWITCH  {b:l1}{b:r1} SWITCH UP/DOWN';
    } else if (ph === 'ruck' && V.setp) {
      const mine = p.st === 'ruck' || V.setp.tackled === p.id;
      txt = mine ? 'MASH {b:x}!' : (p.team !== V.setp.att ? 'RUN IN TO JOIN  {b:sq} JACKAL' : 'RUN IN TO JOIN THE RUCK');
    } else if (ph === 'scrum' && V.setp) {
      const S = V.setp;
      txt = S.sub === 'push' ? 'ALTERNATE {b:l1} {b:r1} {b:l1} {b:r1}!' : S.sub === 'setup' ? 'SCRUM: WAIT FOR "SET!"' : '{b:x} ON "SET!"';
    } else if (ph === 'lineout' && V.setp) {
      const S = V.setp, thr = S.team === p.team;
      txt = thr ? (S.sub === 'throw' ? '{b:x} STOP THE NEEDLE IN THE GREEN' : '{b:l1}{b:r1} CALL A POD  {b:x} THROW') : (S.sub === 'flight' ? '{b:x} JUMP NOW!' : '{b:l1}{b:r1} GUESS THEIR POD  {b:x} AS IT ARRIVES');
    } else if ((ph === 'kickoff' || ph === 'dropout') && V.setp && V.setp.kicker === p.id) txt = '{b:stick} AIM  HOLD {b:ci} POWER, LET GO';
    else if (ph === 'setkick' && V.setp && V.setp.kicker === p.id) txt = V.setp.sub === 'place' ? '{b:stick} TEE BACK OR FORWARD  {b:x} DONE' : V.setp.sub === 'flight' ? '' : '{b:stick} AIM  HOLD {b:ci} POWER, LET GO IN THE BAND';
    else if (ph === 'penalty' && V.setp && V.setp.team === p.team) txt = '{b:stick} CHOOSE  {b:x} OK';
    if (!txt) return;
    const sc = ctx.large ? 2 : 1, y = r.H - (ctx.dialogUp ? 70 : 40) - (sc - 1) * 10;
    const w = UI.promptWidth(txt, I, { scale: sc });
    if (w > r.W - 230 && sc === 1) { UI.prompt(g, txt, r.W / 2, y, I, { align: 'center', bg: 'rgba(0,0,0,.55)', scale: 1 }); return; }
    UI.prompt(g, txt, r.W / 2, y, I, { align: 'center', bg: 'rgba(0,0,0,.55)', scale: w * sc > r.W - 40 ? 1 : sc });
  }
  drawBanners(g, r) {
    this.banners.forEach((b, i) => {
      const u = b.t / b.life, pop = b.t < .15 ? E.ease.outBack(b.t / .15) : 1, sc = b.text.length > 12 ? 3 : 4;
      const y = 56 + i * 44 + (u > .85 ? (u - .85) * -200 : 0);
      if (u > .9 && Math.floor(b.t * 20) % 2) return;
      FONT.title(g, b.text, r.W / 2, y - (1 - pop) * 20, { align: 'center', scale: Math.max(1, Math.round(sc * pop)), colors: ['#ffffff', b.color, E.shade(b.color, -.35)], depth: 2 });
      if (b.sub) UI.txt(g, b.sub, r.W / 2, y + 8 * sc + 4, '#ffffff', { align: 'center' });
    });
  }
  windsock(g, r, V) {
    const x = 4, y = 54, a = V.wind.a, s = V.wind.s;
    UI.panel(g, x, y - 4, 52, 22, { bg: '#0a0e18', border: '#3a4660', alpha: .8 });
    px.rect(g, x + 8, y, 1, 14, '#c8c8c8');
    const len = 4 + s * 12, ex = x + 8 + Math.cos(a) * len, ey = y + 2 + Math.sin(a) * len * .6;
    px.line(g, x + 8, y + 1, Math.round(ex), Math.round(ey), '#ff7030', 2); px.line(g, x + 8, y + 2, Math.round(ex), Math.round(ey) + 1, '#ffffff', 1);
    UI.txt(g, 'WIND', x + 20, y - 1, '#c8d0e8', { font: 'tiny' }); UI.txt(g, Math.round(s * 30) + ' MPH', x + 20, y + 7, '#ffe060', { font: 'tiny' });
  }
  halftime(g, r, V, ctx) {
    const w = 260, h = 120, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2;
    UI.panel(g, x, y, w, h, { bg: ['#2a1a10', '#140c08'], border: '#e8c040' });
    FONT.title(g, 'HALF-TIME', r.W / 2, y + 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#e0662a'] });
    UI.txt(g, V.teams[0].short + '  ' + V.score[0] + ' - ' + V.score[1] + '  ' + V.teams[1].short, r.W / 2, y + 36, '#ffffff', { align: 'center', scale: 2 });
    if (ctx.halfLine) { const L = FONT.wrap(ctx.halfLine, w - 20); L.slice(0, 3).forEach((l, i) => UI.txt(g, l, r.W / 2, y + 60 + i * 10, '#ffe7a8', { align: 'center' })); }
    else { const st = V.stats; UI.txt(g, 'TACKLES ' + st[0].tackles + ' - ' + st[1].tackles + '    BIG HITS ' + st[0].bigHits + ' - ' + st[1].bigHits, r.W / 2, y + 62, '#c8d0e8', { align: 'center' }); }
    UI.prompt(g, '{b:x} SECOND HALF', r.W / 2, y + h - 18, ctx.I, { align: 'center' });
  }
  replayBars(g, r, ctx) {
    const bh = Math.round(r.H * .1);
    px.rect(g, 0, 0, r.W, bh, '#000000'); px.rect(g, 0, r.H - bh, r.W, bh, '#000000');
    if (Math.floor(this.t * 2) % 2) px.disc(g, 14, bh / 2, 4, '#e83030');
    UI.txt(g, 'INSTANT REPLAY', 24, bh / 2 - 4, '#ffffff', { scale: 1 });
    UI.prompt(g, '{b:x} SKIP', r.W - 8, r.H - bh / 2 - 6, ctx.I, { align: 'right' });
  }
  /* ---- the set pieces' big widgets ---- */
  setPiece(g, r, V, ctx) {
    const S = V.setp; if (!S) return;
    const cx = r.W / 2, I = ctx.I;
    if (S.kind === 'ruck') {
      const w = 120, x = cx - w / 2, y = 8;
      UI.panel(g, x - 34, y - 4, w + 68, 18, { alpha: .82 });
      UI.txt(g, 'RUCK', x - 30, y, '#ffffff');
      const att = S.att, k = clamp((S.bar + 1) / 2, 0, 1);
      px.rect(g, x, y, w, 8, V.kits[1 - att].cloth); px.rect(g, x, y, Math.round(w * k), 8, V.kits[att].cloth); px.rect(g, x + w / 2, y - 2, 1, 12, '#ffffff');
      px.rect(g, x + Math.round(w * k) - 1, y - 2, 3, 12, '#ffe060');
      UI.txt(g, V.teams[att].short, x + w + 4, y, '#ffffff', { font: 'tiny' });
    }
    if (S.kind === 'scrum') {
      const w = 130, x = cx - w / 2, y = 6;
      UI.panel(g, x - 6, y - 3, w + 12, 34, { alpha: .82 });
      const call = S.sub === 'setup' ? 'SCRUM: ' + V.teams[S.team].short + ' FEED' : S.sub === 'crouch' ? 'CROUCH...' : S.sub === 'bind' ? 'BIND...' : S.sub === 'set' ? 'SET!' : 'PUSH!';
      UI.txt(g, call, x, y, S.sub === 'set' ? '#ffe060' : '#ffffff');
      // the ring closing on SET
      if (S.sub === 'bind' || S.sub === 'set') { const k = S.sub === 'bind' ? 1 - S.t / .6 : 0, rr = 3 + k * 8, rx = x + w - 10, ry = y + 9; for (let a = 0; a < 20; a++) { const an = a / 20 * TAU; px.dot(g, Math.round(rx + Math.cos(an) * rr), Math.round(ry + Math.sin(an) * rr), '#ffffff'); } px.disc(g, rx, ry, 3, S.sub === 'set' ? '#ffe060' : '#5a6a8a'); }
      for (const t of [0, 1]) if (S.tq[t]) UI.txt(g, V.teams[t].short + ' ' + S.tq[t], t ? x + w - 22 : x + 56, y + 1, S.tq[t] === 'PERFECT' ? '#80ff90' : S.tq[t] === 'GOOD' ? '#ffe060' : '#ff8080', { align: t ? 'right' : 'left', font: 'tiny' });
      const A = S.team, k = clamp((S.bar + 1) / 2, 0, 1), by = y + 20;
      px.rect(g, x, by, w, 7, V.kits[1 - A].cloth); px.rect(g, x, by, Math.round(w * k), 7, V.kits[A].cloth); px.rect(g, x + w / 2, by - 2, 1, 11, '#ffffff'); px.rect(g, x + Math.round(w * .075), by - 1, 1, 9, '#ff6060'); px.rect(g, x + Math.round(w * .925), by - 1, 1, 9, '#ff6060'); px.rect(g, x + Math.round(w * k) - 1, by - 2, 3, 11, '#ffe060');
    }
    if (S.kind === 'lineout') {
      const pw = 50, gap = 4, w = 3 * pw + 2 * gap, x = cx - w / 2, y = 6;
      UI.panel(g, x - 6, y - 3, w + 12, 36, { alpha: .82 });
      const mine = ctx.myTeam, rects = [];
      for (let k = 0; k < 3; k++) {
        const bx = x + k * (pw + gap), on = mine !== undefined && S.calls[mine] === k, theirs = ctx.shared && mine !== undefined && S.calls[1 - mine] === k && S.picked[1 - mine];
        px.rect(g, bx, y, pw, 12, on ? '#f0c040' : '#20283a'); if (on) px.rect(g, bx + 1, y + 1, pw - 2, 10, '#3a2a10');
        UI.txt(g, TT.POD_NAMES[k], bx + pw / 2, y + 2, on ? '#ffe060' : '#c8d0e8', { align: 'center', font: 'tiny' });
        if (theirs) px.rect(g, bx + 2, y + 10, pw - 4, 1, V.kits[1 - mine].cloth);
        rects.push([bx, y, pw, 12]);
      }
      ctx.podRects = rects;
      const ny = y + 16;
      if (S.sub === 'throw' || S.sub === 'flight') {
        px.rect(g, x, ny, w, 7, '#5a1a1a'); px.rect(g, x + Math.round(w * .15), ny, Math.round(w * .7), 7, '#8a7a1a'); px.rect(g, x + Math.round(w * .35), ny, Math.round(w * .3), 7, '#2a8a3a');
        px.rect(g, x + Math.round(w * S.needle) - 1, ny - 2, 3, 11, '#ffffff');
        if (S.qT) UI.txt(g, S.qT, cx, ny + 9, S.q >= 1 ? '#80ff90' : '#ffe060', { align: 'center', font: 'tiny' });
      } else UI.txt(g, V.teams[S.team].short + ' THROW: CALL A POD', cx, ny + 1, '#ffffff', { align: 'center', font: 'tiny' });
    }
    if ((S.kind === 'kickoff' || S.kind === 'dropout') && V.players[S.kicker] && V.players[S.kicker].ctl >= 0) this.meter(g, r.W - 40, r.H / 2 - 40, S.power, .85, 'POWER');
    if (S.kind === 'setkick') this.setKick(g, r, V, ctx);
    if (S.kind === 'penalty') this.penaltyCards(g, r, V, ctx);
  }
  meter(g, x, y, v, mark, label, band) {
    UI.panel(g, x - 6, y - 14, 24, 100, { alpha: .85 });
    UI.txt(g, label, x + 6, y - 11, '#ffffff', { align: 'center', font: 'tiny' });
    px.rect(g, x, y, 12, 80, '#0c0e14');
    if (band) px.rect(g, x + 1, y + 80 - Math.round(80 * band[1]), 10, Math.round(80 * (band[1] - band[0])), '#2a6a3a');
    const h = Math.round(78 * clamp(v, 0, 1)); px.rect(g, x + 1, y + 79 - h, 10, h, v > 1 ? '#ff4030' : '#ffd040');
    if (mark !== undefined) { const my = y + 80 - Math.round(80 * clamp(mark, 0, 1)); px.rect(g, x - 3, my, 18, 1, '#ffffff'); }
  }
  setKick(g, r, V, ctx) {
    const S = V.setp, tee = V.teePos(), line = V.oppLine(S.team), D = Math.hypot(line - tee.x, G.CY - tee.y);
    const k = V.players[S.kicker], human = k && k.ctl >= 0;
    UI.panel(g, r.W / 2 - 80, 46, 160, 22, { alpha: .85 });
    UI.txt(g, (S.purpose === 'conv' ? 'CONVERSION' : 'PENALTY GOAL') + '  ' + Math.round(metres(D)) + ' M', r.W / 2, 49, '#ffffff', { align: 'center' });
    UI.txt(g, 'SHOT CLOCK ' + Math.max(0, Math.ceil(S.clockT)), r.W / 2, 58, S.clockT < 6 ? '#ff7060' : '#a0b0c8', { align: 'center', font: 'tiny' });
    if (S.sub === 'place') UI.txt(g, 'TEE: ' + Math.round(metres(S.d)) + ' M OUT', r.W / 2, 72, '#ffe060', { align: 'center' });
    // the reticle on the posts' plane and the wind arrow
    if (S.sub !== 'flight' && S.sub !== 'result') {
      const [ax, ay] = r.w(line, G.CY + S.aim + S.sway, G.BAR + 18), X = Math.round(ax), Y = Math.round(ay);
      px.rect(g, X - 7, Y, 5, 1, '#ffe060'); px.rect(g, X + 3, Y, 5, 1, '#ffe060'); px.rect(g, X, Y - 7, 1, 5, '#ffe060'); px.rect(g, X, Y + 3, 1, 5, '#ffe060');
      px.rect(g, X - 1, Y - 1, 3, 3, '#ffffff');
    }
    if (human || S.sub === 'power') this.meter(g, r.W - 40, r.H / 2 - 40, S.power, V.setKickNeed ? V.setKickNeed() : S.need, 'POWER', [.82, .95]);
    if (S.result) FONT.title(g, S.result === 'good' ? 'GOOD!' : S.result === 'doink' ? 'DOINK!' : 'WIDE!', r.W / 2, r.H * .32, { align: 'center', scale: 4, colors: S.result === 'good' ? ['#ffffff', '#80ff90', '#2a8a3a'] : ['#ffffff', '#ff8080', '#8a2a2a'], depth: 2 });
  }
  penaltyCards(g, r, V, ctx) {
    const S = V.setp, names = { tap: ['TAP & GO', 'Play on now. They go back 10 m.'], goal: ['KICK AT GOAL', 'Three points from the tee.'], touch: ['KICK FOR TOUCH', 'Gain ground. Your lineout.'] };
    const w = 104, h = 60, gap = 8, total = 3 * w + 2 * gap, x0 = r.W / 2 - total / 2, y = r.H / 2 - 20;
    FONT.title(g, S.free ? 'FREE KICK' : 'PENALTY', r.W / 2, y - 40, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
    UI.txt(g, V.teams[S.team].name + ' TO CHOOSE', r.W / 2, y - 14, '#c8d0e8', { align: 'center' });
    const rects = [];
    S.opts.forEach((o, i) => {
      const x = x0 + i * (w + gap), on = S.sel === i;
      rects.push(o ? [x, y, w, h] : null);
      if (!o) { UI.panel(g, x, y, w, h, { alpha: .5, border: '#2a3040' }); UI.txt(g, 'OUT OF RANGE', x + w / 2, y + h / 2 - 3, '#5a6078', { align: 'center' }); return; }
      UI.panel(g, x - (on ? 2 : 0), y - (on ? 4 : 0), w + (on ? 4 : 0), h + (on ? 4 : 0), { focus: on, bg: on ? ['#3a2a10', '#241808'] : ['#1a2032', '#10141e'] });
      UI.txt(g, names[o][0], x + w / 2, y + 8, on ? '#ffe060' : '#ffffff', { align: 'center' });
      FONT.wrap(names[o][1], w - 10).forEach((l, k) => UI.txt(g, l, x + w / 2, y + 26 + k * 9, '#a8b0c8', { align: 'center', font: 'tiny' }));
    });
    ctx.cardRects = rects;
  }
}
TT.Hud = Hud;
TT.mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');


/* ==== 32-voice.js ==== */
/* ---- VOICES: Animalese-style babble, one syllable a letter in each speaker's own wave and pitch; and the commentary
 * director, who listens to the match and hands Barry and Ros their lines ---- */
const VOICES = TT.VOICES = {
  barry: { wave: 'square', base: 330, speed: 1.2, vol: .07 },
  ros: { wave: 'triangle', base: 220, speed: .9, vol: .16 },
  gristle: { wave: 'saw', base: 140, speed: .9, vol: .07, octave: true },
  nigel: { wave: 'pulse12', base: 260, speed: 1.1, vol: .07 },
  dave: { wave: 'triangle', base: 160, speed: .85, vol: .18 },
  nan: { wave: 'pulse', base: 380, speed: 1, vol: .06, vib: [9, .04] },
  rupert: { wave: 'square', base: 200, speed: .75, vol: .06 },
  unit: { wave: 'saw', base: 70, speed: .6, vol: .1 },
  pa: { wave: 'square', base: 180, speed: .9, vol: .06, echo: true },
  choir: { wave: 'triangle', base: 260, speed: .8, vol: .1, choir: true },
  player: { wave: 'pulse', base: 200, speed: 1, vol: .06 }
};
TT.voiceFor = who => {
  if (VOICES[who]) return VOICES[who];
  const s = TT.SPEAKERS[who];
  if (Array.isArray(s)) { const d = TT.TEAMS[s[0]].roster[s[1]]; if (d.voice && VOICES[d.voice]) return VOICES[d.voice]; return TT.playerVoice(d); }
  return VOICES.player;
};
/** a player's voice: pitch from his size and build */
TT.playerVoice = d => ({ wave: d.build === 'bulky' ? 'saw' : 'pulse', base: clamp(300 - (d.size - 1) * 260 - (d.build === 'bulky' ? 40 : 0), 80, 300), speed: 1, vol: .06 });
const VOWELS = 'aeiouy';
TT.babble = {
  t: 0, last: 0,
  /** one letter of speech: letters map to semitones (vowels lower and longer), capitals louder and higher, a rise before ?, a jump on ! */
  letter(ch, v, i, text) {
    if (!TT.sound || !TT.sound.ready || TT.muted) return;
    if (!/[a-z0-9]/i.test(ch)) return;
    const game = TT.game; if (!game || game.settings.commentary === 'Off' && v !== VOICES.choir && !this.story) return;
    const low = ch.toLowerCase(), vow = VOWELS.includes(low), code = low.charCodeAt(0);
    let semi = vow ? -2 + (code % 3) : (code * 7) % 9 - 2;
    const caps = ch !== low && /[A-Z]/.test(ch);
    if (caps) semi += 3;
    const rest = text ? text.slice(i + 1, i + 5) : '';
    if (rest.includes('?')) semi += 4; if (rest.includes('!')) semi += 2;
    const freq = v.base * Math.pow(2, semi / 12), dur = (vow ? .075 : .055) / (v.speed || 1);
    const o = { wave: v.wave, freq, to: freq * .94, dur, vol: v.vol * (caps ? 1.3 : 1), vib: v.vib };
    game.audio.sfx(o);
    if (v.octave) game.audio.sfx(Object.assign({}, o, { freq: freq / 2, to: freq / 2 * .94, vol: v.vol * .6 }));
    if (v.choir) for (const d of [-5, 4, 7]) game.audio.sfx(Object.assign({}, o, { freq: freq * Math.pow(2, d / 12), to: freq * Math.pow(2, d / 12) * .95, vol: v.vol * .5, wave: d > 0 ? 'square' : 'triangle' }));
    if (v.echo) game.after(.18, () => game.audio.sfx(Object.assign({}, o, { vol: o.vol * .5 })));
  },
  /** a short grunt from a player (tackles, rucks, scrums) */
  grunt(d, n = 3) {
    if (!TT.sound || !TT.sound.ready || TT.muted || !d) return;
    const v = d.voice && VOICES[d.voice] ? VOICES[d.voice] : TT.playerVoice(d), s = 'huargh';
    for (let i = 0; i < n; i++) TT.game.after(i * .06, () => this.letter(s[(i * 3 + (d.size * 10 | 0)) % s.length], v, i, s));
  }
};
/* ---- commentary: categories with priorities and cooldowns, shuffle bags (no line twice in a match), Barry first, Ros a
 * beat later 40% of the time, on a radio box at the foot of the screen with their live faces ---- */
const PRIO = { try: 10, pushover: 10, penTry: 10, monsterHit: 9, dropGoal: 9, red: 9, yellow: 8, onFire: 8, super: 8, refDown: 8, fulltime: 10, draw: 10, halftime: 9, hooter: 8, suddenDeath: 9, interception: 7, lineBreak: 7, bigHit: 7, convMade: 6, convMissed: 6, doink: 7, pengoal: 6, cheapUnseen: 6, cheapSeen: 6, penalty: 5, jackal: 6, turnover: 5, chicken: 7, flames: 7, lightning: 7, mud: 4, pie: 6, iron: 6, boot: 6, grease: 6, horn: 6, step: 4, fend: 4, dummy: 4, offload: 4, knockOn: 4, forwardPass: 4, scrum: 3, lineout: 3, notStraight: 4, advantage: 3, advOver: 3, kickoff: 3, kickTouch: 4, bomb: 3, grubber: 3, tackle: 1, brokenTackle: 3, missedTackle: 3, diveTackle: 4, gangHold: 6, touch: 2, dropout: 3, notTen: 4, freeKick: 4, sinOut: 3, refUp: 3, replay: 5, wind: 2, ruck: 1 };
class Commentary {
  constructor(game, o = {}) {
    this.game = game; this.o = o; this.bags = {}; this.cool = {}; this.t = 0; this.busy = 0; this.next = null; this.queue = [];
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c040', bg: '#101420', voice: null, speed: 46 });
    this.talk.onLetter = (ch, i, d) => { if (this.game.settings.commentary === 'On') TT.babble.letter(ch, d.name === 'ROS RUCKER' ? VOICES.ros : VOICES.barry, i, d._page.join('')); };
    this.rigs = { barry: TT.makeRig(TT.CAST.barry, TT.CAST.barry.colors, { hat: { style: 'band', color: '#202028' } }), ros: TT.makeRig(TT.CAST.ros, TT.CAST.ros.colors) };
    this.rng = TT.makeRng(o.seed || 5);
  }
  vars(m, d) {
    const p = d && d.id !== undefined && m.players[d.id], team = d && d.team !== undefined ? m.teams[d.team] : p ? m.teams[p.team] : m.teams[m.poss];
    const w = m.result ? m.result.winner : -1;
    return { player: p ? p.nick : 'He', team: (w >= 0 ? m.teams[w] : team).name, score: m.teams[0].short + ' ' + m.score[0] + ', ' + m.teams[1].short + ' ' + m.score[1], venue: m.venue.short };
  }
  pick(cat) {
    const L = TT.LINES[cat]; if (!L) return null;
    let bag = this.bags[cat];
    if (!bag || !bag.length) { bag = this.bags[cat] = L.map((_, i) => i); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    return L[bag.pop()];
  }
  /** a category happened: say a line if it beats what is being said and its cooldown is over */
  say(cat, m, d, force) {
    if (this.game.settings.commentary === 'Off' && !force) return;
    const pr = PRIO[cat] || 1;
    if (!force && this.cool[cat] > this.t) return;
    if (!force && this.talk.open && this.busyPrio >= pr) return;
    if (!force && pr <= 1 && this.rng() > .3) return;
    const line = this.pick(cat); if (!line) return;
    this.cool[cat] = this.t + 6; this.busyPrio = pr;
    const vars = this.vars(m, d);
    const lines = Array.isArray(line) ? line : [line];
    const first = lines[0], ros = first.startsWith('R:');
    this.show(ros ? 'ros' : 'barry', ros ? first.slice(2) : first, vars);
    // Ros chips in a beat later (or the line's own reply)
    const reply = lines[1] ? lines[1] : (!ros && this.rng() < .4 && pr >= 4 ? null : null);
    if (reply) this.next = { who: reply.startsWith('R:') ? 'ros' : 'barry', text: reply.replace(/^R:/, ''), vars, at: this.t + 2.2 };
    else if (!ros && pr >= 6 && this.rng() < .4) { const r = (TT.LINES[cat] || []).filter(l => typeof l === 'string' && l.startsWith('R:')); if (r.length) this.next = { who: 'ros', text: r[Math.floor(this.rng() * r.length)].slice(2), vars, at: this.t + 2.4 }; }
  }
  show(who, text, vars) {
    this.talk.say(text.toUpperCase().replace(/\{\$(\w+)\}/g, (_, k) => String(vars[k] === undefined ? '' : vars[k]).toUpperCase()), { name: who === 'ros' ? 'ROS RUCKER' : 'BARRY BELLOWS', portrait: this.rigs[who], portraitSize: 32, portraitOpts: { zoom: 2.6, turn: .4 }, auto: 2.2, modal: false, alpha: .86 });
  }
  update(dt) {
    this.t += dt;
    for (const k in this.rigs) this.rigs[k].update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, expr: this.talk.open && this.talk.typing ? 'shout' : null });
    if (this.next && this.t >= this.next.at && !(this.talk.open && this.talk.typing)) { const n = this.next; this.next = null; if (this.game.settings.commentary !== 'Off') this.show(n.who, n.text, n.vars); }
    this.talk.update(dt);
  }
  /** the lower third sits between the bottom corners' player cards (left and right: how many pixels each side keeps) */
  draw(r, o = {}) {
    if (this.game.settings.commentary === 'Off') return;
    const L = o.left === undefined ? 112 : o.left, R = o.right === undefined ? 112 : o.right;
    this.talk.w = clamp(r.W - L - R - 4, 170, 340); this.talk.x = L + Math.max(0, Math.round((r.W - L - R - this.talk.w) / 2));
    this.talk.draw(r);
  }
  /** the match's events, turned into categories */
  hook(bus, ctx) {
    const m = () => ctx.match, on = (n, f) => ctx.subs.push(bus.on(n, d => { if (!ctx.match || ctx.quiet) return; f(d); }));
    const map = { tackle: 'tackle', bigHit: 'bigHit', monsterHit: 'monsterHit', sidestep: 'step', spin: 'step', fend: 'fend', dummy: 'dummy', lineBreak: 'lineBreak', knockOn: 'knockOn', forwardPass: 'forwardPass', turnover: 'turnover', jackal: 'jackal', pushover: 'pushover', notStraight: 'notStraight', convMade: 'convMade', convMissed: 'convMissed', doinkMiss: 'doink', penGoal: 'pengoal', dropGoal: 'dropGoal', advantage: 'advantage', advOver: 'advOver', cheapUnseen: 'cheapUnseen', refDown: 'refDown', refUp: 'refUp', onFire: 'onFire', hooter: 'hooter', suddenDeath: 'suddenDeath', interception: 'interception', offload: 'offload', brokenTackle: 'brokenTackle', missedTackle: 'missedTackle', diveTackle: 'diveTackle', gangHold: 'gangHold', kickTouch: 'kickTouch', dropout: 'dropout', notTen: 'notTen', freeKick: 'freeKick', penTry: 'penTry', sinBinOut: 'sinOut', windShift: 'wind', ruckWon: 'ruck', mud: 'mud' };
    for (const ev in map) on(ev, d => this.say(map[ev], m(), d));
    on('kickoff', d => this.say('kickoff', m(), d));
    on('try', d => { if (d.how !== 'pushover' && d.how !== 'penalty') this.say('try', m(), d, true); });
    on('scrumWon', d => this.say('scrum', m(), d));
    on('lineoutWon', d => this.say('lineout', m(), d));
    on('foul', d => { if (d.kind === 'offBall') this.say('cheapSeen', m(), d); else this.say('penalty', m(), d); });
    on('card', d => this.say(d.red ? 'red' : 'yellow', m(), d, true));
    on('superStart', d => this.say('super', m(), d));
    on('powerupTake', d => this.say(d.kind, m(), d));
    on('hazard', d => this.say(d.kind, m(), d));
    on('kick', d => { if (d.kind === 'bomb') this.say('bomb', m(), d); else if (d.kind === 'grubber') this.say('grubber', m(), d); });
    on('halftime', d => this.say('halftime', m(), d, true));
    on('fulltime', d => this.say(d.winner < 0 ? 'draw' : 'fulltime', m(), d, true));
    on('replayStart', d => this.say('replay', m(), d, true));
  }
}
TT.Commentary = Commentary;


/* ==== 33-audio.js ==== */
/* ---- AUDIO: every song, sting and sound written as code for the engine's chip synth (no audio files) ---- */
const SONGS = TT.SONGS = {
  title: { title: 'Thugby Turbo!', bpm: 152, steps: 2, tracks: [
    { name: 'lead', wave: 'square', vol: .07, notes: 'E5 - - G5 A5 - B5 - | D6 - B5 - A5 - G5 - | E5 - - G5 A5 - B5 - | A5 - G5 - E5 - - - | E5 - - G5 A5 - B5 - | D6 - E6 - D6 - B5 - | A5 - B5 - G5 - A5 - | E5 - - - - - . .' },
    { name: 'bass', wave: 'saw', vol: .1, notes: 'E2 . E2 . E2 . E3 . | G2 . G2 . G2 . G3 . | A2 . A2 . A2 . A3 . | B2 . B2 . D3 . B2 .' },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k k h . s . s s' },
    { name: 'chant', wave: 'square', vol: .05, notes: '. . E4 . . . E4 E4 | . . E4 . . . E4 E4 | . . A4 . . . A4 A4 | . . B4 . . . B4 B4' }
  ] },
  mud: { title: 'Mud and Glory', bpm: 126, steps: 2, tracks: [
    { name: 'base', wave: 'pulse', vol: .06, notes: 'C5 - E5 G5 C6 - G5 E5 | F5 - A5 - G5 - E5 - | D5 - F5 A5 G5 - E5 C5 | D5 - G4 B4 C5 - - - ' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . C3 . G2 . | D3 . A2 . E3 . C3 . | G2 . D3 . C3 . G2 .' },
    { name: 'drums', wave: 'drums', vol: .13, on: false, notes: 'k . s . k . s s | k . s . k s s .' },
    { name: 'hype', wave: 'square', vol: .04, on: false, notes: 'C6 E6 G6 E6 C6 E6 G6 C7 | F6 A6 C7 A6 G6 B6 D7 B6' }
  ] },
  shanty: { title: 'Grumble Shanty', bpm: 104, steps: 3, tracks: [
    { name: 'base', wave: 'pulse12', vol: .07, notes: 'D5 - D5 F5 - A5 | G5 - E5 C5 - - | D5 - D5 F5 - A5 | G5 - E5 D5 - - | A5 - A5 G5 - F5 | E5 - C5 D5 - - | F5 - E5 D5 - C5 | D5 - - - - . ' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'D3 . A2 D3 . A2 | C3 . G2 C3 . G2 | D3 . A2 D3 . A2 | A2 . E3 D3 . . ' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . h s . h | k . h s . h' },
    { name: 'hype', wave: 'square', vol: .04, on: false, notes: 'D6 F6 A6 D6 F6 A6 | C6 E6 G6 C6 E6 G6' }
  ] },
  forge: { title: 'Forge Floor', bpm: 132, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .09, notes: 'A1 A1 . A1 C2 . A1 . A1 A1 . A1 E2 . D2 . | A1 A1 . A1 C2 . A1 . G1 G1 . G1 B1 . G1 .' },
    { name: 'lead', wave: 'square', vol: .05, notes: 'A4 - - - C5 - B4 - A4 - - - E5 - D5 - | C5 - - - B4 - G4 - A4 - - - - - . .' },
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . . t s . k . k . t . s . t t' },
    { name: 'hype', wave: 'triangle', vol: .09, on: false, notes: 'E6 . . . . . . . E6 . . . E6 . . .' }
  ] },
  mega: { title: 'Megadome Mayhem', bpm: 160, steps: 4, tracks: [
    { name: 'base', wave: 'square', vol: .05, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 | G4 B4 D5 G5 D5 B4 G4 B4 | F4 A4 C5 F5 C5 A4 F4 A4 | E4 G#4 B4 E5 B4 G#4 E4 G#4' },
    { name: 'bass', wave: 'saw', vol: .09, notes: 'A1 . A2 . A1 . A2 . | G1 . G2 . G1 . G2 . | F1 . F2 . F1 . F2 . | E1 . E2 . E1 . E2 .' },
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . h . s . h . k k h . s . h h' },
    { name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'A5 - - E6 - - A6 - | G5 - - D6 - - G6 - | F5 - - C6 - - F6 - | E5 - - B5 - - E6 -' }
  ] },
  pub: { title: 'Half-Time Pub Piano', bpm: 118, steps: 2, tracks: [
    { name: 'right', wave: 'triangle', vol: .2, notes: 'E5 G5 C6 G5 D5 F5 B5 F5 | C5 E5 G5 E5 C5 - - . | A4 C5 F5 C5 B4 D5 G5 D5 | C5 E5 G5 C6 - - . .' },
    { name: 'left', wave: 'pulse', vol: .05, notes: 'C3 G3 C3 G3 G2 D3 G2 D3 | C3 G3 C3 G3 C3 . . . | F2 C3 F2 C3 G2 D3 G2 D3 | C3 G3 C3 . C3 . . .' }
  ] },
  third: { title: 'Third Half', bpm: 96, steps: 2, tracks: [
    { name: 'tune', wave: 'square', vol: .06, notes: 'G4 - G4 A4 B4 - G4 - | C5 - B4 - A4 - - - | A4 - A4 B4 C5 - A4 - | D5 - C5 - B4 - - - | G4 - G4 A4 B4 - G4 - | C5 - E5 - D5 - B4 - | C5 - A4 - B4 - G4 - | G4 - - - - - . .' },
    { name: 'oom', wave: 'triangle', vol: .24, notes: 'G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | D3 . A3 . D3 . A3 . | G2 . D3 . G2 . D3 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s . k . s . | k . s . k k s .' }
  ] },
  victory: { title: 'Champions', bpm: 140, steps: 2, tracks: [
    { wave: 'square', vol: .07, notes: 'C5 E5 G5 C6 - - G5 C6 | E6 - - D6 - C6 - - | A5 C6 F6 - E6 C6 D6 - | C6 - - - - - . .' },
    { wave: 'triangle', vol: .22, notes: 'C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . G2 . G3 . | C3 . G2 . C3 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . s . k . s . | k . s . k s s s' }
  ] }
};
const STINGS = TT.STINGS = {
  try: { bpm: 200, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .09, notes: 'C5 E5 G5 C6 - E6 - G6 - - - .' }, { wave: 'saw', vol: .06, notes: 'C4 - G4 - C5 - - - E5 - - .' }, { wave: 'drums', vol: .16, notes: 'k s k s k k s c . . . .' }] },
  monster: { bpm: 180, steps: 2, loop: false, tracks: [{ wave: 'saw', vol: .1, notes: 'C3 - C#3 - . . .' }, { wave: 'square', vol: .06, notes: 'G4 - G#4 - . . .' }, { wave: 'drums', vol: .2, notes: 'c . k . . . .' }] },
  fire: { bpm: 220, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .08, notes: 'E5 G5 B5 E6 G6 B6 E7 - - .' }, { wave: 'drums', vol: .14, notes: 'k h k h s s s c . .' }] },
  trombone: { bpm: 90, steps: 1, loop: false, tracks: [{ wave: 'saw', vol: .09, notes: 'D4 C#4 C4 B3 - - .' }] },
  dingdong: { bpm: 120, steps: 1, loop: false, tracks: [{ wave: 'triangle', vol: .26, notes: 'E6 C6 - .' }] },
  win: { bpm: 160, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .08, notes: 'G5 G5 G5 C6 - - E6 - C6 - - .' }, { wave: 'drums', vol: .14, notes: 'k . k . s . k . c . . .' }] },
  lose: { bpm: 100, steps: 1, loop: false, tracks: [{ wave: 'triangle', vol: .24, notes: 'C5 B4 A#4 A4 - - .' }] },
  roll: { bpm: 240, steps: 4, loop: false, tracks: [{ wave: 'drums', vol: .16, notes: 's s s s s s s s s s s s s s s s c . . .' }] }
};
const SFX = {
  whistle: { wave: 'square', freq: 2300, vib: [34, .06], dur: .32, vol: .12 },
  whistleS: { wave: 'square', freq: 2300, vib: [34, .06], dur: .14, vol: .11 },
  hooter: { wave: 'saw', freq: 196, to: 190, dur: 1.4, vol: .2, arp: [0, 4, 7], step: .02 },
  hooter2: { wave: 'square', freq: 98, dur: 1.4, vol: .14 },
  thud: { wave: 'sine', freq: 120, to: 55, dur: .14, vol: .34 },
  thudN: { wave: 'noise', freq: 600, to: 200, dur: .1, vol: .2, filter: 'lowpass' },
  crunch: { wave: 'noise', freq: 1600, to: 200, dur: .24, vol: .32, filter: 'lowpass' },
  boom: { wave: 'sine', freq: 90, to: 30, dur: .4, vol: .42 },
  whoosh: { wave: 'noise', freq: 1200, to: 2600, dur: .16, vol: .1, filter: 'bandpass' },
  slap: { wave: 'noise', freq: 2400, to: 900, dur: .05, vol: .16 },
  punt: { wave: 'sine', freq: 160, to: 70, dur: .12, vol: .36 },
  puntN: { wave: 'noise', freq: 900, to: 200, dur: .08, vol: .22, filter: 'lowpass' },
  tap: { wave: 'triangle', freq: 260, to: 160, dur: .07, vol: .25 },
  bok: { wave: 'triangle', freq: 300, to: 180, dur: .09, vol: .24 },
  doink: { wave: 'triangle', freq: 1200, to: 1150, dur: .7, vol: .3, vib: [9, .01] },
  engage: { wave: 'noise', freq: 900, to: 120, dur: .3, vol: .34, filter: 'lowpass' },
  horn: { wave: 'square', freq: 440, dur: .9, vol: .14, arp: [0, 4, 7, 12], step: .03 },
  munch: { wave: 'noise', freq: 700, to: 300, dur: .06, vol: .2, filter: 'lowpass' },
  turbo: { wave: 'noise', freq: 400, to: 1400, dur: .25, vol: .08, filter: 'bandpass' },
  sputter: { wave: 'noise', freq: 300, to: 120, dur: .18, vol: .14, filter: 'lowpass' },
  charge: { wave: 'square', freq: 220, dur: .5, vol: .08, arp: [0, 4, 7, 12, 16, 19, 24], step: .06 },
  flame: { wave: 'noise', freq: 300, to: 1100, dur: .9, vol: .22, filter: 'lowpass' },
  crack: { wave: 'noise', freq: 4000, to: 600, dur: .18, vol: .36 },
  thunder: { wave: 'noise', freq: 220, to: 40, dur: 1.6, vol: .4, filter: 'lowpass' },
  squawk: { wave: 'square', freq: 700, to: 1200, dur: .22, vol: .12, vib: [18, .2] },
  squelch: { wave: 'noise', freq: 500, to: 180, dur: .16, vol: .2, filter: 'lowpass' },
  ding: { wave: 'triangle', freq: 1760, dur: .3, vol: .2 },
  boo: { wave: 'noise', freq: 260, to: 200, dur: 1.4, vol: .14, filter: 'lowpass' },
  clap: { wave: 'noise', freq: 2400, to: 1600, dur: .04, vol: .14, filter: 'bandpass' },
  crowd: { wave: 'noise', freq: 700, to: 600, dur: 1.3, vol: .1, filter: 'lowpass' },
  roar: { wave: 'noise', freq: 900, to: 1300, dur: 2.2, vol: .24, filter: 'lowpass' },
  groan: { wave: 'noise', freq: 600, to: 250, dur: 1.2, vol: .14, filter: 'lowpass' },
  ooh: { wave: 'noise', freq: 500, to: 900, dur: .9, vol: .18, filter: 'bandpass' },
  firework: { wave: 'noise', freq: 2000, to: 300, dur: .5, vol: .2 },
  zap: { wave: 'saw', freq: 1600, to: 200, dur: .3, vol: .12, vib: [40, .3] }
};
TT.SFX = SFX;
/** the game's sound board: songs by scene, layers by the match's mood, effects by events */
const Sound = TT.sound = {
  ready: false, song: null, crowdT: 0, clapT: 0,
  init(game) {
    this.game = game; this.A = game.audio;
    for (const k in SFX) this.A.define(k, SFX[k]);
    this.ready = true;
  },
  vol() { return this.game && this.game.settings ? this.game.settings.crowd : .8; },
  play(name, o) { if (this.ready && !TT.muted) this.A.sfx(name, o); },
  ui(kind) { if (!this.ready) return; this.A.sfx(kind === 'move' ? 'select' : kind === 'pick' ? 'confirm' : 'cancel', { vol: .6 }); },
  music(id, o = {}) {
    if (!this.ready || TT.muted) return;
    if (id === this.song && !o.force) return;
    this.song = id;
    if (!id) { this.A.music(null); return; }
    const s = id === 'victoryB' ? 'victory' : SONGS[id];
    this.A.music(s, { fade: o.fade === undefined ? .6 : o.fade });
  },
  layer(name, on) { if (!this.ready || !this.song) return; try { this.A.layer(name, on ? 1 : 0, .8); } catch (e) { /* the song has no such layer */ } },
  sting(id) { if (!this.ready || TT.muted) return; const s = STINGS[id]; if (s) try { this.A.sting(s, { at: 'beat' }); } catch (e) { this.A.sting(s); } },
  /** the crowd bed: overlapping filtered-noise swells whose loudness follows the excitement */
  crowd(dt, excite, on) {
    if (!this.ready || !on) return;
    this.crowdT -= dt;
    if (this.crowdT <= 0) { this.crowdT = .55; this.play('crowd', { vol: (.25 + excite * .9) * this.vol() }); }
  },
  /** the slow hand-clap at set kicks, speeding up with the shot clock */
  clap(dt, rate) { if (!this.ready) return; this.clapT -= dt; if (this.clapT <= 0) { this.clapT = rate; this.play('clap', { vol: .7 * this.vol() }); } },
  /** the match's events, heard */
  hook(bus, ctx) {
    const P = (n, o) => this.play(n, o), v = () => this.vol();
    const on = (n, f) => ctx.subs.push(bus.on(n, f));
    on('whistle', d => { if (d.kind !== 'conv' && d.kind !== 'pen') P('whistle'); });
    on('refCall', () => P('whistleS', { vol: .5 }));
    on('kickoff', () => { P('punt'); P('puntN'); });
    on('kickoffSetup', () => this.sting('roll'));
    on('pass', () => P('whoosh'));
    on('catch', d => { if (d.how !== 'restart' && d.how !== 'force') P('slap'); });
    on('kick', d => { if (d.kind === 'grubber') P('tap'); else { P('punt'); P('puntN'); } if (d.mega) P('firework'); });
    on('setKickGo', () => { P('punt'); P('puntN'); });
    on('bounce', d => { if (d.v > 30) P('bok', { vol: Math.min(1, d.v / 200) }); });
    on('tackle', () => { P('thud'); P('thudN'); });
    on('diveTackle', () => { P('thud'); P('thudN'); });
    on('bigHit', () => { P('crunch'); P('thud'); P('ooh', { vol: v() }); });
    on('monsterHit', () => { P('crunch'); P('boom'); P('ooh', { vol: v() }); this.sting('monster'); });
    on('cheapShot', () => P('thud'));
    on('doink', () => P('doink'));
    on('doinkMiss', () => P('groan', { vol: v() }));
    on('scrumEngage', () => P('engage'));
    on('mash', () => P('thudN', { vol: .3 }));
    on('push', () => P('thudN', { vol: .25 }));
    on('try', () => { this.sting('try'); P('roar', { vol: v() }); });
    on('convMade', () => P('roar', { vol: v() * .8 }));
    on('penGoal', () => P('roar', { vol: v() * .8 }));
    on('convMissed', () => P('groan', { vol: v() }));
    on('dropGoal', () => { this.sting('dingdong'); P('roar', { vol: v() }); });
    on('card', d => { P('ding'); P('boo', { vol: v() }); this.sting('trombone'); });
    on('hooter', () => { P('hooter'); P('hooter2'); });
    on('halftime', () => { P('whistle'); this.game.after(.4, () => P('whistle')); });
    on('fulltime', () => { P('whistle'); this.game.after(.35, () => P('whistle')); this.game.after(.7, () => P('whistle')); });
    on('superStart', () => P('charge'));
    on('onFire', () => this.sting('fire'));
    on('powerupThrow', () => P('whoosh'));
    on('powerupTake', d => { P(d.kind === 'horn' ? 'horn' : d.kind === 'pie' ? 'munch' : 'pickup'); if (d.kind === 'horn') P('roar', { vol: v() }); });
    on('hazardWarn', d => { if (d.kind === 'chicken') P('squawk'); });
    on('hazard', d => { if (d.kind === 'flames') P('flame'); if (d.kind === 'lightning') { P('crack'); P('thunder'); } if (d.kind === 'chicken') P('squawk'); });
    on('chickenHit', () => { P('squawk'); P('thud'); });
    on('zapped', () => P('zap'));
    on('mud', () => P('squelch'));
    on('sputter', () => P('sputter'));
    on('refDown', () => { P('thud'); P('ooh', { vol: v() }); });
    on('lineoutThrow', () => P('whoosh'));
    on('lineoutWon', d => { if (d.steal) P('ooh', { vol: v() }); });
    on('sidestep', () => P('whoosh', { vol: .6 }));
    on('fend', () => P('slap'));
  }
};


/* ==== 34-replay.js ==== */
/* ---- INSTANT REPLAY: the last 5 s of the match as compact frames (60 a second), played back at half speed through the
 * normal presentation, the camera close on the key actor, letterbox bars. Never in AI Hub sessions ---- */
const PKEYS = ['x', 'y', 'z', 'vx', 'vy', 'f', 'st', 'stT', 'stDur', 'fire', 'charge', 'chargeT', 'ctl', 'fendT', 'turbo', 'turboOn', 'mud', 'binT', 'pk', 'pkMode'];
class Replay {
  constructor(m) { this.m = m; this.buf = []; this.max = 300; this.k = 0; this.play = null; this.lastT = -99; }
  snap() {
    const m = this.m;
    return {
      t: m.t,
      players: m.players.map(p => { const o = {}; for (const k of PKEYS) o[k] = p[k]; o.a = Object.assign({}, p.a); o.sup = p.sup ? Object.assign({}, p.sup) : null; o.pu = p.pu ? Object.assign({}, p.pu) : null; o.id = p.id; o.team = p.team; o.slot = p.slot; o.size = p.size; o.nick = p.nick; o.d = p.d; return o; }),
      ball: Object.assign({}, m.ball, { land: m.ball.land ? Object.assign({}, m.ball.land) : null, tried: null }),
      ref: Object.assign({}, m.ref),
      hazards: m.hazards.map(h => Object.assign({}, h)), powerups: m.powerups.map(q => Object.assign({}, q)),
      phase: m.phase, setp: m.setp ? Object.assign({}, m.setp) : null
    };
  }
  /** every step: keep a frame every other step */
  record() { if (this.play) return; if ((this.k++ & 1) === 0) { this.buf.push(this.snap()); if (this.buf.length > this.max) this.buf.shift(); } }
  /** start a replay of the moment at time t (from 2.5 s before to 1 s after it) */
  start(ask) {
    const frames = this.buf.filter(f => f.t >= ask.t - 2.5 && f.t <= ask.t + 1);
    if (frames.length < 20) return false;
    this.play = { frames, i: 0, u: 0, id: ask.id, kind: ask.kind }; this.lastT = this.m.t;
    TT.bus.emit('replayStart', { m: this.m, kind: ask.kind });
    return true;
  }
  /** a step of playback: half speed; returns the view state for this moment (the match with the frame's fields) */
  step(dt) {
    const P = this.play; if (!P) return null;
    P.u += dt * .5 * 60;
    P.i = Math.min(P.frames.length - 1, Math.floor(P.u));
    if (P.u >= P.frames.length - 1) { this.stop(); return null; }
    return this.view();
  }
  view() {
    const P = this.play; if (!P) return null;
    const f = P.frames[P.i], V = Object.create(this.m);
    V.players = f.players; V.ball = f.ball; V.ref = f.ref; V.hazards = f.hazards; V.powerups = f.powerups; V.phase = f.phase === 'try' ? 'play' : f.phase; V.setp = f.setp;
    return V;
  }
  stop() { if (this.play) { this.play = null; TT.bus.emit('replayEnd', { m: this.m }); } }
  focus() { const P = this.play; if (!P) return null; const f = P.frames[P.i], p = f.players[P.id]; return p ? { x: p.x, y: p.y } : { x: f.ball.x, y: f.ball.y }; }
}
TT.Replay = Replay;


/* ==== 35-intent.js ==== */
/* ---- INTENTS FROM DEVICES: the preset (pad buttons named by their face: x = ✕ / A, sq = □ / X, ci = ○ / B, tri = △ / Y),
 * the two half-keyboard layouts, and what one seat's device asks this step ---- */
const KEYS = TT.KEYS = Object.assign({}, E.Input.DEFAULT);
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
Object.assign(KEYS, {
  x: ['Space', 'Pad0'], sq: ['KeyF', 'Pad2'], ci: ['KeyC', 'Pad1'], tri: ['KeyR', 'Pad3'],
  l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], turbo: ['ShiftLeft', 'Pad7'], view: ['KeyV', 'Pad11'],
  mouseL: ['Mouse0'], mouseR: ['Mouse2'], dev: ['Backquote']
});
Object.defineProperty(KEYS, 'halves', { enumerable: false, value: {
  left: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], turbo: ['ShiftLeft'], x: ['Space'], sq: ['KeyF'], ci: ['KeyC'], tri: ['KeyR'], l1: ['KeyQ'], r1: ['KeyE'], view: ['KeyV'], start: ['Digit1'], pause: ['Escape', 'Digit1'], confirm: ['Space', 'Enter'], cancel: ['KeyC', 'Escape'], mouseL: ['Mouse0'], mouseR: ['Mouse2'], dev: ['Backquote'] },
  right: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], turbo: ['Comma', 'Numpad0'], x: ['Period', 'Numpad1'], sq: ['Slash', 'Numpad2'], ci: ['Semicolon', 'Numpad3'], tri: ['Quote', 'Numpad6'], l1: ['KeyK', 'Numpad4'], r1: ['KeyL', 'Numpad5'], view: ['Numpad8'], start: ['Digit2', 'NumpadEnter'], pause: ['Backspace', 'Digit2'], confirm: ['Period', 'NumpadEnter'], cancel: ['Semicolon', 'Backspace'], mouseL: [], mouseR: [], dev: [] }
} });
TT.ACTION_NAMES = { x: 'Sidestep / Tackle', sq: 'Fend / Dive tackle', ci: 'Kick / Switch to ball', tri: 'Super', l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo', view: 'Camera view', mouseL: false, mouseR: false, dev: false };
const PBTN = ['x', 'sq', 'ci', 'tri', 'l1', 'r1'];
/** what a seat's device asks this step: the stick in world directions, the buttons, the mouse in the world */
TT.readIntent = (seat, game, m, ctx = {}) => {
  const In = seat.input, I = seat.I || (seat.I = TT.emptyIntent());
  I.cmd = null;
  const mv = In.move();
  let mx = mv[0], my = mv[1];
  if (game.view && (game.view.yawDeg || 0) !== 0 && game.view.screenDirToGround) { const d = game.view.screenDirToGround(mx, my); mx = d[0]; my = d[1]; }
  I.mx = mx; I.my = my; I.rawX = mv[0]; I.rawY = mv[1];
  for (const k of PBTN) { if (In.pressed(k)) I.pr[k] = true; I.hd[k] = In.down(k); I.rl[k] = In.released(k); }
  for (const k of ['up', 'down', 'left', 'right']) if (In.pressed(k)) I.pr[k] = true;
  // turbo: held, or toggled (Settings, Game)
  if (game.settings.turboMode === 'Toggle') { if (In.pressed('turbo')) seat.turboT = !seat.turboT; I.turbo = !!seat.turboT; } else I.turbo = In.down('turbo');
  I.click = null; I.aim = null; I.aimY = null; I.mhold = false; I.podClick = null; I.cardHover = null; I.cardClick = false; I.mkick = null;
  // the set kick: the stick (or the wheel) moves the tee; left and right aim
  I.placeMove = mv[1]; I.aimMove = mv[0] * (ctx.aimSign || 1);
  if (seat.i === 0 || In === game.input) {
    // the mouse is native: hover a teammate (shows if a pass to him is legal), click to pass or switch, the right button
    // kicks toward the cursor, the cursor aims set kicks and kick-offs, a click picks a pod or a card
    const pt = In.pointer && In.pointer(), recent = In.lastDevice === 'mouse' || (In.mouse && In.mouse.t !== undefined && In.clock - In.mouse.t < 2);
    ctx.hoverId = -1;
    if (pt && recent && ctx.pick) {
      const hits = ctx.pick(pt[0], pt[1]) || [], h = hits.find(q => q && q.kind === 'player');
      if (h) ctx.hoverId = h.id;
    }
    const ground = recent && game.mouseGround ? game.mouseGround() : null;
    if (In.pressed('mouseL') && ctx.hoverId >= 0) I.click = ctx.hoverId;
    I.mhold = In.down('mouseL') && recent;
    if (ground && m && (m.phase === 'kickoff' || m.phase === 'dropout') && In.lastDevice === 'mouse') I.aim = { x: ground[0], y: ground[1] };
    if (ground && m && m.phase === 'setkick' && In.lastDevice === 'mouse') I.aimY = ground[1];
    if (m && m.phase === 'setkick' && In.wheel) I.placeMove += In.wheel;
    if (m && (m.phase === 'kickoff' || m.phase === 'dropout') && I.mhold) I.hd.ci = true;
    if (m && (m.phase === 'kickoff' || m.phase === 'dropout') && In.released('mouseL')) I.rl.ci = true;
    if (m && m.phase === 'setkick' && In.released('mouseL') && m.setp && m.setp.sub === 'place') I.pr.x = true;
    const ck = In.clicked && In.clicked();
    if (ctx.podRects && ck) ctx.podRects.forEach((rc, k) => { if (UI.inRect(ck, rc)) I.podClick = k; });
    if (ctx.cardRects && pt) ctx.cardRects.forEach((rc, k) => { if (rc && UI.inRect(pt, rc)) { I.cardHover = k; if (ck && UI.inRect(ck, rc)) I.cardClick = true; } });
    // right button: held fills the meter toward the cursor; let go kicks there
    if (In.down('mouseR') && ground) { seat.mk = seat.mk || { t: 0 }; seat.mk.t += 1 / 120; seat.mk.x = ground[0]; seat.mk.y = ground[1]; }
    else if (seat.mk) { const k = seat.mk; seat.mk = null; if (ground || k.x !== undefined) I.mkick = { x: k.x, y: k.y, power: clamp(k.t / .9, 0, 1), done: true }; }
    ctx.mkick = seat.mk;
  }
  return I;
};


/* ==== 40-ui.js ==== */
/* ---- 10-FOOT UI: button badges that follow the device used last (PlayStation by default, Xbox in Settings, keycaps,
 * the mouse), prompt markup "{b:x} TACKLE", big panels, and a big focusable menu the stick, keys and mouse all drive ---- */
const UI = TT.ui = {};
const FONT = E.font;
UI.txt = (g, s, x, y, c = '#ffffff', o = {}) => FONT.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000000' }, o));
UI.title = (g, s, x, y, o = {}) => FONT.title(g, s, Math.round(x), Math.round(y), Object.assign({ align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }, o));
UI.w = (s, o = {}) => FONT.width(s, o);
UI.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#1c2436', '#10141e'], border: o.focus ? '#f0c040' : '#5a6a8a', alpha: .94 }, o));
/** the face buttons' colours, by family */
const PS = { '✕': '#6a9cf0', '○': '#f05a64', '□': '#e07ac8', '△': '#4ad0a0' }, XB = { A: '#5ac85a', B: '#e8503a', X: '#3a86e8', Y: '#f0c830' };
/** the label of an action on an input's last device (or the one named); the act's own name for special pseudo-actions */
UI.label = (act, I, device) => {
  if (!I) I = TT.game && TT.game.input;
  let dev = device || (I ? I.lastDevice : 'keyboard'); if (dev === 'touch') dev = 'keyboard';
  if (act === 'mouseL') return dev === 'gamepad' ? '' : 'LMB';
  if (act === 'mouseR') return dev === 'gamepad' ? '' : 'RMB';
  if (act === 'stick') return dev === 'gamepad' ? 'L-STICK' : 'WASD';
  return I ? I.label(act, dev === 'mouse' ? 'keyboard' : dev) : act.toUpperCase();
};
/** draw one badge for an action (or a raw label) at (x, y) (top left); returns its width */
UI.glyph = (g, act, x, y, I, o = {}) => {
  const lab = o.raw || UI.label(act, I, o.device);
  if (!lab) return 0;
  const s = o.scale || 1, X = Math.round(x), Y = Math.round(y);
  const face = PS[lab] || (lab.length === 1 && XB[lab] && (I ? I.lastDevice === 'gamepad' : false) ? XB[lab] : null);
  if (face) {
    const r = 5 * s;
    px.disc(g, X + r, Y + r, r, '#0c0e14'); px.disc(g, X + r, Y + r, r - 1, '#262a36'); px.disc(g, X + r, Y + r - 1, r - 2, '#30364a');
    FONT.text(g, lab, X + r, Y + r - 3 * s - (PS[lab] ? 0 : 0) + (lab === '△' ? 0 : 0), face, { align: 'center', scale: s, outline: false });
    return r * 2 + 1;
  }
  const pad = I && I.lastDevice === 'gamepad' && !o.device || o.device === 'gamepad';
  const w = UI.w(lab, { scale: s }) + 6 * s, h = 11 * s;
  if (pad) {   // shoulder buttons and the rest: a rounded pill
    px.rect(g, X + 1, Y, w - 2, h, '#0c0e14'); px.rect(g, X, Y + 1, w, h - 2, '#0c0e14'); px.rect(g, X + 1, Y + 1, w - 2, h - 2, '#30364a');
    FONT.text(g, lab, X + w / 2, Y + 2 * s, '#e8ecf8', { align: 'center', scale: s, outline: false });
  } else {     // a keycap
    px.rect(g, X, Y, w, h, '#2a2e3a'); px.rect(g, X, Y, w, h - 2, '#d8dce8'); px.rect(g, X + 1, Y + 1, w - 2, h - 4, '#eef0f6'); px.rect(g, X, Y, w, 1, '#ffffff');
    FONT.text(g, lab, X + w / 2, Y + 2 * s, '#1a1e2a', { align: 'center', scale: s, outline: false });
  }
  return w + 1;
};
/** prompt markup: '{b:x} TACKLE  {b:ci} SWITCH' (an action's badge, then the words); returns its width */
UI.promptWidth = (s, I, o = {}) => { let w = 0; for (const [k, v] of UI.parse(s)) w += k === 'b' ? UI.glyphW(v, I, o) + 2 : UI.w(v, { scale: o.scale || 1 }); return w; };
UI.glyphW = (act, I, o = {}) => { const lab = UI.label(act, I, o.device), s = o.scale || 1; if (!lab) return 0; return PS[lab] || (lab.length === 1 && XB[lab] && I && I.lastDevice === 'gamepad') ? 11 * s : UI.w(lab, { scale: s }) + 7 * s; };
UI.parse = s => { const out = []; let i = 0; const re = /\{b:(\w+)\}/g; let m; while ((m = re.exec(s))) { if (m.index > i) out.push(['t', s.slice(i, m.index)]); out.push(['b', m[1]]); i = m.index + m[0].length; } if (i < s.length) out.push(['t', s.slice(i)]); return out; };
UI.prompt = (g, s, x, y, I, o = {}) => {
  const sc = o.scale || 1, w = UI.promptWidth(s, I, o);
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (o.bg) { px.rect(g, Math.round(cx) - 4, Math.round(y) - 3, Math.round(w) + 8, 11 * sc + 6, o.bg); }
  for (const [k, v] of UI.parse(s)) {
    if (k === 'b') cx += UI.glyph(g, v, cx, y, I, o) + 2;
    else { UI.txt(g, v, cx, y + 2 * sc, o.color || '#ffffff', { scale: sc }); cx += UI.w(v, { scale: sc }); }
  }
  return w;
};
/** a rectangle hit test on a screen point */
UI.inRect = (pt, r) => pt && pt[0] >= r[0] && pt[0] < r[0] + r[2] && pt[1] >= r[1] && pt[1] < r[1] + r[3];
/** a focus list that the stick, the keys and the mouse share: up/down (or left/right) moves it, the mouse over a rect
 *  moves it (only when the mouse moved), a click picks; returns { moved, picked, back } */
class Focus {
  constructor(n, o = {}) { this.i = o.i || 0; this.n = n; this.axis = o.axis || 'v'; this.rects = []; this.lastPt = null; this.disabled = o.disabled || (() => false); this.wrap = o.wrap !== false; this.cols = o.cols || 0; }
  update(I, game) {
    const res = { moved: false, picked: false, back: false, hover: false };
    if (!this.n) return res;
    const prev = this.axis === 'v' ? 'up' : 'left', next = this.axis === 'v' ? 'down' : 'right';
    const step = d => { let i = this.i; for (let k = 0; k < this.n; k++) { i = this.wrap ? (i + d + this.n) % this.n : clamp(i + d, 0, this.n - 1); if (!this.disabled(i)) break; } if (i !== this.i) { this.i = i; res.moved = true; } };
    const P = game ? game.players : [I];
    for (const q of P) {
      if (q.repeat(prev, .32, .1)) step(-1);
      if (q.repeat(next, .32, .1)) step(1);
      if (this.cols) { if (q.repeat('up', .32, .1)) step(-this.cols); if (q.repeat('down', .32, .1)) step(this.cols); }
      if (q.pressed('confirm') || q.pressed('start')) { if (!this.disabled(this.i)) res.picked = true; }
      if (q.pressed('cancel')) res.back = true;
    }
    const pt = I.pointer && I.pointer();
    if (pt && (!this.lastPt || Math.abs(pt[0] - this.lastPt[0]) + Math.abs(pt[1] - this.lastPt[1]) > 0)) {
      this.rects.forEach((r, i) => { if (r && UI.inRect(pt, r) && !this.disabled(i) && i !== this.i) { this.i = i; res.moved = true; res.hover = true; } });
    }
    this.lastPt = pt;
    const ck = I.clicked && I.clicked();
    if (ck) this.rects.forEach((r, i) => { if (r && UI.inRect(ck, r) && !this.disabled(i)) { this.i = i; res.picked = true; } });
    if (res.moved && TT.sound) TT.sound.ui('move');
    return res;
  }
}
UI.Focus = Focus;
/** a big vertical menu: entries at scale 2 in boxes, a description line for the focused one */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.o = o; this.f = new Focus(items.length, { disabled: i => !!(this.items[i] && this.items[i].disabled), i: o.i || 0 }); }
  get i() { return this.f.i; } set i(v) { this.f.i = v; }
  update(I, game) {
    const r = this.f.update(I, game);
    if (r.picked) { const it = this.items[this.f.i]; if (TT.sound) TT.sound.ui('pick'); I.consumeAll(); if (game) game.players.forEach(q => q.consumeAll()); if (it && it.fn) it.fn(it, this.f.i); if (this.o.onPick) this.o.onPick(this.f.i, it); }
    else if (r.back && this.o.onBack) { if (TT.sound) TT.sound.ui('back'); this.o.onBack(); }
    return r;
  }
  draw(g, x, y, o = {}) {
    const sc = o.scale || 2, h = o.h || 10 * sc + 3, gap = o.gap === undefined ? 3 : o.gap, w = o.w || Math.max(...this.items.map(it => UI.w(it.label, { scale: sc }))) + 30 * sc / 2;
    this.f.rects = [];
    this.items.forEach((it, i) => {
      const yy = y + i * (h + gap), on = i === this.f.i, X = Math.round(x - w / 2);
      this.f.rects[i] = [X, yy, w, h];
      if (on) { const t = (TT.game ? TT.game.real : 0) * 6; UI.panel(g, X - 2, yy - 2, w + 4, h + 4, { bg: ['#3a2a10', '#241808'], border: '#f0c040', focus: true }); UI.txt(g, '▸', X + 6, yy + (h - 7 * sc) / 2 + Math.sin(t) * .8, '#ffe060', { scale: sc }); }
      else UI.panel(g, X, yy, w, h, { bg: ['#1a2032', '#10141e'], border: '#3a4660', alpha: .85 });
      UI.txt(g, it.label, x, yy + (h - 7 * sc) / 2, it.disabled ? '#6a7088' : on ? '#fff4c0' : '#d8dcec', { align: 'center', scale: sc });
    });
    const it = this.items[this.f.i];
    if (it && it.desc && o.desc !== false) UI.txt(g, it.desc, x, o.descY !== undefined ? o.descY : y + this.items.length * (h + gap) + 6, '#c8d0e8', { align: 'center' });
    return y + this.items.length * (h + gap);
  }
}
UI.BigMenu = BigMenu;
/** the device-following hint line at a screen's foot: '{b:confirm} SELECT  {b:cancel} BACK' */
UI.hints = (g, r, s, I, o = {}) => UI.prompt(g, s, r.W / 2, r.H - (o.y || 16), I, Object.assign({ align: 'center', bg: 'rgba(0,0,0,.45)' }, o));
/** a team's crest as a small shield (art from the stadium's crest table) */
UI.crest = (g, teamId, x, y, s = 1) => {
  const tm = TT.TEAMS[teamId], art = TT.crestArt[tm.crest.art], X = Math.round(x), Y = Math.round(y), W = 14 * s, H = 16 * s;
  px.rect(g, X, Y, W, H - 3 * s, '#101014'); px.poly(g, [[X, Y + H - 4 * s], [X + W, Y + H - 4 * s], [X + W / 2, Y + H]], '#101014');
  px.rect(g, X + s, Y + s, W - 2 * s, H - 5 * s, tm.crest.bg); px.poly(g, [[X + s, Y + H - 4 * s], [X + W - s, Y + H - 4 * s], [X + W / 2, Y + H - s]], tm.crest.bg);
  for (let v = 0; v < 10; v++) for (let u = 0; u < 12; u++) { const ch = art[v][u]; if (ch === '.') continue; px.rect(g, X + s + u * s, Y + 2 * s + v * s, s, s, ch === '#' ? tm.crest.fg : '#f0f0f0'); }
};
/** a bar with a label (team cards' SPEED, POWER, SKILL; the dev sliders) */
UI.bar = (g, x, y, w, h, v, col, o = {}) => { px.rect(g, x, y, w, h, '#0c0e14'); px.rect(g, x + 1, y + 1, Math.round((w - 2) * clamp(v, 0, 1)), h - 2, col); if (o.mark !== undefined) px.rect(g, x + 1 + Math.round((w - 2) * o.mark), y - 1, 1, h + 2, '#ffffff'); };
/** any input at all this step (for the attract mode and the idle clock): a key, a button, the mouse moved, a stick */
UI.anyInput = (game, o = {}) => {
  for (const q of game.players) if (q.anyPressed() || (q.clicked && q.clicked())) return true;
  const I = game.input, pt = I.pointer && I.pointer();
  if (pt) { if (UI._lastPt && Math.abs(pt[0] - UI._lastPt[0]) + Math.abs(pt[1] - UI._lastPt[1]) > (o.px || 8)) { UI._lastPt = pt; return true; } if (!UI._lastPt) UI._lastPt = pt; }
  const m = I.move(); if (Math.hypot(m[0], m[1]) > .5) return true;
  return false;
};


/* ==== 41-scenes-front.js ==== */
/* ---- THE FRONT: a live CPU match behind the menus (the real presentation), the title, the main menu, records, about,
 * the idle clock that starts the attract mode after 10 s ---- */
const BG = TT.BG = {
  m: null, pres: null, venue: null, t: 0,
  ensure(venue = 'muddington', home = 'mud', away = 'bad', time = 'night') {
    if (this.m && this.venue === venue + time) return;
    this.venue = venue + time;
    this.m = new TT.Match({ home, away, venue, time, seed: 4242 + venue.length, noClock: true, skipIntro: true, noPowerups: true, noHazard: true, halfLen: 9999, attract: false });
    this.m.goPhase('kickoff');
    this.pres = new TT.Pres(this.m);
    TT.cheatsSaved = null;
  },
  update(dt) {
    const m = this.m; if (!m) return;
    TT.bus.muted = true;
    try { m.step(dt); } finally { TT.bus.muted = false; }
    if (m.over || m.t > 400) { this.venue = null; this.ensure(); }
    this.pres.update(dt, m);
    const c = m.carrier(), b = m.ball;
    this.t += dt;
    TT.game.focus(lerp(c ? c.x : b.x, G.CX, .3) + Math.sin(this.t * .1) * 60, lerp(c ? c.y : b.y, G.CY, .5), 10);
  },
  draw(r, dim = .45) {
    if (!this.m) return;
    this.pres.draw(r, this.m, { refCone: false, seatColor: () => '#ffe060' });
    r.overlay(g => { g.fillStyle = 'rgba(4,6,14,' + dim + ')'; g.fillRect(0, 0, r.W + 4, r.H + 4); px.reset && px.reset(g); });
  }
};
// the simulation's events are quiet while the backdrop match plays (no commentary, no sounds)
{ const emit = TT.bus.emit.bind(TT.bus); TT.bus.emit = function (name, data) { if (this.muted) return; emit(name, data); }; }
/** the idle clock on the title and the menus: 10 s without any input starts the attract mode */
const Idle = TT.Idle = {
  t: 0,
  update(dt) {
    const game = TT.game;
    if (UI.anyInput(game)) this.t = 0; else this.t += dt;
    if (game.paused || game._menuOpen) this.t = 0;
    if (this.t >= 10 && !SESSION) { this.t = 0; TT.Attract.begin(); return true; }
    return false;
  }
};
const FRONT = { view: 'broadcast', views: ['broadcast'], input: KEYS, res: 'ps1', expand: true, touch: [], pausable: false, camera: false };
TT.scenes.title = Object.assign({}, FRONT, {
  enter() { BG.ensure(); TT.sound.music('title'); Idle.t = 0; this.t = 0; TT.game.lights.enabled = true; TT.game.setView('broadcast'); this.btn = null; },
  update(dt) {
    this.t += dt; BG.update(dt);
    if (Idle.update(dt)) return;
    const game = TT.game, ck = game.input.clicked();
    if (TT.touchOnly) { if (ck && this.btn && UI.inRect(ck, this.btn)) game.menu('settings'); return; }
    if (this.t > .4 && (game.players.some(q => q.pressed('start') || q.pressed('confirm') || q.pressed('x')) || ck)) { game.input.consumeAll(); TT.sound.ui('pick'); game.go('menu'); }
  },
  draw(r) {
    BG.draw(r, .35);
    r.overlay(g => {
      const cx = r.W / 2, y = Math.round(r.H * .14), bob = Math.sin(this.t * 2) * 2;
      FONT.title(g, 'THUGBY', cx, y + bob, { align: 'center', scale: 6, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 4, depthColor: '#5a1a0a' });
      FONT.title(g, 'TURBO', cx + 30, y + 46 - bob, { align: 'center', scale: 4, colors: ['#ffffff', '#80e0ff', '#3a86e8', '#1a3a8a'], depth: 3, depthColor: '#0a1440' });
      UI.txt(g, 'BIG HITS, BIGGER HAIR, SEVEN A SIDE', cx, y + 82, '#ffe7a8', { align: 'center' });
      if (TT.touchOnly) {
        if (UI.w('CONTROLLER OR KEYBOARD REQUIRED', { scale: 2 }) > r.W - 12) { UI.txt(g, 'CONTROLLER OR KEYBOARD', cx, r.H * .62 - 20, '#ffffff', { align: 'center', scale: 2 }); UI.txt(g, 'REQUIRED', cx, r.H * .62 - 2, '#ffffff', { align: 'center', scale: 2 }); }
        else UI.txt(g, 'CONTROLLER OR KEYBOARD REQUIRED', cx, r.H * .62, '#ffffff', { align: 'center', scale: 2 });
        UI.txt(g, 'Connect a controller or a keyboard to play.', cx, r.H * .62 + 22, '#c8d0e8', { align: 'center' });
        const w = 120, h = 30; this.btn = [cx - w / 2, r.H * .62 + 40, w, h];
        UI.panel(g, this.btn[0], this.btn[1], w, h, { focus: true }); UI.txt(g, 'SETTINGS', cx, this.btn[1] + 8, '#ffe060', { align: 'center', scale: 2 });
      } else if (Math.floor(this.t * 1.6) % 2 === 0) UI.prompt(g, '{b:start}  PRESS START', cx, r.H * .7, TT.game.input, { align: 'center', scale: 2 });
      UI.txt(g, 'CHANNEL THUD PRESENTS  -  AN ORIGINAL GAME INSPIRED BY RUGBY', cx, r.H - 26, '#a8b0c8', { align: 'center', font: 'tiny' });
      UI.txt(g, E.versionLabel ? 'my-3D2dge ' + E.versionLabel().split(' ')[0] : '', 6, r.H - 12, '#6a7088', { font: 'tiny' });
    });
  }
});
TT.scenes.menu = Object.assign({}, FRONT, {
  enter() {
    BG.ensure(); TT.sound.music('title'); Idle.t = 0; TT.game.setView('broadcast');
    const save = TT.Cup.saved();
    this.menu = new UI.BigMenu([
      save ? { label: 'CONTINUE CUP', desc: 'Back to the Mega Cup: ' + TT.CUP[Math.min(3, save.round)].round, fn: () => TT.Cup.continue() } : null,
      { label: save ? 'NEW MEGA CUP' : 'MEGA CUP', desc: 'The story: a pub team against the world. Training plus four matches.', fn: () => TT.Cup.start() },
      { label: 'EXHIBITION', desc: 'Any two teams, any stadium, 1 to 4 players: versus or co-op.', fn: () => TT.game.go('join', { mode: 'exhibition' }) },
      { label: 'TRAINING GROUND', desc: 'Coach Gristle\'s nine drills. Every move in the game, one at a time.', fn: () => TT.game.go('training') },
      { label: 'RECORDS', desc: 'Biggest wins, most tries, biggest hits.', fn: () => TT.game.go('records') },
      { label: 'SETTINGS', desc: 'Display, sound, comfort, game options, controls.', fn: () => TT.game.menu('settings') },
      { label: 'ABOUT & CREDITS', desc: 'Who made this, how, and what it\'s about.', fn: () => TT.game.go('about') }
    ].filter(Boolean), { onBack: () => TT.game.go('title') });
  },
  update(dt) { BG.update(dt); if (Idle.update(dt)) return; if (TT.game.paused) return; this.menu.update(TT.game.input, TT.game); },
  draw(r) {
    BG.draw(r, .55);
    r.overlay(g => {
      FONT.title(g, 'THUGBY TURBO', r.W / 2, 14, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      this.menu.draw(g, r.W / 2, 56, { scale: 2, w: 220, descY: 43 });
      UI.hints(g, r, '{b:confirm} SELECT   {b:cancel} BACK', TT.game.input);
    });
  }
});
TT.scenes.records = Object.assign({}, FRONT, {
  enter() { BG.ensure(); this.page = 0; Idle.t = 0; },
  update(dt) {
    BG.update(dt); if (Idle.update(dt)) return;
    const I = TT.game.input, ck = I.clicked();
    if (I.pressed('right') || I.pressed('r1')) { this.page = (this.page + 1) % 3; TT.sound.ui('move'); }
    if (I.pressed('left') || I.pressed('l1')) { this.page = (this.page + 2) % 3; TT.sound.ui('move'); }
    if (ck) this.page = (this.page + (ck[0] > TT.game.W / 2 ? 1 : 2)) % 3;
    if (I.pressed('cancel') || I.pressed('confirm')) TT.game.go('menu');
  },
  draw(r) {
    BG.draw(r, .6);
    const mode = ['margin', 'tries', 'hit'][this.page];
    TT.arcade.drawTable(r, mode, 26, TT.RECORD_TITLES[mode]);
    r.overlay(g => { UI.txt(g, (this.page + 1) + ' / 3', r.W / 2, r.H - 32, '#a8b0c8', { align: 'center' }); UI.hints(g, r, '{b:l1}{b:r1} PAGE   {b:cancel} BACK', TT.game.input); });
  }
});
TT.scenes.about = Object.assign({}, FRONT, {
  enter() { BG.ensure(); this.page = 0; this.scroll = 0; Idle.t = 0; },
  update(dt) {
    BG.update(dt); if (Idle.update(dt)) return;
    const I = TT.game.input, n = TT.ABOUT.length, ck = I.clicked();
    if (I.pressed('right') || I.pressed('r1')) { this.page = (this.page + 1) % n; this.scroll = 0; TT.sound.ui('move'); }
    if (I.pressed('left') || I.pressed('l1')) { this.page = (this.page + n - 1) % n; this.scroll = 0; TT.sound.ui('move'); }
    if (I.repeat('down', .25, .06)) this.scroll += 1; if (I.repeat('up', .25, .06)) this.scroll = Math.max(0, this.scroll - 1);
    if (ck) { this.page = (this.page + (ck[0] > TT.game.W / 2 ? 1 : n - 1)) % n; this.scroll = 0; }
    if (I.pressed('cancel') || I.pressed('confirm')) TT.game.go('menu');
  },
  draw(r) {
    BG.draw(r, .75);
    r.overlay(g => {
      const P = TT.ABOUT[this.page], w = Math.min(r.W - 24, 520), x = r.W / 2 - w / 2;
      UI.txt(g, (this.page + 1) + ' / ' + TT.ABOUT.length, 8, 8, '#a8b0c8');
      FONT.title(g, P.title, r.W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
      const lines = [];
      for (const [h, t] of P.rows) { if (h) lines.push(['h', h]); for (const l of FONT.wrap(t, w - 8)) lines.push(['t', l]); lines.push(['s', '']); }
      const lh = 9, top = 32, vis = Math.floor((r.H - top - 30) / lh);
      this.scroll = Math.min(this.scroll, Math.max(0, lines.length - vis));
      lines.slice(this.scroll, this.scroll + vis).forEach(([k, l], i) => UI.txt(g, l, k === 'h' ? x : x + 6, top + i * lh, k === 'h' ? '#ffe060' : '#e8ecf8'));
      if (lines.length > vis) UI.txt(g, '▸ MORE', r.W - 14, r.H - 32, '#a8b0c8', { align: 'right' });
      UI.hints(g, r, '{b:l1}{b:r1} PAGE   {b:stick} SCROLL   {b:cancel} BACK', TT.game.input);
    });
  }
});


/* ==== 42-scenes-modes.js ==== */
/* ---- THE MODES: the Mega Cup (its hub, saves, CONTINUE), story scenes, joining, Exhibition setup, results, the
 * Training Ground's list, the credits ---- */
const Cup = TT.Cup = {
  s: null,
  fresh() { return { round: 0, results: [null, null, null, null], trained: false, losses: 0, seed: TT.newSeed() & 0xffff }; },
  saved() { if (SESSION) return null; try { const s = TT.game.saves.get('auto'); return s && s.data && s.place === 'MEGA CUP' && s.data.round < 4 ? s.data : null; } catch (e) { return null; } },
  save() { if (SESSION || TT.noStore) return; try { TT.game.saves.save('auto', { data: this.s, place: 'MEGA CUP', level: this.s.round + 1 }); } catch (e) { TT.game.fail('cup save', e); } },
  start() { this.s = this.fresh(); this.save(); TT.game.go('story', { node: 'prologue', after: 'prologue' }); },
  continue() { const d = this.saved(); this.s = d ? Object.assign(this.fresh(), d) : this.fresh(); TT.game.go('cup'); },
  playNext() { const R = TT.CUP[this.s.round]; TT.game.go('story', { node: R.pre, after: 'join', home: 'mud', away: R.opp, venue: R.venue }); },
  matchData(seats) { const R = TT.CUP[this.s.round]; return { home: 'mud', away: R.opp, venue: R.venue, cup: this.s.round, seed: TT.seedNext || (this.s.seed * 31 + this.s.round * 7 + this.s.losses), seats }; },
  /** a cup match is over: a win moves the cup on (saved); a loss offers CONTINUE */
  matchDone(res) {
    if (!this.s) this.s = this.fresh();
    if (res.winner === 0) { this.s.results[this.s.round] = res.score.slice(); this.s.round++; this.save(); if (this.s.round >= 4) { TT.unlock('cup'); TT.unlock('meg'); } return true; }
    this.s.losses++; this.save(); return false;
  },
  state() { return this.s ? { round: this.s.round, results: this.s.results.slice(), trained: this.s.trained } : null; }
};
TT.scenes.cup = Object.assign({}, FRONT, {
  enter() {
    if (!Cup.s) Cup.s = Cup.saved() || Cup.fresh();
    BG.ensure(); TT.sound.music('title'); Idle.t = 0; this.sheet = false; this.sel = 0;
    const done = Cup.s.round >= 4;
    this.menu = new UI.BigMenu([
      { label: done ? 'CUP WON!' : 'PLAY ' + TT.CUP[Cup.s.round].round, desc: done ? 'The Mega Cup is in the Muddy Duck\'s trophy cabinet.' : 'Against the ' + TT.TEAMS[TT.CUP[Cup.s.round].opp].name + ' at ' + TT.VENUES[TT.CUP[Cup.s.round].venue].name + '.', disabled: done, fn: () => Cup.playNext() },
      { label: 'TRAINING', desc: 'Coach Gristle\'s drills.', fn: () => TT.game.go('training', { cup: true }) },
      { label: 'TEAM SHEET', desc: 'The Mudlarks: seven people and a dream.', fn: () => { this.sheet = true; this.sel = 0; } },
      { label: 'BACK', desc: 'To the main menu. The cup is saved.', fn: () => TT.game.go('menu') }
    ], { onBack: () => TT.game.go('menu') });
    this.rigs = TT.TEAMS.mud.roster.map(d => TT.makeRig(d, TT.TEAMS.mud.home));
  },
  update(dt) {
    BG.update(dt); if (TT.game.paused) return;
    for (const rg of this.rigs) rg.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2 });
    const I = TT.game.input;
    if (this.sheet) {
      if (I.repeat('right', .3, .1)) this.sel = (this.sel + 1) % 7; if (I.repeat('left', .3, .1)) this.sel = (this.sel + 6) % 7;
      const ck = I.clicked(); if (ck && this.sheetRects) this.sheetRects.forEach((rc, i) => { if (UI.inRect(ck, rc)) this.sel = i; });
      const pt = I.pointer(); if (pt && this.sheetRects) this.sheetRects.forEach((rc, i) => { if (UI.inRect(pt, rc)) this.sel = i; });
      if (I.pressed('cancel')) { this.sheet = false; I.consumeAll(); }
      return;
    }
    this.menu.update(I, TT.game);
  },
  draw(r) {
    BG.draw(r, .6);
    r.overlay(g => {
      FONT.title(g, 'THE MEGA CUP', r.W / 2, 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#e0662a'], depth: 2 });
      if (this.sheet) return this.drawSheet(g, r);
      // the bracket: four big cards
      const w = Math.min(96, (r.W - 40) / 4), gap = 6, x0 = r.W / 2 - (4 * w + 3 * gap) / 2, y = 40;
      TT.CUP.forEach((R, i) => {
        const x = x0 + i * (w + gap), res = Cup.s.results[i], next = i === Cup.s.round, locked = i > Cup.s.round;
        UI.panel(g, x, y, w, 74, { focus: next, alpha: locked ? .6 : .92 });
        UI.txt(g, R.round, x + w / 2, y + 4, next ? '#ffe060' : '#c8d0e8', { align: 'center', font: 'tiny' });
        if (!locked) UI.crest(g, R.opp, x + w / 2 - 7, y + 14, 1); else UI.txt(g, '?', x + w / 2, y + 18, '#5a6078', { align: 'center', scale: 2 });
        UI.txt(g, locked ? '???' : TT.TEAMS[R.opp].short, x + w / 2, y + 34, '#ffffff', { align: 'center' });
        UI.txt(g, locked ? '' : TT.VENUES[R.venue].short.toUpperCase(), x + w / 2, y + 45, '#a8b0c8', { align: 'center', font: 'tiny' });
        UI.txt(g, res ? 'WON ' + res[0] + '-' + res[1] : next ? 'NEXT' : 'LOCKED', x + w / 2, y + 58, res ? '#80ff90' : next ? '#ffe060' : '#5a6078', { align: 'center' });
      });
      this.menu.draw(g, r.W / 2, 124, { scale: 2, w: 220 });
      UI.hints(g, r, '{b:confirm} SELECT   {b:cancel} BACK', TT.game.input);
    });
  },
  drawSheet(g, r) {
    const tm = TT.TEAMS.mud, w = Math.min(58, (r.W - 20) / 7 - 4), x0 = r.W / 2 - (7 * (w + 4)) / 2;
    this.sheetRects = [];
    tm.roster.forEach((d, i) => {
      const x = x0 + i * (w + 4), y = 40, on = i === this.sel;
      this.sheetRects.push([x, y, w, 70]);
      UI.panel(g, x, y, w, 70, { focus: on });
      if (TT.cfg.present) this.rigs[i].drawPortrait(g, x + w / 2 - 18, y + 4, 36, { zoom: 2.4, turn: .3, bg: '#203050' });
      UI.txt(g, d.nick.toUpperCase().slice(0, 9), x + w / 2, y + 44, on ? '#ffe060' : '#ffffff', { align: 'center', font: 'tiny' });
      UI.txt(g, TT.ROLE_NAME[d.role], x + w / 2, y + 54, '#a8b0c8', { align: 'center', font: 'tiny' });
    });
    const d = tm.roster[this.sel], y = 120;
    UI.panel(g, r.W / 2 - 150, y, 300, 86);
    UI.txt(g, d.name.toUpperCase() + '  "' + d.nick.toUpperCase() + '"', r.W / 2, y + 6, '#ffe060', { align: 'center' });
    [['SPEED', d.spd], ['POWER', d.pow], ['HANDS', d.hnd], ['KICKING', d.kck], ['TACKLING', d.tkl]].forEach(([k, v], i) => { UI.txt(g, k, r.W / 2 - 130, y + 22 + i * 12, '#c8d0e8'); UI.bar(g, r.W / 2 - 50, y + 22 + i * 12, 170, 8, v / 10, ['#40d0ff', '#ff8040', '#80ff90', '#ffe060', '#e060ff'][i]); });
    UI.hints(g, r, '{b:left}{b:right} PLAYER   {b:cancel} BACK', TT.game.input);
  }
});
/* ---- story scenes: one E.Story node on a staged set, portraits and babble; △ skips ---- */
const SETS = {};
TT.storySet = kind => {
  if (SETS[kind]) return SETS[kind];
  let rows, types, floorTex, legend;
  if (kind === 'pub' || kind === 'tunnel') {
    const W = 24, H = 14; rows = [];
    for (let r = 0; r < H; r++) { let s = ''; for (let c = 0; c < W; c++) s += r === 0 || c === 0 || c === W - 1 ? '#' : r === H - 1 ? 'f' : r === 1 && kind === 'pub' && c > 2 && c < 12 ? 'b' : '.'; rows.push(s); }
    legend = { '#': 1, b: 2, f: 3, '.': { floor: 'f' } };
    types = kind === 'pub' ? { 1: { h: 40, face: 'plaster', beam: '#5a3a22', side: '#d8c098', top: '#6a4a30' }, 2: { h: 16, face: 'plank', side: '#7a4a28', top: '#9a6a3a' }, 3: { h: 6, cut: true, cutH: 3, face: 'plank', side: '#5a3a22', top: '#7a5434' } } : { 1: { h: 56, face: 'stone', side: '#3a3a44', top: '#2a2a30' }, 2: { h: 10, side: '#2a2a30', top: '#3a3a44' }, 3: { h: 4, cut: true, cutH: 2, side: '#2a2a30', top: '#3a3a44' } };
    // dark varnished floorboards running across the room, seams between them, knots here and there
    floorTex = kind === 'pub' ? (x, y) => { const row = Math.floor(y / 7), off = (row * 37) % 50, seam = (y % 7) < 1 || ((x + off) % 50) < 1, n = E.hash2(Math.floor(x / 3), row) * 18 + E.hash2(Math.floor(x), Math.floor(y)) * 8, k = row % 3 === 0 ? 10 : row % 3 === 1 ? 0 : -8; return seam ? [42, 26, 16] : [104 + k + n, 66 + k * .6 + n * .7, 38 + n * .4]; } : (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) * 20; return [40 + n, 40 + n, 46 + n]; };
  }
  SETS[kind] = rows ? new E.TileMap({ rows, legend, types, floorTex, outside: '#0a0806', ao: 5 }) : null;
  return SETS[kind];
};
TT.scenes.story = {
  view: 'threequarter', views: ['threequarter'], input: KEYS, res: 'ps1', expand: true, touch: [], pausable: false, camera: false,
  enter(data) {
    const game = TT.game; this.data = data; this.t = 0; this.done = false;
    const node = TT.STORY[data.node]; this.node = node; (TT.storySeen || (TT.storySeen = {}))[data.node] = true;
    const set = node.set || 'pitch'; this.set = set;
    this.people = {}; this.actors = [];
    const castRig = id => { const c = TT.CAST[id]; return TT.makeRig(c, c.colors, { hat: c.hat || null, outfit: c.outfit || 'shirt' }); };
    const venue = data.venue || (data.node === 'victory' ? 'megadome' : 'muddington');
    this.stadium = set === 'pitch' || set === 'podium' ? Stadium.get(venue, 'mud') : null;
    const place = (who, x, y, f) => {
      const sp = TT.SPEAKERS[who] || who; let rig, name;
      if (Array.isArray(sp)) { const tm = TT.TEAMS[sp[0]], d = tm.roster[sp[1]]; rig = TT.makeRig(d, tm.home); name = d.nick.toUpperCase(); }
      else if (sp === 'choir') { rig = null; name = 'EVERYONE'; }
      else { rig = castRig(sp); name = TT.CAST[sp].name; }
      const a = { who, rig, x, y, z: 0, f, h: 40 };
      if (rig) this.actors.push(a);
      this.people[who] = { name, portrait: rig || ((g, x0, y0, s) => { px.rect(g, x0, y0, s, s, '#3a2a10'); FONT.text(g, '♪', x0 + s / 2, y0 + s / 2 - 4, '#ffe060', { align: 'center', scale: 2 }); }), at: a };
    };
    const indoor = set === 'pub' || set === 'tunnel', cx = indoor ? 192 : G.CX, cy = indoor ? 112 : G.Y0 + 70;
    const booth = new Set(['barry', 'ros', 'choir']);   // the commentators speak from the booth: portraits only
    const who = [...new Set(node.nodes.map(n => n.who))];
    if (set === 'pub' && node.party) for (const extra of ['dave', 'fridge', 'nan', 'gristle']) if (!who.includes(extra)) who.push(extra);
    const stage = who.filter(w => !booth.has(w));
    who.filter(w => booth.has(w)).forEach(w => place(w, -999, -999, 0));
    stage.forEach((w, i) => place(w, cx + (i - (stage.length - 1) / 2) * 36, cy + (i % 2) * 8, PI / 2));
    for (const w of booth) if (this.people[w]) this.actors = this.actors.filter(a => a.who !== w);
    // the extras: the Mudlarks round the pub's tables; both sides lined up on the pitch; the champions on the podium
    if (set === 'pub') { TT.TEAMS.mud.roster.slice(1).forEach((d, i) => { if (i < 6 && !stage.includes(['gravy', 'tiny', 'rocket', 'boots', 'bus', 'wheels'][i])) this.actors.push({ who: 'm' + i, rig: TT.makeRig(d, TT.TEAMS.mud.home), x: [70, 96, 280, 306, 150, 250][i], y: [150, 160, 150, 160, 176, 176][i], z: 0, f: [0, PI, 0, PI, -PI / 2, -PI / 2][i], extra: true, cheer: !!node.party }); }); this.tables = [[83, 154], [293, 154]]; }
    if (set === 'pitch') {
      const home = TT.TEAMS[data.home || 'mud'], away = TT.TEAMS[data.away || 'bad'];
      home.roster.forEach((d, i) => this.actors.push({ who: 'h' + i, rig: TT.makeRig(d, home.home), x: G.CX - 70 - i * 22, y: G.Y0 + 104 + (i % 2) * 6, z: 0, f: 0, extra: true }));
      away.roster.forEach((d, i) => this.actors.push({ who: 'a' + i, rig: TT.makeRig(d, away.away && TT.TEAMS[data.home || 'mud'].home.cloth === away.home.cloth ? away.away : away.home), x: G.CX + 70 + i * 22, y: G.Y0 + 104 + (i % 2) * 6, z: 0, f: PI, extra: true }));
    }
    if (set === 'podium') TT.TEAMS.mud.roster.forEach((d, i) => this.actors.push({ who: 'p' + i, rig: TT.makeRig(d, TT.TEAMS.mud.home), x: G.CX - 96 + i * 32, y: G.Y0 + 96, z: 0, f: PI / 2, extra: true, cheer: true }));
    this.cam = indoor ? { x: cx, y: set === 'pub' ? 86 : cy + 30 } : set === 'podium' ? { x: G.CX, y: G.Y0 + 80 } : { x: G.CX, y: cy + 10 };
    // the stadium's crowd, boards and posts behind a pitch-side scene: the match presentation's own painters
    if (this.stadium) { const P = this.dress = Object.create(TT.Pres.prototype); Object.assign(P, { stadium: this.stadium, t: 0, excite: .5, cheer: data.node === 'victory' ? 99 : 0, cheerTeam: 0, wave: -999, rigs: [], lastScorer: -1 }); const h = TT.TEAMS[data.home || 'mud'], a = TT.TEAMS[data.away || (set === 'podium' ? 'meg' : 'bad')]; this.dressV = { kits: [h.home, a.home], teams: [h, a], phase: 'intro', time: TT.VENUES[venue].time, score: [0, 0], players: [], hazards: [], powerups: [], dir: [1, -1] }; }
    game.setView(set === 'pub' || set === 'tunnel' ? 'threequarter' : 'broadcast');
    game.lights.enabled = true; game.lights.ambient = set === 'tunnel' ? .3 : set === 'pub' ? .55 : .8;
    TT.sound.music(node.music === 'victory' ? 'victory' : node.music || (set === 'pub' ? 'pub' : 'title'));
    this.story = new E.Story(game, { people: this.people, nodes: { main: node.nodes.map(n => Object.assign({}, n)) }, dialog: new E.Dialog(game, { lines: 3, voice: null, border: '#e8c040', bg: '#141420', speed: 40 }) });
    this.story.talk.onLetter = (ch, i, d) => { const id = Object.keys(this.people).find(k => this.people[k].name === d.name); TT.babble.story = true; TT.babble.letter(ch, TT.voiceFor(id || 'player'), i, d._page.join('')); TT.babble.story = false; };
    this.story.run('main', { onDone: () => this.finish() });
    if (data.node === 'victory' || node.party) for (let i = 0; i < 8; i++) game.after(i * .4, () => game.particles.bits(this.cam.x + (i - 4) * 30, this.cam.y, 80, 16, ['#ffe060', '#4aa0e0', '#ffffff', '#ff6a8a']));
  },
  finish() {
    if (this.done) return; this.done = true;
    const d = this.data, game = TT.game;
    if (d.after === 'prologue') { Cup.s.trained = !!this.story.get('train'); Cup.save(); return game.go(this.story.get('train') ? 'training' : 'cup', { cup: true }); }
    if (d.after === 'join') return game.go('join', { mode: 'cup' });
    if (d.after === 'cup') return game.go('cup');
    if (d.after === 'victory') return game.go('story', { node: 'third', after: 'credits' });
    if (d.after === 'credits') return game.go('credits');
    game.go('cup');
  },
  update(dt) {
    const game = TT.game; this.t += dt;
    for (const a of this.actors) {
      const speaking = this.story.talk.open && this.people[a.who] && this.story.talk.name === this.people[a.who].name;
      if (a.rig) a.rig.update(dt, { x: a.x, y: a.y, z: 0, facing: a.f, pose: a.cheer ? (Math.floor(this.t + a.x) % 3 === 0 ? 'cheer' : 'wave') : speaking ? 'hips' : null, expr: speaking && this.story.talk.typing ? 'shout' : a.cheer ? 'smile' : null, run: a.cheer ? .2 : 0 });
      if (a.blob) { a.x = 300 + Math.sin(this.t) * 40; a.blob.update(dt, { walk: 1, flap: .6, look: [Math.cos(this.t), 0] }); }
    }
    if (game.players.some(q => q.pressed('tri'))) { this.story.talk.close(); this.finish(); return; }
    this.story.update(dt);
    game.focus(this.cam.x, this.cam.y, 20);
  },
  draw(r) {
    const set = this.set, t = this.t;
    if (this.stadium) {
      if (this.dress) { this.dress.t += 1 / 60; this.dress.drawSky(r, this.dressV); } else r.sky(TT.VENUES[this.data.venue || 'muddington'].sky);
      this.stadium.map.drawFloor(r); this.stadium.map.queueWalls(r);
      if (this.dress) { this.dress.drawCrowd(r, this.dressV); this.dress.drawBoards(r, this.dressV); this.dress.drawPosts(r, this.dressV); this.dress.drawDressing(r, this.dressV); this.dress.lights(r, this.dressV); }
    } else {
      r.sky(set === 'tunnel' ? ['#040408', '#08080e', '#0e0e16'] : ['#1a120c', '#2a1a10', '#3a2414']);
      const map = TT.storySet(set); map.drawFloor(r); map.queueWalls(r);
      if (set === 'pub') {
        // the Muddy Duck: barrels behind the bar, the pie warmer glowing on it, lanterns, a dartboard, tables and stools
        for (const x of [40, 64, 210, 234]) r.prop('barrel', x, 26, 0, { size: 1.2 });
        r.prop('crate', 340, 40, 0, { size: 1.1 }); r.prop('crate', 352, 52, 0, { size: 1 });
        for (const x of [70, 192, 310]) r.prop('lantern', x, 18, 38, { light: true, anchor: 'top' });
        r.prop('banner', 150, 17, 34, { color: '#4aa0e0' }); r.prop('window', 270, 17, 26, { colors: ['#f0d080', '#80a0d0'] });
        r.queue(110, 24, 16, g => { const [x, y] = r.w(110, 24, 16), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 12, Y - 14, 24, 14, '#3a2a1a'); px.rect(g, X - 10, Y - 12, 20, 9, '#f0a040'); for (let i = 0; i < 3; i++) px.disc(g, X - 6 + i * 6, Y - 6, 2, '#b06a30'); FONT.text(g, 'PIES', X, Y - 21, '#ffe0a0', { align: 'center', font: 'tiny', outline: '#3a1a0a' }); }, { emissive: true });
        r.queue(50, 17, 30, g => { const [x, y] = r.w(50, 17, 30); px.disc(g, Math.round(x), Math.round(y), 6, '#1a1a1a'); px.disc(g, Math.round(x), Math.round(y), 4, '#c83a2a'); px.disc(g, Math.round(x), Math.round(y), 2, '#2a8a3a'); px.dot(g, Math.round(x), Math.round(y), '#f0f0f0'); });
        for (const [tx, ty] of this.tables || []) { r.queue(tx, ty + 7, 0, g => r.box(g, tx - 14, ty - 7, 0, tx + 14, ty + 7, 12, '#8a5a32', '#5a3a1e')); r.queue(tx, ty, 13, g => { const [x, y] = r.w(tx - 4, ty, 13); px.rect(g, Math.round(x), Math.round(y) - 5, 3, 5, '#f0d080'); px.rect(g, Math.round(x) + 6, Math.round(y) - 5, 3, 5, '#e0a040'); }, { bias: 1 }); }
        TT.game.lights.add(110, 30, 20, 60, .9, { color: '#ffb060' });
      }
      if (set === 'tunnel') TT.game.lights.add(this.cam.x + 40, this.cam.y, 40, 70, 1.4, { color: '#fff0c0' });
    }
    if (set === 'podium') {
      // the MEGA CUP: a gaudy golden cup twice a man's height
      r.queue(G.CX, G.Y0 + 110, 0, g => { const [x, y] = r.w(G.CX, G.Y0 + 110, 0), X = Math.round(x), Y = Math.round(y), sh = Math.sin(t * 3) > .7; px.rect(g, X - 12, Y - 10, 24, 10, '#5a2a8a'); px.rect(g, X - 4, Y - 40, 8, 30, '#c8a030'); px.poly(g, [[X - 20, Y - 80], [X + 20, Y - 80], [X + 10, Y - 40], [X - 10, Y - 40]], '#e8c040'); px.rect(g, X - 20, Y - 82, 40, 4, '#fff0a0'); px.rect(g, X - 28, Y - 74, 8, 3, '#e8c040'); px.rect(g, X + 20, Y - 74, 8, 3, '#e8c040'); if (sh) px.rect(g, X - 8, Y - 70, 2, 16, '#ffffff'); FONT.text(g, 'MEGA', X, Y - 66, '#5a2a8a', { align: 'center', font: 'tiny', outline: false }); }, { emissive: true });
      if (Math.floor(t * 3) % 2) TT.game.particles.bits(G.CX + (Math.sin(t * 7) * 150), G.Y0 + 60, 90, 2, ['#ffe060', '#4aa0e0', '#ff6a8a']);
      TT.game.lights.add(G.CX, G.Y0 + 100, 40, 160, 1.2, { color: '#fff0c0' });
    }
    const view = E.charView(r.view);
    for (const a of this.actors) {
      r.shadow(a.x, a.y, 6, .35);
      if (a.rig) r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, view));
      if (a.blob) r.actor(a.x, a.y, 0, (g, ox, oy) => { a.blob.draw(g, ox, oy, r.view); px.poly(g, [[ox - 2, oy - 28], [ox + 2, oy - 28], [ox, oy - 33]], '#e83a2a'); });
      if (a.who === 'unit' && this.story.talk.open) TT.game.lights.add(a.x, a.y, 30, 50, 1.5, { color: '#fff8d8' });
    }
    if (TT.game.lights.enabled && set !== 'tunnel') TT.game.lights.add(this.cam.x, this.cam.y, 40, 260, .6, { color: '#ffe8c0' });
    this.story.draw(r);
    r.overlay(g => UI.prompt(g, '{b:confirm} NEXT   {b:tri} SKIP SCENE', 8, 8, TT.game.input, { bg: 'rgba(0,0,0,.5)' }));
  }
};
/* ---- joining: Start on a pad (or 2 on the keyboard) joins; each seat picks HOME, AWAY or CPU; ✕ ready ---- */
TT.scenes.join = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data || {}; this.cup = this.data.mode === 'cup';
    BG.ensure(); Idle.t = 0;
    const game = TT.game;
    game.allowJoin({ max: 4, onJoin: (input, n) => { TT.applyGlyphs(); this.sides[n - 1] = this.cup ? 0 : (n % 2 === 0 ? 1 : 0); TT.sound.ui('pick'); } });
    this.sides = game.players.map((p, i) => this.cup ? 0 : i % 2);
    this.ready = game.players.map(() => false); this.t = 0;
  },
  exit() { TT.game.allowJoin(false); },
  update(dt) {
    BG.update(dt); const game = TT.game; this.t += dt;
    if (game.paused) return;
    game.players.forEach((q, i) => {
      if (this.sides[i] === undefined) this.sides[i] = this.cup ? 0 : i % 2;
      if (!this.cup) { if (q.pressed('left')) { this.sides[i] = Math.max(0, this.sides[i] === 2 ? 1 : this.sides[i] - 1); this.ready[i] = false; TT.sound.ui('move'); } if (q.pressed('right')) { this.sides[i] = Math.min(2, this.sides[i] + 1); this.ready[i] = false; TT.sound.ui('move'); } }
      if (q.pressed('confirm') || q.pressed('x')) { this.ready[i] = true; TT.sound.ui('pick'); }
      if (q.pressed('cancel') && i === 0 && this.t > .3) { game.go(this.cup ? 'cup' : 'menu'); }
    });
    if (this.sides.slice(0, game.players.length).every(s => s === 2) && game.players.length) this.sides[0] = 0;
    const ck = game.input.clicked();
    if (ck && this.go && UI.inRect(ck, this.go)) this.ready[0] = true;
    if (this.ready[0] && this.t > .3) this.start();
  },
  start() {
    const game = TT.game, seats = [];
    game.players.forEach((q, i) => { const sd = this.sides[i]; if (sd === 2) return; seats.push({ kind: 'local', input: q, team: sd, label: 'P' + (i + 1), color: E.PLAYER_COLORS[i] }); });
    if (!seats.length) seats.push({ kind: 'local', input: game.input, team: 0, label: 'P1', color: E.PLAYER_COLORS[0] });
    TT.joinedSeats = seats;
    if (this.cup) game.go('match', Cup.matchData(seats));
    else game.go('setup', { seats });
  },
  draw(r) {
    BG.draw(r, .6);
    r.overlay(g => {
      const game = TT.game, cx = r.W / 2;
      FONT.title(g, this.cup ? 'MUDLARKS: WHO\'S PLAYING?' : 'WHO\'S PLAYING?', cx, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
      UI.txt(g, 'PRESS START ON A CONTROLLER, OR 2 ON THE KEYBOARD, TO JOIN (UP TO 4)', cx, 34, '#c8d0e8', { align: 'center' });
      const cols = this.cup ? ['MUDLARKS'] : ['HOME', 'AWAY', 'CPU'], cw = 110, x0 = cx - (cols.length * cw) / 2;
      cols.forEach((c, k) => { UI.panel(g, x0 + k * cw + 4, 50, cw - 8, 20, { alpha: .8 }); UI.txt(g, c, x0 + k * cw + cw / 2, 56, '#ffe060', { align: 'center' }); });
      for (let i = 0; i < 4; i++) {
        const q = game.players[i], y = 78 + i * 26;
        if (!q) { UI.txt(g, 'P' + (i + 1) + '  ---  PRESS START', cx, y + 6, '#4a5068', { align: 'center' }); continue; }
        const sd = this.sides[i] || 0, x = x0 + sd * cw + 4, col = E.PLAYER_COLORS[i];
        UI.panel(g, x, y, cw - 8, 22, { border: col, focus: this.ready[i] });
        UI.txt(g, 'P' + (i + 1) + ' ' + (q.device === 'gamepad' || q.lastDevice === 'gamepad' ? 'PAD' : 'KEYS'), x + (cw - 8) / 2, y + 3, col, { align: 'center' });
        UI.txt(g, this.ready[i] ? 'READY!' : this.cup ? '' : '◂ ▸', x + (cw - 8) / 2, y + 12, this.ready[i] ? '#80ff90' : '#a8b0c8', { align: 'center', font: 'tiny' });
      }
      const gw = 120; this.go = [cx - gw / 2, r.H - 52, gw, 22];
      UI.panel(g, this.go[0], this.go[1], gw, 22, { focus: true }); UI.txt(g, 'PLAY', cx, this.go[1] + 4, '#ffe060', { align: 'center', scale: 2 });
      UI.hints(g, r, (this.cup ? '' : '{b:left}{b:right} SIDE   ') + '{b:confirm} READY (P1 STARTS)   {b:cancel} BACK', game.input);
    });
  }
});
/* ---- Exhibition setup: teams, venue, weather, time, halves, sudden death ---- */
TT.scenes.setup = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data; BG.ensure(); Idle.t = 0;
    const teams = TT.TEAM_ORDER.filter(id => id !== 'meg' || TT.unlocked('meg'));
    this.opts = [
      { key: 'home', label: 'HOME', list: teams, i: 0 },
      { key: 'away', label: 'AWAY', list: teams, i: 1 },
      { key: 'venue', label: 'VENUE', list: TT.VENUE_ORDER, i: 0 },
      { key: 'weather', label: 'WEATHER', list: Object.keys(TT.WEATHERS), i: 0 },
      { key: 'time', label: 'TIME', list: ['venue', 'day', 'dusk', 'night'], i: 0 },
      { key: 'halves', label: 'HALVES', list: ['2 min', '3 min', '4 min', '5 min'], i: Math.max(0, ['2 min', '3 min', '4 min', '5 min'].indexOf(TT.game.settings.halves)) },
      { key: 'sudden', label: 'SUDDEN DEATH', list: ['On', 'Off'], i: TT.game.settings.suddenDeath === 'Off' ? 1 : 0 },
      { key: 'play', label: 'PLAY!', list: [''], i: 0 }
    ];
    this.f = new UI.Focus(this.opts.length);
  },
  val(k) { const o = this.opts.find(q => q.key === k); return o.list[o.i]; },
  update(dt) {
    BG.update(dt); const game = TT.game, I = game.input; if (game.paused) return;
    const r = this.f.update(I, game), o = this.opts[this.f.i];
    let d = 0; for (const q of game.players) { if (q.repeat('left', .3, .1)) d = -1; if (q.repeat('right', .3, .1)) d = 1; }
    const ck = I.clicked(); if (ck && this.arrows) this.arrows.forEach(([rc, k, dd]) => { if (UI.inRect(ck, rc)) { this.f.i = k; d = dd; } });
    if (d && o.list.length > 1) { o.i = (o.i + d + o.list.length) % o.list.length; TT.sound.ui('move'); }
    if (r.picked && o.key === 'play') this.play();
    else if (r.picked) { o.i = (o.i + 1) % o.list.length; }
    if (r.back) game.go('join', { mode: 'exhibition' });
  },
  play() {
    const v = k => this.val(k), venue = v('venue'), game = TT.game;
    game.settings.set('halves', v('halves')); game.settings.set('suddenDeath', v('sudden'));
    game.go('match', { home: v('home'), away: v('away'), venue, weather: v('weather'), time: v('time') === 'venue' ? null : v('time'), seats: this.data.seats, exhibition: true, sudden: v('sudden') === 'On' });
  },
  draw(r) {
    BG.draw(r, .6);
    r.overlay(g => {
      const cx = r.W / 2;
      FONT.title(g, 'EXHIBITION', cx, 6, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      // the two team cards: crest, name, three bars
      for (const t of [0, 1]) {
        const id = this.val(t ? 'away' : 'home'), tm = TT.TEAMS[id], x = t ? cx + 6 : cx - 146, y = 34, on = this.f.i === t;
        UI.panel(g, x, y, 140, 62, { focus: on });
        UI.crest(g, id, x + 6, y + 6, 2);
        UI.txt(g, t ? 'AWAY' : 'HOME', x + 40, y + 4, '#a8b0c8', { font: 'tiny' });
        FONT.wrap(tm.name, 96).forEach((l, i) => UI.txt(g, l, x + 40, y + 12 + i * 9, on ? '#ffe060' : '#ffffff'));
        TT.teamBars(id).forEach((v, i) => { UI.txt(g, ['SPD', 'POW', 'SKL'][i], x + 40, y + 34 + i * 8, '#a8b0c8', { font: 'tiny' }); UI.bar(g, x + 58, y + 34 + i * 8, 76, 5, v, ['#40d0ff', '#ff8040', '#80ff90'][i]); });
        if (on) { UI.txt(g, '◂', x - 8, y + 26, '#ffe060'); UI.txt(g, '▸', x + 143, y + 26, '#ffe060'); }
      }
      this.f.rects = [[cx - 146, 34, 140, 62], [cx + 6, 34, 140, 62]];
      this.arrows = [];
      const rowY = 104, labels = { venue: k => TT.VENUES[k].name, weather: k => TT.WEATHERS[k].label, time: k => k === 'venue' ? 'VENUE DEFAULT' : TT.TIMES[k].label, halves: k => k.toUpperCase(), sudden: k => k.toUpperCase(), play: () => '' };
      this.opts.slice(2).forEach((o, k) => {
        const i = k + 2, y = rowY + k * 17, on = this.f.i === i, w = 260, x = cx - w / 2;
        this.f.rects[i] = [x, y, w, 15];
        UI.panel(g, x, y, w, 15, { focus: on, alpha: .85 });
        if (o.key === 'play') { UI.txt(g, 'PLAY!', cx, y + 4, on ? '#ffe060' : '#ffffff', { align: 'center' }); return; }
        UI.txt(g, o.label, x + 8, y + 4, '#a8b0c8');
        UI.txt(g, '◂ ' + labels[o.key](o.list[o.i]) + ' ▸', x + w - 8, y + 4, on ? '#ffe060' : '#ffffff', { align: 'right' });
        this.arrows.push([[x + w - 120, y, 20, 15], i, -1], [[x + w - 20, y, 20, 15], i, 1]);
      });
      UI.hints(g, r, '{b:up}{b:down} CHOOSE   {b:left}{b:right} CHANGE   {b:confirm} PLAY   {b:cancel} BACK', TT.game.input);
    });
  }
});
/* ---- results: the score with crests, the Player of the Match, four tiles, records (initials), CONTINUE ---- */
TT.scenes.results = Object.assign({}, FRONT, {
  enter(res) {
    this.res = res; this.t = 0; BG.ensure(res.venue, res.home, res.away, 'night');
    const human = res.humanTeam, won = res.winner === human;
    TT.sound.music(null); TT.sound.sting(won ? 'win' : res.winner < 0 ? 'lose' : 'lose');
    this.rig = TT.makeRig(TT.TEAMS[res.potm.team === 0 ? res.home : res.away].roster[res.potm.slot], TT.TEAMS[res.potm.team === 0 ? res.home : res.away].home);
    this.cupWon = res.cup !== undefined ? Cup.matchDone(res) : null;
    // records: any qualifying number opens the initials wheel (never in a demo)
    this.entries = [];
    if (!res.data.attract) for (const mode of ['margin', 'tries', 'hit']) { const v = mode === 'margin' ? (won ? res.records.margin : 0) : res.records[mode]; if (v > 0 && TT.arcade.qualifies(v, mode)) this.entries.push([mode, v]); }
    this.next();
  },
  next() {
    const e = this.entries.shift();
    if (e) TT.arcade.enter(e[1], e[0], () => this.next());
  },
  update(dt) {
    this.t += dt; BG.update(dt);
    this.rig.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, expr: 'smile' });
    TT.arcade.update(dt);
    if (TT.arcade.entry || TT.arcade.continuing) return;
    const game = TT.game;
    if (this.t > 1 && (game.players.some(q => q.pressed('confirm') || q.pressed('x') || q.pressed('start')) || game.input.clicked())) { game.input.consumeAll(); this.leave(); }
  },
  leave() {
    const res = this.res, game = TT.game;
    if (res.cup !== undefined) {
      if (this.cupWon) { const R = TT.CUP[res.cup]; return game.go('story', { node: R.won, after: res.cup === 3 ? 'victory' : 'cup', venue: R.venue }); }
      // a loss: Rule Six, then CONTINUE? (10 s)
      return game.go('story', { node: 'lost', after: 'continue' });
    }
    game.go('menu');
  },
  draw(r) {
    BG.draw(r, .65);
    const res = this.res;
    r.overlay(g => {
      const cx = r.W / 2, w = res.winner;
      const head = w < 0 ? 'A DRAW!' : TT.TEAMS[w === 0 ? res.home : res.away].short + ' WIN!';
      FONT.title(g, head, cx, 8, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      UI.crest(g, res.home, cx - 110, 40, 2); UI.crest(g, res.away, cx + 82, 40, 2);
      UI.txt(g, res.score[0] + '  -  ' + res.score[1], cx, 48, '#ffffff', { align: 'center', scale: 3 });
      UI.txt(g, TT.TEAMS[res.home].short, cx - 96, 76, '#c8d0e8', { align: 'center' }); UI.txt(g, TT.TEAMS[res.away].short, cx + 96, 76, '#c8d0e8', { align: 'center' });
      // the player of the match
      UI.panel(g, cx - 120, 88, 240, 44);
      if (TT.cfg.present) this.rig.drawPortrait(g, cx - 116, 92, 36, { zoom: 2.4, turn: .35, bg: '#203050' });
      UI.txt(g, 'PLAYER OF THE MATCH', cx - 74, 92, '#ffe060');
      UI.txt(g, res.potm.nick.toUpperCase(), cx - 74, 102, '#ffffff');
      UI.txt(g, res.potm.line, cx - 74, 112, '#a8b0c8', { font: 'tiny' }); UI.txt(g, res.potm.line2, cx - 74, 120, '#a8b0c8', { font: 'tiny' });
      // four tiles
      const tw = Math.min(96, (r.W - 30) / 4);
      res.tiles.forEach(([k, v], i) => { const x = cx - 2 * (tw + 4) + i * (tw + 4); UI.panel(g, x, 140, tw, 36, { alpha: .9 }); UI.txt(g, k, x + tw / 2, 144, '#a8b0c8', { align: 'center', font: 'tiny' }); UI.txt(g, v, x + tw / 2, 156, '#ffffff', { align: 'center' }); });
      if (res.cup !== undefined && this.cupWon === false) UI.txt(g, 'NOT TODAY. THE CUP WAITS.', cx, 186, '#ff9080', { align: 'center' });
      if (!TT.arcade.entry) UI.hints(g, r, '{b:confirm} CONTINUE', TT.game.input);
    });
    TT.arcade.draw(r);
  }
});
/* the loss: Gristle's Rule Six, then CONTINUE? counts down; yes replays the round with a new seed, no is the cup hub */
const contScene = Object.assign({}, FRONT, {
  enter() { BG.ensure(); TT.arcade.continue(10, yes => { if (yes) { Cup.s.seed = TT.newSeed() & 0xffff; TT.game.go('match', Cup.matchData(TT.joinedSeats || [{ kind: 'local', input: TT.game.input, team: 0, label: 'P1', color: E.PLAYER_COLORS[0] }])); } else TT.game.go('cup'); }); },
  update(dt) { BG.update(dt); TT.arcade.update(dt); },
  draw(r) { BG.draw(r, .7); TT.arcade.draw(r); r.overlay(g => UI.hints(g, r, '{b:confirm} PLAY AGAIN', TT.game.input)); }
});
TT.scenes['continue'] = contScene;
{ const fin = TT.scenes.story.finish; TT.scenes.story.finish = function () { if (this.data && this.data.after === 'continue') { if (this.done) return; this.done = true; return TT.game.go('continue'); } return fin.call(this); }; }
/* ---- the Training Ground: nine drill cards with a tick when done ---- */
TT.scenes.training = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data || {}; BG.ensure('muddington', 'mud', 'bad', 'day'); Idle.t = 0; TT.sound.music('mud');
    this.f = new UI.Focus(TT.DRILLS.length + 1, { axis: 'h', cols: 3, i: this.data.i || 0 });
    this.coach = TT.makeRig(TT.CAST.gristle, TT.CAST.gristle.colors, { hat: TT.CAST.gristle.hat, outfit: 'coat' });
  },
  update(dt) {
    BG.update(dt); const game = TT.game; if (game.paused) return;
    this.coach.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2 });
    const r = this.f.update(game.input, game);
    if (r.picked) { if (this.f.i === TT.DRILLS.length) return this.back(); game.go('match', { home: 'mud', away: 'bad', venue: 'muddington', drill: TT.DRILLS[this.f.i].id, time: 'day', weather: 'clear', cupTraining: !!this.data.cup }); }
    if (r.back) this.back();
  },
  back() { TT.game.go(this.data.cup ? 'cup' : 'menu'); },
  draw(r) {
    BG.draw(r, .55);
    r.overlay(g => {
      const cx = r.W / 2, done = TT.store.get('thugby:drills', {}) || {};
      FONT.title(g, 'TRAINING GROUND', cx, 6, { align: 'center', scale: 3, colors: ['#ffffff', '#b0f0a0', '#3a8a3a'], depth: 2 });
      const w = Math.min(130, (r.W - 30) / 3), h = 40, x0 = cx - (3 * w + 8) / 2;
      this.f.rects = [];
      TT.DRILLS.forEach((d, i) => {
        const x = x0 + (i % 3) * (w + 4), y = 34 + Math.floor(i / 3) * (h + 4), on = this.f.i === i;
        this.f.rects[i] = [x, y, w, h];
        UI.panel(g, x, y, w, h, { focus: on });
        UI.txt(g, (i + 1) + '. ' + d.name, x + 6, y + 5, on ? '#ffe060' : '#ffffff');
        UI.txt(g, d.teach, x + 6, y + 18, '#a8b0c8', { font: 'tiny' });
        if (done[d.id]) UI.txt(g, '✓', x + w - 10, y + 5, '#80ff90', { scale: 2 });
      });
      const by = 34 + 3 * (h + 4), on = this.f.i === TT.DRILLS.length;
      this.f.rects[TT.DRILLS.length] = [cx - 60, by, 120, 18];
      UI.panel(g, cx - 60, by, 120, 18, { focus: on }); UI.txt(g, this.data.cup ? 'TO THE CUP' : 'BACK', cx, by + 5, on ? '#ffe060' : '#ffffff', { align: 'center' });
      const d = TT.DRILLS[this.f.i];
      if (d) { UI.panel(g, cx - 160, by + 24, 320, 34, { alpha: .9 }); if (TT.cfg.present) this.coach.drawPortrait(g, cx - 156, by + 26, 30, { zoom: 2.2, turn: .3, bg: '#3a2a1a' }); UI.prompt(g, d.coach, cx - 120, by + 28, TT.game.input, {}); UI.txt(g, 'GOAL: ' + d.goal, cx - 120, by + 44, '#ffe7a8', { font: 'tiny' }); }
      UI.hints(g, r, '{b:stick} CHOOSE   {b:confirm} PLAY   {b:cancel} BACK', TT.game.input);
    });
  }
});
/* ---- the credits roll over the third half, then the title ---- */
TT.scenes.credits = Object.assign({}, FRONT, {
  enter() { BG.ensure('muddington', 'mud', 'bad', 'night'); this.t = 0; TT.sound.music('third'); },
  update(dt) { this.t += dt; BG.update(dt); const game = TT.game; if ((this.t > 2 && game.players.some(q => q.pressed('confirm') || q.pressed('cancel') || q.pressed('start'))) || this.t > 40) game.go('title'); },
  draw(r) {
    BG.draw(r, .7);
    r.overlay(g => {
      let y = r.H - this.t * 18;
      for (const [h, t] of TT.CREDITS) { if (h) { UI.txt(g, h, r.W / 2, y, '#ffe060', { align: 'center' }); y += 10; } for (const l of FONT.wrap(t, r.W - 40)) { UI.txt(g, l, r.W / 2, y, '#ffffff', { align: 'center' }); y += 9; } y += 12; }
      UI.hints(g, r, '{b:confirm} SKIP', TT.game.input);
    });
  }
});


/* ==== 43-scene-match.js ==== */
/* ---- THE MATCH SCENE: live, a drill, the attract demo or an AI Hub session. data: { home, away, venue, weather, time,
 * halfLen, sudden, cup (round), drill (id), attract, session, seed, seats: [{ kind, input, team, label, color }] } ---- */
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
E.VIEWS.postsE = new E.View('postsE', 'Kicker', -90, 22, 1.25, 1);
E.VIEWS.postsW = new E.View('postsW', 'Kicker', 90, 22, 1.25, 1);
const VIEW_OF = { Broadcast: 'broadcast', High: 'threequarter', Overhead: 'topdown' };
const MS = TT.MS = { m: null, pres: null, hud: null, comm: null, rep: null, ctx: null, endT: 0, data: null };
TT.newSeed = () => (TT.game ? (TT.game.real * 1000 | 0) : 0) ^ ((Date.now ? Date.now() : 7) & 0xffffff) ^ 0x5eed;
const matchScene = {
  view: 'broadcast', views: ['broadcast', 'threequarter', 'topdown'], input: KEYS, res: 'ps1', expand: true, touch: [], pausable: true,
  camera: { zoom: [.7, 1.45], start: .9 },
  enter(data = {}) {
    const game = TT.game, st = game.settings;
    this.pausable = !data.session;
    data = MS.data = Object.assign({ home: 'mud', away: 'bad', venue: 'muddington', weather: 'venue', seed: TT.newSeed() }, data);
    const seats = data.seats || (data.attract ? [] : [{ kind: 'local', input: game.input, team: 0, label: 'P1', color: E.PLAYER_COLORS[0] }]);
    const halves = { '2 min': 120, '3 min': 180, '4 min': 240, '5 min': 300 }[st.halves] || 120;
    const diff = st.difficulty || 'Pro';
    const opp = data.away && TT.TEAMS[data.away] ? TT.TEAMS[data.away].diff : 'Pro';
    const cupDiff = data.cup !== undefined ? TT.diffStep(opp, TT.DIFF_ORDER.indexOf(diff) - 1) : diff;
    MS.m = new TT.Match({
      home: data.home, away: data.away, venue: data.venue, weather: data.weather, time: data.time, seed: data.seed,
      halfLen: data.halfLen || (data.attract ? 9999 : null) || (TUNE.v.halfLength !== 120 ? null : halves),
      sudden: data.sudden !== undefined ? data.sudden : st.suddenDeath === 'On', cup: data.cup !== undefined, attract: !!data.attract, session: !!data.session, drill: data.drill || null,
      // difficulty shapes the CPU opponents; a side with a human on it plays at the normal level
      diff: data.attract ? 'Pro' : cupDiff, homeDiff: data.homeDiff || (seats.some(s => s.team === 0) ? 'Pro' : undefined), awayDiff: data.awayDiff || (seats.some(s => s.team === 1) ? 'Pro' : undefined),
      seats, autoSwitch: st.autoSwitch, passAssist: st.passAssist === 'On', replays: st.replays,
      noClock: !!data.attract || !!data.drill, skipIntro: !!data.drill || !!data.skipIntro, noPowerups: !!data.noPowerups || !!data.drill, noHazard: !!data.noHazard || !!data.drill
    });
    if (data.drill) MS.m.noClock = true;
    const m = MS.m;
    MS.pres = new TT.Pres(m); MS.hud = new TT.Hud(this); MS.comm = new TT.Commentary(game, { seed: data.seed }); MS.rep = new TT.Replay(m);
    MS.ctx = { match: m, subs: [], seats: m.seats, pres: MS.pres, hoverId: -1, seatColor: i => (m.seats[i] && m.seats[i].color) || '#ffe060', I: game.input, aimSign: 1, attract: !!data.attract, session: data.session, large: st.uiScale === 'Large' };
    MS.ctx.pick = (x, y) => game.r && game.r.pick ? game.r.pick(x, y) : [];
    MS.endT = 0; MS.replayCool = -99; MS.wasView = null; MS.halfLine = null; MS.paused = false;
    TT.sound.hook(TT.bus, MS.ctx); MS.comm.hook(TT.bus, MS.ctx); MS.hud.listen(); this.fx(MS.ctx);
    if (!data.session && !data.attract) game.allowJoin(false);
    game.weather = m.weather ? Object.assign({}, m.weather) : null;
    game.setView(data.session ? 'broadcast' : VIEW_OF[st.camera] || 'broadcast');
    game.cam.bounds = null; game.follow(null); game.cam.smooth = .22;
    TT.sound.music(m.venue.music);
    if (data.drill && TT.Drills) TT.Drills.start(m, data.drill, data);
    if (data.attract && TT.Attract) TT.Attract.start(m, data);
    if (data.session && TT.Net) TT.Net.attach(m, data);
    if (data.cup !== undefined) { const node = TT.STORY[TT.CUP[data.cup].half]; MS.halfLine = node && node.nodes[0].say.replace(/\{[^}]*\}/g, ''); }
    TT.bus.emit('matchStart', { m, data });
  },
  exit() {
    const game = TT.game;
    if (MS.ctx) MS.ctx.subs.forEach(f => f());
    if (MS.hud) MS.hud.unlisten();
    game.weather = null; game.timeScale = 1;
    if (TT.Attract) TT.Attract.stop();
    if (TT.Drills) TT.Drills.stop();
    if (TT.dev) TT.dev.close(true);
    game.lights.enabled = false;
    MS.m = null; MS.pres = null;
  },
  /** effects on the match's events (dust, hits, confetti, fireworks, flames, lightning) */
  fx(ctx) {
    const game = TT.game, P = game.particles, on = (n, f) => ctx.subs.push(TT.bus.on(n, d => { if (ctx.match && !ctx.quiet) f(d, ctx.match); }));
    const session = !!MS.data.session, freeze = s => { if (!session && !game.reduceMotion) game.freeze(s); };
    const mudCol = ['#5a3a1e', '#7a5430', '#3a2a14'], grass = ['#4a8a3a', '#6aa04a', '#3a6a2a'];
    const at = (d, m) => d.id !== undefined ? m.players[d.id] : d;
    on('tackle', (d, m) => { const p = at(d, m); P.dust(p.x, p.y, 2, 6); P.bits(p.x, p.y, 4, 5, m.hazardKind === 'mud' ? mudCol : grass); TT.babble.grunt(p.d, 2); });
    on('diveTackle', (d, m) => { const p = at(d, m); P.dust(p.x, p.y, 2, 8); });
    on('bigHit', (d, m) => { const p = m.players[d.on]; game.hitFx(p.x, p.y, 18, { power: 1, sound: false, rumble: true }); freeze(.08); game.shake(4); P.dust(p.x, p.y, 2, 10); TT.babble.grunt(p.d, 3); });
    on('monsterHit', (d, m) => {
      const p = m.players[d.on]; freeze(.12); game.shake(6); game.flash('#ffffff', .1, .5); P.ring(p.x, p.y, 4, 40, '#fff0c0', .4); P.sparks(p.x, p.y, 18, 20); P.text(p.x, p.y, 40, 'WHUMP!', '#ffe060', { scale: 2, bounce: true }); P.dust(p.x, p.y, 2, 12);
      for (const q of game.players) q.rumble(.9, .35);
      TT.babble.grunt(p.d, 4);
      if (!session && !game.reduceMotion) { const z0 = game.zoom || 1; game.setZoom(z0 * 1.1); game.after(.25, () => game.setZoom(z0)); }
    });
    on('land', (d, m) => { const p = m.players[d.id]; P.dust(p.x, p.y, 2, 12); P.bits(p.x, p.y, 4, 8, m.hazardKind === 'mud' ? mudCol : grass); });
    on('try', (d, m) => {
      const p = m.players[d.id], k = m.kits[p.team]; MS.pres.lastScorer = d.id; MS.pres.cheer = 3; MS.pres.cheerTeam = p.team;
      for (let i = 0; i < 6; i++) P.bits(p.x + (i - 3) * 10, p.y, 30, 12, [k.cloth, k.trim, '#ffffff']);
      if (m.time !== 'day') for (let i = 0; i < 5; i++) game.after(i * .3, () => { const x = G.CX + (i - 2) * 160; P.explosion(x, G.Y0 - 20, 160 + i * 10, 1.2, { debris: false, freeze: false, shake: 0 }); TT.sound.play('firework'); });
      if (m.venue.id === 'megadome') game.flash('#a060ff', .15, .3);
    });
    on('convMade', (d, m) => { MS.pres.cheer = 1.5; MS.pres.cheerTeam = d.team; });
    on('dropGoal', (d, m) => { MS.pres.cheer = 2; MS.pres.cheerTeam = d.team; });
    on('kick', (d, m) => P.dust(d.x, d.y, 1, 4));
    on('bounce', (d, m) => { if (d.v > 60) P.dust(d.x, d.y, 1, 2); });
    on('superStart', (d, m) => { const p = m.players[d.id]; P.ring(p.x, p.y, 4, 30, '#ffe060', .4); P.glints(p.x, p.y, 20, 10, '#ffe060'); });
    on('powerupTake', (d, m) => { const p = m.players[d.id]; P.glints(p.x, p.y, 20, 12, '#fff0a0'); });
    on('toasted', (d, m) => { const p = m.players[d.id]; P.fire(p.x, p.y, 10, 10); P.smoke(p.x, p.y, 24, 8); });
    on('hazard', (d, m) => { if (d.kind === 'lightning') { game.flash('#ffffff', .12, .7); P.sparks(d.x, d.y, 4, 30); P.ring(d.x, d.y, 4, 36, '#c0e0ff', .35); game.shake(5); } if (d.kind === 'flames') P.fire(d.x, d.y, 4, 14, { size: 1.4 }); });
    on('chickenHit', (d, m) => { const p = m.players[d.id]; P.bits(p.x, p.y, 20, 10, ['#ffffff', '#f0f0e0', '#f0d040']); });
    on('card', () => { MS.pres.boo = 2; });
    on('refDown', (d, m) => P.dust(m.ref.x, m.ref.y, 2, 10));
    on('scrumEngage', (d, m) => { if (m.setp) { P.dust(m.setp.x, m.setp.y, 2, 14); game.shake(2); } });
    on('ruck', (d, m) => P.dust(d.x, d.y, 3, 10));
    on('fend', (d, m) => { const p = m.players[d.on]; P.impact(p.x, p.y, 20, .8, '#ffffff'); });
    on('doink', (d, m) => { const b = m.ball; P.sparks(b.x, b.y, b.z, 8); });
    on('mud', (d, m) => { const p = m.players[d.id]; P.bits(p.x, p.y, 4, 10, mudCol); });
    on('onFire', (d, m) => { const p = m.players[d.id]; P.fire(p.x, p.y, 10, 16); });
    on('sputter', (d, m) => { const p = m.players[d.id]; if (p.ctl >= 0) P.smoke(p.x, p.y, 6, 3, { size: .6 }); });
    on('fulltime', (d, m) => { if (d.winner >= 0) { MS.pres.cheer = 6; MS.pres.cheerTeam = d.winner; } });
  },
  update(dt) {
    const game = TT.game, m = MS.m; if (!m) return;
    const data = MS.data, ctx = MS.ctx;
    if (TT.dev && TT.dev.open) { TT.dev.update(dt); if (TT.dev.frozen) { this.present(0); return; } }
    if (game.input.pressed('dev') && TT.dev && TT.dev.enabled && !data.session) TT.dev.toggle();
    // the camera view: V or R3 cycles it
    if (!data.attract && game.players.some(q => q.pressed('view')) && m.phase !== 'setkick') { game.nextView(); game.note(game.view.label.toUpperCase()); }
    // an instant replay holds the match; any button skips it
    if (MS.rep.play) {
      if (game.players.some(q => q.pressed('x') || q.pressed('confirm') || q.pressed('ci') || q.pressed('start'))) { MS.rep.stop(); game.input.consumeAll(); }
      const V = MS.rep.play ? MS.rep.step(dt) : null;
      if (V) { MS.V = V; MS.pres.update(dt, V); MS.pres.camera(dt, V, game, { focus: MS.rep.focus() }); MS.hud.update(dt); MS.comm.update(dt); return; }
      game.setZoom(MS.zoom0 || 1); game.timeScale = 1;
    }
    // the seats' devices to intents
    ctx.aimSign = this.aimSign();
    for (const s of m.seats) if (s.kind === 'local') TT.readIntent(s, game, m, ctx);
    if (data.attract && TT.Attract) TT.Attract.update(dt);
    if (data.drill && TT.Drills) TT.Drills.update(dt);
    if (data.session && TT.Net) TT.Net.update(dt);
    const hold = data.session && SESSION && AIHub.time() < 0;
    if (!hold && !(data.session && TT.Net && !TT.Net.isHost())) {
      m.step(dt);
      MS.rep.record();
      this.replayCheck(m, data);
    }
    this.present(dt);
    if (m.over && !data.attract && !data.drill && !data.session) { MS.endT += dt; if (MS.endT > 4.5 || (MS.endT > 1.5 && game.players.some(q => q.pressed('confirm') || q.pressed('x')))) this.finish(); }
  },
  /** everything that follows the state: rigs, camera, HUD, commentary, the music's layers, the crowd */
  present(dt) {
    const game = TT.game, m = MS.m, V = TT.Net && TT.Net.mirror ? TT.Net.mirror : m;
    MS.V = V;
    if (TT.cfg.present || TT.forcePresent) MS.pres.update(dt, V);
    // set kicks are taken in the behind-the-kicker camera
    if (V.phase === 'setkick' && V.setp && V.setp.sub !== 'result') { const id = V.dir[V.setp.team] > 0 ? 'postsE' : 'postsW'; if (game.view.id !== id) { MS.wasView = MS.wasView || game.view.id; game.setView(id); } }
    else if (MS.wasView && V.phase !== 'setkick') { game.setView(MS.wasView); MS.wasView = null; }
    if (V.phase === 'setkick' && V.setp) { const tee = V.teePos(), line = V.oppLine(V.setp.team); game.focus(lerp(tee.x, line, .45), lerp(tee.y, G.CY, .45), 30); }
    else MS.pres.camera(dt, V, game);
    MS.hud.update(dt); MS.comm.update(dt);
    // the music's layers: the drums in an opponents' 22, the hype layer when a meter is full or someone is on fire
    const c = V.ball.st === 'held' ? V.players[V.ball.holder] : null;
    TT.sound.layer('drums', !!(c && V.adv1(c.team, c.x) > G.W / 2 - G.L22));
    TT.sound.layer('hype', V.hype[0] >= 100 || V.hype[1] >= 100 || V.players.some(p => p.fire > 0));
    TT.sound.crowd(dt, MS.pres.excite, !MS.data.session || true);
    if (V.phase === 'setkick' && V.setp && V.setp.sub !== 'flight' && V.setp.sub !== 'result') TT.sound.clap(dt, clamp(V.setp.clockT / 20, .25, 1) * .9);
  },
  aimSign() { const g = TT.game; if (!g.view || !g.view.p) return 1; const a = g.view.p(G.X1, G.CY), b = g.view.p(G.X1, G.CY + 10); return b[0] >= a[0] ? 1 : -1; },
  replayCheck(m, data) {
    const ask = m.replayAsk; if (!ask) return;
    if (data.session || TT.game.settings.replays === 'Off' || data.drill) { m.replayAsk = null; return; }
    if (m.t < ask.t + 1) return;   // a second more of the moment, then play it
    m.replayAsk = null;
    if (!ask.force && m.t - MS.replayCool < 30) return;
    if (TT.game.settings.replays === 'All tries' && ask.kind !== 'try' && !data.attract) return;
    MS.replayCool = m.t;
    if (MS.rep.start(ask)) { MS.zoom0 = TT.game.zoom || 1; TT.game.setZoom(MS.zoom0 * 1.35); }
  },
  finish() {
    const m = MS.m, data = MS.data;
    if (!m || this._finishing) return;
    const res = TT.summarize(m, data);
    TT.game.go('results', res);
  },
  draw(r) {
    const m = MS.m; if (!m || (MS.data.session && TT.Net && TT.Net.server)) return;
    const V = MS.V || m, ctx = MS.ctx, game = TT.game;
    ctx.myTeam = ctx.seats[0] ? ctx.seats[0].team : undefined; ctx.shared = ctx.seats.length > 1;
    ctx.replay = !!MS.rep.play; ctx.I = game.input; ctx.halfLine = MS.halfLine; ctx.dialogUp = MS.comm.talk.open;
    ctx.waiting = TT.Net && TT.Net.waiting && TT.Net.waiting(); ctx.drill = !!MS.data.drill;
    MS.pres.draw(r, V, { refCone: game.settings.refCone === 'On', seatColor: ctx.seatColor, seatLabel: i => ctx.seats[i] ? ctx.seats[i].label : '', myTeam: ctx.myTeam });
    MS.hud.draw(r, V, ctx);
    if (!ctx.replay) { const n = ctx.seats.filter(s => s.kind !== 'cpu').length; MS.comm.draw(r, { left: n >= 1 ? 112 : 6, right: n >= 2 ? 112 : 6 }); }
    if (MS.data.drill && TT.Drills) TT.Drills.draw(r);
    if (MS.data.attract && TT.Attract) TT.Attract.draw(r);
    if (MS.data.session && TT.Net) TT.Net.draw(r);
    if (m.over && !MS.data.attract && !MS.data.drill && !MS.data.session) r.overlay(g => { FONT.title(g, 'FULL TIME', r.W / 2, r.H * .3, { align: 'center', scale: 4, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 }); UI.txt(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, r.W / 2, r.H * .3 + 40, '#ffffff', { align: 'center', scale: 2 }); });
    if (TT.dev && TT.dev.enabled) TT.dev.draw(r);
  },
  back() { return false; }
};
TT.scenes = TT.scenes || {};
TT.scenes.match = matchScene;
/** a finished match's summary: the score, four tiles, the player of the match, records */
TT.summarize = (m, data) => {
  const w = m.result ? m.result.winner : (m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1), st = m.stats;
  const hT = m.seats.length ? m.seats[0].team : 0;
  const pool = m.players.filter(p => w < 0 || p.team === w);
  const potm = pool.map(p => [p, p.tries * 10 + p.monsters * 4 + p.tackles + metres(p.metres) / 10 + p.breaks * 3 + p.turnovers * 3]).sort((a, b) => b[1] - a[1])[0][0];
  const total = st[0].poss + st[1].poss || 1;
  return {
    home: m.teamIds[0], away: m.teamIds[1], venue: m.venue.id, score: m.score.slice(), winner: w, data,
    tiles: [['TRIES', st[0].tries + ' - ' + st[1].tries], ['BIG HITS', st[0].bigHits + ' - ' + st[1].bigHits], ['METRES', Math.round(metres(st[0].metres)) + ' - ' + Math.round(metres(st[1].metres))], ['POSSESSION', Math.round(st[0].poss / total * 100) + '% - ' + Math.round(st[1].poss / total * 100) + '%']],
    potm: { team: potm.team, slot: potm.slot, nick: potm.nick, name: potm.name, line: potm.tries + ' TRIES, ' + potm.tackles + ' TACKLES', line2: Math.round(metres(potm.metres)) + ' METRES CARRIED' },
    records: { margin: Math.abs(m.score[0] - m.score[1]), tries: Math.max(...m.players.filter(p => p.team === hT).map(p => p.tries).concat(0)), hit: Math.round(Math.max(0, ...m.players.filter(p => p.team === hT).map(p => p.hitBest)) * 10) },
    humanTeam: m.seats.length ? m.seats[0].team : 0, cup: data.cup, exhibition: !!data.exhibition, stats: st
  };
};


/* ==== 44-drills.js ==== */
/* ---- THE TRAINING GROUND: each drill is a match with a scripted setup, a goal, the coach's line with the device's
 * badges, a reset on failure, SHOW ME (the coach's AI does it once: the drill's auto script, the one the tests use) ---- */
const Drills = TT.Drills = {
  m: null, id: null, D: null, prog: {}, msg: '', msgT: 0, doneT: 0, showing: false, subs: [], resetT: 0, rep: 0, t: 0, bot: {},
  start(m, id) {
    this.m = m; this.id = id; this.D = DRILL[id]; this.prog = {}; this.msg = ''; this.msgT = 0; this.doneT = 0; this.showing = false; this.rep = 0; this.t = 0; this.bot = {};
    m.drill = id; m.parked = new Set();
    this.subs.forEach(f => f()); this.subs = [];
    this.subs.push(TT.bus.on('*', (d, name) => { if (this.m && d.m === this.m && this.D.on && !this.setting) this.D.on.call(this, name, d, this.m); }));
    this.reset();
  },
  stop() { this.subs.forEach(f => f()); this.subs = []; this.m = null; this.showing = false; },
  seat() { return this.m && this.m.seats[0]; },
  me() { const s = this.seat(); return s ? this.m.players[s.pid] : null; },
  /** everything back to open play, then the drill's own setup */
  reset() {
    const m = this.m;
    m.setp = null; m.pending = null; m.adv = null; m.useIt = 0; m.hazards = []; m.powerups = []; m.replayAsk = null; m.foulsLater = []; m.over = false; m.hooter = false;
    m.dir = [1, -1]; m.hype = [0, 0]; m.breakDone = false; m.kickForTouch = undefined; m.parked = new Set(); m.forced = {};
    for (const p of m.players) { this.setFree(p); p.x = G.CX + (p.team ? 300 : -300); p.y = G.Y0 - 24 + p.slot * 2; }
    m.ref.down = 0; m.ref.x = G.CX; m.ref.y = G.Y0 + 40;
    m.phase = 'play'; m.sub = ''; m.phaseT = 0; m.ball.st = 'dead'; m.ball.holder = -1; m.ball.kind = '';
    this.resetT = 0; this.rep++; this.bot = {}; this.hero = -1;
    this.setting = true;
    this.D.setup.call(this, m);
    const s = this.seat(); if (s && this.hero >= 0 && s.pid !== this.hero) m.assign(s, this.hero);
    this.setting = false;
  },
  setFree(p) { p.st = 'free'; p.stT = 0; p.pin = false; p.charge = -1; p.chargeT = 0; p.sup = null; p.pu = null; p.z = 0; p.vx = p.vy = 0; p.held = 0; p.hanging = -1; p.cool = 0; p.evade = 0; p.fendT = 0; p.a.act = ''; p.pressT = {}; p.pk = 0; p.turbo = TUNE.v.turboTank; },
  put(p, x, y, f) { this.setFree(p); p.x = x; p.y = y; p.f = f === undefined ? 0 : f; },
  park(...ids) { for (const id of ids) { this.m.parked.add(id); } },
  give(p) { this.m.give(p, 'drill'); },
  /** a step of progress toward the goal ('k' up to n); the drill is done when every count reaches its target */
  add(k, n = 1) { this.prog[k] = (this.prog[k] || 0) + n; this.check(); },
  check() { const G0 = this.D.goal; if (this.showing && Object.keys(G0).every(k => (this.prog[k] || 0) >= G0[k])) { this.showing = false; this.shown = true; this.prog = {}; this.say('YOUR TURN!', 2); this.resetT = 1.6; return; } if (Object.keys(G0).every(k => (this.prog[k] || 0) >= G0[k]) && !this.doneT) { this.doneT = .001; this.say('DRILL COMPLETE!'); TT.sound.sting('win'); const d = Object.assign({}, TT.store.get('thugby:drills', {}) || {}); d[this.id] = true; if (!TT.noStore) TT.store.set('thugby:drills', d); TT.bus.emit('drillDone', { id: this.id }); } },
  say(t, s = 2) { this.msg = t; this.msgT = s; },
  fail(t) { if (this.resetT > 0 || this.doneT) return; this.say(t, 1.6); this.resetT = 1; },
  done() { return !!this.doneT; },
  state() { return this.m ? { id: this.id, prog: Object.assign({}, this.prog), goal: this.D.goal, done: !!this.doneT, showing: this.showing, rep: this.rep } : null; },
  update(dt) {
    const m = this.m; if (!m) return;
    this.t += dt; this.msgT = Math.max(0, this.msgT - dt);
    if (this.doneT) {
      this.doneT += dt;
      if (this.doneT > 2.5 && !this.autoplay) { const i = TT.DRILLS.findIndex(d => d.id === this.id); const next = TT.DRILLS[i + 1]; const md = MS.data; TT.game.go(next ? 'match' : 'training', next ? Object.assign({}, md, { drill: next.id }) : { cup: md.cupTraining, i: 0 }); }
      return;
    }
    if (this.resetT > 0) { this.resetT -= dt; if (this.resetT <= 0) this.reset(); return; }
    // SHOW ME: the coach's AI plays it once (△, or the pause menu); any button takes it back
    const s = this.seat(), I = s && s.I;
    if (s && !this.showing && this.D.showKey !== false && s.input.pressed('tri') && this.id !== 'turbo') { this.showing = true; this.bot = {}; this.reset(); this.say('WATCH ME, YOU MUPPETS', 2); }
    if (this.showing && s && (s.input.pressed('confirm') || s.input.pressed('cancel')) && this.t > .5) { this.showing = false; this.prog = {}; this.reset(); this.say('YOUR TURN', 1.5); }
    if ((this.showing || this.autoplay) && s) { this.drive(I, dt); }
    if (this.D.tick) this.D.tick.call(this, m, dt);
    if (this.showing && this.doneT) this.showing = false;
  },
  /** the bot's intent for the drill (SHOW ME and the tests) */
  drive(I, dt) {
    const B = this.bot; B.t = (B.t || 0) + dt; B.held = B.held || {}; B.tap = {};
    I.mx = 0; I.my = 0; I.turbo = false; I.click = null; I.mkick = null; I.aim = null; I.aimY = null; I.mhold = false; I.placeMove = 0; I.aimMove = 0; I.cmd = null;
    const press = k => { B.tap[k] = true; };
    const hold = (k, on) => { B.held[k] = on; };
    const seek = (x, y, turbo) => { const p = this.me(); if (!p) return; const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy); if (d > 3) { I.mx = dx / d; I.my = dy / d; } I.turbo = !!turbo; };
    this.D.auto.call(this, this.m, I, { press, hold, seek, B, dt });
    // a tap is down for one step; a hold until let go: pressed and released follow
    const was = B.was || {}, now = {};
    I.pr = {}; I.rl = {}; I.hd = {};
    for (const k of PBTN) { now[k] = !!B.held[k] || !!B.tap[k]; I.hd[k] = now[k]; if (now[k] && !was[k]) I.pr[k] = true; if (!now[k] && was[k]) I.rl[k] = true; }
    B.was = now;
  },
  draw(r) {
    const m = this.m; if (!m) return;
    r.overlay(g => {
      const D = TT.DRILLS.find(d => d.id === this.id), I = TT.game.input, cx = r.W / 2;
      UI.panel(g, cx - 150, r.H - 64, 300, 32, { alpha: .9, bg: ['#2a1a10', '#140c08'], border: '#e8c040' });
      UI.prompt(g, D.coach, cx - 144, r.H - 60, I, {});
      const G0 = this.D.goal, parts = Object.keys(G0).map(k => (this.D.names && this.D.names[k] || k.toUpperCase()) + ' ' + Math.min(G0[k], this.prog[k] || 0) + '/' + G0[k]);
      UI.txt(g, parts.join('   '), cx, r.H - 46, '#ffe7a8', { align: 'center', font: 'tiny' });
      FONT.title(g, 'DRILL ' + (TT.DRILLS.indexOf(D) + 1) + ': ' + D.name, cx, 52, { align: 'center', scale: 2, colors: ['#ffffff', '#b0f0a0', '#3a8a3a'] });
      if (this.msgT > 0) FONT.title(g, this.msg, cx, r.H * .3, { align: 'center', scale: this.msg.length > 16 ? 2 : 3, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      UI.prompt(g, (this.id !== 'turbo' ? '{b:tri} SHOW ME   ' : '') + '{b:start} MENU', r.W - 6, r.H - 20, I, { align: 'right', bg: 'rgba(0,0,0,.5)' });
      if (this.showing) UI.prompt(g, 'COACH IS PLAYING  -  {b:confirm} TAKE OVER', cx, 72, TT.game.input, { align: 'center', bg: 'rgba(0,0,0,.5)' });
    });
    // the cones and markers of the drill
    if (this.D.marks) this.D.marks.call(this, r, m);
  }
};
const d1 = (m, t = 0) => m.dir[t];
const DRILL = {
  legs: {
    goal: { tries: 1 }, names: { tries: 'DIVE OVER' },
    setup(m) { const p = m.players[6]; this.hero = 6; this.put(p, m.ownLine(0) + G.L22, G.CY + 40, 0); this.give(p); this.park(...m.players.filter(q => q.id !== 6).map(q => q.id)); },
    on(n, d, m) { if (n === 'try') { if (d.how === 'dive') this.add('tries'); else this.fail('DIVE WITH THE BUTTON!'); if (!this.doneT) this.resetT = 1.2; } },
    tick(m) { if (m.phase !== 'play' && m.phase !== 'try' && !this.resetT) this.fail('AGAIN!'); },
    auto(m, I, A) { const p = this.me(); if (!p) return; A.seek(m.oppLine(0) + 40, G.CY, true); if (m.inGoal(0, p.x)) A.press('x'); },
    marks(r, m) { r.decal(() => { for (let x = m.ownLine(0) + G.L22 + 80; x < G.X1; x += 120) { r.groundDisc(x, G.CY + 70, 3, '#ff8030', .9); r.groundDisc(x, G.CY + 10, 3, '#ff8030', .9); } }); }
  },
  hands: {
    goal: { up: 2, down: 2, passes: 5, long: 1 }, names: { up: 'UP', down: 'DOWN', passes: 'PASSES', long: 'LONG' },
    setup(m) {
      const ids = [3, 4, 5, 6, 1];
      ids.forEach((id, i) => this.put(m.players[id], G.X0 + 200 - i * 16 * (i % 2 ? 1 : 0), G.CY - 120 + i * 60, 0));
      this.give(m.players[3]); this.hero = 3;
      this.park(...m.players.filter(q => q.team === 1 || !ids.includes(q.id)).map(q => q.id));
    },
    on(n, d, m) {
      if (n === 'pass' && m.players[d.id].team === 0) { this.pend = d; }
      if (n === 'catch' && this.pend && m.players[d.id].team === 0 && d.how === 'pass') { const pd = this.pend; this.pend = null; const side = m.players[pd.to] && m.players[pd.from === undefined ? pd.id : pd.id] ? (m.players[d.id].y < m.players[pd.id].y ? 'up' : 'down') : 'up'; this.add(side); this.add('passes'); if (pd.long) this.add('long'); }
      if (n === 'forwardPass') this.fail('FORWARD! BACKWARDS ONLY, YOU MUPPET!');
      if (n === 'knockOn') this.fail('BUTTER FINGERS! AGAIN!');
    },
    tick(m) { const c = m.carrier(); if (c && c.x > G.X1 - 120) this.reset(); if (m.phase !== 'play' && !this.resetT) this.fail('AGAIN!'); },
    auto(m, I, A) {
      const B = A.B, c = m.carrier(); if (!c) return;
      A.seek(c.x + 60, c.y);
      B.n = B.n || 0; B.next = B.next || .9;
      if (B.t > B.next && c.st === 'free') {
        B.next = B.t + 1.0;
        const ups = this.prog.up || 0, downs = this.prog.down || 0, total = this.prog.passes || 0;
        const k = total >= 4 && !this.prog.long ? (c.y > G.CY ? 'l1' : 'r1') : (ups <= downs ? 'l1' : 'r1');
        if (total >= 4 && !this.prog.long) { A.hold(k, true); B.longK = k; B.longT = B.t; }
        else A.press(k);
      }
      if (B.longK && B.t - B.longT > .32) { A.hold(B.longK, false); B.longK = null; }
    }
  },
  feet: {
    goal: { steps: 2, spins: 1, fends: 1 }, names: { steps: 'SIDESTEPS', spins: 'SPIN', fends: 'FEND' },
    setup(m) {
      const p = m.players[5]; this.put(p, G.CX - 200, G.CY, 0); this.give(p); this.hero = 5;
      const bags = [7, 8, 9]; bags.forEach((id, i) => this.put(m.players[id], G.CX - 80 + i * 60, G.CY + (i % 2 ? 24 : -24), PI));
      this.put(m.players[12], G.CX + 160, G.CY, PI);
      this.park(...m.players.filter(q => q.id !== 5 && q.id !== 12).map(q => q.id));
    },
    on(n, d, m) {
      if (n === 'sidestep' && m.players[d.id].team === 0) this.add('steps');
      if (n === 'spin' && m.players[d.id].team === 0) this.add('spins');
      if (n === 'fend' && m.players[d.id].team === 0) this.add('fends');
      if ((n === 'tackle' || n === 'bigHit' || n === 'diveTackle') && m.players[d.on] && m.players[d.on].team === 0) this.fail('FEND HIM OFF! SQUARE!');
    },
    tick(m) {
      const c = m.carrier(), d = m.players[12];
      if (c && c.team === 0 && dist(d, c) > 34 && d.st === 'free') m.forced[12] = { t: m.t + .05, I: m.seek(d, c.x + c.vx * .3, c.y + c.vy * .3, true) };
      if ((c && c.x > G.CX + 300) || (m.phase !== 'play' && !this.resetT)) this.fail('AGAIN!');
    },
    auto(m, I, A) {
      const B = A.B, p = this.me(); if (!p) return;
      A.seek(G.CX + 320, G.CY);
      const steps = this.prog.steps || 0, spins = this.prog.spins || 0;
      if (steps < 2 && B.t > .5 + steps * .8 && !B['s' + steps]) { B['s' + steps] = 1; A.press('x'); I.my = steps ? 1 : -1; }
      else if (steps >= 2 && !spins && !B.sp1 && B.t > 2.2) { B.sp1 = B.t; A.press('x'); }
      else if (B.sp1 && !B.sp2 && B.t - B.sp1 > .12) { B.sp2 = 1; A.press('x'); }
      const d = m.players[12]; if (d && dist(d, p) < 22 && Math.abs(angDiff(p.f, angTo(p, d))) < 1.4 && p.fendCd <= 0 && p.fendT <= 0) A.press('sq');
    }
  },
  hit: {
    goal: { switch: 1, tackle: 1, big: 1, dive: 1 }, names: { switch: 'SWITCH', tackle: 'TACKLE', big: 'BIG HIT', dive: 'DIVE' },
    setup(m) {
      const r = this.prog, kind = !r.switch ? 'switch' : !r.tackle ? 'tackle' : !r.big ? 'big' : 'dive';
      this.kind = kind;
      const c = m.players[13]; this.put(c, G.CX + 200, G.CY, PI); this.give(c);
      const me = m.players[5]; this.put(me, kind === 'dive' ? G.CX + 120 : G.CX - 20, kind === 'dive' ? G.CY + 4 : G.CY, kind === 'dive' ? PI : 0);
      const mate = m.players[2]; this.put(mate, G.CX + 60, G.CY + 120, 0);
      this.park(...m.players.filter(q => ![13, 5, 2].includes(q.id) || (q.id === 2 && kind !== 'switch')).map(q => q.id));
      this.hero = 5; m.forced = {};
    },
    on(n, d, m) {
      if (n === 'switch' && !d.auto && d.seat === 0) this.add('switch');
      const mine = d.id !== undefined && m.players[d.id] && m.players[d.id].team === 0 && m.players[d.id].ctl >= 0;
      if (n === 'tackle' && mine) { this.add('tackle'); this.resetT = .9; }
      if ((n === 'bigHit' || n === 'monsterHit') && mine) { this.add('big'); this.resetT = .9; }
      if (n === 'diveTackle' && mine) { this.add('dive'); this.resetT = .9; }
      if (n === 'diveTackle' && mine) this.add('tackle', 0);
    },
    tick(m) {
      const c = m.carrier();
      // the runner comes straight at the line
      if (c && c.team === 1) m.forced[c.id] = { t: m.t + .05, I: Object.assign(TT.emptyIntent(), { mx: this.kind === 'dive' ? -1 : -.8, my: this.kind === 'dive' ? 0 : Math.sin(m.t * 2) * .3 }) };
      if (c && c.x < G.CX - 260) this.fail('HE GOT PAST YOU!');
      if (m.phase !== 'play' && !this.resetT) { this.resetT = .9; }
    },
    auto(m, I, A) {
      const B = A.B, c = m.carrier(), p = this.me(); if (!c || !p) return;
      if (this.kind === 'switch') { if (!B.sw) { B.sw = 1; A.press('ci'); } return; }
      const d = dist(p, c), lead = d > 40 ? .2 : 0;
      A.seek(c.x + c.vx * lead, c.y + c.vy * lead, this.kind === 'dive');
      if (this.kind === 'tackle' && d < 12 && p.st === 'free' && p.cool <= 0 && (!B.tk || B.t - B.tk > .5)) { B.tk = B.t; A.press('x'); }
      if (this.kind === 'big') { if (d < 48 && !B.ch) { B.ch = 1; A.hold('x', true); } if (B.ch && d < 15) A.hold('x', false); }
      if (this.kind === 'dive' && d < 24 && !B.dv) { B.dv = 1; A.press('sq'); }
    }
  },
  ruck: {
    goal: { won: 2, jackal: 1 }, names: { won: 'RUCKS WON', jackal: 'JACKAL' },
    setup(m) {
      const def = (this.prog.won || 0) >= 2;
      this.def = def;
      if (!def) {
        const me = m.players[5]; this.put(me, G.CX - 60, G.CY, 0); this.give(me); this.hero = 5;
        this.put(m.players[12], G.CX + 30, G.CY, PI); this.put(m.players[1], G.CX - 120, G.CY + 30, 0); this.put(m.players[3], G.CX - 110, G.CY - 40, 0);
        this.park(...m.players.filter(q => ![5, 12, 1, 3].includes(q.id)).map(q => q.id));
      } else {
        const c = m.players[12]; this.put(c, G.CX, G.CY, PI); this.give(c);
        const tk = m.players[2]; this.put(tk, G.CX - 10, G.CY, 0);
        const me = m.players[5]; this.put(me, G.CX + 8, G.CY + 12, Math.PI / 2); this.hero = 5; const s = this.seat(); if (s && s.pid !== 5) m.assign(s, 5);
        this.park(...m.players.filter(q => ![12, 2, 5].includes(q.id)).map(q => q.id));
        this.m.tackled(tk, c, 'tackle');
      }
    },
    on(n, d, m) {
      if (n === 'ruckWon' && !this.def) { if (d.team === 0) { this.add('won'); this.resetT = 1; } else this.fail('MASH HARDER!'); }
      if (n === 'jackal' && m.players[d.id].team === 0) { this.add('jackal'); this.resetT = 1.2; }
      if (n === 'ruckWon' && this.def && !this.resetT) this.fail('FIRST MAN IN: SQUARE TO JACKAL!');
      if (n === 'handsInRuck' && this.def) this.fail('TOO LATE! HANDS AWAY!');
    },
    tick(m) {
      if (!this.def) { const c = m.carrier(); if (c && c.team === 0 && c.x > G.CX + 160) this.fail('GET TACKLED, THEN WIN THE RUCK!'); }
      if (m.phase !== 'play' && m.phase !== 'ruck' && !this.resetT) this.resetT = 1;
    },
    auto(m, I, A) {
      const B = A.B;
      if (m.phase === 'ruck') { B.mT = (B.mT || 0) + A.dt; if (B.mT > 1 / 13) { B.mT = 0; A.press(this.def ? 'sq' : 'x'); } return; }
      if (!this.def) A.seek(G.CX + 100, G.CY);
    }
  },
  boot: {
    goal: { grubber: 1, touch: 1, drop: 1 }, names: { grubber: 'GRUBBER', touch: 'TO TOUCH', drop: 'DROP GOAL' },
    setup(m) {
      const r = this.prog, kind = !r.grubber ? 'grubber' : !r.touch ? 'touch' : 'drop'; this.kind = kind;
      const me = m.players[4];
      if (kind === 'grubber') this.put(me, G.X1 - 220, G.CY, 0);
      else if (kind === 'touch') this.put(me, G.CX - 120, G.CY + 120, 0);
      else this.put(me, G.X1 - 307, G.CY + 10, 0);
      this.give(me); this.hero = 4; this.park(...m.players.filter(q => q.id !== 4).map(q => q.id));
    },
    on(n, d, m) {
      if (n === 'kick' && m.players[d.id].team === 0 && this.kind === 'grubber' && d.kind === 'grubber') { this.add('grubber'); this.resetT = 2; }
      if (n === 'kickTouch' && this.kind === 'touch') { this.add('touch'); this.resetT = 1; }
      if (n === 'dropGoal' && this.kind === 'drop') { this.add('drop'); this.resetT = 1.4; }
      if (n === 'dropMiss' && this.kind === 'drop') this.fail('WIDE! AGAIN!');
    },
    tick(m) { if (m.phase !== 'play' && !this.resetT) this.resetT = 1; const b = m.ball; if (this.kind !== 'grubber' && b.st === 'loose' && b.t > 2.5 && !this.resetT) this.fail('AGAIN!'); },
    auto(m, I, A) {
      const B = A.B, p = this.me(); if (!p || m.carrier() !== p) return;
      if (this.kind === 'grubber' && B.t > .5 && !B.k) { B.k = 1; A.press('ci'); }
      if (this.kind === 'touch') { I.mx = .3; I.my = 1; if (B.t > .4 && !B.k) { B.k = 1; A.hold('ci', true); B.kt = B.t; } if (B.k && B.t - B.kt > .8) A.hold('ci', false); }
      if (this.kind === 'drop') { I.mx = 1; I.my = (G.CY - p.y) / 100; if (B.t > .6 && !B.k) { B.k = 1; A.hold('ci', true); B.kt = B.t; } if (B.k && B.t - B.kt > .85) { I.my = 0; A.hold('ci', false); } }
    }
  },
  set: {
    goal: { scrum: 1, lineout: 1 }, names: { scrum: 'SCRUM', lineout: 'LINEOUT' },
    setup(m) { const kind = this.prog.scrum ? 'lineout' : 'scrum'; this.kind = kind; for (const p of m.players) this.put(p, G.CX + (p.team ? 60 : -60), G.CY + (p.slot - 3) * 40, p.team ? PI : 0); this.hero = 1; const s = this.seat(); if (s && s.pid !== 1) m.assign(s, 1); if (kind === 'scrum') m.scrumSetup(0, G.CX, G.CY); else m.lineoutSetup(0, G.CX, G.Y0); },
    on(n, d, m) {
      if (n === 'scrumWon' && this.kind === 'scrum') { if (d.team === 0) { this.add('scrum'); this.resetT = 1; } else this.fail('PUSH! ALTERNATE THE SHOULDERS!'); }
      if (n === 'pushover' || n === 'collapse') { if (this.kind === 'scrum') { if (d.team === 0 || (n === 'collapse' && d.team === 1)) { this.add('scrum'); this.resetT = 1.2; } } }
      if (n === 'earlyEngage' && this.kind === 'scrum') this.fail('TOO EARLY! WAIT FOR "SET!"');
      if (n === 'lineoutWon' && this.kind === 'lineout') { if (d.team === 0) { this.add('lineout'); this.resetT = 1; } else this.fail('STOLEN! AGAIN!'); }
      if (n === 'notStraight') this.fail('NOT STRAIGHT! STOP IT IN THE GREEN!');
    },
    tick(m) { if (m.phase === 'play' && !this.resetT && m.phaseT > 1.2) this.resetT = .5; },
    auto(m, I, A) {
      const S = m.setp, B = A.B; if (!S) return;
      if (S.kind === 'scrum') { if (S.sub === 'set' && !B.st) { B.st = 1; A.press('x'); } if (S.sub === 'push') { B.pT = (B.pT || 0) + A.dt; if (B.pT > 1 / 12) { B.pT = 0; B.alt = !B.alt; A.press(B.alt ? 'l1' : 'r1'); } } }
      if (S.kind === 'lineout') { if (S.sub === 'call' && S.t > .6 && !B.c) { B.c = 1; A.press('x'); } if (S.sub === 'throw' && Math.abs(S.needle - .5) < .06 && S.t > .2 && !B.th) { B.th = 1; A.press('x'); } }
    }
  },
  posts: {
    goal: { conv: 1 }, names: { conv: 'CONVERTED' },
    setup(m) { for (const p of m.players) this.put(p, G.X1 - 200, G.CY + (p.slot - 3) * 30, 0); this.hero = 4; const s = this.seat(); if (s && s.pid !== 4) m.assign(s, 4); m.setKickSetup(0, G.X1, G.Y0 + 70, 'conv'); },
    on(n, d, m) { if (n === 'convMade') { this.add('conv'); this.resetT = 1.2; } if (n === 'convMissed' || n === 'doinkMiss') this.fail(n === 'doinkMiss' ? 'DOINK! AGAIN!' : 'WIDE! AGAIN!'); },
    tick(m) { if (m.phase !== 'setkick' && !this.resetT && !this.doneT) this.resetT = 1; },
    auto(m, I, A) {
      const S = m.setp, B = A.B; if (!S || S.kind !== 'setkick') return;
      if (S.sub === 'place') { I.placeMove = S.d < 160 ? 1 : 0; if (S.d >= 160 && !B.p) { B.p = 1; A.press('x'); } }
      if (S.sub === 'aim' || S.sub === 'power') { I.aimMove = clamp(-(S.aim + S.sway) / 20, -1, 1) * (TT.MS.ctx ? TT.MS.ctx.aimSign || 1 : 1); if (!B.c && S.t > .6) { B.c = 1; A.hold('ci', true); } if (B.c && S.power >= .88) A.hold('ci', false); }
    }
  },
  turbo: {
    goal: { pie: 1, thunder: 1, tries: 1 }, names: { pie: 'PIE', thunder: 'THUNDER RUN', tries: 'TRY' }, showKey: false,
    setup(m) {
      const me = m.players[5]; this.put(me, G.CX - 160, G.CY, 0); this.give(me); this.hero = 5; m.hype[0] = 100;
      [8, 9, 12].forEach((id, i) => this.put(m.players[id], G.CX + 140 + i * 90, G.CY + (i - 1) * 30, PI));
      this.park(...m.players.filter(q => ![5, 8, 9, 12].includes(q.id)).map(q => q.id));
      const q = m.throwPowerup('pie', { x: G.CX - 40, y: G.CY - 40 }); q.on = true; q.t = 0; q.chaser = -2;
      this.got = false;
    },
    on(n, d, m) {
      if (n === 'powerupTake' && d.kind === 'pie' && m.players[d.id].team === 0) { this.add('pie'); this.got = true; }
      if (n === 'superStart' && d.kind === 'thunder' && m.players[d.id].team === 0) this.add('thunder');
      if (n === 'try' && m.players[d.id].team === 0) { if (this.prog.thunder) { this.add('tries'); } else this.fail('USE THE THUNDER RUN!'); this.resetT = 1.4; }
      if ((n === 'tackle' || n === 'bigHit' || n === 'monsterHit') && m.players[d.on] && m.players[d.on].team === 0) this.fail('TAKE THE PIE, THEN THE THUNDER RUN!');
    },
    tick(m) { if (m.phase !== 'play' && m.phase !== 'try' && !this.resetT) this.resetT = 1; },
    auto(m, I, A) {
      const B = A.B, p = this.me(); if (!p) return;
      if (!this.got) { A.seek(G.CX - 40, G.CY - 40, true); return; }
      if (!B.s) { B.s = 1; A.press('tri'); }
      A.seek(m.oppLine(0) + 40, G.CY, true);
      if (m.inGoal(0, p.x)) A.press('x');
    }
  }
};
TT.DRILL = DRILL;


/* ==== 45-attract.js ==== */
/* ---- THE ATTRACT MODE: 10 s idle on the title or a menu starts a CPU v CPU match with cheats on; a director walks a
 * showcase of every system (the same force() calls as the dev panel), then the records, then the title. Any input exits:
 * a key, a button, the mouse moved, a stick, a tap ---- */
const ATTRACT_TEAMS = [['mud', 'gul', 'docks'], ['irn', 'mud', 'furnace'], ['mud', 'meg', 'megadome'], ['gul', 'bad', 'muddington']];
TT.attractData = loop => { const [h, a, v] = ATTRACT_TEAMS[loop % ATTRACT_TEAMS.length]; return { home: h, away: a, venue: v, attract: true, seed: 900 + loop * 17, loop }; };
const Attract = TT.Attract = {
  loop: 0, m: null, i: 0, t: 0, stepT: 0, steps: null, fired: {}, log: [], recT: 0, active: false,
  begin() { if (SESSION) return; TT.arcade.phase = 'demo'; TT.game.go('match', TT.attractData(this.loop++)); },
  start(m) {
    this.m = m; this.i = 0; this.t = 0; this.stepT = 0; this.fired = {}; this.recT = 0; this.active = true; this.armed = .6; this.log = [];
    m.o.attractHype = false;
    this.steps = SHOWCASE.map(q => Object.assign({}, q));
    this.sub = TT.bus.on('*', (d, n) => { if (d.m === m) this.fired[n] = (this.fired[n] || 0) + 1; });
  },
  stop() { if (this.sub) this.sub(); this.sub = null; this.active = false; this.m = null; },
  update(dt) {
    const game = TT.game, m = this.m; if (!m) return;
    this.t += dt; this.armed -= dt;
    // any input ends it at once (and the input picks nothing)
    if (this.armed <= 0 && UI.anyInput(game)) { for (const q of game.players) q.consumeAll(); TT.arcade.wake(); this.exit('title'); return; }
    if (this.recT > 0) { this.recT += dt; if (this.recT > 8) this.exit('title'); return; }
    const S = this.steps[this.i];
    if (!S) { this.recT = .001; TT.arcade.endDemo(); return; }
    this.stepT += dt;
    if (!S.started) { if (S.wait && !S.wait(m) && this.stepT < 6) return; S.started = true; S.at = this.stepT; S.mark = Object.assign({}, this.fired); try { S.run(m, this); } catch (e) { game.fail('attract ' + S.name, e); } this.log.push(S.name); }
    const done = S.until ? S.until(m, this, S) : this.stepT - S.at > 4;
    if (done || this.stepT - S.at > (S.max || 12)) { this.i++; this.stepT = 0; }
  },
  exit(to) { const game = TT.game; this.stop(); game.go(to); },
  /** how many times an event fired since a step began */
  since(S, n) { return (this.fired[n] || 0) - ((S.mark && S.mark[n]) || 0); },
  draw(r) {
    r.overlay(g => {
      const t = TT.game.real;
      FONT.title(g, 'DEMO', r.W / 2, 4, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] });
      FONT.title(g, 'THUGBY TURBO', r.W / 2, 32, { align: 'center', scale: 1, colors: ['#fffbe8', '#ffe08a', '#e0662a'] });
      const msg = TT.touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON';
      if (Math.floor(t * 1.5) % 2 === 0) UI.txt(g, msg, r.W / 2, 46, '#ffffff', { align: 'center', scale: UI.w(msg, { scale: 2 }) > r.W - 12 ? 1 : 2 });
      const S = this.steps && this.steps[this.i]; if (S && S.label) UI.txt(g, S.label, r.W / 2, 24, '#ffe060', { align: 'center', font: 'tiny' });
    });
    if (this.recT > 0) { r.overlay(g => { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 0, r.W + 4, r.H + 4); }); const mode = ['margin', 'tries', 'hit'][this.loop % 3]; TT.arcade.drawTable(r, mode, 30, TT.RECORD_TITLES[mode]); }
  }
};
const carrierOf = (m, team) => { const c = m.carrier(); if (c && (team === undefined || c.team === team)) return c; const p = m.players.find(q => (team === undefined || q.team === team) && m.standing(q) && q.slot >= 4) || m.players.find(q => m.standing(q)); m.force('give', { id: p.id }); return p; };
const near = (m, p, x, y) => { p.x = x; p.y = y; p.vx = p.vy = 0; };
const live = m => m.phase === 'play';
const SHOWCASE = [
  { name: 'kickoff', label: 'THE WALK-OUT AND THE KICK-OFF', run() { }, until: (m, A, S) => A.since(S, 'kickoff') > 0 && m.ball.st !== 'air', max: 16 },
  { name: 'step', label: 'SIDESTEP AND FEND', wait: live, run(m) { const c = carrierOf(m, 0); c.stepCd = 0; m.doStep(c, 1); }, until: (m, A, S) => { if (A.stepT - S.at > .8 && !S.f && m.phase === 'play') { const c = carrierOf(m); S.f = 1; c.fendCd = 0; m.doFend(c); const d = m.nearestFoe(c); if (d) { d.x = c.x + Math.cos(c.f) * 12; d.y = c.y + Math.sin(c.f) * 12; d.f = angTo(d, c); m.fended(d, c); } } return A.stepT - S.at > 2.5; }, max: 5 },
  { name: 'dummy', label: 'PASS IT BACKWARDS (AND A DUMMY)', wait: live, run(m) { const c = carrierOf(m); c.cool = 0; m.dummy(c, -1); }, until: (m, A, S) => { const c = m.carrier(); if (c && c.cool <= 0 && A.since(S, 'pass') < 3 && A.stepT - S.at > .5) { const r = m.passTarget(c, A.stepT % 2 > 1 ? 1 : -1, false); if (r) m.doPass(c, r, false); } return A.since(S, 'pass') >= 3 || A.stepT - S.at > 6; }, max: 7 },
  { name: 'monster', label: 'THE MONSTER HIT', wait: live, run(m) { m.force('monster'); }, until: (m, A, S) => A.since(S, 'replayEnd') > 0 || A.stepT - S.at > 9, max: 12 },
  { name: 'ruck', label: 'THE RUCK AND THE JACKAL', wait: live, run(m) { m.force('ruck'); const S0 = m.setp; if (S0) { const d = m.players.filter(q => q.team !== S0.att && m.standing(q)).sort((a, b) => dist(a, S0) - dist(b, S0))[0]; if (d) { near(m, d, S0.x + m.dir[S0.att] * 8, S0.y + 4); S0.first = -1; m.jackal(d); } } }, until: (m, A, S) => A.since(S, 'ruckWon') > 0 && A.stepT - S.at > 1, max: 6 },
  { name: 'knockOn', label: 'KNOCK-ON: SCRUM', wait: live, run(m) { m.force('knockOn', { team: 1 }); }, until: (m, A, S) => A.since(S, 'scrumWon') > 0 && A.stepT - S.at > .8, max: 14 },
  { name: 'touch', label: 'KICK TO TOUCH: LINEOUT', wait: live, run(m) { const c = carrierOf(m); const ty = c.y < G.CY ? G.Y0 - 40 : G.Y1 + 40; m.doKick(c, 'punt', c.x + m.dir[c.team] * 220, ty, .8, { exact: true }); }, until: (m, A, S) => A.since(S, 'lineoutWon') > 0 && A.stepT - S.at > .8, max: 14 },
  { name: 'powerup', label: 'THE CROWD THROWS A POWER-UP', wait: live, run(m) { const c = carrierOf(m); const q = m.throwPowerup(TT.POWERUP_ORDER[(Attract.loop + 2) % 5], { x: c.x + m.dir[c.team] * 50, y: c.y }); void q; }, until: (m, A, S) => A.since(S, 'powerupTake') > 0 && A.stepT - S.at > 1.5, max: 8 },
  { name: 'hazard', label: 'THE VENUE BITES BACK', wait: live, run(m) { m.force('hazard', { kind: m.hazardKind === 'mud' ? 'mud' : m.hazardKind, near: true }); }, until: (m, A, S) => A.stepT - S.at > 5, max: 7 },
  { name: 'thunder', label: 'THUNDER RUN!', wait: live, run(m) { const c = carrierOf(m, 0); c.x = m.oppLine(0) - m.dir[0] * 260; c.y = G.CY - 30; m.force('thunder', { team: 0 }); }, until: (m, A, S) => A.since(S, 'convMade') + A.since(S, 'convMissed') + A.since(S, 'doinkMiss') > 0, max: 30 },
  { name: 'cheap', label: 'BEHIND THE REF\'S BACK... AND IN FRONT OF IT', wait: live, run(m) { m.force('cheap', { team: 1 }); }, until: (m, A, S) => { if (A.stepT - S.at > 2 && !S.y) { S.y = 1; m.force('yellow', { team: 1 }); } return A.since(S, 'card') > 0 && A.stepT - S.at > 3.5; }, max: 8 },
  { name: 'fire', label: 'HE\'S ON FIRE!', wait: live, run(m) { const c = carrierOf(m, 0); m.force('fire', { id: c.id }); c.x = m.oppLine(0) - m.dir[0] * 140; c.y = G.CY + 60; }, until: (m, A, S) => A.since(S, 'try') > 0 || A.stepT - S.at > 10, max: 14 },
  { name: 'drop', label: 'THE DROP GOAL', wait: live, run(m) { m.force('dropGoal', { team: 1 }); }, until: (m, A, S) => A.stepT - S.at > 4, max: 6 }
];
TT.SHOWCASE = SHOWCASE;


/* ==== 50-dev.js ==== */
/* ---- DEV MODE (pause menu → DEV MODE, then ` toggles it): a 10-foot canvas panel on the right of the screen.
 * TUNING (the important numbers as live sliders, RESET ALL TO DEFAULTS), CHEATS, EVENTS (every force()), VIEW (debug
 * overlays, slow motion, frame step) and JUMP (anywhere in the game). FROZEN (the match stopped) or LIVE (it runs) ---- */
const TABS = ['TUNING', 'CHEATS', 'EVENTS', 'VIEW', 'JUMP'];
const Dev = TT.dev = {
  enabled: false, open: false, frozen: true, tab: 0, i: 0, scroll: 0, confirmReset: 0, rects: [], tabRects: [], view: { shape: false, ranges: false, lanes: false, skel: false, state: true, slow: false }, msg: '', msgT: 0,
  openPanel() { this.enabled = true; this.open = true; this.frozen = true; this.i = 0; this.scroll = 0; TT.game.input.consumeAll(); },
  close(quiet) { this.open = false; if (!quiet) TT.game.input.consumeAll(); TT.game.timeScale = this.view.slow ? .25 : 1; if (quiet) { TT.game.timeScale = 1; this.view.slow = false; } },
  toggle() { if (this.open) this.close(); else this.openPanel(); },
  rows() {
    const m = MS.m;
    if (this.tab === 0) return [{ kind: 'reset', label: this.confirmReset > 0 ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS' }].concat(TUNE.specs.map(s => ({ kind: 'slider', s })));
    if (this.tab === 1) return [['god', 'God mode (my team can\'t be tackled)'], ['infTurbo', 'Infinite turbo'], ['hypeFull', 'Hype always full'], ['onFire', 'Always ON FIRE (P1)'], ['refBlind', 'Ref blind (sees nothing)'], ['refStrict', 'Ref strict (sees everything)'], ['cpuFrozen', 'CPU frozen'], ['noClock', 'No clock'], ['bigHeads', 'Big heads']].map(([k, l]) => ({ kind: 'cheat', k, label: l }));
    if (this.tab === 2) {
      const E2 = [['tryHome', 'Score a try (home)'], ['tryAway', 'Score a try (away)'], ['give', 'Give P1 the ball'], ['ball5m', 'Ball to their 5 m line'], ['knockOn', 'Knock-on: scrum'], ['touch', 'Touch: lineout'], ['penalty', 'Foul: penalty (the choice)'], ['freeKick', 'Free kick'], ['yellow', 'Yellow card (opponent)'], ['kickoff', 'Kick-off'], ['dropout', '22 drop-out'], ['ruck', 'A ruck now'], ['monster', 'Monster hit on the carrier'], ['dropGoal', 'A drop goal'], ['cheap', 'A cheap shot']]
        .concat(TT.POWERUP_ORDER.map(k => ['powerup:' + k, 'Spawn power-up: ' + TT.POWERUPS[k].name]))
        .concat(['mud', 'chicken', 'flames', 'lightning'].map(k => ['hazard:' + k, 'Hazard: ' + k]))
        .concat([['fire', 'ON FIRE for P1'], ['thunder', 'THUNDER RUN'], ['hurricane', 'HURRICANE HIT'], ['refDown', 'Flatten the ref'], ['replay', 'Replay the last 5 s'], ['hooter', 'The hooter'], ['halftime', 'Skip to half-time'], ['fulltime', 'Skip to full time'], ['sudden', 'Sudden death'], ['score:0:5', 'Score +5 home'], ['score:0:-5', 'Score -5 home'], ['score:1:5', 'Score +5 away'], ['score:1:-5', 'Score -5 away'], ['clock', 'Clock -30 s']]);
      return E2.map(([k, l]) => ({ kind: 'event', k, label: l }));
    }
    if (this.tab === 3) return [['shape', 'AI shape slots and roles'], ['ranges', 'Tackle and fend ranges'], ['lanes', 'Pass lanes and legal receivers'], ['skel', 'Rig skeletons'], ['state', 'State readout'], ['slow', 'Slow motion (0.25x)'], ['fps', 'Frame-rate readout'], ['step', 'Frame step (one step, while FROZEN)']].map(([k, l]) => ({ kind: 'view', k, label: l }));
    const J = [];
    TT.CUP.forEach((R, i) => { J.push({ kind: 'jump', label: 'Cup: ' + R.round + ' match', go: () => { Cup.s = Cup.s || Cup.fresh(); Cup.s.round = i; TT.game.go('match', Cup.matchData()); } }); J.push({ kind: 'jump', label: 'Cup: ' + R.round + ' cutscene', go: () => { Cup.s = Cup.s || Cup.fresh(); Cup.s.round = i; TT.game.go('story', { node: R.pre, after: 'cup', venue: R.venue }); } }); });
    J.push({ kind: 'jump', label: 'Cup: prologue', go: () => { Cup.s = Cup.s || Cup.fresh(); TT.game.go('story', { node: 'prologue', after: 'prologue' }); } });
    TT.DRILLS.forEach((d, i) => J.push({ kind: 'jump', label: 'Drill ' + (i + 1) + ': ' + d.name, go: () => TT.game.debug.drill(i) }));
    J.push({ kind: 'jump', label: 'Victory', go: () => TT.game.go('story', { node: 'victory', after: 'victory', venue: 'megadome' }) });
    J.push({ kind: 'jump', label: 'The third half', go: () => TT.game.go('story', { node: 'third', after: 'credits' }) });
    J.push({ kind: 'jump', label: 'Credits', go: () => TT.game.go('credits') });
    J.push({ kind: 'jump', label: 'Session-style match (75 s halves, no replays)', go: () => TT.game.go('match', { home: 'mud', away: 'gul', venue: 'docks', halfLen: 75, sessionStyle: true }) });
    J.push({ kind: 'jump', label: 'Title', go: () => TT.game.go('title') });
    return J;
  },
  update(dt) {
    const game = TT.game, I = game.input, rows = this.rows(), n = rows.length;
    this.msgT = Math.max(0, this.msgT - dt); this.confirmReset = Math.max(0, this.confirmReset - dt);
    const live = !this.frozen;
    if (I.pressed('cancel') && !live) { this.close(); return; }
    if (!live) {
      if (I.pressed('l1')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.i = 0; this.scroll = 0; }
      if (I.pressed('r1')) { this.tab = (this.tab + 1) % TABS.length; this.i = 0; this.scroll = 0; }
      if (I.repeat('up', .3, .08)) this.i = (this.i + n - 1) % n;
      if (I.repeat('down', .3, .08)) this.i = (this.i + 1) % n;
      const row = rows[this.i];
      if (row && row.kind === 'slider') { const sp = row.s.step * (I.down('turbo') ? 5 : 1); if (I.repeat('left', .25, .05)) TUNE.set(row.s.key, TUNE.v[row.s.key] - sp); if (I.repeat('right', .25, .05)) TUNE.set(row.s.key, TUNE.v[row.s.key] + sp); if (I.pressed('sq')) TUNE.reset(row.s.key); }
      if (I.pressed('x') || I.pressed('confirm')) this.fire(row);
      if (I.pressed('sq') && this.tab === 3) { this.stepOnce(); }
    }
    if (I.pressed('tri')) { this.frozen = !this.frozen; this.say(this.frozen ? 'FROZEN' : 'LIVE: THE MATCH RUNS, THE PANEL TAKES THE MOUSE'); }
    // the mouse: hover focuses, a click on a tab or a row, a drag on a slider's bar, the wheel scrolls
    const pt = I.pointer(), ck = I.clicked();
    if (ck) { this.tabRects.forEach((rc, k) => { if (UI.inRect(ck, rc)) { this.tab = k; this.i = 0; this.scroll = 0; } }); this.rects.forEach(([rc, k]) => { if (UI.inRect(ck, rc)) { this.i = k; if (rows[k] && rows[k].kind !== 'slider') this.fire(rows[k]); } }); }
    if (pt && this.lastPt && (pt[0] !== this.lastPt[0] || pt[1] !== this.lastPt[1])) this.rects.forEach(([rc, k]) => { if (UI.inRect(pt, rc)) this.i = k; });
    this.lastPt = pt;
    if (pt && I.down('mouseL') && this.barRect) { const [bx, by, bw, bh, s] = this.barRect; if (pt[1] >= by - 3 && pt[1] <= by + bh + 3 && pt[0] >= bx - 2 && pt[0] <= bx + bw + 2) TUNE.set(s.key, s.min + clamp((pt[0] - bx) / bw, 0, 1) * (s.max - s.min)); }
    if (I.wheel) this.i = clamp(this.i + Math.sign(I.wheel), 0, n - 1);
    this.i = clamp(this.i, 0, n - 1);
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + 8) this.scroll = this.i - 7;
    if (live) { /* the match runs: the scene steps it */ }
  },
  say(t) { this.msg = t; this.msgT = 2; },
  stepOnce() { const m = MS.m; if (m && this.frozen) { m.step(1 / 120); if (MS.pres) MS.pres.update(1 / 120, m); this.say('ONE STEP'); } },
  fire(row) {
    if (!row) return;
    const m = MS.m, game = TT.game;
    if (row.kind === 'reset') { if (this.confirmReset > 0) { TUNE.reset(); this.confirmReset = 0; this.say('EVERY SLIDER BACK TO ITS DEFAULT'); } else this.confirmReset = 3; return; }
    if (row.kind === 'cheat') { TT.cheats[row.k] = !TT.cheats[row.k]; if (row.k === 'bigHeads' && MS.pres) MS.pres.bigHeads(TT.cheats.bigHeads); this.say(row.label.toUpperCase() + (TT.cheats[row.k] ? ' ON' : ' OFF')); return; }
    if (row.kind === 'event' && m) {
      const [k, a, b] = row.k.split(':');
      if (k === 'powerup') m.force('powerup', { kind: a });
      else if (k === 'hazard') { if (a !== m.hazardKind && a !== 'mud') m.hazardKind = a; m.force('hazard', { kind: a }); }
      else if (k === 'score') m.force('score', { team: +a, n: +b });
      else if (k === 'replay') { if (MS.rep.start({ kind: 'dev', id: m.carrier() ? m.carrier().id : 0, t: m.t - 1 })) { MS.zoom0 = game.zoom || 1; game.setZoom(MS.zoom0 * 1.35); } this.frozen = false; }
      else m.force(k);
      this.say(row.label.toUpperCase());
      return;
    }
    if (row.kind === 'view') {
      if (row.k === 'step') return this.stepOnce();
      if (row.k === 'fps') { game.settings.set('showFps', !game.settings.showFps); return; }
      this.view[row.k] = !this.view[row.k];
      if (row.k === 'slow') game.timeScale = this.view.slow ? .25 : 1;
      return;
    }
    if (row.kind === 'jump') { this.close(true); row.go(); }
  },
  /** the debug overlays over the match, and the panel */
  draw(r) {
    const m = MS.m, V = this.view;
    if (m) {
      const S = m.shapes ? m.shapes() : null;
      if (V.shape && S) r.decal(() => { for (const id in S.slots) { const s = S.slots[id]; r.groundRing(s.x, s.y, 5, '#80ff90', .8); } for (const id in S.def) { const s = S.def[id]; r.groundRing(s.x, s.y, 5, '#ff8080', .8); } });
      if (V.ranges) r.decal(() => { for (const p of m.players) if (m.standing(p)) { r.groundRing(p.x, p.y, TUNE.v.tackleRange, '#ffffff', .25); if (p.fendT > 0) r.groundRing(p.x, p.y, 16, '#ffe060', .6); } });
      if (V.lanes) { const c = m.carrier(); if (c) r.decal(g => { for (const q of m.legalReceivers(c, 0)) { const [x0, y0] = r.w(c.x, c.y, 0), [x1, y1] = r.w(q.x, q.y, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#80ff90', 1); } }); }
      if (V.skel && MS.pres) for (const rig of MS.pres.rigs) if (rig.debug) rig.debug(r);
      if (V.state) r.overlay(g => { UI.txt(g, 'PHASE ' + m.phase.toUpperCase() + (m.sub ? '/' + m.sub : '') + '  T ' + m.phaseT.toFixed(1) + '  POSS ' + m.teams[m.poss].short + '  BALL ' + m.ball.st.toUpperCase() + (m.ball.holder >= 0 ? ' #' + m.ball.holder : ''), 6, 52, '#a0ffa0', { font: 'tiny' }); });
    }
    if (!this.open) return;
    r.overlay(g => {
      const w = Math.max(230, Math.round(r.W * .55)), x = r.W - w - 4, y = 52, rowH = 17, rows = this.rows();
      UI.panel(g, x, y - 38, w, rowH * 8 + 92, { alpha: .94, bg: ['#0e1420', '#080c14'], border: this.frozen ? '#f0c040' : '#40d0ff' });
      this.tabRects = [];
      let tx = x + 6;
      TABS.forEach((t, k) => { const tw = UI.w(t) + 8; this.tabRects.push([tx, y - 34, tw, 12]); px.rect(g, tx, y - 34, tw, 12, k === this.tab ? '#f0c040' : '#20283a'); UI.txt(g, t, tx + 4, y - 32, k === this.tab ? '#1a1206' : '#c8d0e8', { shadow: false }); tx += tw + 3; });
      UI.txt(g, 'DEV MODE: ' + (this.frozen ? 'FROZEN (THE MATCH WAITS)' : 'LIVE (THE MATCH RUNS)'), x + 6, y - 18, this.frozen ? '#ffe060' : '#40d0ff');
      this.rects = []; this.barRect = null;
      rows.slice(this.scroll, this.scroll + 8).forEach((row, j) => {
        const k = this.scroll + j, yy = y + j * rowH, on = k === this.i;
        this.rects.push([[x + 4, yy, w - 8, rowH - 2], k]);
        if (on) px.rect(g, x + 4, yy, w - 8, rowH - 2, '#2a2412');
        if (row.kind === 'slider') {
          const s = row.s, v = TUNE.v[s.key], changed = Math.abs(v - s.value) > 1e-9;
          UI.txt(g, s.label, x + 8, yy + 4, on ? '#ffe060' : changed ? '#a0e0ff' : '#e8ecf8');
          const bw = Math.round(w * .32), bx = x + w - bw - 44;
          UI.bar(g, bx, yy + 5, bw, 6, (v - s.min) / (s.max - s.min), changed ? '#40c0ff' : '#c8a040', { mark: (s.value - s.min) / (s.max - s.min) });
          UI.txt(g, String(+v.toFixed(3)), x + w - 8, yy + 4, '#ffffff', { align: 'right' });
          if (on) this.barRect = [bx, yy + 5, bw, 6, s];
        } else {
          let st = '';
          if (row.kind === 'cheat') st = TT.cheats[row.k] ? 'ON' : 'OFF';
          if (row.kind === 'view') st = row.k === 'fps' ? (TT.game.settings.showFps ? 'ON' : 'OFF') : row.k === 'step' ? '' : this.view[row.k] ? 'ON' : 'OFF';
          UI.txt(g, row.label, x + 8, yy + 4, on ? '#ffe060' : row.kind === 'reset' ? '#ff9080' : '#e8ecf8');
          if (st) UI.txt(g, st, x + w - 8, yy + 4, st === 'ON' ? '#80ff90' : '#6a7088', { align: 'right' });
        }
      });
      if (rows.length > 8) UI.txt(g, this.tab === 0 ? (this.i ? 'SLIDER ' + this.i + ' OF ' + TUNE.specs.length : TUNE.specs.length + ' SLIDERS') : (this.i + 1) + ' OF ' + rows.length, x + w - 8, y + 8 * rowH + 2, '#6a7088', { align: 'right', font: 'tiny' });
      const hint = this.tab === 0 ? '{b:left}{b:right} CHANGE  {b:sq} RESET ONE' : this.tab === 3 ? '{b:x} TOGGLE  {b:sq} ONE STEP' : '{b:x} DO IT';
      UI.prompt(g, hint, x + 6, y + 8 * rowH + 6, TT.game.input, {});
      UI.prompt(g, '{b:l1}{b:r1} TABS  {b:tri} FROZEN / LIVE', x + 6, y + 8 * rowH + 20, TT.game.input, {});
      UI.prompt(g, '{b:cancel} CLOSE   MOUSE: CLICK, DRAG A BAR', x + 6, y + 8 * rowH + 34, TT.game.input, {});
      if (this.msgT > 0) UI.txt(g, this.msg, x + w / 2, y + 8 * rowH + 48, '#80ff90', { align: 'center', font: 'tiny' });
    });
  }
};


/* ==== 60-net.js ==== */
/* ---- AI HUB SESSIONS (AI Hub Session Protocol v1, shared-world, 2-4 players). The host's copy runs the match (all 14
 * players, the ball, the laws); every other copy sends what its player does and draws what the host sends. Each copy
 * moves its own player at once while it is free-running and reports where it is; the host decides everything else.
 * Outside a session (AIHub.active false) none of this runs and nothing changes ---- */
const PH = ['intro', 'kickoff', 'play', 'ruck', 'scrum', 'lineout', 'setkick', 'penalty', 'dead', 'try', 'half', 'full', 'dropout'];
const STS = ['free', 'pass', 'kick', 'step', 'spin', 'lunge', 'stumble', 'dive', 'tdive', 'down', 'up', 'launch', 'stun', 'cele', 'ruck', 'set', 'bin', 'off'];
const BSTS = ['held', 'air', 'loose', 'dead', 'placed'];
const ACTS = ['', 'pass', 'passL', 'dummy', 'offload', 'kick', 'drop', 'placeKick', 'step', 'spin', 'fend', 'lunge', 'whiff', 'hit', 'shoulder', 'tackle', 'dive', 'tdive', 'sprawl', 'hitBack', 'tackled', 'launch', 'landed', 'flat', 'fended', 'hang', 'jackal', 'lift', 'highCatch', 'throwIn', 'toasted', 'zapped'];
const BKINDS = ['', 'pass', 'kick', 'grubber', 'punt', 'bomb', 'drop', 'spill', 'kickoff', 'kickoffDone', 'dropoutk', 'setkick'];
const SETP_KEYS = ['kind', 'sub', 't', 'bar', 'tq', 'team', 'att', 'calls', 'picked', 'needle', 'q', 'qT', 's', 'ty', 'x', 'y', 'power', 'kicker', 'purpose', 'gy', 'gx', 'd', 'aim', 'sway', 'clockT', 'result', 'opts', 'sel', 'free', 'tackled', 'shift', 'base', 'charging'];
const NET_EVENTS = ['try', 'kickoff', 'pass', 'catch', 'tackle', 'bigHit', 'monsterHit', 'sidestep', 'spin', 'fend', 'dummy', 'lineBreak', 'knockOn', 'forwardPass', 'turnover', 'jackal', 'ruck', 'ruckWon', 'scrum', 'scrumWon', 'scrumEngage', 'pushover', 'collapse', 'lineout', 'lineoutWon', 'lineoutThrow', 'notStraight', 'convMade', 'convMissed', 'doink', 'doinkMiss', 'penGoal', 'dropGoal', 'dropMiss', 'penalty', 'freeKick', 'advantage', 'advOver', 'foul', 'cheapShot', 'cheapUnseen', 'card', 'sinBinOut', 'refDown', 'refUp', 'refCall', 'onFire', 'fireOut', 'superStart', 'superEnd', 'powerupThrow', 'powerupTake', 'hazardWarn', 'hazard', 'toasted', 'zapped', 'chickenHit', 'mud', 'hooter', 'halftime', 'fulltime', 'suddenDeath', 'whistle', 'kick', 'interception', 'offload', 'brokenTackle', 'missedTackle', 'diveTackle', 'gangHold', 'kickTouch', 'touch', 'dropout', 'notTen', 'penTry', 'banner', 'land', 'bounce', 'mash', 'push', 'windShift', 'setKickGo', 'scrumCall', 'kickoffSetup', 'earlyEngage', 'sputter'];
const Net = TT.Net = {
  info: null, mirror: null, host: false, server: false, me: -1, seatOf: {}, inbox: [], lastSnap: -Infinity, snapAt: 0, evBuf: [], evT: 0, sendT: 0, seq: 0, ended: false, finished: false, card: null, started: false, presses: [], pressId: 0, applied: {}, remoteSeen: {}, stats: { snaps: 0, bytes: [], events: 0, intents: 0 },
  state() { return this.info ? { host: this.host, server: this.server, me: this.me, ended: this.ended, finished: this.finished, started: this.started } : null; },
  isHost() { return this.host; },
  waiting() { return this.info && !this.host && this.started && performance.now() - this.snapAt > 1000 && !this.ended; },
  async boot() {
    const game = TT.game;
    try {
      const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true });
      if (!info) { game.go('title'); return; }
      this.info = info; this.me = info.me; this.host = !!info.isHost; this.server = !!info.server;
      // the setup, the same on every copy, from the hub's seed (no messages needed)
      const R = AIHub.rng('setup'), opp = ['bad', 'gul', 'irn', 'meg'][Math.floor(R() * 4)], venue = TT.VENUE_ORDER[Math.floor(R() * 4)];
      const lim = info.limitMs || 0, half = lim ? clamp((lim / 1000 - 40) / 2.6, 20, 75) : 75;
      this.setup = { home: 'mud', away: opp, venue, halfLen: half, seed: Math.floor(R() * 1e9) };
      // seats: even ids HOME, odd AWAY; the CPU fills the rest
      this.seats = info.players.map((p, k) => ({ kind: p.id === this.me && !this.server ? 'local' : 'remote', hubId: p.id, team: p.id % 2, label: TT.clean(p.name || 'P' + (k + 1)).toUpperCase().slice(0, 8), color: p.color || ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][k % 4], input: p.id === this.me ? game.input : null }));
      AIHub.on('card', c => { this.card = c; });
      AIHub.on('start', () => { this.started = true; game.go('match', this.matchData()); });
      AIHub.on('message', (data, from) => this.onMessage(data, from));
      AIHub.on('leave', ({ id }) => this.onLeave(id));
      AIHub.on('time-up', () => { if (this.host) this.finish(); });
      AIHub.on('end', ({ reason }) => this.onEnd(reason));
      this.cardRig = this.seats.map(s => TT.makeRig(TT.TEAMS[s.team ? opp : 'mud'].roster[[4, 5, 6, 3][Math.floor(s.hubId / 2) % 4]], s.team ? TT.TEAMS[opp].home : TT.TEAMS.mud.home));
      if (game.sceneName !== 'card') game.go('card', {}, { fade: 0 }); else if (TT.scenes.card.enter) TT.scenes.card.enter.call(TT.scenes.card, {});
      // the card's answers straight from the keyboard too, so a scene's fade never swallows them: Enter is Ready, M more time
      if (typeof addEventListener === 'function' && !this.server) addEventListener('keydown', e => { if (this.started || this.ended || e.repeat) return; if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter') { AIHub.answer('ready'); this.answered = true; } else if (e.code === 'KeyM') AIHub.answer('more'); });
      AIHub.ready();
    } catch (e) { game.fail('AI Hub', e); }
  },
  matchData() { return Object.assign({ session: true, sudden: false, seats: this.seats, skipIntro: true }, this.setup); },
  /** the match scene calls this at its start */
  attach(m) {
    this.m = m; this.inbox = []; this.evBuf = []; this.evT = 0; this.sendT = 0; this.finished = false;
    m.o.replays = 'Off';
    if (this.host) {
      this.sub = TT.bus.on('*', (d, name) => { if (d.m === m && NET_EVENTS.includes(name)) this.evBuf.push([name, this.plain(d)]); });
    } else {
      this.mirror = m;   // the client never steps it: snapshots write its fields
      for (const p of m.players) p.ctl = -1;
    }
  },
  plain(d) { const o = {}; for (const k in d) if (k !== 'm' && typeof d[k] !== 'object') o[k] = typeof d[k] === 'number' ? Math.round(d[k] * 100) / 100 : d[k]; return o; },
  /** each step of the match scene */
  update(dt) {
    const m = this.m; if (!m || this.ended) return;
    const t = AIHub.time();
    if (t < 0) { m.waitStart = true; return; }
    if (this.host) this.hostStep(dt); else this.clientStep(dt);
  },
  hostStep(dt) {
    const m = this.m;
    // remote seats: their latest intents become their I (presses applied once each, by id)
    for (const s of m.seats) if (s.kind === 'remote') this.applyRemote(s);
    this.sendT += dt; this.evT += dt;
    if (this.sendT >= 1 / 12) { this.sendT = 0; const snap = this.snapshot(); const json = JSON.stringify(snap); this.stats.snaps++; this.stats.bytes.push(json.length); AIHub.send(snap, { reliable: false }); }
    if (this.evT >= .2 && this.evBuf.length) { this.evT = 0; const l = this.evBuf.splice(0, 40); this.stats.events += l.length; AIHub.send({ t: 'e', l }, { reliable: true }); }
    if (m.over && !this.finished) this.finish();
  },
  applyRemote(s) {
    const msg = this.remoteSeen[s.hubId]; const I = s.I;
    for (const k of PBTN) { I.rl[k] = false; }
    if (!msg) { I.mx = I.my = 0; return; }
    I.mx = clamp(msg.m[0] / 100, -1, 1); I.my = clamp(msg.m[1] / 100, -1, 1);
    const prev = s.prevHeld || 0;
    PBTN.forEach((k, i) => { const on = !!(msg.h & (1 << i)); I.hd[k] = on; if (!on && (prev & (1 << i))) I.rl[k] = true; });
    I.turbo = !!(msg.h & (1 << 7));
    s.prevHeld = msg.h;
    const seen = this.applied[s.hubId] || (this.applied[s.hubId] = {});
    for (const [act, at, id] of msg.p || []) { if (seen[id]) continue; seen[id] = 1; if (act === 'up' || act === 'down' || act === 'left' || act === 'right') I.pr[act] = true; else I.pr[act] = true; }
    // the client's own position while its player is free-running (clamped to what it could have run)
    const p = this.m.players[s.pid];
    if (p && msg.pos && FREE[p.st] && this.m.phase === 'play' && msg.at > (s.posAt || -1e9)) {
      const dtm = Math.max(.05, (msg.at - (s.posAt || msg.at - 100)) / 1000), maxD = this.m.speedOf(p) * TUNE.v.turboMult * dtm + 20;
      const dx = msg.pos[0] - p.x, dy = msg.pos[1] - p.y, d = Math.hypot(dx, dy), k = d > maxD ? maxD / d : 1;
      p.x += dx * k; p.y += dy * k; s.posAt = msg.at;
    }
  },
  snapshot() {
    const m = this.m, b = m.ball, R = m.ref, r = Math.round, I100 = v => r(v * 100);
    const P = m.players.map(p => { const a = [r(p.x), r(p.y), r(p.z), I100(p.f), STS.indexOf(p.st), I100(Math.min(p.stT, 9)), p.ctl, Math.max(0, ACTS.indexOf(p.a.act || '')), I100(p.a.flip || 0), p.a.cele || 0, p.fire > 0 ? 1 : 0, p.sup ? (p.sup.kind === 'thunder' ? 1 : 2) : 0, p.charge >= 0 ? I100(p.charge) : -1, r(p.turbo * 10), r(p.vx), r(p.vy)]; if (p.st === 'bin') a.push(r(p.binT)); return a; });
    const sp = m.setp ? {} : null;
    if (sp) for (const k of SETP_KEYS) if (m.setp[k] !== undefined) sp[k] = typeof m.setp[k] === 'number' ? Math.round(m.setp[k] * 100) / 100 : m.setp[k];
    return { t: 's', at: r(AIHub.time()), ph: PH.indexOf(m.phase), sub: m.sub, pt: I100(Math.min(m.phaseT, 99)), c: r(m.clock * 10), hf: m.half, ho: m.hooter ? 1 : 0, sd: m.sudden ? 1 : 0, sc: m.score, hy: m.hype.map(r), dir: m.dir[0], ps: m.poss,
      b: [r(b.x), r(b.y), r(b.z), BSTS.indexOf(b.st), b.holder, Math.max(0, BKINDS.indexOf(b.kind)), I100(b.rot % 100), b.land ? r(b.land.x) : -1, b.land ? r(b.land.y) : -1, r(b.vx), r(b.vy), r(b.vz)],
      r: [r(R.x), r(R.y), I100(R.f), R.down > 0 ? r(R.down) : 0, R.callT > 0 ? R.call : '', R.signal || '', R.card || ''], P, sp,
      pu: m.powerups.filter(q => !q.taken).map(q => [q.kind, r(q.x), r(q.y), q.on ? 1 : 0, I100(q.t)]), hz: m.hazards.map(h => [h.kind, r(h.x), r(h.y), I100(h.t), I100(h.warn || 0), h.f ? I100(h.f) : 0]), w: [I100(m.wind.s), I100(m.wind.a)], ui: m.useIt > 0 ? I100(m.useIt) : 0, adv: m.adv ? m.adv.team : -1 };
  },
  /** a client: its own intent to the host (15 a second), its own player moved now, the host's world drawn */
  clientStep(dt) {
    const m = this.m, s = m.seats.find(q => q.kind === 'local'); if (!s) return;
    const I = s.I, mine = m.players.find(p => p.ctl === s.i);
    // presses are remembered for a second and sent with every intent (lossy channel): the host applies each id once
    const now = AIHub.time();
    for (const k of PBTN.concat(['up', 'down', 'left', 'right'])) if (I.pr[k]) this.presses.push([k, Math.round(now), ++this.pressId]);
    this.presses = this.presses.filter(q => now - q[1] < 1000);
    if (mine && FREE[mine.st] && m.phase === 'play') {
      // predicted: our own player runs at once from our own stick
      const sp = m.speedOf(mine) * (I.turbo ? TUNE.v.turboMult : 1), mx = I.mx, my = I.my;
      mine.vx = approach(mine.vx, mx * sp, 900 * dt); mine.vy = approach(mine.vy, my * sp, 900 * dt);
      mine.x += mine.vx * dt; mine.y += mine.vy * dt; m.bound(mine);
      if (Math.hypot(mx, my) > .15) mine.f = E.approachAng(mine.f, Math.atan2(my, mx), dt * 10);
      this.predicted = mine.id;
    } else this.predicted = -1;
    this.sendT += dt;
    if (this.sendT >= 1 / 15) {
      this.sendT = 0;
      let h = 0; PBTN.forEach((k, i) => { if (I.hd[k]) h |= 1 << i; }); if (I.turbo) h |= 1 << 7;
      const msg = { t: 'i', s: ++this.seq, at: Math.round(now), m: [Math.round(I.mx * 100), Math.round(I.my * 100)], h, p: this.presses.slice(-12) };
      if (this.predicted >= 0) msg.pos = [Math.round(mine.x), Math.round(mine.y)];
      this.stats.intents++;
      AIHub.send(msg, { to: this.info.host, reliable: false });
    }
    for (const k of PBTN) I.pr[k] = false;
    for (const k of ['up', 'down', 'left', 'right']) I.pr[k] = false;
    this.applyInbox();
  },
  onMessage(data, from) {
    if (!data || typeof data !== 'object') return;
    if (this.host && data.t === 'i') { const prev = this.remoteSeen[from]; if (!prev || data.s > prev.s) this.remoteSeen[from] = data; return; }
    if (!this.host && from === this.info.host) this.inbox.push(data);
  },
  applyInbox() {
    const m = this.m;
    for (const d of this.inbox.splice(0)) {
      if (d.t === 'e') { for (const [name, ev] of d.l) { TT.bus.emit(name, Object.assign({ m }, ev)); } continue; }
      if (d.t !== 's' || d.at < this.lastSnap) continue;
      this.lastSnap = d.at; this.snapAt = performance.now();
      this.applySnap(d);
      if (d.over) { m.over = true; }
    }
  },
  applySnap(d) {
    const m = this.m, oldPhase = m.phase;
    m.phase = PH[d.ph] || 'play'; m.sub = d.sub || ''; m.phaseT = d.pt / 100; m.clock = d.c / 10; m.half = d.hf; m.hooter = !!d.ho; m.sudden = !!d.sd; m.score = d.sc.slice(); m.hype = d.hy.slice(); m.dir = [d.dir, -d.dir]; m.poss = d.ps;
    void oldPhase;
    const b = m.ball, B = d.b;
    b.x = B[0]; b.y = B[1]; b.z = B[2]; b.st = BSTS[B[3]] || 'dead'; b.holder = B[4]; b.kind = BKINDS[B[5]] || ''; b.rot = B[6] / 100; b.land = B[7] >= 0 && b.st === 'air' ? { x: B[7], y: B[8] } : null; b.vx = B[9]; b.vy = B[10]; b.vz = B[11];
    const R = m.ref, Rr = d.r; R.x = Rr[0]; R.y = Rr[1]; R.f = Rr[2] / 100; R.down = Rr[3]; if (Rr[4]) { R.call = Rr[4]; R.callT = .3; } else R.callT = Math.max(0, R.callT - .1); R.signal = Rr[5]; R.sigT = Rr[5] ? .3 : 0; R.card = Rr[6];
    d.P.forEach((a, i) => {
      const p = m.players[i]; if (!p) return;
      const own = i === this.predicted && STS[a[4]] === 'free' && m.phase === 'play';
      if (!own || Math.hypot(a[0] - p.x, a[1] - p.y) > 60) { p.tx = a[0]; p.ty = a[1]; if (!own) { if (p.tx0 === undefined || Math.hypot(a[0] - p.x, a[1] - p.y) > 80) { p.x = a[0]; p.y = a[1]; } } else { p.x = a[0]; p.y = a[1]; } }
      p.z = a[2]; if (!own) p.f = a[3] / 100; p.st = STS[a[4]] || 'free'; p.stT = a[5] / 100; p.ctl = a[6]; p.a.act = ACTS[a[7]] || ''; p.a.flip = a[8] / 100; p.a.cele = a[9]; p.fire = a[10] ? 1 : 0;
      p.sup = a[11] ? { kind: a[11] === 1 ? 'thunder' : 'hurricane', t: 1 } : null; p.charge = a[12] >= 0 ? a[12] / 100 : -1; p.chargeT = p.charge >= 0 ? p.charge * TUNE.v.bigHitCharge : 0; p.turbo = a[13] / 10; if (!own) { p.vx = a[14]; p.vy = a[15]; }
      if (p.st === 'bin') p.binT = a[16] || 0;
      p.tx0 = 1;
    });
    for (const s of m.seats) { const p = m.players.find(q => q.ctl === s.i); s.pid = p ? p.id : -1; }
    if (d.sp) { m.setp = Object.assign(m.setp && m.setp.kind === d.sp.kind ? m.setp : {}, d.sp); } else m.setp = null;
    m.powerups = (d.pu || []).map(([kind, x, y, on, t]) => ({ kind, x, y, on: !!on, t: t / 100, taken: false, fx: x, fy: G.Y0 - 70, fly: 1.1, life: 15 }));
    m.hazards = (d.hz || []).map(([kind, x, y, t, warn, f]) => ({ kind, x, y, t: t / 100, warn: warn / 100, burn: 1.2, f: f / 100 }));
    m.wind.s = d.w[0] / 100; m.wind.a = d.w[1] / 100; m.useIt = d.ui / 100; m.adv = d.adv >= 0 ? { team: d.adv } : null;
  },
  /** the host finishes the round: standings by the score (a draw ties everyone), scores, stats, awards */
  finish() {
    if (this.finished || !this.host || !this.m) return;
    this.finished = true;
    const m = this.m, ids = this.info.players.map(p => p.id).filter(id => !this.gone || !this.gone[id]);
    const side = id => id % 2, w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    const standings = w < 0 ? [ids] : [ids.filter(id => side(id) === w), ids.filter(id => side(id) !== w)].filter(a => a.length);
    const scores = {}, stats = {}, awards = [];
    for (const id of ids) { scores[id] = m.score[side(id)]; const st = m.stats[side(id)]; stats[id] = { tries: st.tries, tackles: st.tackles, bigHits: st.bigHits, metres: Math.round(metres(st.metres)) }; }
    const best = m.players.slice().sort((a, b) => (b.tries * 10 + b.monsters * 4 + b.tackles) - (a.tries * 10 + a.monsters * 4 + a.tackles))[0];
    const bestSeat = best && m.seats.find(s => s.pid === best.id && s.hubId !== undefined);
    if (bestSeat && ids.includes(bestSeat.hubId)) awards.push({ id: bestSeat.hubId, title: 'Player of the Match', detail: best.nick });
    const hitter = m.players.slice().sort((a, b) => b.hitBest - a.hitBest)[0], hs = hitter && m.seats.find(s => s.pid === hitter.id && s.hubId !== undefined);
    if (hs && hitter.hitBest > 0 && ids.includes(hs.hubId)) awards.push({ id: hs.hubId, title: 'Biggest Hit', detail: Math.round(hitter.hitBest) + ' m flown' });
    try { AIHub.send(Object.assign(this.snapshot(), { over: 1 }), { reliable: true }); } catch (e) { /* the round may be ending */ }
    if (this.evBuf.length) try { AIHub.send({ t: 'e', l: this.evBuf.splice(0) }, { reliable: true }); } catch (e) { /* ending */ }
    AIHub.finish({ standings, scores, stats, awards });
    if (!m.over) m.fullTime();
  },
  onLeave(id) {
    (this.gone || (this.gone = {}))[id] = true;
    const m = this.m; if (!m) { this.seats = (this.seats || []).filter(s => s.hubId !== id); return; }
    const s = m.seats.find(q => q.hubId === id); if (s) { const p = m.players[s.pid]; if (p && p.ctl === s.i) p.ctl = -1; s.kind = 'cpu'; s.pid = -1; }
  },
  onEnd(reason) {
    this.ended = true; this.endReason = reason;
    const game = TT.game;
    try { game.audio.music(null); game.audio.mute(true); } catch (e) { /* no sound */ }
    TT.muted = true;
    for (const q of game.players) q.clear && q.clear();
    if (this.sub) { this.sub(); this.sub = null; }
  },
  draw(r) {
    const m = this.m;
    r.overlay(g => {
      const t = AIHub.time();
      if (t < 0 && t > -10000) FONT.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H * .35, { align: 'center', scale: 6, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 });
      if (this.ended || (m && m.over)) { UI.panel(g, r.W / 2 - 90, 70, 180, 40, { alpha: .9 }); FONT.title(g, 'FULL TIME', r.W / 2, 76, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] }); UI.txt(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, r.W / 2, 96, '#ffffff', { align: 'center' }); }
    });
  }
};
/* ---- the session card: the game's own, while the players get ready (no menus, no choices) ---- */
TT.scenes.card = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data || {}; this.t = 0;
    BG.ensure(Net.setup ? Net.setup.venue : 'docks', 'mud', Net.setup ? Net.setup.away : 'gul', 'dusk');
    TT.sound.music('title');
    this.R = SESSION && AIHub.rng ? AIHub.rng('card') : TT.makeRng(3);
  },
  update(dt) {
    this.t += dt; BG.update(dt);
    const game = TT.game, I = game.input;
    if (!SESSION || !Net.info || Net.server) return;
    // a pad's Cross or Start is Ready, Triangle more time (Enter and M come straight from the keyboard: Net.boot)
    if ((I.pressed('start') || I.pressed('confirm') || I.pressed('x')) && !Net.answered) { AIHub.answer('ready'); I.consumeAll(); }
    if (I.pressed('tri')) AIHub.answer('more');
    const ck = I.clicked();
    if (ck && this.readyBtn && UI.inRect(ck, this.readyBtn)) AIHub.answer('ready');
    if (ck && this.moreBtn && UI.inRect(ck, this.moreBtn)) AIHub.answer('more');
    for (const rg of Net.cardRig || []) rg.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, pose: 'hips' });
  },
  draw(r) {
    BG.draw(r, .55);
    r.overlay(g => {
      const cx = r.W / 2, c = Net.card || {}, S = Net.setup || { away: 'gul', venue: 'docks' };
      FONT.title(g, 'THUGBY TURBO', cx, 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      UI.txt(g, 'MUDLARKS v ' + TT.TEAMS[S.away].short + '  -  ' + TT.VENUES[S.venue].name, cx, 40, '#c8d0e8', { align: 'center' });
      UI.txt(g, 'HOW TO WIN: SCORE MORE POINTS THAN THE OTHER TEAM', cx, 52, '#ffe060', { align: 'center' });
      const ps = Net.seats || [], w = Math.min(96, (r.W - 20) / Math.max(1, ps.length));
      ps.forEach((s, k) => {
        const x = cx - (ps.length * w) / 2 + k * w, y = 66, ready = (c.ready || []).includes(s.hubId);
        UI.panel(g, x + 2, y, w - 4, 56, { border: s.color, alpha: .9 });
        if (Net.cardRig && Net.cardRig[k] && TT.cfg.present) Net.cardRig[k].drawPortrait(g, x + w / 2 - 14, y + 4, 28, { zoom: 2.2, turn: .3, bg: '#203050' });
        UI.txt(g, s.label, x + w / 2, y + 35, s.color, { align: 'center' });
        UI.txt(g, s.team ? 'AWAY' : 'HOME', x + w / 2, y + 44, '#a8b0c8', { align: 'center', font: 'tiny' });
        if (ready) UI.txt(g, '✓ READY', x + w / 2, y + 58 - 12, '#80ff90', { align: 'center', font: 'tiny' });
      });
      const I = TT.game.input;
      UI.prompt(g, '{b:stick} RUN  {b:l1}{b:r1} PASS  {b:x} TACKLE / STEP  {b:ci} KICK  {b:turbo} TURBO', cx, 130, I, { align: 'center' });
      const left = c.left !== null && c.left !== undefined ? 'STARTS IN ' + Math.ceil(c.left / 1000) : c.starting ? 'STARTING...' : '';
      UI.txt(g, c.paused ? 'PAUSED: PLAYERS ASKED FOR MORE TIME' : left, cx, 148, c.paused ? '#ff9080' : '#ffffff', { align: 'center', scale: 2 });
      this.readyBtn = [cx - 110, 170, 100, 20]; this.moreBtn = [cx + 10, 170, 100, 20];
      UI.panel(g, ...this.readyBtn, { focus: true }); UI.prompt(g, '{b:confirm} READY', cx - 60, 175, I, { align: 'center' });
      UI.panel(g, ...this.moreBtn); if (I.lastDevice === 'gamepad') UI.prompt(g, '{b:tri} MORE TIME', cx + 60, 175, I, { align: 'center' }); else { const w = UI.glyph(g, '', cx + 18, 174, I, { raw: 'M' }); UI.txt(g, 'MORE TIME', cx + 22 + w, 176, '#ffffff'); }
      if (c.asking) UI.txt(g, c.asking + ' ASKED FOR MORE TIME' + (c.asked ? ' (YOU TOO)' : ''), cx, 196, '#a8b0c8', { align: 'center', font: 'tiny' });
    });
  }
});


/* ==== 90-start.js ==== */
/* ---- START: the game, its settings and pause menu, the boot, deep links, touch-only mode, game.debug ---- */
const AIH = typeof AIHub !== 'undefined' ? AIHub : null;
const SESSION = TT.SESSION = !!(AIH && AIH.active);
const SETTINGS = [
  { key: 'glyphs', group: 'Display', label: 'Controller buttons', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], help: 'The button symbols in every prompt when you play with a controller', apply: (g, v) => { (g.players || [g.input]).forEach(p => { p.glyphs = v; }); } },
  { key: 'uiScale', group: 'Display', label: 'TV text size', type: 'select', value: 'Large', options: ['Large', 'Normal'], help: 'Large: bigger prompts in play and bigger menu screens, for a TV across the room', apply: (g, v) => { if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('tt-large', v === 'Large'); } },
  { key: 'camera', group: 'Display', label: 'Camera', type: 'select', value: 'Broadcast', options: ['Broadcast', 'High', 'Overhead'], help: 'The match camera (V or R3 cycles it in play)' },
  { key: 'difficulty', group: 'Game', label: 'Difficulty', type: 'select', value: 'Pro', options: ['Pro', 'Rookie', 'Legend'], help: 'How sharp the CPU is. Each cup opponent is shifted one step from its own level' },
  { key: 'halves', group: 'Game', label: 'Half length', type: 'select', value: '2 min', options: ['2 min', '3 min', '4 min', '5 min'], help: 'Minutes of running clock a half (the TV clock shows sevens time)' },
  { key: 'suddenDeath', group: 'Game', label: 'Sudden death in Exhibition', type: 'select', value: 'On', options: ['On', 'Off'], help: 'Level at full time: the next score wins (the cup always plays it)' },
  { key: 'autoSwitch', group: 'Game', label: 'Auto-switch', type: 'select', value: 'Assisted', options: ['Assisted', 'Full', 'Manual'], help: 'Assisted: to the best defender when the ball is passed or kicked. Full: always. Manual: buttons and mouse only' },
  { key: 'passAssist', group: 'Game', label: 'Pass assist', type: 'select', value: 'On', options: ['On', 'Off'], help: 'On: a pass button with nobody on that side throws to the other side. Off: it is a dummy' },
  { key: 'turboMode', group: 'Game', label: 'Turbo', type: 'select', value: 'Hold', options: ['Hold', 'Toggle'] },
  { key: 'commentary', group: 'Game', label: 'Commentary', type: 'select', value: 'On', options: ['On', 'Text only', 'Off'] },
  { key: 'replays', group: 'Game', label: 'Replays', type: 'select', value: 'Big moments', options: ['Big moments', 'All tries', 'Off'] },
  { key: 'refCone', group: 'Game', label: 'Show the ref\'s view', type: 'select', value: 'On', options: ['On', 'Off'], help: 'His sight cone on the grass: foul behind his back at your own risk' },
  { key: 'bigHeads', group: 'Game', label: 'Big heads (win the Mega Cup to unlock)', type: 'select', value: 'Off', options: ['Off', 'On'], apply: (g, v) => { TT.cheats.bigHeads = v === 'On' && TT.unlocked('cup'); if (MS.pres) MS.pres.bigHeads(TT.cheats.bigHeads); } },
  { key: 'crowd', group: 'Sound', label: 'Crowd volume', type: 'slider', value: .8 }
];
const pauseItems = () => {
  const g = TT.game;
  if (SESSION || g.sceneName !== 'match' || !MS.data || MS.data.attract) return [];
  const out = [];
  if (!MS.data.session) out.push(['Restart match', () => { g.resume(); g.go('match', Object.assign({}, MS.data, { seed: TT.newSeed() })); }]);
  out.push(['Dev mode', () => { g.resume(); TT.dev.openPanel(); }]);
  return out;
};
const game = TT.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', id: 'thugby-turbo', input: KEYS, bg: '#05060a',
  autoPause: !SESSION, corner: !SESSION, fullscreen: SESSION ? false : undefined,
  menu: SESSION ? { quit: false, items: [], settings: SETTINGS, controls: TT.ACTION_NAMES } : { items: pauseItems, settings: SETTINGS, controls: TT.ACTION_NAMES, quit: 'title' }
});
TT.unlocked = k => !!(TT.store.get('thugby:unlocks', {}) || {})[k];
TT.unlock = k => { const u = Object.assign({}, TT.store.get('thugby:unlocks', {}) || {}); u[k] = true; if (!TT.noStore) TT.store.set('thugby:unlocks', u); };
game.settings.set && game.settings.glyphs && (game.input.glyphs = game.settings.glyphs);
TUNE.load();
TT.sound.init(game);
TT.arcade = new E.Arcade(game, { id: 'thugby', idle: 10, demo: 600, scores: 8, hud: false, colors: ['#ffe060', '#ffffff', '#ffb347'] });
// the records' tables start with the cast's initials
for (const mode in TT.RECORD_SEED) if (!TT.arcade.table(mode).length && !HEADLESS) E.store.set('arcade:thugby:' + mode, TT.RECORD_SEED[mode].map(([name, score]) => ({ name, score })));
/** joiners get the game's glyphs too */
TT.applyGlyphs = () => { for (const p of game.players) p.glyphs = game.settings.glyphs; };
/* ---- touch-only devices: no touch controls; "Controller or keyboard required" and the Settings button ---- */
TT.touchOnly = false;
if (!HEADLESS && typeof matchMedia === 'function') {
  const coarse = matchMedia('(any-pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  TT.touchOnly = coarse && !fine && !(navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean));
  const leave = () => { if (TT.touchOnly) { TT.touchOnly = false; } };
  addEventListener('gamepadconnected', leave); addEventListener('keydown', leave);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') leave(); });
}
// no touch controls anywhere (TASK: a controller or a keyboard is required): the touch stick stays off whatever a scene or
// the engine's touch setting asks (they would turn it back on as each scene sets its, empty, touch buttons)
Object.defineProperty(game.input, 'touchEnabled', { get: () => false, set() {}, configurable: true });
/* ---- the scenes ---- */
const scenes = Object.assign({}, TT.scenes);
/* ---- deep links (#title, #menu, #cup, #training, #training/3, #match, #match/docks, #attract, #records, #about, #credits, #card) ---- */
const [first, part] = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/');
const deep = () => {
  if (first === 'match') return ['match', { home: 'mud', away: part === 'megadome' ? 'meg' : part === 'furnace' ? 'irn' : part === 'docks' ? 'gul' : 'bad', venue: TT.VENUES[part] ? part : 'muddington', exhibition: true }];
  if (first === 'training' && part) return ['match', { home: 'mud', away: 'bad', venue: 'muddington', drill: TT.DRILLS[+part - 1] ? TT.DRILLS[+part - 1].id : 'legs', time: 'day', weather: 'clear' }];
  if (first === 'attract') return ['match', TT.attractData ? TT.attractData(0) : { attract: true }];
  if (first === 'card') return ['card', { demo: true }];
  if (scenes[first]) return [first, {}];
  return ['title', {}];
};
const [startScene, startData] = SESSION ? ['card', { waiting: true }] : deep();
game.start({
  scenes, scene: startScene, data: startData,
  boot: { title: 'THUGBY TURBO', version: '1.0', accent: '#f0c040', messages: ['Inflating the ball', 'Ironing the kits', 'Hiding the chicken', 'Warming the pies'],
    steps: [
      ['Painting the pitch', () => { Stadium.get('muddington', 'mud'); }],
      ['Lacing the boots', () => { for (const id of TT.TEAM_ORDER) TT.makeRig(TT.TEAMS[id].roster[0], TT.TEAMS[id].home); }],
      ['Painting the posts', () => { TT.attractData = TT.attractData || (() => ({ attract: true })); }],
      ['Writing the commentary', () => { void TT.LINES; }]
    ] }
});
if (SESSION && TT.Net) TT.Net.boot();
/* ---- game.debug: the tests' and tools' handle ---- */
game.debug = {
  snapshot() {
    const m = MS.m, s = { scene: game.sceneName, attract: !!(MS.data && MS.data.attract), dev: { open: !!(TT.dev && TT.dev.open) }, touchOnly: TT.touchOnly };
    if (m && game.sceneName === 'match') {
      const b = m.ball;
      Object.assign(s, { phase: m.phase, sub: m.sub, half: m.half, clock: +m.clock.toFixed(2), score: m.score.slice(), hype: m.hype.map(Math.round), possession: m.poss, over: m.over, sudden: m.sudden, hooter: m.hooter,
        ball: { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), state: b.st, holder: b.holder, kind: b.kind },
        players: m.players.map(p => ({ id: p.id, team: p.team, role: p.role, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), st: p.st, ctl: p.ctl })),
        ref: { x: Math.round(m.ref.x), y: Math.round(m.ref.y), facing: +m.ref.f.toFixed(2), down: m.ref.down > 0 }, setpiece: m.setp ? { kind: m.setp.kind, sub: m.setp.sub } : null,
        cards: m.players.filter(p => p.st === 'bin' || p.st === 'off').map(p => p.id), powerups: m.powerups.filter(q => !q.taken).map(q => q.kind), hazards: m.hazards.map(h => h.kind),
        watchdog: m.counts.watchdog || 0, replay: !!(MS.rep && MS.rep.play), drill: TT.Drills && TT.Drills.state ? TT.Drills.state() : null, session: TT.Net ? TT.Net.state() : null });
    }
    if (TT.Cup) s.cup = TT.Cup.state();
    return s;
  },
  teleport(id, x, y) { const p = MS.m && MS.m.players[id]; if (p) { p.x = x; p.y = y; p.vx = p.vy = 0; } },
  give(id) { if (MS.m) MS.m.force('give', { id }); },
  force(name, o) { if (MS.m) return MS.m.force(name, o || {}); },
  tune(key, v) { return TUNE.set(key, v); },
  seed(n) { TT.seedNext = n; },
  step(s) { game.advance(s); },
  drill(n) { game.go('match', { home: 'mud', away: 'bad', venue: 'muddington', drill: TT.DRILLS[n] ? TT.DRILLS[n].id : n, time: 'day', weather: 'clear' }, { fade: 0 }); },
  go(scene, data) { game.go(scene, data || {}, { fade: 0 }); }
};
if (typeof window !== 'undefined') window.__thugby = { game, TT };


})();
