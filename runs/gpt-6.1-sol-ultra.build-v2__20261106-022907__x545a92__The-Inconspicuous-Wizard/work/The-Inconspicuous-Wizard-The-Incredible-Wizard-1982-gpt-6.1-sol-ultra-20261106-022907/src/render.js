/* Original menagerie puppets and dungeon craft, rendered with my-3D2dge's native
 * shaded shapes, Humanoid/Blob rigs and depth-sorted render queue. Tile = 16 units. */
(() => {
  'use strict';
  const E = My3D2dge,
    { px } = E,
    TAU = Math.PI * 2;
  const C = {
    ink: '#0b1019',
    gold: '#d9b775',
    cream: '#f5e8c5',
    cyan: '#8ce4db',
    violet: '#bb95e7',
    red: '#ef867a',
  };
  const DIR = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ],
    W = (x) => (x + 0.5) * 16;
  const phase = (id) => {
    let n = 0;
    for (const c of String(id)) n = (n * 31 + c.charCodeAt(0)) % 997;
    return n * 0.173;
  };
  const mat = (color, pattern = 'none', extra = {}) => ({
    color,
    pattern,
    ...extra,
  });
  Object.assign(E.MATERIALS, {
    iwGold: mat('#b79555', 'metal'),
    iwGoldHi: mat('#ecd19b', 'metal'),
    iwIron: mat('#36404b', 'metal'),
    iwOnyx: mat('#192033', 'stones', { size: 4 }),
    iwLantern: mat('#c5ffdd', 'glaze', { glow: 1 }),
    iwEmber: mat('#ffd17b', 'glaze', { glow: 1 }),
    iwViolet: mat('#8b68b8', 'cloth'),
    iwBellOff: mat('#68666b', 'metal'),
    iwBone: mat('#ece0b6', 'glaze'),
    iwCloak: mat('#244e58', 'cloth'),
    iwChitin: mat('#b95065', 'glaze'),
    iwGlass: mat('#5cadb0', 'glaze', { glow: 0.5 }),
  });
  const shapes = {
    'iw-post': {
      about:
        'Original bronze singing-bell resonator, twin tusk brackets and crystal clapper',
      tags: 'wizard bell resonator',
      mats: { g: 'iwGold', h: 'iwGoldHi', i: 'iwIron', c: 'iwLantern' },
      parts: [
        ['cyl', 'i', [0, 0, 0], 5.8, 2, { seg: 8 }],
        ['cyl', 'g', [0, 0, 2], 4.6, 1, { seg: 8 }],
        ['mirror', 'x', ['box', 'g', [4, 0, 3], [1.5, 2, 12]]],
        ['box', 'h', [0, 0, 15], [10, 2, 1.6]],
        ['cyl', 'g', [0, 0, 5], 4.2, 4, { r2: 2.6, seg: 8 }],
        ['cyl', 'h', [0, 0, 4.5], 4.7, 1],
        ['cyl', 'g', [0, 0, 9], 2.6, 3, { r2: 1.6 }],
        ['ball', 'c', [0, 0, 5], 1.7],
        ['box', 'i', [0, 0, 12], [0.8, 0.8, 3]],
      ],
    },
    'iw-post-off': {
      about: 'Resonator recharging, dark crystal clapper',
      tags: 'wizard bell cooldown',
      mats: { g: 'iwBellOff', h: 'iwGold', i: 'iwIron', c: 'iwBellOff' },
      parts: [],
    },
    'iw-pillar': {
      about:
        'Original low brass-capped dungeon pier, cut away to preserve sight lines',
      tags: 'wizard architecture',
      mats: { s: 'iwOnyx', b: 'iwGold', h: 'iwGoldHi' },
      parts: [
        ['box', 's', [0, 0, 0], [14, 14, 3]],
        ['box', 'b', [0, 0, 3], [12, 12, 1]],
        ['box', 's', [0, 0, 4], [10, 10, 8]],
        ['box', 'b', [0, 0, 12], [13, 13, 1.2]],
        ['box', 's', [0, 0, 13.2], [12, 12, 2]],
        ['box', 'h', [0, 0, 15.2], [7, 7, 0.8]],
      ],
    },
    'iw-gate': {
      about: 'Original paired lane-portal pylons and runic metal bridge',
      tags: 'wizard portal gate',
      mats: { s: 'iwOnyx', b: 'iwGold', g: 'iwGlass' },
      parts: [
        ['mirror', 'x', ['box', 's', [7, 0, 0], [3, 7, 15]]],
        ['mirror', 'x', ['box', 'b', [7, 0, 3], [3.4, 7.4, 1]]],
        ['mirror', 'x', ['ball', 'g', [7, 0, 15], 1.7]],
        ['box', 's', [0, 0, 16], [17, 7, 2]],
        ['box', 'b', [0, 0, 18], [19, 7.5, 1.5]],
      ],
    },
    'iw-jaw': {
      about: 'Original broad hinged bronze-toothed hunter jaw',
      tags: 'wizard stalker anatomy',
      mats: { c: 'iwCloak', b: 'iwBone', i: 'iwIron' },
      parts: [
        [
          'prism',
          'c',
          [0, 0, 3],
          [
            [-5, -2],
            [-4, 3],
            [0, 5],
            [4, 3],
            [5, -2],
          ],
          2,
        ],
        [
          'row',
          5,
          [1.7, 0, 0],
          ['cyl', 'b', [0, 3.1, 5], 0.6, 2, { r2: 0, seg: 4 }],
        ],
        ['mirror', 'x', ['ball', 'i', [4, 0, 5], 1.4]],
      ],
    },
    'iw-skitter': {
      about: 'Original blade-backed six-legged skitterer body',
      tags: 'wizard skitter anatomy',
      mats: { c: 'iwChitin', b: 'iwBone', g: 'iwGold', e: 'iwEmber' },
      parts: [
        [
          'lathe',
          'c',
          [0, 0, 1],
          [
            [0, 0],
            [3.3, 1],
            [4, 3],
            [2.8, 6],
            [0, 7],
          ],
          { seg: 6 },
        ],
        [
          'prism',
          'b',
          [0, -1, 6],
          [
            [-0.6, 0],
            [0.6, 0],
            [0, 5],
          ],
          7,
          { axis: 'y' },
        ],
        [
          'mirror',
          'x',
          [
            'prism',
            'c',
            [2.8, 0, 4],
            [
              [0, 0],
              [3, -1],
              [1, 4],
            ],
            5,
            { axis: 'y' },
          ],
        ],
        ['mirror', 'x', ['ball', 'e', [1.6, 3, 5], 0.8]],
        ['box', 'g', [0, 3.3, 2], [3, 1.5, 1]],
      ],
    },
    'iw-familiar-mask': {
      about:
        'Original moth-owl familiar mask, split beak and moon-shaped brows',
      tags: 'wizard familiar anatomy',
      mats: { g: 'iwGoldHi', e: 'iwLantern', b: 'iwBone' },
      parts: [
        ['mirror', 'x', ['ball', 'g', [1.7, 2, 4], 1.9]],
        ['mirror', 'x', ['ball', 'e', [1.7, 3.2, 4], 0.9]],
        [
          'prism',
          'b',
          [0, 3.2, 2],
          [
            [-1, 1],
            [1, 1],
            [0, -2],
          ],
          1,
          { axis: 'y' },
        ],
      ],
    },
  };
  shapes['iw-post-off'].parts = shapes['iw-post'].parts;
  Object.assign(E.SHAPES, shapes);
  // Lantern-rifle extends the native Humanoid weapon system. Ready is a physical
  // crystal aperture; a committed bolt leaves a dark socket until it resolves.
  E.Humanoid.weapon('iw-lantern-rifle', {
    length: 9,
    rest: [0.9, 0, -0.3],
    blade: false,
    draw(w) {
      const { g, rig, hand, at, u } = w,
        a = at(1),
        b = at(8),
        mid = at(5),
        light = rig._ready === false ? '#655d68' : '#d7ffe3';
      w.push(Math.max(hand[2], b[2]), () => {
        px.line(
          g,
          hand[0],
          hand[1],
          b[0],
          b[1],
          '#1b2029',
          Math.max(2, u * 3.4),
        );
        px.line(
          g,
          a[0],
          a[1] - 0.4,
          b[0],
          b[1] - 0.4,
          '#c9a363',
          Math.max(1, u * 1.8),
        );
        px.disc(g, mid[0], mid[1], Math.max(1.5, u * 2), '#45404c');
        px.disc(g, mid[0], mid[1], Math.max(0.7, u * 1.1), light);
        px.disc(g, b[0], b[1], Math.max(1, u * 1.5), '#e2c58d');
        px.dot(g, b[0], b[1], light);
        if (rig._recoil > 0) {
          px.disc(g, b[0], b[1], Math.max(1, u * 3 * rig._recoil), '#e9ffe0');
        }
      });
    },
  });
  class WizardRenderer {
    constructor(game) {
      this.game = game;
      this.rigs = new Map();
      this.last = new Map();
      this.mapIndex = -1;
      this.title = false;
      this.eventId = 0;
      this.fx = [];
      this.layout = {};
      this.positions = new Map();
      this.fallenAt = new Map();
      this.wizardRig = new E.Humanoid({
        size: 0.96,
        seed: 89,
        build: 'heroic',
        hat: { style: 'pointed', color: '#604779' },
        hair: 'long',
        beard: 'long',
        outfit: 'robe',
        sleeves: 'long',
        weapon: 'staff',
        cape: { len: 5, width: 7, seg: 2.4 },
        eyeGlow: '#d2ffd1',
        colors: {
          skin: '#c6c4b4',
          hair: '#e0d6b9',
          cloth: '#58456d',
          pants: '#29243f',
          boot: '#202132',
          trim: '#e4c479',
          cape: '#352d55',
          capeIn: '#8a526b',
          orb: '#a8f0ce',
          staff: '#b39768',
          eye: '#d9ffce',
        },
      });
      this.titleWizard = new E.Humanoid({
        size: 3.2,
        seed: 181,
        build: 'heroic',
        hat: { style: 'pointed', color: '#51416a' },
        hair: 'long',
        beard: 'long',
        outfit: 'robe',
        sleeves: 'long',
        weapon: 'staff',
        cape: { len: 6, width: 7, seg: 2.6 },
        eyeGlow: '#d6ffe1',
        colors: {
          skin: '#b5bcac',
          hair: '#e5dabd',
          cloth: '#51416b',
          trim: '#c7ad75',
          pants: '#24203b',
          boot: '#191c2c',
          cape: '#292b49',
          capeIn: '#67526e',
          orb: '#b8efd6',
          staff: '#b99d65',
        },
      });
      this.familiarRig = new E.Blob({
        R: 4.4,
        wings: true,
        ears: 'cat',
        tail: true,
        feet: false,
        mouth: 'fangs',
        face: 'front',
        colors: {
          dk: '#77563f',
          base: '#d3a763',
          lt: '#f8dca0',
          spec: '#fff8da',
          wing: '#afa5bb',
          inner: '#584761',
          eye: '#e2ffcf',
          pupil: '#263a3b',
        },
      });
      game.lights.enabled = true;
      game.lights.ambient = 0.72;
      game.lights.darkness = 0.3;
    }
    world(x) {
      return W(x);
    }
    cell(x) {
      return x / 16 - 0.5;
    }
    room(s) {
      return globalThis.WizardSim.ROOMS[s.roomIndex || 0];
    }
    prepare(s) {
      const idx = s.roomIndex || 0;
      if (this.mapIndex === idx) return;
      this.mapIndex = idx;
      this.rigs.clear();
      this.last.clear();
      this.fx = [];
      const room = this.room(s),
        pal = room.palette || ['#192430', '#4b4357', '#d4b273'];
      const floor = pal[0],
        wall = pal[1];
      E.MATERIALS['iw-floor-' + idx] = {
        color: floor,
        pattern: 'tiles',
        size: 16,
      };
      E.MATERIALS['iw-wall-' + idx] = {
        color: wall,
        pattern: 'bricks',
        bw: 8,
        bh: 3,
      };
      this.map = new E.TileMap({
        rows: room.rows,
        legend: { '#': 1, B: 'bell', P: 'portal', '.': 0 },
        types: {
          1: {
            h: 6.5,
            top: wall,
            side: '#292a39',
            line: '#111924',
            face: 'iw-wall-' + idx,
            roof: 'slab',
            cut: true,
            cutH: 6.5,
          },
        },
        floorMat: 'iw-floor-' + idx,
        ao: 2.5,
        outside: false,
      });
      this.palette = pal;
      this.decor = [];
      // Dressing sits on collision walls, never inside a lethal lane.
      for (let y = 0; y < room.rows.length; y++)
        for (let x = 0; x < room.rows[y].length; x++)
          if (room.rows[y][x] === '#') {
            if ((x === 1 || x === 17) && (y === 0 || y === 12))
              this.decor.push({ x, y, kind: 'pier' });
            else if ((y === 0 || y === 12) && x % 4 === 1)
              this.decor.push({ x, y, kind: 'lamp' });
            else if ((x === 0 || x === 18) && y % 4 === 2 && y !== 6)
              this.decor.push({ x, y, kind: 'lamp' });
          }
    }
    frame(s, opts = {}) {
      this.title = !!opts.title;
      this.prepare(s);
      const game = this.game,
        Wd = game.W || 640,
        H = game.H || 360,
        portrait = H > Wd * 1.05;
      const arena = this.title
        ? { x: Wd * 0.48, y: H * 0.15, w: Wd * 0.49, h: H * 0.77 }
        : portrait
          ? { x: 18, y: 94, w: Wd - 36, h: Math.min((Wd - 36) * 0.72, H - 222) }
          : { x: 25, y: 49, w: Wd - 177, h: H - 91 };
      const radar = this.title
        ? { x: 0, y: 0, w: 0, h: 0 }
        : portrait
          ? {
              x: Math.round((Wd - 170) / 2),
              y: arena.y + arena.h + 20,
              w: 170,
              h: 115,
            }
          : { x: Wd - 141, y: 74, w: 116, h: 87 };
      this.layout = {
        arena,
        radar,
        portrait,
        header: { x: 25, y: 16, w: Wd - 50, h: 24 },
        footer: { x: 25, y: H - 28, w: Wd - 50, h: 20 },
      };
      const z = Math.min(
        arena.w / (19 * 16 * 1.5 + 18),
        arena.h / (13 * 16 * 1.5 * 0.9848 + 24),
      );
      if (Math.abs((this.fitZoom || 0) - z) > 0.001) {
        game.setZoom(Math.max(0.5, z));
        this.fitZoom = z;
      }
      game.cam.smooth = 0;
      game.cam.bounds = null;
      game.cam.room = null;
      game.cam.offset = [
        arena.x + arena.w / 2 - Wd / 2,
        arena.y + arena.h / 2 - H / 2 + 3,
      ];
      game.focus(19 * 8, 13 * 8, 0);
      game.cam.x = game.cam.tx;
      game.cam.y = game.cam.ty;
      game.cam.z = 0;
    }
    actorRig(p) {
      if (this.rigs.has(p.id)) return this.rigs.get(p.id);
      let rig;
      if (p.seat !== undefined) {
        const two = p.seat === 1;
        rig = new E.Humanoid({
          size: 0.64,
          seed: 101 + (p.seat || 1),
          build: two ? 'bulky' : 'heroic',
          weapon: 'iw-lantern-rifle',
          hat: two
            ? { style: 'cap', color: '#697a92' }
            : { style: 'helmet', color: '#a48c61' },
          hair: two ? 'ponytail' : 'short',
          outfit: 'coat',
          armor: true,
          sleeves: 'long',
          cape: { len: 3, width: 5, seg: 1.6 },
          colors: {
            skin: '#e2c39b',
            hair: two ? '#c1b5a0' : '#413f44',
            cloth: two ? '#637a99' : '#609b8e',
            coat: two ? '#637a99' : '#609b8e',
            pants: '#333742',
            boot: '#292d34',
            metal: two ? '#a3b7c9' : '#d2b684',
            metalDk: '#566165',
            trim: '#e4cb99',
            belt: '#a48658',
            cape: two ? '#42536e' : '#3b706c',
            capeIn: '#273341',
            hilt: '#e8d3a0',
          },
        });
      } else if (p.type === 'hopper')
        rig = new E.Blob({
          R: 5.6,
          horns: true,
          feet: true,
          tail: true,
          mouth: true,
          face: 'front',
          colors: {
            dk: '#69564a',
            base: '#bd9b69',
            lt: '#e8c38c',
            spec: '#fff1c3',
            horn: '#d8d4b0',
            ext: '#70594c',
            eye: '#ffedba',
            pupil: '#3a3032',
          },
        });
      else if (p.type === 'stalker')
        rig = new E.Blob({
          R: 5.2,
          ears: 'cat',
          feet: true,
          mouth: 'fangs',
          face: 'front',
          colors: {
            dk: '#263c49',
            base: '#538c8f',
            lt: '#8fbdb3',
            spec: '#cef0da',
            inner: '#a7bf9d',
            ext: '#253c44',
            eye: '#e6f9bd',
            pupil: '#102b33',
          },
        });
      else
        rig = new E.Blob({
          R: 3.5,
          feet: false,
          mouth: true,
          face: 'front',
          colors: {
            dk: '#593546',
            base: '#b45469',
            lt: '#e798a0',
            spec: '#fbe4c6',
            eye: '#fff4ba',
            pupil: '#472b3a',
          },
        });
      this.rigs.set(p.id, rig);
      return rig;
    }
    update(s, dt, opts = {}) {
      this.prepare(s);
      const t = s.time || 0;
      this.remote = !!opts.remote;
      if (t < (this.lastSimTime || 0)) {
        this.eventId = 0;
        this.fx = [];
        this.positions.clear();
        this.rigs.clear();
        this.last.clear();
        this.fallenAt.clear();
      }
      this.lastSimTime = t;
      for (const p of [
        ...(s.players || []),
        ...(s.enemies || []),
        ...[s.familiar, s.wizard].filter(Boolean),
      ]) {
        let q = this.positions.get(p.id);
        if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 2.2)
          q = { x: p.x, y: p.y };
        if (this.remote) {
          const k = 1 - Math.exp(-Math.max(0, dt) * 19);
          q.x += (p.x - q.x) * k;
          q.y += (p.y - q.y) * k;
        } else {
          q.x = p.x;
          q.y = p.y;
        }
        this.positions.set(p.id, q);
      }

      for (const raw of [...(s.players || []), ...(s.enemies || [])]) {
        const p = this.present(raw),
          rig = this.actorRig(p),
          old = this.last.get(p.id) || p,
          vel =
            dt > 0
              ? [
                  Math.max(-80, Math.min(80, ((p.x - old.x) * 16) / dt)),
                  Math.max(-80, Math.min(80, ((p.y - old.y) * 16) / dt)),
                ]
              : [0, 0];
        const d = DIR[p.face || 0];
        if (p.seat !== undefined) {
          rig._ready = !p.boltId;
          rig._recoil = (p.recoil || 0) * 5;
          rig.update(dt, {
            x: W(p.x),
            y: W(p.y),
            z: 0,
            vx: vel[0],
            vy: vel[1],
            facing: ((p.face || 0) * Math.PI) / 2,
            point: true,
            hurt: (p.hurt || 0) > 0,
            down: !p.alive,
            pose: s.phase === 'victory' ? 'cheer' : undefined,
            recoil: p.recoil || 0,
          });
        } else
          rig.update(dt, {
            look: d,
            walk: Math.min(1, Math.hypot(...vel) / 20),
            squash:
              p.type === 'hopper'
                ? Math.sin(t * 8 + phase(p.id)) * 0.13
                : Math.sin(t * 11 + phase(p.id)) * 0.04,
            squint: p.state === 'warning',
            flap: 0,
          });
        this.last.set(p.id, { x: p.x, y: p.y });
        if (p.seat !== undefined) {
          if (!p.alive && !this.fallenAt.has(p.id)) this.fallenAt.set(p.id, t);
          if (p.alive) this.fallenAt.delete(p.id);
        }
      }
      const wz = s.wizard ? this.present(s.wizard) : null;
      if (wz)
        this.wizardRig.update(dt, {
          x: W(wz.x),
          y: W(wz.y),
          z: 1.3 + Math.sin(t * 3) * 0.6,
          vx: 0,
          vy: 0,
          facing: ((wz.face || 1) * Math.PI) / 2,
          point: true,
          pose: wz.state === 'active' ? 'cast' : 'hips',
        });
      this.titleWizard.update(dt, {
        x: W(13.1),
        y: W(6),
        z: 0,
        vx: 0,
        vy: 0,
        facing: Math.PI * 0.55,
        pose: Math.sin(t * 0.7) > 0.4 ? 'cast' : 'hips',
        point: true,
      });
      this.familiarRig.update(dt, {
        look: DIR[s.familiar?.face || 0],
        walk: 0,
        flap: 1,
        squash: Math.sin(t * 12) * 0.08,
      });
      for (const ev of s.events || []) {
        if (ev.id <= this.eventId) continue;
        this.eventId = ev.id;
        this.onEvent(ev, s);
      }
      for (const f of this.fx) f.age += dt;
      this.fx = this.fx.filter((f) => f.age < f.life);
    }
    present(p) {
      const q = this.positions.get(p.id);
      return this.remote && q ? { ...p, x: q.x, y: q.y } : p;
    }
    onEvent(ev, s) {
      if (!Number.isFinite(ev.x) || !Number.isFinite(ev.y)) return;
      const name = ev.type || '';
      if (name === 'wizard-hit' || name === 'wizard-banish') {
        this.game.shake(5);
        this.game.flash('#b999e8', 0.12, 0.22);
      }
      if (
        /kill|banish|catch|death|hit|bolt-impact|impact|portal|respawn|bell|fire/.test(
          name,
        )
      )
        this.fx.push({
          x: W(ev.x),
          y: W(ev.y),
          age: 0,
          life: /banish/.test(name) ? 1 : 0.4,
          n: /banish/.test(name) ? 20 : 8,
          color: /bell|catch/.test(name)
            ? C.gold
            : /death|hurt/.test(name)
              ? C.red
              : /banish/.test(name)
                ? C.violet
                : C.cyan,
          seed: ev.id,
        });
    }
    draw(s, r, opts = {}) {
      this.prepare(s);
      const t = s.time || 0,
        victory = s.phase === 'victory',
        pal = this.palette;
      r.sky(['#0c121b', '#121c28', '#151a27']);
      // A quiet etched surround leaves the collision board unmistakable.
      r.overlay((g) => {
        const a = this.layout.arena;
        if (!a) return;
        const border = opts.title ? '#34424b' : '#425059';
        for (const [x, y, dx, dy] of [
          [a.x - 8, a.y - 8, 1, 1],
          [a.x + a.w + 8, a.y - 8, -1, 1],
          [a.x - 8, a.y + a.h + 8, 1, -1],
          [a.x + a.w + 8, a.y + a.h + 8, -1, -1],
        ]) {
          px.line(g, x, y, x + dx * 12, y, border);
          px.line(g, x, y, x, y + dy * 12, border);
          px.dot(g, x + dx * 3, y + dy * 3, C.gold);
        }
      });
      this.map.drawFloor(r);
      // Floor inlays: all are nonblocking, stable, and no brighter than the actors.
      r.decal((g) => {
        for (let y = 1; y < 12; y++)
          for (let x = 1; x < 18; x++)
            if (
              this.room(s).rows[y][x] !== '#' &&
              (x * 17 + y * 11) % 19 === 0
            ) {
              const [sx, sy] = r.w(W(x), W(y), 0.1),
                q = Math.max(1, r.view.scale * 1.5);
              px.line(g, sx - q, sy, sx + q, sy, '#34414a');
              px.line(g, sx, sy - q, sx, sy + q, '#34414a');
              px.dot(g, sx, sy, '#58615d');
            }
        const pts = r.groundPts(W(9), W(6), 23, 16, 0.05);
        for (let i = 0; i < 16; i++)
          if (i % 2 === 0)
            px.line(
              g,
              ...pts[i],
              ...pts[(i + 1) % 16],
              victory ? '#758976' : '#3a3c4a',
            );
      });
      this.map.queueWalls(r);
      // Brass seam work crowns collision walls; the low cutaway is always readable.
      for (let y = 0; y < 13; y++)
        for (let x = 0; x < 19; x++)
          if (this.room(s).rows[y][x] === '#') {
            const wx = W(x),
              wy = W(y);
            r.queue(
              wx,
              wy,
              6.6,
              (g) => {
                const a = r.w(wx - 6, wy - 6, 6.6),
                  b = r.w(wx + 6, wy - 6, 6.6);
                px.line(g, ...a, ...b, '#88785e');
                if ((x + y) % 3 === 0) {
                  const c = r.w(wx - 5, wy - 4, 6.7);
                  px.dot(g, ...c, '#b09b74');
                }
              },
              { bias: 0.02 },
            );
          }
      for (const q of this.decor) {
        if (q.kind === 'pier')
          r.shape('iw-pillar', W(q.x), W(q.y), 6.5, {
            scale: 0.7,
            shadow: false,
          });
        else {
          r.prop('lantern', W(q.x), W(q.y), 8, { size: 0.48, light: false });
          this.game.lights.add(W(q.x), W(q.y), 12, 42, 0.4, {
            color: victory ? '#add8ad' : pal[2] || '#e6bc7e',
          });
        }
      }
      for (const side of [0, 18]) this.drawPortal(s, r, side, 6, t, victory);
      for (const p of s.posts || []) this.drawPost(p, s, r, t);
      for (const p of s.players || []) this.drawPlayer(p, s, r, t);
      for (const e of s.enemies || [])
        if (e.visible || e.state === 'warning') this.drawEnemy(e, s, r, t);
      if (s.familiar) this.drawFamiliar(s.familiar, s, r, t);
      if (s.wizard) this.drawWizard(s.wizard, s, r, t);
      for (const b of s.bolts || []) this.drawBolt(b, s, r, t);
      for (const f of this.fx) this.drawFx(f, r);
      if (opts.title) this.drawTitle(r, s, t);
      if (opts.debug) this.drawDebug(s, r);
    }
    drawPortal(s, r, x, y, t, victory) {
      const wx = W(x),
        wy = W(y),
        col = victory
          ? '#d1ecc0'
          : s.familiar?.goal === x
            ? '#f3ce80'
            : '#8faecd';
      r.groundDisc(wx, wy, 6.8, victory ? '#70a98f' : '#385774', 0.6, 0.2);
      r.groundRing(wx, wy, 6.5, col, 0.7, 0.3);
      for (let n = 0; n < 3; n++) {
        const phase = (t * 0.65 + n / 3) % 1;
        r.groundRing(wx, wy, 2 + phase * 4, col, (1 - phase) * 0.5, 0.4);
      }
      r.shape('iw-gate', wx, wy, 0, {
        facing: x === 0 ? 0 : Math.PI,
        scale: 0.62,
        shadow: false,
      });
      this.game.lights.add(wx, wy, 5, 26, 0.45, { color: col });
    }
    drawPost(p, s, r, t) {
      const wx = W(p.x),
        wy = W(p.y),
        ready = (p.cooldown || 0) <= 0,
        ring = p.ring || 0;
      r.shape(ready ? 'iw-post' : 'iw-post-off', wx, wy, 1, {
        scale: 0.72,
        facing: Math.PI / 2 + Math.sin(t * 34) * Math.min(0.14, ring * 0.2),
        pick: { type: 'post', id: p.id },
        shadow: true,
      });
      const rr = 5.8;
      r.groundRing(wx, wy, rr, ready ? '#c7b47b' : '#5f6171', 0.8, 0.3);
      if (ready) {
        this.game.lights.add(wx, wy, 7, 19, 0.35, { color: '#f6d594' });
        r.queue(
          wx,
          wy,
          11,
          (g) => {
            const a = r.w(wx, wy, 11);
            px.dot(g, a[0], a[1], '#f7edc1');
          },
          { emissive: true },
        );
      }
      if (ring > 0) {
        const a = Math.max(0, 1 - ring / (s.tuning?.revealDuration || 1.25));
        for (let n = 0; n < 2; n++)
          r.groundRing(
            wx,
            wy,
            8 + ((a + n * 0.28) % 1) * (16 * (s.tuning?.revealRadius || 3)),
            '#cbb581',
            0.65 * (1 - a),
            0.4,
          );
      }
      if (!ready) {
        const a = 1 - Math.min(1, p.cooldown / (s.tuning?.postCooldown || 5));
        r.decal((g) =>
          r.groundArc(
            wx,
            wy,
            5.8,
            6.7,
            -Math.PI / 2,
            -Math.PI / 2 + TAU * a,
            '#bda975',
            0.8,
            0.4,
            g,
          ),
        );
      }
    }
    drawPlayer(raw, s, r, t) {
      const p = this.present(raw),
        wx = W(p.x),
        wy = W(p.y),
        rig = this.actorRig(p),
        two = p.seat === 1,
        col = two ? '#b7ccec' : '#a4e3cf';
      if (!p.alive) {
        if (t - (this.fallenAt.get(p.id) || 0) < 0.8)
          r.actor(wx, wy, 0, (g, x, y) => rig.draw(g, x, y, r.view), {
            alpha: 0.65,
            outline: true,
          });
        r.groundRing(wx, wy, 5.4, '#756c77', 0.6);
        r.queue(wx, wy, 1, (g) => {
          const [x, y] = r.w(wx, wy, 1);
          px.line(g, x - 3, y - 3, x + 3, y + 3, '#8e8693');
          px.line(g, x + 3, y - 3, x - 3, y + 3, '#8e8693');
        });
        return;
      }
      r.shadow(wx, wy, 5, 0.42);
      r.groundRing(wx, wy, 5.8, col, 0.65, 0.1);
      if (p.protect > 0) {
        r.groundRing(wx, wy, 7.5 + Math.sin(t * 8) * 0.5, col, 0.8, 0.5);
        r.groundRing(wx, wy, 9.5, col, 0.3, 0.3);
      }
      r.actor(wx, wy, 0, (g, x, y) => rig.draw(g, x, y, r.view), {
        outline: true,
        rim: true,
        flash: p.hurt > 0 ? '#ffe3bb' : undefined,
        flashMix: 0.55,
        alpha: p.protect > 0 ? 0.8 + 0.2 * Math.sin(t * 22) : 1,
        pick: { type: 'player', seat: p.seat },
      });
      const d = DIR[p.face || 0],
        mx = wx + d[0] * 8.2,
        my = wy + d[1] * 8.2,
        ready = !p.boltId;
      r.queue(
        mx,
        my,
        2.3,
        (g) => {
          const a = r.w(mx, my, 2.3);
          px.disc(g, a[0], a[1], 1.4, ready ? col : '#756773');
          px.dot(g, a[0], a[1], ready ? '#edffe4' : '#332a41');
        },
        { emissive: ready },
      );
      if (ready) this.game.lights.add(wx, wy, 7, 18, 0.27, { color: col });
    }
    drawEnemy(raw, s, r, t) {
      const e = this.present(raw),
        wx = W(e.x),
        wy = W(e.y),
        rig = this.actorRig(e),
        warning = e.state === 'warning',
        col =
          e.type === 'hopper' ? C.gold : e.type === 'stalker' ? C.cyan : C.red;
      if (warning) {
        r.groundRing(wx, wy, 6 + Math.sin(t * 14) * 0.9, col, 0.85, 0.3);
        r.queue(wx, wy, 2, (g) => {
          const [x, y] = r.w(wx, wy, 2);
          px.line(g, x - 3, y, x + 3, y, col);
          px.line(g, x, y - 3, x, y + 3, col);
        });
        return;
      }
      const hop =
        e.type === 'hopper'
          ? Math.max(0, Math.sin(t * 8 + phase(e.id))) * 1.5
          : 0;
      r.shadow(wx, wy, 4.7, 0.36);
      if (e.type === 'skitter') {
        r.actor(
          wx,
          wy,
          0,
          (g, ox, oy) => {
            const v = E.charView(r.view),
              sc = v.scale,
              face = ((e.face || 0) * Math.PI) / 2;
            for (let n = 0; n < 3; n++)
              for (const side of [-1, 1]) {
                const phase = t * 18 + n * 2.1 + side,
                  z = Math.sin(phase) * 1.1,
                  fore = (n - 1) * 2.8,
                  rot = face - Math.PI / 2,
                  c = Math.cos(rot),
                  sn = Math.sin(rot);
                const pts = [
                  [side * 2, fore, 3],
                  [side * 6, fore + Math.sin(phase) * 1.6, 4 + z],
                  [side * 7, fore + 1.5, 0],
                ];
                const Q = pts.map(([x, y, z]) => {
                  const q = v.p(x * c - y * sn, x * sn + y * c, z);
                  return [ox + q[0], oy + q[1]];
                });
                px.line(g, ...Q[0], ...Q[1], '#80515f', Math.max(1, sc));
                px.line(g, ...Q[1], ...Q[2], '#d2a0a1', Math.max(1, sc * 0.7));
              }
          },
          { outline: true },
        );
        r.shape('iw-skitter', wx, wy, 0, {
          facing: ((e.face || 0) * Math.PI) / 2,
          scale: 1,
          shadow: false,
        });
      } else {
        r.actor(wx, wy, hop, (g, x, y) => rig.draw(g, x, y, r.view), {
          outline: true,
          rim: true,
          alpha: e.revealUntil > s.time ? 0.92 : 1,
        });
        if (e.type === 'stalker')
          r.shape('iw-jaw', wx, wy, Math.sin(t * 6) * 0.5, {
            facing: ((e.face || 0) * Math.PI) / 2,
            scale: 1,
            shadow: false,
            bias: 0.1,
          });
      }
      if (e.state === 'lured') r.groundRing(wx, wy, 5.3, '#cfbd84', 0.55, 0.2);
    }
    drawFamiliar(raw, s, r, t) {
      const f = this.present(raw),
        wx = W(f.x),
        wy = W(f.y),
        z = 4 + Math.sin(t * 9) * 1.2;
      if ((f.warning || 0) > 0) r.groundRing(wx, wy, 9, '#f3c887', 0.8, 0.3);
      r.shadow(wx, wy, 4.5, 0.3);
      r.actor(wx, wy, z, (g, x, y) => this.familiarRig.draw(g, x, y, r.view), {
        outline: true,
        rim: true,
      });
      r.shape('iw-familiar-mask', wx, wy, z + 1, {
        facing: Math.PI / 2,
        shadow: false,
        scale: 0.7,
        bias: 0.1,
      });
      this.game.lights.add(wx, wy, z + 4, 18, 0.35, { color: '#edcf8d' });
    }
    drawWizard(raw, s, r, t) {
      const w = this.present(raw),
        wx = W(w.x),
        wy = W(w.y),
        warning = w.state === 'warning',
        col = w.vulnerable ? '#d7edb9' : '#d6b3ee';
      r.groundRing(wx, wy, 11, col, 0.85, 0.25);
      r.groundRing(wx, wy, 8, w.vulnerable ? '#b3c28e' : '#9682b6', 0.8, 0.25);
      if (!warning && !w.vulnerable)
        r.queue(
          wx,
          wy,
          14,
          (g) => {
            const v = E.charView(r.view),
              q = r.w(wx, wy, 14),
              a = 6 * v.scale;
            px.line(g, q[0] - a, q[1], q[0], q[1] - a, '#a58bba');
            px.line(g, q[0], q[1] - a, q[0] + a, q[1], '#a58bba');
            px.line(g, q[0] + a, q[1], q[0], q[1] + a, '#a58bba');
            px.line(g, q[0], q[1] + a, q[0] - a, q[1], '#a58bba');
          },
          { emissive: true },
        );
      if (!warning && w.vulnerable)
        r.queue(
          wx,
          wy,
          24,
          (g) => {
            const q = r.w(wx, wy, 24);
            px.poly(
              g,
              [
                [q[0] - 3, q[1] - 2],
                [q[0] + 3, q[1] - 2],
                [q[0], q[1] + 1],
              ],
              '#e2f4c4',
            );
          },
          { emissive: true },
        );
      r.decal((g) => {
        for (let n = 0; n < 6; n++) {
          const a = t * 0.6 + (n * TAU) / 6,
            a0 = r.w(wx + Math.cos(a) * 10, wy + Math.sin(a) * 10, 0.5),
            a1 = r.w(
              wx + Math.cos(a + 0.18) * 13,
              wy + Math.sin(a + 0.18) * 13,
              0.5,
            );
          px.line(g, ...a0, ...a1, col);
        }
      });
      if (warning) {
        r.queue(
          wx,
          wy,
          8,
          (g) => {
            const [x, y] = r.w(wx, wy, 8);
            px.line(g, x - 5, y - 5, x + 5, y + 5, col);
            px.line(g, x + 5, y - 5, x - 5, y + 5, col);
            px.rect(g, x - 1, y - 11, 2, 5, '#f0d4ee');
          },
          { emissive: true },
        );
        return;
      }
      r.shadow(wx, wy, 8, 0.55);
      r.actor(
        wx,
        wy,
        1.3 + Math.sin(t * 3) * 0.6,
        (g, x, y) => this.wizardRig.draw(g, x, y, r.view),
        { outline: true, rim: true, alpha: w.state === 'dissolve' ? 0.35 : 1 },
      );
      this.game.lights.add(wx, wy, 12, 42, 0.65, { color: '#c6a5de' });
      if (w.cast > 0.1) {
        const a = ((w.face || 0) * Math.PI) / 2,
          d = DIR[w.face || 0];
        r.queue(
          wx + d[0] * 8,
          wy + d[1] * 8,
          12,
          (g) => {
            const q = r.w(wx + d[0] * 8, wy + d[1] * 8, 12);
            px.ddisc(g, q[0], q[1], 5, '#e3c4f1', 0.6);
          },
          { emissive: true },
        );
      }
    }
    drawBolt(b, s, r, t) {
      const wx = W(b.x),
        wy = W(b.y),
        d = DIR[b.dir || 0],
        col = b.hostile ? '#d8a4ed' : '#d6ffcb';
      r.queue(
        wx,
        wy,
        3,
        (g) => {
          const a = r.w(wx, wy, 3),
            back = r.w(wx - d[0] * 5, wy - d[1] * 5, 3);
          px.line(g, ...back, ...a, b.hostile ? '#7c5c9c' : '#7aaf9e', 3);
          px.line(g, ...back, ...a, col, 1);
          px.disc(g, a[0], a[1], 1.7, '#fff5d7');
          if (b.hostile) {
            const p = r.w(wx + d[1] * 1.6, wy - d[0] * 1.6, 3);
            px.line(g, back[0], back[1], p[0], p[1], col);
          }
        },
        { emissive: true },
      );
      this.game.lights.add(wx, wy, 4, 12, 0.4, { color: col });
    }
    drawFx(f, r) {
      const u = f.age / f.life;
      r.queue(
        f.x,
        f.y,
        3,
        (g) => {
          const [x, y] = r.w(f.x, f.y, 3);
          for (let i = 0; i < f.n; i++) {
            const a = (i * TAU) / f.n + f.seed * 0.7,
              rr = u * (5 + (i % 3) * 4),
              dy = u * u * 5;
            px.line(
              g,
              x + Math.cos(a) * rr,
              y + Math.sin(a) * rr + dy,
              x + Math.cos(a) * (rr + 2 * (1 - u)),
              y + Math.sin(a) * (rr + 2 * (1 - u)) + dy,
              f.color,
            );
          }
        },
        { emissive: true },
      );
    }
    drawTitle(r, s, t) {
      // A full-size sorcerer presides over the miniature real campaign board.
      const wx = W(13.6),
        wy = W(6.4);
      r.shadow(wx, wy, 27, 0.6);
      r.actor(wx, wy, 3, (g, x, y) => this.titleWizard.draw(g, x, y, r.view), {
        outline: true,
        rim: true,
      });
      r.groundRing(wx, wy, 29, '#9b8b75', 0.6, 0.5);
      r.groundRing(wx, wy, 34, '#5f6372', 0.4, 0.3);
      this.game.lights.add(wx, wy, 25, 115, 0.65, { color: '#c6d5ab' });
      r.overlay((g) => {
        const a = this.layout.arena;
        if (!a) return;
        const x = a.x + a.w * 0.5,
          y = a.y + a.h - 4;
        E.font.text(g, 'SIX FLOORS. ONE VERY SMALL TEMPER.', x, y, '#929b96', {
          align: 'center',
          shadow: '#0b1019',
          outline: false,
        });
      });
    }
    drawDebug(s, r) {
      r.decal((g) => {
        for (let y = 0; y < 13; y++)
          for (let x = 0; x < 19; x++) {
            const a = r.w(x * 16, y * 16, 0.2),
              b = r.w((x + 1) * 16, y * 16, 0.2),
              c = r.w(x * 16, (y + 1) * 16, 0.2);
            px.line(g, ...a, ...b, '#4a5a68');
            px.line(g, ...a, ...c, '#4a5a68');
          }
      });
      for (const p of s.players || [])
        if (p.alive)
          for (const e of s.enemies || [])
            if (e.visible)
              r.decal((g) => {
                const a = r.w(W(p.x), W(p.y), 0.5),
                  b = r.w(W(e.x), W(e.y), 0.5);
                px.line(g, ...a, ...b, '#96b69d');
              });
    }
  }
  globalThis.WizardRenderer = WizardRenderer;
})();
