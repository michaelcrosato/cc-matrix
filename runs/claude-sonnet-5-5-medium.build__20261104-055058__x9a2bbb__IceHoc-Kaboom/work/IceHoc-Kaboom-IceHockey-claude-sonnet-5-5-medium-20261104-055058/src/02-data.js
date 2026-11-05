/* ---- DATA: teams, arenas, story, text ---- */
const VOICES = {
  marge: { base: 130, range: 3, speed: 7, wave: 'saw', fs: 1, gruff: .5 }, dunny: { base: 220, range: 4, speed: 10, wave: 'pulse', fs: 1, gruff: .1 },
  snipes: { base: 300, range: 4, speed: 13, wave: 'pulse', fs: 1.1, gruff: .05 }, lou: { base: 90, range: 2, speed: 6, wave: 'saw', fs: .9, gruff: .2 },
  lemmy: { base: 200, range: 5, speed: 9, wave: 'pulse', fs: 1, gruff: 0, vib: 6 }, glitter: { base: 250, range: 4, speed: 13, wave: 'saw', fs: 1.15, gruff: .1 },
  chuck: { base: 240, range: 4, speed: 15, wave: 'pulse', fs: 1.05, gruff: .1 }, moose: { base: 105, range: 3, speed: 9, wave: 'saw', fs: .95, gruff: .45 },
  ref: { base: 180, range: 2, speed: 6, wave: 'square', fs: 1, gruff: .3 }, gus: { base: 110, range: 2, speed: 5, wave: 'saw', fs: .9, gruff: .6 },
  big: { base: 120, range: 3, speed: 8, wave: 'saw', fs: .92, gruff: .3 }, gen: { base: 200, range: 4, speed: 10, wave: 'pulse', fs: 1, gruff: .15 }
};
// player: [name, nick, num, role, [spd,sht,pas,hit,fgt,hnd], hand, bulky, hair, hairColor, skin, voice]
const TEAMS = [
  { id: 'muskrats', name: 'Mukluk Falls Muskrats', abbr: 'MUK', home: { cloth: '#5a3a22', trim: '#e8b43a', pants: '#2a1a10', sock: '#5a3a22' }, away: { cloth: '#f3e6c8', trim: '#5a3a22', pants: '#5a3a22', sock: '#e8b43a' }, accent: '#e8b43a',
    skaters: [['Duncan MacPhail', 'DUNNY', 9, 'C', [4, 3, 5, 3, 2, 4], 1, 0, 'short', '#4a2a14', '#e8b890', 'dunny'], ['Priya Sandhu', 'SNIPES', 19, 'W', [5, 5, 3, 2, 2, 5], 1, 0, 'ponytail', '#141010', '#b88050', 'snipes'], ['Lou Beaudoin', 'BIG LOU', 44, 'D', [2, 4, 2, 5, 5, 2], 1, 1, 'bald', '#222', '#d8a880', 'lou']],
    goalie: ['Lemmy Kowalchuk', 'THE SIEVE', 31, [3, 4, 3], 'lemmy', 'Talks to Posts'], mask: '#e8b43a', pads: '#f3e6c8', rating: [3, 3, 3, 4] },
  { id: 'drillers', name: 'Dryfork Drillers', abbr: 'DRY', home: { cloth: '#1d1d22', trim: '#f07a1a', pants: '#101014', sock: '#f07a1a' }, away: { cloth: '#f2f2ee', trim: '#f07a1a', pants: '#1d1d22', sock: '#f07a1a' }, accent: '#f07a1a',
    skaters: [['Rig McCoy', 'RIG', 7, 'C', [3, 3, 4, 3, 3, 3], 1, 0, 'short', '#6a4a22', '#e0b090', 'gen'], ['Gusher Gomez', 'GUSHER', 15, 'W', [4, 4, 3, 2, 2, 4], 0, 0, 'spiky', '#141010', '#b88050', 'gen'], ['Drill Bit Dobbs', 'DRILL BIT', 2, 'D', [3, 2, 2, 4, 3, 2], 1, 0, 'short', '#8a5a2a', '#e8c0a0', 'big']],
    goalie: ['Derrick Okafor', 'OKAFOR', 35, [2, 3, 2], 'gen', ''], mask: '#f07a1a', pads: '#d8d8d8', rating: [3, 3, 3, 2] },
  { id: 'lumberjacks', name: 'Logjam Lumberjacks', abbr: 'LOG', home: { cloth: '#b3262a', trim: '#141414', pants: '#141414', sock: '#b3262a' }, away: { cloth: '#f3e6c8', trim: '#b3262a', pants: '#b3262a', sock: '#141414' }, accent: '#b3262a',
    skaters: [['Axel Sundqvist', 'AXEL', 10, 'C', [3, 4, 3, 3, 3, 3], 1, 0, 'long', '#c89a3a', '#e8c0a0', 'gen'], ['Sally Lindgren', 'SAWDUST', 27, 'W', [4, 4, 3, 3, 2, 4], 0, 0, 'ponytail', '#a0481c', '#e8b890', 'snipes'], ['Big Timber Thibodeau', 'BIG TIMBER', 88, 'D', [2, 3, 2, 5, 4, 2], 1, 1, 'long', '#4a2a14', '#d8a880', 'big']],
    goalie: ['Stumpy O\'Rourke', 'STUMPY', 1, [3, 4, 3], 'gen', ''], mask: '#b3262a', pads: '#f3e6c8', rating: [3, 3, 3, 3] },
  { id: 'bruisers', name: 'Grindhouse Bruise Brothers', abbr: 'GRD', home: { cloth: '#4b2a6b', trim: '#9be04a', pants: '#2a1a3a', sock: '#9be04a' }, away: { cloth: '#ecebf2', trim: '#4b2a6b', pants: '#4b2a6b', sock: '#9be04a' }, accent: '#9be04a',
    skaters: [['Rocco Bruiser', 'ROCCO', 66, 'C', [3, 3, 2, 5, 5, 2], 1, 1, 'bald', '#222', '#c89070', 'big'], ['Rollo Bruiser', 'ROLLO', 67, 'D', [3, 3, 2, 5, 5, 2], 0, 1, 'bald', '#222', '#c89070', 'big'], ['Mumbles Malone', 'MUMBLES', 12, 'W', [4, 4, 3, 2, 3, 4], 1, 0, 'spiky', '#222', '#e0b090', 'gen']],
    goalie: ['Tank Tankersley', 'TANK', 29, [3, 5, 2], 'big', ''], mask: '#9be04a', pads: '#d6d0e0', rating: [3, 3, 2, 5] },
  { id: 'marauders', name: 'Megaplex Marauders', abbr: 'MEG', home: { cloth: '#18b5b0', trim: '#e0389a', pants: '#0e5a58', sock: '#e0389a' }, away: { cloth: '#f4f4f4', trim: '#18b5b0', pants: '#e0389a', sock: '#18b5b0' }, accent: '#e0389a',
    skaters: [['Chad Glitterman', 'CHAD', 23, 'C', [4, 3, 4, 2, 1, 4], 1, 0, 'spiky', '#e8d080', '#f0c8a0', 'glitter'], ['Zoom Zhang', 'ZOOM', 8, 'W', [5, 3, 3, 2, 2, 4], 1, 0, 'short', '#141010', '#e8c090', 'snipes'], ['Promo Perkins', 'PROMO', 5, 'D', [3, 3, 3, 4, 3, 3], 0, 0, 'short', '#5a3a22', '#c89070', 'gen']],
    goalie: ['Kiosk Kingsley', 'KIOSK', 40, [4, 3, 4], 'glitter', ''], mask: '#e0389a', pads: '#f4f4f4', rating: [4, 3, 3, 4] },
  { id: 'grizzlies', name: 'Gilded Grizzlies', abbr: 'GLD', home: { cloth: '#d9a520', trim: '#141414', pants: '#141414', sock: '#141414' }, away: { cloth: '#f6f2e6', trim: '#d9a520', pants: '#141414', sock: '#d9a520' }, accent: '#ffd36a',
    skaters: [['Sterling Glitterman Jr.', 'STERLING', 1, 'C', [5, 5, 4, 3, 2, 5], 1, 0, 'long', '#e8d080', '#f0c8a0', 'glitter'], ['Silk Sullivan', 'SILK', 91, 'W', [4, 3, 5, 2, 2, 5], 1, 0, 'ponytail', '#222', '#e0b090', 'gen'], ['Brick Brickowski', 'BRICK', 55, 'D', [3, 4, 2, 5, 5, 2], 0, 1, 'bald', '#222', '#c89070', 'big']],
    goalie: ['The Vault', 'THE VAULT', 0, [5, 5, 5], 'lou', 'Boss'], mask: '#ffd36a', pads: '#d9a520', rating: [5, 4, 4, 5] }
];
const TEAM = Object.fromEntries(TEAMS.map(t => [t.id, t]));
const ARENAS = {
  icebox: { id: 'icebox', name: "The Ol' Icebox", town: 'Mukluk Falls', ambient: .62, amb: [255, 220, 170], floor: [233, 243, 251], mat: [88, 70, 56], stand: { face: 'plank', side: '#6a4a2e', top: '#8a6a44' }, boards: '#f4efe2', kick: '#e0b83a', ads: ['MUKLUK MUFFLER & TIRE', "KOWALCHUK'S PEROGIES", "BAIT 'N' BAGELS"], music: 'play', items: ['hotsauce', 'tape', 'poutine', 'boombox'], hazard: null, crowd: ['#8a3a2a', '#e8c070', '#5a7aa0'], sky: ['#1a1410', '#2a2018'], lamps: 6, weather: null },
  pond: { id: 'pond', name: 'Lake Kabonk', town: 'Kabonk Point', ambient: .5, amb: [120, 150, 230], floor: [214, 233, 244], mat: [236, 242, 250], stand: { face: 'rock', side: '#c8d4e4', top: '#f0f6ff' }, boards: '#e8f0f8', kick: '#c8d8ea', ads: [], music: 'pond', items: ['cocoa', 'tape', 'lumber', 'boombox'], hazard: 'thin', crowd: ['#c0402a', '#2a6a4a', '#4a5aa0'], sky: ['#10183a', '#3a3a6a'], lamps: 4, weather: 'snow' },
  grind: { id: 'grind', name: 'The Grindhouse', town: 'Rustbelt', ambient: .5, amb: [150, 220, 170], floor: [220, 232, 232], mat: [60, 64, 68], stand: { face: 'stone', side: '#4a4e54', top: '#62666e' }, boards: '#c8ccd0', kick: '#e0a020', ads: ['RUSTBELT SCRAP', 'IRON GUT CHILI'], music: 'grind', items: ['poutine', 'lumber', 'boombox'], hazard: 'octopus', crowd: ['#5a5a66', '#a05030', '#3a6a5a'], sky: ['#0c1210', '#1c2824'], lamps: 5, weather: null },
  mall: { id: 'mall', name: 'MegaMall Ice Palace', town: 'Megaplex', ambient: .7, amb: [255, 190, 240], floor: [236, 240, 252], mat: [200, 190, 210], stand: { face: 'plaster', side: '#e8d8f0', top: '#f4ecf8' }, boards: '#f8f0fa', kick: '#18b5b0', ads: ['GLITTERMAN MEGAPLEX - COMING SOON!', 'SALE! SALE! SALE!', 'FOOD COURT'], music: 'mall', items: ['hotsauce', 'tape', 'poutine', 'lumber', 'brick', 'boombox'], hazard: 'mascot', crowd: ['#e0389a', '#18b5b0', '#f0e060'], sky: ['#2a1a3a', '#4a2a5a'], lamps: 6, weather: null },
  dome: { id: 'dome', name: 'The Kaboom Dome', town: 'Capital City', ambient: .55, amb: [200, 210, 255], floor: [238, 246, 255], mat: [30, 28, 40], stand: { face: 'stone', side: '#2a2a3a', top: '#ffd36a' }, boards: '#f6f2e6', kick: '#ffd36a', ads: ['KABOOM CUP', 'GILDED', 'SYNERGY!'], music: 'final', items: ['hotsauce', 'brick', 'boombox'], hazard: 'octopus-rare', crowd: ['#d9a520', '#f6f2e6', '#8a3030'], sky: ['#080810', '#1a1030'], lamps: 8, weather: null }
};
const ARENA_LIST = ['icebox', 'pond', 'grind', 'mall', 'dome'];
const ITEMS = {
  hotsauce: { name: 'HOT SAUCE', color: '#ff4a2a', dur: 8, desc: 'Infinite turbo' }, tape: { name: "GRANDMA'S TAPE", color: '#f4f4f0', dur: 10, desc: 'Sticky puck' },
  poutine: { name: 'POUTINE', color: '#e8b860', dur: 10, desc: 'Unstoppable checks' }, lumber: { name: 'LUMBER', color: '#ffd020', dur: 30, desc: 'Next 3 shots +30%' },
  brick: { name: 'BRICK PADS', color: '#c0502a', dur: 12, desc: 'Goalie grows' }, boombox: { name: 'BOOM BOX', color: '#e060ff', dur: 0, desc: '+40 BOOM' }, cocoa: { name: 'HOT COCOA', color: '#a0643a', dur: 8, desc: 'Turbo + speed' }
};
// ----- story -----
const STORY = {
  chapters: [
    { id: 1, title: 'Home Opener', arena: 'icebox', rival: 'drillers', set: 'locker', periods: 3, len: 90, ot: true, tactic: ['Clean and fast', 'Mean and loud'], tacticKey: ['finesse', 'grit'],
      blurb: 'Skating, passing, shooting, one-timers and checks. Save the Icebox.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'onetimer', text: 'Score a one-timer' }, { id: 'bighits', text: 'Land 3 big hits', need: 3 }],
      pre: [['MARGE', 'Sit down, shut up, and listen. I got a letter.'], ['MARGE', 'Goldie Glitterman bought the land under the Icebox. Wants to pave it for a {c=#ffd36a}Megaplex Parking Experience{/c}.'], ['DUNNY', 'A parking... experience? Beauty. Wait. No. Not beauty.'], ['SNIPES', "This barn's got more character than his whole bank account. And his haircut."], ['MARGE', 'Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever. So we win the Cup.'], ['LOU', 'Five games, then. Like the five petals of the wild rose.'], ['LEMMY', "Pipesy says we win. Clang's not so sure. Clang's a pessimist."], ['GLITTERMAN', "Enjoy the barn, folks. I've ordered the parking meters. Gold ones."], ['MARGE', "Captain. Tell 'em how we play tonight."]],
      tacticLine: ['keep it clean and fast. Tape to tape!', 'hit everything that moves. And some stuff that does not!'],
      post: [['CHUCK', "The Muskrats take the opener! The Icebox is ROCKIN'!"], ['GLITTERMAN', 'Beginner\'s luck. The meters are still on order.'], ['MARGE', 'Pack your long johns. Lake Kabonk. Pond rules.']] },
    { id: 2, title: 'Pond Rules', arena: 'pond', rival: 'lumberjacks', set: 'bonfire', periods: 3, len: 90, ot: true, tactic: ['Clean and fast', 'Mean and loud'], tacticKey: ['finesse', 'grit'],
      blurb: 'KABOOM mode, power-ups, thin ice and snowbanks.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'ice', text: 'Break the ice under a Lumberjack' }, { id: 'kaboom', text: 'Trigger KABOOM' }],
      pre: [['BIG TIMBER', "Welcome to the woods, Muskrats. We don't check. We FELL."], ['SNIPES', 'Cute beard. Did you grow it, or did a beaver move in?'], ['LEMMY', "The ice is talking. It says 'crack'."], ['MARGE', 'Thin ice is a tool. Hit \'em where it\'s thin.'], ['MARGE', "And listen. When the whole team's hummin' - hits, passes, the crowd losin' its mind - the ice starts to shake. That's a KABOOM. Fill the meter and let it rip."], ['LOU', 'Like thunder in a teacup.'], ['MARGE', 'Captain. Same question.']],
      tacticLine: ['keep it clean and fast. Tape to tape!', 'hit everything that moves. And some stuff that does not!'],
      post: [['BIG TIMBER', 'You hit like a falling spruce. Good on ya.'], ['DUNNY', 'Thanks! You smell like one!'], ['MARGE', 'Next stop, the Grindhouse. Bring a mouthguard. Bring two.']] },
    { id: 3, title: 'Gloves Off', arena: 'grind', rival: 'bruisers', set: 'dim', periods: 3, len: 90, ot: true, tactic: ['Let Lou loose', 'Keep it on the ice'], tacticKey: ['lou', 'lou2'],
      blurb: 'Fights, the sin bin, power plays, octopi and chirps.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'fights', text: 'Win 2 fights', need: 2 }, { id: 'ppgoal', text: 'Score a power-play goal' }],
      pre: [['ROCCO', 'Well, well. Lou Beaudoin.'], ['ROLLO', "Lou 'The Library' Beaudoin."], ['ROCCO', 'Heard you knit now.'], ['ROLLO', 'Heard you purl.'], ['LOU', 'I have retired from fisticuffs, gentlemen.'], ['MARGE', 'Retire after the game.'], ['MARGE', "In this barn they drop the gloves, you drop 'em back. Win the scrap, win the barn. Lose it, you sit in the sin bin and think about your choices."], ['MARGE', 'Captain. What about Lou?']],
      tacticLine: ['let Lou loose. Fists are a language!', 'keep it on the ice. Lou can knit later!'],
      post: [['ROLLO', 'He knitted me a scarf.'], ['ROCCO', 'For my neck.'], ['ROLLO', 'Which he bruised.'], ['LOU', 'There is an ice pack in the pocket.'], ['MARGE', 'Next, the Megaplex. Glitterman\'s turf. Watch your wallets.']] },
    { id: 4, title: 'Mall Brawl', arena: 'mall', rival: 'marauders', set: 'neon', periods: 3, len: 90, ot: false, tactic: ['Ignore the bear', 'Hunt the bear'], tacticKey: ['ignore', 'hunt'],
      blurb: 'Polar Pete, the Discount Drop, and the Shootout Showcase.',
      objectives: [{ id: 'win', text: 'Win the game' }, { id: 'kaboomgoal', text: 'Score a KABOOM goal' }, { id: 'pete', text: 'Knock down Polar Pete' }],
      pre: [["CHAD", "What's up, Mall Rats! Smash that glass, bro!"], ['DUNNY', "We're Muskrats."], ['CHAD', 'Same content, bro.'], ['GLITTERMAN', 'Name your price, goalie.'], ['LEMMY', "...Pipesy says no. Clang says no with a curse word."], ['POLAR PETE', '(a dance, and a muffled babble)'], ['MARGE', "That bear's on the ice all game. Treat him like furniture."], ['MARGE', "And win or tie, the mall's got a Shootout Showcase after. Mall money. We want it."]],
      tacticLine: ['ignore the bear. Furniture!', 'hunt the bear. For science!'],
      post: [['GLITTERMAN', 'Fine. The Final. My Grizzlies. My Dome. My rules.'], ['SNIPES', "Your Dome's gonna need a new roof."]] },
    { id: 5, title: 'The Kaboom Cup', arena: 'dome', rival: 'grizzlies', set: 'tunnel', periods: 3, len: 120, ot: true, tactic: ['Doris plays early', 'Doris plays late'], tacticKey: ['doris1', 'doris2'],
      blurb: 'The boss: Sterling, The Vault, Gilded Mode and the organ.',
      objectives: [{ id: 'win', text: 'Win the Cup' }, { id: 'vaultdeke', text: 'Beat The Vault with a deke goal' }, { id: 'hat', text: 'One player scores a hat trick' }],
      pre: [['STERLING', "I've never lost. Not once. Not even at Go Fish."], ['SNIPES', "There's a first time for everything, Goldilocks."], ['THE VAULT', '...'], ['LEMMY', "He's very big, Pipesy."], ['MARGE', "Forty-six years behind that bench. I've seen better teams. Prettier teams. Teams that could spell."], ['MARGE', 'Never saw one that wanted it more. Go make it go KABOOM.'], ['MARGE', 'And Doris? When should she play?']],
      tacticLine: ['let Doris play early!', 'let Doris play late. Bigger finish!'],
      post: [['CHUCK', 'THE KABOOM CUP IS... KA-BOOMING!'], ['GLITTERMAN', 'My parking meters...'], ['MARGE', 'Bylaw 1897-B, Goldie. Look it up.'], ['GUS', 'Yep.'], ['MARGE', 'Same time next year.']] }
  ],
  pep: ['Chin up. We lost a hockey game, not a leg. Back out there!', 'Pond ice is cruel. So is the lumber. Go again!', 'You got dropped? Good. Learn to fall. Then learn to get up!', "The mall wins on points, we win on heart. Try again, Muskrat.", "Forty-six years, kid. I've lost harder. Skate it off!"],
  unlocks: [[3, 'Big Heads'], [6, 'Octopus Rain'], [9, 'Glow Puck'], [12, 'Always KABOOM'], [15, 'Retro Rigs']]
};
const DRILLS = [
  { id: 1, name: 'Wheels', teach: 'Skate through the gates in order. Use turbo, then hockey-stop at the last one.', need: 6, goal: 'gates' },
  { id: 2, name: 'Tape to Tape', teach: 'Complete 5 passes to moving teammates, then a saucer over the sled.', need: 6, goal: 'passes' },
  { id: 3, name: 'Top Shelf', teach: 'Hit the 4 corner targets on the empty net. Hold shoot for a slapshot.', need: 4, goal: 'targets' },
  { id: 4, name: 'One-Timers', teach: "Score 3 one-timers on Lemmy off Dunny's cross-crease feeds. Press shoot as the pass arrives.", need: 3, goal: 'onetimers' },
  { id: 5, name: 'Finish Your Check', teach: 'Big-hit 3 dummies into the glass. Turbo helps.', need: 3, goal: 'dummies' },
  { id: 6, name: 'Gloves Off', teach: 'Win a spar with Big Lou. He goes easy. Jab, haymaker, duck, yank.', need: 1, goal: 'spar' },
  { id: 7, name: 'KABOOM!', teach: 'With a full meter, score with a KABOOM shot.', need: 1, goal: 'kaboom' }
];
const TEXT = {
  talk: {
    goal: ['{name} puts it home! GOAL for {team}!', 'HE SCORES! {name} with the {shot}!', 'Top shelf, where mama hides the cookies! {name}!', 'It is in! {team} lead {score}!', '{name} finds twine! The horn is deafening!', 'Oh baby! {name}, from the slot!'],
    save: ['Big stop by {goalie}!', '{goalie} says NOT TODAY!', 'Robbed! {goalie} with the glove!', 'The pad save, and a rebound!', '{goalie} stands on his head!'],
    post: ['PING! Off the iron!', 'That one rang the post like a church bell!', 'So close! The post says no!', 'Off the pipe! Oh my!'],
    hit: ['{name} lays him out! BIG HIT!', 'He did not see that coming! {name}!', 'Boom! {name} with the clean check!', 'Somebody call the Zamboni, there is a skater to pick up!', 'That one registered on the Richter scale!'],
    glass: ['THROUGH THE GLASS! Somebody call a handyman!', 'The glass is gone! Shattered!', 'And that panel is retired for the season!', 'Glass everywhere, folks!'],
    kaboom: ['KA-BOOM! {team} go nuclear!', 'The meter is full! It is KABOOM time!', 'Everybody off the ice, {team} are on FIRE!'],
    kaboomshot: ['The fireball slapshot! Look out!', 'That puck is on fire! Literally!', 'Somebody get the goalie a fire extinguisher!'],
    blast: ['{goalie} goes into his own net! Puck AND goalie!', 'Blasted! Goalie and all!'],
    fight: ['The gloves are off! {name} and {victim} drop them!', 'Here we go! {name} wants a word with {victim}!', 'We have a scrap, folks!'],
    fightend: ['{name} wins that one by a mile!', 'And that is a decision! {name} takes it!', 'Down goes {victim}! To the sin bin!'],
    powerplay: ['Power play for {team}!', 'A man advantage and a full head of steam!'],
    hat: ['HAT TRICK! The hats are coming down!', '{name} with the hat trick! Pick up the hats!'],
    period: ['End of the {period} period. {score}.', 'That is the horn! {score} after {period}.'],
    final: ['That is the game! {team} win it, {score}!', 'FINAL! {team} take it {score}!'],
    item: ['A fan throws something onto the ice!', 'Look out, a gift from the crowd!', 'The crowd is feeling generous!'],
    octopus: ['An octopus! You love to see it!', 'Somebody threw a squid on the ice. Tradition!'],
    deke: ['What a move by {name}! He leaves him in the dust!', 'Dangle city! {name} makes him look silly!'],
    onetimer: ['One-timer! Cannon from {name}!', 'Tape to tape and BANG, a one-timer!'],
    faceoff: ['Puck drop at {arena}.', 'We are set to go. Here is the faceoff.'],
    flood: ['Time for the Flood Wagon! Old Gus at the wheel!', 'The ice gets a bath. Here comes the wagon!'],
    mascot: ['MASCOT DOWN! Polar Pete is out cold!', 'Somebody check on the bear!'],
    ice: ['The ice cracks! Down goes the skater in the water!', 'Thin ice! Frozen solid, that one!'],
    shootout: ['Shootout time! Ice in the veins!', 'One on one. Nowhere to hide.'],
    filler: ['Moose: I once ate a puck on a bet. Do not recommend.', 'Moose: My uncle played goal with no mask. We do not speak of his face.', 'Moose: Best hockey advice I ever got? Keep your stick on the ice.', 'Moose: Cold? This is nothing. In my day the ice was uphill both ways.', 'Moose: Never trust a goalie who talks to the posts. Unless it works.', 'Moose: They call this the Biscuit. I call it Thursday.']
  },
  chirps: ['Nice hands. For a lobster!', 'You skate like my grandma. She is faster!', 'Is that a stick or a baguette?', 'Your mother called. She wants her puck back!', 'Careful, you might trip on that blue line!', 'Nice save. Wait, that was a goal!', 'I have seen faster glaciers!', 'You hit like a wet noodle!', 'Hey ref, he is breathing on me!', 'Skate harder, I am getting bored!', 'My stick has more goals than you!', 'Pretty good for a beginner!', 'Do you need a map to the net?', 'That helmet looks heavy!', 'Eat my snow!'],
  tips: { skate: 'Hold {turbo} for turbo. Pull the stick the other way to hockey-stop.', pass: 'Press {pass} to pass. Aim with the stick or the mouse.', shoot: 'Tap {shoot} for a wrist shot. Hold it for a slapshot, release to fire.', check: 'Without the puck, {shoot} is a body check. Hit fast, hit hard.', onetimer: 'Press {shoot} just as a pass arrives for a ONE-TIMER.', deke: '{deke} with the puck is a deke. Without it, a poke check.', saucer: '{lob} throws a saucer pass over sticks.', gloves: 'Hold {lob} near a rival you have a grudge with to drop the gloves.', kaboom: 'The BOOM meter is full! Hold a slapshot for a KABOOM shot!', glass: 'Hit them fast into the glass to crack, then shatter it.', switch: '{switch} or {pass} switches your skater. {pass} calls for a pass.', chirp: '{chirp} chirps the nearest rival. Chirps build BOOM and grudges.', item: 'Walk over items thrown by fans to grab them.', flood: 'Steer the Flood Wagon over the scuffed ice. Hold {turbo} for gas.' },
  stars: ['The first star of the game!', 'Second star, and a heck of a night!', 'Third star, still a good night!', 'Absolute clinic!', 'What a performance!'],
  loser: ['Hang your heads, but only for a second.', 'There is always next game.']
};
const SETDEF = ['locker', 'bonfire', 'dim', 'neon', 'tunnel'];
