(function (M) {
  "use strict";
  const W = 21,
    H = 17,
    CX = 10,
    CY = 8;
  const foods = [
    [3, 15],
    [7, 13],
    [13, 13],
    [17, 15],
    [1, 7],
    [19, 7],
    [7, 3],
    [13, 3],
    [1, 1],
    [19, 1],
    [1, 13],
    [19, 13],
  ];
  const pen = (rows) => {
    for (let y = 5; y <= 11; y++)
      for (let x = 7; x <= 13; x++)
        rows[y][x] = x === 7 || x === 13 || y === 5 || y === 11 ? "." : "#";
    for (let y = 7; y <= 9; y++) for (let x = 9; x <= 11; x++) rows[y][x] = ".";
    for (const [x, y] of [
      [10, 6],
      [12, 8],
      [10, 10],
      [8, 8],
    ])
      rows[y][x] = ".";
    return rows;
  };
  const moat = (rows) => {
    const core = rows.map((r) => r.slice());
    for (let y = 4; y <= 12; y++) for (let x = 6; x <= 14; x++) rows[y][x] = "#";
    for (let y = 6; y <= 10; y++) for (let x = 8; x <= 12; x++) rows[y][x] = core[y][x];
    for (let y = 3; y <= 6; y++) rows[y][10] = ".";
    for (let y = 10; y <= 13; y++) rows[y][10] = ".";
    for (let x = 3; x <= 8; x++) rows[8][x] = ".";
    for (let x = 12; x <= 17; x++) rows[8][x] = ".";
    for (let y = 3; y <= 13; y++) rows[y][3] = rows[y][17] = ".";
    for (let x = 3; x <= 17; x++) rows[3][x] = rows[13][x] = ".";
    return rows;
  };
  function authored(id, name, subtitle, segments, options = {}) {
    const cells = Array.from({ length: H }, () => Array(W).fill("#"));
    for (const [x0, y0, x1, y1] of segments)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells[y][x] = ".";
    pen(cells);
    if (options.turning) moat(cells);
    const tunnels = (options.tunnelRows || []).map((y) => {
      cells[y][0] = cells[y][1] = cells[y][19] = cells[y][20] = ".";
      return { a: [0, y], b: [20, y], ad: 3, bd: 1 };
    });
    const data = {
      version: 1,
      id,
      name,
      subtitle,
      w: W,
      h: H,
      rows: cells.map((r) => r.join("")),
      spawns: [
        [1, 15],
        [19, 15],
      ],
      food: foods.map((p, i) => ({
        id: `f${i}`,
        x: p[0],
        y: p[1],
        power: i >= 8,
        dir: (i * 3 + 1) % 4,
      })),
      gate: { x: CX, y: CY, turning: !!options.turning },
      tunnels,
      reveal: { kind: options.vanish || "none", period: 8, duration: 1.4 },
      predators: [
        { id: "needle", role: "follower", x: 9, y: 8, release: 4.5, speed: options.speed || 1 },
        {
          id: "peek",
          role: "interceptor",
          x: 10,
          y: 8,
          release: 8,
          speed: (options.speed || 1) * 0.97,
        },
        {
          id: "chonk",
          role: "keeper",
          x: 11,
          y: 8,
          release: 12,
          speed: (options.speed || 1) * 0.92,
        },
      ],
      hint:
        options.hint ||
        "The snacks have feet! Cut across their route. Star snacks turn the tables.",
      clear: options.clear || "A dozen delicious detours!",
      seed: 0,
    };
    const b = new M.Board(data),
      used = new Set(data.spawns.map((p) => M.key(...p)));
    for (const f of data.food) {
      const p = b.nearest(
        f.x,
        f.y,
        (x, y) => !used.has(M.key(x, y)) && !b.inPen(x, y) && b.gateIndex(x, y) < 0,
      );
      [f.x, f.y] = p;
      used.add(M.key(...p));
    }
    return data;
  }
  const outer = [
    [1, 1, 19, 1],
    [1, 15, 19, 15],
    [1, 1, 1, 15],
    [19, 1, 19, 15],
  ];
  const loop = [
    ...outer,
    [1, 3, 19, 3],
    [1, 5, 19, 5],
    [1, 11, 19, 11],
    [1, 13, 19, 13],
    [3, 1, 3, 15],
    [7, 1, 7, 15],
    [13, 1, 13, 15],
    [17, 1, 17, 15],
    [1, 7, 7, 7],
    [13, 7, 19, 7],
    [1, 9, 7, 9],
    [13, 9, 19, 9],
  ];
  const side = [
    ...outer,
    [1, 3, 19, 3],
    [1, 7, 7, 7],
    [13, 7, 19, 7],
    [1, 9, 7, 9],
    [13, 9, 19, 9],
    [1, 13, 19, 13],
    [5, 1, 5, 15],
    [7, 3, 7, 13],
    [13, 3, 13, 13],
    [15, 1, 15, 15],
    [3, 3, 3, 7],
    [17, 9, 17, 13],
    [1, 5, 7, 5],
    [13, 11, 19, 11],
  ];
  const turn = [
    ...outer,
    [1, 3, 19, 3],
    [1, 13, 19, 13],
    [3, 1, 3, 15],
    [17, 1, 17, 15],
    [7, 1, 7, 15],
    [13, 1, 13, 15],
    [1, 7, 7, 7],
    [13, 7, 19, 7],
    [1, 9, 7, 9],
    [13, 9, 19, 9],
    [5, 3, 5, 7],
    [15, 9, 15, 13],
  ];
  const vanish = [
    ...outer,
    [1, 3, 9, 3],
    [11, 3, 19, 3],
    [1, 13, 9, 13],
    [11, 13, 19, 13],
    [3, 1, 3, 15],
    [7, 1, 7, 15],
    [13, 1, 13, 15],
    [17, 1, 17, 15],
    [1, 7, 7, 7],
    [13, 7, 19, 7],
    [1, 9, 7, 9],
    [13, 9, 19, 9],
    [9, 1, 9, 5],
    [11, 11, 11, 15],
    [1, 5, 3, 5],
    [17, 11, 19, 11],
  ];
  const finale = [
    ...outer,
    [1, 3, 19, 3],
    [1, 13, 19, 13],
    [3, 1, 3, 15],
    [7, 1, 7, 15],
    [13, 1, 13, 15],
    [17, 1, 17, 15],
    [1, 7, 7, 7],
    [13, 7, 19, 7],
    [1, 9, 7, 9],
    [13, 9, 19, 9],
    [5, 3, 5, 7],
    [15, 9, 15, 13],
    [9, 1, 9, 5],
    [11, 11, 11, 15],
  ];
  M.STAGES = [
    authored("open-loops", "01 / Snack to the Future", "EVERY LITTLE BITE HAS LEGS", loop, {
      hint: "Snacks scoot. You munch. Take the cross-lane to meet one!",
      clear: "Quick feet. Quicker teeth.",
    }),
    authored("side-doors", "02 / Out to Lunch", "TAKE THE SIDE DOOR", side, {
      tunnelRows: [7],
      speed: 1.04,
      hint: "The striped side doors join up. Take the short way to a runaway!",
      clear: "One side in. The other side yum.",
    }),
    authored(
      "turning-center",
      "03 / Turn for the Chew",
      "A LITTLE PATIENCE. A BIG SHORTCUT.",
      turn,
      {
        tunnelRows: [9],
        turning: true,
        speed: 1.08,
        hint: "One door, four sides. Step into the pen and ride its quarter turn.",
        clear: "You really turned that around.",
      },
    ),
    authored("vanishing-lanes", "04 / Peek-a-Chew", "GONE WALLS, GOOD MEMORY", vanish, {
      turning: true,
      vanish: "all",
      speed: 1.1,
      hint: "Walls fade, routes stay. Chirp to reveal them. Bumps leave an echo.",
      clear: "Out of sight. Into your mouth.",
    }),
    null,
    authored("finale", "06 / The Last Laugh", "ALL THE TRICKS. ONE LAST MIX-UP.", finale, {
      tunnelRows: [3, 13],
      turning: true,
      vanish: "bands",
      speed: 1.16,
      hint: "Side doors, turning pen, shy walls. Give the last snack your best grin!",
      clear: "The last laugh is a mouthful.",
    }),
  ];
  M.template = (i) => M.copy(M.STAGES[[0, 1, 3][i % 3]]);
  M.generate = (seed, options = {}) => {
    const seedInt = M.seedValue(seed),
      rng = new M.RNG(seedInt);
    for (let attempt = 0; attempt < 12; attempt++) {
      const d = authored(
        "remix",
        "05 / Lucky Lunch",
        "A FRESH MAZE. THE SAME BIG APPETITE.",
        loop,
        {
          tunnelRows: [options.tunnels === false ? 9 : 7],
          turning: true,
          vanish: options.vanish ? "all" : "none",
          speed: 1.12,
          hint: "A fresh mix! Read the loops, then meet your lunch at the next junction.",
        },
      );
      const cells = d.rows.map((r) => r.split(""));
      // Seeded choice of cross-links and small wall islands. Never touches permanent pen or safe pockets.
      for (let y = 2; y < 15; y++)
        for (let x = 2; x < 19; x++) {
          if (x >= 6 && x <= 14 && y >= 4 && y <= 12) continue;
          if (cells[y][x] === "#" && rng.next() < 0.32) cells[y][x] = ".";
          else if (
            cells[y][x] === "." &&
            rng.next() < 0.09 &&
            x !== 3 &&
            x !== 17 &&
            y !== 3 &&
            y !== 13
          )
            cells[y][x] = "#";
        }
      d.rows = cells.map((r) => r.join(""));
      d.seed = seedInt;
      d.generation = { attempt, fallback: false };
      if (options.tunnels === false) {
        d.tunnels = [];
        for (const y of [7]) {
          cells[y][0] = cells[y][20] = "#";
        }
        d.rows = cells.map((r) => r.join(""));
      }
      if (M.validate(d).ok) return d;
    }
    const d = M.copy(M.STAGES[1]);
    d.id = "remix";
    d.name = "05 / Lucky Lunch";
    d.subtitle = "VALIDATED HOUSE MIX";
    d.seed = seedInt;
    d.generation = { attempt: 12, fallback: true };
    d.gate.turning = true;
    d.reveal.kind = options.vanish ? "all" : "none";
    return d;
  };
  M.stage = (index, seed = 4242) => (index === 4 ? M.generate(seed) : M.copy(M.STAGES[index]));
  M.penTemplate = pen;
  M.moatTemplate = moat;
})(globalThis.Mix);
