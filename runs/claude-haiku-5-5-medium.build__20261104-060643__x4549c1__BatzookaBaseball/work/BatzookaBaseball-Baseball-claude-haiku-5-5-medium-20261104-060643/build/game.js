(() => {
'use strict';
const E = My3D2dge;
// ---- 00-core.js
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

// ---- 02-audio.js
// Sound: every sound and song is made in code (the engine's chip synth). The effects are named voices defined at start;
// the announcers and the crowd's voices are babble (Animalese-style pitched syllables, one per letter group).
// Music: a song per scene; the title and the derby have their own, the matches a bright one, and a stinger for big moments.
BZ.define = game => {
  const A = game.audio;
  const voices = {
    crack:  { wave: 'noise', dur: .09, vol: .5 },
    crackB: { wave: 'square', freq: 520, to: 160, dur: .12, vol: .3 },
    pitch:  { wave: 'sine', freq: 320, to: 180, dur: .16, vol: .18 },
    release:{ wave: 'triangle', freq: 260, to: 540, dur: .12, vol: .2 },
    strike: { wave: 'square', freq: 880, to: 1100, dur: .08, vol: .22 },
    ball:   { wave: 'sine', freq: 420, dur: .07, vol: .16 },
    foul:   { wave: 'noise', dur: .06, vol: .26 },
    out:    { wave: 'square', freq: 360, to: 140, dur: .32, vol: .22 },
    catch:  { wave: 'triangle', freq: 660, to: 990, dur: .1, vol: .26 },
    thud:   { wave: 'sine', freq: 140, to: 60, dur: .14, vol: .34 },
    throw:  { wave: 'saw', freq: 900, to: 300, dur: .18, vol: .12 },
    rocket: { wave: 'saw', freq: 180, to: 1400, dur: .7, vol: .2 },
    fire:   { wave: 'noise', dur: .5, vol: .3 },
    tick:   { wave: 'square', freq: 1500, dur: .03, vol: .1 },
    fanfare:{ wave: 'square', freq: 660, to: 990, dur: .4, vol: .2 },
    cheer:  { wave: 'noise', dur: 1.4, vol: .22 },
    boo:    { wave: 'saw', freq: 210, to: 150, dur: .6, vol: .12 },
    select: { wave: 'square', freq: 740, dur: .05, vol: .14 },
    confirm:{ wave: 'square', freq: 990, to: 1320, dur: .08, vol: .16 },
    back:   { wave: 'square', freq: 440, to: 300, dur: .08, vol: .14 },
    dive:   { wave: 'triangle', freq: 220, to: 80, dur: .25, vol: .2 }
  };
  for (const k in voices) A.define(k, voices[k]);
};

// A short effect by name. Safe before the first key press (the engine holds sound until then).
BZ.sfx = (name, o = {}) => { const g = BZ.game; if (g && g.audio && !BZ.muted) g.audio.sfx(name, o); };

// Babble: each word becomes a few syllables, each one a short pitched blip, the pitch from the letters. It is nonsense
// on purpose, and it sounds like a voice. Plays through the game clock, so it pauses with the game.
BZ.babble = (text, o = {}) => {
  const g = BZ.game;
  if (!g || !g.audio || BZ.muted) return;
  const base = o.pitch || 240, rate = o.rate || .085;
  const words = String(text).replace(/\{[^}]*\}/g, '').split(/\s+/).filter(Boolean).slice(0, 40);
  let t = 0;
  for (const w of words) {
    const syl = Math.max(1, Math.min(4, Math.round(w.length / 3)));
    for (let i = 0; i < syl; i++) {
      const c = w.charCodeAt(Math.min(w.length - 1, i * 2)) || 65;
      const f = base * Math.pow(2, ((c % 12) - 6) / 14 + (i % 2 ? .12 : 0));
      g.after(t, () => g.audio.sfx({ wave: 'triangle', freq: f, to: f * (1.08 + (c % 3) * .03), dur: rate * 1.05, vol: o.vol || .16 }));
      t += rate;
    }
    t += rate * 1.6;
  }
  return t;
};

// The songs. Each track loops on its own tokens; steps are sixteenths per beat, so 16 tokens is one bar at 4 beats.
BZ.songs = {
  title: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .16, notes: 'C4 E4 G4 C5  G4 E4 C4 G3  A3 C4 E4 A4  G4 E4 C4 G3' },
    { wave: 'square', vol: .06, notes: 'C3 . G2 . C3 . G2 .  A2 . E2 . G2 . D2 .' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h .  k . h . s . h .' }
  ] },
  match: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .14, notes: 'G4 . B4 D5 . B4 G4 . A4 . C5 E5 . C5 A4 .' },
    { wave: 'triangle', vol: .18, notes: 'G2 G2 G3 G2 A2 A2 A3 A2 G2 G2 G3 G2 D3 D3 D2 D3' },
    { wave: 'drums', vol: .22, notes: 'k . h . s . h .  k . h k s . h .' }
  ] },
  derby: { bpm: 144, steps: 4, tracks: [
    { wave: 'saw', vol: .09, notes: 'E4 G4 B4 E5 D5 B4 G4 D4 C4 E4 G4 C5 B4 G4 E4 C4' },
    { wave: 'triangle', vol: .2, notes: 'E2 . E2 E2 B2 . B2 . C3 . C3 C3 G2 . G2 .' },
    { wave: 'drums', vol: .24, notes: 'k h s h k h s h k h s h k k s h' }
  ] },
  results: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .18, notes: 'C4 . E4 . G4 . C5 . B4 . G4 . E4 . C4 .' },
    { wave: 'square', vol: .06, notes: 'C2 . . . G2 . . . A2 . . . F2 . . .' }
  ] },
  attract: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'E4 G4 A4 G4 E4 G4 B4 G4 A4 C5 B4 A4 G4 E4 D4 E4' },
    { wave: 'triangle', vol: .16, notes: 'A2 . A2 . E2 . E2 . F2 . F2 . G2 . G2 .' },
    { wave: 'drums', vol: .16, notes: 'k . h . s . h .  k . h . s . h .' }
  ] }
};

// The music for a scene, switched only when it changes.
BZ.playSong = name => {
  const g = BZ.game;
  if (!g || !g.audio) return;
  if (BZ.songNow === name) return;
  BZ.songNow = name;
  if (!name) { g.audio.music(null); return; }
  g.audio.music(BZ.songs[name], { fade: .4 });
};

// ---- 10-rules.js
// The rules engine: pure state and transitions, no drawing, no input. A match is one object (BZ.newMatch); each call
// below moves it on and returns what happened, so the scene, the commentary and the tests all read the same events.
// Kept from baseball: balls, strikes, outs, the four bases with forces, innings, the walk, the strikeout, extra innings,
// the walk-off, and the rule that the home team does not bat in the last half when it is ahead.
// Simplified: runners never steal or tag up (a deep caught fly sends the runner on third home), one throw decides a
// play, and a runner is only forced by the batter (no double-play turns).
BZ.newMatch = (o = {}) => ({
  innings: o.innings || 3, inning: 1, top: true, outs: 0, balls: 0, strikes: 0,
  bases: [null, null, null],                  // who is on 1B, 2B, 3B: the runner's name, or null
  score: [0, 0],
  line: [[], []],                              // runs per inning, per team
  hits: [0, 0], hr: [0, 0], k: [0, 0], walks: [0, 0], errors: [0, 0],
  lineup: [0, 0],                              // the batting order's place, per team (0..8)
  over: false, walkoff: false, extra: false,
  batter: null                                 // the batter's name
});
BZ.battingTeam = S => S.top ? 0 : 1;
BZ.fieldingTeam = S => 1 - BZ.battingTeam(S);
BZ.batterFor = (S, team = BZ.battingTeam(S)) => BZ.TEAMS[team].players[S.lineup[team] % 9];

// Runs for a team this inning, by inning for the line score. A home team that takes the lead in its last chance walks it off.
BZ.addRuns = (S, team, n) => {
  if (n <= 0) return 0;
  S.score[team] += n;
  const L = S.line[team];
  while (L.length < S.inning) L.push(0);
  L[S.inning - 1] = (L[S.inning - 1] || 0) + n;
  if (team === 1 && S.inning >= S.innings && S.score[1] > S.score[0]) { S.over = true; S.walkoff = true; }
  return n;
};

// A plate appearance begins: the next batter of the batting team steps in, and the count starts at 0-0. The order
// moves on here, at the start, so a half-inning change can never move the wrong team's order.
BZ.beginPA = S => {
  const t = BZ.battingTeam(S);
  S.batter = BZ.batterFor(S, t);
  S.lineup[t] = (S.lineup[t] + 1) % 9;
  S.balls = 0; S.strikes = 0;
  return S.batter;
};

// Force the runners ahead: a batter on first pushes any runner who is forced. Returns the runs that score.
BZ.forceAdvance = S => {
  const b = S.bases;
  let runs = 0;
  if (b[0]) {
    if (b[1]) {
      if (b[2]) { runs = 1; }
      b[2] = b[1];
    }
    b[1] = b[0];
  }
  b[0] = S.batter;
  return runs;
};

// Ball four: the batter walks and the forced runners move up.
BZ.walk = S => {
  const t = BZ.battingTeam(S);
  const runs = BZ.forceAdvance(S);
  S.walks[t]++;
  BZ.addRuns(S, t, runs);
  S.balls = 0; S.strikes = 0;
  return { ev: S.over ? 'gameOver' : 'walk', runs, batter: S.batter };
};

// The count. kind: 'ball' | 'strike' (looking or swinging) | 'foul'. Returns the event for the scene and the commentary.
BZ.pitchCount = (S, kind) => {
  if (kind === 'ball') {
    S.balls++;
    if (S.balls >= 4) return BZ.walk(S);
    return { ev: 'ball', count: BZ.countText(S) };
  }
  if (kind === 'strike') {
    S.strikes++;
    if (S.strikes >= 3) { S.k[BZ.battingTeam(S)]++; return BZ.recordOut(S, 'k'); }
    return { ev: 'strike', count: BZ.countText(S) };
  }
  if (kind === 'foul') {
    if (S.strikes < 2) S.strikes++;
    return { ev: 'foul', count: BZ.countText(S) };
  }
  throw new Error('pitchCount: unknown kind ' + kind);
};
BZ.countText = S => S.balls + '-' + S.strikes;

// One out. Three outs end the half-inning. The event says whether it ended.
BZ.recordOut = (S, why = 'out') => {
  S.outs++;
  S.balls = 0; S.strikes = 0;
  const ev = { ev: why === 'k' ? 'k' : 'out', why, batter: S.batter };
  if (S.outs >= 3) return Object.assign(ev, BZ.endHalf(S));
  return ev;
};

// The half-inning ends: the bases clear, and the match moves to the next half or ends.
BZ.endHalf = S => {
  const wasTop = S.top;
  S.outs = 0; S.bases = [null, null, null];
  if (wasTop) {
    if (S.inning >= S.innings && S.score[1] > S.score[0]) { S.over = true; return { end: 'gameOver' }; }
    S.top = false;
    return { end: 'halfOver' };
  }
  if (S.inning >= S.innings && S.score[0] !== S.score[1]) { S.over = true; return { end: 'gameOver' }; }
  S.top = true; S.inning++;
  if (S.inning > S.innings) S.extra = true;
  return { end: 'inningOver' };
};

// A hit. type: 'single' | 'double' | 'triple' | 'hr'. Runners go the way the hit sends them; returns the runs.
BZ.hit = (S, type) => {
  const t = BZ.battingTeam(S), b = S.bases, batter = S.batter;
  let runs = 0;
  if (type === 'hr') {
    for (let i = 0; i < 3; i++) if (b[i]) { runs++; b[i] = null; }
    runs++;
    S.hr[t]++;
  } else if (type === 'triple') {
    for (let i = 0; i < 3; i++) if (b[i]) { runs++; b[i] = null; }
    b[2] = batter;
  } else if (type === 'double') {
    if (b[2]) { runs++; b[2] = null; }
    if (b[1]) { runs++; b[1] = null; }
    if (b[0]) { b[2] = b[0]; b[0] = null; }
    b[1] = batter;
  } else {
    if (b[2]) { runs++; b[2] = null; }
    if (b[1]) { b[2] = b[1]; b[1] = null; }
    if (b[0]) { b[1] = b[0]; b[0] = null; }
    b[0] = batter;
  }
  S.hits[t]++;
  BZ.addRuns(S, t, runs);
  return runs;
};

// A caught ball: an out. A deep fly lets the runner on third tag up and score.
BZ.caughtFly = (S, deep) => {
  const t = BZ.battingTeam(S);
  let runs = 0;
  if (deep && S.bases[2]) { runs = 1; S.bases[2] = null; }
  BZ.addRuns(S, t, runs);
  return Object.assign(BZ.recordOut(S, 'fly'), { runs });
};

// The play after a fielded ground ball. target: 0 (first), 1 (second) or 2 (third) is where the throw goes.
// batterOut: the throw beat the batter to first. runnerOut: the throw beat the forced runner to that base.
BZ.groundPlay = (S, target, { batterOut, runnerOut }) => {
  const t = BZ.battingTeam(S);
  if (target === 0 && batterOut) {
    const o = BZ.recordOut(S, 'ground');
    return Object.assign(o, { runs: 0 });
  }
  if (target > 0 && runnerOut) {
    S.bases[target - 1] = null;
    const o = BZ.recordOut(S, 'force');
    if (o.end) return Object.assign(o, { runs: 0 });
  }
  const runs = BZ.forceAdvance(S);
  BZ.addRuns(S, t, runs);
  return { ev: runnerOut || batterOut ? 'forceOut' : 'safe', runs, batter: S.batter };
};

// The line score as rows of text, for the results screen.
// A cell is the runs in that inning once the team has batted in it, blank before. The visitors have batted in inning n
// once the match is past the top of it; the home team once it is past the bottom of it (or is in the top of the next).
BZ.lineScore = S => {
  const cols = Math.max(S.innings, S.inning, S.line[0].length, S.line[1].length);
  const cell = (team, n) => {   // n: 1-based inning
    const done = team === 0 ? (S.inning > n || (S.inning === n && !S.top)) : S.inning > n;
    if (!done && !(S.line[team][n - 1] > 0)) return '';
    return String(S.line[team][n - 1] || 0);
  };
  const row = team => Array.from({ length: cols }, (_, i) => cell(team, i + 1));
  return { cols, away: row(0), home: row(1), R: S.score.slice(), H: S.hits.slice() };
};

// ---- 11-pitch.js
// Pitching: the plan a pitch is thrown with, its path through plate-space, the strike zone, and the Plate Cam's projection.
// Plate-space is in feet: lat (+ to the screen's right, seen from behind the plate) and h (height). depth runs from the
// plate (0) out to the rubber (60.5 ft). The ball flies from the rubber to the plate over `time` seconds.

// The release meter: p runs 0..1 and sweeps. Inside the sweet spot (in the middle) the pitch goes where it was aimed; the
// further out, the wider the miss, up to the full aim error at the meter's ends.
BZ.releaseError = p => {
  const half = BZ.TUNE.releaseSweet / 2;
  const d = Math.abs(p - .5);
  return d <= half ? 0 : BZ.clamp((d - half) / (.5 - half), 0, 1);
};

// The plan: which pitch, where it is aimed (feet, before the release error), and when the release lands.
// rng draws the miss's direction, so a seeded match misses the same way every time.
BZ.planPitch = ({ pitch, aimLat, aimH, release, superPitch = false, rng = BZ.rng.play }) => {
  const P = BZ.PITCHES[pitch];
  const miss = BZ.releaseError(release) * BZ.TUNE.aimError;
  const a = rng() * Math.PI * 2;
  const k = superPitch ? 1.5 : 1;
  return {
    pitch, super: superPitch, release, miss,
    endLat: aimLat + Math.cos(a) * miss, endH: aimH + Math.sin(a) * miss * .7,
    time: P.time / BZ.TUNE.pitchSpeed * (superPitch ? .82 : 1),
    brkX: P.brkX * k, brkY: P.brkY * k
  };
};

// Where the ball is at t (0 = the rubber, 1 = the plate). The break grows toward the plate.
BZ.pitchAt = (plan, t) => ({
  lat: plan.endLat * t + plan.brkX * t * t,
  h: BZ.lerp(5.5, plan.endH, t) + plan.brkY * t * t,
  depth: BZ.PLATE.dist * (1 - t)
});
// Where the ball crosses the plate (the end of the path).
BZ.plateLoc = plan => BZ.pitchAt(plan, 1);

// A ball touching the zone counts (radius 0.12 ft).
BZ.inZone = (lat, h) => Math.abs(lat) <= BZ.ZONE.hi + .12 && h >= BZ.ZONE.bot - .12 && h <= BZ.ZONE.top + .12;

// The Plate Cam: a perspective from 8 ft behind the plate, 4 ft up. The focal length is the screen's height, and the
// horizon sits at 44% of the height, so the plate's feet land near the bottom of the picture and the mound is up the field.
BZ.HORIZON = .44;
BZ.project = (lat, h, depth, W, H) => {
  const s = H / (depth + BZ.PLATE.camBack);
  return { x: W / 2 + lat * s, y: H * BZ.HORIZON + (BZ.PLATE.camH - h) * s, s };
};
// The reverse at the plate: a screen point to plate-space (feet) for the batter's reticle.
BZ.plateFromScreen = (mx, my, W, H) => {
  const s = H / BZ.PLATE.camBack;
  return { lat: (mx - W / 2) / s, h: BZ.PLATE.camH - (my - H * BZ.HORIZON) / s };
};
// The pitcher's mouse: the same plane as the batter's, but a pitch can't be aimed off the screen's zone area.
BZ.aimLimits = { lat: [-1.25, 1.25], h: [.9, 4.4] };
BZ.clampAim = (lat, h) => ({ lat: BZ.clamp(lat, ...BZ.aimLimits.lat), h: BZ.clamp(h, ...BZ.aimLimits.h) });

// The CPU's pitch choice: fastballs early, breaking balls with two strikes, and the aim near the zone's edges.
BZ.cpuPitch = (S, rng = BZ.rng.fx) => {
  const two = S.strikes === 2, behind = S.balls >= 2;
  const r = rng();
  if (two && r < .55) {
    const pitch = r < .25 ? 'curve' : 'slider';
    return { pitch, aimLat: (rng() - .5) * 1.5, aimH: pitch === 'curve' ? 3.6 + rng() * .4 : 1.9 + rng() * .4, release: .5 + (rng() - .5) * .25 };
  }
  const strikeOdds = behind ? .8 : .6;
  const inside = rng() < strikeOdds;
  const pitch = rng() < .6 ? 'fastball' : BZ.pick(rng, ['curve', 'slider', 'change']);
  const drop = pitch === 'curve' ? 2.4 : pitch === 'change' ? 1 : 0;   // aim high enough that the break ends in the zone
  return { pitch, aimLat: inside ? (rng() - .5) * 1.2 : (rng() < .5 ? -1 : 1) * (.95 + rng() * .3),
    aimH: inside ? 1.8 + rng() * 1.6 + drop : (rng() < .5 ? 1.1 : 4.1), release: .5 + (rng() - .5) * .4 };
};

