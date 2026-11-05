(() => {
const __EXIT__ = {"sourceInformation":{"date":"2026-11-04 05:02:50","source":"Gauntlet (the arcade co-op dungeon crawler)","plan":"PLAN.md","genre":"Arcade co-op dungeon crawler: twin-stick hack-and-shoot with maze exploration (catalogue genre: Action)","perspective":"Three-quarter overhead (engine view threequarter, 55 degree pitch); top-down and isometric selectable in Settings","tech":"my-3D2dge engine v0.85.2 (unmodified), plain JavaScript in one IIFE built from 14 source fragments; AI Hub Session Protocol v1 client 1.4.0 (session.js, unmodified); Playwright 1.63.0 and Node 24 for tests","artDirection":"The engine's native HD pixel-art style: procedural 3D-skeleton characters drawn as pixel art, textured TileMap dungeons in three realms (Larder, Ossuary, Furnace) plus the Banquet, engine props and torchlight with canvas lighting. New art made in code: item and HUD sprites, six generator drawings, projectiles, floor marks, title scene","animation":"The engine's procedural Humanoid and Blob rigs and E.MOVES (overhead, spin, thrust, jab, cross, bash), poses (cast, die), squash and stretch, hit-stop, particles, telegraphed wind-ups for every enemy attack; rank-shrinking monsters, bobbing items, tweened door bars","audio":"All code: engine chip synth for 40-odd sound effects and 7 original songs (title, larder, ossuary, furnace, boss, hoard, victory); voices are Animalese-style gibberish babble made from pitched syllables (a deep echoing narrator, 4 hero voices). No audio files","online":"AI Hub shared-world sessions (1-4 players, own card, host-run sim, 12/s client positions, 10/s snapshots, reliable event batches); passes the hub harness (2 players, 4 players with latency/jitter/loss, host-leave, server). Offline: solo and 1-4 player couch co-op, no network","testing":"One headless command (node tests/run.mjs): 1037 checks across 25 seeds of every floor plus a scripted bot playthrough of all 11 stages to the ending, mechanics, every Dev Tools row and cheat, boss phases, tuning sliders, attract mode; AI Hub harness scenarios; Playwright screenshots, a mocked DualSense and mouse/touch emulation; Xbox-glyph text scan of every screen, co-op join and drop-out in a browser","research":"Read the engine handoff (API card, index, guide, kits), the AI Hub protocol README, harness and arena example, and the plan; no other research","environment":"Claude Code CLI (headless); Linux (WSL2); Chromium via Playwright 1.63.0 (headless)","model":"Anthropic, claude-sonnet-5-5, reasoning effort medium","usage":"unknown"},"testingFeedback":["About twelve real issues: the boss hall's rows were different widths, the attract mode crashed the camera bounds with no floor loaded, bots stuck on loot behind sealed walls, bots stunning each other at the boss, the Dev Tools' opening Enter toggling a cheat, the first floor card reading the wrong realm line, HUD icons overlapping the health number and the corner buttons, stick-right switching a joining player's class, high scores not saving where storage is blocked, a dropped-out player instantly rejoining, hard-coded PlayStation names in a few prompts, and a class-card label overlapping text. Two more failures were mistakes in my own test script.","Two: the unequal boss-hall rows (the last floor would not have built correctly) and the attract-mode camera bounds crash (an error every frame after the first non-floor segment). Everything else was recoverable.","The scripted playthrough: bots play every floor to the ending through the real scenes. It found the unreachable-loot stalls and the friendly-fire lock at the boss that no mechanics unit test would have, and it proves the descent can be finished.","Static screenshots of menu screens: they confirmed layout but caught only two overlap bugs and could not show anything about feel, input or sound."],"engineFeedback":["The characters: Humanoid and Blob rigs with live portraits, outfits and hit flashes, plus canvas lighting, props, cam.frame for several heroes, allowJoin for drop-in players and the headless game.advance made a good-looking, testable game quick to stand up. The standard pause, settings and controls screens saved a lot of work.","Yes. The pause menu's custom items do not close the menu, so my Dev Tools opened behind it until I added game.resume(); the confirm press that picked the item then leaked into my Dev screen. A few docs left me guessing at units and return shapes (cornerArea, mouseGround, toGround). The Humanoid weapon list has no axe, bow or shield, so the Ranger carries a gun rig and the Berserker a sword.","The simulation and everything around it: a multi-source flow field (the engine's has one target), monster AI with telegraphs, generators, projectiles with ricochet and pierce, a seeded floor generator with a key-aware solvability check, the bot, the Dev Tools screens, the Animalese voice babble, the high-score table and the whole AI Hub shared-world layer.","Knowing exactly how the per-player input split works for a custom preset (half keyboards take the preset's buttons in order) and keeping hero, camera and menu input straight with several players on one screen. The index is huge, so finding the one line that was true took greps and a few tries.","None. The engine is used exactly as handed over; every gap (multi-source flow field, shot bouncing, a fake wall that draws solid but walks, weapon art) was filled in game code.","A multi-source FlowField (several heroes, one field) and a documented way to add custom Humanoid weapons (axe, bow, shield), because every top-down co-op game needs both."],"promptFeedback":["The plan: exact tables for heroes, monsters, items, tuning ranges and messages meant I rarely had to guess, and the hub README with its harness gave a clear pass or fail for the online part.","How much to build. The plan is 120 KB and written for a much bigger effort than medium, with engine changes (E1 to E8) and hand-authored floors I chose not to follow. TASK.md also names a model and timestamp that differ from the plan's, which the plan explained, but it took a read to be sure.","Holding the whole scope together: eleven stages, local co-op, an online mode, an attract mode, Dev Tools, a playthrough test and the feedback text, all while keeping every piece free of placeholders. The shared-world networking was the largest single piece.","State a priority order for the plan's sections when effort is limited, say whether the plan's engine changes are required or optional, and split the plan into a short must-have list and a longer nice-to-have list."],"aiHub":{"name":"Gauntletdown","tagline":"Eat. Shoot. Descend. Repeat.","description":"A co-op dungeon crawl for one to four hungry fools: shoot generators, grab keys and food before your life force drains away, and descend eleven floors to a king who is very hungry. Couch co-op or an AI Hub session.","type":"Game","genre":"Action","source":"Gauntlet","series":"Gauntlet","players":"1–4","controls":"Move: left stick / WASD. Aim: right stick / mouse. Fire: R2 / click. Magic flask: triangle / right click. Plant: L2 / Shift. Pause: Options / Esc.","tags":["top-down","co-op","arcade","fantasy","comedy","boss fights"]}};
/* ---- 00-core.js ---- */
/* Gauntletdown: core constants, tuning, helpers. Fragments are concatenated in name order inside one IIFE. */
const E = My3D2dge, { px, clamp } = E;
const TITLE = 'GAUNTLETDOWN';
const TS = 16;                                   // tile size
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

// ---------- tuning (every number here is a Dev slider) ----------
const TUNE_DEF = {
  drain: [1, 0, 5, .1, 'Life drain / s'], startHealth: [700, 100, 2000, 50, 'Start health'], foodHeal: [100, 25, 300, 5, 'Food heal'],
  heroSpeed: [1, .5, 2, .05, 'Hero speed'], shotRate: [1, .5, 3, .05, 'Shot rate'], shotDamage: [1, .5, 3, .1, 'Shot damage'],
  magicPower: [1, .25, 3, .05, 'Magic power'], monsterSpeed: [1, .25, 3, .05, 'Monster speed'], monsterDamage: [1, 0, 3, .05, 'Monster damage'],
  spawnInterval: [1, .25, 4, .05, 'Spawn interval'], generatorHp: [1, .25, 4, .05, 'Generator HP'], maxMonsters: [140, 20, 300, 10, 'Monster cap'],
  impatience: [180, 30, 600, 10, 'Impatience (s)'], titheAt: [120, 30, 600, 10, 'Tithe arrives (s)'], hoardTime: [30, 10, 90, 5, 'Hoard clock (s)'], stairHold: [1, 0, 3, .1, 'Stair hold (s)']
};
const TUNE = {};
for (const k in TUNE_DEF) TUNE[k] = TUNE_DEF[k][0];
const tuneLoad = () => { const s = E.store.get('gauntletdown-tune', null); if (s) for (const k in TUNE_DEF) if (typeof s[k] === 'number') TUNE[k] = clamp(s[k], TUNE_DEF[k][1], TUNE_DEF[k][2]); };
const tuneSave = () => E.store.set('gauntletdown-tune', TUNE);
const tuneReset = () => { for (const k in TUNE_DEF) TUNE[k] = TUNE_DEF[k][0]; tuneSave(); };
const DIFF = { Easy: { drain: .5, dmg: .7, hp: 1.3 }, Normal: { drain: 1, dmg: 1, hp: 1 }, Hard: { drain: 1.5, dmg: 1.3, hp: .85 } };

// ---------- the four fools ----------
const CLASSES = [
  { id: 'berserker', name: 'BERSERKER', who: 'Brakka Ironbelly', color: '#e8443a', speed: 62, armor: .75, shot: 'axe', shotDmg: 3, pierce: 1, shotSpeed: 190, cd: .34, melee: 5, mpow: 1, mgen: 1, moves: ['overhead', 'spin'],
    quip: 'Has never once read a menu.', pips: [4, 3, 5, 1, 2],
    rig: () => new E.Humanoid({ build: 'bulky', size: 1.15, weapon: 'sword', hat: 'helmet', hair: 'short', sleeves: null, cape: { len: 5, width: 5, seg: 2.4 }, colors: { cloth: '#a8322a', pants: '#5a3a22', hair: '#7a3a14', metal: '#b8b0a0', cape: '#6a4a2a', capeIn: '#3a2412', trim: '#e8c860', boot: '#3a2a1c' } }) },
  { id: 'shieldmaiden', name: 'SHIELDMAIDEN', who: 'Hilde Stoutheart', color: '#3b82f6', speed: 66, armor: .6, shot: 'javelin', shotDmg: 2, shotSpeed: 240, cd: .27, melee: 4, mpow: 1.4, mgen: 1, moves: ['thrust', 'overhead'],
    quip: 'Blocks things. Mostly dinner invitations.', pips: [5, 3, 3, 2, 3],
    rig: () => new E.Humanoid({ build: 'heroic', size: 1.1, weapon: 'sword', armor: true, hat: 'helmet', hair: 'ponytail', colors: { cloth: '#3567c2', pants: '#2c3c66', hair: '#e8c060', metal: '#c8d0dc', trim: '#e8e4ff', boot: '#2a2a3a' } }) },
  { id: 'ranger', name: 'RANGER', who: 'Fenn Quickfletch', color: '#22c55e', speed: 78, armor: .9, shot: 'arrow', shotDmg: 1, shotSpeed: 300, cd: .15, melee: 2, mpow: 1.7, mgen: 1, moves: ['jab', 'cross'],
    quip: 'Fast, hungry, and mostly elbows.', pips: [2, 5, 2, 3, 5],
    rig: () => new E.Humanoid({ build: 'heroic', size: 1.05, weapon: 'gun', hood: true, sleeves: 'long', cape: { len: 4, width: 4, seg: 2 }, colors: { cloth: '#2f8a4a', pants: '#6a4a2a', hair: '#8a5a2a', cape: '#2a6a3a', capeIn: '#143a20', trim: '#d8c070', boot: '#4a3220' } }) },
  { id: 'hexer', name: 'HEXER', who: 'Old Mother Wix', color: '#f5b700', speed: 64, armor: 1, shot: 'hex', shotDmg: 2, splash: 1, shotSpeed: 220, cd: .26, melee: 1.5, mpow: 2.5, mgen: 2, moves: ['bash'],
    quip: 'Her soup is a war crime.', pips: [1, 3, 1, 5, 3],
    rig: () => new E.Humanoid({ build: 'chibi', size: 1.05, weapon: 'staff', outfit: 'robe', hat: 'pointed', hunch: .3, sleeves: 'long', face: { eyes: 'big' }, colors: { cloth: '#6a3ab0', pants: '#4a2a80', hair: '#d8d4e0', trim: '#f5b700', metal: '#f5d070' } }) }
];
const STAT_NAMES = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];

// ---------- monsters ----------
const MON = {
  g: { id: 'ghost', name: 'HUNGERGHOST', hp: 2, spd: [40, 46, 52], dmg: [10, 20, 30], pts: 10, r: 5, ghost: true },
  n: { id: 'gnasher', name: 'GNASHER', hp: 2, spd: [34, 38, 42], dmg: [6, 8, 10], pts: 10, r: 5 },
  o: { id: 'lobber', name: 'POT-LOBBER', hp: 2, spd: [30, 34, 38], dmg: [8, 10, 12], pts: 15, r: 5 },
  i: { id: 'imp', name: 'CINDER IMP', hp: 3, spd: [36, 40, 44], dmg: [6, 8, 10], fire: [8, 10, 12], pts: 20, r: 5 },
  y: { id: 'fryar', name: 'FRYAR', hp: 3, spd: [36, 40, 44], dmg: [8, 10, 12], pts: 25, r: 5 },
  x: { id: 'snatcher', name: 'SNATCHER', hp: 3, spd: [72, 72, 72], dmg: [0, 0, 0], pts: 100, r: 4.5 },
  t: { id: 'tithe', name: 'THE TITHE', hp: 9999, spd: [52, 52, 52], dmg: [0, 0, 0], pts: 1000, r: 6, immune: true }
};
const MON_BY_ID = {}; for (const k in MON) { MON[k].ch = k; MON_BY_ID[MON[k].id] = MON[k]; }
const GEN = {
  G: { id: 'urn', name: 'ASH URN', spawn: 'g' }, N: { id: 'den', name: 'GNASHER DEN', spawn: 'n' }, L: { id: 'hutch', name: 'CROCKERY HUTCH', spawn: 'o' },
  I: { id: 'grate', name: 'EMBER GRATE', spawn: 'i' }, F: { id: 'shrine', name: 'CANDLE SHRINE', spawn: 'y' }, S: { id: 'sacks', name: 'SACK HEAP', spawn: 'x' }, U: { id: 'tureen', name: 'SOUP TUREEN', spawn: 'g' }
};
const SPECIALS = ['ironbrew', 'ogreale', 'quickshot', 'hardshot', 'witchwater', 'featherfoot', 'deeppockets'];
const SPECIAL_NAMES = { ironbrew: 'IRON BREW', ogreale: 'OGRE ALE', quickshot: 'QUICKSHOT TONIC', hardshot: 'HARDSHOT DRAUGHT', witchwater: 'WITCHWATER', featherfoot: 'FEATHERFOOT CORDIAL', deeppockets: 'DEEP POCKETS' };
const SPECIAL_COL = { ironbrew: '#b0a090', ogreale: '#d89a2a', quickshot: '#5ad0f0', hardshot: '#e05a3a', witchwater: '#a050e0', featherfoot: '#80f080', deeppockets: '#c0a060' };
const AMULETS = ['veil', 'ironskin', 'stench', 'ricochet', 'rending'];
const AMULET_NAMES = { veil: 'VEIL', ironskin: 'IRONSKIN', stench: 'STENCH', ricochet: 'RICOCHET', rending: 'RENDING' };
const AMULET_COL = { veil: '#9ab0ff', ironskin: '#ffd860', stench: '#80d040', ricochet: '#60e0ff', rending: '#ff6060' };

// realms
const REALMS = [
  { id: 'larder', name: 'THE LARDER', top: '#6a5a46', side: '#4a3e30', face: 'brick', floor: ['#5a4a38', '#65543f'], mortar: '#2a2018', accent: '#ffb060', props: ['barrel', 'crate', 'pot'], music: 'larder', line: 'The Larder: where the food goes to wait. Wait with it.' },
  { id: 'ossuary', name: 'THE OSSUARY', top: '#8a8a94', side: '#5e5e6a', face: 'stone', floor: ['#4a4a58', '#53536a'], mortar: '#1e1e28', accent: '#a0c0ff', props: ['skull', 'bones', 'candelabra', 'cobweb'], music: 'ossuary', line: 'The Ossuary: everyone here is on a diet. Permanently.' },
  { id: 'furnace', name: 'THE FURNACE', top: '#7a4030', side: '#4e281e', face: 'rock', floor: ['#40282a', '#4a2c2e'], mortar: '#1a0c0c', accent: '#ff7030', props: ['brazier', 'firedrum', 'rock'], music: 'furnace', line: 'The Furnace: the kitchen of the kitchen. Mind the heat. Mind the gravy.' },
  { id: 'banquet', name: 'THE BANQUET', top: '#8a6a3a', side: '#5a4224', face: 'plank', floor: ['#5a2a2e', '#662f34'], mortar: '#200c10', accent: '#ffd860', props: ['candelabra', 'banner', 'statue'], music: 'boss', line: 'The Banquet: you are the main course. He has been waiting.' }
];

// the descent: floors, treasure rooms and the banquet
const PLAN = [
  { kind: 'floor', no: 1, realm: 0, name: 'THE FIRST HELPING', size: [44, 28], rooms: 6, gens: 1, mons: ['n', 'g'], doors: 1, food: 4 },
  { kind: 'floor', no: 2, realm: 0, name: 'CRUMBS AND CRUMBLES', size: [52, 34], rooms: 8, gens: 3, mons: ['n', 'g', 'o'], doors: 2, food: 5, skip: 4 },
  { kind: 'floor', no: 3, realm: 0, name: 'THE LONG PANTRY', size: [56, 36], rooms: 9, gens: 4, mons: ['n', 'g', 'o', 'i'], doors: 2, food: 6, traps: 1 },
  { kind: 'treasure', name: 'THE HOARD OF HAM' },
  { kind: 'floor', no: 4, realm: 1, name: 'THE BONE LARDER', size: [56, 38], rooms: 10, gens: 5, mons: ['n', 'g', 'y', 'i'], doors: 3, food: 6, traps: 1 },
  { kind: 'floor', no: 5, realm: 1, name: 'THIEVES AND TITHES', size: [60, 40], rooms: 11, gens: 6, mons: ['n', 'g', 'o', 'y', 'x'], doors: 3, food: 7, traps: 2, force: 1, bell: 1 },
  { kind: 'floor', no: 6, realm: 1, name: 'THE GRAVY CRYPT', size: [60, 40], rooms: 11, gens: 7, mons: ['n', 'g', 'y', 'i', 'x'], doors: 3, food: 7, traps: 2, force: 2, runes: 1, tithe: 1 },
  { kind: 'treasure', name: 'THE HOARD OF BONES' },
  { kind: 'floor', no: 7, realm: 2, name: 'THE BROILING HALL', size: [62, 42], rooms: 12, gens: 8, mons: ['n', 'g', 'o', 'i', 'y'], doors: 4, food: 8, traps: 2, force: 2, runes: 2, lava: 1, spikes: 1 },
  { kind: 'floor', no: 8, realm: 2, name: 'THE LAST SIMMER', size: [64, 44], rooms: 13, gens: 9, mons: ['n', 'g', 'o', 'i', 'y', 'x'], doors: 4, food: 9, traps: 3, force: 3, runes: 2, lava: 1, spikes: 2, bell: 1, tithe: 1 },
  { kind: 'boss', no: 9, realm: 3, name: 'THE BANQUET OF KING FAMISH' }
];

// the Gaunt's lines (original; short, booming, third person, darkly funny)
const LINES = {
  start: 'THE DESCENT BEGINS. DINNER IS SERVED.',
  low400: ['{n} IS GETTING PECKISH.', '{n} HAS A RUMBLING IN THE DUNGEON.'], low200: ['{n} NEEDS FOOD. URGENTLY.', '{n} IS FADING. SOMEONE FEED {n}.'], low100: '{n} IS NEARLY SOUP.',
  fall: ['{n} HAS BEEN EATEN.', '{n} IS NOW A SNACK.'], rise: '{n} IS BACK FOR SECONDS.',
  shotfood: '{n} SHOT THE SUPPER.', shotstew: 'GOOD AIM, {n}. THAT STEW WAS PLOTTING.', flask: '{n} POPS A FLASK. EVERYTHING FLINCHES.',
  key: 'A KEY. SOMEONE LOCKED THE FOOD AWAY.', door: 'THE DOOR REMEMBERS WHAT KEYS ARE FOR.', food: 'FOOD. AT LAST, A GOOD DECISION.', stew: 'THAT STEW WAS NOT FOR EATING.',
  gen: 'A GENERATOR CRUMBLES. IT WAS ONLY TRYING TO HELP.', gnasher: 'GNASHERS. THEY HAVE ONE PERSONALITY.', ghost: 'HUNGERGHOSTS. THEY EAT EMPTY PLATES. AND YOU.',
  lobber: 'POT-LOBBERS. CROCKERY AS A LIFESTYLE.', imp: 'CINDER IMPS SPIT FIRE. ONTO YOUR SUPPER.', fryar: 'THE FRYARS ARE HERE. NOW YOU SEE THEM. NOW YOU DO NOT.',
  snatcher: 'A SNATCHER. YOUR POCKETS ARE NOT YOUR OWN.', stolen: 'THE SNATCHER HAS YOUR {i}. CHASE IT.',
  tithe: 'THE TITHE ARRIVES. ONLY MAGIC CAN SEND IT HOME.', tithePaid: 'THE TITHE IS PAID.', titheDead: 'THE TITHE HAS BEEN ARGUED WITH. AND LOST.',
  bell: 'THE DINNER BELL RINGS. {n} IS ON THE MENU.', trap: 'A TRAP. A TIDY ONE.', fake: 'THAT WALL WAS LYING.', crack: 'THE WALL GIVES UP. GOOD FOR IT.',
  force: 'FORCE FIELDS. LURE THE HORDE THROUGH THEM.', rune: 'A STUN RUNE. IT IS NOT A WELCOME MAT.', teleport: 'THE FLOOR SWALLOWS {n}. AND SPITS THEM OUT.',
  stairs: 'DOWN WE GO.', short: 'TOOK THE SHORT WAY DOWN.', chest: 'A CHEST. SOMEONE WAS SAVING THAT.', crown: 'A CROWN! THE DUNGEON SULKS.',
  patience: 'THE GAUNT GROWS IMPATIENT.', doorsOpen: 'EVERY DOOR OPENS. THE GAUNT IS BORED.', wallsOpen: 'EVERY WALL IS A STAIR NOW. HURRY UP.',
  stun: 'FROM HERE, SHOTS HURT FRIENDS. SPEAK KINDLY.', hoard: 'THE HOARD. TAKE IT ALL. QUICKLY.', slam: 'THE HOARD SLAMS SHUT.', hoardAll: 'EVERY COIN. GREED IS A VIRTUE HERE.',
  boss: 'KING FAMISH RISES FROM THE HEAD OF THE TABLE.', boss2: 'THE KING EATS HIS OWN PLATTERS. NOW HE IS CROSS.', boss3: 'THE FOG OF HUNGER. EVERYTHING DRAINS FASTER.', bossDead: 'THE KING IS DINED UPON. THE DUNGEON IS QUIET.',
  over: 'THE GAUNT IS FED.', score: 'A NEW HIGH SCORE. THE GAUNT IS ALMOST IMPRESSED.', hint1: 'FOOD IS LIFE. LIFE IS DRAINING. DO THE MATH.', hint2: 'HOLD FIRE. THE HORDE WILL DO THE REST.',
  cont: 'CONTINUE? THE KITCHEN IS STILL OPEN.', descent2: 'DESCENT II. THE MONSTERS ATE LARGER.', hunger: 'THE GAUNT IS HUNGRY. FEED IT PEOPLE.'
};
const VERBS = ['BERSERKER', 'SHIELDMAIDEN', 'RANGER', 'HEXER'];

/* ---- 10-floors.js ---- */
/* Floor generation: ASCII floors from a seed (rooms, 2-wide corridors, a key-aware solvability check), the boss hall, the hoards. */
const GEN_CHAR = { g: 'G', n: 'N', o: 'L', i: 'I', y: 'F', x: 'S' };

// generate floor `step` of PLAN with a seed; returns { rows, meta } (rows are strings, the same width)
function genFloor(step, seed, descent2) {
  const P = PLAN[step];
  if (P.kind === 'boss') return bossHall(P);
  if (P.kind === 'treasure') return hoardRoom(P, seed);
  for (let attempt = 0; attempt < 40; attempt++) {
    const f = tryFloor(P, E.rng((seed * 9973 + step * 7919 + attempt * 104729) >>> 0), descent2);
    if (f) { f.meta.attempt = attempt; return f; }
  }
  throw new Error('floor ' + step + ' would not generate');
}

function tryFloor(P, R, descent2) {
  const [W, H] = P.size, g = Array.from({ length: H }, () => Array(W).fill('#'));
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1)), rp = a => a[Math.floor(R() * a.length)];
  // --- rooms: random rectangles, 2 tiles of wall between them
  const rooms = [];
  for (let t = 0; t < 600 && rooms.length < P.rooms; t++) {
    const w = ri(6, 11), h = ri(5, 8), x = ri(2, W - w - 3), y = ri(2, H - h - 3);
    if (rooms.some(o => x < o.x + o.w + 3 && o.x < x + w + 3 && y < o.y + o.h + 3 && o.y < y + h + 3)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  if (rooms.length < Math.max(5, P.rooms - 3)) return null;
  // --- chain order: start at the leftmost room, always hop to the nearest unvisited one
  rooms.sort((a, b) => a.x - b.x);
  const order = [rooms.shift()];
  while (rooms.length) { const l = order[order.length - 1]; let bi = 0, bd = 1e9; rooms.forEach((o, i) => { const d = Math.abs(o.cx - l.cx) + Math.abs(o.cy - l.cy); if (d < bd) { bd = d; bi = i; } }); order.push(rooms.splice(bi, 1)[0]); }
  order.forEach((r, i) => { r.i = i; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = '.'; });
  const inRoom = (x, y) => order.some(r => x >= r.x - 1 && x < r.x + r.w + 1 && y >= r.y - 1 && y < r.y + r.h + 1);
  // --- corridors (2 wide, L shaped); remember each link's path to place doors on it
  const links = [];
  for (let i = 0; i < order.length - 1; i++) {
    const a = order[i], b = order[i + 1], path = [], hFirst = R() < .5;
    const carve = (x, y) => { for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) { const X = x + dx, Y = y + dy; if (X > 0 && Y > 0 && X < W - 1 && Y < H - 1 && g[Y][X] === '#') g[Y][X] = ','; } };
    let x = a.cx, y = a.cy;
    const stepH = () => { while (x !== b.cx) { carve(x, y); path.push([x, y, 'h']); x += Math.sign(b.cx - x); } };
    const stepV = () => { while (y !== b.cy) { carve(x, y); path.push([x, y, 'v']); y += Math.sign(b.cy - y); } };
    if (hFirst) { stepH(); stepV(); } else { stepV(); stepH(); }
    carve(x, y);
    links.push({ a: i, b: i + 1, path });
  }
  for (const r of order) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y][x] === ',') g[y][x] = '.';
  const taken = new Set(), K = (x, y) => y * W + x, free = (x, y) => g[y] && g[y][x] === '.' && !taken.has(K(x, y));
  const use = (x, y, c) => { g[y][x] = c; taken.add(K(x, y)); };
  // corridor cells become '.', rooms marked
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === ',') g[y][x] = '.';
  const cellsOf = r => { const o = []; for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) o.push([x, y]); return o; };
  const roomCell = (r, avoid) => { for (let t = 0; t < 40; t++) { const c = rp(cellsOf(r)); if (free(c[0], c[1])) return c; } return null; };
  const placeIn = (r, ch) => { const c = roomCell(r); if (!c) return null; use(c[0], c[1], ch); return c; };
  const first = order[0], last = order[order.length - 1];
  // --- start and stairs (kept clear)
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) use(first.x + 1 + dx, first.y + 1 + dy, '@');
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) use(last.cx + dx, last.cy + dy, 'E');
  // keep the cells beside the start free of other things
  for (let dy = -1; dy < 3; dy++) for (let dx = -1; dx < 3; dx++) taken.add(K(first.x + 1 + dx, first.y + 1 + dy));
  // --- doors: on the chain, just outside the room a link leaves; each needs a key found in rooms up to that room
  const doorLinks = []; const cand = links.map((l, i) => i).filter(i => i >= 1 && i < links.length - 0);
  for (let t = 0; t < P.doors && cand.length; t++) { const i = cand.splice(Math.floor(R() * cand.length), 1)[0]; doorLinks.push(i); }
  doorLinks.sort((a, b) => a - b);
  const doors = [];
  for (const li of doorLinks) {
    const L = links[li], A = order[L.a];
    const ok = L.path.findIndex(([x, y]) => !inRoom(x, y) && !inRoom(x + 1, y + 1) && !inRoom(x, y + 1) && !inRoom(x + 1, y));
    if (ok < 0 || ok + 2 >= L.path.length) continue;
    const [x, y, dir] = L.path[ok + 1];
    const cells = dir === 'h' ? [[x, y], [x, y + 1]] : [[x, y], [x + 1, y]];
    if (cells.some(([cx, cy]) => g[cy][cx] !== '.' || taken.has(K(cx, cy)))) continue;
    // door must not be adjacent to a room's cells
    cells.forEach(([cx, cy]) => use(cx, cy, '+'));
    doors.push({ li, room: L.a, cells });
  }
  // --- keys for every door (in rooms up to the one before the door), plus a spare for a locked chest
  const keyRooms = [];
  doors.forEach((d, j) => { const r = order[Math.floor(R() * (d.room + 1))]; if (placeIn(r, 'k')) keyRooms.push(r.i); });
  // --- generators
  const gens = [];
  const genMons = P.mons.filter(m => GEN_CHAR[m]);
  for (let n = 0; n < P.gens; n++) {
    const r = order[Math.min(order.length - 1, 1 + Math.floor((n + R()) * (order.length - 1) / P.gens))];
    const m = genMons[n % genMons.length], c = placeIn(r, GEN_CHAR[m]); if (c) gens.push({ x: c[0], y: c[1], m });
  }
  // --- monsters scattered in every room but the first
  const monN = 4 + P.no * 2;
  for (let n = 0; n < monN; n++) { const r = order[1 + Math.floor(R() * (order.length - 1))], m = rp(P.mons.filter(c => c !== 'x')); placeIn(r, m); }
  if (P.mons.includes('x')) placeIn(order[Math.max(1, order.length >> 1)], 'x');
  // --- food, flasks and treasure
  for (let n = 0; n < P.food; n++) placeIn(order[Math.floor(R() * order.length)], rp(['f', 'b', 'j', 'b', 'f']));
  for (let n = 0; n < 2; n++) placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'z');
  for (let n = 0; n < 2 + (P.no >> 1); n++) placeIn(order[Math.floor(R() * order.length)], 'm');
  for (let n = 0; n < 8 + P.no * 2; n++) placeIn(order[Math.floor(R() * order.length)], R() < .25 ? '*' : '$');
  for (let n = 0; n < 2; n++) placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'h');
  if (P.no >= 2) { if (placeIn(order[Math.max(1, order.length - 2)], 'l')) placeIn(order[Math.floor(R() * (order.length - 1))], 'k'); }
  const specials = [], amulets = [];
  { const s = SPECIALS[(P.no * 3 + (R() * 3 | 0)) % SPECIALS.length]; if (placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'u')) specials.push(s); }
  { const a = AMULETS[(P.no + (R() * 5 | 0)) % AMULETS.length]; if (placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'a')) amulets.push(a); }
  if (P.no >= 3 && R() < .7) placeIn(order[Math.floor(R() * order.length)], 'w');
  // --- closets: alcoves cut into the outer face of a room's wall, sealed by trap walls, cracks or a fake wall
  const closet = (seal, contents) => {
    for (let t = 0; t < 60; t++) {
      const r = rp(order.slice(1)), side = Math.floor(R() * 4);
      let sx, sy, dx = 0, dy = 0;       // seal cell, direction out of the room
      if (side === 0) { dy = -1; sx = r.x + 1 + Math.floor(R() * (r.w - 2)); sy = r.y - 1; }
      else if (side === 1) { dy = 1; sx = r.x + 1 + Math.floor(R() * (r.w - 2)); sy = r.y + r.h; }
      else if (side === 2) { dx = -1; sx = r.x - 1; sy = r.y + 1 + Math.floor(R() * (r.h - 2)); }
      else { dx = 1; sx = r.x + r.w; sy = r.y + 1 + Math.floor(R() * (r.h - 2)); }
      // the 3x3 pocket beyond the seal must be solid wall and inside the map
      const px0 = sx + dx, py0 = sy + dy; let ok = true; const pocket = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const X = px0 + dx + (dx ? 0 : a) + (dx ? 0 : 0), Y = py0 + dy + (dy ? 0 : b); const xx = dx ? px0 + dx * Math.max(0, 0) + (a === 0 ? 0 : 0) : px0 + a, yy = dy ? py0 : py0 + b; void X; void Y; }
      const cs = [[px0, py0]]; if (dx) { cs.push([px0 + dx, py0]); cs.push([px0, py0 - 1], [px0, py0 + 1]); } else { cs.push([px0, py0 + dy]); cs.push([px0 - 1, py0], [px0 + 1, py0]); }
      for (const [X, Y] of cs) if (X < 2 || Y < 2 || X > W - 3 || Y > H - 3 || g[Y][X] !== '#') ok = false;
      // the ring around the pocket must also be wall (so it stays closed)
      for (let a = -2; a <= 2 && ok; a++) for (let b = -2; b <= 2; b++) { const X = px0 + a + dx, Y = py0 + b + dy; if (X < 1 || Y < 1 || X > W - 2 || Y > H - 2) { ok = false; break; } const cc = g[Y][X]; if (cc !== '#' && !(X === sx && Y === sy) && !(Math.abs(X - px0) + Math.abs(Y - py0) <= 2 && cc === '#')) { if (cc !== '#') { ok = false; break; } } }
      if (!ok || g[sy][sx] !== '#' || !free(sx - dx, sy - dy)) continue;
      // carve the pocket (2 cells deep), seal it
      g[py0][px0] = '.'; taken.add(K(px0, py0)); g[py0 + dy][px0 + dx] = '.'; taken.add(K(px0 + dx, py0 + dy));
      g[sy][sx] = seal; taken.add(K(sx, sy)); taken.add(K(sx - dx, sy - dy));
      contents.forEach((c, i) => { const p = i === 0 ? [px0, py0] : i === 1 ? [px0 + dx, py0 + dy] : [px0 + (dx ? 0 : (i === 2 ? -1 : 1)), py0 + (dy ? 0 : (i === 2 ? -1 : 1))]; if (g[p[1]][p[0]] === '#') g[p[1]][p[0]] = '.'; if (c) g[p[1]][p[0]] = c; taken.add(K(p[0], p[1])); });
      return { sx, sy, px: px0, py: py0 };
    }
    return null;
  };
  let traps = 0;
  for (let n = 0; n < (P.traps || 0); n++) {
    if (n % 2 === 0) { if (closet('T', ['$', '*', '$']) && placeIn(order[Math.floor(R() * order.length)], '^')) traps++; }
    else { if (closet('Y', ['n', 'n', 'n']) && placeIn(order[1 + Math.floor(R() * (order.length - 1))], 'v')) traps++; }
  }
  if (P.no >= 2) closet('X', ['f', 'm', 'h']);
  if (P.no >= 1) closet('?', ['*', '$', 'j']);
  if (P.skip) { const sk = closet('?', [String(P.skip)]); void sk; }
  // --- force fields across corridors, runes and spikes, lava, the bell, transporters
  for (let n = 0; n < (P.force || 0); n++) {
    const li = 1 + Math.floor(R() * (links.length - 1)), L = links[li];
    const k = L.path.findIndex(([x, y]) => !inRoom(x, y) && !inRoom(x + 1, y + 1) && !inRoom(x, y + 1) && !inRoom(x + 1, y));
    if (k < 0 || k + 3 >= L.path.length) continue;
    const [x, y, dir] = L.path[k + 2], cells = dir === 'h' ? [[x, y, '|'], [x, y + 1, '|']] : [[x, y, '-'], [x + 1, y, '-']];
    if (cells.every(([cx, cy]) => g[cy][cx] === '.' && !taken.has(K(cx, cy)))) cells.forEach(([cx, cy, c]) => use(cx, cy, c));
  }
  for (let n = 0; n < (P.runes || 0); n++) { const r = rp(order.slice(1)); for (let q = 0; q < 3; q++) { const c = roomCell(r); if (c) use(c[0], c[1], '!'); } }
  for (let n = 0; n < (P.spikes || 0); n++) { const r = rp(order.slice(1)); for (let q = 0; q < 4; q++) { const c = roomCell(r); if (c) use(c[0], c[1], 's'); } }
  if (P.lava) for (let n = 0; n < 3; n++) { const r = rp(order.slice(1)), c = roomCell(r); if (c && c[0] + 1 < r.x + r.w - 1 && c[1] + 1 < r.y + r.h - 1) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (free(c[0] + dx, c[1] + dy)) use(c[0] + dx, c[1] + dy, '~'); }
  if (P.bell) placeIn(order[Math.max(1, order.length - 3)], 'B');
  if (P.no >= 3) { const a = placeIn(order[1], 'O'), b = placeIn(order[order.length - 2], 'O'); if (!a || !b) { if (a) g[a[1]][a[0]] = '.'; if (b) g[b[1]][b[0]] = '.'; } }
  // --- validate: with doors counted by keys, lava and all, the stairs must be reachable and every key too
  const rows = g.map(r => r.join(''));
  if (!solvable(rows)) return null;
  return { rows, meta: { name: P.name, realm: P.realm, no: P.no, kind: 'floor', par: 150 + P.no * 10, rank: Math.min(3, 1 + (P.no >= 3) + (P.no >= 6)) + (descent2 ? 1 : 0), genRank: Math.min(3, 1 + (P.no >= 2) + (P.no >= 5)) + (descent2 ? 1 : 0), specials, amulets, skip: P.skip || 0, tithe: !!P.tithe, step: PLAN.indexOf(P), rooms: order.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })) } };
}

