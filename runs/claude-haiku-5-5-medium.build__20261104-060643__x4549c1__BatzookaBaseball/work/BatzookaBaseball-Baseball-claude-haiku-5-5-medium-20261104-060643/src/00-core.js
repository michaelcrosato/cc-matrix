// BATZOOKA BASEBALL: the namespace, the live tuning, the field's geometry and the content (teams, parks, pitches).
// Everything here is plain data or pure functions; the scenes (30-*.js and up) read it.
const BZ = { version: 'v1.0', title: 'BATZOOKA BASEBALL', game: null, scene: {}, hub: null, dev: { skipTitle: false } };

// ---- units -----------------------------------------------------------------------------------------------------------
// World units: 2.5 U per foot. Distances in feet are shown to the player; mph = U/s * 0.12 (1 mph = 0.44 ft/s).
BZ.FT = 2.5;
BZ.HX = 768; BZ.HY = 1120;                  // home plate (the map's cell 48, 70)
BZ.BASE_U = 225;                             // 90 ft between bases
BZ.MOUND_U = 151;                            // 60 ft 6 in from home to the rubber
BZ.FENCE_H = 25;                             // the wall is 10 ft high
BZ.MAP_W = 96; BZ.MAP_H = 80;                // cells (16 U each)
BZ.CELL = 16;
BZ.PLATE = { dist: 60.5, camBack: 8, camH: 4.0 };   // Plate Cam: feet; the camera stands 8 ft behind the plate
BZ.ZONE = { lo: -0.71, hi: 0.71, bot: 1.6, top: 3.5 };  // the strike zone, feet (plate-space)

// The two teams. Index 0 is the visitors (they bat first), 1 the home team (they bat last).
BZ.TEAMS = [
  { id: 'corn', name: 'Cornstalkers', short: 'CORN', color: '#e8443a', trim: '#ffe6a0', hat: 'batting', cap: '#3a1010',
    skin: '#e0b48c', hair: '#3a2a20', cloth: '#e8443a', pants: '#f2ecd8', boot: '#2a1a10',
    players: ['Dusty Plank', 'Lou Sweetgrass', 'Ruby Tumbleweed', 'Marlon Hail', 'Ike Wiggle', 'Tex Barnstormer', 'Pearl Dewfall', 'Gus Thunderbolt', 'Otis Cornfield'],
    super: 'Corn Cannon', captain: 'Ma Hattie Pickett' },
  { id: 'moon', name: 'Mortimer Megamax Dome Stars', short: 'DOME', color: '#3b82f6', trim: '#c8e4ff', hat: 'visor', cap: '#0c1a3a',
    skin: '#c89070', hair: '#1a1a2a', cloth: '#3b82f6', pants: '#dfe8f6', boot: '#101828',
    players: ['Brick Lumen', 'Shelly Vanta', 'Quint Orbit', 'Nova Crisp', 'Hugo Gleam', 'Delphine Chrome', 'Ozzie Halo', 'Vesper Null', 'Grant Ambient'],
    super: 'Megamax Lightbeam', captain: 'Mortimer Megamax' }
];

// Parks: one is built for the demo's fields. Its look is data (the wall, the stands, the sky).
BZ.PARKS = {
  kernel: { id: 'kernel', name: 'Kernel Field', sky: ['#2a5a9a', '#f0b080'], night: false, grass: '#4f8a3a', grass2: '#427a30',
            dirt: '#c08a52', chalk: '#f6f2e0', fence: '#2a4a2a', sign: 'Kernel Field · Home of the Cornstalkers', cfFt: 380, lineFt: 330 },
  moondome: { id: 'moondome', name: 'Megamax Dome', sky: ['#060818', '#1c2452'], night: true, grass: '#2c6a4a', grass2: '#245a3e',
            dirt: '#9a7a5a', chalk: '#e8f4ff', fence: '#1e3a6a', sign: 'Megamax Dome · Where the Stars Play', cfFt: 400, lineFt: 325 }
};

