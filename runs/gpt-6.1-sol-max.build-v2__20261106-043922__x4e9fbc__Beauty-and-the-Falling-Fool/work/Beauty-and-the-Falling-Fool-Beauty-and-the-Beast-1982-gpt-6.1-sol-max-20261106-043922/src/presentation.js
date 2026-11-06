/* Custom procedural art, driven only by authoritative state and native rigs. */
(() => {
  const F = FF,
    E = My3D2dge,
    { px, clamp, lerp } = E;
  E.MATERIALS.ffCream = { color: '#f4d8a6', pattern: 'stones', size: 7 };
  E.MATERIALS.ffStone = {
    color: '#8d8298',
    pattern: 'stones',
    size: 5,
    over: [['cracks']],
  };
  E.MATERIALS.ffPlane = { color: '#ec7960', pattern: 'metal' };
  E.SHAPES.ffBoulder = {
    about: "Hank's hand-hewn pocket boulder",
    mats: { s: 'ffStone' },
    parts: [['rock', 's', [0, 0, 6.5], 6.8, { seed: 23, rough: 0.26 }]],
  };
  E.SHAPES.ffBumper = {
    about: 'striped brass ledge bumper',
    mats: { c: 'copper', m: 'iron' },
    parts: [
      ['box', 'm', [0, 0, 0], [6, 5, 4]],
      ['box', 'c', [0, 0, 3], [5, 6, 7]],
      ['cyl', 'm', [0, 0, 10], 3.7, 1.5],
    ],
  };
  E.SHAPES.ffPlane = {
    about: 'Lambville red rescue biplane',
    mats: { r: 'ffPlane', c: '#ffdfac metal', d: 'iron', p: 'oak' },
    parts: [
      ['box', 'r', [0, 0, 0], [31, 7, 6]],
      ['box', 'c', [1, 0, 10], [24, 24, 1.5]],
      ['box', 'c', [1, 0, 0], [26, 24, 1.5]],
      ['mirror', 'y', ['box', 'd', [4, 9, 1], [1, 1, 9]]],
      ['mirror', 'y', ['box', 'd', [-5, 9, 1], [1, 1, 9]]],
      ['box', 'r', [-13, 0, 5], [5, 4, 11]],
      ['box', 'c', [-13, 0, 2], [9, 14, 1]],
      ['ball', 'd', [4, 0, 6], 3],
      ['box', 'p', [17, 0, -2], [1, 2, 13]],
      ['mirror', 'y', ['ball', 'd', [3, 5, -2], 2]],
    ],
  };
  F.climberRig = (seat, accent) =>
    new E.Humanoid({
      size: 0.86,
      build: seat ? 'heroic' : 'chibi',
      weapon: null,
      outfit: seat ? 'coat' : 'shirt',
      hair: seat ? 'ponytail' : 'short',
      hat: {
        style: seat ? 'band' : 'cap',
        color: accent || (seat ? '#f7bd65' : '#49bdbb'),
      },
      sleeves: 'long',
      cheat: 0.6,
      lean: 0.08,
      stride: 5,
      lift: 3.1,
      face: { eyes: 'big' },
      cape: seat ? { len: 3, width: 3, seg: 2 } : null,
      colors: {
        skin: seat ? '#c99072' : '#f2c19d',
        hair: seat ? '#4e263e' : '#6a3939',
        cloth: accent || (seat ? '#eeb34e' : '#55d1c8'),
        coat: '#c07e42',
        pants: seat ? '#563c65' : '#315673',
        boot: '#28354b',
        glove: '#fff0ca',
        belt: '#623d4d',
        trim: '#ffdf9c',
        eye: '#243047',
      },
    });
  class Presentation {
    constructor(game) {
      this.game = game;
      this.rigs = new Map();
      this.critters = new Map();
      this.lastEvent = 0;
      this.fx = [];
      this.hank = new E.Humanoid({
        size: 1.75,
        build: 'bulky',
        weapon: null,
        outfit: 'shirt',
        hair: 'bald',
        hat: { style: 'cap', color: '#814f62' },
        sleeves: 'short',
        hunch: 0.15,
        face: { eyes: 'big' },
        colors: {
          skin: '#d99d80',
          hair: '#69394b',
          cloth: '#b44e62',
          pants: '#3d3454',
          boot: '#29263c',
          belt: '#f3c476',
          trim: '#ffe5af',
          glove: '#d99d80',
        },
      });
      this.mabel = new E.Humanoid({
        size: 0.88,
        weapon: null,
        outfit: 'robe',
        hair: 'ponytail',
        sleeves: 'short',
        hat: { style: 'band', color: '#ffd58a' },
        colors: {
          skin: '#f3c19b',
          hair: '#713a49',
          cloth: '#e476a6',
          pants: '#d86b9b',
          boot: '#552b4d',
          trim: '#ffe2b0',
          glove: '#f9d2ae',
        },
      });
    }
    reset() {
      this.lastEvent = 0;
      this.fx = [];
      this.rigs.clear();
      this.critters.clear();
    }
    update(world, dt) {
      const s = world.snapshot(),
        reduced = this.game.settings.motion;
      for (const p of s.actors) {
        const v = world.actors.find((a) => a.id === p.id)?.visual;
        if (v) {
          p.x = v.x;
          p.z = v.z;
        }
        if (!this.rigs.has(p.id))
          this.rigs.set(p.id, F.climberRig(p.seat, p.color));
        const rig = this.rigs.get(p.id);
        const climbing = !!p.traversal;
        rig.update(dt, {
          x: p.x,
          y: 0,
          z: p.z,
          vx: p.tumble ? 0 : p.vx,
          vy: 0,
          vz: p.vz,
          facing: climbing
            ? -Math.PI / 2
            : p.vx < 0
              ? Math.PI
              : p.vx > 0
                ? 0
                : 0,
          air: !p.onGround && !climbing,
          climb: climbing,
          hurt: p.tumble > 0,
          flip: p.tumble ? 1 - p.tumble / 0.75 : 0,
          pose: p.tumble
            ? 'down'
            : s.rescued
              ? 'wave'
              : p.recovery > 1.4
                ? 'kneel'
                : null,
          expr: p.tumble ? 'wince' : p.powered || s.rescued ? 'smile' : null,
          sprint: p.powered,
          land: 0,
        });
      }
      const telling = s.hazards.find((h) => h.state === 'tell' && !h.dead);
      const launched = [...s.events].reverse().find((e) => e.type === 'launch');
      const since = launched ? (world.tick - launched.tick) / 120 : 100;
      const throwU = telling
        ? clamp((telling.age / telling.tell) * 0.33, 0, 0.32)
        : since < 0.55
          ? 0.33 + (since / 0.55) * 0.67
          : null;
      const top = world.data.finale
        ? 16 + 48 * Math.min(3, s.finaleBeat + 1)
        : s.windows.at(-1).z1;
      this.hankX = F.SECTIONS[s.section].goal + 12;
      this.hankZ = top + 3;
      this.hank.update(dt, {
        x: this.hankX,
        y: 0,
        z: this.hankZ,
        vx: s.phase === 'transition' ? 36 : 0,
        vy: 0,
        facing: Math.PI,
        pose: s.rescued ? 'die' : telling ? null : 'hips',
        attack: throwU !== null ? E.move('throw', throwU) : null,
        expr: s.rescued ? 'wince' : 'angry',
        down: s.rescued ? clamp(s.phaseTime / 1.2, 0, 1) : 0,
      });
      const heart = s.hearts.find((h) => h.age < 0.8 && !h.taken);
      this.mabel.update(dt, {
        x: this.hankX - 39,
        y: 0,
        z: this.hankZ,
        vx: 0,
        vy: 0,
        facing: Math.PI,
        pose: s.rescued ? 'wave' : heart ? 'cast' : 'wave',
        expr: 'smile',
      });
      for (const h of s.hazards.filter((h) =>
        ['rat', 'bird', 'bat'].includes(h.kind),
      )) {
        if (!this.critters.has(h.id))
          this.critters.set(
            h.id,
            new E.Blob({
              R: h.kind === 'rat' ? 3.8 : 3.3,
              ears: h.kind === 'rat' ? 'cat' : h.kind === 'bat' ? 'cat' : null,
              wings: h.kind !== 'rat',
              feet: h.kind === 'rat',
              tail: h.kind === 'rat',
              mouth: h.kind === 'bat' ? 'fangs' : true,
              colors: {
                dk: h.kind === 'bird' ? '#647b94' : '#332c4e',
                base:
                  h.kind === 'bird'
                    ? '#d9ece7'
                    : h.kind === 'rat'
                      ? '#9f8c9d'
                      : '#7663a0',
                lt: h.kind === 'bird' ? '#fff8de' : '#bba0c4',
                spec: '#ffeac7',
                eye: '#201f37',
                pupil: '#e87c8a',
              },
            }),
          );
        this.critters.get(h.id).update(dt, {
          walk: h.kind === 'rat' ? 1 : 0,
          flap: h.kind === 'bat' ? 1 : h.kind === 'bird' ? 0.4 : 0,
          squash: h.dead ? -0.35 : 0,
          look: [h.vx < 0 ? -1 : 1, 0],
        });
      }
      for (const e of s.events) {
        if (e.id <= this.lastEvent) continue;
        this.lastEvent = e.id;
        if (['smash', 'heart', 'hit', 'split', 'impact'].includes(e.type)) {
          for (let i = 0; i < 10; i++)
            this.fx.push({
              x: e.x || 0,
              z: (e.z || 0) + 7,
              vx: Math.cos(i * 2.4) * 25,
              vz: 30 + i * 5,
              age: 0,
              color:
                e.type === 'heart'
                  ? '#ffc0da'
                  : e.type === 'hit'
                    ? '#fff5c6'
                    : i % 2
                      ? '#ffcf83'
                      : '#c6e8df',
            });
        }
        if (e.type === 'land') {
          const p = s.actors.find((p) => p.id === e.actor);
          if (p) this.rigs.get(p.id)?.kick(-2);
        }
        if (e.type === 'jump') this.rigs.get(e.actor)?.kick(2);
      }
      for (const f of this.fx) {
        f.age += dt;
        f.x += f.vx * dt;
        f.z += f.vz * dt;
        f.vz -= 120 * dt;
      }
      this.fx = this.fx.filter((f) => f.age < 0.65);
      if (this.critters.size > 80) {
        for (const id of this.critters.keys())
          if (!s.hazards.some((h) => h.id === id)) this.critters.delete(id);
      }
    }
    sky(r, section, title = false) {
      const s = F.SECTIONS[section],
        g = r.ctx,
        t = this.game.settings.motion ? 0 : this.game.real;
      // Closely spaced flat bands keep the pixel sky clear and warm.
      const bands = 24;
      for (let i = 0; i < bands; i++) {
        const u = i / (bands - 1),
          c =
            u < 0.5
              ? E.mix(s.sky[0], s.sky[1], u * 2)
              : E.mix(s.sky[1], s.sky[2], u * 2 - 1);
        px.rect(g, 0, (i * r.H) / bands, r.W, r.H / bands + 1, c);
      }
      const sx = r.W * (title ? 0.76 : 0.17),
        sy = r.H * 0.24,
        tones = E.tones(section > 1 ? '#f1d9b3' : '#ffdfab');
      for (let k = 4; k >= 0; k--)
        px.disc(
          g,
          sx,
          sy,
          25 + k * 8,
          E.mix(s.sky[1], tones.base, (4 - k) / 9 + 0.12),
        );
      px.disc(g, sx, sy, 24, tones.lt);
      if (section > 1) {
        px.disc(g, sx + 7, sy - 5, 22, s.sky[0]);
        for (let i = 0; i < 45; i++) {
          const x = (i * 137.5) % r.W,
            y = (i * 43.7) % (r.H * 0.58);
          if (i % 4 || Math.sin(t + i) > 0) px.dot(g, x, y, '#e2d0c5');
        }
      }
      for (let layer = 0; layer < 3; layer++) {
        const step = layer === 0 ? 34 : layer === 1 ? 46 : 70,
          base = r.H * (0.72 + layer * 0.11),
          c = ['#7b738b', '#575c79', '#303f5d'][layer];
        for (let i = -2; i < r.W / step + 2; i++) {
          const x = i * step - ((t * (0.35 + layer * 0.2)) % step),
            h = 25 + E.hash2(i + 14, layer + 5) * (layer === 0 ? 95 : 60),
            w = step - 3;
          px.rect(g, x, base - h, w, r.H, c);
          px.rect(g, x + 3, base - h - 5, w - 6, 5, c);
          if (i % 3 === 0) {
            px.line(g, x + w * 0.6, base - h, x + w * 0.6, base - h - 19, c, 2);
          }
          if (layer > 0)
            for (let xx = 5; xx < w - 4; xx += 8)
              for (let y = base - h + 8; y < base; y += 12)
                if (E.hash2(i * 7 + xx, y) > 0.5)
                  px.rect(
                    g,
                    x + xx,
                    y,
                    2,
                    3,
                    layer === 1 ? '#ba9895' : '#dfb18e',
                  );
        }
      }
      for (let i = 0; i < 7; i++) {
        const x = ((i * 137 + t * (1 + (i % 3) * 0.2)) % (r.W + 130)) - 65,
          y = r.H * (0.18 + (i % 3) * 0.13);
        this.cloud(g, x, y, 26 + (i % 3) * 8, E.mix('#fff1ce', s.sky[1], 0.26));
      }
      // Flags and tiny distant pigeons make height move without obscuring lanes.
      for (let i = 0; i < 4; i++) {
        const x = ((t * 7 + i * 173) % (r.W + 40)) - 20,
          y = r.H * 0.26 + (i % 2) * 14;
        px.line(g, x - 3, y, x, y + Math.sin(t * 5 + i) * 2, '#4f536e');
        px.line(g, x, y + Math.sin(t * 5 + i) * 2, x + 3, y, '#4f536e');
      }
    }
    cloud(g, x, y, size, c) {
      px.rect(g, x - size, y, size * 2, 6, c);
      px.ell(g, x - size * 0.45, y, size * 0.65, 5, c);
      px.ell(g, x + size * 0.3, y - 3, size * 0.6, 8, c);
      px.ell(g, x - size * 0.1, y - 7, size * 0.4, 7, c);
    }
    rectWorld(r, x, z, w, h, c) {
      const [sx, sy] = r.w(x, 0, z + h);
      px.rect(r.ctx, sx, sy, w * r.view.scale, h * r.view.scale, c);
    }
    facade(r, world) {
      const s = world.data,
        g = r.ctx,
        sc = r.view.scale,
        top = s.floors.at(-1).z;
      const [x, yt] = r.w(s.x0, 0, top),
        [xr, yb] = r.w(s.x1, 0, 0),
        width = xr - x;
      px.rect(g, x + 10, yt + 5, width, Math.max(yb - yt, r.H - yt), s.shadow);
      px.poly(
        g,
        [
          [xr, yt],
          [xr + 12, yt + 7],
          [xr + 12, yb],
          [xr, yb],
        ],
        E.tones(s.shadow).sh,
      );
      px.rect(g, x, yt, width, yb - yt, s.color);
      const tones = E.tones(s.color);
      for (let z = 0; z < top; z += 6) {
        const y = r.w(0, 0, z)[1];
        px.rect(g, x, y, width, 1, tones.sh);
        for (let xx = s.x0 + (z % 12 ? 10 : 0); xx < s.x1; xx += 22) {
          const [bx, by] = r.w(xx, 0, z);
          px.rect(g, bx, by - 8 * sc, 1, 8 * sc, tones.sh);
          if (E.hash2(xx, z) > 0.62)
            px.rect(g, bx + 3, by - 6 * sc, 8 * sc, 1, tones.lt);
        }
      }
      for (const side of [s.x0, s.x1 - 9])
        for (let z = 3; z < top; z += 14) {
          this.rectWorld(
            r,
            side,
            z,
            9,
            12,
            z % 28 === 3 ? s.trim : E.mix(s.trim, s.color, 0.28),
          );
          this.rectWorld(r, side + 1, z + 9, 7, 1, '#ffedcc');
        }
      for (let f = 0; f < s.floors.length; f++) {
        const z = s.floors[f].z,
          [lx, ly] = r.w(s.x0 - 6, 0, z),
          [rx] = r.w(s.x1 + 6, 0, z);
        px.rect(g, lx + 2, ly + 3, rx - lx, 6, s.shadow);
        px.rect(g, lx, ly, rx - lx, 5, E.mix(s.trim, s.shadow, 0.22));
        px.rect(g, lx, ly, rx - lx, 1, '#fff0c7');
        px.rect(g, lx, ly + 5, rx - lx, 2, E.tones(s.shadow).deep);
        for (let xx = s.x0 + 12; xx < s.x1; xx += 32) {
          const [bx, by] = r.w(xx, 0, z);
          px.rect(g, bx, by + 7, 4 * sc, 3 * sc, s.shadow);
          px.rect(g, bx, by + 7, 3 * sc, 1, s.trim);
        }
        const label =
          world.section === 3
            ? 'R' + (f + 1)
            : String(world.section * 4 + f + 1).padStart(2, '0');
        E.font.text(g, label, lx - 16, ly - 9, s.trim, {
          outline: false,
          shadow: '#23334e',
        });
      }
      // Recessed openings with separate articulated shutters and a lit aperture.
      for (const w of world.windows()) {
        const [cx, cy] = r.w(w.x, 0, w.z0),
          ww = 24 * sc,
          hh = 34 * sc,
          topY = cy - hh;
        px.rect(g, cx - ww / 2 - 4, topY - 5, ww + 8, hh + 5, s.shadow);
        px.rect(g, cx - ww / 2 - 2, topY - 5, ww + 4, 3, s.trim);
        px.rect(g, cx - ww / 2, topY, ww, hh, '#26374e');
        px.rect(
          g,
          cx - ww / 2 + 3,
          topY + 3,
          ww - 6,
          hh - 3,
          w.aperture > 0.4 ? '#d98f6d' : '#52657c',
        );
        if (w.aperture > 0.15) {
          px.rect(g, cx - ww / 2 + 5, topY + 7, ww - 10, hh - 10, '#ffc891');
          px.rect(g, cx - ww / 2 + 7, topY + 9, ww - 14, hh - 15, '#ffe1a0');
          px.rect(g, cx + ww / 2 - 9, topY + 4, 5, hh - 5, '#b96b6f');
          this.game.lights.add(w.x, -1, w.z0 + 16, 32, 0.48, {
            color: '#ffc58a',
          });
        }
        const shutter = (ww / 2) * (1 - w.aperture),
          extend = 8 * sc * w.aperture;
        for (const dir of [-1, 1]) {
          const sx = dir < 0 ? cx - ww / 2 - extend : cx + extend;
          const sw = shutter + extend;
          px.rect(g, sx, topY, sw, hh, '#386a73');
          px.rect(g, sx + 1, topY + 1, Math.max(1, sw - 2), hh - 2, '#528e8a');
          for (let y = topY + 5; y < cy - 2; y += 5 * sc)
            px.rect(g, sx + 1, y, sw - 2, 1, '#2e5d6b');
          px.rect(g, sx + (dir < 0 ? sw - 2 : 1), topY, 1, hh, '#a3c7ad');
        }
        px.rect(g, cx - ww / 2 - 3, cy - 2, ww + 6, 3, s.trim);
        const marker =
          w.phase === 'warning'
            ? '!'
            : w.usable
              ? '↑'
              : w.phase === 'opening'
                ? '•'
                : null;
        if (marker) {
          const color = w.phase === 'warning' ? '#ffc967' : '#baffd4';
          px.rect(g, cx - 6, topY - 18, 13, 13, '#24374c');
          E.font.text(g, marker, cx, topY - 16, color, {
            align: 'center',
            outline: false,
          });
          if (w.usable)
            px.rect(
              g,
              cx - ww / 2,
              topY + hh - 3,
              ww *
                clamp(w.remaining / (world.cfg.open + world.cfg.warning), 0, 1),
              2,
              color,
            );
        }
        if (world.section === 1 && w.slot === 1) {
          const ay = topY - 4;
          px.poly(
            g,
            [
              [cx - ww / 2 - 4, ay],
              [cx + ww / 2 + 4, ay],
              [cx + ww / 2 + 9, ay + 8],
              [cx - ww / 2 - 9, ay + 8],
            ],
            '#f7d09e',
          );
          for (let i = 0; i < 5; i++)
            px.rect(
              g,
              cx - ww / 2 - 3 + (i * ww) / 5,
              ay,
              ww / 10,
              8,
              '#b9536c',
            );
        }
      }
      // Decorative windows occupy the middle column without pretending to be routes.
      for (let f = 0; f < s.lanes.length; f++) {
        const cx = 200,
          cz = 16 + 48 * f;
        const [sx, sy] = r.w(cx, 0, cz);
        px.rect(g, sx - 9 * sc, sy - 30 * sc, 18 * sc, 26 * sc, s.shadow);
        px.rect(
          g,
          sx - 7 * sc,
          sy - 28 * sc,
          14 * sc,
          23 * sc,
          f % 2 ? '#c19b84' : '#57647b',
        );
        px.rect(g, sx - 1, sy - 28 * sc, 2, 23 * sc, s.trim);
        px.rect(g, sx - 7 * sc, sy - 17 * sc, 14 * sc, 2, s.trim);
      }
      if (world.section === 0) {
        const [sx, sy] = r.w(200, 0, 14);
        px.rect(g, sx - 65, sy + 15, 130, 20, '#303f56');
        px.rect(g, sx - 63, sy + 17, 126, 1, '#f9d098');
        E.font.text(g, 'MUTTON  BUILDING', sx, sy + 22, '#ffe1b0', {
          align: 'center',
          outline: false,
        });
        r.prop('streetlamp', s.x0 - 24, -4, 0, {
          size: 0.9,
          color: '#345268',
          light: true,
        });
        r.prop('flowers', s.x1 + 18, -4, 0, { size: 0.8 });
      }
      if (world.section > 0)
        for (const b of s.bumpers)
          for (let f = 0; f < s.lanes.length; f++) {
            const recent = world.events.findLast(
              (e) =>
                e.type === 'bumper' &&
                Math.abs(e.x - b.x) < 2 &&
                world.tick - e.tick < 24,
            );
            const pulse =
              recent && !this.game.settings.motion
                ? Math.sin(((world.tick - recent.tick) / 24) * Math.PI) * 0.12
                : 0;
            r.shape('ffBumper', b.x, 1, 16 + f * 48, {
              scale: 0.65 + pulse,
              shadow: false,
            });
            const [bx, by] = r.w(b.x, 0, 29 + f * 48);
            E.font.text(
              g,
              b.behavior === 'drop' ? '↓' : b.x < (s.x0 + s.x1) / 2 ? '→' : '←',
              bx,
              by - 3,
              '#ffe3b0',
              { align: 'center', outline: false },
            );
          }
      const [vx, vy] = r.w(s.x1 - 15, -2, top + 2);
      px.line(g, vx, vy, vx, vy - 23, '#e6cfaf', 2);
      px.poly(
        g,
        [
          [vx, vy - 23],
          [vx - 19, vy - 21],
          [vx - 16, vy - 10],
          [vx, vy - 11],
        ],
        '#d05f7d',
      );
      E.font.text(g, 'M', vx - 9, vy - 20, '#ffe2b2', { outline: false });
      // Laundry and vines frame, but never cover, the actionable openings.
      if (world.section === 1) {
        const [a, b] = r.w(170, 0, 146),
          [c, d] = r.w(230, 0, 146);
        px.line(g, a, b, c, d, '#eee0b7');
        for (let i = 0; i < 4; i++) {
          px.rect(
            g,
            a + 8 + i * 18,
            b,
            11,
            12,
            ['#b3d7ce', '#f4c09b', '#d2a1b6', '#9ab8ce'][i],
          );
          px.rect(g, a + 9 + i * 18, b + 1, 9, 2, '#f5e2bd');
        }
      }
      r.prop('vines', s.x0 + 8, -3, top - 25, {
        anchor: 'top',
        size: 0.7,
        color: world.section > 1 ? '#4d7379' : '#628b6c',
      });
    }
    plane(r, x, z, { banner = null, scale = 1, flip = false } = {}) {
      r.shape('ffPlane', x, 2, z, { scale, flip, shadow: false });
      const [sx, sy] = r.w(x, 2, z);
      const g = r.ctx,
        ss = r.view.scale * scale;
      px.line(
        g,
        sx + 17 * ss,
        sy - 7 * ss,
        sx + 17 * ss,
        sy + 5 * ss,
        '#cbe5dd',
        Math.sin(this.game.real * 42) > 0 ? 2 : 1,
      );
      if (banner) {
        const bw = Math.min(230, E.font.width(banner) + 18),
          xx = sx - 40 * ss - bw;
        px.line(g, sx - 16 * ss, sy - 3 * ss, xx + bw, sy - 4 * ss, '#e8cda5');
        px.poly(
          g,
          [
            [xx, sy - 13],
            [xx + bw, sy - 13],
            [xx + bw, sy + 6],
            [xx - 5, sy + 6],
            [xx, sy - 3],
            [xx - 5, sy - 13],
          ],
          '#ffe0a7',
        );
        E.font.text(g, banner, xx + bw / 2, sy - 7, '#6b445c', {
          align: 'center',
          outline: false,
        });
      }
    }
    overview(r, world) {
      this.sky(r, world.section);
      const g = r.ctx,
        cx = r.W / 2,
        base = r.H - 33,
        t = world.phaseTime;
      for (let i = 0; i < 13; i++) {
        const width = 124 - i * 4,
          y = base - i * 22;
        px.rect(
          g,
          cx - width / 2,
          y - 22,
          width,
          22,
          i < (world.section + 1) * 4 ? '#d77870' : '#59647d',
        );
        px.rect(g, cx - width / 2 - 3, y - 2, width + 6, 3, '#ecc99d');
        for (let j = 0; j < 4; j++)
          px.rect(
            g,
            cx - width / 2 + 9 + (j * (width - 18)) / 4,
            y - 17,
            5,
            8,
            i < (world.section + 1) * 4 ? '#ffdc9c' : '#9bb4bd',
          );
      }
      this.plane(r, 200 + (t - 1.9) * 115, 170, { banner: world.data.banner });
      r.text('UPWARD AND ONWARD', r.W / 2, 25, '#ffe4b1', {
        align: 'center',
        scale: 2,
      });
      r.text(
        'Checkpoint saved  •  +1 spare chance',
        r.W / 2,
        r.H - 15,
        '#fff0cb',
        { align: 'center' },
      );
    }
    draw(r, world, { title = false, hitboxes = false, anchors = false } = {}) {
      if (world.phase === 'transition' && !title)
        return this.overview(r, world);
      this.sky(r, world.section, title);
      this.facade(r, world);
      const s = world.snapshot(),
        g = r.ctx,
        sc = r.view.scale;
      for (const h of s.hearts.filter((h) => !h.taken)) {
        const [x, y] = r.w(h.x, 0, h.z);
        r.queue(h.x, 3, h.z, (gg) => {
          px.blend(gg, 0.18, 'add', () => px.disc(gg, x, y, 16, '#ff91c0'));
          E.font.text(gg, '♥', x, y - 6, '#a4427c', {
            align: 'center',
            scale: 2,
            outline: '#fbe9cd',
          });
          E.font.text(gg, '♥', x - 1, y - 7, '#ffa1c5', {
            align: 'center',
            scale: 2,
            outline: false,
          });
        });
        this.game.lights.add(h.x, 0, h.z, 40, 0.7, { color: '#ff99b6' });
      }
      for (const h of s.hazards) {
        if (h.dead && h.death > 0.4) continue;
        if (h.state === 'tell') {
          const [x, y] = r.w(h.x, 0, h.z + 20);
          px.poly(
            g,
            [
              [x, y - 10],
              [x + 7, y + 3],
              [x - 7, y + 3],
            ],
            '#ffdc96',
          );
          E.font.text(g, '!', x, y - 5, '#613a55', {
            align: 'center',
            outline: false,
          });
          px.line(
            g,
            x,
            r.w(h.x, 0, h.baseZ)[1],
            x,
            r.w(h.x, 0, h.baseZ)[1] - 8,
            '#ffe9be',
            2,
          );
          continue;
        }
        const al = h.dead ? Math.max(0.1, 1 - h.death / 0.45) : 1;
        if (['rat', 'bird', 'bat'].includes(h.kind)) {
          const rig = this.critters.get(h.id);
          if (rig)
            r.actor(
              h.x,
              1,
              h.z,
              (gg, x, y) => {
                rig.draw(gg, x, y, r.view);
                if (h.kind === 'bird')
                  px.poly(
                    gg,
                    [
                      [x + 4, y - 6],
                      [x + 10, y - 4],
                      [x + 4, y - 2],
                    ],
                    '#eaa86d',
                  );
                if (h.kind === 'rat') {
                  px.line(gg, x - 5, y - 2, x - 13, y - 4, '#e9a9ac');
                  px.dot(gg, x + 5, y - 5, '#fff1ce');
                }
              },
              {
                alpha: al,
                outline: this.game.settings.contrast
                  ? h.kind === 'bat'
                    ? '#c8a3e6'
                    : '#fff0c7'
                  : false,
              },
            );
        } else {
          r.shape('ffBoulder', h.x, 1, h.z, {
            scale: h.fragment ? 0.63 : 1,
            shadow: false,
          });
          const [x, y] = r.w(h.x, 0, h.z + 7);
          if (h.kind === 'split') {
            px.line(g, x - 4 * sc, y - 5 * sc, x + 1, y - 1, '#2e3049', 2);
            px.line(g, x + 1, y - 1, x - 2 * sc, y + 6 * sc, '#2e3049', 2);
            px.line(g, x + 1, y - 1, x + 6 * sc, y + 1, '#e8cbab');
          }
          if (h.state === 'drop') {
            const [dx, dy] = r.w(h.x, 0, h.baseZ);
            px.line(g, dx - 7, dy, dx + 7, dy, '#ffce87', 2);
            E.font.text(g, '↓', dx, dy - 15, '#fff0c4', {
              align: 'center',
              outline: false,
            });
          }
        }
      }
      const ending = s.phase === 'departure' || s.phase === 'results',
        u = ending ? s.phaseTime : 0;
      const hankOff = ending ? Math.min(150, u * u * 48) : 0;
      if (!ending || u < 2.1)
        r.actor(
          this.hankX + (ending ? u * 13 : 0),
          0,
          this.hankZ - hankOff,
          (gg, x, y) => this.hank.draw(gg, x, y, r.view),
        );
      if (
        !ending &&
        s.hazards.some(
          (h) =>
            h.state === 'tell' &&
            ['rolling', 'bumper', 'split'].includes(h.kind),
        )
      ) {
        const hand = this.hank.hand();
        r.shape('ffBoulder', hand[0], hand[1] + 2, hand[2] - 4, {
          scale: 0.7,
          shadow: false,
        });
      }
      if (!ending || u < 4)
        r.actor(this.hankX - 39, 0, this.hankZ, (gg, x, y) =>
          this.mabel.draw(gg, x, y, r.view),
        );
      for (const p of s.actors) {
        if (p.gone) continue;
        const v = world.actors.find((a) => a.id === p.id)?.visual;
        if (v) {
          p.x = v.x;
          p.z = v.z;
        }
        const rig = this.rigs.get(p.id);
        if (!rig) continue;
        if (ending && u > 4) continue;
        if (p.powered) {
          const [x, y] = r.w(p.x, 0, p.z + 11);
          r.queue(p.x, -1, p.z, (gg) => {
            px.blend(gg, 0.28, 'add', () =>
              px.ell(gg, x, y, 14 * sc, 19 * sc, '#ffc1df'),
            );
            px.line(gg, x - 12 * sc, y, x - 8 * sc, y - 7 * sc, '#fff0bf', 2);
            px.line(gg, x + 12 * sc, y, x + 8 * sc, y + 7 * sc, '#fff0bf', 2);
          });
          this.game.lights.add(p.x, 0, p.z + 14, 40, 0.7, { color: '#ff9ebc' });
        }
        r.actor(p.x, 2, p.z, (gg, x, y) => rig.draw(gg, x, y, r.view), {
          outline: p.powered ? '#ffe0e7' : p.seat ? '#ffd8a0' : '#baffec',
          alpha:
            p.recovery > 0 &&
            this.game.settings.flashes > 0 &&
            Math.floor(this.game.real * 7) % 2
              ? 1 - 0.4 * this.game.settings.flashes
              : 1,
        });
        const [x, y] = r.w(p.x, 0, p.z + 30);
        r.overlay((gg) => {
          const label =
            world.mode === 'hub'
              ? `${p.seat + 1} ${String(p.name).slice(0, 14)}`
              : String(p.seat + 1);
          const width = Math.max(14, E.font.width(label) + 6);
          const yy = y - (world.mode === 'hub' ? p.seat * 10 : 0);
          px.rect(gg, x - width / 2, yy - 4, width, 10, '#233b54');
          E.font.text(
            gg,
            label,
            x,
            yy - 2,
            p.color || (p.seat ? '#ffd194' : '#9bf5de'),
            { align: 'center', outline: false },
          );
        });
        if (hitboxes) {
          const [a, b] = r.w(p.x - p.body?.w / 2 || p.x - 4.5, 0, p.z);
          px.line(g, a, b, a + 9 * sc, b, '#7affaa');
          px.line(g, a, b, a, b - 22 * sc, '#7affaa');
          px.line(g, a + 9 * sc, b, a + 9 * sc, b - 22 * sc, '#7affaa');
          px.line(g, a, b - 22 * sc, a + 9 * sc, b - 22 * sc, '#7affaa');
        }
      }
      if (anchors)
        for (const w of s.windows) {
          const [x, y] = r.w(w.x, 0, w.z0);
          px.line(g, x, y, x, r.w(w.x, 0, w.z1)[1], '#a4ffe0');
          E.font.text(g, w.id, x, y - 20, '#fff0c9', {
            align: 'center',
            outline: false,
          });
        }
      for (const f of this.fx)
        r.queue(f.x, 4, f.z, (gg) => {
          const [x, y] = r.w(f.x, 0, f.z);
          px.rect(gg, x, y, f.age < 0.3 ? 3 : 2, f.age < 0.3 ? 3 : 2, f.color);
        });
      if (ending) {
        const pxw =
          lerp(world.data.x0 - 100, world.data.goal, clamp(u / 3, 0, 1)) +
          Math.max(0, u - 5) ** 2 * 42;
        this.plane(r, pxw, world.data.floors.at(-1).z + 12, { scale: 1.3 });
        if (u > 3.5 && u < 7.8) {
          const [a, b] = r.w(pxw, 2, world.data.floors.at(-1).z + 25);
          r.overlay((gg) => {
            E.font.text(gg, '♥', a - 3, b - 8, '#ffd3dc', { scale: 2 });
          });
        }
        r.text(
          u < 2 ? 'HANK TOOK THE WRONG STEP.' : 'LOVE IS CLEARED FOR TAKEOFF.',
          r.W / 2,
          30,
          '#ffe4bc',
          { align: 'center', scale: 2 },
        );
      }
      if (!title && !ending) this.hud(r, world);
    }
    hud(r, w) {
      const g = r.ctx,
        s = w.snapshot(),
        cx = r.W / 2;
      px.rect(g, 0, 0, r.W, 29, '#22344d');
      px.rect(g, 0, 28, r.W, 1, '#e7bd91');
      E.font.text(g, 'SPARES', 13, 7, '#b7cbd0', { outline: false });
      for (let i = 0; i < s.chances; i++) {
        const x = 57 + i * 9;
        px.disc(g, x, 9, 2, '#adf2db');
        px.rect(g, x - 2, 12, 5, 6, '#68bfb7');
        px.line(g, x - 1, 18, x - 3, 21, '#b3e9df');
        px.line(g, x + 1, 18, x + 3, 21, '#b3e9df');
      }
      E.font.text(
        g,
        `${String(s.section + 1).padStart(2, '0')} / 04  ${w.data.name}`,
        cx,
        10,
        '#fce0b4',
        { align: 'center', outline: false, scale: r.W > 800 ? 2 : 1 },
      );
      E.font.text(g, String(s.score).padStart(6, '0'), r.W - 60, 9, '#fff1ca', {
        align: 'right',
        outline: false,
        scale: 1,
      });
      const lastLesson = [...s.events]
        .reverse()
        .find((e) => e.type === 'lesson');
      const line = s.regroup
        ? `REGROUP  ${Math.ceil(s.regroup.until - s.time)}  •  Your pal is on the way.`
        : s.powerUntil > s.time
          ? `HEART RUSH  ${Math.ceil(s.powerUntil - s.time)}s  •  Windows still have rules!`
          : lastLesson?.text || w.data.lessons[0];
      const device = this.game.input.lastDevice,
        big = r.W > 800,
        footer = big && device !== 'touch' ? 38 : 25;
      px.rect(g, 0, r.H - footer, r.W, footer, '#22344d');
      E.font.text(g, line, cx, r.H - footer + 5, '#ffe5b7', {
        align: 'center',
        outline: false,
        scale: r.W > 800 ? 2 : 1,
      });
      if (device !== 'touch')
        E.font.text(
          g,
          `${this.game.input.label('left')} / ${this.game.input.label('right')} MOVE   ↑ / ↓ WINDOW   ${this.game.input.label('jump')} JUMP   ${this.game.input.label('pause')} MENU`,
          cx,
          r.H - (big ? 16 : 10),
          '#b7d6d7',
          { align: 'center', outline: false, scale: big ? 2 : 1 },
        );
      if (s.unranked)
        E.font.text(g, 'UNRANKED', 10, 36, '#ffe4b0', { outline: false });
      if (s.powerUntil > s.time) {
        const n = clamp((s.powerUntil - s.time) / w.cfg.heart, 0, 1),
          ww = 100;
        px.rect(g, cx - ww / 2, 35, ww, 5, '#593a63');
        px.rect(
          g,
          cx - ww / 2,
          35,
          ww * n,
          5,
          n < 0.25 ? '#ffd88f' : '#fbaacb',
        );
      }
    }
  }
  F.Presentation = Presentation;
})();
