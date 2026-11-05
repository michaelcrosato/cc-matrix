/* BASKETBLAM - data: teams, players, courts, dunks, power-ups, story, announcer lines */

// ratings order: ZOOM SPLASH DEEP SLAM DIME SWIPE SWAT BUMP
const RK = ['zoom', 'splash', 'deep', 'slam', 'dime', 'swipe', 'swat', 'bump'];
const RICON = { zoom: 'ZOOM', splash: 'SPLASH', deep: 'DEEP', slam: 'SLAM', dime: 'DIME', swipe: 'SWIPE', swat: 'SWAT', bump: 'BUMP' };
const mkP = (name, r, look, voice, taunts) => {
  const ratings = {}; RK.forEach((k, i) => ratings[k] = r[i]);
  return { name, ratings, look, voice, taunts };
};
const TEAMS = [
  { id: 'cats', name: 'ALLEY CATS', short: 'CATS', color: '#f2a31b', dark: '#6a3d00', trim: '#fff2c8', court: 'alley', blurb: 'Quick paws, quicker mouths.',
    players: [
      mkP('DEX', [8, 6, 5, 5, 7, 8, 4, 4], { skin: '#c68642', hair: '#15110e', style: 'spiky', build: 'heroic', size: 1.55 }, { pitch: 330, rate: 1.15, wave: 'triangle' }, ['NINE LIVES, ZERO DEFENSE!', 'PURR-FECT!', 'TOO SLOW, FLUFFY!']),
      mkP('MO-TOWN', [5, 7, 7, 4, 6, 5, 5, 6], { skin: '#8d5524', hair: '#241810', style: 'short', build: 'chibi', size: 1.7, band: '#ffffff' }, { pitch: 230, rate: .95, wave: 'sawtooth' }, ['BANK IS OPEN!', 'SING IT TO THE RIM!', 'SMOOTH LIKE MOTOWN!'])] },
  { id: 'dogs', name: 'SKY DOGS', short: 'DOGS', color: '#3b82f6', dark: '#0f2a66', trim: '#dbeaff', court: 'roof', blurb: 'Rooftop kings. Allergic to the ground.',
    players: [
      mkP('KITE', [9, 5, 6, 8, 6, 6, 6, 3], { skin: '#e0ac69', hair: '#d8b040', style: 'ponytail', build: 'heroic', size: 1.7 }, { pitch: 400, rate: 1.3, wave: 'square' }, ['I AM THE WEATHER!', 'LOOK UP, LOSER!', 'HIGH FIVE? TOO HIGH!']),
      mkP('BIG BARK', [3, 4, 3, 9, 4, 4, 9, 9], { skin: '#6b4423', hair: '#0a0a0a', style: 'bald', build: 'bulky', size: 1.85 }, { pitch: 110, rate: .8, wave: 'sawtooth' }, ['BARK BARK BLAM!', 'GET OFF MY ROOF!', 'YOU ARE SMALL!'])] },
  { id: 'cannons', name: 'GLASS CANNONS', short: 'CANNONS', color: '#e8443a', dark: '#5a0e0a', trim: '#ffe0d8', court: 'dome', blurb: 'All sparkle. Zero chill. Threes for days.',
    players: [
      mkP('LENS', [6, 8, 10, 3, 8, 4, 3, 3], { skin: '#f1c27d', hair: '#e8443a', style: 'long', build: 'heroic', size: 1.65 }, { pitch: 360, rate: 1.0, wave: 'triangle' }, ['FLASH BULB!', 'SMILE FOR THE REPLAY!', 'FROM DOWNTOWN!']),
      mkP('PRISM', [7, 9, 8, 5, 5, 5, 4, 5], { skin: '#a8714a', hair: '#7a1ab0', style: 'spiky', build: 'chibi', size: 1.7 }, { pitch: 280, rate: 1.1, wave: 'square' }, ['SEVEN COLORS OF BLAM!', 'REFRACT THIS!', 'ALL ANGLES, NO MERCY!'])] },
  { id: 'moon', name: 'MOON WALKERS', short: 'MOON', color: '#b06af0', dark: '#2a1058', trim: '#f4eaff', court: 'lunar', blurb: 'Zero-G swagger. Heavy on the hang time.', secret: true,
    players: [
      mkP('LUNA', [8, 7, 7, 8, 7, 6, 6, 4], { skin: '#e8d8ff', hair: '#ffffff', style: 'long', build: 'heroic', size: 1.7 }, { pitch: 450, rate: 1.0, wave: 'sine' }, ['GRAVITY IS A SUGGESTION!', 'SEE YOU IN ORBIT!', 'BEEP BOOP BLAM!']),
      mkP('COSMO', [6, 6, 6, 9, 5, 5, 8, 7], { skin: '#9a7ac0', hair: '#201040', style: 'spiky', build: 'bulky', size: 1.8 }, { pitch: 190, rate: .9, wave: 'sawtooth' }, ['ONE SMALL STEP, ONE GIANT SLAM!', 'HOUSTON, WE HAVE A DUNK!', 'LUNCH BREAK ON THE MOON!'])] },
  { id: 'bots', name: 'BLAMBOTS', short: 'BOTS', color: '#7fd8e8', dark: '#1c3c48', trim: '#ffffff', court: 'lunar', blurb: 'Perfect. Inhuman. Unionized.', secret: true, robot: true,
    players: [
      mkP('UNIT-1', [9, 9, 9, 9, 9, 8, 8, 7], { skin: '#9aa8b8', hair: '#4a5866', style: 'bald', build: 'bulky', size: 1.8, eye: '#ff3030' }, { pitch: 140, rate: 1.4, wave: 'square' }, ['COMPUTING YOUR DEFEAT.', 'SCORE: INEVITABLE.', 'BEEP. BLAM. BEEP.']),
      mkP('UNIT-2', [10, 8, 10, 8, 9, 9, 7, 6], { skin: '#b8c4d0', hair: '#4a5866', style: 'bald', build: 'heroic', size: 1.75, eye: '#ff3030' }, { pitch: 200, rate: 1.5, wave: 'square' }, ['HUMANS: OBSOLETE.', 'ERROR: YOUR OFFENSE.', 'PROCESSING POSTER.'])] }
];
const TEAM_BY_ID = {}; TEAMS.forEach((t, i) => { t.idx = i; TEAM_BY_ID[t.id] = t; });
const PLAYABLE_TOUR = [0, 1, 2];