// ---- 12-bat.js
// Batting: the contact model. Two things decide a swing: when it lands (timing, against the moment the ball crosses the
// plate) and where the bat is (the reticle, against the ball's spot over the plate). Both feed one quality, q (0..1),
// which sets the exit speed. Timing sets the spray (early goes to the right, late to the left); the reticle's height
// sets the launch (high for a fly, low for a grounder). A Batzooka swing is always on the sweet spot and fires harder.
BZ.contact = ({ swingT, reticle, plate, batzooka = false }) => {
  const W = BZ.TUNE.swingWindow, lim = W * 1.8;
  const reach = BZ.TUNE.reach * (batzooka ? 1.6 : 1);
  let e = swingT;
  if (batzooka) e = BZ.clamp(e, -W, W);           // the super swing is forgiving on timing
  else if (Math.abs(e) > lim) return { type: 'whiff', why: 'late or early' };
  const d = Math.hypot(reticle.lat - plate.lat, reticle.h - plate.h);
  if (d > reach * 1.5) return { type: 'whiff', why: 'off the ball' };
  if (d > reach) return { type: 'foul', why: 'got under it', q: 0, e, d };
  const timing = 1 - Math.abs(e) / lim;
  const loc = 1 - d / reach;
  const q = BZ.clamp(.55 * timing + .45 * loc, 0, 1);
  const exit = BZ.TUNE.exitSpeed * (.45 + .55 * q) * (batzooka ? BZ.TUNE.batzookaGain : 1);
  const spray = -(e / W) * BZ.TUNE.sprayTiming + plate.lat * 6;
  const launch = BZ.lerp(-8, 48, BZ.clamp((reticle.h - 1.4) / 2.8, 0, 1)) + (batzooka ? 6 : 0);
  return { type: 'hit', q, exit, launch, spray, batzooka, e, d, timing, loc };
};

// A pitch the batter can swing at: the swing's time relative to the ball's arrival (s), from its own clock.
BZ.swingWindowOpen = t => t > .8 && t < 1.2;   // the part of the path where a swing can make contact

// ---- 13-ball.js
// The batted ball: a point with a height, under gravity, that bounces, rolls, hits the wall or clears it. Pure: step it
// with a fixed dt. The scene reads its flags; fielders and the rules decide what they mean.
// Phases: 'air' (flying or bouncing), 'roll' (on the ground, slowing), 'dead' (stopped, or gone: foul, out of play).
BZ.launchBall = ({ exit, launch, spray, from = { x: BZ.HX, y: BZ.HY - 10 }, batzooka = false }) => {
  const L = launch * Math.PI / 180, S = spray * Math.PI / 180;
  const vh = exit * Math.cos(L);
  return {
    x: from.x, y: from.y, z: 4,
    vx: vh * Math.sin(S), vy: -vh * Math.cos(S), vz: exit * Math.sin(L),
    t: 0, phase: 'air',
    landed: false, landX: null, landY: null, landDist: 0, fair: null,   // the first touch of the ground
    homer: false, crossDist: 0, wall: false,                             // over or off the fence
    stopDist: 0, stopped: false, caught: false, batzooka, exit, launch, spray
  };
};

// Where a ball in the air will be when it comes down to a height (0: the ground): the point a fielder should reach.
BZ.predictLanding = (b, height = 0) => {
  const g = BZ.TUNE.gravity;
  const disc = b.vz * b.vz + 2 * g * Math.max(0, b.z - height);
  const t = Math.max(0, (b.vz + Math.sqrt(disc)) / g);
  return { x: b.x + b.vx * t, y: b.y + b.vy * t, t };
};

// How fast a rolling ball slows (U/s per second): the grass and the dirt take the speed off it.
BZ.ROLL_DECEL = 320;

// One step of dt seconds.
BZ.stepBall = (b, dt) => {
  if (b.phase === 'dead' || b.caught) return;
  b.t += dt;
  const g = BZ.TUNE.gravity;
  if (b.z > 0 || b.vz !== 0) b.vz -= g * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  const r = Math.hypot(b.x - BZ.HX, b.y - BZ.HY), th = BZ.thetaOf(b.x, b.y);

  // The fence, in fair territory: over it is a home run, into it is a bounce back toward the field.
  if (Math.abs(th) <= 45 && r >= BZ.fenceAt(th)) {
    if (b.z > BZ.FENCE_H) {
      if (!b.homer) { b.homer = true; b.crossDist = r / BZ.FT; }
    } else if (b.vx || b.vy) {
      const nx = (b.x - BZ.HX) / r, ny = (b.y - BZ.HY) / r, vn = b.vx * nx + b.vy * ny;
      if (vn > 0) { b.vx -= 1.4 * vn * nx; b.vy -= 1.4 * vn * ny; b.wall = true; }
      const F = BZ.fenceAt(th);
      b.x = BZ.HX + nx * (F - 3); b.y = BZ.HY + ny * (F - 3);
      b.vx *= .4; b.vy *= .4;
    }
  }

  if (b.z <= 0) {
    b.z = 0;
    if (b.vz < 0) {
      if (!b.landed) {
        b.landed = true; b.landX = b.x; b.landY = b.y;
        b.landDist = r / BZ.FT; b.fair = Math.abs(th) <= 45;
      }
      if (-b.vz > 40) { b.vz = -b.vz * BZ.TUNE.bounce; b.vx *= .82; b.vy *= .82; }
      else { b.vz = 0; if (b.phase === 'air') b.phase = 'roll'; }
    }
    if (b.phase === 'roll') {
      const sp = Math.hypot(b.vx, b.vy), ns = Math.max(0, sp - BZ.ROLL_DECEL * dt);
      const k = sp > 0 ? ns / sp : 0;
      b.vx *= k; b.vy *= k;
      if (ns < 8) { b.phase = 'dead'; b.stopped = true; b.stopDist = r / BZ.FT; }
    }
  }
  if (b.phase === 'air' && b.z === 0 && b.vz === 0) b.phase = 'roll';
  if (!b.stopped && (r > 2400 || b.t > 16)) { b.phase = 'dead'; b.stopped = true; b.stopDist = r / BZ.FT; }
};

// What the ball is, once it is over: 'foul' (it landed foul), 'hr' (over the wall in fair ground), or the hit by how far
// it rolled: a wall-bounce is a double; otherwise single, double or triple by its stopping distance.
BZ.ballResult = b => {
  if (!b.landed) return 'air';
  if (!b.fair) return 'foul';
  if (b.homer) return 'hr';
  if (b.wall) return 'double';
  const d = b.stopDist || b.landDist;
  return d <= 200 ? 'single' : d <= 290 ? 'double' : 'triple';
};

// ---- 14-field.js
// Fielding: nine fielders in their home spots, one chaser at a time (the one nearest where the ball will be), catches
// in the air, pickups on the ground, and the throw that decides a play. Pure: the scene draws the fielders and the ball.
//
// A play: the ball is struck (time 0). A fielder who reaches it in time catches it (a fly, low enough) or picks it up (a
// grounder). The throw goes to a base; it is out if it gets there before the runner. Runners move the way the hit or the
// play sends them. The human fielder can steer the chaser, dive (a wider catch, at the price of a stumble) and choose the
// base for a throw by pressing a direction in the moment after the pick-up.
BZ.FIELD = {
  P:  { x: 768, y: 969 }, C: { x: 768, y: 1150 },
  '1B': { x: 915, y: 955 }, '2B': { x: 868, y: 858 }, SS: { x: 668, y: 858 }, '3B': { x: 621, y: 955 },
  LF: { x: 380, y: 585 }, CF: { x: 768, y: 430 }, RF: { x: 1156, y: 585 }
};
BZ.ROLES = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
BZ.CATCH_Z = 14;   // a fly is caught as it comes down through this height (U, about 6 ft)
BZ.makeFielders = () => BZ.ROLES.map(role => ({ role, x: BZ.FIELD[role].x, y: BZ.FIELD[role].y, hx: BZ.FIELD[role].x, hy: BZ.FIELD[role].y,
  human: false, dive: 0, face: 0 }));

// A runner's time to cover one base (the basepath is 90 ft).
BZ.runTime = (u = BZ.BASE_U) => u / (BZ.TUNE.runSpeed * BZ.FT);

// The move toward a point at a speed (U/s), and the step taken.
const stepToward = (f, tx, ty, speed, dt) => {
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const s = Math.min(d, speed * dt);
  f.x += dx / d * s; f.y += dy / d * s;
  f.face = Math.atan2(dy, dx);
};

// The defense for one play: the state machine from the strike to the base. Call step(dt, human) every fixed step.
// human: { team: bool (the defense is human), move: [x, y] (the stick, screen directions), dive: bool, pick: 'first'|'second'|'third'|null }.
BZ.Play = class Play {
  constructor(S, ball, fielders) {
    this.S = S; this.ball = ball; this.F = fielders;
    this.phase = 'flight';          // 'flight' | 'fielded' | 'throw' | 'over'
    this.chaser = null; this.holder = null; this.target = null;
    this.pickT = 0; this.throwT = 0; this.throwStart = null; this.throwEnd = null;
    this.diveT = 0; this.events = []; this.result = null;
    this.depth = 0;  // distance from home of the catch or the pick-up, in feet
  }

  // The fielder whose job this ball is: the nearest one to where it will be (its landing point while it's in the air).
  pickChaser() {
    const b = this.ball;
    // a fly is run to where it will be at the height a glove catches it, not to the ground under it
    const L = b.phase === 'air' && !b.landed ? BZ.predictLanding(b, BZ.CATCH_Z) : { x: b.x + b.vx * .3, y: b.y + b.vy * .3 };
    let best = null, bd = Infinity;
    for (const f of this.F) {
      if (f.role === 'P' || f.role === 'C') continue;
      const d = Math.hypot(f.x - L.x, f.y - L.y) - (this.chaser === f ? 30 : 0);   // a little hysteresis, so it doesn't flicker
      if (d < bd) { bd = d; best = f; }
    }
    this.chaser = best; this.L = L;
    return best;
  }

  step(dt, human = {}) {
    if (this.phase === 'over') return this.events;
    if (this.phase === 'flight') this.flight(dt, human);
    else if (this.phase === 'fielded') this.fielded(dt, human);
    else if (this.phase === 'throw') this.throwing(dt);
    return this.events;
  }

  flight(dt, human) {
    const b = this.ball;
    this.t = (this.t || 0) + dt;
    const chaser = this.pickChaser();
    // the fielders take a moment to read the ball off the bat; a human's chaser moves at once
    const ready = this.t >= BZ.TUNE.reactTime;
    for (const f of this.F) {
      if (f.role === 'P' || f.role === 'C') continue;
      if (!ready && !(f === chaser && f.human)) { if (f.dive > 0) f.dive -= dt; continue; }
      if (f === chaser && f.human) {
        // a human fielder: auto-runs to the spot, and the stick steers from there
        const sp = BZ.TUNE.fielderSpeed * (f.dive > 0 ? 1.35 : 1);
        const mx = human.move ? human.move[0] : 0, my = human.move ? human.move[1] : 0;
        f.x += mx * sp * dt * .9; f.y += my * sp * dt * .9;
        stepToward(f, this.L.x, this.L.y, sp * .55, dt);
      } else if (f === chaser) {
        stepToward(f, this.L.x, this.L.y, BZ.TUNE.fielderSpeed * (f.dive > 0 ? 1.35 : 1), dt);
      } else {
        const k = .22;
        stepToward(f, f.hx + (this.L.x - f.hx) * k, f.hy + (this.L.y - f.hy) * k, BZ.TUNE.fielderSpeed * .8, dt);
      }
      if (f.dive > 0) f.dive -= dt;
    }
    if (human.dive && chaser && chaser.human && chaser.dive <= 0) chaser.dive = .45;
    BZ.stepBall(b, dt);

    if (b.landed && !b.fair && !b.caught) {
      // a foul ball: no play, the count takes it
      this.end({ kind: 'foul' });
      return;
    }
    if (!b.landed && b.z <= BZ.CATCH_Z + 6 && chaser) {
      // a fly ball low enough to catch, under a fielder's glove
      const reach = BZ.TUNE.catchReach * BZ.FT * 2.2 * (chaser.dive > 0 ? 1.8 : 1);
      if (Math.hypot(chaser.x - b.x, chaser.y - b.y) <= reach) {
        b.caught = true;
        this.depth = BZ.ft(Math.hypot(b.x - BZ.HX, b.y - BZ.HY));
        this.holder = chaser;
        this.events.push({ type: 'caught', at: { x: b.x, y: b.y }, depth: this.depth, fielder: chaser.role });
        this.end({ kind: 'caught', deep: this.depth >= 250 });
        return;
      }
    }
    if (b.landed && b.z <= 1 && chaser) {
      // a grounder that the chaser reaches while it's on the ground: picked up
      const reach = BZ.TUNE.catchReach * BZ.FT * (chaser.dive > 0 ? 1.8 : 1) + 4;
      if (Math.hypot(chaser.x - b.x, chaser.y - b.y) <= reach) {
        this.holder = chaser; this.phase = 'fielded'; this.pickT = b.t;
        this.depth = BZ.ft(Math.hypot(b.x - BZ.HX, b.y - BZ.HY));
        b.vx = 0; b.vy = 0; b.vz = 0; b.phase = 'dead'; b.stopped = true;
        this.events.push({ type: 'fielded', fielder: chaser.role, at: { x: chaser.x, y: chaser.y } });
        return;
      }
    }
    if (b.stopped && !b.caught && this.phase === 'flight') {
      // nobody got it: the ball is a hit, decided by where it stopped
      this.end({ kind: 'hit', type: BZ.ballResult(b) });
    }
  }

  // The fielder holds the ball for a moment: the human can pick a base; otherwise the CPU chooses.
  fielded(dt, human) {
    this.holderT = (this.holderT || 0) + dt;
    const pick = human.pick && this.holder && this.holder.human ? human.pick : null;
    if (pick !== null || this.holderT > .55 || (this.holder && !this.holder.human)) {
      this.target = this.chooseTarget(pick);
      this.phase = 'throw';
      const base = BZ.bases()[this.target];
      const dist = Math.hypot(base.x - this.holder.x, base.y - this.holder.y);
      this.throwStart = this.pickT + this.holderT;
      this.throwEnd = this.throwStart + .18 + dist / BZ.TUNE.throwSpeed;
      this.events.push({ type: 'throw', target: this.target, from: this.holder.role });
    }
  }

  // Throws go where a runner is forced, or to first. A human's pick is honoured only where it is a real force.
  chooseTarget(pick) {
    const b = this.S.bases;
    const want = { first: 0, second: 1, third: 2 }[pick];
    if (want === 1 && b[0]) return 1;
    if (want === 2 && b[0] && b[1]) return 2;
    if (want === 0) return 0;
    if (b[0] && !b[1]) return 1;
    return 0;
  }

  throwing(dt) {
    this.throwT = (this.throwT || 0) + dt;
    if (this.throwT < this.throwEnd - this.throwStart) return;
    this.end({ kind: 'throw', target: this.target });
  }

  // The play is over: the rules decide the outs, the runs and the next base state, in a fixed order.
  end(res) {
    this.phase = 'over';
    const S = this.S;
    let out = null;
    if (res.kind === 'foul') out = { kind: 'foul' };
    else if (res.kind === 'caught') out = Object.assign({ kind: 'caught' }, BZ.caughtFly(S, res.deep));
    else if (res.kind === 'hit') { BZ.hit(S, res.type); out = { kind: 'hit', type: res.type }; }
    else if (res.kind === 'throw') {
      // The throw's arrival against the runner's: all times are from the strike. A runner forced toward the throw's base
      // is out if the ball gets there first; the batter is out at first on the same test.
      const tt = this.throwEnd - this.pickT;
      const arrive = BZ.runTime();
      const forcedRunner = res.target > 0 && !!S.bases[res.target - 1];
      const batterOut = res.target === 0 && tt < arrive;
      const runnerOut = forcedRunner && tt < arrive;
      const r = BZ.groundPlay(S, res.target, { batterOut, runnerOut });
      out = { kind: 'ground', target: res.target, batterOut, runnerOut, tt, r };
    }
    this.result = out;
    this.events.push({ type: 'resolved', out });
  }
};

// ---- 20-ai.js
// The CPU: a pitcher's choice (11-pitch.js), a batter's swing, and the bot that plays a human's side with the same
// decisions. The CPU's swings use the match's own random stream, so a seeded match is the same every run. Its level
// (the CPU level setting, 1 to 8) sets how well it times the ball and how often it swings at a bad pitch.
BZ.cpuSwing = (S, plan, rng = BZ.rng.play, level = BZ.TUNE.cpuLevel) => {
  const loc = BZ.plateLoc(plan);
  const inZ = BZ.inZone(loc.lat, loc.h);
  const chance = inZ ? .74 : (S.strikes === 2 ? .42 : .16);
  if (rng() > chance) return null;
  const sloppy = (8 - level) / 7;                  // 0 at level 8, 1 at level 1
  const timing = (rng() - .5) * 2 * (.05 + .14 * sloppy);
  // the CPU aims around the ball: mostly liners and grounders (a low aim) with some fly balls, the way a crowd likes it
  const reticle = { lat: loc.lat + (rng() - .5) * (.3 + .9 * sloppy), h: loc.h - .2 + rng() * 1.0 + (rng() < .25 ? .9 : 0) + (rng() - .5) * .4 * sloppy };
  return { swingT: timing, reticle };
};

// A whole bot decision for the pitch being thrown: what the CPU pitcher does, and what the CPU batter does with it.
BZ.botPitch = (S, rng = BZ.rng.play) => {
  const c = BZ.cpuPitch(S, rng);
  return BZ.planPitch({ pitch: c.pitch, aimLat: c.aimLat, aimH: c.aimH, release: c.release, rng });
};

// ---- 21-view.js
// The look: the field (a TileMap in the Broadcast view: grass, the dirt, the chalk, the fence and the stands), the Plate Cam
// (a perspective drawn in screen pixels, from 8 ft behind the plate), the players as Humanoid rigs, and the HUD.
// Nothing here changes the game; the scenes call these to draw what the state says.

// ---- the players ------------------------------------------------------------------------------------------------------
BZ.rigFor = (team, o = {}) => new E.Humanoid(Object.assign({
  size: 1.25, build: o.build || 'heroic', hat: o.hat === undefined ? team.hat : o.hat, weapon: null, sleeves: 'short', outfit: 'shirt',
  hair: o.hair || 'short',
  colors: { skin: team.skin, hair: team.hair, cloth: team.cloth, pants: team.pants, boot: team.boot, belt: team.trim,
            trim: team.trim, glove: '#8a5a2a', metal: '#dadada', plate: team.trim, eye: '#1a1a1a', iris: '#2a2a40' }
}, o.extra || {}));

