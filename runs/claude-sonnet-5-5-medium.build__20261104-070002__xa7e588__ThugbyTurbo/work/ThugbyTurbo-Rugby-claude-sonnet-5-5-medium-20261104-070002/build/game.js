(() => {
'use strict';
const E = My3D2dge;
/* ==== 00-core.js ==== */
/* THUGBY TURBO — core.
 * THE LOOP: run at their line, pass it backwards, smash through or step round them, ground it over the line and kick
 * the conversion, while seven lunatics in the other colours try to flatten you, and the referee looks the other way. */
const TT = { cfg: { present: true }, version: '1.0.0', S: null };
window.__thugby = { TT };
const { clamp, lerp } = E;
const TAU = Math.PI * 2;
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

// ---- pitch geometry (world units; 16 = one tile; "metres" = units / 10.24)
const G = { X0: 160, X1: 1184, CX: 672, Y0: 96, Y1: 672, CY: 384, ING: 96, POST: 29, CROSS: 34, UPR: 120, MAPW: 90, MAPH: 50 };

// ---- TUNE: the balance registry. Simulation code reads TUNE.v.<key>. Dev mode edits them live.
const TUNE = {
  defs: [], v: {}, base: {}, layers: {},
  add(key, label, group, value, min, max, step, unit = '') { this.defs.push({ key, label, group, value, min, max, step, unit }); this.v[key] = value; this.base[key] = value; },
  set(key, val) { const d = this.defs.find(x => x.key === key); if (!d) return; this.base[key] = this.v[key] = clamp(val, d.min, d.max); this.applyLayers(); },
  reset(key) { if (key) { const d = this.defs.find(x => x.key === key); if (d) this.base[key] = this.v[key] = d.value; } else for (const d of this.defs) this.base[key = d.key] = this.v[d.key] = d.value; this.applyLayers(); },
  layer(name, o) { this.layers[name] = o; this.applyLayers(); },
  applyLayers() { for (const k in this.base) this.v[k] = this.base[k]; for (const n in this.layers) { const o = this.layers[n]; for (const k in o) if (k in this.v) this.v[k] = o[k](this.base[k]); } }
};
[
  ['gameSpeed', 'Game speed', 'Match', 1, .4, 1.6, .05, 'x'], ['halfLength', 'Half length', 'Match', 120, 30, 300, 10, 's'],
  ['runSpeed', 'Run speed', 'Running', 92, 60, 140, 1, 'u/s'], ['accel', 'Acceleration', 'Running', 620, 200, 1400, 10, ''], ['turboMult', 'Turbo boost', 'Running', 1.45, 1.1, 2, .01, 'x'],
  ['turboTank', 'Turbo tank', 'Running', 3, 1, 8, .1, 's'], ['sidestepPower', 'Sidestep power', 'Running', 140, 60, 260, 5, 'u/s'], ['sidestepEvade', 'Sidestep evade', 'Running', .25, .1, .6, .01, 's'],
  ['fendBeat', 'Fend strength', 'Contact', .7, .1, 1, .01, ''], ['tackleBase', 'Tackle chance', 'Contact', .78, .3, 1, .01, ''], ['tackleRange', 'Tackle reach', 'Contact', 14, 8, 30, 1, 'u'],
  ['bigHitCharge', 'Big hit charge', 'Contact', .7, .3, 1.5, .05, 's'], ['bigHitLaunch', 'Big hit launch', 'Contact', 45, 15, 120, 1, 'u'], ['spillChance', 'Ball spill', 'Contact', .5, 0, 1, .05, ''],
  ['passSpeed', 'Pass speed', 'Ball', 230, 140, 400, 5, 'u/s'], ['catchBase', 'Catch chance', 'Ball', .93, .5, 1, .01, ''], ['kickMax', 'Kick distance', 'Ball', 520, 250, 900, 10, 'u'],
  ['bounceChaos', 'Oval bounce chaos', 'Ball', 1, 0, 2, .05, 'x'], ['windMult', 'Wind effect', 'Ball', 1, 0, 3, .1, 'x'],
  ['hypeMult', 'Hype gain', 'Arcade', 1, 0, 3, .1, 'x'], ['superTime', 'Super length', 'Arcade', 4, 1, 10, .5, 's'], ['powerupEvery', 'Power-up every', 'Arcade', 30, 8, 90, 2, 's'], ['hazardEvery', 'Hazard rate', 'Arcade', 1, 0, 3, .1, 'x'],
  ['refRange', 'Referee eyesight', 'Laws', 260, 60, 600, 10, 'u'], ['refFov', 'Referee field of view', 'Laws', 1.4, .4, 3, .05, 'rad'], ['sinBin', 'Sin bin time', 'Laws', 30, 5, 60, 1, 's'],
  ['aiReaction', 'CPU reaction', 'CPU', .25, .05, .8, .01, 's'], ['cpuMash', 'CPU ruck mash', 'CPU', 9, 2, 20, .5, '/s'], ['aiAggression', 'CPU aggression', 'CPU', 1, .3, 2, .05, 'x']
].forEach(a => TUNE.add(...a));
TT.TUNE = TUNE; TT.G = G;

// ---- events
const bus = { fns: {}, on(n, f) { (this.fns[n] = this.fns[n] || []).push(f); }, emit(n, d) { if (TT.S) { const ev = TT.S.events; ev.push({ n, t: +TT.S.t.toFixed(2), d }); if (ev.length > 80) ev.shift(); TT.S.counts[n] = (TT.S.counts[n] || 0) + 1; } for (const f of this.fns[n] || []) try { f(d, n); } catch (e) { TT.game && TT.game.fail('event ' + n, e); } for (const f of this.fns['*'] || []) try { f(d, n); } catch (e) { /* ignore */ } } };
TT.bus = bus;

// ---- helpers
const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
const U = (rng, a, b) => a + (b - a) * rng();
TT.settings = { glyphs: 'playstation', difficulty: 'Pro', autoSwitch: 'Assisted', passAssist: true, refView: true, replays: 'Big moments', suddenDeath: true, holdTurbo: true };

/* ==== 10-data.js ==== */
/* THUGBY TURBO — data: teams, venues, cup, drills, commentary, credits. Designers: edit here. */
const ROLES = ['PROP', 'HOOKER', 'PROP', 'SCRUM-HALF', 'FLY-HALF', 'CENTRE', 'WING'];
// stats 1-10: SPD POW HND KCK TKL per role (base), teams add a modifier
const ROLE_STATS = [[4, 9, 5, 3, 8], [5, 8, 7, 4, 7], [4, 9, 5, 3, 8], [7, 5, 8, 6, 5], [7, 5, 8, 9, 5], [8, 6, 7, 5, 6], [10, 4, 7, 5, 4]];
const TEAMS = {
  hawks: { id: 'hawks', name: 'GUTTER HAWKS', short: 'HAWKS', c1: '#f2c230', c2: '#1d1b26', skin: ['#f0c8a0', '#c68642', '#8d5524'], style: { aggression: 1, cheapShots: .1 }, crest: 'H', mod: 0, names: ['Tubby Doyle', 'Kez Bruiser', 'Mad Dog Maisie', 'Pip Squeak', 'Deano Fly', 'Big Ange', 'Zippy Okafor'] },
  mudlarks: { id: 'mudlarks', name: 'MUDDINGTON MUDLARKS', short: 'MUDLARKS', c1: '#4a7a3a', c2: '#6b4a2a', skin: ['#e8b890', '#a8703a'], style: { aggression: .8, cheapShots: .15 }, crest: 'M', mod: -1, names: ['Clod Hopper', 'Sod Bailey', 'Dirk Mudge', 'Wet Wendy', 'Slop Joe', 'Puddle Pete', 'Splash Nolan'], captain: 'CLOD HOPPER' },
  dockers: { id: 'dockers', name: 'PORT GRUMBLE DOCKERS', short: 'DOCKERS', c1: '#e8782a', c2: '#1a2a4a', skin: ['#d8a070', '#7a4a2a'], style: { aggression: 1.1, cheapShots: .2 }, crest: 'D', mod: 0, names: ['Barnacle Bob', 'Crane Kev', 'Anchor Annie', 'Rope Rita', 'Salty Sam', 'Winch Wally', 'Gull Gordon'], captain: 'BARNACLE BOB' },
  flames: { id: 'flames', name: 'FURNACE FLAMES', short: 'FLAMES', c1: '#d8302a', c2: '#18181c', skin: ['#f0c8a0', '#b87a4a', '#8d5524'], style: { aggression: 1.3, cheapShots: .3 }, crest: 'F', mod: 1, names: ['Smokey Sal', 'Ember Ed', 'Ash Ramirez', 'Spark Sparrow', 'Blaze Bianca', 'Cinder Cyrus', 'Flare Fiona'], captain: 'SMOKEY SAL' },
  meteors: { id: 'meteors', name: 'MEGADOME METEORS', short: 'METEORS', c1: '#7a3ad8', c2: '#f4f0ff', skin: ['#e8c8b0', '#a06a3a', '#6a4020'], style: { aggression: 1.4, cheapShots: .35 }, crest: 'X', mod: 2, names: ['BIG UNIT', 'Crater Cass', 'Comet Kyle', 'Nova Nadia', 'Orbit Oz', 'Quasar Quinn', 'Zenith Zed'], captain: 'BIG UNIT', boss: true },
  rovers: { id: 'rovers', name: 'ROVING ROOSTERS', short: 'ROOSTERS', c1: '#2ab0a8', c2: '#f4f0ff', skin: ['#f0c8a0', '#c68642'], style: { aggression: .9, cheapShots: .1 }, crest: 'R', mod: 0, names: ['Cluck Norris', 'Henry Hen', 'Pecker Poole', 'Beaky Bea', 'Egg Edwards', 'Talon Tess', 'Feather Finn'] },
  titans: { id: 'titans', name: 'TIDY TITANS', short: 'TITANS', c1: '#3a86e8', c2: '#f0f0f0', skin: ['#f0c8a0', '#8d5524'], style: { aggression: 1, cheapShots: .1 }, crest: 'T', mod: 0, names: ['Hugo Hammer', 'Tilly Tank', 'Gus Granite', 'Nell Nimble', 'Ozzy Oak', 'Mo Mountain', 'Ivy Iron'] }
};
const VENUES = {
  muddington: { id: 'muddington', name: 'MUDDINGTON PARK', weather: { kind: 'rain', amount: .7, wind: .1 }, ambient: .62, grass: ['#3d7a34', '#46853c'], hazard: 'mud', blurb: 'Rain, mud and meat pies.' },
  docks: { id: 'docks', name: 'PORT GRUMBLE DOCKS', weather: { kind: 'leaves', amount: .3, wind: .6 }, ambient: .8, grass: ['#4a8a3c', '#549646'], hazard: 'wind', blurb: 'Gusty. Mind the chicken.' },
  furnace: { id: 'furnace', name: 'THE FURNACE', weather: null, ambient: .42, grass: ['#2f6a30', '#387638'], hazard: 'flames', blurb: 'Night match. Fire jets on the touchlines.' },
  megadome: { id: 'megadome', name: 'THE MEGADOME', weather: { kind: 'rain', amount: .9, wind: .3, lightning: .3 }, ambient: .5, grass: ['#356f40', '#3d7b48'], hazard: 'lightning', blurb: 'Thunderstorm. Stand clear of the sky.' }
};
// the MEGA CUP: training, then four matches
const CUP = [
  { id: 'r1', opp: 'mudlarks', venue: 'muddington', title: 'ROUND 1', hint: 'Mud slows everyone. Win the rucks.', pre: [['BARRY', 'Good evening, rugby fans, and welcome to CHANNEL THUD!'], ['ROS', 'It is raining. It is always raining. Please do not shout.'], ['COACH', 'Listen up, Hawks. Pass backwards, run forwards and if in doubt, hit something.']], post: ['That is how you do it. Next stop: the docks.'] },
  { id: 'r2', opp: 'dockers', venue: 'docks', title: 'SEMI-QUALIFIER', hint: 'The wind pushes kicks. A chicken is loose.', pre: [['BARRY', 'Port Grumble! Smells of fish, sounds like thunder!'], ['ROS', 'There is a giant chicken on the pitch. This is normal here.'], ['COACH', 'Rule one: never trust a chicken. Rule two: see rule one.']], post: ['Chicken or no chicken, that was a win.'] },
  { id: 'r3', opp: 'flames', venue: 'furnace', title: 'SEMI-FINAL', hint: 'Flame jets burn. Watch the glowing grates.', pre: [['BARRY', 'The Furnace! Where jerseys go to get toasted!'], ['ROS', 'Health and safety left in 1994.'], ['COACH', 'Stay off the grates. Anyone who catches fire runs it off.']], post: ['Hot stuff, Hawks. One more.'] },
  { id: 'r4', opp: 'meteors', venue: 'megadome', title: 'THE MEGA FINAL', hint: 'BIG UNIT needs two tacklers at once.', pre: [['BARRY', 'The MEGA FINAL! Lightning! Thunder! Pure nonsense!'], ['ROS', 'Their number one has his own postcode.'], ['COACH', 'BIG UNIT takes two tacklers inside a second. Get a mate. Or hit him with a Hurricane.']], post: ['You did it. The Mega Cup is yours. Pies for everyone.'] }
];
const DRILLS = [
  { id: 'run', name: 'RUN & TURBO', text: 'Run the length of the pitch with the ball. Hold TURBO.', goal: 'Score a try', cond: m => m.counts.try > 0, setup: 'solo' },
  { id: 'pass', name: 'PASS IT BACK', text: 'Passes only go backwards. Throw 3 passes to teammates.', goal: 'Make 3 passes', cond: m => (m.counts.pass | 0) >= 3, setup: 'passing' },
  { id: 'evade', name: 'STEP, SPIN, FEND', text: 'Beat the dummies: sidestep, spin (tap twice) and fend.', goal: 'Beat 3 tacklers', cond: m => ((m.counts.sidestep | 0) + (m.counts.spin | 0) + (m.counts.fend | 0)) >= 3, setup: 'evade' },
  { id: 'tackle', name: 'TACKLE & BIG HIT', text: 'Tap to tackle. Hold, release in range for a BIG HIT.', goal: 'Land a BIG HIT', cond: m => (m.counts.bigHit | 0) + (m.counts.monsterHit | 0) > 0, setup: 'tackle' },
  { id: 'ruck', name: 'THE RUCK', text: 'After a tackle, mash the tackle button to win the ball.', goal: 'Win a ruck', cond: m => (m.counts.ruckWon | 0) > 0, setup: 'ruck' },
  { id: 'kick', name: 'BOOT IT', text: 'Tap kick for a grubber, hold for a punt. Kick it into touch.', goal: 'Kick to touch', cond: m => (m.counts.touch | 0) > 0, setup: 'kick' },
  { id: 'scrum', name: 'SCRUM DOWN', text: 'Time SET, then alternate the two pass buttons to shove.', goal: 'Win a scrum', cond: m => (m.counts.scrumWon | 0) > 0, setup: 'scrum' },
  { id: 'lineout', name: 'LINEOUT', text: 'Stop the needle in the green. Pick a pod. Into orbit!', goal: 'Win a lineout', cond: m => (m.counts.lineoutWon | 0) > 0, setup: 'lineout' },
  { id: 'goal', name: 'GOAL KICKING', text: 'Aim, then hold and release the kick button to land a conversion.', goal: 'Kick a conversion', cond: m => (m.counts.conversion | 0) > 0, setup: 'goal' }
];
const POWERUPS = {
  pie: { name: 'MEAT PIE', color: '#d89a4a', text: 'Unlimited turbo!' }, iron: { name: 'IRON SHOULDERS', color: '#9aa4b8', text: 'Every hit is a monster hit!' },
  boot: { name: 'MEGA BOOT', color: '#f4d03a', text: 'Next kick travels miles!' }, grease: { name: 'GREASE JERSEY', color: '#d86ad8', text: 'Tackles slide right off!' }, horn: { name: 'AIR HORN', color: '#e8503a', text: '+40 HYPE!' }
};
// Commentary: Barry Bellows (breathless) and Ros Rucker (bone dry)
const LINES = {
  kickoff: [['BARRY', 'And we are underway!'], ['ROS', 'Sit down, everyone.']], try: [['BARRY', 'TRYYYY! Oh, that is MAGNIFICENT!'], ['ROS', 'It was a try.']], tryAgainst: [['BARRY', 'They have scored. I feel nothing. Lies.'], ['ROS', 'Defence is also allowed.']],
  bigHit: [['BARRY', 'OH! HE\'S GONE INTO ORBIT!'], ['ROS', 'That will leave a mark.']], monsterHit: [['BARRY', 'MONSTER HIT! Somebody call his mum!'], ['ROS', 'Somebody call a doctor.']], sidestep: [['BARRY', 'He\'s danced right past him!']], lineBreak: [['BARRY', 'LINE BREAK! Nothing but grass!']],
  knockOn: [['ROS', 'Knock on. As ever.']], forwardPass: [['ROS', 'Forward. Backwards is the whole idea.']], refDown: [['BARRY', 'THE REF IS DOWN! ANYTHING GOES!']], cheapMissed: [['BARRY', 'The ref has missed that completely!']], card: [['BARRY', 'Yellow card! Off to the bin!'], ['ROS', 'It is an actual bin.']],
  onFire: [['BARRY', 'HE\'S ON FIRE!']], conversion: [['BARRY', 'Through the middle! Two more!']], miss: [['ROS', 'Wide. Very wide.']], scrum: [['BARRY', 'Down they go for the scrum!']], lineout: [['ROS', 'Lineout. Tall people required.']], hooter: [['BARRY', 'The hooter! Last play!']], replay: [['BARRY', 'Let\'s see that again!']],
  hazardMud: [['ROS', 'Mud. Delightful.']], chicken: [['BARRY', 'CAPTAIN CLUCKY IS ON THE PITCH!']], flame: [['BARRY', 'Somebody\'s been toasted!']], lightning: [['BARRY', 'LIGHTNING! Stand clear!']], super: [['BARRY', 'HE\'S GOT THE SUPER! LOOK OUT!']]
};
const CREDITS = {
  title: 'THUGBY TURBO',
  lines: ['A game by Claude Sonnet 5.5 (Anthropic), medium effort', 'Plan by Claude Opus 5.5 (max effort)', 'Engine: my-3D2dge v0.85.2', 'Online: AI Hub Session Protocol v1, client 1.4.0', 'Title drawn by a real RNG: secrets.randbelow(50) = 16', 'All music, effects and voices are synthesised in code', 'No chickens were harmed. Several were bowled over.']
};
TT.data = { ROLES, ROLE_STATS, TEAMS, VENUES, CUP, DRILLS, POWERUPS, LINES, CREDITS };

/* ==== 11-about.js ==== */
/* THUGBY TURBO - About & Credits text. GENERATED by tools/gen-about.mjs from docs/answers.mjs */
TT.about = [
 [
  "SOURCE INFORMATION",
  [
   "DATE: 2026-11-04 07:00:02",
   "SOURCE: rugby (over the top arcade style)",
   "PLAN: PLAN.md (Thugby Turbo, written by claude-opus-5-5 at max effort)",
   "GENRE: Arcade sports: rugby sevens, played for laughs (NBA Jam style turbo, big hits, power-ups)",
   "PERSPECTIVE: TV broadcast camera, 40 degree pitch panning with the ball; switchable to a 55 degree three-quarter and a top-down view",
   "TECH: my-3D2dge v0.85.2 (Canvas 2D, Web Audio), AI Hub Session client 1.4.0, plain JavaScript in one IIFE, no other libraries, engine unmodified",
   "ARTDIRECTION: The engine's native HD pixel-art skeleton characters (E.Humanoid) dressed in team kits, procedural striped pitch with mud, stands with animated crowd, goalposts, sin-bin dumpster, venue weather and lights",
   "ANIMATION: The engine's Humanoid rig and E.MOVES system, with new moves added for rugby: tackle, big hit, pass, kick, fend, spin and sidestep, plus poses for ruck, scrum, lineout lift, celebration and launched bodies",
   "AUDIO: All music, effects and voices are written in code with the engine's chip synth: layered match music, whistles, hooter, crowd bed, hits, and Animalese-style babble voices for commentators, coach and referee",
   "ONLINE: AI Hub Session Protocol v1, parallel mode (each player plays their own match from the same seed, the hub ranks by points margin); couch play for 1 to 2 players",
   "TESTING: Headless simulation tests (vm, fixed steps), scripted AI-vs-AI matches in all four venues, a scripted browser playthrough of the whole game, headless Chromium checks and the AI Hub harness; no subagents",
   "RESEARCH: PLAN.md, the engine README and API card plus engine source for Input.halfKeys, TileMap, Settings and audio, the AI Hub README, retrofit and session client; no web search",
   "ENVIRONMENT: Claude Code CLI (headless); Linux; browser unknown",
   "MODEL: Anthropic, claude-sonnet-5-5, reasoning effort medium",
   "USAGE: unknown"
  ]
 ],
 [
  "TESTING FEEDBACK",
  [
   "How many issues did testing catch? About eight: a stale phase handler running after a mid-step phase change (crash), CPU set pieces waiting for scripted seats (attract stall), the kick-off handed to the wrong player, invisible goalposts, missing font glyphs for arrows and ticks, an over-frequent interception and fumble rate, a lost-keypress test bug, and a test helper that left the ball in the kick-off.",
   "How many were critical? Two: the mid-step phase change crash (a try scored during the kick-off phase ran the kick-off handler against a try state) and the attract-mode stall where auto-piloted seats were treated as humans.",
   "Most helpful test? Running whole AI-vs-AI matches headless in all four venues with a watchdog counter that fails on any stuck phase, together with a table of direct scenario checks (tackle to ruck, monster hit, try to conversion to kick-off, scrum, lineout, penalty, cards, hazards).",
   "Least helpful test? The AI Hub harness runs: they confirmed protocol compliance but passed first time and caught nothing, and the static screenshot sweeps only caught look problems a human would also see."
  ]
 ],
 [
  "ENGINE FEEDBACK",
  [
   "Liked most: Characters that are data-driven 3D skeletons: a new animation is one E.MOVES entry, and the pause, settings, controls and rebinding screens come free. The fixed-step game.advance made headless testing trivial.",
   "Stuck or guessed wrong: Yes: the pixel font has no arrow, tick or controller glyphs (so I drew badges with pixels), px.line with a width did not show for goalposts (rects did), Input.halfKeys hands out buttons in preset order, and the pointer coordinate space took a guess.",
   "Built myself: The entire match simulation: phases, laws, set pieces, referee sight, ball physics with the oval bounce, CPU brains, plus a 10-foot menu system and glyph badges.",
   "Hardest part: Fitting a rules state machine with many mini-games onto per-tick input edges and depth-sorted drawing: edge presses had to be turned into intents, and every phase handler had to survive the phase changing mid-step.",
   "Engine changes: None: the engine is unmodified v0.85.2; the game adds its own view (broadcast) and E.MOVES entries from outside.",
   "One change: Add controller button and arrow glyphs to the font, and a first-class team-sports phase kit (restarts, set pieces, a referee) so a rules-heavy sport is a data problem."
  ]
 ],
 [
  "PROMPT FEEDBACK",
  [
   "Liked most: The numbered plan with every rule and number written down: it turned design arguments into lookups, and the one-command, failures-only testing instruction was clear.",
   "Confusing: The plan names different files and effort (opus max, 20261103) from the task (sonnet medium, 20261104) so I followed TASK.md; the plan also assumes a shared-world hub session while the task only says to follow the hub library; and the plan is sized well beyond a medium-effort build.",
   "Hardest: Scope: fitting a plan for a max-effort build into one medium session, deciding which parts to simplify (mini-games for set pieces, parallel hub mode, no engine patches) while keeping every listed feature present.",
   "Would change: Tier the plan into must, should and could; give the file-name convention once; say which hub mode is expected; and say where usage numbers come from."
  ]
 ],
 [
  "CREDITS",
  [
   "Title drawn with a real RNG: secrets.randbelow(50) = 16 (\"Thugby Turbo\")",
   "Commentary: Barry Bellows and Ros Rucker, live on CHANNEL THUD",
   "Referee: Nigel Blewitt (short-sighted)",
   "Mascot: Captain Clucky"
  ]
 ]
];

/* ==== 20-sim.js ==== */
/* THUGBY TURBO — match simulation: players, ball, contact, laws. Reads intents, writes state S. No drawing here. */
let S = null;
const N = 7;
const teamDef = t => S.teams[t];
const opp = t => 1 - t;
const atkX = t => S.dir[t] > 0 ? G.X1 : G.X0;       // the try line a team attacks
const ownX = t => S.dir[t] > 0 ? G.X0 : G.X1;
const inGoalOf = p => (p.x - atkX(p.team)) * S.dir[p.team] >= 0;
const alive = p => !p.off && p.st !== 'binned' && p.st !== 'sentOff';
const standing = p => alive(p) && !['down', 'ground', 'getUp', 'air', 'stun', 'fall'].includes(p.st);
const teamPlayers = t => S.players.filter(p => p.team === t && alive(p));
const emptyIntent = () => ({ mx: 0, my: 0, turbo: false, x: false, sq: false, ci: false, tri: false, l1: false, r1: false, hx: false, hsq: false, hci: false, hl1: false, hr1: false, rx: false, rci: false, rl1: false, rr1: false, aim: null, click: -1 });
TT.emptyIntent = emptyIntent;
let say = (who, text, t = 2.4) => { if (S) S.radio = { who, text, t }; };
const banner = (text, color = '#ffffff', t = 1.6) => { S.banners.push({ text, color, t, t0: t }); if (S.banners.length > 3) S.banners.shift(); };
const line = key => { const l = LINES[key]; if (l && S.t - (S.lastLine || -9) > 3) { const x = pick(S.fx, l); say(x[0], x[1]); S.lastLine = S.t; } };

function newMatch(cfg) {
  const rng = E.rng(cfg.seed || 1234);
  const H = TEAMS[cfg.home], A = TEAMS[cfg.away];
  S = TT.S = {
    cfg, t: 0, rng, fx: E.rng((cfg.seed || 1) + 99), phase: 'intro', phaseT: 0, sub: '', half: 1, clock: 0, hooter: false, hooterT: 0, sudden: false, over: false,
    score: [0, 0], hype: [0, 0], dir: [1, -1], teams: [H, A], venue: VENUES[cfg.venue], poss: -1, lastTeam: 0, lastTouch: -1,
    ball: { x: G.CX, y: G.CY, z: 0, vx: 0, vy: 0, vz: 0, st: 'dead', holder: null, rot: 0, rotV: 0, spin: 0, lastKicker: -1 },
    players: [], ref: null, powerups: [], events: [], counts: {}, banners: [], radio: null, sp: null, adv: null, cards: [], fire: [0, 0], fireP: [-1, -1], fireT: [0, 0],
    seats: cfg.seats || [], stats: [0, 1].map(() => ({ poss: 0, terr: 0, tries: 0, convs: 0, convTries: 0, tackles: 0, missed: 0, bigHits: 0, monster: 0, metres: 0, breaks: 0, turnovers: 0, offloads: 0, cards: 0, pens: 0 })),
    tries: [], potm: null, useIt: 0, ruckMark: null, wind: 0, windT: 8, windDir: 1, mud: [], jets: [], strike: null, strikeT: 25, chicken: null, chickT: 55, puT: 20, refDownT: 0,
    dropT: 0, shake: 0, flash: null, kickInfo: null, lastRunStart: 0, replayReq: null, frames: [], frameN: 0, drill: cfg.drill || null, drillDone: false, elapsed: 0, goldenT: 0, lastScoreT: -99, fireMan: [-1, -1], tryRun: [0, 0],
    sinbin: [], dev: { infTurbo: false, noFouls: false, aiOff: false }, win: -1
  };
  TUNE.layer('halfLength', { halfLength: () => cfg.halfLength || TUNE.base.halfLength });
  for (let t = 0; t < 2; t++) for (let r = 0; r < N; r++) S.players.push(mkPlayer(t * N + r, t, r));
  S.ref = { x: G.CX, y: G.CY + 120, facing: 0, vx: 0, vy: 0, down: 0, st: 'run', call: '', callT: 0, sig: '', sigT: 0, z: 0 };
  setupVenue();
  return S;
}

function mkPlayer(id, team, role) {
  const T = S.teams[team], b = ROLE_STATS[role], r = (id * 2654435761 >>> 0) / 4294967296;
  const m = i => clamp(Math.round(b[i] + (r * 3 - 1.5) + (T.mod || 0) * .6), 1, 10);
  const p = { id, team, role, name: T.names[role], x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, facing: team ? Math.PI : 0, st: 'run', stT: 0, turbo: TUNE.v.turboTank, turboCd: 0, stun: 0, spd: m(0), pow: m(1), hnd: m(2), kck: m(3), tkl: m(4),
    evade: 0, fend: 0, cd: { step: 0, fend: 0, spin: 0 }, xHold: 0, ciHold: 0, passHold: 0, passSide: 0, flags: {}, ctl: -1, am: '', amT: 0, hit: 0, power: null, powerT: 0, grease: 0, iron: 0, superT: 0, superKind: '', onFire: 0, tryStreak: 0, lastStepT: -9, off: false, immovable: !!(T.boss && role === 0),
    heldT: 0, heldBy: -1, tackledT: 0, mudT: 0, rest: false, wantX: 0, wantY: 0, aiT: Math.random() * 0, reactT: 0, name2: T.names[role], offload: 0, home: { x: 0, y: 0 }, burn: 0, smoke: 0, big: 0, carryT: 0 };
  if (p.immovable) { p.pow = 10; p.tkl = 9; p.spd = Math.max(p.spd, 5); }
  return p;
}

function setupVenue() {
  const v = S.venue.hazard, R = E.rng(S.cfg.seed + 5);
  S.mud = []; S.jets = [];
  if (v === 'mud') for (let i = 0; i < 6; i++) S.mud.push({ x: G.X0 + 150 + R() * (G.X1 - G.X0 - 300), y: G.Y0 + 60 + R() * (G.Y1 - G.Y0 - 120), r: 38 + R() * 30 });
  if (v === 'flames') for (let s = 0; s < 2; s++) for (let i = 0; i < 8; i++) S.jets.push({ x: G.X0 + 70 + i * 126, y: s ? G.Y1 - 32 : G.Y0 + 32, st: 0, t: 0 });
  S.windT = 8 + R() * 8;
}

const mudAt = (x, y) => { for (const m of S.mud) if (Math.hypot(x - m.x, y - m.y) < m.r) return true; return false; };

// ---------- placing and formations
function place(p, x, y, face) { p.x = x; p.y = y; p.z = 0; p.vx = p.vy = p.vz = 0; if (face !== undefined) p.facing = face; if (alive(p) && p.st !== 'celebrate') { p.st = 'run'; } p.stT = 0; p.evade = p.fend = 0; p.am = ''; p.xHold = 0; p.ciHold = 0; p.passHold = 0; p.flags = {}; }
function ballTo(x, y, st = 'dead') { const b = S.ball; b.holder = null; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; b.st = st; }
function giveBall(p) {
  const b = S.ball; b.holder = p; b.st = 'held'; b.vx = b.vy = b.vz = 0; S.poss = p.team; S.lastTeam = p.team; S.lastTouch = p.id; p.carryT = 0; p.ciHold = 0; p.passHold = 0; p.xHold = 0;
  if (S.adv && S.adv.team !== p.team && S.adv.t > 0) { /* ball lost under advantage */ S.adv.lost = true; }
  if (p.superKind === 'hurricane') endSuper(p);
  holdPos(p); S.tryRun[p.team] = S.tryRun[p.team] || 0; p.runFrom = p.x; S.lastRunStart = S.t;
}
function holdPos(p) { const b = S.ball; b.x = p.x + Math.cos(p.facing) * 4; b.y = p.y + Math.sin(p.facing) * 4 + 1; b.z = 13 + p.z; }
function dropBall(vx, vy, vz) { const b = S.ball, h = b.holder; if (!h) return; b.holder = null; b.st = 'loose'; b.vx = vx; b.vy = vy; b.vz = vz; b.rotV = 8; S.poss = -1; S.lastTeam = h.team; }

function formation(team, x, kind) {
  // kinds: 'line' (deep attack shape behind x), 'def' (flat line ahead)
  const d = S.dir[team], P = teamPlayers(team), out = {};
  const ys = [-70, -20, 25, -30, 0, 60, 125];
  const deep = [20, 22, 20, 34, 52, 74, 96];
  for (const p of P) { const r = p.role; out[p.id] = { x: x - d * (kind === 'def' ? -deep[r] * .35 + 4 : deep[r]) * 1, y: clamp(G.CY + ys[r] * (team ? -1 : 1) * 1.1, G.Y0 + 30, G.Y1 - 30) }; }
  return out;
}
function lineUp(team, x, dep) { const f = formation(team, x, dep); for (const p of teamPlayers(team)) { const q = f[p.id]; place(p, clamp(q.x, G.X0 - 80, G.X1 + 80), q.y, S.dir[team] > 0 ? 0 : Math.PI); } }

// ---------- phases
function setPhase(ph, sub = '') { S.phase = ph; S.sub = sub; S.phaseT = 0; }
function startMatch() {
  S.dir = [1, -1];
  const cfg = S.cfg;
  if (cfg.mode === 'drill') return startDrill(cfg.drill);
  doKickoff(0, true);
}
function doKickoff(kickTeam, first) {
  const rec = opp(kickTeam), kp = kickerOf(kickTeam);
  S.ruckMark = null; S.adv = null; S.useIt = 0; S.sp = null; S.hooterT = 0;
  for (const p of S.players) { if (p.st === 'down' || p.st === 'ground' || p.st === 'air' || p.st === 'stun' || p.st === 'fall' || p.st === 'getUp' || p.st === 'celebrate' || p.st === 'getup') p.st = 'run'; p.flags = {}; }
  // kicking team behind the ball line on its own half, receivers in their half
  const dk = S.dir[kickTeam];
  for (const p of teamPlayers(kickTeam)) { const k = p.role; place(p, G.CX - dk * (6 + (k === 4 ? 0 : 24 + k * 10)), G.CY + (k - 3) * 52 * (kickTeam ? -1 : 1) + (k === 4 ? 0 : 0), dk > 0 ? 0 : Math.PI); }
  place(kp, G.CX - dk * 6, G.CY, dk > 0 ? 0 : Math.PI);
  const dr = S.dir[rec];
  for (const p of teamPlayers(rec)) { const k = p.role; place(p, G.CX - dr * (130 + (k < 3 ? 60 : 130) + k * 8), G.CY + (k - 3) * 56, dr > 0 ? 0 : Math.PI); }
  ballTo(G.CX, G.CY, 'placed'); S.ball.z = 2;
  S.sp = { type: 'kickoff', team: kickTeam, kicker: kp.id, aim: { x: 0, y: 0 }, power: 0, charging: false, t: 0, drop: false, aimY: 0 };
  setPhase('kickoff'); S.sinbin.forEach(b => { /* keep binned */ });
  banner(first ? 'KICK OFF!' : 'RESTART', '#fff4c0'); bus.emit('kickoff', { team: kickTeam }); line('kickoff');
}
function kickerOf(team) { return S.players.find(p => p.team === team && p.role === 4 && alive(p)) || teamPlayers(team)[0]; }

function startDrill(id) {
  const D = DRILLS.find(d => d.id === id), me = S.players[4], dr = 1;
  S.drillDef = D; setPhase('play');
  for (const p of S.players) { if (p.team === 1) { p.off = true; } }
  const home = teamPlayers(0);
  const away = S.players.filter(p => p.team === 1);
  const ON = (p, x, y) => { p.off = false; place(p, x, y, Math.PI); p.dummy = true; };
  for (const p of home) place(p, G.CX - 400 - p.role * 16, G.CY + (p.role - 3) * 44, 0);
  place(me, G.X0 + 120, G.CY, 0);
  const carry = () => { giveBall(me); };
  switch (D.setup) {
    case 'solo': carry(); ON(away[0], G.CX, G.CY - 50); ON(away[4], G.CX + 300, G.CY + 40); for (const p of home) if (p !== me) p.off = true; break;
    case 'passing': carry(); for (const p of home) if (p !== me) place(p, me.x - 40 - p.role * 6, G.CY + (p.role - 3) * 60, 0); S.cfg.noScore = true; break;
    case 'evade': carry(); for (const p of home) if (p !== me) p.off = true; ON(away[0], me.x + 140, G.CY); ON(away[1], me.x + 260, G.CY - 40); ON(away[2], me.x + 380, G.CY + 40); for (const a of [away[0], away[1], away[2]]) a.dummy = false; break;
    case 'tackle': for (const p of home) if (p !== me) p.off = true; ON(away[4], me.x + 260, G.CY); giveBall(away[4]); away[4].dummy = false; break;
    case 'ruck': carry(); ON(away[0], me.x + 40, G.CY); away[0].dummy = false; for (const p of home) if (p !== me && p.role > 2) p.off = true; break;
    case 'kick': carry(); for (const p of home) if (p !== me) p.off = true; break;
    case 'scrum': for (const p of away) p.off = false; startScrum(0, G.CX, G.CY); break;
    case 'lineout': for (const p of away) p.off = false; startLineout(0, G.CX - 100, G.Y0); break;
    case 'goal': { for (const p of home) if (p !== me) p.off = true; startConversion(0, me, G.CY, 'conv'); break; }
  }
  S.score = [0, 0];
}

// ---------- ball physics
function stepBall(dt) {
  const b = S.ball;
  if (b.st === 'held') { if (b.holder) holdPos(b.holder); return; }
  if (b.st === 'dead' || b.st === 'placed') { b.rot += 0; return; }
  const windF = S.wind * 40 * TUNE.v.windMult * S.windDir;
  if (b.z > 2) { b.vx += windF * dt; b.vx -= b.vx * .3 * dt; b.vy -= b.vy * .3 * dt; }
  b.vz -= 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rot += b.rotV * dt;
  if (b.z <= 0) {
    b.z = 0;
    if (b.vz < -30) {
      const ch = TUNE.v.bounceChaos, ang = (S.rng() * 2 - 1) * 70 * Math.PI / 180 * ch, c = Math.cos(ang), s = Math.sin(ang);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c; b.vx = vx * .75; b.vy = vy * .75; b.vz = -b.vz * .45 * U(S.rng, .3 / .45 * .6, 1.25 / .45 * .6) * .8;
      if (S.mud.length && mudAt(b.x, b.y)) { b.vx *= .5; b.vy *= .5; b.vz *= .5; }
      b.st = 'loose'; bus.emit('bounce', { x: b.x, y: b.y });
    } else { b.vz = 0; b.vx -= b.vx * 1.4 * dt; b.vy -= b.vy * 1.4 * dt; if (b.st !== 'loose') b.st = 'loose'; if (Math.hypot(b.vx, b.vy) < 3) { b.vx = b.vy = 0; } }
  }
}

// ---------- movement
function speedOf(p) {
  let s = TUNE.v.runSpeed * (.8 + .04 * p.spd);
  if (S.ball.holder === p) s *= .96;
  if (S.mud.length && mudAt(p.x, p.y)) { s *= .8; p.mudT += .01; }
  if (p.superKind === 'thunder') s *= 1.35;
  if (p.superKind === 'hurricane') s *= 2;
  if (p.xHold > .18) s *= 1.15;
  if (p.heldT > 0) s *= .4;
  if (S.cfg.diffMult && p.team === 1) s *= S.cfg.diffMult.spd || 1;
  return s;
}
function moveStep(p, I, dt) {
  const canMove = p.st === 'run' || p.st === 'charge';
  let tx = 0, ty = 0;
  const m = Math.hypot(I.mx, I.my);
  if (canMove && m > .05) {
    const k = Math.min(1, m); let sp = speedOf(p);
    const wantTurbo = I.turbo && (p.turbo > 0 || S.dev.infTurbo || p.power === 'pie' || p.onFire > 0 || p.superKind);
    if (wantTurbo && (p.turbo > 0 || S.dev.infTurbo || p.power === 'pie' || p.onFire > 0 || p.superKind === 'thunder')) { sp *= TUNE.v.turboMult; if (!(S.dev.infTurbo || p.power === 'pie' || p.onFire > 0)) p.turbo = Math.max(0, p.turbo - dt); p.turboCd = .6; p.turboOn = true; } else p.turboOn = false;
    tx = I.mx / m * sp * k; ty = I.my / m * sp * k;
  } else p.turboOn = false;
  if (!p.turboOn) { p.turboCd -= dt; if (p.turboCd <= 0 && p.turbo < TUNE.v.turboTank) p.turbo = Math.min(TUNE.v.turboTank, p.turbo + dt * .3 * 1.0); }
  if (p.st === 'air') { /* ballistic */ }
  else if (canMove || p.st === 'fall' || p.st === 'stun') {
    const ac = TUNE.v.accel * (S.mud.length && mudAt(p.x, p.y) ? .6 : 1) * dt, k2 = (canMove ? 1 : .3);
    const ddx = tx - p.vx, ddy = ty - p.vy, dl = Math.hypot(ddx, ddy);
    if (dl > ac) { p.vx += ddx / dl * ac * k2; p.vy += ddy / dl * ac * k2; } else if (canMove) { p.vx = tx; p.vy = ty; } else { p.vx *= (1 - 4 * dt); p.vy *= (1 - 4 * dt); }
  } else { p.vx *= (1 - 7 * dt); p.vy *= (1 - 7 * dt); }
  // update facing toward velocity if moving
  if (canMove && Math.hypot(p.vx, p.vy) > 12) { const ta = Math.atan2(p.vy, p.vx), rate = (S.ball.holder === p ? 8 : 10) * dt; p.facing += clamp(angDiff(ta, p.facing), -rate, rate); }
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.st === 'air') { p.vz -= 700 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; landed(p); } }
  p.x = clamp(p.x, G.X0 - G.ING - 28, G.X1 + G.ING + 28); p.y = clamp(p.y, G.Y0 - 44, G.Y1 + 44);
}
function landed(p) {
  p.st = 'ground'; p.stT = 1.1; p.am = ''; p.vx *= .5; p.vy *= .5; bus.emit('thud', { x: p.x, y: p.y, big: true }); if (TT.cfg.present) { TT.fxDust && TT.fxDust(p.x, p.y); }
  S.shake = Math.max(S.shake, 3);
}
function separate(dt) {
  const P = S.players;
  for (let i = 0; i < P.length; i++) { const a = P[i]; if (!standing(a)) continue; for (let j = i + 1; j < P.length; j++) { const c = P[j]; if (!standing(c)) continue; const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy); if (d < 8 && d > .01) { const k = (8 - d) * .5 * Math.min(1, dt * 20); a.x -= dx / d * k; a.y -= dy / d * k; c.x += dx / d * k; c.y += dy / d * k; } } }
}

