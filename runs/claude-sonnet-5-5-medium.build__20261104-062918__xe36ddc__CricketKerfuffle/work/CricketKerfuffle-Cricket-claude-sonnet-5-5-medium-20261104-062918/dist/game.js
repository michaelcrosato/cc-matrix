(() => {
'use strict';
/* ===== 00-core.js ===== */
'use strict';
const E = My3D2dge;
const { clamp, lerp } = E;
const TAU = Math.PI * 2;
const sgn = v => (v < 0 ? -1 : 1);
const hyp = Math.hypot;
let game = null;   // the E.Game, made in 99-start.js

/* ---------- geometry (world units, 16 = 1 m). The pitch runs along x = CX; the striker's stumps are the top end ---------- */
const GW = 56, GH = 60, TS = 16;                  // the field grid
const CX = 448, SY = 330, BY = 650, MY = 490;     // pitch centre line, stumps (striker/bowler ends), pitch middle
const CR0 = 352, CR1 = 628;                       // batters' creases
const YHIT = 364;                                 // the plane where the bat meets the ball
const RX = 330, RY = 360;                         // boundary radii (scaled by the boundaryScale tuning)

/* ---------- seeded random streams: play (gameplay), cos (cosmetic) ---------- */
function mkrng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const RNG = { play: mkrng(12345), cos: mkrng(777) };
const rr = (a, b, f = RNG.play) => a + (b - a) * f();
const rnorm = (f = RNG.play) => { let u = 0; for (let i = 0; i < 4; i++) u += f(); return (u - 2) * 1.7; };
const rpick = (arr, f = RNG.play) => arr[Math.floor(f() * arr.length) % arr.length];

/* ---------- TUNING: the live gameplay variables (dev mode sliders). Systems call T('name') each time ---------- */
const TUNING_DEF = {
  ballSpeed:    [1,    .5, 1.6, 'Bowling pace'],
  gravity:      [160,  80, 300, 'Gravity'],
  pitchBounce:  [.55,   .3, 1.1, 'Pitch bounce'],
  swing:        [1,    0, 2.5,  'Swing amount'],
  spin:         [1,    0, 2.5,  'Spin amount'],
  window:       [.115, .04, .3, 'Batting timing window (s)'],
  batPower:     [1,    .5, 2,   'Bat power'],
  loftPower:    [1,    .5, 2,   'Loft power'],
  hypeGain:     [1,    0, 3,    'Hype gain'],
  fireBalls:    [4,    1, 12,   'ON FIRE length (balls)'],
  runSpeed:     [190,  80, 300, 'Running speed'],
  fieldSpeed:   [92,  60, 240, 'Fielder speed'],
  throwSpeed:   [440,  200, 800,'Throw speed'],
  catchSkill:   [.78,  0, 1,    'Catching skill'],
  boundaryScale:[1,    .6, 1.5, 'Boundary size'],
  aiSkill:      [1,    .3, 2,   'CPU skill'],
  meterSpeed:   [1.1,  .6, 3,   'Release meter speed'],
  chaos:        [1,    0, 3,    'Chaos frequency'],
};
const TV = {};
const T = n => TV[n];
function tuningReset() { for (const k in TUNING_DEF) TV[k] = TUNING_DEF[k][0]; }
tuningReset();

/* ---------- event bus ---------- */
const BUS = { h: {}, log: [] };
const on = (t, fn) => { (BUS.h[t] = BUS.h[t] || []).push(fn); return () => { BUS.h[t] = BUS.h[t].filter(f => f !== fn); }; };
const emit = (t, d = {}) => {
  BUS.log.push(t); if (BUS.log.length > 200) BUS.log.shift();
  for (const f of BUS.h[t] || []) f(d);
  for (const f of BUS.h['*'] || []) f(t, d);
};

/* ---------- small helpers ---------- */
const vlen = (x, y) => hyp(x, y);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const bndRX = () => RX * T('boundaryScale');
const bndRY = () => RY * T('boundaryScale');
const rho = (x, y) => hyp((x - CX) / bndRX(), (y - MY) / bndRY());   // < 1 inside the boundary
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10 < 4 ? n % 10 : 0]);
const KEPT = {}, NONE = {};   // saves fall back to memory where storage is blocked (the AI Hub gives a round an empty one)
const store = {
  get(k, d) { const v = E.store.get('kerfuffle:' + k, NONE); return v !== NONE ? v : (k in KEPT ? KEPT[k] : d); },
  set(k, v) { KEPT[k] = v; E.store.set('kerfuffle:' + k, v); },
};

/* ===== 10-data.js ===== */
/* ---------- content as data: teams, grounds, deliveries, story, commentary ---------- */
const TITLE = 'CRICKET KERFUFFLE';
const TAGLINE = 'Mind the cow. Mind the vicar. Mind the window.';

const TEAMS = {
  kerf:  { name: 'Kerfuffle CC',       short: 'KER', cloth: '#f2ecd6', trim: '#2f7a46', pants: '#f2ecd6', hat: '#2f7a46', hair: '#7a4a2a', skin: '#e8b890' },
  witt:  { name: 'Little Wittering',   short: 'LWT', cloth: '#e8dcc8', trim: '#8a2434', pants: '#e8dcc8', hat: '#8a2434', hair: '#3a2a20', skin: '#d8a074' },
  gumb:  { name: 'Upper Gumbleton',    short: 'UGB', cloth: '#dfe8f4', trim: '#2a4a9a', pants: '#dfe8f4', hat: '#2a4a9a', hair: '#c8b070', skin: '#f0c8a0' },
  mega:  { name: 'Megadome Marauders', short: 'MMM', cloth: '#1c1c28', trim: '#f0b820', pants: '#1c1c28', hat: '#f0b820', hair: '#101010', skin: '#a8703c' },
  rain:  { name: 'The Vicar\'s XI',    short: 'VIC', cloth: '#e8e0f0', trim: '#6a3a8a', pants: '#e8e0f0', hat: '#6a3a8a', hair: '#8a8a8a', skin: '#e0b090' },
};

const GROUNDS = {
  green: { name: 'Wittering Green', sky: ['#7ec8f0', '#cfeaf8', '#f4f0d8'], grass: ['#3f8a38', '#47963f'], ambient: 1, night: false, pitchBounce: 1, speed: 1, music: 'match' },
  cow:   { name: 'Gumbleton Meadow', sky: ['#88c0e8', '#d0e4f0', '#f0e8d0'], grass: ['#4a8c34', '#549a3c'], ambient: 1, night: false, pitchBounce: .95, speed: 1.05, music: 'match' },
  dome:  { name: 'The Megadome', sky: ['#0a0a22', '#1c1840', '#3a2060'], grass: ['#2a6a38', '#307a40'], ambient: .5, night: true, pitchBounce: 1.1, speed: .95, music: 'night' },
};

const DIFFS = [
  { id: 'village', name: 'Village', bowlSigma: .1, batSigma: .11, edge: .6, scale: .8 },
  { id: 'county',  name: 'County',  bowlSigma: .07,  batSigma: .08,  edge: .85, scale: 1 },
  { id: 'test',    name: 'Test',    bowlSigma: .045,  batSigma: .055, edge: 1.1, scale: 1.25 },
];

/* deliveries: the human picks one of three on the face buttons; the special needs a full Hype meter */
const DELIVERIES = {
  pace:  { id: 'pace',  name: 'Quickie',        kmh: 138, sp: 420, swing: 0,    turn: 0,    bounce: 1,   seam: 1.0, btn: 'ground', col: '#e8443a' },
  swing: { id: 'swing', name: 'Banana Swinger', kmh: 124, sp: 350, swing: 120,  turn: 0,    bounce: .95, seam: .6,  btn: 'loft',   col: '#3b82f6' },
  spin:  { id: 'spin',  name: 'Twirly Whirly',  kmh: 82,  sp: 235, swing: 0,    turn: .09,  bounce: 1.1, seam: .2,  btn: 'defend', col: '#22c55e' },
  fire:  { id: 'fire',  name: 'THE FIREBALL',   kmh: 176, sp: 520, swing: 90,   turn: 0,    bounce: 1,   seam: .4,  btn: 'special', col: '#f5b700' },
};
const DELIVERY_ORDER = ['pace', 'swing', 'spin'];

const FIELD_PRESETS = {
  balanced: [[-14, -28], [-44, -8], [-125, 40], [-135, 130], [-60, 265], [70, 262], [135, 135], [125, 30], [70, -95]],
  attack:   [[-14, -28], [-40, -8], [-90, 20], [-70, 60], [-40, 105], [45, 100], [85, 55], [110, 20], [60, -70]],
  defend:   [[-190, 60], [-210, 190], [-95, 310], [90, 305], [200, 190], [190, 60], [120, -120], [-120, -120], [0, 330]],
};

/* ---------- the campaign: three chapters, each a match with a story either side ---------- */
const CHAPTERS = [
  { id: 1, name: 'The Vicar Bets a Scone', opp: 'witt', ground: 'green', overs: 2, wickets: 3, diff: 0, chaos: 'none',
    intro: [
      ['VICAR', 'Good morning, Captain. The Kerfuffle Cup has been missing since Tuesday. Little Wittering say they found it in a hedge and are keeping it.'],
      ['YOU', 'That sounds like a Little Wittering sort of thing to do.'],
      ['VICAR', 'Two overs each. Three wickets a side. If you win, I shall bake you a scone the size of a hat.'],
      ['VICAR', 'Press the button when the ball arrives, not before, and never during the sandwiches.'],
    ],
    win: [['VICAR', 'A famous victory! The scone is in the oven. The Cup remains in the hedge, but one step at a time.']],
    lose: [['VICAR', 'A defeat, but a dignified one. The scone is cancelled. The tea, however, is on me.']] },
  { id: 2, name: 'A Cow Has Opinions', opp: 'gumb', ground: 'cow', overs: 2, wickets: 3, diff: 1, chaos: 'cow',
    intro: [
      ['COACH', 'Upper Gumbleton play on a meadow. The meadow contains a cow. The cow contains no respect for the laws of cricket.'],
      ['YOU', 'Can we move the cow?'],
      ['COACH', 'We tried. She moved us.'],
      ['COACH', 'Hit the ball past her, over her, or in desperate cases, into her. Fill the Hype meter and you go ON FIRE.'],
    ],
    win: [['COACH', 'Beaten fair and square, and the cow is merely a spectator. Between us, she did cheer.']],
    lose: [['COACH', 'Well. The cow is delighted. We shall regroup over cake.']] },
  { id: 3, name: 'The Grand Kerfuffle', opp: 'mega', ground: 'dome', overs: 3, wickets: 3, diff: 2, chaos: 'all',
    intro: [
      ['ANNOUNCER', 'LADIES AND GENTLEMEN, UNDER THE LIGHTS OF THE MEGADOME, THE MARAUDERS WELCOME A VILLAGE SIDE WITH A MOWER AND A DREAM!'],
      ['YOU', 'We have a mower?'],
      ['VICAR', 'We have the mower. We do not have a plan. Aim for the pub window, Captain. It is worth a great deal and the landlord has agreed to forgive us.'],
      ['ANNOUNCER', 'THREE OVERS. THREE WICKETS. ONE TROPHY. NO REFUNDS.'],
    ],
    win: [['ANNOUNCER', 'AGAINST ALL ODDS, AGAINST ALL TASTE, KERFUFFLE CC ARE CHAMPIONS! THE CUP IS FOUND! IT WAS IN THE HEDGE.']],
    lose: [['ANNOUNCER', 'THE MARAUDERS PREVAIL! BUT HONOUR IS INTACT, AND SO IS THE PUB WINDOW. MOSTLY.']] },
];

/* ---------- commentary (a plummy box: digressive, dry, fond of cake) ---------- */
const COMM_NAMES = ['The Hon. Jeremy Thwaite', 'Dot Pemberley'];
const LINES = {
  welcome: ['Good afternoon, and welcome to a ground that has never once been on time.', 'Lovely day for it, and by "it" I mean whatever happens next.'],
  dot: ['Nothing doing. A fine, honest, entirely unproductive ball.', 'Dot ball. The cake tent audibly sighs.', 'Left alone like a wasp at a picnic.', 'No run. The scorer sharpens a pencil out of sheer boredom.'],
  one: ['A single, taken with the enthusiasm of a man paying a parking fine.', 'One run. Every little helps, as the actress said to the bishop.'],
  two: ['Two! Lovely running, both of them nearly arriving at the same time.', 'They pinch a couple. Somewhere a vicar nods approvingly.'],
  three: ['Three! That is a lot of running for a Tuesday.', 'Three runs, and a second helping of exhaustion.'],
  four: ['FOUR! Straight through the gap like a letter through a gate.', 'That is gone for four, and the rope barely had time to flinch.', 'FOUR! The fielder waves politely as it passes.'],
  six: ['SIX! Into the next parish!', 'That has gone further than my last holiday.', 'SIX! Somebody fetch a ladder and a very understanding neighbour.'],
  bowled: ['BOWLED HIM! The stumps cartwheel like a drunk acrobat.', 'Timber! The off stump has left the building.'],
  lbw: ['That looks plumb. The vicar raises a finger, and possibly a eyebrow.', 'LBW! Dead in front, and not a leg to stand on.'],
  caught: ['CAUGHT! Straight down the throat of a man who was thinking about lunch.', 'Taken! The fielder looks as surprised as the ball.'],
  runout: ['RUN OUT! Somebody did the arithmetic and it came up short.', 'Run out! One of them is on a different page of the plan.'],
  dropped: ['Oh, DROPPED! It went in, it went out, it went on holiday.', 'Down it goes! Hands of butter, and not the nice salted kind.'],
  wide: ['Wide! That ball was heading for a different match entirely.', 'Wide, and one extra for the nice people in the other team.'],
  noball: ['No ball! Overstepped, and the free hit will cost him.', 'No ball! The front foot has gone exploring.'],
  fire: ['The bat is ON FIRE. Somebody fetch a bucket, or perhaps a marshmallow.', 'ON FIRE! The laws of cricket are not designed for this.'],
  cow: ['The cow has wandered on. I believe she is a floating voter.', 'There is a cow on the outfield, and she appears to be fielding.'],
  cowstop: ['STOPPED BY THE COW! The finest piece of fielding this season.', 'The cow has intercepted. Nobody has complained, least of all the cow.'],
  rain: ['Rain! Naturally. The covers are, as ever, in a different county.', 'Drizzle. The ball will skid, and so will the vicar.'],
  window: ['THE PUB WINDOW! A thousand shards and a free round on the house.', 'Straight through the window! The landlord is applauding. Possibly.'],
  tea: ['Into the tea urn! Hot work, quite literally.', 'The tea tent is hit! Today there will be scones, and apologies.'],
  golden: ['A golden ball! Everything doubles, including the nerves.', 'Golden ball! Runs are worth double, and so is the embarrassment.'],
  hat: ['And that is another wicket. The innings is wobbling like a jelly on a train.'],
  win: ['And that is the match! Cake for everyone, apart from the losers, who get a sandwich.'],
  lose: ['It was not to be. Still, there was tea, and that is what matters.'],
};

const FIRSTNAMES = ['Barnaby', 'Hattie', 'Rufus', 'Mildred', 'Cuthbert', 'Pippa', 'Wilfred', 'Dorcas', 'Ambrose', 'Tilly', 'Gideon', 'Bertha'];
const SURNAMES = ['Thrumpton', 'Bumble', 'Pettigrew', 'Crumpet', 'Fothergill', 'Wigglesworth', 'Dibble', 'Snodgrass', 'Plumtree', 'Noakes'];

/* ===== 14-feedback.js ===== */
/* generated by tools/build.mjs from tools/feedback.json */
const FEEDBACK = {"sourceInformation":{"date":"2026-11-04 06:29:18","source":"cricket (over the top arcade style)","plan":"PLAN.md (written by claude-opus-5-5 at max effort); built in a reduced scope, TASK.md winning where they differ","genre":"Arcade sports (cricket) with a comedy story campaign","perspective":"2.5D three-quarter broadcast camera behind the bowler, with a wide follow cut once the ball is hit","tech":"my-3D2dge v0.85.2 (modified, 5 engine changes); plain JavaScript in one IIFE bundled into a single HTML file; AI Hub session client 1.4.0 (unmodified); Node 24 and Playwright 1.63.0 for the tests","artDirection":"The engine's native pixel-art-from-3D-rigs look: Humanoid rigs (with a new cricket bat), a procedural ground texture, and buildings, cow, crowd and stumps drawn in code","animation":"The engine's Humanoid rig with E.MOVES (backslash, rising, twohand, throw), poses (cheer, kneel, crouch, hips) and run cycles, driven by the match simulation","audio":"All in code: chip-synth effects and five songs, plus a Web Audio formant synth for Animalese-style gibberish commentary and cutscene voices; no audio files","online":"AI Hub Session Protocol v1, parallel mode: a seeded one-over Super Over, same balls on every copy, scores reported to the hub; also passes the hub harness","testing":"Headless only: vm-driven simulation checks, a scripted human playthrough of every mode through the real scenes, a Playwright browser smoke run, and the AI Hub harness","research":"None beyond the engine docs, the AI Hub README and the plan","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-sonnet-5-5, reasoning effort medium","usage":"unknown"},"testingFeedback":["About ten real issues: a rolling ball re-bouncing every step (41,000 bounce events), a falsy batter id (0) that meant a ball hit by the first batter was never judged a boundary and the match stalled for 28 s a ball, CPU batters running into certain run-outs, far too many wides, sixes and over-the-stumps deliveries, a bat weapon the engine rejected, a missing in-memory save fallback, a camera zoom that cropped the striker, and font glyphs that drew as question marks.","Three: the falsy hitBy id (play froze), the engine whitelist that silently replaced the bat with a sword, and the camera framing that hid the batter behind the HUD.","Running 30 complete AI-versus-AI matches headless and printing the distribution of outcomes (extras, dismissals, boundaries, runs per ball). It found the stalled balls and every balance problem within seconds.","A Playwright autopilot that pressed keys through polling: browser latency meant it could not hit the timing window, so it only proved the page did not crash. The scripted headless input taps were far more useful for the same job."],"engineFeedback":["Humanoid rigs with ready-made moves and poses (a bowler's throw, a batter's backslash, cheers and crouches) gave the game animated characters for free, and the Game shell (pause menu, settings, glyphs, corner buttons) plus game.advance and game.debug made headless testing of whole scenes easy.","Yes. I assumed game.setZoom(1) meant the view scale; the three-quarter view's base scale is 1.5 and zoom cannot go below 0.5, so my first framing was far too tight. I also assumed a bat weapon would just work (a whitelist swapped it for a sword) and that E.store works in Node (it needs localStorage).","The entire cricket simulation: ball physics with a predictor that uses the same step, the laws (wides, no balls, LBW, catches, run-outs), running between the wickets, fielder AI, hype and ON FIRE, chaos events, plus the HUD, the 10-foot menus, the formant voice synth and the hub round.","Working out the camera: the relationship between view scale, zoom, the camera focus and the buffer size on an expanded 427x240 screen, and fitting a 10-foot UI in the engine's pixel font at that size.","Five changes: a cricket bat weapon in the Humanoid draw (plus its whitelist entry and swing smear), an audio voice bus with a Voices volume setting and audio.bus(name), PlayStation as the default button-symbol set with an Xbox (A B X Y) option, and a TileMap floor cache of ten baked floors instead of six. Logged in engine/CHANGES-KERFUFFLE.md.","A wider documented camera zoom range, with the base view scale stated beside the presets (zoom below 0.5 and the true pixels-per-unit of each view would have saved me an hour)."],"promptFeedback":["The concrete deliverables and the testing guidance (one command, only failures printed, no subagent audits), and the exit interview, which makes the run record useful. The plan was rich with ideas to steal.","The plan is about 148 KB and asks for far more than one session can build; it was unclear how much of it I was expected to honour. The plan's file and folder names (claude-opus-5-5-max-20261103-174825) differ from TASK.md's, and I had to resolve that myself.","Scoping: a feature-complete vertical slice with story, four modes, attract mode, dev mode, local and online multiplayer, Animalese voices and a 10-foot controller UI, verified without a human eye on the screen.","Tier the plan into must, should and could, state a rough size for a good slice, and say plainly which of the plan's names and numbers TASK.md overrides. A short reference game on the engine would also help calibrate scope."],"aiHub":{"name":"Cricket Kerfuffle","tagline":"Mind the cow. Mind the vicar. Mind the window.","description":"An over-the-top arcade cricket game: time your swing, aim past the cow, go ON FIRE and put one through the pub window. Story, quick match, a seeded Super Over for AI Hub sessions, and two-player versus.","type":"Game","genre":"Sports","source":"cricket","series":"","players":"1–4","controls":"Stick or mouse aims; Cross or J drives, Square or K lofts, Circle or L blocks, Triangle or E goes ON FIRE, R1 or Space runs, L1 or Q changes the field","tags":["arcade","comedy","sports","retro","versus","story"]}};

/* ===== 15-about.js ===== */
/* ---------- the About / Credits pages (Source Information and the three feedback sections are the same text as the exit interview) ---------- */
const ABOUT_PAGES = [
  { title: 'CRICKET KERFUFFLE', items: [
    ['', 'An over-the-top arcade cricket game. Tea, cake, drizzle, a vicar for an umpire and a cow at deep midwicket, delivered in the voice of the commentary box and then turned up to eleven: flaming bats, golden balls, sixes through the pub window.'],
    ['Modes', 'Story (three chapters), Quick Match, Super Over (high scores, and the AI Hub parallel round), Versus (two players, one screen), and an attract mode after ten idle seconds on the title.'],
    ['Dev mode', 'Pause during a match and choose Dev mode: live sliders for every balance variable, a reset, and quick tools (score a six, take a wicket, spawn a cow, rain, golden ball, god mode, slow motion).'],
    ['Source', 'cricket (over the top arcade style).'],
  ] },
  { title: 'SOURCE INFORMATION', items: [] },
  { title: 'TESTING FEEDBACK', items: [] },
  { title: 'ENGINE FEEDBACK', items: [] },
  { title: 'PROMPT FEEDBACK', items: [] },
];
(function fillAbout() {
  const F = FEEDBACK, S = F.sourceInformation, labels = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
  ABOUT_PAGES[1].items = Object.keys(labels).map(k => [labels[k], S[k]]);
  const qa = (qs, ans) => qs.map((q, i) => ['', 'Q: ' + q + ' A: ' + ans[i]]);
  ABOUT_PAGES[2].items = qa(['Issues caught?', 'Game breaking?', 'Most helpful test?', 'Least helpful test?'], F.testingFeedback);
  ABOUT_PAGES[3].items = qa(['Liked most?', 'Stuck or guessed wrong?', 'Built myself?', 'Hardest part?', 'Changed in the engine?', 'Change one thing?'], F.engineFeedback);
  ABOUT_PAGES[4].items = qa(['Liked most?', 'Confusing?', 'Hardest thing?', 'What to change?'], F.promptFeedback);
})();