// can the heroes reach the stairs, taking keys and opening whole door runs, with lava and trap walls closed?
function solvable(rows) {
  const H = rows.length, W = rows[0].length, g = rows.map(r => r.split(''));
  const walk = (c) => !'#%XTY~='.includes(c) && c !== '?' ;   // a fake wall is walkable but we do not count on it
  let sx = -1, sy = -1; for (let y = 0; y < H && sx < 0; y++) { const x = g[y].indexOf('@'); if (x >= 0) { sx = x; sy = y; } }
  if (sx < 0) return false;
  let keys = 0; const seen = new Uint8Array(W * H), open = new Set();
  const flood = () => {
    const q = [[sx, sy]]; seen.fill(0); seen[sy * W + sx] = 1; let reachedExit = false, kc = 0; const doorCells = [];
    while (q.length) {
      const [x, y] = q.pop(); const c = g[y][x];
      if (c === 'E') reachedExit = true; if (c === 'k') kc++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx]) continue;
        const d = g[ny][nx];
        if (d === '+' && !open.has(ny * W + nx)) { doorCells.push([nx, ny]); continue; }
        if (!walk(d) && d !== '+') continue;
        seen[ny * W + nx] = 1; q.push([nx, ny]);
      }
    }
    return { reachedExit, kc, doorCells };
  };
  const taken = new Set();
  for (let it = 0; it < 30; it++) {
    const f = flood(); if (f.reachedExit) return true;
    // keys picked so far = keys seen in reachable area minus used
    let totalSeen = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (seen[y * W + x] && g[y][x] === 'k' && !taken.has(y * W + x)) { taken.add(y * W + x); totalSeen++; }
    keys += totalSeen;
    if (!f.doorCells.length || keys < 1) return false;
    // open one whole 4-connected door run
    const [dx0, dy0] = f.doorCells[0], st = [[dx0, dy0]];
    while (st.length) { const [x, y] = st.pop(); if (open.has(y * W + x)) continue; open.add(y * W + x); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + ax, Y = y + ay; if (g[Y] && g[Y][X] === '+') st.push([X, Y]); } }
    keys--;
  }
  return false;
}

function hoardRoom(P, seed) {
  const R = E.rng(seed * 31 + 7), W = 36, H = 22, g = Array.from({ length: H }, () => Array(W).fill('#'));
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) g[y][x] = '.';
  for (let x = 12; x < 24; x += 6) for (let y = 6; y < 16; y++) g[y][x] = '#';
  g[3][3] = g[3][4] = g[4][3] = g[4][4] = '@';
  g[H - 5][W - 5] = g[H - 5][W - 4] = g[H - 4][W - 5] = g[H - 4][W - 4] = 'E';
  let n = 0;
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (g[y][x] === '.' && (x + y) % 2 === 0 && R() < .5) { g[y][x] = R() < .12 ? '*' : R() < .02 ? 'w' : R() < .06 ? 'h' : '$'; n++; }
  return { rows: g.map(r => r.join('')), meta: { name: P.name, realm: 3, no: 0, kind: 'treasure', par: 60, rank: 1, genRank: 1, specials: [], amulets: [], step: PLAN.indexOf(P), treasureCount: n } };
}

function bossHall(P) {
  const W = 42, H = 22, g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? '#' : '.'));
  // the banquet table: a low wall three cells deep, platters along both edges, a tureen at each corner; the king sits at its head
  for (let y = 5; y <= 7; y++) for (let x = 10; x <= 30; x++) g[y][x] = '=';
  for (let x = 13; x <= 28; x += 3) { g[5][x] = 'P'; g[7][x] = 'P'; }
  g[5][10] = g[7][10] = g[5][30] = g[7][30] = 'U';
  g[6][33] = 'K';
  for (const [x, y, c] of [[4, 10, '$'], [37, 10, '$'], [4, 12, 'f'], [37, 12, 'f'], [20, 12, 'j'], [10, 15, 'm'], [18, 15, 'm'], [26, 15, 'm'], [34, 15, 'm'], [20, 3, '*'], [14, 2, '$'], [26, 2, '$']]) g[y][x] = c;
  g[18][4] = g[18][5] = g[19][4] = g[19][5] = '@';
  return { rows: g.map(r => r.join('')), meta: { name: P.name, realm: 3, no: 9, kind: 'boss', par: 400, rank: 2, genRank: 2, specials: [], amulets: [], step: PLAN.indexOf(P), points: { escape: [] } } };
}

/* ---- 20-world.js ---- */
/* World building: the run state, heroes, a floor's map and entities, rigs, the flow field. */
let game = null;                       // the E.Game (set in 90-main)
const RUN = {                          // one run (descent) across floors
  active: false, step: 0, seed: 1, descent2: false, heroes: [], continues: 0, diff: 'Normal', time: 0, ended: false, mode: 'solo', attract: false
};
let W = null;                          // the current floor's world
const SETTINGS_DEFAULT = { cameraView: 'Three-quarter', glyphs: 'PlayStation', difficulty: 'Normal', aimAssist: 'Low', stickFires: true, allyStun: true, captions: true, tips: true, names: true, hudSize: 'Normal', lighting: true };
const OPT = Object.assign({}, SETTINGS_DEFAULT, E.store.get('gauntletdown-opts', {}) || {});
const saveOpts = () => E.store.set('gauntletdown-opts', OPT);

// ---------- a multi-source flow field (distance by BFS over walkable cells) ----------
class Flow {
  constructor(map) { this.map = map; this.w = map.w; this.h = map.h; this.d = new Int32Array(this.w * this.h); this.key = ''; this.ver = -1; }
  update(srcs) {
    const m = this.map, w = this.w, h = this.h, k = srcs.map(s => s[0] + ',' + s[1]).join(';') + '|' + m.version;
    if (k === this.key) return false;
    this.key = k; this.d.fill(1e9); const q = [];
    for (const [cx, cy] of srcs) { if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue; this.d[cy * w + cx] = 0; q.push(cx, cy); }
    for (let i = 0; i < q.length; i += 2) {
      const x = q[i], y = q[i + 1], dd = this.d[y * w + x] + 1;
      for (let n = 0; n < 4; n++) {
        const nx = x + (n === 0) - (n === 1), ny = y + (n === 2) - (n === 3);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || this.d[ny * w + nx] <= dd || !m.walkable(nx, ny)) continue;
        this.d[ny * w + nx] = dd; q.push(nx, ny);
      }
    }
    return true;
  }
  // unit direction from world (x, y) down the field (null when unreached)
  dir(x, y) {
    const T = TS, cx = Math.floor(x / T), cy = Math.floor(y / T), w = this.w; if (cx < 0 || cy < 0 || cx >= w || cy >= this.h) return null;
    let best = this.d[cy * w + cx], bx = 0, by = 0;
    if (best >= 1e9) return null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= this.h) continue;
      if (dx && dy && (!this.map.walkable(cx + dx, cy) || !this.map.walkable(cx, cy + dy))) continue;   // no corner cutting
      const v = this.d[ny * w + nx] + (dx && dy ? .4 : 0); if (v < best) { best = v; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    const px0 = (cx + bx + .5) * T, py0 = (cy + by + .5) * T, l = Math.hypot(px0 - x, py0 - y) || 1;
    return [(px0 - x) / l, (py0 - y) / l];
  }
  at(x, y) { const cx = Math.floor(x / TS), cy = Math.floor(y / TS); return cx < 0 || cy < 0 || cx >= this.w || cy >= this.h ? 1e9 : this.d[cy * this.w + cx]; }
}

// ---------- heroes ----------
function makeHero(slot, clsIdx, input) {
  const C = CLASSES[clsIdx];
  const h = Object.assign(new E.Body({ x: 0, y: 0, r: 5, friction: 0 }), {
    slot, cls: clsIdx, C, input, rig: C.rig(), combo: new E.Combo(C.moves, { window: .45 }), name: C.name,
    hp: Math.round(TUNE.startHealth * DIFF[OPT.difficulty].hp), score: 0, keys: 0, flasks: 1, kills: 0, treasure: 0, food: 0, shotFood: 0, gensKilled: 0, floors: 0, specials: {}, amulet: null, amuletT: 0,
    facing: Math.PI / 2, aim: [0, 1], int: { mx: 0, my: 0, ax: 0, ay: 1, fire: false, magic: false, plant: false, rise: false }, cd: 0, grace: 0, stun: 0, queasy: 0, runeImmune: 0, tele: 0, invuln: 0, flash: 0,
    remote: false, puppet: false, down: false, downT: 0, rise: 0, lowSaid: 0, hurtT: 0, firing: false, swing: 0, stairT: 0, menuMark: false, ghostAlpha: 1, hunger: 0, net: null, bot: null, lastX: 0, lastY: 0, shotsFired: 0, awards: {}, bossDmg: 0, joined: true, kick: 0
  });
  h.maxKeys = 9; h.maxFlasks = 9;
  return h;
}
const heroSpeed = h => h.C.speed * TUNE.heroSpeed * (h.specials.featherfoot ? 1.12 : 1) * (h.queasy > 0 ? .6 : 1) * (h.tele > 0 ? 1 : 1);
const livingHeroes = () => W ? W.heroes.filter(h => !h.down && !h.gone) : [];
const heroLimit = h => h.specials.deeppockets ? 12 : 9;

// ---------- a floor ----------
const TYPES = realm => {
  const R = REALMS[realm], T = E.tones(R.top).sh, D = E.tones(R.side).deep;
  return {
    1: { h: 24, top: T, side: R.side, face: R.face, roof: 'plain', cut: true, cutH: 6 },
    3: { h: 24, top: T, side: R.side, face: R.face, roof: 'plain', cut: true, cutH: 6 },
    4: { h: 24, top: T, side: R.side, face: R.face, roof: 'plain', cut: true, cutH: 6 },
    5: { h: 24, top: '#8a7a6a', side: '#5a4a3a', face: 'stone', roof: 'slab', cut: true, cutH: 6 },
    6: { h: 20, top: '#707078', side: '#383840', face: 'none', roof: 'plain', cut: true, cutH: 6 },
    7: { h: 10, top: '#a0703a', side: '#6a4624', face: 'plank', roof: 'plank', cut: false }
  };
};
function floorTexFor(realm) {
  const R = REALMS[realm], st = R.floor.map(E.hex), mortar = E.hex(R.mortar);
  const pal = { stones: st, mortar, hi: st[1].map(v => Math.min(255, v + 22)), lo: st[0].map(v => Math.max(0, v - 18)), speck: mortar };
  return (x, y, tag) => {
    if (tag === 'lava') { const t = (Math.sin(x * .21 + y * .13) + Math.sin(y * .27 - x * .09) + 2) / 4; return [Math.floor(190 + t * 60), Math.floor(60 + t * 90), 20, 1]; }
    if (tag === 'rug') return E.tex.plain(x, y, { base: E.hex('#6a2a34'), amount: 8 });
    return E.tex.flagstone(x, y, pal, 16);
  };
}

function monRig(ch, rank) {
  const sz = rank === 3 ? 1.15 : rank === 2 ? 1 : .88, tint = (a, b, c) => [c, b, a][rank - 1] || a;
  switch (ch) {
    case 'g': return { kind: 'b', rig: new E.Blob({ R: 5 * sz, colors: { dk: '#7a8aa8', base: tint('#d8e4f8', '#b8c8e8', '#9aaed8'), lt: '#f4faff', eye: '#101020', pupil: '#101020' }, mouth: true, face: 'front' }) };
    case 'n': return { kind: 'h', rig: new E.Humanoid({ size: .95 * sz, build: 'bulky', weapon: 'sword', outfit: 'tunic', hair: 'bald', colors: { skin: tint('#9ad070', '#7ab858', '#5a9840'), cloth: tint('#a08060', '#8a6a48', '#704a30'), pants: '#4a3a28', metal: '#7a5a38', hilt: '#4a3018' }, eyeGlow: '#ffd84a' }) };
    case 'o': return { kind: 'h', rig: new E.Humanoid({ size: .95 * sz, build: 'chibi', weapon: null, outfit: 'tunic', hat: { style: 'band', color: '#c8a050' }, hair: 'short', colors: { skin: '#e0b890', cloth: tint('#e8e0c8', '#d0c8a8', '#b8a888'), pants: '#6a5a40', hair: '#503020' } }) };
    case 'i': return { kind: 'b', rig: new E.Blob({ R: 4.6 * sz, colors: { dk: '#8a1a10', base: tint('#ff7040', '#f05030', '#d83020'), lt: '#ffc070', eye: '#fff0a0', pupil: '#200808', wing: '#a02818' }, wings: true, horns: true, mouth: 'fangs', face: 'front' }) };
    case 'y': return { kind: 'h', rig: new E.Humanoid({ size: 1 * sz, weapon: 'staff', outfit: 'robe', hood: true, sleeves: 'long', hunch: .2, colors: { cloth: tint('#a08868', '#8a7050', '#705838'), hair: tint('#a08868', '#8a7050', '#705838'), metal: '#505058', trim: '#e8c860' }, eyeGlow: '#ff8040' }) };
    case 'x': return { kind: 'h', rig: new E.Humanoid({ size: .85, build: 'chibi', weapon: null, outfit: 'coat', hood: true, sleeves: 'long', colors: { cloth: '#3a3048', coat: '#2a2038', hair: '#2a2038', trim: '#c8a050', boot: '#201828' }, eyeGlow: '#f0e060' }) };
    case 't': return { kind: 'h', rig: new E.Humanoid({ size: 1.5, build: 'heroic', weapon: 'staff', outfit: 'robe', hood: true, sleeves: 'long', hunch: .1, colors: { cloth: '#1a1220', hair: '#1a1220', skin: '#d8d4c8', metal: '#a0a0a8', trim: '#6a3a8a' }, eyeGlow: '#c050ff' }) };
    case 'K': return { kind: 'h', rig: new E.Humanoid({ size: 2.3, build: 'bulky', weapon: 'sword', hat: 'crown', outfit: 'tunic', colors: { skin: '#e8b890', cloth: '#a02838', pants: '#401820', hair: '#d0c0a0', metal: '#d8c060', trim: '#f0d060', hilt: '#d8c060' }, eyeGlow: '#ff6040' }) };
  }
}

function newMonster(ch, x, y, rank, o = {}) {
  const T = MON[ch] || (ch === 'K' ? { id: 'king', hp: 400, spd: [30, 30, 30], dmg: [12, 12, 12], pts: 10000, r: 12, name: 'KING FAMISH' } : null);
  const rk = clamp(rank, 1, 3);
  const m = Object.assign(new E.Body({ x, y, r: T.r, friction: 0 }), {
    ch, T, rank: rk, rank0: rk, hp: T.hp * rk, maxhp: T.hp * rk, state: 'chase', t: rnd(1), atk: 0, atkT: 0, tell: 0, cool: rnd(.5, 1.2), facing: rnd(TAU), dying: 0, flash: 0, home: o.home || null,
    stun: 0, vis: 2, fadeT: 0, rigD: monRig(ch, rk), emerge: o.emerge || 0, id: ++W.nid, dead: false, drained: new Map(), swing: new E.Attack('overhead'), alpha: 1, targetId: -1, spawnRank: rk, stolen: null, escape: null, grav: 0
  });
  if (T.ghost) { m.gravity = 0; m.z = 4; }
  return m;
}

const GENDEF = { G: { c: ['#6a6a78', '#9a9aa8', '#d8e4f8'], hp: 4 }, N: { c: ['#6a4a2a', '#8a6a3a', '#9ad070'], hp: 4 }, L: { c: ['#8a6a4a', '#c8a870', '#e8e0c8'], hp: 4 }, I: { c: ['#4a2018', '#802818', '#ff7040'], hp: 4 }, F: { c: ['#6a6048', '#a09068', '#ffd860'], hp: 4 }, S: { c: ['#5a4a38', '#8a7458', '#c8a050'], hp: 4 }, U: { c: ['#7a7a88', '#b0b0c0', '#ff8040'], hp: 4 } };

function buildWorld(step, opts = {}) {
  const gen = opts.rows ? { rows: opts.rows, meta: opts.meta } : genFloor(step, RUN.seed, RUN.descent2);
  const { rows, meta } = gen, P = PLAN[step];
  const w = rows[0].length, h = rows.length, realm = meta.realm, R = REALMS[realm];
  const cells = new Array(w * h).fill(0), floor = new Array(w * h).fill(null), blocked = new Array(w * h).fill(0);
  const WL = { W: null };
  W = { step, meta, rows, w, h, realm, R, kind: meta.kind, time: 0, nid: 0, heroes: [], mons: [], gens: [], items: [], doors: [], pads: [], beams: [], plates: [], runes: [], spikes: [], fakes: [], cracked: [], trapWalls: { T: [], Y: [] }, bellObj: null,
    shots: [], foe: [], fx: [], texts: [], rubble: [], bars: [], decor: [], lights: [], speech: [], queue: [], stairs: [], skips: [], cellsRef: cells, lastSay: {}, done: false, descend: null, stairBy: -1,
    patience: 0, tithe: null, titheNext: null, bellT: 0, menuHero: null, hoard: { t: 0, on: false, total: 0, left: 0 }, boss: null, killsTotal: 0, flow: null, bellFlow: null, contT: -1, overT: -1, ghostCount: 0, shake: 0, fog: 0, net: null, attract: !!opts.attract, flowTick: 0, wallStairs: false, doorsOpen: false, secretFound: false, lobs: [] };
  const rankOf = (ch, x, y) => (meta.ranks && meta.ranks[x + ',' + y]) || meta.rank;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = rows[y][x], i = y * w + x, cx = (x + .5) * TS, cy = (y + .5) * TS;
    switch (c) {
      case '#': case '%': cells[i] = 1; break;
      case 'X': cells[i] = 3; W.cracked.push({ x, y, hp: 4 }); break;
      case 'T': cells[i] = 4; W.trapWalls.T.push({ x, y }); break;
      case 'Y': cells[i] = 4; W.trapWalls.Y.push({ x, y }); break;
      case '+': cells[i] = 6; break;
      case '=': case 'P': case 'U': cells[i] = 7; break;
      case '?': W.fakes.push({ x, y, found: 0 }); break;
      case '~': floor[i] = 'lava'; blocked[i] = 1; break;
      case ',': floor[i] = 'rug'; break;
    }
    const add = (kind, extra) => W.items.push(Object.assign({ kind, x: cx, y: cy, z: 0, id: W.items.length, t: rnd(6), gone: false }, extra));
    switch (c) {
      case 'k': add('key'); break; case 'f': add('roast'); break; case 'b': add('loaf'); break; case 'j': add('cider'); break; case 'z': add('stew'); break; case 'm': add('flask'); break;
      case 'u': add('potion', { sub: (meta.specials || [])[0] || 'ironbrew' }); break; case 'a': add('amulet', { sub: (meta.amulets || [])[0] || 'veil' }); break;
      case '$': add('gold'); break; case '*': add('gem'); break; case 'h': add('chest'); break; case 'l': add('lchest'); break; case 'w': add('crown'); break;
      case 'P': add('platter', { z: 10 }); break; case 'B': W.bellObj = { x: cx, y: cy, rung: false, t: 0, id: 0 }; break;
      case '@': W.starts = W.starts || []; W.starts.push({ x: cx, y: cy }); break;
      case 'E': W.stairs.push({ x: cx, y: cy, cx: x, cy: y }); break;
      case 'O': W.pads.push({ x: cx, y: cy, cd: 0 }); break;
      case '!': W.runes.push({ x: cx, y: cy }); break;
      case 's': W.spikes.push({ x: cx, y: cy, ph: ((x * 7 + y * 3) % 10) / 10 * 1.6 }); break;
      case '^': W.plates.push({ x: cx, y: cy, kind: 'T', hit: false }); break;
      case 'v': W.plates.push({ x: cx, y: cy, kind: 'Y', hit: false }); break;
      case '|': case '-': W.beams.push({ x: cx, y: cy, vert: c === '|', ph: ((x + y) % 2) * 2 }); break;
      case 'K': W.bossStart = { x: cx, y: cy }; break;
      default:
        if (c >= '2' && c <= '9') W.skips.push({ x: cx, y: cy, to: +c });
        else if (MON[c]) { W.pendingMons = W.pendingMons || []; W.pendingMons.push([c, cx, cy, rankOf(c, x, y)]); }
        else if (GEN[c]) { const gd = GENDEF[c]; W.gens.push({ ch: c, G: GEN[c], x: cx, y: cy, r: 7, rank: meta.genRank, rank0: meta.genRank, hp: Math.ceil(gd.hp * meta.genRank * TUNE.generatorHp), maxhp: Math.ceil(gd.hp * meta.genRank * TUNE.generatorHp), t: rnd(1, 2), kids: 0, flash: 0, id: W.gens.length, dead: false, breathe: rnd(TAU), table: c === 'U' }); }
    }
  }
  // doors: 4-connected runs open together
  const seen = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] === '+' && !seen.has(y * w + x)) {
    const grp = [], st = [[x, y]];
    while (st.length) { const [a, b] = st.pop(); if (seen.has(b * w + a)) continue; seen.add(b * w + a); grp.push({ x: a, y: b }); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (rows[b + dy] && rows[b + dy][a + dx] === '+') st.push([a + dx, b + dy]); }
    W.doors.push({ cells: grp, open: 0, t: 0 });
  }
  // fake-wall alcoves hold a secret pocket: floor already; transporter pairs
  W.pads.forEach((p, i) => { p.pair = W.pads[i ^ 1] || null; });
  W.map = new E.TileMap({ w, h, cells, floor, blocked, types: TYPES(realm), floorTex: floorTexFor(realm), ao: 6, block: ['lava'] });
  W.map.outside = '#0a0710';
  for (let i = 0; i < w * h; i++) if (blocked[i]) W.map.blocked && (W.map.blocked[i] = 1);
  W.flow = new Flow(W.map); W.bellFlow = new Flow(W.map);
  W.grid = new E.SpatialHash(32);
  // monsters
  for (const [ch, x, y, rk] of W.pendingMons || []) W.mons.push(newMonster(ch, x, y, rk));
  // the boss
  if (meta.kind === 'boss') {
    const kHP = 400 * (1 + .5 * (Math.max(1, opts.players || 1) - 1));
    const k = newMonster('K', W.bossStart.x, W.bossStart.y, 1); k.hp = k.maxhp = kHP; k.T = Object.assign({}, k.T, { immune: false }); k.isBoss = true; k.phase = 1; k.state = 'sleep';
    W.boss = k; W.mons.push(k);
  }
  // lights from decoration
  decorate();
  if (meta.kind === 'treasure') { W.hoard.on = true; W.hoard.t = TUNE.hoardTime; W.hoard.total = W.items.filter(i => ['gold', 'gem', 'chest', 'crown'].includes(i.kind)).length; W.hoard.left = W.hoard.total; }
  return W;
}

// deterministic decoration: torches on wall faces, realm props beside walls (never on anything)
function decorate() {
  const { map, rows, w, h, R } = W, busy = new Set();
  for (const o of [...W.items, ...W.gens, ...W.pads, ...W.runes, ...W.spikes, ...W.plates, ...W.beams, ...W.stairs, ...(W.starts || []), ...W.skips, ...(W.mons)]) busy.add(Math.floor(o.y / TS) * w + Math.floor(o.x / TS));
  const solid = (x, y) => map.solidCell(x, y);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (rows[y][x] !== '.' || busy.has(y * w + x)) continue;
    const s = E.hash2(x * 3 + 1, y * 5 + 2);
    // torch on the wall face north of open floor
    if (solid(x, y - 1) && !solid(x, y + 1) && s < .1) W.decor.push({ type: 'torch', x: (x + .5) * TS, y: y * TS + 2, z: 10, light: true });
    else if (solid(x, y - 1) && s > .8 && s < .9 && rows[y][x + 1] === '.' ) { const name = R.props[Math.floor(E.hash2(x, y) * R.props.length)]; if (!busy.has(y * w + x + 1)) { W.decor.push({ type: name, x: (x + .5) * TS, y: (y + .62) * TS, z: 0, solid: false }); busy.add(y * w + x); } }
  }
}

function placeHeroes(heroes, starts) {
  heroes.forEach((hh, i) => {
    const s = starts[i % starts.length], j = i >= starts.length ? Math.floor(i / starts.length) * 4 : 0;
    hh.x = s.x + j; hh.y = s.y; hh.vx = hh.vy = 0; hh.z = 0;
  });
}

/* ---- 21-sim.js ---- */
/* The simulation: heroes, shots, monsters, generators, items, level features, the narrator. Runs on the host (or solo); clients only puppet. */
const DEV = { god: false, noclip: false, infinite: false, freeze: false, onehit: false, gensOff: false, hitboxes: false, flow: false, netstats: false, bot: false, botThoughts: false, timeScale: 1, any: false };
const devAny = () => DEV.god || DEV.noclip || DEV.infinite || DEV.freeze || DEV.onehit || DEV.gensOff || DEV.bot || DEV.timeScale !== 1 || DEV.touched;
const isHost = () => !W || !W.net || W.net.host;

// ---------- narrator ----------
const SAY_PRI = { crit: 3, event: 2, tip: 1 };
function say(key, o = {}) {
  if (!W || (W.net && !W.net.host)) return;
  const raw = LINES[key]; if (!raw) return;
  const pri = o.pri || (/^(fall|low|shot|tithe|over|boss|bell)/.test(key) ? 'crit' : /^hint|^stun|^gnasher|^ghost|^lobber|^imp|^fryar|^snatcher|^force|^rune/.test(key) ? 'tip' : 'event');
  if (pri === 'tip' && (!OPT.tips || W.attract)) return;
  const seenKey = 'gd-tip-' + key;
  if (pri === 'tip' && !o.again) { if (RUN.tipsSeen && RUN.tipsSeen[key]) return; RUN.tipsSeen = RUN.tipsSeen || {}; RUN.tipsSeen[key] = 1; }
  void seenKey;
  const cd = o.cd === undefined ? 4 : o.cd, lk = key + (o.hero ? o.hero.slot : '');
  if (W.lastSay[lk] !== undefined && W.time - W.lastSay[lk] < cd && !o.force) return;
  W.lastSay[lk] = W.time;
  const text = (Array.isArray(raw) ? pick(raw) : raw).replace(/\{n\}/g, o.hero ? o.hero.name : 'SOMEONE').replace(/\{i\}/g, o.item || 'LOOT');
  W.queue.push({ text, pri: SAY_PRI[pri], t: W.time });
  if (W.net && W.net.host && W.net.onSay) W.net.onSay(key, o.hero ? o.hero.slot : -1, text);
}
function narratorStep(dt) {
  const S = W.speech;
  if (S.length) { const c = S[0]; c.life -= dt; if (c.life <= 0) S.shift(); }
  if (!W.queue.length) return;
  W.queue.sort((a, b) => b.pri - a.pri || a.t - b.t);
  const cur = S[0];
  if (cur && cur.pri >= W.queue[0].pri) return;
  if (cur && cur.age < 1.2 && cur.pri >= 2) return;
  const q = W.queue.shift(); W.queue.length = Math.min(W.queue.length, 3);
  showCaption(q.text, q.pri);
}
function showCaption(text, pri) {
  if (W.speech.length && W.speech[0].text === text) return;
  W.speech.unshift({ text, pri, life: 3.2 + text.length * .03, age: 0 });
  if (W.speech.length > 1) W.speech.length = 1;
  if (!W.attract || true) Voice.gaunt(text);
}

// ---------- effects helpers ----------
const sfx = (n, o) => { if (game && !(W && W.net && W.net.server)) game.audio.sfx(n, o); };
function ftext(x, y, str, col = '#fff') { W.texts.push({ x, y, z: 20, str, col, t: 0, life: 1 }); }
function puff(x, y, z, n = 6, col) { game.particles.dust(x, y, z, n, { color: col || '#bbb', speed: 22 }); }

// ---------- hero hurt / fall / rise ----------
function hurtHero(h, dmg, from, o = {}) {
  if (h.down || h.gone || dmg <= 0) return false;
  if (DEV.god || h.tele > 0 || (h.amulet === 'ironskin' && h.amuletT > 0) || h.invuln > 0) return false;
  if (!o.force && h.grace > 0 && o.src && o.src === h.lastSrc) return false;
  h.lastSrc = o.src || null; h.grace = o.src ? .25 : 0;
  const d = dmg * h.C.armor * DIFF[OPT.difficulty].dmg * (h.specials.ironbrew ? .8 : 1);
  h.hp -= d; h.flash = .18; h.hurtT = .25; h.hurtRaw = (h.hurtRaw || 0) + d;
  if (from) { const a = Math.atan2(h.y - from.y, h.x - from.x); h.push(Math.cos(a) * 60, Math.sin(a) * 60); }
  sfx('hurt', { pitch: 1 - h.slot * .08 });
  if (h.hp <= 0) heroFall(h);
  return true;
}
function heroFall(h) {
  h.hp = 0; h.down = true; h.downT = 0; h.flasks = Math.min(h.flasks, 0); h.keys = 0; h.amulet = null; h.amuletT = 0; h.stairT = 0;
  say('fall', { hero: h, force: true, cd: 0 });
  sfx('die'); game.particles.dust(h.x, h.y, 6, 8, { color: '#ccd' });
  if (W.menuHero === h) W.menuHero = null;
  if (W.net && W.net.host) { W.net.event && W.net.event(['hurt', h.slot, 0]); h.riseIn = 5; }
}
function heroRise(h, near) {
  h.down = false; h.hp = RUN.mode === 'net' ? 350 : Math.round(TUNE.startHealth * DIFF[OPT.difficulty].hp); h.flasks = Math.max(h.flasks, 0); h.invuln = 1.2; h.rig.dieT = 0; h.rig.downW = 0;
  if (RUN.mode === 'net') h.score = Math.max(0, h.score - 250);
  if (near) { h.x = near.x + 10; h.y = near.y; }
  RUN.continues++; h.contUsed = (h.contUsed || 0) + 1;
  say('rise', { hero: h, force: true, cd: 0 }); sfx('rise');
  game.particles.glints(h.x, h.y, 8, 10, '#fff6c0', 12);
}

// ---------- monsters hurt / die ----------
function damageMon(m, dmg, by, o = {}) {
  if (m.dead || m.dying > 0) return false;
  if (m.T.immune) { sfx('clink'); return false; }
  if (m.ch === 'y' && m.vis <= 0) return false;
  if (m.isBoss && m.state === 'sleep') return false;
  if (DEV.onehit) dmg = 9999;
  const rk0 = m.rank;
  m.hp -= dmg; m.flash = .12;
  if (by) { by.damageDone = (by.damageDone || 0) + dmg; if (m.isBoss) by.bossDmg += dmg; }
  if (o.knock) { const a = Math.atan2(m.y - o.knock.y, m.x - o.knock.x); if (!m.isBoss) m.push(Math.cos(a) * (o.kb || 40), Math.sin(a) * (o.kb || 40)); }
  if (m.isBoss) { ftext(m.x, m.y, String(Math.ceil(dmg)), '#ffd860'); bossPhaseCheck(m); }
  if (m.hp <= 0) { killMon(m, by); return true; }
  const rk = Math.ceil(m.hp / (m.maxhp / m.rank0));
  if (!m.isBoss && rk < rk0) { m.rank = rk; m.rigD = monRig(m.ch, rk); puff(m.x, m.y, 6, 6, '#ffeecc'); sfx('shrink'); }
  return true;
}
function killMon(m, by) {
  if (m.dead) return; m.dead = true; m.dying = .01;
  if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1);
  if (by && m.ch !== 'g') {
    by.score += m.T.pts * m.spawnRank; by.kills++; W.killsTotal++;
    if (m.ch === 't') { by.score += 0; }
  } else if (by) { by.score += m.T.pts * m.spawnRank; by.kills++; W.killsTotal++; }
  if (m.T.pts && by && by.score !== undefined && !m.isBoss) ftext(m.x, m.y, '+' + m.T.pts * m.spawnRank, '#ffe080');
  if (m.stolen && !m.escapedWith) { dropItem(m.stolen.kind, m.x, m.y, m.stolen.sub); m.stolen = null; }
  switch (m.ch) {
    case 'g': game.particles.smoke(m.x, m.y, 8, 4, { color: '#dde' }); sfx('wail', { vol: .6 }); break;
    case 'i': game.particles.explosion(m.x, m.y, 6, .5); break;
    case 'y': game.particles.smoke(m.x, m.y, 6, 6, { dark: true }); sfx('pop'); break;
    case 't': game.particles.sparks(m.x, m.y, 10, 14, null, { color: '#e8e0d0' }); say('titheDead', { force: true }); sfx('boom'); W.tithe = null; break;
    case 'K': bossDie(m); break;
    default: sfx('squish', { vol: .7 }); game.particles.dust(m.x, m.y, 5, 4, { color: '#8a6' });
  }
  m.rigD.rig.dieT = 0;
}
function dropItem(kind, x, y, sub) { W.items.push({ kind, x, y, z: 0, id: W.items.length + 1000 + Math.floor(Math.random() * 1e6), t: 0, gone: false, sub, fresh: 1 }); }

