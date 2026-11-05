/* STADIUMS, FIASCO CARDS and COMMENTARY LINES (data only). Card effects are bus modifiers: adding a card never touches
 * the tackle or catch code. Lines: CHET in ALL CAPS, LOU in sentence case, 48 characters at most. */
(() => {
'use strict';
const FF = window.FF;
FF.data.stadiums = [
  { id: 'tumbleweed', name: 'TUMBLEWEED FIELD', home: 'fiascos', music: 'DUST_DEVIL', light: { ambient: .66, tint: '#ffd0a0', towers: 2 }, weather: null,
    surface: { stripes: ['#5a8a32', '#4c7a2a'], dirt: 4, mud: 0, ice: false, glow: false, endzone: '#6a3a7a', ground: '#8a6a40' },
    backdrop: { sky: ['#2a1a4a', '#c8503a', '#f0a050'], sun: { x: .82, y: .62, r: 18, color: '#ffd080' }, layers: [{ kind: 'mountains', color: '#6a3a3a', y: .66, height: .2, parallax: .1 }, { kind: 'hills', color: '#8a5a3a', y: .78, height: .12, parallax: .2 }] },
    stands: { tiers: 3, face: 'plank', side: '#8a6a4a', top: '#a8865a', density: .45, signs: ['FIASCO!', 'GO TUM', '99-0?', 'PICKLES'] },
    props: [['cactus', -3, -2], ['cactus', 126, -1], ['barrel', 2, 58], ['barrel', 3.2, 58.4], ['crate', 118, 58], ['firedrum', 125, 60], ['lamp', 30, -1.5], ['lamp', 90, -1.5]], scoreboard: 'old', special: 'crickets' },
  { id: 'hogwallow', name: 'THE HOG WALLOW', home: 'mudhogs', music: 'SWAMP_STOMP', light: { ambient: .56, tint: '#a0b0b8', towers: 2 }, weather: { kind: 'rain', amount: .6, wind: .2, lightning: .1 },
    surface: { stripes: ['#3e6a2e', '#4a7a36'], dirt: 4, mud: 14, ice: false, glow: false, endzone: '#5a3a1a', ground: '#4a3a2a' },
    backdrop: { sky: ['#3a4048', '#5a646e', '#7a848e'], layers: [{ kind: 'forest', color: '#2a3a2a', y: .62, height: .25, parallax: .2 }, { kind: 'fog', color: '#8a9490', y: .8, height: .15, parallax: .1 }] },
    stands: { tiers: 5, face: 'plank', side: '#5a6a5a', top: '#7a8a7a', density: .8, signs: ['HOGS!', 'MUD!', 'OINK'] },
    props: [['barrel', -2, 58], ['crate', 1, 59], ['crate', 2.2, 59.5], ['lantern', 118, 58], ['firedrum', 124, 59], ['bush', -3, -2], ['bush', 127, -2], ['sign', 60, 61, 'HOG WALLOW']], scoreboard: 'old', special: 'lightning' },
  { id: 'afterglow', name: 'AFTERGLOW ARENA', home: 'owls', music: 'NEON_NIGHT', light: { ambient: .46, tint: '#8a8aff', towers: 6, neon: true }, weather: null,
    surface: { stripes: ['#2a4a3a', '#24402f'], dirt: 0, mud: 0, ice: false, glow: true, endzone: '#2a1a3a', ground: '#14141e' },
    backdrop: { sky: ['#05040e', '#14102e', '#2a1a4a'], stars: true, moon: { x: .2, y: .2, r: 10, color: '#e0e8ff' }, layers: [{ kind: 'city', color: '#1a1a30', y: .6, height: .3, parallax: .15 }] },
    stands: { tiers: 7, face: 'stone', side: '#2a2a3a', top: '#3a3a4e', density: .9, signs: ['HOOT!', 'NEON', 'ZAP!'] },
    props: [['streetlamp', -2, 58], ['streetlamp', 126, 58], ['crystal', 0, -2], ['crystal', 124, -2], ['trashcan', 60, 61], ['lamp', 30, 61], ['lamp', 90, 61]], scoreboard: 'jumbo', special: 'lasers' },
  { id: 'frostbite', name: 'FROSTBITE FIELD', home: 'yetis', music: 'FROSTBITE', light: { ambient: .54, tint: '#c0d8ff', towers: 4 }, weather: { kind: 'snow', amount: .7, wind: .3 },
    surface: { stripes: ['#6a8a6a', '#7a9a7a'], dirt: 0, mud: 0, ice: true, glow: false, endzone: '#2a3a6a', ground: '#dfe8f4', snow: true },
    backdrop: { sky: ['#1a2a4a', '#3a6a7a', '#8ab0c8'], stars: true, layers: [{ kind: 'mountains', color: '#e0e8f4', y: .58, height: .3, parallax: .1 }, { kind: 'forest', color: '#2a4a3a', y: .8, height: .12, parallax: .2 }] },
    stands: { tiers: 6, face: 'stone', side: '#5a6a7a', top: '#e8eef8', density: .75, signs: ['BRRR!', 'YETI', 'COLD'] },
    props: [['pine', -3, -2], ['pine', 127, -2], ['pine', -3, 56], ['rock', 126, 58], ['firedrum', 2, 58], ['firedrum', 118, 58], ['crystal', 62, 61]], scoreboard: 'old', special: 'breath' },
  { id: 'megadome', name: 'THE MEGA DOME', home: 'dynasty', music: 'MEGA_DOME', light: { ambient: .6, tint: '#e0e8ff', towers: 6, spots: true }, weather: null,
    surface: { stripes: ['#3a8a3a', '#348034'], dirt: 0, mud: 0, ice: false, glow: false, endzone: '#c8a030', ground: '#2a2a32', crown: true },
    backdrop: { sky: ['#0a0a12', '#1a1a2a', '#2a2a3a'], stars: false, layers: [{ kind: 'castle', color: '#3a3a4a', y: .55, height: .3, parallax: .1 }] },
    stands: { tiers: 8, face: 'stone', side: '#3a3440', top: '#4a4450', density: 1, signs: ['$$$', 'DYNASTY', 'GOLD!'] },
    props: [['pillar', -2, -2], ['pillar', 126, -2], ['banner', 30, -1], ['banner', 90, -1], ['statue', -3, 58], ['statue', 127, 58], ['brazier', 60, 61]], scoreboard: 'jumbo', special: 'pyro' }
];
FF.stadium = id => FF.data.stadiums.find(s => s.id === id) || FF.data.stadiums[0];

/* ---- FIASCO CARDS: { id, name, side, art, text, cpu(ctx), apply(ctx) }; apply registers modifiers for this play ---- */
const add = (name, fn, o) => FF.bus.addMod(name, fn, Object.assign({ tag: 'card' }, o));
FF.data.cards = [
  { id: 'ROCKET_CLEATS', name: 'ROCKET CLEATS', side: 'off', art: 'cleats', text: 'Carrier and receivers +20% speed this play',
    cpu: c => (c.down >= 3 && c.toGo >= 10) || (c.trailing && c.timeLeft < 120),
    apply: c => add('speed', a => a.team === c.team && (a.carrier || a.slot === 'WR1' || a.slot === 'WR2' || a.slot === 'RB') ? 1.2 : 1, { kind: 'mul', plays: 1 }) },
  { id: 'GLUE_GLOVES', name: 'GLUE GLOVES', side: 'off', art: 'gloves', text: 'No drops. Contested catches +30% this play',
    cpu: c => c.pass && c.down >= 3,
    apply: c => { add('catch.p', x => x.team === c.team ? .3 : 0, { plays: 1 }); add('drop.no', x => x.team === c.team ? 1 : 0, { plays: 1 }); } },
  { id: 'BRICK_WALL', name: 'BRICK WALL', side: 'off', art: 'wall', text: 'Your blockers can\'t be shed for 3.5 s',
    cpu: c => c.pass && c.down >= 3 && c.toGo >= 10,
    apply: c => add('shed.t', x => x.blockerTeam === c.team && x.t < 3.5 ? 99 : 0, { plays: 1 }) },
  { id: 'HOT_SAUCE', name: 'HOT SAUCE', side: 'any', art: 'sauce', text: 'Your player goes BLAZING for 3 plays',
    cpu: c => c.quarter >= 3,
    apply: c => FF.ots && FF.ots.setHot(c.athlete, 3) },
  { id: 'MEGA_HIT', name: 'MEGA HIT', side: 'def', art: 'fist', text: 'This play\'s first tackle is a MEGA HIT',
    cpu: c => c.down >= 3 || c.redZone,
    apply: c => { FF.sim.megaNext = c.team; } },
  { id: 'BUTTERFINGERS', name: 'BUTTERFINGERS', side: 'def', art: 'butter', text: 'Their catch chance -35% this play',
    cpu: c => c.down >= 3 && c.toGo >= 10,
    apply: c => add('catch.p', x => x.team !== c.team ? -.35 : 0, { plays: 1 }) },
  { id: 'MASCOT_MAYHEM', name: 'MASCOT MAYHEM', side: 'any', art: 'mascot', text: 'Your mascot runs on as a 12th player!',
    cpu: c => c.trailingBy >= 7,
    apply: c => { FF.sim.mascotOn = c.team; } },
  { id: 'SUPER_FOOT', name: 'SUPER FOOT', side: 'kick', art: 'boot', text: 'Next kick: +15 yd, a wider sweet spot',
    cpu: c => c.fgYards >= 45 || (c.pat && c.timeLeft < 60),
    apply: c => { FF.sim.superFoot = c.team; } }
];
FF.card = id => FF.data.cards.find(c => c.id === id);

/* ---- COMMENTARY: event -> [[speaker, line]] (C = Chet, L = Lou) ---- */
const C = t => ['C', t], L = t => ['L', t];
FF.data.lines = {
  kickoff: [C('HERE WE GO! THE BALL IS IN THE AIR!'), L('I used to kick those. Then my leg retired.'), C('BOOTED! SOMEBODY GO GET IT!'), C('AND WE ARE UNDERWAY!'), L('Nice hang time. Like my laundry.'), C('THE KICK IS DEEP! IT IS VERY DEEP!'), L('Kickoffs. The calm before the crunch.'), C('LET THE FIASCO BEGIN!')],
  bigRun: [C('{player} FINDS DAYLIGHT!'), C('THE 40! THE 30! SOMEBODY TACKLE HIM!'), C('LOOK AT THOSE WHEELS!'), C('HE IS LOOSE! HE IS LOOSE!'), L('That was a highway, Chet. Four lanes.'), C('{yards} YARDS! ON ONE PLAY!'), C('HE BROKE THE ANKLES OF A WHOLE FAMILY!'), L('Somebody missed their assignment. Everybody.')],
  td: [C('TOUCH! DOWN! {team}!'), C('HE IS GONE! LIKE MY HAIRLINE!'), C('SIX POINTS AND A SIDE OF FRIES!'), L('Somebody call the mayor.'), C('TOUCHDOWN {team}! THE PLACE IS BONKERS!'), C('INTO THE END ZONE! CUE THE FIREWORKS!'), L('That one counts double in my heart.'), C('{player} TAKES IT TO THE HOUSE!')],
  bigHit: [C('OH! THAT HIT HAD A ZIP CODE!'), C('HE JUST GOT DELIVERED!'), C('SOMEBODY CALL HIS MAMA!'), C('BOOM! RIGHT IN THE BREADBASKET!'), L('I felt that one in my good knee.'), C('WHAM! THAT IS A BIG BOY HIT!'), C('{player} BRINGS THE THUNDER!'), L('He will be seeing that in his dreams.')],
  megaHit: [C('OH, THE HUMANITY OF IT ALL!'), C('HE IS IN ORBIT! NASA, ARE YOU SEEING THIS?'), C('HIS HELMET IS IN A DIFFERENT AREA CODE!'), L('That man needs a new mailing address.'), C('MEGA HIT! I SPILLED MY NACHOS!'), C('HE GOT SENT TO NEXT TUESDAY!'), L('Physics called. It wants an apology.'), C('KER-RUNCH! THAT ONE ECHOED!')],
  sack: [C('SACKED! {player} PUTS HIM IN A BAG!'), C('BROUGHT DOWN LIKE THE GROCERIES!'), C('NOWHERE TO RUN! SACK CITY!'), L('The pocket collapsed like my souffle.'), C('{player} WITH THE SACK!'), C('THE QB IS EATING TURF!'), L('He held it too long, Chet. Way too long.'), C('THAT IS A DRIVE KILLER!')],
  int: [C('PICKED OFF! {player} HAS IT!'), C('THAT IS A GIFT WITH A BOW ON IT!'), C('INTERCEPTED! HE IS TAKING IT BACK!'), L('He threw it right to the wrong shirt.'), C('WHAT A PICK BY {player}!'), C('THE BALL HAS NEW OWNERS!'), L('Thank you notes are in the mail.'), C('OH NO! OH YES! DEPENDING WHO YOU ARE!')],
  fumble: [C('FUMBLE! THE BALL IS LOOSE!'), C('THAT IS A FIASCO, FOLKS!'), C('BUTTERFINGERS!'), C('IT IS ON THE GROUND! SOMEBODY GRAB IT!'), L('Greased pig rules, Chet.'), C('COUGHED IT UP!'), L('Ball security. Look it up.'), C('LOOSE BALL! LOOSE BALL!')],
  recover: [C('{team} RECOVER IT!'), C('{player} FALLS ON IT!'), L('Finders keepers.')],
  pile: [C('WHO HAS IT?! THERE IS A PILE OF HUMANITY!'), L('I see a shoe. I see an elbow. A sandwich?'), C('DOG PILE! THE REF IS DIGGING!')],
  drop: [C('DROPPED! RIGHT IN THE BREADBASKET!'), L('Hands of stone, Chet. Granite.'), C('OFF THE FINGERTIPS!'), L('He had a sandwich in his other hand.'), C('HOW DID HE DROP THAT?!'), C('THE BALL BOUNCED OFF HIS FACEMASK!'), L('Catch with your hands, son.'), C('THAT IS GOING ON THE BLOOPER REEL!')],
  lateHit: [C('THE WHISTLE BLEW, FOLKS! HE DID NOT CARE!'), C('LATE HIT! AND THE REF JUST SHRUGS!'), L('Fiasco rules. No flags, no mercy.'), C('A LITTLE EXTRA FOR THE ROAD!'), L('That was after the bell, Chet.'), C('OH! HE GOT HIM AFTER THE WHISTLE!'), C('THE REF THREW HIS HAT! NOT A FLAG! HIS HAT!'), L('Somebody is getting a stern look.')],
  hotOn: [C('{player} IS BLAZING!'), C('IS IT HOT IN HERE OR IS IT JUST {player}?'), C('SOMEBODY GET A FIRE EXTINGUISHER!'), L('He is on fire, Chet. Literally.'), C('ON FIRE! {player} IS ON FIRE!'), C('HE IS HEATING UP! HE IS BLAZING!'), L('Hope that jersey is flame resistant.'), C('CALL THE FIRE DEPARTMENT!')],
  hotOff: [C('AND THE FIRE IS OUT. RESET THE SMOKE ALARMS.'), L('He cooled off. Happens to the best.'), C('THE FLAMES ARE OUT!')],
  card: [C('A FIASCO CARD! HERE COMES TROUBLE!')],
  card_ROCKET_CLEATS: [C('THOSE SHOES ARE ILLEGAL IN FOUR STATES!')], card_GLUE_GLOVES: [C('NOTHING IS GETTING LOOSE NOW!')], card_BRICK_WALL: [C('WHERE DID THEY GET THE BRICKS?!')],
  card_HOT_SAUCE: [C('HE DRANK THE WHOLE BOTTLE!')], card_MEGA_HIT: [C('SOMEBODY IS GOING TO ORBIT!')], card_BUTTERFINGERS: [C('THAT BALL IS SLICK AS A GREASED PIG!')],
  card_MASCOT_MAYHEM: [C('IS THAT {mascot} ON THE FIELD?! IT IS!')], card_SUPER_FOOT: [C('THAT LEG IS INSURED FOR A MILLION BUCKS!')],
  fiascoBreak: [C('FIASCO BREAK! EVERY DISASTER IS A CHANCE!'), L('Bad luck pays off sometimes, Chet.'), C('FROM FIASCO TO FORTUNE!')],
  fgGood: [C('IT IS GOOD! RIGHT DOWN THE PIPE!'), C('SPLIT THE UPRIGHTS!'), L('Pure. Like a church choir.')],
  fgDoink: [C('DOINK... AND IN! LUCKY, LUCKY!'), L('The post was on his side tonight.'), C('OFF THE IRON AND THROUGH!')],
  fgMiss: [C('NO GOOD! WIDE LEFT! WIDE EVERYTHING!'), L('He hooked it like a bad golfer.'), C('NO GOOD! THE KICKER IS HIDING!')],
  fgDoinkOut: [C('DOINK! OFF THE UPRIGHT! NO GOOD!'), L('So close. So very, very loud.')],
  punt: [C('BOOMING PUNT!'), L('Beautiful spiral. I would know. I never had one.'), C('HE GOT ALL OF THAT ONE!')],
  safety: [C('SAFETY! TWO POINTS AND A LOT OF SHAME!'), L('Tackled in his own end zone. Ouch.'), C('THAT IS A SAFETY!')],
  firstDown: [C('MOVE THE CHAINS!'), C('FIRST DOWN {team}!'), L('That is how you do it.'), C('NEW SET OF DOWNS!')],
  thirdLong: [C('THIRD AND A COUNTY MILE!'), L('They need a miracle. Or a map.'), C('THIRD AND LONG! BIG PLAY TIME!')],
  fourthDown: [C('FOURTH DOWN! DECISION TIME!'), L('Go for it, Gus. Live a little.')],
  redZone: [C('RED ZONE! THE CROWD IS ON ITS FEET!'), L('Smell that? That is the end zone.')],
  turnoverOnDowns: [C('TURNOVER ON DOWNS! STOPPED COLD!'), L('Gamble lost. House wins.')],
  halftime: [C('THAT IS THE HALF! {team} LEADS {score}!'), L('Time for a hot dog. Or six.')],
  final: [C('THAT IS THE BALL GAME! {team} WINS IT {score}!'), C('WHAT A FINISH! I NEED A NAP!'), L('That was no game, Chet. It was a crime scene.')],
  special_mudslide: [C('BERTHA IS BULLDOZING THROUGH!')], special_afterburner: [C('ZAP JUST BROKE THE SOUND BARRIER!')], special_snowplow: [C('AVALANCHE IS CLEARING THE ROAD!')],
  special_goldenspiral: [C('THE GOLDEN SPIRAL! YOU CANNOT TOUCH IT!')], special_seismic: [C('THAT REGISTERED ON THE RICHTER SCALE!')], special_nightvision: [L('Lumen sees in the dark, Chet. Spooky.')],
  mascot: [C('A TUMBLEWEED ON THE FIELD?! AND IT IS ON FIRE!'), C('THE MASCOT IS IN THE GAME!'), L('Somebody check his eligibility.')],
  refDown: [C('AND THE REF GOES DOWN! HE IS FINE! MOSTLY!'), L('Zebras are not built for that, Chet.')],
  lightsOut: [C('THE LIGHTS ARE OUT AT THE AFTERGLOW!'), L('Glow paint, folks. Glow paint.')],
  lightsOn: [C('AND THE LIGHTS ARE BACK!'), L('Somebody plugged it back in.')],
  incomplete: [C('INCOMPLETE. THE BALL HAD OTHER PLANS.'), L('Thrown to nobody in particular.'), C('INCOMPLETE!'), C('AND IT FALLS TO THE TURF!')],
  brokenTackle: [C('HE SHRUGGED HIM OFF LIKE A BAD HABIT!'), C('BROKEN TACKLE!'), L('Tackle him, not hug him.')],
  pancake: [C('PANCAKE! WITH SYRUP!'), L('Flat as a flapjack.')],
  touchback: [C('TOUCHBACK.'), L('Nobody wants to run that one out.')],
  twoMinute: [C('TWO MINUTES LEFT! HERE WE GO!'), L('This is where legends are made, Chet.')],
  overtime: [C('OVERTIME! NEXT SCORE WINS!'), L('Sudden death. My favorite kind.')],
  weather_rain: [L('It is raining sideways, Chet.')], weather_snow: [L('I cannot feel my microphone.')],
  idle: [L('Football is life, Chet. Running into things.'), L('I had a hot dog once. Changed my life.'), C('WHAT A NIGHT FOR FOOTBALL!'), L('My knees are older than this stadium.')],
  pat: [C('THE EXTRA POINT IS GOOD!'), L('Automatic. Mostly.')],
  twoGood: [C('TWO POINT CONVERSION! THEY GOT IT!')], twoFail: [C('NO GOOD ON THE TWO POINT TRY!')]
};
FF.data.refLines = { firstDown: 'FIRST DOWN!', td: 'TOUCHDOWN!', incomplete: 'INCOMPLETE!', spot: 'BALL IS HERE!', lateHit: '...SURE, WHY NOT.' };
FF.data.cadence = { fiascos: 'PICKLE 7! PICKLE 7! HUT!', dynasty: 'GOLD! GOLD! HUT HUT!', owls: 'LIGHTS! CAMERA! HUT!', mudhogs: 'MUD 44! MUD 44! HUT!', yetis: 'COLD! COLDER! HUT!', scrubs: 'BLUE 42! SET... HUT!' };
})();
