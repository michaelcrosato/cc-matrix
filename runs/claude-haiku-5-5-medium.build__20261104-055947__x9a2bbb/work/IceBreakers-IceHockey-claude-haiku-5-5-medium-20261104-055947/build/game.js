// ICE BREAKERS: the game's shell. The core loop, in one sentence: skate, dangle and rip the puck past the goalie while
// you hammer rivals through the glass; fill your team's BOOM meter to go KABOOM; win the scrap when the gloves drop;
// outscore them before the final horn.
(() => {
'use strict';
const E = My3D2dge, { clamp, lerp, approach, px } = E, PI = Math.PI, TAU = Math.PI * 2;
const HUB = !!(window.AIHub && AIHub.active);

// the controls: the default preset's moves and menu keys, with the hockey buttons of its own (keyboard, mouse, pad)
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'],
  lob: ['KeyI', 'Mouse1', 'Pad3'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'],
  switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];

const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: KEYS, bg: '#07060d', id: 'ice-breakers',
  menu: HUB ? { items: [], quit: false } : { items: [['Objectives & Info', () => game.go('about', { from: 'match' })], ['Dev Mode', () => game.go('dev', { from: game.sceneName })]],
    settings: [{ key: 'flood', label: 'Flood Wagon', options: ['Ask', 'Always', 'Never'], value: 'Ask' }, { key: 'intros', label: 'Player intros', options: ['On', 'Off'], value: 'On' }, { key: 'replays', label: 'Replays', options: ['Auto', 'Off'], value: 'Auto' }],
    controls: { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp', switch: 'Switch player', camera: 'Camera' },
    quit: 'title' }, autoPause: !HUB });
const A = game.audio, P = game.particles, scenes = {};
game.input.glyphs = 'playstation';   // (the PlayStation symbols; the Controls screen's Button symbols can show Xbox's A B X Y instead)
const store = { get: (k, d) => E.store.get('ice:' + k, d), set: (k, v) => E.store.set('ice:' + k, v) };
// a prompt in the player's own controls, drawn for the device used last (keyboard keys, mouse buttons, pad symbols)
const prompt = (a, word) => game.input.label(a) + ' ' + word;
const DEV_OK = () => game.input.lastDevice !== 'touch';
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0');
// the seeded random for the simulation: one stream per match (a seed given by the story, the exhibition's own seed)
let simRng = E.rng(1);
const srand = () => simRng();
const pick = (arr, v) => arr[Math.max(0, Math.min(arr.length - 1, v))];

/* ---- DATA: teams, arenas, the Cup Run, the text pools. Everything a designer would tune by hand lives here. ---- */
// ratings 1-5: spd (skating), sht (shooting), pas (passing), hit (checking), fgt (fighting), hnd (puck handling);
// goalies: rfx (reflexes), size (coverage), reb (how often a save rebounds)
const TEAMS = [
  { id: 'tundra', name: 'TUNDRA TROUT', home: '#1d4f8a', away: '#eef4ff', trim: '#f2c14e', hair: ['#3a2418', '#e8c070', '#1e1c1a'],
    skin: ['#c89070', '#f0c8a8', '#a87050'], rate: { spd: 3, sht: 3, pas: 3, hit: 3, fgt: 3, hnd: 3 }, goalie: { rfx: 3, size: 3, reb: 2 },
    skaters: ['MARGE', 'DOUG', 'NOOR'], goalieName: 'BJORN', chip: '#f2c14e' },
  { id: 'bruisers', name: 'BRUISERS', home: '#8a1f22', away: '#f6e8e4', trim: '#e8c070', hair: ['#2a1a14', '#8a4a20', '#1e1c1a'],
    skin: ['#e0b090', '#a87050', '#6a4028'], rate: { spd: 2, sht: 2, pas: 2, hit: 5, fgt: 5, hnd: 2 }, goalie: { rfx: 2, size: 4, reb: 3 },
    skaters: ['DRAGO', 'KIT', 'BRICK'], goalieName: 'TANK', chip: '#8a1f22' },
  { id: 'hornets', name: 'HORNETS', home: '#e0b020', away: '#fffbe8', trim: '#1a1a1e', hair: ['#1e1c1a', '#c8a050', '#6a3a22'],
    skin: ['#f0c8a8', '#c89070', '#8a5a3a'], rate: { spd: 5, sht: 4, pas: 4, hit: 2, fgt: 2, hnd: 4 }, goalie: { rfx: 4, size: 2, reb: 2 },
    skaters: ['ZIPPY', 'BEX', 'ROSA'], goalieName: 'ARI', chip: '#e0b020' },
  { id: 'lumberjacks', name: 'LUMBERJACKS', home: '#2e7a3a', away: '#eef6e8', trim: '#c8502a', hair: ['#5a3a2a', '#2a1a14', '#8a6a4a'],
    skin: ['#e0b090', '#a87050', '#f0d0b0'], rate: { spd: 2, sht: 4, pas: 3, hit: 4, fgt: 4, hnd: 3 }, goalie: { rfx: 3, size: 5, reb: 4 },
    skaters: ['HAL', 'PEG', 'OLLIE'], goalieName: 'MOOSE', chip: '#2e7a3a' },
  { id: 'owls', name: 'NIGHT OWLS', home: '#2a1f5a', away: '#e8e4f8', trim: '#b8a8f0', hair: ['#3a3a4a', '#c8c8d8', '#1e1c1a'],
    skin: ['#c89070', '#8a5a3a', '#f0c8a8'], rate: { spd: 4, sht: 5, pas: 5, hit: 2, fgt: 2, hnd: 5 }, goalie: { rfx: 5, size: 2, reb: 1 },
    skaters: ['VEX', 'NYX', 'ODIN'], goalieName: 'LUNA', chip: '#7a68c8' },
  { id: 'monkeys', name: 'BRASS MONKEYS', home: '#c87020', away: '#fff4e0', trim: '#2a1a14', hair: ['#1e1c1a', '#8a4a20', '#e8c070'],
    skin: ['#a87050', '#6a4028', '#e0b090'], rate: { spd: 4, sht: 4, pas: 4, hit: 4, fgt: 5, hnd: 4 }, goalie: { rfx: 4, size: 4, reb: 3 },
    skaters: ['BRASS', 'GUS', 'MONK'], goalieName: 'BIG JIM', chip: '#c87020' }
];

// the five arenas: the ice, the boards, the crowd, the air, the organ's song
const ARENAS = [
  { id: 'icebox', name: "OL' ICEBOX", ice: [206, 222, 236], boardTop: '#c09060', boardSide: '#6a4a2a', glass: '#bfe4f4', lights: '#ffe0a0', snow: false, crowd: ['#c8502a', '#2a5ab8', '#eef0f6'], blurb: 'A barn with a sheet of ice in it. The rafters have hockey sticks in them.' },
  { id: 'dome', name: 'TUNDRA DOME', ice: [222, 234, 246], boardTop: '#4a6a9a', boardSide: '#2a3a5a', glass: '#c8f0ff', lights: '#9ec8ff', snow: false, crowd: ['#2a5ab8', '#ffffff', '#1d4f8a'], blurb: 'A steel dome, bright as a dentist. The scoreboard is the size of a bus.' },
  { id: 'pond', name: 'MILL POND', ice: [214, 230, 240], boardTop: '#f2f6fb', boardSide: '#b8c4d4', glass: '#eef6ff', lights: '#fff4d0', snow: true, crowd: ['#7a5a3a', '#e8e0d0', '#3a6a3a'], blurb: 'An outdoor rink on the millpond. It snows. It always snows here.' },
  { id: 'yard', name: 'LUMBER YARD ARENA', ice: [210, 226, 238], boardTop: '#a04a2a', boardSide: '#5a2a18', glass: '#e0f4ff', lights: '#ffd0a0', snow: false, crowd: ['#2e7a3a', '#c8502a', '#eef6e8'], blurb: 'Brick, sawdust and a smell of cedar. The seats are the stacked logs.' },
  { id: 'vault', name: 'THE VAULT', ice: [188, 204, 222], boardTop: '#3a3a4a', boardSide: '#1a1a24', glass: '#8fb0d8', lights: '#ff5a4a', snow: false, crowd: ['#2a2a3a', '#8a1f22', '#5a5a6a'], blurb: 'Under the old bank. The ice is grey and the red lights come on for every goal.' }
];

// the Cup Run: five games, each with an intro (cutscene lines), a choice, and a result line
const STORY = [
  { rival: 1, arena: 0, title: 'THE FIRST GAME', intro: ['OL\' ICEBOX. THE BRUISERS HAVE A REPUTATION FOR HITTING THINGS.', 'COACH MARGE SAYS: KEEP YOUR HEAD UP AND YOUR CHIN OUT OF THE WAY.'],
    choice: { q: 'The Bruisers chirp you in the warm-up. Answer?', a: ['Chirp back (BOOM +20 to start)', { boom: 20 }], b: ['Ignore it (goalie +1 reflexes)', { goalie: 1 }] },
    win: 'THE TROUT TAKE THE FIRST ONE. DRAGO SAYS IT WAS A FLUKE. IT WAS NOT A FLUKE.' },
  { rival: 2, arena: 1, title: 'THE DOME', intro: ['THE HORNETS ARE FAST AND THEY KNOW IT. THEY SKATE LIKE THEY OWE SOMEBODY MONEY.', 'THE ICE IN THE DOME IS SLICK. BE SMART ABOUT WHERE YOU STOP.'],
    choice: { q: 'The Hornets want a race. Take the bet?', a: ['Take the race (turbo +)', { turbo: 1 }], b: ['Pass on it (stick, more shots)', { shot: 1 }] },
    win: 'THE DOME GOES QUIET FOR ONE SECOND, THEN ERUPTS. THE HORNETS ARE STUNG.' },
  { rival: 3, arena: 2, title: 'MILL POND', intro: ['IT IS SNOWING ON THE POND. THE LUMBERJACKS SAY SNOW IS GOOD FOR THE PAINT.', 'THEIR GOALIE IS THE SIZE OF A VENDING MACHINE.'],
    choice: { q: 'The Lumberjacks are big. Hit them first?', a: ['Hit first (checks +)', { hit: 1 }], b: ['Wait for them (defend)', { defend: 1 }] },
    win: 'THE TROUT PAINT THE POND WITH WHATEVER THE LUMBERJACKS HAD LEFT.' },
  { rival: 4, arena: 3, title: 'THE LUMBER YARD', intro: ['THE NIGHT OWLS DO NOT SKATE. THEY GLIDE, AND THEN THEY HURT YOU.', 'THEIR GOALIE LUNA SEES THE PUCK BEFORE IT IS SHOT. NOBODY KNOWS HOW.'],
    choice: { q: 'Luna is unbeatable? Try her anyway?', a: ['Shoot early (shots +)', { shot: 1 }], b: ['Go for the screen (goalie -)', { goalie: -1 }] },
    win: 'THE OWLS FLAP OFF INTO THE NIGHT AND THE TROUT HAVE THE PUCK IN THE END.' },
  { rival: 5, arena: 4, title: 'THE FINAL: THE VAULT', intro: ['THE BRASS MONKEYS ARE THE FINAL OPPONENT. THEY BRING A BRASS BAND AND A GRUDGE.', 'THIS IS WHERE THE CUP IS KEPT. EVERY GOAL TURNS THE LIGHTS RED.'],
    choice: { q: 'The Monkeys want a fight. Give them one?', a: ['Drop the gloves (fight +)', { fight: 1 }], b: ['Keep it on the ice (hit -)', { hit: -1 }] },
    win: 'THE CUP IS KEPT IN THE VAULT. THE TROUT HAVE IT NOW. THE LIGHTS STAY RED.' }
];

// the commentary booth: lines by event, in its own jargon; the chirps; the three stars; the credits
const TEXT = {
  goal: ['SHOT! IN! IN! IN!', 'THAT ONE WENT UP AND IN LIKE A BAD DECISION.', 'THE HORN! THE HORN! THE HORN!', 'SCORED FROM THE SLOT. NO ONE TOLD THE GOALIE.', 'THE TOP SHELF. THAT IS WHERE THE BIG ONES LIVE.'],
  save: ['SAVE! THE GOALIE KEEPS HIS HEAD AND HIS GLOVE!', 'NOTHING GETS THROUGH THAT. NOTHING.', 'BIG STICK, BIGGER SAVE.'],
  hit: ['BIG HIT! HE NEVER SAW IT COMING!', 'THAT ONE RANG THE BOARDS LIKE A BELL!', 'OHHH! THE CROWD FEELS THAT ONE!'],
  glass: ['THE GLASS IS GONE! THE GLASS IS GONE!', 'THAT PANEL WAS OLD ANYWAY.', 'SHATTERED. THE TECHS ARE GOING TO BE BUSY.'],
  fight: ['THE GLOVES ARE DOWN!', 'THEY WANT TO SETTLE THIS THE OLD WAY.', 'THE REFEREE IS STAYING OUT OF THIS ONE.'],
  kaboom: ['KABOOM MODE! THE PUCK IS ON FIRE!', 'THE BOOM METER IS FULL! HERE IT COMES!'],
  chirp: ['NICE SKATE, GRANDMA.', 'YOUR GOALIE PLAYS LIKE A TOASTER.', 'IS THAT THE PUCK OR A FLY?', 'YOUR DAD PLAYS BETTER THAN THAT.', 'I HAVE SEEN BETTER DEKES AT A YARD SALE.'],
  period: ['END OF THE PERIOD. TAKE A BREATH, AND A PICTURE OF THE ICE RESURFACER.', 'THE FLOOD WAGON IS OUT. THE ICE IS PERFECT NOW.'],
  stars: ['FIRST STAR: THE ONE WHO SCORED FIRST, THE ONE WHO SCORED MOST, THE HERO ON THE OTHER END.'],
  credits: ['ICE BREAKERS', 'a 3-on-3 arcade hockey game for a TV at ten feet', 'Made with the my-3D2dge engine (v0.85.2, the handoff package)', 'Every sound, voice and song is written in code: no audio files', 'Every sprite, rink and rig is drawn by code', 'Thanks to the Flood Wagon, the Ol\' Icebox organ, and every goalie who kept their head up']
};

// the babble voices: Animalese-style gibberish, one pitch per speaker
const BABBLE = [['babbleA', 'square', 460], ['babbleB', 'triangle', 640], ['babbleC', 'square', 340]];

/* the about's text: the source information, and the three feedback sections, the same answers as exit-interview.json */
const SOURCE_LINES = [
  'DATE: 2026-11-04 05:59:47', 'SOURCE: ice hockey, over-the-top arcade style', 'PLAN: PLAN.md (written for this build)',
  'TITLE: Ice Breakers, drawn at random from 50 titles (a secrets.randbelow draw)',
  'GENRE: sports: three a side with goalies, a Cup Run story, exhibition, practice and online sessions',
  'PERSPECTIVE: a TV broadcast camera (threequarter, 2.5D); the overhead view on V; the brawler view in a fight',
  'TECH: my-3D2dge engine v0.85.2 (handoff package), plain JavaScript, Node 24 for the tests, AI Hub client session.js 1.4.0',
  'ART: the engine\'s PS1-era pixel art and humanoid rigs; hockey gear, rink, nets, crowd and effects drawn in code',
  'ANIMATION: the engine\'s procedural humanoid rig and poses (skating, cheer, stagger, down, save, guard, block)',
  'AUDIO: all synthesized in code: chip sound effects, babble voices in Animalese style, a match song, the title and victory tunes',
  'ONLINE: AI Hub shared-world sessions for 1 to 4 seats (the host copy runs the match; the others send their input)',
  'TESTING: one command (tests/run.mjs): headless checks, a Chromium smoke test, and the AI Hub harness',
  'RESEARCH: none', 'ENVIRONMENT: Claude Code CLI (headless); Linux (WSL2); Chromium, headless',
  'MODEL: Anthropic, claude-haiku-5-5, reasoning effort medium', 'USAGE: unknown'
];
const TESTING_LINES = [
  'Issues found: 11 in the game build.',
  'Critical or game-breaking: 4. A hang in an angle wrap, goalies going NaN from a duplicated data key, the net box blocking every goal, and a draw crash that only the browser run caught.',
  'Most helpful: headless match runs that counted shots, saves, goals and goal-line crossings.',
  'Least helpful: scene checks that only confirm the scene name, because headless runs skip drawing.'
];
const ENGINE_LINES = [
  'Liked most: the sports kit as a base, TileMap runtime cell changes (map.set), and game.advance for headless play.',
  'Stuck or guessed wrong: the pixel fonts had no PlayStation symbols; E.store needs localStorage (given a fake in the tests); the Dialog voice option came from the docs.',
  'Built myself: the rink collision, the puck and goal-line rules, the skater and goalie AI, the fights, KABOOM and the session netcode.',
  'Hardest: finding the right calls in a 14,700-line file, and that headless runs skip drawing.',
  'Engine changes: PlayStation symbols in both pixel fonts, and the hub\'s Create + Options rule. Logged in ENGINE-CHANGES.md.',
  'One change: run scene drawing headless, or offer a draw-check mode.'
];
const PROMPT_LINES = [
  'Liked most: the explicit rules (one test command, no subagents, file names and sections) and the plan\'s numbers.',
  'Confusing: the title rule (TASK asks for 50 random titles; STAGE says use the plan\'s title), and the plan\'s size for a medium-effort build.',
  'Hardest: fitting the full plan into one build, and tuning AI play without watching it live.',
  'Would change: name a minimum slice and what can be cut, and say whether online play must work for the game to count as done.'
];

/* ---- TUNING: every number a balance pass would move. Dev Mode shows the most important ones as live sliders. ---- */
const TUNE_DEFAULTS = {
  skateMax: 128, skateAccel: 320, turboMul: 1.42, turboDrain: .5, puckFriction: 20, puckBounce: .6,
  shotSpeed: 250, slapGain: 240, chargeTime: .95, shotErr: 1, passSpeed: 230, pickupRad: 9,
  goalieReact: .16, goalieSpeed: 150, saveBase: .86, reboundChance: .6,
  checkPower: 1, bigHit: 150, glassBreak: 170, boomGain: 1,
  periodLen: 90, periods: 3, cpuSkill: 1, crowd: 1, kaboomTime: 15, sinBin: 20, fightMax: 3
};
// the sliders: a group, a label, a range and a step (the Dev panel shows them in this order)
const TUNE_META = {
  skateMax: ['SKATING', 'Top speed', 90, 180, 2], skateAccel: ['SKATING', 'Acceleration', 120, 600, 10], turboMul: ['SKATING', 'Turbo multiplier', 1, 2, .02], turboDrain: ['SKATING', 'Turbo drain per second', .1, 2, .05],
  puckFriction: ['PUCK', 'Puck friction', 0, 60, 1], puckBounce: ['PUCK', 'Board bounce', .1, 1, .02], pickupRad: ['PUCK', 'Stick reach', 4, 16, .5],
  shotSpeed: ['SHOTS', 'Wrist shot speed', 150, 400, 5], slapGain: ['SHOTS', 'Slapshot extra speed', 0, 400, 5], chargeTime: ['SHOTS', 'Slapshot wind-up seconds', .3, 2, .05], shotErr: ['SHOTS', 'Shot error', 0, 2.5, .05], passSpeed: ['SHOTS', 'Pass speed', 120, 360, 5],
  goalieReact: ['GOALIES', 'Goalie reaction', .02, .4, .01], goalieSpeed: ['GOALIES', 'Goalie speed', 60, 260, 5], saveBase: ['GOALIES', 'Base save chance', .3, 1, .01], reboundChance: ['GOALIES', 'Rebound chance', 0, 1, .02],
  checkPower: ['HITS', 'Check power', .3, 3, .05], bigHit: ['HITS', 'Big hit threshold', 90, 260, 5], glassBreak: ['HITS', 'Glass break speed', 90, 300, 5],
  boomGain: ['BOOM', 'BOOM gain', 0, 3, .05], kaboomTime: ['BOOM', 'KABOOM seconds', 5, 30, 1], sinBin: ['BOOM', 'Sin bin seconds', 5, 40, 1], fightMax: ['BOOM', 'Fights a game', 0, 6, 1],
  periodLen: ['MATCH', 'Period length (seconds)', 30, 300, 5], periods: ['MATCH', 'Periods', 1, 3, 1], cpuSkill: ['MATCH', 'CPU skill', .5, 1.5, .05], crowd: ['MATCH', 'Crowd noise', 0, 2, .1]
};
const TUNE_KEYS = Object.keys(TUNE_DEFAULTS);
const T = Object.assign({}, TUNE_DEFAULTS, store.get('tuning', {}));
const tuneReset = k => { if (k) T[k] = TUNE_DEFAULTS[k]; else for (const key of TUNE_KEYS) T[key] = TUNE_DEFAULTS[key]; store.set('tuning', Object.fromEntries(TUNE_KEYS.filter(key => T[key] !== TUNE_DEFAULTS[key]).map(key => [key, T[key]]))); };
const tuneSet = (k, v) => { const [, , lo, hi] = TUNE_META[k]; T[k] = clamp(v, lo, hi); store.set('tuning', Object.fromEntries(TUNE_KEYS.filter(key => T[key] !== TUNE_DEFAULTS[key]).map(key => [key, T[key]]))); };

/* ---- THE RINK: a TileMap of 70 x 44 cells of 16 units. The ice is the rounded rectangle inside; the glass and the boards
 * are the wall cells around it (glass inside, boards outside). A glass cell a hit breaks is set to 0 (open ice). The
 * nets are boxes the skaters can't enter; the puck scores by crossing a goal line inside the mouth, under the bar. ---- */
const TC = 16, COLS = 70, ROWS = 44, CX = 560, CY = 400, HL = 432, HW = 192, RAD = 96;
const GX = [176, 944];                 // the goal lines: GX[0] is west (team 0 defends it), GX[1] east
const MOUTH = 16, BAR_Z = 20, GLASS_H = 28, BOARD_H = 14;
const NETS = [{ x0: 156, x1: 174, y0: 378, y1: 422 }, { x0: 946, x1: 964, y0: 378, y1: 422 }];   // (behind the goal lines: the puck crosses them before it meets the net)
const FACEOFF = [[CX, CY], [CX - 288, CY - 96], [CX - 288, CY + 96], [CX + 288, CY - 96], [CX + 288, CY + 96], [CX - 84, CY - 96], [CX - 84, CY + 96], [CX + 84, CY - 96], [CX + 84, CY + 96]];

// signed distance from (x, y) to the rounded rectangle of the ice: negative inside, positive outside
const sdRect = (x, y) => {
  const qx = Math.abs(x - CX) - (HL - RAD), qy = Math.abs(y - CY) - (HW - RAD), ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - RAD;
};
/** a rink map: the glass ring (cells just outside the ice), the boards outside it, the ice inside */
function buildRink(arena) {
  const rows = [];
  for (let cy = 0; cy < ROWS; cy++) {
    let s = '';
    for (let cx = 0; cx < COLS; cx++) {
      const sd = sdRect((cx + .5) * TC, (cy + .5) * TC);
      s += sd > 0 && sd <= 16 ? 'g' : sd > 16 && sd <= 32 ? 'b' : '.';
    }
    rows.push(s);
  }
  const floorTex = (x, y) => {
    const sd = sdRect(x, y);
    if (sd > 0) return [58, 54, 66];   // outside the glass: concrete
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
    const mk = markings(x, y);
    if (mk) return mk;
    const [r, g, b] = arena.ice, k = 1 - Math.max(0, sd + 24) / 120 * .08;   // (a little shade toward the boards)
    return [(r + n * 8 + m * 6) * k, (g + n * 8 + m * 6) * k, (b + n * 6 + m * 4) * k];
  };
  const types = {
    1: { h: BOARD_H, top: arena.boardTop, side: arena.boardSide, line: '#1a1a24', cut: true, cutH: 6, face: 'plank' },
    2: { h: GLASS_H, top: arena.glass, side: arena.glass, cut: true, cutH: 8, face: 'none' }
  };
  return new E.TileMap({ rows, legend: { b: 1, g: 2, '.': 0 }, types, floorTex, outside: '#2a2630', ao: 3 });
}
/** the paint: red and blue lines, the circles, the dots, the creases */
function markings(x, y) {
  const red = [200, 48, 48], blue = [42, 74, 200], crease = [159, 211, 255];
  if (Math.abs(x - GX[0]) < 1.5 || Math.abs(x - GX[1]) < 1.5) return red;
  if (x < GX[0] || x > GX[1]) return null;
  if (Math.abs(x - CX) < 2.5) return red;
  if (Math.abs(x - (CX - 108)) < 2.5 || Math.abs(x - (CX + 108)) < 2.5) return blue;
  const d = Math.hypot(x - CX, y - CY);
  if (Math.abs(d - 72) < 1.2 || d < 3) return blue;
  for (const [fx, fy] of FACEOFF) {
    if (fx === CX) continue;
    const df = Math.hypot(x - fx, y - fy);
    if (Math.abs(df - 18) < 1.1 || df < 2.2) return red;
  }
  for (const gx of GX) {
    const dg = Math.hypot(x - gx, y - CY);
    if (Math.abs(dg - 28) < 1.1 && (gx === GX[0] ? x > gx : x < gx)) return red;
    if (dg < 28 && (gx === GX[0] ? x > gx : x < gx)) return crease;
  }
  return null;
}
/** the wall cell at a world point, its id (0 open, 1 boards, 2 glass, -1 outside the map) */
const cellId = (map, x, y) => map.cell(Math.floor(x / TC), Math.floor(y / TC));
/** push a circle (x, y, r) out of solid cells and out of the nets; returns the last thing it hit (its normal and cell) */
function pushOut(map, b, r) {
  let hit = null;
  const x0 = Math.floor((b.x - r) / TC), x1 = Math.floor((b.x + r) / TC), y0 = Math.floor((b.y - r) / TC), y1 = Math.floor((b.y + r) / TC);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const id = map.cell(cx, cy);
    if (id <= 0) continue;
    const rx0 = cx * TC, ry0 = cy * TC, rx1 = rx0 + TC, ry1 = ry0 + TC;
    const qx = clamp(b.x, rx0, rx1), qy = clamp(b.y, ry0, ry1), dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let nx, ny;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; b.x = qx + nx * r; b.y = qy + ny * r; }
    else {
      const left = b.x - rx0, right = rx1 - b.x, up = b.y - ry0, down = ry1 - b.y, m = Math.min(left, right, up, down);
      if (m === left) { nx = -1; ny = 0; b.x = rx0 - r; } else if (m === right) { nx = 1; ny = 0; b.x = rx1 + r; }
      else if (m === up) { nx = 0; ny = -1; b.y = ry0 - r; } else { nx = 0; ny = 1; b.y = ry1 + r; }
    }
    hit = { nx, ny, cx, cy, id };
  }
  for (const n of NETS) {
    const qx = clamp(b.x, n.x0, n.x1), qy = clamp(b.y, n.y0, n.y1), dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); const nx = dx / d, ny = dy / d; b.x = qx + nx * r; b.y = qy + ny * r; hit = { nx, ny, net: true }; }
    else { const left = b.x - n.x0, right = n.x1 - b.x, up = b.y - n.y0, down = n.y1 - b.y, m = Math.min(left, right, up, down); hit = { net: true, nx: 0, ny: 0 };
      if (m === left) { b.x = n.x0 - r; hit.nx = -1; } else if (m === right) { b.x = n.x1 + r; hit.nx = 1; } else if (m === up) { b.y = n.y0 - r; hit.ny = -1; } else { b.y = n.y1 + r; hit.ny = 1; } }
  }
  return hit;
}
/** the skater's or goalie's reach to a glass cell at speed: a broken panel (its id set to open) */
const isGlass = (map, cx, cy) => map.cell(cx, cy) === 2;
/** the face-off spot nearest a point, out of play */
const nearestFaceoff = (x, y) => FACEOFF.slice().sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y))[0];
/** a point inside the ice (the rink's rounded rectangle), clear of its boards */
const onIce = (x, y) => sdRect(x, y) < -8;

