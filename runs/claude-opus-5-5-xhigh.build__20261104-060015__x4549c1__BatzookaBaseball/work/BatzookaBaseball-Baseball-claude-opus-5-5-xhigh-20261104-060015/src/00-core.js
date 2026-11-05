/* =============================================================================
 * BATZOOKA BASEBALL  00-core: the namespace, registries, event bus, RNG streams,
 * live tuning (TUNE + TUNE_META), units and the ballpark geometry helpers.
 * Every other file adds to BZ; none reaches into another file's locals.
 * ========================================================================== */
const { px, clamp, lerp, TAU } = E;
const BZ = (typeof window !== 'undefined' && window) ? (window.BZ = {}) : {};
BZ.E = E;
BZ.version = '1.0.0';
BZ.cosmetic = true;          // false in headless sims: rigs, particles and sounds are skipped
BZ.headless = false;
BZ.scenes = {};

/* ---- registries: content is data ---- */
const REG = {};
BZ.def = (kind, id, spec) => { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; };
BZ.get = (kind, id) => (REG[kind] || {})[id];
BZ.all = kind => Object.values(REG[kind] || {});
BZ.ids = kind => Object.keys(REG[kind] || {});

/* ---- the event bus (with a ring buffer of the last 200 events for dev mode and tests) ---- */
BZ.bus = {
  h: {}, ring: [], n: 0,
  on(ev, fn) { (this.h[ev] || (this.h[ev] = [])).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const l = this.h[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data = {}) {
    this.n++; this.ring.push({ ev, t: BZ.game ? +BZ.game.time.toFixed(2) : 0, data }); if (this.ring.length > 200) this.ring.shift();
    for (const fn of (this.h[ev] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus ' + ev, e); else throw e; } }
    for (const fn of (this.h['*'] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus *', e); } }
  },
  last(ev) { for (let i = this.ring.length - 1; i >= 0; i--) if (this.ring[i].ev === ev) return this.ring[i]; return null; },
  count(ev) { return this.ring.filter(r => r.ev === ev).length; }
};

/* ---- RNG streams: gameplay only from rng.play (seeded per match), cosmetics from rng.fx, the Derby deal from rng.deal ---- */
BZ.rng = { play: E.rng(1), fx: E.rng(99), deal: E.rng(5) };
BZ.seed = (s) => { BZ.rng.play = E.rng(s >>> 0 || 1); BZ.rng.deal = E.rng(((s * 7919) >>> 0) || 5); };
BZ.R = () => BZ.rng.play();                         // 0..1 gameplay
BZ.Rr = (a, b) => a + (b - a) * BZ.rng.play();
BZ.Rn = (sd = 1) => { const u = Math.max(1e-9, BZ.rng.play()), v = BZ.rng.play(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v) * sd; };   // normal
BZ.F = () => BZ.rng.fx();                           // 0..1 cosmetic
BZ.Fr = (a, b) => a + (b - a) * BZ.rng.fx();
BZ.pickF = l => l[Math.floor(BZ.rng.fx() * l.length) % l.length];
BZ.pickP = l => l[Math.floor(BZ.rng.play() * l.length) % l.length];

/* ---- live tuning: every balance number lives in TUNE, described in TUNE_META (dev sliders) ---- */
BZ.TUNE_META = [
  // group, key, label, default, min, max, step
  ['Pitching', 'pitchSpeed', 'Pitch speed', 1, .5, 2, .05],
  ['Pitching', 'pitchBreak', 'Pitch break', 1, 0, 2.5, .05],
  ['Pitching', 'aftertouch', 'Aftertouch', 1, 0, 3, .1],
  ['Pitching', 'releaseWindow', 'Release window', 1, .3, 3, .05],
  ['Pitching', 'staminaDrain', 'Stamina drain', 1, 0, 3, .1],
  ['Batting', 'swingTiming', 'Swing timing window', 1, .3, 3, .05],
  ['Batting', 'sweetSpot', 'Sweet spot size', 1, .4, 2.5, .05],
  ['Batting', 'exitVelocity', 'Exit velocity', 1, .5, 2, .05],
  ['Batting', 'launchSpread', 'Launch spread', 1, 0, 2, .05],
  ['Ball', 'gravity', 'Gravity', 1, .3, 2.5, .05],
  ['Ball', 'drag', 'Air drag', .05, 0, .3, .01],
  ['Ball', 'bounce', 'Bounce', 1, .3, 1.5, .05],
  ['Ball', 'rollFriction', 'Roll friction', 1, .3, 3, .05],
  ['Ball', 'wind', 'Wind', 1, 0, 3, .1],
  ['Players', 'runSpeed', 'Runner speed', 1, .5, 2, .05],
  ['Players', 'fielderSpeed', 'Fielder speed', 1, .5, 2, .05],
  ['Players', 'throwSpeed', 'Throw speed', 1, .5, 2, .05],
  ['Players', 'catchRadius', 'Catch reach', 1, .5, 2.5, .05],
  ['Players', 'turboPower', 'Turbo power', 1, 0, 2, .05],
  ['Players', 'turboDrain', 'Turbo drain', 1, 0, 3, .1],
  ['Over the top', 'meterGain', 'Meter gain', 1, 0, 5, .1],
  ['Over the top', 'batzookaPower', 'Batzooka power', 1.6, 1, 3, .05],
  ['Over the top', 'rhubarbChance', 'Rhubarb chance', .4, 0, 1, .05],
  ['Over the top', 'hazardRate', 'Hazard rate', 1, 0, 4, .1],
  ['CPU', 'cpuBat', 'CPU batting', 1, 0, 2, .05],
  ['CPU', 'cpuPitch', 'CPU pitching', 1, 0, 2, .05],
  ['CPU', 'cpuField', 'CPU fielding', 1, 0, 2, .05],
  ['CPU', 'cpuRun', 'CPU running', 1, 0, 2, .05],
  ['Camera', 'plateDist', 'Plate Cam distance', 84, 40, 140, 1],
  ['Camera', 'plateHeight', 'Plate Cam height', 44, 16, 90, 1],
  ['Camera', 'plateFov', 'Plate Cam field of view', 44, 30, 80, 1],
  ['Camera', 'fieldZoom', 'Field Cam zoom', 1, .4, 2, .05],
  ['Camera', 'heightSquash', 'High-ball squash', .45, .2, 1, .05],
  ['Game', 'gameSpeed', 'Game speed', 1, .25, 2, .05]
];
BZ.TUNE_DEFAULTS = {};
for (const [, k, , d] of BZ.TUNE_META) BZ.TUNE_DEFAULTS[k] = d;
BZ.TUNE = Object.assign({}, BZ.TUNE_DEFAULTS);
const TUNE = BZ.TUNE;
BZ.resetTune = (group) => { for (const [g, k, , d] of BZ.TUNE_META) if (!group || g === group) TUNE[k] = d; BZ.saveTune && BZ.saveTune(); };
BZ.tuneMeta = k => BZ.TUNE_META.find(m => m[1] === k);

/* ---- units: 16 U a tile; feet and mph for display ---- */
BZ.feet = u => Math.round(u * .32);
BZ.mph = v => Math.round(v * .26);
BZ.ang = (a) => { a %= TAU; return a < -Math.PI ? a + TAU : a > Math.PI ? a - TAU : a; };
BZ.dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
BZ.ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
BZ.fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
BZ.factor = s => 1 + .03 * ((s === undefined ? 5 : s) - 5);    // a 1-10 stat -> 0.88..1.15
BZ.hash = (str) => { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };

/* ---- ballpark geometry (offsets from home plate H; north = -y is center field; +x is first base) ---- */
BZ.GEO = {
  plate: [0, -6], first: [212, -212], second: [0, -424], third: [-212, -212], rubber: [0, -205], mound: [0, -200],
  boxR: [-18, -4], boxL: [18, -4], catcher: [0, 16], umpire: [0, 30], deckL: [-78, -21], deckR: [78, -21],
  zoneHalfW: 6, zoneLo: 9, zoneHi: 25, ballR: 1.6, releaseZ: 26, releaseY: -198,
  infield: 470, backstop: 110, foulWall: 70
};
BZ.FIELD_POS = {   // fielders' default spots, by position id
  P: [0, -200], C: [0, 16], '1B': [225, -275], '2B': [105, -395], SS: [-105, -395], '3B': [-225, -275], LF: [-420, -760], CF: [0, -900], RF: [420, -760]
};
BZ.POS_ORDER = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
BZ.POS_NUM = { P: 1, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, LF: 7, CF: 8, RF: 9 };

/** spray angle of an offset from home (radians, 0 = straight-away center, + toward right field) */
BZ.theta = (dx, dy) => Math.atan2(dx, -dy);
/** a park's fence distance at spray angle th (Catmull-Rom through the 5 control distances) */
BZ.fenceR = (park, th) => {
  const c = park.fence, deg = clamp(th * 180 / Math.PI, -45, 45), u = (deg + 45) / 22.5, i = Math.min(3, Math.floor(u)), t = u - i;
  const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(4, i + 2)];
  const t2 = t * t, t3 = t2 * t;
  return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
/** the fence height at spray angle th */
BZ.fenceH = (park, th) => {
  const deg = th * 180 / Math.PI;
  for (const s of park.fenceSections || []) if (deg >= s.from && deg <= s.to) return s.h;
  return park.fenceH || 40;
};
/** the angle where the fence meets the foul wall (just past the pole) */
BZ.fenceSpan = (park) => {
  if (park._span) return park._span;
  let best = 45;
  for (let d = 45; d < 60; d += .05) { const th = d * Math.PI / 180, R = BZ.fenceR(park, th); if (R * Math.sin(th - Math.PI / 4) >= BZ.GEO.foulWall) { best = d; break; } }
  return (park._span = best * Math.PI / 180);
};
/** is an offset point (from H) inside the playing field (fair + foul ground inside the walls)? and how far in */
BZ.inField = (park, dx, dy) => {
  const r = Math.hypot(dx, dy), th = BZ.theta(dx, dy), span = BZ.fenceSpan(park);
  if (Math.abs(th) <= span && dy < 0) { if (r > BZ.fenceR(park, th)) return false; }
  // foul walls: 70 U outside the foul lines (perpendicular distance), and the backstop arc behind home
  const outL = (-dx + dy) / Math.SQRT2, outR = (dx + dy) / Math.SQRT2;   // + outside the left / right foul line
  if (outL > BZ.GEO.foulWall || outR > BZ.GEO.foulWall) return false;
  if (outL > 0 && outR > 0 && r > BZ.GEO.backstop) return false;          // behind home: the backstop arc
  return true;
};
BZ.outL = (dx, dy) => (-dx + dy) / Math.SQRT2;
BZ.outR = (dx, dy) => (dx + dy) / Math.SQRT2;
/** fair territory test for a ground point (offset from H): within 45 degrees of center, ahead of home */
BZ.fair = (dx, dy) => { const th = BZ.theta(dx, dy); return dy < 0 && Math.abs(th) <= Math.PI / 4 + 1e-6; };

/* ---- a tiny deterministic hash noise for drawing ---- */
BZ.n2 = (x, y) => E.hash2 ? E.hash2(Math.floor(x), Math.floor(y)) : ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;

/* ---- small helpers used everywhere ---- */
BZ.approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
BZ.moveTo = (o, tx, ty, sp, dt) => {   // move a point toward a target at speed: returns true when it arrives
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy), st = sp * dt;
  if (d <= st || d < .01) { o.vx = d > .01 ? dx / dt : 0; o.vy = d > .01 ? dy / dt : 0; o.x = tx; o.y = ty; return true; }
  o.vx = dx / d * sp; o.vy = dy / d * sp; o.x += o.vx * dt; o.y += o.vy * dt; o.facing = Math.atan2(dy, dx); return false;
};
BZ.later = [];   // simple frame timers that survive game.after's scene clearing within a scene: [t, fn]
BZ.wait = (s, fn) => BZ.later.push([s, fn]);
BZ.tickLater = (dt) => { for (let i = BZ.later.length - 1; i >= 0; i--) { const w = BZ.later[i]; w[0] -= dt; if (w[0] <= 0) { BZ.later.splice(i, 1); try { w[1](); } catch (e) { BZ.game.fail('later', e); } } } };
BZ.clearLater = () => { BZ.later.length = 0; };
