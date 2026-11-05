/* BATZOOKA BASEBALL: content as data. Teams, parks, the Tour's story, Spring Training lessons, upgrades and the
   play-by-play line pools. Adding a team or a park is a data entry. */

/* player: [name, pos, bat, pow, spd, arm, hair, skin, handedness] stats 1..10 */
const mk = rows => rows.map(r => ({ name: r[0], pos: r[1], bat: r[2], pow: r[3], spd: r[4], arm: r[5], hair: r[6], skin: r[7], lefty: !!r[8], build: r[9] || 'chibi' }));
BZ.def('teams', 'hay', {
  name: 'HAYMAKERS', city: 'Cornfield', short: 'HAY', blurb: 'A barnstorming nine from a cornfield ballpark with a leaky roof and a big heart.',
  colors: { cloth: '#f2d544', pants: '#2f6b3a', boot: '#2a1c12', belt: '#2f6b3a', trim: '#2f6b3a', cap: '#2f6b3a' }, chip: '#f2d544', cap2: '#2f6b3a', hat: 'cap',
  players: mk([
    ['BUSTER', 'P', 5, 6, 4, 8, '#7a4a22', '#e8b890', 0, 'bulky'], ['MABEL', 'C', 6, 5, 3, 9, '#c8402a', '#f0c8a8', 0], ['ROOSTER', '1B', 5, 9, 2, 5, '#2a1a10', '#b07850', 1, 'bulky'],
    ['DOT', '2B', 8, 3, 8, 6, '#1a1a1e', '#e8b890', 0], ['LEFTY LOU', '3B', 6, 6, 5, 7, '#3a2a1a', '#f0c8a8', 1], ['PEPPER', 'SS', 9, 4, 9, 8, '#e8c060', '#8a5a38', 0],
    ['CLEM', 'LF', 7, 7, 6, 5, '#5a3a22', '#e8b890', 0], ['SKEETER', 'CF', 7, 5, 10, 7, '#d8a030', '#f0c8a8', 0], ['BIG ED', 'RF', 4, 10, 3, 9, '#2a2a2a', '#a06a44', 1, 'bulky']
  ])
});
BZ.def('teams', 'lem', {
  name: 'LUNAR LEMURS', city: 'Moon Dome', short: 'LEM', blurb: 'Low gravity, high hopes. They have never lost a game that was happening on the moon.',
  colors: { cloth: '#e8e8f8', pants: '#6a4ab8', boot: '#2a2040', belt: '#6a4ab8', trim: '#a888f0', cap: '#6a4ab8' }, chip: '#a888f0', cap2: '#6a4ab8', hat: 'visor',
  players: mk([
    ['ZIGGY', 'P', 6, 5, 5, 8, '#c8e8f8', '#d8d8f0'], ['NEBULA', 'C', 5, 6, 3, 9, '#a888f0', '#c8b8e0'], ['COMET', '1B', 6, 8, 3, 5, '#f0f0ff', '#b8c8e0', 1, 'bulky'],
    ['ORBIT', '2B', 8, 3, 8, 6, '#3a2a60', '#d8d8f0'], ['QUASAR', '3B', 6, 7, 5, 7, '#f08aa8', '#c8b8e0', 1], ['PULSAR', 'SS', 8, 4, 9, 8, '#40d0e0', '#d8d8f0'],
    ['LUNA', 'LF', 7, 6, 7, 5, '#e0e0ff', '#b8c8e0'], ['SOLAR', 'CF', 7, 5, 10, 7, '#ffd870', '#d8d8f0'], ['TITAN', 'RF', 5, 9, 4, 9, '#2a2060', '#a8b0d0', 1, 'bulky']
  ])
});
BZ.def('teams', 'cin', {
  name: 'CINDER SLUGGERS', city: 'Magma Meadows', short: 'CIN', blurb: 'They hit the ball so hard the ball needs a lawyer. Do not hold the bat. It is hot.',
  colors: { cloth: '#e8402a', pants: '#2a2020', boot: '#1a1010', belt: '#f2a030', trim: '#f2a030', cap: '#2a2020' }, chip: '#e8402a', cap2: '#2a2020', hat: 'cap',
  players: mk([
    ['EMBER', 'P', 6, 7, 5, 9, '#f08030', '#c88060'], ['SOOT', 'C', 5, 7, 3, 9, '#1a1a1a', '#8a5a40', 0, 'bulky'], ['MAGMA MAX', '1B', 5, 10, 2, 6, '#e04020', '#b07850', 1, 'bulky'],
    ['SPARK', '2B', 8, 4, 8, 6, '#ffb040', '#d8a080'], ['CINDY', '3B', 7, 7, 5, 7, '#2a1a1a', '#a06a44', 1], ['FLINT', 'SS', 8, 5, 9, 9, '#802010', '#c88060'],
    ['ASHLEY', 'LF', 7, 7, 6, 6, '#c0c0c0', '#e0b090'], ['BLAZE', 'CF', 8, 6, 10, 7, '#ff6020', '#d8a080'], ['VOLCANO VIC', 'RF', 5, 10, 3, 10, '#301010', '#8a5a40', 1, 'bulky']
  ])
});
BZ.def('teams', 'meg', {
  name: 'MEGAMAX MAVERICKS', city: 'MegaDome', short: 'MEG', blurb: 'Owned, operated and sponsored by Mortimer Megamax, who owns the ball, the bat and the word "fun".',
  colors: { cloth: '#303848', pants: '#c8a030', boot: '#101018', belt: '#c8a030', trim: '#e8c860', cap: '#c8a030' }, chip: '#c8a030', cap2: '#303848', hat: 'helmet',
  players: mk([
    ['UNIT 1', 'P', 8, 7, 6, 10, '#505870', '#c0c8d8'], ['UNIT 2', 'C', 7, 8, 4, 10, '#505870', '#c0c8d8', 0, 'bulky'], ['MR. BRUNT', '1B', 6, 10, 3, 7, '#101018', '#a0785a', 1, 'bulky'],
    ['SYNERGY', '2B', 9, 5, 9, 8, '#e8c860', '#e8b890'], ['DEBIT', '3B', 8, 8, 6, 8, '#303848', '#d8a080', 1], ['CREDIT', 'SS', 9, 6, 10, 9, '#303848', '#f0c8a8'],
    ['PROFIT', 'LF', 8, 8, 7, 7, '#c8a030', '#e8b890'], ['MARGIN', 'CF', 8, 6, 10, 8, '#7a8098', '#d8a080'], ['MORTIMER', 'RF', 7, 10, 4, 10, '#e0e0e0', '#f0c8a8', 1, 'bulky']
  ])
});

