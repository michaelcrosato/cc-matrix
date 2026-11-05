/* 04-data-story: the Blam Tour (PLAN 10.5) and its story script (10.6): beats as lines [speaker, text] on a stage, the
 * matchup trash talk, halftime gags and sponsor breaks. {TEAM} is your team's name, {CAPTAIN} your first player. Every
 * line about a player uses the NAME. Announcers shout in caps; the Commissioner is smug in sentence case; robots speak
 * in SPACED. CAPITAL. WORDS. */
const TOUR_STOPS = {   // your team -> the three opponents in order; the final is always the BLAMBOTS at the Blam Dome
  hightops: ['breakers', 'crushers', 'magma'], breakers: ['hightops', 'crushers', 'magma'],
  crushers: ['hightops', 'breakers', 'magma'], magma: ['hightops', 'breakers', 'crushers']
};
const TOUR_DIFF_SHIFT = [-1, 0, .5, 1];   // CPU difficulty by stop: one step lower, as set, half a step higher, one higher
const RIVAL_LINES = {   // the rival captain's line before a game against that team
  breakers: ['riptide', 'Hope you packed sunscreen, {TEAM}. The tide\'s coming in, and it doesn\'t knock.'],
  hightops: ['volt', 'Welcome to the Skybox. Try not to look down. Actually, look down: that\'s where you\'ll be.'],
  crushers: ['torque', 'We crush cars for breakfast. You look like a light snack.'],
  magma: ['obsidian', 'On Kaboom Island the floor is lava. Not a game. Actual lava. Walk carefully.']
};
const REPLY_LINES = {   // your captain's reply: [opponent][your team]
  breakers: { hightops: ['volt', 'Cute pier. I\'m about to dunk on it.'], crushers: ['torque', 'I\'ve crushed bigger boats than this.'], magma: ['obsidian', 'Sand turns to glass when I\'m around.'] },
  hightops: { breakers: ['riptide', 'Whoa, relax. We\'re just here to ride the wave. Over you.'], crushers: ['torque', 'Fancy lights. They\'ll look great on my scrap pile.'], magma: ['ember', 'Neon\'s cute. Lava\'s hotter.'] },
  crushers: { hightops: ['volt', 'Then you\'re about to get a stomachache.'], breakers: ['shellshock', 'Careful, the floor\'s greasier than your jokes.'], magma: ['pumice', 'I bounce. You crush. Let\'s see who\'s still standing.'] },
  magma: { hightops: ['bigrumble', 'I don\'t walk carefully. I walk LOUD.'], breakers: ['riptide', 'Dude. Is that, like, safe?'], crushers: ['sparkplug', 'I\'m too fast to get burned!'] }
};
const BEATEN_LINES = { breakers: ['riptide', 'Wipeout. Totally gnarly, though. Respect.'], hightops: ['volt', 'Okay, okay. You can ball. Don\'t let it go to your head.'], crushers: ['torque', 'You crushed us. That\'s MY job.'], magma: ['obsidian', 'The mountain... respects you.'] };
const REVEAL_REPLY = { hightops: ['volt', 'Did the toaster just trash-talk me?'], breakers: ['riptide', 'Bummer. I was gonna say we could be friends.'], crushers: ['torque', 'I\'ve got a crusher with your names on it.'], magma: ['obsidian', 'Metal melts.'] };

/* the beats. stage: where it plays (21-court-draw's stage painter); lines: [speaker, text]; choices: on the last line */
def('beat', 'prologue', { title: 'PROLOGUE', stage: 'studio', music: 'story', lines: [
  ['vinnie', 'GOOD EVENING, BALL FANS! LIVE FROM THE TOP OF THE WORLD, THIS IS CHANNEL BLAM!'],
  ['deedee', 'AND THIS IS THE BLAM TOUR! FIVE COURTS! FOUR CREWS! ONE GOLDEN BLAMBOOZLE! ZERO FOULS!'],
  ['vinnie', 'TONIGHT\'S TOUR IS SPONSORED BY GLOBO-BLAM CORP. THEY MAKE EVERYTHING. THEY MADE THIS SENTENCE.'],
  ['gigawatt', 'Greetings, little ballers. Win my Tour and the Golden Blamboozle is yours.'],
  ['gigawatt', 'Lose, and your court becomes a GLOBO-BLAM parking lot. Validated parking, of course. Ha. Ha. Ha.'],
  ['deedee', '{TEAM}, THE WHOLE CITY IS WATCHING. NO PRESSURE! EXCEPT ALL OF IT!']] });
