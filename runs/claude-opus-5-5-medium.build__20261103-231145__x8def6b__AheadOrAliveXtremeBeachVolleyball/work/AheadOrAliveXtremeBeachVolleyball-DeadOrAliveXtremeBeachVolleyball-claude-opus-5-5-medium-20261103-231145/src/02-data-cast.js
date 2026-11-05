/* 02-data-cast: the six fighters, the hosts and the staff: looks, stats, tastes, voices, schedules and lines. */
G.FIGHTERS = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'];
G.CAST = {
  rin: { name: 'Rin Takamine', short: 'Rin', epithet: 'The Quiet Blade', from: 'Japan', style: 'Kendo & iaido champion', age: 24,
    size: 1.22, hair: { style: 'ponytail', color: '#1d1a24' }, bangs: .6, skin: '#f1cfb2', eye: '#4a2c22',
    personality: 'Composed perfectionist. Dry one-liners. Secretly adores cute things.',
    tastes: ['classic', 'elegant'], stats: { POW: 5, TEC: 9, SPD: 7, JMP: 6 },
    voice: { base: 330, range: 3, rate: 13, formant: 1.05, wave: 'triangle' }, suit: 'seigaiha', acc: ['ribbon'], ribbon: '#d8303a',
    celebrate: 'bow', color: '#4a6ad8' },
  lola: { name: 'Dolores "Lola" Vega', short: 'Lola', epithet: 'La Tormenta', from: 'Mexico', style: 'Luchadora (pro wrestler)', age: 27,
    size: 1.30, shoulder: .25, hair: { style: 'curly', color: '#3a2218' }, bangs: .4, skin: '#b9825a', eye: '#3a2416', band: '#d8302a',
    personality: 'Loud, warm, theatrical. Trash-talks with a grin. Lives for a crowd.',
    tastes: ['bold', 'sporty'], stats: { POW: 9, TEC: 5, SPD: 5, JMP: 8 },
    voice: { base: 260, range: 6, rate: 16, formant: .95, wave: 'saw' }, suit: 'estrella', acc: ['sweatband'],
    celebrate: 'fistpump', color: '#d8302a' },
  ingrid: { name: 'Ingrid Halvorsen', short: 'Ingrid', epithet: 'The Glacier', from: 'Norway', style: 'Glima wrestling & kickboxing', age: 26,
    size: 1.38, hair: { style: 'braid', color: '#f2ead2' }, bangs: .5, skin: '#f7dccb', eye: '#5aa0d8',
    personality: 'Stoic and deadpan. Hates the heat, misses snow. Secretly a karaoke fiend.',
    tastes: ['sporty', 'classic'], stats: { POW: 7, TEC: 6, SPD: 4, JMP: 9 },
    voice: { base: 210, range: 2, rate: 10, formant: .9, wave: 'triangle' }, suit: 'fjord', acc: ['sportshades'],
    celebrate: 'nod', color: '#5aa0d8' },
  amara: { name: 'Amara Okafor', short: 'Amara', epithet: 'Rhythm Queen', from: 'UK / Nigeria', style: 'Capoeira & dance fighting', age: 22,
    size: 1.26, hair: { style: 'puff', color: '#2a1810' }, bangs: .2, skin: '#7a4a2e', eye: '#2a1810', cuffs: '#ffd36a',
    personality: 'Cheerful social butterfly. Loves music and fashion. Dramatic.',
    tastes: ['bold', 'cute'], stats: { POW: 5, TEC: 6, SPD: 9, JMP: 8 },
    voice: { base: 340, range: 7, rate: 15, formant: 1.1, wave: 'pulse', sing: true }, suit: 'kentepop', acc: ['hibiscus'],
    celebrate: 'dance', color: '#ff8a1e' },
  tess: { name: 'Tess Callahan', short: 'Tess', epithet: 'Riptide', from: 'Australia', style: 'Surfer & MMA brawler', age: 25,
    size: 1.28, hair: { style: 'bob', color: '#f0d890' }, bangs: .7, skin: '#e2ad84', eye: '#3c7a5a',
    personality: 'Laid-back but fiercely competitive. Cheeky and outdoorsy.',
    tastes: ['sporty', 'bold'], stats: { POW: 7, TEC: 7, SPD: 7, JMP: 6 },
    voice: { base: 290, range: 5, rate: 14, formant: 1.0, wave: 'saw', rise: true }, suit: 'reefbreak', acc: ['wristbands'],
    celebrate: 'shaka', color: '#1fb7b0' },
  mei: { name: 'Mei-Lin Zhou', short: 'Mei', epithet: 'Little Phoenix', from: 'Hong Kong', style: 'Wushu acrobat & xiangqi prodigy', age: 21,
    size: 1.16, hair: { style: 'twinbuns', color: '#1a1418' }, bangs: .8, skin: '#f3d2b8', eye: '#3a2420', ribbon: '#ff6aa8',
    personality: 'Mischievous prankster with a sweet tooth. Hates losing at anything.',
    tastes: ['cute', 'elegant'], stats: { POW: 4, TEC: 8, SPD: 8, JMP: 6 },
    voice: { base: 400, range: 6, rate: 18, formant: 1.18, wave: 'pulse' }, suit: 'peony', acc: ['ribbon'],
    celebrate: 'backflip', color: '#ff6aa8' },
  sonny: { name: 'Sonny Fortuna', short: 'Sonny', epithet: 'The Man with the Golden Tan', host: true, build: 'bulky', size: 1.32,
    hair: { style: 'spiky', color: '#121014' }, skin: '#d9a27a', eye: '#2a1a10', shirt: { cloth: '#2fb5a0', pants: '#f4f4f0', trim: '#ffd36a' },
    stats: { POW: 8, TEC: 5, SPD: 5, JMP: 5 }, voice: { base: 120, range: 7, rate: 13, formant: .8, wave: 'saw', vib: 6 },
    suit: 'house_sonny', acc: ['aviators'], celebrate: 'cheer2', color: '#ffd36a' },
  pepper: { name: 'Pepper Quill', short: 'Pepper', epithet: 'Concierge', host: true, size: 1.24, hair: { style: 'bun', color: '#5a2a1e' }, bangs: .5,
    skin: '#f0c8a8', eye: '#3a2a20', shirt: { cloth: '#1d2433', pants: '#1d2433', trim: '#ffd36a' }, glasses: true,
    stats: { POW: 6, TEC: 10, SPD: 7, JMP: 6 }, voice: { base: 230, range: 1, rate: 17, formant: 1.0, wave: 'triangle' },
    suit: 'pinstripe', acc: [], celebrate: 'salute', color: '#c86a4a' },
  kai: { name: 'Kai Makoa', short: 'Kai', staff: true, build: 'heroic', size: 1.25, hair: { style: 'short', color: '#141010' }, skin: '#a8714a', eye: '#2a1a10',
    shirt: { cloth: '#2fb5a0', pants: '#c8b080', trim: '#ffe0a0' }, voice: { base: 170, range: 4, rate: 12, formant: .85, wave: 'triangle' }, color: '#2fb5a0' },
  odette: { name: 'Odette Belrose', short: 'Odette', staff: true, size: 1.2, hair: { style: 'long', color: '#c8b8e8' }, skin: '#f4d8c8', eye: '#4a3a6a',
    robe: '#ff8aa8', hat: 'sunhat', voice: { base: 300, range: 5, rate: 12, formant: 1.1, wave: 'pulse' }, color: '#ff8aa8' },
  bo: { name: 'Coach Bo Brannigan', short: 'Bo', staff: true, build: 'bulky', size: 1.28, hair: { style: 'bald', color: '#5a3a2a' }, skin: '#e0a880', eye: '#2a1a10',
    shirt: { cloth: '#ffd04a', pants: '#2a5ab8', trim: '#ffffff' }, hat: 'visor', voice: { base: 150, range: 3, rate: 14, formant: .85, wave: 'square' }, color: '#ffd04a' }
};
G.STATS_ORDER = ['POW', 'TEC', 'SPD', 'JMP'];
G.STAT_NAMES = { POW: 'Power', TEC: 'Technique', SPD: 'Speed', JMP: 'Jump' };
G.WEATHER_TASTE = { ingrid: { like: ['cloudy', 'rain'], dislike: [] }, amara: { like: ['sunny'], dislike: ['rain'] }, tess: { like: ['sunny'], dislike: [] } };
/** one symmetric starting affinity per pair */
G.BASE_AFF = {
  'rin-lola': 20, 'rin-ingrid': 35, 'rin-amara': 25, 'rin-tess': 30, 'rin-mei': 40,
  'lola-ingrid': 25, 'lola-amara': 40, 'lola-tess': 45, 'lola-mei': 20,
  'ingrid-amara': 20, 'ingrid-tess': 35, 'ingrid-mei': 25,
  'amara-tess': 30, 'amara-mei': 40, 'tess-mei': 25
};
G.baseAff = (a, b) => G.BASE_AFF[a + '-' + b] || G.BASE_AFF[b + '-' + a] || 25;
/** schedule weights: daytime Beach / Pool / Promenade / away; night Casino / away */
G.SCHEDULE = {
  rin: [[4, 2, 3, 1], [4, 3, 2, 1], [3, 7]], lola: [[5, 2, 2, 1], [5, 2, 2, 1], [6, 4]], ingrid: [[3, 4, 2, 1], [2, 5, 2, 1], [2, 8]],
  amara: [[3, 2, 4, 1], [3, 3, 3, 1], [7, 3]], tess: [[6, 2, 1, 1], [5, 3, 1, 1], [4, 6]], mei: [[2, 3, 4, 1], [3, 2, 4, 1], [8, 2]]
};
G.GOOD_SPORTS = ['tess', 'rin'];