/* parks: fence control distances (LF line, LC gap, CF, RC gap, RF line), look, hazards */
BZ.def('parks', 'corn', {
  name: 'CORNFIELD PARK', sub: 'Home of the Haymakers. Seats 400. Smells like summer.', fence: [600, 740, 880, 740, 600], fenceH: 40, wallTop: '#9a6a3a', wallSide: '#7a4a2a',
  grass: [[70, 140, 52], [86, 160, 62]], dirt: [186, 130, 84], track: [150, 106, 70], backdrop: 'day', ambient: 1, lights: false, gravity: 1,
  outside: [188, 168, 70], stand: ['plank', '#8a5a30', '#a87848'], hazard: 'corn', crowd: ['#f2d544', '#2f6b3a', '#c84030', '#ffffff'], weather: 'leaves', song: 'play', lounge: 'a barn with a scoreboard stapled to it'
});
BZ.def('parks', 'moon', {
  name: 'MOON DOME', sub: 'Gravity: thoughtful. Fly balls hang around to chat.', fence: [640, 800, 960, 800, 640], fenceH: 44, wallTop: '#c8d0f0', wallSide: '#8890c0',
  grass: [[96, 96, 124], [108, 108, 140]], dirt: [150, 150, 176], track: [120, 120, 148], backdrop: 'space', ambient: .62, lights: true, gravity: .5,
  outside: [34, 30, 60], stand: ['stone', '#4a4a78', '#6a6aa0'], hazard: 'moon', crowd: ['#e8e8f8', '#a888f0', '#40d0e0', '#ffd870'], weather: null, song: 'moon', lounge: 'a crater with a hot dog stand'
});
BZ.def('parks', 'magma', {
  name: 'MAGMA MEADOWS', sub: 'Geysers of lava. Fans in oven mitts.', fence: [580, 720, 840, 720, 580], fenceH: 42, wallTop: '#4a3a3a', wallSide: '#2a1e1e',
  grass: [[78, 112, 50], [92, 128, 58]], dirt: [128, 78, 56], track: [92, 60, 48], backdrop: 'dusk', ambient: .72, lights: true, gravity: 1,
  outside: [120, 40, 22], stand: ['rock', '#3a2a28', '#5a403a'], hazard: 'magma', crowd: ['#e8402a', '#f2a030', '#2a2020', '#ffffff'], weather: 'ash', song: 'tense', lounge: 'the side of a volcano'
});
BZ.def('parks', 'mega', {
  name: 'MEGADOME', sub: 'A corporate stadium. The wall is 90 feet of synergy.', fence: [620, 760, 900, 760, 620], fenceH: 40, wallTop: '#e8c860', wallSide: '#303848', megaWall: true,
  grass: [[60, 128, 70], [70, 142, 80]], dirt: [150, 112, 88], track: [108, 84, 72], backdrop: 'city-night', ambient: .55, lights: true, gravity: 1,
  outside: [26, 28, 40], stand: ['stone', '#2a3040', '#404860'], hazard: 'mega', crowd: ['#c8a030', '#303848', '#e8e8e8', '#e03a4a'], weather: null, song: 'tense', lounge: 'a sky-box with a very expensive ficus'
});

