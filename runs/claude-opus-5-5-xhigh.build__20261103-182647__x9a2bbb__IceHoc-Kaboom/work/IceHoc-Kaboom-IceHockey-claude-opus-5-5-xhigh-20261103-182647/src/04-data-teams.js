/* ---- TEAMS (section 11.1): 3 skaters + 1 goalie each. Skater ratings r: [Spd, Sht, Pas, Hit, Fgt, Hnd] 1-5; goalie
 * r: [Rfx, Size, Reb]. Logos are shape lists in a 24 x 24 space (Logo below samples and draws them): one table feeds the
 * center-ice paint, the score bug, the menu cards and the bench banners. Voices feed the babble synth ---- */
const V = (base, range, speed, wave, fmt, gruff, vib) => ({ base, range, speed, wave, fmt, gruff, vib });
const TEAMS = {
  muskrats: {
    id: 'muskrats', name: 'MUKLUK FALLS MUSKRATS', short: 'MUSKRATS', abbr: 'MUK', town: 'MUKLUK FALLS',
    dark: '#5a3a22', trim: '#e8b43a', light: '#f3e6c8', pants: '#3a2414', song: 'muk',
    logo: [['disc', 12, 12, 11.6, '#e8b43a'], ['disc', 12, 12, 9.4, '#3a2414'], ['disc', 6.2, 6.8, 2.6, '#8a5a32'], ['disc', 17.8, 6.8, 2.6, '#8a5a32'], ['disc', 6.2, 6.8, 1.2, '#d89a6a'], ['disc', 17.8, 6.8, 1.2, '#d89a6a'],
      ['ell', 12, 12.5, 7, 6.2, '#8a5a32'], ['ell', 12, 16, 4.4, 3.2, '#d8b088'], ['disc', 9, 10.6, 1.4, '#ffffff'], ['disc', 15, 10.6, 1.4, '#ffffff'], ['disc', 9.3, 10.9, .7, '#141010'], ['disc', 15.3, 10.9, .7, '#141010'],
      ['ell', 12, 14.2, 1.6, 1.1, '#2a1a10'], ['rect', 10.8, 16.6, 2.4, 3.2, '#fff6e0'], ['rect', 11.85, 16.6, .4, 3.2, '#c8b898'], ['rect', 5, 15.5, 3, .5, '#2a1a10'], ['rect', 16, 15.5, 3, .5, '#2a1a10']],
    players: [
      { num: 9, name: 'DUNNY', full: 'Duncan "Dunny" MacPhail', pos: 'C', build: 'heroic', r: [4, 3, 5, 3, 2, 4], hand: 'L', hair: { style: 'short', color: '#c87a3a' }, skin: '#f0c8a0', voice: V(185, 4, 11, 'pulse', 1, .05), celeb: 'pump', letter: 'C' },
      { num: 19, name: 'SNIPES', full: 'Priya "Snipes" Sandhu', pos: 'W', build: 'heroic', r: [5, 5, 3, 2, 2, 5], hand: 'R', hair: { style: 'ponytail', color: '#1a1010' }, skin: '#b07850', voice: V(300, 5, 14, 'pulse', 1.1, 0), celeb: 'sniper' },
      { num: 44, name: 'BIG LOU', full: 'Lou "Big Lou" Beaudoin', pos: 'D', build: 'bulky', r: [2, 4, 2, 5, 5, 2], hand: 'R', hair: { style: 'short', color: '#2a1a12' }, skin: '#d8a880', beard: '#3a2418', voice: V(95, 2, 7, 'saw', .85, .1), celeb: 'guitar', letter: 'A' }
    ],
    goalie: { num: 31, name: 'LEMMY', full: 'Lemmy "The Sieve" Kowalchuk', r: [3, 4, 3], skin: '#f0d0b0', hair: { style: 'long', color: '#e0c070' }, mask: ['#e8b43a', '#5a3a22'], voice: V(170, 6, 10, 'pulse', 1, 0, [6, .04]), trait: 'posts' }
  },
  drillers: {
    id: 'drillers', name: 'DRYFORK DRILLERS', short: 'DRILLERS', abbr: 'DRY', town: 'DRYFORK',
    dark: '#1d1d22', trim: '#f07a1a', light: '#f4ece0', pants: '#141418', song: 'dry',
    logo: [['disc', 12, 12, 11.6, '#f07a1a'], ['disc', 12, 12, 9.6, '#1d1d22'], ['poly', [[12, 3.5], [16.5, 19], [7.5, 19]], '#f07a1a'], ['poly', [[12, 6.5], [14.6, 17.4], [9.4, 17.4]], '#1d1d22'],
      ['rect', 9.3, 12.4, 5.4, 1, '#f07a1a'], ['rect', 8.6, 15.2, 6.8, 1, '#f07a1a'], ['rect', 5.5, 19, 13, 1.6, '#f07a1a'], ['ell', 12, 9.5, 1.6, 2.2, '#5ac8ff'], ['poly', [[12, 6.2], [13.3, 9], [10.7, 9]], '#5ac8ff']],
    players: [
      { num: 7, name: 'RIG', full: '"Rig" McCoy', pos: 'C', build: 'heroic', r: [3, 3, 4, 3, 3, 3], hand: 'L', hair: { style: 'short', color: '#6a4a2a' }, skin: '#e0b090', voice: V(150, 3, 10, 'saw', .95, .05), celeb: 'pump' },
      { num: 15, name: 'GUSHER', full: '"Gusher" Gomez', pos: 'W', build: 'heroic', r: [4, 4, 3, 2, 2, 4], hand: 'R', hair: { style: 'spiky', color: '#1a1410' }, skin: '#c08860', voice: V(210, 5, 13, 'pulse', 1.05, 0), celeb: 'slide' },
      { num: 2, name: 'DRILL BIT', full: '"Drill Bit" Dobbs', pos: 'D', build: 'heroic', r: [3, 2, 2, 4, 3, 2], hand: 'L', hair: { style: 'bald', color: '#3a2a1a' }, skin: '#8a5a3a', voice: V(120, 3, 9, 'saw', .9, .08), celeb: 'glass' }
    ],
    goalie: { num: 35, name: 'OKAFOR', full: 'Derrick Okafor', r: [2, 3, 2], skin: '#6a4028', hair: { style: 'short', color: '#141010' }, mask: ['#f07a1a', '#1d1d22'], voice: V(140, 3, 9, 'saw', .95, .03) }
  },
  lumberjacks: {
    id: 'lumberjacks', name: 'LOGJAM LUMBERJACKS', short: 'LUMBERJACKS', abbr: 'LOG', town: 'LOGJAM',
    dark: '#b3262a', trim: '#141414', light: '#f0e6d0', pants: '#141414', song: 'log', plaid: true,
    logo: [['disc', 12, 12, 11.6, '#141414'], ['disc', 12, 12, 9.8, '#b3262a'], ['ell', 12, 10.5, 7.2, 6.4, '#a8743a'], ['ell', 12, 10.5, 5.4, 4.8, '#c8945a'], ['ell', 12, 10.5, 3.4, 3, '#a8743a'], ['ell', 12, 10.5, 1.5, 1.3, '#c8945a'],
      ['poly', [[5, 12], [19, 12], [17.5, 18], [12, 21.5], [6.5, 18]], '#5a2a14'], ['poly', [[7, 12.5], [17, 12.5], [12, 16.5]], '#c8945a'], ['disc', 9.4, 9.2, 1.1, '#141414'], ['disc', 14.6, 9.2, 1.1, '#141414'],
      ['rect', 7.6, 7.2, 3.4, .9, '#5a2a14'], ['rect', 13, 7.2, 3.4, .9, '#5a2a14'], ['rect', 10.6, 14.3, 2.8, .8, '#2a1008']],
    players: [
      { num: 10, name: 'AXEL', full: 'Axel Sundqvist', pos: 'C', build: 'heroic', r: [3, 4, 3, 3, 3, 3], hand: 'L', hair: { style: 'long', color: '#e8d090' }, skin: '#f0d0b0', beard: '#c8a060', voice: V(160, 3, 9, 'saw', .95, .06), celeb: 'guitar' },
      { num: 27, name: 'SAWDUST', full: '"Sawdust" Sally Lindgren', pos: 'W', build: 'heroic', r: [4, 4, 3, 3, 2, 4], hand: 'R', hair: { style: 'ponytail', color: '#c86a2a' }, skin: '#f0c8a8', voice: V(280, 5, 12, 'pulse', 1.1, 0), celeb: 'sniper' },
      { num: 88, name: 'BIG TIMBER', full: '"Big Timber" Thibodeau', pos: 'D', build: 'bulky', r: [2, 3, 2, 5, 4, 2], hand: 'L', hair: { style: 'long', color: '#5a3018' }, skin: '#e0b088', beard: '#5a3018', voice: V(85, 2, 7, 'saw', .8, .14), celeb: 'glass' }
    ],
    goalie: { num: 1, name: 'STUMPY', full: '"Stumpy" O\'Rourke', r: [3, 4, 3], skin: '#f0c0a0', hair: { style: 'spiky', color: '#c84a2a' }, mask: ['#b3262a', '#141414'], voice: V(200, 4, 11, 'pulse', 1, .03) }
  },
  bruisers: {
    id: 'bruisers', name: 'GRINDHOUSE BRUISE BROTHERS', short: 'BRUISE BROS', abbr: 'GRD', town: 'THE GRINDHOUSE',
    dark: '#4b2a6b', trim: '#9be04a', light: '#ece6f4', pants: '#24143a', song: 'grd',
    logo: [['disc', 12, 12, 11.6, '#9be04a'], ['disc', 12, 12, 10, '#24143a'], ['disc', 12, 12, 8.4, '#9be04a'], ['rect', 10.6, .8, 2.8, 3, '#9be04a'], ['rect', 10.6, 20.2, 2.8, 3, '#9be04a'], ['rect', .8, 10.6, 3, 2.8, '#9be04a'], ['rect', 20.2, 10.6, 3, 2.8, '#9be04a'],
      ['poly', [[3.8, 4.8], [5.8, 2.8], [8, 5], [6, 7]], '#9be04a'], ['poly', [[20.2, 4.8], [18.2, 2.8], [16, 5], [18, 7]], '#9be04a'], ['poly', [[3.8, 19.2], [5.8, 21.2], [8, 19], [6, 17]], '#9be04a'], ['poly', [[20.2, 19.2], [18.2, 21.2], [16, 19], [18, 17]], '#9be04a'],
      ['disc', 12, 12, 6.6, '#4b2a6b'], ['rect', 7.8, 8.4, 8.4, 6.2, '#e0b088'], ['rect', 7.8, 8.4, 8.4, 1.2, '#f0c8a0'], ['rect', 9.8, 8.4, .5, 4, '#a87050'], ['rect', 11.9, 8.4, .5, 4, '#a87050'], ['rect', 14, 8.4, .5, 4, '#a87050'],
      ['rect', 8.6, 14.4, 6.6, 3, '#e0b088'], ['rect', 6.4, 10.6, 1.8, 3.4, '#e0b088']],
    players: [
      { num: 66, name: 'ROCCO', full: 'Rocco Bruiser', pos: 'D', build: 'bulky', r: [3, 3, 2, 5, 5, 2], hand: 'R', hair: { style: 'spiky', color: '#141010' }, skin: '#e0a880', voice: V(105, 2, 8, 'saw', .85, .12), celeb: 'glass' },
      { num: 67, name: 'ROLLO', full: 'Rollo Bruiser', pos: 'W', build: 'bulky', r: [3, 3, 2, 5, 5, 2], hand: 'L', hair: { style: 'bald', color: '#141010' }, skin: '#e0a880', beard: '#2a1a12', voice: V(98, 2, 8, 'saw', .85, .14), celeb: 'pump' },
      { num: 12, name: 'MUMBLES', full: '"Mumbles" Malone', pos: 'C', build: 'heroic', r: [4, 4, 3, 2, 3, 4], hand: 'L', hair: { style: 'short', color: '#7a5a3a' }, skin: '#f0c8a0', voice: V(140, 2, 16, 'saw', .9, .2), celeb: 'slide' }
    ],
    goalie: { num: 29, name: 'TANK', full: '"Tank" Tankersley', r: [3, 5, 2], skin: '#c89070', hair: { style: 'short', color: '#2a1a12' }, mask: ['#9be04a', '#4b2a6b'], voice: V(90, 2, 7, 'saw', .8, .15) }
  },
  marauders: {
    id: 'marauders', name: 'MEGAPLEX MARAUDERS', short: 'MARAUDERS', abbr: 'MEG', town: 'MEGAMALL',
    dark: '#18b5b0', trim: '#e0389a', light: '#f0f8f8', pants: '#0e3a44', song: 'meg',
    logo: [['disc', 12, 12, 11.6, '#e0389a'], ['disc', 12, 12, 9.8, '#0e3a44'], ['rect', 11.2, 3, .9, 9, '#e8e8e8'], ['poly', [[12, 3.2], [19, 4.6], [12, 8.4]], '#141414'], ['disc', 14.6, 5.6, 1.1, '#ffffff'], ['rect', 14, 6.4, 1.2, .5, '#ffffff'],
      ['poly', [[4.5, 11], [19.5, 11], [17.6, 17], [7, 17]], '#18b5b0'], ['rect', 4.5, 11, 15, 1, '#e0389a'], ['rect', 8, 12.6, .8, 4, '#0e3a44'], ['rect', 11, 12.6, .8, 4, '#0e3a44'], ['rect', 14, 12.6, .8, 4, '#0e3a44'],
      ['rect', 6.4, 17.6, 12, .9, '#18b5b0'], ['disc', 8.4, 19.6, 1.5, '#e0389a'], ['disc', 16.2, 19.6, 1.5, '#e0389a'], ['rect', 2.4, 9.6, 3, .9, '#18b5b0']],
    players: [
      { num: 23, name: 'CHAD', full: 'Chad Glitterman', pos: 'C', build: 'heroic', r: [4, 3, 4, 2, 1, 4], hand: 'R', hair: { style: 'spiky', color: '#f0d070' }, skin: '#f0c0a0', voice: V(220, 6, 14, 'pulse', 1.15, 0), celeb: 'sniper' },
      { num: 8, name: 'ZOOM', full: '"Zoom" Zhang', pos: 'W', build: 'heroic', r: [5, 3, 3, 2, 2, 4], hand: 'L', hair: { style: 'short', color: '#141010' }, skin: '#e8c098', voice: V(250, 5, 15, 'pulse', 1.1, 0), celeb: 'slide' },
      { num: 5, name: 'PROMO', full: '"Promo" Perkins', pos: 'D', build: 'heroic', r: [3, 3, 3, 4, 3, 3], hand: 'R', hair: { style: 'short', color: '#a85a2a' }, skin: '#d8a078', voice: V(150, 4, 12, 'saw', 1, .04), celeb: 'pump' }
    ],
    goalie: { num: 40, name: 'KIOSK', full: '"Kiosk" Kingsley', r: [4, 3, 4], skin: '#a87050', hair: { style: 'short', color: '#141010' }, mask: ['#e0389a', '#18b5b0'], voice: V(175, 4, 11, 'pulse', 1.05, 0) }
  },
  grizzlies: {
    id: 'grizzlies', name: 'GILDED GRIZZLIES', short: 'GRIZZLIES', abbr: 'GLD', town: 'GLITTERMAN CITY', locked: true,
    dark: '#d9a520', trim: '#141414', light: '#fbf6e8', pants: '#141414', song: 'gld',
    logo: [['disc', 12, 12, 11.6, '#141414'], ['disc', 12, 12, 10, '#d9a520'], ['disc', 12, 12, 9, '#141414'], ['disc', 6.5, 10.5, 2.4, '#6a4020'], ['disc', 17.5, 10.5, 2.4, '#6a4020'], ['ell', 12, 14.2, 6.8, 6, '#6a4020'],
      ['ell', 12, 16.8, 3.6, 2.6, '#c89060'], ['ell', 12, 15.6, 1.4, 1, '#141010'], ['disc', 9.2, 13, .9, '#141010'], ['disc', 14.8, 13, .9, '#141010'],
      ['poly', [[6, 9.5], [6, 4.5], [8.8, 7], [12, 3.2], [15.2, 7], [18, 4.5], [18, 9.5]], '#ffd84a'], ['rect', 6, 8.3, 12, 1.4, '#c8901a'], ['disc', 12, 6, .9, '#ff3a5a'], ['disc', 8.4, 8.9, .6, '#5ac8ff'], ['disc', 15.6, 8.9, .6, '#5ac8ff']],
    players: [
      { num: 1, name: 'STERLING', full: 'Sterling Glitterman Jr.', pos: 'C', build: 'heroic', r: [5, 5, 4, 3, 2, 5], hand: 'L', hair: { style: 'spiky', color: '#ffe08a' }, skin: '#f4d0b0', voice: V(200, 7, 13, 'pulse', 1.12, 0), celeb: 'sniper', letter: 'C', twister: true },
      { num: 91, name: 'SILK', full: '"Silk" Sullivan', pos: 'W', build: 'heroic', r: [4, 3, 5, 2, 2, 5], hand: 'R', hair: { style: 'long', color: '#2a1a14' }, skin: '#c89070', voice: V(260, 4, 10, 'pulse', 1.05, 0), celeb: 'slide' },
      { num: 55, name: 'BRICK', full: '"Brick" Brickowski', pos: 'D', build: 'bulky', r: [3, 4, 2, 5, 5, 2], hand: 'L', hair: { style: 'bald', color: '#3a2a1a' }, skin: '#e0b088', beard: '#3a2a1a', voice: V(88, 2, 7, 'saw', .8, .15), celeb: 'glass' }
    ],
    goalie: { num: '00', name: 'THE VAULT', full: 'The Vault', r: [5, 5, 5], skin: '#c8a080', hair: { style: 'bald', color: '#141010' }, mask: ['#d9a520', '#141414'], voice: V(70, 1, 5, 'saw', .7, .2), boss: true, size: 1.75 }
  }
};
const TEAM_ORDER = ['muskrats', 'drillers', 'lumberjacks', 'bruisers', 'marauders', 'grizzlies'];
for (const id of TEAM_ORDER) { const t = TEAMS[id]; t.players.forEach((p, i) => { p.team = id; p.slot = i; p.key = id + ':' + i; }); t.goalie.team = id; t.goalie.key = id + ':g'; t.goalie.pos = 'G'; }
/** ratings -> multipliers (11.1) */
const RATE = {
  speed: d => .85 + .05 * d.r[0], shot: d => .85 + .05 * d.r[1], err: d => 1.3 - .1 * d.r[1], pass: d => .9 + .033 * d.r[2],
  hit: d => .8 + .067 * d.r[3], fight: d => .8 + .067 * d.r[4], hands: d => .85 + .05 * d.r[5]
};

