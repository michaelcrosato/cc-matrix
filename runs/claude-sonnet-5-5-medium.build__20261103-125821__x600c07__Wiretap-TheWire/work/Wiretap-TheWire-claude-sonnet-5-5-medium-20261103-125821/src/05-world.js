// 05-world: Penn Row neighborhood (48 x 34 cells), wall types, floors, props, people rigs
const MW = 48, MH = 34, CELL = 16;
const cc = (cx, cy) => ({ x: cx * CELL + 8, y: cy * CELL + 8 });
function buildRows() {
  const g = []; for (let y = 0; y < MH; y++) g.push(new Array(MW).fill('.'));
  const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };
  for (let x = 0; x < MW; x++) { g[0][x] = '#'; g[MH - 1][x] = '#'; } for (let y = 0; y < MH; y++) { g[y][0] = '#'; g[y][MW - 1] = '#'; }
  rect(0, 14, MW - 1, 18, ','); rect(22, 0, 26, MH - 1, ',');          // Ridley Ave and Penn St
  rect(0, 14, 0, 18, '#'); rect(MW - 1, 14, MW - 1, 18, '#'); rect(22, 0, 26, 0, '#'); rect(22, MH - 1, 26, MH - 1, '#');
  // blocks: front row of rowhouses along the street, a lot behind with an alley gap
  const block = (x0, y0, x1, y1, front, vac, alley) => {
    rect(x0, y0, x1, y1, '#'); const lotY0 = front === 'S' ? y0 + 1 : y0 + 4, lotY1 = front === 'S' ? y1 - 4 : y1 - 1;
    rect(x0 + 1, lotY0, x1 - 1, lotY1, ':');                                                 // the lot (dirt)
    const fy = front === 'S' ? y1 : y0;                                                      // street-facing row y
    for (const ax of alley) { for (let yy = Math.min(fy, lotY0); yy <= Math.max(fy, lotY1); yy++) { g[yy][ax] = '.'; g[yy][ax + 1] = '.'; } }
    for (const [vx0, vx1] of vac) rect(vx0, front === 'S' ? y1 - 3 : y0, vx1, front === 'S' ? y1 : y0 + 3, 'V');
    for (let x = x0 + 2; x < x1 - 1; x += 3) if (g[lotY0 + 1][x] === ':') { g[lotY0 + 1][x] = 'l'; g[lotY1 - 1][x + 1] = 'l'; }   // sheds and fence runs
  };
  block(2, 2, 19, 11, 'S', [[8, 11]], [14]); block(29, 2, 45, 11, 'S', [[33, 36]], [41]);
  block(2, 21, 19, 31, 'N', [[12, 15]], [6]); block(29, 21, 45, 31, 'N', [[38, 41]], [34]);
  // sidewalk ring is the '.'; the corner (the pit) is a lot of its own at the NE corner of the intersection
  rect(27, 12, 31, 13, 'C');
  const put = (cx, cy, ch) => { g[cy][cx] = ch; };
  put(4, 19, 'A'); put(10, 19, 'D'); put(28, 13, 'T'); put(30, 13, 'U'); put(21, 13, 'p'); put(27, 19, 'q'); put(42, 6, 'G'); put(41, 12, 'r');
  put(30, 12, 'L'); put(27, 12, 'M'); put(21, 19, 'N'); put(15, 19, 'v'); put(7, 13, 'k'); put(24, 12, 'z');
  put(35, 20, 'K'); put(31, 19, 'S');
  return g.map(r => r.join(''));
}
const WORLD_ROWS = buildRows();
const MAP_LEGEND = { '#': 1, V: 2, l: 3, ',': { floor: 'road' }, ':': { floor: 'lot' }, '.': { floor: 'walk' }, C: { floor: 'corner' },
  A: { floor: 'walk', spawn: 'annex' }, D: { floor: 'walk', spawn: 'dana' }, T: { floor: 'corner', spawn: 'tee' }, U: { floor: 'corner', spawn: 'dealer2' }, p: { floor: 'walk', spawn: 'phone1' }, q: { floor: 'walk', spawn: 'phone2' },
  G: { floor: 'lot', spawn: 'garage' }, r: { floor: 'walk', spawn: 'runner' }, L: { floor: 'corner', spawn: 'look1' }, M: { floor: 'corner', spawn: 'look2' }, N: { floor: 'walk', spawn: 'look3' }, v: { floor: 'walk', spawn: 'van' }, k: { floor: 'walk', spawn: 'cop2' }, z: { floor: 'walk', spawn: 'trash' }, K: { floor: 'walk', spawn: 'kid' }, S: { floor: 'walk', spawn: 'stash' } };
