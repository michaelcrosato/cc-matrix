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