// One team's players on the field: the nine fielders, the pitcher and catcher, a batter, and three runner's rigs.
BZ.makeRigs = team => {
  const rigs = { fielders: {}, runners: [] };
  for (const role of BZ.ROLES) rigs.fielders[role] = BZ.rigFor(team, { build: role === 'C' ? 'bulky' : 'heroic' });
  rigs.far = BZ.rigFor(team, { build: 'heroic', extra: { size: .6 } });     // the pitcher, far down the Plate Cam's field
  rigs.batter = BZ.rigFor(team, { build: 'heroic', hair: 'spiky' });
  rigs.runners = [0, 1, 2].map(() => BZ.rigFor(team, { build: 'chibi' }));
  return rigs;
};
BZ.umpireRig = () => BZ.rigFor({ hat: 'cap', skin: '#c89070', hair: '#3a2a20', cloth: '#1f2a3a', pants: '#1a1a22', boot: '#101010', trim: '#e8e8e8' }, { build: 'bulky' });

// ---- the field -------------------------------------------------------------------------------------------------------
// The floor is painted from the world's geometry, so the lines and the dirt sit where the rules put them.
BZ.fieldFloor = (x, y) => {
  const dx = x - BZ.HX, dy = y - BZ.HY, r = Math.hypot(dx, dy);
  const th = BZ.thetaOf(x, y), fair = Math.abs(th) <= 45;
  const park = BZ.PARKS[BZ.park] || BZ.PARKS.kernel;
  const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const speck = (hash - Math.floor(hash)) * .06;
  const stripe = Math.floor(y / 56) % 2;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  let base = hex(stripe ? park.grass : park.grass2);
  if (fair && r <= 300) base = hex(park.dirt);                                   // the infield
  if (fair && r > BZ.fenceAt(th) - 38 && r <= BZ.fenceAt(th)) base = hex(park.dirt);   // the warning track
  // the foul lines, 2 U wide, from home out along 45 degrees
  const d1 = Math.abs(dx * .7071 + dy * .7071), d2 = Math.abs(dx * .7071 - dy * .7071);
  const along1 = dx * .7071 - dy * .7071, along2 = -dx * .7071 - dy * .7071;
  if ((d1 < 2.2 && along1 > 0) || (d2 < 2.2 && along2 > 0)) base = hex(park.chalk);
  // the basepaths and the bases
  for (const b of BZ.bases().slice(0, 3)) {
    if (Math.abs(x - b.x) < 10 && Math.abs(y - b.y) < 10) base = hex('#ffffff');
  }
  if (Math.hypot(x - BZ.MOUND.x, y - BZ.MOUND.y) < 24) base = hex('#c49a62');
  if (Math.abs(x - BZ.HX) < 9 && Math.abs(y - BZ.HY) < 9) base = hex('#ffffff');
  return [Math.min(255, base[0] + speck * 255), Math.min(255, base[1] + speck * 255), Math.min(255, base[2] + speck * 255)];
};

// The field's floor and walls, drawn for any view of the field (a match, a derby, a ball's flight).
BZ.drawFieldBase = r => { BZ.field.drawFloor(r); BZ.field.queueWalls(r); };

// The map: cells of 16 U. Fence cells sit on the fair arc, the stands behind them, open ground everywhere else.
BZ.buildField = () => {
  const rows = [];
  for (let cy = 0; cy < BZ.MAP_H; cy++) {
    let row = '';
    for (let cx = 0; cx < BZ.MAP_W; cx++) {
      const x = cx * BZ.CELL + 8, y = cy * BZ.CELL + 8;
      const r = Math.hypot(x - BZ.HX, y - BZ.HY), th = BZ.thetaOf(x, y);
      const F = BZ.fenceAt(th);
      let ch = '.';
      if (Math.abs(th) <= 45) {
        if (r >= F && r < F + 28) ch = '#';          // the fence
        else if (r >= F + 28 && r < F + 110) ch = '$';    // the stands
      }
      row += ch;
    }
    rows.push(row);
  }
  const map = new E.TileMap({
    rows, legend: { '#': 1, '$': 2, '.': 0 },
    types: {
      1: { h: BZ.FENCE_H, top: '#2c5e2c', side: '#2a4a2e', face: 'plank', cut: true },
      2: { h: 70, top: '#4a3a5a', side: '#2c2436', face: 'brick', roof: 'speckle', cut: true }
    },
    floorTex: BZ.fieldFloor,
    outside: '#2f5a2a'
  });
  return map;
};

// ---- the Plate Cam ---------------------------------------------------------------------------------------------------
// A glance at the scene's ground: the grass and the dirt of the infield, the mound, the plate, the box and the zone.
BZ.drawPlateGround = (g, W, H, park) => {
  const hor = Math.round(H * BZ.HORIZON);
  const [t0, t1] = park.night ? ['#0c1430', '#1d3a2a'] : ['#7fb4e6', '#f2c88a'];
  E.px.rect(g, 0, 0, W, hor, '#000');
  // the stands: dark tiers with a crowd of coloured dots
  for (let row = 0; row < 5; row++) {
    const y = Math.round(hor - 30 + row * 6);
    E.px.rect(g, 0, y, W, 6, row % 2 ? '#2a2236' : '#332a44');
  }
  for (let i = 0; i < 260; i++) {
    const x = (i * 37) % W, y = Math.round(hor - 26 + ((i * 13) % 26));
    E.px.rect(g, x, y, 2, 2, ['#e8443a', '#3b82f6', '#f5b700', '#ffffff', '#22c55e', '#c084fc'][i % 6]);
  }
  E.px.rect(g, 0, hor, W, H - hor, park.grass);
  E.px.rect(g, 0, hor, W, 2, t1);
  // the infield's dirt: a wedge from the plate to the mound and the base lines
  const P = (lat, h, d) => BZ.project(lat, h, d, W, H);
  const dirt = [P(-6, 0, 0), P(6, 0, 0), P(18, 0, 60), P(-18, 0, 60)].map(p => [p.x, p.y]);
  E.px.poly(g, dirt, park.dirt);
  const mound = P(0, 0, 60.5), mr = Math.max(3, 4 * mound.s);
  E.px.ell(g, mound.x, mound.y, mr * 1.6, mr * .6, '#c49a62');
  // the batter's box and the plate
  const bx = [P(-3.5, 0, -1), P(-1.2, 0, -1), P(-1.2, 0, 5), P(-3.5, 0, 5)].map(p => [p.x, p.y]);
  E.px.poly(g, bx, '#ddd6c0');
  const plate = [P(-.71, 0, 0), P(.71, 0, 0), P(.71, 0, -.5), P(0, 0, -1), P(-.71, 0, -.5)].map(p => [p.x, p.y]);
  E.px.poly(g, plate, '#ffffff');
};

// The strike zone, drawn on the plate's plane, and the pitch's path behind the ball.
BZ.drawZone = (g, W, H) => {
  const Z = BZ.ZONE, P = (lat, h) => BZ.project(lat, h, 0, W, H);
  const a = P(Z.lo, Z.bot), b = P(Z.hi, Z.bot), c = P(Z.hi, Z.top), d = P(Z.lo, Z.top);
  for (const [p, q] of [[a, b], [b, c], [c, d], [d, a]]) E.px.line(g, p.x, p.y, q.x, q.y, '#ffffff', 1);
};

// The players in the Plate Cam's space: the pitcher far down the field (a smaller rig), the batter at the plate's side.
BZ.drawPlatePlayers = (g, W, H, sc) => {
  const at = (rig, lat, depth) => { const p = BZ.project(lat, 0, depth, W, H); rig.draw(g, Math.round(p.x), Math.round(p.y), sc.view); };
  if (sc.pitcher) at(sc.pitcher, 0, BZ.PLATE.dist - 2);
  if (sc.batter) at(sc.batter, -2.1, 1.2);
};

// The batter's bat. At rest it is on the shoulder, held at the hands; the swing (k 0..1) brings the head through the
// zone to the reticle's place. Drawn in the Plate Cam's space, from the hands to the head.
BZ.drawBat = (g, W, H, sc) => {
  const P = (lat, h, d) => BZ.project(lat, h, d, W, H);
  const hands = P(-2.1, 2.7, 1.2);
  const rest = P(-3.0, 3.9, 1.2);
  const k = BZ.clamp(sc.swing, 0, 1);
  const eased = k * k * (3 - 2 * k);
  const head = P(BZ.lerp(-3.0, sc.reticle.lat, eased), BZ.lerp(3.9, sc.reticle.h, eased), BZ.lerp(1.2, 0.2, eased));
  const tip = k > 0 ? head : rest;
  E.px.line(g, hands.x, hands.y, tip.x, tip.y, '#c89a5a', Math.max(2, Math.round(hands.s * .32)));
  E.px.line(g, hands.x, hands.y, tip.x, tip.y, '#7a4a20', 1);
};

// The ball, in the Plate Cam at its place on the path (t 0..1) with a trail and a shadow.
BZ.drawPitchBall = (g, W, H, plan, t, trail) => {
  const pos = BZ.pitchAt(plan, t);
  const p = BZ.project(pos.lat, pos.h, pos.depth, W, H);
  const shadow = BZ.project(pos.lat, 0, pos.depth, W, H);
  E.px.ell(g, shadow.x, shadow.y, Math.max(1, .7 * shadow.s), Math.max(1, .25 * shadow.s), '#0000001f');
  for (let i = 0; i < trail.length; i++) {
    const q = trail[i];
    const a = BZ.project(q.lat, q.h, q.depth, W, H);
    E.px.disc(g, a.x, a.y, Math.max(1, .5 * a.s * (i / trail.length)), '#ffffff55');
  }
  E.px.disc(g, p.x, p.y, Math.max(2, .28 * p.s), '#ffffff');
  E.px.disc(g, p.x - .1 * p.s, p.y - .1 * p.s, Math.max(1, .12 * p.s), '#ffffffcc');
};

// ---- the HUD ---------------------------------------------------------------------------------------------------------
BZ.text = (g, s, x, y, color, o = {}) => E.font.text(g, s, x, y, color, Object.assign({ shadow: '#000' }, o));

// The scorebug: the two teams, the runs by inning, the count, the outs and the diamond.
BZ.drawScorebug = (g, S, x, y) => {
  const w = 240, h = 64;
  E.ui.box(g, x, y, w, h, { bg: ['#1a1d2a', '#0b0d16'], border: '#c8a060', alpha: .9 });
  [0, 1].forEach(t => {
    const yy = y + 7 + t * 19, batting = BZ.battingTeam(S) === t;
    E.px.rect(g, x + 7, yy + 2, 5, 13, BZ.TEAMS[t].color);
    BZ.text(g, BZ.TEAMS[t].short, x + 17, yy + 3, '#ffffff', { scale: 1.5 });
    BZ.text(g, String(S.score[t]), x + 170, yy + 2, '#ffe6a0', { scale: 1.8, align: 'right' });
    if (batting) E.px.poly(g, [[x + 180, yy + 3], [x + 186, yy + 9], [x + 180, yy + 15]], '#ffe6a0');
  });
  BZ.text(g, (S.top ? 'TOP ' : 'BOT ') + S.inning, x + w - 8, y + 7, '#c8d0f0', { scale: 1.1, align: 'right' });
  // the count on one line: balls, strikes, outs
  const dots = (cx, on, n, c) => { for (let i = 0; i < n; i++) E.px.disc(g, cx + i * 9, y + 50, 3, i < on ? c : '#2a2e40'); };
  BZ.text(g, 'B', x + 8, y + 44, '#7ad06a', { scale: 1.1, shadow: null }); dots(x + 20, S.balls, 4, '#7ad06a');
  BZ.text(g, 'S', x + 62, y + 44, '#ffb020', { scale: 1.1, shadow: null }); dots(x + 74, S.strikes, 3, '#ffb020');
  BZ.text(g, 'O', x + 110, y + 44, '#ff5a4a', { scale: 1.1, shadow: null }); dots(x + 122, S.outs, 3, '#ff5a4a');
  // the diamond, right side: occupied bases lit
  const cx = x + w - 30, cy = y + 36, b = S.bases;
  E.px.poly(g, [[cx, cy - 11], [cx + 11, cy], [cx, cy + 11], [cx - 11, cy]], '#2a5a2a');
  const pts = [[cx + 11, cy], [cx, cy - 11], [cx - 11, cy]];
  pts.forEach((p, i) => E.px.rect(g, p[0] - 3, p[1] - 3, 6, 6, b[i] ? '#ffe6a0' : '#8a92b0'));
  E.px.rect(g, cx - 2, cy + 9, 4, 4, '#ffffff');
};

// The release meter: a bar with the sweet spot in its middle and a marker that sweeps. p is the marker (0..1).
BZ.drawMeter = (g, x, y, w, p) => {
  E.ui.box(g, x - 4, y - 4, w + 8, 16, { bg: ['#101420', '#080a12'], border: '#c8a060', alpha: .9 });
  const half = BZ.TUNE.releaseSweet / 2;
  E.px.rect(g, x + w * (.5 - half), y, Math.max(1, w * half * 2), 8, '#7ad06a');
  E.px.rect(g, x + w * p - 2, y - 3, 4, 14, '#ffffff');
};

// A meter for the Batzooka (or the Fireball): full when it's ready.
BZ.drawBatzookaMeter = (g, x, y, w, value, label, ready) => {
  BZ.text(g, label, x, y - 12, ready ? '#ffe6a0' : '#c8d0f0', { scale: 1.2 });
  E.ui.bar(g, x, y, w, 8, BZ.clamp(value / 100, 0, 1), ready ? '#ffb020' : '#ff7a3a');
  if (ready) BZ.text(g, BZ.prompt('power', 'USE'), x + w + 8, y - 2, '#ffe6a0', { scale: 1.2 });
};

// The prompt for an action on the device used last (glyphs follow the input). An empty label shows the action name.
BZ.prompt = (action, verb) => {
  const g = BZ.game;
  const l = g && g.input ? g.input.label(action) : '';
  return (l ? l + ' ' : '') + verb;
};

// A stamp: a large line in the middle of the screen, for the umpire's call and the play's result.
BZ.drawStamp = (g, W, H, s, col, sub) => {
  if (!s) return;
  const cx = W / 2, cy = H * .5;
  E.font.title(g, s.text, cx, cy, { scale: 3, colors: [col, '#ffffff'], outline: '#000000', align: 'center' });
  if (sub) BZ.text(g, sub, cx, cy + 34, '#ffffff', { align: 'center', scale: 1.4 });
};

// ---- 30-match.js
// The match: the scene that plays innings. It owns the phases of a plate appearance (intro, ready, windup, meter, pitch,
// inplay, after, final), the input of whoever controls each side, the two views (the Plate Cam for the duel, the field
// for the play), the HUD and the commentary. The rules and physics are the pure modules (10 to 14); this scene asks them
// what happens and shows it.
//
// Control: team 1 (the home team) is player 1; team 0 (the visitors) is player 2 when one has joined, else the CPU.
// On defense the pitcher and the chaser are the fielding team's controller; at the plate, the batting team's.
BZ.LINES = {
  intro: ['Ladies and gentlemen, the game is about to begin. The corn is high and the beer is cold.'],
  ball: ['Ball one. The crowd has something to say about that.', 'That one was outside. Way outside.'],
  strike: ['Strike! The scoreboard is blinking at him.', 'Right down the middle! Hooray!'],
  foul: ['Foul ball! Into the corn!', 'That one went foul, and somebody in row nine is wearing it.'],
  k: ['Strike three! He is out, and he is going home to tell the dog.', 'Struck him out looking! The dugout is crying.'],
  walk: ['Four balls. The pitcher has forgotten the way to the plate.'],
  single: ['A single, and that one has a little spin on it!', 'Base hit! The fans are tossing their hats!'],
  double: ['A double into the gap! Two bases and a cloud of dust!'],
  triple: ['A triple! He is going like corn in a windstorm!'],
  hr: ['WAY BACK! WAY BACK! That one is GONE!', 'Home run! The Batzooka has spoken!'],
  caught: ['Caught on the warning track! Oh my, what a catch!', 'Hauled it in! That fly is an out, folks.'],
  groundOut: ['Grounder to the infield, and the throw beats him. Out!', 'Nimble work in the infield. He is out.'],
  forceOut: ['Out at second! The runner was a bit slow on the basepaths.'],
  safe: ['Safe! By a whisker!', 'He beat the throw. Safe at first.'],
  over: ['That is the ballgame! Thank you for coming out to Kernel Field!'],
  walkoff: ['A walk-off! The home crowd goes wild! Bring the cows out!']
};

// A line of commentary in the announcer's box; the big calls are also babbled (the Animalese voice).
BZ.say = (talk, key) => {
  const pool = BZ.LINES[key];
  if (!pool || !talk) return;
  const line = BZ.pick(BZ.rng.fx, pool);
  talk.say(line, { name: 'PA', auto: 2.8, modal: false });
  if (['hr', 'k', 'over', 'walkoff'].includes(key)) BZ.babble(line, { pitch: 230, rate: .07, vol: .12 });
};

// The match's state for a run: the rules, the two teams' rigs and fielders, the phase and its clocks.
// opts: { innings, human: [visitorsHuman, homeHuman], drill, attract, cpuLevel, seed }.
BZ.newMatchRun = (opts = {}) => {
  BZ.meter = [0, 0];
  BZ.seedMatch(opts.seed || 20261104);
  const S = BZ.newMatch({ innings: opts.innings || BZ.TUNE.innings });
  return {
    opts, S,
    rigs: [BZ.makeRigs(BZ.TEAMS[0]), BZ.makeRigs(BZ.TEAMS[1])],
    fielders: [BZ.makeFielders(), BZ.makeFielders()],
    human: [!!(opts.human && opts.human[0]), !!(opts.human && opts.human[1])],
    phase: 'intro', clock: 0, introT: 2.4, afterT: 0, finalT: 3.2,
    needNewBatter: true, paPrevKey: BZ.halfKey(S), paEnded: false,
    pitchChoice: 'fastball', aim: { lat: 0, h: 2.6 }, fireball: false, pending: null,
    meterT: 0, meterP: .5, windupK: 0, cpuPlanT: 1,
    plan: null, pt: 0, trail: [], pitchPos: null, swung: false, swing: null, swingK: 0, swingPhase: null,
    cpuSwing: null, swingAt: 0, reticle: null, prevPointer: null,
    play: null, ball: null, cam: 'plate', batterRunT: 0, basePx: [],
    stamp: null, talk: null, events: [],
    drill: opts.drill ? { kind: opts.drill.kind, goal: opts.drill.goal, got: 0 } : null
  };
};

// Start a match: the scene switches to it, and it begins with the first half's intro.
BZ.startMatch = (game, opts) => {
  BZ.M = BZ.newMatchRun(opts);
  game.go('match', opts);
};

