// AMERICAN FOOTBALL FIASCO — boot: the game object, the input map, the game's settings, random streams and the event bus.
// Core loop: call a play from big cards, snap, then run, pass, juke and hit your way down the field in a 5-10 second
// burst of chaos, cheer the replay, and do it again before the clock runs out.
(() => {
'use strict';
const E = My3D2dge;
if (E.build === 'dev-build') E.build = '4390a98 2026-11-03';   // (the handoff is unstamped: label it with the engine commit it came from, plus this game's changes in ENGINE-CHANGES.md)
const hub = typeof window !== 'undefined' && window.AIHub && window.AIHub.active ? window.AIHub : null;
const FF = window.FF = { E, data: {}, version: '1.0.0', inHub: !!hub, net: null };

/* ---- THE INPUT MAP: the order matters, a shared-keyboard half takes b1..b4, turbo, lb in turn ---- */
const D = E.Input.DEFAULT;
FF.KEYS = {
  up: D.up.slice(), down: D.down.slice(), left: D.left.slice(), right: D.right.slice(),
  b1: ['Space', 'KeyK', 'Pad0'],            // ✕ / A   hike, dive, tackle, kick meter, pick
  b2: ['KeyL', 'Pad1'],                     // ○ / B   stiff arm, switch player, back
  b3: ['KeyJ', 'Pad2'],                     // □ / X   spin, strip, flip play
  b4: ['KeyI', 'Pad3'],                     // △ / Y   hurdle, jump, catch, Fiasco Card
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7'],   // R2 / RT
  lb: ['KeyQ', 'Pad4'],                     // L1 / LB lateral, previous tab
  rb: ['KeyE', 'Pad5'],                     // R1 / RB lateral, next tab
  r1: ['Digit1'], r2: ['Digit2'], r3: ['Digit3'], r4: ['Digit4'],   // keyboard: throw to receiver 1-4
  view: ['KeyV'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
FF.CONTROL_NAMES = { b1: 'Hike · Dive · Tackle · Kick', b2: 'Stiff arm · Switch player', b3: 'Spin · Strip · Flip play', b4: 'Hurdle · Jump · Catch · Card',
  turbo: 'Turbo', lb: 'Lateral · Tab left', rb: 'Lateral · Tab right', r1: 'Throw to receiver 1', r2: 'Throw to receiver 2', r3: 'Throw to receiver 3', r4: 'Throw to receiver 4', view: 'Camera view' };

/* ---- THE GAME'S SETTINGS (group Game): applied live ---- */
FF.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['fiasco', 'Fiasco']], value: 'pro', help: 'How sharp the CPU teams play' },
  { key: 'quarter', label: 'Quarter length', options: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00'], [300, '5:00']], value: 120, help: 'Exhibition games' },
  { key: 'camera', label: 'Camera', options: [['broadcast', 'Broadcast'], ['sky', 'Sky Cam'], ['blimp', 'Blimp']], value: 'broadcast', help: 'V cycles it in play' },
  { key: 'replays', label: 'Replays', options: [['all', 'All big plays'], ['td', 'Touchdowns only'], ['off', 'Off']], value: 'all' },
  { key: 'commentary', label: 'Commentary', options: [['on', 'On'], ['subs', 'Subtitles only'], ['off', 'Off']], value: 'on', help: 'Chet and Lou in the booth' },
  { key: 'voices', label: 'Voices', type: 'slider', value: .8, help: 'The gibberish voices', apply: (g, v) => g.audio.busVol('voices', v) },
  { key: 'crowd', label: 'Crowd', type: 'slider', value: .7, apply: (g, v) => g.audio.busVol('crowd', v) },
  { key: 'autoSwitch', label: 'Auto-switch on defense', value: true, help: 'Take the defender nearest the ball when a pass is in the air' },
  { key: 'showRoutes', label: 'Show routes', value: true, help: 'Your receivers\' routes while you hold the ball behind the line' },
  { key: 'targetMarker', label: 'Pass target marker', value: true },
  { key: 'lateHits', label: 'Late hits', value: true, help: 'After the whistle. Fiasco rules allow them' },
  { key: 'bigHeads', label: 'Big Heads', value: false, help: 'Unlocked by winning the Fiasco Cup' }
];

/* ---- RANDOM STREAMS: the sim's (seeded per match) and the cosmetic one ---- */
FF.rng = { sim: E.rng(1), fx: E.rng(99), seed(s) { FF.rng.sim = E.rng(s >>> 0 || 1); } };
FF.r = () => FF.rng.sim();
FF.rf = () => FF.rng.fx();

/* ---- THE BUS: events (on / emit) and modifiers (mod: listeners multiply or add) ---- */
FF.bus = {
  _on: {}, _mods: {}, log: [],
  on(ev, fn) { (this._on[ev] = this._on[ev] || []).push(fn); return () => { const l = this._on[ev]; const i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); }; },
  emit(ev, data = {}) {
    data.ev = ev; this.log.push(data); if (this.log.length > 40) this.log.shift();
    for (const fn of (this._on[ev] || []).slice()) { try { fn(data); } catch (e) { FF.game.fail('bus ' + ev, e); } }
    for (const fn of (this._on['*'] || []).slice()) { try { fn(data); } catch (e) { FF.game.fail('bus *', e); } }
  },
  /** a modifier: each listener { add, mul, test(ctx) } registered for a name; plays: how many plays it lasts (or null: until removed) */
  addMod(name, m) { (this._mods[name] = this._mods[name] || []).push(m); return m; },
  removeMod(m) { for (const k in this._mods) { const i = this._mods[k].indexOf(m); if (i >= 0) this._mods[k].splice(i, 1); } },
  mod(name, value, ctx) {
    const l = this._mods[name]; if (!l) return value;
    let v = value; for (const m of l) { if (m.test && !m.test(ctx)) continue; if (m.mul !== undefined) v *= typeof m.mul === 'function' ? m.mul(ctx) : m.mul; if (m.add !== undefined) v += typeof m.add === 'function' ? m.add(ctx) : m.add; if (m.set !== undefined) v = typeof m.set === 'function' ? m.set(ctx) : m.set; }
    return v;
  },
  /** one play has finished: modifiers counting plays tick down */
  tickPlays() { for (const k in this._mods) this._mods[k] = this._mods[k].filter(m => m.plays === undefined || m.plays === null || --m.plays > 0); },
  clearMods(tag) { for (const k in this._mods) this._mods[k] = this._mods[k].filter(m => tag ? m.tag !== tag : !!m.keep); }
};

/* ---- THE GAME ---- */
const menuItems = () => {
  if (FF.inHub) return [];
  const sc = FF.game && FF.game.sceneName, out = [['Dev Mode', () => FF.dev && FF.dev.open()]];
  if ((sc === 'match' && FF.match && FF.match.mode === 'exhibition') || sc === 'drill') out.push(['Restart', () => { FF.game.shell.hide(); FF.restart && FF.restart(); }]);
  return out;
};
const game = FF.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#0a0a14', id: 'american-football-fiasco',
  autoPause: !hub, input: FF.KEYS,
  menu: { items: menuItems, settings: FF.SETTINGS, controls: FF.CONTROL_NAMES, quit: hub ? false : 'menu', saves: { version: 1 } }
});
FF.headless = !!game.headless;
FF.I = game.input;
E.style.propSize = 1.4;
// the setting applies its volume once sound starts too
game.audio.busVolume = { voices: game.settings.voices, crowd: game.settings.crowd };

/* hub detection, for the other modules */
FF.hub = hub;
})();