/* ===== 20-ball.js ===== */
/* ---------- the ball: physics and a predictor that uses the very same step ---------- */
function newBall() {
  return { x: CX, y: BY - 8, z: 34, vx: 0, vy: 0, vz: 0, phase: 'held', pitched: false, bounces: 0, carried: false,
    swingA: 0, seamDev: 0, turn: 0, age: 0, bounceMul: 1, wet: false, groundBounce: 1, hitBy: null, holder: null, trail: [], fire: false, golden: false };
}
const cloneBall = b => Object.assign({}, b, { trail: [] });

/* one step of 1/120 s (dt); returns 'pitched' | 'bounce' | null. No random numbers: prediction equals reality */
function stepBall(b, dt) {
  if (b.phase === 'held' || b.phase === 'dead') return null;
  b.age += dt;
  if (b.rolling && b.z <= 0) {   // rolling on the grass: friction only
    const k = .55 * (b.wet ? 1.6 : 1), f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
    if (hyp(b.vx, b.vy) < 4) { b.vx = b.vy = 0; }
    b.x += b.vx * dt; b.y += b.vy * dt; return null;
  }
  b.vz -= T('gravity') * dt;
  if (b.phase === 'delivery' && !b.pitched && b.swingA) {
    const sp = hyp(b.vx, b.vy) || 1, k = Math.min(1, b.age / .35) * T('swing');
    b.vx += (-b.vy / sp) * b.swingA * k * dt;   // lateral push (x), the pace is kept
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  let ev = null;
  if (b.z <= 0 && b.vz < 0) {
    b.z = 0;
    if (b.phase === 'delivery' && !b.pitched) {
      b.pitched = true; b.vz = -b.vz * T('pitchBounce') * b.groundBounce * b.bounceMul;
      const a = b.turn * T('spin') + b.seamDev, c = Math.cos(a), s = Math.sin(a), vx = b.vx * .86, vy = b.vy * .86;
      b.vx = vx * c - vy * s; b.vy = vx * s + vy * c;
      ev = 'pitched';
    } else {
      b.bounces++; b.carried = false;
      b.vz = -b.vz * .42; b.vx *= .86; b.vy *= .86;
      if (b.vz < 25) { b.vz = 0; b.rolling = true; }
      ev = 'bounce';
    }
  }
  return ev;
}

/* the delivery's launch velocity: lands on (tx, ty) with no swing, from the release point (rx, ry, rz) at ground speed sp */
function solveDelivery(rx, ry, rz, tx, ty, sp) {
  const d = hyp(tx - rx, ty - ry), t = Math.max(.12, d / sp), g = T('gravity');
  return { vx: (tx - rx) / t, vy: (ty - ry) / t, vz: (g * t * t / 2 - rz) / t, t };
}

/* run the same step on a copy until fn(copy) says stop (or maxT): returns { t, b } */
function predictUntil(b, fn, maxT = 4) {
  const c = cloneBall(b);
  for (let i = 0, n = Math.round(maxT * 120); i < n; i++) {
    stepBall(c, 1 / 120);
    if (fn(c)) return { t: (i + 1) / 120, b: c, hit: true };
  }
  return { t: maxT, b: c, hit: false };
}
const predictPlane = (b, y = YHIT) => predictUntil(b, c => c.y <= y, 3);
const predictLanding = b => predictUntil(b, c => (c.z <= 1.5 && c.bounces + (c.pitched ? 1 : 0) >= 1) || c.bounces > 0 || rho(c.x, c.y) > 1.3, 5);

/* the shot resolver: maps timing quality, shot type and aim to a launch velocity */
function shotVelocity(b, shot, aim, err, q, fire, edge, rnd) {
  const win = T('window');
  let phi = Math.atan2(aim[1], aim[0]);
  phi -= clamp(err * 5, -.55, .55);                 // early: pulled to the leg side; late: steered to the off side
  let sp, vz;
  const pace = hyp(b.vx, b.vy);
  if (shot === 'defend') { sp = 85 + pace * .08; vz = 6; }
  else if (shot === 'loft') { sp = 215 * (.42 + .7 * q) * T('loftPower') + pace * .12 * q; vz = (95 + 115 * q) * T('loftPower'); }
  else { sp = 258 * (.5 + .7 * q) * T('batPower') + pace * .15 * q; vz = 10 + 35 * (1 - q) * rnd(); }
  if (fire && shot !== 'defend') { sp *= 1.3; if (shot === 'loft') vz *= 1.18; }
  if (edge) {   // a thick edge flies behind the batter: the keeper or the slips
    phi = -Math.PI / 2 + rr(-.7, .7, rnd) + (err > 0 ? .5 : -.5); sp *= .6; vz = rr(35, 105, rnd);
  } else if (shot === 'loft' && q < .3) { sp *= .8; vz *= 1.15; }   // a skier
  return { vx: Math.cos(phi) * sp, vy: Math.sin(phi) * sp, vz, phi };
}

/* ===== 21-match.js ===== */
/* ---------- the match: laws, scoring, fielding, running, hype and chaos. Pure simulation: no drawing, no audio ---------- */
const SWING_DELAY = .09, SWING_DUR = .36;
const TARGETS = [
  { id: 'window', name: 'PUB WINDOW', ang: -34, r: 46, pts: 10, col: '#7ad0ff' },
  { id: 'urn',    name: 'TEA URN',    ang: 38,  r: 44, pts: 8,  col: '#ffb860' },
  { id: 'clock',  name: 'CLOCK TOWER',ang: 90,  r: 46, pts: 6,  col: '#f0e060' },
  { id: 'bell',   name: 'CHURCH BELL',ang: 150, r: 44, pts: 8,  col: '#d0c0ff' },
];
const targetPos = t => [CX + bndRX() * Math.cos(t.ang * Math.PI / 180), MY + bndRY() * Math.sin(t.ang * Math.PI / 180)];
const newIntent = () => ({ shot: null, aim: null, run: false, runHeld: false, special: false, mx: 0, my: 0, bowl: null, release: false, cycle: false, dive: false });

function mkSide(team, ctrl) {
  const names = []; const r = mkrng(team.length * 977 + team.charCodeAt(0) * 31);
  for (let i = 0; i < 14; i++) names.push(FIRSTNAMES[Math.floor(r() * FIRSTNAMES.length)] + ' ' + SURNAMES[Math.floor(r() * SURNAMES.length)]);
  return { team, ctrl: ctrl || null, score: 0, wkts: 0, balls: 0, fours: 0, sixes: 0, extras: 0, hype: 0, fire: 0, names, nextBat: 2, history: [] };
}

function createMatch(cfg) {
  const ground = GROUNDS[cfg.ground || 'green'], diff = DIFFS[cfg.diff == null ? 1 : cfg.diff];
  const M = {
    cfg, ground, diff, hub: !!cfg.hub, attract: !!cfg.attract, cheat: !!cfg.cheat, single: !!cfg.single || !!cfg.hub,
    overs: cfg.overs || 2, maxW: cfg.wickets || 3,
    sides: [mkSide(cfg.teamA || 'kerf', cfg.ctrlA), mkSide(cfg.teamB || 'witt', cfg.ctrlB)],
    inn: 0, bat: cfg.batFirst === 1 ? 1 : 0, target: 0, result: null, over: false,
    ph: 'pre', t: 0, clock: 0, ballNo: 0, freeHit: false, golden: false, wet: false, wetLeft: 0,
    ball: newBall(), balls: [], marker: [CX, 440], delType: 'pace', field: 'balanced', side: 1,
    banner: null, last: null, hit: null, swing: null, runup: null, plan: null, runs: 0, restEnd0: 0, pending: null,
    fielders: [], batters: [], cow: null, umpire: { x: CX + 28, y: BY + 4, signal: 0 }, active: 0, shake: 0, bailsOff: 0,
    commLock: 0, chaosLeft: 0, caughtBy: null, lastRunT: 0, hold: 0, ballLog: [],
  };
  const sideBat = () => M.sides[M.bat], sideBowl = () => M.sides[1 - M.bat];
  M.sideBat = sideBat; M.sideBowl = sideBowl;
  let rBcur = null;
  const rB = () => (rBcur ? rBcur() : RNG.play());
  let rF = () => RNG.play();
  const strikerOf = () => M.batters[M.sIdx || 0];
  const bname = b => (b && sideBat().names[b.nameIdx || 0]) || 'the batter';
  M.striker = strikerOf;

  /* ----- people ----- */
  function resetField() {
    const fp = FIELD_PRESETS[M.field] || FIELD_PRESETS.balanced;
    M.fielders = [];
    M.fielders.push(mkF(0, 'bowler', CX, BY - 30, 'bowler'));
    M.fielders.push(mkF(1, 'keeper', CX, SY - 34, 'keeper'));
    fp.forEach((p, i) => M.fielders.push(mkF(2 + i, 'field', CX + p[0], SY + p[1], 'fielder')));
    for (const f of M.fielders) { f.hx = f.x; f.hy = f.y; }
  }
  function placeBatters() {
    for (const b of M.batters) {
      b.moving = false; b.tgt = b.end; b.y = b.end === 0 ? CR0 : CR1; b.x = b.end === 0 ? CX : CX + 24; b.swingT = -1; b.vy = 0;
      b.face = b.end === 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    M.runs = 0; M.restEnd0 = M.batters[0].end;
  }
  function replaceOut() {
    const out = M.batters.find(b => b.out); if (!out) return;
    if (M.last && M.last.how === 'runout') { out.end = out.tgt; const o = M.batters.find(b => b !== out); o.end = 1 - out.end; }
    out.out = 0; out.nameIdx = sideBat().nextBat++;
  }
  function mkF(id, role, x, y, kind) { return { id, role, kind, x, y, hx: x, hy: y, vx: 0, vy: 0, face: Math.PI / 2, dive: 0, holdT: 0, hasBall: false, celeb: 0, anim: 0, drop: 0, throwT: 0 }; }
  function mkB(id, end) { return { id, end, tgt: end, moving: false, x: end === 0 ? CX : CX + 24, y: end === 0 ? CR0 : CR1, face: end === 0 ? Math.PI / 2 : -Math.PI / 2, out: 0, vy: 0, swingT: -1, swingType: null, turned: 0 }; }
  M.setField = name => { M.field = name; const fp = FIELD_PRESETS[name]; fp.forEach((p, i) => { const f = M.fielders[2 + i]; f.hx = CX + p[0]; f.hy = SY + p[1]; }); };

  /* ----- ball set-up ----- */
  function nextBall() {
    M.ballNo++;
    const S = sideBat();
    resetField(); placeBatters();
    M.batterEnds();
    M.noBall = false; M.padHit = false;
    rBcur = cfg.rngBall ? cfg.rngBall(M.ballNo) : null;
    M.ball = newBall(); M.balls = [];
    M.ball.wet = M.wet; M.ball.groundBounce = ground.pitchBounce * (M.wet ? .8 : 1);
    M.swing = null; M.runup = null; M.plan = null; M.hit = null; M.caughtBy = null;
    M.freeHit = !!M.pendingFreeHit; M.pendingFreeHit = false;
    M.ph = 'setup'; M.t = 0;
    M.golden = M.goldenNext; M.goldenNext = false;
    rF = cfg.rngF ? cfg.rngF(M.ballNo) : () => RNG.play();
    M.setField(M.field);
    M.marker = [CX + rr(-6, 6, rB), rr(430, 470, rB)];
    emit('ball:next', { no: M.ballNo, free: M.freeHit, golden: M.golden });
  }
  M.batterEnds = () => { M.sIdx = M.batters.findIndex(b => b.end === 0); if (M.sIdx < 0) M.sIdx = 0; };

  function startInnings() {
    resetField(); M.ballNo = 0; M.freeHit = false; M.pendingFreeHit = false; M.goldenNext = false;
    for (const s of M.sides) { s.hype = Math.min(s.hype, 40); s.fire = 0; }
    sideBat().nextBat = 2; M.batters = [mkB(0, 0), mkB(1, 1)]; M.batters[0].nameIdx = 0; M.batters[1].nameIdx = 1; placeBatters();
    M.ph = 'intro'; M.t = 0;
    emit('innings:start', { inn: M.inn });
  }

  /* ----- scoring and the end of a ball ----- */
  function banner(text, sub, col, t = 1.8) { M.banner = { text, sub: sub || '', col: col || '#fff', t, t0: t }; }
  function hypeAdd(side, n) {
    const S = M.sides[side]; if (S.fire > 0) return;
    const before = S.hype; S.hype = clamp(S.hype + n * T('hypeGain'), 0, 100);
    if (before < 100 && S.hype >= 100) emit('hype:full', { side });
  }
  function igniteBat(side) {
    const S = M.sides[side]; if (S.hype < 100 || S.fire > 0) return false;
    S.hype = 0; S.fire = Math.round(T('fireBalls')); emit('fire:on', { side, role: 'bat' });
    return true;
  }
  function finish(kind, o = {}) {
    if (M.ph === 'between' || M.ph === 'done') return;
    if (kind === 'wicket' && M.god && sideBat().ctrl) { kind = 'runs'; o = { runs: 0 }; }
    const S = sideBat(), B = sideBowl(), ball = M.ball;
    let runs = o.runs || 0, text = '', sub = '', col = '#fff', legal = true, out = false, how = o.how;
    const nb = M.noBall && kind !== 'wide';
    if (nb) { legal = false; S.extras += 1; S.score += 1; M.pendingFreeHit = true; emit('extra', { kind: 'noball' }); }
    if (kind === 'wide') { legal = false; S.extras += 1; runs = 1; text = 'WIDE'; col = '#ffd860'; emit('extra', { kind: 'wide' }); }
    else if (kind === 'noball') { legal = false; S.extras += 1; runs += 1; M.pendingFreeHit = true; text = 'NO BALL'; sub = 'FREE HIT next ball'; col = '#ff8040'; emit('extra', { kind: 'noball' }); }
    else if (kind === 'wicket') {
      out = !((M.freeHit || nb) && how !== 'runout');
      if (!out) { text = nb ? 'NO BALL!' : 'FREE HIT!'; sub = 'Reprieved - no wicket'; col = '#ffd860'; runs = 0; }
    }
    if (ball.golden || M.golden) { if (kind !== 'wide' && kind !== 'noball') runs *= 2; }
    if (kind === 'wide' || kind === 'noball') { S.score += runs; }
    else S.score += runs + (o.bonus || 0) * 1;
    if (o.bonus) S.score += 0;
    if (legal) { S.balls++; }
    if (kind === 'wicket' && out) { S.wkts++; text = how === 'bowled' ? 'BOWLED!' : how === 'lbw' ? 'LBW!' : how === 'caught' ? 'CAUGHT!' : how === 'runout' ? 'RUN OUT!' : 'OUT!'; col = '#ff5040'; sub = (o.who || '') ; M.umpire.signal = 2;
      hypeAdd(M.bat, -15); hypeAdd(1 - M.bat, 35); emit('wicket', { how, side: M.bat, who: o.who });
      const ob = o.batter || strikerOf();
      if (ob) { ob.out = 1; }
    } else if (kind === 'boundary') {
      const n = o.runs; if (n === 6) S.sixes++; else S.fours++;
      text = n === 6 ? 'SIX!' : 'FOUR!'; col = n === 6 ? '#ffd040' : '#7ae0ff';
      if (o.target) { text = o.target.name + '!'; sub = '+' + o.target.pts + ' BONUS RUNS'; col = o.target.col; }
      hypeAdd(M.bat, n === 6 ? 38 : 22); emit('boundary', { n, target: o.target || null, side: M.bat });
      if (M.golden) sub = (sub ? sub + ' • ' : '') + 'GOLDEN BALL ×2';
    } else if (kind === 'runs') {
      const n = o.runs;
      if (n === 0) { text = M.swing && M.swing.miss ? 'BEATEN!' : (M.padHit ? 'ON THE PADS' : 'DOT BALL'); sub = M.swing && M.swing.miss ? 'Played and missed' : ''; col = '#c8d0c0'; hypeAdd(1 - M.bat, M.swing && M.swing.miss ? 14 : 9); }
      else { text = n + (n === 1 ? ' RUN' : ' RUNS'); col = '#fff'; hypeAdd(M.bat, 3 * n); }
      if (o.perfect) hypeAdd(M.bat, 10);
      emit('runs', { n, side: M.bat });
    }
    if (kind === 'wide') hypeAdd(M.bat, 0);
    if (S.fire > 0 && legal) { S.fire--; if (S.fire <= 0) emit('fire:off', { side: M.bat }); }
    if (B.fire > 0 && legal) B.fire = Math.max(0, B.fire - 1);
    M.last = { kind, runs, how: out ? how : null, text, legal, ballNo: M.ballNo, free: M.freeHit };
    if (nb && !text.startsWith('NO')) { sub = (sub ? sub + ' • ' : '') + 'NO BALL +1, FREE HIT next'; }
    S.history.push(out ? 'W' : kind === 'wide' ? 'Wd' : kind === 'noball' ? 'Nb' : String(runs));
    if (S.history.length > 24) S.history.shift();
    banner(text, sub, col, 1.7);
    M.ph = 'between'; M.t = 0; M.hold = 0;
    emit('ball:end', { kind, runs, legal, out, how });
    const total = S.score;
    if (legal && S.balls % 6 === 0 && S.balls > 0) emit('over:end', { over: S.balls / 6, side: M.bat });
    // a chase can be won mid-over
    if (M.inn === 1 && !M.single && total >= M.target) M.endInnings = 'chased';
    else if (S.wkts >= M.maxW) M.endInnings = 'allout';
    else if (S.balls >= M.overs * 6) M.endInnings = 'overs';
    else M.endInnings = null;
    if (M.hub && M.endInnings) M.endInnings = M.endInnings;
  }
  M.finish = finish;

  function afterBetween() {
    if (M.endInnings) {
      const why = M.endInnings; M.endInnings = null;
      if (M.single || M.inn === 1) return endMatch(why);
      M.target = sideBat().score + 1; M.inn = 1; M.bat = 1 - M.bat;
      emit('innings:end', { why, target: M.target });
      startInnings(); return;
    }
    // end of an over: the strike changes, a new chaos roll
    const S = sideBat();
    if (M.last && M.last.legal && S.balls % 6 === 0) {
      for (const b of M.batters) b.end = 1 - b.end;
      rollChaos();
    }
    replaceOut();
    nextBall();
  }

  function endMatch(why) {
    const a = M.sides[0], b = M.sides[1];
    M.ph = 'done'; M.over = true;
    if (M.single) M.result = { winner: -1, margin: 'single', why };
    else if (a.score === b.score) M.result = { winner: -1, margin: 'tie', why };
    else {
      const w = a.score > b.score ? 0 : 1, ws = M.sides[w];
      let margin = '';
      if (w === M.bat) margin = 'by ' + (M.maxW - ws.wkts) + ' wicket' + (M.maxW - ws.wkts === 1 ? '' : 's');
      else margin = 'by ' + Math.abs(a.score - b.score) + ' run' + (Math.abs(a.score - b.score) === 1 ? '' : 's');
      M.result = { winner: w, margin, why };
    }
    emit('match:end', M.result);
  }

  /* ----- chaos: cows, rain and golden balls ----- */
  function rollChaos() {
    const mode = cfg.chaos || 'all', k = T('chaos');
    if (M.hub || mode === 'none' && !cfg.golden) { return; }
    if (rB() < .3 * k && (mode === 'all' || mode === 'gold')) { M.goldenNext = true; emit('chaos', { id: 'golden' }); }
    if (mode === 'none') return;
    if (!M.cow && (mode === 'cow' || mode === 'all') && rF() < .6 * k) {
      const a = rr(.4, 2.6, rF);
      M.cow = { x: CX + Math.cos(a) * 190, y: MY + Math.sin(a) * 200, vx: 0, vy: 0, tx: CX + 150, ty: MY + 180, mood: 0, stopped: 0, moo: 0 };
      emit('chaos', { id: 'cow' });
    }
    if (!M.wet && (mode === 'all') && rF() < .35 * k) { M.wet = true; M.wetLeft = 2; emit('chaos', { id: 'rain' }); }
    else if (M.wet) { M.wetLeft--; if (M.wetLeft <= 0) { M.wet = false; emit('chaos', { id: 'rain:end' }); } }
  }
  M.rollChaos = rollChaos;

  /* ----- AI: bowling and batting intents (the same inputs a person uses) ----- */
  function aiBowl() {
    const it = newIntent();
    if (M.ph === 'setup') {
      if (M.t > .55) {
        const B = sideBowl(), d0 = rB(), d1 = rB(), mx = rr(-14, 14, rB), my = rr(410, 500, rB), d2 = rB(), wild = rr(-22, 22, rB);
        if (B.hype >= 100 && d0 < .6) it.bowl = 'fire';
        else it.bowl = d1 < .45 ? 'pace' : d1 < .75 ? 'swing' : 'spin';
        M.marker = [CX + mx, my];
        if (d2 < .08) M.marker[0] += wild;   // the odd wild one
      }
    } else if (M.ph === 'runup' && M.runup) {
      const R = M.runup, f = T('meterSpeed'), tm = R.t - R.meterStart;
      if (!R.aiAt) {
        const sigma = diff.bowlSigma / T('aiSkill') * (M.cheat ? .2 : 1), k = Math.floor(rB() * 2), cross = (R.cross + k * .5) / f;
        R.aiAt = R.meterStart + Math.max(.18, cross + rnorm(rB) * sigma * 1.5);
      }
      if (R.t >= R.aiAt) it.release = true;
    }
    return it;
  }

  function aiBat() {
    const it = newIntent(), P = M.plan;
    if (M.ph === 'flight' && P && !M.swing) {
      if (!P.leave && M.clock >= P.at) { it.shot = P.type; it.aim = P.aim; }
    }
    if (M.ph === 'setup' && sideBat().hype >= 100 && sideBat().fire === 0 && M.t > .3) it.special = true;
    if (M.ph === 'inplay') aiRun(it);
    return it;
  }
  function planBat() {
    const b = M.ball, pr = predictPlane(b), wide = Math.abs(pr.b.x - CX) > 24 || pr.b.z > 44;
    const sigma = diff.batSigma / T('aiSkill') * (M.cheat ? .12 : 1) * (sideBat().fire > 0 ? 1.4 : 1);
    const err = rnorm(rB) * sigma, hype = sideBat().hype;
    const lr = rB(), loft = M.cheat ? lr < .55 : lr < (.18 + hype / 400 + (M.inn === 1 ? .1 : 0));
    // aim for the biggest gap among the fielders
    let best = null, bs = -1;
    for (let a = -75; a <= 75; a += 15) {
      const ang = Math.PI / 2 - a * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang);
      let near = 1e9;
      for (const f of M.fielders) { if (f.role === 'keeper') continue; const rx = f.hx - CX, ry = f.hy - YHIT, proj = rx * dx + ry * dy; if (proj <= 0) continue; const perp = Math.abs(rx * dy - ry * dx); if (perp < 40) near = Math.min(near, proj); }
      const score = Math.min(near, 500) + rB() * 90; if (score > bs) { bs = score; best = [dx, dy]; }
    }
    const l0 = rB(), l1 = rB();
    const leave = wide && !M.cheat ? l0 < .9 : (!M.cheat && l0 < .06);
    M.plan = { at: M.clock + pr.t - SWING_DELAY + err, type: loft ? 'loft' : l1 < .1 ? 'defend' : 'ground', aim: best, leave: leave || (wide && M.cheat) };
  }
  /* when can a fielder first reach the ball's path? (the AI's read of the shot) */
  function interceptTime() {
    const c = cloneBall(M.ball);
    for (let i = 1; i <= 80; i++) {
      for (let k = 0; k < 12; k++) stepBall(c, 1 / 120);
      const t = i * .1;
      if (rho(c.x, c.y) >= 1 && c.bounces === 0 || rho(c.x, c.y) >= 1) return { t: 99, x: c.x, y: c.y };
      if (c.z > 14) continue;
      for (const f of M.fielders) {
        if (f.role === 'keeper' && c.y > SY + 40) continue;
        if (hyp(f.x - c.x, f.y - c.y) / T('fieldSpeed') <= t) return { t, x: c.x, y: c.y };
      }
    }
    return { t: 6, x: c.x, y: c.y };
  }
  function aiRun(it) {
    if (M.ph !== 'inplay') return;
    const bt = M.batters, moving = bt.some(b => b.moving), ball = M.ball;
    const tRun = (CR1 - CR0) / T('runSpeed');
    if ((ball.phase === 'held' || ball.thrownTo != null) && !moving) return;
    if (!M.hit.ic || M.clock - M.hit.icAt > .4) { M.hit.ic = interceptTime(); M.hit.icAt = M.clock; }
    const ic = M.hit.ic, air = ball.carried && ball.z > 6;
    const dEnd = Math.min(hyp(ic.x - CX, ic.y - SY), hyp(ic.x - CX, ic.y - BY));
    const tRetr = ic.t - (M.clock - M.hit.icAt) + .42 + dEnd / T('throwSpeed');
    const need = tRun * (M.cheat ? .95 : 1.05);
    if (!moving) { if (air && !M.cheat) return; if (ic.t < 98 && tRetr > need) { it.run = true; it.runHeld = true; } }
    else it.runHeld = ic.t < 98 && tRetr > need * .75;
  }
  M.aiBat = aiBat; M.aiBowl = aiBowl;

  /* ----- running between the wickets ----- */
  function startRun() {
    for (const b of M.batters) { b.tgt = 1 - b.end; b.moving = true; }
  }
  function updateRun(dt, intent) {
    if (M.ph !== 'inplay') return;
    const bt = M.batters, moving = bt.some(b => b.moving);
    if (intent.run) {
      if (!moving) startRun();
      else for (const b of bt) { if (b.moving) b.tgt = b.tgt === 0 ? 1 : 0; }   // turn back
    }
    for (const b of bt) {
      if (!b.moving) { b.vy = 0; continue; }
      const dest = b.tgt === 0 ? CR0 : CR1, dir = Math.sign(dest - b.y) || 1;
      b.vy = dir * T('runSpeed'); b.y += b.vy * dt; b.face = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if ((dir > 0 && b.y >= dest) || (dir < 0 && b.y <= dest)) { b.y = dest; b.end = b.tgt; b.moving = false; b.vy = 0; b.turned = 0; }
    }
    if (!bt.some(b => b.moving)) {
      if (bt[0].end !== M.restEnd0) {
        M.restEnd0 = bt[0].end; M.runs++; M.lastRunT = M.clock;
        emit('run', { n: M.runs });
        if (intent.runHeld && M.ball.phase !== 'held') startRun();
      } else if (intent.runHeld && M.ball.phase !== 'held' && !M.hit.boundaryDone) { /* held but not moving: wait for a fresh call */ }
    }
  }

  /* ----- fielding ----- */
  function throwTo(f, endIdx) {
    const ball = M.ball, ty = endIdx === 0 ? SY + 6 : BY - 6, g = T('gravity');
    const tx = CX + rnorm(rF) * (f.kind === 'keeper' ? 3 : 7), d = hyp(tx - f.x, ty - f.y), t = Math.max(.15, d / T('throwSpeed'));
    ball.phase = 'live'; ball.holder = null; ball.x = f.x; ball.y = f.y; ball.z = 20; ball.vx = (tx - f.x) / t; ball.vy = (ty - f.y) / t; ball.vz = (g * t * t / 2 + 8 - 20) / t;
    ball.thrownTo = endIdx; ball.carried = false; ball.bounces = 0; ball.rolling = false; ball.hitBy = null;
    f.hasBall = false; f.throwT = .35; f.holdT = 0;
    emit('throw', { end: endIdx });
  }
  function runnerEnds() {
    // ends the runners are heading to (and are not yet safe at)
    const out = [];
    for (const b of M.batters) if (b.moving) out.push({ end: b.tgt, b, d: Math.abs(b.y - (b.tgt === 0 ? CR0 : CR1)) });
    return out;
  }
  function arriveThrow(endIdx) {
    const ball = M.ball;
    const risks = runnerEnds().filter(r => r.end === endIdx && r.d > 10);
    if (risks.length && !M.freeHit0) {
      const r = risks[0]; ball.phase = 'held'; ball.thrownTo = null;
      M.fielders[endIdx === 0 ? 1 : 0].hasBall = true;
      M.bailsOff = 1.2; emit('stumps', { end: endIdx });
      // a runner mid-pitch out of his ground
      const who = bname(r.b);
      M.hit.runoutBatter = r.b;
      finish('wicket', { how: 'runout', who, batter: r.b, runs: M.runs });
      return true;
    }
    ball.phase = 'held'; ball.thrownTo = null; ball.vx = ball.vy = 0;
    const rec = M.fielders[endIdx === 0 ? 1 : 0]; rec.hasBall = true; rec.holdT = 0; ball.holder = rec;
    return false;
  }
  function updateFielders(dt, bowlIn) {
    const ball = M.ball, live = ball.phase === 'live' && M.ph === 'inplay';
    M.clock0 = (M.clock0 || 0) + dt;
    // who chases: the two nearest to where the ball will be
    if (live && !ball.thrownTo) {
      M.chaseT = (M.chaseT || 0) - dt;
      if (M.chaseT <= 0) {
        M.chaseT = .15;
        let tx = ball.x + ball.vx * .25, ty = ball.y + ball.vy * .25;
        if (ball.carried && ball.z > 3) { const pr = predictLanding(ball); tx = pr.b.x; ty = pr.b.y; M.landing = [tx, ty]; }
        else M.landing = null;
        tx = clamp(tx, CX - bndRX() * 1.1, CX + bndRX() * 1.1); ty = clamp(ty, MY - bndRY() * 1.1, MY + bndRY() * 1.1);
        const cand = M.fielders.filter(f => f.role !== 'bowler' || ball.y > BY - 120).map(f => ({ f, d: hyp(f.x - tx, f.y - ty) })).sort((a, b) => a.d - b.d);
        for (const f of M.fielders) f.chase = null;
        const n = ball.carried && ball.z > 3 ? 1 : 2;
        cand.slice(0, n).forEach(c => { c.f.chase = [tx, ty]; });
        M.active = cand[0].f.id;
      }
    } else for (const f of M.fielders) f.chase = null;
    const humanField = bowlIn && bowlIn.human;
    for (const f of M.fielders) {
      let tx = f.hx, ty = f.hy, spd = T('fieldSpeed') * (f.role === 'keeper' ? .8 : 1);
      if (f.dive > 0) { f.dive -= dt; spd *= 2.3; }
      if (f.chase && live) { tx = f.chase[0]; ty = f.chase[1]; }
      else if (live && !ball.thrownTo) { tx = f.hx + (ball.x - f.hx) * .08; ty = f.hy + (ball.y - f.hy) * .08; }
      if (M.ph === 'between' || M.ph === 'done') { tx = f.hx; ty = f.hy; }
      if (f.role === 'keeper' && ball.thrownTo === 0) { tx = CX; ty = SY - 10; }
      if (f.role === 'bowler' && ball.thrownTo === 1) { tx = CX; ty = BY - 8; }
      if (f.role === 'bowler' && (M.ph === 'setup' || M.ph === 'pre')) { tx = f.hx; ty = f.hy; }
      let dx = tx - f.x, dy = ty - f.y, d = hyp(dx, dy);
      if (humanField && live && f.id === M.active && (bowlIn.mx || bowlIn.my)) { dx = bowlIn.mx; dy = bowlIn.my; d = hyp(dx, dy); if (d > 1) { dx /= d; dy /= d; } f.vx = dx * spd; f.vy = dy * spd; }
      else if (d > 3) { f.vx = dx / d * Math.min(spd, d * 6); f.vy = dy / d * Math.min(spd, d * 6); }
      else { f.vx *= .6; f.vy *= .6; }
      if (M.ph === 'runup' && f.role === 'bowler') { f.vx = f.vy = 0; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (hyp(f.vx, f.vy) > 8) f.face = Math.atan2(f.vy, f.vx);
      if (f.throwT > 0) f.throwT -= dt;
      if (f.drop > 0) f.drop -= dt;
      if (f.celeb > 0) f.celeb -= dt;
    }
    // human fielder dives
    if (humanField && bowlIn.dive && live) { const f = M.fielders[M.active]; if (f && f.dive <= 0) { f.dive = .42; emit('dive', { id: f.id }); } }
    if (!live && !(ball.phase === 'held')) return;
    // the ball in hand: wait, then throw to a runner's end or settle
    if (ball.phase === 'held' && ball.holder) {
      const h = ball.holder; ball.x = h.x; ball.y = h.y; ball.z = 18; h.holdT += dt;
      if (M.ph === 'inplay' && h.holdT > .42) {
        const rs = runnerEnds().filter(r => r.d > 6);
        if (rs.length) {
          // throw to the end of the runner with the most to lose
          rs.sort((a, b) => b.d - a.d);
          const e = rs[0].end;
          const rec = M.fielders[e === 0 ? 1 : 0];
          if (h === rec) { /* already at that end: break the stumps */ arriveThrow(e); }
          else throwTo(h, e);
        } else if (h.holdT > .5) { M.hold += dt; }
      }
    }
    // pick-up
    if (live && !ball.thrownTo || (live && ball.thrownTo != null && ball.z < 6 && ball.age > 0)) {
      if (!ball.thrownTo) for (const f of M.fielders) {
        if (f.throwT > 0) continue;
        const rad = f.dive > 0 ? 16 : 8;
        if (ball.z < 14 && hyp(f.x - ball.x, f.y - ball.y) < rad) {
          if (ball.carried) continue;
          ball.phase = 'held'; ball.holder = f; f.hasBall = true; f.holdT = 0; ball.vx = ball.vy = 0;
          emit('pickup', { id: f.id, dive: f.dive > 0 }); break;
        }
      }
    }
    // a throw arriving at a stump end
    if (ball.thrownTo != null && ball.phase === 'live') {
      const ey = ball.thrownTo === 0 ? SY : BY;
      if ((ball.thrownTo === 0 && ball.y <= ey + 8) || (ball.thrownTo === 1 && ball.y >= ey - 8)) {
        if (Math.abs(ball.x - CX) < 16 && ball.z < 40) arriveThrow(ball.thrownTo);
        else { ball.thrownTo = null; emit('overthrow', {}); }
      }
    }
  }
  function tryCatch() {
    const ball = M.ball; if (!ball.carried || ball.phase !== 'live' || M.ph !== 'inplay' || M.hit.caughtTried) return;
    if (ball.z < 2 || ball.z > 34) return;
    for (const f of M.fielders) {
      if (f.role === 'bowler' && ball.y < BY - 140) continue;
      if (f.drop > 0 || (M.hit.tried && M.hit.tried[f.id])) continue;
      const rad = f.dive > 0 ? 15 : 10;
      if (hyp(f.x - ball.x, f.y - ball.y) < rad) {
        M.hit.tried = M.hit.tried || {}; M.hit.tried[f.id] = 1;
        const speed = hyp(ball.vx, ball.vy);
        const p = clamp(T('catchSkill') * (1 - speed / 650) * (f.dive > 0 ? 1.12 : 1) * (M.wet ? .85 : 1) + (M.hit.edge ? .1 : 0), 0, .97);
        if (rF() < p || M.cheatCatch) {
          ball.phase = 'held'; ball.holder = f; f.hasBall = true; ball.vx = ball.vy = 0;
          M.caughtBy = f; f.celeb = 1.5; M.hit.caughtTried = 1;
          finish('wicket', { how: 'caught', who: bname(strikerOf()) , catcher: f.id });
        } else { f.drop = 1; emit('dropped', { id: f.id }); hypeAdd(M.bat, 8); }
        return;
      }
    }
  }
  function checkBoundary() {
    const ball = M.ball; if (ball.hitBy === null || ball.phase !== 'live' || M.ph !== 'inplay') return;
    if (rho(ball.x, ball.y) < 1) return;
    if (ball.thrownTo != null) return;
    const six = ball.bounces === 0;
    let tgt = null, bonus = 0;
    if (six) for (const t of TARGETS) { const p = targetPos(t); if (hyp(ball.x - p[0], ball.y - p[1]) < t.r) { tgt = t; bonus = t.pts; break; } }
    const n = six ? 6 : 4;
    M.hit.boundaryDone = true; ball.phase = 'dead';
    for (const b of M.batters) b.moving = false;
    finish('boundary', { runs: n, bonus, target: tgt });
    if (tgt) emit('target', { t: tgt, x: ball.x, y: ball.y });
  }
  function cowCheck() {
    const c = M.cow; if (!c) return;
    const ball = M.ball;
    if (ball.phase === 'live' && M.ph === 'inplay' && ball.z < 12 && hyp(ball.x - c.x, ball.y - c.y) < 15 && hyp(ball.vx, ball.vy) > 30 && !ball.thrownTo) {
      ball.phase = 'held'; ball.holder = null; ball.vx = ball.vy = 0; c.stopped = 1.6; c.moo = 1; emit('cowstop', {});
      for (const b of M.batters) { if (b.moving) { b.moving = false; b.y = clamp(b.y, CR0, CR1); } }
      M.hit.boundaryDone = true;
      const rr_ = M.runs;
      finish('runs', { runs: rr_ });
    }
  }
  function updateCow(dt) {
    const c = M.cow; if (!c) return;
    if (c.stopped > 0) { c.stopped -= dt; c.vx = c.vy = 0; return; }
    if (hyp(c.tx - c.x, c.ty - c.y) < 8) { const a = rr(0, TAU, rF), d = rr(120, 230, rF); c.tx = CX + Math.cos(a) * d; c.ty = MY + Math.sin(a) * d * 1.1; }
    const d = hyp(c.tx - c.x, c.ty - c.y) || 1; c.vx = (c.tx - c.x) / d * 9; c.vy = (c.ty - c.y) / d * 9; c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.moo > 0) c.moo -= dt;
  }

  /* ----- batting: swing, contact and the umpire ----- */
  function startSwing(type, aim, bi) {
    const b = strikerOf(); if (M.swing || b.swingT >= 0) return;
    M.swing = { t: 0, type, aim: aim || [0, 1], done: false, miss: false }; b.swingT = 0; b.swingType = type;
    emit('swing', { type });
  }
  function resolveContact() {
    const sw = M.swing, b = M.ball, bat = strikerOf(); sw.done = true;
    const fire = sideBat().fire > 0, win = T('window') * (fire ? 1.5 : 1);
    const vy = Math.max(40, Math.abs(b.vy)), err = (b.y - YHIT) / vy, dx = b.x - bat.x;
    const ok = b.phase === 'delivery' && b.z < 42 && Math.abs(dx) < 24 && Math.abs(err) < win * 1.25;
    if (!ok) { sw.miss = true; emit('swing:miss', { err, dx, z: b.z }); return; }
    let q = clamp(1 - Math.abs(err) / win, 0, 1), perfect = Math.abs(err) < win * .22;
    if (sw.type === 'defend') q = clamp(q + .35, 0, 1);
    const edgeP = clamp((Math.abs(err) - win * .62) / (win * .5), 0, 1) * (fire ? .3 : 1) * diff.edge * (sw.type === 'defend' ? .3 : 1);
    const edge = rF() < edgeP;
    const aim = sw.aim && (sw.aim[0] || sw.aim[1]) ? (() => { const l = hyp(sw.aim[0], sw.aim[1]); return [sw.aim[0] / l, sw.aim[1] / l]; })() : [0, 1];
    const v = shotVelocity(b, sw.type, aim, err, q, fire, edge, rF);
    b.phase = 'live'; b.carried = true; b.bounces = 0; b.pitched = true; b.rolling = false;
    b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.hitBy = bat.id; b.x = bat.x; b.y = YHIT; b.z = Math.max(b.z, 4); b.fire = fire;
    M.hit = { q, err, perfect, edge, type: sw.type, fire, power: hyp(v.vx, v.vy), phi: v.phi, tried: {}, boundaryCert: false };
    M.ph = 'inplay'; M.t = 0; M.hold = 0; M.chaseT = 0; M.runs = 0; M.restEnd0 = M.batters[0].end;
    if (perfect) hypeAdd(M.bat, 12);
    emit('contact', { q, perfect, edge, type: sw.type, fire, power: M.hit.power, err });
    // dangerous hits get an early boundary certainty so the AI doesn't run needlessly
    const pr = predictUntil(b, c => rho(c.x, c.y) >= 1 || c.vx * c.vx + c.vy * c.vy < 16, 5);
    M.hit.boundaryCert = pr.hit && rho(pr.b.x, pr.b.y) >= 1;
  }
  function trackDelivery(dt) {
    const b = M.ball;
    // the batter tracks the line of the ball
    const bat = strikerOf(); const pr = M.trackX != null ? M.trackX : CX;
    if (!bat.swingStop) {
      const px_ = predictPlane(b).b.x, tx = clamp(px_, CX - 18, CX + 18);
      bat.x += clamp(tx - bat.x, -dt * 150, dt * 150);
    }
    if (M.swing && !M.swing.done && M.swing.t >= SWING_DELAY) { resolveContact(); }
    if (M.swing) { M.swing.t += dt; if (M.swing.t > SWING_DUR) { bat.swingT = -1; if (!M.swing.miss && M.ph === 'inplay') { /* hit */ } M.swing.over = true; } }
    if (M.ph !== 'flight') return;
    // stumps
    if (b.y <= SY + 3 && !M.stumpsDone) {
      if (Math.abs(b.x - CX) < 5.5 && b.z < 13) {
        M.stumpsDone = true; b.phase = 'dead'; M.bailsOff = 1.4; emit('stumps', { end: 0 });
        if (M.freeHit) { finish('wicket', { how: 'bowled' }); } else finish('wicket', { how: 'bowled', who: bname(strikerOf()) });
        return;
      }
    }
    // passes the batter's plane
    if (!M.planeDone && b.y <= YHIT - 6) {
      M.planeDone = true;
      const off = b.x - CX;
      if (!M.swing || M.swing.miss || !M.swing.done) {
        if ((off < -36 || off > 32 || b.z > 48) && !M.swing) { b.phase = 'live'; b.vx *= .4; b.vy *= .4; finish('wide'); return; }
        if (M.swing && M.swing.t > 0) { /* played and missed: carry on to the keeper */ }
        // pads: leg before wicket
        if (Math.abs(b.x - bat.x) < 7 && b.z < 22 && !M.swing) {
          const pr2 = predictUntil(b, c => c.y <= SY, 1);
          if (pr2.hit && Math.abs(pr2.b.x - CX) < 6 && pr2.b.z < 14 && b.pitched) {
            b.phase = 'dead'; emit('pad', {}); if (M.freeHit) { finish('runs', { runs: 0 }); } else finish('wicket', { how: 'lbw', who: bname(strikerOf()) }); return;
          }
          emit('pad', {});
        }
      }
    }
    // the keeper gathers
    if (b.y < SY - 28 && b.phase === 'delivery') {
      b.phase = 'held'; const k = M.fielders[1]; k.hasBall = true; b.holder = k; emit('keeper', {});
      if (M.swing && M.swing.miss) emit('beaten', {});
      finish('runs', { runs: 0 });
    }
  }

  /* ----- bowling: choose, run up, release meter, deliver ----- */
  function startRunup(type, human) {
    const B = sideBowl(), del = DELIVERIES[type];
    if (type === 'fire') { if (B.hype < 100) type = 'pace'; else { B.hype = 0; B.fire = 1; emit('fire:on', { side: 1 - M.bat, role: 'bowl' }); } }
    M.delType = type;
    const dur = type === 'spin' ? .95 : 1.25;
    M.runup = { t: 0, dur, type, meterStart: dur - 1.0, cross: .25, human, p: 0, released: false };
    M.ph = 'runup'; M.t = 0; emit('runup', { type });
  }
  function meterPos(R) {
    const tm = R.t - R.meterStart; if (tm <= 0) return 0;
    return clamp(.5 - .5 * Math.cos(TAU * T('meterSpeed') * tm), 0, 1);
  }
  function release(R) {
    const del = DELIVERIES[R.type], p = meterPos(R); R.p = p; R.released = true;
    const d = Math.abs(p - .5), over = p > .94 && R.human;
    const grade = d < .16 ? 'green' : d < .32 ? 'amber' : 'red';
    const scatter = (grade === 'green' ? 2 : grade === 'amber' ? 8 : 14) * (M.cheat && !R.human ? .4 : 1), pace = grade === 'green' ? 1.02 : grade === 'amber' ? .92 : .82;
    const B = sideBowl(), fire = B.fire > 0 && R.type === 'fire';
    if (R.type === 'fire') { /* the special is always accurate */ }
    const gr = R.type === 'fire' ? { s: 1.5, p: 1.05 } : { s: scatter, p: pace };
    const sc = R.type === 'fire' ? 1.5 : scatter;
    const tx = clamp(M.marker[0] + rr(-1, 1, rB) * sc * 1.2, CX - 40, CX + 40), ty = clamp(M.marker[1] + rr(-1, 1, rB) * sc * 1.6, 372, 580);
    const b = newBall(); b.wet = M.wet; b.groundBounce = ground.pitchBounce * (M.wet ? .8 : 1);
    const rx = CX + (M.round ? -8 : 8) * 0 + 0, ry = BY - 8, rz = 36;
    const sp = del.sp * T('ballSpeed') * ground.speed * gr.p * (fire ? 1.15 : 1) * (R.human ? 1 : .94 + diff.scale * .06);
    const sol = solveDelivery(rx, ry, rz, tx, ty, sp);
    b.x = rx; b.y = ry; b.z = rz; b.vx = sol.vx; b.vy = sol.vy; b.vz = sol.vz; b.phase = 'delivery';
    const swingSign = (rB() < .5 ? -1 : 1);
    b.swingA = del.swing * swingSign; b.turn = del.turn * (rB() < .5 ? -1 : 1);
    b.seamDev = rnorm(rB) * del.seam * .035 * (M.wet ? 1.3 : 1);
    b.bounceMul = del.bounce * (ty > 500 ? 1.9 : 1) * (ty < 392 ? .9 : 1);
    b.golden = M.golden; b.kmh = Math.round(del.kmh * (sp / (del.sp * T('ballSpeed'))));
    // wild bowling gets a "wide" or an overstep; a yorker is a yorker
    M.ball = b; M.speedKmh = Math.round(del.kmh * gr.p * T('ballSpeed') * ground.speed * (fire ? 1.15 : 1));
    M.noBall = over || (b.z > 40 && false);
    if (R.human && ty < 392 && b.vz * 0 === 0) { /* full toss kinds are fine */ }
    M.stumpsDone = false; M.planeDone = false; M.grade = R.type === 'fire' ? 'green' : grade;
    M.ph = 'flight'; M.t = 0; M.release = { grade, p, over }; M.aft = .3; M.aftLeft = .3;
    emit('release', { type: R.type, grade, kmh: M.speedKmh, over, fire });
    if (M.noBall) { /* decided at the end of the ball: the call is made now */ emit('noball:call', {}); }
    planAfterRelease();
  }
  function planAfterRelease() {
    planBat();
  }
  M.planAfterRelease = planAfterRelease;

  /* ----- the main step ----- */
  M.step = function (dt, human) {
    human = human || {};
    M.clock += dt; M.t += dt;
    if (M.banner) { M.banner.t -= dt; if (M.banner.t <= 0) M.banner = null; }
    if (M.bailsOff > 0) M.bailsOff -= dt;
    if (M.umpire.signal > 0) M.umpire.signal -= dt;
    updateCow(dt);
    const batSide = sideBat(), bowlSide = sideBowl();
    const batHuman = human.bat != null && !M.cheat, bowlHuman = human.bowl != null;
    const bi = human.bat || (M.ph === 'flight' || M.ph === 'inplay' || M.ph === 'setup' ? aiBat() : newIntent());
    let wi = human.bowl || (M.ph === 'setup' || M.ph === 'runup' ? aiBowl() : newIntent());
    if (human.bowl) wi.human = true;
    if (!human.bat && M.cheat) { /* autopilot batting already via aiBat */ }
    switch (M.ph) {
      case 'pre': case 'intro':
        if (M.t > (M.ph === 'intro' ? 2.2 : .8)) nextBall();
        break;
      case 'setup':
        // fielders settle; the bowling side picks a delivery
        if (bi.special) igniteBat(M.bat);
        if (wi.cycle) { M.setField(M.field === 'balanced' ? 'attack' : M.field === 'attack' ? 'defend' : 'balanced'); emit('field', { f: M.field }); }
        if (bowlHuman) {
          M.marker[0] = clamp(M.marker[0] + wi.mx * 120 * dt, CX - 36, CX + 36);
          M.marker[1] = clamp(M.marker[1] + wi.my * 130 * dt, 372, 560);
          if (wi.aimPoint) { M.marker[0] = clamp(wi.aimPoint[0], CX - 36, CX + 36); M.marker[1] = clamp(wi.aimPoint[1], 372, 560); }
        }
        if (wi.bowl) {
          if (M.hub && cfg.rngB) { /* deterministic hub deliveries */ }
          startRunup(wi.bowl, !!bowlHuman);
        }
        break;
      case 'runup': {
        const R = M.runup; R.t += dt;
        if (R.human) {
          M.marker[0] = clamp(M.marker[0] + wi.mx * 60 * dt, CX - 36, CX + 36);
          M.marker[1] = clamp(M.marker[1] + wi.my * 65 * dt, 372, 560);
        }
        if (R.type === 'fire' && R.t > .35) release(R);
        else if ((wi.release || wi.bowl) && R.t > R.meterStart + .05 && !R.released) release(R);
        else if (R.t >= R.dur && !R.released) release(R);
        const bf = M.fielders[0]; bf.x = lerp(CX + 8, CX + 4, R.t / R.dur); bf.y = lerp(BY + 80, BY - 8, clamp(R.t / R.dur, 0, 1)); bf.face = -Math.PI / 2; bf.vx = 0; bf.vy = -(88 / R.dur);
        break; }
      case 'flight': {
        const b = M.ball;
        if (M.aftLeft > 0 && b.phase === 'delivery' && !b.pitched) { M.aftLeft -= dt; if (wi.mx) b.vx += wi.mx * 160 * dt; }
        if (bi.special) igniteBat(M.bat);
        if (bi.shot && !M.swing) startSwing(bi.shot, bi.aim);
        const ev = stepBall(b, dt); if (ev === 'pitched') emit('pitched', { x: b.x, y: b.y });
        trackDelivery(dt);
        const bf = M.fielders[0]; if (bf) { bf.y = Math.max(bf.y - 30 * dt, BY - 40); bf.vy = -30; bf.vx = 0; }
        break; }
      case 'inplay': {
        const b = M.ball;
        if (M.swing && !M.swing.over) { M.swing.t += dt; if (M.swing.t > SWING_DUR) { M.swing.over = true; strikerOf().swingT = -1; } }
        updateRun(dt, bi);
        if (b.phase === 'live') {
          const ev = stepBall(b, dt); if (ev === 'bounce') emit('bounce', { x: b.x, y: b.y });
        }
        updateFielders(dt, wi);
        tryCatch(); if (M.ph !== 'inplay') break;
        checkBoundary(); if (M.ph !== 'inplay') break;
        cowCheck(); if (M.ph !== 'inplay') break;
        // the ball is dead once it is in a fielder's hands and nobody is running
        const running = M.batters.some(bb => bb.moving);
        if (b.phase === 'held' && !running && M.hold > .3) {
          finish(M.runs > 0 ? 'runs' : 'runs', { runs: M.runs, perfect: M.hit && M.hit.perfect && M.runs > 0 });
        } else if (M.t > 28 || (b.phase === 'live' && rho(b.x, b.y) > 1.5)) finish('runs', { runs: M.runs });
        break; }
      case 'between': {
        if (M.t < 0.05) { /* just ended */ }
        updateFielders(dt, null);
        for (const bb of M.batters) bb.moving = false;
        if (M.t > 2.0) { M.t = 0; afterBetween(); }
        break; }
      default: break;
    }
    // bowler follow-through & batter swing timers
    const st = strikerOf(); if (st && st.swingT >= 0 && M.ph !== 'flight' && M.ph !== 'inplay') st.swingT = -1;
    if (st && st.swingT >= 0) st.swingT += dt;
    if (M.ph === 'inplay' && st && st.swingT > SWING_DUR) st.swingT = -1;
    if (M.ph === 'inplay' && M.hit && M.ball.phase === 'live') { M.ball.trail.push([M.ball.x, M.ball.y, M.ball.z]); if (M.ball.trail.length > 16) M.ball.trail.shift(); }
    else if (M.ph === 'flight') { M.ball.trail.push([M.ball.x, M.ball.y, M.ball.z]); if (M.ball.trail.length > 10) M.ball.trail.shift(); }
    // the batter who is not out on strike
    for (const b of M.batters) { if (!b.moving && M.ph !== 'inplay' && M.ph !== 'flight') { b.y = b.end === 0 ? CR0 : CR1; } }
  };

  M.endMatch = endMatch;
  M.start = function () { startInnings(); };
  M.winnerName = () => (M.result && M.result.winner >= 0 ? TEAMS[M.sides[M.result.winner].team].name : null);
  M.snapshot = () => ({ ph: M.ph, inn: M.inn, bat: M.bat, score: M.sides.map(s => s.score), wkts: M.sides.map(s => s.wkts), balls: M.sides.map(s => s.balls), hype: M.sides.map(s => Math.round(s.hype)), fire: M.sides.map(s => s.fire), last: M.last, ball: [Math.round(M.ball.x), Math.round(M.ball.y), Math.round(M.ball.z)], result: M.result, target: M.target, ballNo: M.ballNo, over: M.over });
  return M;
}

/* ===== 30-art.js ===== */
/* ---------- art: the ground, the people, the props. Everything is drawn by code with the engine's primitives ---------- */
const px = E.px;
const hx = E.hex;
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const SKINS = ['#e8b890', '#d8a074', '#a8703c', '#f0c8a0', '#8a5a38', '#c68a5a'];
const HAIRS = ['#3a2a20', '#7a4a2a', '#c8b070', '#a0a0a8', '#181818', '#9a3a1a'];
const HAIRSTYLES = ['short', 'spiky', 'ponytail', 'long', 'bald', 'short'];

/* ----- the floor: stripes, pitch, creases, rope, hoardings and a crowd, all as a texture ----- */
let floorGround = GROUNDS.green;
function floorTex(x, y) {
  const rx = bndRX(), ry = bndRY(), dx = x - CX, dy = y - MY, p = Math.hypot(dx / rx, dy / ry);
  const n = hash2(x | 0, y | 0);
  // pitch strip and creases
  if (Math.abs(dx) < 25 && y > SY - 36 && y < BY + 36 && p < 1) {
    const wear = Math.min(1, Math.abs(y - MY) / 160);
    let c = hx(wear > .55 ? '#b49560' : '#c8aa72'); const k = .94 + n * .1;
    const line = (yy, hw) => Math.abs(y - yy) < .9 && Math.abs(dx) < hw;
    if (line(CR0, 38) || line(CR1, 38) || line(SY, 36) || line(BY, 36) || (Math.abs(Math.abs(dx) - 21) < .9 && ((y > SY - 2 && y < CR0 + 8) || (y < BY + 2 && y > CR1 - 8)))) return [236, 232, 220];
    return [c[0] * k, c[1] * k, c[2] * k];
  }
  if (p < .985) {
    const a = hx(floorGround.grass[0]), b = hx(floorGround.grass[1]);
    const c = Math.floor(y / 30) % 2 ? a : b, k = .93 + n * .14;
    // the 30-yard circle, dotted
    if (Math.abs(p - .52) < .006 && ((x / 6 | 0) + (y / 6 | 0)) % 2 === 0) return [220, 230, 210];
    return [c[0] * k, c[1] * k, c[2] * k];
  }
  if (p < 1.0) return [244, 244, 238];
  if (p < 1.012) return [40, 70, 36];
  if (p < 1.07) {   // hoardings
    const ang = Math.atan2(dy, dx), seg = Math.floor((ang + Math.PI) * 9) % 5, cols = ['#d83a2a', '#2a5ad8', '#f0c020', '#2aa84a', '#d8d8e0'];
    return hx(cols[seg]);
  }
  if (p < 1.4) {   // the stands: coarse blocks of colourful spectators (kept big so it stays calm when the camera pulls back)
    const ang = Math.atan2(dy, dx), seg = Math.floor((ang + Math.PI) * 60), row = Math.floor((p - 1.07) * 22);
    const h = hash2(seg, row), cols = ['#d8503e', '#3a72d0', '#e8b830', '#3ea860', '#e8e8e0', '#b45ab4', '#e08030'];
    const base = row % 2 ? [66, 60, 82] : [56, 50, 72];
    if (h < .62) { const c = hx(cols[Math.floor(h * 97) % cols.length]), k = .5 + ((x | 0) % 6 < 3 ? .14 : 0); return [c[0] * k, c[1] * k, c[2] * k]; }
    return base;
  }
  return [24, 40, 26];
}
let map = null;
function buildMap(groundId) {
  floorGround = GROUNDS[groundId] || GROUNDS.green;
  const rows = []; for (let j = 0; j < GH; j++) rows.push('.'.repeat(GW));
  map = new E.TileMap({ rows, legend: {}, types: {}, floorTex, outside: '#18281a', ao: 0 });
  return map;
}
function rebakeFloor() { if (map) { map.floors = {}; } }

/* ----- people ----- */
function mkRig(teamId, kind, i) {
  const tm = TEAMS[teamId], sk = SKINS[(i * 5 + 1) % SKINS.length], hr = HAIRS[(i * 3 + 2) % HAIRS.length];
  const o = { size: 1.5, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: HAIRSTYLES[(i * 2 + 1) % HAIRSTYLES.length],
    colors: { skin: sk, hair: hr, cloth: tm.cloth, pants: tm.pants, boot: '#f2eee4', trim: tm.trim, belt: tm.trim, glove: '#f2eee4' } };
  if (kind === 'bat') { o.weapon = 'bat'; o.bladeLen = 15; o.hat = { style: 'helmet', color: tm.trim }; o.colors.metal = '#e2bc78'; o.colors.hilt = '#b8302c'; o.colors.glove = '#f2eee4'; o.stance = 'ready'; }
  else if (kind === 'keeper') { o.hat = { style: 'cap', color: tm.hat }; o.colors.cloth = tm.trim; o.colors.glove = '#e8c040'; }
  else if (kind === 'umpire') { o.hat = { style: 'cap', color: '#f4f0e8' }; o.outfit = 'coat'; o.colors.cloth = '#f4f0e8'; o.colors.coat = '#f4f0e8'; o.colors.pants = '#2a2a38'; o.hair = 'bald'; o.colors.hair = '#a0a0a8'; o.size = 1.55; }
  else if (kind === 'bowler') { o.hat = { style: 'band', color: tm.hat }; }
  else o.hat = i % 3 === 0 ? { style: 'cap', color: tm.hat } : (i % 3 === 1 ? { style: 'band', color: tm.hat } : null);
  return new E.Humanoid(o);
}
const rigs = { bat: [null, null], field: [], umpire: null, key: '' };
function buildRigs(batTeam, fieldTeam) {
  const key = batTeam + ':' + fieldTeam;
  rigs.bat = [mkRig(batTeam, 'bat', 0), mkRig(batTeam, 'bat', 3)];
  rigs.field = [mkRig(fieldTeam, 'bowler', 1), mkRig(fieldTeam, 'keeper', 2)];
  for (let i = 0; i < 9; i++) rigs.field.push(mkRig(fieldTeam, 'field', i + 4));
  rigs.umpire = mkRig('rain', 'umpire', 7); rigs.key = key;
}

/* ----- the set: stumps, buildings, cow, crowd ----- */
function drawStumps(r, y, M, towardCamera) {
  const bails = M && M.bailsOff > 0 && M.ball && ((y === SY && M.stumpEnd !== 1) || (y !== SY && M.stumpEnd === 1)) ? M.bailsOff : 0;
  r.queue(CX, y, 0, g => {
    for (const dx of [-2.6, 0, 2.6]) {
      const lean = bails ? (dx === 0 ? 7 : dx < 0 ? -3 : 4) * Math.min(1, (1.4 - bails) * 2) : 0;
      const a = r.w(CX + dx, y, 0), b = r.w(CX + dx + lean * .3, y - lean * .4, 13 - Math.abs(lean) * .5);
      px.line(g, a[0], a[1], b[0], b[1], '#e8d8a8', 1); px.line(g, a[0] + 1, a[1], b[0] + 1, b[1], '#a89868', 1);
    }
    if (!bails) { const a = r.w(CX - 2.6, y, 13), b = r.w(CX + 2.6, y, 13); px.line(g, a[0], a[1] - 1, b[0], b[1] - 1, '#ffd860', 1); }
    else for (let k = 0; k < 2; k++) { const t = 1.4 - bails, bx = CX + (k ? 1 : -1) * (2 + t * 26), bz = 14 + Math.sin(t * 5) * 18 - t * 8, p = r.w(bx, y - t * 30, Math.max(0, bz)); px.line(g, p[0] - 2, p[1], p[0] + 2, p[1] - 1, '#ffd860', 1); }
  });
}
function drawBuilding(r, x, y, w, d, h, wall, roof, o = {}) {
  r.queue(x, y, 0, g => {
    r.box(g, x - w / 2, y - d / 2, 0, x + w / 2, y + d / 2, h, roof, wall);
    const a = r.w(x - w / 2, y + d / 2, 0), roofTop = r.w(x, y, h + (o.peak || 10));
    px.poly(g, [r.w(x - w / 2 - 3, y + d / 2 + 2, h), r.w(x + w / 2 + 3, y + d / 2 + 2, h), roofTop], roof);
    for (const wx of (o.windows || [])) {
      const p0 = r.w(x + wx - 6, y + d / 2 + .5, h * .3), p1 = r.w(x + wx + 6, y + d / 2 + .5, h * .3), p2 = r.w(x + wx + 6, y + d / 2 + .5, h * .75), p3 = r.w(x + wx - 6, y + d / 2 + .5, h * .75);
      px.poly(g, [p0, p1, p2, p3], o.lit ? '#ffe9a0' : '#7ac0e0'); px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a1c10');
      if (o.broken && o.broken === wx) { const m = r.w(x + wx, y + d / 2 + .6, h * .5); px.line(g, m[0] - 4, m[1] - 3, m[0] + 4, m[1] + 3, '#1a1a20'); px.line(g, m[0] + 3, m[1] - 3, m[0] - 3, m[1] + 4, '#1a1a20'); }
    }
    if (o.sign) { const s = r.w(x, y + d / 2 + 1, h + 2); E.font.text(g, o.sign, s[0], s[1] - 8, '#fff6d0', { align: 'center', font: 'tiny', shadow: '#000' }); }
  });
}
const SET_BROKEN = { window: false };
function drawSet(r, M) {
  const tp = id => targetPos(TARGETS.find(t => t.id === id));
  const w = tp('window'), u = tp('urn'), c = tp('clock'), b = tp('bell');
  drawBuilding(r, w[0] + 50, w[1] - 14, 70, 36, 34, '#9a5a3a', '#6a3a2a', { windows: [-20, 0, 20], sign: 'THE KERFUFFLE ARMS', lit: floorGround.night, broken: SET_BROKEN.window ? 0 : undefined, peak: 14 });
  drawBuilding(r, u[0] + 46, u[1] + 12, 50, 34, 22, '#f0e8d0', '#c83a3a', { sign: 'TEA', peak: 10 });
  drawBuilding(r, c[0], c[1] + 52, 22, 22, 64, '#c8b890', '#7a5a3a', { windows: [0], peak: 22, sign: 'CLOCK' });
  drawBuilding(r, b[0] - 52, b[1] + 10, 36, 40, 44, '#b0a8a0', '#5a5060', { windows: [0], peak: 28, sign: 'ST BELL' });
  // floodlight pylons at night
  for (const [px_, py_] of [[CX - 330, MY - 360], [CX + 330, MY - 360], [CX - 330, MY + 360], [CX + 330, MY + 360]]) {
    r.queue(px_, py_, 0, g => { const a = r.w(px_, py_, 0), t = r.w(px_, py_, 96); px.line(g, a[0], a[1], t[0], t[1], '#707080', 2); px.rect(g, t[0] - 5, t[1] - 3, 10, 4, floorGround.night ? '#fff8d0' : '#a0a0b0'); if (floorGround.night) px.glow(g, 1); });
  }
}
function drawCow(r, cow, t) {
  r.shadow(cow.x, cow.y, 11, .35);
  r.actor(cow.x, cow.y, 0, (g, ox, oy) => {
    const bob = Math.sin(t * 2 + cow.x) * .6, face = cow.vx < -0.5 ? -1 : 1;
    px.ell(g, ox, oy - 9 + bob, 10, 6, '#f4f2ec'); px.ell(g, ox - 3 * face, oy - 10 + bob, 3.5, 3, '#2a2a30'); px.ell(g, ox + 4 * face, oy - 7 + bob, 3, 2.4, '#2a2a30');
    px.ell(g, ox + 10 * face, oy - 11 + bob, 4, 3.4, '#f4f2ec'); px.rect(g, ox + 12 * face - (face < 0 ? 3 : 0), oy - 10 + bob, 3, 2, '#e8a0a8');
    px.dot(g, ox + 10 * face, oy - 12 + bob, '#101010'); px.line(g, ox + 8 * face, oy - 15 + bob, ox + 7 * face, oy - 17 + bob, '#e8d8a0', 1);
    for (const lx of [-6, -3, 3, 6]) px.line(g, ox + lx, oy - 5 + bob, ox + lx, oy, '#d8d4c8', 1);
    px.line(g, ox - 10 * face, oy - 11 + bob, ox - 13 * face, oy - 5 + bob + Math.sin(t * 5) * 1.5, '#f4f2ec', 1);
    if (cow.moo > 0) E.font.text(g, 'MOO!', ox, oy - 26, '#fff', { align: 'center', shadow: '#000', font: 'tiny' });
  });
}
function drawCrowd(r, M, t) {
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1.045 + hash2(i, 3) * .02, x = CX + Math.cos(a) * bndRX() * k, y = MY + Math.sin(a) * bndRY() * k;
    if (!r.visible(x, y, 0, 30, 60, 60)) continue;
    const cheer = M && M.cheerT > 0 ? 1 : 0, hop = Math.max(0, Math.sin(t * 7 + i * 1.7)) * (cheer ? 5 : .6) * (hash2(i, 9) > .3 ? 1 : 0);
    const cols = ['#e04a3a', '#3a7ae0', '#f0c030', '#40b860', '#f0f0f0', '#c060c0'], col = cols[i % cols.length];
    r.queue(x, y, 0, g => { const p = r.w(x, y, hop); px.rect(g, p[0] - 2, p[1] - 6, 4, 5, col); px.disc(g, p[0], p[1] - 8, 2, SKINS[i % SKINS.length]); if (cheer) px.line(g, p[0] + 2, p[1] - 6, p[0] + 4, p[1] - 11, SKINS[i % SKINS.length], 1); });
  }
}