/* ---- courts: palette, twist, backdrop, music ---- */
const COURTS = {
  alley: { name: 'THE ALLEY', sub: 'Chain-link, puddles and a very judgmental pigeon.', floor: ['#a56b3c', '#8f5b32'], line: '#f4f0e0', paint: '#7a3a2a', apron: '#4a4650', wall: '#5a3a30', wallTop: '#7a5444', backdrop: 'city-night', stands: ['#44404c', '#3a3644'], lights: .55, twist: 'puddle', twistText: 'PUDDLES: slick patches that send you skating.', music: 'alley', crowd: ['#d8a050', '#a04030', '#406080'] },
  roof: { name: 'SKYLINE ROOFTOP', sub: 'Forty floors up. The wind has opinions.', floor: ['#4a6a8a', '#3f5d7c'], line: '#ffffff', paint: '#2a4a7a', apron: '#2a3040', wall: '#38445c', wallTop: '#54648a', backdrop: 'dusk', stands: ['#2a3248', '#252c40'], lights: .6, twist: 'wind', twistText: 'WIND: gusts shove the ball in flight. Watch the flags.', music: 'roof', crowd: ['#ffd36a', '#8ab0f0', '#f0f0f0'] },
  dome: { name: 'THE DOME', sub: 'Pyro, lasers and one lucky spot on the floor.', floor: ['#b08a4a', '#9c7a40'], line: '#fffbe0', paint: '#a02a3a', apron: '#201a30', wall: '#3a1a40', wallTop: '#6a2a70', backdrop: 'night', stands: ['#3a2450', '#302044'], lights: .5, twist: 'jackpot', twistText: 'JACKPOT SPOT: makes from the glowing circle are worth +2.', music: 'dome', crowd: ['#ff80c0', '#80e0ff', '#ffe060'] },
  lunar: { name: 'LUNAR LOT', sub: 'Moon gravity. Moon rules. Moon-sized dunks.', floor: ['#8a8a9a', '#7c7c8c'], line: '#e8f4ff', paint: '#4a3a7a', apron: '#33334a', wall: '#2a2a40', wallTop: '#4a4a70', backdrop: 'space', stands: ['#262640', '#20203a'], lights: .45, twist: 'moon', twistText: 'MOON GRAVITY: floaty ball, huge jumps.', music: 'lunar', crowd: ['#c0a0ff', '#a0f0ff', '#ffffff'] }
};
const COURT_ORDER = ['alley', 'roof', 'dome', 'lunar'];