def('beat', 'campOffer', { title: 'BLAM CAMP?', stage: 'studio', music: 'story', lines: [
  ['deedee', 'FIRST TIME ON THE TOUR? HIT BLAM CAMP AND I\'LL SHOW YOU THE ROPES. OR DON\'T. LIVE DANGEROUSLY!']], choices: ['BLAM CAMP', 'LET\'S PLAY'] });
def('beat', 'stopIntro', { title: 'STOP INTRO', stage: 'court', music: 'story', dynamic: true });
def('beat', 'pregame', { title: 'PRE-GAME TALK', stage: 'court', music: 'story', dynamic: true });
def('beat', 'post1', { title: 'AFTER STOP 1', stage: 'court', music: 'story', dynamic: true });
def('beat', 'post2', { title: 'AFTER STOP 2', stage: 'monitor', music: 'story', villain: true, lines: [
  ['gigawatt', 'Data received. Prototype calibration at ninety-eight percent. Keep playing, little ballers. Keep... teaching them.'],
  ['deedee', 'TEACHING WHO? VINNIE, WHY DOES THE GLOBO-BLAM LOGO HAVE A ROBOT ARM?'],
  ['vinnie', 'THAT\'S BRANDING, DEE DEE. WE DON\'T ASK QUESTIONS ON LIVE TV.']] });
def('beat', 'reveal', { title: 'THE REVEAL', stage: 'dome', music: 'story', villain: true, dynamic: true });
def('beat', 'finalPre', { title: 'THE FINAL', stage: 'dome', music: 'story', lines: [['vinnie', 'THE FINAL! HUMANS VERSUS HARDWARE! THE BLAMBOOZLE IS ON THE LINE!']] });
def('beat', 'overclock', { title: 'OVERCLOCK', inPlay: true, lines: [['gigawatt', 'OVERCLOCK THEM! MAXIMUM BLAM!'], ['deedee', 'THE ROBOTS ARE GLOWING! IS THAT LEGAL? THERE ARE NO RULES! I FORGOT!']] });
def('beat', 'reboot', { title: 'FIRST REBOOT', inPlay: true, lines: [['deedee', 'THEY SHORT-CIRCUIT WHEN YOU KNOCK THEM DOWN! KEEP SHOVING, {TEAM}!']] });
def('beat', 'ending', { title: 'THE ENDING', stage: 'dome', music: 'credits', ending: true, lines: [
  ['dunkatron', 'ERROR. ERROR. HUMANS. TOO. ... BLAM.'],
  ['vinnie', 'THEY DID IT! {TEAM} WINS THE BLAM TOUR!'],
  ['deedee', 'AND THE BLAMBOTS ARE BEING RECYCLED INTO VERY SAD TOASTERS!'],
  ['gigawatt', 'This isn\'t over! I\'ll buy another league! I\'ll buy the MOON! Hey! Put me down!'],
  ['vinnie', 'STREETBALL IS SAVED! THE BLAMBOOZLE GOES HOME WITH {TEAM}!'],
  ['deedee', 'GOODNIGHT, EVERYBODY! REMEMBER: NO FOULS! NO MERCY!'],
  ['both', 'ALL BLAM!']] });
def('beat', 'lossStop', { title: 'A LOSS', stage: 'monitor', music: 'story', villain: true, lines: [['gigawatt', 'Tsk. Another court for my parking empire.']] });
def('beat', 'lossFinal', { title: 'A LOSS IN THE FINAL', stage: 'dome', music: 'story', villain: true, lines: [['gigawatt', 'Resistance is... adorable.'], ['dunkatron', 'GAME. OVER. INSERT. COIN.']] });
const BEAT_ORDER = ['prologue', 'campOffer', 'stopIntro', 'pregame', 'post1', 'post2', 'reveal', 'finalPre', 'overclock', 'reboot', 'ending', 'lossStop', 'lossFinal'];

