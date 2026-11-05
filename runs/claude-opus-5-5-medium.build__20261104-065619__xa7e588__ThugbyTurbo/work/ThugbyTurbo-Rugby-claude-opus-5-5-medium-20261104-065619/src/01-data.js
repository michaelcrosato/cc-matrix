/* ---- CONTENT: teams, venues, power-ups, commentary, the Mega Cup's script, the drills (docs/DATA.md describes each) ---- */
const SKIN = { pale: '#f2cdb0', ruddy: '#e8a888', tan: '#d09a70', brown: '#a8714a', dark: '#6a4128' };
const ROLES = ['PROP', 'HOOKER', 'PROP', 'SCRUM-HALF', 'FLY-HALF', 'CENTRE', 'WING'];
const FORWARDS = [0, 1, 2];
// a player: [name, nickname, build, size, hair, hairColor, skin, hat|null, [SPD, POW, HND, KCK, TKL], extra]
const P_ = (name, nick, build, size, hair, hairColor, skin, hat, stats, extra) => ({ name, nick, build, size, hair, hairColor, skin, hat, stats: { SPD: stats[0], POW: stats[1], HND: stats[2], KCK: stats[3], TKL: stats[4] }, ...(extra || {}) });
TT.TEAMS = [
  { id: 'mud', name: 'MUDDINGTON MUDLARKS', short: 'MUD', city: 'Muddington',
    home: { cloth: '#4aa0e0', trim: '#5a3a1e', pants: '#3a2a1a', boot: '#1a1410' }, away: { cloth: '#e8dcc0', trim: '#4aa0e0', pants: '#3a2a1a', boot: '#1a1410' },
    crest: ['bird', '#4aa0e0', '#6a4422'], style: { aggression: .5, pass: .55, kick: .3, cheap: .1 }, diff: 0, voice: 1,
    players: [
      P_('Dougie McAllister', 'THE FRIDGE', 'bulky', 1.35, 'bald', '#5a3a22', SKIN.pale, { style: 'helmet', color: '#6a4422' }, [4, 9, 5, 3, 8], { captain: true }),
      P_('Kev Boatwright', 'GRAVY', 'bulky', 1.25, 'short', '#c8602a', SKIN.ruddy, { style: 'band', color: '#e8dcc0' }, [5, 8, 6, 3, 7]),
      P_('Sione Taufa', 'TINY', 'bulky', 1.42, 'short', '#1a1410', SKIN.brown, null, [4, 10, 4, 2, 8]),
      P_('Priya Nandakumar', 'POCKET ROCKET', 'heroic', 1.05, 'ponytail', '#1a1410', SKIN.brown, null, [8, 4, 9, 6, 6]),
      P_('Ffion Pritchard', 'BOOTS', 'heroic', 1.12, 'long', '#a0482a', SKIN.pale, null, [6, 5, 8, 9, 5]),
      P_('Marcus Odhiambo', 'THE BUS', 'heroic', 1.3, 'spiky', '#141010', SKIN.dark, null, [7, 8, 6, 4, 7]),
      P_('Jamie Whitlock', 'WHEELS', 'heroic', 1.1, 'spiky', '#f0d070', SKIN.pale, null, [10, 4, 7, 5, 4])] },
  { id: 'bad', name: 'BRAMBLEWICK BADGERS', short: 'BAD', city: 'Bramblewick',
    home: { cloth: '#24242a', trim: '#f0f0f0', pants: '#f0f0f0', boot: '#1a1a1e' }, away: { cloth: '#f0f0f0', trim: '#24242a', pants: '#24242a', boot: '#1a1a1e' },
    crest: ['badger', '#24242a', '#f0f0f0'], style: { aggression: .3, pass: .4, kick: .5, cheap: .05 }, diff: -1, voice: 2,
    players: [
      P_('Edna Pemberton', 'NAN', 'bulky', 1.25, 'short', '#c8c8c8', SKIN.pale, { style: 'helmet', color: '#e8dcc0' }, [3, 8, 6, 4, 8], { captain: true, hunch: .2 }),
      P_('Wilf Hollins', 'WILF', 'bulky', 1.2, 'short', '#6a4a2a', SKIN.ruddy, null, [4, 7, 5, 3, 6]),
      P_('Barnaby Pike', 'BARN DOOR', 'bulky', 1.38, 'bald', '#6a4a2a', SKIN.ruddy, null, [3, 9, 3, 2, 7]),
      P_('Pip Tanner', 'PIP', 'heroic', 1.0, 'spiky', '#c8602a', SKIN.pale, null, [7, 3, 7, 5, 5]),
      P_('Clementine Ashby', 'CLEM', 'heroic', 1.1, 'ponytail', '#f0d070', SKIN.pale, null, [5, 4, 7, 8, 4]),
      P_('Ollie Brock', 'BADGER', 'heroic', 1.25, 'short', '#1a1a1a', SKIN.tan, null, [6, 7, 5, 3, 6]),
      P_('Tilly Fenwick', 'TILLY', 'heroic', 1.08, 'long', '#1a1410', SKIN.pale, null, [8, 3, 6, 4, 4])] },
  { id: 'gul', name: 'PORT GRUMBLE GULLS', short: 'GUL', city: 'Port Grumble',
    home: { cloth: '#f4f4f0', trim: '#1fa89a', pants: '#1e2a50', boot: '#1a1a24' }, away: { cloth: '#1fa89a', trim: '#f4f4f0', pants: '#1e2a50', boot: '#1a1a24' },
    crest: ['gull', '#1fa89a', '#f4f4f0'], style: { aggression: .45, pass: .75, kick: .5, cheap: .1 }, diff: 0, voice: 3,
    players: [
      P_('Sal Pereira', 'SALTY', 'bulky', 1.32, 'short', '#1a1410', SKIN.tan, null, [4, 8, 5, 3, 7]),
      P_('Kenji Ito', 'KIPPER', 'bulky', 1.2, 'spiky', '#141010', SKIN.pale, null, [6, 7, 7, 3, 6]),
      P_('Mo Haddad', 'ANCHOR', 'bulky', 1.38, 'bald', '#1a1410', SKIN.tan, null, [4, 9, 4, 2, 8]),
      P_('Lulu Fairweather', 'LULU', 'heroic', 1.02, 'ponytail', '#c83a2a', SKIN.pale, null, [8, 4, 9, 6, 5]),
      P_('Jonty Swift', 'SILKY', 'heroic', 1.15, 'long', '#f0c040', SKIN.pale, { style: 'band', color: '#1fa89a' }, [7, 5, 9, 9, 4], { captain: true }),
      P_('Dexter Okoro', 'JET', 'heroic', 1.25, 'short', '#141010', SKIN.dark, null, [8, 7, 7, 4, 6]),
      P_('Bree Lindqvist', 'BREEZE', 'heroic', 1.1, 'long', '#f4ecd0', SKIN.pale, null, [10, 4, 8, 5, 4])] },
  { id: 'irn', name: 'FURNACE FORGE IRONSIDES', short: 'IRN', city: 'Furnace Forge',
    home: { cloth: '#3a3a44', trim: '#f07a1e', pants: '#18181c', boot: '#101012' }, away: { cloth: '#f07a1e', trim: '#3a3a44', pants: '#18181c', boot: '#101012' },
    crest: ['anvil', '#3a3a44', '#f07a1e'], style: { aggression: .85, pass: .35, kick: .25, cheap: .35 }, diff: 0, voice: 4,
    players: [
      P_('Grigor Petrov', 'THE KILN', 'bulky', 1.4, 'bald', '#1a1410', SKIN.tan, { style: 'helmet', color: '#f07a1e' }, [4, 10, 3, 2, 9]),
      P_('Rusty Nailor', 'RUSTY', 'bulky', 1.25, 'short', '#b0481e', SKIN.ruddy, { style: 'helmet', color: '#f07a1e' }, [5, 8, 5, 3, 8]),
      P_('Bertha Blunt', 'BIG BERTHA', 'bulky', 1.4, 'ponytail', '#141010', SKIN.pale, null, [4, 10, 4, 2, 9]),
      P_('Smudge Cole', 'SMUDGE', 'heroic', 1.05, 'spiky', '#141010', SKIN.ruddy, null, [7, 5, 7, 5, 6]),
      P_('Ingot Ingram', 'INGOT', 'heroic', 1.15, 'short', '#f0d070', SKIN.pale, { style: 'helmet', color: '#f07a1e' }, [6, 6, 7, 8, 6]),
      P_('Adaeze Okafor', 'ANVIL', 'bulky', 1.32, 'short', '#141010', SKIN.dark, null, [7, 9, 6, 3, 9], { captain: true }),
      P_('Flint Mackay', 'FLINT', 'heroic', 1.12, 'spiky', '#a8a8b0', SKIN.pale, null, [9, 6, 6, 4, 6])] },
  { id: 'meg', name: 'MEGACORP MAULERS', short: 'MEG', city: 'Megadome', locked: true,
    home: { cloth: '#e8c040', trim: '#5a2a8a', pants: '#3a1a5a', boot: '#1a1024' }, away: { cloth: '#5a2a8a', trim: '#e8c040', pants: '#3a1a5a', boot: '#1a1024' },
    crest: ['m', '#5a2a8a', '#e8c040'], style: { aggression: .7, pass: .6, kick: .45, cheap: .25, supers: 1 }, diff: 1, voice: 5,
    players: [
      P_('Brannigan', 'BIG UNIT', 'bulky', 2.0, 'bald', '#1a1410', SKIN.tan, { style: 'band', color: '#e8c040' }, [6, 12, 6, 3, 10], { captain: true, boss: true }),
      P_('Leverage Lou', 'LEVERAGE', 'bulky', 1.25, 'short', '#2a1a10', SKIN.pale, null, [6, 8, 7, 3, 7]),
      P_('Bonus Barrington', 'BONUS', 'bulky', 1.38, 'short', '#f0d070', SKIN.ruddy, null, [5, 9, 5, 2, 8]),
      P_('Synergy Jones', 'SYNERGY', 'heroic', 1.05, 'ponytail', '#8a4ad0', SKIN.brown, null, [9, 5, 9, 6, 6]),
      P_('Chad Sterling III', 'CHAD', 'heroic', 1.15, 'long', '#f0c040', SKIN.pale, null, [7, 6, 9, 10, 5]),
      P_('Vance Capitale', 'VANCE', 'heroic', 1.28, 'spiky', '#141010', SKIN.tan, null, [8, 8, 7, 5, 7]),
      P_('Hedge Fundsworth', 'HEDGE', 'heroic', 1.12, 'short', '#c8c8d0', SKIN.pale, null, [10, 5, 8, 6, 5])] }
];
TT.teamById = id => TT.TEAMS.find(t => t.id === id) || TT.TEAMS[0];