/* ==== 21-actions.js ==== */
/* THUGBY TURBO — actions: passing, kicking, evasion, contact, laws, hype. */
function addHype(team, n) { const h = S.hype[team]; S.hype[team] = clamp(h + n * TUNE.v.hypeMult, 0, 100); if (h < 100 && S.hype[team] >= 100) { bus.emit('superReady', { team }); if (S.seats.some(s => s.team === team)) banner('△ SUPER READY!', '#ffe070'); } }
const refSees = p => !S.ref.down && S.ref.down <= 0 && Math.hypot(S.ref.x - p.x, S.ref.y - p.y) < TUNE.v.refRange && Math.abs(angDiff(S.ref.facing, Math.atan2(p.y - S.ref.y, p.x - S.ref.x))) < TUNE.v.refFov / 2;
const nearestOpp = (p, r, f) => { let best = null, bd = r; for (const q of S.players) if (q.team !== p.team && alive(q) && (!f || f(q))) { const d = dist2(p, q); if (d < bd) { bd = d; best = q; } } return best; };

// ---------- passing
function receivers(p, side) {
  const d = S.dir[p.team], out = [];
  for (const q of S.players) if (q.team === p.team && q !== p && standing(q) && (q.x - p.x) * d <= 4 && dist2(p, q) < 220 && (side === 0 || (side < 0 ? q.y < p.y - 2 : q.y > p.y + 2))) out.push(q);
  return out.sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y));
}
function bestReceiver(p, side, long) {
  let list = receivers(p, side);
  if (!list.length && TT.settings.passAssist) list = receivers(p, -side);
  if (!list.length) return null;
  const near = list.filter(q => dist2(p, q) < (long ? 300 : 110));
  const L = near.length ? near : list;
  return long && L.length > 1 ? L[1] : L[0];
}
function doPass(p, rec, long, opts = {}) {
  const b = S.ball; if (b.holder !== p) return false;
  if (!rec) return doDummy(p);
  const d = S.dir[p.team], forward = (rec.x - p.x) * d > 4;
  const spd = TUNE.v.passSpeed * (long ? 1.3 : 1), dd = dist2(p, rec), T = Math.max(.12, dd / spd);
  const tx = rec.x + rec.vx * T * .9, ty = rec.y + rec.vy * T * .9;
  b.holder = null; b.st = 'pass'; b.x = p.x; b.y = p.y; b.z = 13; b.vx = (tx - p.x) / T; b.vy = (ty - p.y) / T; b.vz = (14 - 13 + 300 * T * T) / T; b.rotV = 14; b.target = rec.id; b.forward = forward; b.long = long; b.passer = p.id; b.tried = {}; b.offload = !!opts.offload;
  p.am = 'pass'; p.amT = 0; p.facing = Math.atan2(ty - p.y, tx - p.x); p.cd.pass = .2;
  S.poss = p.team; S.lastTeam = p.team; S.lastTouch = p.id; S.useIt = 0;
  if (p.superKind === 'thunder') endSuper(p);
  bus.emit('pass', { from: p.id, to: rec.id, forward, long }); return true;
}
function doDummy(p) {
  p.am = 'pass'; p.amT = 0; p.cd.pass = .3; let n = 0;
  for (const q of S.players) if (q.team !== p.team && standing(q) && dist2(p, q) < 40 && S.rng() < .4) { q.reactT = .3; n++; }
  if (n) { addHype(p.team, 4 * n); bus.emit('dummy', { id: p.id, n }); banner('DUMMY!', '#ffd0a0', 1); }
  return true;
}
function catchRoll(q, long, pass) {
  let c = TUNE.v.catchBase * (.9 + .01 * q.hnd) - (long ? .06 : 0) - (S.venue.weather && S.venue.weather.kind === 'rain' ? .06 : 0);
  if (nearestOpp(q, 20)) c -= .12; if (pass && (q.onFire > 0 || (S.players[S.ball.passer] || {}).onFire > 0)) return true;
  if (S.ball.offload) c -= .1;
  return S.rng() < c;
}
function stepFlight(dt) {
  const b = S.ball;
  if (b.st === 'pass') {
    const r = S.players[b.target];
    for (const q of S.players) { if (q.team === S.players[b.passer].team || !standing(q) || b.tried[q.id]) continue; if (Math.hypot(q.x - b.x, q.y - b.y) < 10 && b.z < 24) { b.tried[q.id] = 1; const human = q.ctl >= 0, ch = human ? (q.flags.holdX ? .45 : .06) : .08 * (S.cfg.interceptMult || 1) * TUNE.v.aiAggression; if (S.rng() < ch) { giveBall(q); bus.emit('interception', { id: q.id }); addHype(q.team, 12); banner('INTERCEPTED!', '#ff8060'); return; } } }
    if (r && standing(r) && Math.hypot(r.x - b.x, r.y - b.y) < 10 && b.z < 30) {
      if (b.forward) { bus.emit('forwardPass', {}); line('forwardPass'); return startScrumAt(opp(r.team), S.players[b.passer].x, S.players[b.passer].y, 'FORWARD!'); }
      if (catchRoll(r, b.long, true)) { giveBall(r); bus.emit('catch', { id: r.id }); }
      else { const fw = S.rng() < .5; b.st = 'loose'; b.vx *= .25; b.vy *= .25; b.vz = 40; S.poss = -1; if (fw) return knockOn(r); }
    }
  }
}
function knockOn(p) {
  bus.emit('knockOn', { id: p.id }); line('knockOn'); const b = S.ball;
  startScrumAt(opp(p.team), b.x, b.y, 'KNOCK ON!');
}

// ---------- kicking
function doKick(p, kind, power, aim) {
  const b = S.ball; if (b.holder !== p) return;
  const d = S.dir[p.team]; let ang = Math.atan2(aim ? aim[1] : 0, aim ? aim[0] : d), mag = aim ? Math.hypot(aim[0], aim[1]) : 0;
  const base = mag > .3 ? ang : (d > 0 ? 0 : Math.PI);
  let dx = Math.cos(base), dy = Math.sin(base);
  let dist, apex, vz0;
  const boot = p.power === 'boot' ? 1.6 : 1, fire = p.onFire > 0 ? 1.2 : 1;
  if (kind === 'grubber') { dist = U(S.rng, 140, 200); vz0 = 40; }
  else if (kind === 'bomb') { dist = lerp(120, TUNE.v.kickMax, power) * .5 * (.75 + .03 * p.kck); vz0 = 380; }
  else { dist = lerp(120, TUNE.v.kickMax, power) * (.75 + .03 * p.kck) * (power > .9 ? 1.08 : 1); vz0 = 230 + power * 90; if (power <= .9) { const hook = (S.rng() * 2 - 1) * (11 - p.kck) * Math.PI / 180; dx = Math.cos(base + hook); dy = Math.sin(base + hook); } }
  dist *= boot * fire; if (p.power === 'boot') { p.power = null; }
  const T = kind === 'grubber' ? dist / 170 : Math.max(.5, 2 * vz0 / 600);
  b.holder = null; b.st = 'kick'; b.x = p.x; b.y = p.y; b.z = 8; b.vx = dx * dist / T; b.vy = dy * dist / T; b.vz = kind === 'grubber' ? 40 : vz0; b.rotV = kind === 'grubber' ? 4 : 10; b.lastKicker = p.id; b.kickT = 0; b.kind = kind;
  S.useIt = 0; S.poss = -1; S.lastTeam = p.team; S.lastTouch = p.id; p.am = 'kick'; p.amT = 0; p.cd.pass = .5;
  if (p.superKind === 'thunder') endSuper(p);
  S.kickInfo = { x: p.x + dx * dist, y: p.y + dy * dist, t: S.t, T }; bus.emit('kick', { id: p.id, kind, dist });
}
function stepKick(dt) {
  const b = S.ball; if (b.st !== 'kick') return; b.kickT += dt;
  // contest for a high ball
  if (b.z < 30 && b.vz < 40) {
    const near = S.players.filter(q => standing(q) && Math.hypot(q.x - b.x, q.y - b.y) < 11);
    if (near.length) {
      let win = near[0];
      if (near.length > 1) { let bs = -9; for (const q of near) { const sc = q.hnd * .1 + S.rng() * .5 + (q.flags.holdX ? .6 : 0) + (q.team === S.lastTeam ? 0 : .05); if (sc > bs) { bs = sc; win = q; } } for (const q of near) if (q !== win && q.team !== win.team) { q.st = 'down'; q.stT = .8; } if (near.some(q => q.team !== win.team)) bus.emit('aerialContest', {}); }
      if (win.team !== S.lastTeam || b.kind !== 'grubber') { giveBall(win); bus.emit('kickCaught', { id: win.id }); if (S.cfg.mode === 'drill') {} return; }
    }
  }
}

// ---------- evasion
function doSidestep(p, I) {
  if (p.cd.step > 0) return;
  const double = S.t - p.lastStepT < .25 && p.cd.spin <= 0; p.lastStepT = S.t;
  const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
  let side;
  if (Math.hypot(I.mx, I.my) > .3) side = Math.sign(fx * I.my - fy * I.mx) || 1; else { const o = nearestOpp(p, 80); side = o ? -Math.sign(fx * (o.y - p.y) - fy * (o.x - p.x)) || 1 : 1; }
  if (double) { p.evade = .4; p.cd.spin = 1; p.am = 'spinmove'; p.amT = 0; p.vx *= .85; p.vy *= .85; bus.emit('spin', { id: p.id }); return; }
  p.evade = TUNE.v.sidestepEvade; p.cd.step = .6; p.vx += -fy * side * TUNE.v.sidestepPower; p.vy += fx * side * TUNE.v.sidestepPower; p.am = 'sidestep'; p.amT = 0; p.sideDir = side;
  bus.emit('sidestep', { id: p.id });
}
function doFend(p) { if (p.cd.fend > 0) return; p.fend = .3; p.cd.fend = .8; p.am = 'fend'; p.amT = 0; bus.emit('fendStart', { id: p.id }); }

// ---------- contact
function tackleAttempt(tk, kind, charge) {
  const car = S.ball.holder; if (!car || car.team === tk.team) return false;
  const range = kind === 'big' ? 18 : kind === 'dive' ? TUNE.v.tackleRange + 30 : TUNE.v.tackleRange;
  if (dist2(tk, car) > range + 2) return false;
  const ang = Math.abs(angDiff(Math.atan2(car.y - tk.y, car.x - tk.x), tk.facing));
  if (ang > (kind === 'dive' ? 1.2 : 1.25) && kind !== 'super') return false;
  tk.am = kind === 'dive' ? 'dive' : kind === 'big' ? 'bighit' : 'tackle'; tk.amT = 0;
  const behind = Math.abs(angDiff(car.facing, Math.atan2(tk.y - car.y, tk.x - car.x))) > 1.8;
  let chance = TUNE.v.tackleBase * (.9 + .02 * tk.tkl - .02 * car.pow) + (behind ? .1 : 0) + (kind === 'big' ? .08 + .12 * charge : 0) + (S.cfg.tackleBonus && tk.team === 1 ? S.cfg.tackleBonus : 0) - (car.turboOn ? .05 : 0);
  if (kind === 'big') chance = .7 + .2 * charge;
  if (car.grease > 0) chance = Math.min(chance, .3);
  if (tk.iron > 0) chance = 1; if (tk.onFire > 0) chance += .2; if (car.onFire > 0) chance *= .6;
  if (tk.superKind === 'hurricane') chance = 1;
  if (car.superKind === 'thunder' || (S.dev.unstoppable && car.ctl >= 0)) { tk.st = 'fall'; tk.stT = .9; tk.vx = (tk.x - car.x) * 4; tk.vy = (tk.y - car.y) * 4; bounceAway(tk, car); bus.emit('missedTackle', { id: tk.id }); return true; }
  if (car.evade > 0) { tk.st = 'fall'; tk.stT = .6; bus.emit('missedTackle', { id: tk.id, evaded: true }); addHype(car.team, 6); S.stats[tk.team].missed++; return true; }
  if (car.fend > 0 && tk.iron <= 0) {
    const beat = TUNE.v.fendBeat + .03 * (car.pow - tk.tkl) * (kind === 'big' ? .5 : 1) + (car.onFire > 0 ? .3 : 0);
    if (S.rng() < beat) { tk.st = 'ground'; tk.stT = .8; tk.vx = Math.cos(car.facing) * 90; tk.vy = Math.sin(car.facing) * 90; bus.emit('fend', { id: car.id }); addHype(car.team, 6); banner('FENDED!', '#ffd070', 1); return true; }
  }
  if (car.immovable && !(kind === 'big' && charge > .95) && tk.superKind !== 'hurricane') {
    if (car.heldT > 0 && car.heldBy !== tk.id) { return finishTackle(tk, car, kind, charge); }
    car.heldT = 1.0; car.heldBy = tk.id; tk.st = 'fall'; tk.stT = 1.2; tk.vx = -Math.cos(tk.facing) * 70; tk.vy = -Math.sin(tk.facing) * 70; banner('HELD! NEED A SECOND TACKLER!', '#ffa0ff', 1.4); bus.emit('held', {}); return true;
  }
  if (S.rng() < chance) return finishTackle(tk, car, kind, charge);
  tk.st = 'fall'; tk.stT = .6; car.st = 'run'; car.vx *= .6; car.vy *= .6; car.stagger = .4;
  S.stats[tk.team].missed++; addHype(car.team, 5); bus.emit('brokenTackle', { id: car.id }); banner('BROKEN TACKLE!', '#ffd070', 1);
  return true;
}
function bounceAway(tk, car) { tk.st = 'air'; tk.vz = 140; tk.z = 1; tk.vx = (tk.x - car.x) * 6 + Math.cos(car.facing) * 40; tk.vy = (tk.y - car.y) * 6; }
function finishTackle(tk, car, kind, charge) {
  const monster = (kind === 'big' && charge > .95) || tk.iron > 0 && kind === 'big' || tk.superKind === 'hurricane' || (S.dev.monster);
  S.stats[tk.team].tackles++; tk.st_tkl = (tk.st_tkl || 0) + 1; if (kind === 'big' || monster) { S.stats[tk.team].bigHits++; tk.st_big = (tk.st_big || 0) + 1; }
  addHype(tk.team, monster ? 16 : kind === 'big' ? 10 : 4);
  const dx = Math.cos(Math.atan2(car.y - tk.y, car.x - tk.x)), dy = Math.sin(Math.atan2(car.y - tk.y, car.x - tk.x));
  bus.emit('tackle', { by: tk.id, on: car.id, kind }); S.lastTackle = { x: car.x, y: car.y, by: tk.id };
  tk.st = 'tackling'; tk.stT = .5; tk.vx *= .3; tk.vy *= .3;
  if (kind === 'big' || monster) {
    bus.emit(monster ? 'monsterHit' : 'bigHit', { by: tk.id, on: car.id }); if (monster) S.stats[tk.team].monster++;
    const L = (monster ? 1.2 : .55) * TUNE.v.bigHitLaunch;
    car.st = 'air'; car.z = 1; car.vz = monster ? 220 : 110; car.vx = dx * L * 4.2; car.vy = dy * L * 4.2; car.flip = monster ? 1 : .4; car.am = 'launched'; car.amT = 0; car.superKind = car.superKind === 'thunder' ? '' : car.superKind;
    if (S.rng() < TUNE.v.spillChance || monster) { const spillFwd = dx * S.dir[car.team] > 0; dropBall(dx * 90, dy * 90 + U(S.rng, -30, 30), 120); S.lastTeam = car.team; if (spillFwd && S.rng() < .5) { S.pendingKnockOn = car; } }
    TT.hitFx && TT.hitFx(car, monster ? 2 : 1);
    if (S.ball.holder === car) { carrierDown(car, tk, true); }
    else { S.poss = -1; }
    line(monster ? 'monsterHit' : 'bigHit');
    S.replayReq = monster ? 'monster' : S.replayReq;
    return true;
  }
  car.am = 'tackled'; car.amT = 0; carrierDown(car, tk, false);
  if (S.cfg.mode !== 'drill' || true) TT.hitFx && TT.hitFx(car, .6);
  return true;
}
function carrierDown(car, tk, launched) {
  if (!launched) { car.st = 'ground'; car.stT = 1.4; car.vx = Math.cos(tk.facing) * 30; car.vy = Math.sin(tk.facing) * 30; }
  if (inGoalOf(car) && S.ball.holder === car) return scoreTry(car, 'tackled');
  if (S.ball.holder === car) { car.offload = .15; startRuck(car, tk); }
}
function startRuck(car, tk) {
  const d = S.dir[car.team], b = S.ball;
  const mark = { x: car.x - d * 8, y: car.y };
  b.holder = null; b.st = 'placed'; b.x = mark.x; b.y = mark.y; b.z = 1; b.vx = b.vy = 0; S.ruckMark = mark;
  setPhase('ruck'); S.sp = { type: 'ruck', team: car.team, x: mark.x, y: mark.y, bar: 0, t: 0, jack: false, carrier: car.id, tackler: tk.id, att: [], def: [], mash: [0, 0], first: null, done: false };
  S.poss = car.team; S.lastTeam = car.team;
  // commit
  const cands = t => S.players.filter(p => p.team === t && standing(p) && p !== car && p !== tk).sort((a, c) => Math.hypot(a.x - mark.x, a.y - mark.y) - Math.hypot(c.x - mark.x, c.y - mark.y)).filter(p => Math.hypot(p.x - mark.x, p.y - mark.y) < 90);
  S.sp.att = cands(car.team).slice(0, 2).map(p => p.id); S.sp.def = [tk.id].concat(cands(opp(car.team)).slice(0, 1).map(p => p.id));
  S.sp.bar = .2 + .1 * (S.sp.att.length - S.sp.def.length);
  S.sp.first = tk.id; bus.emit('ruck', { x: mark.x, y: mark.y }); S.ruckStamp = S.t;
  if (S.hooter) { S.hooterT += 0; }
}
function endSuper(p) { if (p.superKind) { p.superKind = ''; p.superT = 0; bus.emit('superEnd', { id: p.id }); } }
function useSuper(p) {
  const t = p.team; if (S.hype[t] < 100 || p.superKind) return false;
  if (S.ball.holder === p) { p.superKind = 'thunder'; p.superT = TUNE.v.superTime; banner('THUNDER RUN!', '#ffe070', 1.6); line('super'); S.replayReq = S.replayReq || 'super'; }
  else if (S.ball.holder && S.ball.holder.team !== t) { p.superKind = 'hurricane'; p.superT = 2; banner('HURRICANE HIT!', '#ff90ff', 1.6); line('super'); }
  else return false;
  S.hype[t] = 0; bus.emit('superStart', { id: p.id, kind: p.superKind }); return true;
}

// ---------- fouls and cards
function foul(off, kind, seenOverride) {
  if (S.dev.noFouls || S.cfg.mode === 'drill' && false) return false;
  const always = ['early', 'useIt', 'forward', 'notStraight'].includes(kind);
  const seen = always || seenOverride || refSees(off);
  if (!seen || S.ref.down > 0) { if (kind === 'cheap') { addHype(off.team, 8); line('cheapMissed'); banner('REF MISSED IT!', '#ffff80', 1.4); } bus.emit('foulUnseen', { id: off.id, kind }); return false; }
  const t = opp(off.team), names = { high: 'HIGH SHOT!', cheap: 'CHEAP SHOT!', offside: 'OFFSIDE!', hands: 'HANDS AWAY!', early: 'EARLY ENGAGEMENT!', useIt: 'USE IT!' };
  S.ref.call = names[kind] || 'PENALTY!'; S.ref.callT = 1.4; S.ref.sig = 'penalty'; S.ref.sigT = 1.5; S.stats[off.team].pens++;
  off.fouls = (off.fouls || 0) + (kind === 'high' ? 2 : 1);
  bus.emit('foul', { id: off.id, kind }); banner(names[kind] || 'PENALTY!', '#ff6060');
  if (off.fouls >= 2 && (kind === 'high' || kind === 'cheap')) cardPlayer(off, off.fouls >= 3 && off.card ? 'red' : 'yellow');
  const car = S.ball.holder, ownBall = (car && car.team === t) || (S.ball.st === 'loose' && S.lastTeam === t);
  if (car && car.team === t && (kind === 'high' || kind === 'cheap') && Math.abs(atkX(t) - car.x) < 60 && !S.players.some(q => q.team === off.team && alive(q) && (q.x - car.x) * S.dir[t] > 0 && (q.x - atkX(t)) * S.dir[t] < 0 && Math.abs(q.y - car.y) < 14)) {
    banner('PENALTY TRY! +7', '#ffe070', 2); bus.emit('penaltyTry', { team: t }); S.stats[t].tries++; if (afterScore(t, 7)) return true; setPhase('goalscored'); S.sp = { t: 0, team: t }; return true;
  }
  const spot = { x: clamp(off.x, G.X0 + 20, G.X1 - 20), y: clamp(off.y, G.Y0 + 20, G.Y1 - 20) };
  if (kind === 'early' || kind === 'useIt' || S.phase !== 'play' && S.phase !== 'ruck' || !ownBall) { if (S.cfg.mode === 'drill') return true; return startPenalty(t, spot.x, spot.y, kind === 'early'); }
  S.adv = { team: t, t: 5, x: car ? car.x : S.ball.x, y: spot.y, spotX: spot.x, spotY: spot.y, lost: false, free: false }; banner('ADVANTAGE!', '#80ff80', 1.2); S.ref.call = 'ADVANTAGE!'; S.ref.callT = 1.4; bus.emit('advantage', { team: t });
  return true;
}
function cardPlayer(p, color) {
  p.card = color; S.stats[p.team].cards++; bus.emit('card', { id: p.id, color }); banner(color === 'red' ? 'RED CARD!' : 'YELLOW CARD!', color === 'red' ? '#ff4040' : '#ffe040'); line('card');
  p.st = 'binned'; p.stT = color === 'red' ? 9999 : TUNE.v.sinBin; p.vx = p.vy = 0; if (S.ball.holder === p) dropBall(0, 0, 60);
  const bx = G.CX + 60 + (p.team ? 18 : 0) + S.players.filter(q => q.st === 'binned').length * 8; p.x = bx; p.y = G.Y1 + 30; p.z = 0;
}
function refDown(by) { if (S.ref.down > 0) return; S.ref.down = 8; S.ref.st = 'down'; banner('REF DOWN! ANYTHING GOES!', '#ffe070', 2.2); line('refDown'); bus.emit('refDown', {}); }

/* ==== 22-sets.js ==== */
/* THUGBY TURBO — set pieces: ruck, scrum, lineout, penalty, goal kicks, kick-offs, tries, half/full time. */
const seatsOf = t => S.seats.map((s, i) => ({ s, i })).filter(o => o.s.team === t);
const humanOn = t => S.seats.some(s => s.team === t && s.kind !== 'cpu' && !s.auto);
const seatPress = (t, k) => { let n = 0; for (const o of seatsOf(t)) { const I = S.seatI && S.seatI[o.i]; if (I && I[k]) n++; } return n; };
const seatHeld = (t, k) => seatsOf(t).some(o => { const I = S.seatI && S.seatI[o.i]; return I && I[k]; });
const seatAxis = t => { let x = 0, y = 0; for (const o of seatsOf(t)) { const I = S.seatI && S.seatI[o.i]; if (I) { x += I.mx; y += I.my; } } return [clamp(x, -1, 1), clamp(y, -1, 1)]; };

function checkHalf() {
  if (!S.hooter || S.phase === 'halftime' || S.phase === 'fulltime') return false;
  if (S.sudden) return false;
  if (S.half === 1) { S.hooter = false; S.sp = null; setPhase('halftime'); S.dir = [-1, 1]; S.half = 2; S.clock = 0; bus.emit('halftime', {}); banner('HALF TIME', '#ffffff', 3); return true; }
  endMatch(); return true;
}
function endMatch() {
  if (S.score[0] === S.score[1] && (S.cfg.mode === 'cup' || TT.settings.suddenDeath) && S.cfg.mode !== 'attract' && S.cfg.mode !== 'drill') { S.sudden = true; S.hooter = false; S.goldenT = 0; banner('SUDDEN DEATH — NEXT SCORE WINS!', '#ff9060', 3); bus.emit('suddenDeath', {}); doKickoff(S.half === 2 ? 1 : 0); return; }
  S.over = true; S.win = S.score[0] > S.score[1] ? 0 : S.score[1] > S.score[0] ? 1 : -1; setPhase('fulltime'); bus.emit('fulltime', { win: S.win }); banner('FULL TIME', '#ffffff', 3);
  pickPotm();
}
function pickPotm() {
  const sc = S.players.map(p => ({ p, v: (p.st_tries || 0) * 10 + (p.st_big || 0) * 4 + (p.st_tkl || 0) + (p.st_m || 0) / 10 }));
  const w = S.win < 0 ? 0 : S.win; const c = sc.filter(o => o.p.team === w).sort((a, b) => b.v - a.v)[0]; S.potm = c ? c.p.id : 0;
}
function afterScore(team, pts, byWhom) {
  S.score[team] += pts; S.lastScoreT = S.t; S.fire[opp(team)] = 0;
  if (S.sudden) { S.over = true; S.win = team; setPhase('fulltime'); bus.emit('fulltime', { win: team }); banner('GOLDEN POINT! GAME OVER!', '#ffe070', 3); pickPotm(); return true; }
  S.tryRun[opp(team)] = 0;
  return false;
}

