/* 02-data-cast: the six fighters, the hosts and staff, their looks, play stats, voices, tastes and starting affinity.
 * Every character is an adult (21+); the humour is in Sonny, the rivalries and the vacation mishaps. */
G.FIGHTERS = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'];
G.CAST = {
  rin: { id: 'rin', name: 'Rin Takamine', short: 'RIN', epithet: 'The Quiet Blade', from: 'Japan', style: 'Kendo and iaido champion', age: 24,
    size: 1.22, build: 'heroic', hair: 'ponytail', hairColor: '#1d1a24', skin: '#f1cfb2', eyes: '#4a2c22', cloth: '#23306b', pants: '#e8eef8', trim: '#c8303a', boot: '#f1cfb2',
    tastes: ['classic', 'elegant'], stats: { POW: 5, TEC: 9, SPD: 7, JMP: 6 }, voice: { base: 330, range: 3, rate: 13, formant: 1.05, wave: 'triangle' },
    signature: 'seigaiha', starts: { acc: ['ribbon'] }, celebration: 'Bow', color: '#2fb5a0', mood: 'Calm',
    start: { lines: 'Good morning. The sand is... adequate.' }, portrait: { band: null } },
  lola: { id: 'lola', name: 'Dolores "Lola" Vega', short: 'LOLA', epithet: 'La Tormenta', from: 'Mexico', style: 'Luchadora (pro wrestler)', age: 27,
    size: 1.30, build: 'heroic', hair: 'curly', hairColor: '#3a2218', skin: '#b9825a', eyes: '#3a2416', cloth: '#c8202c', pants: '#ffd04a', trim: '#1a1a1a', boot: '#1a1a1a',
    tastes: ['bold', 'sporty'], stats: { POW: 9, TEC: 5, SPD: 5, JMP: 8 }, voice: { base: 260, range: 6, rate: 16, formant: .95, wave: 'saw' },
    signature: 'estrella', starts: { acc: ['sweatband'] }, celebration: 'Victory Fist Pump', color: '#ff5fa2', mood: 'Loud',
    start: { lines: '¡Hola, compañera! Ready to bring the THUNDER?' } },
  ingrid: { id: 'ingrid', name: 'Ingrid Halvorsen', short: 'INGRID', epithet: 'The Glacier', from: 'Norway', style: 'Glíma wrestler, ex-biathlete', age: 26,
    size: 1.38, build: 'heroic', hair: 'braid', hairColor: '#f2ead2', skin: '#f7dccb', eyes: '#5aa0d8', cloth: '#9fd8f0', pants: '#1d3560', trim: '#ffffff', boot: '#1d3560',
    tastes: ['sporty', 'classic'], stats: { POW: 7, TEC: 6, SPD: 4, JMP: 9 }, voice: { base: 210, range: 2, rate: 10, formant: .9, wave: 'triangle' },
    signature: 'fjord', starts: { acc: ['sportshades'] }, celebration: 'Head Nod', color: '#5aa0d8', mood: 'Deadpan',
    start: { lines: 'It is thirty-one degrees. I am melting. Hello.' } },
  amara: { id: 'amara', name: 'Amara Okafor', short: 'AMARA', epithet: 'Rhythm Queen', from: 'UK / Nigeria', style: 'Capoeira and dance fighting', age: 22,
    size: 1.26, build: 'heroic', hair: 'puff', hairColor: '#2a1810', skin: '#7a4a2e', eyes: '#2a1810', cloth: '#ff8a1e', pants: '#2f9e4a', trim: '#ffd36a', boot: '#7a4a2e',
    tastes: ['bold', 'cute'], stats: { POW: 5, TEC: 6, SPD: 9, JMP: 8 }, voice: { base: 340, range: 7, rate: 15, formant: 1.1, wave: 'pulse' },
    signature: 'kentepop', starts: { acc: ['hibiscus'] }, celebration: 'Dance Charleston', color: '#ffd36a', mood: 'Bubbly',
    start: { lines: 'Hey hey! You hear that? The ocean\'s got rhythm!' } },
  tess: { id: 'tess', name: 'Tess Callahan', short: 'TESS', epithet: 'Riptide', from: 'Australia', style: 'Surfer and MMA brawler', age: 25,
    size: 1.28, build: 'heroic', hair: 'bob', hairColor: '#f0d890', skin: '#e2ad84', eyes: '#3c7a5a', cloth: '#1fb7b0', pants: '#ff7a5e', trim: '#ffffff', boot: '#e2ad84',
    tastes: ['sporty', 'bold'], stats: { POW: 7, TEC: 7, SPD: 7, JMP: 6 }, voice: { base: 290, range: 5, rate: 14, formant: 1.0, wave: 'saw' },
    signature: 'reefbreak', starts: { acc: ['wristbands'] }, celebration: 'Wave_Hello', color: '#3c7a5a', mood: 'Chill',
    start: { lines: 'G\'day! Waves are pumping, sun\'s out. Life\'s good, yeah?' } },
  mei: { id: 'mei', name: 'Mei-Lin Zhou', short: 'MEI', epithet: 'Little Phoenix', from: 'Hong Kong', style: 'Wushu acrobat, xiangqi prodigy', age: 21,
    size: 1.16, build: 'heroic', hair: 'twinbuns', hairColor: '#1a1418', skin: '#f3d2b8', eyes: '#3a2420', cloth: '#ffb2a0', pants: '#e85a8a', trim: '#ffffff', boot: '#f3d2b8',
    tastes: ['cute', 'elegant'], stats: { POW: 4, TEC: 8, SPD: 8, JMP: 6 }, voice: { base: 400, range: 6, rate: 18, formant: 1.18, wave: 'pulse' },
    signature: 'peony', starts: { acc: ['ribbon'] }, celebration: 'Backflip', color: '#e85a8a', mood: 'Mischief',
    start: { lines: 'Hehe. Bet you can\'t beat me at anything today.' } }
};
G.BRIEF = { rin: 'Kendo champion', lola: 'Luchadora', ingrid: 'Glima wrestler', amara: 'Capoeira dancer', tess: 'Surfer and brawler', mei: 'Wushu acrobat' };
G.STAFF = {
  sonny: { id: 'sonny', name: 'Sonny Fortuna', short: 'SONNY', epithet: 'The Man with the Golden Tan', size: 1.32, build: 'bulky', hair: 'spiky', hairColor: '#121014', skin: '#d9a27a',
    voice: { base: 120, range: 7, rate: 13, formant: .8, wave: 'saw', vib: 6 }, stats: { POW: 8, TEC: 5, SPD: 5, JMP: 5 }, color: '#ffd36a', celebration: 'Cheering_Two_Hands' },
  pepper: { id: 'pepper', name: 'Pepper Quill', short: 'PEPPER', epithet: 'Concierge', size: 1.24, build: 'heroic', hair: 'bun', hairColor: '#5a2a1e', skin: '#f0c6a4',
    voice: { base: 230, range: 1, rate: 17, formant: 1.0, wave: 'triangle' }, stats: { POW: 6, TEC: 10, SPD: 7, JMP: 6 }, color: '#1d2433', celebration: 'Salute' },
  kai: { id: 'kai', name: 'Kai Makoa', short: 'KAI', epithet: 'Bartender and croupier', size: 1.25, build: 'heroic', hair: 'short', hairColor: '#1a1410', skin: '#a8714a',
    voice: { base: 170, range: 4, rate: 12, formant: .85, wave: 'triangle' }, color: '#2fb5a0' },
  odette: { id: 'odette', name: 'Odette Belrose', short: 'ODETTE', epithet: 'Couturier', size: 1.2, build: 'heroic', hair: 'long', hairColor: '#c8b8e8', skin: '#f5d9c4',
    voice: { base: 300, range: 5, rate: 12, formant: 1.1, wave: 'pulse' }, color: '#ff8aa8' },
  bo: { id: 'bo', name: 'Coach Bo Brannigan', short: 'BO', epithet: 'Retired beach pro', size: 1.28, build: 'bulky', hair: 'bald', hairColor: '#000000', skin: '#b5795a',
    voice: { base: 150, range: 3, rate: 14, formant: .85, wave: 'square' }, color: '#ffd04a' }
};
/* gift tastes: 3 love, 2 like, 0 neutral, -3 dislike, per fighter */
G.TASTE_VALUE = { L: 3, '+': 2, '.': 0, '-': -3 };
G.GIFT_TASTE = {
  mango_smoothie: { rin: '.', lola: '+', ingrid: '.', amara: '+', tess: '+', mei: '.' },
  bubble_tea: { rin: '.', lola: '.', ingrid: '.', amara: '.', tess: '.', mei: '+' },
  matcha_icecream: { rin: '+', lola: '.', ingrid: '+', amara: '.', tess: '.', mei: '+' },
  mochi_box: { rin: '+', lola: '.', ingrid: '.', amara: '.', tess: '.', mei: 'L' },
  bbq_skewers: { rin: '.', lola: '+', ingrid: '.', amara: '.', tess: 'L', mei: '-' },
  hot_sauce: { rin: '-', lola: 'L', ingrid: '-', amara: '.', tess: '+', mei: '-' },
  iced_coffee: { rin: '.', lola: '.', ingrid: '+', amara: '.', tess: '.', mei: '.' },
  coconut: { rin: '.', lola: '.', ingrid: '.', amara: '.', tess: '+', mei: '.' },
  plush_seal: { rin: 'L', lola: '.', ingrid: '+', amara: '.', tess: '.', mei: '+' },
  snow_globe: { rin: '.', lola: '.', ingrid: 'L', amara: '-', tess: '.', mei: '.' },
  puzzle_cube: { rin: '+', lola: '-', ingrid: '.', amara: '.', tess: '.', mei: 'L' },
  portable_speaker: { rin: '-', lola: '+', ingrid: '.', amara: 'L', tess: '+', mei: '.' },
  matcha_kit: { rin: 'L', lola: '-', ingrid: '.', amara: '.', tess: '.', mei: '+' },
  calligraphy_set: { rin: '+', lola: '.', ingrid: '.', amara: '.', tess: '-', mei: '.' },
  knitting_kit: { rin: '.', lola: '.', ingrid: 'L', amara: '-', tess: '.', mei: '-' },
  maracas: { rin: '.', lola: '+', ingrid: '.', amara: '+', tess: '.', mei: '.' },
  luchador_mask: { rin: '.', lola: 'L', ingrid: '.', amara: '.', tess: '+', mei: '.' },
  beach_paperback: { rin: '+', lola: '-', ingrid: '+', amara: '.', tess: '.', mei: '.' },
  fashion_mag: { rin: '.', lola: '.', ingrid: '-', amara: '+', tess: '-', mei: '+' },
  energy_drink: { rin: '-', lola: '.', ingrid: '.', amara: '-', tess: '+', mei: '-' },
  surf_wax: { rin: '.', lola: '.', ingrid: '.', amara: '.', tess: 'L', mei: '.' },
  sunscreen: { rin: '.', lola: '.', ingrid: '+', amara: '.', tess: '+', mei: '.' },
  foam_finger: { rin: '-', lola: '+', ingrid: '.', amara: '.', tess: '+', mei: '.' },
  glitter_sandals: { rin: '.', lola: '.', ingrid: '-', amara: '+', tess: '-', mei: '+' },
  gold_hoops: { rin: '.', lola: '+', ingrid: '.', amara: 'L', tess: '.', mei: '.' }
};
G.WEATHER_TASTE = { ingrid: { likes: ['cloudy', 'rain'], dislikes: [] }, amara: { likes: ['sunny'], dislikes: ['rain'] }, tess: { likes: ['sunny'], dislikes: [] } };
/* starting affinity, one symmetric value per pair */
G.AFF0 = {
  rin: { lola: 20, ingrid: 35, amara: 25, tess: 30, mei: 40 },
  lola: { ingrid: 25, amara: 40, tess: 45, mei: 20 },
  ingrid: { amara: 20, tess: 35, mei: 25 },
  amara: { tess: 30, mei: 40 },
  tess: { mei: 25 }
};
G.affStart = function (a, b) {
  if (a === b) return 0;
  const k1 = G.AFF0[a] && G.AFF0[a][b], k2 = G.AFF0[b] && G.AFF0[b][a];
  return k1 != null ? k1 : (k2 != null ? k2 : 20);
};
G.STAGE = [
  { min: 80, name: 'Best Friend' }, { min: 60, name: 'Good Friend' }, { min: 40, name: 'Friend' }, { min: 20, name: 'Acquaintance' }, { min: 0, name: 'Stranger' }
];
G.stageOf = function (aff) { return G.STAGE.find(s => aff >= s.min); };
G.stageIndex = function (aff) { const s = G.stageOf(aff); return 4 - G.STAGE.indexOf(s); };   // 0 stranger .. 4 best friend
G.MOOD = { Happy: { icon: 'sun', word: 'Happy', value: 1 }, Normal: { icon: 'half', word: 'Normal', value: 0 }, Gloomy: { icon: 'cloud', word: 'Gloomy', value: -1 } };
G.MOODS = ['Happy', 'Normal', 'Gloomy'];
