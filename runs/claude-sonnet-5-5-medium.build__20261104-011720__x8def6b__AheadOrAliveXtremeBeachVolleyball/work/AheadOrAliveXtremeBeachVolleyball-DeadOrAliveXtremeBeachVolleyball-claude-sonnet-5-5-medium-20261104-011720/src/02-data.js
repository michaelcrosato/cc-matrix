/* 02-data: cast, items, places, calendar, text. Adding a fighter, a shop or a day is a data edit plus art. */

/* ---- the cast ---- */
G.CAST = {
  you: { id: 'you', name: 'JO', full: 'Jo Ryder', style: 'Street brawler', tag: 'You', skin: '#e0a878', hair: '#3a2a1e', hairStyle: 'spiky', cloth: '#ff8a3a', pants: '#2a8fc8',
    stats: { power: 3, speed: 3, receive: 3, set: 3 }, voice: { base: 190, spread: .3, speed: 1, wave: 'triangle' } },
  mika: { id: 'mika', name: 'MIKA', full: 'Mika "Typhoon" Shiranui', style: 'Karate prodigy', tag: 'Partner', skin: '#f0c49a', hair: '#e8742a', hairStyle: 'ponytail', cloth: '#ff5e7a', pants: '#fff2d6',
    stats: { power: 4, speed: 4, receive: 3, set: 3 }, voice: { base: 330, spread: .35, speed: 1.1, wave: 'square' },
    bio: 'Won her first trophy at nine and has been a little bit loud about it ever since. Believes every problem is a kata you have not finished.',
    loves: ['sweet', 'sport'], likes: ['charm'], dislikes: ['fashion'], start: 25 },
  hana: { id: 'hana', name: 'HANA', full: 'Hana Fujimori', style: 'Runaway ninja', tag: 'Partner', skin: '#f2d2b0', hair: '#1c1c34', hairStyle: 'long', cloth: '#6a4adb', pants: '#2c2c4a',
    stats: { power: 2, speed: 5, receive: 4, set: 4 }, voice: { base: 400, spread: .2, speed: .9, wave: 'sine' },
    bio: 'Left the clan after a disagreement about sunscreen. Appears behind you at no point, which is somehow worse.',
    loves: ['charm', 'luck'], likes: ['sweet'], dislikes: ['sport'], start: 10 },
  gwen: { id: 'gwen', name: 'GWEN', full: 'Gwen Ashby', style: 'Southpaw boxer', tag: 'Partner', skin: '#e8b890', hair: '#c2b068', hairStyle: 'short', cloth: '#2fb0a0', pants: '#f4f4ee',
    stats: { power: 5, speed: 2, receive: 3, set: 2 }, voice: { base: 250, spread: .25, speed: .85, wave: 'triangle' },
    bio: 'Undefeated, unbothered, and deeply suspicious of anything described as "fun". Hides a plush pineapple in her kit bag.',
    loves: ['fashion', 'luck'], likes: ['sport'], dislikes: ['sweet'], start: 15 },
  ruby: { id: 'ruby', name: 'RUBY', full: 'Ruby Delacroix', style: 'Pro wrestler', tag: 'Rival', skin: '#b87a52', hair: '#d41e5a', hairStyle: 'spiky', cloth: '#ffcf33', pants: '#d41e5a',
    stats: { power: 5, speed: 2, receive: 2, set: 2 }, voice: { base: 160, spread: .4, speed: 1.2, wave: 'saw' }, bio: 'Announces her own entrances. Hits the ball like it owes her rent.', start: 0 },
  tomo: { id: 'tomo', name: 'TOMO', full: 'Tomo "Tiger" Okabe', style: 'Muay Thai', tag: 'Rival', skin: '#d8a070', hair: '#101010', hairStyle: 'spiky', cloth: '#30c070', pants: '#f0f0f0',
    stats: { power: 3, speed: 5, receive: 4, set: 2 }, voice: { base: 210, spread: .45, speed: 1.4, wave: 'square' }, bio: 'Cannot stand still. Has never once finished a sentence that did not end in a stretch.', start: 0 },
  ines: { id: 'ines', name: 'INES', full: 'Ines Vanterpool', style: 'Capoeira dancer', tag: 'Rival', skin: '#9a6a48', hair: '#2a1a14', hairStyle: 'long', cloth: '#ff9a2a', pants: '#8a2ad0',
    stats: { power: 3, speed: 4, receive: 4, set: 5 }, voice: { base: 300, spread: .5, speed: 1, wave: 'triangle' }, bio: 'Treats every rally as a duet. Will absolutely tell you your footwork is "interesting".', start: 0 },
  sonny: { id: 'sonny', name: 'SONNY', full: 'Sonny Fortuna, Esq.', style: 'Jackpot billionaire', tag: 'Host', skin: '#e2b088', hair: '#f4f0e8', hairStyle: 'short', cloth: '#18c0b8', pants: '#fff2d6',
    stats: { power: 3, speed: 2, receive: 3, set: 4 }, voice: { base: 140, spread: .35, speed: 1.15, wave: 'sine' }, bio: 'Owns the island, the casino, and a surprisingly large collection of shirts.', start: 0 },
  pepper: { id: 'pepper', name: 'PEPPER', full: 'Pepper Quill', style: 'Deadpan concierge', tag: 'Host', skin: '#d6a07c', hair: '#4a2a1a', hairStyle: 'ponytail', cloth: '#f4f4ee', pants: '#1a1a2a',
    stats: { power: 2, speed: 5, receive: 5, set: 3 }, voice: { base: 280, spread: .1, speed: .8, wave: 'sine' }, bio: 'Hands out villa keys and sunscreen with the same expression she uses for catastrophes.', start: 0 }
};
G.PARTNERS = ['mika', 'hana', 'gwen'];
G.LABELS = { sweet: 'Sweets', sport: 'Sports', charm: 'Charms', fashion: 'Fashion', luck: 'Luck' };