// ---------- tries
function scoreTry(p, how) {
  if (S.phase === 'try' || S.over) return;
  const t = p.team; S.stats[t].tries++; p.st_tries = (p.st_tries || 0) + 1;
  const pv = S.score.slice();
  S.tries.push({ t: S.t, id: p.id }); S.ball.holder = p; holdPos(p);
  bus.emit('try', { id: p.id, team: t, how }); banner(t === 0 ? 'TRY!' : 'THEIR TRY', '#ffe070', 2); line(t === 0 ? 'try' : 'tryAgainst'); addHype(t, 15);
  p.tryStreak = (p.tryStreak || 0) + 1; for (const q of S.players) if (q.team === t && q !== p) q.tryStreak = q.tryStreak;
  if (p.tryStreak >= 2 && !(p.onFire > 0)) { p.onFire = 90; banner('HE\'S ON FIRE!', '#ff9030', 2); bus.emit('onFire', { id: p.id }); line('onFire'); }
  for (const q of S.players) if (q.team !== t) { q.tryStreak = 0; if (q.onFire > 0) { q.onFire = 0; bus.emit('fireOut', { id: q.id }); } }
  if (afterScore(t, 5)) return;
  if (S.tries.length && S.stats[t].tries) S.replayReq = S.replayReq || 'try';
  setPhase('try'); S.sp = { type: 'try', team: t, id: p.id, t: 0, x: p.x, y: clamp(p.y, G.Y0 + 20, G.Y1 - 20) }; S.useIt = 0; S.adv = null;
  for (const q of S.players) if (alive(q) && q.team === t) { q.st = q.id === p.id ? 'celebrate' : 'celebrate'; q.stT = 9; q.vx = q.vy = 0; q.celeb = (q.id * 3) % 4; }

}
function tryEnded() {
  const t = S.sp.team, p = S.players[S.sp.id], y = S.sp.y;
  if (S.half && S.hooter && checkHalf()) return;
  startConversion(t, p, y, 'conv');
}

// ---------- scrum
function startScrumAt(feed, x, y, why) {
  if (S.phase === 'scrum') return;
  if (why) banner(why, '#ffffff', 1.5); S.ref.call = why || 'SCRUM'; S.ref.callT = 1.5; S.ref.sig = 'scrum'; S.ref.sigT = 1.5;
  const d = S.dir[feed], ax = atkX(feed);
  let sx = clamp(x, G.X0 + 51, G.X1 - 51), sy = clamp(y, G.Y0 + 51, G.Y1 - 51);
  startScrum(feed, sx, sy);
}
function startScrum(feed, x, y) {
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  S.ball.holder = null; ballTo(x, y, 'placed'); S.useIt = 0; S.adv = null; S.ruckMark = null;
  setPhase('scrum'); S.sp = { type: 'scrum', feed, x, y, step: 'setup', t: 0, bar: .15, setAt: 0, perfect: 0, pushLast: '', pushN: [0, 0], early: false, pressedAt: -1, cpuAcc: 0 };
  bus.emit('scrum', { feed }); line('scrum');
  const A = feed, B = opp(feed), dA = S.dir[A];
  for (const t of [A, B]) {
    const d = S.dir[t], P = teamPlayers(t);
    for (const p of P) { p.flags = {}; if (p.role <= 2) place(p, x - d * (10 + 2), y + (p.role - 1) * 10, d > 0 ? 0 : Math.PI); else if (p.role === 3) place(p, x - d * 16, y + (t === A ? 16 : -16), d > 0 ? 0 : Math.PI); else place(p, x - d * (51 + (p.role - 4) * 14), y + (p.role - 4.5) * 50, d > 0 ? 0 : Math.PI); p.st = 'scrum'; }
  }
}
function stepScrum(dt) {
  const s = S.sp; s.t += dt;
  const humanA = humanOn(s.feed), humanB = humanOn(opp(s.feed));
  const tick = (to, nm) => { if (s.t >= to && s.step !== nm) { s.step = nm; s.stepT = 0; } };
  s.stepT = (s.stepT || 0) + dt;
  const early = (t) => seatPress(t, 'x') > 0;
  if (s.step === 'setup') { if (s.t > 1.5) { s.step = 'crouch'; s.stepT = 0; S.ref.call = 'CROUCH!'; S.ref.callT = .8; bus.emit('scrumCall', { c: 'crouch' }); } }
  else if (s.step === 'crouch' || s.step === 'bind') {
    for (const t of [0, 1]) if (early(t) && S.cfg.mode !== 'attract') { const f = S.players.find(p => p.team === t && p.role === 1 && alive(p)) || S.players.find(p => p.team === t); const ft = opp(t); foul(f, 'early'); return; }
    if (s.step === 'crouch' && s.stepT > .6) { s.step = 'bind'; s.stepT = 0; S.ref.call = 'BIND!'; S.ref.callT = .8; bus.emit('scrumCall', { c: 'bind' }); }
    else if (s.step === 'bind' && s.stepT > .6) { s.step = 'set'; s.stepT = 0; s.setAt = s.t; S.ref.call = 'SET!'; S.ref.callT = .6; bus.emit('scrumCall', { c: 'set' }); }
  } else if (s.step === 'set') {
    for (const t of [0, 1]) {
      if (s.pressed && s.pressed[t] !== undefined) continue; s.pressed = s.pressed || {};
      let tm = null;
      if (seatPress(t, 'x') > 0) tm = s.stepT; else if (!humanOn(t) && s.stepT > .1 && s.stepT < .12 + dt) tm = U(S.fx, 0, .12);
      if (tm !== null) { s.pressed[t] = tm; const q = tm < .12 ? .25 : tm < .25 ? .1 : 0; s.bar += (t === s.feed ? 1 : -1) * q; if (humanOn(t)) { banner(tm < .12 ? 'PERFECT SET!' : tm < .25 ? 'GOOD SET' : 'LATE', tm < .12 ? '#80ff80' : '#ffffff', .8); } }
    }
    if (s.stepT > .5) { s.step = 'push'; s.stepT = 0; s.t0push = s.t; banner('SHOVE!', '#ffe070', 1.2); }
  } else if (s.step === 'push') {
    for (const t of [0, 1]) {
      const sgn = t === s.feed ? 1 : -1; let n = 0;
      for (const k of ['l1', 'r1']) { const c = seatPress(t, k); if (c) { n += c; const same = s.pushLast === k; s.bar += sgn * TUNE.v.scrumPush * (same ? .5 : 1) * c; s.pushLast = k; s.pushN[t]++; } }
      if (!humanOn(t)) s.bar += sgn * dt * (S.cfg.cpuScrum || TUNE.v.cpuMash) * TUNE.v.scrumPush * .5 * U(S.fx, .8, 1.2);
    }
    const powF = [0, 1, 2].reduce((a, r) => a + (S.players[s.feed * N + r].pow), 0), powO = [0, 1, 2].reduce((a, r) => a + (S.players[opp(s.feed) * N + r].pow), 0);
    s.bar += dt * .006 * (powF - powO) * 0.8 + .15 * dt * 0;
    s.bar = clamp(s.bar, -1, 1);
    for (const p of S.players) if (p.st === 'scrum' && p.role <= 2) { const d = S.dir[p.team]; p.x += (s.bar * (p.team === s.feed ? 1 : -1) * 0 + 0) * dt; }
    if (s.stepT > 2.0) {
      const win = s.bar >= 0 ? s.feed : opp(s.feed); bus.emit('scrumWon', { team: win }); addHype(win, 6);
      const collapse = Math.abs(s.bar) > .85;
      const x = s.x, y = s.y;
      if (collapse) {
        const fm = S.players.find(p => p.team === opp(win) && p.role === 1);
        const close = Math.abs(atkX(win) - x) < 50 + 51;
        if (close && S.dir[win]) { bus.emit('pushoverTry', {}); banner('PUSHOVER TRY!', '#ffe070', 2); return pushoverTry(win, x, y); }
        banner('SCRUM COLLAPSED!', '#ff6060', 1.2); return startPenalty(win, x, y, false);
      }
      scrumOut(win, x, y);
    }
  }
}
function pushoverTry(team, x, y) {
  const p = S.players.find(q => q.team === team && q.role === 3) || teamPlayers(team)[0];
  place(p, atkX(team) + S.dir[team] * 4, y); giveBall(p); scoreTry(p, 'pushover');
}
function scrumOut(win, x, y) {
  const sh = S.players.find(p => p.team === win && p.role === 3 && alive(p)) || teamPlayers(win)[0];
  for (const p of S.players) if (p.st === 'scrum') { p.st = 'run'; }
  const d = S.dir[win]; place(sh, x - d * 16, y); giveBall(sh); S.useIt = 3; S.useItMark = { x: sh.x, y: sh.y };
  spreadOut(win, x, y); setPhase('play'); S.sp = null; S.ruckMark = null; sh.facing = d > 0 ? 0 : Math.PI;
  for (const p of S.players) if (p.team !== win && alive(p)) { /* back off */ const dd = S.dir[p.team]; if ((p.x - x) * d < 20) p.x = x + d * 20; }
}
function spreadOut(team, x, y) { const d = S.dir[team]; for (const p of teamPlayers(team)) { if (p.role === 3 && S.ball.holder === p) continue; p.st = p.st === 'scrum' || p.st === 'lineout' ? 'run' : p.st; const slot = p.role - 3; p.x = clamp(x - d * (14 + Math.abs(slot) * 20), G.X0 - 60, G.X1 + 60); p.y = clamp(y + (slot) * 44, G.Y0 + 10, G.Y1 - 10); p.vx = p.vy = 0; p.facing = d > 0 ? 0 : Math.PI; } }

// ---------- lineout
function startLineout(throwTeam, x, y) {
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  const side = y < G.CY ? -1 : 1, ty = side < 0 ? G.Y0 : G.Y1, lx = clamp(x, G.X0 + 51, G.X1 - 51);
  ballTo(lx, ty, 'placed'); S.useIt = 0; S.adv = null; S.ruckMark = null; S.ball.z = 12;
  setPhase('lineout'); bus.emit('lineout', { team: throwTeam }); line('lineout'); banner('LINEOUT', '#ffffff', 1.2);
  S.sp = { type: 'lineout', throwTeam, x: lx, ty, side, step: 'call', t: 0, pods: [0, 1, 2], callT: -1, defT: -1, needle: 0, nd: 1, quality: -1, jump: 0, press: -1, arrive: 0, result: '', stepT: 0 };
  for (const t of [throwTeam, opp(throwTeam)]) {
    const P = teamPlayers(t), inward = -side;
    for (const p of P) { p.st = 'lineout'; p.flags = {}; p.vx = p.vy = 0;
      if (p.role <= 2) { const pod = p.role; place(p, lx + (pod - 1) * 16, ty + inward * (t === throwTeam ? 20 : 12), side < 0 ? Math.PI / 2 : -Math.PI / 2); p.st = 'lineout'; }
      else if (p.role === 3) place(p, lx + (t === throwTeam ? -22 : 22), ty + inward * 60, side < 0 ? Math.PI / 2 : -Math.PI / 2);
      else place(p, lx + (p.role - 5) * 60 * (t === throwTeam ? 1 : 1), ty + inward * (110 + (t === throwTeam ? 0 : 20)), side < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  const th = S.players.find(p => p.team === throwTeam && p.role === 1); place(th, lx, ty - side * 6, side < 0 ? Math.PI / 2 : -Math.PI / 2); th.st = 'lineout';
}
function stepLineout(dt) {
  const s = S.sp; s.t += dt; s.stepT += dt; const T = s.throwTeam, D = opp(T);
  const cycle = (cur, t) => { let c = cur; if (seatPress(t, 'l1')) c = (c + 2) % 3; if (seatPress(t, 'r1')) c = (c + 1) % 3; const a = seatAxis(t); if (!s.axisHold && Math.abs(a[1]) > .6) { c = (c + (a[1] > 0 ? 1 : 2)) % 3; s.axisHold = true; } if (Math.abs(a[1]) < .3) s.axisHold = false; return c; };
  if (s.step === 'call') {
    if (s.callT < 0) s.callT = 1; if (s.defT < 0) s.defT = 1; s.callPod = s.callPod === undefined ? 1 : s.callPod; s.defPod = s.defPod === undefined ? 1 : s.defPod;
    if (humanOn(T)) s.callPod = cycle(s.callPod, T); if (humanOn(D)) s.defPod = cycle(s.defPod, D);
    const ready = (!humanOn(T) || seatPress(T, 'x')) && (!humanOn(D) || seatPress(D, 'x') || s.t > 2.5);
    if (s.t > 2.5 || (ready && s.t > .5)) {
      if (!humanOn(T)) { const r = S.fx(); s.callPod = r < .4 ? 0 : r < .75 ? 1 : 2; }
      if (!humanOn(D)) { s.defPod = S.fx() < (S.cfg.lineoutRead || .35) ? s.callPod : (s.callPod + 1 + (S.fx() < .5 ? 0 : 1)) % 3; }
      s.step = 'throw'; s.stepT = 0; s.nd = 1; s.needle = 0; bus.emit('lineoutCall', {});
    }
  } else if (s.step === 'throw') {
    s.needle += s.nd * dt * 1.6; if (s.needle > 1) { s.needle = 1; s.nd = -1; } if (s.needle < 0) { s.needle = 0; s.nd = 1; }
    let stop = false;
    if (humanOn(T)) { if (seatPress(T, 'x')) stop = true; } else if (s.stepT > .7 + (S.fx() * 0 + .3)) stop = true;
    if (s.stepT > 3.2) stop = true;
    if (stop) {
      let off = Math.abs(s.needle - .5);
      if (!humanOn(T)) off = Math.min(off, U(S.fx, 0, .35 - .02 * (S.players[T * N + 1].hnd)));
      s.quality = off < .12 ? 1 : off < .25 ? .6 : 0;
      if (s.quality === 0) { s.result = 'NOT STRAIGHT!'; bus.emit('notStraight', {}); S.ref.call = 'NOT STRAIGHT!'; S.ref.callT = 1.4; banner('NOT STRAIGHT!', '#ff6060'); return finishLineout(D, 'scrum'); }
      s.step = 'jump'; s.stepT = 0; s.arrive = .75; s.jumper = S.players.find(p => p.team === T && p.role === s.callPod);
      s.dj = S.players.find(p => p.team === D && p.role === s.defPod); bus.emit('lineoutThrow', { q: s.quality });
    }
  } else if (s.step === 'jump') {
    const k = clamp(s.stepT / s.arrive, 0, 1); const jmp = s.jumper; if (jmp) { jmp.z = 60 * Math.sin(k * Math.PI * .5) * (1); }
    if (s.dj && s.defPod === s.callPod) { s.dj.z = 50 * Math.sin(k * Math.PI * .5); }
    if (humanOn(D) && s.press < 0 && seatPress(D, 'x')) s.press = s.stepT;
    if (s.stepT >= s.arrive) {
      let thrownWin = true;
      if (s.defPod === s.callPod) {
        const hndA = s.jumper ? s.jumper.hnd : 5, hndD = s.dj ? s.dj.hnd : 5;
        const atk = .6 * s.quality + .04 * hndA + .15;
        let timing = humanOn(D) ? (s.press < 0 ? 0 : clamp(1 - Math.abs(s.press - s.arrive) / .3, 0, 1)) : clamp(1 - Math.abs(U(S.fx, -1, 1) * (S.cfg.lineoutSigma || .2)) / .3, 0, 1);
        const def = .6 * timing + .04 * hndD; thrownWin = atk >= def;
      }
      if (!thrownWin) { banner('STOLEN!', '#ff8060', 1.2); addHype(D, 8); } else banner('INTO ORBIT!', '#80e0ff', 1);
      bus.emit(thrownWin ? 'lineoutWon' : 'lineoutStolen', { team: thrownWin ? T : D });
      if (thrownWin) addHype(T, 4);
      finishLineout(thrownWin ? T : D, 'ball');
    }
  }
}
function finishLineout(win, how) {
  const s = S.sp; for (const p of S.players) { p.z = 0; if (p.st === 'lineout') p.st = 'run'; }
  if (how === 'scrum') return startScrum(win, s.x, clamp(s.ty + (s.side < 0 ? 60 : -60), G.Y0 + 51, G.Y1 - 51));
  const sh = S.players.find(p => p.team === win && p.role === 3 && alive(p)) || teamPlayers(win)[0];
  const d = S.dir[win], y = s.ty + (s.side < 0 ? 40 : -40);
  place(sh, s.x - d * 10, y); giveBall(sh); S.useIt = 0; spreadOut(win, s.x, y); setPhase('play'); S.sp = null; if (S.cfg.mode === 'drill') S.counts.lineoutWon = (S.counts.lineoutWon || 0);
  for (const p of S.players) if (p.team !== win && alive(p) && (p.x - s.x) * d < 20) p.x = s.x + d * 24;
}

// ---------- penalty and free kick
function startPenalty(team, x, y, free) {
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  S.adv = null; S.useIt = 0; S.ruckMark = null; S.ball.holder = null;
  const mx = clamp(x, G.X0 + 20, G.X1 - 20), my = clamp(y, G.Y0 + 40, G.Y1 - 40);
  ballTo(mx, my, 'placed'); S.ball.z = 1;
  const kp = S.players.filter(p => p.team === team && alive(p)).sort((a, b) => b.kck - a.kck)[0];
  for (const p of S.players) { if (p.st === 'down' || p.st === 'ground' || p.st === 'getUp' || p.st === 'fall' || p.st === 'air') p.st = 'run'; p.vx = p.vy = 0; p.flags = {}; }
  const d = S.dir[team];
  for (const p of teamPlayers(team)) place(p, mx - d * (12 + p.role * 6), my + (p.role - 3) * 30);
  for (const p of teamPlayers(opp(team))) { const od = S.dir[opp(team)]; place(p, mx + d * (110 + p.role * 6), my + (p.role - 3) * 30); }
  place(kp, mx - d * 6, my);
  const dist = Math.hypot(atkX(team) - mx, my - G.CY);
  const opts = free ? ['TAP & GO', 'KICK FOR TOUCH'] : ['TAP & GO', 'KICK AT GOAL', 'KICK FOR TOUCH'];
  setPhase('penalty'); S.sp = { type: 'penalty', team, x: mx, y: my, kicker: kp.id, free, opts, sel: dist < 400 ? 1 : 0, t: 0, dist, axisHold: false };
  if (free) S.sp.sel = 0; bus.emit('penalty', { team, free });
}
function stepPenalty(dt) {
  const s = S.sp; s.t += dt; const T = s.team;
  let pick = null;
  if (humanOn(T)) {
    const a = seatAxis(T); let m = 0; if (!s.axisHold && Math.abs(a[0]) > .6) { m = a[0] > 0 ? 1 : -1; s.axisHold = true; } if (Math.abs(a[0]) < .3) s.axisHold = false;
    if (seatPress(T, 'l1')) m = -1; if (seatPress(T, 'r1')) m = 1;
    s.sel = clamp(s.sel + m, 0, s.opts.length - 1);
    if (s.t > .4 && seatPress(T, 'x')) pick = s.opts[s.sel];
    if (S.cfg.mode === 'attract') pick = s.t > 1 ? s.opts[s.sel] : null;
  } else if (s.t > 1.1) {
    const lead = S.score[T] - S.score[opp(T)], late = S.half === 2 && S.clock > TUNE.v.halfLength * .8;
    if (!s.free && s.dist < 320 && (Math.abs(lead) < 8 || late)) pick = 'KICK AT GOAL'; else if (Math.abs(atkX(T) - s.x) < 120) pick = 'TAP & GO'; else pick = 'KICK FOR TOUCH';
    if (s.free && Math.abs(atkX(T) - s.x) < 160) pick = 'TAP & GO';
  }
  if (!pick) return;
  const kp = S.players[s.kicker]; bus.emit('choice', { pick });
  if (pick === 'TAP & GO') { giveBall(kp); setPhase('play'); S.sp = null; for (const p of teamPlayers(opp(T))) { const d = S.dir[T]; if ((p.x - s.x) * d < 102) p.x = s.x + d * 102; } banner('TAP & GO!', '#ffe070', 1); }
  else if (pick === 'KICK AT GOAL') startConversion(T, kp, s.y, 'pen', s.x);
  else { giveBall(kp); const d = S.dir[T], ty = s.y < G.CY ? G.Y0 - 80 : G.Y1 + 80; setPhase('play'); S.sp = null; const aim = [d * .5, (ty - s.y) / 400]; doKick(kp, 'punt', .8, aim); S.touchKeep = T; }
}

// ---------- goal kicks: conversions and penalty goals
function startConversion(team, p, y, kind, px) {
  if (S.cfg.mode !== 'drill' && S.hooter && S.phase === 'try') { /* half may end after the kick */ }
  const atk = atkX(team), d = S.dir[team];
  let x, dist, ky = clamp(y, G.Y0 + 30, G.Y1 - 30);
  if (kind === 'conv') { dist = clamp(Math.abs(atk - (p ? p.x : atk)) + 60, 51, 400); x = atk - d * dist; if (Math.abs(ky - G.CY) > 250) ky = G.CY + Math.sign(ky - G.CY) * 250; }
  else { x = px; dist = Math.abs(atk - x); }
  const kp = S.players.filter(q => q.team === team && alive(q)).sort((a, b) => b.kck - a.kck)[0] || p;
  S.adv = null; S.ruckMark = null; S.useIt = 0;
  for (const q of S.players) { if (q.st === 'celebrate' || q.st === 'ground' || q.st === 'down' || q.st === 'getUp') q.st = 'run'; q.vx = q.vy = 0; q.flags = {}; }
  for (const q of teamPlayers(team)) place(q, x - d * 40 - q.role * 8, ky + (q.role - 3) * 26);
  for (const q of teamPlayers(opp(team))) place(q, atk + d * 90 - d * 20 * (q.role % 3), G.CY + (q.role - 3) * 26);
  place(kp, x - d * 12, ky, d > 0 ? 0 : Math.PI);
  ballTo(x, ky, 'placed'); S.ball.z = 3;
  setPhase('kick'); S.sp = { type: 'kick', kind, team, kicker: kp.id, x, y: ky, dist, step: kind === 'conv' ? 'place' : 'aim', t: 0, shot: 20, aimX: 0, sway: 0, power: 0, charging: false, fly: 0, res: '', ox: x, tickLow: false, drift: S.wind * S.windDir };
  S.score_before = S.score.slice();
}
function kickNeed(dist) { return clamp(dist / (TUNE.v.kickMax * .95), .3, 1); }
function stepGoalKick(dt) {
  const s = S.sp, T = s.team, d = S.dir[T], kp = S.players[s.kicker]; s.t += dt;
  const hum = humanOn(T);
  if (s.step === 'place' || s.step === 'aim' || s.step === 'power') s.shot -= dt;
  if (s.step === 'place') {
    if (hum) { const a = seatAxis(T); s.dist = clamp(s.dist + (-a[0] * d) * 120 * dt, 51, 400); s.x = atkX(T) - d * s.dist; ballTo(s.x, s.y, 'placed'); S.ball.z = 3; place(kp, s.x - d * 12, s.y, d > 0 ? 0 : Math.PI); if (seatPress(T, 'x') || S.cfg.mode === 'attract' && s.t > 1.2) { s.step = 'aim'; s.t = 0; } if (seatPress(T, 'ci')) { s.step = 'aim'; s.t = 0; } }
    else if (s.t > .6) { s.step = 'aim'; s.t = 0; }
  } else if (s.step === 'aim') {
    const sway = Math.sin(s.t * 2.2) * (1.2 - kp.kck * .08) * (S.cfg.swayMult || 1) * .12 * (1 + (S.cfg.mode === 'cup' ? .2 : 0)); s.sway = sway;
    if (hum) { const a = seatAxis(T); s.aimX = clamp(s.aimX + a[1] * 1.0 * dt * (d > 0 ? 1 : -1), -.5, .5); s.aimX = clamp(s.aimX + a[0] * 0, -.5, .5); if (seatHeld(T, 'hci') && !s.charging) { s.charging = true; s.step = 'power'; s.pt = 0; } if (S.cfg.mode === 'attract' && s.t > 1.2) { s.step = 'power'; s.pt = 0; s.charging = true; s.auto = true; } }
    else if (s.t > 1.0) { s.step = 'power'; s.pt = 0; s.charging = true; s.cpu = true; }
    if (s.shot <= 0) { return goalKickFail('NO TIME!'); }
  } else if (s.step === 'power') {
    s.pt += dt; s.power = clamp(s.pt / 1.3, 0, 1);
    let rel = false;
    if (s.cpu || s.auto) { const need = kickNeed(s.dist); if (s.power >= need + (S.fx() * 0 + .03)) rel = true; s.cpuErr = s.cpuErr === undefined ? (S.fx() - .5) * (.5 - kp.kck * .03) : s.cpuErr; }
    else if (!seatHeld(T, 'hci') || seatPress(T, 'rci') || s.power >= 1) rel = true;
    if (rel) executeGoalKick();
    if (s.shot <= 0 && !rel) goalKickFail('NO TIME!');
  } else if (s.step === 'fly') {
    s.fly += dt; const k = clamp(s.fly / s.T, 0, 1), b = S.ball;
    b.x = lerp(s.sx, s.ex, k); b.y = lerp(s.sy, s.ey, k); b.z = 3 + (s.ez - 3) * k + 4 * s.apex * k * (1 - k); b.rot += 12 * dt;
    if (k >= 1) finishGoalKick();
  } else if (s.step === 'done') { if (s.t2 === undefined) s.t2 = 0; s.t2 += dt; if (s.t2 > 1.3) afterGoalKick(); }
}
function executeGoalKick() {
  const s = S.sp, kp = S.players[s.kicker], T = s.team, d = S.dir[T], need = kickNeed(s.dist);
  const toPosts = Math.atan2(G.CY - s.y, Math.abs(atkX(T) - s.x)); // angle off the pitch axis toward the middle of the posts
  let hook = 0; const miss = Math.abs(s.power - need);
  if (miss > .06) hook = (S.rng() * 2 - 1) * (12 - kp.kck) * Math.PI / 180 * (1 + miss * 2);
  if (kp.power === 'boot' || (S.players.some(q => q.team === T && q.power === 'boot'))) { hook *= .5; }
  let aimOff = s.aimX * .22; if (s.cpu) aimOff = (s.cpuErr || 0) * (1 - kp.kck * .06) * (s.dist / 300) * (S.cfg.kickErr || 1);
  const wind = s.drift * 6 * TUNE.v.windMult * Math.PI / 180 * (s.dist / 250);
  const ang = toPosts + aimOff + s.sway + hook + wind * 0;
  const dxp = Math.abs(atkX(T) - s.x), yc = s.y + Math.tan(ang) * dxp * Math.sign(1) + wind * dxp * .4;
  let res = 'good';
  if (s.power < need - .06) res = 'short'; else if (Math.abs(Math.abs(yc - G.CY) - G.POST) < 4) res = 'doink'; else if (Math.abs(yc - G.CY) > G.POST) res = 'wide';
  const ex = atkX(T) + d * (res === 'short' ? -Math.max(10, (need - s.power) * 300) : 6);
  Object.assign(s, { step: 'fly', sx: s.x, sy: s.y, ex: res === 'short' ? s.x + d * Math.max(40, s.dist * (s.power / need)) : ex, ey: res === 'short' ? s.y + (yc - s.y) * .6 : yc, ez: res === 'short' ? 0 : res === 'good' ? 70 : 60, apex: 70, T: .9 + s.dist / 500, fly: 0, res, t: 0 });
  S.ball.st = 'scripted'; S.ball.holder = null; kp.am = 'kick'; kp.amT = 0; S.ball.rotV = 10;
  bus.emit('kick', { id: kp.id, kind: 'goal', dist: s.dist });
}
function finishGoalKick() {
  const s = S.sp, T = s.team; s.step = 'done'; s.t2 = 0;
  const b = S.ball; b.z = s.res === 'good' ? 60 : 0;
  if (s.res === 'good') {
    const pts = s.kind === 'conv' ? 2 : 3; S.stats[T].convs += s.kind === 'conv' ? 1 : 0; banner(s.kind === 'conv' ? 'CONVERSION! +2' : 'PENALTY GOAL! +3', '#80ff80', 1.6);
    bus.emit(s.kind === 'conv' ? 'conversion' : 'penaltyGoal', { team: T }); line('conversion'); addHype(T, 5); s.pts = pts; s.scored = true; if (s.kind === 'conv') S.stats[T].convTries++;
  } else { banner(s.res === 'doink' ? 'DOINK!' : s.res === 'short' ? 'SHORT!' : 'WIDE!', '#ff8080', 1.4); line('miss'); bus.emit('goalMiss', { res: s.res }); if (s.kind === 'conv') S.stats[T].convTries++; }
  b.st = 'dead';
}
function goalKickFail(msg) { const s = S.sp; banner(msg, '#ff8080', 1.2); s.res = 'miss'; s.step = 'done'; s.t2 = 0; if (s.kind === 'conv') S.stats[s.team].convTries++; bus.emit('goalMiss', { res: 'clock' }); }
function afterGoalKick() {
  const s = S.sp, T = s.team; let pts = s.scored ? s.pts : 0;
  if (pts && afterScore(T, pts)) return;
  if (S.cfg.mode === 'drill') { return drillAfterKick(); }
  if (checkHalf()) return;
  doKickoff(s.kind === 'conv' ? T : opp(T));
}
function drillAfterKick() { S.sp = null; startDrill(S.cfg.drill); }

// ---------- kick-offs and drop-outs
function stepKickoff(dt) {
  const s = S.sp; s.t += dt; const T = s.team, kp = S.players[s.kicker], d = S.dir[T];
  const hum = humanOn(T);
  if (hum && S.cfg.mode !== 'attract') {
    const a = seatAxis(T); s.aim.x = clamp(s.aim.x + a[0] * dt * 2 * d, -1, 1); s.aim.y = clamp(s.aim.y + a[1] * dt * 1.6, -1, 1);
    if (seatHeld(T, 'hci')) s.power = clamp(s.power + dt / .9, 0, 1); else if (s.power > 0) { return kickOffNow(s.power); }
    if (s.t > 25) return kickOffNow(.6);
  } else if (s.t > 1.4) { s.aim.y = U(S.fx, -.9, .9); return kickOffNow(U(S.fx, .35, .6)); }
}
function kickOffNow(power) {
  const s = S.sp, T = s.team, d = S.dir[T], kp = S.players[s.kicker], R = opp(T);
  const ox = s.dropout ? s.x : G.CX, dist = s.dropout ? lerp(180, 520, power) : lerp(110, 400, power) * (.8 + .02 * kp.kck), tx = ox + d * dist, ty = clamp(G.CY + s.aim.y * 220, G.Y0 + 30, G.Y1 - 30);
  const b = S.ball; const flight = 1.1 + power * .7;
  b.holder = null; b.st = 'kick'; b.x = ox; b.y = s.dropout ? s.y : G.CY; b.z = 8; b.vx = (tx - b.x) / flight; b.vy = (ty - b.y) / flight; b.vz = (300 * flight * flight * 0 + 0.5 * 600 * flight - 8 / flight); b.vz = (0 - 8 + 300 * flight * flight) / flight; b.rotV = 10; b.kind = 'kickoff'; b.lastKicker = kp.id; b.kickT = 0;
  kp.am = 'kick'; kp.amT = 0; S.lastTeam = T; S.lastTouch = kp.id; S.poss = -1; S.kickInfo = { x: tx, y: ty, t: S.t, T: flight };
  const short = !s.dropout && dist < 102; setPhase('play'); S.sp = null; for (const p of S.players) if (p.st === 'scrum') p.st = 'run';
  bus.emit('kick', { id: kp.id, kind: 'kickoff', dist });
  if (short) { S.kickShort = true; banner('NOT TEN!', '#ff8060', 1.4); bus.emit('notTen', {}); freeKickAtHalfway(R); }
  S.firstTouchGuard = 0;
}
function freeKickAtHalfway(R) { const b = S.ball; const p = S.players.filter(q => q.team === R && alive(q))[0]; ballTo(G.CX, G.CY, 'placed'); startPenalty(R, G.CX, G.CY, true); }
function startDropOut(team) {
  const x = ownX(team) + S.dir[team] * 225, d = S.dir[team];
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  const kp = kickerOf(team), rec = opp(team);
  S.ball.holder = null; S.adv = null; S.useIt = 0; S.ruckMark = null;
  for (const p of S.players) { if (p.st === 'down' || p.st === 'ground' || p.st === 'getUp' || p.st === 'fall' || p.st === 'air') p.st = 'run'; p.flags = {}; }
  for (const p of teamPlayers(team)) place(p, x - d * (8 + (p.role === 4 ? 0 : 30 + p.role * 8)), G.CY + (p.role - 3) * 48, d > 0 ? 0 : Math.PI);
  place(kp, x - d * 6, G.CY, d > 0 ? 0 : Math.PI);
  for (const p of teamPlayers(rec)) place(p, x + d * (120 + p.role * 14), G.CY + (p.role - 3) * 54, d < 0 ? 0 : Math.PI);
  ballTo(x, G.CY, 'placed'); S.ball.z = 2; setPhase('kickoff');
  S.sp = { type: 'kickoff', team, kicker: kp.id, aim: { x: 0, y: 0 }, power: 0, t: 0, dropout: true, x, y: G.CY };
  banner('22 DROP-OUT', '#ffffff', 1.4); bus.emit('dropOut', { team });
}

/* ==== 23-main.js ==== */
/* THUGBY TURBO — the match step: control, player actions, phases, hazards, power-ups, referee. */
TUNE.add('scrumPush', 'Scrum push', 'Laws', .05, .01, .15, .01, '');
TUNE.add('catchPressure', 'Catch pressure', 'Ball', .12, 0, .4, .01, '');

function assignControl(dt) {
  for (const p of S.players) p.ctl = -1;
  const used = new Set();
  S.seats.forEach((seat, i) => {
    if (seat.kind === 'cpu') return;
    const T = seat.team, b = S.ball; let cur = seat.pid >= 0 ? S.players[seat.pid] : null;
    seat.swT = (seat.swT || 0) - dt;
    const ok = q => q && q.team === T && alive(q) && !used.has(q.id) && !q.heldByOther;
    const mates = S.players.filter(q => ok(q) && q.st !== 'ground' && q.st !== 'down' && q.st !== 'scrum' && q.st !== 'lineout' || (ok(q) && S.phase !== 'play'));
    const focus = b.holder || b;
    const nearest = () => { let best = null, bd = 1e9; for (const q of S.players) { if (!ok(q) || ['ground', 'down', 'air', 'fall', 'celebrate'].includes(q.st) && S.phase === 'play') continue; const d = Math.hypot(q.x - focus.x, q.y - focus.y) + (q.role === 3 && false ? 0 : 0); if (d < bd) { bd = d; best = q; } } return best; };
    if (!ok(cur)) cur = nearest() || S.players.find(ok);
    if (b.holder && b.holder.team === T && ok(b.holder) && cur !== b.holder && (seat.lastPoss !== T || S.phase !== 'play')) cur = b.holder;
    else if (b.holder && b.holder.team === T && ok(b.holder) && S.seats.filter(s => s.team === T && s.kind !== 'cpu').length === 1) cur = b.holder;
    else if (b.holder && b.holder.team === T && ok(b.holder)) { const others = S.seats.some((s2, j) => j !== i && s2.team === T && s2.kind !== 'cpu' && s2.pid === b.holder.id); if (!others && i === S.seats.findIndex(s2 => s2.team === T && s2.kind !== 'cpu')) cur = b.holder; }
    seat.lastPoss = b.holder ? b.holder.team : -1;
    if (S.sp && S.sp.team === T && S.sp.kicker !== undefined && (S.phase === 'kickoff' || S.phase === 'kick' || S.phase === 'penalty')) cur = S.players[S.sp.kicker];
    const I = S.seatI[i] || emptyIntent();
    // manual switching
    if (S.phase === 'play' && !(b.holder && b.holder.team === T && b.holder === cur)) {
      const list = S.players.filter(q => ok(q) && q.team === T).sort((a, c) => a.y - c.y), k = list.indexOf(cur);
      if (I.l1 && k > 0) { cur = list[k - 1]; seat.swT = 1.2; } else if (I.r1 && k >= 0 && k < list.length - 1) { cur = list[k + 1]; seat.swT = 1.2; }
      if (I.ci) { const n = nearest(); if (n) { cur = n; seat.swT = 1; } }
      if (I.click >= 0 && S.players[I.click] && ok(S.players[I.click]) && S.players[I.click].team === T) { cur = S.players[I.click]; seat.swT = 1.2; }
      if (TT.settings.autoSwitch !== 'Manual' && seat.swT <= 0 && !(b.holder && b.holder.team === T)) {
        const n = nearest(); if (n && n !== cur) { const dn = Math.hypot(n.x - focus.x, n.y - focus.y), dc = Math.hypot(cur.x - focus.x, cur.y - focus.y); if (TT.settings.autoSwitch === 'Full' ? dn < dc - 6 : dn < dc - 40 && (b.st === 'kick' || b.st === 'pass' || b.st === 'loose' || !b.holder || dc > 90)) { cur = n; seat.swT = .7; } }
      }
    }
    seat.pid = cur ? cur.id : -1; if (cur) { cur.ctl = i; used.add(cur.id); }
  });
}

function actPlayer(p, I, dt) {
  const b = S.ball, hasBall = b.holder === p;
  for (const k in p.cd) p.cd[k] -= dt;
  p.evade -= dt; p.fend -= dt; p.amT += dt; p.reactT -= dt; p.heldT -= dt; p.grease -= dt; p.iron -= dt; p.onFire -= p.onFire > 0 ? dt : 0; p.power === 'pie' && (p.powerT -= dt) <= 0 && (p.power = null);
  if (p.superKind) { p.superT -= dt; if (p.superT <= 0) endSuper(p); }
  if (p.onFire > 0) { p.turbo = TUNE.v.turboTank; if (p.onFire <= 0) bus.emit('fireOut', { id: p.id }); }
  p.flags.holdX = I.hx; p.smoke = Math.max(0, p.smoke - dt);
  if (p.st === 'diving') { p.vx = Math.cos(p.facing) * 170; p.vy = Math.sin(p.facing) * 170; const car = b.holder; if (car && car.team !== p.team && dist2(p, car) < 14 && !p.diveHit) { p.diveHit = true; tackleAttempt(p, 'dive', 0); } if (p.stT <= 0 && p.st === 'diving') { p.st = 'ground'; p.stT = p.diveHit ? .6 : 1.2; } return; }
  if (p.st !== 'run' && p.st !== 'charge') { return; }
  const I2 = I;
  if (p.superKind === 'hurricane') {
    const car = b.holder; if (car && car.team !== p.team) { const a = Math.atan2(car.y - p.y, car.x - p.x); I2.mx = Math.cos(a); I2.my = Math.sin(a); I2.turbo = true; if (dist2(p, car) < 12) { endSuperAfterHit(p, car); return; } } else { endSuper(p); }
  }
  if (hasBall) {
    if (I.x) { if (inGoalOf(p)) groundBall(p, true); else doSidestep(p, I2); }
    if (I.sq) doFend(p);
    // passing
    if (I.l1 || I.r1) { p.passSide = I.l1 ? -1 : 1; p.passHold = .001; }
    if (p.passSide) { const held = p.passSide < 0 ? I.hl1 : I.hr1; if (held) p.passHold += dt; if (!held || p.passHold > .25) { const long = p.passHold > .25; const r = bestReceiver(p, p.passSide, long); if (p.passSide) { if (r) doPass(p, r, long); else doDummy(p); } p.passSide = 0; p.passHold = 0; } }
    if (I.click >= 0 && S.players[I.click] && S.players[I.click].team === p.team) { const r = S.players[I.click]; doPass(p, r, dist2(p, r) > 130); }
    // kicking
    if (I.hci) { p.ciHold += dt; p.kickMeter = clamp(p.ciHold / .9, 0, 1); }
    if (I.rci) { const hold = p.ciHold; p.ciHold = 0; p.kickMeter = 0; if (hold > 0) doKickFrom(p, I, hold); }
    if (I.tri) useSuper(p);
    if (!hasBall) return;
  } else {
    p.ciHold = 0; p.passSide = 0;
    if (I.hx) { p.xHold += dt; if (p.xHold > .18) p.st = 'charge'; } 
    if (I.rx || (!I.hx && p.xHold > 0)) {
      const h = p.xHold; p.xHold = 0; if (p.st === 'charge') p.st = 'run';
      const car = b.holder;
      if (car && car.team !== p.team) {
        if (h > .18) { const ch = clamp(h / TUNE.v.bigHitCharge, 0, 1); if (h > 1.2 && dist2(p, car) < 20 && Math.abs(angDiff(Math.atan2(car.y - p.y, car.x - p.x), p.facing)) < 1) { tackleAttempt(p, 'big', .5); if (S.ball.holder !== car || car.st === 'air') foul(p, 'high'); else foul(p, 'high'); } else if (dist2(p, car) < 20) tackleAttempt(p, 'big', ch); else { p.st = 'fall'; p.stT = 1.0; p.am = 'bighit'; p.amT = 0; bus.emit('missedBig', { id: p.id }); } }
        else if (!tackleAttempt(p, 'tackle', 0)) cheapShot(p);
      } else cheapShot(p, true);
    }
    if (I.sq) {
      const car = b.holder;
      if (S.phase === 'ruck' && S.sp && S.sp.type === 'ruck') { /* handled by ruck */ }
      else { p.st = 'diving'; p.stT = .35; p.diveHit = false; p.am = 'dive'; p.amT = 0; }
    }
    if (I.tri) useSuper(p);
  }
  // ball pick when loose
}
function endSuperAfterHit(p, car) { tackleAttempt(p, 'super', 1); for (const q of S.players) if (q !== p && alive(q) && dist2(q, car) < 30 && standing(q)) { q.st = 'fall'; q.stT = 1; } endSuper(p); }
function cheapShot(p, loose) {
  const o = nearestOpp(p, TUNE.v.tackleRange, q => standing(q) && q !== S.ball.holder);
  if (!o) return; if (Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), p.facing)) > 1.2) return;
  p.am = 'bash'; p.amT = 0; o.st = 'ground'; o.stT = 1.6; o.vx = Math.cos(p.facing) * 80; o.vy = Math.sin(p.facing) * 80; bus.emit('cheapShot', { by: p.id, on: o.id }); TT.hitFx && TT.hitFx(o, .5);
  foul(p, 'cheap');
}
function groundBall(p, dive) {
  if (S.ball.holder !== p || !inGoalOf(p)) return; if (dive) { p.am = 'dive'; p.amT = 0; addHype(p.team, 3); p.vx = Math.cos(p.facing) * 60; p.vy = Math.sin(p.facing) * 60; p.st = 'ground'; p.stT = 1.2; }
  scoreTry(p, 'grounded');
}
function doKickFrom(p, I, hold) {
  const d = S.dir[p.team]; let aim = null;
  if (I.aim) { const dx = I.aim[0] - p.x, dy = I.aim[1] - p.y, m = Math.hypot(dx, dy) || 1; aim = [dx / m, dy / m]; }
  else if (Math.hypot(I.mx, I.my) > .3) aim = [I.mx, I.my];
  const back = aim && aim[0] * d < -.5;
  if (hold < .2) return doKick(p, 'grubber', 0, aim);
  const power = clamp(hold / .9, 0, 1);
  const nearPosts = Math.abs(atkX(p.team) - p.x) < 225 || (Math.abs(atkX(p.team) - p.x) < 300 && Math.abs(p.y - G.CY) < 100);
  if (back) return doKick(p, 'bomb', power, aim);
  if (nearPosts && (!aim || aim[0] * d > -.2) && (!aim || Math.abs(aim[1]) < .8)) { const dx = atkX(p.team) - p.x, dy = G.CY - p.y + (aim ? aim[1] * 14 : 0), m = Math.hypot(dx, dy) || 1; doKick(p, 'punt', Math.max(.55, power), [dx / m, dy / m]); S.ball.drop = true; S.ball.dropFrom = p.id; return; }
  doKick(p, 'punt', power, aim);
}

