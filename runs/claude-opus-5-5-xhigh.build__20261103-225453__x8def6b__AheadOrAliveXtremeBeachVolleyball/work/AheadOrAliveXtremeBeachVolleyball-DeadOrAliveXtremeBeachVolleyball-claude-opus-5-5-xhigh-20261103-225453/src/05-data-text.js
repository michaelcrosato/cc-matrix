/* 05-data-text: every line of the game. Short, upbeat and a little cheesy; Sonny in ALL-CAPS bursts with nicknames and
 * casino metaphors; Pepper dry, exact and never with an exclamation mark. No innuendo: the jokes come from fighting
 * backgrounds and vacation mishaps. G.pickLine(who, key, vars) picks one on the cosmetic stream ({name} etc. filled). */
G.LINES = {
  rin: {
    greet: ['Good morning. The sand is... adequate.', 'Ah. You again. I mean that kindly.', 'There you are. I saved you some shade.'],
    chatLow: ['I practice my swing at dawn. The sea does not judge.', 'Volleyball is just kendo with more sand in your shoes.'],
    chatMid: ['I bought a tiny keychain at the pier. It is a crab. His name is Sir Pinch.', 'You read the ball well. Like a blade before the cut.'],
    chatHigh: ['I told my sensei I was "training." I am eating mochi in a hammock.', 'With you on the court, I almost relax. Almost.'],
    love: ['...It is so round. I will name him Admiral.', 'This is perfect. I will not cry. I am simply... humid.'],
    like: ['How thoughtful. Thank you.', 'A fine choice. I approve.'],
    neutral: ['Thank you. I will find a use for it.'],
    refuse: ['My heart rate is fine as it is. Thank you.', 'I must decline. It does not suit my... discipline.'],
    suitYes: ['A graceful cut. I will wear it with honor.'], suitNo: ['It is lovely. It is simply not me.'],
    inviteYes: ['Very well. Let us be precise together.', 'Partners. I accept. Do not make me regret it.'],
    inviteNo: ['Not yet. Trust takes more than a sunny afternoon.', 'I am not ready to share a court with you.'],
    leaveTeam: ['I am sorry. My path goes with yours now.'],
    taunt: ['Your stance is open. So is your defeat.', 'I have already seen how this ends.'],
    win: ['A clean finish. As expected.', 'Good. We were in harmony.'], lose: ['I will reflect on this. Deeply.', 'The sand was against me. And them.'],
    bark: ['Hai!', 'Clean.'], partnerBark: ['Mine.', 'Leave it to me.'],
    visit: ['I found these mochi at the market. Too many for one.', 'Do you think discipline can be... a vacation?', 'Discipline is rest done properly.', 'Vacations are for losing yourself.'],
    farewellLow: ['Farewell. Mind your footwork.'], farewellHigh: ['I will write to you. Properly. With a brush.'], ending: ['Next summer, I bring my own mochi.']
  },
  lola: {
    greet: ['¡Hola, compañera! Ready to bring the THUNDER?', 'Oye! The champ of the beach walks by!', 'There she is! My favorite tag-team partner!'],
    chatLow: ['In the ring they call me La Tormenta. Here they call me "sunburnt."', 'I did a flying elbow off a lounger. The lifeguard was not impressed.'],
    chatMid: ['My abuela says the crowd is the real opponent. She was a luchadora too!', 'Volleyball is like wrestling. Somebody always hits the sand.'],
    chatHigh: ['You and me? Tag team champions of the WORLD. I can feel it.', 'Promise you will come to one of my matches. Front row. I will wave.'],
    love: ['THIS! This is the fuel of champions!', '¡Qué maravilla! I am going to cry! Wrestlers cry, it is fine!'],
    like: ['Oh, nice! You know me!', 'Ha! Good pick, compañera!'],
    neutral: ['Gracias! I will put it somewhere.'],
    refuse: ['A book? On vacation? Ay, you are funny.', 'No, no, no. That is not my style at all.'],
    suitYes: ['LOOK AT ME! I am a whole highlight reel!'], suitNo: ['Too quiet for La Tormenta, amiga.'],
    inviteYes: ['YES! The tag team is BORN!', '¡Vamos! We are going to be legends!'],
    inviteNo: ['Ha! You need more muscle first. Come back later!', 'Not today, compañera. I am still sizing you up.'],
    leaveTeam: ['Sorry, partner. A better offer came off the top rope.'],
    taunt: ['I am going to body slam that ball into next week!', 'Hope you stretched. This is going to hurt!'],
    win: ['¡VICTORIA! Somebody ring the bell!', 'And the crowd goes WILD! That is me. I am the crowd.'], lose: ['Ay! Rematch! I demand a rematch!', 'The bell rang too early. That is my story.'],
    bark: ['¡VAMOS!', 'BOOM!'], partnerBark: ['MINE! MINE! MINE!', 'Coming through!'],
    visit: ['I brought tacos! The kitchen did not want to give them up.', 'Do you ever get scared of the big crowds?', 'Never! The crowd is family!', 'Sometimes. That is why I yell louder.'],
    farewellLow: ['Adiós! Watch for me on TV!'], farewellHigh: ['You are family now. Familia does not say goodbye!'], ending: ['Next year I bring the whole wrestling federation!']
  },
  ingrid: {
    greet: ['It is thirty-one degrees. I am melting. Hello.', 'Hello. I am standing in the shade on purpose.', 'You. Good. I was hoping it was you.'],
    chatLow: ['In Norway this is called "a fever."', 'I wore three layers of sunscreen. I am a ghost now.'],
    chatMid: ['Glíma is wrestling with belts. Volleyball is wrestling with gravity.', 'I sang at the karaoke bar last night. Do not tell anyone.'],
    chatHigh: ['I am starting to like this island. Do not repeat that.', 'If you ever visit Norway, I will show you real weather.'],
    love: ['Snow. Tiny, perfect snow. I may cry.', 'This... this is very kind. I am not melting. It is my eyes.'],
    like: ['Practical. I like that.', 'Thank you. That is sensible.'],
    neutral: ['Hm. Thank you.'],
    refuse: ['Glitter gets everywhere. Everywhere.', 'No. I have standards and they are cold.'],
    suitYes: ['Sporty and sensible. I will wear it.'], suitNo: ['I would rather wear a parka.'],
    inviteYes: ['Agreed. I will block. You will be glad.', 'Fine. Partners. Keep up.'],
    inviteNo: ['I prefer to know someone before I trust them with my spikes.', 'No. Ask me again when it is cooler.'],
    leaveTeam: ['I am changing teams. It is nothing personal. It is strategic.'],
    taunt: ['I am a glacier. You are a beach towel.', 'Your serve will not melt me.'],
    win: ['Expected.', 'Cold. Clean. Correct.'], lose: ['I blame the heat.', 'Hmph. Again. Tomorrow. When it is cloudy.'],
    bark: ['Blocked.', 'Ha.'], partnerBark: ['Mine.', 'Wall.'],
    visit: ['I brought iced coffee. It is the only cold thing on this island.', 'Do you like the heat?', 'I love it.', 'It is fine in the shade.'],
    farewellLow: ['Goodbye. Wear a hat.'], farewellHigh: ['You are... a good friend. I will sing for you. Not now.'], ending: ['I am going home to stand in the snow.']
  },
  amara: {
    greet: ['Hey hey! You hear that? The ocean has rhythm!', 'Babe! Look at you! Beach glow is REAL!', 'My favorite person just walked in! Hi!'],
    chatLow: ['Capoeira is fighting that thinks it is a dance. Or the other way round!', 'I made a playlist for this island. It is called "Sand in My Soul."'],
    chatMid: ['Every match needs a soundtrack. I hum ours while we play!', 'I tried on eleven swimsuits today. Bought none. I am growing!'],
    chatHigh: ['You are like my favorite song. I could play you on repeat!', 'When we win the Cup, we are doing a dance. I already choreographed it.'],
    love: ['Okay. The party starts NOW.', 'Stop it! STOP IT! I love this so much!'],
    like: ['Ooh, cute! Thank you!', 'You have taste, babe!'],
    neutral: ['Aw, thanks! I will find a spot for it.'],
    refuse: ['Snow? Babe, we are in paradise.', 'Hmm, no. That does not spark joy.'],
    suitYes: ['A LOOK! This is a LOOK!'], suitNo: ['Cute, but it is not singing to me.'],
    inviteYes: ['Partners! Let us make some noise!', 'YES! Dream team! Matching sunglasses!'],
    inviteNo: ['Aww, not yet! Let us vibe a little more first.', 'Maybe later, okay? I have a feeling!'],
    leaveTeam: ['Sorry, sorry! My heart picked a new duet.'],
    taunt: ['Hope you can dance, because I am leading!', 'This beat is too fast for you!'],
    win: ['And that is the drop!', 'Encore! Encore!'], lose: ['Okay, okay. Sad song. But a short one.', 'We will remix that one.'],
    bark: ['Yesss!', 'Woo!'], partnerBark: ['I got it!', 'Mine, babe!'],
    visit: ['I brought my speaker! Tiny dance party?', 'Do you dance?', 'All the time!', 'Only when no one is looking.'],
    farewellLow: ['Byeee! Stay groovy!'], farewellHigh: ['You are my best duet partner. Forever. Call me!'], ending: ['I am writing a song about this island!']
  },
  tess: {
    greet: ["G'day! Waves are pumping, sun's out. Life's good, yeah?", 'Oi! There you are! Fancy a hit?', "Mate! Best part of my day, seeing you."],
    chatLow: ['I surfed at dawn. Got dumped twice. Ten out of ten.', 'In MMA you learn to fall. Same on sand. Just softer.'],
    chatMid: ["Reckon Sonny's got a shark in that pool? Asking for a friend.", "I'll race you to the water. Loser buys coconuts."],
    chatHigh: ["You're good people. Proper good.", "When this is over, come surf with me. I'll teach you."],
    love: ['Ohhh, the good stuff! My board says thanks.', 'You absolute legend!'],
    like: ['Beauty! Cheers!', 'Nice one, mate.'],
    neutral: ["Ta. That'll do."],
    refuse: ['Mate, I can barely write my own name.', "Nah, that's not really me."],
    suitYes: ['Ripper of a suit! Wearing it now!'], suitNo: ["Bit fancy for me, mate."],
    inviteYes: ['Partners? Too right!', "Let's go, mate! Easy as!"],
    inviteNo: ["Nah, not yet. Show me what you've got first.", "Maybe later, yeah? No hard feelings."],
    leaveTeam: ["Sorry, mate. Found a better wave."],
    taunt: ["Hope you're ready to eat sand!", "I've been dumped by bigger waves than you."],
    win: ['Get in! Great game!', 'Good match, yeah? Shake on it.'], lose: ['Fair play. You earned it.', 'Cracker of a game. Next time though.'],
    bark: ['Sweet!', 'Yeew!'], partnerBark: ['Mine, mate!', 'Got it!'],
    visit: ['Brought snags. Barbecue is closed, so I improvised.', 'Ever tried surfing?', 'Loads!', 'Never. Teach me?'],
    farewellLow: ["Hooroo! Catch ya."], farewellHigh: ["You're a legend. Come visit. My couch is yours."], ending: ["I'm going to surf until my arms fall off."]
  },
  mei: {
    greet: ['Hehe. Bet you cannot beat me at anything today.', 'Boo! Did I scare you? I did. Admit it.', 'Yay, you are here! Now the day is fun.'],
    chatLow: ['I beat Sonny at xiangqi in four moves. He paid me in ice cream.', 'I hid a rubber crab in Ingrid’s sandal. Shh.'],
    chatMid: ['Wushu is flying. Volleyball is flying with a ball. Easy!', 'I am the smallest, so they underestimate me. Mistake!'],
    chatHigh: ['You are the only one who laughs at my pranks. Best friend!', 'If you ever lose, I will prank the winner for you.'],
    love: ['Solved it. Twice. Got another?', 'Mochi! You know the way to my heart!'],
    like: ['Hehe, nice!', 'Ooh, I like this!'],
    neutral: ['Thanks! I guess!'],
    refuse: ['I do not eat things on sticks that used to have faces.', 'Ew. No. Pass.'],
    suitYes: ['So cute! I am wearing it right now!'], suitNo: ['Hmm, not cute enough. Sorry!'],
    inviteYes: ['Partners! We will win and then I will gloat!', 'Okay! But I get to do the victory flip!'],
    inviteNo: ['Nope! Win my trust first. Hehe.', 'Not yet. Bring snacks next time.'],
    leaveTeam: ['Bye, old partner! New team, new pranks!'],
    taunt: ['I am small but I am FAST!', 'You will not even see me coming. Hehe!'],
    win: ['Hehe! Told you!', 'Victory flip!'], lose: ['No fair! Rematch! Now!', 'I was letting you win. Obviously.'],
    bark: ['Hehe!', 'Ha!'], partnerBark: ['Mine! Mine!', 'Leave it!'],
    visit: ['I brought mochi! I only ate half of them.', 'Want to hear my best prank?', 'Always!', 'Only if it is not on me.'],
    farewellLow: ['Bye! Do not forget me!'], farewellHigh: ['Best friends forever! That is a binding contract!'], ending: ['Next summer I am pranking Sonny. Big time.']
  },
  sonny: {
    matchIntro: ['LADIES AND GENTLEMEN! {a} AGAINST {b}! Place your bets!', 'IT IS SHOWTIME ON SUNSET COURTS, SUNSHINE!', 'Two teams. One ball. INFINITE TAN.'],
    finalIntro: ['THE FORTUNA CUP FINAL! And yes, I am in it. Of COURSE I am in it.', 'Welcome to THE HOUSE, champs. The house ALWAYS wins.'],
    ace: ['ACE! That serve had TAXES on it!', 'ACE! Nobody touched it! Not even the wind!', 'ACE! Somebody check that ball for jet engines!'],
    kill: ['WHAT A SPIKE! Somebody call a lifeguard!', 'KILL! That ball is filing a complaint!', 'BOOM! {name} with the hammer!', 'POW! Right through the front door!'],
    bigSpike: ['That spike broke the SOUND BARRIER, folks!', 'I felt that one in my WALLET!'],
    block: ['BLOCKED! The wall is CLOSED for business!', 'DENIED! Return to sender!', 'STUFFED! Like a holiday turkey!'],
    out: ['OUT! So close, yet so very sandy.', 'Long! That ball wanted a vacation too.'],
    in: ['IN! The sand says yes!', 'Down it goes! Point!'],
    fault: ['FAULT! The ref has spoken. The ref is me.', 'Oof. Rules are rules, CHAMP.'],
    serveFault: ['Into the net! The net thanks you for your donation.', 'Serve fault! Happens to the best of us. Mostly me.'],
    netCord: ['OFF THE TAPE AND OVER! Lady Luck is on the line!', 'Net cord! I LIVE for this!'],
    longRally: ["Long rally, folks. I'm getting a tan just WATCHING.", 'This rally has been going so long I aged!', 'Back and forth! Like my stock portfolio!'],
    matchPoint: ["MATCH POINT! I can't look! ...I'm looking.", 'MATCH POINT! All in! ALL IN!'],
    matchWin: ['WINNERS! {team} take it! Somebody pour the smoothies!', 'GAME, SET, JACKPOT! {team} WIN!'],
    matchLose: ['Tough break, SUNSHINE! The house has noticed. Try again!', 'Down but not out! Spin again tomorrow!'],
    glare: ['FEEL THE GLARE!', 'GOLDEN GLARE! Shield your eyes, SUNSHINE!'],
    pa: ['ATTENTION ISLA FORTUNA! Smoothies are HALF PRICE for the next five minutes!', 'Reminder: the casino is open. ALWAYS. Even now.', 'Has anyone seen my second pair of golden sunglasses? Asking for me.'],
    rainPA: ['LIQUID SUNSHINE, PEOPLE! The matches go on!'],
    welcome: ['WELCOME, FIGHTERS, TO ISLA FORTUNA! The tournament of the century is... drumroll... BEACH VOLLEYBALL!', "And a VACATION! You're welcome!"],
    tutorialLose: ['I let you win! It was a DEMONSTRATION! Of... generosity!'],
    casinoHello: ['CHAMP! Welcome to CASINO FORTUNA! Twenty chips, on the house!', 'Slots, blackjack, roulette. The house always wins. I am the house!'],
    phone: ['...Yeah, I put the island on the Cup. What could go wrong?'],
    dayStart: ['GOOD MORNING, ISLA FORTUNA! Another day in PARADISE!', 'RISE AND SHINE, CHAMPS! The sun is up and so are the stakes!'],
    party: ['FAREWELL PARTY! Fireworks! Dancing! FREE SMOOTHIES! Okay, cheap smoothies!'],
    endingA: ["I'LL BE BACK... NEXT SUMMER!"], endingB: ['Double or nothing! One spin! For the ISLAND!']
  },
  pepper: {
    arrival: ["Villa keys. Sunscreen is in the minibar. The Cup is in five days. Mr. Fortuna is not taking questions.", "Please don't feed him."],
    rules: ['Each day has a morning, an afternoon and a night. Each visit uses one.', 'Win matches for Sonny Dollars. Spend them as you see fit. Within reason.'],
    quip: ['Statistically, that was unwise.', 'The house has noticed.', 'Noted.', 'That will be in my report.', 'The minibar is not free. Nothing here is free.'],
    houseEdge: ["The line is open. I'll take it.", 'Down the line. As planned.'],
    blackjack: ['Blackjack. Congratulations, I suppose.', 'Twenty-one. The house is mildly impressed.'],
    bust: ['Bust. The house thanks you.', 'Over. As predicted.'],
    dealer: ['Place your bet.', 'Cards are dealt with precision. Unlike your volleyball.'],
    seen: ['You heard that. Of course you did.'],
    kind: ['Thank you. That is... unexpectedly decent of you.'], cheeky: ['Then I will be very busy tomorrow.'],
    endingA: ['Breakfast is at eight. The island is under new management.'], endingB: ['The house always wins. I am the house.'],
    letterWelcome: ['Welcome to Isla Fortuna. Matches pay. Friends help. Gifts help friends. The casino helps no one.'],
    letterWarning: ["The Final is tomorrow. Mr. Fortuna's serve is... dazzling. Eyewear is advised. — P."],
    rumor: ['I hear you missed the casino last night. Pity. Mr. Fortuna said something remarkable. — P.']
  },
  kai: { shop: ['Aloha! Snacks, goods, good vibes.', 'Fresh coconuts. I climbed the tree myself.', 'Need a gift? I know everyone\'s favorite.', 'Mahalo! Come back soon.', 'That one is popular today.', 'Can\'t afford it? The sand is free.', 'Gifts are a good way to make friends here.', 'Roulette later? I spin a mean wheel.'],
    croupier: ['Place your chips. The wheel is waiting.', 'No more bets!', 'The ball has spoken.'] },
  odette: { shop: ['Bienvenue to Coral Couture, darling.', 'Fashion is armor with better colors.', 'That cut will turn heads on the court.', 'Ah, a classic. You have an eye.', 'Merci! Wear it proudly.', 'Non, non, darling. You cannot afford that one yet.', 'Try it on. The mirror never lies.', 'New pieces arrive every day. Keep coming back.'] },
  bo: { shop: ['Riptide Sports! Gear up or get dug up!', 'Hydrate. Stretch. Spike. In that order.', 'That suit will shave a tenth off your approach.', 'Back in my day we played in jean shorts.', 'Good buy, champ! Go get them.', 'Short on Sonny Dollars? Win a match, come back.', 'Sport Shades. Very popular this week. No reason.', 'Never trust a serve you cannot see.'] }
};
G.pickLine = (who, key, vars) => {
  const L = G.LINES[who] && G.LINES[who][key]; if (!L || !L.length) return '';
  let s = L[Math.floor(G.rng('cosmetic')() * L.length) % L.length];
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
};

