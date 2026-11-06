import { ARENA, STONES, DT, clamp } from './config.js';
import { COURTS } from './content.js';
import { powerOf, predict, remaining, readyAt } from './sim.js';
export const TEAM = [
  { color: '#75dfd4', dark: '#245e64', name: 'THE TEAL TROUPE' },
  { color: '#ff9c75', dark: '#843e4b', name: 'THE CORAL COURT' },
];
export class Battlefield {
  constructor(game, E) {
    this.game = game;
    this.E = E;
    this.world = null;
    this.debris = [];
    this.ripples = [];
    this.flashes = [];
    this.poses = [];
    this.guidance = [800, 160];
    this.debug = false;
    this.arc = false;
    this.selection = null;
    this.preview = null;
    E.VIEWS.siege = new E.View('siege', 'Tournament', 0, 0, 1, 1);
    for (const c of COURTS)
      E.MATERIALS[`siegeStone${c.id}`] = {
        color: c.stone,
        pattern: 'stones',
        size: 6,
        over: [['cracks'], ['moss', '#68805c', { amount: 0.15 }]],
      };
    E.SHAPES.siegeBlock = {
      about: 'An individually destructible tournament ashlar',
      mats: { s: 'stone' },
      params: { w: 19, h: 18 },
      make: (p) => [['box', 's', [0, 0, 0], [p.w, 11, p.h]]],
    };
    E.SHAPES.siegeTimber = {
      about: 'Braced timber tower section',
      mats: { s: 'oak', b: 'walnut' },
      params: { w: 19, h: 18 },
      make: (p) => [
        ['box', 's', [0, 0, 0], [p.w, 11, p.h]],
        ['box', 'b', [0, 6, 0], [2, 1, p.h]],
        ['box', 'b', [0, 6, p.h - 3], [p.w, 1, 2]],
      ],
    };
    E.Humanoid.pose('siegeHaul', (J, w, rig) => {
      const t = rig.t * 12;
      for (const [id, phase] of [
        ['handR', 0],
        ['handL', Math.PI],
      ]) {
        J[id][0] += (8 + Math.cos(t + phase) * 3 - J[id][0]) * w;
        J[id][2] += (17 + Math.sin(t + phase) * 3 - J[id][2]) * w;
      }
      J.head[0] += 3 * w;
    });
    E.Humanoid.pose('siegeTools', (J, w, rig) => {
      J.handR[0] += (9 - J.handR[0]) * w;
      J.handR[2] += (12 + Math.sin(rig.t * 16) * 5 - J.handR[2]) * w;
      J.handL[2] += (17 - J.handL[2]) * w;
    });
    E.Humanoid.pose('siegeFlag', (J, w) => {
      J.handR[0] += (8 - J.handR[0]) * w;
      J.handR[2] += (26 - J.handR[2]) * w;
    });
    this.crews = [0, 1].map((seat) =>
      [0, 1].map(
        (i) =>
          new E.Humanoid({
            size: 0.86,
            build: i ? 'bulky' : 'heroic',
            outfit: 'tunic',
            hat: i ? 'band' : 'helmet',
            weapon: null,
            sleeves: 'long',
            hair: i ? 'short' : 'spiky',
            seed: seat * 20 + i + 4,
            draw: {
              over(g, joints, rig) {
                if (!rig.siegeTool) return;
                const hand = joints.handR;
                E.px.line(
                  g,
                  hand[0],
                  hand[1],
                  hand[0] + 5,
                  hand[1] - 9,
                  '#d2a16b',
                  2,
                );
                E.px.rect(g, hand[0] + 1, hand[1] - 13, 10, 5, '#384956');
                E.px.rect(g, hand[0] + 2, hand[1] - 12, 8, 3, '#bac5c6');
                E.px.rect(g, hand[0] + 2, hand[1] - 12, 8, 1, '#f0dfb7');
              },
            },
            colors: {
              cloth: TEAM[seat].color,
              pants: '#333e56',
              hair: i ? '#b9844f' : '#e8c17c',
              trim: '#eed7a1',
              skin: i ? '#c69a78' : '#e7bfa0',
              metal: '#9babc0',
              boot: '#352c35',
            },
          }),
      ),
    );
    this.spectators = Array.from(
      { length: 15 },
      (_, i) =>
        new E.Humanoid({
          size: 0.58,
          hat: i % 3 ? 'cap' : 'crown',
          outfit: i % 2 ? 'robe' : 'tunic',
          weapon: null,
          seed: 40 + i,
          colors: {
            cloth: ['#8d4857', '#69775a', '#9a8553', '#567e8b'][i % 4],
            trim: '#c5ac72',
            skin: i % 3 ? '#d8ae8b' : '#a67c65',
          },
        }),
    );
  }
  reset(w) {
    this.world = w;
    this.debris = [];
    this.ripples = [];
    this.flashes = [];
    this.preview = null;
    this.predKey = '';
    const c = w.courtDef;
    this.bg = new this.E.Backdrop({
      sky:
        c.id === 3
          ? ['#111a3b', '#465175', '#ba7d79']
          : c.id === 0
            ? ['#668ba2', '#aac0b9', '#e4d2aa']
            : ['#3f506e', '#9d8b8d', '#ebc49c'],
      sun:
        c.id === 3 ? undefined : { x: 0.52, y: 0.28, r: 25, color: '#f4d9a7' },
      moon:
        c.id === 3 ? { x: 0.53, y: 0.24, r: 20, color: '#ece0b8' } : undefined,
      stars: c.id === 3 ? 60 : 0,
      layers: [
        {
          kind: 'mountains',
          color: c.id === 3 ? '#28334d' : '#8c9699',
          y: 0.5,
          height: 0.2,
          parallax: 0.1,
        },
        {
          kind: 'castle',
          color: c.id === 3 ? '#354157' : '#a3a795',
          y: 0.66,
          height: 0.13,
          parallax: 0.2,
        },
        {
          kind: 'clouds',
          color: c.id === 3 ? '#58526e' : '#dfd4bd',
          y: 0.18,
          height: 0.13,
          parallax: 0.3,
          drift: 2,
        },
        {
          kind: 'hills',
          color: c.id === 3 ? '#324853' : '#869780',
          y: 0.74,
          height: 0.14,
          parallax: 0.4,
        },
      ],
    });
    this.land = new this.E.Terrain({
      w: 960,
      h: 440,
      y: -404,
      materials: [
        {
          color: c.id === 1 ? '#9c8865' : '#777061',
          top: c.grass,
          edge: '#343a41',
          depth: 5,
        },
        { color: '#4f535a', top: '#71767a', edge: '#30343d', depth: 3 },
      ],
      chunk: 64,
    });
    this.land.fill((x, z) =>
      x < 307 || x > 653 ? (z < ARENA.ground ? (z < 13 ? 2 : 1) : 0) : 0,
    );
    this.game.lights.enabled = true;
    this.game.lights.ambient = c.id === 3 ? 0.7 : 0.92;
    this.game.particles.ground = (x, y, z) =>
      x < 307 || x > 653 ? ARENA.ground : ARENA.water;
  }
  update(
    dt,
    { seat = 0, assist = false, reduced = false, title = false } = {},
  ) {
    const w = this.world;
    if (!w) return;
    this.reduced = reduced;
    const g = this.game;
    // Fit the whole lane. Portrait leaves room for a readable target inset above it.
    const ppu = Math.min(g.W / 1000, g.H / 440);
    g.view.zoom = ppu;
    g.view._siegeZoom = ppu; // View axes are refreshed via setZoom below when changed.
    if (Math.abs((g.zoom || 1) - ppu) > 0.003) {
      g.setZoom(ppu);
    }
    g.cam.smooth = 0;
    g.cam.bounds = null;
    g.focus(480, 0, 130);
    for (let s = 0; s < 2; s++) {
      const p = w.players[s],
        end = Math.max(p.crewUntil, p.launcherUntil),
        missing = w.tick < end,
        secondsLeft = (end - w.tick) * DT,
        disableTime =
          w.tick < p.launcherUntil
            ? w.config.launcherDisable
            : w.config.crewDisable,
        retreat = missing
          ? clamp((disableTime - secondsLeft) / 0.18, 0, 1) *
            clamp(secondsLeft / 0.4, 0, 1)
          : 0;
      this.crews[s].forEach((rig, i) => {
        const repair = w.tick < p.launcherUntil,
          charge = p.charge >= 0,
          win = w.outcome?.winner === s;
        const x =
          ARENA.crew[s] +
          (s ? -1 : 1) * (i ? -17 : 0) +
          (s ? 1 : -1) * retreat * 28;
        const pose = w.outcome
          ? win
            ? 'cheer'
            : 'siegeFlag'
          : missing
            ? repair
              ? 'siegeTools'
              : 'down'
            : charge
              ? 'siegeHaul'
              : 'hips';
        rig.siegeTool = repair;
        rig.update(dt, {
          x,
          y: i ? 4 : 0,
          z: ARENA.ground,
          facing: s ? Math.PI : 0,
          pose,
          expr: missing ? 'wince' : win ? 'smile' : charge ? 'angry' : null,
          run: retreat > 0 ? 0.8 : 0,
        });
      });
    }
    this.spectators.forEach((rig, i) =>
      rig.update(dt, {
        x: 340 + i * 20,
        y: 15,
        z: 30,
        facing: i % 2 ? 0 : Math.PI,
        pose: w.outcome ? 'cheer' : i % 4 === 0 ? 'wave' : 'hips',
      }),
    );
    for (const d of this.debris) {
      d.life -= dt;
      d.vz -= 300 * dt;
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      d.rot += dt * d.spin;
      if (d.z < ARENA.water && d.life > 0.35) d.life = 0.35;
    }
    this.debris = this.debris.filter((d) => d.life > 0);
    this.ripples = this.ripples.filter((d) => (d.life -= dt) > 0);
    this.flashes = this.flashes.filter((d) => (d.life -= dt) > 0);
    this.seat = seat;
    const p = w.players[seat],
      power = powerOf(w, p),
      key = [w.revision, p.stone, Math.round(power * 150), assist].join(':');
    if (p.charge >= 0 && key !== this.predKey) {
      this.predKey = key;
      this.preview = predict(w, seat, p.stone, power, {
        path: assist || this.arc,
      });
    } else if (p.charge < 0) this.preview = null;
  }
  event(e) {
    const E = this.E,
      g = this.game,
      w = this.world;
    if (e.type === 'fall') {
      const r = E.rng(e.id * 177 + e.tick);
      this.debris.push({
        ...e,
        x: e.x + e.w / 2,
        z: e.z + e.h / 2,
        vx: (r() - 0.5) * 55,
        vz: 25 + r() * 55,
        rot: 0,
        spin: (r() - 0.5) * 5,
        life: 2 + r(),
        color: e.material === 'W' ? '#b28c60' : w.courtDef.stone,
      });
    }
    if (e.type === 'hit') {
      this.flashes.push({ ...e, life: 0.22 });
      g.particles.impact(
        e.x,
        0,
        e.z,
        e.stone === 1 ? 1.5 : 0.8,
        e.kind === 'castle' ? '#f4d6a2' : TEAM[e.seat].color,
      );
      g.particles.bits(e.x, 0, e.z, this.reduced ? 3 : 12, [
        w.courtDef.stone,
        '#e8d2a3',
        '#665c58',
      ]);
      if (!this.reduced) g.shake(e.stone === 1 ? 2 : 1);
    }
    if (e.type === 'collapse') {
      if (!this.reduced) g.shake(Math.min(4, e.count * 0.35));
    }
    if (e.type === 'launch') g.particles.dust(e.x, 0, ARENA.ground, 5);
    if (e.type === 'split') g.particles.glints(e.x, 0, e.z, 8, STONES[2].color);
    if (e.type === 'water') {
      this.ripples.push({ ...e, life: 1.3 });
      for (let i = 0; i < (this.reduced ? 4 : 16); i++)
        g.particles.add({
          kind: 'bit',
          x: e.x,
          y: 0,
          z: ARENA.water + 2,
          vx: (i - 8) * 5,
          vz: 45 + (i % 4) * 15,
          g: 180,
          max: 0.6,
          color: '#b2e5e3',
          size: 1,
        });
    }
  }
  draw(r) {
    const w = this.world;
    if (!w) return;
    const E = this.E,
      px = E.px,
      c = w.courtDef,
      t = this.game.time;
    this.bg.draw(r);
    // A distant tournament pavilion and spectators, behind the lake.
    r.queue(480, 22, 22, (g) => {
      const P = (x, z) => r.w(x, 22, z);
      px.poly(g, [P(320, 30), P(640, 30), P(625, 42), P(335, 42)], '#6d655f');
      for (let i = 0; i < 9; i++) {
        const x = 340 + i * 35;
        px.poly(
          g,
          [P(x - 19, 63), P(x, 83), P(x + 19, 63)],
          i % 2 ? '#b45e5e' : '#d4bb8e',
        );
        px.line(g, ...P(x - 18, 63), ...P(x - 18, 34), '#66524b', 2);
      }
      for (let x = 330; x <= 630; x += 10)
        px.rect(g, ...P(x, 32), 1, 8, '#514d4c');
    });
    this.spectators.forEach((rig) =>
      r.actor(rig.x, rig.y, rig.z, (g, x, y) => rig.draw(g, x, y, r.view)),
    );
    // Water is cosmetic; its one collision plane lives in the simulation.
    const [wx, wy] = r.w(300, 0, ARENA.water),
      [ex] = r.w(660, 0, ARENA.water);
    r.overlay((g) => {
      px.rect(g, wx, wy, ex - wx, r.H - wy, '#365e74');
      for (let y = 0; y < 110; y += 4) {
        const col = E.mix('#658a91', '#2c4d68', y / 130);
        for (let i = 0; i < 14; i++) {
          const x =
            wx + ((i * 37 + Math.sin(t * 0.6 + y) * 12 + y * 4) % (ex - wx));
          px.rect(g, x, wy + y, 9 + ((i * 7 + y) % 29), 1, col);
        }
      }
      for (let i = 0; i < 6; i++) {
        const x = wx + 26 + i * 53;
        px.rect(
          g,
          x + Math.sin(t + i) * 5,
          wy + 10 + (i % 3) * 8,
          14,
          2,
          c.id === 3 ? '#ac8a7a' : '#92b3ac',
        );
      }
      for (const e of this.ripples) {
        const q = r.w(e.x, 0, ARENA.water),
          rad = (1.3 - e.life) * 24;
        px.ell(g, q[0], q[1] + 2, rad, Math.max(1, rad * 0.15), '#9ec7c2');
        px.ell(
          g,
          q[0],
          q[1] + 2,
          Math.max(0, rad - 2),
          Math.max(0, rad * 0.15 - 1),
          '#365e74',
        );
      }
    });
    this.land.draw(r);
    for (const x of [28, 282, 678, 932]) {
      r.shape('barrel', x, 5, ARENA.ground, { scale: 0.7 });
      r.prop(c.id === 3 ? 'brazier' : 'torch', x, 3, ARENA.ground, {
        size: 0.9,
        light: true,
      });
    }
    for (const x of [15, 294, 666, 945]) {
      r.shape('grass', x, 0, ARENA.ground, { params: { h: 8, n: 6 } });
    }
    for (let seat = 0; seat < 2; seat++) {
      const blocks = w.castles[seat];
      for (const b of blocks) {
        if (!b.foundation && b.hp <= 0) continue;
        r.shape(
          b.material === 'W' ? 'siegeTimber' : 'siegeBlock',
          b.x + b.w / 2,
          -1,
          b.z,
          {
            params: { w: b.w, h: b.h },
            mats: { s: b.material === 'W' ? 'oak' : `siegeStone${c.id}` },
            shadow: false,
          },
        );
        r.queue(b.x, 0, b.z, (g) => {
          const [x, y] = r.w(b.x, 0, b.z + b.h),
            k = r.ppu;
          if (!b.foundation) {
            px.rect(
              g,
              x + 1,
              y,
              b.w * k - 2,
              2,
              b.material === 'W' ? '#dbc08b' : E.tones(c.stone).hi,
            );
            if (b.material === 'R') {
              px.rect(g, x + 3, y + 4, 2, b.h * k - 8, '#687286');
              px.rect(g, x + b.w * k - 5, y + 4, 2, b.h * k - 8, '#687286');
            }
            if (b.hp < b.max) {
              px.line(
                g,
                x + b.w * k * 0.6,
                y + 3,
                x + b.w * k * 0.42,
                y + b.h * k * 0.6,
                '#4b4950',
              );
              px.line(
                g,
                x + b.w * k * 0.42,
                y + b.h * k * 0.6,
                x + b.w * k * 0.66,
                y + b.h * k - 1,
                '#4b4950',
              );
            }
            if (b.h >= 17 && b.id % 4 === 0) {
              const sx = x + b.w * k * 0.45;
              px.rect(g, sx, y + 6, 3 * k, 6 * k, '#525967');
              px.rect(g, sx, y + 6, 1, 6 * k, '#d3c3a5');
            }
          }
          if (this.debug) {
            px.rect(g, x, y, b.w * k, 1, '#8effca');
            px.rect(g, x, y, 1, b.h * k, '#8effca');
            for (const id of b.support) {
              const a = blocks.find((q) => q.id === id);
              if (a && (a.hp > 0 || a.foundation))
                px.line(
                  g,
                  ...r.w(b.x + b.w / 2, 0, b.z + b.h / 2),
                  ...r.w(a.x + a.w / 2, 0, a.z + a.h / 2),
                  '#b5e9ad',
                );
            }
          }
          if (
            (this.selection?.id === b.id && seat === 0) ||
            (this.hover?.id === b.id && this.hover?.x === b.x)
          ) {
            px.rect(g, x - 2, y - 2, b.w * k + 4, 2, '#fff7ad');
            px.rect(g, x - 2, y - 2, 2, b.h * k + 4, '#fff7ad');
          }
        });
      }
      // Standards attach only to surviving objective blocks.
      const highest = blocks
        .filter((b) => !b.foundation && b.hp > 0)
        .sort((a, b) => b.z + b.h - a.z - a.h)[0];
      if (highest) {
        const x = highest.x + highest.w / 2,
          z = highest.z + highest.h;
        r.queue(x, -2, z, (g) => {
          const P = (dx, dz) => r.w(x + dx, -2, z + dz),
            a = Math.sin(t * 3 + seat) * 2;
          px.line(g, ...P(0, 0), ...P(0, 34), '#7b6149', 2);
          px.poly(
            g,
            [P(1, 33), P(24, 31 + a), P(20, 22 + a), P(1, 23)],
            TEAM[seat].dark,
          );
          px.poly(
            g,
            [P(2, 32), P(22, 30 + a), P(18, 24 + a), P(2, 24)],
            TEAM[seat].color,
          );
          px.disc(g, ...P(10, 28), 2, '#f2d9a3');
        });
      }
      this.catapult(r, seat);
      for (const rig of this.crews[seat]) {
        r.shadow(rig.x, 0, 7, 0.25, undefined, ARENA.ground);
        r.actor(rig.x, rig.y, rig.z, (g, x, y) => rig.draw(g, x, y, r.view));
      }
      const p = w.players[seat],
        protectedNow =
          w.tick >= Math.max(p.crewUntil, p.launcherUntil) &&
          w.tick < p.protectUntil;
      if (protectedNow)
        r.queue(ARENA.launch[seat], 0, ARENA.ground, (g) => {
          const P = (x, z) => r.w(x, 0, z);
          for (const x of [ARENA.launch[seat], ARENA.crew[seat]]) {
            const q = P(x, ARENA.ground + 48);
            px.poly(
              g,
              [
                [q[0] - 7, q[1] - 4],
                [q[0] + 7, q[1] - 4],
                [q[0] + 6, q[1] + 4],
                [q[0], q[1] + 10],
                [q[0] - 6, q[1] + 4],
              ],
              '#e9c36b',
            );
            px.line(g, q[0] - 3, q[1] + 1, q[0], q[1] + 5, '#71563f', 2);
            px.line(g, q[0], q[1] + 5, q[0] + 4, q[1] - 1, '#71563f', 2);
          }
        });
      if (w.outcome && w.outcome.winner !== seat)
        r.queue(ARENA.crew[seat], 0, ARENA.ground, (g) => {
          const q = r.w(ARENA.crew[seat], 0, ARENA.ground + 44);
          px.line(g, q[0], q[1] + 28, q[0], q[1], '#7c6957', 2);
          px.poly(
            g,
            [
              [q[0], q[1]],
              [q[0] + 22, q[1] + Math.sin(t * 3) * 2],
              [q[0] + 19, q[1] + 13],
              [q[0], q[1] + 12],
            ],
            '#f5ead2',
          );
        });
    }
    for (const s of w.shots)
      r.queue(s.x, 0, s.z, (g) => {
        const q = r.w(s.x, 0, s.z),
          k = r.ppu,
          st = STONES[s.stone],
          rad = (s.fragment ? 2.4 : st.radius) * k;
        const speed = Math.hypot(s.vx, s.vz) || 1;
        for (let i = 1; i < 5; i++)
          px.disc(
            g,
            q[0] - (s.vx / speed) * i * 4,
            q[1] + (s.vz / speed) * i * 4,
            Math.max(0.6, rad * (1 - i * 0.18)),
            E.mix(st.color, '#8e9f9b', i / 5),
          );
        px.disc(g, ...q, rad + 1, '#354256');
        px.disc(g, ...q, rad, st.color);
        px.disc(
          g,
          q[0] - rad * 0.3,
          q[1] - rad * 0.4,
          Math.max(1, rad * 0.4),
          '#fff1cf',
        );
        if (s.stone === 2)
          px.line(g, q[0], q[1] - rad, q[0] - 1, q[1] + rad, '#6c568b');
      });
    for (const d of this.debris)
      r.queue(d.x, 0, d.z, (g) => {
        const q = r.w(d.x, 0, d.z),
          s = Math.min(8, d.w * 0.35) * r.ppu,
          c = Math.cos(d.rot),
          a = Math.sin(d.rot);
        px.poly(
          g,
          [
            [-s, -s],
            [s, -s],
            [s, s],
            [-s, s],
          ].map(([x, y]) => [q[0] + x * c - y * a, q[1] + x * a + y * c]),
          d.color,
        );
        px.line(
          g,
          q[0] - s / 2,
          q[1] - s / 2,
          q[0] + s / 2,
          q[1] - s / 2,
          '#e2ceb0',
        );
      });
    if (w.mode !== 'title' && w.mode !== 'attract')
      r.overlay((g) => {
        const seat = this.seat || 0,
          x = this.guidance[seat],
          q = r.w(x, 0, ARENA.ground);
        px.line(g, q[0], q[1] - 12, q[0], q[1] + 3, TEAM[seat].color);
        px.poly(
          g,
          [
            [q[0] - 4, q[1] + 4],
            [q[0] + 4, q[1] + 4],
            [q[0], q[1]],
          ],
          TEAM[seat].color,
        );
      });
    for (let seat = 0; seat < 2; seat++) {
      const p = w.players[seat],
        m = p.last[p.stone];
      if (m)
        r.queue(m.x, 0, m.z, (g) => {
          const q = r.w(m.x, 0, m.z);
          px.line(g, q[0] - 5, q[1] - 5, q[0] + 5, q[1] + 5, TEAM[seat].color);
          px.line(g, q[0] + 5, q[1] - 5, q[0] - 5, q[1] + 5, TEAM[seat].color);
        });
    }
    if (typeof document !== 'undefined')
      r.overlay((g) => {
        const cv = document.getElementById('target-inset');
        if (!cv || cv.hidden) return;
        const seat = this.seat || 0,
          a = r.w(seat ? 30 : 750, 0, 178),
          b = r.w(seat ? 215 : 935, 0, 25),
          ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 250, 160);
        ctx.drawImage(
          g.canvas,
          a[0],
          a[1],
          b[0] - a[0],
          b[1] - a[1],
          0,
          0,
          250,
          160,
        );
      });
    if (this.preview) {
      r.overlay((g) => {
        for (let i = 0; i < this.preview.points.length; i++) {
          const p = this.preview.points[i];
          px.disc(g, ...r.w(p[0], 0, p[1]), 1, '#f6e9b0');
        }
        for (const h of this.preview.hits) {
          const q = r.w(h.x, 0, h.z),
            col =
              h.kind === 'castle'
                ? '#fff0b1'
                : h.kind === 'crew' || h.kind === 'launcher'
                  ? '#f8bb83'
                  : '#e5d8ae';
          px.poly(
            g,
            [
              [q[0], q[1] - 7],
              [q[0] + 6, q[1]],
              [q[0], q[1] + 7],
              [q[0] - 6, q[1]],
            ],
            col,
          );
          px.disc(g, ...q, 2, '#41566b');
        }
      });
    }
  }
  catapult(r, seat) {
    const w = this.world,
      p = w.players[seat],
      px = this.E.px,
      dir = seat ? -1 : 1,
      power = powerOf(w, p),
      age = (w.tick - p.launchTick) * DT,
      repair = w.tick < p.launcherUntil,
      missing = repair ? clamp((p.launcherUntil - w.tick) * DT, 0, 1) : 0;
    const x = ARENA.launch[seat] + (seat ? 1 : -1) * missing * 19,
      z = ARENA.ground;
    r.shadow(x, 0, 21, 0.3, undefined, z);
    r.queue(x, 0, z, (g) => {
      const P = (dx, dz) => r.w(x + dx * dir, 0, z + dz),
        k = r.ppu;
      const beam = (a, b, width, base, edge) => {
        px.line(g, ...P(...a), ...P(...b), '#34333d', width * k + 2);
        px.line(g, ...P(...a), ...P(...b), base, width * k);
        px.line(
          g,
          ...P(a[0] - 0.5, a[1] + 1),
          ...P(b[0] - 0.5, b[1] + 1),
          edge,
          Math.max(1, k),
        );
      };
      beam([-23, 6], [23, 6], 6, '#936844', '#d0a36b');
      beam([-13, 8], [0, 31], 5, '#8b6545', '#d0a36b');
      beam([14, 8], [0, 31], 5, '#8b6545', '#c69b65');
      const release = age >= 0 && age < 0.24,
        rest = -0.12,
        angle = release
          ? -1.28 + age * 5
          : p.charge >= 0
            ? -0.12 + power * 1.05
            : p.ready > w.tick
              ? -0.45 + clamp((p.ready - w.tick) * DT, 0, 1) * 0.5
              : rest;
      const end = [Math.cos(angle) * -31, 25 + Math.sin(angle) * -31],
        tail = [Math.cos(angle) * 15, 25 + Math.sin(angle) * 15];
      beam(tail, end, 4, '#a5784c', '#edd19a');
      const cord = P(...end),
        anchor = P(-19, 9);
      px.line(g, ...cord, ...anchor, '#eadbb0', 1);
      px.disc(g, ...P(...end), 5 * k, '#453a3b');
      px.disc(g, ...P(end[0], end[1] + 1), 3 * k, '#b6a17e');
      if (age > 0.22 && p.ready <= w.tick)
        px.disc(g, ...P(end[0], end[1] + 2), 3 * k, STONES[p.stone].color);
      for (const wx of [-17, 17]) {
        const q = P(wx, 4);
        px.disc(g, ...q, 7 * k, '#2e3540');
        px.disc(g, ...q, 5.5 * k, '#a57d50');
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 + (p.charge >= 0 ? power * 9 : 0);
          px.line(
            g,
            q[0],
            q[1],
            q[0] + Math.cos(a) * 5 * k,
            q[1] + Math.sin(a) * 5 * k,
            '#e3bb7d',
            k,
          );
        }
        px.disc(g, ...q, 2 * k, '#4f5055');
      }
      px.disc(g, ...P(0, 26), 4 * k, '#a8b5bf');
      px.disc(g, ...P(0, 26), 2 * k, '#4a4d5a');
      const q = P(0, 13);
      px.poly(
        g,
        [
          [q[0] - 7 * k, q[1] - 4 * k],
          [q[0] + 7 * k, q[1] - 4 * k],
          [q[0] + 5 * k, q[1] + 5 * k],
          [q[0], q[1] + 8 * k],
          [q[0] - 5 * k, q[1] + 5 * k],
        ],
        TEAM[seat].color,
      );
      px.disc(g, q[0], q[1], 2 * k, '#ffe7ab');
      if (repair) {
        const q = P(0, 48);
        this.E.font.text(g, 'REPAIR', ...q, '#ffe0b0', {
          align: 'center',
          outline: false,
        });
      }
    });
  }
}
