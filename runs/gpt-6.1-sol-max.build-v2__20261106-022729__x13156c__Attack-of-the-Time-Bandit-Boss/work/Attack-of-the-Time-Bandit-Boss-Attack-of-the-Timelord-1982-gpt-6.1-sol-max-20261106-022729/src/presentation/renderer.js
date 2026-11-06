import {
  TITLE,
  ARENA,
  WAVES,
  WEAPONS,
  BOSS_PHASES,
} from "../content/campaign.js";
export const PILOT_COLORS = ["#77e8f2", "#ff9baa", "#b9ef85", "#bca0ff"];
export class Presentation {
  constructor(game) {
    this.game = game;
    this.E = globalThis.My3D2dge;
    this.fx = [];
    this.lastEvent = 0;
    this.subtitle = "";
    this.subtitleUntil = 0;
    this.speaking = 0;
    const E = this.E;
    const dome = [
      ".......aaaa.......",
      ".....aaAHHaaa.....",
      "....aAHHHHHAaa....",
      "..aaAALLLLLAAaaa..",
      ".bBBBBBBBBBBBBBbb.",
      "bBLLLLLLLLLLLLLBbb",
      "..BBdddddddddBB...",
      "....cc.c.c.cc.....",
      ".....c...c.......",
    ];
    this.hulls = ["#718bff", "#f5a95f", "#a696f5"].map((c, hullIndex) => {
      const t = E.tones(c);
      const palette = {
        a: t.sh,
        A: t.base,
        H: t.hi,
        L: t.lt,
        b: t.deep,
        B: t.base,
        d: "#10273d",
        c: "#91f8e4",
      };
      const outline =
        hullIndex === 1
          ? [
              "b...............b",
              ".b....aaaa.....b.",
              "..b.aaAHHaaa.bb..",
              "..aaAALLLLLAAaaa..",
              ".bBBBBBBBBBBBBBbb.",
              "bBLLLLLLLLLLLLLBbb",
              "b.BBdddddddddBB.b",
              "....cc.c.c.cc.....",
              ".....c...c.......",
            ]
          : hullIndex === 2
            ? [
                ".......aa........",
                ".....aaAHaaa.....",
                "....aAHHHHAaa....",
                "..aaAALLLLLAAaaa..",
                "bBBBBBBBBBBBBBBBb",
                "bBLLLLBBBBBLLLLBb",
                ".BBBbd.....dbBBB.",
                "..cc.........cc..",
                "...c.........c...",
              ]
            : dome;
      return E.anim(
        [
          E.sprite(outline, palette),
          E.sprite(
            outline.map((row, i) => (i === 7 ? row.replaceAll("c", "L") : row)),
            palette,
          ),
        ],
        5,
        { pingpong: true },
      );
    });
    this.pilotSprites = PILOT_COLORS.map((c, i) => {
      const t = E.tones(c);
      let body = [
        "........W........",
        "........W........",
        ".......WWW.......",
        ".......WHW.......",
        "......WHAHW......",
        "......WHHHW......",
        ".....bWWWWWb.....",
        "...bbBCCHCCBbb...",
        "..bBBCCCHCCCBBb..",
        ".bBBBCCCHCCCBBBb.",
        "bBBHBBCCCCCBBHBBb",
        "bBHHHBBBBBBBHHHBb",
        "bBBBBBDDDDDBBBBBb",
        "..bbB.D...D.Bbb..",
        "....d.D...D.d....",
      ];
      if (i === 1)
        body = body.map((r, j) => (j === 4 ? ".....WWHAHWW....." : r));
      if (i === 2)
        body = body.map((r, j) => (j === 9 ? "bbBBBCCCHCCCBBBbb" : r));
      if (i === 3)
        body = body.map((r, j) => (j === 11 ? "bBH.HBBBBBBBH.HBb" : r));
      return E.sprite(
        body,
        {
          W: "#f0faff",
          H: t.hi,
          A: "#ffd674",
          b: t.deep,
          B: t.sh,
          C: t.base,
          D: "#182743",
          d: "#ffb96a",
        },
        1.7,
      );
    });
    const rnd = E.rng(906);
    this.stars = Array.from({ length: 420 }, () => ({
      x: rnd() * 640,
      y: rnd() * 360,
      z: rnd(),
      phase: rnd() * 6.28,
    }));
    E.SHAPES["tb:relic"] = {
      about: "broken temporal relay",
      tags: "original sci-fi debris",
      mats: {
        m: { color: "#526a88", pattern: "metal" },
        g: { color: "#55d8d7", glow: 1 },
      },
      parts: [
        ["cyl", "m", [0, 0, 0], 6, 7, { seg: 6 }],
        ["box", "m", [0, 0, 7], [5, 5, 12]],
        ["ball", "g", [0, 0, 20], 3],
      ],
    };
  }
  reset() {
    this.fx = [];
    this.lastEvent = 0;
    this.subtitle = "";
  }
  ingest(w) {
    if (!w) return [];
    const fresh = w.events.filter((e) => e.id > this.lastEvent);
    for (const e of fresh) {
      this.lastEvent = Math.max(this.lastEvent, e.id);
      if (e.line) {
        this.subtitle = e.line;
        this.subtitleUntil = this.game.real + 4.6;
        this.speaking = this.game.real + 1.4;
      }
      if (
        [
          "kill",
          "intercept",
          "hit",
          "phaseBreak",
          "clear",
          "brake",
          "bossHit",
          "hullHit",
        ].includes(e.type)
      ) {
        let color = e.kind ? WEAPONS[e.kind]?.color : "#8eefff";
        if (e.type === "hit") color = "#ff6b86";
        if (e.type === "phaseBreak") color = "#ffd674";
        this.fx.push({
          x: e.x ?? 320,
          y: e.y ?? 180,
          born: this.game.real,
          type: e.type,
          color,
          points: e.points,
        });
        if (e.x != null) {
          const P = this.game.particles;
          P.sparks(e.x, e.y, 0, e.type === "kill" ? 10 : 5);
          P.bits(e.x, e.y, 0, 6, [color, "#fff4d2", "#607494"]);
          if (e.type === "kill" || e.type === "phaseBreak")
            P.explosion(e.x, e.y, 0, e.type === "kill" ? 0.45 : 1.6, {
              freeze: false,
              shake: 0,
              sound: false,
              flash: false,
            });
        }
        if (e.type === "hit" && !this.game.reduceMotion) this.game.shake(2);
      }
    }
    this.fx = this.fx.filter((f) => this.game.real - f.born < 1.1);
    return fresh;
  }
  ring(g, cx, cy, rx, ry, color, start = 0, end = Math.PI * 2, step = 0.025) {
    const px = this.E.px;
    let prev = null;
    for (let a = start; a <= end; a += step) {
      const p = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
      if (prev) px.line(g, ...prev, ...p, color);
      prev = p;
    }
  }
  portal(g, x, y, size, t, active = true) {
    const { px } = this.E,
      colors = [
        "#27364b",
        "#2c485c",
        "#23616f",
        "#398c99",
        "#63bdc0",
        "#bdcf91",
        "#ffcf7d",
        "#ea8175",
        "#9e719b",
        "#59709e",
      ];
    for (let k = 20; k > 0; k--) {
      const radius = (size * k) / 20;
      px.ell(
        g,
        x,
        y,
        radius,
        radius * 0.49,
        k % 3 === 0 ? "#111a30" : k % 3 === 1 ? "#121d33" : "#16223a",
      );
    }
    for (let j = 0; j < 8; j++) {
      const rx = size * (0.65 + j * 0.055),
        ry = rx * 0.49;
      for (let k = 0; k < 12; k++) {
        const a = (k * Math.PI) / 6 + t * (j % 2 ? 0.08 : -0.08) + j * 0.12;
        this.ring(
          g,
          x,
          y,
          rx,
          ry,
          colors[(k + j) % colors.length],
          a,
          a + 0.35,
          0.025,
        );
      }
    }
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4 + t * 0.13,
        r = size * (0.6 + (i % 5) * 0.075),
        p = [x + Math.cos(a) * r, y + Math.sin(a) * r * 0.49];
      px.line(
        g,
        p[0],
        p[1],
        p[0] + Math.cos(a) * 7,
        p[1] + Math.sin(a) * 3,
        "#334d65",
      );
    }
    px.ell(g, x, y, size * 0.48, size * 0.22, "#090e22");
    for (let i = 0; i < 38; i++) {
      const a = i * 2.4 - t * 0.22,
        r = ((i % 11) * size) / 29;
      px.dot(
        g,
        x + Math.cos(a) * r,
        y + Math.sin(a) * r * 0.42,
        i % 4 === 0 ? "#567085" : "#263650",
      );
    }
    if (active) {
      px.blend(g, 0.1, "add", () =>
        px.ell(g, x, y, size * 0.86, size * 0.4, "#5eaaaa"),
      );
    }
  }
  face(g, x, y, s, t, mood = "gloat", bright = false) {
    const { px } = this.E;
    const S = (v) => v * s;
    const poly = (pts, c) =>
      px.poly(
        g,
        pts.map((p) => [x + S(p[0]), y + S(p[1])]),
        c,
      );
    const rect = (a, b, w, h, c) =>
      px.rect(g, x + S(a), y + S(b), S(w), S(h), c);
    const ramp = bright
      ? ["#152d40", "#264959", "#3e6c75", "#648d85", "#a1b7a0", "#f6d390"]
      : ["#101d31", "#20394b", "#315464", "#477780", "#7aaca2", "#b7d4ba"];
    // A carved mechanical mask with a broken crown and layered angular cheek plates.
    poly(
      [
        [-51, -43],
        [-44, -62],
        [-31, -50],
        [-15, -72],
        [0, -55],
        [19, -69],
        [29, -48],
        [47, -57],
        [52, -38],
        [39, -33],
        [-41, -33],
      ],
      "#1b2a43",
    );
    poly(
      [
        [-44, -44],
        [-38, -56],
        [-28, -44],
        [-14, -62],
        [0, -48],
        [17, -59],
        [28, -41],
        [43, -48],
        [44, -35],
        [-43, -35],
      ],
      "#d3ac71",
    );
    rect(-31, -42, 61, 5, "#fce2a1");
    rect(-30, -36, 58, 7, ramp[2]);
    poly(
      [
        [-40, -33],
        [-23, -43],
        [24, -43],
        [42, -30],
        [48, -4],
        [35, 39],
        [16, 58],
        [-15, 58],
        [-37, 35],
        [-48, -6],
      ],
      ramp[0],
    );
    poly(
      [
        [-35, -29],
        [-21, -37],
        [21, -37],
        [36, -28],
        [41, -2],
        [29, 32],
        [13, 49],
        [-12, 49],
        [-31, 30],
        [-41, -3],
      ],
      ramp[2],
    );
    poly(
      [
        [-31, -25],
        [-20, -33],
        [18, -33],
        [31, -24],
        [34, -2],
        [24, 24],
        [12, 42],
        [-9, 42],
        [-26, 22],
        [-34, -1],
      ],
      ramp[3],
    );
    poly(
      [
        [-32, -23],
        [-15, -18],
        [-16, 2],
        [-30, 11],
        [-38, -1],
      ],
      ramp[1],
    );
    poly(
      [
        [32, -23],
        [15, -18],
        [16, 2],
        [30, 11],
        [38, -1],
      ],
      ramp[1],
    );
    poly(
      [
        [-33, 6],
        [-21, 9],
        [-16, 27],
        [-10, 39],
        [-24, 27],
        [-32, 23],
      ],
      ramp[4],
    );
    poly(
      [
        [33, 6],
        [21, 9],
        [16, 27],
        [10, 39],
        [24, 27],
        [32, 23],
      ],
      ramp[2],
    );
    poly(
      [
        [0, -23],
        [-10, 7],
        [0, 16],
        [11, 7],
      ],
      ramp[1],
    );
    poly(
      [
        [-2, -18],
        [-5, 6],
        [0, 11],
        [3, 7],
        [1, -19],
      ],
      ramp[5],
    );
    const angry = mood === "angry" || mood === "defeat",
      blink = Math.sin(t * 0.85) > 0.996;
    for (const side of [-1, 1]) {
      const ex = side * 22;
      rect(ex - 10, -14, 19, 11, "#081320");
      if (!blink) {
        rect(ex - 7, -11, 14, 5, bright ? "#fff4be" : "#9ef4da");
        rect(ex - 2, -12, 4, 7, "#ffce7b");
        rect(ex, -12, 2, 3, "#fff9e2");
      }
      poly(
        [
          [ex - 12, -18 + (angry ? side * 2 : 0)],
          [ex + 10, -22 - (angry ? side * 2 : 0)],
          [ex + 10, -18],
          [ex - 11, -14],
        ],
        "#13273b",
      );
    }
    const mouth =
      mood === "speak"
        ? 3 + Math.abs(Math.sin(t * 23)) * 8
        : mood === "defeat"
          ? 10
          : angry
            ? 4
            : 2;
    poly(
      [
        [-16, 26],
        [-10, 21],
        [11, 21],
        [17, 26],
        [11, 26 + mouth],
        [-10, 26 + mouth],
      ],
      "#0b1426",
    );
    if (mood !== "defeat") {
      rect(-11, 23, 22, 2, "#e2d1a2");
      if (mood === "speak") rect(-7, 27 + mouth, 14, 2, "#cf8e7e");
    }
    for (let i = 0; i < 4; i++) {
      rect(-5 + i * 3, 38, 1, 7, ramp[1]);
    }
    // Fine geometric engraving, deliberately crisp at the native pixel scale.
    for (let side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const xx = side * (28 + i * 4);
        px.line(
          g,
          x + S(xx),
          y + S(-26),
          x + S(xx + side * 3),
          y + S(-8),
          ramp[4],
        );
      }
    rect(-2, -33, 4, 8, "#ffd980");
    rect(-2, -29, 4, 1, "#fff7d7");
  }
  backdrop(r, w, title = false) {
    const { px } = this.E,
      t = this.game.reduceMotion ? 0 : this.game.real;
    r.sky(["#080d1a", "#101a2d", "#080d1b"]);
    r.decal((g) => {
      // Striated nebula bands and distant layered arcs, not a filter over sample art.
      for (let i = 0; i < 65; i++) {
        const xx = (i * 83) % 640,
          yy = 55 + ((i * 19) % 204);
        px.ell(
          g,
          xx,
          yy,
          16 + (i % 37),
          4 + (i % 9),
          i % 3 === 0 ? "#121b32" : "#11192c",
        );
      }
      for (const s of this.stars) {
        const y = (s.y + t * (1 + s.z * 5)) % 360;
        px.dot(
          g,
          s.x,
          y,
          s.z > 0.88 ? "#a7b8bf" : s.z > 0.5 ? "#465f79" : "#26364e",
        );
        if (s.z > 0.98) {
          px.line(g, s.x - 2, y, s.x + 2, y, "#7594a1");
          px.line(g, s.x, y - 2, s.x, y + 2, "#7594a1");
        }
      }
      const center = title ? 477 : 320,
        cy = title ? 166 : 116,
        size = title ? 155 : 133;
      for (let k = 0; k < 3; k++)
        this.ring(
          g,
          center,
          cy,
          size + 40 + k * 24,
          (size + 40 + k * 24) * 0.48,
          ["#1b2b44", "#20344a", "#263747"][k],
          t * 0.04 + k,
          t * 0.04 + k + 4.9,
        );
      this.portal(
        g,
        center,
        cy,
        w?.phase === "ending"
          ? size * Math.max(0.05, 1 - w.phaseTime / 6)
          : size,
        t,
      );
      if (title) {
        this.face(
          g,
          477,
          174,
          1.25,
          t,
          this.game.real < this.speaking ? "speak" : "gloat",
          true,
        );
      } else if (!w?.boss) {
        px.blend(g, 0.35, "normal", () =>
          this.face(
            g,
            320,
            108,
            0.5,
            t,
            this.game.real < this.speaking
              ? "speak"
              : w?.wave > 4
                ? "angry"
                : "gloat",
          ),
        );
      }
      // Relic frames echo a clock dial around a clear common collision plane.
      for (let side of [-1, 1])
        for (let j = 0; j < 8; j++) {
          const x = side < 0 ? 9 + (j % 2) * 5 : 626 - (j % 2) * 5,
            y = 50 + j * 31;
          px.poly(
            g,
            [
              [x, y],
              [x + side * 6, y + 4],
              [x + side * 6, y + 13],
              [x, y + 19],
            ],
            "#253650",
          );
          px.line(g, x, y + 2, x, y + 12, j % 3 === 0 ? "#7e9b9c" : "#40536b");
        }
      if (!title) {
        px.rect(g, 28, 302, 584, 17, "#0a1525");
        px.line(g, 28, 301, 612, 301, "#26445a");
        px.line(g, 30, 319, 610, 319, "#172c40");
        for (let i = 0; i < 29; i++) {
          px.rect(g, 37 + i * 20, 314, 10, 1, "#2a4557");
          if (i % 5 === 0) px.rect(g, 37 + i * 20, 313, 2, 4, "#77b0a2");
        }
      }
    });
    if (!title) {
      for (let i = 0; i < 4; i++)
        r.shape("tb:relic", i < 2 ? 17 : 623, 90 + (i % 2) * 140, 0, {
          scale: 0.6,
          facing: 0.1 * i,
        });
    }
    this.game.lights.add(title ? 477 : 320, title ? 160 : 108, 0, 190, 0.55, {
      color: "#6488ad",
    });
  }
  draw(r, w, options = {}) {
    const title = !w;
    this.backdrop(r, w, title);
    if (title) {
      this.titleFleet(r);
      return;
    }
    const { px } = this.E,
      now = this.game.real,
      ht = w.hostileTime;
    for (const f of w.enemies) {
      if (f.d < 0) continue;
      r.sprite(f.x, f.y, 0, this.hulls[f.kind % 3], {
        t: ht + f.id,
        anchor: "center",
        scale: 1.8,
        rot: (f.a || 0) * 0.35,
        flash: f.hit > 0 ? "#ffffff" : undefined,
      });
      if (f.hp < f.max)
        r.overlay((g) => {
          px.rect(g, f.x - 8, f.y + 10, 16, 2, "#29384e");
          px.rect(g, f.x - 8, f.y + 10, (16 * f.hp) / f.max, 2, "#ffc57b");
        });
    }
    if (w.boss) {
      const b = w.boss;
      this.game.lights.add(b.x, b.y, 0, 110, 0.6, {
        color: BOSS_PHASES[w.bossPhase].color,
      });
      r.actor(
        b.x,
        b.y,
        0,
        (g, x, y) => {
          for (let side of [-1, 1]) {
            const dx = side * (58 + Math.sin(ht) * 3);
            px.poly(
              g,
              [
                [x + dx, y - 36],
                [x + dx + side * 24, y - 15],
                [x + dx + side * 20, y + 25],
                [x + dx, y + 36],
                [x + dx - side * 7, y],
              ],
              "#26374f",
            );
            px.line(
              g,
              x + dx,
              y - 26,
              x + dx,
              y + 25,
              b.open ? "#76f3d7" : "#e1a887",
              3,
            );
          }
          this.face(
            g,
            x,
            y,
            w.phase === "ending"
              ? Math.max(0.01, 0.8 * (1 - w.phaseTime / 7))
              : 0.8,
            now,
            w.phase === "ending"
              ? "defeat"
              : this.game.real < this.speaking
                ? "speak"
                : w.bossPhase > 0
                  ? "angry"
                  : "gloat",
            b.open,
          );
          if (w.bossPhase > 0)
            for (let i = 0; i < 8; i++) {
              const a =
                  ht * (w.bossPhase === 2 ? -0.4 : 0.3) + (i * Math.PI) / 4,
                rx = 48 + Math.sin(ht) * 3,
                xx = x + Math.cos(a) * rx,
                yy = y + Math.sin(a) * rx * 0.7;
              px.poly(
                g,
                [
                  [xx, yy - 3],
                  [xx + 4, yy],
                  [xx, yy + 3],
                  [xx - 4, yy],
                ],
                BOSS_PHASES[w.bossPhase].color,
              );
            }
          const col = b.open ? "#fff4bc" : "#4a6a86";
          px.poly(
            g,
            [
              [x, y - 10],
              [x + 15, y + 2],
              [x, y + 17],
              [x - 15, y + 2],
            ],
            "#122638",
          );
          px.poly(
            g,
            [
              [x, y - 6],
              [x + 10, y + 2],
              [x, y + 12],
              [x - 10, y + 2],
            ],
            col,
          );
          if (!b.open) {
            for (let k = 0; k < 3; k++)
              px.line(
                g,
                x - 20,
                y - 6 + k * 8,
                x + 20,
                y - 6 + k * 8,
                "#425b74",
              );
          }
        },
        { emissive: true },
      );
      r.overlay((g) => {
        px.rect(g, 221, 37, 198, 3, "#24384c");
        px.rect(
          g,
          221,
          37,
          (198 * b.hp) / b.max,
          3,
          BOSS_PHASES[w.bossPhase].color,
        );
        this.E.font.text(
          g,
          (b.open ? "CORE EXPOSED" : "CORE ARMORED") +
            "  /  " +
            (w.bossPhase + 1) +
            " OF 3",
          320,
          43,
          b.open ? "#ffe2a0" : "#92a9bd",
          { align: "center", outline: false },
        );
      });
    }
    for (const t of w.threats) {
      const col = WEAPONS[t.kind]?.color || "#fff",
        warn = t.state === "warn";
      if (t.kind === "roller")
        r.decal((g) => {
          px.line(
            g,
            t.from,
            299,
            t.to,
            299,
            t.ground ? "#9dc679" : "#45643c",
            2,
          );
          for (const x of [t.from, t.to]) {
            px.line(g, x, 295, x, 303, "#b6ff72");
          }
          for (
            let x = Math.min(t.from, t.to);
            x < Math.max(t.from, t.to);
            x += 12
          )
            px.line(g, x, 298, x + 4, 294, "#405a39");
          px.poly(
            g,
            [
              [t.safe - 4, 302],
              [t.safe, 296],
              [t.safe + 4, 302],
            ],
            "#c9f3ac",
          );
        });
      if (t.kind === "hunter" && warn)
        r.decal((g) => {
          for (let yy = t.y + 15; yy < 294; yy += 13) {
            const u = (yy - t.y) / (ARENA.lane - t.y);
            px.dot(g, t.x + (t.tx - t.x) * u, yy, "#746241");
          }
          const x = t.tx;
          px.line(g, x - 16, 288, x - 16, 299, "#ffd674");
          px.line(g, x + 16, 288, x + 16, 299, "#ffd674");
          px.line(g, x - 16, 294, x + 16, 294, "#ad8454");
          this.E.font.text(g, "AIM", x, 278, "#e9be7c", {
            align: "center",
            font: "tiny",
            outline: false,
          });
        });
      r.actor(
        t.x,
        t.y,
        0,
        (g, x, y) => {
          if (warn) {
            const radius = 12 + Math.sin(now * 14) * 2;
            this.ring(
              g,
              x,
              y,
              radius,
              radius * 0.5,
              col,
              0,
              Math.PI * 1.8,
              0.2,
            );
          }
          if (t.kind === "dart") {
            px.line(g, x, y - 14, x, y - 3, "#638da0", 2);
            px.poly(
              g,
              [
                [x - 5, y - 7],
                [x - 4, y + 2],
                [x, y + 7],
                [x + 4, y + 2],
                [x + 5, y - 7],
                [x, y - 3],
              ],
              "#769aaf",
            );
            px.poly(
              g,
              [
                [x - 2, y - 7],
                [x, y + 4],
                [x + 3, y - 7],
                [x, y - 2],
              ],
              "#f3f7e9",
            );
          } else if (t.kind === "mine") {
            px.disc(g, x, y, 8, "#521c3e");
            px.disc(g, x - 1, y - 1, 6, "#b93463");
            px.disc(g, x - 2, y - 2, 3, "#ff6b88");
            px.dot(g, x - 2, y - 3, "#ffe6c5");
            for (let i = 0; i < 3; i++) {
              const a = ht * 2.5 + i * 2.094;
              px.rect(
                g,
                x + Math.cos(a) * 11 - 1,
                y + Math.sin(a) * 6 - 1,
                3,
                3,
                "#ff987f",
              );
            }
          } else if (t.kind === "roller") {
            const a = t.ground ? ht * 7 : ht * 2;
            for (let i = 0; i < 4; i++) {
              const aa = a + (i * Math.PI) / 2;
              px.line(
                g,
                x,
                y,
                x + Math.cos(aa) * 9,
                y + Math.sin(aa) * 9,
                "#365941",
                5,
              );
              px.line(
                g,
                x,
                y,
                x + Math.cos(aa) * 8,
                y + Math.sin(aa) * 8,
                "#b6ff72",
                2,
              );
            }
            px.disc(g, x, y, 3, "#e6ffd0");
            if (t.ground) {
              px.line(g, x - 10, y + 4, x + 10, y + 4, "#7da964");
              px.rect(g, x - 3, y - 2, 6, 4, "#e6f5a9");
            }
          } else {
            px.poly(
              g,
              [
                [x, y - 12],
                [x + 9, y],
                [x, y + 12],
                [x - 9, y],
              ],
              "#7b4e55",
            );
            px.poly(
              g,
              [
                [x, y - 9],
                [x + 6, y],
                [x, y + 9],
                [x - 6, y],
              ],
              "#ffd674",
            );
            px.line(g, x, y - 8, x, y + 8, "#fff3cf");
            px.dot(g, x - 2, y - 3, "#fff");
          }
        },
        { emissive: true },
      );
    }
    for (const s of w.shots) {
      const p = w.players.find((p) => p.id === s.owner);
      r.actor(
        s.x,
        s.y,
        0,
        (g, x, y) => {
          px.rect(g, x - 1, y - 7, 3, 13, PILOT_COLORS[p?.seat || 0]);
          px.rect(g, x, y - 8, 1, 8, "#ffffff");
        },
        { emissive: true },
      );
    }
    for (const p of w.players) {
      if (!p.connected) continue;
      const c = PILOT_COLORS[p.seat];
      this.game.lights.add(p.x, p.y, 0, 38, p.hp > 0 ? 0.7 : 0.15, {
        color: c,
      });
      r.sprite(
        p.x,
        p.y - 2 + (p.recoil || 0) * 2,
        0,
        this.pilotSprites[p.seat],
        {
          anchor: "center",
          rot: (p.vx || 0) * 0.00015,
          flash: p.inv > 0 && Math.floor(now * 9) % 2 ? "#a3ffff" : undefined,
          alpha: p.hp <= 0 ? 0.3 : 1,
        },
      );
      r.overlay((g) => {
        if (p.hp > 0) {
          for (let i = 0; i < 3; i++) {
            const x = p.x - 10 + i * 10,
              y = 322;
            px.poly(
              g,
              [
                [x, y - 3],
                [x + 3, y],
                [x, y + 3],
                [x - 3, y],
              ],
              i < p.hp ? c : "#2d3b4c",
            );
          }
        } else
          this.E.font.text(g, "REBOOT NEXT WAVE", p.x, 321, c, {
            align: "center",
            font: "tiny",
            outline: false,
          });
        if (w.players.length > 1)
          this.E.font.text(g, "P" + (p.seat + 1), p.x, 335, c, {
            align: "center",
            font: "tiny",
            outline: false,
          });
        if (p.inv > 0 && p.hp > 0)
          this.ring(g, p.x, p.y - 2, 20, 18, c, now, now + Math.PI * 1.5, 0.15);
      });
    }
    r.overlay((g) => {
      for (const f of this.fx) {
        const age = now - f.born,
          rad = 4 + age * (f.type === "phaseBreak" ? 160 : 28);
        if (age < 0.55)
          this.ring(
            g,
            f.x,
            f.y,
            rad,
            rad * 0.7,
            f.color,
            age * 2,
            age * 2 + 4,
            0.12,
          );
        if (f.points)
          this.E.font.text(
            g,
            "+" + f.points,
            f.x,
            f.y - age * 25 - 12,
            f.color,
            { align: "center", outline: false },
          );
      }
      if (w.brakeLeft > 0) {
        px.blend(g, 0.055, "screen", () =>
          px.rect(g, 25, 30, 590, 290, "#73dcf4"),
        );
        for (let i = 0; i < 6; i++)
          px.line(g, 28 + i * 4, 288, 28 + i * 4, 280 - i * 7, "#72dbe4");
        this.E.font.text(g, "TIME BRAKE", 320, 268, "#a8f3ee", {
          align: "center",
          scale: 2,
          outline: false,
        });
      }
      this.hud(g, w, options);
    });
    if (options.hitboxes || options.trajectories)
      r.overlay((g) => {
        if (options.hitboxes) {
          for (const o of [...w.players, ...w.enemies, ...w.threats])
            this.ring(
              g,
              o.x,
              o.y,
              o.r || 6,
              o.r || 6,
              "#ffffff",
              0,
              Math.PI * 2,
              0.3,
            );
        }
        if (options.trajectories)
          for (const t of w.threats) {
            px.line(g, t.x, t.y, t.x + t.vx * 0.5, t.y + t.vy * 0.5, "#ffe880");
            this.E.font.text(g, String(t.target ?? ""), t.x + 9, t.y, "#fff", {
              font: "tiny",
            });
          }
      });
  }
  titleFleet(r) {
    const t = this.game.reduceMotion ? 0 : this.game.real;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.22 + i * 0.38,
        x = 472 + Math.cos(a) * 151,
        y = 174 + Math.sin(a) * 85;
      r.sprite(x, y, 0, this.hulls[i % 3], {
        t: t + i,
        anchor: "center",
        scale: 1.2 + (Math.sin(a) + 1) * 0.32,
        rot: Math.cos(a) * 0.2,
      });
    }
  }
  hud(g, w, o) {
    const E = this.E,
      { px } = E;
    E.font.text(g, String(w.score).padStart(6, "0"), 29, 12, "#f5e6c9", {
      scale: 2,
      outline: false,
      shadow: "#030a15",
    });
    E.font.text(g, "TEAM SCORE", 30, 30, "#7b9ba8", {
      font: "tiny",
      outline: false,
    });
    E.font.text(
      g,
      w.wave < 8
        ? "WAVE " + String(w.wave + 1).padStart(2, "0") + " / 08"
        : "THE BANDIT BOSS",
      609,
      12,
      "#c5d7df",
      { scale: w.wave < 8 ? 2 : 1, align: "right", outline: false },
    );
    const label =
      w.wave < 8 ? WAVES[w.wave].name : BOSS_PHASES[w.bossPhase].name;
    E.font.text(g, label.toUpperCase(), 610, 31, "#98b6c3", {
      align: "right",
      font: "tiny",
      outline: false,
    });
    px.rect(g, 228, 340, 184, 6, "#1f3348");
    px.rect(
      g,
      228,
      340,
      (184 * w.brake) / 100,
      6,
      w.brake >= 100 ? "#d4f7c9" : "#6ac8cb",
    );
    for (let i = 1; i < 8; i++) px.rect(g, 228 + i * 23, 340, 1, 6, "#112032");
    const prompt =
      w.brake >= 100
        ? (o.brakeLabel || "SHIFT") + "  TIME BRAKE"
        : "INTERCEPT TO CHARGE  " + Math.floor(w.brake) + "%";
    E.font.text(g, prompt, 320, 350, w.brake >= 100 ? "#efffcb" : "#8baebb", {
      align: "center",
      font: "tiny",
      outline: false,
    });
    if (w.modified && !w.demo)
      E.font.text(g, "DEV / MODIFIED", 32, 335, "#ffca85", {
        font: "tiny",
        outline: false,
      });
    else if (w.assists?.autoFire || w.assists?.slow || w.assists?.emergency)
      E.font.text(g, "ASSISTED", 32, 335, "#acd2a5", {
        font: "tiny",
        outline: false,
      });
    if (o.network)
      E.font.text(g, o.network, 608, 348, "#91b9bf", {
        align: "right",
        font: "tiny",
        outline: false,
      });
    if (this.subtitleUntil > this.game.real && this.subtitle) {
      const lines = E.font.wrap(this.subtitle, 350, {});
      for (let i = 0; i < lines.length; i++)
        E.font.text(g, lines[i], 320, 61 + i * 10, "#e3d6b9", {
          align: "center",
          outline: false,
          shadow: "#020811",
        });
    }
    if (
      w.phase === "countdown" ||
      w.phase === "intermission" ||
      (w.phase === "playing" && w.phaseTime < 3.5)
    ) {
      const clear = w.phase === "intermission";
      const heading = clear
        ? "FLEET BROKEN"
        : w.phase === "countdown"
          ? "DEFEND YOUR CENTURY"
          : "WAVE " + (w.wave + 1);
      const detail = clear
        ? "Ordnance dissolved. Integrity restored."
        : WAVES[w.wave]?.cue || "READ THE CORE. BREAK THE CLOCK.";
      E.font.text(g, heading, 320, 227, "#f6dfac", {
        align: "center",
        scale: 2,
        outline: false,
        shadow: "#080d1a",
      });
      E.font.text(g, detail, 320, 247, "#a7c1c9", {
        align: "center",
        outline: false,
      });
    }
    if (w.phase === "ending") {
      const t = w.phaseTime;
      E.font.text(g, "YOUR TIME IS YOUR OWN.", 320, 224, "#f8e7ae", {
        align: "center",
        scale: 2,
        outline: false,
      });
      E.font.text(
        g,
        t < 3
          ? "The rift closes. The invoice goes unanswered."
          : "Somewhere, the Boss is still filing a complaint.",
        320,
        246,
        "#a7c7c8",
        { align: "center", outline: false },
      );
    }
    if (w.demo) {
      px.rect(g, 185, 8, 270, 18, "#122a39");
      E.font.text(
        g,
        "DEMONSTRATION / ANY INPUT TO RETURN",
        320,
        13,
        "#d9ebbd",
        { align: "center", outline: false },
      );
    }
  }
}