/* the cast off the pitch: portraits (and the referee on it); voices for the babble */
TT.CAST = {
  barry: { name: 'BARRY BELLOWS', o: { build: 'heroic', size: 1.1, hair: 'short', outfit: 'coat', colors: { coat: '#7a1a2a', cloth: '#f0f0f0', hair: '#8a6a4a', skin: SKIN.ruddy } }, voice: { wave: 'square', base: 330, rate: 1.2 } },
  ros: { name: 'ROS RUCKER', o: { build: 'heroic', size: 1.1, hair: 'short', outfit: 'coat', colors: { coat: '#1e2a50', cloth: '#e8e8e8', hair: '#b8b8c0', skin: SKIN.pale } }, voice: { wave: 'triangle', base: 220, rate: .9 } },
  gristle: { name: 'COACH GRISTLE', o: { build: 'bulky', size: 1.3, hair: 'bald', hat: { style: 'cap', color: '#6a5a3a' }, outfit: 'coat', colors: { coat: '#6a4a2a', cloth: '#d8c8a0', hair: '#a0a0a0', skin: SKIN.ruddy } }, voice: { wave: 'saw', base: 140, rate: .85, gravel: true } },
  nigel: { name: 'REF NIGEL BLEWITT', o: { build: 'heroic', size: 1.1, hair: 'short', outfit: 'shirt', sleeves: 'short', colors: { cloth: '#18181c', trim: '#3ac060', pants: '#18181c', boot: '#101010', hair: '#6a4a2a', skin: SKIN.pale } }, voice: { wave: 'pulse12', base: 260, rate: 1.1 } },
  dave: { name: 'BIG DAVE', o: { build: 'bulky', size: 1.35, hair: 'short', hat: { style: 'band', color: '#3a3a3a' }, outfit: 'coat', colors: { coat: '#e8e030', cloth: '#3a3a4a', hair: '#3a2a1a', skin: SKIN.ruddy } }, voice: { wave: 'triangle', base: 160, rate: .9 } },
  rupert: { name: 'SIR RUPERT GOLDBRICK', o: { build: 'heroic', size: 1.15, hair: 'short', hat: { style: 'crown', color: '#e8c040' }, outfit: 'coat', colors: { coat: '#5a2a8a', cloth: '#f0f0f0', hair: '#d8d8d8', skin: SKIN.pale } }, voice: { wave: 'square', base: 200, rate: .75 } },
  pa: { name: 'STADIUM PA', voice: { wave: 'square', base: 180, rate: 1, echo: true } }
};