/* ---- items ---- */
G.SUITS = [
  { id: 'coral', name: 'Coral Reef', top: '#ff6f61', bottom: '#ffd3b0', price: 0 },
  { id: 'sunset', name: 'Sunset Stripe', top: '#ff9a3c', bottom: '#d6336c', price: 600 },
  { id: 'lagoon', name: 'Midnight Lagoon', top: '#1d3b8a', bottom: '#2fb0c8', price: 800 },
  { id: 'lemon', name: 'Lemon Fizz', top: '#ffe14a', bottom: '#ffffff', price: 700 },
  { id: 'hibiscus', name: 'Hibiscus Hello', top: '#e8317a', bottom: '#3fbf6a', price: 900 },
  { id: 'pearl', name: 'Pearl Diver', top: '#f4f1ea', bottom: '#9fd7e8', price: 1100 },
  { id: 'neon', name: 'Neon Tide', top: '#2aff9a', bottom: '#b22aff', price: 1400 },
  { id: 'mango', name: 'Mango Madness', top: '#ffa514', bottom: '#4cb050', price: 1200 },
  { id: 'star', name: 'Starfish', top: '#f2705e', bottom: '#f6d86b', price: 1500 },
  { id: 'sea', name: 'Sea Glass', top: '#8fe3c8', bottom: '#4a8fd0', price: 1800 },
  { id: 'black', name: 'Black Sand', top: '#26262e', bottom: '#8a8aa0', price: 2200 },
  { id: 'jackpot', name: 'Jackpot Gold', top: '#ffd24a', bottom: '#c0392b', price: 4000 }
];
G.HATS = [
  { id: 'none', name: 'No hat', price: 0, style: null },
  { id: 'band', name: 'Sweat band', price: 150, style: 'band', color: '#ffffff' },
  { id: 'cap', name: 'Sunny cap', price: 300, style: 'cap', color: '#ffcf33' },
  { id: 'crown', name: 'Beach crown', price: 1500, style: 'crown', color: '#ffd24a' }
];
G.GIFTS = [
  { id: 'smoothie', name: 'Coconut Smoothie', cat: 'sweet', price: 80, pts: 6 },
  { id: 'taffy', name: 'Saltwater Taffy', cat: 'sweet', price: 60, pts: 5 },
  { id: 'foam', name: 'Foam Finger', cat: 'sport', price: 120, pts: 6 },
  { id: 'gloves', name: 'Mini Boxing Gloves', cat: 'sport', price: 220, pts: 8 },
  { id: 'shell', name: 'Seashell Charm', cat: 'charm', price: 140, pts: 7 },
  { id: 'moon', name: 'Moonlight Bracelet', cat: 'charm', price: 300, pts: 9 },
  { id: 'aloha', name: 'Pocket Aloha Shirt', cat: 'fashion', price: 200, pts: 7 },
  { id: 'shades', name: 'Gold Sunglasses', cat: 'fashion', price: 420, pts: 10 },
  { id: 'dice', name: 'Lucky Dice', cat: 'luck', price: 160, pts: 7 },
  { id: 'chip', name: 'Golden Chip', cat: 'luck', price: 400, pts: 10 }
];