// ---------- ball vs players, out of play, tries
function pickups() {
  const b = S.ball; if (b.st !== 'loose' && b.st !== 'dead') return; if (b.st === 'dead') return;
  if (b.z > 9) return; const sp = Math.hypot(b.vx, b.vy);
  let best = null, bd = sp > 210 ? 4.5 : 9;
  for (const q of S.players) if (standing(q) && (q.st === 'run' || q.st === 'charge')) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < bd) { bd = d; best = q; } }
  if (!best) return;
  const runSp = Math.hypot(best.vx, best.vy);
  const ig = inGoalNow(b);
  if (ig && ig !== 0) { const att = S.dir[0] > 0 ? (ig > 0 ? 0 : 1) : (ig > 0 ? 1 : 0); giveBall(best); if (best.team === att) { return scoreTry(best, 'loose'); } else { bus.emit('forcedDeadBall', {}); return startDropOut(best.team); } }
  if (runSp > TUNE.v.runSpeed * .95 && best.hnd < 8 && S.rng() < .08 && (best.team === S.lastTeam)) { giveBall(best); S.ball.holder = null; b.st = 'loose'; return knockOn(best); }
  giveBall(best); bus.emit('pickup', { id: best.id });
}
const inGoalNow = b => b.x > G.X1 + 1 ? 1 : b.x < G.X0 - 1 ? -1 : 0;
function checkOut() {
  const b = S.ball, h = b.holder;
  if (h) {
    if (inGoalOf(h)) {
      h.groundT = (h.groundT || 0) + .0; 
    }
    if ((h.y < G.Y0 - 1 || h.y > G.Y1 + 1) && S.phase === 'play') {
      if (inGoalOf(h) && false) return; return touchOut(h.x, h.y, opp(h.team));
    }
    // dead-ball line while carrying
    if (h.x < G.X0 - G.ING + 2 || h.x > G.X1 + G.ING - 2) { if (!h.groundedTry) { scoreTry(h, 'deadline'); } }
    return;
  }
  if (b.st === 'scripted' || b.st === 'placed' || b.st === 'dead') return;
  if (b.y < G.Y0 || b.y > G.Y1) { if (b.x > G.X0 - G.ING && b.x < G.X1 + G.ING) { const tk = S.touchKeep !== undefined && S.touchKeep >= 0 ? S.touchKeep : opp(S.lastTeam); S.touchKeep = -1; return touchOut(b.x, b.y, tk); } }
  if (b.x < G.X0 - G.ING || b.x > G.X1 + G.ING) {
    const end = b.x > G.X1 ? 1 : -1, att = S.dir[0] === end ? 0 : 1, def = opp(att);
    if (S.lastTeam === att) { bus.emit('deadBall', {}); return startDropOut(def); }
    return startScrumAt(att, end > 0 ? G.X1 - 51 : G.X0 + 51, clamp(b.y, G.Y0 + 51, G.Y1 - 51), '5M SCRUM');
  }
}
function touchOut(x, y, throwTeam) {
  bus.emit('touch', { x, y, team: throwTeam }); S.ref.sig = 'touch'; S.ref.sigT = 1.2; S.stats[opp(throwTeam)].touchOuts = 0;
  if (S.cfg.mode === 'drill' && S.drillDef && S.drillDef.id === 'kick') { return; }
  startLineout(throwTeam, x, y < G.CY ? G.Y0 : G.Y1);
}
function stepDropGoal() {
  const b = S.ball; if (!b.drop || b.st !== 'kick') return; const kp = S.players[b.dropFrom], T = kp.team, ax = atkX(T), d = S.dir[T];
  if ((b.x - ax) * d >= 0 && b.vx * d > 0) {
    b.drop = false;
    if (b.z > G.CROSS && Math.abs(b.y - G.CY) < G.POST) { bus.emit('dropGoal', { team: T, id: kp.id }); banner('DROP GOAL! +3', '#80ff80', 2); addHype(T, 10); S.replayReq = 'drop'; if (afterScore(T, 3)) return; setPhase('goalscored'); S.sp = { t: 0, team: T }; S.ball.vx *= .2; S.ball.vy *= .2; }
  }
}

// ---------- ruck
function stepRuck(dt) {
  const s = S.sp; s.t += dt; const A = s.team, D = opp(A), mark = { x: s.x, y: s.y };
  const car = S.players[s.carrier], tk = S.players[s.tackler];
  const toward = (p, x, y, sp = 150) => { const dx = x - p.x, dy = y - p.y, m = Math.hypot(dx, dy); if (m > 3) { p.x += dx / m * Math.min(m, sp * dt); p.y += dy / m * Math.min(m, sp * dt); p.facing = Math.atan2(mark.y - p.y, mark.x - p.x); } };
  // commit
  const dA = S.dir[A];
  s.att.forEach((id, k) => { const p = S.players[id]; if (standing(p)) { p.st = 'run'; toward(p, mark.x - dA * (10 + k * 4), mark.y + (k ? 8 : -8)); p.flags.ruck = true; } });
  s.def.forEach((id, k) => { const p = S.players[id]; if (standing(p)) toward(p, mark.x + dA * (10 + k * 4), mark.y + (k ? -8 : 8)); });
  // humans join by running into the zone
  for (const p of S.players) if (p.ctl >= 0 && standing(p) && !s.att.includes(p.id) && !s.def.includes(p.id) && Math.hypot(p.x - mark.x, p.y - mark.y) < 16 && p !== car) { (p.team === A ? s.att : s.def).push(p.id); }
  // jackal
  if (s.t < .35 && !s.jack) {
    const first = S.players[s.first];
    if (first && first.team === D && (first.ctl >= 0 ? S.seatI[first.ctl] && S.seatI[first.ctl].sq : (s.t > .15 && S.fx() < .02 * TUNE.v.aiAggression))) { s.jack = true; s.bar -= .5; banner('JACKAL!', '#ff9060', 1); bus.emit('jackal', {}); addHype(D, 8); }
  }
  for (const i of [0, 1]) { const seatP = S.seats.findIndex((x, j) => x.team === D && S.seatI[j] && S.seatI[j].sq && S.players[x.pid] && !s.def.includes(x.pid) && S.players[x.pid] && Math.hypot(S.players[x.pid].x - mark.x, S.players[x.pid].y - mark.y) < 30); if (seatP >= 0 && s.t > .4 && !s.handsDone) { s.handsDone = true; foul(S.players[S.seats[seatP].pid], 'hands'); return; } break; }
  // bar
  const powA = s.att.reduce((a, id) => a + S.players[id].pow, 0) + car.pow * .3, powD = s.def.reduce((a, id) => a + S.players[id].pow, 0);
  s.bar += dt * (.02 * powA - .02 * powD) * 1;
  for (const t of [A, D]) {
    const sgn = t === A ? 1 : -1;
    if (humanOn(t)) s.bar += sgn * seatPress(t, 'x') * .05; else s.bar += sgn * dt * (t === D ? TUNE.v.cpuMash * (S.cfg.mashMult || 1) : TUNE.v.cpuMash * .9) * .05 * U(S.fx, .8, 1.2) * .33;
  }
  s.bar = clamp(s.bar, -1.5, 1.5);
  if (s.t >= 1.6) {
    for (const p of S.players) { p.flags.ruck = false; }
    const attWin = s.bar >= 0; const b = S.ball;
    if (attWin) {
      bus.emit('ruckWon', { team: A }); addHype(A, 2);
      let rec = S.players.find(p => p.team === A && p.role === 3 && standing(p) && Math.hypot(p.x - mark.x, p.y - mark.y) < 140) || s.att.map(i => S.players[i]).find(standing) || S.players.filter(p => p.team === A && standing(p)).sort((a, c) => dist2(a, mark) - dist2(c, mark))[0];
      if (rec) { place(rec, mark.x - dA * 10, mark.y, dA > 0 ? 0 : Math.PI); giveBall(rec); S.useIt = 3; S.useItMark = { x: rec.x, y: rec.y }; S.ruckExit = { x: mark.x, y: mark.y, team: A }; }
    } else {
      bus.emit('turnover', { team: D }); bus.emit('ruckWon', { team: D, turnover: true }); S.stats[D].turnovers++; addHype(D, 8); banner('TURNOVER!', '#ff9060', 1.3);
      const rec = S.players.filter(p => p.team === D && standing(p)).sort((a, c) => dist2(a, mark) - dist2(c, mark))[0]; if (rec) { place(rec, mark.x + dA * 10, mark.y, dA > 0 ? Math.PI : 0); giveBall(rec); S.ruckExit = null; }
    }
    // offside: defenders behind the ball line near the ruck
    if (attWin && !S.dev.noFouls) { for (const p of S.players) if (p.team === D && standing(p) && !s.def.includes(p.id) && (p.x - mark.x) * dA < -6 && dist2(p, mark) < 40 && !S.ref.down) { foul(p, 'offside'); if (S.phase === 'penalty') { s.t = 0; return; } break; } }
    if (S.phase === 'ruck') { setPhase('play'); S.sp = null; }
    if (S.hooter) checkHalf();
  }
}

// ---------- hazards and extras
function stepArcade(dt) {
  const R = S.rng, hz = S.cfg.mode === 'drill' ? 0 : TUNE.v.hazardEvery, v = S.venue.hazard;
  S.refDownT = Math.max(0, S.refDownT - dt);
  if (S.ref.down > 0) { S.ref.down -= dt; if (S.ref.down <= 0) { S.ref.st = 'run'; bus.emit('refUp', {}); } }
  // power-ups
  S.puT -= dt; if (S.puT <= 0 && S.powerups.length === 0 && S.cfg.mode !== 'drill') {
    S.puT = TUNE.v.powerupEvery + U(R, -10, 10); const kinds = Object.keys(POWERUPS), k = kinds[Math.floor(R() * kinds.length)], b = S.ball;
    let x, y, tries = 0; do { x = clamp(b.x + U(R, -300, 300), G.X0 + 60, G.X1 - 60); y = U(R, G.Y0 + 60, G.Y1 - 60); tries++; } while (Math.hypot(x - b.x, y - b.y) < 80 && tries < 10);
    const sx = x + U(R, -40, 40), sy = G.Y0 - 36; S.powerups.push({ kind: k, x: sx, y: sy, z: 60, tx: x, ty: y, t: 0, T: 1.1, life: 15, landed: false, sx, sy }); bus.emit('powerupThrow', { kind: k });
  }
  for (const u of S.powerups) {
    if (!u.landed) { u.t += dt; const k = clamp(u.t / u.T, 0, 1); u.x = lerp(u.sx, u.tx, k); u.y = lerp(u.sy, u.ty, k); u.z = 4 * 80 * k * (1 - k) + 2; if (k >= 1) { u.landed = true; u.z = 0; } }
    else { u.life -= dt; for (const p of S.players) if (standing(p) && Math.hypot(p.x - u.x, p.y - u.y) < 10) { takePowerup(p, u); break; } }
  }
  S.powerups = S.powerups.filter(u => u.life > 0 && !u.taken);
  // hazards
  if (hz > 0) {
    if (v === 'wind') { S.windT -= dt; if (S.windT <= 0) { S.windT = U(R, 15, 25); S.wind = R(); S.windDir = R() < .5 ? -1 : 1; } 
      S.chickT -= dt / hz; if (S.chickT <= 0 && !S.chicken && S.phase === 'play') { S.chickT = U(R, 50, 70); const x = U(R, G.X0 + 200, G.X1 - 200), dir = R() < .5 ? 1 : -1; S.chicken = { x, y: dir > 0 ? G.Y0 - 30 : G.Y1 + 30, dir, t: 0, vx: U(R, -25, 25) }; banner('CAPTAIN CLUCKY INVADES!', '#ffff60', 2); line('chicken'); bus.emit('hazard', { kind: 'chicken' }); } }
    if (v === 'flames') {
      S.jetT = (S.jetT === undefined ? 3 : S.jetT) - dt * hz; if (S.jetT <= 0 && S.phase === 'play') { S.jetT = U(R, 1.8, 3.2); const j = S.jets[Math.floor(R() * S.jets.length)]; if (j.st === 0) { j.st = 1; j.t = 0; const nb = S.jets[(S.jets.indexOf(j) + 1) % S.jets.length]; if (nb.st === 0 && R() < .5) { nb.st = 1; nb.t = 0; } bus.emit('hazardWarn', { kind: 'flame' }); } }
    }
    if (v === 'lightning' && S.cfg.mode !== 'drill') {
      S.strikeT -= dt * hz; if (S.strikeT <= 0 && !S.strike && S.phase === 'play') { S.strikeT = U(R, 20, 30); const b = S.ball, a = R() * TAU, r = U(R, 60, 200); S.strike = { x: clamp(b.x + Math.cos(a) * r, G.X0, G.X1), y: clamp(b.y + Math.sin(a) * r, G.Y0, G.Y1), t: 0, hit: false }; banner('LIGHTNING!', '#c0e0ff', 1.4); line('lightning'); bus.emit('hazardWarn', { kind: 'lightning' }); }
    }
  }
  for (const j of S.jets) { if (j.st) { j.t += dt; if (j.st === 1 && j.t > 1) { j.st = 2; j.t = 0; bus.emit('hazard', { kind: 'flame' }); line('flame'); } else if (j.st === 2) { for (const p of S.players) if (alive(p) && p.z < 4 && Math.hypot(p.x - j.x, p.y - j.y) < 12 && p.st !== 'stun') toast(p, 'flame'); if (j.t > 1.2) { j.st = 0; } } } }
  if (S.strike) { const s = S.strike; s.t += dt; if (s.t > 1.4 && !s.hit) { s.hit = true; S.flash = { c: '#ffffff', t: .25 }; bus.emit('hazard', { kind: 'lightning', x: s.x, y: s.y }); for (const p of S.players) if (alive(p) && Math.hypot(p.x - s.x, p.y - s.y) < 36) { toast(p, 'bolt'); } } if (s.t > 2.2) S.strike = null; }
  if (S.chicken) {
    const c = S.chicken; c.t += dt; c.y += c.dir * 105 * dt; c.x += c.vx * dt;
    for (const p of S.players) if (standing(p) && Math.hypot(p.x - c.x, p.y - c.y) < 13) { p.st = 'ground'; p.stT = 1.3; p.vx = c.vx * 2; p.vy = c.dir * 90; if (S.ball.holder === p) dropBall(p.vx, p.vy, 80); bus.emit('chickenBowl', { id: p.id }); }
    if (Math.hypot(S.ref.x - c.x, S.ref.y - c.y) < 14) refDown();
    if (c.y < G.Y0 - 60 || c.y > G.Y1 + 60) S.chicken = null;
  }
  // wind & shake decay
  S.shake = Math.max(0, S.shake - dt * 12);
  if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
}
function toast(p, kind) { p.st = 'stun'; p.stT = kind === 'flame' ? 1.2 : 1.5; p.burn = kind === 'flame' ? 1.2 : 0; p.bolt = kind === 'bolt' ? 1.5 : 0; if (S.ball.holder === p) dropBall(U(S.rng, -40, 40), U(S.rng, -40, 40), 90); bus.emit('toasted', { id: p.id, kind }); if (TT.hitFx) TT.hitFx(p, .8); }
function takePowerup(p, u) {
  u.taken = true; bus.emit('powerupTake', { id: p.id, kind: u.kind }); banner(POWERUPS[u.kind].name + '!', POWERUPS[u.kind].color, 1.6);
  switch (u.kind) { case 'pie': p.power = 'pie'; p.powerT = 6; p.turbo = TUNE.v.turboTank; break; case 'iron': p.iron = 15; break; case 'boot': p.power = 'boot'; break; case 'grease': p.grease = 8; break; case 'horn': S.hype[p.team] = Math.min(100, S.hype[p.team] + 40 * TUNE.v.hypeMult); S.shake = 4; break; }
}

// ---------- referee
function stepRef(dt) {
  const r = S.ref, b = S.ball; r.callT -= dt; r.sigT -= dt; if (r.callT <= 0) r.call = '';
  if (r.down > 0) { r.vx = r.vy = 0; return; }
  const tx = clamp((S.ruckMark ? S.ruckMark.x : b.x) - S.dir[S.poss < 0 ? 0 : S.poss] * 50, G.X0 - 50, G.X1 + 50), ty = clamp((S.ruckMark ? S.ruckMark.y : b.y) - 40, G.Y0 - 20, G.Y1 - 40);
  const dx = tx - r.x, dy = ty - r.y, m = Math.hypot(dx, dy);
  let sp = Math.min(95, m * 2); r.vx = m > 3 ? dx / m * sp : 0; r.vy = m > 3 ? dy / m * sp : 0;
  for (const p of S.players) if (alive(p) && p.z < 4) { const ex = r.x - p.x, ey = r.y - p.y, e = Math.hypot(ex, ey); if (e < 10 && e > .1) { r.x += ex / e * (10 - e) * .3; r.y += ey / e * (10 - e) * .3; } }
  r.x += r.vx * dt; r.y += r.vy * dt;
  const fa = Math.atan2(b.y - r.y, b.x - r.x); r.facing += clamp(angDiff(fa, r.facing), -4 * dt, 4 * dt);
  for (const p of S.players) if (p.st === 'air' && Math.hypot(p.x - r.x, p.y - r.y) < 11) refDown();
}

// ---------- the step
function stepMatch(rawdt, seatI) {
  if (!S || S.over && S.phase === 'fulltime' && false) return;
  const dt = rawdt * TUNE.v.gameSpeed; S.t += dt; S.phaseT += dt; S.elapsed += dt; S.seatI = seatI || S.seatI || [];
  S.banners.forEach(x => x.t -= dt); S.banners = S.banners.filter(x => x.t > 0); if (S.radio) { S.radio.t -= dt; if (S.radio.t <= 0) S.radio = null; }
  if (S.phase === 'intro') { if (S.phaseT > .1) startMatch(); }
  assignControl(dt);
  const ints = buildIntents(dt);
  const ph = S.phase, live = ph === 'play';
  // player timers & states
  for (const p of S.players) {
    if (p.off) continue;
    if (p.stT > 0) { p.stT -= dt; if (p.stT <= 0) { if (p.st === 'ground') { p.st = 'getUp'; p.stT = .4; } else if (p.st === 'getUp' || p.st === 'fall' || p.st === 'stun' || p.st === 'tackling') { p.st = 'run'; p.am = ''; } else if (p.st === 'binned') { /* released below */ } } }
    if (p.st === 'binned' && live) { p.stT -= dt; if (p.stT <= 0 && p.card !== 'red') { p.st = 'run'; place(p, clamp(S.ball.x, G.X0, G.X1), G.Y1 - 6, p.team ? Math.PI : 0); bus.emit('sinBinOut', { id: p.id }); } }
    if (p.st === 'celebrate' && ph !== 'try') { p.st = 'run'; }
    if (ph === 'play' || ph === 'ruck') {
      let I = ints[p.id] || emptyIntent();
      if (!p.dummy || S.cfg.mode === 'drill') actPlayer(p, I, dt);
      if (ph !== 'ruck' || !p.flags.ruck) moveStep(p, (p.dummy && !p.ctl >= 0) ? emptyIntent() : I, dt);
    } else if (ph === 'try' || ph === 'goalscored') { moveStep(p, emptyIntent(), dt); }
    else if (ph === 'halftime') { }
    else { if (p.st === 'air') moveStep(p, emptyIntent(), dt); }
    if (p.st === 'air') { for (const q of S.players) if (q !== p && q.team !== undefined && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 9 && p.z < 30) { q.st = 'ground'; q.stT = 1; q.vx += p.vx * .3; q.vy += p.vy * .3; bus.emit('skittle', { id: q.id }); } }
    if (p.superKind) p.smoke = .2;
  }
  if (ph === 'play' || ph === 'ruck' || ph === 'try') { separate(dt); }
  // ball
  if (S.ball.st !== 'scripted') stepBall(dt);
  if (ph === 'play') {
    stepFlight(dt); if (S.phase === 'play') stepKick(dt); if (S.phase === 'play') stepDropGoal(); if (S.phase === 'play') pickups();
    if (S.phase === 'play') checkOut();
    if (S.phase === 'play') {
      S.clock += dt; const len = TUNE.v.halfLength; S.stats[S.poss >= 0 ? S.poss : 0].poss += (S.poss >= 0 ? dt : 0); S.stats[S.ball.x > G.CX ? (S.dir[0] > 0 ? 0 : 1) : (S.dir[0] > 0 ? 1 : 0)].terr += dt;
      if (!S.sudden && S.clock >= len && !S.hooter) { S.hooter = true; banner('HOOTER! FINISH THE PLAY!', '#ffe070', 2); bus.emit('hooter', {}); line('hooter'); }
      if (S.hooter) { S.hooterT += dt; if (S.hooterT > 40) { checkHalf(); } }
      if (S.sudden) { S.goldenT += dt; if (S.goldenT > 120 && S.cfg.mode !== 'cup') { S.over = true; S.win = -1; setPhase('fulltime'); bus.emit('fulltime', { win: -1 }); } }
      // advantage
      if (S.adv) { S.adv.t -= dt; const car = S.ball.holder; if (car && car.team === S.adv.team) { if (Math.abs(car.x - S.adv.x) > 100) { banner('ADVANTAGE OVER', '#c0ffc0', 1); bus.emit('advantageOver', {}); S.adv = null; } } else if (S.ball.holder && S.ball.holder.team !== S.adv.team || S.adv.lost) { const a = S.adv; S.adv = null; startPenalty(a.team, a.spotX, a.spotY, false); } if (S.adv && S.adv.t <= 0) { const a = S.adv; S.adv = null; startPenalty(a.team, a.spotX, a.spotY, false); } }
      // use it
      if (S.useIt > 0) { S.useIt -= dt; const h = S.ball.holder, m = S.useItMark; if (!h || (m && Math.hypot(h.x - m.x, h.y - m.y) > 30)) S.useIt = 0; else if (S.useIt <= 0) { S.ref.call = 'USE IT!'; S.ref.callT = 1.2; bus.emit('useIt', {}); banner('USE IT!', '#ff6060', 1); startScrumAt(opp(h.team), h.x, h.y); } }
      // carrier metres and line break
      const h = S.ball.holder; if (h) { h.carryT += dt; { const m = Math.max(0, h.vx * S.dir[h.team]) * dt / 10.24; S.stats[h.team].metres += m; h.st_m = (h.st_m || 0) + m; } checkLineBreak(h); if (inGoalOf(h)) { h.ingoalT = (h.ingoalT || 0) + dt; if (h.ingoalT > 2.5 || Math.abs(h.x - ownEnd(h)) < 16) groundBall(h, false); } else h.ingoalT = 0; }
    }
  }
  if (S.phase === 'ruck' && ph === 'ruck') stepRuck(dt);
  if (S.phase === 'scrum' && ph === 'scrum') stepScrum(dt);
  if (S.phase === 'lineout' && ph === 'lineout') stepLineout(dt);
  if (S.phase === 'penalty' && ph === 'penalty') stepPenalty(dt);
  if (S.phase === 'kick' && ph === 'kick') stepGoalKick(dt);
  if (S.phase === 'kickoff' && ph === 'kickoff') stepKickoff(dt);
  if (S.phase === 'try' && ph === 'try') { S.sp.t += dt; if (S.sp.t > 2.3 && !S.replayPlaying) tryEnded(); }
  if (S.phase === 'goalscored' && ph === 'goalscored') { S.sp.t += dt; if (S.sp.t > 2) { if (checkHalf()) return; doKickoff(opp(S.sp.team)); } }
  if (ph === 'halftime') { if (S.phaseT > 6 && S.cfg.mode !== 'attract' || (S.phaseT > 3.5) || (S.seatI.some(i => i && i.x) && S.phaseT > 1)) { S.hooter = false; for (const p of S.players) if (p.st === 'celebrate') p.st = 'run'; doKickoff(1); } }
  stepRef(dt); stepArcade(dt);
  // frame record for replays
  if ((S.frameN++ & 1) === 0 && TT.cfg.present) { S.frames.push(snapFrame()); if (S.frames.length > 300) S.frames.shift(); }
  // watchdogs
  const lim = { kickoff: 40, ruck: 8, scrum: 12, lineout: 16, penalty: 20, kick: 35, try: 12, play: 400, goalscored: 6, halftime: 20 }[ph];
  if (lim && S.phaseT > lim && !S.replayPlaying) { bus.emit('watchdog', { ph }); S.counts.watchdog = (S.counts.watchdog | 0) + 1; if (ph === 'play') S.phaseT = 0; else { S.sp = null; for (const p of S.players) if (p.st === 'scrum' || p.st === 'lineout' || p.st === 'celebrate') p.st = 'run'; doKickoff(S.rng() < .5 ? 0 : 1); } }
  S.dropT += 0;
}
const ownEnd = h => S.dir[h.team] > 0 ? G.X1 + G.ING : G.X0 - G.ING;
function checkLineBreak(h) {
  if (h.broke) { if (S.ball.holder !== h) h.broke = false; return; }
  const d = S.dir[h.team], behind = S.players.filter(q => q.team !== h.team && alive(q) && (q.x - h.x) * d < -2).length, total = S.players.filter(q => q.team !== h.team && alive(q)).length;
  if (total > 1 && behind >= total - 1 && h.carryT > 1 && (h.x - G.CX) * d > -300) { h.broke = true; S.stats[h.team].breaks++; bus.emit('lineBreak', { id: h.id }); addHype(h.team, 8); banner('LINE BREAK!', '#80ffd0', 1.3); line('lineBreak'); }
}
function snapFrame() { return { p: S.players.map(p => [p.x, p.y, p.z, p.facing, p.st, p.am, p.amT, p.vx, p.vy, p.off ? 1 : 0, p.superKind ? 1 : 0, p.onFire > 0 ? 1 : 0, p.flip || 0]), b: [S.ball.x, S.ball.y, S.ball.z, S.ball.holder ? S.ball.holder.id : -1], r: [S.ref.x, S.ref.y, S.ref.facing], clock: S.clock, score: S.score.slice() }; }
TT.newMatch = newMatch; TT.stepMatch = stepMatch; TT.get = () => S;

