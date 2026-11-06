/* Authored mine data. Gameplay coordinates: x right, z up, 16 units/tile. */
(() => {
  const P = (globalThis.PD ||= {});
  P.TITLE = 'Pick Axe Deplete';
  P.TAGLINE = 'Big swing. Small warranty.';
  P.STEP = 1 / 120;
  P.TUNING = {
    moveSpeed: { value: 100, min: 50, max: 160, step: 5, label: 'Run speed', apply: 'immediate' },
    climbSpeed: { value: 72, min: 32, max: 130, step: 2, label: 'Climb speed', apply: 'immediate' },
    jumpSpeed: { value: 275, min: 210, max: 400, step: 5, label: 'Jump strength', apply: 'immediate' },
    gravity: { value: 850, min: 500, max: 1200, step: 25, label: 'Gravity', apply: 'immediate' },
    chopCycle: { value: 0.32, min: 0.22, max: 0.7, step: 0.02, label: 'Chop cycle', apply: 'next action' },
    redirectWindow: {
      value: 0.14,
      min: 0.08,
      max: 0.32,
      step: 0.02,
      label: 'Redirect window',
      apply: 'next action',
    },
    durability: { value: 6, min: 1, max: 16, step: 1, label: 'Pick contacts', apply: 'next tool' },
    rockSpeed: { value: 72, min: 35, max: 140, step: 5, label: 'Rock speed', apply: 'next spawn' },
    spawnInterval: { value: 6.8, min: 2, max: 12, step: 0.2, label: 'Door interval', apply: 'next warning' },
    pressureGain: {
      value: 0.025,
      min: 0,
      max: 0.1,
      step: 0.005,
      label: 'Strike pressure',
      apply: 'immediate',
    },
    keyLife: { value: 48, min: 15, max: 90, step: 1, label: 'Key lifetime', apply: 'next supply' },
    pickLife: { value: 40, min: 15, max: 90, step: 1, label: 'Pick lifetime', apply: 'next supply' },
    ladderLife: { value: 13, min: 6, max: 30, step: 1, label: 'Ladder duration', apply: 'next cycle' },
    rescueTime: { value: 1.4, min: 0.5, max: 4, step: 0.1, label: 'Rescue hold', apply: 'immediate' },
    pickRecovery: { value: 9, min: 4, max: 18, step: 1, label: 'Unarmed recovery bound', apply: 'immediate' },
    keyRecovery: { value: 16, min: 6, max: 30, step: 1, label: 'Key recovery bound', apply: 'immediate' },
  };
  P.defaults = () => Object.fromEntries(Object.entries(P.TUNING).map(([k, s]) => [k, s.value]));
  P.validateTuning = (key, value) => {
    const s = P.TUNING[key];
    if (!s || !Number.isFinite(value) || value < s.min || value > s.max)
      throw new Error(`Invalid tuning: ${key}=${value}`);
    return value;
  };
  P.ROUTES = [
    {
      id: 'forge',
      name: 'Forge',
      symbol: '▲',
      color: '#ffbf57',
      benefit: 'Steady lanes · bonus ore',
      family: 'ore',
      bonus: 30,
    },
    {
      id: 'spring',
      name: 'Spring',
      symbol: '◆',
      color: '#67ddd8',
      benefit: 'Bouncing lanes · extra picks',
      family: 'hopper',
      bonus: 40,
    },
    {
      id: 'crusher',
      name: 'Crusher',
      symbol: '✳',
      color: '#f58fba',
      benefit: 'Heavy lanes · rich crashes',
      family: 'heavy',
      bonus: 50,
    },
  ];
  P.PATTERNS = {
    intake: { doors: [0, 1, 2], pairEvery: 16, spawnScale: 1, routeBias: 0, families: ['ore'] },
    crosscurrent: {
      doors: [0, 1, 2],
      pairEvery: 14,
      spawnScale: 1.1,
      routeBias: 0.45,
      families: ['ore', 'hopper', 'heavy'],
      stages: [
        { until: 22, families: ['hopper'] },
        { until: 42, families: ['heavy'] },
      ],
    },
    motherload: {
      doors: [0, 1, 2],
      pairEvery: 12,
      spawnScale: 1.2,
      routeBias: 0.45,
      families: ['ore', 'hopper', 'heavy'],
    },
  };
  P.EXTRACTION = [
    { work: 5, tier: 1, doors: [0], line: 'FORGE AWAKES · crossing lanes' },
    { work: 11, tier: 3, doors: [0, 1], line: 'SPRING AWAKES · high and low' },
    { work: 18, tier: 5, doors: [0, 1, 2], line: 'CRUSHER AWAKES · the motherload' },
  ];
  P.ROOMS = [
    {
      id: 'intake',
      name: 'The Intake',
      subtitle: 'A promising hole in the ground.',
      tiers: 5,
      quota: 12,
      palette: ['#100e19', '#28202a', '#513b3b', '#d69b60'],
      accent: '#ffc366',
      families: ['ore'],
      gaps: [
        [0, 15],
        [1, 9],
        [2, 16],
        [3, 10],
        [4, 17],
      ],
      props: [
        ['cart', 340, 0],
        ['barrel', 34, 1],
        ['crate', 354, 3],
        ['crystal', 54, 4],
      ],
      pattern: 'intake',
      lesson: 'Chop ore. Crash rocks. Catch the key. Pick a door.',
    },
    {
      id: 'crosscurrent',
      name: 'Crosscurrent',
      subtitle: 'The rocks have developed opinions.',
      tiers: 6,
      quota: 18,
      palette: ['#090f21', '#1a2b3a', '#304757', '#708f9b'],
      accent: '#75e4dd',
      families: ['ore', 'hopper', 'heavy'],
      gaps: [
        [0, 16],
        [1, 10],
        [2, 17],
        [3, 9],
        [4, 15],
        [5, 10],
      ],
      props: [
        ['crate', 340, 0],
        ['crystal', 45, 2],
        ['cart', 336, 4],
        ['barrel', 38, 5],
      ],
      pattern: 'crosscurrent',
      lesson: 'Duck under spring ore. Heavy bands take three chops—or one crash.',
    },
    {
      id: 'deep',
      name: 'The Motherload',
      subtitle: 'One last spectacular payday.',
      tiers: 7,
      quota: 24,
      palette: ['#140d21', '#302039', '#5c3a58', '#ae7489'],
      accent: '#f4a0c5',
      families: ['ore', 'hopper', 'heavy'],
      gaps: [
        [0, 15],
        [1, 9],
        [2, 16],
        [3, 10],
        [4, 17],
        [5, 9],
        [6, 16],
      ],
      props: [
        ['cart', 342, 0],
        ['crystal', 40, 2],
        ['barrel', 346, 3],
        ['crystal', 46, 5],
        ['crate', 344, 6],
      ],
      pattern: 'motherload',
      extraction: true,
      lesson: 'Prime three machines with crashes. Catch the final key. Get gloriously out.',
    },
  ];
  P.finalChamber = () => P.ROOMS.length - 1;
  P.floorZ = (tier) => 16 + tier * 48;
  P.tierAt = (z) => Math.max(0, Math.round((z - 16) / 48));
  P.rowFromBottom = (cz, height) => height - 1 - cz;
  P.buildRoom = (index, route = 0) => {
    const E = globalThis.My3D2dge,
      base = P.ROOMS[index];
    const def =
      index === 0
        ? base
        : {
            ...base,
            palette: base.palette.map((color, i) =>
              E.mix(color, P.ROUTES[route].color, i === 0 ? 0.025 : 0.12),
            ),
          };
    const w = 26,
      h = def.tiers * 3 + 2;
    const grid = Array.from({ length: h }, () => Array(w).fill('.'));
    const set = (cx, cz, ch) => {
      grid[P.rowFromBottom(cz, h)][cx] = ch;
    };
    for (let t = 0; t < def.tiers; t++) for (let x = 1; x < w - 1; x++) set(x, t * 3, t === 0 ? '#' : '=');
    for (const [t, x] of def.gaps)
      if (t > 0) {
        set(x, t * 3, '.');
        set(x + 1, t * 3, '.');
      }
    const ladders = [];
    for (let t = 0; t < def.tiers - 1; t++) {
      const permanent = t % 2 === 0 ? 5 : 20;
      for (const [cx, temporary] of [
        [permanent, false],
        [12, true],
      ]) {
        const cells = [];
        for (let cz = t * 3 + 1; cz <= (t + 1) * 3; cz++) {
          const under = grid[P.rowFromBottom(cz, h)][cx] === '=' ? 2 : 0;
          set(cx, cz, 'H');
          cells.push([cx, cz, under]);
        }
        ladders.push({
          id: `ladder-${t}-${cx}`,
          cx,
          x: cx * 16 + 8,
          from: P.floorZ(t),
          to: P.floorZ(t + 1),
          temporary,
          cells,
          state: 'usable',
          timer: temporary ? 9 + t * 1.7 : 99999,
          grace: 0,
          cycle: 0,
        });
      }
    }
    const rows = grid.map((r) => r.join(''));
    const level = new E.PlatformMap({
      rows,
      legend: { '#': 1, '=': 2, H: 3 },
      edges: 'open',
      types: {
        1: { style: 'stone', side: def.palette[2], top: '#d7b482', mat: 'slate' },
        2: { kind: 'oneway', style: 'plank', side: def.palette[2], top: '#ddc29c' },
        3: { kind: 'ladder', style: 'ladder', color: '#bcbfba' },
      },
    });
    const doors = [0, 1, 2].map((id) => ({
      ...P.ROUTES[id],
      routeId: P.ROUTES[id].id,
      id,
      x: [48, 368, 208][id],
      tier: [0, 2, def.tiers - 1][id],
      z: P.floorZ([0, 2, def.tiers - 1][id]),
      warning: 0,
      pulse: 0,
    }));
    return { def, rows, level, ladders, doors, width: w * 16, height: P.floorZ(def.tiers - 1) + 40, route };
  };
  P.validateContent = () => {
    const ids = new Set();
    for (const [i, def] of P.ROOMS.entries()) {
      if (ids.has(def.id)) throw new Error('Duplicate room');
      ids.add(def.id);
      const r = P.buildRoom(i);
      if (!P.PATTERNS[def.pattern]) throw new Error(`Unknown encounter pattern: ${def.pattern}`);
      for (const door of P.PATTERNS[def.pattern].doors)
        if (!r.doors.some((d) => d.id === door)) throw new Error(`Unknown pattern door ${door}`);
      if (r.doors.length !== 3) throw new Error('Three doors required');
      for (let t = 0; t < def.tiers - 1; t++)
        if (!r.ladders.some((l) => !l.temporary && l.from === P.floorZ(t)))
          throw new Error(`No permanent route ${def.id}:${t}`);
      for (const l of r.ladders)
        for (const [cx, cz] of l.cells) if (r.level.cell(cx, cz) !== 3) throw new Error('Map row conversion');
    }
    return true;
  };
})();