/* ----- the ball and its flourishes ----- */
function drawBall(r, M, t) {
  const b = M.ball; if (!b || b.phase === 'dead' && !M.hit) return;
  if (b.phase === 'held' && b.holder) return;
  r.shadow(b.x, b.y, 2.5 + b.z * .02, .45);
  const night = floorGround.night, col = night ? '#f4f4f0' : '#c8242c';
  const trail = b.trail || [];
  r.queue(b.x, b.y, b.z, g => {
    for (let i = 0; i < trail.length; i++) { const q = trail[i], p = r.w(q[0], q[1], q[2]), k = (i + 1) / trail.length; if (b.fire || M.sideBat().fire > 0) px.disc(g, p[0], p[1], 1 + k * 1.5, i % 2 ? '#ffb020' : '#ff5020'); else if (k > .5) px.dot(g, p[0], p[1], '#e8e8e8'); }
    const p = r.w(b.x, b.y, b.z);
    px.disc(g, p[0], p[1], 3, '#ffffff'); px.disc(g, p[0], p[1], 2.2, col); px.dot(g, p[0] - 1, p[1] - 1, '#ffd0d0');
    if (night) px.glow(g, 1);
  }, { emissive: night });
}

/* ===== 40-audio.js ===== */
/* ---------- audio: all of it synthesized in code. Effects and music on the chip synth, voices on our own formant synth ---------- */
const NOTEORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/* "C5:2 E5:2 G5:4 .:4" -> step tokens for the engine's notation: a note, then '-' for each held step */
function seq(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const [n, d] = tok.split(':'), len = +d || 1;
    out.push(n === '.' ? '.' : n); for (let i = 1; i < len; i++) out.push(n === '.' ? '.' : '-');
  }
  return out.join(' ');
}
const SONGS = {
  title: {
    bpm: 104, steps: 4,
    tracks: [
      { wave: 'square', vol: .13, notes: seq('C5:2 E5:2 G5:2 E5:2 C5:2 E5:2 G5:4 A5:2 G5:2 F5:2 E5:2 D5:4 G4:4 E5:2 G5:2 C6:2 G5:2 E5:2 G5:2 C6:4 B5:2 A5:2 G5:2 F5:2 E5:4 C5:4') },
      { wave: 'triangle', vol: .2, notes: seq('C3:4 G3:4 C3:4 G3:4 F3:4 C3:4 G3:4 G2:4 C3:4 G3:4 C3:4 G3:4 G3:4 D3:4 G3:4 C3:4') },
      { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h h' },
    ],
  },
  match: {
    bpm: 128, steps: 4,
    tracks: [
      { wave: 'pulse', vol: .1, notes: seq('G5:2 E5:2 G5:2 A5:2 G5:4 E5:4 F5:2 D5:2 F5:2 G5:2 F5:4 D5:4 E5:2 C5:2 E5:2 G5:2 C6:4 G5:4 A5:2 G5:2 F5:2 D5:2 C5:8') },
      { wave: 'triangle', vol: .2, notes: seq('C3:2 .:2 G3:2 .:2 C3:2 .:2 G3:2 .:2 F3:2 .:2 C3:2 .:2 G3:2 .:2 D3:2 .:2') },
      { wave: 'drums', vol: .1, notes: 'k . . h s . h . k . h . s . h .' },
    ],
  },
  night: {
    bpm: 144, steps: 4,
    tracks: [
      { wave: 'saw', vol: .09, notes: seq('A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2 F4:2 A4:2 C5:2 F5:2 E5:2 C5:2 A4:2 C5:2') },
      { wave: 'square', vol: .12, notes: seq('A2:2 A2:2 A2:2 A2:2 A2:2 A2:2 G2:2 G2:2 F2:2 F2:2 F2:2 F2:2 E2:2 E2:2 E2:2 E2:2') },
      { wave: 'drums', vol: .13, notes: 'k . h h s . h k k . h h s . o h' },
    ],
  },
  story: {
    bpm: 84, steps: 4,
    tracks: [
      { wave: 'triangle', vol: .17, notes: seq('E5:4 D5:2 C5:2 D5:4 G4:4 A4:4 C5:2 D5:2 E5:8 G5:4 E5:2 D5:2 C5:4 A4:4 D5:4 B4:4 C5:8') },
      { wave: 'sine', vol: .14, notes: seq('C3:8 G3:8 A3:8 E3:8 F3:8 C3:8 G3:8 C3:8') },
    ],
  },
  fire: {
    bpm: 168, steps: 4,
    tracks: [
      { wave: 'saw', vol: .1, notes: seq('E5:1 G5:1 B5:1 E6:1 B5:1 G5:1 E5:1 G5:1 D5:1 F5:1 A5:1 D6:1 A5:1 F5:1 D5:1 F5:1') },
      { wave: 'square', vol: .12, notes: seq('E2:2 E2:2 E2:2 E2:2 D2:2 D2:2 D2:2 D2:2') },
      { wave: 'drums', vol: .15, notes: 'k h s h k k s h' },
    ],
  },
};
let curSong = null;
function playMusic(name, fade = .6) {
  if (curSong === name) return; curSong = name;
  try { game.audio.music(name ? SONGS[name] : null, { fade }); } catch (e) { /* no sound */ }
}
const SFXDEF = {
  crack:   [{ wave: 'noise', freq: 2600, to: 700, dur: .09, vol: .5, q: 1.4 }, { wave: 'square', freq: 260, to: 90, dur: .1, vol: .25 }],
  crackP:  [{ wave: 'noise', freq: 3200, to: 600, dur: .14, vol: .6, q: 1.2 }, { wave: 'square', freq: 330, to: 70, dur: .16, vol: .3 }, { wave: 'sine', freq: 880, to: 1760, dur: .35, vol: .2, delay: .03 }],
  swish:   [{ wave: 'noise', freq: 500, to: 2200, dur: .16, vol: .22, q: .9 }],
  thud:    [{ wave: 'triangle', freq: 140, to: 50, dur: .12, vol: .4 }, { wave: 'noise', freq: 400, to: 150, dur: .08, vol: .2 }],
  stumps:  [{ wave: 'noise', freq: 1400, to: 300, dur: .25, vol: .5, q: .8 }, { wave: 'square', freq: 440, to: 110, dur: .2, vol: .2 }, { wave: 'triangle', freq: 90, dur: .3, vol: .3 }],
  pop:     [{ wave: 'noise', freq: 900, to: 400, dur: .06, vol: .4 }, { wave: 'sine', freq: 300, to: 200, dur: .07, vol: .25 }],
  bounce:  [{ wave: 'triangle', freq: 200, to: 120, dur: .05, vol: .18 }],
  cheer:   [{ wave: 'noise', freq: 800, to: 1500, dur: 1.4, vol: .22, filter: 'bandpass', q: .5 }],
  groan:   [{ wave: 'triangle', freq: 280, to: 130, dur: .7, vol: .25, vib: [6, .04] }],
  glass:   [{ wave: 'noise', freq: 6000, to: 3000, dur: .4, vol: .35, filter: 'highpass' }, { wave: 'sine', freq: 2400, to: 1800, dur: .3, vol: .12, arp: [0, 5, 9, 12], step: .04 }],
  moo:     [{ wave: 'saw', freq: 130, to: 95, dur: .8, vol: .3, vib: [5, .05] }],
  fireup:  [{ wave: 'noise', freq: 300, to: 3000, dur: .8, vol: .3, q: .6 }, { wave: 'saw', freq: 110, to: 440, dur: .8, vol: .25 }],
  appeal:  [{ wave: 'square', freq: 660, dur: .09, vol: .3 }, { wave: 'square', freq: 660, dur: .09, vol: .3, delay: .12 }, { wave: 'square', freq: 990, dur: .25, vol: .3, delay: .24 }],
  dropped: [{ wave: 'triangle', freq: 500, to: 160, dur: .5, vol: .3, vib: [9, .03] }],
  ding:    [{ wave: 'sine', freq: 1568, dur: .3, vol: .25 }, { wave: 'sine', freq: 2093, dur: .5, vol: .2, delay: .08 }],
  tick:    [{ wave: 'square', freq: 1200, dur: .02, vol: .12 }],
  release: [{ wave: 'noise', freq: 800, to: 300, dur: .12, vol: .2 }],
  noball:  [{ wave: 'saw', freq: 200, dur: .35, vol: .3 }, { wave: 'saw', freq: 150, dur: .4, vol: .3, delay: .2 }],
  run:     [{ wave: 'square', freq: 520, dur: .04, vol: .1 }],
  golden:  [{ wave: 'sine', freq: 1046, dur: .15, vol: .25, arp: [0, 4, 7, 12], step: .06 }],
};
function defineSfx() {
  for (const k in SFXDEF) {
    const parts = SFXDEF[k];
    game.audio.define(k, parts.length === 1 ? parts[0] : parts);
  }
}
const sfx = (n, o) => { try { game.audio.sfx(n, o); } catch (e) { /* sound is optional */ } };

/* ----- voices: Animalese-style gibberish, a blip per syllable on a formant filter pair ----- */
const VOICES = {
  jeremy:   { f0: 118, spd: 1.0, bright: .9, name: 'The Hon. Jeremy Thwaite' },
  dot:      { f0: 230, spd: 1.1, bright: 1.1, name: 'Dot Pemberley' },
  vicar:    { f0: 150, spd: .85, bright: .8,  name: 'Vicar' },
  announcer:{ f0: 95,  spd: 1.3, bright: 1.2, name: 'Announcer' },
  coach:    { f0: 170, spd: .95, bright: 1,   name: 'Coach' },
  you:      { f0: 200, spd: 1.2, bright: 1,   name: 'You' },
};
const FORM = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [350, 700] };
let voiceEnd = 0;
function speak(text, voiceId) {
  const v = VOICES[voiceId] || VOICES.jeremy, a = game.audio;
  if (!a || !a.ctx || a.ctx.state !== 'running' || a.muted) return 0;
  const ctx = a.ctx, bus = a.bus('voice'); if (!bus) return 0;
  const t0 = ctx.currentTime + .02; let t = t0, n = 0;
  const letters = text.toLowerCase().replace(/[^a-z ]/g, '');
  for (let i = 0; i < letters.length && n < 90; i++) {
    const ch = letters[i];
    if (ch === ' ') { t += .07 / v.spd; continue; }
    if (i % 2 && 'aeiou'.indexOf(ch) < 0) continue;   // about a syllable per two letters
    const code = ch.charCodeAt(0) - 96, vow = 'aeiou'.indexOf(ch) >= 0 ? ch : 'aeiou'[code % 5];
    const f = v.f0 * Math.pow(2, ((code * 7) % 12 - 5) / 12) * (1 + (/[.!?]/.test(text[i]) ? .1 : 0));
    const o = ctx.createOscillator(), g = ctx.createGain(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (code % 3 === 0 ? 1.12 : .94), t + .06);
    b1.type = b2.type = 'bandpass'; b1.frequency.value = FORM[vow][0] * v.bright; b2.frequency.value = FORM[vow][1] * v.bright; b1.Q.value = b2.Q.value = 6;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .075 / v.spd);
    o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(bus);
    o.start(t); o.stop(t + .09 / v.spd); t += .085 / v.spd; n++;
  }
  voiceEnd = t; return t - t0;
}