function damageGen(g, dmg, by) {
  if (g.dead) return; if (DEV.onehit) dmg = 9999;
  g.hp -= dmg; g.flash = .12; sfx('clunk', { vol: .6, pitch: 1 + g.rank * .1 });
  if (by && g.hp > 0) ftext(g.x, g.y, String(Math.ceil(dmg)), '#ffe080');
  if (g.hp <= 0) {
    g.dead = true; if (by) { by.score += 25 * g.rank0; by.gensKilled++; ftext(g.x, g.y, '+' + 25 * g.rank0, '#ffe080'); }
    game.particles.explosion(g.x, g.y, 6, .8, { debris: ['#8a7a66', '#6a5a46'] }); game.shake(2); sfx('crumble');
    say('gen', {}); if (Math.random() < .1) dropItem('loaf', g.x, g.y);
    W.net && W.net.event && W.net.event(['gen', g.id]);
  } else {
    const rk = Math.ceil(g.hp / (g.maxhp / g.rank0)); if (rk < g.rank) { g.rank = rk; puff(g.x, g.y, 6, 6, '#cba'); }
  }
}

// ---------- shots ----------
function fireShot(h) {
  const C = h.C, a = Math.atan2(h.aim[1], h.aim[0]), sp = C.shotSpeed * (h.specials.quickshot ? 1.2 : 1);
  const dmg = (C.shotDmg + (h.specials.hardshot ? 1 : 0) + (h.amulet === 'rending' && h.amuletT > 0 ? 1 : 0)) * TUNE.shotDamage;
  W.shots.push({ x: h.x + Math.cos(a) * 8, y: h.y + Math.sin(a) * 8, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 220 / sp, dmg, owner: h, kind: C.shot, pierce: (C.pierce || 0) + (h.amulet === 'rending' && h.amuletT > 0 ? 99 : 0), bounce: h.amulet === 'ricochet' && h.amuletT > 0 ? 3 : 0, splash: !!C.splash, a, hit: new Set(), spin: 0 });
  h.cd = C.cd / (TUNE.shotRate * (h.specials.quickshot ? 1.33 : 1)); h.kick = .08; h.shotsFired++;
  sfx('shot_' + C.shot, { vol: .5, vary: .1 });
  if (W.net && !W.net.host) return;
}
function shotWall(s, cx, cy) {
  const t = W.map.cell(cx, cy);
  if (t === 3) { const cr = W.cracked.find(c => c.x === cx && c.y === cy); if (cr) { cr.hp -= s.dmg; game.particles.dust((cx + .5) * TS, (cy + .5) * TS, 10, 3, { color: '#998' }); sfx('clunk'); if (cr.hp <= 0) breakCrack(cr); } }
}
function breakCrack(cr) {
  W.map.set(cr.x, cr.y, 0); W.cracked = W.cracked.filter(c => c !== cr); W.rubble.push({ x: (cr.x + .5) * TS, y: (cr.y + .5) * TS });
  game.particles.explosion((cr.x + .5) * TS, (cr.y + .5) * TS, 6, .6, { debris: ['#8a7a66'] }); sfx('crumble'); say('crack', {});
  W.net && W.net.event && W.net.event(['wall', cr.x, cr.y]);
}
function shotsStep(dt) {
  const H = W.grid;
  for (const s of W.shots) {
    if (s.dead) continue;
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, cx = Math.floor(nx / TS), cy = Math.floor(ny / TS);
    if (W.map.solidCell(cx, cy) && W.map.heightAt(nx, ny) > s.z) {
      if (W.map.cell(cx, cy) !== 7) {   // the low table: shots fly over
        shotWall(s, cx, cy);
        if (s.bounce > 0) { s.bounce--; if (!W.map.solidCell(Math.floor(s.x / TS), cy) ) s.vy *= -1; else if (!W.map.solidCell(cx, Math.floor(s.y / TS))) s.vx *= -1; else { s.vx *= -1; s.vy *= -1; } s.a = Math.atan2(s.vy, s.vx); sfx('clink', { vol: .3 }); game.particles.sparks(s.x, s.y, 12, 3, null, { color: '#9ef' }); continue; }
        s.dead = true; game.particles.sparks(s.x, s.y, 12, 3, null, { color: '#ffd' }); continue;
      }
    }
    s.x = nx; s.y = ny; s.life -= dt; s.spin += dt * 14; if (s.life <= 0) { s.dead = true; continue; }
    // monsters
    H.near(s.x, s.y, 14, m => {
      if (s.dead || m.dead || s.hit.has(m.id) || m.dying > 0 || m.emerge > 0) return;
      if (Math.hypot(m.x - s.x, m.y - s.y) > m.r + 3) return;
      if (m.ch === 'y' && m.vis <= 0) return;
      if (m.T.immune) { s.dead = true; sfx('clink'); game.particles.sparks(s.x, s.y, 12, 4, null, { color: '#fff' }); return; }
      s.hit.add(m.id);
      damageMon(m, s.dmg, s.owner, { knock: s, kb: 30 });
      game.hitFx(s.x, s.y, 12, { power: .4, angle: s.a, sound: false, rumble: false });
      if (s.splash) for (const o of W.mons) if (o !== m && !o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 12) damageMon(o, 1, s.owner, {});
      if (s.pierce > 0) s.pierce--; else s.dead = true;
    });
    if (s.dead) continue;
    for (const g of W.gens) if (!g.dead && Math.hypot(g.x - s.x, g.y - s.y) < g.r + 3) { damageGen(g, s.dmg, s.owner); game.particles.sparks(s.x, s.y, 12, 3); s.dead = true; break; }
    if (s.dead) continue;
    for (const it of W.items) if (!it.gone && SHOOTABLE[it.kind] && Math.hypot(it.x - s.x, it.y - s.y) < 6) { shootItem(it, s.owner); s.dead = true; break; }
    if (s.dead) continue;
    if (W.allyStun) for (const o of W.heroes) if (o !== s.owner && !o.down && Math.hypot(o.x - s.x, o.y - s.y) < o.r + 3 && o.invuln <= 0) { o.stun = .35; o.flash = .12; s.dead = true; sfx('clink'); break; }
  }
  W.shots = W.shots.filter(s => !s.dead);
}
const SHOOTABLE = { cider: 1, stew: 1, flask: 1, platter: 1 };
function shootItem(it, by) {
  it.gone = true; W.net && W.net.event && W.net.event(['gone', it.id, by ? by.slot : -1]);
  if (it.kind === 'stew') { say('shotstew', { hero: by, force: true }); ftext(it.x, it.y, 'SPLAT', '#8c8'); puff(it.x, it.y, 6, 6, '#7a8'); return; }
  if (it.kind === 'flask') { flaskBlast(by, it.x, it.y, .5, true); return; }
  if (by) { by.shotFood++; say('shotfood', { hero: by, force: true, cd: 3 }); }
  puff(it.x, it.y, 6, 8, '#fa8'); sfx('splat');
}

// ---------- magic ----------
function visibleBox(h) {
  if (W.net && !W.net.host && h.view) return { x0: h.x - h.view[0] * TS, x1: h.x + h.view[0] * TS, y0: h.y - h.view[1] * TS, y1: h.y + h.view[1] * TS };
  const b = game.screenGround && game.screenGround();
  if (b) return b;
  return { x0: h.x - 14 * TS, x1: h.x + 14 * TS, y0: h.y - 9 * TS, y1: h.y + 9 * TS };
}
function useFlask(h) {
  if (h.down || h.stun > 0) return false;
  if (h.flasks <= 0 && !DEV.infinite) return false;
  if (!DEV.infinite) h.flasks--;
  flaskBlast(h, h.x, h.y, 1, false, visibleBox(h));
  h.rig.poseHold = .4; h.castT = .45;
  say('flask', { hero: h, cd: 8 });
  return true;
}
function flaskBlast(h, x, y, power, shot, box) {
  const C = h ? h.C : CLASSES[3], mp = (h ? C.mpow : 1) * power * TUNE.magicPower * (h && h.specials.witchwater ? 1.5 : 1), gp = (h ? C.mgen : 1) * power * TUNE.magicPower;
  const b = box || { x0: x - 80, x1: x + 80, y0: y - 80, y1: y + 80 };
  W.rings = W.rings || []; W.rings.push({ x, y, t: 0, big: !shot });
  game.flash(shot ? '#ffd8a0' : '#ffffff', shot ? .25 : .5); game.shake(shot ? 3 : 6); sfx(shot ? 'boomS' : 'magic');
  for (const m of W.mons) {
    if (m.dead || m.x < b.x0 || m.x > b.x1 || m.y < b.y0 || m.y > b.y1) continue;
    if (m.ch === 't') { if (!shot || true) { m.hp = 0; killMon(m, h); } continue; }
    if (m.isBoss) { damageMon(m, Math.ceil(4 * mp), h, {}); continue; }
    damageMon(m, Math.ceil(4 * mp), h, { knock: { x, y }, kb: 80 });
  }
  for (const g of W.gens) if (!g.dead && g.x >= b.x0 && g.x <= b.x1 && g.y >= b.y0 && g.y <= b.y1) damageGen(g, Math.ceil(2 * gp), h);
  for (const f of W.foe) if (f.x >= b.x0 && f.x <= b.x1 && f.y >= b.y0 && f.y <= b.y1) f.dead = true;
  if (W.net && W.net.host) W.net.event && W.net.event(['magic', h ? h.slot : -1, Math.round(x), Math.round(y)]);
}

// ---------- items ----------
const FOOD_POINTS = { roast: 10, loaf: 5, cider: 10, platter: 20 };
function pickup(h, it) {
  const lim = heroLimit(h);
  switch (it.kind) {
    case 'key': if (h.keys >= lim) return false; h.keys++; say('key', { hero: h }); sfx('key'); break;
    case 'flask': if (h.flasks >= lim) return false; h.flasks++; sfx('pickup'); break;
    case 'roast': case 'cider': h.hp += TUNE.foodHeal; h.score += 10; h.food++; say('food', { hero: h, cd: 12 }); sfx('chomp'); ftext(h.x, h.y, '+' + TUNE.foodHeal, '#8f8'); h.rig.kick(.3); break;
    case 'loaf': h.hp += TUNE.foodHeal / 2; h.score += 5; h.food++; sfx('chomp'); ftext(h.x, h.y, '+' + Math.round(TUNE.foodHeal / 2), '#8f8'); break;
    case 'platter': h.hp += TUNE.foodHeal * 2; h.score += 20; h.food++; sfx('chomp'); ftext(h.x, h.y, '+' + TUNE.foodHeal * 2, '#8f8'); break;
    case 'stew': h.hp -= 50; h.queasy = 4; say('stew', { hero: h, cd: 10 }); sfx('gag'); ftext(h.x, h.y, '-50', '#f88'); if (h.hp <= 0) heroFall(h); break;
    case 'potion': if (h.specials[it.sub]) return false; h.specials[it.sub] = true; h.score += 250; ftext(h.x, h.y, SPECIAL_NAMES[it.sub], SPECIAL_COL[it.sub]); sfx('power'); break;
    case 'amulet': h.amulet = it.sub; h.amuletT = 20; h.score += 100; ftext(h.x, h.y, AMULET_NAMES[it.sub], AMULET_COL[it.sub]); sfx('power'); break;
    case 'gold': h.score += 100; h.treasure++; sfx('coin'); break;
    case 'gem': h.score += 250; h.treasure++; sfx('gem'); break;
    case 'crown': h.score += 2500; h.treasure++; say('crown', { hero: h }); sfx('gem'); break;
    case 'chest': h.score += 500; h.treasure++; it.opened = true; sfx('chest'); game.particles.glints(it.x, it.y, 8, 10); say('chest', { hero: h, cd: 20 }); break;
    case 'lchest': if (h.keys < 1) return false; h.keys--; h.score += 1000; h.treasure++; sfx('chest'); { const d = pick(['flask', 'roast', 'key']); dropItem(d, it.x + 8, it.y + 6); } game.particles.glints(it.x, it.y, 8, 12); break;
  }
  if (['gold', 'gem', 'crown', 'chest', 'lchest'].includes(it.kind)) { game.particles.glints(it.x, it.y, 8, 6); if (W.hoard.on) { W.hoard.left--; if (W.hoard.left <= 0) { h.score += 2000; say('hoardAll', { force: true }); } } }
  it.gone = true; W.net && W.net.event && W.net.event(['gone', it.id, h.slot]);
  return true;
}
function itemsStep(h) {
  for (const it of W.items) {
    if (it.gone) continue;
    const reach = it.kind === 'platter' ? 15 : h.r + 6;
    if (Math.hypot(it.x - h.x, it.y - h.y) < reach) { if (W.net && !W.net.host) continue; pickup(h, it); }
  }
}

// ---------- doors, plates, pads, runes, spikes, beams ----------
function openDoorGroup(d, by) {
  if (d.open) return; d.open = 1; d.t = 0;
  for (const c of d.cells) { W.map.set(c.x, c.y, 0); }
  sfx('door'); say('door', { hero: by }); W.net && W.net.event && W.net.event(['door', W.doors.indexOf(d)]);
}
function featuresStep(dt) {
  const T = W.time;
  for (const d of W.doors) if (d.open) d.t += dt;
  for (const h of W.heroes) {
    if (h.down) continue;
    if (!d_doorsOpenAllowed()) continue;
    // doors
    if (h.keys > 0 || DEV.infinite) for (const d of W.doors) if (!d.open) for (const c of d.cells) {
      if (Math.hypot((c.x + .5) * TS - h.x, (c.y + .5) * TS - h.y) < TS * .5 + h.r + 3) {
        if (!(W.net && !W.net.host)) { if (!DEV.infinite) h.keys--; openDoorGroup(d, h); }
        break;
      }
    }
    // plates
    for (const p of W.plates) if (!p.hit && Math.hypot(p.x - h.x, p.y - h.y) < 8) {
      p.hit = true; for (const q of W.plates) if (q.kind === p.kind) q.hit = true;
      for (const t of W.trapWalls[p.kind]) { W.map.set(t.x, t.y, 0); game.particles.explosion((t.x + .5) * TS, (t.y + .5) * TS, 6, .5, { debris: ['#8a7a66'] }); }
      game.shake(3); sfx('rumble'); say('trap', { hero: h }); W.net && W.net.event && W.net.event(['trap', p.kind]);
      if (p.kind === 'Y') for (const m of W.mons) m.cool = .2;
    }
    // transporters
    for (const p of W.pads) if (p.pair && p.cd <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < 7 && h.tele <= 0) {
      p.cd = p.pair.cd = .8; h.x = p.pair.x; h.y = p.pair.y; h.tele = .5; sfx('tele'); game.particles.glints(p.x, p.y, 6, 8, '#a8f'); game.particles.glints(h.x, h.y, 6, 8, '#a8f'); say('teleport', { hero: h, cd: 20 });
    }
    // runes
    if (h.runeImmune <= 0) for (const r of W.runes) if (Math.hypot(r.x - h.x, r.y - h.y) < 7) { h.stun = .8; h.runeImmune = 2.3; sfx('zap'); game.particles.sparks(h.x, h.y, 6, 8, null, { color: '#fe8' }); say('rune', { hero: h, cd: 30 }); break; }
    // spikes
    for (const s of W.spikes) { const ph = (T + s.ph) % 1.6; if (ph < .5 && Math.abs(s.x - h.x) < 8 && Math.abs(s.y - h.y) < 8 && (h.spikeAt !== Math.floor((T + s.ph) / 1.6) + s.ph)) { h.spikeAt = Math.floor((T + s.ph) / 1.6) + s.ph; hurtHero(h, 15, s, { force: true }); } }
    // beams
    for (const b of W.beams) { if (!beamOn(b)) continue; if (Math.abs(b.x - h.x) < 9 + h.r * .3 && Math.abs(b.y - h.y) < 9 + h.r * .3) { if (!h.beamCd || h.beamCd <= 0) { h.beamCd = .6; hurtHero(h, 12, b, { force: true }); h.push((h.x - b.x) * 12, (h.y - b.y) * 12); sfx('zap'); } } }
    // fake walls
    for (const f of W.fakes) if (!f.found && Math.abs((f.x + .5) * TS - h.x) < 10 && Math.abs((f.y + .5) * TS - h.y) < 10) { f.found = 1; if (!W.secretFound) { W.secretFound = true; say('fake', { hero: h }); } sfx('secret'); game.particles.glints((f.x + .5) * TS, (f.y + .5) * TS, 8, 8); }
    if (h.beamCd > 0) h.beamCd -= dt;
  }
  for (const p of W.pads) if (p.cd > 0) p.cd -= dt;
  for (const m of W.mons) { if (m.dead || m.ch === 'g') continue; if (m.T.immune) continue; for (const b of W.beams) if (beamOn(b) && Math.abs(b.x - m.x) < 9 && Math.abs(b.y - m.y) < 9 && (!m.beamCd || m.beamCd <= 0)) { m.beamCd = .6; damageMon(m, 2, null, { knock: b, kb: 120 }); } if (m.beamCd > 0) m.beamCd -= dt; }
}
const d_doorsOpenAllowed = () => true;
function beamOn(b) { const ph = (W.time + b.ph) % 4; return ph >= 2 || (ph >= 1.6 && Math.floor(W.time * 20) % 2 === 0); }

/* ---- 22-monsters.js ---- */
/* Monsters, generators, enemy shots, the Tithe, the Dinner Bell, King Famish. */
const monSpeed = m => m.T.spd[m.rank - 1] * TUNE.monsterSpeed * (m.state === 'rush' ? 1.25 : 1);
const monDmg = m => (m.T.dmg[m.rank - 1] || 0) * TUNE.monsterDamage * (RUN.descent2 ? 1.1 : 1);
const unveiled = (h, m) => !(h.amulet === 'veil' && h.amuletT > 0) || Math.hypot(h.x - m.x, h.y - m.y) < 16;

function nearestHero(m, onlyVisible) {
  let best = null, bd = 1e9;
  if (W.menuHero && !W.menuHero.down && W.menuHero.bell > 0) return W.menuHero;
  for (const h of W.heroes) { if (h.down || h.gone) continue; if (!unveiled(h, m)) continue; const d = Math.hypot(h.x - m.x, h.y - m.y); if (d < bd) { bd = d; best = h; } }
  return best;
}
function steerTo(m, tx, ty, flow, dt, spd, direct) {
  let dx, dy;
  const d = Math.hypot(tx - m.x, ty - m.y);
  if (direct || (d < 7 * TS && W.map.los(m.x, m.y, tx, ty))) { dx = (tx - m.x) / (d || 1); dy = (ty - m.y) / (d || 1); }
  else { const v = flow.dir(m.x, m.y); if (v) { dx = v[0]; dy = v[1]; } else { dx = (tx - m.x) / (d || 1); dy = (ty - m.y) / (d || 1); } }
  m.vx += (dx * spd - m.vx) * Math.min(1, dt * 10); m.vy += (dy * spd - m.vy) * Math.min(1, dt * 10);
  if (Math.abs(dx) + Math.abs(dy) > .01) m.facing = Math.atan2(dy, dx);
}

function monStep(m, dt) {
  if (m.dead) { m.dying += dt; return; }
  m.flash = Math.max(0, m.flash - dt);
  if (m.emerge > 0) { m.emerge -= dt; m.alpha = 1 - m.emerge / .4; return; }
  m.alpha = 1; m.t += dt; m.cool -= dt;
  if (DEV.freeze) { m.vx = m.vy = 0; return; }
  if (m.stun > 0) { m.stun -= dt; m.vx *= .8; m.vy *= .8; m.update(dt, W.map); return; }
  if (m.isBoss) return bossStep(m, dt);
  const hs = W.heroes.filter(h => !h.down && !h.gone);
  if (!hs.length) { m.vx *= .9; m.vy *= .9; return; }
  const tgt = nearestHero(m);
  let near = 1e9; for (const h of hs) near = Math.min(near, Math.hypot(h.x - m.x, h.y - m.y));
  if (near > 20 * TS && m.ch !== 't') { m.vx = m.vy = 0; return; }
  const fl = W.menuHero && W.menuHero.bell > 0 ? W.bellFlow : W.flow;
  const spd = monSpeed(m);
  // stench: flee
  for (const h of hs) if (h.amulet === 'stench' && h.amuletT > 0 && Math.hypot(h.x - m.x, h.y - m.y) < 64 && m.ch !== 't') {
    const a = Math.atan2(m.y - h.y, m.x - h.x); m.vx = Math.cos(a) * spd; m.vy = Math.sin(a) * spd; m.facing = a + Math.PI; m.update(dt, W.map); return;
  }
  if (!tgt) { m.vx *= .9; m.vy *= .9; return; }
  const td = Math.hypot(tgt.x - m.x, tgt.y - m.y), ang = Math.atan2(tgt.y - m.y, tgt.x - m.x);
  switch (m.ch) {
    case 'g': {
      steerTo(m, tgt.x, tgt.y, fl, dt, spd); m.z = 4 + Math.sin(m.t * 4) * 1.5;
      if (td < m.r + tgt.r + 1) { if (hurtHero(tgt, monDmg(m), m, { src: m, force: true })) { m.hp = 0; m.dead = true; m.dying = .01; if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1); game.particles.smoke(m.x, m.y, 8, 4, { color: '#dde' }); sfx('wail', { vol: .4 }); } }
      break;
    }
    case 'n': case 'y': {
      if (m.ch === 'y') {
        m.vis -= dt;
        if (m.vis <= -1.4) { m.vis = 2; const v = fl.dir(m.x, m.y); if (v) { const k = Math.min(48, td - 14); if (k > 0) { const nx = m.x + v[0] * k, ny = m.y + v[1] * k; if (!W.map.solidAt(nx, ny)) { m.x = nx; m.y = ny; } } } game.particles.smoke(m.x, m.y, 6, 4, { dark: true }); }
        m.alpha = m.vis > 0 ? 1 : .0;
      }
      if (m.tell > 0) { m.tell -= dt; m.vx *= .7; m.vy *= .7; m.facing = ang; if (m.tell <= 0) { m.swingActive = .12; } }
      else if (m.swingActive > 0) {
        m.swingActive -= dt; const reach = 14 + tgt.r;
        if (td < reach + 4 && !m.hitDone) { m.hitDone = true; hurtHero(tgt, monDmg(m), m, { src: m }); sfx('thud'); }
      } else {
        m.hitDone = false; steerTo(m, tgt.x, tgt.y, fl, dt, spd);
        if (td < 12 + tgt.r && m.cool <= 0) { m.tell = m.ch === 'y' ? .3 : .32; m.cool = .9; m.swing.start(); m.swing.t = 0; }
      }
      m.swing.update(dt);
      break;
    }
    case 'o': {
      const keep = td > 110 ? 1 : td < 56 ? -1.3 : 0;
      if (keep > 0) steerTo(m, tgt.x, tgt.y, fl, dt, spd);
      else if (keep < 0) { m.vx += (-Math.cos(ang) * spd * 1.3 - m.vx) * Math.min(1, dt * 8); m.vy += (-Math.sin(ang) * spd * 1.3 - m.vy) * Math.min(1, dt * 8); }
      else { m.vx *= .85; m.vy *= .85; }
      m.facing = ang;
      if (m.tell > 0) { m.tell -= dt; if (m.tell <= 0) lobPot(m, m.aimAt); }
      else if (m.cool <= 0 && td < 130 && td > 30) { m.tell = .6; m.cool = [2.2, 1.9, 1.6][m.rank - 1]; m.aimAt = { x: tgt.x + (tgt.vx || 0) * .6, y: tgt.y + (tgt.vy || 0) * .6 }; }
      break;
    }
    case 'i': {
      if (m.tell > 0) { m.tell -= dt; m.vx *= .8; m.vy *= .8; m.facing = ang; if (m.tell <= 0) fireball(m, tgt); }
      else {
        steerTo(m, tgt.x, tgt.y, fl, dt, spd); m.z = 6 + Math.sin(m.t * 5) * 1.2;
        if (td < 12 + tgt.r && m.cool <= 0) { m.cool = .9; hurtHero(tgt, monDmg(m), m, { src: m }); sfx('bite'); }
        else if (td > 30 && td < 160 && m.cool <= 0 && W.map.los(m.x, m.y, tgt.x, tgt.y)) { m.tell = .35; m.cool = 1.8; }
      }
      break;
    }
    case 'x': snatcherStep(m, dt, hs); break;
    case 't': titheStep(m, dt, hs); break;
  }
  m.update(dt, W.map);
}
function lobPot(m, at) {
  const T = Math.hypot(at.x - m.x, at.y - m.y) / 80 + .4;
  W.foe.push({ kind: 'pot', x: m.x, y: m.y, z: 10, sx: m.x, sy: m.y, tx: at.x, ty: at.y, t: 0, T, dmg: monDmg(m), from: m });
  sfx('lob');
}
function fireball(m, tgt) {
  const a = Math.atan2(tgt.y - m.y, tgt.x - m.x), sp = 110, d = (m.T.fire[m.rank - 1] || 8) * TUNE.monsterDamage;
  W.foe.push({ kind: 'fire', x: m.x + Math.cos(a) * 6, y: m.y + Math.sin(a) * 6, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2.4, dmg: d, from: m });
  sfx('fire');
}
function foeStep(dt) {
  for (const f of W.foe) {
    if (f.dead) continue;
    if (f.kind === 'pot') {
      f.t += dt; const u = Math.min(1, f.t / f.T); f.x = f.sx + (f.tx - f.sx) * u; f.y = f.sy + (f.ty - f.sy) * u; f.z = 6 + Math.sin(u * Math.PI) * 40;
      if (u >= 1) { f.dead = true; game.particles.dust(f.tx, f.ty, 3, 6, { color: '#c8a870' }); sfx('smash'); for (const h of W.heroes) if (!h.down && Math.hypot(h.x - f.tx, h.y - f.ty) < 13) hurtHero(h, f.dmg, { x: f.tx, y: f.ty }, { src: f }); for (const it of W.items) if (!it.gone && SHOOTABLE[it.kind] && Math.hypot(it.x - f.tx, it.y - f.ty) < 10) it.gone = true; }
      continue;
    }
    f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
    if (f.life <= 0 || (W.map.solidAt(f.x, f.y) && W.map.heightAt(f.x, f.y) > f.z)) { f.dead = true; game.particles.fire(f.x, f.y, 6, 3); continue; }
    for (const h of W.heroes) if (!h.down && Math.hypot(h.x - f.x, h.y - f.y) < h.r + 3) { hurtHero(h, f.dmg, f, { src: f }); f.dead = true; game.particles.fire(f.x, f.y, 6, 4); break; }
    if (!f.dead) for (const it of W.items) if (!it.gone && SHOOTABLE[it.kind] && Math.hypot(it.x - f.x, it.y - f.y) < 6) { it.gone = true; f.dead = true; puff(it.x, it.y, 6, 6, '#a64'); ftext(it.x, it.y, 'TOAST', '#fa6'); break; }
  }
  W.foe = W.foe.filter(f => !f.dead);
}
function snatcherStep(m, dt, hs) {
  if (m.stolen) {
    if (!m.fleeFlow) m.fleeFlow = new Flow(W.map);
    if (!m.escape) { const pts = (W.meta.points && W.meta.points.escape) || []; m.escape = pts.length ? pts[0] : (m.home || { x: m.x, y: m.y }); }
    m.fleeFlow.update([[Math.floor(m.escape.x / TS), Math.floor(m.escape.y / TS)]]);
    const v = m.fleeFlow.dir(m.x, m.y), sp = monSpeed(m) * 1.1; if (v) { m.vx = v[0] * sp; m.vy = v[1] * sp; m.facing = Math.atan2(v[1], v[0]); }
    if (Math.hypot(m.escape.x - m.x, m.escape.y - m.y) < 10) { m.escapedWith = true; m.dead = true; m.dying = .01; if (m.gen) m.gen.kids--; puff(m.x, m.y, 6, 8, '#223'); say('stolen', { force: true, item: m.stolen.kind.toUpperCase() }); }
    return;
  }
  const tgt = nearestHero(m); if (!tgt) return;
  steerTo(m, tgt.x, tgt.y, W.flow, dt, monSpeed(m));
  if (Math.hypot(tgt.x - m.x, tgt.y - m.y) < m.r + tgt.r + 1) {
    let item = null;
    if (tgt.flasks > 0) { tgt.flasks--; item = { kind: 'flask' }; } else if (tgt.keys > 0) { tgt.keys--; item = { kind: 'key' }; } else if (tgt.amulet) { item = { kind: 'amulet', sub: tgt.amulet }; tgt.amulet = null; tgt.amuletT = 0; }
    if (item) { m.stolen = item; if (!m.home) m.home = { x: m.x, y: m.y }; m.escape = (W.meta.points && W.meta.points.escape && W.meta.points.escape[0]) || m.home; sfx('steal'); say('stolen', { force: true, item: item.kind.toUpperCase() }); ftext(m.x, m.y, 'STOLEN!', '#f88'); }
    else { m.cool = 2; m.vx = -m.vx; }
  }
}
function titheStep(m, dt, hs) {
  const tgt = nearestHero(m); if (!tgt) return;
  steerTo(m, tgt.x, tgt.y, W.flow, dt, monSpeed(m), true);
  m.z = 6 + Math.sin(m.t * 3) * 2;
  let leave = true;
  for (const h of hs) {
    if (h.amulet === 'ironskin' && h.amuletT > 0) continue;
    if (Math.hypot(h.x - m.x, h.y - m.y) < m.r + h.r + 2) {
      m.drainT = (m.drainT || 0) + dt;
      const done = m.drained.get(h) || 0;
      if (done < 200) { while (m.drainT >= .1 && (m.drained.get(h) || 0) < 200) { m.drainT -= .1; h.hp -= 6; m.drained.set(h, (m.drained.get(h) || 0) + 6); h.flash = .1; if (h.hp <= 0 && !DEV.god) { heroFall(h); break; } } }
      if ((m.drained.get(h) || 0) >= 200) { m.dead = true; m.dying = .01; W.tithe = null; say('tithePaid', { force: true }); puff(m.x, m.y, 8, 10, '#a8c'); sfx('wail'); break; }
    }
  }
}

// ---------- generators ----------
function gensStep(dt) {
  const n = W.heroes.filter(h => !h.down).length || 1, cap = Math.min(Math.round(TUNE.maxMonsters * (1 + .3 * (n - 1))), W.net ? 100 : 999);
  const alive = W.mons.filter(m => !m.dead).length;
  for (const g of W.gens) {
    if (g.dead) continue; g.flash = Math.max(0, g.flash - dt); g.breathe += dt;
    if (DEV.gensOff) continue;
    g.t -= dt; if (g.t > 0) continue;
    const dist0 = Math.min(...W.heroes.filter(h => !h.down).map(h => Math.hypot(h.x - g.x, h.y - g.y)), 1e9);
    const iv = [3, 2.2, 1.5][g.rank - 1] * TUNE.spawnInterval / (1 + .25 * (n - 1));
    g.t = iv * rnd(.85, 1.15);
    if (dist0 > 15 * TS || g.kids >= 8 || alive >= cap) continue;
    const opts = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const cx = Math.floor(g.x / TS) + dx, cy = Math.floor(g.y / TS) + dy; if (W.map.walkable(cx, cy)) opts.push([(cx + .5) * TS, (cy + .5) * TS]); }
    if (!opts.length) continue;
    const [sx, sy] = pick(opts), m = newMonster(g.G.spawn, sx, sy, g.rank, { emerge: .4, home: { x: g.x, y: g.y } }); m.gen = g; g.kids++;
    W.mons.push(m); puff(sx, sy, 3, 3, '#a98');
  }
}

// ---------- the Dinner Bell ----------
function ringBell(h) {
  const b = W.bellObj; if (!b || b.rung) return; b.rung = true; b.t = 0;
  for (const o of W.heroes) o.bell = 0; h.bell = 12; W.menuHero = h; sfx('bell'); say('bell', { hero: h, force: true });
  W.bellFlow.update([[Math.floor(h.x / TS), Math.floor(h.y / TS)]]);
}
function bellStep(dt) {
  const b = W.bellObj; if (!b) return;
  if (b.rung) b.t += dt;
  if (!b.rung) for (const h of W.heroes) if (!h.down && Math.hypot(h.x - b.x, h.y - b.y) < 10) { ringBell(h); break; }
  const mh = W.menuHero;
  if (mh) {
    mh.bell -= dt;
    if (mh.bell <= 0 || mh.down) W.menuHero = null;
    else { for (const o of W.heroes) if (o !== mh && !o.down && Math.hypot(o.x - mh.x, o.y - mh.y) < 12) { mh.bell = 0; o.bell = 12; W.menuHero = o; sfx('bell'); } W.bellFlow.update([[Math.floor(W.menuHero ? W.menuHero.x / TS : 0), Math.floor(W.menuHero ? W.menuHero.y / TS : 0)]]); }
  }
}

// ---------- King Famish ----------
function bossPhaseCheck(m) {
  const f = m.hp / m.maxhp;
  if (m.phase === 1 && f < .66) { m.phase = 2; say('boss2', { force: true }); game.shake(6); sfx('roar'); m.stun = 1; }
  else if (m.phase === 2 && f < .33) { m.phase = 3; say('boss3', { force: true }); game.shake(6); sfx('roar'); W.fog = 1; m.stun = 1; }
}
function bossStep(m, dt) {
  const hs = W.heroes.filter(h => !h.down); if (!hs.length) return;
  if (m.state === 'sleep') { if (hs.some(h => Math.hypot(h.x - m.x, h.y - m.y) < 22 * TS || h.x > 12 * TS)) { m.state = 'idle'; m.cool = 1.5; say('boss', { force: true }); sfx('roar'); W.shake = 1; } return; }
  let tgt = hs[0], bd = 1e9; for (const h of hs) { const d = Math.hypot(h.x - m.x, h.y - m.y); if (d < bd) { bd = d; tgt = h; } }
  const ang = Math.atan2(tgt.y - m.y, tgt.x - m.x);
  m.facing = ang;
  if (m.chargeT > 0) { m.chargeT -= dt; m.vx = Math.cos(m.chargeA) * 130; m.vy = Math.sin(m.chargeA) * 130; for (const h of hs) if (Math.hypot(h.x - m.x, h.y - m.y) < m.r + h.r + 2 && !h.chargeHit) { h.chargeHit = 1; hurtHero(h, 14, m, { force: true }); h.push(Math.cos(m.chargeA) * 200, Math.sin(m.chargeA) * 200); } if (m.hitWall) m.chargeT = 0; if (m.chargeT <= 0) { m.stun = 1.2; for (const h of hs) h.chargeHit = 0; } m.update(dt, W.map); return; }
  if (m.tell > 0) {
    m.tell -= dt; m.vx *= .8; m.vy *= .8;
    if (m.tell <= 0) {
      switch (m.attack) {
        case 'plates': for (let k = -1; k <= 1; k++) { const a = ang + k * .35, d = Math.min(bd + 10, 150); W.foe.push({ kind: 'pot', x: m.x, y: m.y, z: 20, sx: m.x, sy: m.y, tx: m.x + Math.cos(a) * d, ty: m.y + Math.sin(a) * d, t: 0, T: d / 90 + .4, dmg: 12 * TUNE.monsterDamage, from: m }); } sfx('lob'); break;
        case 'stomp': W.rings = W.rings || []; W.rings.push({ x: m.x, y: m.y, t: 0, big: true, boss: true }); game.shake(8); sfx('boom'); for (const h of hs) if (Math.hypot(h.x - m.x, h.y - m.y) < 70) { hurtHero(h, 14 * TUNE.monsterDamage, m, { force: true }); h.stun = .5; } m.stun = .5; break;
        case 'charge': m.chargeT = 1.1; m.chargeA = ang; sfx('roar'); break;
        case 'eat': { let pl = null, pd = 1e9; for (const it of W.items) if (!it.gone && it.kind === 'platter') { const d = Math.hypot(it.x - m.x, it.y - m.y); if (d < pd) { pd = d; pl = it; } } if (pl) { pl.gone = true; m.hp = Math.min(m.maxhp, m.hp + 20); puff(pl.x, pl.y, 12, 8, '#fa8'); ftext(m.x, m.y, 'NOM +20', '#fa6'); sfx('chomp'); } m.stun = 1.5; break; }
      }
      m.cool = m.phase === 1 ? 2.2 : m.phase === 2 ? 1.7 : 1.3;
    }
    m.update(dt, W.map); return;
  }
  if (m.cool <= 0) {
    const opts = m.phase === 1 ? ['plates', 'stomp'] : m.phase === 2 ? ['plates', 'stomp', 'charge', 'eat'] : ['plates', 'stomp', 'charge', 'charge'];
    m.attack = pick(opts); if (m.attack === 'stomp' && bd > 80) m.attack = 'plates'; if (m.attack === 'eat' && !W.items.some(i => !i.gone && i.kind === 'platter')) m.attack = 'charge';
    m.tell = m.attack === 'charge' ? .9 : m.attack === 'stomp' ? .8 : m.attack === 'eat' ? .6 : 1; sfx('tell');
  } else { const v = W.flow.dir(m.x, m.y); const sp = 30 * TUNE.monsterSpeed; if (v && bd > 60) { m.vx = v[0] * sp; m.vy = v[1] * sp; } else { m.vx *= .9; m.vy *= .9; } }
  // tureens spill ghosts in phase 3 (generators do it); fog drains
  if (m.phase === 3) W.fog = Math.min(1, W.fog + dt * .5);
  m.update(dt, W.map);
}
function bossDie(m) {
  W.done = true; W.bossDown = true; say('bossDead', { force: true });
  game.particles.explosion(m.x, m.y, 10, 2); game.shake(10); game.flash('#fff', .8); sfx('bigboom');
  for (const h of W.heroes) h.score += h.bossDmg > 0 ? 1000 : 0;
  const top = W.heroes.slice().sort((a, b) => b.bossDmg - a.bossDmg)[0]; if (top) top.score += 10000;
  W.fog = 0; W.victoryT = 3;
  for (const g of W.gens) if (!g.dead) { g.dead = true; }
  for (const o of W.mons) if (o !== m && !o.dead) { o.dead = true; o.dying = .01; }
  W.stairs.length = 0;
}

