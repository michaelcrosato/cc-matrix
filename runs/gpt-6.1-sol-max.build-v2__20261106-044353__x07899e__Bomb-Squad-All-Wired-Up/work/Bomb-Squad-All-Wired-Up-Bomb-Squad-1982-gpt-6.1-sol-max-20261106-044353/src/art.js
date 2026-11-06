/* Native asset registry, pixel surfaces, rig reactions and tweened physical tools. */
(() => {
  'use strict';
  const W = globalThis.Wired,
    E = globalThis.My3D2dge,
    { px } = E;
  const mats = {
    pcb: { color: '#15573f', pattern: 'none' },
    pcbEdge: { color: '#104634', pattern: 'none' },
    ink: { color: '#142b31', pattern: 'none' },
    shell: { color: '#435363', pattern: 'metal' },
    silver: { color: '#b8c8c4', pattern: 'glaze' },
    gold: { color: '#dfb563', pattern: 'glaze' },
    amber: { color: '#e6af49', pattern: 'none' },
    cyan: { color: '#55c3d0', pattern: 'none' },
    coral: { color: '#ec7767', pattern: 'none' },
    dark: { color: '#25343c', pattern: 'none' },
    violet: { color: '#b39acb', pattern: 'none' },
    rubber: { color: '#1d2830', pattern: 'none' },
    cream: { color: '#e3d9b4', pattern: 'none' },
    blue: { color: '#397d9d', pattern: 'none' },
    light: { color: '#a0f5d2', pattern: 'none', glow: 0.7 },
    red: { color: '#c75244', pattern: 'none' },
  };
  const shapes = {
    pcb: {
      about: 'Layered green circuit substrate with a dark case and brass mounting screws',
      tags: 'circuit board bomb',
      parts: [
        ['box', 'dark', [0, 0, 0], [294, 184, 7]],
        ['box', 'shell', [0, 0, 7], [288, 178, 3]],
        ['box', 'pcbEdge', [0, 0, 10], [280, 170, 3]],
        ['box', 'pcb', [0, 0, 13], [280, 170, 1]],
        ['mirror', 'xy', ['cyl', 'gold', [130, 76, 14], 3, 1.5, { seg: 8 }]],
      ],
    },
    socket: {
      about: 'Two exposed silver terminal pads',
      tags: 'electronics socket',
      parts: [
        ['mirror', 'x', ['cyl', 'gold', [20, 0, 0], 4, 1, { seg: 8 }]],
        ['mirror', 'x', ['cyl', 'dark', [20, 0, 1], 2, 1, { seg: 8 }]],
      ],
    },
    bar: {
      about: 'Rectangular striped resistor',
      tags: 'electronics part',
      mats: { body: 'amber' },
      parts: [
        ['box', 'body', [0, 0, 2], [24, 11, 7]],
        ['row', 3, [5, 0, 0], ['box', 'dark', [0, 0, 9], [2, 11, 1]]],
        ['mirror', 'x', ['box', 'silver', [16, 0, 4], [9, 2, 2]]],
      ],
    },
    disc: {
      about: 'Round dotted capacitor',
      tags: 'electronics part',
      mats: { body: 'cyan' },
      parts: [
        ['cyl', 'body', [0, 0, 2], 10, 9, { seg: 12 }],
        ['cyl', 'cream', [0, 0, 11], 2, 1, { seg: 6 }],
        ['mirror', 'x', ['box', 'silver', [16, 0, 4], [9, 2, 2]]],
      ],
    },
    coil: {
      about: 'Crosshatched square inductor',
      tags: 'electronics part',
      mats: { body: 'coral' },
      parts: [
        ['box', 'dark', [0, 0, 1], [22, 13, 8]],
        ['row', 5, [4, 0, 0], ['cyl', 'body', [0, 0, 9], 3, 4, { seg: 6 }]],
        ['box', 'cream', [0, 0, 12], [2, 8, 1]],
        ['mirror', 'x', ['box', 'silver', [16, 0, 4], [9, 2, 2]]],
      ],
    },
    chip: {
      about: 'Diamond marked diagnostic chip',
      tags: 'electronics part',
      mats: { body: 'violet' },
      parts: [
        ['box', 'body', [0, 0, 2], [20, 16, 8]],
        ['box', 'cream', [0, 0, 10], [6, 6, 1], { rot: 45 }],
        ['mirror', 'x', ['box', 'silver', [16, 0, 4], [9, 2, 2]]],
      ],
    },
    jumper: {
      about: 'Bent cyan insulated jumper with bare ends',
      tags: 'electronics jumper',
      parts: [
        ['box', 'cyan', [0, 0, 5], [28, 3, 3]],
        ['mirror', 'x', ['box', 'silver', [17, 0, 1], [7, 2, 5]]],
      ],
    },
    cutters: {
      about: 'Red handled diagonal cutters with animated jaws',
      tags: 'tool cutter',
      params: { closed: 0 },
      make: (p) => [
        [
          'mirror',
          'x',
          ['box', 'red', [5 - p.closed, 11, 0], [5, 20, 4], { rot: -12 + p.closed * 9 }],
        ],
        ['cyl', 'silver', [0, 0, 1], 4, 5],
        [
          'mirror',
          'x',
          ['box', 'silver', [3 - p.closed, -8, 2], [3, 15, 4], { rot: 12 - p.closed * 10 }],
        ],
      ],
    },
    pliers: {
      about: 'Blue handled long nose pliers',
      tags: 'tool pliers',
      parts: [
        ['mirror', 'x', ['box', 'blue', [4, 11, 0], [4, 20, 4], { rot: -8 }]],
        ['cyl', 'silver', [0, 0, 2], 4, 4],
        ['mirror', 'x', ['box', 'silver', [2, -9, 2], [2, 18, 3]]],
      ],
    },
    iron: {
      about: 'Amber solder iron with an emissive copper tip',
      tags: 'tool solder',
      parts: [
        ['box', 'rubber', [0, 10, 0], [8, 22, 6]],
        ['box', 'amber', [0, 0, 0], [9, 5, 6]],
        ['box', 'silver', [0, -10, 2], [3, 16, 3]],
        ['box', 'gold', [0, -20, 2], [2, 7, 2]],
      ],
    },
    extinguisher: {
      about: 'Handheld red foam extinguisher',
      tags: 'tool foam',
      parts: [
        ['cyl', 'red', [0, 2, 0], 7, 15, { seg: 10 }],
        ['box', 'cream', [0, 2, 7], [12, 12, 4]],
        ['box', 'dark', [0, -6, 12], [4, 18, 4]],
        ['box', 'silver', [0, 1, 16], [12, 3, 3]],
      ],
    },
    van: {
      about: 'Municipal response van, striped body, lightbar and four wheels',
      tags: 'vehicle van',
      parts: [
        ['box', 'dark', [0, 0, 4], [46, 76, 8]],
        ['box', 'cream', [0, 0, 12], [46, 70, 24]],
        ['box', 'blue', [0, 4, 18], [47, 52, 5]],
        ['box', 'ink', [0, -27, 23], [39, 12, 15]],
        ['box', 'cream', [0, 2, 36], [46, 55, 3]],
        ['mirror', 'x', ['box', 'cyan', [23, -2, 27], [1, 29, 9]]],
        ['mirror', 'xy', ['cyl', 'rubber', [19, 24, 0], 8, 8, { rot: [0, 90, 0], seg: 10 }]],
        ['box', 'blue', [-8, 6, 39], [11, 8, 5]],
        ['box', 'red', [8, 6, 39], [11, 8, 5]],
        ['mirror', 'x', ['box', 'light', [15, -36, 13], [8, 2, 5]]],
      ],
    },
    clock: {
      about: 'Waterfront clock tower with a copper roof',
      tags: 'landmark quay',
      parts: [
        ['box', 'shell', [0, 0, 0], [33, 33, 70]],
        ['box', 'cream', [0, 0, 70], [39, 39, 22]],
        ['cyl', 'gold', [0, 0, 92], 31, 19, { r2: 0, seg: 4 }],
        ['box', 'ink', [0, 20, 76], [22, 2, 15]],
        ['box', 'cream', [0, 22, 82], [2, 2, 6]],
        ['box', 'cream', [4, 22, 78], [8, 2, 2]],
      ],
    },
    relay: {
      about: 'Power relay with insulating coils and a copper busbar',
      tags: 'landmark power',
      parts: [
        ['box', 'shell', [0, 0, 0], [72, 45, 12]],
        ['row', 3, [24, 0, 0], ['cyl', 'silver', [0, 0, 12], 8, 34, { seg: 8 }]],
        [
          'row',
          3,
          [24, 0, 0],
          ['row', 4, [0, 0, 6], ['cyl', 'blue', [0, 0, 29], 10, 2, { seg: 10 }]],
        ],
        ['box', 'gold', [0, 0, 48], [68, 5, 5]],
      ],
    },
    spire: {
      about: 'Art deco civic spire',
      tags: 'landmark city',
      parts: [
        ['box', 'shell', [0, 0, 0], [70, 54, 20]],
        ['box', 'blue', [0, 0, 20], [48, 39, 40]],
        ['box', 'shell', [0, 0, 60], [35, 29, 35]],
        ['box', 'gold', [0, 0, 95], [22, 19, 18]],
        ['cyl', 'silver', [0, 0, 113], 6, 32, { r2: 0, seg: 4 }],
        ['row', 5, [10, 0, 0], ['box', 'light', [0, 20, 24], [3, 2, 31]]],
      ],
    },
    housing: {
      about: 'Armoured bomb housing with lift-off lid and latch',
      tags: 'device bomb',
      parts: [
        ['box', 'dark', [0, 0, 0], [100, 72, 9]],
        ['box', 'shell', [0, 0, 9], [98, 70, 8]],
        ['box', 'pcb', [0, 0, 17], [88, 60, 2]],
        ['row', 5, [15, 0, 0], ['cyl', 'red', [0, 0, 19], 5, 10, { seg: 8 }]],
        ['box', 'gold', [0, 36, 5], [18, 4, 9]],
      ],
    },
  };
  E.addAssets({ set: 'wired', format: 1, materials: mats, shapes });
  // Also extend the documented open registries with a reusable response-light material.
  E.MATERIALS.responseGlow = { color: '#a0f5d2', pattern: 'none', glow: 1 };
  E.SHAPES.responseBeacon = {
    about: 'Municipal response beacon',
    tags: 'light',
    parts: [
      ['cyl', 'steel', [0, 0, 0], 4, 3],
      ['cyl', 'responseGlow', [0, 0, 3], 3, 5, { seg: 8 }],
    ],
  };
  W.Art = class {
    constructor(game) {
      this.g = game;
      this.tool = { x: 140, y: 90, z: 24, pulse: 0, grip: 0 };
      this.motion = null;
      this.nell = new E.Humanoid({
        size: 1.15,
        weapon: null,
        outfit: 'coat',
        hair: 'ponytail',
        hat: { style: 'cap', color: '#e6af49' },
        sleeves: 'long',
        colors: {
          skin: '#d8a77c',
          hair: '#402c2c',
          coat: '#347d80',
          cloth: '#347d80',
          pants: '#223b50',
          trim: '#e9c869',
          glove: '#e3d9b4',
        },
      });
      this.vex = new E.Humanoid({
        size: 1.2,
        weapon: null,
        outfit: 'coat',
        hair: 'spiky',
        colors: {
          skin: '#d6b39a',
          hair: '#c4c5bf',
          coat: '#794d75',
          cloth: '#794d75',
          pants: '#282f43',
          trim: '#d0b56c',
        },
      });
      this.crew = new E.Humanoid({
        size: 1.2,
        weapon: null,
        outfit: 'shirt',
        hat: { style: 'helmet', color: '#dfa444' },
        sleeves: 'long',
        colors: { cloth: '#df904a', pants: '#2a4553', skin: '#845d42', trim: '#ece5c6' },
      });
    }
    update(dt, outcome) {
      this.nell.update(dt, {
        x: 240,
        y: 160,
        z: 0,
        facing: -0.6,
        pose: outcome?.won ? 'cheer' : 'hips',
        expr: outcome?.won ? 'smile' : 'smile',
      });
      this.crew.update(dt, {
        x: 295,
        y: 154,
        z: 0,
        facing: -1,
        pose: outcome?.won ? 'wave' : 'guard',
      });
      this.vex.update(dt, { x: 0, y: 0, z: 0, facing: 0.4, pose: 'hips', expr: 'smile' });
    }
    point(x, y, z = 24, precision = false) {
      const speed = precision
        ? Math.max(1, (this.g.settings.toolTravel || 8) * (this.precision || 0.55))
        : this.g.settings.toolTravel || 8;
      this.tool.x = E.approach(this.tool.x, x, (Math.abs(x - this.tool.x) * speed) / 120 + 0.3);
      this.tool.y = E.approach(this.tool.y, y, (Math.abs(y - this.tool.y) * speed) / 120 + 0.3);
      this.tool.z = E.approach(this.tool.z, z, 0.3);
    }
    action(type, target) {
      if (this.motion) this.motion.cancel();
      this.tool.pulse = 1;
      this.motion = this.g.tween(this.tool, { pulse: 0 }, type === 'cut' ? 0.26 : 0.48, {
        ease: 'outCubic',
      });
      if (target && type === 'cut') this.g.particles.sparks(target.x, target.y, 18, 5, 0);
    }
    world(r, theme = 'quay', outcome = null, title = false) {
      const t = this.g.time,
        win = outcome?.won,
        fail = outcome && !win;
      r.sky(
        theme === 'relay'
          ? ['#11212b', '#36575c', '#af9d77']
          : theme === 'central'
            ? ['#101c31', '#393b55', '#977366']
            : ['#142f3c', '#416b74', '#ccaa7c'],
      );
      r.decal((g) => {
        for (let i = 0; i < 40; i++) {
          const x = (i * 97 + 23) % r.W,
            y = (i * 31 + 8) % 100;
          px.dot(g, x, y, '#afc2bb');
        }
        const horizon = r.H * 0.48;
        px.rect(g, 0, horizon, r.W, r.H - horizon, '#173943');
        for (let i = 0; i < 45; i++) {
          const x = (i * 37) % r.W,
            y = horizon + 10 + ((i * 29) % 100);
          px.line(g, x, y, x + 8 + (i % 7) * 5, y, win ? '#6ea9a0' : '#315a61');
        }
        for (let i = 0; i < 21; i++) {
          const x = i * 36 - 20,
            h = 20 + ((i * 13) % 48);
          px.rect(g, x, horizon - h, 29, h, fail ? '#362e3c' : '#243947');
          for (let j = 0; j < 4; j++)
            for (let k = 0; k < 3; k++)
              if ((j + k + i) % 3)
                px.rect(
                  g,
                  x + 5 + j * 5,
                  horizon - h + 6 + k * 9,
                  2,
                  4,
                  win ? '#eac679' : '#697d82',
                );
        }
      });
      r.decal((g) => {
        r.box(g, -230, 40, -10, 440, 235, 0, '#34474d', '#202f38');
        r.box(g, -230, 40, 0, 440, 49, 4, '#a8aa8b', '#566b69');
        for (let x = -210; x < 430; x += 32)
          r.box(g, x, 210, 0, x + 12, 213, 1, '#dfbd70', '#8d7954');
      });
      r.shape(
        'wired:' + (theme === 'central' ? 'spire' : theme === 'relay' ? 'relay' : 'clock'),
        250,
        78,
        0,
        { shadow: true },
      );
      r.shape('wired:van', 140, 157, 0, { facing: Math.PI / 2, scale: 0.8 });
      r.shape('wired:housing', 280, 177, 2, { scale: 0.8 });
      for (const x of [70, 338]) r.shape('lamppost', x, 112, 0, { light: true });
      for (const x of [48, 350]) r.prop('sandbags', x, 198, 0, { size: 1.4 });
      r.actor(213, 173, 0, (g, x, y) => this.nell.draw(g, x, y, r.view));
      r.actor(320, 158, 0, (g, x, y) => this.crew.draw(g, x, y, r.view));
      this.g.lights.add(140, 150, 35, 130, 0.8, { color: '#f8b975' });
      this.g.lights.add(280, 175, 24, 100, 1, { color: win ? '#a4f3ba' : '#61d6e1' });
      if (fail)
        r.overlay((g) => {
          const y = r.H * 0.45;
          for (let i = 0; i < 7; i++) {
            const x = r.W * 0.55 + i * 18;
            px.poly(
              g,
              [
                [x, y],
                [x + 9, y - 15 - Math.sin(t * 2 + i) * 12],
                [x + 17, y],
              ],
              '#c86f4e',
            );
          }
        });
      if (title)
        r.overlay((g) => {
          px.line(g, Math.round(r.W * 0.57), r.H - 34, r.W - 24, r.H - 34, '#a4b5a0');
          E.font.text(g, 'BRASSWATER MUNICIPAL RESPONSE', r.W - 24, r.H - 23, '#d6d4b7', {
            align: 'right',
            outline: false,
          });
        });
    }
    board(r, b, focus, toolIndex, observer = false) {
      const game = this.g,
        base = 14;
      r.sky(['#12252e', '#253a3d', '#3a4847']);
      r.decal((g) => r.box(g, -80, -70, -10, 365, 245, 0, '#33434a', '#1b2931'));
      r.shape('wired:pcb', 140, 85, 0, { shadow: false, charView: false, bias: -30000 });
      // Traces are intentionally thinner and dimmer than the solid terminal pads.
      r.queue(
        140,
        85,
        14,
        (g) => {
          for (let i = 0; i < 22; i++) {
            const x = 8 + i * 12,
              y = 16 + ((i * 17) % 125),
              xx = E.clamp(x + ((i % 2) * 2 - 1) * 24, 5, 276);
            const pts = [
              [x, 9],
              [x, y],
              [xx, y + 14],
              [xx, 164],
            ].map(([a, c]) => r.w(a, c, base + 1));
            for (let k = 0; k < pts.length - 1; k++)
              px.line(g, ...pts[k], ...pts[k + 1], i % 4 === 0 ? '#a2d7c5' : '#56b4a6');
            for (const [a, c] of [pts[0], pts.at(-1)]) px.disc(g, a, c, 1, '#9ac4aa');
          }
          for (let i = 0; i < 5; i++) {
            const p = r.w(28 + i * 48, 150, base + 1);
            E.font.text(g, 'R' + (i + 12), p[0], p[1], '#8db7a0', { outline: false });
          }
        },
        { bias: -20000 },
      );
      for (const c of b.components) {
        r.shape('wired:socket', c.x, c.y, base, { shadow: false, charView: false });
        if (c.phase !== 'empty') {
          const sp = c.spare && b.stock.find((s) => s.id === c.spare),
            shape = sp?.shape || c.shape,
            color = sp?.color || c.color;
          r.shape('wired:' + shape, c.x, c.y, base + 2, {
            mats: { body: 'wired:' + color },
            shadow: false,
            charView: false,
          });
        }
        r.queue(c.x, c.y, base + 12, (g) => {
          for (let side = 0; side < 2; side++) {
            const [dx, dy] = c.anchors[side],
              p = r.w(c.x + dx, c.y + dy, base + 4);
            if (c.leads[side] === 1) {
              px.line(g, p[0] - 3, p[1] - 2, p[0] + 3, p[1] + 2, '#183a32', 3);
              px.dot(g, p[0] - 3, p[1] - 2, '#f1d18d');
              px.dot(g, p[0] + 3, p[1] + 2, '#f1d18d');
            } else if (c.leads[side] === 2) {
              px.disc(g, p[0], p[1], 4, '#6b9690');
              px.disc(g, p[0] - 1, p[1] - 1, 2, '#d9fff0');
            }
            if (b.fault?.component === c.id && b.fault.terminal === side) {
              px.disc(g, p[0], p[1], 7, '#e97753');
              px.disc(g, p[0], p[1], 4, '#fbe0a1');
            }
          }
          const p = r.w(c.x, c.y + 16, base + 2),
            job = b.order.indexOf(c.id);
          E.font.text(
            g,
            c.id + (c.phase === 'stable' ? ' ✓' : job >= 0 ? ' · ' + (job + 1) : ' · guard'),
            p[0],
            p[1],
            c.phase === 'stable' ? '#b1f8c9' : c.id === b.order[b.job] ? '#ffdf83' : '#92bcac',
            { align: 'center', outline: false, scale: 1 },
          );
          if (c.id === b.order[b.job] && !b.done) {
            const q = r.w(c.x - 26, c.y - 18, base + 1);
            px.line(g, q[0], q[1], q[0] + 9, q[1], '#ffe291', 2);
            px.line(g, q[0], q[1], q[0], q[1] + 8, '#ffe291', 2);
          }
        });
      }
      // Spare tray and diagnostic socket share the same native coordinate system.
      r.queue(140, -23, 8, (g) => r.box(g, 5, -44, 5, 275, -10, 10, '#526666', '#263a41'), {
        bias: -10000,
      });
      b.stock.forEach((sp, i) => {
        const x = 35 + i * 60;
        const remaining =
          (sp.qty || 1) -
          b.components.filter((c) => c.spare === sp.id && ['placed', 'stable'].includes(c.phase))
            .length;
        r.shape('wired:' + sp.shape, x, -27, 11, {
          mats: { body: 'wired:' + sp.color },
          shadow: false,
          charView: false,
          alpha: remaining > 0 ? 1 : 0.25,
        });
        r.queue(x, -27, 25, (g) => {
          const p = r.w(x, -13, 14);
          E.font.text(
            g,
            sp.id +
              ' ' +
              (sp.shape === 'jumper' ? 'WIRE' : W.PALETTE.find((a) => a.id === sp.color)?.pattern) +
              ' x' +
              remaining,
            p[0],
            p[1],
            '#dde1c8',
            { align: 'center', outline: false },
          );
          if (b.held === sp.id) {
            px.line(g, p[0] - 16, p[1] + 10, p[0] + 16, p[1] + 10, '#ffe5a1', 2);
          }
        });
      });
      r.shape('wired:disc', 270, 144, 15, { mats: { body: 'wired:light' }, scale: 0.65 });
      r.queue(270, 145, 25, (g) => {
        const p = r.w(270, 161, 16);
        E.font.text(g, 'TEST', p[0], p[1], '#bee3cf', { align: 'center', outline: false });
      });
      if (focus) {
        const p = r.w(focus.x, focus.y, base + 6);
        r.overlay((g) => {
          const c = observer ? '#a9bdd0' : focus.legal === false ? '#f6a07b' : '#fff2b8',
            rad = focus.kind === 'terminal' ? 9 : 15;
          px.line(g, p[0] - rad, p[1] - rad, p[0] - rad + 6, p[1] - rad, c, 2);
          px.line(g, p[0] - rad, p[1] - rad, p[0] - rad, p[1] - rad + 6, c, 2);
          px.line(g, p[0] + rad, p[1] + rad, p[0] + rad - 6, p[1] + rad, c, 2);
          px.line(g, p[0] + rad, p[1] + rad, p[0] + rad, p[1] + rad - 6, c, 2);
        });
      }
      const tool = this.tool,
        name = ['cutters', 'pliers', 'iron', 'extinguisher'][toolIndex];
      r.shape('wired:' + name, tool.x + 9, tool.y + 18, tool.z - tool.pulse * 6, {
        facing: toolIndex === 2 ? -0.45 : 0.2,
        scale: 0.8,
        shadow: false,
        params: { closed: Math.round(tool.pulse * 4) / 4 },
      });
      if (b.held) {
        const sp = b.stock.find((s) => s.id === b.held);
        if (sp)
          r.shape('wired:' + sp.shape, tool.x, tool.y, tool.z + 3, {
            scale: 0.65,
            mats: { body: 'wired:' + sp.color },
            shadow: false,
          });
      }
      if (b.hold?.tool === 'solder') {
        const c = b.components.find((c) => c.id === b.hold.target);
        if (c) {
          const side = b.hold.terminal,
            p = r.w(c.x + c.anchors[side][0], c.y + c.anchors[side][1], base + 5);
          r.overlay((g) => {
            px.disc(g, p[0], p[1], 4, '#ffe5a1');
            px.dot(g, p[0] - 1, p[1] - 2, '#ffffff');
          });
        }
      }
      if (b.fire) {
        game.lights.add(140, 85, 20, 160, 1.2, { color: '#fca056' });
        r.queue(140, 85, 40, (g) => {
          for (let i = 0; i < 6; i++) {
            const x = 45 + i * 39,
              y = 50 + (i % 2) * 53,
              p = r.w(x, y, 20);
            const h = 10 + Math.sin(game.time * 8 + i) * 6;
            px.poly(
              g,
              [
                [p[0] - 8, p[1]],
                [p[0] - 3, p[1] - h],
                [p[0] + 1, p[1] - h - 8],
                [p[0] + 8, p[1]],
              ],
              '#ed8d42',
            );
            px.poly(
              g,
              [
                [p[0] - 4, p[1]],
                [p[0] + 1, p[1] - h + 1],
                [p[0] + 5, p[1]],
              ],
              '#ffe5a0',
            );
          }
        });
      }
      if (b.hold?.tool === 'foam')
        r.queue(140, 85, 50, (g) => {
          for (let i = 0; i < 18; i++) {
            const p = r.w(40 + ((i * 31) % 210), 36 + ((i * 23) % 110), 20);
            px.disc(g, p[0], p[1], 3 + (i % 3), '#d1e9dd');
          }
        });
      game.lights.add(40, 25, 70, 220, 0.75, { color: '#b5ebe0' });
      game.lights.add(260, 130, 45, 180, 0.5, { color: '#ffb675' });
    }
    stencil(g, cells, x, y, size = 9, selected = null) {
      px.rect(g, x - 4, y - 4, size * 4 + 6, size * 5 + 6, '#122d31');
      for (let i = 0; i < 20; i++) {
        const cx = x + (i % 4) * size,
          cy = y + Math.floor(i / 4) * size,
          v = cells[i];
        px.rect(
          g,
          cx,
          cy,
          size - 2,
          size - 2,
          v === 1 ? '#b6ffca' : v === 0 ? '#152529' : '#4c6666',
        );
        if (v === 0) {
          px.dot(g, cx + 1, cy + 1, '#9ea891');
          px.dot(g, cx + size - 4, cy + size - 4, '#9ea891');
        }
        if (v === -1) px.dot(g, cx + (size >> 1) - 1, cy + (size >> 1) - 1, '#7c9390');
        if (selected?.includes(i)) {
          px.line(g, cx, cy, cx + size - 3, cy, '#e2b765');
        }
      }
    }
    evidence(r, s, selected = 0, reference = false, dial = null) {
      const portrait = r.H > r.W,
        left = portrait ? Math.round(r.W * 0.07) : Math.round(r.W * 0.53),
        area = portrait ? r.W - left * 2 : r.W - left - 28;
      const cell = reference
        ? Math.max(6, Math.min(portrait ? 16 : 9, Math.floor(area / 28)))
        : Math.max(8, Math.min(portrait ? 24 : 15, Math.floor(area / (s.evidence.length * 5))));
      const top = portrait ? Math.round(r.H * 0.2) : 94;
      r.sky(['#152c34', '#1d3e40', '#18363c']);
      r.overlay((g) => {
        if (reference) {
          for (let d = 0; d < 10; d++) {
            const x = left + (d % 5) * Math.floor(area / 5),
              y = top + Math.floor(d / 5) * (cell * 5 + 35);
            this.stencil(g, W.GLYPHS[d], x, y, cell);
            E.font.text(g, String(d), x + cell * 2, y + cell * 5 + 8, '#f0da9b', {
              align: 'center',
              scale: 2,
              outline: false,
            });
          }
          return;
        }
        E.font.text(g, dial ? 'TRANSMISSION PREVIEW' : 'CODE EVIDENCE', left, top - 37, '#e3c582', {
          outline: false,
          scale: portrait ? 2 : 1,
        });
        const gap = area / s.evidence.length;
        for (let d = 0; d < s.evidence.length; d++) {
          const x = left + d * gap + Math.max(0, (gap - cell * 4) / 2),
            y = top;
          this.stencil(g, dial ? W.GLYPHS[dial[d]] : s.evidence[d], x, y, cell);
          E.font.text(
            g,
            dial ? String(dial[d]) : 'DIGIT ' + (d + 1),
            x + cell * 2,
            y + cell * 5 + 16,
            '#e2d8b1',
            { align: 'center', scale: dial ? 3 : portrait ? 2 : 1, outline: false },
          );
          if (!dial) {
            const b = s.boards[selected];
            if (b?.digit === d) this.stencil(g, s.evidence[d], x, y, cell, b.mask);
            if (this.g.settings.candidates)
              E.font.text(
                g,
                W.candidates(s.evidence[d]).join(' '),
                x + cell * 2,
                y + cell * 5 + 42,
                '#b9d5c5',
                { align: 'center', outline: false },
              );
          }
        }
        const y = portrait ? top + cell * 5 + 65 : 280;
        px.rect(g, left, y, 7, 7, '#b6ffca');
        E.font.text(g, 'LIT', left + 12, y, '#c6d5be', { outline: false });
        px.rect(g, left + 58, y, 7, 7, '#152529');
        px.dot(g, left + 59, y + 1, '#9ea891');
        E.font.text(g, 'DARK', left + 70, y, '#c6d5be', { outline: false });
        px.rect(g, left + 128, y, 7, 7, '#4c6666');
        E.font.text(g, 'UNKNOWN', left + 140, y, '#c6d5be', { outline: false });
      });
    }
  };
})();