/* ---- venues (one twist each) ---- */
TT.VENUES = [
  { id: 'park', name: 'MUDDINGTON PARK', time: 'day', weather: 'rain', rain: .7, wind: 0, hazard: 'mud', music: 'mud',
    grass: [70, 128, 56], stand: 'plank', standSide: '#6a4a32', standTop: '#8a6a48', sky: ['#7a8898', '#a8b4bc', '#c8ccc8'], skyline: 'hills',
    boards: ['THE MUDDY DUCK', 'PIES & PINTS', "BIG DAVE'S BUSES", 'CHANNEL THUD'] },
  { id: 'docks', name: 'PORT GRUMBLE DOCKS', time: 'dusk', weather: 'wind', rain: 0, wind: 1, hazard: 'chicken', music: 'shanty',
    grass: [64, 120, 60], stand: 'stone', standSide: '#7a7a80', standTop: '#9a9aa0', sky: ['#2a2048', '#c8504a', '#f0a050'], skyline: 'docks',
    boards: ['SEAGULL-PROOF CHIPS', 'KRAKEN INSURANCE', "GRUMBLE'S GRAVY", 'CHANNEL THUD'] },
  { id: 'furnace', name: 'THE FURNACE', time: 'night', weather: 'clear', rain: 0, wind: 0, hazard: 'flames', music: 'forge',
    grass: [52, 104, 50], stand: 'stone', standSide: '#2a2a32', standTop: '#3a3a44', sky: ['#08060c', '#2a0c0c', '#6a2010'], skyline: 'chimneys',
    boards: ['FORGEWORKS STEEL', 'TURBO TONIC', 'MEGA MEAT PIES', 'CHANNEL THUD'] },
  { id: 'dome', name: 'THE MEGADOME', time: 'night', weather: 'storm', rain: .9, wind: .3, hazard: 'lightning', music: 'mayhem',
    grass: [58, 116, 62], stand: 'stone', standSide: '#4a2a6a', standTop: '#e8c040', sky: ['#06040e', '#1a1030', '#3a2058'], skyline: 'city',
    boards: ['GOLDBRICK HOLDINGS', 'CHANNEL THUD', 'TURBO TONIC', 'MEGACORP'] }
];
TT.venueById = id => TT.VENUES.find(v => v.id === id) || TT.VENUES[0];