/* ---- 23-heroes.js ---- */
/* Heroes: intents (pad, keys, mouse, bot, net), movement, firing, melee, the per-step sim, floor flow. */
function readIntent(h) {
  const I = h.input, it = h.int; if (!I) return;
  const m = I.move(), v = game.view.screenDirToGround(m[0], m[1]);
  it.mx = v[0]; it.my = v[1];
  // aim: right stick, then the mouse (player 1), else the way the hero faces
  let ax = 0, ay = 0, aimed = false;
  const pa = I.padAim;
  if (pa && Math.hypot(pa[0], pa[1]) > .3) { const g = game.view.screenDirToGround(pa[0], pa[1]); ax = g[0]; ay = g[1]; aimed = true; it.stickFire = OPT.stickFires && Math.hypot(pa[0], pa[1]) > .6; }
  else it.stickFire = false;
  if (!aimed && I.player === 1 && I.aimSource === 'mouse' && I.mouse && (I.clock - I.mouse.t < 3 || I.down('Mouse0'))) {
    const g = game.mouseGround && game.mouseGround();
    if (g) { const gx = g.x !== undefined ? g.x : g[0], gy = g.y !== undefined ? g.y : g[1]; if (gx !== undefined) { const d = Math.hypot(gx - h.x, gy - h.y); if (d > 3) { ax = (gx - h.x) / d; ay = (gy - h.y) / d; aimed = true; h.reticle = { x: gx, y: gy }; } } }
  } else h.reticle = null;
  if (!aimed) { const l = Math.hypot(it.mx, it.my); if (l > .2) { ax = it.mx / l; ay = it.my / l; } else { ax = Math.cos(h.facing); ay = Math.sin(h.facing); } }
  // aim assist
  const cone = OPT.aimAssist === 'High' ? .28 : OPT.aimAssist === 'Low' ? .14 : 0;
  if (cone && aimed !== 'none') {
    const a0 = Math.atan2(ay, ax); let best = null, bd = 200;
    for (const t of [...W.mons, ...W.gens]) { if (t.dead || (t.ch === 'y' && t.vis <= 0) || (t.T && t.T.immune)) continue; const d = Math.hypot(t.x - h.x, t.y - h.y); if (d > bd) continue; if (Math.abs(angDiff(Math.atan2(t.y - h.y, t.x - h.x), a0)) < cone) { best = t; bd = d; } }
    if (best) { const aa = Math.atan2(best.y - h.y, best.x - h.x); ax = Math.cos(aa); ay = Math.sin(aa); }
  }
  it.ax = ax; it.ay = ay;
  it.fire = I.down('fire') || it.stickFire;
  it.magic = I.pressed('magic'); it.plant = I.down('plant');
  it.rise = I.pressed('fire');
  it.aimed = aimed;
}
function intentFor(h) {
  if (W.net && !h.local) return;               // a remote hero's intent comes from the network
  if (h.bot) return botIntent(h);
  if (h.input) readIntent(h);
}

function heroStep(h, dt) {
  const it = h.int, C = h.C;
  h.flash = Math.max(0, h.flash - dt); h.grace = Math.max(0, h.grace - dt); h.cd = Math.max(0, h.cd - dt); h.stun = Math.max(0, h.stun - dt); h.queasy = Math.max(0, h.queasy - dt);
  h.runeImmune = Math.max(0, h.runeImmune - dt); h.tele = Math.max(0, h.tele - dt); h.invuln = Math.max(0, h.invuln - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.kick = Math.max(0, h.kick - dt); h.castT = Math.max(0, (h.castT || 0) - dt);
  if (h.amuletT > 0) { h.amuletT -= dt; if (h.amuletT <= 0) h.amulet = null; }
  h.lastX = h.x; h.lastY = h.y;
  if (h.down) {
    h.downT += dt; h.vx = h.vy = 0;
    h.rig.update(dt, { x: h.x, y: h.y, z: 0, vx: 0, vy: 0, facing: h.facing, pose: 'die' });
    if (!W.net && it.rise && h.downT > .6 && !W.attract) { const ally = W.heroes.find(o => !o.down && !o.gone); if (ally) heroRise(h, ally); }
    if (W.net && W.net.host && h.riseIn !== undefined) { h.riseIn -= dt; if (h.riseIn <= 0) { const ally = W.heroes.find(o => !o.down && !o.gone); if (ally) { heroRise(h, ally); h.riseIn = undefined; } } }
    return;
  }
  // life force
  if (!DEV.god && W.kind !== 'bossdone') {
    const dr = TUNE.drain * DIFF[OPT.difficulty].drain * (RUN.descent2 ? 1.5 : 1) * (W.fog > 0 ? 1 + 2 * W.fog : 1) * (W.attract ? 0 : 1);
    h.hp -= dr * dt; h.hunger = h.hp < 200 ? 1 - Math.max(0, h.hp) / 200 : 0;
    if (h.hp <= 0) { heroFall(h); return; }
    if (h.hp < 100 && h.lowSaid < 3) { h.lowSaid = 3; say('low100', { hero: h, force: true, cd: 20 }); } else if (h.hp < 200 && h.lowSaid < 2) { h.lowSaid = 2; say('low200', { hero: h, force: true, cd: 20 }); } else if (h.hp < 400 && h.lowSaid < 1) { h.lowSaid = 1; say('low400', { hero: h, cd: 20 }); }
    if (h.hp > 450) h.lowSaid = 0;
  }
  if (W.attract || h.bot) { if (h.hp < 300) h.hp = 300; }
  // movement
  const mag = Math.min(1, Math.hypot(it.mx, it.my)), planted = it.plant || (h.input && h.input.player === 1 && h.input.lastDevice === 'keyboard' && it.fire && !(h.input.aimSource === 'mouse') && false);
  const canMove = h.stun <= 0 && !(h.castT > 0 && h.castT > .3);
  const sp = heroSpeed(h);
  if (h.remote) { const tp = h.netp; if (tp) { const dx = tp.x - h.x, dy = tp.y - h.y, d = Math.hypot(dx, dy), max = sp * 2.5 * dt + 2; if (d > .01) { const k = Math.min(1, max / d); h.vx = dx * k / dt; h.vy = dy * k / dt; h.x += dx * k; h.y += dy * k; } else h.vx = h.vy = 0; } }
  else if (planted || !canMove) { h.vx *= .5; h.vy *= .5; if (planted && mag > .2) h.facing = Math.atan2(it.my, it.mx); }
  else { h.vx = it.mx * sp; h.vy = it.my * sp; if (mag > .2 && !(it.fire && it.aimed)) h.facing = Math.atan2(it.my, it.mx); }
  // melee / fire
  const aim = [it.ax, it.ay]; h.aim = aim;
  if (it.fire && h.stun <= 0 && (it.aimed || mag < .2 || true)) h.facing = Math.atan2(aim[1], aim[0]);
  let swinging = h.combo.busy;
  if (it.fire && h.stun <= 0 && !h.down) {
    const reach = h.r + 8 + 7; let near = null, nd = 1e9;
    for (const m of W.mons) { if (m.dead || m.ch === 'g' || m.T.immune || m.emerge > 0 || (m.ch === 'y' && m.vis <= 0)) continue; const d = Math.hypot(m.x - h.x, m.y - h.y) - m.r; if (d < reach && d < nd && Math.abs(angDiff(Math.atan2(m.y - h.y, m.x - h.x), h.facing)) < .87) { near = m; nd = d; } }
    let crack = null; if (!near) { const cx = Math.floor((h.x + Math.cos(h.facing) * 12) / TS), cy = Math.floor((h.y + Math.sin(h.facing) * 12) / TS); if (W.map.cell(cx, cy) === 3) crack = W.cracked.find(c => c.x === cx && c.y === cy); }
    if (near || crack) { if (!h.combo.busy && h.combo.press()) { h.swingHit = new Set(); sfx('swing'); } }
    else if (h.cd <= 0 && !swinging) fireShot(h);
    h.firing = !near;
    if (crack && h.combo.active && !h.crackHit) { h.crackHit = 1; crack.hp -= C.melee; game.particles.dust((crack.x + .5) * TS, (crack.y + .5) * TS, 10, 3, { color: '#998' }); sfx('clunk'); if (crack.hp <= 0) breakCrack(crack); }
    if (!h.combo.active) h.crackHit = 0;
  } else h.firing = false;
  h.combo.update(dt);
  if (h.combo.active) {
    const dm = C.melee * TUNE.shotDamage * (h.specials.ogreale ? 1.5 : 1) * (h.amulet === 'rending' && h.amuletT > 0 ? 1.3 : 1);
    h.combo.hits(W.mons, m => !m.dead && m.ch !== 'g' && m.emerge <= 0 && E.inArc(h, h.facing, m, 24 + m.r, 1.2), m => { if (m.T.immune) { sfx('clink'); return; } damageMon(m, dm, h, { knock: h, kb: 70 }); game.hitFx(m.x, m.y, 12, { power: .6, angle: h.facing, sound: false, rumble: false }); game.freeze(.04); sfx('hit', { vol: .6 }); });
    for (const g of W.gens) if (!g.dead && !h.swingHitG) { if (Math.hypot(g.x - h.x, g.y - h.y) < 24 + g.r && Math.abs(angDiff(Math.atan2(g.y - h.y, g.x - h.x), h.facing)) < 1.2) { h.swingHitG = 1; damageGen(g, dm, h); } }
  } else h.swingHitG = 0;
  // magic
  if (it.magic && !(h.pickT > 0)) useFlask(h);
  // move
  if (!h.remote && DEV.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else if (!h.remote) {
    h.update(dt, W.map);
    if (W.map.blocked && W.map.floorAt) { const fl = W.map.floorAt(h.x, h.y); if (fl === 'lava') { h.x = h.lastX; h.y = h.lastY; } }
  }
  // rig
  const spd = Math.hypot(h.vx, h.vy), pose = h.castT > 0 ? 'cast' : (C.id === 'hexer' && h.firing && it.fire) ? 'cast' : null;
  h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, attack: h.combo.state, hurt: h.hurtT > 0, point: h.firing && C.id !== 'hexer' && h.kick > 0 || (h.firing && it.fire && C.id === 'ranger'), pose, hunch: h.hunger * .5 + (C.id === 'hexer' ? .3 : 0) });
  void spd;
  itemsStep(h);
  // stairs
  stairCheck(h, dt);
  // the Bell timer is on the hero
  if (h.bell > 0 && !W.menuHero) h.bell = 0;
}

function stairCheck(h, dt) {
  let on = null;
  if (!W.done || W.kind !== 'boss') {
    for (const s of W.stairs) if (Math.hypot(s.x - h.x, s.y - h.y) < 11) on = { to: W.step + 1 };
    for (const s of W.skips) if (Math.hypot(s.x - h.x, s.y - h.y) < 11) { const to = PLAN.findIndex(p => p.no === s.to); if (to > W.step) on = { to, skip: true }; }
    if (W.wallStairs && !on && (h.hitWall || W.map.solidAt(h.x + Math.cos(h.facing) * 7, h.y + Math.sin(h.facing) * 7)) && Math.hypot(h.int.mx, h.int.my) > .3) on = { to: W.step + 1 };
  }
  if (on && !W.descend) { h.stairT += dt; h.stairTo = on; if (h.stairT >= TUNE.stairHold) { startDescend(h, on); } } else h.stairT = Math.max(0, h.stairT - dt * 3);
}
function startDescend(h, on) {
  if (W.descend || (W.net && !W.net.host)) return;
  const bonus = 500 + Math.max(0, Math.round(5 * (W.meta.par - W.time)));
  if (W.kind === 'floor' || W.kind === 'treasure' || true) { h.score += W.kind === 'treasure' ? 0 : bonus; }
  W.descend = { by: h, to: on.to, skip: !!on.skip, t: 0 };
  sfx('descend'); say(on.skip ? 'short' : 'stairs', { hero: h, force: true, cd: 0 });
  W.net && W.net.event && W.net.event(['stairs', h.slot, on.to]);
}

// ---------- the world step ----------
function rebuildFlow() {
  const srcs = W.heroes.filter(h => !h.down && !h.gone).map(h => [Math.floor(h.x / TS), Math.floor(h.y / TS)]);
  W.flow.update(srcs.length ? srcs : [[0, 0]]);
}
function separate(dt) {
  const grid = W.grid; grid.build(W.mons.filter(m => !m.dead && m.emerge <= 0));
  for (const m of W.mons) {
    if (m.dead || m.emerge > 0 || m.ch === 'K') continue;
    grid.near(m.x, m.y, m.r * 2 + 2, o => { if (o === m || o.dead) return; const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy) || .01, min = (m.r + o.r) * .9; if (d < min && (m.ch !== 'g' || o.ch === 'g')) { const p = (min - d) * .35; m.x += dx / d * p; m.y += dy / d * p; } });
    for (const g of W.gens) if (!g.dead) { const dx = m.x - g.x, dy = m.y - g.y, d = Math.hypot(dx, dy) || .01, min = m.r + g.r; if (d < min && !m.T.ghost) { m.x = g.x + dx / d * min; m.y = g.y + dy / d * min; } }
    if (!W.map.walkable(Math.floor(m.x / TS), Math.floor(m.y / TS)) && W.map.solidAt(m.x, m.y)) W.map.collide(m);
  }
  for (const h of W.heroes) {
    if (h.down) continue;
    for (const g of W.gens) if (!g.dead) { const dx = h.x - g.x, dy = h.y - g.y, d = Math.hypot(dx, dy) || .01, min = h.r + g.r; if (d < min) { h.x = g.x + dx / d * min; h.y = g.y + dy / d * min; } }
    grid.near(h.x, h.y, 16, m => { if (m.dead || m.ch === 'g' || m.ch === 't' || m.emerge > 0 || m.ch === 'K') return; const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy) || .01, min = h.r + m.r - 1; if (d < min) { const p = min - d; h.x += dx / d * p * .6; h.y += dy / d * p * .6; m.x -= dx / d * p * .4; m.y -= dy / d * p * .4; } });
    if (!DEV.noclip) W.map.collide(h);
  }
  // the king is a solid
  if (W.boss && !W.boss.dead) for (const h of W.heroes) if (!h.down) { const k = W.boss, dx = h.x - k.x, dy = h.y - k.y, d = Math.hypot(dx, dy) || .01, min = h.r + k.r; if (d < min) { h.x = k.x + dx / d * min; h.y = k.y + dy / d * min; } }
}

// the leash: no hero may stretch the party past the screen
function leash() {
  const L = W.heroes.filter(h => !h.down && !h.gone && h.local !== false);
  if (L.length < 2 || !game.view || !game.view.p || !game.screen || W.net) return;
  const Wd = game.r ? game.r.W : 427, Hd = game.r ? game.r.H : 240, mg = 56, z = game.zoom || 1;
  const box = () => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const h of L) { const p = game.view.p(h.x, h.y, 0); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return [(x1 - x0) * z, (y1 - y0) * z]; };
  let [bw, bh] = box();
  if (bw <= Wd - 2 * mg && bh <= Hd - 2 * mg - 40) return;
  for (const h of L) { if (h.lastX === undefined) continue; const nx = h.x, ny = h.y; h.x = h.lastX; h.y = h.lastY; const [w2, h2] = box(); if (w2 <= bw && h2 <= bh) { bw = w2; bh = h2; continue; } h.x = nx; h.y = ny; }
}

function simStep(dt) {
  if (!W) return;
  dt *= DEV.timeScale;
  W.time += dt; RUN.time += dt;
  for (const h of W.heroes) { if (!h.remote) intentFor(h); }
  for (const h of W.heroes) if (!h.gone && !(W.net && !W.net.host && !h.local)) heroStep(h, dt);
  if (W.net && !W.net.host) return;           // clients puppet the rest from snapshots
  rebuildFlowTick(dt);
  for (const m of W.mons) { m.tick = (m.tick || 0); monStep(m, dt); if (m.dead && m.dying > 1.2) m.remove = true; if (!m.dead && m.z !== undefined && m.ch !== 'g' && m.ch !== 'i' && m.ch !== 't') m.z = 0; }
  W.mons = W.mons.filter(m => !m.remove);
  separate(dt);
  gensStep(dt); shotsStep(dt); foeStep(dt); featuresStep(dt); bellStep(dt); floorRules(dt);
  for (const t of W.texts) { t.t += dt; t.z += 18 * dt; } W.texts = W.texts.filter(t => t.t < t.life);
  if (W.rings) { for (const r of W.rings) r.t += dt; W.rings = W.rings.filter(r => r.t < .8); }
  for (const b of W.bars) b.t += dt;
  narratorStep(dt);
  leash();
}
function rebuildFlowTick(dt) { W.flowTick -= dt; if (W.flowTick <= 0) { W.flowTick = .15; rebuildFlow(); } }

// ---------- floor rules: impatience, the Tithe, hoard clock, death and continue ----------
function floorRules(dt) {
  const T = W.time, imp = TUNE.impatience;
  if (W.kind === 'floor') {
    if (!W.imp1 && T > imp - 30) { W.imp1 = 1; say('patience', { force: true }); }
    if (!W.doorsOpen && T > imp) { W.doorsOpen = true; say('doorsOpen', { force: true }); for (const d of W.doors) openDoorGroup(d); }
    if (!W.wallStairs && T > imp + 60) { W.wallStairs = true; say('wallsOpen', { force: true }); sfx('rumble'); }
    const hasTithe = W.mons.some(m => m.ch === 't' && !m.dead);
    if ((W.meta.no >= 5 || RUN.descent2) && !W.titheSpawned && T > TUNE.titheAt && !hasTithe) spawnTithe();
    if (W.meta.tithe && !W.titheSpawned && T > TUNE.titheAt * .6) spawnTithe();
  }
  if (W.kind === 'treasure') {
    W.hoard.t -= dt; if (!W.hoardSaid) { W.hoardSaid = 1; say('hoard', { force: true }); }
    if (W.hoard.t <= 0 && !W.descend) { say('slam', { force: true }); sfx('slam'); const h = W.heroes.find(x => !x.down) || W.heroes[0]; W.descend = { by: h, to: W.step + 1, t: 0, slam: true }; W.net && W.net.event && W.net.event(['stairs', h.slot, W.step + 1]); }
  }
  if (W.kind === 'boss' && W.victoryT > 0) { W.victoryT -= dt; if (W.victoryT <= 0 && !W.descend) { const h = W.heroes.find(x => !x.down) || W.heroes[0]; W.descend = { by: h, to: -1, t: 0, ending: true }; W.net && W.net.event && W.net.event(['stairs', h.slot, -1]); } }
  // all down
  const alive = W.heroes.filter(h => !h.down && !h.gone).length;
  if (alive === 0 && W.heroes.length && !W.descend) {
    if (W.net) { if (W.net.host) W.net.allDown && W.net.allDown(); }
    else if (W.contT < 0) { W.contT = W.attract ? -1 : 10; W.contN = 10; if (W.attract) { for (const h of W.heroes) { h.down = false; h.hp = 500; } } else say('over', { force: true, cd: 0 }); }
  } else if (alive > 0) W.contT = -1;
  if (W.contT >= 0 && !W.net) {
    W.contT -= dt; W.contN = Math.ceil(W.contT);
    if (W.heroes.some(h => h.int.rise && h.downT > .5) || (game.input.pressed('start') && false)) { continueRun(); }
    else if (W.contT <= 0) { W.overT = 0; W.contT = -1; W.gameOver = true; }
  }
}
function continueRun() {
  W.contT = -1; RUN.continues++;
  W.heroes.forEach((h, i) => { h.down = false; h.hp = Math.round(TUNE.startHealth * DIFF[OPT.difficulty].hp); h.invuln = 1.5; h.rig.dieT = 0; h.rig.downW = 0; h.contUsed = (h.contUsed || 0) + 1; h.x = W.starts[i % W.starts.length].x; h.y = W.starts[i % W.starts.length].y; });
  sfx('rise'); say('rise', { hero: W.heroes[0], force: true, cd: 0 });
}
function spawnTithe() {
  const h = W.heroes.find(x => !x.down); if (!h) return;
  W.titheSpawned = true;
  const a = rnd(TAU); let x = h.x + Math.cos(a) * 150, y = h.y + Math.sin(a) * 150;
  for (let k = 0; k < 20 && W.map.solidAt(x, y); k++) { const a2 = rnd(TAU); x = h.x + Math.cos(a2) * 110; y = h.y + Math.sin(a2) * 110; }
  if (W.map.solidAt(x, y)) { x = h.x + 60; y = h.y; }
  const m = newMonster('t', x, y, 1, { emerge: .6 }); W.mons.push(m); W.tithe = m;
  say('tithe', { force: true }); sfx('tithe');
}

/* ---- 24-bot.js ---- */
/* The autopilot: produces the same intents a player's input would. Drives the attract mode, the Dev "Bot plays player 1" and the tests. */
const clearShot = (x0, y0, x1, y1) => { const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 5); for (let i = 1; i < n; i++) { const t = i / n; if (W.map.heightAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) > 12) return false; } return true; };
const FOODS = { roast: 1, loaf: 1, cider: 1, platter: 1 };
function botIntent(h) {
  const it = h.int, b = h.bot;
  b.t -= 1 / 120;
  b.flow = b.flow || new Flow(W.map);
  if (b.flow.map !== W.map) b.flow = new Flow(W.map);
  const cheats = W.attract || DEV.bot || b.cheat;
  // goal choice every 0.25 s
  if (b.t <= 0) {
    b.t = .25; b.think = '';
    const cell = p => [Math.floor(p.x / TS), Math.floor(p.y / TS)];
    const reach = p => { b.flow2 = b.flow2 || new Flow(W.map); return true; };
    void reach;
    let goal = null;
    const d2 = p => Math.hypot(p.x - h.x, p.y - h.y);
    b.bad = b.bad || new Set(); b.badT = (b.badT || 0) + .25; if (b.badT > 20) { b.badT = 0; b.bad.clear(); }
    const nearest = (list, maxD, ok = () => true) => { let best = null, bd = maxD; for (const o of list) { if (o.gone || o.dead || b.bad.has(o) || !ok(o)) continue; const d = d2(o); if (d < bd) { bd = d; best = o; } } return best; };
    // target for shooting
    b.shootAt = null;
    const mon = nearest(W.mons, 7 * TS, m => !m.T.immune && !(m.ch === 'y' && m.vis <= 0) && m.emerge <= 0 && clearShot(h.x, h.y, m.x, m.y));
    const gen = nearest(W.gens, 10 * TS, g => clearShot(h.x, h.y, g.x, g.y));
    const boss = W.boss && !W.boss.dead && W.boss.state !== 'sleep' ? W.boss : null;
    if (boss && clearShot(h.x, h.y, boss.x, boss.y) && d2(boss) < 12 * TS) b.shootAt = boss;
    else if (mon) b.shootAt = mon; else if (gen) b.shootAt = gen;
    // goal: food > fight > key > door > treasure > stairs
    const food = h.hp < 250 ? nearest(W.items, 20 * TS, i => FOODS[i.kind]) : null;
    const closedDoors = W.doors.filter(d => !d.open);
    if (food) { goal = food; b.think = 'EAT'; }
    else if (W.kind === 'boss' && W.boss && !W.boss.dead) { goal = { x: W.boss.x - 70, y: W.boss.y + 36 }; b.think = 'KING'; }
    else if (b.shootAt && (b.shootAt.state !== undefined || b.shootAt.hp !== undefined) && mon) { goal = null; b.think = 'FIGHT'; }
    else if (closedDoors.length && h.keys === 0 && nearest(W.items, 40 * TS, i => i.kind === 'key')) { goal = nearest(W.items, 40 * TS, i => i.kind === 'key'); b.think = 'KEY'; }
    else if (closedDoors.length && h.keys > 0 && b.doorTry < 6) { const dd = closedDoors.slice().sort((a, c) => d2(a.cells[0].x * TS + 8 > 0 ? { x: (a.cells[0].x + .5) * TS, y: (a.cells[0].y + .5) * TS } : a) - d2({ x: (c.cells[0].x + .5) * TS, y: (c.cells[0].y + .5) * TS }))[0]; goal = { x: (dd.cells[0].x + .5) * TS, y: (dd.cells[0].y + .5) * TS }; b.think = 'DOOR'; }
    else if (nearest(W.items, 12 * TS, i => ['gold', 'gem', 'chest', 'crown', 'flask', 'potion', 'amulet', 'key'].includes(i.kind))) { goal = nearest(W.items, 12 * TS, i => ['gold', 'gem', 'chest', 'crown', 'flask', 'potion', 'amulet', 'key'].includes(i.kind)); b.think = 'LOOT'; }
    else if (W.kind === 'boss') { goal = W.boss && !W.boss.dead ? { x: W.boss.x - 70, y: W.boss.y + 20 } : null; b.think = 'KING'; }
    else if (W.stairs.length) { goal = W.stairs[0]; b.think = 'STAIRS'; }
    else if (W.hoard.on) { goal = nearest(W.items, 1e9, i => ['gold', 'gem', 'chest', 'crown'].includes(i.kind)) || W.stairs[0]; b.think = 'HOARD'; }
    if (goal) { b.flow.update([cell(goal)]); if (b.flow.at(h.x, h.y) >= 1e9 && goal.kind !== undefined) { b.bad.add(goal); goal = null; } else if (b.flow.at(h.x, h.y) >= 1e9) goal = W.stairs[0] || goal; }
    b.goal = goal;
    if (goal && b.flow.key.indexOf(cell(goal)[0] + ',' + cell(goal)[1]) !== 0) b.flow.update([cell(goal)]);
    // magic when the screen is crowded
    const box = visibleBox(h); let cnt = 0; for (const m of W.mons) if (!m.dead && m.x > box.x0 && m.x < box.x1 && m.y > box.y0 && m.y < box.y1) cnt++;
    b.wantMagic = (cnt >= 12 || (W.tithe && d2(W.tithe) < 60)) && (h.flasks > 0 || cheats);
    if (cheats && h.flasks < 3) h.flasks = 3;
  }
  // act
  it.magic = false; it.rise = false;
  if (b.wantMagic) { it.magic = true; b.wantMagic = false; }
  let mx = 0, my = 0;
  const tgt = b.shootAt;
  if (b.goal && b.flow) { const v = b.flow.dir(h.x, h.y); if (v) { mx = v[0]; my = v[1]; } else if (Math.hypot(b.goal.x - h.x, b.goal.y - h.y) < 8) { mx = 0; my = 0; } }
  const closeFoe = W.mons.some(m => !m.dead && Math.hypot(m.x - h.x, m.y - h.y) < 34 && m.ch !== 'g');
  if (tgt && !tgt.dead && !tgt.gone) {
    const ax = tgt.x - h.x, ay = tgt.y - h.y, d = Math.hypot(ax, ay) || 1;
    it.ax = ax / d; it.ay = ay / d; it.fire = true; it.aimed = true; it.plant = false;
    if (W.allyStun) for (const o of W.heroes) { if (o === h || o.down) continue; const ox = o.x - h.x, oy = o.y - h.y, along = ox * it.ax + oy * it.ay; if (along > 0 && along < Math.min(d, 170) && Math.abs(ox * it.ay - oy * it.ax) < 10) { it.fire = false; mx = -it.ay * (h.slot % 2 ? 1 : -1); my = it.ax * (h.slot % 2 ? 1 : -1); break; } }
    if (b.think === 'FIGHT') {
      const ranged = h.C.id === 'ranger' || h.C.id === 'hexer';
      if (ranged && d < 60) { mx = -it.ax; my = -it.ay; } else if (!ranged && d > 20 && d < 100) { mx = it.ax * .6; my = it.ay * .6; } else if (!b.goal) { mx = 0; my = 0; }
    }
  } else { it.fire = false; it.aimed = false; if (mx || my) { it.ax = mx; it.ay = my; } }
  void closeFoe;
  it.mx = mx; it.my = my;
  // stuck detection
  b.sx = b.sx === undefined ? h.x : b.sx; b.sy = b.sy === undefined ? h.y : b.sy; b.st = (b.st || 0) + 1 / 120;
  if (b.st > 3) {
    const moved = Math.hypot(h.x - b.sx, h.y - b.sy); b.sx = h.x; b.sy = h.y; b.st = 0;
    if (moved < 8 && b.goal && !tgt) {
      b.stuck = (b.stuck || 0) + 1; if (b.goal.kind !== undefined && b.think === 'LOOT') b.bad.add(b.goal);
      if (b.think === 'DOOR') b.doorTry = (b.doorTry || 0) + 1;
      if (cheats && b.flow) { for (let k = 0; k < 6; k++) { const v = b.flow.dir(h.x, h.y); if (!v) break; h.x += v[0] * 12; h.y += v[1] * 12; } }
    }
  }
}
function makeBot(cheat) { return { t: 0, think: '', goal: null, shootAt: null, cheat: !!cheat, doorTry: 0, flow: null }; }

/* ---- 25-audio.js ---- */
/* Audio: every sound, song and voice is made in code. Voices are Animalese-style gibberish: a babble of short pitched syllables. */
const SFX_DEFS = {
  shot_axe: { wave: 'saw', freq: 260, to: 90, dur: .12, vol: .18 }, shot_javelin: { wave: 'square', freq: 700, to: 300, dur: .1, vol: .16 }, shot_arrow: { wave: 'triangle', freq: 1100, to: 400, dur: .08, vol: .2 },
  shot_hex: [{ wave: 'sine', freq: 500, to: 900, dur: .14, vol: .2 }, { wave: 'triangle', freq: 1000, to: 1500, dur: .1, vol: .1, delay: .02 }],
  swing: { wave: 'noise', freq: 1800, to: 500, dur: .1, vol: .22 }, hit: [{ wave: 'noise', freq: 900, to: 200, dur: .09, vol: .3 }, { wave: 'square', freq: 160, to: 60, dur: .09, vol: .2 }],
  hurt: [{ wave: 'saw', freq: 300, to: 120, dur: .18, vol: .25 }, { wave: 'noise', freq: 600, dur: .08, vol: .2 }], die: { wave: 'saw', freq: 400, to: 40, dur: .8, vol: .3 }, rise: [{ wave: 'triangle', freq: 'C4', dur: .12, vol: .3 }, { wave: 'triangle', freq: 'E4', dur: .12, vol: .3, delay: .1 }, { wave: 'triangle', freq: 'G4', dur: .12, vol: .3, delay: .2 }, { wave: 'triangle', freq: 'C5', dur: .3, vol: .3, delay: .3 }],
  shrink: { wave: 'square', freq: 700, to: 250, dur: .12, vol: .18 }, wail: { wave: 'triangle', freq: 600, to: 200, dur: .5, vol: .25, vib: [9, .05] }, pop: { wave: 'noise', freq: 1200, to: 300, dur: .15, vol: .25 },
  boom: [{ wave: 'noise', freq: 400, to: 60, dur: .6, vol: .5 }, { wave: 'saw', freq: 90, to: 30, dur: .6, vol: .4 }], boomS: [{ wave: 'noise', freq: 600, to: 100, dur: .3, vol: .35 }, { wave: 'saw', freq: 120, to: 40, dur: .3, vol: .25 }],
  bigboom: [{ wave: 'noise', freq: 500, to: 40, dur: 1.2, vol: .6 }, { wave: 'saw', freq: 80, to: 20, dur: 1.2, vol: .5 }],
  squish: { wave: 'noise', freq: 500, to: 120, dur: .12, vol: .22 }, clunk: [{ wave: 'square', freq: 120, to: 70, dur: .1, vol: .3 }, { wave: 'noise', freq: 300, dur: .06, vol: .2 }], crumble: [{ wave: 'noise', freq: 500, to: 80, dur: .7, vol: .45 }, { wave: 'square', freq: 90, to: 30, dur: .5, vol: .3 }],
  clink: { wave: 'square', freq: 2200, to: 1800, dur: .06, vol: .15 }, key: [{ wave: 'square', freq: 'E5', dur: .08, vol: .22 }, { wave: 'square', freq: 'B5', dur: .16, vol: .22, delay: .08 }],
  pickup: [{ wave: 'square', freq: 'C5', dur: .06, vol: .2 }, { wave: 'square', freq: 'G5', dur: .1, vol: .2, delay: .06 }], chomp: [{ wave: 'noise', freq: 800, to: 300, dur: .06, vol: .3 }, { wave: 'square', freq: 220, to: 140, dur: .08, vol: .2, delay: .07 }, { wave: 'noise', freq: 800, to: 300, dur: .06, vol: .3, delay: .12 }],
  gag: { wave: 'saw', freq: 140, to: 70, dur: .4, vol: .25, vib: [20, .1] }, power: [{ wave: 'square', freq: 'C5', dur: .1, vol: .2 }, { wave: 'square', freq: 'E5', dur: .1, vol: .2, delay: .08 }, { wave: 'square', freq: 'G5', dur: .1, vol: .2, delay: .16 }, { wave: 'square', freq: 'C6', dur: .25, vol: .2, delay: .24 }],
  coin: [{ wave: 'square', freq: 'B5', dur: .06, vol: .18 }, { wave: 'square', freq: 'E6', dur: .22, vol: .18, delay: .06 }], gem: [{ wave: 'triangle', freq: 'E6', dur: .1, vol: .25 }, { wave: 'triangle', freq: 'A6', dur: .1, vol: .25, delay: .08 }, { wave: 'triangle', freq: 'E7', dur: .3, vol: .2, delay: .16 }],
  chest: [{ wave: 'noise', freq: 400, dur: .12, vol: .2 }, { wave: 'square', freq: 'C5', dur: .1, vol: .2, delay: .1 }, { wave: 'square', freq: 'G5', dur: .1, vol: .2, delay: .18 }, { wave: 'square', freq: 'C6', dur: .3, vol: .2, delay: .26 }],
  door: [{ wave: 'saw', freq: 90, to: 140, dur: .5, vol: .3 }, { wave: 'noise', freq: 300, dur: .5, vol: .2 }], rumble: { wave: 'noise', freq: 120, to: 50, dur: 1, vol: .5 }, tele: { wave: 'sine', freq: 300, to: 1500, dur: .35, vol: .3 }, zap: { wave: 'saw', freq: 1400, to: 200, dur: .2, vol: .25 },
  secret: [{ wave: 'triangle', freq: 'G5', dur: .1, vol: .25 }, { wave: 'triangle', freq: 'B5', dur: .1, vol: .25, delay: .1 }, { wave: 'triangle', freq: 'D6', dur: .2, vol: .25, delay: .2 }],
  bell: [{ wave: 'sine', freq: 660, dur: 1, vol: .35 }, { wave: 'sine', freq: 1320, dur: .8, vol: .2 }, { wave: 'sine', freq: 990, dur: .9, vol: .15 }], splat: { wave: 'noise', freq: 700, to: 200, dur: .15, vol: .3 }, lob: { wave: 'sine', freq: 300, to: 700, dur: .25, vol: .2 },
  smash: [{ wave: 'noise', freq: 2000, to: 500, dur: .2, vol: .35 }, { wave: 'square', freq: 300, to: 100, dur: .1, vol: .15 }], fire: { wave: 'noise', freq: 1500, to: 400, dur: .25, vol: .25 }, bite: { wave: 'square', freq: 200, to: 90, dur: .1, vol: .25 },
  steal: [{ wave: 'square', freq: 'C6', dur: .06, vol: .2 }, { wave: 'square', freq: 'G5', dur: .06, vol: .2, delay: .06 }, { wave: 'square', freq: 'E5', dur: .1, vol: .2, delay: .12 }],
  tithe: [{ wave: 'saw', freq: 55, to: 45, dur: 1.2, vol: .35, vib: [6, .06] }, { wave: 'triangle', freq: 220, to: 110, dur: 1.2, vol: .2 }], roar: [{ wave: 'saw', freq: 80, to: 40, dur: .9, vol: .45, vib: [18, .1] }, { wave: 'noise', freq: 300, to: 60, dur: .9, vol: .3 }], tell: { wave: 'square', freq: 220, to: 330, dur: .25, vol: .15 },
  descend: [{ wave: 'triangle', freq: 'G5', dur: .12, vol: .3 }, { wave: 'triangle', freq: 'E5', dur: .12, vol: .3, delay: .12 }, { wave: 'triangle', freq: 'C5', dur: .12, vol: .3, delay: .24 }, { wave: 'triangle', freq: 'G4', dur: .12, vol: .3, delay: .36 }, { wave: 'triangle', freq: 'C4', dur: .4, vol: .3, delay: .48 }],
  slam: [{ wave: 'noise', freq: 300, to: 40, dur: .5, vol: .5 }, { wave: 'square', freq: 70, to: 30, dur: .5, vol: .4 }], magic: [{ wave: 'noise', freq: 3000, to: 200, dur: .7, vol: .35 }, { wave: 'sine', freq: 200, to: 1600, dur: .5, vol: .3 }, { wave: 'triangle', freq: 'C5', dur: .6, vol: .2, delay: .1 }, { wave: 'triangle', freq: 'E5', dur: .6, vol: .2, delay: .1 }, { wave: 'triangle', freq: 'G5', dur: .6, vol: .2, delay: .1 }],
  thud: { wave: 'square', freq: 110, to: 50, dur: .1, vol: .28 }, heart: { wave: 'sine', freq: 70, to: 45, dur: .15, vol: .35 }, tick: { wave: 'square', freq: 900, dur: .03, vol: .12 }, tick2: { wave: 'square', freq: 1400, dur: .05, vol: .14 },
  menu: { wave: 'square', freq: 'A5', dur: .04, vol: .1 }, back: { wave: 'square', freq: 'E5', dur: .05, vol: .1 }
};
function defineSfx() { for (const k in SFX_DEFS) game.audio.define(k, SFX_DEFS[k]); }