/* ---- THE MATCH: skaters (3 a side) and a goalie each, the puck, the rules. The simulation draws only from srand() and
 * never touches the screen; the screen and the sound hear it through fx(). Team 0 attacks east (it defends the west goal).
 * ---- */
const PUCK_R = 1.6, SK_R = 7, PUCK_G = 260, CHECK_R = 15;
const SLOTS = ['C', 'W', 'D'];
let M = null;   // the match in play (null on the menus)
const dirOf = t => t === 0 ? 1 : -1;
const attackGoal = t => GX[1 - t];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const live = s => s.state !== 'down' && s.state !== 'bin' && s.state !== 'fight';

/** a new match: its teams, the arena's rink, the skaters on their faceoff spots, who the humans control */
function newMatch(cfg) {
  const arena = ARENAS[cfg.arena], map = buildRink(arena);
  M = { cfg, arena, map, teams: [], skaters: [], goalies: [], humans: [], phase: 'faceoff', timer: 1.4, period: 1, clock: T.periodLen,
    ot: false, score: [0, 0], boom: [0, 0], kab: [0, 0], shots: [0, 0], goals: [], hits: [0, 0], saves: [0, 0], fight: null, bannerT: 0, banner: '',
    puck: { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, prevTouch: null, shot: null, cool: 0, inNet: false, pass: null },
    drill: cfg.drill || null, lastFaceoff: null, stars: null, over: false, tieBreak: 0, tick: 0, seen: [] };
  for (let t = 0; t < 2; t++) {
    const base = TEAMS[cfg.teams[t]], def = Object.assign({}, base, { rate: Object.assign({}, base.rate), goalie: Object.assign({}, base.goalie) }), jersey = t === 0 ? def.home : def.away;
    M.teams.push({ t, def, jersey, pants: t === 0 ? '#1a1a22' : '#2a3a6a', trim: def.trim, skin: def.skin, hair: def.hair });
    for (let slot = 0; slot < 3; slot++) {
      const sk = { t, slot, name: def.skaters[slot], num: [9, 17, 4][slot] + t * 30, x: 0, y: 0, vx: 0, vy: 0, face: t === 0 ? 0 : PI, state: 'skate', st: 0,
        cool: 0, charge: 0, want: .5 + srand() * .5, turbo: 0, human: null, deke: 0, stats: { g: 0, a: 0, hits: 0, shots: 0, passes: 0 }, pen: 0 };
      sk.rig = new E.Humanoid({ size: 1.02, build: slot === 2 ? 'bulky' : 'heroic', hair: slot === 1 ? 'spiky' : 'short', hat: { style: 'helmet', color: jersey },
        colors: { cloth: jersey, pants: M.teams[t].pants, trim: def.trim, boot: '#1a1a20', hair: def.hair[slot], skin: def.skin[slot], belt: def.trim }, speedRef: 80 });
      M.skaters.push(sk);
    }
    const gl = { t, x: 0, y: 0, vx: 0, vy: 0, face: t === 0 ? 0 : PI, state: 'ready', st: 0, react: 0, target: CY, stats: { saves: 0, against: 0 } };
    gl.rig = new E.Humanoid({ size: 1.1, build: 'bulky', hair: 'short', hat: { style: 'helmet', color: '#e8e8ec' }, colors: { cloth: jersey, pants: '#e8e0c0', trim: def.trim, boot: '#1a1a20', hair: def.hair[0], skin: def.skin[0], belt: def.trim }, speedRef: 60 });
    M.goalies.push(gl);
  }
  // the humans: one a side first (the GULLS' rivals in the pictures), then the second side's, then each side's wing
  const order = [[0, 0], [1, 0], [0, 1], [1, 2]], n = Math.min(4, cfg.humans || 0);
  for (let i = 0; i < n; i++) { const [t, slot] = order[i], sk = M.skaters.find(s => s.t === t && s.slot === slot); const h = { p: cfg.inputs ? cfg.inputs[i] || null : game.players[i] || null, sk, i }; if (h.p) { sk.human = h; M.humans.push(h); } }
  M.teams.forEach(tm => tm.label = tm.def.name);
  M.grudge = M.skaters.map(() => M.skaters.map(() => 0)); M.fights = 0; M.playT = 0; M.challenge = null;
  itemsReset();
  faceoff(CX, CY, true);
  return M;
}
/** the formation: where a skater stands now (its own spot, given the puck), for a skater the AI moves */
function spotFor(sk) {
  const t = sk.t, d = dirOf(t), pk = M.puck, own = pk.owner && pk.owner.t === t, opp = pk.owner && pk.owner.t !== t;
  const px = pk.x, py = pk.y, gx = GX[t];
  let x, y;
  if (own) {
    if (sk.slot === 0) { x = px + d * 70; y = CY + (py < CY ? 60 : -60); }
    else if (sk.slot === 1) { x = px + d * 120; y = CY - 80; }
    else { x = px - d * 90; y = CY + 70; }
  } else {
    const k = sk.slot === 0 ? .35 : sk.slot === 1 ? .55 : .8;
    x = lerp(px, gx, k); y = sk.slot === 0 ? py : sk.slot === 1 ? CY - 60 : CY + 60;
    if (opp && sk.slot === 0) { x = lerp(px, gx, .3); y = lerp(py, CY, .3); }
  }
  return [clamp(x, 150, 970), clamp(y, 232, 568)];
}
/** a faceoff at (x, y): the teams line up, the ice is quiet a moment, then the puck drops */
function faceoff(x, y, first) {
  const pk = M.puck;
  M.phase = 'faceoff'; M.timer = first ? 1.6 : 1.6; pk.owner = null; pk.x = x; pk.y = y; pk.z = 0; pk.vx = pk.vy = pk.vz = 0; pk.inNet = false; pk.shot = null; pk.pass = null; pk.prevTouch = null; pk.lastTouch = null;
  for (const sk of M.skaters) {
    if (sk.state === 'bin') continue;
    const d = sk.t === 0 ? 1 : -1, slot = sk.slot, dx = slot === 0 ? -d * 10 : slot === 1 ? -d * 60 : -d * 120, dy = slot === 0 ? 0 : slot === 1 ? -60 : 60;
    sk.x = clamp(x + dx, 150, 970); sk.y = clamp(y + dy, 232, 568); sk.vx = sk.vy = 0; sk.face = sk.t === 0 ? 0 : PI; sk.state = 'skate'; sk.st = 0; sk.charge = 0; sk.cool = .5; sk.deke = 0;
  }
  for (const g of M.goalies) { g.x = GX[g.t] + dirOf(g.t) * 12; g.y = CY; g.vx = g.vy = 0; g.state = 'ready'; g.st = 0; g.face = g.t === 0 ? 0 : PI; }
  M.lastFaceoff = [x, y];
}
/** the puck is loose: out of play, a whistle, a face-off at the nearest spot */
function outOfPlay(by) {
  if (M.phase !== 'play') return;
  if (M.slips && M.slips.length) { M.slips = []; say('THE REFEREE PICKS UP THE OCTOPUS AND TWIRLS IT OVERHEAD.'); }
  const [x, y] = nearestFaceoff(M.puck.x, M.puck.y);
  fx('whistle'); say(pick(['WHISTLE! OUT OF PLAY.', 'THE PUCK IS OUT. THAT WENT OVER THE BOARDS.', 'WHISTLE. FACEOFF.'], Math.floor(srand() * 3)));
  M.phase = 'stop'; M.timer = 1.2; M.stopTo = [x, y]; M.puck.owner = null; M.puck.vx = M.puck.vy = 0;
}
/** the sim's events: what the screen and the booth hear. Sounds and particles only: nothing here changes the match. */
function fx(kind, x, y, extra) {
  if (kind === 'hit' && M) { M.punch = .45; waveStart(); }   // (the punch-in and the crowd)
  if (M) (M.evq || (M.evq = [])).push(kind);
  if (kind === 'horn') { A.sfx('horn'); }
  else if (kind === 'shot') A.sfx(extra && extra.slap ? 'slap' : 'wrist');
  else if (kind === 'whistle') A.sfx('whistle');
  else if (kind === 'thump') A.sfx('thump');
  else if (kind === 'hit') { A.sfx('hit'); P.sparks(x, y, 8, 12, null, { color: '#ffe08a' }); game.freeze(.06); game.shake(2); }
  else if (kind === 'glass') { A.sfx('glass'); P.bits(x, y, 14, 18, ['#bfe4f4', '#ffffff', '#8fd0f0']); game.shake(4); }
  else if (kind === 'save') { A.sfx('save'); P.sparks(x, y, 10, 14, null, { color: '#ffffff' }); }
  else if (kind === 'post') { A.sfx('post'); }
  else if (kind === 'block') A.sfx('thump');
  else if (kind === 'goal') { P.sparks(x, y, 18, 22, null, { color: '#ffe08a' }); P.ring(x, y, 6, 40, '#fff6c0', .5); game.shake(3); }
}
const say = (text, o) => { if (M) (M.sayq || (M.sayq = [])).push(text); if (M && M.cfg && M.cfg.attract) return; if (M) M.bannerT = 0; talkSay(text, o); };

