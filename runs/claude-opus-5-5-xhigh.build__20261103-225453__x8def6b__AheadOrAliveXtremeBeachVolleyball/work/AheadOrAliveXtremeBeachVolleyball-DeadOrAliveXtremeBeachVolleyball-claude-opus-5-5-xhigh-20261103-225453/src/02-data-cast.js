/* 02-data-cast: the six fighters, the hosts and the staff: looks, stats, tastes, voices, schedules and celebrations.
 * Every character is an adult. Stats are 1-10: POW (spikes, serves), TEC (passes, sets, digs), SPD (movement), JMP (blocks,
 * reach). Adding a fighter is a row here, a row in the gift tastes and the affinity table, and her lines in 05. */
G.FIGHTERS = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'];
G.CAST = {
  rin: { name: 'Rin', full: 'Rin Takamine', epithet: 'The Quiet Blade', from: 'Japan', style: 'Kendo and iaido champion', age: 24, size: 1.22,
    hair: 'ponytail', hairColor: '#1d1a24', bangs: .6, skin: '#f1cfb2', eyes: '#4a2c22', iris: '#5a3a2a',
    stats: { POW: 5, TEC: 9, SPD: 7, JMP: 6 }, tastes: ['classic', 'elegant'], suit: 'seigaiha', acc: ['ribbon'], accColor: '#d8303a',
    voice: { base: 330, range: 3, rate: 13, formant: 1.05, wave: 'triangle', breath: .2 }, celebrate: 'Bow', color: '#5a7ad8',
    personality: 'Composed perfectionist with dry one-liners. Secretly adores cute things.', sched: [[4, 2, 3, 1], [4, 3, 2, 1], [3, 7]], weather: {} },
  lola: { name: 'Lola', full: 'Dolores "Lola" Vega', epithet: 'La Tormenta', from: 'Mexico', style: 'Luchadora (pro wrestler)', age: 27, size: 1.3, shoulders: .25,
    hair: 'curly', hairColor: '#3a2218', bangs: .4, band: '#d8302a', skin: '#b9825a', eyes: '#3a2416', iris: '#4a2a18',
    stats: { POW: 9, TEC: 5, SPD: 5, JMP: 8 }, tastes: ['bold', 'sporty'], suit: 'estrella', acc: ['sweatband'], color: '#e83a3a',
    voice: { base: 260, range: 6, rate: 16, formant: .95, wave: 'saw', breath: .3 }, celebrate: 'Victory Fist Pump',
    personality: 'Loud, warm and theatrical. Trash-talks with a grin and lives for a crowd.', sched: [[5, 2, 2, 1], [5, 2, 2, 1], [6, 4]], weather: {} },
  ingrid: { name: 'Ingrid', full: 'Ingrid Halvorsen', epithet: 'The Glacier', from: 'Norway', style: 'Glíma wrestling and kickboxing', age: 26, size: 1.38,
    hair: 'braid', hairColor: '#f2ead2', bangs: .3, skin: '#f7dccb', eyes: '#2a3a58', iris: '#5aa0d8',
    stats: { POW: 7, TEC: 6, SPD: 4, JMP: 9 }, tastes: ['sporty', 'classic'], suit: 'fjord', acc: ['sportshades'], color: '#7ad0f0',
    voice: { base: 210, range: 2, rate: 10, formant: .9, wave: 'triangle', breath: .4 }, celebrate: 'Head Nod',
    personality: 'Stoic and deadpan. Hates the heat and misses snow. Secretly a karaoke fiend.', sched: [[3, 4, 2, 1], [2, 5, 2, 1], [2, 8]], weather: { like: ['cloudy', 'rain'], dislike: [] } },
  amara: { name: 'Amara', full: 'Amara Okafor', epithet: 'Rhythm Queen', from: 'UK / Nigeria', style: 'Capoeira and dance fighting', age: 22, size: 1.26,
    hair: 'puff', hairColor: '#2a1810', bangs: .2, skin: '#7a4a2e', eyes: '#2a1810', iris: '#3a2214',
    stats: { POW: 5, TEC: 6, SPD: 9, JMP: 8 }, tastes: ['bold', 'cute'], suit: 'kentepop', acc: ['hibiscus'], color: '#ff9e3a',
    voice: { base: 340, range: 7, rate: 15, formant: 1.1, wave: 'pulse', breath: .2 }, celebrate: 'Dance Charleston',
    personality: 'Cheerful social butterfly who loves music and fashion. A little dramatic.', sched: [[3, 2, 4, 1], [3, 3, 3, 1], [7, 3]], weather: { like: ['sunny'], dislike: ['rain'] } },
  tess: { name: 'Tess', full: 'Tess Callahan', epithet: 'Riptide', from: 'Australia', style: 'Surfer and MMA brawler', age: 25, size: 1.28,
    hair: 'bob', hairColor: '#f0d890', bangs: .7, skin: '#e2ad84', eyes: '#2a3a30', iris: '#3c7a5a',
    stats: { POW: 7, TEC: 7, SPD: 7, JMP: 6 }, tastes: ['sporty', 'bold'], suit: 'reefbreak', acc: ['wristbands'], color: '#2ec4b0',
    voice: { base: 290, range: 5, rate: 14, formant: 1.0, wave: 'saw', breath: .25 }, celebrate: 'Wave_Hello', goodSport: true,
    personality: 'Laid-back but fiercely competitive. Cheeky and outdoorsy.', sched: [[6, 2, 1, 1], [5, 3, 1, 1], [4, 6]], weather: { like: ['sunny'], dislike: [] } },
  mei: { name: 'Mei', full: 'Mei-Lin Zhou', epithet: 'Little Phoenix', from: 'Hong Kong', style: 'Wushu acrobat and xiangqi prodigy', age: 21, size: 1.16,
    hair: 'twinbuns', hairColor: '#1a1418', bangs: .8, skin: '#f3d2b8', eyes: '#3a2420', iris: '#4a2a22',
    stats: { POW: 4, TEC: 8, SPD: 8, JMP: 6 }, tastes: ['cute', 'elegant'], suit: 'peony', acc: ['ribbon'], accColor: '#ff7ab8', color: '#ff7ab8',
    voice: { base: 400, range: 6, rate: 18, formant: 1.18, wave: 'pulse', breath: .15 }, celebrate: 'Backflip',
    personality: 'Mischievous prankster with a sweet tooth. Hates losing at anything.', sched: [[2, 3, 4, 1], [3, 2, 4, 1], [8, 2]], weather: {} },
  sonny: { name: 'Sonny', full: 'Sonny Fortuna', epithet: 'The Man with the Golden Tan', from: 'Isla Fortuna', style: 'Jackpot billionaire and DJ', age: 52, size: 1.32, build: 'bulky',
    hair: 'spiky', hairColor: '#121014', bangs: .3, skin: '#d9a27a', eyes: '#2a1a10', iris: '#3a2410', host: true,
    stats: { POW: 8, TEC: 5, SPD: 5, JMP: 5 }, color: '#ffd36a', celebrate: 'Cheering_Two_Hands',
    voice: { base: 120, range: 7, rate: 13, formant: .8, wave: 'saw', breath: .3, vib: 6 },
    outfit: { cloth: '#2fb5a0', pattern: '#ffd36a', trim: '#ff5f7a', pants: '#f4f2ea', boot: '#d9a27a', strap: '#8a5a32' }, finalKit: { cut: 'rash', pattern: 'pin', colors: { main: '#16141c', accent: '#16141c', trim: '#ffd36a' } } },
  pepper: { name: 'Pepper', full: 'Pepper Quill', epithet: 'The House Always Wins', from: 'Isla Fortuna', style: 'Concierge, scorekeeper, dealer', age: 34, size: 1.24, build: 'athletic',
    hair: 'bun', hairColor: '#5a2a1e', bangs: .5, skin: '#f0c8a8', eyes: '#2a1a14', iris: '#4a6a3a', host: true,
    stats: { POW: 6, TEC: 10, SPD: 7, JMP: 6 }, color: '#9fd3d6', celebrate: 'Salute',
    voice: { base: 230, range: 1, rate: 17, formant: 1.0, wave: 'triangle', breath: .1 },
    outfit: { cloth: '#1d2433', trim: '#ffd36a', pants: '#1d2433', boot: '#2a2228' }, finalKit: { cut: 'racer', pattern: 'pin', colors: { main: '#121216', accent: '#f4f4f4', trim: '#ffd36a' } } },
  kai: { name: 'Kai', full: 'Kai Makoa', epithet: 'Bartender and croupier', size: 1.25, build: 'heroic', hair: 'short', hairColor: '#141012', skin: '#a8714a', eyes: '#1a1210', iris: '#2a1a10', staff: true,
    voice: { base: 170, range: 4, rate: 12, formant: .85, wave: 'triangle', breath: .3 }, color: '#2fb5a0', outfit: { cloth: '#2fb5a0', pattern: '#ff8aa8', trim: '#ffffff', pants: '#c8b080', boot: '#a8714a', strap: '#5a3a1a' }, pat: 'floral' },
  odette: { name: 'Odette', full: 'Odette Belrose', epithet: 'Couturier', size: 1.2, build: 'athletic', hair: 'long', hairColor: '#c8b8e8', skin: '#f6d6c4', eyes: '#3a2a4a', iris: '#7a5ac8', staff: true,
    voice: { base: 300, range: 5, rate: 12, formant: 1.1, wave: 'pulse', breath: .3 }, color: '#ff8aa8', outfit: { cloth: '#ff8aa8', trim: '#ffffff', pants: '#ff8aa8', boot: '#f6d6c4', strap: '#e8c060' }, robe: true, hat: { style: 'sunhat', color: '#f0d890', band: '#ff5f7a' } },
  bo: { name: 'Coach Bo', full: 'Coach Bo Brannigan', epithet: 'Retired beach pro', size: 1.28, build: 'bulky', hair: 'bald', hairColor: '#8a5a3a', skin: '#e0a880', eyes: '#2a2010', iris: '#3a5a8a', staff: true,
    voice: { base: 150, range: 3, rate: 14, formant: .85, wave: 'square', breath: .2 }, color: '#ffd04a', outfit: { cloth: '#ffd04a', trim: '#3a6ad8', pants: '#3a6ad8', boot: '#e0a880', strap: '#2a2a2a' }, hat: { style: 'visor', color: '#ffffff', brim: '#3a6ad8' } }
};
for (const id in G.CAST) G.CAST[id].id = id;
G.voiceOf = who => (G.CAST[who] && G.CAST[who].voice) || null;
G.castName = id => (G.CAST[id] ? G.CAST[id].name : id);