// The pitches: time = flight time to the plate (s, at speed 1); brkX/brkY = break in feet at the plate (+x = to the
// screen's right, -y = a drop).
BZ.PITCHES = {
  fastball: { id: 'fastball', name: 'FASTBALL', tag: 'FB', time: .62, brkX: 0, brkY: 0, blurb: 'Straight and fast. Hard to time.' },
  curve:    { id: 'curve', name: 'CURVEBALL', tag: 'CU', time: .80, brkX: 0, brkY: -2.4, blurb: 'Drops off the table at the end.' },
  slider:   { id: 'slider', name: 'SLIDER', tag: 'SL', time: .66, brkX: 1.5, brkY: -.5, blurb: 'Sweeps across the plate.' },
  change:   { id: 'change', name: 'CHANGEUP', tag: 'CH', time: .84, brkX: 0, brkY: -1.0, blurb: 'Looks fast, arrives slow.' }
};
BZ.PITCH_IDS = ['fastball', 'curve', 'slider', 'change'];

// Lessons for Spring Training: each one a short, playable drill with a goal.
BZ.LESSONS = [
  { id: 'pitch', title: 'Pitching', drill: 'strikes', goal: 3, pages: [
    'Stand on the mound. Aim the target with the stick or the mouse. The bigger the target, the easier the pitch.',
    'Pick a pitch with the chips at the bottom or with the bumpers. Press ✕ to wind up, then press again when the meter is in the middle: the closer to the middle, the truer the pitch.',
    'Drill: throw three strikes. Three strikes is a strikeout, and a strikeout builds up the Fireball meter.' ] },
  { id: 'hit', title: 'Hitting', drill: 'hit', goal: 1, pages: [
    'Stand in the box. Aim the bat-head with the stick or the mouse, and swing with ✕ when the ball is over the plate.',
    'Swing early and the ball flies to the right; swing late and it flies left. Aim high for a fly ball, low for a grounder.',
    'Drill: put one ball in play, fair. Foul and whiff do not count.' ] },
  { id: 'field', title: 'Fielding', drill: 'catch', goal: 1, pages: [
    'When the ball is hit, the fielder nearest it runs it down. Use the stick to steer your fielder; ✕ dives.',
    'A ball in the air is caught when you reach it low enough. A grounder is picked up when you get to it. Then choose a base with the stick: up for second, left for third, right for first.',
    'Drill: catch one fly ball.' ] },
  { id: 'bz', title: 'The Batzooka', drill: 'homer', goal: 1, pages: [
    'Hard hits and strikeouts fill the Batzooka meter. When it is full, the POWER button (□ or J) lights up.',
    'A Batzooka swing is always on the sweet spot, and fires the ball like a rocket. A Fireball is the pitcher\'s version.',
    'Drill: hit one home run with the Batzooka.' ] }
];

