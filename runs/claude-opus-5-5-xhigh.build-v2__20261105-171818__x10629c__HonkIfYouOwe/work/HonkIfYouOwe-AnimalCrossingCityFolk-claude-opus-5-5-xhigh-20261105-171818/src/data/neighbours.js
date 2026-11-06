// The neighbours, as data. Adding one needs only an entry here, a critter spec and a line bank.
export const NEIGHBOURS = {
  dorrit: { name: 'Dorrit', species: 'wombat', type: 'hearth', tic: 'mmhm', building: 'dorrit', wake: 6, sleep: 21, loves: ['soupy', 'mushroom', 'fish', 'fruit', 'kitchen'], hates: ['loud'], room: { wall: 'wall-cream', floor: 'floor-kitchen', style: 'kitchen' } },
  tavi: { name: 'Tavi', species: 'quokka', type: 'sunshine', tic: "isn't it?!", building: 'tavi', wake: 6, sleep: 22, loves: ['loud', 'fruit', 'flower', 'toy', 'plain', 'leafy'], hates: [], room: { wall: 'wall-cheese', floor: 'floor-sandy', style: 'yellow' } },
  bartleby: { name: 'Bartleby', species: 'moose', type: 'grouch', tic: "I'd prefer not.", building: 'bartleby', wake: 7, sleep: 22, loves: ['sapling', 'drab', 'plain', 'oddity', 'plant'], hates: ['loud', 'dramatic', 'toy'], room: { wall: 'wall-stone', floor: 'floor-ash', style: 'bare' } },
  ottoline: { name: 'Lady Ottoline', short: 'Ottoline', species: 'platypus', type: 'diva', tic: 'darling dear', building: 'ottoline', wake: 10, sleep: 23, loves: ['dramatic', 'formal', 'couture', 'art', 'shell', 'money'], hates: ['damp', 'drab', 'practical'], room: { wall: 'wall-regal', floor: 'floor-carpet-red', style: 'faded' } },
  rocco: { name: 'Rocco', species: 'armadillo', type: 'goGetter', tic: "let's roll!", building: 'rocco', wake: 5, sleep: 21, loves: ['fish', 'sporty', 'trophy', 'bug'], hates: ['sleepy', 'cosy'], room: { wall: 'wall-brick', floor: 'floor-gym', style: 'gym' } },
  nib: { name: 'Nib', species: 'lemur', type: 'dreamer', tic: '…or so the moon says', building: 'nib', wake: 11, sleep: 28, loves: ['bug', 'sleepy', 'oddity', 'star'], hates: ['electronics', 'clock', 'sporty'], room: { wall: 'wall-night', floor: 'floor-ash', style: 'books' } },
  ozzie: { name: 'Ozzie', species: 'possum', type: 'schemer', tic: "You didn't hear it from me.", building: 'ozzie', wake: 7, sleep: 24, loves: ['cheese', 'clutter', 'gift', 'gross', 'oddity'], hates: ['money', 'formal'], room: { wall: 'wall-mud', floor: 'floor-oak', style: 'corkboard' } },
  yolanda: { name: 'Yolanda', species: 'yak', type: 'auntie', tic: 'hon', building: 'yolanda', wake: 6, sleep: 22, loves: ['wool', 'cosy', 'flower', 'fruit'], hates: ['dramatic'], room: { wall: 'wall-knit', floor: 'floor-carpet-red', style: 'knitted' } },
  fitch: { name: 'Fitch', species: 'ferret', type: 'hustler', tic: 'no refunds', building: 'rocco', wake: 7, sleep: 25, loves: ['art', 'money', 'oddity', 'cheese'], hates: ['plain', 'drab'], room: { wall: 'wall-plaster', floor: 'floor-oak', style: 'boxes' }, movesIn: 9 },
};
export const NEIGHBOUR_ORDER = ['dorrit', 'tavi', 'bartleby', 'ottoline', 'rocco', 'nib', 'ozzie', 'yolanda', 'fitch'];
/** Points of interest neighbours wander between. kind drives what they do there. */
export const POIS = [
  { id: 'benchW', x: 20.5, z: 46.4, kind: 'sit', face: Math.PI }, { id: 'benchE', x: 27.5, z: 46.4, kind: 'sit', face: Math.PI },
  { id: 'plazaN', x: 21, z: 35, kind: 'stand' }, { id: 'plazaS', x: 25, z: 44.5, kind: 'stand' }, { id: 'plazaE', x: 30, z: 39, kind: 'stand' }, { id: 'bellSide', x: 18, z: 42, kind: 'stand' }, { id: 'pearSide', x: 26, z: 38.5, kind: 'stare' },
  { id: 'riverN', x: 37, z: 22, kind: 'fish' }, { id: 'riverE', x: 46.5, z: 30, kind: 'fish' }, { id: 'pondSide', x: 39.5, z: 43, kind: 'fish' }, { id: 'dockEnd', x: 24, z: 60, kind: 'fish' },
  { id: 'store', x: 54, z: 40.5, kind: 'stand' }, { id: 'museum', x: 22, z: 11.5, kind: 'stare' }, { id: 'hall', x: 10, z: 41.5, kind: 'stand' }, { id: 'lookoutPath', x: 66, z: 9.5, kind: 'stare' },
  { id: 'beachW', x: 15, z: 54, kind: 'stare' }, { id: 'beachE', x: 60, z: 55, kind: 'stare' }, { id: 'orchard', x: 53, z: 10.5, kind: 'stare' }, { id: 'mossy', x: 68, z: 29, kind: 'stare' },
  { id: 'doorDorrit', x: 17.5, z: 25.5, kind: 'stand' }, { id: 'doorBart', x: 51.5, z: 24.5, kind: 'stand' }, { id: 'doorOzzie', x: 65.5, z: 47.5, kind: 'stand' }, { id: 'doorYolanda', x: 74.5, z: 47.5, kind: 'stand' },
];
export const FAVOURS = [
  { kind: 'fetch', item: 'pear', ask: 'I could really do with a pear. A proper one. Shake something.', done: 'A pear! That\'s the good stuff.' },
  { kind: 'fetch', item: 'weed', ask: 'I need a weed. Don\'t ask. It\'s for a thing. Any weed.', done: 'That\'s a good weed. It really is. Thank you.' },
  { kind: 'fetch', item: 'shellCommon', ask: 'Bring me a shell from the beach? Any old one. I just want to hold something from the sea.', done: 'Oh, that\'s the sea all right.', anyCat: 'shell' },
  { kind: 'fetch', item: 'flower', ask: 'I want a flower for the table. Don\'t tell me which. Surprise me.', done: 'A flower! It\'ll be dead by Thursday. It\'s the thought.', anyCat: 'flower' },
  { kind: 'fetch', item: 'fish', ask: 'Fetch me a fish, would you? Any fish. I\'ve a very specific plan that doesn\'t depend on which.', done: 'That\'s a fish, all right. No need to tell me where it\'s been.', anyCat: 'fish' },
  { kind: 'fetch', item: 'bug', ask: 'Bring me a bug. It\'s for company.', done: 'Hello, little one. Oh, you\'re going to be such a disappointment.', anyCat: 'bug' },
  { kind: 'fetch', item: 'mushroom', ask: 'I\'m out of mushrooms. Have a look in the woods. Careful of the ones that look back.', done: 'Lovely. It\'s still looking at me. Lovely.', seasons: [2] },
  { kind: 'catch', item: 'perch', cat: 'fish', mins: 60, ask: 'Catch me a fish within the hour. Doesn\'t matter what. I\'ve got a pan on.', done: 'Still flapping! That\'s how I like it.', anyCat: 'fish' },
  { kind: 'catch', item: 'bug', cat: 'bug', mins: 60, ask: 'I bet you can\'t catch me a bug in an hour. It\'s a small bet. It\'s just me, and I\'ve already lost.', done: 'Ha! Well, I owe me a pie.', anyCat: 'bug' },
  { kind: 'deliver', ask: 'Run this parcel over to {target}, would you? Don\'t shake it. Don\'t sniff it either.', done: 'Oh, is that from them? Thank you. I won\'t open it in front of you.' },
  { kind: 'deliver', ask: 'This is for {target}. If they ask who it\'s from, I\'m out.', done: 'For me? Hm. I know who that\'s from. I\'ll be having words.' },
  { kind: 'deliver', ask: 'Take this round to {target}. It\'s only an apology. It\'s quite heavy.', done: 'An apology! I\'ll put it with the others.' },
  { kind: 'deliver', ask: 'Do me a kindness and carry this to {target}. Tell them it\'s not what it looks like.', done: 'Oh, it\'s exactly what it looks like. Bless them.' },
  { kind: 'return', ask: 'I\'ve lost something. It was mine. It might be on the beach. Or {target} might know. Could you ask around?', done: 'That\'s it! That\'s the very thing! I don\'t remember what it\'s for.' },
  { kind: 'return', ask: '{target} borrowed a thing of mine, about a year back. Would you get it for me? I\'d ask, but then I\'d have to talk to them.', done: 'Thank you. Now I can lend it to them again.' },
  { kind: 'trade', item: 'pear', ask: 'I\'ll swap you something for a pear. What? It\'s a surprise. It\'s a very small surprise.', done: 'A deal is a deal. You got a good one. I got a pear.' },
  { kind: 'trade', item: 'weed', ask: 'Swap you for a weed. Yes, a weed. Don\'t look at me like that, you\'ve got plenty.', done: 'A fair trade. I\'d like that noted, if anyone asks.' },
  { kind: 'trade', item: 'shellCommon', anyCat: 'shell', ask: 'Got a shell? I\'ve got something much better. Or different. Swap?', done: 'Pleasure. You\'ll thank me. You will not, but you could.' },
  { kind: 'fetch', item: 'furniture', anyCat: 'furniture', ask: 'I\'ve got a gap in my house. A chair-sized gap, or similar. Bring me anything you\'re not using.', done: 'That fills the gap. Now there\'s a new gap, where I was standing.' },
  { kind: 'fetch', item: 'fruit', anyCat: 'fruit', ask: 'Bring me a bit of fruit. I\'ve been told it\'s good for me. I want to see for myself.', done: 'Mm. Yes. No. Yes. I\'ll need more time with it.' },
];