/* ----- the commentary box ----- */
const COMM = { line: null, t: 0, who: 0, lock: 0, queue: [] };
function say(kind, prio = 1, force = false) {
  const arr = LINES[kind]; if (!arr) return;
  if (COMM.lock > 0 && prio < COMM.prio && !force) return;
  const text = rpick(arr, RNG.cos), idx = COMM.who = 1 - COMM.who;
  COMM.line = { name: COMM_NAMES[idx], text, vid: idx ? 'dot' : 'jeremy' };
  COMM.t = 4.5; COMM.lock = 2.4; COMM.prio = prio;
  speak(text, COMM.line.vid);
}
function commentUpdate(dt) { if (COMM.t > 0) COMM.t -= dt; if (COMM.lock > 0) COMM.lock -= dt; }

/* ===== 41-ui.js ===== */
/* ---------- 10-foot UI: big menus, prompts that follow the device in use, the match HUD ---------- */
const INK = '#fff8e0', GOLD = '#ffd860', DIM = '#a8b0a0', PANEL = '#141c2a';
const dark = (g, x, y, w, h, a = .65) => px.blend(g, a, 'normal', () => px.rect(g, x, y, w, h, '#000000'));
const text = (r, s, x, y, col = INK, o = {}) => r.text(s, x, y, col, Object.assign({ shadow: '#000', outline: false }, o));
/* the key, button or mouse glyph for an action on the device the player used last */
const glyph = a => { try { return game.input.label(a) || a; } catch (e) { return a; } };
const lastDev = () => { try { return game.input.lastDevice; } catch (e) { return 'keyboard'; } };