/** a goal for team s (scored by sk, assisted by a teammate of the last touch) */
function goal(s, scorer, kab, x, y) {
  const pk = M.puck;
  M.score[s]++; M.phase = 'goal'; M.timer = 3.2; M.banner = 'GOAL!'; M.bannerT = 2.6;
  if (scorer) scorer.stats.g++;
  const assist = pk.prevTouch && pk.prevTouch.t === s && pk.prevTouch !== scorer ? pk.prevTouch : null;
  if (assist) assist.stats.a++;
  M.goals.push({ t: s, scorer: scorer ? scorer.name : '?', assist: assist ? assist.name : null, kab: !!kab, period: M.period, clock: M.clock, ot: M.ot });
  if (M.inSO) M.soGoalsT[s]++;
  if (!M.inSO) replayStart();
  waveStart();
  M.boom[s] = Math.min(100, M.boom[s] + 20 * T.boomGain); M.kab[1 - s] = 0;   // (a goal ends the other side's KABOOM)
  if (kab) fx('horn');
  if (M.organ) { M.boom[s] = Math.min(100, M.boom[s] + 30 * T.boomGain); say('DORIS PLAYS THE ORGAN! THE ARENA ROARS!'); }
  if (M.arena.id === 'yard') { M.slips = M.slips || []; M.slips.push({ x: 320 + srand() * 400, y: 320 + srand() * 160, r: 10 }); say('THE FANS THREW AN OCTOPUS ON THE ICE!'); }
  if (scorer && scorer.stats.g === 3) { hatTrick(scorer); }
  if (srand() < .25) throwItem();
  for (const sk of M.skaters) if (sk.t === s) { sk.state = 'celebrate'; sk.st = 2.6; }
  for (const g of M.goalies) if (g.t !== s) g.state = g.state === 'down' ? 'down' : 'ready';
  fx('horn'); fx('goal', x, y); say(pick(TEXT.goal, Math.floor(srand() * TEXT.goal.length)) + (scorer ? ' ' + scorer.name + ' SCORES FOR THE ' + M.teams[s].def.name + '!' : ''));
  if (M.ot) { M.over = true; }
}
/** a shot's outcome at a goal line: the goalie's save or the goal */
function goalPlane(k, px0, py0, pk) {
  const gl = M.goalies[k], line = GX[k], s = k === 0 ? 1 : 0, dy = Math.abs(pk.y - gl.y), size = M.teams[k].def.goalie.size, rfx = M.teams[k].def.goalie.rfx;
  const w = (6 + 2 * size) * (M.pads && M.pads[k] > 0 ? 1.35 : 1), slap = pk.shot && pk.shot.slap, kab = pk.shot && pk.shot.kab;
  let chance = T.saveBase + .02 * (rfx - 3) - (slap ? .08 : 0) - (kab ? .22 : 0) + (pk.shot ? 0 : .04);
  chance = clamp(chance, .05, .98);
  if (dy < w * (kab ? .8 : 1) && srand() < chance) {
    gl.stats.saves++; M.saves[k]++; M.shots[s]++; gl.stats.against++; M.boom[k] = Math.min(100, M.boom[k] + 5 * T.boomGain); M.boom[s] = Math.min(100, M.boom[s] + 4 * T.boomGain);
    pk.x = line + (k === 0 ? 2.5 : -2.5); pk.vx = -pk.vx * .3; pk.vy = (srand() - .5) * 150; pk.vz = 0; pk.z = 2; pk.shot = null;
    if (srand() < .3) { pk.owner = null; M.phase = 'stop'; M.timer = 1.3; M.stopTo = nearestFaceoff(pk.x, pk.y); pk.vx = pk.vy = 0; fx('whistle'); say('GOALIE HOLDS IT. WHISTLE.'); return true; }
    fx('save', pk.x, pk.y); say(pick(TEXT.save, Math.floor(srand() * TEXT.save.length)));
    gl.state = 'save'; gl.st = .4;
    return true;
  }
  // a goal: the puck crosses the line inside the mouth, under the bar
  M.shots[s]++; gl.stats.against++; M.boom[s] = Math.min(100, M.boom[s] + 4 * T.boomGain);
  const scorer = pk.lastTouch && pk.lastTouch.t === s ? pk.lastTouch : null;
  if (kab && dy < 22) { gl.state = 'down'; gl.st = 1.2; }
  pk.inNet = true; pk.x = line + (k === 0 ? -6 : 6); pk.y = clamp(pk.y, CY - 12, CY + 12); pk.vx = pk.vy = 0; pk.z = 0; pk.vz = 0;
  goal(s, scorer, kab, pk.x, pk.y);
  return true;
}
/** the puck's crossing of a goal line: a goal, a save, or the crossbar and posts (the puck bounces back) */
function tryGoal(px0, py0, pk) {
  for (const k of [0, 1]) {
    const line = GX[k], crossed = k === 0 ? (px0 > line && pk.x <= line && pk.vx < 0) : (px0 < line && pk.x >= line && pk.vx > 0);
    if (!crossed) continue;
    const inMouth = Math.abs(pk.y - CY) < MOUTH - 1;
    if (!inMouth || pk.z >= BAR_Z) {
      pk.x = line + (k === 0 ? 2.5 : -2.5); pk.vx = -pk.vx * .5;   // (behind the goal line, outside the mouth: the posts and the net's frame)
      if (inMouth) { fx('post'); say('HIGH! OVER THE BAR.'); }
      else if (Math.abs(pk.y - CY) < MOUTH + 3) { fx('post'); say('OFF THE POST! SO CLOSE!'); }
      return false;
    }
    return goalPlane(k, px0, py0, pk);
  }
  return false;
}
/** a glass panel breaks: the cell is open ice from then on, the puck and the bodies can leave the rink through it */
function breakGlass(cx, cy, by, speed) {
  if (M.map.cell(cx, cy) !== 2) return;
  M.cracked = M.cracked || new Set();
  const key = cx + ',' + cy;
  // a first hit only cracks the panel (BOOM +8); a hard hit, or a second one, shatters it (BOOM +15)
  if (!M.cracked.has(key) && (speed || 0) < 240) { M.cracked.add(key); M.boom[by] = Math.min(100, M.boom[by] + 8 * T.boomGain); fx('thump'); say('THE GLASS CRACKS!'); return; }
  M.map.set(cx, cy, 0);
  const x = (cx + .5) * TC, y = (cy + .5) * TC;
  fx('glass', x, y); say(pick(TEXT.glass, Math.floor(srand() * TEXT.glass.length)));
  M.boom[by] = Math.min(100, M.boom[by] + 15 * T.boomGain);
  if (by === 0) M.glassBreaks = (M.glassBreaks || 0) + 1;
}
/** the puck's own step: friction, gravity, the boards, the goal, the pickup (4 substeps a step) */
function puckStep(dt) {
  const pk = M.puck;
  if (pk.inNet) { pk.vx = pk.vy = 0; return; }
  if (pk.owner) {
    const o = pk.owner;
    if (o.state === 'down' || o.state === 'bin') { pk.owner = null; pk.vx = o.vx * 1.2; pk.vy = o.vy * 1.2; pk.vz = 40; fx('thump'); }
    else { pk.x = o.x + Math.cos(o.face) * 10; pk.y = o.y + Math.sin(o.face) * 10; pk.z = 0; pk.vx = o.vx; pk.vy = o.vy; pk.vz = 0; return; }
  }
  pk.cool = Math.max(0, pk.cool - dt);
  const N = 4, h = dt / N;
  for (let i = 0; i < N; i++) {
    const sp0 = Math.hypot(pk.vx, pk.vy);
    if (sp0 > 0) { const k = Math.max(0, sp0 - (T.puckFriction + .12 * sp0) * h) / sp0; pk.vx *= k; pk.vy *= k; }
    if (pk.z > 0 || pk.vz !== 0) {
      pk.vz -= PUCK_G * h; pk.z += pk.vz * h;
      if (pk.z <= 0) { pk.z = 0; if (pk.vz < -60) { pk.vz = -pk.vz * .35; pk.vx *= .92; pk.vy *= .92; fx('thump'); } else pk.vz = 0; }
    }
    const px0 = pk.x, py0 = pk.y;
    pk.x += pk.vx * h; pk.y += pk.vy * h;
    if (tryGoal(px0, py0, pk)) return;
    const hit = pushOut(M.map, pk, PUCK_R);
    if (hit) {
      const id = hit.id || 0, wallH = id === 2 ? GLASS_H : BOARD_H;
      if (pk.z > wallH + 1 && id) { outOfPlay(); return; }   // over the glass: out of play
      const spd = Math.hypot(pk.vx, pk.vy);
      const vn = pk.vx * hit.nx + pk.vy * hit.ny;
      const rb = M.arena.id === 'pond' ? .3 : T.puckBounce;   // (the pond's snowbanks give little)
      if (vn < 0) { pk.vx -= (1 + rb) * vn * hit.nx; pk.vy -= (1 + rb) * vn * hit.ny; }
      if (id === 2 && (spd > T.glassBreak * 1.4 || (pk.shot && pk.shot.kab)) && pk.z < GLASS_H) { breakGlass(hit.cx, hit.cy, pk.lastTouch ? pk.lastTouch.t : 0, spd); }
      else if (spd > 40) fx('thump');
    }
    if (sdRect(pk.x, pk.y) > 3) { outOfPlay(); return; }
  }
  // the pickup: a loose puck on the ice goes to the first skater whose stick reaches it
  if (!pk.owner && pk.z < 6) {
    for (const sk of M.skaters) {
      if (!live(sk) || sk.cool > 0 || pk.cool > 0) continue;
      // (GRANDMA'S TAPE: a pass from a taped skater can't be taken by the other side)
      if (pk.pass && pk.pass.tape && pk.pass.from && sk.t !== pk.pass.from.t) continue;
      const d = Math.hypot(pk.x - (sk.x + Math.cos(sk.face) * 10), pk.y - (sk.y + Math.sin(sk.face) * 10));
      if (d < T.pickupRad) {
        const sp = Math.hypot(pk.vx, pk.vy);
        if (sp < 200) {
          pk.owner = sk; pk.shot = null;
          if (pk.pass && pk.pass.from && pk.pass.from.t === sk.t && pk.pass.from !== sk) { M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 2 * T.boomGain); sk.stats.passes++; M.passes = (M.passes || 0) + 1; if (M.drill && M.drill.kind === 'pass') M.drill.done = (M.drill.done || 0) + 1; }
          pk.pass = null;
          if (pk.lastTouch !== sk) { pk.prevTouch = pk.lastTouch; pk.lastTouch = sk; }
          pk.vx = sk.vx; pk.vy = sk.vy; sk.want = .5 + srand() * .5;
          break;
        }
      }
    }
  }
  // the bodies block the puck (a shot blocked is a block)
  if (!pk.owner) for (const sk of M.skaters) {
    if (sk.state === 'bin' || pk.z > 6 || (pk.shot && pk.shot.by === sk.t)) continue;   // (above the shins, a shot goes over a body; a team's own shot goes past its own)
    const dx = pk.x - sk.x, dy = pk.y - sk.y, d = Math.hypot(dx, dy);
    if (d < SK_R + PUCK_R && d > 0) {
      const vn = pk.vx * dx / d + pk.vy * dy / d;
      if (vn < 0) { pk.vx -= 1.8 * vn * dx / d; pk.vy -= 1.8 * vn * dy / d; }
      pk.x = sk.x + dx / d * (SK_R + PUCK_R); pk.y = sk.y + dy / d * (SK_R + PUCK_R);
      if (pk.shot && pk.shot.by !== sk.t) { M.blocks = (M.blocks || 0) + 1; fx('block'); say(pick(['BLOCKED! A DEFENDER GETS HIS BODY IN THE WAY.', 'SHOT BLOCKED. WHAT A SACRIFICE.'], Math.floor(srand() * 2))); if (pk.shot.kab && live(sk)) { sk.state = 'down'; sk.st = 1.2; sk.vx = sk.vy = 0; fx('hit', sk.x, sk.y); } }
      pk.shot = null;
    }
  }
}
/** a one-timer: the receiver shoots as the pass arrives (a faster shot, half the error, and BOOM +6 for the team) */
function oneTimer(sk, aim) {
  M.puck.pass = null; M.oneTimers = (M.oneTimers || 0) + 1; M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 6 * T.boomGain);
  say('ONE-TIMER! ' + sk.name + ' FIRES IT!');
  shoot(sk, .85, aim, true);
}
/** a deke beats the defender it was facing: the defender is left behind (BOOM +6, once per deke) */
function dekeBeatCheck(sk) {
  const foe = sk.dekeFoe;
  if (!foe || sk.dekeBeat || sk.deke <= 0 || !live(foe)) return;
  if (Math.cos(angDiff(Math.atan2(foe.y - sk.y, foe.x - sk.x), sk.face)) < -.3) { sk.dekeBeat = true; M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 6 * T.boomGain); say('DEKE BEAT! ' + foe.name + ' IS LEFT SPINNING.'); }
}
/** a skater's stick: the shot, the pass, the check, the deke and the poke */
function actOwner(sk, c, dt) {
  if (c.pass) passPuck(sk, c.aim, c.lob);
  else if (c.lob) passPuck(sk, c.aim, true);
  else if (c.deke) { sk.deke = .45; sk.cool = .3; const side = c.aimSide || (srand() < .5 ? 1 : -1); sk.dekeDir = side; sk.dekeFoe = M.skaters.find(o => o.t !== sk.t && live(o) && dist(o, sk) < 30 && Math.cos(angDiff(Math.atan2(o.y - sk.y, o.x - sk.x), sk.face)) > .3) || null; sk.dekeBeat = false; }
  if (c.shootHeld && sk.cool <= 0) sk.charge = Math.min(1, sk.charge + (M.kab[sk.t] > 0 ? 2 : 1) * dt / T.chargeTime);
  if (c.shootUp) { const ch = sk.charge; sk.charge = 0; shoot(sk, Math.max(.1, ch), c.aim); }
}
/** a pass to the teammate the stick points at, or the mouse's, led to where it is going; a saucer if lob */
function passPuck(sk, aim, lob) {
  M.passTries = M.passTries || [0, 0]; M.passTries[sk.t]++;
  const t = sk.t, mates = M.skaters.filter(m => m.t === t && m !== sk && live(m));
  let tgt = null;
  if (aim && aim.x !== undefined) { tgt = mates.slice().sort((a, b) => Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(b.x - aim.x, b.y - aim.y))[0]; if (tgt && Math.hypot(tgt.x - aim.x, tgt.y - aim.y) > 80) tgt = null; }
  if (!tgt) {
    let best = -1e9;
    for (const m of mates) { const a = Math.atan2(m.y - sk.y, m.x - sk.x), da = angDiff(a, sk.face), d = dist(sk, m); if (Math.abs(da) < 1.1 && -d * .5 + Math.cos(da) * 60 > best) { best = -d * .5 + Math.cos(da) * 60; tgt = m; } }
  }
  const pas = M.teams[t].def.rate.pas, d0 = tgt ? dist(sk, tgt) : 120;
  const sp = clamp(d0 * 1.5 + 90, 150, T.passSpeed * 1.4) * (.92 + .03 * pas);
  let tx, ty;
  if (tgt) { const lead = Math.min(.6, d0 / sp); tx = tgt.x + tgt.vx * lead * .8; ty = tgt.y + tgt.vy * lead * .8; }
  else { tx = sk.x + Math.cos(sk.face) * 120; ty = sk.y + Math.sin(sk.face) * 120; }
  const a = Math.atan2(ty - sk.y, tx - sk.x) + (srand() - .5) * .05 * (1.3 - .1 * pas);
  const pk = M.puck, dd = Math.hypot(tx - sk.x, ty - sk.y), tf = dd / sp;
  pk.owner = null; pk.x = sk.x + Math.cos(a) * 10; pk.y = sk.y + Math.sin(a) * 10; pk.vx = Math.cos(a) * sp; pk.vy = Math.sin(a) * sp;
  pk.vz = lob ? .5 * PUCK_G * tf : 0; pk.z = lob ? 0 : 0; pk.shot = null; pk.pass = { from: sk, to: tgt, t: 0 }; pk.cool = .2;
  pk.prevTouch = pk.lastTouch; pk.lastTouch = sk; sk.cool = .3; sk.stats.passes += 0; A.sfx('kick');
  if (pk.pass) pk.pass.tape = sk.tape > 0;
  if (tgt && sk.human && !tgt.human) { tgt.human = sk.human; sk.human.sk = tgt; sk.human = null; }   // the human's control goes with the pass
}
/** a shot: a wrist shot on a tap, a slapshot off the wind-up; aimed at the goal's mouth (the open side by default) */
function shoot(sk, charge, aim, oneT) {
  M.tries = M.tries || [0, 0]; M.tries[sk.t]++;
  const t = sk.t, gx = attackGoal(t), g = M.goalies[1 - t], slap = charge > .55, kab = M.kab[t] > 0, kabShot = kab && charge >= .95, lum = sk.lumber > 0;
  let ty;
  if (aim && aim.y !== undefined) ty = clamp(aim.y, CY - 14, CY + 14);
  else ty = g.y < CY ? CY + 12 : CY - 12;
  if (!kabShot && !lum) ty += (srand() - .5) * 2 * (1 - .4 * charge) * 5 * T.shotErr * (1.3 - .1 * M.teams[t].def.rate.sht) * (oneT ? .5 : 1);
  const sht = M.teams[t].def.rate.sht, sp = kabShot ? 760 : (T.shotSpeed + T.slapGain * charge) * (.85 + .05 * sht) * (lum ? 1.3 : 1) * (oneT ? 1.15 : 1);
  if (lum) sk.lumber--;
  const dd = Math.hypot(gx - sk.x, ty - sk.y), tf = dd / sp, zt = slap ? 6 + 10 * charge : 3 + 3 * srand();
  const vz = zt / tf + .5 * PUCK_G * tf, a = Math.atan2(ty - sk.y, gx - sk.x);
  const pk = M.puck;
  pk.owner = null; pk.x = sk.x + Math.cos(a) * 10; pk.y = sk.y + Math.sin(a) * 10; pk.z = 4; pk.vx = Math.cos(a) * sp; pk.vy = Math.sin(a) * sp; pk.vz = vz;
  pk.shot = { by: t, slap, kab: kabShot, from: sk.name }; pk.prevTouch = pk.lastTouch; pk.lastTouch = sk; pk.cool = .2; sk.cool = .4; sk.stats.shots++;
  fx('shot', 0, 0, { slap });
}
/** a check: a lunge at a rival within reach (the contact is resolved in contacts()) */
function check(sk) { if (sk.state === 'check' || sk.cool > 0) return; M.checks = M.checks || [0, 0]; M.checks[sk.t]++; sk.state = 'check'; sk.st = .3; sk.cool = .6; sk.vx += Math.cos(sk.face) * 60; sk.vy += Math.sin(sk.face) * 60; }
/** the bodies: a check's contact, its power, the outcome: a bump, a check, or a big hit (down, BOOM, crowd) */
function contacts(dt) {
  for (const a of M.skaters) for (const b of M.skaters) {
    if (a.t !== 0 || b.t !== 1 || !live(a) || !live(b)) continue;
    const d = dist(a, b);
    if (d > CHECK_R) continue;
    if (d < 2 * SK_R && d > 0) { const dx = (a.x - b.x) / d, dy = (a.y - b.y) / d, push = (2 * SK_R - d) * .5; a.x += dx * push; a.y += dy * push; b.x -= dx * push; b.y -= dy * push; }
    if (a.state === 'check' || b.state === 'check') {
      const att = a.state === 'check' ? a : b, tg = att === a ? b : a;
      if (tg.state === 'check' || tg.state === 'fight' || tg.state === 'bin') continue;
      if (tg.state === 'down') continue;
      const sp = Math.hypot(att.vx, att.vy), ha = M.teams[att.t].def.rate.hit, kab = M.kab[att.t] > 0, tb = att.turbo > 0;
      const power = (sp * .6 + 25) * (.8 + .067 * ha) * T.checkPower * (tb ? 1.2 : 1) * (kab ? 2 : 1) * (att.poutine > 0 ? 1.6 : 1);
      att.state = 'skate'; att.st = 0;
      const hadPuck = M.puck.owner === tg;
      addGrudge(tg, att, power >= 90 ? 10 : 2);
      if (power < 90) { tg.vx += (tg.x - att.x) / (d || 1) * 25; tg.vy += (tg.y - att.y) / (d || 1) * 25; if (hadPuck && srand() < .3) { loosen(tg, att); } }
      else if ((power < T.bigHit && !(att.poutine > 0)) || tg.poutine > 0) { M.boom[att.t] = Math.min(100, M.boom[att.t] + 6 * T.boomGain); tg.state = 'stagger'; tg.st = .5; tg.vx += (tg.x - att.x) / (d || 1) * 50; tg.vy += (tg.y - att.y) / (d || 1) * 50; if (hadPuck && srand() < .5 && !tg.tape) loosen(tg, att); fx('thump'); }
      else {
        const bank = M.arena.id === 'pond' && sdRect(tg.x, tg.y) > -14;   // (a big hit into a snowbank buries the skater)
        thinIceHit(tg, 100); tg.state = bank ? 'buried' : 'down'; tg.st = bank ? 1.5 : 1.2; tg.vx = (tg.x - att.x) / (d || 1) * 140; tg.vy = (tg.y - att.y) / (d || 1) * 140; M.hits[att.t]++;
        if (hadPuck) loosen(tg, att);
        addGrudge(tg, att, 35); M.boom[att.t] = Math.min(100, M.boom[att.t] + 18 * T.boomGain); fx('hit', (a.x + b.x) / 2, (a.y + b.y) / 2);
        M.banner = 'BIG HIT!'; M.bannerT = 1.4; say(pick(TEXT.hit, Math.floor(srand() * TEXT.hit.length)));
        att.stats.hits++;
      }
    }
  }
}
/** the puck comes loose from its carrier, bouncing away from the hitter */
function loosen(tg, att) { const pk = M.puck; if (pk.owner !== tg) return; pk.owner = null; pk.vx = (tg.x - att.x) * 6; pk.vy = (tg.y - att.y) * 6; pk.z = 0; pk.vz = 30; pk.cool = .2; }

/** the human's intent: the stick and the buttons as the player gave them (edges where a press counts once) */
function humanCtrl(h) {
  const I = h.p, mv = I.move(), c = { mx: mv[0], my: mv[1], turbo: I.down('turbo'), pass: I.pressed('pass'), shootHeld: I.down('shoot'), shootUp: I.released('shoot'),
    check: I.pressed('shoot'), deke: I.pressed('deke'), lob: I.pressed('lob'), switch: I.pressed('switch'), chirp: I.pressed('chirp'), lobHeld: I.down('lob'), aim: null, aimSide: 0 };
  if (I.lastDevice === 'mouse' && game.mouseGround) { try { const m = game.mouseGround(); if (m) c.aim = { x: m[0] !== undefined ? m[0] : m.x, y: m[1] !== undefined ? m[1] : m.y }; } catch (e) { /* (no mouse on the ice) */ } }
  if (!c.aim && (Math.abs(mv[1]) > .4)) c.aim = { y: CY + mv[1] * 14 };
  c.aimSide = mv[0] >= 0 ? 1 : -1;
  if (c.pass) I.consume('pass'); if (c.lob) I.consume('lob'); if (c.deke) I.consume('deke');
  return c;
}
/** the CPU's intent for a skater: its formation spot, the puck, the shot's wind-up, the pass or the check */
function aiCtrl(sk, dt) {
  const c = { mx: 0, my: 0, turbo: false, pass: false, shootHeld: false, shootUp: false, check: false, deke: false, lob: false, switch: false, aim: null, aimSide: 0 };
  const pk = M.puck, t = sk.t, d = dirOf(t), skill = T.cpuSkill, has = pk.owner === sk;
  if (has) {
    const gx = attackGoal(t), dg = Math.hypot(gx - sk.x, CY - sk.y), foe = M.skaters.find(o => o.t !== t && live(o) && dist(o, sk) < 22);
    const a = Math.atan2(CY - sk.y, gx - sk.x);
    c.mx = Math.cos(a) * .8; c.my = Math.sin(a) * .8;
    const inFront = (gx - sk.x) * d > 8 && (Math.abs(sk.y - CY) < 75 || dg < 150);   // (close in, from the corner too; the crease keeps a skater 26 out)
    if (dg < 300 && inFront && sk.cool <= 0) { c.shootHeld = sk.charge < sk.want; c.shootUp = !c.shootHeld; c.aim = { y: sk.y < CY ? CY + 10 : CY - 10 }; }
    else if (foe && sk.cool <= 0 && dg > 200) { const mate = M.skaters.some(m => m.t === t && m !== sk && live(m) && dist(m, sk) < 130); if (mate && srand() < dt * 1.6 * skill) c.pass = true; c.mx = -d * .2; c.my = (sk.y < CY ? 1 : -1) * .4; }
    else if (dg < 260) { c.mx = Math.cos(a + (srand() - .5) * .5); c.my = Math.sin(a); }
    c.turbo = dg > 160 && srand() < dt * .4 * skill;
    return c;
  }
  // the chaser: the skater nearest the loose puck, or the one the puck's owner opposes; the others hold their spots
  const team = M.skaters.filter(o => o.t === t && live(o));
  // (a defenceman (slot 2) leaves his zone only for a puck near his own net)
  const ordered = team.slice().sort((x, y) => dist(x, pk) - dist(y, pk));
  const chaser = ordered.find(o => o.slot !== 2 || Math.hypot(pk.x - GX[t], pk.y - CY) < 280) || ordered[0];
  let tx, ty;
  if (sk === chaser && (!pk.owner || pk.owner.t !== t)) { tx = pk.x; ty = pk.y; }
  else [tx, ty] = spotFor(sk);
  if (sk !== chaser && !pk.owner && M.items) { const it = M.items.filter(i => i.landed && !i.taken).sort((p, q) => Math.hypot(p.x - sk.x, p.y - sk.y) - Math.hypot(q.x - sk.x, q.y - sk.y))[0]; if (it && Math.hypot(it.x - sk.x, it.y - sk.y) < 120) { tx = it.x; ty = it.y; } }   // (item greed: a skater not in the play goes for a power-up)
  const dx = tx - sk.x, dy = ty - sk.y, dd = Math.hypot(dx, dy);
  if (dd > 5) { c.mx = dx / dd; c.my = dy / dd; }
  c.turbo = sk === chaser && dd > 60 && srand() < dt * .3 * skill;
  // a CPU receiver takes a one-timer when the pass arrives on its stick
  if (pk.pass && pk.pass.to === sk && !pk.owner && dist(sk, pk) < 40 && sk.cool <= 0 && srand() < dt * 3 * skill) c.check = true;
  if (sk === chaser && pk.owner && pk.owner.t !== t && dist(pk.owner, sk) < 16 && sk.cool <= 0 && srand() < dt * 1.2 * skill * (M.teams[t].def.rate.hit / 3)) c.check = true;
  return c;
}
/** a skater's step: its intent (a human's or the CPU's), its speed and turns, the shots, the checks */
function skaterStep(sk, dt) {
  sk.cool = Math.max(0, sk.cool - dt); sk.deke = Math.max(0, sk.deke - dt); sk.turbo = Math.max(0, sk.turbo - dt); effectsStep(sk, dt);
  if (sk.state === 'down' || sk.state === 'stagger' || sk.state === 'celebrate' || sk.state === 'fight' || sk.state === 'bin' || sk.state === 'slip' || sk.state === 'buried' || sk.state === 'frozen') {
    if (sk.state === 'bin') { sk.st -= dt; if (sk.st <= 0) { sk.state = 'skate'; const [x, y] = spotFor(sk); sk.x = x; sk.y = y; } }
    else { sk.st -= dt; if (sk.st <= 0) sk.state = sk.state === 'celebrate' ? 'skate' : 'skate'; }
    if (sk.state !== 'celebrate') { sk.vx *= Math.exp(-dt * 4); sk.vy *= Math.exp(-dt * 4); }
    sk.x += sk.vx * dt; sk.y += sk.vy * dt; pushOut(M.map, sk, SK_R); return;
  }
  if (sk.state === 'check') { sk.st -= dt; if (sk.st <= 0) sk.state = 'skate'; }
  const c = sk.human ? humanCtrl(sk.human) : aiThink(sk, dt);
  if (sk.human && sk.human.sk !== sk) sk.human = null;
  const kabT = M.kab[sk.t] > 0 || sk.sauce > 0, turboOn = (kabT || c.turbo) && (kabT || (sk.stam ?? 1) > 0) && Math.hypot(sk.vx, sk.vy) > 20;   // (a KABOOM team has infinite turbo)
  sk.stam = clamp((sk.stam ?? 1) + (turboOn && !kabT ? -T.turboDrain * dt : .3 * dt), 0, 1);
  if (turboOn) sk.turbo = .2;
  const pkOwner = M.puck.owner === sk, spd = T.skateMax * (.85 + .05 * M.teams[sk.t].def.rate.spd) * (turboOn ? T.turboMul : 1) * (sk.cocoa > 0 ? 1.2 : 1) *
    (pkOwner ? .94 : 1) * (sk.charge > 0 && pkOwner ? .6 : 1) * (M.kab[sk.t] > 0 ? 1.08 : 1) * (sk.human ? 1 : T.cpuSkill);
  let mx = c.mx, my = c.my; const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  const tvx = mx * spd, tvy = my * spd, s0 = Math.hypot(sk.vx, sk.vy);
  const accel = T.skateAccel * (m > 0 && Math.hypot(sk.vx, sk.vy) > 0 && (mx * sk.vx + my * sk.vy) < 0 ? 2.2 : 1);   // hockey stops: hard against the way it goes
  sk.vx = approach(sk.vx, tvx, accel * dt); sk.vy = approach(sk.vy, tvy, accel * dt);
  if (m > .15) sk.face = E.approachAng(sk.face, Math.atan2(my, mx), dt * 9);
  if (c.check) check(sk);
  // with the puck: the shot's wind-up, the pass, the lob
  if (pkOwner) actOwner(sk, c, dt);
  else if (c.check && M.puck.pass && M.puck.pass.to === sk && !M.puck.owner && dist(sk, M.puck) < 40 && sk.cool <= 0) oneTimer(sk, c.aim);
  else if (c.check) check(sk);
  if (c.switch && sk.human) switchHuman(sk.human);
  if (!pkOwner) challengeStep(sk, c, dt);
  if (c.chirp && sk.human) { M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 3 * T.boomGain); const line = pick(TEXT.chirp, Math.floor(srand() * TEXT.chirp.length)); M.bubble = { sk, text: line, t: 2.4 }; if (srand() < .6) say(line + ' (' + sk.name + ')'); }
  sk.x += sk.vx * dt; sk.y += sk.vy * dt;
  dekeBeatCheck(sk);
  pushOut(M.map, sk, SK_R);
  for (const gx of GX) { const dx = sk.x - gx, dy = sk.y - CY, dd = Math.hypot(dx, dy); if (dd < 26 && dd > 0) { sk.x = gx + dx / dd * 26; sk.y = CY + dy / dd * 26; } }
  const nr = NETS.find(n => sk.x > n.x0 - SK_R && sk.x < n.x1 + SK_R && sk.y > n.y0 - SK_R && sk.y < n.y1 + SK_R);
  if (nr) { sk.x = clamp(sk.x, nr.x0 - SK_R, nr.x1 + SK_R); }
  // a glass panel a body is driven through at speed breaks
  const cx = Math.floor(sk.x / TC), cy = Math.floor(sk.y / TC);
  if (M.map.cell(cx, cy) === 2 && Math.hypot(sk.vx, sk.vy) > T.glassBreak * .5) breakGlass(cx, cy, sk.t, Math.hypot(sk.vx, sk.vy));
}
/** a team's switch: the human moves to the teammate nearest the puck who has no human */
function switchHuman(h) {
  const mates = M.skaters.filter(m => m.t === h.sk.t && live(m) && !m.human);
  if (!mates.length) return;
  const m = mates.slice().sort((a, b) => dist(a, M.puck) - dist(b, M.puck))[0];
  h.sk.human = null; m.human = h; h.sk = m;
}
/** the goalie: the arc in front of the goal, the reaction to a shot, the save poke */
function goalieStep(g, dt) {
  if (M.inSO && M.phase === 'so' && soGoalieStep(g, dt)) return;
  if (g.state === 'down') { g.st -= dt; if (g.st <= 0) { g.state = 'ready'; } g.vx *= Math.exp(-dt * 3); g.vy *= Math.exp(-dt * 3); g.x += g.vx * dt; g.y += g.vy * dt; return; }
  if (g.state === 'save') { g.st -= dt; if (g.st <= 0) g.state = 'ready'; }
  const dir = dirOf(g.t), pk = M.puck, def = M.teams[g.t].def.goalie, gl = GX[g.t];
  const toGoal = (pk.vx < 0 && g.t === 0) || (pk.vx > 0 && g.t === 1);
  const goalDist = Math.abs(pk.x - gl);
  let depth = 10 + clamp(goalDist / 40, 0, 14);
  if (goalDist < 60 && pk.z < 6) depth = 6;
  // the reaction: a shot at the goal is read after the goalie's reaction time; until then it holds its spot
  if (toGoal && pk.shot) g.react = Math.max(0, g.react - dt); else g.react = T.goalieReact - (M.kab[g.t] > 0 ? .03 : 0);
  let ty;
  if (toGoal && pk.shot && g.react <= 0) { const tc = goalDist / Math.max(1, Math.abs(pk.vx)); ty = clamp(pk.y + pk.vy * tc, CY - MOUTH - 4, CY + MOUTH + 4); }
  else if (toGoal && pk.shot) ty = g.y;
  else if (pk.owner && pk.owner.t !== g.t && toGoal) ty = clamp(pk.y + pk.vy * .2, CY - MOUTH, CY + MOUTH);
  else ty = clamp(pk.y * .8 + CY * .2, CY - MOUTH - 2, CY + MOUTH + 2);
  if ((pk.x - gl) * dir < -12 && goalDist > 60) ty = pk.y < CY ? CY - 14 : CY + 14;   // (the puck is behind the net: hug the post)
  const tx = gl + dir * depth;
  const sp = T.goalieSpeed * (.85 + .05 * def.rfx);
  const dx = tx - g.x, dy = ty - g.y;
  g.vx = approach(g.vx, clamp(dx * 4, -sp, sp), 900 * dt); g.vy = approach(g.vy, clamp(dy * 6, -sp, sp), 900 * dt);
  g.x += g.vx * dt; g.y += g.vy * dt;
  g.x = clamp(g.x, gl + dir * 4, gl + dir * 26);
  g.y = clamp(g.y, CY - 30, CY + 30);
  g.face = dir > 0 ? 0 : PI;
  pushOut(M.map, g, 8);
}
/** the clock and the periods: the period's end, the intermission, overtime, the final whistle */
function clockStep(dt) {
  if (M.phase === 'play') {
    M.clock -= dt;
    if (M.clock <= 0 && M.ot) { shootout(); return; }   // (overtime is one minute of sudden death; a tie then goes to a shootout)
    if (M.clock <= 0) {
      if (M.score[0] !== M.score[1] && M.period >= T.periods) { M.phase = 'over'; M.over = true; M.timer = 2; fx('horn'); say('FULL TIME! ' + M.teams[M.score[0] > M.score[1] ? 0 : 1].def.name + ' WIN IT.'); return; }
      if (M.period < T.periods) { M.period++; M.clock = T.periodLen; fx('horn'); say(pick(TEXT.period, 0)); M.phase = 'intermission'; M.floodWanted = M.cfg.mode !== 'session' && M.cfg.mode !== 'attract' && M.cfg.flood !== false && M.humans.length > 0 && game.settings.flood !== 'Never'; M.stopTo = [CX, CY]; return; }
      // a tie after regulation: overtime (sudden death: the next goal wins)
      M.ot = true; M.clock = 60; M.phase = 'stop'; M.timer = 2.2; M.stopTo = [CX, CY]; M.banner = 'OVERTIME'; M.bannerT = 2.2; fx('horn'); say('OVERTIME! SUDDEN DEATH. THE NEXT GOAL WINS IT.');
    }
  }
}
/** the shootout: three shots each, then sudden death; a shot's chance is the shooter's shot rating and the goalie's reflexes */
function shootout() { shootoutStart(); }
/** the KABOOM: a team with a full BOOM meter turns its shots into fireballs and its checks into walls, for a while */
function activateKaboom(t) { if (M.boom[t] < 100 || M.kab[t] > 0) return; M.boom[t] = 0; M.kab[t] = T.kaboomTime; M.banner = t === 1 && M.cfg.chapter === STORY.length - 1 ? 'GILDED MODE!' : 'KA-BOOM!'; M.bannerT = 2.5; say(pick(TEXT.kaboom, 0)); fx('horn'); game.shake(5); if (game.flash) game.flash('#ff8a3a', .25, .6); }

