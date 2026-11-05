/* ICE HOC-KABOOM (one IIFE, built from src/ by tools/build.mjs) */
(() => {
/* ---- 00-head.js ---- */
/* =====================================================================================================================
 * ICE HOC-KABOOM  (an original over-the-top arcade hockey game on my-3D2dge v0.85.2)
 * THE CORE LOOP: skate, dangle and rip the puck past the goalie while you hammer rivals through the glass; fill your
 * team's BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn.
 *
 * 3-on-3 with goalies on a broadcast camera (threequarter, pitch 55; Overhead = topdown; ice-level brawler for fights,
 * replays, intros and celebrations). Modes: the Cup Run (5 chapters), Exhibition (1-4 local players), Practice (7 drills),
 * Online (AI Hub shared-world sessions, 1-4 seats), Records, Settings, About. Attract mode after 10 s idle on menus;
 * Dev Mode from the pause menu. Every system is data driven: teams, arenas, chapters, cutscenes, objectives, commentary,
 * power-ups and tuning (T) live in tables a designer can extend.
 * Source modules are concatenated in name order into this one IIFE by tools/build.mjs.
 * ===================================================================================================================== */
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const TAU = Math.PI * 2, PI = Math.PI;
const VERSION = '1.0.0';
const GAME_TITLE = 'Ice Hoc-Kaboom';
/** HUB: true when AI Hub opened the page for a session (then there is no title, menu, pause or dev mode) */
const HUB = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
const NODE = typeof document === 'undefined' || !document.createElement;

/* ---- CONTROLS: one game on every device. DualSense / standard mapping, keyboard (WASD + J K L I, Shift turbo, Space
 * deke) and mouse (left shoots, right passes, middle saucers, the pointer aims). E.Input.DEFAULT's menu keys stay ---- */
const MK = E.Input.DEFAULT;
const HOCKEY_KEYS = {
  up: MK.up, down: MK.down, left: MK.left, right: MK.right,
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'], lob: ['KeyI', 'Mouse1', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'], switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11'],
  start: MK.start, pause: MK.pause, confirm: MK.confirm, cancel: MK.cancel
};
const CONTROL_NAMES = { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp', switch: 'Switch player', camera: 'Camera', attack: false, dash: false, skill: false, jump: false };

/* ---- SETTINGS (the engine's Display, Sound, Comfort and Controls stay; these join them under Game). Every one is read
 * live from game.settings ---- */
const SETTINGS = [
  { key: 'buttons', label: 'Button symbols', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', help: 'Which symbols the prompts show for a controller',
    apply: (g, v) => { for (const I of g.players || [g.input]) I.glyphs = v; if (g.settings && g.settings.glyphs !== v && g.settings.spec('glyphs')) g.settings.set('glyphs', v); } },
  { key: 'difficulty', label: 'Difficulty', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star'], ['legend', 'Legend']], value: 'pro', help: 'How smart and quick the CPU skaters and goalies are' },
  { key: 'periodLen', label: 'Period length', options: [['60', '1:00'], ['90', '1:30'], ['120', '2:00'], ['180', '3:00'], ['240', '4:00']], value: '120', help: 'Exhibition default' },
  { key: 'camera', label: 'Camera', options: [['broadcast', 'Broadcast'], ['overhead', 'Overhead']], value: 'broadcast', help: 'Also R3 / V in play' },
  { key: 'camDist', label: 'Camera distance', options: [['near', 'Near'], ['normal', 'Normal'], ['far', 'Far']], value: 'normal' },
  { key: 'commentary', label: 'Commentary', value: true, help: 'Chuck and Moose in the booth' },
  { key: 'subtitles', label: 'Subtitles', value: true },
  { key: 'voices', label: 'Voices volume', value: .8, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
  { key: 'crowdVol', label: 'Crowd volume', value: .8 },
  { key: 'intros', label: 'Player intros', value: true },
  { key: 'replays', label: 'Replays', options: [['auto', 'Auto'], ['off', 'Off']], value: 'auto' },
  { key: 'flood', label: 'Flood Wagon', options: [['ask', 'Ask'], ['always', 'Always'], ['never', 'Never']], value: 'ask', help: 'The intermission minigame' },
  { key: 'trail', label: 'Puck trail', options: [['off', 'Off'], ['streak', 'Streak'], ['glow', 'Glow']], value: 'streak' },
  { key: 'tips', label: 'Coach Marge tips', value: true },
  { key: 'resetTips', label: 'Reset tips', options: [['no', 'Keep'], ['yes', 'Reset now']], value: 'no', help: 'Show every tip again',
    apply: (g, v) => { if (v === 'yes') { E.store.set('ihk:tips', {}); Promise.resolve().then(() => g.settings.set('resetTips', 'no')); } } }
];

/* ---- THE GAME ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: HOCKEY_KEYS, bg: '#05070d', id: 'ice-hoc-kaboom', autoPause: !HUB,
  menu: HUB ? { items: [], settings: SETTINGS, controls: CONTROL_NAMES, quit: false }
    : { items: [['Objectives & Info', () => Match.showInfo()], ['Restart Game', () => Match.restart()], ['Dev Mode', () => Dev.open()]], settings: SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const P = game.particles, L = game.lights, A = game.audio;
if (!NODE) try { new E.Shell(game, { theme: { ink: '#eef4ff', paper: 'rgba(8,14,28,.92)', accent: '#ffd36a', muted: '#9fb2cc', danger: '#ff6b6b', line: 'rgba(255,211,106,.28)', font: 'system-ui, "Segoe UI", sans-serif', titleFont: 'Impact, "Arial Black", sans-serif' } }); } catch (e) { game.fail('shell', e); }
/** S(key): a setting, read live */
const S = k => game.settings[k];
const scenes = {};

/* ---- 01-util.js ---- */
/* ---- U: small math and text helpers; RNG: the simulation's and the presentation's random streams. The simulation
 * draws only from RNG.sim (seeded per match), so the same seed and inputs play the same game; particles, crowd and
 * commentary draw from RNG.fx ---- */
const U = (() => {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
  /** distance from point (x, y) to segment a-b, and how far along it (0..1) */
  const segPt = (x, y, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, u = clamp(((x - ax) * vx + (y - ay) * vy) / l, 0, 1); return { d: Math.hypot(ax + vx * u - x, ay + vy * u - y), u }; };
  /** first time t in 0..1 that a moving point p + v t comes within r of circle c (null if never) */
  const sweepCircle = (x, y, vx, vy, cx, cy, r) => {
    const fx = x - cx, fy = y - cy, a = vx * vx + vy * vy, b = 2 * (fx * vx + fy * vy), c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0; if (a < 1e-9) return null;
    const disc = b * b - 4 * a * c; if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a); return t >= 0 && t <= 1 ? t : null;
  };
  /** a roughly normal number (mean 0, sd 1) from a [0,1) stream */
  const gauss = r => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) * 1.732; };
  /** names for the pixel font: accents dropped, anything else outside ASCII becomes '?' (hub names are never HTML) */
  const sanitize = (s, n = 14) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').trim().slice(0, n) || 'PLAYER';
  const mmss = s => { s = Math.max(0, Math.ceil(s - 1e-6)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const shuffle = (r, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
  const ord = n => ['1ST', '2ND', '3RD'][n - 1] || (n + 'TH');
  const kmh = uPerS => Math.round(uPerS / 16 * 3.6);
  const smooth = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
  return { dist, angTo, angDiff, segPt, sweepCircle, gauss, sanitize, mmss, pick, shuffle, hashStr, fill, ord, kmh, smooth };
})();
const RNG = { sim: E.rng(1), fx: E.rng(2), seedN: 1, seed(n) { RNG.seedN = (n >>> 0) || 1; RNG.sim = E.rng(RNG.seedN); } };

/* ---- Bus: the simulation's events (Appendix B). on(type, fn) hears them for presentation (Fx, Talk, Crowd, the
 * replay's marks); sim(type, fn) for the rules (stats, objectives, BOOM). A network client re-plays the host's events
 * to the presentation only (present(e)) ---- */
const Bus = (() => {
  const pres = {}, rules = {}; let log = [], id = 0;
  const call = (map, e) => { for (const fn of (map[e.type] || []).concat(map['*'] || [])) try { fn(e); } catch (err) { game.fail('event ' + e.type, err); } };
  return {
    on(type, fn) { (pres[type] = pres[type] || []).push(fn); },
    sim(type, fn) { (rules[type] = rules[type] || []).push(fn); },
    emit(type, data = {}) {
      const e = Object.assign({ type, id: ++id, at: game.time }, data);
      log.push(e); if (log.length > 600) log.splice(0, 200);
      call(rules, e); if (!Bus.mute) call(pres, e);
      return e;
    },
    present(e) { call(pres, e); },
    log: () => log, reset() { log = []; }, mute: false, get lastId() { return id; }
  };
})();

/* ---- 03-tuning.js ---- */
/* ---- T: every tunable number (Appendix A). Each row is a live Dev slider: [group, key, default, min, max, step, label].
 * T.key reads the live value; T.reset(key), T.resetAll(); saved in E.store('dev:tuning'). aiSkillHome / aiSkillAway
 * below 0 mean "by difficulty" ---- */
const T = (() => {
  const ROWS = [
    ['Skating', 'skateMax', 132, 80, 200, 1, 'Top speed (u/s, rating 3)'], ['Skating', 'skateAccel', 300, 120, 600, 5, 'Acceleration'],
    ['Skating', 'iceGlide', 28, 0, 120, 1, 'Coasting deceleration'], ['Skating', 'turnSlow', 5, 1, 10, .1, 'Turn rate, slow (rad/s)'],
    ['Skating', 'turnFast', 2.6, 1, 10, .1, 'Turn rate, top speed'], ['Skating', 'edgeGrip', 6, 1, 20, .5, 'Edge grip (sideways decay)'],
    ['Skating', 'stopDecel', 700, 300, 1400, 10, 'Hockey-stop deceleration'], ['Skating', 'turboMul', 1.45, 1, 2, .01, 'Turbo speed factor'],
    ['Skating', 'turboDrain', .45, 0, 2, .01, 'Turbo drain /s'], ['Skating', 'turboRegen', .18, 0, 2, .01, 'Turbo regen /s'],
    ['Puck & Passing', 'puckFriction', 26, 0, 80, 1, 'Puck friction'], ['Puck & Passing', 'puckDrag', .12, 0, .5, .01, 'Puck drag'],
    ['Puck & Passing', 'boardBounce', .62, .2, 1, .01, 'Boards restitution'], ['Puck & Passing', 'pickupRadius', 8, 4, 16, .5, 'Blade pickup radius'],
    ['Puck & Passing', 'passMin', 240, 150, 600, 5, 'Pass speed min'], ['Puck & Passing', 'passMax', 420, 150, 600, 5, 'Pass speed max'],
    ['Puck & Passing', 'saucerApex', 10, 4, 24, .5, 'Saucer apex'],
    ['Shooting', 'wristSpeed', 345, 200, 500, 5, 'Wrist shot speed'], ['Shooting', 'slapBase', 380, 200, 600, 5, 'Slapshot base'],
    ['Shooting', 'slapGain', 160, 0, 400, 5, 'Slapshot charge gain'], ['Shooting', 'slapCharge', .9, .3, 2, .05, 'Seconds to full charge'],
    ['Shooting', 'oneTimerBonus', 1.15, 1, 1.6, .01, 'One-timer factor'], ['Shooting', 'shotError', 1, 0, 3, .05, 'Shot error scale'],
    ['Goalies', 'goalieReact', .16, .05, .4, .005, 'Base reaction (s)'], ['Goalies', 'goalieLateral', 150, 60, 300, 5, 'Lateral speed'],
    ['Goalies', 'goalieReach', 1, .6, 1.6, .01, 'Save-shape scale'], ['Goalies', 'gloveCatch', .55, 0, 1, .01, 'Glove freeze chance'],
    ['Goalies', 'reboundSpeed', .35, 0, .8, .01, 'Rebound factor'], ['Goalies', 'kaboomBlast', .6, 0, 1, .01, 'Kaboom blast carries in'],
    ['Hitting', 'checkPower', 1, .3, 3, .05, 'Check impulse scale'], ['Hitting', 'knockdown', 185, 60, 300, 5, 'Big-hit threshold'],
    ['Hitting', 'glassCrack', 170, 80, 400, 5, 'Glass crack speed'], ['Hitting', 'glassShatter', 240, 80, 400, 5, 'Glass shatter speed'],
    ['Hitting', 'accidentalHit', 180, 80, 400, 5, 'Knockdown with no check'],
    ['AI', 'aiSkillHome', -.05, -.05, 1, .05, 'Home AI skill (<0: by difficulty)'], ['AI', 'aiSkillAway', -.05, -.05, 1, .05, 'Away AI skill (<0: by difficulty)'],
    ['AI', 'aiAggression', .5, 0, 1, .05, 'Check vs poke'], ['AI', 'aiItemGreed', 120, 0, 300, 5, 'Item detour range'],
    ['AI', 'aiShootRange', 200, 80, 400, 5, 'Shooting zone'],
    ['BOOM & Items', 'boomGain', .8, 0, 4, .05, 'All BOOM gains'], ['BOOM & Items', 'kaboomTime', 15, 5, 40, 1, 'KABOOM seconds'],
    ['BOOM & Items', 'itemEvery', 35, 8, 120, 1, 'Mean seconds between throws'],
    ['Fights', 'fightBalance', 100, 40, 200, 5, 'Fighter balance'], ['Fights', 'fightGrudge', 40, 0, 100, 1, 'Prompt threshold'],
    ['Fights', 'fightMax', 3, 0, 10, 1, 'Fights per game'], ['Fights', 'sinBin', 20, 5, 60, 1, 'Sin bin seconds'],
    ['Match', 'periodLen', 120, 30, 300, 5, 'Exhibition period (s)'], ['Match', 'gameSpeed', 1, .25, 2, .05, 'Game speed'],
    ['Match', 'crowdHype', 1, 0, 2, .05, 'Crowd reaction scale']
  ];
  const T = {}, def = {}, meta = ROWS.map(([group, key, value, min, max, step, label]) => ({ group, key, value, min, max, step, label }));
  for (const m of meta) { def[m.key] = m.value; T[m.key] = m.value; }
  const save = () => { const out = {}; for (const k in def) if (T[k] !== def[k]) out[k] = T[k]; E.store.set('dev:tuning', out); };
  Object.defineProperties(T, {
    meta: { value: meta }, def: { value: def },
    set: { value(k, v) { const m = meta.find(x => x.key === k); if (!m) return; T[k] = clamp(+v, m.min, m.max); if (k === 'gameSpeed') game.timeScale = T[k]; save(); } },
    reset: { value(k) { if (k in def) { T[k] = def[k]; if (k === 'gameSpeed') game.timeScale = 1; save(); } } },
    resetAll: { value() { for (const k in def) T[k] = def[k]; game.timeScale = 1; save(); } },
    load: { value() { if (HUB) return; const s = E.store.get('dev:tuning', {}) || {}; for (const k in s) if (k in def && typeof s[k] === 'number') T[k] = s[k]; } },
    changed: { value() { const out = {}; for (const k in def) if (T[k] !== def[k]) out[k] = T[k]; return out; } }
  });
  return T;
})();

/* ---- 04-data-teams.js ---- */
/* ---- TEAMS (section 11.1): 3 skaters + 1 goalie each. Skater ratings r: [Spd, Sht, Pas, Hit, Fgt, Hnd] 1-5; goalie
 * r: [Rfx, Size, Reb]. Logos are shape lists in a 24 x 24 space (Logo below samples and draws them): one table feeds the
 * center-ice paint, the score bug, the menu cards and the bench banners. Voices feed the babble synth ---- */
const V = (base, range, speed, wave, fmt, gruff, vib) => ({ base, range, speed, wave, fmt, gruff, vib });
const TEAMS = {
  muskrats: {
    id: 'muskrats', name: 'MUKLUK FALLS MUSKRATS', short: 'MUSKRATS', abbr: 'MUK', town: 'MUKLUK FALLS',
    dark: '#5a3a22', trim: '#e8b43a', light: '#f3e6c8', pants: '#3a2414', song: 'muk',
    logo: [['disc', 12, 12, 11.6, '#e8b43a'], ['disc', 12, 12, 9.4, '#3a2414'], ['disc', 6.2, 6.8, 2.6, '#8a5a32'], ['disc', 17.8, 6.8, 2.6, '#8a5a32'], ['disc', 6.2, 6.8, 1.2, '#d89a6a'], ['disc', 17.8, 6.8, 1.2, '#d89a6a'],
      ['ell', 12, 12.5, 7, 6.2, '#8a5a32'], ['ell', 12, 16, 4.4, 3.2, '#d8b088'], ['disc', 9, 10.6, 1.4, '#ffffff'], ['disc', 15, 10.6, 1.4, '#ffffff'], ['disc', 9.3, 10.9, .7, '#141010'], ['disc', 15.3, 10.9, .7, '#141010'],
      ['ell', 12, 14.2, 1.6, 1.1, '#2a1a10'], ['rect', 10.8, 16.6, 2.4, 3.2, '#fff6e0'], ['rect', 11.85, 16.6, .4, 3.2, '#c8b898'], ['rect', 5, 15.5, 3, .5, '#2a1a10'], ['rect', 16, 15.5, 3, .5, '#2a1a10']],
    players: [
      { num: 9, name: 'DUNNY', full: 'Duncan "Dunny" MacPhail', pos: 'C', build: 'heroic', r: [4, 3, 5, 3, 2, 4], hand: 'L', hair: { style: 'short', color: '#c87a3a' }, skin: '#f0c8a0', voice: V(185, 4, 11, 'pulse', 1, .05), celeb: 'pump', letter: 'C' },
      { num: 19, name: 'SNIPES', full: 'Priya "Snipes" Sandhu', pos: 'W', build: 'heroic', r: [5, 5, 3, 2, 2, 5], hand: 'R', hair: { style: 'ponytail', color: '#1a1010' }, skin: '#b07850', voice: V(300, 5, 14, 'pulse', 1.1, 0), celeb: 'sniper' },
      { num: 44, name: 'BIG LOU', full: 'Lou "Big Lou" Beaudoin', pos: 'D', build: 'bulky', r: [2, 4, 2, 5, 5, 2], hand: 'R', hair: { style: 'short', color: '#2a1a12' }, skin: '#d8a880', beard: '#3a2418', voice: V(95, 2, 7, 'saw', .85, .1), celeb: 'guitar', letter: 'A' }
    ],
    goalie: { num: 31, name: 'LEMMY', full: 'Lemmy "The Sieve" Kowalchuk', r: [3, 4, 3], skin: '#f0d0b0', hair: { style: 'long', color: '#e0c070' }, mask: ['#e8b43a', '#5a3a22'], voice: V(170, 6, 10, 'pulse', 1, 0, [6, .04]), trait: 'posts' }
  },
  drillers: {
    id: 'drillers', name: 'DRYFORK DRILLERS', short: 'DRILLERS', abbr: 'DRY', town: 'DRYFORK',
    dark: '#1d1d22', trim: '#f07a1a', light: '#f4ece0', pants: '#141418', song: 'dry',
    logo: [['disc', 12, 12, 11.6, '#f07a1a'], ['disc', 12, 12, 9.6, '#1d1d22'], ['poly', [[12, 3.5], [16.5, 19], [7.5, 19]], '#f07a1a'], ['poly', [[12, 6.5], [14.6, 17.4], [9.4, 17.4]], '#1d1d22'],
      ['rect', 9.3, 12.4, 5.4, 1, '#f07a1a'], ['rect', 8.6, 15.2, 6.8, 1, '#f07a1a'], ['rect', 5.5, 19, 13, 1.6, '#f07a1a'], ['ell', 12, 9.5, 1.6, 2.2, '#5ac8ff'], ['poly', [[12, 6.2], [13.3, 9], [10.7, 9]], '#5ac8ff']],
    players: [
      { num: 7, name: 'RIG', full: '"Rig" McCoy', pos: 'C', build: 'heroic', r: [3, 3, 4, 3, 3, 3], hand: 'L', hair: { style: 'short', color: '#6a4a2a' }, skin: '#e0b090', voice: V(150, 3, 10, 'saw', .95, .05), celeb: 'pump' },
      { num: 15, name: 'GUSHER', full: '"Gusher" Gomez', pos: 'W', build: 'heroic', r: [4, 4, 3, 2, 2, 4], hand: 'R', hair: { style: 'spiky', color: '#1a1410' }, skin: '#c08860', voice: V(210, 5, 13, 'pulse', 1.05, 0), celeb: 'slide' },
      { num: 2, name: 'DRILL BIT', full: '"Drill Bit" Dobbs', pos: 'D', build: 'heroic', r: [3, 2, 2, 4, 3, 2], hand: 'L', hair: { style: 'bald', color: '#3a2a1a' }, skin: '#8a5a3a', voice: V(120, 3, 9, 'saw', .9, .08), celeb: 'glass' }
    ],
    goalie: { num: 35, name: 'OKAFOR', full: 'Derrick Okafor', r: [2, 3, 2], skin: '#6a4028', hair: { style: 'short', color: '#141010' }, mask: ['#f07a1a', '#1d1d22'], voice: V(140, 3, 9, 'saw', .95, .03) }
  },
  lumberjacks: {
    id: 'lumberjacks', name: 'LOGJAM LUMBERJACKS', short: 'LUMBERJACKS', abbr: 'LOG', town: 'LOGJAM',
    dark: '#b3262a', trim: '#141414', light: '#f0e6d0', pants: '#141414', song: 'log', plaid: true,
    logo: [['disc', 12, 12, 11.6, '#141414'], ['disc', 12, 12, 9.8, '#b3262a'], ['ell', 12, 10.5, 7.2, 6.4, '#a8743a'], ['ell', 12, 10.5, 5.4, 4.8, '#c8945a'], ['ell', 12, 10.5, 3.4, 3, '#a8743a'], ['ell', 12, 10.5, 1.5, 1.3, '#c8945a'],
      ['poly', [[5, 12], [19, 12], [17.5, 18], [12, 21.5], [6.5, 18]], '#5a2a14'], ['poly', [[7, 12.5], [17, 12.5], [12, 16.5]], '#c8945a'], ['disc', 9.4, 9.2, 1.1, '#141414'], ['disc', 14.6, 9.2, 1.1, '#141414'],
      ['rect', 7.6, 7.2, 3.4, .9, '#5a2a14'], ['rect', 13, 7.2, 3.4, .9, '#5a2a14'], ['rect', 10.6, 14.3, 2.8, .8, '#2a1008']],
    players: [
      { num: 10, name: 'AXEL', full: 'Axel Sundqvist', pos: 'C', build: 'heroic', r: [3, 4, 3, 3, 3, 3], hand: 'L', hair: { style: 'long', color: '#e8d090' }, skin: '#f0d0b0', beard: '#c8a060', voice: V(160, 3, 9, 'saw', .95, .06), celeb: 'guitar' },
      { num: 27, name: 'SAWDUST', full: '"Sawdust" Sally Lindgren', pos: 'W', build: 'heroic', r: [4, 4, 3, 3, 2, 4], hand: 'R', hair: { style: 'ponytail', color: '#c86a2a' }, skin: '#f0c8a8', voice: V(280, 5, 12, 'pulse', 1.1, 0), celeb: 'sniper' },
      { num: 88, name: 'BIG TIMBER', full: '"Big Timber" Thibodeau', pos: 'D', build: 'bulky', r: [2, 3, 2, 5, 4, 2], hand: 'L', hair: { style: 'long', color: '#5a3018' }, skin: '#e0b088', beard: '#5a3018', voice: V(85, 2, 7, 'saw', .8, .14), celeb: 'glass' }
    ],
    goalie: { num: 1, name: 'STUMPY', full: '"Stumpy" O\'Rourke', r: [3, 4, 3], skin: '#f0c0a0', hair: { style: 'spiky', color: '#c84a2a' }, mask: ['#b3262a', '#141414'], voice: V(200, 4, 11, 'pulse', 1, .03) }
  },
  bruisers: {
    id: 'bruisers', name: 'GRINDHOUSE BRUISE BROTHERS', short: 'BRUISE BROS', abbr: 'GRD', town: 'THE GRINDHOUSE',
    dark: '#4b2a6b', trim: '#9be04a', light: '#ece6f4', pants: '#24143a', song: 'grd',
    logo: [['disc', 12, 12, 11.6, '#9be04a'], ['disc', 12, 12, 10, '#24143a'], ['disc', 12, 12, 8.4, '#9be04a'], ['rect', 10.6, .8, 2.8, 3, '#9be04a'], ['rect', 10.6, 20.2, 2.8, 3, '#9be04a'], ['rect', .8, 10.6, 3, 2.8, '#9be04a'], ['rect', 20.2, 10.6, 3, 2.8, '#9be04a'],
      ['poly', [[3.8, 4.8], [5.8, 2.8], [8, 5], [6, 7]], '#9be04a'], ['poly', [[20.2, 4.8], [18.2, 2.8], [16, 5], [18, 7]], '#9be04a'], ['poly', [[3.8, 19.2], [5.8, 21.2], [8, 19], [6, 17]], '#9be04a'], ['poly', [[20.2, 19.2], [18.2, 21.2], [16, 19], [18, 17]], '#9be04a'],
      ['disc', 12, 12, 6.6, '#4b2a6b'], ['rect', 7.8, 8.4, 8.4, 6.2, '#e0b088'], ['rect', 7.8, 8.4, 8.4, 1.2, '#f0c8a0'], ['rect', 9.8, 8.4, .5, 4, '#a87050'], ['rect', 11.9, 8.4, .5, 4, '#a87050'], ['rect', 14, 8.4, .5, 4, '#a87050'],
      ['rect', 8.6, 14.4, 6.6, 3, '#e0b088'], ['rect', 6.4, 10.6, 1.8, 3.4, '#e0b088']],
    players: [
      { num: 66, name: 'ROCCO', full: 'Rocco Bruiser', pos: 'D', build: 'bulky', r: [3, 3, 2, 5, 5, 2], hand: 'R', hair: { style: 'spiky', color: '#141010' }, skin: '#e0a880', voice: V(105, 2, 8, 'saw', .85, .12), celeb: 'glass' },
      { num: 67, name: 'ROLLO', full: 'Rollo Bruiser', pos: 'W', build: 'bulky', r: [3, 3, 2, 5, 5, 2], hand: 'L', hair: { style: 'bald', color: '#141010' }, skin: '#e0a880', beard: '#2a1a12', voice: V(98, 2, 8, 'saw', .85, .14), celeb: 'pump' },
      { num: 12, name: 'MUMBLES', full: '"Mumbles" Malone', pos: 'C', build: 'heroic', r: [4, 4, 3, 2, 3, 4], hand: 'L', hair: { style: 'short', color: '#7a5a3a' }, skin: '#f0c8a0', voice: V(140, 2, 16, 'saw', .9, .2), celeb: 'slide' }
    ],
    goalie: { num: 29, name: 'TANK', full: '"Tank" Tankersley', r: [3, 5, 2], skin: '#c89070', hair: { style: 'short', color: '#2a1a12' }, mask: ['#9be04a', '#4b2a6b'], voice: V(90, 2, 7, 'saw', .8, .15) }
  },
  marauders: {
    id: 'marauders', name: 'MEGAPLEX MARAUDERS', short: 'MARAUDERS', abbr: 'MEG', town: 'MEGAMALL',
    dark: '#18b5b0', trim: '#e0389a', light: '#f0f8f8', pants: '#0e3a44', song: 'meg',
    logo: [['disc', 12, 12, 11.6, '#e0389a'], ['disc', 12, 12, 9.8, '#0e3a44'], ['rect', 11.2, 3, .9, 9, '#e8e8e8'], ['poly', [[12, 3.2], [19, 4.6], [12, 8.4]], '#141414'], ['disc', 14.6, 5.6, 1.1, '#ffffff'], ['rect', 14, 6.4, 1.2, .5, '#ffffff'],
      ['poly', [[4.5, 11], [19.5, 11], [17.6, 17], [7, 17]], '#18b5b0'], ['rect', 4.5, 11, 15, 1, '#e0389a'], ['rect', 8, 12.6, .8, 4, '#0e3a44'], ['rect', 11, 12.6, .8, 4, '#0e3a44'], ['rect', 14, 12.6, .8, 4, '#0e3a44'],
      ['rect', 6.4, 17.6, 12, .9, '#18b5b0'], ['disc', 8.4, 19.6, 1.5, '#e0389a'], ['disc', 16.2, 19.6, 1.5, '#e0389a'], ['rect', 2.4, 9.6, 3, .9, '#18b5b0']],
    players: [
      { num: 23, name: 'CHAD', full: 'Chad Glitterman', pos: 'C', build: 'heroic', r: [4, 3, 4, 2, 1, 4], hand: 'R', hair: { style: 'spiky', color: '#f0d070' }, skin: '#f0c0a0', voice: V(220, 6, 14, 'pulse', 1.15, 0), celeb: 'sniper' },
      { num: 8, name: 'ZOOM', full: '"Zoom" Zhang', pos: 'W', build: 'heroic', r: [5, 3, 3, 2, 2, 4], hand: 'L', hair: { style: 'short', color: '#141010' }, skin: '#e8c098', voice: V(250, 5, 15, 'pulse', 1.1, 0), celeb: 'slide' },
      { num: 5, name: 'PROMO', full: '"Promo" Perkins', pos: 'D', build: 'heroic', r: [3, 3, 3, 4, 3, 3], hand: 'R', hair: { style: 'short', color: '#a85a2a' }, skin: '#d8a078', voice: V(150, 4, 12, 'saw', 1, .04), celeb: 'pump' }
    ],
    goalie: { num: 40, name: 'KIOSK', full: '"Kiosk" Kingsley', r: [4, 3, 4], skin: '#a87050', hair: { style: 'short', color: '#141010' }, mask: ['#e0389a', '#18b5b0'], voice: V(175, 4, 11, 'pulse', 1.05, 0) }
  },
  grizzlies: {
    id: 'grizzlies', name: 'GILDED GRIZZLIES', short: 'GRIZZLIES', abbr: 'GLD', town: 'GLITTERMAN CITY', locked: true,
    dark: '#d9a520', trim: '#141414', light: '#fbf6e8', pants: '#141414', song: 'gld',
    logo: [['disc', 12, 12, 11.6, '#141414'], ['disc', 12, 12, 10, '#d9a520'], ['disc', 12, 12, 9, '#141414'], ['disc', 6.5, 10.5, 2.4, '#6a4020'], ['disc', 17.5, 10.5, 2.4, '#6a4020'], ['ell', 12, 14.2, 6.8, 6, '#6a4020'],
      ['ell', 12, 16.8, 3.6, 2.6, '#c89060'], ['ell', 12, 15.6, 1.4, 1, '#141010'], ['disc', 9.2, 13, .9, '#141010'], ['disc', 14.8, 13, .9, '#141010'],
      ['poly', [[6, 9.5], [6, 4.5], [8.8, 7], [12, 3.2], [15.2, 7], [18, 4.5], [18, 9.5]], '#ffd84a'], ['rect', 6, 8.3, 12, 1.4, '#c8901a'], ['disc', 12, 6, .9, '#ff3a5a'], ['disc', 8.4, 8.9, .6, '#5ac8ff'], ['disc', 15.6, 8.9, .6, '#5ac8ff']],
    players: [
      { num: 1, name: 'STERLING', full: 'Sterling Glitterman Jr.', pos: 'C', build: 'heroic', r: [5, 5, 4, 3, 2, 5], hand: 'L', hair: { style: 'spiky', color: '#ffe08a' }, skin: '#f4d0b0', voice: V(200, 7, 13, 'pulse', 1.12, 0), celeb: 'sniper', letter: 'C', twister: true },
      { num: 91, name: 'SILK', full: '"Silk" Sullivan', pos: 'W', build: 'heroic', r: [4, 3, 5, 2, 2, 5], hand: 'R', hair: { style: 'long', color: '#2a1a14' }, skin: '#c89070', voice: V(260, 4, 10, 'pulse', 1.05, 0), celeb: 'slide' },
      { num: 55, name: 'BRICK', full: '"Brick" Brickowski', pos: 'D', build: 'bulky', r: [3, 4, 2, 5, 5, 2], hand: 'L', hair: { style: 'bald', color: '#3a2a1a' }, skin: '#e0b088', beard: '#3a2a1a', voice: V(88, 2, 7, 'saw', .8, .15), celeb: 'glass' }
    ],
    goalie: { num: '00', name: 'THE VAULT', full: 'The Vault', r: [5, 5, 5], skin: '#c8a080', hair: { style: 'bald', color: '#141010' }, mask: ['#d9a520', '#141414'], voice: V(70, 1, 5, 'saw', .7, .2), boss: true, size: 1.75 }
  }
};
const TEAM_ORDER = ['muskrats', 'drillers', 'lumberjacks', 'bruisers', 'marauders', 'grizzlies'];
for (const id of TEAM_ORDER) { const t = TEAMS[id]; t.players.forEach((p, i) => { p.team = id; p.slot = i; p.key = id + ':' + i; }); t.goalie.team = id; t.goalie.key = id + ':g'; t.goalie.pos = 'G'; }
/** ratings -> multipliers (11.1) */
const RATE = {
  speed: d => .85 + .05 * d.r[0], shot: d => .85 + .05 * d.r[1], err: d => 1.3 - .1 * d.r[1], pass: d => .9 + .033 * d.r[2],
  hit: d => .8 + .067 * d.r[3], fight: d => .8 + .067 * d.r[4], hands: d => .85 + .05 * d.r[5]
};

/* ---- the rest of the cast: the coach, the booth, the town, the villain, the mascot and the officials (their rigs are
 * made by Rigs.cast(id)) ---- */
const CAST = {
  marge: { name: 'COACH MARGE', full: 'Coach Marge Pelletier', look: { build: 'chibi', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'ponytail', colors: { cloth: '#7a4a6a', coat: '#8a5a7a', pants: '#3a3448', hair: '#c8c8d0', skin: '#f0d0b8', trim: '#e8d8a0', boot: '#2a2420' } }, voice: V(130, 3, 7, 'saw', .9, .18) },
  gus: { name: 'OLD GUS', full: 'Old Gus', look: { build: 'chibi', size: 1.15, hat: { style: 'cap', color: '#3a5a8a' }, sleeves: 'long', outfit: 'shirt', hair: 'short', colors: { cloth: '#5a7a4a', pants: '#4a4a5a', hair: '#e8e8e8', skin: '#e8c0a0' } }, voice: V(90, 1, 5, 'saw', .8, .2) },
  doris: { name: 'DORIS', full: 'Doris the organist', look: { build: 'chibi', size: 1.15, outfit: 'robe', sleeves: 'long', hair: 'long', colors: { cloth: '#c84a7a', hair: '#e8a040', skin: '#f0d0b8', trim: '#ffd36a' } }, voice: V(240, 5, 9, 'pulse', 1.1, 0, [5, .05]) },
  glitterman: { name: 'GOLDIE GLITTERMAN', full: 'Goldie Glitterman', look: { build: 'heroic', size: 1.25, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'crown', color: '#ffd84a' }, colors: { cloth: '#141414', coat: '#d9a520', pants: '#141414', hair: '#e8d8a0', skin: '#f4d0b0', trim: '#fff0a0', boot: '#141414' } }, voice: V(150, 5, 11, 'saw', 1.05, .03) },
  pete: { name: 'POLAR PETE', full: 'Polar Pete, the MegaMall mascot', look: { build: 'bulky', size: 1.35, weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'bald', colors: { cloth: '#f4f8ff', pants: '#e8eef8', skin: '#f4f8ff', boot: '#e0e8f4', glove: '#f4f8ff', hair: '#f4f8ff' } }, voice: V(120, 8, 8, 'saw', .7, .3) },
  chuck: { name: 'CHUCK WALLOP', full: 'Chuck Wallop, play-by-play', look: { build: 'heroic', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#f4f4f0', coat: '#2a4a8a', pants: '#1a2440', hair: '#5a3a22', skin: '#f0c8a0', trim: '#c83a3a' } }, voice: V(200, 6, 15, 'pulse', 1.05, 0) },
  moose: { name: 'MOOSE PLUNKETT', full: 'Moose Plunkett, color', look: { build: 'bulky', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#f4f4f0', coat: '#7a2a2a', pants: '#2a1a1a', hair: '#8a8a8a', skin: '#e0a880', trim: '#e8c040' } }, voice: V(95, 3, 8, 'saw', .85, .16) },
  ref: { name: 'REFEREE', full: 'The referee', voice: V(160, 2, 6, 'square', 1, .05) },
  vault: { name: 'THE VAULT', full: 'The Vault' }
};
for (const id of TEAM_ORDER) for (const d of TEAMS[id].players.concat([TEAMS[id].goalie])) CAST[(id + '-' + d.name).toLowerCase().replace(/[^a-z-]/g, '')] = { name: d.name, def: d, voice: d.voice };
const castOf = id => CAST[id] || null;
/** the skater (or goalie) def by name within a team: 'muskrats', 'DUNNY' */
const defBy = (team, name) => { const t = TEAMS[team]; return t.players.find(p => p.name === name) || (t.goalie.name === name ? t.goalie : null); };

/* ---- Logo: sample(team, u, v) in 0..24 gives the top shape's color at a point (or null); draw(g, team, x, y, size)
 * paints it (a cached canvas in a browser, dots headless) ---- */
const Logo = (() => {
  const hit = (s, u, v) => {
    const k = s[0];
    if (k === 'disc') return (u - s[1]) ** 2 + (v - s[2]) ** 2 <= s[3] * s[3];
    if (k === 'ell') return ((u - s[1]) / s[3]) ** 2 + ((v - s[2]) / s[4]) ** 2 <= 1;
    if (k === 'rect') return u >= s[1] && u <= s[1] + s[3] && v >= s[2] && v <= s[2] + s[4];
    if (k === 'poly') { const P = s[1]; let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
    return false;
  };
  const col = s => s[s.length - 1];
  const sample = (team, u, v) => { const L = (TEAMS[team] || TEAMS.muskrats).logo; for (let i = L.length - 1; i >= 0; i--) if (hit(L[i], u, v)) return col(L[i]); return null; };
  const cache = new Map();
  const canvasOf = (team, size) => {
    const key = team + ':' + size; if (cache.has(key)) return cache.get(key);
    let cv = null;
    if (!NODE) { cv = E.mkCanvas(size, size); const g = cv.getContext('2d'); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = sample(team, (x + .5) * 24 / size, (y + .5) * 24 / size); if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } }
    cache.set(key, cv); return cv;
  };
  const draw = (g, team, x, y, size = 24) => { const cv = canvasOf(team, Math.round(size)); if (cv && g.drawImage) g.drawImage(cv, Math.round(x), Math.round(y)); };
  return { sample, draw, canvasOf };
})();

/* ---- 05-data-arenas.js ---- */
/* ---- ARENAS (section 11.2): every arena shares the rink; this table dresses it (floor, boards, stands, crowd, lights,
 * props, ads, items, hazards, music). Rink.dress(r) reads `dress` to place the props ---- */
const ARENAS = {
  icebox: {
    id: 'icebox', name: "THE OL' ICEBOX", town: 'MUKLUK FALLS', chapter: 1, home: 'muskrats',
    ambient: .74, lightColor: '#ffd8a0', outside: [52, 44, 40], outsideB: [62, 52, 46], ice: [212, 229, 243], boards: '#f2efe6', kick: '#e8c020', glassTint: '#cfe8ff',
    stand: { face: 'plank', side: '#6a4a30', top: '#8a6040' }, seat: ['#8a5a3a', '#7a4a2e'], fans: { toques: true, mix: ['#5a3a22', '#e8b43a', '#c83a2a', '#3a6aa8', '#f3e6c8'] },
    ads: ["MUKLUK MUFFLER & TIRE", "KOWALCHUK'S PEROGIES", "BAIT 'N' BAGELS", 'GO MUSKRATS GO'], lamps: 6, lampColor: '#ffd8a0', signs: ['BARN BURNER', 'MARGE 4 PM', 'SAVE THE ICEBOX', 'PIPESY ♥'],
    items: ['hotsauce', 'tape', 'poutine', 'boombox'], hazards: [], music: 'play', stopMusic: null, organ: true, banners: ['1962', 'CHAMPS'], dress: 'icebox'
  },
  pond: {
    id: 'pond', name: 'LAKE KABONK', town: 'LOGJAM', chapter: 2, home: 'lumberjacks',
    ambient: .6, lightColor: '#ffb070', outside: [214, 224, 236], outsideB: [190, 204, 222], ice: [200, 222, 240], boards: '#eef4fa', kick: '#eef4fa', glassTint: null, snowbanks: true,
    stand: null, seat: null, fans: { parkas: true, mix: ['#b3262a', '#141414', '#3a6aa8', '#e8b43a', '#5a8a3a'] },
    ads: [], lamps: 0, signs: ['TIMBER!', 'POND RULES', 'KABONK!'], weather: { kind: 'snow', amount: .5, wind: .2 },
    items: ['cocoa', 'tape', 'lumber', 'boombox'], hazards: ['thinice'], music: 'pond', stopMusic: 'pond', organ: false, dress: 'pond'
  },
  grindhouse: {
    id: 'grindhouse', name: 'THE GRINDHOUSE', town: 'RUSTBELT', chapter: 3, home: 'bruisers',
    ambient: .5, lightColor: '#c8ffd8', outside: [46, 50, 48], outsideB: [56, 60, 58], ice: [204, 222, 228], boards: '#d8dcd8', kick: '#9be04a', glassTint: '#b8d8c8',
    stand: { face: 'stone', side: '#3a3e44', top: '#4a4e56' }, seat: ['#3a3a44', '#4a3a5a'], fans: { mix: ['#4b2a6b', '#9be04a', '#3a3a3a', '#8a2a2a', '#5a8a3a'] },
    ads: ['RUSTBELT SCRAP', 'IRON GUT CHILI', 'BRUISE BROS GYM', 'NO REFUNDS'], lamps: 4, lampColor: '#c8ffd8', flicker: true, signs: ['DROP EM!', 'BRUISE BROS', 'BLOOD MOON? NO. PG.'],
    items: ['poutine', 'lumber', 'boombox'], hazards: ['octopus', 'rat'], music: 'grind', stopMusic: null, organ: false, dress: 'grindhouse'
  },
  mall: {
    id: 'mall', name: 'MEGAMALL ICE PALACE', town: 'MEGAMALL', chapter: 4, home: 'marauders',
    ambient: .64, lightColor: '#ffffff', outside: [196, 186, 200], outsideB: [176, 168, 186], ice: [216, 232, 246], boards: '#ffffff', kick: '#e0389a', glassTint: '#e0f4ff',
    stand: { face: 'plaster', side: '#a8a0b8', top: '#c8c0d8' }, seat: ['#18b5b0', '#e0389a'], fans: { mix: ['#18b5b0', '#e0389a', '#ffd84a', '#ffffff', '#5a5ad8'] },
    ads: ['GLITTERMAN MEGAPLEX — COMING SOON!', 'FOOD COURT ↑', 'SALE SALE SALE', 'PRETZEL PLANET'], lamps: 0, neon: ['#ff4ab8', '#4af0f0', '#ffe04a'], signs: ['SMASH THAT GLASS', 'MALL RATS?', 'NO PARKING (YET)'],
    items: ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox'], hazards: ['pete', 'drop'], music: 'mall', stopMusic: null, organ: false, dress: 'mall', noOT: true, showcase: true
  },
  dome: {
    id: 'dome', name: 'THE KABOOM DOME', town: 'GLITTERMAN CITY', chapter: 5, home: 'grizzlies',
    ambient: .5, lightColor: '#ffffff', outside: [30, 26, 34], outsideB: [40, 34, 44], ice: [214, 230, 248], boards: '#fbf6e8', kick: '#d9a520', glassTint: '#ffeec0',
    stand: { face: 'stone', side: '#2a2430', top: '#3a3240' }, seat: ['#d9a520', '#141414'], fans: { mix: ['#d9a520', '#141414', '#ffffff', '#5a3a22', '#e8b43a'] },
    ads: ['GLITTERMAN INDUSTRIES', 'GILDED GRIZZLIES', 'KABOOM CUP FINAL', 'GOLD IS GOOD'], lamps: 8, lampColor: '#ffffff', flames: true, lasers: true, signs: ['KABOOM!', 'GO MUSKRATS', 'GOLD RUSH', 'BYLAW 1897-B'],
    items: ['hotsauce', 'bricks', 'boombox'], hazards: ['octopus'], music: 'final', stopMusic: null, organ: true, dress: 'dome', boss: true
  }
};
const ARENA_ORDER = ['icebox', 'pond', 'grindhouse', 'mall', 'dome'];

/* ---- ITEMS (7.12): what fans throw, what each does (Items applies it) ---- */
const ITEM_DEFS = {
  hotsauce: { name: 'HOT SAUCE', text: 'Infinite turbo!', t: 8, color: '#e83a2a' },
  tape: { name: "GRANDMA'S TAPE", text: 'Puck glued to your stick!', t: 10, color: '#f4f4f4' },
  poutine: { name: 'POUTINE', text: 'Unstoppable! Every check is a big hit!', t: 10, color: '#e8c060' },
  lumber: { name: 'LUMBER', text: 'Next 3 shots: rockets!', t: 0, shots: 3, color: '#c8945a' },
  bricks: { name: 'BRICK PADS', text: 'Your goalie is HUGE!', t: 12, color: '#b8503a' },
  boombox: { name: 'BOOM BOX', text: '+40 BOOM!', t: 0, color: '#4af0f0' },
  cocoa: { name: 'HOT COCOA', text: 'Toasty legs! Turbo refilled!', t: 8, color: '#8a5a3a' }
};

/* ---- 06-data-story.js ---- */
/* ---- STORY (11.3): THE CUP RUN. Five chapters, five barns, five rivals; a cutscene before and after each game, one
 * choice per chapter (it sets the game's tactic), three objectives (stars) per chapter, a boss final and an ending.
 * Speakers map to the cast (voices, portraits). Cutscene steps: say, choice, move, pose, sfx, wait, cam (Appendix C) ---- */
const SPEAKERS = {
  marge: 'marge', dunny: 'muskrats-dunny', snipes: 'muskrats-snipes', lou: 'muskrats-biglou', lemmy: 'muskrats-lemmy', glitterman: 'glitterman', chuck: 'chuck', moose: 'moose',
  gus: 'gus', doris: 'doris', pete: 'pete', timber: 'lumberjacks-bigtimber', axel: 'lumberjacks-axel', rocco: 'bruisers-rocco', rollo: 'bruisers-rollo', chad: 'marauders-chad',
  sterling: 'grizzlies-sterling', vault: 'grizzlies-thevault', rig: 'drillers-rig'
};
const STORY = {
  chapters: [
    { n: 1, title: 'HOME OPENER', arena: 'icebox', rival: 'drillers', periodLen: 90, cpuStep: -1, objectives: ['win', 'onetimer', 'bighits3'], pre: 'ch1-pre', post: 'ch1-post', warmup: [1, 2, 3], at: [.12, .62],
      spotlight: 'Skating, passing, one-timers, checking, the BOOM meter, the Flood Wagon' },
    { n: 2, title: 'POND RULES', arena: 'pond', rival: 'lumberjacks', periodLen: 90, objectives: ['win', 'breakice', 'kaboom'], pre: 'ch2-pre', post: 'ch2-post', at: [.3, .38], spotlight: 'KABOOM mode, power-ups, thin ice, snowbanks' },
    { n: 3, title: 'GLOVES OFF', arena: 'grindhouse', rival: 'bruisers', periodLen: 90, objectives: ['win', 'fights2', 'ppg'], pre: 'ch3-pre', post: 'ch3-post', fightsOften: true, at: [.5, .66], spotlight: 'Fights, the sin bin, power plays, octopi and rats, chirps' },
    { n: 4, title: 'MALL BRAWL', arena: 'mall', rival: 'marauders', periodLen: 90, objectives: ['win', 'kaboomgoal', 'pete'], pre: 'ch4-pre', post: 'ch4-post', ot: 'none', showcase: true, at: [.7, .36], spotlight: 'Polar Pete, the Discount Drop, the Shootout Showcase, the manual goalie' },
    { n: 5, title: 'THE KABOOM CUP', arena: 'dome', rival: 'grizzlies', periodLen: 120, objectives: ['win', 'vaultdeke', 'hattrick'], pre: 'ch5-pre', post: 'ch5-post', boss: true, at: [.88, .6], spotlight: 'The boss: Golden Twister, The Vault, Gilded Mode, the Gilded Boost and Doris\'s organ' }
  ],
  /** each chapter's choice: [label, flags] (the tactic, Lou's rating, the bear, when Doris plays) */
  choices: {
    1: [['CLEAN AND FAST', { tactic: 'finesse', line: 'pass it like it owes us money.' }], ['MEAN AND LOUD', { tactic: 'grit', line: 'hit everything that moves. And some stuff that doesn\'t.' }]],
    2: [['CLEAN AND FAST', { tactic: 'finesse', line: 'dance around the cracks.' }], ['MEAN AND LOUD', { tactic: 'grit', line: 'make the lake shake.' }]],
    3: [['LET LOU LOOSE', { lou: 'loose' }], ['KEEP IT ON THE ICE', { lou: 'ice' }]],
    4: [['IGNORE THE BEAR', { bear: 'ignore' }], ['HUNT THE BEAR', { bear: 'hunt' }]],
    5: [['DORIS PLAYS EARLY', { doris: 'early' }], ['DORIS PLAYS LATE', { doris: 'late' }]]
  },
  cutscenes: {
    'ch1-pre': { set: 'locker', music: 'locker', cast: [['marge', 150, 60], ['dunny', 110, 84], ['snipes', 135, 92], ['lou', 175, 92], ['lemmy', 200, 84]], steps: [
      { say: 'marge', text: 'Sit down, shut up, and listen. I got a letter.', expr: 'angry' },
      { say: 'marge', text: 'Goldie Glitterman bought the land under the Icebox. Wants to pave it for a {c=#ffd36a}Megaplex Parking Experience{/c}.' },
      { say: 'dunny', text: 'A parking… experience? Beauty. Wait. No. Not beauty.' },
      { say: 'snipes', text: "This barn's got more character than his whole bank account. And his haircut." },
      { say: 'marge', text: 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever. So we win the Cup.' },
      { pose: 'lou', p: 'kneel' }, { say: 'lou', text: 'Five games, then. Like the five petals of the wild rose.' },
      { say: 'lemmy', text: "Pipesy says we win. Clang's not so sure. Clang's a pessimist." },
      { enter: 'glitterman', at: [260, 70], to: [215, 64] },
      { say: 'glitterman', text: "Enjoy the barn, folks. I've ordered the parking meters. {w=.3}Gold ones." },
      { exit: 'glitterman' },
      { choice: { who: 'marge', text: "Captain. Tell 'em how we play tonight." } },
      { say: 'dunny', text: 'We get pucks deep, we get bodies to the net, and we— uh— {$tacticLine}' },
      { say: 'marge', text: "Warm-up's on. Then we drill the Drillers." }] },
    'ch1-post': { set: 'locker', music: 'locker', cast: [['marge', 150, 60], ['dunny', 110, 84], ['snipes', 135, 92], ['lou', 175, 92], ['lemmy', 200, 84], ['glitterman', 230, 66]], steps: [
      { say: 'chuck', text: "The Muskrats take the opener! The Icebox is ROCKIN'!" },
      { say: 'glitterman', text: 'Beginner\'s luck. The meters are still on order.' },
      { say: 'lemmy', text: 'Pipesy did most of the work tonight. Clang helped.' },
      { say: 'marge', text: 'Pack your long johns. Lake Kabonk. Pond rules.' }] },
    'ch2-pre': { set: 'pond', music: 'pond', cast: [['marge', 140, 70], ['snipes', 110, 86], ['dunny', 165, 90], ['lou', 190, 80], ['lemmy', 90, 74], ['timber', 245, 76]], steps: [
      { say: 'timber', text: "Welcome to the woods, Muskrats. We don't check. We FELL." },
      { say: 'snipes', text: 'Cute beard. Did you grow it, or did a beaver move in?' },
      { say: 'lemmy', text: "The ice is talking. It says 'crack'." },
      { say: 'marge', text: "Thin ice is a tool. Hit 'em where it's thin." },
      { say: 'marge', text: "And listen. When the whole team's hummin' — hits, passes, the crowd losin' its mind — the ice starts to shake. That's a {c=#ff8a3a}KABOOM{/c}. Fill the meter and let it rip." },
      { say: 'lou', text: 'Like thunder in a teacup.' },
      { choice: { who: 'marge', text: 'So. How do we play the pond?' } },
      { say: 'dunny', text: 'Easy. We {$tacticLine}' }] },
    'ch2-post': { set: 'pond', music: 'pond', cast: [['marge', 140, 70], ['dunny', 165, 90], ['timber', 215, 80], ['snipes', 110, 86]], steps: [
      { say: 'timber', text: 'You hit like a falling spruce. Good on ya.' },
      { say: 'dunny', text: 'Thanks! You smell like one!' },
      { say: 'marge', text: 'Next stop, the Grindhouse. Bring a mouthguard. Bring two.' }] },
    'ch3-pre': { set: 'grind', music: 'locker', cast: [['marge', 120, 66], ['lou', 160, 86], ['dunny', 95, 88], ['rocco', 220, 74], ['rollo', 250, 84]], steps: [
      { say: 'rocco', text: 'Well, well. Lou Beaudoin.' }, { say: 'rollo', text: "Lou 'The Library' Beaudoin." },
      { say: 'rocco', text: 'Heard you knit now.' }, { say: 'rollo', text: 'Heard you purl.' },
      { say: 'lou', text: 'I have retired from fisticuffs, gentlemen.' },
      { say: 'marge', text: 'Retire after the game.' },
      { say: 'marge', text: "In this barn they drop the gloves, you drop 'em back. Win the scrap, win the barn. Lose it, you sit in the sin bin and think about your choices." },
      { choice: { who: 'marge', text: 'Lou. What\'s it gonna be?' } }] },
    'ch3-post': { set: 'grind', music: 'locker', cast: [['lou', 160, 86], ['rocco', 200, 78], ['rollo', 230, 84], ['marge', 110, 66]], steps: [
      { say: 'rollo', text: 'He knitted me a scarf.' }, { say: 'rocco', text: 'For my neck.' }, { say: 'rollo', text: 'Which he bruised.' },
      { say: 'lou', text: 'There is an ice pack in the pocket.' },
      { say: 'marge', text: "Next, the Megaplex. Glitterman's turf. Watch your wallets." }] },
    'ch4-pre': { set: 'mall', music: 'mall', cast: [['chad', 220, 72], ['dunny', 120, 86], ['lemmy', 150, 80], ['glitterman', 190, 64], ['pete', 260, 86], ['marge', 90, 70]], steps: [
      { say: 'chad', text: "What's up, Mall Rats! Smash that glass, bro!" }, { say: 'dunny', text: "We're Muskrats." }, { say: 'chad', text: 'Same content, bro.' },
      { say: 'glitterman', text: 'Name your price, goalie.' },
      { say: 'lemmy', text: '…Pipesy says no. Clang says no with a {c=#ff6a6a}*beep*{/c}.' },
      { pose: 'pete', p: 'wave' }, { say: 'pete', text: 'Hmmf mmf! Hmmf hmmf hmmf!' },
      { say: 'marge', text: "That bear's on the ice all game. Treat him like furniture." },
      { choice: { who: 'marge', text: 'Or do we?' } },
      { say: 'marge', text: "And win or tie, the mall's got a Shootout Showcase after. Mall money. We want it." }] },
    'ch4-post': { set: 'mall', music: 'mall', cast: [['glitterman', 200, 66], ['snipes', 130, 86], ['dunny', 160, 90], ['pete', 250, 86]], steps: [
      { say: 'glitterman', text: 'Fine. The Final. My Grizzlies. My Dome. My rules.' },
      { say: 'snipes', text: "Your Dome's gonna need a new roof." },
      { pose: 'pete', p: 'wave' }, { say: 'pete', text: 'Hmmf! Hmf hmf.' }] },
    'ch5-pre': { set: 'tunnel', music: 'final', cast: [['sterling', 220, 74], ['vault', 255, 82], ['snipes', 130, 86], ['lemmy', 100, 80], ['marge', 160, 66], ['dunny', 185, 90]], steps: [
      { say: 'sterling', text: "I've never lost. Not once. Not even at Go Fish." },
      { say: 'snipes', text: "There's a first time for everything, Goldilocks." },
      { say: 'vault', text: '…' }, { say: 'lemmy', text: "He's very big, Pipesy." },
      { say: 'marge', text: "Forty-six years behind that bench. I've seen better teams. Prettier teams. Teams that could spell." },
      { say: 'marge', text: 'Never saw one that wanted it more. Go make it go {shake}KABOOM{/shake}.' },
      { choice: { who: 'doris', text: 'Marge, hon. When do you want the song?' } }] },
    'ch5-post': { set: 'ending', music: 'victory', cast: [['dunny', 150, 80], ['snipes', 120, 88], ['lou', 180, 88], ['lemmy', 95, 82], ['marge', 205, 72], ['glitterman', 250, 70], ['gus', 70, 70], ['sterling', 270, 84]], steps: [
      { handshake: true },
      { say: 'chuck', text: 'THE KABOOM CUP IS… {shake}KA-BOOMING!{/shake}' },
      { cup: 'dunny' },
      { say: 'glitterman', text: 'My parking meters…' },
      { say: 'marge', text: 'Bylaw 1897-B, Goldie. Look it up.' },
      { say: 'gus', text: 'Yep.' },
      { say: 'sterling', text: 'Can… can I come skate at your barn sometime?' },
      { say: 'dunny', text: "Beauty. Bring skates. Leave the gold." },
      { wagon: true }] },
    teaser: { set: 'locker', music: 'locker', cast: [['marge', 150, 60], ['dunny', 110, 84], ['glitterman', 215, 64]], steps: [
      { say: 'marge', text: 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever.' },
      { say: 'glitterman', text: "I've ordered the parking meters. Gold ones." },
      { say: 'dunny', text: 'So we win the Cup. Beauty.' }] }
  }
};
/* ---- Story: the run's state and its game configs ---- */
const Story = (() => {
  const st = { chapter: 1, step: 'map', flags: {}, attempt: 0 };
  const ch = n => STORY.chapters[n - 1];
  /** the Match config for chapter n */
  function matchCfg(n) {
    const c = ch(n), f = Save.data.choices[n] || {}, cfg = {
      mode: 'story', chapter: n, home: 'muskrats', away: c.rival, arena: c.arena, periods: 3, periodLen: c.periodLen, cpuStep: c.cpuStep || 0, ot: c.ot || 'sudden', shootout: true, showcase: !!c.showcase,
      seed: n * 1000 + st.attempt, humans: [{ team: 0, input: game.input, name: 'P1' }], objectives: Objectives.list(c.objectives), tactic: { 0: f.tactic || null }, events: [], fightsOften: !!c.fightsOften, forceFights: !!c.fightsOften
    };
    if (f.lou === 'loose') cfg.mods = { 'muskrats:2': [0, 0, 0, 0, 1, 0] }; if (f.lou === 'ice') cfg.mods = { 'muskrats:2': [0, 0, 1, 0, 0, 0] };
    if (f.bear === 'hunt') cfg.huntBear = 0;
    if (c.boss) { cfg.events.push({ period: 3, kind: 'boost' }); cfg.events.push(f.doris === 'late' ? { period: 3, clock: c.periodLen / 2, kind: 'organ', k: 1.5 } : { period: 2, kind: 'organ', k: 1 }); }
    cfg.onFinal = m => game.go('results', { m }, { fade: 'wipe' });
    return cfg;
  }
  /** the boss's moments: Glitterman's Gilded Boost, Doris's organ */
  function matchEvent(m, ev) {
    if (ev.kind === 'boost') { m.boostOn = true; for (const s of m.teams[1].skaters) s.boost = 1.1; Bus.emit('boost_start', {}); Talk.speak('c', 'Glitterman on the jumbotron: "Synergy, boys!"'); }
    if (ev.kind === 'organ') { const k = ev.k || 1; Boom.add(m, 0, 30 * k); for (const s of m.teams[0].skaters) s.boost = 1 + .1 * k; m.organOn = 20; Bus.emit('organ_boost', {}); Talk.speak('c', 'DORIS! PLAY THE SONG!'); }
  }
  function validate() {
    for (const c of STORY.chapters) { if (!ARENAS[c.arena] || !TEAMS[c.rival]) throw new Error('chapter ' + c.n + ' names an unknown arena or team'); for (const o of c.objectives) if (!Objectives.KINDS[o]) throw new Error('chapter ' + c.n + ' objective ' + o + ' is unknown'); for (const id of [c.pre, c.post]) if (!STORY.cutscenes[id]) throw new Error('cutscene ' + id + ' is missing'); }
    for (const id in STORY.cutscenes) for (const [who] of STORY.cutscenes[id].cast) if (!SPEAKERS[who] || !CAST[SPEAKERS[who]]) throw new Error('cutscene ' + id + ': unknown cast ' + who);
    return true;
  }
  /** apply a chapter's choice (from the cutscene) */
  function choose(n, i) { const opt = STORY.choices[n][i]; Save.data.choices[n] = Object.assign({}, opt[1], { pick: i }); st.flags.tacticLine = opt[1].line || ''; Save.write(); return opt; }
  return { st, ch, matchCfg, matchEvent, validate, choose, get chapter() { return st.chapter; }, set chapter(v) { st.chapter = v; }, get step() { return st.step; }, set step(v) { st.step = v; } };
})();

/* ---- 07-data-text.js ---- */
/* ---- TEXT (11.5, Appendix D): the booth's commentary by event (c: CHUCK WALLOP, play-by-play; m: MOOSE PLUNKETT,
 * color), Moose's filler, chirps, Coach Marge's tips ({action} becomes a button chip), three-stars lines, pep talks after
 * a loss, menu blurbs. Tokens: {name} {team} {victim} {goalie} {score} {arena} {period} {a} {b} {home} {away} {hs} {as} ---- */
const TEXT = {
  talk: {
    drop: [['c', "Puck's dropped and we're under way at {arena}!"], ['c', 'Here we go! The {period} is ON!'], ['m', 'Grab a seat. Grab a hot dog. Grab two.'], ['c', 'And the {period} begins! {home} versus {away}!'], ['m', 'Now THIS is hockey, Chuck.']],
    rush: [['c', '{name} with speed, through center, over the line—'], ['c', '{name} turns on the jets!'], ['c', '{name} wheels out of the zone!'], ['m', 'Look at him go, Chuck. Like a moose on a waterslide.'], ['c', '{name} carries it up ice, nobody near!'], ['c', 'Here comes {name}, head of steam!']],
    deke: [['c', '{name} dangles, dances, and DEKES!'], ['c', 'Oh, {name} just undressed {victim}!'], ['m', 'He left {victim} in the parking lot.'], ['c', 'Toe drag! {name} with the silky mitts!'], ['m', 'Hands of a surgeon. Feet of a surgeon too.'], ['c', 'Spin-o-rama! {name} is showing off now!']],
    windup: [['c', 'Big wind-up… {name} with the CLAPPER!'], ['c', '{name} loads it up from the point!'], ['m', 'Duck, everybody. He\'s winding up.'], ['c', '{name} pulls the hammer back!']],
    shot: [['c', '{name} fires!'], ['c', '{name} lets it go!'], ['c', 'Shot by {name}!'], ['c', '{name} snaps one on net!'], ['c', 'Slapper from {name}!']],
    goal: [['c', '{name} SHOOTS — {name} SCORES!'], ['c', 'GOAL! {name} lights the lamp!'], ['c', 'He shoots, he SCORES! {team} {score}!'], ['m', 'Ding-dong, nobody home.'], ['c', 'IN! {name} finds the twine!'], ['c', '{name} buries it! The {team} faithful are on their feet!'], ['m', 'You could hear that one in the parking lot, Chuck.'], ['c', 'Bar down! They heard that one in the parking lot!']],
    goal_top: [['c', 'TOP SHELF, where Grandma hides the cookie tin!'], ['c', 'Upstairs! {name} goes top cheese!'], ['m', 'Where Mama keeps the peanut butter.']],
    goal_low: [['c', 'Five-hole! Right between the pads!'], ['m', 'Through the legs. The goalie\'s gonna hear about that one at home.'], ['c', 'Squeaks through! {goalie} won\'t like that one!']],
    goal_ot: [['c', '{name} SCORES IN OVERTIME! THE {team} WIN IT!'], ['c', 'SUDDEN DEATH! {name}! IT\'S OVER!']],
    onetimer: [['c', 'One-timer — BANG! {name} buries it!'], ['c', 'Tape to tape and {name} one-times it HOME!'], ['m', 'He didn\'t even look at it, Chuck. Didn\'t need to.'], ['c', 'Cross-crease feed — {name} doesn\'t miss!']],
    kaboomgoal: [['c', 'The puck went in, and the GOALIE went with it!'], ['c', 'KA-BOOOM! {name} blows the doors off!'], ['m', 'Somebody call the fire department. And my mother.'], ['c', 'A fireball from {name}! The net is in ORBIT!']],
    save: [['c', 'Save, {goalie}!'], ['c', '{goalie} says no!'], ['c', 'Kick save by {goalie}!'], ['m', 'He stopped that with his face, Chuck. You can\'t teach that.'], ['c', 'Big stop by {goalie}!'], ['c', '{goalie} gets a pad on it!'], ['c', 'Robbery! {goalie} with the larceny!']],
    glove: [['c', 'Glove save, and a BEAUTY!'], ['c', '{goalie} snags it out of the air!'], ['m', 'Like catching a mosquito with chopsticks.'], ['c', '{goalie} flashes the leather!']],
    post: [['c', 'Off the POST! The iron says no!'], ['c', 'PING! Off the pipe!'], ['m', 'Lemmy\'s posts are on the payroll, Chuck.'], ['c', 'Clang! {name} rings it off the iron!']],
    bighit: [['c', 'OH! {victim} just got a free trip to next Tuesday!'], ['m', 'He hit him so hard his ancestors felt it.'], ['m', 'That\'s a delivery, Chuck, and nobody signed for it.'], ['c', 'BIG HIT! {name} flattens {victim}!'], ['c', '{name} finishes his check and then some!'], ['m', 'Somebody get the license plate of that Flood Wagon.'], ['c', 'BOOM! {victim} is wearing the ice!'], ['m', 'He\'ll be seeing tweety birds till Tuesday.']],
    glass: [['c', 'THROUGH THE GLASS! Somebody get a broom!'], ['m', 'That glass is coming out of somebody\'s paycheque.'], ['c', 'The glass EXPLODES! {victim} goes in, the glass goes out!'], ['m', 'Front row\'s getting the full experience tonight.']],
    crack: [['c', 'Into the glass! You can see the crack from up here!'], ['m', 'Cracked the glass. Cracked my heart a little too.']],
    fight: [['c', 'The gloves are off! {a} and {b} are going at it!'], ['m', 'Now we got ourselves a dance, Chuck.'], ['c', 'They drop \'em! {a} and {b}!'], ['m', 'I lost fourteen teeth doing that. Found nine.']],
    fightwin: [['c', '{name} wins the scrap! Down goes {victim}!'], ['m', 'That\'s a TKO, Chuck. Technical Knock-on-the-ice.'], ['c', '{name} by decision! {victim} heads to the sin bin!']],
    turtle: [['c', '{name} turtles! The crowd lets him hear it!'], ['m', 'Hockey sweater on, hockey courage off.']],
    kaboom: [['c', 'The meter\'s full… it\'s… KA-BOOOOM!'], ['c', 'KABOOM MODE! The {team} are ON FIRE!'], ['m', 'Hold onto your toques, folks.'], ['c', 'KA-BOOM! The whole barn is shaking!']],
    gilded: [['c', 'GILDED MODE! The Grizzlies are glowing!'], ['m', 'Gold flames, Chuck. That\'s just showing off.']],
    mascot: [['c', 'Polar Pete is DOWN! Somebody check on the bear!'], ['m', 'He\'s a mascot, Chuck. He\'s paid in hugs.'], ['c', 'MASCOT DOWN! Polar Pete has been bodychecked!']],
    hattrick: [['c', 'HAT TRICK! Here come the hats!'], ['c', 'Three for {name}! The hats are raining down!'], ['m', 'I got a hat trick once. Three penalties.']],
    period: [['c', 'That\'s the end of the {period}. {home} {hs}, {away} {as}.'], ['c', 'The horn sounds on the {period}! {home} {hs}, {away} {as}.'], ['m', 'Time to flood the ice and refill the nachos.']],
    final: [['c', 'THAT\'S IT! The {team} win it, {score}!'], ['c', 'The final horn! {team} take it!'], ['m', 'Good game, good game, good game. That\'s the handshake line, Chuck.']],
    tie: [['c', 'It ends in a tie! Everybody kiss your sister!'], ['m', 'Nobody wins. Nobody loses. Everybody gets a juice box.']],
    pp: [['c', 'Power play for the {team}!'], ['m', 'Man advantage. Move it around, find the open man.'], ['c', 'The {team} go on the power play!']],
    item: [['c', 'Fans are throwing goodies! {name} grabs the {item}!'], ['m', '{item}! That\'s a hockey food group, Chuck.'], ['c', '{name} snags the {item} off the ice!']],
    octopus: [['m', 'Octopus on the ice. It\'s tradition, Chuck. Don\'t ask which tradition.'], ['c', '{victim} slips on the octopus!'], ['c', 'Eight arms, zero friction! Down goes {victim}!']],
    thinice: [['c', 'The ice BREAKS! {victim} goes for a swim!'], ['m', 'Thin ice? I never skated on the thick stuff.'], ['c', 'SPLASH! {victim} has been dunked in Lake Kabonk!']],
    buried: [['c', '{victim} is buried in the snowbank!'], ['m', 'Looks like a snowman with skates, Chuck.']],
    vault: [['c', 'VAULT LOCKED! That KABOOM bounced right off him!'], ['c', 'THE VAULT IS CRACKED! He\'s human after all!'], ['m', 'He\'s very big, Chuck.']],
    twister: [['c', 'The Golden Twister! Sterling spins!'], ['m', 'Hit him while he\'s spinning, kids. Daddy can\'t buy you a helmet.']],
    shootout: [['c', 'It\'s a SHOOTOUT! One on one!'], ['c', '{name} with the puck at center… here he comes!'], ['m', 'Ice water in the veins, Chuck. Or Hot Cocoa.']],
    boost: [['c', 'Glitterman\'s Gilded Boost! The Grizzlies get faster!'], ['m', 'Money can\'t buy you love. It CAN buy you skates.']],
    organ: [['c', 'DORIS! PLAY THE SONG!'], ['m', 'Here comes the organ. The Muskrats feel it!']],
    blocked: [['c', 'Blocked by {name}!'], ['m', 'He took one for the team, Chuck. Right in the shin pads.'], ['c', '{name} goes down to block it!']],
    takeaway: [['c', '{name} picks his pocket!'], ['c', 'Stolen by {name}!'], ['m', 'Pickpocket. Should be a law.']]
  },
  filler: [
    'I played eleven seasons. Lost fourteen teeth. Found nine.', 'My first coach said I had the hands of a surgeon. Then he saw me skate.', 'Thin ice? I never skated on the thick stuff.',
    'In my day we didn\'t have helmets. We had hats. Wool ones.', 'I once took a slapshot to the head. Woke up speaking French. Only for a week.', 'My mother still calls me Moose. My mother named me Moose.',
    'You know what they say, Chuck. Skate to where the puck is going. And where the nachos are.', 'I scored a goal once. Into my own net. Best feeling of my life until I looked up.',
    'Flood Wagon driver is the best job in sports, Chuck. Nobody chirps the Flood Wagon.', 'I tried figure skating one summer. Too many spins. Not enough hitting.',
    'Gus has been driving that Flood Wagon since before the wheel was round.', 'Doris on the organ, Chuck. That woman could make a dial tone sound like a goal song.',
    'Big Lou knits between periods. Made me a scarf. It\'s still the warmest hit I ever took.', 'The Icebox used to be a cow barn. You can still smell the history.',
    'Lemmy talks to his goalposts. They talk back, Chuck. I\'ve heard \'em.', 'I had a mullet in \'88. It had its own fan club.',
    'You can\'t teach size, Chuck. You can feed it, though. Poutine.', 'They say the puck is round. I say it\'s flat. Agree to disagree.',
    'My knees make a sound like a bag of chips now. Worth it.', 'Coach Marge cut me from peewee. Best thing that ever happened to me. I still cry about it.',
    'A hockey game is just a bunch of folks skating angrily at a hamburger, Chuck.', 'When I was a kid the Kaboom Cup was a coffee can. Still is, mostly.'
  ],
  chirps: [
    'Nice flow! Did your mom cut it with a skate blade?', 'You skate like a fridge on a waterbed!', 'Is that a stick or a toothpick?', 'Your five-hole\'s wider than the highway!',
    'You\'re a pylon with a pulse!', 'Hey goalie, want a net? You\'re not using yours!', 'Your slapshot couldn\'t pop a bubble!', 'You\'ve got the hockey sense of a boiled perogy!',
    'Nice turnover! Bake it yourself?', 'My grandma checks harder, and she\'s ninety!', 'Your hands are made of mittens!', 'Skate much? Or just stand there professionally?',
    'I\'ve seen snowmen with better edges!', 'You couldn\'t score in a phone book!', 'Your helmet\'s doing all the thinking!', 'You pass like a vending machine — takes forever, then nothing!',
    'Hey, the Zamboni called. It wants its speed back!', 'Is that a beard or a beaver?', 'You\'re about as quick as a glacier on a lunch break!', 'Your wrist shot\'s a wrist NOT!',
    'Hope your stick has insurance!', 'You\'re playing like your skates are on backwards!', 'Was that a deke or a sneeze?', 'Even the octopus is faster than you!',
    'You couldn\'t hit water if you fell out of a boat!', 'Shoulda stayed on the bench, buddy!', 'I\'ve met lampposts with better hockey IQ!', 'You\'re the human version of a missed net!',
    'Get a load of the Flood Wagon over here!', 'Your mom\'s still waiting in the parking lot!'
  ],
  tips: {
    skate: 'Skate with the stick. Hold {turbo} to turbo. It runs out, so pick your moments.',
    pass: '{pass} passes. Point where you want it to go.',
    shoot: 'Tap {shoot} for a wrister. Hold it for a slapshot. Let go to fire.',
    onetimer: 'Pass coming your way? Hit {shoot} for a ONE-TIMER.',
    defense: 'No puck? {shoot} checks, {deke} pokes, {pass} switches to whoever\'s closest.',
    deke: 'With the puck, {deke} dekes past a check. Fools goalies too.',
    boom: 'Hits, passes, saves, goals: they fill the BOOM meter. Fill it and the whole team goes KABOOM.',
    gloves: 'Somebody\'s got a grudge. Hold {lob} to drop the gloves.',
    fight: 'In a scrap: {pass} jab, {shoot} haymaker, {deke} duck, {lob} yank the sweater.',
    items: 'Fans throw goodies on the ice. Skate over \'em.',
    pp: 'Power play! They\'re a skater short. Move it and shoot.',
    saucer: '{lob} with the puck flips a saucer over their sticks.',
    chirp: '{chirp} chirps. Gets in their heads.',
    shootout: 'Shootout! In net: {pass} butterfly, {shoot} poke, {deke} dive.',
    kaboom: 'KABOOM! Hold {shoot} all the way for a KABOOM shot. Hits are double.',
    camera: '{camera} swaps between the Broadcast and Overhead cameras.'
  },
  stars: [
    'The third star: {name}, who hit everything but the Flood Wagon.', 'Second star: {name}, with {g} goals and a smile that could melt the ice.', 'And the first star of the game… {name}!',
    'Third star: {name}. Showed up, skated hard, made his mother proud.', 'Second star: {name}, who turned the ice into a hall of mirrors.', 'The first star, the big cheese, the head muskrat… {name}!',
    'Third star: {name}, the human wrecking ball.', 'Second star: {name}! {s} saves and nerves of maple syrup.', 'First star: {name}, and it wasn\'t even close!',
    'Third star: {name}, for services to the glass repair industry.', 'Second star: {name}, who never met a puck he didn\'t like.', 'First star: {name}! Take a bow, kid!'
  ],
  pep: [
    "That's one game. You know how many games I've lost? Neither do I. I stopped counting at a thousand. Get up.",
    "Pond hockey's about one thing: you fall through, you climb out. So climb out.",
    "They hit you. Fine. Next time hit 'em first and say sorry after. Then don't say sorry.",
    "The mall wins this one. Malls always win the first one. Then the roof leaks.",
    "You're one game from saving this town. Lose it again and I'll make you drive the Flood Wagon. Uphill."
  ],
  blurbs: {
    cuprun: 'Five games. Five barns. One Cup. Save the Ol\' Icebox.', exhibition: 'Any two teams, any barn. 1 to 4 players.', practice: 'Coach Marge\'s drills: every move in the book.',
    records: 'Hardest shots, biggest hits, stars and badges.', settings: 'Cameras, commentary, sound and controls.', about: 'Credits, the source and the build notes.'
  }
};

/* ---- 08-interview.js ---- */
/* ---- INTERVIEW: the build's Source Information and feedback (generated by tools/interview.mjs from one source: the
 * About pages, exit-interview.json and the final reply say the same) ---- */
const INTERVIEW = {"sourceInformation":{"date":"2026-11-03 18:26:47","source":"Ice hockey (over-the-top arcade style)","plan":"PLAN.md","genre":"Arcade sports: 3-on-3 ice hockey with goalies, with a fight minigame, a Flood Wagon minigame and a five-chapter story campaign (the Cup Run)","perspective":"2.5D TV broadcast camera (the engine's threequarter view, pitch 55) that tracks the puck, an Overhead (topdown) option, and ice-level (brawler) cuts for fights, replays, intros, celebrations and cutscenes","tech":"my-3D2dge v0.85.2 (the handoff package, 2D canvas engine, patched; see Engine changes), AI Hub session client 1.4.0, plain JavaScript in 40 source modules bundled by a Node build script into one self-contained HTML file; Node 24 and Playwright 1.63 (Chromium) for the tests","artDirection":"The engine's native PS1-era pixel art (res ps1, expand) with HD Humanoid rigs; new hockey gear (sticks, skates, helmets, goalie masks, pads, blockers, catchers, numbers), rinks with curved boards, breakable glass and nets, team logos, five dressed arenas with crowds, the Flood Wagon and the Kaboom Cup, all drawn in code","animation":"The engine's procedural Humanoid rigs with a wrapped solvePose: skating strides, glides, crossovers, hockey stops, backward C-cuts, stick-handling, passes, saucers, wrist shots, slapshot wind-ups and follow-throughs, one-timers, checks, pokes, dekes and spin-o-ramas, faceoffs, goalie stances and saves, celebrations; the engine's E.MOVES for fights; an animation lab","audio":"All in code: 11 chip-synth songs with layers plus 6 goal stings (new organ and brass waves), about 45 synthesized sound effects, a three-oscillator goal horn, arena organ stings, a crowd bed that follows the game with reactions and a KA-BOOM chant, and Animalese-style babble voices through formant filters for every speaker","online":"AI Hub shared-world sessions for 1-4 players (host-authoritative simulation, 15 Hz snapshots under 1,200 bytes, press counters, client prediction and interpolation, events replayed for effects), plus 1-4 local players on one screen","testing":"One command (node tests/run.mjs): headless Node suites (systems and units, features (the boss rules, unlocks, the Flood Wagon), extras (records, practice, every setting, the lab, audio), text, dev mode, attract mode, a bot-driven playthrough of the whole Cup Run and all 7 drills, balance) and Chromium suites (the engine's checker on 7 pages, menus with keyboard, mouse and touch-only, the AI Hub harness in 4 configurations); screenshots reviewed for looks","research":"The engine handoff docs (README, API card, guide sections, the sports kit, the asset card) and the AI Hub protocol README and shared-world example; no web research on hockey (general knowledge)","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-opus-5-5, reasoning effort xhigh","usage":"Cost: unknown. Tokens: unknown (this environment shows no cost or token figures). Session time: about 4 h (18:26 to about 22:20)"},"testingFeedback":["About 25 real issues, found by the suites, the engine checker and screenshot review (plus a handful of bugs in the tests themselves). The final full run: 302 checks passing, 0 failing, and a line-by-line TASK.md audit (TASK-AUDIT.md) with every requirement met by passing checks.","Seven would have been game-breaking: the CPU never challenged a carrier standing by his own net (an AI target bug), drills without a puck looped stoppages forever, drills completed by a goal never exited, a drill switched control to the pass receiver so it could not be won, AI Hub client copies hit a draw error every frame, mouse hover in menus read the wrong coordinate space, and the Flood Wagon's perfect flood could not be reached after a real period (the wagon orbited its target; now it brakes into turns, lays a wider sheet and 85% is perfect).","The bot-driven playthrough of the whole Cup Run and all 7 drills (the game's own AI turned into stick and button input): it found the drill loops, the stuck exits and the flow bugs between scenes that no single system test reached.","The engine checker's \"flat color\" look note: on a hockey rink half the screen is meant to be ice, so it kept firing after the ice was textured; it did push the ice texture and lighting to look better."],"engineFeedback":["The exact fixed step with game.advance, input.tap and input.hold in Node: the same game runs headless, so a bot could play the entire story through the real input path in two minutes. The procedural Humanoid with a replaceable solvePose came second: hockey motion layered on top of it cleanly.","Yes: the threequarter view draws at 1.5x scale at zoom 1 (zoom 1 was far too close; .72 is about 1:1); input.mouseScreen() is in buffer space with the camera, not HUD pixels (screenPoint and pointer are); a moving mouse does not set lastDevice; every zoom level re-bakes the whole floor, so smooth camera zooms are not practical; in the brawler view y grows toward the camera.","The hockey simulation: skating with momentum, the puck in substeps against curved boards, glass, posts, crossbar and nets, and a physical goalie save solver with reaction, tracking lag, save shapes, rebounds and freezes. Next to it, the hockey gear and motion on the rig, and the online snapshot and prediction layer.","Curved boards, glass panels and nets in a tilted view: TileMap walls are axis-aligned boxes, so the rink was drawn by hand as depth-queued panels, with the near side cut low so it never hides play.","Six changes: PlayStation symbols (and a few marks) in the 5x7 font; Options ignored while Create is held (AI Hub); hockey sticks as weapons and a gear hook that draws a game's parts inside the rig's depth-sorted ops; organ and brass waves, an oscillator lowpass, a voice bus and audio.bus(name); a per-letter voice function for E.Dialog; 12 cached floor bakes instead of 6.","Make zoom cheap: bake the floor once at a high scale and resample, or cache per view only, so a broadcast camera can punch in and pull out smoothly without re-baking a 70 x 44 tile floor."],"promptFeedback":["It is concrete where it matters: exact deliverables, a pass/fail harness for online play, a strict testing method (one command, scripts over screenshots) and a detailed plan to build from.","The plan's file and folder names (claude-opus-5-5-max-20261103-174816) differ from TASK.md's (xhigh-20261103-182647); TASK.md wins, as STAGE.md says, but it needed a moment. \"Follow lib/hub for multiplayer integration into ai-hub as well as for the game on its own\" reads two ways; I built hub sessions plus local 1-4 player play.","The scope: a complete vertical slice (a five-chapter story with cutscenes, 7 drills, exhibition for 4, a Flood Wagon minigame, fights, a shootout, online netcode, attract and dev modes) in one session, and judging game feel without being able to play it by hand.","Rank the features (must-have versus nice-to-have) so a build under time pressure knows what to cut, and keep the plan's names in step with TASK.md."],"aiHub":{"name":"Ice Hoc-Kaboom","tagline":"Over-the-top 3-on-3 arcade hockey","description":"Glass-shattering hits, dropped gloves and explosive KABOOM slapshots as the Mukluk Falls Muskrats fight to save their rink. Story, exhibition and up to four players.","type":"Game","genre":"Sports","source":"Ice hockey","series":"","players":"1–4","controls":"Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · △/I saucer & gloves · R2/Shift turbo","tags":["arcade","sports","versus","comedy","pixel art","story"]},"sourceLines":["Date: 2026-11-03 18:26:47","Source: Ice hockey (over-the-top arcade style)","Plan: PLAN.md","Genre: Arcade sports: 3-on-3 ice hockey with goalies, with a fight minigame, a Flood Wagon minigame and a five-chapter story campaign (the Cup Run)","Perspective: 2.5D TV broadcast camera (the engine's threequarter view, pitch 55) that tracks the puck, an Overhead (topdown) option, and ice-level (brawler) cuts for fights, replays, intros, celebrations and cutscenes","Tech: my-3D2dge v0.85.2 (the handoff package, 2D canvas engine, patched; see Engine changes), AI Hub session client 1.4.0, plain JavaScript in 40 source modules bundled by a Node build script into one self-contained HTML file; Node 24 and Playwright 1.63 (Chromium) for the tests","Art direction: The engine's native PS1-era pixel art (res ps1, expand) with HD Humanoid rigs; new hockey gear (sticks, skates, helmets, goalie masks, pads, blockers, catchers, numbers), rinks with curved boards, breakable glass and nets, team logos, five dressed arenas with crowds, the Flood Wagon and the Kaboom Cup, all drawn in code","Animation: The engine's procedural Humanoid rigs with a wrapped solvePose: skating strides, glides, crossovers, hockey stops, backward C-cuts, stick-handling, passes, saucers, wrist shots, slapshot wind-ups and follow-throughs, one-timers, checks, pokes, dekes and spin-o-ramas, faceoffs, goalie stances and saves, celebrations; the engine's E.MOVES for fights; an animation lab","Audio: All in code: 11 chip-synth songs with layers plus 6 goal stings (new organ and brass waves), about 45 synthesized sound effects, a three-oscillator goal horn, arena organ stings, a crowd bed that follows the game with reactions and a KA-BOOM chant, and Animalese-style babble voices through formant filters for every speaker","Online: AI Hub shared-world sessions for 1-4 players (host-authoritative simulation, 15 Hz snapshots under 1,200 bytes, press counters, client prediction and interpolation, events replayed for effects), plus 1-4 local players on one screen","Testing: One command (node tests/run.mjs): headless Node suites (systems and units, features (the boss rules, unlocks, the Flood Wagon), extras (records, practice, every setting, the lab, audio), text, dev mode, attract mode, a bot-driven playthrough of the whole Cup Run and all 7 drills, balance) and Chromium suites (the engine's checker on 7 pages, menus with keyboard, mouse and touch-only, the AI Hub harness in 4 configurations); screenshots reviewed for looks","Research: The engine handoff docs (README, API card, guide sections, the sports kit, the asset card) and the AI Hub protocol README and shared-world example; no web research on hockey (general knowledge)","Environment: Claude Code CLI (headless); Linux; browser unknown","Model: Anthropic, claude-opus-5-5, reasoning effort xhigh","Usage: Cost: unknown. Tokens: unknown (this environment shows no cost or token figures). Session time: about 4 h (18:26 to about 22:20)"],"engineChanges":["1. Font: the PlayStation face-button symbols (✕ ○ □ △) and a few typographic marks (· — … ✓ ☆ ◂ ’ “ ” ♦) added to the 5x7 font (G57). Why: canvas prompts showed ? for the symbols PAD_GLYPHS.playstation itself uses.","2. AI Hub controller rule: in the gamepad poll, button 9 (Options) is ignored while button 8 (Create) is held, and the join check does the same. Why: AI Hub reserves Create + Options for its corner bar. Harmless outside the hub.","3. Humanoid gear: weapon: 'stick' | 'gstick' are accepted (no built-in weapon drawn), and a gear hook, o.gear(K), runs in both _drawHD and _drawClassic before the depth sort, with the rig's projection helpers and its ops list. Why: the hockey look rests on sticks, skates, helmets, masks, goalie pads, blockers, catchers, numbers and letters, and drawing them inside the rig's own depth-sorted ops is the only way they sort correctly against the limbs. The game draws all the gear itself through the hook (src/21-rigs.js), so the engine stays general.","4. Audio: periodic waves organ (drawbars 1, 2, 3, 4, 6, 8) and brass (odd-heavy saw) for sfx voices and song tracks; lp / lpTo / q (a lowpass, optionally swept) on oscillator voices and tracks; tracks also take attack and decay; a voice bus routed to master with audio.voiceVolume; audio.bus(name) returns the master, sfx, music or voice gain node for a game's own sound graphs. Why: the arena organ, the goal horn and the formant-filtered babble voices need them.","5. Dialog voice hook: voice may be a function (ch, index, text, page) called for each newly typed letter, on the dialog or per say(). Why: every speaker babbles in their own voice.","6. Floor bake cache: a TileMap keeps 12 baked floors (one per view and zoom), not 6. Why: a match uses the broadcast, overhead and ice-level views at a few zooms; with 6 the cache cleared and re-baked mid-game."]};

/* ---- 10-synth.js ---- */
/* ---- SYNTH (section 10): everything heard is made here, in code. Babble voices (Animalese / Simlish style: each
 * sounding letter a 55-85 ms blip through two formant filters, pitch from the voice and a letter hash), the goal horn
 * (three detuned brass oscillators through a lowpass, plus air), the crowd bed (two looped noise bands that follow the
 * crowd's excitement) and its reactions, the arena organ (original stings only), the sound effects and the songs.
 * Randomness here comes from RNG.fx, never the simulation's stream ---- */
const Synth = (() => {
  const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2300] };
  const VOWELS = 'aeiouy';
  const ctx = () => (A.ctx && A.ctx.state === 'running' ? A.ctx : null);
  let pulseWave = null, last = new Map();
  const pw = c => pulseWave || (pulseWave = (() => { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) { const a = 2 / (n * PI) * Math.sin(n * PI * .3); re[n] = a * Math.cos(n * PI * .3); im[n] = a * Math.sin(n * PI * .3); } return c.createPeriodicWave(re, im); })());
  /** one syllable: f0 Hz, vowel, at time t (context seconds), for dur */
  function blip(c, t, f0, vowel, dur, v, vol = .22, click = false, glide = 0) {
    const bus = A.bus('voice'); if (!bus) return;
    const fm = FORM[vowel] || FORM.a, k = v.fmt || 1;
    const o = c.createOscillator(); if (v.wave === 'pulse') o.setPeriodicWave(pw(c)); else o.type = v.wave === 'square' ? 'square' : 'sawtooth';
    o.frequency.setValueAtTime(f0, t); if (glide) o.frequency.linearRampToValueAtTime(f0 * glide, t + dur);
    if (v.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = v.vib[0]; lg.gain.value = f0 * v.vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    for (const [fq, q, gv] of [[fm[0] * k, 6, 1], [fm[1] * k, 9, .7]]) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; const fg = c.createGain(); fg.gain.value = gv * 2.4; o.connect(f); f.connect(fg); fg.connect(g); }
    if (v.gruff && A._noise) { const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = fm[0] * k; nf.Q.value = 2; const ng = c.createGain(); ng.gain.value = v.gruff * 1.6; n.connect(nf); nf.connect(ng); ng.connect(g); n.start(t, RNG.fx() * .5); n.stop(t + dur + .02); }
    if (click && A._noise) { const n = c.createBufferSource(); n.buffer = A._noise; const hf = c.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 3200; const cg = c.createGain(); cg.gain.setValueAtTime(vol * .7, t); cg.gain.exponentialRampToValueAtTime(.0005, t + .012); n.connect(hf); hf.connect(cg); cg.connect(bus); n.start(t, RNG.fx() * .5); n.stop(t + .02); }
    g.connect(bus); o.start(t); o.stop(t + dur + .03);
  }
  const semis = (base, n) => base * Math.pow(2, n / 12);
  const hashOff = (ch, i, range) => { const h = (ch.charCodeAt(0) * 31 + i * 7) % 13; return (h / 12 - .5) * 2 * range; };
  /** speak a whole line in a voice (returns its length in seconds); o: { vol, pitch, delay } */
  function say(text, v, o = {}) {
    const c = ctx(); if (!c || !v) return 0;
    const s = String(text).toLowerCase(), sp = 1 / (v.speed || 10), out = [];
    let t = c.currentTime + .02 + (o.delay || 0), onset = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (VOWELS.includes(ch)) { out.push({ t, ch, click: onset }); t += sp * (.8 + RNG.fx() * .4); onset = false; while (VOWELS.includes(s[i + 1])) i++; }
      else if (/[a-z]/.test(ch)) { onset = onset || 'stkpcfx'.includes(ch); }
      else if (ch === ',') t += .12; else if (ch === '.' || ch === '…') t += .22; else if (ch === '!' || ch === '?') t += .08;
    }
    const excl = /!/.test(s), q = /\?\s*$/.test(s);
    out.forEach((sy, k) => {
      let f = semis(v.base * (o.pitch || 1), hashOff(sy.ch, k, v.range || 3));
      if (excl && k >= out.length - 4) f = semis(f, 4);
      blip(c, sy.t, f, sy.ch, Math.min(.085, sp * .9 + .02), v, (o.vol || 1) * .2, sy.click, q && k === out.length - 1 ? 1.35 : 0);
    });
    return t - c.currentTime;
  }
  /** one letter as it types (E.Dialog's voice hook): vowels sound, at most voice.speed a second */
  function letter(ch, i, text, v) {
    const c = ctx(); if (!c || !v) return;
    const l = String(ch).toLowerCase(); if (!/[a-z]/.test(l)) return;
    const now = c.currentTime, lt = last.get(v) || 0; if (now - lt < 1 / (v.speed || 10)) return;
    if (!VOWELS.includes(l) && RNG.fx() < .55) return;
    last.set(v, now);
    const vow = VOWELS.includes(l) ? l : 'aeiou'[(l.charCodeAt(0) * 7) % 5];
    blip(c, now + .005, semis(v.base, hashOff(l, i, v.range || 3)), vow, .07, v, .2, !VOWELS.includes(l) && 'stkp'.includes(l));
  }
  const voiceFn = v => (ch, i, text) => letter(ch, i, text, v);

  /* ---- the goal horn: a custom graph (3 detuned brass oscillators at 98, 147, 196 Hz, lowpass 900, air) ---- */
  function horn(double = false, len = 2.6) {
    const c = ctx(); if (!c) return; const bus = A.bus('sfx');
    for (let rep = 0; rep < (double ? 2 : 1); rep++) {
      const t = c.currentTime + .02 + rep * (len + .5), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 1.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .25); g.gain.setValueAtTime(.32, t + .25 + len); g.gain.linearRampToValueAtTime(0, t + .75 + len);
      for (const [fq, dt] of [[98, 0], [147, 2], [196, -3], [98.6, 5]]) { const o = c.createOscillator(); o.setPeriodicWave(A._harm('brass')); o.frequency.value = fq; o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + len + .9); }
      if (A._noise) { const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; const ng = c.createGain(); ng.gain.value = .25; n.connect(nf); nf.connect(ng); ng.connect(f); n.start(t); n.stop(t + len + .9); }
      f.connect(g); g.connect(bus);
    }
  }
  /* ---- the crowd: a bed of two noise bands following excitement; reactions on top ---- */
  let bed = null, bedLevel = 0;
  function crowd(level) {
    const c = ctx(); bedLevel = level; if (!c || !A._noise) return;
    if (!bed) {
      const g = c.createGain(); g.gain.value = 0; g.connect(A.bus('sfx'));
      const mk = (fq, q) => { const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; n.connect(f); f.connect(g); n.start(0, Math.random() * .5); return f; };
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .23; lg.gain.value = 120; lfo.connect(lg); const f1 = mk(400, .9); lg.connect(f1.frequency); mk(1200, 1.4); lfo.start();
      bed = { g };
    }
    const vol = (S('crowdVol') === undefined ? .8 : S('crowdVol')) * T.crowdHype;
    bed.g.gain.setTargetAtTime(clamp(level, 0, 1.4) * .16 * vol, c.currentTime, .25);
  }
  function crowdOff() { const c = ctx(); if (bed && c) bed.g.gain.setTargetAtTime(0, c.currentTime, .2); }
  function swell(kind) {
    const c = ctx(); if (!c || !A._noise) return; const vol = (S('crowdVol') === undefined ? .8 : S('crowdVol')) * T.crowdHype; if (vol <= 0) return;
    const t = c.currentTime + .01, bus = A.bus('sfx'), n = c.createBufferSource(); n.buffer = A._noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1; const g = c.createGain();
    const spec = { ohh: [700, 300, .45, 1.4], ahh: [900, 1400, .3, 1.1], cheer: [1100, 1700, .55, 2.4], roar: [900, 1500, .7, 3.6], boo: [300, 220, .35, 1.6], gasp: [1300, 900, .25, .5] }[kind] || [800, 800, .3, 1];
    f.frequency.setValueAtTime(spec[0], t); f.frequency.exponentialRampToValueAtTime(spec[1], t + spec[3]);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(spec[2] * vol * .6, t + .12); g.gain.exponentialRampToValueAtTime(.001, t + spec[3]);
    n.connect(f); f.connect(g); g.connect(bus); n.start(t, Math.random() * .5); n.stop(t + spec[3] + .1);
    if (kind === 'cheer' || kind === 'roar') for (let k = 0; k < 5; k++) say('wooo yeah', { base: 280 + k * 40, range: 5, speed: 9, wave: 'pulse', fmt: 1.1 }, { vol: .25 * vol, delay: k * .09 });
    if (kind === 'boo') for (let k = 0; k < 4; k++) say('boooo', { base: 110 + k * 12, range: 1, speed: 3, wave: 'saw', fmt: .8 }, { vol: .3 * vol, delay: k * .1 });
    if (kind === 'ohh') for (let k = 0; k < 3; k++) say('ohhh', { base: 160 + k * 30, range: 1, speed: 3, wave: 'saw', fmt: .9 }, { vol: .25 * vol, delay: k * .05 });
  }
  function chant(word = 'ka boom') { const vol = (S('crowdVol') === undefined ? .8 : S('crowdVol')) * T.crowdHype; for (let k = 0; k < 6; k++) say(word + '! ' + word + '!', { base: 150 + k * 35, range: 1, speed: 4, wave: k % 2 ? 'saw' : 'pulse', fmt: 1 }, { vol: .22 * vol, delay: k * .015 }); claps(6, .25); }
  function claps(n = 4, gap = .3, delay = 0) { const c = ctx(); if (!c || !A._noise) return; for (let k = 0; k < n; k++) A.sfx({ wave: 'noise', freq: 2400, dur: .05, vol: .16, filter: 'bandpass', q: .8, delay: delay + k * gap }); }

  /* ---- the organ: original stings, a drawbar organ with a Leslie-like wobble ---- */
  const ORG = (notes, step = .14, o = {}) => notes.map((n, i) => n ? { wave: 'organ', freq: n, dur: (o.len || step) * (n.endsWith && n.endsWith('-') ? 2 : 1), vol: o.vol || .16, vib: [6, .004], hold: true, attack: .01, delay: i * step } : null).filter(Boolean);
  const STINGS = {
    charge: ORG(['G4', 'C5', 'E5', 'G5', null, 'E5', 'G5', 'G5'], .16, { vol: .18 }),
    walkup: ORG(['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4'], .1),
    clap: ORG(['G4', 'G4', 'A4', null, 'G4', null, 'C5', 'B4'], .17),
    sad: [{ wave: 'brass', freq: 'G3', to: 'F#3', dur: .35, vol: .2, lp: 900, hold: true }, { wave: 'brass', freq: 'F#3', to: 'F3', dur: .35, vol: .2, lp: 900, hold: true, delay: .4 }, { wave: 'brass', freq: 'F3', to: 'E3', dur: .35, vol: .2, lp: 900, hold: true, delay: .8 }, { wave: 'brass', freq: 'E3', to: 'D#3', dur: 1, vol: .2, lp: 700, hold: true, vib: [7, .03], delay: 1.2 }],
    fight: ORG(['E4', 'G4', 'Bb4', 'E4', 'G4', 'B4', 'E4', 'G4', 'Bb4', 'A4'], .12, { vol: .15 }),
    period: ORG(['C5', 'G4', 'E4', 'C4'], .25)
  };
  const organ = name => { const s = STINGS[name]; if (s) A.sfx(s, { vary: 0 }); Bus.emit('organ', { name }); };

  /* ---- sound effects (audio.define) ---- */
  const FX = {
    stride: { wave: 'noise', freq: 2600, to: 1400, dur: .12, vol: .07, filter: 'bandpass', q: 1.2 },
    stop: [{ wave: 'noise', freq: 5200, to: 900, dur: .32, vol: .2, filter: 'bandpass', q: 1.5 }, { wave: 'noise', freq: 1800, to: 600, dur: .25, vol: .1, filter: 'lowpass' }],
    tock: { wave: 'triangle', freq: 900, to: 500, dur: .04, vol: .14 },
    pass: [{ wave: 'noise', freq: 1800, to: 700, dur: .06, vol: .2, filter: 'bandpass' }, { wave: 'triangle', freq: 600, to: 300, dur: .05, vol: .15 }],
    wrist: [{ wave: 'noise', freq: 3000, to: 900, dur: .07, vol: .22, filter: 'bandpass' }, { wave: 'square', freq: 520, to: 200, dur: .05, vol: .1 }],
    slap: [{ wave: 'noise', freq: 4200, to: 500, dur: .12, vol: .32, filter: 'bandpass', q: .7 }, { wave: 'square', freq: 320, to: 90, dur: .1, vol: .16 }, { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .12, filter: 'lowpass', delay: .03 }],
    onetimer: [{ wave: 'noise', freq: 5000, to: 400, dur: .14, vol: .38, filter: 'bandpass', q: .6 }, { wave: 'square', freq: 360, to: 80, dur: .12, vol: .2 }],
    post: [{ wave: 'triangle', freq: 1850, dur: .9, vol: .3 }, { wave: 'triangle', freq: 1862, dur: .8, vol: .18 }, { wave: 'sine', freq: 3700, dur: .4, vol: .08 }],
    bar: [{ wave: 'triangle', freq: 2100, dur: .9, vol: .3 }, { wave: 'triangle', freq: 2114, dur: .7, vol: .16 }],
    boards: [{ wave: 'sine', freq: 140, to: 60, dur: .16, vol: .32 }, { wave: 'noise', freq: 500, to: 200, dur: .2, vol: .14, filter: 'lowpass' }],
    glass: [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2, filter: 'bandpass' }, { wave: 'triangle', freq: 2600, to: 2400, dur: .25, vol: .08 }],
    net: { wave: 'noise', freq: 1400, to: 500, dur: .25, vol: .18, filter: 'bandpass', q: .7 },
    check: [{ wave: 'sine', freq: 120, to: 50, dur: .18, vol: .4 }, { wave: 'noise', freq: 700, to: 200, dur: .14, vol: .18, filter: 'lowpass' }],
    bighit: [{ wave: 'sine', freq: 90, to: 32, dur: .35, vol: .5 }, { wave: 'noise', freq: 900, to: 150, dur: .3, vol: .26, filter: 'lowpass' }, { wave: 'noise', freq: 3000, to: 1500, dur: .2, vol: .12, filter: 'bandpass', delay: .04 }],
    crack: [{ wave: 'noise', freq: 6000, to: 3000, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 2400, to: 1800, dur: .04, vol: .08 }],
    shatter: [{ wave: 'noise', freq: 5000, to: 900, dur: .7, vol: .38, filter: 'bandpass', q: .5 }].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => ({ wave: 'sine', freq: 3200 - k * 160, to: 2600 - k * 140, dur: .25, vol: .05, delay: .03 + k * .045 }))),
    whistle: [{ wave: 'square', freq: 2300, dur: .32, vol: .1, vib: [32, .05], lp: 4200 }, { wave: 'square', freq: 2900, dur: .32, vol: .06, vib: [30, .05], lp: 4200 }],
    whistle2: [{ wave: 'square', freq: 2300, dur: .18, vol: .1, vib: [32, .05], lp: 4200 }, { wave: 'square', freq: 2300, dur: .4, vol: .1, vib: [32, .05], lp: 4200, delay: .24 }],
    buzzer: { wave: 'square', freq: 220, dur: 1.5, vol: .18, hold: true, lp: 1600 },
    punch: [{ wave: 'sine', freq: 150, to: 60, dur: .12, vol: .4 }, { wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .2, filter: 'bandpass' }],
    whiff: { wave: 'noise', freq: 1200, to: 2600, dur: .16, vol: .12, filter: 'bandpass' },
    stars: { wave: 'sine', freq: 2400, dur: .5, vol: .06, arp: [0, 7, 12, 7, 0, 7, 12], step: .07, loop: true },
    pickup: { wave: 'pulse', freq: 'C5', dur: .35, vol: .14, arp: [0, 4, 7, 12, 16], step: .06 },
    throw: { wave: 'noise', freq: 600, to: 1800, dur: .4, vol: .1, filter: 'bandpass' },
    splort: [{ wave: 'sine', freq: 300, to: 80, dur: .2, vol: .3 }, { wave: 'noise', freq: 800, to: 200, dur: .2, vol: .16, filter: 'lowpass' }],
    kaboom: [{ wave: 'noise', freq: 1600, to: 60, dur: 1.1, vol: .55, filter: 'lowpass', q: .6 }, { wave: 'sine', freq: 70, to: 24, dur: 1.2, vol: .55 }, { wave: 'square', freq: 110, to: 30, dur: .6, vol: .15, lp: 600 }],
    blast: [{ wave: 'noise', freq: 1200, to: 80, dur: .7, vol: .45, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 30, dur: .7, vol: .4 }],
    aooga: [{ wave: 'saw', freq: 'D4', to: 'A4', dur: .35, vol: .14, lp: 1400, hold: true }, { wave: 'saw', freq: 'A4', to: 'F4', dur: .45, vol: .14, lp: 1400, hold: true, delay: .38 }],
    putter: { wave: 'saw', freq: 55, dur: .09, vol: .08, lp: 400 },
    splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .6, vol: .32, filter: 'bandpass', q: .6 }, { wave: 'sine', freq: 400, to: 120, dur: .3, vol: .2 }],
    freeze: { wave: 'triangle', freq: 'C6', dur: .6, vol: .1, arp: [0, -5, -12, -17], step: .12 },
    crate: [{ wave: 'noise', freq: 900, to: 200, dur: .3, vol: .3, filter: 'lowpass' }, { wave: 'square', freq: 200, to: 80, dur: .15, vol: .1 }],
    menuMove: { wave: 'organ', freq: 'G4', dur: .06, vol: .1, hold: true },
    menuSel: [{ wave: 'organ', freq: 'C5', dur: .08, vol: .12, hold: true }, { wave: 'organ', freq: 'G5', dur: .12, vol: .12, hold: true, delay: .07 }],
    menuBack: [{ wave: 'organ', freq: 'G4', dur: .08, vol: .1, hold: true }, { wave: 'organ', freq: 'C4', dur: .12, vol: .1, hold: true, delay: .07 }],
    star: { wave: 'pulse', freq: 'E6', dur: .5, vol: .12, arp: [0, 5, 7, 12], step: .08 },
    tick: { wave: 'square', freq: 1200, dur: .03, vol: .06 },
    countdown: { wave: 'square', freq: 'A5', dur: .2, vol: .12, lp: 3000 },
    go: { wave: 'square', freq: 'A6', dur: .5, vol: .14, lp: 4000, hold: true },
    glove: { wave: 'noise', freq: 600, to: 300, dur: .12, vol: .14, filter: 'lowpass' },
    catch: [{ wave: 'noise', freq: 900, to: 300, dur: .08, vol: .26, filter: 'lowpass' }, { wave: 'sine', freq: 180, to: 90, dur: .06, vol: .2 }],
    pad: [{ wave: 'sine', freq: 200, to: 90, dur: .08, vol: .3 }, { wave: 'noise', freq: 700, to: 300, dur: .06, vol: .14, filter: 'lowpass' }],
    clack: { wave: 'noise', freq: 2400, to: 1400, dur: .03, vol: .14, filter: 'bandpass' },
    fire: { wave: 'noise', freq: 700, to: 200, dur: .5, vol: .18, filter: 'lowpass' },
    deke: { wave: 'noise', freq: 1200, to: 3000, dur: .2, vol: .1, filter: 'bandpass' }
  };
  for (const k in FX) A.define(k, FX[k]);
  const sfx = (name, o) => A.sfx(name, o);

  /* ---- MUSIC: original songs in the engine's song format (the organ and brass waves are engine patches) ---- */
  const D = { bpm: 150, steps: 2 };
  const SONGS = {
    theme: { bpm: 150, steps: 2, tracks: [
      { name: 'lead', wave: 'square', vol: .075, lp: 3400, notes: 'E5 . E5 G5 . A5 B5 . | D6 - B5 - A5 . G5 . | E5 . E5 G5 . A5 B5 . | G5 - A5 - B5 - - . | C6 . B5 . A5 . G5 . | A5 - G5 - E5 . D5 . | E5 . G5 . B5 . D6 . | E6 - - - B5 . E6 .' },
      { name: 'root', wave: 'saw', vol: .06, lp: 1300, notes: 'E3 E3 E3 E3 E3 E3 D3 D3 | C3 C3 C3 C3 D3 D3 D3 D3 | E3 E3 E3 E3 E3 E3 D3 D3 | C3 C3 D3 D3 E3 E3 E3 E3 | A2 A2 A2 A2 G2 G2 G2 G2 | F2 F2 F2 F2 G2 G2 G2 G2 | E3 E3 E3 E3 G3 G3 G3 G3 | B2 B2 B2 B2 B2 B2 B2 B2' },
      { name: 'fifth', wave: 'saw', vol: .045, lp: 1300, notes: 'B3 B3 B3 B3 B3 B3 A3 A3 | G3 G3 G3 G3 A3 A3 A3 A3 | B3 B3 B3 B3 B3 B3 A3 A3 | G3 G3 A3 A3 B3 B3 B3 B3 | E3 E3 E3 E3 D3 D3 D3 D3 | C3 C3 C3 C3 D3 D3 D3 D3 | B3 B3 B3 B3 D4 D4 D4 D4 | F#3 F#3 F#3 F#3 F#3 F#3 F#3 F#3' },
      { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . E2 E2 . E2 D2 . | C2 . C2 C2 . D2 D2 . | E2 . E2 E2 . E2 D2 . | C2 . D2 . E2 . E2 . | A1 . A1 A1 . G1 G1 . | F1 . F1 F1 . G1 G1 . | E2 . E2 . G2 . G2 . | B1 . B1 B1 B1 . B1 .' },
      { name: 'drums', wave: 'drums', vol: .12, notes: 'k h s h k k s h | k h s h k k s o' }] },
    menu: { bpm: 112, steps: 2, tracks: [
      { wave: 'organ', vol: .07, notes: 'E4 - - - G4 - - - | C4 - - - D4 - - - | E4 - - - B3 - - - | C4 - - - D4 - - -' },
      { wave: 'organ', vol: .05, notes: 'B4 - - - D5 - - - | G4 - - - A4 - - - | G4 - - - F#4 - - - | E4 - - - F#4 - - -' },
      { wave: 'pulse', vol: .05, lp: 2400, notes: 'E5 . G5 . B5 . G5 . | E5 . G5 . A5 . F#5 . | G5 . E5 . D5 . B4 . | C5 . E5 . F#5 . D5 .' },
      { wave: 'triangle', vol: .26, notes: 'E2 . . E2 . . B1 . | C2 . . C2 . . D2 . | E2 . . E2 . . B1 . | C2 . . C2 . . D2 .' },
      { wave: 'drums', vol: .07, notes: 'k . h . s . h h' }] },
    locker: { bpm: 96, steps: 4, tracks: [
      { wave: 'saw', vol: .09, lp: 700, notes: 'A1 . . A1 . . C2 . D2 . . D2 . E2 . G1 | A1 . . A1 . . C2 . D2 . . E2 . C2 . G1' },
      { wave: 'organ', vol: .05, notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - G3 - - - - - - -' },
      { wave: 'organ', vol: .04, notes: 'E4 - - - - - - - - - - - - - - - | C4 - - - - - - - D4 - - - - - - -' },
      { wave: 'drums', vol: .09, notes: 'k . h s . h k h . h s . h . s h' }] },
    pond: { bpm: 104, steps: 3, tracks: [
      { wave: 'pulse', vol: .08, lp: 3000, vib: [5, .01], notes: 'D5 E5 F#5 A5 . F#5 | G5 F#5 E5 D5 . . | B4 D5 E5 F#5 . E5 | D5 - - . . A4 | D5 E5 F#5 A5 . B5 | A5 F#5 D5 E5 . . | F#5 E5 D5 B4 . A4 | D5 - - - . .' },
      { wave: 'triangle', vol: .28, notes: 'D3 . A2 D3 . A2 | G2 . D3 G2 . D3 | B2 . F#2 B2 . F#2 | A2 . E3 A2 . C#3 | D3 . A2 D3 . A2 | G2 . D3 A2 . E3 | B2 . F#2 G2 . A2 | D3 . A2 D3 . .' },
      { wave: 'square', vol: .03, lp: 1800, notes: 'F#4 . F#4 . F#4 . | G4 . G4 . G4 . | F#4 . F#4 . F#4 . | E4 . E4 . E4 . | F#4 . F#4 . F#4 . | G4 . G4 . A4 . | F#4 . F#4 . E4 . | F#4 . . . . .' },
      { wave: 'drums', vol: .06, notes: 'k . h s . h' }] },
    grind: { bpm: 176, steps: 2, tracks: [
      { wave: 'saw', vol: .07, lp: 1800, notes: 'E3 E3 E3 E3 G3 G3 A3 A3 | E3 E3 E3 E3 Bb3 Bb3 A3 G3' },
      { wave: 'saw', vol: .05, lp: 1800, notes: 'B3 B3 B3 B3 D4 D4 E4 E4 | B3 B3 B3 B3 F4 F4 E4 D4' },
      { wave: 'square', vol: .05, lp: 2600, notes: 'E5 - - . G5 . A5 . | B5 - Bb5 - A5 . G5 . | E5 - - . G5 . A5 . | D6 - B5 - A5 - - .' },
      { wave: 'triangle', vol: .3, notes: 'E2 E2 E2 E2 G2 G2 A2 A2 | E2 E2 E2 E2 Bb2 Bb2 A2 G2' },
      { wave: 'drums', vol: .13, notes: 'k s k s k s k s | k s k s k k s s' }] },
    mall: { bpm: 122, steps: 4, tracks: [
      { wave: 'pulse', vol: .06, lp: 4000, notes: 'C5 E5 G5 C6 G5 E5 C5 E5 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | G4 B4 D5 G5 D5 B4 G4 B4' },
      { wave: 'square', vol: .06, lp: 3000, notes: 'E5 - - - D5 - C5 - | C5 - - - . . E5 - | F5 - - - E5 - D5 - | D5 - - - G5 - - -' },
      { wave: 'triangle', vol: .28, notes: 'C3 . C3 . C4 . C3 . | A2 . A2 . A3 . A2 . | F2 . F2 . F3 . F2 . | G2 . G2 . G3 . G2 .' },
      { wave: 'drums', vol: .1, notes: 'k . h . s . h . k k h . s . h h' }] },
    final: { bpm: 92, steps: 2, tracks: [
      { wave: 'brass', vol: .1, lp: 2200, notes: 'D4 - - - A4 - - - | G4 - F4 - E4 - D4 - | C4 - - - G4 - - - | A4 - - - - - - - | D4 - - - A4 - - - | Bb4 - A4 - G4 - F4 - | E4 - F4 - G4 - A4 - | D5 - - - - - - -' },
      { wave: 'brass', vol: .07, lp: 1600, notes: 'A3 - - - F4 - - - | D4 - - - C4 - - - | G3 - - - E4 - - - | E4 - - - C#4 - - - | A3 - - - F4 - - - | F4 - - - D4 - - - | C4 - - - E4 - - - | F#4 - - - - - - -' },
      { wave: 'triangle', vol: .3, notes: 'D2 . D2 . D2 . A1 . | G1 . G1 . A1 . A1 . | C2 . C2 . C2 . G1 . | A1 . A1 . A1 . C#2 . | D2 . D2 . D2 . A1 . | Bb1 . Bb1 . G1 . G1 . | C2 . C2 . E2 . E2 . | D2 . D2 . D2 . D2 .' },
      { wave: 'drums', vol: .12, notes: 'k . . k s . . . | k . k . s . o .' }] },
    play: { bpm: 128, steps: 4, tracks: [
      { name: 'pulse', wave: 'triangle', vol: .22, notes: 'E2 . . . E2 . . . E2 . . . G2 . . . | A2 . . . A2 . . . B2 . . . B2 . . .' },
      { name: 'hats', wave: 'drums', vol: .05, notes: 'h . . . h . . . h . . . h . h .' },
      { name: 'drive', wave: 'saw', vol: .05, lp: 1400, on: false, notes: 'E3 E3 . E3 E3 . E3 . G3 G3 . G3 A3 . B3 . | A3 A3 . A3 A3 . A3 . B3 B3 . B3 D4 . B3 .' },
      { name: 'beat', wave: 'drums', vol: .1, on: false, notes: 'k . . k s . . . k . k . s . . h' },
      { name: 'kaboom', wave: 'saw', vol: .1, lp: 600, on: false, notes: 'E1 E1 E1 E1 E1 E1 G1 G1 E1 E1 E1 E1 Bb1 Bb1 A1 A1' },
      { name: 'toms', wave: 'drums', vol: .14, on: false, notes: 'k o k o s o k o k o k o s s s s' },
      { name: 'fight', wave: 'organ', vol: .08, on: false, notes: 'E4 . G4 . Bb4 . A4 . E4 . G4 . B4 . Bb4 .' }] },
    flood: { bpm: 156, steps: 1, tracks: [
      { wave: 'organ', vol: .09, vib: [6, .004], notes: 'G4 - B4 | D5 - - | C5 - B4 | A4 - - | F#4 - A4 | C5 - - | B4 - A4 | G4 - - | E5 - D5 | C5 - B4 | A4 - G4 | F#4 - - | G4 - B4 | D5 - G5 | F#5 - E5 | D5 - -' },
      { wave: 'organ', vol: .05, notes: 'G2 B3 D4 | G2 B3 D4 | A2 C4 E4 | D2 C4 F#4 | D2 C4 F#4 | D2 A3 C4 | G2 B3 D4 | G2 B3 D4 | C3 E4 G4 | G2 D4 G4 | D2 C4 F#4 | D2 C4 F#4 | G2 B3 D4 | G2 B3 D4 | D2 C4 F#4 | G2 B3 D4' }] },
    victory: { bpm: 140, steps: 2, loop: false, tracks: [
      { wave: 'brass', vol: .12, lp: 2600, notes: 'C5 . C5 . C5 . E5 - | G5 - - . E5 . G5 - | C6 - - - - - - .' },
      { wave: 'brass', vol: .08, lp: 2000, notes: 'G4 . G4 . G4 . C5 - | E5 - - . C5 . E5 - | G5 - - - - - - .' },
      { wave: 'triangle', vol: .28, notes: 'C3 . C3 . C3 . C3 . | C3 . . . G2 . . . | C3 - - - - - - .' },
      { wave: 'drums', vol: .12, notes: 'k . k . k . s . | k . . . s . s s | o - - - . . . .' }] },
    defeat: { bpm: 70, steps: 2, loop: false, tracks: [
      { wave: 'brass', vol: .12, lp: 900, notes: 'G3 - F#3 - F3 - E3 - | - - - - . . . .' },
      { wave: 'triangle', vol: .2, notes: 'C2 - - - B1 - - - | Bb1 - - - - - - .' }] },
    credits: { bpm: 84, steps: 2, tracks: [
      { wave: 'organ', vol: .08, vib: [5, .004], notes: 'E5 - - - G5 - A5 - | B5 - - - A5 - G5 - | E5 - - - G5 - A5 - | G5 - - - - - - - | C6 - B5 - A5 - G5 - | A5 - G5 - E5 - D5 - | E5 - G5 - B5 - D6 - | E6 - - - - - - -' },
      { wave: 'organ', vol: .045, notes: 'G3 - B3 - E4 - - - | G3 - B3 - D4 - - - | G3 - B3 - E4 - - - | A3 - C4 - E4 - - - | A3 - C4 - E4 - - - | F3 - A3 - C4 - - - | G3 - B3 - D4 - - - | G#3 - B3 - E4 - - -' },
      { wave: 'triangle', vol: .24, notes: 'E2 - - - - - - - | G2 - - - - - - - | E2 - - - - - - - | A1 - - - - - - - | A1 - - - G1 - - - | F1 - - - G1 - - - | E2 - - - G2 - - - | E2 - - - - - - -' }] },
    card: { bpm: 120, steps: 2, tracks: [
      { wave: 'organ', vol: .07, notes: 'E4 - G4 - B4 - A4 - | G4 - E4 - D4 - E4 -' },
      { wave: 'triangle', vol: .24, notes: 'E2 . E2 . G2 . A2 . | C2 . C2 . D2 . E2 .' },
      { wave: 'drums', vol: .07, notes: 'k . h . s . h .' }] }
  };
  /* goal stings: two bars per team, played over the horn */
  const STING_NOTES = { muk: 'G4 B4 D5 G5 - E5 G5 -', dry: 'E4 G4 A4 B4 - D5 B4 -', log: 'D4 F#4 A4 D5 - A4 D5 -', grd: 'E4 E4 G4 Bb4 - A4 E5 -', meg: 'C5 E5 G5 C6 - G5 C6 -', gld: 'D5 F#5 A5 D6 - A5 D6 -' };
  for (const k in STING_NOTES) SONGS['sting-' + k] = { bpm: 160, steps: 2, loop: false, tracks: [{ wave: 'brass', vol: .11, lp: 2600, notes: STING_NOTES[k] + ' | . . . . . . . .' }, { wave: 'organ', vol: .06, notes: STING_NOTES[k].replace(/(\d)/g, m => String(+m - 1)) + ' | . . . . . . . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k k s . | o . . . . . . .' }] };
  let current = null;
  function music(name, o = {}) {
    if (HUB && Net && Net.ended) return;
    if (name === current && !o.restart) return; current = name;
    A.music(name ? SONGS[name] || null : null, Object.assign({ fade: .8 }, o));
  }
  const layer = (n, v, f) => { if (current === 'play') A.layer(n, v, f); };
  const sting = name => { if (SONGS[name]) A.sting(SONGS[name], { at: 'beat', duck: .25 }); };
  return { say, letter, voiceFn, horn, crowd, crowdOff, swell, chant, claps, organ, STINGS, sfx, music, layer, sting, SONGS, FX, get song() { return current; }, get bed() { return bedLevel; } };
})();

/* ---- 11-glyphs.js ---- */
/* ---- GLYPHS (6.2): prompt chips for the device used last. Gamepad: round badges with the PlayStation symbols in their
 * colors (✕ blue, ○ red, □ pink, △ green), or Xbox letters (A green, B red, X blue, Y yellow) with Settings, Button
 * symbols; shoulders and triggers as rounded tabs. Keyboard: keycaps. Mouse: a little mouse with the button lit.
 * Glyphs.text(g, 'Hold {shoot} for a slapshot', x, y) lays out text with chips ---- */
const Glyphs = (() => {
  const PS = { 0: ['✕', '#7aa7ff'], 1: ['○', '#ff6b6b'], 2: ['□', '#ff8ad8'], 3: ['△', '#4fe3a1'] };
  const XB = { 0: ['A', '#5ad85a'], 1: ['B', '#ff5a5a'], 2: ['X', '#5a9aff'], 3: ['Y', '#ffd84a'] };
  const SH = { ps: ['L1', 'R1', 'L2', 'R2'], xb: ['LB', 'RB', 'LT', 'RT'] };
  const OTHER = { ps: { 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'PS' }, xb: { 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS', 12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'GUIDE' } };
  const xbox = I => (I.glyphs || S('buttons')) === 'xbox' || (S('buttons') === 'xbox');
  /** the device a prompt should show for an input: gamepad, keyboard or mouse */
  const dev = I => { const d = I.lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; };
  function codeFor(I, action, kind) {
    const m = (I.map && I.map[action]) || []; if (kind === 'gamepad') return m.find(c => /^Pad\d+$/.test(c)); if (kind === 'mouse') return m.find(c => /^Mouse\d$/.test(c)) || m.find(c => !/^Pad|^Mouse|^Act:|^PadAxis/.test(c));
    return m.find(c => !/^Pad|^Mouse|^Act:|^PadAxis/.test(c));
  }
  const W = (str, sc = 1) => E.font.width(str, { scale: sc });
  /** what a chip shows: { kind: 'badge' | 'tab' | 'key' | 'mouse', lab, col, n } */
  function spec(I, action, d) {
    if (action === 'up' || action === 'left' || action === 'down' || action === 'right') return d === 'gamepad' ? { kind: 'tab', lab: action === 'up' || action === 'down' ? 'D-PAD ↑↓' : 'D-PAD ←→' } : { kind: 'key', lab: action === 'up' || action === 'down' ? '↑↓' : '←→' };
    if (d === 'gamepad') {
      const code = codeFor(I, action, 'gamepad'); if (!code) return { kind: 'key', lab: '?' };
      const n = +code.slice(3), xb = xbox(I);
      if (n <= 3) { const [lab, col] = (xb ? XB : PS)[n]; return { kind: 'badge', lab, col }; }
      if (n <= 7) return { kind: 'tab', lab: SH[xb ? 'xb' : 'ps'][n - 4] };
      return { kind: 'key', lab: OTHER[xb ? 'xb' : 'ps'][n] || code, dark: true };
    }
    if (d === 'mouse') { const code = codeFor(I, action, 'mouse'); if (code && /^Mouse/.test(code)) return { kind: 'mouse', n: +code.slice(5) }; return { kind: 'key', lab: code ? I.codeLabel(code) : '?' }; }
    if (d === 'touch') return { kind: 'key', lab: action.toUpperCase() };
    const code = codeFor(I, action, 'keyboard'); return { kind: 'key', lab: code ? I.codeLabel(code) : '?' };
  }
  const widthOf = (sp, sc) => sp.kind === 'badge' ? Math.ceil(9 * sc + 1) : sp.kind === 'tab' ? Math.ceil(W(sp.lab, sc) + 6 * sc) : sp.kind === 'mouse' ? Math.ceil(7 * sc + 1) : Math.ceil(Math.max(9 * sc, W(String(sp.lab).toUpperCase(), sc) + 6 * sc));
  /** draw one chip; returns its width. o: { input, device, scale } */
  function chip(g, action, x, y, o = {}) {
    const I = o.input || game.input, d = o.device || dev(I), sc = o.scale || 1, h = 9 * sc, sp = spec(I, action, d);
    x = Math.round(x); y = Math.round(y);
    if (sp.kind === 'badge') { const r = 4.5 * sc; px.disc(g, x + r, y + r, r + .5, '#0c1018'); px.disc(g, x + r, y + r, r - .5, '#1e2636'); E.font.text(g, sp.lab, x + r + .5, y + r - 3 * sc, sp.col, { align: 'center', scale: sc, outline: false }); return widthOf(sp, sc); }
    if (sp.kind === 'tab') { const w = widthOf(sp, sc); px.rect(g, x, y, w, h, '#0c1018'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#2a3448'); px.rect(g, x + 1, y + 1, w - 2, 1, '#4a5a78'); E.font.text(g, sp.lab, x + w / 2, y + 1 * sc, '#e8eef8', { align: 'center', scale: sc, outline: false }); return w; }
    if (sp.kind === 'mouse') return mouse(g, sp.n, x, y, sc);
    return keycap(g, sp.lab, x, y, sc, sp.dark ? '#2a3448' : undefined);
  }
  function keycap(g, lab, x, y, sc = 1, bg = '#e8e4d8') {
    lab = String(lab).toUpperCase(); const w = Math.ceil(Math.max(9 * sc, W(lab, sc) + 6 * sc)), h = 9 * sc, dark = bg !== '#e8e4d8';
    px.rect(g, x, y + 1, w, h, '#0c1018'); px.rect(g, x, y, w, h - 1, dark ? bg : '#c8c4b8'); px.rect(g, x + 1, y, w - 2, h - 2, bg); px.rect(g, x + 1, y, w - 2, 1, dark ? '#4a5a78' : '#ffffff');
    E.font.text(g, lab, x + w / 2, y + 1 * sc, dark ? '#e8eef8' : '#1a1a22', { align: 'center', scale: sc, outline: false }); return w;
  }
  function mouse(g, btn, x, y, sc = 1) {
    const w = 7 * sc, h = 10 * sc; px.rect(g, x, y, w, h, '#0c1018'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#e8e4d8'); px.rect(g, x + 1, y + 4 * sc, w - 2, 1, '#8a8a90');
    const lit = '#ffd36a'; if (btn === 0) px.rect(g, x + 1, y + 1, Math.floor((w - 2) / 2), 3 * sc, lit); else if (btn === 2) px.rect(g, x + Math.ceil(w / 2), y + 1, Math.floor((w - 2) / 2), 3 * sc, lit); else px.rect(g, x + Math.floor(w / 2), y + 1, 1 * sc, 3 * sc, '#e83a2a');
    px.rect(g, x + Math.floor(w / 2), y + 1, 1, 3 * sc, '#8a8a90'); return Math.ceil(w + 1);
  }
  /** the width of a chip (to center a prompt) */
  function chipW(action, o = {}) { const I = o.input || game.input; return widthOf(spec(I, action, o.device || dev(I)), o.scale || 1); }
  /** text with {action} chips; o: { align, color, scale, input, shadow }; returns its width */
  function text(g, str, x, y, o = {}) {
    const parts = String(str).split(/(\{[a-z]+\})/), sc = o.scale || 1, col = o.color || '#eef4ff';
    const widths = parts.map(p => /^\{[a-z]+\}$/.test(p) ? chipW(p.slice(1, -1), o) + 2 : E.font.width(p, { scale: sc }));
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    parts.forEach((p, i) => {
      if (/^\{[a-z]+\}$/.test(p)) { chip(g, p.slice(1, -1), cx + 1, y - 1 * sc, o); }
      else if (p) E.font.text(g, p, Math.round(cx), Math.round(y), col, { scale: sc, outline: false, shadow: o.shadow === undefined ? '#000' : o.shadow });
      cx += widths[i];
    });
    return total;
  }
  /** a plain-text label for logs and hub tags: 'J', '✕', 'Left click' */
  const label = (action, I = game.input) => { const d = dev(I), c = codeFor(I, action, d === 'mouse' ? 'mouse' : d === 'gamepad' ? 'gamepad' : 'keyboard'); if (!c) return '?'; if (/^Pad(\d+)$/.test(c)) { const n = +c.slice(3); return n <= 3 ? (xbox(I) ? XB : PS)[n][0] : n <= 7 ? SH[xbox(I) ? 'xb' : 'ps'][n - 4] : OTHER[xbox(I) ? 'xb' : 'ps'][n]; } return I.codeLabel(c); };
  return { chip, chipW, text, keycap, mouse, label, dev, PS, XB };
})();

/* ---- 12-ui.js ---- */
/* ---- UI (section 12): 10-foot widgets. Big tiles (at most 6 choices showing), focus by d-pad, stick, arrows, WASD and
 * mouse hover, a click or ✕ / Enter picks, ○ / Esc goes back; an animated gold border with a slight scale-up and an
 * organ blip. The legend at the bottom names the buttons for the device used last. Idle tracks the attract mode's
 * 10 seconds ---- */
const UI = (() => {
  const GOLD = '#ffd36a', INK = '#eef4ff', MUTED = '#9fb2cc', PANEL = ['#0e1830', '#060a16'];
  /** any player's press this step (menus answer to every player) */
  const anyP = a => game.players.some(I => I.pressed(a));
  const anyRep = a => game.players.some(I => I.repeat(a, .32, .09));
  let lastMouse = null, prevMouse = null, mouseMoved = false;
  /** the mouse in HUD pixels (r.W x r.H, no camera), or null */
  const mousePt = () => { const I = game.input; return I.mouse && I.mouse.active && I.screenPoint ? I.screenPoint(I.mouse.cx, I.mouse.cy) : null; };
  /** input this step: keys, buttons, clicks, wheel, the mouse moved more than 8 px, a stick or trigger past .3 (the
   *  attract mode's idle rule); mouseMoved: the pointer moved at all this step (hover focus) */
  function anyInput() {
    const I = game.input, ms = mousePt();
    mouseMoved = !!(ms && prevMouse && (ms[0] !== prevMouse[0] || ms[1] !== prevMouse[1])); prevMouse = ms ? ms.slice() : null;
    let far = false;
    if (ms) { if (!lastMouse) lastMouse = ms.slice(); else if (Math.hypot(ms[0] - lastMouse[0], ms[1] - lastMouse[1]) > 8) { far = true; lastMouse = ms.slice(); I.lastDevice = 'mouse'; } }   // (a moving mouse is the device in use: prompts show mouse buttons)
    if (far) return true;
    for (const P2 of game.players) { if (P2.anyPressed()) return true; if ((P2.padAxes || []).some(a => Math.abs(a) > .3)) return true; if (P2.clicked && P2.clicked()) return true; }
    return false;
  }
  const Idle = { t: 0, step(dt) { if (anyInput()) Idle.t = 0; else Idle.t += dt; return Idle.t; }, reset() { Idle.t = 0; } };
  const pointer = () => mousePt();
  /** a box with a gradient and a border; focused ones glow gold */
  function panel(g, x, y, w, h, o = {}) {
    E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || PANEL, border: o.border || (o.focus ? GOLD : '#3a4a6a'), alpha: o.alpha === undefined ? .94 : o.alpha });
    if (o.focus) { const t = game.real, k = Math.floor(t * 10) % 4; px.rect(g, x - 1, y - 1, w + 2, 1, k < 2 ? GOLD : '#fff2c0'); px.rect(g, x - 1, y + h, w + 2, 1, k < 2 ? GOLD : '#fff2c0'); px.rect(g, x - 1, y, 1, h, k % 2 ? GOLD : '#fff2c0'); px.rect(g, x + w, y, 1, h, k % 2 ? GOLD : '#fff2c0'); }
  }
  /** the legend at the bottom: [['confirm', 'SELECT'], ['cancel', 'BACK']] as chips */
  function legend(g, r, items, y) {
    const str = items.map(([a, t]) => '{' + a + '} ' + t).join('     ');
    Glyphs.text(g, str, r.W / 2, y === undefined ? r.H - 14 : y, { align: 'center', color: MUTED });
  }
  const title = (g, text, x, y, sc = 3, colors) => E.font.title(g, text, Math.round(x), Math.round(y), { align: 'center', scale: sc, colors: colors || ['#ffffff', '#cfe8ff', '#7ab8ff', '#2a5ab8'], depth: 2, depthColor: '#0a1430' });
  /** a grid of big tiles: items [{ id, label, sub, icon(g, x, y, w, h, focus), disabled, color }] */
  class Tiles {
    constructor(items, o = {}) { this.items = items; this.cols = o.cols || 3; this.i = o.i || 0; this.w = o.w || 120; this.h = o.h || 56; this.gap = o.gap || 8; this.onPick = o.onPick || null; this.onBack = o.onBack || null; this.pulse = 0; this.rects = []; this.y = o.y || 80; this.x = o.x; this.enabled = true; }
    move(d) { const n = this.items.length; let j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!this.items[j].disabled) break; } if (j !== this.i) { this.i = j; this.pulse = 1; Synth.sfx('menuMove'); } }
    update(dt) {
      if (!this.enabled) return null;
      this.pulse = Math.max(0, this.pulse - dt * 4);
      const c = this.cols, n = this.items.length;
      if (anyRep('left')) this.move(-1); if (anyRep('right')) this.move(1);
      if (anyRep('up') && this.i - c >= 0) { this.i -= c; this.pulse = 1; Synth.sfx('menuMove'); } if (anyRep('down') && this.i + c < n) { this.i += c; this.pulse = 1; Synth.sfx('menuMove'); }
      const p = pointer(); if (p && mouseMoved) { const k = this.rects.findIndex(q => p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; this.pulse = 1; Synth.sfx('menuMove'); } }
      const ck = game.input.clicked(); if (ck) { const k = this.rects.findIndex(q => ck[0] >= q[0] && ck[0] < q[0] + q[2] && ck[1] >= q[1] && ck[1] < q[1] + q[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(); } }
      if (anyP('confirm') || anyP('start')) return this.pick();
      if (anyP('cancel') && this.onBack) { Synth.sfx('menuBack'); game.players.forEach(I => I.consumeAll()); this.onBack(); }
      return null;
    }
    pick() { const it = this.items[this.i]; if (!it || it.disabled) return null; Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); if (this.onPick) this.onPick(it, this.i); return it; }
    draw(g, r) {
      const c = this.cols, rows = Math.ceil(this.items.length / c), tw = c * this.w + (c - 1) * this.gap, x0 = this.x === undefined ? Math.round(r.W / 2 - tw / 2) : this.x;
      this.rects = [];
      this.items.forEach((it, k) => {
        const cx = k % c, cy = Math.floor(k / c), f = k === this.i, grow = f ? 2 + Math.round(this.pulse * 2) : 0;
        const x = x0 + cx * (this.w + this.gap) - grow, y = this.y + cy * (this.h + this.gap) - grow, w = this.w + grow * 2, h = this.h + grow * 2;
        this.rects.push([x0 + cx * (this.w + this.gap), this.y + cy * (this.h + this.gap), this.w, this.h]);
        panel(g, x, y, w, h, { focus: f, bg: it.disabled ? ['#141820', '#0a0c12'] : f ? ['#1c3260', '#0a1430'] : PANEL });
        if (it.icon) it.icon(g, x, y, w, h, f);
        E.font.text(g, it.label, x + w / 2, y + h - (it.sub ? 21 : 13), it.disabled ? '#5a6478' : f ? GOLD : INK, { align: 'center', scale: it.big === false ? 1 : 1, outline: '#000' });
        if (it.sub) E.font.text(g, it.sub, x + w / 2, y + h - 11, it.disabled ? '#4a5466' : MUTED, { align: 'center', font: 'tiny', outline: false });
      });
      void rows;
    }
  }
  /** a toast queue (objectives met, unlocks, items): drawn under the score bug */
  const toasts = [];
  const toast = (text, color = GOLD, t = 2.6) => { toasts.push({ text, color, t, max: t }); if (toasts.length > 3) toasts.shift(); };
  function drawToasts(g, r, y = 60) { let k = 0; for (const q of toasts) { q.t -= 1 / 60; const a = Math.min(1, q.t * 2), w = E.font.width(q.text) + 16; px.blend(g, .8 * a, 'normal', () => panel(g, r.W / 2 - w / 2, y + k * 16, w, 14, { border: q.color })); E.font.text(g, q.text, r.W / 2, y + k * 16 + 4, q.color, { align: 'center', outline: false }); k++; } for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t <= 0) toasts.splice(i, 1); }
  return { Idle, anyInput, anyP, anyRep, pointer, panel, legend, title, Tiles, toast, drawToasts, GOLD, INK, MUTED, PANEL, get mouseMoved() { return mouseMoved; } };
})();

/* ---- 20-rink.js ---- */
/* ---- RINK (7.1): the geometry (an analytic rounded rectangle, lines, dots, creases, nets, 48 glass panels), the
 * collision queries, the floor TileMap per arena (stands as stepped wall tiers), and the drawing of the boards, the glass,
 * the nets and the scuff layer. 16 u = 1 m. x runs west-east along the rink, y north-south (south is toward the camera) ---- */
const Rink = (() => {
  const C = { x: 560, y: 400 }, HL = 432, HW = 192, CR = 96, AX = HL - CR, AY = HW - CR;
  const GOAL = 376, MOUTH = 16, NET_D = 20, BAR = 20, POST_R = 1.5, BOARD_H = 17, THICK = 8;
  const X0 = C.x - HL, X1 = C.x + HL, Y0 = C.y - HW, Y1 = C.y + HW;
  /** where the boards are from a point: d = distance inside (negative outside), n = the inward normal */
  function wall(x, y) {
    const dx = x - C.x, dy = y - C.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax <= AX) return { d: HW - ay, nx: 0, ny: dy > 0 ? -1 : 1 };
    if (ay <= AY) return { d: HL - ax, nx: dx > 0 ? -1 : 1, ny: 0 };
    const cx = C.x + Math.sign(dx) * AX, cy = C.y + Math.sign(dy) * AY, vx = x - cx, vy = y - cy, d = Math.hypot(vx, vy) || 1;
    return { d: CR - d, nx: -vx / d, ny: -vy / d };
  }
  const inside = (x, y, r = 0) => wall(x, y).d >= r;
  /** keep a body (x, y, vx, vy) at least r inside the boards: reflect the normal speed by e, keep k of the tangent.
   *  Returns the speed it hit with (0 when it didn't), and the normal */
  function clampBody(b, r, e = .3, k = .85) {
    const w = wall(b.x, b.y); if (w.d >= r) return 0;
    b.x += w.nx * (r - w.d); b.y += w.ny * (r - w.d);
    const vn = b.vx * w.nx + b.vy * w.ny; if (vn >= 0) return 0;
    const tx = b.vx - vn * w.nx, ty = b.vy - vn * w.ny;
    b.vx = tx * k - vn * e * w.nx; b.vy = ty * k - vn * e * w.ny;
    clampBody.n = w; return -vn;
  }
  /* ---- goals: side 0 is the west net (its mouth faces east), 1 the east ---- */
  const goalX = s => s ? C.x + GOAL : C.x - GOAL;
  const intoNet = s => s ? 1 : -1;   // the direction from the goal line into net s
  const NETS = [0, 1].map(s => ({ s, x: goalX(s), back: goalX(s) + intoNet(s) * NET_D, bulge: 0, bv: 0, by: 0, light: 0, tip: 0 }));
  /** a point is inside net s's frame (behind the line, between the sides) */
  const inNet = (s, x, y) => { const n = NETS[s], u = (x - n.x) * intoNet(s); return u > 0 && u < NET_D && Math.abs(y - C.y) < MOUTH; };
  /** skaters are kept out of the net's frame (a box) */
  function netPush(b, r) {
    for (const n of NETS) {
      const x0 = Math.min(n.x, n.back) - r, x1 = Math.max(n.x, n.back) + r, y0 = C.y - MOUTH - r, y1 = C.y + MOUTH + r;
      if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1) continue;
      const pen = [b.x - x0, x1 - b.x, b.y - y0, y1 - b.y], m = Math.min(...pen), i = pen.indexOf(m);
      if (i === 0) { b.x = x0; b.vx = Math.min(0, b.vx) * .3; } else if (i === 1) { b.x = x1; b.vx = Math.max(0, b.vx) * .3; }
      else if (i === 2) { b.y = y0; b.vy = Math.min(0, b.vy) * .3; } else { b.y = y1; b.vy = Math.max(0, b.vy) * .3; }
    }
  }
  /* ---- faceoff spots: center, the 4 end-zone dots, the 4 neutral-zone dots ---- */
  const DOTS = { center: [C.x, C.y], wn: [C.x - 280, C.y - 112], ws: [C.x - 280, C.y + 112], en: [C.x + 280, C.y - 112], es: [C.x + 280, C.y + 112],
    nwn: [C.x - 84, C.y - 112], nws: [C.x - 84, C.y + 112], nen: [C.x + 84, C.y - 112], nes: [C.x + 84, C.y + 112] };
  const nearestDot = (x, y, endOnly) => { let best = 'center', bd = 1e9; for (const k in DOTS) { if (endOnly && !/^[we][ns]$/.test(k)) continue; const d = Math.hypot(DOTS[k][0] - x, DOTS[k][1] - y); if (d < bd) { bd = d; best = k; } } return best; };

  /* ---- the 48 glass panels: 14 on each straight side, 4 on each end, 3 on each corner arc. Each is a run of short board
   * segments (the arcs in 3 pieces each) ---- */
  const panels = [];
  (() => {
    const add = (pts, side) => { const a = pts[0], b = pts[pts.length - 1], mid = pts[Math.floor(pts.length / 2)], w = wall((a[0] + b[0]) / 2 + 0, (a[1] + b[1]) / 2);
      const nx = side === 'n' ? 0 : side === 's' ? 0 : w.nx, ny = side === 'n' ? 1 : side === 's' ? -1 : w.ny;
      panels.push({ i: panels.length, side, pts, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, nx: side === 'n' || side === 's' ? 0 : nx, ny: side === 'n' ? 1 : side === 's' ? -1 : ny, mid,
        state: 'ok', hp: 0, near: side === 's' || ((side === 'sw' || side === 'se') && true), glassH: side === 'w' || side === 'e' ? 40 : 28, shake: 0, fixT: 0 }); };
    for (let i = 0; i < 14; i++) { const x0 = C.x - AX + i * 48, x1 = x0 + 48; add([[x0, Y0], [x1, Y0]], 'n'); }
    for (let i = 0; i < 14; i++) { const x0 = C.x - AX + i * 48, x1 = x0 + 48; add([[x0, Y1], [x1, Y1]], 's'); }
    for (let i = 0; i < 4; i++) { const y0 = C.y - AY + i * 48, y1 = y0 + 48; add([[X0, y0], [X0, y1]], 'w'); add([[X1, y0], [X1, y1]], 'e'); }
    const arc = (cx, cy, a0, side) => { for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 3; k++) { const a = a0 + (i * 3 + k) / 9 * PI / 2; pts.push([cx + Math.cos(a) * CR, cy + Math.sin(a) * CR]); } add(pts, side); } };
    arc(C.x - AX, C.y - AY, PI, 'nw'); arc(C.x + AX, C.y - AY, -PI / 2, 'ne'); arc(C.x + AX, C.y + AY, 0, 'se'); arc(C.x - AX, C.y + AY, PI / 2, 'sw');
    for (const p of panels) { const w = wall(p.mx + (p.side.length > 1 ? 0 : 0), p.my); p.nx = p.side === 'n' ? 0 : p.side === 's' ? 0 : p.side === 'w' ? 1 : p.side === 'e' ? -1 : w.nx; p.ny = p.side === 'n' ? 1 : p.side === 's' ? -1 : p.side === 'w' || p.side === 'e' ? 0 : w.ny; p.near = p.ny < -.2; }
  })();
  const panelAt = (x, y) => { let best = null, bd = 1e9; for (const p of panels) { const d = Math.hypot(p.mx - x, p.my - y); if (d < bd) { bd = d; best = p; } } return best; };
  const resetPanels = () => { for (const p of panels) { p.state = 'ok'; p.shake = 0; p.fixT = 0; } };

  /* ---- the scuff layer: 54 x 24 cells of 16 u over the rink, scuff and melt 0..1 each ---- */
  const SW = 54, SH = 24, scuff = new Float32Array(SW * SH), melt = new Float32Array(SW * SH);
  const cellOf = (x, y) => { const cx = Math.floor((x - X0) / 16), cy = Math.floor((y - Y0) / 16); return cx < 0 || cy < 0 || cx >= SW || cy >= SH ? -1 : cy * SW + cx; };
  const addScuff = (x, y, v, rad = 0) => { for (let oy = -rad; oy <= rad; oy++) for (let ox = -rad; ox <= rad; ox++) { const i = cellOf(x + ox * 16, y + oy * 16); if (i >= 0) scuff[i] = Math.min(1, scuff[i] + v); } };
  const addMelt = (x, y, v) => { const i = cellOf(x, y); if (i >= 0) melt[i] = Math.min(1, melt[i] + v); };
  const clearIce = (x0 = X0, x1 = X1, y0 = Y0, y1 = Y1, k = 0) => { for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) { const x = X0 + cx * 16 + 8, y = Y0 + cy * 16 + 8; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { const i = cy * SW + cx; scuff[i] *= k; melt[i] *= k; } } };
  const scuffTotal = () => { let s = 0; for (let i = 0; i < scuff.length; i++) s += scuff[i] + melt[i]; return s; };

  /* ---- the floor: ice paint (lines, circles, dots, creases, the home team's logo at center ice), the apron, the stands'
   * walkways and the benches; one TileMap per arena and home team, baked as it is first drawn ---- */
  const RED = [200, 40, 46], BLUE = [40, 80, 190], CREASE = [159, 211, 255];
  const W = 70, H = 44;
  function paint(arena, home) {
    const A = ARENAS[arena], ice = A.ice, logoTeam = home;
    return (x, y) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05);
      const w = wall(x, y);
      if (w.d < 0) {   // outside the boards: the apron, the walkways, the benches
        const o = (y > Y0 - 26 && y < Y0 && x > C.x - 230 && x < C.x + 230) ? [42, 38, 44] : (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? A.outside : A.outsideB;
        if (A.snowbanks) { const s = 220 + n * 26 + m * 18; return [s - 6, s, s + 8]; }
        if (arena === 'mall') { const tile = (Math.floor(x / 16) + Math.floor(y / 16)) % 2; return tile ? [214 + n * 10, 206 + n * 10, 220 + n * 10] : [170 + n * 10, 160 + n * 10, 182 + n * 10]; }
        return [o[0] + n * 14 + m * 8, o[1] + n * 14 + m * 8, o[2] + n * 14 + m * 8];
      }
      // ice: cloudy patches (two noise octaves), long skate-scrape arcs, frost speckle
      const streak = E.noise2(x * .55 + y * .08, y * .05 - x * .02), cut = streak > .74 ? (streak - .74) * 55 : 0;
      const cloud = E.noise2(x * .012 + 7, y * .02 + 3) * 22 + E.noise2(x * .04, y * .05 + 11) * 9;
      const arc = Math.abs(Math.sin(Math.hypot(x - C.x * .7, y - C.y * 1.6) * .045 + E.noise2(x * .01, y * .01) * 4)) < .04 ? 9 : 0;
      const frost = E.hash2(Math.floor(x / 2), Math.floor(y / 2)) > .93 ? 10 : 0;
      let c = [ice[0] - 16 + n * 10 + cloud - cut - arc + frost, ice[1] - 11 + n * 9 + cloud * .9 - cut - arc + frost, ice[2] - 4 + n * 6 + cloud * .55 - cut * .5 - arc * .5 + frost];
      const mix = (col, a) => { c = [c[0] + (col[0] - c[0]) * a, c[1] + (col[1] - c[1]) * a, c[2] + (col[2] - c[2]) * a]; };
      // the center-ice logo, painted under the lines
      const lu = (x - C.x) / 3 + 12, lv = (y - C.y) / 3 + 12;
      if (lu > 0 && lu < 24 && lv > 0 && lv < 24) { const lc = Logo.sample(logoTeam, lu, lv); if (lc) mix(E.hex(lc), .62); }
      const dx = x - C.x, dy = y - C.y, adx = Math.abs(dx);
      // creases: half discs in front of each goal line, light blue with a red rim
      for (const s of [0, 1]) { const gx = goalX(s), u = (gx - x) * intoNet(s); if (u > 0) { const d = Math.hypot(u, y - C.y); if (d < 28) mix(d > 26.5 ? RED : CREASE, d > 26.5 ? .95 : .75); } }
      if (Math.abs(adx - GOAL) < 1.2 && w.d > 0) mix(RED, .9);                         // goal lines
      if (Math.abs(adx - 108) < 2.6) mix(BLUE, .88);                                    // blue lines
      if (adx < 2.6) { mix(RED, .85); if ((Math.floor(y / 6)) % 2 && adx < 1) mix([255, 255, 255], .3); }   // the center red line, dashed
      const ring = (cx, cy, r, col, wd = 1.2) => { const d = Math.hypot(x - cx, y - cy); if (Math.abs(d - r) < wd) mix(col, .9); return d; };
      ring(C.x, C.y, 72, BLUE); if (Math.hypot(dx, dy) < 4) mix(BLUE, .95);
      for (const k of ['wn', 'ws', 'en', 'es']) { const [cx, cy] = DOTS[k], d = ring(cx, cy, 72, RED); if (d < 5) mix(RED, .95); if (Math.abs(Math.abs(y - cy) - 4) < .8 && Math.abs(Math.abs(x - cx) - 9) < 4) mix(RED, .9); }
      for (const k of ['nwn', 'nws', 'nen', 'nes']) { const [cx, cy] = DOTS[k]; if (Math.hypot(x - cx, y - cy) < 4) mix(RED, .95); }
      // cool shading near the boards, a faint sheen
      if (w.d < 24) mix([150, 180, 210], (1 - w.d / 24) * .22);
      const sheen = E.noise2(x * .012 + 3, y * .02) ; if (sheen > .62) mix([255, 255, 255], (sheen - .62) * .9);
      return c;
    };
  }
  /** the arena's TileMap: north stands in 5 tiers, stands at both ends, the rink's floor */
  const maps = new Map();
  function build(arena, home) {
    const key = arena + ':' + home; if (maps.has(key)) return maps.get(key);
    const A = ARENAS[arena], rows = [];
    for (let R = 0; R < H; R++) {
      let s = '';
      for (let c = 0; c < W; c++) {
        let ch = '.';
        if (A.stand) {
          if (R <= 9 && c >= 6 && c <= 63) ch = String(5 - Math.floor(R / 2));
          else if ((c <= 5 || c >= 64) && R >= 3 && R <= 38) { const k = c <= 5 ? c : 69 - c; ch = String(5 - Math.floor(k / 2)); }
          else if (R <= 9 && (c < 6 || c > 63)) ch = '5';
        }
        s += ch;
      }
      rows.push(s);
    }
    const st = A.stand || { face: 'plank', side: '#555', top: '#666' }, sh = (c, k) => E.shade(c, k);
    const types = {};
    [24, 34, 44, 54, 64].forEach((h, i) => { types[i + 1] = { h, face: st.face, side: sh(st.side, -.04 * i), top: sh(st.top, -.05 * i), line: sh(st.side, -.35) }; });
    const map = new E.TileMap({ rows, legend: { '.': { floor: 'ice' }, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, types, floorTex: paint(arena, home), outside: '#' + A.outside.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), ao: 4 });
    maps.set(key, map); return map;
  }
  /** the crowd's seats: two fans on every stand tile, on its top */
  function seats(arena) {
    const A = ARENAS[arena], out = []; if (!A.stand) return out;
    const map = build(arena, A.home);
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const h = map.height ? map.height(cx, cy) : 0; if (!h) continue;
      for (const dx of [4, 12]) { const hh = E.hash2(cx * 3 + dx, cy * 7 + 1); out.push({ x: cx * 16 + dx, y: cy * 16 + 9, z: h, h: hh, side: hh < .7 ? 0 : 1 }); }
    }
    return out;
  }

  /* ---- drawing the boards, glass and nets: each panel queued at its middle so it sorts against the skaters; the near
   * (south) boards and corners cut low (6 u, the top rail only) so they never hide play ---- */
  function drawBoards(r, arena, homeColor, t) {
    const A = ARENAS[arena], bt = E.tones(A.boards), cap = E.tones(homeColor), kick = E.tones(A.kick);
    for (const p of panels) {
      const near = p.near, h = A.snowbanks ? 12 : near ? 6 : BOARD_H, pts = p.pts, shake = p.shake > 0 ? Math.sin(t * 60) * p.shake * 1.5 : 0;
      r.queue(p.mx - p.nx * 2, p.my - p.ny * 2, 0, g => {
        for (let k = 0; k < pts.length - 1; k++) {
          const [ax, ay] = pts[k], [bx, by] = pts[k + 1], ox = -p.nx * THICK, oy = -p.ny * THICK;
          if (A.snowbanks) {   // the pond: snowbanks, rounded, no glass
            const q = [r.w(ax, ay, 0), r.w(bx, by, 0), r.w(bx + ox * 2, by + oy * 2, 0), r.w(ax + ox * 2, ay + oy * 2, 0)];
            const top = [r.w(ax + ox * .4, ay + oy * .4, h), r.w(bx + ox * .4, by + oy * .4, h), r.w(bx + ox * 1.4, by + oy * 1.4, h * .7), r.w(ax + ox * 1.4, ay + oy * 1.4, h * .7)];
            px.poly(g, [q[0], q[1], top[1], top[0]], '#c8d8ea'); px.poly(g, top, '#f4f8ff'); px.poly(g, [top[3], top[2], q[2], q[3]], '#dce8f4');
            px.line(g, top[0][0], top[0][1], top[1][0], top[1][1], '#ffffff');
            continue;
          }
          const faceCam = p.ny > .2 || (p.ny > -.2 && false);
          const fa = faceCam ? [ax, ay] : [ax + ox, ay + oy], fb = faceCam ? [bx, by] : [bx + ox, by + oy];
          const f0 = r.w(fa[0], fa[1], 0), f1 = r.w(fb[0], fb[1], 0), f2 = r.w(fb[0], fb[1], h), f3 = r.w(fa[0], fa[1], h);
          px.poly(g, [f0, f1, f2, f3], faceCam ? bt.base : bt.sh);
          if (!near) { const k0 = r.w(fa[0], fa[1], 2.5), k1 = r.w(fb[0], fb[1], 2.5); px.poly(g, [f0, f1, k1, k0], kick.base); }
          const c0 = r.w(ax, ay, h), c1 = r.w(bx, by, h), c2 = r.w(bx + ox, by + oy, h), c3 = r.w(ax + ox, ay + oy, h);
          px.poly(g, [c0, c1, c2, c3], cap.base); px.line(g, c0[0], c0[1], c1[0], c1[1], cap.lt);
          if (faceCam && !near) px.line(g, f3[0], f3[1] + 1, f2[0], f2[1] + 1, bt.lt);
        }
        // the ads on the far boards
        if (p.side === 'n' && A.ads.length && p.i % 3 === 1) {
          const ad = A.ads[Math.floor(p.i / 3) % A.ads.length], q = r.w(p.mx, p.my, 9);
          E.font.text(g, ad.length > 16 ? ad.slice(0, 16) : ad, Math.round(q[0]), Math.round(q[1]) - 2, ['#c8202a', '#1a3a8a', '#2a6a2a', '#5a3a22'][p.i % 4], { font: 'tiny', align: 'center', outline: false });
        }
        // the glass: a pane above the boards (not on the near side), cracked or empty by its state
        if (!near && !A.snowbanks && A.glassTint !== null) {
          const gh = p.glassH, a = pts[0], b = pts[pts.length - 1], g0 = r.w(a[0], a[1], BOARD_H), g1 = r.w(b[0], b[1], BOARD_H), g2 = r.w(b[0], b[1], BOARD_H + gh), g3 = r.w(a[0], a[1], BOARD_H + gh);
          for (const q of [g0, g1, g2, g3]) q[0] += shake;
          if (p.state !== 'shattered') {
            px.blend(g, .22, 'screen', () => px.poly(g, [g0, g1, g2, g3], A.glassTint || '#cfe8ff'));
            px.line(g, lerp(g0[0], g1[0], .2), lerp(g0[1], g1[1], .2) - 2, lerp(g3[0], g2[0], .35), lerp(g3[1], g2[1], .35) + 3, '#ffffff');
            if (p.state === 'cracked') { const cx = lerp(g0[0], g2[0], .5), cy = lerp(g0[1], g2[1], .5); for (let k = 0; k < 6; k++) { const an = k * 1.05 + .3, L2 = 5 + (k % 3) * 3; px.line(g, cx, cy, cx + Math.cos(an) * L2, cy + Math.sin(an) * L2 * .8, '#ffffff'); } }
          } else { px.line(g, g3[0], g3[1], g2[0], g2[1], '#8a9aaa'); for (let k = 0; k < 3; k++) px.dot(g, lerp(g0[0], g1[0], .2 + k * .3), g0[1] - 2, '#d8f0ff'); }
          px.line(g, g0[0], g0[1], g3[0], g3[1], '#7a8a9a'); px.line(g, g1[0], g1[1], g2[0], g2[1], '#7a8a9a');   // stanchions
          px.line(g, g3[0], g3[1], g2[0], g2[1], '#c8d8e8');
        }
      }, { bias: near ? .5 : -.5 });
    }
  }
  /** the nets: the back half (mesh, frame) behind the goalie, the posts, the crossbar and the near side mesh in front */
  function drawNets(r, t) {
    for (const n of NETS) {
      const s = n.s, d = intoNet(s), gx = n.x, bx = n.back, y0 = C.y - MOUTH, y1 = C.y + MOUTH, tip = n.tip;
      const back = (y, z) => { const bul = n.bulge * Math.exp(-((y - n.by) ** 2) / 120) * (z < 14 ? 1 : .5); return r.w(bx + d * (bul + tip * 6), y, z * (1 - tip * .5)); };
      r.queue(gx + d * 10, y0, 0, g => {
        // the roof and the back mesh
        const pts = [r.w(gx, y0, BAR), r.w(gx, y1, BAR), back(y1, 12), back(y0, 12)];
        px.blend(g, .35, 'normal', () => px.poly(g, pts, '#e8eef4'));
        for (let k = 0; k <= 8; k++) { const y = lerp(y0, y1, k / 8), a = back(y, 0), b = back(y, 12), c2 = r.w(gx, y, BAR); px.line(g, a[0], a[1], b[0], b[1], '#c8d0d8'); px.line(g, b[0], b[1], c2[0], c2[1], '#d8e0e8'); }
        for (let z = 0; z <= 12; z += 3) { const a = back(y0, z), b = back(y1, z); px.line(g, a[0], a[1], b[0], b[1], '#c8d0d8'); }
        // the far side mesh and the frame along the ice
        const fs = [r.w(gx, y0, 0), back(y0, 0), back(y0, 12), r.w(gx, y0, BAR)]; px.blend(g, .3, 'normal', () => px.poly(g, fs, '#e0e8f0'));
        const f0 = r.w(gx, y0, 0), f1 = back(y0, 0), f2 = back(y1, 0), f3 = r.w(gx, y1, 0);
        px.line(g, f0[0], f0[1], f1[0], f1[1], '#c82a2a'); px.line(g, f1[0], f1[1], f2[0], f2[1], '#c82a2a');
        const p0 = r.w(gx, y0, 0), p0t = r.w(gx, y0, BAR); px.line(g, p0[0], p0[1], p0t[0], p0t[1], '#e8343a', 2);
      }, { bias: -1 });
      r.queue(gx + d * 10, y1, 0, g => {
        const ns = [r.w(gx, y1, 0), back(y1, 0), back(y1, 12), r.w(gx, y1, BAR)]; px.blend(g, .32, 'normal', () => px.poly(g, ns, '#eef4fa'));
        for (let k = 1; k < 5; k++) { const a = r.w(lerp(gx, bx, k / 5), y1, 0), b = r.w(lerp(gx, bx, k / 5), y1, lerp(BAR, 12, k / 5)); px.line(g, a[0], a[1], b[0], b[1], '#d0d8e0'); }
        const f2 = back(y1, 0), f3 = r.w(gx, y1, 0); px.line(g, f2[0], f2[1], f3[0], f3[1], '#c82a2a');
        const p1 = r.w(gx, y1, 0), p1t = r.w(gx, y1, BAR), p0t = r.w(gx, y0, BAR);
        px.line(g, p1[0], p1[1], p1t[0], p1t[1], '#e8343a', 2); px.line(g, p0t[0], p0t[1], p1t[0], p1t[1], '#e8343a', 2);
        px.line(g, p0t[0], p0t[1] - 1, p1t[0], p1t[1] - 1, '#ff8a8a');
      }, { bias: 1 });
      // the goal light on the glass behind the net
      const lz = BOARD_H + 34, lx = s ? X1 - 4 : X0 + 4, on = n.light > 0 && Math.floor(t * 8) % 2 === 0;
      r.queue(lx, C.y, lz, g => { const q = r.w(lx, C.y, lz); px.disc(g, q[0], q[1], 3, on ? '#ff3a2a' : '#5a1a1a'); px.dot(g, q[0] - 1, q[1] - 1, on ? '#ffd0c0' : '#8a3a3a'); }, { emissive: on });
      if (on) L.add(lx, C.y, lz, 120, 1, { color: '#ff3a2a' });
    }
  }
  /** the scuff layer over the floor (decals): scratch lines by each cell's hash, puddles where it melted */
  function drawScuff(r) {
    r.decal(g => {
      for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) {
        const i = cy * SW + cx, sc = scuff[i], me = melt[i]; if (sc < .05 && me < .05) continue;
        const x = X0 + cx * 16, y = Y0 + cy * 16; if (!r.visible(x + 8, y + 8, 0)) continue;
        if (sc >= .05) { const n = 1 + Math.floor(sc * 3.5); for (let k = 0; k < n; k++) { const h = E.hash2(i * 7 + k, 3), a = h * PI, L2 = 5 + h * 7, ox = E.hash2(i, k) * 12 + 2, oy = E.hash2(k, i) * 12 + 2;
          const q0 = r.w(x + ox - Math.cos(a) * L2 / 2, y + oy - Math.sin(a) * L2 / 2, 0), q1 = r.w(x + ox + Math.cos(a) * L2 / 2, y + oy + Math.sin(a) * L2 / 2, 0);
          px.blend(g, Math.min(.6, sc * .7), 'normal', () => px.line(g, q0[0], q0[1], q1[0], q1[1], '#bccbd8')); } }
        if (me >= .05) { const q = r.w(x + 8, y + 8, 0); px.blend(g, Math.min(.7, me), 'normal', () => px.ell(g, q[0], q[1], 7, 4, '#8aa4bc')); px.dot(g, q[0] - 2, q[1] - 1, '#e8f4ff'); }
      }
    });
  }
  return { C, HL, HW, CR, GOAL, MOUTH, NET_D, BAR, POST_R, BOARD_H, X0, X1, Y0, Y1, wall, inside, clampBody, goalX, intoNet, NETS, inNet, netPush, DOTS, nearestDot,
    panels, panelAt, resetPanels, addScuff, addMelt, clearIce, scuffTotal, scuff, melt, SW, SH, build, seats, drawBoards, drawNets, drawScuff, W: W * 16, H: H * 16 };
})();

/* ---- 21-rigs.js ---- */
/* ---- RIGS (sections 8 and 9): the engine's Humanoid dressed for hockey. Gear (sticks, skates, helmets, masks, pads,
 * blocker and catcher, numbers, letters, stripes, beards, socks) is drawn through the rig's gear hook into its own
 * depth-sorted ops (ENGINE-CHANGES.md 3). Motion: each rig's solvePose is wrapped; after the engine's pose it re-solves
 * the legs (skating strides, glides, crossovers, hockey stops, backward C-cuts, goalie stances), the hands (stick-handling,
 * passes, wrist shots, slapshot wind-ups, checks, pokes, dekes, faceoffs) and the stick, from rig.hk, a small state the
 * Skater / Goalie code writes each step ---- */
const Rigs = (() => {
  const { V3, ik3 } = E, add = V3.add, lrp = V3.lerp;
  /** a team's kit: home teams wear their dark jersey, the visitors white with their color as trim */
  function kit(team, home) {
    const t = TEAMS[team];
    return home ? { cloth: t.dark, trim: t.trim, stripe: t.light, pants: t.pants, socks: t.dark, helmet: t.dark, glove: E.shade(t.dark, -.15) }
      : { cloth: t.light, trim: t.dark, stripe: t.trim, pants: t.pants, socks: t.light, helmet: t.light === '#f4ece0' ? '#e8e0d0' : t.light, glove: E.shade(t.dark, -.1) };
  }
  /* ---- the gear hook: K = { g, ops, S, Sp, Q, J, u, cap, limb, lq, dC, facingCam, rig, hd } ---- */
  function gear(K) {
    const { g, ops, Sp, Q, J, u, rig } = K, o = rig.o, C = rig.C, H = rig.hkGear || {}, tn = E.tones;
    const facingCam = K.facingCam !== undefined ? K.facingCam : true;
    // skates: a black boot and a steel blade under each foot
    if (H.skates) for (const s of [-1, 1]) {
      const ft = s > 0 ? J.footR : J.footL; if (!ft) continue;
      const a = Sp(ft, -2.2, 0, -.5), b = Sp(ft, 3, 0, -.5), far = (s > 0 ? Q.kneeR : Q.kneeL)[2] < K.dC;
      ops.push({ d: (a[2] + b[2]) / 2 + .004, f: () => { px.line(g, a[0], a[1], b[0], b[1], far ? '#7a828c' : '#dfe6ee', 1); px.dot(g, b[0], b[1] - 1, far ? '#9aa2ac' : '#ffffff'); } });
    }
    // socks over the shins in the team color, goalie pads instead for goalies
    if (K.hd) for (const s of [-1, 1]) {
      const knee = s > 0 ? Q.kneeR : Q.kneeL, foot = s > 0 ? Q.footR : Q.footL, far = knee[2] < K.dC; if (!knee || !foot) continue;
      const ank = K.lq(knee, foot, .7);
      if (H.pads) {
        const pt = tn(H.padColor || '#f4f4f0'), top = K.lq(knee, ank, -.25);
        ops.push({ d: (knee[2] + ank[2]) / 2 + .02, f: () => {
          K.cap(top, ank, 2.6 * u, 2.4 * u, far ? pt.sh : pt.deep); K.cap(top, ank, Math.max(.6, 2.6 * u - 1), Math.max(.6, 2.4 * u - 1), far ? pt.sh : pt.base, -.5, -.5);
          for (let k = 1; k < 4; k++) { const q = K.lq(top, ank, k / 4); px.line(g, q[0] - 2.2 * u, q[1], q[0] + 2.2 * u, q[1], pt.sh); }
          const st = tn(H.padTrim || '#c82a2a'); px.line(g, top[0], top[1], ank[0], ank[1], st.base);
        } });
      } else if (H.socks) { const sc = tn(H.socks); ops.push({ d: (knee[2] + ank[2]) / 2 + .0015, f: () => { K.cap(knee, ank, 1.15 * u, 1.05 * u, far ? sc.deep : sc.sh); K.cap(knee, ank, Math.max(.5, 1.15 * u - .8), Math.max(.5, 1.05 * u - .8), far ? sc.sh : sc.base, -.5, -.5); const st = K.lq(knee, ank, .35); px.line(g, st[0] - u, st[1], st[0] + u, st[1], tn(H.sockStripe || C.trim).base); } }); }
    }
    // the stick: a shaft from the top hand's end through to the heel, the blade along bladeDir2, tape on knob and blade
    if (H.stick && J.stickTop && J.blade) {
      const T0 = Sp(J.stickTop), B0 = Sp(J.blade), bd = J.bladeDir2 || [0, 1, 0], wide = H.stick === 'goalie';
      const tip = Sp(add(J.blade, V3.mul(bd, wide ? 5 : 5.5))), knob = Sp(lrp(J.stickTop, J.blade, -.04)), tape = Sp(lrp(J.stickTop, J.blade, .1));
      const paddle = wide ? Sp(lrp(J.stickTop, J.blade, .62)) : null;
      const sc = tn(H.stickColor || '#c8a070');
      ops.push({ d: (T0[2] + B0[2]) / 2 + (H.stickFront ? .3 : 0), f: () => {
        px.line(g, T0[0], T0[1], B0[0], B0[1], sc.sh, Math.max(1, Math.round(u * .8)));
        px.line(g, T0[0] - .4, T0[1] - .4, B0[0] - .4, B0[1] - .4, sc.base, 1);
        if (wide && paddle) px.line(g, paddle[0], paddle[1], B0[0], B0[1], sc.deep, Math.max(2, Math.round(u * 1.4)));
        px.line(g, knob[0], knob[1], tape[0], tape[1], '#f4f4f0', Math.max(1, Math.round(u * .8)));
        px.line(g, B0[0], B0[1], tip[0], tip[1], '#1a1a1e', Math.max(2, Math.round(u * (wide ? 1.6 : 1.2))));
        px.line(g, K.lq(B0, tip, .3)[0], K.lq(B0, tip, .3)[1], tip[0], tip[1], H.bladeTape || '#f4f4f0', 1);
      } });
    }
    // goalie blocker and catcher
    if (H.blocker && Q.handR) { const hd = Q.handR, bt = tn(H.padColor || '#f4f4f0'); ops.push({ d: hd[2] + .06, f: () => { px.rect(g, hd[0] - 2.2 * u, hd[1] - 3 * u, 4.4 * u, 5.6 * u, bt.sh); px.rect(g, hd[0] - 2.2 * u + 1, hd[1] - 3 * u + 1, 4.4 * u - 2, 5.6 * u - 2, bt.base); px.line(g, hd[0] - 1.6 * u, hd[1] - 2.4 * u, hd[0] + 1.6 * u, hd[1] - 2.4 * u, tn(H.padTrim || '#c82a2a').base); } }); }
    if (H.catcher && Q.handL) { const hd = Q.handL, ct = tn(H.padColor || '#f4f4f0'); ops.push({ d: hd[2] + .06, f: () => { px.disc(g, hd[0], hd[1], 3.2 * u, ct.sh); px.disc(g, hd[0] - .5, hd[1] - .5, 3.2 * u - 1, ct.base); px.line(g, hd[0] - 1.6 * u, hd[1] + .4 * u, hd[0] + 1.6 * u, hd[1] - .8 * u, tn(H.padTrim || '#c82a2a').base); px.dot(g, hd[0], hd[1], ct.deep); } }); }
    // bigger hockey gloves
    if (H.gloves && K.hd) for (const s of [-1, 1]) { const hd = s > 0 ? Q.handR : Q.handL; if (!hd || (s > 0 && H.blocker) || (s < 0 && H.catcher)) continue; const gt = tn(C.glove || '#333'); ops.push({ d: hd[2] + .03, f: () => { px.disc(g, hd[0], hd[1], Math.max(1, 1.25 * u), gt.sh); px.dot(g, hd[0] - 1, hd[1] - 1, gt.lt); } }); }
    // jersey number (on the back, or the chest when it faces the camera), the captain's letter, the referee's stripes
    if (K.hd && (H.number !== undefined || H.stripes)) {
      const mid = Sp(lrp(J.shC, J.hipC, .38), facingCam ? 1.2 : -1.2, 0, 0), up = Sp(lrp(J.shC, J.hipC, .2), 1.3, -1.3, 0);
      ops.push({ d: K.dC + .2, f: () => {
        if (H.stripes) for (let k = -2; k <= 2; k++) { const a = Sp(J.shC, facingCam ? 1 : -1, k * .9, -.8), b = Sp(J.hipC, facingCam ? 1 : -1, k * .9, 1.6); px.line(g, a[0], a[1], b[0], b[1], H.stripes); }
        if (H.number !== undefined && u >= 1) E.font.text(g, String(H.number), Math.round(mid[0]), Math.round(mid[1]) - 2, H.numColor || C.trim, { font: 'tiny', align: 'center', outline: false });
        if (H.letter && facingCam && u >= 1.1) E.font.text(g, H.letter, Math.round(up[0]), Math.round(up[1]) - 2, H.numColor || C.trim, { font: 'tiny', align: 'center', outline: false });
      } });
    }
    // head gear: a helmet dome (with a visor) or a goalie mask with its cage; a beard; Polar Pete's big bear head
    const Hh = Q.head; if (!Hh) return;
    const R = o.headR, r = R * u * .93;
    if (H.beard && facingCam && K.hd) { const jaw = Sp(J.head, R * .55, 0, -R * .55), bt = tn(H.beard); ops.push({ d: Hh[2] + .004, f: () => { px.disc(g, jaw[0], jaw[1], Math.max(1, r * .55), bt.sh); px.disc(g, jaw[0], jaw[1] + 1, Math.max(1, r * .45), bt.base); } }); }
    if (H.helmet) {
      const ht = tn(H.helmet), c0 = Sp(J.head, -R * .12, 0, R * .3);
      ops.push({ d: Hh[2] + .01, f: () => {
        const rr = r * 1.08, low = facingCam ? -.12 : .55, pts = [];
        for (let k = 0; k <= 12; k++) { const a = PI + .25 - k / 12 * (PI + .5); pts.push([c0[0] + Math.cos(a) * rr, c0[1] + Math.sin(a) * rr * .95]); }
        pts.push([c0[0] + rr, c0[1] + rr * low], [c0[0] - rr, c0[1] + rr * low]);
        px.poly(g, pts, ht.sh); px.poly(g, pts.map(p => [p[0] - .4, p[1] - .6]).slice(0, 12).concat([[c0[0], c0[1] + rr * low - 1]]), ht.base);
        px.line(g, c0[0] - rr * .5, c0[1] - rr * .82, c0[0] + rr * .1, c0[1] - rr * .95, ht.hi);
        if (H.helmetStripe) px.line(g, c0[0] - rr * .1, c0[1] - rr * .98, c0[0] - rr * .1, c0[1] + rr * low * .4, H.helmetStripe);
        if (facingCam) { const v0 = Sp(J.head, R * 1.02, -R * .5, R * .48), v1 = Sp(J.head, R * 1.02, R * .5, R * .48); px.line(g, v0[0], v0[1], v1[0], v1[1], ht.sh); px.blend(g, .5, 'screen', () => px.dot(g, (v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2 + 1, '#bfe8ff')); }
      } });
    }
    if (H.mask) {
      const mt = tn(H.mask), tt = tn(H.maskTrim || '#ffffff'), c0 = Sp(J.head, 0, 0, R * .05);
      ops.push({ d: Hh[2] + .01, f: () => {
        const rr = r * 1.1; px.disc(g, c0[0], c0[1], rr, mt.sh); px.disc(g, c0[0] - .5, c0[1] - .6, rr - 1, mt.base);
        px.line(g, c0[0] - rr * .7, c0[1] - rr * .5, c0[0] + rr * .7, c0[1] - rr * .5, tt.base, Math.max(1, Math.round(u * .7)));
        px.dot(g, c0[0] - rr * .4, c0[1] - rr * .7, mt.hi);
        if (facingCam) { const f0 = Sp(J.head, R * .9, 0, -R * .1); px.rect(g, f0[0] - rr * .55, f0[1] - rr * .25, rr * 1.1, rr * .85, '#2a2a30'); for (let k = -1; k <= 1; k++) px.line(g, f0[0] + k * rr * .3, f0[1] - rr * .25, f0[0] + k * rr * .3, f0[1] + rr * .6, '#c8ccd4'); px.line(g, f0[0] - rr * .55, f0[1] + rr * .15, f0[0] + rr * .55, f0[1] + rr * .15, '#c8ccd4'); }
      } });
    }
    if (H.bear) {
      const c0 = Sp(J.head, R * .1, 0, R * .55);
      ops.push({ d: Hh[2] + .02, f: () => {
        const rr = r * 1.7; for (const s of [-1, 1]) { const e = Sp(J.head, 0, s * R * 1.25, R * 1.6); px.disc(g, e[0], e[1], rr * .38, '#d8e0ec'); px.disc(g, e[0], e[1], rr * .2, '#ffc8d8'); }
        px.disc(g, c0[0], c0[1], rr, '#c8d4e4'); px.disc(g, c0[0] - .6, c0[1] - .8, rr - 1.2, '#f4f8ff');
        if (facingCam) { const sn = Sp(J.head, R * 1.3, 0, R * .1); px.ell(g, sn[0], sn[1], rr * .45, rr * .3, '#e8eef8'); px.disc(g, sn[0], sn[1] - rr * .12, Math.max(1, rr * .14), '#141418');
          for (const s of [-1, 1]) { const e = Sp(J.head, R * 1.15, s * R * .55, R * .7); px.disc(g, e[0], e[1], Math.max(1, rr * .12), '#141418'); px.dot(g, e[0] - .5, e[1] - .5, '#ffffff'); } }
        if (H.scarf) { const nk = Sp(J.shC, .3, 0, .4); px.line(g, nk[0] - rr * .7, nk[1], nk[0] + rr * .7, nk[1], H.scarf, Math.max(2, Math.round(u * 1.2))); }
      } });
    }
  }

  /* ---- the wrapped solvePose: legs, hands and stick from rig.hk ----
   * hk: { mode: 'skate' | 'goalie' | 'fight' | 'sit' | 'stand' | 'drive', ph (stride phase), push (0..1 stride strength),
   *       stop (0..1), cross (-1..1 crossover side), back (0..1 skating backward), hand (+1 right shot, -1 left),
   *       stick: { act, u, aim } (act: 'carry' | 'idle' | 'pass' | 'wrist' | 'wind' | 'slap' | 'follow' | 'check' | 'poke'
   *       | 'deke' | 'drag' | 'faceoff' | 'raise' | 'guitar' | 'sniper' | 'none'), weave, crouch, celebrate, grip }
   */
  function wrap(rig) {
    const base = rig.solvePose, up = rig.update;
    rig.update = function (dt, st) { this._lastArgs = st; return up.call(this, dt, st); };   // (the replay keeps what posed it)
    rig.solvePose = function () {
      const hk = this.hk;
      if (hk && hk.mode === 'skate') { this.o.lean = hk.lean || .3; this._crouchA = hk.crouch === undefined ? .45 : hk.crouch; }
      else if (hk && hk.mode === 'goalie') { this.o.lean = hk.lean === undefined ? .25 : hk.lean; this._crouchA = hk.crouch === undefined ? .6 : hk.crouch; }
      base.call(this);
      if (!hk || (this.downW || 0) > .05) { if (hk && hk.stickDrop) dropStick(this); return; }
      if (hk.mode === 'skate') skateLegs(this, hk);
      else if (hk.mode === 'goalie') goalieLegs(this, hk);
      else if (hk.mode === 'sit') sitLegs(this);
      if (hk.mode === 'skate' || hk.mode === 'goalie' || hk.mode === 'sit' || hk.mode === 'drive') stickHands(this, hk);
      if (hk.mode === 'fight' && hk.grip) { const J = this.J, o = this.o; const hand = add(J.shC, [6.2, -1.2, .6]); const [el, h2] = ik3(J.shL, hand, o.armUpper, o.armLower, [-1, -.7, -.2]); J.elbowL = el; J.handL = h2; }
    };
    return rig;
  }
  const legIK = (rig, s, foot, hint) => { const J = rig.J, o = rig.o, hip = s > 0 ? J.hipR : J.hipL, [knee, f2] = ik3(hip, foot, o.legUpper, o.legLower, hint || [1, s * .25, .1]); J[s > 0 ? 'kneeR' : 'kneeL'] = knee; J[s > 0 ? 'footR' : 'footL'] = f2; };
  function skateLegs(rig, hk) {
    const ph = hk.ph || 0, push = clamp(hk.push || 0, 0, 1), stop = hk.stop || 0, back = hk.back || 0, cross = hk.cross || 0, fo = hk.faceoff ? .6 : 0;
    for (const s of [-1, 1]) {
      const u = ((ph + (s > 0 ? PI : 0)) % TAU + TAU) % TAU;
      let foot;
      if (u < PI) { const k = u / PI; foot = [lerp(1.6, -4.2, k), s * lerp(1.9, 4.9, k), 0]; }
      else { const k = (u - PI) / PI; foot = [lerp(-4.2, 1.6, k), s * lerp(4.9, 1.9, k), Math.sin(k * PI) * 1.8]; }
      // a glide (no push): feet parallel, under the hips; crossover: the outside foot crosses in front
      const glide = [s > 0 ? .9 : -.5, s * 2.1, 0];
      foot = lrp(glide, foot, push);
      if (cross && push > .3) { const outside = Math.sign(cross) === s; if (outside && u > PI) { const k = (u - PI) / PI; foot[1] = lerp(foot[1], -s * 1.2, Math.sin(k * PI) * Math.abs(cross)); foot[0] += 1.4 * Math.abs(cross); } }
      // backward C-cuts: the feet trace C's out to the side and back in
      if (back > 0) { const k = Math.sin(u); foot = lrp(foot, [.6 + Math.cos(u) * 1.2, s * (2.2 + Math.max(0, k) * 2.6), 0], back); }
      // the hockey stop: both blades skid sideways, wide, knees deep
      if (stop > 0) foot = lrp(foot, [s > 0 ? 1.8 : -1.6, s * 3.6, 0], stop);
      if (fo) foot = lrp(foot, [s > 0 ? .4 : -.4, s * 3.8, 0], fo);
      legIK(rig, s, foot, [1, s * .35, .15]);
    }
  }
  function goalieLegs(rig, hk) {
    const st = hk.gst || 'ready', w = hk.gw === undefined ? 1 : hk.gw, side = hk.side || 1, J = rig.J;
    for (const s of [-1, 1]) {
      let foot = [.6, s * 3.6, 0];
      if (st === 'butterfly' || st === 'cover') foot = [-3.4, s * 7.2, .4];
      else if (st === 'stack') foot = [-.5, side * (s > 0 ? 9 : 7.5), s > 0 ? 3.5 : 1];
      else if (st === 'shuffle') foot = [.6, s * (3.6 + Math.sin((hk.ph || 0) + (s > 0 ? 0 : PI)) * .8), 0];
      else if (st === 'blasted') foot = [3 + s, s * 3, 4 + s * 2];
      foot = lrp([.6, s * 3.6, 0], foot, w);
      if (st === 'butterfly' || st === 'cover') { const hip = s > 0 ? J.hipR : J.hipL, knee = add(hip, [2.6, s * 1.2, -hip[2] + 1.2]); J[s > 0 ? 'kneeR' : 'kneeL'] = lrp(J[s > 0 ? 'kneeR' : 'kneeL'], knee, w); J[s > 0 ? 'footR' : 'footL'] = lrp(J[s > 0 ? 'footR' : 'footL'], foot, w); }
      else legIK(rig, s, foot, [1, s * .6, .1]);
    }
  }
  function sitLegs(rig) { for (const s of [-1, 1]) legIK(rig, s, [5.2, s * 2, 0], [1, 0, 1]); }
  function dropStick(rig) { const J = rig.J; J.stickTop = add(J.hipC, [6, 6, -J.hipC[2] + .8]); J.blade = add(J.hipC, [-8, 4, -J.hipC[2] + .6]); J.bladeDir2 = [0, 1, 0]; }
  /** the hands and the stick: the top hand at the shaft's end, the bottom hand 40% down it, elbows by IK */
  function stickHands(rig, hk) {
    const J = rig.J, o = rig.o, hs = hk.hand || 1, st = hk.stick || { act: 'carry' }, u = clamp(st.u || 0, 0, 1), sz = o.hipZ;
    const shZ = J.shC[2], E1 = E.ease;
    let top = [1.4, -hs * 1.6, sz + 1.2], blade = [9.5, hs * 3, .6], bdir = [0, hs, 0];
    const weave = hk.weave || 0;
    const act = st.act;
    if (act === 'carry' || act === 'idle') { blade = [9.5 + Math.cos(weave * 1.3) * 1, hs * 3 + Math.sin(weave) * 2.6, .6]; bdir = V3.norm([.25, hs, 0]); }
    else if (act === 'faceoff') { top = [3.2, -hs * 1, sz - .5]; blade = [10.5, hs * .8, .6]; bdir = [0, hs, 0]; }
    else if (act === 'pass') { const k = E1.outCubic(u); blade = lrp([2, hs * 6.5, .6], [11, hs * .6, .6 + (st.saucer ? 2.5 * k : 0)], k); top = lrp([0, -hs * .8, sz + 1], [3, -hs * 2.4, sz + 2.2], k); bdir = V3.norm([.4, hs, st.saucer ? .4 * k : 0]); }
    else if (act === 'wrist') { const k = E1.outCubic(u); blade = lrp([0, hs * 6.5, .6], [11, -hs * .4, 3.2], k); top = lrp([-.5, -hs * .4, sz + .6], [2.6, -hs * 2.8, sz + 3], k); bdir = V3.norm([.5, hs, .3 * k]); }
    else if (act === 'follow') { const k = E1.outQuad(u); blade = lrp([11, -hs * .4, 3.2], [12.5, -hs * 2, 11 + (st.big ? 4 : 0)], k); top = lrp([2.6, -hs * 2.8, sz + 3], [1, -hs * 3.4, shZ + .6], k); bdir = V3.norm([.6, hs, .6]); }
    else if (act === 'wind') { const k = E1.outCubic(u); blade = lrp([9, hs * 3, .6], [-5.5, hs * 6.5, shZ + 6], k); top = lrp([1.4, -hs * 1.6, sz + 1.2], [3.2, -hs * .2, sz + 2.8], k); bdir = V3.norm([-.6, .4 * hs, .8]); }
    else if (act === 'slap') { const k = E1.inQuad(u); blade = lrp([-5.5, hs * 6.5, shZ + 6], [9.5, hs * 1.6, .6], k); top = lrp([3.2, -hs * .2, sz + 2.8], [3.6, -hs * 1.8, sz], k); bdir = V3.norm([.4, hs, 0]); }
    else if (act === 'check') { top = [3.4, -hs * 3.4, shZ - 1.6]; blade = [4.6, hs * 7.5, shZ - 3]; bdir = V3.norm([0, -hs, 1]); }
    else if (act === 'poke') { const k = Math.sin(u * PI); top = lrp([1.4, -hs * 1.6, sz + 1.2], [6, -hs * .8, sz + .4], k); blade = lrp([9.5, hs * 3, .6], [19, hs * .6, .6], k); bdir = [0, hs, 0]; }
    else if (act === 'drag') { const k = Math.sin(u * PI); blade = [9.5, lerp(hs * 5, -hs * 3.5, k), .6]; bdir = [.2, hs, 0]; }
    else if (act === 'deke') { blade = [10, hs * 3 * Math.cos(u * PI * 2), .6]; }
    else if (act === 'raise') { top = [1, -hs * 1.2, shZ + 2]; blade = [3, hs * 2.6, shZ + 14]; bdir = V3.norm([.2, .2, 1]); }
    else if (act === 'guitar') { top = [3, -hs * 3, sz + 1]; blade = [3, hs * 7, sz + 6 + Math.sin(rig.t * 14) * 1]; bdir = V3.norm([0, hs, .5]); }
    else if (act === 'sniper') { top = [1, hs * .4, shZ + 1.2]; blade = [13, hs * .2, shZ + 2.4]; bdir = [0, 0, -1]; }
    else if (act === 'gready') { top = [3, 2.6, sz + 3.6]; blade = [9.5, 1.2, .6]; bdir = V3.norm([.1, 1, 0]); }
    else if (act === 'gpoke') { const k = Math.sin(u * PI); top = lrp([3, 2.6, sz + 3.6], [7, 1.6, sz + 1], k); blade = lrp([9.5, 1.2, .6], [19, 1, .6], k); bdir = [0, 1, 0]; }
    else if (act === 'drive') { top = [6, 2, sz + 4]; blade = [6, -2, sz + 4]; }
    if (st.aim) { const a = st.aim; const rot = p => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]]; blade = rot(blade); top = rot(top); bdir = rot(bdir); }
    J.stickTop = top; J.blade = blade; J.bladeDir2 = V3.norm(bdir);
    if (act === 'none') return;
    // the hands: the top hand on the knob end, the bottom hand down the shaft; goalies hold it in the blocker (right)
    const goalie = hk.mode === 'goalie';
    let topH = lrp(top, blade, .03), botH = lrp(top, blade, .42);
    let rh = hs > 0 ? botH : topH, lh = hs > 0 ? topH : botH;
    if (goalie) { rh = lrp(top, blade, .15); lh = add(J.shC, hk.glove || [4.4, -4.6, -1]); }
    if (act === 'drive') { rh = add(J.shC, [6, 2.4, -4]); lh = add(J.shC, [6, -2.4, -4]); }
    if (hk.oneHand) lh = add(J.shL, [-1, -2, -5]);
    for (const s of [-1, 1]) { const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? rh : lh, [el, h2] = ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .8, -.3]); J[s > 0 ? 'elbowR' : 'elbowL'] = el; J[s > 0 ? 'handR' : 'handL'] = h2; }
  }

  /* ---- factories ---- */
  function skater(def, home, opts = {}) {
    const k = kit(def.team, home), t = TEAMS[def.team];
    const rig = new E.Humanoid({ size: opts.size || (def.build === 'bulky' ? 1.3 : 1.2), build: def.build === 'bulky' ? 'bulky' : 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true,
      hair: def.hair && def.hair.style === 'long' ? 'long' : def.hair && def.hair.style === 'ponytail' ? 'ponytail' : def.hair ? def.hair.style : 'short', style: opts.classic ? 'classic' : 'hd', speedRef: 400,
      colors: { cloth: k.cloth, trim: k.trim, pants: k.pants, boot: '#1a1a1e', belt: k.pants, glove: k.glove, skin: def.skin || '#f0c8a0', hair: (def.hair && def.hair.color) || '#3a2a1a', plate: k.cloth, metal: k.cloth }, gear });
    if (opts.bigHead) rig.o.headR *= 1.8;
    rig.hkGear = { skates: true, socks: home ? t.dark : t.light, sockStripe: home ? t.trim : t.dark, stick: true, stickColor: opts.stickColor || ['#c8a070', '#3a3a44', '#e8e4d8', '#b8503a'][(def.num || 0) % 4], helmet: k.helmet, helmetStripe: k.trim, gloves: true, number: def.num, letter: def.letter, numColor: k.trim, beard: def.beard };
    if (t.plaid && home) rig.hkGear.stripes = '#5a1012';
    rig.hk = { mode: 'skate', ph: 0, push: 0, hand: def.hand === 'L' ? -1 : 1, stick: { act: 'carry' }, lean: .3 };
    return wrap(rig);
  }
  function goalie(def, home, opts = {}) {
    const k = kit(def.team, home), t = TEAMS[def.team], m = def.mask || [t.dark, t.trim];
    const rig = new E.Humanoid({ size: opts.size || def.size || 1.3, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'long', armor: true, hair: (def.hair && def.hair.style) || 'short', style: opts.classic ? 'classic' : 'hd', speedRef: 400,
      colors: { cloth: k.cloth, trim: k.trim, pants: k.pants, boot: '#1a1a1e', belt: k.pants, glove: '#f4f4f0', skin: def.skin || '#f0c8a0', hair: (def.hair && def.hair.color) || '#3a2a1a', plate: k.cloth, metal: k.cloth }, gear });
    if (opts.bigHead) rig.o.headR *= 1.8;
    rig.hkGear = { skates: true, pads: true, padColor: home ? '#f4f4f0' : '#f4f4f0', padTrim: t.dark, stick: 'goalie', stickColor: '#e8e0c8', blocker: true, catcher: true, mask: m[0], maskTrim: m[1], number: def.num, numColor: k.trim };
    rig.hk = { mode: 'goalie', gst: 'ready', gw: 1, hand: 1, stick: { act: 'gready' }, crouch: .6 };
    return wrap(rig);
  }
  function referee(opts = {}) {
    const rig = new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'short', style: opts.classic ? 'classic' : 'hd', speedRef: 400,
      colors: { cloth: '#f4f4f0', trim: '#ff7a1a', pants: '#141418', boot: '#141418', glove: '#141418', skin: opts.skin || '#e8c0a0', hair: '#5a4030' }, gear });
    rig.hkGear = { skates: true, stripes: '#141418', helmet: '#141418', gloves: false, socks: '#141418' };
    rig.hk = { mode: 'skate', ph: 0, push: 0, hand: 1, stick: { act: 'none' }, lean: .15, crouch: .2 };
    return wrap(rig);
  }
  function cast(id, opts = {}) {
    const c = CAST[id]; if (!c) return null;
    if (c.def) { const d = c.def; return d.pos === 'G' ? goalie(d, true, opts) : skater(d, true, opts); }
    if (id === 'ref') return referee(opts);
    const rig = new E.Humanoid(Object.assign({ weapon: null, speedRef: 400 }, c.look, { gear }));
    rig.hkGear = {};
    if (id === 'pete') { rig.hkGear = { bear: true, skates: true, scarf: '#e0389a' }; rig.hk = { mode: 'skate', ph: 0, push: 0, hand: 1, stick: { act: 'none' }, lean: .1, crouch: .1 }; return wrap(rig); }
    if (id === 'moose') rig.hkGear.beard = null;
    return rig;
  }
  /** a bench spare in a team's kit, sitting */
  function spare(team, home, i) {
    const def = { team, num: [17, 22, 4, 13][i % 4], build: 'heroic', hair: { style: ['short', 'spiky', 'long'][i % 3], color: ['#3a2a1a', '#c87a3a', '#1a1010'][i % 3] }, skin: ['#f0c8a0', '#a87050', '#e0b090'][i % 3], hand: i % 2 ? 'L' : 'R' };
    const rig = skater(def, home); rig.hk.mode = 'sit'; rig.hk.stick = { act: 'idle' }; return rig;
  }
  /** a glass pounder (classic style, cheaper) in a fan's colors */
  function fan(color, skin) {
    return new E.Humanoid({ size: .95, build: 'chibi', style: 'classic', weapon: null, sleeves: 'long', hair: 'short', colors: { cloth: color, skin, hair: '#3a2a1a', pants: '#2a2a3a' } });
  }
  return { kit, gear, wrap, skater, goalie, referee, cast, spare, fan };
})();

/* ---- 22-skater.js ---- */
/* ---- SKATER (7.2, 7.4-7.9): the pure skating step (the network prediction runs it too), the skater's actions from its
 * intent (passes, saucers, wrist shots, slapshot wind-ups, one-timers, checks, dekes, pokes, chirps, the gloves), and the
 * rig's motion state. Intent: { mx, my, aim: [x, y] | null, face: angle | null, back, held: { shoot, lob, turbo },
 * press: { pass, shoot, deke, lob, chirp, switch } } ---- */
const Skater = (() => {
  /** speed cap for a skater now */
  function vmax(s, m) {
    let v = T.skateMax * RATE.speed(s.def);
    if (m && m.puck.owner === s) v *= .94;
    if (s.state === 'wind') v *= .6;
    if (s.items.cocoa > 0) v *= 1.2;
    if (s.boost) v *= s.boost;
    if (m && m.teams[s.team].tactic === 'finesse') v *= 1.04;
    return v;
  }
  /** the pure skating step: st { x, y, vx, vy, facing, stopT, turbo }, it { mx, my, turbo, face, back }, p { vmax, accel,
   *  glide, turnSlow, turnFast, stopDecel, inf (infinite turbo) }. Returns events in st.ev (stop) */
  function skateStep(st, it, p, dt) {
    const sp = Math.hypot(st.vx, st.vy), mag = Math.min(1, Math.hypot(it.mx, it.my));
    st.ev = null;
    const turbo = it.turbo && (st.turbo > .02 || p.inf) && mag > .2;
    if (turbo && !p.inf) st.turbo = Math.max(0, st.turbo - T.turboDrain * dt);
    if (!it.turbo) { st.rest = (st.rest || 0) + dt; if (st.rest > .6) st.turbo = Math.min(1, st.turbo + T.turboRegen * dt); } else st.rest = 0;
    if (p.inf) st.turbo = 1;
    st.turboOn = turbo;
    const vm = p.vmax * (turbo ? T.turboMul : 1) * (it.back ? .75 : 1);
    if (st.stopT > 0) {
      st.stopT -= dt; const ns = Math.max(0, sp - T.stopDecel * dt), k = sp > 0 ? ns / sp : 0; st.vx *= k; st.vy *= k;
    } else if (mag > .2) {
      const dir = Math.atan2(it.my, it.mx), va = sp > 4 ? Math.atan2(st.vy, st.vx) : dir;
      if (sp > 60 && Math.abs(U.angDiff(va, dir)) > 2.1 && !it.back) { st.stopT = .22; st.ev = 'stop'; }
      else {
        const rate = lerp(T.turnSlow, T.turnFast, clamp(sp / Math.max(1, vm), 0, 1)) * (it.back ? 1.6 : 1);
        const na = E.approachAng(va, dir, rate * dt), target = vm * mag;
        let ns = sp;
        if (sp < target) ns = Math.min(target, sp + T.skateAccel * (1 - .6 * Math.pow(Math.min(1, sp / vm), 2)) * dt);
        else ns = Math.max(target, sp - (T.iceGlide * 2 + (sp > vm ? 220 : 0)) * dt);
        st.vx = Math.cos(na) * ns; st.vy = Math.sin(na) * ns;
      }
    } else {
      const ns = Math.max(0, sp - T.iceGlide * dt), k = sp > 0 ? ns / sp : 0; st.vx *= k; st.vy *= k;
    }
    st.x += st.vx * dt; st.y += st.vy * dt;
    // facing: toward what it wants to face (an AI skating backward faces the puck), else along its velocity
    const sp2 = Math.hypot(st.vx, st.vy);
    if (it.face !== undefined && it.face !== null) st.facing = E.approachAng(st.facing, it.face, 9 * dt);
    else if (st.stopT > 0) st.facing = E.approachAng(st.facing, Math.atan2(st.vy, st.vx) + 1.2 * (st.stopSide || 1), 14 * dt);
    else if (sp2 > 8) st.facing = E.approachAng(st.facing, Math.atan2(st.vy, st.vx), 11 * dt);
    else if (mag > .2) st.facing = E.approachAng(st.facing, Math.atan2(it.my, it.mx), 8 * dt);
    return st;
  }
  const BUSY = new Set(['down', 'getup', 'stun', 'fight', 'bin', 'frozen', 'buried', 'slip', 'celebrate', 'offbal', 'blasted']);
  const free = s => !BUSY.has(s.state);
  const canAct = s => free(s) && !['check', 'deke', 'poke', 'pass', 'shoot'].includes(s.state);
  function setState(s, st, t = 0) { s.state = st; s.stateT = t; }
  /** the blade point (where it carries the puck) */
  const blade = (s, reach = 11) => [s.x + Math.cos(s.facing) * reach - Math.sin(s.facing) * s.hand * 4, s.y + Math.sin(s.facing) * reach + Math.cos(s.facing) * s.hand * 4];

  /** one step of a skater: its actions from its intent, then its skating */
  function step(m, s, dt) {
    const it = s.intent, live = m.phase === 'play' || m.phase === 'shootout';
    s.stateT -= dt; s.actT = (s.actT || 0) + dt; s.pickupCD = Math.max(0, s.pickupCD - dt); s.cool = Math.max(0, (s.cool || 0) - dt); s.chirpCD = Math.max(0, (s.chirpCD || 0) - dt);
    s.dekeCD = Math.max(0, (s.dekeCD || 0) - dt); s.checkCD = Math.max(0, (s.checkCD || 0) - dt); s.bubbleT = Math.max(0, (s.bubbleT || 0) - dt);
    if (s.twistT > 0) { s.twistT -= dt; if (s.twistT <= 0) { s.twistT = 0; if (m.puck.owner === s && Skater.free(s)) { s.twistShot = true; Shots.shoot(m, s, 'wrist', 0); } } }
    for (const k in s.items) if (s.items[k] > 0 && k !== 'lumber') { s.items[k] -= dt; if (s.items[k] <= 0) { s.items[k] = 0; Bus.emit('item_end', { by: s.id, kind: k }); } }
    // timed states run out
    if (s.stateT <= 0) {
      if (s.state === 'down') { setState(s, 'getup', .5); }
      else if (['getup', 'stun', 'check', 'deke', 'poke', 'pass', 'shoot', 'offbal', 'slip', 'buried', 'frozen', 'blasted'].includes(s.state)) {
        if (s.state === 'frozen') { const w = Rink.wall(s.x, s.y); s.x += 10; Bus.emit('unfreeze', { victim: s.id }); }
        setState(s, 'skate');
      }
    }
    const st = s.state, owner = m.puck.owner === s;
    let mv = { mx: it.mx, my: it.my, turbo: it.held.turbo, face: it.face, back: it.back };
    if (!live || ['down', 'getup', 'frozen', 'buried', 'bin', 'fight', 'blasted'].includes(st)) mv = { mx: 0, my: 0, turbo: false };
    if (st === 'stun' || st === 'slip' || st === 'offbal') mv.mx = mv.my = 0;
    if (st === 'celebrate') mv = { mx: s.celebDir ? s.celebDir[0] * .4 : 0, my: s.celebDir ? s.celebDir[1] * .4 : 0, turbo: false };
    if (live && free(s)) actions(m, s, it, dt, owner);
    // the deke's sideways cut, the check's lunge, a knockdown's slide
    if (st === 'deke' && s.stateT > .2) { const a = s.facing + s.dekeDir * PI / 2; s.vx += Math.cos(a) * 260 * dt; s.vy += Math.sin(a) * 260 * dt; }
    if (st === 'down' || st === 'slip') { const sp = Math.hypot(s.vx, s.vy), k = Math.max(0, sp - 90 * dt) / (sp || 1); s.vx *= k; s.vy *= k; s.x += s.vx * dt; s.y += s.vy * dt; }
    else if (st === 'frozen' || st === 'bin' || st === 'buried' || st === 'fight') { s.vx *= .8; s.vy *= .8; }
    else {
      const p = { vmax: vmax(s, m), inf: s.items.hotsauce > 0 || (m.kaboom[s.team] > 0) || m.cheats.turbo && s.ctrl.kind === 'human' || m.cheats.allTurbo };
      skateStep(s, mv, p, dt);
      if (s.ev === 'stop') { s.stopSide = U.angDiff(Math.atan2(s.vy, s.vx), Math.atan2(mv.my, mv.mx)) > 0 ? 1 : -1; Bus.emit('stop', { by: s.id, x: s.x, y: s.y }); Rink.addScuff(s.x, s.y, .12); }
      if (s.turboOn) s.stats.turbo += dt;
    }
    // the ice scuffs where it skates; KABOOM skates melt it
    const sp = Math.hypot(s.vx, s.vy); if (sp > 20) { Rink.addScuff(s.x, s.y, .0025 * sp / 132); if (m.kaboom[s.team] > 0) Rink.addMelt(s.x, s.y, .05 * dt * 60 / 120); }
    s.phase = (s.phase || 0) + dt * sp / 22 * (s.turboOn ? 1.15 : 1);
  }
  /** what the buttons do (7.4-7.9) */
  function actions(m, s, it, dt, owner) {
    const pr = it.press, puck = m.puck;
    // a pass coming: shoot arms the one-timer
    if (puck.passTo === s && !puck.owner && (pr.shoot || it.held.shoot)) s.otArmed = .5; else s.otArmed = Math.max(0, (s.otArmed || 0) - dt);
    if (owner) {
      // shooting: tap for a wrist shot, hold to wind up a slapshot, let go to fire
      if (pr.shoot && canAct(s)) { s.shootHeld = 0; s.charging = true; }
      if (s.charging) {
        if (it.held.shoot) {
          s.shootHeld += dt;
          if (s.shootHeld > .18) { if (s.state !== 'wind') { setState(s, 'wind', 99); Bus.emit('windup', { by: s.id }); } s.charge = Math.min(1, s.charge + dt / T.slapCharge * (m.kaboom[s.team] > 0 ? 2 : 1)); }
        } else {
          const wrist = s.shootHeld <= .18; s.charging = false;
          if (wrist) Shots.shoot(m, s, 'wrist', 0); else Shots.shoot(m, s, 'slap', s.charge);
          s.charge = 0; s.shootHeld = 0; return;
        }
      }
      if (s.state === 'wind') return;
      if (pr.pass && canAct(s)) return Shots.pass(m, s, false);
      if (pr.lob && canAct(s)) return Shots.pass(m, s, true);
      if (pr.deke && canAct(s) && s.dekeCD <= 0) return deke(m, s, it);
    } else {
      s.charging = false; s.charge = 0; if (s.state === 'wind') setState(s, 'skate');
      if (pr.shoot && canAct(s) && s.checkCD <= 0 && !(puck.passTo === s)) return check(m, s);
      if (pr.deke && canAct(s) && s.cool <= 0) return poke(m, s);
      if (pr.pass && s.ctrl.kind !== 'cpu') { const mate = m.teams[s.team].skaters.find(o => o !== s && puck.owner === o); if (mate && mate.ctrl.kind === 'cpu') { mate.callFor = { by: s, t: 1.2 }; s.calling = .8; Bus.emit('call', { by: s.id }); } }
      // the gloves: hold lob near a rival with a grudge
      if (it.held.lob && s.ctrl.kind !== 'cpu') { s.gloveHold = (s.gloveHold || 0) + dt; if (s.gloveHold >= .5) { s.gloveHold = 0; Fight.challenge(m, s); } } else s.gloveHold = 0;
    }
    if (pr.chirp && s.chirpCD <= 0) chirp(m, s);
  }
  function check(m, s) {
    setState(s, 'check', .3); s.checkCD = .55; s.hitDone = {};
    const lunge = 60 * (s.turboOn ? 1.2 : 1); s.vx += Math.cos(s.facing) * lunge; s.vy += Math.sin(s.facing) * lunge;
    Bus.emit('check_start', { by: s.id });
  }
  function poke(m, s) {
    setState(s, 'poke', .35); s.cool = .6; s.pokeDone = false; Bus.emit('poke_start', { by: s.id });
  }
  function deke(m, s, it) {
    const side = Math.abs(it.mx) + Math.abs(it.my) > .3 ? Math.sign(U.angDiff(s.facing, Math.atan2(it.my, it.mx)) || 1) : (s.lastDeke = -(s.lastDeke || 1));
    setState(s, 'deke', .45); s.dekeDir = side; s.dekeCD = .8; s.spin = s.turboOn; s.dekeAt = m.t;
    // who it is beating: a defender square in front
    const opp = m.teams[1 - s.team].skaters.filter(o => Skater.free(o) && U.dist(o, s) < 40 && Math.abs(U.angDiff(s.facing, U.angTo(s, o))) < .9);
    s.dekeVs = opp.map(o => o.id);
    const g = m.teams[1 - s.team].goalie; if (g && U.dist(g, s) < 80) { g.bitT = .5 * (g.def.boss && !g.cracked ? 1 : g.def.boss ? 1.5 : 1); g.bitBy = s.id; }
    Bus.emit('deke', { by: s.id, spin: !!s.spin });
  }
  function chirp(m, s) {
    const rivals = m.teams[1 - s.team].skaters.filter(o => U.dist(o, s) < 120 && o.state !== 'bin');
    if (!rivals.length) { s.chirpCD = 1; return; }
    const tgt = rivals.sort((a, b) => U.dist(a, s) - U.dist(b, s))[0], line = Math.floor(RNG.sim() * TEXT.chirps.length);
    s.chirpCD = 4; s.bubble = TEXT.chirps[line]; s.bubbleT = 2.2;
    Grudge.add(m, tgt, s, 15);
    Bus.emit('chirp', { by: s.id, target: tgt.id, line });
  }
  /** the rig's state from the skater: stride, stop, stick act, the poses */
  function pose(m, s, dt) {
    const rig = s.rig, hk = rig.hk, sp = Math.hypot(s.vx, s.vy), vm = T.skateMax * 1.45, st = s.state, owner = m.puck.owner === s;
    hk.mode = st === 'fight' ? 'fight' : st === 'bin' ? 'sit' : 'skate';
    hk.ph = s.phase; hk.push = clamp((sp - 10) / 90, 0, 1) * (s.turboOn ? 1 : .85); hk.stop = s.stopT > 0 ? 1 : Math.max(0, (hk.stop || 0) - dt * 4);
    const va = Math.atan2(s.vy, s.vx), rel = U.angDiff(s.facing, va);
    hk.back = sp > 20 && Math.abs(rel) > 2 ? 1 : 0; hk.cross = clamp(U.angDiff(s.prevVa === undefined ? va : s.prevVa, va) / dt * .4, -1, 1); s.prevVa = va;
    hk.lean = .32 + (s.turboOn ? .18 : 0) + (st === 'check' ? .25 : 0) + (hk.stop ? -.1 : 0); hk.crouch = st === 'faceoff' ? .8 : hk.stop ? .7 : .45 + (s.turboOn ? .05 : 0);
    hk.faceoff = st === 'faceoff'; hk.weave = (s.weave = (s.weave || 0) + dt * (owner ? 9 : 2)); hk.stickDrop = false;
    const stick = hk.stick || (hk.stick = {}); stick.aim = 0; stick.saucer = false; stick.big = false;
    if (st === 'wind') { stick.act = 'wind'; stick.u = Math.min(1, (s.shootHeld - .18) / .2 + .2); }
    else if (st === 'shoot') { const u = 1 - s.stateT / .3; if (s.shotKind === 'slap' || s.shotKind === 'onetimer' || s.shotKind === 'kaboom') { if (u < .3) { stick.act = 'slap'; stick.u = u / .3; } else { stick.act = 'follow'; stick.u = (u - .3) / .7; stick.big = true; } } else { if (u < .4) { stick.act = 'wrist'; stick.u = u / .4; } else { stick.act = 'follow'; stick.u = (u - .4) / .6; } } }
    else if (st === 'pass') { stick.act = 'pass'; stick.u = 1 - s.stateT / .2; stick.saucer = s.passKind === 'saucer'; }
    else if (st === 'check') stick.act = 'check';
    else if (st === 'poke') { stick.act = 'poke'; stick.u = 1 - s.stateT / .35; }
    else if (st === 'deke') { stick.act = s.spin ? 'deke' : 'drag'; stick.u = 1 - s.stateT / .45; }
    else if (st === 'faceoff') stick.act = 'faceoff';
    else if (st === 'celebrate') stick.act = s.celeb === 'guitar' ? 'guitar' : s.celeb === 'sniper' ? 'sniper' : 'raise';
    else stick.act = owner ? 'carry' : 'idle';
    // the drawn facing: the spin-o-rama turns the body a full circle
    let face = s.facing;
    if (st === 'deke' && s.spin) face += (1 - s.stateT / .45) * TAU * s.dekeDir;
    if (s.twistT > 0) face += (1 - s.twistT / .6) * TAU;
    if (hk.stop) face = s.facing;
    const down = st === 'down' ? Math.min(1, (1.4 - s.stateT) * 3) : st === 'getup' ? Math.max(0, s.stateT / .5) : st === 'slip' ? .8 : st === 'blasted' ? 1 : 0;
    const pose = st === 'celebrate' && s.celeb === 'pump' ? 'cheer' : st === 'getup' ? 'kneel' : st === 'bin' ? 'kneel' : st === 'buried' ? 'crouch' : (m.phase === 'final' && s.team !== m.winner && m.winner >= 0) ? 'kneel' : null;
    const fightSt = st === 'fight' && s.fight ? s.fight : null;
    rig.update(dt, { x: s.x, y: s.y, z: s.z || 0, vx: 0, vy: 0, facing: face, down, hurt: st === 'stun' || st === 'offbal', pose: fightSt ? fightSt.pose : pose, expr: st === 'celebrate' ? 'shout' : st === 'check' || st === 'fight' ? 'angry' : st === 'down' || st === 'stun' ? 'wince' : null,
      attack: fightSt ? fightSt.attack : null, stance: fightSt ? 'guard' : null, flip: st === 'slip' ? .3 : 0 });
    rig.o.hood = !!(fightSt && fightSt.hood); if (rig.o.hood) rig.C.hair = rig.C.cloth; else rig.C.hair = s.hairColor;
    if (hk.mode === 'fight') { rig.hkGear.stick = false; hk.grip = fightSt && fightSt.grip; } else rig.hkGear.stick = st === 'down' || st === 'getup' ? true : true;
    rig.hkGear.helmet = st === 'fight' ? null : s.helmetColor;
  }
  return { vmax, skateStep, step, free, canAct, setState, blade, pose, check, poke, deke, chirp, BUSY };
})();

/* ---- Grudge (7.7): per ordered pair 0..100; decays 4/s after 3 s of peace ---- */
const Grudge = {
  add(m, holder, against, n) { const g = holder.grudge; g[against.id] = clamp((g[against.id] || 0) + n, 0, 100); holder.peace = 0; },
  get: (holder, against) => holder.grudge[against.id] || 0,
  step(m, dt) { for (const s of m.skaters) { s.peace = (s.peace || 0) + dt; if (s.peace > 3) for (const k in s.grudge) s.grudge[k] = Math.max(0, s.grudge[k] - 4 * dt); } }
};

/* ---- 23-puck.js ---- */
/* ---- SHOTS (7.4, 7.5): passes led to the mate (tape to tape, or into space at the reticle), saucers over sticks
 * (E.arc), wrist shots, slapshots from a charge, one-timers, KABOOM shots; the aim point in the net ---- */
const Shots = (() => {
  const GRAV = 420;
  /** where in the net a shot goes: [y, z] on the goal line of net s */
  function aimPoint(m, s, kind, charge) {
    const net = m.attackNet(s.team), gx = Rink.goalX(net), g = m.goalieAt(net), it = s.intent;
    let y;
    if (it.aim) {   // the reticle (mouse) or the right stick: where its line meets the mouth
      const ax = it.aim[0], ay = it.aim[1], dx = ax - s.x; y = Math.abs(dx) > 4 ? s.y + (ay - s.y) * (gx - s.x) / dx : ay;
      y = clamp(y, Rink.C.y - 13, Rink.C.y + 13);
    } else {
      const gy = g ? g.y : Rink.C.y, open = gy > Rink.C.y ? -1 : 1;
      const stickUp = Math.abs(it.my) > .5 ? Math.sign(it.my) : 0;
      y = Rink.C.y + (stickUp ? stickUp : open) * (10 + RNG.sim() * 3);
    }
    const down = g && (g.state === 'butterfly' || g.state === 'stack');
    let z = kind === 'wrist' ? 2 + RNG.sim() * 8 : 4 + RNG.sim() * 14;
    if (kind !== 'wrist' && down) z = 14 + RNG.sim() * 4;
    if (it.my && it.aim === null && kind === 'wrist' && s.ctrl.kind !== 'cpu') z = 3 + RNG.sim() * 12;
    return [gx, y, z];
  }
  /** launch the puck from s toward (tx, ty, tz) at speed sp with lateral error sd (units at the target) */
  function launch(m, s, tx, ty, tz, sp, sd) {
    const pk = m.puck; { const [bx, by] = Skater.blade(s); pk.x = bx; pk.y = by; const w = Rink.wall(bx, by); if (w.d < 2) { pk.x += w.nx * (2 - w.d); pk.y += w.ny * (2 - w.d); } }
    const d = Math.hypot(tx - pk.x, ty - pk.y) || 1;
    const nx = (tx - pk.x) / d, ny = (ty - pk.y) / d, e = U.gauss(RNG.sim) * sd, ez = U.gauss(RNG.sim) * sd * .35;
    const ax = tx - ny * e, ay = ty + nx * e, dd = Math.hypot(ax - pk.x, ay - pk.y) || 1, t = dd / sp;
    pk.vx = (ax - pk.x) / dd * sp; pk.vy = (ay - pk.y) / dd * sp;
    pk.vz = clamp((tz + ez - 1 + GRAV * .5 * t * t) / Math.max(.05, t), 0, 320); pk.z = 1;
    pk.owner = null; pk.last = s; s.pickupCD = .3; pk.passTo = null;
  }
  function shoot(m, s, kind, charge) {
    const pk = m.puck; if (pk.owner !== s) return;
    const sh = RATE.shot(s.def), err = RATE.err(s.def) * T.shotError;
    const kab = m.kaboom[s.team] > 0 && kind === 'slap' && charge >= .95, ot = kind === 'onetimer';
    let sp, sd;
    if (kind === 'wrist') { sp = T.wristSpeed * sh; sd = 5 * err; }
    else { const c = ot ? .85 : charge; sp = (T.slapBase + T.slapGain * c) * sh; sd = 7 * err * (1.4 - .4 * c); }
    if (ot) { sp *= T.oneTimerBonus; sd *= .5; }
    if (s.turboOn) sp *= 1.12;
    if (s.items.lumber > 0) { sp *= 1.3; sd = 0; s.items.lumber--; }
    if (s.ctrl.kind === 'cpu') sd *= m.aiErr(s.team);
    if (kab) { sp = 760; sd = 0; kind = 'kaboom'; }
    if (kind === 'wrist' && s.dekeAt !== undefined && m.t - s.dekeAt < 1.6) kind = 'deke';
    if (m.puck.rebound && m.t - m.puck.rebound < 1.2 && kind !== 'kaboom') kind = kind === 'wrist' ? 'rebound' : kind;
    const [tx, ty, tz] = aimPoint(m, s, kind, charge);
    launch(m, s, tx, ty, tz, Math.min(760, sp), sd);
    pk.onFire = kind === 'kaboom'; pk.shot = { by: s.id, team: s.team, kind, speed: Math.round(Math.hypot(pk.vx, pk.vy)), t: m.t, x: s.x, y: s.y, net: m.attackNet(s.team) };
    pk.curl = s.twistShot ? (pk.y < Rink.C.y ? 1 : -1) * 1.2 : 0; pk.twister = !!s.twistShot; s.twistShot = false;
    const onGoal = willCross(pk, pk.shot.net);
    pk.shot.onGoal = onGoal;
    Skater.setState(s, 'shoot', .3); s.shotKind = kind;
    s.stats.shots++; if (onGoal) m.teams[s.team].shots++;
    s.stats.topShot = Math.max(s.stats.topShot, pk.shot.speed);
    Bus.emit('shot', { by: s.id, team: s.team, kind, speed: pk.shot.speed, onGoal, dist: Math.round(Math.abs(Rink.goalX(pk.shot.net) - s.x)) });
    if (kind === 'kaboom') Bus.emit('kaboom_shot', { by: s.id, team: s.team });
  }
  /** does the puck's line cross net n's goal line inside the mouth (and under the bar)? */
  function willCross(pk, n) {
    const gx = Rink.goalX(n), dx = gx - pk.x; if (Math.sign(dx) !== Math.sign(pk.vx) || Math.abs(pk.vx) < 1) return false;
    const t = dx / pk.vx, y = pk.y + pk.vy * t, z = pk.z + pk.vz * t - GRAV / 2 * t * t;
    return Math.abs(y - Rink.C.y) < Rink.MOUTH - 1 && z < Rink.BAR && t < 2.5;
  }
  /** the teammate a pass goes to, or a point in space (the reticle) */
  function passTarget(m, s) {
    const mates = m.teams[s.team].skaters.filter(o => o !== s && o.state !== 'bin' && o.state !== 'frozen' && o.state !== 'fight');
    if (!mates.length) return null;
    const it = s.intent;
    if (it.aim) {
      let best = null, bd = 80; for (const o of mates) { const d = Math.hypot(o.x - it.aim[0], o.y - it.aim[1]); if (d < bd) { bd = d; best = o; } }
      return best ? { mate: best } : { x: it.aim[0], y: it.aim[1] };
    }
    if (s.passPick) { const o = mates.find(q => q.id === s.passPick); s.passPick = null; if (o) return { mate: o }; }
    const dir = Math.hypot(it.mx, it.my) > .3 ? Math.atan2(it.my, it.mx) : s.facing;
    let best = null, ba = 1.31;
    for (const o of mates) { const a = Math.abs(U.angDiff(dir, U.angTo(s, o))); if (a < ba) { ba = a; best = o; } }
    if (!best) { const fwd = m.attackDir(s.team); best = mates.slice().sort((a, b) => (b.x - a.x) * fwd - (a.x - b.x) * fwd * 0 - (U.dist(a, s) - U.dist(b, s)) * .1)[0]; }
    return { mate: best };
  }
  function pass(m, s, saucer) {
    const pk = m.puck; if (pk.owner !== s) return;
    const tg = passTarget(m, s); if (!tg) return;
    { const [bx, by] = Skater.blade(s); pk.x = bx; pk.y = by; const w = Rink.wall(bx, by); if (w.d < 2) { pk.x += w.nx * (2 - w.d); pk.y += w.ny * (2 - w.d); } }
    let tx, ty, mate = tg.mate || null;
    const pq = RATE.pass(s.def);
    let sp;
    if (mate) {
      tx = mate.x; ty = mate.y; let t = 0;
      for (let k = 0; k < 2; k++) { const d = Math.hypot(tx - pk.x, ty - pk.y); sp = clamp(220 + .9 * d, T.passMin, T.passMax) * pq; t = d / sp; tx = mate.x + mate.vx * t * .9 + Math.cos(mate.facing) * 6; ty = mate.y + mate.vy * t * .9 + Math.sin(mate.facing) * 6; }
      const w = Rink.wall(tx, ty); if (w.d < 12) { tx += w.nx * (12 - w.d); ty += w.ny * (12 - w.d); }
    } else { tx = tg.x; ty = tg.y; const d = Math.hypot(tx - pk.x, ty - pk.y); sp = clamp(220 + .9 * d, T.passMin, T.passMax) * pq; }
    const sig = .06 * (1.3 - .1 * s.def.r[2]) * (s.ctrl.kind === 'cpu' ? m.aiErr(s.team) : 1) * (s.items.tape > 0 ? .3 : 1);
    const a = Math.atan2(ty - pk.y, tx - pk.x) + U.gauss(RNG.sim) * sig, d = Math.hypot(tx - pk.x, ty - pk.y);
    pk.owner = null; pk.last = s; s.pickupCD = .3;
    if (saucer) {
      const v = E.arc({ x: pk.x, y: pk.y, z: 0 }, { x: pk.x + Math.cos(a) * d, y: pk.y + Math.sin(a) * d, z: 0 }, GRAV, { apex: T.saucerApex });
      pk.vx = v.vx; pk.vy = v.vy; pk.vz = v.vz; pk.z = .5;
    } else { pk.vx = Math.cos(a) * sp; pk.vy = Math.sin(a) * sp; pk.vz = 0; pk.z = 0; }
    pk.passTo = mate; pk.passFrom = s; pk.passKind = saucer ? 'saucer' : 'pass'; pk.passT = m.t; pk.shot = null; pk.onFire = false; pk.taped = s.items.tape > 0;
    Skater.setState(s, 'pass', .2); s.passKind = saucer ? 'saucer' : 'pass';
    Bus.emit('pass', { from: s.id, to: mate ? mate.id : -1, kind: pk.passKind, team: s.team });
  }
  return { shoot, pass, willCross, aimPoint, launch };
})();

/* ---- PUCK (7.3): possession (it eases to the blade and weaves), free motion in 4 substeps against the boards, the
 * glass, the posts and crossbar, the nets, the goalies, sticks and bodies; pickups, deflections, battles, goals, out
 * of play ---- */
const Puck = (() => {
  const R = 1.6, GRAV = 420;
  function make() { return { x: Rink.C.x, y: Rink.C.y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, prev: null, onFire: false, inNet: -1, out: false, passTo: null, shot: null, trail: [], curl: 0 }; }
  function setOwner(m, pk, s, why) {
    if (pk.owner === s) return;
    const was = pk.owner, last = pk.last;
    if (pk.passTo === s && pk.passFrom && pk.passFrom.team === s.team) { pk.passFrom.stats.passes++; Bus.emit('pass_complete', { from: pk.passFrom.id, to: s.id, team: s.team }); }
    else if (pk.passTo && pk.passFrom && pk.passFrom.team !== s.team) Bus.emit('intercept', { by: s.id, team: s.team });
    if (was && was.team !== s.team) { s.stats.takeaways++; Bus.emit('takeaway', { by: s.id, from: was.id, how: why }); }
    // the last two touches by the scorer's team give the assists
    if (!last || last !== s) { pk.prev = last; }
    pk.owner = s; pk.last = s; pk.passTo = null; pk.shot = null; pk.onFire = false; pk.curl = 0; pk.z = 0; pk.vz = 0;
    if (s.team !== (last ? last.team : -1)) pk.touches = [s]; else { pk.touches = (pk.touches || []).filter(t => t !== s); pk.touches.push(s); }
    Bus.emit('possession', { by: s.id, team: s.team, how: why || 'pickup' });
  }
  const loose = (m, pk) => { if (pk.owner) { pk.owner.pickupCD = .25; pk.owner = null; } };
  function step(m, dt) {
    const pk = m.puck; if (m.noPuck) return;
    if (pk.inNet >= 0) { inNetStep(m, pk, dt); return; }
    if (pk.out) return;
    if (pk.owner) {
      const s = pk.owner;
      if (!Skater.free(s) || s.state === 'fight') { loose(m, pk); pk.vx = s.vx; pk.vy = s.vy; }
      else {
        const [bx, by] = Skater.blade(s), sp = Math.hypot(s.vx, s.vy), w = Math.sin(m.t * 9 + s.id) * 3 * clamp(1 - sp / 140, .2, 1);
        const tx = bx - Math.sin(s.facing) * w, ty = by + Math.cos(s.facing) * w, k = 1 - Math.exp(-30 * dt);
        pk.x += (tx - pk.x) * k; pk.y += (ty - pk.y) * k; pk.z = 0; pk.vx = s.vx; pk.vy = s.vy; pk.vz = 0;
        const wl = Rink.wall(pk.x, pk.y); if (wl.d < R + 1) { pk.x += wl.nx * (R + 1 - wl.d); pk.y += wl.ny * (R + 1 - wl.d); }
        if (m.cheats.magnet && s.ctrl.kind !== 'human') {}
        battles(m, pk, s, dt);
        return;
      }
    }
    const N = 4, h = dt / N;
    for (let k = 0; k < N && !pk.owner && pk.inNet < 0 && !pk.out; k++) sub(m, pk, h);
    if (!pk.owner && pk.inNet < 0 && !pk.out) pickups(m, pk);
    if (m.cheats.magnet && !pk.owner) { const h1 = m.skaters.find(s => s.ctrl.kind === 'human'); if (h1 && Skater.free(h1)) { const a = U.angTo(pk, h1); pk.vx += Math.cos(a) * 900 * dt; pk.vy += Math.sin(a) * 900 * dt; } }
    pk.trail.push([pk.x, pk.y, pk.z]); if (pk.trail.length > 8) pk.trail.shift();
  }
  function sub(m, pk, h) {
    const sp = Math.hypot(pk.vx, pk.vy);
    if (pk.z <= .3 && sp > 0) { const ns = Math.max(0, sp - (T.puckFriction + T.puckDrag * sp) * h); pk.vx *= ns / sp; pk.vy *= ns / sp; }
    if (pk.curl && sp > 60) { const k = pk.curl * h; const vx = pk.vx; pk.vx += -pk.vy * k; pk.vy += vx * k; pk.curl *= Math.exp(-h * 1.2); }
    if (sp > 760) { pk.vx *= 760 / sp; pk.vy *= 760 / sp; }
    const ox = pk.x, oy = pk.y, oz = pk.z;
    pk.x += pk.vx * h; pk.y += pk.vy * h;
    if (pk.z > 0 || pk.vz > 0) { pk.vz -= GRAV * h; pk.z += pk.vz * h; if (pk.z <= 0) { pk.z = 0; if (pk.vz < -60) { pk.vx *= .9; pk.vy *= .9; Bus.emit('puck_land', { x: pk.x, y: pk.y, saucer: pk.passKind === 'saucer' }); } pk.vz = Math.abs(pk.vz) > 40 ? -pk.vz * .3 : 0; } }
    // goals, posts, the crossbar, nets
    for (const n of [0, 1]) {
      const gx = Rink.goalX(n), d = Rink.intoNet(n), was = (ox - gx) * d, now = (pk.x - gx) * d;
      // posts
      for (const py of [Rink.C.y - Rink.MOUTH, Rink.C.y + Rink.MOUTH]) {
        const dx = pk.x - gx, dy = pk.y - py, dd = Math.hypot(dx, dy), rr = Rink.POST_R + R;
        if (dd < rr && pk.z < Rink.BAR) {
          const nx = dx / (dd || 1), ny = dy / (dd || 1), vn = pk.vx * nx + pk.vy * ny;
          if (vn < 0) { pk.vx -= 1.82 * vn * nx; pk.vy -= 1.82 * vn * ny; pk.x = gx + nx * rr; pk.y = py + ny * rr; if (-vn > 80) Bus.emit('post', { by: pk.last ? pk.last.id : -1, bar: false, net: n, x: pk.x, y: pk.y }); }
        }
      }
      if (was <= 0 && now > 0 && Math.abs(pk.y - Rink.C.y) < Rink.MOUTH) {
        if (pk.z < Rink.BAR - R && Math.abs(pk.y - Rink.C.y) < Rink.MOUTH - R) { goalLine(m, pk, n); return; }
        if (pk.z >= Rink.BAR - R && pk.z < Rink.BAR + R) { pk.vz = Math.abs(pk.vz) * .5 + 60; pk.vx = -pk.vx * .6; pk.x = gx - d * .5; Bus.emit('post', { by: pk.last ? pk.last.id : -1, bar: true, net: n, x: pk.x, y: pk.y }); }
      }
      // the net's frame from behind or the sides
      if (pk.z < 14 && Rink.inNet(n, pk.x, pk.y) && !(was <= 0)) {
        const u = (pk.x - gx) * d; if (u > Rink.NET_D - 3 || Math.abs(Math.abs(pk.y - Rink.C.y) - Rink.MOUTH) < 4) { pk.x = ox; pk.y = oy; if (Math.abs(Math.abs(oy - Rink.C.y) - Rink.MOUTH) < 4 && u <= Rink.NET_D - 3) pk.vy = -pk.vy * .2; else pk.vx = -pk.vx * .2; Bus.emit('net_hit', { x: pk.x, y: pk.y }); }
      }
    }
    // goalies
    for (const g of m.goalies) if (Goalie.collide(m, g, pk, ox, oy, oz)) return;
    // bodies (a shot into a skater is a block)
    for (const s of m.skaters) {
      if (s.state === 'bin' || pk.z > 16 || s === pk.last && pk.shot && m.t - pk.shot.t < .15) continue;
      const dx = pk.x - s.x, dy = pk.y - s.y, dd = Math.hypot(dx, dy);
      if (dd < 6 + R) {
        const nx = dx / (dd || 1), ny = dy / (dd || 1), vn = pk.vx * nx + pk.vy * ny;
        if (vn < 0) {
          const fast = Math.hypot(pk.vx, pk.vy) > 280;
          if (!fast && Skater.free(s) && s.pickupCD <= 0) continue;   // (a slow puck is taken by pickups instead)
          pk.vx -= 1.35 * vn * nx; pk.vy -= 1.35 * vn * ny; pk.vx *= .55; pk.vy *= .55; pk.x = s.x + nx * (6 + R);
          if (pk.shot && pk.shot.team !== s.team) { s.stats.blocks = (s.stats.blocks || 0) + 1; Bus.emit('block', { by: s.id, team: s.team }); if (pk.onFire) { Bus.emit('kaboom_body', { victim: s.id, x: s.x, y: s.y }); Hits.knock(m, s, Math.atan2(-ny, -nx), 220, null); } pk.shot = null; pk.onFire = false; }
          else Bus.emit('body', { by: s.id });
        }
      }
    }
    // the boards and the glass; out over the top or through a broken panel
    const w = Rink.wall(pk.x, pk.y);
    if (w.d < R) {
      const pn = Rink.panelAt(pk.x, pk.y), top = Rink.BOARD_H + (pn ? pn.glassH : 28), ice = m.arena.snowbanks;
      if ((pk.z > top && !ice) || (pk.z > Rink.BOARD_H && pn && pn.state === 'shattered') || (ice && pk.z > 12)) { pk.out = true; Bus.emit('puck_out', { x: pk.x, y: pk.y }); return; }
      const glass = pk.z > Rink.BOARD_H, vn = pk.vx * w.nx + pk.vy * w.ny;
      pk.x += w.nx * (R - w.d); pk.y += w.ny * (R - w.d);
      if (vn < 0) {
        const e = ice ? .3 : glass ? .5 : T.boardBounce, tx = pk.vx - vn * w.nx, ty = pk.vy - vn * w.ny;
        pk.vx = tx * (ice ? .7 : .92) - vn * e * w.nx; pk.vy = ty * (ice ? .7 : .92) - vn * e * w.ny;
        if (-vn > 60) Bus.emit(glass ? 'puck_glass' : 'puck_boards', { x: pk.x, y: pk.y, z: pk.z, speed: -vn, snow: !!ice });
        if (pk.onFire) { Bus.emit('kaboom_boards', { x: pk.x, y: pk.y }); if (pn && !ice) Hits.glass(m, pn, 999, null); pk.onFire = false; }
        if (pk.shot) pk.shot = null;
      }
    }
  }
  function goalLine(m, pk, n) {
    pk.inNet = n; pk.inNetT = 0; const net = Rink.NETS[n]; net.bv += Math.min(14, Math.hypot(pk.vx, pk.vy) / 40); net.by = pk.y;
    pk.vx *= .35; pk.vy *= .35; pk.vz = Math.min(pk.vz, 30);
    Match.goal(n, pk);
  }
  function inNetStep(m, pk, dt) {
    const n = pk.inNet, gx = Rink.goalX(n), d = Rink.intoNet(n);
    pk.x += pk.vx * dt; pk.y += pk.vy * dt; pk.vx *= Math.exp(-4 * dt); pk.vy *= Math.exp(-4 * dt);
    if (pk.z > 0 || pk.vz > 0) { pk.vz -= GRAV * dt; pk.z = Math.max(0, pk.z + pk.vz * dt); if (pk.z === 0) pk.vz = 0; }
    const u = (pk.x - gx) * d; if (u > Rink.NET_D - 2.5) { pk.x = gx + d * (Rink.NET_D - 2.5); pk.vx = -pk.vx * .2; }
    if (u < 2) pk.x = gx + d * 2;
    pk.y = clamp(pk.y, Rink.C.y - Rink.MOUTH + 2.5, Rink.C.y + Rink.MOUTH - 2.5);
  }
  /** a loose puck near a blade: taken, caught or deflected */
  function pickups(m, pk) {
    if (pk.z > 6) return;
    if (pk.passKind === 'saucer' && pk.z > 2 && pk.passTo) return;
    let best = null, bd = 1e9;
    for (const s of m.skaters) {
      if (!Skater.free(s) || s.pickupCD > 0 || s.state === 'fight' || s.state === 'bin' || s.state === 'wind' && false) continue;
      if (m.phase !== 'play' && m.phase !== 'shootout') continue;
      if (pk.taped && pk.passTo && s.team !== pk.passTo.team) continue;
      const cut = pk.passTo && pk.passTo.team !== s.team;   // a rival cutting a pass needs the blade on it
      const [bx, by] = Skater.blade(s), rad = T.pickupRadius * RATE.hands(s.def) * (pk.passTo === s ? 1.5 : 1) * (s.ctrl.kind === 'cpu' ? 1 : 1.1) * (cut ? .85 : 1);
      const d = cut ? Math.hypot(pk.x - bx, pk.y - by) : Math.min(Math.hypot(pk.x - bx, pk.y - by), Math.hypot(pk.x - s.x, pk.y - s.y) - 3);
      if (d < rad && d < bd) { bd = d; best = s; }
    }
    if (!best) return;
    const s = best, rel = Math.hypot(pk.vx - s.vx, pk.vy - s.vy);
    // a one-timer: fire on contact
    if (pk.passTo === s && (s.otArmed > 0 || s.intent.held.shoot) && rel > 60 && Skater.free(s)) { setOwner(m, pk, s, 'onetimer'); Shots.shoot(m, s, 'onetimer', .85); Bus.emit('onetimer', { by: s.id, team: s.team }); return; }
    const cutter = pk.passTo && pk.passTo.team !== s.team;
    if ((rel < 300 && !cutter) || (cutter && rel < 160) || pk.passTo === s && rel < 460) { setOwner(m, pk, s, 'pickup'); return; }
    const ch = clamp(1.3 - rel / 450 + .08 * (s.def.r[5] - 3), .1, 1);
    if (RNG.sim() < ch) setOwner(m, pk, s, 'catch');
    else { const a = s.facing + PI / 2 * s.hand, vn = pk.vx * Math.cos(a) + pk.vy * Math.sin(a); pk.vx = (pk.vx - 2 * vn * Math.cos(a)) * .5; pk.vy = (pk.vy - 2 * vn * Math.sin(a)) * .5; s.pickupCD = .2; pk.last = s;
      if (pk.shot && pk.shot.team === s.team && Math.abs(s.x - Rink.goalX(pk.shot.net)) < 90) { pk.shot.kind = 'deflect'; pk.shot.by = s.id; Bus.emit('deflect', { by: s.id }); } else pk.shot = null; Bus.emit('clack', { by: s.id }); }
  }
  /** opposing blades near a carried puck: every 0.2 s the stronger hands take it */
  function battles(m, pk, s, dt) {
    s.battleT = (s.battleT || 0) + dt; if (s.battleT < .2) return; s.battleT = 0;
    if (s.items.tape > 0 || s.state === 'deke' && s.stateT > .15) return;
    for (const o of m.teams[1 - s.team].skaters) {
      if (!Skater.free(o) || o.state === 'bin' || o.pickupCD > 0) continue;
      const [bx, by] = Skater.blade(o); if (Math.hypot(bx - pk.x, by - pk.y) > 8) continue;
      const a = s.def.r[5] + s.def.r[3] / 2 + RNG.sim() * 3 + (s.ctrl.kind === 'human' ? .8 : 0), b = o.def.r[5] + o.def.r[3] / 2 + RNG.sim() * 3 + (o.ctrl.kind === 'cpu' ? m.aiSkill(o.team) - .6 : 0);
      Bus.emit('battle', { a: s.id, b: o.id });
      if (b > a + 1.2) { setOwner(m, pk, o, 'battle'); return; }
    }
  }
  return { make, step, setOwner, loose, R };
})();

/* ---- 24-goalie.js ---- */
/* ---- GOALIE (7.6): positioning on an arc that cuts the angle, a physical save solver (reaction delay, lateral speed,
 * save shapes that must be in the puck's path), glove freezes, pad and blocker rebounds, butterflies, stacks, poke checks,
 * the KABOOM blast, The Vault's armour, and a manual goalie for the shootout ---- */
const Goalie = (() => {
  function make(m, team, def, home) {
    const g = { id: 100 + team, team, def, x: 0, y: Rink.C.y, z: 0, vx: 0, vy: 0, facing: 0, state: 'ready', stateT: 0, gw: 1, react: 0, tY: Rink.C.y, threat: null, size: 1,
      stats: { saves: 0, sa: 0 }, bitT: 0, vaultHits: 0, cracked: false, manual: false, ph: 0, idleT: 0, rig: null, pokeCD: 0 };
    g.rig = Rigs.goalie(def, home, { size: def.size || 1.3, classic: m.cheats.retro, bigHead: m.cheats.bigHeads });
    return g;
  }
  const net = (m, g) => m.defNet(g.team);
  const out = (m, g) => -Rink.intoNet(net(m, g));   // the direction from its goal line into the rink
  const glovesSide = (m, g) => -out(m, g);         // the catching glove is on its left: -y for the west goalie (facing +x)
  /** the save shapes' scale: size rating, the tuning, Brick Pads, The Vault */
  const scale = (m, g) => (.9 + .033 * g.def.r[1]) * T.goalieReach * (g.bricks > 0 ? 1.35 : 1) * (g.def.boss ? (g.cracked ? 1.08 : 1.22) : 1) * (m.cheats.noGoalies && g.cpu ? .01 : 1);
  function reaction(m, g, threat) {
    let r = T.goalieReact - .015 * (g.def.r[0] - 3) + m.goalieOffset(g.team);
    if (threat.screened) r += .08;
    if (m.puck.twister && g.cpu !== false) r *= 1.25;   // the Golden Twister's curl: read late
    if (g.bitT > 0) r += .12 * (g.def.boss ? 1.5 : 1);
    if (m.kaboom[g.team] > 0) r -= .03;
    return Math.max(.02, r);
  }
  /** where a moving puck will cross the goalie's plane, if it will within 1 s inside the mouth (with a margin) */
  function predict(m, g, pk) {
    const gx = Rink.goalX(net(m, g)), d = out(m, g), plane = g.x;
    const vxIn = -pk.vx * d; if (vxIn < 20) return null;
    const t = (pk.x - plane) * d / vxIn; if (t < 0 || t > 1) return null;
    const tg = (pk.x - gx) * d / vxIn;
    const yc = pk.y + pk.vy * t, zc = Math.max(0, pk.z + pk.vz * t - 210 * t * t), yg = pk.y + pk.vy * tg, zg = pk.z + pk.vz * tg - 210 * tg * tg;
    if (Math.abs(yg - Rink.C.y) > Rink.MOUTH + 6 || zg > Rink.BAR + 4) return null;
    return { yc, zc, t, onNet: Math.abs(yg - Rink.C.y) < Rink.MOUTH && zg < Rink.BAR };
  }
  function update(m, g, dt) {
    g.stateT -= dt; g.bitT = Math.max(0, g.bitT - dt); g.bricks = Math.max(0, (g.bricks || 0) - dt); g.pokeCD = Math.max(0, g.pokeCD - dt); g.idleT += dt;
    const n = net(m, g), gx = Rink.goalX(n), d = out(m, g), pk = m.puck, C = Rink.C;
    if (g.offIce) { g.x = Rink.C.x + (g.team ? 200 : -200); g.y = Rink.Y0 - 40; pose(m, g, dt); return; }
    g.facing = d > 0 ? 0 : PI;
    if (g.state === 'blasted') { g.x = approach(g.x, gx - d * 6, 60 * dt); if (g.stateT <= 0) { g.state = 'ready'; } pose(m, g, dt); return; }
    if (['butterfly', 'glove', 'blocker', 'stack', 'poke', 'down'].includes(g.state) && g.stateT <= 0) g.state = 'ready';
    if (g.state === 'cover' && m.phase === 'play') g.state = 'ready';
    if (m.phase === 'goal' || m.phase === 'final' || m.phase === 'replay') { if (m.phase === 'final' && m.winner === g.team) g.state = 'celebrate'; pose(m, g, dt); return; }
    // where to stand: the arc in front of the goal, cutting the angle to the puck
    // the goalie tracks the puck with a lag (quicker with better reflexes): a cross-crease pass can beat him across
    // a deke makes him bite: while bitten he keeps reading the fake (his tracking holds)
    const rx = pk.owner ? pk.owner.x : pk.x, ry = pk.owner ? pk.owner.y : pk.y, kTr = g.bitT > 0 ? 0 : 1 - Math.exp(-(5 + g.def.r[0] * (g.def.boss ? 1.3 : 1)) * dt);
    if (g.trX === undefined || Math.hypot(rx - g.trX, ry - g.trY) > 300) { g.trX = rx; g.trY = ry; } else { g.trX += (rx - g.trX) * kTr; g.trY += (ry - g.trY) * kTr; }
    const px0 = g.trX, py0 = g.trY;
    const ux = (px0 - gx) * d, dist = Math.hypot(px0 - gx, py0 - C.y);
    let tx, ty;
    if (g.manual) { const it = g.intent || { mx: 0, my: 0 }; tx = g.x + it.mx * 60 * d * 0; ty = clamp(g.y + it.my * 180 * dt * 0, C.y - 20, C.y + 20); g.tY = clamp(g.tY + it.my * 140 * dt, C.y - 18, C.y + 18); g.tOut = clamp((g.tOut || 12) + it.mx * d * 60 * dt, 6, 30); tx = gx + d * g.tOut; ty = g.tY; }
    else if (ux < 2) { ty = C.y + Math.sign(py0 - C.y || 1) * 12; tx = gx + d * 4; }
    else {
      const r = clamp(lerp(10, 26, (dist - 60) / 260), 10, 26), a = Math.atan2(py0 - C.y, (px0 - gx));
      tx = gx + Math.cos(a) * r; ty = C.y + Math.sin(a) * r * .8;
      ty = clamp(ty, C.y - 15, C.y + 15);
    }
    // the save solver: a threat on net (a shot, pass or deflection) after the reaction delay moves it to the crossing
    const th = !pk.owner && pk.inNet < 0 && (m.phase === 'play' || m.phase === 'shootout') ? predict(m, g, pk) : null;
    if (th && !g.manual) {
      const key = (pk.shot ? 's' + pk.shot.t : 'p' + (pk.passT || 0)) + ':' + Math.round(pk.vx) + ':' + Math.round(pk.vy);
      if (!g.threat || g.threat.key !== key) {
        const shotKey = pk.shot ? pk.shot.t : null, same = g.threat && g.threat.shotKey === shotKey && shotKey !== null;
        g.threat = { key, at: m.t, screened: screened(m, g, pk), shotKey, counted: same ? g.threat.counted : false };
        g.react = reaction(m, g, g.threat);
        if (pk.shot && th.onNet && !g.threat.counted) { g.stats.sa++; g.threat.counted = true; }
      }
      if (m.t - g.threat.at >= g.react) {
        ty = clamp(th.yc, C.y - 22, C.y + 22);
        const dy = th.yc - g.y, sc = scale(m, g);
        if (g.state === 'ready' || g.state === 'shuffle') {
          if (Math.abs(dy) > 12 * sc && th.t < .2) { g.state = 'stack'; g.stateT = 1; g.side = Math.sign(dy) * d; }
          else if (th.zc < 9) { g.state = 'butterfly'; g.stateT = .7; }
          else if (Math.abs(dy) > 5) { g.state = Math.sign(dy) === glovesSide(m, g) ? 'glove' : 'blocker'; g.stateT = .45; g.reachY = dy; }
        }
      }
    } else if (!th) g.threat = null;
    // the poke check: a carrier close in front
    if (!g.manual && pk.owner && pk.owner.team !== g.team && g.pokeCD <= 0 && ux > 0 && Math.hypot(pk.owner.x - g.x, pk.owner.y - g.y) < 22) {
      g.pokeCD = 1;
      if (RNG.sim() < .4 * (g.def.r[0] / 3) * (pk.owner.items.tape > 0 ? 0 : 1)) { g.state = 'poke'; g.stateT = .35; Puck.loose(m, pk); pk.vx = d * 160 + (RNG.sim() - .5) * 120; pk.vy = (RNG.sim() - .5) * 200; pk.last = null; Bus.emit('poke', { by: g.id, ok: true, goalie: true }); }
    }
    // move: lateral speed with T-pushes, slower in the butterfly
    const lat = T.goalieLateral * (.85 + .05 * g.def.r[0]) * (g.def.boss && !g.cracked ? .8 : 1) * (g.state === 'butterfly' ? .55 : g.state === 'stack' ? .2 : 1);
    const far = Math.abs(ty - g.y) > 8, sp = far ? Math.max(lat, 230 * (g.state === 'ready' ? 1 : .4)) : lat;
    g.vy = clamp((ty - g.y) * 14, -sp, sp); g.vx = clamp((tx - g.x) * 8, -lat * .6, lat * .6);
    g.y += g.vy * dt; g.x += g.vx * dt;
    if ((g.x - gx) * d < 1) g.x = gx + d * 1;
    g.state = g.state === 'ready' && Math.abs(g.vy) > 30 ? 'shuffle' : g.state === 'shuffle' && Math.abs(g.vy) <= 30 ? 'ready' : g.state;
    pose(m, g, dt);
  }
  function screened(m, g, pk) {
    if (!pk.shot) return false;
    for (const s of m.skaters) { if (s.id === pk.shot.by) continue; const q = U.segPt(s.x, s.y, pk.shot.x, pk.shot.y, g.x, g.y); if (q.d < 14 && q.u > .3 && q.u < .97) return true; }
    return false;
  }
  /** the puck crossing the goalie's plane this substep: inside the current save shape is a save */
  function collide(m, g, pk, ox, oy, oz) {
    if (g.offIce || ['blasted', 'celebrate'].includes(g.state) || (m.cheats.noGoalies && g.cpu)) return false;
    const d = out(m, g), a = (ox - g.x) * d, b = (pk.x - g.x) * d;
    if (!(b < a && a >= -1 && b < 2)) return false;
    const t = a - b > 1e-6 ? clamp(a / (a - b), 0, 1) : 1, yc = oy + (pk.y - oy) * t, zc = oz + (pk.z - oz) * t, dy = yc - g.y, sc = scale(m, g) * (g.def.size ? g.def.size / 1.3 : 1) * (g.def.boss && g.cracked ? 1.4 / 1.75 : 1);
    if (b > 3) return false;
    const st = g.state;
    let hit = null;
    const stand = Math.abs(dy) < 8 * sc && zc < 22 * sc;
    if (st === 'butterfly' || st === 'cover' || st === 'poke') hit = (Math.abs(dy) < 14 * sc && zc < 10) ? 'pad' : (Math.abs(dy) < 6 * sc && zc < 20 * sc) ? 'body' : null;
    else if (st === 'glove' || st === 'blocker') { const ry = Math.sign(g.reachY || 1) * 11 * sc; hit = Math.hypot(dy - ry, zc - 15) < 5.5 * sc ? st : stand ? 'body' : null; }
    else if (st === 'stack') hit = (Math.sign(dy) === Math.sign(g.side * d) || Math.abs(dy) < 6) && Math.abs(dy) < 18 * sc && zc < 8 ? 'pad' : null;
    else hit = stand ? (zc > 12 ? (Math.sign(dy) === glovesSide(m, g) ? 'glove' : 'blocker') : 'pad') : null;
    if (!hit) return false;
    const speed = Math.hypot(pk.vx, pk.vy);
    // KABOOM: the blast
    if (pk.onFire) {
      if (g.def.boss && !g.cracked) {
        g.vaultHits++; pk.onFire = false;
        if (g.vaultHits >= 2) { g.cracked = true; g.def = Object.assign({}, g.def, { r: [g.def.r[0] - 1, g.def.r[1], g.def.r[2]] }); g.rig.o.size = 1.4; Bus.emit('vault_cracked', { goalie: g.id }); }
        else Bus.emit('vault_locked', { goalie: g.id });
        g.state = 'down'; g.stateT = .5; pk.vx = -pk.vx * .25; pk.vy *= .25; pk.vz = 40;
        saveStats(m, g, 'blast-held', false); return true;
      }
      g.state = 'blasted'; g.stateT = 1.2; Bus.emit('blast', { goalie: g.id, x: g.x, y: g.y });
      pk.onFire = false;
      if (RNG.sim() < T.kaboomBlast) { pk.vx *= .8; pk.vy *= .8; return false; }
      pk.vx = d * 20; pk.vy = 0; pk.vz = 0; saveStats(m, g, 'blast', false); return true;
    }
    g.x += 0; pk.x = g.x + d * 2.5; pk.y = yc; pk.z = Math.max(0, zc);
    const freezeK = .06 * (g.def.r[2] - 3);
    if ((hit === 'glove' && RNG.sim() < T.gloveCatch + freezeK) || ((hit === 'pad' || hit === 'body') && st === 'butterfly' && RNG.sim() < .4 + freezeK) || (speed < 140 && RNG.sim() < .7)) {
      pk.vx = pk.vy = pk.vz = 0; g.state = 'cover'; saveStats(m, g, hit, true); Match.freeze(g); return true;
    }
    // a rebound: away from the net, into the slot or the corners
    const ang = (d > 0 ? 0 : PI) + (RNG.sim() - .5) * 1.75, rs = Math.max(90, speed * T.reboundSpeed);
    pk.vx = Math.cos(ang) * rs; pk.vy = Math.sin(ang) * rs; pk.vz = hit === 'blocker' || hit === 'glove' ? 60 : 20; pk.rebound = m.t; pk.last = null; pk.shot = null;
    saveStats(m, g, hit, false); return true;
  }
  function saveStats(m, g, kind, freeze) {
    const shot = m.puck.shot;
    if (g.threat && g.threat.counted && !g.threat.saved) { g.threat.saved = true; g.stats.saves++; }
    Bus.emit('save', { goalie: g.id, team: g.team, kind, freeze, shooter: shot ? shot.by : -1 });
  }
  /** the rig: stances, saves, the blast, celebrations, idle post taps */
  function pose(m, g, dt) {
    const rig = g.rig, hk = rig.hk, st = g.state;
    hk.mode = 'goalie'; hk.ph = (g.ph += dt * Math.abs(g.vy) / 8);
    hk.gst = st === 'shuffle' ? 'shuffle' : st === 'butterfly' || st === 'cover' || st === 'poke' ? 'butterfly' : st === 'stack' ? 'stack' : st === 'blasted' ? 'blasted' : 'ready';
    hk.gw = st === 'ready' || st === 'shuffle' ? 1 : Math.min(1, (hk.gw || 0) + dt * 12);
    hk.side = g.side || 1; hk.crouch = st === 'ready' ? .55 + Math.sin(m.t * 3) * .04 : .7;
    hk.stick = hk.stick || {}; hk.stick.act = st === 'poke' ? 'gpoke' : 'gready'; hk.stick.u = st === 'poke' ? 1 - g.stateT / .35 : 0;
    hk.glove = st === 'glove' ? [3, -Math.min(10, Math.abs(g.reachY || 8)) * 1, 1.4] : st === 'blocker' ? [4.4, -4.6, -1] : [4.4, -4.6, -1];
    const down = st === 'blasted' ? Math.min(1, (1.2 - g.stateT) * 3) : st === 'down' ? .5 : 0;
    rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.facing + (st === 'blasted' ? PI : 0), down, pose: st === 'celebrate' ? 'cheer' : null, expr: st === 'celebrate' ? 'shout' : null, flip: st === 'blasted' ? clamp((1.2 - g.stateT) / 1.2, 0, 1) : 0 });
    if (st === 'blocker') { const J = rig.J, o = rig.o, hand = E.V3.add(J.shC, [3, 9, 1]); const [el, h2] = E.ik3(J.shR, hand, o.armUpper, o.armLower, [-1, .8, -.3]); J.elbowR = el; J.handR = h2; }
  }
  return { make, update, collide, predict, scale, net, out };
})();

/* ---- 25-ai.js ---- */
/* ---- AI (7.13): every CPU skater writes the same intent a player's controller does (so the network, the bot and the
 * attract mode reuse it). Roles per team: with the puck carrier / support / point; without it pressure / cover / home;
 * a loose puck sends whoever gets there first. Each re-thinks every lerp(0.3, 0.12, skill) s and steers in between ---- */
const AI = (() => {
  const blankIntent = () => ({ mx: 0, my: 0, aim: null, face: null, back: false, held: { shoot: false, lob: false, turbo: false }, press: { pass: false, shoot: false, deke: false, lob: false, chirp: false, switch: false } });
  const clearPress = it => { const p = it.press; p.pass = p.shoot = p.deke = p.lob = p.chirp = p.switch = false; };
  /** time for s to reach point (x, y) at its top speed */
  const reach = (m, s, x, y) => Math.hypot(x - s.x, y - s.y) / Math.max(40, Skater.vmax(s, m) * (s.turboOn ? 1.3 : 1));
  /** no rival body or blade near the line from s to (x, y) (a pass's lane), w wide */
  const laneClear = (m, s, x, y, team, w = 15) => m.teams[1 - team].skaters.every(o => { if (o.state === 'bin' || o.offIce || !Skater.free(o)) return true; const [bx, by] = Skater.blade(o), a = U.segPt(o.x, o.y, s.x, s.y, x, y), b = U.segPt(bx, by, s.x, s.y, x, y); return (a.d > w || a.u > .97) && (b.d > w * .7 || b.u > .97); });
  const leadOf = o => [o.x + o.vx * .35, o.y + o.vy * .35];
  /** roles for one team (each step: cheap) */
  function roles(m, t) {
    const team = m.teams[t], sk = team.skaters.filter(s => s.state !== 'bin' && s.state !== 'frozen' && s.state !== 'fight' && !s.offIce), pk = m.puck, own = pk.owner;
    const R = {};
    if (own && own.team === t) {
      R[own.id] = 'carrier'; const dir = m.attackDir(t), rest = sk.filter(s => s !== own).sort((a, b) => (b.x - a.x) * dir - (a.x - b.x) * dir * 0 - 0);
      rest.sort((a, b) => b.x * dir - a.x * dir); if (rest[0]) R[rest[0].id] = 'support'; if (rest[1]) R[rest[1].id] = 'point';
    } else if (own) {
      const near = sk.slice().sort((a, b) => reach(m, a, own.x + own.vx * .3, own.y + own.vy * .3) - reach(m, b, own.x + own.vx * .3, own.y + own.vy * .3));
      if (near[0]) R[near[0].id] = 'pressure'; if (near[1]) R[near[1].id] = 'cover'; if (near[2]) R[near[2].id] = 'home';
    } else {
      const px = pk.x + pk.vx * .35, py = pk.y + pk.vy * .35, near = sk.slice().sort((a, b) => reach(m, a, px, py) - reach(m, b, px, py));
      const them = m.teams[1 - t].skaters.filter(s => Skater.free(s)).map(s => reach(m, s, px, py)), ours = near[0] ? reach(m, near[0], px, py) : 9, win = ours <= Math.min(9, ...them) + .1;
      if (pk.passTo && pk.passTo.team === t) R[pk.passTo.id] = 'receive';
      for (const s of near) if (!R[s.id]) { R[s.id] = 'chase'; break; }
      const rest = near.filter(s => !R[s.id]);
      rest.forEach((s, i) => { R[s.id] = win ? (i === 0 ? 'support' : 'point') : (i === 0 ? 'cover' : 'home'); });
    }
    team.roles = R; return R;
  }
  /** the most dangerous rival without the puck (to mark) */
  function markOf(m, s) {
    const net = m.defNet(s.team), gx = Rink.goalX(net), pk = m.puck;
    let best = null, bd = 1e9;
    for (const o of m.teams[1 - s.team].skaters) { if (o === pk.owner || o.state === 'bin') continue; const d = Math.hypot(o.x - gx, o.y - Rink.C.y) + U.dist(o, s) * .3; const taken = m.teams[s.team].skaters.some(q => q !== s && q.ai.mark === o.id); if (!taken && d < bd) { bd = d; best = o; } }
    return best;
  }
  function think(m, s) {
    const ai = s.ai, it = s.intent, pk = m.puck, t = s.team, role = (m.teams[t].roles || {})[s.id] || 'home', dir = m.attackDir(t), skill = m.aiSkill(t);
    const gxA = Rink.goalX(m.attackNet(t)), gxD = Rink.goalX(m.defNet(t)), C = Rink.C;
    ai.role = role; ai.turbo = false; ai.face = null; ai.back = false; it.aim = null;
    let tx = s.x, ty = s.y;
    const owner = pk.owner;
    if (role === 'carrier') {
      const dg = Math.hypot(gxA - s.x, C.y - s.y), ang = Math.abs(Math.atan2(C.y - s.y, (gxA - s.x) * dir)), front = m.teams[1 - t].skaters.filter(o => Skater.free(o) && U.dist(o, s) < 34 && Math.abs(U.angDiff(s.facing, U.angTo(s, o))) < .8);
      const mates = m.teams[t].skaters.filter(o => o !== s && Skater.free(o) && o.state !== 'bin');
      // a human calling for it
      if (s.callFor && s.callFor.t > 0) { const c = s.callFor.by; if (laneClear(m, s, c.x, c.y, t) || s.callFor.t < .1) { s.passPick = c.id; it.press.pass = true; s.callFor = null; return; } }
      // shoot from the zone with a lane
      const inZone = dg < T.aiShootRange * (.8 + skill * .3) && ang < 1.05 && (gxA - s.x) * dir > 20;
      const lane = m.teams[1 - t].skaters.filter(o => U.segPt(o.x, o.y, s.x, s.y, gxA, C.y).d < 10 && U.segPt(o.x, o.y, s.x, s.y, gxA, C.y).u < .95).length;
      if (inZone && lane <= 1 && (dg < 120 || RNG.sim() < .55 + skill * .3) && s.state !== 'wind') {
        const slap = dg > 110 && !front.length && RNG.sim() < .55, kab = m.kaboom[t] > 0 && !front.length;
        ai.shootHold = kab ? .18 + T.slapCharge / 2 + .05 : slap ? .2 + T.slapCharge * (.4 + RNG.sim() * .6) : .04;
        it.press.shoot = true; ai.shootT = ai.shootHold; return;
      }
      // pass when pressured, or when a mate is clearly better placed
      const better = mates.filter(o => (o.x - s.x) * dir > 40 && Math.hypot(gxA - o.x, C.y - o.y) + 60 < dg && laneClear(m, s, ...leadOf(o), t));
      const pressured = front.some(o => U.dist(o, s) < 26);
      if ((pressured || (better.length && RNG.sim() < .35 + skill * .3)) && mates.length) {
        const to = better[0] || mates.filter(o => laneClear(m, s, ...leadOf(o), t))[0] || (pressured && RNG.sim() < .4 ? mates[0] : null);
        if (to) { s.passPick = to.id; const lob = !laneClear(m, s, ...leadOf(to), t, 15); if (lob) it.press.lob = true; else it.press.pass = true; return; }
      }
      if (front.length && s.dekeCD <= 0 && RNG.sim() < .4 * s.def.r[5] / 3) { it.press.deke = true; }
      // Golden Twister: Sterling's spin in the zone
      if (s.def.twister && (gxA - s.x) * dir > 0 && Math.abs(gxA - s.x) < 260 && !(s.twistT > 0) && (s.twistCD || 0) < m.t && RNG.sim() < .33) { s.twistT = .6; s.twistCD = m.t + 6; Bus.emit('twister', { by: s.id }); }
      if (s.twistT > 0) { it.mx = it.my = 0; return; }
      // carry toward the net, around defenders
      tx = gxA - dir * 40; ty = C.y + (s.y < C.y ? -30 : 30) * (dg > 160 ? 1 : .3);
      if (front.length) { const o = front[0], side = U.angDiff(s.facing, U.angTo(s, o)) > 0 ? -1 : 1; tx = s.x + dir * 60; ty = s.y + side * 50; }
      ai.turbo = !front.length && dg > 140 && s.turbo > .3;
    } else if (role === 'support') {
      const carrier = owner && owner.team === t ? owner : null, deep = carrier && (carrier.x - Rink.C.x) * dir > 108;
      if (deep) { tx = gxA - dir * (40 + RNG.sim() * 25); ty = C.y + (carrier.y < C.y ? 1 : -1) * (24 + RNG.sim() * 20); }
      else { tx = clamp((owner ? owner.x : pk.x) + dir * 120, Rink.X0 + 90, Rink.X1 - 90); ty = C.y + ((owner ? owner.y : pk.y) < C.y ? 1 : -1) * 110; }
      ai.turbo = Math.hypot(tx - s.x, ty - s.y) > 120 && s.turbo > .5;
      // arm a one-timer when a pass is coming in the slot
      if (pk.passTo === s && Math.abs(gxA - s.x) < 170 && RNG.sim() < .45 + skill * .4) { it.held.shoot = true; ai.shootT = .4; ai.shootHold = .4; }
    } else if (role === 'point') {
      const carrier = owner && owner.team === t ? owner : null;
      tx = Rink.C.x + dir * 125; ty = C.y + ((carrier ? carrier.y : pk.y) < C.y ? 1 : -1) * 50;
      if (carrier && (carrier.x - Rink.C.x) * dir < 0) tx = carrier.x - dir * 60;
      if (pk.rebound && m.t - pk.rebound < 1 && Math.abs(gxA - pk.x) < 120 && m.cfg.aggressive) { tx = pk.x; ty = pk.y; }
    } else if (role === 'pressure' && owner) {
      const lead = .3 * (1 - skill * .4); tx = owner.x + owner.vx * lead; ty = owner.y + owner.vy * lead;
      // stay goal-side: approach from between the carrier and our net
      tx += Math.sign(gxD - owner.x) * 6;
      const d = U.dist(s, owner); ai.turbo = d > 60 && s.turbo > .4;
      if (d < 30 && s.checkCD <= 0 && s.cool <= 0) {
        const hitter = s.def.r[3] >= 3 && RNG.sim() < T.aiAggression * (m.teams[t].tactic === 'grit' ? 1.3 : m.teams[t].tactic === 'finesse' ? .7 : 1) * (.6 + skill * .6);
        if (hitter && d < 26) it.press.shoot = true; else if (d < 22 && RNG.sim() < .5 + skill * .3) it.press.deke = true;
      }
    } else if (role === 'cover') {
      const o = markOf(m, s); ai.mark = o ? o.id : null;
      if (o) { tx = lerp(o.x, gxD, .22); ty = lerp(o.y, C.y, .22); ai.face = U.angTo(s, pk); }
      else { tx = gxD - dir * -90; ty = C.y; }
      if (owner && U.dist(s, owner) < 24 && s.checkCD <= 0 && RNG.sim() < .4) it.press.shoot = true;
    } else if (role === 'home') {
      tx = gxD + dir * 70; ty = lerp(C.y, owner ? owner.y : pk.y, .3); ai.face = U.angTo(s, owner || pk);
      if (owner && owner.team !== t && U.dist(s, owner) < 20 && s.cool <= 0) it.press.deke = true;
    } else if (role === 'chase' || role === 'receive') {
      const lead = role === 'receive' ? .15 : .3; tx = pk.x + pk.vx * lead; ty = pk.y + pk.vy * lead; ai.turbo = role === 'chase' && U.dist(s, pk) > 50 && s.turbo > .3;
    }
    // detours: items, the bear, Big Lou's grudges
    if ((role === 'point' || role === 'home' || role === 'cover') && m.items.length && T.aiItemGreed > 0) { const it2 = m.items.find(i => !i.air && !['octopus', 'rat', 'hat'].includes(i.kind) && Math.hypot(i.x - s.x, i.y - s.y) < T.aiItemGreed); if (it2) { tx = it2.x; ty = it2.y; } }
    if (m.teams[t].huntBear && role !== 'carrier') { const p = m.extras.find(e => e.kind === 'pete' && e.down <= 0); if (p && U.dist(p, s) < 140 && RNG.sim() < .5) { tx = p.x; ty = p.y; if (U.dist(p, s) < 30 && s.checkCD <= 0) it.press.shoot = true; } }
    if (s.bubbleT <= 0 && s.chirpCD <= 0 && m.lastBigHitBy === s.id && RNG.sim() < .3) { it.press.chirp = true; m.lastBigHitBy = null; }
    const w = Rink.wall(tx, ty); if (w.d < 14 && role !== 'chase' && role !== 'pressure') { tx += w.nx * (14 - w.d); ty += w.ny * (14 - w.d); }
    ai.tx = tx; ai.ty = ty;
    if (role === 'cover' || role === 'home') ai.back = ai.face !== null && Math.abs(U.angDiff(ai.face, Math.atan2(ty - s.y, tx - s.x))) > 2;
  }
  /** each step for a CPU skater: re-think on its cadence, then steer */
  function step(m, s, dt) {
    const ai = s.ai, it = s.intent, skill = m.aiSkill(s.team);
    clearPress(it);
    if (s.callFor) { s.callFor.t -= dt; if (s.callFor.t <= 0) s.callFor = null; }
    ai.thinkT -= dt;
    if (ai.thinkT <= 0 && (m.phase === 'play' || m.phase === 'shootout')) { ai.thinkT = lerp(.3, .12, skill) * (.8 + RNG.sim() * .4); think(m, s); }
    // held shot: hold, then let go
    if (ai.shootT > 0) { ai.shootT -= dt; it.held.shoot = ai.shootT > 0; } else it.held.shoot = false;
    if (s.state === 'wind' && m.puck.owner !== s) ai.shootT = 0;
    // steer: to the target, apart from teammates
    let dx = (ai.tx === undefined ? s.x : ai.tx) - s.x, dy = (ai.ty === undefined ? s.y : ai.ty) - s.y;
    for (const o of m.teams[s.team].skaters) if (o !== s && o.state !== 'bin') { const ox = s.x - o.x, oy = s.y - o.y, d = Math.hypot(ox, oy); if (d < 40 && d > 0) { dx += ox / d * (40 - d) * 1.2; dy += oy / d * (40 - d) * 1.2; } }
    const d = Math.hypot(dx, dy), k = d > 8 ? 1 : d / 8;
    it.mx = d > 1 ? dx / d * k : 0; it.my = d > 1 ? dy / d * k : 0;
    it.held.turbo = !!ai.turbo; it.face = ai.back ? ai.face : null; it.back = !!ai.back;
    if (m.cheats.freezeAI && s.ctrl.kind === 'cpu') { it.mx = it.my = 0; clearPress(it); it.held.shoot = false; }
  }
  /** the shootout's CPU shooter: skate in, deke or shoot */
  function shooter(m, s, dt) {
    const it = s.intent, ai = s.ai, gx = Rink.goalX(m.attackNet(s.team)), dir = m.attackDir(s.team), dg = Math.abs(gx - s.x), g = m.goalieAt(m.attackNet(s.team));
    clearPress(it);
    if (!ai.plan) ai.plan = { at: 60 + RNG.sim() * 70, deke: RNG.sim() < .45, side: RNG.sim() < .5 ? 1 : -1 };
    if (ai.plan.deke && !ai.plan.dk) { ai.plan.dk = true; ai.plan.at = 38 + RNG.sim() * 20; }
    it.mx = dir; it.my = (Rink.C.y + ai.plan.side * 20 - s.y) / 80; it.held.turbo = dg > 200;
    if (ai.shootT > 0) { ai.shootT -= dt; it.held.shoot = ai.shootT > 0; return; }
    if (m.puck.owner === s && dg < ai.plan.at + (ai.plan.deke ? 34 : 0)) {
      if (ai.plan.deke && !ai.deked) { ai.deked = true; it.press.deke = true; it.my = -ai.plan.side; return; }
      if (!ai.deked || s.state !== 'deke') { it.press.shoot = true; ai.shootT = dg > 110 ? .5 : .04; it.held.shoot = true; }
    }
  }
  return { blankIntent, clearPress, roles, think, step, shooter, laneClear };
})();

/* ---- 26-match.js ---- */
/* ---- MATCH (7.14): one game of hockey. It owns the entities and runs the fixed-order step (5.4): intents, phase logic,
 * actions and skating, bodies, the puck, the goalies, hits, items, BOOM / sin bin timers, the clock; then the consumers.
 * Phases: intro, faceoff, play, stoppage, goal, replay, periodEnd, intermission, fight, shootout, final. Every mode is a
 * Match config: the Cup Run's games, exhibitions, drills, the attract reel and online sessions ---- */
const Match = (() => {
  const DIFF = { rookie: { skill: .35, cpuG: .06, humG: -.03 }, pro: { skill: .55, cpuG: .02, humG: -.01 }, allstar: { skill: .75, cpuG: 0, humG: 0 }, legend: { skill: .95, cpuG: -.02, humG: .01 } };
  const DIFF_ORDER = ['rookie', 'pro', 'allstar', 'legend'];
  let m = null;
  const blankStats = () => ({ goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, takeaways: 0, fightsWon: 0, turbo: 0, topShot: 0, passes: 0, blocks: 0, items: 0, pim: 0, onetimers: 0 });
  /** a new match from a config (see the header); returns its state */
  function create(cfg) {
    cfg = Object.assign({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, periodLen: +S('periodLen') || 120, ot: 'sudden', otLen: 120, shootout: true, intros: S('intros') !== false, replays: S('replays') || 'auto',
      flood: S('flood') || 'ask', difficulty: S('difficulty') || 'pro', cheats: {}, objectives: [], humans: [], mode: 'exhibition', seed: (Date.now() % 1e9) | 0, rules: {}, tactic: {}, events: [] }, cfg);
    const rules = Object.assign({ fights: true, items: true, hazards: true, boom: true, clock: true }, cfg.rules);
    RNG.seed(cfg.seed);
    const arena = ARENAS[cfg.arena], cheats = Object.assign({}, cfg.cheats);
    const st = {
      cfg, rules, arena, cheats, t: 0, phase: 'intro', phaseT: 0, period: 1, clock: cfg.periodLen, ot: false, so: null, winner: -1, hitstop: 0,
      teams: [], skaters: [], goalies: [], puck: Puck.make(), items: [], extras: [], refs: [], ice: [], humans: [], fights: 0, lastFightClock: null, fight: null, invite: null,
      boom: [0, 0], kaboom: [0, 0], itemT: T.itemEvery * .6, dropT: 20, faceoff: null, events: [], obj: {}, objDone: {}, goals: [], replayClip: null, hilites: [], glassFix: 0, intro: null,
      stats: { faceoffs: [0, 0] }, lastBigHitBy: null, boostOn: false, organOn: 0, sessionCap: cfg.otCap || 0, ended: false
    };
    m = st;
    [cfg.home, cfg.away].forEach((id, t) => {
      const def = TEAMS[id], home = t === 0;
      const team = { t, id, def, home, score: 0, shots: 0, hits: 0, kabooms: 0, faceoffs: 0, skaters: [], goalie: null, tactic: cfg.tactic[t] || null, huntBear: cfg.huntBear === t, human: false, roles: {}, ppGoals: 0 };
      def.players.forEach((d0, i) => {
        let d = d0; if (cfg.mods && cfg.mods[d0.key]) d = Object.assign({}, d0, { r: d0.r.map((v, k) => clamp(v + (cfg.mods[d0.key][k] || 0), 1, 6)) });
        const s = { id: t * 3 + i, team: t, slot: i, def: d, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, state: 'skate', stateT: 0, turbo: 1, turboOn: false, rest: 0, stopT: 0, hand: d.hand === 'L' ? -1 : 1,
          pickupCD: 0, items: {}, grudge: {}, stats: blankStats(), intent: AI.blankIntent(), ai: { thinkT: RNG.sim() * .2, role: 'home' }, ctrl: { kind: 'cpu' }, charge: 0, shootHeld: 0, charging: false, phase: RNG.sim() * 6 };
        s.rig = Rigs.skater(d, home, { classic: cheats.retro, bigHead: cheats.bigHeads }); s.hairColor = s.rig.C.hair; s.helmetColor = s.rig.hkGear.helmet;
        team.skaters.push(s); st.skaters.push(s);
      });
      const g = Goalie.make(st, t, def.goalie, home); g.cpu = true; team.goalie = g; st.goalies.push(g);
      st.teams.push(team);
    });
    // the officials, the bench spares, the coaches
    const ref = { kind: 'ref', id: 300, x: Rink.C.x, y: Rink.C.y + 40, vx: 0, vy: 0, body: true, down: 0, rig: Rigs.referee({ classic: cheats.retro }), facing: -PI / 2, arm: 0 };
    const lines = { kind: 'ref', id: 301, x: Rink.C.x + 120, y: Rink.Y0 + 30, vx: 0, vy: 0, body: true, down: 0, rig: Rigs.referee({ classic: cheats.retro, skin: '#a87050' }), facing: PI / 2, arm: 0, linesman: true };
    st.refs = [ref, lines];
    Items.setupIce(st); Items.setupExtras(st);
    st.extras.push(...st.refs);
    st.bench = [0, 1].map(t => ({ spares: [0, 1].map(i => Rigs.spare(st.teams[t].id, t === 0, i + t * 2)), coach: t === 0 && st.teams[0].id === 'muskrats' ? Rigs.cast('marge') : t === 1 && st.teams[1].id === 'grizzlies' ? Rigs.cast('glitterman') : Rigs.cast(t ? 'gus' : 'gus') }));
    // the humans: each on their own skater, the center first
    for (const h of cfg.humans) addHuman(st, h);
    Rink.resetPanels(); Rink.clearIce();
    for (const n of Rink.NETS) { n.bulge = 0; n.bv = 0; n.light = 0; n.tip = 0; }
    // objectives
    for (const o of cfg.objectives) { st.obj[o.id] = 0; }
    Object.assign(st, api(st));
    return st;
  }
  function addHuman(st, h) {
    const team = st.teams[h.team]; team.human = true;
    const free = team.skaters.filter(s => s.ctrl.kind === 'cpu'), s = free.find(q => q.def.pos === 'C') || free[0]; if (!s) return null;
    const hu = Object.assign({ id: st.humans.length, kind: 'local', name: h.name || 'P' + (st.humans.length + 1), color: h.color || E.PLAYER_COLORS[st.humans.length] || '#ffd36a' }, h, { skater: s, switchT: 0 });
    s.ctrl = { kind: hu.kind === 'remote' ? 'remote' : 'human', input: hu.input, human: hu };
    st.humans.push(hu); return hu;
  }
  /** the per-match helpers (bound to the state) */
  function api(st) {
    return {
      defNet: t => (t + (st.period - 1)) % 2, attackNet: t => 1 - ((t + (st.period - 1)) % 2), attackDir: t => (1 - ((t + (st.period - 1)) % 2)) ? 1 : -1,
      goalieAt: n => st.goalies.find(g => ((g.team + (st.period - 1)) % 2) === n),
      byId: id => st.skaters.find(s => s.id === id) || st.goalies.find(g => g.id === id) || st.extras.find(e => e.id === id) || null,
      aiSkill: t => { const k = t === 0 ? T.aiSkillHome : T.aiSkillAway; if (k >= 0) return k; let sk = DIFF[st.cfg.difficulty].skill; if (st.cfg.cpuStep && !st.teams[t].human) sk = DIFF[DIFF_ORDER[Math.max(0, DIFF_ORDER.indexOf(st.cfg.difficulty) + st.cfg.cpuStep)]].skill; if (st.teams[t].human && st.humans.filter(h => h.team === t).length === 1 && st.humans.length > 1 && st.humans.filter(h => h.team !== t).length > 1) sk += .15; if (st.cfg.difficulty === 'rookie' && !st.teams[t].human && st.teams[t].score - st.teams[1 - t].score >= 3) sk -= .1; return clamp(sk + (st.cfg.aiBonus ? st.cfg.aiBonus[t] || 0 : 0), 0, 1); },
      aiErr: t => lerp(1.6, .7, st.aiSkill(t)),
      goalieOffset: t => { const D = DIFF[st.cfg.difficulty]; return st.teams[t].human ? D.humG : D.cpuG + (st.cfg.cpuStep && !st.teams[t].human ? .02 : 0); },
      clockTotal: () => (st.period - 1) * st.cfg.periodLen + (st.cfg.periodLen - st.clock),
      setPhase: (p, t = 0) => { st.phase = p; st.phaseT = t; Bus.emit('phase', { phase: p, period: st.period }); },
      stoppage: (why, dot) => stoppage(st, why, dot),
      replayOk: () => st.cfg.replays !== 'off' && Replay.startGoal(st)
    };
  }

  /* ---- intents: humans from their input, CPUs from the AI, remote players from the network ---- */
  const lastMouse = { x: 0, y: 0, t: -9 };
  function humanIntent(st, s, I) {
    const it = s.intent, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    it.mx = d[0]; it.my = d[1]; it.face = null; it.back = false;
    it.aim = null;
    if (I === game.input) { const ms = I.mouse && I.mouse.active && I.screenPoint ? I.screenPoint(I.mouse.cx, I.mouse.cy) : null; if (ms && (Math.abs(ms[0] - lastMouse.x) > 2 || Math.abs(ms[1] - lastMouse.y) > 2)) { lastMouse.x = ms[0]; lastMouse.y = ms[1]; lastMouse.t = game.real; } }
    if (I.lastDevice === 'mouse' && game.real - lastMouse.t < 2 && I === game.input) { const w = Cam.mouseWorld(); if (w) it.aim = w; }
    else if (I.padAim) { const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); if (Math.hypot(a[0], a[1]) > .3) it.aim = [s.x + a[0] * 160, s.y + a[1] * 160]; }
    it.held.shoot = I.down('shoot'); it.held.lob = I.down('lob'); it.held.turbo = I.down('turbo');
    const p = it.press; p.pass = I.pressed('pass'); p.shoot = I.pressed('shoot'); p.deke = I.pressed('deke'); p.lob = I.pressed('lob'); p.chirp = I.pressed('chirp'); p.switch = I.pressed('switch');
    if (I.pressed('camera')) Cam.cycle();
  }
  /** who a human holds: switch on demand, to a pass's receiver, and (a lone human on defense) to the one nearest the puck */
  function control(st, dt) {
    if (st.cfg.noSwitch) return;
    for (const hu of st.humans) {
      hu.switchT = Math.max(0, hu.switchT - dt);
      const s = hu.skater, team = st.teams[hu.team], pk = st.puck;
      const cpuMates = team.skaters.filter(o => o.ctrl.kind === 'cpu' && o.state !== 'bin' && o.state !== 'frozen' && o.state !== 'fight');
      if (!cpuMates.length) continue;
      const nearest = () => cpuMates.slice().sort((a, b) => U.dist(a, pk) - U.dist(b, pk))[0];
      let to = null;
      const wantSwitch = s.intent.press.switch || (s.intent.press.pass && pk.owner !== s && !(pk.owner && pk.owner.team === s.team));
      if (wantSwitch) to = nearest();
      else if (pk.passTo && pk.passTo.team === hu.team && pk.passTo.ctrl.kind === 'cpu' && pk.passFrom === s) to = pk.passTo;
      else if (s.state === 'bin' || s.state === 'frozen') to = nearest();
      else if (!st.cfg.noAutoSwitch && hu.switchT <= 0 && pk.owner !== s && !(pk.owner && pk.owner.team === hu.team) && st.phase === 'play' && s.state !== 'fight') {
        const n = nearest(); if (n && U.dist(n, pk) + 50 < U.dist(s, pk) && U.dist(s, pk) > 70) to = n;
      }
      if (pk.owner && pk.owner.team === hu.team && pk.owner.ctrl.kind === 'cpu' && st.phase === 'play' && hu.switchT <= 0 && !wantSwitch && st.cfg.followCarrier) to = pk.owner;
      if (to && to !== s) swap(st, hu, to);
    }
  }
  function swap(st, hu, to) {
    const s = hu.skater; to.ctrl = s.ctrl; s.ctrl = { kind: 'cpu' }; s.ai.thinkT = 0; hu.skater = to; hu.switchT = .6;
    to.intent.held.shoot = false; to.charging = false;
    Bus.emit('switch', { human: hu.id, to: to.id });
  }

  /* ---- phases ---- */
  function placeFaceoff(st, dotKey) {
    const [dx, dy] = Rink.DOTS[dotKey] || Rink.DOTS.center, pk = st.puck;
    Object.assign(pk, Puck.make(), { x: dx, y: dy, z: 22 });
    for (const team of st.teams) {
      const dir = st.attackDir(team.t), list = team.skaters.filter(s => s.state !== 'bin');
      const c = list.find(s => s.def.pos === 'C') || list[0], rest = list.filter(s => s !== c), side = dy < Rink.C.y ? 1 : -1;
      const spots = [[dx - dir * 11, dy], [dx - dir * 26, dy + side * 38], [dx - dir * 82, dy - side * 10]];
      const order = [c, ...rest.sort((a, b) => (a.def.pos === 'D') - (b.def.pos === 'D'))];
      order.forEach((s, i) => { const p = spots[i] || spots[2]; const w = Rink.wall(p[0], p[1]); let x = p[0], y = p[1]; if (w.d < 14) { x += w.nx * (14 - w.d); y += w.ny * (14 - w.d); } s.x = x; s.y = y; s.vx = s.vy = 0; s.facing = dir > 0 ? 0 : PI; s.stopT = 0; if (s.state !== 'fight' && s.state !== 'bin') Skater.setState(s, i === 0 ? 'faceoff' : 'skate'); s.charging = false; s.charge = 0; s.items.tape = s.items.tape || 0; });
      team.center = c;
      // a lone human takes the center for the draw
      const hu = st.humans.find(h => h.team === team.t);
      if (hu && st.humans.filter(h => h.team === team.t).length === 1 && hu.skater !== c && c.ctrl.kind === 'cpu') swap(st, hu, c);
    }
    for (const g of st.goalies) { const n = st.defNet(g.team), gx = Rink.goalX(n); g.x = gx - Rink.intoNet(n) * 12; g.y = Rink.C.y; g.state = 'ready'; g.threat = null; }
    const ref = st.refs[0]; ref.x = dx; ref.y = dy + 16; ref.facing = -PI / 2; ref.down = 0;
    const ln = st.refs[1]; ln.x = clamp(dx + 120, Rink.X0 + 60, Rink.X1 - 60); ln.y = Rink.Y0 + 24;
    st.faceoff = { dot: dotKey, t: 0, drop: .6 + RNG.sim() * .6, pressed: [null, null], early: [false, false], dropped: false, cpuT: [0, 1].map(t => lerp(.32, .07, st.aiSkill(t)) + RNG.sim() * .12), done: false };
    st.setPhase('faceoff');
    Bus.emit('faceoff', { dot: dotKey });
  }
  function faceoffStep(st, dt) {
    const F = st.faceoff, pk = st.puck; F.t += dt;
    for (const team of st.teams) {
      const c = team.center; if (!c) continue; const t = team.t;
      const pressed = c.ctrl.kind === 'cpu' ? (F.dropped && F.t - F.drop >= F.cpuT[t]) : (c.intent.press.pass || c.intent.press.shoot);
      if (pressed && F.pressed[t] === null) { if (!F.dropped) F.early[t] = true; else F.pressed[t] = F.t - F.drop; }
    }
    if (!F.dropped && F.t >= F.drop) { F.dropped = true; pk.z = 6; pk.vz = -40; Bus.emit('faceoff_drop', {}); }
    if (F.dropped) {
      const ok = t => F.pressed[t] !== null && !F.early[t];
      const a = ok(0) ? F.pressed[0] : 9, b = ok(1) ? F.pressed[1] : 9, late = F.t - F.drop > .8;
      if (a < 9 || b < 9 || late) {
        let w = a < b ? 0 : b < a ? 1 : RNG.sim() < .5 ? 0 : 1; if (a === 9 && b === 9) w = RNG.sim() < .5 ? 0 : 1;
        const winner = st.teams[w], c = winner.center, mate = winner.skaters.filter(s => s !== c && s.state !== 'bin').sort((p, q) => (p.x - q.x) * st.attackDir(w))[0] || c;
        winner.faceoffs++; st.stats.faceoffs[w]++;
        Object.assign(pk, { z: 0, vz: 0, owner: null, last: c });
        const ang = Math.atan2(mate.y - pk.y, mate.x - pk.x); pk.vx = Math.cos(ang) * 190; pk.vy = Math.sin(ang) * 190; pk.passTo = mate; pk.passFrom = c; pk.passKind = 'pass'; pk.passT = st.t;
        for (const team of st.teams) if (team.center && team.center.state === 'faceoff') { Skater.setState(team.center, 'skate'); team.center.pickupCD = .2; }
        Bus.emit('faceoff_won', { team: w, by: c.id });
        st.setPhase('play');
      }
    }
  }
  function stoppage(st, why, dot) {
    if (st.phase === 'final' || st.phase === 'stoppage') return;
    st.stopWhy = why; st.stopDot = dot || 'center';
    Puck.loose(st, st.puck);
    st.setPhase('stoppage');
    // the referee collects the octopi; the hats are swept; techs fix the glass
    const oct = st.items.filter(i => i.kind === 'octopus'); if (oct.length) Bus.emit('octopus_cleared', { n: oct.length });
    st.items = st.items.filter(i => i.kind !== 'octopus' && i.kind !== 'hat');
    for (const p of Rink.panels) if (p.state === 'shattered') { p.fixT = 1.5; }
    Bus.emit('stoppage', { why, dot: st.stopDot });
    Replay.atStoppage(st);
  }
  function freeze(g) { if (!m) return; const side = g.y < Rink.C.y ? 'n' : 's', n = m.defNet(g.team); stoppage(m, 'freeze', (n ? 'e' : 'w') + side); }

  /* ---- goals ---- */
  function goal(net, pk) {
    const st = m; if (!st || st.phase !== 'play' && st.phase !== 'shootout') return;
    const team = st.teams.findIndex((tm, t) => st.attackNet(t) === net), g = st.goalieAt(net);
    // Lemmy talks to his posts: one goal in five near a post rings off it instead
    if (g && g.def.trait === 'posts' && Math.abs(Math.abs(pk.y - Rink.C.y) - Rink.MOUTH) < 4 && RNG.sim() < .2) {
      pk.inNet = -1; pk.vx = -pk.vx * .7; pk.x = Rink.goalX(net) - Rink.intoNet(net) * 3; Bus.emit('post', { by: pk.last ? pk.last.id : -1, bar: false, net, x: pk.x, y: pk.y, pipes: true }); return;
    }
    if (st.phase === 'shootout') { soGoal(st, team); return; }
    const touches = (pk.touches || []).filter(s => s.team === team);
    let scorer = pk.last && pk.last.team === team ? pk.last : touches[touches.length - 1] || null;
    const assists = touches.filter(s => s !== scorer).slice(-2).reverse();
    const kind = pk.shot && pk.shot.by === (scorer && scorer.id) ? pk.shot.kind : pk.onFire ? 'kaboom' : pk.last && pk.last.team !== team ? 'own' : 'scramble';
    const ppg = SinBin.short(st) === 1 - team;
    st.teams[team].score++;
    if (scorer) scorer.stats.goals++; for (const a of assists) a.stats.assists++;
    if (ppg) st.teams[team].ppGoals++;
    if (g) g.stats.ga = (g.stats.ga || 0) + 1;
    st.goals.push({ team, by: scorer ? scorer.id : -1, assists: assists.map(a => a.id), kind, period: st.period, clock: st.clock, ppg });
    Rink.NETS[net].light = 3; if (kind === 'kaboom') Rink.NETS[net].tip = 1;
    st.scoredBy = team; st.lastGoal = st.goals[st.goals.length - 1];
    Bus.emit('goal', { team, by: scorer ? scorer.id : -1, assists: assists.map(a => a.id), kind, ppg, net, x: pk.x, y: pk.y, ot: st.ot, speed: pk.shot ? pk.shot.speed : 0 });
    if (scorer && scorer.stats.goals === 3) Bus.emit('hat_trick', { by: scorer.id, team });
    for (const s of [scorer, ...assists]) hoserCheck(s);
    // the celebration
    for (const s of st.teams[team].skaters) if (s.state !== 'bin') { Skater.setState(s, 'celebrate', 3); s.celeb = s === scorer ? s.def.celeb || 'pump' : 'pump'; const a = U.angTo(s, scorer || pk); s.celebDir = s === scorer ? [Math.cos(s.facing), Math.sin(s.facing)] : [Math.cos(a), Math.sin(a)]; }
    st.setPhase('goal');
    if (st.ot) st.otWin = team;
  }

  /** the Hoser Hat Trick: one player with a goal, an assist and a fight win in one game (checked on goals and fights) */
  function hoserCheck(s) { if (s && s.stats && s.stats.goals >= 1 && s.stats.assists >= 1 && s.stats.fightsWon >= 1 && !s.hoser) { s.hoser = true; Bus.emit('hoser_hat_trick', { by: s.id, team: s.team }); } }
  /* ---- the shootout (3 rounds each, then sudden death) ---- */
  function soStart(st) {
    st.so = { round: 1, turn: 0, marks: [[], []], shooters: [0, 0], att: null, done: false };
    st.setPhase('so_card', 2.2); Bus.emit('shootout_start', {});
  }
  function soSetup(st) {
    const S2 = st.so, t = S2.turn, team = st.teams[t], sh = team.skaters[S2.shooters[t] % team.skaters.length]; S2.shooters[t]++;
    const dir = st.attackDir(t);
    for (const s of st.skaters) { s.vx = s.vy = 0; Skater.setState(s, 'skate'); s.x = Rink.C.x + (s.team ? 60 : -60) + s.slot * 18; s.y = Rink.Y0 + 12; s.facing = PI / 2; s.offIce = true; }
    sh.offIce = false; sh.x = Rink.C.x - dir * 20; sh.y = Rink.C.y; sh.facing = dir > 0 ? 0 : PI; sh.ai.plan = null; sh.ai.deked = false; sh.ai.shootT = 0;
    Object.assign(st.puck, Puck.make()); Puck.setOwner(st, st.puck, sh, 'so');
    const g = st.goalieAt(st.attackNet(t)); g.manual = !!st.humans.find(h => h.team === g.team) && !st.humans.find(h => h.team === t && false); g.tY = Rink.C.y; g.tOut = 12; g.state = 'ready';
    const n = st.attackNet(t); g.x = Rink.goalX(n) - Rink.intoNet(n) * 12; g.y = Rink.C.y;
    // the human shoots for their team (the skaters rotate)
    for (const hu of st.humans) if (hu.team === t && hu.skater !== sh) { const was = hu.skater; sh.ctrl = was.ctrl; was.ctrl = { kind: 'cpu' }; hu.skater = sh; }
    S2.att = { shooter: sh.id, team: t, t: 0, res: null, goalie: g.id };
    st.setPhase('shootout');
    Bus.emit('shootout_attempt_start', { by: sh.id, team: t });
  }
  function soStep(st, dt) {
    const S2 = st.so, A2 = S2.att, pk = st.puck, sh = st.byId(A2.shooter), dir = st.attackDir(A2.team), g = st.byId(A2.goalie);
    A2.t += dt;
    if (sh.ctrl.kind === 'cpu') AI.shooter(st, sh, dt);
    if (g.manual) { const hu = st.humans.find(h => h.team === g.team); if (hu && hu.input) { const I = hu.input, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]); g.intent = { mx: d[0], my: d[1] };
      if (I.pressed('pass') && g.state === 'ready') { g.state = 'butterfly'; g.stateT = .7; } if (I.pressed('shoot') && g.state === 'ready') { g.state = 'poke'; g.stateT = .35; if (pk.owner && Math.hypot(pk.owner.x - g.x, pk.owner.y - g.y) < 26) { Puck.loose(st, pk); pk.vx = -dir * 150; pk.vy = (RNG.sim() - .5) * 100; Bus.emit('poke', { by: g.id, ok: true, goalie: true }); } }
      if (I.pressed('deke') && g.state === 'ready') { g.state = 'stack'; g.stateT = 1; g.side = (d[1] >= 0 ? 1 : -1) * Rink.intoNet(st.attackNet(A2.team)) * -1; } } }
    const done = res => { if (A2.res) return; A2.res = res; S2.marks[A2.team].push(res === 'goal'); Bus.emit('shootout_attempt', { by: sh.id, team: A2.team, ok: res === 'goal', res }); st.setPhase('so_result', 1.6); };
    if (A2.res) return;
    if (A2.t > 8) return done('time');
    if (!pk.owner && pk.inNet < 0) {
      if (pk.vx * dir < -20 && A2.t > .8 && !pk.shot) return done('lost');
      if (Math.hypot(pk.vx, pk.vy) < 25 && A2.t > 1.5 && (!pk.shot || st.t - pk.shot.t > .6)) return done('save');
      if (pk.shot && st.t - pk.shot.t > 1.6) return done('miss');
    }
    if (pk.out) return done('miss');
  }
  function soGoal(st, team) { const A2 = st.so.att; if (!A2 || A2.res) return; A2.res = 'goal'; st.so.marks[team].push(true); st.teams[team].soGoals = (st.teams[team].soGoals || 0) + 1; Bus.emit('shootout_attempt', { by: A2.shooter, team, ok: true, res: 'goal' }); Bus.emit('goal', { team, by: A2.shooter, assists: [], kind: 'shootout', so: true, net: st.attackNet(team), x: st.puck.x, y: st.puck.y }); Rink.NETS[st.attackNet(team)].light = 2; st.setPhase('so_result', 2.2); }
  /** after each attempt: decided, or the next shooter */
  function soNext(st) {
    const S2 = st.so, a = S2.marks[0].filter(Boolean).length, b = S2.marks[1].filter(Boolean).length, na = S2.marks[0].length, nb = S2.marks[1].length;
    const left = (n) => Math.max(0, 3 - n);
    let w = -1;
    if (na <= 3 && nb <= 3) { if (a > b + left(nb)) w = 0; else if (b > a + left(na)) w = 1; else if (na === 3 && nb === 3 && a !== b) w = a > b ? 0 : 1; }
    else if (na === nb && a !== b) w = a > b ? 0 : 1;
    if (w >= 0) { S2.winner = w; S2.done = true; Bus.emit('shootout_end', { team: w, a, b }); for (const s of st.skaters) s.offIce = false; for (const g of st.goalies) g.manual = false; endGame(st, st.cfg.showcase && st.teams[0].score !== st.teams[1].score ? (st.teams[0].score > st.teams[1].score ? 0 : 1) : w, true); return; }
    S2.turn = 1 - S2.turn; if (S2.turn === 0) S2.round++;
    soSetup(st);
  }

  /* ---- periods, overtime, the final ---- */
  function periodEnd(st) {
    Bus.emit('period_end', { n: st.period, ot: st.ot });
    st.setPhase('periodEnd', 3);
    for (const s of st.skaters) if (s.state !== 'bin') { s.charging = false; }
  }
  function afterPeriod(st) {
    const tied = st.teams[0].score === st.teams[1].score;
    if (st.ot) { if (st.cfg.shootout && tied) return soStart(st); return endGame(st, tied ? -1 : st.teams[0].score > st.teams[1].score ? 0 : 1); }
    if (st.period < st.cfg.periods) { st.setPhase('intermission'); Bus.emit('intermission', { n: st.period }); return; }
    if (tied && st.cfg.ot !== 'none') { st.ot = true; st.period++; st.clock = st.cfg.otCap || st.cfg.otLen; resetIce(st); Bus.emit('ot_start', {}); placeFaceoff(st, 'center'); return; }
    if (st.cfg.showcase) return soStart(st);
    if (tied && st.cfg.shootout) return soStart(st);
    endGame(st, tied ? -1 : st.teams[0].score > st.teams[1].score ? 0 : 1);
  }
  /** the next period after the intermission (the scene calls it): ends switch, the clock resets */
  function nextPeriod(st) {
    st.period++; st.clock = st.cfg.periodLen; resetIce(st);
    for (const s of st.skaters) { s.turbo = 1; if (s.state !== 'bin') Skater.setState(s, 'skate'); }
    Bus.emit('period_start', { n: st.period });
    placeFaceoff(st, 'center');
  }
  function resetIce(st) { for (const p of st.ice || []) if (p.hole > 0) { p.hole = 0; p.hp = 60; } }
  function endGame(st, winner, fromSO) {
    if (st.phase === 'final' && st.ended) return;
    st.winner = winner; st.ended = true; st.setPhase('final', 4);
    for (const s of st.skaters) if (s.state !== 'bin') Skater.setState(s, winner === s.team ? 'celebrate' : 'skate', 99), s.celeb = 'pump';
    st.stars = threeStars(st);
    Bus.emit('final', { winner, score: [st.teams[0].score, st.teams[1].score], so: !!fromSO });
  }
  /** three stars: 3 G + 2 A + 0.5 big hits + 1.5 fights won + 0.3 shots; goalies 0.12 saves + 2 (save% - .85) 10 */
  function threeStars(st) {
    const list = st.skaters.map(s => ({ who: s, kind: 's', v: 3 * s.stats.goals + 2 * s.stats.assists + .5 * s.stats.bigHits + 1.5 * s.stats.fightsWon + .3 * s.stats.shots }))
      .concat(st.goalies.map(g => ({ who: g, kind: 'g', v: .12 * g.stats.saves + 2 * ((g.stats.saves + (g.stats.ga || 0) ? g.stats.saves / (g.stats.saves + (g.stats.ga || 0)) : .9) - .85) * 10 })));
    return list.sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.who.id);
  }

  /* ---- the step (5.4) ---- */
  function step(dt) {
    const st = m; if (!st) return;
    if (st.devPause && !Dev.live) return;
    if (Replay.on) {   // a replay plays: the world waits (any player's confirm or pass skips it)
      const skip = st.humans.some(h => h.kind === 'local' && h.input && (h.input.pressed('confirm') || h.input.pressed('pass')));
      Replay.step(st, dt, skip); if (!Replay.on && st.phase === 'replay') placeFaceoff(st, 'center');
      st.t += dt; return;
    }
    st.t += dt; st.phaseT -= dt;
    if (st.hitstop > 0) { st.hitstop -= dt; return; }
    // 1. intents
    for (const s of st.skaters) {
      if (s.ctrl.kind === 'human') humanIntent(st, s, s.ctrl.input);
      else if (s.ctrl.kind === 'remote') Net.intentFor(st, s);
      else if (st.phase !== 'shootout') AI.step(st, s, dt);
    }
    if (st.phase === 'play') { AI.roles(st, 0); AI.roles(st, 1); control(st, dt); }
    // 2. phase logic
    const ph = st.phase;
    if (ph === 'intro') { if (st.phaseT <= 0 || (st.intro && st.intro.skip)) placeFaceoff(st, 'center'); }
    else if (ph === 'faceoff') faceoffStep(st, dt);
    else if (ph === 'stoppage' && st.phaseT <= -1.5) placeFaceoff(st, st.stopDot);
    else if (ph === 'goal' && st.phaseT <= -3) { if (st.ot) { endGame(st, st.otWin); } else if (st.replayOk()) st.setPhase('replay'); else placeFaceoff(st, 'center'); }
    else if (ph === 'replay' && Replay.done()) placeFaceoff(st, 'center');
    else if (ph === 'periodEnd' && st.phaseT <= 0) afterPeriod(st);
    else if (ph === 'so_card' && st.phaseT <= 0) soSetup(st);
    else if (ph === 'so_result' && st.phaseT <= 0) soNext(st);
    else if (ph === 'shootout') soStep(st, dt);
    if (st.phase === 'fight') Fight.step(st, dt);
    if (st.puck.out && st.phase === 'play' && !st.noPuck) { st.puck.out = false; stoppage(st, 'out', Rink.nearestDot(st.puck.x, st.puck.y, true)); }
    // 3-4. actions and skating, bodies, boards
    for (const s of st.skaters) { if (s.offIce) continue; Skater.step(st, s, dt); }
    if (st.phase !== 'fight') Hits.contacts(st, dt);
    for (const s of st.skaters) { if (s.offIce || s.state === 'bin') continue; Hits.boards(st, s); Rink.netPush(s, 7); }
    // 5-6. the puck and the goalies
    Puck.step(st, dt);
    for (const g of st.goalies) Goalie.update(st, g, dt);
    // 7-9. items, hazards, BOOM, the sin bin, fights watched, grudges
    Items.step(st, dt); Items.extrasStep(st, dt); Boom.step(st, dt); SinBin.step(st, dt); Fight.watch(st, dt); Grudge.step(st, dt);
    refsStep(st, dt);
    for (const p of Rink.panels) { p.shake = Math.max(0, p.shake - dt * 2); if (p.fixT > 0 && st.phase !== 'play') { p.fixT -= dt; if (p.fixT <= 0) { p.state = 'ok'; Bus.emit('glass_fixed', { panel: p.i }); } } }
    for (const n of Rink.NETS) { n.bv += (-18 * n.bulge - 3 * n.bv) * dt; n.bulge += n.bv * dt * 4; n.light = Math.max(0, n.light - dt); n.tip = Math.max(0, n.tip - dt * .5); }
    // the boss's scripted moments and the story's timed events
    for (const ev of st.cfg.events || []) if (!ev.done && st.period >= ev.period && (ev.clock === undefined || st.clock <= ev.clock) && (st.phase === 'play' || st.phase === 'faceoff')) { ev.done = true; Story.matchEvent(st, ev); }
    if (st.organOn > 0) { st.organOn -= dt; if (st.organOn <= 0) for (const s of st.teams[0].skaters) s.boost = st.boostOn && st.teams[0].id === 'grizzlies' ? 1.1 : 1; }
    // 10. the clock
    if (st.phase === 'play' && st.rules.clock) {
      st.clock -= dt;
      if (st.clock <= 0) { st.clock = 0; if (st.ot && st.cfg.otCap) { endGame(st, st.teams[0].score === st.teams[1].score ? -1 : st.teams[0].score > st.teams[1].score ? 0 : 1); } else periodEnd(st); }
    }
    // 12-14. consumers, the replay recorder, the rigs
    for (const s of st.skaters) Skater.pose(st, s, dt);
    for (const b of st.bench) { for (const r of b.spares) { r.hk.stick = { act: 'idle' }; r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: 'kneel' }); } if (b.coach) b.coach.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: st.phase === 'goal' ? 'cheer' : Math.floor(st.t / 4) % 3 === 0 ? 'hips' : Math.floor(st.t / 4) % 3 === 1 ? 'wave' : null }); }
    Replay.record(st);
  }
  function refsStep(st, dt) {
    const pk = st.puck;
    for (const r of st.refs) {
      if (r.down > 0) { r.down -= dt; r.x += r.vx * dt; r.y += r.vy * dt; r.vx *= Math.exp(-2 * dt); r.vy *= Math.exp(-2 * dt); }
      else if (st.phase === 'play' || st.phase === 'stoppage') {
        const tx = r.linesman ? clamp(pk.x + 140, Rink.X0 + 80, Rink.X1 - 80) : clamp(pk.x - 90 * Math.sign(pk.x - Rink.C.x || 1), Rink.X0 + 80, Rink.X1 - 80), ty = r.linesman ? Rink.Y0 + 26 : Rink.Y1 - 30;
        const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy), sp = Math.min(150, d * 2); r.vx = d > 2 ? dx / d * sp : 0; r.vy = d > 2 ? dy / d * sp : 0; r.x += r.vx * dt; r.y += r.vy * dt; if (sp > 10) r.facing = E.approachAng(r.facing, Math.atan2(r.vy, r.vx), 8 * dt);
      } else if (st.phase === 'fight' && st.fight) { const F = st.fight, a = r.linesman ? 1 : -1; r.x = approach(r.x, F.x + a * 34, 80 * dt); r.y = approach(r.y, F.y + 18, 80 * dt); r.facing = U.angTo(r, F); }
      Rink.clampBody(r, 7);
      const hk = r.rig.hk, sp = Math.hypot(r.vx, r.vy); hk.ph = (hk.ph || 0) + dt * sp / 22; hk.push = clamp(sp / 90, 0, 1); hk.crouch = st.phase === 'faceoff' && !r.linesman ? .35 : .15;
      r.arm = st.phase === 'faceoff' && !r.linesman && st.faceoff && !st.faceoff.dropped ? 1 : Math.max(0, r.arm - dt * 4);
      r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: 0, vy: 0, facing: r.facing, down: r.down > 0 ? Math.min(1, (3 - r.down) * 3) : 0, pose: st.octoTwirl > 0 && !r.linesman ? 'cheer' : null });
      if (r.arm > 0) { const J = r.rig.J, o = r.rig.o, hand = E.V3.add(J.shC, [1.5, 1.5, o.armUpper + o.armLower - 1.5]); const [el, h2] = E.ik3(J.shR, E.V3.lerp(J.handR, hand, r.arm), o.armUpper, o.armLower, [-1, .7, -.2]); J.elbowR = el; J.handR = h2; }
    }
    st.octoTwirl = Math.max(0, (st.octoTwirl || 0) - dt);
  }

  /* ---- the pause menu's items ---- */
  function showInfo() {
    if (!m) { game.note('NO GAME ON'); return; }
    const c = m.cfg, lines = [];
    lines.push(TEAMS[c.home].name + ' vs ' + TEAMS[c.away].name + ' at ' + m.arena.name);
    if (c.objectives.length) for (const o of c.objectives) lines.push((m.objDone[o.id] ? '★ ' : '☆ ') + o.text);
    else lines.push(c.periods + ' periods of ' + U.mmss(c.periodLen) + ', difficulty ' + c.difficulty.toUpperCase());
    if (game.shell && game.shell.toast) game.shell.toast('OBJECTIVES & INFO', lines.join('\n'), 6); else game.note(lines[0]);
  }
  function restart() { if (!m) return; const cfg = Object.assign({}, m.cfg, { seed: (m.cfg.seed + 1) | 0, events: (m.cfg.events || []).map(e => Object.assign({}, e, { done: false })) }); game.resume && game.resume(); game.go(m.cfg.mode === 'drill' ? 'practice' : 'match', m.cfg.mode === 'drill' ? { drill: m.cfg.drill } : { cfg }, { fade: 'wipe' }); }
  return { hoserCheck, create, step, goal, freeze, stoppage, placeFaceoff, nextPeriod, endGame, threeStars, showInfo, restart, swap, addHuman, soStart, humanIntent, DIFF, DIFF_ORDER,
    get m() { return m; }, set m(v) { m = v; }, blankStats, afterPeriod };
})();

/* ---- OBJECTIVES (7.14): declarative counters per chapter, checked live; a star toast when one is met ---- */
const Objectives = (() => {
  const WIN = { id: 'win', text: 'Win the game', on: 'final', where: (e, m) => e.winner === 0 && m.teams[0].human, need: 1 };
  /** the objective kinds a chapter names: [id, text, event, predicate, need] */
  const KINDS = {
    win: WIN,
    onetimer: { id: 'onetimer', text: 'Score a one-timer', on: 'goal', where: (e, m) => e.team === 0 && e.kind === 'onetimer', need: 1 },
    bighits3: { id: 'bighits3', text: 'Land 3 big hits', on: 'hit', where: (e, m) => e.big && e.team === 0, need: 3 },
    breakice: { id: 'breakice', text: 'Break the ice under a Lumberjack', on: 'thin_ice_break', where: (e, m) => e.victimTeam === 1, need: 1 },
    kaboom: { id: 'kaboom', text: 'Trigger KABOOM', on: 'kaboom_start', where: (e, m) => e.team === 0, need: 1 },
    fights2: { id: 'fights2', text: 'Win 2 fights', on: 'fight_end', where: (e, m) => !e.draw && m.byId(e.winner) && m.byId(e.winner).team === 0, need: 2 },
    ppg: { id: 'ppg', text: 'Score a power-play goal', on: 'goal', where: (e, m) => e.team === 0 && e.ppg, need: 1 },
    kaboomgoal: { id: 'kaboomgoal', text: 'Score a KABOOM goal', on: 'goal', where: (e, m) => e.team === 0 && e.kind === 'kaboom', need: 1 },
    pete: { id: 'pete', text: 'Knock down Polar Pete', on: 'mascot_down', where: (e, m) => e.team === 0, need: 1 },
    vaultdeke: { id: 'vaultdeke', text: 'Beat The Vault with a deke goal', on: 'goal', where: (e, m) => e.team === 0 && (e.kind === 'deke' || Objectives.dekeGoal(m, e)), need: 1 },
    hattrick: { id: 'hattrick', text: 'One player scores a hat trick', on: 'hat_trick', where: (e, m) => e.team === 0, need: 1 }
  };
  const list = ids => ids.map(id => KINDS[id]);
  /** a deke goal: the scorer deked within 1.2 s before the shot */
  const dekeGoal = (m, e) => { const s = m.byId(e.by); return !!(s && s.dekeAt !== undefined && m.t - s.dekeAt < 1.6); };
  let wired = false;
  function wire() {
    if (wired) return; wired = true;
    Bus.sim('*', e => {
      const m = Match.m; if (!m || !m.cfg.objectives.length) return;
      for (const o of m.cfg.objectives) if (!m.objDone[o.id] && o.on === e.type) { let ok = false; try { ok = o.where(e, m); } catch (err) { ok = false; } if (ok) { m.obj[o.id] = (m.obj[o.id] || 0) + 1; if (m.obj[o.id] >= o.need) { m.objDone[o.id] = true; Bus.emit('objective', { id: o.id, text: o.text }); } } }
    });
  }
  return { KINDS, list, wire, dekeGoal };
})();

/* ---- 27-hits.js ---- */
/* ---- HITS (7.7): bodies push apart; a check that meets a rival lands an impulse by closing speed, mass, the Hit rating,
 * turbo, KABOOM and Poutine: a bump, a check, or a BIG HIT that knocks them down into a belly slide; bodies into the boards
 * crack and shatter the glass; the referee and the mascot fall over too ---- */
const Hits = (() => {
  const mass = s => s.def.build === 'bulky' ? 1.35 : 1;
  function contacts(m, dt) {
    const all = m.skaters.filter(s => s.state !== 'bin' && s.state !== 'frozen' && !s.offIce);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j]; if (a.state === 'fight' || b.state === 'fight') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = 14; if (d >= R + (a.state === 'check' || b.state === 'check' ? 4 : 0) || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d;
      // a check lands
      for (const [att, tgt, sgn] of [[a, b, 1], [b, a, -1]]) {
        if (att.state !== 'check' || att.team === tgt.team || att.hitDone[tgt.id]) continue;
        att.hitDone[tgt.id] = true; land(m, att, tgt, nx * sgn, ny * sgn);
      }
      if (d >= R) continue;
      // push apart (restitution .3)
      const ma = mass(a), mb = mass(b), pen = R - d, ka = mb / (ma + mb), kb = ma / (ma + mb);
      a.x -= nx * pen * ka; a.y -= ny * pen * ka; b.x += nx * pen * kb; b.y += ny * pen * kb;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const jn = -(1.3) * rv / (1 / ma + 1 / mb); a.vx -= jn / ma * nx; a.vy -= jn / ma * ny; b.vx += jn / mb * nx; b.vy += jn / mb * ny;
        if (-rv > T.accidentalHit && a.team !== b.team && Skater.free(a) && Skater.free(b)) { const v = mass(a) * Math.hypot(a.vx, a.vy) > mass(b) * Math.hypot(b.vx, b.vy) ? b : a; knock(m, v, Math.atan2(v.y - (v === a ? b : a).y, v.x - (v === a ? b : a).x), -rv * .6, null); } }
    }
    // the referee and the mascot are bodies too
    for (const o of m.extras) {
      if (!o.body || o.down > 0) continue;
      for (const s of m.skaters) {
        const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy); if (d >= 16 || d < 1e-6) continue;
        const sp = Math.hypot(s.vx, s.vy);
        if ((s.state === 'check' && !s.hitDone[o.id]) || sp > 170) { if (s.hitDone) s.hitDone[o.id] = true; o.down = 3; o.vx = dx / d * sp * .8; o.vy = dy / d * sp * .8; Bus.emit(o.kind === 'pete' ? 'mascot_down' : 'ref_down', { by: s.id, team: s.team, x: o.x, y: o.y }); continue; }
        s.x -= dx / d * (16 - d) * .6; s.y -= dy / d * (16 - d) * .6; o.x += dx / d * (16 - d) * .4; o.y += dy / d * (16 - d) * .4;
      }
    }
  }
  /** a check meeting its target: the impulse and what it does */
  function land(m, att, tgt, nx, ny) {
    if (tgt.state === 'deke' && tgt.stateT > .15 && RNG.sim() < .7 + .04 * (tgt.def.r[5] - 3)) { Bus.emit('deke_dodge', { by: tgt.id, att: att.id }); return; }
    const closing = Math.max(0, (att.vx - tgt.vx) * nx + (att.vy - tgt.vy) * ny);
    let imp = T.checkPower * (closing + 60) * (mass(att) / mass(tgt)) * RATE.hit(att.def) * (att.turboOn ? 1.45 : 1) * (m.kaboom[att.team] > 0 ? 2 : 1) * (att.items.poutine > 0 ? 1.6 : 1);
    if (att.items.poutine > 0) imp = Math.max(imp, T.knockdown + 1);
    if (tgt.twistT > 0) { imp = Math.max(imp, T.knockdown + 20); Boom.add(m, att.team, 10); }
    const carrier = m.puck.owner === tgt, ang = Math.atan2(ny, nx);
    att.stats.hits++; m.teams[att.team].hits++;
    if (imp < 90) {
      Skater.setState(tgt, 'stun', .25); tgt.vx += nx * imp * .6; tgt.vy += ny * imp * .6;
      if (carrier && (tgt.items.tape > 0 ? false : RNG.sim() < .5)) { Puck.loose(m, m.puck); m.puck.vx = tgt.vx + nx * 60; m.puck.vy = tgt.vy + ny * 60; }
      Grudge.add(m, tgt, att, 5);
      Bus.emit('hit', { by: att.id, victim: tgt.id, power: Math.round(imp), big: false, kind: 'bump', x: tgt.x, y: tgt.y, team: att.team });
    } else if (imp < T.knockdown || tgt.items.poutine > 0 || (m.cheats.god && tgt.ctrl.kind === 'human')) {
      Skater.setState(tgt, 'stun', .5); tgt.vx += nx * imp * .8; tgt.vy += ny * imp * .8;
      if (carrier && !(tgt.items.tape > 0)) { Puck.loose(m, m.puck); m.puck.vx = tgt.vx + nx * 80; m.puck.vy = tgt.vy + ny * 80; }
      Grudge.add(m, tgt, att, 10);
      Bus.emit('hit', { by: att.id, victim: tgt.id, power: Math.round(imp), big: false, kind: 'check', x: tgt.x, y: tgt.y, team: att.team });
    } else {
      att.stats.bigHits++;
      knock(m, tgt, ang, imp, att);
      Grudge.add(m, tgt, att, 35);
      for (const mate of m.teams[tgt.team].skaters) if (mate !== tgt) Grudge.add(m, mate, att, 10);
      Bus.emit('hit', { by: att.id, victim: tgt.id, power: Math.round(imp), big: true, kind: 'big', x: tgt.x, y: tgt.y, team: att.team, kaboom: m.kaboom[att.team] > 0 });
      m.hitstop = .07;
      Items.thinIceHit(m, tgt, true);
    }
  }
  /** knocked down: a tumble, then a belly slide along the hit, then up */
  function knock(m, s, ang, power, by) {
    if (s.state === 'bin' || s.state === 'fight') return;
    if (m.cheats.god && s.ctrl.kind === 'human') { Skater.setState(s, 'stun', .4); return; }
    if (m.puck.owner === s) { Puck.loose(m, m.puck); m.puck.vx = Math.cos(ang) * 120; m.puck.vy = Math.sin(ang) * 120; }
    Skater.setState(s, 'down', 1.4); s.vx = Math.cos(ang) * power * .8; s.vy = Math.sin(ang) * power * .8; s.slideHit = true; s.downBy = by ? by.id : -1;
    Rink.addScuff(s.x, s.y, .2, 1);
    Bus.emit('knockdown', { victim: s.id, by: by ? by.id : -1, x: s.x, y: s.y });
    Items.thinIceHit(m, s, false);
  }
  /** a skater against the boards: the rattle, the glass breaking, snowbanks burying */
  function boards(m, s) {
    const hit = Rink.clampBody(s, 7, s.state === 'down' ? .25 : .3, .85); if (!hit) return;
    const n = Rink.clampBody.n;
    if (hit > 120) Bus.emit('rattle', { x: s.x, y: s.y, speed: Math.round(hit), by: s.id });
    if (m.arena.snowbanks) { if ((s.state === 'down' || s.slideHit) && hit > 140) { Skater.setState(s, 'buried', 1.5); Bus.emit('buried', { victim: s.id, x: s.x, y: s.y }); } s.slideHit = false; return; }
    if ((s.state === 'down' || s.state === 'stun' || s.slideHit) && hit > T.glassCrack) {
      const p = Rink.panelAt(s.x - n.nx * 8, s.y - n.ny * 8); if (p) glass(m, p, hit, s);
    }
    s.slideHit = false;
  }
  function glass(m, p, speed, by) {
    if (!p || p.state === 'shattered' || m.arena.snowbanks) return;
    const was = p.state;
    if (was === 'cracked' || speed > T.glassShatter) { p.state = 'shattered'; p.fixT = 0; Bus.emit('glass', { panel: p.i, state: 'shattered', x: p.mx, y: p.my, by: by ? by.id : -1, team: by ? 1 - by.team : -1 }); }
    else { p.state = 'cracked'; Bus.emit('glass', { panel: p.i, state: 'cracked', x: p.mx, y: p.my, by: by ? by.id : -1, team: by ? 1 - by.team : -1 }); }
    p.shake = .6;
  }
  return { contacts, land, knock, boards, glass, mass };
})();

/* ---- BOOM and KABOOM (7.10): a meter per team; at 100 the team goes KABOOM for 15 s or until the other team scores ---- */
const Boom = (() => {
  const GAIN = { bigHit: 12, check: 3, crack: 6, shatter: 12, fightWin: 45, fightLoss: 5, goal: 15, shotOnGoal: 2, save: 2, pass: 1, onetimer: 6, dekeBeat: 6, chirp: 3, boombox: 40, mascot: 10, flood: 30, organ: 30, turtleWin: 10, turtleLose: -10, draw: 10 };
  function add(m, team, n) {
    if (team < 0 || team > 1 || m.kaboom[team] > 0 || !m.rules.boom) return;
    const k = n > 0 ? T.boomGain * (m.teams[team].tactic === 'grit' ? 1.15 : 1) : 1;
    m.boom[team] = clamp(m.boom[team] + n * k, 0, 100);
    if (m.boom[team] >= 100) start(m, team);
  }
  function start(m, team) {
    if (m.kaboom[team] > 0) return;
    m.boom[team] = 0; m.kaboom[team] = T.kaboomTime; m.teams[team].kabooms++;
    Bus.emit('kaboom_start', { team, gilded: m.teams[team].id === 'grizzlies' });
  }
  function end(m, team, why) { if (m.kaboom[team] <= 0) return; m.kaboom[team] = 0; Bus.emit('kaboom_end', { team, why }); }
  function step(m, dt) {
    for (const t of [0, 1]) {
      if (m.kaboom[t] > 0) { m.kaboom[t] -= dt; if (m.kaboom[t] <= 0) { m.kaboom[t] = .001; end(m, t, 'time'); } }
      if (m.cheats.alwaysKaboom && m.teams[t].human && m.kaboom[t] <= 0 && m.phase === 'play') start(m, t);
    }
  }
  /** the gains, from the rules' events */
  function wire() {
    const G = (e) => Match.m;
    Bus.sim('hit', e => { const m = G(); if (!m) return; add(m, e.team, e.big ? GAIN.bigHit : e.kind === 'check' ? GAIN.check : 0); });
    Bus.sim('glass', e => { const m = G(); if (m && e.team >= 0) add(m, 1 - e.team, e.state === 'shattered' ? GAIN.shatter : GAIN.crack); });
    Bus.sim('goal', e => { const m = G(); if (!m) return; add(m, e.team, GAIN.goal); end(m, 1 - e.team, 'scored'); });
    Bus.sim('shot', e => { const m = G(); if (m && e.onGoal) add(m, e.team, GAIN.shotOnGoal); });
    Bus.sim('save', e => { const m = G(); if (m) add(m, e.team, GAIN.save); });
    Bus.sim('pass_complete', e => { const m = G(); if (m) add(m, e.team, GAIN.pass); });
    Bus.sim('onetimer', e => { const m = G(); if (m) add(m, e.team, GAIN.onetimer); });
    Bus.sim('deke_beat', e => { const m = G(); if (m) add(m, e.team, GAIN.dekeBeat); });
    Bus.sim('chirp', e => { const m = G(); if (m) add(m, m.byId(e.by).team, GAIN.chirp); });
    Bus.sim('mascot_down', e => { const m = G(); if (m) add(m, e.team, GAIN.mascot); });
    Bus.sim('fight_end', e => { const m = G(); if (!m) return; if (e.draw) { add(m, 0, GAIN.draw); add(m, 1, GAIN.draw); } else { add(m, m.byId(e.winner).team, GAIN.fightWin); add(m, m.byId(e.loser).team, GAIN.fightLoss); } });
    Bus.sim('turtle', e => { const m = G(); if (!m) return; const s = m.byId(e.by); add(m, s.team, GAIN.turtleLose); add(m, 1 - s.team, GAIN.turtleWin); });
  }
  return { add, start, end, step, wire, GAIN };
})();

/* ---- ITEMS and HAZARDS (7.12): fans throw goodies (and octopi) over the glass; arena hazards: thin ice, the rubber rat,
 * hats after a hat trick, Polar Pete, the Discount Drop ---- */
const Items = (() => {
  function make(kind, x, y) { return { kind, x, y, z: 0, vx: 0, vy: 0, vz: 0, t: 12, id: Math.floor(RNG.sim() * 1e9) }; }
  /** a fan's throw: a lob from the stands onto the neutral or attacking zone */
  function toss(m, kind, from) {
    const fx = from ? from[0] : Rink.C.x + (RNG.sim() - .5) * 600, fy = from ? from[1] : Rink.Y0 - 30;
    const tx = Rink.C.x + (RNG.sim() - .5) * 500, ty = Rink.C.y + (RNG.sim() - .5) * 260;
    const it = make(kind, fx, fy); if (kind === 'octopus') it.t = 999; it.z = 40; const t = .9; it.vx = (tx - fx) / t; it.vy = (ty - fy) / t; it.vz = (0 - 40 + 350 * t * t) / t; it.air = true;
    m.items.push(it); Bus.emit('item_throw', { kind, x: tx, y: ty });
    return it;
  }
  function pickKind(m) { const pool = m.arena.items; return pool[Math.floor(RNG.sim() * pool.length)]; }
  function step(m, dt) {
    if (!m.rules.items) return;
    // throws: every itemEvery seconds of play on average
    if (m.phase === 'play') {
      m.itemT -= dt;
      if (m.itemT <= 0) { m.itemT = T.itemEvery * (.7 + RNG.sim() * .6); toss(m, pickKind(m)); }
      if (m.cheats.octoRain && RNG.sim() < dt * .35) toss(m, 'octopus');
      if (m.arena.hazards.includes('drop')) { m.dropT -= dt; if (m.dropT <= 0) { m.dropT = 40; m.extras.push({ kind: 'crate', x: Rink.C.x, y: Rink.C.y, z: 120, vz: 0, body: false, t: 0 }); Bus.emit('drop_start', {}); } }
      if (m.arena.hazards.includes('rat') && !m.items.some(i => i.kind === 'rat') && RNG.sim() < dt / 50) { const r = toss(m, 'rat'); r.t = 10; }
    }
    for (const it of m.items) {
      if (it.air) { it.vz -= 700 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; if (it.z <= 0) { it.z = 0; it.air = false; it.vx *= .4; it.vy *= .4; Bus.emit('item_land', { kind: it.kind, x: it.x, y: it.y }); } continue; }
      it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= Math.exp(-3 * dt); it.vy *= Math.exp(-3 * dt);
      if (it.kind === 'rat') { it.rt = (it.rt || 0) - dt; if (it.rt <= 0) { it.rt = .4 + RNG.sim() * .6; const a = RNG.sim() * TAU; it.vx = Math.cos(a) * 90; it.vy = Math.sin(a) * 90; } }
      Rink.clampBody(it, 4, .5, .9);
      if (m.phase === 'play') it.t -= dt;
      // pickups and slips
      for (const s of m.skaters) {
        if (!Skater.free(s) || s.state === 'bin') continue;
        const d = Math.hypot(s.x - it.x, s.y - it.y);
        if (it.kind === 'octopus' || it.kind === 'rat') { if (d < (it.kind === 'octopus' ? 10 : 8) && Math.hypot(s.vx, s.vy) > 40 && !(s.items.poutine > 0)) { Skater.setState(s, 'slip', 1.2); if (m.puck.owner === s) Puck.loose(m, m.puck); Bus.emit('hazard', { kind: it.kind, victim: s.id, x: s.x, y: s.y }); if (it.kind === 'rat') it.t = 0; } continue; }
        if (it.kind === 'hat') continue;
        if (d < 12) { apply(m, s, it.kind); it.t = 0; break; }
      }
    }
    m.items = m.items.filter(i => i.t > 0 || (i.kind === 'octopus' && m.phase === 'play' && i.t > -999 && false));
    // the Discount Drop's crate: lowered from the ceiling, it breaks into a power-up
    for (const c of m.extras) if (c.kind === 'crate' && !c.done) { c.t += dt; c.z = Math.max(0, 120 - c.t * 40); if (c.z <= 0) { c.done = true; c.gone = 1; Bus.emit('crate', { x: c.x, y: c.y }); const it = make(['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox'][Math.floor(RNG.sim() * 6)], c.x, c.y); it.vx = (RNG.sim() - .5) * 120; it.vy = (RNG.sim() - .5) * 120; m.items.push(it); } }
    m.extras = m.extras.filter(c => !(c.kind === 'crate' && c.done && (c.gone -= dt) <= 0));
    thinIce(m, dt);
  }
  function apply(m, s, kind) {
    const D = ITEM_DEFS[kind]; if (!D) return;
    if (kind === 'boombox') Boom.add(m, s.team, 40);
    else if (kind === 'lumber') s.items.lumber = 3;
    else if (kind === 'bricks') { const g = m.teams[s.team].goalie; if (g) g.bricks = D.t; }
    else if (kind === 'cocoa') { s.items.cocoa = D.t; s.turbo = 1; }
    else s.items[kind] = D.t;
    s.stats.items = (s.stats.items || 0) + 1;
    Bus.emit('item', { by: s.id, kind, team: s.team });
  }
  /* ---- thin ice at the pond: 3 patches; knockdowns crack them, a big hit breaks them into a hole ---- */
  function setupIce(m) {
    m.ice = m.arena.hazards.includes('thinice') ? [[Rink.C.x - 190, Rink.C.y - 80], [Rink.C.x + 170, Rink.C.y + 90], [Rink.C.x + 10, Rink.C.y - 130]].map(([x, y], i) => ({ i, x, y, rx: 40, ry: 24, hp: 100, hole: 0 })) : [];
  }
  const onPatch = (m, x, y) => m.ice.find(p => ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1);
  function thinIceHit(m, s, big) {
    if (!m.ice || !m.ice.length) return;
    const p = onPatch(m, s.x, s.y); if (!p || p.hole > 0) return;
    p.hp -= big ? 100 : 50;
    if (p.hp <= 0) { p.hole = 30; p.hp = 0; Bus.emit('thin_ice_break', { patch: p.i, x: p.x, y: p.y, by: s.downBy, victim: s.id, victimTeam: s.team }); }
    else Bus.emit('ice_crack', { patch: p.i, x: p.x, y: p.y });
  }
  function thinIce(m, dt) {
    for (const p of m.ice || []) {
      if (p.hole > 0) {
        p.hole -= dt; if (p.hole <= 0) { p.hp = 60; Bus.emit('refreeze', { patch: p.i }); }
        const holeIn = (x, y) => ((x - p.x) / (p.rx * .7)) ** 2 + ((y - p.y) / (p.ry * .7)) ** 2 <= 1;
        for (const s of m.skaters) if (holeIn(s.x, s.y) && s.state !== 'frozen' && s.state !== 'bin' && s.state !== 'fight') { Skater.setState(s, 'frozen', 3); s.vx = s.vy = 0; if (m.puck.owner === s) { Puck.loose(m, m.puck); } Bus.emit('plunge', { victim: s.id, x: s.x, y: s.y }); const a = U.angTo(p, s); s.x = p.x + Math.cos(a) * p.rx * .3; s.y = p.y + Math.sin(a) * p.ry * .3; s.popTo = [p.x + Math.cos(a) * (p.rx + 10), p.y + Math.sin(a) * (p.ry + 10)]; }
        const pk = m.puck; if (!pk.owner && pk.inNet < 0 && !pk.out && pk.z < 1 && holeIn(pk.x, pk.y) && m.phase === 'play') { pk.out = true; Bus.emit('puck_lost', { x: pk.x, y: pk.y }); }
      }
    }
    for (const s of m.skaters) if (s.state === 'frozen' && s.stateT < .05 && s.popTo) { s.x = s.popTo[0]; s.y = s.popTo[1]; s.popTo = null; }
  }
  /** Polar Pete: figure eights in the neutral zone; checked, he goes down for 3 s, then waves */
  function setupExtras(m) {
    m.extras = [];
    if (m.arena.hazards.includes('pete') && m.rules.hazards) { const rig = Rigs.cast('pete'); m.extras.push({ kind: 'pete', id: 200, x: Rink.C.x, y: Rink.C.y - 60, vx: 0, vy: 0, t: 0, body: true, down: 0, rig, facing: 0 }); }
  }
  function extrasStep(m, dt) {
    for (const o of m.extras) {
      if (o.kind !== 'pete') continue;
      o.t += dt;
      if (o.down > 0) { o.down -= dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= Math.exp(-2 * dt); o.vy *= Math.exp(-2 * dt); if (o.down <= 0) { o.waveT = 2; Bus.emit('mascot_up', {}); } }
      else if (m.phase === 'play') { const a = o.t * .6, tx = Rink.C.x + Math.sin(a) * 90, ty = Rink.C.y + Math.sin(a * 2) * 60; o.vx = (tx - o.x) * 2; o.vy = (ty - o.y) * 2; o.x += o.vx * dt; o.y += o.vy * dt; if (Math.hypot(o.vx, o.vy) > 5) o.facing = Math.atan2(o.vy, o.vx); }
      o.waveT = Math.max(0, (o.waveT || 0) - dt);
      Rink.clampBody(o, 8);
      const hk = o.rig.hk; hk.ph = (hk.ph || 0) + dt * Math.hypot(o.vx, o.vy) / 22; hk.push = clamp(Math.hypot(o.vx, o.vy) / 80, 0, 1);
      o.rig.update(dt, { x: o.x, y: o.y, z: 0, vx: 0, vy: 0, facing: o.facing, down: o.down > 0 ? Math.min(1, (3 - o.down) * 3) : 0, pose: o.waveT > 0 ? 'wave' : m.phase !== 'play' ? 'cheer' : null });
    }
  }
  function wire() {
    Bus.sim('goal', e => { const m = Match.m; if (!m || !m.rules.items || e.so || m.cfg.mode === 'drill') return; if (m.arena.hazards.includes('octopus') && RNG.sim() < (m.arena.id === 'grindhouse' ? .6 : .25)) Items.toss(m, 'octopus'); else if (RNG.sim() < .25) Items.toss(m, pickKind(m)); });
    Bus.sim('hit', e => { const m = Match.m; if (m && e.big && m.rules.items && m.cfg.mode !== 'drill' && RNG.sim() < .25) Items.toss(m, pickKind(m)); });
  }
  return { toss, step, apply, setupIce, thinIceHit, setupExtras, extrasStep, onPatch, make, wire };
})();

/* ---- 28-fight.js ---- */
/* ---- FIGHT (7.11): the gloves drop. A challenge (hold the saucer button near a rival with a grudge), accepted or turtled;
 * then a staged scrap at ice level: jab, haymaker (telegraphed; hold for more), duck, and the jersey yank (three in four
 * seconds pull it over their head). Balance at 0 is a knockdown; the loser sits 20 s in the sin bin: a power play ---- */
const Fight = (() => {
  const MOVES = { jab: { wind: .07, active: .06, recover: .12, dmg: 6, sta: 8, anim: 'jab' }, hay: { wind: .35, active: .1, recover: .35, dmg: 18, sta: 22, anim: 'haymaker' },
    duck: { wind: 0, active: .35, recover: .05, sta: 10 }, yank: { wind: .1, active: .1, recover: .1, sta: 6, anim: 'cross' } };
  /** can a and b fight now (rules, the cap, a minute of clock since the last one)? */
  const allowed = (m, a, b) => m.rules.fights && m.phase === 'play' && m.fights < T.fightMax && (m.lastFightClock === null || Math.abs(m.lastFightClock - m.clockTotal()) >= 60 || m.cfg.fightsOften)
    && Skater.free(a) && Skater.free(b) && a.state !== 'bin' && b.state !== 'bin' && a.team !== b.team;
  function rivalFor(m, s, need = T.fightGrudge) {
    let best = null, bg = -1;
    for (const o of m.teams[1 - s.team].skaters) { const d = U.dist(o, s), gr = Math.max(Grudge.get(s, o), Grudge.get(o, s)); if (d < 40 && gr >= need && gr > bg && allowed(m, s, o)) { bg = gr; best = o; } }
    return best;
  }
  /** s challenges (it held the button near a rival) */
  function challenge(m, s, target) {
    const o = target || rivalFor(m, s); if (!o) return false;
    Bus.emit('gloves', { by: s.id, target: o.id });
    if (o.ctrl.kind === 'cpu') {
      const gr = Math.max(Grudge.get(o, s), Grudge.get(s, o));
      const p = m.cfg.forceFights ? 1 : clamp(.4 + .12 * (o.def.r[4] - 3) + gr / 200, .1, .95);
      if (RNG.sim() < p) start(m, s, o); else turtle(m, o, s);
    } else m.invite = { by: s.id, to: o.id, t: 3, hold: 0 };
    return true;
  }
  function turtle(m, decliner, challenger) { m.invite = null; Grudge.add(m, decliner, challenger, -20); Bus.emit('turtle', { by: decliner.id, challenger: challenger.id }); }
  /** each step in play: a pending invitation, and CPU enforcers looking for trouble */
  function watch(m, dt) {
    if (m.invite) {
      const iv = m.invite, to = m.byId(iv.to), by = m.byId(iv.by); iv.t -= dt;
      if (!to || !by || !allowed(m, by, to) && m.phase !== 'play') { m.invite = null; return; }
      if (to.intent.held.lob) { iv.hold += dt; if (iv.hold >= .5) { m.invite = null; start(m, by, to); return; } } else iv.hold = 0;
      if (iv.t <= 0) turtle(m, to, by);
      return;
    }
    if (m.phase !== 'play' || !m.rules.fights) return;
    m.fightLook = (m.fightLook || 0) - dt; if (m.fightLook > 0) return; m.fightLook = .5;
    for (const s of m.skaters) {
      if (s.ctrl.kind !== 'cpu' || !Skater.free(s)) continue;
      const need = m.cfg.fightsOften ? 40 : s.def.r[4] >= 4 ? 38 : 60; if (s.def.r[4] < 3 && !m.cfg.fightsOften) continue;
      const o = rivalFor(m, s, need); if (!o) continue;
      if (o.ctrl.kind !== 'cpu') { m.invite = { by: s.id, to: o.id, t: 3, hold: 0 }; Bus.emit('gloves', { by: s.id, target: o.id }); return; }
      if (RNG.sim() < (m.cfg.fightsOften ? .5 : .3)) { challenge(m, s, o); return; }
    }
  }
  const fighter = (m, s) => ({ id: s.id, bal: T.fightBalance, sta: 100, act: null, t: 0, ph: null, hold: 0, yanks: [], hood: 0, openT: 0, guardBreak: 0, duckCD: 0, think: .4, flinch: 0, pose: null, attack: null });
  function start(m, a, b) {
    m.fights++; m.lastFightClock = m.clockTotal(); m.invite = null;
    const mx = (a.x + b.x) / 2, my = clamp((a.y + b.y) / 2, Rink.Y0 + 60, Rink.Y1 - 60), mxc = clamp(mx, Rink.X0 + 110, Rink.X1 - 110);
    for (const s of [a, b]) { if (m.puck.owner === s) Puck.loose(m, m.puck); Skater.setState(s, 'fight', 99); s.vx = s.vy = 0; }
    a.x = mxc - 11; a.y = my; b.x = mxc + 11; b.y = my; a.facing = 0; b.facing = PI;
    a.fight = fighter(m, a); b.fight = fighter(m, b);
    m.fight = { a: a.id, b: b.id, x: mxc, y: my, t: 0, over: 0, winner: -1, gear: [] };
    for (const s of [a, b]) for (const k of [0, 1, 2]) m.fight.gear.push({ kind: k === 2 ? 'helmet' : 'glove', x: s.x + (RNG.fx() - .5) * 20, y: s.y + (RNG.fx() - .5) * 16, color: k === 2 ? s.helmetColor : s.rig.C.glove, rot: RNG.fx() * TAU });
    const pk = m.puck; Puck.loose(m, pk); pk.vx = pk.vy = 0;
    m.setPhase('fight');
    Bus.emit('fight_start', { a: a.id, b: b.id, x: mxc, y: my });
  }
  function input(m, s) {
    if (s.ctrl.kind === 'cpu') return null;
    const it = s.intent; return { jab: it.press.pass, hay: it.press.shoot, hayHeld: it.held.shoot, duck: it.press.deke, yank: it.press.lob };
  }
  function ai(m, s, f, o, of, dt) {
    f.think -= dt; const skill = m.aiSkill(s.team), c = { jab: false, hay: false, hayHeld: f.act === 'hay' && f.ph === 'wind' && f.t < .5 * skill, duck: false, yank: false };
    if (of.act === 'hay' && of.ph === 'wind' && !f.act && !f.dodgeTried) { f.dodgeTried = true; if (RNG.sim() < skill * .85) { c.duck = true; return c; } }
    if (of.act !== 'hay') f.dodgeTried = false;
    if (f.think > 0 || f.act) return c;
    f.think = lerp(.7, .3, skill) * (.7 + RNG.sim() * .6);
    const fgt = s.def.r[4], r = RNG.sim();
    if (of.openT > 0 || of.guardBreak > 0) c.hay = true;
    else if (r < .5 - fgt * .04) c.jab = true; else if (r < .78) c.hay = true; else c.yank = true;
    return c;
  }
  function begin(f, act) { const M = MOVES[act]; if (!M || f.act) return false; if (act === 'duck' && f.duckCD > 0) return false; f.act = act; f.t = 0; f.ph = M.wind ? 'wind' : 'active'; f.hold = 0; f.sta = Math.max(0, f.sta - M.sta); f.landed = false; return true; }
  function step(m, dt) {
    const F = m.fight; if (!F) return;
    const a = m.byId(F.a), b = m.byId(F.b); F.t += dt;
    if (F.over > 0) { F.over -= dt; for (const s of [a, b]) poseOf(s, s.fight, s === m.byId(F.winner)); if (F.over <= 0) finish(m); return; }
    for (const [s, o] of [[a, b], [b, a]]) {
      const f = s.fight, of = o.fight;
      f.openT = Math.max(0, f.openT - dt); f.guardBreak = Math.max(0, f.guardBreak - dt); f.hood = Math.max(0, f.hood - dt); f.duckCD = Math.max(0, f.duckCD - dt); f.flinch = Math.max(0, f.flinch - dt);
      f.sta = Math.min(100, f.sta + 25 * dt * (f.act ? .3 : 1));
      const c = input(m, s) || ai(m, s, f, o, of, dt);
      if (!f.act && f.flinch <= 0) { if (c.duck) begin(f, 'duck'); else if (c.hay) begin(f, 'hay'); else if (c.jab) begin(f, 'jab'); else if (c.yank) begin(f, 'yank'); if (f.act) Bus.emit('fight_move', { by: s.id, move: f.act }); }
      if (f.act) {
        const M = MOVES[f.act], slow = f.sta <= 1 ? .6 : 1; f.t += dt * slow;
        if (f.ph === 'wind') { if (f.act === 'hay' && c.hayHeld && f.hold < .6 - M.wind) { f.hold += dt; f.t = Math.min(f.t, M.wind - .001); } if (f.t >= M.wind) { f.ph = 'active'; f.t = 0; } }
        else if (f.ph === 'active') { if (!f.landed && f.act !== 'duck') { f.landed = true; strike(m, s, f, o, of); } if (f.t >= M.active) { f.ph = 'recover'; f.t = 0; if (f.act === 'duck') f.duckCD = .4; } }
        else if (f.ph === 'recover' && f.t >= M.recover) { f.act = null; f.ph = null; }
      }
      poseOf(s, f, false);
      // they circle a little, gripping each other
      const k = Math.sin(F.t * 1.3) * 3; s.x = F.x + (s === a ? -11 : 11) * Math.cos(F.t * .25) + k * .2; s.y = F.y + (s === a ? -1 : 1) * Math.sin(F.t * .25) * 6;
      s.facing = U.angTo(s, o);
      if (f.bal <= 0 && F.over <= 0) { end(m, o, s); return; }
    }
    // everyone else circles at 50, watching
    m.skaters.forEach((s, i) => { if (s === a || s === b || s.state === 'bin' || s.offIce) return; const an = i * 1.05 + F.t * .25, tx = F.x + Math.cos(an) * 52, ty = F.y + Math.sin(an) * 40; s.x += (tx - s.x) * Math.min(1, dt * 2); s.y += (ty - s.y) * Math.min(1, dt * 2); s.vx = s.vy = 0; s.facing = U.angTo(s, F); });
    // the linesmen break it up after 20 s: a draw
    if (F.t > 20) end(m, null, null);
  }
  function strike(m, s, f, o, of) {
    const M = MOVES[f.act], dmgK = RATE.fight(s.def);
    if (f.act === 'yank') {
      if (of.act === 'duck' && of.ph === 'active') return;
      of.guardBreak = .6; of.sta = Math.max(0, of.sta - 15); f.yanks = f.yanks.filter(t => m.t - t < 4); f.yanks.push(m.t);
      if (f.yanks.length >= 3) { of.hood = 1.5; f.yanks = []; Bus.emit('fight_hood', { by: s.id, victim: o.id }); }
      Bus.emit('fight_hit', { by: s.id, kind: 'yank', dmg: 0 }); return;
    }
    const ducking = of.act === 'duck' && of.ph === 'active';
    if (f.act === 'hay' && ducking) { f.openT = .5; Bus.emit('fight_whiff', { by: s.id }); return; }
    let dmg = M.dmg * dmgK + (f.act === 'hay' ? Math.min(6, f.hold * 10) : 0);
    if (f.act === 'jab' && ducking) dmg *= .5;
    if (f.act === 'jab' && !of.act && of.guardBreak <= 0 && of.hood <= 0) dmg *= .6;
    if (of.openT > 0) dmg *= 1.5; if (of.hood > 0) dmg *= 1.3;
    of.bal -= dmg; of.flinch = f.act === 'jab' ? .12 : .3; if (of.act && of.act !== 'duck' && f.act === 'hay') { of.act = null; of.ph = null; }
    Bus.emit('fight_hit', { by: s.id, victim: o.id, kind: f.act, dmg: Math.round(dmg), x: o.x, y: o.y, big: f.act === 'hay' });
  }
  function poseOf(s, f, won) {
    if (!f) return;
    f.pose = won ? 'cheer' : f.act === 'duck' ? 'crouch' : null;
    f.grip = !f.act || f.act === 'yank';
    if (f.act && MOVES[f.act].anim) { const M = MOVES[f.act], tot = M.wind + M.active + M.recover, u = f.ph === 'wind' ? f.t : f.ph === 'active' ? M.wind + f.t : M.wind + M.active + f.t; f.attack = E.move(f.act === 'hay' && s.altHook ? 'hook' : M.anim, clamp(u / tot, 0, 1)); }
    else f.attack = null;
  }
  function end(m, winner, loser) {
    const F = m.fight; if (F.over > 0) return;
    F.over = 2.2; F.winner = winner ? winner.id : -1;
    if (winner) { Skater.setState(loser, 'down', 3); loser.fight = null; winner.stats.fightsWon++; loser.stats.fightsLost = (loser.stats.fightsLost || 0) + 1; Match.hoserCheck(winner); }
    Bus.emit('fight_end', { winner: winner ? winner.id : -1, loser: loser ? loser.id : -1, draw: !winner });
  }
  function finish(m) {
    const F = m.fight, a = m.byId(F.a), b = m.byId(F.b), loser = F.winner === F.a ? b : F.winner === F.b ? a : null;
    for (const s of [a, b]) { s.fight = null; if (s.state === 'fight' || s.state === 'down') Skater.setState(s, 'skate'); }
    if (loser) SinBin.send(m, loser);
    m.fight = null;
    m.stoppage('fight', Rink.nearestDot(F.x, F.y));
  }
  return { challenge, watch, start, step, end, rivalFor, allowed, MOVES };
})();

/* ---- SIN BIN: the fight's loser sits T.sinBin seconds of play clock in the box; the other team has a power play ---- */
const SinBin = {
  seat: team => [Rink.C.x + (team === 0 ? -36 : 36), Rink.Y0 - 12],
  send(m, s) { if (m.puck.owner === s) Puck.loose(m, m.puck); s.binT = T.sinBin; Skater.setState(s, 'bin', 1e9); const [x, y] = SinBin.seat(s.team); s.x = x; s.y = y; s.vx = s.vy = 0; s.facing = PI / 2; s.stats.pim = (s.stats.pim || 0) + 5; Bus.emit('sin_bin', { who: s.id, team: s.team, t: T.sinBin }); },
  step(m, dt) {
    for (const s of m.skaters) if (s.state === 'bin') {
      const [x, y] = SinBin.seat(s.team); s.x = x; s.y = y; s.facing = PI / 2;
      if (m.phase === 'play') s.binT -= dt;
      if (s.binT <= 0) { Skater.setState(s, 'skate'); s.x = x; s.y = Rink.Y0 + 14; s.vy = 60; Bus.emit('sin_bin_end', { who: s.id, team: s.team }); }
    }
  },
  /** the team with a skater in the box, or -1 */
  short(m) { const s = m.skaters.find(q => q.state === 'bin'); return s ? s.team : -1; }
};

/* ---- 31-camera.js ---- */
/* ---- CAM (7.15): the broadcast director. Play: the puck (or its carrier) plus a lead, pulled toward a lone human far
 * from it, framing several local humans; Broadcast (threequarter) or Overhead (topdown), cycled by R3 / V and saved.
 * Fights, celebrations, intros and replays cut to ice level (brawler). Zoom levels are few and discrete (each one is a
 * floor bake) ---- */
const Cam = (() => {
  let fx = Rink.C.x, fy = Rink.C.y, mode = 'play', want = null, free = null;
  const DIST = { near: .86, normal: .72, far: .62 };   // (the broadcast views draw at 1.5x: .72 is about 1:1)
  const playView = () => S('camera') === 'overhead' ? 'topdown' : 'threequarter';
  const baseZoom = () => DIST[S('camDist')] || 1;
  function set(view, zoom) {
    if (game.view.id !== view) game.setView(view);
    const z = Math.round(zoom * 20) / 20; if (Math.abs((game._zoomBase || 1) - z) > .01) game.setZoom(z);
  }
  function cycle() { const v = S('camera') === 'overhead' ? 'broadcast' : 'overhead'; game.settings.set('camera', v); game.note(v === 'overhead' ? 'OVERHEAD CAMERA' : 'BROADCAST CAMERA'); }
  /** each step: where the camera looks and through which lens */
  function update(m, dt, o = {}) {
    let tx = fx, ty = fy, tz = 8, view = playView(), zoom = baseZoom();
    const pk = m.puck, humans = m.humans.filter(h => h.kind === 'local' && h.skater && !h.skater.offIce);
    if (free) { const I = game.input, mv = I.move(); free.x += mv[0] * 320 * dt / game.zoom; free.y += mv[1] * 320 * dt / game.zoom; if (I.down('turbo')) free.z = Math.min(2.2, free.z + dt); if (I.down('switch')) free.z = Math.max(.6, free.z - dt); set(view, free.z); game.focus(free.x, free.y, 0); return; }
    if (Replay.on) { const f = Replay.focus(); tx = f[0]; ty = f[1]; view = 'brawler'; zoom = 1; }
    else if (m.phase === 'fight' && m.fight) { tx = m.fight.x; ty = m.fight.y; tz = 14; view = 'brawler'; zoom = 1.3; }
    else if (m.phase === 'intro' && m.intro) { const s = m.intro.focus; tx = s ? s.x : Rink.C.x; ty = s ? s.y : Rink.C.y; view = 'brawler'; zoom = 1; tz = 14; }
    else if (m.phase === 'goal' && m.lastGoal && m.phaseT > -2.6) { const s = m.byId(m.lastGoal.by); tx = s ? s.x : pk.x; ty = s ? s.y : pk.y; view = 'brawler'; zoom = 1; tz = 12; }
    else if (m.phase === 'final' || m.phase === 'periodEnd') { tx = Rink.C.x; ty = Rink.C.y; }
    else {
      const src = pk.owner || pk; tx = src.x + (pk.owner ? pk.owner.vx : pk.vx) * .25; ty = src.y + (pk.owner ? pk.owner.vy : pk.vy) * .25;
      if (pk.inNet >= 0) { tx = pk.x; ty = pk.y; }
      if (humans.length === 1) { const h = humans[0].skater; if (U.dist(h, src) > 220) { tx = lerp(tx, h.x, .25); ty = lerp(ty, h.y, .25); } }
      else if (humans.length > 1) { let x0 = tx, x1 = tx, y0 = ty, y1 = ty; for (const h of humans) { x0 = Math.min(x0, h.skater.x); x1 = Math.max(x1, h.skater.x); y0 = Math.min(y0, h.skater.y); y1 = Math.max(y1, h.skater.y); } tx = lerp(tx, (x0 + x1) / 2, .5); ty = lerp(ty, (y0 + y1) / 2, .5); if (x1 - x0 > 260) zoom = Math.min(zoom, .62); }
      if (m.phase === 'shootout' || m.phase === 'so_result') { const sh = m.so && m.so.att && m.byId(m.so.att.shooter); if (sh) { tx = lerp(sh.x, Rink.goalX(m.attackNet(sh.team)), .45); ty = Rink.C.y; } }
      if (o.lead) { tx += o.lead[0]; ty += o.lead[1]; }
    }
    if (o.view) view = o.view; if (o.zoom) zoom = o.zoom;
    set(view, zoom);
    const k = 1 - Math.exp(-dt / Math.max(.02, game.view.id === 'brawler' ? .12 : .15));
    fx += (tx - fx) * k; fy += (ty - fy) * k;
    game.cam.smooth = 0; game.focus(fx, fy, tz);
  }
  function snap(x, y) { fx = x; fy = y; game.cam.snap = true; game.focus(fx, fy, 8); }
  /** the world point under the mouse (on the ice) */
  function mouseWorld() {
    const I = game.input, ms = I.mouseScreen && I.mouseScreen(); if (!ms || !game.view.inv) return null;
    const r = game.r; if (!r || !r.w) return null;
    // invert the projection around the camera's focus: the focus sits at the screen's center
    const c = r.w(fx, fy, 0), d = game.view.toGround(ms[0] - c[0], ms[1] - c[1]);
    return d ? [fx + d[0], fy + d[1]] : null;
  }
  return { update, cycle, snap, mouseWorld, playView, baseZoom, set, toggleFree() { free = free ? null : { x: fx, y: fy, z: game.zoom || 1 }; return !!free; }, lookAt(x, y, z) { free = { x, y, z: z || (free ? free.z : .72) }; fx = x; fy = y; }, get free() { return !!free; }, get focus() { return [fx, fy]; } };
})();

/* ---- REPLAY (7.16): an 8 s ring buffer of every body's position and rig state (60 Hz); goal replays (the last 4 s at
 * half speed, letterboxed, at ice level), big-hit and KABOOM replays at the next stoppage, highlights for the credits ---- */
const Replay = (() => {
  const RING = 480; let ring = [], clip = null, pend = [], k = 0, on = false, playT = 0, clipLen = 0, label = 'REPLAY', speed = .5, hilites = [];
  const cpHk = hk => hk ? Object.assign({}, hk, { stick: hk.stick ? Object.assign({}, hk.stick) : null }) : null;
  const snapOf = (e, rigArgs) => ({ x: e.x, y: e.y, z: e.z || 0, a: rigArgs ? Object.assign({}, rigArgs) : null, hk: cpHk(e.rig && e.rig.hk), gear: e.rig ? { stick: e.rig.hkGear.stick, helmet: e.rig.hkGear.helmet } : null, hood: e.rig ? e.rig.o.hood : false, off: !!e.offIce, st: e.state });
  function record(m) {
    if (on) return;
    if ((k++ & 1) === 0) return;
    const f = { t: m.t, pk: [m.puck.x, m.puck.y, m.puck.z, m.puck.onFire ? 1 : 0, m.puck.owner ? m.puck.owner.id : -1], sk: m.skaters.map(s => snapOf(s, s.rig._lastArgs)), g: m.goalies.map(g => snapOf(g, g.rig._lastArgs)), ex: m.extras.map(e => [e.x, e.y]), ev: [] };
    ring.push(f); if (ring.length > RING) ring.shift();
    for (const p of pend) if (m.t >= p.until) { p.ready = true; }
    pend = pend.filter(p => { if (!p.ready) return true; const c = ring.filter(fr => fr.t >= p.from && fr.t <= p.until); if (c.length > 20) { m.replayClip = { frames: c, label: p.label, score: p.score }; keep(m, m.replayClip); } return false; });
  }
  /** mark an event in the newest frame (its effects re-fire in the replay) */
  function mark(e) { const f = ring[ring.length - 1]; if (f) f.ev.push(e); }
  /** a big hit or KABOOM: copy its clip a second later, for the next stoppage */
  function want(m, label, score) { if (m.cfg.replays === 'off' || m.cfg.mode === 'attract' && false) return; pend.push({ from: m.t - 2, until: m.t + 1, label, score }); }
  function keep(m, c) { if (m.cfg.mode !== 'story') return; hilites.push(c); hilites.sort((a, b) => b.score - a.score); if (hilites.length > 3) hilites.length = 3; }
  function startGoal(m) {
    if (m.cfg.replays === 'off') return false;
    const t1 = m.t - 2.9, t0 = t1 - (m.cfg.mode === 'session' ? 3 : 3.5); const frames = ring.filter(f => f.t >= t0 && f.t <= t1 + .2);
    if (frames.length < 30) return false;
    const g = m.lastGoal, kind = g ? g.kind : '';
    keep(m, { frames, label: 'GOAL', score: 5 + (kind === 'kaboom' ? 5 : kind === 'onetimer' ? 3 : kind === 'deke' ? 3 : 0) });
    return play(frames, 'REPLAY', .5);
  }
  function play(frames, lab, sp = .5) { clip = frames; on = true; playT = 0; clipLen = frames[frames.length - 1].t - frames[0].t; label = lab; speed = sp; Bus.emit('replay_start', { label: lab }); return true; }
  /** at a stoppage: a pending big-hit / KABOOM clip */
  function atStoppage(m) { if (m.replayClip && m.cfg.replays !== 'off') { const c = m.replayClip; m.replayClip = null; return play(c.frames, c.label, .6); } return false; }
  function frame() { if (!clip) return null; const t = clip[0].t + playT; let i = 0; while (i < clip.length - 1 && clip[i + 1].t < t) i++; return clip[i]; }
  function step(m, dt, skip) {
    if (!on) return;
    playT += dt * speed;
    const f = frame();
    if (f) {
      // re-pose every rig from the frame, re-fire its marks
      m.skaters.forEach((s, i) => apply(s, f.sk[i], dt * speed)); m.goalies.forEach((g, i) => apply(g, f.g[i], dt * speed));
      for (const e of f.ev) if (!e._r || e._r !== f.t + ':' + playT.toFixed(1)) { e._r = f.t + ':' + playT.toFixed(1); Fx.replayEvent(e); }
    }
    if (playT >= clipLen || skip) stop();
  }
  function apply(e, sn, dt) { if (!sn || !e.rig) return; if (sn.hk) e.rig.hk = Object.assign(e.rig.hk, sn.hk, { stick: Object.assign(e.rig.hk.stick || {}, sn.hk.stick || {}) }); if (sn.gear) { e.rig.hkGear.stick = sn.gear.stick; e.rig.hkGear.helmet = sn.gear.helmet; } e.rig.o.hood = sn.hood; if (sn.a) e.rig.update(dt, sn.a); }
  function stop() { on = false; clip = null; Bus.emit('replay_end', {}); }
  function focus() { const f = frame(); if (!f) return [Rink.C.x, Rink.C.y]; const o = f.pk[4]; if (o >= 0) { const s = f.sk[o] || f.sk[0]; return [s.x, s.y]; } return [f.pk[0], f.pk[1]]; }
  /** the position to draw an entity at during a replay (or null when live) */
  const posOf = (kind, i) => { const f = on && frame(); if (!f) return null; return kind === 'pk' ? f.pk : kind === 'g' ? f.g[i] : kind === 'ex' ? f.ex[i] : f.sk[i]; };
  return { record, mark, want, startGoal, atStoppage, step, stop, focus, posOf, play, reset() { ring = []; pend = []; on = false; clip = null; }, clearHilites() { hilites = []; },
    get on() { return on; }, done: () => !on, get label() { return label; }, get hilites() { return hilites; }, get progress() { return clipLen ? playT / clipLen : 0; } };
})();

/* ---- 33-talk.js ---- */
/* ---- TALK (7.17): the booth (CHUCK WALLOP on play-by-play, MOOSE PLUNKETT on color) in a bottom subtitle box with
 * live portraits, two lines at most, non-modal and auto-advancing; every line babbles in the speaker's voice. Pools by
 * event with priorities and cooldowns; Moose's filler after 8 s of quiet. Coach Marge's tips: a banner under the score
 * bug, each shown once per profile ---- */
const Talk = (() => {
  let booth = null, chuck = null, moose = null, lastAny = -9, lastType = {}, lastLine = {}, quiet = 0, tip = null, tipQ = [];
  const PRI = { goal: 5, goal_ot: 6, kaboomgoal: 6, fight: 5, kaboom: 5, gilded: 5, glass: 4, hattrick: 6, final: 6, tie: 6, period: 5, vault: 5, mascot: 4, thinice: 4, bighit: 3, onetimer: 5, shootout: 4, boost: 5, organ: 5, fightwin: 4, post: 3, save: 1, glove: 2, deke: 2, windup: 1, shot: 0, rush: 0, drop: 2, pp: 3, item: 1, octopus: 2, buried: 2, turtle: 3, twister: 3, blocked: 1, takeaway: 1, crack: 2, goal_top: 5, goal_low: 5 };
  function init() {
    booth = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', bg: '#0a1224', voice: null });
    chuck = Rigs.cast('chuck'); moose = Rigs.cast('moose');
  }
  const on = () => S('commentary') !== false && !(HUB && typeof Net !== 'undefined' && Net.ended);
  /** say a line from a pool: type, vars; returns true when it spoke */
  function say(type, vars = {}, force) {
    if (!on() || !booth) return false;
    const pool = TEXT.talk[type]; if (!pool) return false;
    const now = game.real, pri = PRI[type] || 0, open = booth.open;
    if (!force) { if (now - lastAny < 1.2 && pri < 4) return false; if (now - (lastType[type] || -99) < 6 && pri < 5) return false; if (open && pri < 3) return false; }
    const fresh = pool.filter(l => now - (lastLine[l[1]] || -999) > 120), list = fresh.length ? fresh : pool, line = list[Math.floor(RNG.fx() * list.length)];
    lastAny = now; lastType[type] = now; lastLine[line[1]] = now; quiet = 0;
    speak(line[0], U.fill(line[1], vars));
    return true;
  }
  function speak(who, text) {
    const rig = who === 'm' ? moose : chuck, c = CAST[who === 'm' ? 'moose' : 'chuck'];
    if (S('subtitles') !== false) booth.say(text, { name: c.name, portrait: rig, portraitSize: 32, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1a2a4a' }, auto: 2.4, modal: false, alpha: .82, voice: Synth.voiceFn(c.voice) });
    else Synth.say(text, c.voice);
  }
  function wire() {
    const M = () => Match.m, nm = id => { const s = M() && M().byId(id); return s && s.def ? s.def.name : ''; }, tm = t => M() ? M().teams[t].def.short : '';
    const base = () => { const m = M(); if (!m) return {}; return { arena: m.arena.name, period: m.ot ? 'overtime' : U.ord(Math.min(3, m.period)).toLowerCase() + ' period', home: m.teams[0].def.short, away: m.teams[1].def.short, hs: m.teams[0].score, as: m.teams[1].score }; };
    const V = o => Object.assign(base(), o);
    Bus.on('faceoff_drop', () => { const m = M(); if (m && m.clock >= m.cfg.periodLen - .5 && m.phase !== 'shootout') say('drop', V({})); });
    Bus.on('possession', e => { const m = M(); if (!m) return; const s = m.byId(e.by); if (s && Math.hypot(s.vx, s.vy) > 150 && Math.abs(s.x - Rink.C.x) < 120 && RNG.fx() < .4) say('rush', V({ name: s.def.name })); if (e.how === 'battle' || e.how === 'pickup' && false) say('takeaway', V({ name: s.def.name })); });
    Bus.on('deke_beat', e => say('deke', V({ name: nm(e.by), victim: nm(e.victim) })));
    Bus.on('deke', e => { if (RNG.fx() < .35) say('deke', V({ name: nm(e.by), victim: 'the defender' })); });
    Bus.on('windup', e => { if (RNG.fx() < .4) say('windup', V({ name: nm(e.by) })); });
    Bus.on('shot', e => { if (e.onGoal && RNG.fx() < .35) say('shot', V({ name: nm(e.by) })); });
    Bus.on('save', e => { const m = M(); const g = m && m.byId(e.goalie); say(e.kind === 'glove' && e.freeze ? 'glove' : 'save', V({ goalie: g ? g.def.name : 'the goalie' })); });
    Bus.on('post', e => say('post', V({ name: nm(e.by) })));
    Bus.on('block', e => { if (RNG.fx() < .5) say('blocked', V({ name: nm(e.by) })); });
    Bus.on('goal', e => {
      const m = M(); if (!m || e.so) return; const s = m.byId(e.by), g = m.goalieAt(e.net), v = V({ name: s ? s.def.name : m.teams[e.team].def.short, team: tm(e.team), score: m.teams[0].score + '-' + m.teams[1].score, goalie: g ? g.def.name : '' });
      const type = e.ot ? 'goal_ot' : e.kind === 'kaboom' ? 'kaboomgoal' : e.kind === 'onetimer' ? 'onetimer' : m.puck.z > 12 ? 'goal_top' : m.puck.z < 3 && RNG.fx() < .4 ? 'goal_low' : 'goal';
      say(type, v, true);
    });
    Bus.on('hit', e => { if (e.big) { const m = M(); if (m) m.lastBigHitBy = e.by; say('bighit', V({ name: nm(e.by), victim: nm(e.victim) })); } });
    Bus.on('glass', e => { const m = M(); const v = m && m.byId(e.by); say(e.state === 'shattered' ? 'glass' : 'crack', V({ victim: v && v.def ? v.def.name : 'somebody' })); });
    Bus.on('fight_start', e => say('fight', V({ a: nm(e.a), b: nm(e.b) }), true));
    Bus.on('fight_end', e => { if (!e.draw) say('fightwin', V({ name: nm(e.winner), victim: nm(e.loser) }), true); });
    Bus.on('turtle', e => say('turtle', V({ name: nm(e.by) })));
    Bus.on('kaboom_start', e => say(e.gilded ? 'gilded' : 'kaboom', V({ team: tm(e.team) }), true));
    Bus.on('mascot_down', () => say('mascot', V({}), true));
    Bus.on('hat_trick', e => say('hattrick', V({ name: nm(e.by) }), true));
    Bus.on('period_end', () => { const m = M(); if (m && !m.ot) say('period', V({}), true); });
    Bus.on('final', e => { const m = M(); if (!m) return; if (e.winner < 0) say('tie', V({}), true); else say('final', V({ team: tm(e.winner), score: Math.max(...e.score) + '-' + Math.min(...e.score) }), true); });
    Bus.on('sin_bin', e => say('pp', V({ team: tm(1 - e.team) })));
    Bus.on('item', e => { const m = M(); if (m && RNG.fx() < .6) say('item', V({ name: nm(e.by), item: ITEM_DEFS[e.kind].name })); });
    Bus.on('hazard', e => { if (e.kind === 'octopus' || e.kind === 'rat') say('octopus', V({ victim: nm(e.victim) })); });
    Bus.on('plunge', e => say('thinice', V({ victim: nm(e.victim) }), true));
    Bus.on('buried', e => say('buried', V({ victim: nm(e.victim) })));
    Bus.on('vault_locked', () => { const p = TEXT.talk.vault[0]; speak(p[0], p[1]); });
    Bus.on('vault_cracked', () => { const p = TEXT.talk.vault[1]; speak(p[0], p[1]); });
    Bus.on('twister', () => say('twister', V({})));
    Bus.on('shootout_start', () => say('shootout', V({ name: '' }), true));
    Bus.on('boost_start', () => say('boost', V({}), true));
    Bus.on('organ_boost', () => say('organ', V({}), true));
    // Coach Marge's tips, by trigger
    const T2 = (ev, id, when) => Bus.on(ev, e => { const m = M(); if (m && m.humans.length && (!when || when(e, m))) tipOnce(id); });
    T2('faceoff_won', 'skate'); T2('possession', 'pass', (e, m) => m.byId(e.by).ctrl.kind === 'human'); T2('pass_complete', 'shoot', (e, m) => m.byId(e.to).ctrl.kind === 'human');
    T2('pass', 'onetimer', (e, m) => { const s = m.byId(e.to); return s && s.ctrl.kind === 'human' && Math.abs(s.x - Rink.goalX(m.attackNet(s.team))) < 200; });
    T2('possession', 'defense', (e, m) => !m.teams[m.byId(e.by).team].human); T2('takeaway', 'deke', (e, m) => !m.teams[m.byId(e.by).team].human);
    T2('shot', 'boom', (e, m) => m.boom[0] > 20 || m.boom[1] > 20); T2('gloves', 'fight'); T2('item_land', 'items'); T2('sin_bin', 'pp'); T2('kaboom_start', 'kaboom', (e, m) => m.teams[e.team].human); T2('shootout_start', 'shootout');
    T2('hit', 'gloves', (e, m) => e.big && m.byId(e.victim).ctrl.kind === 'human'); T2('period_start', 'saucer'); T2('stoppage', 'chirp'); T2('intermission', 'camera');
  }
  function tipOnce(id) {
    if (S('tips') === false || !TEXT.tips[id] || (tip && tip.id === id) || tipQ.includes(id)) return;
    const seen = E.store.get('ihk:tips', {}) || {}; if (seen[id]) return; seen[id] = 1; E.store.set('ihk:tips', seen);
    tipQ.push(id);
  }
  function step(dt) {
    if (!booth) return; booth.update(dt);
    const m = Match.m; if (m && m.phase === 'play') { quiet += dt; if (quiet > 8 && !booth.open && on()) { quiet = 0; const f = TEXT.filler, line = f[Math.floor(RNG.fx() * f.length)]; if (game.real - (lastLine[line] || -999) > 120) { lastLine[line] = game.real; speak('m', line); } } }
    if (tip) { tip.t -= dt; if (tip.t <= 0) tip = null; } else if (tipQ.length) tip = { id: tipQ.shift(), t: 5.5 };
  }
  function draw(r) { if (booth) booth.draw(r); }
  function drawTip(g, r, y) {
    if (!tip) return; const text = TEXT.tips[tip.id], a = Math.min(1, tip.t * 2);
    // two short lines, split at the middle word, at the top left under the radar's row
    const words = text.split(' '), half = Math.ceil(words.length / 2), l1 = words.slice(0, half).join(' '), l2 = words.slice(half).join(' ');
    const wd = s => E.font.width(s.replace(/\{[a-z]+\}/g, '')) + (s.match(/\{[a-z]+\}/g) || []).reduce((q, k) => q + Glyphs.chipW(k.slice(1, -1)) + 2, 0);
    const w = Math.max(wd(l1), wd(l2)) + 16, x = 6;
    px.blend(g, .9 * a, 'normal', () => UI.panel(g, x, y, w, 34, { border: '#7ad87a', bg: ['#10281a', '#08140c'] }));
    E.font.text(g, "COACH MARGE'S TIP", x + 8, y + 3, '#7ad87a', { font: 'tiny', outline: false });
    Glyphs.text(g, l1, x + 8, y + 12); Glyphs.text(g, l2, x + 8, y + 23);
  }
  return { init, say, speak, wire, step, draw, drawTip, tipOnce, get open() { return booth && booth.open; }, close() { if (booth) booth.open = false; }, get booth() { return booth; } };
})();

/* ---- 34-hud.js ---- */
/* ---- HUD (7.18): the score bug, the BOOM meters, the power play strip, player markers (rings, chevrons, P-tags, turbo,
 * off-screen arrows), the shot meter, the radar, context prompts, banners, the fight HUD, lower-thirds, the replay bug,
 * shootout marks, chirp bubbles and item timers. Clear of game.cornerArea() and inside a 92% title-safe area ---- */
const Hud = (() => {
  let banner = null, lower = null;
  const PER = p => p > 3 ? 'OT' : U.ord(p);
  function show(text, o = {}) { banner = Object.assign({ text, t: o.t || 1.8, max: o.t || 1.8, colors: o.colors || ['#ffffff', '#ffe08a', '#ffb347', '#e0662a'], scale: o.scale || 4, sub: o.sub || null }, o); }
  function lowerThird(lines, t = 3) { lower = { lines, t }; }
  function wire() {
    const M = () => Match.m;
    Bus.on('goal', e => { if (e.so) { show('GOAL!', { t: 1.6, scale: 3 }); return; } const m = M(); if (!m) return; const s = m.byId(e.by), as = (e.assists || []).map(id => m.byId(id)).filter(Boolean).map(a => a.def.name); show(e.kind === 'kaboom' ? 'KA-BOOM GOAL!' : 'GOAL!', { t: 2.8, sub: s ? s.def.name + (as.length ? '  (' + as.join(', ') + ')' : '') : '', colors: [m.teams[e.team].def.light, m.teams[e.team].def.trim, '#ffb347', m.teams[e.team].def.dark] }); });
    Bus.on('save', e => { if (e.kind === 'glove' && e.freeze && RNG.fx() < .5) show('SAVE!', { t: .9, scale: 2 }); });
    Bus.on('post', e => show(e.bar ? 'CROSSBAR!' : 'POST!', { t: .9, scale: 2, colors: ['#ffffff', '#d8e0e8', '#a8b0b8'] }));
    Bus.on('hit', e => { if (e.big) show('BIG HIT!', { t: .9, scale: 3, colors: ['#ffffff', '#ffd0a0', '#ff7a3a'] }); });
    Bus.on('glass', e => { if (e.state === 'shattered') show('THROUGH THE GLASS!', { t: 1.4, scale: 2, colors: ['#ffffff', '#cfe8ff', '#7ab8ff'] }); });
    Bus.on('kaboom_start', e => { const m = M(); show(e.gilded ? 'GILDED MODE!' : 'KA-BOOM!', { t: 2, scale: 5, colors: e.gilded ? ['#fff8c0', '#ffd84a', '#d9a520', '#8a5a10'] : ['#ffffff', '#ffe08a', '#ff8a3a', '#c82a1a'], sub: m ? m.teams[e.team].def.short + ' GO KABOOM' : '' }); });
    Bus.on('fight_start', () => show('FIGHT!', { t: 1.2, scale: 4, colors: ['#ffffff', '#ffb0a0', '#ff4a3a', '#8a1a1a'] }));
    Bus.on('sin_bin', e => show('POWER PLAY', { t: 1.6, scale: 3, colors: ['#ffffff', '#ffe08a', '#ffb347'] }));
    Bus.on('hat_trick', () => show('HAT TRICK!', { t: 2.2, scale: 4 }));
    Bus.on('period_start', e => show(PER(e.n) + ' PERIOD', { t: 1.6, scale: 3 }));
    Bus.on('ot_start', () => show('OVERTIME', { t: 1.8, scale: 4, sub: 'NEXT GOAL WINS' }));
    Bus.on('shootout_start', () => show('SHOOTOUT', { t: 2, scale: 4 }));
    Bus.on('final', e => { const m = M(); show('FINAL', { t: 3, scale: 4, sub: m ? m.teams[0].def.abbr + ' ' + e.score[0] + ' - ' + e.score[1] + ' ' + m.teams[1].def.abbr : '' }); });
    Bus.on('mascot_down', () => show('MASCOT DOWN!', { t: 1.4, scale: 3 }));
    Bus.on('vault_cracked', () => show('THE VAULT IS CRACKED!', { t: 2, scale: 2, colors: ['#fff8c0', '#ffd84a', '#d9a520'] }));
    Bus.on('vault_locked', () => show('VAULT LOCKED', { t: 1.2, scale: 2, colors: ['#e8e8e8', '#a8a8a8', '#686868'] }));
    Bus.on('turtle', () => show('TURTLE!', { t: 1, scale: 3, colors: ['#c8ffc8', '#7ad87a', '#3a8a3a'] }));
    Bus.on('thin_ice_break', () => show('SPLASH!', { t: 1, scale: 3, colors: ['#ffffff', '#cfe8ff', '#5a8ab8'] }));
    Bus.on('stoppage', e => { const m = M(); if (!m || e.why === 'fight') return; const a = m.teams[0], b = m.teams[1], fo = m.stats.faceoffs, tot = fo[0] + fo[1] || 1; lowerThird([a.def.abbr + '  SHOTS ' + a.shots + '  HITS ' + a.hits + '  FO ' + Math.round(fo[0] / tot * 100) + '%', b.def.abbr + '  SHOTS ' + b.shots + '  HITS ' + b.hits + '  FO ' + Math.round(fo[1] / tot * 100) + '%']); });
    Bus.on('item', e => { const m = M(); const s = m && m.byId(e.by); if (s && s.ctrl.kind !== 'cpu') UI.toast(ITEM_DEFS[e.kind].name + ': ' + ITEM_DEFS[e.kind].text, ITEM_DEFS[e.kind].color); });
    Bus.on('hoser_hat_trick', e => { const m = M(); const s = m && m.byId(e.by); UI.toast('HOSER HAT TRICK! ' + (s ? s.def.name : ''), '#ffd36a', 3.5); });
  }
  const meter = (g, x, y, w, v, col, kab) => { px.rect(g, x - 1, y - 1, w + 2, 6, '#05070d'); px.rect(g, x, y, w, 4, '#1a2030'); px.rect(g, x, y, Math.round(w * clamp(v, 0, 1)), 4, col); if (kab) for (let i = 0; i < w; i += 3) px.dot(g, x + i, y - 1 - (Math.floor(game.real * 20 + i) % 3), ['#ffd84a', '#ff8a3a', '#ff4a2a'][i % 3]); };
  /** the score bug, top center */
  function scoreBug(g, r, m) {
    const w = 206, x = Math.round(Math.min(r.W / 2 - w / 2, r.W - 104 - w)), y = 5, A2 = m.teams[0], B = m.teams[1];
    UI.panel(g, x, y, w, 30, { alpha: .9, border: '#4a5a7a' });
    Logo.draw(g, A2.id, x + 4, y + 3, 16); Logo.draw(g, B.id, x + w - 20, y + 3, 16);
    E.font.text(g, A2.def.abbr, x + 24, y + 4, A2.def.light, { outline: '#000' }); E.font.text(g, B.def.abbr, x + w - 24, y + 4, B.def.light, { align: 'right', outline: '#000' });
    E.font.text(g, String(A2.score), x + 58, y + 2, '#ffffff', { scale: 2, align: 'center', outline: '#000' }); E.font.text(g, String(B.score), x + w - 58, y + 2, '#ffffff', { scale: 2, align: 'center', outline: '#000' });
    const per = m.so ? 'SO' : PER(m.period), clock = m.so ? '' : U.mmss(m.clock), live = m.phase === 'play';
    E.font.text(g, per, x + w / 2, y + 3, '#ffd36a', { align: 'center', outline: '#000' });
    E.font.text(g, clock, x + w / 2, y + 13, live && m.clock < 10 ? '#ff6a6a' : '#eef4ff', { align: 'center', outline: '#000' });
    for (const t of [0, 1]) { const mx = t ? x + w - 92 : x + 22, kab = m.kaboom[t] > 0; meter(g, mx, y + 24, 70, kab ? m.kaboom[t] / T.kaboomTime : m.boom[t] / 100, kab ? '#ff6a2a' : m.boom[t] > 80 ? '#ffd36a' : '#e8a040', kab); E.font.text(g, kab ? 'KABOOM ' + Math.ceil(m.kaboom[t]) : 'BOOM', t ? mx - 3 : mx + 73, y + 23, kab ? '#ffd84a' : '#9fb2cc', { font: 'tiny', align: t ? 'right' : 'left', outline: false }); }
    // the power play strip
    const bin = m.skaters.find(s => s.state === 'bin');
    if (bin) { const pp = m.teams[1 - bin.team].def.abbr, txt = 'POWER PLAY ' + pp + '  ' + U.mmss(bin.binT) + '   (' + bin.def.name + ')'; const tw = E.font.width(txt) + 12; UI.panel(g, r.W / 2 - tw / 2, y + 33, tw, 12, { border: '#ffd36a', alpha: .92 }); E.font.text(g, txt, r.W / 2, y + 36, '#ffd36a', { align: 'center', outline: false }); }
    if (m.so) soMarks(g, r, m, y + 48);
  }
  function soMarks(g, r, m, y) {
    for (const t of [0, 1]) { const marks = m.so.marks[t], x0 = r.W / 2 + (t ? 20 : -20 - Math.max(3, marks.length) * 12);
      for (let i = 0; i < Math.max(3, marks.length); i++) { const x = x0 + i * 12, v = marks[i]; UI.panel(g, x, y, 10, 10, { alpha: .9, border: v === undefined ? '#4a5a7a' : v ? '#5ad85a' : '#ff5a5a' }); if (v === true) { px.line(g, x + 2, y + 5, x + 4, y + 7, '#5ad85a', 2); px.line(g, x + 4, y + 7, x + 8, y + 2, '#5ad85a', 2); } else if (v === false) { px.line(g, x + 2, y + 2, x + 8, y + 8, '#ff5a5a', 2); px.line(g, x + 8, y + 2, x + 2, y + 8, '#ff5a5a', 2); } } }
  }
  /** the radar, bottom right: the rink, team dots, humans ringed, the puck white */
  function radar(g, r, m) {
    const w = 92, h = 42, ca = game.cornerArea(), x = r.W - w - 6, y = ca && ca.y1 < 60 && ca.x0 < r.W - 100 ? Math.ceil(ca.y1) + 4 : 7;
    UI.panel(g, x - 2, y - 2, w + 4, h + 4, { alpha: .78, border: '#4a5a7a', bg: ['#0e1a2e', '#0a1424'] });
    const sx = (w - 4) / (Rink.HL * 2), sy = (h - 4) / (Rink.HW * 2), X = v => x + 2 + (v - Rink.X0) * sx, Y = v => y + 2 + (v - Rink.Y0) * sy;
    px.rect(g, X(Rink.C.x) , y + 2, 1, h - 4, '#c82a2a'); px.rect(g, X(Rink.C.x - 108), y + 2, 1, h - 4, '#2a5ab8'); px.rect(g, X(Rink.C.x + 108), y + 2, 1, h - 4, '#2a5ab8');
    for (const s of m.skaters) { if (s.offIce || s.state === 'bin') continue; const c = m.teams[s.team].home ? m.teams[s.team].def.trim : m.teams[s.team].def.light; if (s.ctrl.kind !== 'cpu') { const hc = s.ctrl.human ? s.ctrl.human.color : '#ffd36a'; px.disc(g, X(s.x), Y(s.y), 2.5, hc); } px.rect(g, Math.round(X(s.x)) - 1, Math.round(Y(s.y)) - 1, 3, 3, c); }
    for (const gl of m.goalies) px.rect(g, Math.round(X(gl.x)) - 1, Math.round(Y(gl.y)) - 1, 2, 3, '#d8d8d8');
    px.rect(g, Math.round(X(m.puck.x)), Math.round(Y(m.puck.y)), 1, 1, '#ffffff');
    void ca;
  }
  /** world markers: rings under humans, chevrons and tags, turbo bars, shot meters, chirp bubbles, items, dizzy stars */
  function world(r, m) {
    const t = game.real;
    for (const s of m.skaters) {
      if (s.offIce) continue;
      const pos = Replay.on ? Replay.posOf('s', s.id) || s : s;
      if (s.ctrl.kind !== 'cpu' && !Replay.on) {
        const hu = s.ctrl.human, col = hu ? hu.color : '#ffd36a';
        if (s.intent.aim && hu && hu.input === game.input && game.input.lastDevice === 'mouse') { const [ax, ay] = s.intent.aim; r.decal(() => { r.groundRing(ax, ay, 6, col, .9); r.groundRing(ax, ay, 2, '#ffffff', 1); }); }
        r.overlay(g => { const q = r.w(pos.x, pos.y, 20), sx = q[0], sy = q[1]; if (sx >= 4 && sx <= r.W - 4 && sy >= 4 && sy <= r.H - 4) return; const cx = clamp(sx, 10, r.W - 10), cy = clamp(sy, 40, r.H - 10), a = Math.atan2(sy - cy, sx - cx); px.poly(g, [[cx + Math.cos(a) * 7, cy + Math.sin(a) * 7], [cx + Math.cos(a + 2.4) * 6, cy + Math.sin(a + 2.4) * 6], [cx + Math.cos(a - 2.4) * 6, cy + Math.sin(a - 2.4) * 6]], col); E.font.text(g, hu ? (hu.tag || 'P' + (hu.id + 1)) : 'P1', cx - Math.cos(a) * 10, cy - Math.sin(a) * 10 - 3, col, { align: 'center', font: 'tiny', outline: '#000' }); });
        r.decal(() => { r.groundRing(pos.x, pos.y, 10, col, 1); r.groundRing(pos.x, pos.y, 11, col, .5); });
        r.queue(pos.x, pos.y, 46, g => { const [x, y] = r.w(pos.x, pos.y, 46), X = Math.round(x), Y = Math.round(y) + (Math.floor(t * 4) % 2); px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], col); px.poly(g, [[X - 2, Y - 4], [X + 2, Y - 4], [X, Y - 2]], '#ffffff');
          const tag = hu ? (hu.tag || 'P' + (hu.id + 1)) : 'P1'; E.font.text(g, tag, X, Y - 14, col, { align: 'center', outline: '#000' });
          px.rect(g, X - 8, Y + 2, 16, 2, '#05070d'); px.rect(g, X - 8, Y + 2, Math.round(16 * s.turbo), 2, s.turboOn ? '#4af0f0' : '#2a9ab8');
          if (s.calling > 0) E.font.text(g, '!', X + 8, Y - 14, '#ffd36a', { outline: '#000', scale: 2 });
        }, { emissive: true });
      }
      if (s.state === 'wind' || (s.charging && s.shootHeld > .18)) r.queue(pos.x, pos.y, 52, g => { const [x, y] = r.w(pos.x, pos.y, 52), full = s.charge >= .95; E.ui.bar(g, Math.round(x) - 12, Math.round(y) - 4, 24, 4, s.charge, full ? (m.kaboom[s.team] > 0 ? '#ff4a2a' : '#ffd36a') : '#ffb347'); if (full && m.kaboom[s.team] > 0) E.font.text(g, 'KABOOM!', Math.round(x), Math.round(y) - 12, '#ffd84a', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true });
      if (s.bubbleT > 0 && s.bubble) r.queue(pos.x, pos.y, 50, g => { const [x, y] = r.w(pos.x, pos.y, 50), lines = E.font.wrap(s.bubble, 96), w = Math.max(...lines.map(l => E.font.width(l))) + 8, h = lines.length * 9 + 5, X = Math.round(x - w / 2), Y = Math.round(y - h - 8); px.rect(g, X, Y, w, h, '#ffffff'); px.rect(g, X, Y + h, w, 1, '#8a8a90'); px.poly(g, [[x - 3, Y + h], [x + 3, Y + h], [x, Y + h + 5]], '#ffffff'); lines.forEach((l, i) => E.font.text(g, l, X + 4, Y + 3 + i * 9, '#141418', { outline: false })); });
      const its = Object.keys(s.items).filter(k => s.items[k] > 0); if (its.length) r.queue(pos.x, pos.y, 40, g => { const [x, y] = r.w(pos.x, pos.y, 38); its.forEach((k, i) => { const X = Math.round(x - its.length * 5 + i * 10 + 5), Y = Math.round(y) - 26; Items2.icon(g, k, X, Y); if (k !== 'lumber') E.font.text(g, String(Math.ceil(s.items[k])), X, Y + 5, '#ffffff', { font: 'tiny', align: 'center', outline: '#000' }); else E.font.text(g, 'x' + s.items[k], X, Y + 5, '#ffffff', { font: 'tiny', align: 'center', outline: '#000' }); }); });
      if (s.state === 'down' || (s.dizzy > 0 && s.state === 'getup')) r.queue(pos.x, pos.y, 10, g => { for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1, [x, y] = r.w(pos.x + Math.cos(a) * 7, pos.y + Math.sin(a) * 4, 12); px.dot(g, x, y, '#ffe84a'); px.dot(g, x + 1, y, '#ffffff'); } }, { emissive: true });
    }
  }
  /** context prompts at the bottom center (above the booth's box) */
  function prompts(g, r, m) {
    const y = r.H - 72, items = [];
    const hu = m.humans.find(h => h.kind === 'local'); if (!hu) return;
    const s = hu.skater, pk = m.puck;
    if (Replay.on) items.push('{pass} SKIP');
    else if (m.phase === 'faceoff' && m.faceoff && hu.skater === m.teams[hu.team].center && !m.faceoff.dropped) items.push('{pass} ON THE DROP!');
    else if (m.phase === 'play') {
      if (pk.passTo === s && !pk.owner) items.push('{shoot} ONE-TIMER!');
      if (m.invite && m.invite.to === s.id) items.push('HOLD {lob} TO ACCEPT  (' + Math.ceil(m.invite.t) + ')');
      else if (pk.owner !== s && Fight.rivalFor(m, s)) items.push('HOLD {lob} — DROP THE GLOVES');
      if (pk.owner === s && m.kaboom[s.team] > 0) items.push('HOLD {shoot} FOR A KABOOM SHOT');
    } else if (m.phase === 'fight') items.push('{pass} JAB   {shoot} HAYMAKER   {deke} DUCK   {lob} YANK');
    else if (m.phase === 'shootout' && m.so && m.so.att) { const g2 = m.byId(m.so.att.goalie); if (g2 && g2.manual) items.push('IN NET: {pass} BUTTERFLY  {shoot} POKE  {deke} DIVE'); else items.push('{deke} DEKE  {shoot} SHOOT'); }
    items.forEach((it, i) => Glyphs.text(g, it, r.W / 2, y - i * 13, { align: 'center', color: '#ffe8a0', input: hu.input }));
  }
  function fightHud(g, r, m) {
    const F = m.fight; if (!F) return;
    for (const [id, side] of [[F.a, 0], [F.b, 1]]) {
      const s = m.byId(id), f = s.fight || { bal: 0, sta: 0 }, x = side ? r.W - 120 : 12, y = 52;
      UI.panel(g, x, y, 108, 40, { alpha: .9, border: m.teams[s.team].def.trim });
      s.rig.drawPortrait(g, x + 3, y + 3, 34, { zoom: 2.4, turn: side ? -.4 : .4, bg: '#1a2a4a' });
      E.font.text(g, s.def.name, x + 40, y + 4, '#ffffff', { outline: '#000' });
      E.font.text(g, 'BAL', x + 40, y + 16, '#9fb2cc', { font: 'tiny', outline: false }); E.ui.bar(g, x + 54, y + 16, 50, 5, clamp(f.bal / T.fightBalance, 0, 1), '#ff5a4a');
      E.font.text(g, 'STA', x + 40, y + 26, '#9fb2cc', { font: 'tiny', outline: false }); E.ui.bar(g, x + 54, y + 26, 50, 5, clamp(f.sta / 100, 0, 1), '#4af0a0');
    }
  }
  function draw(r, m) {
    if (!m || Dev.hideHud) return;
    r.overlay(g => {
      const safeY = Math.round(r.H * .04);
      if (Replay.on) { const bh = Math.round(r.H * .1); px.rect(g, 0, 0, r.W, bh, '#000000'); px.rect(g, 0, r.H - bh, r.W, bh, '#000000'); E.font.title(g, Replay.label, 14, bh + 4, { scale: 2, colors: ['#ffffff', '#ff8a8a', '#c82a2a'] }); if (Math.floor(game.real * 2) % 2) px.disc(g, 8, bh + 10, 3, '#ff2a2a'); Glyphs.text(g, '{pass} SKIP', r.W - 14, r.H - bh + 4, { align: 'right', color: '#c8d0e8' }); return; }
      scoreBug(g, r, m); if (m.phase !== 'fight' && m.phase !== 'intro') radar(g, r, m);
      if (m.phase === 'fight') fightHud(g, r, m);
      prompts(g, r, m);
      Talk.drawTip(g, r, safeY + (m.skaters.some(s => s.state === 'bin') ? 46 : 34));
      UI.drawToasts(g, r, safeY + 66);
      if (banner) { banner.t -= 1 / 60; const k = banner.max - banner.t, sh = game.reduceMotion ? 0 : Math.max(0, .3 - k) * 10, sc = banner.scale, cy = r.H * .3 + Math.sin(game.real * 40) * sh;
        E.font.title(g, banner.text, Math.round(r.W / 2), Math.round(cy), { align: 'center', scale: sc, colors: game.reduceMotion ? banner.colors : banner.colors.map((c, i) => banner.colors[(i + Math.floor(game.real * 8)) % banner.colors.length]), depth: 3, depthColor: '#0a0a14' });
        if (banner.sub) E.font.text(g, banner.sub, r.W / 2, cy + sc * 8 + 6, '#ffffff', { align: 'center', outline: '#000' }); if (banner.t <= 0) banner = null; }
      if (lower && m.phase === 'stoppage') { lower.t -= 1 / 60; const w = 230, x = 14, y = r.H - 92; UI.panel(g, x, y, w, 28, { alpha: .9, border: '#ffd36a' }); lower.lines.forEach((l, i) => E.font.text(g, l, x + 6, y + 4 + i * 11, i ? '#cfe0f4' : '#ffffff', { outline: false })); if (lower.t <= 0) lower = null; }
      if (m.phase === 'intro' && m.intro) introCard(g, r, m);
      if (m.cfg.mode === 'session' && typeof AIHub !== 'undefined' && AIHub.time && AIHub.time() < 0 && AIHub.time() > -4000) { const n = Math.ceil(-AIHub.time() / 1000); E.font.title(g, String(n), r.W / 2, r.H * .35, { align: 'center', scale: 6 }); }
      Crowd.foreground(g, r, m);
    });
  }
  function introCard(g, r, m) {
    const I = m.intro, s = I.focus; if (!s || !s.def) return;
    const t = m.teams[s.team], w = 200, x = 20, y = r.H - 96;
    UI.panel(g, x, y, w, 34, { alpha: .92, border: t.def.trim });
    Logo.draw(g, t.id, x + 4, y + 5, 24);
    E.font.text(g, '#' + s.def.num + '  ' + (s.def.full || s.def.name), x + 32, y + 6, '#ffffff', { outline: '#000' });
    E.font.text(g, t.def.short + ' · ' + ({ C: 'CENTER', W: 'WING', D: 'DEFENSE', G: 'GOALIE' }[s.def.pos] || ''), x + 32, y + 18, t.def.trim, { outline: false });
    Glyphs.text(g, '{pass} SKIP', r.W - 14, r.H - 28, { align: 'right', color: '#9fb2cc' });
  }
  return { show, lowerThird, wire, draw, world, scoreBug, radar, get banner() { return banner; } };
})();

/* ---- item icons (string sprites, 8 px) ---- */
const Items2 = (() => {
  const SPR = {
    hotsauce: E.sprite(['..k..', '..r..', '.rrr.', '.rwr.', '.rrr.', '.rrr.', '.rrr.'], { k: '#2a2a2a', r: '#e83a2a', w: '#ffffff' }),
    tape: E.sprite(['.www.', 'wwwww', 'ww.ww', 'wwwww', '.www.'], { w: '#f4f4f4' }),
    poutine: E.sprite(['y.y.y', 'yyyyy', 'bbbbb', '.bbb.'], { y: '#f0c860', b: '#c8a080' }),
    lumber: E.sprite(['....y', '...y.', '..yy.', '.b...', 'b....'], { y: '#ffe84a', b: '#c8945a' }),
    bricks: E.sprite(['rrrrr', 'r.r.r', 'rrrrr', '.r.r.'], { r: '#b8503a' }),
    boombox: E.sprite(['..h..', 'ggggg', 'gcgcg', 'ggggg'], { g: '#4a4a5a', c: '#4af0f0', h: '#8a8a9a' }),
    cocoa: E.sprite(['.s.s.', '.....', 'bbbbb', 'bbbbb', '.bbb.'], { s: '#e8eef4', b: '#8a5a3a' }),
    octopus: E.sprite(['.ppp.', 'pwpwp', 'ppppp', 'p.p.p', '.p.p.'], { p: '#b84a8a', w: '#ffffff' }),
    rat: E.sprite(['.gg..', 'gggg.', '.gggt'], { g: '#8a8a90', t: '#e8a0a0' }),
    hat: E.sprite(['.hhh.', 'hhhhh'], { h: '#c83a2a' })
  };
  const icon = (g, k, x, y) => { const s = SPR[k]; if (s) px.sprite(g, s, Math.round(x - s.width / 2), Math.round(y - s.height / 2)); };
  return { SPR, icon };
})();

/* ---- 35-fx.js ---- */
/* ---- FX: the only place simulation events become sensory: particles, lights, shakes, flashes, crowd reactions and
 * sounds. Each handler reads the event (positions in it) and draws from RNG.fx only ---- */
const Fx = (() => {
  const m = () => Match.m;
  const who = id => m() && m().byId(id);
  const nm = id => { const s = who(id); return s && s.def ? s.def.name : ''; };
  const at = e => [e.x !== undefined ? e.x : Rink.C.x, e.y !== undefined ? e.y : Rink.C.y];
  const quiet = () => !m() || m().cfg.mode === 'session' && Net.ended;
  const SH = n => game.shake(n * (S('shake') === undefined ? 1 : S('shake')));
  function wire() {
    Bus.on('stop', e => { const s = who(e.by); if (!s) return; P.dust(s.x, s.y, 2, 6); P.bits(s.x + Math.cos(s.facing) * 6, s.y + Math.sin(s.facing) * 6, 3, 6, ['#ffffff', '#e8f4ff', '#cfe8ff']); Synth.sfx('stop', { vol: .8 }); });
    Bus.on('pass', e => { Synth.sfx('pass'); });
    Bus.on('pass_complete', e => Synth.sfx('tock'));
    Bus.on('possession', e => { if (e.how === 'pickup' || e.how === 'catch') Synth.sfx('tock', { vol: .6 }); });
    Bus.on('shot', e => {
      const s = who(e.by); Synth.sfx(e.kind === 'slap' || e.kind === 'kaboom' ? 'slap' : e.kind === 'onetimer' ? 'onetimer' : 'wrist');
      if (s && (e.kind === 'slap' || e.kind === 'onetimer')) P.ring(s.x + Math.cos(s.facing) * 10, s.y + Math.sin(s.facing) * 10, 2, 18, '#ffffff', .25);
      if (e.kind === 'kaboom' && s) { P.explosion(s.x + Math.cos(s.facing) * 12, s.y + Math.sin(s.facing) * 12, 4, .8, { debris: false, freeze: false, shake: 0 }); Synth.sfx('fire'); SH(2); }
      Crowd.excite(.1);
    });
    Bus.on('post', e => { Synth.sfx(e.bar ? 'bar' : 'post'); const [x, y] = at(e); P.sparks(x, y, e.bar ? 20 : 8, 8, null, { color: '#ffe8a0' }); Crowd.react('ahh'); Crowd.excite(.25); });
    Bus.on('save', e => { const g = who(e.goalie); Synth.sfx(e.kind === 'glove' ? 'catch' : 'pad'); if (g) P.bits(g.x, g.y, 8, 4, ['#ffffff', '#e8eef4']); Crowd.excite(.12); if (e.freeze) Synth.sfx('whistle'); });
    Bus.on('goal', e => {
      if (quiet()) return; const M = m(), [x, y] = at(e), team = M.teams[e.team];
      if (e.so) { Synth.horn(false, 1.6); Crowd.react('cheer'); return; }
      Synth.horn(e.kind === 'kaboom'); Synth.sting('sting-' + team.def.song);
      game.flash(e.kind === 'kaboom' ? '#ff8a3a' : '#ffffff', .12, .6); SH(e.kind === 'kaboom' ? 6 : 3);
      for (let k = 0; k < 4; k++) P.sparks(x, y, 10 + k * 4, 14, null, { color: [team.def.trim, team.def.dark, '#ffffff', '#ffd36a'][k] });
      P.bits(x, y, 16, 24, [team.def.trim, team.def.dark, '#ffffff', '#ffd36a', '#ff6a6a']);
      if (e.kind === 'kaboom') { P.explosion(x, y, 10, 1.6, { freeze: false, shake: 0 }); P.fire(x, y, 8, 18, { size: 1.4 }); if (M.arena.flames) Fx.fireworks(); }
      Crowd.react('roar'); Crowd.excite(1); Crowd.jump(e.team, 3);
      game.input.rumble(.8, .4);
    });
    Bus.on('hit', e => {
      const [x, y] = at(e), big = e.big;
      Synth.sfx(big ? 'bighit' : 'check', { vol: big ? 1 : .7 });
      if (big) { SH(3); P.impact && P.impact(x, y, 12, 1.2, '#ffffff'); P.bits(x, y, 4, 10, ['#ffffff', '#e8f4ff']); P.dust(x, y, 2, 8); Crowd.react('ohh'); Crowd.excite(.6); Synth.say('oof!', (who(e.victim) || {}).def ? who(e.victim).def.voice : null, { vol: .9 }); Replay.want(m(), 'BIG HIT', e.power / 40); game.input.rumble(.6, .25); }
      else { P.dust(x, y, 3, 3); Crowd.excite(.1); }
      if (e.kaboom && big) P.explosion(x, y, 8, .7, { freeze: false, shake: 0, debris: false });
    });
    Bus.on('knockdown', e => { const s = who(e.victim); if (s) s.dizzy = 2.2; });
    Bus.on('glass', e => { const [x, y] = at(e); if (e.state === 'shattered') { Synth.sfx('shatter'); P.bits(x, y, 30, 40, ['#d8f0ff', '#ffffff', '#a8d8f8', '#c8e8ff']); SH(4); game.flash('#e8f4ff', .08, .4); Crowd.react('gasp'); Crowd.flinch(x); Replay.want(m(), 'THROUGH THE GLASS', 6); } else { Synth.sfx('crack'); P.bits(x, y, 28, 8, ['#d8f0ff', '#ffffff']); } Crowd.excite(.5); });
    Bus.on('rattle', e => { Synth.sfx('boards', { vol: clamp(e.speed / 300, .3, 1) }); const p = Rink.panelAt(e.x, e.y); if (p) p.shake = Math.max(p.shake, .4); Crowd.pound(e.x); });
    Bus.on('puck_boards', e => { Synth.sfx(e.snow ? 'net' : 'boards', { vol: clamp(e.speed / 500, .2, .8) }); if (e.snow) P.dust(e.x, e.y, 2, 3); });
    Bus.on('puck_glass', e => { Synth.sfx('glass', { vol: clamp(e.speed / 500, .3, 1) }); Crowd.pound(e.x); });
    Bus.on('net_hit', () => Synth.sfx('net'));
    Bus.on('deke', e => { Synth.sfx('deke'); const s = who(e.by); if (s && e.spin) P.glints(s.x, s.y, 14, 4, '#ffffff'); });
    Bus.on('deke_beat', e => { Crowd.react('ahh'); Crowd.excite(.3); });
    Bus.on('deke_dodge', e => { Crowd.react('ahh'); });
    Bus.on('poke', () => Synth.sfx('clack')); Bus.on('battle', () => Synth.sfx('clack', { vol: .6 })); Bus.on('clack', () => Synth.sfx('clack'));
    Bus.on('chirp', e => { const s = who(e.by); if (s) Synth.say(TEXT.chirps[e.line], s.def.voice, { vol: .9 }); });
    Bus.on('gloves', e => { Synth.sfx('glove'); Crowd.excite(.4); });
    Bus.on('turtle', () => { Crowd.react('boo'); Synth.organ('sad'); });
    Bus.on('fight_start', e => { Synth.sfx('whistle2'); Synth.organ('fight'); Synth.layer('fight', 1, .4); Crowd.react('cheer'); Crowd.stand(6); const M = m(); if (M && M.fight) for (const gr of M.fight.gear) P.add && P.add({ kind: 'bit', x: gr.x, y: gr.y, z: 14, vz: 60, life: .5, color: gr.color }); });
    Bus.on('fight_move', e => { if (e.move === 'hay') Synth.sfx('whiff', { vol: .5 }); });
    Bus.on('fight_hit', e => { if (e.kind === 'yank') { Synth.sfx('glove'); return; } Synth.sfx('punch', { vol: e.big ? 1 : .7 }); const s = who(e.victim); if (s) { const voice = s.def.voice; Synth.say(e.big ? 'oof!' : 'uh', voice, { vol: .7 }); P.bits(e.x, e.y, 22, e.big ? 5 : 2, ['#bfe8ff', '#ffffff']); if (e.big && RNG.fx() < .35) P.bits(e.x, e.y, 24, 1, ['#ffffff']); } if (e.big) SH(2); Crowd.excite(.2); });
    Bus.on('fight_whiff', () => { Synth.sfx('whiff'); Crowd.react('ahh'); });
    Bus.on('fight_hood', () => { Crowd.react('roar'); });
    Bus.on('fight_end', e => { Synth.sfx('whistle'); Synth.layer('fight', 0, 1); Crowd.react(e.draw ? 'boo' : 'roar'); Crowd.excite(.8); });
    Bus.on('sin_bin', e => { if (e.team === m().teams.findIndex(t => !t.human) || true) Synth.organ('sad'); });
    Bus.on('kaboom_start', e => {
      const M = m(); if (!M) return; const team = M.teams[e.team], col = e.gilded ? '#ffd84a' : team.def.trim;
      Synth.sfx('kaboom'); game.flash(col, .2, .8); SH(6); Crowd.chant(); Crowd.excite(1);
      const bx = Rink.C.x + (e.team === 0 ? -140 : 140); P.explosion(bx, Rink.Y0 - 10, 30, 1.6, { freeze: false, shake: 0 });
      for (let k = 0; k < 5; k++) P.fire(Rink.C.x + (k - 2) * 120, Rink.Y0 + 2, 2, 6, { size: 1.2 });
      Synth.layer('kaboom', 1, .4); Synth.layer('toms', 1, .4);
      game.input.rumble(1, .6);
    });
    Bus.on('kaboom_end', e => { Synth.layer('kaboom', 0, 1.2); Synth.layer('toms', 0, 1.2); });
    Bus.on('kaboom_shot', e => { Crowd.excite(.5); });
    Bus.on('kaboom_body', e => { P.explosion(e.x, e.y, 10, .9, { freeze: false, shake: 0 }); Synth.sfx('blast'); SH(4); });
    Bus.on('kaboom_boards', e => { P.explosion(e.x, e.y, 14, 1, { freeze: false, shake: 0 }); Synth.sfx('blast'); SH(4); });
    Bus.on('blast', e => { P.explosion(e.x, e.y, 14, 1.4, { freeze: false, shake: 0 }); P.fire(e.x, e.y, 10, 12); Synth.sfx('blast'); SH(5); Crowd.react('roar'); Replay.want(m(), 'KA-BOOM!', 8); });
    Bus.on('vault_locked', e => { const g = who(e.goalie); if (g) P.sparks(g.x, g.y, 16, 20, null, { color: '#ffd84a' }); Synth.sfx('post'); Crowd.react('ohh'); });
    Bus.on('vault_cracked', e => { const g = who(e.goalie); if (g) { P.explosion(g.x, g.y, 18, 1.2, { freeze: false, shake: 0 }); P.bits(g.x, g.y, 18, 20, ['#ffd84a', '#c8901a', '#ffffff']); } Crowd.react('roar'); SH(5); });
    Bus.on('twister', e => { const s = who(e.by); if (s) P.glints(s.x, s.y, 16, 10, '#ffd84a'); });
    Bus.on('item_throw', () => Synth.sfx('throw', { vol: .6 }));
    Bus.on('item_land', e => { P.dust(e.x, e.y, 2, 3); if (e.kind === 'octopus') Synth.sfx('splort'); });
    Bus.on('item', e => { const s = who(e.by); Synth.sfx('pickup'); if (s) { P.text(s.x, s.y, 36, ITEM_DEFS[e.kind].name, ITEM_DEFS[e.kind].color, { scale: 1, bounce: false }); P.glints(s.x, s.y, 16, 8, ITEM_DEFS[e.kind].color); } });
    Bus.on('hazard', e => { Synth.sfx(e.kind === 'octopus' ? 'splort' : 'whiff'); Crowd.react('ahh'); });
    Bus.on('thin_ice_break', e => { Synth.sfx('splash'); P.bits(e.x, e.y, 4, 24, ['#ffffff', '#cfe8ff', '#5a8ab8']); SH(3); Crowd.react('gasp'); });
    Bus.on('ice_crack', e => Synth.sfx('crack', { vol: .6 }));
    Bus.on('plunge', e => { Synth.sfx('splash'); Synth.sfx('freeze'); P.bits(e.x, e.y, 6, 16, ['#ffffff', '#8ab8e8']); });
    Bus.on('buried', e => { P.dust(e.x, e.y, 6, 14); Synth.sfx('net'); });
    Bus.on('mascot_down', e => { Crowd.react('cheer'); const p = m() && m().extras.find(x => x.kind === 'pete'); if (p) Synth.say('ooof! bear down!', CAST.pete.voice); });
    Bus.on('ref_down', () => { Crowd.react('ohh'); });
    Bus.on('crate', e => { Synth.sfx('crate'); P.bits(e.x, e.y, 4, 14, ['#c8945a', '#8a5a32']); P.dust(e.x, e.y, 2, 8); });
    Bus.on('drop_start', () => Synth.sfx('menuMove'));
    Bus.on('hat_trick', e => { const M = m(); if (!M) return; for (let k = 0; k < 28; k++) { const it = Items.make('hat', Rink.C.x + (RNG.fx() - .5) * 700, Rink.Y0 - 40); it.z = 40; const tx = Rink.C.x + (RNG.fx() - .5) * 700, ty = Rink.C.y + (RNG.fx() - .5) * 300; it.vx = (tx - it.x) / 1; it.vy = (ty - it.y) / 1; it.vz = 300; it.air = true; it.t = 999; it.color = ['#c83a2a', '#3a6aa8', '#e8b43a', '#141414', '#5a8a3a'][k % 5]; M.items.push(it); } Crowd.react('roar'); });
    Bus.on('faceoff_drop', () => Synth.sfx('tock'));
    Bus.on('faceoff', e => { if (e.dot === 'center') Synth.organ('walkup'); });
    Bus.on('stoppage', e => { if (e.why !== 'fight' && e.why !== 'freeze') Synth.sfx('whistle'); if (RNG.fx() < .5) Synth.organ(RNG.fx() < .5 ? 'clap' : 'charge'); if (e.why === 'freeze') {} });
    Bus.on('octopus_cleared', () => { const M = m(); if (M) M.octoTwirl = 1.5; Crowd.react('cheer'); });
    Bus.on('period_end', () => { Synth.sfx('buzzer'); Synth.organ('period'); });
    Bus.on('final', e => { Synth.sfx('buzzer'); if (e.winner >= 0) Synth.horn(false, 1.8); Crowd.react(e.winner === 0 ? 'roar' : 'cheer'); });
    Bus.on('shootout_attempt', e => { if (!e.ok) { Crowd.react('ohh'); } });
    Bus.on('organ_boost', () => { Synth.organ('charge'); Crowd.react('cheer'); Synth.claps(8, .3); });
    Bus.on('boost_start', () => { Synth.sfx('powerup'); });
    Bus.on('objective', e => { Synth.sfx('star'); UI.toast('★ ' + e.text); });
    Bus.on('item_end', () => {});
    Bus.on('call', e => { const s = who(e.by); if (s) Synth.say('hey!', s.def.voice, { vol: .7 }); });
    // the replay re-fires the marks it recorded
    for (const t of ['hit', 'glass', 'shot', 'post', 'save', 'blast', 'goal', 'kaboom_body', 'kaboom_boards']) Bus.on(t, e => Replay.mark({ type: t, x: e.x, y: e.y, big: e.big, kind: e.kind, state: e.state }));
  }
  function replayEvent(e) {
    if (e.type === 'hit' && e.big) { P.bits(e.x, e.y, 4, 10, ['#ffffff', '#e8f4ff']); Synth.sfx('bighit', { vol: .7 }); }
    else if (e.type === 'glass' && e.state === 'shattered') { P.bits(e.x, e.y, 30, 30, ['#d8f0ff', '#ffffff']); Synth.sfx('shatter', { vol: .6 }); }
    else if (e.type === 'post') Synth.sfx('post', { vol: .6 });
    else if (e.type === 'blast' || e.type === 'kaboom_body' || e.type === 'kaboom_boards') P.explosion(e.x, e.y, 12, 1, { freeze: false, shake: 0 });
    else if (e.type === 'goal') { P.sparks(e.x, e.y, 10, 12, null, { color: '#ffd36a' }); }
  }
  function fireworks() { for (let k = 0; k < 6; k++) game.after(k * .25, () => { const x = Rink.C.x + (RNG.fx() - .5) * 600, y = Rink.Y0 - 60 + RNG.fx() * 40; P.sparks(x, y, 120, 26, null, { color: ['#ffd84a', '#ff4ab8', '#4af0f0', '#ffffff'][k % 4] }); P.ring(x, y, 4, 40, '#ffffff', .4); Synth.sfx('boom', { vol: .4 }); }); }
  /** each step: the continuous effects (KABOOM skates, the fireball puck, steam, speed lines, fire trails) */
  function frame(M, dt) {
    if (!M) return;
    const pk = M.puck;
    if (pk.onFire && !pk.owner && RNG.fx() < .9) P.fire(pk.x, pk.y, pk.z + 2, 1, { size: .7 });
    for (const s of M.skaters) {
      const sp = Math.hypot(s.vx, s.vy);
      if (M.kaboom[s.team] > 0 && sp > 60 && RNG.fx() < .3) P.sparks(s.x, s.y, 1, 1, Math.atan2(-s.vy, -s.vx), { color: M.teams[s.team].id === 'grizzlies' ? '#ffd84a' : '#ffa040' });
      if ((s.items.hotsauce > 0) && sp > 60 && RNG.fx() < .5) P.fire(s.x - s.vx * .03, s.y - s.vy * .03, 2, 1, { size: .5 });
      if (s.turboOn && sp > 150 && RNG.fx() < .25) P.dust(s.x - s.vx * .05, s.y - s.vy * .05, 1, 1);
      if (s.dizzy > 0) s.dizzy -= dt;
      if (s.twistT > 0 && RNG.fx() < .6) P.glints(s.x, s.y, 14, 1, '#ffd84a');
    }
    for (let i = 0; i < Rink.melt.length; i++) if (Rink.melt[i] > .3 && RNG.fx() < .004) { const x = Rink.X0 + (i % Rink.SW) * 16 + 8, y = Rink.Y0 + Math.floor(i / Rink.SW) * 16 + 8; P.smoke(x, y, 2, 1, { size: .5, color: '#e8eef4' }); }
  }
  return { wire, replayEvent, frame, fireworks, nm };
})();

/* ---- 36-crowd.js ---- */
/* ---- CROWD and DRESS (section 8): fans in the stands (excitement, jumps, standing, flinches, a wave when quiet, signs),
 * glass pounders behind the nets, the near crowd's silhouettes along the bottom of the screen, the benches, the
 * organist; and each arena's props and lights ---- */
const Crowd = (() => {
  let fans = [], pounders = [], arenaId = null, ex = .3, quietT = 0, waveX = -1, jumpT = [0, 0], standT = 0, flinchX = -9999, flinchT = 0, poundT = {}, t = 0;
  const SKIN = ['#f0c8a0', '#e0b090', '#a87050', '#6a4028', '#f4d8b8', '#c89070'];
  function build(arena, home) {
    arenaId = arena; const A = ARENAS[arena], hc = TEAMS[home] || TEAMS.muskrats;
    fans = []; let k = 0;
    const seatList = Rink.seats(arena);
    for (const s of seatList) { const h = s.h, mix = A.fans.mix, col = h < .55 ? (h < .3 ? hc.dark : hc.trim) : mix[Math.floor(h * 97) % mix.length]; fans.push({ x: s.x, y: s.y, z: s.z, h, shirt: col, skin: SKIN[Math.floor(h * 53) % SKIN.length], hat: A.fans.toques && h * 7 % 1 < .5 ? ['#c83a2a', '#e8b43a', '#3a6aa8'][Math.floor(h * 31) % 3] : null, sign: h > .985 ? A.signs[k++ % A.signs.length] : null, side: s.side }); }
    if (A.snowbanks) {   // the pond: fans in parkas standing on the snow around the rink
      for (let i = 0; i < 70; i++) { const a = (i / 70) * TAU, h = E.hash2(i, 77), rx = Rink.HL + 34 + h * 30, ry = Rink.HW + 30 + h * 22; const x = Rink.C.x + Math.cos(a) * rx, y = Rink.C.y + Math.sin(a) * ry; if (y > Rink.C.y + 80) continue; fans.push({ x, y, z: 0, h, shirt: A.fans.mix[i % A.fans.mix.length], skin: SKIN[i % SKIN.length], hat: ['#c83a2a', '#e8b43a', '#3a6aa8', '#ffffff'][i % 4], big: true, sign: i % 17 === 3 ? A.signs[i % A.signs.length] : null }); }
    }
    pounders = [];
    if (!A.snowbanks) for (const side of [0, 1]) for (let i = 0; i < 5; i++) { const x = side ? Rink.X1 + 18 : Rink.X0 - 18, y = Rink.C.y - 60 + i * 30, h = E.hash2(i + side * 9, 5); pounders.push({ x, y, h, side, rig: Rigs.fan(i % 2 ? hc.dark : A.fans.mix[(i + 2) % A.fans.mix.length], SKIN[i % SKIN.length]), pound: 0 }); }
  }
  function excite(v) { ex = clamp(ex + v * .5 * T.crowdHype, 0, 1.2); quietT = 0; }
  function react(kind) { Synth.swell(kind); if (kind === 'roar' || kind === 'cheer') standT = Math.max(standT, 2); }
  const jump = (team, s) => { jumpT[team] = s; };
  const stand = s => { standT = Math.max(standT, s); };
  const flinch = x => { flinchX = x; flinchT = 1.2; };
  const pound = x => { for (const p of pounders) if (Math.abs(p.x - x) < 200) p.pound = 1.2; };
  function chant() { Synth.chant('ka boom'); standT = 4; }
  function step(dt, m) {
    t += dt; ex = Math.max(.15, ex - dt * .05); quietT += dt; standT = Math.max(0, standT - dt); flinchT = Math.max(0, flinchT - dt); jumpT = jumpT.map(v => Math.max(0, v - dt));
    if (quietT > 20 && waveX < 0) { waveX = 0; quietT = 0; }
    if (waveX >= 0) { waveX += dt * 260; if (waveX > Rink.W) waveX = -1; }
    if (m && (m.phase === 'play' || m.phase === 'faceoff')) Synth.crowd(.25 + ex * .75); else if (m) Synth.crowd(.2 + ex * .5);
    for (const p of pounders) { p.pound = Math.max(0, p.pound - dt); if (m && !m.puck.owner === false) {} const near = m && Math.abs(m.puck.x - p.x) < 140; if (near && RNG.fx() < dt * 2) p.pound = .6; p.rig.update(dt, { x: p.x, y: p.y, z: 0, vx: 0, vy: 0, facing: p.side ? PI : 0, pose: p.pound > 0 ? 'cheer' : standT > 0 ? 'cheer' : null }); }
  }
  function draw(r, m) {
    const ga = game.real, kab = m && (m.kaboom[0] > 0 || m.kaboom[1] > 0);
    for (const f of fans) {
      if (!r.visible(f.x, f.y, f.z + 6)) continue;
      const ph = f.h * 9, up = (jumpT[f.side] > 0 ? Math.abs(Math.sin(ga * 9 + ph)) * 4 : 0) + (standT > 0 || kab ? 1.5 + Math.abs(Math.sin(ga * 6 + ph)) * 1.5 : 0) + (waveX >= 0 && Math.abs(f.x - waveX) < 50 ? 4 * (1 - Math.abs(f.x - waveX) / 50) : 0) + Math.sin(ga * 2 + ph) * .5 * ex;
      const fl = flinchT > 0 && Math.abs(f.x - flinchX) < 90 ? -2 : 0, z = f.z + up;
      r.queue(f.x, f.y, z, g => {
        const [x, y] = r.w(f.x, f.y, z), X = Math.round(x + fl * .5), Y = Math.round(y), big = f.big ? 1 : 0;
        px.rect(g, X - 2 - big, Y - 5 - big * 2, 4 + big * 2, 5 + big * 2, f.shirt); px.rect(g, X - 1, Y - 8 - big * 2, 3, 3, f.skin);
        if (f.hat) px.rect(g, X - 1, Y - 9 - big * 2, 3, 1 + big, f.hat);
        if (standT > 0 || kab || jumpT[f.side] > 0) { px.dot(g, X - 3 - big, Y - 8 - (Math.floor(ga * 8 + ph) % 2), f.skin); px.dot(g, X + 2 + big, Y - 8 - (Math.floor(ga * 8 + ph + 1) % 2), f.skin); }
        if (flinchT > 0 && Math.abs(f.x - flinchX) < 90) { px.dot(g, X - 2, Y - 9, f.skin); px.dot(g, X + 2, Y - 9, f.skin); }
        if (f.sign) { const w = E.font.width(f.sign, { font: 'tiny' }) + 4; px.rect(g, X - w / 2, Y - 18, w, 8, '#f4f0e0'); px.rect(g, X - w / 2, Y - 18, w, 1, '#ffffff'); E.font.text(g, f.sign, X, Y - 17, '#c8202a', { font: 'tiny', align: 'center', outline: false }); px.rect(g, X, Y - 10, 1, 3, '#8a6a3a'); }
      });
    }
    for (const p of pounders) {
      const bang = p.pound > 0 ? Math.sin(ga * 18 + p.h * 9) : 0;
      r.actor(p.x, p.y, 0, (g, ox, oy) => p.rig.draw(g, ox, oy + (bang > 0 ? -1 : 0), r.view), { every: 1 });
    }
  }
  /** the near crowd: dark head-and-shoulder silhouettes along the screen's bottom edge (the broadcast foreground) */
  function foreground(g, r, m) {
    if (game.view.id === 'topdown' || !m) return;
    const [, fy] = Cam.focus; if (fy < Rink.C.y + 40) return;
    const k = clamp((fy - Rink.C.y - 40) / 120, 0, 1), base = r.H + 6 - k * 10, ga = game.real;
    for (let x = -8, i = 0; x < r.W + 8; x += 13, i++) { const h = E.hash2(i, 3), up = (standT > 0 ? Math.abs(Math.sin(ga * 7 + i)) * 3 : 0); const y = base - 6 - h * 4 - up; px.disc(g, x, y, 5, '#06080e'); px.rect(g, x - 8, y + 4, 16, 12, '#06080e'); if (h > .8) px.rect(g, x - 3, y - 6, 6, 2, '#0e121c'); }
  }
  /** the benches and sin bins on the far side: spares sitting, the coaches standing, Doris at the organ */
  function benches(r, m) {
    if (!m) return;
    for (const t of [0, 1]) {
      const b = m.bench[t], x0 = Rink.C.x + (t === 0 ? -150 : 150), y = Rink.Y0 - 12;
      r.queue(x0, y - 4, 0, g => { r.box(g, x0 - 60, y - 6, 0, x0 + 60, y - 2, 6, '#4a3a2a', '#2a2018'); });
      b.spares.forEach((rig, i) => { const x = x0 - 30 + i * 34; r.actor(x, y - 2, 2, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { every: 2, key: rig }); });
      if (b.coach) r.actor(x0 + 46, y - 10, 0, (g, ox, oy) => b.coach.draw(g, ox, oy, r.view), { every: 2, key: b.coach });
    }
    // the sin bins and the scorekeeper's box between them
    r.queue(Rink.C.x, Rink.Y0 - 6, 0, g => { r.box(g, Rink.C.x - 64, Rink.Y0 - 20, 0, Rink.C.x + 64, Rink.Y0 - 2, 2, '#2a2a34', '#1a1a22'); r.box(g, Rink.C.x - 8, Rink.Y0 - 22, 0, Rink.C.x + 8, Rink.Y0 - 8, 12, '#5a5a6a', '#3a3a4a'); });
  }
  return { build, excite, react, jump, stand, flinch, pound, chant, step, draw, foreground, benches, get level() { return ex; } };
})();

/* ---- DRESS: each arena's props, set dressing and lights (the far side and the ends; nothing is built on the camera
 * side) ---- */
const Dress = (() => {
  let organist = null, beat = 0;
  const lamp = (x, y, z, c) => { L.add(x, y, z, 260, .8, { color: c }); };
  function lights(r, m, A) {
    const t = game.real;
    if (A.lamps) for (let i = 0; i < A.lamps; i++) { const x = Rink.C.x - Rink.HL * .75 + i * (Rink.HL * 1.5 / Math.max(1, A.lamps - 1)), flick = A.flicker && E.hash2(Math.floor(t * 12), i) < .06 ? .3 : 1; L.add(x, Rink.C.y - 40, 140, 300, .2 * flick, { color: A.lampColor }); L.add(x, Rink.C.y + 120, 140, 240, .14 * flick, { color: A.lampColor }); }
    if (A.neon) A.neon.forEach((c, i) => L.add(Rink.C.x - 380 + i * 380, Rink.Y0 - 60, 30, 220, .7 + Math.sin(t * 3 + i) * .1, { color: c }));
    if (A.id === 'pond') { L.add(Rink.C.x - 520, Rink.Y0 - 40, 10, 260, .9 + Math.sin(t * 13) * .1, { color: '#ff9a3a' }); L.add(Rink.C.x + 470, Rink.Y0 - 70, 20, 150, .6, { color: '#ffd080' }); L.add(Rink.C.x - 260, Rink.Y0 - 90, 20, 150, .6, { color: '#ffd080' }); for (let i = 0; i < 6; i++) L.add(Rink.C.x - 400 + i * 160, Rink.Y0 - 24, 50, 120, .45, { color: '#ffe0a0' }); }
    if (A.id === 'dome') { if (m && (m.phase === 'goal' || m.kaboom[0] > 0 || m.kaboom[1] > 0)) for (const [x, y] of [[Rink.X0 - 20, Rink.Y0 - 20], [Rink.X1 + 20, Rink.Y0 - 20]]) L.add(x, y, 40, 260, .9, { color: '#ff7a2a' }); }
    if (m) { for (const t2 of [0, 1]) if (m.kaboom[t2] > 0) L.add(Rink.C.x, Rink.C.y, 60, 900, .25 + Math.sin(t * 8) * .1, { color: m.teams[t2].id === 'grizzlies' ? '#ffd84a' : m.teams[t2].def.trim }); if (m.puck.onFire) L.add(m.puck.x, m.puck.y, 6, 90, 1, { color: '#ff8a2a' }); }
  }
  function draw(r, m, A) {
    const t = game.real, top = A.stand ? 64 : 0, backY = 8;
    if (A.id === 'icebox' || A.id === 'dome') {
      // championship banners and the hand-painted scoreboard on the back wall; the organ booth
      for (const [i, lab] of (A.banners || ['KABOOM', 'CUP']).entries()) { const x = Rink.C.x - 200 + i * 400; r.prop('banner', x, backY, top + 4, { size: 1.6, color: A.id === 'dome' ? '#d9a520' : '#5a3a22' }); }
      r.queue(Rink.C.x, backY + 6, top, g => { const a = r.w(Rink.C.x - 70, backY, top + 40), b = r.w(Rink.C.x + 70, backY, top + 4); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#1a2a1a'); px.rect(g, a[0] + 2, a[1] + 2, b[0] - a[0] - 4, b[1] - a[1] - 4, '#0e1a10');
        const M = m; if (M) { E.font.text(g, M.teams[0].def.abbr + ' ' + M.teams[0].score + '  ' + U.mmss(M.clock) + '  ' + M.teams[1].score + ' ' + M.teams[1].def.abbr, (a[0] + b[0]) / 2, a[1] + 5, '#ffd36a', { align: 'center', font: 'tiny', outline: false }); } E.font.text(g, A.id === 'dome' ? 'KABOOM DOME' : "OL' ICEBOX", (a[0] + b[0]) / 2, b[1] - 9, '#e8e0c8', { align: 'center', font: 'tiny', outline: false }); });
      if (A.organ) { if (!organist) organist = Rigs.cast('doris'); const ox = Rink.X0 - 60, oy = Rink.Y0 - 10; r.queue(ox, oy + 4, 0, g => r.box(g, ox - 14, oy - 4, 0, ox + 14, oy + 6, 14, '#6a3a2a', '#4a2418'));
        organist.update(1 / 60, { x: ox, y: oy - 8, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: m && m.phase === 'goal' ? 'cheer' : null });
        const bob = Math.sin(t * 8) * 1.2, J = organist.J; if (J.handR && !(m && m.phase === 'goal')) { J.handR = E.V3.add(J.shC, [3.5, 1.6, -4 + Math.max(0, bob)]); J.handL = E.V3.add(J.shC, [3.5, -1.6, -4 + Math.max(0, -bob)]); }
        r.actor(ox, oy - 8, 0, (g, x, y) => organist.draw(g, x, y, r.view)); }
      for (let i = 0; i < 8; i++) r.prop('lantern', Rink.C.x - 420 + i * 120, backY + 14, top + 26, { size: 1, anchor: 'top', light: false });
    }
    if (A.id === 'pond') {
      for (let i = 0; i < 14; i++) { const x = Rink.C.x - 640 + i * 98 + E.hash2(i, 1) * 30, y = Rink.Y0 - 120 - E.hash2(i, 2) * 70; r.shape('pine', x, y, 0, { params: { h: 44 + E.hash2(i, 3) * 26, tiers: 4 } }); }
      for (const [x, y, lit] of [[Rink.C.x + 470, Rink.Y0 - 96, 1], [Rink.C.x - 260, Rink.Y0 - 120, 1]]) r.queue(x, y + 14, 0, g => { r.box(g, x - 30, y - 18, 0, x + 30, y + 14, 26, '#8a5a32', '#5a3a1e'); r.box(g, x - 34, y - 22, 26, x + 34, y + 18, 32, '#e8eef8', '#c8d0dc'); const w0 = r.w(x - 12, y + 14, 14); px.rect(g, w0[0], w0[1], 8, 6, lit ? '#ffd080' : '#3a3a3a'); const w1 = r.w(x + 6, y + 14, 14); px.rect(g, w1[0], w1[1], 8, 6, lit ? '#ffd080' : '#3a3a3a'); }, { emissive: false });
      r.prop('firedrum', Rink.C.x - 520, Rink.Y0 - 40, 0, { size: 1.6, light: false });
      for (const [x, y] of [[Rink.C.x - 380, Rink.Y0 - 60], [Rink.C.x + 300, Rink.Y0 - 70], [Rink.X1 + 50, Rink.C.y - 60]]) r.queue(x, y, 0, g => { const a = r.w(x, y, 5), b = r.w(x, y, 13), c = r.w(x, y, 19); px.disc(g, a[0], a[1], 6, '#f4f8ff'); px.disc(g, b[0], b[1], 4.5, '#ffffff'); px.disc(g, c[0], c[1], 3.4, '#f4f8ff'); px.dot(g, c[0] + 1, c[1] - 1, '#141414'); px.dot(g, c[0] + 3, c[1], '#f08a2a'); px.line(g, b[0] - 4, b[1], b[0] - 9, b[1] - 4, '#6a4a2a'); });
      for (let i = 0; i < 7; i++) { const x = Rink.C.x - 480 + i * 160; r.prop('streetlamp', x, Rink.Y0 - 30, 0, { size: 1.1, light: false }); }
      for (let i = 0; i < 30; i++) { const x = Rink.C.x - 480 + i * 32, z = 44 - Math.sin((i % 5) / 5 * PI) * 6; r.queue(x, Rink.Y0 - 30, z, g => { const q = r.w(x, Rink.Y0 - 30, z); px.dot(g, q[0], q[1], ['#ffd080', '#ff6a6a', '#6aff8a', '#6ab8ff'][i % 4]); }, { emissive: true }); }
    }
    if (A.id === 'grindhouse') {
      for (let i = 0; i < 6; i++) { const x = Rink.C.x - 450 + i * 180; r.queue(x, backY + 2, top, g => { r.box(g, x - 4, backY - 2, top, x + 4, backY + 4, top + 60, '#5a6068', '#3a3e44'); }); }
      for (const side of [0, 1]) { const x = side ? Rink.X1 + 6 : Rink.X0 - 6; r.queue(x, Rink.C.y - 100, 0, g => { for (let k = 0; k <= 10; k++) { const a = r.w(x, Rink.C.y - 100 + k * 20, 17), b = r.w(x, Rink.C.y - 100 + k * 20, 70); px.line(g, a[0], a[1], b[0], b[1], '#6a7078'); } for (let z = 22; z <= 70; z += 8) { const a = r.w(x, Rink.C.y - 100, z), b = r.w(x, Rink.C.y + 100, z); px.line(g, a[0], a[1], b[0], b[1], '#5a6068'); } }); }
      for (let i = 0; i < 4; i++) { const x = Rink.C.x - 300 + i * 200; r.queue(x, backY + 10, top + 12, g => { const a = r.w(x - 60, backY + 10, top + 12), b = r.w(x + 60, backY + 10, top + 12); px.line(g, a[0], a[1], b[0], b[1], '#8a5a3a', 3); px.line(g, a[0], a[1] - 1, b[0], b[1] - 1, '#b8805a'); }); if (RNG.fx() < .02) P.smoke(x + 50, backY + 10, top + 14, 1, { size: .8, color: '#d8e0e8' }); }
      r.prop('firedrum', Rink.X0 - 50, Rink.Y0 - 30, 0, { size: 1.2, light: false });
    }
    if (A.id === 'mall') {
      const shops = [['PRETZEL PLANET', '#ffb04a'], ['SOCK SHACK', '#4af0f0'], ['GLITTERMAN GOLD', '#ffe04a'], ['ARCADIA', '#ff4ab8'], ['FOOD COURT', '#8aff6a']];
      shops.forEach(([name, c], i) => { const x = Rink.C.x - 440 + i * 220; r.queue(x, backY + 12, top, g => { const a = r.w(x - 70, backY + 8, top + 44), b = r.w(x + 70, backY + 8, top + 4); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#2a2438'); px.rect(g, a[0] + 3, a[1] + 12, b[0] - a[0] - 6, b[1] - a[1] - 14, '#1a3a4a'); px.blend(g, .5, 'add', () => px.rect(g, a[0] + 3, a[1] + 12, b[0] - a[0] - 6, 2, c)); E.font.text(g, name, (a[0] + b[0]) / 2, a[1] + 3, c, { align: 'center', font: 'tiny', outline: false }); }, { emissive: true }); });
      const fx2 = Rink.X1 + 50, fy2 = Rink.C.y - 140; r.queue(fx2, fy2, 0, g => { const q = r.w(fx2, fy2, 0); px.ell(g, q[0], q[1], 22, 12, '#a8a0b8'); px.ell(g, q[0], q[1] - 1, 18, 9, '#4ab8e8'); for (let k = 0; k < 5; k++) { const h = 6 + Math.abs(Math.sin(t * 6 + k)) * 6; px.line(g, q[0] - 6 + k * 3, q[1] - 2, q[0] - 6 + k * 3, q[1] - 2 - h, '#cfefff'); } }, { emissive: false });
      for (const side of [0, 1]) { const x = side ? Rink.X1 + 40 : Rink.X0 - 40; r.queue(x, Rink.C.y + 40, 0, g => r.box(g, x - 10, Rink.C.y + 20, 0, x + 10, Rink.C.y + 60, 30, '#c8c0d8', '#8a8098')); }
      // the claw of the Discount Drop
      if (m) for (const c of m.extras) if (c.kind === 'crate' && !c.done) r.queue(c.x, c.y, c.z, g => { const q = r.w(c.x, c.y, c.z), top2 = r.w(c.x, c.y, 160); px.line(g, top2[0], top2[1], q[0], q[1] - 10, '#a8a8b8'); r.box(g, c.x - 8, c.y - 8, c.z, c.x + 8, c.y + 8, c.z + 14, '#c8945a', '#8a5a32'); E.font.text(g, 'SALE', q[0], q[1] - 12, '#ff4ab8', { font: 'tiny', align: 'center', outline: false }); });
    }
    if (A.id === 'dome') {
      for (const [x, y] of [[Rink.X0 - 24, Rink.Y0 - 24], [Rink.X1 + 24, Rink.Y0 - 24], [Rink.X0 - 24, Rink.Y1 + 30], [Rink.X1 + 24, Rink.Y1 + 30]]) {
        r.queue(x, y, 0, g => r.box(g, x - 7, y - 7, 0, x + 7, y + 7, 22, '#3a3a44', '#24242c'));
        if (m && (m.phase === 'goal' || m.kaboom[0] > 0 || m.kaboom[1] > 0) && RNG.fx() < .5) P.fire(x, y, 24, 2, { size: 1.6 });
      }
      if (A.lasers) r.overlay(g => { const k = Math.floor(t * 2) % 3; px.blend(g, .18, 'add', () => { for (let i = 0; i < 4; i++) { const a = t * .8 + i * 1.6, x0 = r.W * (.15 + i * .23); px.line(g, x0, 0, x0 + Math.sin(a) * r.W * .4, r.H * .6, ['#ff3a6a', '#3affea', '#ffe03a'][(i + k) % 3], 1); } }); });
      if (Replay.on) r.overlay(g => { px.rect(g, 0, 0, r.W, 3, '#d9a520'); px.rect(g, 0, r.H - 3, r.W, 3, '#d9a520'); });
    }
  }
  return { lights, draw };
})();

/* ---- 37-save.js ---- */
/* ---- SAVE: the Cup Run's progress (stars per chapter, choices, the ending, unlocks, drills) through game.saves'
 * autosave; RECORDS: big numbers kept in E.store (hardest shot, biggest hit, most goals, fights won, KABOOMs) ---- */
const Save = (() => {
  const fresh = () => ({ v: 1, stars: {}, choices: {}, done: {}, drills: {}, finished: false, badge: false });
  let data = fresh();
  game.saves.write = () => ({ data: JSON.parse(JSON.stringify(data)), place: 'Cup Run', level: 'Chapter ' + Math.min(5, nextChapter()) });
  game.saves.read = save => { if (save && save.data) data = Object.assign(fresh(), save.data); };
  function load() { if (HUB) return; try { const s = game.saves.latest && game.saves.latest(); if (s) { const got = game.saves.load(s.slot !== undefined ? s.slot : 'auto'); if (!got && s.data) data = Object.assign(fresh(), s.data); } } catch (e) { data = fresh(); } }
  function write() { if (HUB) return; try { game.saves.autosave(); } catch (e) { game.fail('save', e); } }
  const totalStars = () => Object.values(data.stars).reduce((a, s) => a + (s ? s.filter(Boolean).length : 0), 0);
  const nextChapter = () => { for (let n = 1; n <= 5; n++) if (!data.done[n]) return n; return 6; };
  const unlocked = n => n === 1 || !!data.done[n - 1];
  /** the cheats a player has unlocked by stars (11.3) */
  const CHEATS = [['bigHeads', 'BIG HEADS', 3], ['octoRain', 'OCTOPUS RAIN', 6], ['glowPuck', 'GLOW PUCK', 9], ['alwaysKaboom', 'ALWAYS KABOOM', 12], ['retro', 'RETRO RIGS', 15]];
  const cheatsOpen = () => CHEATS.filter(c => totalStars() >= c[2]);
  function chapterResult(n, stars, won) {
    const old = data.stars[n] || [false, false, false]; data.stars[n] = old.map((v, i) => v || !!stars[i]);
    if (won) data.done[n] = true; if (n === 5 && won) data.finished = true;
    write();
  }
  function drillDone(n) { data.drills[n] = true; if (Object.keys(data.drills).length >= 7) data.badge = true; write(); }
  function reset() { data = fresh(); write(); }
  return { load, write, totalStars, nextChapter, unlocked, CHEATS, cheatsOpen, chapterResult, drillDone, reset, get data() { return data; }, set data(v) { data = v; } };
})();
const Records = (() => {
  const KEY = 'ihk:records';
  const get = () => Object.assign({ shot: 0, hit: 0, goals: 0, fights: 0, kabooms: 0, games: 0, wins: 0 }, HUB ? {} : E.store.get(KEY, {}) || {});
  const put = r => { if (!HUB) E.store.set(KEY, r); };
  function wire() {
    Bus.sim('shot', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract') return; const s = m.byId(e.by); if (!s || s.ctrl.kind === 'cpu') return; const r = get(); if (e.speed > r.shot) { r.shot = e.speed; put(r); } });
    Bus.sim('hit', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || !e.big) return; const s = m.byId(e.by); if (!s || s.ctrl.kind === 'cpu') return; const r = get(); if (e.power > r.hit) { r.hit = e.power; put(r); } });
    Bus.sim('fight_end', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || e.draw) return; const s = m.byId(e.winner); if (!s || !m.teams[s.team].human) return; const r = get(); r.fights++; put(r); });
    Bus.sim('kaboom_start', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || !m.teams[e.team].human) return; const r = get(); r.kabooms++; put(r); });
    Bus.sim('final', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || m.cfg.mode === 'drill') return; const r = get(); r.games++; const ht = m.teams.findIndex(t => t.human); if (ht >= 0 && e.winner === ht) r.wins++; for (const s of m.skaters) if (s.ctrl.kind !== 'cpu' || m.teams[s.team].human) r.goals = Math.max(r.goals, s.stats.goals); put(r); });
  }
  return { get, put, wire };
})();

/* ---- 40-scene-title.js ---- */
/* ---- TITLE (12.1): the Ol' Icebox at night, spotlights sweeping the ice, two teams skating lazily (the real AI), the
 * logo slamming in, PRESS ANY BUTTON, then six big tiles: CUP RUN, EXHIBITION, PRACTICE, RECORDS, SETTINGS, ABOUT.
 * Touch-only devices: "Controller or keyboard required" and a big SETTINGS button. 10 s idle: the attract reel ---- */
const Title = (() => {
  const st = { sawPad: false, sawKey: false };
  if (!NODE && typeof addEventListener !== 'undefined') { addEventListener('keydown', () => { st.sawKey = true; }, true); addEventListener('gamepadconnected', () => { st.sawPad = true; }); }
  /** a lazy AI game behind the title and menus */
  function background() {
    const homes = Save.data.finished ? ['muskrats'] : ['muskrats'], away = ['drillers', 'lumberjacks', 'bruisers', 'marauders'][Math.floor(RNG.fx() * 4)];
    const m = Match.create({ mode: 'title', home: homes[0], away, arena: 'icebox', humans: [], intros: false, replays: 'off', rules: { fights: false, items: false, hazards: false, clock: false, boom: false }, seed: Math.floor(RNG.fx() * 1e6) });
    m.setPhase('intro', .1); return m;
  }
  return { st, background, get sawPad() { return st.sawPad; }, get sawKey() { return st.sawKey; } };
})();

scenes.title = {
  view: 'threequarter', views: ['threequarter'], camera: { zoom: false },
  enter(d) {
    d = d || {};
    this.state = d.menu ? 'menu' : 'press'; this.t = 0; this.slam = d.menu ? 1 : 0;
    this.m = Title.background(); World.prepare(this.m); L.enabled = true; L.ambient = .42; Cam.snap(Rink.C.x, Rink.C.y);
    Synth.music('theme');
    const S2 = Save, cont = S2.totalStars() > 0 || Object.keys(S2.data.done).length;
    this.tiles = new UI.Tiles([
      { id: 'cup', label: 'CUP RUN', sub: cont ? (S2.data.finished ? 'CUP WON · REPLAY IT' : 'CONTINUE · CHAPTER ' + Math.min(5, S2.nextChapter())) : 'NEW · SAVE THE ICEBOX', icon: (g, x, y, w, h) => Cup.draw(g, x + w / 2, y + 14, 1) },
      { id: 'exh', label: 'EXHIBITION', sub: '1-4 PLAYERS', icon: (g, x, y, w, h) => { Logo.draw(g, 'muskrats', x + w / 2 - 22, y + 5, 20); Logo.draw(g, 'drillers', x + w / 2 + 2, y + 5, 20); } },
      { id: 'prac', label: 'PRACTICE', sub: "MARGE'S 7 DRILLS", icon: (g, x, y, w, h) => { px.rect(g, x + w / 2 - 10, y + 8, 20, 14, '#1a3a20'); px.rect(g, x + w / 2 - 9, y + 9, 18, 12, '#2a5a30'); E.font.text(g, 'X O', x + w / 2, y + 12, '#ffffff', { align: 'center', font: 'tiny', outline: false }); } },
      { id: 'rec', label: 'RECORDS', sub: 'STARS, SHOTS, HITS', icon: (g, x, y, w, h) => E.font.text(g, '★', x + w / 2, y + 8, UI.GOLD, { align: 'center', scale: 2, outline: '#000' }) },
      { id: 'set', label: 'SETTINGS', sub: 'CAMERA, SOUND, CONTROLS', icon: (g, x, y, w, h) => { px.disc(g, x + w / 2, y + 15, 7, '#9fb2cc'); px.disc(g, x + w / 2, y + 15, 3, '#0e1830'); } },
      { id: 'about', label: 'ABOUT', sub: 'CREDITS AND NOTES', icon: (g, x, y, w, h) => E.font.text(g, '?', x + w / 2, y + 8, '#7ab8ff', { align: 'center', scale: 2, outline: '#000' }) }
    ], { cols: 3, w: 116, h: 54, gap: 8, i: d.tile || 0, onPick: it => this.pick(it.id) });
    UI.Idle.reset(); game.input.consumeAll();
  },
  pick(id) {
    if (id === 'cup') game.go('storymap', null, { fade: 'wipe' });
    else if (id === 'exh') game.go('sides', null, { fade: 'wipe' });
    else if (id === 'prac') game.go('practice', null, { fade: 'wipe' });
    else if (id === 'rec') game.go('records', null, { fade: 'wipe' });
    else if (id === 'set') game.menu('settings');
    else if (id === 'about') game.go('about', null, { fade: 'wipe' });
  },
  update(dt) {
    this.t += dt; this.slam = Math.min(1, this.slam + dt * 2.2);
    const m = this.m; Match.m = m;
    Match.step(dt); Crowd.step(dt, m); Fx.frame(m, dt); Cam.update(m, dt, { zoom: .66 });
    if (m.phase === 'goal' && m.phaseT < -2.5) Match.placeFaceoff(m, 'center');
    if (game.paused || (game.shell && game.shell.screen)) { UI.Idle.reset(); return; }
    const idle = UI.Idle.step(dt);
    if (idle > 10) return game.go('attract', null, { fade: 'dissolve' });
    const touch = touchOnly();
    if (touch) { const ck = game.input.clicked(); if (ck && this.setBtn && ck[0] >= this.setBtn[0] && ck[0] < this.setBtn[0] + this.setBtn[2] && ck[1] >= this.setBtn[1] && ck[1] < this.setBtn[1] + this.setBtn[3]) game.menu('settings'); return; }
    if (this.state === 'press') {
      if (this.t > .5 && game.players.some(I => I.anyPressed()) || game.input.clicked()) { this.state = 'menu'; Synth.horn(false, 1.4); P.explosion(Rink.C.x, Rink.C.y, 20, 1.2, { freeze: false, shake: 0, debris: false }); game.players.forEach(I => I.consumeAll()); Synth.sfx('menuSel'); }
      return;
    }
    this.tiles.update(dt);
    if (UI.anyP('cancel')) { this.state = 'press'; Synth.sfx('menuBack'); }
  },
  draw(r) {
    const m = this.m; World.draw(r, m);
    const t = game.real;
    // spotlights sweeping the ice
    for (let i = 0; i < 3; i++) { const x = Rink.C.x + Math.sin(t * .5 + i * 2.1) * 300, y = Rink.C.y + Math.cos(t * .37 + i) * 120; L.add(x, y, 40, 110, 1.1, { color: ['#ffffff', '#ffe8c0', '#cfe8ff'][i] }); }
    r.overlay(g => {
      px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#5a6a8a'));
      const s = this.slam, k = s < 1 ? 1 + (1 - E.ease.outBack(s)) * 2 : 1, logoY = this.state === 'press' ? r.H * .22 : 10, fit = Math.floor((r.W - 16) / Math.max(1, E.font.width('ICE HOC-KABOOM'))), sc = Math.max(1, Math.min(fit, Math.round((r.W > 400 ? 5 : 4) * k * (this.state === 'menu' ? .8 : 1))));
      E.font.title(g, 'ICE HOC-KABOOM', r.W / 2 + (s < 1 ? Math.sin(t * 60) * (1 - s) * 4 : 0), logoY, { align: 'center', scale: sc, colors: ['#ffffff', '#cfe8ff', '#ffb347', '#ff6a2a', '#c8202a'], depth: 4, depthColor: '#1a0a14' });
      if (Save.data.finished) Cup.draw(g, r.W / 2 + E.font.width('ICE HOC-KABOOM', { scale: sc }) / 2 + 14, logoY + sc * 3, 1.4);
      const touch = touchOnly();
      if (touch) {
        const bs = r.W >= 420 ? 2 : 1, bw = Math.min(r.W - 12, 300); UI.panel(g, r.W / 2 - bw / 2, r.H * .5, bw, 40, { border: '#ff8a8a' }); E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H * .5 + (bs > 1 ? 8 : 10), '#ffffff', { align: 'center', scale: bs, outline: '#000' });
        E.font.text(g, bs > 1 ? 'Connect a gamepad or a keyboard to play. The demo plays on.' : 'Connect a gamepad or keyboard.', r.W / 2, r.H * .5 + 26, UI.MUTED, { align: 'center', outline: false });
        this.setBtn = [r.W / 2 - 60, r.H * .5 + 50, 120, 30]; UI.panel(g, this.setBtn[0], this.setBtn[1], 120, 30, { focus: true }); E.font.text(g, 'SETTINGS', r.W / 2, this.setBtn[1] + 10, UI.GOLD, { align: 'center', scale: 2, outline: '#000' });
      } else if (this.state === 'press') {
        E.font.text(g, 'OVER-THE-TOP 3-ON-3 ARCADE HOCKEY', r.W / 2, logoY + sc * 9 + 6, '#ffe8a0', { align: 'center', outline: '#000' });
        if (Math.floor(t * 2) % 2 === 0) Glyphs.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H * .7, { align: 'center', color: '#ffffff', scale: 2 });
      } else {
        this.tiles.y = Math.max(logoY + 46, Math.round(r.H / 2 - 50)); this.tiles.draw(g, r);
        const it = this.tiles.items[this.tiles.i], key = { cup: 'cuprun', exh: 'exhibition', prac: 'practice', rec: 'records', set: 'settings', about: 'about' }[it.id];
        E.font.text(g, TEXT.blurbs[key], r.W / 2, this.tiles.y + 124, '#cfe0f4', { align: 'center', outline: '#000' });
        UI.legend(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
      }
      E.font.text(g, E.versionLabel() + ' · ' + GAME_TITLE + ' ' + VERSION, 6, r.H - 10, '#6a7a90', { outline: false });
    });
  }
};

/* ---- 41-scene-attract.js ---- */
/* ---- ATTRACT MODE (15.1): after 10 s without input on a title or menu screen, a looping reel built on the real game
 * with every skater on the AI and the cheats free: Puck Drop, Big Hits, Highlight Goal, Gloves Off, KABOOM!, Fan Frenzy,
 * a Story teaser, the Flood Wagon and a Records card (about 75 s), then again with new teams and a new barn. Any input
 * (not a touch-only tap) ends it, consumed, back to the title ---- */
const Attract = (() => {
  const SEG = [['drop', 8], ['hits', 8], ['goal', 12], ['fight', 10], ['kaboom', 10], ['fans', 7], ['story', 8], ['flood', 6], ['records', 5]];
  const st = { i: -1, t: 0, loop: 0, visited: {}, m: null, cut: null, on: false };
  function newMatch() {
    const arena = ARENA_ORDER[st.loop % ARENA_ORDER.length], home = ARENAS[arena].home === 'grizzlies' && !Save.data.finished ? 'muskrats' : ARENAS[arena].home;
    const pool = TEAM_ORDER.filter(id => id !== home && (!TEAMS[id].locked || Save.data.finished)), away = pool[st.loop % pool.length];
    const m = Match.create({ mode: 'attract', home, away, arena, humans: [], intros: true, replays: 'auto', flood: 'never', periodLen: 600, cheats: { allTurbo: true }, rules: { clock: false }, seed: 9000 + st.loop, difficulty: 'legend' });
    m.intro = { order: m.skaters.slice(0, 2).concat(m.goalies.slice(0, 1)), i: 0, t: 0, focus: null, skip: false }; m.setPhase('intro', 99);
    st.m = m; World.prepare(m); Cam.snap(Rink.C.x, Rink.C.y); L.enabled = true; L.ambient = m.arena.ambient; game.weather = m.arena.weather || null;
    Synth.music(m.arena.music === 'play' ? 'theme' : m.arena.music);
    return m;
  }
  function begin(i) {
    st.i = i; st.t = 0; const [id] = SEG[i]; st.visited[id] = (st.visited[id] || 0) + 1; st.cut = null;
    const m = st.m;
    if (id === 'drop') { newMatch(); return; }
    if (!m) return;
    const t0 = m.teams[0], t1 = m.teams[1], dir = m.attackDir(0);
    if (id === 'hits') {
      if (m.phase !== 'play') Match.placeFaceoff(m, 'center'), m.setPhase('play');
      const a = t0.skaters[2], b = t1.skaters[0], p = Rink.panels.find(q => q.side === 'n' && q.i === 6);
      Puck.loose(m, m.puck); m.puck.x = Rink.C.x - 60; m.puck.y = Rink.C.y + 80; m.puck.vx = m.puck.vy = 0;
      b.x = p.mx; b.y = Rink.Y0 + 14; b.vx = 0; b.vy = 0; Skater.setState(b, 'skate'); a.x = p.mx - 150; a.y = Rink.Y0 + 60; a.vx = 230; a.vy = -60; a.facing = Math.atan2(-60, 230); p.state = 'cracked';
      st.forced = { att: a, vic: b, hit: false };
    }
    if (id === 'goal') {
      m.setPhase('play'); const c = t0.skaters[0], w = t0.skaters[1], d = t1.skaters[2], gx = Rink.goalX(m.attackNet(0));
      c.x = gx - dir * 190; c.y = Rink.C.y - 60; w.x = gx - dir * 120; w.y = Rink.C.y + 70; d.x = gx - dir * 110; d.y = Rink.C.y - 10;
      for (const s of [c, w, d]) { s.vx = dir * 120; s.vy = 0; Skater.setState(s, 'skate'); }
      Object.assign(m.puck, Puck.make()); Puck.setOwner(m, m.puck, c, 'attract');
      st.forced = { carrier: c, wing: w, passed: false };
    }
    if (id === 'fight') { if (m.phase !== 'play') m.setPhase('play'); const a = t0.skaters[2], b = t1.skaters[2]; a.x = Rink.C.x - 10; a.y = Rink.C.y; b.x = Rink.C.x + 10; b.y = Rink.C.y; Fight.start(m, a, b); }
    if (id === 'kaboom') {
      if (m.fight) { m.fight = null; for (const s of m.skaters) { s.fight = null; if (s.state === 'fight' || s.state === 'bin') Skater.setState(s, 'skate'); } }
      m.setPhase('play'); Boom.start(m, 0); const c = t0.skaters[0], gx = Rink.goalX(m.attackNet(0));
      c.x = gx - dir * 170; c.y = Rink.C.y + 20; c.vx = dir * 60; Object.assign(m.puck, Puck.make()); Puck.setOwner(m, m.puck, c, 'attract');
      for (const o of t1.skaters) { o.x = Rink.C.x - dir * 120; o.y = Rink.C.y + (o.slot - 1) * 80; }
      st.forced = { shooter: c, fired: false };
    }
    if (id === 'fans') { if (m.phase !== 'play') m.setPhase('play'); for (const k of ['hotsauce', 'poutine', 'boombox', 'tape']) Items.toss(m, k); const it = Items.toss(m, 'octopus'); st.forced = { octo: it }; }
    if (id === 'story') { st.cut = Cutscene.run('teaser', { attract: true, done: () => {} }); game.setView('brawler'); game.setZoom(1.05); game.cam.bounds = null; Synth.music('locker'); }
    if (id === 'flood') { game.setView('threequarter'); game.setZoom(.72); World.prepare(m); for (let k = 0; k < 200; k++) Rink.addScuff(Rink.X0 + 30 + RNG.fx() * 800, Rink.Y0 + 30 + RNG.fx() * 330, .5); Flood.begin({ auto: true }); Synth.music('flood'); }
    if (id === 'records') { Synth.music('theme'); }
  }
  function step(dt) {
    st.t += dt;
    const [id, dur] = SEG[st.i], m = st.m;
    if (id !== 'story' && id !== 'flood' && id !== 'records' && m) {
      Match.m = m;
      if (m.phase === 'intro' && m.intro) introStep(m, dt);
      Match.step(dt);
      const F = st.forced;
      if (id === 'hits' && F && !F.hit) { const a = F.att, b = F.vic; a.intent.mx = Math.sign(b.x - a.x) * .9; a.intent.my = (b.y - a.y) / 60; a.intent.held.turbo = true; a.ai.thinkT = 9; a.ai.tx = b.x; a.ai.ty = b.y; if (U.dist(a, b) < 34 && a.state === 'skate') { a.intent.press.shoot = true; F.hit = true; } b.intent.mx = 0; b.intent.my = -.2; }
      if (id === 'goal' && F) { const c = F.carrier; if (!F.passed && m.puck.owner === c && st.t > 1.2) { F.passed = true; c.passPick = F.wing.id; Shots.pass(m, c, false); F.wing.otArmed = 1; m.cheats.noGoalies = true; } if (F.passed && st.t > 3.2) m.cheats.noGoalies = false; F.wing.intent.held.shoot = F.passed && !m.puck.owner; }
      if (id === 'kaboom' && F && !F.fired && m.puck.owner === F.shooter && st.t > .8) { F.fired = true; F.shooter.ai.shootHold = .18 + T.slapCharge / 2 + .1; F.shooter.ai.shootT = F.shooter.ai.shootHold; F.shooter.intent.press.shoot = true; F.shooter.ai.thinkT = 2; }
      if (id === 'fans' && F && F.octo && !F.done && !F.octo.air && st.t > 1.5) { const s = m.teams[0].skaters[1]; s.x = F.octo.x - 60; s.y = F.octo.y; s.vx = 220; s.vy = 0; s.ai.tx = F.octo.x + 60; s.ai.ty = F.octo.y; s.ai.thinkT = 2; F.done = true; }
      if (m.phase === 'final') Match.placeFaceoff(m, 'center');
      Cam.update(m, dt); Talk.step(dt); Crowd.step(dt, m); Fx.frame(m, dt);
    } else if (id === 'story' && st.cut) { game.focus(170, 60, 18); st.cut.update(dt); if (st.cut.talk && !st.cut.talk.open && st.cut.i >= 0 && !st.cut.done) {} }
    else if (id === 'flood') { Flood.step(dt, null); const c = Flood.car; if (c) game.focus(c.x, c.y, 10); }
    if (st.t >= dur) { if (st.i + 1 >= SEG.length) { st.loop++; begin(0); } else { if (id === 'story' || id === 'flood') { game.setView('threequarter'); game.setZoom(.72); if (st.m) World.prepare(st.m); } begin(st.i + 1); } }
  }
  function drawRecords(g, r) {
    const R2 = Records.get();
    UI.panel(g, r.W / 2 - 150, 40, 300, 160, {});
    E.font.title(g, 'ICE HOC-KABOOM', r.W / 2, 50, { align: 'center', scale: 3 });
    E.font.text(g, 'TOP RECORDS', r.W / 2, 80, UI.GOLD, { align: 'center', outline: false });
    [['HARDEST SHOT', R2.shot ? U.kmh(R2.shot) + ' KM/H' : '—'], ['BIGGEST HIT', R2.hit ? R2.hit + ' POW' : '—'], ['MOST GOALS IN A GAME', R2.goals || '—'], ['CUP RUN STARS', Save.totalStars() + '/15']].forEach(([a, b], i) => { E.font.text(g, a, r.W / 2 - 130, 98 + i * 16, '#cfe0f4', { outline: false }); E.font.text(g, String(b), r.W / 2 + 130, 98 + i * 16, '#ffffff', { align: 'right', outline: false }); });
  }
  return { SEG, st, begin, step, drawRecords, state: () => ({ segment: st.i >= 0 ? SEG[st.i][0] : null, visited: Object.keys(st.visited), loop: st.loop }), newMatch };
})();

scenes.attract = {
  view: 'threequarter', views: ['threequarter', 'brawler', 'topdown'], camera: { zoom: false },
  enter() { Attract.st.visited = {}; Attract.st.on = true; Attract.begin(0); this.t = 0; game.input.consumeAll(); },
  exit() { Attract.st.on = false; game.weather = null; game.setView('threequarter'); game.setZoom(1); },
  update(dt) {
    this.t += dt;
    if (this.t > .5 && !touchOnly() && UI.anyInput()) { game.players.forEach(I => I.consumeAll()); game.go('title', { menu: false }, { fade: 'dissolve' }); return; }
    if (touchOnly()) { const ck = game.input.clicked(); if (ck && ck[1] < 40 && ck[0] > game.W - 120) game.menu('settings'); }
    Attract.step(dt);
  },
  draw(r) {
    const st = Attract.st, id = st.i >= 0 ? Attract.SEG[st.i][0] : 'drop';
    if (id === 'story' && st.cut) st.cut.draw(r);
    else if (id === 'records') { r.sky(['#060a18', '#0e1a34', '#18284a']); r.overlay(g => Attract.drawRecords(g, r)); }
    else if (id === 'flood' && st.m) { const map = World.map; map.drawFloor(r); Rink.drawScuff(r); Rink.drawBoards(r, st.m.arena.id, st.m.teams[0].def.dark, game.real); Rink.drawNets(r, game.real); Crowd.draw(r, st.m); map.queueWalls(r); Flood.draw(r); }
    else if (st.m) { World.draw(r, st.m); Hud.draw(r, st.m); Talk.draw(r); }
    r.overlay(g => {
      UI.panel(g, 6, 6, 44, 14, { border: '#ff4a4a' }); E.font.text(g, 'DEMO', 28, 9, '#ff6a6a', { align: 'center', outline: false });
      E.font.title(g, 'ICE HOC-KABOOM', r.W - 8, r.H - 40, { align: 'right', scale: 1, colors: ['#ffffff', '#ffb347', '#ff6a2a'] });
      if (Math.floor(game.real * 2) % 2 === 0) { if (touchOnly()) E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H - 22, '#ffffff', { align: 'center', outline: '#000' }); else Glyphs.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 22, { align: 'center', color: '#ffffff' }); }
    });
  }
};

/* ---- 42-scene-exhibition.js ---- */
/* ---- EXHIBITION (12.2, 12.3): SIDES (every joined player a token; push left for HOME, right for AWAY, ✕ ready; Start on
 * a free pad or 2 on the keyboard joins) and SETUP (three big cards, HOME / ARENA / AWAY, then option chips; FACE OFF!) ---- */
const Setup = (() => {
  const st = { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: null, diff: null, cheat: 'off', sides: [] };
  const teams = () => TEAM_ORDER.filter(id => !TEAMS[id].locked || Save.data.finished);
  /** a match config for deep links, the dev panel and quick tests */
  function quickCfg(d = {}) {
    const home = TEAMS[d.home] ? d.home : 'muskrats', away = TEAMS[d.away] && d.away !== home ? d.away : home === 'drillers' ? 'muskrats' : 'drillers', arena = ARENAS[d.arena] ? d.arena : 'icebox';
    const cfg = { mode: 'exhibition', home, away, arena, humans: [{ team: 0, input: game.input, name: 'P1' }], intros: false, flood: 'never' };
    if (d.warp) cfg.onStart = m => { game.after(.3, () => Dev.warp(d.warp)); };
    if (d.dev) cfg.onStart = m => { game.after(.3, () => Dev.open()); };
    return cfg;
  }
  /** the configured exhibition */
  function cfg() {
    const humans = [];
    st.sides.forEach((p, i) => { if (p.side >= 0) humans.push({ team: p.side, input: p.input, name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], tag: 'P' + (i + 1) }); });
    const cheats = {}; if (st.cheat === 'all') for (const c of Save.cheatsOpen()) cheats[c[0]] = true; else if (st.cheat !== 'off') cheats[st.cheat] = true;
    return { mode: 'exhibition', home: st.home, away: st.away, arena: st.arena, periods: st.periods, periodLen: st.len || +S('periodLen') || 120, difficulty: st.diff || S('difficulty'), humans, cheats, seed: (Date.now() % 1e9) | 0 };
  }
  return { st, quickCfg, cfg, teams };
})();

scenes.sides = {
  enter() {
    game.allowJoin({ max: 4, onJoin: (input, n) => { Synth.sfx('menuSel'); syncSides(); } });
    syncSides(); Setup.st.sides.forEach((p, i) => { p.ready = false; }); Synth.music('menu'); UI.Idle.reset();
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    syncSides();
    const S2 = Setup.st.sides;
    for (const p of S2) {
      const I = p.input;
      if (I.repeat('left', .3, .2) && !p.ready) { p.side = p.side === 1 ? -1 : 0; Synth.sfx('menuMove'); }
      if (I.repeat('right', .3, .2) && !p.ready) { p.side = p.side === 0 ? -1 : 1; Synth.sfx('menuMove'); }
      if (I.pressed('confirm')) { p.ready = !p.ready; Synth.sfx(p.ready ? 'menuSel' : 'menuBack'); }
      if (I.pressed('cancel')) { if (p.ready) p.ready = false; else if (p === S2[0]) { Synth.sfx('menuBack'); game.go('title', { menu: true }); return; } }
    }
    // the mouse moves the keyboard player's token (a click on HOME or AWAY)
    const ck = game.input.clicked(); if (ck && this.boxes) { const k = this.boxes.findIndex(b => ck[0] >= b[0] && ck[0] < b[0] + b[2] && ck[1] >= b[1] && ck[1] < b[1] + b[3]); if (k >= 0) { S2[0].side = [0, -1, 1][k]; Synth.sfx('menuMove'); } if (this.goBox && ck[0] >= this.goBox[0] && ck[0] < this.goBox[0] + this.goBox[2] && ck[1] >= this.goBox[1] && ck[1] < this.goBox[1] + this.goBox[3]) S2.forEach(p => { p.ready = true; }); }
    if (S2.length && S2.every(p => p.ready)) { game.players.forEach(I => I.consumeAll()); game.go('setup', null, { fade: 'wipe' }); }
  },
  draw(r) {
    r.sky(['#0a1430', '#122248', '#1a3060']);
    r.overlay(g => {
      UI.title(g, 'CHOOSE SIDES', r.W / 2, 14, 3);
      const S2 = Setup.st.sides, cw = Math.min(130, (r.W - 40) / 3), x0 = r.W / 2 - cw * 1.5, y0 = 48, h = Math.min(r.H - 130, 118);
      this.boxes = [];
      ['HOME', 'CPU', 'AWAY'].forEach((lab, k) => { const x = x0 + k * cw + 4; UI.panel(g, x, y0, cw - 8, h, { border: k === 1 ? '#3a4a6a' : k === 0 ? '#e8b43a' : '#7ab8ff' }); E.font.text(g, lab, x + (cw - 8) / 2, y0 + 6, k === 1 ? UI.MUTED : UI.GOLD, { align: 'center', scale: 2, outline: '#000' }); this.boxes.push([x, y0, cw - 8, h]); });
      S2.forEach((p, i) => { const col = [1, 0, 2][p.side + 1], x = x0 + col * cw + cw / 2, y = y0 + 34 + i * 22; const c = E.PLAYER_COLORS[i];
        UI.panel(g, x - 40, y, 80, 18, { border: c, focus: p.ready, bg: p.ready ? ['#1c3a20', '#0a1a0c'] : undefined }); E.font.text(g, 'P' + (i + 1) + (p.ready ? ' ✓' : ''), x - 30, y + 6, c, { outline: '#000' }); E.font.text(g, p.input.half ? (p.input.half === 'left' ? 'WASD' : 'ARROWS') : p.input.pad !== undefined && p.input.pad !== null && p.input !== game.input ? 'PAD ' + (p.input.pad + 1) : Glyphs.dev(p.input) === 'gamepad' ? 'PAD' : 'KEYS', x + 34, y + 6, UI.MUTED, { align: 'right', font: 'tiny', outline: false }); if (p.ready) E.font.text(g, 'READY', x, y + 20, '#7ad87a', { align: 'center', font: 'tiny', outline: false }); });
      E.font.text(g, 'Press START on a free controller, or 2 on the keyboard, to join', r.W / 2, y0 + h + 6, '#cfe0f4', { align: 'center', outline: false });
      if (S2.some(p => p.input.half)) E.font.text(g, 'P1: WASD + F pass  G shoot  H deke  R saucer  T turbo     P2: ARROWS + . pass  / shoot  , deke  L saucer', r.W / 2, y0 + h + 17, UI.MUTED, { align: 'center', font: 'tiny', outline: false });
      this.goBox = [r.W / 2 - 50, r.H - 38, 100, 16]; UI.panel(g, this.goBox[0], this.goBox[1], 100, 16, { border: UI.GOLD }); E.font.text(g, 'ALL READY', r.W / 2, r.H - 34, UI.GOLD, { align: 'center', outline: '#000' });
      UI.legend(g, r, [['left', 'HOME / AWAY'], ['confirm', 'READY'], ['cancel', 'BACK']]);
    });
  }
};
function syncSides() {
  const S2 = Setup.st.sides, P2 = game.players;
  for (let i = 0; i < P2.length; i++) if (!S2[i] || S2[i].input !== P2[i]) S2[i] = { input: P2[i], side: i === 0 ? 0 : i === 1 ? 1 : i % 2 ? 1 : 0, ready: false };
  S2.length = P2.length;
}

scenes.setup = {
  enter() { this.i = 0; Setup.st.len = Setup.st.len || +S('periodLen') || 120; Setup.st.diff = Setup.st.diff || S('difficulty'); Synth.music('menu'); UI.Idle.reset(); },
  rows: ['home', 'arena', 'away', 'periods', 'len', 'diff', 'cheat', 'go'],
  change(k, d) {
    const st = Setup.st, tl = Setup.teams();
    const cyc = (list, v) => list[(list.indexOf(v) + d + list.length) % list.length];
    if (k === 'home') { st.home = cyc(tl, st.home); if (st.home === st.away) st.home = cyc(tl, st.home); }
    if (k === 'away') { st.away = cyc(tl, st.away); if (st.home === st.away) st.away = cyc(tl, st.away); }
    if (k === 'arena') st.arena = cyc(ARENA_ORDER, st.arena);
    if (k === 'periods') st.periods = cyc([1, 2, 3], st.periods);
    if (k === 'len') st.len = cyc([60, 90, 120, 180, 240], st.len);
    if (k === 'diff') st.diff = cyc(Match.DIFF_ORDER, st.diff);
    if (k === 'cheat') { const opts = ['off', ...Save.cheatsOpen().map(c => c[0])]; if (opts.length > 2) opts.push('all'); st.cheat = cyc(opts, st.cheat); }
    Synth.sfx('menuMove');
  },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    const rows = this.rows;
    if (UI.anyRep('up')) { this.i = (this.i + rows.length - 1) % rows.length; Synth.sfx('menuMove'); }
    if (UI.anyRep('down')) { this.i = (this.i + 1) % rows.length; Synth.sfx('menuMove'); }
    if (UI.anyRep('left')) this.change(rows[this.i], -1); if (UI.anyRep('right')) this.change(rows[this.i], 1);
    const p = UI.pointer(); if (p && UI.mouseMoved && this.hits) { const k = this.hits.findIndex(h => p[0] >= h.x && p[0] < h.x + h.w && p[1] >= h.y && p[1] < h.y + h.h); if (k >= 0 && this.hits[k].i !== this.i) { this.i = this.hits[k].i; Synth.sfx('menuMove'); } }
    const ck = game.input.clicked(); if (ck && this.hits) { const h = this.hits.find(h => ck[0] >= h.x && ck[0] < h.x + h.w && ck[1] >= h.y && ck[1] < h.y + h.h); if (h) { this.i = h.i; if (h.d) this.change(rows[h.i], h.d); else if (rows[h.i] === 'go') return this.go(); else this.change(rows[h.i], 1); } }
    if (UI.anyP('confirm') || UI.anyP('start')) { if (rows[this.i] === 'go' || UI.anyP('start')) return this.go(); this.change(rows[this.i], 1); }
    if (UI.anyP('cancel')) { Synth.sfx('menuBack'); game.go('sides'); }
  },
  go() { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); game.go('match', { cfg: Setup.cfg() }, { fade: 'iris' }); },
  draw(r) {
    r.sky(['#0a1430', '#122248', '#1a3060']);
    const st = Setup.st, rows = this.rows;
    r.overlay(g => {
      UI.title(g, 'EXHIBITION', r.W / 2, 8, 3);
      this.hits = [];
      const cw = Math.min(124, (r.W - 30) / 3), ch = 104, x0 = r.W / 2 - cw * 1.5, y0 = 40;
      const card = (k, i, x) => {
        const f = rows[this.i] === k; UI.panel(g, x + 3, y0, cw - 6, ch, { focus: f }); this.hits.push({ x: x + 3, y: y0, w: cw - 6, h: ch, i: rows.indexOf(k) });
        this.hits.push({ x: x + 3, y: y0 + ch / 2 - 10, w: 14, h: 20, i: rows.indexOf(k), d: -1 }, { x: x + cw - 17, y: y0 + ch / 2 - 10, w: 14, h: 20, i: rows.indexOf(k), d: 1 });
        E.font.text(g, '◂'.replace('◂', '<'), x + 8, y0 + ch / 2 - 4, f ? UI.GOLD : UI.MUTED, { outline: '#000' }); E.font.text(g, '>', x + cw - 12, y0 + ch / 2 - 4, f ? UI.GOLD : UI.MUTED, { outline: '#000' });
        E.font.text(g, k === 'home' ? 'HOME' : k === 'away' ? 'AWAY' : 'ARENA', x + cw / 2, y0 + 4, UI.MUTED, { align: 'center', font: 'tiny', outline: false });
        if (k === 'arena') { const A = ARENAS[st.arena], ic = '#' + A.ice.map(v => v.toString(16).padStart(2, '0')).join(''), rx = x + 20, ry = y0 + 30, rw = cw - 46, rh = 24; px.rect(g, rx - 3, ry - 3, rw + 6, rh + 6, A.snowbanks ? '#f4f8ff' : A.boards); px.rect(g, rx, ry, rw, rh, ic); px.rect(g, rx + rw / 2, ry, 1, rh, '#c8282e'); px.rect(g, rx + rw / 2 - 12, ry, 1, rh, '#2850be'); px.rect(g, rx + rw / 2 + 12, ry, 1, rh, '#2850be'); Logo.draw(g, A.home === 'grizzlies' && !Save.data.finished ? 'muskrats' : A.home, rx + rw / 2 - 8, ry + 4, 16); E.font.text(g, A.name, x + cw / 2, y0 + 12, f ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' }); E.font.text(g, A.town, x + cw / 2, y0 + 60, UI.MUTED, { align: 'center', outline: false }); const tags = []; if (A.hazards.includes('thinice')) tags.push('THIN ICE'); if (A.hazards.includes('pete')) tags.push('POLAR PETE'); if (A.hazards.includes('octopus')) tags.push('OCTOPI'); if (A.hazards.includes('rat')) tags.push('RATS'); if (A.hazards.includes('drop')) tags.push('DISCOUNT DROP'); if (A.snowbanks) tags.push('SNOWBANKS'); tags.slice(0, 3).forEach((t2, j) => E.font.text(g, t2, x + cw / 2, y0 + 72 + j * 10, '#ffb347', { align: 'center', outline: false })); return; }
        const id = st[k], t = TEAMS[id]; Logo.draw(g, id, x + cw / 2 - 20, y0 + 12, 40);
        E.font.text(g, t.short, x + cw / 2, y0 + 55, f ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' });
        const avg = j => Math.round(t.players.reduce((a, p) => a + p.r[j], 0) / 3), bars = [['SPEED', avg(0)], ['SHOOTING', avg(1)], ['HITTING', avg(3)], ['GOALIE', Math.round((t.goalie.r[0] + t.goalie.r[1]) / 2)]];
        bars.forEach(([lab, v], j) => { const yy = y0 + 66 + j * 9; E.font.text(g, lab, x + 10, yy, UI.MUTED, { font: 'tiny', outline: false }); for (let q = 0; q < 5; q++) px.rect(g, x + cw - 48 + q * 7, yy, 5, 5, q < v ? t.trim : '#2a3448'); });
      };
      card('home', 0, x0); card('arena', 1, x0 + cw); card('away', 2, x0 + cw * 2);
      const chips = [['periods', 'PERIODS', String(st.periods)], ['len', 'LENGTH', U.mmss(st.len)], ['diff', 'DIFFICULTY', String(st.diff).toUpperCase()], ['cheat', 'CHEATS', st.cheat === 'off' ? (Save.cheatsOpen().length ? 'OFF' : 'LOCKED') : st.cheat === 'all' ? 'ALL ON' : (Save.CHEATS.find(c => c[0] === st.cheat) || [, '?'])[1]]];
      const chw = Math.min(100, (r.W - 20) / 4), cx0 = r.W / 2 - chw * 2, cy = y0 + ch + 10;
      chips.forEach(([k, lab, val], j) => { const x = cx0 + j * chw + 2, f = rows[this.i] === k; UI.panel(g, x, cy, chw - 4, 26, { focus: f }); this.hits.push({ x, y: cy, w: chw - 4, h: 26, i: rows.indexOf(k) }); E.font.text(g, lab, x + (chw - 4) / 2, cy + 3, UI.MUTED, { align: 'center', font: 'tiny', outline: false }); E.font.text(g, val, x + (chw - 4) / 2, cy + 13, f ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' }); });
      const gy = cy + 34, f = rows[this.i] === 'go'; UI.panel(g, r.W / 2 - 60, gy, 120, 22, { focus: f, bg: f ? ['#3a5a1c', '#1a2a0c'] : undefined }); this.hits.push({ x: r.W / 2 - 60, y: gy, w: 120, h: 22, i: rows.indexOf('go') });
      E.font.title(g, 'FACE OFF!', r.W / 2, gy + 4, { align: 'center', scale: 2, colors: f ? ['#ffffff', '#ffe08a', '#ffb347'] : ['#e8e8e8', '#b8c0d0', '#8890a0'] });
      const hum = Setup.st.sides.filter(p => p.side >= 0).length; E.font.text(g, hum ? hum + ' PLAYER' + (hum > 1 ? 'S' : '') : 'CPU VS CPU (WATCH)', r.W / 2, gy + 28, UI.MUTED, { align: 'center', outline: false });
      UI.legend(g, r, [['up', 'MOVE'], ['left', 'CHANGE'], ['confirm', 'SELECT'], ['cancel', 'BACK']], r.H - 12);
    });
  }
};

/* ---- 43-scene-cutscene.js ---- */
/* ---- CUTSCENES (12.5, Appendix C): a stage set (locker room, the lake at dusk, the Grindhouse, the mall, the Dome's
 * tunnel, the ending on the ice), the cast staged, E.Dialog boxes with live portraits and babble, choices as two big
 * options; ✕ advances, holding ○ for 1 s skips (with a fill ring). The runner is embeddable (the attract reel uses it) ---- */
const Cutscene = (() => {
  const SETS = {
    locker: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, b = Math.floor(y / 6) % 2; return [118 + n * 16 + b * 8, 84 + n * 12 + b * 6, 54 + n * 10]; }, wall: { face: 'plank', side: '#6a4a30', top: '#8a6a4a' }, sky: ['#1a1410', '#2a2018', '#3a2a1e'], amb: .6, light: '#ffd8a0' },
    pond: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05); return y > 40 ? [200 + n * 20 + m * 12, 214 + n * 18 + m * 12, 230 + n * 10] : [220 + n * 16, 228 + n * 16, 240 + n * 8]; }, wall: null, sky: ['#1a1e48', '#5a3a6a', '#e88a5a'], amb: .5, light: '#ff9a3a' },
    grind: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return [70 + n * 18, 74 + n * 18, 72 + n * 16]; }, wall: { face: 'brick', side: '#4a3a3a', top: '#5a4a4a' }, sky: ['#101410', '#1a201a', '#24302a'], amb: .45, light: '#c8ffd8' },
    mall: { floor: (x, y) => { const t = (Math.floor(x / 16) + Math.floor(y / 16)) % 2, n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return t ? [220 + n * 8, 212 + n * 8, 226 + n * 8] : [176 + n * 8, 166 + n * 8, 188 + n * 8]; }, wall: { face: 'plaster', side: '#a8a0b8', top: '#c8c0d8' }, sky: ['#2a1a3a', '#4a2a5a', '#e0389a'], amb: .7, light: '#ff8ad8' },
    tunnel: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return [40 + n * 10, 34 + n * 10, 46 + n * 10]; }, wall: { face: 'stone', side: '#2a2430', top: '#3a3240' }, sky: ['#05040a', '#100c18', '#1a1424'], amb: .4, light: '#ffffff' },
    ending: { floor: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .04, y * .04); return [228 + n * 8 + m * 8, 240 + n * 6 + m * 6, 250 + n * 4]; }, wall: { face: 'plank', side: '#f2efe6', top: '#5a3a22' }, sky: ['#0a0a18', '#1a1430', '#3a2a50'], amb: .6, light: '#ffd8a0' }
  };
  const maps = {};
  function mapFor(set) {
    if (maps[set]) return maps[set];
    const S2 = SETS[set], rows = [];
    for (let R = 0; R < 9; R++) rows.push(R === 0 && S2.wall ? '#'.repeat(24) : '.'.repeat(24));
    const map = new E.TileMap({ rows, legend: { '#': 1, '.': { floor: 'f' } }, types: { 1: Object.assign({ h: 64 }, S2.wall || {}) }, floorTex: S2.floor, outside: '#0a0a10', ao: 6 });
    return (maps[set] = map);
  }
  const rigCache = new Map();
  function rigOf(who) { const k = SPEAKERS[who] || who; if (!rigCache.has(k)) rigCache.set(k, Rigs.cast(k)); return rigCache.get(k); }
  /** a runner: run(id, { done, embedded, attract }) -> { update(dt), draw(r), done } */
  function run(id, o = {}) {
    const sc = STORY.cutscenes[id]; if (!sc) throw new Error('no cutscene ' + id);
    const talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', bg: '#0a1224', voice: null, vars: Story.st.flags });
    const cast = sc.cast.map(([who, x, y]) => ({ who, x, y, rig: rigOf(who), facing: PI / 2 + (x < 170 ? -.5 : .5), pose: null, hidden: false, tx: x, ty: y, t: RNG.fx() * 6 }));
    const R = { id, sc, i: -1, wait: 0, done: false, talk, cast, holdT: 0, set: sc.set, cup: null, confetti: 0, wagon: null, shake: 0, choiceN: o.chapter || Story.chapter, handshake: null };
    const castOf = who => cast.find(c => c.who === who);
    function next() {
      R.i++;
      if (R.i >= sc.steps.length) { R.done = true; if (o.done) o.done(); return; }
      const s = sc.steps[R.i];
      if (s.say) { const c = castOf(s.say), k = SPEAKERS[s.say] || s.say, cc = CAST[k] || CAST.chuck; if (c) { c.talking = true; for (const q of cast) if (q !== c) q.facing = E.lerpAng(PI / 2, Math.atan2(c.y - q.y, c.x - q.x), .65); c.facing = PI / 2 + (c.x < 170 ? -.35 : .35); }
        talk.say(s.text, { name: cc.name, portrait: c ? c.rig : rigOf(s.say === 'chuck' || s.say === 'moose' ? s.say : 'chuck'), portraitSize: 40, portraitOpts: { zoom: 2.8, turn: .4, bg: '#1a2a4a' }, voice: Synth.voiceFn(cc.voice), auto: o.attract ? 2.2 : 0, onDone: () => { if (c) c.talking = false; next(); } });
        if (c && s.expr) c.expr = s.expr; return; }
      if (s.choice) { const n = R.choiceN, opts = STORY.choices[n], c = castOf(s.choice.who), cc = CAST[SPEAKERS[s.choice.who] || s.choice.who];
        talk.say(s.choice.text, { name: cc ? cc.name : '', portrait: c ? c.rig : null, portraitSize: 40, portraitOpts: { zoom: 2.8, turn: .4, bg: '#1a2a4a' }, voice: cc ? Synth.voiceFn(cc.voice) : null, choices: opts.map(q => q[0]), onChoice: i => { if (!o.attract) Story.choose(n, i); else Story.st.flags.tacticLine = opts[i][1].line || ''; next(); } }); return; }
      if (s.pose) { const c = castOf(s.pose); if (c) c.pose = s.p; R.wait = .4; return; }
      if (s.enter) { const c = castOf(s.enter); if (c) { c.hidden = false; c.x = s.at[0]; c.y = s.at[1]; c.tx = s.to[0]; c.ty = s.to[1]; } R.wait = 1; return; }
      if (s.exit) { const c = castOf(s.exit); if (c) { c.tx = 320; } R.wait = .8; return; }
      if (s.sfx) { Synth.sfx(s.sfx); R.wait = .3; return; }
      if (s.wait) { R.wait = s.wait; return; }
      if (s.handshake) { R.handshake = { t: 0 }; R.wait = 3.2; return; }
      if (s.cup) { const c = castOf(s.cup); R.cup = { who: c, t: 0 }; R.wait = 2.2; Synth.horn(true, 1.6); Synth.swell('roar'); game.after(.9, () => { R.confetti = 3; P.explosion(c.x, c.y, 34, 1.2, { freeze: false, shake: 0, debris: false }); }); return; }
      if (s.wagon) { R.wagon = { x: -40, t: 0 }; R.wait = 4.5; Synth.sfx('aooga'); return; }
      next();
    }
    // the Glitterman enters later: hidden until his step
    for (const s of sc.steps) if (s.enter) { const c = castOf(s.enter); if (c) c.hidden = true; }
    R.update = dt => {
      if (R.done) return;
      if (R.i < 0) next();
      const I = game.input;
      // hold cancel for 1 s to skip (the first choice is the default)
      if (game.players.some(p => p.down('cancel'))) { R.holdT += dt; if (R.holdT >= 1) { R.holdT = 0; skip(); return; } } else R.holdT = Math.max(0, R.holdT - dt * 2);
      if (R.wait > 0) { R.wait -= dt; if (R.wait <= 0) next(); }
      else talk.update(dt);
      if (R.confetti > 0) { R.confetti -= dt; if (RNG.fx() < .6) P.bits(140 + RNG.fx() * 80, 60 + RNG.fx() * 30, 50, 3, ['#ffd84a', '#ff4ab8', '#4af0f0', '#ffffff', '#7ad87a']); }
      if (R.wagon) { R.wagon.x += dt * 90; R.wagon.t += dt; if (Math.floor(R.wagon.t * 10) % 3 === 0) Synth.sfx('putter'); }
      if (R.handshake) R.handshake.t += dt;
      for (const c of cast) {
        c.t += dt; c.x = approach(c.x, c.tx, 80 * dt); c.y = approach(c.y, c.ty, 80 * dt);
        if (R.handshake) { const k = R.handshake.t, home = !['glitterman', 'sterling', 'vault', 'timber', 'rocco', 'rollo', 'chad', 'pete', 'axel', 'rig'].includes(c.who); c.x = c.tx + (home ? 1 : -1) * Math.sin(k * 1.2) * 30; }
        const moving = Math.abs(c.x - c.tx) > 1 || R.handshake;
        if (c.rig.hk && c.rig.hk.mode === 'skate') { c.rig.hk.ph = (c.rig.hk.ph || 0) + dt * (moving ? 5 : 0); c.rig.hk.push = moving ? .6 : 0; c.rig.hk.stick = { act: R.cup && R.cup.who === c ? 'none' : 'idle' }; }
        const pose = R.cup && R.cup.who === c ? 'cheer' : c.pose || (R.confetti > 0 ? 'cheer' : null);
        c.rig.update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.facing, pose, expr: c.talking ? (c.expr || null) : R.confetti > 0 ? 'smile' : null });
        c.rig._talk = !!c.talking;
      }
    };
    function skip() {
      // apply the default choice if the scene had one and it hasn't been made
      const ch = sc.steps.findIndex(s => s.choice); if (ch >= 0 && R.i <= ch && !o.attract) Story.choose(R.choiceN, 0);
      talk.open = false; R.done = true; Synth.sfx('menuBack'); if (o.done) o.done();
    }
    R.draw = r => {
      const S2 = SETS[sc.set], map = mapFor(sc.set);
      r.sky(S2.sky);
      map.drawFloor(r); map.queueWalls(r);
      L.enabled = true; L.ambient = S2.amb; L.add(170, 70, 60, 260, .9, { color: S2.light });
      dressSet(r, sc.set, R);
      for (const c of cast) { if (c.hidden) continue; r.shadow(c.x, c.y, 7, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, E.charView(r.view))); }
      if (R.cup && R.cup.who) { const c = R.cup.who, h = c.rig.hand ? c.rig.hand('R') : [c.x, c.y, 30]; r.queue(c.x, c.y, 34, g => { const q = r.w(c.x, c.y, (h[2] || 30) + 6); Cup.draw(g, q[0], q[1], 1); }, { emissive: true }); }
      if (R.wagon) Flood.drawWagon(r, R.wagon.x, 60, 0, true);
      talk.draw(r);
      r.overlay(g => {
        if (R.holdT > 0) { const a = R.holdT; for (let k = 0; k < 24 * a; k++) { const an = -PI / 2 + k / 24 * TAU; px.dot(g, r.W - 20 + Math.cos(an) * 8, 20 + Math.sin(an) * 8, UI.GOLD); } E.font.text(g, 'SKIP', r.W - 20, 32, UI.GOLD, { align: 'center', font: 'tiny', outline: false }); }
        if (!o.attract) Glyphs.text(g, '{confirm} NEXT    HOLD {cancel} SKIP', 10, 8, { color: '#9fb2cc' });
      });
    };
    return R;
  }
  function dressSet(r, set, R) {
    if (set === 'locker' || set === 'ending') {
      for (let i = 0; i < 9; i++) { const x = 24 + i * 34; r.queue(x, 18, 0, g => { r.box(g, x - 14, 12, 0, x + 14, 20, 44, i % 2 ? '#3a5a8a' : '#4a6a9a', '#2a4060'); const q = r.w(x, 20, 30); px.rect(g, q[0] - 6, q[1], 12, 1, '#1a2a40'); px.rect(g, q[0] - 1, q[1] + 6, 2, 2, '#c8c8d0'); }); }
      r.shape('bench', 120, 100, 0, { facing: -PI / 2 }); r.shape('bench', 230, 100, 0, { facing: -PI / 2 });
      r.prop('banner', 170, 10, 48, { size: 1.4, color: '#5a3a22' });
      if (set === 'ending') { r.overlay(g => {}); }
    } else if (set === 'pond') {
      for (let i = 0; i < 9; i++) r.shape('pine', 10 + i * 40, 4 + (i % 2) * 6, 0, { params: { h: 50 + (i % 3) * 10, tiers: 4 } });
      r.prop('firedrum', 60, 60, 0, { size: 1.6, light: true });
      r.queue(300, 30, 0, g => { r.box(g, 270, 14, 0, 330, 40, 30, '#8a5a32', '#5a3a1e'); const q = r.w(290, 40, 16); px.rect(g, q[0], q[1], 8, 6, '#ffd080'); });
    } else if (set === 'grind') {
      for (let i = 0; i < 4; i++) { const x = 40 + i * 90; r.queue(x, 22, 40, g => { const a = r.w(x - 30, 22, 50), b = r.w(x + 30, 22, 50); px.line(g, a[0], a[1], b[0], b[1], '#8a5a3a', 3); }); if (RNG.fx() < .03) P.smoke(x + 20, 22, 52, 1, { size: .8, color: '#d8e0e8' }); }
      r.prop('firedrum', 300, 50, 0, { size: 1.3, light: true });
    } else if (set === 'mall') {
      [['PRETZEL PLANET', '#ffb04a'], ['GLITTERMAN GOLD', '#ffe04a'], ['ARCADIA', '#ff4ab8']].forEach(([n, c], i) => { const x = 60 + i * 110; r.queue(x, 20, 0, g => { const a = r.w(x - 46, 18, 46), b = r.w(x + 46, 18, 6); px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#2a2438'); E.font.text(g, n, (a[0] + b[0]) / 2, a[1] + 4, c, { align: 'center', font: 'tiny', outline: false }); }, { emissive: true }); });
    } else if (set === 'tunnel') {
      r.overlay(g => { px.blend(g, .12, 'add', () => { for (let i = 0; i < 3; i++) px.poly(g, [[r.W * (.3 + i * .2), 0], [r.W * (.34 + i * .2), 0], [r.W * (.4 + i * .2), r.H], [r.W * (.24 + i * .2), r.H]], '#ffffff'); }); });
    }
  }
  return { run, SETS, rigOf };
})();
/* ---- the Kaboom Cup: a sprite drawn in code (gold, two handles, a puck on the lid) ---- */
const Cup = {
  draw(g, x, y, k = 1) { x = Math.round(x); y = Math.round(y); const t = E.tones('#e8c040');
    px.rect(g, x - 5 * k, y + 8 * k, 10 * k, 3 * k, t.sh); px.rect(g, x - 2 * k, y + 3 * k, 4 * k, 5 * k, t.base);
    px.disc(g, x, y, 6 * k, t.sh); px.disc(g, x - 1, y - 1, 5 * k, t.base); px.rect(g, x - 6 * k, y - 4 * k, 12 * k, 3 * k, t.lt);
    px.line(g, x - 6 * k, y - 2 * k, x - 9 * k, y + 1 * k, t.sh, 2); px.line(g, x + 6 * k, y - 2 * k, x + 9 * k, y + 1 * k, t.sh, 2);
    px.rect(g, x - 2 * k, y - 7 * k, 4 * k, 2 * k, '#141418'); px.dot(g, x - 2 * k, y - 2 * k, t.hi); }
};

scenes.cutscene = {
  view: 'brawler', views: ['brawler'], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; game.setView('brawler'); game.setZoom(1.05); game.cam.bounds = null; game.cam.smooth = 0;
    const sc = STORY.cutscenes[d.id]; Synth.music(sc ? sc.music : 'locker');
    this.R = Cutscene.run(d.id, { chapter: d.chapter, done: () => { if (d.onDone) d.onDone(); else game.go(d.then || 'title', d.thenData, { fade: 'wipe' }); } });
    game.focus(170, 60, 18);
  },
  exit() { game.resetCamera(); },
  update(dt) { game.focus(170, 60, 18); if (this.R) this.R.update(dt); },
  draw(r) { if (this.R) this.R.draw(r); }
};

/* ---- 44-scene-flood.js ---- */
/* ---- THE FLOOD WAGON (the intermission minigame, 7.14): Old Gus's ice resurfacer on E.Car. The period's scuffs and melt
 * are on the ice; drive over them to lay a fresh sheet (a 72 u swath, clean in one pass) within 40 s. Stick steers toward that screen direction, R2 /
 * Shift is gas, ✕ honks. 85% of the scuff cleared (the gold tick on the bar) is a perfect flood: the team's BOOM +30. Skipped, an AI driver fast-forwards 6 s ---- */
const Flood = (() => {
  let car = null, gus = null, st = null;
  function begin(o = {}) {
    car = new E.Car({ x: Rink.X0 + 70, y: Rink.Y0 + 40, angle: 0, top: o.auto ? 260 : 165, accel: o.auto ? 300 : 230, brake: 260, turn: 3.2, grip: 7 });
    gus = gus || Rigs.cast('gus');
    st = { t: 0, len: o.auto ? 6 : 40, auto: !!o.auto, start: Rink.scuffTotal() || 1, done: false, path: 0, perfect: false, honk: 0, wp: 0 };
    if (st.start < 30) { for (let i = 0; i < 260; i++) Rink.addScuff(Rink.X0 + 30 + RNG.fx() * (Rink.HL * 2 - 60), Rink.Y0 + 30 + RNG.fx() * (Rink.HW * 2 - 60), .4 + RNG.fx() * .5); st.start = Rink.scuffTotal(); }
    return st;
  }
  /** the AI driver: laps of a lawnmower pattern */
  const WP = (() => { const out = []; for (let k = 0; k < 6; k++) { const y = Rink.Y0 + 34 + k * 63; if (k % 2 === 0) out.push([Rink.X0 + 60, y], [Rink.X1 - 60, y]); else out.push([Rink.X1 - 60, y], [Rink.X0 + 60, y]); } return out; })();
  function step(dt, I) {
    if (!st || st.done) return;
    st.t += dt;
    let steer = 0, gas = 0, brake = 0, off = 0;
    if (st.auto || !I) { const [tx, ty] = WP[st.wp % WP.length]; if (Math.hypot(tx - car.x, ty - car.y) < 36) st.wp++; off = U.angDiff(car.angle, Math.atan2(ty - car.y, tx - car.x)); steer = clamp(off * 2.2, -1, 1); gas = 1; }
    else {
      const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
      if (Math.hypot(d[0], d[1]) > .3) { off = U.angDiff(car.angle, Math.atan2(d[1], d[0])); steer = clamp(off * 2.4, -1, 1); gas = .5; }
      if (I.down('turbo') || I.down('shoot')) gas = 1;
      if (I.pressed('pass')) { Synth.sfx('aooga'); st.honk = .6; }
    }
    st.honk = Math.max(0, st.honk - dt);
    // a hard turn (the stick well off the heading) eases off the gas and brakes, so the wagon turns tight
    if (Math.abs(off) > 1.1 && car.speed > 60) { gas = 0; brake = .7; } else if (Math.abs(off) > .6) gas = Math.min(gas, .45);
    car.update(dt, null, { steer, gas, brake });
    const b = { x: car.x, y: car.y, vx: Math.cos(car.angle) * car.speed, vy: Math.sin(car.angle) * car.speed };
    if (Rink.clampBody(b, 16, .2, .7)) { car.x = b.x; car.y = b.y; car.speed *= .5; Synth.sfx('boards', { vol: .4 }); }
    car.x = b.x; car.y = b.y;
    // the conditioner at the back lays fresh ice 40 u wide
    const bx = car.x - Math.cos(car.angle) * 16, by = car.y - Math.sin(car.angle) * 16, nx = -Math.sin(car.angle), ny = Math.cos(car.angle);
    for (let k = -4; k <= 4; k++) Rink.clearIce(bx + nx * k * 8 - 8, bx + nx * k * 8 + 8, by + ny * k * 8 - 8, by + ny * k * 8 + 8, 0);
    if (Math.floor(st.t * 8) !== Math.floor((st.t - dt) * 8)) Synth.sfx('putter');
    gus.update(dt, { x: car.x, y: car.y, z: 14, vx: 0, vy: 0, facing: car.angle, pose: 'kneel' });
    const J = gus.J; if (J.shC) { J.handR = E.V3.add(J.shC, [5, 1.6, -3]); J.handL = E.V3.add(J.shC, [5, -1.6, -3]); }
    if (st.t >= st.len || clean() >= .98) finish();
  }
  const clean = () => st ? clamp(1 - Rink.scuffTotal() / st.start, 0, 1) : 0;
  const PERFECT = .85;   // the share of the period's scuff a perfect flood clears
  function finish() { if (st.done) return; st.done = true; st.perfect = !st.auto && clean() >= PERFECT; if (st.auto) Rink.clearIce(); Bus.emit('flood_done', { perfect: st.perfect, clean: clean() }); }
  /** the wagon in the world: a boxy body, the cab, the tank, the conditioner, Gus at the wheel */
  function draw(r) {
    if (!car) return;
    drawWagon(r, car.x, car.y, car.angle, true);
    r.actor(car.x - Math.cos(car.angle) * 2, car.y - Math.sin(car.angle) * 2, 14, (g, ox, oy) => gus.draw(g, ox, oy, E.charView(r.view)));
    L.add(car.x + Math.cos(car.angle) * 24, car.y + Math.sin(car.angle) * 24, 10, 90, .8, { color: '#fff4d0' });
  }
  function drawWagon(r, x, y, a, lit) {
    const ca = Math.cos(a), sa = Math.sin(a), P2 = (f, s, z) => r.w(x + ca * f - sa * s, y + sa * f + ca * s, z);
    r.queue(x, y, 0, g => {
      const quad = (pts, c) => px.poly(g, pts, c);
      const box = (f0, f1, s0, s1, z0, z1, top, side, front) => { quad([P2(f0, s0, z1), P2(f1, s0, z1), P2(f1, s1, z1), P2(f0, s1, z1)], top); quad([P2(f0, s1, z0), P2(f1, s1, z0), P2(f1, s1, z1), P2(f0, s1, z1)], side); quad([P2(f0, s0, z0), P2(f1, s0, z0), P2(f1, s0, z1), P2(f0, s0, z1)], side); quad([P2(f1, s0, z0), P2(f1, s1, z0), P2(f1, s1, z1), P2(f1, s0, z1)], front); quad([P2(f0, s0, z0), P2(f0, s1, z0), P2(f0, s1, z1), P2(f0, s0, z1)], front); };
      for (const [f, s] of [[10, -11], [10, 11], [-10, -11], [-10, 11]]) { const q = P2(f, s, 3); px.disc(g, q[0], q[1], 3, '#141418'); }
      box(-20, 18, -11, 11, 3, 13, '#2a6ab8', '#1a4a8a', '#3a7ac8');
      box(-20, -6, -10, 10, 13, 24, '#d8dce4', '#a8b0bc', '#c8ccd4');
      box(6, 16, -9, 9, 13, 22, '#2a4a7a', '#1a2a4a', '#4a6a9a');
      box(-26, -20, -12, 12, 1, 6, '#5a5a6a', '#3a3a44', '#4a4a54');
      const fr = P2(18, 0, 9); px.rect(g, fr[0] - 6, fr[1] - 2, 12, 3, '#e8eef4'); E.font.text(g, 'FLOOD WAGON', P2(-6, 11, 18)[0], P2(-6, 11, 18)[1] - 2, '#ffffff', { font: 'tiny', align: 'center', outline: false });
      if (lit) { const hl = P2(18, -7, 8), hr = P2(18, 7, 8); px.dot(g, hl[0], hl[1], '#fff4c0'); px.dot(g, hr[0], hr[1], '#fff4c0'); }
      const wet = P2(-30, 0, 0); px.blend(g, .35, 'normal', () => px.ell(g, wet[0], wet[1], 10, 4, '#8ab8e8'));
    });
  }
  return { begin, step, draw, drawWagon, clean, WP, PERFECT, get st() { return st; }, get car() { return car; } };
})();

scenes.flood = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown'], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; this.m = d.m || null; this.phase = d.ask ? 'card' : d.auto ? 'drive' : 'drive'; this.t = 0;
    this.map = this.m ? World.prepare(this.m) : Rink.build('icebox', 'muskrats'); if (!this.m) Crowd.build('icebox', 'muskrats');
    game.cam.bounds = v => this.map.bounds(v); L.enabled = true; L.ambient = .5;
    Synth.music('flood'); Cam.set(Cam.playView(), .72);
    if (this.phase === 'drive') Flood.begin({ auto: !!d.auto });
    UI.Idle.reset();
  },
  update(dt) {
    const I = game.input; this.t += dt;
    if (this.phase === 'card') {
      if (UI.anyP('pass') || UI.anyP('confirm')) { this.phase = 'drive'; Flood.begin({ auto: false }); Synth.sfx('menuSel'); }
      else if (UI.anyP('deke') || UI.anyP('cancel')) { this.phase = 'drive'; Flood.begin({ auto: true }); Synth.sfx('menuBack'); }
      game.focus(Rink.C.x, Rink.C.y, 0); return;
    }
    if (this.phase === 'drive') {
      Flood.step(dt, this.d.attract ? null : I);
      const c = Flood.car; if (c) game.focus(c.x, c.y, 10);
      if (Flood.st && Flood.st.done) { this.phase = 'done'; this.t = 0; if (Flood.st.perfect && this.m) { Boom.add(this.m, this.m.teams.findIndex(t => t.human) >= 0 ? this.m.teams.findIndex(t => t.human) : 0, Boom.GAIN.flood); UI.toast('PERFECT FLOOD! BOOM +30'); } }
    } else if (this.phase === 'done' && this.t > (Flood.st && Flood.st.auto ? .6 : 2.2)) this.leave();
    if (!this.m && UI.anyP('cancel') && this.phase !== 'done') this.leave();
  },
  leave() { if (this.left) return; this.left = true; if (this.m) game.go('match', { resume: true }, { fade: 'wipe' }); else game.go('title', { menu: true }); },
  exit() { this.left = false; },
  draw(r) {
    this.map.drawFloor(r); Rink.drawScuff(r); Rink.drawBoards(r, this.m ? this.m.arena.id : 'icebox', this.m ? this.m.teams[0].def.dark : TEAMS.muskrats.dark, game.real); Rink.drawNets(r, game.real);
    Crowd.draw(r, this.m); this.map.queueWalls(r);
    if (this.phase !== 'card') Flood.draw(r);
    L.add(Rink.C.x, Rink.C.y, 140, 600, .5, { color: '#ffd8a0' });
    r.overlay(g => {
      const m = this.m;
      if (this.phase === 'card') {
        UI.panel(g, r.W / 2 - 150, 30, 300, 150, {});
        E.font.title(g, m ? 'END OF THE ' + U.ord(m.period) : 'INTERMISSION', r.W / 2, 38, { align: 'center', scale: 2 });
        if (m) { const A2 = m.teams[0], B = m.teams[1]; [['GOALS', A2.score, B.score], ['SHOTS', A2.shots, B.shots], ['HITS', A2.hits, B.hits]].forEach(([lab, a, b], i) => { const y = 66 + i * 24; E.font.text(g, String(a), r.W / 2 - 70, y, '#ffffff', { scale: 2, align: 'center', outline: '#000' }); E.font.text(g, lab, r.W / 2, y + 4, UI.MUTED, { align: 'center', outline: false }); E.font.text(g, String(b), r.W / 2 + 70, y, '#ffffff', { scale: 2, align: 'center', outline: '#000' }); }); E.font.text(g, A2.def.abbr, r.W / 2 - 70, 56, A2.def.trim, { align: 'center', outline: false }); E.font.text(g, B.def.abbr, r.W / 2 + 70, 56, B.def.trim, { align: 'center', outline: false }); }
        Glyphs.text(g, '{pass} DRIVE THE FLOOD WAGON     {deke} SKIP', r.W / 2, 150, { align: 'center', color: UI.GOLD });
        return;
      }
      const s = Flood.st; if (!s) return;
      UI.panel(g, r.W / 2 - 90, 6, 180, 30, {}); E.font.text(g, s.auto ? "OLD GUS FLOODS THE ICE" : 'FLOOD THE ICE!', r.W / 2, 10, UI.GOLD, { align: 'center', outline: '#000' });
      E.ui.bar(g, r.W / 2 - 82, 22, 96, 6, Flood.clean(), Flood.clean() >= Flood.PERFECT ? '#7ad87a' : '#4ab8e8'); px.rect(g, r.W / 2 - 82 + Math.round(96 * Flood.PERFECT), 20, 1, 10, '#ffd36a'); E.font.text(g, Math.round(Flood.clean() * 100) + '%', r.W / 2 + 18, 21, '#ffffff', { outline: '#000' }); E.font.text(g, U.mmss(Math.max(0, s.len - s.t)), r.W / 2 + 84, 21, '#ffffff', { align: 'right', outline: '#000' });
      if (!s.auto && this.phase === 'drive') Glyphs.text(g, 'STICK STEER   {turbo} GAS   {pass} HONK', r.W / 2, r.H - 16, { align: 'center', color: '#cfe0f4' });
      if (this.phase === 'done') E.font.title(g, s.perfect ? 'PERFECT FLOOD!' : s.auto ? 'FRESH SHEET' : 'NICE ICE!', r.W / 2, r.H * .4, { align: 'center', scale: 3 });
    });
  }
};

/* ---- 45-scene-results.js ---- */
/* ---- RESULTS (12.9): the final score huge, the THREE STARS revealed one by one (portrait cards, a stat line, Chuck's
 * line), the objectives ticking ★, then CONTINUE / REMATCH / MAIN MENU. In the Cup Run: stars and unlocks saved, then
 * the post-game scene (a win) or Coach Marge's pep talk (a loss: RETRY or BACK TO MAP) ---- */
scenes.results = {
  enter(d) {
    d = d || {}; let m = d.m || Match.m;
    if (d.demo || !m) { m = Match.create(Setup.quickCfg({})); m.teams[0].score = 4; m.teams[1].score = 2; m.skaters[0].stats.goals = 2; m.skaters[1].stats.goals = 2; m.skaters[3].stats.goals = 2; m.skaters[5].stats.bigHits = 3; Match.endGame(m, 0); }
    this.m = m; this.t = 0; this.revealed = 0; this.pep = false; this.saved = false;
    const human = m.teams.findIndex(t => t.human), won = human >= 0 ? m.winner === human : m.winner >= 0;
    this.won = won; this.human = human;
    Synth.music(won || human < 0 ? 'victory' : 'defeat', { restart: true });
    this.menu = new UI.Tiles(this.items(), { cols: 3, w: 104, h: 26, gap: 8, onPick: it => this.pick(it.id) });
    this.menu.enabled = false;
    if (m.cfg.mode === 'story' && !this.saved) {
      this.saved = true; const before = Save.cheatsOpen().length, stars = m.cfg.objectives.map(o => !!m.objDone[o.id]);
      Save.chapterResult(m.cfg.chapter, stars, won); const after = Save.cheatsOpen();
      if (after.length > before) for (const c of after.slice(before)) UI.toast('UNLOCKED: ' + c[1], '#4af0f0', 4);
    }
    UI.Idle.reset();
  },
  items() {
    const m = this.m;
    if (m.cfg.mode === 'story') return this.won ? [{ id: 'continue', label: 'CONTINUE' }, { id: 'rematch', label: 'REPLAY GAME' }, { id: 'map', label: 'TO THE MAP' }] : [{ id: 'retry', label: 'RETRY' }, { id: 'map', label: 'BACK TO MAP' }, { id: 'menu', label: 'MAIN MENU' }];
    return [{ id: 'continue', label: 'CONTINUE' }, { id: 'rematch', label: 'REMATCH' }, { id: 'menu', label: 'MAIN MENU' }];
  },
  pick(id) {
    const m = this.m, n = m.cfg.chapter;
    if (id === 'rematch' || id === 'retry') { if (m.cfg.mode === 'story') { Story.st.attempt++; game.go('match', { cfg: Story.matchCfg(n) }, { fade: 'iris' }); } else Match.restart(); return; }
    if (id === 'map') return game.go('storymap', { chapter: n }, { fade: 'wipe' });
    if (id === 'menu') return game.go('title', { menu: true }, { fade: 'wipe' });
    if (id === 'continue') {
      if (m.cfg.mode === 'story') { const c = Story.ch(n); return game.go('cutscene', { id: c.post, chapter: n, onDone: () => n === 5 ? game.go('credits', { ending: true }, { fade: 'white' }) : game.go('storymap', { chapter: Math.min(5, n + 1), arrived: true }, { fade: 'wipe' }) }, { fade: 'wipe' }); }
      return game.go(m.cfg.mode === 'exhibition' ? 'setup' : 'title', { menu: true }, { fade: 'wipe' });
    }
  },
  update(dt) {
    this.t += dt;
    const reveal = Math.floor((this.t - 1.2) / 1.6);
    if (reveal > this.revealed - 1 && this.revealed < 3 && this.t > 1.2) { this.revealed++; const id = this.m.stars[3 - this.revealed], e = this.m.byId(id); if (e) { const idx = [0, 1, 2][3 - this.revealed], line = TEXT.stars[(this.revealed - 1) + 3 * Math.floor(RNG.fx() * 4)]; Talk.init(); Talk.speak('c', U.fill(line, { name: e.def.name, g: e.stats.goals || 0, s: e.stats.saves || 0 })); Synth.sfx('star'); void idx; } }
    if (UI.anyP('confirm') && this.revealed < 3 && this.t > .5) { this.revealed = 3; this.t = 1.2 + 1.6 * 3; game.players.forEach(I => I.consumeAll()); }
    if (this.revealed >= 3 && this.t > 1.2 + 1.6 * 3 + .4) {
      if (this.m.cfg.mode === 'story' && !this.won && !this.pep) { this.pep = true; Synth.say(TEXT.pep[(this.m.cfg.chapter || 1) - 1], CAST.marge.voice); }
      if (!this.menu.enabled) { this.menu.enabled = true; Talk.close(); }
      this.menu.update(dt);
    }
    Talk.step(dt);
  },
  draw(r) {
    const m = this.m, A2 = m.teams[0], B = m.teams[1];
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    r.overlay(g => {
      E.font.title(g, m.winner < 0 ? 'A TIE!' : (this.human >= 0 ? (this.won ? 'YOU WIN!' : 'TOUGH LOSS') : m.teams[m.winner].def.short + ' WIN'), r.W / 2, 8, { align: 'center', scale: 3, colors: this.won || this.human < 0 ? ['#ffffff', '#ffe08a', '#ffb347', '#e0662a'] : ['#e8e8f0', '#a8b0c8', '#6a7090'] });
      Logo.draw(g, A2.id, r.W / 2 - 112, 38, 40); Logo.draw(g, B.id, r.W / 2 + 72, 38, 40);
      E.font.text(g, String(A2.score), r.W / 2 - 40, 40, '#ffffff', { scale: 4, align: 'center', outline: '#000' }); E.font.text(g, '-', r.W / 2, 44, UI.MUTED, { scale: 3, align: 'center', outline: false }); E.font.text(g, String(B.score), r.W / 2 + 40, 40, '#ffffff', { scale: 4, align: 'center', outline: '#000' });
      if (m.so && m.so.winner !== undefined) E.font.text(g, 'SHOOTOUT ' + m.so.marks[0].filter(Boolean).length + '-' + m.so.marks[1].filter(Boolean).length, r.W / 2, 74, UI.GOLD, { align: 'center', outline: false });
      // the three stars
      const cw = Math.min(118, (r.W - 30) / 3), x0 = r.W / 2 - cw * 1.5, y0 = 86;
      for (let k = 0; k < 3; k++) {
        const order = 2 - k, shown = this.revealed > order ? true : false, id = m.stars[k], e = m.byId(id), x = x0 + (2 - k) * cw + 3;
        UI.panel(g, x, y0, cw - 6, 70, { border: shown ? UI.GOLD : '#2a3448' });
        E.font.text(g, '★'.repeat(k + 1) + ' ' + ['FIRST', 'SECOND', 'THIRD'][k] + ' STAR', x + (cw - 6) / 2, y0 + 4, shown ? UI.GOLD : '#3a4a6a', { align: 'center', font: 'tiny', outline: false });
        if (shown && e) {
          e.rig.drawPortrait(g, x + 4, y0 + 14, 36, { zoom: 2.4, turn: .4, bg: m.teams[e.team].def.dark });
          E.font.text(g, e.def.name, x + 44, y0 + 16, '#ffffff', { outline: '#000' }); E.font.text(g, m.teams[e.team].def.abbr + ' #' + e.def.num, x + 44, y0 + 27, m.teams[e.team].def.trim, { outline: false });
          const st = e.stats, line = e.def.pos === 'G' ? st.saves + ' SAVES' : st.goals + 'G ' + st.assists + 'A ' + st.bigHits + ' HITS';
          E.font.text(g, line, x + 44, y0 + 38, '#cfe0f4', { outline: false });
          if (e.def.pos !== 'G' && st.topShot) E.font.text(g, U.kmh(st.topShot) + ' KM/H', x + 44, y0 + 49, UI.MUTED, { font: 'tiny', outline: false });
        }
      }
      // the objectives, ticking stars
      if (m.cfg.objectives.length) m.cfg.objectives.forEach((o, i) => { const ok = !!m.objDone[o.id], show = this.revealed >= 3; E.font.text(g, (show && ok ? '★ ' : '☆ ') + o.text, r.W / 2 - 100, y0 + 76 + i * 10, show && ok ? UI.GOLD : UI.MUTED, { outline: false }); });
      if (this.pep) { const pl = TEXT.pep[(m.cfg.chapter || 1) - 1]; UI.panel(g, 16, r.H - 96, r.W - 32, 34, { border: '#7ad87a' }); Rigs && Cutscene.rigOf('marge').drawPortrait(g, 20, r.H - 93, 28, { zoom: 2.2, turn: .4, bg: '#1a2a1a' }); E.font.text(g, pl, 52, r.H - 90, '#eef4ff', { wrap: r.W - 80, outline: false }); }
      if (this.menu.enabled) { this.menu.y = r.H - 58; this.menu.draw(g, r); UI.legend(g, r, [['confirm', 'SELECT']]); }
      else UI.legend(g, r, [['confirm', 'SKIP']]);
      UI.drawToasts(g, r, 60);
    });
    Talk.draw(r);
  }
};

/* ---- 46-scene-storymap.js ---- */
/* ---- THE CUP RUN MAP (12.4): a snowy highway, the team bus, five town stops (each sign with the rival's logo and the
 * stars earned, locked until the one before is won). The stop in focus shows its chapter and objectives. Then the
 * pre-game scene, chapter 1's warm-up drills, the pre-game card and the game ---- */
const Bus2 = { x: 0, y: 0, to: null };
scenes.storymap = {
  enter(d) {
    d = d || {}; this.i = clamp((d.chapter || Save.nextChapter()) - 1, 0, 4); if (!Save.unlocked(this.i + 1)) this.i = Math.max(0, Save.nextChapter() - 1); this.reset = 0; this.t = 0;
    const p = this.stopXY(this.i, 427, 240); Bus2.x = d.arrived ? this.stopXY(Math.max(0, this.i - 1), 427, 240)[0] : p[0]; Bus2.y = d.arrived ? this.stopXY(Math.max(0, this.i - 1), 427, 240)[1] : p[1];
    Synth.music('menu'); UI.Idle.reset(); Story.step = 'map';
  },
  stopXY(i, W, H) { const a = STORY.chapters[i].at; return [Math.round(20 + a[0] * (W - 40)), Math.round(40 + a[1] * (H - 110))]; },
  update(dt) {
    this.t += dt; this.reset = Math.max(0, this.reset - dt);
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    const move = d => { let j = this.i + d; if (j < 0 || j > 4) return; this.i = j; Synth.sfx('menuMove'); };
    if (UI.anyRep('left') || UI.anyRep('up')) move(-1); if (UI.anyRep('right') || UI.anyRep('down')) move(1);
    const W = game.W, H = game.H, p = UI.pointer(); if (p && UI.mouseMoved) for (let k = 0; k < 5; k++) { const [x, y] = this.stopXY(k, W, H); if (Math.hypot(p[0] - x, p[1] - y) < 18 && k !== this.i) { this.i = k; Synth.sfx('menuMove'); } }
    const ck = game.input.clicked(); let go = UI.anyP('confirm') || UI.anyP('start');
    if (ck) for (let k = 0; k < 5; k++) { const [x, y] = this.stopXY(k, W, H); if (Math.hypot(ck[0] - x, ck[1] - y) < 18) { this.i = k; go = true; } }
    if (go) { if (!Save.unlocked(this.i + 1)) { Synth.sfx('menuBack'); UI.toast('WIN THE GAME BEFORE IT FIRST', '#ff8a8a'); } else { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); startChapter(this.i + 1); return; } }
    if (UI.anyP('lob')) { if (this.reset > 0) { Save.reset(); this.i = 0; UI.toast('A NEW CUP RUN BEGINS', UI.GOLD); this.reset = 0; } else { this.reset = 2.5; Synth.sfx('menuMove'); } }
    if (UI.anyP('cancel')) { Synth.sfx('menuBack'); game.go('title', { menu: true }); }
    const [tx, ty] = this.stopXY(this.i, W, H); Bus2.x = approach(Bus2.x, tx, 160 * dt); Bus2.y = approach(Bus2.y, ty, 160 * dt);
  },
  draw(r) {
    r.sky(['#cfe0f0', '#e8f0f8', '#f4f8fc']);
    const t = game.real;
    r.overlay(g => {
      // snow, pines, the highway between the stops
      for (let k = 0; k < 60; k++) { const x = E.hash2(k, 1) * r.W, y = 40 + E.hash2(k, 2) * (r.H - 80); px.poly(g, [[x, y - 9], [x + 5, y + 2], [x - 5, y + 2]], '#3a6a4a'); px.poly(g, [[x, y - 13], [x + 3, y - 4], [x - 3, y - 4]], '#4a7a5a'); px.rect(g, x - 1, y + 2, 2, 2, '#5a3a22'); }
      for (let k = 0; k < 4; k++) { const [x0, y0] = this.stopXY(k, r.W, r.H), [x1, y1] = this.stopXY(k + 1, r.W, r.H); px.line(g, x0, y0, x1, y1, '#4a4a54', 7); px.line(g, x0, y0, x1, y1, '#6a6a74', 5); for (let s = 0; s < 1; s += .12) px.dot(g, lerp(x0, x1, s), lerp(y0, y1, s), '#ffe84a'); }
      for (let k = 0; k < 40; k++) { const x = (E.hash2(k, 9) * r.W + t * 14 * (1 + E.hash2(k, 3))) % r.W, y = (E.hash2(k, 8) * r.H + t * 22) % r.H; px.dot(g, x, y, '#ffffff'); }
      STORY.chapters.forEach((c, k) => {
        const [x, y] = this.stopXY(k, r.W, r.H), open = Save.unlocked(k + 1), f = k === this.i, stars = Save.data.stars[k + 1] || [];
        UI.panel(g, x - 16, y - 34, 32, 30, { focus: f, bg: open ? ['#1a3060', '#0a1430'] : ['#2a2a34', '#18181e'] });
        Logo.draw(g, c.rival, x - 12, y - 32, 24); if (!open) { px.blend(g, .6, 'normal', () => px.rect(g, x - 15, y - 33, 30, 28, '#18181e')); E.font.text(g, 'LOCKED', x, y - 22, '#8a8a90', { align: 'center', font: 'tiny', outline: false }); }
        px.rect(g, x - 1, y - 4, 2, 6, '#5a5a64');
        for (let s = 0; s < 3; s++) E.font.text(g, '★', x - 9 + s * 7, y + 3, stars[s] ? UI.GOLD : '#9aa4b4', { outline: '#000' });
        if (Save.data.done[k + 1]) E.font.text(g, 'WON', x, y - 44, '#2a8a3a', { align: 'center', font: 'tiny', outline: false });
      });
      // the bus
      const bx = Math.round(Bus2.x), by = Math.round(Bus2.y) + 26; px.rect(g, bx - 10, by - 6, 20, 8, '#e8b43a'); px.rect(g, bx - 9, by - 5, 18, 3, '#cfe8ff'); px.rect(g, bx - 10, by + 2, 20, 1, '#5a3a22'); px.disc(g, bx - 6, by + 3, 2, '#141418'); px.disc(g, bx + 6, by + 3, 2, '#141418'); E.font.text(g, 'MUK', bx, by - 13, '#5a3a22', { align: 'center', font: 'tiny', outline: false });
      UI.title(g, 'THE CUP RUN', r.W / 2, 6, 2);
      const c = STORY.chapters[this.i], open = Save.unlocked(this.i + 1);
      UI.panel(g, 8, r.H - 66, r.W - 16, 48, {});
      E.font.text(g, 'CHAPTER ' + c.n + ': ' + c.title, 16, r.H - 62, UI.GOLD, { outline: '#000' });
      E.font.text(g, 'vs ' + TEAMS[c.rival].name + ' at ' + ARENAS[c.arena].name, 16, r.H - 52, '#eef4ff', { outline: false });
      Objectives.list(c.objectives).forEach((o, k) => E.font.text(g, ((Save.data.stars[c.n] || [])[k] ? '★ ' : '☆ ') + o.text, 16 + k * Math.floor((r.W - 32) / 3), r.H - 40, (Save.data.stars[c.n] || [])[k] ? UI.GOLD : UI.MUTED, { outline: false }));
      E.font.text(g, 'STARS ' + Save.totalStars() + '/15', r.W - 16, r.H - 62, UI.GOLD, { align: 'right', outline: false });
      UI.legend(g, r, [['confirm', open ? 'PLAY' : 'LOCKED'], ['lob', this.reset > 0 ? 'AGAIN TO ERASE' : 'NEW RUN'], ['cancel', 'BACK']]);
      UI.drawToasts(g, r, 30);
    });
  }
};
/** a chapter: the pre-game scene (with its choice), chapter 1's warm-up drills, the pre-game card, the game */
function startChapter(n) {
  Story.chapter = n; Story.st.attempt = 0; const c = Story.ch(n);
  game.go('cutscene', { id: c.pre, chapter: n, onDone: () => {
    if (c.warmup) game.go('warmup', { n }, { fade: 'wipe' });
    else game.go('pregame', { n }, { fade: 'wipe' });
  } }, { fade: 'wipe' });
}
scenes.warmup = {
  enter(d) { this.n = d.n; this.i = 0; this.menu = new UI.Tiles([{ id: 'yes', label: 'WARM UP', sub: 'DRILLS 1-3 WITH MARGE' }, { id: 'no', label: 'SKIP IT', sub: 'STRAIGHT TO THE GAME' }], { cols: 2, w: 130, h: 44, y: 110, onPick: it => it.id === 'yes' ? Drills.chain([1, 2, 3], () => game.go('pregame', { n: this.n }, { fade: 'wipe' })) : game.go('pregame', { n: this.n }, { fade: 'wipe' }) }); Synth.music('locker'); },
  update(dt) { this.menu.update(dt); },
  draw(r) { r.sky(['#1a1410', '#2a2018', '#3a2a1e']); r.overlay(g => { UI.title(g, 'WARM-UP', r.W / 2, 20, 3); Cutscene.rigOf('marge').drawPortrait(g, r.W / 2 - 20, 54, 40, { zoom: 2.6, turn: .3, bg: '#2a1a14' }); E.font.text(g, '"Lace up. Three drills, then we play."', r.W / 2, 98, '#eef4ff', { align: 'center', outline: false }); this.menu.draw(g, r); UI.legend(g, r, [['confirm', 'SELECT']]); }); }
};
/** the pre-game card (12.6): the matchup, the arena, the objectives with star slots, the tactic chosen; ✕ FACE OFF */
scenes.pregame = {
  enter(d) { this.n = d.n; Synth.music('menu'); this.t = 0; },
  update(dt) { this.t += dt; if (this.t > .4 && (UI.anyP('confirm') || UI.anyP('pass') || game.input.clicked())) { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); game.go('match', { cfg: Story.matchCfg(this.n) }, { fade: 'iris' }); } if (UI.anyP('cancel')) game.go('storymap', { chapter: this.n }); },
  draw(r) {
    const c = Story.ch(this.n), f = Save.data.choices[this.n] || {}, tac = f.tactic ? (f.tactic === 'grit' ? 'MEAN AND LOUD' : 'CLEAN AND FAST') : f.lou ? (f.lou === 'loose' ? 'LOU IS LOOSE' : 'KEEP IT ON THE ICE') : f.bear ? (f.bear === 'hunt' ? 'HUNT THE BEAR' : 'IGNORE THE BEAR') : f.doris ? (f.doris === 'early' ? 'DORIS PLAYS EARLY' : 'DORIS PLAYS LATE') : '';
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    r.overlay(g => {
      E.font.text(g, 'CHAPTER ' + c.n, r.W / 2, 8, UI.MUTED, { align: 'center', outline: false });
      UI.title(g, c.title, r.W / 2, 18, 3);
      Logo.draw(g, 'muskrats', r.W / 2 - 110, 54, 64); Logo.draw(g, c.rival, r.W / 2 + 46, 54, 64);
      E.font.title(g, 'VS', r.W / 2, 74, { align: 'center', scale: 3 });
      E.font.text(g, TEAMS.muskrats.short, r.W / 2 - 78, 122, TEAMS.muskrats.trim, { align: 'center', outline: '#000' }); E.font.text(g, TEAMS[c.rival].short, r.W / 2 + 78, 122, TEAMS[c.rival].trim, { align: 'center', outline: '#000' });
      E.font.text(g, ARENAS[c.arena].name + '  ·  3 x ' + U.mmss(c.periodLen) + (c.ot === 'none' ? '  ·  NO OT, THEN THE SHOOTOUT SHOWCASE' : ''), r.W / 2, 136, '#cfe0f4', { align: 'center', outline: false });
      Objectives.list(c.objectives).forEach((o, k) => E.font.text(g, ((Save.data.stars[c.n] || [])[k] ? '★ ' : '☆ ') + o.text, r.W / 2, 152 + k * 11, (Save.data.stars[c.n] || [])[k] ? UI.GOLD : '#eef4ff', { align: 'center', outline: false }));
      if (tac) E.font.text(g, 'TACTIC: ' + tac, r.W / 2, 190, '#7ad87a', { align: 'center', outline: false });
      E.font.text(g, c.spotlight, r.W / 2, 202, UI.MUTED, { align: 'center', font: 'tiny', outline: false });
      Glyphs.text(g, '{confirm} FACE OFF!      {cancel} BACK', r.W / 2, r.H - 16, { align: 'center', color: UI.GOLD });
    });
  }
};

/* ---- 47-scene-practice.js ---- */
/* ---- PRACTICE: COACH MARGE'S DRILLS (11.4), built from match primitives at the Ol' Icebox with the house lights half on.
 * 1 Wheels, 2 Tape to Tape, 3 Top Shelf, 4 One-Timers, 5 Finish Your Check, 6 Gloves Off, 7 KABOOM! Each opens with a
 * voiced Marge line and a prompt panel, tracks its counter, saves its completion; all 7 earn "Marge Approved" ---- */
const Drills = (() => {
  const LIST = [
    { n: 1, title: 'WHEELS', teach: 'Skating, turbo, stops', line: "Skate the gates in order. Twenty-five seconds. The red gate wants a hockey stop.", help: 'STICK SKATE   {turbo} TURBO   REVERSE THE STICK AT SPEED TO STOP' },
    { n: 2, title: 'TAPE TO TAPE', teach: 'Passes, saucers, aim', line: 'Five passes to your mates on the move. Then flip a saucer over the sled.', help: '{pass} PASS   {lob} SAUCER   THE STICK (OR MOUSE) AIMS' },
    { n: 3, title: 'TOP SHELF', teach: 'Shots, aim, lift', line: 'Empty net, four corners. Ping every target.', help: 'TAP {shoot} WRISTER   HOLD {shoot} SLAPSHOT   STICK UP / DOWN PICKS THE SIDE' },
    { n: 4, title: 'ONE-TIMERS', teach: 'One-timers', line: "Dunny feeds you across the crease. Don't stop it. Hit it.", help: 'PASS COMING? {shoot} ONE-TIMER' },
    { n: 5, title: 'FINISH YOUR CHECK', teach: 'Checks, turbo hits, the glass', line: 'Three big hits on the dummies. Put one through the glass.', help: 'NO PUCK: {shoot} CHECK   {turbo} TURBO INTO IT' },
    { n: 6, title: 'GLOVES OFF', teach: 'The fight controls', line: "Big Lou'll spar you. He goes easy. Mostly.", help: '{pass} JAB   {shoot} HAYMAKER   {deke} DUCK   {lob} YANK' },
    { n: 7, title: 'KABOOM!', teach: 'KABOOM mode', line: "Full meter. Score with a KABOOM shot, then dance away from Lou's KABOOM check.", help: 'HOLD {shoot} FULL FOR A KABOOM SHOT   {deke} DEKE HIS CHECK' }
  ];
  let chainList = null, chainDone = null;
  function chain(list, done) { chainList = list.slice(); chainDone = done; next(); }
  function next() { if (!chainList || !chainList.length) { const d = chainDone; chainList = null; chainDone = null; if (d) d(); return; } const n = chainList.shift(); game.go('match', { cfg: cfg(n, true) }, { fade: 'wipe' }); }
  const GATES = [[Rink.C.x - 250, Rink.C.y - 110], [Rink.C.x, Rink.C.y - 140], [Rink.C.x + 260, Rink.C.y - 90], [Rink.C.x + 300, Rink.C.y + 110, 'stop'], [Rink.C.x, Rink.C.y + 130], [Rink.C.x - 300, Rink.C.y + 60]];
  const TARGETS = [[-11, 16], [11, 16], [-11, 4], [11, 4]];
  function cfg(n, chained) {
    const D = LIST[n - 1];
    const c = { mode: 'drill', drill: n, home: 'muskrats', away: n === 6 || n === 7 ? 'muskrats' : 'drillers', arena: 'icebox', intros: false, flood: 'never', replays: n === 4 || n === 7 ? 'auto' : 'off', periods: 1, periodLen: 600,
      humans: [{ team: 0, input: game.input, name: 'P1' }], rules: { clock: false, fights: n === 6, items: false, hazards: false, boom: n === 7 }, noAutoSwitch: true, noSwitch: true, seed: 4200 + n, events: [] };
    if (c.away === c.home) c.away = 'drillers';
    c.onStart = m => setup(m, n);
    c.tick = (m, dt) => tick(m, n, dt);
    c.drawExtra = (r, m) => drawExtra(r, m, n);
    c.onFinal = m => { if (m.drillState.ok) { Save.drillDone(n); if (Save.data.badge && !Save.data.badgeSeen) { Save.data.badgeSeen = true; UI.toast('BADGE: MARGE APPROVED!', UI.GOLD, 4); } } if (chained) next(); else game.go('practice', { drill: n, passed: m.drillState.ok }, { fade: 'wipe' }); };
    return c;
  }
  function setup(m, n) {
    const D = LIST[n - 1], h = m.humans[0], ds = m.drillState = { n, t: 0, count: 0, need: [6, 6, 4, 3, 4, 1, 2][n - 1], ok: false, gate: 0, hits: [], intro: 3.2, msg: null, part: 0, feed: 0 };
    Talk.init(); Synth.say(D.line, CAST.marge.voice); L.ambient = .45;
    const off = s => { s.offIce = true; Skater.setState(s, 'skate'); s.x = Rink.C.x + s.id * 30 - 80; s.y = Rink.Y0 - 30; };
    const keep = s => { s.offIce = false; };
    for (const s of m.skaters) s.drillStay = true;
    m.drillKeep = [];
    const human = m.teams[0].skaters[n === 4 ? 1 : n === 5 || n === 7 ? 2 : 0];
    if (h.skater !== human) Match.swap(m, h, human);
    if (n === 1) { for (const s of m.skaters) if (s !== human) off(s); for (const g of m.goalies) g.offIce = true; }
    if (n === 2) { for (const s of m.teams[1].skaters) off(s); for (const g of m.goalies) g.offIce = true; }
    if (n === 3) { for (const s of m.skaters) if (s !== human) off(s); for (const g of m.goalies) g.offIce = true; }
    if (n === 4) { for (const s of m.teams[1].skaters) off(s); m.teams[0].skaters[2].offIce = true; replaceGoalie(m, 1, TEAMS.muskrats.goalie); m.goalies[0].offIce = true; }
    if (n === 5) { for (const s of m.teams[0].skaters) if (s !== human) off(s); for (const g of m.goalies) g.offIce = true; m.teams[1].skaters.forEach((s, i) => { s.dummy = true; s.def = Object.assign({}, s.def, { name: 'DUMMY ' + (i + 1) }); }); }
    if (n === 6) { for (const s of m.skaters) if (s !== human && s.id !== 3) off(s); for (const g of m.goalies) g.offIce = true; const lou = m.teams[1].skaters[0]; lou.def = Object.assign({}, TEAMS.muskrats.players[2], { team: 'muskrats' }); lou.rig = Rigs.skater(lou.def, false); lou.hairColor = lou.rig.C.hair; lou.helmetColor = lou.rig.hkGear.helmet; m.cfg.aiBonus = [0, -.4]; }
    if (n === 7) { for (const s of m.teams[0].skaters) if (s !== human) off(s); m.teams[1].skaters.forEach((s, i) => { if (i > 0) off(s); }); const lou = m.teams[1].skaters[0]; lou.def = Object.assign({}, TEAMS.muskrats.players[2], { team: 'muskrats' }); lou.rig = Rigs.skater(lou.def, false); lou.hairColor = lou.rig.C.hair; lou.helmetColor = lou.rig.hkGear.helmet; lou.offIce = true; replaceGoalie(m, 1, TEAMS.drillers.goalie); m.goalies[0].offIce = true; }
    m.setPhase('drill', 999);
    place(m, n);
  }
  function replaceGoalie(m, t, def) { const g = m.teams[t].goalie, ng = Goalie.make(m, t, def, t === 0); ng.cpu = true; ng.stats = g.stats; Object.assign(g, { def: ng.def, rig: ng.rig }); }
  /** put the drill's bodies and the puck where the drill starts */
  function place(m, n) {
    const ds = m.drillState, hs = m.humans[0].skater, pk = m.puck;
    Object.assign(pk, Puck.make()); m.noPuck = n === 1 || n === 5 || n === 6;
    for (const s of m.skaters) { s.vx = s.vy = 0; if (s.state !== 'fight') Skater.setState(s, 'skate'); }
    for (const g of m.goalies) { const nt = m.defNet(g.team); g.x = Rink.goalX(nt) - Rink.intoNet(nt) * 12; g.y = Rink.C.y; g.state = 'ready'; }
    if (n === 1) { hs.x = Rink.C.x - 330; hs.y = Rink.C.y; pk.x = -999; pk.y = -999; pk.out = true; }
    if (n === 2) { hs.x = Rink.C.x - 100; hs.y = Rink.C.y; const [a, b] = m.teams[0].skaters.filter(s => s !== hs); a.x = Rink.C.x + 60; a.y = Rink.C.y - 110; b.x = Rink.C.x + 60; b.y = Rink.C.y + 110; Puck.setOwner(m, pk, hs, 'drill'); }
    if (n === 3) { hs.x = Rink.C.x + 200; hs.y = Rink.C.y + (RNG.sim() - .5) * 120; hs.facing = 0; Puck.setOwner(m, pk, hs, 'drill'); }
    if (n === 4) { const gx = Rink.goalX(m.attackNet(0)), dir = m.attackDir(0); hs.x = gx - dir * 78; hs.y = Rink.C.y + 34; hs.facing = dir > 0 ? 0 : PI; const d = m.teams[0].skaters[0]; d.x = gx - dir * 50; d.y = Rink.C.y - 80; Puck.setOwner(m, pk, d, 'drill'); ds.feed = 1.2; }
    if (n === 5) { hs.x = Rink.C.x - 100; hs.y = Rink.C.y + 40; m.teams[1].skaters.forEach((s, i) => { s.offIce = false; s.x = Rink.C.x - 180 + i * 180; s.y = Rink.Y0 + 22; s.facing = PI / 2; }); pk.out = true; pk.x = -999; }
    if (n === 6) { const lou = m.teams[1].skaters[0]; hs.x = Rink.C.x - 20; hs.y = Rink.C.y; lou.x = Rink.C.x + 10; lou.y = Rink.C.y; lou.offIce = false; pk.out = true; pk.x = -999; }
    if (n === 7) { hs.x = Rink.C.x + 120; hs.y = Rink.C.y; Puck.setOwner(m, pk, hs, 'drill'); m.boom[0] = 99.5; Boom.add(m, 0, 5); }
  }
  function tick(m, n, dt) {
    const ds = m.drillState; if (!ds) return; if (ds.done) { if (m.phase !== 'drill_done') m.setPhase('drill_done', 1.6); return; } ds.t += dt; ds.intro = Math.max(0, ds.intro - dt);
    const hs = m.humans[0].skater, pk = m.puck;
    if (m.phase === 'faceoff') { m.setPhase('play'); place(m, n); }
    if (m.phase !== 'play' && m.phase !== 'fight' && m.phase !== 'goal' && m.phase !== 'replay' && m.phase !== 'stoppage' && m.phase !== 'drill_done') m.setPhase('play');
    if (m.phase === 'stoppage' && m.phaseT < -1) { m.setPhase('play'); place(m, n); }
    const success = () => { if (ds.ok) return; ds.ok = true; ds.done = true; Synth.sfx('star'); Synth.say("That's the way. Next!", CAST.marge.voice); Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 2.6); };
    if (n === 1) {
      const g = GATES[ds.gate]; if (g && Math.hypot(hs.x - g[0], hs.y - g[1]) < 26) { if (g[2] === 'stop' && Math.hypot(hs.vx, hs.vy) > 30) { ds.msg = 'STOP IN THE RED GATE!'; } else { ds.gate++; ds.count = ds.gate; Synth.sfx('pickup'); } }
      if (ds.gate >= GATES.length) success(); else if (ds.t > 25 + 3) { ds.t = 0; ds.gate = 0; ds.count = 0; place(m, n); Synth.say('Again. Faster.', CAST.marge.voice); }
    }
    if (n === 2) {
      const mates = m.teams[0].skaters.filter(s => s !== hs && !s.offIce);
      mates.forEach((s, i) => { const a = ds.t * .7 + i * PI; s.ai.tx = Rink.C.x + 60 + Math.cos(a) * 120; s.ai.ty = Rink.C.y + Math.sin(a) * 120; s.ai.thinkT = 9; });
      if (pk.owner && pk.owner !== hs && pk.owner.team === 0) { ds.back = (ds.back || 0) + dt; if (ds.back > .7) { ds.back = 0; pk.owner.passPick = hs.id; Shots.pass(m, pk.owner, false); } }
      if (pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 5)) { ds.idle = (ds.idle || 0) + dt; if (ds.idle > 1.2 || pk.out) { ds.idle = 0; pk.out = false; Puck.setOwner(m, pk, hs, 'drill'); } }
    }
    if (n === 3 && (pk.inNet >= 0 || pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 10 && ds.t > 1))) { ds.reset = (ds.reset || 0) + dt; if (ds.reset > .5) { ds.reset = 0; pk.inNet = -1; pk.out = false; m.setPhase('play'); place(m, n); } }
    if (n === 4) {
      const d = m.teams[0].skaters[0]; d.ai.tx = Rink.goalX(m.attackNet(0)) - m.attackDir(0) * 50; d.ai.ty = Rink.C.y - 80; d.ai.thinkT = 9;
      if (pk.owner === d) { ds.feed -= dt; if (ds.feed <= 0) { ds.feed = 1.4; d.passPick = hs.id; Shots.pass(m, d, false); } }
      hs.ai.tx = hs.x; if ((pk.inNet >= 0 && m.phase !== 'goal') || pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 10 && ds.t > 1) || (pk.owner && pk.owner === hs && ds.t > 2)) { ds.reset = (ds.reset || 0) + dt; if (ds.reset > .6) { ds.reset = 0; pk.inNet = -1; pk.out = false; m.setPhase('play'); place(m, n); } }
    }
    if (n === 5) { for (const s of m.teams[1].skaters) { s.intent.mx = s.intent.my = 0; s.ai.thinkT = 9; if (s.state === 'skate' && Math.hypot(s.vx, s.vy) < 5 && ds.t > 1) { const i = m.teams[1].skaters.indexOf(s); s.x = approach(s.x, Rink.C.x - 180 + i * 180, 40 * dt); s.y = approach(s.y, Rink.Y0 + 22, 40 * dt); } } if (ds.bigs >= 3 && ds.glass) success(); ds.count = Math.min(3, ds.bigs || 0) + (ds.glass ? 1 : 0); }
    if (n === 6 && !m.fight && !ds.started && ds.t > 1.5) { ds.started = true; Fight.start(m, hs, m.teams[1].skaters[0]); }
    if (n === 6 && ds.started && !m.fight && !ds.done && m.phase !== 'fight') { if (ds.won) success(); else { ds.started = false; ds.t = 0; place(m, n); Synth.say('Up you get. Again.', CAST.marge.voice); } }
    if (n === 7) {
      if (m.kaboom[0] <= 0 && ds.part === 0 && ds.t > 1) { m.boom[0] = 100; Boom.start(m, 0); }
      if (ds.part === 0 && (pk.out || (!pk.owner && Math.hypot(pk.vx, pk.vy) < 8 && ds.t > 2 && m.phase === 'play'))) { place(m, n); }
      if (ds.part === 1) { const lou = m.teams[1].skaters[0]; lou.offIce = false; m.kaboom[1] = Math.max(m.kaboom[1], 5); lou.ai.tx = hs.x; lou.ai.ty = hs.y; lou.ai.thinkT = 9; lou.ai.turbo = true; if (U.dist(lou, hs) < 28 && lou.checkCD <= 0 && lou.state === 'skate') lou.intent.press.shoot = true; ds.louT = (ds.louT || 0) + dt;
        if (ds.dodged) success(); else if (hs.state === 'down') { ds.louT = 0; ds.part = 1; lou.x = hs.x + 200; lou.y = hs.y; Synth.say('Deke him! When he lunges!', CAST.marge.voice); } else if (ds.louT > 7) success(); }
    }
  }
  function wire() {
    const M = () => Match.m, ds = () => M() && M().cfg.mode === 'drill' ? M().drillState : null;
    Bus.sim('pass_complete', e => { const d = ds(); if (!d || d.n !== 2) return; const m = M(), from = m.byId(e.from); if (from && from.ctrl.kind === 'human') { if (m.puck.passKind === 'saucer' || d.lastKind === 'saucer') d.saucer = true; d.count++; if (d.count >= 5 && d.saucer) { d.ok = true; d.done = true; Synth.sfx('star'); Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 2.6); } } });
    Bus.sim('pass', e => { const d = ds(); if (d && d.n === 2) d.lastKind = e.kind; });
    Bus.sim('goal', e => { const d = ds(); if (!d) return; const m = M();
      if (d.n === 3) { const pk = m.puck, dy = pk.y - Rink.C.y, k = TARGETS.findIndex((t2, i) => !d.hits.includes(i) && Math.abs(dy - t2[0]) < 6 && Math.abs(pk.z - t2[1]) < 6); if (k >= 0) { d.hits.push(k); d.count = d.hits.length; Synth.sfx('post'); if (d.hits.length >= 4) { d.ok = true; d.done = true; Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 2.6); } } }
      if (d.n === 4 && e.kind === 'onetimer') { d.count++; if (d.count >= 3) { d.ok = true; d.done = true; Hud.show('DRILL COMPLETE!', { t: 2.5, scale: 3 }); m.setPhase('drill_done', 4); } }
      if (d.n === 7 && e.kind === 'kaboom' && d.part === 0) { d.part = 1; d.count = 1; const lou = m.teams[1].skaters[0], hs = m.humans[0].skater; lou.offIce = false; lou.x = Rink.C.x - 200; lou.y = Rink.C.y; Synth.say("Now Lou's coming. Deke him!", CAST.marge.voice); m.kaboom[1] = 8; }
    });
    Bus.sim('hit', e => { const d = ds(); if (d && d.n === 5 && e.big) d.bigs = (d.bigs || 0) + 1; });
    Bus.sim('glass', e => { const d = ds(); if (d && d.n === 5 && e.state === 'shattered') d.glass = true; });
    Bus.sim('fight_end', e => { const d = ds(); if (d && d.n === 6) { const m = M(), w = m.byId(e.winner); d.won = !!(w && w.ctrl.kind === 'human'); } });
    Bus.sim('deke_dodge', e => { const d = ds(); if (d && d.n === 7 && d.part === 1) { const m = M(), s = m.byId(e.by); if (s && s.ctrl.kind === 'human') { d.dodged = true; d.count = 2; } } });
  }
  function drawExtra(r, m, n) {
    const ds = m.drillState; if (!ds) return; const D = LIST[n - 1];
    if (n === 1) GATES.forEach((g, i) => { const done = i < ds.gate, cur = i === ds.gate; r.decal(() => { r.groundRing(g[0], g[1], 24, g[2] === 'stop' ? '#ff4a4a' : done ? '#5ad85a' : cur ? '#ffd36a' : '#7ab8ff', 1); }); r.queue(g[0], g[1], 30, gg => { const q = r.w(g[0], g[1], 30); E.font.text(gg, String(i + 1), q[0], q[1], cur ? '#ffd36a' : '#ffffff', { align: 'center', scale: 2, outline: '#000' }); if (g[2] === 'stop') E.font.text(gg, 'STOP', q[0], q[1] + 14, '#ff6a6a', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true }); });
    if (n === 2) r.queue(Rink.C.x - 20, Rink.C.y, 0, g => r.box(g, Rink.C.x - 26, Rink.C.y - 30, 0, Rink.C.x - 14, Rink.C.y + 30, 7, '#c83a2a', '#8a2a1a'));
    if (n === 3) { const gx = Rink.goalX(m.attackNet(0)); TARGETS.forEach((t2, i) => r.queue(gx, Rink.C.y + t2[0], t2[1], g => { const q = r.w(gx, Rink.C.y + t2[0], t2[1]); px.disc(g, q[0], q[1], 4, ds.hits.includes(i) ? '#5ad85a' : '#ff4a4a'); px.disc(g, q[0], q[1], 2, '#ffffff'); }, { emissive: true, bias: 2 })); }
    r.overlay(g => {
      UI.panel(g, 8, r.H - 54, Math.min(r.W - 130, 300), 40, { border: '#7ad87a', bg: ['#10281a', '#08140c'] });
      E.font.text(g, 'DRILL ' + n + ': ' + D.title, 14, r.H - 50, '#7ad87a', { outline: '#000' });
      Glyphs.text(g, D.help, 14, r.H - 38, { color: '#eef4ff' });
      const label = n === 1 ? 'GATE ' + Math.min(6, ds.gate + 1) + '/6   ' + U.mmss(Math.max(0, 28 - ds.t)) : n === 2 ? 'PASSES ' + Math.min(5, ds.count) + '/5   SAUCER ' + (ds.saucer ? '✓' : '—') : n === 3 ? 'TARGETS ' + ds.hits.length + '/4' : n === 4 ? 'ONE-TIMER GOALS ' + ds.count + '/3' : n === 5 ? 'BIG HITS ' + Math.min(3, ds.bigs || 0) + '/3   GLASS ' + (ds.glass ? '✓' : '—') : n === 6 ? 'WIN THE SPAR' : 'KABOOM GOAL ' + (ds.part > 0 ? '✓' : '—') + '   DODGE LOU ' + (ds.dodged ? '✓' : '—');
      E.font.text(g, label.replace(/✓/g, 'OK'), 14, r.H - 26, UI.GOLD, { outline: '#000' });
      if (ds.intro > 0) { const w = Math.min(r.W - 40, 330); UI.panel(g, r.W / 2 - w / 2, 60, w, 46, { border: '#7ad87a' }); Cutscene.rigOf('marge').drawPortrait(g, r.W / 2 - w / 2 + 4, 64, 38, { zoom: 2.4, turn: .3, bg: '#1a2a1a' }); E.font.text(g, D.line, r.W / 2 - w / 2 + 46, 66, '#eef4ff', { wrap: w - 54, outline: false }); }
      if (ds.msg) { E.font.text(g, ds.msg, r.W / 2, r.H * .4, '#ff8a8a', { align: 'center', scale: 2, outline: '#000' }); ds.msgT = (ds.msgT || 0) + 1 / 60; if (ds.msgT > 1.5) { ds.msg = null; ds.msgT = 0; } }
    });
  }
  return { LIST, cfg, chain, wire, place };
})();

scenes.practice = {
  enter(d) { d = d || {}; this.i = clamp((d.drill || 1) - 1, 0, 6); this.go = !!(d.drill && !('passed' in d)) && !!d.direct; Synth.music('menu'); UI.Idle.reset(); if (d.passed) UI.toast('DRILL ' + d.drill + ' PASSED!', '#7ad87a'); if (d.drill && d.start) { game.go('match', { cfg: Drills.cfg(d.drill) }); } },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    if (UI.anyRep('left')) { this.i = (this.i + 6) % 7; Synth.sfx('menuMove'); } if (UI.anyRep('right')) { this.i = (this.i + 1) % 7; Synth.sfx('menuMove'); }
    const ck = game.input.clicked(); let go = UI.anyP('confirm') || UI.anyP('start');
    if (ck && this.hits) { const h = this.hits.find(h => ck[0] >= h.x && ck[0] < h.x + h.w && ck[1] >= h.y && ck[1] < h.y + h.h); if (h) { if (h.k === 0) go = true; else { this.i = (this.i + h.k + 7) % 7; Synth.sfx('menuMove'); } } }
    const p = UI.pointer(); void p;
    if (go) { Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); game.go('match', { cfg: Drills.cfg(this.i + 1) }, { fade: 'wipe' }); }
    if (UI.anyP('cancel')) { Synth.sfx('menuBack'); game.go('title', { menu: true }); }
  },
  draw(r) {
    r.sky(['#0e1a10', '#16281a', '#1e3a24']);
    r.overlay(g => {
      UI.title(g, "COACH MARGE'S DRILLS", r.W / 2, 8, 2, ['#ffffff', '#d8f8d8', '#7ad87a', '#2a6a3a']);
      this.hits = [];
      const cw = Math.min(150, (r.W - 30) / 2.4);
      for (const k of [-1, 0, 1]) {
        const i = (this.i + k + 7) % 7, D = Drills.LIST[i], f = k === 0, w = f ? cw : cw * .7, h = f ? 120 : 90, x = r.W / 2 + k * (cw * .92) - w / 2, y = f ? 40 : 55;
        UI.panel(g, x, y, w, h, { focus: f, bg: f ? ['#1a3a20', '#0a1a0c'] : ['#101a12', '#0a120c'] }); this.hits.push({ x, y, w, h, k });
        E.font.text(g, 'DRILL ' + D.n, x + w / 2, y + 6, f ? '#7ad87a' : UI.MUTED, { align: 'center', outline: false });
        E.font.title(g, D.title, x + w / 2, y + 18, { align: 'center', scale: f ? 2 : 1, colors: f ? ['#ffffff', '#ffe08a', '#ffb347'] : ['#c8d0d8', '#a8b0b8', '#889098'] });
        E.font.text(g, D.teach, x + w / 2, y + (f ? 44 : 34), '#cfe0f4', { align: 'center', wrap: w - 12, outline: false });
        if (f) E.font.text(g, '"' + D.line + '"', x + w / 2, y + 62, UI.MUTED, { align: 'center', wrap: w - 14, outline: false, font: 'tiny' });
        E.font.text(g, Save.data.drills[D.n] ? '★ PASSED' : '☆ NOT YET', x + w / 2, y + h - 12, Save.data.drills[D.n] ? UI.GOLD : '#5a6478', { align: 'center', outline: false });
      }
      E.font.text(g, Object.keys(Save.data.drills).length + '/7 PASSED' + (Save.data.badge ? '   ·   MARGE APPROVED' : ''), r.W / 2, 172, Save.data.badge ? UI.GOLD : UI.MUTED, { align: 'center', outline: false });
      UI.legend(g, r, [['left', 'CHOOSE'], ['confirm', 'START'], ['cancel', 'BACK']]);
      UI.drawToasts(g, r, 186);
    });
  }
};

/* ---- 48-scene-info.js ---- */
/* ---- RECORDS (12.10), ABOUT (12.1) and CREDITS (12.12) ---- */
scenes.records = {
  enter() { this.page = 0; Synth.music('menu'); UI.Idle.reset(); },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    if (UI.anyRep('left') || UI.anyRep('right') || padTab()) { this.page = 1 - this.page; Synth.sfx('menuMove'); }
    const ck = game.input.clicked(); if (ck) { if (ck[0] < 40) this.page = 0; else if (ck[0] > game.W - 40) this.page = 1; }
    if (UI.anyP('cancel') || UI.anyP('confirm')) { Synth.sfx('menuBack'); game.go('title', { menu: true, tile: 3 }); }
  },
  draw(r) {
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    const R2 = Records.get();
    const big = this.page === 0 ? [['HARDEST SHOT', R2.shot ? U.kmh(R2.shot) : 0, 'KM/H'], ['BIGGEST HIT', R2.hit || 0, 'POWER'], ['MOST GOALS IN A GAME', R2.goals || 0, 'GOALS'], ['FIGHTS WON', R2.fights || 0, 'SCRAPS']]
      : [['KABOOMS', R2.kabooms || 0, 'TIMES'], ['CUP RUN STARS', Save.totalStars(), 'OF 15'], ['DRILLS PASSED', Object.keys(Save.data.drills).length, 'OF 7'], ['GAMES WON', R2.wins || 0, 'OF ' + (R2.games || 0)]];
    r.overlay(g => {
      UI.title(g, 'RECORDS', r.W / 2, 8, 3);
      const cw = Math.min(190, (r.W - 30) / 2);
      big.forEach(([lab, v, unit], i) => { const x = r.W / 2 - cw + (i % 2) * cw + 4, y = 46 + Math.floor(i / 2) * 76; UI.panel(g, x, y, cw - 8, 66, {}); E.font.text(g, lab, x + (cw - 8) / 2, y + 6, UI.MUTED, { align: 'center', outline: false }); E.font.text(g, String(v), x + (cw - 8) / 2, y + 22, '#ffffff', { align: 'center', scale: 4, outline: '#000' }); E.font.text(g, unit, x + (cw - 8) / 2, y + 54, UI.GOLD, { align: 'center', font: 'tiny', outline: false }); });
      if (this.page === 1) { const badges = [Save.data.badge ? 'MARGE APPROVED' : null, Save.data.finished ? 'KABOOM CUP CHAMPIONS' : null].filter(Boolean); E.font.text(g, badges.length ? 'BADGES: ' + badges.join('  ·  ') : 'BADGES: none yet. Pass every drill; win the Cup.', r.W / 2, 202, UI.GOLD, { align: 'center', outline: false }); }
      E.font.text(g, '<', 12, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' }); E.font.text(g, '>', r.W - 20, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' });
      E.font.text(g, 'PAGE ' + (this.page + 1) + ' / 2', r.W / 2, r.H - 26, UI.MUTED, { align: 'center', outline: false });
      UI.legend(g, r, [['left', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
/** L1 / R1 page through screens */
const padTab = () => game.players.some(I => I.pressed('chirp') || I.pressed('turbo'));

/* ---- the About pages: Credits, Source Information, Testing / Engine / Prompt Feedback, Engine changes (the same text as
 * the build's chat reply and exit-interview.json) ---- */
const ABOUT = [
  ['CREDITS', [
    'Ice Hoc-Kaboom — game design, code, art, animation, writing and music: Claude Opus 5.5 (claude-opus-5-5), for Michael Crosato\'s cc-matrix.',
    'Engine: my-3D2dge v0.85.2 (MIT), the handoff package, patched (see Engine changes).',
    'Online: AI Hub Session Protocol v1, session client 1.4.0 (shared-world).',
    'Every sound, voice and song is synthesized in code: no audio files. Voices are Animalese-style babble through formant filters.',
    'Props from the engine\'s core shape library (pine, bench). Everything else (rinks, gear, logos, the Flood Wagon, the Cup) is drawn in code.',
    'Built from PLAN.md. Ice hockey is a sport; every team, town and person here is invented.'
  ]],
  ['SOURCE INFORMATION', ['FEEDBACK:source']],
  ['TESTING FEEDBACK', ['FEEDBACK:testing']],
  ['ENGINE FEEDBACK', ['FEEDBACK:engine']],
  ['PROMPT FEEDBACK', ['FEEDBACK:prompt']],
  ['ENGINE CHANGES', ['FEEDBACK:changes']]];
const FEEDBACK = { changes: INTERVIEW.engineChanges, source: INTERVIEW.sourceLines, testing: INTERVIEW.testingFeedback, engine: INTERVIEW.engineFeedback, prompt: INTERVIEW.promptFeedback };
scenes.about = {
  enter() { this.page = 0; this.scroll = 0; Synth.music('menu'); UI.Idle.reset(); },
  update(dt) {
    if (UI.Idle.step(dt) > 10) return game.go('attract', null, { fade: 'dissolve' });
    const n = ABOUT.length;
    if (UI.anyRep('right') || padTab()) { this.page = (this.page + 1) % n; this.scroll = 0; Synth.sfx('menuMove'); } if (UI.anyRep('left')) { this.page = (this.page + n - 1) % n; this.scroll = 0; Synth.sfx('menuMove'); }
    if (UI.anyRep('down')) this.scroll = Math.min(this.maxScroll || 0, this.scroll + 2); if (UI.anyRep('up')) this.scroll = Math.max(0, this.scroll - 2);
    const ck = game.input.clicked(); if (ck) { if (ck[0] < 40) this.page = (this.page + n - 1) % n; else if (ck[0] > game.W - 40) this.page = (this.page + 1) % n; }
    if (UI.anyP('cancel') || UI.anyP('confirm')) { Synth.sfx('menuBack'); game.go('title', { menu: true, tile: 5 }); }
  },
  draw(r) {
    r.sky(['#060a18', '#0e1a34', '#18284a']);
    const [title, lines0] = ABOUT[this.page], lines = lines0[0] && lines0[0].startsWith('FEEDBACK:') ? FEEDBACK[lines0[0].slice(9)] : lines0;
    r.overlay(g => {
      E.font.text(g, 'ABOUT  ' + (this.page + 1) + ' / ' + ABOUT.length, r.W / 2, 6, UI.MUTED, { align: 'center', outline: false });
      UI.title(g, title, r.W / 2, 16, 2);
      UI.panel(g, 26, 38, r.W - 52, r.H - 62, {});
      const all = []; for (const l of lines) { for (const w of E.font.wrap(l, r.W - 70)) all.push(w); all.push(''); }
      const vis = Math.floor((r.H - 82) / 9); this.maxScroll = Math.max(0, all.length - vis); this.scroll = Math.min(this.scroll, this.maxScroll);
      all.slice(this.scroll, this.scroll + vis).forEach((w, i) => E.font.text(g, w, 34, 44 + i * 9, '#eef4ff', { outline: false }));
      if (this.maxScroll > 0) E.font.text(g, (this.scroll > 0 ? '↑  ' : '') + (this.scroll < this.maxScroll ? 'MORE ↓' : ''), r.W - 34, r.H - 35, UI.GOLD, { align: 'right', outline: false });
      E.font.text(g, '<', 10, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' }); E.font.text(g, '>', r.W - 18, r.H / 2, UI.MUTED, { scale: 2, outline: '#000' });
      UI.legend(g, r, [['left', 'PAGE'], ['up', 'SCROLL'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- CREDITS: the end roll over the Cup Run's highlight replays (or the Icebox at night), then Coach Marge: "Same
 * time next year." and the title, with the Cup on display ---- */
scenes.credits = {
  view: 'threequarter', views: ['threequarter', 'brawler'], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.t = 0; this.ending = !!d.ending; this.h = Replay.hilites.slice(); this.hi = 0;
    this.m = Match.m && this.h.length ? Match.m : Title.background(); World.prepare(this.m); L.enabled = true; L.ambient = .5;
    Synth.music('credits', { restart: true });
    this.lines = ['ICE HOC-KABOOM', '', 'THE MUKLUK FALLS MUSKRATS', '#9 DUNNY MACPHAIL', '#19 SNIPES SANDHU', '#44 BIG LOU BEAUDOIN', '#31 LEMMY KOWALCHUK', 'AND PIPESY AND CLANG', '', 'COACH MARGE PELLETIER', 'DORIS ON THE ORGAN', 'OLD GUS AND THE FLOOD WAGON', '', 'IN THE BOOTH', 'CHUCK WALLOP', 'MOOSE PLUNKETT', '',
      'GAME BY', 'CLAUDE OPUS 5.5', 'FOR MICHAEL CROSATO\'S CC-MATRIX', '', 'ENGINE', 'MY-3D2DGE V0.85.2', '', 'ONLINE', 'AI HUB SESSION PROTOCOL V1', '', 'ALL SOUND MADE IN CODE', '', 'NO PARKING METERS WERE HARMED', '', 'THANKS FOR PLAYING'];
    this.playNext();
  },
  playNext() { if (!this.h.length) return; const c = this.h[this.hi++ % this.h.length]; Replay.play(c.frames, c.label, .6); },
  update(dt) {
    this.t += dt; const m = this.m; Match.m = m;
    if (Replay.on) Replay.step(m, dt, false); else if (this.h.length) this.playNext(); else { Match.step(dt); }
    Cam.update(m, dt); Crowd.step(dt, m);
    const end = this.lines.length * 12 + 260;
    if (this.t * 22 > end || (this.t > 2 && UI.anyP('confirm'))) { if (!this.done) { this.done = true; Replay.stop(); if (this.ending) { Synth.say('Same time next year.', CAST.marge.voice); game.go('cutscene', { id: 'teaser', onDone: () => game.go('title', { menu: true }) }); this.ending = false; } else game.go('title', { menu: true }, { fade: 'wipe' }); } }
  },
  exit() { this.done = false; Replay.stop(); },
  draw(r) {
    World.draw(r, this.m);
    r.overlay(g => {
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a4a6a'));
      const y0 = r.H - this.t * 22;
      this.lines.forEach((l, i) => { const y = y0 + i * 12; if (y < -10 || y > r.H + 10) return; if (i === 0) E.font.title(g, l, r.W / 2, y, { align: 'center', scale: 2 }); else E.font.text(g, l, r.W / 2, y, /^(GAME BY|ENGINE|ONLINE|IN THE BOOTH)$/.test(l) ? UI.GOLD : '#ffffff', { align: 'center', outline: '#000' }); });
      if (Replay.on) E.font.text(g, 'HIGHLIGHT: ' + Replay.label, 8, 8, '#ff8a8a', { outline: '#000' });
      Glyphs.text(g, '{confirm} SKIP', r.W - 8, r.H - 14, { align: 'right', color: UI.MUTED });
    });
  }
};

/* ---- 49-scene-session.js ---- */
/* ---- THE SESSION SCENE (14.2): in an AI Hub round there is no title or menu. Our own card (the arena at night, each
 * player on their team's blue line with a nameplate in their seat color, how to win, this player's controls, ready
 * marks, the countdown; Enter / ✕ answers Ready, △ / T / a click on MORE TIME asks for more), then 3-2-1 and one
 * period. No pausing: Options / Esc opens a small overlay (Sound, Music, Voices, Button symbols, Camera) while the
 * skater coasts ---- */
scenes.session = {
  view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], camera: { zoom: false },
  enter() { this.t = 0; this.ov = false; this.oi = 0; L.enabled = true; L.ambient = .45; Synth.music('card'); if (!Net.active) Net.connect(); },
  update(dt) {
    this.t += dt; const st = Net.st, m = Match.m;
    if (!st.active || !m) return;
    if (st.ended) return;
    const I = game.input;
    if (!st.started) {
      // the card: ready, more time; it changes nothing in the round
      if (!st.info.server) {
        if (I.pressed('confirm') || I.pressed('pass')) { try { AIHub.answer('ready'); } catch (e) { game.fail('answer', e); } Synth.sfx('menuSel'); }
        if (I.pressed('lob') || (I.held && I.held.has('KeyT') && !this.tHeld)) { try { AIHub.answer('more'); } catch (e) { game.fail('answer', e); } Synth.sfx('menuMove'); }
        this.tHeld = !!(I.held && I.held.has('KeyT'));
        const ck = I.clicked(); if (ck && this.btn) { if (inBox(ck, this.btn.ready)) { AIHub.answer('ready'); Synth.sfx('menuSel'); } else if (inBox(ck, this.btn.more)) { AIHub.answer('more'); Synth.sfx('menuMove'); } }
      }
      const t = this.t; Cam.update(m, dt, { view: 'threequarter', zoom: 1 }); game.focus(Rink.C.x + Math.sin(t * .2) * 120, Rink.C.y, 8);
      for (const s of m.skaters) { const dir = m.attackDir(s.team); s.x = Rink.C.x - dir * 110; s.y = Rink.C.y - 70 + s.slot * 70; s.facing = PI / 2; Skater.pose(m, s, dt); }
      for (const g of m.goalies) Goalie.update(m, g, dt);
      return;
    }
    // the small overlay: Options or Esc
    if (I.pressed('pause') && !st.info.server) { this.ov = !this.ov; Synth.sfx(this.ov ? 'menuSel' : 'menuBack'); }
    if (this.ov) this.overlayStep(I);
    const hu = m.humans.find(h => h.kind === 'local');
    if (this.ov && hu) { I.consumeAll(); }
    Net.step(dt);
    if (!st.info.server) { Cam.update(m, dt); Talk.step(dt); Crowd.step(dt, m); Fx.frame(m, dt); }
  },
  rows: [['sound', 'Sound'], ['music', 'Music'], ['voices', 'Voices'], ['buttons', 'Button symbols'], ['camera', 'Camera'], ['back', 'Back']],
  overlayStep(I) {
    const R = this.rows; if (I.repeat('up', .3, .1)) this.oi = (this.oi + R.length - 1) % R.length; if (I.repeat('down', .3, .1)) this.oi = (this.oi + 1) % R.length;
    const k = R[this.oi][0], d = I.repeat('left', .3, .1) ? -1 : I.repeat('right', .3, .1) || I.pressed('confirm') ? 1 : 0; if (!d) return;
    if (k === 'back') { this.ov = false; return; }
    if (k === 'sound') game.settings.set('sound', !S('sound')); if (k === 'music') game.settings.set('music', clamp(+(S('music') + d * .1).toFixed(2), 0, 1)); if (k === 'voices') game.settings.set('voices', clamp(+(S('voices') + d * .1).toFixed(2), 0, 1));
    if (k === 'buttons') game.settings.set('buttons', S('buttons') === 'xbox' ? 'playstation' : 'xbox'); if (k === 'camera') Cam.cycle();
    Synth.sfx('menuMove');
  },
  draw(r) {
    const st = Net.st, m = Match.m;
    if (!st.active || !m) { r.sky(['#05070d', '#0a1020', '#101a30']); r.overlay(g => E.font.text(g, 'CONNECTING…', r.W / 2, r.H / 2, '#ffffff', { align: 'center', outline: false })); return; }
    if (st.info && st.info.server) { r.sky(['#05070d', '#0a1020', '#101a30']); r.overlay(g => { E.font.text(g, 'HOSTING  ' + m.teams[0].def.abbr + ' ' + m.teams[0].score + ' - ' + m.teams[1].score + ' ' + m.teams[1].def.abbr + '  ' + U.mmss(m.clock), r.W / 2, r.H / 2, '#9fb2cc', { align: 'center', outline: false }); }); return; }
    World.draw(r, m);
    if (!st.started) { this.card(r, m); return; }
    Hud.draw(r, m); Talk.draw(r);
    r.overlay(g => {
      if (st.ended) { UI.panel(g, r.W / 2 - 110, r.H / 2 - 30, 220, 50, {}); E.font.title(g, 'FINAL', r.W / 2, r.H / 2 - 24, { align: 'center', scale: 2 }); E.font.text(g, m.teams[0].def.abbr + ' ' + m.teams[0].score + ' - ' + m.teams[1].score + ' ' + m.teams[1].def.abbr, r.W / 2, r.H / 2 + 2, '#ffffff', { align: 'center', scale: 2, outline: '#000' }); }
      if (this.ov) { UI.panel(g, r.W / 2 - 80, 50, 160, this.rows.length * 14 + 14, {}); this.rows.forEach(([k, lab], i) => { const v = k === 'sound' ? (S('sound') ? 'ON' : 'OFF') : k === 'music' ? Math.round(S('music') * 100) + '%' : k === 'voices' ? Math.round(S('voices') * 100) + '%' : k === 'buttons' ? (S('buttons') === 'xbox' ? 'XBOX' : 'PLAYSTATION') : k === 'camera' ? (S('camera') === 'overhead' ? 'OVERHEAD' : 'BROADCAST') : ''; E.font.text(g, lab, r.W / 2 - 72, 58 + i * 14, i === this.oi ? UI.GOLD : '#eef4ff', { outline: false }); E.font.text(g, v, r.W / 2 + 72, 58 + i * 14, '#cfe0f4', { align: 'right', outline: false }); }); }
    });
  },
  card(r, m) {
    const st = Net.st, c = st.card || {}, t = game.real;
    for (let i = 0; i < 3; i++) L.add(Rink.C.x + Math.sin(t * .6 + i * 2) * 200, Rink.C.y + Math.cos(t * .4 + i) * 100, 40, 100, 1, { color: '#ffffff' });
    r.overlay(g => {
      px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#4a5a7a'));
      E.font.title(g, 'ICE HOC-KABOOM', r.W / 2, 6, { align: 'center', scale: 3, colors: ['#ffffff', '#cfe8ff', '#ffb347', '#ff6a2a'] });
      E.font.text(g, m.teams[0].def.short + '  vs  ' + m.teams[1].def.short + '  ·  ' + m.arena.name, r.W / 2, 34, '#ffe8a0', { align: 'center', outline: '#000' });
      // the players on their teams' blue lines: nameplates in their seat colors, ready marks
      st.players.forEach((p, i) => { const hu = m.humans.find(h => h.pid === p.id), s = hu && hu.skater; if (!s) return; const q = World.map ? null : null; void q;
        const sx = s.team === 0 ? 60 : r.W - 60, sy = 54 + Math.floor(i / 2) * 16 + (s.team ? 0 : 0); const ready = (c.ready || []).includes(p.id), name = U.sanitize(p.name);
        UI.panel(g, sx - 50, sy, 100, 14, { border: hu.color, bg: ready ? ['#1c3a20', '#0a1a0c'] : undefined }); E.font.text(g, name + (p.id === st.me ? ' (YOU)' : ''), sx - 44, sy + 3, hu.color, { outline: false }); if (ready) E.font.text(g, 'READY', sx + 46, sy + 3, '#7ad87a', { align: 'right', font: 'tiny', outline: false }); });
      E.font.text(g, m.teams[0].def.abbr + ' (HOME)', 60, 46, m.teams[0].def.trim, { align: 'center', outline: '#000' }); E.font.text(g, m.teams[1].def.abbr + ' (AWAY)', r.W - 60, 46, m.teams[1].def.trim, { align: 'center', outline: '#000' });
      UI.panel(g, r.W / 2 - 150, r.H - 100, 300, 62, {});
      E.font.text(g, 'HOW TO WIN: Outscore the other team in one 3-minute period', r.W / 2, r.H - 95, '#ffffff', { align: 'center', outline: false });
      Glyphs.text(g, 'STICK SKATE  {pass} PASS  {shoot} SHOOT/CHECK  {deke} DEKE  {turbo} TURBO', r.W / 2, r.H - 82, { align: 'center', color: '#cfe0f4' });
      Glyphs.text(g, '{lob} SAUCER / GLOVES   {chirp} CHIRP   {switch} SWITCH', r.W / 2, r.H - 70, { align: 'center', color: '#cfe0f4' });
      const left = c.left === null || c.left === undefined ? (c.starting ? 'STARTING…' : c.paused ? 'PAUSED: MORE TIME' : '') : 'STARTS IN ' + Math.ceil(c.left / 1000);
      E.font.text(g, left, r.W / 2, r.H - 56, UI.GOLD, { align: 'center', outline: false });
      const me = (c.ready || []).includes(st.me);
      this.btn = { ready: [r.W / 2 - 110, r.H - 32, 100, 18], more: [r.W / 2 + 10, r.H - 32, 100, 18] };
      UI.panel(g, ...this.btn.ready, { focus: !me, bg: me ? ['#1c3a20', '#0a1a0c'] : undefined }); Glyphs.text(g, me ? 'READY ✓'.replace('✓', '') + ' OK' : '{confirm} READY', r.W / 2 - 60, r.H - 27, { align: 'center', color: me ? '#7ad87a' : UI.GOLD });
      UI.panel(g, ...this.btn.more, { focus: !!c.asked }); Glyphs.text(g, c.asked ? 'MORE TIME: ASKED' : '{lob} MORE TIME (T)', r.W / 2 + 60, r.H - 27, { align: 'center', color: c.asked ? '#ffb347' : '#cfe0f4' });
    });
  }
};
const inBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];

/* ---- 50-scene-match.js ---- */
/* ---- THE MATCH SCENE: the world drawn (floor, scuffs, thin ice, boards, glass, nets, stands, crowd, benches, props,
 * skaters, goalies, officials, the mascot, items, the puck), the director, the booth, the HUD; player intros; the
 * intermission (period card, then the Flood Wagon offered); the final to the results ---- */
const World = (() => {
  let map = null, key = '';
  const WSPR = {}; for (const k in Items2.SPR) WSPR[k] = Items2.SPR[k];
  function prepare(m) {
    const k = m.arena.id + ':' + m.teams[0].id;
    if (k !== key) { map = Rink.build(m.arena.id, m.teams[0].id); key = k; Crowd.build(m.arena.id, m.teams[0].id); }
    game.cam.bounds = v => map.bounds(v);
    return map;
  }
  function drawPuck(r, m) {
    const pk = m.puck, rp = Replay.posOf('pk'), x = rp ? rp[0] : pk.x, y = rp ? rp[1] : pk.y, z = rp ? rp[2] : pk.z, fire = rp ? rp[3] : pk.onFire;
    if ((m.phase === 'faceoff' && m.faceoff && !m.faceoff.dropped && !rp) || m.noPuck) return;
    r.shadow(x, y, 2.4, .5);
    const trail = S('trail'), sp = Math.hypot(pk.vx, pk.vy);
    if (!rp && !pk.owner && (sp > 300 || trail === 'glow') && trail !== 'off' && pk.trail.length > 2) r.queue(x, y, z, g => { const T0 = pk.trail; for (let i = 1; i < T0.length; i++) { const a = r.w(...T0[i - 1]), b = r.w(...T0[i]); px.blend(g, (i / T0.length) * (trail === 'glow' || m.cheats.glowPuck ? .7 : .4), trail === 'glow' || m.cheats.glowPuck ? 'add' : 'normal', () => px.line(g, a[0], a[1], b[0], b[1], fire ? '#ff8a2a' : trail === 'glow' || m.cheats.glowPuck ? '#4af0ff' : '#e8eef4', 2)); } }, { emissive: true });
    r.queue(x, y, z, g => {
      const [sx, sy] = r.w(x, y, z + .8), X = Math.round(sx), Y = Math.round(sy);
      if (fire) { px.blend(g, .7, 'add', () => px.disc(g, X, Y, 5, '#ff7a1a')); px.disc(g, X, Y, 3, '#ffd84a'); px.dot(g, X, Y, '#ffffff'); return; }
      if (m.cheats.glowPuck || trail === 'glow') px.blend(g, .5, 'add', () => px.disc(g, X, Y, 4, '#4af0ff'));
      px.rect(g, X - 2, Y - 1, 4, 2, '#0a0a0e'); px.rect(g, X - 1, Y - 2, 2, 1, '#2a2a34'); px.dot(g, X - 1, Y - 1, '#5a5a6a');
    }, { emissive: !!fire || m.cheats.glowPuck });
  }
  function drawIce(r, m) {
    if (!m.ice || !m.ice.length) return;
    r.decal(g => {
      for (const p of m.ice) {
        const q = r.w(p.x, p.y, 0), rx = p.rx * (r.view.ax || 1), ry = p.ry * Math.abs(r.view.by || .8);
        if (p.hole > 0) { px.ell(g, q[0], q[1], rx * .78, ry * .78, '#0e1e30'); px.ell(g, q[0], q[1], rx * .62, ry * .62, '#06101c'); const k = game.real * 2; px.ell(g, q[0] + Math.sin(k) * 2, q[1], rx * .3 + Math.sin(k * 1.3) * 2, ry * .2, '#1a3a5a'); px.ell(g, q[0], q[1], rx, ry, '#c8dcf0'); px.ell(g, q[0], q[1], rx * .8, ry * .8, '#0e1e30'); }
        else { px.blend(g, .35 + (1 - p.hp / 100) * .3, 'normal', () => px.ell(g, q[0], q[1], rx, ry, p.hp < 100 ? '#7aa0c8' : '#a8c8e8')); if (p.hp < 100) for (let k2 = 0; k2 < 5; k2++) { const a = k2 * 1.25; px.line(g, q[0], q[1], q[0] + Math.cos(a) * rx * .9, q[1] + Math.sin(a) * ry * .9, '#ffffff'); } }
      }
    });
  }
  function drawEntity(r, e, view, o = {}) {
    const p = o.pos || e; if (e.offIce && !o.force) return;
    r.shadow(p.x, p.y, o.r || 7, .42);
    if (e.state === 'frozen') r.queue(p.x, p.y, 0, g => { const a = r.w(p.x, p.y, 0), b = r.w(p.x, p.y, 34); px.blend(g, .45, 'normal', () => px.rect(g, a[0] - 10, b[1], 20, a[1] - b[1], '#bfe8ff')); px.line(g, a[0] - 10, b[1], a[0] - 10, a[1], '#ffffff'); }, { bias: 2 });
    r.actor(p.x, p.y, (p.z || 0) - (e.state === 'buried' ? 14 : 0), (g, ox, oy) => e.rig.draw(g, ox, oy, view), { xray: !!o.xray, flash: e.flashT > 0 ? '#ffffff' : undefined, ghost: o.ghost });
  }
  function draw(r, m) {
    if (!m) return;
    const A = m.arena, view = E.charView(r.view);
    map.drawFloor(r); Rink.drawScuff(r); drawIce(r, m);
    Rink.drawBoards(r, A.id, m.teams[0].def.dark, game.real); Rink.drawNets(r, game.real);
    Crowd.draw(r, m); Crowd.benches(r, m); Dress.draw(r, m, A); Dress.lights(r, m, A);
    map.queueWalls(r);
    // the fight's dropped gear
    if (m.fight) for (const gr of m.fight.gear) r.queue(gr.x, gr.y, 0, g => { const q = r.w(gr.x, gr.y, 0); if (gr.kind === 'helmet') { px.ell(g, q[0], q[1] - 1, 4, 3, gr.color); px.dot(g, q[0] - 1, q[1] - 2, '#ffffff'); } else { px.rect(g, q[0] - 3, q[1] - 2, 6, 3, gr.color); px.rect(g, q[0] - 3, q[1] - 3, 2, 1, gr.color); } });
    // items and hazards on the ice
    for (const it of m.items) { const s = WSPR[it.kind]; if (!s) continue; if (!it.air) r.shadow(it.x, it.y, 4, .35); const blink = it.t < 3 && it.kind !== 'octopus' && it.kind !== 'hat' && Math.floor(game.real * 8) % 2; if (!blink) r.sprite(it.x, it.y, it.z, it.kind === 'hat' && it.color ? E.recolor(s, { '#c83a2a': it.color }) : s, { anchor: 'bottom', glow: it.kind !== 'octopus' && it.kind !== 'hat' && it.kind !== 'rat' }); }
    // bodies
    m.skaters.forEach((s, i) => drawEntity(r, s, view, { pos: Replay.posOf('s', i) || s, xray: s.ctrl.kind !== 'cpu' }));
    m.goalies.forEach((g, i) => drawEntity(r, g, view, { pos: Replay.posOf('g', i) || g, r: 9 }));
    for (const e of m.extras) if (e.rig) drawEntity(r, e, view, { r: e.kind === 'pete' ? 10 : 6 });
    drawPuck(r, m);
    Hud.world(r, m);
    if (Dev.open && Dev.overlays) Dev.drawOverlays(r, m);
  }
  return { prepare, draw, drawPuck, get map() { return map; } };
})();

scenes.match = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown', 'brawler'], input: HOCKEY_KEYS, touch: [], camera: { zoom: false },
  enter(d) {
    d = d || {};
    if (!d.resume) {
      const cfg = d.cfg || Setup.quickCfg(d);
      Replay.reset(); Bus.reset();
      const m = Match.create(cfg);
      m.intro = cfg.intros && cfg.mode !== 'attract' ? { order: m.skaters.concat(m.goalies), i: 0, t: 0, focus: null, skip: false } : null;
      m.setPhase('intro', m.intro ? 99 : .2);
      if (cfg.onStart) cfg.onStart(m);
    }
    const m = Match.m;
    World.prepare(m); L.enabled = true; L.ambient = m.arena.ambient; game.weather = m.arena.weather || null;
    game.timeScale = T.gameSpeed;
    Cam.snap(Rink.C.x, Rink.C.y); Synth.music(m.arena.music === 'play' ? 'play' : m.arena.music);
    if (m.arena.music !== 'play') Synth.music(m.arena.music);
    Talk.init();
    if (d.resume) { Match.nextPeriod(m); }
    game.input.consumeAll();
  },
  exit() { game.timeScale = 1; game.weather = null; Synth.crowdOff(); },
  update(dt) {
    const m = Match.m; if (!m) return;
    if (Dev.isOpen()) { Dev.update(dt); if (!Dev.live) return; }
    else if (game.paused) return;
    if (m.phase === 'intro' && m.intro) introStep(m, dt);
    Match.step(dt);
    if (m.phase === 'intermission') { m.setPhase('intermission_wait'); scenes.match.toIntermission(m); return; }
    if (m.phase === 'final' && m.phaseT <= 0 && !m.left) { m.left = true; if (m.cfg.onFinal) m.cfg.onFinal(m); else game.go('results', { m }, { fade: 'wipe' }); return; }
    if (m.phase === 'drill_done' && m.phaseT <= 0 && !m.left) { m.left = true; if (m.cfg.onFinal) m.cfg.onFinal(m); return; }
    Cam.update(m, dt); Talk.step(dt); Crowd.step(dt, m); Fx.frame(m, dt);
    if (m.cfg.tick) m.cfg.tick(m, dt);
    // the music's layers follow the game
    const late = m.period >= 3 || m.ot; Synth.layer('drive', late || m.phase === 'shootout' ? 1 : 0, 2); Synth.layer('beat', late || Crowd.level > .7 ? 1 : 0, 2);
  },
  toIntermission(m) {
    if (m.cfg.mode === 'session' || m.cfg.mode === 'attract' || m.cfg.flood === 'never' && !m.cfg.forceFlood) { Match.nextPeriod(m); return; }
    game.go('flood', { from: 'match', ask: m.cfg.flood === 'ask', auto: false, m }, { fade: 'wipe' });
  },
  draw(r) {
    const m = Match.m; if (!m) return;
    World.draw(r, m); Hud.draw(r, m); Talk.draw(r);
    if (m.cfg.drawExtra) m.cfg.drawExtra(r, m);
    if (Dev.isOpen()) Dev.draw(r);
  },
  back() { return false; }
};
/** player intros: each skater and goalie, the camera on them, their name babbled ("Number NINE… DUNNY… MACPHAIL!") */
function introStep(m, dt) {
  const I = m.intro; I.t += dt;
  if (m.humans.some(h => h.kind === 'local' && h.input && (h.input.pressed('pass') || h.input.pressed('confirm'))) || UI.anyP('confirm')) { I.skip = true; Talk.close(); return; }
  if (!I.focus || I.t > 1.15) {
    if (I.i >= I.order.length) { I.skip = true; return; }
    const e = I.order[I.i++]; I.focus = e; I.t = 0;
    if (e.def) { const parts = String(e.def.full || e.def.name).split(' '); Synth.say('Number ' + e.def.num + '... ' + parts[0] + '... ' + parts[parts.length - 1] + '!', CAST.chuck.voice, { vol: .8 }); }
    if (e.rig && e.rig.hk) { if (e.state !== undefined && e.def.pos !== 'G') { Skater.setState(e, 'celebrate', 1.1); e.celeb = 'raise'; } }
  }
  // line them up on their blue lines for the intros
  if (I.i === 1 && I.t < dt * 2) for (const s of m.skaters) { const dir = m.attackDir(s.team); s.x = Rink.C.x - dir * 108 + (s.slot - 1) * 4 * dir; s.y = Rink.C.y - 60 + s.slot * 60; s.facing = dir > 0 ? PI / 2 : PI / 2; s.vx = s.vy = 0; }
  if (I.focus && I.focus.x !== undefined) Crowd.excite(.01);
}

/* ---- 51-scene-lab.js ---- */
/* ---- THE ANIMATION LAB (section 9): a skater, a goalie and the referee on the Icebox ice; every hockey motion in a
 * list, its speed and phase on sliders, Broadcast / ice level / Overhead. Up / down choose, left / right speed, ✕
 * play / hold, V the view, ○ back. Tools film it (#lab) ---- */
const Lab = (() => {
  const MOTIONS = ['stride', 'turbo stride', 'glide', 'crossover', 'hockey stop', 'backward c-cuts', 'stick-handling', 'pass', 'saucer', 'wrist shot', 'slapshot', 'one-timer', 'deke spin-o-rama', 'toe drag', 'check', 'stagger', 'big hit fall', 'getup', 'poke', 'slip',
    'goalie ready', 'goalie shuffle', 'goalie butterfly', 'goalie glove', 'goalie blocker', 'goalie stack', 'goalie poke', 'goalie blasted', 'goalie celebrate', 'faceoff', 'celebrate: fist pump', 'celebrate: sniper', 'celebrate: stick guitar', 'celebrate: raise',
    'fight: guard', 'fight: jab', 'fight: haymaker', 'fight: hook', 'fight: duck', 'fight: jersey over head', 'fight: knockdown', 'fight: winner', 'bench: sit', 'coach: wave', 'coach: hips', 'flood wagon driver', 'polar pete dance', 'referee: puck up'];
  const st = { i: 0, speed: 1, u: 0, play: true, sk: null, gl: null, ref: null, pete: null, coach: null };
  function ensure() {
    if (st.sk) return;
    st.sk = Rigs.skater(TEAMS.muskrats.players[0], true); st.gl = Rigs.goalie(TEAMS.muskrats.goalie, true); st.ref = Rigs.referee(); st.pete = Rigs.cast('pete'); st.coach = Rigs.cast('marge');
  }
  function pose(dt) {
    ensure(); const name = MOTIONS[st.i], u = st.u, sk = st.sk, hk = sk.hk, g = st.gl, gh = g.hk;
    hk.mode = 'skate'; hk.push = 0; hk.stop = 0; hk.back = 0; hk.cross = 0; hk.faceoff = false; hk.lean = .32; hk.crouch = .45; hk.stick = { act: 'idle', u: 0 }; hk.ph = u * TAU * 2; hk.weave = u * 30;
    sk.hkGear.stick = true; sk.hkGear.helmet = sk.hkGear.helmet || TEAMS.muskrats.dark;
    let a = { x: 120, y: 120, z: 0, vx: 0, vy: 0, facing: 0 }, fA = null;
    const fm = (mv, k) => E.move(mv, clamp(k, 0, 1));
    switch (name) {
      case 'stride': hk.push = .9; break; case 'turbo stride': hk.push = 1; hk.lean = .5; break; case 'glide': hk.push = 0; break;
      case 'crossover': hk.push = 1; hk.cross = 1; break; case 'hockey stop': hk.stop = 1; hk.crouch = .7; break; case 'backward c-cuts': hk.back = 1; hk.push = .6; break;
      case 'stick-handling': hk.stick = { act: 'carry' }; break; case 'pass': hk.stick = { act: 'pass', u }; break; case 'saucer': hk.stick = { act: 'pass', u, saucer: true }; break;
      case 'wrist shot': hk.stick = u < .4 ? { act: 'wrist', u: u / .4 } : { act: 'follow', u: (u - .4) / .6 }; break;
      case 'slapshot': hk.stick = u < .5 ? { act: 'wind', u: u / .5 } : u < .65 ? { act: 'slap', u: (u - .5) / .15 } : { act: 'follow', u: (u - .65) / .35, big: true }; break;
      case 'one-timer': hk.stick = u < .3 ? { act: 'wind', u: .6 } : u < .45 ? { act: 'slap', u: (u - .3) / .15 } : { act: 'follow', u: (u - .45) / .55, big: true }; break;
      case 'deke spin-o-rama': hk.stick = { act: 'deke', u }; a.facing = u * TAU; break; case 'toe drag': hk.stick = { act: 'drag', u }; break;
      case 'check': hk.stick = { act: 'check' }; hk.lean = .6; break; case 'stagger': a.hurt = true; break; case 'big hit fall': a.down = Math.min(1, u * 2); break; case 'getup': a.pose = 'kneel'; a.down = Math.max(0, 1 - u * 2); break;
      case 'poke': hk.stick = { act: 'poke', u }; break; case 'slip': a.down = .8; a.flip = .3; break;
      case 'faceoff': hk.faceoff = true; hk.crouch = .8; hk.stick = { act: 'faceoff' }; break;
      case 'celebrate: fist pump': a.pose = 'cheer'; a.expr = 'shout'; hk.stick = { act: 'raise' }; break; case 'celebrate: sniper': hk.stick = { act: 'sniper' }; break; case 'celebrate: stick guitar': hk.stick = { act: 'guitar' }; break; case 'celebrate: raise': hk.stick = { act: 'raise' }; break;
      case 'fight: guard': hk.mode = 'fight'; a.stance = 'guard'; hk.grip = true; break; case 'fight: jab': hk.mode = 'fight'; a.stance = 'guard'; fA = fm('jab', u); break; case 'fight: haymaker': hk.mode = 'fight'; a.stance = 'guard'; fA = fm('haymaker', u); break;
      case 'fight: hook': hk.mode = 'fight'; a.stance = 'guard'; fA = fm('hook', u); break; case 'fight: duck': hk.mode = 'fight'; a.pose = 'crouch'; break; case 'fight: jersey over head': hk.mode = 'fight'; a.stance = 'guard'; sk.o.hood = true; sk.C.hair = sk.C.cloth; break;
      case 'fight: knockdown': hk.mode = 'fight'; a.down = Math.min(1, u * 2); break; case 'fight: winner': hk.mode = 'fight'; a.pose = 'cheer'; break; case 'bench: sit': hk.mode = 'sit'; a.pose = 'kneel'; break;
    }
    if (name !== 'fight: jersey over head') { sk.o.hood = false; sk.C.hair = TEAMS.muskrats.players[0].hair.color; }
    if (hk.mode === 'fight') sk.hkGear.stick = false;
    a.attack = fA; sk.update(dt, a);
    const gst = { 'goalie ready': 'ready', 'goalie shuffle': 'shuffle', 'goalie butterfly': 'butterfly', 'goalie glove': 'glove', 'goalie blocker': 'blocker', 'goalie stack': 'stack', 'goalie poke': 'poke', 'goalie blasted': 'blasted', 'goalie celebrate': 'celebrate' }[name] || 'ready';
    gh.gst = gst === 'glove' || gst === 'blocker' || gst === 'celebrate' ? 'ready' : gst === 'poke' ? 'butterfly' : gst; gh.gw = 1; gh.ph = u * TAU * 3; gh.side = 1; gh.stick = { act: gst === 'poke' ? 'gpoke' : 'gready', u };
    gh.glove = gst === 'glove' ? [3, -10, 1.4] : [4.4, -4.6, -1];
    g.update(dt, { x: 200, y: 120, z: 0, vx: 0, vy: 0, facing: PI, down: gst === 'blasted' ? Math.min(1, u * 2) : 0, flip: gst === 'blasted' ? u : 0, pose: gst === 'celebrate' ? 'cheer' : null });
    if (gst === 'blocker') { const J = g.J, o = g.o, hand = E.V3.add(J.shC, [3, 9, 1]); const [el, h2] = E.ik3(J.shR, hand, o.armUpper, o.armLower, [-1, .8, -.3]); J.elbowR = el; J.handR = h2; }
    const rh = st.ref.hk; rh.push = 0; st.ref.update(dt, { x: 160, y: 150, z: 0, vx: 0, vy: 0, facing: -PI / 2 });
    if (name === 'referee: puck up') { const J = st.ref.J, o = st.ref.o, hand = E.V3.add(J.shC, [1.5, 1.5, o.armUpper + o.armLower - 1.5]); const [el, h2] = E.ik3(J.shR, hand, o.armUpper, o.armLower, [-1, .7, -.2]); J.elbowR = el; J.handR = h2; }
    const ph = st.pete.hk; ph.push = name === 'polar pete dance' ? .5 : 0; ph.ph = u * TAU * 2;
    st.pete.update(dt, { x: 240, y: 150, z: 0, vx: 0, vy: 0, facing: -PI / 2 + (name === 'polar pete dance' ? Math.sin(u * TAU * 2) * .8 : 0), pose: name === 'polar pete dance' ? (Math.floor(u * 4) % 2 ? 'cheer' : 'wave') : null });
    st.coach.update(dt, { x: 80, y: 150, z: 0, vx: 0, vy: 0, facing: -PI / 2, pose: name === 'coach: wave' ? 'wave' : name === 'coach: hips' ? 'hips' : null });
  }
  return { MOTIONS, st, pose, ensure };
})();
scenes.lab = {
  view: 'brawler', views: ['brawler', 'threequarter', 'topdown'], camera: { zoom: false },
  enter() { Lab.ensure(); this.map = Rink.build('icebox', 'muskrats'); game.cam.bounds = null; game.setView('brawler'); game.setZoom(1.3); L.enabled = true; L.ambient = .65; Synth.music(null); },
  exit() { game.setZoom(1); },
  update(dt) {
    const st = Lab.st, I = game.input;
    if (I.repeat('up', .3, .08)) st.i = (st.i + Lab.MOTIONS.length - 1) % Lab.MOTIONS.length; if (I.repeat('down', .3, .08)) st.i = (st.i + 1) % Lab.MOTIONS.length;
    if (I.repeat('left', .3, .1)) st.speed = Math.max(0, +(st.speed - .1).toFixed(2)); if (I.repeat('right', .3, .1)) st.speed = Math.min(2, +(st.speed + .1).toFixed(2));
    if (I.pressed('confirm')) st.play = !st.play; if (I.pressed('camera')) { const v = ['brawler', 'threequarter', 'topdown'], k = (v.indexOf(game.view.id) + 1) % 3; game.setView(v[k]); }
    if (!st.play && I.repeat('shoot', .2, .05)) st.u = (st.u + .02) % 1;
    if (I.pressed('cancel')) { game.go('title', { menu: true }); return; }
    if (st.play) st.u = (st.u + dt * .6 * st.speed) % 1;
    Lab.pose(dt * st.speed);
    game.focus(160, 130, 14);
  },
  draw(r) {
    const st = Lab.st, view = E.charView(r.view);
    r.sky(['#0a1430', '#122248', '#1a3060']);
    this.map.drawFloor(r);
    for (const [rig, x, y] of [[st.sk, 120, 120], [st.gl, 200, 120], [st.ref, 160, 150], [st.pete, 240, 150], [st.coach, 80, 150]]) { r.shadow(x, y, 7, .4); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy, view)); }
    L.add(160, 130, 80, 300, .8, { color: '#ffffff' });
    r.overlay(g => {
      UI.panel(g, 6, 6, 150, r.H - 12, { alpha: .9 });
      E.font.text(g, 'ANIMATION LAB', 12, 10, UI.GOLD, { outline: '#000' });
      const vis = Math.floor((r.H - 60) / 9), s0 = clamp(st.i - Math.floor(vis / 2), 0, Math.max(0, Lab.MOTIONS.length - vis));
      for (let k = s0; k < Math.min(Lab.MOTIONS.length, s0 + vis); k++) E.font.text(g, (k === st.i ? '▸ ' : '  ') + Lab.MOTIONS[k], 12, 22 + (k - s0) * 9, k === st.i ? '#ffffff' : UI.MUTED, { outline: false });
      E.font.text(g, 'SPEED ' + st.speed.toFixed(1) + 'x   PHASE ' + st.u.toFixed(2) + (st.play ? '' : ' (HELD)'), 12, r.H - 30, '#cfe0f4', { font: 'tiny', outline: false });
      E.font.text(g, 'VIEW ' + game.view.id.toUpperCase(), 12, r.H - 22, '#cfe0f4', { font: 'tiny', outline: false });
      Glyphs.text(g, '{up} MOTION  {left} SPEED  {confirm} PLAY/HOLD  {shoot} STEP  {camera} VIEW  {cancel} BACK', r.W / 2 + 70, r.H - 12, { align: 'center', color: UI.MUTED });
    });
  }
};

/* ---- 70-dev.js ---- */
/* ---- DEV MODE (15.3): from the pause menu's Dev Mode (or #dev). Four tabs: TUNING (every T value a live slider, its
 * default shown, RESET ALL TO DEFAULTS first, Log tuning), CHEATS, WARP, DEBUG (overlays, FPS, slow motion, frame step,
 * free camera, hide HUD, the seed, the sound test, the animation lab). L1 / R1 / Tab / a click switch tabs; up / down
 * move; left / right adjust (hold to accelerate; L2 / R2 ten steps); △ or R resets a row; ○ / Esc closes. The mouse
 * hovers rows, drags sliders, clicks toggles. While open the match holds (devPause) unless LIVE docks the panel ---- */
const Dev = (() => {
  let open = false, tab = 0, row = 0, scroll = 0, live = false, held = 0, step1 = false, rects = [], drag = null, soundI = 0;
  const TABS = ['TUNING', 'CHEATS', 'WARP', 'DEBUG'];
  const D = { overlays: false, hideHud: false, slow: 1, frameStep: false };
  const CHEATS = [['turbo', 'Infinite turbo'], ['god', 'God mode (no knockdowns)'], ['alwaysKaboom', 'Always KABOOM'], ['magnet', 'Puck magnet'], ['freezeAI', 'Freeze AI'], ['noGoalies', 'CPU goalies off'], ['bigHeads', 'Big heads'], ['octoRain', 'Octopus rain'], ['glowPuck', 'Glow puck'], ['retro', 'Retro rigs'], ['boomFull', 'Instant BOOM full (action)']];
  const WARPS = [['ch1', 'Start chapter 1'], ['ch2', 'Start chapter 2'], ['ch3', 'Start chapter 3'], ['ch4', 'Start chapter 4'], ['ch5', 'Start chapter 5'], ['cut', 'Play a cutscene (ch1-pre)'], ['p2', 'Jump to period 2'], ['p3', 'Jump to period 3'], ['ot', 'Jump to overtime'], ['shootout', 'Go to the shootout'], ['clock10', 'Clock to 0:10'],
    ['homeGoal', 'Home +1'], ['awayGoal', 'Away +1'], ['win', 'Win this game now'], ['lose', 'Lose this game now'], ['item', 'Spawn each item at center'], ['octopus', 'Spawn an octopus'], ['rat', 'Spawn a rubber rat'], ['fight', 'Start a fight'], ['kaboom', 'Start KABOOM'], ['breakIce', 'Break the thin ice'], ['shatter', 'Shatter a panel'], ['flood', 'Trigger the Flood Wagon'], ['results', 'Go to results'], ['attract', 'Go to the attract mode'], ['about', 'Go to About'], ['lab', 'Go to the animation lab']];
  const DEBUGS = () => [['overlays', 'Debug overlays (bodies, blades, AI, puck path, save shapes, grudges, skeletons)', D.overlays], ['fps', 'Show frame rate', !!S('showFps')], ['slow', 'Slow motion: ' + D.slow + 'x', null], ['frameStep', 'Frame step (paused: ✕ advances one step)', D.frameStep], ['freeCam', 'Free camera (stick pans, R2 / Q zoom)', Cam.free], ['hideHud', 'Hide the HUD (screenshots)', D.hideHud], ['seed', 'RNG seed: ' + RNG.seedN, null], ['live', 'LIVE: dock the panel, the game runs behind', live], ['log', 'Log tuning (JSON of non-default values to the console)', null], ['sound', 'Sound test: ' + soundList()[soundI][0] + '  (◂ ▸ choose, ✕ play)', null]];
  function soundList() { const out = []; for (const k in Synth.FX) out.push(['sfx ' + k, () => Synth.sfx(k)]); for (const k in Synth.SONGS) out.push(['song ' + k, () => Synth.music(k, { restart: true })]); for (const k in Synth.STINGS) out.push(['organ ' + k, () => Synth.organ(k)]); for (const k of ['drive', 'beat', 'kaboom', 'toms', 'fight']) out.push(['layer ' + k, () => { Synth.music('play'); Synth.layer(k, 1, .2); }]); out.push(['goal horn', () => Synth.horn()]); for (const k of ['cheer', 'roar', 'ohh', 'ahh', 'boo', 'gasp']) out.push(['crowd ' + k, () => Synth.swell(k)]); out.push(['crowd chant', () => Synth.chant()]); for (const id in CAST) if (CAST[id].voice) out.push(['voice ' + CAST[id].name, () => Synth.say(id === 'marge' ? 'Sit down, shut up, and listen.' : 'Number nine, Dunny MacPhail!', CAST[id].voice)]); return out; }
  const rows = () => tab === 0 ? [{ k: 'resetAll', label: 'RESET ALL TO DEFAULTS' }].concat(T.meta.map(m => ({ k: m.key, m }))) : tab === 1 ? CHEATS.map(([k, l]) => ({ k, label: l })) : tab === 2 ? WARPS.map(([k, l]) => ({ k, label: l })) : DEBUGS().map(([k, l, v]) => ({ k, label: l, v }));
  function openPanel() {
    if (HUB) return;
    if (!Match.m || game.sceneName !== 'match' && game.sceneName !== 'practice') { game.resume && game.resume(); game.go('match', { cfg: Setup.quickCfg({ dev: true }) }); return; }
    if (game.shell && game.shell.hide) try { game.shell.hide(); } catch (e) { /* closed */ }
    game.resume && game.resume(); open = true; Match.m.devPause = !live; game.input.consumeAll(); Synth.sfx('menuSel');
  }
  function close() { open = false; if (Match.m) Match.m.devPause = false; game.timeScale = T.gameSpeed * D.slow; game.input.consumeAll(); Synth.sfx('menuBack'); }
  function cheat(name, on) {
    const m = Match.m; if (name === 'boomFull') { if (m) { Boom.start(m, Math.max(0, m.teams.findIndex(t => t.human))); } return true; }
    if (!m) return false; const v = on === undefined ? !m.cheats[name] : !!on; m.cheats[name] = v;
    if (name === 'bigHeads' || name === 'retro') for (const e of m.skaters.concat(m.goalies)) { if (name === 'bigHeads') e.rig.o.headR = (e.rig._baseHead || (e.rig._baseHead = e.rig.o.headR)) * (v ? 1.8 : 1); else e.rig.o.style = v ? 'classic' : 'hd'; }
    return v;
  }
  /** warps (tests use them through game.debug.warp) */
  function warp(k, o = {}) {
    const m = Match.m;
    if (/^ch[1-5]$/.test(k)) { close(); Story.chapter = +k[2]; game.go('match', { cfg: Story.matchCfg(+k[2]) }); return true; }
    if (k === 'cut') { close(); game.go('cutscene', { id: o.id || 'ch1-pre', then: 'title' }); return true; }
    if (k === 'attract' || k === 'about' || k === 'lab' || k === 'title') { close(); game.go(k); return true; }
    if (!m) return false;
    const human = Math.max(0, m.teams.findIndex(t => t.human));
    if (k === 'p2' || k === 'p3') { const n = +k[1]; while (m.period < n - 1) m.period++; m.clock = 0; m.setPhase('periodEnd', .1); return true; }
    if (k === 'ot') { m.period = m.cfg.periods; m.teams[0].score = m.teams[1].score; m.clock = 0; m.setPhase('periodEnd', .1); return true; }
    if (k === 'shootout') { m.teams[0].score = m.teams[1].score; Match.soStart(m); return true; }
    if (k === 'clock10') { m.clock = Math.min(m.clock, 10); return true; }
    if (k === 'homeGoal' || k === 'awayGoal') { m.teams[k === 'homeGoal' ? 0 : 1].score++; return true; }
    if (k === 'win' || k === 'lose') { const w = k === 'win' ? human : 1 - human; m.teams[w].score = m.teams[1 - w].score + 1; Match.endGame(m, w); return true; }
    if (k === 'item') { let i = 0; for (const kind in ITEM_DEFS) { const it = Items.make(kind, Rink.C.x + (i - 3) * 22, Rink.C.y - 30); m.items.push(it); i++; } return true; }
    if (k === 'octopus' || k === 'rat') { const it = Items.make(k, Rink.C.x + 30, Rink.C.y); m.items.push(it); if (k === 'rat') it.t = 10; else it.t = 999; return true; }
    if (k === 'fight') { if (m.phase !== 'play') m.setPhase('play'); const a = m.teams[human].skaters.find(s => s.ctrl.kind !== 'cpu') || m.teams[human].skaters[0], b = m.teams[1 - human].skaters[0]; b.x = a.x + 16; b.y = a.y; Fight.start(m, a, b); return true; }
    if (k === 'kaboom') { if (m.phase !== 'play' && m.phase !== 'faceoff') m.setPhase('play'); Boom.start(m, human); return true; }
    if (k === 'breakIce') { if (!m.ice.length) Items.setupIce(Object.assign(m, { arena: Object.assign({}, m.arena, { hazards: m.arena.hazards.concat(['thinice']) }) })); const p = m.ice[0]; p.hp = 0; p.hole = 30; Bus.emit('thin_ice_break', { patch: p.i, x: p.x, y: p.y, by: -1, victim: -1, victimTeam: 1 }); return true; }
    if (k === 'shatter') { const p = Rink.panels.find(q => q.side === 'n' && q.state !== 'shattered'); Hits.glass(m, p, 999, m.teams[human].skaters[0]); return true; }
    if (k === 'flood') { close(); game.go('flood', { m, ask: false, auto: false, from: 'match' }); return true; }
    if (k === 'results') { close(); Match.endGame(m, m.teams[0].score >= m.teams[1].score ? 0 : 1); game.go('results', { m }); return true; }
    return false;
  }
  function activate(rw, d) {
    if (tab === 0) { if (rw.k === 'resetAll') { T.resetAll(); Synth.sfx('menuSel'); return; } return; }
    if (tab === 1) { const v = cheat(rw.k); game.note((CHEATS.find(c => c[0] === rw.k) || [])[1] + (rw.k === 'boomFull' ? '' : v ? ' ON' : ' OFF')); return; }
    if (tab === 2) { warp(rw.k); return; }
    const k = rw.k;
    if (k === 'overlays') D.overlays = !D.overlays; else if (k === 'fps') game.settings.set('showFps', !S('showFps'));
    else if (k === 'slow') { D.slow = D.slow === 1 ? .5 : D.slow === .5 ? .25 : 1; game.timeScale = T.gameSpeed * D.slow; }
    else if (k === 'frameStep') D.frameStep = !D.frameStep; else if (k === 'freeCam') Cam.toggleFree(); else if (k === 'hideHud') D.hideHud = !D.hideHud;
    else if (k === 'seed') { RNG.seed((RNG.seedN * 1103515245 + 12345) >>> 0); }
    else if (k === 'live') { live = !live; if (Match.m) Match.m.devPause = !live; }
    else if (k === 'log') { const j = JSON.stringify(T.changed(), null, 1); console.log('Ice Hoc-Kaboom tuning:', j); game.note('TUNING LOGGED TO THE CONSOLE'); }
    else if (k === 'sound') { const L2 = soundList(); if (d) soundI = (soundI + d + L2.length) % L2.length; else L2[soundI][1](); }
  }
  function adjust(rw, d, big) {
    if (tab === 0 && rw.m) { const m2 = rw.m, n = big ? 10 : 1; T.set(m2.key, +(T[m2.key] + d * m2.step * n).toFixed(4)); if (m2.key === 'gameSpeed') game.timeScale = T.gameSpeed * D.slow; return; }
    if (tab === 3 && rw.k === 'sound') activate(rw, d);
    else if (tab === 3 && rw.k === 'slow') activate(rw);
  }
  function update(dt) {
    const I = game.input, R = rows();
    if (I.pressed('cancel') || I.pressed('pause')) { close(); return; }
    if (padPressed(4) || keyPressed('KeyC')) { tab = (tab + 3) % 4; row = 0; scroll = 0; Synth.sfx('menuMove'); }
    if (padPressed(5) || keyPressed('Tab')) { tab = (tab + 1) % 4; row = 0; scroll = 0; Synth.sfx('menuMove'); }
    if (I.repeat('up', .3, .06)) { row = (row + R.length - 1) % R.length; Synth.sfx('menuMove'); }
    if (I.repeat('down', .3, .06)) { row = (row + 1) % R.length; Synth.sfx('menuMove'); }
    const big = codeDown('ShiftLeft') || codeDown('ShiftRight') || padDown(6) || padDown(7);
    if (I.down('left') || I.down('right')) held += dt; else held = 0;
    const accel = held > 1.2 ? .02 : held > .5 ? .05 : .3;
    if (I.repeat('left', .3, accel)) adjust(R[row], -1, big); if (I.repeat('right', .3, accel)) adjust(R[row], 1, big);
    if (I.pressed('confirm') || I.pressed('pass')) { if (D.frameStep && !live && Match.m && tab !== 3) { Match.m.devPause = false; step1 = true; } else activate(R[row]); }
    if ((I.pressed('lob') || keyPressed('KeyR')) && tab === 0 && R[row].m) { T.reset(R[row].m.key); Synth.sfx('menuBack'); }
    // the mouse: hover focuses, a click on a tab, a row (toggles act), a drag on a slider
    const p = UI.pointer(), ck = I.clicked();
    if (p && UI.mouseMoved) { const h = rects.find(q => p[0] >= q.x && p[0] < q.x + q.w && p[1] >= q.y && p[1] < q.y + q.h && q.row !== undefined); if (h) row = h.row; }
    if (ck) { const h = rects.find(q => ck[0] >= q.x && ck[0] < q.x + q.w && ck[1] >= q.y && ck[1] < q.y + q.h); if (h) { if (h.tab !== undefined) { tab = h.tab; row = 0; scroll = 0; } else if (h.slider) { const m2 = R[h.row].m, f = clamp((ck[0] - h.sx) / h.sw, 0, 1); T.set(m2.key, m2.min + Math.round((m2.max - m2.min) * f / m2.step) * m2.step); } else if (h.row !== undefined) { row = h.row; activate(R[row]); } } }
    if (I.mouse && I.mouse.down && p) { const h = rects.find(q => q.slider && p[0] >= q.sx - 4 && p[0] < q.sx + q.sw + 4 && p[1] >= q.y && p[1] < q.y + q.h); if (h) { const m2 = R[h.row].m, f = clamp((p[0] - h.sx) / h.sw, 0, 1); T.set(m2.key, m2.min + Math.round((m2.max - m2.min) * f / m2.step) * m2.step); } }
    if (step1 && Match.m) { Match.step(1 / 120); Match.m.devPause = true; step1 = false; }
  }
  // raw codes: L1 / R1 and Tab switch tabs, L2 / R2 take ten steps (edges tracked here, from the input's held codes)
  const prevHeld = {};
  const codeDown = code => !!(game.input.held && game.input.held.has(code));
  const edge = code => { const on = codeDown(code), was = prevHeld[code]; prevHeld[code] = on; return on && !was; };
  const padPressed = n => edge('Pad' + n), padDown = n => codeDown('Pad' + n), keyPressed = code => edge(code);
  function draw(r) {
    r.overlay(g => {
      const R = rows(), W = live ? Math.round(r.W * .45) : Math.min(r.W - 20, 420), x0 = live ? r.W - W - 4 : Math.round(r.W / 2 - W / 2), y0 = 6, H = r.H - 12, rh = 12, vis = Math.floor((H - 46) / rh);
      rects = [];
      UI.panel(g, x0, y0, W, H, { alpha: .95, border: '#4af0f0', bg: ['#08141e', '#040a10'] });
      E.font.text(g, 'DEV MODE' + (tab === 0 && R[row] && R[row].m ? '  ·  ' + R[row].m.group.toUpperCase() : ''), x0 + 6, y0 + 4, '#4af0f0', { outline: '#000' }); E.font.text(g, (live ? 'LIVE' : 'PAUSED') + '  seed ' + RNG.seedN, x0 + W - 6, y0 + 4, live ? '#7ad87a' : '#ffb347', { align: 'right', font: 'tiny', outline: false });
      TABS.forEach((t2, i) => { const tw = (W - 12) / 4, x = x0 + 6 + i * tw; UI.panel(g, x, y0 + 14, tw - 3, 13, { focus: i === tab, alpha: .9 }); E.font.text(g, t2, x + tw / 2 - 1, y0 + 17, i === tab ? UI.GOLD : UI.MUTED, { align: 'center', outline: false }); rects.push({ x, y: y0 + 14, w: tw - 3, h: 13, tab: i }); });
      if (row < scroll) scroll = row; if (row >= scroll + vis) scroll = row - vis + 1;
      let lastGroup = null;
      for (let k = scroll; k < Math.min(R.length, scroll + vis); k++) {
        const rw = R[k], y = y0 + 32 + (k - scroll) * rh, f = k === row;
        if (f) px.rect(g, x0 + 4, y - 1, W - 8, rh, '#163040');
        rects.push({ x: x0 + 4, y: y - 1, w: W - 8, h: rh, row: k });
        if (rw.m) {
          const m2 = rw.m, v = T[m2.key], frac = (v - m2.min) / (m2.max - m2.min), sx = x0 + W - 150, sw = 60; void lastGroup;
          E.font.text(g, m2.label, x0 + 8, y + 1, f ? '#ffffff' : '#cfe0f4', { outline: false });
          px.rect(g, sx, y + 4, sw, 2, '#2a3a4a'); px.rect(g, sx, y + 4, Math.round(sw * clamp(frac, 0, 1)), 2, v !== m2.value ? '#ffb347' : '#4af0f0'); px.rect(g, sx + Math.round(sw * clamp(frac, 0, 1)) - 1, y + 2, 3, 6, '#ffffff');
          const vs = m2.key.startsWith('aiSkill') && v < 0 ? 'AUTO' : String(+v.toFixed(3)); E.font.text(g, vs, x0 + W - 52, y + 1, v !== m2.value ? '#ffb347' : '#ffffff', { align: 'right', outline: false }); E.font.text(g, '(' + (+m2.value.toFixed(3)) + ')', x0 + W - 8, y + 2, '#5a7a8a', { align: 'right', font: 'tiny', outline: false });
          rects.push({ x: sx - 4, y: y - 1, w: sw + 8, h: rh, row: k, slider: true, sx, sw });
        } else {
          const on = tab === 1 ? !!(Match.m && Match.m.cheats[rw.k]) : rw.v; E.font.text(g, rw.label, x0 + 8, y + 1, f ? (rw.k === 'resetAll' ? '#ff8a8a' : '#ffffff') : rw.k === 'resetAll' ? '#ff6a6a' : '#cfe0f4', { outline: false });
          if ((tab === 1 && rw.k !== 'boomFull') || (tab === 3 && rw.v !== null && rw.v !== undefined)) E.font.text(g, on ? 'ON' : 'OFF', x0 + W - 8, y + 1, on ? '#7ad87a' : '#5a6a7a', { align: 'right', outline: false });
        }
      }
      if (R.length > vis) E.font.text(g, (scroll + 1) + '-' + Math.min(R.length, scroll + vis) + ' of ' + R.length, x0 + W / 2, y0 + H - 22, '#5a7a8a', { align: 'center', font: 'tiny', outline: false });
      Glyphs.text(g, '{chirp}/TAB TABS  {left} ADJUST  {lob} RESET ROW  {confirm} DO  {cancel} CLOSE', x0 + W / 2, y0 + H - 12, { align: 'center', color: '#9fb2cc' });
    });
  }
  /** the debug overlays: bodies and radii, blade points, AI roles and targets, the puck's path, save shapes, grudges, skeletons */
  function drawOverlays(r, m) {
    for (const s of m.skaters) {
      if (s.offIce) continue;
      r.decal(() => { r.groundRing(s.x, s.y, 7, '#4af0f0', 1); const [bx, by] = Skater.blade(s); r.groundRing(bx, by, T.pickupRadius, '#ffd36a', .6); if (s.ai && s.ai.tx !== undefined && s.ctrl.kind === 'cpu') r.groundRing(s.ai.tx, s.ai.ty, 3, '#ff4ab8', 1); });
      r.queue(s.x, s.y, 50, g => { const q = r.w(s.x, s.y, 50); E.font.text(g, (s.ai.role || '') + (Object.values(s.grudge).some(v => v > 0) ? ' G' + Math.round(Math.max(...Object.values(s.grudge))) : ''), q[0], q[1], '#ff4ab8', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true });
      s.rig.debug && s.rig.debug(r);
    }
    for (const gl of m.goalies) { const sc = Goalie.scale(m, gl); r.queue(gl.x, gl.y, 0, g => { const a = r.w(gl.x, gl.y - 8 * sc, 0), b = r.w(gl.x, gl.y + 8 * sc, 22 * sc); px.blend(g, .3, 'normal', () => px.rect(g, Math.min(a[0], b[0]), b[1], Math.abs(b[0] - a[0]) + 1, a[1] - b[1], '#ff4a4a')); }, { emissive: true }); }
    const pk = m.puck; if (!pk.owner) r.decal(() => { let x = pk.x, y = pk.y, vx = pk.vx, vy = pk.vy; for (let k = 0; k < 20; k++) { x += vx * .05; y += vy * .05; const sp = Math.hypot(vx, vy); if (sp < 5) break; const ns = Math.max(0, sp - (T.puckFriction + T.puckDrag * sp) * .05); vx *= ns / sp; vy *= ns / sp; r.groundDisc(x, y, 1.2, '#ffffff', .8); } });
  }
  return { open: openPanel, close, isOpen: () => open, update, draw, warp, cheat, drawOverlays, CHEATS, WARPS, D, get live() { return live; }, set live(v) { live = !!v; }, get hideHud() { return D.hideHud; }, get overlays() { return D.overlays; }, get tab() { return tab; }, set tab(v) { tab = v; }, get row() { return row; }, set row(v) { row = v; } };
})();

/* ---- 80-net.js ---- */
/* ---- NET (section 14): AI Hub sessions, shared-world. The host runs Match.step with the CPU and every remote player's
 * intent; it sends a snapshot 15 times a second (unreliable, integers, under 1,200 bytes) with the recent events, and
 * calls AIHub.finish once. Clients send their intent 15 times a second (press counters, so a lost packet loses no tap),
 * draw the others about 120 ms behind the newest snapshot, predict their own skater with the pure skateStep, and play
 * the effects, sounds and commentary of the events they receive. Only the hub carries traffic ---- */
const Net = (() => {
  const st = { active: false, info: null, role: 'off', me: -1, players: [], seat: {}, ended: false, endReason: null, started: false, card: null, finished: false, ready: false,
    snaps: [], lastAt: -Infinity, seq: 0, pend: [], counters: { pass: 0, shoot: 0, deke: 0, lob: 0, chirp: 0, switch: 0 }, inputs: {}, applied: {}, acks: {}, seen: new Set(), evq: [], sentT: 0, tick: 0, pred: null, overlay: false, leftIds: new Set(), startedWith: 0, msgs: 0, msgT: 0 };
  const PH = ['intro', 'faceoff', 'play', 'stoppage', 'goal', 'replay', 'periodEnd', 'intermission', 'fight', 'final', 'shootout', 'so_card', 'so_result', 'intermission_wait'];
  const SST = ['skate', 'stop', 'wind', 'shoot', 'pass', 'check', 'deke', 'poke', 'stun', 'down', 'getup', 'celebrate', 'faceoff', 'fight', 'bin', 'frozen', 'buried', 'slip', 'offbal', 'blasted'];
  const GST = ['ready', 'shuffle', 'butterfly', 'glove', 'blocker', 'stack', 'poke', 'cover', 'blasted', 'celebrate', 'down', 'manual'];
  const BTN = ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch'];
  const EVS = ['goal', 'save', 'post', 'hit', 'glass', 'fight_start', 'fight_end', 'fight_hit', 'kaboom_start', 'kaboom_end', 'shot', 'pass', 'stop', 'item', 'hazard', 'period_end', 'final', 'faceoff_drop', 'stoppage', 'chirp', 'blast', 'knockdown', 'deke', 'item_throw', 'sin_bin', 'sin_bin_end', 'onetimer', 'turtle', 'gloves', 'mascot_down', 'thin_ice_break', 'plunge', 'rattle', 'puck_boards', 'puck_glass', 'pass_complete', 'possession', 'ot_start', 'hat_trick', 'windup'];
  const STR = ['', 'wrist', 'slap', 'onetimer', 'kaboom', 'deke', 'rebound', 'deflect', 'own', 'scramble', 'glove', 'blocker', 'pad', 'body', 'bump', 'check', 'big', 'cracked', 'shattered', 'pickup', 'catch', 'battle', 'center', 'freeze', 'out', 'fight', 'hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox', 'cocoa', 'octopus', 'rat', 'saucer', 'blast', 'blast-held'];
  const NUMS = ['team', 'by', 'victim', 'goalie', 'winner', 'loser', 'a', 'b', 'power', 'speed', 'net', 'panel', 'line', 'from', 'to', 'who', 'n', 'target'];
  const STRS = ['kind', 'state', 'why', 'how', 'dot'];
  const BOOLS = ['big', 'freeze', 'ppg', 'onGoal', 'bar', 'draw', 'ot', 'spin', 'gilded'];
  const enc = e => { const o = [e.id, EVS.indexOf(e.type), Math.round(e.x || 0), Math.round(e.y || 0)]; let mask = 0; NUMS.forEach((k, i) => { if (typeof e[k] === 'number') { mask |= 1 << i; o.push(Math.round(e[k])); } }); o.splice(4, 0, mask); let sm = 0; const sv = []; STRS.forEach((k, i) => { if (typeof e[k] === 'string' && STR.indexOf(e[k]) >= 0) { sm |= 1 << i; sv.push(STR.indexOf(e[k])); } }); let bm = 0; BOOLS.forEach((k, i) => { if (e[k]) bm |= 1 << i; }); o.push(sm, ...sv, bm); if (e.assists) o.push(e.assists.length, ...e.assists); return o; };
  const dec = a => { const e = { id: a[0], type: EVS[a[1]], x: a[2], y: a[3] }; const mask = a[4]; let k = 5; NUMS.forEach((n, i) => { if (mask & (1 << i)) e[n] = a[k++]; }); const sm = a[k++]; STRS.forEach((n, i) => { if (sm & (1 << i)) e[n] = STR[a[k++]]; }); const bm = a[k++]; BOOLS.forEach((n, i) => { if (bm & (1 << i)) e[n] = true; }); if (k < a.length) { const nA = a[k++]; e.assists = a.slice(k, k + nA); } return e; };
  const q = v => Math.round(v);
  /** the host's snapshot of the match */
  function snapshot(m) {
    const ents = m.skaters.map(s => [s.id, q(s.x), q(s.y), q(s.vx), q(s.vy), Math.round(((s.facing % TAU) + TAU) % TAU / TAU * 255), SST.indexOf(s.state), q(s.stateT * 10), (m.puck.owner === s ? 1 : 0) | (s.turboOn ? 2 : 0) | (s.offIce ? 4 : 0) | (s.charging ? 8 : 0) | (s.state === 'bin' ? 16 : 0), q(s.turbo * 100), q(s.charge * 100)])
      .concat(m.goalies.map(g => [g.id, q(g.x), q(g.y), 0, q(g.vy), 0, GST.indexOf(g.state), q(g.stateT * 10), g.offIce ? 4 : 0, 0, 0]));
    const pk = m.puck, ev = st.evq.filter(e => m.t - e._t < 1.1).slice(-8).map(e => enc(e));
    const s = { t: 's', n: st.tick, at: Math.round(AIHub.time()), ph: PH.indexOf(m.phase), p: m.period, k: q(m.clock * 10), sc: [m.teams[0].score, m.teams[1].score], b: [q(m.boom[0]), q(m.boom[1]), q(m.kaboom[0] * 10), q(m.kaboom[1] * 10)],
      pk: [q(pk.x * 2), q(pk.y * 2), q(pk.z * 2), q(pk.vx), q(pk.vy), q(pk.vz), pk.owner ? pk.owner.id : -1, pk.onFire ? 1 : 0, pk.inNet], e: ents, hu: m.humans.map(h => [h.pid === undefined ? -1 : h.pid, h.skater.id]), ack: st.acks, ev,
      it: m.items.slice(0, 6).map(i => [STR.indexOf(i.kind), q(i.x), q(i.y), q(i.z)]), sh: [m.teams[0].shots, m.teams[1].shots], gl: Rink.panels.filter(p => p.state !== 'ok').map(p => p.i * 2 + (p.state === 'shattered' ? 1 : 0)), ice: (m.ice || []).map(p => p.hole > 0 ? 2 : p.hp < 100 ? 1 : 0) };
    if (m.fight) { const F = m.fight, a = m.byId(F.a), b = m.byId(F.b); s.f = [F.a, F.b, q(F.x), q(F.y), q(a.fight ? a.fight.bal : 0), q(b.fight ? b.fight.bal : 0), q(a.fight ? a.fight.sta : 0), q(b.fight ? b.fight.sta : 0), MOVE_I(a), MOVE_I(b), F.winner]; }
    if (m.so) s.so = [m.so.marks[0].map(Number), m.so.marks[1].map(Number)];
    return s;
  }
  const MOVES_L = [null, 'jab', 'hay', 'duck', 'yank'], MOVE_I = s => s.fight && s.fight.act ? MOVES_L.indexOf(s.fight.act) * 10 + (s.fight.ph === 'wind' ? 1 : s.fight.ph === 'active' ? 2 : 3) : 0;
  /** host: a client's intent as the skater's intent (counters become presses) */
  function intentFor(m, s) {
    const hu = s.ctrl.human, it = s.intent; if (!hu) return;
    const pk = st.inputs[hu.pid]; AI.clearPress(it);
    if (!pk || st.leftIds.has(hu.pid)) { it.mx = it.my = 0; it.held.shoot = it.held.lob = it.held.turbo = false; return; }
    it.mx = (pk.mx || 0) / 100; it.my = (pk.my || 0) / 100; it.face = null; it.back = false;
    it.held.shoot = !!(pk.h & 1); it.held.lob = !!(pk.h & 2); it.held.turbo = !!(pk.h & 4);
    it.aim = pk.ax !== undefined ? [pk.ax, pk.ay] : null;
    const was = st.applied[hu.pid] || (st.applied[hu.pid] = pk.c.slice());
    BTN.forEach((b, i) => { const d = ((pk.c[i] - was[i]) % 256 + 256) % 256; if (d > 0 && d < 128) { it.press[b] = true; was[i] = (was[i] + 1) % 256; } });
  }
  /** client: this copy's intent for the host, counting presses */
  function sendInput(dt) {
    const I = game.input, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    for (const b of BTN) if (I.pressed(b)) st.counters[b] = (st.counters[b] + 1) % 256;
    st.sentT += dt; if (st.sentT < 1 / 15) return; st.sentT = 0;
    const pkt = { t: 'in', s: ++st.seq, at: Math.round(AIHub.time()), mx: Math.round(d[0] * 100), my: Math.round(d[1] * 100), h: (I.down('shoot') ? 1 : 0) | (I.down('lob') ? 2 : 0) | (I.down('turbo') ? 4 : 0), c: BTN.map(b => st.counters[b]) };
    const w = I.lastDevice === 'mouse' ? Cam.mouseWorld() : null; if (w) { pkt.ax = Math.round(w[0]); pkt.ay = Math.round(w[1]); }
    st.pend.push({ s: pkt.s, mx: d[0], my: d[1], turbo: !!(pkt.h & 4) }); if (st.pend.length > 60) st.pend.shift();
    send(pkt, { to: st.info.host, reliable: false });
  }
  function send(data, o) { if (st.ended) return; try { AIHub.send(data, o); st.msgs++; } catch (e) { game.fail('net send', e); } }
  /** client: take a snapshot into the match (the others interpolated later, the own skater reconciled) */
  function onSnap(s) {
    if (s.at < st.lastAt) return; st.lastAt = s.at; st.snaps.push(s); if (st.snaps.length > 12) st.snaps.shift();
    const m = Match.m; if (!m) return;
    const ph = PH[s.ph] || 'play'; if (ph !== m.phase) { if (ph === 'replay' && !Replay.on) Replay.startGoal(m); if (ph !== 'replay' && Replay.on) Replay.stop(); m.phase = ph; }
    m.period = s.p; m.clock = s.k / 10; m.teams[0].score = s.sc[0]; m.teams[1].score = s.sc[1]; m.boom[0] = s.b[0]; m.boom[1] = s.b[1]; m.kaboom[0] = s.b[2] / 10; m.kaboom[1] = s.b[3] / 10; m.teams[0].shots = s.sh[0]; m.teams[1].shots = s.sh[1];
    // who holds whom
    for (const [pid, sid] of s.hu) { const hu = m.humans.find(h => h.pid === pid), sk = m.byId(sid); if (hu && sk && hu.skater !== sk) { const old = hu.skater; sk.ctrl = old.ctrl; old.ctrl = { kind: 'cpu' }; hu.skater = sk; } }
    for (const p of Rink.panels) p.state = 'ok'; for (const v of s.gl || []) { const p = Rink.panels[v >> 1]; if (p) p.state = v & 1 ? 'shattered' : 'cracked'; }
    (s.ice || []).forEach((v, i) => { const p = m.ice[i]; if (p) { p.hole = v === 2 ? 1 : 0; p.hp = v ? 50 : 100; } });
    m.items = (s.it || []).map(([k, x, y, z]) => ({ kind: STR[k], x, y, z, t: 10 }));
    if (s.so) m.so = m.so || { marks: [[], []], att: null }, m.so.marks = s.so.map(a => a.map(Boolean));
    if (s.f) { const [a, b, fx, fy, ba, bb, sa, sb, ma, mb, w] = s.f, A2 = m.byId(a), B = m.byId(b); m.fight = { a, b, x: fx, y: fy, gear: (m.fight && m.fight.gear) || [], winner: w }; for (const [S2, bal, sta, mv] of [[A2, ba, sa, ma], [B, bb, sb, mb]]) { S2.fight = S2.fight || { yanks: [] }; S2.fight.bal = bal; S2.fight.sta = sta; const act = MOVES_L[Math.floor(mv / 10)], ph2 = mv % 10; S2.fight.act = act; S2.fight.ph = ph2 === 1 ? 'wind' : ph2 === 2 ? 'active' : 'recover'; } } else if (m.fight) { for (const S2 of m.skaters) S2.fight = null; m.fight = null; }
    for (const a of s.ev || []) { if (st.seen.has(a[0])) continue; st.seen.add(a[0]); if (st.seen.size > 400) st.seen = new Set(Array.from(st.seen).slice(-200)); const e = dec(a); if (e.type) try { Bus.present(e); } catch (err) { game.fail('net event', err); } }
    // reconcile the own skater: the snapshot's state, then the intents the host hasn't seen yet
    const hu = m.humans.find(h => h.kind === 'local'); if (hu) { const row = s.e.find(r => r[0] === hu.skater.id), ack = s.ack ? s.ack[st.me] || 0 : 0; if (row) { const p = { x: row[1], y: row[2], vx: row[3], vy: row[4], facing: row[5] / 255 * TAU, stopT: 0, turbo: row[9] / 100, rest: 0 }; for (const it of st.pend) if (it.s > ack) for (let k = 0; k < 8; k++) Skater.skateStep(p, { mx: it.mx, my: it.my, turbo: it.turbo }, { vmax: Skater.vmax(hu.skater, m) }, 1 / 120); st.pend = st.pend.filter(it => it.s > ack); st.pred = p; } }
  }
  /** client: each frame, the others between the two snapshots around render time, the own skater predicted */
  function clientStep(m, dt) {
    const S2 = st.snaps; if (!S2.length) return;
    const rt = AIHub.time() - 120; let a = S2[0], b = S2[S2.length - 1];
    for (let i = 0; i < S2.length - 1; i++) if (S2[i].at <= rt && S2[i + 1].at >= rt) { a = S2[i]; b = S2[i + 1]; break; }
    const k = b.at > a.at ? clamp((rt - a.at) / (b.at - a.at), 0, 1.2) : 1, own = (m.humans.find(h => h.kind === 'local') || {}).skater;
    const lerpRow = (ra, rb) => ra && rb ? ra.map((v, i) => i === 5 ? v : lerp(v, rb[i], k)) : ra || rb;
    for (const ent of m.skaters.concat(m.goalies)) {
      const ra = a.e.find(r => r[0] === ent.id), rb = b.e.find(r => r[0] === ent.id), r = lerpRow(ra, rb); if (!r) continue;
      const isG = ent.id >= 100;
      if (ent === own && st.pred) { const p = st.pred; Skater.skateStep(p, (() => { const mv = game.input.move(), d = game.view.screenDirToGround(mv[0], mv[1]); return { mx: d[0], my: d[1], turbo: game.input.down('turbo') }; })(), { vmax: Skater.vmax(own, m) }, dt); Rink.clampBody(p, 7); const ex = p.x - own.x, ey = p.y - own.y; if (Math.hypot(ex, ey) > 48) { own.x = p.x; own.y = p.y; } else { own.x += ex * Math.min(1, dt / .1); own.y += ey * Math.min(1, dt / .1); } own.vx = p.vx; own.vy = p.vy; own.facing = p.facing; }
      else { ent.x = r[1]; ent.y = r[2]; ent.vx = r[3]; ent.vy = r[4]; if (!isG) ent.facing = (rb || ra)[5] / 255 * TAU; }
      const row = rb || ra;
      if (isG) { ent.state = GST[row[6]] || 'ready'; ent.stateT = row[7] / 10; ent.offIce = !!(row[8] & 4); }
      else { ent.state = SST[row[6]] || 'skate'; ent.stateT = row[7] / 10; ent.turboOn = !!(row[8] & 2); ent.offIce = !!(row[8] & 4); ent.charging = !!(row[8] & 8); ent.turbo = row[9] / 100; ent.charge = row[10] / 100; ent.shootHeld = ent.charging ? .3 : 0; }
    }
    const pa = a.pk, pb = b.pk, own2 = pb[6] >= 0 ? m.byId(pb[6]) : null;
    m.puck.owner = own2; m.puck.onFire = !!pb[7]; m.puck.inNet = pb[8];
    if (own2) { const [bx, by] = Skater.blade(own2); m.puck.x = bx; m.puck.y = by; m.puck.z = 0; } else { m.puck.x = lerp(pa[0], pb[0], k) / 2; m.puck.y = lerp(pa[1], pb[1], k) / 2; m.puck.z = lerp(pa[2], pb[2], k) / 2; m.puck.vx = pb[3]; m.puck.vy = pb[4]; }
    for (const s of m.skaters) Skater.pose(m, s, dt);
    for (const g of m.goalies) { const hk = g.rig.hk; hk.gst = g.state === 'butterfly' || g.state === 'cover' ? 'butterfly' : g.state === 'stack' ? 'stack' : g.state === 'shuffle' ? 'shuffle' : 'ready'; hk.gw = 1; g.facing = Goalie.out(m, g) > 0 ? 0 : PI; g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.facing, down: g.state === 'blasted' ? 1 : 0, pose: g.state === 'celebrate' ? 'cheer' : null }); }
    Replay.record(m);
  }
  /** host: the round's result for the hub (once) */
  function finish(m, why) {
    if (st.finished || !st.info || !st.info.isHost) return; st.finished = true;
    const humans = m.humans.filter(h => h.pid !== undefined && !st.leftIds.has(h.pid)), ids = t => humans.filter(h => h.team === t).map(h => h.pid);
    const s0 = m.teams[0].score, s1 = m.teams[1].score, w = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;
    let standings; if (w < 0) standings = [humans.map(h => h.pid)]; else standings = [ids(w), ids(1 - w)].filter(a => a.length);
    if (!standings.length) standings = [[]];
    const scores = {}, stats = {}; for (const h of m.humans) { if (h.pid === undefined) continue; const S2 = m.skaters.filter(s => s.team === h.team); const me = h.skater; scores[h.pid] = (me.stats.goals + me.stats.assists); stats[h.pid] = { Goals: me.stats.goals, Assists: me.stats.assists, Hits: me.stats.hits, Fights: me.stats.fightsWon }; void S2; }
    const stars = Match.threeStars(m), awards = []; stars.forEach((id, i) => { const h = m.humans.find(hh => hh.skater && hh.skater.id === id && hh.pid !== undefined); if (h) awards.push({ id: h.pid, title: ['1st Star', '2nd Star', '3rd Star'][i], detail: h.name }); });
    const res = { standings, scores, stats, awards }; if (humans.length === 1 && st.players.length === 1) res.won = w === humans[0].team;
    try { send(Object.assign(snapshot(m), { over: 1 }), { reliable: true }); AIHub.finish(res); } catch (e) { game.fail('net finish', e); }
    Bus.emit('session_finish', { why });
  }
  async function connect() {
    if (!HUB) return null;
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
    if (!info) { st.active = false; game.go('title'); return null; }
    st.active = true; st.info = info; st.me = info.me; st.players = info.players.slice().sort((a, b) => a.id - b.id); st.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
    const rng = AIHub.rng('setup'), pool = TEAM_ORDER.filter(id => !TEAMS[id].locked), home = pool[Math.floor(rng() * pool.length)], awayPool = pool.filter(id => id !== home), away = awayPool[Math.floor(rng() * awayPool.length)], arena = ARENA_ORDER[Math.floor(rng() * ARENA_ORDER.length)];
    st.players.forEach((p, i) => { st.seat[p.id] = st.players.length === 1 ? 0 : i % 2; });
    const humans = st.players.map(p => ({ team: st.seat[p.id], pid: p.id, name: U.sanitize(p.name), color: p.color || E.PLAYER_COLORS[p.id] || '#ffd36a', tag: U.sanitize(p.name, 6).toUpperCase(), kind: p.id === st.me && !info.server ? 'local' : 'remote', input: p.id === st.me && !info.server ? game.input : null }));
    const simRng = AIHub.rng('sim'), seed = Math.floor(simRng() * 1e9);
    const cfg = { mode: 'session', home, away, arena, periods: 1, periodLen: 180, ot: 'sudden', otLen: 60, otCap: 60, shootout: false, intros: false, replays: 'auto', flood: 'never', humans, seed, difficulty: 'pro', noAutoSwitch: false };
    const m = Match.create(cfg); m.setPhase('intro', 1e9);
    // a 2-on-1: the lone human's CPU teammates get +.15 (aiSkill does it)
    st.startedWith = st.players.length;
    AIHub.on('card', c => { st.card = c; });
    AIHub.on('start', () => { st.started = true; Synth.music(m.arena.music === 'play' ? 'play' : m.arena.music); });
    AIHub.on('message', (data, from) => {
      if (!data || st.ended) return;
      if (st.info.isHost && data.t === 'in') { const prev = st.inputs[from]; if (!prev || data.s > prev.s) { st.inputs[from] = data; st.acks[from] = data.s; } }
      else if (!st.info.isHost && from === st.info.host && data.t === 's') { onSnap(data); if (data.over) st.over = true; }
    });
    AIHub.on('leave', ({ id }) => {
      st.leftIds.add(id); const hu = m.humans.find(h => h.pid === id); if (hu && hu.skater) { hu.skater.ctrl = { kind: 'cpu' }; hu.skater.ai.thinkT = 0; hu.gone = true; }
      if (st.info.isHost && st.startedWith >= 2 && m.humans.filter(h => h.pid !== undefined && !st.leftIds.has(h.pid)).length <= 1) finish(m, 'leave');
    });
    AIHub.on('time-up', () => { if (st.info.isHost) finish(m, 'time-up'); });
    AIHub.on('end', ({ reason }) => { st.ended = true; st.endReason = reason; Synth.music(null); try { A.mute(true); } catch (e) { /* no sound */ } Synth.crowdOff(); });
    World.prepare(m); st.ready = true;
    AIHub.ready();
    return info;
  }
  /** each step of the session scene */
  function step(dt) {
    const m = Match.m; if (!m || !st.active || st.ended) return;
    const t = AIHub.time();
    if (st.info.isHost) {
      if (st.started && t >= 0 && m.phase === 'intro') Match.placeFaceoff(m, 'center');
      if (t >= 0 || m.phase !== 'intro') Match.step(dt);
      if (m.phase === 'final' && m.phaseT <= 2) finish(m, 'final');
      st.tick++; st.snapT = (st.snapT || 0) + dt; if (st.snapT >= 1 / 15 && st.players.length + (st.info.server ? 0 : 0) > 0) { st.snapT = 0; if (st.players.some(p => p.id !== st.me)) send(snapshot(m), { reliable: false }); }
    } else { sendInput(dt); clientStep(m, dt); }
  }
  // the host keeps the recent events for its snapshots
  Bus.on('*', e => { if (st.active && st.info && st.info.isHost && EVS.includes(e.type)) { e._t = Match.m ? Match.m.t : 0; st.evq.push(e); if (st.evq.length > 40) st.evq.shift(); } });
  return { st, connect, step, intentFor, snapshot, onSnap, finish, enc, dec, state: () => ({ role: st.role, players: st.players.length, ended: st.ended, started: st.started, finished: st.finished }), get ended() { return st.ended; }, get active() { return st.active; } };
})();

/* ---- 90-start.js ---- */
/* ---- START: wiring, the boot steps, deep links (tests and tools), game.debug and window.__game ---- */
T.load();
Boom.wire(); Fx.wire(); Talk.wire(); Hud.wire(); Objectives.wire(); Records.wire(); Drills.wire(); Items.wire();
const BOOT_STEPS = [
  ["Flooding the Ol' Icebox", () => { Rink.build('icebox', 'muskrats'); }],
  ['Tuning the organ', () => { Synth.SONGS; }],
  ['Lacing the skates', () => { for (const id of TEAM_ORDER) for (const k of [16, 24]) Logo.canvasOf(id, k); }],
  ['Checking the rule book', () => { Story.validate(); }],
  ['Reading the scoresheet', () => { Save.load(); }]
];
/** deep links (5.1): #attract, #story/<1-5>, #cutscene/<id>, #match/<home>/<away>/<arena>, #fight, #kaboom, #shootout,
 *  #flood, #practice/<1-7>, #results, #about, #records, #credits, #lab, #dev, #title */
function deepLink() {
  if (HUB || typeof location === 'undefined') return null;
  const h = (location.hash || '').slice(1).split('/'), k = h[0];
  if (!k) return null;
  if (k === 'attract') return ['attract', null];
  if (k === 'story') return ['storymap', { chapter: +h[1] || 1 }];
  if (k === 'cutscene') return ['cutscene', { id: h[1] || 'ch1-pre', then: 'title' }];
  if (k === 'match') return ['match', { cfg: Setup.quickCfg({ home: h[1], away: h[2], arena: h[3] }) }];
  if (k === 'fight' || k === 'kaboom' || k === 'shootout') return ['match', { cfg: Setup.quickCfg({ warp: k }) }];
  if (k === 'flood') return ['flood', { from: 'title', ask: false, auto: false }];
  if (k === 'practice') return ['practice', { drill: +h[1] || 1 }];
  if (k === 'results') return ['results', { demo: true }];
  if (k === 'dev') return ['match', { cfg: Setup.quickCfg({ dev: true }) }];
  if (scenes[k]) return [k, null];
  return null;
}
const link = deepLink();
const touchOnly = () => !NODE && typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !Title.sawPad && !Title.sawKey;
game.start({ scenes, scene: HUB ? 'session' : link ? link[0] : 'title', data: link ? link[1] : undefined, boot: { title: 'ICE HOC-KABOOM', version: VERSION, steps: BOOT_STEPS, messages: ['Sharpening the skates', 'Taping the sticks', 'Warming up the organ', 'Hiding the octopus', 'Gassing up the Flood Wagon'] } });
game.debug = {
  snapshot() {
    const m = Match.m;
    return {
      scene: game.sceneName, mode: m ? m.cfg.mode : null, phase: m ? m.phase : null, period: m ? m.period : 0, clock: m ? +m.clock.toFixed(2) : 0,
      score: m ? [m.teams[0].score, m.teams[1].score] : null, shots: m ? [m.teams[0].shots, m.teams[1].shots] : null,
      puck: m ? { x: Math.round(m.puck.x), y: Math.round(m.puck.y), z: Math.round(m.puck.z), owner: m.puck.owner ? m.puck.owner.id : -1 } : null,
      skaters: m ? m.skaters.map(s => ({ id: s.id, team: s.team, x: Math.round(s.x), y: Math.round(s.y), state: s.state, ctrl: s.ctrl.kind })) : [],
      goalies: m ? m.goalies.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), state: g.state })) : [],
      boom: m ? m.boom.map(Math.round) : null, kaboom: m ? m.kaboom.map(v => +v.toFixed(1)) : null, fight: m && m.fight ? { a: m.fight.a, b: m.fight.b } : null,
      items: m ? m.items.map(i => i.kind) : [], sinBin: m ? m.skaters.filter(s => s.state === 'bin').map(s => ({ id: s.id, t: +s.binT.toFixed(1) })) : [],
      story: { chapter: Story.chapter, stars: Save.totalStars(), step: Story.step }, attract: Attract.state(), dev: { open: Dev.isOpen() }, net: Net.state(), errors: game.errors.length
    };
  },
  warp: (target, o) => Dev.warp(target, o), set: (k, v) => T.set(k, v), cheat: (name, on) => Dev.cheat(name, on), event: (type, data) => Bus.emit(type, data), seed: n => RNG.seed(n)
};
game.stateHash = () => { const m = Match.m; if (!m) return [game.sceneName]; return [m.phase, m.period, Math.round(m.clock * 10), m.teams[0].score, m.teams[1].score, Math.round(m.puck.x), Math.round(m.puck.y), ...m.skaters.map(s => Math.round(s.x) * 1000 + Math.round(s.y))]; };
if (typeof window !== 'undefined') window.__game = { game, scenes, Match, T, Dev, Net, STORY, Story, Save, Records, Rink, TEAMS, ARENAS, Attract, Setup, Drills, Bus, UI, Glyphs, Synth, Replay, Cam, Hud, Talk, Fight, Items, Boom, Skater, Puck, Goalie, AI, Shots, RNG, Logo, Flood, Title, touchOnly, TEXT, ABOUT, FEEDBACK, Objectives, Items2, ITEM_DEFS, Lab, Crowd, World, INTERVIEW, CAST, SPEAKERS, Cutscene };

})();
