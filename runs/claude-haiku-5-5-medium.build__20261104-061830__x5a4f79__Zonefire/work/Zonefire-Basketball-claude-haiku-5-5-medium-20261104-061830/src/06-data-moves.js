/* ---- POWER-UPS (plan §6.15, §10.4): six pickups, each a data entry with its apply and its remove; the spawner and the
 * pickup are in the twists fragment. Their icons are string sprites, drawn bobbing above a pulsing floor ring. ---- */
const PU_ICON = {
  rocket: ['..yyyy..', '.yYYYYy.', 'YYYYYYYy', 'YYwwwwYY', 'YYYYYYYY', '.kk..kk.', '........', '..ff....'],
  glue: ['..gggg..', '.gGGGg..', 'gGGGGgg.', '.gGGGg..', '..gggg..', '...gg...', '...gg...', '..gggg..'],
  laser: ['..rr....', '.r.r.r..', 'rr.rr.rr', '.r.r.r..', '..rr....', '........', '........', '........'],
  moon: ['..bbbb..', '.bBBBb..', 'bBbbbBb.', '.bBBBb..', '..bbbb..', '..b..b..', '.bb..bb.', '.bb..bb.'],
  bomb: ['....f...', '...f....', '..kkkk..', '.kKKKKk.', 'kKKKKKKk', 'kKKwKKKk', '.kKKKKk.', '..kkkk..'],
  gold: ['..oooo..', '.oYYYYo.', 'oYwYYYYo', 'oYYYYYYo', 'oYYYYYYo', 'oYYYYYYo', '.oYYYYo.', '..oooo..']
};
const PU_SPR = {};
for (const [id, rows] of Object.entries(PU_ICON)) PU_SPR[id] = E.sprite(rows, { y: '#ffd23a', Y: '#fff0a0', w: '#ffffff', g: '#7af0a0', G: '#2a8a4a', r: '#ff3a3a', b: '#8ab0ff', B: '#c8d8ff', k: '#222222', K: '#3a3a40', f: '#ff7a2a', o: '#8a5a10', O: '#ffd23a' });
const POWERUPS = [
  { id: 'rocket', name: 'ROCKET KICKS', color: '#ff7a2a', seconds: 15, icon: 'R', apply(p) { p.rocket = 15; }, remove(p) { p.rocket = 0; } },
  { id: 'glue', name: 'GLUE GLOVES', color: '#7af0a0', seconds: 15, icon: 'G', apply(p) { p.glue = 15; }, remove(p) { p.glue = 0; } },
  { id: 'laser', name: 'LASER SIGHT', color: '#ff3a3a', seconds: 15, icon: 'L', apply(p) { p.laser = 15; p.laserShots = 2; }, remove(p) { p.laser = 0; } },
  { id: 'moon', name: 'MOON SHOES', color: '#8ab0ff', seconds: 15, icon: 'M', apply(p) { p.moon = 15; }, remove(p) { p.moon = 0; } },
  { id: 'bomb', name: 'BLAM BOMB', color: '#c8c8d8', seconds: 20, icon: 'B', apply(p) { p.bomb = true; p.bombT = 20; }, remove(p) { p.bomb = false; } },
  { id: 'gold', name: 'GOLD BALL', color: '#ffd23a', seconds: 30, icon: 'Q', apply(p) { p.goldBall = 30; }, remove(p) { p.goldBall = 0; } }
];
for (const pu of POWERUPS) def('powerup', pu.id, pu);
const PU_LINE = { rocket: 'powerRocket', glue: 'powerGlue', laser: 'powerLaser', moon: 'powerMoon', bomb: 'powerBomb', gold: 'powerGold' };
