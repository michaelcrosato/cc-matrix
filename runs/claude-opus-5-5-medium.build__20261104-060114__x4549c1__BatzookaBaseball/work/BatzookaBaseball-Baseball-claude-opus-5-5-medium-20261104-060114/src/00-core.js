/* BATZOOKA BASEBALL: the spine. One namespace (BZ), registries for content as data, an event bus every system listens
 * to, seeded random streams, the live-tuning table (BZ.TUNE, the dev sliders) and unit helpers. */
const BZ = { version: '1.0.0', cosmetic: true };
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* ---- registries: BZ.def('parks', 'kernel', {...}); BZ.get('parks', 'kernel'); BZ.all('parks') ---- */
const REG = {};
BZ.def = (kind, id, spec) => { (REG[kind] = REG[kind] || new Map()).set(id, Object.assign({ id }, spec)); return spec; };
BZ.get = (kind, id) => REG[kind] && REG[kind].get(id);
BZ.all = kind => REG[kind] ? [...REG[kind].values()] : [];

/* ---- the bus: every outcome is an event; listeners never edit the rules ---- */
BZ.bus = {
  h: {}, log: [],
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const l = this.h[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data = {}) {
    this.log.push({ ev, t: +(BZ.game ? BZ.game.time : 0).toFixed(2), data }); if (this.log.length > 200) this.log.shift();
    for (const fn of (this.h[ev] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus ' + ev, e); else throw e; } }
    for (const fn of (this.h['*'] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus *', e); else throw e; } }
  }
};
const emit = (ev, d) => BZ.bus.emit(ev, d);

/* ---- random streams: play (rules, pitches, contact, AI: seeded per match), fx (cosmetic), deal (the Derby's pitches) ---- */
BZ.rng = { play: E.rng(1), fx: E.rng(2), deal: E.rng(3) };
BZ.seed = s => { BZ.rng.play = E.rng(s >>> 0 || 1); BZ.rng.fx = E.rng((s * 7 + 3) >>> 0 || 2); };
const R = () => BZ.rng.play(), RF = () => BZ.rng.fx();
const gauss = (rnd = R) => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

/* ---- live tuning: every balance number, described for the dev sliders (label, group, min, max, step) ---- */
const TUNE_META = [
  ['Pitching', 'pitchSpeed', 'Pitch speed', 1, .5, 2, .05], ['Pitching', 'pitchBreak', 'Pitch break', 1, 0, 2.5, .05],
  ['Pitching', 'aftertouch', 'Aftertouch', 1, 0, 3, .1], ['Pitching', 'releaseWindow', 'Release window', 1, .3, 3, .05],
  ['Pitching', 'staminaDrain', 'Stamina drain', 1, 0, 3, .1],
  ['Batting', 'swingTiming', 'Swing timing window', 1, .3, 3, .05], ['Batting', 'sweetSpot', 'Sweet spot size', 1, .4, 2.5, .05],
  ['Batting', 'exitVelocity', 'Exit velocity', 1, .5, 2, .05], ['Batting', 'launchSpread', 'Launch spread', 1, 0, 2, .05],
  ['Ball', 'gravity', 'Gravity', 1, .3, 2.5, .05], ['Ball', 'drag', 'Air drag', .05, 0, .3, .01], ['Ball', 'bounce', 'Bounce', 1, .3, 1.5, .05],
  ['Ball', 'rollFriction', 'Roll friction', 1, .3, 3, .1], ['Ball', 'wind', 'Wind', 1, 0, 3, .1],
  ['Players', 'runSpeed', 'Runner speed', 1, .5, 2, .05], ['Players', 'fielderSpeed', 'Fielder speed', 1, .5, 2, .05],
  ['Players', 'throwSpeed', 'Throw speed', 1, .5, 2, .05], ['Players', 'catchRadius', 'Catch radius', 1, .5, 2.5, .05],
  ['Players', 'turboPower', 'Turbo boost', 1, 0, 2, .05], ['Players', 'turboDrain', 'Turbo drain', 1, 0, 3, .1],
  ['Over the top', 'meterGain', 'Meter gain', 1, 0, 5, .1], ['Over the top', 'batzookaPower', 'Batzooka power', 1.6, 1, 3, .05],
  ['Over the top', 'rhubarbChance', 'Rhubarb chance', .4, 0, 1, .05], ['Over the top', 'hazardRate', 'Hazard rate', 1, 0, 4, .1],
  ['CPU', 'cpuBat', 'CPU batting skill', 1, 0, 2, .05], ['CPU', 'cpuPitch', 'CPU pitching skill', 1, 0, 2, .05],
  ['CPU', 'cpuField', 'CPU fielding skill', 1, 0, 2, .05], ['CPU', 'cpuRun', 'CPU running skill', 1, 0, 2, .05],
  ['Camera', 'plateDist', 'Plate cam distance', 72, 40, 140, 2], ['Camera', 'plateHeight', 'Plate cam height', 36, 16, 90, 1],
  ['Camera', 'plateFov', 'Plate cam FOV', 46, 30, 80, 1], ['Camera', 'fieldZoom', 'Field cam zoom', 1, .4, 2, .05],
  ['Camera', 'heightSquash', 'Fly ball squash', .45, .2, 1, .05],
  ['Game', 'gameSpeed', 'Game speed', 1, .25, 2, .05]
].map(([group, key, label, def, min, max, step]) => ({ group, key, label, def, min, max, step }));
const TUNE = {};
BZ.TUNE = TUNE; BZ.TUNE_META = TUNE_META;
BZ.resetTune = group => { for (const m of TUNE_META) if (!group || m.group === group) TUNE[m.key] = m.def; };
BZ.resetTune();

/* ---- units and helpers: 16 U a tile; feet = U x .32; mph = U/s x .26 ---- */
const feet = u => Math.round(u * .32), mph = v => Math.round(v * .26);
const statF = s => 1 + .03 * ((s === undefined ? 5 : s) - 5);
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const smooth01 = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
const wrapText = (s, w, o) => E.font.wrap(s, w, o);

/* ---- the game itself: res ps1, expand; the pause menu's extra items come from a function (evaluated on each open) ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#06070c', fullscreen: 'button',
  menu: {
    items: () => BZ.pauseItems ? BZ.pauseItems() : [],
    settings: [],
    quit: false
  }
});
BZ.game = game;
const A = game.audio, P = game.particles, LIGHTS = game.lights;
const SCENES = BZ.SCENES = {};