function panel(g, x, y, w, h, o = {}) { E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1b2840', '#101a2c'], border: '#e8e0b8', alpha: .86 }, o)); }
/* a prompt chip: [glyph] label */
function chip(r, x, y, act, label, o = {}) {
  const g1 = typeof act === 'string' && act.length > 1 && o.raw !== true ? glyph(act) : act, sc = o.scale || 1;
  const w1 = E.font.width(g1, { scale: sc }) + 8, w2 = E.font.width(label, { scale: sc });
  r.overlay(g => {
    px.rect(g, x, y, w1, 11 * sc, o.dim ? '#555a60' : '#f0e8c8'); px.rect(g, x + 1, y + 1, w1 - 2, 11 * sc - 2, o.dim ? '#2a2e34' : '#2a2a3a');
    E.font.text(g, g1, x + 4, y + 2 * sc, o.dim ? '#888' : '#ffe27a', { scale: sc, outline: false });
    E.font.text(g, label, x + w1 + 4, y + 2 * sc, o.dim ? '#888' : INK, { scale: sc, outline: false, shadow: '#000' });
  });
  return w1 + w2 + 14;
}
function chipsRow(r, y, items, scale = 1) {
  let tw = 0; const ws = items.map(it => { const g1 = glyph(it[0]); return E.font.width(g1, { scale }) + 8 + E.font.width(it[1], { scale }) + 14; });
  tw = ws.reduce((a, b) => a + b, 0); let x = Math.round((r.W - tw) / 2);
  items.forEach((it, i) => { chip(r, x, y, it[0], it[1], { scale, dim: it[2] }); x += ws[i]; });
}

/* ----- big menu: arrows/stick, confirm, mouse hover and click, left/right to change values ----- */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ y: 100, scale: 2, onCancel: null, w: 0 }, o); this._rows = []; this._mt = null; this.t = 0; this.skip(1); }
  off(it) { return it.disabled && (typeof it.disabled === 'function' ? it.disabled() : it.disabled); }
  skip(d) { for (let k = 0; k < this.items.length && this.off(this.items[this.i]); k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  update(dt) {
    this.t += dt || 0;
    const I = game.input, n = this.items.length, old = this.i;
    if (I.repeat('up')) { this.i = (this.i + n - 1) % n; this.skip(-1); }
    if (I.repeat('down')) { this.i = (this.i + 1) % n; this.skip(1); }
    const rowAt = p => { if (!p) return -1; for (let k = 0; k < this._rows.length; k++) { const q = this._rows[k]; if (p[0] >= q.x0 && p[0] <= q.x1 && p[1] >= q.y0 && p[1] <= q.y1 && !this.off(this.items[k])) return k; } return -1; };
    if (I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = rowAt(I.pointer()); if (k >= 0) this.i = k; }
    const tap = rowAt(I.clicked());
    if (tap >= 0) this.i = tap;
    if (this.i !== old) sfx('select');
    const it = this.items[this.i];
    if (it.opts) {
      const d = (I.repeat('right') ? 1 : 0) - (I.repeat('left') ? 1 : 0);
      if (d) { it.v = (it.v + d + it.opts.length) % it.opts.length; if (it.onChange) it.onChange(it.v, it); sfx('select'); }
    }
    if ((I.pressed('confirm') || tap >= 0) && !this.off(it)) {
      sfx('confirm');
      if (it.opts && tap < 0) { it.v = (it.v + 1) % it.opts.length; if (it.onChange) it.onChange(it.v, it); }
      else if (it.onPick) { I.consumeAll(); it.onPick(it); }
      else if (it.opts && it.onChange) { /* changed by click */ }
      return true;
    }
    if (I.pressed('cancel') && this.o.onCancel) { sfx('cancel'); I.consumeAll(); this.o.onCancel(); return true; }
    return false;
  }
  draw(r) {
    const sc = this.o.scale, lh = (E.font.lineHeight({ scale: sc }) + (this.o.gap == null ? 1 : this.o.gap));
    r.overlay(g => {
      this._rows = [];
      this.items.forEach((it, k) => {
        const sel = k === this.i, off = this.off(it), y = this.o.y + k * lh;
        let label = it.label; if (it.opts) label = it.label + ':  < ' + it.opts[it.v] + ' >';
        const w = E.font.width(label, { scale: sc }), cx = Math.round(r.W / 2) + (this.o.dx || 0), x0 = cx - w / 2 - 14, x1 = cx + w / 2 + 14;
        this._rows.push({ x0, x1, y0: y - 2, y1: y + lh - 3 });
        if (sel) { dark(g, x0, y - 2, x1 - x0, lh - 1, .6); px.rect(g, x0, y - 2, 2, lh - 1, GOLD); px.rect(g, x1 - 2, y - 2, 2, lh - 1, GOLD); }
        E.font.text(g, label, cx, y, off ? '#6a7078' : sel ? GOLD : INK, { scale: sc, align: 'center', outline: false, shadow: '#000' });
        if (sel && !off) E.font.text(g, '▸', x0 + 6 + Math.round(Math.sin(this.t * 8) * 1.5), y, GOLD, { scale: sc, outline: false });
        if (it.hint && sel) E.font.text(g, it.hint, cx, this.o.hintY ? (this.o.hintY < 0 ? r.H + this.o.hintY : this.o.hintY) : this.o.y + this.items.length * lh + 6, this.o.hintCol || DIM, { align: 'center', outline: false, shadow: '#000' });
      });
    });
  }
}

/* ----- the HUD ----- */
function oversStr(balls) { return Math.floor(balls / 6) + '.' + (balls % 6); }
function hudScore(r, M) {
  const S = M.sideBat(), B = M.sideBowl(), tm = TEAMS[S.team];
  r.overlay(g => {
    const x = 6, y = 6;
    panel(g, x, y, 128, 52);
    px.rect(g, x + 4, y + 4, 6, 20, tm.trim);
    E.font.text(g, TEAMS[S.team].short, x + 14, y + 4, INK, { scale: 1, outline: false, shadow: '#000' });
    E.font.text(g, S.score + '/' + S.wkts, x + 14, y + 13, GOLD, { scale: 2, outline: false, shadow: '#000' });
    E.font.text(g, 'OV ' + oversStr(S.balls) + '/' + M.overs, x + 124, y + 5, DIM, { align: 'right', outline: false, shadow: '#000' });
    let sub = M.inn === 1 && !M.single ? 'NEED ' + Math.max(0, M.target - S.score) + ' FROM ' + (M.overs * 6 - S.balls) : (M.inn === 0 && !M.single ? 'SET A TARGET' : 'MAX SCORE');
    if (M.single) sub = 'SUPER OVER';
    E.font.text(g, sub, x + 124, y + 15, '#bfe8ff', { align: 'right', outline: false, shadow: '#000' });
    // the last balls
    const hist = S.history.slice(-8);
    hist.forEach((h, k) => {
      const c = h === 'W' ? '#e04030' : h === '6' ? '#ffcc30' : h === '4' ? '#4ac0f0' : /Wd|Nb/.test(h) ? '#c8a050' : '#e8e8e8';
      px.disc(g, x + 9 + k * 14, y + 39, 5, c); E.font.text(g, h, x + 9 + k * 14, y + 36, '#101820', { align: 'center', font: 'tiny', outline: false });
    });
    // the other side's total, small
    E.font.text(g, TEAMS[B.team].short + ' ' + B.score + '/' + B.wkts, x + 14, y + 29, '#9ab0c8', { outline: false, shadow: '#000' });
  });
  // hype
  const side = S.fire > 0 ? S : null;
  r.overlay(g => {
    const wdt = 110, x = r.W - wdt - 8, y = 8, mine = S;
    panel(g, x - 4, y - 2, wdt + 8, 26);
    E.font.text(g, mine.fire > 0 ? 'ON FIRE ×' + mine.fire : (mine.hype >= 100 ? 'HYPE FULL!' : 'HYPE'), x, y + 1, mine.hype >= 100 || mine.fire > 0 ? '#ff9a30' : INK, { outline: false, shadow: '#000' });
    const pct = mine.fire > 0 ? mine.fire / Math.round(T('fireBalls')) : mine.hype / 100;
    px.rect(g, x, y + 11, wdt, 8, '#10141c');
    const flick = mine.fire > 0 || mine.hype >= 100 ? (Math.floor(game.real * 8) % 2 ? '#ffd040' : '#ff6020') : '#40b0ff';
    px.rect(g, x + 1, y + 12, Math.round((wdt - 2) * clamp(pct, 0, 1)), 6, flick);
    const hb = B.hype; px.rect(g, x, y + 20, Math.round(wdt * hb / 100), 2, '#e07060');
  });
}
function hudBanner(r, M) {
  const b = M.banner; if (!b) return;
  const k = b.t / b.t0, pop = Math.min(1, (b.t0 - b.t) * 8), sc = 3;
  r.overlay(g => {
    const y = Math.round(r.H * .3), w = r.W;
    dark(g, 0, y - 6, w, sc * 10 + 24, .7);
    px.rect(g, 0, y - 6, w, 2, b.col); px.rect(g, 0, y + sc * 10 + 16, w, 2, b.col);
    const s = Math.max(1, Math.round(sc * (.6 + .4 * pop)));
    E.font.text(g, b.text, w / 2, y, b.col, { scale: s, align: 'center', outline: '#000', shadow: '#000' });
    if (b.sub) E.font.text(g, b.sub, w / 2, y + sc * 10 + 4, INK, { scale: 1, align: 'center', outline: false, shadow: '#000' });
  });
}
function hudCaption(r) {
  if (!COMM.line || COMM.t <= 0) return;
  r.overlay(g => {
    const w = Math.min(r.W - 20, 176), x = 6, lines = E.font.wrap(COMM.line.text, w - 16), h = 14 + lines.length * 9, y = 62;
    panel(g, x, y, w, h, { alpha: .8 });
    E.font.text(g, COMM.line.name, x + 8, y + 4, COMM.line.vid === 'dot' ? '#ffb0d8' : '#a8d8ff', { outline: false, shadow: '#000' });
    lines.forEach((l, i) => E.font.text(g, l, x + 8, y + 13 + i * 9, INK, { outline: false, shadow: '#000' }));
  });
}
function hudRadar(r, M) {
  const w = 62, h = 66, x = r.W - w - 8, y = r.H - h - 30;
  r.overlay(g => {
    dark(g, x - 1, y - 1, w + 2, h + 2, .75);
    const sx = w / (RX * 2.5), sy = h / (RY * 2.5), cx = x + w / 2, cy = y + h / 2;
    px.ell(g, cx, cy, RX * sx * T('boundaryScale'), RY * sy * T('boundaryScale'), '#2e6a34');
    px.rect(g, cx - 1, cy - 20, 3, 40, '#c8aa72');
    for (const f of M.fielders) px.dot(g, cx + (f.x - CX) * sx, cy + (f.y - MY) * sy, f.id === M.active ? '#ffe040' : '#f0f0f0');
    for (const b of M.batters) px.dot(g, cx + (b.x - CX) * sx, cy + (b.y - MY) * sy, '#ff6060');
    if (M.cow) px.dot(g, cx + (M.cow.x - CX) * sx, cy + (M.cow.y - MY) * sy, '#222');
    px.disc(g, cx + (M.ball.x - CX) * sx, cy + (M.ball.y - MY) * sy, 1.5, '#ff3030');
  });
}
function hudMeter(r, M) {
  const R = M.runup; if (!R) return;
  const w = 180, x = Math.round((r.W - w) / 2), y = r.H - 58, tm = R.t - R.meterStart;
  const p = tm <= 0 ? 0 : clamp(.5 - .5 * Math.cos(TAU * T('meterSpeed') * tm), 0, 1);
  r.overlay(g => {
    panel(g, x - 6, y - 12, w + 12, 30);
    E.font.text(g, DELIVERIES[R.type].name.toUpperCase() + ' - RELEASE IN THE GREEN', r.W / 2, y - 9, INK, { align: 'center', outline: false, shadow: '#000' });
    px.rect(g, x, y + 2, w, 9, '#a03028'); px.rect(g, x + w * .18, y + 2, w * .64, 9, '#d0a030'); px.rect(g, x + w * .34, y + 2, w * .32, 9, '#38b048'); px.rect(g, x + w * .95, y + 2, w * .05, 9, '#ff2020');
    const nx = x + w * p; px.rect(g, nx - 1, y - 1, 3, 15, '#fff'); px.rect(g, nx, y - 3, 1, 3, '#fff');
  });
}
function hudSpeed(r, M) {
  if (M.ph !== 'flight' && !(M.ph === 'inplay' && M.t < 1.5)) return;
  r.overlay(g => { E.font.text(g, (M.speedKmh || 0) + ' KM/H', r.W / 2, 62, '#d8f0ff', { scale: 2, align: 'center', outline: false, shadow: '#000' }); const d = DELIVERIES[M.delType]; if (d) E.font.text(g, d.name.toUpperCase(), r.W / 2, 82, d.col, { align: 'center', outline: false, shadow: '#000' }); });
}
function hudStrips(r, M) {
  if (M.freeHit) r.overlay(g => { const t = Math.floor(game.real * 4) % 2; E.font.text(g, 'FREE HIT', r.W / 2, 44, t ? '#ffdc40' : '#ff7a30', { scale: 2, align: 'center', outline: false, shadow: '#000' }); });
  if (M.golden && M.ph !== 'between') r.overlay(g => E.font.text(g, '★ GOLDEN BALL - RUNS COUNT DOUBLE ★', r.W / 2, M.freeHit ? 66 : 46, GOLD, { align: 'center', outline: false, shadow: '#000' }));
  if (M.wet) r.overlay(g => E.font.text(g, 'RAIN: the ball skids', 140, 10, '#9ac8ff', { outline: false, shadow: '#000', x: 0 }));
}
function hudPrompts(r, M, ctrl) {
  const y = r.H - 18, bat = ctrl.bat, bowl = ctrl.bowl;
  if (bat && (M.ph === 'setup' || M.ph === 'flight')) {
    const rowItems = [['ground', 'DRIVE'], ['loft', 'LOFT'], ['defend', 'BLOCK'], ['special', M.sideBat().hype >= 100 ? 'ON FIRE!' : 'ON FIRE', M.sideBat().hype < 100]];
    chipsRow(r, y, rowItems);
    text(r, (lastDev() === 'mouse' ? 'MOUSE AIMS' : 'STICK AIMS') + ' THE SHOT • TIME IT WITH THE RING', r.W / 2, y - 12, DIM, { align: 'center' });
  } else if (bat && M.ph === 'inplay') {
    chipsRow(r, y, [['run', M.batters.some(b => b.moving) ? 'RUN / TURN BACK  (hold to keep running)' : 'RUN!  (hold to keep running)']]);
  } else if (bowl && M.ph === 'setup') {
    chipsRow(r, y, [['ground', 'QUICKIE'], ['loft', 'SWINGER'], ['defend', 'SPINNER'], ['special', 'FIREBALL', M.sideBowl().hype < 100], ['cycle', 'FIELD: ' + M.field.toUpperCase()]]);
    text(r, (lastDev() === 'mouse' ? 'MOVE THE MOUSE' : 'STICK') + ' SETS THE PITCHING MARKER', r.W / 2, y - 12, DIM, { align: 'center' });
  } else if (bowl && M.ph === 'runup') {
    chipsRow(r, y, [['ground', 'RELEASE']]);
  } else if (bowl && M.ph === 'flight') {
    text(r, 'STICK ←→ : SWING IT AFTER RELEASE', r.W / 2, y - 2, DIM, { align: 'center' });
  } else if (bowl && M.ph === 'inplay') {
    chipsRow(r, y, [['run', 'DIVE'], ]); text(r, 'STICK MOVES THE FIELDER', r.W / 2, y - 12, DIM, { align: 'center' });
  }
}
function hudAll(r, M, ctrl) {
  hudScore(r, M); hudStrips(r, M);
  if (M.ph === 'runup' && M.runup && M.runup.human) hudMeter(r, M);
  hudSpeed(r, M); hudBanner(r, M); hudCaption(r); hudPrompts(r, M, ctrl);
  if (M.ph === 'inplay' || M.ph === 'between') hudRadar(r, M);
  if (M.ph === 'intro') r.overlay(g => { const y = Math.round(r.H * .35); panel(g, 40, y, r.W - 80, 56); E.font.text(g, TEAMS[M.sideBat().team].name.toUpperCase() + (M.single ? ' BAT' : M.inn ? ' CHASE' : ' BAT FIRST'), r.W / 2, y + 10, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, M.inn === 1 ? 'TARGET ' + M.target + ' • ' + M.overs + ' OVERS' : M.overs + ' overs a side • ' + M.maxW + ' wickets • ' + M.ground.name, r.W / 2, y + 34, INK, { align: 'center', outline: false, shadow: '#000' }); });
}

/* ===== 50-match-scene.js ===== */
/* ---------- the match scene: controls, animation, camera, effects and drawing around the simulation ---------- */
let MS = null;   // the running match session { M, mode, cfg, ... }
const ZB = 1, ZW = .66, CAMY = 462;   // broadcast zoom and the wide cut
const DEVFLAGS = { god: false, slow: false, debugDraw: false };

const inpOf = c => (c === 'p1' ? game.players[0] : c === 'p2' ? (game.players[1] || null) : null);
function aimFromInput(inp, from) {
  if (inp.aimSource === 'mouse') {
    const mg = game.mouseGround();
    if (mg) { const dx = mg[0] - from.x, dy = mg[1] - from.y, l = hyp(dx, dy); if (l > 6) return [dx / l, dy / l]; }
  }
  const mv = inp.move();
  if (hyp(mv[0], mv[1]) > .3) { const d = game.view.screenDirToGround(mv[0], mv[1]), l = hyp(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; }
  return [0, 1];
}
function batIntent(inp, M) {
  const it = newIntent(); if (!inp) return it;
  it.aim = aimFromInput(inp, M.striker());
  if (inp.pressed('ground')) it.shot = 'ground'; else if (inp.pressed('loft')) it.shot = 'loft'; else if (inp.pressed('defend')) it.shot = 'defend';
  it.run = inp.pressed('run'); it.runHeld = inp.down('run'); it.special = inp.pressed('special');
  return it;
}
function bowlIntent(inp, M) {
  const it = newIntent(); if (!inp) return it;
  it.human = true;
  const mv = inp.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
  it.mx = d[0]; it.my = d[1];
  if (inp.aimSource === 'mouse') { const mg = game.mouseGround(); if (mg) it.aimPoint = mg; }
  const g = inp.pressed('ground'), l = inp.pressed('loft'), s = inp.pressed('defend'), f = inp.pressed('special');
  if (M.ph === 'setup') { if (g) it.bowl = 'pace'; else if (l) it.bowl = 'swing'; else if (s) it.bowl = 'spin'; else if (f && M.sideBowl().hype >= 100) it.bowl = 'fire'; }
  if (g || l || s || f) it.release = true;
  it.cycle = inp.pressed('cycle'); it.dive = inp.pressed('run');
  return it;
}

function startMatch(data) {
  RNG.play = mkrng((data.seed || (Date.now() & 0xffffff)) | 1);
  game.go('match', data);
}

const matchScene = {
  get pausable() { return !!MS && !MS.attract && !MS.ended && !DEV.open; },
  enter(data) {
    tuningReset(); if (data.tune) Object.assign(TV, data.tune);
    const hub = !!data.hub, attract = !!data.attract;
    const cfg = { mode: data.mode, overs: data.overs || 2, wickets: data.wickets || 3, diff: data.diff == null ? 1 : data.diff, ground: data.ground || 'green',
      teamA: 'kerf', teamB: data.opp || 'witt', ctrlA: attract ? null : 'p1', ctrlB: data.mode === 'versus' ? 'p2' : null,
      chaos: data.chaos || 'all', cheat: attract, attract, hub, single: !!data.single, batFirst: data.batFirst || 0, golden: true };
    if (hub) {
      cfg.overs = 1; cfg.wickets = 2; cfg.chaos = 'none'; cfg.diff = 1;
      cfg.rngBall = n => AIHub.rng('over' + n); cfg.rngF = n => AIHub.rng('field' + n);
    }
    const M = createMatch(cfg);
    MS = { M, cfg, mode: data.mode, data, attract, hub, endT: 0, ended: false, cam: { x: CX, y: CAMY, z: ZB, wide: false }, offs: [], idle: 0, mouseT: null, ump: 0, flashT: 0, slowT: 0, ch: data.ch || 0, hubScore: -1, over: false };
    M.cheerT = 0;
    buildMap(cfg.ground); buildRigs(TEAMS[M.sideBat().team] && M.sideBat().team, M.sideBowl().team);
    game.setView('broadcast'); game.setZoom(ZB);
    game.lights.enabled = M.ground.night; game.lights.ambient = M.ground.night ? .52 : .85;
    game.weather = null; game.cam.smooth = 0;
    wireEvents(MS);
    MS.cam.x = CX; MS.cam.y = CAMY; game.focus(CX, CAMY, 0);
    playMusic(attract ? 'title' : M.ground.music, 0.4);
    M.start();
    if (!attract) say('welcome', 0, true);
    if (hub && AIHub.active) { /* the hub's clock decides when play starts */ M.holdForHub = true; M.t = -1e9; }
  },
  exit() { if (MS) { for (const o of MS.offs) o(); } game.timeScale = 1; game.lights.enabled = false; game.weather = null; DEVFLAGS.slow = false; },
  update(dt) {
    const M = MS.M; if (!M) return;
    if (devUpdate(dt)) return;
    if (MS.attract && attractExit()) return;
    // hub: wait for the round clock
    if (MS.hub && AIHub.active && AIHub.time() < 0) { game.cam.smooth = 0; animate(dt); camera(dt); return; }
    const sb = M.sideBat(), sw = M.sideBowl();
    const ib = inpOf(sb.ctrl), iw = inpOf(sw.ctrl);
    const human = { bat: ib ? batIntent(ib, M) : null, bowl: iw ? bowlIntent(iw, M) : null };
    M.god = DEVFLAGS.god;
    M.step(dt, human);
    if (M.cheerT > 0) M.cheerT -= dt;
    if (M.ph === 'done' && !MS.ended) { MS.ended = true; MS.endT = 3.2; }
    if (MS.ended) { MS.endT -= dt; if (MS.endT <= 0) finishMatch(); }
    animate(dt); camera(dt); commentUpdate(dt);
    if (MS.slowT > 0) { MS.slowT -= dt / Math.max(.2, game.timeScale); if (MS.slowT <= 0) game.timeScale = DEVFLAGS.slow ? .25 : 1; }
    if (M.wet !== MS.wasWet) { MS.wasWet = M.wet; game.weather = M.wet ? { kind: 'rain', amount: .7, wind: .15, lightning: 0 } : null; }
    if (MS.hub && AIHub.active && M.ballNo !== MS.lastProg) { MS.lastProg = M.ballNo; AIHub.progress({ score: sb.score, label: sb.score + '/' + sb.wkts }); }
    if (M.sideBat().fire > 0 && (M.ph === 'flight' || M.ph === 'setup') && RNG.cos() < .6) { const tp = rigs.bat[M.sIdx].tip(); game.particles.fire(tp[0], tp[1], tp[2], 1, { size: 1.2 }); }
    if (M.sideBat().fire > 0 && M.ph === 'inplay' && M.ball.phase === 'live' && RNG.cos() < .5) game.particles.fire(M.ball.x, M.ball.y, M.ball.z, 1, { size: 1.4 });
    if (DEVFLAGS.slow && MS.slowT <= 0) game.timeScale = .25;
  },
  draw(r) { drawMatch(r); },
};

function attractExit() {
  const I = game.input;
  if (MS.idle < .6) { MS.idle += 1 / 120; MS.mouseT = I.mouse.t; return false; }
  if (I.anyPressed() || I.clicked() || I.mouse.t !== MS.mouseT || hyp(...I.move()) > .5) { game.go('title'); return true; }
  return false;
}

function finishMatch() {
  const M = MS.M;
  if (MS.attract) { startMatch({ mode: 'attract', attract: true, overs: 2, wickets: 3, opp: rpick(['witt', 'gumb', 'mega'], RNG.cos), ground: rpick(['green', 'cow', 'dome'], RNG.cos), seed: (RNG.cos() * 1e6) | 0 }); return; }
  if (MS.hub) { if (AIHub.active && !MS.hubDone) { MS.hubDone = true; AIHub.result({ score: M.sides[0].score, stats: { 'Sixes': M.sides[0].sixes, 'Fours': M.sides[0].fours, 'Wickets lost': M.sides[0].wkts } }); } return; }
  game.go('results', { mode: MS.mode, M: M.snapshot(), result: M.result, sides: M.sides.map(s => ({ team: s.team, score: s.score, wkts: s.wkts, balls: s.balls, fours: s.fours, sixes: s.sixes })), ch: MS.ch, data: MS.data, single: M.single });
}

/* ----- events -> sound, particles, commentary ----- */
function wireEvents(S) {
  const M = S.M, add = (t, f) => S.offs.push(on(t, f));
  const spawnFx = (x, y, z) => ({ x, y, z });
  add('swing', () => sfx('swish'));
  add('release', d => { sfx('release'); if (d.fire) sfx('fireup'); if (d.over) { sfx('noball'); } });
  add('pitched', () => sfx('bounce'));
  add('bounce', () => { if (M.ball.z < 1 && hyp(M.ball.vx, M.ball.vy) > 60) sfx('bounce', { vol: .4 }); });
  add('pad', () => { sfx('thud'); });
  add('keeper', () => { sfx('pop'); });
  add('pickup', () => sfx('pop', { vol: .5 }));
  add('throw', () => sfx('swish', { vol: .6 }));
  add('contact', d => {
    const b = M.ball;
    sfx(d.perfect ? 'crackP' : 'crack');
    game.particles.sparks(b.x, b.y, 14, d.perfect ? 12 : 5, d.err > 0 ? 0 : Math.PI);
    if (d.perfect) { game.freeze(.09); game.shake(3); game.flash('#ffffff', .08, .35); game.particles.ring(b.x, b.y, 4, 26, '#ffe880', .25); game.particles.text(b.x, b.y, 28, 'PERFECT!', '#ffe880', { scale: 1, bounce: true }); }
    else game.freeze(.03);
    if (d.fire) game.particles.fire(b.x, b.y, 10, 8, { size: 2 });
    game.input.rumble(d.perfect ? .8 : .35, .15);
  });
  add('boundary', d => {
    M.cheerT = 2.6; sfx('cheer'); S.ump = 2.4; S.umpSig = d.n === 6 ? 'cheer' : 'wave';
    say(d.n === 6 ? 'six' : 'four', 3);
    const b = M.ball;
    game.particles.bits(b.x, b.y, 10, d.n === 6 ? 30 : 14, ['#ffd040', '#ff4060', '#40c0ff', '#60e060']);
    if (d.n === 6) { game.flash('#fff0b0', .14, .5); game.shake(4); }
    game.input.rumble(.6, .25);
  });
  add('target', d => {
    sfx(d.t.id === 'window' ? 'glass' : 'ding'); sfx('cheer');
    if (d.t.id === 'window') SET_BROKEN.window = true;
    game.particles.bits(d.x, d.y, 20, 30, d.t.id === 'window' ? ['#bfe8ff', '#ffffff', '#7ac0e0'] : [d.t.col, '#ffffff']);
    game.particles.explosion(d.x, d.y, 18, 2.2, { shake: 3 });
    say(d.t.id === 'window' ? 'window' : d.t.id === 'urn' ? 'tea' : 'six', 5, true);
  });
  add('wicket', d => {
    S.ump = 2.6; S.umpSig = 'cheer'; sfx(d.how === 'caught' ? 'pop' : 'stumps'); if (d.how !== 'caught') game.shake(5);
    const ourSide = d.side === 0 && M.sideBat().ctrl === 'p1';
    sfx(ourSide ? 'groan' : 'cheer'); say(d.how === 'runout' ? 'runout' : d.how, 5, true); sfx('appeal');
    for (const f of M.fielders) f.celeb = 1.6;
    if (d.how === 'bowled') { game.timeScale = .35; S.slowT = .55; }
    game.flash('#ff4030', .12, .3);
    if (M.sideBowl().ctrl === 'p1') game.input.rumble(.6, .3);
  });
  add('stumps', d => { M.stumpEnd = d.end; });
  add('dropped', () => { sfx('dropped'); say('dropped', 4, true); });
  add('extra', d => { say(d.kind === 'wide' ? 'wide' : 'noball', 2, true); sfx(d.kind === 'wide' ? 'appeal' : 'noball'); S.ump = 1.5; S.umpSig = 'wave'; });
  add('runs', d => { say(d.n === 0 ? 'dot' : d.n === 1 ? 'one' : d.n === 2 ? 'two' : 'three', 1); if (d.n >= 2) sfx('cheer', { vol: .5 }); });
  add('run', () => sfx('run'));
  add('fire:on', d => { sfx('fireup'); say('fire', 4, true); game.flash('#ff8020', .2, .5); game.shake(4); if (d.side === M.bat) playMusic('fire', .2); });
  add('fire:off', () => playMusic(M.ground.music, .5));
  add('hype:full', d => { sfx('ding'); if (M.sides[d.side].ctrl) game.particles.text(CX, SY + 40, 40, 'HYPE FULL!', '#ffb020', { scale: 1.5, bounce: true }); });
  add('chaos', d => {
    if (d.id === 'cow') { say('cow', 3, true); sfx('moo'); } else if (d.id === 'rain') { say('rain', 3, true); } else if (d.id === 'golden') { say('golden', 3, true); sfx('golden'); }
  });
  add('cowstop', () => { sfx('moo'); say('cowstop', 5, true); });
  add('overthrow', () => { });
  add('over:end', () => sfx('ding'));
  add('innings:end', d => { say('hat', 0); });
  add('match:end', d => { M.cheerT = 4; sfx('cheer'); const w = d.winner; say(w === 0 ? 'win' : 'lose', 5, true); });
  add('ball:end', d => { if (d.kind === 'wicket' && !d.out) sfx('ding'); });
}

/* ----- animation: rigs follow the simulation ----- */
function animate(dt) {
  const M = MS.M, t = game.time;
  const bk = M.sideBat().team + ':' + M.sideBowl().team; if (rigs.key !== bk) buildRigs(M.sideBat().team, M.sideBowl().team);
  const ball = M.ball, face = f => Math.atan2(ball.y - f.y, ball.x - f.x);
  M.batters.forEach((b, i) => {
    const rig = rigs.bat[i], striker = i === M.sIdx && !b.moving;
    const st = { x: b.x, y: b.y, z: 0, vx: 0, vy: b.vy, facing: b.moving ? b.face : (striker ? Math.PI / 2 : -Math.PI / 2), stance: 'ready' };
    if (b.swingT >= 0 && i === M.sIdx) { const nm = b.swingType === 'loft' ? 'rising' : b.swingType === 'defend' ? 'twohand' : 'backslash'; st.attack = E.move(nm, clamp(b.swingT / SWING_DUR, 0, 1)); }
    else if (M.ph === 'between' && M.last) { if (M.last.kind === 'boundary' || (M.last.runs >= 3)) st.pose = 'cheer'; else if (M.last.how && i === M.sIdx) st.pose = 'kneel'; }
    if (!b.moving && M.ph === 'flight' && striker) st.facing = Math.PI / 2 + .35;
    rig.update(dt, st);
  });
  M.fielders.forEach((f, i) => {
    const rig = rigs.field[i];
    const st = { x: f.x, y: f.y, z: 0, vx: f.vx, vy: f.vy, facing: hyp(f.vx, f.vy) > 12 ? f.face : (i === 0 && M.ph !== 'inplay' ? -Math.PI / 2 : face(f)) };
    if (i === 0 && M.ph === 'flight' && M.t < .4) st.attack = E.move('throw', M.t / .4);
    else if (f.throwT > 0) st.attack = E.move('throw', 1 - f.throwT / .35);
    else if (f.celeb > 0) st.pose = 'cheer';
    else if (f.hasBall && f.holdT < .25) st.pose = 'crouch';
    else if (f.dive > 0) st.pose = 'kneel';
    else if (f.drop > 0) st.pose = 'hips';
    if (f.id === M.active && M.ph === 'inplay') st.sprint = 1;
    rig.update(dt, st);
  });
  if (MS.ump > 0) MS.ump -= dt;
  rigs.umpire.update(dt, { x: CX + 30, y: BY + 4, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2 - .3, pose: MS.ump > 0 ? MS.umpSig || 'cheer' : undefined });
}

/* ----- camera director: the broadcast view down the pitch, then a wide cut that follows the ball ----- */
function camera(dt) {
  const M = MS.M, c = MS.cam;
  if (M.ph === 'inplay' && M.hit) c.wide = true;
  else if (M.ph === 'between') { if (M.t > 1.2) c.wide = false; }
  else c.wide = false;
  let tx = CX, ty = CAMY, tz = ZB;
  if (c.wide) { const b = M.ball; tx = clamp(CX + (b.x - CX) * .65, CX - 260, CX + 260); ty = clamp(MY + (b.y - MY) * .6, MY - 230, MY + 230); tz = ZW; if (M.ph === 'between') { tx = c.x; ty = c.y; } }
  const k = 1 - Math.pow(.0008, dt);
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  if (c.z !== tz) { c.z = tz; game.setZoom(tz); }
  game.focus(c.x, c.y, 0);
}

/* ----- drawing ----- */
function drawMatch(r) {
  const M = MS.M, t = game.time;
  r.sky(M.ground.sky);
  map.drawFloor(r);
  drawSet(r, M);
  drawCrowd(r, M, t);
  // the pitching marker, the timing ring and the shadow of where the ball will land
  r.decal(() => {
    const ph = M.ph;
    if (M.sideBowl().ctrl && (ph === 'setup' || ph === 'runup')) {
      const k = .6 + .4 * Math.sin(t * 6);
      r.groundRing(M.marker[0], M.marker[1], 7 + k * 2, '#ffd860', 1); r.groundRing(M.marker[0], M.marker[1], 3, '#ff6040', .9);
      r.groundDisc(M.marker[0], M.marker[1], 4, '#ff4030', .3);
      const bands = [[372, 'YORKER'], [410, 'FULL'], [455, 'GOOD'], [510, 'SHORT']];
      for (const [by] of bands) { const a = r.w(CX - 28, by, 0), b = r.w(CX + 28, by, 0); px.line(r.tgt, a[0], a[1], b[0], b[1], '#ffffff', 1); }
    }
    if (ph === 'flight' && M.sideBat().ctrl && !M.swing) {
      const b = M.ball, bat = M.striker(); const pr = predictPlane(b, YHIT), tl = pr.t;
      const win = T('window') * (M.sideBat().fire > 0 ? 1.5 : 1), ready = Math.abs(tl - SWING_DELAY) < win;
      const rad = 5 + clamp(tl - SWING_DELAY + win, 0, 1.2) * 38;
      for (const k of [0, .8, 1.6]) r.groundRing(bat.x, YHIT, rad + k, ready ? '#58ff70' : '#ffffff', 1); r.groundRing(bat.x, YHIT, 6, ready ? '#58ff70' : '#ffd860', 1); r.groundDisc(bat.x, YHIT, 5, ready ? '#58ff70' : '#ffd860', .35);
    }
    if (ph === 'inplay' && MS.M.landing && M.ball.carried && M.ball.z > 4) r.groundRing(M.landing[0], M.landing[1], 6 + Math.sin(t * 10) * 1.5, '#ffe040', .9);
    if (ph === 'inplay' && M.sideBowl().ctrl && M.fielders[M.active]) { const f = M.fielders[M.active]; r.groundRing(f.x, f.y, 9, '#ffe040', 1); }
    if (DEVFLAGS.debugDraw) for (const f of M.fielders) r.groundRing(f.x, f.y, 10, '#ff00ff', .5);
  });
  drawStumps(r, SY, M); drawStumps(r, BY, M);
  r.shadow(CX + 30, BY + 4, 6, .35);
  r.actor(CX + 30, BY + 4, 0, (g, ox, oy) => rigs.umpire.draw(g, ox, oy, r.view));
  M.fielders.forEach((f, i) => { r.shadow(f.x, f.y, 7, .35); r.actor(f.x, f.y, 0, (g, ox, oy) => rigs.field[i].draw(g, ox, oy, r.view)); });
  M.batters.forEach((b, i) => {
    r.shadow(b.x, b.y, 7, .35);
    r.actor(b.x, b.y, 0, (g, ox, oy) => { rigs.bat[i].draw(g, ox, oy, r.view); });
    if (b.swingT >= 0 && i === M.sIdx) r.queue(b.x, b.y, 30, g => rigs.bat[i].drawSmear && rigs.bat[i].drawSmear(r));
  });
  if (M.cow) drawCow(r, M.cow, t);
  drawBall(r, M, t);
  if (M.ground.night) { for (const [lx, ly] of [[CX - 330, MY - 360], [CX + 330, MY - 360], [CX - 330, MY + 360], [CX + 330, MY + 360]]) game.lights.add(lx, ly, 90, 520, .75, { color: '#fff4d0' }); game.lights.add(CX, MY, 40, 260, .5, { color: '#fff4d0' }); }
  if (M.sideBat().fire > 0) game.lights.add(M.striker().x, M.striker().y, 20, 70, .9, { color: '#ff7a20' });
  hudAll(r, M, { bat: !!inpOf(M.sideBat().ctrl), bowl: !!inpOf(M.sideBowl().ctrl) });
  devDraw(r);
  if (MS.hub) hubOverlay(r);
  if (MS.attract) r.overlay(g => { const y = r.H - 38; dark(g, 0, y, r.W, 22, .6); E.font.text(g, 'DEMO - PRESS ANY BUTTON', r.W / 2, y + 7, Math.floor(game.real * 2) % 2 ? GOLD : INK, { align: 'center', outline: false, shadow: '#000' }); });
}

/* ===== 60-scenes.js ===== */
/* ---------- front-end scenes: title, setup, story map, cutscenes, results, how to play, scores, about ---------- */
let cab = null;                 // E.Arcade: the Super Over table and the initials entry
const progress = () => store.get('progress', { chapters: 0, stars: [0, 0, 0] });
const saveProgress = p => store.set('progress', p);
let setupMode = 'quick';
const SETUP = { opp: 0, ground: 0, overs: 1, wickets: 1, diff: 1, chaos: 1 };
const OPPS = ['witt', 'gumb', 'mega', 'rain'], GROUND_IDS = ['green', 'cow', 'dome'], OVERS = [1, 2, 3, 5], WKTS = [2, 3, 5];

const backdrop = (r, t, night) => {
  r.sky(night ? ['#080818', '#1c1840', '#4a2a70'] : ['#5aaee8', '#a8dcf4', '#f6ecc4']);
  r.overlay(g => {
    // rolling hills, a pavilion and a very patient cow
    const h = r.H;
    px.rect(g, 0, h * .6, r.W, h * .4, night ? '#1e5a30' : '#3f9a3a');
    for (let x = 0; x < r.W; x += 2) px.rect(g, x, h * .6 + Math.sin(x / 40) * 4 - 4, 2, 6, night ? '#246a38' : '#4aa845');
    for (let i = 0; i < 6; i++) px.rect(g, 0, h * .66 + i * 12, r.W, 6, night ? '#226236' : '#459f40');
    px.rect(g, r.W * .08, h * .46, 70, 30, '#f0e8d0'); px.poly(g, [[r.W * .08 - 4, h * .46], [r.W * .08 + 74, h * .46], [r.W * .08 + 35, h * .46 - 18]], '#a03a30');
    for (let k = 0; k < 4; k++) px.rect(g, r.W * .08 + 6 + k * 16, h * .46 + 10, 8, 12, night ? '#ffe9a0' : '#6ab0d8');
    // a ball in the sky, forever on its way to a window
    const bt = (t * .35) % 1, bx = bt * (r.W + 40) - 20, by = h * .5 - Math.sin(bt * Math.PI) * h * .38;
    px.disc(g, bx, by, 4, '#ffffff'); px.disc(g, bx, by, 3, '#d02830');
    if (night) for (let i = 0; i < 40; i++) px.dot(g, (i * 97) % r.W, (i * 53) % (h * .5), i % 3 ? '#ffffff' : '#ffe9a0');
  });
};
const titleLogo = (r, y, sc = 3) => r.overlay(g => {
  E.font.title(g, 'CRICKET', r.W / 2, y, { scale: sc, align: 'center', colors: ['#fff6c0', '#ffd040', '#e07020'], outline: '#301008', depth: 3, depthColor: '#6a2a10' });
  E.font.title(g, 'KERFUFFLE', r.W / 2, y + sc * 9 + 6, { scale: sc + 1, align: 'center', colors: ['#d8f8ff', '#58c0f0', '#2060c0'], outline: '#081830', depth: 3, depthColor: '#102850' });
});

/* ----- title ----- */
let titleMenu = null, titleMore = null, titleState = { more: false, idle: 0, mt: null, t: 0, touchOnly: false };
const titleScene = {
  enter() {
    titleState.idle = 0; titleState.more = false; titleState.t = 0; titleState.mt = game.input.mouse.t;
    const touchOnly = !!(typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)));
    titleState.touchOnly = touchOnly;
    const go = (m) => { setupMode = m; game.go('setup'); };
    titleMenu = new BigMenu([
      { label: 'STORY MODE', hint: 'Three chapters. One missing Cup. A cow with opinions.', onPick: () => game.go('story') },
      { label: 'QUICK MATCH', hint: 'Bat, bowl and field a full match. You choose the rules.', onPick: () => go('quick') },
      { label: 'SUPER OVER', hint: 'One over, two wickets. Score as much as you dare.', onPick: () => go('super') },
      { label: 'VERSUS (2 PLAYERS)', hint: 'Two players, one screen: you bat, they bowl, then swap.', onPick: () => go('versus') },
      { label: 'SETTINGS', hint: 'Sound, display, button symbols (PlayStation or Xbox).', onPick: () => game.menu('settings') },
      { label: 'MORE...', onPick: () => { titleState.more = true; titleMore.i = 0; } },
    ], { y: 86, scale: 2, hintY: -34, hintCol: '#f6f2d0' });
    titleMore = new BigMenu([
      { label: 'HOW TO PLAY', onPick: () => game.go('howto') },
      { label: 'HIGH SCORES', onPick: () => game.go('scores') },
      { label: 'CONTROLS', onPick: () => game.menu('controls') },
      { label: 'ABOUT & CREDITS', onPick: () => game.go('about') },
      { label: 'BACK', onPick: () => { titleState.more = false; } },
    ], { y: 86, scale: 2, onCancel: () => { titleState.more = false; } });
    playMusic('title', .5);
  },
  update(dt) {
    const I = game.input, S = titleState; S.t += dt;
    // the attract mode: ten seconds without input
    if (I.anyPressed() || I.clicked() || I.mouse.t !== S.mt || hyp(...I.move()) > .3) { S.idle = 0; S.mt = I.mouse.t; } else S.idle += dt;
    if (S.idle >= 10) { S.idle = 0; startMatch({ mode: 'attract', attract: true, overs: 2, wickets: 3, opp: 'witt', ground: 'green', seed: 4242 }); return; }
    if (S.touchOnly) return;
    (S.more ? titleMore : titleMenu).update(dt);
  },
  draw(r) {
    backdrop(r, titleState.t, false);
    titleLogo(r, 12, 3);
    if (titleState.touchOnly) {
      r.overlay(g => { dark(g, 30, 110, r.W - 60, 56, .7); E.font.text(g, 'Controller or keyboard required', r.W / 2, 122, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, 'Open Settings from the menu button, top right', r.W / 2, 148, INK, { align: 'center', outline: false, shadow: '#000' }); });
      return;
    }
    (titleState.more ? titleMore : titleMenu).draw(r);
    chipsRow(r, r.H - 17, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
  },
};

/* ----- setup (quick match, super over, versus) ----- */
let setupMenu = null;
const setupScene = {
  enter() {
    const m = setupMode, items = [];
    items.push({ label: 'OPPONENT', opts: OPPS.map(o => TEAMS[o].name), v: SETUP.opp, onChange: v => { SETUP.opp = v; } });
    items.push({ label: 'GROUND', opts: GROUND_IDS.map(o => GROUNDS[o].name), v: SETUP.ground, onChange: v => { SETUP.ground = v; } });
    if (m !== 'super') { items.push({ label: 'OVERS', opts: OVERS.map(String), v: SETUP.overs, onChange: v => { SETUP.overs = v; } }); items.push({ label: 'WICKETS', opts: WKTS.map(String), v: SETUP.wickets, onChange: v => { SETUP.wickets = v; } }); }
    if (m !== 'versus') items.push({ label: 'DIFFICULTY', opts: DIFFS.map(d => d.name), v: SETUP.diff, onChange: v => { SETUP.diff = v; } });
    items.push({ label: 'CHAOS', opts: ['Calm', 'Mayhem'], v: SETUP.chaos, onChange: v => { SETUP.chaos = v; } });
    items.push({ label: 'PLAY BALL!', onPick: () => beginSetup() });
    items.push({ label: 'BACK', onPick: () => game.go('title') });
    setupMenu = new BigMenu(items, { y: 46, scale: 2, onCancel: () => game.go('title') });
  },
  update(dt) { setupMenu.update(dt); },
  draw(r) {
    backdrop(r, game.time, false);
    r.overlay(g => { dark(g, 30, 4, r.W - 60, 36, .6); E.font.text(g, setupMode === 'quick' ? 'QUICK MATCH' : setupMode === 'super' ? 'SUPER OVER' : 'VERSUS', r.W / 2, 7, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, setupMode === 'versus' ? 'Player 1 bats first. Player 2 joins on the second pad or the arrow keys.' : 'Left and right change a rule. Confirm starts the match.', r.W / 2, 26, INK, { align: 'center', outline: false, shadow: '#000' }); });
    r.overlay(g => dark(g, 60, 42, r.W - 120, 190, .5));
    setupMenu.draw(r);
  },
};
function dark2(r, y, h) { r.overlay(g => dark(g, 60, y, r.W - 120, h + 40, .45)); }
function beginSetup() {
  const m = setupMode, d = { mode: m, opp: OPPS[SETUP.opp], ground: GROUND_IDS[SETUP.ground], overs: OVERS[SETUP.overs], wickets: WKTS[SETUP.wickets], diff: SETUP.diff, chaos: SETUP.chaos ? 'all' : 'none' };
  if (m === 'super') { d.overs = 1; d.wickets = 2; d.single = true; }
  if (m === 'versus') { d.diff = 1; if (!game.players[1]) { try { game.addPlayer(game.input.padIndex !== null && navigator.getGamepads && [...navigator.getGamepads()].filter(Boolean).length > 1 ? { pad: 1 } : { keys: 'right' }); } catch (e) { game.addPlayer({ keys: 'right' }); } } }
  startMatch(d);
}

/* ----- story map ----- */
let storyMenu = null;
const storyScene = {
  enter() {
    const pr = progress(), items = [];
    CHAPTERS.forEach((c, i) => items.push({ label: (pr.stars[i] ? '★'.repeat(pr.stars[i]) + ' ' : '') + 'CHAPTER ' + c.id + ': ' + c.name.toUpperCase(), disabled: i > pr.chapters, hint: i > pr.chapters ? 'Win the previous chapter first.' : TEAMS[c.opp].name + ' • ' + GROUNDS[c.ground].name + ' • ' + c.overs + ' overs, ' + c.wickets + ' wickets', onPick: () => playChapter(i) }));
    items.push({ label: 'BACK', onPick: () => game.go('title') });
    storyMenu = new BigMenu(items, { y: 70, scale: 1, onCancel: () => game.go('title') });
    playMusic('story', .5);
  },
  update(dt) { storyMenu.update(dt); },
  draw(r) {
    backdrop(r, game.time, false);
    r.overlay(g => { dark(g, 20, 8, r.W - 40, 50, .65); E.font.text(g, 'THE GRAND KERFUFFLE', r.W / 2, 14, GOLD, { scale: 3, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, 'Find the Cup. Beat the villages. Mind the cow.', r.W / 2, 42, INK, { align: 'center', outline: false, shadow: '#000' }); dark(g, 40, 62, r.W - 80, 130, .55); });
    storyMenu.draw(r);
  },
};
function playChapter(i) {
  const c = CHAPTERS[i];
  game.go('cutscene', { lines: c.intro, night: c.ground === 'dome', title: 'CHAPTER ' + c.id + ': ' + c.name, onDone: () => startMatch({ mode: 'story', ch: i, opp: c.opp, ground: c.ground, overs: c.overs, wickets: c.wickets, diff: c.diff, chaos: c.chaos }) });
}

/* ----- cutscenes: portraits, typewriter text, gibberish voices ----- */
const SPEAKERS = {
  VICAR: { vid: 'vicar', rig: () => mkRig('rain', 'umpire', 7), col: '#d8c8ff' },
  YOU: { vid: 'you', rig: () => { const r = mkRig('kerf', 'field', 2); return r; }, col: '#a8ffb8' },
  COACH: { vid: 'coach', rig: () => mkRig('gumb', 'field', 5), col: '#ffd8a0' },
  ANNOUNCER: { vid: 'announcer', rig: () => mkRig('mega', 'field', 3), col: '#ffe060' },
};
const speakerRigs = {};
let CS = null;
const cutScene = {
  enter(d) {
    CS = { lines: d.lines, i: 0, t: 0, onDone: d.onDone, night: d.night, title: d.title, full: false, shown: -1 };
    for (const k in SPEAKERS) speakerRigs[k] = speakerRigs[k] || SPEAKERS[k].rig();
    playMusic('story', .5);
  },
  update(dt) {
    const I = game.input, L = CS.lines[CS.i]; CS.t += dt;
    if (CS.shown !== CS.i) { CS.shown = CS.i; CS.t = 0; speak(L[1], SPEAKERS[L[0]] ? SPEAKERS[L[0]].vid : 'jeremy'); }
    for (const k in speakerRigs) speakerRigs[k].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: k === L[0] && CS.t * 38 < L[1].length ? 'shout' : undefined });
    const done = CS.t * 38 >= L[1].length;
    if (I.pressed('confirm') || I.clicked()) {
      if (!done) CS.t = 999; else { CS.i++; if (CS.i >= CS.lines.length) { const f = CS.onDone; CS = null; f && f(); return; } }
    }
    if (I.pressed('cancel') || I.pressed('start')) { const f = CS.onDone; CS = null; f && f(); }
  },
  draw(r) {
    if (!CS) return;
    const L = CS.lines[CS.i], sp = SPEAKERS[L[0]];
    backdrop(r, game.time, CS.night);
    r.overlay(g => {
      E.font.text(g, CS.title || '', r.W / 2, 8, GOLD, { align: 'center', scale: 2, outline: false, shadow: '#000' });
      const bw = r.W - 40, bx = 20, by = r.H - 92;
      speakerRigs[L[0]].drawPortrait(g, 36, by - 82, 74, { zoom: 2.6, turn: .4, bg: '#1b2840', frame: sp ? sp.col : '#fff' });
      panel(g, bx, by, bw, 74);
      E.font.text(g, L[0], bx + 8, by + 6, sp ? sp.col : GOLD, { scale: 1, outline: false, shadow: '#000' });
      const shown = L[1].slice(0, Math.floor(CS.t * 38)), lines = E.font.wrap(shown, bw - 20);
      lines.forEach((ln, k) => E.font.text(g, ln, bx + 10, by + 20 + k * 11, INK, { outline: false, shadow: '#000' }));
      E.font.text(g, glyph('confirm') + ' CONTINUE   ' + glyph('cancel') + ' SKIP', r.W - 24, r.H - 14, DIM, { align: 'right', outline: false, shadow: '#000' });
    });
  },
};