/** the lines of a dynamic beat for the tour's state t ({ team, stop, opp, court }) */
function beatLines(id, t) {
  const opp = t.opp, court = get('court', t.court || 'skybox'), home = get('team', t.homeTeam || t.team), away = get('team', t.awayTeam || opp);
  if (id === 'stopIntro') return [['vinnie', 'STOP ' + (t.stop + 1) + ' OF THE BLAM TOUR: ' + (home ? home.short : '') + ' VERSUS ' + (away ? away.short : '') + ' AT ' + court.name + '!'], ['deedee', court.intro]];
  if (id === 'pregame') { const a = RIVAL_LINES[opp], b = REPLY_LINES[opp] && REPLY_LINES[opp][t.team]; return [a, b].filter(Boolean); }
  if (id === 'post1') return [BEATEN_LINES[opp], ['gigawatt', 'Hmm. Promising. My engineers are taking notes. Lots of notes.']].filter(Boolean);
  if (id === 'reveal') return [['vinnie', 'THREE STOPS! THREE WINS! {TEAM} IS HEADED TO THE BLAM DOME!'], ['gigawatt', 'Congratulations. You have earned the privilege... of being replaced.'],
    ['gigawatt', 'Behold the future of basketball: the BLAMBOTS! No salaries! No sweat! No mercy!'], ['dunkatron', 'BEEP. YOUR. CAREER. IS. DEPRECATED.'],
    ['swatbot', 'INITIATING. TRASH. TALK. PROTOCOL. ... YOU. STINK.'], REVEAL_REPLY[t.team]].filter(Boolean);
  const b = get('beat', id); return b && b.lines ? b.lines : [];
}

const HALFTIME_GAGS = [
  'THIS HALFTIME IS BROUGHT TO YOU BY GLOBO-BLAM SNEAKER GLUE. STICK THE LANDING. FOREVER.',
  'OUR STATS DEPARTMENT IS ONE GUY WITH A CALCULATOR, AND HE IS SWEATING.',
  'REMEMBER, KIDS: STAY IN SCHOOL. AND IN THE PAINT.',
  'GLOBO-BLAM COLA: NOW WITH 30% MORE FIZZ AND 0% EXPLANATION.',
  'IF YOU\'RE JUST JOINING US: YES, THAT WAS A REAL DUNK. NO, WE DON\'T KNOW HOW EITHER.',
  'WE ASKED THE ROBOTS FOR A HALFTIME COMMENT. THEY SENT US A RECEIPT.'
];
const SPONSOR_BREAKS = [
  'WE\'LL BE RIGHT BACK AFTER THIS MESSAGE FROM GLOBO-BLAM GLASS: NOW 40% LESS SHATTERY!',
  'GLOBO-BLAM INSURANCE: BECAUSE SOMEBODY HAS TO PAY FOR THAT.',
  'THIS REPLACEMENT BACKBOARD IS BROUGHT TO YOU BY... THE LAST REPLACEMENT BACKBOARD.'
];
const UNLOCK_CARDS = ['UNLOCKED: THE BLAMBOTS', 'UNLOCKED: CHANNEL BLAM ALL-STARS', 'UNLOCKED: BIG HEADS (OPTIONS)', 'SECRETS ON THE ABOUT SCREEN'];
const CREDITS_ROLL = [
  ['BASHKETBALL', ''], ['AN ORIGINAL ARCADE BASKETBALL GAME', ''], ['', ''],
  ['GAME, CODE, ART, MUSIC, VOICES', 'Built by Claude (Anthropic, claude-opus-5-5)'], ['FROM THE PLAN BY', 'claude-opus-5-5 (PLAN.md)'],
  ['ENGINE', 'my-3D2dge v0.85.2 (MIT), modified'], ['ONLINE', 'AI Hub Session Protocol v1, client 1.4.0'],
  ['SOUND', 'Every song, sound and voice made in code'], ['', ''],
  ['STARRING', 'VOLT • BIG RUMBLE • PIXEL'], ['', 'RIPTIDE • SHELLSHOCK • LONGBOARD'], ['', 'TORQUE • SPARKPLUG • HUBCAP'], ['', 'OBSIDIAN • EMBER • PUMICE'],
  ['AND', 'DUNKATRON • SWATBOT • SPARE PARTS'], ['WITH', 'VINNIE VOX • DEE DEE DECIBEL • BLAMMO'], ['VILLAINY BY', 'COMMISSIONER GIGAWATT'], ['WHISTLE BY', 'REF ROSCOE'],
  ['', ''], ['NO FOULS. NO MERCY.', 'ALL BLAM.']
];