/** one step of the match (the engine runs 120 steps a second: the same inputs and seed give the same game) */
function matchStep(dt) {
  if (!M) return;
  M.tick++;
  histStep(); M.bubble && (M.bubble.t -= dt); M.waveT = Math.max(0, (M.waveT || 0) - dt); M.punch = Math.max(0, (M.punch || 0) - dt);
  if (!M.introDone && M.phase === 'faceoff' && M.period === 1 && M.cfg.mode !== 'attract' && M.cfg.mode !== 'practice') introduce();
  for (let t = 0; t < 2; t++) if (M.kab[t] > 0) { M.kab[t] = Math.max(0, M.kab[t] - dt); if (M.kab[t] === 0) say('KABOOM IS OVER. THE ICE IS QUIET AGAIN.'); }
  for (let t = 0; t < 2; t++) if (M.boom[t] >= 100) activateKaboom(t);
  M.bannerT = Math.max(0, M.bannerT - dt);
  if (M.phase === 'over') { M.timer -= dt; for (const sk of M.skaters) { sk.vx *= .9; sk.vy *= .9; sk.x += sk.vx * dt; sk.y += sk.vy * dt; if (sk.state === 'celebrate') sk.st -= dt; } return; }
  if (M.phase === 'intermission') { if (!M.floodWanted) faceoff(CX, CY); return; }   // (the Flood Wagon scene runs it when it's wanted)
  if (M.phase === 'faceoff') {
    for (const sk of M.skaters) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    M.timer -= dt; if (M.timer <= 0) { M.phase = 'play'; const w = srand() < .5 ? 0 : 1, sk = M.skaters.filter(s => s.t === w && s.slot === 0)[0] || M.skaters.find(s => s.t === w); M.puck.owner = sk; M.puck.z = 0; M.puck.lastTouch = sk; M.puck.prevTouch = null; M.puck.cool = .2; sk.x = M.puck.x - (sk.t ? -10 : 10); sk.y = M.puck.y; }
    return;
  }
  if (M.phase === 'stop') {
    for (const sk of M.skaters) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    M.timer -= dt;
    if (M.timer <= 0) { if (M.over) return; if (M.drillEnd) return; const [x, y] = M.stopTo || [CX, CY]; if (M.ot && M.period >= 4 && M.score[0] !== M.score[1]) { M.phase = 'over'; M.over = true; return; } faceoff(x, y); }
    return;
  }
  if (M.phase === 'so') { soStep(dt); return; }
  if (M.phase === 'goal' && M.replay) { replayStep(dt); return; }
  if (M.phase === 'goal') {
    for (const sk of M.skaters) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    M.timer -= dt;
    if (M.timer <= 0) { if (M.inSO) { soNext(); return; } if (M.ot) { M.phase = 'over'; M.over = true; return; } faceoff(CX, CY); }
    return;
  }
  if (M.phase === 'fight') {
    fightStep(dt);
    if (M.fight) for (const sk of M.skaters) if (sk !== M.fight.a && sk !== M.fight.b) skaterStep(sk, dt);
    for (const g of M.goalies) goalieStep(g, dt);
    return;
  }
  // play
  M.playT = (M.playT || 0) + dt;
  challengeTick(dt); cpuChallenges(dt);
  for (const sk of M.skaters) skaterStep(sk, dt);
  for (const g of M.goalies) goalieStep(g, dt);
  // the skaters push each other apart
  for (let i = 0; i < M.skaters.length; i++) for (let j = i + 1; j < M.skaters.length; j++) {
    const a = M.skaters[i], b = M.skaters[j], d = dist(a, b);
    if (d < 2 * SK_R && d > 0 && a.t === b.t) { const dx = (a.x - b.x) / d, dy = (a.y - b.y) / d, p = (2 * SK_R - d) * .5; a.x += dx * p; a.y += dy * p; b.x -= dx * p; b.y -= dy * p; }
  }
  contacts(dt);
  itemsStep(dt);
  if (M.phase === 'play') puckStep(dt);
  if (M.phase === 'play') clockStep(dt);
  if (M.drill) drillStep(dt);
}
/** the drills: an objective and a clock; the drill ends when it is met or the time is up */
function drillStep(dt) {
  const d = M.drill; d.t = (d.t || 0) + dt;
  if (d.kind === 'wrist' && M.score[0] >= d.need) return drillDone(true);
  if (d.kind === 'pass' && (d.done || 0) >= d.need) return drillDone(true);
  if (d.kind === 'hit' && M.hits[0] >= d.need) return drillDone(true);
  if (d.kind === 'onGoal' && M.shots[0] >= d.need) return drillDone(true);
  if (d.kind === 'fight' && (M.fightWins || 0) >= d.need) return drillDone(true);
  if (d.kind === 'kaboom' && M.goals.some(g => g.kab && g.t === 0)) return drillDone(true);
  if (d.kind === 'glass' && (M.glassBreaks || 0) >= d.need) return drillDone(true);
  if (d.t >= d.limit) drillDone(false);
}
function drillDone(ok) { const d = M.drill; if (d.ended) return; d.ended = true; d.ok = ok; M.drillEnd = true; M.phase = 'over'; M.over = true; M.timer = 2; M.banner = ok ? 'DRILL COMPLETE' : 'TIME'; M.bannerT = 2.5; say(ok ? 'COACH MARGE: THAT IS HOW IT IS DONE.' : 'COACH MARGE: AGAIN. THIS TIME WITH YOUR HEAD UP.'); }
/** the three stars: who scored, who assisted, who hit; the goalie who saved the most */
function starsOf() {
  const pts = M.skaters.map(sk => ({ sk, p: sk.stats.g * 3 + sk.stats.a * 2 + sk.stats.hits * .5 + (sk.stats.passes * .1) + (sk.t === M.winner ? .5 : 0) })).filter(x => x.p > 0);
  pts.sort((a, b) => b.p - a.p);
  return pts.slice(0, 3).map(x => ({ name: x.sk.name, t: x.sk.t, g: x.sk.stats.g, a: x.sk.stats.a, hits: x.sk.stats.hits }));
}

/* ---- FIGHTS and the sin bin (plan 7.11). A challenge needs a grudge of 40 or more; a CPU rival accepts with a chance
 * from its fighting and the grudge; a human rival accepts by pressing lob within three seconds; a turtle costs BOOM.
 * In the fight: balance 100, stamina 100 (regen 25 a second); four moves with their own timings; the loser sits in the
 * box for T.sinBin seconds of play, and the other side is on the power play. ---- */
const FIGHT_MOVE = {
  jab: { t: .25, at: .12, dmg: 6, stam: 8 },
  haymaker: { t: .8, at: .35, dmg: 18, stam: 22 },
  duck: { t: .35, stam: 10 },
  yank: { t: .3, at: .15, stam: 0 }
};
const FIGHT_KEYS = { pass: 'jab', shoot: 'haymaker', deke: 'duck', lob: 'yank' };
const FIGHT_TIME = 20, FIGHT_BALANCE = 100;
/** grudges: M.grudge[a][b] is what skater a holds against b (0..100) */
const grudgeOf = (a, b) => { const i = M.skaters.indexOf(a), j = M.skaters.indexOf(b); return i < 0 || j < 0 ? 0 : M.grudge[i][j]; };
const addGrudge = (a, b, v) => { const i = M.skaters.indexOf(a), j = M.skaters.indexOf(b); if (i >= 0 && j >= 0) M.grudge[i][j] = clamp(M.grudge[i][j] + v, 0, 100); };
const fighter = sk => ({ sk, bal: FIGHT_BALANCE, stam: 100, act: null, aT: 0, cool: 0, guard: 0, open: 0, blind: 0, duck: 0, yanks: [], hood: false, decideT: .3 + srand() * .4 });

/** a challenge: a human's lob held half a second near a rival with a grudge of 40 (a human rival accepts with lob) */
function challengeStep(sk, c, dt) {
  if (!M || M.fight || M.phase !== 'play') return;
  if (M.challenge) { if (M.challenge.of === sk && c.lob) { const ch = M.challenge; M.challenge = null; fightStart(ch.by, ch.of); } return; }
  if ((M.fights || 0) >= T.fightMax || (M.playT || 0) - (M.lastFightT ?? -999) < 60) return;
  if (sk.human && c.lobHeld) {
    sk.lobT = (sk.lobT || 0) + dt;
    if (sk.lobT >= .5) {
      sk.lobT = 0;
      const rival = M.skaters.find(o => o.t !== sk.t && live(o) && dist(o, sk) < 40 && grudgeOf(sk, o) >= 40);
      if (rival) requestFight(sk, rival);
    }
  } else sk.lobT = 0;
}
/** the challenge's three seconds: a human rival who doesn't press lob has turned it down */
function challengeTick(dt) {
  if (!M.challenge) return;
  M.challenge.t -= dt;
  if (M.challenge.t <= 0) { const ch = M.challenge; M.challenge = null; turtle(ch.by, ch.of); }
}
/** the challenge goes to the rival: a CPU accepts with its chance, a human has three seconds to press lob */
function requestFight(by, of) {
  if (!of.human) {
    const p = clamp(.4 + .12 * (M.teams[of.t].def.rate.fgt - 3) + grudgeOf(of, by) / 200, .1, .95);
    if (srand() < p) fightStart(by, of); else turtle(by, of);
    return;
  }
  M.challenge = { by, of, t: 3 };
  say(by.name + ' DROPS THE GLOVES! ' + of.name + ', PRESS LOB TO ACCEPT.');
}
/** a turtle: the one who won't fight loses BOOM and the challenger gains it; the crowd boos */
function turtle(by, of) {
  M.boom[of.t] = Math.max(0, M.boom[of.t] - 10); M.boom[by.t] = Math.min(100, M.boom[by.t] + 10);
  say(of.name + ' SKATES AWAY. THE CROWD BOOS.');
  fx('whistle');
}
/** the CPU's own challenge: a fighter with a grudge of 70 near a human-controlled skater drops the gloves now and then */
function cpuChallenges(dt) {
  if (M.challenge || M.fight || M.phase !== 'play' || (M.fights || 0) >= T.fightMax) return;
  for (const sk of M.skaters) {
    if (sk.human || !live(sk) || M.teams[sk.t].def.rate.fgt < 4) continue;
    const foe = M.skaters.find(o => o.human && o.t !== sk.t && live(o) && dist(o, sk) < 40 && grudgeOf(sk, o) >= 70);
    if (foe && srand() < dt * .2) { M.challenge = { by: sk, of: foe, t: 3 }; say(sk.name + ' DROPS THE GLOVES! ' + foe.name + ', PRESS LOB TO ACCEPT.'); return; }
  }
}
/** the fight: both skaters stop, the camera frames them, the gloves drop; it runs until a balance is gone or the time is up */
function fightStart(a, b) {
  if (M.fight || !live(a) || !live(b)) return;
  M.fights = (M.fights || 0) + 1; M.lastFightT = M.playT || 0; M.challenge = null;
  M.fight = { a, b, t: 0, A: fighter(a), B: fighter(b), view: null, last: '' };
  for (const sk of [a, b]) { sk.state = 'fight'; sk.st = FIGHT_TIME; sk.vx = sk.vy = 0; }
  a.face = Math.atan2(b.y - a.y, b.x - a.x); b.face = a.face + PI;
  M.fight.view = game.baseView; game.setView('brawler');
  M.phase = 'fight'; fx('whistle'); fx('crowd'); M.banner = 'FIGHT!'; M.bannerT = 1.6;
  P.bits(a.x, a.y, 4, 6, ['#d8d8e0', '#c8202a']); P.bits(b.x, b.y, 4, 6, ['#d8d8e0', '#c8202a']);
  say(pick(TEXT.fight, Math.floor(srand() * TEXT.fight.length)));
}
/** a move starts (its stamina is paid; a move with no stamina is slower: the fighter is tired) */
function startMove(F, name) {
  const spec = FIGHT_MOVE[name];
  F.act = { name, done: false }; F.aT = 0; F.stam = Math.max(0, F.stam - spec.stam);
  if (name === 'duck') { F.duck = FIGHT_MOVE.duck.t; }
}
/** the damage a hit does: the attacker's fighting, a guard down, a rival with the head of a jersey pulled */
function fightHit(A, B, dmg) {
  const f = M.fight, k = (.8 + .067 * M.teams[A.sk.t].def.rate.fgt) * (B.guard > 0 ? 1.3 : 1) * (A.open > 0 ? 1.5 : 1);
  B.bal = Math.max(0, B.bal - dmg * k);
  f.last = A.sk.name + ' HITS ' + B.sk.name;
}
/** a fighter's step: the move's active frame, the duck, the yank, the cooldown; then the CPU decides its next move */
function fighterStep(F, O, dt, human) {
  const slow = F.stam <= 0 ? .6 : 1;
  F.stam = Math.min(100, F.stam + 25 * dt);
  F.cool -= dt; F.guard -= dt; F.open -= dt; F.blind -= dt; F.duck -= dt;
  if (F.blind <= 0 && F.hood) F.hood = false;
  F.yanks = F.yanks.filter(t => M.fight.t - t < 4);
  if (F.act) {
    F.aT += dt * slow;
    const name = F.act.name, spec = FIGHT_MOVE[name];
    if (!F.act.done && spec.at !== undefined && F.aT >= spec.at) {
      F.act.done = true;
      if (name === 'jab') { if (O.duck > 0) fightHit(F, O, spec.dmg * .5); else fightHit(F, O, spec.dmg); }
      else if (name === 'haymaker') { if (O.duck > 0) { F.open = .5; M.fight.last = F.sk.name + ' WHIFFS'; } else fightHit(F, O, spec.dmg); }
      else if (name === 'yank') {
        O.guard = .6; O.stam = Math.max(0, O.stam - 15); F.yanks.push(M.fight.t);
        if (F.yanks.length >= 3) { O.blind = 1.5; O.hood = true; F.yanks = []; M.fight.last = F.sk.name + ' PULLS HIS JERSEY OVER HIS HEAD!'; }
      }
    }
    if (F.aT >= spec.t) { F.act = null; F.cool = name === 'duck' ? .4 : .15; }
  }
  if (!F.act && F.cool <= 0) {
    if (human) {
      const I = F.sk.human.p, pick = Object.keys(FIGHT_KEYS).find(k => I.pressed(k));
      if (pick) startMove(F, FIGHT_KEYS[pick]);
    } else {
      F.decideT -= dt;
      if (F.decideT <= 0) {
        F.decideT = .4 + srand() * .3;
        const cpuRate = M.teams[F.sk.t].def.rate.fgt;
        if (O.act && O.act.name === 'haymaker' && O.aT < FIGHT_MOVE.haymaker.at && srand() < .6 * T.cpuSkill) startMove(F, 'duck');
        else { const r = srand(); startMove(F, r < .45 ? 'jab' : r < .45 + .1 + .03 * cpuRate ? 'haymaker' : 'yank'); }
      }
    }
  }
}
/** one step of the fight (the clock stops; the play goes on when it ends) */
function fightStep(dt) {
  const f = M.fight;
  f.t += dt;
  const A = f.A, B = f.B;
  fighterStep(A, B, dt, !!f.a.human);
  fighterStep(B, A, dt, !!f.b.human);
  f.a.st = f.b.st = FIGHT_TIME - f.t;
  if (A.bal <= 0 || B.bal <= 0 || f.t >= FIGHT_TIME) fightEnd();
}
/** the end: a fighter down, the winner's cheer, the loser's box (or a draw, separated by the linesmen) */
function fightEnd() {
  const f = M.fight, A = f.A, B = f.B;
  M.fight = null;
  const winner = A.bal <= 0 && B.bal > 0 ? B : (B.bal <= 0 && A.bal > 0 ? A : null);   // (the time up is a draw, as the plan has it)
  if (f.view) game.setView(f.view);
  if (!winner) {
    for (const F of [A, B]) { F.sk.state = 'skate'; F.sk.st = 0; }
    M.boom[0] = Math.min(100, M.boom[0] + 10); M.boom[1] = Math.min(100, M.boom[1] + 10);
    M.phase = 'play'; M.banner = 'DRAW: THE LINESMEN SEPARATE THEM'; M.bannerT = 2.4;
    say('THE LINESMEN SEPARATE THEM. A DRAW, AND NO PENALTY.');
    return;
  }
  const loser = winner === A ? B : A;
  loser.sk.state = 'bin'; loser.sk.st = T.sinBin; loser.sk.pen = T.sinBin; loser.sk.vx = loser.sk.vy = 0;
  winner.sk.state = 'celebrate'; winner.sk.st = 2.2; winner.sk.vx = winner.sk.vy = 0;
  M.boom[winner.sk.t] = Math.min(100, M.boom[winner.sk.t] + 45 * T.boomGain); M.boom[loser.sk.t] = Math.min(100, M.boom[loser.sk.t] + 5 * T.boomGain);
  if (winner.sk.t === 0) M.fightWins = (M.fightWins || 0) + 1;
  addGrudge(loser.sk, winner.sk, 20);
  M.phase = 'play'; M.banner = winner.sk.name + ' WINS IT'; M.bannerT = 2.2;
  fx('crowd');
  say(winner.sk.name + ' WINS THE FIGHT. ' + loser.sk.name + ' TO THE SIN BIN FOR ' + T.sinBin + '. POWER PLAY!');
}

/* ---- ITEMS AND HAZARDS (plan 7.12, 7.13's greed, 11.2's arena hazards). Fans throw items onto the ice; a skater who
 * reaches one takes its effect. Octopi and rats make slips; the pond's thin ice breaks into holes; the Dome's mascot
 * skates figure eights and can be checked; a crate drops from the ceiling now and then. Everything here is simulation:
 * it draws only from srand(), and what the screen needs is read by the draw code. ---- */
const ITEM = {
  sauce: { name: 'HOT SAUCE', color: '#e8443a' }, tape: { name: "GRANDMA'S TAPE", color: '#f4f4f0' }, poutine: { name: 'POUTINE', color: '#e0b050' },
  lumber: { name: 'LUMBER', color: '#f2c14e' }, pads: { name: 'BRICK PADS', color: '#8a4a30' }, boom: { name: 'BOOM BOX', color: '#3b82f6' },
  cocoa: { name: 'HOT COCOA', color: '#c8502a' }
};
const ARENA_ITEMS = { icebox: ['sauce', 'tape', 'poutine', 'boom'], dome: ['sauce', 'pads', 'boom'], pond: ['cocoa', 'tape', 'lumber', 'boom'], yard: ['poutine', 'lumber', 'boom'], vault: ['poutine', 'pads', 'boom'] };
const THIN_ICE = [[400, 330], [720, 470], [560, 350]];   // (the pond's three patches, outside the creases)
const ITEM_FLIGHT = .9, ITEM_LIFE = 12;