// The input that controls a team: player 1 is the home team, player 2 (if joined) the visitors; otherwise the CPU.
BZ.controllerInput = (game, team) => {
  const p1 = BZ.M && BZ.M.opts.p1 !== undefined ? BZ.M.opts.p1 : 1;
  return (team === p1 ? game.players[0] : game.players[1]) || null;
};

// Hold the half's key: the same for the whole half-inning, so a change of half is seen.
BZ.halfKey = S => S.inning + (S.top ? 't' : 'b');

// Resolve a swing at the pitch's clock: contact, a foul or a whiff, and the reticle's place. A catch drill's contact is
// a fly ball to center, to give the human fielder something to catch.
BZ.resolveSwing = (M, swingPt, reticle, batzooka) => {
  const plan = M.plan, plate = BZ.plateLoc(plan);
  let c = BZ.contact({ swingT: swingPt - plan.time, reticle, plate, batzooka });
  if (M.drill && M.drill.kind === 'catch' && c.type === 'hit') c = Object.assign(c, { exit: 330, launch: 40, spray: 0 });
  M.swung = true;
  M.swing = Object.assign({ at: swingPt, reticle, batzooka }, c);
  M.swingPhase = 'swing'; M.swingK = 0;
  M.events.push({ type: 'swing', result: c.type, batzooka, q: c.q });
  return c;
};

BZ.matchScene = {
  pausable: true, view: 'threequarter', touch: false,
  enter(data) {
    const game = BZ.game, M = BZ.M;
    BZ.field = BZ.field || BZ.buildField();
    game.lights.enabled = BZ.park === 'moondome';
    game.lights.ambient = .55;
    M.talk = BZ.talkFor(game);
    if (!(data && data.resume)) BZ.beginHalfIntro(M);   // back from the pause menu's dev mode: the match picks up where it was
    BZ.playSong('match');
  },
  exit() { BZ.game.lights.enabled = false; BZ.playSong(null); },
  update(dt) { BZ.matchUpdate(BZ.game, BZ.M, dt); },
  draw(r) { BZ.matchDraw(r, BZ.M); }
};

BZ.talkFor = game => BZ.talk || (BZ.talk = new E.Dialog(game));

// The intro card for a half: TOP or BOTTOM of an inning, with the batting team named.
BZ.beginHalfIntro = M => {
  const S = M.S;
  M.phase = 'intro'; M.clock = 0; M.introT = 2.2; M.cam = 'plate';
  M.needNewBatter = true;
  M.paPrevKey = BZ.halfKey(S);
  M.stamp = { text: (S.top ? 'TOP ' : 'BOTTOM ') + BZ.ordinal(S.inning).toUpperCase(), color: '#ffe6a0', t: 2.2, sub: BZ.TEAMS[BZ.battingTeam(S)].name + ' at bat' };
  M.swung = false; M.swing = null; M.plan = null; M.pending = null;
};

// Each frame. Inputs are read here, once; the phases change the state; the rigs and the camera follow.
BZ.matchUpdate = (game, M, dt) => {
  if (!M) return;
  const S = M.S, bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  const pitcherIn = M.human[ft] ? BZ.controllerInput(game, ft) : null;
  const batterIn = M.human[bt] ? BZ.controllerInput(game, bt) : null;
  M.clock += dt;
  if (M.stamp) { M.stamp.t -= dt; if (M.stamp.t <= 0 && M.phase !== 'intro' && M.phase !== 'after') M.stamp = null; }
  BZ.tickSwing(M, dt);

  switch (M.phase) {
    case 'intro':
      M.introT -= dt;
      if (M.introT <= 0) { M.stamp = null; M.phase = 'ready'; M.clock = 0; M.cpuPlanT = .9 + BZ.rng.fx() * .4; }
      break;
    case 'ready':
      if (M.needNewBatter) { BZ.beginPA(S); M.needNewBatter = false; M.paEnded = false; M.reticle = null; }
      M.cam = 'plate';
      if (!M.human[ft] || M.opts.attract) {
        if (M.clock >= M.cpuPlanT) { M.plan = BZ.botPitch(S); M.phase = 'windup'; M.clock = 0; }
      } else if (pitcherIn) BZ.humanPitchReady(game, M, pitcherIn, dt);
      break;
    case 'windup':
      M.windupK = Math.min(1, M.clock / .55);
      if (M.clock >= .55) {
        if (M.human[ft] && !M.opts.attract) { M.phase = 'meter'; M.meterT = 0; }
        else BZ.release(M, .5);
      }
      break;
    case 'meter':
      M.meterT += dt;
      M.meterP = .5 + .5 * Math.sin(M.meterT * Math.PI * 2 / 1.15 - Math.PI / 2);
      if ((pitcherIn && pitcherIn.pressed('confirm')) || M.meterT > 2.4) BZ.release(M, M.meterP);
      break;
    case 'pitch':
      BZ.pitchUpdate(game, M, dt, batterIn);
      break;
    case 'inplay':
      BZ.playUpdate(game, M, dt, pitcherIn);
      break;
    case 'after':
      M.afterT -= dt;
      if (M.afterT <= 0) BZ.nextAfter(game, M);
      break;
    case 'final':
      M.finalT -= dt;
      if (M.finalT <= 0) BZ.endMatch(game, M);
      break;
  }
  BZ.rigsUpdate(M, dt);
  BZ.focusCam(game, M);
  M.batterRunT = M.ball ? Math.min(1, M.batterRunT + dt / Math.max(.1, BZ.runTime())) : 0;
};

// The human pitcher's setup: the pitch (chips, Q/E, a click), the aim (stick, or the mouse), the Fireball, and a press to
// wind up. Clicking the pitch's chip picks it; a click anywhere else on the screen winds up.
BZ.humanPitchReady = (game, M, I, dt) => {
  const S = M.S, plist = BZ.PITCH_IDS, idx = plist.indexOf(M.pitchChoice);
  if (I.pressed('prevPitch')) M.pitchChoice = plist[(idx + plist.length - 1) % plist.length];
  if (I.pressed('nextPitch')) M.pitchChoice = plist[(idx + 1) % plist.length];
  const click = game.input.clicked();
  const onChip = click ? BZ.chipAt(click[0], click[1]) : null;
  const hover = BZ.chipAt(...(game.input.pointer() || [-1, -1]));
  if (onChip) M.pitchChoice = onChip;
  else if (hover) M.pitchChoice = hover;
  // the aim: the stick moves it; a mouse that moves puts it on the pointer
  const pt = game.input.pointer(), mv = I.move();
  if (pt && M.prevPointer && Math.abs(pt[0] - M.prevPointer[0]) + Math.abs(pt[1] - M.prevPointer[1]) > 2) {
    const p = BZ.plateFromScreen(pt[0], pt[1], game.W, game.H);
    M.aim = BZ.clampAim(p.lat, p.h);
  } else if (mv[0] || mv[1]) {
    M.aim = BZ.clampAim(M.aim.lat + mv[0] * 1.8 * dt, M.aim.h - mv[1] * 1.8 * dt);
  }
  M.prevPointer = pt ? pt.slice() : null;
  if (I.pressed('power') && BZ.meter[BZ.fieldingTeam(S)] >= 100) M.fireball = !M.fireball;
  if (I.pressed('confirm') || (click && !onChip)) {
    M.pending = { pitch: M.pitchChoice, aimLat: M.aim.lat, aimH: M.aim.h, superPitch: M.fireball };
    if (M.fireball) { BZ.meter[BZ.fieldingTeam(S)] = 0; M.fireball = false; }
    M.phase = 'windup'; M.clock = 0; M.prevPointer = null;
  }
};

// Pitch selection chips at the bottom-left of the screen: their rectangles for hover and click.
BZ.chipRects = game => BZ.PITCH_IDS.map((id, i) => ({ id, x0: game.W - 126, y0: 14 + i * 34, x1: game.W - 14, y1: 14 + i * 34 + 30 }));
BZ.chipAt = (x, y) => {
  const g = BZ.game;
  if (!g || x < 0) return null;
  for (const c of BZ.chipRects(g)) if (x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) return c.id;
  return null;
};

// The release: the pitch the pitcher chose, with the meter's place, goes. A CPU's plan is ready already.
BZ.release = (M, p) => {
  const S = M.S;
  let plan = M.plan;
  if (M.pending) {
    plan = BZ.planPitch({ pitch: M.pending.pitch, aimLat: M.pending.aimLat, aimH: M.pending.aimH, release: p, superPitch: M.pending.superPitch });
    M.pending = null;
  }
  M.plan = plan;
  M.pt = 0; M.phase = 'pitch'; M.clock = 0; M.trail = []; M.pitchPos = null;
  M.swung = false; M.swing = null; M.cpuSwing = null; M.swingAt = 0;
  // the batter: the CPU decides its swing now, unless a player is at the plate
  const bt = BZ.battingTeam(S);
  if (!M.human[bt] || M.opts.attract) {
    const sw = BZ.cpuSwing(S, plan, BZ.rng.play, M.opts.cpuLevel || BZ.TUNE.cpuLevel);
    if (sw) { M.cpuSwing = sw; M.swingAt = plan.time + sw.swingT; }
    if (M.drill && M.drill.kind === 'catch') { M.cpuSwing = { swingT: 0, reticle: BZ.plateLoc(plan) }; M.swingAt = plan.time; }
  }
  M.events.push({ type: 'pitch', pitch: plan.pitch, time: plan.time, miss: plan.miss, super: plan.super });
};

// The pitch in flight: the batter's swing (a player's press or the CPU's timed one), and the umpire's call on arrival.
BZ.pitchUpdate = (game, M, dt, batterIn) => {
  const plan = M.plan, S = M.S, bt = BZ.battingTeam(S);
  M.pt += dt;
  const pos = BZ.pitchAt(plan, Math.min(1, M.pt / plan.time));
  M.pitchPos = pos;
  M.trail.push({ lat: pos.lat, h: pos.h, depth: pos.depth });
  if (M.trail.length > 9) M.trail.shift();
  const clickAt = game.input.clicked();
  if (!M.swung && batterIn && !M.opts.attract) {
    const ret = BZ.batterAim(game, M, batterIn, dt);
    if (batterIn.pressed('confirm') || (clickAt && !BZ.chipAt(clickAt[0], clickAt[1]))) {
      const bz = !!(batterIn.pressed('power') && BZ.meter[bt] >= 100);
      if (bz) BZ.meter[bt] = 0;
      BZ.afterSwing(game, M, BZ.resolveSwing(M, M.pt, ret, bz));
    }
  } else if (!M.swung && M.cpuSwing && M.pt >= M.swingAt) {
    const bz = !!(M.opts.attract && BZ.meter[bt] >= 100);
    if (bz) BZ.meter[bt] = 0;
    BZ.afterSwing(game, M, BZ.resolveSwing(M, M.pt, M.cpuSwing.reticle, bz));
  }
  if (M.phase !== 'pitch') return;
  if (M.pt >= plan.time + .3) {
    if (!M.swung) {
      const at = BZ.plateLoc(plan);
      BZ.countEvent(game, M, BZ.inZone(at.lat, at.h) ? 'strike' : 'ball', false);
    }
    BZ.afterPitch(game, M);
  }
};

// A player's reticle: the stick moves it, the mouse puts it on the pointer; the default is the middle of the plate.
BZ.batterAim = (game, M, I, dt) => {
  const pt = game.input.pointer(), mv = I.move();
  M.reticle = M.reticle || { lat: 0, h: 2.6 };
  if (pt && M.prevPointer && Math.abs(pt[0] - M.prevPointer[0]) + Math.abs(pt[1] - M.prevPointer[1]) > 2) {
    const p = BZ.plateFromScreen(pt[0], pt[1], game.W, game.H);
    M.reticle = { lat: BZ.clamp(p.lat, -1.6, 1.6), h: BZ.clamp(p.h, .6, 4.6) };
  } else if (mv[0] || mv[1]) {
    M.reticle = { lat: BZ.clamp(M.reticle.lat + mv[0] * 1.6 * dt, -1.6, 1.6), h: BZ.clamp(M.reticle.h - mv[1] * 1.6 * dt, .6, 4.6) };
  }
  M.prevPointer = pt ? pt.slice() : null;
  return M.reticle;
};

// The swing's animation timer (the rig's swing and the bat), 0.32 s.
BZ.tickSwing = (M, dt) => {
  if (M.swingPhase === 'swing') {
    M.swingK = Math.min(1, M.swingK + dt / .32);
    if (M.swingK >= 1) M.swingPhase = null;
  }
};

// After a swing: contact sends the ball into play; a foul or a whiff is counted here.
BZ.afterSwing = (game, M, c) => {
  const S = M.S, ft = BZ.fieldingTeam(S);
  M.swing = Object.assign(M.swing, c);
  if (c.type === 'hit') {
    M.ball = BZ.launchBall({ exit: c.exit, launch: c.launch, spray: c.spray, batzooka: c.batzooka });
    M.play = new BZ.Play(S, M.ball, M.fielders[ft]);
    for (const f of M.fielders[ft]) f.human = !!M.human[ft] && !M.opts.attract;
    M.phase = 'inplay'; M.cam = 'field'; M.clock = 0; M.batterRunT = 0;
    BZ.sfx(c.batzooka ? 'rocket' : 'crack', { vol: c.batzooka ? .6 : 1 });
    if (c.batzooka) BZ.sfx('fire', { vol: .4 });
    return;
  }
  if (c.type === 'foul') { BZ.countEvent(game, M, 'foul', false); BZ.afterPitch(game, M); return; }
  BZ.countEvent(game, M, 'strike', true);   // a whiff: a swinging strike
  BZ.afterPitch(game, M);
};

// The count moves for a called or swung-at pitch. A walk, a strikeout or the half's end finishes the plate appearance.
// kind: 'ball' | 'strike' (called or swung at) | 'foul'. Returns the rules' event.
BZ.countEvent = (game, M, kind, swung) => {
  const S = M.S, ft = BZ.fieldingTeam(S);
  const ev = BZ.pitchCount(S, kind === 'ball' ? 'ball' : kind === 'strike' ? 'strike' : 'foul');
  const count = BZ.countText(S);
  M.events.push({ type: 'call', kind, ev: ev.ev, count });
  if (kind === 'ball') { BZ.sfx('ball'); M.stamp = { text: 'BALL', color: '#7ad0ff', t: 1, sub: count }; if (BZ.rng.fx() < .3) BZ.say(M.talk, 'ball'); }
  if (kind === 'strike') { BZ.sfx('strike'); M.stamp = { text: swung ? 'SWINGING STRIKE' : 'STRIKE', color: '#ffb020', t: 1, sub: count }; if (!swung && BZ.rng.fx() < .5) BZ.say(M.talk, 'strike'); }
  if (kind === 'foul') { BZ.sfx('foul'); M.stamp = { text: 'FOUL', color: '#ffb020', t: 1, sub: count }; if (BZ.rng.fx() < .3) BZ.say(M.talk, 'foul'); }
  if (kind === 'strike' && M.drill && M.drill.kind === 'strikes') M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
  if (ev.ev === 'k') {
    BZ.sfx('out'); BZ.say(M.talk, 'k');
    M.stamp = { text: 'STRIKE THREE', color: '#ff6a5a', t: 1.8, sub: 'OUT' };
    BZ.meter[ft] = Math.min(100, BZ.meter[ft] + 20);
  }
  if (ev.ev === 'walk') { BZ.sfx('confirm'); BZ.say(M.talk, 'walk'); M.stamp = { text: 'BALL FOUR', color: '#7ad0ff', t: 1.8, sub: 'WALK' }; }
  if (ev.ev === 'k' || ev.ev === 'walk' || ev.end || ev.ev === 'gameOver') M.paEnded = true;
  if (M.paEnded) M.needNewBatter = true;
  return ev;
};

// The pitch is over: a pause for the call, then the next pitch, the next batter or the change of half.
BZ.afterPitch = (game, M) => {
  M.phase = 'after'; M.clock = 0;
  M.afterT = M.paEnded ? 2 : 1.1;
};

// The batted ball: the defense plays it, the rules decide the play, and a result stamp says what happened.
BZ.playUpdate = (game, M, dt, pitcherIn) => {
  const human = { move: pitcherIn ? pitcherIn.move() : [0, 0], dive: !!(pitcherIn && pitcherIn.pressed('confirm')) };
  if (M.play.phase === 'fielded' && pitcherIn) {
    if (pitcherIn.pressed('up')) human.pick = 'second';
    else if (pitcherIn.pressed('left')) human.pick = 'third';
    else if (pitcherIn.pressed('right')) human.pick = 'first';
    const click = game.input.clicked();
    if (click) {
      const b = M.basePx.findIndex(p => p && Math.hypot(p[0] - click[0], p[1] - click[1]) < 32);
      if (b >= 0) human.pick = ['first', 'second', 'third', null][b];
    }
  }
  M.play.step(dt, human);
  for (const e of M.play.events.splice(0)) {
    M.events.push({ type: 'play:' + e.type, who: e.fielder || e.target });
    if (e.type === 'caught') BZ.sfx('catch');
    if (e.type === 'fielded') BZ.sfx('thud');
    if (e.type === 'throw') BZ.sfx('throw');
  }
  if (M.play.phase === 'over') BZ.playResolved(game, M);
};

// The play is over. The stamp says it, the batter's meter fills, the drill counts it, and the count moves on.
BZ.playResolved = (game, M) => {
  const S = M.S, bt = BZ.battingTeam(S), res = M.play.result;
  const ball = M.ball;
  let text = 'OUT', color = '#ff6a5a', sub = '', key = null;
  if (res.kind === 'foul') {
    BZ.countEvent(game, M, 'foul', false);
    M.play = null; M.ball = null;
    BZ.afterPitch(game, M);
    return;
  }
  if (res.kind === 'caught') {
    text = 'CAUGHT'; sub = res.deep ? 'deep fly: the runner tags up' : 'fly out'; key = 'caught';
    BZ.sfx('out');
    if (M.drill && M.drill.kind === 'catch') M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
  } else if (res.kind === 'hit') {
    const T = { single: ['SINGLE', '#ffe6a0'], double: ['DOUBLE', '#ffe6a0'], triple: ['TRIPLE', '#ffb020'], hr: ['HOME RUN', '#ffb020'] }[res.type];
    text = T[0]; color = T[1]; key = res.type;
    BZ.meter[bt] = Math.min(100, BZ.meter[bt] + ({ single: .5, double: 1, triple: 1.3, hr: 2 }[res.type]) * BZ.TUNE.meterGain);
    if (res.type === 'hr' && ball) sub = Math.round(ball.homer ? ball.crossDist : ball.landDist) + ' FT' + (ball.batzooka ? ' · BATZOOKA' : '');
    if (res.type === 'hr') { BZ.sfx('fanfare'); BZ.sfx('cheer'); if (ball) game.particles.explosion(ball.x, ball.y, 4, 1.2); }
    else BZ.sfx('cheer', { vol: .5 });
    if (M.drill && M.drill.kind === 'hit' && res.type !== undefined) M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
    if (M.drill && M.drill.kind === 'homer' && res.type === 'hr' && ball && ball.batzooka) M.drill.got = Math.min(M.drill.goal, M.drill.got + 1);
  } else if (res.kind === 'ground') {
    if (res.batterOut) { text = 'OUT AT FIRST'; key = 'groundOut'; BZ.sfx('out'); }
    else if (res.runnerOut) { text = 'FORCE OUT'; key = 'forceOut'; BZ.sfx('out'); }
    else { text = 'SAFE'; color = '#7ad06a'; key = 'safe'; BZ.sfx('confirm'); }
    if (res.r && res.r.runs) sub = res.r.runs + (res.r.runs > 1 ? ' RUNS SCORE' : ' RUN SCORES');
  }
  if (key) BZ.say(M.talk, key);
  M.stamp = { text, color, t: 2, sub };
  M.events.push({ type: 'result', kind: res.kind, text, S_outs: S.outs });
  M.play = null; M.ball = null; M.swing = null;
  M.paEnded = true; M.needNewBatter = true;
  M.phase = 'after'; M.clock = 0; M.afterT = 2.1;
};

