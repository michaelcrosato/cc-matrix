/* ---------- content as data: teams, grounds, deliveries, story, commentary ---------- */
const TITLE = 'CRICKET KERFUFFLE';
const TAGLINE = 'Mind the cow. Mind the vicar. Mind the window.';

const TEAMS = {
  kerf:  { name: 'Kerfuffle CC',       short: 'KER', cloth: '#f2ecd6', trim: '#2f7a46', pants: '#f2ecd6', hat: '#2f7a46', hair: '#7a4a2a', skin: '#e8b890' },
  witt:  { name: 'Little Wittering',   short: 'LWT', cloth: '#e8dcc8', trim: '#8a2434', pants: '#e8dcc8', hat: '#8a2434', hair: '#3a2a20', skin: '#d8a074' },
  gumb:  { name: 'Upper Gumbleton',    short: 'UGB', cloth: '#dfe8f4', trim: '#2a4a9a', pants: '#dfe8f4', hat: '#2a4a9a', hair: '#c8b070', skin: '#f0c8a0' },
  mega:  { name: 'Megadome Marauders', short: 'MMM', cloth: '#1c1c28', trim: '#f0b820', pants: '#1c1c28', hat: '#f0b820', hair: '#101010', skin: '#a8703c' },
  rain:  { name: 'The Vicar\'s XI',    short: 'VIC', cloth: '#e8e0f0', trim: '#6a3a8a', pants: '#e8e0f0', hat: '#6a3a8a', hair: '#8a8a8a', skin: '#e0b090' },
};

const GROUNDS = {
  green: { name: 'Wittering Green', sky: ['#7ec8f0', '#cfeaf8', '#f4f0d8'], grass: ['#3f8a38', '#47963f'], ambient: 1, night: false, pitchBounce: 1, speed: 1, music: 'match' },
  cow:   { name: 'Gumbleton Meadow', sky: ['#88c0e8', '#d0e4f0', '#f0e8d0'], grass: ['#4a8c34', '#549a3c'], ambient: 1, night: false, pitchBounce: .95, speed: 1.05, music: 'match' },
  dome:  { name: 'The Megadome', sky: ['#0a0a22', '#1c1840', '#3a2060'], grass: ['#2a6a38', '#307a40'], ambient: .5, night: true, pitchBounce: 1.1, speed: .95, music: 'night' },
};

const DIFFS = [
  { id: 'village', name: 'Village', bowlSigma: .1, batSigma: .11, edge: .6, scale: .8 },
  { id: 'county',  name: 'County',  bowlSigma: .07,  batSigma: .08,  edge: .85, scale: 1 },
  { id: 'test',    name: 'Test',    bowlSigma: .045,  batSigma: .055, edge: 1.1, scale: 1.25 },
];

/* deliveries: the human picks one of three on the face buttons; the special needs a full Hype meter */
const DELIVERIES = {
  pace:  { id: 'pace',  name: 'Quickie',        kmh: 138, sp: 420, swing: 0,    turn: 0,    bounce: 1,   seam: 1.0, btn: 'ground', col: '#e8443a' },
  swing: { id: 'swing', name: 'Banana Swinger', kmh: 124, sp: 350, swing: 120,  turn: 0,    bounce: .95, seam: .6,  btn: 'loft',   col: '#3b82f6' },
  spin:  { id: 'spin',  name: 'Twirly Whirly',  kmh: 82,  sp: 235, swing: 0,    turn: .09,  bounce: 1.1, seam: .2,  btn: 'defend', col: '#22c55e' },
  fire:  { id: 'fire',  name: 'THE FIREBALL',   kmh: 176, sp: 520, swing: 90,   turn: 0,    bounce: 1,   seam: .4,  btn: 'special', col: '#f5b700' },
};
const DELIVERY_ORDER = ['pace', 'swing', 'spin'];

const FIELD_PRESETS = {
  balanced: [[-14, -28], [-44, -8], [-125, 40], [-135, 130], [-60, 265], [70, 262], [135, 135], [125, 30], [70, -95]],
  attack:   [[-14, -28], [-40, -8], [-90, 20], [-70, 60], [-40, 105], [45, 100], [85, 55], [110, 20], [60, -70]],
  defend:   [[-190, 60], [-210, 190], [-95, 310], [90, 305], [200, 190], [190, 60], [120, -120], [-120, -120], [0, 330]],
};