/** the start of a play's items: the next throw, the hazards' clocks, the state of the arena's own things */
function itemsReset() {
  M.items = []; M.slips = []; M.rat = null; M.octoT = 0; M.ratT = 50; M.crate = null; M.crateT = 40; M.hatT = 0;
  M.pads = [0, 0]; M.throwT = 25 + srand() * 20; M.organ = M.arena.id === 'vault';
  M.thin = M.arena.id === 'pond' ? THIN_ICE.map(([x, y]) => ({ x, y, integ: 100, hole: false, holeT: 0, frozen: [] })) : [];
  M.mascot = M.arena.id === 'dome' ? { x: CX, y: CY, down: 0, wave: 0 } : null;
}
/** a fan throws: the item arcs over the glass onto the neutral or attacking zone and slides to a stop */
function throwItem(kind) {
  M.thrown = (M.thrown || 0) + 1;
  const list = ARENA_ITEMS[M.arena.id] || ['boom'];
  const k = kind || list[Math.floor(srand() * list.length)];
  const north = srand() < .5, sx = 300 + srand() * 520, sy = north ? 150 : 650;
  const tx = 300 + srand() * 520, ty = north ? 270 + srand() * 60 : 470 + srand() * 60;
  M.items.push({ kind: k, x0: sx, y0: sy, x1: tx, y1: ty, u: 0, x: sx, y: sy, z: 0, vx: 0, vy: 0, landed: false, life: ITEM_LIFE, t: 0 });
  say(pick(['A FAN THREW A ' + ITEM[k].name + ' ONTO THE ICE!', 'HERE COMES A ' + ITEM[k].name + ' FROM THE STANDS!'], Math.floor(srand() * 2)));
}
/** a skater who reaches an item takes it: each item's effect goes to its holder (and BOOM BOX to the team) */
function takeItem(it, sk) {
  const k = it.kind;
  if (k === 'sauce') sk.sauce = 8;
  else if (k === 'tape') sk.tape = 10;
  else if (k === 'poutine') sk.poutine = 10;
  else if (k === 'lumber') sk.lumber = 3;
  else if (k === 'pads') M.pads[sk.t] = 12;
  else if (k === 'cocoa') { sk.cocoa = 8; sk.stam = 100; }
  else if (k === 'boom') M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 40 * T.boomGain);
  it.taken = true;
  say(sk.name + ' GRABS THE ' + ITEM[k].name + '!');
  fx('hit', sk.x, sk.y);
}
/** a skater's timers: how long each effect lasts (the HUD over the head shows them) */
function effectsStep(sk, dt) {
  sk.sauce = Math.max(0, (sk.sauce || 0) - dt); sk.tape = Math.max(0, (sk.tape || 0) - dt); sk.poutine = Math.max(0, (sk.poutine || 0) - dt);
  sk.cocoa = Math.max(0, (sk.cocoa || 0) - dt);
}
/** the thin ice: a knockdown on a patch costs 50 and a big hit there 100; at 0 the patch is a hole */
function thinIceHit(sk, cost) {
  if (!M.thin || !M.thin.length) return;
  const p = M.thin.find(q => !q.hole && Math.hypot((sk.x - q.x) / 20, (sk.y - q.y) / 12) < 1);
  if (!p) return;
  p.integ -= cost;
  if (p.integ <= 0) { p.hole = true; p.holeT = 0; fx('glass', p.x, p.y); say('THE ICE GIVES WAY! A HOLE IN THE POND!'); }
  else say('THE ICE CRACKS!');
}
const inEllipse = (x, y, p, rx, ry) => Math.hypot((x - p.x) / rx, (y - p.y) / ry) < 1;
/** the step of all of it: throws and pickups, the crate, the octopi and rats, the thin ice, the mascot */
function itemsStep(dt) {
  if (!M.items) itemsReset();
  M.throwT -= dt;
  if (M.throwT <= 0) { throwItem(); M.throwT = 25 + srand() * 20; }
  for (const it of M.items) {
    if (it.taken) continue;
    if (!it.landed) {
      it.t += dt; const u = Math.min(1, it.t / ITEM_FLIGHT);
      it.x = it.x0 + (it.x1 - it.x0) * u; it.y = it.y0 + (it.y1 - it.y0) * u; it.z = 40 * 4 * u * (1 - u);
      if (u >= 1) { it.landed = true; it.z = 0; const a = srand() * TAU; it.vx = Math.cos(a) * 40; it.vy = Math.sin(a) * 40; }
    } else {
      it.vx *= Math.exp(-dt * 3); it.vy *= Math.exp(-dt * 3); it.x += it.vx * dt; it.y += it.vy * dt; it.life -= dt;
      for (const sk of M.skaters) if (live(sk) && sk.state !== 'bin' && Math.hypot(sk.x - it.x, sk.y - it.y) < 12) { takeItem(it, sk); break; }
    }
  }
  M.items = M.items.filter(it => !it.taken && !(it.landed && it.life <= 0));
  // the crate (the Dome's Discount Drop): every 40 s it falls to center ice and breaks into any power-up
  if (M.mascot) {
    M.crateT -= dt;
    if (M.crateT <= 0) { M.crateT = 40; M.crate = { z: 90, t: 0 }; say('THE DISCOUNT DROP IS COMING DOWN!'); }
    if (M.crate) { M.crate.t += dt; M.crate.z = Math.max(0, 90 * (1 - M.crate.t / .9)); if (M.crate.t >= .9) { M.crate = null; M.items.push({ kind: pick(Object.keys(ITEM), Math.floor(srand() * 7)), x0: CX, y0: CY, x1: CX, y1: CY, u: 1, x: CX, y: CY, z: 0, vx: 0, vy: 0, landed: true, life: ITEM_LIFE, t: 1 }); } }
    // the mascot: figure eights in the neutral zone during play, a moving obstacle that can be checked
    // (his figure eights, plus the knock he has taken: a mass of 1.5 slides back to the path)
    const mo = M.mascot;
    mo.kx = mo.kx || 0; mo.kz = mo.kz || 0; mo.kx *= Math.exp(-dt * 2.5); mo.kz *= Math.exp(-dt * 2.5); mo.ox = clamp((mo.ox || 0) + mo.kx * dt, -70, 70); mo.oy = clamp((mo.oy || 0) + mo.kz * dt, -50, 50);
    if (M.phase === 'play') { const tp = M.playT || 0; mo.bx = CX + 150 * Math.sin(tp * .7); mo.by = CY + 70 * Math.sin(tp * 1.4); }
    mo.x = (mo.bx ?? CX) + (mo.ox || 0); mo.y = (mo.by ?? CY) + (mo.oy || 0);
    if (M.mascot.down > 0) M.mascot.down -= dt; else M.mascot.wave += dt;
    for (const sk of M.skaters) {
      if (!live(sk) || sk.state === 'bin') continue;
      const d = Math.hypot(sk.x - M.mascot.x, sk.y - M.mascot.y);
      if (d < 16 && M.mascot.down <= 0 && sk.state === 'check') { M.mascot.down = 3; M.boom[sk.t] = Math.min(100, M.boom[sk.t] + 10 * T.boomGain); M.banner = 'MASCOT DOWN!'; M.bannerT = 2; say('MASCOT DOWN! POLAR PETE IS ON THE ICE!'); fx('hit', M.mascot.x, M.mascot.y); }
      if (d < 14 && M.mascot.down <= 0) { const dx = (sk.x - M.mascot.x) / (d || 1), dy = (sk.y - M.mascot.y) / (d || 1); sk.x = M.mascot.x + dx * 14; sk.y = M.mascot.y + dy * 14; M.mascot.kx = (M.mascot.kx || 0) + dx * sk.vx * .5; M.mascot.kz = (M.mascot.kz || 0) + dy * sk.vy * .5; }
    }
  }
  // the octopus (after a goal in the Lumber Yard) and the rat: slip patches that move or stay until the stoppage
  if (M.arena.id === 'yard') {
    M.ratT -= dt;
    if (M.ratT <= 0 && !M.rat) { M.rat = { x: CX - 200, y: CY, t: 10, a: srand() * TAU }; M.ratT = 50; say('A RUBBER RAT SCURRIES ONTO THE ICE!'); }
    if (M.rat) { M.rat.t -= dt; M.rat.a += (srand() - .5) * 4 * dt; M.rat.x = clamp(M.rat.x + Math.cos(M.rat.a) * 60 * dt, 160, 960); M.rat.y = clamp(M.rat.y + Math.sin(M.rat.a) * 60 * dt, 240, 560); if (M.rat.t <= 0) M.rat = null; }
  }
  // the pond's thin ice: a hole swallows a puck and freezes a skater for three seconds, then refreezes after 30 s
  for (const p of M.thin || []) {
    if (p.hole) {
      p.holeT += dt;
      if (p.holeT >= 30) { p.hole = false; p.integ = 100; p.holeT = 0; }
      if (M.puck.owner === null && M.phase === 'play' && inEllipse(M.puck.x, M.puck.y, p, 20, 12) && M.puck.z < 6) { say('THE PUCK GOES DOWN THE HOLE!'); M.stopTo = nearestFaceoff(M.puck.x, M.puck.y); M.phase = 'stop'; M.timer = 1.2; M.puck.vx = M.puck.vy = 0; }
      for (const sk of M.skaters) if (live(sk) && sk.state !== 'bin' && inEllipse(sk.x, sk.y, p, 20, 12) && sk.state !== 'frozen') { sk.state = 'frozen'; sk.st = 3; sk.vx = sk.vy = 0; }
    }
  }
  if (M.thin) for (const sk of M.skaters) if (sk.state === 'frozen' && sk.st <= 0) { sk.state = 'skate'; const q = M.thin.find(z => z.hole && inEllipse(sk.x, sk.y, z, 20, 12)); if (q) { sk.x = q.x + 24; sk.y = q.y; } }
  // the octopus: a slip patch that slides a skater's legs out from under them
  for (const sl of M.slips || []) if (sl.t !== undefined) { sl.t -= dt; }
  M.slips = (M.slips || []).filter(sl => sl.t === undefined || sl.t > 0);
  for (const sk of M.skaters) {
    if (!live(sk) || sk.state === 'bin' || sk.state === 'slip' || sk.state === 'frozen' || sk.state === 'buried') continue;
    const onSlip = (M.slips || []).some(sl => Math.hypot(sk.x - sl.x, sk.y - sl.y) < sl.r) || (M.rat && Math.hypot(sk.x - M.rat.x, sk.y - M.rat.y) < 9);
    if (onSlip) { sk.state = 'slip'; sk.st = 1.2; fx('thump'); say(pick(['SLIPPED ON THE OCTOPUS!', 'WHAT A SLIP!'], 0)); }
  }
  for (const sk of M.skaters) if (sk.state === 'slip' || sk.state === 'buried' || sk.state === 'frozen') { if (sk.state === 'buried' && sk.st <= 0) sk.state = 'skate'; }
  // the hat trick: the third goal by one player makes the stands throw hats
  M.hatT = Math.max(0, M.hatT - dt);
}
/** the mascot is drawn, the items on the ice, the patches, the holes, the octopus and the rat, and the timers over heads */
function drawItems(r, view) {
  if (!M.items) return;
  for (const it of M.items) {
    const c = ITEM[it.kind].color, blink = it.landed && it.life < 3 && Math.floor(it.life * 6) % 2 === 0;
    if (blink) continue;
    r.shadow(it.x, it.y, 4, .3);
    r.queue(it.x, it.y, it.z + 3, g => { const [x, y] = r.w(it.x, it.y, it.z + 3); px.rect(g, Math.round(x) - 3, Math.round(y) - 3, 6, 6, c); px.rect(g, Math.round(x) - 1, Math.round(y) - 1, 2, 2, '#ffffff'); }, { emissive: true });
  }
  for (const sl of M.slips || []) r.queue(sl.x, sl.y, 0, g => drawPatch(g, r, sl.x, sl.y, sl.r, sl.r * .6, '#8a4aa8', '#c8a0e8'));
  if (M.rat) r.queue(M.rat.x, M.rat.y, 0, g => drawPatch(g, r, M.rat.x, M.rat.y, 8, 5, '#6a4a2a', '#b89070'));
  for (const p of M.thin || []) r.queue(p.x, p.y, 0, g => drawPatch(g, r, p.x, p.y, 20, 12, p.hole ? '#0a1a2a' : (p.integ < 100 ? '#c0dcec' : '#e8f4fc'), p.hole ? '#2a6a9a' : '#9ab8cc'));
  if (M.mascot) {
    if (!M.mascotRig) M.mascotRig = new E.Humanoid({ size: 1.3, build: 'bulky', hat: { style: 'pointed', color: '#e8443a' }, colors: { cloth: '#e8443a', pants: '#2a2a2a', trim: '#f4f4f0', boot: '#1a1a1a', hair: '#e8443a', skin: '#c89070', belt: '#f2c14e' }, speedRef: 80 });
    const mo = M.mascot;
    r.shadow(mo.x, mo.y, 7, .35);
    r.actor(mo.x, mo.y, 0, (g, ox, oy) => M.mascotRig.draw(g, ox, oy, view));
    M.mascotRig.update(1 / 60, { x: mo.x, y: mo.y, z: 0, vx: 0, vy: 0, facing: 0, down: mo.down > 0, pose: mo.down > 0 ? null : (mo.wave % 2 < 1 ? 'wave' : null) });
  }
  if (M.crate) r.queue(CX, CY, M.crate.z + 6, g => { const [x, y] = r.w(CX, CY, M.crate.z + 6); px.rect(g, Math.round(x) - 5, Math.round(y) - 5, 10, 10, '#c8a060'); px.rect(g, Math.round(x) - 4, Math.round(y) - 4, 8, 2, '#6a4a2a'); });
  for (const sk of M.skaters) if (sk.sauce > 0 && M.tick % 8 === 0) P.sparks(sk.x, sk.y, 2, 3, null, { color: '#ff5a2a', speed: 18 });   // (HOT SAUCE's fire trail)
  for (const sk of M.skaters) {
    const tags = [];
    if (sk.sauce > 0) tags.push(['SAUCE ' + Math.ceil(sk.sauce), ITEM.sauce.color]);
    if (sk.tape > 0) tags.push(['TAPE ' + Math.ceil(sk.tape), '#f4f4f0']);
    if (sk.poutine > 0) tags.push(['POUTINE ' + Math.ceil(sk.poutine), ITEM.poutine.color]);
    if (sk.lumber > 0) tags.push(['LUMBER x' + sk.lumber, ITEM.lumber.color]);
    if (sk.cocoa > 0) tags.push(['COCOA ' + Math.ceil(sk.cocoa), ITEM.cocoa.color]);
    tags.forEach(([s, col], i) => r.textAt(sk.x, sk.y, 34 + i * 5, s, col, { align: 'center' }));
  }
  if (M.pads) for (let t = 0; t < 2; t++) if (M.pads[t] > 0) r.textAt(GX[t], CY, 26, 'BRICK PADS ' + Math.ceil(M.pads[t]), ITEM.pads.color, { align: 'center' });
}
/** a patch on the ice: a filled ellipse with a rim, drawn in screen pixels through the view */
function drawPatch(g, r, x, y, rx, ry, fill, rim) {
  const [cx, cy] = r.w(x, y, 0);
  for (let dy = -ry; dy <= ry; dy += 1) for (let dx = -rx; dx <= rx; dx += 1) {
    const e = Math.hypot(dx / rx, dy / ry);
    if (e > 1) continue;
    const [sx, sy] = r.w(x + dx, y + dy, 0);
    px.rect(g, Math.round(sx), Math.round(sy), 1, 1, e > .85 ? rim : fill);
  }
}

/* ---- THE FLOOD WAGON (the intermission minigame): a resurfacer drives the rink's lap and clears the ice it passes.
 * Steer left and right; it drives itself. Clean ice is a percent; 90 percent or more is a perfect resurfacing (BOOM +30).
 * The skip (Back) runs the AI driver's lap, which is never perfect. ---- */