/* ----- results ----- */
let RS = null, resultMenu = null;
const resultsScene = {
  enter(d) {
    RS = d; RS.t = 0; RS.entering = false;
    if (!cab) cab = new E.Arcade(game, { id: 'kerfuffle', lives: 1, idle: 10 });
    const res = d.result, won = res && res.winner === 0, items = [];
    RS.won = d.single ? true : won;
    if (d.mode === 'story') {
      const c = CHAPTERS[d.ch], pr = progress();
      if (won) { pr.chapters = Math.max(pr.chapters, d.ch + 1); const margin = d.sides[0].score - d.sides[1].score; pr.stars[d.ch] = Math.max(pr.stars[d.ch] || 0, margin > 20 ? 3 : margin > 8 ? 2 : 1); saveProgress(pr); }
      items.push({ label: 'CONTINUE', onPick: () => game.go('cutscene', { lines: won ? c.win : c.lose, night: c.ground === 'dome', title: c.name, onDone: () => game.go(won && d.ch === CHAPTERS.length - 1 ? 'about' : 'story') }) });
      if (!won) items.push({ label: 'TRY AGAIN', onPick: () => playChapter(d.ch) });
    } else if (d.mode === 'super') {
      items.push({ label: 'PLAY AGAIN', onPick: () => startMatch(d.data) });
    } else {
      items.push({ label: 'REMATCH', onPick: () => startMatch(d.data) });
    }
    items.push({ label: 'MAIN MENU', onPick: () => game.go('title') });
    resultMenu = new BigMenu(items, { y: r_y(), scale: 2 });
    playMusic(RS.won ? 'title' : 'story', .4); sfx(RS.won ? 'cheer' : 'groan');
    if (d.mode === 'super' && cab.qualifies(d.sides[0].score, 'super')) { RS.entering = true; cab.enter(d.sides[0].score, 'super', () => { RS.entering = false; }); }
  },
  update(dt) { RS.t += dt; if (cab) cab.update(dt); if (RS.entering) return; resultMenu.update(dt); },
  draw(r) {
    backdrop(r, game.time, false);
    const d = RS, res = d.result;
    r.overlay(g => {
      panel(g, 40, 8, r.W - 80, 112);
      const head = d.single ? 'SUPER OVER COMPLETE' : (res.winner === 0 ? 'VICTORY!' : res.winner === 1 ? 'DEFEAT' : 'A TIE!');
      E.font.text(g, head, r.W / 2, 14, res.winner === 1 ? '#ff8a70' : GOLD, { scale: 3, align: 'center', outline: false, shadow: '#000' });
      if (!d.single) E.font.text(g, res.winner >= 0 ? TEAMS[d.sides[res.winner].team].name + ' win ' + res.margin : 'Honours even, and the tea is cold.', r.W / 2, 42, INK, { align: 'center', outline: false, shadow: '#000' });
      d.sides.forEach((s, i) => {
        if (d.single && i === 1) return;
        const y = 58 + i * 26;
        E.font.text(g, TEAMS[s.team].name, 60, y, INK, { outline: false, shadow: '#000' });
        E.font.text(g, s.score + '/' + s.wkts, r.W - 60, y, GOLD, { scale: 2, align: 'right', outline: false, shadow: '#000' });
        E.font.text(g, oversStr(s.balls) + ' overs • ' + s.fours + ' fours • ' + s.sixes + ' sixes', 60, y + 10, DIM, { outline: false, shadow: '#000' });
      });
    });
    if (!RS.entering) resultMenu.draw(r);
    if (cab) cab.draw(r);
  },
};
function r_y() { return 132; }