/* ---- tastes: gifts (L love, + like, . neutral, - dislike) in the order rin lola ingrid amara tess mei ---- */
G.GIFT_TASTE_TABLE = {
  mango_smoothie: '.+.++.', bubble_tea: '.....+', matcha_icecream: '+.+..+', mochi_box: '+....L', bbq_skewers: '.+..L-', hot_sauce: '-L-.+-',
  iced_coffee: '..+...', coconut: '....+.', plush_seal: 'L.+..+', snow_globe: '..L-..', puzzle_cube: '+-...L', portable_speaker: '-+.L+.',
  matcha_kit: 'L-...+', calligraphy_set: '+...-.', knitting_kit: '..L-.-', maracas: '.+.+..', luchador_mask: '.L..+.', beach_paperback: '+-+...',
  fashion_mag: '..-+-+', energy_drink: '-..-+-', surf_wax: '....L.', sunscreen: '..+.+.', foam_finger: '-+..+.', glitter_sandals: '..-+-+', gold_hoops: '.+.L..'
};
G.TASTE_KEY = { L: 'love', '+': 'like', '.': 'neutral', '-': 'dislike' };
G.giftTaste = (who, item) => { const row = G.GIFT_TASTE_TABLE[item], i = G.FIGHTERS.indexOf(who); return row && i >= 0 ? G.TASTE_KEY[row[i]] : 'neutral'; };

/* ---- starting affinity between the fighters (symmetric); also used to pair NPCs into teams ---- */
G.BASE_AFFINITY = {
  rin: { lola: 20, ingrid: 35, amara: 25, tess: 30, mei: 40 }, lola: { ingrid: 25, amara: 40, tess: 45, mei: 20 },
  ingrid: { amara: 20, tess: 35, mei: 25 }, amara: { tess: 30, mei: 40 }, tess: { mei: 25 }
};
G.baseAff = (a, b) => (G.BASE_AFFINITY[a] && G.BASE_AFFINITY[a][b]) || (G.BASE_AFFINITY[b] && G.BASE_AFFINITY[b][a]) || 25;

/* ---- the opponents' skill by match (before stats, difficulty and the AI skill slider) ---- */
G.DAY_SKILL = { tutorial: .3, 1: .4, 2: .5, 3: .58, 4: .66, semi: .74, final: .78, exhibition: .55, hub: .5, attract: 1 };