const FLOOD = { cols: 36, rows: 16, time: 55, perfect: 90, speed: 130, clear: 46 };
function floodStart() {
  const C = FLOOD.cols, R = FLOOD.rows;
  const cells = [];
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
    const x = 128 + (i + .5) * (864 / C), y = 208 + (j + .5) * (384 / R);
    cells.push({ x, y, ice: sdRect(x, y) < -8, clean: false });
  }
  flood = { cells, total: cells.filter(c => c.ice).length, clean: 0, x: 200, y: CY, a: 0, t: 0, done: false, skipped: false, res: null, back: 0, auto: false };
}
let flood = null;
function floodTick(dt, input) {
  const f = flood; if (!f || f.done) return;
  f.t += dt;
  // (the AI driver runs the lanes; the player steers, or the AI drives for a skip)
  const steer = f.auto ? floodLaneSteer(f) : (input && input.move ? input.move()[0] : 0) * 2.6;
  f.a += steer * dt;
  f.x += Math.cos(f.a) * FLOOD.speed * dt; f.y += Math.sin(f.a) * FLOOD.speed * dt;
  if (f.y < 226 || f.y > 574) f.a = Math.atan2(CY - f.y, CX - f.x) + (f.y < 400 ? .3 : -.3) * 0;   // (the boards turn it back toward the middle)
  if (f.x < 146 || f.x > 974) f.a = Math.atan2(CY - f.y, CX - f.x) * .6 + f.a * .4;
  f.x = clamp(f.x, 140, 980); f.y = clamp(f.y, 220, 580);
  for (const c of f.cells) if (!c.clean && c.ice && Math.hypot(c.x - f.x, c.y - f.y) < FLOOD.clear) { c.clean = true; f.clean++; }
  if (f.t >= FLOOD.time) floodEnd(false);
}
/** the AI driver: the lanes, one after another, across the whole rink */
const FLOOD_LANES = [236, 300, 364, 428, 492, 556].flatMap((y, i) => (i % 2 ? [[150, y], [970, y]] : [[970, y], [150, y]]));
function floodLaneSteer(f) {
  const [wx, wy] = FLOOD_LANES[Math.min(f.lane || 0, FLOOD_LANES.length - 1)];
  if (Math.hypot(wx - f.x, wy - f.y) < 30 && (f.lane || 0) < FLOOD_LANES.length - 1) f.lane = (f.lane || 0) + 1;
  const [tx, ty] = FLOOD_LANES[Math.min(f.lane || 0, FLOOD_LANES.length - 1)];
  let da = Math.atan2(ty - f.y, tx - f.x) - f.a;
  while (da > PI) da -= TAU;
  while (da < -PI) da += TAU;
  return clamp(da * 1.5, -1, 1) * 2.6;
}
/** the lap's end: a skip hands the wagon to the AI for its last six seconds; a declined lap is no resurfacing */
function floodEnd(skip) {
  const f = flood; if (!f || f.done) return;
  if (skip && !f.auto) { f.auto = true; f.skipped = true; f.t = Math.max(f.t, FLOOD.time - 6); return; }
  f.done = true;
  const pct = Math.round(f.clean / f.total * 100);
  f.res = { pct, perfect: !f.skipped && pct >= FLOOD.perfect };
}
/** the scene: the match is paused; the resurfacing shows over the rink in the overhead, and the result goes to the match */
scenes.flood = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { floodStart(); flood.asking = game.settings.flood !== 'Always'; A.music('title'); },
  update(dt) {
    const I = game.input;
    if (flood && flood.asking) { if (I.pressed('confirm')) { I.consumeAll(); flood.asking = false; } else if (I.pressed('cancel')) { I.consumeAll(); flood.skipped = true; floodEnd(false); } return; }
    if (flood && flood.res) { flood.back += dt; if (flood.back > 2.2 || I.pressed('confirm')) { I.consumeAll(); floodFinish(); } return; }
    floodTick(dt, I);
    if (I.pressed('cancel') && flood) { I.consumeAll(); floodEnd(true); }
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    const f = flood; if (!f) return;
    r.overlay(g => {
      const W = Math.round(r.W * .7), H = Math.round(W * 384 / 864), X0 = Math.round((r.W - W) / 2), Y0 = Math.round(r.H * .3), cw = W / FLOOD.cols, ch = H / FLOOD.rows;
      E.ui.box(g, X0 - 8, Y0 - 30, W + 16, H + 60, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.title(g, 'THE FLOOD WAGON', r.W / 2, Math.round(r.H * .07), { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      for (const c of f.cells) { if (!c.ice) continue; px.rect(g, Math.round(X0 + (c.x - 128) / 864 * W), Math.round(Y0 + (c.y - 208) / 384 * H), Math.ceil(cw), Math.ceil(ch), c.clean ? '#e9f3fb' : '#5a7a98'); }
      const wx = X0 + (f.x - 128) / 864 * W, wy = Y0 + (f.y - 208) / 384 * H;
      px.rect(g, Math.round(wx) - 3, Math.round(wy) - 3, 6, 6, '#e8443a');
      px.line(g, Math.round(wx), Math.round(wy), Math.round(wx + Math.cos(f.a) * 8), Math.round(wy + Math.sin(f.a) * 8), '#ffffff', 1);
      const pct = f.res ? f.res.pct : Math.round(f.clean / f.total * 100);
      E.font.text(g, 'CLEAN ' + pct + '%   TIME ' + Math.max(0, Math.ceil(FLOOD.time - f.t)) + 's   PERFECT AT ' + FLOOD.perfect + '%', r.W / 2, Y0 + H + 14, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      if (f.asking) E.font.text(g, 'PLAY THE FLOOD WAGON?   ' + prompt('confirm', 'YES') + '   ' + prompt('cancel', 'SKIP'), r.W / 2, Y0 + H + 28, '#ffe7a8', { align: 'center', font: 'tiny', outline: '#000' });
      else if (f.res) E.font.text(g, f.res.perfect ? 'PERFECT RESURFACING! +30 BOOM' : (f.skipped ? 'THE AI DRIVER DID ITS LAP' : 'GOOD ENOUGH. THE ICE IS STILL A LITTLE WET.'), r.W / 2, Y0 + H + 28, '#ffe7a8', { align: 'center', font: 'tiny', outline: '#000' });
      else E.font.text(g, prompt('left', 'STEER') + ' / ' + prompt('right', 'STEER') + '   ' + prompt('cancel', 'SKIP (AI DRIVES)'), r.W / 2, Y0 + H + 28, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
/** the lap is done: the perfect resurfacing gives the home side its BOOM, then the match goes on with the next period */
function floodFinish() {
  const res = flood && flood.res;
  if (res && res.perfect && M) { M.boom[0] = Math.min(100, M.boom[0] + 30 * T.boomGain); M.banner = 'PERFECT RESURFACING!'; M.bannerT = 2.5; say('THE FLOOD WAGON LEAVES A MIRROR. THE HOME SIDE GETS A BOOST.'); }
  flood = null;
  game.go('match', { resume: true }, { fade: 'iris' });
}
/** a hat trick: the stands throw hats (cosmetic) and the booth calls it */
function hatTrick(sk) {
  say('HAT TRICK! ' + sk.name + ' HAS THREE! THE HATS COME DOWN!');
  for (let i = 0; i < 3; i++) P.bits(CX + (srand() - .5) * 700, CY + (srand() - .5) * 300, 60, 12, ['#e8443a', '#3b82f6', '#f2c14e', '#f4f4f0']);
  M.hatT = 4;
}

/* ---- THE SHOOTOUT (plan 7.14): after a tied overtime, three shots each (home first), then sudden death. A shooter
 * starts at centre with the puck and an 8-second clock; the attempt ends on a shot, a save, a goal, or the puck going
 * back. A human shooter drives it with the stick and the shoot button; a CPU shooter winds up and fires. A human on the
 * defending side steers the goalie along the line (the stick). The goals decide it. ---- */
function shootoutStart() {
  M.inSO = true; M.phase = 'so'; M.soAtt = 0; M.soGoalsT = [0, 0]; M.soT = 0; M.soPhase = 'ready'; M.soReady = 1.0;
  M.banner = 'SHOOTOUT!'; M.bannerT = 2.5; fx('horn'); say('SHOOTOUT! THREE SHOTS EACH, THEN SUDDEN DEATH.');
  soSetup();
}
/** the next shooter: the home side first, then the away side; each side's first skater takes the shots */
function soSetup() {
  const t = M.soAtt % 2, sk = M.skaters.find(s => s.t === t && s.slot === 0) || M.skaters.find(s => s.t === t);
  const d = dirOf(t);
  M.soSk = sk; M.over = false;
  sk.x = CX - 50 * d; sk.y = CY; sk.vx = sk.vy = 0; sk.face = d > 0 ? 0 : PI; sk.state = 'skate'; sk.st = 0; sk.cool = 0; sk.charge = 0;
  sk.want = .75 + srand() * .25;
  for (const g of M.goalies) { g.x = GX[g.t] + dirOf(g.t) * 12; g.y = CY; g.vx = g.vy = 0; g.state = 'ready'; g.react = T.goalieReact; }
  const pk = M.puck; pk.owner = sk; pk.shot = null; pk.pass = null; pk.z = 0; pk.vx = pk.vy = pk.vz = 0; pk.x = sk.x + d * 10; pk.y = sk.y; pk.inNet = false;
  M.soPhase = 'ready'; M.soReady = 1.0; M.soT = 0;
  say(sk.name + ' IS UP. ' + (sk.human ? 'HOLD SHOOT AND LET GO.' : 'HERE COMES THE SHOT.'));
}
/** one step of an attempt: the wind-up of a CPU shooter, the human's stick, the puck's flight, the clock */
function soStep(dt) {
  const sk = M.soSk, pk = M.puck;
  for (const g of M.goalies) goalieStep(g, dt);
  if (M.soPhase === 'ready') {
    M.soReady -= dt;
    if (M.soReady <= 0) M.soPhase = 'shot';
    return;
  }
  M.soT += dt;
  if (M.soPhase === 'shot') {
    if (sk.human) skaterStep(sk, dt);
    else if (!pk.shot && M.soT > .6) { pk.owner = sk; sk.charge = Math.min(1, sk.charge + dt / T.chargeTime); if (sk.charge >= sk.want) { const ch = sk.charge; sk.charge = 0; shoot(sk, Math.max(.1, ch), { y: CY + (srand() - .5) * 24 }); } }
    if (pk.shot) M.soPhase = 'flight';
    if (M.soT > 8 && !pk.shot) return soNext();
    return;
  }
  // the flight: the puck's own step; the attempt ends when it stops, goes back, or the clock runs out
  puckStep(dt);
  const spd = Math.hypot(pk.vx, pk.vy);
  if (M.phase !== 'so') return;   // (a goal or a whistle moved the match on)
  if (sdRect(pk.x, pk.y) > 3) return soNext();   // (off the ice: the attempt is over)
  if (pk.owner || (spd < 6 && pk.z < 1 && M.soT > 1) || M.soT > 12) return soNext();
}
/** an attempt is over: the tally, the decision (after each side has had three, the goals decide; then sudden death) */
function soNext() {
  M.soAtt++;
  const rounds = Math.ceil(M.soAtt / 2);
  if (rounds >= 3 && M.soAtt % 2 === 0 && M.soGoalsT[0] !== M.soGoalsT[1]) return soFinish(M.soGoalsT[0] > M.soGoalsT[1] ? 0 : 1);
  if (M.soAtt >= 40) return soFinish(srand() < .5 ? 0 : 1);
  M.phase = 'so'; M.puck.shot = null;
  soSetup();
}
function soFinish(w) {
  M.inSO = false; M.soWinner = w; M.soScore = M.soGoalsT.slice();
  M.phase = 'over'; M.over = true; M.timer = 2; fx('horn');
  say('SHOOTOUT! ' + M.teams[w].def.name + ' WIN IT ' + M.soGoalsT[0] + ' - ' + M.soGoalsT[1] + '.');
}
/** the defending human's stick moves the goalie along the line in a shootout */
function soGoalieStep(g, dt) {
  const h = M.humans.find(x => x.sk.t === g.t && x.p);
  if (!h) return false;
  const mv = h.p.move();
  g.vy = mv[1] * T.goalieSpeed; g.y = clamp(g.y + g.vy * dt, CY - 30, CY + 30); g.x = GX[g.t] + dirOf(g.t) * 12; g.face = dirOf(g.t) > 0 ? 0 : PI;
  return true;
}

/* ---- THE SHOW: the instant replay after a goal (the last few seconds, at half speed, from the ring of frames the
 * match keeps), the camera's punch-in on a big hit, the chirp bubbles, the player introductions at the first faceoff,
 * and the crowd's waves and signs. None of it changes the match: the replay puts the frames on the entities and then
 * gives back the real positions. ---- */
const CROWD_SIGNS = ['GO TROUT!', 'KABOOM!', 'HOW?!', 'BOO!', 'NICE!', 'SKATE!'];
/** a frame of the match, kept every sixth step (20 a second) for the replay */
function histStep() {
  if (M.tick % 6) return;
  M.hist = M.hist || [];
  M.hist.push({ sk: M.skaters.map(s => [s.x, s.y, s.face, s.state]), gl: M.goalies.map(g => [g.x, g.y, g.face, g.state]), pk: [M.puck.x, M.puck.y, M.puck.z] });
  if (M.hist.length > 90) M.hist.shift();
}
/** the goal's replay: the frames before it, at half speed, then the real positions come back */
function replayStart() {
  if (M.inSO || !M.hist || M.hist.length < 10 || game.settings.replays === 'Off') return;
  M.replay = { frames: M.hist.slice(-50), i: 0, saved: null };
}
function replayStep(dt) {
  const R = M.replay;
  if (!R.saved) R.saved = { sk: M.skaters.map(s => [s.x, s.y, s.face, s.state]), gl: M.goalies.map(g => [g.x, g.y, g.face, g.state]), pk: [M.puck.x, M.puck.y, M.puck.z] };
  R.i += dt * 10;
  if (R.i >= R.frames.length) {
    M.skaters.forEach((s, i) => { [s.x, s.y, s.face, s.state] = R.saved.sk[i]; });
    M.goalies.forEach((g, i) => { [g.x, g.y, g.face, g.state] = R.saved.gl[i]; });
    [M.puck.x, M.puck.y, M.puck.z] = R.saved.pk;
    M.replay = null; return;
  }
  const f = R.frames[Math.floor(R.i)];
  M.skaters.forEach((s, i) => { [s.x, s.y, s.face, s.state] = f.sk[i]; });
  M.goalies.forEach((g, i) => { [g.x, g.y, g.face, g.state] = f.gl[i]; });
  [M.puck.x, M.puck.y, M.puck.z] = f.pk;
}
/** the booth's introductions: each side's players, once, at the first faceoff */
function introduce() {
  M.introDone = true;
  if (game.settings.intros === 'Off') return;
  const names = M.humans.map(h => h.sk.name + ' #' + h.sk.num).join(', ');
  if (names) { M.banner = 'NOW SKATING: ' + names.toUpperCase(); M.bannerT = 3; say('ON THE ICE, ' + M.teams[0].def.name + ' AGAINST ' + M.teams[1].def.name + '. ' + names + '.'); }
}
/** a crowd wave, for a goal or a big hit (the stands stand, sway and hold signs) */
function waveStart() { M.waveT = 4; }
/* the Team AI's cadence: a CPU skater re-thinks every lerp(.3, .12, skill) seconds, and its new decision takes effect
 * after lerp(.35, .1, skill) seconds (the reaction). The skill comes from the CPU skill setting (0.5 .. 1.5). Between
 * decisions it keeps steering the same way; a one-shot action (a pass, a check, a shot) is taken once. */
function aiThink(sk, dt) {
  const skill = clamp(T.cpuSkill - .5, 0, 1), now = M.playT || 0;
  sk.thinkT = (sk.thinkT || 0) - dt;
  if (sk.thinkT <= 0) { sk.thinkT = lerp(.3, .12, skill); sk.pend = { c: aiCtrl(sk, dt), at: now + lerp(.35, .1, skill) }; }
  if (sk.pend && now >= sk.pend.at) { sk.dec = sk.pend.c; sk.pend = null; }
  if (!sk.dec) sk.dec = aiCtrl(sk, dt);
  const out = Object.assign({}, sk.dec);
  Object.assign(sk.dec, { pass: false, lob: false, check: false, shootUp: false, deke: false, switch: false });   // (one-shots are taken once)
  return out;
}
/** the broadcast director: the puck is followed; a fight frames the two fighters; the replay and the overhead follow the same way */
let camMode = 'follow';
function directorStep() {
  if (M.fight && M.fight.a && M.fight.b) {
    if (camMode !== 'fight') { game.follow(null); camMode = 'fight'; }
    const a = M.fight.a, b = M.fight.b;
    game.cam.frame([{ x: a.x, y: a.y, z: 0 }, { x: b.x, y: b.y, z: 0 }], { margin: 40, zoom: [1, 1.7] });
    return;
  }
  if (camMode !== 'follow') { game.cam.frame(null); game.follow(M.puck, { z: 8, lead: 10 }); game.cam.smooth = .18; camMode = 'follow'; }
}

/* ---- THE LOOK: the sound (every voice and song is written in code), the booth's talk, the rink's props, the skaters'
 * sticks, the nets, the puck, the crowd, and the HUD (the score bug, the BOOM meters, the banner, the fight, the box). ---- */
const PUCK_SPR = E.sprite(['.kkk.', 'kkkkk', 'kkkkk', '.kkk.'], { k: '#16161e' });
for (const [name, wave, f] of BABBLE) A.define(name, { wave, freq: f, to: f * .7, dur: .06, vol: .1 });
A.define('wrist', { wave: 'noise', freq: 1200, to: 300, dur: .08, vol: .3, filter: 'lowpass' });
A.define('slap', { wave: 'noise', freq: 800, to: 150, dur: .18, vol: .45, filter: 'lowpass' });
A.define('thump', { wave: 'sine', freq: 120, to: 60, dur: .1, vol: .3 });
A.define('hit', { wave: 'noise', freq: 420, to: 120, dur: .22, vol: .5, filter: 'lowpass' });
A.define('glass', { wave: 'noise', freq: 4200, to: 1400, dur: .5, vol: .32, filter: 'lowpass' });
A.define('save', { wave: 'square', freq: 520, to: 300, dur: .15, vol: .25 });
A.define('post', { wave: 'triangle', freq: 1400, to: 1100, dur: .3, vol: .25 });
A.define('whistle', { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .14 });
A.define('horn', { wave: 'square', freq: 196, to: 180, vib: [6, .08], dur: 1.4, vol: .28 });
A.define('kick', { wave: 'noise', freq: 900, to: 200, dur: .07, vol: .3 });
A.define('select', { wave: 'square', freq: 660, dur: .05, vol: .12 });
A.define('cancel', { wave: 'square', freq: 300, dur: .08, vol: .1 });
A.define('blip', { wave: 'square', freq: 880, dur: .04, vol: .08 });
const SONG_MATCH = { bpm: 156, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: 'A4 . C5 . E5 . A5 . | G5 . E5 . D5 . C5 . | F5 . A5 . C6 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .28, notes: 'A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | D2 . A2 . D2 . A2 . | E2 . B2 . E2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };
const SONG_ATTRACT = SONG_MATCH;

/** the booth: its voice, its one line at a time, the subtitles at the bottom where the touch buttons aren't */
const talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c070', voice: 'babbleA', speed: 32 });
function talkSay(text, o) { talk.say(text, Object.assign({ name: 'THE BOOTH', auto: 2.6, modal: false, alpha: .85 }, o || {})); }

/** the skater's stick: its shaft from the hand to the blade, with the tape, drawn over the body in the view */
function drawStick(g, ox, oy, sk, r) {
  const [x0, y0] = r.w(sk.x, sk.y, 0), bx = sk.x + Math.cos(sk.face) * 11, by = sk.y + Math.sin(sk.face) * 11;
  const [x1, y1] = r.w(bx, by, 0), [hx, hy] = r.w(sk.x + Math.cos(sk.face) * 3, sk.y + Math.sin(sk.face) * 3, 9);
  const dx = x1 - x0, dy = y1 - y0;
  px.line(g, Math.round(ox + hx - x0), Math.round(oy + hy - y0), Math.round(ox + dx), Math.round(oy + dy), '#c8a070', 1);
  px.line(g, Math.round(ox + dx - 1), Math.round(oy + dy), Math.round(ox + dx + 2), Math.round(oy + dy), '#1a1a1e', 2);
  px.rect(g, Math.round(ox + dx), Math.round(oy + dy - 1), 1, 1, '#f4f4f0');
}
/** the net: a translucent mesh with its posts and crossbar, drawn at the goal */
function drawNet(g, r, k) {
  const x0 = k === 0 ? 156 : 946, x1 = k === 0 ? 174 : 964, lines = [];
  for (let y = 378; y <= 422; y += 4) { lines.push([x0, y, 0, x1, y, 0]); lines.push([x0, y, 20, x1, y, 20]); }
  for (let x = x0; x <= x1; x += 4) lines.push([x, 378, 0, x, 378, 20], [x, 422, 0, x, 422, 20]);
  for (const [ax, ay, az, bx, by, bz] of lines) {
    const [p1, q1] = r.w(ax, ay, az), [p2, q2] = r.w(bx, by, bz);
    px.line(g, Math.round(p1), Math.round(q1), Math.round(p2), Math.round(q2), 'rgba(240,244,255,.35)', 1);
  }
  for (const y of [384, 416]) { const [p1, q1] = r.w(GX[k], y, 0), [p2, q2] = r.w(GX[k], y, 20); px.line(g, Math.round(p1), Math.round(q1), Math.round(p2), Math.round(q2), '#f4f4f0', 2); }
  const [p1, q1] = r.w(GX[k], 384, 20), [p2, q2] = r.w(GX[k], 416, 20); px.line(g, Math.round(p1), Math.round(q1), Math.round(p2), Math.round(q2), '#f4f4f0', 2);
}
/** the crowd: little figures in the stands around the boards, in the arena's colors, bobbing (red lights and cheers on goals) */
const CROWD = [];
for (let i = 0; i < 240; i++) {
  const side = i % 4, u = (E.hash2(i, 9) * 1000 | 0) / 1000, h = E.hash2(i, 3);
  let x, y;
  if (side === 0) { x = 120 + u * 880; y = 150 - h * 10; } else if (side === 1) { x = 120 + u * 880; y = 650 + h * 10; }
  else if (side === 2) { x = 80 - h * 10; y = 220 + u * 360; } else { x = 1040 + h * 10; y = 220 + u * 360; }
  CROWD.push({ x, y, ph: h * 9, shirt: null, skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 40 | 0) % 4], i });
}
/** the rink's look for the frame: the crowd, the nets, the goal lights in the arena's color */
function drawRinkProps(r) {
  const a = M.arena;
  for (const f of CROWD) {
    const cols = a.crowd, shirt = cols[f.i % cols.length], cheer = M.phase === 'goal' && M.goals.length ? Math.abs(Math.sin(M.tick * .12 + f.ph)) * 4 * (M.goals[M.goals.length - 1].t === (f.i % 2) ? 1 : .5) : Math.sin(M.tick * .03 + f.ph) * .5;
    const wave = M.waveT > 0 ? Math.max(0, Math.sin(f.x * .02 - M.waveT * 6)) * 5 : 0;
    if (wave > 3 && f.i % 37 === 0) r.textAt(f.x, f.y, 16 + wave, CROWD_SIGNS[f.i % CROWD_SIGNS.length], '#fffbe8', { align: 'center' });   // (a sign, held up in the wave)
    r.queue(f.x, f.y, 4 + cheer * 0, g => { const [x, y] = r.w(f.x, f.y, 6 + cheer + wave), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); });
  }
  for (let k = 0; k < 2; k++) r.queue(k === 0 ? 166 : 954, CY, 0, g => drawNet(g, r, k), { bias: 1 });
  if (a.snow) {
    M.snow = M.snow || [];
    for (let i = M.snow.length; i < 60; i++) M.snow.push({ x: 128 + E.hash2(i, 11) * 880, y: 208 + E.hash2(i, 12) * 384, z: E.hash2(i, 13) * 60, s: .6 + E.hash2(i, 14) * .6 });
  }
}
/** the frame: the rink, the crowd, the skaters and goalies, the puck, the HUD over all of it */
function drawMatch(r) {
  if (!M) return;
  const view = E.charView(r.view);
  M.map.drawFloor(r); M.map.queueWalls(r);
  drawRinkProps(r);
  drawItems(r, view);
  if (M.bubble && M.bubble.t > 0) r.textAt(M.bubble.sk.x, M.bubble.sk.y, 36, M.bubble.text, '#fffbe8', { align: 'center' });
  for (const g of M.goalies) {
    r.shadow(g.x, g.y, 7, .35);
    r.actor(g.x, g.y, 0, (gg, ox, oy) => g.rig.draw(gg, ox, oy, view));
  }
  for (const sk of M.skaters) {
    if (sk.state === 'bin') { r.actor(sk.x, sk.y, 0, (gg, ox, oy) => sk.rig.draw(gg, ox, oy, view)); continue; }
    r.shadow(sk.x, sk.y, 6, .35);
    r.actor(sk.x, sk.y, 0, (gg, ox, oy) => { sk.rig.draw(gg, ox, oy, view); if (sk.state !== 'down') drawStick(gg, ox, oy, sk, r); });
    if (sk.human) r.queue(sk.x, sk.y, 40, g => { const [x, y] = r.w(sk.x, sk.y, 40), c = E.PLAYER_COLORS[sk.human.i] || '#ffe08a'; px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y]], c); }, { emissive: true });
  }
  const pk = M.puck;
  r.shadow(pk.x, pk.y, 2.2, .45);
  r.sprite(pk.x, pk.y, pk.z + 1, PUCK_SPR, { anchor: 'center' });
  const gilded = M.cfg.chapter === STORY.length - 1, goldFor = t => gilded && t === 1;   // (Gilded Mode: the final's rival, in gold)
  if (pk.shot && pk.shot.kab && M.tick % 3 === 0) P.sparks(pk.x, pk.y, pk.z + 2, 3, null, { color: goldFor(pk.shot.by) ? '#ffd24a' : '#ff8a3a', speed: 30 });
  for (let t = 0; t < 2; t++) if (M.kab[t] > 0 && M.tick % 6 === 0) for (const sk of M.skaters) if (sk.t === t && live(sk)) P.sparks(sk.x, sk.y, 2, 2, null, { color: goldFor(t) ? '#ffd24a' : '#ff8a3a', speed: 20 });
  if (M.snow && M.arena.snow) for (const s of M.snow) { s.y += s.s * .3; s.x += Math.sin(M.tick * .01 + s.z) * .2; if (s.y > 600) s.y = 208; }
  r.overlay(g => hud(g, r));
  if (M.snow && M.arena.snow) r.overlay(g => { for (const s of M.snow) { const [x, y] = r.w(s.x, s.y, s.z); px.rect(g, Math.round(x), Math.round(y), 1, 1, '#ffffff'); } });
  talk.draw(r);
}
/** the score bug, the BOOM meters, the clock, the box, the banners, the fight */
function hud(g, r) {
  const a = M.teams[0], b = M.teams[1], W = r.W;
  E.ui.box(g, 4, 4, 150, 30, { bg: '#141826', border: '#6a7090', alpha: .85 });
  px.rect(g, 9, 9, 6, 6, TEAMS[M.cfg.teams[0]].chip); px.rect(g, 9, 21, 6, 6, TEAMS[M.cfg.teams[1]].chip);
  E.font.text(g, a.def.name, 18, 8, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, b.def.name, 18, 20, '#f0ecdc', { font: 'tiny', outline: false });
  E.font.text(g, String(M.score[0]), 136, 8, '#ffe08a', { font: 'normal', outline: false, align: 'right' });
  E.font.text(g, String(M.score[1]), 136, 20, '#ffe08a', { font: 'normal', outline: false, align: 'right' });
  const clk = M.ot ? 'OT ' + mmss(M.clock) : (M.drill ? 'DRILL ' + mmss(Math.max(0, M.drill.limit - (M.drill.t || 0))) : 'P' + M.period + ' ' + mmss(M.clock));
  E.font.text(g, clk, W - 6, 8, '#c8d0e8', { font: 'tiny', align: 'right', outline: '#000' });
  // the BOOM meters: a bar under each team's chip, lit at full (press KABOOM)
  for (let t = 0; t < 2; t++) {
    const y = 38, x = 4 + t * 76;
    E.ui.bar(g, x, y, 72, 4, M.boom[t] / 100, M.boom[t] >= 100 ? '#ffb347' : M.teams[t].def.trim || '#f2c14e');
    if (M.kab[t] > 0) E.font.text(g, 'KABOOM ' + Math.ceil(M.kab[t]), x, y + 6, '#ff8a3a', { font: 'tiny', outline: '#000' });
  }
  // the box: the penalised skaters' clock, a side at a time
  let yy = 56;
  for (const sk of M.skaters) if (sk.state === 'bin') { E.font.text(g, 'BOX ' + sk.name + ' ' + Math.ceil(sk.st), 4, yy, '#ffb0a0', { font: 'tiny', outline: '#000' }); yy += 8; }
  if (M.phase === 'fight' && M.fight) {
    const f = M.fight;
    E.ui.box(g, W / 2 - 130, 34, 260, 46, { bg: '#2a0c10', border: '#ff7a5a', alpha: .92 });
    E.font.title(g, 'FIGHT!', W / 2, 36, { align: 'center', scale: 2, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'] });
    const bar = (x, y, name, F, col) => { E.font.text(g, name, x, y, '#f0ecdc', { font: 'tiny', outline: '#000' }); E.ui.bar(g, x, y + 6, 110, 4, Math.max(0, F.bal) / 100, col); E.ui.bar(g, x, y + 12, 110, 2, Math.max(0, F.stam) / 100, '#7ad0ff'); };
    bar(W / 2 - 124, 58, f.a.name, f.A, '#e8443a'); bar(W / 2 + 14, 58, f.b.name, f.B, '#3b82f6');
    E.font.text(g, 'MOVES: ' + (f.A.act ? f.A.act.name : '-') + ' / ' + (f.B.act ? f.B.act.name : '-') + '   ' + Math.max(0, Math.ceil(20 - f.t)) + 's', W / 2, 82, '#ffe7a8', { align: 'center', font: 'tiny', outline: '#000' });
    E.font.text(g, prompt('pass', 'JAB') + '  ' + prompt('shoot', 'HAYMAKER') + '  ' + prompt('deke', 'DUCK') + '  ' + prompt('lob', 'YANK'), W / 2, 92, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' });
    if (f.last) E.font.text(g, f.last.toUpperCase(), W / 2, 102, '#c8d0e8', { align: 'center', font: 'tiny', outline: '#000' });
  }
  if (M.skaters.some(sk => sk.state === 'bin')) E.font.title(g, 'POWER PLAY', W - 8, 40, { align: 'right', scale: 1, colors: ['#fffbe8', '#ffe08a'] });
  if (M.replay) E.font.title(g, 'REPLAY', W - 8, r.H - 40, { align: 'right', scale: 1, colors: ['#fffbe8', '#ffe08a'] });
  if (M.bannerT > 0 && M.banner) E.font.title(g, M.banner, W / 2, r.H * .3, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'] });
  if (M.phase === 'faceoff') E.font.text(g, 'FACEOFF', W / 2, r.H * .42, '#ffe7a8', { align: 'center', scale: 2, shadow: '#000', outline: false });
  // the prompts of the device used last, bottom left (out of the subtitles' and the touch buttons' way)
  const pl = M.humans[0];
  if (pl && M.phase === 'play') {
    const lines = [prompt('pass', pl.sk && M.puck.owner === pl.sk ? 'Pass' : 'Switch'), prompt('shoot', M.puck.owner === pl.sk ? 'Hold: slapshot' : 'Check'), prompt('lob', 'Saucer / gloves')];
    lines.forEach((s, i) => E.font.text(g, s, 4, r.H - 48 - i * 8, '#c8d0e8', { font: 'tiny', outline: '#000' }));
  }
}

/* ---- THE SCENES: the title, attract, exhibition set-up, the Cup Run, cutscenes, results, practice, records, about,
 * dev mode, and the touch-only notice. Every menu answers to the stick, the d-pad, the keys and the mouse. ---- */
const wrap = (v, n) => ((v % n) + n) % n;
const touchOnly = typeof matchMedia === 'function' && matchMedia('(pointer: coarse) and (hover: none)').matches;
const rec = () => Object.assign({ games: 0, wins: 0, goals: 0, hits: 0, kaboomGoals: 0, shutouts: 0, drills: 0, chapters: 0 }, store.get('records', {}));
const STORY_SAVE = () => Object.assign({ cleared: 0, stars: [0, 0, 0, 0, 0] }, store.get('story', {}));
let lastResult = null, attractSeed = 1, idleT = 0, setupRows = [], dev = { kaboom: false };
const setup = { home: 0, away: 1, arena: 0 };
const ITEM_H = 18;

/** a match's set-up: the teams, the arena, the seed, and the modifiers a Cup Run choice gives the player's team */
function makeMatch(cfg) {
  simRng = E.rng(cfg.seed || 1);
  newMatch(cfg);
  const mods = cfg.mods || {};
  if (mods.boom) M.boom[0] = mods.boom;
  if (mods.goalie) M.teams[0].def.goalie.rfx += mods.goalie;
  if (mods.turbo) M.teams[0].def.rate.spd += mods.turbo;
  if (mods.shot) M.teams[0].def.rate.sht += mods.shot;
  if (mods.hit) M.teams[0].def.rate.hit += mods.hit;
  if (mods.defend) { M.teams[0].def.rate.hit += 1; M.teams[0].def.goalie.size += 1; }
  if (mods.fight) M.teams[0].def.rate.fgt += mods.fight;
  // the Cup Run's final: the boss is the rival goalie, quicker and bigger than the rest
  if (cfg.mode === 'story' && cfg.chapter === STORY.length - 1) { M.teams[1].def.goalie.rfx += 2; M.teams[1].def.goalie.size += 2; M.banner = 'BOSS: ' + M.teams[1].def.goalieName; M.bannerT = 3; }
  if (cfg.drill) { M.clock = 999; M.period = 1; if (cfg.drill.kind === 'kaboom') M.boom[0] = 100; }
  if (cfg.attract) { M.clock = 45; for (let t = 0; t < 2; t++) M.boom[t] = 60; }
  return M;
}
/** the exhibition's and the story's set-up: pick a team, an arena, its players (press 2, or Start on a pad, to join) */
function setupRowsFor() {
  return [
    { label: 'YOUR TEAM', value: () => TEAMS[setup.home].name, step: d => { setup.home = wrap(setup.home + d, TEAMS.length); } },
    { label: 'OPPONENT', value: () => TEAMS[setup.away].name, step: d => { setup.away = wrap(setup.away + d, TEAMS.length); if (setup.away === setup.home) setup.away = wrap(setup.away + d, TEAMS.length); } },
    { label: 'ARENA', value: () => ARENAS[setup.arena].name, step: d => { setup.arena = wrap(setup.arena + d, ARENAS.length); } },
    { label: 'PLAYERS', value: () => game.players.length + (game.players.length === 1 ? ' PLAYER' : ' PLAYERS') + '  (2 OR START TO JOIN)', step: () => {} },
    { label: 'FACE OFF', action: () => startExhibition() },
    { label: 'BACK', action: () => game.go('title') }
  ];
}
function startExhibition() {
  if (setup.home === setup.away) { setup.away = (setup.home + 1) % TEAMS.length; }
  game.allowJoin(false);
  game.go('match', { cfg: { teams: [setup.home, setup.away], arena: setup.arena, humans: Math.max(1, Math.min(4, game.players.length)), seed: (Date.now() % 100000) + 1, mode: 'exhibition' } }, { fade: 'iris' });
}
/** the Cup Run: the chapter's game, from its seed and its choice */
function startStory(ch, choice) {
  const s = STORY[ch];
  game.go('match', { cfg: { teams: [0, s.rival], arena: s.arena, humans: Math.max(1, game.players.length), seed: 1000 * (ch + 1) + 7, mode: 'story', chapter: ch, mods: choice || {} } }, { fade: 'iris' });
}
/** a menu row drawn in the 10-foot style: big type, a clear cursor, a value on the right */
function drawRows(g, r, rows, sel, y0) {
  rows.forEach((row, i) => {
    const y = y0 + i * ITEM_H, on = i === sel, x = r.W / 2 - 150;
    E.ui.box(g, x, y - 2, 300, ITEM_H - 2, { bg: on ? '#2b3a64' : '#141826', border: on ? '#ffe08a' : '#3a4060', alpha: .9 });
    E.font.text(g, row.label, x + 8, y + 3, on ? '#fffbe8' : '#c8d0e8', { font: 'normal', outline: '#000' });
    if (row.value) E.font.text(g, row.value(), x + 292, y + 3, on ? '#ffe08a' : '#8a92b8', { font: 'tiny', align: 'right', outline: '#000' });
  });
}
/** the cursor and the mouse: a click picks the row under it (hover moves the cursor), a row's own step (left and right) changes its value */
function listInput(rows, st, y0, r) {
  const I = game.input, n = rows.length;
  if (I.pressed('up')) { st.i = wrap(st.i - 1, n); A.sfx('blip'); }
  if (I.pressed('down')) { st.i = wrap(st.i + 1, n); A.sfx('blip'); }
  const c = I.clicked && I.clicked();
  if (c) rows.forEach((row, i) => { const y = y0 + i * ITEM_H; if (c[0] >= r.W / 2 - 150 && c[0] <= r.W / 2 + 150 && c[1] >= y - 2 && c[1] < y + ITEM_H - 4) { st.i = i; if (row.action) row.action(); else if (row.step) { row.step(1); A.sfx('select'); } } });
  const row = rows[st.i];
  if (I.pressed('left') && row.step) { row.step(-1); A.sfx('blip'); }
  if (I.pressed('right') && row.step) { row.step(1); A.sfx('blip'); }
  if (I.pressed('confirm') && row.action) { I.consume('confirm'); A.sfx('select'); row.action(); }
  if (I.pressed('confirm') && row.step && !row.action) { I.consume('confirm'); row.step(1); }
}

/* the title: the logo, the rink under it, the heroes on the ice, the menu; idle for ten seconds it goes to attract */
const titleMap = buildRink(ARENAS[0]);
const titleItems = touchOnly ? [{ label: 'SETTINGS', disabled: false }] : ['EXHIBITION', 'CUP RUN', 'PRACTICE', 'RECORDS', 'ABOUT & CREDITS', 'SETTINGS'];
const titleMenu = new E.Menu(game, titleItems, { y: 120, onPick(i) {
  if (touchOnly) return game.menu('settings');
  [() => game.go('setup'), () => game.go('story'), () => game.go('practice'), () => game.go('records'), () => game.go('about', { from: 'title' }), () => game.menu('settings')][i]();
} });
scenes.title = {
  view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS, res: 'ps1', touch: false,
  enter() { A.music('title'); idleT = 0; game.follow(null); game.cam.bounds = null; },
  update(dt) {
    if (game.input.pressed('camera')) game.nextView();
    const any = game.input.anyPressed();
    idleT = any ? 0 : idleT + dt;
    if (idleT > 10) { idleT = 0; game.go('attract', null, { fade: 'iris' }); return; }
    titleMenu.update(dt);
    game.focus(CX, CY, 0);
  },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    titleMap.drawFloor(r); titleMap.queueWalls(r);
    r.overlay(g => {
      E.font.title(g, 'ICE BREAKERS', r.W / 2, 22, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      E.font.text(g, 'THREE A SIDE. GOALIES. GLASS. KABOOM.', r.W / 2, 62, '#fffbe8', { align: 'center', shadow: '#000', outline: '#000' });
    });
    titleMenu.y = touchOnly ? 168 : 100;
    if (touchOnly) r.overlay(g => { E.ui.box(g, r.W / 2 - 160, 92, 320, 52, { bg: '#141826', border: '#ffe08a', alpha: .9 }); E.font.text(g, 'Controller or keyboard required', r.W / 2, 104, '#fffbe8', { align: 'center', outline: false }); E.font.text(g, 'This game plays on a TV with a pad, or a keyboard and mouse.', r.W / 2, 122, '#c8d0e8', { align: 'center', font: 'tiny', outline: false }); });
    titleMenu.draw(r);
    const how = game.input.lastDevice === 'gamepad' ? 'D-pad to pick   ' + game.input.label('confirm') + ' to play' : 'Arrows or W S to pick   Enter to play   Mouse works too';
    if (!touchOnly) r.text(how, r.W / 2, r.H - 16, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};

/* attract: the arena's own game, played by the CPU with BOOM already up, to show the rink. Any press returns to the title. */
scenes.attract = {
  view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS, res: 'ps1', camera: { zoom: [.7, 1.6] },
  enter() { attractSeed++; const a = attractSeed; makeMatch({ teams: [a % TEAMS.length, (a + 2) % TEAMS.length], arena: a % ARENAS.length, humans: 0, seed: a * 37 + 11, mode: 'attract', attract: true }); A.music(SONG_ATTRACT); },
  update(dt) {
    if (game.input.anyPressed()) { game.go('title', null, { fade: 'iris' }); return; }
    matchStep(dt); rigsStep(dt); talk.update(dt);
    if (M.phase === 'over' && M.timer <= 0) { attractSeed++; makeMatch({ teams: [attractSeed % TEAMS.length, (attractSeed + 2) % TEAMS.length], arena: attractSeed % ARENAS.length, humans: 0, seed: attractSeed * 37 + 11, mode: 'attract', attract: true }); }
  },
  draw(r) { drawMatch(r); r.overlay(g => { E.font.title(g, 'ATTRACT', r.W / 2, 30, { align: 'center', scale: 2, colors: ['#ffe08a', '#ffb347'] }); E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 30, '#fffbe8', { align: 'center', shadow: '#000', outline: false }); }); }
};

/* exhibition set-up */
const setupState = { i: 0 };
scenes.setup = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { setupRows = setupRowsFor(); setupState.i = 0; game.allowJoin({ max: 4 }); game.players.forEach(p => p && p.consumeAll && p.consumeAll()); A.music('title'); },
  exit() { game.allowJoin(false); },
  update(dt) { setupRows = setupRowsFor(); listInput(setupRows, setupState, 62, { W: game.W }); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'EXHIBITION', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      drawRows(g, r, setupRows, setupState.i, 62);
      E.font.text(g, 'The home side wears its dark colours, the away side white. Keys: arrows, Enter.', r.W / 2, r.H - 30, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the Cup Run: five games. Each chapter: its intro, one choice, the game, the result. Three stars a chapter. */
const storyState = { i: 0 };
scenes.story = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { storyState.i = Math.min(STORY_SAVE().cleared, STORY.length - 1); A.music('title'); },
  update(dt) {
    const I = game.input, sv = STORY_SAVE();
    if (I.pressed('left')) storyState.i = wrap(storyState.i - 1, STORY.length);
    if (I.pressed('right')) storyState.i = wrap(storyState.i + 1, STORY.length);
    if (I.pressed('cancel')) game.go('title');
    if (I.pressed('confirm')) { I.consume('confirm'); if (storyState.i <= sv.cleared) game.go('cutscene', { chapter: storyState.i }); else A.sfx('cancel'); }
  },
  draw(r) {
    const sv = STORY_SAVE();
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'THE CUP RUN', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      STORY.forEach((s, i) => {
        const x = 8 + i * (r.W - 16) / 5, w = (r.W - 16) / 5 - 6, on = i === storyState.i, locked = i > sv.cleared;
        E.ui.box(g, x, 60, w, 120, { bg: on ? '#2b3a64' : '#141826', border: on ? '#ffe08a' : '#3a4060', alpha: .92 });
        E.font.text(g, 'GAME ' + (i + 1), x + 6, 66, locked ? '#5a6080' : '#ffe08a', { font: 'tiny', outline: false });
        E.font.text(g, locked ? 'LOCKED' : TEAMS[s.rival].name, x + 6, 84, locked ? '#5a6080' : '#fffbe8', { font: 'tiny', outline: false, wrap: w - 12 });
        E.font.text(g, ARENAS[s.arena].name, x + 6, 110, '#8a92b8', { font: 'tiny', outline: false, wrap: w - 12 });
        E.font.text(g, '*'.repeat(sv.stars[i] || 0) || '-', x + 6, 150, '#ffd36a', { font: 'tiny', outline: false });
      });
      const s = STORY[storyState.i];
      E.font.text(g, s.title, r.W / 2, 200, '#ffe7a8', { align: 'center', outline: false });
      E.font.text(g, ARENAS[s.arena].blurb, r.W / 2, 216, '#c8d0e8', { align: 'center', font: 'tiny', outline: false, wrap: r.W - 40 });
      E.font.text(g, prompt('confirm', 'PLAY') + '   ' + prompt('cancel', 'BACK'), r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the cutscene: the chapter's lines, then the choice, then the game */
const csState = { ch: 0, step: 0, i: 0, rows: [] };
scenes.cutscene = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) { csState.ch = d.chapter; csState.step = 0; csState.i = 0; csState.pg = new E.Humanoid({ size: 1.2, build: 'bulky', hat: { style: 'helmet', color: TEAMS[0].away }, colors: { cloth: TEAMS[0].home, pants: '#1a1a22', trim: TEAMS[0].trim, boot: '#1a1a20', hair: TEAMS[0].hair[0], skin: TEAMS[0].skin[0], belt: TEAMS[0].trim } }); csState.rv = new E.Humanoid({ size: 1.2, build: 'bulky', hat: { style: 'helmet', color: TEAMS[STORY[d.chapter].rival].away }, colors: { cloth: TEAMS[STORY[d.chapter].rival].home, pants: '#1a1a22', trim: TEAMS[STORY[d.chapter].rival].trim, boot: '#1a1a20', hair: TEAMS[STORY[d.chapter].rival].hair[0], skin: TEAMS[STORY[d.chapter].rival].skin[0], belt: TEAMS[STORY[d.chapter].rival].trim } }); const s = STORY[csState.ch]; csState.rows = [{ label: s.choice.a[0], step: null, action: () => startStory(csState.ch, s.choice.a[1]) }, { label: s.choice.b[0], action: () => startStory(csState.ch, s.choice.b[1]) }]; A.music('title'); },
  update(dt) {
    const I = game.input, s = STORY[csState.ch];
    if (csState.step === 0) { if (I.pressed('confirm') || I.pressed('chirp') || I.pressed('pass')) { I.consume('confirm'); I.consume('pass'); csState.i++; if (csState.i >= s.intro.length) csState.step = 1; } return; }
    listInput(csState.rows, csState, 150, { W: game.W });
  },
  draw(r) {
    const s = STORY[csState.ch];
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 16, 30, r.W - 32, r.H - 60, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.text(g, 'GAME ' + (csState.ch + 1) + ': ' + s.title, r.W / 2, 42, '#ffe08a', { align: 'center', scale: 2, outline: false });
      csState.pg.drawPortrait(g, 52, 70, 34, { zoom: 1.1, turn: .3 });   // (your goalie, and the rival's, in the cutscene)
      csState.rv.drawPortrait(g, r.W - 52, 70, 34, { zoom: 1.1, turn: -.3 });
      if (csState.step === 0) {
        E.font.text(g, s.intro[csState.i] || '', r.W / 2, 132, '#fffbe8', { align: 'center', wrap: r.W - 190, outline: '#000' });
        E.font.text(g, prompt('confirm', 'NEXT'), r.W / 2, r.H - 56, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
      } else {
        E.font.text(g, s.choice.q, r.W / 2, 100, '#fffbe8', { align: 'center', wrap: r.W - 190, outline: false });
        drawRows(g, r, csState.rows, csState.i, 150);
      }
    });
  }
};

/* the results: the score, the stars, the stats; a story game's win moves the Cup Run on */
const resState = { i: 0 };
function resultRows() {
  const L = lastResult || {}, story = L.mode === 'story';
  if (L.mode === 'session') return [];   // (a session's results are the hub's: it removes the game when they are shown)
  const rows = [{ label: story && L.won && L.chapter < STORY.length - 1 ? 'NEXT GAME' : (story ? 'CONTINUE' : 'NEW GAME'), action: () => {
    if (story) { if (L.won && L.chapter < STORY.length - 1) game.go('story'); else if (L.won) game.go('credits'); else game.go('story'); }
    else if (L.drill) game.go('practice'); else game.go('setup');
  } }];
  if (L.drill) rows[0] = { label: L.drill.ok ? 'NEXT DRILL' : 'TRY AGAIN', action: () => game.go('practice') };
  rows.push({ label: 'MENU', action: () => game.go('title') });
  return rows;
}
scenes.results = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { resState.i = 0; A.music('victory'); },
  update(dt) { if (Net.live || (lastResult && lastResult.mode === 'session')) return; listInput(resultRows(), resState, 150, { W: game.W }); },
  draw(r) {
    const L = lastResult || {};
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 16, 20, r.W - 32, r.H - 40, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      const head = L.won === undefined ? (L.draw ? 'A DRAW' : 'FULL TIME') : L.won ? 'WIN!' : 'LOSS';
      E.font.title(g, head, r.W / 2, 26, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.font.text(g, (L.home || '') + '  ' + (L.score || '') + '  ' + (L.away || ''), r.W / 2, 60, '#fffbe8', { align: 'center', scale: 2, outline: false });
      E.font.text(g, 'THE THREE STARS', r.W / 2, 84, '#ffe7a8', { align: 'center', font: 'tiny', outline: false });
      (L.stars || []).forEach((s, i) => E.font.text(g, (i + 1) + '  ' + s.name + '  ' + s.g + 'G ' + s.a + 'A ' + s.hits + 'H', r.W / 2, 96 + i * 10, '#c8d0e8', { align: 'center', font: 'tiny', outline: false }));
      if (L.line) E.font.text(g, L.line, r.W / 2, 130, '#ffe7a8', { align: 'center', font: 'tiny', outline: false, wrap: r.W - 60 });
      if (L.stars2 !== undefined) E.font.text(g, '*'.repeat(L.stars2) + ' CUP RUN GAME ' + (L.chapter + 1), r.W / 2, 178, '#ffd36a', { align: 'center', font: 'tiny', outline: false });
      drawRows(g, r, resultRows(), resState.i, 150);
    });
  }
};

/* the practice: Coach Marge's three drills, each an objective and a clock */
const DRILLS = [
  { id: 'wrist', name: 'WRIST SHOT', goal: 'Score 3 goals', need: 3, limit: 120, line: 'Hold the shot button for a second: that is the wind-up.' },
  { id: 'pass', name: 'PASS AND TAP', goal: 'Complete 4 passes to a teammate', need: 4, limit: 120, line: 'Point the stick at a teammate and tap pass. Your team mates make the rest.' },
  { id: 'hit', name: 'HIT AND HOLD', goal: 'Land 2 big hits', need: 2, limit: 150, line: 'Skate into them with the shoot button. Turbo gives you more to land.' },
  { id: 'onGoal', name: 'ON NET', goal: 'Put 3 shots on net', need: 3, limit: 150, line: 'Get in front of the net, inside the faceoff circle, and shoot at the mouth.' },
  { id: 'fight', name: 'DROP THE GLOVES', goal: 'Win a fight', need: 1, limit: 150, line: 'Lob at a rival within reach to drop the gloves, then tap pass and shoot to swing.' },
  { id: 'kaboom', name: 'KABOOM', goal: 'Score a KABOOM goal', need: 1, limit: 150, line: 'Your BOOM meter starts full, so your team goes KABOOM. A full wind-up makes a KABOOM shot.' },
  { id: 'glass', name: 'GLASS', goal: 'Break 1 glass panel', need: 1, limit: 150, line: 'Skate hard into the boards. The glass is not as strong as it looks.' }
];
const drillState = { i: 0 };
scenes.practice = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { drillState.i = 0; A.music('title'); },
  update() { const rows = DRILLS.map(d => ({ label: d.name, action: () => game.go('match', { cfg: { teams: [0, 2], arena: 0, humans: 1, seed: 99 + DRILLS.indexOf(d), mode: 'practice', drill: { kind: d.id, need: d.need, limit: d.limit, name: d.name, goal: d.goal } } }, { fade: 'iris' }) })).concat([{ label: 'BACK', action: () => game.go('title') }]); listInput(rows, drillState, 60, { W: game.W }); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.font.title(g, 'PRACTICE', r.W / 2, 14, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.font.text(g, 'COACH MARGE SAYS: THE OL\' ICEBOX ICE IS COLD. GET ON IT.', r.W / 2, 60, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
      DRILLS.forEach((d, i) => { E.font.text(g, d.name + ': ' + d.goal, r.W / 2 - 150, 60 + i * 16, i === drillState.i ? '#ffe08a' : '#c8d0e8', { font: 'tiny', outline: '#000' }); });
      E.font.text(g, DRILLS[drillState.i].line, r.W / 2, 186, '#fffbe8', { align: 'center', font: 'tiny', outline: false, wrap: r.W - 60 });
      E.font.text(g, prompt('confirm', 'START') + '   ' + prompt('cancel', 'BACK'), r.W / 2, r.H - 30, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the records: the career totals, kept by the game */
scenes.records = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { A.music('title'); },
  update() { if (game.input.pressed('cancel') || game.input.pressed('confirm')) { game.input.consumeAll(); game.go('title'); } },
  draw(r) {
    const R = rec();
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 16, 16, r.W - 32, r.H - 32, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.title(g, 'RECORDS', r.W / 2, 26, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      const rows = [['GAMES PLAYED', R.games], ['WINS', R.wins], ['GOALS', R.goals], ['BIG HITS', R.hits], ['KABOOM GOALS', R.kaboomGoals], ['SHUTOUTS', R.shutouts], ['DRILLS DONE', R.drills], ['CUP RUN GAMES WON', R.chapters]];
      rows.forEach(([k, v], i) => { E.font.text(g, k, r.W / 2 - 120, 70 + i * 16, '#c8d0e8', { outline: false }); E.font.text(g, String(v), r.W / 2 + 120, 70 + i * 16, '#ffe08a', { align: 'right', outline: false }); });
      E.font.text(g, prompt('confirm', 'BACK'), r.W / 2, r.H - 34, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* about: the credits, then the source information and the feedback the game was built with */
const ABOUT_PAGES = [
  { title: 'CREDITS', lines: TEXT.credits },
  { title: 'SOURCE INFORMATION', lines: SOURCE_LINES },
  { title: 'TESTING FEEDBACK', lines: TESTING_LINES },
  { title: 'ENGINE FEEDBACK', lines: ENGINE_LINES },
  { title: 'PROMPT FEEDBACK', lines: PROMPT_LINES }
];
const aboutState = { p: 0, from: 'title' };
scenes.about = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) { aboutState.p = 0; aboutState.from = d && d.from || 'title'; A.music('title'); },
  update() {
    const I = game.input;
    if (I.pressed('right')) aboutState.p = wrap(aboutState.p + 1, ABOUT_PAGES.length);
    if (I.pressed('left')) aboutState.p = wrap(aboutState.p - 1, ABOUT_PAGES.length);
    if (I.pressed('cancel') || I.pressed('confirm')) { I.consumeAll(); if (aboutState.from === 'match') game.go('match', { resume: true }); else game.go('title'); }
  },
  draw(r) {
    const pg = ABOUT_PAGES[aboutState.p];
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => {
      E.ui.box(g, 10, 10, r.W - 20, r.H - 20, { bg: '#0c1020', border: '#e8c070', alpha: .94 });
      E.font.title(g, pg.title, r.W / 2, 16, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      let y = 50;
      for (const ln of pg.lines) { const h = E.font.text(g, ln, 22, y, '#e8e4f4', { font: 'tiny', outline: false, wrap: r.W - 44 }); y += h.h + 4; }
      E.font.text(g, prompt('left', '<') + ' ' + prompt('right', '>') + ' PAGES   ' + prompt('confirm', 'BACK'), r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
scenes.credits = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { A.music('victory'); creditT = 0; },
  update(dt) { creditT += dt; if (game.input.anyPressed() && creditT > 1) { game.go('story'); } if (creditT > 60) game.go('title'); },
  draw(r) {
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.overlay(g => { TEXT.credits.forEach((ln, i) => E.font.text(g, ln, r.W / 2, r.H - creditT * 14 + i * 22, i === 0 ? '#ffe08a' : '#e8e4f4', { align: 'center', scale: i === 0 ? 2 : 1, outline: '#000' })); });
  }
};
let creditT = 0;

/* dev mode: the live sliders, the cheats, a reset to the defaults. From the pause menu, or #dev. */
const devState = { i: 0, from: 'title' };
function devRows() {
  const rows = TUNE_KEYS.map(k => ({ label: TUNE_META[k][1], value: () => { const v = T[k], st = TUNE_META[k][4]; return (st < 1 ? v.toFixed(2) : String(Math.round(v))) + (T[k] === TUNE_DEFAULTS[k] ? '' : ' *'); }, step: d => tuneSet(k, T[k] + d * TUNE_META[k][4]), action: () => tuneReset(k) }));
  rows.push({ label: 'CHEAT: INFINITE KABOOM', value: () => dev.kaboom ? 'ON' : 'OFF', step: () => { dev.kaboom = !dev.kaboom; }, action: () => { dev.kaboom = !dev.kaboom; } });
  rows.push({ label: 'CHEAT: FILL BOOM', action: () => { if (M) M.boom = [100, 100]; } });
  rows.push({ label: 'CHEAT: END THE PERIOD NOW', action: () => { if (M && M.phase === 'play') M.clock = 0.01; } });
  rows.push({ label: 'OPEN THE ANIMATION LAB', action: () => game.go('lab', { from: 'dev' }) });
  rows.push({ label: 'CHEAT: OCTOPUS ON THE ICE', action: () => { if (M) (M.slips = M.slips || []).push({ x: CX, y: CY, r: 10 }); } });
  rows.push({ label: 'RESET ALL TO DEFAULTS', action: () => { tuneReset(); } });
  rows.push({ label: 'BACK', action: () => game.go(devState.from === 'match' ? 'match' : devState.from, devState.from === 'match' ? { resume: true } : null) });
  return rows;
}
scenes.dev = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) { devState.from = d && d.from || 'title'; devState.i = 0; A.music(null); },
  update() { listInput(devRows(), devState, 40, { W: game.W }); },
  draw(r) {
    const rows = devRows(), grp = i => TUNE_META[TUNE_KEYS[i]] ? TUNE_META[TUNE_KEYS[i]][0] : '';
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    const start = Math.max(0, Math.min(devState.i - 5, rows.length - 11));
    r.overlay(g => {
      E.font.title(g, 'DEV MODE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.ui.box(g, 8, 34, r.W - 16, r.H - 42, { bg: '#0c1020', border: '#3a4060', alpha: .9 });
      const win = rows.slice(start, start + 11);
      win.forEach((row, j) => {
        const i = start + j, y = 40 + j * ITEM_H, on = i === devState.i, x = r.W / 2 - 150;
        E.ui.box(g, x, y - 2, 300, ITEM_H - 2, { bg: on ? '#2b3a64' : '#141826', border: on ? '#ffe08a' : '#3a4060', alpha: .9 });
        E.font.text(g, row.label, x + 8, y + 3, on ? '#fffbe8' : '#c8d0e8', { font: 'tiny', outline: '#000' });
        if (row.value) E.font.text(g, row.value(), x + 292, y + 3, on ? '#ffe08a' : '#8a92b8', { font: 'tiny', align: 'right', outline: '#000' });
      });
      E.font.text(g, 'LEFT / RIGHT: CHANGE   ENTER: RESET OR TOGGLE   * CHANGED', r.W / 2, r.H - 16, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* the animation lab (dev): every pose and attack of the rig, one after another, on a skater in the rink's kit */
const LAB_POSES = ['idle', 'cheer', 'guard', 'kneel', 'crouch', 'wave', 'hips', 'down', 'die', 'block'];
const LAB_MOVES = ['jab', 'cross', 'hook', 'uppercut', 'haymaker', 'elbow', 'slash', 'thrust'];
const labState = { i: 0, t: 0, from: 'title' };
scenes.lab = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter(d) {
    labState.i = 0; labState.t = 0; labState.from = d && d.from || 'title';
    labState.rig = new E.Humanoid({ size: 1.4, build: 'heroic', hair: 'spiky', colors: { cloth: TEAMS[0].home, pants: '#1a1a22', trim: TEAMS[0].trim, boot: '#1a1a20', hair: TEAMS[0].hair[1], skin: TEAMS[0].skin[1], belt: TEAMS[0].trim } });
    game.follow(null); game.cam.bounds = null; game.focus(0, 0, 14);
  },
  update(dt) {
    const I = game.input, n = LAB_POSES.length + LAB_MOVES.length;
    labState.t += dt;
    if (I.pressed('right')) { labState.i = (labState.i + 1) % n; labState.t = 0; }
    if (I.pressed('left')) { labState.i = (labState.i - 1 + n) % n; labState.t = 0; }
    if (I.pressed('cancel')) { I.consumeAll(); game.go(labState.from === 'dev' ? 'title' : 'title'); return; }
    const k = labState.i;
    const state = k < LAB_POSES.length ? { pose: LAB_POSES[k] === 'idle' ? null : LAB_POSES[k] } : { attack: E.move(LAB_MOVES[k - LAB_POSES.length], Math.min(1, (labState.t % 1.4) / 1.4)) };
    labState.rig.update(dt, Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }, state));
  },
  draw(r) {
    const k = labState.i, name = k < LAB_POSES.length ? LAB_POSES[k] : LAB_MOVES[k - LAB_POSES.length];
    r.sky(['#0e1630', '#1e3050', '#2e5a3a']);
    r.shadow(0, 0, 8, .35);
    r.actor(0, 0, 0, (g, ox, oy) => labState.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'ANIMATION LAB', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
      E.font.text(g, (k < LAB_POSES.length ? 'POSE: ' : 'MOVE: ') + name.toUpperCase() + '   ' + (k + 1) + ' / ' + (LAB_POSES.length + LAB_MOVES.length), r.W / 2, r.H - 40, '#ffe7a8', { align: 'center', outline: '#000' });
      E.font.text(g, prompt('left', 'PREVIOUS') + '   ' + prompt('right', 'NEXT') + '   ' + prompt('cancel', 'BACK'), r.W / 2, r.H - 24, '#b8b0d8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};

/* ---- THE MATCH SCENE: the game on the screen (pausable: the pause menu has Dev Mode), its results, the records, the
 * story's progress, and the start: the scene table, the deep links, the debug handle for the tests ---- */
/** each skater's and goalie's rig, posed from the sim: skating, the cheer, the stagger, the down, the save */
function rigsStep(dt) {
  for (const g of M.goalies) g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: g.vx, vy: g.vy, facing: g.face, down: g.state === 'down', pose: g.state === 'save' ? 'block' : null, expr: null });
  for (const sk of M.skaters) {
    const pose = sk.state === 'celebrate' ? 'cheer' : sk.state === 'stagger' ? 'hips' : sk.state === 'check' ? 'guard' : sk.state === 'fight' ? 'block' : null;
    sk.rig.update(dt, { x: sk.x, y: sk.y, z: sk.state === 'bin' ? -10 : 0, vx: sk.vx, vy: sk.vy, facing: sk.face, down: sk.state === 'down', pose, expr: sk.state === 'celebrate' ? 'shout' : null, sprint: Math.hypot(sk.vx, sk.vy) > 120 });
  }
}
/** the match's end: the result (the stars, the line from the Cup Run), the records and the story's progress */
function finishMatch() {
  const cfg = M.cfg, won = (M.soWinner !== undefined ? M.soWinner : (M.score[0] > M.score[1] ? 0 : 1)) === 0, tied = false;
  M.winner = won ? 0 : 1;
  const L = { mode: cfg.mode, chapter: cfg.chapter, home: M.teams[0].def.name, away: M.teams[1].def.name, score: M.score[0] + ' - ' + M.score[1], stars: starsOf(), won: M.drill ? undefined : won, draw: tied && !M.drill };
  if (M.drill) L.drill = { ok: !!M.drill.ok, name: M.drill.name };
  if (cfg.mode === 'story') {
    const s = STORY[cfg.chapter], margin = M.score[0] - M.score[1], kabGoal = M.goals.some(g => g.kab && g.t === 0);
    const count = (won ? 1 : 0) + (won && (margin >= 2 || kabGoal) ? 1 : 0) + (won && M.score[1] === 0 ? 1 : 0);
    L.stars2 = count; L.chapter = cfg.chapter; L.line = won ? s.win : 'THE BRUISERS, THE HORNETS, THE LUMBERJACKS, THE OWLS, THE MONKEYS: ALL OF THEM CAN BE BEATEN. TRY AGAIN.';
    const sv = STORY_SAVE();
    sv.stars[cfg.chapter] = Math.max(sv.stars[cfg.chapter] || 0, count);
    if (won && cfg.chapter === sv.cleared) sv.cleared = Math.min(STORY.length, sv.cleared + 1);
    store.set('story', sv);
  }
  const R = rec();
  R.games++; if (won && !M.drill) R.wins++; R.goals += M.score[0]; R.hits += M.hits[0]; R.kaboomGoals += M.goals.filter(g => g.kab && g.t === 0).length;
  if (won && M.score[1] === 0 && !M.drill) R.shutouts++; if (M.drill && M.drill.ok) R.drills++; if (cfg.mode === 'story' && won) R.chapters++;
  store.set('records', R);
  lastResult = L;
  if (L.stars && L.stars.length) say('THE THREE STARS: ' + L.stars.map((st, i) => (i + 1) + '. ' + st.name).join(', ') + '.');
}
/** the match's own frame: its scene, its input, its camera (it follows the puck, lead and zoom) */
scenes.match = {
  view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS, res: 'ps1', pausable: true, camera: { zoom: [.7, 1.6] },
  enter(d) {
    if (d && d.cfg) makeMatch(d.cfg);
    else if (!M || (M.over && !(d && d.resume))) makeMatch({ teams: [0, 1], arena: 0, humans: Math.max(1, game.players.length), seed: 1, mode: 'exhibition' });
    game.allowJoin(false);
    game.follow(M.puck, { z: 8, lead: 10 }); game.cam.smooth = .18; game.cam.bounds = null;
    A.music(SONG_MATCH);
    if (!(d && d.resume)) { game.input.consumeAll(); talkSay(pick(['THE PUCK IS DROPPED. HERE WE GO!', 'FACEOFF. THE ICE IS PERFECT. THE CROWD IS UP.'], 0)); }
  },
  update(dt) {
    if (!M) return;
    if (game.input.pressed('camera')) game.nextView();   // (V, or R3: the broadcast view, then the overhead)
    if (M.punch > 0) game.setZoom(1 + .18 * (M.punch / .45)); else if (M.punchOn) { game.setZoom(1); M.punchOn = false; }
    if (M.punch > 0) M.punchOn = true;
    if (M.phase === 'intermission' && M.floodWanted) { M.floodWanted = false; game.go('flood', null, { fade: 'iris' }); return; }
    if (Net.live) { netMatchUpdate(dt); return; }
    if (dev.kaboom && M.boom[0] < 100) M.boom[0] = 100;
    directorStep(); matchStep(dt); rigsStep(dt); talk.update(dt);
    if (M.phase === 'over' && M.timer <= 0 && !M.finished) { M.finished = true; finishMatch(); game.go('results', null, { fade: 'iris' }); }
  },
  draw(r) { drawMatch(r); }
};


/* ---- AI HUB SESSIONS (shared world, 1 to 4 seats). The host's copy runs the match. Every other copy sends its player's
 * stick and buttons to the host (reliable, about 16 packets a second), and shows the host's snapshots (unreliable, 15 a
 * second): the skaters, the goalies, the puck, the score, the clock, the booth's lines and the sounds. Outside a session
 * (AIHub.active false) none of this runs. ---- */
/** a seat's input as the host has it: the stick from the last packet, the presses since the host last read them */
class RemoteInput {
  constructor() { this.mv = [0, 0]; this.held = new Set(); this.edges = new Set(); this.lastDevice = 'gamepad'; }
  apply(msg) { this.mv = msg.mv || [0, 0]; this.held = new Set(msg.held || []); for (const e of msg.edges || []) this.edges.add(e); }
  move() { return this.mv; }
  down(a) { return this.held.has(a); }
  pressed(a) { if (this.edges.has(a)) { this.edges.delete(a); return true; } return false; }
  released(a) { if (a === 'shoot' && this.edges.has('shootUp')) { this.edges.delete('shootUp'); return true; } return false; }
  consume(a) { this.edges.delete(a); }
  consumeAll() { this.edges.clear(); }
  label(a) { return game.input.label(a); }
}
const Net = { on: false, host: false, me: -1, n: 0, live: false, ended: false, finished: false, remote: [], latest: null, lastSeq: -1, sseq: 0,
  sendT: 0, overT: 0, pending: new Set(), cfg: null, info: null };
const NET_HELD = ['pass', 'shoot', 'deke', 'lob', 'turbo', 'chirp', 'switch'];
const NET_EDGES = ['pass', 'shoot', 'deke', 'lob', 'switch', 'chirp'];
/** every step: the local player's presses, kept until the next packet (a press is never lost between packets) */
function netSample() {
  const I = game.players[0];
  if (!I || Net.me < 0) return;
  for (const a of NET_EDGES) if (I.pressed(a)) Net.pending.add(a);
  if (I.released('shoot')) Net.pending.add('shootUp');
}
function netSendIntent() {
  const I = game.players[0];
  if (!I || Net.me < 0) return;
  const held = NET_HELD.filter(a => I.down(a));
  AIHub.send({ t: 'in', mv: I.move(), held, edges: [...Net.pending] }, { reliable: true });
  Net.pending.clear();
}
/** the host's picture of the match, for every other copy */
function netSnapshot() {
  const sk = M.skaters, pk = M.puck;
  return { t: 'snap', seq: ++Net.sseq, ph: M.phase, ck: +M.clock.toFixed(1), per: M.period, ot: M.ot, ov: !!M.over, sc: M.score.slice(), bo: M.boom.slice(), kb: M.kab.map(v => +v.toFixed(1)),
    sk: sk.map(k => [Math.round(k.x * 10) / 10, Math.round(k.y * 10) / 10, Math.round(k.vx), Math.round(k.vy), Math.round(k.face * 100), k.state, k.charge ? +k.charge.toFixed(2) : 0]),
    gl: M.goalies.map(g => [Math.round(g.x * 10) / 10, Math.round(g.y * 10) / 10, g.state]),
    pk: [Math.round(pk.x * 10) / 10, Math.round(pk.y * 10) / 10, Math.round(pk.z * 10) / 10, pk.owner ? sk.indexOf(pk.owner) : -1, !!pk.inNet],
    ban: M.banner, bt: +M.bannerT.toFixed(2), fi: M.fight ? [sk.indexOf(M.fight.a), sk.indexOf(M.fight.b), +M.fight.A.bal.toFixed(1), +M.fight.B.bal.toFixed(1), +M.fight.A.stam.toFixed(0), +M.fight.B.stam.toFixed(0), M.fight.A.act ? M.fight.A.act.name : '', M.fight.B.act ? M.fight.B.act.name : '', +M.fight.t.toFixed(1), M.fight.last || ''] : null,
    ev: (M.evq || []).slice(0, 12), say: (M.sayq || []).slice(0, 4),
    its: (M.items || []).filter(i => !i.taken).map(i => [i.kind, Math.round(i.x), Math.round(i.y), Math.round(i.z), i.landed ? 1 : 0]),
    mas: M.mascot ? [Math.round(M.mascot.x), Math.round(M.mascot.y), +M.mascot.down.toFixed(1), +M.mascot.wave.toFixed(1)] : null,
    slp: (M.slips || []).map(s => [s.x, s.y, s.r]), thn: (M.thin || []).map(p => [p.integ, p.hole ? 1 : 0]) };
}
/** a snapshot, applied to this copy's own match (it doesn't simulate: it shows the host's) */
function netApply(m) {
  M.phase = m.ph; M.clock = m.ck; M.period = m.per; M.ot = m.ot; M.score = m.sc; M.boom = m.bo; M.kab = m.kb;
  m.sk.forEach((a, i) => { const k = M.skaters[i]; if (!k) return; k.x = a[0]; k.y = a[1]; k.vx = a[2]; k.vy = a[3]; k.face = a[4] / 100; k.state = a[5]; k.charge = a[6]; });
  m.gl.forEach((a, i) => { const g = M.goalies[i]; if (!g) return; g.x = a[0]; g.y = a[1]; g.state = a[2]; });
  const pk = M.puck; pk.x = m.pk[0]; pk.y = m.pk[1]; pk.z = m.pk[2]; pk.owner = m.pk[3] >= 0 ? M.skaters[m.pk[3]] : null; pk.inNet = m.pk[4];
  M.banner = m.ban; M.bannerT = m.bt;
  M.fight = m.fi ? { a: M.skaters[m.fi[0]], b: M.skaters[m.fi[1]], A: { bal: m.fi[2], stam: m.fi[4], act: m.fi[6] ? { name: m.fi[6] } : null }, B: { bal: m.fi[3], stam: m.fi[5], act: m.fi[7] ? { name: m.fi[7] } : null }, t: m.fi[8], last: m.fi[9] } : null;
  M.items = m.its.map(([kind, x, y, z, landed]) => ({ kind, x, y, z, landed: !!landed, life: 5, t: 1, x0: x, y0: y, x1: x, y1: y, u: 1, vx: 0, vy: 0, taken: false }));
  if (m.mas) { M.mascot = M.mascot || { x: 0, y: 0, down: 0, wave: 0 }; M.mascot.x = m.mas[0]; M.mascot.y = m.mas[1]; M.mascot.down = m.mas[2]; M.mascot.wave = m.mas[3]; }
  M.slips = m.slp.map(([x, y, r]) => ({ x, y, r })); (M.thin || []).forEach((p, i) => { if (m.thn[i]) { p.integ = m.thn[i][0]; p.hole = !!m.thn[i][1]; } });
  M.evq = []; for (const e of m.ev) fx(e);
  M.sayq = []; for (const line of m.say) talkSay(line);
  if (m.ov && !M.over) { M.over = true; M.phase = 'over'; M.timer = 0; }
}
/** the start: the teams and the arena from the hub's seed (the same on every copy), a seat for each player */
function netStart() {
  const rng = AIHub.rng('teams'), n = Net.n;
  const home = Math.floor(rng() * TEAMS.length), away = (home + 1 + Math.floor(rng() * (TEAMS.length - 1))) % TEAMS.length, arena = Math.floor(rng() * ARENAS.length);
  const inputs = [];
  for (let i = 0; i < n; i++) {
    if (Net.host) { Net.remote[i] = Net.remote[i] || new RemoteInput(); inputs.push(i === Net.me ? game.players[0] : Net.remote[i]); }
    else inputs.push(i === Net.me ? game.players[0] : null);
  }
  Net.cfg = { teams: [home, away], arena, humans: n, seed: 1 + Math.floor(rng() * 1e6), mode: 'session', inputs };
  Net.live = true; Net.finished = false; Net.ended = false; Net.lastSeq = -1; Net.latest = null; Net.overT = 0; Net.sendT = 0;
  game.go('match', { cfg: Net.cfg }, { fade: 'iris' });
}
/** the host's end: the standings (the winning side's seats first), each seat's goals */
function netFinish() {
  if (Net.finished || !M) return;
  Net.finished = true;
  if (!M.over) { M.over = true; M.phase = 'over'; }
  const w = M.soWinner !== undefined ? M.soWinner : (M.score[0] > M.score[1] ? 0 : 1);
  const seatsOf = t => M.humans.filter(h => h.sk.t === t).map(h => h.i);
  const standings = [seatsOf(w), seatsOf(1 - w)].filter(a => a.length);
  const scores = {};
  for (const h of M.humans) scores[h.i] = M.score[h.sk.t];
  AIHub.finish({ standings, scores, won: w === 0 });
}
/** the match's own frame in a session: the host steps the match and sends it; the others show it and send their stick */
function netMatchUpdate(dt) {
  if (!M) return;
  if (Net.host) {
    matchStep(dt); rigsStep(dt); talk.update(dt);
    Net.sendT -= dt;
    if (Net.sendT <= 0) { Net.sendT = .066; AIHub.send(netSnapshot(), { reliable: false }); M.evq = []; M.sayq = []; }
    if (M.over) netFinish();
  } else {
    if (!Net.ended) netSample();
    if (Net.latest && Net.latest.seq !== Net.lastSeq) { Net.lastSeq = Net.latest.seq; netApply(Net.latest); }
    rigsStep(dt); talk.update(dt);
    Net.sendT -= dt;
    if (Net.sendT <= 0) { Net.sendT = .06; netSendIntent(); }
  }
  if (M.over) {
    Net.overT += dt;
    if (Net.overT > 3 || Net.ended) {
      Net.live = false; lastResult = { mode: 'session', home: M.teams[0].def.name, away: M.teams[1].def.name, score: M.score[0] + ' - ' + M.score[1], won: M.score[0] > M.score[1], stars: [] };
      game.go('results', null, { fade: 'iris' });
    }
  }
}
/** the hub's messages: a seat's stick (the host), the host's snapshot (the others) */
function netMessage(data, from) {
  if (!data) return;
  if (data.t === 'in' && Net.host && Net.remote[from]) Net.remote[from].apply(data);
  else if (data.t === 'snap' && !Net.host) Net.latest = data;
}
/** a player left: their seat goes to the CPU (the host), and the round goes on */
function netLeave(id) {
  if (!M || !Net.host) return;
  const h = M.humans.find(x => x.i === id);
  if (!h) return;
  h.sk.human = null; M.humans = M.humans.filter(x => x !== h); if (Net.remote[id]) Net.remote[id].held.clear();
}
/** the hub's connection: the host's copy, the seats, the start; no hub, the game runs as it does on its own */
function netConnect() {
  AIHub.connect({ mode: 'shared-world', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title'); return; }
    Net.on = true; Net.info = info; Net.host = !!info.isHost; Net.me = info.server || info.me === undefined ? -1 : info.me; Net.n = info.players.length;
    AIHub.ready();
    AIHub.on('start', () => netStart());
    AIHub.on('message', (data, from) => netMessage(data, from));
    AIHub.on('leave', ({ id }) => netLeave(id));
    AIHub.on('time-up', () => { if (Net.host) netFinish(); });
    AIHub.on('end', ({ reason }) => { Net.ended = true; if (reason === 'void' || reason === 'host-left') { Net.live = false; } if (M && !M.over) { M.over = true; M.phase = 'over'; M.timer = 0; } });
  });
}
/** the session's own scene: the hub's card is up; this shows the round's waiting for its start */
scenes.session = {
  view: 'threequarter', input: KEYS, res: 'ps1',
  enter() { M = null; game.follow(null); },
  update() { },
  draw(r) { r.sky(['#0e1630', '#1e3050', '#2e5a3a']); r.overlay(g => E.font.text(g, 'WAITING FOR THE FACEOFF', r.W / 2, r.H / 2, '#fffbe8', { align: 'center', outline: '#000' })); }
};

/* the scene table, the deep links (#match, #attract, #story, #setup, #practice, #records, #about, #dev, #credits) */
const SCENE_NAMES = ['title', 'attract', 'setup', 'story', 'cutscene', 'match', 'results', 'practice', 'records', 'about', 'credits', 'dev', 'flood', 'lab'];
const first = (location.hash || '').slice(1).split('/')[0];
const deep = HUB ? 'session' : (SCENE_NAMES.includes(first) ? first : 'title');
game.start({ scenes, scene: deep, data: deep === 'cutscene' ? { chapter: 0 } : undefined });
if (HUB) netConnect();   // (in a session the round starts from the hub, with its card)
window.__game = { game, scenes, Net, netSnapshot, touchOnly, T, TUNE_DEFAULTS, STORY, TEAMS, ARENAS, makeMatch, M: () => M, startStory, finishMatch, store, starsOf,
  progress: () => STORY_SAVE(), sim: { floodStart, floodTick, getFlood: () => flood, breakGlass, fightStart, shootout, goal, faceoff, outOfPlay, activateKaboom, requestFight, fightStep }, tuneSet, tuneReset, rec };
game.debug = {
  snapshot() {
    const pk = M ? M.puck : null;
    return { scene: game.sceneName, phase: M ? M.phase : null, period: M ? M.period : null, clock: M ? +M.clock.toFixed(2) : null, score: M ? M.score.slice() : null,
      boom: M ? M.boom.slice() : null, kab: M ? M.kab.map(v => +v.toFixed(2)) : null, fight: M ? !!M.fight : null, banner: M ? M.banner : null,
      puck: pk && { x: +pk.x.toFixed(1), y: +pk.y.toFixed(1), z: +pk.z.toFixed(1), owner: pk.owner ? pk.owner.name : null },
      skaters: M ? M.skaters.map(s => ({ name: s.name, t: s.t, x: +s.x.toFixed(1), y: +s.y.toFixed(1), state: s.state, human: !!s.human })) : [],
      goalies: M ? M.goalies.map(g => ({ t: g.t, x: +g.x.toFixed(1), y: +g.y.toFixed(1), state: g.state })) : [],
      goals: M ? M.goals.length : 0, saves: M ? M.saves.slice() : null, hits: M ? M.hits.slice() : null, mode: M && M.cfg ? M.cfg.mode : null,
      errors: game.errors.length };
  }
};
})();
