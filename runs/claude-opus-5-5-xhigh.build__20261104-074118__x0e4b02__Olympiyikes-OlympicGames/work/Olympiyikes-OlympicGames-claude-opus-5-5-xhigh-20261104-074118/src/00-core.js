// OLYMPIYIKES! — the complete Summer and Winter Games, over the top. Core: the game object, the key map, settings,
// registries, the scene wrapper, tuning, saves and the random streams. Every other file attaches to window.OLY (O).
(() => {
'use strict';
const E = My3D2dge, O = window.OLY = window.OLY || {};
const { clamp, lerp } = E;
O.E = E;
O.VERSION = '1.0.0';
O.TITLE = 'OLYMPIYIKES!';
O.TAGLINE = 'Faster. Higher. Yikes.';
O.BUILD_STAMP = 'claude-opus-5-5-xhigh-20261104-074118';
O.inHub = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
O.M = 12;                       // world units per meter (most events)
O.headless = typeof document === 'undefined' || !document.getElementById;

// ---------------------------------------------------------------------------------------------------------------
// The action map (controller first; the keyboard keys PC players expect; confirm/cancel never on J or K)
// ---------------------------------------------------------------------------------------------------------------
O.KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  mashL: ['KeyJ', 'Pad2', 'Pad4'], mashR: ['KeyK', 'Pad1', 'Pad5'], action: ['Space', 'Pad0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad3'],
  alt: ['KeyL', 'Pad7', 'Pad6'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], dev: ['Backquote'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const withCodes = (base, add) => { const o = {}; for (const k in base) o[k] = base[k].slice(); for (const k in add) o[k] = o[k].concat(add[k]); return o; };
O.KEYS_AIM = withCodes(O.KEYS, { action: ['Mouse0'], alt: ['Mouse2'] });            // archery, curling: the pointer aims
O.KEYS_HOCKEY = withCodes(O.KEYS, { action: ['Mouse0'], mashL: ['Mouse2'] });       // hockey: shoot / pass toward the cursor
O.ACTION_NAMES = { mashL: 'Left (mash, pass, tuck)', mashR: 'Right (mash, check, pike)', action: 'Action (jump, throw, release)', turbo: 'Yikes Turbo', alt: 'Hold (tuck, breathe, steady)', tabL: false, tabR: false, dev: false };

// ---------------------------------------------------------------------------------------------------------------
// The game's own settings (Settings → Game, and two Sound sliders)
// ---------------------------------------------------------------------------------------------------------------
O.GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal', help: 'How good the other nations are, how wide the timing windows are, and the qualifying marks' },
  { key: 'promptStyle', label: 'Controller prompts', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', help: 'The button symbols shown for a controller', apply: (g, v) => { if (g.input) g.input.glyphs = v; if (g.players) for (const p of g.players) p.glyphs = v; } },
  { key: 'mashAssist', label: 'Mash assist', options: [['off', 'Off'], ['one', 'One button'], ['hold', 'Hold']], value: 'off', help: 'One button: any mash button counts as the alternation. Hold: holding either runs at a steady pace' },
  { key: 'timingAssist', label: 'Timing assist', type: 'toggle', value: false, help: 'Every timing window 40% wider' },
  { key: 'commentary', label: 'Commentary', options: [['both', 'Voices + subtitles'], ['subs', 'Subtitles only'], ['off', 'Off']], value: 'both' },
  { key: 'textSize', label: 'Text size', options: [['large', 'Large'], ['huge', 'Huge']], value: 'large', help: 'Huge: subtitles, cards and HUD labels half again as big' },
  { key: 'hints', label: 'Hints', type: 'toggle', value: true, help: 'Tips during play, such as "Alternate the two buttons!"' },
  { key: 'crowd', label: 'Crowd', group: 'Sound', type: 'slider', value: .7, min: 0, max: 1, step: .05 }
];

// ---------------------------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------------------------
O.hash = s => { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
O.clamp = clamp; O.lerp = lerp;
O.fmt = {
  time: v => v == null ? '—' : (v >= 60 ? Math.floor(v / 60) + ':' + (v % 60).toFixed(2).padStart(5, '0') : v.toFixed(2)) + ' s',
  m: v => v == null ? '—' : v.toFixed(2) + ' m',
  pts: v => v == null ? '—' : v.toFixed(2),
  int: v => v == null ? '—' : String(Math.round(v)),
  kg: v => v == null ? '—' : Math.round(v) + ' kg',
  thousands: v => Math.round(v).toLocaleString('en-US')
};
O.ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
O.shuffle = (list, rnd) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
O.gauss = rnd => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// the event bus: comms, crowd, hype, sfx, laurels and tests listen
const LIS = {};
O.bus = {
  on(name, fn) { (LIS[name] || (LIS[name] = [])).push(fn); return () => { LIS[name] = LIS[name].filter(f => f !== fn); }; },
  emit(name, data) { for (const f of (LIS[name] || []).slice()) try { f(data); } catch (e) { if (O.game) O.game.fail('bus:' + name, e); } for (const f of (LIS['*'] || []).slice()) try { f(name, data); } catch (e) { /* a test's listener */ } }
};

// saves (E.store wrappers; blocked storage keeps them for the visit; in a hub session the client's storage is empty)
const MEMO = {};
O.store = {
  get(k, d) { if (k in MEMO) return MEMO[k]; let v; try { v = E.store.get('oly:' + k, d); } catch (e) { v = d; } return (MEMO[k] = v === undefined ? d : v); },
  set(k, v) { MEMO[k] = v; if (O.meet && O.meet.mode === 'attract') return; try { E.store.set('oly:' + k, v); } catch (e) { /* blocked: kept for the visit */ } },
  del(k) { delete MEMO[k]; try { E.store.set('oly:' + k, null); } catch (e) { /* blocked */ } },
  writes: 0
};
const _set = O.store.set; O.store.set = (k, v) => { O.store.writes++; _set(k, v); };

// random streams: gameplay randomness only through labels (the hub's on every copy; otherwise the meet's seed)
O.seed = Date.now() % 1e9;
O.rng = label => {
  if (O.inHub && window.AIHub && AIHub.rng && O.hubSeeded) return AIHub.rng(String(label));
  return E.rng(O.hash((O.meet ? O.meet.seed : O.seed) + '|' + label));
};

// ---------------------------------------------------------------------------------------------------------------
// The tuning registry: the dev sliders' data (events read ctx.T.key every step, so a change applies at once)
// ---------------------------------------------------------------------------------------------------------------
const TUNE = {}, TDEF = {};
O.tune = {
  def(group, key, spec) { (TDEF[group] || (TDEF[group] = {}))[key] = { def: spec[0], min: spec[1], max: spec[2], step: spec[3], label: spec[4] || key }; const g = TUNE[group] || (TUNE[group] = {}); if (!(key in g)) g[key] = spec[0]; return g; },
  get(group) { return TUNE[group] || (TUNE[group] = {}); },
  specs(group) { return TDEF[group] || {}; },
  groups() { return Object.keys(TDEF); },
  set(group, key, v) { const s = (TDEF[group] || {})[key]; if (!s) return; TUNE[group][key] = clamp(v, s.min, s.max); if (O.store.get('tuneKeep', false)) O.store.set('tune', O.tune.changedAll()); },
  reset(group) { for (const g of group ? [group] : Object.keys(TDEF)) for (const k in TDEF[g]) TUNE[g][k] = TDEF[g][k].def; if (O.store.get('tuneKeep', false)) O.store.set('tune', O.tune.changedAll()); },
  changed(group) { const out = {}; for (const k in TDEF[group] || {}) if (Math.abs(TUNE[group][k] - TDEF[group][k].def) > 1e-9) out[k] = TUNE[group][k]; return out; },
  changedAll() { const out = {}; for (const g in TDEF) { const c = O.tune.changed(g); if (Object.keys(c).length) out[g] = c; } return out; },
  json(group) { return JSON.stringify(group ? { [group]: O.tune.changed(group) } : O.tune.changedAll(), null, 1); },
  load(obj) { for (const g in obj || {}) for (const k in obj[g]) O.tune.set(g, k, obj[g][k]); }
};
// the global tunables (§5.13 of the plan)
O.G = O.tune.get('G');
[['cpuSkillScale', [1, .5, 1.5, .01, 'CPU skill scale']], ['cpuOffsetEasy', [-.12, -.4, .2, .01, 'CPU offset: Easy']], ['cpuOffsetNormal', [0, -.3, .3, .01, 'CPU offset: Normal']],
 ['cpuOffsetHard', [.06, -.2, .4, .01, 'CPU offset: Hard']], ['windowScale', [1, .5, 2, .05, 'Timing window scale']], ['hypeGain', [1, 0, 3, .05, 'Hype gain']], ['hypeDecay', [.02, 0, .2, .005, 'Hype decay / s']],
 ['turboTime', [3, 1, 8, .1, 'Turbo time (s)']], ['turboPower', [1, 0, 2, .05, 'Turbo power']], ['mashRateMin', [1.5, 0, 6, .1, 'Mash rate min (Hz)']], ['mashRateMax', [9.5, 6, 16, .1, 'Mash rate max (Hz)']], ['mashCurve', [.6, .3, 1.5, .05, 'Mash power curve']],
 ['mashHoldRate', [.8, .3, 1, .01, 'Mash assist hold pace']], ['yikesHype', [.15, 0, .5, .01, 'Sympathy hype after a yikes']], ['slowmoScale', [.3, .1, 1, .05, 'Slow-motion scale']],
 ['qualifyScale', [1, .5, 1.5, .01, 'Qualifying mark scale']], ['gameSpeed', [1, .25, 2, .05, 'Game speed']]].forEach(([k, s]) => O.tune.def('G', k, s));
O.difficulty = () => (O.meet && O.meet.difficulty) || (O.game && O.game.settings.difficulty) || 'Normal';
O.cpuOffset = () => O.G['cpuOffset' + O.difficulty()] || 0;
O.windowScale = () => O.G.windowScale * ({ Easy: 1.25, Normal: 1, Hard: .85 }[O.difficulty()] || 1) * (O.game && O.game.settings.timingAssist ? 1.4 : 1);

// ---------------------------------------------------------------------------------------------------------------
// The game object
// ---------------------------------------------------------------------------------------------------------------
const later = name => () => (O[name] ? O[name]() : O.game.note('Not available'));
O.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'brawler', input: O.KEYS, id: 'olympiyikes', bg: '#0b0f24',
  menu: {
    items: O.inHub ? [] : [['Restart event', later('restartEvent')], ['How to play', later('showEventHelp')], ['Dev mode', later('openDev')]],
    settings: O.GAME_SETTINGS, quit: O.inHub ? false : 'title', controls: O.ACTION_NAMES
  }
});
const game = O.game;
game.input.glyphs = game.settings.promptStyle || 'playstation';
if (game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation');
game.settings.onChange = (key, v) => { if (key === 'glyphs' && (v === 'xbox' || v === 'playstation') && game.settings.promptStyle !== v) game.settings.set('promptStyle', v); };
O.textK = () => game.settings.textSize === 'huge' ? 1.5 : 1;

// ---------------------------------------------------------------------------------------------------------------
// Scenes: O.scene(name, def) wraps an engine scene: input lockout, idle tracking, the dev panel, global overlays
// ---------------------------------------------------------------------------------------------------------------
O.scenes = {};
O.cur = { name: null, t: 0 };
O.overlays = [];            // global overlay painters (toasts, the commentary lower third, stamps, the attract badge): fn(r, g)
O.updaters = [];            // global per-step updaters (real dt): fn(rdt)
O.scene = (name, def) => {
  const w = Object.assign({}, def);
  w.enter = data => {
    O.cur = { name, def, t: 0, real: game.real, lock: def.lock === undefined ? .35 : def.lock, data };
    for (const p of game.players) { p.consumeAll(); }
    if (O.Idle) O.Idle.reset();
    if (def.enter) def.enter.call(w, data || {});
  };
  w.exit = () => { if (def.exit) def.exit.call(w); };
  w.update = dt => {
    const st = O.cur, now = game.real, rdt = clamp(now - (st.real === undefined ? now : st.real), 0, .05); st.real = now; st.t += rdt;
    O.rdt = rdt;
    for (const f of O.updaters) f(rdt, dt);
    if (O.Hub && O.Hub.ended) { for (const p of game.players) p.consumeAll(); }
    if (O.Dev && O.Dev.isOpen) { if (!O.Dev.live) { O.Dev.update(rdt); return; } O.Dev.update(rdt); }
    if (st.t < st.lock) for (const p of game.players) p.consumeAll();
    if (def.menu && O.Idle) O.Idle.tick(rdt, name);
    if (def.update) def.update.call(w, dt, rdt);
  };
  w.draw = r => {
    if (def.draw) def.draw.call(w, r);
    r.overlay(g => { for (const f of O.overlays) try { f(r, g); } catch (e) { game.fail('overlay', e); } });
  };
  if (def.back) w.back = def.back;
  O.scenes[name] = w;
  return w;
};
O.go = (name, data, o) => game.go(name, data || {}, o || { fade: 'wipe', seconds: .25 });
O.sceneT = () => O.cur.t;

// ---------------------------------------------------------------------------------------------------------------
// registries: events, story beats, anything defined by kind
// ---------------------------------------------------------------------------------------------------------------
O.EVENTS = {};
O.EVENT_ORDER = ['sprint', 'skijump', 'swim', 'curling', 'javelin', 'downhill', 'archery', 'figure', 'weights', 'bobsled', 'diving', 'hockey'];
O.SUMMER = ['sprint', 'javelin', 'swim', 'diving', 'archery', 'weights'];
O.WINTER = ['skijump', 'downhill', 'bobsled', 'figure', 'curling', 'hockey'];
O.meet = null;
})();