/* ----- how to play ----- */
let HP = { page: 0 };
const HOWTO = [
  { title: 'BATTING', body: [['ground', 'Drive along the ground (safe, fast)'], ['loft', 'Loft it for a six (risky: you can be caught)'], ['defend', 'Block: a dead bat, a certain contact'], ['special', 'ON FIRE when the Hype bar is full'], ['run', 'Run between the wickets: hold to keep running, tap to turn back']],
    tip: 'Push the stick or point the mouse where you want the ball to go. Press when the ring turns green.' },
  { title: 'BOWLING', body: [['ground', 'Quickie: fast and straight'], ['loft', 'Banana Swinger: swing the ball with left and right after release'], ['defend', 'Twirly Whirly: slow, and it turns'], ['special', 'THE FIREBALL when Hype is full'], ['cycle', 'Change the field: attack, balanced, defend']],
    tip: 'Place the marker on the pitch, press a delivery, then press again with the needle in the green. Over the red tip is a no ball.' },
  { title: 'FIELDING', body: [['run', 'Dive for the ball'], ['up', 'Move the highlighted fielder']], tip: 'The nearest fielder chases by himself. Catches and run outs are decided by timing, luck and the cow.' },
  { title: 'MAYHEM', body: [], tip: 'Sixes into the PUB WINDOW, TEA URN, CLOCK or BELL score bonus runs. Golden balls count double. Cows stop play. Rain makes the ball skid. Fill Hype to go ON FIRE.' },
];
const howtoScene = {
  enter() { HP.page = 0; },
  update(dt) { const I = game.input; if (I.repeat('right')) HP.page = (HP.page + 1) % HOWTO.length; if (I.repeat('left')) HP.page = (HP.page + HOWTO.length - 1) % HOWTO.length; if (I.pressed('cancel') || I.pressed('confirm') && HP.page === HOWTO.length - 1) game.go('title'); if (I.pressed('confirm') && HP.page < HOWTO.length - 1) HP.page++; const c = I.clicked(); if (c) { if (c[0] > game.screen.W / 2) HP.page = Math.min(HOWTO.length - 1, HP.page + 1); else HP.page = Math.max(0, HP.page - 1); } },
  draw(r) {
    backdrop(r, game.time, false);
    const P = HOWTO[HP.page];
    r.overlay(g => {
      panel(g, 24, 8, r.W - 48, r.H - 36);
      E.font.text(g, P.title, r.W / 2, 16, GOLD, { scale: 3, align: 'center', outline: false, shadow: '#000' });
      P.body.forEach((b, k) => { const y = 52 + k * 20; E.font.text(g, glyph(b[0]), 48, y, '#ffe27a', { scale: 2, outline: false, shadow: '#000' }); E.font.text(g, b[1], 120, y + 4, INK, { outline: false, shadow: '#000' }); });
      const lines = E.font.wrap(P.tip, r.W - 90); lines.forEach((l, k) => E.font.text(g, l, 46, r.H - 62 + k * 10, '#bfe8ff', { outline: false, shadow: '#000' }));
      E.font.text(g, '← → page ' + (HP.page + 1) + '/' + HOWTO.length + '    ' + glyph('cancel') + ' back', r.W / 2, r.H - 20, DIM, { align: 'center', outline: false, shadow: '#000' });
    });
  },
};

