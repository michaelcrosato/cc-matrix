// The neighbourhood: TileMap of Penn Row (App. A), its floors, dressing and the mood of the time of day (§12.1).
let MAP = null;
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h & 1023) / 1023; };

function floorColor(x, y, tag) {
  const base = FLOOR_COLORS[tag] || FLOOR_COLORS.walk;
  let k = .9 + hash2(x, y) * .2;
  if (tag === 'walk' && (x % 4 === 0 || y % 4 === 0)) k *= .8;            // slab joints
  if (tag === 'road' && y === 28 && x % 4 < 2) return [206, 170, 52];    // Ridley's dashed centre line
  if (tag === 'road' && hash2(y, x) > .985) k *= 1.6;                     // grit and oil spots
  if (tag === 'alley' && hash2(x, y) > .9) k *= .6;                       // cracks
  return [base[0] * k, base[1] * k, base[2] * k].map(v => Math.max(0, Math.min(255, Math.round(v))));
}

function buildWorld() {
  MAP = new E.TileMap({ rows: ROWS, legend: legendForMap(), types: typesForMap(), floorTex: floorColor, outside: '#15141a', ao: 5 });
  for (const [id, cx, cy, face] of SHAPE_DRESS) {   // solid where they stand: walk into one and stop
    const [x, y] = cellWorld([cx, cy]);
    MAP.solid(id, x, y, 0, { facing: face });
  }
  return MAP;
}

// The street lamps (lit at dusk) and the dressing: [kind, cell x, cell y, options].
const DRESS = [
  ['streetlamp', 4, 26], ['streetlamp', 12, 26], ['streetlamp', 22, 26], ['streetlamp', 34, 26], ['streetlamp', 46, 26],
  ['streetlamp', 58, 26], ['streetlamp', 66, 26], ['streetlamp', 31, 19], ['streetlamp', 31, 40],
  ['trashcan', 31, 36], ['trashcan', 37, 30], ['trashcan', 21, 44], ['trashcan', 30, 41],
  ['firedrum', 63, 34], ['hydrant', 29, 33], ['hydrant', 36, 33],
];
const SHAPE_DRESS = [   // E.SHAPES objects (solid where they stand)
  ['bench', 41, 31, .5], ['barrel', 26, 33, 0], ['crate', 33, 21, .2],
];

// Time of day: the mission clock picks the mood (overcast afternoon, dusk, night).
function mood(clockMinutes) {
  const m = clockMinutes;
  if (m < 17 * 60 + 40) return { ambient: .78, tint: [200, 205, 215], lamps: false, name: 'overcast' };
  if (m < 19 * 60 + 30) return { ambient: .55, tint: [255, 190, 150], lamps: true, name: 'dusk' };
  return { ambient: .36, tint: [150, 170, 230], lamps: true, name: 'night' };
}

// Props for a frame: the lamps only at dusk and later.
function drawDressing(r, lampsOn) {
  for (const [kind, cx, cy] of DRESS) {
    const [x, y] = cellWorld([cx, cy]);
    if (kind === 'streetlamp') {
      if (lampsOn) r.prop('streetlamp', x, y, 0, { light: true, cone: true });
      else r.prop('streetlamp', x, y, 0, {});
    } else r.prop(kind, x, y, 0, {});
  }
  for (const [id, cx, cy, face] of SHAPE_DRESS) {
    const [x, y] = cellWorld([cx, cy]);
    r.shape(id, x, y, 0, { facing: face });
  }
}
