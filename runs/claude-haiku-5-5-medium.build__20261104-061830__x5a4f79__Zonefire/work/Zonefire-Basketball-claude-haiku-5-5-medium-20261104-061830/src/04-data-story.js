/* ---- THE STORY (plan §10.5, §10.6): the Blam Tour's stops, the beats as data (a line is [speaker, text]), the pre-game
 * talk by rival and by our captain's reply, the post-game beats, the reveal, the ending, and the halftime and sponsor
 * gags. Tone: a loud 90s sports broadcast; the Commissioner is smug and speaks in sentence case; the robots SPACED. ---- */
const TOUR_STOPS = {
  hightops: [{ team: 'breakers', court: 'pier' }, { team: 'crushers', court: 'scrapyard' }, { team: 'magma', court: 'caldera' }, { team: 'blambots', court: 'dome' }],
  breakers: [{ team: 'hightops', court: 'skybox' }, { team: 'crushers', court: 'scrapyard' }, { team: 'magma', court: 'caldera' }, { team: 'blambots', court: 'dome' }],
  crushers: [{ team: 'hightops', court: 'skybox' }, { team: 'breakers', court: 'pier' }, { team: 'magma', court: 'caldera' }, { team: 'blambots', court: 'dome' }],
  magma: [{ team: 'hightops', court: 'skybox' }, { team: 'breakers', court: 'pier' }, { team: 'crushers', court: 'scrapyard' }, { team: 'blambots', court: 'dome' }]
};
/** the Tour's CPU shift per stop (§10.5): stop 1 one step lower, stop 2 as set, stop 3 half a step higher, the final one higher */
const TOUR_SHIFT = [-1, 0, .5, 1];

/** the captains of each team (their names for the lines), and the pre-game talk by rival (the rival's line, our captain's
 * reply by our team) — §10.6 item 4 */
const CAPTAIN = { hightops: 'volt', breakers: 'riptide', crushers: 'torque', magma: 'obsidian', blambots: 'dunkatron', allstars: 'vinnie' };
const PREGAME = {
  breakers: { who: 'riptide', line: 'Hope you packed sunscreen, {TEAM}. The tide\'s coming in, and it doesn\'t knock.', replies: { hightops: ['volt', 'Cute pier. I\'m about to dunk on it.'], crushers: ['torque', 'I\'ve crushed bigger boats than this.'], magma: ['obsidian', 'Sand turns to glass when I\'m around.'] } },
  hightops: { who: 'volt', line: 'Welcome to the Skybox. Try not to look down. Actually, look down: that\'s where you\'ll be.', replies: { breakers: ['riptide', 'Whoa, relax. We\'re just here to ride the wave. Over you.'], crushers: ['torque', 'Fancy lights. They\'ll look great on my scrap pile.'], magma: ['ember', 'Neon\'s cute. Lava\'s hotter.'] } },
  crushers: { who: 'torque', line: 'We crush cars for breakfast. You look like a light snack.', replies: { hightops: ['volt', 'Then you\'re about to get a stomachache.'], breakers: ['shellshock', 'Careful, the floor\'s greasier than your jokes.'], magma: ['pumice', 'I bounce. You crush. Let\'s see who\'s still standing.'] } },
  magma: { who: 'obsidian', line: 'On Kaboom Island the floor is lava. Not a game. Actual lava. Walk carefully.', replies: { hightops: ['bigrumble', 'I don\'t walk carefully. I walk LOUD.'], breakers: ['riptide', 'Dude. Is that, like, safe?'], crushers: ['sparkplug', 'I\'m too fast to get burned!'] } }
};

/** the story's beats: each a list of lines. Speakers: vinnie, deedee, gigawatt, dunkatron, swatbot, spareparts, roscoe,
 * captain (ours), the rival (theirs). {TEAM} is our team's name, {CAPTAIN} our first player. */