/* ---- Pepper's tutorial tips: functions of the player's input, so the glyphs are the current device's ---- */
G.TUTORIAL_TIPS = {
  receive: I => 'The ring shows where the ball comes down. Stand in it. Press ' + G.btnName('play', I) + ' as the ball reaches you.',
  set: I => 'Your partner passed it to you. ' + G.btnName('play', I) + ' again as it drops, to set her up.',
  attack: I => "She set you. You'll jump on your own. " + G.btnName('play', I) + ' at the top. Push ' + G.btnName('move', I) + (I.lastDevice === 'mouse' ? ' or point the mouse' : '') + ' to aim.',
  free: I => 'Too low to spike. ' + G.btnName('play', I) + ' sends a free ball over.',
  serve: I => G.btnName('play', I) + ' to toss, ' + G.btnName('play', I) + ' again at the top of the toss. ' + G.btnName('shot', I) + ' tosses for a jump serve.',
  block: I => 'When they spike near the net, ' + G.btnName('shot', I) + ' to block.',
  dive: I => 'Out of reach? ' + G.btnName('dive', I) + ' dives.',
  chem: I => G.btnName('call', I) + ' calls "Mine!" or "Yours!". Your partner listens.',
  chemistry: () => 'The better you two get along, the better she plays. Chat. Bring gifts. Win.'
};
G.TUTORIAL_TIPS.dig = G.TUTORIAL_TIPS.receive;

