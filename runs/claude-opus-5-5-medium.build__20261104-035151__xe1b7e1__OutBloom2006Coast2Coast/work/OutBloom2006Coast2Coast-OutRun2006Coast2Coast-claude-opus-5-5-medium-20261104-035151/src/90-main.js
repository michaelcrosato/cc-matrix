/* Main: the game, its settings (PLAN §7.20), the pause menu (Restart, Retire, Dev Mode; only Resume, Settings and
 * Controls in a hub session), the 10-foot theme for the engine's screens, boot steps, the scene registry, deep
 * links, game.debug and game.stateHash, and the start: the title, or the hub's card in a session. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, S = OB.SCENES;
const hub = OB.env.hub;
const sel = (key, label, opts, value, help, group = 'Game') => ({ key, label, group, type: 'select', options: opts, value, help });
const SETTINGS = [
  sel('transmission', 'Transmission', [['auto', 'Automatic'], ['manual', 'Manual']], 'auto', 'Manual: shift with R1/L1 or E/Q'),
  sel('driftInput', 'Drift input', [['all', 'All'], ['tap', 'Brake tap'], ['button', 'Drift button']], 'all', 'Which inputs start a drift'),
  sel('assist', 'Steering assist', [['off', 'Off'], ['low', 'Low'], ['high', 'High']], 'low', 'Nudges you back onto the road'),
  sel('difficulty', 'Difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], 'normal', 'Daylight on the clock and traffic'),
  sel('units', 'Speed units', [['kmh', 'km/h'], ['mph', 'mph']], 'kmh'),
  sel('camera', 'Camera', [['chase', 'Chase'], ['high', 'High'], ['bumper', 'Bumper']], 'chase', 'The camera a race starts with (change it in a race with the camera button)'),
  sel('chatter', 'Passenger chatter', [['full', 'Full'], ['less', 'Less'], ['off', 'Off']], 'full', 'How often she talks (requests always show)'),
  sel('hudSize', 'HUD size', [['large', 'Large'], ['xl', 'Extra large']], 'large'),
  { key: 'hints', label: 'Hints', group: 'Game', type: 'toggle', value: true },
  { key: 'bloom', label: 'Bloom lighting', group: 'Game', type: 'toggle', value: true, help: 'The glow of the sun, the sea and the neon' },
  { key: 'mirror', label: 'Mirror Roads', group: 'Game', type: 'toggle', value: false, help: 'Every road flipped (plant it in the Garage Garden first)' },
  { key: 'voices', label: 'Voices', group: 'Sound', type: 'slider', value: .8 }
];
const CSS = `.esh{font-size:clamp(15px,1.5vw,24px)}.esh h2{font-size:clamp(26px,2.8vw,44px)}.esh button{font-size:clamp(14px,1.35vw,22px);min-height:clamp(44px,4.4vw,64px)}.esh-k{font-size:clamp(12px,1.05vw,17px)}.esh-m,.esh-row small{font-size:clamp(13px,1.15vw,19px)}.esh-pan{max-width:900px}.esh button:focus-visible{outline-width:4px}.esh kbd{font-size:clamp(12px,1.1vw,18px)}`;
const HELP = { help: { kicker: 'How to play', title: 'OutBloom 2006: Coast 2 Coast',
  keys: [['W / ↑ / R2', 'Gas'], ['S / ↓ / L2', 'Brake'], ['A D / ← → / stick', 'Steer'], ['Space / ○', 'Drift (or tap the brake while steering)'], ['E Q / R1 L1', 'Shift (manual)'], ['H / △', 'Horn'], ['C / d-pad ↓', 'Camera'], ['R / d-pad ↑', 'Radio'], ['Esc / Options', 'Pause']],
  sections: [['The clock', 'Daylight runs down; every checkpoint gives some back. Reach a goal before sunset.'], ['Forks', 'At the end of each stage, steer left or right. Left roads are gentler.'], ['Style', 'Drifts, near misses and slingshots grow the Bloom chain: five flowers multiply every point.'], ['Love in Bloom', 'Do what she asks on the road. Petals decide your grade and the ending.']] } };

const game = OB.game = new E.Game({
  canvas: 'screen', res: [480, 270], expand: true, view: 'side', input: OB.INPUT, id: 'outbloom2006', bg: '#140a28', fullscreen: hub ? false : 'tap',
  menu: {
    items: () => {
      if (hub || game.sceneName !== 'race') return [];
      const cfg = S.race.cfg || {};
      return [['Restart', () => { game.resume(); game.go('race', Object.assign({}, cfg), { fade: 'wipe' }); }], ['Retire', () => { game.resume(); game.go(cfg.mission || cfg.mode === 'mission' ? 'tour' : 'menu', {}, { fade: 'wipe' }); }], ['Dev Mode', () => OB.Dev.open()]];
    },
    settings: SETTINGS, controls: OB.ACTION_NAMES, quit: hub ? false : 'title'
  },
  shellTheme: { accent: '#ffcf4a', ink: '#fff4e0', paper: 'rgba(42,20,80,.94)', muted: '#c8b8e0', line: '#ffd6a0' }, shellCss: CSS, shellScreens: HELP
});
game.input.touchEnabled = false;
game.input.names = Object.assign({}, game.input.names || {}, OB.ACTION_NAMES);
OB.Sound.init();
OB.Dev.init();
OB.Profile.load();
try { OB.arcade = new E.Arcade(game, { id: 'outbloom', hud: false, idle: 1e9, credits: null }); } catch (e) { OB.arcade = null; }
// every scene's step also runs the UI's idle clock and the cast's breathing
for (const k in S) { const sc = S[k], u = sc.update; sc.update = function (dt) { OB.UI.tick(dt); return u.call(this, dt); }; }
// the hub's step inside races; a frozen sim once the round is over
const ru = S.race.update;
S.race.update = function (dt) { if (OB.Hub && OB.Hub.ended) return; if (OB.race && OB.race.mode === 'hub' && OB.Hub) OB.Hub.step(dt, OB.race); return ru.call(this, dt); };
// F9 while paused opens Dev Mode
if (typeof addEventListener !== 'undefined') addEventListener('keydown', e => { if (e.code === 'F9' && game.paused && game.sceneName === 'race' && !hub) { e.preventDefault(); OB.Dev.open(); } });
// the round is over: a plain card over the frozen game
const rd = S.race.draw;
S.race.draw = function (r) { rd.call(this, r); if (OB.Hub && OB.Hub.roundOver && !r.viewport) r.overlay(g => { E.px.blend(g, .6, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#140a28')); OB.T(g, 'ROUND OVER', r.W / 2, r.H / 2 - 10, '#ffffff', { align: 'center', scale: 3 }); }); };

/* ---- game.debug: the tests' and tools' handle ---- */
game.debug = {
  snapshot() {
    const r = game.sceneName === 'race' || game.sceneName === 'attract' ? OB.race : null, sc = game.scene;
    return Object.assign({ scene: game.sceneName, lastDevice: game.input.lastDevice, glyphs: game.settings.glyphs, errors: game.errors.length, idle: +OB.UI.idle.toFixed(2), attract: game.sceneName === 'attract' ? S.attract.phase : null, dev: OB.Dev.active, seeds: OB.Profile.p.seeds,
      ui: { focus: sc && sc.scr && sc.scr.cur ? sc.scr.cur.id : null, items: sc && sc.scr ? sc.scr.items.filter(i => !i.nofocus && !i.disabled).length : 0 }, hub: { active: hub, ended: !!(OB.Hub && OB.Hub.ended), started: !!(OB.Hub && OB.Hub.started) }, touchOnly: OB.Touch.only() }, r ? { race: r.snapshot() } : {});
  },
  events: n => OB.bus.log(n),
  teleport(stage, pct, x = 0) { const r = OB.race; if (!r) return false; const Sx = OB.World.get(stage); r.teleport(r.p1, stage, Math.floor(pct * Sx.len) * OB.SEG, 200, x); return true; },
  tune(k, v) { OB.tuning[k] = v; }, resetTuning: () => OB.resetTuning(),
  cheat(n, on = true) { OB.cheats[n] = on; },
  go(scene, data) { game.go(scene, data, { fade: 0 }); },
  bot(on, params) { const r = OB.race; if (!r) return; r.p1.bot = on ? new OB.Brain(params || {}) : null; }
};
game.stateHash = () => OB.race ? OB.race.hash() : game.sceneName;