/* ---- lines (short: two lines of about 36 letters a page). Sonny speaks in ALL-CAPS bursts; Pepper never exclaims ---- */
G.LINES = {
  rin: {
    greet: ['Good morning. The sand is... adequate.', 'You again. Good. I wanted a sparring partner.', 'Ah. My favorite person on this island.'],
    chat: ['I practice my swing at dawn. The sea does not judge.', 'Volleyball is just kendo with a softer sword.',
      'My sister sends me photos of cats. I pretend not to care.', 'Footwork is everything. In sand, doubly so.',
      'I bought a tiny seal keychain. Tell no one.', 'With you on the court, I can stop overthinking.'],
    love: ['...It is so round. I will name him Admiral.', 'This is perfect. You pay attention. I like that.'],
    like: ['A thoughtful choice. Thank you.', 'I will use this. Often.'],
    neutral: ['Oh. Thank you. I suppose.'],
    refuse: ['My heart rate is fine as it is. Thank you.', 'I must decline. Respectfully. Firmly.'],
    suitYes: 'Simple lines. Clean colors. Yes.', suitNo: 'Not really my style. Too loud.',
    inviteYes: ['A partnership. Acceptable. Let us win.', 'I accept. Do not make me regret it.'],
    inviteNo: ['I do not know your rhythm yet.', 'Not today. Show me more first.'],
    leaveTeam: 'My partner will be... displeased. So be it.',
    taunt: ['Your stance is sloppy. I noticed.', 'One cut. One point. Watch.'],
    win: ['A clean victory. As planned.', 'Precision wins. Again.'], loss: ['I will reflect on this. Deeply.', 'Unacceptable. Rematch.'],
    bark: ['Mine.', 'Yours. Go.'],
    visit: { lines: ['I brought matcha. It is late.', 'Do you ever feel the island is too loud?'], choices: ['It is. Stay a while.', 'I like loud.'], good: 0 },
    farewell: ['Goodbye. It was... fine.', 'I will miss this. I will miss you. There, I said it.'],
    ending: 'Same time next year. I will be sharper.'
  },
  lola: {
    greet: ['¡Hola, compañera! Ready to bring the THUNDER?', 'There she is! The crowd loves you, you know.', '¡Mi hermana! Today we make history!'],
    chat: ['In the ring I fly off the top rope. Here? The sand!', 'I eat hot sauce for breakfast. Every day. ¡Fuerza!',
      'My abuela taught me to spike. With a tortilla.', 'A luchadora never shows fear. Except of crabs.',
      'You and me, we are a TAG TEAM now. Yes?', 'When I win, I win for everyone. Even you, when you lose!'],
    love: ['THIS! This is the fuel of champions!', '¡AY! You know me too well, hermana!'],
    like: ['Oh, nice! Muy bien!', 'For me? You are sweet!'],
    neutral: ['Huh. Okay! Thanks!'],
    refuse: ['A book? On vacation? Ay, you are funny.', 'No, no, no. Not for La Tormenta.'],
    suitYes: '¡Sí! Bold! Loud! Like me!', suitNo: 'Not really my style. Too quiet!',
    inviteYes: ['¡VAMOS! Together we are unstoppable!', 'A tag team! Finally! Let us GO!'],
    inviteNo: ['Hmm. Show me your fire first.', 'Not yet, amiga. Not yet.'],
    leaveTeam: 'My old partner will cry. Then she will get over it!',
    taunt: ['I hope you brought a helmet!', 'The storm is coming, chicas!'],
    win: ['¡VICTORIA! Somebody ring the bell!', 'Thank you, thank you! Hold the applause! No, keep it!'], loss: ['Bah! The sand was slippery!', 'Rematch. Steel cage. Tomorrow.'],
    bark: ['¡MÍA!', '¡Tuya, tuya!'],
    visit: { lines: ['¡Sorpresa! I brought tacos!', 'Do you think I am too loud?'], choices: ['Never. Be loud.', 'A little, yes.'], good: 0 },
    farewell: ['Adiós! Do not forget me!', 'Hermana... I will miss you so much! Group hug!'],
    ending: 'Next year, we wrestle. On the beach. I am calling it.'
  },
  ingrid: {
    greet: ['It is thirty-one degrees. I am melting. Hello.', 'Ah. You. I am still melting.', 'Hello, friend. The heat is easier with you here.'],
    chat: ['In Norway it is snowing. I checked. Twice.', 'I wrestled a bear once. Small bear. Still counts.',
      'Sunscreen factor one hundred. Applied hourly.', 'Do not tell anyone, but I sing in the shower.',
      'You are... not bad company. For a warm-blooded person.', 'Karaoke at the casino. Thursday. You did not hear this.'],
    love: ['Snow. Tiny, perfect snow. I may cry.', 'Wool. In this heat. Genius. Thank you.'],
    like: ['Practical. I approve.', 'Good. This is useful.'],
    neutral: ['Thank you. I will find a place for it.'],
    refuse: ['Glitter gets everywhere. Everywhere.', 'No. But I appreciate the thought. Barely.'],
    suitYes: 'Functional. Covered. I like it.', suitNo: 'Not really my style. Too much sun on me.',
    inviteYes: ['Very well. I will block. You will do the rest.', 'Partners. I will try to smile.'],
    inviteNo: ['I prefer to know someone before I trust them with my spikes.', 'No. Not yet. Earn it.'],
    leaveTeam: 'My partner will understand. Probably.',
    taunt: ['The Glacier does not move. You do.', 'I block. You weep. Simple.'],
    win: ['Victory. Now I need shade.', 'As expected. Where is the ice?'], loss: ['I lost to the heat. Not to you.', 'Next time, I bring a fan.'],
    bark: ['Mine.', 'Yours.'],
    visit: { lines: ['I brought iced coffee. Very iced.', 'Do you also miss the cold?'], choices: ['I could use a breeze.', 'I love the heat!'], good: 0 },
    farewell: ['Goodbye. Stay cool. Literally.', 'You made the heat bearable. Thank you. Truly.'],
    ending: 'Come to Norway. I will show you real weather.'
  },
  amara: {
    greet: ['Hey hey! You hear that? The ocean has rhythm!', 'Babe! Love the energy today!', 'My bestie! Okay, spin for me. Gorgeous!'],
    chat: ['Capoeira is dance with consequences, babe.', 'I have three playlists for this island. Minimum.',
      'Fashion is armor. Cute armor.', 'Did you see that sunset? I almost cried. I did cry.',
      'Everyone here is so intense. Except you. Love that.', 'You and me? Main character energy. Both of us.'],
    love: ['Okay. The party starts NOW.', 'Stop it. STOP IT. I love it!'],
    like: ['Cute! So cute!', 'Ooh, I see you, taste-maker!'],
    neutral: ['Aw, thanks babe.'],
    refuse: ['Snow? Babe, we are in paradise.', 'Hmm. No. Love you though!'],
    suitYes: 'Yes! Colour! Drama! Perfect!', suitNo: 'Not really my style, babe. Too plain.',
    inviteYes: ['Duo goals! Let us serve looks AND aces!', 'Yes yes YES! Partners!'],
    inviteNo: ['Babe, we need more vibes first.', 'Not yet! Let us hang out more!'],
    leaveTeam: 'My partner will survive. I will send her a playlist.',
    taunt: ['Hope you can dance, because you will be chasing!', 'Feel the rhythm? That is you losing!'],
    win: ['We ate. We left no crumbs.', 'And the crowd goes WILD!'], loss: ['Okay. Okay. I am fine. I am not fine.', 'The vibes were off. Rematch!'],
    bark: ['Mine, babe!', 'Yours! Go go!'],
    visit: { lines: ['Surprise! Late-night smoothies!', 'Am I too much sometimes?'], choices: ['You are exactly enough.', 'Maybe a little.'], good: 0 },
    farewell: ['Bye babe! Text me!', 'You are family now. Officially. No take-backs.'],
    ending: 'Same island, same crew, next summer. Promise me.'
  },
  tess: {
    greet: ['G\'day! Waves are pumping, sun\'s out. Life\'s good, yeah?', 'Oi! Ready for a hit?', 'There\'s my favourite! Let\'s go smash some balls!'],
    chat: ['Caught a barrel this morning. Pure bliss, mate.', 'MMA taught me one thing: never stop moving.',
      'Fancy a surf later? I\'ll teach you, no worries.', 'I\'ve got sand in places sand shouldn\'t be.',
      'Reckon we\'d make a solid team, yeah?', 'Best mate on the island. That\'s you.'],
    love: ['Ohhh, the good stuff! My board says thanks.', 'Legend! Absolute legend!'],
    like: ['Ripper, cheers!', 'Ah, that\'s sweet as!'],
    neutral: ['Cheers, mate.'],
    refuse: ['Mate, I can barely write my own name.', 'Nah, not really my thing, yeah?'],
    suitYes: 'Sporty! Sorted! Love it!', suitNo: 'Not really my style, mate.',
    inviteYes: ['Partners? Too right!', 'Let\'s have a crack! Partners!'],
    inviteNo: ['Nah, not yet, mate. Hang out first.', 'Maybe later, yeah?'],
    leaveTeam: 'My old partner will be filthy. She\'ll get over it.',
    taunt: ['Hope you\'ve got your sea legs!', 'This\'ll be over quick, yeah?'],
    win: ['Get in! Too easy!', 'That\'s how we do it down under!'], loss: ['Fair play. Good game, yeah?', 'Ah, wiped out. Next one!'],
    bark: ['Mine, mine!', 'Yours, mate!'],
    visit: { lines: ['Brought snags. Fancy a feed?', 'You reckon I take things too easy?'], choices: ['That is your charm.', 'Sometimes, yeah.'], good: 0 },
    farewell: ['See ya, mate! Keep it real!', 'Best holiday ever, cos of you. Seriously.'],
    ending: 'Next year we\'re hitting the waves first. Deal?'
  },
  mei: {
    greet: ['Hehe. Bet you can\'t beat me at anything today.', 'Oh, it\'s you! Want to lose at cards?', 'My favourite rival! And friend. Mostly rival.'],
    chat: ['I flipped over a lifeguard tower. On purpose.', 'Xiangqi is chess but better. Fight me.',
      'I hid Sonny\'s sunglasses. Do not tell him.', 'Sweet things make me faster. Science.',
      'You\'re fun. You almost beat me once.', 'Okay, you are my best friend. Do NOT tell anyone.'],
    love: ['Solved it. Twice. Got another?', 'MOCHI! You are my hero forever!'],
    like: ['Ooh, nice! I approve!', 'Hehe, cute!'],
    neutral: ['Hmm. Thanks, I guess.'],
    refuse: ['I don\'t eat things on sticks that used to have faces.', 'Ew, no. Try again!'],
    suitYes: 'So cute! Twirl-worthy!', suitNo: 'Not really my style. Boring!',
    inviteYes: ['Partners? Fine. But I get the spikes.', 'Okay! We\'ll crush everyone!'],
    inviteNo: ['Beat me at something first. Hehe.', 'Nope! Not yet!'],
    leaveTeam: 'My old partner will sulk. I\'ll buy her bubble tea.',
    taunt: ['I\'ve already won. You just don\'t know it.', 'Prepare to be out-flipped!'],
    win: ['Hehe! Told you!', 'Undefeated! As always!'], loss: ['That didn\'t count. I wasn\'t trying.', 'Rematch. Now. RIGHT now.'],
    bark: ['Mine! Mine!', 'Yours! Hehe!'],
    visit: { lines: ['I brought mochi! And cards!', 'Do you think I play too many pranks?'], choices: ['Never stop.', 'Maybe ease up on Sonny.'], good: 0 },
    farewell: ['Bye! I\'ll beat you next year!', 'I\'m not crying. YOU\'RE crying. Okay, I\'m crying.'],
    ending: 'Next summer: rematch. And bring snacks.'
  }
};
G.SONNY = {
  commentary: {
    spike: ['WHAT A SPIKE! Somebody call a lifeguard!', 'BOOM! That ball needs a vacation!', 'KILL SHOT! Somebody check the sand for a crater!'],
    ace: ['ACE! That serve had TAXES on it!', 'ACE! Nobody touched it! NOBODY!', 'Straight to the sand! JACKPOT SERVE!'],
    block: ['BLOCKED! The wall is CLOSED for business!', 'DENIED! Return to sender!', 'STUFFED! Like a turkey, baby!'],
    rally: ['Long rally, folks. I\'m getting a tan just WATCHING.', 'Back and forth! It\'s like my STOCK PORTFOLIO!'],
    matchpoint: ['MATCH POINT! I can\'t look! ...I\'m looking.', 'MATCH POINT! Somebody hold my sunglasses!'],
    fault: ['Ooh! The HOUSE thanks you for that one!', 'A gift! A GIFT! I love gifts!', 'OUT! Out like my last three marriages!'],
    dig: ['WHAT A DIG! She dove like it was free money!', 'SAVED IT! Diving for dollars!'],
    serveFault: ['SERVE FAULT! The net says hello!', 'Into the NET! Ouch, champ!'],
    start: ['LADIES AND... LADIES! LET\'S PLAY SOME BALL!', 'IT\'S GO TIME, SUNSHINES! SERVE IT UP!'],
    win: ['AND THAT\'S THE MATCH! WHAT A SHOW!', 'GAME OVER, CHAMPS! THE HOUSE APPLAUDS!'],
    replay: ['LET\'S SEE THAT AGAIN! IN SLOW-MO!', 'REPLAY! Because I said so!'],
    netcord: ['Off the TAPE! Lady Luck is ON this island!']
  },
  pa: ['GOOD MORNING, ISLA FORTUNA! THE BUFFET IS OPEN!', 'THE SUN IS SHINING AND THE CHIPS ARE FALLING!',
    'REMINDER: SUNSCREEN IS FREE. THE CASINO IS NOT!', 'WHO\'S READY TO PLAY SOME BALL?'],
  shop: ['Buy something shiny, champ!']
};
G.STAFF_LINES = {
  kai: ['Aloha. Something to snack on?', 'Fresh coconuts. Picked them myself.', 'The mochi is new. Mei bought six.', 'Gifts make friends. Sonny taught me that. Badly.',
    'Hot sauce is for Lola. Mostly.', 'Need a gift? I know everyone\'s tastes.', 'Wrap it nice. That\'s half the gift.', 'Come back tomorrow. New stock.'],
  odette: ['Darling! Let us find you something fabulous.', 'Couture is a feeling, not a price.', 'That colour on you? Magnifique.', 'Try it on. Twirl. Then decide.',
    'Elegance never goes out of season.', 'The Midnight suit. Only for the brave.', 'New pieces arrive daily, chérie.', 'I dressed a duchess once. You look better.'],
  bo: ['Back in my day we played in jeans!', 'Hydrate or die-drate, kid!', 'Wristbands. Trust me.', 'Footwork! Footwork! Footwork!',
    'This gear is pro-tour approved. By me.', 'Shades on when the sun\'s low!', 'You serve like my grandma. That\'s a compliment.', 'Go get \'em, champ!']
};
G.PEPPER = {
  tips: {
    receive: 'The ring shows where the ball comes down. Stand in it. Press {play} as it reaches you.',
    set: 'Your partner passed it to you. {play} again as it drops, to set her up.',
    spike: 'She set you. You jump on your own. {play} at the top. Aim with the stick or the mouse.',
    serve: '{play} tosses. {play} again at the top of the toss. {shot} tosses a jump serve.',
    block: 'When they attack near the net, {shot} jumps to block.',
    dive: 'Out of reach? {dive} dives.',
    call: '{call} calls Mine or Yours. Your partner listens.',
    chem: 'The better you get along, the better she plays. Chat. Bring gifts. Win.'
  },
  quips: ['Statistically, that was unwise.', 'The house has noticed.', 'Noted.', 'Mr. Fortuna will be insufferable now.', 'Breakfast is at eight.']
};