/* the Tour: five stops would be the full game; the demo's slice is four games and a boss, each with scenes */
BZ.TOUR = [
  { park: 'corn', opp: 'cin', innings: 3, diff: .32, fan: 60, title: 'GAME 1: THE HOMESTAND',
    pre: [['BUSTER', 'Folks, the bank wants our cornfield by Friday. Thirty days. Zero dollars. One big idea.'], ['MABEL', 'The big idea is: we beat everybody. Starting with the Cinder Sluggers, whose bats are on fire. Literally.'], ['BUSTER', 'Fire is just hot enthusiasm. Play ball!']],
    post: [['MABEL', 'We won! The bank has been informed! The bank said "huh".'], ['BUSTER', 'A win is a win. Load the wagon. The moon has a ballpark and the moon has fans.']] },
  { park: 'moon', opp: 'lem', innings: 3, diff: .45, fan: 90, title: 'GAME 2: ONE SMALL STEP, ONE LARGE HOMER',
    pre: [['ZIGGY', 'Welcome to the Moon Dome! Mind the gravity. It is a little shy.'], ['PEPPER', 'The ball goes forever up here! Outfielders, climb the wall if you need to!'], ['ZIGGY', 'Also the hot dogs are freeze-dried. Play ball!']],
    post: [['ZIGGY', 'Wow. You hit it so far it is now in a different time zone.'], ['DOT', 'Next stop: Magma Meadows. They have a stadium on a volcano and a very relaxed safety department.']] },
  { park: 'magma', opp: 'cin', innings: 3, diff: .58, fan: 120, title: 'GAME 3: THE ROCKY ROAD TO MAGMA',
    pre: [['MAGMA MAX', 'Rematch! Last time you got lucky. This time the ground is lava. Same as always, but now on purpose.'], ['SKEETER', 'Watch the geysers! If the grass glows, move your feet!'], ['MAGMA MAX', 'Play ball, and may the best hot potato win!']],
    post: [['MAGMA MAX', 'Fine. Take your trophy. It is slightly melted. You can have it.'], ['BUSTER', 'One more stop. The MegaDome. Mortimer Megamax himself is waiting. And he brought lawyers.']] },
  { park: 'mega', opp: 'meg', innings: 3, diff: .72, fan: 250, boss: true, title: 'FINAL: THE MEGADOME',
    pre: [['MORTIMER', 'Ah, the Haymakers. Quaint. I own the stadium, the ball, the bat and the umpire. Do try to have fun.'], ['MABEL', 'Mister Megamax, you cannot own the umpire.'], ['MORTIMER', 'Read page 94 of the Standard Fun Agreement. Play ball.']],
    post: [['MORTIMER', 'I... lost? To a cornfield? That cannot be in the contract.'], ['BUSTER', 'It is, Mortimer. Page 95. It says, "if the little guys hit it over the wall, the little guys win."'], ['MABEL', 'The cornfield is saved. The bank is sending a fruit basket. It is mostly corn.']] }
];
BZ.UPGRADES = [
  { id: 'bat', name: 'ROCKET BAT POLISH', desc: 'Hit power +6% per level', cost: [40, 90, 160], max: 3 },
  { id: 'legs', name: 'TURBO BOOTS', desc: 'Runners and fielders +4% speed per level', cost: [40, 90, 160], max: 3 },
  { id: 'arm', name: 'LASER ARM TAPE', desc: 'Throws are faster and wilder less often', cost: [40, 90, 160], max: 3 },
  { id: 'meter', name: 'CROWD AMPLIFIER', desc: 'Batzooka meter charges 12% faster per level', cost: [50, 100, 180], max: 3 }
];

