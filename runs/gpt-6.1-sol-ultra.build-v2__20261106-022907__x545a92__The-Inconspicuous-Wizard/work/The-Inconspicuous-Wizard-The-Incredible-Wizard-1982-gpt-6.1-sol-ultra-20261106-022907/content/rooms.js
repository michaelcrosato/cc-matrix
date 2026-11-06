/* Original authored chambers. Coordinates are grid-cell centers. */
(function (G) {
  'use strict';
  const W = 19,
    H = 13;
  function chamber(o) {
    const r = Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) =>
        x === 0 || x === W - 1 || y === 0 || y === H - 1 ? '#' : '.',
      ),
    );
    for (const [x, y, w, h] of o.walls)
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++) r[j][i] = '#';
    for (const [x, y] of o.open || []) r[y][x] = '.';
    r[6][0] = r[6][18] = 'P';
    for (const [x, y] of o.posts) r[y][x] = 'B';
    o.rows = r.map((a) => a.join(''));
    o.width = W;
    o.height = H;
    o.entrances = [
      [1, 11],
      [17, 11],
    ];
    o.portals = [
      [0, 6],
      [18, 6],
    ];
    const starts = [
      [2, 1],
      [9, 1],
      [16, 1],
      [1, 4],
      [17, 4],
      [2, 9],
      [16, 9],
      [9, 10],
    ];
    o.spawns = [];
    for (let i = 0; i < o.count; i++) {
      let type =
        i < o.initialVisible
          ? 'hopper'
          : o.roster[(i - o.initialVisible) % o.roster.length];
      let p = starts[(i * 3 + o.index) % starts.length];
      if (r[p[1]][p[0]] === '#' || r[p[1]][p[0]] === 'B') p = [9, 11];
      o.spawns.push({
        type,
        x: p[0],
        y: p[1],
        after: i < 4 ? 0 : i - 3,
        delay: i < 4 ? i * 2.2 : 0.7 + (i % 3) * 0.6,
      });
    }
    delete o.walls;
    delete o.open;
    return o;
  }
  const ROOMS = [
    chamber({
      index: 0,
      name: 'The Brass Threshold',
      subtitle: 'A lantern. A lane. A very bad invitation.',
      intro: 'WARDEN! Every shot must return. Make the long ones count.',
      hint: 'Move, face a lane, and fire. Your muzzle glows when the bolt returns.',
      palette: ['#211b31', '#64516c', '#e8ad57'],
      walls: [
        [3, 2, 4, 2],
        [11, 2, 5, 2],
        [3, 6, 4, 3],
        [10, 6, 4, 3],
        [15, 5, 1, 5],
        [8, 3, 1, 3],
      ],
      posts: [],
      count: 12,
      initialVisible: 12,
      roster: ['hopper'],
      wizard: 0,
      familiarStart: [9, 1],
      familiarSide: 0,
    }),
    chamber({
      index: 1,
      name: 'The Unseen Choir',
      subtitle: 'The empty corridor is occupied.',
      intro: 'Hear that? The radar sees what your lantern cannot.',
      hint: 'Hidden hunters appear in a shared straight corridor. Walls block the view; facing does not.',
      palette: ['#1c2333', '#4d6375', '#7ad5cd'],
      walls: [
        [3, 2, 3, 3],
        [8, 1, 3, 3],
        [13, 2, 3, 3],
        [2, 8, 3, 2],
        [7, 6, 4, 3],
        [13, 8, 4, 2],
      ],
      posts: [],
      count: 16,
      initialVisible: 4,
      roster: ['stalker', 'hopper', 'stalker'],
      wizard: 1,
      familiarStart: [9, 5],
      familiarSide: 1,
    }),
    chamber({
      index: 2,
      name: 'The Bellkeeper’s Vault',
      subtitle: 'Spend a shot. Borrow a secret.',
      intro:
        'Shoot a brass bell. It reveals nearby hunters and draws them along the lanes.',
      hint: 'A bell spends your one bolt: reveal, lure, then reposition. Blue gates cross the dungeon.',
      palette: ['#262039', '#6c587a', '#d9b65f'],
      walls: [
        [3, 2, 3, 3],
        [8, 2, 3, 2],
        [13, 2, 3, 3],
        [4, 7, 3, 3],
        [12, 7, 3, 3],
        [9, 6, 1, 3],
      ],
      posts: [
        [1, 8],
        [6, 4],
        [12, 4],
        [9, 10],
      ],
      count: 18,
      initialVisible: 4,
      roster: ['stalker', 'skitter', 'hopper'],
      wizard: 0,
      familiarStart: [9, 5],
      familiarSide: 0,
    }),
    chamber({
      index: 3,
      name: 'The Crossed Court',
      subtitle: 'Cover your partner. Count your echoes.',
      intro: 'The court is open. Let the lanes do the fighting.',
      hint: 'A recovery waits below. A fallen partner returns when the room clears.',
      palette: ['#292030', '#75566b', '#f6a46b'],
      walls: [
        [4, 3, 2, 2],
        [13, 3, 2, 2],
        [8, 6, 3, 2],
        [4, 9, 2, 1],
        [13, 9, 2, 1],
      ],
      posts: [
        [9, 3],
        [2, 8],
        [16, 8],
      ],
      count: 22,
      initialVisible: 4,
      roster: ['hopper', 'stalker', 'skitter', 'stalker'],
      wizard: 0,
      familiarStart: [9, 1],
      familiarSide: 1,
    }),
    chamber({
      index: 4,
      name: 'The Crooked Observatory',
      subtitle: 'His eyes. Your blind corners.',
      intro: '“MY STARS! Must you keep surviving?”',
      hint: 'Long lanes delay your next shot. Refuges buy a shorter return.',
      palette: ['#1c243c', '#536384', '#acb9fc'],
      walls: [
        [4, 2, 1, 7],
        [8, 4, 1, 7],
        [12, 2, 1, 7],
        [15, 4, 1, 7],
      ],
      open: [
        [4, 5],
        [8, 7],
        [12, 5],
        [15, 7],
      ],
      posts: [
        [2, 3],
        [10, 8],
        [17, 9],
      ],
      count: 23,
      initialVisible: 3,
      roster: ['stalker', 'skitter', 'hopper', 'skitter'],
      wizard: 1,
      familiarStart: [9, 1],
      familiarSide: 0,
    }),
    chamber({
      index: 5,
      name: 'The Last Word',
      subtitle: 'He has three. You need only one each.',
      intro:
        'The exit bounty is 1,000. Catch his familiar. Banish all three boasts. Make it FOURFOLD.',
      hint: 'Three manifestations. One hit each. Read the rune, take a lane, and commit.',
      palette: ['#271a31', '#68405e', '#ef82b4'],
      walls: [
        [4, 4, 2, 2],
        [13, 4, 2, 2],
        [8, 8, 3, 2],
        [8, 2, 3, 1],
      ],
      posts: [
        [2, 8],
        [16, 8],
      ],
      count: 19,
      initialVisible: 3,
      roster: ['skitter', 'stalker', 'hopper'],
      wizard: 3,
      familiarStart: [9, 5],
      familiarSide: 1,
    }),
  ];
  G.WizardRooms = { ROOMS, W, H };
})(globalThis);