const BEATS = {
  prologue: [
    ['vinnie', 'GOOD EVENING, BALL FANS! LIVE FROM THE TOP OF THE WORLD, THIS IS CHANNEL BLAM!'],
    ['deedee', 'AND THIS IS THE BLAM TOUR! FIVE COURTS! FOUR CREWS! ONE GOLDEN BLAMBOOZLE! ZERO FOULS!'],
    ['vinnie', 'TONIGHT\'S TOUR IS SPONSORED BY GLOBO-BLAM CORP. THEY MAKE EVERYTHING. THEY MADE THIS SENTENCE.'],
    ['gigawatt', 'Greetings, little ballers. Win my Tour and the Golden Blamboozle is yours.'],
    ['gigawatt', 'Lose, and your court becomes a GLOBO-BLAM parking lot. Validated parking, of course. Ha. Ha. Ha.'],
    ['deedee', '{TEAM}, THE WHOLE CITY IS WATCHING. NO PRESSURE! EXCEPT ALL OF IT!']
  ],
  campOffer: [
    ['deedee', 'FIRST TIME ON THE TOUR? HIT BLAM CAMP AND I\'LL SHOW YOU THE ROPES. OR DON\'T. LIVE DANGEROUSLY!']
  ],
  reveal: [
    ['vinnie', 'THREE STOPS! THREE WINS! {TEAM} IS HEADED TO THE BLAM DOME!'],
    ['gigawatt', 'Congratulations. You have earned the privilege... of being replaced.'],
    ['gigawatt', 'Behold the future of basketball: the BLAMBOTS! No salaries! No sweat! No mercy!'],
    ['dunkatron', 'BEEP. YOUR. CAREER. IS. DEPRECATED.'],
    ['swatbot', 'INITIATING. TRASH. TALK. PROTOCOL. ... YOU. STINK.'],
    ['captain', '{CAPTAIN_REPLY}']
  ],
  final: [['vinnie', 'THE FINAL! HUMANS VERSUS HARDWARE! THE BLAMBOOZLE IS ON THE LINE!']],
  overclock: [
    ['gigawatt', 'OVERCLOCK THEM! MAXIMUM BLAM!'],
    ['deedee', 'THE ROBOTS ARE GLOWING! IS THAT LEGAL? THERE ARE NO RULES! I FORGOT!']
  ],
  reboot: [['deedee', 'THEY SHORT-CIRCUIT WHEN YOU KNOCK THEM DOWN! KEEP SHOVING, {TEAM}!']],
  ending: [
    ['dunkatron', 'ERROR. ERROR. HUMANS. TOO. ... BLAM.'],
    ['vinnie', 'THEY DID IT! {TEAM} WINS THE BLAM TOUR!'],
    ['deedee', 'AND THE BLAMBOTS ARE BEING RECYCLED INTO VERY SAD TOASTERS!'],
    ['gigawatt', 'This isn\'t over! I\'ll buy another league! I\'ll buy the MOON! Hey! Put me down!'],
    ['vinnie', 'STREETBALL IS SAVED! THE BLAMBOOZLE GOES HOME WITH {TEAM}!'],
    ['deedee', 'GOODNIGHT, EVERYBODY! REMEMBER: NO FOULS! NO MERCY!'],
    ['vinnie', 'ALL BLAM!'],
    ['deedee', 'ALL BLAM!']
  ],
  lossStop: [['gigawatt', 'Tsk. Another court for my parking empire.']],
  lossFinal: [['gigawatt', 'Resistance is... adorable.'], ['dunkatron', 'GAME. OVER. INSERT. COIN.']],
  stopIntro: {
    skybox: 'THIRTY STORIES UP AND THE NETS ARE STILL SMOKING!', pier: 'WATCH THE WIND, FOLKS. AND THE SEAGULLS. MOSTLY THE SEAGULLS.',
    scrapyard: 'OIL ON THE FLOOR AND FIRE IN THEIR EYES!', caldera: 'THE FLOOR IS HOT, THE VOLCANO IS HOTTER, AND THE MUSIC IS HOTTEST!',
    dome: 'THE BLAM DOME! SIXTY THOUSAND FANS AND ONE VERY NERVOUS JUMBOTRON!'
  },
  postGame: {
    1: [['riptide', 'Wipeout. Totally gnarly, though. Respect.'], ['volt', 'Okay, okay. You can ball. Don\'t let it go to your head.'], ['torque', 'You crushed us. That\'s MY job.'], ['obsidian', 'The mountain... respects you.'], ['gigawatt', 'Hmm. Promising. My engineers are taking notes. Lots of notes.']],
    2: [['gigawatt', 'Data received. Prototype calibration at ninety-eight percent. Keep playing, little ballers. Keep... teaching them.'], ['deedee', 'TEACHING WHO? VINNIE, WHY DOES THE GLOBO-BLAM LOGO HAVE A ROBOT ARM?'], ['vinnie', 'THAT\'S BRANDING, DEE DEE. WE DON\'T ASK QUESTIONS ON LIVE TV.']]
  },
  sponsor: ['WE\'LL BE RIGHT BACK AFTER THIS MESSAGE FROM GLOBO-BLAM GLASS: NOW 40% LESS SHATTERY!', 'GLOBO-BLAM INSURANCE: BECAUSE SOMEBODY HAS TO PAY FOR THAT.', 'THIS REPLACEMENT BACKBOARD IS BROUGHT TO YOU BY... THE LAST REPLACEMENT BACKBOARD.']
};

