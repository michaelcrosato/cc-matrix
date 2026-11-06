(() => {
  "use strict";
  const G = globalThis.Edge,
    E = My3D2dge,
    { px } = E,
    TAU = Math.PI * 2;
  const palettes = G.SECTORS.map((s) => ({ ...s, tones: E.tones(s.color), heart: E.tones(s.core) }));
  G.ring = (g, x, y, r, width, color) => {
    for (let i = 0, n = Math.ceil(r * 6); i < n; i++) {
      const a = (i / n) * TAU,
        b = ((i + 1) / n) * TAU;
      px.line(
        g,
        x + Math.cos(a) * r,
        y + Math.sin(a) * r,
        x + Math.cos(b) * r,
        y + Math.sin(b) * r,
        color,
        width,
      );
    }
  };
  G.glow = (g, x, y, r, c, a = 0.25) =>
    px.blend(g, a, "add", () => {
      for (let k = 4; k >= 1; k--) px.disc(g, x, y, (r * k) / 4, c);
    });
  class InsectRig {
    constructor(shape = 0) {
      this.shape = shape;
      this.state = {};
      this.t = 0;
      this.bank = 0;
      this.a = 0;
      this.recoil = 0;
      this.lastShots = 0;
    }
    update(dt, state) {
      this.state = { ...state };
      if ((state.shots || 0) > this.lastShots) this.recoil = 1;
      this.lastShots = state.shots || 0;
      this.recoil = Math.max(0, this.recoil - dt * 10);
      this.t += dt;
      this.bank = E.approach(this.bank, (state.vy || 0) / 120, dt * 7);
      const a = Math.atan2(state.ay || 0, state.ax ?? 1);
      this.a += Math.atan2(Math.sin(a - this.a), Math.cos(a - this.a)) * Math.min(1, dt * 18);
    }
    draw(g, x, y, view, scale = 1) {
      const s = this.state,
        t = this.t,
        angle = this.a,
        ready = s.charge >= (s.threshold || 5),
        color = s.color || "#84f9d1",
        pal = E.tones(color);
      const point = (a, b) => [
        x + ((a - this.recoil * 1.5) * Math.cos(angle) - b * Math.sin(angle)) * scale,
        y + ((a - this.recoil * 1.5) * Math.sin(angle) + b * Math.cos(angle)) * scale,
      ];
      const poly = (pts, c) =>
        px.poly(
          g,
          pts.map((p) => point(...p)),
          c,
        );
      const line = (a, b, c, w = 1) => {
        const p = point(...a),
          q = point(...b);
        px.line(g, ...p, ...q, c, w * scale);
      };
      const disc = (a, b, r, c) => {
        const p = point(a, b);
        px.disc(g, ...p, r * scale, c);
      };
      // Four translucent, veined wings bank independently around the articulated thorax.
      const beat = 0.55 + 0.45 * Math.sin(t * 76),
        bite = (s.biteGlow || 0) > 0;
      for (const side of [-1, 1]) {
        const stretch = (13 + beat * 7) * (1 + side * this.bank * 0.2);
        const wing = [
          [-6, side * 3],
          [-15, side * (stretch - 2)],
          [-4, side * (stretch + 3)],
          [5, side * 5],
        ];
        const hind = [
          [-9, side * 3],
          [-22, side * (stretch * 0.7)],
          [-14, side * (stretch * 0.95)],
          [-4, side * 4],
        ];
        px.blend(g, 0.36 + beat * 0.14, "normal", () => {
          poly(hind, pal.sh);
          poly(wing, side > 0 ? pal.lt : "#d5e8ed");
        });
        line([-6, side * 3], [-4, side * (stretch + 2)], pal.base);
        line([-6, side * 3], [-15, side * (stretch - 2)], pal.sh);
        line([-4, side * 5], [-8, side * (stretch * 0.7)], pal.lt);
        for (let i = 0; i < 3; i++) {
          const anchor = [2 - i * 4, side * 3],
            knee = [1 - i * 5, side * (8 + Math.sin(t * 12 + i) * 1.5)],
            foot = [5 - i * 8, side * (12 + Math.cos(t * 12 + i))];
          line(anchor, knee, pal.sh, 1.4);
          line(knee, foot, pal.lt);
        }
      }
      // Abdomen plates: each segment has a shaded lip and a luminous central seam.
      for (let i = 4; i >= 0; i--) {
        const xx = -6 - i * 2.7,
          rr = 4.4 - i * 0.55;
        disc(xx, 1, rr + 1, "#071c25");
        disc(xx, 0, rr, pal.sh);
        disc(xx - 1, -1, rr * 0.72, pal.base);
        line([xx, -rr + 1], [xx + 1, rr - 1], pal.lt);
      }
      poly(
        [
          [-6, -4],
          [2, -5],
          [7, -2],
          [7, 3],
          [1, 5],
          [-7, 3],
        ],
        "#081a22",
      );
      poly(
        [
          [-5, -3],
          [2, -4],
          [6, -1],
          [4, 3],
          [-4, 3],
        ],
        pal.base,
      );
      poly(
        [
          [-4, -3],
          [1, -4],
          [3, -2],
          [-2, 1],
        ],
        pal.hi,
      );
      disc(0, 0, ready ? 3.2 : 2, ready ? "#fff6c1" : pal.lt);
      if (ready) G.glow(g, ...point(0, 0), 14 * scale, color, 0.18);
      disc(7, 0, 4.3, pal.deep);
      poly(
        [
          [4, -2],
          [8, -3],
          [11, -1],
          [10, 2],
          [5, 3],
        ],
        pal.lt,
      );
      for (const side of [-1, 1]) {
        disc(9, side * 2.5, 1.1, "#fff6cf");
        line([8, side * 3], [13, side * (6 + Math.sin(t * 6) * 0.7)], pal.base);
        line([13, side * 6], [16, side * 5], pal.hi);
        const chomp = bite ? Math.sin(t * 100) * 1.5 : 1;
        line([10, side * 1.8], [13, side * (2 + chomp)], pal.base, 1.7);
        line([13, side * (2 + chomp)], [14, side * 0.5], pal.hi);
      }
      if (this.shape === 1) {
        line([-4, -3], [1, 2], "#fff3f8", 1.2);
        poly(
          [
            [-16, -3],
            [-19, 0],
            [-16, 3],
          ],
          pal.hi,
        );
      }
      if (bite) {
        const p = point(16, 0);
        G.glow(g, ...p, 6 * scale, "#fff6b0", 0.3);
      }
    }
  }
  G.InsectRig = InsectRig;
  class Presentation {
    constructor(game) {
      this.game = game;
      this.rigs = new Map();
      this.fx = [];
      this.lastEvent = 0;
      this.clock = 0;
      this.state = null;
      this.titleRig = new InsectRig();
      this.shake = 0;
    }
    reset() {
      this.fx = [];
      this.lastEvent = 0;
      this.rigs.clear();
      this.shake = 0;
    }
    update(dt, state) {
      this.clock += dt;
      this.state = state;
      this.titleRig.update(dt, {
        ax: 1,
        ay: Math.sin(this.clock * 0.4) * 0.2,
        vx: 20,
        vy: Math.sin(this.clock) * 12,
        color: "#84f9d1",
        charge: 5,
      });
      if (!state) return;
      for (const p of state.players) {
        let rig = this.rigs.get(p.id);
        if (!rig) {
          rig = new InsectRig(p.shape);
          this.rigs.set(p.id, rig);
        }
        rig.update(dt, { ...p, threshold: state.tuning.charge });
      }
      for (const e of state.events || [])
        if (e.id > this.lastEvent) {
          this.event(e, state);
          this.lastEvent = e.id;
        }
      for (const f of this.fx) {
        f.life -= dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vx *= 1 - dt * 0.5;
        f.vy *= 1 - dt * 0.5;
      }
      this.fx = this.fx.filter((f) => f.life > 0);
      this.shake = Math.max(0, this.shake - dt * 10);
    }
    event(e, state) {
      const burst = (count, color, speed = 55, life = 0.6) => {
        const rng = E.rng(e.id * 4537);
        for (let i = 0; i < count; i++) {
          const a = rng() * TAU,
            v = (0.2 + rng()) * speed;
          this.fx.push({
            kind: "bit",
            x: e.x || 550,
            y: e.y || 140,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: life * (0.5 + rng()),
            max: life,
            color,
            size: 1 + rng() * 2,
          });
        }
      };
      const color = palettes[state.sector].color;
      if (e.type === "shot") {
        const rig = this.rigs.get(e.player);
        if (rig) rig.recoil = 1;
      }
      if (e.type === "core-immune" && this.clock > (this.immuneUntil || 0)) {
        this.immuneUntil = this.clock + 0.45;
        burst(6, "#afc9ed", 30, 0.25);
        this.fx.push({
          kind: "immune",
          label: e.final ? "AIRBORNE ONLY" : "SIEGE ONLY",
          x: e.x,
          y: e.y,
          vx: 0,
          vy: -5,
          life: 0.45,
          max: 0.45,
          color: "#c5dbf4",
          size: 1,
        });
      }
      if (e.type === "cell")
        burst(
          e.kind === "bite" ? 8 : 6,
          e.kind === "bite" ? "#bcffe0" : color,
          e.kind === "bite" ? 24 : 52,
          0.5,
        );
      if (e.type === "ready" || e.type === "refill") {
        burst(22, "#c5ffe1", 48, 0.8);
        this.fx.push({
          kind: "ring",
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          life: 0.8,
          max: 0.8,
          color: "#8affd0",
          size: 35,
        });
      }
      if (e.type === "core-hit" || e.type === "death" || e.type === "collapse") {
        burst(
          e.type === "collapse" ? 260 : 75,
          e.type === "death" ? "#b9ffe5" : color,
          e.type === "collapse" ? 180 : 110,
          1.8,
        );
        this.fx.push({
          kind: "ring",
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          life: 1.8,
          max: 1.8,
          color: "#ffefb6",
          size: e.type === "collapse" ? 360 : 85,
        });
        this.game.shake(e.type === "collapse" ? 5 : 2);
      }
      if (e.type === "cannon-launch" || e.type === "cannon-return") burst(30, "#fff5b9", 70, 0.5);
      if (e.type === "reflect") burst(35, "#f1beff", 65, 0.7);
    }
    offset(r) {
      return { x: (r.W - G.W) / 2, y: (r.H - G.H) / 2 + 5 };
    }
    background(r, sector = 0, title = false) {
      const game = this.game,
        t = this.clock,
        pal = palettes[sector];
      r.sky(["#030c17", sector === 1 ? "#12142a" : "#0d1b26", "#04111c"]);
      r.overlay((g) => {
        // Stars, remote orbital traces, and two layers of broadcast fragments use no combat RNG.
        for (let i = 0; i < 230; i++) {
          const h = E.hash2(i, 17),
            x = (h * 17317 + t * ((i % 3) + 1) * 0.45) % r.W,
            y = E.hash2(i, 81) * r.H;
          px.dot(g, x, y, i % 13 === 0 ? "#677b86" : i % 5 === 0 ? "#344755" : "#1d303e");
        }
        const cx = r.W * 0.76,
          cy = r.H * 0.49;
        for (let j = 0; j < 4; j++) {
          const rr = 95 + j * 30;
          for (let i = 0; i < 70; i++)
            if ((i + j * 3) % 11 < 7) {
              const a = (i / 70) * TAU + t * 0.006;
              px.line(
                g,
                cx + Math.cos(a) * rr,
                cy + Math.sin(a) * rr * 0.8,
                cx + Math.cos(a + 0.04) * rr,
                cy + Math.sin(a + 0.04) * rr * 0.8,
                j % 2 ? "#1f2b3b" : "#182536",
              );
            }
        }
        for (let i = 0; i < 20; i++) {
          const x = E.hash2(i, 29) * r.W,
            y = (E.hash2(i, 83) * r.H + t * (0.3 + (i % 4) * 0.2)) % r.H;
          const s = 3 + (i % 5);
          px.poly(
            g,
            [
              [x - s, y],
              [x + s, y - s * 0.5],
              [x + s * 0.6, y + s],
              [x - s * 0.3, y + s * 0.7],
            ],
            "#142230",
          );
          px.line(g, x - s, y, x + s, y - s * 0.5, "#243544");
        }
      });
      if (!title) {
        const off = this.offset(r);
        // Core-library mineral remnants on the distant ground, never collidable.
        for (let i = 0; i < 8; i++)
          r.shape(i % 2 ? "rock" : "crystal", off.x + 70 + i * 76, off.y + G.H + 14 + (i % 2) * 8, 0, {
            scale: 0.55,
            params: { seed: i + 1 },
            mats: { c: "slate", r: "ruin" },
            shadow: false,
            hides: false,
          });
      }
    }
    title(r) {
      this.background(r, 0, true);
      const t = this.clock;
      r.overlay((g) => {
        const x = r.W * 0.72,
          y = r.H * 0.44;
        G.ring(g, x, y, 97, 1, "#263f4b");
        G.ring(g, x, y, 104, 1, "#1a303e");
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * TAU,
            rr = i % 3 === 0 ? 113 : 108;
          px.line(
            g,
            x + Math.cos(a) * 106,
            y + Math.sin(a) * 106,
            x + Math.cos(a) * rr,
            y + Math.sin(a) * rr,
            "#35515b",
          );
        }
        G.glow(g, x, y, 100, "#58d4ba", 0.08);
        this.titleRig.draw(g, x, y + Math.sin(t) * 4, r.view, 3.7);
        E.font.text(g, "NACRE / SCOUT 01", x, y + 110, "#809b9f", { align: "center", outline: false });
        E.font.text(g, "EXILED SWARM   /   ILEX BROADCAST", 24, r.H - 24, "#587783", { outline: false });
      });
    }
    fortress(g, x, y, c, pal, t, phase, sector) {
      const tones = pal.tones,
        heart = pal.heart,
        flight = ["windup", "flight", "return"].includes(c.mode),
        spin = flight ? t * (c.mode === "windup" ? 5 : 13) : t * 0.25;
      if (c.mode === "defeated") return;
      if (!flight) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + Math.PI / 8,
            inner = 27 + phase * 2,
            outer = sector === 2 ? 61 - phase * 13 : sector === 1 ? 49 - phase * 7 : 45;
          const pts = [
            [inner, -7],
            [outer, -13],
            [outer + 5, -2],
            [outer, 8],
            [inner, 6],
          ].map(([xx, yy]) => [
            x + Math.cos(a) * xx - Math.sin(a) * yy,
            y + Math.sin(a) * xx + Math.cos(a) * yy,
          ]);
          px.poly(g, pts, tones.deep);
          px.line(g, ...pts[0], ...pts[1], tones.base, 2);
          px.line(g, ...pts[1], ...pts[2], tones.lt);
          if (i % 2 === 0) {
            const xx = x + Math.cos(a) * (outer - 2),
              yy = y + Math.sin(a) * (outer - 2);
            px.disc(g, xx, yy, 2, pal.color);
          }
        }
        G.ring(g, x, y, 31, 3, tones.sh);
        G.ring(g, x, y, 34, 1, tones.base);
      } else {
        const wind = c.mode === "windup",
          size = wind ? 36 + Math.sin(t * 23) * 3 : 29;
        for (let i = 0; i < 5; i++) {
          const a = spin + (i / 5) * TAU,
            pts = [
              [6, -3],
              [size, -9],
              [size + 8, 0],
              [17, 6],
            ].map(([xx, yy]) => [
              x + Math.cos(a) * xx - Math.sin(a) * yy,
              y + Math.sin(a) * xx + Math.cos(a) * yy,
            ]);
          px.poly(g, pts, tones.sh);
          px.line(g, ...pts[0], ...pts[1], pal.light, 2);
          px.line(g, ...pts[1], ...pts[2], pal.core);
        }
        if (wind) G.ring(g, x, y, 43 + Math.sin(t * 10) * 2, 1, "#ff957f");
      }
      G.glow(g, x, y, 32, pal.core, 0.18);
      px.poly(
        g,
        [
          [x - 19, y],
          [x - 9, y - 16],
          [x + 9, y - 16],
          [x + 20, y],
          [x + 8, y + 17],
          [x - 10, y + 16],
        ],
        heart.deep,
      );
      px.poly(
        g,
        [
          [x - 16, y - 2],
          [x - 7, y - 14],
          [x + 8, y - 12],
          [x + 16, y],
          [x + 5, y + 13],
          [x - 8, y + 11],
        ],
        heart.base,
      );
      px.poly(
        g,
        [
          [x - 14, y - 4],
          [x - 7, y - 13],
          [x + 6, y - 11],
          [x + 2, y - 4],
        ],
        heart.lt,
      );
      px.poly(
        g,
        [
          [x - 9, y],
          [x - 3, y - 5],
          [x + 7, y - 4],
          [x + 10, y + 2],
          [x + 3, y + 6],
          [x - 6, y + 4],
        ],
        "#081322",
      );
      px.rect(g, x - 4, y - 2, 9, 3, c.mode === "dock" ? "#bdffdf" : "#fff0d2");
      px.dot(g, x + 6, y - 1, "#fffce9");
      if (c.mode === "dock") {
        G.ring(g, x, y, 24, 1, "#5d9e8a");
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + t * 0.5;
          px.disc(g, x + Math.cos(a) * 24, y + Math.sin(a) * 24, 1, "#a6edc6");
        }
      }
    }
    draw(r, state, overlays = false) {
      const s = state || this.state;
      if (!s) {
        this.title(r);
        return;
      }
      const t = this.clock,
        off = this.offset(r),
        pal = palettes[s.sector],
        w = G.W,
        h = G.H;
      this.background(r, s.sector);
      const wx = (x) => off.x + x,
        wy = (y) => off.y + y;
      r.overlay((g) => {
        // The seam is a corridor through the picture rather than a wall.
        px.line(g, wx(44), wy(-2), wx(620), wy(-2), "#284653");
        px.line(g, wx(44), wy(h + 2), wx(620), wy(h + 2), "#284653");
        for (let i = 0; i < 8; i++) {
          const x = 80 + i * 72;
          px.poly(
            g,
            [
              [wx(x - 3), wy(-5)],
              [wx(x), wy(-8)],
              [wx(x + 3), wy(-5)],
            ],
            "#538387",
          );
          px.poly(
            g,
            [
              [wx(x - 3), wy(h + 5)],
              [wx(x), wy(h + 8)],
              [wx(x + 3), wy(h + 5)],
            ],
            "#538387",
          );
        }
        const ref = s.refuge,
          rc = ref.active ? pal.static : "#764b66";
        px.blend(g, ref.active ? 0.13 : 0.06, "normal", () => px.rect(g, wx(ref.x), wy(0), ref.w, h, rc));
        for (let i = 0; i < 210; i++) {
          const xx = ref.x + E.hash2(i, Math.floor(t * 8) % 61) * ref.w,
            yy = (i * 31 + t * (i % 2 ? -19 : 23)) % h;
          px.rect(
            g,
            wx(xx),
            wy(yy),
            1 + (i % 6),
            1,
            ref.active ? (i % 8 === 0 ? "#8eb7ac" : "#244c51") : "#392b42",
          );
        }
        for (const x of [ref.x, ref.x + ref.w]) {
          px.line(g, wx(x), wy(0), wx(x), wy(h), ref.warning ? "#ffb373" : rc, ref.warning ? 2 : 1);
          for (let y = 4; y < h; y += 16)
            px.rect(g, wx(x) - 1, wy(y + ((t * 16) % 16)), 3, 3, ref.warning ? "#ffdec2" : rc);
        }
        // The left rail is physically remote from the scouts.
        px.rect(g, wx(19), wy(-1), 15, h + 2, "#152733");
        px.rect(g, wx(22), wy(0), 3, h, "#45606a");
        for (let y = 4; y < h; y += 12) {
          px.rect(g, wx(27), wy(y), 5, 3, "#34505a");
          px.line(g, wx(20), wy(y), wx(22), wy(y), "#a1b7ac");
        }
        for (const p of s.players) {
          if (p.gone) continue;
          const y = wy(p.y),
            ready = p.charge >= s.tuning.charge;
          px.rect(g, wx(25), y - 6, 12, 12, "#081723");
          px.poly(
            g,
            [
              [wx(28), y - 7],
              [wx(37), y - 4],
              [wx(41), y],
              [wx(37), y + 4],
              [wx(28), y + 7],
            ],
            ready ? p.color : "#3b5963",
          );
          if (ready && p.alive) {
            px.blend(g, 0.35, "normal", () => {
              for (let x = 42; x < 620; x += p.shape ? 12 : 7)
                px.line(g, wx(x), y, wx(x + (p.shape ? 7 : 3)), y, p.color);
            });
            E.font.text(g, p.shape ? "II" : "I", wx(12), y - 3, p.color, { outline: false });
          }
        }
        if (s.core.mode === "windup") {
          const c = s.core;
          for (let i = 0; i < 32; i++) {
            const u = i / 32;
            px.disc(
              g,
              wx(c.x + (60 - c.x) * u),
              wy(G.wrap(c.y + G.wrapDy(c.targetY, c.y) * u)),
              1,
              "#ffb294",
            );
          }
        }
      });
      for (const c of s.cells)
        if (c.alive) {
          const x = wx(c.x),
            y = wy(c.y),
            tones = pal.tones;
          r.actor(
            x,
            y,
            3,
            (g, ox, oy) => {
              px.poly(
                g,
                [
                  [ox - 6, oy - 5],
                  [ox + 3, oy - 7],
                  [ox + 6, oy - 3],
                  [ox + 6, oy + 5],
                  [ox - 3, oy + 7],
                  [ox - 6, oy + 3],
                ],
                tones.deep,
              );
              px.poly(
                g,
                [
                  [ox - 5, oy - 4],
                  [ox + 3, oy - 6],
                  [ox + 5, oy - 2],
                  [ox + 5, oy + 3],
                  [ox - 3, oy + 5],
                  [ox - 5, oy + 2],
                ],
                tones.base,
              );
              px.line(g, ox - 5, oy - 4, ox + 3, oy - 6, tones.lt);
              px.line(g, ox - 4, oy - 3, ox - 4, oy + 1, tones.hi);
              if (c.material) {
                px.poly(
                  g,
                  [
                    [ox, oy - 4],
                    [ox + 4, oy],
                    [ox, oy + 4],
                    [ox - 4, oy],
                  ],
                  "#f8e6ff",
                );
                px.poly(
                  g,
                  [
                    [ox, oy - 2],
                    [ox + 2, oy],
                    [ox, oy + 2],
                    [ox - 2, oy],
                  ],
                  "#8f6fc7",
                );
              } else {
                px.dot(g, ox + 2, oy - 2, pal.light);
                if ((c.index + Math.floor(t * 2)) % 11 === 0)
                  px.line(g, ox - 1, oy, ox + 2, oy + 2, tones.sh);
              }
            },
            { outline: false, emissive: false },
          );
        }
      const c = s.core;
      if (c.mode !== "defeated")
        r.actor(wx(c.x), wy(c.y), 8, (g, x, y) => this.fortress(g, x, y, c, pal, t, s.phase, s.sector), {
          outline: false,
        });
      for (const q of s.pursuers) {
        r.shadow(wx(q.x), wy(q.y), 7, 0.4);
        r.actor(
          wx(q.x),
          wy(q.y),
          12,
          (g, x, y) => {
            const a = q.angle,
              point = (xx, yy) => [
                x + Math.cos(a) * xx - Math.sin(a) * yy,
                y + Math.sin(a) * xx + Math.cos(a) * yy,
              ];
            G.glow(g, x, y, 13, "#ff706f", 0.15);
            px.poly(g, [point(8, 0), point(-4, -5), point(-8, 0), point(-4, 5)], "#ff786d");
            px.poly(g, [point(5, 0), point(-3, -2), point(-4, 2)], "#fff0c5");
            for (let j = 0; j < 3; j++) {
              const p = point(-11 - j * 4, Math.sin(t * 20 + j) * 2);
              px.disc(g, ...p, 2 - j * 0.5, j ? "#67384c" : "#da6e73");
            }
          },
          { emissive: true, outline: false },
        );
      }
      for (const p of s.players) {
        if (p.gone || !p.alive) continue;
        const rig = this.rigs.get(p.id);
        if (!rig) continue;
        const alpha = p.inv > 0 && Math.floor(t * 12) % 2 ? 0.5 : 1;
        r.shadow(wx(p.x) + 4, wy(p.y) + 6, 8, 0.35);
        const drawAt = (yy, ghost = false) =>
          r.actor(wx(p.x), wy(yy), 16, (g, x, y) => rig.draw(g, x, y, r.view), {
            emissive: true,
            outline: false,
            alpha: ghost ? 0.22 : alpha,
          });
        drawAt(p.y);
        if (p.y < 23) drawAt(p.y + h, true);
        if (p.y > h - 23) drawAt(p.y - h, true);
        if (p.inv > 0) r.overlay((g) => G.ring(g, wx(p.x), wy(p.y), 12, 1, p.color));
      }
      r.overlay((g) => {
        for (const b of s.bullets) {
          const x = wx(b.x),
            y = wy(b.y);
          px.line(g, x - b.vx * 0.018, y - b.vy * 0.018, x, y, "#6ceac8", 2);
          px.disc(g, x, y, 1.5, "#e6ffe8");
        }
        for (const b of s.cannons) {
          const color = s.players.find((p) => p.id === b.owner)?.color || "#fff3b6",
            y = wy(b.y);
          if (b.mode === "warning" || b.mode === "reflect-warning") {
            const reflect = b.reflected;
            for (let x = 34; x < 625; x += 12) {
              px.line(g, wx(x), y, wx(x + 7), y, reflect ? "#f6b2ff" : color, 2);
            }
            E.font.text(
              g,
              reflect ? "RETURN SHOT — CLEAR THE LANE" : "SIEGE SHOT — CLEAR THE LANE",
              wx(340),
              y - 13,
              reflect ? "#f6b2ff" : "#fff1c5",
              { align: "center", outline: true },
            );
          } else {
            G.glow(g, wx(b.x), y, 23, color, 0.28);
            px.line(g, wx(b.x - b.vx * 0.06), y, wx(b.x), y, color, 5);
            px.disc(g, wx(b.x), y, 5, "#fff8cf");
            px.disc(g, wx(b.x) + 2, y - 1, 2, "#ffffff");
          }
        }
        for (const f of this.fx) {
          const a = Math.min(1, f.life * 2),
            x = wx(f.x),
            y = wy(G.wrap(f.y));
          if (f.kind === "ring") {
            G.ring(g, x, y, f.size * (1 - f.life / f.max), Math.max(1, (f.life / f.max) * 3), f.color);
          } else if (f.kind === "immune")
            E.font.text(g, f.label, x, y - 28, f.color, { align: "center", outline: true });
          else px.blend(g, a, "add", () => px.rect(g, x, y, f.size, f.size, f.color));
        }
        if (overlays) {
          for (const p of s.players) if (p.alive) G.ring(g, wx(p.x), wy(p.y), p.r, 1, "#ffffff");
          G.ring(g, wx(c.x), wy(c.y), c.r, 1, "#ff88a0");
          for (const q of s.pursuers) G.ring(g, wx(q.x), wy(q.y), q.r, 1, "#ff4b4b");
          E.font.text(
            g,
            `TICK ${s.tick}  SEED ${s.seed}  ${c.mode.toUpperCase()}`,
            wx(54),
            wy(h - 10),
            "#fff",
            { outline: true },
          );
        }
        if (s.status === "collapse") {
          const u = s.phaseTime;
          for (let i = 0; i < 7; i++) {
            const rad = this.game.reduceMotion ? 120 + i * 24 : (u * 125 + i * 26) % 370;
            G.ring(
              g,
              wx(c.x),
              wy(c.y),
              rad,
              Math.max(1, 5 - i * 0.5),
              this.game.settings.flashes < 0.5
                ? i % 2
                  ? "#66705c"
                  : "#8a8e70"
                : i % 2
                  ? pal.color
                  : "#fff0b5",
            );
          }
          if (s.sector === 2 && u > 1.1)
            for (let i = 0; i < 36; i++) {
              const xx = 550 - (u - 1) * 80 - E.hash2(i, 7) * 140,
                yy = G.wrap(140 + Math.sin(i * 2.3) * 70 + (u - 1) * Math.sin(i) * 16);
              px.line(g, wx(xx - 4), wy(yy), wx(xx + 3), wy(yy), "#c5ffe0");
              px.line(g, wx(xx), wy(yy - 3), wx(xx), wy(yy + 3), "#79c9b4");
            }
        }
      });
      this.game.lights.enabled = true;
      this.game.lights.ambient = 0.73;
      this.game.lights.add(wx(c.x), wy(c.y), 12, 100, 0.55, { color: pal.core });
      for (const p of s.players)
        if (p.alive) this.game.lights.add(wx(p.x), wy(p.y), 15, 40, 0.55, { color: p.color });
    }
  }
  G.Presentation = Presentation;
})();