/* ---- places and calendar ---- */
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
G.PLACES = {
  courts: { id: 'courts', name: 'Sunset Courts', blurb: 'Sand, nets and a lot of confidence.', mx: 0.18, my: 0.32 },
  pool: { id: 'pool', name: 'Lagoon Pool', blurb: 'Warm water, cold drinks, lily pads.', mx: 0.62, my: 0.18 },
  promenade: { id: 'promenade', name: 'Fortuna Promenade', blurb: 'Shops, smoothies and a statue of Sonny.', mx: 0.44, my: 0.62 },
  villa: { id: 'villa', name: 'Your Villa', blurb: 'A bed, a closet and a very honest mirror.', mx: 0.82, my: 0.52 },
  casino: { id: 'casino', name: 'Casino Fortuna', blurb: 'Open at night. The house loves you.', mx: 0.3, my: 0.86, night: true }
};
G.DAYS = [
  { n: 1, title: 'Arrival', weather: 'sunny' },
  { n: 2, title: 'Qualifier Day', weather: 'sunny' },
  { n: 3, title: 'Semifinal Day', weather: 'cloudy' },
  { n: 4, title: 'The Reveal', weather: 'sunny' },
  { n: 5, title: 'Fortuna Cup', weather: 'sunny' }
];
// the story lock: which slot a match is forced into
G.STORY_SLOTS = {
  '1:0': 'arrival', '1:1': 'welcome', '2:1': 'qualifier', '3:1': 'semifinal', '4:2': 'reveal', '5:1': 'final', '5:2': 'party'
};

