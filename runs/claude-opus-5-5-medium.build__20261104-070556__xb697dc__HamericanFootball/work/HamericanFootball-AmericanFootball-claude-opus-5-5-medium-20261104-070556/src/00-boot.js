/* HAMERICAN FOOTBALL — boot.
 * Core loop: call a play from big cards, snap, then run, pass, juke and hit your way down the field in a 5–10 second
 * burst of chaos, cheer the replay, and do it again before the clock runs out.
 * This file makes the namespace (window.FF), the game, the input map, the settings, the random streams and the event bus.
 * Every other file is an IIFE that reads what earlier files defined; 90-main.js starts the game. */
(() => {
'use strict';
const E = My3D2dge;
const W = typeof window !== 'undefined' ? window : globalThis;
const FF = W.FF = { E, data: {}, version: '1.0.0', fast: false, headless: typeof document === 'undefined' };
FF.inHub = !!(W.AIHub && W.AIHub.active);
// the field in world units (16 = 1 yard): end lines, goal lines, sidelines, the middle, the hashes
FF.FIELD = { END_L: 64, GOAL_L: 224, GOAL_R: 1824, END_R: 1984, SIDE_T: 192, SIDE_B: 1040, MID_Y: 616, HASH: 48 };

// the views: a sideline broadcast camera (the default), a higher sky cam, the blimp, a kick cam behind the kicker and
// replay angles. They live in E.VIEWS so game.setView('broadcast') works.
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 50, 1, 1);
E.VIEWS.sky = new E.View('sky', 'Sky Cam', 0, 65, 1, 1);
E.VIEWS.blimp = new E.View('blimp', 'Blimp', 0, 80, 1, 1);
E.VIEWS.kickR = new E.View('kickR', 'Kick Cam', 90, 32, 1, 1);    // looking east (+x): the kick goes up the screen
E.VIEWS.kickL = new E.View('kickL', 'Kick Cam', -90, 32, 1, 1);   // looking west
E.VIEWS.field = new E.View('field', 'Field Level', 0, 25, 1.15, 1);
E.VIEWS.reverse = new E.View('reverse', 'Reverse Angle', 180, 45, 1, 1);
E.VIEWS.isoR = new E.View('isoR', 'Isometric', 45, 30, 1, 1);

/* ---- the input map: b1-b4 are the face buttons (✕ ○ □ △ / A B X Y), turbo R2, laterals L1/R1. Keyboard: Space K L J I,
 * Shift for turbo, Q and E for laterals, 1-3 throw to a receiver. confirm/cancel are menu keys only (never J or K). ---- */
const D = E.Input.DEFAULT;
FF.KEYS = {
  up: D.up, down: D.down, left: D.left, right: D.right,
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'Space', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  b1: ['Space', 'KeyK', 'Pad0'], b2: ['KeyL', 'Pad1'], b3: ['KeyJ', 'Pad2'], b4: ['KeyI', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7'], lb: ['KeyQ', 'Pad4'], rb: ['KeyE', 'Pad5'],
  r1: ['Digit1'], r2: ['Digit2'], r3: ['Digit3'], view: ['KeyV']
};
FF.CONTROL_NAMES = { b1: 'Hike · Dive · Tackle · Kick', b2: 'Stiff arm · Switch player', b3: 'Spin · Strip · Flip play', b4: 'Hurdle · Jump · Card',
  turbo: 'Turbo · Rocket pass · Big Hit', lb: 'Lateral · Tab left', rb: 'Lateral · Tab right', r1: 'Throw to receiver 1', r2: 'Throw to receiver 2', r3: 'Throw to receiver 3', view: 'Camera view',
  up: 'Up', down: 'Down', left: 'Left', right: 'Right', start: 'Start', pause: 'Pause', confirm: 'Menu select', cancel: 'Menu back' };

/* ---- the game's own settings (group Game) ---- */
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['fiasco', 'Fiasco']], value: 'pro', help: 'How sharp the CPU plays' },
  { key: 'quarterLen', label: 'Quarter length', options: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00'], [300, '5:00']], value: 120, help: 'Exhibition games' },
  { key: 'camera', label: 'Camera', options: [['broadcast', 'Broadcast'], ['sky', 'Sky Cam'], ['blimp', 'Blimp']], value: 'broadcast' },
  { key: 'replays', label: 'Replays', options: [['all', 'All big plays'], ['td', 'Touchdowns only'], ['off', 'Off']], value: 'all' },
  { key: 'commentary', label: 'Commentary', options: [['on', 'On'], ['subs', 'Subtitles only'], ['off', 'Off']], value: 'on' },
  { key: 'voices', label: 'Voices', type: 'slider', value: .8, apply: (g, v) => { if (g.audio.bus) g.audio.bus('voices', v); } },
  { key: 'crowdVol', label: 'Crowd', type: 'slider', value: .7, apply: (g, v) => { if (g.audio.bus) g.audio.bus('crowd', v); } },
  { key: 'autoSwitch', label: 'Auto-switch on defense', value: true },
  { key: 'showRoutes', label: 'Show routes', value: true, help: 'Your receivers\' routes while you are the QB' },
  { key: 'targetMarker', label: 'Pass target marker', value: true },
  { key: 'lateHits', label: 'Late hits', value: true },
  { key: 'bigHeads', label: 'Big Heads', value: false, help: 'Unlocked by winning the Fiasco Cup (or in Dev mode)' }
];

