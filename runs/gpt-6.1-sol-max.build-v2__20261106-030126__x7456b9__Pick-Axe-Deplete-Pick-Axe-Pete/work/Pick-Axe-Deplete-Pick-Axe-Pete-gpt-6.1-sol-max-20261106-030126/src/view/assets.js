/* Pick Axe Deplete: original native shapes, equipment and held poses. */
(() => {
  const PD = (globalThis.PD ||= {});
  const E = globalThis.My3D2dge;
  const { px, lerp, clamp } = E;
  const A = (PD.ASSETS = Object.freeze({
    doorAmber: 'PD:doorAmber',
    doorCyan: 'PD:doorCyan',
    doorRose: 'PD:doorRose',
    ore: 'PD:ore',
    hopper: 'PD:hopper',
    heavy: 'PD:heavy',
    key: 'PD:key',
    pick: 'PD:pick',
    extractor: 'PD:extractor',
    lamp: 'PD:lamp',
    timber: 'PD:timber',
    brokenPick: 'PD:brokenPick',
    helmet: 'PD:helmet',
    rescue: 'PD:rescue',
    ladderTop: 'PD:ladderTop',
    oreCart: 'PD:oreCart',
    wheel: 'PD:wheel',
  }));
  let installed = false;
  const mat = (color, pattern = 'none', extra = {}) => ({ color, pattern, ...extra });
  const box = (m, at, size, opts) => ['box', m, at, size, ...(opts ? [opts] : [])];
  const cyl = (m, at, r, h, opts) => ['cyl', m, at, r, h, ...(opts ? [opts] : [])];
  const prism = (m, at, pts, h, axis = 'y') => ['prism', m, at, pts, h, { axis }];
  const blendJoint = (J, k, p, w) => {
    const a = J[k];
    if (a) J[k] = a.map((n, i) => lerp(n, p[i], w));
  };
  const arm = (J, side, p, w) => {
    const sh = J[`sh${side}`];
    blendJoint(J, `hand${side}`, p, w);
    blendJoint(
      J,
      `elbow${side}`,
      [(sh[0] + p[0]) * 0.5 - 0.7, (sh[1] + p[1]) * 0.5, (sh[2] + p[2]) * 0.5 - 0.8],
      w,
    );
  };
  const setBlade = (J, p, w) => {
    const v = J.bladeDir.map((n, i) => lerp(n, p[i], w));
    const n = Math.hypot(...v) || 1;
    J.bladeDir = v.map((x) => x / n);
  };

  function doorParts(color, emblem) {
    const p = [
      box('dark', [0, 0, 0], [26, 7, 32]),
      box(color, [0, 1.5, 1], [22, 7, 29]),
      box('void', [0, 5.5, 2], [15, 1.5, 24]),
      box('iron', [-11, 1, 0], [3, 9, 28]),
      box('iron', [11, 1, 0], [3, 9, 28]),
      prism(
        'iron',
        [0, 0, 26],
        [
          [-13, 0],
          [-9, 7],
          [9, 7],
          [13, 0],
        ],
        9,
      ),
      box(color, [0, 5.8, 27], [19, 2, 3]),
      box('gold', [0, 7, 5], [3, 1, 5]),
      box('steel', [-8, 6.5, 8], [1.5, 1, 10]),
      box('steel', [8, 6.5, 8], [1.5, 1, 10]),
      box('gold', [-11, 6, 3], [2, 1, 2]),
      box('gold', [11, 6, 3], [2, 1, 2]),
      box('gold', [-11, 6, 23], [2, 1, 2]),
      box('gold', [11, 6, 23], [2, 1, 2]),
    ];
    if (emblem === 'sun') {
      p.push(
        cyl('gold', [0, 7.8, 20], 3, 1.2, { rot: [90, 0, 0], seg: 8 }),
        box('glowGold', [0, 8.4, 17], [1.5, 1, 6]),
        box('glowGold', [0, 8.4, 19], [6, 1, 1.5]),
      );
    } else if (emblem === 'diamond') {
      p.push(
        prism(
          'glowCyan',
          [0, 7.8, 16],
          [
            [-4, 5],
            [0, 10],
            [4, 5],
            [0, 0],
          ],
          1.2,
        ),
      );
    } else {
      p.push(
        box('glowRose', [0, 8, 16], [1.5, 1, 8]),
        box('glowRose', [0, 8, 19], [8, 1, 1.5]),
        box('glowRose', [0, 8, 17], [5, 1, 5], { rot: [0, 45, 0] }),
      );
    }
    return p;
  }

  PD.installAssets = function installAssets() {
    if (installed) return A;
    installed = true;
    Object.assign(E.MATERIALS, {
      'PD:dark': mat('#15212c', 'metal'),
      'PD:iron': mat('#35475a', 'metal', { rivet: 7 }),
      'PD:steel': mat('#a0b6bd', 'metal'),
      'PD:gold': mat('#e8b44d', 'metal'),
      'PD:amber': mat('#c27e38', 'metal'),
      'PD:cyan': mat('#4b9499', 'metal'),
      'PD:rose': mat('#a7657f', 'metal'),
      'PD:void': mat('#0c1520'),
      'PD:oak': mat('#6c4835', 'planks', { bw: 4, len: 19 }),
      'PD:wood': mat('#b17b48', 'planks', { bw: 3, len: 12 }),
      'PD:oreStone': mat('#7c6c5d', 'stones', { size: 6 }),
      'PD:hopperStone': mat('#537d91', 'stones', { size: 5 }),
      'PD:heavyStone': mat('#645e79', 'stones', { size: 7 }),
      'PD:glowGold': mat('#ffe18a', 'none', { glow: 1 }),
      'PD:glowCyan': mat('#99e6e6', 'none', { glow: 1 }),
      'PD:glowRose': mat('#fcb8c8', 'none', { glow: 1 }),
    });
    const mats = Object.fromEntries(
      [
        'dark',
        'iron',
        'steel',
        'gold',
        'amber',
        'cyan',
        'rose',
        'void',
        'oak',
        'wood',
        'oreStone',
        'hopperStone',
        'heavyStone',
        'glowGold',
        'glowCyan',
        'glowRose',
      ].map((k) => [k, `PD:${k}`]),
    );
    function shape(name, about, parts, more = {}) {
      E.SHAPES[A[name]] = { about, tags: 'mine original prospecting', mats, parts, ...more };
    }
    shape('doorAmber', 'Amber sun gate; broad riveted timbers and sun emblem', doorParts('amber', 'sun'));
    shape('doorCyan', 'Cyan diamond gate; contrasting diamond seal', doorParts('cyan', 'diamond'));
    shape('doorRose', 'Rose star gate; full-width star seal', doorParts('rose', 'star'));
    shape(
      'ore',
      'Angular warm ore with bright exposed gold seam',
      [
        ['rock', 'oreStone', [0, 0, 7], 8, { seed: 37, rough: 0.24, sz: 0.9 }],
        prism(
          'gold',
          [0, 8.3, 3],
          [
            [-5, 0],
            [-2, 7],
            [0, 3],
            [3, 10],
            [5, 7],
            [2, 0],
          ],
          1.8,
        ),
        box('glowGold', [-2, 9, 8], [2, 2, 2]),
        box('gold', [4, 2, 11], [2.5, 3, 2]),
      ],
      { foot: [-8, -7, 8, 7] },
    );
    shape(
      'hopper',
      'Blue hopping ore with unmistakable twin crystalline ears',
      [
        ['rock', 'hopperStone', [0, 0, 7], 7.4, { seed: 65, rough: 0.2, sz: 0.95 }],
        prism(
          'glowCyan',
          [-3, 0, 11],
          [
            [-2, 0],
            [0, 6],
            [2, 0],
          ],
          3,
        ),
        prism(
          'glowCyan',
          [3, 0, 11],
          [
            [-2, 0],
            [0, 5],
            [2, 0],
          ],
          3,
        ),
        prism(
          'steel',
          [0, 7.5, 4],
          [
            [-5, 0],
            [0, 5],
            [5, 0],
            [0, 2],
          ],
          1.2,
        ),
      ],
      { foot: [-7, -7, 7, 7] },
    );
    shape(
      'heavy',
      'Large purple ore with two solid steel bands and gold core',
      [
        ['rock', 'heavyStone', [0, 0, 9], 10, { seed: 89, rough: 0.12, sz: 0.88 }],
        box('iron', [-5, 0, 0], [3, 17, 17]),
        box('iron', [5, 0, 0], [3, 17, 17]),
        box('steel', [-5, 8.7, 3], [2, 1, 10]),
        box('steel', [5, 8.7, 3], [2, 1, 10]),
        box('gold', [0, 8, 7], [3, 2, 4]),
        box('steel', [-5, 8.7, 14], [2, 1, 2]),
      ],
      { foot: [-10, -9, 10, 9] },
    );
    shape(
      'key',
      'Winged mine key; large round bow and two square teeth',
      [
        cyl('gold', [0, 0, 12], 4, 2, { rot: [90, 0, 0], seg: 8 }),
        cyl('void', [0, 1.5, 12], 1.9, 2, { rot: [90, 0, 0], seg: 8 }),
        box('glowGold', [0, 0, 1], [2, 2, 11]),
        box('gold', [2, 0, 1], [4, 2, 2]),
        box('gold', [2, 0, 5], [4, 2, 2]),
        prism(
          'glowGold',
          [-3, 0, 8],
          [
            [-6, 2],
            [0, 5],
            [0, 0],
          ],
          1,
        ),
        prism(
          'glowGold',
          [3, 0, 8],
          [
            [6, 2],
            [0, 5],
            [0, 0],
          ],
          1,
        ),
      ],
      { lights: [[0, 0, 8, '#ffc96c', 35]], foot: [-5, -2, 5, 2] },
    );
    shape(
      'pick',
      'New full-size broad steel pickaxe with wrapped wood haft',
      [
        box('wood', [0, 0, 0], [2.2, 2.2, 18]),
        box('gold', [0, 0, 2], [3, 3, 2]),
        prism(
          'steel',
          [0, 0, 14],
          [
            [-10, 0],
            [-7, 4],
            [0, 5],
            [7, 3],
            [10, -2],
            [2, 1],
            [-3, 1],
          ],
          3,
        ),
        box('iron', [0, 0, 14], [3, 4, 5]),
        box('gold', [0, 2.2, 15], [2, 1, 2]),
      ],
      { foot: [-10, -2, 10, 2] },
    );
    shape('brokenPick', 'Split steel pick head and short snapped haft', [
      box('wood', [0, 0, 0], [2, 2, 8], { rot: [0, 0, 20] }),
      prism(
        'steel',
        [0, 0, 6],
        [
          [-6, 0],
          [-3, 3],
          [1, 3],
          [3, 1],
          [0, 1],
          [-1, 0],
        ],
        2,
      ),
    ]);
    shape('helmet', 'Prospector hardhat with bright headlamp', [
      cyl('gold', [0, 0, 0], 5.2, 1.3, { seg: 10 }),
      ['ball', 'amber', [0, 0, 2], 4.4, { sz: 0.6 }],
      cyl('iron', [0, 4.4, 1.4], 2, 1, { rot: [90, 0, 0], seg: 8 }),
      cyl('glowGold', [0, 5.2, 1.4], 1.3, 0.8, { rot: [90, 0, 0], seg: 8 }),
    ]);
    shape(
      'rescue',
      'Large dropped hardhat marker; crossed rescue struts',
      [
        ['use', A.helmet, [0, 0, 0]],
        box('glowRose', [0, 0, 12], [2, 2, 10]),
        box('glowRose', [0, 0, 16], [10, 2, 2]),
      ],
      { lights: [[0, 0, 13, '#ffbcce', 40]] },
    );
    shape(
      'lamp',
      'Protected hanging brass worklight with bright square glass',
      [
        cyl('iron', [0, 0, 0], 3.5, 1.5, { seg: 6 }),
        box('glowGold', [0, 0, 1.5], [4, 4, 6]),
        box('iron', [-2.5, 0, 1], [1, 5, 7]),
        box('iron', [2.5, 0, 1], [1, 5, 7]),
        cyl('gold', [0, 0, 8], 4, 2, { seg: 6, r2: 2 }),
        box('iron', [0, 0, 9], [1, 1, 4]),
      ],
      { lights: [[0, 0, 5, '#ffc36b', 64]] },
    );
    shape('timber', 'Iron-capped timber shore, natural knots and side brace', [
      box('oak', [0, 0, 0], [6, 7, 42]),
      box('iron', [0, 0, 3], [7, 8, 3]),
      box('iron', [0, 0, 35], [7, 8, 3]),
      box('wood', [6, 0, 31], [19, 6, 4], { rot: [0, -35, 0] }),
      box('gold', [0, 4.4, 5], [2, 1, 2]),
      box('gold', [0, 4.4, 37], [2, 1, 2]),
    ]);
    shape('ladderTop', 'Riveted ladder cap; amber hourglass timing mark', [
      box('iron', [0, 0, 0], [14, 4, 4]),
      box('gold', [-5, 2, 1], [2, 1, 2]),
      box('gold', [5, 2, 1], [2, 1, 2]),
      prism(
        'glowGold',
        [0, 3, 0],
        [
          [-2, 3],
          [2, 3],
          [-2, 0],
          [2, 0],
        ],
        1,
      ),
    ]);
    shape('wheel', 'Heavy six-spoke ore machine flywheel', [
      cyl('iron', [0, 0, 12], 12, 3, { rot: [90, 0, 0], seg: 12 }),
      cyl('void', [0, 2, 12], 9, 3, { rot: [90, 0, 0], seg: 12 }),
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3,
          c = Math.cos(a),
          s = Math.sin(a);
        return prism(
          'amber',
          [0, 4, 12],
          [
            [s * 0.7, -c * 0.7],
            [c * 9 + s * 0.7, s * 9 - c * 0.7],
            [c * 9 - s * 0.7, s * 9 + c * 0.7],
            [-s * 0.7, c * 0.7],
          ],
          1.4,
        );
      }),
      cyl('gold', [0, 4, 12], 3, 3, { rot: [90, 0, 0], seg: 8 }),
    ]);
    shape(
      'extractor',
      'Mine-wide extraction head: twin pistons, brass flywheel and beacon',
      [
        box('dark', [0, 0, 0], [58, 12, 6]),
        box('iron', [-23, 0, 3], [8, 10, 37]),
        box('iron', [23, 0, 3], [8, 10, 37]),
        box('amber', [0, 0, 34], [64, 11, 7]),
        box('steel', [-23, 0, 9], [3, 12, 20]),
        box('steel', [23, 0, 9], [3, 12, 20]),
        box('iron', [0, 1, 10], [27, 10, 23]),
        ['use', A.wheel, [0, 5, 11], { scale: 0.66 }],
        box('gold', [0, 0, 39], [18, 10, 4]),
        box('glowGold', [0, 0, 43], [10, 8, 5]),
        box('dark', [0, 5, 29], [20, 1, 3]),
        box('glowRose', [-7, 5.7, 30], [3, 1, 1]),
        box('glowCyan', [0, 5.7, 30], [3, 1, 1]),
        box('glowGold', [7, 5.7, 30], [3, 1, 1]),
      ],
      { lights: [[0, 0, 45, '#ffc85e', 90]] },
    );
    shape('oreCart', 'Iron mine cart heaped with native ore and a warm gold seam', [
      ['use', 'cart', [0, 0, 0], { mats: { w: 'PD:wood', m: 'PD:iron' } }],
      ['use', A.ore, [-5, 0, 10], { scale: 0.65 }],
      ['use', A.ore, [4, 0, 11], { scale: 0.7 }],
    ]);
    registerHat('PD:helmet', false);
    registerHat('PD:twinHelmet', true);
    E.Humanoid.weapon('PD:pickaxe', {
      length: 13.5,
      rest: [0.45, 0.08, -0.9],
      blade: true,
      draw(w) {
        const { g, u, rig } = w,
          t = E.tones(rig._pdWear === 1 ? '#d58c59' : '#b8cbd1');
        const h = E.tones('#a47243'),
          b = w.at(-4),
          top = w.at(12.5),
          tip = w.at(13.5);
        const bd = w.J.bladeDir,
          side = [-bd[2], 0, bd[0]];
        const a = w.at(11.5, side[0] * -7, 0, side[2] * -7),
          c = w.at(12.5, side[0] * 7.5, 0, side[2] * 7.5);
        const a2 = w.at(13, side[0] * -4, 0, side[2] * -4),
          c2 = w.at(13.5, side[0] * 4, 0, side[2] * 4);
        w.push(Math.max(top[2], w.hand[2]) + 0.04, () => {
          px.line(g, b[0], b[1], top[0], top[1], h.deep, Math.max(2, 2.2 * u));
          px.line(g, b[0] - 0.6, b[1] - 0.6, top[0] - 0.6, top[1] - 0.6, h.lt, Math.max(1, u));
          px.poly(g, [a, a2, tip, c2, c, w.at(10.2)], t.sh);
          px.line(g, a2[0] - 0.5, a2[1] - 0.5, tip[0] - 0.5, tip[1] - 0.5, t.hi, Math.max(1, u));
          px.line(g, tip[0], tip[1], c2[0], c2[1], t.lt, Math.max(1, u));
          px.disc(g, top[0], top[1], Math.max(1, 1.3 * u), '#8f693c');
          px.dot(g, top[0] - 0.4, top[1] - 0.4, '#f6d691');
          if (rig._pdWear <= 2) {
            const p = w.at(12);
            px.line(g, p[0] - 2 * u, p[1] - u, p[0] + u, p[1] + u, '#3b2f37', Math.max(1, u));
          }
        });
      },
    });
    registerPoses();
    return A;
  };

  function registerHat(id, twin) {
    E.Humanoid.hat(id, (h) => {
      const { g, r, R } = h,
        t = E.tones(h.c),
        crown = h.at(-0.35, 0, R * 0.64);
      const front = h.at(R * 1.1, 0, R * 0.28),
        back = h.at(-R * 1.3, 0, R * 0.28);
      px.ell(g, crown[0], crown[1], r * 1.12, r * 0.72, t.sh);
      px.ell(g, crown[0] - 0.4, crown[1] - 0.8, r * 0.94, r * 0.62, t.base);
      const ridge = h.at(0, 0, R * 1.22),
        rt = h.at(R * 0.7, 0, R * 0.8);
      px.line(g, ridge[0], ridge[1], rt[0], rt[1], t.hi, Math.max(1, r * 0.25));
      px.line(g, back[0], back[1], front[0], front[1], t.deep, Math.max(2, r * 0.42));
      px.line(g, back[0], back[1] - 0.7, front[0], front[1] - 0.7, t.lt, Math.max(1, r * 0.24));
      const light = h.at(R * 0.95, 0, R * 0.65);
      px.disc(g, light[0], light[1], Math.max(1, r * 0.42), '#25313b');
      px.disc(g, light[0], light[1], Math.max(1, r * 0.28), '#ffde89');
      px.dot(g, light[0] - 0.5, light[1] - 0.5, '#fff9db');
      if (twin) {
        const fin = h.at(-R * 0.9, 0, R * 1.55),
          f2 = h.at(-R * 0.2, 0, R * 1.05);
        px.poly(
          g,
          [
            [fin[0] - r * 0.35, fin[1]],
            [fin[0] + r * 0.3, fin[1]],
            [f2[0] + r * 0.4, f2[1] + r * 0.2],
          ],
          '#80d4cb',
        );
        const band = h.at(-R * 1.15, 0, R * 0.3),
          tail = h.at(-R * 2, 0, -R * 0.3);
        px.line(g, band[0], band[1], tail[0], tail[1], '#f9aeab', Math.max(1, r * 0.3));
      }
    });
  }

  function registerPoses() {
    const pose = (id, fn) => E.Humanoid.pose(`PD:${id}`, fn);
    pose('boast', (J, w) => {
      arm(J, 'L', [-0.5, -4, 14], w);
      arm(J, 'R', [3, 2, 23], w);
      setBlade(J, [0.15, 0, 1], w);
    });
    pose('break', (J, w, _rig) => {
      const sh = J.shC;
      arm(J, 'R', [4, 4, sh[2] + 2], w);
      arm(J, 'L', [4, -5, sh[2] + 3], w);
      blendJoint(J, 'head', [-1, 0, J.head[2] + 0.5], w);
      setBlade(J, [0.4, 0, -1], w);
    });
    pose('unarmed', (J, w) => {
      arm(J, 'R', [3, 4, 14], w);
      arm(J, 'L', [2, -4, 15], w);
    });
    pose('jam', (J, w, rig) => {
      const sh = J.shC,
        wobble = Math.sin(rig.t * 15) * 0.5;
      arm(J, 'R', [6, 3, sh[2] - 2 + wobble], w);
      arm(J, 'L', [6, -3, sh[2] + 1 - wobble], w);
      blendJoint(J, 'head', [1, 0, J.head[2] - 1], w);
    });
    pose('unlock', (J, w) => {
      const sh = J.shC;
      arm(J, 'L', [8, -1, sh[2] - 4], w);
      arm(J, 'R', [1, 3, sh[2] + 4], w);
      setBlade(J, [0.1, 0, 1], w);
    });
    pose('rescue', (J, w) => {
      arm(J, 'R', [6, 2, 5], w);
      arm(J, 'L', [5, -3, 4], w);
      blendJoint(J, 'head', [3, 0, J.head[2] - 5], w);
      blendJoint(J, 'shC', [2, 0, J.shC[2] - 5], w);
    });
    pose('collect', (J, w) => {
      arm(J, 'L', [2, -3, 26], w);
      arm(J, 'R', [2, 3, 24], w);
      setBlade(J, [0.1, 0, 1], w);
    });
    pose('celebrate', (J, w, rig) => {
      const t = Math.sin(rig.t * 6);
      arm(J, 'L', [2 + t, -4, 25], w);
      arm(J, 'R', [2 - t, 4, 25], w);
      setBlade(J, [0, 0, 1], w);
      blendJoint(J, 'head', [0, 0, J.head[2] + 1], w);
    });
    pose('redirectHigh', (J, w) => {
      arm(J, 'R', [7, 1, 21], w);
      arm(J, 'L', [5, -1, 18], w);
      setBlade(J, [0.75, 0, 0.7], w);
    });
    pose('redirectLow', (J, w) => {
      arm(J, 'R', [7, 1, 10], w);
      arm(J, 'L', [4, -2, 11], w);
      setBlade(J, [0.9, 0, -0.4], w);
    });
    pose('wear', (J, w) => {
      arm(J, 'L', [3, -2, 18], w);
      arm(J, 'R', [4, 2, 17], w);
      setBlade(J, [0.6, 0, 0.8], w);
    });
  }

  PD.makeMinerRig = function makeMinerRig(index = 0) {
    PD.installAssets();
    const second = index % 2 === 1;
    const rig = new E.Humanoid({
      seed: 371 + index * 919,
      size: 0.92,
      build: 'bulky',
      hipZ: 10.7,
      legUpper: 5.7,
      legLower: 5.4,
      torso: 7.4,
      headR: 3.1,
      armUpper: 4.6,
      armLower: 4.4,
      shoulderHalf: 3.6,
      limbW: 2.2,
      torsoW: 3.5,
      weapon: 'PD:pickaxe',
      swingPlane: 'side',
      outfit: 'shirt',
      hair: second ? 'ponytail' : 'short',
      sleeves: 'short',
      hat: { style: second ? 'PD:twinHelmet' : 'PD:helmet', color: second ? '#85d4bd' : '#efb74c' },
      colors: {
        cloth: second ? '#cf737b' : '#d7a263',
        pants: second ? '#3e8989' : '#426c9a',
        boot: '#493a35',
        belt: '#594032',
        glove: '#a77c48',
        metal: '#b9cbd1',
        hilt: '#e2af5d',
        hair: second ? '#653f46' : '#5b3e31',
        skin: second ? '#c98a69' : '#e2b888',
        trim: '#ffe09a',
      },
      draw: {
        over(g, Q, _r) {
          const sh = Q.shC,
            hip = Q.hipC;
          const u = Math.max(0.7, (Math.hypot(Q.shL[0] - Q.shR[0], Q.shL[1] - Q.shR[1]) || 4) / 5.5);
          // Two bright overall straps and large brass belt buckle.
          const c = second ? '#6cc2b6' : '#7da7c9';
          for (const s of [-1, 1]) {
            const p = Q[s < 0 ? 'shL' : 'shR'];
            px.line(
              g,
              p[0] * 0.65 + sh[0] * 0.35,
              p[1] + u,
              hip[0] + s * u,
              hip[1] - 2 * u,
              c,
              Math.max(1, u),
            );
            px.disc(g, hip[0] + s * u, hip[1] - 2 * u, Math.max(0.6, u * 0.65), '#e8c078');
          }
          px.rect(g, hip[0] - u, hip[1] - u, 2 * u, 1.5 * u, '#e7bb68');
        },
      },
    });
    rig._pdIndex = index;
    rig._pdWear = 6;
    return rig;
  };

  PD.updateMinerRig = function updateMinerRig(rig, miner, dt) {
    const b = miner.body;
    const tool = typeof miner.tool === 'number' ? miner.tool : (miner.tool?.durability ?? 6);
    rig._pdWear = tool;
    rig.o.weapon = tool > 0 && !miner.down ? 'PD:pickaxe' : null;
    let pose = miner.pose;
    if (pose && !E.Humanoid.poses[pose] && E.Humanoid.poses[`PD:${pose}`]) pose = `PD:${pose}`;
    if (miner.down) pose = 'die';
    else if (miner.jamT > 0) pose = 'PD:jam';
    else if (miner.rescueT > 0) pose = 'PD:rescue';
    else if (miner.collectT > 0) pose = 'PD:collect';
    else if (!pose && tool === 0 && !b.air && !b.climbing) pose = 'PD:unarmed';
    const action = miner.action?.state ?? miner.action ?? null;
    const s = b.rigState
      ? b.rigState({})
      : {
          x: b.x,
          y: 0,
          z: b.z,
          vx: b.vx,
          vz: b.vz,
          facing: b.facing > 0 ? 0 : Math.PI,
          air: b.air,
          climb: b.climbing,
          crouch: b.crouching,
        };
    s.pose = pose || null;
    s.attack = action?.spec ? action : null;
    s.crouch = !!b.crouching;
    s.hurt = (miner.invuln > 0 && miner.invuln < 1.35) || b.stun > 0;
    s.expr =
      miner.down || s.hurt ? 'wince' : miner.jamT > 0 ? 'shout' : pose === 'PD:celebrate' ? 'smile' : null;
    s.aim =
      miner.aim === 'low'
        ? -0.35
        : miner.aim === 'high'
          ? 0.7
          : typeof miner.aim === 'number'
            ? miner.aim
            : 0.4;
    if (b.jumped) rig.kick(1.2);
    if (b.landed) rig.land(0.4);
    rig.update(clamp(dt, 0, 0.05), s);
    return rig;
  };
  PD.installAssets();
})();