/* ---- letters in the villa mailbox ---- */
G.LETTERS = {
  welcome: { from: 'pepper', title: 'Welcome', day: 1, slot: 2, text: 'Welcome to Isla Fortuna. Matches pay. Friends help. Gifts help friends. The casino helps no one. Sleep is mandatory. Breakfast is optional. — P. Quill, Concierge' },
  flyer: { from: 'sonny', title: 'FREE CHIPS!', day: 2, slot: 0, text: 'FREE CHIPS FOR CHAMPIONS! Come to CASINO FORTUNA tonight! Slots! Cards! The wheel of DESTINY! Ask for Sonny! (I am always there.) — S. FORTUNA, ESQ.' },
  friend: { from: 'best', title: 'A note from a friend', day: 3, slot: 0, text: '' },
  warning: { from: 'pepper', title: 'Advice', day: 4, slot: 0, text: "The Final is tomorrow. Mr. Fortuna's serve is... dazzling. Eyewear is advised. — P." },
  hype: { from: 'sonny', title: 'FINAL HYPE', day: 5, slot: 0, text: 'TODAY! THE FORTUNA CUP FINAL! You versus THE HOUSE! Me! And Pepper! Bring sunglasses! Bring snacks! Bring your A-GAME! — SONNY' },
  rumor: { from: 'pepper', title: 'A rumor', day: 4, slot: 0, text: 'I hear you missed the casino last night. Pity. Mr. Fortuna said something remarkable on the phone. Something about the island. — P.' }
};
G.FRIEND_NOTES = {
  rin: 'I am writing because it is proper. You are a good partner. That is all. (I drew you a crab.) — Rin',
  lola: '¡Compañera! Just writing to say: you are a CHAMPION. Tag team forever! — Lola, La Tormenta',
  ingrid: 'It is still hot. You are still... tolerable. That is high praise. — Ingrid',
  amara: 'Hiii! I made you a playlist! It is called "Best Partner Ever." It is 4 hours long! — Amara xx',
  tess: "G'day! Waves were huge this morning. Thought of you. Want a lesson later? — Tess",
  mei: 'Check your left sandal. Hehe. Just kidding. Or am I? — Mei'
};

