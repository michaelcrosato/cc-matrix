(function (root) {
  'use strict';
  const I = root.IW,
    E = root.My3D2dge,
    { px } = E;
  E.MATERIALS.wardBrass = { color: '#bc904c', pattern: 'metal', rivet: 4 };
  E.MATERIALS.wardDark = { color: '#34243e', pattern: 'stones', size: 5 };
  E.MATERIALS.wardGlow = { color: '#f8da8c', pattern: 'glaze', glow: 1 };
  E.MATERIALS.wardTeal = { color: '#75e1d5', pattern: 'glaze', glow: 0.8 };
  E.SHAPES.wardBell = {
    about: 'Original brass alarm bell, flared lip, fork and swinging clapper',
    tags: 'incurable resonator',
    mats: { b: 'wardBrass', d: 'iron', g: 'wardGlow' },
    parts: [
      ['cyl', 'd', [0, 0, 0], 5, 2, { seg: 8 }],
      ['mirror', 'x', ['box', 'b', [4, 0, 2], [1.5, 2, 16]]],
      ['box', 'b', [0, 0, 18], [10, 3, 2]],
      [
        'lathe',
        'b',
        [0, 0, 6],
        [
          [0, 0],
          [5, 0],
          [5.5, 1],
          [3, 4],
          [2, 8],
          [0, 9],
        ],
        { seg: 10 },
      ],
      ['ball', 'g', [0, 0, 6], 1.5],
      ['cyl', 'g', [0, 0, 19], 1.5, 1],
    ],
  };
  E.SHAPES.wardPortal = {
    about:
      'Original paired menagerie gate with brass teeth and prismatic crown',
    tags: 'incurable portal',
    mats: { b: 'wardBrass', d: 'wardDark', g: 'wardTeal' },
    parts: [
      ['box', 'd', [0, 0, 0], [14, 6, 2]],
      ['mirror', 'x', ['box', 'd', [6, 0, 2], [3, 4, 22]]],
      ['mirror', 'x', ['box', 'b', [6, -2, 4], [1, 1, 18]]],
      ['box', 'b', [0, 0, 24], [16, 5, 2]],
      [
        'prism',
        'g',
        [0, 0, 26],
        [
          [-5, 0],
          [0, 6],
          [5, 0],
        ],
        3,
        { axis: 'y' },
      ],
      ['mirror', 'x', ['cyl', 'b', [6, 0, 24], 2, 5, { r2: 0, seg: 4 }]],
    ],
  };
  E.Humanoid.weapon('lanternrifle', {
    length: 10,
    rest: [0.85, 0, -0.4],
    blade: false,
    draw(w) {
      const a = w.hand,
        b = w.at(10),
        c = w.at(6),
        u = w.u;
      w.push(a[2] + 0.1, () => {
        px.line(w.g, a[0], a[1], b[0], b[1], '#342838', Math.max(2, u * 3));
        px.line(w.g, a[0], a[1] - 1, b[0], b[1] - 1, '#e2b76f', Math.max(1, u));
        px.disc(w.g, c[0], c[1], Math.max(1, u * 2), '#765c3e');
        px.disc(
          w.g,
          c[0] - 0.5,
          c[1] - 0.5,
          Math.max(1, u * 1.3),
          w.rig.armed ? '#fff0a3' : '#4a5761',
        );
        px.dot(w.g, b[0], b[1], w.rig.armed ? '#fff6c2' : '#686578');
      });
    },
  });
  I.makeWarden = (seat) =>
    new E.Humanoid({
      size: 0.64,
      build: seat % 2 ? 'heroic' : 'chibi',
      outfit: 'coat',
      hair: seat % 2 ? 'ponytail' : 'short',
      hat: seat % 2 ? 'helmet' : 'cap',
      armor: true,
      sleeves: 'long',
      weapon: 'lanternrifle',
      cape: { len: 5, width: 5, seg: 2 },
      colors: {
        skin: '#d4bda4',
        hair: '#453a51',
        cloth: seat % 2 ? '#527a9d' : '#b9814f',
        coat: seat % 2 ? '#527a9d' : '#b9814f',
        pants: '#34334c',
        boot: '#272436',
        trim: seat % 2 ? '#b7eced' : '#f5d893',
        metal: '#bd945c',
        plate: '#5e5967',
        cape: seat % 2 ? '#33516d' : '#704252',
        capeIn: '#221d34',
        eye: '#f7eed5',
      },
    });
  I.makeWizard = (size) =>
    new E.Humanoid({
      size: size || 0.95,
      build: 'heroic',
      outfit: 'robe',
      hair: 'long',
      hat: { style: 'pointed', color: '#795c9a' },
      weapon: 'staff',
      sleeves: 'long',
      cape: { len: 9, width: 8, seg: 2 },
      eyeGlow: true,
      colors: {
        skin: '#b3ccbd',
        hair: '#e3dac4',
        cloth: '#705683',
        pants: '#392747',
        boot: '#32283b',
        trim: '#edb96d',
        metal: '#cfad6d',
        eye: '#f7d48a',
        cape: '#4a365d',
        capeIn: '#291f3d',
      },
    });
  I.makeHunter = (kind) => {
    const specs = {
      hopper: { R: 5.1, horns: true, feet: true, tail: true, mouth: true },
      stalker: { R: 5.8, mouth: 'fangs', ears: 'cat', feet: true },
      skitter: {
        R: 3.9,
        horns: true,
        tail: true,
        mouth: 'fangs',
        wings: false,
      },
      familiar: { R: 5, wings: true, mouth: 'fangs', ears: 'cat', tail: true },
    };
    const color = I.FAMILIES[kind]?.color || '#b3a0ed',
      t = E.tones(color);
    return new E.Blob({
      ...specs[kind],
      colors: {
        dk: t.deep,
        base: t.base,
        lt: t.lt,
        spec: t.hi,
        eye: '#fff2c8',
        pupil: '#292538',
      },
    });
  };
  class Stage {
    constructor(game) {
      this.game = game;
      this.map = null;
      this.room = -1;
      this.rigs = new Map();
      this.wizard = I.makeWizard();
      this.seenEvent = 0;
      this.pulses = [];
      this.titleWizard = I.makeWizard(2.65);
      this.titleWarden = I.makeWarden(0);
      this.titleWarden2 = I.makeWarden(1);
    }
    layout() {
      const g = this.game,
        wide = g.W / g.H > 1.35;
      const area = wide
        ? { x: 12, y: 42, w: g.W - 162, h: g.H - 86 }
        : {
            x: 10,
            y: 72,
            w: g.W - 20,
            h: Math.min(g.H - 230, (g.W - 20) * 0.62),
          };
      const z = Math.max(
        0.5,
        Math.min(1.08, area.w / (336 * 1.5), area.h / (208 * 1.48)),
      );
      g.setZoom(z);
      g.cam.smooth = 0;
      g.cam.bounds = null;
      g.cam.offset = [
        area.x + area.w / 2 - g.W / 2,
        area.y + area.h / 2 - g.H / 2,
      ];
      g.focus(168, 104, 0);
      this.area = area;
      this.radar = wide
        ? { x: g.W - 140, y: 76, w: 120, h: 74 }
        : { x: g.W / 2 - 85, y: area.y + area.h + 28, w: 170, h: 100 };
      return area;
    }
    build(room) {
      this.room = room.id;
      this.map = new E.TileMap({
        rows: room.rows,
        legend: { '#': 1, B: 'bell', P: 'portal' },
        types: {
          1: {
            h: 7,
            top: room.wall,
            side: E.shade(room.wall, -0.28),
            face: 'stone',
            roof: 'slab',
            line: '#2b2336',
          },
        },
        outside: false,
        ao: 2,
        floorTex: (x, y) =>
          E.tex.flagstone(x, y, {
            stones: [room.floor, E.shade(room.floor, 0.045)].map(E.hex),
            mortar: E.hex(E.shade(room.floor, -0.3)),
            hi: E.hex(E.shade(room.floor, 0.1)),
            lo: E.hex(E.shade(room.floor, -0.06)),
            speck: E.hex(E.shade(room.floor, 0.015)),
          }),
      });
    }
    update(w, dt) {
      if (!w) return;
      if (this.room !== w.roomIndex) this.build(w.room);
      for (const p of w.players) {
        let rig = this.rigs.get(p.id);
        if (!rig) {
          rig = I.makeWarden(p.seat);
          this.rigs.set(p.id, rig);
        }
        rig.armed = !p.bolt;
        rig.update(dt, {
          x: I.world(p.m.x),
          y: I.world(p.m.y),
          z: 0,
          vx: p.m.moving ? p.m.dir[0] * 40 : 0,
          vy: p.m.moving ? p.m.dir[1] * 40 : 0,
          facing: (p.aim * Math.PI) / 2,
          point: true,
          hurt: !p.alive,
          pose: w.status === 'victory' ? 'cheer' : !p.alive ? 'die' : undefined,
          expr: w.status === 'victory' ? 'smile' : undefined,
        });
      }
      for (const e of [...w.enemies, ...(w.familiar ? [w.familiar] : [])]) {
        let rig = this.rigs.get(e.id);
        if (!rig) {
          rig = I.makeHunter(e.kind);
          this.rigs.set(e.id, rig);
        }
        rig.update(dt, {
          walk: e.m.moving ? 1 : 0,
          flap: e.kind === 'familiar' ? 1 : 0,
          squash:
            e.state === 'anticipate'
              ? -0.2
              : e.kind === 'hopper'
                ? Math.sin(e.age * 10) * 0.08
                : 0,
          look: e.m.dir,
          squint: e.state === 'pursue',
        });
      }
      if (w.wizard) {
        const z = w.wizard;
        this.wizard.update(dt, {
          x: I.world(z.x),
          y: I.world(z.y),
          facing: Math.PI / 2,
          pose: z.state === 'banished' ? 'die' : 'cast',
          expr: 'angry',
          attack: E.move('cast', (w.phaseTime % 1.6) / 1.6),
        });
      }
      for (const e of w.events) {
        if (e.id <= this.seenEvent) continue;
        this.seenEvent = e.id;
        if (e.type === 'fire') this.rigs.get(e.owner)?.kick(0.2);
        if (e.type === 'hurt') this.rigs.get(e.owner)?.kick(0.4);
        if (e.type === 'banish' && !this.game.reduceMotion) this.game.shake(4);
        if (
          ['kill', 'catch', 'banish', 'bell', 'hurt', 'portal'].includes(
            e.type,
          ) &&
          e.x !== undefined
        )
          this.pulses.push({ ...e, t: 0 });
      }
      this.pulses = this.pulses.filter((p) => (p.t += dt) < 1.2);
      if (this.rigs.size > 180) this.rigs.clear();
    }
    drawTitle(r, t) {
      r.sky(['#100e21', '#22182f', '#171426']);
      r.overlay((g) => {
        for (let i = 0; i < 100; i++) {
          const x = (i * 67 + 11) % r.W,
            y = (i * 79 + 9) % r.H,
            blink = 0.3 + 0.7 * Math.sin(t * 0.8 + i);
          px.dot(g, x, y, blink > 0.75 ? '#89738d' : '#3b304d');
        }
        const cx = r.W * 0.74,
          cy = r.H * 0.67;
        for (let i = 7; i > 0; i--)
          px.ell(
            g,
            cx,
            cy,
            38 + i * 11,
            8 + i * 3,
            [
              '#1b162a',
              '#211b30',
              '#282036',
              '#33243e',
              '#3e2b48',
              '#563751',
              '#794b64',
            ][7 - i],
          );
        for (let j = 0; j < 12; j++) {
          const a = (j * Math.PI) / 6 + t * 0.05;
          px.line(
            g,
            cx + Math.cos(a) * 101,
            cy + Math.sin(a) * 31,
            cx + Math.cos(a) * 109,
            cy + Math.sin(a) * 34,
            '#bd8c62',
            2,
          );
        }
      });
      const x = 220,
        y = 110;
      r.actor(x, y, 0, (g, ox, oy) => {
        this.titleWizard.draw(g, ox, oy, r.view);
      });
      // Native mural framed beside the shell's title actions.
      r.overlay((g) => {
        const x = r.W * 0.74,
          y = r.H * 0.33;
        E.font.title(g, 'WANTED', x, y - 53, {
          scale: 1,
          colors: ['#d5b27a', '#947d68'],
          align: 'center',
        });
        E.font.text(g, 'ALIVE. AGAIN.', x, r.H * 0.88, '#a995aa', {
          align: 'center',
          outline: false,
        });
      });
      this.game.lights.enabled = true;
      this.game.lights.ambient = 0.65;
      this.game.lights.add(x, y, 20, 100, 0.6, { color: '#bf7c92' });
    }
    draw(r, w, opts = {}) {
      if (!w) return this.drawTitle(r, this.game.time);
      if (this.room !== w.roomIndex) this.build(w.room);
      r.sky(['#100f1b', '#161323', '#100f1b']);
      const room = w.room,
        win = w.status === 'victory';
      this.game.lights.enabled = true;
      this.game.lights.ambient = win ? 0.88 : 0.67;
      this.map.drawFloor(r);
      this.map.queueWalls(r);
      r.decal((g) => {
        for (let y = 1; y < 12; y++)
          for (let x = 1; x < 20; x++) {
            if (!w.walk(x, y)) continue;
            if ((x + y * 3) % 13 === 0) {
              const [sx, sy] = r.w(I.world(x), I.world(y), 0.1);
              px.line(g, sx - 2, sy, sx + 2, sy, win ? '#5b8d84' : '#58435f');
              px.dot(g, sx, sy - 2, win ? '#8ec6a0' : '#947256');
            }
          }
      });
      for (const x of [0, 20]) {
        r.shape('wardPortal', I.world(x), I.world(6), 0, {
          scale: 0.68,
          facing: x === 0 ? Math.PI / 2 : -Math.PI / 2,
          hides: false,
          shadow: false,
        });
        r.queue(
          I.world(x),
          I.world(6),
          3,
          (g) => {
            const [sx, sy] = r.w(I.world(x), I.world(6), 3);
            px.blend(g, 0.6, 'add', () => {
              px.ell(
                g,
                sx,
                sy - 6,
                3 + Math.sin(w.elapsed * 3),
                8,
                win ? '#b4e5c0' : '#72b4b8',
              );
            });
          },
          { emissive: true },
        );
        this.game.lights.add(I.world(x), I.world(6), 8, 32, 0.6, {
          color: win ? '#b6e1ae' : '#7abfd0',
        });
      }
      for (const p of w.posts) {
        r.shape('wardBell', I.world(p.x), I.world(p.y), 0, {
          scale: 0.65,
          facing: Math.sin(p.ring * 40) * p.ring * 0.08,
          hides: false,
        });
        if (p.ring > 0)
          r.decal((g) => {
            const a = r.groundPts(
              I.world(p.x),
              I.world(p.y),
              w.tuning.bellRevealRadius * 16,
              32,
              0,
            );
            px.polyDither(g, a, '#ecc886', 0.08 + p.ring * 0.05, r.ix, r.iy);
          });
        r.queue(
          I.world(p.x),
          I.world(p.y),
          15,
          (g) => {
            const [x, y] = r.w(I.world(p.x), I.world(p.y), 15);
            px.disc(g, x, y, 1.5, p.cool > 0 ? '#645c63' : '#ffdd83');
            if (p.cool > 0)
              px.rect(
                g,
                x - 4,
                y + 2,
                8 * (1 - p.cool / w.tuning.bellCooldown),
                1,
                '#d2b772',
              );
          },
          { emissive: true },
        );
      }
      for (const [x, y] of [
        [1, 1],
        [19, 1],
        [1, 11],
        [19, 11],
      ]) {
        r.prop('candle', I.world(x) - 5, I.world(y) - 6, 0, {
          size: 0.6,
          light: true,
        });
      }
      if (opts.grid)
        r.decal((g) => {
          for (const p of w.players.filter((p) => p.alive))
            for (const e of w.enemies.filter(
              (e) => w.visible(e) && w.los(p, e),
            )) {
              const a = r.w(I.world(p.m.x), I.world(p.m.y), 1),
                b = r.w(I.world(e.m.x), I.world(e.m.y), 1);
              px.line(g, ...a, ...b, '#75bd8e');
            }
          for (let x = 0; x <= 21; x++) {
            const a = r.w(x * 16, 0, 0),
              b = r.w(x * 16, 208, 0);
            px.line(g, ...a, ...b, '#5e5367');
          }
          for (let y = 0; y <= 13; y++) {
            const a = r.w(0, y * 16, 0),
              b = r.w(336, y * 16, 0);
            px.line(g, ...a, ...b, '#5e5367');
          }
        });
      for (const e of w.enemies) {
        const x = I.world(e.m.x),
          y = I.world(e.m.y);
        if (e.warning > 0) {
          r.decal((g) => {
            const [sx, sy] = r.w(x, y, 0),
              rad = 4 + Math.sin(w.elapsed * 12);
            px.ell(g, sx, sy, rad, rad * 0.5, '#da9971');
            px.line(g, sx - 4, sy, sx + 4, sy, '#f0c7a0');
          });
          continue;
        }
        if (!w.visible(e)) continue;
        const rig = this.rigs.get(e.id);
        r.shadow(x, y, 4, 0.25);
        r.actor(
          x,
          y,
          e.kind === 'hopper' ? Math.max(0, Math.sin(e.age * 9)) * 2 : 0,
          (g, ox, oy) => {
            rig?.draw(g, ox, oy, r.view);
            if (e.kind === 'skitter') {
              px.line(g, ox - 6, oy - 2, ox - 10, oy - 5, '#f3acb6');
              px.line(g, ox + 6, oy - 2, ox + 10, oy - 5, '#f3acb6');
            }
            if (e.lure > 0) px.dot(g, ox, oy - 14, '#ffe0a1');
          },
        );
      }
      if (w.familiar) {
        const f = w.familiar,
          rig = this.rigs.get(f.id);
        r.shadow(I.world(f.m.x), I.world(f.m.y), 4, 0.2);
        r.actor(
          I.world(f.m.x),
          I.world(f.m.y),
          7 + Math.sin(w.elapsed * 9),
          (g, x, y) => rig?.draw(g, x, y, r.view),
        );
      }
      if (w.wizard) {
        const z = w.wizard,
          x = I.world(z.x),
          y = I.world(z.y);
        if (z.state === 'warning') {
          r.decal((g) => {
            const [sx, sy] = r.w(x, y, 0);
            const rad = 8 + Math.sin(w.elapsed * 16) * 1.5;
            const pts = Array.from({ length: 6 }, (_, i) => [
              sx + Math.cos((i * Math.PI) / 3) * rad,
              sy + Math.sin((i * Math.PI) / 3) * rad * 0.6,
            ]);
            for (let i = 0; i < 6; i++)
              px.line(g, ...pts[i], ...pts[(i + 2) % 6], '#f38fa5');
          });
        } else if (z.state !== 'waiting') {
          r.shadow(x, y, 7, 0.35);
          r.actor(x, y, 1, (g, ox, oy) => this.wizard.draw(g, ox, oy, r.view), {
            alpha: z.state === 'banished' ? Math.max(0, z.t / 1.5) : 1,
          });
          if (z.state === 'active')
            this.game.lights.add(x, y, 20, 38, 0.55, { color: '#d870ac' });
        }
      }
      for (const p of w.players) {
        const x = I.world(p.m.x),
          y = I.world(p.m.y),
          rig = this.rigs.get(p.id);
        if (!p.alive && p.respawn <= 0) continue;
        r.shadow(x, y, 4, 0.4);
        r.actor(x, y, 0, (g, ox, oy) => rig?.draw(g, ox, oy, r.view), {
          alpha: p.protect > 0 ? 0.7 + Math.sin(w.elapsed * 16) * 0.2 : 1,
        });
        this.game.lights.add(x, y, 10, 26, 0.35, {
          color: p.seat % 2 ? '#97c9d2' : '#f1bd7d',
        });
        if (p.alive)
          r.decal((g) => {
            const d = I.DIRS[p.aim],
              a = r.w(x + d[0] * 8, y + d[1] * 8, 1),
              b = r.w(x + d[0] * 12, y + d[1] * 12, 1);
            px.line(
              g,
              ...a,
              ...b,
              p.bolt ? '#756776' : p.seat % 2 ? '#b6e8f1' : '#fbe0a1',
              2,
            );
            const [sx, sy] = r.w(x, y, 0);
            px.line(
              g,
              sx - 4,
              sy + 4,
              sx + 4,
              sy + 4,
              p.seat % 2 ? '#8fceda' : '#eac384',
            );
          });
      }
      w.pool.draw(r);
      for (const p of this.pulses) {
        r.queue(
          p.x,
          p.y,
          4,
          (g) => {
            const [x, y] = r.w(p.x, p.y, 4),
              c =
                p.type === 'hurt'
                  ? '#eb8b8e'
                  : p.type === 'banish'
                    ? '#e8b0f5'
                    : '#f0ce87',
              n = p.type === 'banish' ? 24 : 10;
            for (let i = 0; i < n; i++) {
              const a = (i * 6.283) / n + Math.sin(i) * 0.3,
                rad = p.t * (p.type === 'banish' ? 80 : 30),
                fade = 1 - p.t / 1.2;
              px.line(
                g,
                x + Math.cos(a) * rad,
                y + Math.sin(a) * rad * 0.7,
                x + Math.cos(a) * (rad + 3 * fade),
                y + Math.sin(a) * (rad + 3 * fade) * 0.7,
                c,
                fade > 0.5 ? 2 : 1,
              );
            }
          },
          { emissive: true },
        );
      }
      this.hud(r, w, opts);
    }
    hud(r, w, opts) {
      const room = w.room,
        rad = this.radar || { x: 500, y: 74, w: 120, h: 74 },
        wide = r.W / r.H > 1.35;
      r.overlay((g) => {
        const cue = I.app?.controls.tapCue;
        if (cue && cue.until > this.game.real) {
          const [x, y] = r.w(cue.x, cue.y, 15);
          E.font.text(g, cue.label, x, y - 9, '#ffe4a5', {
            align: 'center',
            outline: false,
            shadow: '#151020',
          });
        }
        E.font.text(g, 'THE INCURABLE WIZARD', 14, 12, '#a18ca9', {
          outline: false,
        });
        E.font.text(
          g,
          String(w.score).padStart(7, '0'),
          r.W - 158,
          11,
          '#f9dc9d',
          { scale: 2, outline: false, shadow: '#100d18' },
        );
        E.font.text(
          g,
          `${w.roomIndex + 1} / 6  ${room.name.toUpperCase()}`,
          14,
          28,
          '#f1ddbe',
          { outline: false },
        );
        E.ui.box(g, rad.x - 6, rad.y - 22, rad.w + 12, rad.h + 35, {
          bg: this.game.settings.contrast ? '#101b28' : '#242333',
          border: this.game.settings.contrast ? '#9db6c4' : '#6b6773',
          alpha: 0.96,
        });
        E.font.text(g, 'ECHO RADAR', rad.x, rad.y - 16, '#9bcac6', {
          outline: false,
        });
        for (let j = 1; j < 4; j++)
          px.line(
            g,
            rad.x,
            rad.y + (rad.h * j) / 4,
            rad.x + rad.w,
            rad.y + (rad.h * j) / 4,
            '#273944',
          );
        const sweep = ((w.elapsed * 0.3) % 1) * rad.w;
        px.rect(g, rad.x + sweep, rad.y, 1, rad.h, '#43726e');
        const radar = w.radar(),
          at = (x, y) => [rad.x + (x / 20) * rad.w, rad.y + (y / 12) * rad.h];
        for (const e of radar.hunters) {
          const [x, y] = at(e.x, e.y),
            c = I.FAMILIES[e.kind].color;
          if (e.kind === 'hopper') px.disc(g, x, y, 1.5, c);
          else if (e.kind === 'stalker')
            px.poly(
              g,
              [
                [x, y - 2],
                [x + 2, y],
                [x, y + 2],
                [x - 2, y],
              ],
              c,
            );
          else {
            const n = 2 + Math.sin(w.elapsed * 10) * 0.6;
            px.line(g, x - n, y - n, x + n, y + n, c);
            px.line(g, x + n, y - n, x - n, y + n, c);
          }
        }
        for (const p of radar.players) {
          const [x, y] = at(p.x, p.y);
          px.rect(g, x - 2, y - 2, 4, 4, p.seat % 2 ? '#a6dcf4' : '#ffe0a6');
          px.dot(g, x, y, '#172532');
        }
        const x = wide ? rad.x - 4 : 14,
          y = wide ? rad.y + rad.h + 30 : r.H - 96;
        E.font.text(
          g,
          w.status === 'victory' ? 'DISCHARGED!' : w.phase.toUpperCase(),
          x,
          y,
          w.phase === 'Intrusion' ? '#f299b4' : '#d6c5d7',
          { outline: false },
        );
        E.font.text(
          g,
          `NOW ${w.currentMultiplier}x   NEXT ${w.earnedNextMultiplier}x`,
          x,
          y + 17,
          '#edd09c',
          { outline: false },
        );
        if (w.phase === 'Hunt') {
          const n = w.enemies.length + w.queue.filter((s) => !s.done).length;
          E.font.text(g, `${n} HUNTERS LEFT`, x, y + 34, '#a996b5', {
            outline: false,
          });
          if (w.roomTime > 35) {
            E.font.text(g, 'PRESSURE RISING', x, y + 51, '#ad869d', {
              outline: false,
            });
            for (let j = 0; j < 6; j++)
              px.rect(
                g,
                x + j * 16,
                y + 64,
                12,
                2,
                j < Math.min(6, w.roomTime / 15) ? '#bf8e92' : '#3c3245',
              );
          }
        }
        if (w.phase === 'Familiar')
          E.font.text(
            g,
            w.familiar?.exit === 0 ? 'COVER LEFT GATE' : 'COVER RIGHT GATE',
            x,
            y + 34,
            '#e0b4ed',
            { outline: false },
          );
        if (w.phase === 'Intrusion')
          E.font.text(
            g,
            `BOAST ${w.manifest + 1} / ${room.intrusions}`,
            x,
            y + 34,
            '#dba1be',
            { outline: false },
          );
        const ly = wide ? r.H - 42 : r.H - 62;
        for (let i = 0; i < w.players.length; i++) {
          const p = w.players[i],
            lx = 14 + i * 200,
            c = p.seat % 2 ? '#9ed6f0' : '#edcd93';
          E.font.text(g, `P${i + 1}`, lx, ly, c, { outline: false });
          for (let j = 0; j < Math.max(p.lives, 1); j++)
            E.font.text(
              g,
              p.lives <= 0 ? 'x' : '♥',
              lx + 23 + j * 11,
              ly,
              p.lives <= 0 ? '#6b5e75' : c,
              { outline: false },
            );
          E.font.text(
            g,
            p.alive ? (p.bolt ? 'BOLT AWAY' : 'RIFLE READY') : 'WATCHING',
            lx,
            ly + 14,
            p.bolt ? '#9c8ba4' : c,
            { outline: false },
          );
        }
        const prompt = opts.demo
          ? 'DEMONSTRATION - ANY INPUT RETURNS'
          : w.practice
            ? 'PRACTICE - records disabled'
            : this.game.input.lastDevice === 'touch'
              ? 'Left thumb moves  •  Right thumb aims & fires'
              : this.game.input.lastDevice === 'gamepad'
                ? `${this.game.input.label('fire')} Fire  •  Options Pause`
                : 'WASD Move  •  Mouse / arrows Aim  •  Space Fire';
        E.font.text(g, prompt, r.W / 2, r.H - 10, '#9b8ea5', {
          outline: false,
          align: 'center',
        });
        let notice = '';
        if (w.roomIndex === 0 && w.phase === 'Hunt' && w.players[0].travel < 2)
          notice =
            this.game.input.lastDevice === 'touch'
              ? 'LEFT THUMB: MOVE INTO A LANE.'
              : this.game.input.lastDevice === 'gamepad'
                ? 'LEFT STICK: MOVE INTO A LANE.'
                : 'WASD: MOVE INTO A LANE.';
        else if (
          w.roomIndex === 0 &&
          w.phase === 'Hunt' &&
          w.players[0].shots === 0
        )
          notice =
            this.game.input.lastDevice === 'touch'
              ? 'RIGHT THUMB: AIM AND FIRE.'
              : this.game.input.lastDevice === 'gamepad'
                ? 'RIGHT STICK AIMS. R2 COMMITS YOUR BOLT.'
                : 'MOUSE / ARROWS AIM. SPACE COMMITS YOUR BOLT.';
        else if (w.phase === 'Entry') notice = room.lesson;
        else if (w.phase === 'Clear')
          notice =
            w.roomIndex === 5
              ? `THE CURE IS VIOLENCE. EXIT BOUNTY ${5000 * w.earnedNextMultiplier}`
              : `DESCENDING - NEXT CHAMBER ${w.earnedNextMultiplier}x POINTS`;
        else if (w.phase === 'Familiar' && w.phaseTime < 3)
          notice = room.bounty
            ? '5,000 EXIT BOUNTY - CATCH THE FAMILIAR!'
            : 'THE FAMILIAR FLEES! COVER ITS GATE.';
        else if (w.phase === 'Intrusion' && w.phaseTime < 2)
          notice = 'AN UNWELCOME CONSULTATION. WATCH FOR THE RUNE.';
        if (notice) {
          const lines = E.font.wrap(notice, Math.min(r.W - 40, 470), {});
          const yy = this.area ? this.area.y + this.area.h - 16 : 280;
          E.ui.box(
            g,
            12,
            yy - 6,
            Math.min(r.W - 24, 478),
            lines.length * 11 + 12,
            { bg: '#201b2b', border: '#806b79', alpha: 0.9 },
          );
          lines.forEach((s, i) =>
            E.font.text(g, s, 22, yy + i * 11, '#f5dfb5', { outline: false }),
          );
        }
        if (opts.grid)
          E.font.text(
            g,
            `seed ${w.config.seed} / tick ${w.tick} / budget ${w.queue.filter((s) => !s.done).length}`,
            14,
            44,
            '#82d3b7',
            { outline: false },
          );
      });
    }
  }
  I.Stage = Stage;
})(globalThis);