/* ---- power-ups thrown on by the crowd ---- */
TT.POWERUPS = {
  pie: { name: 'MEAT PIE', time: 6, line: 'Somebody\'s chucked a meat pie on the pitch!' },
  iron: { name: 'IRON SHOULDERS', time: 15, line: 'IRON SHOULDERS! He\'s a walking wardrobe!' },
  boot: { name: 'MEGA BOOT', time: 60, line: 'The MEGA BOOT! Stand well back!' },
  grease: { name: 'GREASE JERSEY', time: 8, line: 'Grease jersey! Slippery as a sardine!' },
  horn: { name: 'AIR HORN', time: 0, line: 'AIR HORN! The crowd\'s gone barmy!' }
};
TT.POWERUP_IDS = Object.keys(TT.POWERUPS);

/* ---- difficulty (the CPU's numbers; never its logic) ---- */
TT.DIFF = {
  Rookie: { aiReaction: .4, tackleBonus: -.12, cpuMash: 6, noise: .35, intercept: .5, scrumSigma: .25, early: .08, read: .25 },
  Pro: { aiReaction: .25, tackleBonus: 0, cpuMash: 9, noise: .2, intercept: 1, scrumSigma: .12, early: .03, read: .35 },
  Legend: { aiReaction: .14, tackleBonus: .08, cpuMash: 12, noise: .08, intercept: 1.5, scrumSigma: .06, early: 0, read: .45 }
};
TT.DIFF_ORDER = ['Rookie', 'Pro', 'Legend'];

