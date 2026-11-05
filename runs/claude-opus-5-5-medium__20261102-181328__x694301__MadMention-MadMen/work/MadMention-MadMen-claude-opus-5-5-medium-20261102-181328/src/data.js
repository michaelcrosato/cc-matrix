// MAD MENTION: content as data. Cards (insights), days (accounts and clients), dialogue for every colleague on every
// day, the office's objects. A designer adds a day by adding an entry to DAYS and a line per NPC per day.
(() => {
const MM = window.MM = window.MM || {};

// The six appeals. Every insight card carries one; every client objection asks for one; every client has a secret want.
MM.TAGS = {
  NOSTALGIA: { label: 'Nostalgia', color: '#d39a5a', icon: 'clock' },
  STATUS:    { label: 'Status',    color: '#e6c34a', icon: 'star' },
  DESIRE:    { label: 'Desire',    color: '#e0505e', icon: 'heart' },
  FAMILY:    { label: 'Family',    color: '#6cbf72', icon: 'house' },
  FREEDOM:   { label: 'Freedom',   color: '#5aa8ea', icon: 'wing' },
  SAFETY:    { label: 'Safety',    color: '#a48ae0', icon: 'shield' }
};
MM.TAG_KEYS = Object.keys(MM.TAGS);

// Insight cards. power 1-4. line: what Cal says in the pitch. lead: the first sentence of a tagline.
MM.CARDS = {
  photo:      { title: 'The Shoebox', tag: 'NOSTALGIA', power: 3, src: 'A shoebox of snapshots in your bottom drawer.',
    line: "We don't keep photographs to remember what happened. We keep them to remember who we were when it did.", lead: 'Some things you keep.' },
  window:     { title: 'Forty Floors Up', tag: 'FREEDOM', power: 2, src: 'The view from your office window.',
    line: 'From up here the city goes quiet. Everybody wants one minute where the whole world is beneath them.', lead: 'Rise above it.' },
  rye:        { title: 'Rye Before Noon', tag: 'STATUS', power: 2, src: 'The bar cart. Canadian rye, good glass.',
    line: "A man doesn't buy a drink. He buys the room he's allowed to drink it in.", lead: "You've arrived." },
  notebook:   { title: "Bunny's Notebook", tag: 'DESIRE', power: 3, src: 'Bunny Kowalski, junior copywriter.',
    line: "She isn't buying it for him. She's buying it for the woman in the mirror at eleven o'clock at night.", lead: "Be the woman you're looking for." },
  rules:      { title: "Lorraine's Rules", tag: 'STATUS', power: 3, src: 'Lorraine Fairchild runs this floor.',
    line: 'Every woman who walks into a room knows what every other woman is wearing. Be the thing they notice.', lead: 'Be noticed.' },
  warstory:   { title: 'The War Story', tag: 'SAFETY', power: 3, src: 'Hollis Vance, Okinawa, 1945.',
    line: "Men who've been shot at don't want promises. They want a steady hand on the shoulder.", lead: 'Steady hands.' },
  ratings:    { title: "Teddy's Survey", tag: 'STATUS', power: 1, src: 'Teddy Pruitt, accounts. Mimeographed.',
    line: 'Our research shows that people prefer products that are, uh, preferred.', lead: "America's choice." },
  sketch:     { title: "Murray's Sketch", tag: 'DESIRE', power: 2, src: 'Murray Feld, art director.',
    line: "Don't show them the product. Show them the second before they reach for it.", lead: 'Reach for it.' },
  paper:      { title: 'The Morning Edition', tag: 'SAFETY', power: 2, src: "Today's Herald Tribune, folded in thirds.",
    line: "Every headline today is something to be afraid of. Be the one thing in the paper that isn't.", lead: 'Nothing to worry about.' },
  claire:     { title: 'Claire on the Line', tag: 'FAMILY', power: 3, src: 'Your wife, from Ossining.',
    line: "The people who love us don't need the world. They need us to come home with a little piece of it.", lead: 'Come home.' },
  sinatra:    { title: 'Sinatra on the Hi-Fi', tag: 'NOSTALGIA', power: 2, src: 'The creative lounge record player.',
    line: 'A song never takes you anywhere new. It takes you back to the first time you heard it, and who was standing next to you.', lead: 'Remember the song.' },
  crayon:     { title: 'A Crayon Airplane', tag: 'FAMILY', power: 2, src: 'Pinned to the break room board.',
    line: "Every child draws an airplane. Not because they want to leave. Because they want to see where Daddy goes.", lead: 'Bring them along.' },
  dart:       { title: 'The Paper Airplane', tag: 'FREEDOM', power: 3, src: 'Jimmy from the mailroom, on his lunch.',
    line: 'Nobody remembers the first time they rode a train. Everybody remembers the first time they left the ground.', lead: 'Leave the ground.' },
  gus:        { title: "Gus's Elevator", tag: 'SAFETY', power: 1, src: 'Gus has run the car for forty-one years.',
    line: "Forty-one years and Gus has never dropped a soul. People trust a man who shows up.", lead: "Somebody's looking out for you." },
  lipstick:   { title: 'The Sample Tube', tag: 'DESIRE', power: 2, src: 'Belle Rouge No. 7, left on the table.',
    line: "It isn't red. It's the color of a decision.", lead: 'Decide.' },
  tinplane:   { title: 'The Tin Model', tag: 'FREEDOM', power: 2, src: 'A Skyward Constellation, desk model.',
    line: 'Look at it. Even standing still, it looks like it would rather be somewhere else.', lead: 'Go somewhere.' },
  testreel:   { title: 'The Test Reel', tag: 'NOSTALGIA', power: 3, src: "Kinetta's demonstration tray of slides.",
    line: "Strangers' vacation pictures, and still you lean in. Because every one of them looks like a summer you almost had.", lead: 'Every summer you had.' },
  oldaccount: { title: 'The Old Account', tag: 'NOSTALGIA', power: 2, src: 'Hollis, on Skyward in 1948.',
    line: "In 1948 this company sold tickets with a picture of a grandmother waving at a window. They didn't sell flight. They sold arrival.", lead: 'Like it used to be.' },
  portrait:   { title: "The Founder's Portrait", tag: 'STATUS', power: 3, src: 'The oil painting in Hollis\'s office.',
    line: "Every great company has a portrait in the lobby. Every great family has one on the mantel. It's the same picture.", lead: 'Take your place.' },
  firstflight:{ title: "Bunny's First Flight", tag: 'FREEDOM', power: 3, src: 'Bunny, on a trip to Pittsburgh.',
    line: "She didn't care about Pittsburgh. She cared that she was the first woman in her family who ever left.", lead: 'Be the first.' },
  blankpage:  { title: 'The Blank Sky', tag: 'FREEDOM', power: 2, src: 'Murray\'s layout: nothing but clouds.',
    line: 'Give them a sky with nothing in it, and they will put themselves there.', lead: 'Fill in the blank.' },
  kitchen:    { title: 'The Kitchen Table', tag: 'FAMILY', power: 3, src: 'Murray\'s board: a family in projector light.',
    line: 'When was the last time your whole family looked the same direction? This machine does that. Every Sunday night.', lead: 'Gather round.' },
  bigidea:    { title: "Bunny's Big Idea", tag: 'NOSTALGIA', power: 4, src: 'Bunny, up all night.',
    line: "It isn't a gadget. It's a time machine. It doesn't go forward. It goes back, to the places we ache to go again.", lead: 'Go back.' },
  cuff:       { title: 'Off the Cuff', tag: 'STATUS', power: 1, src: 'Nothing prepared. You wing it.',
    line: 'Gentlemen. Ladies. Let me tell you what I see when I look at this.', lead: 'Look closer.' }
};

// The pitch's seven accounts' tails: a tagline = a card's lead + the account's line for another card's appeal.
// Three days in the story. Each: the client, three objections (the appeal each answers), the secret want.
MM.DAYS = [
  { id: 'belle', day: 'MONDAY', date: 'April 6, 1964', account: 'Belle Rouge Cosmetics', product: 'Belle Rouge lipstick', billings: 1.2,
    client: 'voss', second: 'rex', want: 'DESIRE', slides: 'lips', sample: 'lipstick',
    brief: 'Belle Rouge wants out of the drugstore and into the department store. Mrs. Voss built the company after her husband died. The pitch is at two.',
    objections: [
      { tag: 'STATUS', line: 'Every drugstore in America sells a red lipstick. Ours costs a dollar more. Tell me why a girl in Queens should care.' },
      { tag: 'FREEDOM', line: "My husband, God rest him, thought lipstick was for chorus girls. Half the women in this country still married him." },
      { tag: 'DESIRE', line: "Mr. Whitmore, I've heard 'glamour' from six agencies this month. What do you actually want me to say to her?" }
    ],
    tails: { NOSTALGIA: 'Belle Rouge. The red she wore the first time.', STATUS: 'Belle Rouge. Worth the extra dollar.', DESIRE: 'Belle Rouge. Leave a mark.',
      FAMILY: 'Belle Rouge. Mother knew best.', FREEDOM: 'Belle Rouge. Say it without a word.', SAFETY: 'Belle Rouge. It stays where you put it.' },
    greet: ["Mr. Whitmore. My nephew tells me you're the one who doesn't use charts.", "Don't disappoint me. I've had a very long year."],
    win: ["Well. That's the first time this month a man has told me something about women I didn't already know.", 'Rex, write the check.'],
    lose: ["That was very handsome, Mr. Whitmore. So was my husband. I didn't trust him either."] },
  { id: 'skyward', day: 'WEDNESDAY', date: 'April 8, 1964', account: 'Skyward Airlines', product: 'Skyward Airlines', billings: 3.5,
    client: 'ambler', second: 'bert', want: 'FREEDOM', slides: 'plane', sample: 'tinplane',
    brief: 'Skyward lost a plane in Jamaica Bay last spring. Nobody died. Nobody remembers that part. Captain Ambler flew bombers. The pitch is at two.',
    objections: [
      { tag: 'SAFETY', line: 'When one of our Constellations went into Jamaica Bay, the papers ran it nine days straight. Nine days, for a bird that floated.' },
      { tag: 'FAMILY', line: 'Businessmen fly. Their wives stand on the observation deck and wish to God he had taken the train.' },
      { tag: 'FREEDOM', line: "Pan Am promises the world. TWA promises the world. What have you got that's bigger than the world, son?" }
    ],
    tails: { NOSTALGIA: 'Skyward. The way travel used to feel.', STATUS: 'Skyward. First class, every seat.', DESIRE: "Skyward. Somewhere you've always wanted.",
      FAMILY: 'Skyward. Bring everyone home.', FREEDOM: 'Skyward. The sky is the only limit.', SAFETY: 'Skyward. Ten million miles, and counting.' },
    greet: ["Whitmore. Hollis says you're the best he's got. Hollis also said that about the Edsel.", "Let's hear it."],
    win: ["I haven't felt like that since I took a B-17 off the ground at Bassingbourn.", "Bert, call legal. We're staying in the air."],
    lose: ["You sell it nice. But I've been sold nice. I'll take my chances with the boys on Lexington."] },
  { id: 'kinetta', day: 'FRIDAY', date: 'April 10, 1964', account: 'Kinetta Optical', product: 'the Kinetta Circle slide projector', billings: 5.0,
    client: 'pike', second: 'ochs', want: 'NOSTALGIA', slides: 'family', sample: 'testreel',
    brief: "Kinetta's new projector holds eighty slides in a ring. The engineers want the word 'revolution' in the copy. Five million in billings. The pitch is at two.",
    objections: [
      { tag: 'STATUS', line: "Bell and Lowe's machine is nine dollars cheaper, and their name is on every schoolroom in Ohio." },
      { tag: 'FAMILY', line: "Fathers buy gadgets. Mr. Ochs and I would like very much to sell this gadget to fathers." },
      { tag: 'NOSTALGIA', line: "Our engineers want 'revolution' in it. It's new. It's technology. Isn't new what sells, Mr. Whitmore?" }
    ],
    tails: { NOSTALGIA: 'Kinetta Circle. Go back to where you were loved.', STATUS: 'Kinetta Circle. The best seat in the living room.', DESIRE: 'Kinetta Circle. See it all again.',
      FAMILY: 'Kinetta Circle. Every face you love, eight feet tall.', FREEDOM: 'Kinetta Circle. Take your summer anywhere.', SAFETY: 'Kinetta Circle. Your memories, kept safe.' },
    greet: ["Mr. Whitmore. Mr. Ochs designed the tray. He would appreciate it if you didn't call it a wheel.", 'Shall we?'],
    win: ['...', "Mr. Ochs is crying. I've known him nineteen years. I didn't know he could do that.", 'You have the account.'],
    lose: ['Thank you, Mr. Whitmore. We will be in touch, in the manner in which people say that.'] }
];

// People. pitch = their voice's pitch (Hz) for the Simlish; look = Humanoid options.
MM.PEOPLE = {
  cal:     { name: 'CAL WHITMORE', pitch: 120, look: { build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { coat: '#2b313d', cloth: '#ecebe2', pants: '#2b313d', hair: '#17110c', boot: '#140f0c', belt: '#1a1a1a', trim: '#7a2a2a', skin: '#e8b892' } } },
  hollis:  { name: 'HOLLIS VANCE', pitch: 100, look: { build: 'bulky', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { coat: '#6a6a72', cloth: '#f2efe6', pants: '#5a5a62', hair: '#e2e2e2', boot: '#2a1a12', trim: '#2a3a6a', skin: '#efc0a0' } } },
  bunny:   { name: 'BUNNY KOWALSKI', pitch: 250, look: { build: 'heroic', outfit: 'robe', hair: 'ponytail', sleeves: 'long', colors: { cloth: '#7a8a5a', hair: '#8a5a32', boot: '#3a2a1a', belt: '#3a3a2a', skin: '#f0c8a4' } } },
  lorraine:{ name: 'LORRAINE FAIRCHILD', pitch: 210, look: { build: 'heroic', outfit: 'robe', hair: 'long', sleeves: 'short', colors: { cloth: '#1f6a62', hair: '#c4421c', boot: '#1a1210', belt: '#d4b44a', skin: '#f4d0b4' } } },
  teddy:   { name: 'TEDDY PRUITT', pitch: 150, look: { build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { coat: '#2e4470', cloth: '#dfe6f0', pants: '#2e4470', hair: '#b08a4a', boot: '#2a1a12', trim: '#c8a030', skin: '#f2c8a6' } } },
  murray:  { name: 'MURRAY FELD', pitch: 135, look: { build: 'bulky', outfit: 'shirt', hair: 'short', sleeves: 'long', colors: { cloth: '#d8c27a', pants: '#5a4a3a', hair: '#2a2420', boot: '#2a1a12', skin: '#e0b088' } } },
  dot:     { name: 'DOT', pitch: 270, look: { build: 'heroic', outfit: 'robe', hair: 'short', sleeves: 'short', colors: { cloth: '#d88aa0', hair: '#3a2a1a', boot: '#3a2a20', skin: '#f2cfb2' } } },
  fran:    { name: 'FRAN', pitch: 230, look: { build: 'heroic', outfit: 'robe', hair: 'long', sleeves: 'short', colors: { cloth: '#e8d27a', hair: '#e8d08a', boot: '#3a2a20', skin: '#f6d6be' } } },
  gus:     { name: 'GUS', pitch: 90, look: { build: 'bulky', outfit: 'coat', hair: 'short', hat: 'cap', sleeves: 'long', colors: { coat: '#6a1e24', cloth: '#e8e0d0', pants: '#2a1a1a', hair: '#9a9a9a', trim: '#d4b04a', boot: '#1a1210', skin: '#8a5a3a' } } },
  jimmy:   { name: 'JIMMY', pitch: 190, look: { build: 'chibi', outfit: 'shirt', hair: 'spiky', sleeves: 'short', colors: { cloth: '#e8e8f0', pants: '#4a4a5a', hair: '#c46a2a', skin: '#f4d0b0' } } },
  claire:  { name: 'CLAIRE', pitch: 220, look: { build: 'heroic', outfit: 'robe', hair: 'long', colors: { cloth: '#8ab4d8', hair: '#e8cc7a', skin: '#f6d6be' } } },
  voss:    { name: 'MRS. VOSS', pitch: 180, look: { build: 'heroic', outfit: 'robe', hair: 'long', sleeves: 'long', colors: { cloth: '#4a2a5a', hair: '#cfcfd8', boot: '#1a1018', belt: '#c8b04a', skin: '#efd0ba' } } },
  rex:     { name: 'REX VOSS', pitch: 140, look: { build: 'heroic', outfit: 'coat', hair: 'short', colors: { coat: '#7a6a4a', cloth: '#f0ecdc', pants: '#5a4a32', hair: '#3a2a1a', skin: '#f0c8a6' } } },
  ambler:  { name: 'CAPT. AMBLER', pitch: 95, look: { build: 'bulky', outfit: 'coat', hair: 'short', hat: 'cap', colors: { coat: '#1e2a48', cloth: '#f0f0f0', pants: '#1e2a48', hair: '#7a7a7a', trim: '#d8b84a', skin: '#d8a882' } } },
  bert:    { name: 'BERT', pitch: 145, look: { build: 'heroic', outfit: 'coat', hair: 'short', colors: { coat: '#5a5048', cloth: '#efe8d8', pants: '#4a4038', hair: '#5a3a1a', skin: '#f0c8a6' } } },
  pike:    { name: 'MR. PIKE', pitch: 105, look: { build: 'bulky', outfit: 'coat', hair: 'bald', colors: { coat: '#4a3a2a', cloth: '#f0e8d8', pants: '#3a2a1a', skin: '#e8b898' } } },
  ochs:    { name: 'MR. OCHS', pitch: 160, look: { build: 'heroic', outfit: 'coat', hair: 'short', colors: { coat: '#4a5a4a', cloth: '#e8eadc', pants: '#3a4a3a', hair: '#8a8a7a', skin: '#ecc4a4' } } }
};

// Who stands where each morning (tile cells), and what they say. A talk: { lines, ask: { q, choices: [{ text, then }] } }
// The handlers are written in game.js (they change the state); this file keeps the words.
MM.TALK = {
  hollis: [
    { lines: ['Cal. Sit down. You look like a man who has not had a drink yet.', "Mrs. Voss buried her husband and kept his company. Do not call her 'sweetheart'. Teddy did. Teddy is lucky to have teeth."],
      choices: ['Pour me one.', "It's nine-thirty, Hollis."],
      yes: ['That a boy.', 'In Okinawa I had a sergeant who never once said it would be fine. He just put his hand on your shoulder. Best ad I ever saw.'],
      no: ['Suit yourself. Temperance is a lovely quality in a pallbearer.'] },
    { lines: ['Skyward. Russ Ambler flew bombers over Germany, and he can smell fear on a man like aftershave.', 'We had them once, you know. Before your time.'],
      choices: ['Tell me about the old account.', 'Any advice?'],
      yes: ['1948. We ran a picture of a grandmother waving from a window. One line. "She came home." Best year they ever had.'],
      no: ['Advice? Never let them see you want it. And never fly Skyward. I am kidding. Mostly.'] },
    { lines: ['Five million in billings, Cal. If Kinetta walks, we are subletting the twenty-third floor to a dentist.', 'Drink?'],
      choices: ['Pour me one.', "I've got it handled."],
      yes: ['See that portrait? My father. He started this firm in a coat closet. You know what he sold? Him. Same as you.'],
      no: ["That's my boy. Go get them."] }
  ],
  bunny: [
    { lines: ['Mr. Whitmore? I had a thought about Belle Rouge.', "Women don't wear lipstick for men. Not really. They wear it for the mirror, at the end of the day, when nobody's looking."],
      choices: ["That's good, Bunny. Put your name on it.", "I'll take it from here."],
      yes: ['...Thank you. Cal.'], no: ['Of course. Mr. Whitmore.'] },
    { lines: ['I flew once. To Pittsburgh, for my cousin\'s wedding.', "I didn't care about Pittsburgh. I cared that I was the first girl in my family who ever left the ground."],
      choices: ['Write that down. All of it.', 'Stick to the copy, Bunny.'],
      yes: ["I already did. It's on your desk. Under the ashtray."], no: ['Right. The copy.'] },
    { lines: ["I've been here all night. Don't tell Lorraine.", "Slides aren't a gadget, Cal. They're a time machine. It doesn't go forward. It goes back."],
      cold: ["I'm on Heinz now, Mr. Whitmore. Mr. Pruitt said you wouldn't need me for Kinetta."] }
  ],
  murray: [
    { lines: ["Don't show the lipstick. Show the second before she reaches for it.", "The hand. The mirror. A clock on the wall that says eleven. I've got it in charcoal."] },
    { lines: ['Clouds. A big empty sky. Nothing in it.', "Everybody wants a plane in the ad. I want a hole in the ad the size of a person."] },
    { lines: ['I drew the family at the kitchen table, lit by the projector.', 'Everybody looking the same direction. When was the last time your family looked the same direction, Cal?'] }
  ],
  lorraine: [
    { lines: ['Good morning, Mr. Whitmore. Your coffee is on your desk and your wife called. Twice.'], choices: ['What does Mrs. Voss want?', 'How do I look?'],
      yes: ["She came up through the switchboard at Bonwit Teller's. She has been respectable, Cal. She is tired of it.", 'She wants to be wanted.'],
      no: ['Like a man who slept on his sofa. Third drawer of your credenza. Fresh shirt. You are welcome.'] },
    { lines: ['Captain Ambler is in at two. Bert, his money man, is allergic to cigarettes, so naturally Hollis will smoke.'], choices: ['What does Ambler want?', 'How do I look?'],
      yes: ["He doesn't want to be safe, Cal. Nobody who flew a B-17 wants to be safe.", 'He wants to be back up there.'],
      no: ['Rested. It is very suspicious.'] },
    { lines: ["Mr. Pike and Mr. Ochs. I have put out the good ashtrays and hidden the bad sherry."], choices: ['What does Pike want?', 'How do I look?'],
      yes: ['He keeps a photograph of a house in Wichita on his desk. His secretary says it burned down in 1941.', 'He wants to go home, Cal.'],
      no: ['Like five million dollars. Try not to sweat on it.'] }
  ],
  teddy: [
    { lines: ['Cal, buddy. Let me sit in on Belle Rouge.', 'Mrs. Voss loves me. I remind her of her son. Her son is in a sanitarium in Connecticut, but still.'], choices: ["Fine. Don't talk.", 'Not a chance, Teddy.'],
      yes: ["You won't regret it. She'll ask why it costs a dollar more. She always does. Here, take my survey."], no: ['Fine. Fine! Take my survey anyway. I am a team player.'] },
    { lines: ["Ambler is a war hero, Cal. Lead with the war. Medals. Flags.", 'Let me in the room. I speak pilot.'], choices: ["Fine. Don't talk.", 'Not a chance, Teddy.'],
      yes: ["Wives, Cal. He'll bring up the wives. Bert told me at the Yale Club."], no: ['You know what, Cal? Someday.'] },
    { lines: ["Pike wants a revolution. Give him a revolution! Rockets! The space age!", 'Let me in. I have a slide with a rocket on it.'], choices: ["Fine. Don't talk.", 'Not a chance, Teddy.'],
      yes: ["He's going to say 'revolution'. Third thing he says. Watch."], no: ['I am going to Hollis about this. I am going to Hollis right now.'] }
  ],
  dot: [
    { lines: ["The girls in the steno pool buy their lipstick at Woolworth's.", "They'd pay a dollar more if it made them feel like they work on the fortieth floor instead of the steno pool."] },
    { lines: ["My husband won't fly. He says if God wanted him up there he'd have given him a better pension."] },
    { lines: ['My father had a projector. Every Christmas, the same slides of Lake Erie.', "We'd beg him to stop. He's gone now. I'd give anything for one more Lake Erie."] }
  ],
  fran: [
    { lines: ["Did you hear? Mrs. Voss's late husband called her 'the chorus girl'. At their wedding. In his toast.", "That's what she'll bring up. Mark my words."] },
    { lines: ["Captain Ambler's wife hasn't been on one of his planes since the Jamaica Bay thing.", "That's what's really eating him, you ask me."] },
    { lines: ['Mr. Ochs was asking the girls which projector their fathers had.', "None of us knew. We just remembered the pictures."] }
  ],
  gus: [
    { lines: ['Morning, Mr. Whitmore. Fortieth floor, same as always.', "Forty-one years I've run this car. Never dropped a soul."] },
    { lines: ["Big day? You got the look. My wife's got the same look before she visits her sister."] },
    { lines: ["Friday. The Kinetta fellows came up early. Little one held that box like it was a baby."] }
  ],
  jimmy: [
    null,
    { lines: ['Watch this, Mr. Whitmore!', '...It went all the way to Mr. Pruitt\'s door. Nobody remembers their first train ride, but I remember my first paper airplane.'] },
    { lines: ["I'm saving for a camera. A real one. So I can take pictures of my ma before she gets old."] }
  ],
  claire: [
    { lines: ["Cal? Sally lost a tooth. She wants you to see it before it goes under the pillow."], choices: ["I'll be home for supper.", "I've got a pitch, Claire."],
      yes: ["Six-thirty. Don't make me a liar."], no: ['You always have a pitch.'] },
    { lines: ["Your mother called. She'd like to know if you're dead or just in advertising."], choices: ["Tell her I love her.", "Not now, Claire."],
      yes: ['I will. You could tell her yourself. Novel idea.'], no: ['It is never now.'] },
    { lines: ["The children made you a card. It says 'Good luck Daddy' with three O's in 'good'."], choices: ['Put it on the fridge. I\'ll see it tonight.', "I'm in a meeting."],
      yes: ['It is already on the fridge. Good luck, Daddy.'], no: ['You are always in a meeting, Cal.'] }
  ]
};

// The evening's choice and the epilogue's lines.
MM.EVENING = {
  q: 'Five-fifteen. The elevator is full of hats.',
  choices: ['Take the 6:10 home to Ossining.', 'The Lantern Bar with Hollis.'],
  home: ['The train smells like wet wool and cigars. Sally is asleep when you get in. Her tooth is on the nightstand, in an envelope with your name on it.'],
  bar: ['Hollis orders two of everything. A woman at the end of the bar laughs at something you said, and you cannot for the life of you remember what it was.']
};
})();