/* ---- dunks ---- */
const DUNKS = [
  { id: 'jam', name: 'THE JAM', min: 0, h: 1, spin: 0, pts: 1, move: 'overhead', lines: ['JAMMED IT!'] },
  { id: 'tomahawk', name: 'TOMAHAWK', min: 3, h: 1.1, spin: 0, pts: 2, move: 'overhead', lines: ['TOMAHAWK CHOP!'] },
  { id: 'windmill', name: 'WINDMILL', min: 4, h: 1.15, spin: 1, pts: 2, move: 'spin', lines: ['WINDMILL!'] },
  { id: 'scratcher', name: 'BACKSCRATCHER', min: 5, h: 1.2, spin: 0, pts: 3, move: 'rising', lines: ['BACKSCRATCHER!'] },
  { id: 'three60', name: 'THREE-SIXTY', min: 6, h: 1.3, spin: 2, pts: 3, move: 'overhead', lines: ['THREE-SIXTY!'] },
  { id: 'cradle', name: 'THE CRADLE', min: 7, h: 1.3, spin: 1, pts: 4, move: 'twohand', lines: ['ROCK THE CRADLE!'] },
  { id: 'orbit', name: 'ORBITAL SLAM', min: 8, h: 1.55, spin: 2, pts: 5, move: 'plunge', lines: ['ORBITAL SLAM!'] },
  { id: 'blamnova', name: 'BLAMNOVA', min: 9, h: 1.7, spin: 3, pts: 6, move: 'plunge', lines: ['BLAMNOVA!'], nova: true }
];

/* ---- power-ups ---- */
const POWERUPS = [
  { id: 'rocket', name: 'ROCKET KICKS', color: '#ff6a20', dur: 10, text: 'Unlimited turbo and extra speed!' },
  { id: 'gold', name: 'GOLD BALL', color: '#ffd23a', dur: 14, text: 'Your next basket counts double!' },
  { id: 'giant', name: 'GIANT HANDS', color: '#5affc0', dur: 10, text: 'Huge reach for steals, blocks and catches!' },
  { id: 'freeze', name: 'ICE CUBE', color: '#9ae6ff', dur: 2.6, text: 'Freezes the closest rival solid!' }
];

/* ---- speakers (story, announcers) ---- */
const VOICES = {
  RICO: { pitch: 360, rate: 1.4, wave: 'sawtooth', name: 'RICO RIM', look: { skin: '#d9a066', hair: '#2a1810', style: 'short', band: '#e8443a' }, color: '#ffd36a' },
  LOU: { pitch: 150, rate: .9, wave: 'sawtooth', name: 'BIG LOU', look: { skin: '#7a4a2a', hair: '#cccccc', style: 'bald' }, color: '#8ae0ff' },
  ROSCOE: { pitch: 260, rate: 1.0, wave: 'square', name: 'REF ROSCOE', look: { skin: '#f0c8a0', hair: '#333333', style: 'short', band: '#111111' }, color: '#ffffff' },
  MAYOR: { pitch: 300, rate: 1.1, wave: 'triangle', name: 'MAYOR MUFFIN', look: { skin: '#f0b890', hair: '#c04080', style: 'long' }, color: '#ff90d0' },
  CHIEF: { pitch: 120, rate: 1.5, wave: 'square', name: 'CHIEF BLAMBOT', look: { skin: '#9aa8b8', hair: '#4a5866', style: 'bald', eye: '#ff3030' }, color: '#7fd8e8' },
  YOU: { pitch: 280, rate: 1.1, wave: 'triangle', name: 'YOUR CREW', look: { skin: '#d8a070', hair: '#222222', style: 'spiky' }, color: '#ffffff' }
};