// The next thing after a count or a play: the final, the change of half, or the next pitch (the same batter, or the next).
BZ.nextAfter = (game, M) => {
  const S = M.S;
  M.stamp = null;
  const drillDone = M.drill && M.drill.got >= M.drill.goal;
  if (S.over || drillDone) {
    if (drillDone) S.over = true;
    M.phase = 'final'; M.finalT = 3.4; M.clock = 0; M.cam = 'plate';
    BZ.playSong('results');
    BZ.say(M.talk, S.walkoff ? 'walkoff' : 'over');
    return;
  }
  if (BZ.halfKey(S) !== M.paPrevKey) { BZ.beginHalfIntro(M); return; }
  M.paEnded = false;
  M.phase = 'ready'; M.clock = 0; M.cpuPlanT = .9 + BZ.rng.fx() * .4; M.fireball = false;
  M.cam = 'plate'; M.swung = false; M.swing = null; M.trail = []; M.plan = null; M.pitchPos = null;
};

// The match is over: its state goes to the results screen.
BZ.endMatch = (game, M) => {
  if (M.opts.attract) { BZ.startAttract(game); return; }   // the attract mode plays on, match after match
  BZ.M = M;
  BZ.playSong(null);
  game.go('results', { S: M.S, drill: M.drill, opts: M.opts });
};

// The rigs' poses from the state: the wind-up and release, the swing, the stance, the runners on the bases, the fielders.
BZ.rigsUpdate = (M, dt) => {
  if (BZ.cosmetic === false) return;   // headless sims skip the poses: the rules never read them
  const S = M.S, bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  for (const t of [0, 1]) {
    const R = M.rigs[t];
    for (const f of M.fielders[t]) {
      const st = { x: f.x, y: f.y, z: 0, facing: f.face || 0, vx: f.vx || 0, vy: f.vy || 0 };
      if (f.role === 'C') st.pose = 'crouch';
      if (f.role === 'P' && t === ft) {
        if (M.phase === 'windup' || M.phase === 'meter') st.attack = E.move('overhead', M.phase === 'windup' ? M.windupK : .5);
        else if (M.phase === 'pitch') st.attack = E.move('overhead', 1, 'recover');
        R.far.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, attack: st.attack, stance: st.attack ? undefined : 'ready' });
      }
      R.fielders[f.role].update(dt, st);
    }
    const bstate = { x: 0, y: 0, z: 0, facing: Math.PI / 2 };
    if (t === bt && M.swingPhase === 'swing') bstate.attack = E.move('slash', M.swingK);
    else bstate.stance = 'ready';
    R.batter.update(dt, bstate);
    R.runners.forEach((rr, i) => rr.update(dt, { x: 0, y: 0, z: 0, facing: 0, stance: 'ready' }));
  }
};

// The zoom of the field view, set only when it changes (setZoom re-draws the world).
BZ.setZoomTo = (game, z) => { if ((game.zoom || 1) !== z) game.setZoom(z); };

// The camera: the Plate Cam has none; the field follows the ball, or the plate while nothing is in play.
BZ.focusCam = (game, M) => {
  BZ.setZoomTo(game, M.cam === 'field' ? .55 : 1);
  if (M.cam !== 'field') return;
  const b = M.ball;
  if (b) game.focus(BZ.lerp(BZ.HX, b.x, .6), BZ.lerp(BZ.HY, b.y, .6) - 60, b.z * .3);
  else game.focus(BZ.HX, BZ.HY - 260, 0);
};

// The draw: the Plate Cam for the duel, the field for the play; then the HUD over both.
BZ.matchDraw = (r, M) => {
  if (!M) return;
  const W = r.W, H = r.H, S = M.S, park = BZ.PARKS[BZ.park];
  if (M.cam === 'field') BZ.drawField(r, M);
  else {
    r.sky(park.night ? ['#060818', '#2a2a5a'] : park.sky);
    const ft = BZ.fieldingTeam(S), bt = BZ.battingTeam(S);
    r.overlay(g => {
      BZ.drawPlateGround(g, W, H, park);
      BZ.drawZone(g, W, H);
      BZ.drawPlatePlayers(g, W, H, { view: r.view, pitcher: M.rigs[ft].far, batter: M.rigs[bt].batter });
      if (M.plan && M.phase === 'pitch' && M.pitchPos) BZ.drawPitchBall(g, W, H, M.plan, Math.min(1, M.pt / M.plan.time), M.trail);
      if (M.phase === 'ready' || M.phase === 'windup' || M.phase === 'meter') BZ.drawAimReticle(g, W, H, M);
      if (M.phase === 'pitch' && !M.swung && M.human[bt]) BZ.drawBatterReticle(g, W, H, M);
      if (M.phase !== 'after' && M.phase !== 'intro') BZ.drawBat(g, W, H, { swing: M.swingPhase === 'swing' ? M.swingK : 0, reticle: M.swing && M.swing.reticle ? M.swing.reticle : (M.reticle || { lat: -.4, h: 2.8 }) });
    });
  }
  r.overlay(g => BZ.drawHud(g, r, M));
  if (M.talk) M.talk.draw(r);
};

// The field view: the TileMap, the fielders, the runners, the batter's run and the ball, with the bases clickable.
BZ.drawField = (r, M) => {
  const S = M.S, ft = BZ.fieldingTeam(S), bt = BZ.battingTeam(S);
  BZ.drawFieldBase(r);
  for (const f of M.fielders[ft]) {
    const rig = M.rigs[ft].fielders[f.role];
    r.shadow(f.x, f.y, 6, .3, undefined, 0);
    r.actor(f.x, f.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  }
  const bases = BZ.bases();
  bases.forEach((b, i) => { M.basePx[i] = r.w(b.x, b.y, 0); });
  bases.slice(0, 3).forEach((b, i) => {
    if (S.bases[i]) { const rr = M.rigs[bt].runners[i]; r.actor(b.x, b.y, 0, (g, ox, oy) => rr.draw(g, ox, oy, r.view)); }
  });
  if (M.ball && M.batterRunT > 0 && M.batterRunT < 1) {
    const p = bases[0], x = BZ.lerp(BZ.HX, p.x, M.batterRunT), y = BZ.lerp(BZ.HY - 10, p.y, M.batterRunT);
    r.actor(x, y, 0, (g, ox, oy) => M.rigs[bt].batter.draw(g, ox, oy, r.view));
  }
  if (M.ball) {
    const b = M.ball;
    r.shadow(b.x, b.y, 4, .45, undefined, 0);
    r.sprite(b.x, b.y, b.z + 4, BZ.BALL_SPR, { glow: .3 });
  }
};

// The ball's sprite: a white ball with a red seam, drawn once.
BZ.BALL_SPR = E.sprite(['.www.', 'wwrww', 'wrwrw', 'wwrww', '.www.'], { w: '#f8f8f0', r: '#c83a3a' }, 2);

// The HUD for the match: the scorebug, the pitch chips, the meters, the release meter, the stamp and the prompt.
BZ.drawHud = (g, r, M) => {
  const S = M.S, W = r.W, H = r.H;
  BZ.drawScorebug(g, S, 16, 16);
  const bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  if (M.phase === 'ready' && M.human[ft]) BZ.drawChips(g, M);
  if (M.human[bt]) BZ.drawBatzookaMeter(g, W - 178, H * .7, 150, BZ.meter[bt], 'BATZOOKA', BZ.meter[bt] >= 100);
  if (M.human[ft]) BZ.drawBatzookaMeter(g, W - 178, H * .7 + 34, 150, BZ.meter[ft], 'FIREBALL', BZ.meter[ft] >= 100 || M.fireball);
  if (M.phase === 'meter') {
    BZ.drawMeter(g, W / 2 - 80, H * .3, 160, M.meterP);
    BZ.text(g, BZ.prompt('confirm', 'RELEASE IN THE GREEN'), W / 2, H * .3 + 14, '#ffffff', { align: 'center', scale: 1.1 });
  }
  if (M.stamp) BZ.drawStamp(g, W, H, M.stamp, M.stamp.color, M.stamp.sub);
  if (M.drill) BZ.text(g, BZ.drillText(M), W / 2, 14, '#ffe6a0', { align: 'center', scale: 1.4 });
  BZ.drawPrompt(g, W, H, M);
};

BZ.drillText = M => {
  const names = { strikes: 'THROW STRIKES', hit: 'PUT ONE IN PLAY', catch: 'CATCH A FLY', homer: 'HIT A HOMER WITH THE BATZOOKA' };
  return names[M.drill.kind] + '   ' + M.drill.got + '/' + M.drill.goal;
};

// The pitch chips: the one picked is lit. Hover moves to it; a click picks it.
BZ.drawChips = (g, M) => {
  for (const c of BZ.chipRects(BZ.game)) {
    const on = c.id === M.pitchChoice, P = BZ.PITCHES[c.id];
    E.ui.box(g, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, { bg: on ? ['#ffe6a0', '#c8a060'] : ['#1a1d2a', '#0b0d16'], border: on ? '#ffffff' : '#c8a060', alpha: .92 });
    BZ.text(g, P.name, c.x0 + 6, c.y0 + 4, on ? '#1a1020' : '#ffffff', { scale: 1, shadow: null });
    BZ.text(g, P.tag, c.x0 + 6, c.y0 + 17, on ? '#1a1020' : '#c8d0f0', { scale: 1, shadow: null });
  }
};

// The prompt line at the bottom: what this player does now, with the label for their device.
BZ.drawPrompt = (g, W, H, M) => {
  const S = M.S, bt = BZ.battingTeam(S), ft = BZ.fieldingTeam(S);
  let line = '';
  if (M.phase === 'ready' && M.human[ft]) line = BZ.prompt('confirm', 'WIND UP') + '   ' + BZ.keys('prevPitch', 'nextPitch') + ' PITCH   STICK AIMS   ' + BZ.prompt('power', 'FIREBALL WHEN FULL');
  else if (M.phase === 'pitch' && M.human[bt] && !M.swung) line = BZ.prompt('confirm', 'SWING') + '   STICK AIMS THE BAT   ' + BZ.prompt('power', 'BATZOOKA WHEN FULL');
  else if (M.phase === 'inplay' && M.human[ft]) line = BZ.prompt('confirm', 'DIVE') + '   STICK RUNS   ' + (M.play && M.play.phase === 'fielded' ? 'UP 2ND   LEFT 3RD   RIGHT 1ST' : '');
  if (line && M.phase !== 'meter') {
    const w = line.length * 6.4 + 28;
    E.ui.box(g, W / 2 - w / 2, H - 26, w, 20, { bg: ['#101420', '#060810'], border: '#c8a060', alpha: .85 });
    BZ.text(g, line, W / 2, H - 20, '#ffffff', { align: 'center', scale: 1.2, shadow: null });
  }
};

// Two keys' labels as one: "Q/E".
BZ.keys = (a, b) => (BZ.game.input.label(a) || '') + '/' + (BZ.game.input.label(b) || '');

// The aim: the pitcher's target on the plate's plane.
BZ.drawAimReticle = (g, W, H, M) => {
  const p = BZ.project(M.aim.lat, M.aim.h, 0, W, H);
  E.px.ell(g, p.x, p.y, Math.max(3, .5 * p.s), Math.max(2, .3 * p.s), '#ffffff88');
  E.px.disc(g, p.x, p.y, 1.5, '#ffe6a0');
};

// The batter's reticle: the bat's head, sized by the bat's reach.
BZ.drawBatterReticle = (g, W, H, M) => {
  const ret = M.reticle || { lat: 0, h: 2.6 };
  const p = BZ.project(ret.lat, ret.h, 0, W, H);
  E.px.ell(g, p.x, p.y, Math.max(3, BZ.TUNE.reach * p.s * .5), Math.max(2, BZ.TUNE.reach * p.s * .3), '#ffe6a055');
  E.px.disc(g, p.x, p.y, 1.5, '#ffe6a0');
};

// ---- 31-derby.js
// The Batzooka Derby: a pitch machine, one batter, no fielders. Every fair ball is measured where it lands, and the total
// of those feet is the score. A whiff or a foul is an out; a pitch let go is not. The round ends at the outs limit or the
// clock. Local play is hot-seat for 1 to 4 players, in turns; the AI Hub round is one copy of it, with the other players
// as ghosts (36-hub.js). The pitches come from the deal stream, so every copy in a session throws the same ones.
BZ.derbyPitch = (rng = BZ.rng.deal) => {
  const pitch = BZ.pick(rng, BZ.PITCH_IDS);
  return BZ.planPitch({ pitch, aimLat: (rng() - .5) * 1.7, aimH: 1.7 + rng() * 1.9, release: .5 + (rng() - .5) * .3, rng });
};

// A new derby run: the players (local: one or more, in turns; hub: one), and where it is.
BZ.newDerby = (players, mode = 'local') => ({
  mode, hub: mode === 'hub', talk: null, rigs: BZ.makeRigs(BZ.TEAMS[1]),
  players: players.map((p, i) => ({ name: p.name, color: p.color, input: p.input || null, index: i,
    score: 0, hits: 0, hr: 0, longest: 0, outs: 0, swings: 0, done: false })),
  cur: 0, round: null, phase: 'intro', clock: 0, afterT: 2.4, meter: 0, finished: false
});

// A round: the batter's state for one player's turn at the plate.
BZ.newRound = D => ({
  p: D.players[D.cur], outs: 0, clock: 0,
  plan: null, pt: 0, pitchPos: null, swung: false, ball: null,
  reticle: { lat: 0, h: 2.6 }, prevPointer: null,
  stamp: null, afterT: 0, ended: false, last: null
});

BZ.derbyScene = {
  pausable: true, view: 'threequarter', touch: false,
  enter() {
    BZ.field = BZ.field || BZ.buildField();
    BZ.talkFor(BZ.game);
    BZ.game.lights.enabled = BZ.park === 'moondome';
    BZ.game.lights.ambient = .5;
    BZ.playSong('derby');
  },
  exit() { BZ.game.lights.enabled = false; BZ.playSong(null); },
  update(dt) { BZ.derbyUpdate(BZ.game, BZ.D, dt); },
  draw(r) { BZ.derbyDraw(r, BZ.D); }
};

// The clock left in a round: from the AI Hub's timeline in a session, else from the setting.
BZ.derbyTimeLeft = D => {
  if (D.hub && BZ.hub) return Math.max(0, BZ.hub.limitS - Math.max(0, AIHub.time() / 1000));
  return Math.max(0, BZ.TUNE.derbySeconds - D.clock);
};

// Each frame: the intro, a pitch and its swing, the ball's flight, the result, and the pause before the next pitch.
BZ.derbyUpdate = (game, D, dt) => {
  if (!D || D.finished) return;
  if (D.hub) { BZ.hubCardInput(game); if (BZ.hubDerbyUpdate(game, D, dt)) return; }
  D.clock += dt;
  BZ.derbyRigs(D, dt);
  if (D.phase === 'intro') {
    D.afterT -= dt;
    if (D.afterT <= 0) { D.phase = 'play'; D.round = BZ.newRound(D); BZ.derbyNewPitch(D); }
    return;
  }
  const R = D.round;
  if (!R) return;
  if (R.stamp) { R.stamp.t -= dt; if (R.stamp.t <= 0) R.stamp = null; }
  if (R.ended) {
    R.afterT -= dt;
    if (R.afterT <= 0) BZ.derbyAfter(game, D);
    return;
  }
  if (BZ.derbyTimeLeft(D) <= 0 || R.outs >= BZ.TUNE.derbyOuts) { BZ.derbyEndRound(game, D); return; }
  // the camera: the plate's view while the pitch comes; the field, out to take in the ball, once it is hit
  BZ.setZoomTo(game, R.ball ? .55 : 1);
  if (R.ball) {
    game.focus(BZ.lerp(BZ.HX, R.ball.x, .6), BZ.lerp(BZ.HY, R.ball.y, .6) - 60, R.ball.z * .3);
    BZ.stepBall(R.ball, dt);
    if (R.ball.stopped) BZ.derbyResult(game, D, R);
    return;
  }
  R.pt += dt;
  const plan = R.plan;
  R.pitchPos = BZ.pitchAt(plan, Math.min(1, R.pt / plan.time));
  const I = R.p.input;
  if (I && !R.swung) {
    const ret = BZ.batterAim(game, R, I, dt);
    const click = game.input.clicked();
    const inWindow = R.pt > plan.time - .5 && R.pt < plan.time + .3;
    if (inWindow && (I.pressed('confirm') || click)) {
      const bz = !!I.pressed('power') && D.meter >= 100;
      if (bz) D.meter = 0;
      BZ.derbySwing(game, D, R, ret, bz);
      return;
    }
  }
  if (R.pt > plan.time + .35 && !R.swung) BZ.derbyMiss(game, D, R, 'take');
};

// The derby's players are posed each step: the far pitcher and the batter, both in their stance.
BZ.derbyRigs = (D, dt) => {
  if (BZ.cosmetic === false) return;
  D.rigs.far.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, stance: 'ready' });
  D.rigs.batter.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, stance: 'ready' });
};

// A new pitch from the machine.
BZ.derbyNewPitch = D => {
  const R = D.round;
  R.plan = BZ.derbyPitch(); R.pt = 0; R.swung = false; R.ball = null; R.pitchPos = null;
  D.pitchNo = (D.pitchNo || 0) + 1;
};

