/* Data is data: stages, biomes, cars, cast, requests, missions, the garden, goals and endings, songs. Designers extend the
 * game by editing these tables; OB.lint() (run by the tests) checks them. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E;
/* ---------- the island of Bellafiore: 15 stages in a pyramid, 5 goals ---------- */
OB.BIOMES = {
  beach:   { grass: ['#f4e2a8', '#ead69a'], rumble: ['#ffffff', '#ff6f91'], road: ['#6e6a78', '#686472'], layer: 'sea', scenery: ['palm', 'umbrella', 'palm', 'rock'], label: 'Beach' },
  meadow:  { grass: ['#62c85e', '#54b852'], rumble: ['#ffffff', '#ffd23a'], layer: 'hills', scenery: ['tree', 'flowers', 'flowers', 'fence'], label: 'Meadow' },
  harbor:  { grass: ['#93a8b8', '#869cae'], rumble: ['#ffffff', '#2a6ad0'], layer: 'sea', scenery: ['mast', 'lamp', 'crate', 'mast'], label: 'Harbor' },
  lavender:{ grass: ['#a070d4', '#9064c6'], rumble: ['#f4ecff', '#8a4ac8'], layer: 'mountains', scenery: ['lavender', 'cypress', 'lavender', 'lavender'], label: 'Lavender fields' },
  cliff:   { grass: ['#7c6c5a', '#70604e'], rumble: ['#ffffff', '#d83a30'], layer: 'mountains', scenery: ['rock', 'pine', 'rock'], tunnel: true, label: 'Cliff road' },
  desert:  { grass: ['#e8b46e', '#dca660'], rumble: ['#fff0d0', '#d8683a'], road: ['#74686e', '#6c6068'], layer: 'mountains', scenery: ['cactus', 'rock', 'flowers', 'cactus'], label: 'Desert bloom' },
  vineyard:{ grass: ['#7cb84a', '#6eaa40'], rumble: ['#ffffff', '#8a2a5a'], layer: 'hills', scenery: ['vine', 'cypress', 'vine', 'vine'], label: 'Vineyards' },
  town:    { grass: ['#c4ad8c', '#b8a280'], rumble: ['#ffffff', '#e0643a'], layer: 'city', scenery: ['house', 'lamp', 'house', 'flowerbox'], label: 'Old town' },
  canyon:  { grass: ['#c4643c', '#b65a32'], rumble: ['#ffe8d0', '#9a3a20'], layer: 'mountains', scenery: ['redrock', 'cactus', 'redrock'], label: 'Poppy canyon' },
  windmill:{ grass: ['#aad45a', '#9ec84e'], rumble: ['#ffffff', '#f0a020'], layer: 'hills', scenery: ['windmill', 'sunflower', 'sunflower', 'tree'], label: 'Sunflower flats' },
  grove:   { grass: ['#4c9c52', '#40904a'], rumble: ['#ffffff', '#f08a20'], layer: 'forest', scenery: ['orange', 'orange', 'tree', 'flowers'], label: 'Orange grove' },
  city:    { grass: ['#2c2c48', '#262642'], rumble: ['#e8e8ff', '#e8b030'], road: ['#4a4a5c', '#444456'], lane: '#e8d870', layer: 'city', scenery: ['tower', 'lamp', 'tower', 'neon'], label: 'Night city' },
  garden:  { grass: ['#48ba7c', '#3cae70'], rumble: ['#ffffff', '#ff5a9a'], layer: 'hills', scenery: ['topiary', 'flowers', 'flowers', 'lamp'], label: 'Glasshouse gardens' }
};
OB.TOD = {   // time of day: the sky's colours, the sun, and the haze that tints distant layers
  dawn:      { sky: ['#2b2a6a', '#d86a8a', '#ffb08a', '#ffe2a8'], sun: { x: .3, y: .66, r: 15, color: '#fff0c0' }, haze: '#ff9a9a', label: 'Sunrise' },
  morning:   { sky: ['#4a90e0', '#8cc8f4', '#d8f0ff'], sun: { x: .22, y: .26, r: 11, color: '#fffbe0' }, haze: '#bfe4ff', label: 'Morning' },
  noon:      { sky: ['#3a78d8', '#78b0ee', '#c8e4f8'], sun: { x: .7, y: .14, r: 10, color: '#fffbe8' }, haze: '#c8e4f8', label: 'Noon' },
  afternoon: { sky: ['#4a88d0', '#9cc8e8', '#f4e8c0'], sun: { x: .8, y: .3, r: 12, color: '#fff2c0' }, haze: '#f4e0b0', label: 'Afternoon' },
  sunset:    { sky: ['#3a2a78', '#c85a7a', '#f89a5a', '#ffd890'], sun: { x: .72, y: .6, r: 17, color: '#ffe0a0' }, haze: '#ff9a6a', label: 'Sunset' },
  dusk:      { sky: ['#1a1440', '#6a3a78', '#e0766a', '#f8c080'], sun: { x: .3, y: .64, r: 14, color: '#ffd8a0' }, haze: '#c87a8a', label: 'Dusk' },
  night:     { sky: ['#07081c', '#1c1a48', '#5a2a5a'], moon: { x: .2, y: .2, r: 9 }, stars: 60, haze: '#4a3a7a', label: 'Night' }
};
// [name, biome, time of day, curve style, traffic, blurb]; row r holds r+1 stages; from (r, i) the road forks to (r+1, i) or (r+1, i+1)
const S = [
  ['Sunrise Pier', 'beach', 'dawn', 'gentle', 1.0, 'Salt air, empty road, a whole island waking up.'],
  ['Orchard Mile', 'meadow', 'morning', 'gentle', 1.1, 'Blossoms by the thousand. Try not to sneeze.'],
  ['Saltwind Quay', 'harbor', 'morning', 'twisty', 1.1, 'Gulls, cranes and a surprising amount of rope.'],
  ['Lavender Ridge', 'lavender', 'noon', 'hilly', 1.2, 'Purple as far as the eye can see.'],
  ['Cliff Tunnel Run', 'cliff', 'noon', 'twisty', 1.0, 'Rock above, sea below, echo everywhere.'],
  ['Dune Bloom', 'desert', 'noon', 'hilly', 1.2, 'Even the cactus is flowering today.'],
  ['Vineyard Switchbacks', 'vineyard', 'afternoon', 'twisty', 1.3, 'Tight bends between rows of grapes.'],
  ['Old Town Rally', 'town', 'afternoon', 'gentle', 1.6, 'Cobbled charm and rather a lot of scooters.'],
  ['Poppy Canyon', 'canyon', 'afternoon', 'hilly', 1.2, 'Red walls, red poppies, red-faced drivers.'],
  ['Windmill Flats', 'windmill', 'afternoon', 'straight', 1.5, 'Flat, fast and full of sunflowers.'],
  ['Orange Grove Finish', 'grove', 'sunset', 'gentle', 1.2, 'The sweetest road on the island.'],
  ['Starlit Boulevard', 'city', 'night', 'twisty', 1.7, 'Neon, rain-bright asphalt, and big-city nerve.'],
  ['Moonflower Mile', 'garden', 'dusk', 'hilly', 1.1, 'Night-blooming flowers open as you pass.'],
  ['Glasshouse Gardens', 'garden', 'sunset', 'gentle', 1.2, 'Topiary, tulips and a very long hedge.'],
  ['Vespera Cove', 'beach', 'dusk', 'twisty', 1.0, 'The last light of the day, and the end of the road.']
];
OB.STAGES = S.map((s, id) => {
  let row = 0; while ((row + 1) * (row + 2) / 2 <= id) row++;
  const idx = id - row * (row + 1) / 2;
  return { id, row, idx, name: s[0], biome: s[1], tod: s[2], style: s[3], traffic: s[4], blurb: s[5], seed: 1000 + id * 77, segs: 740 + (id % 4) * 20,
    next: row < 4 ? [(row + 1) * (row + 2) / 2 + idx, (row + 1) * (row + 2) / 2 + idx + 1] : null };
});
OB.GOALS = [
  { id: 0, stage: 10, name: 'Mimosa Terrace', where: 'a yellow cafe above the orange groves',
    end: { love: '{P} steps out of the car and the whole terrace smells of mimosa. "Dinner here, every sunrise?" she asks. You nod before she finishes. The waiter brings two spoons and one very large dessert.', fine: '{P} sips a coffee on the terrace and says the drive was lovely. You say the coffee is lovely. Both of you are very polite about it.', sulk: '{P} studies the menu for a long time. "Nice terrace," she says, to the menu. Maybe the next road goes better.' } },
  { id: 1, stage: 11, name: 'Starlit Plaza', where: 'a plaza of lanterns and fountains',
    end: { love: 'The fountains light up exactly as you arrive. {P} takes your hand and the band starts a slow song, as if it had been waiting. "Best. Drive. Ever."', fine: 'The plaza is pretty and the fountains are showy. {P} takes a few photos and hums on the way home.', sulk: 'The fountains splash. {P} checks the time. A pigeon seems to feel sorry for you.' } },
  { id: 2, stage: 12, name: 'Lantern Pier', where: 'a wooden pier strung with paper lanterns',
    end: { love: 'Hundreds of paper lanterns drift up from the pier. {P} laughs, leans on your shoulder, and says it was all worth every bend in the road.', fine: 'You walk the pier at sunset. {P} says it was a fun ride. You agree, and buy her an ice cream.', sulk: 'The lanterns are lovely but {P} keeps looking at the sea. "Perhaps a slower car next time?"' } },
  { id: 3, stage: 13, name: 'Orchid Observatory', where: 'a glass dome in the gardens',
    end: { love: 'Under the glass dome, a thousand orchids open at once. {P} whispers that you drive like a poet. A guard coughs politely. You are still grinning.', fine: 'The dome is warm and humid and full of orchids. {P} reads every label. You read every label too.', sulk: '{P} frowns at an orchid. The orchid frowns back. It is a fairly quiet ride home.' } },
  { id: 4, stage: 14, name: 'Vespera Lighthouse', where: 'the old lighthouse at the west end of the island',
    end: { love: 'The lighthouse lamp swings around, painting the cove gold. "Coast to coast," says {P}, "and I never wanted it to end." The sun slips into the sea and it is, quite simply, perfect.', fine: 'You reach the lighthouse just as the sun touches the water. {P} smiles. It was a good day, and a good drive.', sulk: 'The sun sets on the lighthouse. {P} says "well, we made it", and you both look at the waves for a while.' } }
];
OB.NOTIME = { name: 'Sunset', end: 'The sun slips into the sea while the road still stretches ahead. {P} pats the dashboard kindly. "Tomorrow, then?" Tomorrow sounds wonderful.' };
/* ---------- the cars: Fioretti, five open-tops ---------- */
OB.CARS = [
  { id: 'orchidea', name: 'Orchidea Spider', year: 1962, top: 262, acc: 1.0, grip: 1.0, drift: 1.0, body: 'roadster', blurb: 'The 1962 original. Easy, sunny, forgiving.' },
  { id: 'girasole', name: 'Girasole GT', year: 1978, top: 276, acc: 1.05, grip: .95, drift: 1.1, body: 'gt', blurb: 'A long-nosed grand tourer with a loud heart.' },
  { id: 'camelia', name: 'Camelia Turbo', year: 1994, top: 296, acc: 1.12, grip: .85, drift: 1.2, body: 'turbo', blurb: 'Fast and a little wild. Respect the back end.' },
  { id: 'papavero', name: 'Papavero Cabrio', year: 2008, top: 270, acc: 1.2, grip: 1.25, drift: .9, body: 'cabrio', blurb: 'Glued to the road. Quick off the line.' },
  { id: 'zinnia', name: 'Zinnia Hyper', year: 2026, top: 312, acc: 1.25, grip: 1.1, drift: 1.2, body: 'hyper', blurb: 'The 2026 hypercar. Everything, all at once.' }
];
OB.COLORS = [
  { id: 'sunrise', name: 'Sunrise Coral', c: '#ff6a5a' }, { id: 'seafoam', name: 'Seafoam', c: '#34d0b2' }, { id: 'poppy', name: 'Poppy Red', c: '#e8283a' },
  { id: 'lilac', name: 'Lilac Dream', c: '#a47cf0' }, { id: 'lemon', name: 'Lemon Zest', c: '#ffd23a' }, { id: 'ink', name: 'Midnight Ink', c: '#2a4c9a' }, { id: 'pearl', name: 'Pearl Blossom', c: '#f4eee6' }
];
/* ---------- the cast ---------- */
OB.CAST = {
  marisol: { name: 'Marisol', role: 'passenger', pitch: 1.0, hair: 'ponytail', colors: { cloth: '#ff7aa8', hair: '#5a2a1a', skin: '#e8b088', trim: '#ffe08a' }, hat: null,
    bio: 'A florist who has never once been late. She says.', cheer: ['Wheee! Again!', 'You are SO good at this!', 'My hair! My beautiful hair!', 'Do that once more, I dare you.'], scare: ['Eek! Careful, sunshine!', 'Was that a truck? That was a truck!', 'Mind the van!'], sulk: ['Hmph. I will just look at the flowers, then.', 'Are we there yet? Never mind.'], smitten: ['You drive like a dream.', 'Keep your eyes on the road. Well... mostly.'] },
  dante: { name: 'Dante', role: 'passenger', pitch: .78, hair: 'spiky', colors: { cloth: '#3aa6d8', hair: '#2a1a12', skin: '#d8a078', trim: '#fff0a0' }, hat: null,
    bio: 'A cheeky radio host. Tends to narrate.', cheer: ['And the crowd goes wild!', 'Smooth as butter, driver!', 'That is going in the show.', 'Cue the guitar solo!'], scare: ['Whoa! Brake? No? Fine!', 'My coffee! My poor coffee!', 'That van saw my whole life.'], sulk: ['Is this a taxi? It feels like a taxi.', 'I have driven faster on a pedalo.'], smitten: ['Okay, you are good. Do not tell anyone I said that.', 'Take me the long way round.'] },
  wren: { name: 'Wren', role: 'passenger', pitch: 1.3, hair: 'long', colors: { cloth: '#ffd23a', hair: '#e8a838', skin: '#f0c4a0', trim: '#ff7a5a' }, hat: { style: 'band', color: '#ff7a5a' },
    bio: 'A painter. Notices every colour on the road.', cheer: ['Ooh, that orange! And the corner!', 'You paint with the car!', 'Faster, faster, I am a comet!', 'Loop de loop! Sort of!'], scare: ['Ahh! Pretty van, scary van!', 'Close one! The paint on that bus!', 'Easy, maestro!'], sulk: ['I have seen cows go faster. Elegant cows.', 'Could we stop and look at things?'], smitten: ['You have got the best sort of recklessness.', 'This is my favourite canvas.'] },
  bruno: { name: 'Bruno Brezza', role: 'starter', pitch: .65, hair: 'short', colors: { cloth: '#f2f2f2', pants: '#2f5fd0', hair: '#b8b8c0', skin: '#d9a07a', trim: '#ffd23a' }, hat: { style: 'cap', color: '#ffd23a' },
    bio: 'Retired rally champion. Waves his sunflower flag at every start.', lines: ['Ready, sweetheart?', 'Flag up... flag down... go go GO!', 'Petal to the metal!', 'Nobody ever got to the coast by waiting!'] },
  pia: { name: 'Nonna Pia', role: 'gardener', pitch: 1.15, hair: 'ponytail', colors: { cloth: '#8a5ac0', hair: '#e8e8e8', skin: '#e0b090', trim: '#ffe08a' }, hat: { style: 'band', color: '#ffe08a' },
    bio: 'Keeper of the Garage Garden. Her tomatoes are legend.', lines: ['Plant a seed, grow a car.', 'Water it with miles, dear.', 'Patience! It will bloom.'] },
  gianna: { name: 'Gianna Ruota', role: 'mechanic', pitch: .95, hair: 'short', colors: { cloth: '#ff8a3a', pants: '#3a4a6a', hair: '#1a1a22', skin: '#c8906a', trim: '#f0f0f0' }, hat: { style: 'cap', color: '#3a4a6a' },
    bio: 'Mechanic. Sets the postcard challenges.', lines: ['Postcard job! Think you can do it?', 'I tuned it myself. Do not scratch it.'] },
  cosimo: { name: 'Cosimo', role: 'rival', pitch: .85, hair: 'spiky', colors: { cloth: '#d8283a', pants: '#2a2a3a', hair: '#1a1a1a', skin: '#e0b088', trim: '#f0f0f0' }, hat: null,
    bio: 'Half of the Heartbreakers, the island\'s rival couple.', lines: ['Ciao, slowpoke!', 'Fiora says you drive like a sunday picnic.'] }
};
/* ---------- Love in Bloom: the passenger's requests ---------- */
OB.REQUESTS = [
  { id: 'drift',  text: 'Show me a power slide!',          kind: 'drift',  goal: 700,  time: 22, petals: 2 },
  { id: 'pass',   text: 'Pass 4 cars!',                    kind: 'pass',   goal: 4,    time: 22, petals: 2 },
  { id: 'near',   text: 'Scare me! 3 near misses!',        kind: 'near',   goal: 3,    time: 24, petals: 3 },
  { id: 'fast',   text: 'Faster! Hold 240 for 6 seconds!', kind: 'fast',   goal: 6,    time: 25, petals: 2, speed: 240 },
  { id: 'slow',   text: 'Slow down, look at the view!',    kind: 'slow',   goal: 5,    time: 18, petals: 1, speed: 130 },
  { id: 'draft',  text: 'Catch a slipstream!',             kind: 'draft',  goal: 1,    time: 24, petals: 2 },
  { id: 'sling',  text: 'Slingshot out of a slipstream!',  kind: 'sling',  goal: 1,    time: 28, petals: 3 },
  { id: 'center', text: 'Stay in the middle lane!',        kind: 'center', goal: 8,    time: 14, petals: 1 },
  { id: 'clean',  text: 'No scratches for 20 seconds!',    kind: 'clean',  goal: 20,   time: 20, petals: 2 },
  { id: 'weave',  text: 'Weave! Change lanes 4 times!',    kind: 'weave',  goal: 4,    time: 16, petals: 2 },
  { id: 'horn',   text: 'Honk at that car!',               kind: 'horn',   goal: 1,    time: 14, petals: 1 },
  { id: 'boost',  text: 'Give me a boost!',                kind: 'boost',  goal: 1,    time: 22, petals: 2 },
  { id: 'long',   text: 'Hold one slide for 2 seconds!',   kind: 'long',   goal: 2,    time: 24, petals: 3 },
  { id: 'radio',  text: 'Change the song, please!',        kind: 'radio',  goal: 1,    time: 12, petals: 1 }
];
OB.GRADES = [['E', 0], ['D', 3], ['C', 7], ['B', 12], ['A', 18], ['AA', 25], ['AAA', 34]];
OB.gradeOf = p => { let g = 'E'; for (const [n, min] of OB.GRADES) if (p >= min) g = n; return g; };
OB.moodOf = g => (g === 'AAA' || g === 'AA' || g === 'A') ? 'love' : (g === 'B' || g === 'C') ? 'fine' : 'sulk';
/* ---------- the Coast 2 Coast Tour: postcard missions ---------- */
OB.MISSIONS = [
  { id: 'm1', name: 'Warm-Up Wave', giver: 'bruno', stage: 0, rule: 'reach', limit: 58, reward: 3, brief: 'Cross Sunrise Pier before the clock runs out. Easy as breakfast.', rival: false },
  { id: 'm2', name: 'Drift Duel', giver: 'gianna', stage: 3, rule: 'drift', target: 2500, limit: 62, reward: 4, brief: 'Hold a power slide through the ridge. Earn 2,500 slide points before the clock runs out.' },
  { id: 'm3', name: 'Draft Dash', giver: 'bruno', stage: 5, rule: 'sling', target: 3, limit: 64, reward: 4, brief: 'Tuck behind traffic, then slingshot past. Do it three times.' },
  { id: 'm4', name: 'Last One Wilts', giver: 'pia', stage: 8, rule: 'pass', target: 22, limit: 66, reward: 5, brief: 'Pass 22 vehicles in the canyon. Leave nobody in bloom.' },
  { id: 'm5', name: 'Heartbreakers', giver: 'cosimo', stage: 11, rule: 'rival', limit: 70, reward: 6, brief: 'Cosimo and Fiora are racing for the city. Cross the line before their sports car does.', rivalSpeed: 238 },
  { id: 'm6', name: 'Silk Road', giver: 'gianna', stage: 6, rule: 'clean', limit: 68, reward: 5, brief: 'Finish the Vineyard Switchbacks without a single crash.' },
  { id: 'm7', name: 'Scare Tactics', giver: 'cosimo', stage: 7, rule: 'near', target: 14, limit: 66, reward: 5, brief: 'The Old Town is crowded. Squeeze past 14 vehicles, close enough to read their stickers.' },
  { id: 'm9', name: 'Rose Petal Rush', giver: 'bruno', stage: 1, rule: 'reach', limit: 52, reward: 4, brief: 'The orchards are in full blossom. Cross Orchard Mile before the clock runs out.' },
  { id: 'm10', name: 'Slide Show', giver: 'gianna', stage: 9, rule: 'drift', target: 3500, limit: 60, reward: 5, brief: 'Windmill Flats is flat and fast. Make it dramatic: 3,500 slide points.' },
  { id: 'm11', name: 'Tailwind', giver: 'bruno', stage: 2, rule: 'sling', target: 4, limit: 62, reward: 5, brief: 'Four slingshots on the Saltwind Quay. Hide behind a truck, then fly.' },
  { id: 'm12', name: 'Wilt Wave', giver: 'pia', stage: 10, rule: 'pass', target: 28, limit: 62, reward: 6, brief: 'The orange grove is crowded. Pass 28 vehicles and leave them wilting.' },
  { id: 'm13', name: 'Needle and Thread', giver: 'cosimo', stage: 12, rule: 'near', target: 18, limit: 66, reward: 6, brief: 'Thread 18 near misses through Moonflower Mile. Cosimo is watching.' },
  { id: 'm14', name: 'Rival Couple Rematch', giver: 'cosimo', stage: 14, rule: 'rival', limit: 70, reward: 8, brief: 'One more race against Cosimo and Fiora, to Vespera Cove. Loser buys the ice cream.', rivalSpeed: 250 },
  { id: 'm8', name: 'Sunset Express', giver: 'bruno', stage: 13, rule: 'reach', limit: 56, reward: 7, brief: 'Cross the Glasshouse Gardens before the sun is gone. Tight clock, no excuses.' }
];
/* ---------- the Garage Garden: beds and costs ---------- */
OB.BEDS = [
  { id: 'bed-orchidea', kind: 'car', ref: 'orchidea', name: 'Orchidea Spider', cost: 0 }, { id: 'bed-c0', kind: 'color', ref: 'sunrise', name: 'Sunrise Coral', cost: 0 },
  { id: 'bed-c1', kind: 'color', ref: 'seafoam', name: 'Seafoam', cost: 0 }, { id: 'bed-c2', kind: 'color', ref: 'poppy', name: 'Poppy Red', cost: 0 },
  { id: 'bed-girasole', kind: 'car', ref: 'girasole', name: 'Girasole GT', cost: 6 }, { id: 'bed-camelia', kind: 'car', ref: 'camelia', name: 'Camelia Turbo', cost: 12 },
  { id: 'bed-papavero', kind: 'car', ref: 'papavero', name: 'Papavero Cabrio', cost: 18 }, { id: 'bed-zinnia', kind: 'car', ref: 'zinnia', name: 'Zinnia Hyper', cost: 28 },
  { id: 'bed-c3', kind: 'color', ref: 'lilac', name: 'Lilac Dream', cost: 3 }, { id: 'bed-c4', kind: 'color', ref: 'lemon', name: 'Lemon Zest', cost: 3 },
  { id: 'bed-c5', kind: 'color', ref: 'ink', name: 'Midnight Ink', cost: 4 }, { id: 'bed-c6', kind: 'color', ref: 'pearl', name: 'Pearl Blossom', cost: 5 },
  { id: 'bed-s5', kind: 'song', ref: 5, name: 'Radio: Moonflower', cost: 8 }, { id: 'bed-s6', kind: 'song', ref: 6, name: 'Radio: Last Light', cost: 12 }
];
/* ---------- the radio: seven original songs, generated from chords in code ---------- */
OB.SONGDEFS = [
  { name: 'Sunrise Pier',   station: 'Radio Bella 88.1', bpm: 128, root: 'A', prog: [0, 5, 3, 7], q: ['m', 'M', 'M', 'M'], style: 'latin',   lead: 'square',   seed: 11 },
  { name: 'Orchard Breeze', station: 'Radio Bella 88.1', bpm: 118, root: 'C', prog: [0, 9, 5, 7], q: ['M', 'm', 'M', 'M'], style: 'disco',   lead: 'pulse12',  seed: 23 },
  { name: 'Lavender Ride',  station: 'Fioretti FM 95.3', bpm: 108, root: 'D', prog: [0, 7, 9, 5], q: ['M', 'M', 'm', 'M'], style: 'shuffle', lead: 'triangle', seed: 37 },
  { name: 'Turbo Tulip',    station: 'Eurobloom 101.7',  bpm: 152, root: 'E', prog: [0, 8, 5, 7], q: ['m', 'M', 'M', 'M'], style: 'euro',    lead: 'saw',      seed: 41 },
  { name: 'Neon Petals',    station: 'City Pop 104.2',   bpm: 104, root: 'F', prog: [0, 2, 7, 5], q: ['M', 'm', 'M', 'M'], style: 'citypop', lead: 'pulse12',  seed: 53 },
  { name: 'Moonflower',     station: 'Garden Wave 77.7', bpm: 96,  root: 'G', prog: [0, 3, 8, 5], q: ['m', 'M', 'M', 'M'], style: 'citypop', lead: 'triangle', seed: 67 },
  { name: 'Last Light',     station: 'Garden Wave 77.7', bpm: 120, root: 'B', prog: [0, 10, 5, 7], q: ['M', 'M', 'M', 'M'], style: 'latin',  lead: 'square',   seed: 79 }
];
const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], base = r => NN.indexOf(r);
const noteName = m => NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
OB.makeSong = def => {
  const rng = E.rng(def.seed), r0 = 60 + base(def.root) - 12, bars = 8;
  const bass = [], arp = [], lead = [], drums = [];
  const bassPat = { latin: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0], disco: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], shuffle: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], euro: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], citypop: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0] }[def.style];
  const drumPat = { latin: 'k . h h s . h h k . h k s . h h', disco: 'k h o h s h o h k h o h s h o h', shuffle: 'k . . h s . . h k . . h s . h .', euro: 'k h h h s h h h k h h h s h k h', citypop: 'k . h . s . h h k . h k s . h .' }[def.style];
  const scale = (q) => q === 'm' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  let prev = 7;
  for (let bar = 0; bar < bars; bar++) {
    const ci = bar % 4, root = r0 + def.prog[ci], q = def.q[ci], tri = [0, q === 'm' ? 3 : 4, 7], sc = scale(q), second = bar >= 4;
    for (let s = 0; s < 16; s++) {
      bass.push(bassPat[s] ? noteName(root - 12 + (def.style === 'disco' && s % 4 === 2 ? 12 : 0)) : (def.style === 'euro' ? '-' : '.'));
      arp.push(noteName(root + 12 + tri[(def.style === 'euro' ? s : s >> 1) % 3] + (s % 8 > 3 && def.style !== 'euro' ? 12 : 0)));
      const on = rng() < (def.style === 'euro' ? .75 : .5) && (s % 2 === 0 || rng() < .3);
      if (on) { prev = clamp(prev + (Math.floor(rng() * 5) - 2), 0, 13); const deg = prev % 7, oct = Math.floor(prev / 7); lead.push(noteName(root + 12 + sc[deg] + 12 * oct + (second ? 0 : -0))); }
      else lead.push(s % 4 === 3 && rng() < .5 ? '-' : '.');
      drums.push(...drumPat.split(' ').slice(s, s + 1));
    }
  }
  return { name: def.name, bpm: def.bpm, steps: 4, tracks: [
    { name: 'lead', wave: def.lead, vol: .07, notes: lead.join(' ') },
    { name: 'arp', wave: def.style === 'euro' ? 'saw' : 'pulse12', vol: .035, notes: arp.join(' ') },
    { name: 'bass', wave: 'triangle', vol: .26, notes: bass.join(' ') },
    { name: 'drums', wave: 'drums', vol: .08, notes: drums.join(' ') }] };
};
OB.SONGS = OB.SONGDEFS.map(OB.makeSong);
OB.TITLE_SONG = OB.makeSong({ name: 'Bloom Overture', bpm: 112, root: 'C', prog: [0, 9, 5, 7], q: ['M', 'm', 'M', 'M'], style: 'citypop', lead: 'square', seed: 5 });
OB.GOAL_SONG = OB.makeSong({ name: 'Coast Fanfare', bpm: 100, root: 'F', prog: [0, 5, 7, 0], q: ['M', 'M', 'M', 'M'], style: 'shuffle', lead: 'triangle', seed: 9 });
/* ---------- the line bank: banners and chatter ---------- */
OB.LINES = {
  start: ['Hop in, the whole island is waiting!', 'Sunshine, a full tank and good company.', 'Left foot calm, right foot cheerful.'],
  extended: ['TIME EXTENDED!', 'MORE DAYLIGHT!', 'THE SUN WAITS FOR YOU!'],
  crash: ['Ouch! My sunglasses!', 'That was a lamp post. It forgives you.', 'Eep! Try the road next time!'],
  drift: ['Power slide! Look at that curve!', 'Sideways and smiling!', 'Smoke and sunshine!'],
  pass: ['Bye-bye, slowpoke!', 'Overtaking is a love language.'],
  bored: ['Are we playing a game? Tell me the rules.', 'Wake me when something exciting happens.'],
  win: ['Request done! Petals for you!', 'Yes! Exactly that!', 'You read my mind!'],
  fail: ['Oh well. Next time!', 'Not quite, sunshine.'],
  tip: ['TIP: tap the brake while turning to power slide!', 'TIP: tuck behind traffic to build a slipstream.', 'TIP: pick a road at the fork by choosing a side.', 'TIP: near misses build your Bloom chain.']
};
// quick integrity check, run by the test suite
OB.lint = () => {
  const bad = [];
  for (const s of OB.STAGES) { if (!OB.BIOMES[s.biome]) bad.push('biome ' + s.id); if (!OB.TOD[s.tod]) bad.push('tod ' + s.id); if (s.row < 4 && (!s.next || s.next.some(n => n < 0 || n > 14))) bad.push('route ' + s.id); }
  if (OB.STAGES.length !== 15) bad.push('15 stages');
  for (const g of OB.GOALS) for (const k of ['love', 'fine', 'sulk']) if (!g.end[k]) bad.push('ending ' + g.id + k);
  for (const m of OB.MISSIONS) if (!OB.STAGES[m.stage] || !OB.CAST[m.giver]) bad.push('mission ' + m.id);
  for (const b of OB.BEDS) if (b.kind === 'car' && !OB.CARS.find(c => c.id === b.ref)) bad.push('bed ' + b.id);
  OB.SONGS.forEach((s, i) => { if (s.tracks.some(t => !t.notes.length)) bad.push('song ' + i); });
  return bad;
};
})();