/* ---- the start ---- */
const steps = [['Planting the flowers', () => { for (const id in OB.STAGES) OB.World.get(id); }], ['Tuning the radio', () => { OB.Radio.i = OB.Profile.p.last.station || 0; }]];
const hash = typeof location !== 'undefined' ? (location.hash || '').slice(1) : '';
let first = hub ? 'boot' : (S[hash] && !['race', 'ending', 'results', 'debrief', 'finale', 'hubcard', 'attract'].includes(hash) ? hash : 'title');
if (hash === 'race' || hash.startsWith('race/')) { first = 'race'; }
S.boot = { view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [], enter() { this.t = 0; }, update(dt) { this.t += dt; }, draw(r) { r.sky(['#2a1450', '#7a3a7a', '#ff9a6a']); r.overlay(g => { OB.drawLogo(g, r.W, Math.round(r.H * .3), this.t, 4); OB.T(g, 'Connecting to the hub...', r.W / 2, Math.round(r.H * .7), '#ffffff', { align: 'center' }); }); } };
for (const k in S) if (S[k].touch === undefined) S[k].touch = [];
const startData = first === 'race' ? { mode: 'arcade', startStage: (hash.split('/')[1] || 'S1').toUpperCase(), car: 'orchidea', passenger: 'marisol' } : undefined;
game.start({ scenes: S, scene: first, data: startData, boot: { title: 'OutBloom 2006', steps } });
if (hub) OB.Hub.connect().then(info => { if (info) { game.go('hubcard', {}, { fade: 0 }); } else game.go('title', {}, { fade: 0 }); }).catch(() => game.go('title', {}, { fade: 0 }));
window.__ob = { game, OB };
})();
