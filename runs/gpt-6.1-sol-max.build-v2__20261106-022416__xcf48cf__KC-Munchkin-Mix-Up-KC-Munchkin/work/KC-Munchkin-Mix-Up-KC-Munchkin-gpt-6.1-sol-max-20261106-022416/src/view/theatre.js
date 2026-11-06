(function (M) {
  "use strict";
  const { E, DIRS } = M,
    { px } = E,
    T = 16;
  const COLORS = {
    hero: ["#57e1dc", "#b0a0ff"],
    food: "#ffe29a",
    power: "#ffed9e",
    needle: "#f16d8b",
    peek: "#fbb66d",
    chonk: "#af91eb",
  };
  E.MATERIALS.mixMetal = { color: "#695083", pattern: "metal", rivet: 0 };
  E.MATERIALS.mixGlow = { color: "#a9f4e9", pattern: "none", glow: 1 };
  E.SHAPES.mixBolt = {
    about: "Original recessed cabinet screw",
    mats: { m: "mixMetal" },
    parts: [
      ["cyl", "m", [0, 0, 0], 2, 1, { seg: 8 }],
      ["box", "iron", [0, 0, 1], [2.5, 0.5, 0.3]],
    ],
  };
  E.SHAPES.mixRotor = {
    about: "Original low-profile pen rotor",
    mats: { m: "mixMetal", g: "mixGlow" },
    parts: [
      ["cyl", "m", [0, 0, 0], 20, 1, { seg: 16 }],
      ["cyl", "iron", [0, 0, 1], 15, 1, { seg: 12 }],
      ["ring", 8, 17, ["box", "g", [0, 0, 1], [1, 2, 1]]],
      ["box", "g", [0, -17, 1], [5, 2, 1]],
    ],
  };
  class Creature {
    constructor(kind, index = 0) {
      this.kind = kind;
      this.index = index;
      this.radius =
        kind === "food"
          ? 3.4
          : kind === "power"
            ? 4.2
            : kind === "chonk"
              ? 6.2
              : kind === "hero"
                ? 6
                : 5.5;
      const c = kind === "hero" ? COLORS.hero[index % 2] : COLORS[kind] || COLORS.food,
        tones = E.tones(c);
      this.rig = new E.Blob({
        R: this.radius,
        face: "front",
        charView: false,
        feet: kind === "food" || kind === "power",
        mouth: false,
        colors: {
          dk: tones.deep,
          base: c,
          lt: tones.lt,
          spec: tones.hi,
          eye: "#fff9e9",
          pupil: "#29182e",
        },
      });
      this.t = 0;
      this.entity = null;
      this.lean = 0;
    }
    update(dt, a, w) {
      this.t += dt;
      this.collapse = Math.max(0, (this.collapse || 0) - dt);
      this.entity = a;
      this.world = w;
      const d = DIRS[a.m.d] || [0, 0],
        moving = a.m.moving;
      const hunt = a.state === "hunting",
        fright = a.state === "frightened" || a.state === "warning";
      let color =
        this.kind === "hero" ? COLORS.hero[this.index % 2] : COLORS[this.kind] || COLORS.food;
      if (fright) color = "#a5d9d1";
      if (a.state === "recharging") color = "#776781";
      const tones = E.tones(color);
      Object.assign(this.rig.C, { base: color, dk: tones.deep, lt: tones.lt });
      this.rig.scale =
        this.kind === "chonk"
          ? 1.07
          : (this.kind === "food" || this.kind === "power") && w.remaining <= 3
            ? 1.15
            : 1;
      this.rig.update(dt, {
        look: a.hit ? [0, 1] : d,
        walk: moving ? 1 : 0,
        squint: hunt && this.kind === "needle",
        squash: a.hit
          ? -0.38
          : a.bite > 0
            ? -0.12
            : fright
              ? 0.1
              : moving
                ? Math.sin(this.t * 16) * 0.035
                : Math.sin(this.t * 3) * 0.035,
      });
      this.lean = M.clamp(this.lean + (moving ? 0.7 : -0.7) * dt, 0, 0.1);
    }
    draw(g, ox, oy, view) {
      const a = this.entity,
        w = this.world;
      if (!a) return;
      const sc = view.scale,
        R = this.radius * sc,
        still = this.rig.t;
      const bob =
        this.kind === "food" || this.kind === "power" ? Math.sin(still * 10 + this.index) * 0.6 : 0;
      oy -= bob * sc;
      if (a.state === "returning") {
        if (this.collapse > 0) {
          const old = this.rig.sq;
          this.rig.sq = -0.44;
          this.rig.scale = this.collapse / 0.25;
          this.rig.draw(g, ox, oy, view);
          this.rig.scale = 1;
          this.rig.sq = old;
        }
        for (const s of [-1, 1]) {
          px.ell(g, ox + s * R * 0.35, oy, 1.7 * sc, 2.2 * sc, "#f5eedf");
          px.dot(g, ox + s * R * 0.35 + (DIRS[a.m.d]?.[0] || 0) * sc, oy, "#594174");
        }
        for (let i = 0; i < 3; i++)
          px.rect(g, ox + (i - 1) * R * 0.7, oy + R * 0.6, 1.8 * sc, sc, "#bba8d4");
        return;
      }
      if (this.kind === "hero") {
        for (const s of [-1, 1]) {
          const bend = this.index === 1 ? s * 2 : Math.sin(still * 4 + s) * 0.8;
          const x = ox + s * R * 0.56,
            y = oy - R * 0.62;
          px.line(g, x, y, x + s * R * 0.22 + bend * sc, y - R * 0.7, "#247679", Math.max(1, sc));
          if (this.index === 1)
            px.poly(
              g,
              [
                [x + s * R * 0.22 + bend * sc - 2 * sc, y - R * 0.7],
                [x + s * R * 0.22 + bend * sc, y - R * 0.7 - 2 * sc],
                [x + s * R * 0.22 + bend * sc + 2 * sc, y - R * 0.7],
              ],
              "#eee1ff",
            );
          else px.disc(g, x + s * R * 0.22 + bend * sc, y - R * 0.7, 1.7 * sc, "#affff0");
        }
      }
      if (["needle", "peek", "chonk"].includes(this.kind)) {
        const feet = this.kind === "needle" ? 4 : 3;
        for (let i = 0; i < feet; i++) {
          const x = ox + (i - (feet - 1) / 2) * R * 0.58,
            walk = Math.sin(still * 11 + i) * sc * (a.m.moving ? 1 : 0);
          px.line(g, x, oy + R * 0.5, x + walk, oy + R * 1.12, "#5a304e", Math.max(1, sc));
          px.ell(g, x + walk, oy + R * 1.12, 1.5 * sc, 0.7 * sc, "#dac1c8");
        }
        if (this.kind === "needle")
          px.poly(
            g,
            [
              [ox - R * 0.4, oy - R * 0.7],
              [ox, oy - R * 1.65],
              [ox + R * 0.4, oy - R * 0.7],
            ],
            "#fda0b7",
          );
        if (this.kind === "peek")
          for (const s of [-1, 1])
            px.poly(
              g,
              [
                [ox + s * R * 0.6, oy - R * 0.5],
                [ox + s * R * 1.3, oy - R * 1.15],
                [ox + s * R * 0.8, oy + R * 0.1],
              ],
              "#ffd5a0",
            );
        if (this.kind === "chonk")
          for (const s of [-1, 1])
            px.ell(g, ox + s * R * 0.87, oy - R * 0.22, R * 0.35, R * 0.42, "#8d6fbf");
      }
      this.rig.draw(g, ox, oy, view);
      const mouthY = oy + R * 0.44,
        mouthX = ox + (DIRS[a.m.d]?.[0] || 0) * R * 0.15;
      if (this.kind === "hero") {
        const bite = a.bite > 0,
          alarm = a.hit > 0,
          win = w.phase === "clear" || w.phase === "won";
        if (bite || win) {
          px.ell(g, mouthX, mouthY, R * 0.49, R * (bite ? 0.4 : 0.3), "#20212f");
          px.ell(g, mouthX, mouthY + R * 0.13, R * 0.25, R * 0.11, "#fc9baf");
          px.rect(g, mouthX - R * 0.28, mouthY - R * 0.18, R * 0.56, sc, "#fff8db");
        } else if (alarm) {
          px.poly(
            g,
            [
              [mouthX - R * 0.35, mouthY + sc],
              [mouthX, mouthY - sc],
              [mouthX + R * 0.35, mouthY + sc],
            ],
            "#24444e",
          );
        } else {
          px.line(g, mouthX - R * 0.4, mouthY - sc, mouthX - R * 0.24, mouthY + sc, "#24444e", sc);
          px.line(g, mouthX - R * 0.24, mouthY + sc, mouthX + R * 0.24, mouthY + sc, "#24444e", sc);
          px.dot(g, mouthX + R * 0.38, mouthY, "#24444e");
        }
        for (const s of [-1, 1])
          px.ell(g, ox + s * R * 0.72, oy + R * 0.2, 1.1 * sc, 0.6 * sc, "#e6b7b9");
      } else if (this.kind === "food" || this.kind === "power") {
        px.rect(g, mouthX - sc, mouthY, 2 * sc, sc, "#8d592e");
        if (this.kind === "power") {
          const sy = oy - R * 1.3;
          const twinkle = Math.sin(this.t * 5) > 0;
          if (twinkle) {
            px.dot(g, ox - R * 1.2, oy - R * 0.6, "#fff5cf");
            px.dot(g, ox + R * 1.25, oy + R * 0.2, "#ffe9ad");
          }
          px.poly(
            g,
            [
              [ox, sy - 2 * sc],
              [ox + sc, sy],
              [ox + 3 * sc, sy],
              [ox + 1.5 * sc, sy + sc],
              [ox + 2 * sc, sy + 3 * sc],
              [ox, sy + 2 * sc],
              [ox - 2 * sc, sy + 3 * sc],
              [ox - 1.5 * sc, sy + sc],
              [ox - 3 * sc, sy],
              [ox - sc, sy],
            ],
            "#fff6c9",
          );
        }
        if (a.turn > 0) {
          const d = DIRS[a.pending] || DIRS[a.m.d] || [0, 0];
          px.disc(g, ox + d[0] * R * 1.35, oy + d[1] * R * 1.35, 0.7 * sc, "#fff4c9");
        }
      } else {
        const frightened = a.state === "frightened" || a.state === "warning";
        if (frightened) {
          px.poly(
            g,
            [
              [mouthX - R * 0.4, mouthY],
              [mouthX - R * 0.2, mouthY - sc],
              [mouthX, mouthY + sc],
              [mouthX + R * 0.2, mouthY - sc],
              [mouthX + R * 0.4, mouthY],
            ],
            "#35505a",
          );
        } else {
          px.rect(g, mouthX - R * 0.45, mouthY, R * 0.9, 2 * sc, "#3f2843");
          for (let i = 0; i < 3; i++)
            px.rect(g, mouthX - R * 0.32 + i * R * 0.3, mouthY, sc, sc, "#fff3d2");
        }
        if (a.state === "warning")
          for (let i = -1; i <= 1; i++)
            px.line(
              g,
              ox + i * R * 0.5,
              oy - R * 0.7,
              ox + i * R * 0.5 + R * 0.35,
              oy - R * 0.25,
              "#fff1d9",
              Math.max(1, sc),
            );
        if (a.state === "penned" || a.state === "recharging")
          px.rect(
            g,
            ox - R * 0.4,
            oy - R * 1.2,
            Math.max(sc, R * 0.8 * (1 - M.clamp(a.wait / 12, 0, 1))),
            sc,
            "#ddc4fc",
          );
      }
    }
  }
  class Theatre {
    constructor(game, app) {
      this.game = game;
      this.app = app;
      this.rigs = new Map();
      this.lastEvent = 0;
      this.rev = 0;
      this.trails = new Map();
      this.layout = {};
    }
    reset() {
      this.rigs.clear();
      this.lastEvent = 0;
      this.rev = 0;
      this.trails.clear();
    }
    fit(w) {
      const g = this.game,
        title = this.app.screen === "title",
        portrait = g.H > g.W * 1.05;
      let zoom = Math.min((g.W - 64) / (w.board.w * T), (g.H - 88) / (w.board.h * T)),
        offset = [0, 10];
      if (title) {
        zoom = portrait
          ? Math.min((g.W - 54) / (w.board.w * T), (g.H * 0.43) / (w.board.h * T))
          : Math.min((g.W * 0.55 - 20) / (w.board.w * T), (g.H - 90) / (w.board.h * T));
        offset = portrait ? [0, g.H * 0.22] : [g.W * 0.195, 12];
      }
      zoom = M.clamp(zoom, 0.5, 2.5);
      if (Math.abs(g.zoom - zoom) > 0.005) g.setZoom(zoom);
      g.cam.offset = offset;
      g.cam.smooth = 0;
      g.focus((w.board.w * T) / 2, (w.board.h * T) / 2, 0);
      this.layout = { zoom, portrait };
    }
    update(w, dt) {
      if (this.app.net?.active && !AIHub.isHost) this.app.net.predict(dt);
      this.fit(w);
      const actors = [...w.food.filter((f) => f.alive), ...w.predators, ...w.players];
      for (const a of actors) {
        const hero = w.players.includes(a),
          food = w.food.includes(a),
          kind = hero ? "hero" : food ? (a.power ? "power" : "food") : a.id;
        const id = (hero ? "p" : food ? "f" : "e") + a.id;
        let rig = this.rigs.get(id);
        if (!rig) {
          rig = new Creature(kind, hero ? a.seat : food ? Number(a.id.slice(1)) : 0);
          this.rigs.set(id, rig);
        }
        rig.update(dt, a, w);
        let trail = this.trails.get(id) || [];
        if (w.tick % 5 === 0 && a.m.moving) {
          trail.push([a.m.x, a.m.y]);
          if (trail.length > 5) trail.shift();
          this.trails.set(id, trail);
        }
      }
      for (const e of w.events) {
        if (e.id <= this.lastEvent) continue;
        this.lastEvent = e.id;
        const x = (e.x + 0.5) * T,
          y = (e.y + 0.5) * T;
        if (e.type === "bite" || e.type === "catch") {
          this.game.particles.glints(x, y, 0, 6, e.type === "catch" ? "#ddb1ff" : "#fff0ab");
          this.game.particles.ring(x, y, 2, 11, "#ffe4a1", 0.25);
          const p = this.rigs.get("p" + e.player);
          if (p) p.rig.kick(-2);
        }
        if (e.type === "hit") {
          this.game.particles.bits(x, y, 0, 10, ["#7ef3e3", "#ead4ff"]);
          if (!this.game.reduceMotion) this.game.shake(1.2);
        }
        if (e.type === "catch") {
          const enemy = this.rigs.get("e" + e.enemy);
          if (enemy) enemy.collapse = 0.25;
        }
        if (e.type === "tunnel") {
          for (const side of [0.5, w.board.w - 0.5])
            this.game.particles.glints(side * T, y, 0, 4, "#b9f0e1");
        }
        if (e.type === "chirp") this.game.particles.ring(x, y, 3, 75, "#b4f5e9", 0.7);
        if (e.type === "clear" || e.type === "victory") {
          for (let i = 0; i < 16; i++)
            this.game.particles.glints(
              (1 + ((i * 7) % 19) + 0.5) * T,
              (1 + ((i * 11) % 15) + 0.5) * T,
              0,
              3,
              ["#ffe2a3", "#b3e7db", "#ceabef"][i % 3],
            );
        }
      }
    }
    draw(r, w) {
      const g = this.game,
        b = w.board,
        t = w.time,
        scale = r.view.scale,
        [bx, by] = r.w(0, 0),
        S = T * scale,
        bw = b.w * S,
        bh = b.h * S;
      r.sky(["#100d1b", "#171020", "#21152a"]);
      r.decal((ctx) => {
        // Toy cabinet surround, printed circuit traces and recessed floor.
        px.rect(ctx, bx - 12 * scale, by - 12 * scale, bw + 24 * scale, bh + 24 * scale, "#100e1a");
        px.rect(ctx, bx - 10 * scale, by - 10 * scale, bw + 20 * scale, bh + 20 * scale, "#3e2a52");
        px.rect(ctx, bx - 8 * scale, by - 8 * scale, bw + 16 * scale, bh + 16 * scale, "#251b34");
        px.line(
          ctx,
          bx - 7 * scale,
          by - 7 * scale,
          bx + bw + 6 * scale,
          by - 7 * scale,
          "#9d72bd",
          scale,
        );
        px.line(
          ctx,
          bx - 7 * scale,
          by - 7 * scale,
          bx - 7 * scale,
          by + bh + 6 * scale,
          "#694981",
          scale,
        );
        px.rect(ctx, bx - 2 * scale, by - 2 * scale, bw + 4 * scale, bh + 4 * scale, "#0a101d");
        for (let y = 0; y < b.h; y++)
          for (let x = 0; x < b.w; x++) {
            const X = bx + x * S,
              Y = by + y * S;
            px.rect(ctx, X, Y, S + 0.1, S + 0.1, (x + y) % 2 ? "#211a2e" : "#241c32");
            if (b.baseWalk(x, y) && (x * 7 + y * 11) % 5 === 0) {
              px.rect(ctx, X + S * 0.45, Y + S * 0.46, scale, scale, "#3e3049");
            }
            if (!b.baseWalk(x, y)) {
              const pen = x >= 8 && x <= 12 && y >= 6 && y <= 10,
                edge = x === 0 || x === 20 || y === 0 || y === 16;
              let shown = 1;
              const fades =
                w.data.reveal.kind === "all" ||
                (w.data.reveal.kind === "bands" && (y < 6 || y > 10));
              if (fades && !pen && !edge && w.reveal <= 0 && !w.showWalls) {
                const moving = w.players.some((p) => p.m.moving);
                shown = moving ? 0.1 : 0.4;
                if (w.echo.some((e) => Math.hypot(e.x - x, e.y - y) < 3)) shown = 0.9;
              }
              px.blend(ctx, shown, "normal", () => {
                px.rect(ctx, X + scale, Y + 2 * scale, S - scale, S - scale, "#0d0e19");
                px.rect(
                  ctx,
                  X + scale,
                  Y + scale,
                  S - 2 * scale,
                  S - 3 * scale,
                  pen ? "#675779" : "#68459a",
                );
                px.rect(
                  ctx,
                  X + 2 * scale,
                  Y + scale,
                  S - 4 * scale,
                  2 * scale,
                  pen ? "#a795b7" : "#b389e4",
                );
                px.rect(ctx, X + scale, Y + 2 * scale, scale, S - 5 * scale, "#9471c5");
                px.rect(ctx, X + 2 * scale, Y + S - 4 * scale, S - 4 * scale, 2 * scale, "#3b2b60");
                if ((x + y) % 3 === 0)
                  px.line(
                    ctx,
                    X + 4 * scale,
                    Y + S / 2,
                    X + S - 4 * scale,
                    Y + S / 2,
                    "#7853a9",
                    scale,
                  );
              });
            }
          }
        for (let i = 0; i < 4; i++) {
          const [x, y] = b.gateCells[i],
            X = bx + x * S,
            Y = by + y * S,
            open = i === b.orientation;
          if (!open) {
            px.rect(ctx, X + scale, Y + scale, S - 2 * scale, S - 2 * scale, "#695979");
            for (let j = 0; j < 3; j++)
              px.rect(
                ctx,
                X + (3 + j * 4) * scale,
                Y + 3 * scale,
                2 * scale,
                S - 6 * scale,
                "#a895be",
              );
          } else {
            px.rect(
              ctx,
              X + 2 * scale,
              Y + 2 * scale,
              S - 4 * scale,
              S - 4 * scale,
              w.gateWarn ? "#a38d67" : "#32505b",
            );
            const d = DIRS[i],
              cx = X + S / 2,
              cy = Y + S / 2;
            px.line(
              ctx,
              cx - d[0] * 3 * scale,
              cy - d[1] * 3 * scale,
              cx + d[0] * 3 * scale,
              cy + d[1] * 3 * scale,
              "#bcf9de",
              scale,
            );
          }
        }
        // Every tunnel mouth is striped and shows a matching destination tick.
        b.tunnels.forEach((tunnel, i) => {
          for (const p of [tunnel.a, tunnel.b]) {
            const X = bx + p[0] * S,
              Y = by + p[1] * S;
            px.rect(ctx, X, Y, S, S, "#364754");
            for (let j = 0; j < 4; j++)
              px.rect(
                ctx,
                X + j * 4 * scale,
                Y,
                2 * scale,
                S,
                ["#87d5d1", "#d9c4ee", "#f1d09d"][i % 3],
              );
            px.rect(ctx, X + 4 * scale, Y + 5 * scale, S - 8 * scale, S - 10 * scale, "#162333");
          }
        });
        if (w.phase === "clear" || w.phase === "won")
          px.blend(ctx, 0.08, "add", () => px.rect(ctx, bx, by, bw, bh, "#ffe6a8"));
      });
      for (const p of [
        [-5, -5],
        [b.w * T + 5, -5],
        [-5, b.h * T + 5],
        [b.w * T + 5, b.h * T + 5],
      ])
        r.shape("mixBolt", ...p, 0, { scale: 0.8, shadow: false });
      r.shape("mixRotor", 10.5 * T, 8.5 * T, 0, {
        facing:
          ((b.orientation + (w.gateTime < 0.22 && w.stageTime > 0.3 ? -1 + w.gateTime / 0.22 : 0)) *
            Math.PI) /
          2,
        shadow: false,
        bias: -500,
      });
      for (const a of [...w.food.filter((f) => f.alive), ...w.predators, ...w.players]) {
        const hero = w.players.includes(a),
          food = w.food.includes(a),
          id = (hero ? "p" : food ? "f" : "e") + a.id,
          rig = this.rigs.get(id);
        if (!rig) continue;
        let renderX = a.m.x,
          renderY = a.m.y;
        const net = this.app.net;
        if (net?.active && !AIHub.isHost && net.renderFrom) {
          const old = net.renderFrom.get(a.id),
            u = M.clamp((performance.now() - net.renderAt) / 100, 0, 1);
          if (old) {
            let dx = a.m.x - old[0];
            if (Math.abs(dx) > b.w / 2) dx -= Math.sign(dx) * b.w;
            renderX = old[0] + dx * u;
            renderY = old[1] + (a.m.y - old[1]) * u;
            if (renderX > b.w - 0.5) renderX -= b.w;
          }
        }
        if (
          hero &&
          net?.active &&
          !AIHub.isHost &&
          a.id === AIHub.me &&
          net.predicted &&
          net.predictionRevision === w.revision &&
          !a.hit
        ) {
          renderX = net.predicted.x;
          renderY = net.predicted.y;
        }
        const xx = (renderX + 0.5) * T,
          yy = (renderY + 0.5) * T,
          colors = hero
            ? COLORS.hero[a.seat % 2]
            : food
              ? a.power
                ? "#ffd779"
                : "#ebc993"
              : COLORS[a.id];
        if (food && w.remaining <= 3)
          r.decal(() => r.groundRing(xx, yy, w.remaining === 1 ? 7 : 5.5, "#e9c789", 0.65));
        if (food && w.remaining <= 3 && !this.game.reduceMotion) {
          const tr = this.trails.get(id) || [];
          for (let i = 0; i < tr.length; i++)
            r.decal(() =>
              r.groundDisc(
                (tr[i][0] + 0.5) * T,
                (tr[i][1] + 0.5) * T,
                1.4,
                "#b99b67",
                0.12 + i * 0.025,
              ),
            );
        }
        if (hero) {
          r.decal(() => {
            r.groundRing(xx, yy, 8.3, colors, 1);
            if (a.chirpFx > 0) r.groundRing(xx, yy, 12 + (1 - a.chirpFx / 0.75) * 42, "#a9ede3", 1);
          });
        }
        r.shadow(xx, yy, food ? 3 : 6, 0.32, "#070b16");
        const drawAt = (x, y) =>
          r.actor(x, y, 0, (ctx, ox, oy) => rig.draw(ctx, ox, oy, r.view), {
            alpha: hero && a.inv > 0 ? (Math.floor(t * 8) % 2 ? 0.52 : 1) : 1,
            outline: hero ? "#d3fcf0" : false,
          });
        drawAt(xx, yy);
        if (a.m.x < 0.3 && b.tunnels.some((t) => Math.abs(a.m.y - t.a[1]) < 0.2))
          drawAt(xx + b.w * T, yy);
        if (a.m.x > b.w - 1.3 && b.tunnels.some((t) => Math.abs(a.m.y - t.a[1]) < 0.2))
          drawAt(xx - b.w * T, yy);
        if (hero) r.textAt(xx, yy + 10, 0, String(a.seat + 1), colors);
        if (this.app.overlays) {
          r.groundRing(xx, yy, 4.7, food ? "#fff1b9" : "#f9a8c2", 1);
          r.textAt(xx, yy - 12, 0, hero ? "P" + (a.seat + 1) : food ? a.id : a.state, "#f2dfc8");
          if (a.m.moving) {
            const end = r.w((a.m._to[0] + 0.5) * T, (a.m._to[1] + 0.5) * T, 0),
              start = r.w(xx, yy, 0);
            r.overlay((ctx) => px.line(ctx, ...start, ...end, "#e9ce9f", 1));
          }
        }
      }
      if (this.app.screen === "editor") this.drawEditor(r, b, bx, by, S);
      if (this.app.screen === "attract")
        r.overlay((ctx) => {
          E.ui.box(ctx, r.W / 2 - 120, r.H - 40, 240, 29, { bg: "#161223", border: "#a789b6" });
          E.font.text(ctx, "A LITTLE MISCHIEF / DEMO", r.W / 2, r.H - 34, "#ffe8b1", {
            align: "center",
          });
          E.font.text(ctx, "Any input brings you back", r.W / 2, r.H - 22, "#c8b9db", {
            align: "center",
          });
        });
      if (this.app.screen === "play" && w.phase === "intro")
        this.card(
          r,
          w.data.name,
          w.data.subtitle,
          `${Math.max(1, Math.ceil(w.phaseT))} ... READY, STEADY, CHEW!`,
        );
      if (this.app.screen === "play" && w.phase === "clear")
        this.card(
          r,
          "DELICIOUS!",
          w.data.clear,
          `${w.stageIndex === 5 || w.mode !== "campaign" ? "One last laugh" : "Next mix coming up"} · +${w.tuning.lifeRestore} life`,
        );
      if (this.app.net?.active && !this.app.net.started)
        this.card(
          r,
          "GET YOUR GRIN ON",
          "YOUR TEAM IS GETTING READY",
          "Hub starts the round automatically",
        );
      else if (this.app.net?.active && AIHub.time() < 0)
        this.card(
          r,
          String(Math.max(1, Math.ceil(-AIHub.time() / 1000))),
          "READY, STEADY, CHEW!",
          "A shared appetite. A shared adventure.",
        );
    }
    card(r, title, sub, foot) {
      r.overlay((ctx) => {
        const width = Math.min(330, r.W - 36),
          x = (r.W - width) / 2,
          y = r.H / 2 - 43;
        E.ui.box(ctx, x, y, width, 85, { bg: "#21182f", border: "#d4a9ed", alpha: 0.97 });
        E.font.title(ctx, title, r.W / 2, y + 12, {
          scale: 1,
          colors: ["#fff1bd", "#dfbcf1"],
          align: "center",
          depth: 1,
        });
        E.font.text(ctx, sub, r.W / 2, y + 34, "#d0c2de", { align: "center", wrap: width - 20 });
        E.font.text(ctx, foot, r.W / 2, y + 63, "#99e6d7", { align: "center", wrap: width - 20 });
      });
    }
    drawEditor(r, b, bx, by, S) {
      const ed = this.app.editor,
        sc = r.view.scale;
      r.overlay((ctx) => {
        for (let i = 0; i < ed.data.food.length; i++) {
          const f = ed.data.food[i],
            x = bx + (f.x + 0.5) * S,
            y = by + (f.y + 0.5) * S;
          px.disc(ctx, x, y, (f.power ? 4 : 3) * sc, f.power ? "#fff3b8" : "#e8bb77");
        }
        for (let i = 0; i < 2; i++) {
          const p = ed.data.spawns[i];
          E.font.text(
            ctx,
            String(i + 1),
            bx + (p[0] + 0.5) * S,
            by + (p[1] + 0.3) * S,
            COLORS.hero[i],
            { align: "center" },
          );
        }
        const x = bx + ed.x * S,
          y = by + ed.y * S,
          c = ed.errors.length ? "#f99cac" : "#b4f5e2";
        px.line(ctx, x, y, x + S, y, c, sc);
        px.line(ctx, x + S, y, x + S, y + S, c, sc);
        px.line(ctx, x, y + S, x + S, y + S, c, sc);
        px.line(ctx, x, y, x, y + S, c, sc);
      });
    }
    cellAt(sx, sy) {
      const g = this.game,
        p = g.view.toGround(g.cam.x + sx, g.cam.y + sy);
      return p ? [Math.floor(p[0] / T), Math.floor(p[1] / T)] : null;
    }
  }
  M.Creature = Creature;
  M.Theatre = Theatre;
})(globalThis.Mix);