// ---------- music ----------
const SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'square', vol: .13, notes: 'D4 - - . F4 - A4 - | D5 - - . C5 - A4 - | Bb4 - - . A4 - F4 - | G4 - A4 - F4 - E4 - | D4 - - . F4 - A4 - | D5 - - . E5 - F5 - | E5 - D5 - C5 - A4 - | D4 - - - . . . . ' },
    { wave: 'triangle', vol: .24, notes: 'D2 . D2 . D2 . A2 . | D2 . D2 . D2 . A2 . | Bb1 . Bb1 . Bb1 . F2 . | G1 . G1 . A1 . A1 . | D2 . D2 . D2 . A2 . | D2 . D2 . D2 . A2 . | A1 . A1 . A1 . E2 . | D2 . . . A1 . . .' },
    { wave: 'drums', vol: .22, notes: 'k . . . s . . . | k . . k s . . . | k . . . s . . . | k . k . s . . s' }] },
  larder: { bpm: 112, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'E4 . G4 . B4 . G4 . | E4 . G4 . B4 . E5 . | D4 . F4 . A4 . F4 . | D4 . F4 . A4 . D5 . | C4 . E4 . G4 . E4 . | C4 . E4 . G4 . C5 . | B3 . D4 . F#4 . D4 . | B3 . D4 . F#4 . B4 .' },
    { wave: 'triangle', vol: .26, notes: 'E2 . E2 E2 . E2 . E3 | D2 . D2 D2 . D2 . D3 | C2 . C2 C2 . C2 . C3 | B1 . B1 B1 . B1 . B2' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h . | k . h k s . h .' }] },
  ossuary: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'A4 - - - C5 - - - | B4 - - - G4 - - - | A4 - - - E4 - - - | F4 - E4 - D4 - - - | A4 - - - C5 - - - | D5 - - - B4 - - - | C5 - B4 - A4 - G#4 - | A4 - - - - - - -' },
    { wave: 'triangle', vol: .26, notes: 'A1 . . A1 . . A1 . | G1 . . G1 . . G1 . | F1 . . F1 . . F1 . | E1 . . E1 . . E2 .' },
    { wave: 'drums', vol: .18, notes: 'k . . . . . h . | s . . . h . h . | k . . k . . h . | s . h . s . h h' }] },
  furnace: { bpm: 132, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'C4 . C4 Eb4 . F4 . G4 | C4 . C4 Eb4 . F4 . Bb4 | Ab3 . Ab3 C4 . Db4 . Eb4 | G3 . G3 B3 . D4 . F4' },
    { wave: 'triangle', vol: .28, notes: 'C2 C2 . C2 C2 . C2 . | C2 C2 . C2 C2 . Bb1 . | Ab1 Ab1 . Ab1 Ab1 . Ab1 . | G1 G1 . G1 G1 . G1 G1' },
    { wave: 'drums', vol: .24, notes: 'k . h h s . h . | k . h k s . h h' }] },
  boss: { bpm: 144, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'D4 D4 . F4 . A4 . D5 | C5 . A4 . F4 . A4 . | Bb3 Bb3 . D4 . F4 . Bb4 | A4 . F4 . E4 . C#4 . | D4 D4 . F4 . A4 . D5 | E5 . D5 . C5 . A4 . | Bb4 . A4 . G4 . F4 . | E4 . E4 . A3 . . .' },
    { wave: 'saw', vol: .1, notes: 'D3 - - . D3 - - . | D3 - - . D3 - - . | Bb2 - - . Bb2 - - . | A2 - - . A2 - - . | D3 - - . D3 - - . | D3 - - . D3 - - . | Bb2 - - . G2 - - . | A2 - - . A2 - - .' },
    { wave: 'triangle', vol: .28, notes: 'D2 D2 D3 D2 D2 D3 D2 D3 | D2 D2 D3 D2 D2 D3 D2 D3 | Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 Bb2 | A1 A1 A2 A1 A1 A2 A1 A2' },
    { wave: 'drums', vol: .26, notes: 'k h k h s h k h | k h k k s h s h' }] },
  hoard: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'C5 E5 G5 E5 C5 E5 G5 C6 | B4 D5 G5 D5 B4 D5 G5 B5 | A4 C5 E5 C5 A4 C5 E5 A5 | G4 B4 D5 B4 G4 B4 D5 G5' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G2 . C3 . G2 . | G2 . D2 . G2 . D2 . | A2 . E2 . A2 . E2 . | G2 . D2 . G2 . D2 .' },
    { wave: 'drums', vol: .2, notes: 'k h h h s h h h' }] },
  victory: { bpm: 100, steps: 4, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 - E5 - G5 - C6 - | B5 - G5 - E5 - G5 - | A5 - F5 - C5 - F5 - | G5 - - - . . . . | C5 - E5 - G5 - C6 - | D6 - B5 - G5 - D5 - | E5 - G5 - C6 - E6 - | C6 - - - - - - -' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 .' }] }
};
function music(name, o) { if (!game || (W && W.net && W.net.server)) return; const s = SONGS[name]; if (!s) return; if (game.audio.song === s && !(o && o.restart)) return; game.audio.music(s, Object.assign({ fade: .6 }, o || {})); }

// ---------- voices: Animalese-style babble ----------
const Voice = {
  on: true,
  // kind: 'gaunt' (deep, echoing), or a hero class id for a bark/line
  babble(base, text, o = {}) {
    if (!Voice.on || !game || (W && W.net && W.net.server)) return;
    const n = Math.max(3, Math.min(26, Math.ceil(text.length / (o.per || 2.6)))), voices = [], sp = o.speed || .085, wave = o.wave || 'triangle', scale = o.scale || [0, 2, 4, 7, 9, 12];
    let seed = 0; for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
    const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < n; i++) {
      const semi = scale[Math.floor(r() * scale.length)] + (i === n - 1 ? -3 : 0) + (o.rise ? i * .4 : 0);
      const f = base * Math.pow(2, semi / 12), d = sp * (0.6 + r() * .7);
      voices.push({ wave, freq: f, to: f * (0.85 + r() * .3), dur: d, vol: o.vol || .12, delay: i * sp, vib: o.vib });
      if (o.echo) voices.push({ wave, freq: f, to: f * .95, dur: d, vol: (o.vol || .12) * .45, delay: i * sp + o.echo });
    }
    game.audio.sfx(voices, { vary: 0 });
  },
  gaunt(text) { Voice.babble(78, text, { wave: 'sawtooth' === 'x' ? 'saw' : 'saw', vol: .09, speed: .095, echo: .22, per: 2.2, scale: [0, 0, 3, 5, 7, -2], vib: [5, .02] }); },
  hero(h, text) { const b = [95, 150, 200, 260][h.cls] || 150; Voice.babble(b, text, { wave: 'square', vol: .06, speed: .06, per: 1.6 }); },
  bark(h) { const b = [95, 150, 200, 260][h.cls] || 150; Voice.babble(b, 'ouch', { wave: 'square', vol: .08, speed: .05, rise: false }); },
  monster(ch) { Voice.babble({ g: 330, n: 110, o: 180, i: 240, y: 140, x: 300, t: 60 }[ch] || 150, 'grr', { wave: 'saw', vol: .05, speed: .07 }); }
};

/* ---- 30-art.js ---- */
/* Art: item sprites, generator drawings, HUD icons, projectile drawing. All drawn from code. */
const SPR = {};
function mk(name, rows, pal, scale = 2) { SPR[name] = E.sprite(rows, pal, scale); }
mk('roast', ['..dddd..', '.dRRRRd.', 'dRRhRRRd', 'dRRRRRRd', '.dRRRRd.', '..dddwww', '.....wWw', '......ww'], { d: '#5a2810', R: '#c8602a', h: '#f0a060', w: '#e8e0d0', W: '#fff' });
mk('loaf', ['........', '..dddd..', '.dBBBBd.', 'dBhBBBBd', 'dBBBBhBd', 'dBBBBBBd', '.dddddd.', '........'], { d: '#5a3010', B: '#c88a40', h: '#f0c070' });
mk('cider', ['...cc...', '...CC...', '..jjjj..', '.jJJJJj.', '.jJhJJj.', '.jJJJJj.', '.jJJJJj.', '..jjjj..'], { c: '#5a3a20', C: '#8a6a40', j: '#6a4a18', J: '#c8903a', h: '#f0d080' });
mk('stew', ['........', '.sssssss', 'sGGgGGGs', 'sGgGGgGs', '.sGGGGs.', '..ssss..', '.bbbbbb.', '........'], { s: '#403828', G: '#6a9a3a', g: '#a0d060', b: '#202018' });
mk('flask', ['...kk...', '...kk...', '..kppk..', '.kpPPpk.', '.kPpPPk.', '.kPPPPk.', '..kkkk..', '........'], { k: '#2a1a50', p: '#9a60e0', P: '#d0a0ff' });
mk('key', ['.yyyy...', 'y....y..', 'y....yyy', 'y....y.y', '.yyyy.yy', '........', '........', '........'], { y: '#f0d040' });
mk('gold', ['........', '..yyyy..', '.yYYYYy.', '.yYooYy.', '.yYooYy.', '.yYYYYy.', '..yyyy..', '........'], { y: '#a07a10', Y: '#f0c830', o: '#fff0a0' });
mk('gem', ['...tt...', '..tGGt..', '.tGhGGt.', 'tGhGGGGt', '.tGGGGt.', '..tGGt..', '...tt...', '........'], { t: '#104a5a', G: '#30c8d8', h: '#d0ffff' });
mk('crown', ['y..y..y.', 'yy.yy.yy', 'yYyyYyYy', 'yYYYYYYy', 'yYrYYrYy', 'yYYYYYYy', 'yyyyyyyy', '........'], { y: '#a07a10', Y: '#f0d040', r: '#e03050' });
mk('platter', ['....pp..', '..pppppp', '.pPPPPPp', '.pPhPPPp', 'ppPPPPPp', 'oooooooo', '.oOOOOo.', '........'], { p: '#8a8a98', P: '#c8c8d8', h: '#fff', o: '#6a5a40', O: '#a08a60' });
mk('bell', ['...bb...', '..bBBb..', '.bBhBBb.', '.bBBBBb.', 'bBBBBBBb', 'bbbbbbbb', '...cc...', '........'], { b: '#8a6a10', B: '#e0b030', h: '#fff0a0', c: '#403010' });
mk('amulet', ['..cccc..', '.c....c.', 'c......c', 'c......c', '.c....c.', '..cGGc..', '..cGGc..', '........'], { c: '#a0a0b0', G: '#ffffff' });
mk('skull', ['.wwwwww.', 'wWWWWWWw', 'wWkWWkWw', 'wWkWWkWw', '.wWWWWw.', '..wWWw..', '..w..w..', '........'], { w: '#8a8a80', W: '#e8e8d8', k: '#201820' });
mk('heart', ['.rr..rr.', 'rRRrrRRr', 'rRhRRRRr', 'rRRRRRRr', '.rRRRRr.', '..rRRr..', '...rr...', '........'], { r: '#802020', R: '#e04040', h: '#ff9090' }, 1);
const SPR1 = {
  key: E.sprite(['.yyy....', 'y...y...', 'y...yyyy', '.yyy.y.y'], { y: '#f0d040' }, 1),
  flask: E.sprite(['..kk..', '.kppk.', 'kpPPpk', 'kPPPPk', '.kkkk.'], { k: '#2a1a50', p: '#9a60e0', P: '#d0a0ff' }, 1)
};
const POTION_SPR = {};
function potionSpr(sub) { if (POTION_SPR[sub]) return POTION_SPR[sub]; const c = SPECIAL_COL[sub] || '#ccc'; return POTION_SPR[sub] = E.sprite(['...kk...', '...kk...', '..kxxk..', '.kxXXxk.', '.kXxXXk.', '.kXXXXk.', '..kkkk..', '........'], { k: '#201830', x: c, X: '#ffffff' }, 2); }
const AMU_SPR = {};
function amuSpr(sub) { if (AMU_SPR[sub]) return AMU_SPR[sub]; const c = AMULET_COL[sub] || '#fff'; return AMU_SPR[sub] = E.sprite(['..cccc..', '.c....c.', 'c......c', 'c......c', '.c....c.', '..cGGc..', '..cGGc..', '........'], { c: '#b0a890', G: c }, 2); }

// shots, drawn in the depth queue
function drawShot(r, s) {
  r.queue(s.x, s.y, s.z, g => {
    const [sx, sy] = r.w(s.x, s.y, s.z), a = Math.atan2(s.vy, s.vx);
    const p = (d, c, w = 1) => px.line(g, Math.round(sx - Math.cos(a) * d), Math.round(sy - Math.sin(a) * d * .55), Math.round(sx), Math.round(sy), c, w);
    switch (s.kind) {
      case 'axe': { const k = Math.floor(s.spin) % 4; const o = [[-3, -3], [3, -3], [3, 3], [-3, 3]][k]; px.line(g, sx - o[0], sy - o[1], sx + o[0], sy + o[1], '#8a6a3a', 1); px.rect(g, sx + o[0] - 1, sy + o[1] - 1, 3, 3, '#d8dce8'); px.dot(g, sx, sy, '#fff'); break; }
      case 'javelin': p(9, '#d8c090', 1); px.rect(g, Math.round(sx), Math.round(sy) - 1, 2, 2, '#e8ecf8'); break;
      case 'arrow': p(8, '#c8a060', 1); px.dot(g, Math.round(sx), Math.round(sy), '#fff'); p(2, '#d0e8c0', 1); break;
      case 'hex': r.glowDisc(g, Math.round(sx), Math.round(sy), 7, '#c070ff', .7); px.disc(g, Math.round(sx), Math.round(sy), 2, '#f0d0ff'); break;
    }
  }, { emissive: true });
}
function drawFoe(r, f) {
  if (f.kind === 'pot') {
    r.groundDisc(f.tx, f.ty, 8, '#ff4030', .35 + .25 * Math.sin(W.time * 20));
    r.queue(f.x, f.y, f.z, g => { const [sx, sy] = r.w(f.x, f.y, f.z); px.disc(g, sx, sy, 3, '#8a5a30'); px.disc(g, sx - 1, sy - 1, 1, '#d8a860'); px.rect(g, sx - 2, sy - 3, 4, 1, '#5a3010'); });
  } else {
    r.queue(f.x, f.y, f.z, g => { const [sx, sy] = r.w(f.x, f.y, f.z); r.glowDisc(g, sx, sy, 8, '#ff8030', .8); px.disc(g, sx, sy, 3, '#ffb040'); px.disc(g, sx, sy, 1, '#fff6c0'); }, { emissive: true });
  }
}

// generators
function drawGen(g, ox, oy, gen, t) {
  const GD = GENDEF[gen.ch], [dk, md, hi] = GD.c, br = 1 + Math.sin(gen.breathe * 2) * .04, dmg = gen.rank0 - gen.rank, flash = gen.flash > 0;
  const c = k => flash ? '#ffffff' : k;
  switch (gen.ch) {
    case 'G': case 'U': {
      px.ell(g, ox, oy - 8, 7, 9 * br, c(md)); px.ell(g, ox - 2, oy - 10, 3, 6 * br, c(hi === '#d8e4f8' ? '#b8bcc8' : '#c0c0d0'));
      px.rect(g, ox - 5, oy - 20 * br, 10, 3, c(dk)); px.ell(g, ox, oy - 12, 4, 3, '#101018'); px.dot(g, ox - 1, oy - 12, '#fff'); px.dot(g, ox + 1, oy - 12, '#fff');
      if (gen.ch === 'U') px.rect(g, ox - 3, oy - 24 * br, 6, 3, c('#d8d8e8'));
      break;
    }
    case 'N': { px.poly(g, [[ox - 9, oy], [ox - 6, oy - 11 * br], [ox, oy - 14 * br], [ox + 6, oy - 11 * br], [ox + 9, oy]], c(md)); px.ell(g, ox, oy - 4, 4, 3, '#14100a'); for (let i = -2; i <= 2; i++) px.line(g, ox + i * 3, oy - 8, ox + i * 3 + 1, oy - 14, c('#d8d0b0'), 1); px.dot(g, ox - 1, oy - 4, '#9ad070'); px.dot(g, ox + 1, oy - 4, '#9ad070'); break; }
    case 'L': { px.rect(g, ox - 8, oy - 18 * br, 16, 18 * br, c(dk)); px.rect(g, ox - 7, oy - 17 * br, 14, 7, c(md)); px.rect(g, ox - 7, oy - 8, 14, 7, c(md)); for (let i = 0; i < 3; i++) { px.ell(g, ox - 4 + i * 4, oy - 13, 2, 1, c(hi)); px.ell(g, ox - 4 + i * 4, oy - 4, 2, 1, c(hi)); } break; }
    case 'I': { const pulse = .6 + .4 * Math.sin(t * 5); px.rect(g, ox - 9, oy - 5, 18, 5, c(dk)); for (let i = -3; i <= 3; i++) { px.rect(g, ox + i * 2 - 1, oy - 5, 1, 5, '#'+(Math.floor(255*pulse)<<16|Math.floor(90*pulse)<<8|30).toString(16).padStart(6,'0')); } px.rect(g, ox - 9, oy - 6, 18, 1, c(md)); break; }
    case 'F': { px.rect(g, ox - 7, oy - 4, 14, 4, c(dk)); for (let i = -2; i <= 2; i++) { const h = 8 + ((i * 7 + 5) % 5), x = ox + i * 3; px.rect(g, x - 1, oy - 4 - h * br, 3, h * br, c(hi === '#ffd860' ? '#e8e0c8' : hi)); px.dot(g, x, oy - 6 - h * br, '#ffd860'); px.dot(g, x, oy - 7 - h * br, '#ff8030'); } break; }
    case 'S': { px.ell(g, ox, oy - 5, 9, 6 * br, c(dk)); px.ell(g, ox - 3, oy - 8, 5, 4, c(md)); px.ell(g, ox + 4, oy - 9, 4, 4, c(md)); px.ell(g, ox + 1, oy - 12, 3, 2, c(hi)); break; }
  }
  for (let i = 0; i < dmg * 2; i++) px.line(g, ox - 5 + i * 4, oy - 14, ox - 3 + i * 4, oy - 5, '#0c0810', 1);
  if (dmg >= 2 || gen.hp / gen.maxhp < .3) for (let i = 0; i < 3; i++) px.dot(g, ox - 6 + i * 6, oy - 2 + (i % 2), '#665');
}

// HUD icons
function drawIcon(g, name, x, y, sc) { const s = SPR[name]; if (s) px.sprite(g, s, x, y); }

/* ---- 31-render.js ---- */
/* Drawing a floor and the HUD. */
const glyph = a => (game.input.label ? game.input.label(a) : a);
const padLabel = (h, a) => { const I = h && h.input; return I && I.label ? I.label(a) : a; };

function animateAll(dt) {
  for (const m of W.mons) {
    const rg = m.rigD.rig, st = { x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, facing: m.facing, hurt: m.flash > 0 };
    if (m.dead) { st.pose = 'die'; st.vx = st.vy = 0; if (m.rigD.kind === 'b') st.squash = -.4; }
    else if (m.rigD.kind === 'h') {
      st.attack = m.swing && m.swing.state || null;
      if (m.ch === 'o' && m.tell > 0) st.pose = 'cast'; if (m.isBoss && m.tell > 0) st.pose = m.attack === 'stomp' ? 'cheer' : 'cast';
      if (m.ch === 't') { st.vx *= .5; st.vy *= .5; }
    } else { st.squash = m.tell > 0 ? -.35 : Math.sin(m.t * 6) * .06; st.look = [Math.cos(m.facing), Math.sin(m.facing)]; }
    if (m.ch === 'g' && m.rigD.kind === 'b') st.squash = Math.sin(m.t * 5) * .1;
    rg.update(dt, st);
  }
}

function drawFloorMarks(r) {
  const T = W.time;
  for (const s of W.stairs) { r.groundDisc(s.x, s.y, 9, '#101020', .9); r.groundRing(s.x, s.y, 8, '#ffd860', .6 + .3 * Math.sin(T * 4)); }
  for (const s of W.skips) { r.groundDisc(s.x, s.y, 9, '#101020', .9); r.groundRing(s.x, s.y, 8, '#80c0ff', .6); r.queue(s.x, s.y, 0, g => { const [sx, sy] = r.w(s.x, s.y, 0); E.font.text(g, String(s.to), sx, sy - 5, '#c8e0ff', { align: 'center' }); }); }
  for (const p of W.pads) { r.groundDisc(p.x, p.y, 7, '#2a1050', .9); r.groundRing(p.x, p.y, 6 + Math.sin(T * 6), '#b080ff', .8); r.groundRing(p.x, p.y, 3, '#e0c0ff', .6); }
  for (const p of W.runes) { r.groundDisc(p.x, p.y, 6, '#403000', .9); r.groundRing(p.x, p.y, 5, '#ffe070', .7 + .2 * Math.sin(T * 8)); }
  for (const p of W.plates) if (!p.hit) { r.groundDisc(p.x, p.y, 6, '#303030', .9); r.groundRing(p.x, p.y, 5, p.kind === 'T' ? '#70e0ff' : '#ff6060', .8); }
  for (const s of W.spikes) { const ph = (T + s.ph) % 1.6, up = ph < .5, trem = ph > 1.35; r.groundDisc(s.x, s.y, 7, '#18141c', .9); if (up) r.queue(s.x, s.y, 0, g => { const [sx, sy] = r.w(s.x, s.y, 0); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) px.poly(g, [[sx + i * 4 - 1, sy + j * 2], [sx + i * 4, sy + j * 2 - 6], [sx + i * 4 + 1, sy + j * 2]], '#d8dce8'); }); else if (trem) r.groundRing(s.x, s.y, 4 + Math.sin(T * 60), '#ff6060', .5); else for (let i = -1; i <= 1; i += 2) r.groundDisc(s.x + i * 3, s.y, 1.2, '#c0c0c8', 1); }
  for (const b of W.rubble) r.groundDisc(b.x, b.y, 6, '#4a4038', .8);
  if (W.bellObj) { const b = W.bellObj; r.actor(b.x, b.y, 0, (g, ox, oy) => { const sw = b.rung ? Math.sin(b.t * 14) * Math.max(0, 1 - b.t / 3) * 4 : 0; px.sprite(g, SPR.bell, ox - 8 + sw, oy - 18); }); }
}

function drawBeams(r) {
  for (const b of W.beams) {
    const on = beamOn(b);
    r.queue(b.x, b.y, 6, g => {
      const [sx, sy] = r.w(b.x, b.y, 8), hx = b.vert ? 0 : 8, hy = b.vert ? 8 : 0;
      px.rect(g, sx - 2, sy - 8, 4, 12, '#505868'); px.dot(g, sx, sy - 9, on ? '#ff8080' : '#808090');
      if (on) { const a = b.vert ? [sx, sy - 1 - 7, sx, sy + 7] : [sx - 8, sy, sx + 8, sy]; px.line(g, a[0], a[1], a[2], a[3], '#ff2040', 3); px.line(g, a[0], a[1], a[2], a[3], '#ffd0d0', 1); r.glowDisc(g, sx, sy, 10, '#ff4060', .6); }
      void hx; void hy;
    }, { emissive: on });
  }
}

function drawItem(r, it) {
  if (it.gone) return;
  const bob = Math.sin(W.time * 3 + it.t) * 1.5 + 3;
  const k = it.kind;
  if (k === 'chest' || k === 'lchest') { r.prop('chest', it.x, it.y, 0, { size: 1, color: k === 'lchest' ? '#5a7ab0' : undefined }); return; }
  let spr = SPR[k]; if (k === 'potion') spr = potionSpr(it.sub); if (k === 'amulet') spr = amuSpr(it.sub);
  if (!spr) return;
  r.shadow(it.x, it.y, 5, .35, '#0c0818', it.z);
  const glow = { gold: '#ffd860', gem: '#60e8ff', crown: '#ffe080', key: '#fff0a0', potion: SPECIAL_COL[it.sub], amulet: AMULET_COL[it.sub], flask: '#c080ff', roast: null }[k];
  r.sprite(it.x, it.y, it.z + bob, spr, { anchor: 'bottom', glow: glow || undefined });
}

function drawMonster(r, m, view) {
  if (m.dead && m.dying > 1) return;
  const a = m.dead ? Math.max(0, 1 - m.dying / 1.0) : m.ch === 'y' && m.vis <= 0 ? .0 : m.emerge > 0 ? m.alpha : 1;
  const px0 = m.x, py0 = m.y;
  if (m.ch === 'y' && m.vis <= 0) { r.groundDisc(px0, py0, 5, '#201028', .35); return; }
  if (!m.dead || true) r.shadow(px0, py0, m.r + 1, .4 * a);
  const flash = m.flash > 0 ? '#ffffff' : null;
  r.actor(px0, py0, m.z || 0, (g, ox, oy) => m.rigD.rig.draw(g, ox, oy, view), { flash, flashMix: .7, alpha: m.ch === 'g' ? .75 * a : a, every: m.isBoss ? 1 : undefined, key: m });
  if (m.tell > 0 && m.ch === 'i') r.queue(m.x, m.y, 10, g => { const [sx, sy] = r.w(m.x, m.y, 8); r.glowDisc(g, sx, sy, 9, '#ff6020', .9); }, { emissive: true });
  if (m.tell > 0 && m.ch === 'o' && m.aimAt) r.groundRing(m.aimAt.x, m.aimAt.y, 6 + m.tell * 8, '#ff4030', .8);
  if (m.isBoss && m.tell > 0) { const rad = m.attack === 'stomp' ? 70 * (1 - m.tell / .8) : 0; if (rad) r.groundRing(m.x, m.y, rad, '#ff8040', .7); if (m.attack === 'charge') r.groundArc(m.x, m.y, 8, 150, m.facing - .12, m.facing + .12, '#ff4040', .35); }
  if (m.ch === 't') r.glowDisc && r.queue(m.x, m.y, 14, g => { const [sx, sy] = r.w(m.x, m.y, 8); r.glowDisc(g, sx, sy, 18, '#9040c0', .5); }, { emissive: true });
  if (m.isBoss && !m.dead) { r.queue(m.x, m.y, 60, g => { const [sx, sy] = r.w(m.x, m.y, 66); px.rect(g, sx - 22, sy, 44, 4, '#200808'); px.rect(g, sx - 21, sy + 1, Math.max(0, 42 * m.hp / m.maxhp), 2, '#e03040'); }); }
}

function drawHeroWorld(r, h, view) {
  if (h.gone) return;
  const col = h.C.color, away = h.down;
  r.shadow(h.x, h.y, 6, .45);
  if (!away) { r.groundRing(h.x, h.y, 9, col, .55); if (h.stairT > 0 && W.descend == null) r.groundArc(h.x, h.y, 11, 13, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, h.stairT / Math.max(.05, TUNE.stairHold)), '#ffd860', .9); }
  if (h.amulet && h.amuletT > 0) r.groundRing(h.x, h.y, 12, AMULET_COL[h.amulet], .8);
  const inv = h.invuln > 0 && Math.floor(W.time * 14) % 2 === 0;
  const alpha = h.amulet === 'veil' && h.amuletT > 0 ? .5 : h.tele > 0 ? .5 : (inv ? .4 : 1);
  r.actor(h.x, h.y, h.z, (g, ox, oy) => h.rig.draw(g, ox, oy, view), { xray: { color: col }, flash: h.flash > 0 ? '#ff3030' : h.amulet === 'ironskin' && h.amuletT > 0 ? '#ffe070' : null, flashMix: .35, alpha, key: h });
  if (h.combo.busy) r.queue(h.x, h.y, 8, () => h.rig.drawSmear(r), {});
  if (h.queasy > 0) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 38); px.disc(g, sx, sy, 3, '#80c040'); });
  if (h.pickT > 0 && h.input) r.queue(h.x, h.y, 70, g => { const [sx, sy] = r.w(h.x, h.y, 60); E.font.text(g, padLabel(h, 'magic') + ': change fool', sx, sy - 6, '#ffd860', { align: 'center', outline: '#000', font: 'tiny' }); });
  if (h.bell > 0) r.queue(h.x, h.y, 50, g => { const [sx, sy] = r.w(h.x, h.y, 46); px.sprite(g, SPR.bell, sx - 8, sy - 10); });
  if (OPT.names && !away && W.heroes.length > 1) r.queue(h.x, h.y, 44, g => { const [sx, sy] = r.w(h.x, h.y, 42); E.font.text(g, 'P' + (h.slot + 1), sx, sy - 9, col, { align: 'center', outline: '#000', font: 'tiny' }); });
  if (away) r.queue(h.x, h.y, 30, g => { const [sx, sy] = r.w(h.x, h.y, 18 + h.downT * 8 % 20); px.disc(g, sx, sy, 2, '#d8e0ff'); px.disc(g, sx - 1, sy, 1, '#fff'); });
  if (h.reticle && !away) r.queue(h.reticle.x, h.reticle.y, 1, g => { const [sx, sy] = r.w(h.reticle.x, h.reticle.y, 0); px.line(g, sx - 4, sy, sx - 1, sy, col, 1); px.line(g, sx + 1, sy, sx + 4, sy, col, 1); px.line(g, sx, sy - 4, sx, sy - 1, col, 1); px.line(g, sx, sy + 1, sx, sy + 4, col, 1); });
}