/* ==== 24-ai.js ==== */
/* THUGBY TURBO — CPU brains: carrier, support, defence, loose ball, kicks. Same brain for CPU teams and human teammates. */
function aiIntent(p, dt) {
  const I = emptyIntent(); if (!standing(p) || p.off) return I;
  const ph = S.phase; if (ph !== 'play' && ph !== 'ruck') return I;
  if (p.flags.ruck) return I;
  if (p.dummy && S.cfg.mode === 'drill' && !p.hunt) return I;
  if (S.dev.aiOff && p.team === 1) return I;
  const b = S.ball, h = b.holder, d = S.dir[p.team], team = p.team;
  p.aiT -= dt; if (p.reactT > 0) return I;
  const diff = S.cfg.diff || { react: TUNE.v.aiReaction, noise: .2 };
  if (ph === 'ruck') return ruckAI(p, I);
  if (h === p) return carrierAI(p, I, dt, diff);
  if (h && h.team === team) return supportAI(p, I, h);
  if (h) return defendAI(p, I, h, diff);
  return looseAI(p, I);
}
const goTo = (p, I, x, y, turbo, slow) => { const dx = x - p.x, dy = y - p.y, m = Math.hypot(dx, dy); if (m > 4) { const k = slow ? clamp(m / 20, .15, 1) : 1; I.mx = dx / m * k; I.my = dy / m * k; } I.turbo = !!turbo && m > 18; return I; };
function carrierAI(p, I, dt, diff) {
  const d = S.dir[p.team], ax = atkX(p.team), opps = S.players.filter(q => q.team !== p.team && alive(q) && q.z < 5);
  p.aiT = p.aiT || 0;
  if (inGoalOf(p)) { goTo(p, I, ax + d * 40, p.y < G.CY ? G.CY - 24 : G.CY + 24, true); if (Math.abs(p.x - ax) > 6 && S.rng() < .1) I.x = true; if (Math.abs(p.x - ax) > 30) I.x = true; return I; }
  if (S.hype[p.team] >= 100 && (p.x - G.CX) * d > 0 && p.cd.pass <= 0 || (S.hype[p.team] >= 100 && Math.abs(ax - p.x) < 400)) I.tri = true;
  if (p.aiT <= 0) {
    p.aiT = .15 + diff.react * .4;
    // pick a run angle with most space
    let best = 0, bs = -1e9;
    for (let a = -1.0; a <= 1.0; a += .25) {
      const ang = (d > 0 ? 0 : Math.PI) + a * d * (d > 0 ? 1 : -1) * -1 * -1;
      const dx = Math.cos(ang), dy = Math.sin(ang); let space = 140;
      for (const q of opps) { const rx = q.x - p.x, ry = q.y - p.y, along = rx * dx + ry * dy; if (along > 0 && along < 140) { const perp = Math.abs(rx * dy - ry * dx); if (perp < 24) space = Math.min(space, along); } }
      const ey = p.y + dy * 60; let sc = space - Math.abs(a) * 18 + (ey < G.Y0 + 25 || ey > G.Y1 - 25 ? -120 : 0) - Math.abs(p.aiAng - ang) * 6 * 0;
      sc += (S.rng() - .5) * 20 * diff.noise; if (sc > bs) { bs = sc; best = ang; }
    }
    p.aiAng = best;
    // decisions
    const tk = opps.filter(q => (q.x - p.x) * d > -10 && dist2(p, q) < 60).sort((a, c) => dist2(p, a) - dist2(p, c))[0];
    p.aiDo = null;
    if (tk) {
      const dd = dist2(p, tk), recs = receivers(p, 0).filter(q => dist2(p, q) < 200);
      let bestR = null, bsc = -1; for (const q of recs) { const sp = opps.reduce((m, o) => Math.min(m, dist2(q, o)), 200); if (sp > bsc) { bsc = sp; bestR = q; } }
      const myspace = dd;
      if (bestR && bsc > myspace + 14 && S.rng() < .55 - diff.noise * .3) p.aiDo = { k: 'pass', r: bestR };
      else if (dd < 22 && p.cd.step <= 0 && S.rng() < .35) p.aiDo = { k: 'step' };
      else if (dd < 17 && p.pow >= 6 && S.rng() < .4) p.aiDo = { k: 'fend' };
    }
    const own22 = Math.abs(p.x - ownX(p.team)) < 225, lead = S.score[p.team] - S.score[opp(p.team)];
    if (!p.aiDo && own22 && opps.some(q => dist2(p, q) < 70) && S.rng() < .25) p.aiDo = { k: 'kick' };
    if (!p.aiDo && Math.abs(ax - p.x) < 230 && lead <= 0 && S.half === 2 && S.clock > TUNE.v.halfLength - 20 && lead >= -3 && p.kck >= 6) p.aiDo = { k: 'drop' };
  }
  const ang = p.aiAng === undefined ? (d > 0 ? 0 : Math.PI) : p.aiAng;
  I.mx = Math.cos(ang); I.my = Math.sin(ang); I.turbo = p.turbo > TUNE.v.turboTank * .3 || Math.abs(ax - p.x) < 300;
  const a = p.aiDo; p.aiDo = null;
  if (a) {
    if (a.k === 'pass') { if (a.r.y < p.y) I.l1 = true; else I.r1 = true; I.hl1 = I.l1; I.hr1 = I.r1; }
    else if (a.k === 'step') I.x = true; else if (a.k === 'fend') I.sq = true;
    else if (a.k === 'kick') { p.aiKick = { t: .5, aim: [S.rng() < .5 ? 0 : 0, p.y < G.CY ? -1 : 1] }; }
    else if (a.k === 'drop') { p.aiKick = { t: .7, aim: null }; }
  }
  if (p.aiKick) { p.aiKick.t -= dt; I.hci = true; if (p.aiKick.t <= 0) { I.hci = false; I.rci = true; if (p.aiKick.aim) { I.mx = p.aiKick.aim[0]; I.my = p.aiKick.aim[1]; } const k = p.aiKick; p.aiKick = null; p.ciHold = Math.max(p.ciHold, .75); } }
  // passes while holding: short taps need only press edge then release next step
  if (p.passSide && !I.l1 && !I.r1) { I.hl1 = p.passSide < 0; I.hr1 = p.passSide > 0; }
  return I;
}
function shapeSlots(team, car) {
  const d = S.dir[team], mates = S.players.filter(q => q.team === team && q !== car && alive(q) && standing(q)).sort((a, c) => a.y - c.y);
  const ks = [-3, -2, -1, 1, 2, 3], res = {};
  const slots = ks.slice(0, mates.length).map(k => ({ x: car.x - d * (18 + 10 * Math.abs(k)), y: clamp(car.y + k * (k * (car.y > G.CY ? -1 : 1) > 0 ? 44 : 36), G.Y0 + 20, G.Y1 - 20) })).sort((a, c) => a.y - c.y);
  mates.forEach((m, i) => { res[m.id] = slots[i] || { x: car.x - d * 25, y: car.y }; }); return res;
}
function supportAI(p, I, car) {
  const sh = S.shape && S.shape.t === S.t && S.shape.team === p.team ? S.shape : (S.shape = { t: S.t, team: p.team, s: shapeSlots(p.team, car) }), s = sh.s[p.id] || { x: car.x - S.dir[p.team] * 25, y: car.y };
  const d = S.dir[p.team]; let tx = s.x, ty = s.y;
  if ((tx - car.x) * d > -6) tx = car.x - d * 6;
  // sweeper stays deep
  goTo(p, I, tx, ty, car.broke || Math.hypot(tx - p.x, ty - p.y) > 60, true);
  // grab power-up
  const u = S.powerups.find(u => u.landed && Math.hypot(u.x - p.x, u.y - p.y) < 100); if (u && p.role >= 5) goTo(p, I, u.x, u.y, true);
  return I;
}
function defendAI(p, I, car, diff) {
  const d = S.dir[p.team], team = p.team;
  const defs = S.players.filter(q => q.team === team && alive(q) && standing(q) && q.role !== 6 || q === p);
  // tackler = nearest by time to intercept
  let nearest = null, nd = 1e9; for (const q of S.players) if (q.team === team && standing(q)) { const dd = dist2(q, car); if (dd < nd) { nd = dd; nearest = q; } }
  const lead = .25;
  if (p === nearest || (dist2(p, car) < 60 && S.rng() < 0)) {
    const tx = car.x + car.vx * lead, ty = car.y + car.vy * lead; goTo(p, I, tx, ty, nd > 25);
    const range = TUNE.v.tackleRange, dd = dist2(p, car);
    const agg = (S.teams[team].style.aggression || 1) * TUNE.v.aiAggression;
    p.aiTk = (p.aiTk || 0) - 1 / 120;
    if (dd < range + 3 && Math.abs(angDiff(Math.atan2(car.y - p.y, car.x - p.x), p.facing)) < 1.1) {
      if ((p.reactDone === undefined) || S.t - p.reactDone > diff.react) { if (p.reactAt === undefined) p.reactAt = S.t + diff.react; if (S.t >= p.reactAt) { p.reactAt = undefined; if (S.rng() < .6 + .3 * agg * .6) I.rx = true; else p.reactAt = S.t + .25; } }
    } else if (dd > 40) { p.reactAt = undefined; }
    // big hit approach
    if (dd < 70 && dd > 20 && (p.pow >= 7 || agg > 1.15) && Math.hypot(car.vx, car.vy) > 40 && (S.rng() < .01)) { p.bigAim = .8; }
    if (p.bigAim > 0) { I.hx = true; p.bigAim -= 1 / 120; if (dd < 22) { I.hx = false; I.rx = true; p.xHold = Math.max(p.xHold, .75); p.bigAim = 0; } }
    // dive from behind
    if (dd > 18 && dd < 32 && Math.hypot(car.vx, car.vy) > Math.hypot(p.vx, p.vy) && Math.abs(angDiff(car.facing, Math.atan2(p.y - car.y, p.x - car.x))) > 2) I.sq = true;
    if (S.hype[team] >= 100 && Math.abs(atkX(opp(team)) * 0 + ownX(team) - car.x) < 120 + 100) I.tri = true;
    return I;
  }
  // defensive line
  const line = car.x + d * 30, mates = S.players.filter(q => q.team === team && alive(q) && q !== nearest).sort((a, c) => a.y - c.y);
  const opps = S.players.filter(q => q.team !== team && alive(q) && q !== car).sort((a, c) => a.y - c.y), k = mates.indexOf(p);
  let ty = opps[k] ? opps[k].y : p.y, tx = line + (p.role === 6 || p.role === 4 ? d * 80 : 0);
  if (p.role === 6) { tx = ownX(team) + d * 140; ty = lerp(car.y, G.CY, .5); if (Math.abs(car.x - ownX(team)) < 200) tx = car.x + d * 30; }
  // cheap shots on supports
  if (!S.ref.down && S.teams[team].style.cheapShots > 0 && S.rng() < .0008 * S.teams[team].style.cheapShots * 40 * TUNE.v.aiAggression) { const o = opps.find(q => dist2(q, p) < 18); if (o && !refSees(p)) { goTo(p, I, o.x, o.y); I.rx = true; return I; } }
  const dx = Math.abs(tx - p.x) > 220; goTo(p, I, tx, ty, dx, true);
  return I;
}
function looseAI(p, I) {
  const b = S.ball, team = p.team;
  const tx = b.x + b.vx * .3, ty = b.y + b.vy * .3; let rank = 0, mine = dist2(p, { x: tx, y: ty });
  for (const q of S.players) if (q.team === team && q !== p && standing(q) && dist2(q, { x: tx, y: ty }) < mine) rank++;
  let kx = tx, ky = ty;
  if (b.st === 'kick' && S.kickInfo) { kx = S.kickInfo.x; ky = S.kickInfo.y; if (b.drop) { /* nobody chases a drop goal */ } }
  if (rank < 2) goTo(p, I, kx, ky, true);
  else { const d = S.dir[team]; goTo(p, I, clamp(b.x - d * (20 + rank * 15), G.X0 - 40, G.X1 + 40), clamp(b.y + (p.role - 3) * 30, G.Y0 + 10, G.Y1 - 10), false, true); }
  return I;
}
function ruckAI(p, I) {
  const s = S.sp, mark = S.ruckMark || { x: S.ball.x, y: S.ball.y }, dA = S.dir[s.team];
  if (p.team === s.team) { const k = p.role - 3; goTo(p, I, mark.x - dA * (30 + Math.abs(k) * 14), mark.y + k * 38, false, true); }
  else { const k = p.role - 3; goTo(p, I, mark.x + dA * (18 + Math.abs(k) * 6), mark.y + k * 42, false, true); }
  return I;
}
// intents for every player: humans from their seats, everyone else from the brain
function buildIntents(dt) {
  const out = new Array(S.players.length);
  for (const p of S.players) {
    if (p.ctl >= 0 && S.seats[p.ctl] && S.seats[p.ctl].kind !== 'cpu' && S.seatI[p.ctl] && !S.seats[p.ctl].auto) out[p.id] = S.seatI[p.ctl];
    else out[p.id] = aiIntent(p, dt);
  }
  return out;
}

/* ==== 30-render.js ==== */
/* THUGBY TURBO — presentation: pitch, stadium, rigs, ball, effects, camera. Reads S only. */
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
const { px } = E;
// custom animations (new E.MOVES entries) for rugby
Object.assign(E.MOVES, {
  tackle: { rel: true, hand: 'both', plane: 'side', a0: 1.1, a1: -.2, reach: 5, wind: .08, active: .12, recover: .3, lunge: 3.5, hop: .5, crouch: .55, lean: .6, blade: 0 },
  bighit: { rel: true, hand: 'both', plane: 'side', a0: 2.4, a1: -.3, reach: 6, wind: .22, active: .12, recover: .4, lunge: 5, hop: 1.5, crouch: .7, lean: .8, blade: 0 },
  rugpass: { rel: true, hand: 'both', plane: 'ground', a0: 1.6, a1: -.4, reach: 7, wind: .05, active: .1, recover: .2, lunge: 1, lean: .25, twist: 1.2, blade: 0 },
  rugkick: { rel: true, kick: true, a0: .1, a1: 0, z0: .2, z1: .95, reach: 7, wind: .12, active: .12, recover: .3, lunge: 2, lean: -.2 },
  fendarm: { rel: true, hand: 'L', a0: .05, a1: 0, z0: 0, z1: .5, r0: 3, r1: 10, wind: .04, active: .22, recover: .2, lunge: 1, lean: .1, blade: 0 },
  spinmove: { rel: true, a0: 1.3, a1: 1.3, spin: true, z0: -6, z1: -6, reach: 6, wind: .04, active: .36, recover: .12, lunge: 0, lean: .1, blade: 0 },
  sidestepmv: { rel: true, hand: 'both', plane: 'ground', a0: .4, a1: -.4, reach: 3, wind: .04, active: .15, recover: .12, lean: .3, twist: 1.4, blade: 0 },
  shove: { rel: true, hand: 'both', plane: 'ground', a0: .3, a1: 0, reach: 6, wind: .05, active: .14, recover: .2, lunge: 2.5, lean: .5, blade: 0 }
});
const AMAP = { tackle: 'tackle', dive: 'tackle', bighit: 'bighit', pass: 'rugpass', kick: 'rugkick', fend: 'fendarm', spinmove: 'spinmove', sidestep: 'sidestepmv', bash: 'shove', launched: null, tackled: null };
function moveArgs(name, t) {
  const key = AMAP[name]; if (!key) return null; const s = E.MOVES[key]; const w = s.wind, a = s.active, rc = s.recover, tot = w + a + rc; if (t > tot) return null;
  if (t < w) return E.move(key, t / w, 'wind'); if (t < w + a) return E.move(key, (t - w) / a, 'active'); return E.move(key, (t - w - a) / rc, 'recover');
}
function mkRig(p) {
  const T = S.teams[p.team], R = E.rng(p.id * 977 + 13), skin = T.skin[Math.floor(R() * T.skin.length)];
  const hairs = ['short', 'spiky', 'long', 'ponytail', 'bald'], hairC = ['#2a1a10', '#6b3a1a', '#d8b04a', '#c83a2a', '#202030', '#8a8a96'];
  const rig = new E.Humanoid({ size: p.role <= 2 ? 1.3 : 1.2, build: p.role <= 2 ? 'bulky' : p.role >= 5 ? 'heroic' : 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: p.immovable ? 'bald' : hairs[Math.floor(R() * hairs.length)], hat: p.role === 1 ? { style: 'band', color: T.c2 } : null,
    colors: { skin, hair: hairC[Math.floor(R() * hairC.length)], cloth: T.c1, coat: T.c1, pants: T.c2, boot: '#1c1c20', belt: T.c2, trim: T.c2, glove: skin } });
  if (p.immovable) rig.size = 1.9;
  return rig;
}
function mkRefRig() { return new E.Humanoid({ size: 1.2, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short', colors: { skin: '#e8b890', hair: '#6a6a70', cloth: '#18181c', pants: '#18181c', boot: '#101010', trim: '#e8e8e8', belt: '#303030' } }); }

// ---------- the pitch
function buildMapRows() {
  const W = G.MAPW, H = G.MAPH, rows = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) { let c = '.'; if (y <= 2) c = 'ABC'[y]; else if (y === 45) c = 'b'; else if (x === 0) c = 'W'; else if (x === W - 1) c = 'W'; s += c; } rows.push(s); }
  return rows;
}
function buildMap(venue) {
  const gc = venue.grass.map(E.hex), tm = [TT.S.teams[0], TT.S.teams[1]].map(t => E.hex(t.c1));
  const lineAt = (v, c, w = 1.2) => Math.abs(v - c) < w;
  const dashed = (v, c) => lineAt(v, c) && ((Math.floor(v) & 0) === 0);
  const mud = TT.S.mud;
  const floorTex = (x, y) => {
    const inF = x >= G.X0 - G.ING && x <= G.X1 + G.ING && y >= G.Y0 && y <= G.Y1, nx = E.noise2(x * .09, y * .09);
    let c;
    if (!(x >= G.X0 - G.ING - 48 && x <= G.X1 + G.ING + 48 && y >= G.Y0 - 48 && y <= G.Y1 + 48)) return [30, 60, 34];
    const stripe = Math.floor(x / 32) & 1; c = gc[stripe].slice(); c = [c[0], c[1], c[2]];
    const n = (nx - .5) * 16; c = [c[0] + n, c[1] + n * 1.2, c[2] + n * .6];
    if (!inF) { c = [c[0] * .82, c[1] * .85, c[2] * .82]; }
    else if (x < G.X0 || x > G.X1) { const t = tm[x < G.X0 ? (TT.S.dir[0] > 0 ? 0 : 1) : (TT.S.dir[0] > 0 ? 1 : 0)]; c = [c[0] * .6 + t[0] * .28, c[1] * .6 + t[1] * .28, c[2] * .6 + t[2] * .28]; }
    for (const m of mud) { const d = Math.hypot(x - m.x, y - m.y); if (d < m.r) { const k = d < m.r * .55 ? 1 : .7; c = [90 * k + c[0] * (1 - k), 64 * k + c[1] * (1 - k), 36 * k + c[2] * (1 - k)]; if (d < m.r * .3 && E.hash2(Math.floor(x / 3), Math.floor(y / 3)) > .6) c = [130, 110, 80]; } }
    let w = false; const inY = y >= G.Y0 - 1 && y <= G.Y1 + 1;
    if (inY && (lineAt(x, G.X0) || lineAt(x, G.X1) || lineAt(x, G.CX) || lineAt(x, G.X0 - G.ING) || lineAt(x, G.X1 + G.ING))) w = true;
    if (inY && (lineAt(x, G.X0 + 225) || lineAt(x, G.X1 - 225)) && x > 0) w = true;
    if (inY && (lineAt(x, G.CX - 102) || lineAt(x, G.CX + 102) || lineAt(x, G.X0 + 51) || lineAt(x, G.X1 - 51)) && (Math.floor(y / 14) & 1)) w = true;
    if (x >= G.X0 - G.ING - 1 && x <= G.X1 + G.ING + 1 && (lineAt(y, G.Y0) || lineAt(y, G.Y1))) w = true;
    if (x >= G.X0 && x <= G.X1 && (lineAt(y, G.Y0 + 51) || lineAt(y, G.Y0 + 154) || lineAt(y, G.Y1 - 154) || lineAt(y, G.Y1 - 51)) && (Math.floor(x / 14) & 1)) w = true;
    if (w) return [236, 240, 232];
    return [E.clamp(c[0], 0, 255), E.clamp(c[1], 0, 255), E.clamp(c[2], 0, 255)];
  };
  const types = { A: 0, B: 0 };
  const map = new E.TileMap({ rows: buildMapRows(), legend: { '.': 0, A: 1, B: 2, C: 3, b: 4, W: 5 },
    types: { 1: { h: 54, top: '#3a3a46', side: '#58586a', face: 'stone' }, 2: { h: 44, top: '#44444f', side: '#656578', face: 'stone' }, 3: { h: 34, top: '#505060', side: '#72728a', face: 'stone' }, 4: { h: 14, top: '#e8e8e8', side: '#2a2a3a', face: 'plank', cut: true, cutH: 4 }, 5: { h: 30, top: '#444450', side: '#606072', face: 'stone' } },
    floorTex, ao: 0, outside: '#20402a' });
  return map;
}

// ---------- scene-wide view state
const V = { map: null, rigs: [], refRig: null, chickRig: null, t: 0, camX: 0, camY: 0, shakeX: 0, fxText: [], replay: null, letter: 0, mouse: null, crowdWave: 0, hover: -1 };
TT.V = V;
function initView() {
  const game = TT.game; V.map = buildMap(S.venue); game.cam.bounds = v => V.map.bounds(v);
  V.rigs = S.players.map(mkRig); V.refRig = mkRefRig();
  V.chickRig = new E.Blob({ R: 11, colors: { dk: '#c8c8c0', base: '#f4f4ee', lt: '#ffffff', spec: '#ffffff', eye: '#101010', pupil: '#000000' }, wings: true, feet: true, tail: true, mouth: true, ears: 'cat' });
  V.fxText = []; V.replay = null; V.letter = 0;
  game.lights.enabled = true; game.lights.ambient = Math.min(1, S.venue.ambient + .3); game.weather = S.venue.weather ? Object.assign({}, S.venue.weather) : null;
  game.setView(TT.settings.cam || 'broadcast');
}
function rigArgs(p, dt) {
  const a = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing };
  const st = p.st, m = moveArgs(p.am, p.amT);
  if (st === 'ground') { a.pose = 'down'; a.vx = a.vy = 0; }
  else if (st === 'getUp') { a.pose = 'kneel'; a.vx = a.vy = 0; }
  else if (st === 'air') { a.flip = (p.amT * 1.6) % 1; a.air = true; a.expr = 'shout'; }
  else if (st === 'fall') { a.pose = 'crouch'; a.expr = 'wince'; }
  else if (st === 'stun') { a.pose = 'crouch'; a.expr = 'wince'; }
  else if (st === 'celebrate') { a.pose = ['cheer', 'hips', 'wave', 'cheer'][p.celeb | 0]; a.vx = a.vy = 0; a.expr = 'shout'; }
  else if (st === 'binned') { a.pose = 'kneel'; a.vx = a.vy = 0; }
  else if (st === 'scrum') { a.pose = 'crouch'; a.vx = a.vy = 0; a.lean = .5; }
  else if (st === 'lineout') { a.vx = a.vy = 0; if (p.z > 5) a.pose = 'cheer'; }
  else if (st === 'diving') { a.flip = .0; a.pose = 'down'; a.air = true; }
  else if (st === 'charge') { a.sprint = true; a.expr = 'angry'; }
  if (S.phase === 'ruck' && p.flags.ruck) { a.pose = 'crouch'; a.vx = a.vy = 0; }
  if (m && st !== 'ground') a.attack = m;
  if (p.superKind && st !== 'ground') { a.sprint = true; a.expr = 'shout'; }
  if (S.ball.holder === p && !m && st === 'run') { a.stance = 'ready'; }
  return a;
}
// ---------- effects
TT.hitFx = (p, power) => { if (!TT.cfg.present || !TT.game) return; const g = TT.game; g.particles.impact(p.x, p.y, 16, 8 * power + 4, '#fff4b0'); g.particles.dust(p.x, p.y, 2, 8); if (power >= 1) { g.freeze(.09 * power); g.shake(3 * power); g.flash('#ffffff', .08, .35); } S.shake = Math.max(S.shake, 2 * power); };
TT.fxDust = (x, y) => { if (TT.game) TT.game.particles.dust(x, y, 2, 6); };
bus.on('try', d => { if (!TT.cfg.present) return; V.crowdWave = 4; const g = TT.game, p = S.players[d.id]; g.particles.explosion(p.x, p.y, 20, 1.4, { freeze: false }); for (let i = 0; i < 5; i++) g.particles.glints(p.x + (i - 2) * 14, p.y - 10, 30, 6, ['#ffe070', '#ff80a0', '#80e0ff'][i % 3]); g.flash('#fff4c0', .2, .4); if (S.venue.hazard === 'flames') for (let i = 0; i < 6; i++) g.particles.fire(p.x + (i - 3) * 22, p.y, 4, 8, { size: 2 }); });
bus.on('hazard', d => { if (!TT.cfg.present) return; if (d.kind === 'lightning') { TT.game.flash('#ffffff', .22, .7); TT.game.shake(5); TT.game.particles.explosion(d.x, d.y, 4, 1.2, { freeze: false }); } });
bus.on('monsterHit', d => { if (!TT.cfg.present) return; const p = S.players[d.on]; TT.game.particles.explosion(p.x, p.y, 16, 1.2, { freeze: false }); });
bus.on('toasted', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; if (d.kind === 'flame') TT.game.particles.fire(p.x, p.y, 8, 12, { size: 2 }); else TT.game.particles.sparks(p.x, p.y, 20, 16, 0); });
bus.on('sidestep', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; TT.game.particles.dust(p.x, p.y, 1, 4); });
bus.on('kick', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; TT.game.particles.dust(p.x, p.y, 1, 3); });
bus.on('powerupTake', d => { if (!TT.cfg.present) return; const p = S.players[d.id]; TT.game.particles.glints(p.x, p.y, 20, 10, POWERUPS[d.kind].color); });

// ---------- camera
function camUpdate(dt) {
  const g = TT.game, b = S.ball; let fx = b.x, fy = b.y, fz = 8;
  if (V.replay) { const k = V.replay.key; fx = k.x; fy = k.y; }
  else if (b.holder) { const d = S.dir[b.holder.team]; fx = b.holder.x + d * 50; fy = b.holder.y; fx = b.holder.x + b.holder.vx * .25 + d * 30; }
  else if (b.st === 'kick' && S.kickInfo && b.z > 20) { fx = (b.x + S.kickInfo.x) / 2; fy = (b.y + S.kickInfo.y) / 2; }
  if (S.sp && (S.phase === 'scrum' || S.phase === 'lineout' || S.phase === 'penalty' || S.phase === 'kick')) { fx = S.sp.x; fy = S.phase === 'lineout' ? S.sp.ty + (S.sp.side < 0 ? 60 : -60) : S.sp.y; if (S.phase === 'kick') { fx = (S.sp.x + atkX(S.sp.team)) / 2; fy = lerp(S.sp.y, G.CY, .5); } }
  if (S.phase === 'try' && S.sp) { fx = S.sp.x; fy = S.sp.y; }
  fy = lerp(fy, G.CY, .25);
  g.focus(fx + (S.shake ? (Math.random() - .5) * S.shake : 0), fy, fz);
}