/* ---- text: lines are in the source's tone: breezy, overconfident, wink-wink ---- */
G.TEXT = {
  invitation: [
    'You are cordially invited to the AHEAD OR ALIVE Invitational, on the private island of Isla Fortuna.',
    'Prize: everything. Dress code: toughness. -- S. Fortuna, Esq.'
  ],
  arrival: [
    ['PEPPER', 'Welcome to Isla Fortuna. Your villa key, your sunscreen, and a form waiving your right to be surprised.'],
    ['SONNY', 'Fighters! Friends! Tanned people! Change of plans: the tournament is a vacation, and the vacation is a volleyball cup!'],
    ['JO', 'Volleyball. We came here to brawl.'],
    ['SONNY', 'And you shall! Politely! Over a net! Five days, one Fortuna Cup, and a casino that never closes. After dark. Which is not never. Details.'],
    ['PEPPER', 'The nets are at Sunset Courts. The sunscreen is at your elbow. Please use both.']
  ],
  welcome: [
    ['SONNY', 'A welcome match! You and Mika, against myself and Pepper. Do not worry, I only cheat in the casino.'],
    ['MIKA', 'Two against two! One button, good timing, big spikes! You and me, Jo!'],
    ['PEPPER', 'Mr. Fortuna has never won a point he did not buy.']
  ],
  welcomeWin: [['SONNY', 'Magnificent! I demand a rematch, but also I am delighted. Both. At the same time.'], ['MIKA', 'Best partners ever! ...Probably. We should chat more.']],
  welcomeLose: [['SONNY', 'The score does not matter! The vacation is the real winner! ...The score matters a little.'], ['MIKA', 'We will get them next time.']],
  pickPartner: [['PEPPER', 'The Cup is two-on-two. Choose a partner. I recommend someone who likes you. Or sunscreen.']],
  qualifier: [['RUBY', 'RUBY DELACROIX! AND HER LITTLE FRIEND TOMO! WE ARE YOUR QUALIFIER!'], ['TOMO', 'Hi! Sorry! Stretching!']],
  qualWin: [['RUBY', 'I demand a recount!'], ['PEPPER', 'There is no recount. There is a smoothie.']],
  qualLose: [['RUBY', 'THAT IS HOW IT IS DONE!'], ['PEPPER', 'The loss is not final. Only the sunburn is.']],
  semifinal: [['INES', 'Dance with me, then. Try to keep up with the rhythm.'], ['SONNY', 'Semifinal! The crowd is here! Both of them!']],
  semiWin: [['INES', 'Interesting footwork after all.'], ['SONNY', 'To the final! The Fortuna Cup awaits!']],
  semiLose: [['INES', 'You were close. In a fun way.'], ['PEPPER', 'The Cup is gone. The buffet is not.']],
  reveal: [
    ['PEPPER', 'There is something I should mention. Mr. Fortuna has bet the island itself on the final.'],
    ['SONNY', 'Pepper! That was a SURPRISE. ...Yes. I did. The House always wins, so I thought: why not be the House.'],
    ['JO', 'You bet the island on volleyball.'],
    ['SONNY', 'On you! Probably against you. We shall see.']
  ],
  final: [
    ['SONNY', 'THE FORTUNA CUP! Against THE HOUSE: myself, Pepper, and a ball that does exactly what the casino wants!'],
    ['PEPPER', 'Special rules: the ball is occasionally lucky. Please do not take it personally.']
  ],
  finalWin: [['SONNY', 'You... won. The island is yours. I am, for the first time, free. Is this what sand feels like?'], ['PEPPER', 'It is customary to say thank you.']],
  finalLose: [['SONNY', 'The House wins! ...and I keep the island! Which, thanks to you, I will now throw a party on.'], ['PEPPER', 'You played well. Please do not tell him I said that.']],
  party: [
    ['SONNY', 'Farewell party! Fireworks, tropical punch, and a toast to every one of you!'],
    ['PEPPER', 'Please remember your sunscreen. And your dignity. In that order.']
  ],
  idle: ['Sunshine, sand and a mild threat of volleyball.', 'The sea is blue. The scoreboard is blue. Everything is blue.', 'Remember to reapply sunscreen between spikes.'],
  commentary: {
    point: ['What a rally!', 'Pepper, did you see that?', 'The crowd goes mildly wild!', 'Sunshine and spikes!'],
    ace: ['ACE! Right through the sunscreen!', 'A serve like a tropical storm!'],
    spike: ['Boom! Right off the sand!', 'That spike has a mortgage on it!'],
    block: ['BLOCKED! Not today!', 'A wall of tan lines!'],
    dive: ['Digging deep! Literally!', 'A gorgeous dive!'],
    fault: ['A fault! The ball was somewhere else!', 'Out! The sea takes it!']
  },
  vacationEnd: 'Five days on Isla Fortuna. The tans fade; the story does not.'
};

/* ---- how to play pages and about texts ---- */
G.HOWTO = [
  ['THE GOAL', ['Win 2-on-2 beach volleyball. First side to the points limit (7 by default, win by 2) takes the match.', 'The ball may touch your side up to three times: bump, set, then spike or send it over.']],
  ['ONE BUTTON', ['PLAY does it all: serve, bump, set, spike. A ring closes on the sand under the ball; press PLAY when it shrinks to the player. PERFECT timing means sharper balls.', 'Hold the stick toward where you want the ball to go. With a mouse, point.']],
  ['DIVE, CALL, BLOCK', ['DIVE reaches wide balls, but you lie on the sand for a moment.', 'CALL shouts "Mine!" so your partner backs off. Near the net, PLAY when the ball is being attacked jumps to block.']],
  ['THE VACATION', ['Five days. Each has a morning, an afternoon and a night. Visiting a place spends the slot.', 'Friendship with your partner improves their volleyball. Chat, give gifts, and avoid things they dislike.']],
  ['MONEY AND STYLE', ['Win matches and Pool Hop, or try your luck at Casino Fortuna after dark.', 'Spend S$ on swimsuits, hats and gifts. The wardrobe at your villa dresses you for the court.']],
  ['EVERYWHERE ELSE', ['Beach Match is quick play for 1 to 4 local players, each on a pad or on the keyboard halves.', 'Dev mode lives in the pause menu: tools and balance sliders. Photo mode takes postcards.']]
];