/** a line's text with the slots filled: {TEAM} the team's name, {CAPTAIN} the first player */
const fillLine = (text, team) => text.replace(/\{TEAM\}/g, team ? team.name : 'YOUR CREW').replace(/\{CAPTAIN\}/g, team ? (rosterOf(team.id)[0] || { name: 'CAPTAIN' }).name : 'CAPTAIN');
/** a speaker's name, colour and voice: the story's cast (characters and players) */
const SPEAKERS = {
  vinnie: { name: 'VINNIE VOX', voice: 'vinnie', rig: () => charRig('vinnie') },
  deedee: { name: 'DEE DEE DECIBEL', voice: 'deedee', rig: () => charRig('deedee') },
  gigawatt: { name: 'COMMISSIONER GIGAWATT', voice: 'gigawatt', rig: () => charRig('gigawatt') },
  dunkatron: { name: 'DUNKATRON', voice: 'dunkatron', rig: () => playerRig('dunkatron') },
  swatbot: { name: 'SWATBOT', voice: 'swatbot', rig: () => playerRig('swatbot') },
  spareparts: { name: 'SPARE PARTS', voice: 'spareparts', rig: () => playerRig('spareparts') },
  roscoe: { name: 'REF ROSCOE', voice: 'roscoe', rig: () => charRig('roscoe') }
};
/** a rig for a story character or a player (cached in S.rigCache: one Humanoid per portrait) */
const charRig = id => { S.rigCache = S.rigCache || {}; if (S.rigCache[id]) return S.rigCache[id]; const d = get('character', id) || get('player', id); const r = d && d.rig ? new E.Humanoid(Object.assign({ weapon: null, outfit: 'shirt', sleeves: 'none' }, { size: d.rig.size || 1.6, build: d.rig.build || 'heroic', hair: d.rig.hair || 'short', colors: { skin: d.rig.skin || '#e0b090', hair: d.rig.hairColor || '#2a1a10', cloth: d.rig.shirt || '#5a4a7a', pants: '#2a2038' }, hat: d.rig.hat, hunch: d.rig.hunch })) : null; return (S.rigCache[id] = r); };
const playerRig = id => { S.rigCache = S.rigCache || {}; if (S.rigCache[id]) return S.rigCache[id]; const d = playerDef(id), t = teamDef(d.team); return (S.rigCache[id] = dressRig(d, t)); };
/** the story's captains: our team's first player, as the speaker 'captain' */
const captainOf = teamId => { const id = CAPTAIN[teamId] || rosterOf(teamId)[0].id; return { name: playerDef(id).name, voice: id, rig: () => playerRig(id) }; };
