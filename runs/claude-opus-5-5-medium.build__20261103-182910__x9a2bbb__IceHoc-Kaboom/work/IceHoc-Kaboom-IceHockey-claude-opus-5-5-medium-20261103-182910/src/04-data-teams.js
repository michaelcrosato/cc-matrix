/* ---- TEAMS: six clubs (PLAN 11.1). Ratings 1-5: spd sht pas hit fgt hnd; goalies rfx size reb. Everything is data ---- */
const TEAMS = (() => {
  // a player: [num, first, nick, last, role, build, [spd, sht, pas, hit, fgt, hnd], hand (1 right, -1 left), look]
  const sk = (num, name, nick, role, build, r, hand, look) => ({ num, name, nick, role, build, spd: r[0], sht: r[1], pas: r[2], hit: r[3], fgt: r[4], hnd: r[5], hand, look });
  const gk = (num, name, nick, r, look) => ({ num, name, nick, goalie: true, rfx: r[0], size: r[1], reb: r[2], look });
  const T = {
    muskrats: { id: 'muskrats', name: 'Mukluk Falls Muskrats', short: 'MUSKRATS', abbr: 'MUK', town: 'MUKLUK FALLS', dark: '#5a3a22', trim: '#e8b43a', light: '#f3e6c8', voice: 'mid',
      song: ['G4', 'B4', 'D5', 'G5'], logo: 'muskrat', arena: 'icebox',
      skaters: [sk(9, 'Duncan MacPhail', 'Dunny', 'C', 'heroic', [4, 3, 5, 3, 2, 4], -1, { hair: 'short', hairC: '#c8742a', skin: '#f0c8a0', voice: 'dunny', celebrate: 'pump' }),
        sk(19, 'Priya Sandhu', 'Snipes', 'W', 'heroic', [5, 5, 3, 2, 2, 5], 1, { hair: 'ponytail', hairC: '#1a1414', skin: '#b8805a', voice: 'snipes', celebrate: 'sniper' }),
        sk(44, 'Lou Beaudoin', 'Big Lou', 'D', 'bulky', [2, 4, 2, 5, 5, 2], 1, { hair: 'bald', hairC: '#3a2a20', skin: '#8a5a3a', voice: 'lou', celebrate: 'guitar' })],
      goalie: gk(31, 'Lemmy Kowalchuk', 'The Sieve', [3, 4, 3], { hair: 'long', hairC: '#d8c890', skin: '#f0d0b0', voice: 'lemmy', mask: '#e8b43a', pads: '#f3e6c8' }),
      trait: 'posts' },
    drillers: { id: 'drillers', name: 'Dryfork Drillers', short: 'DRILLERS', abbr: 'DRY', town: 'DRYFORK', dark: '#1d1d22', trim: '#f07a1a', light: '#f2efe8', voice: 'low', song: ['E4', 'G4', 'A4', 'E5'], logo: 'derrick', arena: 'icebox',
      skaters: [sk(7, 'Rig McCoy', 'Rig', 'C', 'heroic', [3, 3, 4, 3, 3, 3], 1, { hair: 'short', hairC: '#5a3a1a', skin: '#e8b890' }),
        sk(15, 'Gusher Gomez', 'Gusher', 'W', 'heroic', [4, 4, 3, 2, 2, 4], -1, { hair: 'spiky', hairC: '#1a1210', skin: '#c08a60' }),
        sk(2, 'Drill Bit Dobbs', 'Drill Bit', 'D', 'heroic', [3, 2, 2, 4, 3, 2], 1, { hair: 'short', hairC: '#b89060', skin: '#f0c8a8' })],
      goalie: gk(35, 'Derrick Okafor', 'Derrick', [2, 3, 2], { hair: 'short', hairC: '#140c0a', skin: '#6a4028', mask: '#f07a1a', pads: '#1d1d22' }) },
    lumberjacks: { id: 'lumberjacks', name: 'Logjam Lumberjacks', short: 'LUMBERJACKS', abbr: 'LOG', town: 'LOGJAM', dark: '#b3262a', trim: '#141414', light: '#efe4cc', voice: 'low', song: ['D4', 'F#4', 'A4', 'D5'], logo: 'log', arena: 'pond', plaid: true,
      skaters: [sk(10, 'Axel Sundqvist', 'Axel', 'C', 'heroic', [3, 4, 3, 3, 3, 3], -1, { hair: 'long', hairC: '#e0c070', skin: '#f0d0b0', beard: true }),
        sk(27, 'Sally Lindgren', 'Sawdust Sally', 'W', 'heroic', [4, 4, 3, 3, 2, 4], 1, { hair: 'ponytail', hairC: '#c8602a', skin: '#f4d0b8' }),
        sk(88, 'Big Timber Thibodeau', 'Big Timber', 'D', 'bulky', [2, 3, 2, 5, 4, 2], 1, { hair: 'long', hairC: '#4a2a14', skin: '#e0a880', beard: true })],
      goalie: gk(1, "Stumpy O'Rourke", 'Stumpy', [3, 4, 3], { hair: 'short', hairC: '#8a4a1a', skin: '#f0c8a0', mask: '#b3262a', pads: '#efe4cc' }) },
    bruisers: { id: 'bruisers', name: 'Grindhouse Bruise Brothers', short: 'BRUISE BROS', abbr: 'GRD', town: 'THE GRINDHOUSE', dark: '#4b2a6b', trim: '#9be04a', light: '#ecf2e0', voice: 'gruff', song: ['A3', 'C4', 'E4', 'A4'], logo: 'fist', arena: 'grindhouse',
      skaters: [sk(66, 'Rocco Bruiser', 'Rocco', 'W', 'bulky', [3, 3, 2, 5, 5, 2], 1, { hair: 'bald', hairC: '#2a1a10', skin: '#d8a078' }),
        sk(67, 'Rollo Bruiser', 'Rollo', 'D', 'bulky', [3, 3, 2, 5, 5, 2], -1, { hair: 'spiky', hairC: '#2a1a10', skin: '#d8a078' }),
        sk(12, 'Mumbles Malone', 'Mumbles', 'C', 'heroic', [4, 4, 3, 2, 3, 4], 1, { hair: 'short', hairC: '#6a6a6a', skin: '#f0c8a0' })],
      goalie: gk(29, 'Tank Tankersley', 'Tank', [3, 5, 2], { hair: 'short', hairC: '#1a1a1a', skin: '#8a5a3a', mask: '#9be04a', pads: '#4b2a6b' }) },
    marauders: { id: 'marauders', name: 'Megaplex Marauders', short: 'MARAUDERS', abbr: 'MEG', town: 'MEGAMALL', dark: '#18b5b0', trim: '#e0389a', light: '#f4f0f8', voice: 'nasal', song: ['C5', 'E5', 'G5', 'C6'], logo: 'cart', arena: 'mall',
      skaters: [sk(23, 'Chad Glitterman', 'Chad', 'C', 'heroic', [4, 3, 4, 2, 1, 4], 1, { hair: 'spiky', hairC: '#f0d060', skin: '#f4d0b8', voice: 'glitter' }),
        sk(8, 'Zoom Zhang', 'Zoom', 'W', 'heroic', [5, 3, 3, 2, 2, 4], -1, { hair: 'short', hairC: '#141018', skin: '#f0d0a8' }),
        sk(5, 'Promo Perkins', 'Promo', 'D', 'heroic', [3, 3, 3, 4, 3, 3], 1, { hair: 'short', hairC: '#7a4a2a', skin: '#a87050' })],
      goalie: gk(40, 'Kiosk Kingsley', 'Kiosk', [4, 3, 4], { hair: 'short', hairC: '#2a1a10', skin: '#e0b090', mask: '#e0389a', pads: '#18b5b0' }) },
    grizzlies: { id: 'grizzlies', name: 'Gilded Grizzlies', short: 'GRIZZLIES', abbr: 'GLD', town: 'THE KABOOM DOME', dark: '#d9a520', trim: '#141414', light: '#fbf6e6', voice: 'nasal', song: ['F4', 'A4', 'C5', 'F5'], logo: 'grizzly', arena: 'dome', locked: true,
      skaters: [sk(1, 'Sterling Glitterman Jr.', 'Sterling', 'C', 'heroic', [5, 5, 4, 3, 2, 5], 1, { hair: 'spiky', hairC: '#ffe070', skin: '#f4d8c0', voice: 'glitter', twister: true }),
        sk(91, 'Silk Sullivan', 'Silk', 'W', 'heroic', [4, 3, 5, 2, 2, 5], -1, { hair: 'long', hairC: '#2a1a14', skin: '#c89070' }),
        sk(55, 'Brick Brickowski', 'Brick', 'D', 'bulky', [3, 4, 2, 5, 5, 2], 1, { hair: 'bald', hairC: '#3a2a1a', skin: '#e0b090' })],
      goalie: gk(0, 'The Vault', 'The Vault', [5, 5, 5], { hair: 'bald', hairC: '#1a1a1a', skin: '#5a3a28', mask: '#141414', pads: '#d9a520', boss: true }) }
  };
  for (const id in T) { const t = T[id]; t.skaters.forEach((s, i) => { s.team = id; s.slot = i; }); t.goalie.team = id; }
  return T;
})();
const TEAM_IDS = ['muskrats', 'drillers', 'lumberjacks', 'bruisers', 'marauders', 'grizzlies'];

