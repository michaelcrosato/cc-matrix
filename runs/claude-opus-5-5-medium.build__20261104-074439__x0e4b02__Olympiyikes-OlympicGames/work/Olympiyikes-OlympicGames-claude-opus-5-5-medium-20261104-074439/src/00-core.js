/* OLYMPIYIKES! — core: the namespace, keys, settings, the game object, streams, tuning, the scene wrapper. */
(() => {
'use strict';
const E = My3D2dge, O = window.OLY = {};
O.E = E;
O.TITLE = 'OLYMPIYIKES!';
O.TAGLINE = 'Faster. Higher. Yikes.';
O.VERSION = '1.0.0';
O.BUILD = { model: 'claude-opus-5-5', effort: 'medium', date: '2026-11-04 07:44:39', plan: 'PLAN.md' };
O.inHub = !!(window.AIHub && window.AIHub.active);

/* ---- the action map (§2.1): J/K/Space never in confirm/cancel sets that would skip screens mid-mash ---- */
const MOVE = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'] };
O.KEYS = Object.assign({}, MOVE, {
  mashL: ['KeyJ', 'Pad2', 'Pad4'],
  mashR: ['KeyK', 'Pad1', 'Pad5'],
  action: ['Space', 'Pad0'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad3'],
  alt: ['KeyL', 'Pad7', 'Pad6'],
  start: ['Enter', 'NumpadEnter', 'Pad9'],
  pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'],
  cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'],
  tabR: ['KeyE', 'Pad5'],
  more: ['KeyT', 'Pad3'],
  dev: ['Backquote']
});
/* aim events add the mouse: left = action, right = alt */
O.KEYS_MOUSE = Object.assign({}, O.KEYS, { action: ['Space', 'Pad0', 'Mouse0'], alt: ['KeyL', 'Pad7', 'Pad6', 'Mouse2'] });
O.KEYS_HOCKEY = Object.assign({}, O.KEYS, { action: ['Space', 'Pad0', 'Mouse0'], mashL: ['KeyJ', 'Pad2', 'Pad4', 'Mouse2'] });

/* ---- the game's settings (§2.5) ---- */
O.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: [['Easy', 'Easy'], ['Normal', 'Normal'], ['Hard', 'Hard']], value: 'Normal', help: 'CPU skill, timing windows and qualifying marks' },
  { key: 'promptStyle', label: 'Controller prompts', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', help: 'Button symbols shown for a controller', apply: (g, v) => { if (g.settings && g.settings.glyphs !== v && g.settings.spec('glyphs')) g.settings.set('glyphs', v); } },
  { key: 'mashAssist', label: 'Mash assist', options: [['off', 'Off'], ['one', 'One button'], ['hold', 'Hold']], value: 'off', help: 'One button: any mash button counts. Hold: hold either for a steady pace' },
  { key: 'timingAssist', label: 'Timing assist', value: false, help: 'All timing windows 40% wider' },
  { key: 'commentary', label: 'Commentary', options: [['voices', 'Voices + subtitles'], ['subs', 'Subtitles only'], ['off', 'Off']], value: 'voices' },
  { key: 'textSize', label: 'Text size', options: [['large', 'Large'], ['huge', 'Huge']], value: 'large' },
  { key: 'hints', label: 'Hints', value: true, help: 'Contextual tips during events' },
  { key: 'voices', label: 'Voices', type: 'slider', value: .8, group: 'Sound', apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
  { key: 'crowd', label: 'Crowd', type: 'slider', value: .7, group: 'Sound' }
];

const menuItems = O.inHub ? [] : [
  ['Restart event', () => O.restartEvent && O.restartEvent()],
  ['How to play', () => O.showEventHelp && O.showEventHelp()],
  ['Dev mode', () => O.Dev && O.Dev.open()]
];
const game = O.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'brawler', input: O.KEYS, id: 'olympiyikes', bg: '#0b0f24',
  menu: { items: menuItems, settings: O.SETTINGS, quit: O.inHub ? false : 'title',
    controls: { mashL: 'Left (mash, pass, tuck)', mashR: 'Right (mash, check, pike)', action: 'Action (jump, throw, release)', turbo: 'Yikes Turbo', alt: 'Hold (tuck, breathe, steady)',
      tabL: false, tabR: false, more: false, dev: false } }
});
if (game.settings.glyphs !== 'playstation' && game.settings.glyphs !== 'xbox') game.settings.set('glyphs', game.settings.promptStyle || 'playstation');
if (game.settings.promptStyle !== game.settings.glyphs && (game.settings.glyphs === 'xbox' || game.settings.glyphs === 'playstation')) game.settings.set('promptStyle', game.settings.glyphs);
game.audio.voiceVolume = game.settings.voices;

/* ---- helpers ---- */
const clamp = E.clamp;
O.clamp = clamp;
O.lerp = E.lerp;
O.hashStr = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
O.seed = (Date.now() % 1e9) | 0;
/** a labeled random stream in [0,1): AIHub.rng in a session, else seeded from the meet's seed */
O.rng = label => {
  if (O.inHub && window.AIHub && window.AIHub.rng && O.hubLive) return window.AIHub.rng(String(label));
  return E.rng(O.hashStr((O.meet ? O.meet.seed : O.seed) + '|' + label));
};
O.gauss = rnd => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
O.fmt = {
  time: v => v == null ? '—' : v.toFixed(2) + ' s',
  m: v => v == null ? '—' : v.toFixed(2) + ' m',
  pts: v => v == null ? '—' : v.toFixed(1),
  int: v => v == null ? '—' : String(Math.round(v)),
  kg: v => v == null ? '—' : v + ' kg',
  num: n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
};
O.textScale = () => game.settings.textSize === 'huge' ? 1.5 : 1;

/* ---- a tiny event bus ---- */
const subs = {};
O.bus = { on(k, f) { (subs[k] = subs[k] || []).push(f); return () => { subs[k] = subs[k].filter(x => x !== f); }; },
  emit(k, d) { for (const f of subs[k] || []) try { f(d); } catch (e) { game.fail('bus ' + k, e); } for (const f of subs['*'] || []) try { f(k, d); } catch (e) { game.fail('bus *', e); } } };

/* ---- storage (E.store), off in attract mode ---- */
O.store = {
  get(k, d) { try { return E.store.get('oly:' + k, d); } catch (e) { return d; } },
  set(k, v) { if (O.meet && O.meet.mode === 'attract') return; try { E.store.set('oly:' + k, v); } catch (e) { /* blocked storage: the visit keeps it */ } },
  del(k) { try { E.store.set('oly:' + k, null); } catch (e) { /* blocked */ } }
};

/* ---- the tuning registry (§5.13): the dev sliders' data ---- */
const TUNE = {}, DEFS = {};
O.tune = {
  def(group, key, spec) { (DEFS[group] = DEFS[group] || {})[key] = { v: spec[0], min: spec[1], max: spec[2], step: spec[3], label: spec[4] }; (TUNE[group] = TUNE[group] || {})[key] = spec[0]; },
  get(group) { return TUNE[group] || (TUNE[group] = {}); },
  defs(group) { return DEFS[group] || {}; },
  groups() { return Object.keys(DEFS); },
  set(group, key, v) { const d = DEFS[group] && DEFS[group][key]; if (!d) return; TUNE[group][key] = clamp(Math.round(v / d.step) * d.step, d.min, d.max); if (O.tune.keep) O.tune.save(); },
  reset(group) { for (const g of group ? [group] : Object.keys(DEFS)) for (const k in DEFS[g]) TUNE[g][k] = DEFS[g][k].v; if (O.tune.keep) O.tune.save(); },
  changed(group) { const out = []; for (const g of group ? [group] : Object.keys(DEFS)) for (const k in DEFS[g]) if (Math.abs(TUNE[g][k] - DEFS[g][k].v) > 1e-9) out.push([g, k]); return out; },
  json() { const o = {}; for (const [g, k] of O.tune.changed()) (o[g] = o[g] || {})[k] = TUNE[g][k]; return JSON.stringify(o); },
  keep: false,
  save() { O.store.set('tune', O.tune.keep ? JSON.parse(O.tune.json()) : null); },
  load() { const t = O.store.get('tune', null); if (t && typeof t === 'object') { O.tune.keep = true; for (const g in t) for (const k in t[g]) if (DEFS[g] && DEFS[g][k]) TUNE[g][k] = t[g][k]; } }
};
const G = O.G = O.tune.get('G');
[['cpuSkillScale', [1, .5, 1.3, .01, 'CPU skill scale']], ['cpuOffsetEasy', [-.12, -.4, .2, .01, 'CPU offset Easy']], ['cpuOffsetNormal', [0, -.4, .3, .01, 'CPU offset Normal']],
 ['cpuOffsetHard', [.06, -.3, .4, .01, 'CPU offset Hard']], ['windowScale', [1, .5, 2, .05, 'Timing window scale']], ['hypeGain', [1, 0, 3, .05, 'Hype gain']],
 ['hypeDecay', [.02, 0, .2, .005, 'Hype decay /s']], ['turboTime', [3, 1, 8, .1, 'Turbo time (s)']], ['turboPower', [1, 0, 2, .05, 'Turbo power']],
 ['mashRateMin', [2, 0, 6, .1, 'Mash rate min (Hz)']], ['mashRateMax', [10.5, 6, 16, .1, 'Mash rate max (Hz)']], ['mashHoldRate', [.72, .3, 1, .01, 'Mash hold pace']],
 ['yikesHype', [.15, 0, .6, .01, 'Sympathy hype']], ['slowmoScale', [.3, .1, 1, .05, 'Slow-mo scale']], ['qualifyScale', [1, .8, 1.2, .01, 'Qualifying scale']],
 ['gameSpeed', [1, .25, 3, .05, 'Game speed']]].forEach(([k, s]) => O.tune.def('G', k, s));

/** the CPU's effective skill (§5.6) */
O.effSkill = (base, rival) => {
  const d = (O.meet && O.meet.difficulty) || game.settings.difficulty || 'Normal';
  const off = d === 'Easy' ? G.cpuOffsetEasy : d === 'Hard' ? G.cpuOffsetHard : G.cpuOffsetNormal;
  return clamp(base * G.cpuSkillScale + off + (rival ? .03 : 0), .05, .99);
};
/** timing window multiplier: difficulty × timing assist × the global slider */
O.winScale = () => {
  const d = (O.meet && O.meet.difficulty) || game.settings.difficulty || 'Normal';
  return (d === 'Easy' ? 1.25 : d === 'Hard' ? .85 : 1) * (game.settings.timingAssist ? 1.4 : 1) * G.windowScale;
};

/* ---- scenes: O.scene(name, def) registers a wrapped engine scene (§4.5) ---- */
O.SCENES = {};
O.scene = (name, def) => {
  const sc = {
    pausable: !!def.pausable, view: def.view || 'brawler', input: def.input || O.KEYS, touch: [], camera: def.camera || false, res: 'ps1', expand: true,
    enter(data) {
      O.sceneT = 0; O.lockT = def.lock === undefined ? .35 : def.lock;
      for (const p of game.players) p.consumeAll();
      game.lights.enabled = false; game.timeScale = 1; game.cam.frame && game.cam.frame(null); game.follow(null); game.cam.bounds = null; game.resetCamera && game.resetCamera();
      game.weather = null;
      if (def.enter) def.enter(data || {});
    },
    exit() { if (def.exit) def.exit(); },
    update(dt) {
      O.sceneT += dt; if (O.lockT > 0) { O.lockT -= dt; if (O.lockT > 0) for (const p of game.players) p.consumeAll(); }
      if (O.hubFrozen) { for (const p of game.players) p.consumeAll(); }
      if (O.Dev && O.Dev.isOpen) { O.Dev.update(dt); if (!O.Dev.isOpen) return; for (const p of game.players) p.consumeAll(); if (!O.Dev.live && game.timeScale === 0) return; }
      if (def.menu) O.Idle && O.Idle.tick(dt, name);
      if (def.update) def.update(dt);
      O.Overlays && O.Overlays.update(dt);
    },
    draw(r) {
      if (def.draw) def.draw(r);
      r.overlay(g => { O.Overlays && O.Overlays.draw(g, r); if (O.Dev && O.Dev.isOpen) O.Dev.draw(g, r); });
    },
    back() { if (O.Dev && O.Dev.isOpen) { O.Dev.close(); return true; } return def.back ? def.back() : false; }
  };
  sc.def = def;
  O.SCENES[name] = sc;
  return sc;
};
/** go to a scene with the plan's transitions */
O.go = (name, data, fade) => { game.go(name, data, { fade: fade === undefined ? 'wipe' : fade, seconds: .3 }); };

/* ---- palettes ---- */
O.PAL = { navy: '#0c1028', navy2: '#18204a', gold: '#f2b632', gold2: '#ffd86a', white: '#f4f6ff', grey: '#9aa2c8', red: '#e8443a', summer: '#ff6b4a', winter: '#3fa8e8', green: '#4fe0a8', ink: '#05060f' };
O.MEDAL = { 1: '#f2c94c', 2: '#d6dbe6', 3: '#d08a4a' };
})();
