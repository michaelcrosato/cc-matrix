/* ---- TEAMS AND PLAYERS (6 teams of 11). Stars are hand-made; the rest of each squad is generated from the team's name
 * pool and palette with a seeded stream (the same squad every time). Stats 1-10: bat (timing), power, tech, field
 * (speed, catch, ground, throw); bowl: { type, skill, d: [3 delivery ids] }; style: slogger | accumulator | blocker.
 * To add a team: a new entry in TEAM_DEFS (kit colours, ground, stars, pool), then it shows in Quick Match. ---- */
const SKINS = ['#f2d0b0', '#e0b090', '#c89070', '#a87050', '#7a4a30', '#5a3420'];
const HAIRS = ['#2a1a12', '#5a3a22', '#8a5a2a', '#c8902a', '#e8c060', '#9a9a9a', '#d8d8d0', '#a83a1a'];
const TEAM_DEFS = [
  { id: 'ker', code: 'KER', name: 'Kerfuffle CC', nick: 'The Teapots', ground: 'green', chip: '#2f6b3a',
    kit: { cloth: '#f2ead8', pants: '#f2ead8', trim: '#2f6b3a', cap: '#2f6b3a', boot: '#f4f4f0', belt: '#2f6b3a', glove: '#f4f4f0' },
    pool: ['Hodge', 'Pemberton', 'Allsop', 'Twigg', 'Moss', 'Fairweather', 'Hobbs', 'Nettles'],
    stars: [
      { id: 'edie', name: 'Edie Pluckrose', short: 'PLUCKROSE', role: 'all', bat: 8, power: 8, tech: 7, style: 'slogger', hand: 1, bowl: { type: 'pace', skill: 8, d: ['express', 'bouncer', 'yorker'] }, specBat: 'kettle', specBowl: 'vicar', field: [8, 8, 7, 8], voice: 240,
        look: { build: 'heroic', size: 1.2, hair: 'ponytail', hairC: '#b04a1e', skin: '#f2d0b0', freckles: true } },
      { id: 'dev', name: 'Dev Mistry', short: 'MISTRY', role: 'bat', bat: 8, power: 5, tech: 9, style: 'accumulator', hand: 1, bowl: { type: 'medium', skill: 4, d: ['dobber', 'cutter', 'knuckle'] }, specBat: 'certainty', field: [6, 7, 7, 6], voice: 170,
        look: { build: 'heroic', size: 1.15, hair: 'short', hairC: '#1a1410', skin: '#a87050', glasses: true } },
      { id: 'pip', name: 'Pip Larkin', short: 'LARKIN', role: 'keep', bat: 6, power: 4, tech: 6, style: 'accumulator', hand: -1, bowl: null, specField: 'chirp', field: [8, 9, 8, 7], voice: 290,
        look: { build: 'chibi', size: 1.15, hair: 'spiky', hairC: '#ecd070', skin: '#f2d0b0' } },
      { id: 'basil', name: 'Basil Thwaite', short: 'THWAITE', role: 'bowl', bat: 3, power: 3, tech: 5, style: 'blocker', hand: 1, bowl: { type: 'spin', skill: 9, d: ['legbreak', 'googly', 'topspin'] }, specBowl: 'grandad', field: [3, 6, 5, 4], voice: 120,
        look: { build: 'chibi', size: 1.15, hair: 'bald', hairC: '#d8d8d0', skin: '#f2d0b0', moustache: 'walrus', cardigan: '#c8b890', cap: true } }
    ] },
  { id: 'mud', code: 'MUD', name: 'Lower Muddleford Mutineers', nick: 'The Mutineers', ground: 'green', chip: '#e07a2a',
    kit: { cloth: '#6a4a2a', pants: '#e8dcc0', trim: '#e07a2a', cap: '#e07a2a', boot: '#3a2a1a', belt: '#3a2a1a', glove: '#f0e8d8' },
    pool: ['Clod', 'Furrow', 'Bagshaw', 'Wurzel', 'Pratt', 'Muckle', 'Turnip', 'Haybale'],
    stars: [
      { id: 'gaz', name: 'Gaz Gristle', short: 'GRISTLE', role: 'bat', bat: 6, power: 9, tech: 4, style: 'slogger', hand: 1, bowl: { type: 'medium', skill: 4, d: ['dobber', 'cutter', 'knuckle'] }, specBat: 'longhandle', field: [5, 5, 5, 6], voice: 150,
        look: { build: 'bulky', size: 1.2, hair: 'short', hairC: '#5a3a22', skin: '#e0b090', beard: 'full' } },
      { id: 'terry', name: 'Big Terry Dunstable', short: 'DUNSTABLE', role: 'bowl', bat: 4, power: 7, tech: 3, style: 'slogger', hand: 1, bowl: { type: 'medium', skill: 6, d: ['dobber', 'knuckle', 'cutter'] }, specBowl: 'dibbly', field: [3, 5, 4, 5], voice: 130,
        look: { build: 'bulky', size: 1.25, hair: 'bald', hairC: '#8a5a2a', skin: '#f2d0b0' } },
      { id: 'nan', name: 'Nan Gristle', short: 'NAN GRISTLE', role: 'bowl', bat: 4, power: 2, tech: 6, style: 'blocker', hand: 1, bowl: { type: 'spin', skill: 7, d: ['offbreak', 'armball', 'topspin'] }, field: [3, 7, 6, 3], voice: 230,
        look: { build: 'chibi', size: 1.1, hair: 'long', hairC: '#d8d8d0', skin: '#f2d0b0', glasses: true } }
    ] },
  { id: 'gen', code: 'GEN', name: 'Gentlemen of Thrumpton', nick: 'The Gentlemen', ground: 'hall', chip: '#d8b04a',
    kit: { cloth: '#f4f4f0', pants: '#f4f4f0', trim: '#22305a', cap: '#22305a', boot: '#f4f4f0', belt: '#22305a', glove: '#f4f4f0' },
    pool: ['Ffoulkes', 'Carstairs', 'Montague', 'St John-Smythe', 'Pargeter', 'Wetherby', 'Ponsonby'],
    stars: [
      { id: 'peregrine', name: 'Hon. Peregrine Twistleton-Smythe', short: 'TWISTLETON', role: 'bowl', bat: 6, power: 5, tech: 7, style: 'accumulator', hand: 1, bowl: { type: 'swing', skill: 9, d: ['outswing', 'inswing', 'wobble'] }, specBowl: 'swoop', field: [6, 7, 7, 7], voice: 180,
        look: { build: 'heroic', size: 1.22, hair: 'short', hairC: '#e8c060', skin: '#f2d0b0', moustache: 'handlebar' } },
      { id: 'fortescue', name: 'Fortescue', short: 'FORTESCUE', role: 'all', bat: 5, power: 4, tech: 7, style: 'blocker', hand: 1, bowl: { type: 'medium', skill: 6, d: ['dobber', 'cutter', 'knuckle'] }, specField: 'tray', field: [6, 10, 9, 7], voice: 110,
        look: { build: 'heroic', size: 1.18, hair: 'short', hairC: '#9a9a9a', skin: '#f2d0b0', moustache: 'walrus' } },
      { id: 'araminta', name: 'Lady Araminta Fitch', short: 'FITCH', role: 'bat', bat: 9, power: 6, tech: 9, style: 'accumulator', hand: -1, bowl: null, specBat: 'croquet', field: [7, 8, 7, 6], voice: 250,
        look: { build: 'heroic', size: 1.18, hair: 'long', hairC: '#2a1a12', skin: '#f2d0b0' } }
    ] },
  { id: 'lar', code: 'LAR', name: 'Sunburnt Bay Larrikins', nick: 'The Larrikins', ground: 'bay', chip: '#1fb5a8',
    kit: { cloth: '#1fb5a8', pants: '#ffd23a', trim: '#ffd23a', cap: '#ffd23a', boot: '#f4f4f0', belt: '#0e6a62', glove: '#ffd23a' },
    pool: ['Dunno', 'Bluey', 'Sandy', 'Robbo', 'Gazza', 'Davo', 'Muzza', 'Stevo'],
    stars: [
      { id: 'shazza', name: 'Shazza Brannigan', short: 'BRANNIGAN', role: 'bowl', bat: 5, power: 6, tech: 5, style: 'slogger', hand: 1, bowl: { type: 'pace', skill: 9, d: ['express', 'bouncer', 'yorker'] }, specBowl: 'sunburn', field: [8, 7, 6, 9], voice: 230,
        look: { build: 'heroic', size: 1.22, hair: 'ponytail', hairC: '#e8c060', skin: '#e0b090', zinc: true } },
      { id: 'kev', name: 'Kev "Thongs" Malone', short: 'MALONE', role: 'bat', bat: 6, power: 10, tech: 4, style: 'slogger', hand: 1, bowl: { type: 'medium', skill: 3, d: ['dobber', 'knuckle', 'cutter'] }, specBat: 'bludgeon', field: [5, 5, 5, 6], voice: 140,
        look: { build: 'bulky', size: 1.25, hair: 'spiky', hairC: '#c8902a', skin: '#c89070', zinc: true } },
      { id: 'wal', name: 'Big Wal', short: 'BIG WAL', role: 'keep', bat: 5, power: 7, tech: 5, style: 'slogger', hand: 1, bowl: null, field: [5, 8, 7, 6], voice: 120,
        look: { build: 'bulky', size: 1.2, hair: 'short', hairC: '#2a1a12', skin: '#7a4a30', beard: 'goatee' } }
    ] },
  { id: 'mag', code: 'MAG', name: 'Magic Circle XI', nick: 'The Conjurers', ground: 'downs', chip: '#c8ccd8',
    kit: { cloth: '#5a2a7a', pants: '#2a1a3a', trim: '#c8ccd8', cap: '#2a1a3a', boot: '#1a1020', belt: '#c8ccd8', glove: '#f4f4f0', cape: '#2a1a3a', capeIn: '#a8202a' },
    pool: ['Presto', 'Abra', 'Mystique', 'Prestidigitate', 'Sleight', 'Hocus', 'Pocus'],
    stars: [
      { id: 'spinaldo', name: 'The Great Spinaldo', short: 'SPINALDO', role: 'bowl', bat: 5, power: 5, tech: 6, style: 'accumulator', hand: 1, bowl: { type: 'spin', skill: 10, d: ['legbreak', 'googly', 'doosra'] }, specBowl: 'vanish', field: [5, 7, 6, 5], voice: 160,
        look: { build: 'heroic', size: 1.22, hair: 'short', hairC: '#1a1410', skin: '#e0b090', moustache: 'handlebar', cape: true } },
      { id: 'zsazsa', name: 'Madame Zsa-Zsa Flick', short: 'FLICK', role: 'bowl', bat: 5, power: 4, tech: 6, style: 'accumulator', hand: 1, bowl: { type: 'spin', skill: 8, d: ['googly', 'legbreak', 'topspin'] }, specBowl: 'sawn', field: [6, 6, 6, 5], voice: 260,
        look: { build: 'heroic', size: 1.15, hair: 'long', hairC: '#a83a1a', skin: '#f2d0b0' } },
      { id: 'houdini', name: 'Houdini Jnr', short: 'HOUDINI', role: 'keep', bat: 6, power: 5, tech: 6, style: 'accumulator', hand: 1, bowl: null, specField: 'lightning', field: [8, 8, 8, 7], voice: 200,
        look: { build: 'chibi', size: 1.15, hair: 'short', hairC: '#2a1a12', skin: '#c89070' } }
    ] },
  { id: 'thr', code: 'THR', name: "Thrumpton's Thunderbolts", nick: 'The Thunderbolts', ground: 'dome', chip: '#7a3aff',
    kit: { cloth: '#1a1a22', pants: '#1a1a22', trim: '#7a3aff', cap: '#7a3aff', boot: '#0e0e12', belt: '#ffcf3a', glove: '#ffcf3a' },
    pool: ['Bartholomew', 'Silas', 'Ignatius', 'Obadiah', 'Cornelius', 'Jeremiah', 'Ezekiel'], ghosts: true,
    stars: [
      { id: 'thrumpton', name: 'Lord Rufus Thrumpton-Vane', short: 'THRUMPTON', role: 'all', bat: 7, power: 7, tech: 6, style: 'accumulator', hand: 1, bowl: { type: 'medium', skill: 6, d: ['cutter', 'dobber', 'yorker'] }, specBat: 'grudgeDrive', specBowl: 'grudge', field: [4, 5, 5, 5], voice: 160,
        look: { build: 'bulky', size: 1.22, hair: 'short', hairC: '#9a9a9a', skin: '#f2d0b0', moustache: 'handlebar', tweed: true } },
      { id: 'grimble', name: 'Dr Ebenezer Grimble', short: 'GRIMBLE', role: 'bat', bat: 8, power: 6, tech: 8, style: 'accumulator', hand: 1, bowl: { type: 'spin', skill: 6, d: ['offbreak', 'armball', 'topspin'] }, specBat: 'ecto', field: [6, 7, 7, 6], voice: 140, ghost: true,
        look: { build: 'heroic', size: 1.2, hair: 'long', hairC: '#d8d8d0', skin: '#c8e0f0', beard: 'full' } },
      { id: 'machine', name: 'The Thrumptonator 3000', short: 'THRUMPTONATOR', role: 'bowl', bat: 1, power: 1, tech: 1, style: 'blocker', hand: 1, bowl: { type: 'machine', skill: 10, d: ['piston', 'steamBouncer', 'spinCycle'] }, specBowl: 'triple', field: [1, 1, 1, 1], voice: 90, machine: true,
        look: { build: 'bulky', size: 1.2, hair: 'bald', hairC: '#888', skin: '#c8a040' } }
    ] }
];
/** the generated part of a squad: names from the pool, looks from the palette, a mix of roles */
function buildTeam(def) {
  const r = E.rng(def.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const players = def.stars.map(s => Object.assign({ team: def.id, star: true }, s));
  const roles = ['bat', 'bat', 'all', 'bowl', 'bowl', 'all', 'bat', 'bowl'], used = new Set();
  const families = ['pace', 'swing', 'medium', 'spin'], DEL = { pace: ['express', 'bouncer', 'yorker'], swing: ['outswing', 'inswing', 'wobble'], medium: ['dobber', 'cutter', 'knuckle'], spin: ['offbreak', 'armball', 'topspin'] };
  let k = 0;
  while (players.length < 11) {
    let nm; do { nm = def.pool[Math.floor(r() * def.pool.length)]; } while (used.has(nm) && used.size < def.pool.length); used.add(nm);
    const role = roles[k++ % roles.length], bowls = role !== 'bat', fam = families[Math.floor(r() * families.length)];
    const lvl = role === 'bat' ? 6 : role === 'all' ? 5 : 3, ghost = !!def.ghosts;
    players.push({ team: def.id, id: def.id + '_' + nm.toLowerCase().replace(/[^a-z]/g, ''), name: (ghost ? 'Sir ' : '') + nm, short: nm.toUpperCase(), role,
      bat: clamp(lvl + Math.floor(r() * 3) - 1, 1, 10), power: clamp(4 + Math.floor(r() * 5), 1, 10), tech: clamp(lvl + Math.floor(r() * 3) - 1, 1, 10),
      style: r() < .35 ? 'slogger' : r() < .7 ? 'accumulator' : 'blocker', hand: r() < .3 ? -1 : 1, ghost,
      bowl: bowls ? { type: fam, skill: clamp(4 + Math.floor(r() * 4) + (role === 'bowl' ? 2 : 0), 1, 10), d: DEL[fam] } : null,
      field: [4 + Math.floor(r() * 5), 4 + Math.floor(r() * 5), 4 + Math.floor(r() * 5), 4 + Math.floor(r() * 5)], voice: 140 + Math.floor(r() * 120),
      look: { build: r() < .3 ? 'bulky' : r() < .6 ? 'chibi' : 'heroic', size: 1.12 + r() * .1, hair: ['short', 'spiky', 'long', 'bald', 'ponytail'][Math.floor(r() * 5)], hairC: ghost ? '#d8e8f0' : HAIRS[Math.floor(r() * HAIRS.length)], skin: ghost ? '#c8e0f0' : SKINS[Math.floor(r() * SKINS.length)], moustache: r() < .2 ? 'walrus' : null } });
  }
  // a keeper if none; batting order: stars and batters first, bowlers last
  if (!players.some(p => p.role === 'keep')) { const k = players.slice().reverse().find(p => !p.star && p.role === 'bat') || players[players.length - 1]; k.role = 'keep'; }
  for (const p of players) if (p.role === 'keep') p.bowl = null;   // a keeper keeps; he never bowls
  const rank = p => (p.role === 'bat' ? 0 : p.role === 'keep' ? 1 : p.role === 'all' ? 2 : 3) - (p.star ? .5 : 0) + (p.machine ? 10 : 0);
  const order = players.slice().sort((a, b) => rank(a) - rank(b) || b.bat - a.bat);
  const bowlers = players.filter(p => p.bowl).sort((a, b) => b.bowl.skill - a.bowl.skill).slice(0, 5);
  const fam = new Set(bowlers.map(b => b.bowl.type));
  if (fam.size < 2) { const extra = players.find(p => !p.bowl && p.role !== 'keep'); if (extra) { extra.bowl = { type: [...fam][0] === 'spin' ? 'medium' : 'spin', skill: 5, d: [...fam][0] === 'spin' ? DEL.medium : DEL.spin }; bowlers.push(extra); } }
  for (const p of players) { p.field = { speed: p.field[0], catch: p.field[1], ground: p.field[2], throw: p.field[3] }; }
  return Object.assign({}, def, { players, order, bowlers, keeper: players.find(p => p.role === 'keep') });
}
const TEAMS = {};
for (const d of TEAM_DEFS) TEAMS[d.id] = buildTeam(d);
const TEAM_IDS = TEAM_DEFS.map(d => d.id);
const playerById = id => { for (const t of TEAM_IDS) { const p = TEAMS[t].players.find(q => q.id === id); if (p) return p; } return null; };
K.TEAMS = TEAMS; K.TEAM_IDS = TEAM_IDS; K.playerById = playerById;