/* ---- commentary: Barry (play-by-play) and Ros (colour) ---- */
TT.LINES = {
  kickoff: [['b', 'And we\'re underway at {$venue}!'], ['b', 'Big boot to get us going!'], ['r', 'Here we go. Mind the mud.'], ['b', 'Up it goes, and the crowd are on their feet!'], ['r', 'Somebody catch it. Anybody.'], ['b', 'KICK-OFF! Let the carnage commence!']],
  try: [['b', 'HE\'S GONE OVER! TRY TIME!'], ['b', 'Under the sticks! You could drive a bus through that gap!'], ['b', 'Dotted down! {$player}, take a bow!'], ['b', 'In at the corner! Somebody check the paint on that touchline!'], ['r', 'Textbook. If the textbook was written by a hurricane.'], ['b', 'TRY! {$team} are dancing!']],
  bigHit: [['b', 'OH, THAT\'S A BIG ONE!'], ['b', 'He\'ll feel that in the morning. And the morning after.'], ['b', 'Absolutely SHUDDERING!'], ['r', 'I felt that in my old knee, Barry.'], ['b', 'CRUNCH! Hear that from the car park!'], ['r', 'That\'s a lot of man arriving at once.']],
  monsterHit: [['b', 'MONSTER HIT! That\'s gone into orbit!'], ['b', 'Put him in Row Z!'], ['b', 'Somebody get that man a postcode, he\'s lost!'], ['r', 'He left his boots behind, Barry.'], ['b', 'SHUDDERING! Absolutely SHUDDERING!'], ['r', 'Air traffic control want a word.']],
  sidestep: [['b', 'Left him for dead!'], ['b', 'Feet like a ballroom dancer!'], ['r', 'Lovely footwork. Questionable haircut. Lovely footwork.'], ['b', 'Step! And step again!'], ['b', 'He\'s grabbed a handful of fresh air!'], ['r', 'That defender needs a sit down.']],
  fend: [['b', 'HAND-OFF! Right in the chops!'], ['b', 'He\'s fended him into next week!'], ['r', 'Stiff arm. Stiffer upper lip.'], ['b', 'Palmed off like a cold call!'], ['b', 'Get OFF me, says {$player}!'], ['r', 'Rude. Effective. Rude.']],
  dummy: [['b', 'Oh, the dummy! They\'ve bought it, the whole shop!'], ['r', 'Sold them a dummy and the extended warranty.'], ['b', 'Dummy! Nobody home!']],
  lineBreak: [['b', 'He\'s through! There\'s daylight!'], ['b', 'The line\'s been cut like a birthday cake!'], ['r', 'Somebody left the gate open.'], ['b', 'LINE BREAK! Run, {$player}, RUN!'], ['b', 'Open country ahead!'], ['r', 'That\'s a lot of green grass for one person.']],
  knockOn: [['b', 'Knock-on. Butter fingers.'], ['b', 'Dropped it like a hot pie!'], ['r', 'Hands like feet.'], ['b', 'Oh, it\'s gone forward off the hands!'], ['r', 'Somebody\'s greased that ball.'], ['b', 'Spilled! Scrum coming.']],
  forwardPass: [['b', 'Forward! The ref\'s not having that.'], ['r', 'Forward by a country mile, Barry.'], ['b', 'That\'s gone forward, he\'s blown it up!'], ['r', 'Backwards, lads. It\'s the one rule.']],
  turnover: [['b', 'JACKAL! He\'s pinched it!'], ['b', 'Turnover! Stolen like a pie at a buffet!'], ['r', 'Lovely thievery.'], ['b', 'They\'ve won it back at the breakdown!'], ['r', 'Somebody check his pockets.'], ['b', 'TURNOVER!']],
  scrum: [['b', 'Crouch... bind... SET! And they\'ve hit like freight trains!'], ['r', 'That scrum\'s going backwards, and so is their dignity.'], ['b', 'Big shove in the scrum!'], ['r', 'Six large people having a hug. Lovely.']],
  pushover: [['b', 'PUSHOVER TRY! They\'ve shoved them over the line like a wardrobe!'], ['r', 'Removal men. Professional removal men.']],
  lineout: [['b', 'He\'s been lifted so high he can see his house!'], ['b', 'Stolen at the lineout! Cheeky!'], ['r', 'Up he goes. Mind the floodlights.'], ['b', 'Clean ball off the top!']],
  convMade: [['b', 'Straight between the sticks!'], ['b', 'Bang! Two more!'], ['r', 'Never in doubt. Well. Slightly in doubt.'], ['b', 'Over! Sweet as a nut!']],
  convMiss: [['b', 'Wide! Hooked it like a fisherman.'], ['r', 'That\'s gone into the car park.'], ['b', 'Oh, pushed it wide!'], ['r', 'The posts were right there, Barry.']],
  doink: [['b', 'DOINK! Off the upright!'], ['r', 'The post says no.']],
  dropGoal: [['b', 'DROP GOAL! Cheeky, cheeky!'], ['r', 'Three points from nowhere.'], ['b', 'He\'s dropped it over! What a nerve!']],
  penalty: [['b', 'Penalty! The ref\'s arm is out!'], ['b', 'Advantage being played...'], ['r', 'The ref saw that one. Miracles happen.'], ['b', 'He\'s penalised them!']],
  advOver: [['b', 'Advantage over.'], ['r', 'Advantage over. Play on.']],
  cheapUnseen: [['b', 'Ooh... the ref\'s missed that one completely.'], ['b', 'What the ref doesn\'t see, Ros...'], ['r', '...is still assault, Barry.'], ['b', 'Behind his back! Cheeky!']],
  yellow: [['b', 'YELLOW CARD! Off to the sin bin, and I mean an actual bin!'], ['r', 'In the bin. Lid down. Think about it.'], ['b', 'He\'s been binned! Literally!']],
  red: [['b', 'RED CARD! Early bath!'], ['r', 'Off. And don\'t come back.']],
  refDown: [['r', 'THE REF\'S DOWN! Anything goes, Barry!'], ['b', 'Anything goes, Ros!'], ['b', 'They\'ve flattened the referee!']],
  onFire: [['b', 'HE\'S ON FIRE!'], ['b', 'Somebody call the fire brigade! Actually, don\'t, let it burn!'], ['r', 'Unstoppable. Possibly flammable.']],
  super: [['b', 'THUNDER RUN! Get out of the way!'], ['b', 'HURRICANE HIT INCOMING!'], ['r', 'Somebody\'s had the special sauce.']],
  powerup: [['b', 'Somebody\'s chucked a meat pie on the pitch!'], ['r', 'Is that... gravy?'], ['b', 'Here comes something from the crowd!']],
  chicken: [['b', 'It\'s CAPTAIN CLUCKY! The mascot\'s on the pitch again!'], ['r', 'That chicken has more caps than I do.']],
  flames: [['b', 'Mind the flames! That\'s a well-done winger!'], ['r', 'Toasted. Lightly buttered.']],
  lightning: [['b', 'Lightning strike! That\'s one way to clear a ruck!'], ['r', 'Somebody upstairs has opinions.']],
  mud: [['b', 'He\'s in the mud! Half man, half puddle!'], ['r', 'They\'ll never get that kit clean.']],
  hooter: [['b', 'There\'s the hooter! Ball has to go dead!'], ['r', 'Hooter\'s gone. Kick it out or keep it alive.']],
  half: [['b', 'Half-time here at {$venue}: {$score}.'], ['r', 'Oranges and orange cordial. Hold the oranges.']],
  full: [['b', 'FULL TIME! {$team} win it, {$score}!'], ['b', 'That\'s it! Somebody get the kettle on!'], ['r', 'Well. That happened.']],
  sudden: [['b', 'Golden point! Next score wins the lot!'], ['r', 'Sudden death. Hopefully not literally.']],
  intercept: [['b', 'INTERCEPTED! He\'s read that like a bedtime story!'], ['r', 'Picked off. Gift-wrapped.']],
  kickTouch: [['b', 'Found touch! Lovely boot!'], ['r', 'Into the stand. Somebody\'s got a souvenir.']],
  notStraight: [['b', 'Not straight! Squint as a pub darts board!'], ['r', 'He\'s thrown it to his cousin.']],
  ref: [['b', 'Hands away in the ruck!'], ['b', 'Offside! The ref\'s seen him!']]
};