/* ---- the rest of the cast: the coach, the booth, the town, the villain, the mascot and the officials (their rigs are
 * made by Rigs.cast(id)) ---- */
const CAST = {
  marge: { name: 'COACH MARGE', full: 'Coach Marge Pelletier', look: { build: 'chibi', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'ponytail', colors: { cloth: '#7a4a6a', coat: '#8a5a7a', pants: '#3a3448', hair: '#c8c8d0', skin: '#f0d0b8', trim: '#e8d8a0', boot: '#2a2420' } }, voice: V(130, 3, 7, 'saw', .9, .18) },
  gus: { name: 'OLD GUS', full: 'Old Gus', look: { build: 'chibi', size: 1.15, hat: { style: 'cap', color: '#3a5a8a' }, sleeves: 'long', outfit: 'shirt', hair: 'short', colors: { cloth: '#5a7a4a', pants: '#4a4a5a', hair: '#e8e8e8', skin: '#e8c0a0' } }, voice: V(90, 1, 5, 'saw', .8, .2) },
  doris: { name: 'DORIS', full: 'Doris the organist', look: { build: 'chibi', size: 1.15, outfit: 'robe', sleeves: 'long', hair: 'long', colors: { cloth: '#c84a7a', hair: '#e8a040', skin: '#f0d0b8', trim: '#ffd36a' } }, voice: V(240, 5, 9, 'pulse', 1.1, 0, [5, .05]) },
  glitterman: { name: 'GOLDIE GLITTERMAN', full: 'Goldie Glitterman', look: { build: 'heroic', size: 1.25, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'crown', color: '#ffd84a' }, colors: { cloth: '#141414', coat: '#d9a520', pants: '#141414', hair: '#e8d8a0', skin: '#f4d0b0', trim: '#fff0a0', boot: '#141414' } }, voice: V(150, 5, 11, 'saw', 1.05, .03) },
  pete: { name: 'POLAR PETE', full: 'Polar Pete, the MegaMall mascot', look: { build: 'bulky', size: 1.35, weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'bald', colors: { cloth: '#f4f8ff', pants: '#e8eef8', skin: '#f4f8ff', boot: '#e0e8f4', glove: '#f4f8ff', hair: '#f4f8ff' } }, voice: V(120, 8, 8, 'saw', .7, .3) },
  chuck: { name: 'CHUCK WALLOP', full: 'Chuck Wallop, play-by-play', look: { build: 'heroic', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#f4f4f0', coat: '#2a4a8a', pants: '#1a2440', hair: '#5a3a22', skin: '#f0c8a0', trim: '#c83a3a' } }, voice: V(200, 6, 15, 'pulse', 1.05, 0) },
  moose: { name: 'MOOSE PLUNKETT', full: 'Moose Plunkett, color', look: { build: 'bulky', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#f4f4f0', coat: '#7a2a2a', pants: '#2a1a1a', hair: '#8a8a8a', skin: '#e0a880', trim: '#e8c040' } }, voice: V(95, 3, 8, 'saw', .85, .16) },
  ref: { name: 'REFEREE', full: 'The referee', voice: V(160, 2, 6, 'square', 1, .05) },
  vault: { name: 'THE VAULT', full: 'The Vault' }
};
for (const id of TEAM_ORDER) for (const d of TEAMS[id].players.concat([TEAMS[id].goalie])) CAST[(id + '-' + d.name).toLowerCase().replace(/[^a-z-]/g, '')] = { name: d.name, def: d, voice: d.voice };
const castOf = id => CAST[id] || null;
/** the skater (or goalie) def by name within a team: 'muskrats', 'DUNNY' */
const defBy = (team, name) => { const t = TEAMS[team]; return t.players.find(p => p.name === name) || (t.goalie.name === name ? t.goalie : null); };

/* ---- Logo: sample(team, u, v) in 0..24 gives the top shape's color at a point (or null); draw(g, team, x, y, size)
 * paints it (a cached canvas in a browser, dots headless) ---- */
const Logo = (() => {
  const hit = (s, u, v) => {
    const k = s[0];
    if (k === 'disc') return (u - s[1]) ** 2 + (v - s[2]) ** 2 <= s[3] * s[3];
    if (k === 'ell') return ((u - s[1]) / s[3]) ** 2 + ((v - s[2]) / s[4]) ** 2 <= 1;
    if (k === 'rect') return u >= s[1] && u <= s[1] + s[3] && v >= s[2] && v <= s[2] + s[4];
    if (k === 'poly') { const P = s[1]; let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) inside = !inside; } return inside; }
    return false;
  };
  const col = s => s[s.length - 1];
  const sample = (team, u, v) => { const L = (TEAMS[team] || TEAMS.muskrats).logo; for (let i = L.length - 1; i >= 0; i--) if (hit(L[i], u, v)) return col(L[i]); return null; };
  const cache = new Map();
  const canvasOf = (team, size) => {
    const key = team + ':' + size; if (cache.has(key)) return cache.get(key);
    let cv = null;
    if (!NODE) { cv = E.mkCanvas(size, size); const g = cv.getContext('2d'); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = sample(team, (x + .5) * 24 / size, (y + .5) * 24 / size); if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } }
    cache.set(key, cv); return cv;
  };
  const draw = (g, team, x, y, size = 24) => { const cv = canvasOf(team, Math.round(size)); if (cv && g.drawImage) g.drawImage(cv, Math.round(x), Math.round(y)); };
  return { sample, draw, canvasOf };
})();
