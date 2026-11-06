(function (G) {
  'use strict';
  const E = G.My3D2dge,
    M = (G.MA = G.MA || {}),
    P = E.px;
  E.PATTERNS.oath = (s) => (Math.sin(s.u * 0.8 + s.v * 0.35) > 0.85 ? 1 : 0);
  Object.assign(E.MATERIALS, {
    oathGold: { color: '#dcac58', pattern: 'metal' },
    obsidian: { color: '#292b40', pattern: 'stones', size: 7 },
    moonGlass: { color: '#82d9dc', pattern: 'glaze', glow: 0.4 },
    emberIron: { color: '#6b5360', pattern: 'metal', rivet: 6 },
    runeLight: { color: '#f5d58c', pattern: 'oath', glow: 1 },
  });
  Object.assign(E.SHAPES, {
    oathRing: {
      about: 'A gold ring with four raised crown gems',
      tags: 'ring treasure seal',
      mats: { g: 'oathGold', r: 'runeLight' },
      foot: [-5, -3, 5, 3],
      parts: [
        [
          'group',
          [0, 0, 12],
          [90, 0, 0],
          [
            ['ring', 24, 7, ['ball', 'g', [0, 0, 0], 1.6]],
            ['ring', 4, 7, ['ball', 'r', [0, 0, 0], 2]],
          ],
        ],
      ],
    },
    sealStation: {
      about: 'A four-sided binding station with gold inlay',
      tags: 'seal ritual altar',
      mats: { s: 'obsidian', g: 'oathGold', r: 'runeLight' },
      parts: [
        ['cyl', 's', [0, 0, 0], 12, 3, { seg: 8 }],
        ['cyl', 'g', [0, 0, 3], 10.5, 1, { seg: 8 }],
        ['cyl', 's', [0, 0, 4], 9, 4, { seg: 8 }],
        ['ring', 8, 6, ['box', 'r', [0, 0, 8], [1, 2.5, 1]]],
        ['ball', 'r', [0, 0, 10], 2],
      ],
    },
    escapeArch: {
      about: 'An open golden arch on twin obsidian feet',
      tags: 'arch door exit',
      mats: { s: 'obsidian', g: 'oathGold', r: 'runeLight' },
      foot: [-15, -5, 15, 5],
      parts: [
        ['mirror', 'x', ['box', 's', [14, 0, 0], [6, 8, 29]]],
        ['mirror', 'x', ['box', 'g', [14, 4.5, 1], [4, 1.5, 29]]],
        ['box', 's', [0, 0, 29], [34, 8, 5]],
        ['box', 'g', [0, 0, 34], [37, 9, 2]],
        [
          'prism',
          'g',
          [0, 0, 35],
          [
            [-17, 0],
            [0, 9],
            [17, 0],
          ],
          7,
          { axis: 'y' },
        ],
        ['ball', 'r', [0, 0, 39], 2],
      ],
    },
    furnace: {
      about: 'A hooded furnace with a molten mouth',
      tags: 'inferno furnace fire',
      mats: { s: 'obsidian', i: 'emberIron', g: 'oathGold', r: 'flame' },
      parts: [
        ['box', 's', [0, 0, 0], [23, 15, 30]],
        ['box', 'i', [0, 0, 30], [28, 19, 4]],
        ['box', 'r', [0, 8, 6], [15, 1, 13]],
        ['row', 5, [3, 0, 0], ['box', 'i', [0, 9, 5], [1, 2, 15]]],
        ['cyl', 'g', [0, 0, 34], 5, 12],
      ],
      flames: [[0, 9, 7, 10, 15]],
      lights: [[0, 10, 16, '#ffa45b', 85]],
    },
    clock: {
      about: 'A great pendulum set in a violet clocktower',
      tags: 'clock shifting machinery',
      mats: { s: 'obsidian', g: 'oathGold', c: 'moonGlass' },
      parts: [
        ['box', 's', [0, 0, 0], [20, 12, 35]],
        ['cyl', 'g', [0, 0, 35], 14, 3],
        ['box', 'g', [0, 7, 15], [1, 2, 17]],
        ['ball', 'g', [0, 7, 14], 4],
        ['ball', 'c', [0, 7, 29], 6],
        ['box', 'g', [0, 13.5, 29], [8, 1, 1]],
      ],
    },
    castleToken: {
      about: 'A miniature castle on a carved tabletop token',
      tags: 'castle token board',
      mats: { s: 'obsidian', g: 'oathGold', c: 'moonGlass' },
      parts: [
        ['cyl', 'g', [0, 0, 0], 15, 2, { seg: 8 }],
        ['box', 's', [0, 0, 2], [24, 15, 13]],
        ['mirror', 'x', ['box', 's', [11, 0, 3], [7, 9, 22]]],
        ['mirror', 'x', ['cyl', 'g', [11, 0, 25], 5, 7, { r2: 0, seg: 4 }]],
        ['box', 'g', [0, 8, 3], [5, 1, 9]],
        ['row', 3, [7, 0, 0], ['box', 'g', [0, 0, 15], [3, 15, 3]]],
      ],
    },
    crystalRib: {
      about: 'A bifurcated luminous crystal rib',
      tags: 'crystal cavern rib',
      mats: { c: 'moonGlass', s: 'obsidian' },
      parts: [
        ['cyl', 's', [0, 0, 0], 6, 2],
        ['cyl', 'c', [0, 0, 2], 4.5, 25, { r2: 0, seg: 5, rot: [0, 18, 0] }],
        ['cyl', 'c', [-3, 0, 1], 3, 16, { r2: 0, seg: 5, rot: [0, -25, 0] }],
      ],
    },
  });
  E.Humanoid.hat('oathHelm', (h) => {
    E.Humanoid.hats.helmet(h);
    const a = h.at(-0.8, 0, h.R * 1.2),
      b = h.at(-3.3, 0, h.R * 2.3),
      c = h.at(-4, 0, h.R * 0.5);
    P.poly(h.g, [a, b, c], '#e8a75b');
    P.line(h.g, a[0], a[1], b[0], b[1], '#ffe3a1');
  });
  E.Humanoid.hat('moonCrown', (h) => {
    for (const s of [-1, 1]) {
      const a = h.at(0, s * h.R * 0.7, h.R * 0.5),
        b = h.at(-1, s * h.R * 1.2, h.R * 2),
        c = h.at(-1, s * h.R * 0.2, h.R);
      P.poly(h.g, [a, b, c], '#d3a1ef');
      P.line(h.g, a[0], a[1], b[0], b[1], '#ffe0f7');
    }
  });
  const shift = (J, name, w, xyz) => {
    if (J[name]) for (let i = 0; i < 3; i++) J[name][i] += xyz[i] * w;
  };
  E.Humanoid.pose('ringCarry', (J, w) => {
    shift(J, 'handL', w, [6, -1, 8]);
    shift(J, 'elbowL', w, [3, 0, 3]);
  });
  E.Humanoid.pose('ringPass', (J, w) => {
    shift(J, 'handL', w, [10, 0, 7]);
    shift(J, 'handR', w, [8, 0, 5]);
  });
  E.Humanoid.pose('stonewalk', (J, w) => {
    shift(J, 'handL', w, [0, -6, 3]);
    shift(J, 'handR', w, [0, 6, 3]);
    shift(J, 'head', w, [0, 0, 2]);
  });
  E.Humanoid.pose('mirrorcloak', (J, w) => {
    shift(J, 'handL', w, [3, 4, 9]);
    shift(J, 'head', w, [-1, 0, -2]);
  });
  E.Humanoid.pose('binding', (J, w) => {
    shift(J, 'handL', w, [7, 1, 10]);
    shift(J, 'handR', w, [7, -1, 10]);
  });
  M.heroRig = (id, size = 1.25) => {
    const base = {
      size,
      face: { eyes: 'big', bangs: 0.6 },
      seed: M.hash(id),
      cape: { len: 7, width: 5, seg: 2.3 },
      sleeves: 'long',
    };
    const specs = {
      warrior: {
        build: 'heroic',
        armor: true,
        weapon: 'sword',
        hat: { style: 'oathHelm', color: '#c1c8d1' },
        hair: 'short',
        outfit: 'tunic',
        colors: {
          skin: '#dca879',
          hair: '#5b3535',
          cloth: '#294a63',
          plate: '#bdc2cb',
          trim: '#f4c670',
          cape: '#ba7244',
          capeIn: '#532d32',
          pants: '#384159',
          glove: '#936954',
          metal: '#e3eaf0',
          hilt: '#e9bd66',
        },
        draw: {
          over(g, Q, rig) {
            const h = Q.handL,
              u = rig.o.size || 1;
            if (h) {
              P.poly(
                g,
                [
                  [h[0] - 4 * u, h[1] - 6 * u],
                  [h[0] + 4 * u, h[1] - 5 * u],
                  [h[0] + 3 * u, h[1] + 4 * u],
                  [h[0], h[1] + 7 * u],
                  [h[0] - 4 * u, h[1] + 3 * u],
                ],
                '#36495f',
              );
              P.line(g, h[0], h[1] - 4 * u, h[0], h[1] + 4 * u, '#ecc46e', 2);
            }
          },
        },
      },
      wizard: {
        weapon: 'staff',
        outfit: 'robe',
        hat: { style: 'pointed', color: '#6584bd' },
        hair: 'long',
        colors: {
          skin: '#b88a73',
          hair: '#e0d6c9',
          cloth: '#5475af',
          trim: '#d5d5f4',
          cape: '#293f70',
          capeIn: '#8d9ace',
          belt: '#e2bf75',
          orb: '#c4f3ff',
          staff: '#a88f74',
          pants: '#34436b',
        },
      },
      phantom: {
        weapon: null,
        hood: true,
        outfit: 'coat',
        hair: 'bald',
        eyeGlow: '#a4fff5',
        colors: {
          skin: '#a3cfcf',
          hair: '#254756',
          cloth: '#3e827f',
          coat: '#37666f',
          trim: '#a5e1d5',
          cape: '#477c83',
          capeIn: '#284452',
          pants: '#344853',
          boot: '#29414f',
          glove: '#83c5c0',
        },
      },
      changeling: {
        weapon: null,
        outfit: 'robe',
        hair: 'ponytail',
        hat: { style: 'moonCrown', color: '#cba9e5' },
        colors: {
          skin: '#d5ad9d',
          hair: '#e4b9cd',
          cloth: '#885d9c',
          trim: '#e9c68c',
          cape: '#9b73b3',
          capeIn: '#432e63',
          pants: '#493655',
          belt: '#caac71',
          glove: '#c8a0ce',
        },
      },
    };
    return new E.Humanoid({ ...base, ...specs[id] });
  };
  M.enemyRig = (kind) => {
    if (kind === 'fighter')
      return new E.Humanoid({
        size: 1.12,
        build: 'bulky',
        armor: true,
        weapon: 'sword',
        hat: 'helmet',
        hair: 'bald',
        eyeGlow: '#ffdc7a',
        colors: { skin: '#88917a', cloth: '#843d4b', plate: '#767084', trim: '#b79c67', pants: '#3b344b' },
      });
    if (kind === 'fire')
      return new E.Humanoid({
        size: 1.24,
        weapon: 'staff',
        outfit: 'robe',
        hood: true,
        eyeGlow: '#ffd8a0',
        hair: 'bald',
        colors: {
          skin: '#d1a496',
          hair: '#513342',
          cloth: '#9b5146',
          trim: '#e7a868',
          orb: '#ffc784',
          pants: '#55313b',
        },
      });
    return null;
  };
  M.masterRig = () =>
    new E.Humanoid({
      size: 2.4,
      build: 'heroic',
      weapon: 'staff',
      outfit: 'robe',
      hood: true,
      hat: { style: 'crown', color: '#e2bb6d' },
      eyeGlow: '#ffe9a8',
      cape: { len: 13, width: 10, seg: 3 },
      hair: 'bald',
      colors: {
        skin: '#343347',
        hair: '#242436',
        cloth: '#303047',
        trim: '#d1a35e',
        cape: '#212434',
        capeIn: '#493b55',
        metal: '#b38c59',
        orb: '#ffe6a3',
        staff: '#957349',
        pants: '#272736',
      },
    });
  class NightmareRig {
    constructor(kind) {
      this.kind = kind;
      this.s = {};
      this.t = 0;
    }
    update(dt, state) {
      this.s = state;
      this.t += dt;
    }
    draw(g, ox, oy, v) {
      const scale = v.scale || 1.5,
        t = this.t,
        spider = this.kind === 'spider',
        col = spider ? '#b190b7' : '#8573ae';
      if (spider) {
        const lift = this.s.phase === 'wind' ? 14 : this.s.phase === 'active' ? 0 : 3;
        for (const side of [-1, 1])
          for (let i = 0; i < 4; i++) {
            const x = ox + side * (8 + i) * scale,
              y = oy + (i - 1) * 3 * scale,
              bend = Math.sin(t * 8 + i * 1.5) * 2;
            P.line(g, ox, oy - lift - 5, x, y - 5 - lift + bend, '#564860', 2);
            P.line(g, x, y - 5 - lift + bend, x + side * 4, y, col);
          }
        P.ell(g, ox, oy - lift - 6, 8 * scale, 5 * scale, '#544360');
        P.ell(g, ox - 1, oy - lift - 8, 5 * scale, 3 * scale, '#9c7baf');
        P.disc(g, ox, oy - lift - 3, 3 * scale, '#756080');
        for (const a of [-2, 2]) P.disc(g, ox + a * scale, oy - lift - 4, 1, '#ffe6a0');
      } else {
        const flap = Math.sin(t * 7) * 10 * scale,
          yy = oy - 16 * scale;
        for (const side of [-1, 1]) {
          const pts = [
            [ox, yy],
            [ox + side * 12 * scale, yy - 5 * scale - flap],
            [ox + side * 23 * scale, yy - flap],
            [ox + side * 18 * scale, yy + 5 * scale],
            [ox + side * 10 * scale, yy + 2 * scale],
            [ox + side * 5 * scale, yy + 7 * scale],
          ];
          P.poly(g, pts, '#403455');
          P.line(g, pts[0][0], pts[0][1], pts[1][0], pts[1][1], col, 2);
          P.line(g, pts[1][0], pts[1][1], pts[2][0], pts[2][1], '#b19aca');
        }
        P.ell(g, ox, yy + 3 * scale, 4 * scale, 7 * scale, '#756080');
        P.disc(g, ox, yy - 3 * scale, 5 * scale, '#9c86b6');
        P.disc(g, ox - 2 * scale, yy - 4 * scale, 1.2 * scale, '#ffdf98');
        P.disc(g, ox + 2 * scale, yy - 4 * scale, 1.2 * scale, '#ffdf98');
        P.poly(
          g,
          [
            [ox - 3 * scale, yy - 6 * scale],
            [ox - 6 * scale, yy - 12 * scale],
            [ox, yy - 7 * scale],
          ],
          '#b6a0cb',
        );
      }
    }
  }
  class DragonRig {
    constructor() {
      this.s = {};
      this.t = 0;
    }
    update(dt, s) {
      this.s = s;
      this.t += dt;
    }
    draw(g, ox, oy, v) {
      const u = (v.scale || 1.5) * 0.88,
        t = this.t,
        breath = this.s.phase === 'wind',
        bound = this.s.phase === 'bound';
      const p = (x, y) => [ox + x * u, oy + y * u];
      const poly = (pts, c) =>
        P.poly(
          g,
          pts.map(([x, y]) => p(x, y)),
          c,
        );
      for (let i = 11; i >= 0; i--) {
        const a = i * 0.27,
          x = 22 + Math.sin(a) * 21,
          y = 3 + Math.cos(a) * 12,
          r = (13 - i) * 0.7 + 1;
        P.ell(g, ...p(x, y), r * u, r * u * 0.65, i % 2 ? '#736079' : '#514761');
      }
      for (const side of [-1, 1]) {
        const flap = bound ? 5 : Math.sin(t * 1.7) * 5;
        const pts = [
          [side * 10, -21],
          [side * 34, -55 - flap],
          [side * 65, -38 - flap],
          [side * 59, -13],
          [side * 46, -23],
          [side * 38, -4],
          [side * 28, -15],
          [side * 17, 0],
        ];
        poly(pts, '#40354d');
        poly([pts[0], pts[1], pts[2], [side * 39, -30]], '#68506b');
        for (let i = 1; i < 7; i++) P.line(g, ...p(side * 10, -21), ...p(...pts[i]), '#b49b8b', 1.5 * u);
        P.line(g, ...p(...pts[1]), ...p(...pts[2]), '#d1bb9c', 2 * u);
        poly(
          [
            [side * 13, -9],
            [side * 25, 3],
            [side * 27, 15],
            [side * 15, 15],
            [side * 12, 7],
          ],
          '#736783',
        );
        for (let i = 0; i < 3; i++)
          poly(
            [
              [side * (16 + i * 4), 12],
              [side * (18 + i * 4), 18],
              [side * (20 + i * 4), 12],
            ],
            '#e3cda1',
          );
      }
      P.ell(g, ...p(0, -12), 20 * u, 23 * u, '#423d55');
      P.ell(g, ...p(-3, -15), 15 * u, 21 * u, '#796b83');
      P.ell(g, ...p(1, -8), 10 * u, 17 * u, '#b6a68f');
      for (let y = -21; y < 5; y += 5) P.line(g, ...p(-7, y), ...p(9, y + 2), '#83788a');
      for (let i = 0; i < 6; i++)
        poly(
          [
            [-14, -27 + i * 5],
            [-20, -32 + i * 5],
            [-15, -20 + i * 5],
          ],
          '#c4b39b',
        );
      const lift = breath ? Math.sin(t * 3) * 2 - 3 : Math.sin(t * 1.6);
      poly(
        [
          [-10, -26],
          [-11, -40 + lift],
          [-19, -48 + lift],
          [-11, -58 + lift],
          [12, -55 + lift],
          [20, -42 + lift],
          [14, -31],
          [8, -22],
        ],
        '#8d7e91',
      );
      poly(
        [
          [-8, -48 + lift],
          [-10, -66 + lift],
          [-18, -72 + lift],
          [-16, -54 + lift],
        ],
        '#e4cea5',
      );
      poly(
        [
          [9, -49 + lift],
          [15, -68 + lift],
          [21, -70 + lift],
          [17, -49 + lift],
        ],
        '#c4b093',
      );
      poly(
        [
          [-16, -41 + lift],
          [-21, -34 + lift],
          [-6, -29 + lift],
          [14, -33 + lift],
          [19, -39 + lift],
        ],
        '#a69498',
      );
      P.line(g, ...p(-13, -34 + lift), ...p(13, -33 + lift), '#392c42', 2 * u);
      for (let i = -10; i <= 10; i += 5)
        poly(
          [
            [i, -34 + lift],
            [i + 2, -29 + lift],
            [i + 3, -34 + lift],
          ],
          '#eadbc1',
        );
      for (const side of [-1, 1]) {
        P.ell(g, ...p(side * 9, -45 + lift), 4 * u, 2.2 * u, bound ? '#a1dacf' : '#ffe09c');
        P.line(g, ...p(side * 9, -47 + lift), ...p(side * 8, -43 + lift), '#6c3a48', u);
      }
      if (breath) {
        P.disc(g, ...p(0, -32 + lift), 4 * u, '#ffe2a4');
        P.disc(g, ...p(0, -32 + lift), 2 * u, '#fff8d4');
      }
      if (bound) {
        for (const y of [-45, -20, 0]) P.line(g, ...p(-45, y), ...p(45, y - 4), '#efd490', 1.4 * u);
      }
    }
  }
  M.NightmareRig = NightmareRig;
  M.DragonRig = DragonRig;
})(globalThis);