// A swing: contact sends the ball, and a foul or a whiff is an out.
BZ.derbySwing = (game, D, R, reticle, batzooka) => {
  const c = BZ.contact({ swingT: R.pt - R.plan.time, reticle, plate: BZ.plateLoc(R.plan), batzooka });
  R.swung = true;
  R.p.swings++;
  if (c.type === 'hit') {
    R.ball = BZ.launchBall({ exit: c.exit, launch: c.launch, spray: c.spray, batzooka: c.batzooka });
    BZ.sfx(c.batzooka ? 'rocket' : 'crack');
    if (c.batzooka) BZ.sfx('fire', { vol: .4 });
    if (D.hub) BZ.hubOnHit(Object.assign({}, c));
    return;
  }
  BZ.derbyMiss(game, D, R, c.type === 'foul' ? 'foul' : 'whiff');
};

// A miss: a whiff, a foul (an out), or a pitch let go (no out, the next pitch comes).
BZ.derbyMiss = (game, D, R, why) => {
  if (why !== 'take') { R.outs++; R.p.outs++; }
  R.stamp = why === 'take' ? { text: 'TAKE', color: '#c8d0f0', t: 1, sub: '' }
    : { text: why === 'foul' ? 'FOUL' : 'WHIFF', color: '#ff6a5a', t: 1.3, sub: 'OUT ' + R.outs + ' OF ' + BZ.TUNE.derbyOuts };
  BZ.sfx(why === 'foul' ? 'foul' : why === 'take' ? 'ball' : 'strike');
  R.swung = true;
  BZ.derbyEnd(D, R, 1.5);
};

// A ball is over: a home run, a fair hit (its feet are its landing spot's), or a foul.
BZ.derbyResult = (game, D, R) => {
  const b = R.ball, kind = BZ.ballResult(b), p = R.p;
  if (kind === 'foul' || kind === 'air') {
    R.outs++; p.outs++;
    R.stamp = { text: 'FOUL', color: '#ff6a5a', t: 1.5, sub: 'OUT ' + R.outs + ' OF ' + BZ.TUNE.derbyOuts };
    BZ.sfx('foul');
  } else {
    const feet = Math.round(b.landDist);
    p.hits++; p.score += feet;
    if (kind === 'hr') { p.hr++; BZ.sfx('fanfare'); BZ.sfx('cheer'); }
    else BZ.sfx('cheer', { vol: .5 });
    if (feet > p.longest) p.longest = feet;
    D.meter = Math.min(100, D.meter + Math.min(40, feet / 12) * (BZ.TUNE.meterGain / 35));
    const label = kind === 'hr' ? 'HOME RUN' : feet >= 300 ? 'TRIPLE' : feet >= 240 ? 'DOUBLE' : 'SINGLE';
    R.stamp = { text: label, color: kind === 'hr' ? '#ffb020' : '#ffe6a0', t: 1.9, sub: feet + ' FT' + (b.batzooka ? ' · BATZOOKA' : '') };
    if (kind === 'hr') { BZ.say(BZ.talk, 'hr'); if (BZ.game) BZ.game.particles.explosion(b.x, b.y, 4, 1.2); }
  }
  R.last = { kind, feet: kind === 'foul' ? 0 : Math.round(b.landDist) };
  BZ.derbyEnd(D, R, 1.9);
};

// The pause after a pitch's result: then the next pitch, or the end of the round.
BZ.derbyEnd = (D, R, secs) => {
  R.ended = true; R.afterT = secs; R.ball = null; R.plan = null; R.pitchPos = null;
};

// After the pause: the round ends at the outs or the clock; otherwise the next pitch.
BZ.derbyAfter = (game, D) => {
  const R = D.round;
  R.ended = false;
  if (R.outs >= BZ.TUNE.derbyOuts || BZ.derbyTimeLeft(D) <= 0) { BZ.derbyEndRound(game, D); return; }
  BZ.derbyNewPitch(D);
};

// The round is over: the player's total is kept. Hot seat: the next player, or the table. A hub round goes to its end.
BZ.derbyEndRound = (game, D) => {
  const p = D.players[D.cur];
  p.done = true;
  D.round = null;
  if (D.hub) { BZ.hubDerbyEnd(game, D); return; }
  if (D.cur + 1 < D.players.length) { D.cur++; D.phase = 'intro'; D.afterT = 2.4; D.clock = 0; return; }
  D.finished = true;
  const table = BZ.derbyTable(D);
  game.go('derbyResults', { table });
};

// The best scores kept between visits (the top five), and this run's table, best first.
BZ.derbyTable = D => {
  const mine = D.players.map(p => ({ name: p.name, color: p.color, score: p.score, hr: p.hr, longest: p.longest, outs: p.outs }));
  const all = E.store.get('batz-derby', []).concat(mine.map(m => Object.assign({ when: Date.now() }, m)));
  E.store.set('batz-derby', all.sort((a, b) => b.score - a.score).slice(0, 5));
  return mine.sort((a, b) => b.score - a.score);
};

// The draw: the plate, with the pitch; or the field, with the ball in flight.
BZ.derbyDraw = (r, D) => {
  if (!D) return;
  const W = r.W, H = r.H, R = D.round, park = BZ.PARKS[BZ.park];
  if (D.hub && BZ.hubDraw(r, D)) return;
  if (R && R.ball) {
    BZ.drawFieldBase(r);
    r.shadow(R.ball.x, R.ball.y, 4, .45, undefined, 0);
    r.sprite(R.ball.x, R.ball.y, R.ball.z + 4, BZ.BALL_SPR, { glow: .3 });
  } else {
    r.sky(park.night ? ['#060818', '#2a2a5a'] : park.sky);
    r.overlay(g => {
      BZ.drawPlateGround(g, W, H, park);
      BZ.drawZone(g, W, H);
      BZ.drawPlatePlayers(g, W, H, { view: r.view, pitcher: D.rigs.far, batter: D.rigs.batter });
      if (R && R.plan && R.pitchPos) BZ.drawPitchBall(g, W, H, R.plan, Math.min(1, R.pt / R.plan.time), []);
      if (R && R.plan && !R.swung) BZ.drawBatterReticle(g, W, H, { reticle: R.reticle });
      if (R) BZ.drawBat(g, W, H, { swing: R.swung ? 1 : 0, reticle: R.reticle });
    });
  }
  r.overlay(g => BZ.drawDerbyHud(g, r, D));
};

BZ.drawDerbyHud = (g, r, D) => {
  const W = r.W, H = r.H, R = D.round, p = D.players[D.cur];
  if (p) {
    E.ui.box(g, 16, 16, 280, 58, { bg: ['#1a1d2a', '#0b0d16'], border: '#c8a060', alpha: .9 });
    BZ.text(g, p.name + '   ' + p.score + ' FT', 26, 24, '#ffe6a0', { scale: 1.8 });
    BZ.text(g, 'OUTS ' + (R ? R.outs : 0) + ' OF ' + BZ.TUNE.derbyOuts + '    HR ' + p.hr + '    LONGEST ' + p.longest + ' FT', 26, 52, '#c8d0f0', { scale: 1.1 });
  }
  const left = Math.ceil(BZ.derbyTimeLeft(D));
  BZ.text(g, Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), W - 26, 22, '#ffffff', { align: 'right', scale: 2.4 });
  BZ.drawBatzookaMeter(g, W - 178, H - 40, 150, D.meter, 'BATZOOKA', D.meter >= 100);
  if (R && R.stamp) BZ.drawStamp(g, W, H, R.stamp, R.stamp.color, R.stamp.sub);
  if (R && R.plan && !R.swung && p && p.input) {
    const line = BZ.prompt('confirm', 'SWING') + '   STICK AIMS THE BAT   ' + BZ.prompt('power', 'BATZOOKA WHEN FULL');
    const w = line.length * 6.4 + 28;
    E.ui.box(g, W / 2 - w / 2, H - 26, w, 20, { bg: ['#101420', '#060810'], border: '#c8a060', alpha: .85 });
    BZ.text(g, line, W / 2, H - 20, '#ffffff', { align: 'center', scale: 1.2, shadow: null });
  }
  if (D.hub && BZ.hubDrawGhosts) BZ.hubDrawGhosts(g, r, D);
};

// Setup: players join with Start (up to four), and the first player's ✕ begins.
BZ.derbySetupScene = {
  enter() { BZ.game.allowJoin({ max: 4 }); },
  exit() { BZ.game.allowJoin(false); },
  update() {
    const game = BZ.game, I = game.input;
    if (I.pressed('cancel')) { game.go('title'); return; }
    if (I.pressed('confirm')) {
      const players = game.players.map((inp, i) => ({ name: 'P' + (i + 1), color: E.PLAYER_COLORS[i], input: inp }));
      BZ.D = BZ.newDerby(players, 'local');
      game.go('derby');
    }
  },
  draw(r) {
    const W = r.W, H = r.H, n = BZ.game.players.length;
    r.sky(['#101848', '#402a70']);
    r.overlay(g => {
      E.font.title(g, 'HOME RUN DERBY', W / 2, H * .16, { scale: 2, align: 'center' });
      BZ.text(g, 'ONE TO FOUR PLAYERS, IN TURNS. OUTS END THE TURN.', W / 2, H * .36, '#ffe6a0', { align: 'center', scale: 1.4 });
      for (let i = 0; i < 4; i++) {
        const joined = i < n;
        BZ.text(g, 'P' + (i + 1) + (joined ? '  READY' : '  PRESS START TO JOIN'), W / 2, H * .46 + i * 24, joined ? '#ffffff' : '#7a7aa0', { align: 'center', scale: 1.5 });
      }
      BZ.text(g, BZ.prompt('confirm', 'BEGIN') + '      ' + BZ.prompt('cancel', 'BACK'), W / 2, H * .86, '#ffffff', { align: 'center', scale: 1.6 });
    });
  }
};

// The derby's results: the table of this run, and the way on.
BZ.derbyResultsScene = {
  enter(data) { BZ.resultsData = data; BZ.playSong('results'); },
  exit() { BZ.playSong(null); },
  update() {
    const I = BZ.game.input;
    if (I.pressed('confirm')) BZ.game.go('derbySetup');
    if (I.pressed('cancel')) BZ.game.go('title');
  },
  draw(r) {
    const W = r.W, H = r.H, table = (BZ.resultsData && BZ.resultsData.table) || [];
    r.sky(['#101848', '#402a70']);
    r.overlay(g => {
      E.font.title(g, 'DERBY OVER', W / 2, H * .12, { scale: 2, align: 'center' });
      table.forEach((p, i) => {
        BZ.text(g, (i + 1) + '.  ' + p.name, W * .3, H * .3 + i * 40, '#ffffff', { scale: 1.8 });
        BZ.text(g, p.score + ' FT', W * .7, H * .3 + i * 40, '#ffe6a0', { scale: 1.8, align: 'right' });
        BZ.text(g, 'HR ' + p.hr + '    LONGEST ' + p.longest + ' FT', W * .3, H * .3 + i * 40 + 18, '#c8d0f0', { scale: 1.1 });
      });
      BZ.text(g, BZ.prompt('confirm', 'AGAIN') + '      ' + BZ.prompt('cancel', 'TITLE'), W / 2, H * .86, '#ffffff', { align: 'center', scale: 1.6 });
    });
  }
};

// ---- 32-training.js
// Spring Training: four lessons. Each reads its pages in the announcer's box, then plays a short match (one inning) with
// a drill: the goal is counted in the match, and the match ends as soon as it's met. The lesson's player is p1, the team
// the player controls for the drill; the other side is the CPU.
BZ.LESSON_SETUP = {
  pitch: { p1: 1, human: [false, true], drill: 'strikes' },
  hit: { p1: 0, human: [true, false], drill: 'hit' },
  field: { p1: 1, human: [false, true], drill: 'catch' },
  bz: { p1: 0, human: [true, false], drill: 'homer', meterStart: 100 }
};

BZ.trainingScene = {
  enter() {
    BZ.playSong('title');
    const done = E.store.get('batz-lessons', {});
    const items = BZ.LESSONS.map((L, i) => ({ label: (i + 1) + '.  ' + L.title.toUpperCase() + (done[L.id] ? '   (DONE)' : ''), id: L.id }));
    BZ.lessonMenu = new E.Menu(BZ.game, items.concat(['BACK']), {
      x: 'center', y: BZ.game.H * .3, title: 'SPRING TRAINING',
      onPick: (i) => { if (i >= BZ.LESSONS.length) BZ.game.go('title'); else BZ.game.go('lesson', { id: BZ.LESSONS[i].id }); },
      onCancel: () => BZ.game.go('title')
    });
  },
  exit() { BZ.playSong(null); },
  update(dt) { BZ.lessonMenu.update(dt); },
  draw(r) {
    r.sky(['#2a5a9a', '#f0b080']);
    BZ.lessonMenu.draw(r);
    r.overlay(g => BZ.text(g, BZ.prompt('confirm', 'START') + '     ' + BZ.prompt('cancel', 'BACK'), r.W / 2, r.H * .9, '#ffffff', { align: 'center', scale: 1.6 }));
  }
};

// A lesson: its pages, then the match.
BZ.lessonScene = {
  enter(data) {
    const L = BZ.LESSONS.find(x => x.id === data.id);
    BZ.lesson = L;
    BZ.talk = BZ.talkFor(BZ.game);
    BZ.lessonPage = 0;
    BZ.talk.say(L.pages, { name: L.title.toUpperCase(), modal: true, onDone: () => BZ.startLesson(L) });
  },
  exit() {},
  update(dt) { BZ.talk.update(dt); },
  draw(r) {
    r.sky(['#2a5a9a', '#f0b080']);
    r.overlay(g => BZ.text(g, BZ.lesson.title.toUpperCase(), r.W / 2, r.H * .12, '#ffe6a0', { align: 'center', scale: 2 }));
    BZ.talk.draw(r);
  }
};

// The drill's match: one inning, the lesson's controls, and the drill's counter.
BZ.startLesson = L => {
  const setup = BZ.LESSON_SETUP[L.id];
  BZ.lessonId = L.id;
  BZ.startMatch(BZ.game, {
    innings: 1, p1: setup.p1, human: setup.human,
    drill: { kind: setup.drill, goal: L.goal }, lesson: L.id, seed: 9001 + L.id.length
  });
  if (setup.meterStart) BZ.meter[setup.p1] = setup.meterStart;
};

// The drill's outcome, saved: a lesson done is kept, and the list shows it.
BZ.lessonResult = M => {
  if (!M || !M.drill || !M.opts.lesson) return null;
  const done = M.drill.got >= M.drill.goal;
  if (done) E.store.set('batz-lessons', Object.assign(E.store.get('batz-lessons', {}), { [M.opts.lesson]: true }));
  return done;
};

// ---- 33-menus.js
// The front end: the title (with its mode menu, the touch-only card and the idle timer that starts the attract mode), the
// exhibition setup, the match results, the Playbook and the About screens, and the attract loop (a CPU match with cheats).
BZ.isTouchOnly = () => {
  if (location.hash === '#touch') return true;
  try {
    return (navigator.maxTouchPoints > 0) && !matchMedia('(any-pointer: fine)').matches;
  } catch (e) { return false; }
};

// Any press or pointer movement counts as input for the idle timer.
BZ.anyInput = game => {
  const I = game.input;
  if (I.anyPressed()) return true;
  const p = I.pointer(), last = BZ.lastPointer;
  BZ.lastPointer = p ? p.slice() : null;
  return !!(p && last && (p[0] !== last[0] || p[1] !== last[1]));
};

