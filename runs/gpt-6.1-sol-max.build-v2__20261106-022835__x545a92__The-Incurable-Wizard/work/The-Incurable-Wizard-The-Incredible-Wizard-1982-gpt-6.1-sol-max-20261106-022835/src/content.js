/* Original chamber data. All coordinates are cells; the engine tile is 16 world units. */
(function (root) {
  'use strict';
  const I = (root.IW = root.IW || {});
  I.TITLE = 'The Incurable Wizard';
  I.TAGLINE = 'One bolt. Six floors. No known cure.';
  I.VERSION = '1.0.0';
  I.TILE = 16;
  I.DIRS = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  I.DEFAULTS = {
    playerSpeed: 4,
    boltSpeed: 12,
    fireInterval: 0.16,
    hopperSpeed: 1.35,
    stalkerSpeed: 1.65,
    skitterSpeed: 2.55,
    pressureRate: 0.003,
    pressureCap: 1.3,
    spawnSpacing: 4.2,
    familiarSpeed: 3.4,
    wizardInterval: 3.1,
    wizardAttack: 0.7,
    wizardWarning: 1.05,
    protection: 1.25,
    bellRevealRadius: 3,
    bellRevealTime: 1.25,
    bellLureRadius: 5,
    bellLureTime: 1.5,
    bellCooldown: 5,
    touchAssist: 1,
  };
  I.DIFFICULTY = {
    Gentle: { speed: 0.75, lives: 5, warning: 1.4 },
    Normal: { speed: 1, lives: 3, warning: 1 },
    Fierce: { speed: 1.2, lives: 3, warning: 0.8 },
  };
  I.FAMILIES = {
    hopper: { name: 'Knobble', points: 150, color: '#e7ae58' },
    stalker: { name: 'Hushjaw', points: 300, color: '#69d1c9' },
    skitter: { name: 'Needlekin', points: 500, color: '#f07696' },
  };
  const descriptions = [
    [
      'Brass Reception',
      'THE MANAGEMENT REGRETS YOUR ARRIVAL.',
      'Move into a lane. Aim, then commit your one bolt.',
      '#80634b',
      '#3a2849',
      '#ffba65',
    ],
    [
      'The Blind Choir',
      'HEAR THAT? SOMETHING IS PRETENDING NOT TO EXIST.',
      'Hushjaws vanish behind corners. The radar never loses them.',
      '#554f72',
      '#25213f',
      '#80dedb',
    ],
    [
      'The Bell Vault',
      'PLEASE DO NOT RING THE STAFF.',
      'Shoot a bell: reveal nearby hunters and bend their route.',
      '#7a6857',
      '#342947',
      '#f4cc75',
    ],
    [
      'The Unfriendly Court',
      'A LITTLE LESS WALL. A GREAT DEAL MORE TROUBLE.',
      'Cover the crossings. A partner can watch your blind side.',
      '#655b70',
      '#30253a',
      '#f09d9d',
    ],
    [
      'The Crooked Observatory',
      'HE HAS SEEN YOU. HE IS TAKING IT PERSONALLY.',
      'Read the radar, then make the empty lane work for you.',
      '#5a6882',
      '#222b45',
      '#b5a1f5',
    ],
    [
      'The Last Appointment',
      'EXIT BOUNTY: 5,000. THREE BOASTS TO SILENCE.',
      'One hit banishes each manifestation. Make all three count.',
      '#5f526c',
      '#241c36',
      '#ff8cad',
    ],
  ];
  const layouts = [
    [
      [3, 2, 1, 3],
      [6, 2, 3, 1],
      [11, 2, 1, 3],
      [15, 2, 3, 1],
      [6, 4, 1, 2],
      [15, 4, 1, 2],
      [3, 8, 3, 1],
      [8, 8, 1, 3],
      [11, 7, 4, 1],
      [16, 8, 1, 3],
    ],
    [
      [3, 2, 5, 1],
      [10, 2, 1, 3],
      [14, 2, 4, 1],
      [3, 4, 1, 2],
      [6, 4, 2, 1],
      [14, 4, 1, 2],
      [17, 4, 1, 2],
      [4, 7, 4, 1],
      [10, 7, 1, 3],
      [14, 8, 4, 1],
      [3, 9, 1, 2],
      [6, 10, 2, 1],
      [14, 10, 1, 1],
    ],
    [
      [3, 2, 1, 3],
      [6, 2, 3, 1],
      [12, 2, 1, 3],
      [16, 2, 2, 1],
      [6, 4, 1, 2],
      [16, 4, 1, 2],
      [3, 8, 3, 1],
      [8, 7, 1, 3],
      [11, 8, 3, 1],
      [16, 8, 1, 3],
    ],
    [
      [4, 3, 3, 1],
      [14, 3, 3, 1],
      [4, 8, 3, 1],
      [14, 8, 3, 1],
      [10, 7, 1, 2],
    ],
    [
      [3, 2, 6, 1],
      [12, 2, 6, 1],
      [3, 4, 1, 2],
      [8, 4, 1, 2],
      [12, 4, 1, 2],
      [17, 4, 1, 2],
      [5, 8, 3, 1],
      [10, 7, 1, 4],
      [13, 8, 3, 1],
      [3, 10, 1, 1],
      [17, 10, 1, 1],
    ],
    [
      [5, 4, 1, 1],
      [15, 4, 1, 1],
      [5, 8, 1, 1],
      [15, 8, 1, 1],
    ],
  ];
  I.ROOMS = descriptions.map((desc, i) => {
    const w = 21,
      h = 13,
      rows = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) =>
          x === 0 || x === w - 1 || y === 0 || y === h - 1 ? '#' : '.',
        ),
      );
    for (const [x, y, ww, hh] of layouts[i])
      for (let dy = 0; dy < hh; dy++)
        for (let dx = 0; dx < ww; dx++) rows[y + dy][x + dx] = '#';
    rows[6][0] = rows[6][20] = 'P';
    const posts =
      i >= 2
        ? [
            [10, 2],
            [2, 9],
            [18, 9],
          ]
        : i === 0
          ? [[2, 2]]
          : [];
    for (const [x, y] of posts) rows[y][x] = 'B';
    const n = [16, 20, 24, 26, 28, 22][i],
      spawns = [];
    for (let k = 0; k < n; k++)
      spawns.push({
        kind:
          i === 0
            ? 'hopper'
            : i === 1
              ? k % 3 === 2
                ? 'stalker'
                : 'hopper'
              : ['hopper', 'stalker', 'skitter'][k % 3],
        at: k < 3 ? k * 0.9 : (k - 2) * 4.2 + 2,
        after: k >= n - 3 ? (k - (n - 3) + 1) * 2 : 0,
        port: [
          [2, 1],
          [18, 1],
          [10, 6],
          [1, 6],
          [19, 6],
        ][k % 5],
      });
    return {
      id: i,
      name: desc[0],
      boast: desc[1],
      lesson: desc[2],
      wall: desc[3],
      floor: desc[4],
      accent: desc[5],
      w,
      h,
      rows: rows.map((r) => r.join('')),
      posts,
      spawns,
      intrusions: [0, 1, 0, 0, 1, 3][i],
      entries: [
        [1, 11],
        [19, 11],
      ],
      familiarStart: [10, 1],
      bounty: i === 5 ? 5000 : 0,
    };
  });
  I.copy = (x) => JSON.parse(JSON.stringify(x));
  I.cardinal = (x, y, previous = -1, dead = 0.2) => {
    if (Math.hypot(x, y) < dead) return -1;
    if (previous >= 0) {
      const d = I.DIRS[previous];
      if (
        x * d[0] + y * d[1] > 0 &&
        Math.abs(x * d[1] - y * d[0]) < Math.abs(x * d[0] + y * d[1]) * 1.22
      )
        return previous;
    }
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? 0 : 2) : y > 0 ? 1 : 3;
  };
  I.world = (v) => (v + 0.5) * 16;
  I.cell = (v) => v / 16 - 0.5;
})(globalThis);