function drawWorld(r) {
  const map = W.map, view = r.view, T = W.time;
  const L = game.lights;
  if (OPT.lighting) { L.enabled = true; L.ambient = W.kind === 'boss' ? .62 : .72; }
  map.drawFloor(r);
  drawFloorMarks(r);
  map.queueWalls(r);
  // doors: iron bars drawn over the door cells
  for (const d of W.doors) if (!d.open) for (const c of d.cells) r.queue((c.x + .5) * TS, (c.y + .5) * TS, 20, g => { const [sx, sy] = r.w((c.x + .5) * TS, (c.y + .5) * TS, 12); for (let i = -6; i <= 6; i += 3) px.rect(g, sx + i - 1, sy - 12, 2, 24, '#9a9aa8'); px.rect(g, sx - 8, sy - 2, 16, 2, '#6a6a78'); });
  else for (const c of d.cells) if (d.t < .4) r.queue((c.x + .5) * TS, (c.y + .5) * TS, 20, g => { const [sx, sy] = r.w((c.x + .5) * TS, (c.y + .5) * TS, 12 + d.t * 60); for (let i = -6; i <= 6; i += 3) px.rect(g, sx + i - 1, sy - 12, 2, 24, '#9a9aa8'); });
  for (const f of W.fakes) { const fx = (f.x + .5) * TS, fy = (f.y + .5) * TS; r.queue(fx, fy + 8, 12, g => { const t0 = REALMS[W.realm]; r.box(g, f.x * TS, f.y * TS, 0, (f.x + 1) * TS, (f.y + 1) * TS, 24, t0.top, t0.side); }, { solid: true }); }
  for (const d of W.decor) { if (d.type === 'torch') r.prop('torch', d.x, d.y, d.z, { light: true }); else r.prop(d.type, d.x, d.y, 0, { size: 1.2 }); }
  drawBeams(r);
  for (const it of W.items) drawItem(r, it);
  for (const g of W.gens) if (!g.dead || g.fade === undefined) {
    if (g.dead) continue;
    r.shadow(g.x, g.y, 9, .4);
    r.actor(g.x, g.y, W.kind === 'boss' && g.table ? 10 : 0, (gg, ox, oy) => drawGen(gg, ox, oy, g, T));
    if (g.ch === 'I') L.add(g.x, g.y, 8, 50, .8, { color: '#ff6020' });
  }
  for (const m of W.mons) drawMonster(r, m, view);
  for (const h of W.heroes) { drawHeroWorld(r, h, view); if (!h.down && !h.gone) L.add(h.x, h.y, 14, 120, .85, { color: '#ffe8c0' }); }
  for (const s of W.shots) { drawShot(r, s); L.add(s.x, s.y, 10, 22, .6, { color: s.kind === 'hex' ? '#c070ff' : '#fff0c0' }); }
  for (const f of W.foe) { drawFoe(r, f); if (f.kind === 'fire') L.add(f.x, f.y, 8, 40, .8, { color: '#ff8030' }); }
  for (const p of W.pads) L.add(p.x, p.y, 6, 30, .5, { color: '#a060ff' });
  for (const t of W.texts) r.queue(t.x, t.y, t.z + 20, g => { const [sx, sy] = r.w(t.x, t.y, t.z); E.font.text(g, t.str, sx, sy, t.col, { align: 'center', outline: '#000', font: 'tiny' }); });
  if (W.rings) for (const rg of W.rings) r.groundRing(rg.x, rg.y, rg.t * (rg.boss ? 90 : 260), rg.boss ? '#ff8040' : '#e8f0ff', Math.max(0, 1 - rg.t / .8));
  // the mouse in the world: hovering a monster or generator outlines it and names it
  const mh = W.heroes[0];
  if (mh && mh.reticle && !mh.down) {
    let best = null, bd = 12; for (const t of [...W.mons, ...W.gens]) { if (t.dead || (t.ch === 'y' && t.vis <= 0)) continue; const d = Math.hypot(t.x - mh.reticle.x, t.y - mh.reticle.y); if (d < bd) { bd = d; best = t; } }
    if (best) { r.groundRing(best.x, best.y, (best.r || 6) + 3, '#ffffff', .9); const nm = best.T ? best.T.name : best.G.name, rk = best.rank; r.queue(best.x, best.y, 60, g => { const [sx, sy] = r.w(best.x, best.y, 52); E.font.text(g, nm + '  RANK ' + rk, sx, sy, '#ffffff', { align: 'center', outline: '#000', font: 'tiny' }); }); }
  }
  if (DEV.botThoughts) for (const h of W.heroes) if (h.bot) r.queue(h.x, h.y, 80, g => { const [sx, sy] = r.w(h.x, h.y, 56); E.font.text(g, h.bot.think || '-', sx, sy - 10, '#80ff80', { align: 'center', outline: '#000', font: 'tiny' }); });
  if (DEV.flow && W.flow) { const me = W.heroes[0]; if (me) { const cx0 = Math.floor(me.x / TS), cy0 = Math.floor(me.y / TS); for (let dy = -6; dy <= 6; dy++) for (let dx = -8; dx <= 8; dx++) { const x = (cx0 + dx + .5) * TS, y = (cy0 + dy + .5) * TS, v = W.map.walkable(cx0 + dx, cy0 + dy) && W.flow.dir(x, y); if (v) r.groundArc && r.queue(x, y, 1, g => { const [sx, sy] = r.w(x, y, 0); px.line(g, sx, sy, sx + Math.round(v[0] * 5), sy + Math.round(v[1] * 3), '#40c0ff', 1); }); } } }
  if (DEV.hitboxes) { for (const m of W.mons) r.groundRing(m.x, m.y, m.r, '#ff0000', .9); for (const h of W.heroes) r.groundRing(h.x, h.y, h.r, '#00ff00', .9); for (const g of W.gens) r.groundRing(g.x, g.y, g.r, '#ffff00', .9); }
  // enter the hush: fog of hunger
  if (W.fog > 0) r.overlay(g => { px.blend(g, .25 * W.fog, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#601020')); });
}

// ---------- HUD ----------
function hudPanel(g, h, x, y, w, i) {
  const col = h.C.color, hp = Math.max(0, Math.round(h.hp));
  E.ui.box(g, x, y, w, 34, { bg: ['#14101e', '#0a0812'], border: h.down ? '#503040' : col, alpha: .85 });
  px.disc(g, x + 16, y + 17, 13, col);
  h.rig.drawPortrait(g, x + 4, y + 5, 25, { zoom: 2.4, turn: .4, bg: '#1a1424', cape: false, weapon: false, tint: h.down ? '#808080' : undefined });
  E.font.text(g, h.name2 || h.C.name, x + 33, y + 3, col, { font: 'tiny' });
  const big = hp > 9999 ? '9999+' : String(hp), low = hp < 200 && !h.down, flash = low && Math.floor(game.real * 4) % 2 === 0;
  if (h.down) E.font.text(g, 'EATEN', x + 33, y + 10, '#c06060', { scale: 1 });
  else E.font.text(g, big, x + 33, y + 10, flash ? '#ff3030' : hp < 400 ? '#ffd040' : '#ffffff', { scale: 2, outline: '#000' });
  if (h.down) { if (!W.net && W.heroes.some(o => !o.down)) E.font.text(g, 'RISE: ' + padLabel(h, 'fire'), x + 33, y + 22, '#ffd860', { font: 'tiny' }); else if (W.net) E.font.text(g, 'RISING...', x + 33, y + 22, '#ffd860', { font: 'tiny' }); }
  else {
    E.font.text(g, String(h.score), x + 33, y + 25, '#c8c0e0', { font: 'tiny' });
    const kx = x + w - 50; drawSmall(g, "key", kx, y + 25); E.font.text(g, String(h.keys), kx + 10, y + 26, '#fff0a0', { font: 'tiny' });
    drawSmall(g, "flask", kx + 22, y + 25); E.font.text(g, String(h.flasks), kx + 30, y + 26, '#d0a0ff', { font: 'tiny' });
    if (h.amulet && h.amuletT > 0) { px.sprite(g, amuSpr(h.amulet), x + w - 17, y + 2); E.ui.bar(g, x + w - 19, y + 19, 17, 2, h.amuletT / 20, AMULET_COL[h.amulet]); }
    let px0 = x + 33; for (const k in h.specials) { px.rect(g, px0, y + 31, 4, 2, SPECIAL_COL[k]); px0 += 6; }
  }
}
function drawSmall(g, name, x, y) { const s = SPR1[name]; if (!s) return; px.sprite(g, s, x, y, false); }

function drawHud(r) {
  const heroes = W.heroes.filter(h => !h.gone), n = Math.max(heroes.length, W.net ? heroes.length : 1);
  const corner = game.cornerArea && game.cornerArea();
  r.overlay(g => {
    const Wd = r.W, avail = corner && corner.y0 < 40 ? Math.floor(corner.x0) - 6 : Wd, pw = Math.min(118, Math.floor((avail - 12) / 4));
    const slots = heroes;
    const totalW = pw * Math.max(slots.length, 1) + 3 * (slots.length - 1), x0 = Math.max(2, Math.floor((avail - totalW) / 2));
    slots.forEach((h, i) => hudPanel(g, h, Math.max(2, x0 + i * (pw + 3)), 2, pw, i));
    if (!W.net && !W.attract && slots.length < 4 && RUN.mode !== 'net') {
      const jx = Math.max(2, x0 + slots.length * (pw + 3)), pad = game.input.lastDevice === 'gamepad';
      if (jx + pw < Wd) { E.ui.box(g, jx, 2, pw, 34, { bg: ['#14101e', '#0a0812'], border: '#3a3050', alpha: .6 }); const t = Math.floor(game.real * 2) % 2; E.font.text(g, (pad ? glyph('start') : '2') + ' TO JOIN', jx + pw / 2, 14, t ? '#ffd860' : '#a09070', { align: 'center', font: 'tiny' }); }
    }
    // floor name
    const topY = 38;
    if (W.kind === 'floor') E.font.text(g, 'FLOOR ' + W.meta.no + '  ' + W.meta.name, Wd / 2, topY, '#e8d8b0', { align: 'center', shadow: '#000', font: 'tiny' });
    if (W.kind === 'treasure') { E.font.text(g, String(Math.max(0, Math.ceil(W.hoard.t))), Wd / 2, topY + 4, W.hoard.t < 8 ? '#ff4040' : '#ffd860', { align: 'center', scale: 3, outline: '#000' }); }
    if (W.kind === 'boss') E.font.text(g, W.meta.name, Wd / 2, topY, '#ffd860', { align: 'center', shadow: '#000', font: 'tiny' });
    if (W.net && W.net.hud) W.net.hud(g, r);
    if (devAny()) E.font.text(g, 'DEV', 4, r.H - 10, '#ff4040', { font: 'tiny', outline: '#000' });
    // caption
    if (OPT.captions && W.speech.length) {
      const c = W.speech[0], sc = r.W >= 400 ? 2 : 1, lines = E.font.wrap(c.text, r.W - 40, { scale: sc }), a = Math.min(1, c.life * 2);
      lines.slice(0, 2).forEach((ln, i) => E.font.text(g, ln, r.W / 2, r.H - 44 - (lines.length - 1 - i) * 17 * (sc / 2) - 6, a > .5 ? '#ffe9b8' : '#a08860', { align: 'center', scale: sc, outline: '#1a0c00', shadow: '#000' }));
    }
    // stairs arrow
    const stairs = W.stairs[0];
    if (stairs && (W.imp1 || W.doorsOpen) && W.kind === 'floor') {
      const me = W.heroes.find(h => !h.down && h.local !== false); if (me) {
        const a = Math.atan2(stairs.y - me.y, stairs.x - me.x), dd = Math.hypot(stairs.x - me.x, stairs.y - me.y);
        if (dd > 150) { const cx = r.W / 2, cy = r.H / 2, ex = cx + Math.cos(a) * (r.W / 2 - 18), ey = cy + Math.sin(a) * (r.H / 2 - 40); const k = Math.floor(game.real * 3) % 2; px.poly(g, [[ex + Math.cos(a) * 8, ey + Math.sin(a) * 8], [ex + Math.cos(a + 2.5) * 7, ey + Math.sin(a + 2.5) * 7], [ex + Math.cos(a - 2.5) * 7, ey + Math.sin(a - 2.5) * 7]], k ? '#ffd860' : '#c09030'); }
      }
    }
    // big centre text
    if (W.contT >= 0 && !W.attract) {
      E.font.text(g, 'CONTINUE? ' + Math.max(0, W.contN), r.W / 2, r.H / 2 - 20, '#ff6050', { align: 'center', scale: 3, outline: '#000' });
      const h0 = W.heroes[0]; E.font.text(g, 'Press ' + padLabel(h0, 'fire') + ' to rise again', r.W / 2, r.H / 2 + 10, '#ffe9b8', { align: 'center', scale: 1, shadow: '#000' });
    }
    if (W.cardT > 0) drawFloorCard(g, r);
    if (W.countdown !== undefined && W.countdown > 0) E.font.text(g, String(Math.ceil(W.countdown)), r.W / 2, r.H / 2 - 20, '#ffffff', { align: 'center', scale: 5, outline: '#000' });
  });
}
function drawFloorCard(g, r) {
  const a = Math.min(1, W.cardT * 2, (5 - W.cardT) * 2 + 1);
  px.blend(g, .6 * Math.min(1, a), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05030a'));
  const Rm = W.R, cx = r.W / 2;
  E.font.title(g, W.kind === 'floor' ? 'FLOOR ' + W.meta.no : W.kind === 'treasure' ? 'TREASURE ROOM' : 'THE BANQUET', cx, 54, { scale: 3, colors: ['#fff0b0', '#e0a030', '#8a4a10'], align: 'center', outline: '#000' });
  E.font.text(g, W.meta.name, cx, 92, Rm.accent, { align: 'center', scale: 2, outline: '#000' });
  if (W.cardLine) { const ls = E.font.wrap(W.cardLine, r.W - 60, { scale: 1 }); ls.forEach((ln, i) => E.font.text(g, ln, cx, 116 + i * 10, '#e8d8b0', { align: 'center', shadow: '#000' })); }
  if (W.step > 0 && W.heroes.length) { W.heroes.forEach((h, i) => { const x = cx - (W.heroes.length - 1) * 55 + i * 110; E.font.text(g, h.C.name, x, 150, h.C.color, { align: 'center', font: 'tiny' }); E.font.text(g, h.score + ' pts', x, 160, '#fff', { align: 'center', font: 'tiny' }); E.font.text(g, h.kills + ' kills  ' + h.treasure + ' loot', x, 170, '#b0a8c8', { align: 'center', font: 'tiny' }); }); }
  if (!W.net) E.font.text(g, 'Press ' + padLabel(W.heroes[0], 'fire') + ' to start', cx, r.H - 28, Math.floor(game.real * 2) % 2 ? '#ffd860' : '#a08850', { align: 'center' });
}

/* ---- 40-front.js ---- */
/* Front-end screens: title, main menu, class select, how to play, high scores, about, game over, ending, touch notice, attract. */
const GD_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7', 'Pad0'], magic: ['Mouse2', 'KeyQ', 'KeyK', 'Pad3', 'Pad5'], plant: ['ShiftLeft', 'ShiftRight', 'Pad6'],
  view: ['KeyV'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1']
};
const EXIT = typeof __EXIT__ !== 'undefined' ? __EXIT__ : null;

// ---------- shared helpers ----------
let idle = 0, lastPtr = null;
function activity() {
  const I = game.input; let act = I.anyPressed();
  const m = I.move(); if (Math.hypot(m[0], m[1]) > .3) act = true;
  const pa = I.padAim; if (pa && Math.hypot(pa[0], pa[1]) > .3) act = true;
  const p = I.pointer && I.pointer(); if (p) { if (lastPtr && Math.hypot(p[0] - lastPtr[0], p[1] - lastPtr[1]) > 4) act = true; lastPtr = p.slice(); }
  for (const q of game.players) if (q !== I && q.anyPressed()) act = true;
  return act;
}
function frontIdle(dt, from) { if (activity()) idle = 0; else idle += dt; if (idle >= 10 && !game.paused) { idle = 0; game.go('attract', { from }); return true; } return false; }
const isTouchOnly = () => { try { return ('ontouchstart' in window || navigator.maxTouchPoints > 0) && !matchMedia('(pointer: fine)').matches && !(navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean)); } catch (e) { return false; } };
const hit = (p, x, y, w, h) => p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;
const blink = (spd = 2) => Math.floor(game.real * spd) % 2 === 0;

function titleBack(r, t) {
  r.sky(['#06040c', '#140c20', '#2a1228']);
  r.overlay(g => {
    const Wd = r.W, Hd = r.H, cx = Wd / 2;
    // the endless shaft: brick walls with torches, stairs spiralling down
    for (let i = 0; i < 12; i++) { const y = ((i * 22 + t * 30) % (Hd + 22)) - 10, wd = 70 + i * 3; px.rect(g, cx - wd - 60, y, 40, 14, i % 2 ? '#1c1424' : '#241830'); px.rect(g, cx + wd + 20, y, 40, 14, i % 2 ? '#241830' : '#1c1424'); }
    for (let k = 0; k < 4; k++) { const y = ((k * 70 + t * 40) % (Hd + 70)) - 20, x = k % 2 ? cx - 118 : cx + 110; r.glowDisc(g, x, y, 22, '#ff8030', .5); px.rect(g, x - 1, y, 3, 8, '#6a3a18'); px.disc(g, x, y - 2, 3, '#ffb040'); }
    // a gauntlet tumbling down
    const gy = ((t * 28) % (Hd + 60)) - 30, gx = cx + Math.sin(t * .8) * 40, rot = t * 1.1;
    const R = (x, y) => [Math.round(gx + x * Math.cos(rot) - y * Math.sin(rot)), Math.round(gy + x * Math.sin(rot) + y * Math.cos(rot))];
    px.poly(g, [R(-9, -4), R(9, -4), R(11, 8), R(-11, 8)].map(a => a), '#8a8a9a'); px.poly(g, [R(-9, -4), R(9, -4), R(8, 0), R(-8, 0)], '#c8c8d8');
    for (let i = -2; i <= 2; i++) px.poly(g, [R(i * 4 - 1.5, -4), R(i * 4 + 1.5, -4), R(i * 4 + 1, -13), R(i * 4 - 1, -13)], '#a0a0b0');
    px.poly(g, [R(-6, 8), R(6, 8), R(5, 15), R(-5, 15)], '#6a6a7a');
  });
}

// ---------- the title ----------
const SCENE_TITLE = {
  enter() { idle = 0; lastPtr = null; game.allowJoin(false); music('title'); RUN.active = false; },
  update(dt) {
    if (frontIdle(dt, 'title')) return;
    if (isTouchOnly()) return;
    if (game.input.pressed('start') || game.input.pressed('confirm') || game.input.clicked()) { game.audio.sfx('menu'); game.go('menu'); }
  },
  draw(r) {
    const t = game.real; titleBack(r, t);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, 'GAUNTLET', cx, 22, { scale: 3, colors: ['#fff6d0', '#e8b030', '#a05010', '#5a2808'], outline: '#000', depth: 3, depthColor: '#2a1004', align: 'center' });
      E.font.title(g, 'DOWN', cx, 56, { scale: 3, colors: ['#d8e4ff', '#7a90d0', '#3a4a90', '#1a2050'], outline: '#000', depth: 3, depthColor: '#0a1030', align: 'center' });
      E.font.text(g, 'a co-op dungeon crawl for 1-4 hungry fools', cx, 92, '#c8b8e0', { align: 'center', shadow: '#000' });
      CLASSES.forEach((c, i) => { const x = cx - 150 + i * 80; if (!c._r) c._r = c.rig(); c._r.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); c._r.drawPortrait(g, x, r.H - 78, 56, { zoom: 3, turn: .5 + Math.sin(t + i) * .1, bg: '#1a1228', frame: true }); E.font.text(g, c.name, x + 28, r.H - 18, c.color, { align: 'center', font: 'tiny' }); });
      if (isTouchOnly()) { E.font.text(g, 'Controller or keyboard required', cx, 108, '#ffd860', { align: 'center', scale: 2, shadow: '#000' }); }
      else E.font.text(g, 'PRESS ' + glyph('confirm').toUpperCase(), cx, 108, blink() ? '#ffe9b8' : '#8a7860', { align: 'center', scale: 2, shadow: '#000' });
      E.font.text(g, E.versionLabel ? E.versionLabel() : 'my-3D2dge', 6, r.H - 8, '#605878', { font: 'tiny' });
    });
  }
};