/* ---- the Mega Cup: four rounds ---- */
TT.CUP = [
  { id: 'r1', name: 'ROUND ONE', opp: 'bad', venue: 'park' },
  { id: 'qf', name: 'QUARTER-FINAL', opp: 'gul', venue: 'docks' },
  { id: 'sf', name: 'SEMI-FINAL', opp: 'irn', venue: 'furnace' },
  { id: 'gf', name: 'GRAND FINAL', opp: 'meg', venue: 'dome' }
];
/* the script: [speaker, line]; speakers are cast ids or 'team:index' for a player (the portrait and voice are theirs) */
TT.STORY = {
  prologue: { set: 'pub', title: 'THE MUDDY DUCK', lines: [
    ['dave', 'So I\'m filling in the form, right. \'Mega Cup.\' I thought it was a tea thing.'],
    ['gristle', 'It\'s the TURBO SEVENS MEGA CUP, Dave. Live on Channel Thud. Against teams with dieticians.'],
    ['mud:0', 'We\'ve got a dietician.{w=.4} (He nods at the pie warmer.)'],
    ['mud:3', 'Is the pie warmer on the team sheet, coach?'],
    ['gristle', 'Gristle\'s Rule Number One: nobody laughs at the Mudlarks. Rule Number Two: we train. {shake}NOW.{/shake} Yes, you too, Dave.']],
    choices: ['TRAIN WITH GRISTLE', 'SKIP TO THE CUP'] },
  r1: { set: 'pitch', title: 'ROUND ONE: MUDDINGTON PARK', lines: [
    ['barry', 'Welcome to a damp Muddington Park, where the Mudlarks open their Mega Cup against the Bramblewick Badgers!'],
    ['ros', 'Damp is generous, Barry. I\'ve seen drier rivers.'],
    ['bad:0', 'I\'ve propped since before your dad had teeth, sonny. I\'ve had hip replacements tougher than you.'],
    ['gristle', 'She\'s seventy-four, lads. Do NOT go easy on her. {shake}She bites.{/shake}']],
    half: 'Rule Three: hold the ball. Rule Four: see Rule Three.',
    won: [['barry', 'The Mudlarks are through! Ros, are they any good?'], ['ros', 'They\'re... present, Barry.']] },
  qf: { set: 'pitch', title: 'QUARTER-FINAL: PORT GRUMBLE DOCKS', lines: [
    ['gul:4', 'Gorgeous evening. Gorgeous ground. Gorgeous me. Do try to keep up, darlings.'],
    ['gristle', 'Watch the wind. Watch the chicken. Don\'t ask about the chicken.'],
    ['mud:6', 'Coach, what\'s the deal with the chicken?'],
    ['gristle', 'I said DON\'T ASK.']],
    half: 'Pass it like it\'s hot. It IS hot. It\'s Port Grumble. Everything here\'s been deep-fried.',
    won: [['ros', 'That chicken has more caps than I do.'], ['barry', 'The Mudlarks march on to the semis!']] },
  sf: { set: 'tunnel', title: 'SEMI-FINAL: THE FURNACE', lines: [
    ['irn:5', 'We forge champions here. Everyone else, we melt down for scrap.'],
    ['gristle', 'Don\'t stand on the glowing bits. Wheels. Wheels, look at me. The GLOWING bits.'],
    ['mud:6', 'The glowing bits look fun though.']],
    half: 'They hit hard? Hit harder. Then hide behind Tiny.',
    won: [['barry', '{shake}A PUB TEAM IN THE MEGA CUP FINAL!{/shake} Somebody pinch me!'], ['ros', 'Gladly, Barry.']] },
  gf: { set: 'tunnel', title: 'GRAND FINAL: THE MEGADOME', boss: true, lines: [
    ['rupert', 'Charming little pub team. I\'ll buy the lot of you. The pub, the pies, the muddy bird. Name your price.'],
    ['mud:0', 'Not for sale.'],
    ['gristle', 'The pies are for sale. Two-fifty. WE\'RE not.'],
    ['meg:0', '{shake}RRRAAAAAAGGGHHHHH!{/shake}'],
    ['barry', 'BIG UNIT BRANNIGAN! Two metres of pure invoice!'],
    ['ros', 'You\'ll need two men to bring him down, minimum. Bring a ladder.']],
    half: 'I\'ve written the big speech. In my head. It\'s very moving. Pretend I said it. {shake}NOW GET OUT THERE!{/shake}' },
  victory: { set: 'podium', title: 'MEGA CUP CHAMPIONS', lines: [
    ['barry', '{shake}THE MUDDINGTON MUDLARKS ARE MEGA CUP CHAMPIONS!{/shake} A PUB TEAM, ROS! A PUB TEAM!'],
    ['ros', 'I need a lie down, Barry.'],
    ['rupert', 'I\'ll buy the trophy, then.'],
    ['gristle', 'Rule Five: no.']] },
  third: { set: 'pub', title: 'THE THIRD HALF', song: true, lines: [
    ['mud:0', '{wave}Oh Muddington, oh Muddington, your mud is in my soul...{/wave}'],
    ['bad:0', '{wave}We lost our boots, we lost our teeth...{/wave}'],
    ['dave', '{wave}...we never lost the ball!{/wave}'],
    ['gristle', 'Last orders!']] },
  lost: { set: 'pitch', title: 'BEATEN', lines: [['gristle', 'Rule Six: we go again.']] }
};

