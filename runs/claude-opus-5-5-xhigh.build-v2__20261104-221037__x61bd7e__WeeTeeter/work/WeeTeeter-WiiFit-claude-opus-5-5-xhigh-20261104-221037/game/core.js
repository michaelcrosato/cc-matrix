/* core.js: the G namespace, the game, the input map, the live balance values (DEV), the member's state, Spine Age and
 * minutes, saves, deep links. Everything else hangs off the global G. Plain script, so the page works from file://. */
(() => {
'use strict';
const E = My3D2dge;
const G = window.G = { E, DATA: {}, scenes: {}, activities: {}, families: {}, order: [], version: '1.0' };
G.TITLE = 'Wee Teeter';
G.ABOUT = window.WEE_ABOUT || {};
G.inSession = !!(window.AIHub && AIHub.active);

/* ---- the input map. A custom map replaces the whole preset, so the engine's menu actions stay in it ---- */
const D = E.Input.DEFAULT;
G.INPUT = {
  up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel.concat(['Mouse2']),
  breath: ['Space', 'Mouse0', 'Pad6', 'Pad7'], catchL: ['KeyQ', 'Mouse0', 'Pad4'], catchR: ['KeyE', 'Mouse2', 'Pad5'],
  jump: ['Space', 'Mouse2', 'Pad0'], walk: ['KeyW', 'ArrowUp', 'Mouse0', 'Pad7', 'Pad6'], interact: ['KeyE', 'Enter', 'Pad0'], more: ['Tab', 'KeyM', 'Pad3'], retry: ['KeyR', 'Pad2'],
  paceL: ['KeyJ', 'Mouse0', 'Pad6'], paceR: ['KeyK', 'Mouse2', 'Pad7'],
  stepL: ['KeyA', 'ArrowLeft', 'Mouse0', 'Pad14', 'PadAxisLeft'], stepR: ['KeyD', 'ArrowRight', 'Mouse2', 'Pad15', 'PadAxisRight'],
  stepU: ['KeyW', 'ArrowUp', 'WheelUp', 'Pad12', 'PadAxisUp'], stepD: ['KeyS', 'ArrowDown', 'WheelDown', 'Pad13', 'PadAxisDown']
};
// half a keyboard (Class): the moves and menu actions plus these; the engine lays them on F G H / . / ,
G.CLASS_INPUT = { up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel,
  breath: ['Space', 'Mouse0', 'Pad6', 'Pad7'], catchL: ['KeyQ', 'Mouse0', 'Pad4'], catchR: ['KeyE', 'Mouse2', 'Pad5'] };

/* ---- DEV: every balance number a slider can reach. Lean values are multipliers of each activity's own numbers ---- */
G.DEV_SPEC = [
  { group: 'Lean', key: 'k', label: 'Responsiveness (k)', def: 1, min: .25, max: 2.5, step: .05 },
  { group: 'Lean', key: 'c', label: 'Damping (c)', def: 1, min: .25, max: 2.5, step: .05 },
  { group: 'Lean', key: 's', label: 'Instability (s)', def: 1, min: 0, max: 2.5, step: .05 },
  { group: 'Lean', key: 'A', label: 'Tremble (A)', def: 1, min: 0, max: 3, step: .05 },
  { group: 'Lean', key: 'nf', label: 'Tremble speed', def: 1, min: .25, max: 3, step: .05 },
  { group: 'Lean', key: 'ring', label: 'Ring scale', def: 1, min: .5, max: 2, step: .05 },
  { group: 'Lean', key: 'push', label: 'Push strength', def: 1, min: 0, max: 3, step: .05 },
  { group: 'Lean', key: 'stumble', label: 'Stumble threshold', def: 1, min: .6, max: 2, step: .02 },
  { group: 'Lean', key: 'reach', label: 'Mouse reach', def: .33, min: .1, max: .6, step: .01 },
  { group: 'Lean', key: 'nudge', label: 'Key nudge rate', def: 2.2, min: .8, max: 5, step: .1 },
  { group: 'Scoring', key: 'stars', label: 'Star thresholds', def: 1, min: .4, max: 1.2, step: .02 },
  { group: 'Scoring', key: 'repTol', label: 'Rep tolerance', def: 1, min: .4, max: 2.5, step: .05 },
  { group: 'Scoring', key: 'window', label: 'Rhythm windows', def: 1, min: .4, max: 2.5, step: .05 },
  { group: 'Scoring', key: 'fatigue', label: 'Fatigue', def: 1, min: 0, max: 3, step: .05 },
  { group: 'Cardio', key: 'hoopLo', label: 'Hoop band low', def: 7, min: 3, max: 10, step: .25 },
  { group: 'Cardio', key: 'hoopHi', label: 'Hoop band high', def: 11, min: 8, max: 16, step: .25 },
  { group: 'Cardio', key: 'jogLo', label: 'Jog band low', def: 2.6, min: 1.5, max: 3.5, step: .05 },
  { group: 'Cardio', key: 'jogHi', label: 'Jog band high', def: 3.4, min: 2.6, max: 4.2, step: .05 },
  { group: 'Cardio', key: 'jogSpeed', label: 'Jog speed', def: 1, min: .4, max: 2.5, step: .05 },
  { group: 'Games', key: 'skiSpeed', label: 'Slalom speed', def: 220, min: 100, max: 400, step: 5 },
  { group: 'Games', key: 'skiTurn', label: 'Slalom turn', def: 1, min: .4, max: 2, step: .05 },
  { group: 'Games', key: 'trayG', label: 'Tray gravity', def: 420, min: 120, max: 900, step: 10 },
  { group: 'Games', key: 'trayF', label: 'Tray friction', def: .5, min: 0, max: 2, step: .05 },
  { group: 'Games', key: 'rope', label: 'Rope instability', def: 1, min: 0, max: 2, step: .05 },
  { group: 'Games', key: 'gust', label: 'Gust strength', def: 1, min: 0, max: 2.5, step: .05 },
  { group: 'World', key: 'timeScale', label: 'Time scale', def: 1, options: [0, .25, .5, 1, 2] },
  { group: 'World', key: 'minutes', label: 'Minutes multiplier', def: 1, min: 0, max: 10, step: .25 }
];
G.DEV = {};
G.devReset = () => { for (const s of G.DEV_SPEC) G.DEV[s.key] = s.def; G.DEV.noStumble = false; G.DEV.bot = null; G.DEV.trace = false; if (G.game) G.game.timeScale = 1; };
G.devReset();

/* ---- the game ---- */
const inSession = G.inSession;
const game = G.game = new E.Game({
  canvas: 'screen', id: 'weeteeter', res: 'ps1', expand: true, touch: 'never', input: G.INPUT, view: 'brawler', bg: '#d8f3fb',
  autoPause: !inSession, live: inSession, fullscreen: inSession ? false : 'button',
  menu: {
    quit: inSession ? false : 'title',
    items: inSession ? [] : [
      ['Restart Session', () => G.restartSession && G.restartSession()],
      ['Dev Mode', () => G.Dev && G.Dev.open()]
    ],
    settings: [
      { key: 'music', value: .1 },
      { key: 'glyphs', value: 'playstation', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['generic', 'Positions']] },
      { key: 'voice', label: 'Voices', type: 'slider', min: 0, max: 1, step: .05, value: .8, group: 'Sound', help: 'How loudly everyone speaks gibberish',
        apply: (g, v) => { g.audio.voiceVolume = v; if (g.audio.applyVolume) g.audio.applyVolume(); } },
      { key: 'gentle', label: 'Gentle Mode', value: false, group: 'Game', help: 'A wider ring and a calmer body. Tare will not tell anyone' },
      { key: 'breathMode', label: 'Breath', options: ['Hold', 'Toggle'], value: 'Hold', group: 'Game', help: 'Hold to breathe in, or press once for in and once for out' },
      { key: 'tips', label: "Tare's Tips", value: true, group: 'Game', help: 'Tare shares advice nobody asked for' }
    ],
    controls: { breath: 'Breathe / Effort', catchL: 'Catch left', catchR: 'Catch right', jump: 'Jump', walk: 'Walk the line', paceL: 'Left step (jog)', paceR: 'Right step (jog)',
      stepL: 'Step left', stepR: 'Step right', stepU: 'Step up', stepD: 'Step down', interact: false, more: false, retry: false }
  }
});
G.A = game.audio; G.P = game.particles; G.L = game.lights;

/* ---- the standard HTML screens, themed bright. The engine's menus don't move focus on hover: this makes them ---- */
G.shell = new E.Shell(game, { theme: { ink: '#20404c', paper: '#f7fbfb', accent: '#14a8c8', muted: '#5f7f8a', danger: '#e0553a', line: '#c8dde2', font: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif' } });
if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('pointerover', e => {
  const b = e.target.closest && e.target.closest('.esh-sh button:not(:disabled), .esh-sh input:not(:disabled)');
  if (b && e.pointerType === 'mouse') b.focus({ preventScroll: true });
});

/* ---- small helpers ---- */
G.clamp = E.clamp; G.lerp = E.lerp;
const clamp = E.clamp;
/** a seeded random stream: the hub's in a session (the same on every copy), a seeded one on its own */
let seedCounter = 1;
G.rng = (label, seed) => {
  if (G.Hub && G.Hub.live && window.AIHub && AIHub.rng) return AIHub.rng(String(label));
  return E.rng(seed === undefined ? (hashStr(String(label)) + seedCounter++) : seed);
};
const hashStr = G.hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
G.pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
G.fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };
G.go = (name, data, o) => game.go(name, data, o);
G.gentle = () => !!(game.settings && game.settings.gentle);

/* ---- the member: everything a save holds ---- */
G.DISCIPLINES = ['Stillness', 'Strength', 'Cardio', 'Balance'];
G.freshMember = (name, look) => ({
  name: name || 'Gentle Doug', look: look || { hair: 'short', skin: 0, top: 0, bottom: 0 }, instructor: null,
  day: 1, session: 0, arrived: false, checked: false, best: {}, bestPct: {}, minutes: 0, shown: 71, history: [71], tier2: {},
  duelWon: false, ended: false, freePlay: false, tareDay: false, nod: false, suggestion: null, unlocksSeen: 0, lastSeen: 0, pauses: 0,
  wear: { towel: false, headband: false, sunhat: false, hat: false }, seen: {}, lineSeed: 1, runs: 0, games: 0, gamesScore: 0, finalAge: 0, stiffly: 0
});
G.S = G.freshMember();
const S = () => G.S;

/* ---- Spine Age: the number that matters ---- */
G.bestStars = id => { const b = S().best[id]; if (!b) return 0; return Math.max(b[0] || 0, b[1] || 0); };
G.disciplineScore = name => {
  const list = G.order.filter(id => G.activities[id].discipline === name);
  if (!list.length) return 0;
  let sum = 0; for (const id of list) sum += G.bestStars(id) * 33.3;
  return sum / list.length;
};
G.overall = () => { let t = 0; for (const d of G.DISCIPLINES) t += G.disciplineScore(d); return t / G.DISCIPLINES.length; };
G.spineAge = () => S().devAge || Math.max(1, Math.min(71, Math.round(78 - .58 * G.overall())) - (S().duelWon ? 1 : 0));
/** what Tare will admit to today: Day 3's plateau holds yesterday's number */
G.spineShown = () => { const s = S(); return G.DATA.dayOf(s.day).hold ? s.shown : G.spineAge(); };

/* ---- minutes and Gerald ---- */
G.earnMinutes = (sessionMinutes, stars, id) => {
  const s = S(), sug = s.suggestion === id ? 1.5 : 1;
  const add = sessionMinutes * (1 + .25 * stars) * sug * G.DEV.minutes;
  const before = s.minutes; s.minutes += add;
  const got = G.DATA.unlocks.filter(u => before < u.minutes && s.minutes >= u.minutes);
  return { add, got };
};
G.unlocked = id => S().minutes >= G.DATA.unlocks.find(u => u.id === id).minutes;

/* ---- what is open today ---- */
G.activityOpen = id => { const s = S(); if (s.freePlay) return true; return G.DATA.openOn(id) <= s.day; };
G.tier2Open = id => { const s = S(), b = s.best[id]; return s.freePlay || s.day >= 4 || !!(b && b[0] >= 2); };
G.bestTier = id => (S().best[id] || []);

/* ---- saves ---- */
G.Save = {
  slot: null,
  write() { const s = S(); s.lastSeen = Date.now(); return { data: JSON.parse(JSON.stringify(s)), place: 'Day ' + s.day, level: G.spineAge() }; },
  read(save) { G.S = Object.assign(G.freshMember(), save.data); G.Save.slot = save.slot; },
  save() { if (G.inSession || G.Save.slot === null || G.attractOn) return false; return game.saves.save(G.Save.slot); },
  load(slot) { return game.saves.load(slot); },
  member(slot) { const v = game.saves.get(slot); if (!v) return null; if (v.damaged || v.newer || !v.data) return { damaged: true, slot }; return Object.assign({ slot }, v); },
  create(slot, name, look) { G.S = G.freshMember(name, look); G.Save.slot = slot; G.Save.save(); },
  erase(slot) { game.saves.erase(slot); }
};
game.saves.write = G.Save.write; game.saves.read = G.Save.read;

/* ---- deep links: #hub, #act/stork/1, #day/3, #ending, #class, #about, #attract ---- */
G.deepLink = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h) return null;
  const [a, b, c] = h.split('/');
  if (a === 'hub') return { scene: 'island', dev: 1 };
  if (a === 'act' && G.activities[b]) return { act: b, tier: Math.max(0, (+c || 1) - 1), dev: 1 };
  if (a === 'day') return { scene: 'bodycheck', day: clamp(+b || 1, 1, 6), dev: 1 };
  if (a === 'ending') return { scene: 'ending', dev: 1 };
  if (['class', 'about', 'attract', 'title', 'member', 'games', 'tareday', 'evening', 'duel'].includes(a)) return { scene: a, dev: 1 };
  return null;
};
/** a throwaway member for a deep link or a dev jump: nothing written */
G.devMember = day => { G.Save.slot = null; G.S = G.freshMember('Sir Slouch'); G.S.instructor = 'birch'; G.S.arrived = true; G.S.day = day || 1; G.S.checked = true; };

/* ---- debug handle: tests and engine tools read this ---- */
G.dbg = { activity: null, tier: null, pct: null, stars: null, lean: [0, 0], source: 'keyboard' };
game.debug = { snapshot() { const s = S(); return { scene: game.sceneName, activity: G.dbg.activity, tier: G.dbg.tier, day: s.day, session: s.session, pct: G.dbg.pct, stars: G.dbg.stars, minutes: +s.minutes.toFixed(2), spineAge: G.spineAge(), lean: G.dbg.lean, source: G.dbg.source }; } };
})();