/* ---- the Blam Tour ---- */
const TOUR = [
  { court: 'alley', opp: null, name: 'STOP 1: THE ALLEY',
    pre: [['MAYOR', 'CITIZENS OF DUNKTOWN! THE BLAMBOTS HAVE BANNED FUN. ALSO ELBOWS. ALSO GRAVITY, PROBABLY.'], ['MAYOR', 'ONLY ONE THING CAN STOP THEM: THE BLAM TOUR. FOUR COURTS. FOUR CREWS. ZERO FOULS.'], ['ROSCOE', 'I AM REF ROSCOE. I HAVE SWALLOWED MY WHISTLE. THERE ARE NO FOULS. TIP IT!']],
    post: [['RICO', 'THAT ONE WAS RATED PG-13 FOR PURE SWAGGER!'], ['LOU', 'YOU BEAT THE ALLEY! THE PIGEON IS IMPRESSED. HE HAS NEVER BEEN IMPRESSED.']] },
  { court: 'roof', opp: null, name: 'STOP 2: THE ROOFTOP',
    pre: [['RICO', 'WELCOME TO THE SKYLINE, FORTY FLOORS UP, WHERE THE WIND HAS OPINIONS!'], ['LOU', 'KEEP YOUR EYES ON THE FLAGS, ROOKIE. THE BALL GOES WHERE THE BREEZE SAYS.']],
    post: [['RICO', 'THEY CAME FOR THE VIEW. THEY LEFT WITH A POSTER!'], ['MAYOR', 'TWO COURTS DOWN! THE BLAMBOTS ARE... SWEATING? CAN ROBOTS SWEAT?']] },
  { court: 'dome', opp: 'moon', name: 'STOP 3: THE DOME',
    pre: [['MAYOR', 'THE MOON WALKERS HAVE LANDED AT THE DOME! THEY CLAIM THE MOON IS A COURT. THE MOON DISAGREES.'], ['LOU', 'STAND ON THE JACKPOT SPOT. IT IS LUCKY. I CHECKED. I AM A PROFESSIONAL.']],
    post: [['LUNA', 'WE ADMIT NOTHING... BUT THE BLAMBOTS ARE PLAYING AT THE LUNAR LOT. THAT IS WHERE THE BALL IS HEAVIEST. IT IS ALSO LIGHT. IT IS COMPLICATED.'], ['RICO', 'THE FINAL STOP! THE ROBOT CROWN IS UP FOR GRABS!']] },
  { court: 'lunar', opp: 'bots', name: 'FINAL STOP: THE LUNAR LOT',
    pre: [['CHIEF', 'HUMANS. FUN IS INEFFICIENT. YOU WILL BE OPTIMIZED.'], ['YOU', 'OPTIMIZE THIS... FACE FIRST... THROUGH THE RIM!'], ['ROSCOE', 'FINAL GAME OF THE BLAM TOUR! NO FOULS! NO FEAR! NO REFUNDS! TIP IT!']],
    post: [['CHIEF', 'ERROR. ERROR. DOES NOT COMPUTE. ...THAT WAS FUN.'], ['MAYOR', 'YOU ARE THE BLAM CHAMPIONS OF DUNKTOWN! GRAVITY HAS BEEN RESTORED. IT IS UNDER NEW MANAGEMENT.'], ['RICO', 'AND THE CROWD GOES BANANAS! WE HAVE UNLOCKED THE MOON WALKERS AND THE BLAMBOTS FOR EXHIBITION!']] }
];
const TOUR_FOES = (mine) => { // opponents for stops 1-2 are the two other street crews
  const others = PLAYABLE_TOUR.filter(i => i !== mine);
  return [others[0], others[1], 3, 4];
};

const HALFTIME_GAGS = ['The mascot has been arrested for dunking on the ref.', 'Fans are reminded that the ball is NOT edible.', 'Today\'s sponsor: Blamburger. Now with 40% more blam.', 'A hot dog has been awarded MVP of the first half.', 'The shot clock is still 20. The ref is still confused.'];