/* ---- the Training Ground: Coach Gristle's nine drills ---- */
TT.DRILLS = [
  { id: 'legs', name: 'LEGS', teach: 'Run, turbo, ground it', prompt: 'Run to their line on {b:turbo} TURBO, then {b:x} DIVE over it' },
  { id: 'hands', name: 'HANDS', teach: 'Pass it backwards', prompt: 'Pass both ways: {b:l1} UP and {b:r1} DOWN. Hold for a long pass' },
  { id: 'feet', name: 'FEET', teach: 'Step, spin, fend', prompt: '{b:x} SIDESTEP twice, {b:x}{b:x} SPIN once, {b:sq} FEND the defender' },
  { id: 'hit', name: 'HIT', teach: 'Tackle, big hit, dive', prompt: '{b:x} TACKLE, hold {b:x} for a BIG HIT, {b:sq} DIVE TACKLE' },
  { id: 'ruck', name: 'RUCK', teach: 'Mash the breakdown', prompt: 'Mash {b:x} to win rucks. First to the ball? {b:sq} JACKAL' },
  { id: 'boot', name: 'BOOT', teach: 'Grubber, punt, drop goal', prompt: 'Tap {b:ci} GRUBBER, hold {b:ci} PUNT to touch, {b:ci} DROP GOAL in their 22' },
  { id: 'set', name: 'SET PIECES', teach: 'Scrum and lineout', prompt: '{b:x} on SET, alternate {b:l1}{b:r1} to push. Lineout: pick a pod, {b:x} throw' },
  { id: 'posts', name: 'POSTS', teach: 'Convert a try', prompt: 'Place the tee, aim, hold {b:ci} for power' },
  { id: 'turbo', name: 'TURBO TIME', teach: 'Power-ups and supers', prompt: 'Grab the pie, then {b:tri} THUNDER RUN through them to score' }
];

/* ---- records seeded with the cast's initials ---- */
TT.RECORD_SEEDS = {
  margin: [['NAN', 34], ['BIG', 31], ['SLK', 28], ['ANV', 24], ['FRG', 21], ['GRV', 17], ['PIP', 14], ['RUS', 12], ['CLM', 10], ['DAV', 7]],
  tries: [['BIG', 9], ['WHL', 8], ['BRZ', 7], ['JET', 6], ['NAN', 5], ['BUS', 5], ['FLT', 4], ['TIL', 4], ['HDG', 3], ['DAV', 2]],
  hit: [['BIG', 61], ['ANV', 52], ['KLN', 47], ['FRG', 40], ['BRT', 36], ['TNY', 31], ['NAN', 27], ['SAL', 22], ['GRV', 18], ['DAV', 9]]
};