/* ==== 31-draw.js ==== */
/* THUGBY TURBO — world drawing. */
const SEAT_COL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
function presentStep(dt) {
  V.t += dt;
  for (const p of S.players) { const rig = V.rigs[p.id]; if (p.off) continue; rig.update(dt, rigArgs(p, dt)); }
  V.refRig.update(dt, { x: S.ref.x, y: S.ref.y, z: 0, vx: S.ref.vx, vy: S.ref.vy, facing: S.ref.facing, pose: S.ref.down > 0 ? 'down' : (S.ref.sigT > 0 ? 'cheer' : undefined) });
  if (S.chicken) V.chickRig.update(dt, { squash: Math.sin(V.t * 18) * .2, walk: 1, flap: 1, look: [0, S.chicken.dir] });
  S.players.forEach(p => { if (p.st === 'celebrate' || p.st === 'stun') p.smoke = p.smoke; });
  // fx text
  camUpdate(dt);
}
function drawCrowd(r) {
  const t = V.t, ex = S.counts.try ? 1 : 0, wave = V.crowdWave = Math.max(0, V.crowdWave - .016);
  const tiers = [[16, 34], [0, 44], [-16, 54]];
  for (let ti = 0; ti < 3; ti++) {
    const [oy, z] = tiers[ti], y = 32 + oy - 4;
    r.queue(700, y, z + 1, g => {
      for (let x = 24; x < 1424; x += 6) {
        const [sx, sy] = r.w(x, y + 8, z); if (sx < -8 || sx > r.bw + 8) continue;
        const h = E.hash2(x, ti * 17 + 3), col = ['#e8443a', '#3b82f6', '#f5b700', '#f2f2f2', '#22c55e', '#b05ad8', '#e87a3a'][Math.floor(h * 7)];
        const bob = Math.sin(t * (3 + h * 3) + x) * (1 + wave * 3);
        px.rect(g, sx, sy - 5 + bob, 4, 4, col); px.rect(g, sx, sy - 8 + bob, 3, 3, h > .5 ? '#f0c8a0' : '#a8703a');
      }
    }, { bias: 0 });
  }
}
function drawPosts(r) {
  for (const x of [G.X0, G.X1]) {
    for (const y of [G.CY - G.POST, G.CY + G.POST]) r.queue(x, y, 0, g => { const [x0, y0] = r.w(x, y, 0), [x1, y1] = r.w(x, y, G.UPR), [q0, q1] = r.w(x, y, 20); px.rect(g, Math.round(x0) - 1, Math.round(y1), 3, Math.round(y0 - y1), '#f4f4f0'); px.rect(g, Math.round(x0) - 1, Math.round(y1), 1, Math.round(y0 - y1), '#c8c8d0'); px.rect(g, Math.round(x0) - 2, Math.round(q1), 5, Math.round(y0 - q1), S.teams[x < G.CX ? 0 : 1].c1); });
    r.queue(x, G.CY, G.CROSS, g => { const [x0, y0] = r.w(x, G.CY - G.POST, G.CROSS), [x1, y1] = r.w(x, G.CY + G.POST, G.CROSS); px.rect(g, Math.round(x0) - 1, Math.round(y0) - 1, Math.round(x1 - x0) + 3, 3, '#f4f4f0'); });
    for (const cy of [G.Y0, G.Y1]) r.queue(x, cy, 0, g => { const [a, b] = r.w(x, cy, 0), [c, d] = r.w(x, cy, 16); px.rect(g, Math.round(a), Math.round(d), 1, Math.round(b - d), '#e8e8e8'); px.rect(g, Math.round(c) + 1, Math.round(d), 5, 3, '#f2c230'); });
  }
}
function drawBall(r) {
  const b = S.ball; if (b.st === 'dead' && false) return;
  r.shadow(b.x, b.y, 3, .35, '#0c0818', 0);
  const ang = b.holder ? b.holder.facing : b.rot;
  r.queue(b.x, b.y, b.z, g => { const [sx, sy] = r.w(b.x, b.y, b.z); const rot = b.st === 'held' || b.holder ? 0 : b.rot; const ca = Math.cos(ang), sa = Math.sin(ang);
    const pts = [[-4, -2], [-1.5, -3], [1.5, -3], [4, -2], [4, 2], [1.5, 3], [-1.5, 3], [-4, 2]].map(([x, y]) => [sx + Math.round(x * Math.cos(rot * .5) - y * Math.sin(rot * .5) * .6), sy + Math.round(y * Math.cos(rot * .5) + x * Math.sin(rot * .5) * .5)]);
    px.poly(g, pts, '#a8582a'); px.line(g, sx - 2, sy, sx + 2, sy, '#f0e8d8', 1); px.dot(g, sx - 3, sy - 1, '#c87a44'); }, { emissive: false });
}
function drawPlayer(r, p) {
  if (p.off) return; const rig = V.rigs[p.id], T = S.teams[p.team];
  if (p.st === 'binned') return;
  const ctl = p.ctl >= 0, car = S.ball.holder === p;
  r.shadow(p.x, p.y, p.immovable ? 9 : 6, .4, '#0c0818', 0);
  if (ctl) { const c = SEAT_COL[(S.seats[p.ctl] && S.seats[p.ctl].slot !== undefined ? S.seats[p.ctl].slot : p.ctl) % 4]; r.decal(() => { r.groundRing(p.x, p.y, 9, c, .9); r.groundRing(p.x, p.y, 10, '#ffffff', .4); }); }
  const opts = { xray: (ctl || car) ? { actors: true, color: ctl ? SEAT_COL[p.ctl % 4] : '#ffffff' } : undefined, pick: p.id };
  if (p.superKind || p.onFire > 0) opts.ghost = { color: p.onFire > 0 ? '#ff8020' : '#ffe060', life: .25, alpha: .5, owner: p };
  if (p.burn > 0) { opts.flash = '#202020'; opts.flashMix = .6; }
  if (p.grease > 0) { opts.flash = '#ff90ff'; opts.flashMix = .25; }
  if (p.iron > 0) { opts.flash = '#c0c8e0'; opts.flashMix = .25; }
  if (p.xHold > .18 && p.xHold < 1.2) { opts.flash = '#ffffff'; opts.flashMix = .15 + (V.t * 8 % 1) * .2; } else if (p.xHold >= 1.2) { opts.flash = '#ff2020'; opts.flashMix = .4; }
  if (p.reactT > 0 && false) opts.alpha = .8;
  r.actor(p.x, p.y, p.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), opts);
  if (p.onFire > 0 || p.burn > 0) { TT.game.lights.add(p.x, p.y, 14, 44, .7, { color: '#ff8030' }); if (V.t % .08 < .02) TT.game.particles.fire(p.x, p.y, 6, 1, { size: 1.5 }); }
  if (p.bolt > 0) { p.bolt -= 1 / 60; }
  if (p.burn > 0) p.burn -= 1 / 60;
}
function drawWorld(r) {
  const g = TT.game; r.sky && 0;
  V.map.drawFloor(r);
  // ground marks
  const b = S.ball;
  if (S.kickInfo && (b.st === 'kick') && b.z > 4) { const k = S.kickInfo, pul = 6 + Math.sin(V.t * 8) * 2; r.decal(() => { r.groundRing(k.x, k.y, pul + 4, '#ffffff', .6); r.groundRing(k.x, k.y, pul, '#ffe070', .8); }); }
  if (TT.settings.refView && S.ref.down <= 0 && S.phase === 'play') { const R = S.ref; r.decal(() => { const pts = [[R.x, R.y]]; for (let i = -4; i <= 4; i++) { const a = R.facing + i / 4 * TUNE.v.refFov / 2; pts.push([R.x + Math.cos(a) * TUNE.v.refRange, R.y + Math.sin(a) * TUNE.v.refRange]); } const P = pts.map(p => r.w(p[0], p[1], 0)); px.polyDither(r.tgt, P, '#ffffe0', .06, r.ix, r.iy); }); }
  for (const j of S.jets) if (j.st) { r.decal(() => r.groundDisc(j.x, j.y, 12, j.st === 1 ? '#ff9020' : '#ff3010', j.st === 1 ? .5 + Math.sin(V.t * 20) * .2 : .9)); if (j.st === 2) { g.lights.add(j.x, j.y, 20, 70, 1, { color: '#ff7020' }); if (V.t % .05 < .018) g.particles.fire(j.x, j.y, 2, 2, { size: 2.5 }); } }
  if (S.strike) { const s = S.strike; r.decal(() => { r.groundRing(s.x, s.y, 36, s.t < 1.4 ? '#c0e0ff' : '#ffffff', s.t < 1.4 ? .5 + Math.sin(V.t * 30) * .3 : .9); r.groundRing(s.x, s.y, 24, '#ffffff', .4); }); if (s.t > 1.4) { r.queue(s.x, s.y, 0, gg => { const [a, bb] = r.w(s.x, s.y, 0); px.line(gg, a, bb, a + 4, bb - 120, '#ffffff', 3); px.line(gg, a + 4, bb - 120, a - 6, bb - 180, '#c0e0ff', 2); }, { emissive: true }); g.lights.add(s.x, s.y, 30, 140, 1.2, { color: '#c0d8ff' }); } }
  if (S.sp && S.sp.type === 'ruck') { const s = S.sp; r.decal(() => { r.groundRing(s.x, s.y, 18, '#ffffff', .5); r.groundArc(s.x, s.y, 16, 19, -Math.PI / 2, -Math.PI / 2 + TAU * clamp((s.bar + 1.2) / 2.4, 0, 1), s.bar >= 0 ? '#80ff80' : '#ff6060', .9); }); }
  if (S.useIt > 0 && b.holder) { const k = S.useIt / 3; r.decal(() => r.groundArc(b.holder.x, b.holder.y, 9, 12, -Math.PI / 2, -Math.PI / 2 + TAU * k, '#ff6060', .9)); }
  drawCrowd(r); V.map.queueWalls(r); drawPosts(r);
  // sin bin
  r.queue(G.CX + 70, G.Y1 + 30, 0, gg => { const [x, y] = r.w(G.CX + 70, G.Y1 + 30, 0), [x2, y2] = r.w(G.CX + 70, G.Y1 + 30, 22); px.rect(gg, x - 18, y2, 36, y - y2, '#2e8a4a'); px.rect(gg, x - 20, y2 - 3, 40, 4, '#1f6a38'); E.font.text(gg, 'SIN BIN', x, y2 + 4, '#ffffff', { align: 'center', font: 'tiny' }); });
  for (const p of S.players) drawPlayer(r, p);
  // referee
  const R = S.ref; r.shadow(R.x, R.y, 5, .4); r.actor(R.x, R.y, 0, (gg, ox, oy) => V.refRig.draw(gg, ox, oy, r.view));
  if (R.call) r.overlay(gg => { const [sx, sy] = r.w(R.x, R.y, 46); E.font.text(gg, R.call, sx, sy, '#ffffff', { align: 'center', outline: '#000', shadow: '#000' }); });
  drawBall(r);
  if (S.chicken) { const c = S.chicken; r.shadow(c.x, c.y, 9, .4); r.actor(c.x, c.y, 0, (gg, ox, oy) => V.chickRig.draw(gg, ox, oy, r.view)); }
  for (const u of S.powerups) { const pu = POWERUPS[u.kind]; if (u.landed && u.life < 3 && Math.floor(V.t * 8) % 2) continue; r.shadow(u.x, u.y, 5, .4);
    r.queue(u.x, u.y, u.z + 8, gg => { const [sx, sy] = r.w(u.x, u.y, u.z + 8 + Math.sin(V.t * 4) * 2); px.disc(gg, sx, sy, 7, '#101018'); px.disc(gg, sx, sy, 6, pu.color); px.rect(gg, sx - 3, sy - 1, 6, 3, '#fff'); E.font.text(gg, pu.name[0], sx, sy - 3, '#000', { align: 'center', font: 'tiny' }); }, { emissive: true }); g.lights.add(u.x, u.y, 10, 38, .6, { color: pu.color }); }
  // hover marker
  if (V.hover >= 0 && S.players[V.hover]) { const h = S.players[V.hover]; r.decal(() => r.groundRing(h.x, h.y, 11, V.hoverLegal ? '#60ff60' : '#ff6060', .9)); }
  // marker arrows for off-screen ball
  if (!r.visible(b.x, b.y, 0, -20, 0, 0) && r.marker) r.marker(b.x, b.y, 0, { label: '' });
  // sin-bin and pole labels
  if (S.dev && S.dev.showIds) for (const p of S.players) r.textAt(p.x, p.y, 40, p.id + p.st, '#fff', { font: 'tiny' });
}

/* ==== 32-input.js ==== */
/* THUGBY TURBO — input presets, device → intent, glyphs. */
const KEYS = Object.assign({}, E.Input.DEFAULT);
['attack', 'dash', 'skill', 'jump'].forEach(k => delete KEYS[k]);
// order matters for the two-player half keyboard: buttons are handed out in this order
Object.assign(KEYS, { x: ['Space', 'Pad0'], sq: ['KeyF', 'Pad2'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad6'], ci: ['KeyC', 'Pad1'], tri: ['KeyR', 'Pad3'], l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], click: ['Mouse0'], rclick: ['Mouse2'], cam: ['KeyV', 'Pad11'] });
TT.KEYS = KEYS;
const CAM_VIEWS = ['broadcast', 'threequarter', 'topdown'];
let toggleTurbo = [false, false, false, false];

function readIntent(inp, seat) {
  const game = TT.game, I = emptyIntent();
  const m = inp.move(), len = Math.min(1, Math.hypot(m[0], m[1]));
  if (len > .02) { const d = game.view.screenDirToGround(m[0], m[1]), dl = Math.hypot(d[0], d[1]) || 1; I.mx = d[0] / dl * len; I.my = d[1] / dl * len; }
  I.turbo = inp.down('turbo'); if (!TT.settings.holdTurbo) { if (inp.pressed('turbo')) toggleTurbo[seat] = !toggleTurbo[seat]; I.turbo = toggleTurbo[seat]; }
  for (const k of ['x', 'sq', 'ci', 'tri', 'l1', 'r1']) { I[k] = inp.pressed(k); I['h' + k] = inp.down(k); I['r' + k] = inp.released(k); }
  if (inp.pressed('cam')) { const i = CAM_VIEWS.indexOf(game.view.id); const n = CAM_VIEWS[(i + 1) % CAM_VIEWS.length]; game.setView(n); TT.settings.cam = n; game.note('CAMERA: ' + n.toUpperCase(), 1); }
  // mouse (player 1 / keyboard seat only)
  if (inp.lastDevice === 'mouse' || inp.lastDevice === 'keyboard') {
    const mg = game.mouseGround && game.mouseGround();
    if (mg) { const mx = mg.x !== undefined ? mg.x : mg[0], my = mg.y !== undefined ? mg.y : mg[1]; V.mouse = [mx, my];
      let best = -1, bd = 20; const me = S.seats[seat] && S.players[S.seats[seat].pid];
      if (me) for (const q of S.players) if (q.team === me.team && q !== me && alive(q)) { const dd = Math.hypot(q.x - mx, q.y - my); if (dd < bd) { bd = dd; best = q.id; } }
      if (seat === 0) { V.hover = best; V.hoverLegal = best >= 0 && me && (S.players[best].x - me.x) * S.dir[me.team] <= 4; }
      if (inp.pressed('click') && best >= 0) I.click = best;
      if (inp.down('rclick')) { I.aim = [mx, my]; I.hci = true; }
      if (inp.released('rclick')) { I.aim = [mx, my]; I.rci = true; }
    }
  }
  return I;
}

// ---------- glyph badges (drawn with pixels: the pixel font has no ✕ ○ □ △)
const PSCOL = { x: '#6a9cf0', ci: '#f05a64', sq: '#e07ac8', tri: '#4ad0a0' }, XBCOL = { x: '#5ac85a', ci: '#e8503a', sq: '#3a86e8', tri: '#f0c830' }, XBL = { x: 'A', ci: 'B', sq: 'X', tri: 'Y' };
const ACT_ALIAS = { confirm: 'x', back: 'ci', pause: 'opt', start: 'opt' };
function glyph(g, act, x, y, inp, o = {}) {
  inp = inp || TT.game.input; const sc = o.scale || 1, dev = inp.lastDevice || 'keyboard', a = ACT_ALIAS[act] || act;
  if (dev === 'gamepad') {
    const xb = TT.settings.glyphs === 'xbox', R = 5 * sc;
    if (['x', 'ci', 'sq', 'tri'].includes(a)) {
      const c = (xb ? XBCOL : PSCOL)[a], cx = x + R, cy = y + R;
      px.disc(g, cx, cy, R, '#101018'); px.disc(g, cx, cy, R - 1, '#202030');
      if (xb) E.font.text(g, XBL[a], cx, cy - 3, c, { align: 'center' });
      else if (a === 'x') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, c, 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, c, 1); }
      else if (a === 'ci') { px.ell && px.ell(g, cx, cy, 3, 3, c); px.disc(g, cx, cy, 3, c); px.disc(g, cx, cy, 1.5, '#202030'); }
      else if (a === 'sq') { px.rect(g, cx - 2, cy - 2, 5, 5, c); px.rect(g, cx - 1, cy - 1, 3, 3, '#202030'); }
      else { px.poly(g, [[cx, cy - 3], [cx + 3, cy + 2], [cx - 3, cy + 2]], c); px.poly(g, [[cx, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]], '#202030'); }
      return R * 2 + 2;
    }
    const lab = { l1: xb ? 'LB' : 'L1', r1: xb ? 'RB' : 'R1', turbo: xb ? 'RT' : 'R2', opt: xb ? 'MENU' : 'OPT', cam: 'R3', tri: '' }[a] || a.toUpperCase();
    const w = E.font.width(lab) + 6; px.rect(g, x, y, w, 10, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 8, '#34384c'); E.font.text(g, lab, x + 3, y + 2, '#ffffff'); return w + 2;
  }
  // keyboard / mouse
  let lab = inp.label(a === 'opt' ? 'pause' : a) || a.toUpperCase();
  if (a === 'click') lab = dev === 'mouse' ? 'LMB' : 'CLICK'; if (a === 'rclick') lab = 'RMB';
  lab = lab.replace('Left click', 'LMB').replace('Right click', 'RMB').replace('Shift', 'SHIFT').replace('Space', 'SPACE');
  const w = Math.max(10, E.font.width(lab) + 6); px.rect(g, x, y + 1, w, 10, '#101018'); px.rect(g, x, y, w, 10, '#d8d8e0'); px.rect(g, x + 1, y + 1, w - 2, 7, '#f4f4f8'); E.font.text(g, lab, x + w / 2, y + 2, '#202030', { align: 'center' });
  return w + 2;
}
// text with {x} style glyph markup; returns total width. align 'center' supported via two passes
function prompt(g, str, x, y, inp, o = {}) {
  const parts = str.split(/(\{[a-z0-9]+\})/).filter(s => s); const col = o.color || '#ffffff';
  const wOf = () => parts.reduce((w, p) => w + (p[0] === '{' ? 12 : E.font.width(p)) , 0);
  let cx = o.align === 'center' ? x - Math.round(parts.reduce((w, p) => w + (p[0] === '{' ? (inp && inp.lastDevice === 'keyboard' ? 22 : 12) : E.font.width(p)), 0) / 2) : x;
  for (const p of parts) { if (p[0] === '{') cx += glyph(g, p.slice(1, -1), cx, y - 2, inp, o); else { E.font.text(g, p, cx, y, col, { shadow: '#000', outline: false }); cx += E.font.width(p); } }
  return cx - x;
}
TT.glyph = glyph; TT.prompt = prompt;

/* ==== 33-hud.js ==== */
/* THUGBY TURBO — HUD: score bug, meters, prompts, set-piece interfaces, banners, commentary. */
const tx = (g, s, x, y, c = '#fff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
const box = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#181c2c', '#0c0e18'], border: '#c8d0f0', alpha: .88 }, o));
const mkPortraits = () => ({
  BARRY: new E.Humanoid({ size: 1.2, hair: 'spiky', weapon: null, outfit: 'coat', colors: { skin: '#f0c0a0', hair: '#c04a1a', cloth: '#c83a2a', coat: '#c83a2a', pants: '#202030' } }),
  ROS: new E.Humanoid({ size: 1.2, hair: 'long', weapon: null, outfit: 'coat', colors: { skin: '#e8c0a8', hair: '#8a8a96', cloth: '#2a4a8a', coat: '#2a4a8a', pants: '#202030' } }),
  COACH: new E.Humanoid({ size: 1.2, hair: 'bald', weapon: null, outfit: 'coat', colors: { skin: '#c89070', hair: '#707070', cloth: '#2f6a3a', coat: '#2f6a3a', pants: '#202030' } }),
  REF: new E.Humanoid({ size: 1.2, hair: 'short', weapon: null, outfit: 'shirt', colors: { skin: '#e8b890', hair: '#6a6a70', cloth: '#18181c', pants: '#18181c' } })
});
function clockText() { const len = TUNE.v.halfLength, sec = Math.max(0, Math.floor((S.sudden ? 0 : Math.min(S.clock, len)) * 420 / len)); return S.sudden ? 'GOLD' : Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function drawHUD(r, inp) {
  r.overlay(g => {
    const W = r.W, H = r.H, T0 = S.teams[0], T1 = S.teams[1], t = V.t;
    // score bug
    const cor = TT.game.cornerArea && TT.game.cornerArea(); const bx = 6, by = 5;
    box(g, bx, by, 130, 32, { alpha: .8 });
    px.rect(g, bx + 4, by + 4, 3, 10, T0.c1); px.rect(g, bx + 4, by + 17, 3, 10, T1.c1);
    tx(g, T0.short, bx + 10, by + 5, '#fff'); tx(g, T1.short, bx + 10, by + 18, '#fff');
    tx(g, String(S.score[0]), bx + 100, by + 4, '#ffe070', { scale: 2, align: 'right' }); tx(g, String(S.score[1]), bx + 100, by + 17, '#ffe070', { scale: 2, align: 'right' });
    tx(g, clockText(), bx + 124, by + 5, S.hooter && Math.floor(t * 4) % 2 ? '#ff6060' : '#fff', { align: 'right' }); tx(g, S.sudden ? 'SUDDEN' : S.half === 1 ? '1ST' : '2ND', bx + 124, by + 18, '#a0a8d0', { align: 'right' });
    for (const k of [0, 1]) { const hy = by + 8 + k * 13; E.ui.bar(g, bx + 5, by + 34 + k * 5, 120, 3, S.hype[k] / 100, S.hype[k] >= 100 && Math.floor(t * 6) % 2 ? '#ffffff' : '#ff9030'); }
    // sin bin
    const bins = S.players.filter(p => p.st === 'binned'); bins.forEach((p, i) => tx(g, 'BIN ' + p.name.split(' ')[0].toUpperCase().slice(0, 7) + ' ' + (p.card === 'red' ? 'OFF' : Math.ceil(p.stT) + 's'), bx + 2, by + 50 + i * 9, p.card === 'red' ? '#ff6060' : '#ffe040', { font: 'tiny' }));
    // controlled player card (seat 0)
    S.seats.forEach((seat, i) => {
      if (seat.kind === 'cpu' || seat.auto) return; const p = S.players[seat.pid]; if (!p) return; const sx = i === 0 ? 6 : W - 112, sy = H - 44;
      box(g, sx, sy, 106, 38, { alpha: .75, border: SEAT_COL[i % 4] });
      tx(g, 'P' + (i + 1) + '  ' + p.name.toUpperCase().slice(0, 14), sx + 4, sy + 3, SEAT_COL[i % 4]); tx(g, ROLES[p.role], sx + 4, sy + 12, '#c0c8e8', { font: 'tiny' });
      E.ui.bar(g, sx + 4, sy + 22, 98, 4, p.onFire > 0 || p.power === 'pie' || S.dev.infTurbo ? 1 : p.turbo / TUNE.v.turboTank, p.turboOn ? '#ffe070' : '#60c8ff');
      if (p.kickMeter > 0) E.ui.bar(g, sx + 4, sy + 29, 98, 4, p.kickMeter, p.kickMeter > .9 ? '#80ff80' : '#ff9060');
      if (S.hype[p.team] >= 100) tx(g, 'SUPER!', sx + 102, sy + 12, Math.floor(t * 6) % 2 ? '#ffe070' : '#fff', { align: 'right' });
      if (p.power) tx(g, p.power.toUpperCase(), sx + 102, sy + 29, '#ffa0ff', { align: 'right', font: 'tiny' });
    });
    // contextual prompts
    const seat0 = S.seats[0], p0 = seat0 && S.players[seat0.pid];
    if (p0 && S.phase === 'play' && !seat0.auto && !(V.replay)) {
      const car = S.ball.holder === p0;
      const str = car ? (inGoalOf(p0) ? '{x} GROUND IT!  {l1}{r1} PASS  {ci} KICK' : '{x} STEP  {sq} FEND  {l1}{r1} PASS  {ci} KICK  {tri} SUPER') : (S.ball.holder && S.ball.holder.team !== p0.team ? '{x} TACKLE (HOLD: BIG HIT)  {sq} DIVE  {ci} SWITCH' : '{ci} SWITCH  {l1}{r1} UP/DOWN');
      prompt(g, str, W / 2, H - 12, inp, { align: 'center' });
      // pass receiver tags
      if (car) for (const side of [-1, 1]) { const rc = bestReceiver(p0, side, false); if (rc) { const [sx, sy] = r.w(rc.x, rc.y, 52); glyph(g, side < 0 ? 'l1' : 'r1', sx - 6, sy - 4, inp); } }
      if (V.hover >= 0 && inp.lastDevice !== 'gamepad') tx(g, V.hoverLegal ? 'CLICK: PASS' : 'FORWARD PASS!', W / 2, H - 26, V.hoverLegal ? '#80ff80' : '#ff6060', { align: 'center' });
    }
    // set pieces
    drawSetPieceHUD(g, r, inp);
    // banners
    S.banners.forEach((b, i) => { const k = Math.min(1, (b.t0 - b.t) * 8) * Math.min(1, b.t * 3); E.font.title(g, b.text, W / 2, 60 + i * 24 - (1 - k) * 8, { scale: b.text.length > 18 ? 1 : 2, colors: [b.color, b.color], align: 'center', outline: '#000', depth: 1, depthColor: '#000' }); });
    // radio
    if (S.radio && !V.replay) { const rad = S.radio, rig = V.portraits[rad.who]; const ry = H - 62; box(g, W / 2 - 92, ry, 184, 30, { alpha: .7 }); if (rig) rig.drawPortrait(g, W / 2 - 90, ry + 2, 26); tx(g, rad.who, W / 2 - 60, ry + 3, '#ffd070'); tx(g, rad.text.slice(0, 34), W / 2 - 60, ry + 13, '#fff', { font: 'tiny' }); if (rad.text.length > 34) tx(g, rad.text.slice(34, 68), W / 2 - 60, ry + 20, '#fff', { font: 'tiny' }); }
    // weather
    if (S.venue.hazard === 'wind') { const wx = W - 40, wy = 18; tx(g, 'WIND', wx, wy - 12, '#c0d0f0', { font: 'tiny', align: 'center' }); px.line(g, wx - 12, wy, wx + 12, wy, '#405070', 1); px.line(g, wx, wy, wx + S.windDir * S.wind * 14, wy, '#ffe070', 2); }
    if (S.ref.down > 0) tx(g, 'REF DOWN!', W / 2, 30, '#ffe070', { align: 'center', scale: 1 });
    if (S.adv) tx(g, 'ADVANTAGE', W / 2, 30, '#80ff80', { align: 'center' });
    if (S.venue.hazard === 'mud' && false) {}
    // letterbox for replay
    if (V.replay) { const k = Math.min(1, V.replay.t * 4); px.rect(g, 0, 0, W, 22 * k, '#000'); px.rect(g, 0, H - 22 * k, W, 22 * k, '#000'); tx(g, 'INSTANT REPLAY', 10, H - 16, '#ff6060', { scale: 1 }); prompt(g, '{x} SKIP', W - 60, H - 16, inp); }
    if (S.flash) { /* handled by engine flash */ }
    if (S.phase === 'halftime') { box(g, W / 2 - 110, 50, 220, 120, { alpha: .93 }); E.font.title(g, 'HALF TIME', W / 2, 58, { scale: 2, colors: ['#ffe070', '#ff9030'], align: 'center', outline: '#000' }); tx(g, T0.short + '  ' + S.score[0] + ' - ' + S.score[1] + '  ' + T1.short, W / 2, 84, '#fff', { align: 'center', scale: 1 }); tx(g, S.cfg.mode === 'cup' ? '"Pass backwards. Run forwards. Hit stuff." - COACH' : 'POSSESSION ' + Math.round(100 * S.stats[0].poss / Math.max(1, S.stats[0].poss + S.stats[1].poss)) + '%   TRIES ' + S.stats[0].tries + '-' + S.stats[1].tries, W / 2, 104, '#c0c8e8', { align: 'center' }); prompt(g, '{x} CONTINUE', W / 2, 150, inp, { align: 'center' }); }
  });
}
function drawSetPieceHUD(g, r, inp) {
  const W = r.W, H = r.H, s = S.sp, ph = S.phase, t = V.t;
  if (!s) return;
  if (ph === 'kickoff') {
    const hum = humanOn(s.team);
    tx(g, s.dropout ? '22 DROP-OUT' : 'KICK-OFF', W / 2, 30, '#fff', { align: 'center' });
    if (hum) { const [sx, sy] = r.w(G.CX + S.dir[s.team] * (110 + 290 * .5), G.CY + s.aim.y * 220, 0); const ax = s.dropout ? s.x : G.CX; const [rx, ry] = r.w(ax + S.dir[s.team] * lerp(120, 480, Math.max(.3, s.power || .5)), G.CY + s.aim.y * 220, 0); px.disc(g, rx, ry, 3, '#ffe070'); E.font.text(g, '+', rx, ry - 3, '#000', { align: 'center' }); E.ui.bar(g, W / 2 - 40, H - 60, 80, 6, s.power, s.power > .85 ? '#80ff80' : '#ff9060'); prompt(g, '{ci} HOLD & RELEASE: KICK   STICK: AIM', W / 2, H - 14, inp, { align: 'center' }); }
  } else if (ph === 'ruck') {
    const sp = s; const cx = W / 2; box(g, cx - 60, 28, 120, 18, { alpha: .7 }); px.rect(g, cx - 54, 34, 108, 6, '#202030'); px.rect(g, cx, 33, Math.round(clamp(sp.bar, -1, 1) * 54), 8, sp.bar >= 0 ? '#80ff80' : '#ff6060'); tx(g, 'RUCK', cx, 30, '#fff', { align: 'center', font: 'tiny' });
    const myTeam = S.seats[0] && S.seats[0].team; if (myTeam !== undefined) prompt(g, myTeam === sp.team ? '{x} MASH TO WIN THE BALL' : '{x} MASH   {sq} JACKAL (EARLY)', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'scrum') {
    const c = { setup: 'SCRUM', crouch: 'CROUCH', bind: 'BIND', set: 'SET!', push: 'SHOVE!' }[s.step]; E.font.title(g, c || '', W / 2, 30, { scale: 2, colors: ['#fff', '#c0c8e8'], align: 'center', outline: '#000' });
    if (s.step === 'push' || s.step === 'set') { box(g, W / 2 - 60, 56, 120, 12, { alpha: .8 }); px.rect(g, W / 2 - 54, 60, 108, 4, '#202030'); px.rect(g, W / 2, 59, Math.round(s.bar * 54 * (s.feed === 0 ? 1 : -1)), 6, '#ffe070'); }
    if (s.step === 'set') { const k = clamp(1 - s.stepT / .25, 0, 1); px.disc(g, W / 2, 90, 6 + k * 14, '#ffffff22'); px.disc(g, W / 2, 90, 6, '#ffe070'); }
    prompt(g, s.step === 'push' ? '{l1}{r1} ALTERNATE TO SHOVE' : s.step === 'set' ? '{x} NOW!' : 'WAIT FOR  SET  (PRESSING EARLY IS A FOUL)', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'lineout') {
    tx(g, 'LINEOUT', W / 2, 30, '#fff', { align: 'center', scale: 1 });
    const pods = ['FRONT', 'MIDDLE', 'BACK']; const T = s.throwTeam, D = opp(T);
    for (let i = 0; i < 3; i++) { const sel = s.callPod === i, dsel = s.defPod === i, x = W / 2 - 90 + i * 62; box(g, x, 56, 56, 20, { border: sel ? '#80ff80' : dsel ? '#ff9060' : '#505870', alpha: .8 }); tx(g, pods[i], x + 28, 62, '#fff', { align: 'center', font: 'tiny' }); }
    if (s.step === 'call') prompt(g, '{l1}{r1} PICK A POD  {x} LOCK IT', W / 2, H - 14, inp, { align: 'center' });
    if (s.step === 'throw') { box(g, W / 2 - 62, 86, 124, 14); px.rect(g, W / 2 - 14, 89, 28, 8, '#2a8a3a'); px.rect(g, W / 2 - 30, 89, 16, 8, '#8a8a2a'); px.rect(g, W / 2 + 14, 89, 16, 8, '#8a8a2a'); px.rect(g, W / 2 - 58 + Math.round(s.needle * 116) - 1, 86, 3, 14, '#fff'); prompt(g, humanOn(T) ? '{x} STOP THE NEEDLE IN THE GREEN' : humanOn(D) ? 'WAIT FOR THE THROW...' : '', W / 2, H - 14, inp, { align: 'center' }); }
    if (s.step === 'jump') prompt(g, humanOn(D) && s.defPod === s.callPod ? '{x} NOW! (TIME THE JUMP)' : 'UP HE GOES...', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'penalty') {
    box(g, W / 2 - 130, 52, 260, 70, { alpha: .9 }); E.font.title(g, s.free ? 'FREE KICK' : 'PENALTY', W / 2, 56, { scale: 1, colors: ['#ffe070', '#ff9030'], align: 'center', outline: '#000' });
    s.opts.forEach((o, i) => { const x = W / 2 - 126 + i * (252 / s.opts.length) + 4, w = 252 / s.opts.length - 8; box(g, x, 72, w, 44, { border: i === s.sel ? '#80ff80' : '#505870', bg: i === s.sel ? ['#2a4a2a', '#102010'] : ['#181c2c', '#0c0e18'] }); tx(g, o, x + w / 2, 90, i === s.sel ? '#fff' : '#a0a8c0', { align: 'center', font: 'tiny' }); });
    prompt(g, humanOn(s.team) ? '{l1}{r1} CHOOSE  {x} CONFIRM' : 'THE OTHER SIDE CHOOSES...', W / 2, H - 14, inp, { align: 'center' });
  } else if (ph === 'kick') {
    tx(g, s.kind === 'conv' ? 'CONVERSION' : 'PENALTY KICK', W / 2, 30, '#fff', { align: 'center' }); tx(g, Math.round(Math.hypot(atkX(s.team) - s.x, s.y - G.CY) / 10.24) + ' M', W / 2, 42, '#ffe070', { align: 'center', font: 'tiny' }); tx(g, Math.max(0, Math.ceil(s.shot)) + 's', W - 30, 20, s.shot < 6 ? '#ff6060' : '#fff', { align: 'right' });
    if (humanOn(s.team) && s.step !== 'fly' && s.step !== 'done') {
      // reticle on the posts
      const ax = atkX(s.team), ang = s.aimX * .22 + s.sway; const yc = s.y + Math.tan(Math.atan2(G.CY - s.y, Math.abs(ax - s.x)) + ang) * Math.abs(ax - s.x); const [rx, ry] = r.w(ax, yc, 60); px.disc(g, rx, ry, 4, '#ff6060'); px.disc(g, rx, ry, 2, '#fff');
      const need = kickNeed(Math.abs(ax - s.x)); box(g, W / 2 - 50, H - 48, 100, 12); px.rect(g, W / 2 - 46 + Math.round(92 * need) - 1, H - 46, 2, 8, '#fff'); px.rect(g, W / 2 - 46, H - 45, Math.round(92 * s.power), 6, s.power > need - .06 && s.power < need + .06 ? '#80ff80' : '#ff9060');
      const wy = 30, wx = W - 70; tx(g, 'WIND', wx, wy - 10, '#c0d0f0', { font: 'tiny' }); px.line(g, wx - 15, wy, wx + 15, wy, '#405070', 1); px.line(g, wx, wy, wx + S.wind * S.windDir * 14, wy, '#ffe070', 2);
      prompt(g, s.step === 'place' ? '{x} PLACE THE TEE (STICK: BACK/FORWARD)' : '{ci} HOLD: POWER  STICK: AIM  RELEASE AT THE MARK', W / 2, H - 14, inp, { align: 'center' });
    }
  }
}

/* ==== 34-audio.js ==== */
/* THUGBY TURBO — audio: every sound, tune and voice is written in code (no files). Voices are Animalese-style babble. */
const A = () => TT.game && TT.game.audio;
const sfx = (o, vol) => { const a = A(); if (a && TT.cfg.present) try { a.sfx(o, vol ? { vol } : undefined); } catch (e) { /* audio not ready */ } };
const whistle = (long) => { sfx({ wave: 'sine', freq: 1900, to: 2100, dur: long ? .7 : .28, vol: .16, vib: [22, .04] }); sfx({ wave: 'sine', freq: 1500, to: 1650, dur: long ? .7 : .28, vol: .1, vib: [26, .05] }); };
const roar = (k = 1) => sfx({ wave: 'noise', freq: 900, to: 400, dur: .9 * k, vol: .12 * Math.min(1.5, k), filter: 'bandpass', q: .6 });
const thud = (k = 1) => { sfx({ wave: 'noise', freq: 300, to: 80, dur: .18, vol: .3 * k }); sfx({ wave: 'sine', freq: 120, to: 40, dur: .22, vol: .3 * k }); };
const VOICES = { BARRY: { wave: 'square', f: 330, v: 140, rate: .055, vol: .06 }, ROS: { wave: 'triangle', f: 190, v: 60, rate: .075, vol: .11 }, COACH: { wave: 'saw', f: 130, v: 50, rate: .08, vol: .06 }, REF: { wave: 'pulse', f: 520, v: 120, rate: .06, vol: .07 }, CAPTAIN: { wave: 'saw', f: 160, v: 90, rate: .06, vol: .06 } };
function babble(who, text) {
  if (!TT.cfg.present || !A()) return; const V0 = VOICES[who] || VOICES.CAPTAIN; let i = 0, n = 0;
  for (const ch of text) { if (!/[a-z0-9]/i.test(ch)) { i += 1; continue; } if (n++ > 22) break; const h = (ch.charCodeAt(0) * 37 + i * 11) % 100 / 100, f = V0.f + (h - .5) * V0.v * 2 + (/[aeiou]/i.test(ch) ? 40 : 0); const d = i * V0.rate * 1.2 * 1000; setTimeout(() => { sfx({ wave: V0.wave, freq: f, to: f * (1 + (h - .5) * .5), dur: V0.rate * .9, vol: V0.vol }); }, d); i++; }
}
TT.voice = babble;
const _say = say; // commentary hook: voice on every radio line
say = function (who, text, t) { _say(who, text, t); if (S && S.cfg.mode !== 'attract') babble(who, text); };
// ---- songs
const SONGS = {
  title: { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .12, notes: 'E4 - G4 - A4 - G4 E4 | G4 - A4 - B4 - A4 G4 | E5 - D5 - B4 - A4 G4 | A4 - G4 - E4 . . . |' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'E2 . E2 . E2 . G2 . | A2 . A2 . A2 . B2 . | C3 . C3 . B2 . B2 . | A2 . A2 . E2 . E2 . |' },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k k h . s . s s |' }] },
  match: { bpm: 140, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'D2 . D2 D2 . D2 F2 . | G2 . G2 G2 . G2 A2 . | A#2 . A#2 A#2 . A#2 A2 . | G2 . F2 . D2 . D2 . |' },
    { name: 'lead', wave: 'pulse', vol: .08, on: false, notes: 'D4 - F4 - A4 - F4 - | G4 - A#4 - D5 - A#4 - | A#4 - D5 - F5 - D5 - | A4 - G4 - F4 - D4 - |' },
    { name: 'drums', wave: 'drums', vol: .16, on: false, notes: 'k . . . s . . . | k . . k s . . . | k . . . s . h h | k . k . s . s s |' },
    { name: 'fire', wave: 'saw', vol: .07, on: false, notes: 'D5 . D5 . F5 . D5 . | G5 . G5 . A5 . G5 . | A#5 . A#5 . D6 . A#5 . | A5 . G5 . F5 . D5 . |' }] },
  menu: { bpm: 100, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .13, notes: 'C4 - - - E4 - - - | F4 - - - A4 - - - | G4 - - - B4 - - - | C4 - - - G3 - - - |' },
    { name: 'bass', wave: 'sine', vol: .2, notes: 'C2 . . . C2 . . . | F2 . . . F2 . . . | G2 . . . G2 . . . | C2 . . . G2 . . . |' }] },
  win: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - . G5 C6 | E6 - - - . . . . |' }, { wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . | C3 - - - . . . . |' }] },
  lose: { bpm: 80, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'E4 - D4 - C4 - A3 - | G#3 - - - - - - - |' }] }
};
function music(name, o) { const a = A(); if (!a || !TT.cfg.present) return; try { a.music(SONGS[name], o); TT.curSong = name; } catch (e) { /* ok */ } }
function musicLayers() { const a = A(); if (!a || !TT.cfg.present || TT.curSong !== 'match') return; try { const h = Math.max(S.hype[0], S.hype[1]); a.layer('lead', h > 30 ? .08 : 0, .5); a.layer('drums', h > 55 || S.phase === 'try' ? .16 : 0, .5); a.layer('fire', S.players.some(p => p.onFire > 0 || p.superKind) ? .07 : 0, .3); } catch (e) { /* layers unavailable */ } }
// ---- event sounds
const ON = (n, f) => bus.on(n, d => { if (TT.cfg.present && TT.game && S && S.cfg.mode !== 'attract-mute') f(d); });
ON('kickoff', () => { whistle(); });
ON('tackle', d => { thud(.8); sfx('hit'); });
ON('bigHit', d => { thud(1.3); sfx('punch'); roar(.8); });
ON('monsterHit', d => { thud(1.8); sfx('explode'); roar(1.5); });
ON('missedTackle', () => sfx('whoosh', .5)); ON('brokenTackle', () => sfx('swing', .6)); ON('sidestep', () => sfx('whoosh', .5)); ON('spin', () => sfx('whoosh', .7)); ON('fend', () => sfx('bump'));
ON('pass', () => sfx({ wave: 'noise', freq: 1800, to: 900, dur: .12, vol: .08 })); ON('catch', () => sfx({ wave: 'noise', freq: 500, to: 300, dur: .06, vol: .12 }));
ON('kick', d => { sfx('kick'); sfx({ wave: 'sine', freq: 220, to: 90, dur: .15, vol: .25 }); });
ON('bounce', () => sfx({ wave: 'sine', freq: 140, to: 100, dur: .07, vol: .12 }));
ON('try', () => { if (A()) try { A().sting && A().sting(SONGS.win); } catch (e) { /* ok */ } roar(2); whistle(true); });
ON('conversion', () => { roar(1.2); sfx('coin'); }); ON('penaltyGoal', () => { roar(1.2); sfx('coin'); }); ON('dropGoal', () => { roar(1.6); sfx('powerup'); });
ON('goalMiss', () => { sfx({ wave: 'noise', freq: 400, to: 200, dur: .5, vol: .1 }); sfx('hurt', .6); });
ON('knockOn', () => whistle()); ON('forwardPass', () => whistle()); ON('touch', () => whistle()); ON('deadBall', () => whistle()); ON('foul', () => whistle(true)); ON('penalty', () => whistle());
ON('scrumCall', d => sfx({ wave: 'square', freq: d.c === 'set' ? 520 : 340, dur: .1, vol: .12 })); ON('scrumWon', () => sfx('confirm'));
ON('ruck', () => sfx('step')); ON('ruckWon', () => sfx('select')); ON('turnover', () => { roar(.8); sfx('powerup', .6); }); ON('jackal', () => sfx('stomp'));
ON('lineoutThrow', () => sfx('swing')); ON('lineoutWon', () => sfx('pickup')); ON('lineoutStolen', () => sfx('hurt', .6)); ON('notStraight', () => whistle());
ON('card', d => { whistle(true); [0, 1, 2, 3].forEach(i => setTimeout(() => sfx({ wave: 'saw', freq: 220 - i * 30, dur: .22, vol: .12 }), 200 + i * 220)); });
ON('powerupThrow', () => sfx('whoosh', .7)); ON('powerupTake', () => sfx('powerup')); ON('superReady', () => sfx('oneup')); ON('superStart', () => { sfx('charge'); roar(1); }); ON('onFire', () => { sfx('powerup'); roar(1.4); });
ON('hooter', () => sfx({ wave: 'saw', freq: 180, dur: 1.1, vol: .2, hold: true })); ON('halftime', () => whistle(true)); ON('fulltime', () => whistle(true)); ON('suddenDeath', () => sfx('boom'));
ON('hazard', d => { if (d.kind === 'lightning') { sfx({ wave: 'noise', freq: 3000, to: 200, dur: .9, vol: .3 }); setTimeout(() => sfx('boom'), 120); } else if (d.kind === 'flame') sfx({ wave: 'noise', freq: 1200, to: 500, dur: .6, vol: .16 }); });
ON('hazardWarn', d => sfx({ wave: 'square', freq: 880, dur: .08, vol: .1, arp: [0, 7, 0, 7], step: .08 }));
ON('chickenBowl', () => { sfx({ wave: 'square', freq: 700, to: 400, dur: .12, vol: .1 }); sfx({ wave: 'square', freq: 650, to: 350, dur: .12, vol: .1, delay: .14 }); });
ON('refDown', () => { sfx('hurt'); roar(1.2); }); ON('interception', () => sfx('powerup', .6)); ON('skittle', () => sfx('bump', .6));
ON('toasted', d => sfx(d.kind === 'flame' ? 'explode' : 'laser', .6)); ON('useIt', () => whistle()); ON('advantage', () => sfx({ wave: 'sine', freq: 1700, dur: .2, vol: .1 }));
let crowdT = 0;
function crowdBed(dt) { crowdT -= dt; if (crowdT > 0 || !TT.cfg.present || !A()) return; crowdT = .45; const ex = (Math.max(S.hype[0], S.hype[1]) / 100) * .6 + (S.phase === 'play' ? .3 : .1); sfx({ wave: 'noise', freq: 700 + ex * 500, to: 600, dur: .5, vol: .02 + .035 * ex, filter: 'bandpass', q: .5 }); }
TT.audio = { music, musicLayers, crowdBed, SONGS };

