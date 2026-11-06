(function (G) {
  'use strict';
  const M = (G.MA = G.MA || {});
  M.TITLE = 'Much Ado About Rings';
  M.VERSION = '1.0.0';
  M.HEROES = [
    {
      id: 'warrior',
      name: 'Warrior',
      epithet: 'The unbroken oath',
      mark: 'I',
      color: '#f0b65e',
      primary: 'Sword arc',
      power: 'Shield brace',
      desc: 'Cut down lesser foes. Brace a shield for your companion.',
      constraint: 'Nightmares and dragons deflect your blade.',
    },
    {
      id: 'wizard',
      name: 'Wizard',
      epithet: 'A light in the deep',
      mark: 'II',
      color: '#9eb9ff',
      primary: 'Stunning rune',
      power: 'Flame ward',
      desc: 'Still a pursuer. Set a ward against fire and missiles.',
      constraint: 'Runes stun; they do not kill.',
    },
    {
      id: 'phantom',
      name: 'Phantom',
      epithet: 'Beyond the stone',
      mark: 'III',
      color: '#8ce6dc',
      primary: 'Revealing pulse',
      power: 'Stonewalk',
      desc: 'Reveal the unseen. Pass through interior stone and crystal.',
      constraint: 'Lava, outer walls and seals remain forbidden.',
    },
    {
      id: 'changeling',
      name: 'Changeling',
      epithet: 'The other shadow',
      mark: 'IV',
      color: '#d4a3e9',
      primary: 'Decoy echo',
      power: 'Mirrorcloak',
      desc: 'Lead pursuit astray. Vanish while a friend escapes.',
      constraint: 'Contact still hurts. A stolen ring still shines.',
    },
  ];
  M.TUNING = {
    speed: { label: 'Hero speed', value: 66, min: 35, max: 110, step: 1 },
    recovery: { label: 'Primary recovery', value: 0.58, min: 0.2, max: 1.6, step: 0.02 },
    cooldown: { label: 'Class cooldown', value: 6, min: 1, max: 14, step: 0.25 },
    duration: { label: 'Class duration', value: 2.8, min: 1, max: 6, step: 0.1 },
    stun: { label: 'Stun duration', value: 2.6, min: 0.5, max: 6, step: 0.1 },
    enemySpeed: { label: 'Enemy movement', value: 23, min: 8, max: 55, step: 1 },
    enemyCadence: { label: 'Enemy attack interval', value: 2.9, min: 1, max: 6, step: 0.1 },
    telegraph: { label: 'Hazard warning', value: 1.7, min: 0.8, max: 3.5, step: 0.1 },
    damage: { label: 'Damage per hit', value: 1, min: 0.25, max: 2, step: 0.25 },
    revive: { label: 'Revive hold', value: 1.8, min: 0.5, max: 4, step: 0.1 },
    companion: { label: 'Companion response', value: 0.24, min: 0.08, max: 1, step: 0.02 },
    director: { label: 'Ringmaster interval', value: 15, min: 7, max: 35, step: 1 },
    dread: { label: 'Dread influence', value: 0.13, min: 0, max: 0.3, step: 0.01 },
  };
  M.defaults = () => Object.fromEntries(Object.entries(M.TUNING).map(([k, v]) => [k, v.value]));
  M.SITES = [
    {
      id: 'dungeon',
      name: 'The Hollow Keep',
      family: 'Dungeon',
      rune: 'Oath',
      color: '#e7b463',
      map: [0.19, 0.6],
      rooms: ['d1', 'd2'],
      danger: 'Swordbound sentries · Firewraths',
      rule: 'Steal together. Escape through the golden arch.',
      shortcut: 'The King’s Causeway',
      shortcutTo: 'crystal',
      lore: 'Their watch has outlived the kings they served.',
    },
    {
      id: 'crystal',
      name: 'The Glass Below',
      family: 'Crystal Caverns',
      rune: 'Memory',
      color: '#70d9df',
      map: [0.43, 0.29],
      rooms: ['c1', 'c2'],
      danger: 'Vanishing walls · Ceiling spiders',
      rule: 'Walls vanish from sight, never from the world.',
      shortcut: 'The Mirror Stair',
      shortcutTo: 'inferno',
      lore: 'The stone remembers the road. Will you?',
    },
    {
      id: 'inferno',
      name: 'The Cinder Choir',
      family: 'Inferno',
      rune: 'Ember',
      color: '#ef9870',
      map: [0.75, 0.6],
      rooms: ['i1', 'i2'],
      danger: 'Flame lanes · Firewraths',
      rule: 'Hatched stone warns of fire. Wait for the breath to pass.',
      shortcut: 'The Ashen Bridge',
      shortcutTo: 'shifting',
      lore: 'Here even silence has been taught to burn.',
    },
    {
      id: 'shifting',
      name: 'The Hours Unwound',
      family: 'Shifting Halls',
      rune: 'Turning',
      color: '#afa8f4',
      map: [0.62, 0.79],
      rooms: ['s1', 's2'],
      danger: 'Moving partitions · Flying Nightmares',
      rule: 'Arrows announce a shift. Every turning leaves a road.',
      shortcut: 'The Pendulum Road',
      shortcutTo: 'final',
      lore: 'The halls obey no hour but their master’s.',
    },
    {
      id: 'cache1',
      name: 'The Moonwell',
      family: 'Crystal cache',
      color: '#91d1c8',
      map: [0.29, 0.2],
      rooms: ['cache1'],
      danger: 'A hidden path · +1 Dread',
      rule: 'An immediate full heal and one team ward. Single use.',
      reward: 'heal',
      lore: 'A kindness sleeps where the moon cannot reach.',
    },
    {
      id: 'cache2',
      name: 'The Lost Bell',
      family: 'Shifting cache',
      color: '#b4a6db',
      map: [0.82, 0.83],
      rooms: ['cache2'],
      danger: 'Rescue a wayfarer · +1 Dread',
      rule: 'Rescue the fallen keeper for a heal and a team ward.',
      reward: 'ward',
      lore: 'One last bell still waits for a living hand.',
    },
    {
      id: 'final',
      name: 'The Last Binding',
      family: 'Dragon sanctum',
      color: '#f7d385',
      map: [0.73, 0.2],
      rooms: ['final'],
      danger: 'The deathless dragon · Four seals',
      rule: 'Bind four recovered rings. Flee when the last seal sings.',
      lore: 'No blade can kill what the Ringmaster dreams.',
    },
  ];
  const line = (x, y, x2, y2) => {
    const out = [];
    for (let a = Math.min(x, x2); a <= Math.max(x, x2); a++)
      for (let b = Math.min(y, y2); b <= Math.max(y, y2); b++) out.push([a, b]);
    return out;
  };
  const pt = ([x, y]) => ({ x: x * 16 + 8, y: y * 16 + 8 });
  function room(id, spec) {
    const w = spec.w || 31,
      h = spec.h || 23;
    const grid = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.')),
    );
    for (const wall of spec.walls || [])
      for (const [x, y] of line(...wall)) grid[y][x] = spec.family === 'crystal' ? 'C' : 'W';
    for (const lava of spec.lava || []) for (const [x, y] of line(...lava)) grid[y][x] = '~';
    for (const bridge of spec.bridges || []) for (const [x, y] of line(...bridge)) grid[y][x] = '.';
    for (const wall of spec.hiddenWalls || []) for (const [x, y] of line(...wall)) grid[y][x] = 'C';
    const spawns = (
      spec.spawns || [
        [2, h - 3],
        [3, h - 3],
      ]
    ).map(pt);
    const exit = pt(spec.exit || [w - 3, 2]);
    const ring = spec.ring && pt(spec.ring);
    const shifts = (spec.shifts || []).map(([a, b]) => ({ a: line(...a), b: line(...b) }));
    const hazards = (spec.hazards || []).map(([x, y, x2, y2, offset = 0]) => ({
      cells: line(x, y, x2, y2),
      offset,
      period: 8.5,
    }));
    const def = {
      id,
      w,
      h,
      rows: grid.map((r) => r.join('')),
      spawns,
      fallback: spawns[0],
      exit,
      ring,
      shifts,
      hazards,
      phaseable: ['W', 'C'],
      revealPeriod: 6.5,
      camera: { minZoom: 0.65, maxZoom: 1.1 },
      navigation: { cell: 16, region: 'walkable', waypoints: [spawns[0], exit, ring].filter(Boolean) },
      ...spec,
    };
    def.w = w;
    def.h = h;
    def.spawns = spawns;
    def.shortcutSpawns = spec.shortcutSpawns?.map(pt);
    def.exit = exit;
    def.ring = ring;
    def.shifts = shifts;
    def.hazards = hazards;
    def.enemies = (spec.enemies || []).map(([kind, x, y]) => ({ kind, ...pt([x, y]) }));
    def.props = (spec.props || []).map(([kind, x, y, z = 0]) => ({
      kind,
      ...pt([x, y]),
      z,
      solid: ['tree', 'well', 'pillar', 'statue', 'barrel', 'furnace', 'clock'].includes(kind),
    }));
    if (spec.cache) def.cache = pt(spec.cache);
    return def;
  }
  M.ROOMS = {
    court: room('court', {
      name: 'The Courtyard of Small Courage',
      family: 'court',
      w: 23,
      h: 17,
      spawns: [
        [3, 13],
        [5, 13],
      ],
      exit: [20, 3],
      ring: [12, 7],
      teaching: true,
      walls: [
        [7, 5, 7, 10],
        [15, 5, 18, 5],
      ],
      props: [
        ['tree', 3, 3],
        ['tree', 19, 13],
        ['brazier', 10, 3],
        ['banner', 6, 4],
        ['well', 4, 8],
        ['bones', 18, 7],
      ],
      text: 'Two roads, one promise. Carry the practice ring to the golden arch. Your companion will follow.',
    }),
    d1: room('d1', {
      name: 'I · The Oathgate',
      family: 'dungeon',
      site: 'dungeon',
      index: 0,
      exit: [27, 3],
      teaching: true,
      walls: [
        [7, 5, 7, 17],
        [7, 5, 16, 5],
        [15, 10, 15, 19],
        [22, 5, 22, 14],
        [10, 15, 12, 15],
        [22, 18, 27, 18],
      ],
      enemies: [
        ['fighter', 10, 12],
        ['fire', 24, 9],
      ],
      props: [
        ['brazier', 5, 18],
        ['brazier', 25, 3],
        ['banner', 14, 4],
        ['pillar', 19, 10],
        ['bones', 10, 18],
        ['barrel', 24, 17],
      ],
      text: 'Sentries need not die. Make a window, then take the far arch.',
    }),
    d2: room('d2', {
      name: 'II · The King’s Empty Hand',
      family: 'dungeon',
      site: 'dungeon',
      index: 1,
      exit: [3, 20],
      ring: [27, 3],
      walls: [
        [6, 6, 6, 16],
        [6, 6, 13, 6],
        [12, 11, 20, 11],
        [20, 5, 20, 11],
        [14, 16, 25, 16],
        [25, 7, 25, 11],
      ],
      enemies: [
        ['fighter', 10, 15],
        ['fighter', 22, 13],
        ['fire', 27, 8],
      ],
      props: [
        ['brazier', 26, 2],
        ['brazier', 4, 19],
        ['statue', 14, 4],
        ['pillar', 19, 15],
        ['banner', 9, 5],
        ['bones', 27, 18],
      ],
      text: 'Take the Oath ring. Its light will summon pursuit. The way home is the way you came.',
    }),
    c1: room('c1', {
      shortcutSpawns: [
        [3, 15],
        [4, 15],
      ],
      name: 'III · The Remembering Vein',
      family: 'crystal',
      site: 'crystal',
      index: 0,
      teaching: true,
      walls: [
        [6, 4, 6, 17],
        [6, 17, 15, 17],
        [12, 4, 21, 4],
        [12, 4, 12, 12],
        [20, 9, 20, 18],
        [25, 5, 25, 14],
      ],
      enemies: [
        ['spider', 16, 14],
        ['fighter', 23, 6],
      ],
      props: [
        ['crystal', 4, 4],
        ['crystal', 10, 10],
        ['crystal', 21, 5],
        ['crystal', 26, 18],
        ['cobweb', 17, 2],
      ],
      text: 'The ribs of glass fade, then shine again. Nearby edges remain visible. A Phantom can wake every hidden seam.',
    }),
    c2: room('c2', {
      name: 'IV · The Mirror Reliquary',
      family: 'crystal',
      site: 'crystal',
      index: 1,
      exit: [3, 20],
      ring: [27, 3],
      walls: [
        [5, 5, 5, 14],
        [5, 5, 17, 5],
        [11, 10, 11, 19],
        [11, 10, 23, 10],
        [23, 4, 23, 10],
        [18, 16, 27, 16],
      ],
      enemies: [
        ['spider', 9, 8],
        ['spider', 19, 13],
        ['fire', 27, 7],
      ],
      props: [
        ['crystal', 3, 3],
        ['crystal', 16, 8],
        ['crystal', 25, 19],
        ['crystal', 27, 2],
        ['cobweb', 18, 3],
      ],
      text: 'Shadows on the floor foretell the falling spiders. Carry Memory out of the glass.',
    }),
    i1: room('i1', {
      shortcutSpawns: [
        [3, 17],
        [4, 17],
      ],
      name: 'V · The Breath Between',
      family: 'inferno',
      site: 'inferno',
      index: 0,
      teaching: true,
      walls: [
        [9, 6, 13, 6],
        [18, 16, 23, 16],
      ],
      lava: [
        [1, 9, 29, 10],
        [1, 15, 29, 16],
      ],
      bridges: [
        [5, 9, 8, 10],
        [22, 9, 25, 10],
        [12, 15, 15, 16],
        [26, 15, 29, 16],
      ],
      hazards: [
        [5, 8, 8, 11, 0],
        [12, 14, 15, 17, 3],
      ],
      enemies: [['fire', 18, 6]],
      props: [
        ['brazier', 3, 12],
        ['brazier', 27, 3],
        ['furnace', 16, 3],
        ['rock', 3, 6],
      ],
      text: 'Hatching is warning; white stone is refuge. Fire passes in breaths. Stonewalk and Mirrorcloak cannot protect you from lava.',
    }),
    i2: room('i2', {
      name: 'VI · The Cinder Choir',
      family: 'inferno',
      site: 'inferno',
      index: 1,
      exit: [3, 20],
      ring: [27, 3],
      walls: [
        [10, 3, 10, 7],
        [18, 13, 23, 13],
      ],
      lava: [
        [8, 1, 9, 21],
        [19, 1, 20, 21],
      ],
      bridges: [
        [8, 16, 9, 19],
        [8, 5, 9, 7],
        [19, 7, 20, 10],
        [19, 17, 20, 19],
      ],
      hazards: [
        [7, 16, 10, 19, 0],
        [18, 7, 21, 10, 3.5],
        [23, 4, 28, 4, 5],
      ],
      enemies: [
        ['fire', 14, 11],
        ['nightmare', 25, 13],
      ],
      props: [
        ['furnace', 15, 3],
        ['brazier', 3, 3],
        ['brazier', 28, 18],
        ['rock', 12, 18],
      ],
      text: 'Let the furnace sing before you cross. A ward stills a flame lane; every hero can wait for its silence.',
    }),
    s1: room('s1', {
      shortcutSpawns: [
        [5, 18],
        [6, 18],
      ],
      name: 'VII · The March of Walls',
      family: 'shifting',
      site: 'shifting',
      index: 0,
      teaching: true,
      walls: [
        [9, 4, 9, 8],
        [9, 15, 9, 19],
        [21, 4, 21, 8],
        [21, 15, 21, 19],
      ],
      shifts: [
        [
          [9, 9, 9, 13],
          [15, 9, 15, 13],
        ],
        [
          [21, 10, 21, 14],
          [25, 10, 25, 14],
        ],
      ],
      enemies: [['nightmare', 18, 11]],
      props: [
        ['clock', 15, 3],
        ['pillar', 5, 6],
        ['brazier', 26, 18],
        ['banner', 19, 3],
      ],
      text: 'The floor arrows speak before the walls move. Stand clear; the turning always leaves another path.',
    }),
    s2: room('s2', {
      name: 'VIII · The Hour Unmade',
      family: 'shifting',
      site: 'shifting',
      index: 1,
      exit: [3, 20],
      ring: [27, 3],
      walls: [
        [6, 5, 13, 5],
        [13, 5, 13, 10],
        [6, 14, 6, 18],
        [20, 13, 27, 13],
      ],
      shifts: [
        [
          [10, 11, 10, 17],
          [16, 11, 16, 17],
        ],
        [
          [21, 4, 21, 9],
          [25, 6, 25, 11],
        ],
      ],
      enemies: [
        ['nightmare', 19, 9],
        ['nightmare', 11, 14],
        ['fighter', 25, 17],
      ],
      props: [
        ['clock', 17, 3],
        ['brazier', 4, 19],
        ['brazier', 27, 2],
        ['bones', 8, 10],
      ],
      text: 'Wings do not respect the walls. The Turning ring must leave this place in living hands.',
    }),
    cache1: room('cache1', {
      name: 'The Moonwell',
      family: 'crystal',
      site: 'cache1',
      index: 0,
      exit: [3, 20],
      cache: [27, 3],
      walls: [
        [7, 6, 7, 18],
        [7, 6, 22, 6],
        [15, 11, 25, 11],
      ],
      enemies: [['spider', 18, 9]],
      props: [
        ['well', 26, 3],
        ['crystal', 11, 14],
      ],
      text: 'Touch the sleeping well, then return. Its kindness is spent only once.',
    }),
    cache2: room('cache2', {
      name: 'The Lost Bell',
      family: 'shifting',
      site: 'cache2',
      index: 0,
      exit: [3, 20],
      cache: [27, 3],
      rescue: true,
      walls: [
        [8, 6, 8, 16],
        [19, 10, 27, 10],
      ],
      shifts: [
        [
          [14, 5, 14, 13],
          [19, 13, 19, 19],
        ],
      ],
      enemies: [['nightmare', 23, 14]],
      props: [
        ['clock', 26, 2],
        ['brazier', 5, 5],
      ],
      text: 'Hold beside the fallen keeper. A saved life shall lighten your own.',
    }),
    final: room('final', {
      name: 'IX · The Last Binding',
      family: 'final',
      site: 'final',
      index: 0,
      w: 35,
      h: 27,
      spawns: [
        [16, 23],
        [18, 23],
      ],
      exit: [17, 24],
      shortcutSpawns: [
        [14, 22],
        [15, 22],
      ],
      hiddenWalls: [
        [12, 5, 12, 9],
        [22, 5, 22, 9],
      ],
      walls: [
        [7, 8, 10, 8],
        [24, 8, 27, 8],
        [7, 18, 10, 18],
        [24, 18, 27, 18],
        [15, 12, 19, 12],
      ],
      lava: [[1, 14, 33, 14]],
      bridges: [
        [5, 14, 8, 14],
        [16, 14, 18, 14],
        [26, 14, 29, 14],
      ],
      shifts: [
        [
          [12, 16, 12, 19],
          [21, 16, 21, 19],
        ],
      ],
      hazards: [
        [3, 10, 31, 10, 0],
        [3, 19, 31, 19, 4.3],
      ],
      enemies: [['dragon', 17, 5]],
      props: [
        ['crystal', 4, 11],
        ['crystal', 30, 11],
        ['brazier', 11, 22],
        ['brazier', 23, 22],
      ],
      stations: [
        [5, 4],
        [29, 4],
        [5, 22],
        [29, 22],
      ].map(pt),
      text: 'The dragon cannot die. Read its breath. Bind the four rings at their stations; then escape together.',
    }),
  };
  M.distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  M.rng = (seed) => {
    let s = seed >>> 0;
    return () => {
      s += 0x6d2b79f5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  M.hash = (s) => {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  };
})(globalThis);
