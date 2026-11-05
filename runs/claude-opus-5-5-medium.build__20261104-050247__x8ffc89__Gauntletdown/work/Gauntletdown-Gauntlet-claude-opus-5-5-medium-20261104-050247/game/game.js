(() => {
'use strict';
// ---- 00-core.js ----
/* GAUNTLETDOWN: an original Gauntlet-inspired co-op dungeon crawl on my-3D2dge.
 * 00-core: the engine handle, the input preset, the game, registries, the event bus, random streams. */
const E = My3D2dge, { px, clamp, lerp } = E;
const TAU = Math.PI * 2, T = 16;
const HUB = typeof window !== 'undefined' && window.AIHub ? window.AIHub : null;
const SESSION = !!(HUB && HUB.active);
const HAS_DOM = typeof document !== 'undefined' && !!document.getElementById;
const VERSION = '1.0';

// The input preset: twin-stick keys and pads. Order matters: a keyboard half gives the actions after the moves its
// buttons in turn (player 1: F G H, player 2: . / ,), and a prompt shows the first code of the device in use.
const MENU = {
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const GD_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Space', 'KeyJ', 'Mouse0', 'Pad7', 'Pad0'], magic: ['KeyQ', 'KeyK', 'Mouse2', 'Pad3', 'Pad5'], plant: ['ShiftLeft', 'ShiftRight', 'Pad6'],
  view: ['KeyV'], more: ['KeyT', 'Pad3'], ...MENU
};

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, id: 'gauntletdown', bg: '#05040a',
  ...(SESSION ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : { fullscreen: 'button' }),
  menu: {
    items: () => menuItems(),
    controls: { fire: 'Fire', magic: 'Magic', plant: 'Plant (stand and shoot)', view: 'Camera view', more: false },
    quit: 'title'
  }
});
const P = game.particles, L = game.lights, A = game.audio;
const scenes = {};   // every scene, by name
const SC = {};       // shared scene state

/* ---- registries: content is data (floors, heroes, monsters, items, lines) ---- */
const REG = {};
const def = (kind, id, spec) => { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; };
const get = (kind, id) => (REG[kind] || {})[id];
const all = kind => Object.values(REG[kind] || {});

/* ---- the event bus ---- */
const bus = (() => {
  const h = {};
  return {
    on(name, fn) { (h[name] || (h[name] = [])).push(fn); return () => { h[name] = h[name].filter(f => f !== fn); }; },
    emit(name, data) { for (const fn of h[name] || []) { try { fn(data); } catch (e) { game.fail('bus ' + name, e); } } }
  };
})();

/* ---- random streams: rng.sim for gameplay (seeded, repeatable), Math.random for looks ---- */
const rng = { seed: 1, sim: E.rng(1) };
const reseed = s => { rng.seed = s >>> 0; rng.sim = E.rng(rng.seed); };
const R = () => rng.sim();
const Ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const Rpick = list => list[Math.floor(R() * list.length)];

/* ---- small helpers ---- */
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const fmt = n => n > 9999 ? '9999+' : String(Math.max(0, Math.floor(n)));
const store = { get: (k, d) => { try { return E.store.get('gd:' + k, d); } catch (e) { return d; } }, set: (k, v) => { try { E.store.set('gd:' + k, v); } catch (e) { /* storage blocked */ } } };
const txt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, { shadow: '#05030a', outline: false, ...o });
const otxt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, { outline: '#05030a', ...o });
const twidth = (s, o) => E.font.width(s, o);
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

/* ---- 10-foot HTML menus: the engine's standard screens scale up on a TV ---- */
if (HAS_DOM && document.head) {
  const st = document.createElement('style');
  const fit = () => { const k = clamp(Math.min(innerHeight / 620, innerWidth / 1000), 1, 2.4); st.textContent = '.esh{zoom:' + k.toFixed(2) + '}'; };
  fit(); document.head.appendChild(st); addEventListener('resize', fit);
}

// ---- 01-tune.js ----
/* 01-tune: every balance number in one table. Dev Tools' sliders bind here; values are saved, and Reset puts them back. */
const TUNE_SPEC = [
  ['drain', 'Life drain / s', 1, 0, 5, .1],
  ['startHealth', 'Start health', 700, 100, 2000, 50],
  ['foodHeal', 'Food heals', 100, 25, 300, 5],
  ['heroSpeed', 'Hero speed', 1, .5, 2, .05],
  ['shotRate', 'Shot rate', 1, .5, 3, .05],
  ['shotDamage', 'Shot damage', 1, .5, 3, .05],
  ['magicPower', 'Magic power', 1, .25, 3, .05],
  ['monsterSpeed', 'Monster speed', 1, .25, 3, .05],
  ['monsterDamage', 'Monster damage', 1, 0, 3, .05],
  ['spawnInterval', 'Spawn interval', 1, .25, 4, .05],
  ['generatorHp', 'Generator HP', 1, .25, 4, .05],
  ['maxMonsters', 'Monster cap', 140, 20, 300, 5],
  ['impatience', 'Doors open at (s)', 180, 30, 600, 5],
  ['titheAt', 'Tithe arrives (s)', 120, 30, 600, 5],
  ['hoardTime', 'Hoard time (s)', 30, 10, 90, 1],
  ['stairHold', 'Stair hold (s)', 1, 0, 3, .1]
];
const TUNE_DEFAULT = Object.fromEntries(TUNE_SPEC.map(s => [s[0], s[2]]));
const TUNE = Object.assign({}, TUNE_DEFAULT, (() => { const s = store.get('tune', {}); const o = {}; for (const [k, , , lo, hi] of TUNE_SPEC) if (typeof s[k] === 'number' && isFinite(s[k])) o[k] = clamp(s[k], lo, hi); return o; })());
const setTune = (k, v) => { const sp = TUNE_SPEC.find(s => s[0] === k); if (!sp) return; TUNE[k] = clamp(Math.round(v / sp[5]) * sp[5], sp[3], sp[4]); TUNE[k] = +TUNE[k].toFixed(3); if (!SESSION) store.set('tune', TUNE); };
const resetTune = () => { Object.assign(TUNE, TUNE_DEFAULT); if (!SESSION) store.set('tune', TUNE); };

/* ---- the Game settings (the standard Settings screen shows them with Display, Sound, Comfort) ---- */
const S = game.settings;
S.define({ key: 'viewMode', group: 'Game', label: 'Camera view', options: [['threequarter', 'Three-quarter'], ['topdown', 'Top-down'], ['iso', 'Isometric']], value: 'threequarter', apply: (g, v) => { if (g.sceneName && g.scene && g.scene.world) g.setView(v); } });
S.define({ key: 'padGlyphs', group: 'Game', label: 'Button symbols', options: [['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']], value: 'playstation', help: 'The controller buttons shown in prompts', apply: (g, v) => { for (const p of g.players || [g.input]) p.glyphs = v; } });
S.define({ key: 'difficulty', group: 'Game', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' });
S.define({ key: 'aimAssist', group: 'Game', label: 'Aim assist', options: [['off', 'Off'], ['low', 'Low'], ['high', 'High']], value: 'low' });
S.define({ key: 'stickFire', group: 'Game', label: 'Right stick fires', type: 'toggle', value: true, help: 'Pushing the right stick throws in that direction' });
S.define({ key: 'allyStun', group: 'Game', label: 'Ally stun (from floor 6)', type: 'toggle', value: true });
S.define({ key: 'captions', group: 'Game', label: 'Narrator captions', type: 'toggle', value: true });
S.define({ key: 'tips', group: 'Game', label: 'Tips', type: 'toggle', value: true });
S.define({ key: 'names', group: 'Game', label: 'Player names', type: 'toggle', value: true });
S.define({ key: 'hudSize', group: 'Game', label: 'HUD size', options: [['normal', 'Normal'], ['large', 'Large']], value: 'normal' });
S.define({ key: 'voices', group: 'Sound', label: 'Voices', type: 'slider', value: .8, apply: () => voiceVolume() });
game.input.glyphs = S.padGlyphs;

const DIFF = () => ({ Easy: { drain: .5, dmg: .7, hp: 1.3 }, Normal: { drain: 1, dmg: 1, hp: 1 }, Hard: { drain: 1.5, dmg: 1.3, hp: .85 } })[S.difficulty] || { drain: 1, dmg: 1, hp: 1 };

// ---- 05-text.js ----
/* 05-text: every word the player reads. The Gaunt (the dungeon's own voice) speaks short, booming, darkly funny lines. */
const LINES = {
  start: 'THE GAUNTLET IS DOWN. COME AND GET IT.',
  welcome: 'WELCOME, {C}.',
  fading: '{C}, YOUR LIFE FORCE IS FADING.',
  starving: '{C} IS STARVING!',
  dying: '{C} IS ABOUT TO PERISH!',
  eaten: '{C} HAS BEEN EATEN.',
  rise: '{C} RISES AGAIN. HOW TIRESOME.',
  tip_food: 'LIFE FORCE DRAINS WITH EVERY BREATH. EAT.',
  tip_dontshoot: 'NEVER SHOOT THE SUPPER.',
  shot_cider: '{C} SHOT THE CIDER!',
  shot_feast: '{C} SHOT THE SUPPER!',
  ate_stew: '{C} ATE THE STEW. A POOR CHOICE.',
  glutton: '{C} EATS FOR FOUR.',
  tip_stairs: 'THE STAIRS GO DOWN. THEY ALWAYS GO DOWN.',
  tip_ghost: 'HUNGERGHOSTS. THEY HAVE NOT EATEN IN NINE CENTURIES.',
  tip_generator: 'THAT URN BREEDS THEM. BREAK IT.',
  tip_gnasher: 'GNASHERS. ALL TEETH, NO MANNERS.',
  tip_melee: 'TOO CLOSE TO THROW? THEN HIT IT.',
  tip_lobber: 'POT-LOBBERS THROW OVER WALLS. WATCH THE SHADOWS.',
  tip_imp: 'CINDER IMPS. THEY COOK WHAT THEY SPIT ON.',
  tip_fryar: 'THE FRYARS FADE. STRIKE WHEN THEY SHOW THEMSELVES.',
  tip_snatcher: 'A SNATCHER! MIND YOUR POCKETS.',
  stolen: '{C} HAS BEEN ROBBED!',
  tithe_comes: 'THE TITHE HAS COME TO COLLECT.',
  tithe_paid: 'THE TITHE IS PAID.',
  tithe_slain: '{C} CHEATED THE TITHE!',
  bell: '{C} IS ON THE MENU!',
  bell_pass: 'NOW {C} IS ON THE MENU.',
  tip_magic: 'MAGIC STRIKES ALL YOU CAN SEE. USE IT WISELY.',
  shot_flask: '{C} SHOT THE MAGIC. MOSTLY WASTED.',
  key_first: 'A KEY. HOW THOUGHTFUL.',
  tip_door: 'A KEY OPENS A DOOR. ANY DOOR. ONCE.',
  treasure_first: 'TREASURE! THE GAUNT KEEPS COUNT.',
  special_ironbrew: 'IRON BREW. {C} FEELS STURDIER.',
  special_ogreale: 'OGRE ALE. {C} HITS HARDER.',
  special_quickshot: 'QUICKSHOT TONIC. {C} THROWS FASTER.',
  special_hardshot: 'HARDSHOT DRAUGHT. {C} THROWS HARDER.',
  special_witchwater: 'WITCHWATER. {C} CRACKLES WITH MAGIC.',
  special_featherfoot: 'FEATHERFOOT CORDIAL. {C} STEPS LIGHTER.',
  special_deeppockets: 'DEEP POCKETS. {C} CARRIES MORE.',
  amulet_veil: 'THE VEIL. NOW YOU SEE {C}. NOW YOU DON\'T.',
  amulet_ironskin: 'IRONSKIN. NOTHING BITES {C}. FOR NOW.',
  amulet_stench: 'STENCH. EVEN GHOSTS GAG.',
  amulet_ricochet: 'RICOCHET. MIND YOUR HEADS.',
  amulet_rending: 'RENDING. NOTHING STOPS THOSE SHOTS.',
  tip_trap: 'THAT PLATE WAS A TRAP. ENJOY.',
  tip_tele: 'STEP ON THE RUNE. ARRIVE ELSEWHERE.',
  tip_stun: 'STUN RUNES. DO NOT DAWDLE ON THEM.',
  tip_field: 'THE FIELD HUMS. WAIT FOR THE QUIET.',
  tip_spikes: 'THE FLOOR HAS TEETH TOO.',
  tip_secret: 'THAT WALL WAS LYING.',
  tip_cracked: 'CRACKED STONE. IT WANTS TO BREAK.',
  ally_stun_on: 'FROM HERE ON, YOUR SHOTS STUN YOUR FRIENDS.',
  ally_shot: '{C}, THAT WAS A FRIEND.',
  impatient: 'THE GAUNT GROWS IMPATIENT.',
  doors_open: 'ALL DOORS ARE NOW OPEN.',
  walls_stairs: 'EVERY WALL IS NOW A STAIR.',
  stairs: '{C} FOUND THE STAIRS.',
  skip: '{C} TOOK THE SHORT WAY DOWN.',
  hoard: 'A HOARD! {N} SECONDS. GRAB.',
  hoard_shut: 'THE HOARD SLAMS SHUT.',
  hoard_clear: '{C} TOOK THE LAST CRUMB.',
  king_near: 'THE KING SMELLS YOU.',
  king_intro: 'KING FAMISH WILL SEE YOU NOW.',
  king_eating: 'HE IS EATING. SHOOT THE FOOD!',
  king_rage: 'NO FOOD LEFT. NOW HE IS ANGRY.',
  king_open: 'HIS RIBS ARE OPEN. AIM FOR THE GAUNTLET.',
  king_dead: 'THE GAUNTLET IS DOWN. SO IS THE KING.',
  gauntlet_taken: '{C} HOLDS THE IRON GAUNTLET.',
  game_over: 'THE GAUNT IS FED.',
  continue: 'RISE, OR BE SUPPER.',
  high_score: 'NAME THYSELF, MORSEL.',
  join: '{C} JOINS THE FEAST.',
  floor_1: 'WELCOME TO THE GAUNT, MORSELS.',
  floor_2: 'MIND THE ROOTS. THEY BITE.',
  floor_3: 'SMOKED, SALTED, SERVED.',
  floor_4: 'THE BONES HERE ARE WELL PICKED.',
  floor_5: 'THE CHOIR SINGS WITH ITS TEETH.',
  floor_6: 'HERE LIE KINGS, IN BRINE.',
  floor_7: 'THE OVEN IS ALWAYS ON.',
  floor_8: 'THE GATE OF GRISTLE. NO ONE CHEWS THROUGH.',
  floor_9: 'DINNER IS SERVED.',
  hoard_1: 'THE PANTRY HOARD. TAKE WHAT YOU CAN CARRY.',
  hoard_2: 'THE RELIQUARY. THE DEAD WILL NOT MISS IT.',
  descent2: 'THE GAUNT DIGS DEEPER. SO MUST YOU.'
};
// line keys that teach (played once per game, kept between games; Settings, Tips: Off silences them)
const TIP_KEYS = new Set(Object.keys(LINES).filter(k => k.startsWith('tip_') || k === 'key_first' || k === 'treasure_first' || k === 'ally_stun_on'));

const STORY = {
  prologue: 'BENEATH THE TOWN OF HOLLOWMERE, A DUNGEON DIGS DOWN, AND DOWN, AND DOWN. THEY CALL IT THE GAUNT. AT ITS BOTTOM SITS KING FAMISH, WHO HAS EATEN FOR NINE HUNDRED YEARS AND IS STILL HUNGRY. EACH WINTER HE THROWS HIS IRON GAUNTLET DOWN THE PIT AND DARES THE HUNGRY TO FETCH IT. NO ONE HAS CLIMBED BACK UP. TONIGHT, FOUR FOOLS ANSWER. THE GAUNTLET IS DOWN.',
  realm: {
    larder: ['REALM I: THE LARDER', 'THE TOP OF THE GAUNT, WHERE THE KING KEEPS HIS SNACKS. YOU ARE THE SNACKS.'],
    ossuary: ['REALM II: THE OSSUARY', 'BELOW THE LARDER LIE THE BONES OF THOSE WHO CAME BACK FOR SECONDS.'],
    furnace: ['REALM III: THE FURNACE GUT', 'THE GAUNT\'S OWN BELLY. IT IS VERY HOT, AND IT IS DIGESTING.'],
    banquet: ['THE BANQUET', 'THE TABLE IS SET. GUESS WHO IS DINNER.']
  },
  king: { intro: 'AH. DESSERT.', p2: 'SECOND HELPINGS!', p3: 'MORE! MORE! MORE!', dead: '...STILL... HUNGRY...' },
  ending: 'THE KING FALLS. THE IRON GAUNTLET IS YOURS. YOU CLIMB FOR SEVEN DAYS, EATING EVERYTHING ON THE WAY UP. HOLLOWMERE THROWS A FEAST IN YOUR HONOUR. YOU ARE, OF COURSE, STILL HUNGRY.',
  tag: 'THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING. DESCENT II AWAITS.',
  descent2: 'THE GAUNT DIGS DEEPER. SO MUST YOU.'
};

// How to Play: one idea a page; {fire} etc. become the player's own keys or buttons
const HOWTO = [
  ['THE GAUNTLET IS DOWN', 'King Famish waits at the bottom of the Gaunt with his Iron Gauntlet. Fight down nine floors, take it back, and do not become dinner.', 'gauntlet'],
  ['MOVE AND AIM', 'Move with {move}. Aim with {aim}. Your hero faces the way it walks when you are not aiming.', 'move'],
  ['THROW AND STRIKE', 'Hold {fire} to throw. Up close it strikes in melee instead. Hold {plant} to stand your ground and turn while you throw.', 'fire'],
  ['LIFE FORCE DRAINS', 'Your health falls by one every second. Eat roasts, loaves and cider. Never shoot the supper. Green stew is spoiled.', 'food'],
  ['MAGIC', 'Press {magic} to drink a Blast Flask: it strikes every monster you can see. A shot flask is mostly wasted. The Tithe dies only to magic.', 'magic'],
  ['KEYS, DOORS, STAIRS', 'A key opens one run of doors. Stand on the stairs to go down. Numbered stairs skip floors. Linger too long and the Gaunt opens the way itself.', 'stairs'],
  ['GENERATORS', 'Urns, dens and hutches breed monsters until you break them. Wounded monsters shrink and weaken.', 'gens'],
  ['FRIENDS', 'Up to four on one screen: {join} joins. Whoever takes the stairs gets the bonus. Everyone keeps their own score. Online through AI Hub sessions.', 'friends']
];

// About and Credits pages. Source Information and the three feedback sections match the chat reply and exit-interview.json.
const ABOUT = {
  credits: [
    'GAUNTLETDOWN  version ' + VERSION,
    'An original co-op dungeon crawl inspired by Gauntlet (Atari Games, 1985). An homage with no names, art, music or levels from it.',
    'Built by Claude (claude-opus-5-5, reasoning effort medium) from PLAN.md, for Michael Crosato.',
    'Engine: my-3D2dge v0.85.2 (MIT), patched: hand-held gear for the rigs.',
    'Online: AI Hub Session Protocol v1, client 1.4.0, shared world.',
    'All music, sound effects and voices are made in code. No audio files.'
  ],
  source: [],      // filled in 06-about.js
  testing: [],
  engine: [],
  prompt: []
};

// ---- 06-about.js ----
/* 06-about: Source Information and the feedback, shown on the About and Credits pages. The same text is the chat
 * reply and exit-interview.json (tools-gd/exit-interview.mjs writes that file from this one). */
const SOURCE_INFO = {
  date: '2026-11-04 05:02:47',
  source: 'Gauntlet (Atari Games, 1985 arcade)',
  plan: 'PLAN.md',
  genre: 'Arcade co-op dungeon crawler (top-down hack-and-shoot with maze exploration)',
  perspective: 'Three-quarter overhead; top-down and isometric selectable in Settings or with V',
  tech: 'my-3D2dge v0.85.2 (handoff edition, patched: new Humanoid gear), HTML5 Canvas 2D, Web Audio, AI Hub session client 1.4.0; tests on Node 24 and Playwright 1.63.0 (Chromium)',
  artDirection: 'The engine\'s PS1-era 2D look: procedural HD rigs, textured TileMap materials, canvas lighting with torches and glows; four realms (the Larder, the Ossuary, the Furnace Gut, the Banquet); new gear for the rigs, a cloth-sheet Shade for the ghosts, painted generators with damage states, string sprites for food, treasure, potions, amulets and shots; generic props from the engine\'s core library',
  animation: 'The engine\'s procedural Humanoid and Blob rigs and E.MOVES, with per-class throws (a bow draw for the Ranger, a cast for the Hexer), per-class melee combos, monster wind-up telegraphs, the Shade\'s fluttering hem and gaping mouth, a starving hunch, rank shrinking, generator breathing, eating squash, death and rising, the King\'s states',
  audio: 'Twelve original chip songs in the engine\'s step format with dynamic layers (drums when a horde is near, a layer per boss phase), about fifty synthesized sound effects, a heartbeat when starving, and Babble: a formant gibberish voice synth for the narrator (the Gaunt), the four heroes, the monsters and King Famish. No audio files',
  online: 'AI Hub Session Protocol v1, shared-world mode, 1-4 players: the host runs the world, clients move their own hero at once and draw the rest from snapshots; a server-host with no player works too. Outside a session: solo or couch co-op for 1-4 on one screen',
  testing: 'One command, node tests/run.mjs, prints only failures and a count: 172 checks in six suites (floors: every floor validated and solvable; sim: each system headless; play: two full scripted descents by bots from floor 1 to the ending and Descent II with the same state hash, a no-cheat balance run, the attract loop, four local players; net: a fake hub with latency, jitter and loss; ui: the single file in Chromium from file://, real keys and mouse, a touch-only phone; hub: the AI Hub harness in its four scenarios). Screenshots were used for looks only',
  research: 'None on the web. Read the engine handoff docs (README, API card, guide sections, the adventure kit) and the AI Hub protocol, harness and arena example; Gauntlet facts from the model\'s own knowledge and PLAN.md',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
  usage: 'unknown'
};
const FEEDBACK = {
  testing: [
    'Eight real bugs (test-harness mistakes not counted): a declaration-order crash at boot; the boss floor failing the floor validator; the co-op leash snapping a teleported hero back (a bot stuck forever on floor 4); the Iron Gauntlet dropping where nobody could reach it; the game\'s own AI Hub card losing the Enter press during a fade; the attract mode ignoring unbound keys; mouse aiming turning the camera into NaN and the screen black; and text glyphs the pixel font lacks.',
    'Five were critical or game breaking: the boot crash, the black screen on the first mouse click, the unreachable gauntlet (no ending), the floor 4 co-op soft-lock, and the card bug (the hub would have kept the game out of sessions).',
    'The scripted full descent: two bots playing every floor, both treasure rooms and the boss to the ending and Descent II, twice with the same state hash. It found the soft-locks no single-system check could. A close second: the AI Hub harness, which caught the card bug at once.',
    'The engine\'s look checker (tools/check.mjs): it pressed start and sampled only the menus and the floor card, so its notes were about those screens, not play. The fake-hub net suite also passed first time, after the real harness had already proven the same things.'
  ],
  engine: [
    'Everything runs headless and deterministic with game.advance, so a bot could play the whole game in a second of real time per minute of play; and the standard pause menu, settings, rebinding, prompts with PlayStation and Xbox glyphs, and the boot screen came for free.',
    'Yes, three times: game.mouseGround() returns an [x, y] array, not { x, y } (it made the camera NaN and the screen black); the three-quarter view draws at scale 1.5, so a Gauntlet maze needed the camera zoomed out to about 0.72; and a setting\'s apply runs at define time, before later code has run.',
    'The simulation: one damage pipeline, multi-source flow fields toward the nearest hero, the monster AI kinds, generators and level features, the autopilot bot, and the shared-world netcode (snapshots, events, interpolation, a rate limiter) on top of it.',
    'Keeping a 10-foot, controller-first front end consistent across the engine\'s HTML menus (14 px, scaled up with CSS zoom) and my canvas screens, and fitting crowds of monsters into the hub\'s message budget.',
    'One change: Humanoid gear. New weapons (axe, bow, club, frying pan, scythe, carving fork), an off-hand shield and two hats (a horned helmet and a cook\'s toque), drawn in the HD rig\'s depth-sorted list, because the heroes and monsters needed their own silhouettes. Applied by tools-gd/patch-engine.py and listed in ENGINE-CHANGES.md.',
    'A FlowField with several targets (the nearest of many heroes) and a TV scale for the standard menus, both of which every couch co-op game on the engine will want.'
  ],
  prompt: [
    'It is concrete about what done means: one file, the exact sections, the exit interview\'s shape, a single test command that prints only failures. And the controller-first, 10-foot rules gave clear design targets.',
    'The plan was written for another run (its folder names carry a different model and timestamp) and already picked the title, while TASK.md asks for a title picked by a random number generator; STAGE.md settles it (use the plan\'s title, and TASK.md wins on names). Usage figures are asked for, but the session has no way to read them.',
    'The scope: nine floors, two treasure rooms, a three-phase boss, four classes, local co-op, shared-world netcode, a gibberish voice synth, an attract mode and dev tools, all complete with no stubs, in one session, without being able to play it by hand.',
    'Say which features matter most if time runs short (the plan has a cut list; the prompt does not), and say whether usage numbers will be available to the model or should always be "unknown".'
  ]
};
ABOUT.source = [
  'Date: ' + SOURCE_INFO.date, 'Source: ' + SOURCE_INFO.source, 'Plan: ' + SOURCE_INFO.plan,
  'Genre and Perspective: ' + SOURCE_INFO.genre + '. ' + SOURCE_INFO.perspective, 'Tech: ' + SOURCE_INFO.tech,
  'Art Direction: ' + SOURCE_INFO.artDirection, 'Animation: ' + SOURCE_INFO.animation, 'Audio: ' + SOURCE_INFO.audio,
  'Online: ' + SOURCE_INFO.online, 'Testing: ' + SOURCE_INFO.testing, 'Research: ' + SOURCE_INFO.research,
  'Environment: ' + SOURCE_INFO.environment, 'Model: ' + SOURCE_INFO.model, 'Usage: ' + SOURCE_INFO.usage
];
const Q = { testing: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engine: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'],
  prompt: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'] };
for (const k of ['testing', 'engine', 'prompt']) ABOUT[k] = FEEDBACK[k].map((a, i) => Q[k][i].toUpperCase() + '  ' + a);
const AIHUB_ENTRY = {
  name: 'Gauntletdown', tagline: 'Four fools. One hungry dungeon.',
  description: 'A one-to-four player co-op dungeon crawl inspired by Gauntlet: blast through hordes, smash the generators that breed them and eat before your life force runs out. Play together on one screen, or online in AI Hub sessions.',
  type: 'Game', genre: 'Action', source: 'Gauntlet', series: 'Gauntlet', players: '1–4',
  controls: 'Move WASD/left stick · Aim mouse/right stick · Fire click/Space/R2 · Magic right-click/Q/△ · Plant Shift/L2 · Pause Esc/Options',
  tags: ['top-down', 'co-op', 'arcade', 'fantasy', 'comedy', 'retro']
};

// ---- 10-defs.js ----
/* 10-defs: heroes, monsters, generators, items, special potions and amulets, as registry entries. */

/* ---- HEROES: four fools ---- */
def('heroes', 'berserker', {
  name: 'BERSERKER', who: 'BRAKKA IRONBELLY', seat: 0, color: '#e8443a', speed: 62, armor: .75,
  shot: { kind: 'axe', dmg: 3, pierce: 1, speed: 190, cool: .34, splash: 0 }, melee: 5, moves: ['overhead', 'spin'], throwMove: 'throw', magic: [1, 1],
  voice: 'berserker', pips: [4, 4, 5, 2, 2], quip: 'HITS FIRST. EATS SECOND. THINKS RARELY.',
  rig: () => new E.Humanoid({ size: 1.2, build: 'bulky', weapon: 'axe', hat: { style: 'horned', color: '#7a7a86', horn: '#f0e4c4' }, hair: 'long', sleeves: 'none', armor: true,
    cape: { len: 5, width: 5, seg: 2.4 }, colors: { skin: '#e8b48a', hair: '#c0582a', cloth: '#8a3a26', trim: '#d8a040', pants: '#5a3a26', boot: '#3a2418', belt: '#2a1a12', cape: '#6a4a32', capeIn: '#3a2618', metal: '#c8ccd8', plate: '#8a8a96', staff: '#6a4024' } })
});
def('heroes', 'shieldmaiden', {
  name: 'SHIELDMAIDEN', who: 'HILDE STOUTHEART', seat: 1, color: '#3b82f6', speed: 66, armor: .6,
  shot: { kind: 'javelin', dmg: 2, pierce: 0, speed: 240, cool: .27, splash: 0 }, melee: 4, moves: ['thrust', 'bash'], throwMove: 'throw', magic: [1.4, 1],
  voice: 'shieldmaiden', pips: [5, 3, 4, 3, 3], quip: 'THE SHIELD IS FOR YOU. THE SPEAR IS FOR THEM.',
  rig: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: 'sword', offhand: 'shield', hat: { style: 'helmet', color: '#b8c0d0' }, hair: 'ponytail', armor: true,
    cape: { len: 5, width: 4, seg: 2.4 }, colors: { skin: '#f4caa8', hair: '#f0d070', cloth: '#2a5ab0', trim: '#e8e0c0', pants: '#3a4a6a', boot: '#4a3a2a', belt: '#5a3a1e', cape: '#1e3a80', capeIn: '#122454', metal: '#e0e4ee', plate: '#a8b0c4', shield: '#2a6ad0' } })
});
def('heroes', 'ranger', {
  name: 'RANGER', who: 'FENN QUICKFLETCH', seat: 2, color: '#22c55e', speed: 78, armor: .9,
  shot: { kind: 'arrow', dmg: 1, pierce: 0, speed: 300, cool: .15, splash: 0 }, melee: 2, moves: ['jab', 'cross'], throwMove: 'bow', magic: [1.7, 1],
  voice: 'ranger', pips: [2, 5, 2, 4, 5], quip: 'FASTEST LEGS IN HOLLOWMERE. FASTEST TO RUN OUT OF ARROWS? NEVER.',
  rig: () => new E.Humanoid({ size: 1.1, build: 'heroic', weapon: 'bow', hood: true, outfit: 'tunic', sleeves: 'long', hair: 'short',
    cape: { len: 4, width: 3.5, seg: 2.2 }, colors: { skin: '#e8c0a0', hair: '#2e6a32', cloth: '#3a8a3e', trim: '#c8a868', pants: '#5a4a32', boot: '#4a3220', belt: '#6a4a26', cape: '#2a5a2e', capeIn: '#1a3a1e', staff: '#8a5a30', glove: '#6a4a2a' } })
});
def('heroes', 'hexer', {
  name: 'HEXER', who: 'OLD MOTHER WIX', seat: 3, color: '#f5b700', speed: 64, armor: 1,
  shot: { kind: 'hex', dmg: 2, pierce: 0, speed: 220, cool: .26, splash: 1 }, melee: 1.5, moves: ['bash'], throwMove: 'cast', magic: [2.5, 2],
  voice: 'hexer', pips: [1, 4, 1, 5, 3], quip: 'SHE HAS CURSED BETTER DUNGEONS THAN THIS.',
  rig: () => new E.Humanoid({ size: 1.1, weapon: 'staff', hat: { style: 'pointed', color: '#5a2a8a' }, outfit: 'robe', sleeves: 'long', hunch: .3, hair: 'long', face: { eyes: 'big', bangs: .4 },
    colors: { skin: '#e8d0b0', hair: '#d8d4dc', cloth: '#6a3a9a', trim: '#f0c040', belt: '#f0c040', boot: '#3a2a3a', eye: '#3a2a5a', staff: '#7a5030', orb: '#ffd84a' } })
});
const HERO_ORDER = ['berserker', 'shieldmaiden', 'ranger', 'hexer'];
const PIP_NAMES = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];

/* ---- MONSTERS ---- (hp per rank, speed and damage by rank 1..3, points per rank) */
def('monsters', 'ghost', { name: 'HUNGERGHOST', hp: 2, speed: [40, 46, 52], dmg: [10, 20, 30], points: 10, ai: 'ghost', r: 5, fly: true, noMelee: true, tip: 'tip_ghost', voice: 'ghost' });
def('monsters', 'gnasher', { name: 'GNASHER', hp: 2, speed: [34, 38, 42], dmg: [6, 8, 10], points: 10, ai: 'melee', reach: 14, wind: .32, every: .9, r: 5, tip: 'tip_gnasher', voice: 'gnasher', move: 'overhead' });
def('monsters', 'lobber', { name: 'POT-LOBBER', hp: 2, speed: [30, 34, 38], dmg: [8, 10, 12], points: 15, ai: 'lob', every: [2.2, 1.9, 1.6], r: 5, tip: 'tip_lobber', voice: 'lobber' });
def('monsters', 'imp', { name: 'CINDER IMP', hp: 3, speed: [36, 40, 44], dmg: [6, 8, 10], fire: [8, 10, 12], points: 20, ai: 'imp', reach: 10, wind: .3, every: 1.8, r: 5, fly: false, tip: 'tip_imp', voice: 'imp' });
def('monsters', 'fryar', { name: 'FRYAR', hp: 3, speed: [36, 40, 44], dmg: [8, 10, 12], points: 25, ai: 'fryar', reach: 14, wind: .3, every: 1, r: 5, tip: 'tip_fryar', voice: 'fryar', move: 'overhead' });
def('monsters', 'snatcher', { name: 'SNATCHER', hp: 3, speed: [72, 72, 72], dmg: [0, 0, 0], points: 100, ai: 'snatch', r: 4.5, tip: 'tip_snatcher', voice: 'snatcher' });
def('monsters', 'tithe', { name: 'THE TITHE', hp: 1, speed: [52, 52, 52], dmg: [0, 0, 0], points: 1000, ai: 'tithe', r: 6, fly: true, immune: true, voice: 'tithe' });
const MON_CHAR = { g: 'ghost', n: 'gnasher', o: 'lobber', i: 'imp', y: 'fryar', x: 'snatcher', t: 'tithe' };

/* ---- GENERATORS ---- */
def('gens', 'urn', { name: 'ASH URN', spawns: 'ghost' });
def('gens', 'den', { name: 'GNASHER DEN', spawns: 'gnasher' });
def('gens', 'hutch', { name: 'CROCKERY HUTCH', spawns: 'lobber' });
def('gens', 'grate', { name: 'EMBER GRATE', spawns: 'imp' });
def('gens', 'shrine', { name: 'CANDLE SHRINE', spawns: 'fryar' });
def('gens', 'sacks', { name: 'SACK HEAP', spawns: 'snatcher' });
def('gens', 'tureen', { name: 'SOUP TUREEN', spawns: 'ghost' });
const GEN_CHAR = { G: 'urn', N: 'den', L: 'hutch', I: 'grate', F: 'shrine', S: 'sacks' };

/* ---- ITEMS ---- (heal: health; shoot: a shot destroys it; pts: points) */
def('items', 'key', { name: 'KEY', pts: 0 });
def('items', 'roast', { name: 'ROAST', heal: 1, pts: 10, food: true });
def('items', 'loaf', { name: 'LOAF', heal: .5, pts: 5, food: true });
def('items', 'cider', { name: 'CIDER', heal: 1, pts: 10, food: true, shoot: true });
def('items', 'stew', { name: 'SPOILED STEW', pts: 0, shoot: true });
def('items', 'flask', { name: 'BLAST FLASK', pts: 0, shoot: true });
def('items', 'special', { name: 'SPECIAL POTION', pts: 250 });
def('items', 'amulet', { name: 'AMULET', pts: 100 });
def('items', 'gold', { name: 'GOLD', pts: 100, treasure: true });
def('items', 'gem', { name: 'GEM', pts: 250, treasure: true });
def('items', 'chest', { name: 'CHEST', pts: 500, treasure: true });
def('items', 'lchest', { name: 'LOCKED CHEST', pts: 1000, treasure: true });
def('items', 'crown', { name: 'CROWN', pts: 2500, treasure: true });
def('items', 'platter', { name: 'FEAST PLATTER', heal: 2, pts: 20, food: true, shoot: true });
def('items', 'bell', { name: 'DINNER BELL', pts: 0 });
def('items', 'gauntlet', { name: 'THE IRON GAUNTLET', pts: 5000, treasure: true });
const ITEM_CHAR = { k: 'key', f: 'roast', b: 'loaf', j: 'cider', z: 'stew', m: 'flask', u: 'special', a: 'amulet', $: 'gold', '*': 'gem', h: 'chest', l: 'lchest', w: 'crown', B: 'bell' };

const SPECIALS = {
  ironbrew: { name: 'IRON BREW', color: '#9aa4b8', what: 'damage taken x0.8' },
  ogreale: { name: 'OGRE ALE', color: '#c87a2a', what: 'melee x1.5' },
  quickshot: { name: 'QUICKSHOT TONIC', color: '#4ad0e8', what: 'faster throws' },
  hardshot: { name: 'HARDSHOT DRAUGHT', color: '#e84a4a', what: 'shots +1 damage' },
  witchwater: { name: 'WITCHWATER', color: '#b05ae8', what: 'magic x1.5' },
  featherfoot: { name: 'FEATHERFOOT CORDIAL', color: '#8ae86a', what: 'speed x1.12' },
  deeppockets: { name: 'DEEP POCKETS', color: '#e8c84a', what: 'carry 12 keys and flasks' }
};
const AMULETS = {
  veil: { name: 'VEIL', color: '#c8d0ff', what: 'monsters lose you' },
  ironskin: { name: 'IRONSKIN', color: '#f0c040', what: 'no damage' },
  stench: { name: 'STENCH', color: '#7ad04a', what: 'monsters flee you' },
  ricochet: { name: 'RICOCHET', color: '#4ab0f0', what: 'shots bounce' },
  rending: { name: 'RENDING', color: '#f04a8a', what: 'shots pierce all' }
};
const AMULET_TIME = 20;

// ---- 13-art.js ----
/* 13-art: new art for the Gaunt. String sprites (items, shots, icons), monster rigs (with the engine's new gear), the
 * Shade (a cloth ghost drawn in code), and painters for the generators, doors' bars, pads, fields and the stairs. */

const SPR = {};
const PALS = {
  k: { y: '#f8d048', Y: '#a87018', w: '#fff6c0' },
  g: { y: '#f8d048', Y: '#b07818', o: '#fff0a0', d: '#6a4410' }
};
function buildArt() {
  if (SPR.key) return;
  const S = (rows, pal, sc) => E.sprite(rows, pal, sc);
  SPR.key = S(['.yy.....', 'y..y....', 'Y..Yyyyy', '.YY..y.y', '.....Y.Y'], PALS.k);
  SPR.keySmall = SPR.key;
  SPR.gold = S(['...oo...', '..oyyo..', '.yyoyyy.', 'yyyYyyYy', 'YyYYyYYY', '.YYddYY.'], PALS.g);
  SPR.gem = S(['..www..', '.wGGgg.', 'wGGGggd', 'gGGggdd', '.gggdd.', '..gdd..', '...d...'], { w: '#e8fff0', G: '#5ae0a0', g: '#1ea870', d: '#0e6a44' });
  SPR.crown = S(['y...y...y', 'yy.yyy.yy', 'yyyyyyyyy', 'YrYbYrYbY', 'YYYYYYYYY', '.YYYYYYY.'], { y: '#ffe06a', Y: '#c8901a', r: '#e83a4a', b: '#4a8ae8' });
  SPR.roast = S(['......ww..', '..bbbb.ww.', '.bBBBBbw..', 'bBBbBBBb..', 'bBbBBBBb..', 'bbBBBbbb..', '.dbbbbd...', '..dddd....'], { b: '#b0602a', B: '#d8844a', d: '#6a3014', w: '#f4ecd8' });
  SPR.loaf = S(['..bbbbb..', '.bBwBwBb.', 'bBBBBBBBb', 'bBBBBBBBb', 'dbbbbbbbd', '.ddddddd.'], { b: '#c8883a', B: '#e8b064', w: '#f8e0a8', d: '#7a4a1a' });
  SPR.cider = S(['..cc...', '.cCCc..', '.cccc.h', 'jJJJJjh', 'jJlJJjh', 'jJJJJj.', 'jjJJjj.', '.jjjj..', '.dddd..'], { c: '#8a5a2a', C: '#b07a3a', j: '#8a4a26', J: '#c87a3a', l: '#f0c890', h: '#6a3a1a', d: '#4a2410' });
  SPR.stew = S(['.g.G..g..', '..G.g.G..', 'GgggGgggG', 'bGgGgGgGb', '.bbbbbbb.', '..bbbbb..'], { g: '#5aa02a', G: '#9ae84a', b: '#6a5a4a' });
  const potion = (c) => S(['..cc..', '..ww..', '.wllw.', 'wlLLlw', 'wLLLLw', 'wLLLLw', '.wLLw.', '..ww..'], { c: '#8a5a2a', w: '#d8e8f0', l: E.shade(c, -.2), L: c });
  SPR.flask = potion('#4a9ae8');
  SPR.special = {}; for (const k in SPECIALS) SPR.special[k] = potion(SPECIALS[k].color);
  const amulet = (c) => S(['.yyy.', 'y...y', 'y...y', '.yGy.', '.GGG.', '..G..'], { y: '#e8c04a', G: c });
  SPR.amulet = {}; for (const k in AMULETS) SPR.amulet[k] = amulet(AMULETS[k].color);
  SPR.platter = S(['....rrr.....', '..rRRRRr.g..', '.rRRwRRRrgg.', 'ppppppppppp.', '.PPPPPPPPP..'], { r: '#b0602a', R: '#d8844a', w: '#f4ecd8', g: '#5aa02a', p: '#e8e0d0', P: '#a8a090' });
  SPR.bell = S(['....y....', '...yyy...', '..yYYYy..', '..yYYYy..', '.yYYYYYy.', '.yYYYYYy.', 'yYYYYYYYy', 'YYYYYYYYY', '....d....'], { y: '#ffe06a', Y: '#c8901a', d: '#6a4410' });
  SPR.gauntlet = S(['.mm.mm....', 'mMMmMMm...', 'mMMmMMmm..', 'mMMMMMMmm.', 'mMMMMMMMm.', '.mMMMMMMm.', '.mMMMMMm..', '..gggggg..', '..gGGGGg..', '...gggg...'], { m: '#5a5a6a', M: '#a8acc0', g: '#c8901a', G: '#ffe06a' });
  SPR.gauntletBig = E.sprite(['.mm.mm....', 'mMMmMMm...', 'mMMmMMmm..', 'mMMMMMMmm.', 'mMMMMMMMm.', '.mMMMMMMm.', '.mMMMMMm..', '..gggggg..', '..gGGGGg..', '...gggg...'], { m: '#5a5a6a', M: '#a8acc0', g: '#c8901a', G: '#ffe06a' }, 2);
  SPR.lock = S(['.yy.', 'y..y', 'YYYY', 'YdYY', 'YYYY'], { y: '#c8c8d0', Y: '#e8c04a', d: '#3a2a10' });
  // shots
  SPR.shot_axe = S(['..mm.', '.mMMm', 'wwwMm', '.mMMm', '..mm.'], { m: '#7a7a86', M: '#d8dce8', w: '#8a5a2a' });
  SPR.shot_javelin = S(['ww........', '.wwwwwwwMM', 'ww........'], { w: '#b08a50', M: '#e8ecf4' });
  SPR.shot_arrow = S(['f.......', '.wwwwwwM', 'f.......'], { w: '#c8a060', M: '#e8ecf4', f: '#e84a4a' });
  SPR.shot_hex = S(['.p.', 'pPp', '.p.'], { p: '#c86af0', P: '#ffe8ff' });
  SPR.crock = S(['.bb.', 'bBBb', 'bBBb', '.bb.'], { b: '#8a5a3a', B: '#c88a5a' });
  SPR.plate = S(['.www.', 'wWWWw', '.www.'], { w: '#c8c0b0', W: '#f4f0e8' });
  SPR.fireball = S(['.oo.', 'oYYo', 'oYYo', '.oo.'], { o: '#ff6a1a', Y: '#fff0a0' });
  // icons for menus and How to Play
  SPR.stairsIcon = S(['mmmmmmmmmm', 'mddddddddm', 'mdkkkkkkdm', 'mdkddddkdm', 'mdkdkkdkdm', 'mdkdkkdkdm', 'mdkddddkdm', 'mdkkkkkkdm', 'mddddddddm', 'mmmmmmmmmm'], { m: '#6a6a74', d: '#2a2228', k: '#120c10' });
  SPR.urnIcon = S(['..cccc..', '.c....c.', '..cCCc..', '.cCCCCc.', 'cCCCCCCc', 'cCCdCCCc', 'cCCCCCCc', '.cCCCCc.', '..cccc..'], { c: '#5a4a3a', C: '#8a7a6a', d: '#2a1a10' });
  SPR.ghostIcon = S(['..wwww..', '.wwwwww.', 'wwkwwkww', 'wwwwwwww', 'ww.kk.ww', 'wwwwwwww', 'w.ww.ww.'], { w: '#d8e0f0', k: '#1a1028' });
  SPR.heart = S(['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..'], { R: '#e8384a' });
}
buildArt();

/* ---- monster rigs (by type and rank: wounded monsters shrink and pale) ---- */
const RANK_SIZE = [.88, 1, 1.15];
function monsterRig(type, rank) {
  const s = RANK_SIZE[rank - 1] || 1, pale = rank === 1 ? .18 : rank === 2 ? .06 : 0, P = c => E.shade(c, pale);
  switch (type) {
    case 'gnasher': return new E.Humanoid({ size: .95 * s, build: 'bulky', weapon: 'club', hair: 'bald', eyeGlow: '#ffd84a', outfit: 'tunic', colors: { skin: P('#7a9a5a'), cloth: P('#6a4a2a'), trim: '#a87a3a', pants: '#3a2a1a', boot: '#2a1a10', belt: '#2a1a10', staff: '#6a4024' } });
    case 'lobber': return new E.Humanoid({ size: .85 * s, weapon: null, hat: { style: 'toque' }, outfit: 'tunic', hair: 'short', face: { eyes: 'big' }, colors: { skin: P('#e8b090'), hair: '#5a3a2a', cloth: P('#e8e4dc'), trim: '#c84a3a', pants: '#4a4a5a', boot: '#3a2a2a', belt: '#c84a3a' } });
    case 'fryar': return new E.Humanoid({ size: 1.0 * s, build: 'heroic', weapon: 'pan', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ffb84a', colors: { skin: P('#c8a088'), hair: '#3a2a22', cloth: P('#5a3a2a'), trim: '#c8a040', belt: '#c8a040', boot: '#2a1a14', metal: '#3e3838' } });
    case 'snatcher': return new E.Humanoid({ size: .8 * s, weapon: null, hood: true, outfit: 'tunic', sleeves: 'long', face: { eyes: 'big' }, cape: { len: 3, width: 4, seg: 2 }, colors: { skin: P('#b8c890'), hair: '#4a4a3a', cloth: P('#6a6a4a'), trim: '#a89860', pants: '#3a3a2a', boot: '#2a2a1a', cape: '#a88a5a', capeIn: '#6a5a3a', eye: '#ff4a4a' } });
    case 'tithe': return new E.Humanoid({ size: 1.3, build: 'skeleton', weapon: 'scythe', outfit: 'robe', hood: true, sleeves: 'long', eyeGlow: '#ff3a3a', colors: { bone: '#e8e0d0', cloth: '#1a1420', hair: '#120c18', trim: '#3a2a4a', belt: '#3a2a4a', boot: '#120c18', metal: '#c8ccd8', staff: '#3a2a22' } });
    case 'imp': return new E.Blob({ R: 5 * s, colors: { dk: '#8a1a0a', base: P('#e84a1a'), lt: '#ffa04a', spec: '#fff0a0', eye: '#ffe84a', pupil: '#3a0a0a' }, horns: true, wings: true, tail: true, mouth: 'fangs', feet: true, face: 'front' });
    case 'king': return new E.Humanoid({ size: 2.3, build: 'skeleton', weapon: 'fork', hat: { style: 'crown', color: '#ffd84a' }, outfit: 'robe', sleeves: 'long', cape: { len: 9, width: 8, seg: 3 }, eyeGlow: '#ffd84a', colors: { bone: '#e8dcc0', cloth: '#5a1a6a', trim: '#e8c04a', belt: '#e8c04a', boot: '#2a1020', cape: '#8a1a3a', capeIn: '#3a0a1a', metal: '#d8c890', staff: '#c8a040' } });
    default: return null;
  }
}

/* ---- the Shade: a hungerghost's sheet, drawn in code (a sine hem that flutters, eye holes, a gaping mouth) ---- */
function drawShade(g, ox, oy, m, t, scale) {
  const s = (RANK_SIZE[m.rank - 1] || 1) * scale, H = 13 * s, Wd = 7 * s, bob = Math.sin(t * 4 + m.id) * 1.5, y0 = oy - 6 - H + bob;
  const pale = m.rank === 1 ? '#c8d0e0' : m.rank === 2 ? '#a8b4d0' : '#8a98c8', dk = E.shade(pale, -.35), hi = E.shade(pale, .3);
  const speed = Math.min(1, Math.hypot(m.vx, m.vy) / 40), pts = [];
  for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; pts.push([ox + Math.cos(a) * Wd, y0 + Wd + Math.sin(a) * Wd]); }
  for (let i = 0; i <= 8; i++) { const u = i / 8, x = ox + Wd - u * Wd * 2, wave = Math.sin(t * 9 + u * 9 + m.id) * (1.2 + speed * 1.8); pts.push([x, y0 + H + wave]); }
  px.blend(g, .8, 'normal', () => { px.poly(g, pts, dk); px.poly(g, pts.map(([x, y]) => [x - .7, y - .7]).slice(0, 11).concat([[ox - Wd + 1, y0 + H - 2], [ox + Wd - 1, y0 + H - 2]]), pale); });
  px.rect(g, ox - Wd * .5, y0 + 3, Math.max(1, s), Math.max(1, s * 2) | 0, hi);
  // eye holes and the mouth that gapes nearer a hero
  const ey = y0 + Wd * .8, open = Math.min(1, m.mouth || 0);
  px.glow(g, 1); px.rect(g, ox - 3 * s, ey, Math.max(1, 2 * s) | 0, Math.max(1, 2 * s) | 0, '#ff4a6a'); px.rect(g, ox + 1 * s, ey, Math.max(1, 2 * s) | 0, Math.max(1, 2 * s) | 0, '#ff4a6a'); px.glow(g, 0);
  px.ell(g, ox, ey + 4 * s, 2 * s, (1 + open * 2.5) * s, '#1a0a1a');
}

/* ---- generators: painters with three damage states, a breathing pulse while they spawn ---- */
function drawGen(r, gen, t) {
  const dmg = gen.hp < genMaxHp(1) * .5 ? 2 : gen.rank < (gen.rank0 || gen.rank) ? 1 : 0, shake = gen.shake > 0 ? Math.sin(t * 60) * 1 : 0, br = 1 + Math.sin(t * 3 + gen.id) * .04;
  r.shadow(gen.x, gen.y, 9, .4);
  r.queue(gen.x, gen.y, 0, g => {
    const [sx, sy] = r.w(gen.x, gen.y, 0), x = sx + shake, y = sy;
    const crack = (cx0, cy0, n) => { for (let i = 0; i < n; i++) px.line(g, cx0 + i * 3 - 3, cy0 - 6 + i * 2, cx0 + i * 3 + 1, cy0 - 1 + i * 3, '#1a0e08'); };
    switch (gen.type) {
      case 'urn': case 'tureen': {
        const c = gen.type === 'tureen' ? ['#c8c0b0', '#f0ece4', '#8a8478'] : ['#6a5a4a', '#9a8a76', '#3a2e24'];
        const z = gen.onTable ? -10 : 0;
        px.ell(g, x, y - 7 * br + z, 7 * br, 7 * br, c[2]); px.ell(g, x - 1, y - 8 * br + z, 6 * br, 6 * br, c[0]); px.ell(g, x - 2, y - 10 * br + z, 3, 3, c[1]);
        px.rect(g, x - 4, y - 15 * br + z, 8, 3, c[2]); px.rect(g, x - 3, y - 15 * br + z, 6, 1, c[1]);
        if (gen.type === 'tureen') { px.rect(g, x - 9, y - 9 + z, 2, 3, c[2]); px.rect(g, x + 7, y - 9 + z, 2, 3, c[2]); }
        px.blend(g, .5, 'add', () => px.ell(g, x, y - 16 * br + z, 3, 2, '#8affd0'));
        if (dmg) crack(x - 2, y - 6 + z, dmg * 2);
        break;
      }
      case 'den': px.ell(g, x, y - 4, 10 * br, 6, '#4a3a22'); px.ell(g, x - 1, y - 5, 9 * br, 5, '#6a5432'); px.ell(g, x, y - 4, 4, 3, '#120a04'); for (let i = 0; i < 5; i++) px.line(g, x - 9 + i * 4, y - 7, x - 7 + i * 4, y - 12 - (i % 2) * 2, '#8a7a5a'); if (dmg) crack(x + 2, y - 3, dmg * 2); break;
      case 'hutch': r.box(g, gen.x - 7, gen.y - 4, 0, gen.x + 7, gen.y + 4, 18 * br, '#8a5a32', '#6a4226'); px.rect(g, x - 6, y - 14, 12, 1, '#c8c0b0'); px.rect(g, x - 5, y - 16, 3, 2, '#e8e0d0'); px.rect(g, x + 1, y - 16, 4, 2, '#b8b0a0'); if (dmg) crack(x, y - 8, dmg * 2); break;
      case 'grate': { const on = (Math.sin(t * 5 + gen.id) + 1) / 2; px.rect(g, x - 8, y - 5, 16, 10, '#2a2020'); px.glow(g, 1); for (let i = 0; i < 4; i++) px.rect(g, x - 7 + i * 4, y - 4, 2, 8, on > .5 ? '#ffb43a' : '#ff6a1a'); px.glow(g, 0); px.rect(g, x - 8, y - 5, 16, 1, '#5a4a44'); if (dmg) crack(x, y, dmg * 2); break; }
      case 'shrine': r.box(g, gen.x - 6, gen.y - 4, 0, gen.x + 6, gen.y + 4, 10, '#6a6a7a', '#4a4a5a'); for (const k of [-4, 0, 4]) { px.rect(g, x + k - 1, y - 16, 2, 5, '#f0e8d0'); px.glow(g, 1); px.rect(g, x + k - 1, y - 19 + Math.sin(t * 9 + k) * .6, 2, 2, '#ffd84a'); px.glow(g, 0); } if (dmg) crack(x, y - 6, dmg * 2); break;
      case 'sacks': for (const [dx, dy, rr] of [[-4, 0, 5], [4, 1, 5], [0, -5, 4.5]]) { px.ell(g, x + dx, y - 4 + dy, rr * br, rr * .85, '#8a6a3a'); px.ell(g, x + dx - 1, y - 5 + dy, rr * .7, rr * .6, '#b08a50'); } if (dmg) crack(x, y - 4, dmg * 2); break;
    }
  }, { solid: true });
}

// ---- 15-floors.js ----
/* 15-floors: every floor as ASCII rows in the shared legend (20-level.js). Edit the rows by hand; the floors test
 * (node tests/run.mjs floors) checks each one is bordered, uses the legend and can be finished. */
def('floors', 'f1', Object.assign({"name": "THE PANTRY STEPS", "realm": "larder", "no": 1, "rank": 1, "genRank": 1, "par": 120, "music": "larder"}, { rows: [
  "########################################",
  "#@@......#..........#..........#.......#",
  "#@@......#...g......#....$.....#...*...#",
  "#........#..........#..........#.......#",
  "#...b....#..######..#...g......#...h...#",
  "#........#..#.k..#..#..........+.......#",
  "#............g...#.......f.....+...E...#",
  "#........#..#....#..#..........#.......#",
  "#........#..######..#....G.....#...$...#",
  "#........#..........#..........#.......#",
  "####..########..#########..#############",
  "#......................#...............#",
  "#..g......##....G......#.....g.........#",
  "#..........#...........#.........*.....#",
  "#....f.....#....g...........######.....#",
  "#..........#................#..........#",
  "#..$.......####.......$.....#...f......#",
  "#...........................#..........#",
  "#.........g.................#....b.....#",
  "########################################",
]}));
def('floors', 'f2', Object.assign({"name": "THE ROOT CELLAR", "realm": "larder", "no": 2, "rank": 1, "genRank": 2, "par": 160, "music": "larder"}, { rows: [
  "################################################",
  "#........############.........#................#",
  "#.@@.....############.$....k..#.mmm............#",
  "#.@@.....############...n.....#.......N......n.#",
  "#..............n..............+................#",
  "#.....f.......................+................#",
  "#........############......n..######..n.....N..#",
  "#........############.n.......######...........#",
  "###..################.........######......n....#",
  "###..################.........######...........#",
  "###j.#......############..##########.....N...k.#",
  "###..#.$$..4############..##########...........#",
  "###..+......##.................#########++######",
  "###.j+......##..b............g.##..............#",
  "###..#....h.##......n......%...##.............*#",
  "###j.#...*..##...%%........%...##..$...........#",
  "###..#########...%.............##..........g...#",
  "#............#.......G.........##..............#",
  "#............#............n...*##......%%......#",
  "#.....g......#........%%.......##.......%......#",
  "#.......n.%..#.........%.......##....g.........#",
  "#.........%..#.$...............##..............#",
  "#..........................N...##...........f..#",
  "#..............................##..............#",
  "#....n.......#....%%...........##....G.........#",
  "#............#.....%.....g.....##..g...........#",
  "#.k........n.#..n...........n..##...........E..#",
  "#.b..........#...............h.##..............#",
  "#............#.................##..............#",
  "################################################",
]}));
def('floors', 'f3', Object.assign({"name": "THE SMOKEHOUSE", "realm": "larder", "no": 3, "rank": 2, "genRank": 2, "par": 170, "music": "larder", "specials": ["hardshot"]}, { rows: [
  "####################################################",
  "#........m.####....................##..............#",
  "#.@@.......####..n......g.......L..##...........L..#",
  "#.@@..............%%%%%...%%%%%%...##..............#",
  "#...................o..............##...o..........#",
  "#................................n.##..............#",
  "#..........####...%%%%%...%%%%%%...................#",
  "#.......f..####.............o......................#",
  "#..........####....................##..............#",
  "####..#########...%%%%%...%%%%%%...##.........o....#",
  "####..#########......o.............##..n...........#",
  "####..#########.g............o.....##............k.#",
  "####..#########...%%%%%...%%%%%%...##..............#",
  "####..#########....................#######++########",
  "####..##################..###########..............#",
  "####..#############................................#",
  "####..#############................$........N......#",
  "#................##.......TTTTT..............n.....#",
  "#.^.........gTTT.##.......TnnnT...................$#",
  "#............TnT.##.......TTTTT....................#",
  "#............TTT.##.................X.....o........#",
  "#................##.................X..............#",
  "#.......n........##...n.......G....................#",
  "#................##................................#",
  "#............................................g.....#",
  "#.....g............................................#",
  "#............n...##............o........G......#####",
  "#................##.j..........................#####",
  "#.......##+##....##...............L............#..##",
  "#.......#...#....##...g........................Xl.##",
  "#.......#.u.#.N..##..............n......n.....E#.f##",
  "#.k.....#...#..$.##....f.......................#*m##",
  "#h..............*##............................#####",
  "####################################################",
]}));
def('floors', 't1', Object.assign({"name": "THE PANTRY HOARD", "realm": "larder", "no": 0, "hoard": 1, "rank": 1, "genRank": 1, "par": 30, "music": "hoard"}, { rows: [
  "################################",
  "#..............................#",
  "#.@@..$..$..$..$..$..$..$....f.#",
  "#.@@...........................#",
  "#....%%%%%............%%%%%....#",
  "#..............................#",
  "#.....$..$..$..$..$..$..$......#",
  "#..............................#",
  "#.$.%.....*....w.....*.....%...#",
  "#...%......................%...#",
  "#.$.%......................%...#",
  "#...%.*......*.............%...#",
  "#...%..........E..*......*.%...#",
  "#...%......................%...#",
  "#...%......................%...#",
  "#...%.....*..........*.....%...#",
  "#..............................#",
  "#.....$..$..$..$..$..$..$......#",
  "#..............................#",
  "#....%%%%%............%%%%%....#",
  "#..............................#",
  "#.f...$..$..$..$..$..$..$......#",
  "#..............................#",
  "################################",
]}));
def('floors', 'f4', Object.assign({"name": "THE BONE LARDER", "realm": "ossuary", "no": 4, "rank": 2, "genRank": 2, "par": 180, "music": "ossuary", "amulets": ["veil", "ricochet"]}, { rows: [
  "####################################################",
  "#......................f.##.......................k#",
  "#.@@.......zf............##...........g.........a..#",
  "#.@@..............n......##..O.....y........n......#",
  "#........................##...................F....#",
  "#........................##........................#",
  "#....%%%%%....%%%%%......##....%%%%%....%%%%%......#",
  "#........................##........................#",
  "#.....$......g...*..g...+.m.............y.$......g.#",
  "#........................##...g....................#",
  "#....%%%%%....%%%%%......##....%%%%%....%%%%%......#",
  "#........................##........................#",
  "#........................##...........N......y.....#",
  "#.......n...y...G.....O..##......n..............O..#",
  "#.......................k##........................#",
  "#........................##........................#",
  "####################################################",
  "####################################################",
  "#......................n.##........................#",
  "#...........g............##........................#",
  "#..O................y....##..O..........G.....y....#",
  "#...........G............##.......n................#",
  "#........................##........................#",
  "#....%%%%%....%%%%%......##....%%%%%....%%%%%......#",
  "#........................##........................#",
  "#.....n.$.......n.......g##.......$........*g......#",
  "#........................##.........zf.............#",
  "#....%%%%%....%%%%%......##....%%%%%....%%%%%......#",
  "#........................##........................#",
  "#.g.....F...........N....##........y...............#",
  "#.........y...........O..##...........g.......E.n..#",
  "#.a......................##...n..................m.#",
  "#k.......................##......................l.#",
  "####################################################",
]}));
def('floors', 'f5', Object.assign({"name": "THE CHOIR OF TEETH", "realm": "ossuary", "no": 5, "rank": 2, "genRank": 3, "par": 200, "music": "ossuary", "specials": ["witchwater", "ironbrew"]}, { rows: [
  "########################################################",
  "#..........##.........................................j#",
  "#.@@.....f.##.................o..............g.........#",
  "#.@@.......##.......y..................................#",
  "#.................................................o....#",
  "#.........................F............................#",
  "#.......................................y..............#",
  "#..........##..g....................................L..#",
  "#..........##.....................$....................#",
  "#..........##.........................................k#",
  "#####..######.!...!...!...!...!...!...!...!...!...!....#",
  "#####..######...!...!...!...!...!...!...!...!...!...!..#",
  "#.k........##....................f...................m.#",
  "#..........##.......................o.............g....#",
  "#......G...##...%.....%.....%.....%.....%.....%.....%..#",
  "#.....g....##...................................o......#",
  "#..........##.g.........y..............................#",
  "#..........##....................B.....................#",
  "#..........##..........................................#",
  "#..........##.....o.........................y..........#",
  "#.......g..##...........................F..............#",
  "#..........##...%.....%.....%.....%.....%.....%.....%..#",
  "#..........##...............g.......................g..#",
  "#..........##j.........................................#",
  "#----------##..........................................#",
  "#..........##..!....!....!....!....!....!....!....!....#",
  "#..........##........................................f.#",
  "#..........##.........g.....................#####+######",
  "#....$.....##.............o...##............#.........##",
  "#..........##.................##...g........#.....E...##",
  "#..u....u..##.......y.........||..........o.#.........##",
  "#..........##.................||............#.$....t..##",
  "#.....$....##...........L.....##......y.....#...*.....##",
  "#.m.*....m.##...o.............##............#.........##",
  "#..........##km.....................G.......############",
  "########################################################",
]}));
def('floors', 'f6', Object.assign({"name": "THE CRYPT OF PICKLED KINGS", "realm": "ossuary", "no": 6, "rank": 2, "genRank": 3, "par": 200, "music": "ossuary", "specials": ["ogreale"], "amulets": ["stench"], "allyStun": true}, { rows: [
  "########################################################",
  "#.....................................................k#",
  "#.@@.m.................................................#",
  "#.@@......n...y.............n...............n..........#",
  "#...................................o...............y..#",
  "#.....####....####....####....####....####....####.....#",
  "#.....####....####....#u.#....####....#8.#....####.....#",
  "#.....####....####....?..#....####....?..#....####.....#",
  "#.....####....####....####....####....####....####.....#",
  "#...........................................*..........#",
  "#...................x.............................o....#",
  "#.................N.........o.....n....................#",
  "#f....####..$.####..g.####....####....####.g..####..####",
  "#.....####.g..#w.#....####....####....####....####..#..#",
  "#.....####....?..#....####....####....####....####..#..#",
  "#.....####....####....####....####....####....####..#..#",
  "#...................................$.......x.......#..#",
  "#....................m.......S......................#..#",
  "#..........o......n.......F...f.......y.............Ya.#",
  "#.....####....####....####....####....####....####$.#..#",
  "#...*.####....####....####....#w.#....####....####..#.m#",
  "#.....####....####....####....?..#....####....####..#..#",
  "#.....####....####....####....####....####..g.####..#..#",
  "#...................................................#..#",
  "#.....n.............................x...............####",
  "#............S......o.....y...............G............#",
  "#.....####....####....####....####L...####....####g...k#",
  "#.....####....####....####....####....####....#w.#.....#",
  "#.....####....####....####.$..####....####....?..#.....#",
  "#.....####....####....####....####....####....####.....#",
  "#...........x.................g...........o............#",
  "#...y.............................................n.f..#",
  "#.........................n............................#",
  "#.....####....####..y.####....####g...####m..###########",
  "#.v...####....####.g..####....####....####...+........##",
  "#.....####....####....####....####....####...+....E...##",
  "#k....####....####....####..k.####....####...#........##",
  "########################################################",
]}));
def('floors', 't2', Object.assign({"name": "THE RELIQUARY", "realm": "ossuary", "no": 0, "hoard": 2, "rank": 1, "genRank": 1, "par": 30, "music": "hoard", "lchest": "deeppockets"}, { rows: [
  "################################",
  "#..............................#",
  "#.@@.......................w...#",
  "#.@@..$...$...$*..$...$...$....#",
  "#..............................#",
  "#.....%%%%%%%......%%%%%%%.....#",
  "#..............................#",
  "#.....$...$...$...$...$...$....#",
  "#..............%%..............#",
  "#........*.....%%.....*........#",
  "#..............................#",
  "#....*......*..E...............#",
  "#..................*......*....#",
  "#..............................#",
  "#........*.....%%.....*........#",
  "#..............%%..............#",
  "#.....$...$...$...$...$...$....#",
  "#..............................#",
  "#.....%%%%%%%......%%%%%%%.....#",
  "#..............................#",
  "#.....$...$...$.*.$...$...$....#",
  "#.k.........................l..#",
  "#..............................#",
  "################################",
]}));
def('floors', 'f7', Object.assign({"name": "THE OVEN STAIR", "realm": "furnace", "no": 7, "rank": 2, "genRank": 3, "par": 200, "music": "furnace", "specials": ["featherfoot"], "amulets": ["ironskin"]}, { rows: [
  "########################################################",
  "#.....................................................u#",
  "#.@@........$.................i.................f......#",
  "#.@@................%%%.................n..............#",
  "#..............i....%%%..........I.....................#",
  "#.........N.........%%%..o..................i.......n..#",
  "#m....................................................k#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~....~~~~~#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~s..s~~~~~#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~....~~~~~#",
  "#.....................................................*#",
  "#.......f.......o..................i...................#",
  "#....n..............i.......I.......%%%.........n......#",
  "#...........i.................n.....%%%.....N.....i....#",
  "#...j...............................%%%................#",
  "#.k...................................$...............m#",
  "#~~~~~....~~~~~~~~~~~~~~.X..~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
  "#~~~~~s..s~~~~~~~~~~~~~~.s..~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
  "#~~~~~....~~~~~~~~~~~~~~....~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
  "#......................................................#",
  "#.......................................o..............#",
  "#.............%%%.....n.......i...................o....#",
  "#.......i.....%%%...I.......................i.......L..#",
  "#a............%%%.......$..m..........n................#",
  "#.*.........o...................................f.....k#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~....~~~~~#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~s..s~~~~~#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~....~~~~~#",
  "#...................................................j..#",
  "#...................................I...........########",
  "#.........n.......i...........o.........%%%.....#......#",
  "#.............L...................i.....%%%.....+......#",
  "#.........................n.............%%%...n.+...E..#",
  "#m....$.........................................#......#",
  "#...............................................#......#",
  "########################################################",
]}));
def('floors', 'f8', Object.assign({"name": "THE GRISTLE GATE", "realm": "furnace", "no": 8, "rank": 3, "genRank": 3, "par": 220, "music": "furnace", "specials": ["quickshot"], "amulets": ["rending"]}, { rows: [
  "############################################################",
  "#k......m##########################################.......m#",
  "#.@@..................g.......s.....N.........i...m........#",
  "#.@@........n..................s..n........................#",
  "#...............n...G.....o...$.......................n....#",
  "#.......................................y..................#",
  "#........###################..#####################........#",
  "#........###################..#####################...G....#",
  "#........###################..#####################........#",
  "#........###################..#####################........#",
  "#f......................i.................I.....n.......i..#",
  "#...........g.........................o....................#",
  "#.............L...n......$....m.............g.........o....#",
  "#...............................n.................k........#",
  "#....g...###########..#############################.......f#",
  "#........###########XX#############################........#",
  "#........###########..#############################.########",
  "#........###########..#############################.#..#...#",
  "#.............................i.....................#..#...#",
  "#k............y.............F.............n.........+..+.E.#",
  "#!!!.!!!!...............n......................o..f.+..+...#",
  "#........j........................*.g...............#..#...#",
  "#........#############################..###########.#..#...#",
  "#........#############################..###########.########",
  "#........#############################..###########........#",
  "#........#############################..###########........#",
  "#...............G...x.....y.........s..................t..f#",
  "#..........n.........................s......i..............#",
  "#f................g.........................N...x.....g....#",
  "#.........*.......................n...............j........#",
  "#....n...###################...####################.......j#",
  "#........###################---####################........#",
  "#........###################...####################........#",
  "#........###################...####################.....n..#",
  "#...............s.......I...............S..................#",
  "#...........o....s................g...........y............#",
  "#.....................n......................$......i.....k#",
  "#......O.k..............................n.........m......O.#",
  "#u......m##########################################.......a#",
  "############################################################",
]}));
def('floors', 'f9', Object.assign({"name": "THE BANQUET OF KING FAMISH", "realm": "banquet", "no": 9, "rank": 2, "genRank": 2, "par": 300, "music": "boss", "boss": true, "points": {"wave": [[1, 15], [42, 16], [21, 30], [5, 1], [38, 1]]}}, { rows: [
  "############################################",
  "#..........................................#",
  "#.f......................................f.#",
  "#....................K.....................#",
  "#..........................................#",
  "#..........................................#",
  "#..........................................#",
  "#..........................................#",
  "#.........%%.....................%%........#",
  "#.........%%.........==..........%%........#",
  "#....................==....................#",
  "#....................PU....................#",
  "#....................==....................#",
  "#....................==....................#",
  "#....................==....................#",
  "#m...................==...................m#",
  "#.........%%.........UP..........%%........#",
  "#.........%%.........==..........%%........#",
  "#....................==....................#",
  "#....................==....................#",
  "#....................==....................#",
  "#....................P=....................#",
  "#....................==....................#",
  "#....................==....................#",
  "#.........%%.........==..........%%........#",
  "#.........%%.....................%%........#",
  "#..........................................#",
  "#..........................................#",
  "#...................@..@...................#",
  "#.f.................@..@.................f.#",
  "#..........................................#",
  "############################################",
]}));
const FLOOR_ORDER = ["f1", "f2", "f3", "t1", "f4", "f5", "f6", "t2", "f7", "f8", "f9"];

// ---- 20-level.js ----
/* 20-level: realms (looks), the floor parser (legend -> TileMap, entities, door runs, traps, pads, beams) and
 * validateFloor(), the solvability check the floors test runs on every floor. */

/* ---- realms: palettes, wall materials, light ---- */
const rgb = h => E.hex(h);
const REALMS = {
  larder: { stones: ['#3e3028', '#463630', '#4e3c34', '#58443a', '#2e2420'], mortar: '#16100c', alt: '#5a3a26', wallTop: '#a48c6a', wallSide: '#76583e', face: 'stone', accent: { face: 'plank', top: '#8a6236', side: '#6a4626', h: 14 }, ambient: .5, torch: '#ffa050', props: ['barrel', 'crate', 'sack', 'jar', 'barrel'] },
  ossuary: { stones: ['#2e323e', '#343844', '#3a3e4c', '#424656', '#24262e'], mortar: '#121318', alt: '#5a5850', wallTop: '#aeb0bc', wallSide: '#6a6c7c', face: 'ruin', accent: { face: 'bone', top: '#d8d0b8', side: '#b8ae94', h: 14 }, ambient: .4, torch: '#8ab0ff', props: ['skull', 'bones', 'jar', 'pot', 'cobweb'] },
  furnace: { stones: ['#2a2222', '#302626', '#362a2a', '#3e3030', '#1e1818'], mortar: '#0e0a0a', alt: '#3a2218', wallTop: '#8a7468', wallSide: '#5a4640', face: 'iron', accent: { face: 'rusted', top: '#7a4a2e', side: '#5a3424', h: 14 }, ambient: .32, torch: '#ff7a30', props: ['anvil', 'barrel', 'firedrum', 'crate'] },
  banquet: { stones: ['#2e2440', '#4e4262'], mortar: '#1a1426', alt: '#5a1a34', wallTop: '#b8a8c8', wallSide: '#7a6a8a', face: 'marble', accent: { face: 'marble', top: '#e8e0f0', side: '#b0a6c0', h: 24 }, ambient: .45, torch: '#ffd070', props: ['candelabra', 'banner', 'statue'] }
};
const WT = { wall: 1, accent: 2, cracked: 3, door: 4, trapT: 5, trapY: 6, table: 7, fake: 8 };

function realmTypes(rm) {
  const base = { h: 24, cut: true, cutH: 6, face: rm.face, roof: 'slab', top: rm.wallTop, side: rm.wallSide };
  return {
    1: base,
    2: { h: rm.accent.h, cut: true, cutH: 6, face: rm.accent.face, roof: rm.accent.face === 'plank' ? 'plank' : 'slab', top: rm.accent.top, side: rm.accent.side },
    3: { ...base, face: 'ruin', top: E.shade(rm.wallTop, .12), side: E.shade(rm.wallSide, .18) },
    4: { h: 24, cut: true, cutH: 6, face: 'iron', roof: 'iron', top: '#5a5a66', side: '#3e3e4a' },
    5: { ...base, face: 'rusted', top: '#7a5a3a', side: '#6a4a2e' },
    6: { ...base, face: 'rusted', top: '#5a6a3a', side: '#4a5a2e' },
    7: { h: 10, cut: false, face: 'walnut', roof: 'velvet', top: '#7a1a2a', side: '#5a3420' },
    8: base
  };
}

/* ---- the floor texture: flagstones per realm, with painted features ---- */
function makeFloorTex(rm, realmId) {
  const S = rm.stones.map(rgb), pal = { stones: S.slice(0, 4), mortar: rgb(rm.mortar), hi: S[3], lo: S[4] || S[0], speck: S[0] }, ALT = rgb(rm.alt);
  const LAVA = [rgb('#ff6a1a'), rgb('#ffb43a'), rgb('#c02a0a')], STAIR = [rgb('#120c10'), rgb('#2a2228'), rgb('#4a3e44')];
  const RUNE = rgb('#b05ae8'), PAD = rgb('#4ae0d0'), PLATE = rgb('#8a8a96'), METAL = rgb('#5a5a64');
  return (x, y, tag) => {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), lx = x - cx * T, ly = y - cy * T;
    let c;
    if (realmId === 'banquet') c = ((cx + cy) & 1) ? S[1] : S[0];
    else c = E.tex.flagstone(x, y, pal);
    if (tag === 'alt') { const k = E.hash2(Math.floor(x / 3), Math.floor(y / 3)); c = k < .5 ? ALT : c.map((v, i) => (v + ALT[i]) >> 1); }
    else if (tag === 'lava') { const n = E.noise2(x / 9, y / 7); return [...LAVA[n < .35 ? 2 : n < .7 ? 0 : 1], .8]; }
    else if (tag === 'stair') {   // a stairwell: steps going down, darker toward the middle
      const d = Math.max(Math.abs(lx - 8), Math.abs(ly - 8));
      if (d > 7) return METAL;
      const step = Math.floor(d / 2); return (Math.floor(d * 2) % 4 === 0) ? STAIR[2] : STAIR[Math.min(1, 3 - step < 0 ? 0 : 1)].map(v => v - (3 - step) * 4);
    }
    else if (tag === 'rune') { const d = Math.hypot(lx - 8, ly - 8); if (Math.abs(d - 5.5) < .7 || (d < 4 && (Math.abs(lx - 8) < .6 || Math.abs(ly - 8) < .6))) return [...RUNE, .6]; c = c.map(v => v * .8); }
    else if (tag === 'pad') { const d = Math.hypot(lx - 8, ly - 8); if (d < 7.5) return Math.abs(d - 6) < .8 || Math.abs(d - 3) < .6 ? [...PAD, .7] : c.map(v => v * .6); }
    else if (tag === 'plate') { if (lx > 2 && lx < 14 && ly > 2 && ly < 14) return (lx < 3 || ly < 3) ? PLATE.map(v => v + 30) : (lx > 13 || ly > 13) ? PLATE.map(v => v - 30) : PLATE; }
    else if (tag === 'spike') { if (lx > 1 && lx < 15 && ly > 1 && ly < 15) return ((Math.floor(lx) % 4 === 2) && (Math.floor(ly) % 4 === 2)) ? STAIR[0] : METAL; }
    else if (tag === 'beam') c = c.map(v => v * .7);
    // painted light: soft darkening near walls to the north and west (contact shading)
    return c;
  };
}

/* ---- the parser ---- */
const WALLISH = { '#': '#', '%': '%', 'X': 'X', '+': '+', 'T': 'T', 'Y': 'Y', '?': '?', '~': '~', '=': '=', 'P': '=', 'U': '=' };
const FLOORISH = { ',': 'alt', 's': 'spike', '!': 'rune', 'O': 'pad', '^': 'plate', 'v': 'plate', '|': 'beam', '-': 'beam', 'E': 'stair', '2': 'stair', '3': 'stair', '4': 'stair', '5': 'stair', '6': 'stair', '7': 'stair', '8': 'stair', '9': 'stair' };
const TM_LEGEND = { '#': 1, '%': 2, 'X': 3, '+': 4, 'T': 5, 'Y': 6, '=': 7, '?': 8, '~': { floor: 'lava', block: true },
  ',': { floor: 'alt' }, 's': { floor: 'spike' }, '!': { floor: 'rune' }, 'O': { floor: 'pad' }, '^': { floor: 'plate' }, 'v': { floor: 'plate' }, '|': { floor: 'beam' }, '-': { floor: 'beam' }, 'E': { floor: 'stair' } };
for (let d = 2; d <= 9; d++) TM_LEGEND[String(d)] = { floor: 'stair' };

function parseFloor(fd, o = {}) {
  const rows = fd.rows, h = rows.length, w = rows[0].length, rm = REALMS[fd.realm] || REALMS.larder;
  const clean = rows.map(r => [...r].map(ch => WALLISH[ch] || (FLOORISH[ch] ? ch : '.')).join(''));
  const map = o.noMap ? null : new E.TileMap({ rows: clean, legend: TM_LEGEND, types: realmTypes(rm), floorTex: makeFloorTex(rm, fd.realm), ao: 6, outside: '#05040a' });
  const out = { w, h, map, rows, starts: [], exits: [], pads: [], runes: [], spikes: [], beams: [], plates: [], items: [], mons: [], gens: [], doors: [], cracked: [], fakes: [], trapT: [], trapY: [], boss: null, tables: [] };
  let id = 1, si = 0, ai = 0;
  const C = (cx, cy) => ({ cx, cy, x: (cx + .5) * T, y: (cy + .5) * T });
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const ch = rows[cy][cx], c = C(cx, cy);
    if (ch === '@') out.starts.push(c);
    else if (ch === 'E') out.exits.push({ ...c, to: null });
    else if (ch >= '2' && ch <= '9') out.exits.push({ ...c, to: +ch });
    else if (ch === 'O') out.pads.push({ ...c, id: id++ });
    else if (ch === '!') out.runes.push(c);
    else if (ch === 's') out.spikes.push({ ...c, ph: E.hash2(cx, cy) * 1.6 });
    else if (ch === '|' || ch === '-') out.beams.push({ ...c, dir: ch === '|' ? 'v' : 'h' });
    else if (ch === '^' || ch === 'v') out.plates.push({ ...c, kind: ch === '^' ? 'T' : 'Y', used: false });
    else if (ch === '+') out.doors.push(c);
    else if (ch === 'X') out.cracked.push({ ...c, hp: 4 });
    else if (ch === '?') out.fakes.push(c);
    else if (ch === 'T') out.trapT.push(c);
    else if (ch === 'Y') out.trapY.push(c);
    else if (ch === 'K') out.boss = c;
    else if (ch === '=') out.tables.push(c);
    else if (ch === 'P') { out.tables.push(c); out.items.push({ ...c, id: id++, kind: 'platter', onTable: true }); }
    else if (ch === 'U') { out.tables.push(c); out.gens.push({ ...c, id: id++, type: 'tureen', onTable: true }); }
    else if (ITEM_CHAR[ch]) {
      const it = { ...c, id: id++, kind: ITEM_CHAR[ch] };
      if (it.kind === 'special') it.sub = (fd.specials || [])[si++] || 'ironbrew';
      if (it.kind === 'amulet') it.sub = (fd.amulets || [])[ai++] || 'veil';
      out.items.push(it);
    }
    else if (MON_CHAR[ch]) out.mons.push({ ...c, id: id++, type: MON_CHAR[ch] });
    else if (GEN_CHAR[ch]) out.gens.push({ ...c, id: id++, type: GEN_CHAR[ch] });
  }
  // pair transporters in reading order
  for (let i = 0; i + 1 < out.pads.length; i += 2) { out.pads[i].pair = i + 1; out.pads[i + 1].pair = i; }
  // door runs: 4-connected groups of door cells
  const seen = new Set(), key = (cx, cy) => cx + ',' + cy, doorAt = new Map(out.doors.map(d => [key(d.cx, d.cy), d]));
  out.doorGroups = [];
  for (const d of out.doors) {
    if (seen.has(key(d.cx, d.cy))) continue;
    const g = [], q = [d]; seen.add(key(d.cx, d.cy));
    while (q.length) { const c = q.pop(); g.push(c); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = key(c.cx + dx, c.cy + dy); if (doorAt.has(k) && !seen.has(k)) { seen.add(k); q.push(doorAt.get(k)); } } }
    out.doorGroups.push({ id: out.doorGroups.length, cells: g, open: false });
  }
  // pad the starts to four on free neighbours
  const free = (cx, cy) => { const ch = rows[cy] && rows[cy][cx]; return ch === '.' || ch === ','; };
  for (let i = 0; out.starts.length && out.starts.length < 4 && i < 40; i++) {
    const s = out.starts[i % out.starts.length];
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) { if (out.starts.length >= 4) break; if (free(s.cx + dx, s.cy + dy) && !out.starts.some(t => t.cx === s.cx + dx && t.cy === s.cy + dy)) out.starts.push(C(s.cx + dx, s.cy + dy)); }
  }
  return out;
}

/* ---- validateFloor: shape, legend and a solvability flood fill (keys versus doors, plates, pads) ---- */
const LEGEND_CHARS = new Set('#%X+TY?~.,@E23456789O!s|-^vkfbjzmua$*hlwBgnoiyxtGNLIFSK=PU');
function validateFloor(fd) {
  const errs = [], rows = fd.rows, h = rows.length, w = rows[0] && rows[0].length;
  if (!h || !w) return ['empty'];
  if (rows.some(r => r.length !== w)) errs.push('rows are not all the same width');
  if (w < 24 || w > 72 || h < 16 || h > 48) errs.push('size ' + w + 'x' + h + ' out of range');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = rows[y][x]; if (!LEGEND_CHARS.has(ch)) errs.push('unknown char ' + ch + ' at ' + x + ',' + y); if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && ch !== '#' && ch !== '%') errs.push('border open at ' + x + ',' + y); }
  const p = parseFloor(fd, { noMap: true });
  if (!p.starts.length) errs.push('no start');
  if (!p.exits.length && !fd.boss) errs.push('no stairs');
  if (fd.boss && !p.boss) errs.push('boss floor without K');
  const goals = fd.boss ? [p.boss] : p.exits;
  if (p.pads.length % 2) errs.push('odd transporter count');
  const cnt = (k) => p.items.filter(i => i.kind === k).length;
  if (cnt('special') !== (fd.specials || []).length) errs.push('special count ' + cnt('special') + ' != meta ' + (fd.specials || []).length);
  if (cnt('amulet') !== (fd.amulets || []).length) errs.push('amulet count mismatch');
  for (const g of p.gens) for (const s of p.starts) if (Math.abs(g.cx - s.cx) + Math.abs(g.cy - s.cy) < 4 && !fd.boss) errs.push('generator near start at ' + g.cx + ',' + g.cy);
  for (const e of p.exits) if (e.to && !FLOOR_ORDER.some(id => get('floors', id).no === e.to)) errs.push('skip target ' + e.to + ' missing');
  // flood fill
  const solid = new Set('#%+TY~=PU'.split('')), open = new Set();
  const K = (x, y) => y * w + x;
  const doorCells = new Map(); p.doorGroups.forEach(g => g.cells.forEach(c => doorCells.set(K(c.cx, c.cy), g.id)));
  const isWalk = (x, y) => { const ch = rows[y][x]; if (open.has(K(x, y))) return true; return !solid.has(ch); };
  let keys = 0, used = 0;
  const reached = new Set(), takenKeys = new Set();
  const opened = new Set();
  for (let pass = 0; pass < 200; pass++) {
    const q = p.starts.map(s => [s.cx, s.cy]).filter(([x, y]) => !reached.has(K(x, y)));
    q.forEach(([x, y]) => reached.add(K(x, y)));
    const all = [...reached].map(k => [k % w, Math.floor(k / w)]);
    const stack = all.slice();
    while (stack.length) {
      const [x, y] = stack.pop(), ch = rows[y][x];
      if (ch === 'k' && !takenKeys.has(K(x, y))) { takenKeys.add(K(x, y)); keys++; }
      if (ch === '^' || ch === 'v') for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (rows[yy][xx] === (ch === '^' ? 'T' : 'Y') && !open.has(K(xx, yy))) open.add(K(xx, yy));
      if (ch === 'O') { const i = p.pads.findIndex(d => d.cx === x && d.cy === y), o2 = p.pads[p.pads[i].pair]; if (o2 && !reached.has(K(o2.cx, o2.cy))) { reached.add(K(o2.cx, o2.cy)); stack.push([o2.cx, o2.cy]); } }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = K(nx, ny); if (reached.has(k) || !isWalk(nx, ny)) continue;
        reached.add(k); stack.push([nx, ny]);
      }
    }
    // the locked chests hand out a key when they are reachable and a key is spare
    if (goals.some(e => e && reached.has(K(e.cx, e.cy)))) return errs;
    // open the next door run next to the filled area if a key is spare
    let did = false;
    if (keys > used) for (const g of p.doorGroups) {
      if (opened.has(g.id)) continue;
      if (g.cells.some(c => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reached.has(K(c.cx + dx, c.cy + dy))))) { opened.add(g.id); used++; g.cells.forEach(c => open.add(K(c.cx, c.cy))); did = true; break; }
    }
    if (!did) { errs.push('stairs not reachable (keys ' + keys + ', doors opened ' + used + ')'); return errs; }
  }
  return errs;
}
// everything that should be reachable once every door is open (no dead content)
function deadContent(fd) {
  const p = parseFloor(fd, { noMap: true }), rows = fd.rows, h = rows.length, w = rows[0].length, solid = new Set('#%~=PU'.split('')), reached = new Set(), K = (x, y) => y * w + x;
  const st = p.starts.map(s => [s.cx, s.cy]); st.forEach(([x, y]) => reached.add(K(x, y)));
  while (st.length) {
    const [x, y] = st.pop(), ch = rows[y][x];
    if (ch === 'O') { const i = p.pads.findIndex(d => d.cx === x && d.cy === y), o2 = p.pads[p.pads[i].pair]; if (o2 && !reached.has(K(o2.cx, o2.cy))) { reached.add(K(o2.cx, o2.cy)); st.push([o2.cx, o2.cy]); } }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const k = K(nx, ny); if (reached.has(k) || solid.has(rows[ny][nx])) continue; reached.add(k); st.push([nx, ny]); }
  }
  const bad = [];
  for (const e of [...p.items.filter(i => !i.onTable), ...p.mons, ...p.gens.filter(g => !g.onTable), ...p.exits]) if (!reached.has(K(e.cx, e.cy))) bad.push((e.kind || e.type || 'exit') + '@' + e.cx + ',' + e.cy);
  return bad;
}

// ---- 21-world.js ----
/* 21-world: the party, the world (W) of one floor, flow fields, the damage pipeline, scoring and happenings.
 * The sim runs in the roles solo/local, attract, host and server; a client runs only its own hero (40-net.js). */

let W = null;                 // the floor being played
const PARTY = [];             // the heroes, kept from floor to floor
const RUN = { loop: 1, floorIdx: 0, cheated: false, deepest: 1, started: 0, mode: 'local' };   // this descent
const CHEAT = { god: false, noclip: false, infinite: false, freeze: false, onehit: false, noGens: false, hitboxes: false, flow: false, net: false, bot: false, botP1: false };
const anyCheat = () => CHEAT.god || CHEAT.noclip || CHEAT.infinite || CHEAT.freeze || CHEAT.onehit || CHEAT.noGens || CHEAT.botP1 || RUN.cheated;

/* ---- happenings: one name for every event the HUD, sound, narrator and network care about ---- */
const NET_EVENTS = new Set(['gone', 'drop', 'door', 'trap', 'wall', 'kill', 'gen', 'magic', 'say', 'hurt', 'stolen', 'bell', 'boss', 'stairs', 'over', 'chest', 'eat', 'shotfood', 'pickup', 'spawnfx', 'rise', 'fall', 'secret', 'tele', 'stun', 'genhit', 'hoard', 'tithe', 'king']);
function happen(type, d = {}) {
  if (W && W.net === 'host' && NET_EVENTS.has(type)) W.outbox.push([type, d]);
  bus.emit(type, d);
}

/* ---- heroes (persistent across floors) ---- */
function makeHero(cls, pi, o = {}) {
  const D = get('heroes', cls);
  return {
    pi, cls, D, name: o.name || D.name, color: o.color || D.color, input: o.input || null, bot: null, remote: !!o.remote, netId: o.netId,
    hp: startHealth(), score: 0, keys: 0, flasks: 0, specials: {}, amulet: null, amuletT: 0, alive: true, continues: 0,
    stats: { kills: 0, treasure: 0, food: 0, foodShot: 0, gens: 0, stairs: 0 },
    x: 0, y: 0, vx: 0, vy: 0, r: 5, face: Math.PI / 2, aim: Math.PI / 2, cool: 0, swing: null, throwT: -9, stun: 0, runeImm: 0, queasy: 0, inv: 0, hurtT: 0,
    deadT: 0, stairT: 0, wallT: 0, padLock: -1, menu: 0, intent: null, lines: {}, hb: 0, cd: {}, firing: false, plant: false, joined: 0
  };
}
const startHealth = () => Math.round(TUNE.startHealth * DIFF().hp);
const limitOf = h => h.specials.deeppockets ? 12 : 9;
const living = () => W ? W.heroes.filter(h => h.alive) : [];

/* ---- the world of one floor ---- */
function newWorld(floorId, o = {}) {
  const fd = get('floors', floorId), p = parseFloor(fd), map = p.map;
  const w = {
    id: floorId, fd, no: fd.no, realm: fd.realm, p, map, t: 0, serial: (W ? W.serial : 0) + 1, nextId: 100000,
    heroes: PARTY, mons: [], gens: [], items: [], shots: [], fx: [], outbox: [],
    doorGroups: p.doorGroups, pads: p.pads, runes: p.runes, spikes: p.spikes, beams: p.beams, plates: p.plates, cracked: p.cracked, fakes: p.fakes, exits: p.exits,
    field: null, fieldKey: '', bell: null, bellRung: false, stage: 0, titheDue: fd.no >= 5 && !fd.hoard && !fd.boss, titheCame: false,
    hoard: fd.hoard ? { t: TUNE.hoardTime, total: 0, taken: 0 } : null, boss: null, done: null, net: o.net || 'local', attract: !!o.attract,
    viewHalf: [14 * T, 8 * T], cam: { x: 0, y: 0 }, foundSecret: false, lines: {}, ranks: o.loop > 1 ? 1 : 0, seenKinds: {}
  };
  W = w;
  const rk = r => clamp(r + w.ranks, 1, 3);
  for (const it of p.items) w.items.push({ ...it, kind: it.kind, sub: it.sub, open: false });
  if (fd.lchest) for (const it of w.items) if (it.kind === 'lchest') it.sub = fd.lchest;
  if (w.hoard) w.hoard.total = w.items.filter(i => get('items', i.kind).treasure).length;
  for (const m of p.mons) spawnMon(m.type, m.x, m.y, rk((fd.ranks && fd.ranks[m.cx + ',' + m.cy]) || fd.rank || 1), { id: m.id, placed: true });
  for (const g of p.gens) w.gens.push({ id: g.id, type: g.type, x: g.x, y: g.y, cx: g.cx, cy: g.cy, r: 7, rank: rk(g.type === 'tureen' ? 2 : fd.genRank || 1), hp: 0, t: 1 + E.hash2(g.cx, g.cy) * 2, kids: 0, shake: 0, onTable: g.onTable });
  for (const g of w.gens) { g.hp = genMaxHp(g.rank); g.rank0 = g.rank; }
  // heroes to the starts
  PARTY.forEach((h, i) => placeHero(h, p.starts[i % p.starts.length] || p.starts[0], i));
  if (fd.boss) setupBoss(w);
  return w;
}
function placeHero(h, s, i) {
  h.x = s.x + (i >= 4 ? (i - 3) * 6 : 0); h.y = s.y; h.vx = h.vy = 0; h.stairT = 0; h.wallT = 0; h.padLock = -1; h.swing = null; h.stun = 0; h.inv = 1; h.menu = 0;
  h.body = new E.Body({ x: h.x, y: h.y, r: 5, gravity: 0 });
}
const genMaxHp = rank => 4 * rank * TUNE.generatorHp;
const nid = () => W.nextId++;

function spawnMon(type, x, y, rank, o = {}) {
  const D = get('monsters', type);
  const m = { id: o.id || nid(), type, D, rank, srank: rank, hp: D.hp * rank, x, y, vx: 0, vy: 0, r: D.r, face: Math.PI / 2, t: R() * 2, atk: 0, wind: 0, state: 'go', vis: 1, visT: 2, carry: null, drained: {}, emerge: o.emerge ? .4 : 0, home: o.home || null, gen: o.gen || null, hurtT: 0, cd: {}, wake: !!o.awake, shrink: 0 };
  m.body = new E.Body({ x, y, r: D.r, gravity: 0 });
  W.mons.push(m);
  return m;
}

/* ---- flow fields: a multi-source BFS toward every hero a monster can track (own code: the engine's has one target) ---- */
function buildField(sources) {
  const map = W.map, w = map.w, h = map.h, d = new Int32Array(w * h).fill(1e9), src = new Int8Array(w * h).fill(-1), q = new Int32Array(w * h);
  let qh = 0, qt = 0;
  for (const s of sources) { const k = s.cy * w + s.cx; if (s.cx < 0 || s.cy < 0 || s.cx >= w || s.cy >= h) continue; if (d[k] === 0) continue; d[k] = 0; src[k] = s.i; q[qt++] = k; }
  while (qh < qt) {
    const k = q[qh++], cx = k % w, cy = (k / w) | 0, nd = d[k] + 1;
    for (let n = 0; n < 4; n++) {
      const nx = cx + (n === 0 ? 1 : n === 1 ? -1 : 0), ny = cy + (n === 2 ? 1 : n === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nk = ny * w + nx; if (d[nk] <= nd || !map.walkable(nx, ny)) continue;
      d[nk] = nd; src[nk] = src[k]; q[qt++] = nk;
    }
  }
  return { d, src, w, h };
}
const cellOf = e => [Math.floor(e.x / T), Math.floor(e.y / T)];
function heroField() {
  const tr = W.heroes.filter(h => h.alive && !(h.amulet === 'veil'));
  const key = W.map.version + ':' + tr.map(h => cellOf(h).join(',') + h.pi).join('|') + (W.bell ? 'b' + W.bell.pi : '');
  if (key !== W.fieldKey || !W.field) {
    const list = W.bell ? tr.filter(h => h.pi === W.bell.pi) : tr;
    W.field = buildField((list.length ? list : tr).map(h => { const [cx, cy] = cellOf(h); return { cx, cy, i: h.pi }; }));
    W.fieldKey = key;
  }
  return W.field;
}
// the way to walk from (x, y) down a field: toward the best neighbouring cell (diagonals only past open corners)
function fieldDir(F, x, y, away) {
  const map = W.map, cx = Math.floor(x / T), cy = Math.floor(y / T), k0 = cy * F.w + cx, d0 = F.d[k0];
  if (d0 >= 1e9) return null;
  let best = null, bd = away ? -1 : d0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= F.w || ny >= F.h) continue;
    if (dx && dy && (!map.walkable(cx + dx, cy) || !map.walkable(cx, cy + dy))) continue;
    const nd = F.d[ny * F.w + nx] + (dx && dy ? .4 : 0);
    if (nd >= 1e9) continue;
    if (away ? nd > bd : nd < bd) { bd = nd; best = [nx, ny]; }
  }
  if (!best) return null;
  const tx = (best[0] + .5) * T, ty = (best[1] + .5) * T, l = Math.hypot(tx - x, ty - y) || 1;
  return [(tx - x) / l, (ty - y) / l];
}

/* ---- damage: one pipeline for everything ---- */
function heroArmor(h) { return h.D.armor * DIFF().dmg * (h.specials.ironbrew ? .8 : 1) * TUNE.monsterDamage; }
function hurtHero(h, amt, o = {}) {
  if (!h.alive || W.net === 'client') return 0;
  if (o.kind !== 'drain' && o.kind !== 'tithe' && (h.inv > 0 || h.amulet === 'ironskin')) return 0;
  if (CHEAT.god || (W.attract && !o.real)) return 0;
  const dmg = o.raw ? amt : Math.max(1, Math.round(amt * heroArmor(h)));
  h.hp -= dmg;
  if (o.kind !== 'drain') { h.hurtT = .25; happen('hurt', { pi: h.pi, dmg, kind: o.kind || 'hit', x: h.x, y: h.y }); if (o.from) { const a = Math.atan2(h.y - o.from.y, h.x - o.from.x); h.kx = Math.cos(a) * 90; h.ky = Math.sin(a) * 90; } }
  if (h.hp <= 0) heroFalls(h);
  return dmg;
}
function heroFalls(h) {
  h.hp = 0; h.alive = false; h.deadT = 0; h.amulet = null; h.swing = null; h.stairT = 0;
  if (W.bell && W.bell.pi === h.pi) W.bell = null;
  happen('fall', { pi: h.pi, x: h.x, y: h.y });
  say('eaten', h, 3);
}
function riseHero(h, o = {}) {
  const ally = W.heroes.find(a => a.alive && a !== h) || null, s = ally || W.p.starts[h.pi % W.p.starts.length];
  h.alive = true; h.hp = o.hp || startHealth(); h.inv = 2; h.deadT = 0;
  if (!o.free) h.continues++;
  let x = s.x, y = s.y;
  for (const [dx, dy] of [[14, 0], [-14, 0], [0, 14], [0, -14], [10, 10], [0, 0]]) if (W.map.walkable(Math.floor((s.x + dx) / T), Math.floor((s.y + dy) / T))) { x = s.x + dx; y = s.y + dy; break; }
  h.x = x; h.y = y; h.body.x = x; h.body.y = y; h.vx = h.vy = 0;
  happen('rise', { pi: h.pi, x, y });
  say('rise', h, 2);
}
function hurtMon(m, amt, o = {}) {
  if (m.dead || W.net === 'client') return false;
  if (m.D.immune && o.kind !== 'magic' && o.kind !== 'blast') { if (o.kind === 'shot') happen('clink', { x: m.x, y: m.y }); return false; }
  if (m.type === 'fryar' && m.vis < .5 && o.kind !== 'magic' && o.kind !== 'blast') return false;
  if (m.emerge > 0 && o.kind !== 'magic' && o.kind !== 'blast') return false;
  const before = Math.ceil(m.hp / m.D.hp - 1e-6);
  m.hp -= CHEAT.onehit ? 999 : amt; m.hurtT = .15; m.wake = true;
  if (o.by && o.by.x !== undefined && m.type !== 'tithe') { const a = Math.atan2(m.y - o.by.y, m.x - o.by.x); m.kx = Math.cos(a) * 60; m.ky = Math.sin(a) * 60; }
  if (m.hp <= 0 || m.D.immune) { killMon(m, o.by); return true; }
  const after = Math.ceil(m.hp / m.D.hp - 1e-6);
  if (after < before) { m.rank = after; m.shrink = .25; happen('rankdown', { id: m.id, x: m.x, y: m.y, type: m.type }); }
  happen('monhit', { id: m.id, x: m.x, y: m.y, kind: o.kind });
  return true;
}
function killMon(m, by) {
  if (m.dead) return; m.dead = true;
  const pts = m.D.points * m.srank;
  if (by && by.pi !== undefined) { addScore(by, pts, m); by.stats.kills++; }
  if (m.carry) dropItem(m.carry.kind, m.x, m.y, m.carry.sub);
  if (m.type === 'tithe' && by) say('tithe_slain', by, 3);
  if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1);
  happen('kill', { id: m.id, type: m.type, x: m.x, y: m.y, by: by ? by.pi : -1, pts, rank: m.srank });
}
function hurtGen(g, amt, by, kind) {
  if (g.dead || W.net === 'client') return;
  if (CHEAT.onehit) amt = 999;
  g.hp -= amt; g.shake = .2;
  g.rank = Math.max(1, Math.ceil(g.hp / (4 * TUNE.generatorHp) - 1e-6));
  happen('genhit', { id: g.id, x: g.x, y: g.y, dmg: amt, rank: g.rank });
  if (g.hp <= 0) {
    g.dead = true;
    const pts = 25 * (g.rank0 || 1);
    if (by && by.pi !== undefined) { addScore(by, pts, g); by.stats.gens++; }
    if (R() < .1) dropItem('loaf', g.x, g.y);
    happen('gen', { id: g.id, x: g.x, y: g.y, type: g.type, by: by ? by.pi : -1 });
    if (g.type === 'tureen' && W.boss) happen('say', { k: 'tip_generator' });
  }
}
function addScore(h, pts, at) {
  if (!h || pts <= 0) return;
  h.score += Math.round(pts);
  if (at) happen('score', { pi: h.pi, pts: Math.round(pts), x: at.x, y: at.y });
}
function dropItem(kind, x, y, sub) {
  const it = { id: nid(), kind, sub, x, y, cx: Math.floor(x / T), cy: Math.floor(y / T), drop: true, open: false };
  W.items.push(it);
  happen('drop', { id: it.id, kind, sub, x, y });
  return it;
}

/* ---- the narrator's say: the host decides lines about events; tips are once per game ---- */
function say(key, h, pri = 2) {
  if (!W) return;
  happen('say', { k: key, pi: h ? h.pi : -1, pri });
}

// ---- 22-heroes.js ----
/* 22-heroes: a hero's step from its intent { mx, my, aim, fire, magic, plant, rise }: movement, the drain, throws,
 * smart melee, magic, pickups, doors and stairs. Local input, the network and the bot all produce intents. */

const SHOT_RANGE = 220;
function heroSpeed(h) { return h.D.speed * TUNE.heroSpeed * (h.specials.featherfoot ? 1.12 : 1) * (h.queasy > 0 ? .6 : 1) * (h.hp < 200 ? .92 : 1); }
function shotCool(h) { return h.D.shot.cool * (h.specials.quickshot ? .75 : 1) / TUNE.shotRate; }

function stepHero(h, dt) {
  const it = h.intent || { mx: 0, my: 0, aim: null, fire: false, magic: false, plant: false };
  h.inv = Math.max(0, h.inv - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.queasy = Math.max(0, h.queasy - dt); h.runeImm = Math.max(0, h.runeImm - dt); h.cool -= dt;
  if (h.amulet) { h.amuletT -= dt; if (h.amuletT <= 0) { h.amulet = null; happen('amuletEnd', { pi: h.pi }); } }
  if (h.menu > 0) { h.menu -= dt; if (h.menu <= 0 && W.bell && W.bell.pi === h.pi) W.bell = null; }
  if (W.net === 'client' && !h.local) return;
  if (!h.alive) {
    h.deadT += dt; h.vx = h.vy = 0;
    if (W.net !== 'client' && it.rise && h.deadT > 1 && living().length && !SESSION) riseHero(h);
    if (SESSION && W.net === 'host' && h.deadT > 5 && living().length) { h.score = Math.max(0, h.score - 250); riseHero(h, { hp: 350, free: true }); }
    return;
  }
  // the drain: life force falls every second, on every floor
  if (W.net !== 'client' && !CHEAT.god && !W.attract && !(W.boss && W.boss.intro)) {
    const fog = W.boss && W.boss.fogAt && W.boss.inFog(h) ? 3 : 1;
    h.hb = (h.hb || 0) + dt * TUNE.drain * DIFF().drain * (RUN.loop > 1 ? 1.5 : 1) * fog;
    if (h.hb >= 1) { const n = Math.floor(h.hb); h.hb -= n; h.hp -= n; if (h.hp <= 0) { heroFalls(h); return; } }
    healthLines(h);
  }
  if (CHEAT.infinite) { h.keys = Math.max(h.keys, 9); h.flasks = Math.max(h.flasks, 9); }
  // aim: the intent's, else the way the hero faces
  if (it.aim !== null && it.aim !== undefined && isFinite(it.aim)) h.aim = it.aim;
  const ml = Math.hypot(it.mx, it.my), stunned = h.stun > 0;
  h.stun = Math.max(0, h.stun - dt);
  if (ml > .15 && !stunned) { h.face = Math.atan2(it.my, it.mx); if (it.aim === null || it.aim === undefined) h.aim = h.face; }
  // movement: planted heroes stand still and turn (the arcade's stand and shoot)
  const planted = it.plant || (it.fire && it.kbFire);
  h.plant = planted;
  const sp = heroSpeed(h), go = stunned || planted || (h.swing && W.t - h.swing.t0 < .18) ? 0 : 1;
  h.vx = it.mx * sp * go; h.vy = it.my * sp * go;
  if (W.net === 'client' && !h.local) return;
  if (!h.remote) moveHero(h, dt);
  // fire: smart melee within reach, else a throw
  h.firing = !!it.fire && !stunned;
  if (h.firing && h.cool <= 0 && !(h.swing && W.t - h.swing.t0 < h.swing.dur)) {
    const foe = meleeTarget(h);
    if (foe) startSwing(h, foe); else if (W.net !== 'client') throwShot(h);
    else { h.cool = shotCool(h); h.throwT = W.t; }
  }
  if (h.swing && !h.swing.hit && W.t - h.swing.t0 >= h.swing.at) meleeHits(h);
  if (it.magic && !stunned && W.net !== 'client') useMagic(h);
  if (W.net === 'client') return;
  heroFeatures(h, dt);
  heroPickups(h);
  heroDoors(h);
  heroStairs(h, dt);
}

function moveHero(h, dt) {
  const b = h.body;
  b.x = h.x; b.y = h.y; b.vx = h.vx + (h.kx || 0); b.vy = h.vy + (h.ky || 0);
  h.kx = (h.kx || 0) * Math.max(0, 1 - dt * 10); h.ky = (h.ky || 0) * Math.max(0, 1 - dt * 10);
  if (CHEAT.noclip && !W.attract) { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= .8; b.vy *= .8; b.hitWall = false; }
  else b.update(dt, W.map);
  // knockback decays (body pushes add to vx/vy; we set them each step, so fold the push in here)
  // the shared screen: a hero can't stretch the party past what the camera shows
  // (it cancels only the part of a step that stretches the party further: a transporter may part them, then they regroup)
  if (W.leash && !SESSION) {
    const others = W.heroes.filter(o => o !== h && o.alive && !o.remote && !o.joinPick);
    if (others.length) {
      const [hw, hh] = W.leash, span = (v, k) => { const vs = others.map(o => o[k]).concat(v); return Math.max(...vs) - Math.min(...vs); };
      if (span(b.x, 'x') > hw * 2 && span(b.x, 'x') > span(h.x, 'x')) b.x = h.x;
      if (span(b.y, 'y') > hh * 2 && span(b.y, 'y') > span(h.y, 'y')) b.y = h.y;
    }
  }
  // fake walls give way when pushed into; every wall is a stair once the Gaunt has lost patience
  if (b.hitWall) {
    const ax = h.x + Math.cos(h.face) * 9, ay = h.y + Math.sin(h.face) * 9, cx = Math.floor(ax / T), cy = Math.floor(ay / T);
    const fk = W.fakes.find(f => f.cx === cx && f.cy === cy && !f.open);
    if (fk && Math.hypot(h.vx, h.vy) > 5) { fk.open = true; W.map.set(cx, cy, 0); happen('secret', { cx, cy, x: fk.x, y: fk.y }); if (!W.foundSecret) { W.foundSecret = true; say('tip_secret', h, 2); } }
    if (W.stage >= 3 && Math.hypot(h.vx, h.vy) > 5) { h.wallT += dt; if (h.wallT >= 1) { descend(h, null); return; } } else h.wallT = 0;
  } else h.wallT = 0;
  h.x = b.x; h.y = b.y;
}

/* ---- the throw ---- */
function throwShot(h) {
  const S = h.D.shot, a = h.aim, sp = S.speed * (h.specials.quickshot ? 1.2 : 1);
  h.cool = shotCool(h); h.throwT = W.t;
  const dmg = (S.dmg + (h.specials.hardshot ? 1 : 0) + (h.amulet === 'rending' ? 1 : 0)) * TUNE.shotDamage;
  W.shots.push({ id: nid(), team: 'hero', owner: h, kind: S.kind, x: h.x + Math.cos(a) * 7, y: h.y + Math.sin(a) * 7, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 3,
    dmg, life: SHOT_RANGE / sp, pierce: h.amulet === 'rending' ? 99 : S.pierce, bounce: h.amulet === 'ricochet' ? 3 : 0, splash: S.splash, hits: new Set(), rot: 0 });
  happen('throw', { pi: h.pi, kind: S.kind, x: h.x, y: h.y });
}

/* ---- smart melee: up close, fire strikes instead of throwing (never at ghosts) ---- */
function meleeTarget(h) {
  let best = null, bd = 1e9;
  for (const m of W.mons) {
    if (m.dead || m.D.noMelee || m.emerge > 0 || (m.type === 'fryar' && m.vis < .5)) continue;
    const d = Math.hypot(m.x - h.x, m.y - h.y), reach = h.r + m.r + 8;
    if (d > reach || d > bd) continue;
    if (Math.abs(E.angDiff(h.aim, Math.atan2(m.y - h.y, m.x - h.x))) > .87) continue;
    best = m; bd = d;
  }
  if (!best) for (const g of W.gens) { if (g.dead) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < h.r + g.r + 6 && Math.abs(E.angDiff(h.aim, Math.atan2(g.y - h.y, g.x - h.x))) < .87) { best = g; break; } }
  return best;
}
function startSwing(h, foe) {
  const moves = h.D.moves, n = h.swing && W.t - h.swing.t0 < .7 ? (h.swing.n + 1) % moves.length : 0, mv = E.MOVES[moves[n]];
  const dur = (mv.wind + mv.active + mv.recover) * .9;
  h.swing = { move: moves[n], n, t0: W.t, dur, at: (mv.wind + mv.active * .5) * .9, hit: false };
  h.cool = Math.max(.28, dur * .8);
  if (foe) h.aim = Math.atan2(foe.y - h.y, foe.x - h.x);
  happen('swing', { pi: h.pi, move: moves[n] });
}
function meleeHits(h) {
  h.swing.hit = true;
  if (W.net === 'client') return;
  const dmg = h.D.melee * (h.specials.ogreale ? 1.5 : 1) * TUNE.shotDamage;
  let hit = 0;
  for (const m of W.mons) if (!m.dead && !m.D.noMelee && E.inArc(h, h.aim, m, 22 + m.r, 1.2)) { if (hurtMon(m, dmg, { by: h, kind: 'melee' })) { hit++; happen('melee', { x: m.x, y: m.y, a: h.aim, pi: h.pi }); } }
  for (const g of W.gens) if (!g.dead && E.inArc(h, h.aim, g, 22 + g.r, 1.2)) { hurtGen(g, dmg, h, 'melee'); hit++; }
  for (const c of W.cracked) if (!c.open && E.inArc(h, h.aim, c, 26, 1.0)) crackWall(c, 1);
  if (W.boss && W.boss.alive && E.inArc(h, h.aim, W.boss, 26 + W.boss.r, 1.2)) { bossHurt(dmg, h, 'melee', h.aim); hit++; }
  if (hit && !W.attract) game.freeze(.04);
  if (hit) say('tip_melee', h, 1);
}

/* ---- magic: a Blast Flask strikes everything on screen ---- */
function useMagic(h) {
  if (h.flasks <= 0) return;
  h.flasks--;
  const [hw, hh] = h.view || W.viewHalf, cx = h.view ? h.x : W.cam.x, cy = h.view ? h.y : W.cam.y;
  blast(h, cx, cy, hw, hh, 1);
}
function blast(h, cx, cy, hw, hh, power, radius) {
  const mp = h.D.magic[0] * (h.specials.witchwater ? 1.5 : 1) * TUNE.magicPower * power, gp = h.D.magic[1] * (h.specials.witchwater ? 1.5 : 1) * TUNE.magicPower * power;
  const inside = e => radius ? Math.hypot(e.x - cx, e.y - cy) < radius : Math.abs(e.x - cx) < hw && Math.abs(e.y - cy) < hh;
  for (const m of W.mons) if (!m.dead && inside(m)) hurtMon(m, m.type === 'tithe' ? 99 : Math.ceil(4 * mp), { by: h, kind: radius ? 'blast' : 'magic' });
  for (const g of W.gens) if (!g.dead && inside(g)) hurtGen(g, Math.ceil(2 * gp), h, 'magic');
  if (W.boss && W.boss.alive && inside(W.boss)) bossHurt(W.boss.maxHp * .06 * power, h, 'magic');
  happen('magic', { pi: h.pi, x: cx, y: cy, hw: radius || hw, hh: radius || hh, ring: !!radius, power });
  say('tip_magic', h, 1);
}

/* ---- pickups ---- */
function heroPickups(h) {
  for (const it of W.items) {
    if (it.gone || it.onTable && !nearTable(h, it)) continue;
    const reach = it.onTable ? 18 : h.r + 6;
    if (Math.abs(it.x - h.x) > reach || Math.abs(it.y - h.y) > reach || Math.hypot(it.x - h.x, it.y - h.y) > reach) continue;
    takeItem(h, it);
  }
}
const nearTable = (h, it) => Math.hypot(it.x - h.x, it.y - h.y) < 18;
function takeItem(h, it) {
  const D = get('items', it.kind), lim = limitOf(h);
  switch (it.kind) {
    case 'key': if (h.keys >= lim) return; h.keys++; say('key_first', h, 1); say('tip_door', h, 1); break;
    case 'flask': if (h.flasks >= lim) return; h.flasks++; say('tip_magic', h, 1); break;
    case 'roast': case 'loaf': case 'cider': case 'platter': h.hp += Math.round(D.heal * TUNE.foodHeal); h.stats.food++; if (h.stats.food === 6) say('glutton', h, 1); if (it.kind === 'cider') say('tip_dontshoot', h, 1); break;
    case 'stew': h.hp = Math.max(1, h.hp - 50); h.queasy = 4; say('ate_stew', h, 2); break;
    case 'special': if (h.specials[it.sub]) return; h.specials[it.sub] = true; say('special_' + it.sub, h, 2); break;
    case 'amulet': h.amulet = it.sub; h.amuletT = AMULET_TIME; say('amulet_' + it.sub, h, 2); break;
    case 'chest': break;
    case 'lchest': if (h.keys <= 0 && !CHEAT.infinite) return; h.keys--; { const loot = it.sub || Rpick(['flask', 'roast', 'key']); dropItem(SPECIALS[loot] ? 'special' : loot, it.x + 10, it.y + 6, SPECIALS[loot] ? loot : undefined); } break;
    case 'bell': if (W.bellRung) return; W.bellRung = true; W.bell = { pi: h.pi }; h.menu = 12; say('bell', h, 3); happen('bell', { pi: h.pi, x: it.x, y: it.y }); return;
    case 'gauntlet': W.gauntletBy = h.pi; say('gauntlet_taken', h, 3); break;
  }
  if (D.treasure) { h.stats.treasure++; say('treasure_first', h, 1); }
  it.gone = true;
  addScore(h, D.pts, it);
  happen('gone', { id: it.id, by: h.pi, kind: it.kind, sub: it.sub, x: it.x, y: it.y });
  if (W.hoard && D.treasure) { W.hoard.taken++; if (W.hoard.taken >= W.hoard.total) { addScore(h, 2000, h); say('hoard_clear', h, 3); } }
  if (it.kind === 'gauntlet') bossGauntletTaken(h);
}

/* ---- doors: a key opens the whole run ---- */
function heroDoors(h) {
  if (h.keys <= 0 && !CHEAT.infinite) return;
  for (const g of W.doorGroups) {
    if (g.open) continue;
    if (g.cells.some(c => Math.abs(c.x - h.x) < T / 2 + h.r + 3 && Math.abs(c.y - h.y) < T / 2 + h.r + 3)) { if (!CHEAT.infinite) h.keys--; openDoors(g, h); return; }
  }
}
function openDoors(g, h) {
  g.open = true;
  for (const c of g.cells) W.map.set(c.cx, c.cy, 0);
  happen('door', { g: g.id, pi: h ? h.pi : -1, x: g.cells[0].x, y: g.cells[0].y });
}
function crackWall(c, n) {
  if (c.open || W.net === 'client') return;
  c.hp -= n; happen('crack', { x: c.x, y: c.y });
  if (c.hp <= 0) { c.open = true; W.map.set(c.cx, c.cy, 0); happen('wall', { cx: c.cx, cy: c.cy, x: c.x, y: c.y }); }
}

/* ---- stairs: hold still on them and everyone goes down ---- */
function heroStairs(h, dt) {
  const [cx, cy] = cellOf(h), ex = W.exits.find(e => e.cx === cx && e.cy === cy);
  if (!ex || W.done) { h.stairT = 0; return; }
  if (!W.stairsSeen) { W.stairsSeen = true; say('stairs', h, 2); }
  h.stairT += dt;
  if (h.stairT >= TUNE.stairHold) descend(h, ex);
}
function descend(h, ex) {
  if (W.done) return;
  const bonus = 500 + 5 * Math.max(0, Math.round((W.fd.par || 150) - W.t));
  if (!W.hoard) { addScore(h, bonus, h); h.stats.stairs++; }
  W.done = { by: h.pi, to: ex && ex.to ? ex.to : null, at: { x: h.x, y: h.y } };
  if (ex && ex.to) say('skip', h, 3);
  happen('stairs', { pi: h.pi, to: W.done.to, x: h.x, y: h.y });
}

/* ---- health callouts ---- */
function healthLines(h) {
  const b = h.hp < 100 ? 3 : h.hp < 200 ? 2 : h.hp < 400 ? 1 : 0;
  if (b > (h.hpBand || 0)) say(['', 'fading', 'starving', 'dying'][b], h, 3);
  if (h.hpBand !== b) h.hpBand = b;
  if (h.hp < 300) say('tip_food', h, 1);
}

/* ---- features under a hero: runes, pads, plates ---- */
function heroFeatures(h, dt) {
  const [cx, cy] = cellOf(h);
  if (h.runeImm <= 0 && h.stun <= 0 && W.runes.some(r => r.cx === cx && r.cy === cy)) { h.stun = .8; h.runeImm = 2.3; say('tip_stun', h, 1); happen('stun', { pi: h.pi, x: h.x, y: h.y }); }
  const pi = W.pads.findIndex(p => p.cx === cx && p.cy === cy);
  if (pi < 0) h.padLock = -1;
  else if (pi !== h.padLock && W.pads[pi].pair !== undefined) {
    const to = W.pads[W.pads[pi].pair];
    happen('tele', { pi: h.pi, x: h.x, y: h.y, tx: to.x, ty: to.y });
    h.x = to.x; h.y = to.y; h.body.x = to.x; h.body.y = to.y; h.padLock = W.pads[pi].pair; h.inv = Math.max(h.inv, .5);
    say('tip_tele', h, 1);
  }
  for (const p of W.plates) if (!p.used && p.cx === cx && p.cy === cy) {
    p.used = true;
    const list = p.kind === 'T' ? W.p.trapT : W.p.trapY;
    for (const c of list) W.map.set(c.cx, c.cy, 0);
    for (const q of W.plates) if (q.kind === p.kind) q.used = true;
    for (const m of W.mons) m.wake = true;
    happen('trap', { kind: p.kind, x: p.x, y: p.y });
    say('tip_trap', h, 2);
  }
}

// ---- 23-monsters.js ----
/* 23-monsters: monster AI kinds, generators, projectiles, crowding, and the floor's features over time (beams,
 * spikes, impatience, the Tithe's coming, the hoard clock). */

const monCap = () => { const n = Math.max(1, W.heroes.length); let c = TUNE.maxMonsters * (1 + .3 * (n - 1)); c = Math.min(c, 300); return W.net === 'host' || W.net === 'server' ? Math.min(c, 100) : c; };
const monSpeed = m => m.D.speed[m.rank - 1] * TUNE.monsterSpeed * (W.attract ? 1 : 1);
const monDmg = m => m.D.dmg[m.rank - 1];

function targetFor(m) {
  let best = null, bd = 1e9;
  for (const h of W.heroes) {
    if (!h.alive) continue;
    if (W.bell && W.bell.pi !== h.pi && m.type !== 'snatcher') continue;
    const d = Math.hypot(h.x - m.x, h.y - m.y);
    if (h.amulet === 'veil' && d > 24) continue;
    if (d < bd) { bd = d; best = h; }
  }
  return [best, bd];
}

function stepMonsters(dt) {
  if (CHEAT.freeze && !W.attract) return;
  const F = heroField(), heroes = living();
  for (const m of W.mons) {
    if (m.dead) continue;
    m.t += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.shrink = Math.max(0, m.shrink - dt);
    for (const k in m.cd) m.cd[k] -= dt;
    if (m.emerge > 0) { m.emerge -= dt; continue; }
    const [h, d] = targetFor(m);
    if (!m.wake) { if (h && d < 20 * T) m.wake = true; else { m.vx = m.vy = 0; continue; } }
    if (h && d > 22 * T && m.type !== 'snatcher') { m.vx = m.vy = 0; continue; }   // asleep in the dark
    let dir = null, speed = monSpeed(m);
    // stench: flee from that hero
    const stinky = heroes.find(s => s.amulet === 'stench' && Math.hypot(s.x - m.x, s.y - m.y) < 64);
    if (stinky) { const a = Math.atan2(m.y - stinky.y, m.x - stinky.x); dir = [Math.cos(a), Math.sin(a)]; }
    else if (h) dir = AI[m.D.ai](m, h, d, F, dt);
    else { const a = m.t * .7 + m.id; dir = [Math.cos(a) * .3, Math.sin(a) * .3]; }
    if (m.wind > 0) speed *= .25;
    if (dir) { m.vx = dir[0] * speed; m.vy = dir[1] * speed; if (Math.abs(dir[0]) + Math.abs(dir[1]) > .2) m.face = Math.atan2(dir[1], dir[0]); }
    else { m.vx = m.vy = 0; }
    if (m.dead) continue;
    const b = m.body; b.x = m.x; b.y = m.y; b.vx = m.vx + (m.kx || 0); b.vy = m.vy + (m.ky || 0);
    m.kx = (m.kx || 0) * Math.max(0, 1 - dt * 8); m.ky = (m.ky || 0) * Math.max(0, 1 - dt * 8);
    b.update(dt, W.map); m.x = b.x; m.y = b.y;
  }
  // crowding: monsters part softly, heroes are shoved out of them (a horde can box a hero in)
  const list = W.mons.filter(m => !m.dead && m.emerge <= 0);
  W.hash = W.hash || new E.SpatialHash(32); W.hash.build(list);
  for (const m of list) W.hash.near(m.x, m.y, 12, o => {
    if (o === m || o.id < m.id) return;
    const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy), mn = m.r + o.r - 1;
    if (d >= mn || d < .01) return;
    const k = (mn - d) / d * .25; m.x -= dx * k; m.y -= dy * k; o.x += dx * k; o.y += dy * k;
  });
  for (const h of heroes) {
    if (CHEAT.noclip && !W.attract) continue;
    W.hash.near(h.x, h.y, 14, m => {
      const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy), mn = h.r + m.r - 1;
      if (d >= mn || d < .01 || m.D.fly) return;
      const k = (mn - d) / d; h.x += dx * k * .7; h.y += dy * k * .7; m.x -= dx * k * .3; m.y -= dy * k * .3;
    });
    for (const g of W.gens) if (!g.dead) { const dx = h.x - g.x, dy = h.y - g.y, d = Math.hypot(dx, dy), mn = h.r + g.r; if (d < mn && d > .01) { h.x += dx / d * (mn - d); h.y += dy / d * (mn - d); } }
    h.body.x = h.x; h.body.y = h.y; W.map.collide(h.body); h.x = h.body.x; h.y = h.body.y;
  }
  for (const m of list) { m.body.x = m.x; m.body.y = m.y; W.map.collide(m.body); m.x = m.body.x; m.y = m.body.y; }
  W.mons = W.mons.filter(m => !m.dead);
}

/* ---- the AI kinds: each returns the direction to move ---- */
const chase = (m, h, d, F) => d < 20 ? [(h.x - m.x) / (d || 1), (h.y - m.y) / (d || 1)] : (fieldDir(F, m.x, m.y) || [(h.x - m.x) / d, (h.y - m.y) / d]);
const touching = (m, h, extra = 0) => Math.hypot(h.x - m.x, h.y - m.y) < m.r + h.r + extra;
function meleeAI(m, h, d, F, dt, reach) {
  if (m.wind > 0) {
    m.wind -= dt; m.face = angTo(m, h);
    if (m.wind <= 0) { m.atk = m.D.every; m.swingT = W.t; if (d < m.r + h.r + reach + 4) hurtHero(h, monDmg(m), { from: m, kind: 'melee' }); happen('monswing', { id: m.id, x: m.x, y: m.y }); }
    return null;
  }
  m.atk -= dt;
  if (d < m.r + h.r + reach && m.atk <= 0) { m.wind = m.D.wind; m.windT = W.t; return null; }
  return chase(m, h, d, F);
}
const AI = {
  ghost(m, h, d, F) {
    if (touching(m, h, 1)) { hurtHero(h, monDmg(m), { from: m, kind: 'ghost' }); m.dead = true; if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1); happen('ghostbite', { id: m.id, x: m.x, y: m.y }); return null; }
    return chase(m, h, d, F);
  },
  melee(m, h, d, F, dt) { return meleeAI(m, h, d, F, dt, m.D.reach); },
  fryar(m, h, d, F, dt) {
    m.visT -= dt;
    if (m.visT <= 0) {
      if (m.vis > .5) { m.vis = 0; m.visT = 1.4; happen('blink', { id: m.id, x: m.x, y: m.y }); }
      else {   // reappear closer along the path
        for (let i = 0; i < 3; i++) { const dir = fieldDir(F, m.x, m.y); if (!dir) break; const nx = m.x + dir[0] * 16, ny = m.y + dir[1] * 16; if (!W.map.walkable(Math.floor(nx / T), Math.floor(ny / T))) break; m.x = nx; m.y = ny; }
        m.vis = 1; m.visT = 2; m.body.x = m.x; m.body.y = m.y; happen('blink', { id: m.id, x: m.x, y: m.y, on: true });
      }
    }
    if (m.vis < .5) return chase(m, h, d, F).map(v => v * .5);
    return meleeAI(m, h, d, F, dt, m.D.reach);
  },
  lob(m, h, d, F, dt) {
    m.atk -= dt;
    if (m.atk <= 0 && d < 130) {
      m.atk = m.D.every[m.rank - 1]; m.swingT = W.t;
      const lead = .5, tx = h.x + h.vx * lead, ty = h.y + h.vy * lead, v = E.arc({ x: m.x, y: m.y, z: 14 }, { x: tx, y: ty, z: 0 }, 300, { apex: 40 });
      W.shots.push({ id: nid(), team: 'foe', kind: 'crock', x: m.x, y: m.y, z: 14, vx: v.vx, vy: v.vy, vz: v.vz, grav: 300, r: 3, dmg: monDmg(m), life: v.t + .05, tx, ty, land: W.t + v.t, splash: 12, by: m.id, rot: 0 });
      happen('lob', { id: m.id, x: m.x, y: m.y });
    }
    if (d < 56) { const a = fieldDir(F, m.x, m.y, true); return a || [(m.x - h.x) / d, (m.y - h.y) / d]; }
    if (d > 110) return chase(m, h, d, F);
    const s = Math.sin(m.t * 1.3 + m.id) * .5, a = angTo(h, m) + Math.PI / 2; return [Math.cos(a) * s, Math.sin(a) * s];
  },
  imp(m, h, d, F, dt) {
    if (m.spit > 0) { m.spit -= dt; m.face = angTo(m, h); if (m.spit <= 0) { const a = angTo(m, h), sp = 110; W.shots.push({ id: nid(), team: 'foe', kind: 'fireball', x: m.x, y: m.y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 3, dmg: m.D.fire[m.rank - 1], life: 2, by: m.id, rot: 0 }); happen('spit', { id: m.id, x: m.x, y: m.y }); } return null; }
    m.fireCD = (m.fireCD || R() * 1.8) - dt;
    if (m.fireCD <= 0 && d > 30 && d < 140 && W.map.los(m.x, m.y, h.x, h.y)) { m.fireCD = m.D.every; m.spit = .35; m.spitT = W.t; return null; }
    return meleeAI(m, h, d, F, dt, m.D.reach);
  },
  snatch(m, h, d, F, dt) {
    if (m.carry) {   // run home with the loot
      const goal = m.home || W.p.starts[0];
      const gd = Math.hypot(goal.x - m.x, goal.y - m.y);
      if (gd < 10) { m.dead = true; if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1); happen('escape', { id: m.id, x: m.x, y: m.y }); return null; }
      m.fleeF = m.fleeF && m.fleeKey === W.map.version ? m.fleeF : buildField([{ cx: Math.floor(goal.x / T), cy: Math.floor(goal.y / T), i: 0 }]); m.fleeKey = W.map.version;
      return fieldDir(m.fleeF, m.x, m.y) || [(goal.x - m.x) / (gd || 1), (goal.y - m.y) / (gd || 1)];
    }
    if (touching(m, h, 2)) {
      let what = null;
      if (h.flasks > 0) { h.flasks--; what = { kind: 'flask' }; } else if (h.keys > 0) { h.keys--; what = { kind: 'key' }; } else if (h.amulet) { what = { kind: 'amulet', sub: h.amulet }; h.amulet = null; }
      if (what) { m.carry = what; say('stolen', h, 3); happen('stolen', { pi: h.pi, id: m.id, kind: what.kind, x: h.x, y: h.y }); m.home = m.home || farthestStart(h); }
      else { m.atk = 1.5; }
      return null;
    }
    m.atk = (m.atk || 0) - dt;
    return m.atk > 0 ? null : chase(m, h, d, F);
  },
  tithe(m, h, d, F, dt) {
    for (const o of living()) if (touching(m, o, 3)) {
      m.drain = (m.drain || 0) + dt;
      if (m.drain >= .1) {
        m.drain -= .1; const got = m.drained[o.pi] || 0, take = Math.min(6, 200 - got);
        if (take > 0) { o.hp -= CHEAT.god || W.attract ? 0 : take; m.drained[o.pi] = got + take; happen('drain', { pi: o.pi, x: o.x, y: o.y, mx: m.x, my: m.y }); if (o.hp <= 0) heroFalls(o); }
        if (got + take >= 200) { m.dead = true; say('tithe_paid', o, 3); happen('tithe', { gone: true, x: m.x, y: m.y }); return null; }
      }
    }
    return [(h.x - m.x) / (d || 1), (h.y - m.y) / (d || 1)];   // it glides through everything but walls
  }
};
function farthestStart(h) { let b = null, bd = -1; for (const g of W.gens) if (!g.dead && g.type === 'sacks') { const d = Math.hypot(g.x - h.x, g.y - h.y); if (d > bd) { bd = d; b = { x: g.x, y: g.y }; } } return b || W.p.starts[0]; }

/* ---- generators ---- */
function stepGens(dt) {
  if ((CHEAT.noGens || CHEAT.freeze) && !W.attract) return;
  const n = Math.max(1, W.heroes.length), cap = monCap(), alive = W.mons.length;
  for (const g of W.gens) {
    if (g.dead) continue;
    g.shake = Math.max(0, g.shake - dt);
    if (g.type === 'tureen' && W.boss && W.boss.intro) continue;
    const near = living().some(h => Math.hypot(h.x - g.x, h.y - g.y) < 15 * T);
    if (!near || g.kids >= 8 || alive >= cap) continue;
    g.t -= dt;
    if (g.t > 0) continue;
    g.t = [3, 2.2, 1.5][g.rank - 1] * TUNE.spawnInterval / (1 + .25 * (n - 1));
    const type = get('gens', g.type).spawns, spot = freeNear(g);
    if (!spot) continue;
    const m = spawnMon(type, spot.x, spot.y, g.type === 'tureen' ? 2 : g.rank, { emerge: true, gen: g, home: { x: g.x, y: g.y }, awake: true });
    g.kids++; m.emergeFrom = { x: g.x, y: g.y };
    happen('spawn', { id: m.id, type, x: spot.x, y: spot.y, gx: g.x, gy: g.y });
  }
  W.gens = W.gens.filter(g => !g.dead);
}
function freeNear(g) {
  const cx = Math.floor(g.x / T), cy = Math.floor(g.y / T), opts = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const start = Math.floor(R() * 8);
  for (let i = 0; i < 8; i++) {
    const [dx, dy] = opts[(start + i) % 8], nx = cx + dx, ny = cy + dy;
    if (!W.map.walkable(nx, ny)) continue;
    const x = (nx + .5) * T, y = (ny + .5) * T;
    if (W.mons.some(m => Math.abs(m.x - x) < 8 && Math.abs(m.y - y) < 8)) continue;
    return { x, y };
  }
  return null;
}

/* ---- projectiles ---- */
function stepShots(dt) {
  const map = W.map;
  for (const s of W.shots) {
    if (s.dead) continue;
    s.life -= dt; s.rot += dt * 14;
    if (s.grav) s.vz -= s.grav * dt;
    const ox = s.x, oy = s.y;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    if (s.grav) {   // a lob: it breaks where it lands
      if (s.z <= 0 || s.life <= 0) { s.dead = true; landSplash(s); }
      continue;
    }
    if (s.life <= 0) { s.dead = true; continue; }
    // walls
    if (map.heightAt(s.x, s.y) > s.z) {
      const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T);
      if (s.team === 'hero') { const c = W.cracked.find(c => c.cx === cx && c.cy === cy); if (c) crackWall(c, 1); }
      if (s.bounce > 0) {
        s.bounce--;
        const hx = map.heightAt(s.x, oy) > s.z, hy = map.heightAt(ox, s.y) > s.z;
        if (hx || !hy) s.vx = -s.vx; if (hy || !hx) s.vy = -s.vy;
        s.x = ox; s.y = oy; s.hits.clear && s.hits.clear(); happen('ricochet', { x: s.x, y: s.y });
        continue;
      }
      s.dead = true; happen('shotwall', { x: ox, y: oy, team: s.team, kind: s.kind }); continue;
    }
    if (s.team === 'hero') heroShotHits(s);
    else foeShotHits(s);
  }
  W.shots = W.shots.filter(s => !s.dead);
}
function heroShotHits(s) {
  const h = s.owner;
  for (const m of W.mons) {
    if (m.dead || s.hits.has(m.id) || m.emerge > 0) continue;
    if (Math.abs(m.x - s.x) > m.r + s.r || Math.abs(m.y - s.y) > m.r + s.r) continue;
    if (m.type === 'fryar' && m.vis < .5) continue;
    s.hits.add(m.id);
    hurtMon(m, s.dmg, { by: h, kind: 'shot' });
    happen('shothit', { x: s.x, y: s.y, kind: s.kind, a: Math.atan2(s.vy, s.vx), m: m.type });
    if (s.splash) for (const o of W.mons) if (o !== m && !o.dead && Math.hypot(o.x - s.x, o.y - s.y) < 12) hurtMon(o, s.splash, { by: h, kind: 'shot' });
    if (m.D.immune || s.pierce-- <= 0) { s.dead = true; return; }
  }
  for (const g of W.gens) {
    if (g.dead || Math.hypot(g.x - s.x, g.y - s.y) > g.r + s.r) continue;
    hurtGen(g, s.dmg, h, 'shot'); s.dead = true; return;
  }
  if (W.boss && W.boss.alive && Math.hypot(W.boss.x - s.x, W.boss.y - s.y) < W.boss.r + s.r) { bossHurt(s.dmg, h, 'shot', Math.atan2(s.vy, s.vx)); s.dead = true; return; }
  for (const it of W.items) {
    if (it.gone || !get('items', it.kind).shoot) continue;
    if (Math.abs(it.x - s.x) > 6 || Math.abs(it.y - s.y) > 6) continue;
    shootItem(it, h); s.dead = true; return;
  }
  // allies: from floor 6 on a shot that touches a friend stuns them
  if (allyStunOn()) for (const o of W.heroes) {
    if (o === h || !o.alive || o.stun > 0) continue;
    if (Math.hypot(o.x - s.x, o.y - s.y) < o.r + s.r) { o.stun = .35; say('ally_shot', h, 1); happen('allyhit', { pi: o.pi, by: h.pi, x: o.x, y: o.y }); }
  }
}
const allyStunOn = () => S.allyStun && (W.no >= 6 || RUN.loop > 1) && W.heroes.length > 1;
function shootItem(it, h) {
  it.gone = true;
  happen('gone', { id: it.id, by: -1, kind: it.kind, x: it.x, y: it.y, shot: true });
  if (it.kind === 'cider') { say('shot_cider', h, 3); h.stats.foodShot++; happen('shotfood', { x: it.x, y: it.y, kind: it.kind }); }
  else if (it.kind === 'platter') { if (W.boss) { say('king_eating', h, 2); W.boss.denied = (W.boss.denied || 0) + 1; } else say('shot_feast', h, 3); h.stats.foodShot++; happen('shotfood', { x: it.x, y: it.y, kind: it.kind }); }
  else if (it.kind === 'stew') happen('shotfood', { x: it.x, y: it.y, kind: it.kind });
  else if (it.kind === 'flask') { say('shot_flask', h, 3); blast(h, it.x, it.y, 0, 0, .5, 80); }
}
function foeShotHits(s) {
  for (const h of W.heroes) {
    if (!h.alive || Math.hypot(h.x - s.x, h.y - s.y) > h.r + s.r) continue;
    hurtHero(h, s.dmg, { from: s, kind: s.kind }); s.dead = true; happen('foehit', { x: s.x, y: s.y, kind: s.kind }); return;
  }
  if (s.kind === 'fireball') for (const it of W.items) {   // imps cook what they spit on
    if (it.gone || !get('items', it.kind).food) continue;
    if (Math.abs(it.x - s.x) < 6 && Math.abs(it.y - s.y) < 6) { it.gone = true; s.dead = true; happen('gone', { id: it.id, by: -1, kind: it.kind, x: it.x, y: it.y, shot: true }); happen('shotfood', { x: it.x, y: it.y, kind: it.kind }); return; }
  }
}
function landSplash(s) {
  happen('crockbreak', { x: s.x, y: s.y, kind: s.kind });
  for (const h of W.heroes) if (h.alive && Math.hypot(h.x - s.x, h.y - s.y) < s.splash + h.r) hurtHero(h, s.dmg, { from: s, kind: s.kind });
}

/* ---- features over time ---- */
const beamOn = t => { const p = (t % 4); return p < 2 ? 'on' : p > 3.6 ? 'flicker' : 'off'; };
const spikeUp = (sp, t) => { const p = (t + sp.ph) % 1.6; return p < .5 ? 'up' : p > 1.35 ? 'tremble' : 'down'; };
function stepFeatures(dt) {
  const t = W.t;
  const bodies = [...living(), ...W.mons.filter(m => !m.dead && m.emerge <= 0)];
  const zap = (e, dmg, kind, cd) => {
    if (e.cd[kind] > 0) return; e.cd[kind] = cd;
    if (e.pi !== undefined) hurtHero(e, dmg, { kind, from: { x: e.x - Math.cos(e.face) * 4, y: e.y - Math.sin(e.face) * 4 } }); else hurtMon(e, dmg / 6, { kind });
  };
  for (const e of bodies) for (const k in e.cd) if (e.pi !== undefined) e.cd[k] -= dt;
  if (W.beams.length && beamOn(t) === 'on') for (const b of W.beams) for (const e of bodies) if (Math.abs(e.x - b.x) < 8 + e.r && Math.abs(e.y - b.y) < 8 + e.r && (b.dir === 'v' ? Math.abs(e.x - b.x) < 4 + e.r : Math.abs(e.y - b.y) < 4 + e.r)) { zap(e, 12, 'beam', .5); if (e.pi !== undefined) say('tip_field', e, 1); }
  for (const sp of W.spikes) if (spikeUp(sp, t) === 'up') for (const e of bodies) if (!e.D || !e.D.fly) if (Math.abs(e.x - sp.x) < 7 && Math.abs(e.y - sp.y) < 7) { zap(e, 15, 'spike', .6); if (e.pi !== undefined) say('tip_spikes', e, 1); }
  if (W.hoard) {
    W.hoard.t -= dt;
    if (W.hoard.t <= 0 && !W.done) { say('hoard_shut', null, 3); W.done = { by: -1, to: null, hoard: true }; happen('stairs', { pi: -1, hoard: true }); }
    return;
  }
  if (W.boss) return;
  const imp = TUNE.impatience;
  if (W.stage < 1 && t >= imp - 30) { W.stage = 1; say('impatient', null, 3); }
  if (W.stage < 2 && t >= imp) { W.stage = 2; for (const g of W.doorGroups) if (!g.open) openDoors(g, null); say('doors_open', null, 3); }
  if (W.stage < 3 && t >= imp + 60) { W.stage = 3; say('walls_stairs', null, 3); happen('wallsglow', {}); }
  if (W.titheDue && !W.titheCame && t >= TUNE.titheAt && !W.mons.some(m => m.type === 'tithe')) {
    W.titheCame = true;
    const h = living()[0];
    if (h) { const s = W.p.starts[0]; const m = spawnMon('tithe', s.x, s.y, 1, { awake: true }); m.wake = true; say('tithe_comes', null, 3); happen('tithe', { x: m.x, y: m.y }); }
  }
}

// ---- 26-boss.js ----
/* 26-boss: King Famish. Phase 1 "Dinner is served" (plates and the stomp; tureens breed ghosts), phase 2 "Second
 * helpings" (he walks to a platter and eats, healing; shoot the food; gnasher waves), phase 3 "The Gaunt hungers"
 * (ribs open: hits from the front count double; charges, famine fog, the Tithe). Then the Iron Gauntlet. */

function setupBoss(w) {
  const k = w.p.boss || { x: w.map.w * T / 2, y: 3 * T }, n = Math.max(1, PARTY.length);
  const hp = Math.round(400 * (1 + .5 * (n - 1)) * (RUN.loop > 1 ? 1.3 : 1));
  w.boss = { x: k.x, y: k.y + 8, r: 12, hp, maxHp: hp, phase: 1, alive: true, intro: 2.5, state: 'idle', st: 0, t: 0, face: Math.PI / 2, throwT: 2, waveT: 6, eatT: 0, plate: null, fogT: 4, chargeT: 3,
    vx: 0, vy: 0, body: new E.Body({ x: k.x, y: k.y + 8, r: 12, gravity: 0 }), home: { x: k.x, y: k.y + 10 }, denied: 0, titheSent: false, fogAt: null,
    inFog(h) { const f = this.fogAt; if (!f || W.t > f.until) return false; const d = Math.hypot(h.x - f.x, h.y - f.y), a = Math.abs(E.angDiff(f.a, Math.atan2(h.y - f.y, h.x - f.x))); return d < 110 && a < .5; } };
  happen('king', { what: 'intro' });
}

function stepBoss(dt) {
  const B = W.boss;
  if (!B || !B.alive) return;
  B.t += dt;
  if (B.intro > 0) { B.intro -= dt; if (B.intro <= 0) { say('king_intro', null, 3); happen('king', { what: 'line', line: STORY.king.intro }); } return; }
  const heroes = living(); if (!heroes.length) return;
  const near = heroes.reduce((a, h) => Math.hypot(h.x - B.x, h.y - B.y) < Math.hypot(a.x - B.x, a.y - B.y) ? h : a, heroes[0]);
  const dn = Math.hypot(near.x - B.x, near.y - B.y), frac = B.hp / B.maxHp;
  // phases
  if (B.phase === 1 && frac < .7) { B.phase = 2; B.state = 'roar'; B.st = 1; happen('king', { what: 'phase', phase: 2, line: STORY.king.p2 }); say('king_eating', null, 3); }
  if (B.phase === 2 && frac < .35) { B.phase = 3; B.state = 'roar'; B.st = 1.2; happen('king', { what: 'phase', phase: 3, line: STORY.king.p3 }); say('king_open', null, 3); }
  if (B.phase === 3 && !B.titheSent) { B.titheSent = true; const s = W.p.starts[0]; spawnMon('tithe', s.x, s.y - 40, 1, { awake: true }); say('tithe_comes', null, 3); }
  B.st -= dt; B.vx = B.vy = 0;
  const go = (tx, ty, sp) => { const d = Math.hypot(tx - B.x, ty - B.y); if (d > 2) { B.vx = (tx - B.x) / d * sp; B.vy = (ty - B.y) / d * sp; B.face = Math.atan2(B.vy, B.vx); } return d; };
  switch (B.state) {
    case 'roar': if (B.st <= 0) B.state = 'idle'; break;
    case 'stomp': if (B.st <= 0) { happen('king', { what: 'stomp', x: B.x, y: B.y }); for (const h of heroes) if (Math.hypot(h.x - B.x, h.y - B.y) < 44) hurtHero(h, 15, { from: B, kind: 'stomp' }); B.state = 'idle'; B.throwT = Math.max(B.throwT, .8); } break;
    case 'eat': {
      const p = B.plate;
      if (!p || p.gone) { B.state = 'idle'; B.plate = null; break; }
      B.eatT -= dt; B.hp = Math.min(B.maxHp, B.hp + B.maxHp * .05 * dt);
      if (B.eatT <= 0) { p.gone = true; happen('gone', { id: p.id, by: -2, kind: p.kind, x: p.x, y: p.y }); happen('king', { what: 'gulp', x: p.x, y: p.y }); B.state = 'idle'; B.plate = null; }
      break;
    }
    case 'walk': {
      const p = B.plate;
      if (!p || p.gone) { B.state = 'idle'; B.plate = null; break; }
      const side = p.x < W.map.w * T / 2 ? -1 : 1, tx = p.x + side * 22, ty = p.y;
      if (go(tx, ty, 34) < 6 || B.st <= 0) { B.state = 'eat'; B.eatT = 2.5; happen('king', { what: 'eat', x: p.x, y: p.y }); say('king_eating', null, 2); }
      break;
    }
    case 'chargeWind': B.face = B.chargeA; if (B.st <= 0) { B.state = 'charge'; B.st = .9; } break;
    case 'charge': {
      B.vx = Math.cos(B.chargeA) * 170; B.vy = Math.sin(B.chargeA) * 170;
      for (const h of heroes) if (Math.hypot(h.x - B.x, h.y - B.y) < B.r + h.r + 2 && !(h.cd.charge > 0)) { h.cd.charge = .8; hurtHero(h, 15, { from: B, kind: 'charge' }); }
      if (B.st <= 0 || B.body.hitWall) { B.state = 'roar'; B.st = .6; if (B.body.hitWall) happen('king', { what: 'stomp', x: B.x, y: B.y, small: true }); }
      break;
    }
    case 'fogWind': if (B.st <= 0) { B.fogAt = { x: B.x, y: B.y, a: B.face, until: W.t + 3 }; happen('king', { what: 'fog', x: B.x, y: B.y, a: B.face }); B.state = 'idle'; } break;
    default: {   // idle: choose the next thing
      B.face = angTo(B, near);
      B.throwT -= dt; B.waveT -= dt; B.chargeT -= dt; B.fogT -= dt;
      if (dn < 40 && B.phase < 3) { B.state = 'stomp'; B.st = .5; happen('king', { what: 'stompwind', x: B.x, y: B.y }); break; }
      if (B.phase === 2) {
        const plates = W.items.filter(i => i.kind === 'platter' && !i.gone);
        if (plates.length && B.throwT < 1.2 && R() < .02) { B.plate = plates.reduce((a, p) => Math.hypot(p.x - B.x, p.y - B.y) < Math.hypot(a.x - B.x, a.y - B.y) ? p : a); B.state = 'walk'; B.st = 5; break; }
        if (!plates.length && !B.raged) { B.raged = true; say('king_rage', null, 3); B.state = 'roar'; B.st = .8; break; }
        if (B.waveT <= 0) { B.waveT = 12; bossWave(); }
      }
      if (B.phase === 3) {
        if (B.waveT <= 0) { B.waveT = 14; bossWave(); }
        if (B.chargeT <= 0) { B.chargeT = 4; B.chargeA = angTo(B, near); B.state = 'chargeWind'; B.st = .6; happen('king', { what: 'chargewind', x: B.x, y: B.y, a: B.chargeA }); break; }
        if (B.fogT <= 0) { B.fogT = 7; B.state = 'fogWind'; B.st = .5; break; }
      }
      if (B.throwT <= 0) { B.throwT = B.phase === 2 && B.raged ? 1.6 : 2.5; bossPlates(near); }
      if (B.phase === 1) go(B.home.x + Math.sin(B.t * .4) * 30, B.home.y + 20, 20);
      else if (dn > 70) go(near.x, near.y, 26);
    }
  }
  const b = B.body; b.x = B.x; b.y = B.y; b.vx = B.vx; b.vy = B.vy; b.update(dt, W.map); B.x = b.x; B.y = b.y;
  for (const h of heroes) { const dx = h.x - B.x, dy = h.y - B.y, d = Math.hypot(dx, dy), mn = h.r + B.r; if (d < mn && d > .01) { h.x += dx / d * (mn - d); h.y += dy / d * (mn - d); h.body.x = h.x; h.body.y = h.y; W.map.collide(h.body); h.x = h.body.x; h.y = h.body.y; } }
}
function bossPlates(h) {
  const B = W.boss; B.throwAt = W.t;
  for (const k of [-1, 0, 1]) {
    const a = angTo(B, h) + k * .35, d = Math.min(150, Math.hypot(h.x - B.x, h.y - B.y)), tx = B.x + Math.cos(a) * d, ty = B.y + Math.sin(a) * d;
    const v = E.arc({ x: B.x, y: B.y, z: 30 }, { x: tx, y: ty, z: 0 }, 300, { apex: 50 });
    W.shots.push({ id: nid(), team: 'foe', kind: 'plate', x: B.x, y: B.y, z: 30, vx: v.vx, vy: v.vy, vz: v.vz, grav: 300, r: 3, dmg: 10, life: v.t + .05, tx, ty, land: W.t + v.t, splash: 12, by: -1, rot: 0 });
  }
  happen('king', { what: 'throw', x: B.x, y: B.y });
}
function bossWave() {
  const pts = (W.fd.points && W.fd.points.wave) || [];
  for (const [cx, cy] of pts.slice(0, 3)) for (let i = 0; i < 2; i++) {
    const x = (cx + .5) * T + (i ? 6 : -6), y = (cy + .5) * T;
    if (W.map.walkable(Math.floor(x / T), Math.floor(y / T)) && W.mons.length < monCap()) spawnMon('gnasher', x, y, 2, { awake: true, emerge: true });
  }
  happen('king', { what: 'wave' });
}
function bossHurt(amt, by, kind, ang) {
  const B = W.boss; if (!B || !B.alive || B.intro > 0 || W.net === 'client') return;
  let dmg = amt;
  if (B.phase === 3 && kind !== 'magic' && ang !== undefined && Math.abs(E.angDiff(ang + Math.PI, B.face)) < .9) { dmg *= 2; happen('king', { what: 'ribhit', x: B.x, y: B.y }); }
  if (CHEAT.onehit) dmg = B.maxHp;
  B.hp -= dmg; B.hurtT = .15;
  happen('bosshit', { x: B.x, y: B.y, dmg: Math.round(dmg) });
  if (B.hp <= 0) {
    B.hp = 0; B.alive = false; B.state = 'dead';
    if (by) addScore(by, 10000, B);
    for (const m of W.mons) if (!m.dead) killMon(m, null);
    for (const g of W.gens) g.dead = true;
    happen('king', { what: 'dead', x: B.x, y: B.y, line: STORY.king.dead });
    say('king_dead', by, 3);
    let gx = B.x, gy = B.y + 14;
    for (let rr = 0; rr < 6 && !W.map.walkable(Math.floor(gx / T), Math.floor(gy / T)); rr++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = B.x + dx * 16 * (rr + 1), y = B.y + dy * 16 * (rr + 1); if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) { gx = x; gy = y; break; } }
    const g = dropItem('gauntlet', gx, gy);
    g.delay = 1.5;
  }
}
function bossGauntletTaken(h) { W.done = { by: h.pi, ending: true, at: { x: h.x, y: h.y } }; happen('stairs', { pi: h.pi, ending: true }); }

/* ---- the step order (each 1/120 s): heroes, generators, monsters, the boss, projectiles, features ---- */
function stepWorld(dt) {
  if (!W || W.done && W.doneT > 3) return;
  W.t += dt;
  if (W.done) W.doneT = (W.doneT || 0) + dt;
  for (const h of W.heroes) stepHero(h, dt);
  if (W.net === 'client') return;
  stepGens(dt);
  stepMonsters(dt);
  stepBoss(dt);
  stepShots(dt);
  stepFeatures(dt);
  // the Dinner Bell's hot potato: a marked hero who touches a friend passes it on
  if (W.bell) {
    const m = W.heroes[W.bell.pi] || W.heroes.find(h => h.pi === W.bell.pi);
    if (m) for (const o of W.heroes) if (o !== m && o.alive && Math.hypot(o.x - m.x, o.y - m.y) < 12 && !(m.cd.bell > 0)) { W.bell = { pi: o.pi }; o.menu = 12; m.menu = 0; o.cd.bell = 1; say('bell_pass', o, 3); happen('bell', { pi: o.pi, x: o.x, y: o.y, pass: true }); break; }
  }
  for (const it of W.items) if (it.delay > 0) it.delay -= dt;
  W.items = W.items.filter(i => !i.gone);
}

// ---- 30-intents.js ----
/* 30-intents: what drives a hero. Local input (keyboard and mouse, gamepads), the network and the bot all produce the
 * same intent: { mx, my (ground direction), aim (angle or null), fire, kbFire, magic, plant, rise }. */

function groundDir(sx, sy) {
  const l = Math.hypot(sx, sy); if (l < .01) return [0, 0];
  const d = game.view.screenDirToGround(sx, sy), dl = Math.hypot(d[0], d[1]) || 1, k = Math.min(1, l) / dl;
  return [d[0] * k, d[1] * k];
}
function localIntent(h, inp) {
  const mv = inp.move(), [mx, my] = groundDir(mv[0], mv[1]);
  let aim = null, fire = inp.down('fire'), kbFire = false;
  const pa = inp.padAim, pl = pa ? Math.hypot(pa[0], pa[1]) : 0;
  if (pa && pl > .3) { const d = groundDir(pa[0], pa[1]); aim = Math.atan2(d[1], d[0]); if (S.stickFire && pl > .5) fire = true; }
  else if (inp === game.input && inp.aimSource === 'mouse' && inp.mouse && (inp.clock - (inp.mouse.t || -9) < 3 || inp.held.has('Mouse0'))) {
    const g = game.mouseGround(); if (g && isFinite(g[0]) && isFinite(g[1]) && Math.hypot(g[0] - h.x, g[1] - h.y) > 2) aim = Math.atan2(g[1] - h.y, g[0] - h.x);
  }
  if (fire && aim === null && !inp.held.has('Mouse0') && inp.lastDevice !== 'gamepad') kbFire = true;   // keyboard-only firing plants, as in the arcade
  if ((fire || aim !== null) && S.aimAssist !== 'off') aim = assist(h, aim === null ? h.face : aim, S.aimAssist === 'high' ? .28 : .14);
  return { mx, my, aim, fire, kbFire, magic: inp.pressed('magic'), plant: inp.down('plant'), rise: inp.pressed('fire') || inp.pressed('confirm') };
}
// aim assist: the nearest monster or generator within the cone and 200 units, in sight
function assist(h, a, cone) {
  let best = null, bs = 1e9;
  const cands = W.mons.filter(m => !m.dead && !(m.type === 'fryar' && m.vis < .5)).concat(W.gens.filter(g => !g.dead));
  for (const m of cands) {
    const d = Math.hypot(m.x - h.x, m.y - h.y); if (d > 200) continue;
    const da = Math.abs(E.angDiff(a, Math.atan2(m.y - h.y, m.x - h.x))); if (da > cone) continue;
    const s = da * 120 + d; if (s < bs && W.map.los(h.x, h.y, m.x, m.y)) { bs = s; best = m; }
  }
  return best ? Math.atan2(best.y - h.y, best.x - h.x) : a;
}
const IDLE_INTENT = { mx: 0, my: 0, aim: null, fire: false, kbFire: false, magic: false, plant: false, rise: false };

// ---- 31-bot.js ----
/* 31-bot: the autopilot. Plays a hero from the sim's state (attract mode, the playthrough tests, Dev "bot plays P1").
 * Goals, re-chosen four times a second: eat when low, fight what is near, break generators, fetch keys and open doors
 * when the stairs are shut away, take treasure on the way, then the stairs. Fields know the transporters. */

function padLinks() { const L = new Map(); for (const p of W.pads) if (p.pair !== undefined) { const q = W.pads[p.pair]; L.set(p.cy * W.map.w + p.cx, q.cy * W.map.w + q.cx); } return L; }
function linkedField(sources) {
  // a BFS like buildField, but walking through transporter pairs (monsters never use them; heroes do)
  const map = W.map, w = map.w, h = map.h, d = new Int32Array(w * h).fill(1e9), q = new Int32Array(w * h * 2), links = padLinks();
  let qh = 0, qt = 0;
  for (const s of sources) { const k = s.cy * w + s.cx; if (d[k] === 0) continue; d[k] = 0; q[qt++] = k; }
  while (qh < qt) {
    const k = q[qh++], cx = k % w, cy = (k / w) | 0, nd = d[k] + 1;
    const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    for (const [nx, ny] of nb) { if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const nk = ny * w + nx; if (d[nk] <= nd || !map.walkable(nx, ny)) continue; d[nk] = nd; q[qt++] = nk; }
    if (links.has(k)) { const nk = links.get(k); if (d[nk] > nd) { d[nk] = nd; q[qt++] = nk; } }
  }
  return { d, w, h, links };
}
function makeBot(h, o = {}) { return { h, cheat: !!o.cheat, noSkip: !!o.noSkip, t: 0, goal: null, field: null, fkey: '', last: { x: h.x, y: h.y, t: 0 }, side: 0, think: 'start', tgt: null }; }

function botIntent(bot, dt) {
  const h = bot.h; bot.t += dt;
  if (!h.alive) return { ...IDLE_INTENT, rise: bot.t % 1 < dt * 2 };
  if (!W) return IDLE_INTENT;
  if (bot.t - (bot.decided || -9) > .25) { bot.decided = bot.t; botDecide(bot); }
  // movement down the goal's field
  let mx = 0, my = 0;
  const g = bot.goal;
  if (g) {
    const key = g.cx + ',' + g.cy + ':' + W.map.version;
    if (bot.fkey !== key) { bot.field = linkedField([{ cx: g.cx, cy: g.cy }]); bot.fkey = key; }
    const F = bot.field, cx = Math.floor(h.x / T), cy = Math.floor(h.y / T), here = F.d[cy * F.w + cx];
    if (here === 0 || (Math.abs(g.x - h.x) < 10 && Math.abs(g.y - h.y) < 10)) { const d = Math.hypot(g.x - h.x, g.y - h.y) || 1; mx = (g.x - h.x) / d; my = (g.y - h.y) / d; if (d < 2) { mx = my = 0; } }
    else {
      let best = null, bd = here;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= F.w || ny >= F.h) continue;
        if (dx && dy && (!W.map.walkable(cx + dx, cy) || !W.map.walkable(cx, cy + dy))) continue;
        const nd = F.d[ny * F.w + nx] + (dx && dy ? .5 : 0); if (nd < bd) { bd = nd; best = [nx, ny]; }
      }
      if (best) { const tx = (best[0] + .5) * T, ty = (best[1] + .5) * T, d = Math.hypot(tx - h.x, ty - h.y) || 1; mx = (tx - h.x) / d; my = (ty - h.y) / d; }
      else if (here >= 1e9) bot.goal = null;
    }
  }
  if (bot.side > 0) { bot.side -= dt; const a = bot.sideA; mx = Math.cos(a); my = Math.sin(a); }
  // fighting: aim at the target and fire; keep a little distance as a thrower
  let aim = null, fire = false, magic = false;
  const t = bot.tgt;
  if (t && !t.dead && (t.hp > 0 || t.alive)) {
    aim = Math.atan2(t.y - h.y, t.x - h.x); fire = true;
    const d = Math.hypot(t.x - h.x, t.y - h.y);
    if ((h.cls === 'ranger' || h.cls === 'hexer') && d < 40 && t.type !== 'tithe' && !t.maxHp) { mx = mx * .3 - Math.cos(aim) * .7; my = my * .3 - Math.sin(aim) * .7; }
  }
  const onScreen = W.mons.filter(m => !m.dead && Math.abs(m.x - h.x) < 200 && Math.abs(m.y - h.y) < 120).length;
  if (h.flasks > 0 && (onScreen >= 12 || (t && t.type === 'tithe' && Math.hypot(t.x - h.x, t.y - h.y) < 60) || (W.boss && W.boss.alive && W.boss.intro <= 0 && bot.t % 9 < dt))) magic = true;
  if (bot.cheat && h.flasks < 3) h.flasks = 3;
  // stuck: little progress in 3 s -> sidestep; with cheats, hop ahead along the field
  if (bot.t - bot.last.t > 3) {
    const moved = Math.hypot(h.x - bot.last.x, h.y - bot.last.y);
    if (moved < 8 && bot.goal) {
      bot.side = .5; bot.sideA = R() * TAU; bot.think += ' (stuck)';
      if (bot.cheat && bot.field) hopAhead(bot);
    }
    bot.last = { x: h.x, y: h.y, t: bot.t };
  }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  return { mx, my, aim, fire, kbFire: false, magic, plant: false, rise: false };
}
function hopAhead(bot) {
  const h = bot.h, F = bot.field;
  let cx = Math.floor(h.x / T), cy = Math.floor(h.y / T);
  for (let i = 0; i < 4; i++) {
    let best = null, bd = F.d[cy * F.w + cx];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= F.w || ny >= F.h) continue; const nd = F.d[ny * F.w + nx]; if (nd < bd) { bd = nd; best = [nx, ny]; } }
    if (!best) break; [cx, cy] = best;
  }
  h.x = (cx + .5) * T; h.y = (cy + .5) * T; h.body.x = h.x; h.body.y = h.y;
}

function botDecide(bot) {
  const h = bot.h, map = W.map;
  const [hx, hy] = cellOf(h), me = linkedField([{ cx: hx, cy: hy }]), at = e => me.d[Math.floor(e.y / T) * me.w + Math.floor(e.x / T)];
  const reach = e => at(e) < 1e9, set = (e, why) => { bot.goal = { cx: Math.floor(e.x / T), cy: Math.floor(e.y / T), x: e.x, y: e.y }; bot.think = why; };
  // a target to shoot: the nearest monster in sight within 7 tiles, else a generator within 10, else the boss
  bot.tgt = null;
  let bd = 1e9;
  for (const m of W.mons) { if (m.dead || m.emerge > 0) continue; const d = Math.hypot(m.x - h.x, m.y - h.y); if (d < 7 * T && d < bd && (m.type !== 'tithe' || h.flasks > 0) && map.los(h.x, h.y, m.x, m.y)) { bd = d; bot.tgt = m; } }
  if (!bot.tgt) for (const g of W.gens) { if (g.dead) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < 10 * T && map.los(h.x, h.y, g.x, g.y)) { bot.tgt = g; break; } }
  if (W.boss && W.boss.alive && W.boss.intro <= 0) {
    const pl = W.boss.phase === 2 && W.items.find(i => i.kind === 'platter' && !i.gone && Math.hypot(i.x - h.x, i.y - h.y) < 160);
    if (!bot.tgt || Math.hypot(W.boss.x - h.x, W.boss.y - h.y) < 120) bot.tgt = pl ? Object.assign(Object.create(null), { x: pl.x, y: pl.y, hp: 1 }) : W.boss;
  }
  const items = W.items.filter(i => !i.gone && !(i.delay > 0) && reach(i));
  const nearest = (list) => list.reduce((a, b) => !a || at(b) < at(a) ? b : a, null);
  // 0. the Iron Gauntlet
  const gl = items.find(i => i.kind === 'gauntlet'); if (gl) return set(gl, 'the gauntlet');
  // 1. food when low
  if (h.hp < 250) { const f = nearest(items.filter(i => get('items', i.kind).food && at(i) < 20)); if (f) return set(f, 'eat'); }
  // the hoard: everything shiny
  if (W.hoard) { const t = nearest(items.filter(i => get('items', i.kind).treasure && i.kind !== 'lchest')); if (t) return set(t, 'hoard'); }
  // the boss: keep at a throwing distance from him
  if (W.boss && W.boss.alive) { const B = W.boss, a = Math.atan2(h.y - B.y, h.x - B.x) + .3; return set({ x: clamp(B.x + Math.cos(a) * 90, 24, map.w * T - 24), y: clamp(B.y + Math.sin(a) * 90, 24, map.h * T - 24) }, 'circle the king'); }
  // 2. the stairs, if they can be reached (taking treasure and food close on the way)
  const exits = W.exits.filter(e => reach(e) && (!e.to || (e.to > W.no && !bot.noSkip))), exit = nearest(exits.filter(e => !e.to)) || nearest(exits);
  const close = nearest(items.filter(i => at(i) < 5 && ['gold', 'gem', 'crown', 'chest', 'key', 'flask', 'special', 'amulet'].includes(i.kind) || (at(i) < 8 && get('items', i.kind).food && h.hp < 600 && i.kind !== 'stew')));
  if (close && !(close.kind === 'key' && h.keys >= limitOf(h)) && !(close.kind === 'flask' && h.flasks >= limitOf(h)) && !(close.kind === 'special' && h.specials[close.sub])) return set(close, 'grab ' + close.kind);
  if (exit) return set(exit, 'stairs');
  // 3. doors: open the nearest run we can reach, with a key; else fetch a key
  const doors = W.doorGroups.filter(g => !g.open).map(g => ({ g, c: g.cells.reduce((a, c) => { const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => me.d[(c.cy + dy) * me.w + c.cx + dx]).reduce((x, y) => Math.min(x, y), 1e9); return n < a.n ? { c, n } : a; }, { c: null, n: 1e9 }) })).filter(o => o.c.c && o.c.n < 1e9);
  if (doors.length && h.keys > 0) { const d = doors.sort((a, b) => a.c.n - b.c.n)[0].c.c; return set(d, 'open a door'); }
  const key = nearest(items.filter(i => i.kind === 'key')); if (key) return set(key, 'fetch a key');
  // 4. trap plates, then anything left, then wander toward the stairs
  const plate = W.plates.find(p => !p.used && reach(p)); if (plate) return set(plate, 'step on the plate');
  const any = nearest(items.filter(i => i.kind !== 'stew' && i.kind !== 'lchest')); if (any) return set(any, 'explore');
  bot.goal = null; bot.think = 'wait for the Gaunt';
}

// ---- 40-net.js ----
/* 40-net: AI Hub shared world. The host's copy runs the world; each client moves its own hero at once (zero-lag
 * control), sends it (and its button presses) to the host, and shows everything else from the host's snapshots,
 * interpolated 100 ms behind. Events (items gone, doors, kills, lines...) travel reliably in batches. A token bucket
 * keeps every copy under the hub's 20 messages a second. */

const MTYPES = Object.keys(REG.monsters), PKINDS = ['axe', 'javelin', 'arrow', 'hex', 'crock', 'fireball', 'plate'], AMS = [null, ...Object.keys(AMULETS)];
const BSTATES = ['idle', 'roar', 'stomp', 'eat', 'walk', 'chargeWind', 'charge', 'fogWind', 'dead'];
const NET = {
  role: 'local', me: -1, host: -1, sent: 0, recv: 0, lastBytes: 0, maxBytes: 0, bucket: 40, lastTick: 0, snaps: [], evq: [], pending: [], sendT: 0, evT: 0, meT: 0, ended: false, perSec: [], dropped: 0,
  stats() { return { role: this.role, sent: this.sent, received: this.recv, lastSnapshotBytes: this.lastBytes, maxSnapshotBytes: this.maxBytes, dropped: this.dropped, peak: this.peak() }; },
  peak() { const now = game.real; this.perSec = this.perSec.filter(t => now - t < 1); return this.perSec.length; },
  canSend() { return this.bucket >= 1; },
  send(data, o = {}) {
    if (this.ended || !HUB) return false;
    if (this.bucket < 1) { this.dropped++; return false; }
    let ok = false;
    try { ok = HUB.send(data, o) !== false; } catch (e) { ok = false; }
    if (ok) { this.bucket -= 1; this.sent++; this.perSec.push(game.real); }
    return ok;
  },
  tick(dt) {
    this.bucket = Math.min(38, this.bucket + dt * 19);   // just under the hub's 20 a second, bursts under 40
    if (this.ended || !W) return;
    if (this.role === 'host' || this.role === 'server') this.hostTick(dt);
    else if (this.role === 'client') this.clientTick(dt);
  },
  /* ---- host ---- */
  hostTick(dt) {
    this.sendT -= dt; this.evT -= dt;
    if (this.evT <= 0 && (W.outbox.length || this.pending.length)) {
      this.evT = .125;
      const batch = this.pending.concat(W.outbox.splice(0).map(([type, d]) => [type, d]));
      this.pending = [];
      if (batch.length && !this.send({ t: 'e', e: batch.slice(0, 120) }, { reliable: true })) this.pending = batch; else if (batch.length > 120) this.pending = batch.slice(120);
    }
    if (this.sendT <= 0) { this.sendT = .1; const s = this.snapshot(), str = JSON.stringify(s); this.lastBytes = str.length; this.maxBytes = Math.max(this.maxBytes, str.length); this.send(s, { reliable: false }); }
  },
  snapshot() {
    const live = PARTY.filter(h => h.alive), r = (v) => Math.round(v), aoi = e => live.some(h => Math.abs(e.x - h.x) < 16 * T && Math.abs(e.y - h.y) < 11 * T) || !live.length;
    const h = PARTY.map(x => [x.pi, r(x.x), r(x.y), r(x.aim * 100), x.hp, x.score, x.keys, x.flasks, (x.alive ? 1 : 0) | (x.firing ? 2 : 0) | (x.stun > 0 ? 4 : 0) | (x.queasy > 0 ? 8 : 0) | (x.menu > 0 ? 16 : 0) | (x.plant ? 32 : 0) | (x.swing && W.t - x.swing.t0 < x.swing.dur ? 64 : 0) | (x.hurtT > 0 ? 128 : 0), AMS.indexOf(x.amulet) * 100 + Math.min(99, Math.ceil(x.amuletT)), x.stats.kills, x.stats.treasure, x.stats.food, x.stats.stairs]);
    let m = W.mons.filter(aoi);
    if (m.length > 140) m = m.slice(0, 140);
    const ms = m.map(x => [x.id, MTYPES.indexOf(x.type) * 4 + x.rank, r(x.x), r(x.y), r(x.face * 100), (x.wind > 0 ? 1 : 0) | (x.vis < .5 ? 2 : 0) | (x.emerge > 0 ? 4 : 0) | (x.hurtT > 0 ? 8 : 0) | (x.spit > 0 ? 16 : 0)]);
    const ps = W.shots.filter(aoi).slice(0, 70).map(s => [s.id, PKINDS.indexOf(s.kind), r(s.x), r(s.y), r(s.z), r(s.vx), r(s.vy), r(s.vz), s.owner ? s.owner.pi : -1, s.tx !== undefined ? r(s.tx) : 0, s.ty !== undefined ? r(s.ty) : 0]);
    const gs = W.gens.map(g => [g.id, g.rank, r(g.hp * 10)]);
    const B = W.boss, b = B ? [r(B.hp), B.phase, r(B.x), r(B.y), BSTATES.indexOf(B.state), r(B.face * 100), B.alive ? 1 : 0, r(B.intro * 10)] : 0;
    return { t: 's', q: W.serial, at: Math.round(W.t * 1000), h, m: ms, p: ps, g: gs, b, st: W.stage };
  },
  onMessage(data, from) {
    this.recv++;
    if (!data || this.ended) return;
    if (this.role === 'host' || this.role === 'server') {
      const h = PARTY.find(p => p.netId === from); if (!h) return;
      if (data.t === 'me' && W && data.q === W.serial) {
        // trust the client's own position, within reason: a speed clamp, and never inside a wall
        const dt = Math.max(.05, (data.at - (h.lastAt || data.at - 100)) / 1000); h.lastAt = data.at;
        let nx = data.x, ny = data.y; const d = Math.hypot(nx - h.x, ny - h.y), max = heroSpeed(h) * 1.5 * dt + 24;
        if (d > max && d < 200) { nx = h.x + (nx - h.x) / d * max; ny = h.y + (ny - h.y) / d * max; }
        if (W.map.walkable(Math.floor(nx / T), Math.floor(ny / T)) || d >= 200) { h.x = nx; h.y = ny; h.body.x = nx; h.body.y = ny; }
        h.intent = { mx: (data.mx || 0) / 100, my: (data.my || 0) / 100, aim: data.a / 100, fire: !!data.f, kbFire: false, magic: false, plant: !!data.p, rise: false };
      } else if (data.t === 'act' && data.k === 'magic' && W && h.alive && data.n !== h.lastAct) { h.lastAct = data.n; h.view = data.v ? [data.v[0] * T, data.v[1] * T] : null; useMagic(h); h.view = null; }
      return;
    }
    if (this.role === 'client') {
      if (data.t === 's') { this.snaps.push(data); if (this.snaps.length > 4) this.snaps.shift(); }
      else if (data.t === 'e') for (const ev of data.e) applyEvent(ev[0], ev[1]);
    }
  },
  /* ---- client ---- */
  clientTick(dt) {
    const me = PARTY.find(h => h.netId === this.me); if (!me) return;
    this.meT -= dt;
    if (this.meT <= 0) { this.meT = 1 / 12; const it = me.intent || IDLE_INTENT; this.send({ t: 'me', q: W.serial, at: Math.round(game.real * 1000), x: Math.round(me.x), y: Math.round(me.y), a: Math.round(me.aim * 100), f: it.fire ? 1 : 0, p: it.plant ? 1 : 0, mx: Math.round(it.mx * 100), my: Math.round(it.my * 100) }, { reliable: false }); }
    if (me.intent && me.intent.magic && me.alive) { me.actN = (me.actN || 0) + 1; this.send({ t: 'act', k: 'magic', n: me.actN, v: [Math.round(W.viewHalf[0] / T), Math.round(W.viewHalf[1] / T)] }, { reliable: true }); }
    // cosmetic shots of our own, at once (they stop at walls and spark, but deal no damage)
    if (me.firing && me.alive && (me.ccool = (me.ccool || 0) - dt) <= 0) { me.ccool = shotCool(me); const a = me.aim, sp = me.D.shot.speed; W.shots.push({ id: -1, team: 'cosmetic', kind: me.D.shot.kind, owner: me, x: me.x, y: me.y, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 3, life: SHOT_RANGE / sp, rot: 0, hits: new Set() }); sfx(SHOT_SFX[me.D.shot.kind], { vol: .6 }); }
    for (const s of W.shots) if (s.team === 'cosmetic') { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 14; if (s.life <= 0 || W.map.heightAt(s.x, s.y) > s.z) s.dead = true; }
    W.shots = W.shots.filter(s => !s.dead);
    this.applySnapshots(me);
  },
  applySnapshots(me) {
    if (!this.snaps.length) return;
    const latest = this.snaps[this.snaps.length - 1];
    if (latest.q !== W.serial) return;
    this.clock = (this.clock === undefined ? latest.at : this.clock + 1000 / 120);
    if (Math.abs(this.clock - (latest.at - 100)) > 300) this.clock = latest.at - 100;
    const tgt = this.clock;
    let a = latest, b = latest;
    for (let i = this.snaps.length - 1; i > 0; i--) if (this.snaps[i - 1].at <= tgt && this.snaps[i].q === W.serial) { a = this.snaps[i - 1]; b = this.snaps[i]; break; }
    const k = b.at > a.at ? clamp((tgt - a.at) / (b.at - a.at), 0, 1.5) : 1;
    const lerpBy = (arr, id, i) => { const o = arr.find(x => x[0] === id); return o ? o[i] : null; };
    // heroes: ours keeps its own position; the host's numbers are the truth for health, score and pockets
    for (const row of latest.h) {
      const h = PARTY[row[0]]; if (!h) continue;
      h.hp = row[4]; h.score = row[5]; h.keys = row[6]; h.flasks = row[7];
      const f = row[8]; const wasAlive = h.alive; h.alive = !!(f & 1); if (h === me && wasAlive && !h.alive) h.deadT = 0; if (h === me && !wasAlive && h.alive) { h.x = row[1]; h.y = row[2]; h.body.x = h.x; h.body.y = h.y; }
      h.stun = f & 4 ? .1 : 0; h.queasy = f & 8 ? .1 : 0; h.menu = f & 16 ? 1 : 0; h.hurtT = f & 128 ? .1 : h.hurtT;
      const am = Math.floor(row[9] / 100); h.amulet = AMS[am] || null; h.amuletT = row[9] % 100;
      h.stats.kills = row[10]; h.stats.treasure = row[11]; h.stats.food = row[12]; h.stats.stairs = row[13];
      if (h !== me) {
        const ax = lerpBy(a.h, row[0], 1), ay = lerpBy(a.h, row[0], 2), nx = ax === null ? row[1] : lerp(ax, lerpBy(b.h, row[0], 1), k), ny = ay === null ? row[2] : lerp(ay, lerpBy(b.h, row[0], 2), k);
        h.vx = (nx - h.x) * 120; h.vy = (ny - h.y) * 120; h.x = nx; h.y = ny; h.aim = row[3] / 100; h.firing = !!(f & 2); h.plant = !!(f & 32);
        if (Math.hypot(h.vx, h.vy) > 5) h.face = Math.atan2(h.vy, h.vx);
        if (f & 64 && !(h.swing && W.t - h.swing.t0 < h.swing.dur)) h.swing = { move: h.D.moves[0], n: 0, t0: W.t, dur: .4, at: .2, hit: true };
        if (h.firing && W.t - h.throwT > shotCool(h)) h.throwT = W.t;
      }
    }
    // monsters: puppets, interpolated
    const old = new Map(W.mons.map(m => [m.id, m])), next = [];
    for (const row of b.m) {
      const [id, tr, x, y, fc, fl] = row, type = MTYPES[Math.floor(tr / 4)], rank = tr % 4;
      let m = old.get(id);
      if (!m) { m = { id, type, D: get('monsters', type), rank, srank: rank, x, y, vx: 0, vy: 0, r: 5, face: fc / 100, t: 0, cd: {}, vis: 1 }; }
      const pa = a.m.find(o => o[0] === id), px0 = pa ? lerp(pa[2], x, k) : x, py0 = pa ? lerp(pa[3], y, k) : y;
      m.vx = (px0 - m.x) * 60; m.vy = (py0 - m.y) * 60; m.x = px0; m.y = py0; m.face = fc / 100; m.rank = rank; m.type = type; m.D = get('monsters', type);
      m.wind = fl & 1 ? .1 : 0; m.vis = fl & 2 ? 0 : 1; m.emerge = fl & 4 ? .1 : 0; m.hurtT = fl & 8 ? .1 : 0; m.spit = fl & 16 ? .1 : 0; m.t += 1 / 120;
      next.push(m);
    }
    W.mons = next;
    // projectiles (but our own hero's: we draw our own at once)
    const cos = W.shots.filter(s => s.team === 'cosmetic');
    W.shots = cos.concat(b.p.filter(p => p[8] !== me.pi).map(p => ({ id: p[0], team: p[8] >= 0 ? 'hero' : 'foe', kind: PKINDS[p[1]], x: p[2] + p[5] * (k * .1), y: p[3] + p[6] * (k * .1), z: p[4], vx: p[5], vy: p[6], vz: p[7], tx: p[9], ty: p[10], rot: game.real * 14, grav: p[1] === 4 || p[1] === 6 ? 300 : 0, land: p[1] === 4 || p[1] === 6 ? W.t + .3 : 0 })));
    const gm = new Map(b.g.map(g => [g[0], g]));
    for (const g of W.gens) { const row = gm.get(g.id); if (!row) g.dead = true; else { g.rank = row[1]; g.hp = row[2] / 10; } }
    W.gens = W.gens.filter(g => !g.dead);
    if (b.b && W.boss) { const B = W.boss; B.hp = b.b[0]; B.phase = b.b[1]; B.vx = (b.b[2] - B.x) * 10; B.vy = (b.b[3] - B.y) * 10; B.x = b.b[2]; B.y = b.b[3]; B.state = BSTATES[b.b[4]]; B.face = b.b[5] / 100; B.alive = !!b.b[6]; B.intro = b.b[7] / 10; }
    W.stage = latest.st;
  }
};
/* a client applies the host's events: the state they change and the effects they make */
function applyEvent(type, d) {
  if (!W) return;
  if (type === 'floor') { sessionFloor(d.idx, d.q); return; }
  if (d.q !== undefined && d.q !== W.serial && type !== 'over') return;
  switch (type) {
    case 'gone': { const it = W.items.find(i => i.id === d.id); if (it) it.gone = true; W.items = W.items.filter(i => !i.gone); break; }
    case 'drop': if (!W.items.some(i => i.id === d.id)) W.items.push({ id: d.id, kind: d.kind, sub: d.sub, x: d.x, y: d.y, cx: Math.floor(d.x / T), cy: Math.floor(d.y / T) }); break;
    case 'door': { const g = W.doorGroups[d.g]; if (g && !g.open) { g.open = true; for (const c of g.cells) W.map.set(c.cx, c.cy, 0); } break; }
    case 'wall': W.map.set(d.cx, d.cy, 0); { const c = W.cracked.find(c => c.cx === d.cx && c.cy === d.cy); if (c) c.open = true; } break;
    case 'secret': W.map.set(d.cx, d.cy, 0); { const f = W.fakes.find(f => f.cx === d.cx && f.cy === d.cy); if (f) f.open = true; } break;
    case 'trap': for (const c of (d.kind === 'T' ? W.p.trapT : W.p.trapY)) W.map.set(c.cx, c.cy, 0); for (const p of W.plates) if (p.kind === d.kind) p.used = true; break;
    case 'over': sessionOver(d); return;
  }
  bus.emit(type, d);
}

// ---- 41-session.js ----
/* 41-session: an AI Hub round. Straight into it (no title or menus): connect, build floor 1 for the seats, ready()
 * with no key press, our own card (players, how to win, this player's controls, Ready / More time), the 3-2-1 from the
 * hub's clock, six minutes of shared-world play, time-up -> finish() from the host, end -> ROUND OVER. */

const SESS = { info: null, card: null, started: false, ended: null, menu: null, floorQ: 1, finished: false };
const seatClass = i => HERO_ORDER[i % 4];

scenes.sboot = {
  touch: [],
  enter() {
    SC.sboot = { t: 0 };
    HUB.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { SESS.info = null; game.go('title'); return; }
      SESS.info = info;
      NET.me = info.me; NET.host = info.host; NET.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
      HUB.on('card', c => { SESS.card = c; });
      HUB.on('start', () => { SESS.started = true; if (game.sceneName !== 'splay') game.go('splay', {}, { fade: .2 }); });
      HUB.on('message', (d, from) => NET.onMessage(d, from));
      HUB.on('leave', d => sessionLeave(d.id));
      HUB.on('time-up', () => { if (NET.role !== 'client') sessionFinish('time'); });
      HUB.on('end', d => { NET.ended = true; SESS.ended = d; game.input.clear(); music(null); SC.mute = true; A.mute && A.mute(true); game.go('sover', {}, { fade: .2 }); });
      // the world: floor 1, the seats' heroes in their hub colours
      PARTY.length = 0;
      info.players.forEach((p, i) => { const h = makeHero(seatClass(i), i, { input: p.id === info.me ? game.input : null, remote: p.id !== info.me, netId: p.id, color: p.color || SEAT_COLORS[i] }); h.netName = String(p.name || 'P' + (i + 1)); h.local = p.id === info.me; PARTY.push(h); });
      reseed(info.seed || 1); RUN.loop = 1; RUN.mode = 'session'; NARR.reset(false);
      SESS.floorQ = 1;
      newWorld(FLOOR_ORDER[0], { net: NET.role === 'client' ? 'client' : 'host' });
      W.serial = SESS.floorQ;
      if (!SESS.started) game.go('scard', {}, { fade: 0 });   // (at once: the card takes Enter from its first step)
      HUB.ready();
    });
  },
  update(dt) { SC.sboot.t += dt; },
  draw(r) { drawTitleBack(r, SC.sboot.t, true); r.overlay(g => otxt(g, 'JOINING THE ROUND...', r.W / 2, r.H / 2, '#ffe08a', { align: 'center', scale: 2 })); }
};

/* ---- the game's own card ---- */
scenes.scard = {
  touch: [],
  enter() { SC.scard = { t: 0, ready: false, boxes: {} }; music('title'); },
  update(dt) {
    const c = SC.scard; c.t += dt;
    const I = game.input, clk = I.clicked(), hit = (b) => clk && b && clk[0] >= b[0] && clk[0] < b[0] + b[2] && clk[1] >= b[1] && clk[1] < b[1] + b[3];
    const createHeld = I.held.has('Pad8');
    if (!createHeld && (I.pressed('confirm') || I.pressed('start') || hit(c.boxes.ready))) { HUB.answer('ready'); c.ready = true; happen('ui', { k: 'pick' }); }
    if (I.pressed('more') || hit(c.boxes.more)) { HUB.answer('more'); happen('ui', { k: 'move' }); }
  },
  draw(r) {
    drawTitleBack(r, SC.scard.t, true);
    r.overlay(g => drawSessionCard(g, r));
  }
};
function drawSessionCard(g, r) {
  const c = SC.scard, W0 = r.W, H0 = r.H, info = SESS.info || { players: [], round: 1 }, card = SESS.card || {}, I = game.input;
  E.font.title(g, 'GAUNTLETDOWN', W0 / 2, 8, { scale: 3, colors: LOGO_COLORS, outline: '#120806', depth: 3, depthColor: '#3a1a0a', align: 'center' });
  otxt(g, 'ROUND ' + (info.round || 1), W0 / 2, 40, '#e8c8a0', { align: 'center' });
  const n = info.players.length;
  info.players.forEach((p, i) => {
    const x = W0 / 2 + (i - (n - 1) / 2) * 90, y = 112, h = PARTY[i];
    if (h) { const rig = h.cardRig || (h.cardRig = h.D.rig()); rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: (card.ready || []).includes(p.id) ? 'cheer' : null }); rig.draw(g, x, y, r.view); }
    px.rect(g, x - 40, y + 4, 80, 2, p.color || SEAT_COLORS[i]);
    otxt(g, String(p.name || 'P' + (i + 1)).replace(/[^\x20-\x7E]/g, '?').slice(0, 14), x, y + 9, p.color || SEAT_COLORS[i], { align: 'center' });
    txt(g, h ? h.D.name : '', x, y + 19, '#c8b8a0', { align: 'center' });
    if ((card.ready || []).includes(p.id)) otxt(g, '✓ READY', x, y + 29, '#7ae87a', { align: 'center' });
  });
  const boxY = 158;
  otxt(g, 'HOW TO WIN', W0 / 2, boxY, '#e8a840', { align: 'center' });
  txt(g, 'Most points when the clock runs out: treasure, kills, stairs. Don\'t starve.', W0 / 2, boxY + 11, '#f0e0c8', { align: 'center' });
  const ctl = I.lastDevice === 'gamepad' ? 'Move: L stick   Aim: R stick   Fire: ' + I.label('fire') + '   Magic: ' + I.label('magic') : 'Move: WASD   Aim: mouse   Fire: ' + I.label('fire') + ' / Left click   Magic: ' + I.label('magic') + ' / Right click';
  txt(g, ctl, W0 / 2, boxY + 24, '#c8b8a0', { align: 'center' });
  const left = card.paused ? 'PAUSED' : card.left === null || card.left === undefined ? (card.starting ? 'STARTING' : '') : Math.ceil(card.left / 1000) + ' S';
  otxt(g, left, W0 - 10, 10, '#ffe08a', { align: 'right', scale: 2 });
  const bw = 120, by = H0 - 34;
  c.boxes.ready = [W0 / 2 - bw - 6, by, bw, 22]; c.boxes.more = [W0 / 2 + 6, by, bw, 22];
  px.rect(g, ...c.boxes.ready, c.ready ? '#2a5a2a' : '#6a3a1a'); px.rect(g, c.boxes.ready[0], by, bw, 1, '#e8a840');
  otxt(g, (c.ready ? '✓ ' : '') + 'READY  ' + I.label('confirm'), c.boxes.ready[0] + bw / 2, by + 7, '#ffe08a', { align: 'center' });
  px.rect(g, ...c.boxes.more, card.asked ? '#3a3a6a' : '#3a2a2a'); px.rect(g, c.boxes.more[0], by, bw, 1, '#8a8ac8');
  otxt(g, 'MORE TIME  ' + (I.lastDevice === 'gamepad' ? I.label('more') : 'T'), c.boxes.more[0] + bw / 2, by + 7, '#d8d8ff', { align: 'center' });
}

/* ---- the round ---- */
scenes.splay = {
  touch: [], world: true, view: 'threequarter', camera: { zoom: [.55, 1.2], start: .72, tall: .9 },
  enter() {
    SC.play = { t: 0, attract: false, session: true };
    setupLights(); music(musicFor(W.fd), { sync: false });
    game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null;
  },
  update(dt) {
    const t = HUB.time();
    NET.tick(dt);
    if (SESS.ended) return;
    if (SESS.menu) { sessionMenuStep(); for (const h of PARTY) if (h.local) h.intent = IDLE_INTENT; }
    else if (game.input.pressed('pause') && !game.input.held.has('Pad8')) { SESS.menu = { i: 0 }; game.input.consumeAll(); }
    if (t < 0) { camFrame(false); NARR.update(dt); return; }
    for (const h of PARTY) if (h.local && !SESS.menu) h.intent = localIntent(h, h.input);
    if (NET.role === 'client') { stepWorld(dt); }
    else {
      stepWorld(dt);
      if (W.done && W.doneT > .7) sessionNextFloor();
      if (PARTY.length && !living().length && !SESS.finished) sessionFinish('all-down');
      if (W.boss && !W.boss.alive && !SESS.finished && W.doneT > 1) sessionFinish('king');
    }
    if (NET.role !== 'server') { camFrame(false); musicLayers(dt); }
    NARR.update(dt);
  },
  draw(r) {
    if (NET.role === 'server') { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05040a'); otxt(g, 'HOSTING', r.W / 2, r.H / 2 - 8, '#ffe08a', { align: 'center', scale: 2 }); txt(g, PARTY.length + ' heroes  -  floor ' + (W ? W.no : 1), r.W / 2, r.H / 2 + 12, '#a89880', { align: 'center' }); }); return; }
    drawWorld(r); drawHUD(r);
    const t = HUB.time();
    if (t < 0 && t > -4000) r.overlay(g => E.font.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H / 2 - 30, { scale: 6, colors: LOGO_COLORS, outline: '#120806', depth: 3, align: 'center' }));
    if (SESS.menu) r.overlay(g => drawSessionMenu(g, r));
  }
};
function sessionNextFloor() {
  const d = W.done; let idx = RUN.floorIdx + 1;
  if (d.to) { const k = floorIndexOfNo(d.to); if (k > RUN.floorIdx) idx = k; }
  if (idx >= FLOOR_ORDER.length) idx = 0;
  SESS.floorQ++;
  NET.pending.push(['floor', { idx, q: SESS.floorQ }]);
  sessionFloor(idx, SESS.floorQ);
}
function sessionFloor(idx, q) {
  RUN.floorIdx = idx; RUN.deepest = Math.max(RUN.deepest, get('floors', FLOOR_ORDER[idx]).no || 1);
  for (const h of PARTY) { h.amulet = null; h.stun = 0; if (!h.alive) { h.alive = true; h.hp = 350; } }
  newWorld(FLOOR_ORDER[idx], { net: NET.role === 'client' ? 'client' : 'host' });
  W.serial = q; NET.snaps = [];
  setupLights(); music(musicFor(W.fd), { sync: false, fade: .5 });
  NARR.speak(W.fd.hoard ? LINES['hoard_' + W.fd.hoard] : LINES['floor_' + W.no]);
}
function sessionLeave(id) {
  const i = PARTY.findIndex(h => h.netId === id); if (i < 0) return;
  const h = PARTY[i]; h.alive = false; h.left = true; PARTY.splice(i, 1); PARTY.forEach((p, k) => { p.pi = k; });
  if (W) { W.bell = null; W.fieldKey = ''; }
  if (NET.role !== 'client' && !PARTY.length && !SESS.finished) sessionFinish('empty');
}
function sessionFinish(why) {
  if (SESS.finished || NET.role === 'client') return; SESS.finished = true;
  const ps = PARTY.slice().sort((a, b) => b.score - a.score), standings = [];
  for (const h of ps) { const last = standings[standings.length - 1]; if (last && PARTY.find(o => o.netId === last[0]).score === h.score) last.push(h.netId); else standings.push([h.netId]); }
  const scores = {}, stats = {}; for (const h of PARTY) { scores[h.netId] = h.score; stats[h.netId] = { Kills: h.stats.kills, Treasure: h.stats.treasure, Food: h.stats.food, Floors: h.stats.stairs }; }
  const award = (title, detail, key) => { const b = PARTY.reduce((a, h) => !a || h.stats[key] > a.stats[key] ? h : a, null); return b && b.stats[key] > 0 ? { id: b.netId, title, detail: detail + ': ' + b.stats[key] } : null; };
  const awards = [award('Glutton', 'Food eaten', 'food'), award('Generator Buster', 'Generators broken', 'gens'), award('Stair Finder', 'Stairs taken', 'stairs'), award('Shot the Supper', 'Food shot', 'foodShot')].filter(Boolean);
  try { HUB.finish({ standings, scores, stats, awards }); } catch (e) { game.fail('finish', e); }
  NET.pending.push(['over', { why, q: W ? W.serial : 0 }]);
  void why;
}
function sessionOver(d) { SESS.overWhy = d.why; }

/* ---- the session menu: a small overlay that never pauses ---- */
const SMENU = [['Volume', 'volume'], ['Music', 'music'], ['Voices', 'voices'], ['Button symbols', 'padGlyphs'], ['Close', null]];
function sessionMenuStep() {
  const m = SESS.menu, I = game.input;
  if (I.pressed('cancel') || (I.pressed('pause') && !I.held.has('Pad8'))) { SESS.menu = null; I.consumeAll(); return; }
  if (I.repeat('up', .3, .1)) m.i = (m.i + SMENU.length - 1) % SMENU.length;
  if (I.repeat('down', .3, .1)) m.i = (m.i + 1) % SMENU.length;
  const [, key] = SMENU[m.i], lr = I.repeat('left', .3, .1) ? -1 : I.repeat('right', .3, .1) ? 1 : 0;
  if (!key) { if (I.pressed('confirm')) { SESS.menu = null; I.consumeAll(); } return; }
  if (key === 'padGlyphs') { if (lr || I.pressed('confirm')) S.set('padGlyphs', S.padGlyphs === 'xbox' ? 'playstation' : 'xbox'); }
  else if (lr) S.set(key, clamp(+(S[key] + lr * .1).toFixed(2), 0, 1));
}
function drawSessionMenu(g, r) {
  const m = SESS.menu, w = 200, x = (r.W - w) / 2, y = r.H / 2 - 50;
  E.ui.box(g, x, y, w, 100, { bg: ['#2a1a14', '#100806'], border: '#e8a840', alpha: .95 });
  otxt(g, 'MENU  (the round goes on)', r.W / 2, y + 6, '#ffe08a', { align: 'center' });
  SMENU.forEach(([label, key], k) => {
    const yy = y + 20 + k * 14, on = k === m.i; if (on) px.rect(g, x + 4, yy - 2, w - 8, 12, '#4a2a1a');
    txt(g, label, x + 10, yy, on ? '#ffffff' : '#c8b8a0');
    if (key) txt(g, key === 'padGlyphs' ? (S.padGlyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION') : Math.round(S[key] * 100) + '%', x + w - 10, yy, '#ffe08a', { align: 'right' });
  });
}

/* ---- the end of the round ---- */
scenes.sover = {
  touch: [],
  enter() { SC.so = { t: 0 }; },
  update(dt) { SC.so.t += dt; game.input.clear(); },
  draw(r) {
    if (W && NET.role !== 'server') drawWorld(r);
    r.overlay(g => {
      const d = SESS.ended || {}, W0 = r.W, H0 = r.H;
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W0, H0, '#05040a'));
      E.font.title(g, 'ROUND OVER', W0 / 2, H0 / 2 - 60, { scale: 3, colors: LOGO_COLORS, outline: '#120806', depth: 3, align: 'center' });
      const why = { void: 'The round did not count.', 'host-left': 'The host left the round.', 'sat-out': 'You sat this round out.', 'session-ended': 'The session has ended.' }[d.reason];
      if (why) otxt(g, why, W0 / 2, H0 / 2 - 22, '#f0e0c8', { align: 'center' });
      const st = (d.standings || []).flat();
      st.slice(0, 4).forEach((id, k) => { const h = PARTY.find(p => p.netId === id); if (h) otxt(g, (k + 1) + '. ' + h.netName.replace(/[^\x20-\x7E]/g, '?').slice(0, 14) + '  ' + h.score, W0 / 2, H0 / 2 + k * 12, h.color, { align: 'center' }); });
    });
  }
};

// ---- 50-view.js ----
/* 50-view: drawing a floor from W (the sim's, or a client's puppets): floor and walls, torches and props, features,
 * items, generators, monsters, heroes, shots, the King, lights; and the effects the happenings make. */

const RIGS = new Map();          // id -> { rig, key }
const VIEWT = { last: 0, dt: 1 / 60 };
const ITEM_SPR = it => it.kind === 'special' ? SPR.special[it.sub] : it.kind === 'amulet' ? SPR.amulet[it.sub] : SPR[it.kind];
function rigFor(id, key, make) { let e = RIGS.get(id); if (!e || e.key !== key) { e = { rig: make(), key }; RIGS.set(id, e); } e.seen = game.real; return e.rig; }
function atk(name, t, spec) {
  const s = spec || E.MOVES[name]; if (!s) return null;
  const w = s.wind, a = s.active, rc = s.recover;
  if (t < 0 || t > w + a + rc) return null;
  return t < w ? { spec: E.move(name).spec, phase: 'wind', u: t / w } : t < w + a ? { spec: E.move(name).spec, phase: 'active', u: (t - w) / a } : { spec: E.move(name).spec, phase: 'recover', u: (t - w - a) / rc };
}
const BOW = { name: 'bowdraw', rel: true, hand: 'both', a0: .05, a1: 0, z0: 1, z1: 1, r0: 2, r1: 6, wind: .08, active: .05, recover: .14, lunge: 0, lean: .1, blade: 0 };

/* ---- decoration: torches on wall faces, realm props against walls, decided once per floor from a hash ---- */
function decorate() {
  if (W.deco) return W.deco;
  const map = W.map, rm = REALMS[W.realm] || REALMS.larder, deco = { torches: [], props: [], lava: [] };
  const busy = new Set([...W.p.items, ...W.p.mons, ...W.p.gens, ...W.p.exits, ...W.p.pads, ...W.p.runes, ...W.p.spikes, ...W.p.beams, ...W.p.plates, ...W.p.starts].map(e => e.cx + ',' + e.cy));
  for (let cy = 1; cy < map.h - 1; cy++) for (let cx = 1; cx < map.w - 1; cx++) {
    const c = map.cell(cx, cy), hsh = E.hash2(cx * 3 + 1, cy * 7 + 2);
    if (c === 1 && map.cell(cx, cy + 1) === 0 && hsh < .17) deco.torches.push({ x: (cx + .5) * T, y: (cy + 1) * T + 1, z: 14, cx, cy });
    if (c === 0 && !busy.has(cx + ',' + cy) && W.p.rows[cy][cx] === '.') {
      const walls = [[0, -1], [-1, 0], [1, 0], [0, 1]].filter(([dx, dy]) => map.cell(cx + dx, cy + dy) === 1);
      if (walls.length >= 1 && hsh > .93) { const [dx, dy] = walls[0]; deco.props.push({ name: rm.props[Math.floor(E.hash2(cx, cy) * rm.props.length)], x: (cx + .5 + dx * .28) * T, y: (cy + .5 + dy * .28) * T }); }
    }
    if (map.floorAt((cx + .5) * T, (cy + .5) * T) === 'lava' && hsh < .2) deco.lava.push({ x: (cx + .5) * T, y: (cy + .5) * T });
  }
  W.deco = deco;
  return deco;
}
const ringDots = (g, x, y, rx, ry, c, n) => { for (let k = 0; k < n; k++) { const a = k / n * TAU; px.dot(g, x + Math.cos(a) * rx, y + Math.sin(a) * ry, c); } };
const SHAPE_PROPS = new Set(['barrel', 'crate', 'sack', 'jar', 'pot', 'anvil']);

function drawWorld(r) {
  if (!W) return;
  const now = game.real; VIEWT.dt = clamp(now - VIEWT.last, 0, .1); VIEWT.last = now; const dt = VIEWT.dt, t = W.t;
  const map = W.map, rm = REALMS[W.realm] || REALMS.larder, deco = decorate();
  game.cam.bounds = v => map.bounds(v);
  map.drawFloor(r); map.queueWalls(r);
  // torches and props
  for (const tc of deco.torches) { if (!r.visible(tc.x, tc.y, tc.z)) continue; r.prop('torch', tc.x, tc.y, tc.z, { light: true, color: rm.torch }); L.add(tc.x, tc.y + 10, 16, 70, .9, { color: rm.torch }); }
  for (const p of deco.props) { if (!r.visible(p.x, p.y, 0)) continue; if (SHAPE_PROPS.has(p.name)) r.shape(p.name, p.x, p.y, 0, { scale: .6 }); else r.prop(p.name, p.x, p.y, 0, { size: .8, light: p.name === 'candelabra' }); }
  for (const lv of deco.lava) L.add(lv.x, lv.y, 2, 40, .7, { color: '#ff6a1a' });
  if (W.realm === 'banquet') for (const x of [8, 22, 36]) { r.prop('chandelier', x * T, 12 * T, 40, { light: true }); L.add(x * T, 12 * T, 20, 120, 1, { color: '#ffd070' }); }
  // features
  for (const p of W.pads) r.decal(g => { const [sx, sy] = r.w(p.x, p.y, 0); for (let k = 0; k < 6; k++) { const a = t * 3 + k / 6 * TAU; px.dot(g, sx + Math.cos(a) * 5, sy + Math.sin(a) * 3, '#8affee'); } });
  for (const p of W.pads) L.add(p.x, p.y, 4, 30, .6, { color: '#4ae0d0' });
  const bs = beamOn(t);
  for (const b of W.beams) r.queue(b.x, b.y, 0, g => {
    if (bs === 'off') return; if (bs === 'flicker' && Math.floor(t * 20) % 2) return;
    const [x0, y0] = b.dir === 'v' ? r.w(b.x, b.y - 8, 2) : r.w(b.x - 8, b.y, 2), [x1, y1] = b.dir === 'v' ? r.w(b.x, b.y + 8, 2) : r.w(b.x + 8, b.y, 2);
    px.glow(g, 1); for (let k = 0; k < 3; k++) px.line(g, x0, y0 - k * 4, x1, y1 - k * 4, k === 1 ? '#ffffff' : '#7ab8ff'); px.glow(g, 0);
  }, { emissive: true });
  if (bs === 'on') for (const b of W.beams) L.add(b.x, b.y, 6, 30, .8, { color: '#7ab8ff' });
  for (const sp of W.spikes) { const st = spikeUp(sp, t); if (st === 'down') continue; r.queue(sp.x, sp.y, 0, g => { const [sx, sy] = r.w(sp.x, sp.y, 0), j = st === 'tremble' ? Math.sin(t * 80) : 0; for (const [dx, dy] of [[-4, -3], [0, -3], [4, -3], [-2, 1], [2, 1], [-4, 4], [0, 4], [4, 4]]) { const hgt = st === 'up' ? 5 : 1; px.line(g, sx + dx + j, sy + dy, sx + dx + j, sy + dy - hgt, '#d8dce8'); px.dot(g, sx + dx + j, sy + dy - hgt, '#ffffff'); } }); }
  for (const p of W.plates) if (p.used) r.decal(g => { const [sx, sy] = r.w(p.x, p.y, 0); px.rect(g, sx - 5, sy - 3, 10, 6, '#3a3a44'); });
  for (const e of W.exits) if (e.to) r.queue(e.x, e.y, 0, g => { const [sx, sy] = r.w(e.x, e.y, 0); otxt(g, String(e.to), sx, sy - 4, '#ffe08a', { align: 'center' }); });
  for (const e of W.exits) L.add(e.x, e.y, 2, 40, .7, { color: '#ffe0a0' });
  if (W.stage >= 3) for (const tc of deco.torches) L.add(tc.x, tc.y, 4, 30, .4, { color: '#ffe08a' });
  // items
  for (const it of W.items) {
    if (it.hideT > game.real) continue;
    if (!r.visible(it.x, it.y, 0)) continue;
    const bob = Math.sin(t * 3 + it.id) * 1.2, z = it.onTable ? 10 : 0;
    if (it.kind === 'chest' || it.kind === 'lchest') { r.shadow(it.x, it.y, 7, .35); r.prop('chest', it.x, it.y, 0, { size: .8, color: it.kind === 'lchest' ? '#5a5a6a' : undefined }); if (it.kind === 'lchest') r.sprite(it.x, it.y + 1, 7, SPR.lock, { anchor: 'center' }); continue; }
    const sp = ITEM_SPR(it); if (!sp) continue;
    if (!it.onTable) r.shadow(it.x, it.y, 4, .3);
    const glow = it.kind === 'special' || it.kind === 'amulet' || it.kind === 'gem' || it.kind === 'crown' || it.kind === 'gauntlet' || it.kind === 'flask';
    r.sprite(it.x, it.y, z + 2 + (it.kind === 'bell' ? 0 : bob + 2), sp, { anchor: 'bottom', glow });
    if (glow) L.add(it.x, it.y, 6, 24, .5, { color: it.kind === 'gauntlet' ? '#ffe06a' : '#c8e0ff' });
    if (it.hover) r.queue(it.x, it.y, 20, g => { const [sx, sy] = r.w(it.x, it.y, 22); otxt(g, get('items', it.kind).name, sx, sy - 6, '#ffe08a', { align: 'center' }); });
  }
  // generators
  for (const g of W.gens) if (r.visible(g.x, g.y, 0)) { drawGen(r, g, t); if (g.type === 'grate') L.add(g.x, g.y, 4, 40, .8, { color: '#ff7a2a' }); }
  // monsters
  for (const m of W.mons) {
    if (!r.visible(m.x, m.y, 0)) continue;
    const em = m.emerge > 0 ? m.emerge / .4 : 0, z = m.D.fly ? 6 + Math.sin(t * 3 + m.id) * 2 : -em * 14;
    if (m.type === 'fryar' && m.vis < .5) { if (Math.floor(t * 8 + m.id) % 3 === 0) r.shadow(m.x, m.y, 4, .15); continue; }
    r.shadow(m.x, m.y, m.type === 'tithe' ? 7 : 5, .35);
    const flash = m.hurtT > 0 ? '#ffffff' : null;
    if (m.type === 'ghost') {
      const near = PARTY.some(h => h.alive && Math.hypot(h.x - m.x, h.y - m.y) < 40); m.mouth = lerp(m.mouth || 0, near ? 1 : .1, .1);
      r.actor(m.x, m.y, z, (g, ox, oy) => drawShade(g, ox, oy, m, t, 1), { flash, every: 1, key: m });
      continue;
    }
    const rig = rigFor(m.id, m.type + m.rank, () => monsterRig(m.type, m.rank));
    if (!rig) continue;
    let attack = null;
    if (m.wind > 0 && m.D.move) attack = { spec: E.move(m.D.move).spec, phase: 'wind', u: clamp(1 - m.wind / (m.D.wind || .3), 0, 1) };
    else if (m.swingT !== undefined && m.D.move && W.t - m.swingT < .35) attack = atk(m.D.move, .3 + (W.t - m.swingT));
    else if (m.type === 'lobber' && m.swingT !== undefined && W.t - m.swingT < .5) attack = atk('throw', W.t - m.swingT);
    const st = { x: m.x, y: m.y, z: Math.max(0, z), vx: m.vx, vy: m.vy, facing: m.face, attack, hurt: m.hurtT > 0 };
    if (m.type === 'imp') { rig.update(dt, { squash: Math.sin(t * 10 + m.id) * .15, look: [Math.cos(m.face), Math.sin(m.face)], walk: Math.min(1, Math.hypot(m.vx, m.vy) / 30), flap: .7 }); }
    else rig.update(dt, st);
    const shrink = m.shrink > 0 ? 1 - m.shrink * .6 : 1;
    r.actor(m.x, m.y, Math.max(0, z), (g, ox, oy) => { rig.draw(g, ox, oy, r.view); if (m.type === 'imp' && m.spit > 0) { px.glow(g, 1); px.disc(g, ox, oy - 8, 2, '#ffd84a'); px.glow(g, 0); } }, { flash, every: W.mons.length > 60 ? 3 : 1, key: m, alpha: m.type === 'tithe' ? .85 : undefined });
    void shrink;
    if (m.type === 'tithe') L.add(m.x, m.y, 20, 50, .6, { color: '#ff3a3a' });
    if (m.type === 'imp') L.add(m.x, m.y, 8, 26, .5, { color: '#ff7a2a' });
    if (m.wind > 0 || m.spit > 0) r.decal(g => { const [sx, sy] = r.w(m.x, m.y, 0); ringDots(g, sx, sy, (m.r + 4) * r.view.scale, (m.r + 4) * r.view.scale * .5, '#ff4a3a', 14); });
    if (CHEAT.hitboxes) r.decal(g => { const [sx, sy] = r.w(m.x, m.y, 0); px.ell(g, sx, sy, m.r * 1.5, m.r, '#ff00ff'); });
  }
  // the King
  if (W.boss) drawBoss(r, W.boss, dt, t);
  // heroes
  for (const h of PARTY) {
    if (h.joinPick) continue;
    const rig = rigFor('h' + h.pi, h.cls, () => h.D.rig());
    r.decal(g => { const [sx, sy] = r.w(h.x, h.y, 0); ringDots(g, sx, sy, 8, 4, h.color, 22); });
    r.shadow(h.x, h.y, 6, .4);
    let attack = null, pose = null;
    if (h.swing && W.t - h.swing.t0 < h.swing.dur / .9 + .05) attack = atk(h.swing.move, (W.t - h.swing.t0) / .9);
    else if (W.t - h.throwT < .3) attack = h.D.throwMove === 'bow' ? { spec: BOW, phase: W.t - h.throwT < .08 ? 'wind' : W.t - h.throwT < .13 ? 'active' : 'recover', u: .5 } : atk(h.D.throwMove, (W.t - h.throwT) * 1.4);
    if (!h.alive) pose = 'die';
    else if (W.done && W.done.ending) pose = 'cheer';
    else if (h.stun > 0) pose = 'guard';
    if (h.lastMagic && game.real - h.lastMagic < .5) pose = 'cast';
    const hunger = h.hp < 200 ? (200 - h.hp) / 200 : 0;
    rig.o.hunch = (h.cls === 'hexer' ? .3 : 0) + hunger * .4;
    rig.update(dt, { x: h.x, y: h.y, z: 0, vx: h.vx, vy: h.vy, facing: h.plant || h.firing ? h.aim : h.face, attack, pose, hurt: h.hurtT > 0, expr: h.hurtT > 0 ? 'wince' : h.queasy > 0 ? 'wince' : null, run: 0 });
    const inv = h.inv > 0 && Math.floor(game.real * 12) % 2 === 0;
    const veil = h.amulet === 'veil';
    r.actor(h.x, h.y, W.done && !W.done.ending && !W.done.hoard && W.done.by === h.pi ? -Math.min(14, W.doneT * 20) : 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: { color: h.color, actors: true }, flash: h.hurtT > 0 ? '#ff4a3a' : inv ? '#ffffff' : null, flashMix: .5, alpha: veil ? .45 : undefined });
    L.add(h.x, h.y, 16, 60, .55, { color: '#ffe0b0' });
    if (h.amulet === 'ironskin') L.add(h.x, h.y, 10, 30, .7, { color: '#ffd84a' });
    if (h.amulet === 'stench' && Math.random() < .2) P.add({ kind: 'dust', x: h.x + (Math.random() - .5) * 10, y: h.y, z: 10, vz: 10, life: .8, max: .8, color: '#7ad04a', size: 2 });
    if (h.stairT > 0) r.queue(h.x, h.y, 0, g => { const [sx, sy] = r.w(h.x, h.y, 0), f = clamp(h.stairT / Math.max(.01, TUNE.stairHold), 0, 1); for (let k = 0; k < 24 * f; k++) { const a = -Math.PI / 2 + k / 24 * TAU; px.dot(g, sx + Math.cos(a) * 10, sy + Math.sin(a) * 6, '#ffe08a'); } });
    if (S.names && PARTY.length > 1 || SESSION) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 44); txt(g, SESSION && h.netName ? h.netName.replace(/[^\x20-\x7E]/g, '?').slice(0, 10) : 'P' + (h.pi + 1), sx, sy - 4, h.color, { align: 'center', font: 'tiny' }); });
    if (h.menu > 0) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 46); px.sprite(g, SPR.bell, sx - 4, sy - 16 + Math.sin(t * 8) * 1); });
    if (CHEAT.hitboxes) r.decal(g => { const [sx, sy] = r.w(h.x, h.y, 0); px.ell(g, sx, sy, h.r * 1.5, h.r, '#00ffff'); });
  }
  // shots
  for (const s of W.shots) {
    if (s.kind === 'crock' || s.kind === 'plate') {   // a lob: its landing marked by a shadow ahead
      if (s.tx !== undefined && (s.land - W.t) < .6) r.decal(g => { const [sx, sy] = r.w(s.tx, s.ty, 0); px.blend(g, .5, 'normal', () => px.ell(g, sx, sy, 6, 3, '#000000')); px.ell(g, sx, sy, 7, 3.5, '#ff4a3a'); });
      r.sprite(s.x, s.y, Math.max(0, s.z), s.kind === 'plate' ? SPR.plate : SPR.crock, { anchor: 'center', rot: s.rot });
      continue;
    }
    const spr = s.kind === 'fireball' ? SPR.fireball : SPR['shot_' + s.kind] || SPR.shot_hex;
    const rot = s.kind === 'axe' ? s.rot : Math.atan2(s.vy, s.vx);
    r.sprite(s.x, s.y, s.z, spr, { anchor: 'center', rot, glow: s.kind === 'hex' || s.kind === 'fireball' });
    if (s.kind === 'fireball') L.add(s.x, s.y, 8, 30, .9, { color: '#ff8a2a' });
    if (s.kind === 'hex') L.add(s.x, s.y, 8, 20, .6, { color: '#c86af0' });
  }
  if (CHEAT.flow && W.field) r.decal(g => { const F = W.field; for (let cy = 0; cy < F.h; cy++) for (let cx = 0; cx < F.w; cx++) { const d = F.d[cy * F.w + cx]; if (d >= 1e9) continue; const [sx, sy] = r.w((cx + .5) * T, (cy + .5) * T, 0); px.dot(g, sx, sy, d % 4 === 0 ? '#ffff00' : '#ff8800'); } });
  // drop rigs for ids gone a while
  if (Math.random() < .02) for (const [k, e] of RIGS) if (game.real - e.seen > 5) RIGS.delete(k);
}
function drawBoss(r, B, dt, t) {
  if (!B.alive && B.state === 'dead' && (B.deadT = (B.deadT || 0) + dt) > 4) return;
  const rig = rigFor('king', 'king', () => monsterRig('king', 3));
  let attack = null, pose = null;
  if (B.state === 'stomp' || B.state === 'stompwind') attack = { spec: E.move('overhead').spec, phase: 'wind', u: .8 };
  if (B.throwAt && W.t - B.throwAt < .5) attack = atk('throw', W.t - B.throwAt);
  if (B.state === 'eat') pose = 'kneel'; if (B.state === 'roar') pose = 'cheer'; if (!B.alive) pose = 'die';
  if (B.intro > 0) pose = 'hips';
  rig.update(dt, { x: B.x, y: B.y, z: 0, vx: B.vx, vy: B.vy, facing: B.face, attack, pose, hurt: B.hurtT > 0, expr: B.state === 'roar' ? 'shout' : null });
  r.shadow(B.x, B.y, 16, .45);
  r.actor(B.x, B.y, 0, (g, ox, oy) => {
    rig.draw(g, ox, oy, r.view);
    if (B.phase === 3 && B.alive) { const c = rig.worldOffset ? rig.worldOffset(rig.J.chest || rig.J.shC) : [0, 0, 30]; const [sx, sy] = [ox + (c[0] || 0) * 0, oy - (c[2] || 30) * (r.view.bz ? -r.view.bz : .8)]; px.glow(g, 1); px.sprite(g, SPR.gauntlet, sx - 5, sy - 6); px.glow(g, 0); }
  }, { flash: B.hurtT > 0 ? '#ffffff' : null });
  B.hurtT = Math.max(0, (B.hurtT || 0) - dt);
  if (B.state === 'chargeWind') r.decal(g => { const [x0, y0] = r.w(B.x, B.y, 0), [x1, y1] = r.w(B.x + Math.cos(B.chargeA) * 160, B.y + Math.sin(B.chargeA) * 160, 0); px.line(g, x0, y0, x1, y1, Math.floor(t * 16) % 2 ? '#ff4a3a' : '#ffd84a', 2); });
  if (B.state === 'stomp') r.decal(g => { const [sx, sy] = r.w(B.x, B.y, 0); px.ell(g, sx, sy, 44 * r.view.scale, 22 * r.view.scale, '#ff4a3a'); });
  if (B.fogAt && W.t < B.fogAt.until) { for (let k = 0; k < 3; k++) { const a = B.fogAt.a + (Math.random() - .5) * 1, d = Math.random() * 100; P.add({ kind: 'smoke', x: B.fogAt.x + Math.cos(a) * d, y: B.fogAt.y + Math.sin(a) * d, z: 6, vz: 4, life: 1.2, max: 1.2, color: '#6a8a4a', size: 6 }); } }
  L.add(B.x, B.y, 30, 90, .8, { color: B.phase === 3 ? '#ffd84a' : '#c86af0' });
}

/* ---- effects from happenings (view only) ---- */
const at3 = (d, z = 10) => [d.x, d.y, z];
bus.on('kill', d => { if (!W) return; const c = { ghost: '#c8d0e0', gnasher: '#7a9a5a', lobber: '#e8e4dc', imp: '#ff6a1a', fryar: '#5a3a2a', snatcher: '#a88a5a', tithe: '#e8e0d0' }[d.type] || '#ffffff'; if (d.type === 'imp') P.explosion(d.x, d.y, 8, .5, { shake: 1, flash: false, sound: false }); else P.bits(...at3(d), 8, [c, E.shade(c, -.3)]); P.smoke(...at3(d, 6), 3, { size: 3 }); if (d.pts && d.by >= 0) P.text(d.x, d.y, 24, String(d.pts), '#ffe08a'); });
bus.on('monhit', d => P.sparks(...at3(d), 3));
bus.on('melee', d => { game.hitFx(d.x, d.y, 12, { power: .6, angle: d.a, sound: false, rumble: true }); });
bus.on('shothit', d => P.impact(d.x, d.y, 12, 4, d.kind === 'hex' ? '#c86af0' : '#ffe070'));
bus.on('shotwall', d => P.sparks(d.x, d.y, 12, 3, null, { color: d.kind === 'fireball' ? '#ff8a2a' : '#ffe8a0' }));
bus.on('genhit', d => { P.bits(d.x, d.y, 10, 3, ['#8a7a6a', '#5a4a3a']); P.text(d.x, d.y, 26, String(Math.round(d.dmg)), '#ff8a6a', { bounce: true }); });
bus.on('gen', d => { P.explosion(d.x, d.y, 6, .8, { debris: ['#6a5a4a', '#8a7a6a'], sound: false, flash: false }); game.shake(3); });
bus.on('spawn', d => P.dust(d.gx, d.gy, 2, 4, { color: '#8a7a6a' }));
bus.on('hurt', d => { P.sparks(d.x, d.y, 12, 4, null, { color: '#ff4a3a' }); const h = PARTY[d.pi]; if (h && h.input && h.input.rumble) h.input.rumble(.4, .12); if (h && !h.remote) game.flash('#ff2a1a', .05, .25); });
bus.on('gone', d => { if (!W) return; if (d.shot) { P.bits(d.x, d.y, 6, 6, ['#c87a3a', '#f0c890', '#8a4a26']); return; } P.glints(d.x, d.y, 8, 5); const D = get('items', d.kind); if (D && D.pts && d.by >= 0) P.text(d.x, d.y, 18, '+' + D.pts, '#ffe08a'); if (D && D.food && PARTY[d.by]) { P.text(d.x, d.y, 26, '+' + Math.round(D.heal * TUNE.foodHeal), '#7ae87a'); P.bits(d.x, d.y, 8, 5, ['#d8844a', '#f0c890']); const rg = RIGS.get('h' + d.by); if (rg && rg.rig.kick) rg.rig.kick(.35); } if (d.kind === 'chest' || d.kind === 'lchest') P.bits(d.x, d.y, 8, 10, ['#ffe06a', '#c8901a']); });
bus.on('magic', d => { game.flash('#ffffff', .15, .8); game.shake(5); P.ring(d.x, d.y, 4, Math.max(d.hw, d.hh), '#c8e8ff', .5); P.glints(d.x, d.y, 20, 12, '#ffffff', 60); const h = PARTY[d.pi]; if (h) h.lastMagic = game.real; });
bus.on('door', d => { if (!W) return; const g = W.doorGroups[d.g]; if (g) for (const c of g.cells) { P.dust(c.x, c.y, 4, 5); P.sparks(c.x, c.y, 16, 3); } });
bus.on('wall', d => { P.bits(d.x, d.y, 12, 12, ['#8a7a6a', '#5a4a3a']); P.dust(d.x, d.y, 4, 8); game.shake(2); });
bus.on('crack', d => P.bits(d.x, d.y, 14, 3, ['#8a7a6a']));
bus.on('trap', () => { game.shake(4); if (W) for (const c of [...W.p.trapT, ...W.p.trapY]) P.dust(c.x, c.y, 4, 6); });
bus.on('secret', d => { P.glints(d.x, d.y, 12, 10, '#c8e8ff'); });
bus.on('tele', d => { P.ring(d.x, d.y, 2, 14, '#8affee', .4); P.ring(d.tx, d.ty, 14, 2, '#8affee', .4); });
bus.on('stun', d => P.glints(d.x, d.y, 26, 6, '#c86af0'));
bus.on('crockbreak', d => { P.bits(d.x, d.y, 2, 6, d.kind === 'plate' ? ['#f4f0e8', '#c8c0b0'] : ['#8a5a3a', '#c88a5a']); P.dust(d.x, d.y, 2, 3); });
bus.on('fall', d => { for (let k = 0; k < 8; k++) P.add({ kind: 'glint', x: d.x, y: d.y, z: 10 + k * 3, vz: 20, life: 1.5, max: 1.5, color: '#c8d8ff', size: 2 }); });
bus.on('rise', d => { P.glints(d.x, d.y, 14, 12, '#ffe08a'); P.ring(d.x, d.y, 2, 16, '#ffe08a', .4); });
bus.on('drain', d => { if (Math.random() < .5) P.add({ kind: 'spark', x: d.x, y: d.y, z: 14, vx: (d.mx - d.x) * 2, vy: (d.my - d.y) * 2, vz: 10, life: .4, max: .4, color: '#ff3a3a', size: 1 }); });
bus.on('blink', d => P.smoke(d.x, d.y, 8, 4, { size: 4, color: '#5a5a6a' }));
bus.on('bell', d => { P.ring(d.x, d.y, 4, 60, '#ffe06a', .6); game.shake(2); });
bus.on('rankdown', d => P.smoke(d.x, d.y, 10, 2, { size: 2 }));
bus.on('bosshit', d => { P.text(d.x, d.y, 50, String(d.dmg), '#ffd84a', { bounce: true }); P.sparks(d.x, d.y, 30, 4); });
bus.on('king', d => { if (d.what === 'stomp') { game.shake(d.small ? 3 : 7); if (!d.small) P.ring(d.x, d.y, 6, 46, '#ff8a4a', .4); P.dust(d.x, d.y, 2, 10); } if (d.what === 'dead') { P.explosion(d.x, d.y, 20, 1.6, { debris: ['#e8dcc0', '#c8b8a0'], sound: false }); game.flash('#ffffff', .3, 1); } if (d.what === 'gulp') P.bits(d.x, d.y, 12, 8, ['#d8844a', '#f0c890']); });
bus.on('stairs', () => { if (W && W.done && W.done.at) P.glints(W.done.at.x, W.done.at.y, 10, 10); });
bus.on('wallsglow', () => game.flash('#ffe08a', .2, .4));

// ---- 51-hud.js ----
/* 51-hud: canvas pixel-art HUD anchored to r.W / r.H, clear of the corner buttons: a panel per player (portrait, class,
 * health as a big number, score, keys, flasks, amulet timer, specials), captions, the floor's name, timers, arrows to
 * the stairs and to allies, the reticle; and the floor card and the title's backdrop. */

const PORTRAITS = new Map();
function drawHUD(r) {
  if (!W) return;
  const big = S.hudSize === 'large', n = Math.max(1, PARTY.length), corner = game.cornerArea(), maxW = corner ? corner.x0 - 4 : r.W;
  const pw = Math.min(big ? 130 : 108, Math.floor((maxW - 4) / Math.max(n, SESSION ? n : n < 4 && !SC.play.attract ? n + 1 : n))), ph = big ? 40 : 34;
  r.overlay(g => {
    PARTY.forEach((h, i) => drawPanel(g, h, 2 + i * (pw + 2), 2, pw, ph, big));
    if (!SESSION && !SC.play.attract && PARTY.length < 4) { const x = 2 + PARTY.length * (pw + 2); if (x + pw <= maxW) { const a = .5 + .5 * Math.sin(game.real * 4); E.ui.box(g, x, 2, pw, ph, { bg: ['#1a1410', '#0a0806'], border: '#4a3a2a', alpha: .6 }); txt(g, 'PRESS', x + pw / 2, 9, a > .5 ? '#c8b8a0' : '#8a7a60', { align: 'center' }); otxt(g, 'Options / 2', x + pw / 2, 18, '#e8c890', { align: 'center' }); txt(g, 'TO JOIN', x + pw / 2, 27, '#c8b8a0', { align: 'center' }); } }
    // the floor's name, the hoard clock, the round clock
    const top = ph + 6;
    if (!SESSION) otxt(g, (W.no ? 'FLOOR ' + W.no + (RUN.loop > 1 ? ' (DESCENT ' + 'I'.repeat(RUN.loop) + ')' : '') + ': ' : '') + W.fd.name, r.W / 2, top, '#e8c890', { align: 'center' });
    if (W.hoard) E.font.title(g, String(Math.max(0, Math.ceil(W.hoard.t))), r.W / 2, top + 12, { scale: 3, colors: ['#ffffff', '#ffd36a', '#c87a2a'], outline: '#120806', depth: 2, align: 'center' });
    if (SESSION && HUB && SESS.info) {
      const left = Math.max(0, (SESS.info.limitMs || 360000) - Math.max(0, HUB.time())), m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
      otxt(g, m + ':' + String(s).padStart(2, '0'), r.W / 2, top, left < 30000 ? '#ff6a4a' : '#ffe08a', { align: 'center', scale: 2 });
      const sorted = PARTY.slice().sort((a, b) => b.score - a.score);
      sorted.forEach((h, k) => txt(g, (h.netName || '').replace(/[^\x20-\x7E]/g, '?').slice(0, 10) + ' ' + h.score, r.W - 6, top + 4 + k * 9, h.color, { align: 'right' }));
    }
    if (W.stage >= 1 && !W.hoard && !W.boss && W.stage < 3) txt(g, W.stage === 1 ? 'THE GAUNT GROWS IMPATIENT' : 'ALL DOORS OPEN', r.W / 2, top + 10, '#ff9a6a', { align: 'center' });
    if (W.stage >= 3) txt(g, 'EVERY WALL IS A STAIR: PUSH INTO ONE', r.W / 2, top + 10, '#ffe08a', { align: 'center' });
    // the King's bar
    if (W.boss && W.boss.alive && W.boss.intro <= 0) { const bw = Math.min(260, r.W - 40), bx = (r.W - bw) / 2, by = r.H - 36; otxt(g, 'KING FAMISH', r.W / 2, by - 9, '#e8c04a', { align: 'center' }); px.rect(g, bx - 1, by - 1, bw + 2, 7, '#000000'); E.ui.bar(g, bx, by, bw, 5, W.boss.hp / W.boss.maxHp, W.boss.phase === 3 ? '#ffd84a' : W.boss.phase === 2 ? '#e8843a' : '#c83a3a'); }
    // captions
    if (S.captions && NARR.cur) {
      const lines = E.font.wrap(NARR.cur.text, Math.min(r.W - 40, 380), {}).slice(0, 2), sc = r.W > 600 ? 2 : 1, y = r.H - 18 - lines.length * 9 * sc - (W.boss && W.boss.alive ? 20 : 0) - (SC.play.attract ? 22 : 0);
      lines.forEach((l, k) => otxt(g, l, r.W / 2, y + k * 9 * sc, NARR.cur.pri >= 3 ? '#ffe08a' : NARR.cur.pri === 1 ? '#c8e0ff' : '#f0e8d8', { align: 'center', scale: sc }));
    }
    // arrows: to the stairs once found (or once the Gaunt grows impatient), to allies off screen in sessions
    const me = PARTY.find(h => h.local) || PARTY[0];
    if (me && (W.stairsSeen || W.stage >= 1)) for (const e of W.exits.filter(e => !e.to).slice(0, 1)) edgeArrow(g, r, e.x, e.y, '#ffe08a', 'EXIT');
    if (SESSION && me) for (const h of PARTY) if (h !== me && h.alive) edgeArrow(g, r, h.x, h.y, h.color, '');
    // the reticle, where the mouse aims
    const I = game.input, mg = game.mouseGround && I.aimSource === 'mouse' && I.mouse && I.clock - (I.mouse.t || -9) < 3 ? I.pointer() : null;
    if (mg && PARTY[0] && PARTY[0].input === I) { const [x, y] = mg; px.rect(g, x - 4, y, 3, 1, '#ffffff'); px.rect(g, x + 2, y, 3, 1, '#ffffff'); px.rect(g, x, y - 4, 1, 3, '#ffffff'); px.rect(g, x, y + 2, 1, 3, '#ffffff'); hoverName(g, r, x, y); }
    if (anyCheat() && !SC.play.attract) { px.rect(g, r.W - 30, r.H - 12, 28, 10, '#a01a1a'); txt(g, 'DEV', r.W - 16, r.H - 10, '#ffffff', { align: 'center' }); }
    if (CHEAT.net || SESSION && CHEAT.net) { const s = NET.stats(); txt(g, s.role + ' sent ' + s.sent + ' recv ' + s.received + ' snap ' + s.lastSnapshotBytes + 'B max ' + s.maxSnapshotBytes + 'B peak ' + s.peak + '/s', 4, r.H - 20, '#7ae8e8'); }
    if (CHEAT.bot) PARTY.forEach((h, i) => { if (h.bot) txt(g, 'P' + (i + 1) + ' bot: ' + h.bot.think, 4, ph + 18 + i * 9, '#7ae8e8'); });
    if (SC.play.attract) drawDemoBanner(g, r);
    for (const h of PARTY) if (h.joinPick) drawJoinPick(g, r, h, 2 + h.pi * (pw + 2), ph + 4, pw);
  });
}
function drawPanel(g, h, x, y, w, ht, big) {
  E.ui.box(g, x, y, w, ht, { bg: [h.alive ? '#24180f' : '#1a0a0a', '#0a0604'], border: h.color, alpha: .82 });
  const rig = RIGS.get('h' + h.pi);
  px.disc(g, x + 12, y + 12, 9, h.color); px.disc(g, x + 12, y + 12, 8, '#1a1010');
  if (rig && rig.rig.drawPortrait) try { rig.rig.drawPortrait(g, x + 4, y + 4, 16, { zoom: 2.4, turn: .4, tint: h.alive ? undefined : '#808080', cape: false, weapon: false }); } catch (e) { /* portrait while posing */ }
  txt(g, (SESSION && h.netName ? h.netName.replace(/[^\x20-\x7E]/g, '?').slice(0, 10) : h.D.name), x + 24, y + 3, h.color);
  if (!h.alive) {
    otxt(g, SESSION ? 'RISING...' : 'RISE: ' + (h.input ? h.input.label('fire') : 'FIRE'), x + 24, y + 13, Math.floor(game.real * 3) % 2 ? '#ffe08a' : '#c8a060');
  } else {
    const hc = h.hp < 200 ? (Math.floor(game.real * 4) % 2 ? '#ff3a2a' : '#ffb0a0') : h.hp < 400 ? '#ffe04a' : '#ffffff';
    otxt(g, fmt(h.hp), x + 24, y + 11, hc, { scale: 2 });
  }
  txt(g, String(h.score), x + w - 4, y + 3, '#e8c890', { align: 'right' });
  // keys, flasks, the amulet with its timer, specials
  const yy = y + ht - 10;
  px.sprite(g, SPR.key, x + 4, yy + 1); txt(g, String(h.keys), x + 14, yy, '#ffe08a');
  px.sprite(g, SPR.flask, x + 24, yy - 2); txt(g, String(h.flasks), x + 32, yy, '#a8d0ff');
  if (h.amulet) { px.sprite(g, SPR.amulet[h.amulet], x + 42, yy - 1); txt(g, String(Math.ceil(h.amuletT)), x + 49, yy, AMULETS[h.amulet].color); }
  let sx = x + w - 6;
  for (const k of Object.keys(h.specials)) { px.rect(g, sx - 3, yy + 1, 4, 5, SPECIALS[k].color); sx -= 6; }
  if (h.menu > 0) txt(g, 'ON THE MENU', x + w - 4, y + 13, '#ffe06a', { align: 'right', font: 'tiny' });
  if (h.queasy > 0) txt(g, 'QUEASY', x + w - 4, y + 19, '#9ae84a', { align: 'right', font: 'tiny' });
  void big;
}
function drawJoinPick(g, r, h, x, y, w) {
  E.ui.box(g, x, y, Math.max(w, 120), 34, { bg: ['#2a1a14', '#100806'], border: h.color });
  otxt(g, '← ' + h.D.name + ' →', x + Math.max(w, 120) / 2, y + 6, h.color, { align: 'center' });
  txt(g, h.input.label('fire') + ' TO DROP IN', x + Math.max(w, 120) / 2, y + 20, '#e8d8c0', { align: 'center' });
}
function edgeArrow(g, r, wx, wy, color, label) {
  const [sx, sy] = r.w(wx, wy, 0), m = 16;
  if (sx > m && sx < r.W - m && sy > 44 && sy < r.H - m) return;
  const cx = r.W / 2, cy = r.H / 2, a = Math.atan2(sy - cy, sx - cx), ex = clamp(cx + Math.cos(a) * r.W, m, r.W - m), ey = clamp(cy + Math.sin(a) * r.H, 46, r.H - m);
  const p = (d, s) => [ex + Math.cos(a + s) * d, ey + Math.sin(a + s) * d];
  px.poly(g, [p(6, 0), p(6, 2.5), p(6, -2.5)], color);
  if (label) txt(g, label, ex - Math.cos(a) * 14, ey - Math.sin(a) * 10 - 3, color, { align: 'center', font: 'tiny' });
}
function hoverName(g, r, x, y) {
  const m0 = game.mouseGround(); if (!m0 || !isFinite(m0[0])) return; const mg = { x: m0[0], y: m0[1] };
  let best = null, bd = 14;
  for (const m of W.mons) { const d = Math.hypot(m.x - mg.x, m.y - mg.y); if (d < bd) { bd = d; best = { n: m.D.name + ' (RANK ' + m.rank + ')', e: m }; } }
  for (const gn of W.gens) { const d = Math.hypot(gn.x - mg.x, gn.y - mg.y); if (d < bd) { bd = d; best = { n: get('gens', gn.type).name + ' (RANK ' + gn.rank + ')', e: gn }; } }
  for (const it of W.items) { const d = Math.hypot(it.x - mg.x, it.y - mg.y); if (d < bd && d < 10) { bd = d; best = { n: it.kind === 'special' ? SPECIALS[it.sub].name : it.kind === 'amulet' ? 'AMULET: ' + AMULETS[it.sub].name : get('items', it.kind).name, e: it }; } }
  if (best) otxt(g, best.n, x, y + 8, '#ffe08a', { align: 'center', font: 'tiny' });
}

/* ---- the floor card ---- */
function drawFloorCard(r, c) {
  drawTitleBack(r, c.t, true);
  r.overlay(g => {
    const W0 = r.W, H0 = r.H, fd = c.fd;
    if (c.realm) {
      const [title, line] = STORY.realm[c.realm];
      E.font.title(g, title, W0 / 2, H0 * .2, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
      E.font.wrap(line, Math.min(W0 - 40, 360), {}).forEach((l, k) => otxt(g, l, W0 / 2, H0 * .2 + 26 + k * 10, '#f0e0c8', { align: 'center' }));
      // the party slides down the chute
      PARTY.forEach((h, k) => { const rg = h.chute || (h.chute = h.D.rig()), y = ((c.t * 60 + k * 30) % (H0 + 40)) - 20; rg.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer' }); rg.draw(g, W0 / 2 - 60 + k * 40, y, r.view); });
    } else {
      E.font.title(g, fd.hoard ? 'TREASURE ROOM' : 'FLOOR ' + fd.no, W0 / 2, H0 * .18, { scale: 4, colors: LOGO_COLORS, outline: '#120806', depth: 3, depthColor: '#3a1a0a', align: 'center' });
      otxt(g, fd.name, W0 / 2, H0 * .18 + 42, '#ffe08a', { align: 'center', scale: 2 });
      const line = LINES[fd.hoard ? 'hoard_' + fd.hoard : 'floor_' + fd.no] || '';
      otxt(g, line, W0 / 2, H0 * .18 + 64, '#f0e0c8', { align: 'center' });
      if (RUN.floorIdx > 0) PARTY.forEach((h, k) => { const x = W0 / 2 + (k - (PARTY.length - 1) / 2) * 96, y = H0 * .62; otxt(g, h.D.name, x, y, h.color, { align: 'center' }); txt(g, 'SCORE ' + h.score, x, y + 11, '#ffe08a', { align: 'center' }); txt(g, 'KILLS ' + h.stats.kills, x, y + 20, '#d8c8b0', { align: 'center' }); txt(g, 'TREASURE ' + h.stats.treasure, x, y + 29, '#d8c8b0', { align: 'center' }); });
      if (RUN.loop > 1) otxt(g, 'DESCENT ' + 'I'.repeat(RUN.loop), W0 / 2, 10, '#ff8a6a', { align: 'center' });
    }
    if (c.t > .8) txt(g, 'PRESS ' + game.input.label('fire') + ' TO DESCEND', W0 / 2, H0 - 16, Math.floor(game.real * 2) % 2 ? '#ffe08a' : '#c8a060', { align: 'center' });
  });
}

/* ---- the title's backdrop: an endless torch-lit shaft falling past the camera, the iron gauntlet tumbling down it ---- */
const SHAFT_RAMP = E.ramp('#5e3826', 8, .85), SHAFT_MORTAR = E.ramp('#2a160e', 4, .5);
const TITLE_RIGS = [];
function drawTitleBack(r, t, dim) {
  r.sky(['#080408', '#1a0c10', '#2a1410']);
  r.overlay(g => {
    const W0 = r.W, H0 = r.H, cx = W0 / 2, cy = H0 * .5, N = 10, sp = (t * .45) % 1;
    const ring = k => { const z = Math.pow(k, 2.4), s = 4 + z * Math.max(W0, H0) * 1.25; return { s, hx: s, hy: s * .7, z }; };
    // far to near: four wall trapezoids between each pair of rings, bricked, darker with depth
    for (let i = 0; i < N; i++) {
      const a = ring((i + sp) / N), b = ring((i + 1 + sp) / N), lit = clamp(Math.floor(Math.sqrt(b.z) * 6.5), 0, 7);
      const C = SHAFT_RAMP[lit], Cd = SHAFT_RAMP[Math.max(0, lit - 2)], M = SHAFT_MORTAR[clamp(Math.floor(b.z * 4), 0, 3)];
      const quad = (p) => px.poly(g, p, C);
      quad([[cx - a.hx, cy - a.hy], [cx + a.hx, cy - a.hy], [cx + b.hx, cy - b.hy], [cx - b.hx, cy - b.hy]]);   // ceiling
      px.poly(g, [[cx - a.hx, cy + a.hy], [cx + a.hx, cy + a.hy], [cx + b.hx, cy + b.hy], [cx - b.hx, cy + b.hy]], Cd);   // floor
      px.poly(g, [[cx - a.hx, cy - a.hy], [cx - b.hx, cy - b.hy], [cx - b.hx, cy + b.hy], [cx - a.hx, cy + a.hy]], SHAFT_RAMP[Math.max(0, lit - 1)]);
      px.poly(g, [[cx + a.hx, cy - a.hy], [cx + b.hx, cy - b.hy], [cx + b.hx, cy + b.hy], [cx + a.hx, cy + a.hy]], SHAFT_RAMP[Math.max(0, lit - 1)]);
      // mortar: the ring's edge and a course between, with staggered joints
      for (const [rx, ry] of [[a.hx, a.hy], [(a.hx + b.hx) / 2, (a.hy + b.hy) / 2]]) { px.rect(g, cx - rx, cy - ry, rx * 2, 1, M); px.rect(g, cx - rx, cy + ry, rx * 2, 1, M); px.rect(g, cx - rx, cy - ry, 1, ry * 2, M); px.rect(g, cx + rx - 1, cy - ry, 1, ry * 2, M); }
      for (let j = 1; j < 6; j++) { const f = j / 6 + (i % 2) * .08, x0 = cx - b.hx + f * b.hx * 2, x1 = cx - a.hx + f * a.hx * 2; px.line(g, x0, cy - b.hy, x1, cy - a.hy, M); px.line(g, x0, cy + b.hy, x1, cy + a.hy, M); }
      if (i % 2 === 1 && b.z > .02) for (const sd of [-1, 1]) {   // a torch on each side wall, with a halo
        const tx = cx + sd * (b.hx - Math.max(2, b.s * .04)), ty = cy - b.hy * .1, fs = Math.max(1, b.z * 6);
        px.blend(g, .35, 'add', () => px.disc(g, tx, ty, fs * 5, '#ff8a3a'));
        px.glow(g, 1); px.rect(g, tx - fs / 2, ty - fs * 1.6 - Math.sin(t * 11 + i) * fs * .3, fs, fs * 1.4, '#ffd36a'); px.rect(g, tx - fs / 4, ty - fs * 2.1, fs / 2, fs / 2, '#fff4c0'); px.glow(g, 0);
        px.rect(g, tx - fs / 3, ty, fs * .66, fs * 1.6, '#3a2418');
      }
    }
    px.blend(g, .8, 'normal', () => px.disc(g, cx, cy, 5, '#000000'));
    // embers rising past
    for (let k = 0; k < 40; k++) { const hx = E.hash2(k, 3), hy = E.hash2(k, 7), y = H0 - ((t * (20 + hy * 30) + hy * H0) % (H0 + 10)), x = hx * W0 + Math.sin(t + k) * 6; px.dot(g, x, y, k % 3 ? '#ff9a3a' : '#ffe08a'); }
    if (!dim) {
      const gy = ((t * 34) % (H0 + 60)) - 30, gx = W0 * .8 + Math.sin(t * .9) * 14;   // the gauntlet, tumbling down the shaft
      px.sprite(g, SPR.gauntletBig, gx, gy, { rot: t * 2.2 });
      // the four fools at the shaft's edge
      if (!TITLE_RIGS.length) for (const c of HERO_ORDER) TITLE_RIGS.push(get('heroes', c).rig());
      TITLE_RIGS.forEach((rg, k) => { rg.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2 + (k - 1.5) * .25, pose: k === 0 ? 'hips' : k === 3 ? 'cast' : null }); rg.draw(g, (k < 2 ? 26 + k * 34 : W0 - 26 - (3 - k) * 34), H0 - 18, r.view); });
    }
    if (dim) px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W0, H0, '#05030a'));
  });
}

// ---- 52-narrator.js ----
/* 52-narrator: the Gaunt's callout queue. Three priorities (3 critical, 2 event, 1 tip), at most one line every 1.2 s,
 * cooldowns per line (per hero for health lines), teaching tips once per game (remembered between games). Every line
 * shows as a big caption and is spoken in the narrator's deep gibberish. */
const NARR = {
  q: [], cur: null, gap: 0, cd: {}, said: new Set(), tips: new Set(store.get('tips', [])), last: null, log: [], quiet: false,
  reset(quiet) { this.q = []; this.cur = null; this.gap = 0; this.cd = {}; this.said = new Set(); this.quiet = !!quiet; },
  text(key, pi) {
    const h = pi >= 0 ? PARTY[pi] : null, base = LINES[key] || key;
    let who = h ? h.D.name : 'SOMEONE';
    if (h && SESSION && h.netName) who = h.netName.toUpperCase().replace(/[^\x20-\x7E]/g, '?') + ' THE ' + h.D.name;
    return base.replace('{C}', who).replace('{N}', String(Math.round(TUNE.hoardTime)));
  },
  enqueue(key, pi = -1, pri = 2) {
    if (key === 'welcome' && pi >= 0) key = 'welcome';
    const tip = TIP_KEYS.has(key);
    if (tip && (!S.tips || this.tips.has(key) || this.said.has(key))) return;
    const ck = /fading|starving|dying|tip_food/.test(key) ? key + pi : key;
    if (this.cd[ck] > 0) return;
    this.cd[ck] = /fading|starving|dying/.test(key) ? 20 : tip ? 9999 : key === 'eaten' || key === 'rise' ? 1 : 5;
    if (tip) { this.said.add(key); this.tips.add(key); if (!this.quiet) store.set('tips', [...this.tips]); }
    const line = { key, text: this.text(key, pi), pri: tip ? 1 : pri };
    if (this.cur && this.cur.pri < line.pri && this.cur.pri === 1) { this.cur = null; this.gap = 0; }
    this.q.push(line); this.q.sort((a, b) => b.pri - a.pri);
    if (this.q.length > 4) this.q.length = 4;
  },
  // a line in another voice (King Famish), captioned with the speaker's name
  speakAs(text, who, name) { if (!text) return; this.cur = { key: 'as', text: name + ': ' + text, pri: 3, t: 0, dur: Math.max(2.2, text.length * .07) }; voiceSay(text, who); },
  speak(text) { if (!text) return; this.cur = { key: 'card', text, pri: 3, t: 0, dur: Math.max(2.5, text.length * .06) }; this.last = 'card'; voiceSay(text, 'narrator'); },
  update(dt) {
    for (const k in this.cd) this.cd[k] -= dt;
    if (this.cur) { this.cur.t += dt; if (this.cur.t > this.cur.dur) { this.cur = null; this.gap = 1.2; } return; }
    this.gap -= dt;
    if (this.gap > 0 || !this.q.length) return;
    const l = this.q.shift();
    this.cur = { ...l, t: 0, dur: Math.max(2.2, l.text.length * .055) };
    this.last = l.key; this.log.push(l.key); if (this.log.length > 40) this.log.shift();
    if (!this.quiet || SC.play && SC.play.attract) voiceSay(l.text, 'narrator');
  }
};
bus.on('say', d => NARR.enqueue(d.k, d.pi === undefined ? -1 : d.pi, d.pri || 2));

// ---- 53-audio.js ----
/* 53-audio: original chip songs (with dynamic layers), the sound effects, and Babble: a gibberish voice synth (vowel
 * formants through band-pass filters, consonant noise bursts) for the narrator, the heroes, the monsters and the King. */

const SONGS = {
  title: { bpm: 100, steps: 4, tracks: [   // "Throw Down": a D minor march
    { wave: 'square', vol: .13, notes: 'D4 - - F4 A4 - D5 - C5 - A4 - F4 - G4 - | A4 - - - E4 - G4 - F4 - E4 - D4 - - - | D5 - - C5 Bb4 - A4 - G4 - Bb4 - A4 - F4 - | E4 - G4 - A4 - C#5 - D5 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . D2 . A1 . A1 . F2 . F2 . C2 . C2 . | A1 . A1 . E2 . E2 . D2 . D2 . D2 . . . | Bb1 . Bb1 . F2 . F2 . G1 . G1 . D2 . D2 . | A1 . A1 . A1 . C#2 . D2 . D2 . D2 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . s . k k s . k . s . k s s s' }] },
  card: { bpm: 90, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'A4 - - - E4 - - - F4 - - - E4 - D4 - | C4 - - - D4 - E4 - A3 - - - - - . .' },
    { wave: 'triangle', vol: .28, notes: 'A2 - - - A2 - - - F2 - - - E2 - - - | A1 - - - D2 - E2 - A1 - - - - - . .' }] },
  realm: { bpm: 72, steps: 4, tracks: [
    { wave: 'saw', vol: .06, notes: 'D4 - - - - - F4 - E4 - - - D4 - - - | C4 - - - D4 - - - A3 - - - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'D2 - - - - - - - Bb1 - - - - - - - | C2 - - - - - - - A1 - - - - - - -' },
    { wave: 'drums', vol: .08, notes: 'k . . . . . . . o . . . . . . .' }] },
  larder: { bpm: 120, steps: 4, tracks: [   // "The Larder": a bouncy minor with kitchen clatter
    { wave: 'pulse', vol: .11, notes: 'E5 . B4 . E5 . G5 . F#5 . E5 . D5 . B4 . | C5 . E5 . A5 . G5 . F#5 - - - . . . . | E5 . B4 . E5 . G5 . A5 . G5 . F#5 . D5 . | E5 - - - B4 . G4 . E4 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'E2 . E3 . E2 . E3 . D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . B1 . B2 . B1 . B2 . | E2 . E3 . E2 . E3 . D2 . D3 . D2 . D3 . | C2 . C3 . B1 . B2 . E2 . E2 . . . . .' },
    { name: 'drums', wave: 'drums', vol: .13, on: false, notes: 'k . h t s . h . k k h t s . h h' },
    { wave: 'drums', vol: .07, notes: 'h . . h . . h . h . . h . h . .' }] },
  ossuary: { bpm: 96, steps: 3, tracks: [   // "The Ossuary": organ arpeggios in triplets over a drone
    { wave: 'pulse12', vol: .1, notes: 'A3 C4 E4 A4 E4 C4 F3 A3 C4 F4 C4 A3 | G3 B3 D4 G4 D4 B3 E3 G#3 B3 E4 B3 G#3' },
    { wave: 'square', vol: .06, notes: 'E5 - - - - - - - - - - - | D5 - - - - - B4 - - - - - | C5 - - - - - - - - - - - | B4 - - - - - G#4 - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'A1 - - - - - - - - - - - | G1 - - - - - E1 - - - - -' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . . s . . k . k s . .' }] },
  furnace: { bpm: 136, steps: 4, tracks: [   // "The Furnace Gut": a driving saw bass and anvil hits
    { wave: 'saw', vol: .08, notes: 'D3 D3 . D3 F3 . D3 . G3 . F3 . D3 . C3 . | D3 D3 . D3 F3 . A3 . G#3 . G3 . F3 . E3 .' },
    { wave: 'square', vol: .08, notes: 'D5 - - - - - . . F5 - E5 - D5 - . . | A4 - - - C5 - D5 - - - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 C2 . | Bb1 . Bb1 Bb1 . Bb1 Bb1 . A1 . A1 A1 . A1 C2 .' },
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . s k k . s . k . s k k s s s' },
    { wave: 'drums', vol: .08, notes: 'k . . . c . . . k . . . c . c .' }] },
  hoard: { bpm: 160, steps: 4, tracks: [   // "Hoard Rush": a frantic jig over a ticking hi-hat
    { wave: 'square', vol: .12, notes: 'G5 F#5 G5 A5 B5 . G5 . A5 G5 F#5 G5 E5 . D5 . | G5 F#5 G5 A5 B5 . D6 . C6 B5 A5 G5 F#5 . G5 .' },
    { wave: 'triangle', vol: .3, notes: 'G2 . D3 . G2 . D3 . C3 . G3 . D3 . A2 . | G2 . D3 . G2 . D3 . D3 . A2 . G2 . . .' },
    { wave: 'drums', vol: .1, notes: 'h h h h s h h h h h h h s h h h' }] },
  king: { bpm: 140, steps: 4, tracks: [   // "King Famish": a layer more each phase
    { wave: 'saw', vol: .08, notes: 'C4 . C4 . Eb4 . C4 . G4 . F4 . Eb4 . D4 . | C4 . C4 . Eb4 . G4 . Ab4 . G4 . F4 . D4 .' },
    { wave: 'triangle', vol: .32, notes: 'C2 C3 C2 C3 C2 C3 C2 C3 Ab1 Ab2 Ab1 Ab2 G1 G2 G1 G2' },
    { name: 'p2', wave: 'square', vol: .08, on: false, notes: 'C5 - - - Eb5 - - - G5 - F5 - Eb5 - D5 - | C5 - - - G4 - - - Ab4 - G4 - F4 - D4 -' },
    { name: 'p3', wave: 'drums', vol: .15, on: false, notes: 'k k s k k k s s k k s k s s s s' },
    { wave: 'drums', vol: .1, notes: 'k . s . k . s . k . s . k s s .' }] },
  ending: { bpm: 112, steps: 4, tracks: [   // "Gauntlet Down": a heroic major fanfare, then a calm theme
    { wave: 'square', vol: .13, notes: 'D5 - - A4 D5 - F#5 - A5 - - - F#5 - D5 - | E5 - - B4 E5 - G5 - B5 - - - A5 - G5 - | F#5 - D5 - A4 - D5 - G5 - F#5 - E5 - C#5 - | D5 - - - - - - - D4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . A2 . D3 . A2 . D2 . A2 . D3 . A2 . | E2 . B2 . E3 . B2 . G2 . D3 . G3 . D3 . | D2 . A2 . G2 . D3 . A1 . E2 . A2 . E2 . | D2 . A2 . D3 . . . D2 . . . . . . .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h k s . h .' }] },
  over: { bpm: 70, steps: 4, loop: false, tracks: [   // "The Gaunt Is Fed": a slow descending dirge
    { wave: 'square', vol: .12, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - | D4 - - - C#4 - - - D4 - - - - - - - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'D2 - - - - - - - Bb1 - - - - - - - | A1 - - - - - - - D1 - - - - - - - - - - -' }] },
  name: { bpm: 126, steps: 4, tracks: [   // "Name Thyself": a short jaunty loop
    { wave: 'pulse', vol: .11, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . C5 . D5 . B4 . C5 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | C3 . A2 . G2 . G2 . C3 . G2 . C3 . . .' }] }
};
SONGS.boss = SONGS.king;
function music(name, o = {}) { const s = name && SONGS[name]; A.music(s || null, o); }
function layer(name, on, fade = 1) { try { A.layer(name, on ? 1 : 0, fade); } catch (e) { /* the song has no such layer */ } }

/* ---- sound effects (custom voices) ---- */
const SFX = {
  axe: { wave: 'noise', freq: 900, to: 300, dur: .12, vol: .14 },
  javelin: { wave: 'noise', freq: 2200, to: 800, dur: .09, vol: .12 },
  arrow: [{ wave: 'triangle', freq: 880, to: 1500, dur: .05, vol: .16 }, { wave: 'noise', freq: 3000, dur: .04, vol: .05 }],
  hex: { wave: 'square', freq: 660, to: 1320, dur: .1, vol: .1, vib: [30, .06] },
  swing: { wave: 'noise', freq: 1200, to: 400, dur: .1, vol: .16 },
  thud: { wave: 'square', freq: 140, to: 60, dur: .08, vol: .2 },
  chomp: [{ wave: 'noise', freq: 400, dur: .05, vol: .2 }, { wave: 'square', freq: 220, to: 330, dur: .1, vol: .12, arp: [0, 5, 0, 7], step: .03 }],
  splat: { wave: 'noise', freq: 600, to: 120, dur: .22, vol: .25 },
  gurgle: { wave: 'sine', freq: 180, to: 90, dur: .35, vol: .2, vib: [14, .2] },
  boom: [{ wave: 'noise', freq: 300, to: 40, dur: .6, vol: .35 }, { wave: 'triangle', freq: 220, dur: .7, vol: .14, arp: [0, 4, 7, 12], step: .12 }],
  jingle: { wave: 'square', freq: 1320, dur: .18, vol: .1, arp: [0, 7, 12], step: .05 },
  iron: [{ wave: 'noise', freq: 2000, to: 800, dur: .25, vol: .12 }, { wave: 'square', freq: 110, to: 90, dur: .3, vol: .12 }],
  chest: { wave: 'square', freq: 523, dur: .3, vol: .1, arp: [0, 4, 7, 12, 16], step: .05 },
  gem: { wave: 'triangle', freq: 1568, dur: .2, vol: .14, arp: [0, 5, 12], step: .04 },
  crown: { wave: 'square', freq: 784, dur: .5, vol: .12, arp: [0, 4, 7, 12, 7, 12, 16], step: .06 },
  power: { wave: 'square', freq: 392, dur: .6, vol: .11, arp: [0, 4, 7, 12, 16, 19, 24], step: .07 },
  stairs: { wave: 'pulse', freq: 880, dur: .7, vol: .12, arp: [0, -3, -7, -12, -15, -19, -24], step: .09 },
  rumble: { wave: 'noise', freq: 120, to: 40, dur: .7, vol: .3 },
  warp: { wave: 'sine', freq: 300, to: 1200, dur: .3, vol: .14, vib: [20, .1] },
  stun: { wave: 'square', freq: 1000, to: 500, dur: .25, vol: .1, vib: [40, .2] },
  zap: { wave: 'saw', freq: 220, to: 110, dur: .15, vol: .12 },
  shing: { wave: 'noise', freq: 4000, to: 2000, dur: .12, vol: .1 },
  drone: { wave: 'saw', freq: 55, dur: .6, vol: .1, vib: [3, .05] },
  drain: { wave: 'sine', freq: 600, to: 300, dur: .1, vol: .06 },
  dong: [{ wave: 'triangle', freq: 392, dur: 1.2, vol: .25 }, { wave: 'sine', freq: 784, dur: .9, vol: .1 }],
  whistle: { wave: 'sine', freq: 1400, to: 700, dur: .5, vol: .06 },
  shatter: { wave: 'noise', freq: 3000, to: 1500, dur: .2, vol: .2 },
  fireball: { wave: 'noise', freq: 500, to: 200, dur: .3, vol: .12 },
  blink: { wave: 'sine', freq: 900, to: 300, dur: .15, vol: .07 },
  giggle: { wave: 'square', freq: 900, dur: .3, vol: .06, arp: [0, 3, 0, 5, 0, 3], step: .04 },
  stomp: [{ wave: 'noise', freq: 150, to: 30, dur: .45, vol: .35 }, { wave: 'square', freq: 60, to: 30, dur: .4, vol: .2 }],
  roar: { wave: 'saw', freq: 90, to: 50, dur: .8, vol: .18, vib: [9, .2] },
  crumble: { wave: 'noise', freq: 400, to: 60, dur: .5, vol: .25 },
  spawn: { wave: 'noise', freq: 200, to: 600, dur: .2, vol: .05 },
  wail: { wave: 'sine', freq: 700, to: 200, dur: .35, vol: .08, vib: [7, .1] },
  clink: { wave: 'square', freq: 2400, dur: .06, vol: .07 },
  heart: { wave: 'sine', freq: 70, to: 50, dur: .12, vol: .25 },
  uiMove: { wave: 'square', freq: 660, dur: .04, vol: .07 },
  uiPick: { wave: 'square', freq: 880, dur: .1, vol: .09, arp: [0, 7], step: .05 },
  uiBack: { wave: 'square', freq: 440, to: 330, dur: .08, vol: .08 },
  join: { wave: 'square', freq: 523, dur: .3, vol: .1, arp: [0, 4, 7, 12], step: .06 },
  hurt: { wave: 'noise', freq: 900, to: 200, dur: .14, vol: .16 },
  choir: [{ wave: 'saw', freq: 220, dur: .9, vol: .05 }, { wave: 'saw', freq: 277, dur: .9, vol: .05 }, { wave: 'saw', freq: 330, dur: .9, vol: .05 }]
};
for (const k in SFX) A.define(k, SFX[k]);
const sfx = (name, o) => { if (!SC.mute) A.sfx(name, o); };

/* ---- Babble: the gibberish voices, on a voice bus of their own under the master ---- */
const VOICES = {
  narrator: { base: 78, rate: 5, wave: 'sawtooth', formant: .8, echo: true, gain: .5 },
  berserker: { base: 110, rate: 7, wave: 'square', formant: 1, noise: .3, gain: .3 },
  shieldmaiden: { base: 190, rate: 7, wave: 'sawtooth', formant: 1.05, gain: .28 },
  ranger: { base: 230, rate: 9, wave: 'sawtooth', formant: 1.15, gain: .26 },
  hexer: { base: 260, rate: 8, wave: 'square', formant: 1.2, vib: true, gain: .24 },
  king: { base: 58, rate: 4, wave: 'sawtooth', formant: .7, noise: .5, echo: true, gain: .55 },
  fryar: { base: 170, rate: 8, wave: 'square', formant: 1.3, narrow: true, gain: .18 },
  snatcher: { base: 420, rate: 11, wave: 'square', formant: 1.4, gain: .14 },
  gnasher: { base: 120, rate: 10, wave: 'sawtooth', formant: .9, noise: .4, gain: .16, max: 2 },
  ghost: { base: 300, rate: 4, wave: 'sine', formant: 1, gain: .12, max: 2 },
  lobber: { base: 200, rate: 9, wave: 'square', formant: 1.1, gain: .14, max: 3 },
  imp: { base: 340, rate: 10, wave: 'square', formant: 1.3, gain: .12, max: 2 },
  tithe: { base: 50, rate: 3, wave: 'sawtooth', formant: .6, echo: true, gain: .3, max: 3 }
};
const FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2300] };
var VB = { bus: null, echo: null, active: [] };   // (var: Settings may apply the Voices volume before this line runs)
function voiceBus() {
  const c = A.ctx; if (!c || !A._master) return null;
  if (VB.bus && VB.ctx === c) return VB.bus;
  VB.ctx = c; VB.bus = c.createGain(); VB.bus.connect(A._master);
  VB.echo = c.createDelay(1); VB.echo.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .35; VB.echo.connect(fb); fb.connect(VB.echo); VB.echo.connect(VB.bus);
  voiceVolume();
  return VB.bus;
}
function voiceVolume() { if (VB && VB.bus) VB.bus.gain.value = (S.voices === undefined ? .8 : S.voices); }
const syllables = text => (text.toLowerCase().match(/[^aeiouy\s.,!?'-]*[aeiouy]+[^aeiouy\s.,!?'-]*|[.,!?]/g) || []).slice(0, 26);
const sylHash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; };
function voiceSay(text, who = 'narrator') {
  if (!text || SC.mute) return;
  const c = A.ctx, bus = voiceBus(); if (!c || !bus || c.state !== 'running' || A.muted) return;
  const V = VOICES[who] || VOICES.narrator;
  VB.active = VB.active.filter(v => v.end > c.currentTime);
  if (VB.active.filter(v => v.who === who).length >= (V.max || 1)) return;
  if (VB.active.length >= 3) { const old = VB.active.shift(); try { old.g.gain.cancelScheduledValues(c.currentTime); old.g.gain.setTargetAtTime(0, c.currentTime, .02); } catch (e) { /* gone */ } }
  if (who === 'narrator' || who === 'king') A.duck && A.duck(true);
  const out = c.createGain(); out.gain.value = V.gain; out.connect(bus); if (V.echo) out.connect(VB.echo);
  let t = c.currentTime + .03; const sy = syllables(text), dur = 1 / V.rate;
  sy.forEach((s, i) => {
    if (/[.,!?]/.test(s)) { t += s === ',' ? dur * .6 : dur * 1.2; return; }
    const v = (s.match(/[aeiouy]/) || ['a'])[0], f = FORMANTS[v], hsh = sylHash(s);
    const last = i === sy.length - 1 || /[.!]/.test(sy[i + 1] || ''), q = /\?/.test(sy[i + 1] || '');
    const pitch = V.base * (1 + (hsh - .5) * .35) * (q ? 1.25 : last ? .85 : 1), d = dur * (.75 + hsh * .5);
    const o = c.createOscillator(); o.type = V.wave; o.frequency.setValueAtTime(pitch, t); o.frequency.linearRampToValueAtTime(pitch * (last ? .9 : 1.04), t + d);
    if (V.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 7; lg.gain.value = pitch * .05; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + .05); }
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .008); g.gain.setValueAtTime(1, t + d - .03); g.gain.linearRampToValueAtTime(0, t + d);
    for (const [k, fq] of f.entries()) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq * V.formant; bp.Q.value = V.narrow ? 9 : k ? 6 : 5; o.connect(bp); bp.connect(g); }
    if (/^[sztkpcfh]/.test(s) || V.noise) {   // a consonant: a short burst of filtered noise
      const n = c.createBufferSource(), len = Math.floor(c.sampleRate * .04), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
      for (let j = 0; j < len; j++) ch[j] = (Math.random() * 2 - 1) * (1 - j / len);
      n.buffer = buf; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = /^s|z/.test(s) ? 3000 : 1200; const ng = c.createGain(); ng.gain.value = V.noise ? .4 : .25;
      n.connect(hp); hp.connect(ng); ng.connect(g); n.start(t); n.stop(t + .05);
    }
    g.connect(out); o.start(t); o.stop(t + d + .02);
    t += d + .012;
  });
  VB.active.push({ who, g: out, end: t });
  if (who === 'narrator' || who === 'king') setTimeout(() => { if (!VB.active.some(v => (v.who === 'narrator' || v.who === 'king') && v.end > c.currentTime)) A.duck && A.duck(false); }, (t - c.currentTime) * 1000 + 100);
}
const BARKS = { hurt: ['ugh!', 'oof!', 'agh!'], low: ['need... food...', 'so hungry'], eat: ['mmm!', 'yum!', 'om nom'], magic: ['kaboom!', 'begone!', 'hah!'], join: ['here i come!', 'save some for me!'], pick: ['ooh!', 'mine!'] };
function bark(h, kind) { if (!h || h.remote && !SESSION) return; if ((h.barkT || 0) > game.real) return; h.barkT = game.real + 1.2; voiceSay(Rv(BARKS[kind]), h.cls); }
const Rv = list => list[Math.floor(Math.random() * list.length)];

/* ---- sound from happenings ---- */
const SHOT_SFX = { axe: 'axe', javelin: 'javelin', arrow: 'arrow', hex: 'hex' };
const hpi = d => PARTY[d.pi];
bus.on('throw', d => sfx(SHOT_SFX[d.kind] || 'swing', { vol: .7 }));
bus.on('swing', () => sfx('swing'));
bus.on('melee', () => sfx('thud'));
bus.on('shothit', () => sfx('hit', { vol: .5 }));
bus.on('shotwall', d => d.team === 'hero' && sfx('clink', { vol: .5 }));
bus.on('clink', () => sfx('clink'));
bus.on('hurt', d => { sfx('hurt'); if (Math.random() < .35) bark(hpi(d), 'hurt'); });
bus.on('kill', d => { sfx(d.type === 'ghost' ? 'wail' : d.type === 'imp' ? 'boom' : d.type === 'tithe' ? 'choir' : 'thud', { vol: d.type === 'imp' ? .4 : .7 }); if (Math.random() < .15) voiceSay(Rv(['bleh', 'urk', 'nyah']), get('monsters', d.type) ? get('monsters', d.type).voice : 'gnasher'); });
bus.on('ghostbite', () => sfx('wail'));
bus.on('genhit', () => sfx('hit', { vol: .6, pitch: .6 }));
bus.on('gen', () => sfx('crumble'));
bus.on('spawn', d => { if (Math.random() < .3) sfx('spawn'); if (Math.random() < .05) voiceSay(Rv(['grah', 'hungry', 'meat']), (get('monsters', d.type) || {}).voice || 'gnasher'); });
bus.on('gone', d => {
  if (d.shot) return;
  const k = d.kind, h = PARTY[d.by];
  if (k === 'key') sfx('jingle'); else if (k === 'flask') sfx('pickup'); else if (k === 'gold') sfx('coin'); else if (k === 'gem') sfx('gem'); else if (k === 'crown' || k === 'gauntlet') sfx('crown');
  else if (k === 'chest' || k === 'lchest') sfx('chest'); else if (k === 'special' || k === 'amulet') sfx('power'); else if (k === 'stew') sfx('gurgle');
  else if (get('items', k) && get('items', k).food) { sfx('chomp'); if (h && Math.random() < .5) bark(h, 'eat'); }
});
bus.on('shotfood', () => sfx('splat'));
bus.on('magic', d => { sfx('boom'); sfx('choir'); if (hpi(d)) bark(hpi(d), 'magic'); });
bus.on('door', () => sfx('iron'));
bus.on('wall', () => sfx('crumble'));
bus.on('crack', () => sfx('hit', { vol: .4, pitch: .5 }));
bus.on('trap', () => sfx('rumble'));
bus.on('secret', () => sfx('secret'));
bus.on('tele', () => sfx('warp'));
bus.on('stun', () => sfx('stun'));
bus.on('stairs', () => sfx('stairs'));
bus.on('bell', () => sfx('dong'));
bus.on('lob', () => sfx('whistle'));
bus.on('crockbreak', d => sfx(d.kind === 'plate' ? 'shatter' : 'shatter', { vol: .7 }));
bus.on('spit', () => sfx('fireball'));
bus.on('blink', () => sfx('blink'));
bus.on('stolen', d => { sfx('giggle'); voiceSay('hee hee hee!', 'snatcher'); void d; });
bus.on('tithe', d => { sfx('drone'); if (!d.gone) voiceSay('your due... is due.', 'tithe'); });
bus.on('drain', () => sfx('drain', { vol: .5 }));
bus.on('fall', () => sfx('die'));
bus.on('rise', () => sfx('oneup'));
bus.on('join', d => { sfx('join'); bark(hpi(d), 'join'); });
bus.on('ricochet', () => sfx('clink', { pitch: 1.4 }));
bus.on('rankdown', () => sfx('hit', { vol: .3, pitch: 1.4 }));
bus.on('ui', d => sfx(d.k === 'move' ? 'uiMove' : d.k === 'back' ? 'uiBack' : d.k === 'join' ? 'join' : 'uiPick'));
bus.on('king', d => {
  if (d.what === 'stomp') sfx('stomp'); else if (d.what === 'throw') sfx('whistle'); else if (d.what === 'eat' || d.what === 'gulp') sfx('chomp', { pitch: .5 });
  else if (d.what === 'dead') { sfx('roar'); sfx('crumble'); } else if (d.what === 'phase') { sfx('roar'); layer(d.phase === 2 ? 'p2' : 'p3', true); } else if (d.what === 'chargewind' || d.what === 'stompwind' || d.what === 'wave') sfx('roar', { vol: .5 });
  if (d.line) NARR.speakAs(d.line, 'king', 'KING FAMISH');
});

// ---- 60-front.js ----
/* 60-front: title and main menu, class select ("CHOOSE YOUR FOOL"), How to Play, High Scores, About and Credits, the
 * touch-only notice. Every screen is big canvas pixel art, driven by any controller, the keys and the mouse (hover
 * focuses, click picks); Back is ○ / Esc / Backspace; 10 s idle starts the attract mode. */

/* ---- input across every player, and the idle clock ---- */
const anyP = a => game.players.some(p => p.pressed(a));
const anyRep = a => game.players.some(p => p.repeat(a, .3, .08));
const IDLE = { t: 0, px: null, raw: 0 };
// any key, button or wheel counts (bound or not): the DOM tells us, the gamepads are read each step
if (HAS_DOM) for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { IDLE.raw = game.real; }, { passive: true, capture: true });
const rawInput = since => IDLE.raw > since || game.players.some(p => p.padPrev && p.padPrev.some(Boolean)) || (typeof navigator !== 'undefined' && navigator.getGamepads && [...navigator.getGamepads()].some(g => g && g.buttons.some(b => b.pressed)));
function idleTick(dt) {
  const I = game.input, ptr = I.pointer();
  let moved = false;
  if (ptr && IDLE.px && Math.hypot(ptr[0] - IDLE.px[0], ptr[1] - IDLE.px[1]) > 4) moved = true;
  if (ptr) IDLE.px = ptr;
  const pad = game.players.some(p => p.padMove && Math.hypot(p.padMove[0], p.padMove[1]) > .3 || p.padAim);
  if (moved || pad || I.anyPressed() || I.clicked() || I.held.size || I.zoom() !== 1 || rawInput(game.real - dt - .001)) IDLE.t = 0; else IDLE.t += dt;
  return IDLE.t;
}
const promptKey = (a, inp = game.input) => inp.label(a);
const fillKeys = (s, inp = game.input) => s.replace('{move}', inp.lastDevice === 'gamepad' ? 'the left stick' : 'W A S D').replace('{aim}', inp.lastDevice === 'gamepad' ? 'the right stick' : 'the mouse')
  .replace('{fire}', promptKey('fire', inp)).replace('{plant}', promptKey('plant', inp)).replace('{magic}', promptKey('magic', inp)).replace('{join}', inp.lastDevice === 'gamepad' ? 'Options on a free controller' : 'Options on a free controller, or 2 on the keyboard,');

/* ---- a big menu: keys, pads and the mouse ---- */
function bigMenu(items, o = {}) {
  return {
    items, i: 0, boxes: [], scale: o.scale || 2, y: o.y || 100,
    update() {
      const its = this.items.filter(Boolean);
      if (anyRep('up')) { this.i = (this.i + its.length - 1) % its.length; happen('ui', { k: 'move' }); }
      if (anyRep('down')) { this.i = (this.i + 1) % its.length; happen('ui', { k: 'move' }); }
      const I = game.input, ptr = I.pointer(), clk = I.clicked();
      if (ptr && (ptr[0] !== this.px || ptr[1] !== this.py)) { this.px = ptr[0]; this.py = ptr[1]; const k = this.boxes.findIndex(b => ptr[0] >= b[0] && ptr[0] < b[0] + b[2] && ptr[1] >= b[1] && ptr[1] < b[1] + b[3]); if (k >= 0 && k !== this.i) { this.i = k; happen('ui', { k: 'move' }); } }
      if (clk) { const k = this.boxes.findIndex(b => clk[0] >= b[0] && clk[0] < b[0] + b[2] && clk[1] >= b[1] && clk[1] < b[1] + b[3]); if (k >= 0) { this.i = k; happen('ui', { k: 'pick' }); return its[k]; } }
      if (anyP('confirm') || anyP('start')) { happen('ui', { k: 'pick' }); return its[this.i]; }
      return null;
    },
    draw(g, W0) {
      const its = this.items.filter(Boolean), lh = 9 * this.scale + 4; this.boxes = [];
      its.forEach((it, k) => {
        const y = this.y + k * lh, on = k === this.i, w = twidth(it.label, { scale: this.scale }) + 24, x = Math.round(W0 / 2 - w / 2);
        this.boxes.push([x, y - 3, w, lh - 2]);
        if (on) { px.rect(g, x, y - 3, w, lh - 2, '#4a2a1a'); px.rect(g, x, y - 3, w, 1, '#e8a840'); px.rect(g, x, y + lh - 6, w, 1, '#8a5a20'); }
        otxt(g, (on ? '▸ ' : '') + it.label, W0 / 2, y, on ? '#ffe08a' : '#d8c8b0', { align: 'center', scale: this.scale });
      });
    }
  };
}

/* ---- touch-only devices: no touch controls; a notice and a Settings button ---- */
const TOUCH = { only: false, dismissed: false };
function detectTouchOnly() {
  if (!HAS_DOM || TOUCH.dismissed) return false;
  const fine = window.matchMedia ? matchMedia('(any-pointer: fine)').matches : true;
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
  return !fine && (navigator.maxTouchPoints || 0) > 0 && !pads;
}
if (HAS_DOM) {
  TOUCH.only = detectTouchOnly();
  const off = () => { TOUCH.only = false; TOUCH.dismissed = true; };
  addEventListener('gamepadconnected', off); addEventListener('keydown', off, { once: true });
}

/* ---- the title (with the main menu) ---- */
const LOGO_COLORS = ['#fff4c8', '#ffd36a', '#c87a2a', '#6a3a1a'];
scenes.title = {
  view: 'threequarter', touch: [],
  enter() {
    IDLE.t = 0; game.input.touchEnabled = false; if (S.touch !== 'off') try { S.set('touch', 'off'); } catch (e) { /* none */ }
    SC.title = { t: 0, menu: bigMenu(titleItems(), { y: 0 }), state: 'menu', fall: [] };
    music('title'); L.enabled = false; game.allowJoin(false);
    PARTY.length = 0; W = null;
  },
  update(dt) {
    const T0 = SC.title; T0.t += dt;
    if (idleTick(dt) > 10) { startAttract(); return; }
    if (TOUCH.only) {   // the notice: a tap on SETTINGS opens the settings; taps don't start a game
      const c = game.input.clicked(); if (c && T0.setBtn && c[0] >= T0.setBtn[0] && c[0] < T0.setBtn[0] + T0.setBtn[2] && c[1] >= T0.setBtn[1] && c[1] < T0.setBtn[1] + T0.setBtn[3]) game.menu('settings');
      return;
    }
    T0.menu.items = titleItems();
    const pick = T0.menu.update();
    if (pick) pick.go();
  },
  draw(r) { drawTitleBack(r, SC.title.t); r.overlay(g => drawTitleFront(g, r)); }
};
function titleItems() {
  return [
    store.get('d2', false) && { label: 'DESCENT II', go: () => game.go('select', { loop: 2 }) },
    { label: 'START DESCENT', go: () => game.go('select', { loop: 1 }) },
    { label: 'HOW TO PLAY', go: () => game.go('howto', { back: 'title' }) },
    { label: 'HIGH SCORES', go: () => game.go('scores', { back: 'title' }) },
    { label: 'SETTINGS', go: () => game.menu('settings') },
    { label: 'ABOUT & CREDITS', go: () => game.go('about', {}) }
  ];
}
function drawTitleFront(g, r) {
  const T0 = SC.title, W0 = r.W, H0 = r.H, sc = W0 > 520 ? 4 : 3;
  E.font.title(g, 'GAUNTLETDOWN', W0 / 2, Math.round(H0 * .14), { scale: sc, colors: LOGO_COLORS, outline: '#120806', depth: 3, depthColor: '#3a1a0a', align: 'center' });
  otxt(g, 'FOUR FOOLS. ONE HUNGRY DUNGEON.', W0 / 2, Math.round(H0 * .14) + 9 * sc + 10, '#e8c8a0', { align: 'center' });
  if (TOUCH.only) {
    const w = Math.min(W0 - 30, 300), x = (W0 - w) / 2, y = H0 * .45;
    E.ui.box(g, x, y, w, 82, { bg: ['#2a1a14', '#120a08'], border: '#e8a840' });
    otxt(g, 'Controller or keyboard required', W0 / 2, y + 10, '#ffe08a', { align: 'center', scale: 1 });
    txt(g, 'Connect a controller or a keyboard to play.', W0 / 2, y + 26, '#d8c8b0', { align: 'center' });
    const bw = 120, bx = (W0 - bw) / 2, by = y + 44; T0.setBtn = [bx, by, bw, 26];
    px.rect(g, bx, by, bw, 26, '#6a3a1a'); px.rect(g, bx, by, bw, 1, '#e8a840'); otxt(g, 'SETTINGS', W0 / 2, by + 7, '#ffe08a', { align: 'center', scale: 2 });
  } else {
    T0.menu.y = Math.round(H0 * .45); const mh = T0.menu.items.filter(Boolean).length * 22 + 6; px.blend(g, .55, 'normal', () => px.rect(g, W0 / 2 - 110, T0.menu.y - 8, 220, mh, '#0a0506')); T0.menu.draw(g, W0);
    const I = game.input;
    txt(g, '↑↓ choose   ' + I.label('confirm') + ' pick   ' + (I.lastDevice === 'gamepad' ? 'Options' : '2') + ' on a free controller joins at the class select', W0 / 2, H0 - 22, '#a89880', { align: 'center' });
  }
  txt(g, 'v' + VERSION + '  -  my-3D2dge v' + E.version, 6, H0 - 10, '#6a5a50');
  txt(g, 'An homage to Gauntlet (1985)', W0 - 6, H0 - 10, '#6a5a50', { align: 'right' });
}

/* ---- class select: CHOOSE YOUR FOOL ---- */
scenes.select = {
  view: 'threequarter', touch: [],
  enter(d) {
    SC.sel = { t: 0, loop: d.loop || 1, cur: [{ inp: game.input, i: 0, lock: false }], rigs: HERO_ORDER.map(c => get('heroes', c).rig()), boxes: [], startT: 0 };
    for (const p of game.players.slice(1)) SC.sel.cur.push({ inp: p, i: SC.sel.cur.length % 4, lock: false });
    game.allowJoin({ max: 4, onJoin: (inp) => { inp.glyphs = S.padGlyphs; SC.sel.cur.push({ inp, i: firstFree(), lock: false }); happen('ui', { k: 'join' }); } });
    IDLE.t = 0;
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    const s = SC.sel; s.t += dt;
    if (idleTick(dt) > 10 && !s.cur.some(c => c.lock)) { startAttract(); return; }
    const I = game.input, ptr = I.pointer(), clk = I.clicked();
    for (const c of s.cur) {
      const p = c.inp;
      if (!c.lock) {
        if (p.repeat('left', .3, .12)) { c.i = (c.i + 3) % 4; happen('ui', { k: 'move' }); }
        if (p.repeat('right', .3, .12)) { c.i = (c.i + 1) % 4; happen('ui', { k: 'move' }); }
        if (p === I && ptr && (ptr[0] !== s.px || ptr[1] !== s.py)) { s.px = ptr[0]; s.py = ptr[1]; const k = s.boxes.findIndex(b => ptr[0] >= b[0] && ptr[0] < b[0] + b[2] && ptr[1] >= b[1] && ptr[1] < b[1] + b[3]); if (k >= 0 && k !== c.i) { c.i = k; happen('ui', { k: 'move' }); } }
        const ci = p === I && clk ? s.boxes.findIndex(b => clk[0] >= b[0] && clk[0] < b[0] + b[2] && clk[1] >= b[1] && clk[1] < b[1] + b[3]) : -1;
        if (ci >= 0) c.i = ci;
        if ((p.pressed('fire') || p.pressed('confirm') || ci >= 0) && s.t > .3) {
          if (s.cur.some(o => o !== c && o.lock && o.i === c.i)) happen('ui', { k: 'back' });
          else { c.lock = true; happen('ui', { k: 'pick' }); voiceSay(get('heroes', HERO_ORDER[c.i]).quip.split('.')[0], HERO_ORDER[c.i]); }
        }
        if (p.pressed('cancel')) { if (p === I) { game.go('title'); return; } s.cur = s.cur.filter(o => o !== c); game.removePlayer(p); }
      } else if (p.pressed('cancel')) { c.lock = false; happen('ui', { k: 'back' }); }
    }
    if (s.cur.every(c => c.lock)) { s.startT += dt; if (s.startT > .7 || anyP('start')) begin(); } else s.startT = 0;
    function begin() {
      const order = s.cur.slice();
      startDescent(order.map(c => HERO_ORDER[c.i]), { inputs: order.map(c => c.inp), loop: s.loop });
    }
  },
  draw(r) {
    drawTitleBack(r, SC.sel.t, true);
    r.overlay(g => drawSelect(g, r));
  }
};
const firstFree = () => { for (let i = 0; i < 4; i++) if (!SC.sel.cur.some(c => c.i === i)) return i; return 0; };
function drawSelect(g, r) {
  const s = SC.sel, W0 = r.W, H0 = r.H, cw = Math.min(100, Math.floor((W0 - 20) / 4) - 4), gap = 4, x0 = Math.round((W0 - (cw * 4 + gap * 3)) / 2), y0 = 34, ch = H0 - y0 - 30;
  E.font.title(g, 'CHOOSE YOUR FOOL', W0 / 2, 8, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
  s.boxes = [];
  HERO_ORDER.forEach((cls, i) => {
    const D = get('heroes', cls), x = x0 + i * (cw + gap), here = s.cur.filter(c => c.i === i), locked = s.cur.find(c => c.i === i && c.lock);
    s.boxes.push([x, y0, cw, ch]);
    E.ui.box(g, x, y0, cw, ch, { bg: locked ? ['#3a2a1a', '#1a1008'] : ['#241a24', '#100a10'], border: here.length ? (here[0].inp.color ? D.color : D.color) : '#4a3a3a' });
    const rig = s.rigs[i];
    rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(game.real * .6 + i) * .9, attack: here.length && (game.real % 2.4) < .5 ? E.move(D.moves[0], (game.real % 2.4) / .5, (game.real % 2.4) < .2 ? 'wind' : (game.real % 2.4) < .3 ? 'active' : 'recover') : null, pose: locked ? 'cheer' : null });
    rig.draw(g, x + cw / 2, y0 + 70, r.view);
    otxt(g, D.name, x + cw / 2, y0 + 78, D.color, { align: 'center' });
    txt(g, D.who, x + cw / 2, y0 + 88, '#c8b8a0', { align: 'center', font: 'tiny' });
    D.pips.forEach((v, k) => {
      const yy = y0 + 98 + k * 9; txt(g, PIP_NAMES[k], x + 5, yy, '#a89880', { font: 'tiny' });
      for (let q = 0; q < 5; q++) px.rect(g, x + cw - 40 + q * 7, yy, 5, 5, q < v ? D.color : '#3a2e2e');
    });
    const lines = E.font.wrap(D.quip, cw - 8, { font: 'tiny' });
    lines.slice(0, 4).forEach((l, k) => txt(g, l, x + cw / 2, y0 + 146 + k * 7, '#e8d8b8', { align: 'center', font: 'tiny' }));
    here.forEach((c, k) => { const lab = 'P' + (s.cur.indexOf(c) + 1); px.rect(g, x + 3 + k * 18, y0 + 3, 16, 9, c.lock ? D.color : '#2a2a2a'); txt(g, lab, x + 11 + k * 18, y0 + 4, c.lock ? '#000000' : '#ffffff', { align: 'center' }); });
    if (locked) otxt(g, here.length > 1 ? 'TAKEN' : 'READY', x + cw / 2, y0 + ch - 12, '#7ae87a', { align: 'center' });
  });
  const I = game.input;
  const all = s.cur.every(c => c.lock);
  txt(g, all ? 'DESCENDING...' : '←→ choose   ' + I.label('fire') + ' lock in   ' + I.label('cancel') + ' back      ' + (s.cur.length < 4 ? (I.lastDevice === 'gamepad' ? 'Options' : '2') + ' on a free controller or the keyboard: JOIN' : ''), W0 / 2, H0 - 14, all ? '#7ae87a' : '#c8b8a0', { align: 'center' });
}

/* ---- How to Play: eight paged cards ---- */
scenes.howto = {
  view: 'threequarter', touch: [],
  enter(d) { SC.how = { i: 0, back: d.back || 'title', t: 0, rig: get('heroes', 'berserker').rig(), ghost: null }; IDLE.t = 0; },
  update(dt) {
    const h = SC.how; h.t += dt;
    if (idleTick(dt) > 10) { startAttract(); return; }
    if (anyRep('left')) { h.i = (h.i + HOWTO.length - 1) % HOWTO.length; happen('ui', { k: 'move' }); }
    if (anyRep('right') || anyP('confirm')) { h.i = (h.i + 1) % HOWTO.length; happen('ui', { k: 'move' }); }
    const c = game.input.clicked(); if (c) { if (c[0] < (game.r ? game.r.W : 400) / 2) h.i = (h.i + HOWTO.length - 1) % HOWTO.length; else h.i = (h.i + 1) % HOWTO.length; happen('ui', { k: 'move' }); }
    if (anyP('cancel')) { happen('ui', { k: 'back' }); game.go(h.back); }
  },
  draw(r) { drawTitleBack(r, SC.how.t, true); r.overlay(g => drawHowto(g, r)); }
};
function drawHowto(g, r) {
  const h = SC.how, W0 = r.W, H0 = r.H, [title, body, pic] = HOWTO[h.i], w = Math.min(W0 - 24, 400), x = (W0 - w) / 2, y = 20, ht = H0 - 52;
  E.ui.box(g, x, y, w, ht, { bg: ['#2a1a14', '#100806'], border: '#e8a840' });
  otxt(g, title, W0 / 2, y + 8, '#ffe08a', { align: 'center', scale: 2 });
  const lines = E.font.wrap(fillKeys(body), w - 24, {});
  lines.forEach((l, k) => txt(g, l, W0 / 2, y + 30 + k * 10, '#f0e0c8', { align: 'center' }));
  drawHowPic(g, pic, W0 / 2, y + 40 + lines.length * 10 + 40, h.t);
  for (let k = 0; k < HOWTO.length; k++) px.rect(g, W0 / 2 - HOWTO.length * 5 + k * 10, y + ht - 10, 6, 3, k === h.i ? '#ffe08a' : '#5a4030');
  const I = game.input;
  txt(g, '← → page   ' + I.label('cancel') + ' back', W0 / 2, H0 - 14, '#a89880', { align: 'center' });
}
function drawHowPic(g, pic, cx, cy, t) {
  const rig = SC.how.rig, ph = t % 1.6;
  if (pic === 'move' || pic === 'fire' || pic === 'gauntlet' || pic === 'friends') {
    const n = pic === 'friends' ? 4 : 1;
    for (let k = 0; k < n; k++) {
      const rg = n > 1 ? (SC.how['r' + k] || (SC.how['r' + k] = get('heroes', HERO_ORDER[k]).rig())) : rig;
      rg.update(1 / 60, { x: 0, y: 0, z: 0, vx: pic === 'move' ? 40 : 0, vy: 0, facing: pic === 'move' ? Math.sin(t) * 1.5 : 0, attack: pic === 'fire' ? E.move(ph < .8 ? 'throw' : 'overhead', (ph % .8) / .8, (ph % .8) < .25 ? 'wind' : (ph % .8) < .4 ? 'active' : 'recover') : null, pose: pic === 'gauntlet' || pic === 'friends' ? 'cheer' : null });
      rg.draw(g, cx + (k - (n - 1) / 2) * 36, cy, SC.view || game.view);
    }
    if (pic === 'gauntlet') px.sprite(g, SPR.gauntlet, cx + 22, cy - 40 + Math.sin(t * 3) * 3);
    if (pic === 'fire') { const sx = cx + 14 + (ph % .8) * 120; px.sprite(g, SPR.shot_axe, sx, cy - 16); }
  } else if (pic === 'food') { [SPR.roast, SPR.loaf, SPR.cider, SPR.stew].forEach((s, k) => { px.sprite(g, s, cx - 60 + k * 36, cy - 14); txt(g, ['+100', '+50', '+100', '-50'][k], cx - 54 + k * 36, cy + 4, k === 3 ? '#9ae84a' : '#ffe08a', { align: 'center' }); }); }
  else if (pic === 'magic') { px.sprite(g, SPR.flask, cx - 4, cy - 20); const rr = (t % 1) * 60; for (let a = 0; a < 24; a++) px.dot(g, cx + Math.cos(a / 24 * TAU) * rr, cy - 12 + Math.sin(a / 24 * TAU) * rr * .5, '#c8e8ff'); }
  else if (pic === 'stairs') { px.sprite(g, SPR.key, cx - 50, cy - 14); px.sprite(g, SPR.stairsIcon, cx + 20, cy - 18); txt(g, '→', cx - 14, cy - 10, '#ffe08a'); }
  else if (pic === 'gens') { px.sprite(g, SPR.urnIcon, cx - 40, cy - 20); px.sprite(g, SPR.ghostIcon, cx + 10 + Math.sin(t * 2) * 6, cy - 22); px.sprite(g, SPR.ghostIcon, cx + 34, cy - 12 + Math.cos(t * 2) * 4); }
}

/* ---- High Scores ---- */
const SCORES = { list: () => store.get('scores', []), add(e) { const l = this.list(); l.push(e); l.sort((a, b) => b.score - a.score); store.set('scores', l.slice(0, 10)); }, qualifies(s) { const l = this.list(); return s > 0 && (l.length < 10 || s > l[l.length - 1].score); } };
scenes.scores = {
  view: 'threequarter', touch: [],
  enter(d) { SC.sc = { t: 0, back: d.back || 'title', hi: d.hi, attract: !!d.attract }; if (!d.attract) music('name'); IDLE.t = 0; },
  update(dt) {
    SC.sc.t += dt;
    if (SC.sc.attract) { attractStep(dt); return; }
    if (idleTick(dt) > 10) { startAttract(); return; }
    if (anyP('cancel') || anyP('confirm') || game.input.clicked() || (SC.sc.hi && SC.sc.t > 8)) { happen('ui', { k: 'back' }); game.go(SC.sc.back); }
  },
  draw(r) { drawTitleBack(r, SC.sc.t, true); r.overlay(g => drawScores(g, r)); }
};
function drawScores(g, r) {
  const W0 = r.W, H0 = r.H, l = SCORES.list(), w = Math.min(W0 - 24, 330), x = (W0 - w) / 2;
  E.font.title(g, 'HIGH SCORES', W0 / 2, 10, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
  E.ui.box(g, x, 32, w, H0 - 56, { bg: ['#1e1410', '#0a0604'], border: '#8a5a20', alpha: .9 });
  if (!l.length) otxt(g, 'NO ONE HAS COME BACK UP. YET.', W0 / 2, 100, '#d8c8b0', { align: 'center' });
  l.forEach((e, k) => {
    const y = 42 + k * 16, on = SC.sc.hi && e.t === SC.sc.hi;
    if (on) px.rect(g, x + 4, y - 3, w - 8, 14, '#4a2a1a');
    otxt(g, String(k + 1).padStart(2, ' '), x + 12, y, '#a89880', { scale: 1 });
    otxt(g, e.name, x + 34, y, on ? '#ffe08a' : '#f0e0c8', { scale: 2 });
    const D = get('heroes', e.cls); if (D) txt(g, D.name, x + 92, y + 3, D.color);
    txt(g, 'FLOOR ' + e.floor + (e.cont ? '  -  ' + e.cont + ' CONT' : ''), x + 170, y + 3, '#a89880');
    otxt(g, String(e.score), x + w - 12, y, '#ffe08a', { align: 'right', scale: 2 });
  });
  if (!SC.sc.attract) txt(g, game.input.label('cancel') + ' back', W0 / 2, H0 - 14, '#a89880', { align: 'center' });
}

/* ---- About and Credits: paged ---- */
scenes.about = {
  view: 'threequarter', touch: [],
  enter() { SC.ab = { i: 0, t: 0, scroll: 0 }; IDLE.t = 0; },
  update(dt) {
    const a = SC.ab; a.t += dt;
    if (idleTick(dt) > 10) { startAttract(); return; }
    const pages = aboutPages();
    if (anyRep('left')) { a.i = (a.i + pages.length - 1) % pages.length; a.scroll = 0; happen('ui', { k: 'move' }); }
    if (anyRep('right') || anyP('confirm')) { a.i = (a.i + 1) % pages.length; a.scroll = 0; happen('ui', { k: 'move' }); }
    if (anyRep('down')) a.scroll++; if (anyRep('up')) a.scroll = Math.max(0, a.scroll - 1);
    const z = game.input.zoom(); if (z < 1) a.scroll++; else if (z > 1) a.scroll = Math.max(0, a.scroll - 1);
    const c = game.input.clicked(); if (c) { a.i = (a.i + (c[0] < (game.r ? game.r.W : 400) / 2 ? pages.length - 1 : 1)) % pages.length; a.scroll = 0; }
    if (anyP('cancel')) { happen('ui', { k: 'back' }); game.go('title'); }
  },
  draw(r) { drawTitleBack(r, SC.ab.t, true); r.overlay(g => drawAbout(g, r)); }
};
function aboutPages() { return [['CREDITS', ABOUT.credits], ['SOURCE INFORMATION', ABOUT.source], ['TESTING FEEDBACK', ABOUT.testing], ['ENGINE FEEDBACK', ABOUT.engine], ['PROMPT FEEDBACK', ABOUT.prompt]]; }
function drawAbout(g, r) {
  const a = SC.ab, W0 = r.W, H0 = r.H, pages = aboutPages(), [title, paras] = pages[a.i], w = Math.min(W0 - 20, 420), x = (W0 - w) / 2, y = 18, ht = H0 - 46;
  E.ui.box(g, x, y, w, ht, { bg: ['#1e1410', '#0a0604'], border: '#e8a840' });
  otxt(g, title, W0 / 2, y + 7, '#ffe08a', { align: 'center', scale: 2 });
  const lines = [];
  for (const p of paras) { for (const l of E.font.wrap(p, w - 20, {})) lines.push(l); lines.push(''); }
  const vis = Math.floor((ht - 40) / 9); a.scroll = Math.min(a.scroll, Math.max(0, lines.length - vis));
  lines.slice(a.scroll, a.scroll + vis).forEach((l, k) => txt(g, l, x + 10, y + 28 + k * 9, '#f0e0c8'));
  if (lines.length > vis) txt(g, '↑↓ scroll', x + w - 8, y + ht - 10, '#8a7a60', { align: 'right' });
  for (let k = 0; k < pages.length; k++) px.rect(g, W0 / 2 - pages.length * 5 + k * 10, y + ht - 8, 6, 3, k === a.i ? '#ffe08a' : '#5a4030');
  txt(g, '← → page   ' + game.input.label('cancel') + ' back', W0 / 2, H0 - 14, '#a89880', { align: 'center' });
}

// ---- 61-play.js ----
/* 61-play: a descent (solo and local co-op): the floor order, floor and realm cards, play, joining and dropping out,
 * falling and rising, the continue, game over, initials, the ending, credits and Descent II. */

const floorIndexOfNo = no => FLOOR_ORDER.findIndex(id => get('floors', id).no === no);

function startDescent(classes, o = {}) {
  PARTY.length = 0;
  classes.forEach((c, i) => { const inp = o.inputs ? o.inputs[i] : game.players[i] || null; PARTY.push(makeHero(c.cls || c, i, { input: inp })); });
  RUN.loop = o.loop || 1; RUN.floorIdx = o.floorIdx || 0; RUN.cheated = false; RUN.deepest = 1; RUN.started = game.real; RUN.mode = o.attract ? 'attract' : 'local';
  reseed(o.seed || ((Date.now() ^ (Math.random() * 1e9)) >>> 0));
  NARR.reset(o.attract);
  if (!o.attract) for (const h of PARTY) say('welcome', h, 1);
  gotoFloor(RUN.floorIdx, { card: !o.noCard, attract: o.attract });
}
function gotoFloor(idx, o = {}) {
  RUN.floorIdx = idx;
  const id = FLOOR_ORDER[idx], fd = get('floors', id);
  if (fd.no) RUN.deepest = Math.max(RUN.deepest, fd.no);
  newWorld(id, { loop: RUN.loop, attract: o.attract, net: o.net || 'local' });
  if (CHEAT.botP1 && PARTY[0]) PARTY[0].bot = makeBot(PARTY[0]);
  const realmCard = o.card !== false && (idx === 0 || FLOOR_ORDER[idx - 1] && get('floors', FLOOR_ORDER[idx - 1]).realm !== fd.realm && fd.realm !== get('floors', FLOOR_ORDER[idx - 1]).realm);
  if (o.attract) { game.go('play', { attract: true }, { fade: 0 }); return; }
  if (o.card === false) { game.go('play', {}); return; }
  game.go('card', { realm: realmCard ? fd.realm : null, first: idx === 0 && RUN.loop === 1 });
}
function nextFloor() {
  const d = W.done;
  if (d.ending) { game.go('ending', {}, { fade: 'white', seconds: .6 }); return; }
  let idx = RUN.floorIdx + 1;
  if (d.to) { const k = floorIndexOfNo(d.to); if (k > RUN.floorIdx) idx = k; }
  if (idx >= FLOOR_ORDER.length) { game.go('ending', {}); return; }
  for (const h of PARTY) { h.amulet = null; h.stun = 0; }
  gotoFloor(idx, { card: true });
}

/* ---- the floor card ---- */
scenes.card = {
  enter(d) {
    SC.card = { t: 0, realm: d.realm, fd: W.fd, first: d.first };
    music(d.realm ? 'realm' : 'card', { sync: false });
    const key = W.fd.hoard ? 'hoard_' + W.fd.hoard : 'floor_' + W.no;
    NARR.speak(d.realm ? STORY.realm[d.realm][1] : LINES[key] || '');
  },
  update(dt) {
    const c = SC.card; c.t += dt;
    const any = game.players.some(p => p.pressed('fire') || p.pressed('confirm') || p.pressed('start')) || game.input.clicked();
    if ((c.t > .8 && any) || c.t > (c.realm ? 7 : 5)) game.go('play', {}, { fade: 'iris', seconds: .35 });
  },
  draw(r) { drawFloorCard(r, SC.card); }
};

/* ---- play ---- */
scenes.play = {
  pausable: true, world: true, view: 'threequarter', camera: { zoom: [.55, 1.2], start: .72, tall: .9 },
  enter(d) {
    const att = !!(d && d.attract);
    SC.play = { t: 0, attract: att, contT: 0, over: false };
    game.setView(att ? 'threequarter' : S.viewMode);
    setupLights();
    music(musicFor(W.fd), { sync: true, fade: .5 });
    if (!att) { game.allowJoin({ max: 4, onJoin: (inp, n) => joinMidPlay(inp, n) }); NARR.speak(W.no === 1 && RUN.loop === 1 && !W.hoard ? LINES.start : '', 'narrator'); }
    else game.allowJoin(false);
    if (W.hoard) say('hoard', null, 3);
    if (W.no === 6 && allyStunOn()) say('ally_stun_on', null, 2);
    if (W.no === 8) say('king_near', null, 2);
    game.weather = W.realm === 'furnace' ? { kind: 'ash', amount: .4 } : null;
    camFrame(true);
  },
  exit() { game.allowJoin(false); game.weather = null; },
  update(dt) {
    const P = SC.play; P.t += dt;
    if (DEV.open) { devUpdate(dt); return; }
    if (P.attract) { attractStep(dt); }
    if (game.input.pressed('view')) cycleView();
    for (const h of PARTY) h.intent = h.bot ? botIntent(h.bot, dt) : h.input ? localIntent(h, h.input) : IDLE_INTENT;
    for (const h of PARTY) if (h.joinPick) joinPickStep(h);
    stepWorld(dt);
    camFrame(false);
    NARR.update(dt);
    musicLayers(dt);
    if (P.attract) return;
    if (W.done && W.doneT > (W.done.ending ? 1.2 : .7)) { nextFloor(); return; }
    if (!living().length && PARTY.length) {
      P.contT += dt;
      if (P.contT > 1.5 && !P.over) { P.over = true; game.go('over', {}); }
    } else P.contT = 0;
  },
  draw(r) { drawWorld(r); drawHUD(r); if (DEV.open) devDraw(r); }
};
/* ---- dynamic music: drums when a horde is near, a heartbeat when a local hero starves ---- */
function musicLayers(dt) {
  if (!W) return;
  const locals = living().filter(h => !h.remote);
  const near = W.mons.filter(m => locals.some(h => Math.abs(m.x - h.x) < 8 * T && Math.abs(m.y - h.y) < 8 * T)).length;
  const on = near >= 12;
  if (on !== SC.drums) { SC.drums = on; layer('drums', on, 1); }
  SC.beat = (SC.beat || 0) - dt;
  if (locals.some(h => h.hp < 200) && SC.beat <= 0) { SC.beat = .75; sfx('heart'); }
}
function cycleView() { const v = { threequarter: 'topdown', topdown: 'iso', iso: 'threequarter' }[game.view.id] || 'threequarter'; game.settings.set('viewMode', v); game.setView(v); game.note(game.view.label.toUpperCase() + ' VIEW'); }
function musicFor(fd) { return fd.hoard ? 'hoard' : fd.boss ? 'king' : fd.realm; }

/* ---- the camera: one hero is followed; several share the screen (with a leash) ---- */
function camFrame(snap) {
  const hs = living().filter(h => !h.remote), list = hs.length ? hs : PARTY.filter(h => !h.remote);
  if (!list.length) return;
  const lead = h => isFinite(h.aim) ? h.aim : h.face;
  if (list.length === 1) { game.cam.frame(null); game.focus(list[0].x + Math.cos(lead(list[0])) * 10, list[0].y + Math.sin(lead(list[0])) * 10, 12); }
  else { game.cam.frame(list, { margin: 56, zoom: [.5, .72] }); }
  const xs = list.map(h => h.x), ys = list.map(h => h.y);
  W.cam.x = (Math.min(...xs) + Math.max(...xs)) / 2; W.cam.y = (Math.min(...ys) + Math.max(...ys)) / 2;
  // the visible ground, from the screen's corners (it depends on view, zoom, turn and shape)
  const r = game.r;
  if (r && game.view.toGround) {
    const W0 = r.W, H0 = r.H, z = game.zoom || 1;
    const hw = W0 / 2 / (game.view.scale || 1) / z, hh = H0 / 2 / (game.view.scale || 1) / z / Math.max(.4, game.view.id === 'topdown' ? 1 : .82);
    W.viewHalf = [hw, hh]; W.leash = [Math.max(80, hw - 40), Math.max(50, hh - 34)];
  } else { W.viewHalf = [214, 120]; W.leash = [174, 86]; }
  void snap;
}

/* ---- joining in play: a free controller's Options or 2 on the keyboard; pick a free class on a small overlay ---- */
function joinMidPlay(inp, n) {
  if (PARTY.length >= 4) return;
  const free = HERO_ORDER.filter(c => !PARTY.some(h => h.cls === c));
  const h = makeHero(free[0], PARTY.length, { input: inp });
  h.joinPick = { i: 0, t: 0 };
  PARTY.push(h);
  const ally = living()[0] || W.p.starts[0];
  placeHero(h, ally, 0); h.x += 10; h.body.x = h.x;
  if (!W.map.walkable(Math.floor(h.x / T), Math.floor(h.y / T))) { h.x -= 10; h.body.x = h.x; }
  inp.glyphs = S.padGlyphs;
  happen('join', { pi: h.pi });
}
function joinPickStep(h) {
  const jp = h.joinPick, inp = h.input; jp.t += 1 / 120;
  h.intent = IDLE_INTENT; h.inv = 1;
  const free = HERO_ORDER.filter(c => c === h.cls || !PARTY.some(o => o !== h && o.cls === c));
  if (inp.pressed('left') || inp.pressed('right')) { const k = free.indexOf(h.cls), nk = (k + (inp.pressed('left') ? free.length - 1 : 1)) % free.length; const nh = makeHero(free[nk], h.pi, { input: inp }); Object.assign(h, { cls: nh.cls, D: nh.D, name: nh.name, color: nh.color }); happen('ui', { k: 'move' }); }
  if (jp.t > .4 && (inp.pressed('fire') || inp.pressed('confirm'))) { h.joinPick = null; h.joined = W.t; say('join', h, 2); happen('ui', { k: 'join' }); }
}
function dropOut(pi) {
  const h = PARTY[pi]; if (!h || pi === 0) return;
  game.removePlayer(h.input);
  PARTY.splice(pi, 1); PARTY.forEach((p, i) => { p.pi = i; });
  happen('leave', { pi });
}

/* ---- lights per realm ---- */
function setupLights() {
  const rm = REALMS[W.realm] || REALMS.larder;
  L.enabled = true; L.ambient = rm.ambient; L.dark = W.realm === 'furnace' ? [18, 6, 4] : W.realm === 'ossuary' ? [6, 8, 22] : [12, 6, 16]; L.refresh && L.refresh();
}

// ---- 62-over.js ----
/* 62-over: everyone down -> CONTINUE? 10 -> (rise) or GAME OVER -> initials for each qualifying player (on their own
 * controller) -> the table -> the title. And the ending: the King falls, the heroes cheer, the credits roll, Descent II. */

scenes.over = {
  view: 'threequarter', touch: [],
  enter() { SC.over = { t: 0, phase: 'cont', n: 10, entries: [], cur: null }; NARR.speak(LINES.continue); music(null); },
  update(dt) {
    const o = SC.over; o.t += dt;
    if (o.phase === 'cont') {
      o.n = Math.max(0, 10 - Math.floor(o.t));
      if (o.t > .6 && game.players.some(p => p.pressed('fire') || p.pressed('start') || p.pressed('confirm'))) {
        for (const h of PARTY) { h.alive = false; riseHero(h); }
        for (const h of PARTY) { const s = W.p.starts[h.pi % W.p.starts.length]; h.x = s.x; h.y = s.y; h.body.x = s.x; h.body.y = s.y; }
        game.go('play', {}); return;
      }
      if (o.t >= 10) { o.phase = 'over'; o.t = 0; NARR.speak(LINES.game_over); music('over'); }
      return;
    }
    if (o.phase === 'over') {
      if (o.t > 3) {
        o.phase = 'enter'; o.t = 0;
        o.entries = RUN.cheated || anyCheat() ? [] : PARTY.filter(h => SCORES.qualifies(h.score)).map(h => ({ h, name: [0, 0, 0], i: 0, done: false }));
        if (o.entries.length) { music('name'); NARR.speak(LINES.high_score); } else { game.go('scores', { back: 'title' }); }
      }
      return;
    }
    // initials: each qualifying player on their own controller (or keyboard half)
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!? ';
    for (const e of o.entries) {
      if (e.done) continue;
      const inp = e.h.input || game.input;
      if (inp.repeat('up', .3, .1)) { e.name[e.i] = (e.name[e.i] + 1) % ALPHA.length; happen('ui', { k: 'move' }); }
      if (inp.repeat('down', .3, .1)) { e.name[e.i] = (e.name[e.i] + ALPHA.length - 1) % ALPHA.length; happen('ui', { k: 'move' }); }
      if (inp.pressed('left') && e.i > 0) e.i--;
      if ((inp.pressed('right') || inp.pressed('fire') || inp.pressed('confirm')) && o.t > .4) {
        if (e.i < 2) e.i++; else { e.done = true; const t = Date.now() + e.h.pi; e.t = t; SCORES.add({ name: e.name.map(k => ALPHA[k]).join(''), score: e.h.score, cls: e.h.cls, floor: RUN.deepest, cont: e.h.continues, t }); happen('ui', { k: 'pick' }); }
      }
      if (inp.pressed('cancel') && e.i > 0) e.i--;
    }
    if (o.entries.every(e => e.done)) game.go('scores', { back: 'title', hi: o.entries[0].t });
  },
  draw(r) {
    drawWorld(r);
    r.overlay(g => {
      const o = SC.over, W0 = r.W, H0 = r.H;
      E.ui.box(g, W0 / 2 - 140, H0 / 2 - 60, 280, 120, { bg: ['#2a0a0a', '#0a0202'], border: '#c83a2a', alpha: .92 });
      if (o.phase === 'cont') {
        E.font.title(g, 'CONTINUE?', W0 / 2, H0 / 2 - 48, { scale: 3, colors: ['#ffe0c0', '#e85a3a', '#8a1a0a'], outline: '#120404', depth: 2, align: 'center' });
        E.font.title(g, String(o.n), W0 / 2, H0 / 2 - 14, { scale: 4, colors: ['#ffffff', '#ffd36a', '#c87a2a'], outline: '#120404', depth: 2, align: 'center' });
        otxt(g, 'PRESS ' + game.input.label('fire') + ' TO RISE AGAIN', W0 / 2, H0 / 2 + 30, '#f0e0c8', { align: 'center' });
        txt(g, 'Every hero rises with ' + startHealth() + ' life force. Scores are kept.', W0 / 2, H0 / 2 + 44, '#a89880', { align: 'center' });
      } else if (o.phase === 'over') {
        E.font.title(g, 'GAME OVER', W0 / 2, H0 / 2 - 30, { scale: 3, colors: ['#ffe0c0', '#e85a3a', '#8a1a0a'], outline: '#120404', depth: 2, align: 'center' });
        otxt(g, LINES.game_over, W0 / 2, H0 / 2 + 10, '#f0e0c8', { align: 'center', scale: 1 });
      } else {
        const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!? ';
        otxt(g, 'NAME THYSELF, MORSEL', W0 / 2, H0 / 2 - 52, '#ffe08a', { align: 'center', scale: 2 });
        o.entries.forEach((e, k) => {
          const x = W0 / 2 + (k - (o.entries.length - 1) / 2) * 66, y = H0 / 2 - 20;
          txt(g, e.h.D.name, x, y - 8, e.h.color, { align: 'center' });
          for (let q = 0; q < 3; q++) { const on = q === e.i && !e.done; if (on) { txt(g, '▲', x - 18 + q * 18, y + 2, '#ffe08a', { align: 'center' }); txt(g, '▼', x - 18 + q * 18, y + 30, '#ffe08a', { align: 'center' }); } otxt(g, ALPHA[e.name[q]], x - 18 + q * 18, y + 12, on ? '#ffffff' : '#c8b8a0', { align: 'center', scale: 2 }); }
          txt(g, String(e.h.score), x, y + 42, '#ffe08a', { align: 'center' });
          if (e.done) txt(g, 'SAVED', x, y + 52, '#7ae87a', { align: 'center' });
        });
        txt(g, '↑↓ letter   → / ' + game.input.label('fire') + ' next', W0 / 2, H0 / 2 + 50, '#a89880', { align: 'center' });
      }
    });
  }
};

/* ---- the ending, the credits and Descent II ---- */
scenes.ending = {
  view: 'threequarter', touch: [],
  enter() {
    SC.end = { t: 0, rigs: PARTY.map(h => h.D.rig()), phase: 'story' };
    music('ending'); store.set('d2', true);
    NARR.speak(STORY.ending);
    if (!RUN.cheated && !anyCheat() && !SESSION) for (const h of PARTY) if (SCORES.qualifies(h.score)) SCORES.add({ name: h.D.name.slice(0, 3), score: h.score, cls: h.cls, floor: 9, cont: h.continues, t: Date.now() + h.pi });
  },
  update(dt) {
    const e = SC.end; e.t += dt;
    const any = anyP('fire') || anyP('confirm') || anyP('start') || game.input.clicked();
    if (e.phase === 'story' && (e.t > 14 || (any && e.t > 1.5))) { e.phase = 'credits'; e.t = 0; }
    else if (e.phase === 'credits' && (e.t > 30 || (any && e.t > 1.5))) { e.phase = 'choice'; e.t = 0; e.menu = bigMenu([{ label: 'DESCENT II', go: () => { RUN.loop++; for (const h of PARTY) { h.alive = true; h.hp = Math.max(h.hp, startHealth()); } NARR.speak(STORY.descent2); gotoFloor(0, { card: true }); } }, { label: 'BACK TO THE TITLE', go: () => game.go('title') }], { y: 150 }); NARR.speak(STORY.tag); }
    else if (e.phase === 'choice') { const p = e.menu.update(); if (p) p.go(); }
  },
  draw(r) {
    const e = SC.end;
    drawTitleBack(r, e.t + 5, true);
    r.overlay(g => {
      const W0 = r.W, H0 = r.H;
      e.rigs.forEach((rig, k) => { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer' }); rig.draw(g, W0 / 2 + (k - (e.rigs.length - 1) / 2) * 44, H0 - 40, r.view); });
      px.sprite(g, SPR.gauntletBig, W0 / 2 - 12, H0 - 120 + Math.sin(game.real * 2) * 3);
      if (e.phase === 'story') {
        E.font.title(g, 'THE GAUNTLET IS YOURS', W0 / 2, 14, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
        E.font.wrap(STORY.ending, Math.min(W0 - 40, 380), {}).forEach((l, k) => otxt(g, l, W0 / 2, 40 + k * 10, '#f0e0c8', { align: 'center' }));
        PARTY.forEach((h, k) => otxt(g, h.D.name + '  ' + h.score, W0 / 2, 100 + k * 10, h.color, { align: 'center' }));
      } else if (e.phase === 'credits') {
        const lines = ['GAUNTLETDOWN', '', ...ABOUT.credits.slice(1), '', 'THE HEROES', 'Brakka Ironbelly, the Berserker', 'Hilde Stoutheart, the Shieldmaiden', 'Fenn Quickfletch, the Ranger', 'Old Mother Wix, the Hexer', '', 'THE HUNGRY', 'Hungerghosts, Gnashers, Pot-Lobbers, Cinder Imps,', 'Fryars, Snatchers, the Tithe, and King Famish', '', 'THANK YOU FOR PLAYING', '', STORY.tag];
        const y0 = H0 - e.t * 14;
        lines.forEach((l, k) => { const y = y0 + k * 12; if (y > -10 && y < H0 - 70) otxt(g, l, W0 / 2, y, k === 0 ? '#ffe08a' : /^[A-Z ]+$/.test(l) ? '#e8a840' : '#f0e0c8', { align: 'center', scale: k === 0 ? 2 : 1 }); });
      } else {
        E.font.wrap(STORY.tag, Math.min(W0 - 40, 380), {}).forEach((l, k) => otxt(g, l, W0 / 2, 60 + k * 10, '#f0e0c8', { align: 'center' }));
        e.menu.draw(g, W0);
      }
    });
  }
};

/* ---- the attract mode: a looping demo played by cheating bots; any input goes back to the title ---- */
const ATTRACT = { on: false, seg: 0, t: 0, segs: [
  { kind: 'floor', floor: 'f2', time: 25, banner: 'GNASHERS, MELEE, MAGIC' },
  { kind: 'floor', floor: 'f5', time: 20, banner: 'THE TITHE, THE DINNER BELL, FORCE FIELDS' },
  { kind: 'floor', floor: 'f7', time: 15, banner: 'CINDER IMPS AND LAVA' },
  { kind: 'floor', floor: 'f9', time: 20, banner: 'KING FAMISH', boss: 2 },
  { kind: 'scores', time: 6 }, { kind: 'prologue', time: 8 }, { kind: 'title', time: 4 }] };
function startAttract() { ATTRACT.since = game.real + .2; ATTRACT.on = true; ATTRACT.seg = 0; ATTRACT.t = 0; runAttractSeg(); }
function runAttractSeg() {
  const s = ATTRACT.segs[ATTRACT.seg]; ATTRACT.t = 0;
  if (s.kind === 'floor') {
    PARTY.length = 0;
    HERO_ORDER.forEach((c, i) => PARTY.push(makeHero(c, i, {})));
    reseed(1234 + ATTRACT.seg); RUN.loop = 1; RUN.cheated = true; NARR.reset(true);
    gotoFloor(FLOOR_ORDER.indexOf(s.floor), { attract: true });
    for (const h of PARTY) { h.bot = makeBot(h, { cheat: true }); h.flasks = 3; h.keys = 2; }
    if (s.boss && W.boss) { W.boss.intro = 0; W.boss.hp = W.boss.maxHp * .65; W.boss.phase = 2; }
    if (s.floor === 'f5') { const b = W.items.find(i => i.kind === 'bell'); if (b) { PARTY[3].x = b.x - 30; PARTY[3].y = b.y; PARTY[3].body.x = PARTY[3].x; PARTY[3].body.y = PARTY[3].y; } }
  } else if (s.kind === 'scores') game.go('scores', { attract: true }, { fade: 0 });
  else game.go('attractCard', { kind: s.kind }, { fade: 0 });
}
function attractStep(dt) {
  ATTRACT.t += dt;
  const s = ATTRACT.segs[ATTRACT.seg];
  if (rawInput(ATTRACT.since) || game.input.anyPressed() || game.input.clicked() || game.players.some(p => p.padMove && Math.hypot(p.padMove[0], p.padMove[1]) > .4) || (game.input.pointer() && IDLE.px && Math.hypot(game.input.pointer()[0] - IDLE.px[0], game.input.pointer()[1] - IDLE.px[1]) > 4)) { stopAttract(); return; }
  if (s.kind === 'floor' && W) {   // the director: no quiet screens; an invulnerable party; a hop when stuck
    if (W.mons.length < 10 && ATTRACT.t % 3 < dt) for (let i = 0; i < 4; i++) { const h = PARTY[i % 4], a = R() * TAU, x = h.x + Math.cos(a) * 60, y = h.y + Math.sin(a) * 60; if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) spawnMon(Rpick(['gnasher', 'ghost', 'imp', 'lobber']), x, y, 2, { awake: true, emerge: true }); }
    for (const h of PARTY) { if (!h.alive) riseHero(h, { free: true }); h.hp = Math.max(h.hp, 500); }
    if (W.done) { W.done = null; W.doneT = 0; }
  }
  if (ATTRACT.t >= s.time) { ATTRACT.seg = (ATTRACT.seg + 1) % ATTRACT.segs.length; runAttractSeg(); }
}
function stopAttract() { ATTRACT.on = false; game.input.consumeAll(); for (const p of game.players) p.consumeAll(); IDLE.t = 0; IDLE.px = game.input.pointer(); PARTY.length = 0; game.go('title', {}, { fade: 0 }); }
scenes.attractCard = {
  view: 'threequarter', touch: [],
  enter(d) { SC.ac = { kind: d.kind, t: 0 }; if (d.kind === 'title') music('title'); },
  update(dt) { SC.ac.t += dt; attractStep(dt); },
  draw(r) {
    drawTitleBack(r, SC.ac.t + 2, SC.ac.kind !== 'title');
    r.overlay(g => {
      const W0 = r.W, H0 = r.H;
      if (SC.ac.kind === 'prologue') { const lines = E.font.wrap(STORY.prologue, Math.min(W0 - 40, 380), {}); const n = Math.min(lines.length, Math.floor(SC.ac.t * 2.2) + 1); lines.slice(0, n).forEach((l, k) => otxt(g, l, W0 / 2, 30 + k * 11, '#f0e0c8', { align: 'center' })); }
      else drawTitleFront(g, r);
      drawDemoBanner(g, r);
    });
  }
};
function drawDemoBanner(g, r) {
  const s = ATTRACT.segs[ATTRACT.seg];
  px.rect(g, 0, r.H - 22, r.W, 22, '#000000');
  otxt(g, 'DEMO' + (s.banner ? ':  ' + s.banner : ''), 8, r.H - 16, '#ffd84a');
  if (Math.floor(game.real * 2) % 2 === 0) otxt(g, 'PRESS ANY BUTTON', r.W - 8, r.H - 16, '#ffffff', { align: 'right' });
}

// ---- 70-dev.js ----
/* 70-dev: Dev Tools, from the pause menu (never in sessions or the attract mode). Four pages: Cheats, Warp, Give and
 * spawn, Tuning (a live slider for each balance number and Reset to defaults). Controller, keys and mouse. */

const DEV = { open: false, page: 0, row: 0, scroll: 0, spawnType: 'gnasher', spawnRank: 2, hover: -1, msg: '', msgT: 0 };
const DEV_PAGES = ['CHEATS', 'WARP', 'GIVE AND SPAWN', 'TUNING'];
const devNote = m => { DEV.msg = m; DEV.msgT = 2; };
const cheatRow = (label, k) => ({ label, type: 'toggle', get: () => CHEAT[k], set: v => { CHEAT[k] = v; if (v && k !== 'hitboxes' && k !== 'flow' && k !== 'net' && k !== 'bot') RUN.cheated = true; if (k === 'botP1' && PARTY[0]) PARTY[0].bot = v ? makeBot(PARTY[0]) : null; } });
function devRows() {
  const P = DEV.page;
  if (P === 0) return [
    cheatRow('God mode (no damage, no drain)', 'god'), cheatRow('Noclip', 'noclip'), cheatRow('Infinite keys and flasks', 'infinite'), cheatRow('Freeze monsters', 'freeze'),
    cheatRow('One-hit kills', 'onehit'), cheatRow('Generators off', 'noGens'), cheatRow('Show hitboxes', 'hitboxes'), cheatRow('Show flow field', 'flow'),
    cheatRow('Show net stats', 'net'), cheatRow('Show bot thoughts', 'bot'), cheatRow('Bot plays player 1', 'botP1'),
    { label: 'Time scale', type: 'select', opts: [.25, .5, 1, 2], get: () => game.timeScale, set: v => { game.timeScale = v; } }
  ];
  if (P === 1) return [
    ...FLOOR_ORDER.map((id, i) => ({ label: (get('floors', id).no ? 'Floor ' + get('floors', id).no + ': ' : 'Treasure: ') + get('floors', id).name, type: 'action', act: () => devWarp(i) })),
    { label: 'Boss phase 2', type: 'action', act: () => { devWarp(FLOOR_ORDER.length - 1); W.boss.intro = 0; W.boss.hp = W.boss.maxHp * .69; } },
    { label: 'Boss phase 3', type: 'action', act: () => { devWarp(FLOOR_ORDER.length - 1); W.boss.intro = 0; W.boss.hp = W.boss.maxHp * .34; } },
    { label: 'The ending', type: 'action', act: () => { DEV.open = false; game.go('ending', {}); } },
    { label: 'Game over', type: 'action', act: () => { DEV.open = false; for (const h of PARTY) heroFalls(h); } },
    { label: 'Descent II', type: 'action', act: () => { DEV.open = false; RUN.loop = 2; RUN.cheated = true; gotoFloor(0, { card: true }); } },
    { label: 'Restart floor', type: 'action', act: () => devWarp(RUN.floorIdx) }
  ];
  if (P === 2) {
    const h = PARTY[0];
    return [
      { label: '+3 keys', type: 'action', act: () => { h.keys = Math.min(limitOf(h), h.keys + 3); RUN.cheated = true; } },
      { label: '+3 Blast Flasks', type: 'action', act: () => { h.flasks = Math.min(limitOf(h), h.flasks + 3); RUN.cheated = true; } },
      { label: 'Drop a roast', type: 'action', act: () => { dropItem('roast', h.x + 14, h.y); RUN.cheated = true; } },
      { label: 'Drop a spoiled stew', type: 'action', act: () => { dropItem('stew', h.x + 14, h.y); } },
      ...Object.keys(AMULETS).map(k => ({ label: 'Amulet: ' + AMULETS[k].name, type: 'action', act: () => { h.amulet = k; h.amuletT = AMULET_TIME; RUN.cheated = true; } })),
      { label: 'Every special potion', type: 'action', act: () => { for (const k in SPECIALS) h.specials[k] = true; RUN.cheated = true; } },
      { label: '+1000 score', type: 'action', act: () => { h.score += 1000; RUN.cheated = true; } },
      { label: 'Heal the party', type: 'action', act: () => { for (const p of PARTY) if (p.alive) p.hp = Math.max(p.hp, startHealth()); RUN.cheated = true; } },
      { label: 'Monster type', type: 'select', opts: Object.keys(REG.monsters), get: () => DEV.spawnType, set: v => { DEV.spawnType = v; } },
      { label: 'Monster rank', type: 'select', opts: [1, 2, 3], get: () => DEV.spawnRank, set: v => { DEV.spawnRank = v; } },
      { label: 'Spawn 5 here', type: 'action', act: () => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, x = h.x + Math.cos(a) * 40, y = h.y + Math.sin(a) * 40; if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) spawnMon(DEV.spawnType, x, y, DEV.spawnRank, { awake: true, emerge: true }); } } },
      { label: 'Spawn a generator here', type: 'action', act: () => { const x = h.x + 30, y = h.y; if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) W.gens.push({ id: nid(), type: Object.keys(GEN_CHAR).map(c => GEN_CHAR[c]).find(g => get('gens', g).spawns === DEV.spawnType) || 'den', x, y, r: 7, rank: DEV.spawnRank, rank0: DEV.spawnRank, hp: genMaxHp(DEV.spawnRank), t: 1, kids: 0, shake: 0 }); } },
      { label: 'Kill every monster', type: 'action', act: () => { for (const m of W.mons) killMon(m, null); } },
      { label: 'Destroy every generator', type: 'action', act: () => { for (const g of W.gens) hurtGen(g, 999, null); } },
      { label: 'Open every door', type: 'action', act: () => { for (const g of W.doorGroups) if (!g.open) openDoors(g, null); } },
      { label: 'Reveal secrets', type: 'action', act: () => { for (const f of W.fakes) if (!f.open) { f.open = true; W.map.set(f.cx, f.cy, 0); } } },
      { label: 'Next impatience stage', type: 'action', act: () => { W.t = [TUNE.impatience - 30, TUNE.impatience, TUNE.impatience + 60][Math.min(2, W.stage)] + .01; } },
      { label: 'Start the attract mode now', type: 'action', act: () => { DEV.open = false; game.resume(); startAttract(); } }
    ];
  }
  return [
    ...TUNE_SPEC.map(([k, label, , lo, hi, st]) => ({ label, type: 'slider', lo, hi, st, get: () => TUNE[k], set: v => { setTune(k, v); RUN.cheated = RUN.cheated || TUNE[k] !== TUNE_DEFAULT[k]; } })),
    { label: 'Reset tuning to defaults', type: 'action', act: () => { resetTune(); devNote('TUNING RESET'); } }
  ];
}
function devWarp(i) { DEV.open = false; for (const h of PARTY) { if (!h.alive) { h.alive = true; h.hp = startHealth(); } } RUN.cheated = true; gotoFloor(i, { card: false }); }
function openDev() { if (SESSION || (SC.play && SC.play.attract) || game.sceneName !== 'play') return; game.resume(); DEV.open = true; DEV.row = 0; game.input.consumeAll(); }

function devUpdate(dt) {
  const I = game.input, rows = devRows(), n = rows.length + 1;   // row 0 is the page tabs
  DEV.msgT -= dt;
  const anyP = a => game.players.some(p => p.pressed(a)), rep = a => game.players.some(p => p.repeat(a, .3, .07));
  if (anyP('cancel') || anyP('pause')) { DEV.open = false; I.consumeAll(); happen('ui', { k: 'back' }); return; }
  if (rep('up')) { DEV.row = (DEV.row + n - 1) % n; happen('ui', { k: 'move' }); }
  if (rep('down')) { DEV.row = (DEV.row + 1) % n; happen('ui', { k: 'move' }); }
  if (anyP('magic')) { DEV.page = (DEV.page + 1) % 4; DEV.row = 0; }
  const lr = rep('left') ? -1 : rep('right') ? 1 : 0;
  // the mouse: hover focuses, a click picks (the tabs, a row, a slider's halves)
  const ptr = I.pointer(), clk = I.clicked(), L = devLayout();
  if (ptr && (ptr[0] !== DEV.px || ptr[1] !== DEV.py)) { DEV.px = ptr[0]; DEV.py = ptr[1]; const hr = devHit(L, ptr); if (hr !== null && hr.row !== undefined) DEV.row = hr.row; }
  if (clk) { const hr = devHit(L, clk); if (hr) { if (hr.tab !== undefined) { DEV.page = hr.tab; DEV.row = 0; } else { DEV.row = hr.row; devAct(rows[hr.row - 1], hr.side || 0, true); } } }
  if (DEV.row === 0) { if (lr) { DEV.page = (DEV.page + 4 + lr) % 4; happen('ui', { k: 'move' }); } return; }
  const row = rows[DEV.row - 1]; if (!row) { DEV.row = 0; return; }
  if (lr) devAct(row, lr, false);
  if (anyP('confirm')) devAct(row, 0, true);
}
function devAct(row, dir, pick) {
  if (!row) return;
  if (row.type === 'toggle' && (pick || dir)) { row.set(!row.get()); happen('ui', { k: 'pick' }); }
  else if (row.type === 'action' && pick) { row.act(); happen('ui', { k: 'pick' }); if (DEV.open) devNote(row.label.toUpperCase()); }
  else if (row.type === 'select') { const o = row.opts, i = o.indexOf(row.get()); row.set(o[(i + (dir || 1) + o.length) % o.length]); happen('ui', { k: 'move' }); }
  else if (row.type === 'slider' && dir) { row.set(row.get() + dir * row.st * (row.hi - row.lo > 100 ? 2 : 1)); happen('ui', { k: 'move' }); }
}
function devLayout(r0) {
  const r = r0 || game.r || { W: 427, H: 240 }, w = Math.min(r.W - 16, 380), x = Math.round((r.W - w) / 2), y = 14, rowH = 12, vis = Math.floor((r.H - y - 52) / rowH);
  return { x, y, w, rowH, vis, tabsY: y + 18, listY: y + 34 };
}
function devHit(L, [px_, py_]) {
  if (py_ >= L.tabsY && py_ < L.tabsY + 12) { const tw = L.w / 4, i = Math.floor((px_ - L.x) / tw); if (i >= 0 && i < 4) return { tab: i, row: 0 }; }
  const i = Math.floor((py_ - L.listY) / L.rowH) + DEV.scroll; const rows = devRows();
  if (py_ >= L.listY && i >= 0 && i < rows.length && px_ > L.x && px_ < L.x + L.w) return { row: i + 1, side: px_ < L.x + L.w * .78 ? -1 : 1 };
  return null;
}
function devDraw(r) {
  r.overlay(g => {
    const L = devLayout(r), rows = devRows(), H = L.vis * L.rowH + 50;
    if (DEV.row > 0) { const ri = DEV.row - 1; if (ri < DEV.scroll) DEV.scroll = ri; if (ri >= DEV.scroll + L.vis) DEV.scroll = ri - L.vis + 1; } else DEV.scroll = 0;
    E.ui.box(g, L.x - 4, L.y - 4, L.w + 8, H + 10, { bg: ['#1a1428', '#0a0812'], border: '#e8c04a' });
    otxt(g, 'DEV TOOLS', L.x + L.w / 2, L.y, '#ffd84a', { align: 'center', scale: 1 });
    DEV_PAGES.forEach((p, i) => { const tw = L.w / 4, on = DEV.page === i; if (on) px.rect(g, L.x + i * tw + 1, L.tabsY - 2, tw - 2, 11, DEV.row === 0 ? '#e8c04a' : '#5a4a2a'); txt(g, p, L.x + i * tw + tw / 2, L.tabsY, on && DEV.row === 0 ? '#1a1020' : '#f0e8d8', { align: 'center' }); });
    for (let k = 0; k < L.vis && k + DEV.scroll < rows.length; k++) {
      const i = k + DEV.scroll, row = rows[i], y = L.listY + k * L.rowH, on = DEV.row === i + 1;
      if (on) px.rect(g, L.x, y - 2, L.w, L.rowH - 1, '#3a2e5a');
      txt(g, row.label, L.x + 6, y, on ? '#ffffff' : '#c8c0d8');
      const vx = L.x + L.w - 6;
      if (row.type === 'toggle') txt(g, row.get() ? 'ON' : 'OFF', vx, y, row.get() ? '#7ae87a' : '#8a8098', { align: 'right' });
      else if (row.type === 'select') txt(g, '< ' + String(row.get()).toUpperCase() + ' >', vx, y, '#ffd84a', { align: 'right' });
      else if (row.type === 'slider') { const v = row.get(), f = (v - row.lo) / (row.hi - row.lo), bw = 70; E.ui.bar(g, vx - bw - 34, y + 1, bw, 5, f, '#e8c04a'); txt(g, String(+v.toFixed(2)), vx, y, '#ffd84a', { align: 'right' }); }
      else txt(g, '▸', vx, y, '#e8c04a', { align: 'right' });
    }
    if (rows.length > L.vis) txt(g, (DEV.scroll + 1) + '-' + Math.min(rows.length, DEV.scroll + L.vis) + ' of ' + rows.length, L.x + L.w - 4, L.y + H - 4, '#8a8098', { align: 'right' });
    const I = game.input;
    txt(g, '↑↓ choose   ←→ change   ' + I.label('confirm') + ' pick   ' + I.label('magic') + ' next page   ' + I.label('cancel') + ' close', L.x + 4, L.y + H - 4, '#a898c8');
    if (DEV.msgT > 0) otxt(g, DEV.msg, L.x + L.w / 2, L.y + H + 10, '#7ae87a', { align: 'center' });
  });
}

// ---- 80-debug.js ----
/* 80-debug: the pause menu's items, its How to Play (the shell's help screen), and game.debug for tests and tools. */

function menuItems() {
  if (SESSION) return [];
  const playing = game.sceneName === 'play' && !(SC.play && SC.play.attract);
  return [
    playing && ['Dev Tools', () => openDev()],
    playing && ['Restart floor', () => { game.resume(); for (const h of PARTY) if (!h.alive) { h.alive = true; h.hp = startHealth(); } gotoFloor(RUN.floorIdx, { card: false }); }],
    playing && game.pausedBy > 1 && PARTY[game.pausedBy - 1] && ['Drop out (P' + game.pausedBy + ')', () => { dropOut(game.pausedBy - 1); game.resume(); }]
  ].filter(Boolean);
}
// the pause menu's How to Play: the same eight cards, with the player's own keys
const shell = new E.Shell(game, { theme: { accent: '#e8a840', paper: '#1e1410', ink: '#f4e8d8', muted: '#b8a890' }, screens: { help: {
  title: 'How to Play',
  keys: () => { const I = game.input; return [[I.lastDevice === 'gamepad' ? 'L stick' : 'WASD', 'Move'], [I.lastDevice === 'gamepad' ? 'R stick' : 'Mouse', 'Aim'], [I.label('fire'), 'Fire (hold); strikes up close'], [I.label('magic'), 'Magic: a Blast Flask'], [I.label('plant'), 'Plant: stand and shoot'], [I.label('pause'), 'Pause']]; },
  sections: () => HOWTO.map(([h, t]) => [h, fillKeys(t)])
} } });

/* ---- game.debug: the tests' and tools' handle ---- */
function snapshot() {
  return {
    scene: game.sceneName, mode: SESSION ? 'session' : RUN.mode, floor: W ? W.id : null, no: W ? W.no : null, t: W ? +W.t.toFixed(2) : 0, loop: RUN.loop, idx: RUN.floorIdx,
    heroes: PARTY.map(h => ({ cls: h.cls, x: Math.round(h.x), y: Math.round(h.y), hp: h.hp, score: h.score, keys: h.keys, flasks: h.flasks, amulet: h.amulet, specials: Object.keys(h.specials), alive: h.alive, stunned: h.stun > 0, queasy: h.queasy > 0, continues: h.continues, menu: h.menu > 0 })),
    monsters: W ? { total: W.mons.length, byType: W.mons.reduce((a, m) => (a[m.type] = (a[m.type] || 0) + 1, a), {}) } : null,
    generators: W ? W.gens.length : 0, items: W ? W.items.length : 0, doors: W ? W.doorGroups.map(g => g.open) : [], impatience: W ? W.stage : 0,
    boss: W && W.boss ? { hp: Math.round(W.boss.hp), max: W.boss.maxHp, phase: W.boss.phase, alive: W.boss.alive, state: W.boss.state } : null,
    done: W ? W.done : null, narrator: NARR.last, caption: NARR.cur ? NARR.cur.text : null, attract: ATTRACT.on, touchOnly: TOUCH.only, dev: DEV.open, cheated: RUN.cheated,
    net: NET.stats(), errors: game.errors.length
  };
}
function stateHash() {
  let h = 2166136261 >>> 0;
  const mix = v => { h ^= (Math.round(v * 16) | 0); h = Math.imul(h, 16777619) >>> 0; };
  if (W) { mix(W.t); for (const x of PARTY) { mix(x.x); mix(x.y); mix(x.hp); mix(x.score); } for (const m of W.mons) { mix(m.x); mix(m.y); mix(m.hp); } mix(W.items.length); }
  return h.toString(16);
}
game.debug = {
  snapshot, stateHash,
  teleport(x, y) { const h = PARTY[0]; if (!h) return; h.x = x; h.y = y; h.body.x = x; h.body.y = y; },
  warp(i) { gotoFloor(typeof i === 'string' ? FLOOR_ORDER.indexOf(i) : i, { card: false }); },
  give(what, n = 1, pi = 0) { const h = PARTY[pi]; if (!h) return; if (what === 'key') h.keys += n; else if (what === 'flask') h.flasks += n; else if (what === 'hp') h.hp += n; else if (SPECIALS[what]) h.specials[what] = true; else if (AMULETS[what]) { h.amulet = what; h.amuletT = AMULET_TIME; } },
  spawn(type, x, y, rank = 1) { return spawnMon(type, x, y, rank, { awake: true }); },
  drop(kind, x, y, sub) { return dropItem(kind, x, y, sub); },
  setTune, resetTune, TUNE, CHEAT, PARTY, get W() { return W; }, RUN, NARR, DEV, ATTRACT, SCORES, TOUCH, NET, SESSIONS: null,
  bot(pi = 0, on = true, cheat = false, o = {}) { const h = PARTY[pi]; if (h) h.bot = on ? makeBot(h, { cheat, ...o }) : null; },
  start(classes, o) { startDescent(classes, o); }, gotoFloor, validateFloor, deadContent, floors: () => FLOOR_ORDER.map(id => get('floors', id)),
  // a test arena: an open floor of the given rows (or a plain room), played at once with the party
  arena(rows, meta = {}) {
    const R0 = rows || ['########################################', ...Array.from({ length: 18 }, (_, i) => '#' + (i === 1 ? '@@' : '..') + '....................................#'), '########################################'];
    def('floors', 'arena', Object.assign({ name: 'ARENA', realm: 'larder', no: 1, rank: 1, genRank: 1, par: 120 }, meta, { rows: R0 }));
    newWorld('arena', {}); if (game.sceneName !== 'play') game.go('play', {}, { fade: 0 }); return W;
  },
  openDev, devRows, devAct, menuItems, LINES, HOWTO, ABOUT, SOURCE_INFO, FEEDBACK, AIHUB_ENTRY, voiceSay, SONGS, SFX
};

// ---- 99-start.js ----
/* 99-start: boot steps, then the title (or, in an AI Hub session, straight into the round). */
game.start({
  scenes, scene: SESSION ? 'sboot' : 'title',
  boot: { title: 'GAUNTLETDOWN', version: VERSION, steps: [
    ['Digging the Gaunt', () => { for (const id of FLOOR_ORDER) { const e = validateFloor(get('floors', id)); if (e.length) game.fail('floor ' + id, new Error(e.join('; '))); } }],
    ['Setting the table', () => { buildArt(); }],
    ['Waking the ghosts', () => { for (const c of HERO_ORDER) get('heroes', c).rig(); }]
  ], messages: ['Salting the larder', 'Sharpening the forks', 'Counting the bones', 'Stoking the furnace'] }
});

})();