/* ==== 40-ui.js ==== */
/* THUGBY TURBO — 10-foot menus (big text, one focus, pad/keys/mouse), shared backdrop, store helpers. */
const store = E.store;
const UI = { stars: [], t: 0, portraits: null };
function mkMenu(items, o = {}) { return Object.assign({ items, i: 0, rects: [], x: 'center', y: 80, w: 180, sp: 21, scale: 2, hoverT: 0 }, o); }
function menuStep(m, inp, game, dt) {
  const n = m.items.length; if (!n) return null; let moved = false;
  const vis = m.items.map((it, i) => i).filter(i => !m.items[i].hidden);
  const go = d => { let k = m.i; do { k = (k + d + n) % n; } while (m.items[k].hidden || m.items[k].disabled && false); m.i = k; moved = true; game.audio.sfx('select'); };
  if (inp.repeat('down', .35, .1)) go(1); if (inp.repeat('up', .35, .1)) go(-1);
  const it = m.items[m.i];
  let dx = 0; if (inp.repeat('right', .35, .12)) dx = 1; if (inp.repeat('left', .35, .12)) dx = -1; if (inp.pressed('r1')) dx = dx || 1; if (inp.pressed('l1')) dx = dx || -1;
  if (dx && it && it.adjust) { it.adjust(dx); game.audio.sfx('select'); }
  // mouse
  const pm = inp.pointer && inp.pointer(); if (pm && m.rects.length) { if (!m._pm || Math.abs(pm[0] - m._pm[0]) + Math.abs(pm[1] - m._pm[1]) > 1) { m._pm = pm.slice(); for (let i = 0; i < m.rects.length; i++) { const q = m.rects[i]; if (q && pm[0] >= q[0] && pm[0] <= q[0] + q[2] && pm[1] >= q[1] && pm[1] <= q[1] + q[3] && m.i !== i) { m.i = i; game.audio.sfx('select'); } } } }
  const ck = inp.clicked && inp.clicked(); if (ck && m.rects.length) { for (let i = 0; i < m.rects.length; i++) { const q = m.rects[i]; if (q && ck[0] >= q[0] && ck[0] <= q[0] + q[2] && ck[1] >= q[1] && ck[1] <= q[1] + q[3]) { m.i = i; if (m.items[i].adjust && !m.items[i].fn) { m.items[i].adjust(ck[0] > q[0] + q[2] / 2 ? 1 : -1); } else { game.audio.sfx('confirm'); return m.items[i]; } } } }
  if (inp.pressed('confirm') || inp.pressed('x')) { const c = m.items[m.i]; if (c && !c.disabled) { if (c.fn) { game.audio.sfx('confirm'); return c; } else if (c.adjust) c.adjust(1); } else if (c) game.audio.sfx('cancel'); }
  if (inp.pressed('cancel') || inp.pressed('ci')) { if (m.onBack) { game.audio.sfx('cancel'); m.onBack(); } }
  return null;
}
function menuDraw(g, m, W, H, inp) {
  const sc = m.scale, lh = m.sp; const x0 = m.x === 'center' ? W / 2 : m.x; m.rects = [];
  m.items.forEach((it, i) => {
    if (it.hidden) { m.rects.push(null); return; } const y = m.y + (m.map ? m.map(i) : i) * lh, sel = i === m.i;
    const label = typeof it.label === 'function' ? it.label() : it.label; const w = Math.max(m.w, E.font.width(label, { scale: sc }) + 24);
    const bx = m.x === 'center' ? x0 - w / 2 : x0; m.rects.push([bx, y - 2, w, lh - 2]);
    if (sel) { E.ui.box(g, bx, y - 2, w, lh - 2, { bg: ['#3a5a9a', '#1a2a5a'], border: '#ffe070', alpha: .95 }); px.poly(g, [[bx - 8, y + 3], [bx - 2, y + 7], [bx - 8, y + 11]], '#ffe070'); }
    else E.ui.box(g, bx, y - 2, w, lh - 2, { bg: ['#1c2038', '#10121f'], border: '#3a4060', alpha: .8 });
    E.font.text(g, label, x0, y + (sc > 1 ? 1 : 3), it.disabled ? '#707890' : sel ? '#ffffff' : '#c0c8e8', { scale: sc, align: m.x === 'center' ? 'center' : 'left', shadow: '#000', outline: false });
    if (sel && it.adjust) { E.font.text(g, '<', bx + 4, y + 3, '#ffe070', { scale: 1 }); E.font.text(g, '>', bx + w - 12, y + 3, '#ffe070', { scale: 1 }); }
  });
}
function backdrop(r, t, dim) {
  r.overlay(g => {
    const W = r.W, H = r.H; E.ui.box(g, 0, 0, W, H, { bg: ['#14204a', '#e8782a'], border: false, gradient: true, alpha: 1 }); 
    // stadium: crowd bands, pitch trapezoid, floodlights
    for (let i = 0; i < 3; i++) { px.rect(g, 0, H * .38 + i * 8, W, 8, ['#2a2a3a', '#343448', '#3e3e58'][i]); for (let x = 0; x < W; x += 5) { const h = E.hash2(x, i); px.rect(g, x, H * .38 + i * 8 + 1 + Math.sin(t * 3 + x) * .8, 3, 3, ['#e8443a', '#3b82f6', '#f5b700', '#f2f2f2', '#22c55e'][Math.floor(h * 5)]); } }
    px.poly(g, [[0, H * .62], [W, H * .62], [W, H], [0, H]], '#2f7a34'); for (let i = 0; i < 9; i++) px.poly(g, [[i * W / 9 - 40 + 30, H * .62], [(i + 1) * W / 9 - 40 + 30, H * .62], [(i + 1) * W / 9 * 1.6 - W * .3, H], [i * W / 9 * 1.6 - W * .3, H]], i & 1 ? '#378a3c' : '#2f7a34');
    for (const lx of [W * .12, W * .88]) { px.rect(g, lx - 1, H * .1, 3, H * .3, '#202030'); px.rect(g, lx - 10, H * .08, 21, 7, '#fff8d0'); px.polyDither(g, [[lx - 8, H * .15], [lx + 8, H * .15], [lx + 60 * Math.sign(W / 2 - lx), H * .8], [lx - 20 * Math.sign(W / 2 - lx), H * .8]], '#fff8d0', .08, r.ix, r.iy); }
    if (dim) px.rect(g, 0, 0, W, H, 'rgba(0,0,0,0.5)');
  });
}
function titleLogo(g, W, y, t) { E.font.title(g, 'THUGBY', W / 2, y, { scale: 4, colors: ['#ffe070', '#ff8020'], align: 'center', outline: '#000', depth: 3, depthColor: '#5a1a00' }); E.font.title(g, 'TURBO', W / 2, y + 30 + Math.sin(t * 3) * 1.5, { scale: 3, colors: ['#ff6a50', '#d8203a'], align: 'center', outline: '#000', depth: 2, depthColor: '#401010' }); }
function getPortraits() { if (!UI.portraits) UI.portraits = mkPortraits(); return UI.portraits; }
function header(g, W, text, sub) { E.font.title(g, text, W / 2, 10, { scale: 2, colors: ['#ffe070', '#ff9030'], align: 'center', outline: '#000' }); if (sub) E.font.text(g, sub, W / 2, 30, '#c0c8e8', { align: 'center', shadow: '#000', outline: false }); }
function footer(g, W, H, inp, str) { prompt(g, str, W / 2, H - 14, inp, { align: 'center' }); }
const loadJSON = (k, d) => { try { return store.get(k, d); } catch (e) { return d; } };
const saveJSON = (k, v) => { try { store.set(k, v); } catch (e) { /* storage blocked */ } };

// ---------- records (arcade tables with initials)
const REC = { cats: [['margin', 'BIGGEST WIN MARGIN', 'pts'], ['tries', 'MOST TRIES IN A MATCH', ''], ['hits', 'MOST BIG HITS', ''], ['metres', 'MOST METRES RUN', 'm']] };
function getRecords() { const r = loadJSON('thugby:records', null); if (r) return r; const d = {}; REC.cats.forEach(([k], c) => { d[k] = [['ROS', 12 - c * 3], ['BAZ', 9 - c * 2], ['NIG', 6 - c], ['MAX', 4], ['PIE', 2]].map(([n, s]) => ({ n, s: Math.max(1, s) })); }); return d; }
function qualifies(cat, val) { const t = getRecords()[cat]; return val > 0 && (t.length < 5 || val > t[t.length - 1].s); }
function addRecord(cat, val, name) { const r = getRecords(); r[cat].push({ n: name, s: val }); r[cat].sort((a, b) => b.s - a.s); r[cat] = r[cat].slice(0, 5); saveJSON('thugby:records', r); }

/* ==== 41-scenes.js ==== */
/* THUGBY TURBO — front-end scenes: title, attract, touch-only, cup, story, exhibition, training, records, about, results. */
const SCENES = {};
const TEAM_IDS = ['hawks', 'rovers', 'titans', 'mudlarks', 'dockers', 'flames', 'meteors'], VENUE_IDS = ['muddington', 'docks', 'furnace', 'megadome'];
const cycle = (arr, cur, d) => arr[(arr.indexOf(cur) + d + arr.length) % arr.length];
const OPT = { home: 'hawks', away: 'rovers', venue: 'muddington', players: 0, half: 120 };
TT.touchOnly = false;
function detectTouchOnly() {
  try { const m = matchMedia; const coarse = m('(any-pointer: coarse)').matches, fine = m('(any-pointer: fine)').matches; TT.touchOnly = coarse && !fine; } catch (e) { TT.touchOnly = false; }
  const off = () => { TT.touchOnly = false; };
  addEventListener('keydown', off); addEventListener('gamepadconnected', off); addEventListener('mousemove', e => { if (e.pointerType !== 'touch') off(); }, { once: false });
}
const anyInput = (inp) => inp.anyPressed() || Math.hypot(...inp.move()) > .2 || (inp.clicked && inp.clicked());

SCENES.title = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter(data) { const game = TT.game; game.input.touchEnabled = false; UI.idle = 0; UI.t = 0; UI.mxy = null; this.build(); music('title'); },
  build() {
    const cup = loadJSON('thugby:cup', null), started = cup && cup.round > 0 && cup.round < 4;
    this.m = mkMenu([
      { label: started ? 'CONTINUE MEGA CUP' : 'MEGA CUP', fn: () => TT.game.go('cup') },
      { label: 'EXHIBITION', fn: () => TT.game.go('exhibition') }, { label: 'TRAINING GROUND', fn: () => TT.game.go('training') },
      { label: 'RECORDS', fn: () => TT.game.go('records') }, { label: 'SETTINGS', fn: () => TT.game.menu('settings') }, { label: 'ABOUT & CREDITS', fn: () => TT.game.go('about') }], { y: 92, w: 170, sp: 20, scale: 1.5 });
    this.m.scale = 1;
    this.m.sp = 18;
  },
  update(dt) {
    const game = TT.game, inp = game.input; UI.t += dt; UI.idle += dt;
    const pm = inp.pointer && inp.pointer(); if (pm) { if (UI.mxy && Math.abs(pm[0] - UI.mxy[0]) + Math.abs(pm[1] - UI.mxy[1]) > 2) UI.idle = 0; UI.mxy = pm.slice(); }
    if (anyInput(inp)) UI.idle = 0;
    if (TT.touchOnly) { const ck = inp.clicked && inp.clicked(); if (ck && ck[1] > 150) game.menu('settings'); if (UI.idle > 10) game.go('match', { mode: 'attract' }); return; }
    const it = menuStep(this.m, inp, game, dt); if (it) it.fn();
    if (UI.idle > 10) game.go('match', { mode: 'attract' });
  },
  draw(r) {
    const inp = TT.game.input; backdrop(r, UI.t);
    r.overlay(g => {
      const W = r.W, H = r.H; titleLogo(g, W, 12, UI.t); E.font.text(g, 'OVER-THE-TOP ARCADE RUGBY SEVENS', W / 2, 78, '#ffe9b0', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      if (TT.touchOnly) { E.ui.box(g, 6, 96, W - 12, 48, { alpha: .9 }); E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, 102, '#ffffff', { align: 'center', scale: 1.5, shadow: '#000', outline: false }); E.font.text(g, 'Connect a controller or a keyboard to play.', W / 2, 124, '#c0c8e8', { align: 'center', shadow: '#000', outline: false }); E.ui.box(g, W / 2 - 60, 160, 120, 28, { bg: ['#3a5a9a', '#1a2a5a'], border: '#ffe070' }); E.font.text(g, 'SETTINGS', W / 2, 168, '#fff', { align: 'center', scale: 1.5 }); return; }
      menuDraw(g, this.m, W, H, inp);
      const p = getPortraits(); p.BARRY.drawPortrait(g, 16, H - 62, 44); p.ROS.drawPortrait(g, W - 60, H - 62, 44);
      E.font.text(g, 'LIVE ON CHANNEL THUD', 6, 4, '#ff6060', { shadow: '#000', outline: false, font: 'tiny' });
      footer(g, W, H, inp, '{x} SELECT   {ci} BACK   IDLE 10s: ATTRACT');
      E.font.text(g, 'v' + TT.version + '  my-3D2dge ' + E.version, W - 4, 4, '#8890b0', { align: 'right', font: 'tiny' });
    });
  }
};
// ---------- cup
const CUPSAVE = () => loadJSON('thugby:cup', { round: 0, results: [] });
SCENES.cup = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; const c = CUPSAVE(); this.c = c; const done = c.round >= 4; this.m = mkMenu([
    { label: done ? 'REPLAY THE FINAL' : 'PLAY ' + CUP[Math.min(3, c.round)].title, fn: () => TT.game.go('story', { cup: done ? 3 : c.round, stage: 'pre' }) },
    { label: 'TRAINING GROUND', fn: () => TT.game.go('training') }, { label: 'RESTART CUP', fn: () => { saveJSON('thugby:cup', { round: 0, results: [] }); TT.game.go('cup'); } }, { label: 'BACK', fn: () => TT.game.go('title') }], { y: 150, w: 150, sp: 20, scale: 1 }); this.m.onBack = () => TT.game.go('title'); music('menu'); },
  update(dt) { UI.t += dt; const it = menuStep(this.m, TT.game.input, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => {
    const W = r.W, H = r.H; header(g, W, 'THE MEGA CUP', 'FOUR MATCHES. ONE TROPHY. NO MERCY.');
    CUP.forEach((c, i) => { const x = 10 + i * 102, y = 44, T = TEAMS[c.opp], done = i < this.c.round, next = i === Math.min(3, this.c.round); E.ui.box(g, x, y, 96, 88, { bg: done ? ['#1f4a2a', '#0e2012'] : next ? ['#3a4a9a', '#1a2260'] : ['#20202c', '#101018'], border: next ? '#ffe070' : done ? '#80ff80' : '#404058' });
      E.font.text(g, c.title, x + 48, y + 5, next ? '#ffe070' : '#c0c8e8', { align: 'center', font: 'tiny', shadow: '#000', outline: false }); px.rect(g, x + 28, y + 16, 40, 24, T.c1); px.rect(g, x + 28, y + 36, 40, 4, T.c2); E.font.text(g, T.crest, x + 48, y + 20, T.c2, { align: 'center', scale: 2 }); E.font.text(g, T.short, x + 48, y + 46, '#fff', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, VENUES[c.venue].name, x + 48, y + 58, '#a0a8d0', { align: 'center', font: 'tiny' }); E.font.text(g, done ? 'WON ' + (this.c.results[i] || '') : next ? 'UP NEXT' : 'LOCKED', x + 48, y + 74, done ? '#80ff80' : next ? '#ffe070' : '#707890', { align: 'center', font: 'tiny' }); });
    E.font.text(g, CUP[Math.min(3, this.c.round)].hint, W / 2, 138, '#ffd9a0', { align: 'center', shadow: '#000', outline: false });
    menuDraw(g, this.m, W, H, inp); footer(g, W, H, inp, '{x} SELECT   {ci} BACK'); }); }
};
SCENES.story = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter(d) { UI.t = 0; this.d = d; const c = CUP[d.cup]; this.lines = d.stage === 'pre' ? c.pre : [['COACH', c.post[0]]]; if (d.stage === 'post') { const T = TEAMS[c.opp]; this.lines = [['BARRY', 'And that is full time!'], ['COACH', c.post[0]]]; } this.i = 0; this.ch = 0; this.say(); music('menu'); },
  say() { const l = this.lines[this.i]; this.ch = 0; this.full = false; TT.voice(l[0], l[1]); },
  update(dt) { UI.t += dt; const inp = TT.game.input, l = this.lines[this.i]; this.ch = Math.min(l[1].length, this.ch + dt * 38);
    if (inp.pressed('confirm') || inp.pressed('x') || (inp.clicked && inp.clicked())) { if (this.ch < l[1].length) this.ch = l[1].length; else { this.i++; if (this.i >= this.lines.length) { if (this.d.stage === 'pre') TT.game.go('match', { mode: 'cup', cup: this.d.cup }); else TT.game.go('cup'); } else this.say(); } }
    if (inp.pressed('cancel') || inp.pressed('start')) { if (this.d.stage === 'pre') TT.game.go('match', { mode: 'cup', cup: this.d.cup }); else TT.game.go('cup'); } },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H, l = this.lines[this.i], c = CUP[this.d.cup]; header(g, W, c.title, TEAMS[c.opp].name + ' @ ' + VENUES[c.venue].name);
    const rig = getPortraits()[l[0]]; E.ui.box(g, 20, 70, 387, 100, { alpha: .9 }); if (rig) rig.drawPortrait(g, 28, 80, 64); E.font.text(g, l[0], 104, 80, '#ffd070', { scale: 2, shadow: '#000', outline: false });
    E.font.text(g, l[1].slice(0, Math.floor(this.ch)), 104, 104, '#ffffff', { wrap: 290, shadow: '#000', outline: false }); footer(g, W, H, inp, '{x} NEXT   {pause} SKIP'); }); }
};
// ---------- exhibition
SCENES.exhibition = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; const nm = ['1 PLAYER', '2 PLAYERS: CO-OP', '2 PLAYERS: VERSUS'];
    this.m = mkMenu([
      { label: () => 'HOME: ' + TEAMS[OPT.home].short, adjust: d => { OPT.home = cycle(TEAM_IDS, OPT.home, d); } }, { label: () => 'AWAY: ' + TEAMS[OPT.away].short, adjust: d => { OPT.away = cycle(TEAM_IDS, OPT.away, d); } },
      { label: () => 'STADIUM: ' + VENUES[OPT.venue].name, adjust: d => { OPT.venue = cycle(VENUE_IDS, OPT.venue, d); } }, { label: () => nm[OPT.players], adjust: d => { OPT.players = (OPT.players + d + 3) % 3; } },
      { label: () => 'HALVES: ' + (OPT.half / 60) + ' MIN', adjust: d => { OPT.half = clamp(OPT.half + d * 60, 120, 300); } },
      { label: 'KICK OFF!', fn: () => { if (OPT.home === OPT.away) OPT.away = cycle(TEAM_IDS, OPT.away, 1); TT.game.go('match', { mode: 'exh', home: OPT.home, away: OPT.away, venue: OPT.venue, players: OPT.players, half: OPT.half }); } }, { label: 'BACK', fn: () => TT.game.go('title') }], { y: 62, w: 240, sp: 20, scale: 1 });
    this.m.onBack = () => TT.game.go('title'); music('menu'); },
  update(dt) { UI.t += dt; const it = menuStep(this.m, TT.game.input, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'EXHIBITION', 'ANY TWO TEAMS, ANY STADIUM, UP TO TWO PLAYERS');
    menuDraw(g, this.m, W, H, inp); const A = TEAMS[OPT.home], B = TEAMS[OPT.away]; px.rect(g, 30, 190, 60, 20, A.c1); px.rect(g, 30, 206, 60, 4, A.c2); px.rect(g, W - 90, 190, 60, 20, B.c1); px.rect(g, W - 90, 206, 60, 4, B.c2); E.font.text(g, 'VS', W / 2, 196, '#ffe070', { align: 'center', scale: 2, shadow: '#000', outline: false });
    E.font.text(g, VENUES[OPT.venue].blurb, W / 2, 218, '#c0c8e8', { align: 'center', shadow: '#000', outline: false, font: 'tiny' }); if (OPT.players) E.font.text(g, 'P2: PRESS 2 / ENTER ON KEYBOARD, OR START ON A SECOND PAD', W / 2, 40, '#ffd9a0', { align: 'center', font: 'tiny' }); footer(g, W, H, inp, '{x} CHANGE   {l1}{r1} ADJUST   {ci} BACK'); }); }
};
// ---------- training
SCENES.training = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; const done = loadJSON('thugby:drills', {}); this.done = done; this.m = mkMenu(DRILLS.map((d, i) => ({ label: (done[d.id] ? '[DONE] ' : '') + (i + 1) + '. ' + d.name, fn: () => TT.game.go('match', { mode: 'drill', drill: d.id }) })).concat([{ label: 'BACK', fn: () => TT.game.go('title') }]), { y: 36, w: 200, sp: 18, scale: 1 }); this.m.onBack = () => TT.game.go('title'); music('menu'); },
  update(dt) { UI.t += dt; const it = menuStep(this.m, TT.game.input, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'TRAINING GROUND', 'NINE DRILLS. EACH ONE IS A LESSON.'); menuDraw(g, this.m, W, H, inp);
    const D = DRILLS[this.m.i]; if (D) { E.ui.box(g, 10, 198, W - 20, 28, { alpha: .8 }); E.font.text(g, D.text, 16, 202, '#fff', { wrap: W - 40, shadow: '#000', outline: false, font: 'tiny' }); E.font.text(g, 'GOAL: ' + D.goal, 16, 214, '#ffe070', { font: 'tiny' }); } footer(g, W, H - 24, inp, '{x} START   {ci} BACK'); }); }
};
// ---------- records
SCENES.records = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; this.rec = getRecords(); this.k = 0; music('menu'); },
  update(dt) { UI.t += dt; const inp = TT.game.input; if (inp.pressed('right') || inp.pressed('r1')) this.k = (this.k + 1) % 4; if (inp.pressed('left') || inp.pressed('l1')) this.k = (this.k + 3) % 4; if (inp.pressed('cancel') || inp.pressed('confirm') || inp.pressed('ci') || (inp.clicked && inp.clicked())) TT.game.go('title'); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'RECORDS', 'THE LEAGUE OF LEGENDS (AND BAZ)'); const [key, name, unit] = REC.cats[this.k];
    E.font.text(g, '<  ' + name + '  >', W / 2, 46, '#ffe070', { align: 'center', scale: 1, shadow: '#000', outline: false }); this.rec[key].forEach((e, i) => { const y = 66 + i * 22; E.ui.box(g, W / 2 - 100, y, 200, 18, { alpha: .8 }); E.font.text(g, (i + 1) + '.', W / 2 - 92, y + 5, '#a0a8d0'); E.font.text(g, e.n, W / 2 - 64, y + 3, '#fff', { scale: 1.5, shadow: '#000', outline: false }); E.font.text(g, e.s + ' ' + unit, W / 2 + 92, y + 5, '#ffe070', { align: 'right' }); }); footer(g, W, H, inp, '{l1}{r1} TABLE   {ci} BACK'); }); }
};
// ---------- results (with initials for records)
SCENES.results = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter(d) {
    UI.t = 0; this.d = d; const s = d.sum; this.s = s; this.ini = [0, 0, 0]; this.ii = 0; this.entry = null;
    const margin = s.score[0] - s.score[1]; const cats = [['margin', margin], ['tries', s.st[0].tries], ['hits', s.st[0].bigHits], ['metres', Math.round(s.st[0].metres)]]; this.cand = d.mode === 'drill' || d.mode === 'online' ? [] : cats.filter(([k, v]) => qualifies(k, v));
    this.entry = this.cand.length ? this.cand[0] : null;
    if (d.mode === 'cup' && s.win === 0) { const c = CUPSAVE(); if (c.round <= d.cup) { c.round = d.cup + 1; c.results[d.cup] = s.score[0] + '-' + s.score[1]; saveJSON('thugby:cup', c); } }
    this.m = mkMenu(d.mode === 'cup' ? (s.win === 0 ? [{ label: d.cup >= 3 ? 'CHAMPIONS!' : 'CONTINUE', fn: () => TT.game.go('story', { cup: d.cup, stage: 'post' }) }] : [{ label: 'TRY AGAIN', fn: () => TT.game.go('match', { mode: 'cup', cup: d.cup }) }, { label: 'MENU', fn: () => TT.game.go('title') }]) : [{ label: 'REMATCH', fn: () => TT.game.go('match', d.again) }, { label: 'MAIN MENU', fn: () => TT.game.go('title') }], { y: 190, w: 130, sp: 18, scale: 1 }); this.m.y = 192;
    music(s.win === 0 ? 'title' : 'menu'); if (A() && TT.cfg.present) try { A().sting && A().sting(s.win === 0 ? SONGS.win : SONGS.lose); } catch (e) { /* ok */ }
  },
  update(dt) { UI.t += dt; const inp = TT.game.input;
    if (this.entry) { if (inp.repeat('up', .3, .1)) this.ini[this.ii] = (this.ini[this.ii] + 1) % 26; if (inp.repeat('down', .3, .1)) this.ini[this.ii] = (this.ini[this.ii] + 25) % 26; if (inp.pressed('right')) this.ii = Math.min(2, this.ii + 1); if (inp.pressed('left')) this.ii = Math.max(0, this.ii - 1);
      if (inp.pressed('confirm') || inp.pressed('x')) { if (this.ii < 2) this.ii++; else { addRecord(this.entry[0], this.entry[1], this.ini.map(i => String.fromCharCode(65 + i)).join('')); this.cand.shift(); this.entry = this.cand[0] || null; this.ii = 0; TT.game.audio.sfx('confirm'); } } return; }
    const it = menuStep(this.m, inp, TT.game, dt); if (it) it.fn(); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H, s = this.s, T = [TEAMS[s.teams[0]], TEAMS[s.teams[1]]];
    header(g, W, s.win === 0 ? (this.d.mode === 'drill' ? 'DRILL COMPLETE!' : 'VICTORY!') : s.win === 1 ? 'DEFEAT' : 'DRAW', this.d.mode === 'drill' ? '' : T[0].short + ' ' + s.score[0] + ' - ' + s.score[1] + ' ' + T[1].short);
    if (this.d.mode !== 'drill') { const tiles = [['TRIES', s.st[0].tries + ' - ' + s.st[1].tries], ['BIG HITS', s.st[0].bigHits + ' - ' + s.st[1].bigHits], ['METRES', Math.round(s.st[0].metres) + ' - ' + Math.round(s.st[1].metres)], ['POSSESSION', Math.round(100 * s.st[0].poss / Math.max(1, s.st[0].poss + s.st[1].poss)) + '%']];
      tiles.forEach(([k, v], i) => { const x = 14 + i * 100; E.ui.box(g, x, 48, 94, 50, { alpha: .88 }); E.font.text(g, k, x + 47, 54, '#a0a8d0', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, v, x + 47, 72, '#ffe070', { align: 'center', scale: 1.5, shadow: '#000', outline: false }); });
      if (s.potm !== null) E.font.text(g, 'PLAYER OF THE MATCH: ' + s.potmName.toUpperCase(), W / 2, 108, '#ffffff', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, '"' + (s.win === 0 ? 'Magnificent. Almost like it was planned.' : s.win === 1 ? 'We lost. The pies were good though.' : 'A draw. Rugby\'s way of shrugging.') + '" - BARRY & ROS', W / 2, 122, '#c0c8e8', { align: 'center', shadow: '#000', outline: false, font: 'tiny' }); }
    else E.font.text(g, DRILLS.find(d => d.id === this.d.drill).goal + ' — DONE', W / 2, 70, '#80ff80', { align: 'center', scale: 1.5, shadow: '#000', outline: false });
    if (this.entry) { E.ui.box(g, W / 2 - 100, 132, 200, 52, { alpha: .95, border: '#ffe070' }); E.font.text(g, 'NEW RECORD: ' + REC.cats.find(c => c[0] === this.entry[0])[1], W / 2, 136, '#ffe070', { align: 'center', font: 'tiny' }); for (let i = 0; i < 3; i++) { const x = W / 2 - 40 + i * 30; E.font.text(g, String.fromCharCode(65 + this.ini[i]), x + 6, 150, i === this.ii ? '#ffffff' : '#a0a8d0', { scale: 3 }); if (i === this.ii) { px.poly(g, [[x + 8, 146], [x + 16, 146], [x + 12, 142]], '#ffe070'); px.poly(g, [[x + 8, 176], [x + 16, 176], [x + 12, 180]], '#ffe070'); } } }
    else menuDraw(g, this.m, W, H, inp);
    footer(g, W, H, inp, this.entry ? '{x} SET LETTER  UP/DOWN CHANGE' : '{x} SELECT'); }); }
};
// ---------- about & credits
SCENES.about = {
  view: 'overhead', input: KEYS, res: 'ps1', expand: true, touch: [],
  enter() { UI.t = 0; this.off = 0; this.lines = buildAboutLines(); music('menu'); },
  update(dt) { UI.t += dt; const inp = TT.game.input; if (inp.down('down')) this.off += dt * 90; if (inp.down('up')) this.off -= dt * 90; this.off = clamp(this.off, 0, Math.max(0, this.lines.length * 9 - 150)); if (inp.pressed('cancel') || inp.pressed('ci')) TT.game.go('title'); },
  draw(r) { backdrop(r, UI.t, true); const inp = TT.game.input; r.overlay(g => { const W = r.W, H = r.H; header(g, W, 'ABOUT & CREDITS'); E.ui.box(g, 8, 34, W - 16, H - 58, { alpha: .9 });
    this.lines.forEach((l, i) => { const y = 40 + i * 9 - this.off; if (y < 36 || y > H - 34) return; E.font.text(g, l.t, 14, y, l.h ? '#ffe070' : '#e0e4f4', { font: 'tiny' }); }); footer(g, W, H, inp, 'UP/DOWN SCROLL   {ci} BACK'); }); }
};
function buildAboutLines() {
  const out = []; const wrap = (t, h) => { for (const w of E.font.wrap(t, 400, { font: 'tiny' }).split ? E.font.wrap(t, 400, { font: 'tiny' }).split('\n') : [].concat(E.font.wrap(t, 400, { font: 'tiny' }))) out.push({ t: w, h }); };
  for (const [title, rows] of TT.about) { out.push({ t: title, h: true }); for (const r of rows) wrap(r, false); out.push({ t: ' ' }); }
  return out;
}