/* ---- LOGOS: each a 24 x 24 pixel image drawn from a few shapes into a palette grid ---- */
const LOGOS = (() => {
  const make = (pal, fn) => { const rows = []; for (let y = 0; y < 24; y++) { let s = ''; for (let x = 0; x < 24; x++) s += fn(x + .5, y + .5) || '.'; rows.push(s); } return { rows, pal }; };
  const d = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);
  const ring = (x, y, k0, k1) => { const r = d(x, y, 12, 12); return r < 11.5 ? (r > 9.6 ? k0 : k1) : null; };
  const L = {
    muskrat: make({ r: '#e8b43a', b: '#5a3a22', l: '#8a5a32', w: '#ffffff', k: '#141010', p: '#e88a8a', c: '#f3e6c8' }, (x, y) => {
      const o = ring(x, y, 'r', 'c'); if (!o) return null; if (o === 'r') return 'r';
      if (d(x, y, 7, 6.5) < 2.4 || d(x, y, 17, 6.5) < 2.4) return d(x, y, 7, 6.5) < 1.2 || d(x, y, 17, 6.5) < 1.2 ? 'p' : 'b';
      if (d(x, y, 12, 12.5) < 7.2) { if (d(x, y, 9.3, 10.5) < 1.2 || d(x, y, 14.7, 10.5) < 1.2) return 'k'; if (d(x, y, 12, 13.5) < 1.3) return 'k';
        if (x > 10 && x < 14 && y > 15 && y < 19.5 && Math.abs(x - 12) > .4) return 'w'; return d(x, y, 12, 15) < 3.6 ? 'l' : 'b'; }
      return 'c'; }),
    derrick: make({ o: '#f07a1a', k: '#1d1d22', g: '#8a8a94', w: '#f2efe8', y: '#ffd040' }, (x, y) => {
      const o = ring(x, y, 'o', 'k'); if (!o) return null; if (o === 'o') return 'o';
      const t = (y - 4) / 15; if (y > 4 && y < 19 && Math.abs(x - 12) < 1 + t * 5 && (Math.abs(Math.abs(x - 12) - (1 + t * 5)) < 1 || Math.abs((y % 4) - 2) < .6)) return 'g';
      if (y > 18.5 && y < 20 && Math.abs(x - 12) < 7) return 'w';
      if (d(x, y, 17, 8) < 2 || (y > 4 && y < 8 && Math.abs(x - 17) < (y - 4) * .5)) return 'y';
      return 'k'; }),
    log: make({ r: '#b3262a', k: '#141414', w: '#efe4cc', b: '#8a5a2a', d: '#5a3414', e: '#141414' }, (x, y) => {
      const o = ring(x, y, 'r', 'k'); if (!o) return null; if (o === 'r') return Math.floor(x / 3 + y / 3) % 2 ? 'r' : 'k';
      if (d(x, y, 12, 10) < 6.5) { const rr = d(x, y, 12, 10); if (Math.abs(rr - 4) < .5 || Math.abs(rr - 2) < .4) return 'd'; if (d(x, y, 9.8, 9.2) < .9 || d(x, y, 14.2, 9.2) < .9) return 'e'; return 'b'; }
      if (y > 13 && y < 20 && Math.abs(x - 12) < 7 - (y - 13) * .7) return Math.floor(y) % 2 ? 'r' : 'd';
      return 'w'; }),
    fist: make({ l: '#9be04a', p: '#4b2a6b', s: '#e0b090', d: '#8a5a3a', k: '#1a1028' }, (x, y) => {
      const r = d(x, y, 12, 12), a = Math.atan2(y - 12, x - 12); if (r > 11.5) return null;
      if (r > 8.4) return Math.cos(a * 8) > .1 || r < 9.6 ? 'l' : null;
      if (x > 7 && x < 17 && y > 8 && y < 16) { if (y < 11 && Math.floor(x - 7) % 2.5 < .5) return 'd'; return x < 8.5 && y > 11 ? 'd' : 's'; }
      if (x > 9 && x < 15 && y >= 16 && y < 19) return 'p';
      return 'k'; }),
    cart: make({ t: '#18b5b0', m: '#e0389a', w: '#f4f0f8', k: '#1a1a24', g: '#c0c8d0' }, (x, y) => {
      const o = ring(x, y, 'm', 't'); if (!o) return null; if (o === 'm') return 'm';
      if (x > 6 && x < 18 && y > 10 && y < 16 && (Math.floor(x) % 3 === 0 || Math.floor(y) % 3 === 0 || x < 7 || x > 17 || y > 15)) return 'g';
      if (d(x, y, 8.5, 17.5) < 1.4 || d(x, y, 15.5, 17.5) < 1.4) return 'k';
      if (Math.abs(x - 11) < .6 && y > 3.5 && y < 10.5) return 'k';
      if (x > 11.5 && x < 17 && y > 3.5 && y < 7.5) return d(x, y, 14, 5.5) < 1.2 ? 'w' : 'k';
      return 't'; }),
    grizzly: make({ g: '#d9a520', k: '#141414', b: '#6a3a1a', l: '#a06a3a', w: '#fbf6e6', y: '#ffe070' }, (x, y) => {
      const o = ring(x, y, 'g', 'k'); if (!o) return null; if (o === 'g') return 'g';
      if (y > 2.8 && y < 7 && x > 7 && x < 17 && (y > 5 || Math.abs(((x - 7) % 3.3) - 1.6) < .9)) return 'y';
      if (d(x, y, 7.5, 9) < 2.2 || d(x, y, 16.5, 9) < 2.2) return 'b';
      if (d(x, y, 12, 13) < 6.5) { if (d(x, y, 9.5, 11.5) < 1 || d(x, y, 14.5, 11.5) < 1) return 'k'; if (d(x, y, 12, 15.5) < 2.8) return d(x, y, 12, 14.8) < 1.1 ? 'k' : 'l'; return 'b'; }
      return 'k'; })
  };
  const sprites = {};
  for (const id in L) sprites[id] = E.sprite(L[id].rows, L[id].pal);
  /** the color of a logo pixel (center ice samples it), or null */
  const at = (id, x, y) => { const l = L[id]; if (!l || x < 0 || y < 0 || x >= 24 || y >= 24) return null; const ch = l.rows[y | 0][x | 0]; return ch === '.' ? null : l.pal[ch]; };
  return { L, sprites, at, sprite: id => sprites[id] };
})();