BZ.titleScene = {
  enter() {
    BZ.idle = 0; BZ.playSong('title');
    const touchOnly = BZ.isTouchOnly();
    BZ.touchOnly = touchOnly;
    const items = touchOnly ? ['OPTIONS'] : ['PLAY BALL', 'HOME RUN DERBY', 'SPRING TRAINING', 'OPTIONS', 'ABOUT'];
    BZ.titleMenu = new E.Menu(BZ.game, items, {
      x: 'center', y: BZ.game.H * .56, title: null,
      onPick: (i) => {
        const label = items[i];
        if (label === 'OPTIONS') BZ.game.menu('settings');
        else if (label === 'PLAY BALL') BZ.game.go('exhibition');
        else if (label === 'HOME RUN DERBY') BZ.game.go('derbySetup');
        else if (label === 'SPRING TRAINING') BZ.game.go('training');
        else if (label === 'ABOUT') BZ.game.go('about', { page: 0 });
      }
    });
  },
  exit() { BZ.playSong(null); },
  update(dt) {
    const game = BZ.game;
    if (BZ.anyInput(game)) BZ.idle = 0; else BZ.idle += dt;
    if (BZ.idle > 10) { BZ.idle = 0; game.go('attract'); return; }
    BZ.titleMenu.update(dt);
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#0c1430', '#3a2a60']);
    // a ballpark in silhouette: the stands and the lights
    r.overlay(g => {
      E.px.rect(g, 0, Math.round(H * .66), W, H, '#1a2a1a');
      for (let i = 0; i < 12; i++) E.px.rect(g, 8 + i * (W / 12), Math.round(H * .48), 4, Math.round(H * .2), '#2a2a3a');
      for (let i = 0; i < 4; i++) E.px.disc(g, 40 + i * (W / 4), Math.round(H * .44), 3, '#ffe6a0');
    });
    r.overlay(g => {
      E.font.title(g, 'BATZOOKA', W / 2, H * .12, { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a' });
      E.font.title(g, 'BASEBALL', W / 2, H * .12 + 34, { scale: 2, align: 'center', colors: ['#e8f4ff', '#9ac8ff'], outline: '#0a1020', depth: 2, depthColor: '#1a2a4a' });
      BZ.text(g, 'OVER THE TOP. OVER THE WALL. OVER THE MOON.', W / 2, H * .36, '#ffe6a0', { align: 'center', scale: 1.1 });
    });
    if (BZ.touchOnly) {
      r.overlay(g => {
        E.ui.box(g, W / 2 - 170, H * .4, 340, 34, { bg: ['#1a1d2a', '#0b0d16'], border: '#ffe6a0', alpha: .9 });
        BZ.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, H * .4 + 12, '#ffe6a0', { align: 'center', scale: 1.2 });
      });
    }
    BZ.titleMenu.draw(r);
    r.overlay(g => BZ.text(g, BZ.prompt('confirm', 'SELECT') + '   ' + BZ.prompt('pause', 'MENU'), W / 2, H * .92, '#c8d0f0', { align: 'center', scale: 1.2, shadow: null }));
  }
};

// The exhibition setup: the innings, the park, a second player (who joins with Start), and Play Ball.
BZ.exhibitionOpts = { innings: 3, park: 'kernel' };
BZ.INNINGS = [1, 3, 5, 7, 9];
BZ.exhibitionScene = {
  enter() { BZ.game.allowJoin({ max: 2 }); BZ.setupRow = 0; BZ.playSong('title'); },
  exit() { BZ.game.allowJoin(false); },
  update() {
    const game = BZ.game, I = game.input, o = BZ.exhibitionOpts, rows = 4;
    if (I.pressed('cancel')) { game.go('title'); return; }
    if (I.pressed('down')) BZ.setupRow = (BZ.setupRow + 1) % rows;
    if (I.pressed('up')) BZ.setupRow = (BZ.setupRow + rows - 1) % rows;
    // the mouse: a row under the pointer is the focus, and a click picks it
    const p = game.input.pointer(), click = game.input.clicked();
    let rowAt = null;
    if (p) {
      const r = Math.floor((p[1] - game.H * .36 + 4) / 32);
      if (r >= 0 && r < rows && p[0] > game.W / 2 - 150 && p[0] < game.W / 2 + 150) rowAt = r;
    }
    if (rowAt !== null) BZ.setupRow = rowAt;
    const step = I.pressed('right') ? 1 : I.pressed('left') ? -1 : 0;
    if (step && BZ.setupRow === 0) o.innings = BZ.INNINGS[BZ.clamp(BZ.INNINGS.indexOf(o.innings) + step, 0, BZ.INNINGS.length - 1)];
    if (step && BZ.setupRow === 1) o.park = o.park === 'kernel' ? 'moondome' : 'kernel';
    if (I.pressed('confirm') || (click && rowAt !== null)) {
      if (BZ.setupRow === 0) o.innings = BZ.INNINGS[(BZ.INNINGS.indexOf(o.innings) + 1) % BZ.INNINGS.length];
      else if (BZ.setupRow === 1) o.park = o.park === 'kernel' ? 'moondome' : 'kernel';
      else if (BZ.setupRow === 2) BZ.playBall(game);
      else game.go('title');
    }
  },
  draw(r) {
    const W = r.W, H = r.H, o = BZ.exhibitionOpts, n = BZ.game.players.length;
    r.sky(['#101848', '#402a70']);
    const names = ['INNINGS  ' + o.innings, 'PARK  ' + BZ.PARKS[o.park].name.toUpperCase(), 'PLAY BALL', 'BACK'];
    r.overlay(g => {
      E.font.title(g, 'EXHIBITION', W / 2, H * .1, { scale: 2, align: 'center' });
      BZ.text(g, 'P1 HOME  ·  ' + (n > 1 ? 'P2 VISITORS' : 'PRESS START FOR P2, THE VISITORS'), W / 2, H * .24, '#ffe6a0', { align: 'center', scale: 1.2 });
      names.forEach((label, i) => {
        const on = BZ.setupRow === i, y = H * .36 + i * 32;
        E.ui.box(g, W / 2 - 150, y - 4, 300, 26, { bg: on ? ['#ffe6a0', '#c8a060'] : ['#1a1d2a', '#0b0d16'], border: on ? '#ffffff' : '#c8a060', alpha: .9 });
        BZ.text(g, label, W / 2, y + 4, on ? '#1a1020' : '#ffffff', { align: 'center', scale: 1.7, shadow: null });
      });
      BZ.text(g, 'LEFT AND RIGHT CHANGE  ·  ' + BZ.prompt('confirm', 'PICK'), W / 2, H * .9, '#c8d0f0', { align: 'center', scale: 1.1 });
    });
  }
};

// Play ball: a match with the player (or two) on the sides they chose.
BZ.playBall = game => {
  const o = BZ.exhibitionOpts;
  BZ.field = null;
  BZ.park = o.park;
  BZ.field = BZ.buildField();
  BZ.startMatch(game, { innings: o.innings, p1: 1, human: [!!game.players[1], true], seed: 20261104 + o.innings });
};

// The match's results: the line score, the winner, the drill (for a lesson), and the way on.
BZ.resultsScene = {
  enter(data) {
    BZ.resultsData = data;
    BZ.resultsDone = data.drill ? BZ.lessonResult(BZ.M) : null;
    BZ.playSong('results');
  },
  exit() { BZ.playSong(null); },
  update() {
    const game = BZ.game, I = game.input, d = BZ.resultsData;
    if (I.pressed('confirm')) {
      if (d.opts && d.opts.lesson) return game.go('training');
      if (d.opts && d.opts.attract) return game.go('attract');
      return BZ.playBall(game);
    }
    if (I.pressed('cancel')) game.go(d.opts && d.opts.lesson ? 'training' : 'title');
  },
  draw(r) {
    const W = r.W, H = r.H, d = BZ.resultsData, S = d.S, L = BZ.lineScore(S), park = BZ.PARKS[BZ.park];
    r.sky(park.night ? ['#060818', '#2a2a5a'] : park.sky);
    r.overlay(g => {
      E.ui.box(g, W / 2 - 220, 14, 440, H - 28, { bg: ['#1a1d2a', '#0b0d16'], border: '#c8a060', alpha: .92 });
      E.font.title(g, 'FINAL', W / 2, 26, { scale: 2, align: 'center' });
      const x0 = W / 2 - 200, cols = L.cols, cw = Math.min(26, 300 / (cols + 3));
      BZ.text(g, 'TEAM', x0, 70, '#c8d0f0', { scale: 1.2 });
      for (let i = 0; i < cols; i++) BZ.text(g, String(i + 1), x0 + 120 + i * cw, 70, '#c8d0f0', { scale: 1.2, align: 'center' });
      BZ.text(g, 'R', x0 + 120 + cols * cw + 12, 70, '#ffe6a0', { scale: 1.2, align: 'center' });
      BZ.text(g, 'H', x0 + 120 + cols * cw + 12 + 28, 70, '#ffe6a0', { scale: 1.2, align: 'center' });
      [0, 1].forEach(t => {
        const y = 92 + t * 22, row = t === 0 ? L.away : L.home;
        BZ.text(g, BZ.TEAMS[t].short, x0, y, BZ.TEAMS[t].color, { scale: 1.4 });
        for (let i = 0; i < cols; i++) BZ.text(g, row[i] || '', x0 + 120 + i * cw, y, '#ffffff', { scale: 1.2, align: 'center' });
        BZ.text(g, String(S.score[t]), x0 + 120 + cols * cw + 12, y, '#ffe6a0', { scale: 1.6, align: 'center' });
        BZ.text(g, String(S.hits[t]), x0 + 120 + cols * cw + 40, y, '#ffffff', { scale: 1.2, align: 'center' });
      });
      const winner = S.score[0] === S.score[1] ? 'A TIE: THE SEASON GOES ON' : BZ.TEAMS[S.score[0] > S.score[1] ? 0 : 1].name.toUpperCase() + ' WIN';
      BZ.text(g, winner, W / 2, 150, '#ffe6a0', { align: 'center', scale: 1.6 });
      if (d.drill) {
        const done = BZ.resultsDone;
        BZ.text(g, done ? 'LESSON COMPLETE' : 'NOT YET: ' + d.drill.got + ' OF ' + d.drill.goal, W / 2, 180, done ? '#7ad06a' : '#ff9a6a', { align: 'center', scale: 1.7 });
      }
      BZ.text(g, BZ.prompt('confirm', d.opts && d.opts.lesson ? 'BACK TO TRAINING' : 'PLAY AGAIN') + '     ' + BZ.prompt('cancel', 'TITLE'), W / 2, H - 36, '#ffffff', { align: 'center', scale: 1.4 });
    });
  }
};

// The Playbook: how to play, by device, and the rules the game keeps, simplifies and leaves out. Pages in the box.
BZ.playbookScene = {
  enter(data) {
    BZ.talk = BZ.talkFor(BZ.game);
    BZ.talk.say(BZ.PLAYBOOK, { name: 'PLAYBOOK', modal: true, onDone: () => BZ.game.go(BZ.backScene || 'title') });
  },
  exit() {},
  update(dt) { BZ.talk.update(dt); },
  draw(r) { r.sky(['#101848', '#402a70']); BZ.talk.draw(r); }
};

// About and Credits: the pages in the box, the Source Information and the feedback among them.
BZ.aboutScene = {
  enter() {
    BZ.talk = BZ.talkFor(BZ.game);
    BZ.talk.say(BZ.ABOUT, { name: 'ABOUT', modal: true, onDone: () => BZ.game.go(BZ.backScene || 'title') });
  },
  exit() {},
  update(dt) { BZ.talk.update(dt); },
  draw(r) { r.sky(['#101848', '#402a70']); BZ.talk.draw(r); }
};

// The attract mode: a CPU match with cheats (the Batzooka is always full), looping, until any input.
BZ.startAttract = game => {
  BZ.field = BZ.field || BZ.buildField();
  BZ.attractN = (BZ.attractN || 0) + 1;
  BZ.M = BZ.newMatchRun({ innings: 3, human: [false, false], attract: true, cpuLevel: 8, seed: 5000 + BZ.attractN });
  BZ.beginHalfIntro(BZ.M);
};
BZ.attractScene = {
  enter() { BZ.startAttract(BZ.game); BZ.playSong('attract'); BZ.talkFor(BZ.game); },
  exit() { BZ.playSong(null); },
  update(dt) {
    const game = BZ.game;
    if (game.input.anyPressed()) { game.go('title'); return; }
    BZ.matchUpdate(game, BZ.M, dt);
    },
  draw(r) {
    BZ.matchDraw(r, BZ.M);
    r.overlay(g => {
      if (Math.floor(BZ.game.time * 2) % 2 === 0) BZ.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 20, '#ffe6a0', { align: 'center', scale: 1.4 });
      BZ.text(g, 'ATTRACT', 12, r.H - 20, '#c8d0f0', { scale: 1.1 });
    });
  }
};

// ---- 34-dev.js
// Dev mode, from the pause menu: live sliders for every balance number (BZ.TUNE), grouped in tabs, with a reset to the
// defaults; a cheat for the Batzooka meter; and warps to a match, the derby, or a CPU game. It is not in an AI Hub
// session. Cancel returns to the scene it came from, unchanged.
BZ.devTabs = ['Pitching', 'Batting', 'Ball', 'Fielding', 'Batzooka', 'Game', 'Tools'];

BZ.devRows = tab => {
  if (tab === 'Tools') return [
    { kind: 'toggle', label: 'Batzooka always full', get: () => !!BZ.cheat.batzooka, set: v => { BZ.cheat.batzooka = v; } },
    { kind: 'action', label: 'Reset to defaults', run: () => BZ.resetTune() },
    { kind: 'action', label: 'Warp: a match', run: () => BZ.playBall(BZ.game) },
    { kind: 'action', label: 'Warp: the derby', run: () => BZ.game.go('derbySetup') },
    { kind: 'action', label: 'Warp: a CPU game', run: () => BZ.game.go('attract') }
  ];
  return Object.keys(BZ.TUNE_META).filter(k => BZ.TUNE_META[k].group === tab).map(k => ({ kind: 'slider', key: k }));
};

BZ.cheat = { batzooka: false };

BZ.devScene = {
  enter(data) {
    BZ.devBack = data && data.back ? data.back : 'title';
    BZ.devTab = BZ.devTab || 0; BZ.devRow = 0;
  },
  exit() {},
  update(dt) {
    const game = BZ.game, I = game.input;
    if (I.pressed('cancel')) { game.go(BZ.devBack, { resume: true }); return; }
    if (I.pressed('prevPitch')) BZ.devTab = (BZ.devTab + BZ.devTabs.length - 1) % BZ.devTabs.length, BZ.devRow = 0;
    if (I.pressed('nextPitch')) BZ.devTab = (BZ.devTab + 1) % BZ.devTabs.length, BZ.devRow = 0;
    const rows = BZ.devRows(BZ.devTabs[BZ.devTab]);
    if (I.pressed('down')) BZ.devRow = (BZ.devRow + 1) % rows.length;
    if (I.pressed('up')) BZ.devRow = (BZ.devRow + rows.length - 1) % rows.length;
    // the mouse: a row under the pointer has the focus; a click on a slider's left or right half steps it
    const p = game.input.pointer(), click = game.input.clicked();
    const rowAt = p ? BZ.devRowAt(game, p) : null;
    if (rowAt !== null && rowAt < rows.length) BZ.devRow = rowAt;
    const tabAt = click ? BZ.devTabAt(game, click) : null;
    if (tabAt !== null) { BZ.devTab = tabAt; BZ.devRow = 0; return; }
    const row = rows[BZ.devRow];
    const step = (I.pressed('right') ? 1 : 0) - (I.pressed('left') ? 1 : 0) + (click && rowAt === BZ.devRow && row && row.kind === 'slider' ? (click[0] > game.W / 2 ? 1 : -1) : 0);
    if (row && row.kind === 'slider') {
      if (step) BZ.bumpTune(row.key, step);
    } else if (row && row.kind === 'toggle' && (I.pressed('confirm') || (click && rowAt === BZ.devRow))) row.set(!row.get());
    else if (row && row.kind === 'action' && (I.pressed('confirm') || (click && rowAt === BZ.devRow))) row.run();
  },
  draw(r) {
    const W = r.W, H = r.H, tab = BZ.devTabs[BZ.devTab], rows = BZ.devRows(tab);
    r.sky(['#101848', '#402a70']);
    r.overlay(g => {
      E.font.title(g, 'DEV MODE', W / 2, 10, { scale: 2, align: 'center' });
      // the tabs
      BZ.devTabs.forEach((t, i) => BZ.text(g, t.toUpperCase(), 14 + i * (W - 28) / BZ.devTabs.length, 46, i === BZ.devTab ? '#ffe6a0' : '#8a92b0', { scale: 1.1 }));
      rows.forEach((row, i) => {
        const y = 70 + i * 22, on = i === BZ.devRow;
        E.ui.box(g, 12, y - 3, W - 24, 18, { bg: on ? ['#ffe6a0', '#c8a060'] : ['#1a1d2a', '#0b0d16'], border: on ? '#ffffff' : '#2a2e40', alpha: .9 });
        const ink = on ? '#1a1020' : '#ffffff';
        if (row.kind === 'slider') {
          const m = BZ.TUNE_META[row.key], v = BZ.TUNE[row.key];
          BZ.text(g, m.label, 22, y, ink, { scale: 1.2, shadow: null });
          const bx = W * .5, bw = W * .26, f = (v - m.min) / (m.max - m.min);
          E.ui.bar(g, bx, y + 2, bw, 8, f, on ? '#1a1020' : '#7ad06a');
          BZ.text(g, String(Math.round(v * 100) / 100) + (m.def === v ? '' : ' *'), bx + bw + 10, y, ink, { scale: 1.2, shadow: null });
        } else if (row.kind === 'toggle') {
          BZ.text(g, row.label + ':  ' + (row.get() ? 'ON' : 'OFF'), 22, y, ink, { scale: 1.2, shadow: null });
        } else BZ.text(g, row.label, 22, y, ink, { scale: 1.2, shadow: null });
      });
      BZ.text(g, '* = changed from the default. ' + BZ.prompt('prevPitch', 'LESS') + ' ' + BZ.prompt('nextPitch', 'MORE') + ' TABS  ·  ' + BZ.prompt('cancel', 'BACK'), W / 2, H - 16, '#c8d0f0', { align: 'center', scale: 1, shadow: null });
    });
  }
};

// The row under a pointer (a row is 22 px high, from y = 70), and the tab under it.
BZ.devRowAt = (game, p) => {
  const i = Math.floor((p[1] - 67) / 22);
  return p[0] > 12 && p[0] < game.W - 12 && i >= 0 ? i : null;
};
BZ.devTabAt = (game, p) => {
  if (!p || p[1] < 40 || p[1] > 60) return null;
  const i = Math.floor((p[0] - 14) / ((game.W - 28) / BZ.devTabs.length));
  return i >= 0 && i < BZ.devTabs.length ? i : null;
};

// ---- 36-hub.js
// AI Hub: the online Derby. A ghost round (mode 'ghost', 1 to 4 players): every copy plays its own Derby from the same pitch
// sequence (BZ.rng.deal is the hub's 'pitches' stream), and sees the others as ghosts. The others' swings and batted balls
// show in their seat colours; they never change this copy's round. The game's own card shows the players and the controls,
// and answers Ready (✕ or a click) or More time (△, M or a click). The round is one player's, with a hard clock from the hub.
// Outside a session (AIHub.active is false) nothing here runs.
BZ.hubOn = () => typeof AIHub !== 'undefined' && !!AIHub.active;

BZ.hubState = 'connecting';   // connecting | card | countdown | play | over | ended
BZ.hubCard = null;            // the hub's card event: left, paused, starting, ready, asking, asked
BZ.hubGhosts = {};            // id -> { name, color, score, outs, swing, comets: [] }
BZ.hubSent = { reported: false, lastProgress: -1, lastGhost: 0 };

// The round's scene: connect, then build the Derby, call ready once, and let the card and the countdown run.
BZ.hubScene = {
  enter() {
    BZ.field = BZ.field || BZ.buildField();
    BZ.park = 'moondome';
    BZ.field = BZ.buildField();
    BZ.hubState = 'connecting';
    BZ.hubConnect();
  },
  exit() { BZ.playSong(null); },
  update() {},
  draw(r) { BZ.hubDrawConnecting(r); }
};

BZ.hubConnect = () => {
  AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
    if (!info) { BZ.game.go('title'); return; }
    BZ.hub = { info, connected: true, limitS: info.limitMs ? Math.min(120, (info.limitMs - 5000) / 1000) : 120 };
    BZ.rng.deal = AIHub.rng('pitches');
    const me = info.players.find(p => p.id === info.me) || info.players[0];
    const others = info.players.filter(p => p.id !== info.me);
    for (const o of others) BZ.hubGhosts[o.id] = { id: o.id, name: o.name, color: o.color, score: 0, outs: 0, swing: 0, comets: [] };
    const players = [{ name: me.name, color: me.color, input: BZ.game.input, id: me.id }];
    BZ.D = BZ.newDerby(players, 'hub');
    BZ.D.hub = true; BZ.D.me = me.id; BZ.D.phase = 'play';
    BZ.hubWire();
    AIHub.ready();
    BZ.hubState = 'card';
    BZ.game.go('derby');
  });
};

// The hub's events: the card, the start, the messages, a player leaving, time up, and the end of the round.
BZ.hubWire = () => {
  AIHub.on('card', c => { BZ.hubCard = c; });
  AIHub.on('start', () => { BZ.hubState = 'countdown'; });
  AIHub.on('message', (data, from) => BZ.hubMessage(data, from));
  AIHub.on('leave', ({ id }) => { delete BZ.hubGhosts[id]; });
  AIHub.on('time-up', () => { if (!BZ.hubSent.reported) BZ.hubReport(); });
  AIHub.on('end', ({ standings }) => {
    BZ.hubState = 'ended'; BZ.hubStandings = standings || [];
    BZ.muted = true; BZ.playSong(null); BZ.game.audio.music(null);   // the round's sound stops
  });
};