/* ---------- the campaign: three chapters, each a match with a story either side ---------- */
const CHAPTERS = [
  { id: 1, name: 'The Vicar Bets a Scone', opp: 'witt', ground: 'green', overs: 2, wickets: 3, diff: 0, chaos: 'none',
    intro: [
      ['VICAR', 'Good morning, Captain. The Kerfuffle Cup has been missing since Tuesday. Little Wittering say they found it in a hedge and are keeping it.'],
      ['YOU', 'That sounds like a Little Wittering sort of thing to do.'],
      ['VICAR', 'Two overs each. Three wickets a side. If you win, I shall bake you a scone the size of a hat.'],
      ['VICAR', 'Press the button when the ball arrives, not before, and never during the sandwiches.'],
    ],
    win: [['VICAR', 'A famous victory! The scone is in the oven. The Cup remains in the hedge, but one step at a time.']],
    lose: [['VICAR', 'A defeat, but a dignified one. The scone is cancelled. The tea, however, is on me.']] },
  { id: 2, name: 'A Cow Has Opinions', opp: 'gumb', ground: 'cow', overs: 2, wickets: 3, diff: 1, chaos: 'cow',
    intro: [
      ['COACH', 'Upper Gumbleton play on a meadow. The meadow contains a cow. The cow contains no respect for the laws of cricket.'],
      ['YOU', 'Can we move the cow?'],
      ['COACH', 'We tried. She moved us.'],
      ['COACH', 'Hit the ball past her, over her, or in desperate cases, into her. Fill the Hype meter and you go ON FIRE.'],
    ],
    win: [['COACH', 'Beaten fair and square, and the cow is merely a spectator. Between us, she did cheer.']],
    lose: [['COACH', 'Well. The cow is delighted. We shall regroup over cake.']] },
  { id: 3, name: 'The Grand Kerfuffle', opp: 'mega', ground: 'dome', overs: 3, wickets: 3, diff: 2, chaos: 'all',
    intro: [
      ['ANNOUNCER', 'LADIES AND GENTLEMEN, UNDER THE LIGHTS OF THE MEGADOME, THE MARAUDERS WELCOME A VILLAGE SIDE WITH A MOWER AND A DREAM!'],
      ['YOU', 'We have a mower?'],
      ['VICAR', 'We have the mower. We do not have a plan. Aim for the pub window, Captain. It is worth a great deal and the landlord has agreed to forgive us.'],
      ['ANNOUNCER', 'THREE OVERS. THREE WICKETS. ONE TROPHY. NO REFUNDS.'],
    ],
    win: [['ANNOUNCER', 'AGAINST ALL ODDS, AGAINST ALL TASTE, KERFUFFLE CC ARE CHAMPIONS! THE CUP IS FOUND! IT WAS IN THE HEDGE.']],
    lose: [['ANNOUNCER', 'THE MARAUDERS PREVAIL! BUT HONOUR IS INTACT, AND SO IS THE PUB WINDOW. MOSTLY.']] },
];

/* ---------- commentary (a plummy box: digressive, dry, fond of cake) ---------- */
const COMM_NAMES = ['The Hon. Jeremy Thwaite', 'Dot Pemberley'];
const LINES = {
  welcome: ['Good afternoon, and welcome to a ground that has never once been on time.', 'Lovely day for it, and by "it" I mean whatever happens next.'],
  dot: ['Nothing doing. A fine, honest, entirely unproductive ball.', 'Dot ball. The cake tent audibly sighs.', 'Left alone like a wasp at a picnic.', 'No run. The scorer sharpens a pencil out of sheer boredom.'],
  one: ['A single, taken with the enthusiasm of a man paying a parking fine.', 'One run. Every little helps, as the actress said to the bishop.'],
  two: ['Two! Lovely running, both of them nearly arriving at the same time.', 'They pinch a couple. Somewhere a vicar nods approvingly.'],
  three: ['Three! That is a lot of running for a Tuesday.', 'Three runs, and a second helping of exhaustion.'],
  four: ['FOUR! Straight through the gap like a letter through a gate.', 'That is gone for four, and the rope barely had time to flinch.', 'FOUR! The fielder waves politely as it passes.'],
  six: ['SIX! Into the next parish!', 'That has gone further than my last holiday.', 'SIX! Somebody fetch a ladder and a very understanding neighbour.'],
  bowled: ['BOWLED HIM! The stumps cartwheel like a drunk acrobat.', 'Timber! The off stump has left the building.'],
  lbw: ['That looks plumb. The vicar raises a finger, and possibly a eyebrow.', 'LBW! Dead in front, and not a leg to stand on.'],
  caught: ['CAUGHT! Straight down the throat of a man who was thinking about lunch.', 'Taken! The fielder looks as surprised as the ball.'],
  runout: ['RUN OUT! Somebody did the arithmetic and it came up short.', 'Run out! One of them is on a different page of the plan.'],
  dropped: ['Oh, DROPPED! It went in, it went out, it went on holiday.', 'Down it goes! Hands of butter, and not the nice salted kind.'],
  wide: ['Wide! That ball was heading for a different match entirely.', 'Wide, and one extra for the nice people in the other team.'],
  noball: ['No ball! Overstepped, and the free hit will cost him.', 'No ball! The front foot has gone exploring.'],
  fire: ['The bat is ON FIRE. Somebody fetch a bucket, or perhaps a marshmallow.', 'ON FIRE! The laws of cricket are not designed for this.'],
  cow: ['The cow has wandered on. I believe she is a floating voter.', 'There is a cow on the outfield, and she appears to be fielding.'],
  cowstop: ['STOPPED BY THE COW! The finest piece of fielding this season.', 'The cow has intercepted. Nobody has complained, least of all the cow.'],
  rain: ['Rain! Naturally. The covers are, as ever, in a different county.', 'Drizzle. The ball will skid, and so will the vicar.'],
  window: ['THE PUB WINDOW! A thousand shards and a free round on the house.', 'Straight through the window! The landlord is applauding. Possibly.'],
  tea: ['Into the tea urn! Hot work, quite literally.', 'The tea tent is hit! Today there will be scones, and apologies.'],
  golden: ['A golden ball! Everything doubles, including the nerves.', 'Golden ball! Runs are worth double, and so is the embarrassment.'],
  hat: ['And that is another wicket. The innings is wobbling like a jelly on a train.'],
  win: ['And that is the match! Cake for everyone, apart from the losers, who get a sandwich.'],
  lose: ['It was not to be. Still, there was tea, and that is what matters.'],
};

const FIRSTNAMES = ['Barnaby', 'Hattie', 'Rufus', 'Mildred', 'Cuthbert', 'Pippa', 'Wilfred', 'Dorcas', 'Ambrose', 'Tilly', 'Gideon', 'Bertha'];
const SURNAMES = ['Thrumpton', 'Bumble', 'Pettigrew', 'Crumpet', 'Fothergill', 'Wigglesworth', 'Dibble', 'Snodgrass', 'Plumtree', 'Noakes'];