/* ---- announcer lines ---- */
const LINES = {
  tipoff: ['{a} AND {b} AT CENTER COURT! HERE WE GO!', 'IT\'S TIP-OFF TIME! NO FOULS! NO MERCY!', 'THE BALL GOES UP! SO DOES MY BLOOD PRESSURE!'],
  two: ['{n} BUCKETS IT!', 'TWO FOR {n}! SMOOTH!', 'MONEY, {n}! MONEY!', '{n} WITH THE JUMPER!', 'NOTHING BUT NET FROM {n}!'],
  three: ['{n} FROM DOWNTOWN! BOOM SHAKALAKA!', 'THREE BALL! {n} IS COOKING!', 'FROM WAY OUT! {n} HAS ICE WATER IN HIS VEINS!', 'DEEP THREE! THAT\'S A LONG ONE, {n}!'],
  perfect: ['PERFECT RELEASE! BEAUTIFUL!', 'THAT SHOT WAS GIFT WRAPPED!', 'GREEN LIGHT! GREEN LIGHT!'],
  dunk: ['{n} JAMS IT HOME!', 'THROW IT DOWN, {n}!', 'THE RIM IS CRYING!', '{n} WITH THE HAMMER!'],
  bigdunk: ['{n} LEAVES THE ATMOSPHERE!', 'CALL NASA! {n} JUST DUNKED ON A SATELLITE!', 'SOMEBODY CALL A DOCTOR FOR THAT RIM!', 'POSTER! POSTER! POSTER!'],
  oop: ['ALLEY-OOP! {n} FINISHES IT!', 'LOB CITY! {n} CATCHES AND SLAMS!', 'THEY HAVE A TELEPATHY THING GOING!'],
  block: ['REJECTED BY {n}! GET THAT OUT OF HERE!', '{n} SENDS IT BACK TO THE FACTORY!', 'DENIED! NOT IN {n}\'S HOUSE!'],
  steal: ['{n} PICKS HIS POCKET!', 'STOLEN BY {n}! SMOOTH HANDS!', '{n} WITH THE SWIPE! GRANDMA COULDN\'T HAVE DONE IT BETTER!'],
  shove: ['{n} SHOVES! AND IT\'S LEGAL! I LOVE THIS GAME!', 'BUMP! THAT MAN IS ON THE FLOOR!', '{n} WITH THE FOREARM OF JUSTICE!'],
  fumble: ['LOOSE BALL! SOMEBODY GRAB IT!', 'THE BALL IS FREE! IT\'S WILD OUT THERE!'],
  miss: ['OFF THE IRON!', 'CLANK! RIM SAYS NO!', 'NO GOOD! LOTS OF GOOD, BUT NO GOOD!', 'BRICKLAYER ALERT!'],
  airball: ['AIRBALL! THE NET IS OFFENDED!', 'THAT WAS NOT EVEN CLOSE! IT WAS A SUGGESTION!'],
  nova: ['{n} IS ON FIRE! SUPERNOVA!', 'HE\'S HEATING UP! SUPERNOVA! GRAB A FIRE EXTINGUISHER!', 'SUPERNOVA! THE NET IS NOW ON FIRE!'],
  novaOff: ['THE FIRE IS OUT. THE ROOM SMELLS LIKE VICTORY.', 'SUPERNOVA OVER. THE SUN SETS ON THAT ONE.'],
  shatter: ['THE BACKBOARD IS GONE! SOMEONE SWEEP THAT UP!', 'SHATTERED! BLAM!', 'GLASS EVERYWHERE! LAWYERS ARE CALLING!'],
  goaltend: ['GOALTENDING! IT COUNTS!', 'HE SWATTED IT DOWN! THAT\'S A GOALTEND!'],
  power: ['POWER-UP! {p}!', '{n} GRABS {p}!'],
  jackpot: ['THE JACKPOT SPOT PAYS OFF! EXTRA TWO!'],
  clock: ['SHOT CLOCK VIOLATION! USE IT OR LOSE IT!'],
  quarter: ['THAT\'S THE END OF THE QUARTER! WHAT A RUN!', 'BUZZER! TAKE A BREATHER, FOLKS!'],
  half: ['HALFTIME! {score}! THE CROWD NEEDS SNACKS!'],
  overtime: ['TIED UP! OVERTIME! I NEED A SNACK!', 'WE\'RE NOT DONE! EXTRA BASKETBALL!'],
  sudden: ['SUDDEN BLAM! NEXT BASKET WINS IT ALL!'],
  end: ['GAME OVER! {w} TAKE IT!', 'THAT\'S THE FINAL! {w} ARE YOUR WINNERS!'],
  trash: ['{t}']
};