const hash2 = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const FLOORS = { road: [46, 47, 52], walk: [92, 90, 86], lot: [70, 62, 50], corner: [104, 98, 88] };
function floorTex(x, y, tag) {
  const b = FLOORS[tag] || FLOORS.walk, n = hash2(x >> 1, y >> 1) * 14 - 7, seam = (tag === 'walk' && ((x % 16 < 1) || (y % 16 < 1))) ? -14 : 0;
  let k = n + seam; if (tag === 'road') { const lane = (Math.abs(y - 16 * 16 - 8) < 1.2 || Math.abs(x - 24 * 16 - 8) < 1.2); if (lane && (x + y) % 16 < 9) return [190, 160, 70]; }
  if (tag === 'corner' && hash2(x, y, 5) > .985) return [150, 60, 60];     // a spent vial in the dirt
  return [clamp(b[0] + k, 0, 255), clamp(b[1] + k, 0, 255), clamp(b[2] + k, 0, 255)];
}
const WALL_TYPES = {
  1: { h: 44, top: '#4a3a34', side: '#7a4a3a', face: 'brick', roof: 'plain', cut: true },
  2: { h: 40, top: '#3a3430', side: '#5a4a40', face: 'plank', roof: 'plain', cut: true },
  3: { h: 9, top: '#6a6862', side: '#55534e', face: 'stone' }
};
function makeMap() { return new E.TileMap({ rows: WORLD_ROWS, legend: MAP_LEGEND, types: WALL_TYPES, floorTex, ao: 5, outside: '#16171c' }); }
// street dressing (data): [prop, cx, cy]
const PROPS = [['streetlamp', 21, 12], ['streetlamp', 27, 19], ['streetlamp', 28, 12], ['streetlamp', 12, 13], ['streetlamp', 38, 19], ['streetlamp', 20, 18], ['hydrant', 20, 13], ['trashcan', 31, 12], ['trashcan', 7, 19], ['firedrum', 30, 13], ['trashcan', 24, 12], ['sandbags', 41, 13], ['fence', 17, 13], ['hydrant', 35, 12], ['trashcan', 13, 20], ['firedrum', 9, 12]];
const LIGHTS = [[21, 12, '#ffb060', 90], [27, 19, '#ffb060', 90], [28, 12, '#ff9a40', 100], [12, 13, '#ffb060', 80], [38, 19, '#ffb060', 80], [20, 18, '#ffb060', 70], [4, 19, '#8fd0ff', 60]];
// cast: people rigs
const CAST = {
  dana: { name: 'Det. Dana Reyes', voice: 'dana', rig: { size: 1.25, build: 'heroic', weapon: null, outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { skin: '#c89070', hair: '#2a1a14', cloth: '#3a4a5e', coat: '#2f3a4a', pants: '#2a2a32', boot: '#1a1a1e' } } },
  szabo: { name: 'Sgt. Walt Szabo', voice: 'szabo', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { skin: '#d8a888', hair: '#6a6a6a', cloth: '#7a8a98', pants: '#3a3a42' } } },
  major: { name: 'Maj. Hollis Tran', voice: 'major', rig: { size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'bald', colors: { skin: '#8a5a3a', cloth: '#1c2a46', coat: '#1c2a46', pants: '#1c2a46' } } },
  rae: { name: 'Rae Pruitt', voice: 'rae', rig: { size: 1.2, weapon: null, outfit: 'shirt', hair: 'long', colors: { skin: '#6a4430', hair: '#1a1210', cloth: '#a04a4a', pants: '#2c3a4a' } } },
  judge: { name: 'Judge Okafor', voice: 'judge', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'robe', hair: 'short', colors: { skin: '#7a5236', hair: '#cccccc', cloth: '#16161a' } } },
  tee: { name: 'Terrence "Tee" Mabry', voice: 'tee', rig: { size: 1.25, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', colors: { skin: '#7a5236', hair: '#16100c', cloth: '#c8c0b0', pants: '#2a3446', boot: '#e8e8e8' } } },
  slim: { name: 'Slim Dawkins', voice: 'slim', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'bald', colors: { skin: '#5a3a28', cloth: '#5a2a2a', coat: '#2a1a1a', pants: '#1a1a1a' } } },
  look: { name: 'Lookout', voice: 'kid', rig: { size: 1.1, weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', colors: { skin: '#8a6040', cloth: '#385a8a', pants: '#2a2a2a' } } },
  runner: { name: 'Runner', voice: 'runner', rig: { size: 1.15, weapon: null, outfit: 'shirt', hair: 'spiky', colors: { skin: '#c89070', cloth: '#9a8a3a', pants: '#3a3a52' } } },
  kid: { name: 'Bodie', voice: 'kid', rig: { size: 1.0, weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', colors: { skin: '#7a5236', cloth: '#c85a3a', pants: '#2a3a4a' } } },
  cop: { name: 'Uniform', voice: 'szabo', rig: { size: 1.25, weapon: 'gun', outfit: 'shirt', hair: 'short', hat: 'cap', colors: { skin: '#d8a888', cloth: '#1c2a46', pants: '#14203a', hat: '#14203a' } } }
};
const CIV_SHIRTS = ['#8a4a4a', '#4a6a8a', '#6a8a4a', '#8a7a4a', '#6a4a8a', '#4a8a7a', '#9a6a4a', '#5a5a6a'];
const mkRig = (spec) => new E.Humanoid(spec);
function civRig(seed) { const r = E.rng(seed); return mkRig({ size: 1.05 + r() * .25, weapon: null, outfit: r() < .5 ? 'shirt' : 'coat', hair: ['short', 'long', 'bald', 'ponytail', 'spiky'][Math.floor(r() * 5)], hat: r() < .25 ? 'cap' : undefined, sleeves: r() < .5 ? 'long' : 'short',
  colors: { skin: ['#c89070', '#7a5236', '#5a3a28', '#d8a888', '#8a6040'][Math.floor(r() * 5)], hair: ['#1a1210', '#4a3020', '#8a8a8a', '#2a2a2a'][Math.floor(r() * 4)], cloth: CIV_SHIRTS[Math.floor(r() * CIV_SHIRTS.length)], pants: ['#2a2a36', '#3a3a2a', '#2a3a4a'][Math.floor(r() * 3)] } }); }
// sidewalk loops civilians walk (cell coordinates)
const LOOPS = [[[3, 13], [19, 13], [19, 12], [3, 12]], [[3, 20], [19, 20], [19, 19], [3, 19]], [[28, 19], [45, 19], [45, 20], [28, 20]], [[28, 13], [45, 13], [45, 12], [28, 12]], [[20, 2], [20, 30], [21, 30], [21, 2]], [[27, 2], [27, 30], [28, 30], [28, 2]]];