/* ----- high scores ----- */
const scoresScene = {
  enter() { if (!cab) cab = new E.Arcade(game, { id: 'kerfuffle', lives: 1, idle: 10 }); },
  update() { const I = game.input; if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) game.go('title'); },
  draw(r) { backdrop(r, game.time, false); r.overlay(g => dark(g, 60, 6, r.W - 120, r.H - 30, .6)); cab.drawTable(r, 'super', 20, 'SUPER OVER - BEST SCORES'); r.overlay(g => E.font.text(g, glyph('cancel') + ' BACK', r.W / 2, r.H - 16, DIM, { align: 'center', outline: false, shadow: '#000' })); },
};

/* ----- about & credits (long pages are flowed onto as many screens as they need) ----- */
let AB = { page: 0, key: '', pages: [] };
function aboutPaginate(W, H) {
  const key = W + 'x' + H; if (AB.key === key) return; AB.key = key; AB.pages = [];
  const avail = H - 54;
  for (const P of ABOUT_PAGES) {
    let cur = [], y = 0;
    const flush = () => { if (cur.length) AB.pages.push({ title: P.title, items: cur }); cur = []; y = 0; };
    for (const it of P.items) {
      const lines = E.font.wrap(it[1], it[0] ? W - 120 : W - 40), h = Math.max(1, lines.length) * 9 + 3;
      if (y + h > avail) flush();
      cur.push([it[0], lines]); y += h;
    }
    flush();
  }
  const cnt = {}, seen = {}; AB.pages.forEach(p => { cnt[p.title] = (cnt[p.title] || 0) + 1; });
  AB.pages.forEach(p => { const t = p.title; if (cnt[t] > 1) { seen[t] = (seen[t] || 0) + 1; p.title = t + ' ' + seen[t] + '/' + cnt[t]; } });
}
const aboutScene = {
  enter() { AB.page = 0; AB.key = ''; },
  update(dt) {
    const I = game.input, n = Math.max(1, AB.pages.length);
    if (I.repeat('right') || I.pressed('confirm')) AB.page = (AB.page + 1) % n;
    if (I.repeat('left')) AB.page = (AB.page + n - 1) % n;
    if (I.pressed('cancel')) game.go('title');
    const c = I.clicked(); if (c) { if (c[1] < 30) game.go('title'); else AB.page = (AB.page + 1) % n; }
  },
  draw(r) {
    backdrop(r, game.time, true); aboutPaginate(r.W, r.H);
    const P = AB.pages[AB.page % AB.pages.length];
    r.overlay(g => {
      panel(g, 10, 6, r.W - 20, r.H - 22);
      E.font.text(g, P.title, r.W / 2, 11, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' });
      let y = 32;
      for (const [h, lines] of P.items) {
        if (h) E.font.text(g, h, 18, y, '#ffe27a', { outline: false, shadow: '#000' });
        lines.forEach((ln, k) => E.font.text(g, ln, h ? 96 : 18, y + k * 9, INK, { outline: false, shadow: '#000' }));
        y += Math.max(1, lines.length) * 9 + 3;
      }
      E.font.text(g, '← → page ' + (AB.page + 1) + '/' + AB.pages.length + '    ' + glyph('cancel') + ' back', r.W / 2, r.H - 14, DIM, { align: 'center', outline: false, shadow: '#000' });
    });
  },
};

/* ===== 70-dev.js ===== */
/* ---------- dev mode: reachable from the pause menu. Live sliders for the balance variables, a reset, and quick test tools ---------- */
const DEV = { open: false, i: 0, rows: [], mt: null, note: '' };
function devBuildRows() {
  const rows = [];
  for (const k in TUNING_DEF) rows.push({ kind: 'slider', key: k });
  const M = () => MS.M;
  rows.push({ kind: 'tool', label: 'RESET ALL SLIDERS TO DEFAULTS', fn: () => { tuningReset(); rebakeFloor(); DEV.note = 'Sliders reset'; } });
  rows.push({ kind: 'tool', label: 'FILL HYPE (BOTH SIDES)', fn: () => { for (const s of M().sides) s.hype = 100; DEV.note = 'Hype full'; } });
  rows.push({ kind: 'tool', label: 'SCORE A SIX NOW', fn: () => { M().ball.hitBy = 0; M().hit = M().hit || { q: 1 }; M().finish('boundary', { runs: 6, bonus: 0 }); } });
  rows.push({ kind: 'tool', label: 'SCORE A FOUR NOW', fn: () => { M().hit = M().hit || { q: 1 }; M().finish('boundary', { runs: 4, bonus: 0 }); } });
  rows.push({ kind: 'tool', label: 'TAKE A WICKET NOW', fn: () => { M().finish('wicket', { how: 'bowled', who: 'Test Dummy' }); } });
  rows.push({ kind: 'tool', label: 'CALL A WIDE', fn: () => { M().finish('wide'); } });
  rows.push({ kind: 'tool', label: 'SPAWN A COW', fn: () => { const m = M(); if (!m.cow) m.cow = { x: CX + 150, y: MY + 90, vx: 0, vy: 0, tx: CX + 120, ty: MY + 150, mood: 0, stopped: 0, moo: 0 }; DEV.note = 'Moo.'; } });
  rows.push({ kind: 'tool', label: 'TOGGLE RAIN', fn: () => { M().wet = !M().wet; M().wetLeft = 3; } });
  rows.push({ kind: 'tool', label: 'NEXT BALL IS GOLDEN', fn: () => { M().goldenNext = true; DEV.note = 'Golden ball next'; } });
  rows.push({ kind: 'tool', label: 'SKIP THE INNINGS', fn: () => { const m = M(); m.sideBat().balls = m.overs * 6 - 1; m.finish('runs', { runs: 0 }); } });
  rows.push({ kind: 'tool', label: 'WIN THE MATCH', fn: () => { const m = M(); m.sides[0].score = m.sides[1].score + 10; m.endMatch('dev'); } });
  rows.push({ kind: 'tool', label: 'LOSE THE MATCH', fn: () => { const m = M(); m.sides[1].score = m.sides[0].score + 10; m.endMatch('dev'); } });
  rows.push({ kind: 'toggle', label: 'GOD MODE (YOU CANNOT BE OUT)', get: () => DEVFLAGS.god, fn: () => { DEVFLAGS.god = !DEVFLAGS.god; } });
  rows.push({ kind: 'toggle', label: 'SLOW MOTION (0.25×)', get: () => DEVFLAGS.slow, fn: () => { DEVFLAGS.slow = !DEVFLAGS.slow; game.timeScale = DEVFLAGS.slow ? .25 : 1; } });
  rows.push({ kind: 'toggle', label: 'SHOW FIELDER RINGS', get: () => DEVFLAGS.debugDraw, fn: () => { DEVFLAGS.debugDraw = !DEVFLAGS.debugDraw; } });
  rows.push({ kind: 'tool', label: 'CLOSE DEV MODE', fn: () => { DEV.open = false; } });
  return rows;
}
function devOpen() { if (!MS || MS.attract || MS.hub) return; DEV.rows = devBuildRows(); DEV.i = 0; DEV.open = true; DEV.note = ''; DEV.mt = game.input.mouse.t; game.input.consumeAll(); }
function devSet(row, v) {
  const d = TUNING_DEF[row.key]; v = clamp(v, d[1], d[2]); const step = (d[2] - d[1]) / 40; v = Math.round(v / step * 1) * step; v = +v.toFixed(4);
  TV[row.key] = clamp(v, d[1], d[2]); if (row.key === 'boundaryScale') rebakeFloor();
}
function devUpdate(dt) {
  if (!DEV.open) return false;
  const I = game.input, n = DEV.rows.length, row = DEV.rows[DEV.i];
  if (I.repeat('up')) DEV.i = (DEV.i + n - 1) % n;
  if (I.repeat('down')) DEV.i = (DEV.i + 1) % n;
  if (DEV._hit && I.mouse.t !== DEV.mt) { DEV.mt = I.mouse.t; const p = I.pointer(); if (p) for (let k = 0; k < DEV._hit.length; k++) { const h = DEV._hit[k]; if (p[1] >= h.y0 && p[1] <= h.y1 && p[0] < h.x1) DEV.i = h.i; } }
  const R = DEV.rows[DEV.i];
  if (R.kind === 'slider') {
    const d = TUNING_DEF[R.key], step = (d[2] - d[1]) / 40, dir = (I.repeat('right', .3, .05) ? 1 : 0) - (I.repeat('left', .3, .05) ? 1 : 0);
    if (dir) devSet(R, TV[R.key] + dir * step);
    const c = I.clicked(); if (c && DEV._hit) for (const h of DEV._hit) if (h.i === DEV.i && c[1] >= h.y0 && c[1] <= h.y1 && c[0] >= h.bx0 && c[0] <= h.bx1) devSet(R, d[1] + (c[0] - h.bx0) / (h.bx1 - h.bx0) * (d[2] - d[1]));
    if (I.pressed('confirm')) { TV[R.key] = d[0]; if (R.key === 'boundaryScale') rebakeFloor(); DEV.note = d[3] + ' reset'; }
  } else {
    const c = I.clicked(); let hitClick = false;
    if (c && DEV._hit) for (const h of DEV._hit) if (h.i === DEV.i && c[1] >= h.y0 && c[1] <= h.y1 && c[0] < h.x1) hitClick = true;
    if (I.pressed('confirm') || hitClick) { R.fn(); sfx('confirm'); }
  }
  if (I.pressed('cancel') || I.pressed('pause')) { DEV.open = false; sfx('cancel'); }
  I.consumeAll();
  return true;
}
function devDraw(r) {
  if (!DEV.open) return;
  const w = 268, vis = Math.floor((r.H - 52) / 12), top = clamp(DEV.i - Math.floor(vis / 2), 0, Math.max(0, DEV.rows.length - vis));
  DEV._hit = [];
  r.overlay(g => {
    panel(g, 4, 4, w, r.H - 8, { alpha: .93 });
    E.font.text(g, 'DEV MODE', 12, 8, '#ff9a30', { scale: 2, outline: false, shadow: '#000' });
    E.font.text(g, glyph('cancel') + ' close • ← → adjust • ' + glyph('confirm') + ' reset/run', 12, 26, DIM, { outline: false });
    for (let k = 0; k < vis; k++) {
      const i = top + k; if (i >= DEV.rows.length) break; const R = DEV.rows[i], y = 38 + k * 12, sel = i === DEV.i;
      if (sel) px.rect(g, 8, y - 1, w - 8, 11, '#3a4a70');
      let label = R.label, val = '';
      if (R.kind === 'slider') { const d = TUNING_DEF[R.key]; label = d[3]; val = (+TV[R.key]).toFixed(d[2] <= 3 ? 2 : 0); }
      if (R.kind === 'toggle') val = R.get() ? 'ON' : 'off';
      E.font.text(g, label, 12, y, sel ? GOLD : INK, { outline: false, shadow: '#000' });
      let bx0 = 0, bx1 = 0;
      if (R.kind === 'slider') {
        const d = TUNING_DEF[R.key]; bx0 = 150; bx1 = 232; const f = (TV[R.key] - d[1]) / (d[2] - d[1]);
        px.rect(g, bx0, y + 3, bx1 - bx0, 4, '#10141c'); px.rect(g, bx0, y + 3, Math.round((bx1 - bx0) * clamp(f, 0, 1)), 4, sel ? '#ffd860' : '#58a0d8'); px.rect(g, bx0 + Math.round((bx1 - bx0) * clamp(f, 0, 1)) - 1, y + 1, 3, 8, '#fff');
        E.font.text(g, val, 236, y, TV[R.key] !== d[0] ? '#ffb060' : DIM, { outline: false, shadow: '#000' });
      } else if (val) E.font.text(g, val, 236, y, val === 'ON' ? '#58ff70' : DIM, { outline: false });
      DEV._hit.push({ i, y0: y - 1, y1: y + 10, x1: w, bx0, bx1 });
    }
    if (DEV.note) E.font.text(g, DEV.note, 12, r.H - 14, '#7aff9a', { outline: false });
  });
}

/* ===== 75-hub.js ===== */
/* ---------- AI Hub session (parallel mode): a seeded Super Over, scores reported to the hub ---------- */
const HUBON = () => typeof AIHub !== 'undefined' && AIHub && AIHub.active;
function hubOverlay(r) {
  if (!HUBON()) return;
  const t = AIHub.time(), done = MS && MS.hubDone;
  r.overlay(g => {
    if (t < 0) {
      const txt = isFinite(t) ? 'PLAY BALL IN ' + Math.ceil(-t / 1000) : 'WAITING FOR THE OTHER PLAYERS...';
      dark(g, 0, r.H * .4, r.W, 40, .7); E.font.text(g, txt, r.W / 2, r.H * .4 + 10, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' });
    } else if (done) {
      dark(g, 0, r.H * .4, r.W, 52, .75); E.font.text(g, 'ROUND COMPLETE', r.W / 2, r.H * .4 + 8, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, MS.M.sides[0].score + ' runs - waiting for the others', r.W / 2, r.H * .4 + 30, INK, { align: 'center', outline: false, shadow: '#000' });
    }
  });
}
const hubScene = {
  enter() {
    AIHub.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
      if (!info) { game.go('title'); return; }
      startMatch({ mode: 'super', hub: true, single: true, overs: 1, wickets: 2, opp: 'witt', ground: 'green', seed: info.seed || 1 });
      AIHub.ready();
      AIHub.on('time-up', () => { if (MS && MS.hub && !MS.hubDone) { MS.hubDone = true; AIHub.result({ score: MS.M.sides[0].score }); } });
      AIHub.on('end', () => { if (MS) { MS.hubDone = true; MS.attract = false; } game.input.clear(); });
    });
  },
  update() {}, draw(r) { r.sky(['#0a1a10', '#1c4a28']); r.overlay(g => E.font.text(g, 'CRICKET KERFUFFLE', r.W / 2, r.H / 2 - 10, GOLD, { scale: 2, align: 'center', outline: false })); },
};

/* ===== 99-start.js ===== */
/* ---------- start: the game, its input map, its scenes, boot steps and a handle for tests ---------- */
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  ground: ['KeyJ', 'Mouse0', 'Pad0'], loft: ['KeyK', 'Mouse2', 'Pad2'], defend: ['KeyL', 'Pad1'], special: ['KeyE', 'Pad3'],
  run: ['Space', 'Pad5', 'Pad7'], cycle: ['KeyQ', 'ShiftLeft', 'Pad4'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'],
};
const hubMode = HUBON();
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 55, .75, 1);   // the TV camera behind the bowler
game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', views: ['broadcast'], input: KEYS, id: 'cricket-kerfuffle',
  menu: {
    items: [['Dev mode', () => { game.resume(); devOpen(); }]],
    controls: { ground: 'Drive • Quickie', loft: 'Loft • Swinger', defend: 'Block • Spinner', special: 'ON FIRE • Fireball', run: 'Run • Dive', cycle: 'Change the field', confirm: 'Confirm', cancel: 'Back', start: false, pause: 'Pause' },
    quit: hubMode ? false : 'title',
  },
});
defineSfx();
const SCENES = { title: titleScene, setup: setupScene, story: storyScene, cutscene: cutScene, results: resultsScene, howto: howtoScene, scores: scoresScene, about: aboutScene, match: matchScene, hubwait: hubScene };
game.debug = {
  snapshot: () => ({ scene: game.sceneName, errors: game.errors.length, m: MS && MS.M ? MS.M.snapshot() : null, dev: DEV.open }),
  match: () => MS && MS.M, session: () => MS, tv: TV, startMatch, T, DEV, devOpen, titleState, setupMode: () => setupMode, setMode: m => { setupMode = m; }, progress, CHAPTERS, cab: () => cab, scenes: SCENES, COMM, say,
};
game.start({
  scenes: SCENES, scene: hubMode ? 'hubwait' : 'title',
  boot: { title: TITLE, version: '1.0', steps: [
    ['Mowing the outfield', () => { buildMap('green'); }],
    ['Sharpening the pencils', () => { buildRigs('kerf', 'witt'); }],
    ['Warming up the commentators', () => { for (const k in SPEAKERS) speakerRigs[k] = SPEAKERS[k].rig(); }],
  ], messages: ['Brewing the tea', 'Locating the Cup', 'Persuading the cow'] },
});

})();
