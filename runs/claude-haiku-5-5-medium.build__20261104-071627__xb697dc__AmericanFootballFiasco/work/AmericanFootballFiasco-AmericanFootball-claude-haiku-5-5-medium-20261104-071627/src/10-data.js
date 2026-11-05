/* AMERICAN FOOTBALL FIASCO: the data. Teams, rosters, formations, plays, the story's chapters, the radio's lines.
 * Units: a yard is 16 world units (one tile). x runs along the field toward the goals (left 0 to right 1920), y down the screen. */
(() => {
'use strict';
const FF = window.FF;
const D = FF.data = {};

D.YD = 16;                                    // world units per yard
D.FX0 = 160; D.FX1 = 1760;                    // the goal lines (the end zones are the 10 tiles outside them)
D.FY0 = 80;  D.FY1 = 944;                     // the sidelines (54 yards)
D.FYM = (D.FY0 + D.FY1) / 2;

// the two sides: the Tumbleweed Junction Fiascos (home, maroon and gold) and whoever they play. Each side has seven players.
D.TEAMS = [
  { key: 'FISCOS', name: 'TUMBLEWEED FISCOS', short: 'FISCOS', chip: '#8a2a3a', trim: '#f0c040', ez: '#7a1f32',
    cloth: '#8a2a3a', pants: '#f0e2b8', helmet: '#f0c040', skin: '#c89070' },
  { key: 'GATORS', name: 'GRAVEL PIT GATORS', short: 'GATORS', chip: '#2a7a4a', trim: '#e8e0a0', ez: '#1f6a3a',
    cloth: '#2a7a4a', pants: '#e8e0c0', helmet: '#e8e0a0', skin: '#a87050' }
];
// the opponents of THE FIASCO CUP (chapter by chapter). a chapter sets the other side's name and colors, its CPU's strength
// (difficulty) and the length of its quarters (in seconds, 2:00 by default)
D.CHAPTERS = [
  { title: 'PROLOGUE', opp: 1, difficulty: .85, quarter: 60, intro: ['The Fiscos open the Cup at home against the Gravel Pit Gators.', 'Ninety-nine losses in a row. Nobody in the stands has seen a win.'], win: ['A win! The Fiscos actually won one! The town is in the streets!'], lose: ['Ninety-nine and one. The owner is "thinking about it."'] },
  { title: 'CHAPTER 1: THE MUD', opp: 2, difficulty: .95, quarter: 90, intro: ['Lake Mud Muskrats. They play in the swamp, and they like it there.'], win: ['Mud on everyone and a win. The muskrats are weeping.'], lose: ['The swamp keeps the ball. The swamp always keeps the ball.'] },
  { title: 'CHAPTER 2: THE MESA', opp: 3, difficulty: 1.05, quarter: 105, intro: ['Red Mesa Rattlers, up from the desert, with a coach who is a rattlesnake in a visor.'], win: ['A rattlesnake on the sideline, sulking, and a Fiscos win.'], lose: ['The desert is hot, and the Fiscos are cooked.'] },
  { title: 'CHAPTER 3: THE CIRCUS', opp: 4, difficulty: 1.15, quarter: 120, lightsOut: true, intro: ['Bigtop Clowns. Three of them play quarterback, and they all throw at once.'], win: ['The clowns have gone home, and the Fiscos have a parade.'], lose: ['The clowns juggle the ball, and so, now, do the Fiscos.'] },
  { title: 'CHAPTER 4: THE CAPITAL', opp: 5, difficulty: 1.25, quarter: 120, intro: ['Capitol Thunder, the favourites. Their mascot is a bolt of lightning on stilts.'], win: ['Thunder! The Fiscos win the title game. The owner is crying into a trophy.'], lose: ['Thunder, and the owner stops being nice to the Fiscos.'] }
];
D.TEAMS.push(
  { key: 'MUSKRATS', name: 'LAKE MUD MUSKRATS', short: 'MUSKRATS', chip: '#5a4a2a', trim: '#c8b060', ez: '#4a3a1e', cloth: '#5a4a2a', pants: '#2a2218', helmet: '#c8b060', skin: '#d8a880' },
  { key: 'RATTLERS', name: 'RED MESA RATTLERS', short: 'RATTLERS', chip: '#b04a1e', trim: '#f0d080', ez: '#8a3a16', cloth: '#b04a1e', pants: '#f0e0c0', helmet: '#f0d080', skin: '#b87850' },
  { key: 'CLOWNS', name: 'BIGTOP CLOWNS', short: 'CLOWNS', chip: '#d03a8a', trim: '#ffe060', ez: '#a02868', cloth: '#d03a8a', pants: '#2a4ac0', helmet: '#ffe060', skin: '#f2e0cc' },
  { key: 'THUNDER', name: 'CAPITOL THUNDER', short: 'THUNDER', chip: '#2a3a8a', trim: '#f8e050', ez: '#1f2a6a', cloth: '#2a3a8a', pants: '#e8e8f0', helmet: '#f8e050', skin: '#b08060' }
);
// the chapter's opponent: index into D.TEAMS (1 is the first opponent; the Fiscos are 0)
D.opponent = ch => D.TEAMS[ch.opp];

// the rosters: each side's seven, in the same order as the formations (OFFENSE and DEFENSE), with the team's own names
D.ROSTER = {
  FISCOS: [['BUCK', 'QB'], ['TANK', 'RB'], ['MAG', 'C'], ['DUSTY', 'WR'], ['NOLAN', 'WR'], ['BEAN', 'WR'], ['HOLLIS', 'TE']],
  DEF: [['CHUCK', 'DL'], ['BIG JOE', 'DL'], ['WEASEL', 'LB'], ['RIPPER', 'LB'], ['SHEILA', 'CB'], ['TOOTS', 'CB'], ['PERKINS', 'S']],
  OPP: [['GRIM', 'QB'], ['KNUCKLES', 'RB'], ['OX', 'C'], ['SLICK', 'WR'], ['MOOSE', 'WR'], ['PELL', 'WR'], ['DUTCH', 'TE']],
  OPPDEF: [['BRICK', 'DL'], ['RUBY', 'DL'], ['SNAKE', 'LB'], ['CORD', 'LB'], ['FLASH', 'CB'], ['NUTS', 'CB'], ['BOLT', 'S']]
};

// formations, in yards from the line of scrimmage: dx toward the goal the side attacks (negative = behind the line), dy down the screen
D.OFFENSE = [['QB', -4, 0], ['RB', -6, 0], ['C', 0, 0], ['WR1', 0, -20], ['WR2', 0, 20], ['WR3', -1, -9], ['TE', 0, 6]];
D.DEFENSE = [['DL1', 1, -3], ['DL2', 1, 3], ['LB1', 5, -6], ['LB2', 5, 6], ['CB1', 8, -19], ['CB2', 8, 19], ['S', 15, 0]];

// the plays: a run's carrier and path (from the line, in yards), or a pass's routes and the receivers a QB may throw to
D.PLAYS = {
  RUN_IN: { name: 'INSIDE RUN', kind: 'run', carrier: 'RB', path: [[4, -1], [9, 0], [14, 0]], desc: 'Up the middle. Steady and dull.' },
  RUN_OUT: { name: 'SWEEP', kind: 'run', carrier: 'RB', path: [[2, 7], [7, 13], [13, 15]], desc: 'Outside, around the end. Fast and fragile.' },
  SLANT: { name: 'QUICK SLANT', kind: 'pass', routes: { WR1: [[5, 6], [4, 4]] }, targets: ['WR1', 'WR3', 'TE'], desc: 'Five yards, cut inside, get rid of it.' },
  GO: { name: 'GO LONG', kind: 'pass', routes: { WR2: [[26, 0]] }, targets: ['WR2', 'WR1'], desc: 'Straight downfield. Pray.' },
  SCREEN: { name: 'SCREEN', kind: 'pass', routes: { RB: [[8, 0]] }, targets: ['RB'], desc: 'A short pass behind a wall of blockers.' },
  REVERSE: { name: 'REVERSE', kind: 'run', carrier: 'WR3', path: [[2, 6], [8, 10], [12, 11]], desc: 'The receiver takes it and runs the other way.' },
  PUNT: { name: 'PUNT', kind: 'kick', desc: 'Give the ball to the other side, far away.' },
  FIELD_GOAL: { name: 'FIELD GOAL', kind: 'kick', desc: 'Three points from the far end of the field. If the leg holds.' }
};
D.CARDS = ['RUN_IN', 'RUN_OUT', 'SLANT', 'GO', 'SCREEN', 'REVERSE', 'PUNT', 'FIELD_GOAL'];
// the CPU's calls, weighted: it runs more than it throws, as coaches do
D.CPU_CALLS = [['RUN_IN', 22], ['RUN_OUT', 14], ['SLANT', 22], ['GO', 14], ['SCREEN', 10], ['REVERSE', 4]];

// the radio's lines: the Cage Radio of the stadium, the announcers' booth, the crowd. Each line is a random pick from its bank.
D.LINES = {
  kickoff: ['And the Fiscos line up to take the field. Nobody has told the crowd it is a long shot.', 'Here we go, folks. Hold on to your hats. Hold on to the hats of the people next to you.'],
  bigHit: ['BIG HIT! That is a sound you can hear in the parking lot!', 'OH, THAT HURT. THAT HURT THE HELMET.', 'THE CRUNCH! A SOUND LIKE A CAR DOOR!'],
  megaHit: ['MEGA HIT! The helmet is in the stands and the tuba player is still shaking!', 'A MEGA HIT! Somebody call a doctor, call a dentist, call a tow truck!'],
  dinged: ['He is DINGED! He sees stars, the stars see him, and they are both very confused.'],
  fumble: ['FUMBLE! The ball is loose and the crowd is standing!', 'THE BALL IS LOOSE! Everybody dive on it!'],
  intercept: ['INTERCEPTED! Somebody just took a bite out of the Fiscos\' dreams!'],
  touchdown: ['TOUCHDOWN! The Fiscos score! The town is dancing in the street!', 'SIX POINTS! The mascot has fallen out of the cannon!'],
  fieldGoal: ['The leg holds. Three points. The kicker is already bowing.'],
  missFG: ['The kick sails wide, like a balloon that has lost its nerve.'],
  punt: ['A long punt, a longer hope.'],
  incomplete: ['Incomplete. The ball is in the dirt. The dirt is pleased.'],
  sack: ['SACKED! The quarterback is now a part of the turf.'],
  blazing: ['BLAZING! The Fiscos are on FIRE! The flames are a sponsorship thing, we are told!'],
  firstDown: ['FIRST DOWN! The chains are moving. The chain crew is also moving, very quickly.'],
  quarter: ['And that is the end of the quarter. Time for a commercial for an insurance company.'],
  halftime: ['HALFTIME. The marching band is playing a song that sounds like a sneeze.'],
  final: ['THE FINAL WHISTLE! The Fiscos go into the locker room. Somebody, please, turn on the lights.'],
  win: ['A WIN! A WIN FOR THE FISCOS!'], lose: ['And the Fiscos lose again. The stadium goes quiet, then it goes to the parking lot.']
};

// the About screen and exit-interview.json read the same answers: the build inlines about.json as window.FF_ABOUT
const ABOUT = window.FF_ABOUT || {};
D.SOURCE = ABOUT.sourceInformation || {};
D.TESTING = ABOUT.testingFeedback || [];
D.ENGINE_FEEDBACK = ABOUT.engineFeedback || [];
D.PROMPT_FEEDBACK = ABOUT.promptFeedback || [];
D.AIHUB = ABOUT.aiHub || {};
})();
