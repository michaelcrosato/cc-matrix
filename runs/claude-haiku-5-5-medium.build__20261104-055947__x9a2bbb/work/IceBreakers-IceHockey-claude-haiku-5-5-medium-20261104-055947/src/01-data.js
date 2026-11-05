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