/* ---- the invitation ---- */
G.INVITATION = 'You are cordially invited to the AHEAD OR ALIVE Invitational on the private island of Isla Fortuna. Prize: everything. — S. Fortuna, Esq.';

/* ---- How to Play: ten pages, one idea each ---- */
G.HOWTO = [
  { title: 'Moving and the ring', text: I => 'Move with ' + G.btnName('move', I) + '. When the ball is yours, a ring on the sand shows where it comes down. It shrinks as the ball falls and turns gold at the perfect moment.' },
  { title: 'Bump, set, spike', text: I => 'One button plays every touch: ' + G.btnName('play', I) + '. The first touch bumps, the second sets, the third spikes. Three touches a side, never twice in a row.' },
  { title: 'Aiming and shots', text: I => 'Hold a direction as you hit to aim: toward the net for short, away for deep, up or down for the lines' + (I.lastDevice === 'mouse' ? ', or point the mouse at their court' : '') + '. ' + G.btnName('shot', I) + ' plays a cut shot over the block.' },
  { title: 'Serving', text: I => G.btnName('play', I) + ' tosses a float serve; ' + G.btnName('play', I) + ' again at the top of the toss hits it. ' + G.btnName('shot', I) + ' tosses a jump serve: faster, harder to aim.' },
  { title: 'Blocking and diving', text: I => 'When they spike near the net, stand close and press ' + G.btnName('shot', I) + ' to block. Too far from the ball? ' + G.btnName('dive', I) + ' throws you at it.' },
  { title: 'Calls and chemistry', text: I => G.btnName('call', I) + ' calls Mine, Yours or Auto. Your partner plays better the better you get along: hearts on the HUD show it.' },
  { title: 'The vacation', text: () => 'Five days, each a Morning, an Afternoon and a Night. Visiting a place uses the slot. Matches pay Sonny Dollars. The Fortuna Cup final is on Day 5.' },
  { title: 'Friends and gifts', text: () => 'Talk to the others every day. Gifts they love win hearts; gifts they hate come back. Friends team up with you, and play better with you.' },
  { title: 'Casino and Pool Hop', text: () => 'At night the casino opens: slots, blackjack and roulette for chips. By day, Pool Hop at the lagoon: hop the pads on the beat, pressing the button each pad shows.' },
  { title: 'Postcards', text: I => 'Pause and pick Take a Postcard (or press ' + G.btnName('snap', I) + ') to pose everyone, frame the shot and keep it in your album. Set one as the title screen.' }
];