// ---------- the main menu ----------
let mainMenu = null;
const SCENE_MENU = {
  enter() {
    idle = 0; game.allowJoin(false);
    const d2 = !!E.store.get('gauntletdown-d2', false), items = [];
    if (d2) items.push({ label: 'CONTINUE TO DESCENT II', id: 'd2' });
    items.push({ label: 'START DESCENT', id: 'start' }, { label: 'HOW TO PLAY', id: 'how' }, { label: 'HIGH SCORES', id: 'scores' }, { label: 'SETTINGS', id: 'set' }, { label: 'ABOUT & CREDITS', id: 'about' });
    mainMenu = new E.Menu(game, items, { x: 'center', y: 118, box: true, onPick: (i, it) => this.pick(it.id), onCancel: () => game.go('title') });
  },
  pick(id) {
    game.audio.sfx('menu');
    if (id === 'start' || id === 'd2') { RUN.descent2 = id === 'd2'; game.go('select'); }
    else if (id === 'how') game.go('howto', { back: 'menu' });
    else if (id === 'scores') game.go('scores', { back: 'menu' });
    else if (id === 'set') game.menu('settings');
    else if (id === 'about') game.go('about');
  },
  update(dt) { if (frontIdle(dt, 'menu')) return; mainMenu.update(dt); },
  draw(r) { titleBack(r, game.real); r.overlay(g => { E.font.title(g, TITLE, r.W / 2, 22, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' }); }); mainMenu.draw(r); r.overlay(g => E.font.text(g, glyph('cancel') + ': back', 6, r.H - 10, '#7a7090', { font: 'tiny' })); }
};

// ---------- class select ----------
let sel = null;
const SCENE_SELECT = {
  enter() {
    idle = 0;
    sel = { slots: [], t: 0, starting: 0 };
    game.allowJoin({ max: 4, onJoin: (inp, n) => { addSlot(inp); } });
    for (const p of game.players) addSlot(p);
  },
  update(dt) {
    sel.t += dt;
    if (frontIdle(dt, 'select')) return;
    const P = game.input.pointer();
    for (const s of sel.slots) {
      const I = s.input;
      if (!s.locked) {
        if (I.repeat('left', .25, .12)) { s.idx = (s.idx + 3) % 4; skipTaken(s, -1); game.audio.sfx('menu'); }
        if (I.repeat('right', .25, .12)) { s.idx = (s.idx + 1) % 4; skipTaken(s, 1); game.audio.sfx('menu'); }
        if (I.pressed('confirm') || I.pressed('fire')) lockSlot(s);
        if (I === game.input && P && game.input.mouse.active) { const i = cardAt(P); if (i >= 0 && i !== s.idx && !takenBy(i, s)) s.idx = i; }
        if (I === game.input) { const c = game.input.clicked(); if (c) { const i = cardAt(c); if (i >= 0 && !takenBy(i, s)) { s.idx = i; lockSlot(s); } } }
      } else if (I.pressed('cancel')) { s.locked = false; game.audio.sfx('back'); }
    }
    if (game.input.pressed('cancel') && sel.slots.every(s => !s.locked)) { if (sel.slots.length > 1) { removeLastSlot(); } else { game.go('menu'); } return; }
    const ready = sel.slots.length && sel.slots.every(s => s.locked);
    if (ready && (sel.slots.some(s => s.input.pressed('start')) || sel.slots.some(s => s.input.pressed('confirm') && s.lockedFor > .4))) startRun();
    for (const s of sel.slots) if (s.locked) s.lockedFor = (s.lockedFor || 0) + dt;
    for (const c of CLASSES) if (c._r) c._r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
  },
  draw(r) {
    titleBack(r, game.real * .5);
    r.overlay(g => {
      const cx = r.W / 2; E.font.title(g, 'CHOOSE YOUR FOOL', cx, 8, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      const L = cardLayout(r);
      CLASSES.forEach((c, i) => {
        const [x, y, w, h] = L[i], owners = sel.slots.filter(s => s.idx === i), taken = sel.slots.find(s => s.locked && s.idx === i);
        const focus = owners.length > 0;
        E.ui.box(g, x, y, w, h, { bg: focus ? ['#2a2040', '#14101e'] : ['#1a1428', '#0c0a14'], border: taken ? taken.color : focus ? owners[0].color : '#3a3050' });
        if (!c._r) c._r = c.rig();
        c._r.drawPortrait(g, x + w / 2 - 24, y + 4, 48, { zoom: 3.2, turn: .5 + Math.sin(game.real * (focus ? 1.5 : .4) + i) * .35, bg: '#0e0a18', frame: false, cape: true });
        E.font.text(g, c.name, x + w / 2, y + 54, c.color, { align: 'center', outline: '#000' });
        E.font.text(g, c.who, x + w / 2, y + 63, '#a098b8', { align: 'center', font: 'tiny' });
        STAT_NAMES.forEach((sn, k) => { const yy = y + 72 + k * 9; E.font.text(g, sn, x + 4, yy, '#8a82a0', { font: 'tiny' }); for (let p = 0; p < 5; p++) px.rect(g, x + w - 5 * 7 - 3 + p * 7, yy, 5, 4, p < c.pips[k] ? c.color : '#2a2438'); });
        E.font.text(g, E.font.wrap(c.quip, w - 6, { font: 'tiny' }).join('\n'), x + w / 2, y + h - 28, '#c8b8e0', { align: 'center', font: 'tiny' });
        if (taken) E.font.text(g, taken.name + ' READY', x + w / 2, y + h - 6, taken.color, { align: 'center', font: 'tiny' });
        owners.forEach((s, k) => { if (!s.locked) { px.poly(g, [[x + 4 + k * 12, y + 2], [x + 14 + k * 12, y + 2], [x + 9 + k * 12, y + 9]], s.color); E.font.text(g, s.name, x + 4 + k * 12, y + 11, s.color, { font: 'tiny' }); } });
      });
      const ready = sel.slots.length && sel.slots.every(s => s.locked);
      const pad = game.input.lastDevice === 'gamepad';
      E.font.text(g, ready ? 'PRESS ' + glyph('start') + ' TO START THE DESCENT' : sel.slots.map(s => s.name + ': ' + (s.locked ? 'LOCKED' : glyph('confirm') + ' to lock')).join('   '), cx, r.H - 26, ready && blink() ? '#ffd860' : '#e8d8b0', { align: 'center', shadow: '#000' });
      if (sel.slots.length < 4) E.font.text(g, (pad ? glyph('start') : '2') + ' on another controller or keyboard half to JOIN', cx, r.H - 14, '#a098b8', { align: 'center', font: 'tiny' });
    });
  }
};
function cardLayout(r) { const n = 4, gap = 4, w = Math.floor((r.W - 20 - gap * 3) / 4), x0 = Math.floor((r.W - (w * 4 + gap * 3)) / 2); return CLASSES.map((c, i) => [x0 + i * (w + gap), 28, w, r.H - 28 - 38]); }
function cardAt(p) { const L = cardLayout(game.r); for (let i = 0; i < 4; i++) if (hit(p, ...L[i])) return i; return -1; }
function takenBy(i, me) { return sel.slots.some(s => s !== me && s.locked && s.idx === i); }
function skipTaken(s, dir) { for (let k = 0; k < 4 && takenBy(s.idx, s); k++) s.idx = (s.idx + dir + 4) % 4; }
function addSlot(inp) {
  if (sel.slots.some(s => s.input === inp)) return;
  const s = { input: inp, idx: 0, locked: false, color: E.PLAYER_COLORS[inp.player - 1], name: 'P' + inp.player };
  s.idx = [0, 1, 2, 3].find(i => !takenBy(i, s) && !sel.slots.some(o => o.idx === i)) || 0; sel.slots.push(s);
}
function removeLastSlot() { const s = sel.slots.pop(); if (s && s.input !== game.input) game.removePlayer(s.input); }
function lockSlot(s) { if (takenBy(s.idx, s)) return; s.locked = true; s.lockedFor = 0; game.audio.sfx('pickup'); Voice.hero({ cls: s.idx }, 'ready'); }
function startRun() {
  RUN.heroes = sel.slots.map((s, i) => { const h = makeHero(i, s.idx, s.input); h.name2 = null; return h; });
  RUN.step = 0; RUN.seed = Math.floor(Math.random() * 1e9); RUN.continues = 0; RUN.time = 0; RUN.mode = 'solo'; RUN.active = true; RUN.attract = false; RUN.tipsSeen = {}; RUN.diff = OPT.difficulty;
  game.go('play', { step: 0, fresh: true });
}

// ---------- how to play ----------
const HOWTO = [
  ['SHOOT AND SWING', 'Hold {fire} to shoot where you aim. Up close, you swing instead. {magic} breaks a Blast Flask: everything on screen takes it. Hold {plant} to stand still and turn.', ['axe', 'flask']],
  ['FOOD IS LIFE', 'Your life force drains every second. Roasts, loaves and cider put it back. Do not shoot the food: the Gaunt will say your name.', ['roast', 'loaf', 'cider']],
  ['GENERATORS', 'Urns, dens and hutches breed monsters forever. Destroy the generator and the horde stops. Hungerghosts cannot be struck, only shot.', ['skull']],
  ['KEYS AND DOORS', 'A key opens a whole run of doors. Walk into the bars. Snatchers steal keys and flasks: kill them to get it back.', ['key']],
  ['TREASURE AND SCORE', 'Gold, gems, chests and crowns are score. Each fool has their own tally. Whoever takes the stairs gets the bonus.', ['gold', 'gem', 'crown']],
  ['TRAPS AND TRICKS', 'Plates drop walls. Runes stun. Force fields hurt monsters too. Cracked walls break. Some walls are lies. Pads whisk you away.', ['amulet']],
  ['THE TITHE AND THE BELL', 'The Tithe drains 200 life and only magic ends it. Ring the Dinner Bell and every monster wants you for dinner.', ['bell']],
  ['TOGETHER', 'Up to four play on one screen. Fallen fools rise again with Fire. From floor six, shots stun friends. Stand on the stairs to descend together.', ['heart']]
];
let howPage = 0, howBack = 'menu';
const SCENE_HOWTO = {
  enter(d) { howPage = 0; howBack = d && d.back || 'menu'; idle = 0; },
  update(dt) {
    if (howBack === 'menu' && frontIdle(dt, 'howto')) return;
    const I = game.input;
    if (I.repeat('right', .3, .15) || I.pressed('confirm')) { howPage = Math.min(HOWTO.length - 1, howPage + 1); game.audio.sfx('menu'); if (I.pressed('confirm') && howPage === HOWTO.length - 1 && false) game.go(howBack); }
    if (I.repeat('left', .3, .15)) { howPage = Math.max(0, howPage - 1); game.audio.sfx('menu'); }
    const c = I.clicked(); if (c) { if (c[0] > game.r.W / 2) howPage = Math.min(HOWTO.length - 1, howPage + 1); else howPage = Math.max(0, howPage - 1); }
    if (I.pressed('cancel')) game.go(howBack);
  },
  draw(r) { titleBack(r, game.real * .4); r.overlay(g => drawHowPage(g, r, howPage)); }
};
function drawHowPage(g, r, howPage) {
    {
      const p = HOWTO[howPage], cx = r.W / 2;
      E.ui.box(g, 20, 14, r.W - 40, r.H - 28, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
      E.font.title(g, p[0], cx, 24, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      const txt = p[1].replace(/\{(\w+)\}/g, (m, a) => '[' + glyph(a) + ']');
      E.font.wrap(txt, r.W - 90, { scale: 1 }).forEach((ln, i) => E.font.text(g, ln, cx, 58 + i * 11, '#e8e0f8', { align: 'center', shadow: '#000' }));
      p[2].forEach((n, i) => { const x = cx - (p[2].length - 1) * 22 + i * 44; if (SPR[n]) px.sprite(g, SPR[n], x - 8, 130 + Math.sin(game.real * 3 + i) * 2); else if (n === 'axe') { px.line(g, x - 6, 140, x + 6, 132, '#8a6a3a', 2); px.rect(g, x + 2, 128, 8, 6, '#d8dce8'); } });
      if (howPage === 0) { const c = CLASSES[0]; if (!c._r) c._r = c.rig(); c._r.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); c._r.drawPortrait(g, 40, 120, 48, { zoom: 3, turn: .5, bg: '#14101e', frame: true }); }
      for (let i = 0; i < HOWTO.length; i++) px.rect(g, cx - HOWTO.length * 6 + i * 12, r.H - 44, 8, 4, i === howPage ? '#ffd860' : '#3a3050');
      E.font.text(g, '< >  page   ' + glyph('cancel') + ': back', cx, r.H - 32, '#a098b8', { align: 'center', font: 'tiny' });
    }
}

// ---------- high scores ----------
let MEM_SCORES = null;
const getScores = () => { const v = E.store.get('gauntletdown-scores', null); return v || MEM_SCORES || []; };
const qualifies = sc => sc > 0 && (getScores().length < 10 || sc > getScores()[getScores().length - 1].score);
function addScore(e) { const t = getScores().concat([e]).sort((a, b) => b.score - a.score).slice(0, 10); MEM_SCORES = t; E.store.set('gauntletdown-scores', t); return t.indexOf(e); }
let scoreBack = 'menu', scoreHi = -1;
function drawScores(g, r, hi) {
  const cx = r.W / 2, t = getScores();
  E.ui.box(g, 30, 12, r.W - 60, r.H - 24, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
  E.font.title(g, 'HIGH SCORES', cx, 20, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
  if (!t.length) E.font.text(g, 'NO SCORES YET. THE GAUNT IS PATIENT.', cx, 90, '#a098b8', { align: 'center' });
  t.forEach((s, i) => { const y = 46 + i * 15, col = i === hi ? (blink(4) ? '#ffffff' : '#ffd860') : i < 3 ? '#ffd860' : '#d8d0f0'; E.font.text(g, String(i + 1).padStart(2, ' ') + '.', 50, y, col); E.font.text(g, s.initials, 76, y, CLASSES[s.cls] ? CLASSES[s.cls].color : col); E.font.text(g, String(s.score), 150, y, col); E.font.text(g, 'FLOOR ' + s.floor, 230, y, '#a098b8', { font: 'tiny' }); if (s.conts) E.font.text(g, s.conts + ' cont', 280, y, '#a098b8', { font: 'tiny' }); });
}
const SCENE_SCORES = {
  enter(d) { scoreBack = d && d.back || 'menu'; scoreHi = d && d.hi !== undefined ? d.hi : -1; idle = 0; },
  update(dt) { if (scoreBack === 'menu' && frontIdle(dt, 'scores')) return; if (game.input.pressed('cancel') || game.input.pressed('confirm') || game.input.clicked()) game.go(scoreBack); },
  draw(r) { titleBack(r, game.real * .4); r.overlay(g => { drawScores(g, r, scoreHi); E.font.text(g, glyph('cancel') + ': back', r.W / 2, r.H - 22, '#a098b8', { align: 'center', font: 'tiny' }); }); }
};

// ---------- about and credits ----------
function aboutPages() {
  const X = EXIT || {}, S = X.sourceInformation || {}, pages = [];
  pages.push(['ABOUT GAUNTLETDOWN', ['An original co-op dungeon crawler for 1-4 players, inspired by the arcade classic Gauntlet.', 'Built on the my-3D2dge engine (' + (E.version || '?') + '): characters are 3D skeletons drawn as pixel art. All art, music, sound and voices are made in code.', 'Four original fools, six generators, eleven floors and a king who is very, very hungry.', 'Online: AI Hub sessions (shared world, 1-4 players). Offline: solo or couch co-op.']]);
  pages.push(['SOURCE INFORMATION', Object.keys(S).map(k => k.toUpperCase() + ': ' + S[k])]);
  const sec = (title, arr, qs) => pages.push([title, (arr || []).map((a, i) => (qs && qs[i] ? qs[i] + ' ' : '') + a)]);
  sec('TESTING FEEDBACK', X.testingFeedback, ['Issues caught?', 'Game breaking?', 'Most helpful test?', 'Least helpful test?']);
  sec('ENGINE FEEDBACK', X.engineFeedback, ['Liked most?', 'Stuck or guessed wrong?', 'Had to build?', 'Hardest part?', 'Changed?', 'Change one thing?']);
  sec('PROMPT FEEDBACK', X.promptFeedback, ['Liked most?', 'Confusing?', 'Hardest thing?', 'Would change?']);
  pages.push(['CREDITS', ['Design, code, art, music and voices: Claude (claude-sonnet-5-5), following a plan by claude-opus-5-5.', 'Engine: my-3D2dge. Online: AI Hub Session Protocol v1.', 'Not affiliated with any Gauntlet game: every hero, monster, floor, tune and line here is original.', 'Thank you for playing. Remember: eat something.']]);
  return pages;
}
let aboutP = 0, aboutPages_ = null, aboutScroll = 0;
const SCENE_ABOUT = {
  enter() { aboutP = 0; aboutPages_ = aboutPages(); aboutScroll = 0; idle = 0; },
  update(dt) {
    if (frontIdle(dt, 'about')) return;
    const I = game.input;
    if (I.repeat('right', .3, .15)) { aboutP = Math.min(aboutPages_.length - 1, aboutP + 1); aboutScroll = 0; game.audio.sfx('menu'); }
    if (I.repeat('left', .3, .15)) { aboutP = Math.max(0, aboutP - 1); aboutScroll = 0; game.audio.sfx('menu'); }
    if (I.repeat('down', .2, .05)) aboutScroll += 6; if (I.repeat('up', .2, .05)) aboutScroll = Math.max(0, aboutScroll - 6);
    const c = I.clicked(); if (c) aboutP = c[0] > game.r.W / 2 ? Math.min(aboutPages_.length - 1, aboutP + 1) : Math.max(0, aboutP - 1);
    if (I.pressed('cancel')) game.go('menu');
  },
  draw(r) {
    titleBack(r, game.real * .4);
    r.overlay(g => {
      const p = aboutPages_[aboutP], cx = r.W / 2;
      E.ui.box(g, 14, 10, r.W - 28, r.H - 20, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
      E.font.title(g, p[0], cx, 16, { scale: 1, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      let y = 36 - aboutScroll;
      for (const para of p[1]) for (const [i, ln] of E.font.wrap(String(para), r.W - 56, { scale: 1 }).entries()) { if (y > 28 && y < r.H - 36) E.font.text(g, ln, 24, y, i ? '#d0c8e8' : '#f0e8ff'); y += 9; if (i === E.font.wrap(String(para), r.W - 56, { scale: 1 }).length - 1) y += 4; }
      aboutMax = Math.max(0, y + aboutScroll - (r.H - 40));
      aboutScroll = Math.min(aboutScroll, Math.max(0, aboutMax));
      E.font.text(g, '< >  page ' + (aboutP + 1) + '/' + aboutPages_.length + '    up/down: scroll    ' + glyph('cancel') + ': back', cx, r.H - 22, '#a098b8', { align: 'center', font: 'tiny' });
    });
  }
};
let aboutMax = 0;

// ---------- game over (and initials) ----------
let ov = null;
const SCENE_OVER = {
  enter(d) {
    music('title'); idle = 0; game.allowJoin(false);
    ov = { queue: RUN.heroes.filter(h => qualifies(h.score)).map(h => ({ h, letters: [0, 0, 0], pos: 0, done: false })), t: 0, hi: -1, win: !!(d && d.win) };
    ov.cur = ov.queue.shift() || null;
    if (ov.cur) say_over('score');
  },
  update(dt) {
    ov.t += dt;
    if (ov.cur) {
      const c = ov.cur, I = c.h.input || game.input;
      if (I.repeat('up', .3, .1)) { c.letters[c.pos] = (c.letters[c.pos] + 1) % 27; game.audio.sfx('tick'); }
      if (I.repeat('down', .3, .1)) { c.letters[c.pos] = (c.letters[c.pos] + 26) % 27; game.audio.sfx('tick'); }
      if (I.pressed('right') && c.pos < 2) { c.pos++; game.audio.sfx('menu'); }
      if (I.pressed('left') && c.pos > 0) { c.pos--; game.audio.sfx('back'); }
      if (I.pressed('confirm') || I.pressed('fire')) { if (c.pos < 2) { c.pos++; game.audio.sfx('menu'); } else { const ini = c.letters.map(l => l === 26 ? ' ' : String.fromCharCode(65 + l)).join(''); ov.hi = addScore({ initials: ini, score: c.h.score, cls: c.h.cls, floor: Math.max(1, (PLAN[RUN.step] && PLAN[RUN.step].no) || RUN.maxFloor || 1), conts: c.h.contUsed || 0 }); game.audio.sfx('power'); ov.cur = ov.queue.shift() || null; } }
    } else if (ov.t > 1.5 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked() || ov.t > 25)) game.go('scores', { back: 'title', hi: ov.hi });
  },
  draw(r) {
    titleBack(r, game.real * .3);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, ov.win ? 'THE KING IS DINED UPON' : 'GAME OVER', cx, 20, { scale: 2, colors: ov.win ? ['#fff6d0', '#e8b030', '#a05010'] : ['#ffb0a0', '#e04030', '#601010'], outline: '#000', align: 'center' });
      E.font.text(g, ov.win ? 'THE DUNGEON IS QUIET. YOU ARE FULL.' : 'THE GAUNT IS FED.', cx, 52, '#e8d8b0', { align: 'center', shadow: '#000' });
      RUN.heroes.forEach((h, i) => { const x = cx - (RUN.heroes.length - 1) * 50 + i * 100; E.font.text(g, h.C.name, x, 70, h.C.color, { align: 'center', font: 'tiny' }); E.font.text(g, String(h.score), x, 80, '#fff', { align: 'center', scale: 2 }); E.font.text(g, h.kills + ' kills', x, 98, '#b0a8c8', { align: 'center', font: 'tiny' }); });
      if (ov.cur) {
        const c = ov.cur; E.font.text(g, c.h.C.name + ': NEW HIGH SCORE', cx, 122, c.h.C.color, { align: 'center' });
        for (let i = 0; i < 3; i++) { const ch = c.letters[i] === 26 ? '_' : String.fromCharCode(65 + c.letters[i]); E.font.text(g, ch, cx - 30 + i * 30, 138, i === c.pos ? (blink(6) ? '#fff' : '#ffd860') : '#c0b8d8', { scale: 3, outline: '#000' }); if (i === c.pos) { px.poly(g, [[cx - 26 + i * 30, 134], [cx - 18 + i * 30, 134], [cx - 22 + i * 30, 129]], '#ffd860'); px.poly(g, [[cx - 26 + i * 30, 164], [cx - 18 + i * 30, 164], [cx - 22 + i * 30, 169]], '#ffd860'); } }
        E.font.text(g, 'up/down: letter   ' + glyph('confirm') + ': next', cx, 180, '#a098b8', { align: 'center', font: 'tiny' });
      } else E.font.text(g, 'PRESS ' + glyph('confirm').toUpperCase(), cx, r.H - 40, blink() ? '#ffe9b8' : '#8a7860', { align: 'center', scale: 2 });
    });
  }
};
function say_over(k) { if (LINES[k]) Voice.gaunt(LINES[k]); }

// ---------- the ending ----------
let endT = 0;
const END_LINES = ['KING FAMISH IS NO MORE.', 'THE TABLE IS CLEARED. THE DUNGEON, EMPTY.', 'THE GAUNT SIGHS. IT WAS ONLY EVER LONELY.', 'BUT DESCENT II IS ALREADY SERVING.'];
const SCENE_ENDING = {
  enter() { music('victory'); endT = 0; RUN.won = true; E.store.set('gauntletdown-d2', true); Voice.gaunt('KING FAMISH IS NO MORE'); },
  update(dt) { endT += dt; if (endT > 3 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked())) { if (endT < 22) endT = Math.max(endT, 22); else game.go('over', { win: true }); } if (endT > 40) game.go('over', { win: true }); },
  draw(r) {
    r.sky(['#0a0614', '#201030', '#402050']);
    r.overlay(g => {
      const cx = r.W / 2;
      for (let i = 0; i < 60; i++) { const x = (E.hash2(i, 1) * r.W), y = ((E.hash2(i, 2) * r.H + endT * (4 + E.hash2(i, 3) * 10)) % r.H); px.dot(g, Math.floor(x), Math.floor(y), i % 3 ? '#a090c8' : '#ffe9b8'); }
      E.font.title(g, 'THE DESCENT IS DONE', cx, 16, { scale: 2, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      END_LINES.forEach((l, i) => { if (endT > 1.2 + i * 2.2) E.font.text(g, l, cx, 56 + i * 16, '#ffe9b8', { align: 'center', shadow: '#000' }); });
      if (endT > 11) {
        const y0 = r.H - (endT - 11) * 16;
        const rows = ['CREDITS', '', 'DESIGN AND CODE', 'Claude (claude-sonnet-5-5)', '', 'PLAN', 'claude-opus-5-5', '', 'ENGINE', 'my-3D2dge', '', 'ONLINE', 'AI Hub Session Protocol v1', '', 'HEROES'].concat(CLASSES.map(c => c.who + ' (' + c.name + ')'), ['', 'YOUR SCORES'], RUN.heroes.map(h => h.C.name + '  ' + h.score), ['', 'THANK YOU FOR PLAYING.', 'EAT SOMETHING.']);
        rows.forEach((t, i) => { const y = y0 + i * 12; if (y > 100 && y < r.H) E.font.text(g, t, cx, y, i === 0 || t === t.toUpperCase() && t ? '#ffd860' : '#e8e0f8', { align: 'center' }); });
      }
      E.font.text(g, 'DESCENT II UNLOCKED', cx, r.H - 12, blink(3) ? '#ffd860' : '#a08850', { align: 'center', font: 'tiny' });
    });
  }
};

// ---------- touch-only notice ----------
// (the title shows it; attract still runs because frontIdle is skipped there; see SCENE_TITLE)

/* ---- 50-play.js ---- */
/* The play scene, the attract mode, Dev Tools, and the game's start. */
const INTRO = {
  0: 'The Larder is where the food goes to wait. Wait with it. Mind the hungry ones.', 1: 'More halls. More hunger. The generators breed faster when watched.', 2: 'The Long Pantry. Pot-Lobbers live here. Duck. Then eat.',
  3: 'A hoard! Grab everything before the lid drops.', 4: 'The Ossuary: everyone here is on a diet. Permanently.', 5: 'Thieves lurk and a bell hangs unrung. Do not ring it. Ring it.', 6: 'The Tithe stalks the Gravy Crypt. Keep a flask. Keep two.',
  7: 'Another hoard. Gold does not taste of anything, but it scores.', 8: 'The Furnace: the kitchen of the kitchen. Mind the heat. Mind the gravy.', 9: 'The Last Simmer. Everything left is angry and warm.', 10: 'The king is at the head of the table. You are the main course.'
};
const DEVUI = { open: false, page: 0, i: 0, spawnType: 'n', spawnRank: 1, scroll: 0 };
let pendingJoin = [];

function startFloor(d) {
  const step = d.step || 0, P = PLAN[step];
  if (RUN.attract) RUN.seed = 4242;
  buildWorld(step, { players: RUN.heroes.length });
  W.heroes = RUN.heroes.slice();
  W.heroes.forEach(h => { h.shot = null; h.stairT = 0; h.combo.cancel(); h.bell = 0; h.local = true; h.gone = false; });
  placeHeroes(W.heroes, W.starts);
  W.allyStun = OPT.allyStun && (P.no >= 6 || RUN.descent2 || P.kind === 'boss' || P.kind === 'treasure' && step > 4);
  W.cardT = RUN.attract ? 0 : 5; W.cardLine = (P.kind === 'floor' && [0, 4, 8].includes(step) || P.kind === 'boss' ? REALMS[P.realm !== undefined ? P.realm : 3].line + ' ' : '') + (INTRO[step] || '');
  W.attract = !!RUN.attract;
  RUN.maxFloor = Math.max(RUN.maxFloor || 1, P.no || RUN.maxFloor || 1);
  if (W.allyStun && step === 5 + 0) say('stun', { force: true });
  game.cam.bounds = v => W && W.map ? W.map.bounds(v) : null;
  game.cam.smooth = .12;
  const hh = W.heroes.find(h => !h.down) || W.heroes[0];
  game.follow && game.follow(null);
  game.cam.frame(W.heroes, { margin: 64, zoom: [.5, .65] });
  game.setZoom && game.setZoom(.65);
  game.focus(hh.x, hh.y, 12); game.cam.snap = true;
  music(P.kind === 'boss' ? 'boss' : P.kind === 'treasure' ? 'hoard' : REALMS[P.realm].music);
  if (!W.attract) { if (step === 0) say('hint1', { again: true }); }
  for (const h of W.heroes) h.combo.cancel();
  if (RUN.attract) { for (const h of W.heroes) { h.bot = makeBot(true); } }
  else if (DEV.bot && W.heroes[0]) W.heroes[0].bot = makeBot(true);
  if (RUN.attract && P.kind === 'boss' && W.boss) { W.boss.hp = W.boss.maxhp * .6; W.boss.phase = 2; W.boss.state = 'idle'; }
}

function camStep() {
  const alive = W.heroes.filter(h => !h.down && !h.gone), list = alive.length ? alive : W.heroes.filter(h => !h.gone);
  if (!list.length) return;
  if (list.length === 1) { game.cam.frame(null); game.focus(list[0].x, list[0].y, 12); }
  else game.cam.frame(list, { margin: 64, zoom: [.45, .65] });
}

function addLocalHero(inp) {
  if (!W || RUN.mode === 'net' || W.attract || W.time < (W.noJoinUntil || 0)) { if (W && inp !== game.input && game.players.includes(inp) && W.time < (W.noJoinUntil || 0)) game.removePlayer(inp); return; }
  const taken = new Set(W.heroes.map(h => h.cls)), free = [0, 1, 2, 3].find(i => !taken.has(i));
  if (free === undefined) return;
  const h = makeHero(W.heroes.length, free, inp); h.local = true; h.name2 = null; h.pickT = 3.5;
  const near = W.heroes.find(o => !o.down) || W.heroes[0]; h.x = near.x + 8; h.y = near.y; h.invuln = 1.5;
  W.heroes.push(h); RUN.heroes = W.heroes;
  game.audio.sfx('rise'); W.texts.push({ x: h.x, y: h.y, z: 24, str: h.C.name, col: h.C.color, t: 0, life: 1.5 });
}

function playUpdate(dt) {
  if (!W) return;
  if (W.cardT > 0) {
    W.cardT -= dt; camStep(); animateAll(0);
    if (W.heroes.some(h => h.input && (h.input.pressed('fire') || h.input.pressed('confirm') || h.input.pressed('start'))) && W.cardT < 4.5) W.cardT = 0;
    if (W.cardT <= 0) { W.cardT = 0; }
    return;
  }
  if (DEVUI.open) { devUpdate(dt); camStep(); return; }
  for (const j of pendingJoin.splice(0)) addLocalHero(j);
  // class switch for a just-joined player
  for (const h of W.heroes) if (h.pickT > 0 && h.input) {
    h.pickT -= dt; const I = h.input, d = I.pressed('magic') ? 1 : 0; h.int.magic = false;
    if (d) { const taken = new Set(W.heroes.filter(o => o !== h).map(o => o.cls)); let c = h.cls; for (let k = 0; k < 4; k++) { c = (c + d + 4) % 4; if (!taken.has(c)) break; } if (c !== h.cls) { const o = { x: h.x, y: h.y }; Object.assign(h, { cls: c, C: CLASSES[c], rig: CLASSES[c].rig(), combo: new E.Combo(CLASSES[c].moves, { window: .45 }), name: CLASSES[c].name }); h.x = o.x; h.y = o.y; game.audio.sfx('menu'); } }
  }
  if (!W.descend && !W.gameOver) simStep(dt);
  else if (W.descend) { W.descend.t += dt; for (const m of W.mons) m.vx = m.vy = 0; if (W.descend.t > .9 && !W.leaving) leaveFloor(); }
  if (W.gameOver && !W.leaving) { W.leaving = true; game.go('over', {}); }
  animateAll(dt);
  for (const h of W.heroes) if (h.sound !== false) { if (h.hp < 200 && !h.down && h.local && Math.floor(W.time * 2) !== h.beatT) { h.beatT = Math.floor(W.time * 2); sfx('heart', { vol: .5 }); } }
  camStep();
  for (const h of W.heroes) if (h.hurtRaw > 0) { if (h.hurtRaw > 3) Voice.bark(h); h.hurtRaw = 0; }
}
function leaveFloor() {
  W.leaving = true; const d = W.descend;
  for (const h of W.heroes) h.floors++;
  if (d.to === -1) { game.go('ending', {}, { fade: 'white', seconds: .8 }); return; }
  RUN.step = d.to;
  game.go('play', { step: d.to }, { fade: 'iris', seconds: .6, at: { x: d.by.x, y: d.by.y, z: 8 } });
}

function playDraw(r) {
  if (!W) return;
  drawWorld(r); drawHud(r);
  if (DEVUI.open) drawDev(r);
}

const SCENE_PLAY = {
  pausable: true, view: 'threequarter', input: GD_INPUT, res: 'ps1', expand: true, propSize: 1.3, camera: { zoom: [.55, 1.5], start: .65, tall: 1.25 },
  enter(d) { RUN.attract = false; if (RUN.mode === 'net') return; game.allowJoin({ max: 4, onJoin: inp => pendingJoin.push(inp) }); startFloor(d || { step: 0 }); },
  update: playUpdate, draw: playDraw
};

// ---------- the attract mode ----------
const ATTRACT = [
  { kind: 'floor', step: 1, t: 25 }, { kind: 'floor', step: 5, t: 20 }, { kind: 'floor', step: 8, t: 15 }, { kind: 'floor', step: 10, t: 20 },
  { kind: 'scores', t: 6 }, { kind: 'prologue', t: 8 }, { kind: 'title', t: 4 }
];
let att = null;
function attractSeg() {
  const s = ATTRACT[att.i % ATTRACT.length]; att.seg = s; att.t = 0;
  if (s.kind === 'floor') {
    RUN.attract = true; RUN.descent2 = false; RUN.seed = 4242 + att.i; RUN.mode = 'solo';
    RUN.heroes = CLASSES.map((c, i) => { const h = makeHero(i, i, null); h.bot = makeBot(true); h.hp = 800; h.flasks = 3; return h; });
    startFloor({ step: s.step });
    for (const h of W.heroes) { h.bot = makeBot(true); h.hp = 800; h.flasks = 3; }
    W.director = 0;
    W.heroes.forEach(h => { h.local = true; });
    music(s.step === 10 ? 'boss' : s.step >= 8 ? 'furnace' : s.step >= 4 ? 'ossuary' : 'larder');
  } else { W = null; music(s.kind === 'title' ? 'title' : 'title'); }
}
const SCENE_ATTRACT = {
  pausable: false, view: 'threequarter', input: GD_INPUT, res: 'ps1', expand: true, propSize: 1.3,
  enter() { att = { i: 0, t: 0, ignore: .5 }; game.allowJoin(false); attractSeg(); },
  exit() { RUN.attract = false; W = null; DEV.bot = false; },
  update(dt) {
    att.ignore -= dt; att.t += dt;
    if (att.ignore < 0 && activity()) { RUN.attract = false; RUN.heroes = []; W = null; idle = 0; game.go('title', {}, { fade: .2 }); game.input.consumeAll(); return; }
    const s = att.seg;
    if (s.kind === 'floor' && W) {
      // a director keeps monsters coming when the screen is quiet
      W.director -= dt; const alive = W.mons.filter(m => !m.dead).length;
      if (W.director <= 0 && alive < 14 && W.kind !== 'boss') { W.director = 1.5; const h = W.heroes[Math.floor(Math.random() * 4)], a = rnd(TAU), x = h.x + Math.cos(a) * 130, y = h.y + Math.sin(a) * 130; if (!W.map.solidAt(x, y)) { const ch = pick(PLAN[W.step].mons.filter(c => c !== 'x')); const m = newMonster(ch, x, y, 2, { emerge: .4 }); W.mons.push(m); } }
      if (W.step === 5 && W.time > 2 && W.bellObj && !W.bellObj.rung) { const h = W.heroes[0]; ringBell(h); }
      if (W.step === 5 && W.time > 4 && !W.titheSpawned) spawnTithe();
      if (W.kind === 'boss' && W.boss) { W.boss.state = W.boss.state === 'sleep' ? 'idle' : W.boss.state; }
      for (const h of W.heroes) { h.hp = Math.max(h.hp, 300); h.flasks = Math.max(h.flasks, 1); }
      if (W.step === 8) for (const h of W.heroes) if (W.time < 3) h.hp = 800;
      if (!W.descend) simStep(dt); animateAll(dt); camStep();
      if (W.descend) W.descend = null;
    }
    if (att.t >= s.t) { att.i++; attractSeg(); }
  },
  draw(r) {
    const s = att.seg;
    if (s.kind === 'floor' && W) { drawWorld(r); drawHud(r); }
    else if (s.kind === 'scores') { titleBack(r, game.real * .4); r.overlay(g => drawScores(g, r, -1)); }
    else if (s.kind === 'prologue') {
      titleBack(r, game.real * .4);
      r.overlay(g => { const L = ['DEEP BELOW THE KING\'S TABLE, THE GAUNT IS HUNGRY.', 'EVERY FLOOR HE EATS A LITTLE MORE.', 'FOUR FOOLS HAVE COME TO FEED HIM SOMETHING ELSE.']; L.forEach((l, i) => { if (att.t > i * 2.2) E.font.text(g, l, r.W / 2, 60 + i * 24, '#ffe9b8', { align: 'center', shadow: '#000' }); }); });
    } else SCENE_TITLE.draw(r);
    r.overlay(g => { E.font.title(g, 'DEMO', 30, r.H - 24, { scale: 1, colors: ['#ffd860', '#a06010'], outline: '#000', align: 'center' }); if (blink(1.5)) E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 14, '#ffffff', { align: 'center', outline: '#000' }); });
  }
};

// ---------- Dev Tools ----------
function devRows() {
  const P = DEVUI.page, rows = [];
  const tog = (label, key) => rows.push({ label: label, val: () => DEV[key] ? 'ON' : 'off', act: () => { DEV[key] = !DEV[key]; DEV.touched = true; if (key === 'bot' && W.heroes[0]) W.heroes[0].bot = DEV.bot ? makeBot(true) : null; } });
  if (P === 0) {
    tog('God mode', 'god'); tog('Noclip', 'noclip'); tog('Infinite keys & flasks', 'infinite'); tog('Freeze monsters', 'freeze'); tog('One-hit kills', 'onehit'); tog('Generators off', 'gensOff'); tog('Show hitboxes', 'hitboxes'); tog('Show flow field', 'flow'); tog('Show net stats', 'netstats'); tog('Show bot thoughts', 'botThoughts');
    rows.push({ label: 'Time scale', val: () => 'x' + DEV.timeScale, act: d => { const o = [.25, .5, 1, 2]; DEV.timeScale = o[(o.indexOf(DEV.timeScale) + (d || 1) + 4) % 4]; DEV.touched = DEV.timeScale !== 1 || DEV.touched; } });
  } else if (P === 1) {
    PLAN.forEach((p, i) => rows.push({ label: p.kind === 'floor' ? 'Floor ' + p.no + ': ' + p.name : p.kind === 'treasure' ? 'Treasure room ' + (i < 5 ? 'I' : 'II') : 'Boss: King Famish', val: () => '', act: () => devWarp(i) }));
    rows.push({ label: 'Boss phase 2', val: () => '', act: () => { devWarp(10); setTimeout(() => { if (W.boss) { W.boss.hp = W.boss.maxhp * .6; bossPhaseCheck(W.boss); } }, 50); } });
    rows.push({ label: 'Boss phase 3', val: () => '', act: () => { devWarp(10); setTimeout(() => { if (W.boss) { W.boss.hp = W.boss.maxhp * .3; W.boss.phase = 2; bossPhaseCheck(W.boss); } }, 50); } });
    rows.push({ label: 'Ending', val: () => '', act: () => { DEVUI.open = false; game.go('ending'); } });
    rows.push({ label: 'Game over', val: () => '', act: () => { DEVUI.open = false; game.go('over', {}); } });
    rows.push({ label: 'Descent II (floor 1)', val: () => '', act: () => { RUN.descent2 = true; devWarp(0); } });
    rows.push({ label: 'Restart floor', val: () => '', act: () => devWarp(W.step) });
  } else if (P === 2) {
    const me = () => W.heroes.find(h => !h.down) || W.heroes[0];
    rows.push({ label: '+3 keys', val: () => '', act: () => W.heroes.forEach(h => h.keys = Math.min(heroLimit(h), h.keys + 3)) });
    rows.push({ label: '+3 flasks', val: () => '', act: () => W.heroes.forEach(h => h.flasks = Math.min(heroLimit(h), h.flasks + 3)) });
    rows.push({ label: 'Roast', val: () => '', act: () => dropItem('roast', me().x + 12, me().y) }); rows.push({ label: 'Spoiled stew', val: () => '', act: () => dropItem('stew', me().x + 12, me().y) });
    AMULETS.forEach(a => rows.push({ label: 'Amulet: ' + AMULET_NAMES[a], val: () => '', act: () => { const h = me(); h.amulet = a; h.amuletT = 20; } }));
    rows.push({ label: 'Every special potion', val: () => '', act: () => W.heroes.forEach(h => SPECIALS.forEach(s => h.specials[s] = true)) });
    rows.push({ label: '+1000 score', val: () => '', act: () => W.heroes.forEach(h => h.score += 1000) });
    rows.push({ label: 'Heal the party', val: () => '', act: () => W.heroes.forEach(h => { h.hp = 1000; if (h.down) heroRise(h, me()); }) });
    rows.push({ label: 'Spawn type', val: () => MON[DEVUI.spawnType].name, act: d => { const k = Object.keys(MON).filter(c => c !== 't' || true); DEVUI.spawnType = k[(k.indexOf(DEVUI.spawnType) + (d || 1) + k.length) % k.length]; } });
    rows.push({ label: 'Spawn rank', val: () => String(DEVUI.spawnRank), act: d => { DEVUI.spawnRank = (DEVUI.spawnRank + (d || 1) + 2) % 3 + 1; } });
    rows.push({ label: 'Spawn 5 here', val: () => '', act: () => { const h = me(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, m = newMonster(DEVUI.spawnType, h.x + Math.cos(a) * 50, h.y + Math.sin(a) * 50, DEVUI.spawnRank, { emerge: .4 }); if (!W.map.solidAt(m.x, m.y)) W.mons.push(m); } } });
    rows.push({ label: 'Spawn a generator', val: () => '', act: () => { const h = me(), ch = Object.keys(GEN)[Math.floor(rnd(6))], gd = GENDEF[ch], rk = DEVUI.spawnRank; W.gens.push({ ch, G: GEN[ch], x: h.x + 40, y: h.y, r: 7, rank: rk, rank0: rk, hp: Math.ceil(4 * rk * TUNE.generatorHp), maxhp: Math.ceil(4 * rk * TUNE.generatorHp), t: 1, kids: 0, flash: 0, id: W.gens.length, dead: false, breathe: 0 }); void gd; } });
    rows.push({ label: 'Kill all monsters', val: () => '', act: () => W.mons.forEach(m => { if (!m.dead && !m.isBoss) killMon(m, me()); }) });
    rows.push({ label: 'Destroy all generators', val: () => '', act: () => W.gens.forEach(g => damageGen(g, 999, me())) });
    rows.push({ label: 'Open every door', val: () => '', act: () => W.doors.forEach(d => openDoorGroup(d)) });
    rows.push({ label: 'Reveal secrets', val: () => '', act: () => W.fakes.forEach(f => f.found = 1) });
    rows.push({ label: 'Next impatience stage', val: () => '', act: () => { W.time = Math.max(W.time, W.imp1 ? (W.doorsOpen ? TUNE.impatience + 61 : TUNE.impatience + 1) : TUNE.impatience - 29); } });
    rows.push({ label: 'Start the attract mode', val: () => '', act: () => { DEVUI.open = false; game.go('attract'); } });
    rows.push({ label: 'Bot plays player 1', val: () => DEV.bot ? 'ON' : 'off', act: () => { DEV.bot = !DEV.bot; DEV.touched = true; W.heroes[0].bot = DEV.bot ? makeBot(true) : null; } });
  } else {
    for (const k in TUNE_DEF) { const [d, lo, hi, st, lab] = TUNE_DEF[k]; rows.push({ label: lab, slider: { k, lo, hi, st }, val: () => String(+TUNE[k].toFixed(2)), act: dir => { TUNE[k] = clamp(+(TUNE[k] + dir * st).toFixed(3), lo, hi); tuneSave(); DEV.touched = true; } }); }
    rows.push({ label: 'RESET TUNING TO DEFAULTS', val: () => '', act: () => { tuneReset(); } });
  }
  return rows;
}
const DEV_PAGES = ['CHEATS', 'WARP', 'GIVE & SPAWN', 'TUNING'];
function devWarp(step) { DEVUI.open = false; DEV.touched = true; RUN.step = step; if (W) for (const h of W.heroes) { h.down = false; if (h.hp < 300) h.hp = 700; } game.go('play', { step }, { fade: .2 }); }
function devUpdate(dt) {
  const I = game.input, rows = devRows(); DEVUI.age = (DEVUI.age || 0) + dt; if (DEVUI.age < .25) { I.consumeAll(); return; } DEVUI.i = clamp(DEVUI.i, 0, rows.length - 1);
  const vis = 10;
  if (I.repeat('up', .3, .08)) { DEVUI.i = (DEVUI.i + rows.length - 1) % rows.length; game.audio.sfx('tick'); }
  if (I.repeat('down', .3, .08)) { DEVUI.i = (DEVUI.i + 1) % rows.length; game.audio.sfx('tick'); }
  if (DEVUI.i < DEVUI.scroll) DEVUI.scroll = DEVUI.i; if (DEVUI.i >= DEVUI.scroll + vis) DEVUI.scroll = DEVUI.i - vis + 1;
  const row = rows[DEVUI.i];
  if (I.pressed('magic') || I.pressed('start') && false) { DEVUI.page = (DEVUI.page + 1) % DEV_PAGES.length; DEVUI.i = 0; DEVUI.scroll = 0; }
  const ptr = I.pointer(), clk = I.clicked();
  if (ptr && I.mouse.active) { const r = game.r; for (let k = 0; k < vis; k++) { const idx = DEVUI.scroll + k; if (idx < rows.length && hit(ptr, 20, 40 + k * 15, r.W - 40, 14)) DEVUI.i = idx; } }
  if (clk) { const r = game.r; for (let k = 0; k < DEV_PAGES.length; k++) if (hit(clk, 20 + k * 90, 22, 86, 14)) { DEVUI.page = k; DEVUI.i = 0; DEVUI.scroll = 0; return; } for (let k = 0; k < vis; k++) { const idx = DEVUI.scroll + k; if (idx < rows.length && hit(clk, 20, 40 + k * 15, r.W - 40, 14)) { DEVUI.i = idx; (rows[idx].slider ? () => rows[idx].act(1) : rows[idx].act)(); } } }
  if (I.pressed('confirm') || I.pressed('fire')) { if (row.slider) row.act(1); else row.act(1); game.audio.sfx('menu'); }
  if (I.repeat('right', .3, .06)) { if (row.slider) row.act(1); else if (row.val && row.val() !== '' && !/^[0-9.x]+$/.test('')) row.act(1); }
  if (I.repeat('left', .3, .06)) { if (row.slider) row.act(-1); else if (row.val && row.val() !== '') row.act(-1); }
  if (I.pressed('cancel') || I.pressed('pause')) { DEVUI.open = false; game.audio.sfx('back'); I.consumeAll(); }
}
function drawDev(r) {
  const rows = devRows(); r.overlay(g => {
    px.blend(g, .8, 'normal', () => px.rect(g, 8, 8, r.W - 16, r.H - 16, '#08060e'));
    E.ui.box(g, 8, 8, r.W - 16, r.H - 16, { bg: ['#14101e', '#0a0812'], border: '#ff6040', alpha: .9 });
    E.font.text(g, 'DEV TOOLS', 20, 12, '#ff6040', { outline: '#000' });
    DEV_PAGES.forEach((p, k) => { E.font.text(g, p, 20 + k * 90, 24, k === DEVUI.page ? '#ffd860' : '#7a7090', { font: 'tiny' }); if (k === DEVUI.page) px.rect(g, 20 + k * 90, 32, E.font.width(p, { font: 'tiny' }), 1, '#ffd860'); });
    for (let k = 0; k < 10; k++) {
      const idx = DEVUI.scroll + k, row = rows[idx]; if (!row) break; const y = 40 + k * 15, on = idx === DEVUI.i;
      if (on) px.rect(g, 18, y - 1, r.W - 36, 13, '#2a2040');
      E.font.text(g, row.label, 24, y + 2, on ? '#ffffff' : '#c0b8d8', { font: 'tiny' });
      if (row.slider) { const s = row.slider, u = (TUNE[s.k] - s.lo) / (s.hi - s.lo); px.rect(g, r.W - 150, y + 4, 90, 3, '#2a2438'); px.rect(g, r.W - 150, y + 4, 90 * u, 3, on ? '#ffd860' : '#a08850'); px.rect(g, r.W - 150 + 90 * u - 1, y + 1, 3, 9, '#fff'); }
      E.font.text(g, row.val(), r.W - 24, y + 2, '#ffd860', { align: 'right', font: 'tiny' });
    }
    E.font.text(g, 'up/down: pick   left/right: change   ' + glyph('confirm') + ': do   ' + glyph('magic') + ': next page   ' + glyph('cancel') + ': close', r.W / 2, r.H - 20, '#a098b8', { align: 'center', font: 'tiny' });
  });
}

/* ---- 60-net.js ---- */
/* AI Hub sessions: Session Protocol v1, shared world. The host's copy runs the sim; clients send their hero and draw the world they are sent.
   Messages are compact JSON: me (client->host, unreliable, 12/s), act (reliable), s (host->all snapshot, unreliable, 10/s), e (reliable event batches). */
const NET = { info: null, host: false, server: false, me: 0, phase: 'boot', card: null, ready: false, more: false, inbox: [], evq: [], snapT: 0, meT: 0, evT: 0, serial: 0, actN: 0, over: null, clock: 0, snaps: [], menu: { open: false, i: 0 }, stats: { out: 0, in: 0, bytes: 0, rate: 0 }, lastActN: {}, tokens: 40, tokenT: 0, endShown: false, limit: 360000 };
const CH_IDX = 'gnoiyxtK', CH_OF = i => CH_IDX[i];
const AMU_IDX = a => a ? AMULETS.indexOf(a) + 1 : 0;
const send = (data, o) => { NET.tokens -= 1; try { const ok = AIHub.send(data, o); NET.stats.out++; return ok !== false; } catch (e) { return false; } };

function netScenes() { return { netboot: SCENE_NETBOOT, netcard: SCENE_NETCARD, netplay: SCENE_NETPLAY }; }

const SCENE_NETBOOT = {
  pausable: false, input: GD_INPUT, res: 'ps1', expand: true, view: 'threequarter',
  async enter() {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (!info) { game.go('title', {}, { fade: 0 }); return; }
    NET.info = info; NET.host = info.isHost; NET.server = !!info.server; NET.me = info.me; NET.limit = info.limitMs || 360000;
    RUN.mode = 'net'; RUN.seed = info.seed || 1; RUN.descent2 = false; RUN.attract = false; RUN.tipsSeen = {};
    RUN.heroes = info.players.map((pl, i) => { const h = makeHero(pl.id, pl.id % 4, null); h.local = pl.id === info.me && !NET.server; h.name2 = String(pl.name || 'P' + (pl.id + 1)).replace(/[^\x20-\x7e]/g, '?').slice(0, 10); h.hubColor = pl.color; h.hp = 700; h.puppet = !NET.host && !h.local; h.remote = NET.host && pl.id !== info.me; h.netId = pl.id; h.input = h.local ? game.input : null; return h; });
    game.settings.set && game.settings.set('glyphs', game.settings.glyphs === 'auto' ? 'playstation' : game.settings.glyphs);
    netBuildFloor(0);
    AIHub.on('card', c => { NET.card = c; });
    AIHub.on('start', () => { NET.phase = 'play'; game.go('netplay', {}, { fade: 0 }); });
    AIHub.on('message', (d, from) => { NET.inbox.push([d, from]); });
    AIHub.on('leave', ({ id }) => { const h = W && W.heroes.find(x => x.netId === id); if (h) { h.gone = true; h.down = true; } if (NET.host && W && W.heroes.every(x => x.gone)) netFinish(); });
    AIHub.on('time-up', () => { if (NET.host) netFinish(); });
    AIHub.on('end', e => { NET.over = e; NET.phase = 'end'; game.input.clear && game.input.clear(); game.audio.stopMusic(.2); game.audio.mute(true); });
    AIHub.ready(); NET.ready = true; game.go('netcard', {}, { fade: 0 });
  },
  update() { return; }, draw(r) { r.sky(['#05030a', '#140c20']); }
};

// ---------- floors in a session ----------
function netBuildFloor(step) {
  NET.serial++;
  buildWorld(step, { players: RUN.heroes.length });
  W.net = { host: NET.host, server: NET.server, event: netEvent, onSay: (k, slot, text) => netEvent(['say', k, slot, text]), allDown: () => { W.allDownT = (W.allDownT || 0) + 1; }, hud: netHud };
  W.heroes = RUN.heroes; W.cardT = 0; W.attract = false;
  RUN.step = step; W.serial = NET.serial;
  placeHeroes(W.heroes, W.starts);
  W.heroes.forEach(h => { h.down = false; h.stairT = 0; h.combo.cancel(); h.gone = h.gone || false; h.bell = 0; if (step > 0 && h.hp < 250) h.hp = 250; });
  W.allyStun = false; game.cam.bounds = v => W && W.map ? W.map.bounds(v) : null; game.cam.smooth = .12;
  const me = W.heroes.find(h => h.local); if (me) { game.cam.frame && game.cam.frame(null); game.focus(me.x, me.y, 12); game.cam.snap = true; game.setZoom && game.setZoom(.65); }
  if (!NET.server) music(PLAN[step].kind === 'boss' ? 'boss' : PLAN[step].kind === 'treasure' ? 'hoard' : REALMS[PLAN[step].realm].music);
  W.net.puppets = new Map(); showCaption('FLOOR ' + (PLAN[step].no || '') + '  ' + PLAN[step].name, 2);
  RUN.heroes.forEach(h => { h.floors = h.floors || 0; });
}
function netEvent(e) { NET.evq.push(e); }

// ---------- the card ----------
const SCENE_NETCARD = {
  pausable: false, input: GD_INPUT, res: 'ps1', expand: true, view: 'threequarter',
  update(dt) {
    NET.clock += dt;
    if (NET.server) return;
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('start') || I.pressed('fire')) { AIHub.answer('ready'); NET.myReady = true; game.audio.sfx('menu'); }
    if (I.pressed('magic') || (I.mouse && 0)) { AIHub.answer('more'); game.audio.sfx('menu'); }
    const c = I.clicked(); if (c) { const R = game.r; if (c[0] > R.W / 2) AIHub.answer('more'); else AIHub.answer('ready'); }
    if (NET.phase === 'play') return;
  },
  draw(r) {
    titleBack(r, NET.clock);
    r.overlay(g => {
      const cx = r.W / 2, c = NET.card || {}, info = NET.info;
      E.font.title(g, TITLE, cx, 10, { scale: 3, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
      E.font.text(g, 'ROUND ' + (info ? info.round : 1), cx, 44, '#d8c8f0', { align: 'center' });
      if (info) info.players.forEach((pl, i) => { const n = info.players.length, x = cx - (n - 1) * 52 + i * 104, h = RUN.heroes[i], rd = (c.ready || []).includes(pl.id); if (!h) return; h.rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); h.rig.drawPortrait(g, x - 22, 58, 44, { zoom: 3, turn: .5, bg: '#14101e', frame: true }); E.font.text(g, h.name2, x, 106, h.hubColor || h.C.color, { align: 'center', font: 'tiny' }); E.font.text(g, rd ? 'READY' : '...', x, 116, rd ? '#80ff80' : '#706890', { align: 'center', font: 'tiny' }); if (pl.id === info.me) px.rect(g, x - 24, 56, 48, 1, '#fff'); });
      E.font.text(g, 'Most points when the clock runs out: treasure, kills, stairs. Don\'t starve.', cx, 134, '#ffe9b8', { align: 'center', shadow: '#000' });
      if (!NET.server) E.font.text(g, 'Move ' + glyphList('left') + '  Aim ' + (game.input.lastDevice === 'gamepad' ? 'right stick' : 'mouse') + '  Fire ' + glyph('fire') + '  Magic ' + glyph('magic') + '  Plant ' + glyph('plant'), cx, 150, '#c8b8e0', { align: 'center', font: 'tiny' });
      const left = c.paused ? 'PAUSED' : c.left != null ? Math.ceil(c.left / 1000) + 's' : c.starting ? 'STARTING' : '';
      E.font.text(g, left, cx, 168, c.paused ? '#ffd860' : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
      if (!NET.server) { E.ui.box(g, cx - 120, r.H - 40, 110, 24, { bg: ['#1a3a1a', '#0c200c'], border: '#60c060' }); E.font.text(g, 'READY: ' + glyph('confirm'), cx - 65, r.H - 32, '#c0ffc0', { align: 'center', font: 'tiny' }); E.ui.box(g, cx + 10, r.H - 40, 110, 24, { bg: ['#3a3a1a', '#20200c'], border: '#c0c060' }); E.font.text(g, 'MORE TIME: ' + glyph('magic') + (c.asked ? ' (asked)' : ''), cx + 65, r.H - 32, '#ffffc0', { align: 'center', font: 'tiny' }); }
      else E.font.text(g, 'HOSTING', cx, r.H - 30, '#a098b8', { align: 'center' });
    });
  }
};
const glyphList = a => game.input.label ? game.input.label(a) : a;

// ---------- play ----------
const SCENE_NETPLAY = {
  pausable: false, input: GD_INPUT, res: 'ps1', expand: true, view: 'threequarter', propSize: 1.3,
  enter() { NET.phase = 'play'; },
  update: netUpdate, draw: netDrawScene
};

function netUpdate(dt) {
  if (!W) return;
  const t = AIHub.time();
  // inbox
  for (const [d, from] of NET.inbox.splice(0)) netReceive(d, from);
  NET.tokenT += dt; if (NET.tokenT > 1 / 20) { NET.tokens = Math.min(40, NET.tokens + NET.tokenT * 20); NET.tokenT = 0; }
  if (NET.phase === 'end') { game.input.clear && game.input.clear(); return; }
  W.countdown = t < 0 && isFinite(t) ? -t / 1000 : undefined;
  const live = t >= 0 && isFinite(t);
  if (NET.menu.open) { netMenuUpdate(); const me = W.heroes.find(h => h.local); if (me) { me.int.mx = me.int.my = 0; me.int.fire = false; } }
  else if (!NET.server && (game.input.pressed('pause') && !(game.input.down && false))) NET.menu.open = true;
  const me = W.heroes.find(h => h.local);
  if (NET.host) {
    if (live && !W.descend) { for (const h of W.heroes) if (h.remote && h.netp) h.netp.age += dt; if (NET.menu.open && me) { me.int.mx = me.int.my = me.int.ay = 0; } simStep(dt); }
    else if (W.descend) { W.descend.t += dt; if (W.descend.t > .8 && !W.leaving) netLeaveFloor(); }
    animateAll(dt);
    if (live && !W.descend) netHostDone();
    NET.snapT += dt; if (NET.snapT >= .1) { NET.snapT = 0; netSendSnapshot(); }
    NET.evT += dt; if (NET.evT >= .125 && NET.evq.length) { NET.evT = 0; send({ t: 'e', e: NET.evq.splice(0, 40) }); }
  } else {
    clientStep(dt, live, me);
  }
  // camera and effects
  if (me) { game.cam.frame && game.cam.frame(null); game.focus(me.x, me.y, 12); }
  if (W.rings) { for (const r of W.rings) r.t += dt; W.rings = W.rings.filter(r => r.t < .8); }
  for (const tx of W.texts) { tx.t += dt; tx.z += 18 * dt; } W.texts = W.texts.filter(x => x.t < tx_life(x));
  narratorStepClient(dt);
  NET.stats.rate = NET.stats.rate * .98 + NET.stats.in * .02;
}
const tx_life = x => x.life;
function narratorStepClient(dt) { if (W.net.host) return; const S = W.speech; if (S.length) { S[0].life -= dt; if (S[0].life <= 0) S.shift(); } }

// ----- host: gather and send -----
function netSendSnapshot() {
  const hs = W.heroes.filter(h => !h.gone), R = [];
  const aoi = (x, y) => hs.some(h => !h.down && Math.abs(h.x - x) < 17 * TS && Math.abs(h.y - y) < 12 * TS);
  const H = W.heroes.map(h => [h.netId, Math.round(h.x), Math.round(h.y), Math.round(Math.atan2(h.aim[1], h.aim[0]) * 100), Math.round(h.hp), h.score, h.keys, h.flasks, (h.down ? 1 : 0) | (h.firing ? 2 : 0) | (h.int.plant ? 4 : 0) | (h.stun > 0 ? 8 : 0) | (h.queasy > 0 ? 16 : 0) | (h.bell > 0 ? 32 : 0) | (h.tele > 0 ? 64 : 0), AMU_IDX(h.amulet), Math.round(h.amuletT), h.kills, h.treasure, h.gone ? 1 : 0]);
  let M = W.mons.filter(m => !m.dead && aoi(m.x, m.y)).map(m => [m.id, CH_IDX.indexOf(m.ch), m.rank, Math.round(m.x), Math.round(m.y), Math.round(m.facing * 100), (m.tell > 0 ? 1 : 0) | (m.ch === 'y' && m.vis <= 0 ? 2 : 0) | (m.emerge > 0 ? 4 : 0) | (m.flash > 0 ? 8 : 0)]);
  if (M.length > 150) M = M.slice(0, 150);
  const P = W.foe.filter(f => aoi(f.x, f.y)).map(f => f.kind === 'pot' ? [0, Math.round(f.x), Math.round(f.y), Math.round(f.z), Math.round(f.tx), Math.round(f.ty), Math.round(f.sx), Math.round(f.sy), +(f.t / f.T).toFixed(2)] : [1, Math.round(f.x), Math.round(f.y), Math.round(f.z), Math.round(f.vx), Math.round(f.vy)]).slice(0, 40);
  const S = W.shots.slice(0, 60).map(s => [Math.round(s.x), Math.round(s.y), Math.round(s.a * 100), s.kind === 'axe' ? 0 : s.kind === 'javelin' ? 1 : s.kind === 'arrow' ? 2 : 3]);
  const G = W.gens.map(g => [g.id, g.dead ? 0 : g.rank, Math.round(g.hp)]);
  const B = W.boss ? [Math.round(W.boss.hp), W.boss.phase, W.boss.dead ? 1 : 0, W.boss.state === 'sleep' ? 0 : 1] : 0;
  const msg = { t: 's', at: Math.round(AIHub.time()), q: W.serial, h: H, m: M, p: P, s: S, g: G, b: B, w: Math.round(W.time), f: W.fog > 0 ? 1 : 0, z: W.menuHero ? W.menuHero.netId : -1 };
  const str = JSON.stringify(msg); NET.stats.bytes = str.length;
  if (str.length > 12000) { msg.m = msg.m.slice(0, 40); msg.s = []; }
  send(msg, { reliable: false });
}
function netHostDone() {
  const hs = W.heroes.filter(h => !h.gone);
  if (hs.length && hs.every(h => h.down)) { NET.allDownT = (NET.allDownT || 0) + 1 / 120; if (NET.allDownT > 4) netFinish(); } else NET.allDownT = 0;
}
function netLeaveFloor() {
  W.leaving = true; const d = W.descend;
  for (const h of W.heroes) h.floors++;
  if (d.to === -1) { netEvent(['over']); netFinish(); return; }
  const by = d.by.netId;
  netBuildFloor(d.to);
  netEvent(['floor', d.to, NET.serial, by]); NET.evT = 1; // send soon
}
let finishing = false;
function netFinish() {
  if (finishing || !NET.host) return; finishing = true;
  const hs = RUN.heroes.slice(), scores = {}, stats = {};
  hs.forEach(h => { scores[h.netId] = h.score; stats[h.netId] = { Kills: h.kills, Treasure: h.treasure, Food: h.food, Floors: h.floors }; });
  const order = hs.slice().sort((a, b) => b.score - a.score), standings = []; let last = null;
  for (const h of order) { if (last !== null && h.score === last) standings[standings.length - 1].push(h.netId); else standings.push([h.netId]); last = h.score; }
  const best = (k, title, detail) => { let b = null; for (const h of hs) if ((h[k] || 0) > (b ? b[k] : 0)) b = h; return b ? { id: b.netId, title, detail: detail(b) } : null; };
  const awards = [best('food', 'Glutton', h => h.food + ' meals'), best('gensKilled', 'Generator Buster', h => h.gensKilled + ' generators'), best('shotFood', 'Shot the Supper', h => h.shotFood + ' dinners shot'), best('floors', 'Stair Finder', h => h.floors + ' floors')].filter(Boolean);
  try { AIHub.finish({ standings, scores, stats, awards }); } catch (e) { game.fail && game.fail('finish', e); }
}

// ----- receiving -----
function netReceive(d, from) {
  NET.stats.in++;
  if (!d || !d.t) return;
  if (NET.host) {
    const h = W.heroes.find(x => x.netId === from); if (!h) return;
    if (d.t === 'me') { if (d.q !== W.serial) return; const nx = d.x, ny = d.y; if (!W.map.solidAt(nx, ny)) h.netp = { x: nx, y: ny, age: 0 }; h.int.ax = Math.cos(d.a / 100); h.int.ay = Math.sin(d.a / 100); h.int.fire = !!d.f; h.int.plant = !!d.p; h.int.aimed = true; h.aim = [h.int.ax, h.int.ay]; h.netView = d.v; }
    else if (d.t === 'act' && d.k === 'magic') { if (d.n !== NET.lastActN[from]) { NET.lastActN[from] = d.n; h.view = d.v; useFlask(h); } }
  } else if (d.t === 's') { if (d.q === W.serial) netApplySnap(d); else if (d.q > W.serial) NET.pendingSnap = d; }
  else if (d.t === 'e') for (const e of d.e) netApplyEvent(e);
}
function netApplySnap(d) {
  NET.snaps.push(d); if (NET.snaps.length > 3) NET.snaps.shift();
  NET.lastSnapAt = game.real; W.time = d.w; W.fog = d.f ? 1 : 0;
  for (const e of d.h) {
    const h = W.heroes.find(x => x.netId === e[0]); if (!h) continue;
    h.hp = e[4]; h.score = e[5]; h.keys = e[6]; h.flasks = e[7]; const fl = e[8]; const wasDown = h.down; h.down = !!(fl & 1); if (h.down && !wasDown) { h.downT = 0; sfx('die', { vol: .5 }); }
    h.stun = fl & 8 ? .1 : 0; h.queasy = fl & 16 ? 1 : 0; h.bell = fl & 32 ? 5 : 0; h.amulet = e[9] ? AMULETS[e[9] - 1] : null; h.amuletT = e[10]; h.kills = e[11]; h.treasure = e[12]; h.gone = !!e[13];
    h.firing = !!(fl & 2); h.int.plant = !!(fl & 4); h.int.fire = h.firing;
    if (!h.local) { h.tx = e[1]; h.ty = e[2]; h.aim = [Math.cos(e[3] / 100), Math.sin(e[3] / 100)]; if (h.x === 0 && h.y === 0) { h.x = h.tx; h.y = h.ty; } }
    else if (Math.hypot(h.x - e[1], h.y - e[2]) > 36) { h.x = e[1]; h.y = e[2]; }   // a pad or a shove: the host's word
  }
  const seen = new Set();
  for (const e of d.m) {
    seen.add(e[0]); let m = W.net.puppets.get(e[0]); const ch = CH_OF(e[1]);
    if (!m) { m = newMonster(ch, e[3], e[4], e[2]); m.id = e[0]; m.puppet = true; W.net.puppets.set(e[0], m); W.mons.push(m); if (ch === 'K') { m.isBoss = true; W.boss = m; m.T = Object.assign({}, m.T, { immune: false }); } }
    if (m.rank !== e[2] && ch !== 'K') { m.rank = e[2]; m.rigD = monRig(ch, e[2]); }
    m.tx = e[3]; m.ty = e[4]; m.facing = e[5] / 100; m.tell = e[6] & 1 ? .3 : 0; m.vis = e[6] & 2 ? 0 : 2; m.emerge = e[6] & 4 ? .2 : 0; m.flash = e[6] & 8 ? .1 : 0; m.seen = game.real;
  }
  for (const [id, m] of W.net.puppets) if (!seen.has(id)) { W.net.puppets.delete(id); if (!m.dead) { m.dead = true; m.dying = .5; } }
  W.foe = d.p.map(p => p[0] === 0 ? { kind: 'pot', x: p[1], y: p[2], z: p[3], tx: p[4], ty: p[5], sx: p[6], sy: p[7], t: p[8], T: 1 } : { kind: 'fire', x: p[1], y: p[2], z: p[3], vx: p[4], vy: p[5] });
  W.shotsNet = d.s;
  for (const g of d.g) { const G = W.gens[g[0]]; if (!G) continue; if (!g[1] && !G.dead) { G.dead = true; } else if (g[1]) { G.rank = g[1]; G.hp = g[2]; } }
  if (d.b && W.boss) { W.boss.hp = d.b[0]; W.boss.phase = d.b[1]; W.boss.state = d.b[3] ? 'idle' : 'sleep'; if (d.b[2]) W.boss.dead = true; }
  W.menuHero = d.z >= 0 ? W.heroes.find(h => h.netId === d.z) : null;
}
function netApplyEvent(e) {
  switch (e[0]) {
    case 'floor': if (e[2] !== W.serial) { NET.serial = e[2] - 1; netBuildFloor(e[1]); const h = W.heroes.find(x => x.netId === e[3]); sfx('descend'); } break;
    case 'gone': { const it = W.items.find(i => i.id === e[1]); if (it && !it.gone) { it.gone = true; if (e[2] >= 0) { const h = W.heroes.find(x => x.netId === e[2]); if (h && h.local) { sfx(it.kind === 'key' ? 'key' : ['roast', 'loaf', 'cider', 'platter'].includes(it.kind) ? 'chomp' : it.kind === 'gold' || it.kind === 'gem' ? 'coin' : 'pickup'); game.particles.glints(it.x, it.y, 8, 5); } } } break; }
    case 'door': { const d = W.doors[e[1]]; if (d && !d.open) { d.open = 1; d.t = 0; for (const c of d.cells) W.map.set(c.x, c.y, 0); sfx('door'); } break; }
    case 'wall': { const cr = W.cracked.find(c => c.x === e[1] && c.y === e[2]); if (cr) breakCrack(cr); break; }
    case 'trap': { for (const p of W.plates) if (p.kind === e[1]) p.hit = true; for (const t of W.trapWalls[e[1]]) { W.map.set(t.x, t.y, 0); game.particles.explosion((t.x + .5) * TS, (t.y + .5) * TS, 6, .5); } sfx('rumble'); break; }
    case 'gen': { const g = W.gens[e[1]]; if (g && !g.dead) { g.dead = true; game.particles.explosion(g.x, g.y, 6, .8); sfx('crumble'); game.shake(2); } break; }
    case 'magic': { W.rings = W.rings || []; W.rings.push({ x: e[2], y: e[3], t: 0, big: true }); game.flash('#ffffff', .4); sfx('magic'); game.shake(5); break; }
    case 'say': showCaption(e[3], 2); break;
    case 'stairs': W.descend = { by: W.heroes.find(h => h.netId === e[1]) || W.heroes[0], to: e[2], t: 0 }; sfx('descend'); break;
  }
}

// ----- client step: its own hero at once, puppets for the rest -----
function clientStep(dt, live, me) {
  W.time += dt;
  if (me && !NET.menu.open && live) {
    me.int.mx = me.int.my = 0; readIntent(me);
    const it = me.int, C = me.C;
    me.hurtT = Math.max(0, me.hurtT - dt); me.flash = Math.max(0, me.flash - dt); me.cd = Math.max(0, me.cd - dt); me.tele = Math.max(0, me.tele - dt);
    if (!me.down) {
      const planted = it.plant, mag = Math.min(1, Math.hypot(it.mx, it.my));
      if (planted || me.stun > 0) { me.vx *= .5; me.vy *= .5; if (planted && mag > .2) me.facing = Math.atan2(it.my, it.mx); } else { me.vx = it.mx * heroSpeed(me); me.vy = it.my * heroSpeed(me); if (mag > .2 && !it.fire) me.facing = Math.atan2(it.my, it.mx); }
      if (it.fire) me.facing = Math.atan2(it.ay, it.ax); me.aim = [it.ax, it.ay];
      me.update(dt, W.map); W.map.collide(me);
      if (it.fire && me.cd <= 0) { const a = Math.atan2(it.ay, it.ax), sp = C.shotSpeed; W.shots.push({ x: me.x + Math.cos(a) * 8, y: me.y + Math.sin(a) * 8, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 220 / sp, dmg: 0, owner: me, kind: C.shot, pierce: 0, bounce: 0, a, hit: new Set(), spin: 0, cosmetic: true }); me.cd = C.cd; sfx('shot_' + C.shot, { vol: .4 }); me.firing = true; } else if (!it.fire) me.firing = false;
      if (it.magic && me.flasks > 0) { NET.actN++; send({ t: 'act', k: 'magic', n: NET.actN, v: [Math.round(game.screenGround ? ((game.screenGround() || { x1: 0, x0: 0 }).x1 - (game.screenGround() || { x1: 0, x0: 0 }).x0) / 2 / TS : 14), 9] }, { to: NET.info.host }); me.castT = .45; }
    }
    me.castT = Math.max(0, (me.castT || 0) - dt);
    me.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: me.vx, vy: me.vy, facing: me.facing, hurt: me.hurtT > 0, pose: me.down ? 'die' : me.castT > 0 ? 'cast' : null, point: me.firing, hunch: me.hunger * .5 });
    NET.meT += dt; if (NET.meT >= 1 / 12) { NET.meT = 0; send({ t: 'me', at: Math.round(AIHub.time()), x: Math.round(me.x), y: Math.round(me.y), a: Math.round(Math.atan2(it.ay, it.ax) * 100), f: it.fire ? 1 : 0, p: it.plant ? 1 : 0, q: W.serial, v: [14, 9] }, { to: NET.info.host, reliable: false }); }
  } else if (me) me.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: 0, vy: 0, facing: me.facing, pose: me.down ? 'die' : null });
  // puppets
  for (const h of W.heroes) {
    if (h.local || h.gone) { if (h.local && h.down) h.rig.update(dt, { x: h.x, y: h.y, z: 0, vx: 0, vy: 0, facing: h.facing, pose: 'die' }); continue; }
    if (h.tx !== undefined) { const k = Math.min(1, dt * 10), ox = h.x, oy = h.y; h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k; h.vx = (h.x - ox) / dt; h.vy = (h.y - oy) / dt; if (Math.hypot(h.vx, h.vy) > 4) h.facing = Math.atan2(h.vy, h.vx); }
    if (h.firing) { h.facing = Math.atan2(h.aim[1], h.aim[0]); h.cd -= dt; if (h.cd <= 0) { h.cd = h.C.cd; const a = Math.atan2(h.aim[1], h.aim[0]), sp = h.C.shotSpeed; W.shots.push({ x: h.x + Math.cos(a) * 8, y: h.y + Math.sin(a) * 8, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 220 / sp, dmg: 0, owner: h, kind: h.C.shot, pierce: 0, bounce: 0, a, hit: new Set(), spin: 0, cosmetic: true }); } }
    h.flash = Math.max(0, h.flash - dt);
    h.rig.update(dt, { x: h.x, y: h.y, z: 0, vx: h.vx || 0, vy: h.vy || 0, facing: h.facing, pose: h.down ? 'die' : null, point: h.firing });
  }
  // monsters: ease to the latest snapshot
  for (const m of W.mons) if (m.puppet && m.tx !== undefined && !m.dead) { const k = Math.min(1, dt * 10), ox = m.x, oy = m.y; m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt; m.t += dt; m.flash = Math.max(0, (m.flash || 0) - dt); }
  for (const m of W.mons) if (m.dead) m.dying += dt;
  W.mons = W.mons.filter(m => !(m.dead && m.dying > 1.2));
  // cosmetic shots stop at walls
  for (const s of W.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.spin += dt * 14; if (s.life <= 0 || W.map.solidAt(s.x, s.y)) { s.dead = true; if (W.map.solidAt(s.x, s.y)) game.particles.sparks(s.x, s.y, 12, 3); } }
  W.shots = W.shots.filter(s => !s.dead);
  for (const d of W.doors) if (d.open) d.t += dt;
  W.shots.length > 120 && (W.shots.length = 120);
  animateAll(dt);
  if (NET.pendingSnap && NET.pendingSnap.q === W.serial) { netApplySnap(NET.pendingSnap); NET.pendingSnap = null; }
}

// ----- drawing, HUD and the session menu -----
function netDrawScene(r) {
  if (!W) { r.sky(['#05030a', '#140c20']); return; }
  if (NET.server) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05030a'); E.font.text(g, 'HOSTING', r.W / 2, r.H / 2, '#a098b8', { align: 'center', scale: 2 }); }); return; }
  drawWorld(r);
  if (W.shotsNet) for (const s of W.shotsNet) { drawShot(r, { x: s[0], y: s[1], z: 12, a: s[2] / 100, vx: Math.cos(s[2] / 100), vy: Math.sin(s[2] / 100), kind: ['axe', 'javelin', 'arrow', 'hex'][s[3]], spin: game.real * 14 }); }
  drawHud(r);
  r.overlay(g => { if (NET.over) drawNetOver(g, r); if (NET.menu.open) drawNetMenu(g, r); });
  if (DEV.netstats) r.overlay(g => E.font.text(g, 'net in ' + NET.stats.in + ' out ' + NET.stats.out + ' snap ' + NET.stats.bytes + 'B', 4, r.H - 18, '#80ff80', { font: 'tiny' }));
}
function netHud(g, r) {
  const t = AIHub.time(), left = Math.max(0, NET.limit - Math.max(0, t));
  if (isFinite(left)) E.font.text(g, Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'), r.W / 2, 46, left < 30000 ? '#ff6050' : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
  const hs = W.heroes.slice().sort((a, b) => b.score - a.score);
  hs.forEach((h, i) => { E.font.text(g, (h.name2 || h.C.name) + ' ' + h.score, r.W - 6, 42 + i * 8, h.hubColor || h.C.color, { align: 'right', font: 'tiny' }); });
  // arrows to allies off screen
  const me = W.heroes.find(h => h.local); if (me) for (const h of W.heroes) { if (h === me || h.gone) continue; const dx = h.x - me.x, dy = h.y - me.y, d = Math.hypot(dx, dy); if (d > 190) { const a = Math.atan2(dy, dx), ex = r.W / 2 + Math.cos(a) * (r.W / 2 - 14), ey = r.H / 2 + Math.sin(a) * (r.H / 2 - 40); px.poly(g, [[ex + Math.cos(a) * 6, ey + Math.sin(a) * 6], [ex + Math.cos(a + 2.5) * 5, ey + Math.sin(a + 2.5) * 5], [ex + Math.cos(a - 2.5) * 5, ey + Math.sin(a - 2.5) * 5]], h.hubColor || h.C.color); } }
}
function netMenuItems() { return [['Volume', () => Math.round(game.audio.volume * 100) + '%', d => game.audio.setVolume(clamp(game.audio.volume + d * .1, 0, 1))], ['Music', () => Math.round(game.audio.musicVolume * 100) + '%', d => { game.audio.musicVolume = clamp(game.audio.musicVolume + d * .1, 0, 1); game.audio.applyVolume(); }], ['Voices', () => Voice.on ? 'On' : 'Off', () => { Voice.on = !Voice.on; }], ['Button symbols', () => game.settings.glyphs === 'xbox' ? 'Xbox' : 'PlayStation', () => game.settings.set('glyphs', game.settings.glyphs === 'xbox' ? 'playstation' : 'xbox')], ['Close', () => '', () => { NET.menu.open = false; }]]; }
function netMenuUpdate() {
  const I = game.input, items = netMenuItems();
  if (I.repeat('up', .3, .1)) NET.menu.i = (NET.menu.i + items.length - 1) % items.length; if (I.repeat('down', .3, .1)) NET.menu.i = (NET.menu.i + 1) % items.length;
  const it = items[NET.menu.i];
  if (I.repeat('left', .3, .1)) it[2](-1); if (I.repeat('right', .3, .1)) it[2](1);
  if (I.pressed('confirm')) it[2](1);
  if (I.pressed('cancel') || I.pressed('pause')) NET.menu.open = false;
}
function drawNetMenu(g, r) {
  const items = netMenuItems(), x = r.W / 2 - 80, y = r.H / 2 - 50;
  E.ui.box(g, x, y, 160, 100, { bg: ['#1c1630', '#0e0a1a'], border: '#6a5a90' });
  items.forEach((it, i) => { E.font.text(g, it[0], x + 10, y + 10 + i * 16, i === NET.menu.i ? '#ffd860' : '#c8c0e0'); E.font.text(g, it[1](), x + 150, y + 10 + i * 16, '#fff', { align: 'right' }); });
}
function drawNetOver(g, r) {
  px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05030a'));
  E.font.title(g, 'ROUND OVER', r.W / 2, 40, { scale: 3, colors: ['#fff6d0', '#e8b030', '#a05010'], outline: '#000', align: 'center' });
  const e = NET.over, why = { void: 'The round was voided.', 'host-left': 'The host left.', 'sat-out': 'A player sat the round out.', 'session-ended': 'The session ended.' }[e.reason];
  if (why) E.font.text(g, why, r.W / 2, 90, '#e8d8b0', { align: 'center' });
  (e.standings || []).forEach((grp, i) => { const names = [].concat(grp).map(id => { const h = RUN.heroes.find(x => x.netId === id); return h ? h.name2 + ' ' + h.score : '?'; }).join(', '); E.font.text(g, (i + 1) + '. ' + names, r.W / 2, 110 + i * 14, '#ffffff', { align: 'center' }); });
}

/* ---- 90-main.js ---- */
/* Start-up: the game object, standard menu adjustments, settings, scenes. */
tuneLoad();
const HUB = typeof AIHub !== 'undefined' && AIHub.active;
const HOWUI = { open: false, page: 0 };
function makeGame() {
  const menu = HUB ? { quit: 'title' } : {
    items: () => {
      const a = [['How to Play', () => { HOWUI.open = true; HOWUI.page = 0; game.resume(); }], ['Dev Tools', () => { DEVUI.open = true; DEVUI.i = 0; DEVUI.scroll = 0; DEVUI.age = 0; game.resume(); }]];
      if (W && game.scene === game.scenes.play) a.push(['Restart floor', () => { game.resume(); game.go('play', { step: W.step }, { fade: .3 }); }]);
      if (game.pausedBy > 1 && W) { const p = game.pausedBy; a.push(['Drop out (P' + p + ')', () => { const i = W.heroes.findIndex(h => h.input === game.players[p - 1]); if (i >= 0) { W.heroes.splice(i, 1); RUN.heroes = W.heroes; game.removePlayer(p); W.heroes.forEach((h, k) => h.slot = k); W.noJoinUntil = W.time + 1.5; game.input.consumeAll(); } game.resume(); }]); }
      return a;
    },
    controls: { fire: 'Fire', magic: 'Magic', plant: 'Plant', view: 'Camera view' }, quit: 'title'
  };
  game = new E.Game(Object.assign({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, bg: '#05030a', menu },
    HUB ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : {}));
  return game;
}
function defineSettings() {
  const S = game.settings, def = (key, label, options, tip, apply) => S.define({ key, label, type: typeof OPT[key] === 'boolean' ? 'toggle' : 'select', options, value: OPT[key], group: 'Game', help: tip, apply: (g, v) => { OPT[key] = v; saveOpts(); if (apply) apply(v); } });
  def('cameraView', 'Camera view', ['Three-quarter', 'Top-down', 'Isometric'], 'The rules are the same in every view.', v => { game.setView && game.setView({ 'Three-quarter': 'threequarter', 'Top-down': 'topdown', 'Isometric': 'iso' }[v]); });
  def('difficulty', 'Difficulty', ['Easy', 'Normal', 'Hard']);
  def('aimAssist', 'Aim assist', ['Off', 'Low', 'High']);
  def('stickFires', 'Right stick fires', null);
  def('allyStun', 'Ally stun (from floor 6)', null);
  def('captions', 'Narrator captions', null);
  def('tips', 'Tips', null);
  def('names', 'Player names', null);
  def('lighting', 'Enhanced lighting', null);
  S.define({ key: 'voices', label: 'Voices', type: 'toggle', value: E.store.get('gauntletdown-voices', true), group: 'Sound', apply: (g, v) => { Voice.on = !!v; E.store.set('gauntletdown-voices', !!v); } });
  if (S.glyphs === 'auto') S.set('glyphs', 'playstation');
  Voice.on = true;
}
function makeDebug() {
  game.debug = {
    snapshot() { return { scene: game.sceneName, step: W && W.step, time: W && +W.time.toFixed(1), heroes: W ? W.heroes.map(h => ({ cls: h.C.id, hp: Math.round(h.hp), score: h.score, down: h.down, x: Math.round(h.x), y: Math.round(h.y), keys: h.keys, flasks: h.flasks })) : [], mons: W ? W.mons.filter(m => !m.dead).length : 0, gens: W ? W.gens.filter(g => !g.dead).length : 0, boss: W && W.boss ? Math.round(W.boss.hp) : null, descend: W && !!W.descend, errors: game.errors.length }; },
    W: () => W, RUN, DEV, TUNE, OPT, sim: simStep, startRun: (cls = [0]) => { RUN.heroes = cls.map((c, i) => makeHero(i, c, i === 0 ? game.input : game.players[i] || null)); RUN.step = 0; RUN.seed = 1234; RUN.mode = 'solo'; RUN.active = true; RUN.tipsSeen = {}; game.go('play', { step: 0 }, { fade: 0 }); },
    api: { devRows, DEVUI, hudPanel, drawFloorCard, buildWorld, makeHero, makeBot, simStep, damageMon, killMon, damageGen, pickup, hurtHero, useFlask, openDoorGroup, newMonster, spawnTithe, ringBell, genFloor, solvable, PLAN, CLASSES, MON, GEN, dropItem, heroFall, heroRise, fireShot, say, placeHeroes, shootItem, flaskBlast, bossPhaseCheck, continueRun, TUNE_DEF, getScores, addScore, qualifies, aboutPages, HOWTO, REALMS, LINES, SONGS, Voice, SFX_DEFS, newPuppet: null },
    botAll: on => { if (W) for (const h of W.heroes) h.bot = on ? makeBot(true) : null; RUN.botAll = on; },
    warp: s => devWarp(s), say, bot: on => { DEV.bot = on; if (W && W.heroes[0]) W.heroes[0].bot = on ? makeBot(true) : null; }
  };
}
function boot() {
  makeGame();
  game.screenGround = () => {
    const r = game.r; if (!r || !game.view.toGround) return null;
    const cx = game.cam.x, cy = game.cam.y; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [sx, sy] of [[0, 0], [r.W, 0], [0, r.H], [r.W, r.H]]) { const p = game.view.toGround(cx + sx, cy + sy); if (!p) return null; const px_ = p.x !== undefined ? p.x : p[0], py_ = p.y !== undefined ? p.y : p[1]; x0 = Math.min(x0, px_); x1 = Math.max(x1, px_); y0 = Math.min(y0, py_); y1 = Math.max(y1, py_); }
    return { x0, x1, y0, y1 };
  };
  const scenes = { title: SCENE_TITLE, menu: SCENE_MENU, select: SCENE_SELECT, howto: SCENE_HOWTO, scores: SCENE_SCORES, about: SCENE_ABOUT, over: SCENE_OVER, ending: SCENE_ENDING, play: SCENE_PLAY, attract: SCENE_ATTRACT };
  for (const k in scenes) if (!scenes[k].input) scenes[k].input = GD_INPUT;
  if (typeof netScenes === 'function') Object.assign(scenes, netScenes());
  game.start({
    scene: HUB && typeof netScenes === 'function' ? 'netboot' : 'title', scenes,
    boot: { title: TITLE, steps: [['Digging the Gaunt', () => { defineSfx(); defineSettings(); }], ['Setting the table', () => { for (const c of CLASSES) c._r = c.rig(); }], ['Waking the ghosts', () => { makeDebug(); }]] }
  });
  window.__gd = { game, get W() { return W; }, RUN, DEV, TUNE, OPT };
}
boot();

})();
