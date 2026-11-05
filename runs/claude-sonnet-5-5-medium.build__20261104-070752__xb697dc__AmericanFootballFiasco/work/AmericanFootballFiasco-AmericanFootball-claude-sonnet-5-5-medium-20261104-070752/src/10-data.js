/* AMERICAN FOOTBALL FIASCO — data: teams, stadiums, plays, Fiasco Cards, commentary banks, the story. */
(() => {
'use strict';
const FF = globalThis.FF;

/* ---- teams (rating: spd = foot speed, str = blocking/tackling, hnd = hands/arm) ---- */
FF.TEAMS = {
  fiascos: { id: 'fiascos', name: 'Tumbleweed Junction Fiascos', short: 'FIASCOS', c1: '#e8a020', c2: '#5a2a10', hair: ['#5a3a1a', '#222', '#c89048'], r: { spd: 1.0, str: 1.0, hnd: 1.0 }, mascot: 'a very tired armadillo' },
  bruisers: { id: 'bruisers', name: 'Bayou Bruisers', short: 'BRUISERS', c1: '#3a9a4a', c2: '#e8e0a0', hair: ['#222', '#6a4a2a'], r: { spd: .96, str: 1.12, hnd: .95 }, mascot: 'a gator in a tuxedo', boss: 'TANK THIBODEAUX' },
  gladiators: { id: 'gladiators', name: 'Glacier Gladiators', short: 'GLADIATORS', c1: '#5ab8f0', c2: '#f4f8ff', hair: ['#e8e8f0', '#caa060'], r: { spd: 1.06, str: 1.0, hnd: 1.05 }, mascot: 'a yeti on skates', boss: 'FROSTY McBLITZ' },
  nightmares: { id: 'nightmares', name: 'Neon Nightmares', short: 'NIGHTMARES', c1: '#c040ff', c2: '#12121c', hair: ['#ff4090', '#40ffc0'], r: { spd: 1.08, str: 1.08, hnd: 1.08 }, mascot: 'a bat with a laser pointer', boss: 'THE COMMISSIONER' },
  devils: { id: 'devils', name: 'Dust Devils', short: 'DEVILS', c1: '#d85a2a', c2: '#f0d8a0', hair: ['#222', '#7a4a2a'], r: { spd: 1.02, str: .98, hnd: 1.0 }, mascot: 'a tumbleweed with feelings' },
  sharks: { id: 'sharks', name: 'Sidewalk Sharks', short: 'SHARKS', c1: '#2a6ad8', c2: '#e0e8f0', hair: ['#222', '#aa7a44'], r: { spd: 1.0, str: 1.04, hnd: 1.0 }, mascot: 'a shark who is lost' }
};
FF.TEAM_LIST = ['fiascos', 'bruisers', 'gladiators', 'nightmares', 'devils', 'sharks'];
FF.NAMES = {
  QB: ['Dusty Rhodes Jr.', 'Colt Waddle', 'Buck Hollis', 'Rex Tumble'], RB: ['Biscuit Jones', 'Sunny Dayz', 'Moose Malone', 'Fig Newton'],
  WR1: ['Gloves Mulligan', 'Zip Zapowski', 'Tango Bell', 'Rocket Ray'], WR2: ['Tiny Tina', 'Wiggles Okoye', 'Pep Ruiz', 'Dash Quill'],
  TE: ['Big Gary', 'Hank Tank', 'Luigi Lunge', 'Moss'], OL1: ['Bertha', 'Walt the Wall', 'Barn', 'Gus'], OL2: ['Chuck Oven', 'Dolly Door', 'Slab', 'Tuba Tom'],
  DL1: ['Crusher Kim', 'Stu Stomp', 'Ogden', 'Pound'], DL2: ['Nacho Business', 'Rock Hudson', 'Brick', 'Chomp'], LB1: ['Mad Dog Dee', 'Tackle Tony', 'Smash', 'Boomer'],
  LB2: ['Vlad the Pad', 'Rhonda Rampage', 'Hammer', 'Jolt'], DB1: ['Sticky Fingers', 'Velcro Vic', 'Nova', 'Glue'], DB2: ['Slick Nick', 'Mirage', 'Flick', 'Whisk'], S: ['The Hawk', 'Ghost Gomez', 'Safety Sal', 'Sky']
};
FF.OFF_ROLES = ['QB', 'RB', 'WR1', 'WR2', 'TE', 'OL1', 'OL2'];
FF.DEF_ROLES = ['DL1', 'DL2', 'LB1', 'LB2', 'DB1', 'DB2', 'S'];

/* ---- stadiums ---- */
FF.STADIUMS = {
  junction: { name: 'Tumbleweed Bowl', blurb: 'A high school field with a dream and a leaky sprinkler.', grass: [92, 150, 74], grass2: [78, 134, 62], ambient: .62, sky: '#2a3a6a', weather: null, crowd: ['#e8a020', '#5a2a10', '#f4e8d0'], lamp: '#ffe8b0', ez: [[232, 160, 32], [90, 42, 16]] },
  bayou: { name: 'Gator Gulch Dome', blurb: 'Humid. Loud. Something is watching from the scoreboard.', grass: [66, 128, 70], grass2: [54, 112, 58], ambient: .5, sky: '#1a3a30', weather: { kind: 'rain', amount: .5, wind: .2, lightning: .25 }, crowd: ['#3a9a4a', '#e8e0a0', '#6a4a2a'], lamp: '#d8ffb0', ez: [[58, 154, 74], [232, 224, 160]] },
  glacier: { name: 'Frostbite Field', blurb: 'The yard lines are painted on ice. Nobody told the ice.', grass: [180, 210, 226], grass2: [160, 192, 214], ambient: .66, sky: '#486a90', weather: { kind: 'snow', amount: .7, wind: .3 }, crowd: ['#5ab8f0', '#f4f8ff', '#c8d8e8'], lamp: '#e0f0ff', ez: [[90, 184, 240], [244, 248, 255]] },
  neon: { name: 'The Neon Colosseum', blurb: 'Lasers, smoke, and a scoreboard that insults you.', grass: [58, 96, 90], grass2: [46, 82, 78], ambient: .5, sky: '#1a0c30', weather: { kind: 'ash', amount: .25, wind: .1 }, crowd: ['#c040ff', '#40ffc0', '#ff4090'], lamp: '#ff80ff', ez: [[192, 64, 255], [18, 18, 28]] },
  dust: { name: 'Dust Devil Dustbowl', blurb: 'Sand in every sandwich.', grass: [150, 140, 80], grass2: [134, 124, 68], ambient: .7, sky: '#8a5a2a', weather: { kind: 'sand', amount: .5, wind: .4 }, crowd: ['#d85a2a', '#f0d8a0', '#7a4a2a'], lamp: '#ffd090', ez: [[216, 90, 42], [240, 216, 160]] },
  pier: { name: 'Sidewalk Shark Pier', blurb: 'A football field built over a parking lot. Mind the gulls.', grass: [84, 132, 100], grass2: [70, 118, 88], ambient: .6, sky: '#2a4a7a', weather: null, crowd: ['#2a6ad8', '#e0e8f0', '#f0c040'], lamp: '#fff0c0', ez: [[42, 106, 216], [224, 232, 240]] }
};

/* ---- plays (routes are yards from the player's start; x downfield, y to the offense's right) ---- */
FF.OFF_FORM = { QB: [-4, 0], RB: [-6.5, -2.5], WR1: [-.5, -12], WR2: [-.5, 11], TE: [0, 5.5], OL1: [0, -2.2], OL2: [0, 2.2] };
FF.DEF_FORM = { DL1: [1.4, -2.4], DL2: [1.4, 2.4], LB1: [4.6, -6], LB2: [4.6, 6], DB1: [8.5, -11], DB2: [8.5, 10], S: [15, 0] };
FF.PLAYS = {
  slants: { id: 'slants', name: 'QUICK SLANTS', kind: 'pass', blurb: 'Short and sharp. Hits before the rush arrives.', icon: 'slant', drop: 5, decide: 1.2, routes: { WR1: [[5, 0], [9, 8]], WR2: [[5, 0], [9, -8]], TE: [[6, 3], [8, 7]], RB: [[1, -9], [4, -13]] } },
  bomb: { id: 'bomb', name: 'BOMB SQUAD', kind: 'pass', blurb: 'Everybody go deep. Pray in the pocket.', icon: 'bomb', drop: 8, decide: 2.2, routes: { WR1: [[32, 3]], WR2: [[28, -4]], TE: [[14, 2], [20, -6]], RB: [[3, 10], [8, 15]] } },
  screen: { id: 'screen', name: 'SCREEN DOOR', kind: 'pass', blurb: 'Let them in, then block like a wall.', icon: 'screen', drop: 7, decide: 1.5, routes: { WR1: [[12, 3]], WR2: [[12, -3]], TE: [[4, -3]], RB: [[-1, 9], [3, 13]] } },
  dive: { id: 'dive', name: 'POWER DIVE', kind: 'run', blurb: 'Straight up the gut. Subtlety is for punters.', icon: 'dive', path: [[-1, 1.2], [2.5, 0], [9, 0]], handoff: .55 },
  sweep: { id: 'sweep', name: 'TOSS SWEEP', kind: 'run', blurb: 'Pitch it wide and outrun the problem.', icon: 'sweep', path: [[-5, 9], [0, 14], [7, 16]], handoff: .4, toss: true },
  flea: { id: 'flea', name: 'FLEA FLICKER', kind: 'trick', blurb: 'Hand it off, take it back, throw it long. Confuses everyone, us most.', icon: 'flea', drop: 9, decide: 3.2, routes: { WR1: [[34, 0]], WR2: [[30, -6]], TE: [[18, 6]], RB: [[0, 0]] }, handoff: .5, back: 1.25 }
};
FF.PLAY_ORDER = ['slants', 'bomb', 'screen', 'dive', 'sweep', 'flea'];
FF.DEFS = {
  blitz: { id: 'blitz', name: 'BLITZ BONANZA', blurb: 'Send the house. Bring the neighbours.', icon: 'blitz' },
  zone: { id: 'zone', name: 'WALL OF ZONE', blurb: 'Cover the grass. Let the grass sort it out.', icon: 'zone' },
  man: { id: 'man', name: 'LOCKDOWN', blurb: 'One on one. Stick to them like gum.', icon: 'man' },
  spy: { id: 'spy', name: 'SPY & PREY', blurb: 'A linebacker shadows the QB. Hide your chips.', icon: 'spy' }
};
FF.DEF_ORDER = ['blitz', 'zone', 'man', 'spy'];

/* ---- Fiasco Cards (items): the Fiasco Meter fills, a card is dealt, the Y / triangle button plays it ---- */
FF.CARDS = {
  rocket: { id: 'rocket', name: 'ROCKET CLEATS', text: 'Your whole team goes triple-turbo for 4 seconds.', col: '#ff7a2a' },
  mascot: { id: 'mascot', name: 'MASCOT STAMPEDE', text: 'A giant mascot flattens whoever is in the way.', col: '#ffd23a' },
  bolt: { id: 'bolt', name: 'LIGHTNING STRIKE', text: 'Zaps the two nearest rivals. Smells like toast.', col: '#7ad8ff' },
  warp: { id: 'warp', name: 'TIME WARP', text: 'The other team moves in slow motion for 4 seconds.', col: '#c080ff' }
};
FF.CARD_LIST = ['rocket', 'mascot', 'bolt', 'warp'];

/* ---- commentary banks (two announcers, Chuck Gridley and Dottie Blitz) ---- */
FF.LINES = {
  snap: ['And we are LIVE!', 'Hut hut HOLY MOLY!', 'Here comes the snap!', 'Here we go!'],
  catch: ['What a grab!', 'Hands like buttered toast, but he HELD it!', 'Caught it! Somebody call a doctor!', 'That is a CATCH, Dottie!'],
  drop: ['Dropped! Those hands are made of soap!', 'Incomplete! The ball and the receiver just met and did not click.'],
  inc: ['Incomplete. Nobody was home.', 'Sails out of reach! Somebody check that arm.'],
  int: ['INTERCEPTED! The ball has a new best friend!', 'Picked off! Stolen like a cookie from the jar!'],
  fumble: ['FUMBLE! It is a loose ball and a loose cannon!', 'The ball is OUT! Chaos reigns!'],
  big: ['BOOM! They felt that in the cheap seats!', 'That hit had a ZIP CODE!', 'Somebody call the helmet a taxi!', 'Ooof! That one left a mark on the field!'],
  mega: ['MEGA HIT! Call the planet, it needs to sit down!', 'THE LAWS OF PHYSICS FILED A COMPLAINT!'],
  sack: ['SACKED! The quarterback is now a doormat!', 'He never saw it coming, and neither did his mother!'],
  td: ['TOUCHDOWN! Light the fireworks, ignore the fire marshal!', 'SIX POINTS! Pandemonium in the stands!', 'HE HAS GONE ALL THE WAY! Somebody tell the bus!'],
  fg: ['It is GOOD! Right between the sticks!', 'Three points, folks, and a very smug kicker!'],
  miss: ['No good! It sailed wide and into the hot dog stand!', 'Missed it! The kicker is now studying the grass very closely.'],
  pat: ['The extra point is good!', 'Wide! A rare PAT disaster!'],
  first: ['First down! The chains move and so do my feelings!', 'Fresh set of downs! Hallelujah!'],
  streak: ['THEY ARE ON FIRE! Please do not touch them!', 'HOT STREAK! The ball is now spicy!'],
  card: ['A Fiasco Card is ready! Anything can happen now!', 'The meter is full! Brace for nonsense!'],
  rocket: ['ROCKET CLEATS! Where did he get those?!', 'Look at him go! That is not legal in 41 states!'],
  mascot: ['The MASCOT is on the field! This is not a drill!', 'A giant mascot stampede! Run, little men, run!'],
  bolt: ['LIGHTNING! Somebody tell the sky it is out of line!', 'ZAP! Two players, very crispy!'],
  warp: ['Time itself is slow! The ref has lost the thread!', 'TIME WARP! The rivals are moving through molasses!'],
  juke: ['Ankles broken! Ankles BROKEN!', 'What a juke! He left a defender in 1987!'],
  arm: ['Stiff arm! Reject! Denied!', 'He shoved the guy into next Tuesday!'],
  punt: ['The punt goes up and up and UP!', 'A booming punt! Somebody stop the clock, the ball is in orbit!'],
  half: ['That is the half! Time for halftime nachos!', 'Halftime! Go stretch your guesses.'],
  quarter: ['End of the quarter. Time flies when you are being tackled.'],
  final: ['That is the final whistle!', 'And that is the ballgame, folks!'],
  turnoverdowns: ['Turnover on downs! Fourth down is not a suggestion!'],
  safety: ['SAFETY! Two points and a lot of embarrassment!'],
  lights: ['The lights! Who turned off the lights?!', 'LIGHTS OUT! Somebody find the breaker!'],
  fire: ['The ball carrier is on FIRE, and it is ONLY a figure of speech... mostly!']
};

/* ---- the story: THE FIASCO CUP ---- */
FF.STORY = {
  prologue: [
    ['CHUCK', 'Ladies and gentlemen, welcome to Tumbleweed Junction, population: some. Home of the Fiascos, who have lost 99 games in a row!'],
    ['DOTTIE', 'Ninety-nine, Chuck. That is not a streak, that is a lifestyle.'],
    ['COACH', 'Listen up, Fiascos! The owner bet the FIELD on the Fiasco Cup. If we lose, this place becomes a mini-golf course.'],
    ['GLOVES', 'Coach, I like mini-golf.'],
    ['COACH', 'You will like winning more. Three games. Three bullies. One trophy shaped like a very large hot dog. Let us GO!']
  ],
  chapters: [
    {
      id: 1, opp: 'bruisers', stadium: 'bayou', title: 'CHAPTER 1: THE SWAMP STOMP', boss: 'tank',
      pre: [['DOTTIE', 'First up, the Bayou Bruisers. Their captain, Tank Thibodeaux, once tackled a bus.'], ['TANK', 'It was a small bus. And it deserved it.'], ['COACH', 'Tank hits like a refrigerator on rollerblades. Juke him, use the turbo, and for the love of nachos, hold on to the ball.']],
      post: [['TANK', 'You... beat me? Nobody beats me. Even my mother lets me win.'], ['COACH', 'One down. Two to go. Somebody get this man a sandwich.']],
      lose: [['COACH', 'We lost, but we lost with STYLE. Run it back.']]
    },
    {
      id: 2, opp: 'gladiators', stadium: 'glacier', title: 'CHAPTER 2: THE BIG FREEZE', boss: 'frost',
      pre: [['CHUCK', 'Next stop, Frostbite Field. The Glacier Gladiators have the fastest feet this side of the Arctic!'], ['FROSTY', 'Bring a sweater, Fiascos. And a lawyer.'], ['COACH', 'Their big hits freeze your turbo. Dodge the hits, play the Fiasco Cards, and for the love of cocoa, stay warm.']],
      post: [['FROSTY', 'My toes! My glorious frozen toes!'], ['DOTTIE', 'Two in a row! Chuck, are you crying?'], ['CHUCK', 'I have something in my eye. It is a snowflake. It is ALSO my dignity.']],
      lose: [['COACH', 'Cold, but not out. Defrost and go again.']]
    },
    {
      id: 3, opp: 'nightmares', stadium: 'neon', title: 'CHAPTER 3: LIGHTS OUT', boss: 'blackout',
      pre: [['CHUCK', 'The final, folks! Under the neon sky! The Neon Nightmares, owned by The Commissioner himself!'], ['COMMISSIONER', 'Welcome to MY colosseum. I am delighted to crush your dreams and then bill you for the cleaning.'], ['COACH', 'He can turn off the lights, Fiascos. When it goes dark, follow the ball. Win this, and the field is ours!']],
      post: [['COMMISSIONER', 'This... this is unacceptable. I demand a recount. Of the lights.'], ['DOTTIE', 'THE FIASCOS HAVE WON THE FIASCO CUP! The trophy is, as promised, a very large hot dog!'], ['COACH', 'Fiascos... the field is saved. And the mini-golf course is cancelled. Mostly.']],
      lose: [['COACH', 'The Commissioner got us. The lights are back on. We play again.']]
    }
  ],
  epilogue: [['CHUCK', 'And so, the Tumbleweed Junction Fiascos, 99 losses and ONE glorious hot dog, became legends.'], ['DOTTIE', 'Next season, they are going for 100 wins, Chuck.'], ['CHUCK', 'Dottie, let us just enjoy the hot dog.']]
};

/* ---- the practice drills (tutorial) ---- */
FF.DRILLS = [
  { id: 'run', title: 'DRILL 1: RUN AND JUKE', text: 'Hold TURBO and run to the end zone. Press JUKE when a dummy gets close. Press STIFF-ARM to shove them.', mode: 'run', goal: 'Reach the end zone.' },
  { id: 'pass', title: 'DRILL 2: THE QUARTERBACK', text: 'Drop back and throw to any receiver: press the button shown over their head.', mode: 'pass', goal: 'Complete 2 passes.' },
  { id: 'tackle', title: 'DRILL 3: HIT STICK', text: 'On defense, run down the ball carrier. TURBO into him for a BIG HIT, or press the TACKLE button to dive.', mode: 'tackle', goal: 'Make a tackle.' },
  { id: 'cards', title: 'DRILL 4: FIASCO CARDS', text: 'The Fiasco Meter is full! Press the CARD button to play your card.', mode: 'cards', goal: 'Play a Fiasco Card.' },
  { id: 'kick', title: 'DRILL 5: THE KICK', text: 'Press the button once to stop the power bar, again to stop the aim needle. Kick it through the uprights.', mode: 'kick', goal: 'Kick a field goal.' }
];

FF.TIPS = ['Hold TURBO to sprint. It drains, then it refills.', 'A BIG HIT needs speed: run, then smash.', 'Three good plays in a row and the whole team catches fire.', 'The Fiasco Meter fills from big plays. A full meter deals a Fiasco Card.', 'Fourth down? Punt, kick, or gamble. The crowd loves a gamble.', 'Laterals are legal any time. The ball does not care.', 'There are no penalties. There are no feelings, either.'];
})();