// The round's update. Returns true while the hub's flow owns the step (the card, the countdown, the end), else false.
BZ.hubDerbyUpdate = (game, D, dt) => {
  const st = BZ.hubState;
  if (st === 'card' || st === 'countdown') {
    if (st === 'countdown' && AIHub.time() >= 0) { BZ.hubState = 'play'; if (!D.round) { D.round = BZ.newRound(D); BZ.derbyNewPitch(D); } }
    return true;
  }
  if (st === 'ended') return true;
  if (st === 'over') return true;
  // play: report the standing once a second, send the ghost traffic, and stop when the round is over
  BZ.hubSent.lastProgress -= dt;
  BZ.hubSent.lastGhost -= dt;
  if (BZ.hubSent.lastProgress <= 0) { BZ.hubSent.lastProgress = 1; BZ.hubProgress(D); }
  if (BZ.hubSent.lastGhost <= 0) { BZ.hubSent.lastGhost = .1; BZ.hubGhostTraffic(D); }
  for (const id in BZ.hubGhosts) BZ.hubGhostStep(BZ.hubGhosts[id], dt);
  return false;
};

// Progress for the hub's scoreboard: the score is the feet so far; the label is what the player reads.
BZ.hubProgress = D => {
  const p = D.players[0];
  AIHub.progress({ score: p.score, label: p.score.toLocaleString('en-US') + ' ft · ' + p.hr + ' HR · ' + p.outs + ' outs' });
};

// Ghost traffic: our swing state, unreliable, 10 a second; each batted ball, reliable, so the other copies can show it.
BZ.hubGhostTraffic = D => {
  const R = D.round;
  AIHub.send({ t: 'g', s: R && R.swingNow ? 1 : 0, sc: D.players[0].score, o: D.players[0].outs, a: 'derby' }, { reliable: false });
};

BZ.hubSendHit = (b, extra) => {
  AIHub.send({ t: 'hit', e: Math.round(b.exit), l: Math.round(b.launch), s: Math.round(b.spray * 10) / 10, bz: !!b.batzooka, d: extra }, { reliable: true });
};

BZ.hubMessage = (data, from) => {
  const g = BZ.hubGhosts[from];
  if (!g || !data) return;
  if (data.t === 'g') { g.score = data.sc || 0; g.outs = data.o || 0; g.swing = data.s ? 1 : 0; }
  if (data.t === 'hit') {
    const b = BZ.launchBall({ exit: data.e, launch: data.l, spray: data.s, batzooka: data.bz });
    g.comets.push({ ball: b, t: 0 });
    if (g.comets.length > 4) g.comets.shift();
  }
  if (data.t === 'done') { g.score = data.score || g.score; }
};

// A ghost's comets fly over the field's sky: their balls are simulated locally, the same physics, purely to show.
BZ.hubGhostStep = (g, dt) => {
  for (const c of g.comets) { if (!c.ball.stopped) BZ.stepBall(c.ball, dt); c.t += dt; }
  g.comets = g.comets.filter(c => c.t < 8);
};

// The round is done: the result goes to the hub once, with the stats and an award.
BZ.hubDerbyEnd = (game, D) => {
  BZ.hubState = 'over';
  BZ.hubReport();
};
BZ.hubReport = () => {
  if (BZ.hubSent.reported || !BZ.D) return;
  BZ.hubSent.reported = true;
  const p = BZ.D.players[0];
  const longest = p.longest;
  AIHub.result({
    score: p.score,
    stats: { 'Home runs': p.hr, 'Longest': longest + ' ft', 'Hits': p.hits, 'Outs': p.outs },
    awards: p.hr > 0 ? [{ title: 'Moonshot', detail: longest + ' ft' }] : []
  });
  AIHub.send({ t: 'done', score: p.score }, { reliable: true });
};

// The hub's screens: the connection, the card, the countdown, and the round's end. Returns true when it drew them.
BZ.hubDraw = (r, D) => {
  if (BZ.hubState === 'card') { BZ.hubDrawCard(r, D); return true; }
  if (BZ.hubState === 'countdown') {
    const left = Math.ceil(-AIHub.time() / 1000);
    r.sky(['#060818', '#2a2a5a']);
    r.overlay(g => E.font.title(g, left > 0 ? String(Math.min(3, left)) : 'PLAY', r.W / 2, r.H * .4, { scale: 4, align: 'center' }));
    return true;
  }
  if (BZ.hubState === 'ended' || BZ.hubState === 'over') {
    r.sky(['#060818', '#2a2a5a']);
    r.overlay(g => {
      E.font.title(g, 'ROUND OVER', r.W / 2, r.H * .12, { scale: 2, align: 'center' });
      BZ.hubDrawStandings(g, r);
    });
    return true;
  }
  return false;
};

// The standings on the canvas: each player in their seat colour, by place, names as text only.
BZ.hubDrawStandings = (g, r) => {
  // before the hub's end, only this player's own score is known
  const rows = BZ.hubStandings ? [].concat(...BZ.hubStandings) : [BZ.D.me];
  rows.forEach((id, i) => {
    const isMe = id === BZ.D.me;
    const who = isMe ? { name: BZ.D.players[0].name, color: BZ.D.players[0].color, score: BZ.D.players[0].score } : BZ.hubGhosts[id] || { name: '—', color: '#ffffff', score: 0 };
    const y = r.H * .32 + i * 26;
    E.px.rect(g, r.W * .3 - 8, y + 2, 5, 14, who.color);
    BZ.text(g, (i + 1) + '.  ' + who.name, r.W * .3, y, '#ffffff', { scale: 1.8 });
    BZ.text(g, (who.score || 0).toLocaleString('en-US') + ' ft', r.W * .7, y, '#ffe6a0', { scale: 1.8, align: 'right' });
  });
};

// The card: the game's own, before play. Lines up the players, shows how to win and the controls, and takes Ready / More time.
BZ.hubDrawCard = (r, D) => {
  const W = r.W, H = r.H, c = BZ.hubCard || {};
  const ready = c.ready || [];
  r.sky(['#060818', '#2a2a5a']);
  r.overlay(g => {
    E.font.title(g, 'BATZOOKA DERBY', W / 2, H * .08, { scale: 2, align: 'center' });
    BZ.text(g, 'ONLINE · HOME RUN DERBY', W / 2, H * .24, '#ffe6a0', { align: 'center', scale: 1.1 });
    const seats = BZ.hub.info.players;
    seats.forEach((p, i) => {
      const y = H * .36 + i * 24, isReady = ready.includes(p.id);
      E.px.rect(g, W * .2, y + 2, 6, 14, p.color);
      BZ.text(g, p.name + (p.id === BZ.hub.info.me ? '  (you)' : ''), W * .2 + 14, y, '#ffffff', { scale: 1.5 });
      BZ.text(g, isReady ? 'READY' : '', W * .8, y, '#7ad06a', { align: 'right', scale: 1.4 });
    });
    BZ.text(g, 'HOW TO WIN: HIT THE MOST HOME-RUN FEET IN TWO MINUTES', W / 2, H * .62, '#ffffff', { align: 'center', scale: 1.2 });
    BZ.text(g, 'AIM ' + BZ.keyNames(['up', 'left', 'down', 'right']) + '   SWING ' + BZ.prompt('confirm', '') + '   BATZOOKA ' + BZ.prompt('power', ''), W / 2, H * .7, '#c8d0f0', { align: 'center', scale: 1.1 });
    const left = c.left != null ? Math.ceil(c.left / 1000) : null;
    const status = c.paused ? 'WAITING FOR MORE TIME…' : c.starting ? 'STARTING…' : c.asked ? 'YOU ASKED FOR MORE TIME' : left != null ? 'STARTS IN ' + left : '';
    BZ.text(g, status, W / 2, H * .8, '#ffe6a0', { align: 'center', scale: 1.4 });
    BZ.text(g, BZ.prompt('confirm', 'READY') + '      ' + BZ.prompt('more', 'MORE TIME'), W / 2, H * .9, '#ffffff', { align: 'center', scale: 1.4 });
  });
};

BZ.keyNames = acts => acts.map(a => BZ.game.input.label(a)).join('');
BZ.hubDrawConnecting = r => {
  r.sky(['#060818', '#2a2a5a']);
  r.overlay(g => BZ.text(g, 'CONNECTING TO THE HUB…', r.W / 2, r.H / 2, '#ffe6a0', { align: 'center', scale: 1.6 }));
};

// The card's answers: ✕ or a click on READY; △, M or a click on MORE TIME. They go to the hub, and change nothing here.
BZ.hubCardInput = game => {
  if (BZ.hubState !== 'card') return;
  const I = game.input, click = game.input.clicked();
  if (I.pressed('confirm') || (click && click[1] > game.H * .86 && click[0] < game.W / 2)) AIHub.answer('ready');
  if (I.pressed('more') || (click && click[1] > game.H * .86 && click[0] >= game.W / 2)) AIHub.answer('more');
};

// A swing in a hub round also tells the ghosts (its batted ball, reliable).
BZ.hubOnHit = (b) => { if (BZ.hubOn() && BZ.hubState === 'play') BZ.hubSendHit(b, Math.round(b.landDist)); };

// The ghosts' drawing: their comets in their seat colours, over the field.
BZ.hubDrawGhosts = (g, r) => {
  const rows = Object.values(BZ.hubGhosts);
  rows.slice(0, 3).forEach((gh, i) => {
    E.ui.box(g, r.W - 180, 90 + i * 22, 168, 18, { bg: ['#1a1d2a', '#0b0d16'], border: gh.color, alpha: .85 });
    E.px.rect(g, r.W - 176, 96 + i * 22, 4, 10, gh.color);
    BZ.text(g, gh.name + '  ' + (gh.score || 0) + ' ft', r.W - 168, 94 + i * 22, '#ffffff', { scale: 1.1, shadow: null });
  });
};

// ---- 50-text.js
// The words the game shows outside the match: the Playbook (how to play, and the rules kept, simplified and left out), and
// the About and Credits (the Source Information, the feedback, the credits). Plain text, short pages for the box.
BZ.PLAYBOOK = [
  'HOW TO PLAY. The visitors bat first. Three outs end a half-inning. Nine innings, or the number you set. A tie goes to extra innings, and the home team does not bat in the last half when it is ahead.',
  'PITCHING. Pick a pitch with Q and E, or click its chip. Aim with the stick or the mouse. Press ✕ to wind up, then ✕ again when the meter is in its middle. Off the middle, the pitch misses by up to the aim error.',
  'BATTING. Aim the bat-head with the stick or the mouse. Swing with ✕ or a click as the ball crosses the plate. Early goes right, late goes left. Aim high for a fly ball, low for a grounder.',
  'FIELDING. The fielder nearest the ball runs it down. The stick steers, ✕ dives. A fly low enough is caught; a grounder is picked up. Then choose a base: stick up for second, left for third, right for first, or click the base.',
  'THE BATZOOKA. Hard hits and strikeouts fill the meter. When it is full, □ (or J, or right-click) fires a Batzooka swing: always on the sweet spot, and it flies like a rocket. The pitcher\'s Fireball works the same way.',
  'KEPT, SIMPLIFIED, LEFT OUT. Kept: balls, strikes, outs, forces, walks, strikeouts, innings and extras. Simplified: runners never steal or tag up (a deep fly sends the third-base runner home), and one throw decides a base play. Left out: stealing, bunts, pickoffs, double plays.',
  'THE DERBY. One batter, a pitch machine, no fielders. Fair balls score their feet. A whiff or a foul is an out; a pitch you let go is not. One to four players take turns, and the table keeps the best five.',
  'SPRING TRAINING. Four lessons: pitching, hitting, fielding and the Batzooka. Each is a one-inning drill with a goal. Lessons you finish are marked DONE.',
  'THE PAUSE MENU. Start or Esc pauses: Resume, Playbook, Settings, Controls, Dev Mode (live tuning, a Batzooka cheat, warps), and Quit to title. Settings has the button symbols: PlayStation, or Xbox (A B X Y).'
];

// The About and Credits pages. Source Information is the record the game is built from (the fields the task asks for).
BZ.ABOUT = [
  'BATZOOKA BASEBALL. Over-the-top arcade baseball, made on the my-3D2dge engine. Over the top. Over the wall. Over the moon. Version 1.0.',
  'SOURCE INFORMATION. Date: 2026-11-04 06:06:43. Source: baseball (over the top arcade style). Plan: PLAN.md. Genre: arcade baseball, with a home run derby and spring training. Perspective: the Plate Cam, a perspective from behind the plate (drawn in screen pixels), and the Broadcast field view (a three-quarter TileMap view).',
  'SOURCE INFORMATION, CONTINUED. Tech: my-3D2dge engine v0.85.2 (handoff package) in plain JavaScript; the AI Hub client 1.4.0, unmodified. Art: the engine\'s pixel-art rigs at PS1 resolution; the field and the stands are painted in code. Animation: the engine\'s rig poses and move set, with no mocap clips. Audio: the engine\'s chip synth only. Online: an AI Hub ghost-mode Home Run Derby, 1 to 4 players. Testing: headless tests run from one command. Research: the engine handoff documents and the AI Hub protocol. Environment: Claude Code CLI (headless), Linux under WSL2, a Chromium browser. Model: Anthropic claude-haiku-5-5, reasoning effort medium. Usage: unknown.',
  'TESTING FEEDBACK. About 16 real issues: the fence distances were inverted, fielders ran to the ground under a fly and dropped it, the Plate Cam put the plate off the screen, the CPU curveball aimed under the zone, the pitcher drew as big as the batter, and the scorebug and the pitch chips covered the play. Three were game-breaking: the fence (home runs and fair balls called wrong), the fly balls (CPU games stuck at 0-0 for 34 innings), and the plate off the screen (no duel to play). The most useful test was a trace of every plate appearance; the least was the source-text check, which tripped on a comment.',
  'ENGINE FEEDBACK. Liked most: game.advance with input.tap and game.debug made whole playthroughs scriptable, and the Humanoid rigs with E.move poses look like a game. Got stuck: a scene switch enters after its fade, so state set just before game.go was replaced. Rigs do not scale with distance, so the far pitcher needed a second, smaller rig; there is no bat weapon, so the bat is drawn by hand. Built myself: the rules, the pitch and contact model, the fielding and the Plate Cam projection. Changed in the engine: the button symbols default to PlayStation (ENGINE-CHANGES.md). One thing to change: a per-call scale for a Humanoid, so players far away read as far away.',
  'PROMPT FEEDBACK. Liked most: the milestones, the explicit hub protocol, and the one-command test rule. Confusing: the file names in the plan name another model and effort than the task, and the task wins; the plan is about 2,100 lines, and it is not clear which parts are must-haves. Hardest: fitting nine milestones into one session, so the build is a cut version (two parks, no Tour, no mocap). Would change: mark the must-haves, give a step budget, and name the deliverable folder.',
  'CREDITS. Game design, code and art: Claude (Anthropic, claude-haiku-5-5), following PLAN.md. Engine: my-3D2dge by michaelcrosato. AI Hub client and protocol: AI Hub by michaelcrosato. Thanks to everyone who plays on a couch.'
];

// ---- 90-start.js
// Start: the game object, its controls, the pause menu, the scenes, the deep links and the boot. The test handle (game.debug)
// is the same one the headless tests and tools read.
// Controls: the engine's menu keys, with the game's own actions. Mouse: the mouse aims and clicks (a click swings, winds up,
// picks a base or a pitch); the right button is the Batzooka. The pad: ✕ swings, □ is the Batzooka, L1 and R1 change pitch.
BZ.PRESET = Object.assign({}, E.Input.DEFAULT, {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'],
  left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Space', 'Enter', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'Pad1'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  power: ['KeyJ', 'Mouse2', 'Pad2'],
  prevPitch: ['KeyQ', 'Pad4'], nextPitch: ['KeyE', 'Pad5'],
  more: ['KeyM', 'Pad3']
});
delete BZ.PRESET.attack; delete BZ.PRESET.dash; delete BZ.PRESET.skill; delete BZ.PRESET.jump;

BZ.pauseItems = () => {
  const game = BZ.game;
  if (BZ.hubOn()) return [];   // a hub round: only Resume, Settings and Controls
  const here = game.sceneName;
  return [
    ['Playbook', () => { BZ.backScene = here; game.go('playbook'); }],
    ['Dev Mode', () => game.go('dev', { back: here })]
  ];
};

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, input: BZ.PRESET,
  menu: {
    items: BZ.pauseItems,
    controls: { confirm: 'Swing, wind up, release, pick', power: 'Batzooka and Fireball', prevPitch: 'Previous pitch', nextPitch: 'Next pitch',
      attack: false, dash: false, skill: false, jump: false, more: false, cancel: 'Back' },
    quit: BZ.hubOn() ? false : 'title'
  }
});
BZ.game = game;

// Scenes: the title and its screens, the match and the derby, the lessons, the About and the Playbook, and dev mode.
const scenes = {
  title: BZ.titleScene,
  attract: BZ.attractScene,
  exhibition: BZ.exhibitionScene,
  match: BZ.matchScene,
  results: BZ.resultsScene,
  derbySetup: BZ.derbySetupScene,
  derby: BZ.derbyScene,
  derbyResults: BZ.derbyResultsScene,
  training: BZ.trainingScene,
  lesson: BZ.lessonScene,
  about: BZ.aboutScene,
  playbook: BZ.playbookScene,
  dev: BZ.devScene,
  hubDerby: BZ.hubScene
};

// Deep links for the checks and the tools: #attract, #derby, #dev, #match, #training, #about, #touch.
const LINKS = { attract: 'attract', derby: 'derbySetup', dev: 'dev', match: 'exhibition', training: 'training', about: 'about', touch: 'title' };
const hash = (location.hash || '').replace('#', '').split('/')[0];
const startScene = BZ.hubOn() ? 'hubDerby' : (LINKS[hash] || 'title');

game.debug = {
  BZ,
  // jump to a scene for the tests and the tools: a match with the given options, the derby, or the attract mode
  warp: (what, opts = {}) => {
    if (what === 'match') return BZ.startMatch(game, Object.assign({ innings: 3, p1: 1, human: [false, true] }, opts));
    if (what === 'derby') return game.go('derbySetup');
    return game.go(what);
  },
  snapshot: () => {
    const M = BZ.M, D = BZ.D;
    return {
      scene: game.sceneName,
      phase: M ? M.phase : null,
      inning: M ? M.S.inning : null, top: M ? M.S.top : null, outs: M ? M.S.outs : null,
      count: M ? BZ.countText(M.S) : null, score: M ? M.S.score.slice() : null,
      over: M ? M.S.over : null, walkoff: M ? !!M.S.walkoff : null,
      bases: M ? M.S.bases.map(b => !!b) : null,
      batzookaMeter: BZ.meter ? BZ.meter.slice() : null,
      derby: D ? { phase: D.phase, score: D.players.map(p => p.score), finished: D.finished, hub: !!D.hub, state: BZ.hubState } : null,
      errors: game.errors.length
    };
  }
};

game.start({
  scenes, scene: startScene,
  boot: {
    title: 'BATZOOKA BASEBALL',
    steps: [
      ['Painting the field', () => { BZ.field = BZ.buildField(); }],
      ['Tuning the sound', () => BZ.define(game)]
    ]
  }
});

})();
