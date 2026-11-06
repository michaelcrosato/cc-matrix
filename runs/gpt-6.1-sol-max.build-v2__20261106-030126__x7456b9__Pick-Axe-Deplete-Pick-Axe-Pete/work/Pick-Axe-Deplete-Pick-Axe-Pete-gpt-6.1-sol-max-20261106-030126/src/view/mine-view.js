/* Native pixel composition, props, lights and humanoids. No gameplay writes. */
(() => {
  const P = globalThis.PD,
    E = globalThis.My3D2dge,
    { px } = E;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const path = (r, g, points, color, thick = 1) => {
    for (let i = 1; i < points.length; i++)
      px.line(
        g,
        ...r.w(points[i - 1][0], 0, points[i - 1][1]),
        ...r.w(points[i][0], 0, points[i][1]),
        color,
        thick,
      );
  };
  const symbol = (g, x, y, i, c, size = 5) => {
    if (i === 0)
      px.poly(
        g,
        [
          [x, y - size],
          [x + size, y + size],
          [x - size, y + size],
        ],
        c,
      );
    else if (i === 1)
      px.poly(
        g,
        [
          [x, y - size - 1],
          [x + size, y],
          [x, y + size + 1],
          [x - size, y],
        ],
        c,
      );
    else {
      px.line(g, x - size, y, x + size, y, c, 2);
      px.line(g, x, y - size, x, y + size, c, 2);
      px.line(g, x - size + 1, y - size + 1, x + size - 1, y + size - 1, c);
      px.line(g, x - size + 1, y + size - 1, x + size - 1, y - size + 1, c);
    }
  };
  class MineView {
    constructor(game) {
      this.game = game;
      this.rigs = new Map();
      this.chamber = -1;
      this.back = null;
      this.stamp = '';
      this.collision = false;
      this.navigation = false;
      this.impact = 0;
      game.lights.enabled = true;
      game.lights.ambient = 0.77;
      game.lights.screen = true;
      game.cam.smooth = 0;
      game.cam.bounds = null;
      game.r.rim = '#ffe3b4';
      game.r.rimAlpha = 0.3;
    }
    update(dt, m, title = false) {
      this.impact = Math.max(0, this.impact - dt);
      const g = this.game,
        portrait = window.innerHeight > window.innerWidth * 1.2,
        narrow = window.innerWidth < 650;
      const res = portrait && narrow ? [440, 500] : [800, 500];
      const stamp = [m.chamber, g.W, g.H, title, res.join(), m.route].join(':');
      if (stamp !== this.stamp) {
        this.stamp = stamp;
        g.screen.setOptions({ res, expand: true });
        const width = title && !narrow ? g.W * 0.54 : g.W - (narrow ? 22 : 70);
        const availableH = portrait ? Math.min(g.H - 220, 590) : g.H - 122;
        const zoom = clamp(Math.min(width / (416 * 1.5), availableH / (m.room.height * 1.5)), 0.5, 1.18);
        g.setZoom(zoom);
        g.cam.snap = true;
        this.back = null;
      }
      g.cam.offset = [title && !narrow ? g.W * 0.22 : 0, portrait ? -30 : 14];
      g.focus(208, 0, m.room.height / 2 + 4);
      for (const [i, p] of m.players.entries()) {
        if (!this.rigs.has(p.id)) this.rigs.set(p.id, P.makeMinerRig(i));
        const display = p.poseT <= 0 ? { ...p, pose: null } : p;
        P.updateMinerRig(this.rigs.get(p.id), display, dt);
      }
    }
    event(e, settings = {}) {
      const g = this.game,
        x = e.x || 0,
        z = e.z || 0;
      if (['chop', 'collision', 'redirect', 'break', 'hurt'].includes(e.type)) {
        const color = e.type === 'redirect' ? '#84f4df' : e.type === 'hurt' ? '#ff9baa' : '#ffd48c';
        g.particles.sparks(x, 0, z, e.type === 'collision' ? 18 : 8, null, {
          color,
          speed: e.type === 'collision' ? 85 : 45,
        });
        this.impact = e.type === 'collision' ? 0.14 : 0.07;
        if (!settings.reduceMotion) g.shake((e.type === 'collision' ? 2 : 0.7) * (settings.shake ?? 0.5));
      }
      if (['pick', 'key', 'rescue', 'waveClear'].includes(e.type))
        g.particles.glints(x, 0, z + 10, 12, '#ffe8b0', 18);
      if (e.amount)
        g.particles.text(x, 0, z + 8, '+' + e.amount, e.type === 'evade' ? '#a4e9e0' : '#ffe29b', {
          bounce: false,
        });
      if (e.type === 'door') g.particles.glints(x, 0, z + 22, 24, P.ROUTES[e.door].color, 32);
      if (e.type === 'break')
        for (let i = 0; i < 6; i++)
          g.particles.sparks(x, 0, z, 1, i, { color: i % 2 ? '#c4d4d7' : '#d7a367', speed: 25 });
    }
    background(r, m) {
      const W = r.bw,
        H = r.bh,
        pal = m.room.def.palette;
      if (!this.back || this.back.width !== W || this.back.height !== H) {
        this.back = E.mkCanvas(W, H);
        const g = this.back.getContext('2d'),
          rnd = new P.Random(3801 + m.chamber * 729);
        px.rect(g, 0, 0, W, H, pal[0]);
        for (let i = 0; i < 48; i++) {
          const x = rnd.next() * W,
            y = rnd.next() * H,
            w = 25 + rnd.next() * 90,
            h = 20 + rnd.next() * 120;
          px.poly(
            g,
            [
              [x, y],
              [x + w * 0.55, y - h * 0.2],
              [x + w, y + h * 0.4],
              [x + w * 0.7, y + h],
              [x - 12, y + h * 0.8],
            ],
            i % 3 ? pal[1] : E.tones(pal[1]).deep,
          );
          px.line(g, x + 2, y + 1, x + w * 0.55, y - h * 0.2 + 1, E.tones(pal[1]).base);
        }
        for (let layer = 0; layer < 3; layer++)
          for (let x = -40; x < W + 40; x += 27 + rnd.next() * 24) {
            const h = 22 + rnd.next() * (45 + layer * 28);
            px.poly(
              g,
              [
                [x, 0],
                [x + 34, 0],
                [x + 19, h],
                [x + 10, h * 0.7],
              ],
              layer === 0 ? pal[2] : layer === 1 ? pal[1] : pal[0],
            );
            px.poly(
              g,
              [
                [x, H],
                [x + 38, H],
                [x + 16, H - h * 0.65],
              ],
              layer === 1 ? pal[1] : pal[0],
            );
          }
        for (let i = 0; i < 320; i++) {
          const x = rnd.next() * W,
            y = rnd.next() * H;
          px.rect(g, x, y, rnd.next() > 0.85 ? 3 : 1, 1, i % 5 === 0 ? pal[2] : '#1a1d2c');
        }
        for (let side = 0; side < 2; side++) {
          const x = side ? W - 22 : 22;
          px.rect(g, x, 0, 8, H, '#0e111b');
          px.rect(g, x + 2, 0, 2, H, '#29313d');
          for (let y = 20; y < H; y += 30) {
            px.rect(g, x - 2, y, 12, 3, '#42414a');
            px.rect(g, x, y + 1, 1, 1, '#a38670');
          }
        }
      }
      r.ctx.drawImage(this.back, 0, 0);
      const g = r.ctx,
        time = this.game.real;
      for (let i = 0; i < 26; i++) {
        const x = (i * 103.17 + Math.sin(time * 0.14 + i) * 12) % W,
          y = (i * 57.3 + time * (1 + (i % 3))) % H;
        px.rect(g, x, y, 1, 1, i % 4 ? '#635251' : '#b99c77');
      }
      // A cutaway chamber sits inside a larger, authored mine silhouette.
      const a = r.w(14, 0, m.room.height),
        b = r.w(402, 0, 0),
        rim = E.tones(pal[2]);
      px.poly(
        g,
        [
          [a[0] - 15, a[1] + 8],
          [a[0] + 6, a[1] - 4],
          [b[0] - 6, a[1] - 4],
          [b[0] + 15, a[1] + 20],
          [b[0] + 10, b[1]],
          [a[0] - 10, b[1]],
        ],
        '#0a1019',
      );
      px.line(g, a[0] + 3, a[1] - 3, b[0] - 5, a[1] - 3, rim.sh, 3);
      // Mineral seams and braced timbers are deliberately behind the action.
      for (let tier = 0; tier < m.room.def.tiers; tier++) {
        const z = P.floorZ(tier);
        path(
          r,
          g,
          [
            [30, z + 7],
            [52, z + 30],
            [117, z + 32],
            [135, z + 42],
          ],
          pal[1],
          2,
        );
        path(
          r,
          g,
          [
            [278, z + 19],
            [292, z + 30],
            [335, z + 37],
            [350, z + 31],
          ],
          pal[2],
          1,
        );
        path(
          r,
          g,
          [
            [25, z],
            [25, z + 38],
            [44, z + 38],
          ],
          '#543e36',
          Math.max(2, 4 * r.ppu),
        );
        path(
          r,
          g,
          [
            [391, z],
            [391, z + 38],
            [372, z + 38],
          ],
          '#543e36',
          Math.max(2, 4 * r.ppu),
        );
        path(
          r,
          g,
          [
            [25, z + 34],
            [42, z + 20],
          ],
          '#8c6347',
          Math.max(1, 2 * r.ppu),
        );
        path(
          r,
          g,
          [
            [391, z + 34],
            [374, z + 20],
          ],
          '#8c6347',
          Math.max(1, 2 * r.ppu),
        );
        const lp = r.w(25, 0, z + 37);
        px.rect(g, lp[0] - 1, lp[1], 3, 2, '#d49d60');
        const rp = r.w(391, 0, z + 37);
        px.rect(g, rp[0] - 1, rp[1], 3, 2, '#d49d60');
        E.font.text(g, String(tier + 1).padStart(2, '0'), a[0] - 13, r.w(0, 0, z + 14)[1], '#766b6d', {
          outline: false,
        });
      }
      if (m.room.def.extraction) {
        const z = m.room.height - 44;
        path(
          r,
          g,
          [
            [-22, 5],
            [-22, z],
            [432, z],
            [432, 5],
          ],
          '#665068',
          5,
        );
        path(
          r,
          g,
          [
            [-20, 5],
            [-20, z],
            [430, z],
          ],
          '#a07081',
          1,
        );
        for (let i = 0; i < 3; i++) {
          const a = r.w(150 + i * 58, 0, m.room.height + 5);
          px.disc(g, a[0], a[1], 6, '#161c2b');
          symbol(g, a[0], a[1], i, m.finale.cleared > i ? P.ROUTES[i].color : '#4b4352', 4);
        }
      }
      // Safe lower catch basin: every fall returns to a reachable ledge.
      const net = r.w(22, 0, -6),
        end = r.w(394, 0, -6);
      px.line(g, net[0], net[1], end[0], end[1], '#4e5f64', 2);
      for (let x = net[0]; x < end[0]; x += 8) px.line(g, x, net[1] - 3, x + 6, net[1] + 4, '#34414a');
    }
    draw(r, m, options = {}) {
      this.background(r, m);
      m.room.level.draw(r);
      const A = P.ASSETS,
        time = this.game.real,
        flash = !options.reduceFlashes;
      for (const [kind, x, tier] of m.room.def.props) {
        const z = P.floorZ(tier);
        if (kind === 'cart') r.shape(A.oreCart, x, -12, z, { scale: 0.8, shadow: true });
        else if (kind === 'crystal') r.shape('crystal', x, -12, z, { scale: 0.75, mats: { c: 'PD:cyan' } });
        else r.shape(kind, x, -12, z, { scale: 0.65 });
      }
      for (let t = 0; t < m.room.def.tiers; t++) {
        r.shape(A.lamp, t % 2 ? 383 : 33, -7, P.floorZ(t) + 23, { scale: 0.65, light: true, shadow: false });
        if (t % 2 === 0) r.prop('cobweb', 365, -15, P.floorZ(t) + 36, { size: 0.65, anchor: 'top' });
      }
      for (const l of m.room.ladders) {
        if (!l.temporary) continue;
        r.queue(l.x, -1, l.from, (g) => {
          const color =
            l.state === 'warning'
              ? !flash || Math.floor(time * 5) % 2
                ? '#ffc15e'
                : '#8b7150'
              : l.state === 'forming'
                ? '#8be3dc'
                : '#77918e';
          if (['warning', 'forming'].includes(l.state)) {
            const count = l.state === 'forming' ? Math.floor((1 - l.timer / 1.2) * 7) : 7;
            path(
              r,
              g,
              [
                [l.x - 5, l.from],
                [l.x - 5, l.to],
              ],
              color,
              1,
            );
            path(
              r,
              g,
              [
                [l.x + 5, l.from],
                [l.x + 5, l.to],
              ],
              color,
              1,
            );
            for (let i = 0; i < count; i++)
              path(
                r,
                g,
                [
                  [l.x - 5, l.from + i * 7],
                  [l.x + 5, l.from + i * 7],
                ],
                color,
                1,
              );
          }
          const q = r.w(l.x, 0, l.to + 4);
          if (l.state === 'inactive' || l.state === 'expired') {
            px.line(g, q[0] - 5, q[1], q[0] - 2, q[1], '#5e6c73');
            px.line(g, q[0] + 2, q[1], q[0] + 5, q[1], '#5e6c73');
          } else if (l.state === 'warning')
            E.font.text(g, '!', q[0], q[1] - 6, '#ffdb90', { align: 'center', outline: '#18202c' });
        });
      }
      for (const d of m.room.doors) {
        const active = m.keyOwner !== null;
        r.shape([A.doorAmber, A.doorCyan, A.doorRose][d.id], d.x, -4, d.z, { scale: 0.93, light: false });
        if (active || d.warning > 0)
          this.game.lights.add(d.x, 0, d.z + 15, active ? 50 : 32, active ? 0.9 : 0.65, { color: d.color });
        r.queue(d.x, 3, d.z, (g) => {
          const s = r.w(d.x, 0, d.z + 38),
            feet = r.w(d.x, 0, d.z - 1);
          symbol(
            g,
            s[0],
            s[1] - (active && !options.reduceMotion ? Math.sin(time * 3) * 2 : 0),
            d.id,
            active ? d.color : '#938779',
            4,
          );
          if (d.warning > 0) {
            px.rect(g, feet[0] - 22, feet[1] - 1, 44, 2, '#291b26');
            px.rect(g, feet[0] - 22, feet[1] - 1, 44 * (1 - d.warning / 1.15), 2, d.color);
            E.font.text(g, '!', s[0] + 9, s[1] - 4, '#ffe2b4', { outline: '#20141c' });
          }
        });
      }
      for (const warning of m.warnings.filter((w) => w.type === 'pair')) {
        r.queue(warning.x, -2, warning.z, (g) => {
          const a = r.w(warning.x - 40, 0, warning.z),
            b = r.w(warning.x + 40, 0, warning.z),
            y = a[1] - 5;
          for (let x = a[0]; x < b[0]; x += 8) px.rect(g, x, y, 4, 1, '#eab86e');
          px.poly(
            g,
            [
              [a[0], y - 3],
              [a[0] + 5, y],
              [a[0], y + 3],
            ],
            '#f5c87c',
          );
          px.poly(
            g,
            [
              [b[0], y - 3],
              [b[0] - 5, y],
              [b[0], y + 3],
            ],
            '#f5c87c',
          );
        });
      }
      for (const rock of m.rocks) {
        if (rock.dead) continue;
        if (rock.redirect !== null)
          r.queue(rock.x, -1, rock.z, (g) => {
            const q = r.w(rock.x, 0, rock.z),
              owner = m.players.find((p) => p.id === rock.redirect),
              c = rock.grace > 0 ? owner?.color || '#d6fff4' : '#eeacb9';
            for (let i = 1; i < 5; i++)
              px.rect(g, q[0] - Math.sign(rock.vx) * i * 6, q[1] + i * 1.2, 4 - i * 0.5, 2, c);
            E.font.text(
              g,
              'P' + (Number(rock.redirect) + 1),
              q[0] - 12,
              q[1] - 15,
              owner?.color || '#d6fff4',
              {
                align: 'center',
                outline: '#141b25',
                font: 'tiny',
              },
            );
            if (rock.grace <= 0)
              E.font.text(g, '!', q[0], q[1] - 15, '#ffb9b5', { align: 'center', outline: '#24151c' });
          });
        const scale = rock.kind === 'hopper' ? 0.82 : 1;
        r.shape(A[rock.kind], rock.x, 0, rock.z - (rock.kind === 'heavy' ? 9 : 7 * scale), {
          scale,
          facing: Math.PI / 2 + rock.spin,
          shadow: true,
          flash: flash && rock.grace > 0.35,
        });
        if (rock.kind === 'heavy' && rock.hp < 3)
          r.textAt(rock.x, 1, rock.z + 15, 'HP ' + rock.hp, '#e0b8d9', {
            align: 'center',
            outline: '#101621',
          });
      }
      for (const item of [...m.pickups, ...(m.key ? [m.key] : [])]) {
        if (item.life < 5 && flash && Math.floor(time * 5) % 2) continue;
        r.shape(A[item.kind], item.x, 0, item.z - 7, {
          scale: item.kind === 'key' ? 0.8 : 0.75,
          light: item.kind === 'key',
        });
        r.queue(item.x, 2, item.z, (g) => {
          const q = r.w(item.x, 0, item.z + 16),
            c = item.kind === 'key' ? '#ffdc86' : '#afeeea';
          px.line(g, q[0], q[1] - 7, q[0], q[1] - 1, c);
          const dir = item.kind === 'key' ? -1 : 1,
            y = q[1] + dir * 4;
          px.line(g, q[0] - 3, y - dir * 3, q[0], y, c);
          px.line(g, q[0] + 3, y - dir * 3, q[0], y, c);
          if (item.life < 5)
            E.font.text(g, String(Math.ceil(item.life)), q[0] + 10, q[1], c, { outline: '#101522' });
        });
      }
      for (const p of m.players) {
        const b = p.body,
          rig = this.rigs.get(p.id);
        if (!rig) continue;
        if (p.down) {
          r.shape(A.rescue, b.x, 1, b.z, { scale: 0.9, light: true });
          r.textAt(b.x, 1, b.z + 30, '+ RESCUE', '#ffb4c4', { align: 'center', outline: '#131821' });
          continue;
        }
        this.game.lights.add(b.x, 0, b.z + 22, 35, 0.5, { color: '#ffe4b0' });
        r.shadow(b.x, 0, 6, 0.5, '#070a14', this.game.r ? m.room.level.groundBelow(b.x, b.z + 1) || 0 : 0);
        r.actor(b.x, 1, b.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), {
          outline: true,
          xray: { color: p.color },
          alpha: p.invuln > 0 && flash && Math.floor(time * 9) % 2 ? 0.7 : 1,
          flash: p.invuln > 0 && p.invuln < 1.8 && flash && Math.floor(time * 10) % 2 === 0,
          rim: true,
        });
        if (p.action?.busy)
          rig.drawSmear(
            r,
            p.actionKind === 'redirect'
              ? ['#ddfff5', '#9bf5dc', '#62beac', '#375c5f']
              : ['#fff5d4', '#f9d594', '#d79b58', '#734942'],
          );
        r.queue(b.x, 2, b.z, (g) => {
          const q = r.w(b.x, 0, b.z + 29);
          if (m.players.length > 1) {
            px.rect(g, q[0] - 5, q[1] - 7, 10, 2, p.color);
            E.font.text(g, String(m.players.indexOf(p) + 1), q[0], q[1] - 17, p.color, {
              align: 'center',
              outline: '#0b111e',
            });
          }
          if (p.tool === 0)
            E.font.text(g, 'NO PICK', q[0], q[1] - 7, '#c7d8db', {
              align: 'center',
              outline: '#101821',
              font: 'tiny',
            });
          if (p.actionKind === 'redirect' && p.action?.busy) {
            const sy = b.z + 12,
              rise = p.aim < -0.3 ? 4 : p.aim > 0.3 ? 25 : 18;
            path(
              r,
              g,
              [
                [b.x + b.facing * 10, sy],
                [b.x + b.facing * 23, sy + rise * 0.75],
                [b.x + b.facing * 39, sy + rise],
              ],
              '#a9f6dd',
              1,
            );
          }
        });
        if (m.keyOwner === p.id) {
          r.shape(A.key, b.x, 2, b.z + 34 + (options.reduceMotion ? 0 : Math.sin(time * 4) * 2), {
            scale: 0.55,
            light: true,
          });
          r.queue(b.x, 1, b.z, (g) => {
            const q = r.w(b.x, 0, b.z + 14);
            for (let i = 0; i < 4; i++)
              px.rect(g, q[0] - b.facing * (i * 6 + 5), q[1] + Math.sin(time * 4 - i) * 3, 2, 2, '#e4b765');
          });
        }
      }
      if (m.room.def.extraction) {
        r.shape(A.extractor, 442, -8, P.floorZ(2), { scale: 1.1, light: true });
        r.queue(442, -7, P.floorZ(2), (g) => {
          const moving = m.finale.active && !options.reduceMotion ? Math.sin(time * 8) * 5 : 0;
          path(
            r,
            g,
            [
              [418, P.floorZ(2) + 10],
              [418, P.floorZ(2) + 24 + moving],
            ],
            '#c5b9a7',
            3,
          );
          path(
            r,
            g,
            [
              [466, P.floorZ(2) + 10],
              [466, P.floorZ(2) + 24 - moving],
            ],
            '#c5b9a7',
            3,
          );
          const q = r.w(442, 0, P.floorZ(2) + 24);
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 + (options.reduceMotion ? 0 : time * (m.finale.active ? 3 : 0.2));
            px.line(
              g,
              q[0],
              q[1],
              q[0] + Math.cos(a) * 10 * r.ppu,
              q[1] + Math.sin(a) * 10 * r.ppu,
              '#c69b66',
              2,
            );
          }
        });
      }
      if (this.collision || this.navigation) this.debug(r, m);
      if (m.status === 'transition')
        r.overlay((g) => {
          const amount = Math.sin((1 - m.transition / 1.6) * Math.PI);
          px.blend(g, Math.min(0.94, amount), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0d1420'));
          if (amount > 0.45) {
            const d = P.ROUTES[m.route];
            E.font.title(g, d.name.toUpperCase(), r.W / 2, r.H / 2 - 12, {
              scale: 3,
              align: 'center',
              colors: ['#fff0cf', d.color, '#785445'],
            });
            E.font.text(g, 'A fresh mine. A fresh mistake.', r.W / 2, r.H / 2 + 24, '#e6c8a0', {
              align: 'center',
              outline: false,
            });
          }
        });
      if (m.relief > 0 && !options.title)
        r.text('DUST SETTLING · SAFE ENTRY', r.W / 2, r.H - 69, '#d7c193', {
          align: 'center',
          outline: '#111721',
        });
    }
    debug(r, m) {
      r.overlay((g) => {
        if (this.collision)
          for (const p of m.players) {
            const b = p.body;
            path(
              r,
              g,
              [
                [b.x - b.w / 2, b.z],
                [b.x - b.w / 2, b.z + b.h],
                [b.x + b.w / 2, b.z + b.h],
                [b.x + b.w / 2, b.z],
                [b.x - b.w / 2, b.z],
              ],
              '#7fffe1',
            );
            if (p.action?.active)
              path(
                r,
                g,
                [
                  [b.x, b.z + 2],
                  [b.x + b.facing * 36, b.z + 2],
                  [b.x + b.facing * 36, b.z + 35],
                  [b.x, b.z + 35],
                ],
                '#ffce7a',
              );
          }
        if (this.navigation)
          for (const l of m.room.ladders)
            path(
              r,
              g,
              [
                [l.x, l.from],
                [l.x, l.to],
              ],
              l.temporary ? '#f1a8c4' : '#67ffcf',
              2,
            );
      });
    }
  }
  P.MineView = MineView;
})();