// menu items in the pause menu depend on the scene: Dev Mode everywhere but sessions; Restart in exhibition and practice
const pauseItems = () => {
  if (FF.inHub) return [];
  const s = FF.game && FF.game.sceneName, out = [['Dev Mode', () => FF.dev && FF.dev.open()]];
  if (s === 'match' && FF.match && FF.match.canRestart()) out.push(['Restart', () => { FF.game.resume(); FF.match.restart(); }]);
  if (s === 'drill') out.push(['Restart drill', () => { FF.game.resume(); FF.drills.restart(); }]);
  return out;
};

const game = FF.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', bg: '#07060d', autoPause: !FF.inHub, input: FF.KEYS,
  menu: { items: pauseItems, settings: SETTINGS, controls: FF.CONTROL_NAMES, quit: FF.inHub ? false : 'menu', saves: { version: 1 } }
});
FF.E = E;

/* ---- random streams: gameplay (seeded, deterministic) and cosmetic ---- */
FF.rng = { sim: E.rng(1), fx: E.rng(7), seed(n) { this.sim = E.rng(n >>> 0 || 1); this.fx = E.rng((n * 31 + 7) >>> 0 || 7); } };
FF.r = () => FF.rng.sim();           // gameplay random 0..1
FF.rf = () => FF.rng.fx();           // cosmetic random 0..1
FF.gauss = (rf = FF.r) => { const u = Math.max(1e-9, rf()), v = rf(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); };

/* ---- the event bus: events (commentary, crowd, fx, stats, cards listen) and modifiers (cards, hot streak, cheats) ---- */
FF.bus = (() => {
  const on = {}, mods = {}, log = [];
  return {
    log,
    on(name, fn) { (on[name] || (on[name] = [])).push(fn); return () => { on[name] = on[name].filter(f => f !== fn); }; },
    emit(name, d = {}) {
      d.ev = name; log.push({ t: FF.sim ? Math.round(FF.sim.time * 100) / 100 : 0, ev: name }); if (log.length > 40) log.shift();
      for (const f of (on[name] || []).slice()) { try { f(d); } catch (e) { game.fail('event ' + name, e); } }
      for (const f of (on['*'] || []).slice()) { try { f(d); } catch (e) { game.fail('event *', e); } }
      return d;
    },
    // a modifier: listeners return a multiplier (kind 'mul') or an addend ('add'); expired ones are removed by owner
    addMod(name, fn, o = {}) { const m = { fn, owner: o.owner || null, plays: o.plays === undefined ? Infinity : o.plays, kind: o.kind || 'add', tag: o.tag || '' }; (mods[name] || (mods[name] = [])).push(m); return m; },
    mod(name, value, ctx) { for (const m of mods[name] || []) { const r = m.fn(ctx); if (r === undefined || r === null) continue; value = m.kind === 'mul' ? value * r : value + r; } return value; },
    endPlay() { for (const k in mods) { for (const m of mods[k]) m.plays--; mods[k] = mods[k].filter(m => m.plays > 0); } },
    clearMods(tag) { for (const k in mods) mods[k] = tag ? mods[k].filter(m => m.tag !== tag) : []; },
    mods
  };
})();

/* ---- small helpers used everywhere ---- */
FF.yd = n => n * 16;
FF.clamp = E.clamp;
const MEM = {};   // (storage can be blocked, or absent headless: the values last for the visit)
FF.store = {
  get: (k, d) => { if (FF.noSave) return d; const v = E.store.get('ff:' + k, undefined); return v !== undefined && v !== null ? v : MEM[k] !== undefined ? MEM[k] : d; },
  set: (k, v) => { if (FF.noSave || FF.inHub) return; MEM[k] = v; E.store.set('ff:' + k, v); }
};
})();