/* Spring Training: lessons are a setup, a hint and a goal event */
BZ.def('lessons', 1, { name: 'THE DUEL AT THE PLATE', hint: 'Line up the circle with the ball in the strike zone, then SWING as the ball crosses the plate.', goal: 'hit', need: 2, setup: { role: 'bat', outs: 0 }, done: 'You are a hitter now. The ball is afraid of you.' });
BZ.def('lessons', 2, { name: 'HEAT FROM THE MOUND', hint: 'Pick a pitch and a spot, THROW, then steer the ball in flight. Strike out the batter.', goal: 'strikeout', need: 1, setup: { role: 'pitch', outs: 0 }, done: 'Three strikes! Somewhere, a bat is crying.' });
BZ.def('lessons', 3, { name: 'GLOVES AND ARMS', hint: 'Chase the ball with the stick. Catch it, then throw to a base with the diamond buttons.', goal: 'out', need: 1, setup: { role: 'field', outs: 0, forceHit: 'grounder' }, done: 'Out! Your arm is a rumour that turned out true.' });
BZ.def('lessons', 4, { name: 'THE BASEPATHS', hint: 'Send runners forward, hold them back, hold TURBO and slide. Score a run.', goal: 'run', need: 1, setup: { role: 'run', outs: 0, runners: [1] }, done: 'Safe! The dirt on your jersey is a badge.' });
BZ.def('lessons', 5, { name: 'FIRE THE BATZOOKA', hint: 'The meter is full. Hit the POWER button while you swing for a rocket-powered blast.', goal: 'batzooka', need: 1, setup: { role: 'bat', outs: 0, meter: 100 }, done: 'KABOOM! The ball has left the building and the building is concerned.' });

/* play-by-play: Tex and Dusty, two old radio hands. {b} = batter, {p} = pitcher, {f} = fielder, {d} = distance */
BZ.lines = {
  start: ['Good evening, baseball fans, and a hello to anyone who is also a hot dog!', 'Folks, the sun is out, the grass is green and the umpire is already lying about something.'],
  strike: ['Strike! Right down Broadway!', 'Strike, and the catcher\'s mitt says "thanks for the visit".', 'That one had more heat than a skillet at a family reunion.'],
  ball: ['Ball. High and wide, like a duck with ambitions.', 'Ball! The umpire says "no thank you".', 'Outside. That pitch is still looking for the plate.'],
  whiff: ['Swing and a miss! He cut the air in two.', 'He missed it by a country mile and a state fair.', 'Swung so hard he screwed himself into the ground.'],
  foul: ['Foul ball! Some lucky kid just got a free lesson in ducking.', 'Back it goes, into the cheap seats.', 'Foul! Gets a piece of it, and then a little more of the grandstand.'],
  single: ['A base hit! Falls in like a good rumour!', 'Single! Ropes it through the gap.', 'That one found grass and made friends.'],
  double: ['A double! Slides in with dust on his dust!', 'Two bags! He\'s standing on second like it\'s a stage.'],
  triple: ['A triple! Legs like a jackrabbit on a hot skillet!', 'Three bags! And a lung or two lost along the way.'],
  homer: ['IT IS GONE! Hit it so far it needs a passport!', 'Going, going, GONE! Somebody call the neighbours!', 'Back, back, back! That ball is somebody else\'s problem now!'],
  batzooka: ['BATZOOKA! The ball has been RELOCATED!', 'FIRE IN THE HOLE! The bat has opinions and the opinions are rockets!'],
  robbed: ['ROBBED! He climbed the wall like a cat chasing a pension!', 'He took it away! Home run, meet glove!'],
  out: ['And that\'s an out, ladies and gentlemen. Quiet as a church mouse.', 'Out! Sit down, son, you\'ve had a nice try.'],
  fly: ['A can of corn, and caught!', 'Easy fly ball, and the glove says thanks.'],
  grounder: ['Throws him out by a step! The crowd is on its feet!', 'Scooped and thrown. That is how you do it, kids.'],
  strikeout: ['STRUCK HIM OUT! The big fella is going back to the dugout to think about his choices.', 'Strike three! He\'s been sat down harder than a sofa.'],
  walk: ['Ball four! Take your base, son.', 'A walk. Sometimes patience pays in free real estate.'],
  steal: ['He\'s going! Stolen base! Quick as a rumour in a small town!', 'Safe at second! He stole it fair and square. Mostly square.'],
  doubleplay: ['Double play! Two for the price of one!', 'Around the horn! That is a double play, and you can tell your friends.'],
  run: ['And the run scores! Cash the check!', 'He crosses the plate! Pop the confetti cannons!'],
  rhubarb: ['Oh brother, here come the benches! RHUBARB!', 'The dugouts are emptying! Somebody get the good chairs!'],
  inning: ['Time for the seventh-inning stretch, which is happening early because I said so.', 'We will be right back after the next commercial for a different hot dog.'],
  end: ['And that is the ball game, friends! Drive safe, drive happy!', 'Final score in the books. Tell your mother we said hello.']
};