// ---- live tuning (every balance number; dev mode edits these live) ----------------------------------------------
BZ.TUNE_META = {
  pitchSpeed:    { label: 'Pitch speed', group: 'Pitching', min: .6, max: 1.6, step: .05, def: 1 },
  aimError:      { label: 'Aim error (ft)', group: 'Pitching', min: 0, max: 3, step: .1, def: 1.6 },
  releaseSweet:  { label: 'Release sweet spot', group: 'Pitching', min: .1, max: .5, step: .02, def: .24 },
  swingWindow:   { label: 'Swing timing window (s)', group: 'Batting', min: .05, max: .3, step: .01, def: .14 },
  reach:         { label: 'Bat reach (ft)', group: 'Batting', min: .5, max: 2, step: .1, def: 1.25 },
  exitSpeed:     { label: 'Exit speed', group: 'Batting', min: 200, max: 600, step: 10, def: 440 },
  sprayTiming:   { label: 'Spray from timing (deg)', group: 'Batting', min: 0, max: 30, step: 1, def: 14 },
  gravity:       { label: 'Gravity', group: 'Ball', min: 80, max: 400, step: 10, def: 200 },
  bounce:        { label: 'Bounce', group: 'Ball', min: 0, max: .8, step: .05, def: .35 },
  cfFt:          { label: 'Center field (ft)', group: 'Ball', min: 330, max: 460, step: 5, def: 380 },
  fielderSpeed:  { label: 'Fielder speed', group: 'Fielding', min: 40, max: 260, step: 5, def: 90 },
  reactTime:     { label: 'Fielder reaction (s)', group: 'Fielding', min: 0, max: .8, step: .05, def: .3 },
  throwSpeed:    { label: 'Throw speed', group: 'Fielding', min: 200, max: 600, step: 10, def: 420 },
  catchReach:    { label: 'Catch reach (ft)', group: 'Fielding', min: .5, max: 3, step: .1, def: 1.2 },
  runSpeed:      { label: 'Runner speed (ft/s)', group: 'Fielding', min: 30, max: 90, step: 2, def: 60 },
  meterGain:     { label: 'Batzooka gain per hit', group: 'Batzooka', min: 0, max: 100, step: 5, def: 35 },
  batzookaGain:  { label: 'Batzooka power', group: 'Batzooka', min: 1, max: 2.5, step: .05, def: 1.5 },
  innings:       { label: 'Innings', group: 'Game', min: 1, max: 9, step: 1, def: 3 },
  derbySeconds:  { label: 'Derby seconds', group: 'Game', min: 60, max: 300, step: 10, def: 120 },
  derbyOuts:     { label: 'Derby outs', group: 'Game', min: 3, max: 20, step: 1, def: 10 },
  cpuLevel:      { label: 'CPU level', group: 'Game', min: 1, max: 8, step: 1, def: 4 }
};
BZ.TUNE = {};
BZ.resetTune = () => { for (const k in BZ.TUNE_META) BZ.TUNE[k] = BZ.TUNE_META[k].def; };
BZ.resetTune();
BZ.setTune = (k, v) => { const m = BZ.TUNE_META[k]; BZ.TUNE[k] = Math.round(Math.min(m.max, Math.max(m.min, v)) / m.step) * m.step; };
BZ.bumpTune = (k, dir) => BZ.setTune(k, BZ.TUNE[k] + dir * BZ.TUNE_META[k].step);

// ---- random streams: gameplay only uses these (seeded), never the platform's generator ----------------------------------------
BZ.seedMatch = seed => {
  BZ.seed = seed;
  BZ.rng = { play: E.rng(seed), fx: E.rng(seed * 7 + 3), deal: E.rng(seed * 13 + 5) };
};
BZ.seedMatch(20261104);
BZ.cosmetic = true;   // false in the headless sims: the rigs are not posed (gameplay never reads them)

// ---- small helpers ---------------------------------------------------------------------------------------------
BZ.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
BZ.lerp = (a, b, t) => a + (b - a) * t;
BZ.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
BZ.pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
BZ.ordinal = n => ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][n] || ('inning ' + n);
BZ.ft = u => Math.round(u / BZ.FT);
BZ.fmtFt = u => BZ.ft(u) + ' FT';
// The field's geometry, in world units from home plate. theta: degrees from straight center (+ right, - left).
BZ.fenceAt = theta => {
  const a = Math.min(45, Math.abs(theta)) / 45;
  const park = BZ.PARKS[BZ.park] || BZ.PARKS.kernel;
  const cf = BZ.TUNE.cfFt * BZ.FT, line = park.lineFt * BZ.FT;
  return cf + (line - cf) * (a * a * (3 - 2 * a));   // smooth: center field at 0 degrees, the foul poles at 45
};
BZ.park = 'kernel';
BZ.thetaOf = (x, y) => Math.atan2(x - BZ.HX, BZ.HY - y) * 180 / Math.PI;
BZ.isFair = theta => Math.abs(theta) <= 45;
BZ.bases = () => [   // 1B, 2B, 3B, home, as world points
  { x: BZ.HX + BZ.BASE_U / Math.SQRT2, y: BZ.HY - BZ.BASE_U / Math.SQRT2 },
  { x: BZ.HX, y: BZ.HY - BZ.BASE_U * Math.SQRT2 },
  { x: BZ.HX - BZ.BASE_U / Math.SQRT2, y: BZ.HY - BZ.BASE_U / Math.SQRT2 },
  { x: BZ.HX, y: BZ.HY }
];
BZ.MOUND = { x: BZ.HX, y: BZ.HY - BZ.MOUND_U };
