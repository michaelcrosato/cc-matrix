/* OutBloom — main: the game's settings (beside the engine's standard ones), the 10-foot theme for the standard
 * screens, the help screen, the boot steps, the scene registry, deep links (#race, #race/S8, #menu, #tour ...), the
 * debug handle (game.debug) and the start. In an AI Hub session it boots straight into the round. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, game = OB.game;
/* ---- settings: group Game; Voices under Sound ---- */
const S = game.settings;
const defs = [
  { key: 'transmission', label: 'Transmission', options: [['auto', 'Automatic'], ['manual', 'Manual']], value: 'auto', help: 'Manual: shift up and down yourself (a down-up shift starts a drift)' },
  { key: 'driftInput', label: 'Drift input', options: [['all', 'All'], ['tap', 'Brake tap'], ['button', 'Drift button']], value: 'all', help: 'Which inputs start a drift' },
  { key: 'assist', label: 'Steering assist', options: [['off', 'Off'], ['low', 'Low'], ['high', 'High']], value: 'low', help: 'Nudges you back onto the road; High also brakes before bends you can\'t make' },
  { key: 'difficulty', label: 'Difficulty', options: [['Easy', 'Easy'], ['Normal', 'Normal'], ['Hard', 'Hard']], value: 'Normal', help: 'The clock and the traffic' },
  { key: 'units', label: 'Speed units', options: [['kmh', 'km/h'], ['mph', 'mph']], value: 'kmh' },
  { key: 'camera', label: 'Camera', options: [['chase', 'Chase'], ['high', 'High'], ['bumper', 'Bumper']], value: 'chase' },
  { key: 'chatter', label: 'Passenger chatter', options: [['full', 'Full'], ['less', 'Less'], ['off', 'Off']], value: 'full', help: 'How often your passenger talks (requests always)' },
  { key: 'hudSize', label: 'HUD size', options: [['large', 'Large'], ['xl', 'Extra large']], value: 'large' },
  { key: 'hints', label: 'Hints', type: 'toggle', value: true }
];
for (const d of defs) { try { S.define(Object.assign({ group: 'Game', type: d.type || 'select' }, d)); } catch (e) { game.fail('setting ' + d.key, e); } }
try { S.define({ key: 'voices', label: 'Voices', group: 'Sound', type: 'slider', value: 1, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } }); } catch (e) { game.fail('setting voices', e); }
/* ---- the standard screens, themed for a TV at ten feet, and the help screen ---- */
if (!OB.env.headless || true) {
  try {
    OB.shell = new E.Shell(game, { theme: { ink: '#fff6e8', paper: 'rgba(30,12,52,.92)', accent: '#ffcf4a', muted: '#d8c0e8', danger: '#ff6a7a', line: 'rgba(255,214,160,.35)', font: '"Trebuchet MS", system-ui, sans-serif', titleFont: '"Trebuchet MS", system-ui, sans-serif', tv: '1' },
      screens: { help: { title: 'How to play', keys: [['Steer', 'A / D, ← →, left stick'], ['Gas', 'W, ↑, R2, ✕'], ['Brake', 'S, ↓, L2, □'], ['Drift', 'Space, ○ (or tap the brake while steering)'], ['Shift (manual)', 'E / Q, R1 / L1'], ['Horn', 'H, △'], ['Camera', 'C, d-pad ↓'], ['Radio', 'R, d-pad ↑'], ['Pause', 'Esc, P, Options']],
        sections: [['The clock', 'The daylight clock counts down. Every checkpoint gives time back. Reach a goal before the sun sets.'], ['Forks', 'At each fork, the side of the road you are on picks the next stage. Left is gentler, right is harder.'],
          ['Style', 'Drifts, near misses, slingshots and overtakes build the Bloom chain: up to Full Bloom, a ×5 score.'], ['Love in Bloom', 'Your passenger asks for things on the way. Please her for petals; the petals give the grade and the ending.']] } } });
  } catch (e) { game.fail('shell', e); }
}
/* ---- the debug handle: tests, tools and Dev Mode read it ---- */
game.debug = {
  snapshot() {
    const r = OB.Race.current, base = { scene: game.sceneName, ui: { screen: OB.UI.screenName, focus: OB.UI.focusId || null }, lastDevice: game.input.lastDevice, glyphs: game.settings.glyphs, errors: game.errors.length, attract: OB.Attract ? OB.Attract.phase : null, hub: OB.Hub ? OB.Hub.info() : { active: false }, seeds: OB.Profile ? OB.Profile.data.seeds : 0 };
    if (r && (game.sceneName === 'race' || game.sceneName === 'attract')) Object.assign(base, r.snapshot(), { scene: game.sceneName, request: r.req ? r.req.state() : null, petals: r.p1.petals, grade: r.req ? r.req.grade() : null });
    return base;
  },
  events: n => OB.bus.last(n || 20),
  teleport(stage, pct = 0, x = 0) { const r = OB.Race.current; if (!r) return; const d = r.p1, road = OB.World.stage(stage); r.place(d, stage, Math.floor(road.stageLen * pct) * OB.SEG + 4 * OB.SEG, x); d.routeIdx = Math.max(d.routeIdx, OB.STAGES[stage].row - 1); r.traffic.ensure(stage, d.car.z + 46000); },
  tune: (k, v) => OB.setTune(k, v), resetTuning: k => OB.resetTuning(k),
  cheat: (k, on = true) => { OB.cheats[k] = !!on; },
  go: (scene, data) => game.go(scene, data, { fade: 0 }),
  bot(on, params) { const r = OB.Race.current; if (!r) return; r.p1.brain = on ? new OB.Brain(Object.assign({ targets: true }, params || {})) : null; if (!on) r.p1.input = game.input; },
  ui: { press: a => game.input.tap(a), click: (x, y) => { game.input.feed('move', x, y); game.input.feed('down', x, y); game.input.feed('up', x, y); } }
};
game.stateHash = () => OB.Race.current ? OB.Race.current.stateHash() : [];
/* ---- boot: the steps behind the boot screen, then the title (or the hub's round, or a deep link) ---- */
const steps = [
  ['Watering the island', () => { for (const id of Object.keys(OB.STAGES)) OB.World.stage(id); }],
  ['Polishing the chrome', () => { if (!OB.env.headless) { const b = OB.Art.car('orchidea', OB.CARS.orchidea.paints[0]); b.frame(0); b.frame(0, true); } }],
  ['Tuning the radio', () => { if (OB.Audio) OB.Audio.boot(); }],
  ['Opening the postcard book', () => { if (OB.Profile) OB.Profile.load(); }],
  ['Teaching the passengers to talk', () => { if (OB.Babble) OB.Babble.plan('Coast to coast!', 'marisol', 'happy'); }]
];
const hash = (typeof location !== 'undefined' && location.hash || '').slice(1), [first, part] = hash.split('/');
let start = 'title', data;
if (OB.env.hub) start = 'hubcard';
else if (first === 'race') { start = 'race'; data = part ? { mode: 'arcade', route: { stages: [part], sprint: true }, noIntro: true, passenger: 'marisol' } : { mode: 'arcade', passenger: 'marisol' }; if (part === 'fork') data = { mode: 'arcade', passenger: 'vivi', zStart: 900, noIntro: true }; }
else if (first && OB.SCENES[first]) { start = first; data = part ? { part } : undefined; }
OB.start = () => {
  const scenes = OB.SCENES;
  game.start({ scenes, scene: start, data, boot: { title: OB.TITLE, version: OB.VERSION, steps, accent: '#ffcf4a', messages: ['Planting the sunflowers', 'Inflating the heart balloons', 'Waking the gnomes', 'Ironing Vivi\'s scarf', 'Charging Juni\'s camera', 'Waxing Bruno\'s moustache'] } });
};
OB.start();
})();