/* ==== 43-match.js ==== */
/* THUGBY TURBO — the match scene: live play, drills, attract demo, online sessions. */
const DIFFS = [
  { name: 'Rookie', react: .40, noise: .35, tackleBonus: -.12, mash: 6, interceptMult: .5, sigma: .25, lineoutRead: .25 },
  { name: 'Pro', react: .25, noise: .20, tackleBonus: 0, mash: 9, interceptMult: 1, sigma: .12, lineoutRead: .35 },
  { name: 'Legend', react: .14, noise: .08, tackleBonus: .08, mash: 12, interceptMult: 1.5, sigma: .06, lineoutRead: .45 }
];
function secondPad(game) { try { const P = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; const mine = game.input.padIndex; const p = P.find(q => q && q.connected && q.index !== mine); return p ? p.index : -1; } catch (e) { return -1; } }
function matchConfig(d) {
  const game = TT.game, mode = d.mode, di = Math.max(0, DIFFS.findIndex(x => x.name === TT.settings.difficulty));
  const cfg = { mode, seed: d.seed || (Date.now() & 0xffffff), halfLength: TUNE.base.halfLength, seats: [], noSudden: false };
  let seats = [{ team: 0, kind: 'local', slot: 0, pid: -1 }];
  if (mode === 'cup') { const c = CUP[d.cup]; Object.assign(cfg, { home: 'hawks', away: c.opp, venue: c.venue, cup: d.cup }); cfg.dstep = Math.min(2, di + (d.cup >= 2 ? 1 : 0)); }
  else if (mode === 'exh') { Object.assign(cfg, { home: d.home, away: d.away, venue: d.venue, halfLength: d.half }); cfg.dstep = di; if (d.players === 1) seats = [{ team: 0, kind: 'local', slot: 0, pid: -1 }, { team: 0, kind: 'local', slot: 1, pid: -1 }]; if (d.players === 2) seats = [{ team: 0, kind: 'local', slot: 0, pid: -1 }, { team: 1, kind: 'local', slot: 1, pid: -1 }]; }
  else if (mode === 'drill') { Object.assign(cfg, { home: 'hawks', away: 'rovers', venue: 'docks', drill: d.drill, halfLength: 600 }); cfg.dstep = 0; }
  else if (mode === 'attract') { const n = d.n || 0; Object.assign(cfg, { home: TEAM_IDS[(n * 2) % 7], away: TEAM_IDS[(n * 2 + 3) % 7], venue: VENUE_IDS[n % 4], halfLength: 45 }); cfg.dstep = 1; seats = [{ team: 0, kind: 'script', auto: true, slot: 0, pid: -1 }]; }
  else if (mode === 'online') { Object.assign(cfg, { home: 'hawks', away: 'rovers', venue: VENUE_IDS[(d.seed >>> 3) % 4], halfLength: 75, seed: d.seed }); cfg.dstep = 1; cfg.noSudden = true; }
  const D = DIFFS[cfg.dstep]; cfg.diff = { react: D.react, noise: D.noise }; cfg.tackleBonus = D.tackleBonus; cfg.interceptMult = D.interceptMult; cfg.mashMult = D.mash / 9; cfg.cpuScrum = D.mash; cfg.lineoutSigma = D.sigma * 1.6; cfg.lineoutRead = D.lineoutRead; cfg.kickErr = 1.6 - cfg.dstep * .4;
  if (mode === 'cup' && TEAMS[cfg.away].boss) cfg.diffMult = { spd: 1 };
  cfg.seats = seats; return cfg;
}
const DEVSTATE = { infTurbo: false, noFouls: false, aiOff: false, showIds: false, unstoppable: false, monster: false };
SCENES.match = {
  pausable: true, view: 'broadcast', views: CAM_VIEWS, input: KEYS, res: 'ps1', expand: true, touch: [], camera: { zoom: [.55, 1.5], start: .8 },
  enter(d) {
    const game = TT.game; d = d || { mode: 'exh', home: 'hawks', away: 'rovers', venue: 'muddington', players: 0, half: 120 }; this.d = d; game.input.touchEnabled = false;
    const cfg = matchConfig(d); this.cfg = cfg;
    if (cfg.seats.some(s => s.slot === 1) && game.players.length < 2) { const pi = secondPad(game); game.addPlayer(pi >= 0 ? { pad: pi } : { keys: 'right' }); this.addedP2 = true; }
    newMatch(cfg); S.seats = cfg.seats; S.seatI = []; TT.settings.autoSwitch = game.settings.autoSwitch || 'Assisted';
    if (cfg.noSudden) TT.settings.suddenDeath = false;
    Object.assign(S.dev, DEVSTATE, d.mode === 'attract' ? { infTurbo: true } : {});
    TUNE.layer('difficulty', { aiReaction: () => DIFFS[cfg.dstep].react, cpuMash: () => DIFFS[cfg.dstep].mash });
    V.portraits = getPortraits(); initView(); UI.t = 0; this.exitT = 0; this.endT = 0; this.attractT = 0; this.spec = 0; this.specT = 14; this.n = d.n || 0; this.replayAt = 0; this.lastReplay = -99;
    S.dir = [1, -1]; music('match'); game.timeScale = 1;
    if (d.mode === 'online') { this.waiting = true; }
    S.hype[0] = d.mode === 'attract' ? 50 : 0;
    if (d.mode === 'drill') { this.drillT = 0; }
  },
  exit() { const game = TT.game; if (this.addedP2) { while (game.players.length > 1) game.removePlayer(game.players.length); this.addedP2 = false; } TUNE.layer('difficulty', {}); TUNE.layer('halfLength', {}); Object.assign(DEVSTATE, { infTurbo: S.dev.infTurbo, noFouls: S.dev.noFouls, aiOff: S.dev.aiOff, showIds: S.dev.showIds, unstoppable: S.dev.unstoppable, monster: S.dev.monster }); if (this.d.mode === 'attract') DEVSTATE.infTurbo = false; game.weather = null; game.lights.enabled = false; },
  update(dt) {
    const game = TT.game, inp = game.input, d = this.d;
    if (TT.devOpenReq) { TT.devOpenReq = false; DEV.open = true; }
    if (TT.devMode && TT.devToggleReq) DEV.open = !DEV.open; TT.devToggleReq = false;
    if (d.mode === 'attract') { this.attractT += dt; if (this.attractT > .6 && (anyInput(inp) || (inp.clicked && inp.clicked()))) return game.go('title'); }
    if (V.replay) { this.stepReplay(dt, inp); return; }
    if (this.waiting) { if (!TT.net || !TT.net.canPlay()) { presentStep(dt); return; } this.waiting = false; }
    if (TT.net && TT.net.over) { presentStep(dt); return; }
    let seatI = S.seats.map((seat, i) => seat.kind === 'cpu' || seat.auto ? emptyIntent() : readIntent(game.players[seat.slot] || inp, i));
    if (DEV.open) { devUpdate(inp); seatI = seatI.map(() => emptyIntent()); }
    if (d.mode === 'attract') this.director(dt);
    // halftime skip needs a button even in versus
    stepMatch(dt, seatI);
    presentStep(dt); TT.audio.musicLayers(); TT.audio.crowdBed(dt);
    this.replayLogic(dt);
    if (S.phase === 'fulltime') { this.endT += dt; if (this.endT > (d.mode === 'attract' ? 4 : 3.2) && !S.replayPlaying) this.finish(); }
    if (d.mode === 'drill' && !this.drillDone && S.drillDef && S.drillDef.cond(S)) { this.drillDone = true; banner('DRILL COMPLETE!', '#80ff80', 2.5); TT.game.audio.sfx('oneup'); const dn = loadJSON('thugby:drills', {}); dn[S.drillDef.id] = 1; saveJSON('thugby:drills', dn); this.drillEnd = 2.4; }
    if (this.drillEnd) { this.drillEnd -= dt; if (this.drillEnd <= 0) { this.drillEnd = 0; this.finish(true); } }
    if (d.mode === 'drill' && !this.drillDone && inp.pressed('cancel') && false) {}
  },
  director(dt) {
    this.specT -= dt; S.dev.infTurbo = true; if (S.phase === 'fulltime') return;
    if (this.specT <= 0) { this.specT = 16; const k = this.spec++ % 6;
      if (k === 0) S.hype[S.poss >= 0 ? S.poss : 0] = 100; else if (k === 1) S.puT = 0; else if (k === 2) { S.strikeT = 0; S.jetT = 0; S.chickT = 0; } else if (k === 3) refDown(); else if (k === 4) { const p = S.players.filter(q => alive(q) && q.team === 1)[3]; if (p && S.phase === 'play') cardPlayer(p, 'yellow'); } else { S.hype[0] = S.hype[1] = 100; } }
  },
  replayLogic(dt) {
    if (S.replayReq && !this.replayAt) { this.replayAt = S.t + 0.9; this.replayKind = S.replayReq; }
    S.replayReq = null;
    if (this.replayAt && S.t >= this.replayAt) {
      const kind = this.replayKind; this.replayAt = 0; const mode = this.d.mode, set = TT.settings.replays;
      if (set === 'Off' || mode === 'attract' || mode === 'online' || mode === 'drill' || S.phase === 'fulltime' || S.over) return;
      if (set === 'All tries' && kind !== 'try') return; if (kind !== 'try' && S.t - this.lastReplay < 30) return;
      this.lastReplay = S.t; this.startReplay(kind);
    }
  },
  startReplay(kind) {
    const fr = S.frames.slice(-200); if (fr.length < 30) return;
    const key = fr[fr.length - 1].b; V.replay = { frames: fr, i: 0, acc: 0, t: 0, key: { x: fr[Math.floor(fr.length * .5)].b[0], y: fr[Math.floor(fr.length * .5)].b[1] }, back: snapFrame(), holder: S.ball.holder ? S.ball.holder.id : -1, ballSt: S.ball.st };
    S.replayPlaying = true; line('replay'); banner('INSTANT REPLAY', '#ff8080', 1.2); TT.game.setZoom && TT.game.setZoom(1.3);
  },
  stepReplay(dt, inp) {
    const R = V.replay; R.t += dt; R.acc += dt * .5;
    const skip = inp.pressed('x') || inp.pressed('confirm') || inp.pressed('ci');
    while (R.acc >= 1 / 60 && R.i < R.frames.length - 1) { R.acc -= 1 / 60; R.i++; }
    const f = R.frames[R.i]; applyFrame(f); presentStep(dt * .5);
    if (R.i >= R.frames.length - 1 || skip) { applyFrame(R.back); S.ball.holder = R.holder >= 0 ? S.players[R.holder] : null; S.ball.st = R.ballSt; V.replay = null; S.replayPlaying = false; TT.game.setZoom && TT.game.setZoom(.8); }
  },
  finish(drill) {
    const game = TT.game, d = this.d;
    if (d.mode === 'attract') return game.go('match', { mode: 'attract', n: this.n + 1 });
    const potm = S.potm, sum = { score: S.score.slice(), win: drill ? 0 : S.win, st: S.stats.map(x => Object.assign({}, x)), teams: [S.teams[0].id, S.teams[1].id], potm, potmName: potm !== null && S.players[potm] ? S.players[potm].name : '' };
    if (d.mode === 'online') { if (TT.net) TT.net.matchOver(sum); return; }
    for (const p of S.players) { /* per-player metres are not tracked individually */ }
    game.go('results', { mode: d.mode, cup: d.cup, drill: d.drill, sum, again: d });
  },
  draw(r) {
    const inp = TT.game.input; drawWorld(r); drawHUD(r, inp);
    if (S.flash) r.overlay(g => px.rect(g, 0, 0, r.W, r.H, S.flash.c));
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.d.mode === 'attract') { E.font.title(g, 'THUGBY TURBO', W / 2, H - 42, { scale: 1, colors: ['#ffe070', '#ff8020'], align: 'center', outline: '#000' }); if (Math.floor(UI.t * 2) % 2 === 0 || true) E.font.text(g, TT.touchOnly ? 'TAP TO START' : 'PRESS ANY BUTTON', W / 2, H - 26, Math.floor(V.t * 2) % 2 ? '#ffffff' : '#ffe070', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, 'DEMO', W - 6, 6, '#ff6060', { align: 'right', shadow: '#000', outline: false }); }
      if (this.d.mode === 'drill' && S.drillDef) { E.ui.box(g, W / 2 - 150, 4, 300, 24, { alpha: .85 }); E.font.text(g, S.drillDef.name + ': ' + S.drillDef.text, W / 2, 8, '#fff', { align: 'center', font: 'tiny', wrap: 290 }); E.font.text(g, 'GOAL: ' + S.drillDef.goal, W / 2, 18, this.drillDone ? '#80ff80' : '#ffe070', { align: 'center', font: 'tiny' }); }
      if (this.waiting) { E.ui.box(g, W / 2 - 90, 80, 180, 40, { alpha: .9 }); E.font.text(g, 'WAITING FOR KICK-OFF', W / 2, 96, '#fff', { align: 'center', scale: 1, shadow: '#000', outline: false }); }
      if (DEV.open) devDraw(g, W, H, inp);
      if (TT.net) TT.net.draw(g, W, H);
    });
  }
};
function applyFrame(f) {
  S.players.forEach((p, i) => { const q = f.p[i]; p.x = q[0]; p.y = q[1]; p.z = q[2]; p.facing = q[3]; p.st = q[4]; p.am = q[5]; p.amT = q[6]; p.vx = q[7]; p.vy = q[8]; p.off = !!q[9]; p.flip = q[12]; p.superKind = q[10] ? 'thunder' : ''; p.onFire = q[11] ? 50 : 0; });
  const b = S.ball; b.x = f.b[0]; b.y = f.b[1]; b.z = f.b[2]; b.holder = f.b[3] >= 0 ? S.players[f.b[3]] : null; b.st = b.holder ? 'held' : 'loose'; S.ref.x = f.r[0]; S.ref.y = f.r[1]; S.ref.facing = f.r[2]; S.score = f.score.slice();
}

/* ==== 50-dev.js ==== */
/* THUGBY TURBO — dev mode: live balance sliders, cheats, event forcing, debug overlays. Reached from the pause menu. */
const DEV = { open: false, tab: 0, i: 0, scroll: 0, msg: '', msgT: 0 };
TT.DEV = DEV;
const meOf = () => { const s = S.seats.find(x => x.kind !== 'cpu' && !x.auto) || S.seats[0]; return s && S.players[s.pid] ? S.players[s.pid] : S.players[4]; };
const FORCE = {
  'GIVE ME THE BALL': () => { const p = meOf(); if (S.phase === 'play' && p) giveBall(p); },
  'TRY LINE RUN-IN': () => { const p = meOf(); if (S.phase === 'play' && p) { place(p, atkX(p.team) - S.dir[p.team] * 120, p.y); giveBall(p); } },
  'SCORE A TRY (ME)': () => { const p = meOf(); if (S.phase === 'play' && p) { place(p, atkX(p.team) + S.dir[p.team] * 10, p.y); giveBall(p); scoreTry(p, 'dev'); } },
  'FILL HYPE (BOTH)': () => { S.hype[0] = S.hype[1] = 100; },
  'ON FIRE (ME)': () => { const p = meOf(); if (p) { p.onFire = 90; bus.emit('onFire', { id: p.id }); } },
  'SPAWN MEAT PIE': () => spawnPU('pie'), 'SPAWN IRON SHOULDERS': () => spawnPU('iron'), 'SPAWN MEGA BOOT': () => spawnPU('boot'), 'SPAWN GREASE JERSEY': () => spawnPU('grease'), 'SPAWN AIR HORN': () => spawnPU('horn'),
  'REF DOWN': () => refDown(), 'YELLOW CARD (OPPONENT)': () => { const p = S.players.find(q => q.team === 1 - meOf().team && alive(q) && q.role === 6); if (p && S.phase === 'play') cardPlayer(p, 'yellow'); },
  'SCRUM (MY FEED)': () => { if (S.phase === 'play') startScrum(meOf().team, S.ball.x, S.ball.y); }, 'LINEOUT (MY THROW)': () => { if (S.phase === 'play') startLineout(meOf().team, S.ball.x, S.ball.y); },
  'PENALTY (MY KICK)': () => { if (S.phase === 'play') startPenalty(meOf().team, S.ball.x, S.ball.y, false); }, 'CONVERSION': () => { if (S.phase === 'play') startConversion(meOf().team, meOf(), S.ball.y, 'conv'); },
  'TRIGGER HAZARD': () => { S.strikeT = 0; S.jetT = 0; S.chickT = 0; S.windT = 0; }, 'CHICKEN NOW': () => { S.chickT = 0; if (S.venue.hazard !== 'wind') S.chicken = { x: S.ball.x, y: G.Y0 - 30, dir: 1, t: 0, vx: 0 }; },
  'HOOTER NOW': () => { S.clock = TUNE.v.halfLength; }, 'END HALF / MATCH': () => { S.hooter = true; S.clock = TUNE.v.halfLength; if (S.phase === 'play') startScrum(0, S.ball.x, S.ball.y); }, 'REPLAY LAST 3S': () => { S.replayReq = 'dev'; },
  'ADD 5 POINTS (HOME)': () => { S.score[0] += 5; }, 'ADD 5 POINTS (AWAY)': () => { S.score[1] += 5; }, 'RESTART KICK-OFF': () => { doKickoff(0); }
};
function spawnPU(k) { const b = S.ball, p = meOf(); S.powerups.push({ kind: k, x: p.x + 30, y: p.y, z: 2, tx: p.x + 30, ty: p.y, sx: p.x + 30, sy: p.y, t: 9, T: 1, life: 15, landed: true }); }
const TOGGLES = [['INFINITE TURBO', 'infTurbo'], ['UNSTOPPABLE CARRIER', 'unstoppable'], ['ALL HITS MONSTER', 'monster'], ['NO FOULS CALLED', 'noFouls'], ['CPU STANDS STILL', 'aiOff'], ['SHOW PLAYER IDS', 'showIds']];
function devRows() {
  if (DEV.tab === 0) { const rows = [{ t: 'RESET ALL TO DEFAULTS', fn: () => { TUNE.reset(); } }]; let g = ''; for (const d of TUNE.defs) { if (d.group !== g) { g = d.group; rows.push({ h: g }); } rows.push({ d }); } return rows; }
  if (DEV.tab === 1) return TOGGLES.map(([l, k]) => ({ t: l, tog: k })).concat([{ t: 'GAME SPEED 0.5x', fn: () => TUNE.set('gameSpeed', .5) }, { t: 'GAME SPEED 1x', fn: () => TUNE.set('gameSpeed', 1) }]);
  if (DEV.tab === 2) return Object.keys(FORCE).map(k => ({ t: k, fn: FORCE[k] }));
  return [{ t: 'PHASE: ' + S.phase + ' ' + (S.sub || ''), info: 1 }, { t: 'SCORE ' + S.score.join('-') + '  HYPE ' + S.hype.map(Math.round).join('/'), info: 1 }, { t: 'BALL ' + S.ball.st + ' (' + Math.round(S.ball.x) + ',' + Math.round(S.ball.y) + ',' + Math.round(S.ball.z) + ')', info: 1 }, { t: 'EVENTS ' + Object.keys(S.counts).length + ' TYPES, ' + (S.counts.watchdog | 0) + ' WATCHDOG', info: 1 }, { t: 'LAST: ' + S.events.slice(-3).map(e => e.n).join(', '), info: 1 }, { t: 'SEED ' + S.cfg.seed, info: 1 }];
}
function devUpdate(inp) {
  const rows = devRows(); const n = rows.length; if (DEV.tab === 0) { /* skip headers */ }
  if (inp.pressed('l1')) { DEV.tab = (DEV.tab + 3) % 4; DEV.i = 0; } if (inp.pressed('r1')) { DEV.tab = (DEV.tab + 1) % 4; DEV.i = 0; }
  const step = d => { let k = DEV.i; do { k = (k + d + n) % n; } while (rows[k].h); DEV.i = k; };
  if (rows[DEV.i] && rows[DEV.i].h) step(1);
  if (inp.repeat('down', .35, .08)) step(1); if (inp.repeat('up', .35, .08)) step(-1);
  const r = rows[DEV.i]; if (!r) return; const fast = inp.down('turbo') ? 5 : 1;
  if (r.d) { const dir = (inp.repeat('right', .3, .06) ? 1 : 0) - (inp.repeat('left', .3, .06) ? 1 : 0); if (dir) TUNE.set(r.d.key, TUNE.base[r.d.key] + dir * r.d.step * fast); if (inp.pressed('sq') || inp.pressed('cancel') && false) TUNE.reset(r.d.key); }
  if (inp.pressed('confirm') || inp.pressed('x')) { if (r.fn) { r.fn(); DEV.msg = r.t; DEV.msgT = 1.5; } else if (r.tog) { S.dev[r.tog] = !S.dev[r.tog]; } }
  if (inp.pressed('ci') || inp.pressed('cancel')) DEV.open = false;
}
function devDraw(g, W, H, inp) {
  const x0 = W - 190, w = 184; E.ui.box(g, x0, 4, w, H - 8, { alpha: .93, border: '#ff9030' });
  E.font.text(g, 'DEV MODE', x0 + 6, 8, '#ff9030', { shadow: '#000', outline: false }); ['TUNE', 'CHEAT', 'EVENT', 'DEBUG'].forEach((t, i) => E.font.text(g, t, x0 + 6 + i * 44, 20, i === DEV.tab ? '#ffe070' : '#7078a0', { font: 'tiny' }));
  const rows = devRows(), vis = 15; DEV.scroll = clamp(DEV.i - 7, 0, Math.max(0, rows.length - vis));
  rows.slice(DEV.scroll, DEV.scroll + vis).forEach((r, k) => { const i = DEV.scroll + k, y = 32 + k * 12, sel = i === DEV.i;
    if (r.h) { E.font.text(g, '-- ' + r.h.toUpperCase() + ' --', x0 + 6, y, '#80c8ff', { font: 'tiny' }); return; }
    if (sel) px.rect(g, x0 + 2, y - 1, w - 4, 11, '#3a4a8a');
    if (r.d) { const v = TUNE.base[r.d.key], k2 = (v - r.d.min) / (r.d.max - r.d.min); E.font.text(g, r.d.label, x0 + 6, y, sel ? '#fff' : '#c0c8e8', { font: 'tiny' }); px.rect(g, x0 + 100, y + 2, 44, 4, '#202030'); px.rect(g, x0 + 100, y + 2, Math.round(44 * k2), 4, v === r.d.value ? '#80c8ff' : '#ffb040'); E.font.text(g, (Math.round(v * 100) / 100) + r.d.unit, x0 + w - 6, y, '#ffe070', { font: 'tiny', align: 'right' }); }
    else if (r.tog) { E.font.text(g, r.t, x0 + 6, y, sel ? '#fff' : '#c0c8e8', { font: 'tiny' }); E.font.text(g, S.dev[r.tog] ? 'ON' : 'OFF', x0 + w - 6, y, S.dev[r.tog] ? '#80ff80' : '#ff8080', { font: 'tiny', align: 'right' }); }
    else E.font.text(g, r.t, x0 + 6, y, sel ? '#fff' : r.info ? '#a0e0a0' : '#c0c8e8', { font: 'tiny' }); });
  if (DEV.msgT > 0) { DEV.msgT -= 1 / 60; E.font.text(g, DEV.msg, x0 + 6, H - 24, '#80ff80', { font: 'tiny' }); }
  prompt(g, '{l1}{r1} TAB  {sq} RESET ROW  {ci} CLOSE', x0 + 4, H - 14, inp, { font: 'tiny' });
}

/* ==== 60-net.js ==== */
/* THUGBY TURBO — AI Hub (Session Protocol v1, client 1.4.0): parallel mode. Each player plays their own seven-a-side
 * match against the CPU from the same seed; the hub ranks players by points margin. Outside a session none of this runs. */
const HUB = typeof AIHub !== 'undefined' ? AIHub : null;
function marginScore(score) { return (score[0] - score[1]) * 100 + score[0]; }
async function hubBoot() {
  if (!HUB || !HUB.active) return null;
  let info = null; try { info = await HUB.connect({ mode: 'parallel', seats: [1, 4] }); } catch (e) { info = null; }
  if (!info) return null;
  const seed = Math.floor(HUB.rng('match')() * 1e9) >>> 0;
  const net = TT.net = { info, over: false, seed, reported: false, canPlay: () => HUB.time() >= 0, draw(g, W, H) { const t = HUB.time(); if (t < 0 && t > -Infinity) { E.font.title(g, String(Math.ceil(-t / 1000)), W / 2, 70, { scale: 5, colors: ['#ffe070', '#ff8020'], align: 'center', outline: '#000' }); E.font.text(g, 'GET READY: ' + info.players.length + ' PLAYER' + (info.players.length > 1 ? 'S' : ''), W / 2, 120, '#fff', { align: 'center', shadow: '#000', outline: false }); } },
    matchOver(sum) { if (net.reported) return; net.reported = true; HUB.result({ score: marginScore(sum.score), stats: { 'My points': sum.score[0], 'Their points': sum.score[1], Tries: sum.st[0].tries, 'Big hits': sum.st[0].bigHits }, awards: sum.st[0].bigHits >= 5 ? [{ title: 'Demolition Derby', detail: sum.st[0].bigHits + ' big hits' }] : [] }); net.over = true; } };
  HUB.on('time-up', () => { if (net.reported) return; net.reported = true; const S0 = TT.S; HUB.result({ score: marginScore(S0 ? S0.score : [0, 0]) }); });
  HUB.on('end', () => { net.over = true; try { TT.game.audio.mute(true); } catch (e) { /* ok */ } });
  setInterval(() => { const S0 = TT.S; if (S0 && !net.over && S0.cfg.mode === 'online') HUB.progress({ score: marginScore(S0.score), label: S0.score[0] + '-' + S0.score[1] }); }, 1000);
  return net;
}
TT.hubBoot = hubBoot;

/* ==== 90-start.js ==== */
/* THUGBY TURBO — start-up: the game, settings, standard menu additions, boot steps, debug handle. */
(async function start() {
  const inSession = !!(HUB && HUB.active);
  detectTouchOnly();
  const SET = (key, label, options, value, group = 'Game', extra = {}) => Object.assign({ key, label, options, value, group, type: 'select', apply: (g, v) => { TT.settings[extra.map || key] = v; } }, extra);
  const game = TT.game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', views: CAM_VIEWS, input: KEYS, id: 'thugby-turbo',
    autoPause: !inSession, corner: !inSession ? undefined : false, fullscreen: inSession ? false : undefined,
    menu: {
      items: inSession ? [] : [['DEV MODE', () => { TT.devMode = true; TT.devOpenReq = true; game.resume(); }]],
      quit: inSession ? false : 'title',
      settings: [
        SET('glyphs2', 'Controller buttons', [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], 'playstation', 'Display', { map: 'glyphs' }),
        SET('difficulty', 'Difficulty', ['Rookie', 'Pro', 'Legend'], 'Pro'),
        SET('autoSwitch', 'Auto-switch player', ['Assisted', 'Full', 'Manual'], 'Assisted'),
        { key: 'passAssist', label: 'Pass assist', value: true, group: 'Game', apply: (g, v) => { TT.settings.passAssist = v; } },
        { key: 'holdTurbo', label: 'Hold to turbo (off: toggle)', value: true, group: 'Game', apply: (g, v) => { TT.settings.holdTurbo = v; } },
        { key: 'refView', label: 'Show the referee\'s view', value: true, group: 'Game', apply: (g, v) => { TT.settings.refView = v; } },
        SET('replays', 'Instant replays', ['Big moments', 'All tries', 'Off'], 'Big moments'),
        { key: 'suddenDeath', label: 'Sudden death when level', value: true, group: 'Game', apply: (g, v) => { TT.settings.suddenDeath = v; } },
        { key: 'halfSecs', label: 'Default half length (s)', value: 120, min: 60, max: 300, step: 30, group: 'Game', apply: (g, v) => { TUNE.base.halfLength = v; TUNE.v.halfLength = v; } }
      ],
      controls: { x: 'Sidestep / Tackle', sq: 'Fend / Dive tackle', ci: 'Kick / Switch to ball', tri: 'Super', l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo', click: 'Pass / Switch (mouse)', rclick: 'Kick toward cursor', cam: 'Camera view' }
    }
  });
  addEventListener('keydown', e => { if (e.code === 'Backquote') TT.devToggleReq = true; });
  game.debug = { snapshot() { const s = TT.S; return { scene: game.scene && game.scene.name, phase: s && s.phase, half: s && s.half, clock: s && +s.clock.toFixed(1), score: s && s.score, hype: s && s.hype.map(Math.round), possession: s && s.poss, ball: s && { x: Math.round(s.ball.x), y: Math.round(s.ball.y), z: Math.round(s.ball.z), st: s.ball.st, holder: s.ball.holder ? s.ball.holder.id : -1 }, events: s && s.events.slice(-6).map(e => e.n), counts: s && s.counts, dev: DEV.open, attract: !!(s && s.cfg.mode === 'attract'), touchOnly: TT.touchOnly, settings: TT.settings }; }, go(scene, d) { game.go(scene, d); }, tune(k, v) { TUNE.set(k, v); }, step(sec) { game.advance(sec); }, force(name) { if (FORCE[name]) FORCE[name](); }, devPanel(on) { TT.devMode = true; DEV.open = on !== false; } };
  window.__thugby.game = game; window.__thugby.TT = TT; window.__thugby.sim = { get S() { return S; }, startScrum, startLineout, startPenalty, startConversion, giveBall, place, scoreTry, cardPlayer, refDown, doKickoff, FORCE };
  let net = null; if (inSession) net = await hubBoot();
  if (net) SCENES.match.pausable = false;
  game.start({ scene: net ? 'match' : 'title', data: net ? { mode: 'online', seed: net.seed } : undefined, scenes: SCENES,
    boot: { title: 'THUGBY TURBO', steps: [['Dressing the commentators', () => { getPortraits(); }], ['Reading the league tables', () => { getRecords(); CUPSAVE(); }], ['Tuning the balance sliders', () => { TUNE.applyLayers(); }]] } });
  if (net) { setTimeout(() => HUB.ready(), 200); }
})();

})();
