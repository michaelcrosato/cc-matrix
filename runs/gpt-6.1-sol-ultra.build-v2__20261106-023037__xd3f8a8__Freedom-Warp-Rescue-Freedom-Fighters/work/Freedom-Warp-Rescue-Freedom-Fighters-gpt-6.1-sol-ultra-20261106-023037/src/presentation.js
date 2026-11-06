/* Freedom Warp Rescue — native shaded part art and continuous state-driven poses.
 * The local part-frame convention extends the supplied horizontal shooter kit.
 * All pixels, lighting, outlines, palettes, shape props and text use my-3D2dge.
 */
(() => {
  "use strict";
  const F = (globalThis.FWR ||= {});
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const finite = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const mix = (a, b, t) => a + (b - a) * t;
  const wrap = (v, n) => ((v % n) + n) % n;
  const PALETTES = {
    ship: { hull: "#f0c277", wing: "#ca7152", trim: "#f7e6bb", glass: "#64e6ec", dark: "#354652" },
    layer: { hull: "#ae7252", wing: "#de8751", trim: "#f8d995", glass: "#ff735f", dark: "#493d56" },
    guard: { hull: "#9c5268", wing: "#5a536e", trim: "#ff8c85", glass: "#ffc879", dark: "#35324c" },
    interceptor: {
      hull: "#b6b8ce",
      wing: "#656980",
      trim: "#f16c70",
      glass: "#ffcaa2",
      dark: "#34364d",
    },
    carrier: {
      hull: "#66556f",
      wing: "#3a3f57",
      trim: "#c89c82",
      glass: "#f4a474",
      dark: "#282b41",
    },
  };
  // Parts are one half of a symmetric silhouette, in a frame u=across, v=forward.
  const art = (str) =>
    str.split("|").map((s) => {
      const [kind, ...q] = s.trim().split(/\s+/);
      return [kind, q.map((v) => v.split(",").map(Number))];
    });
  const SHIP = art(
    "fire 6,-21|wing 3,-5 16,-13 17,-20 5,-15|wingHi 3,-5 16,-13 16,-15 4,-8|trim 13,-13 17,-15 17,-20 13,-18|dark 4,5 9,2 10,-19 4,-21|hull 0,27 3,24 7,11 7,-14 3,-22 0,-22|hullHi 0,25 3,21 5,10 4,-14 0,-19|wing 4,13 20,2 18,-6 6,1|wingHi 5,12 18,2 17,0 6,4|trim 16,3 20,2 18,-6 15,-4|glass 0,16 3,13 4,5 0,1|sheen 0,14 1,13 2,6 0,4|dark 0,-12 3,-13 3,-18 0,-18|line 5,11 6,-9 3,-18|line 8,2 15,-1|mark 12,0,1.7",
  );
  const INTERCEPTOR = art(
    "fire 0,-17|wing 2,1 15,-6 16,-15 4,-9|wingHi 3,0 14,-6 14,-8 4,-5|trim 13,-6 16,-8 16,-15 13,-13|hull 0,20 3,15 5,4 4,-13 0,-17|hullHi 0,18 2,13 3,3 2,-11 0,-14|glass 0,12 2,9 2,4 0,1|line 4,-3 11,-8|mark 10,-9,1.3",
  );
  const GUARD = art(
    "fire 5,-15|wing 3,8 20,15 24,9 20,-14 7,-20|wingHi 5,6 20,12 21,8 17,-10 7,-16|dark 7,6 14,8 16,3 12,-11 7,-15|trim 17,12 22,11 24,9 20,-14 18,-12|hull 0,13 5,10 7,-12 3,-19 0,-19|hullHi 0,11 3,8 4,-11 0,-15|glass 0,6 3,5 3,-1 0,-3|mark 0,-9,2",
  );
  const TONES = ["deep", "sh", "base", "lt", "hi"];

  function defineAssets(E) {
    if (E.SHAPES["fwr:fragment"]) return;
    E.MATERIALS["fwr:steel"] = { color: "#46546a", pattern: "metal", rivet: 0.4 };
    E.MATERIALS["fwr:prison"] = { color: "#756582", pattern: "metal", rivet: 0.7 };
    E.MATERIALS["fwr:signal"] = { color: "#71dce2", pattern: "none", glow: 1 };
    E.SHAPES["fwr:fragment"] = {
      about: "broken orbital prison beam with cold signal strip",
      mats: { s: "fwr:steel", p: "fwr:prison", g: "fwr:signal" },
      parts: [
        ["box", "s", [0, 0, 0], [42, 14, 8]],
        ["box", "p", [-10, 0, 8], [10, 17, 4]],
        ["box", "p", [10, 0, 8], [10, 17, 4]],
        ["box", "g", [0, 0, 9], [8, 2, 2]],
      ],
    };
    E.SHAPES["fwr:relay"] = {
      about: "original evacuation relay with hexagonal collar and beacon",
      mats: { s: "fwr:steel", g: "fwr:signal" },
      parts: [
        ["cyl", "s", [0, 0, 0], 13, 5, { seg: 6 }],
        ["cyl", "s", [0, 0, 5], 7, 6, { seg: 6 }],
        ["box", "g", [0, 0, 11], [3, 3, 13]],
        ["mirror", "x", ["box", "s", [19, 0, 1], [20, 9, 2]]],
      ],
    };
    F.assetParts = { ship: SHIP, interceptor: INTERCEPTOR, guard: GUARD };
  }

  class Presentation {
    constructor(E, game) {
      if (game === undefined) {
        game = E;
        E = globalThis.My3D2dge;
      }
      this.E = E;
      this.game = game;
      this.effects = [];
      this.lastEvent = 0;
      this.run = null;
      this.projection = { scale: 0.5, cx: 600, cy: 337.5, W: 600, H: 338 };
      this.bank = 0;
      this.recoil = 0;
      this.lastHull = 3;
      this.lastTime = 0;
      this.pals = {};
      for (const [id, p] of Object.entries(PALETTES)) {
        this.pals[id] = {};
        for (const [k, col] of Object.entries(p)) this.pals[id][k] = E.tones(col);
      }
      defineAssets(E);
      if (game.lights) {
        game.lights.enabled = true;
        game.lights.ambient = 0.87;
      }
      if (game.r) {
        game.r.outline = "#0b1523";
        game.r.rim = "#a5ebec";
        game.r.rimAlpha = 0.16;
      }
    }
    screenToWorld(x, y) {
      const p = this.projection;
      return { x: (x - p.W / 2) / p.scale + p.cx, y: (y - p.H / 2) / p.scale + p.cy };
    }
    worldToScreen(x, y) {
      const p = this.projection;
      return { x: (x - p.cx) * p.scale + p.W / 2, y: (y - p.cy) * p.scale + p.H / 2 };
    }
    render(world, dt, options = {}) {
      if (options.r) this.draw(options.r, world, { ...options, dt });
    }
    _ring(g, x, y, r, col, width = 1, start = 0, end = TAU) {
      const px = this.E.px,
        n = Math.max(16, Math.ceil(r * 1.5)),
        span = end - start;
      let old = null;
      for (let i = 0; i <= n; i++) {
        const a = start + (span * i) / n,
          q = [x + Math.cos(a) * r, y + Math.sin(a) * r];
        if (old) px.line(g, ...old, ...q, col, width);
        old = q;
      }
    }
    _glow(g, x, y, r, col, alpha = 0.5) {
      const px = this.E.px;
      px.blend(g, alpha * 0.13, "add", () => px.disc(g, x, y, r, col));
      px.blend(g, alpha * 0.24, "add", () => px.disc(g, x, y, r * 0.65, col));
      px.blend(g, alpha * 0.42, "add", () => px.disc(g, x, y, r * 0.32, col));
    }
    _craft(g, x, y, angle, bank, parts, pal, scale, time, drive = 0, fade = 1) {
      const E = this.E,
        px = E.px,
        P = (u, v) => [
          x + (v * Math.cos(angle) - u * Math.sin(angle)) * scale,
          y + (v * Math.sin(angle) + u * Math.cos(angle)) * scale,
        ];
      const lit = Math.sin(angle) > Math.cos(angle) ? 1 : -1;
      for (const [kind, pts] of parts) {
        if (kind === "fire") {
          for (const [u, v] of pts)
            for (const sign of u ? [-1, 1] : [0]) {
              const k = 1 + Math.sin(time * 43 + u) * 0.16,
                tail = (drive ? 30 : 9) * k,
                q = P(u * sign, v),
                t = P(u * sign, v - tail),
                m = P(u * sign, v - tail * 0.45);
              this._glow(g, q[0], q[1], 10 * scale, "#5ff2f4", 0.7);
              px.poly(g, [P(u * sign - 2.2, v), P(u * sign + 2.2, v), t], "#3191ba");
              px.line(g, ...q, ...m, "#6af4ec", Math.max(1, 2 * scale));
              px.dot(g, q[0], q[1], "#e3ffff");
            }
          continue;
        }
        if (kind === "line") {
          for (const sign of [-1, 1])
            pts.reduce((old, p) => {
              if (old)
                px.line(g, ...P(old[0] * sign, old[1]), ...P(p[0] * sign, p[1]), pal.dark.deep);
              return p;
            }, null);
          continue;
        }
        if (kind === "mark") {
          for (const [u, v, r] of pts)
            for (const sign of u ? [-1, 1] : [0]) {
              const q = P(u * sign, v);
              px.disc(g, ...q, r * scale, pal.trim.hi);
              px.disc(g, ...q, r * 0.4 * scale, pal.dark.base);
            }
          continue;
        }
        if (kind === "sheen") {
          px.blend(g, 0.4, "add", () =>
            px.poly(
              g,
              pts.map(([u, v]) => P(u + bank, v)),
              "#caffff",
            ),
          );
          continue;
        }
        const base = kind.endsWith("Hi") ? kind.slice(0, -2) : kind,
          tone = pal[base] || pal.hull,
          lift = kind.endsWith("Hi") ? 1 : 0;
        for (const sign of [-1, 1]) {
          const roll = sign * (1 - Math.abs(bank) * 0.15) * (1 - sign * bank * 0.24),
            c = tone[TONES[clamp((sign === lit ? 3 : 1) + lift, 0, 4)]];
          px.poly(
            g,
            pts.map(([u, v]) => P(u * roll + (base === "glass" ? bank : 0), v)),
            c,
          );
        }
      }
    }
    _actor(r, x, y, fn, o = {}) {
      const q = this.worldToScreen(x, y);
      r.actor(q.x + r.ix, q.y + r.iy, 0, fn, { ...o, outline: o.outline !== false });
    }
    _queue(r, x, y, fn, o = {}) {
      const q = this.worldToScreen(x, y);
      r.queue(q.x + r.ix, q.y + r.iy, 0, (g) => fn(g, q.x, q.y), o);
    }
    _process(world, dt) {
      const previousTime = this.lastTime;
      const run = String(world.runId ?? world.id ?? world.seed) + ":" + world.sector;
      if (run !== this.run || world.time < this.lastTime - 0.1) {
        this.run = run;
        this.lastEvent = 0;
        this.effects = [];
        this.bank = 0;
      }
      this.lastTime = finite(world.time);
      for (const event of world.events || []) {
        const id = event.id ?? event.seq ?? 0;
        if (id <= this.lastEvent) continue;
        this.lastEvent = Math.max(this.lastEvent, id);
        const type = String(event.type).toLowerCase();
        if (type === "cannon" || type === "playershot" || type === "playerfire") {
          this.recoil = 1;
          continue;
        }
        if (
          /rescue|loss|destroy|collapse|hit|damage|warp|burst|crack|carrier|explo|checkpoint/.test(
            type,
          )
        ) {
          this.effects.push({
            ...event,
            type,
            elapsed: 0,
            life: /rescue|collapse|carrier/.test(type) ? 1.7 : /warp|burst/.test(type) ? 0.7 : 0.8,
          });
        }
      }
      const observed = Math.max(0, finite(world.time) - finite(previousTime));
      const d = clamp(Number.isFinite(dt) && dt > 0 ? dt : observed, 0, 0.1);
      for (const e of this.effects) e.elapsed += d;
      this.effects = this.effects.filter((e) => e.elapsed < e.life).slice(-100);
      this.recoil = Math.max(0, this.recoil - d * 9);
      const bank = clamp(finite(world.ship?.vy) / 230, -1, 1);
      this.bank = mix(this.bank, bank, 1 - Math.exp(-d * 12));
    }
    draw(r, world, options = {}) {
      if (!world?.ship) return;
      const E = this.E,
        px = E.px,
        w = r.W,
        h = r.H,
        t = finite(world.time),
        sector = finite(world.sector);
      let ship = world.ship;
      this.reduced = !!(
        options.reducedMotion ??
        options.settings?.reducedMotion ??
        this.game.reduceMotion
      );
      this.projection = {
        scale: Math.min(w / 1200, h / 675),
        cx: finite(world.camera?.x, Math.max(600, ship.x + 260)),
        cy: finite(world.camera?.y, 337.5),
        W: w,
        H: h,
      };
      const S = this.projection.scale;
      if (options.title)
        ship = {
          ...ship,
          x: this.projection.cx + (w * 0.19) / S,
          y: this.projection.cy + (h * 0.09) / S,
          vx: 0,
          vy: 0,
          drive: "ready",
          hull: 3,
          aimX: 1,
          aimY: 0,
          invuln: 0,
        };
      this._process(world, options.dt);
      r.sky(
        sector === 2
          ? ["#070c1c", "#19122f", "#171c33", "#081624"]
          : sector >= 3
            ? ["#070d1a", "#1e172a", "#152335", "#081321"]
            : ["#06111d", "#102234", "#152a3c", "#0a1a2a"],
      );
      r.decal((g) => this._background(g, r, world));
      // Ownership links sit behind hazards. The dotted spokes teach field ownership without forming collision walls.
      const entities = world.entities || [];
      if (options.ownership || options.debug?.ownership)
        r.decal((g) => {
          for (const e of entities)
            if (e.type === "mine" && e.owner) {
              const owner = entities.find((a) => a.id === e.owner);
              if (owner) {
                const a = this.worldToScreen(owner.x, owner.y),
                  b = this.worldToScreen(e.x, e.y);
                px.blend(g, 0.38, "normal", () => px.line(g, a.x, a.y, b.x, b.y, "#e69b74"));
              }
            }
        });
      for (const e of entities) {
        if (e.dead || !Number.isFinite(e.x) || !Number.isFinite(e.y)) continue;
        const q = this.worldToScreen(e.x, e.y),
          margin = e.type === "carrier" ? 250 : 110;
        if (q.x < -margin || q.x > w + margin || q.y < -margin || q.y > h + margin) continue;
        const type = e.type;
        if (type === "crystal") this._crystal(r, e, t, S, world.config?.rescueRadius ?? 38);
        else if (type === "mine") this._mine(r, e, t, S);
        else if (type === "layer") this._layer(r, e, t, S);
        else if (type === "interceptor" || type === "guard") {
          const a = Number.isFinite(e.aimX)
            ? Math.atan2(e.aimY, e.aimX)
            : Number.isFinite(e.angle)
              ? e.angle
              : Math.PI;
          this._actor(
            r,
            e.x,
            e.y,
            (g, x, y) => {
              this._craft(
                g,
                x,
                y,
                a,
                Math.sin(t * 2 + e.x) * 0.2,
                type === "guard" ? GUARD : INTERCEPTOR,
                this.pals[type],
                S * 1.4,
                t,
              );
              if (type === "guard" && (e.shield || e.state === "shielded" || e.state === "closed"))
                this._ring(g, x, y, 30 * S, "#fa9e94", 2, Math.PI * 0.55, Math.PI * 1.45);
            },
            { flash: e.flash > 0 ? "#fff2ca" : undefined },
          );
          if (e.state === "warning" && !options.title)
            this._queue(
              r,
              e.x,
              e.y,
              (g, x, y) => {
                this._ring(g, x, y, (40 + Math.sin(t * 5) * 4) * S, "#ffb090", 1);
                E.font.text(g, "!", x, y - 40 * S, "#ffe4bf", {
                  align: "center",
                  scale: 1,
                  outline: false,
                });
              },
              { emissive: true },
            );
        } else if (type === "carrier") this._carrier(r, e, world, t, S);
        else if (type === "organ" || type === "core") this._organ(r, e, world, t, S);
        else if (type === "beacon") this._beacon(r, e, t, S);
        else if (type === "hazard") this._hazard(r, e, t, S);
        if (!options.title && e.state === "warning" && ["layer", "organ", "core"].includes(type))
          this._queue(
            r,
            e.x,
            e.y,
            (g, x, y) => {
              this._ring(g, x, y, (finite(e.r, 25) + 13) * S, "#d9a58e", 1, t, t + TAU * 0.8);
              E.font.text(g, "INBOUND", x, y - (finite(e.r, 25) + 26) * S, "#f4cfaa", {
                align: "center",
                scale: Math.max(1, Math.round(S * 1.5)),
                outline: false,
                shadow: "#091522",
              });
            },
            { emissive: true },
          );
        if (e.aiming && !options.title)
          this._queue(
            r,
            e.x,
            e.y,
            (g, x, y) => {
              const target = this.worldToScreen(ship.x, ship.y);
              px.blend(g, 0.24, "normal", () => px.line(g, x, y, target.x, target.y, "#fa8f7e", 1));
              this._ring(g, x, y, (finite(e.r, 24) + 6) * S, "#ffc18c", 1);
              px.disc(g, x, y, 4 * S, "#ffe8b2");
            },
            { emissive: true },
          );
        if (
          !options.title &&
          e.maxHp > 1 &&
          e.hp < e.maxHp &&
          ["layer", "interceptor", "guard", "organ", "core"].includes(type)
        )
          this._queue(
            r,
            e.x,
            e.y,
            (g, x, y) => {
              const width = Math.max(24, finite(e.r, 25) * 1.5) * S,
                yy = y + (finite(e.r, 25) + 12) * S;
              px.rect(g, x - width / 2, yy, width, 3 * S, "#273346");
              px.rect(g, x - width / 2, yy, width * clamp(e.hp / e.maxHp, 0, 1), 2 * S, "#e9ad91");
            },
            { emissive: true },
          );
      }
      // The one shared craft is composed in a native actor: hull, banked wings, vanes, independently aimed cannon.
      if (ship.hull > 0 || world.outcome === "victory") {
        const drive = ship.drive === "burst" || ship.drive === "active",
          aim = Math.atan2(finite(ship.aimY), finite(ship.aimX, 1));
        if (drive && !this.reduced) {
          for (let i = 4; i > 0; i--)
            this._actor(
              r,
              ship.x - finite(ship.driveX, Math.cos(aim)) * i * 21,
              ship.y - finite(ship.driveY, Math.sin(aim)) * i * 21,
              (g, x, y) =>
                this._craft(g, x, y, aim, this.bank, SHIP, this.pals.ship, S * 1.05, t, 1),
              { alpha: 0.08 * (5 - i), flash: "#69f1f0", flashMix: 0.8, outline: false },
            );
        }
        this._actor(
          r,
          ship.x,
          ship.y,
          (g, x, y) => {
            const angle = clamp(finite(ship.vy) * 0.0008, -0.22, 0.22),
              scale = S * (options.title ? 1.7 : 1.14);
            this._craft(g, x, y, angle, this.bank, SHIP, this.pals.ship, scale, t, drive ? 1 : 0);
            // The cannon rotates independently; its raised mount stays visually anchored to the warm hull.
            const ax = Math.cos(aim),
              ay = Math.sin(aim),
              kick = this.recoil * 2 * S;
            px.disc(g, x, y - 1, 5 * S, "#273e4a");
            px.disc(g, x - S, y - 2 * S, 3.5 * S, "#f5d39d");
            px.line(
              g,
              x + ax * 4 * S,
              y + ay * 4 * S,
              x + ax * (17 * S - kick),
              y + ay * (17 * S - kick),
              "#253b4b",
              Math.max(2, 4 * S),
            );
            px.line(
              g,
              x + ax * 4 * S - S * 0.5,
              y + ay * 4 * S - S * 0.5,
              x + ax * (18 * S - kick),
              y + ay * (18 * S - kick),
              "#d0e8d4",
              Math.max(1, 2 * S),
            );
            if (this.recoil > 0.3)
              this._glow(g, x + ax * 20 * S, y + ay * 20 * S, 11 * S, "#a6fff2", 0.8);
          },
          {
            flash:
              ship.invuln > 0 && !this.reduced && Math.floor(t * 12) % 2 === 0
                ? "#d1fbff"
                : undefined,
          },
        );
        this._queue(
          r,
          ship.x,
          ship.y,
          (g, x, y) => {
            const preview = ship.drive === "windup" || ship.drive === "preview";
            if (preview || (options.navigatorPreview ?? world.seats?.length > 1)) {
              const dx = finite(preview ? ship.driveX : ship.previewX, 1),
                dy = finite(preview ? ship.driveY : ship.previewY),
                dist = (preview ? 120 : 75) * S;
              for (let i = 1; i <= 4; i++) {
                const k = i / 4;
                px.line(
                  g,
                  x + dx * (dist * k - 5 * S) - dy * 3 * S,
                  y + dy * (dist * k - 5 * S) + dx * 3 * S,
                  x + dx * dist * k,
                  y + dy * dist * k,
                  "#8af4ee",
                  Math.max(1, S * 2),
                );
                px.line(
                  g,
                  x + dx * (dist * k - 5 * S) + dy * 3 * S,
                  y + dy * (dist * k - 5 * S) - dx * 3 * S,
                  x + dx * dist * k,
                  y + dy * dist * k,
                  "#8af4ee",
                  Math.max(1, S * 2),
                );
              }
            }
            // A small energy collar is a spatial affordance; the large HUD meter remains the primary readout.
            if (ship.energy < 60 || preview)
              this._ring(
                g,
                x,
                y,
                29 * S,
                "#4da9bb",
                1,
                -Math.PI / 2,
                -Math.PI / 2 + TAU * clamp(ship.energy / 100, 0, 1),
              );
          },
          { emissive: true },
        );
        const sq = this.worldToScreen(ship.x, ship.y);
        this.game.lights?.add(sq.x + r.ix, sq.y + r.iy, 0, 65 * S, 0.18, { color: "#70ddec" });
      }
      for (const b of world.bullets || []) {
        const hostile = b.team === "enemy" || b.team === "foe" || b.hostile;
        this._queue(
          r,
          b.x,
          b.y,
          (g, x, y) => {
            const vx = finite(b.vx, 1),
              vy = finite(b.vy),
              len = Math.hypot(vx, vy) || 1,
              dx = vx / len,
              dy = vy / len;
            this._glow(g, x, y, (hostile ? 9 : 7) * S, hostile ? "#ff8b78" : "#86fff3", 0.7);
            px.line(
              g,
              x - dx * (hostile ? 7 : 15) * S,
              y - dy * (hostile ? 7 : 15) * S,
              x,
              y,
              hostile ? "#f27767" : "#5bd8de",
              Math.max(1, 3 * S),
            );
            px.line(
              g,
              x - dx * (hostile ? 4 : 12) * S,
              y - dy * (hostile ? 4 : 12) * S,
              x,
              y,
              hostile ? "#ffe4a4" : "#e3ffeb",
              Math.max(1, S),
            );
          },
          { emissive: true },
        );
      }
      r.overlay((g) => this._effects(g, r, world, S));
      if (options.collision || options.debug?.collision)
        r.overlay((g) => {
          for (const e of [ship, ...entities]) {
            const q = this.worldToScreen(e.x, e.y);
            this._ring(
              g,
              q.x,
              q.y,
              finite(e.r, 16) * S,
              e.type === "crystal" ? "#8fffe3" : "#ffb0a2",
            );
          }
          const q = this.worldToScreen(ship.x, ship.y);
          E.font.text(
            g,
            `${Math.round(ship.x)}, ${Math.round(ship.y)}`,
            q.x,
            q.y + 25 * S,
            "#b8f4df",
            { align: "center", font: "tiny" },
          );
        });
      if (world.shroud || (world.weaponsOffline && world.mode !== "evasion"))
        r.overlay((g) => {
          px.blend(g, 0.12, "add", () => {
            for (let i = 0; i < 5; i++) {
              const yy = wrap(t * 6 + i * 83, h + 40) - 20;
              px.poly(
                g,
                [
                  [0, yy],
                  [w, yy - 21],
                  [w, yy + 5],
                  [0, yy + 26],
                ],
                "#a188df",
              );
            }
          });
        });
      if (world.attract || options.title)
        r.overlay((g) => {
          px.blend(g, 0.14, "multiply", () => px.rect(g, 0, 0, w, h, "#0b1728"));
        });
      this.lastWorld = world;
    }
    _background(g, r, world) {
      const E = this.E,
        px = E.px,
        w = r.W,
        h = r.H,
        t = finite(world.time),
        cam = this.projection.cx,
        S = this.projection.scale,
        sector = finite(world.sector);
      // Stable star clusters: cosmetic placement never consumes the world's random stream.
      for (let i = 0; i < 210; i++) {
        const z = i % 5,
          k = [0.025, 0.06, 0.1, 0.16, 0.23][z],
          x = wrap(i * 97.13 - cam * k * S, w + 25) - 12,
          y = wrap(i * i * 17.39 + i * 23.7, h + 16) - 8;
        const bright = i % 13 === 0,
          col = bright ? "#acdee3" : z === 0 ? "#45617b" : "#57718a";
        px.dot(g, x, y, col);
        if (bright) {
          px.dot(g, x + 1, y, col);
          if (i % 3 === 0) {
            px.line(g, x - 2, y, x + 2, y, "#7cbbc6");
            px.line(g, x, y - 2, x, y + 2, "#7cbbc6");
          }
        }
      }
      // Broad layered nebula ribbons use the engine's stepped additive compositing.
      for (let n = 0; n < 4; n++) {
        const yy = h * (0.15 + n * 0.19),
          pts = [];
        for (let x = -40; x <= w + 40; x += 26) {
          const y = yy + Math.sin((x + cam * 0.035 * S) * 0.014 + n * 2) * h * 0.075;
          pts.push([x, y]);
        }
        const color =
          sector === 2
            ? n % 2
              ? "#6c467d"
              : "#3c4d76"
            : sector >= 3
              ? n % 2
                ? "#73485d"
                : "#3b6572"
              : n % 2
                ? "#325d78"
                : "#387482";
        const thick = 18 + n * 7,
          band = [
            ...pts.map(([x, y]) => [x, y - thick]),
            ...pts
              .slice()
              .reverse()
              .map(([x, y]) => [x, y + thick]),
          ];
        px.blend(g, 0.125, "normal", () => px.poly(g, band, color));
      }
      // A distant lit world with hand-shaded cloud bands; it stays far behind the rescue silhouettes.
      const planetX = wrap(w * 0.74 - cam * 0.017 * S, w + 240) - 40,
        planetY = h * 0.74,
        pr = Math.min(w * 0.18, h * 0.35);
      px.disc(g, planetX, planetY, pr + 3, "#294259");
      px.disc(g, planetX + 2, planetY + 2, pr, "#101f32");
      px.blend(g, 0.65, "normal", () => {
        for (let i = 0; i < 16; i++) {
          const yy = -pr + (i * pr) / 8,
            half = Math.sqrt(Math.max(0, pr * pr - yy * yy)),
            start = planetX - half,
            end = planetX + half;
          px.line(
            g,
            start,
            planetY + yy,
            end,
            planetY + yy,
            ["#28445a", "#243e52", "#1e374e", "#183248"][i % 4],
            Math.max(1, pr / 8),
          );
          if (i % 3 === 0)
            px.line(
              g,
              start + half * 0.16,
              planetY + yy,
              end - half * 0.4,
              planetY + yy,
              "#31526a",
              Math.max(1, pr / 18),
            );
        }
      });
      px.disc(g, planetX + pr * 0.43, planetY + pr * 0.17, pr * 0.93, "#0c192b");
      this._ring(g, planetX, planetY, pr + 2, "#42677c", 1, Math.PI * 0.83, Math.PI * 1.62);
      // Broken orbital architecture has a recognisable modular vocabulary. None of this distant dressing collides.
      const count = sector === 2 ? 9 : 5;
      for (let i = 0; i < count; i++) {
        const xx = wrap(i * 179.4 - cam * (sector === 2 ? 0.19 : 0.1) * S, w + 200) - 100,
          yy = sector === 2 ? wrap(i * 109 + 80, h + 100) - 50 : i % 2 ? h * 0.93 : h * 0.08,
          len = (40 + (i % 3) * 23) * S;
        px.poly(
          g,
          [
            [xx - len, yy - 9 * S],
            [xx + len, yy - 9 * S],
            [xx + len + 8 * S, yy + 5 * S],
            [xx - len + 8 * S, yy + 5 * S],
          ],
          "#24364a",
        );
        px.line(g, xx - len, yy - 9 * S, xx + len, yy - 9 * S, "#40536a", Math.max(1, 2 * S));
        px.line(
          g,
          xx - len + 3 * S,
          yy - 5 * S,
          xx + len - 3 * S,
          yy - 5 * S,
          "#172a3c",
          Math.max(1, 2 * S),
        );
        for (let k = 0; k < 4; k++) {
          const vx = xx - len + (len * 2 * k) / 3;
          px.line(g, vx, yy - 8 * S, vx + 7 * S, yy + 5 * S, "#3d465c", Math.max(1, 2 * S));
          if (k % 2 === 0) px.rect(g, vx + 3 * S, yy - 6 * S, 3 * S, 2 * S, "#548493");
        }
      }
      // In the belt, native faceted shape props provide a closer non-colliding layer.
      if (sector === 2)
        for (let i = 0; i < 6; i++) {
          const xx = wrap(i * 137 - cam * 0.33 * S, w + 80) - 40,
            yy = i % 2 ? h * 0.93 : h * 0.06;
          r.shape("fwr:fragment", xx + r.ix, yy + r.iy, 0, {
            facing: i * 0.74,
            scale: S * 0.9,
            shadow: false,
            light: false,
            hides: false,
          });
        }
      // Thin navigational plane limits are visual boundaries, with ample room inside.
      const top = this.worldToScreen(0, 72).y,
        bot = this.worldToScreen(0, 603).y;
      for (const yy of [top, bot]) {
        px.blend(g, 0.3, "normal", () => px.line(g, 0, yy, w, yy, "#294859"));
        for (let x = wrap(-cam * 0.08 * S, 72); x < w; x += 72)
          px.line(g, x, yy, x + 8, yy, "#4b7484");
      }
    }
    _crystal(r, e, t, S, collar = 38) {
      const px = this.E.px,
        broken = e.state === "cracked" || e.hp < finite(e.maxHp, 3),
        bob = Math.sin(t * 2.2 + e.x) * 1.5 * S;
      this._queue(
        r,
        e.x,
        e.y,
        (g, x, y) => {
          this._glow(g, x, y, 45 * S, "#b596ff", 0.68);
          const radius = collar * S;
          this._ring(
            g,
            x,
            y,
            radius + 3 * S,
            "#9de4e4",
            Math.max(1, S),
            t * 0.3,
            t * 0.3 + TAU * 0.68,
          );
          this._ring(
            g,
            x,
            y,
            radius + 3 * S,
            "#52778f",
            Math.max(1, S),
            t * 0.3 + TAU * 0.72,
            t * 0.3 + TAU * 0.95,
          );
          for (let k = 0; k < 4; k++) {
            const a = (k * TAU) / 4;
            px.disc(
              g,
              x + Math.cos(a) * (radius + 3 * S),
              y + Math.sin(a) * (radius + 3 * S),
              1.5 * S,
              "#e0f4f8",
            );
          }
        },
        { emissive: true },
      );
      this._actor(r, e.x, e.y, (g, x, y) => {
        y += bob;
        const ww = 13 * S,
          hh = 25 * S;
        const pts = [
          [x, y - hh],
          [x + ww, y - hh * 0.45],
          [x + ww * 0.8, y + hh * 0.65],
          [x, y + hh],
          [x - ww, y + hh * 0.6],
          [x - ww, y - hh * 0.45],
        ];
        px.poly(g, pts, "#563e89");
        px.poly(
          g,
          [pts[0], pts[1], pts[2], [x + 2 * S, y + hh * 0.6], [x + 2 * S, y - hh * 0.5]],
          "#b99be9",
        );
        px.poly(
          g,
          [pts[0], pts[5], pts[4], [x - 4 * S, y + hh * 0.5], [x - 5 * S, y - hh * 0.4]],
          "#8f75cc",
        );
        px.poly(
          g,
          [
            [x - 7 * S, y - 12 * S],
            [x + 7 * S, y - 12 * S],
            [x + 7 * S, y + 14 * S],
            [x - 7 * S, y + 14 * S],
          ],
          "#5d4a91",
        );
        // The captive has a separate head, torso, arms and legs, readable even when the facet glints.
        px.disc(g, x, y - 7 * S, 3 * S, "#f1ddf7");
        px.line(g, x, y - 3 * S, x, y + 7 * S, "#e2cfef", Math.max(1, 3 * S));
        px.line(g, x - 6 * S, y + 2 * S, x + 6 * S, y + 2 * S, "#c7b7e6", Math.max(1, 2 * S));
        px.line(g, x, y + 6 * S, x - 4 * S, y + 13 * S, "#d5c7eb", Math.max(1, 2 * S));
        px.line(g, x, y + 6 * S, x + 4 * S, y + 13 * S, "#d5c7eb", Math.max(1, 2 * S));
        px.line(g, x - ww, y - hh * 0.45, x, y - hh, "#e8d5ff");
        px.line(g, x, y - hh, x + ww, y - hh * 0.45, "#d2baff");
        px.line(g, x - ww, y + hh * 0.6, x, y + hh, "#b29ce9");
        px.rect(g, x - 15 * S, y + 14 * S, 30 * S, 4 * S, "#c8f2ee");
        px.rect(g, x - 15 * S, y + 17 * S, 30 * S, 2 * S, "#5c9bae");
        if (broken) {
          px.line(g, x + 2 * S, y - 20 * S, x - 3 * S, y - 4 * S, "#fff2c1");
          px.line(g, x - 3 * S, y - 4 * S, x + 5 * S, y + 2 * S, "#fff2c1");
          px.line(g, x + 5 * S, y + 2 * S, x, y + 13 * S, "#fff2c1");
          px.disc(g, x + 8 * S, y - 16 * S, 2 * S, "#ffb48a");
        }
        if (Math.sin(t * 2 + e.x) > 0.7) {
          px.line(g, x - 8 * S, y - 15 * S, x - 4 * S, y - 15 * S, "#fff0ff");
          px.line(g, x - 6 * S, y - 17 * S, x - 6 * S, y - 13 * S, "#fff0ff");
        }
      });
    }
    _mine(r, e, t, S) {
      const px = this.E.px,
        active = e.state === "active",
        off = e.state === "disarmed" || e.state === "destroyed",
        rr = finite(e.r, 11) * S,
        pulse = Math.sin(t * 5 + e.x * 0.2) * 0.5 + 0.5;
      this._actor(
        r,
        e.x,
        e.y,
        (g, x, y) => {
          const color = off ? "#4d6a72" : active ? "#e98670" : "#7c8193";
          for (let i = 0; i < 6; i++) {
            const a = (i * TAU) / 6 + t * 0.16,
              c = Math.cos(a),
              s = Math.sin(a);
            px.line(
              g,
              x + c * rr * 0.7,
              y + s * rr * 0.7,
              x + c * rr * 1.35,
              y + s * rr * 1.35,
              off ? "#4c6770" : "#c3a18e",
              Math.max(1, 2 * S),
            );
          }
          px.disc(g, x, y, rr, "#293346");
          px.disc(g, x - S, y - S, rr * 0.8, color);
          px.disc(g, x - S, y - S, rr * 0.46, off ? "#406c72" : active ? "#512a36" : "#465164");
          if (active) {
            px.disc(g, x - S, y - S, rr * 0.24, "#ffe0a1");
            px.dot(g, x - rr * 0.35, y - rr * 0.35, "#f9e4b4");
          } else if (!off)
            this._ring(
              g,
              x,
              y,
              rr * 1.4,
              "#e8be91",
              1,
              -Math.PI / 2,
              -Math.PI / 2 + TAU * clamp(e.armProgress ?? 0.5, 0, 1),
            );
        },
        { alpha: off ? 0.45 : 1 },
      );
      if (active)
        this._queue(
          r,
          e.x,
          e.y,
          (g, x, y) => {
            this._glow(g, x, y, rr * 3, "#e66f63", 0.2 + pulse * 0.16);
          },
          { emissive: true },
        );
    }
    _layer(r, e, t, S) {
      const px = this.E.px,
        P = this.pals.layer,
        rotation = t * 0.28 + e.x * 0.002;
      this._actor(
        r,
        e.x,
        e.y,
        (g, x, y) => {
          for (let i = 0; i < 8; i++) {
            const a = rotation + (i * TAU) / 8,
              p = (u, v) => [
                x + (v * Math.cos(a) - u * Math.sin(a)) * S,
                y + (v * Math.sin(a) + u * Math.cos(a)) * S,
              ];
            px.poly(
              g,
              [p(-5, 12), p(-7, 25), p(0, 38 + Math.sin(t * 3 + i) * 2), p(7, 25), p(5, 12)],
              i < 4 ? P.hull.lt : P.hull.sh,
            );
            px.poly(g, [p(-5, 13), p(0, 32), p(0, 14)], P.trim.base);
            px.line(g, ...p(0, 22), ...p(0, 33), P.trim.hi, Math.max(1, S));
          }
          px.disc(g, x, y, 18 * S, P.dark.deep);
          px.disc(g, x - S, y - S, 15 * S, P.hull.base);
          px.disc(g, x, y, 10 * S, P.dark.base);
          const rr = (6 + Math.sin(t * 5) * 1.4) * S;
          px.disc(g, x, y, rr, "#ff927d");
          px.disc(g, x - S, y - S, rr * 0.5, "#ffe4a5");
          for (let i = 0; i < 3; i++) {
            const a = t * 0.8 + (i * TAU) / 3;
            px.disc(g, x + Math.cos(a) * 12 * S, y + Math.sin(a) * 12 * S, 2 * S, "#fbe3b5");
          }
        },
        { flash: e.flash > 0 ? "#fff2d3" : undefined },
      );
      if (e.laying || e.state === "laying")
        this._queue(
          r,
          e.x,
          e.y,
          (g, x, y) => this._ring(g, x, y, (42 + Math.sin(t * 8) * 5) * S, "#ffb892", 1),
          { emissive: true },
        );
    }
    _carrier(r, e, world, t, S) {
      const px = this.E.px,
        ww = finite(e.w ?? e.width, 260) * S,
        hh = finite(e.h ?? e.height, 310) * S;
      const death = e.state === "dying" ? clamp((t - finite(e.deathTime, t)) / 3.5, 0, 1) : 0;
      this._actor(
        r,
        e.x,
        e.y,
        (g, x, y) => {
          const left = x - ww / 2,
            right = x + ww / 2,
            top = y - hh / 2,
            bot = y + hh / 2;
          // Layered plates remain inside the declared solid hull; organs are separate colliders.
          px.poly(
            g,
            [
              [left + 24 * S, top],
              [right - 15 * S, top + 16 * S],
              [right, top + 46 * S],
              [right, bot - 38 * S],
              [right - 23 * S, bot],
              [left + 32 * S, bot],
              [left, bot - 43 * S],
              [left, top + 41 * S],
            ],
            "#262c40",
          );
          px.poly(
            g,
            [
              [left + 25 * S, top + 5 * S],
              [right - 20 * S, top + 20 * S],
              [right - 8 * S, top + 44 * S],
              [left + 5 * S, top + 44 * S],
            ],
            "#a58a91",
          );
          px.poly(
            g,
            [
              [left + 5 * S, top + 44 * S],
              [right - 8 * S, top + 44 * S],
              [right - 8 * S, bot - 35 * S],
              [left + 8 * S, bot - 42 * S],
            ],
            "#554d66",
          );
          px.poly(
            g,
            [
              [left + 8 * S, top + 49 * S],
              [left + 53 * S, top + 65 * S],
              [left + 53 * S, bot - 60 * S],
              [left + 8 * S, bot - 42 * S],
            ],
            "#7d677b",
          );
          px.poly(
            g,
            [
              [right - 47 * S, top + 47 * S],
              [right - 8 * S, top + 44 * S],
              [right - 8 * S, bot - 35 * S],
              [right - 47 * S, bot - 51 * S],
            ],
            "#343a52",
          );
          // External ribs explain the ship's scale and the three prison compartments.
          for (let i = 0; i < 7; i++) {
            const yy = top + 51 * S + i * 31 * S;
            px.rect(g, left + 13 * S, yy, ww - 27 * S, 6 * S, "#302e43");
            px.rect(g, left + 13 * S, yy, ww - 27 * S, 2 * S, "#b08e95");
            for (let k = 0; k < 3; k++)
              px.rect(
                g,
                left + 65 * S + k * 50 * S,
                yy + 11 * S,
                28 * S,
                7 * S,
                world.phase === "prisoners" ? "#8b77b3" : "#644c75",
              );
          }
          px.rect(g, left + 67 * S, top + 64 * S, 119 * S, 171 * S, "#24283c");
          for (let i = 0; i < 3; i++) {
            const yy = top + 77 * S + i * 49 * S;
            px.rect(
              g,
              left + 76 * S,
              yy,
              99 * S,
              35 * S,
              world.phase === "prisoners" ? "#51416b" : "#3c354f",
            );
            px.line(g, left + 77 * S, yy, left + 173 * S, yy, "#9b7da5", Math.max(1, S));
            for (let j = 0; j < 6; j++)
              px.line(
                g,
                left + (86 + j * 15) * S,
                yy + 3 * S,
                left + (86 + j * 15) * S,
                yy + 31 * S,
                "#7b638a",
                Math.max(1, S),
              );
          }
          px.rect(g, left + 14 * S, bot - 28 * S, ww - 34 * S, 12 * S, "#3b3650");
          for (let j = 0; j < 7; j++) {
            const xx = left + (24 + j * 28) * S;
            px.rect(g, xx, bot - 24 * S, 12 * S, 3 * S, "#db9a87");
          }
          // A narrow command slit, antennae and flowing engine vanes complete the native part silhouette.
          px.rect(g, left + 77 * S, top + 25 * S, 104 * S, 9 * S, "#2f354a");
          px.rect(g, left + 79 * S, top + 26 * S, 99 * S, 3 * S, "#eaac96");
          for (let j = 0; j < 3; j++) {
            const yy = top + (79 + j * 76) * S;
            px.rect(g, right - 11 * S, yy, 12 * S, 27 * S, "#35465b");
            px.rect(g, right - 8 * S, yy + 3 * S, 7 * S, 21 * S, "#60a9bb");
            px.blend(g, 0.35, "add", () =>
              px.poly(
                g,
                [
                  [right, yy + 4 * S],
                  [right + (30 + Math.sin(t * 22 + j) * 5) * S, yy + 14 * S],
                  [right, yy + 24 * S],
                ],
                "#438eaf",
              ),
            );
          }
          if (world.phase === "core") {
            px.line(g, left + 10 * S, y, left + 53 * S, y, "#f3aa8b", Math.max(1, 3 * S));
          }
        },
        { outline: true, alpha: 1 - death * 0.85 },
      );
      if (death > 0)
        this._queue(
          r,
          e.x,
          e.y,
          (g, x, y) => {
            for (let i = 0; i < 12; i++) {
              const age = wrap(t - finite(e.deathTime, t) - i * 0.19, 2),
                xx = x + Math.sin(i * 6.78) * ww * 0.42,
                yy = y + Math.cos(i * 3.7) * hh * 0.4;
              if (age < 0.7) {
                this._glow(g, xx, yy, (15 + age * 45) * S, "#f5bc8c", (1 - age / 0.7) * 0.7);
                this._ring(g, xx, yy, (8 + age * 30) * S, "#efd2a1", 1);
              }
              const dx = Math.sin(i * 7.23) * death * 70 * S,
                dy = Math.cos(i * 5.37) * death * 70 * S;
              px.rect(g, xx + dx, yy + dy, 9 * S, 5 * S, "#89727d");
            }
          },
          { emissive: true },
        );
      if (world.phase === "organs")
        this._queue(
          r,
          e.x,
          e.y,
          (g, x, y) => {
            this._glow(g, x - ww * 0.3, y, 80 * S, "#cb6985", 0.2);
          },
          { emissive: true },
        );
    }
    _organ(r, e, world, t, S) {
      const px = this.E.px,
        core = e.type === "core",
        rr = finite(e.r, core ? 26 : 22) * S,
        open = core ? world.phase === "core" || e.state === "exposed" : e.state !== "shielded";
      this._actor(
        r,
        e.x,
        e.y,
        (g, x, y) => {
          for (let i = 0; i < 6; i++) {
            const a = (i * TAU) / 6 + t * 0.12,
              pxx = x + Math.cos(a) * rr * 0.86,
              pyy = y + Math.sin(a) * rr * 0.86;
            px.disc(g, pxx, pyy, rr * 0.35, "#302d44");
            px.disc(g, pxx - S, pyy - S, rr * 0.24, "#b28287");
          }
          px.disc(g, x, y, rr * 0.88, "#242b3e");
          px.disc(g, x - S, y - S, rr * 0.69, open ? "#de8c7e" : "#66536c");
          px.disc(g, x, y, rr * 0.48, open ? (core ? "#97e7e8" : "#f5be8c") : "#35485c");
          px.disc(g, x - S, y - S, rr * 0.22, open ? "#fff2ca" : "#69889c");
          if (!open) {
            px.line(
              g,
              x - rr * 0.85,
              y - rr * 0.55,
              x + rr * 0.85,
              y + rr * 0.55,
              "#9b8da7",
              Math.max(1, 4 * S),
            );
            px.line(
              g,
              x - rr * 0.85,
              y + rr * 0.55,
              x + rr * 0.85,
              y - rr * 0.55,
              "#9b8da7",
              Math.max(1, 4 * S),
            );
          }
        },
        { flash: e.flash > 0 ? "#fff5da" : undefined },
      );
      if (open)
        this._queue(
          r,
          e.x,
          e.y,
          (g, x, y) => {
            this._glow(g, x, y, rr * 2.6, core ? "#8ee8ed" : "#ef9f83", 0.36);
            this._ring(g, x, y, rr * 1.3, "#dfb48e", 1, t, t + TAU * 0.7);
          },
          { emissive: true },
        );
    }
    _beacon(r, e, t, S) {
      const E = this.E,
        px = E.px,
        ready = e.active || e.state === "ready" || e.state === "active";
      this._queue(
        r,
        e.x,
        e.y,
        (g, x, y) => {
          this._glow(g, x, y, 78 * S, ready ? "#84e6dc" : "#5a728a", 0.4);
          for (let i = 0; i < 3; i++) {
            const rad = (34 + i * 13 + Math.sin(t * 2) * 2) * S;
            this._ring(
              g,
              x,
              y,
              rad,
              ready ? "#93e9df" : "#4c7187",
              Math.max(1, S * 2),
              t * 0.2 + i * 0.3,
              t * 0.2 + i * 0.3 + TAU * 0.78,
            );
          }
          px.poly(
            g,
            [
              [x - 8 * S, y],
              [x + 5 * S, y - 7 * S],
              [x + 5 * S, y + 7 * S],
            ],
            ready ? "#d6fff0" : "#7399a2",
          );
          E.font.text(g, ready ? "EVAC" : "BEACON", x, y + 63 * S, ready ? "#bef5e8" : "#8ba9b7", {
            align: "center",
            scale: Math.max(1, Math.round(S * 1.8)),
            outline: false,
            shadow: "#091522",
          });
        },
        { emissive: true },
      );
    }
    _hazard(r, e, t, S) {
      const px = this.E.px,
        rr = finite(e.r, 26) * S;
      this._actor(r, e.x, e.y, (g, x, y) => {
        const pts = [];
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8,
            rad = rr * (0.83 + Math.sin(e.x + i * 3) * 0.17);
          pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
        }
        px.poly(g, pts, "#3e4056");
        px.poly(g, [pts[0], pts[1], pts[2], [x, y]], "#736377");
        px.poly(g, [pts[3], pts[4], pts[5], [x, y]], "#4e5069");
        px.line(g, ...pts[5], ...pts[6], "#aa7b82", Math.max(1, 2 * S));
      });
      this._queue(
        r,
        e.x,
        e.y,
        (g, x, y) => {
          this._ring(g, x, y, rr + 5 * S, "#bc8b80", 1, t * 0.03, t * 0.03 + TAU * 0.8);
        },
        { emissive: true },
      );
    }
    _effects(g, r, world, S) {
      const E = this.E,
        px = E.px;
      for (const fx of this.effects) {
        const q = this.worldToScreen(finite(fx.x, world.ship.x), finite(fx.y, world.ship.y)),
          u = fx.elapsed / fx.life,
          alpha = 1 - u,
          type = fx.type;
        const rescue = /rescue/.test(type),
          collapse = /collapse/.test(type),
          warp = /warp|burst/.test(type),
          col = rescue ? "#c6f8ed" : collapse ? "#fbd3a1" : warp ? "#8be9f1" : "#faac8c";
        const seed = finite(fx.id, 1) * 1.123;
        if (rescue) {
          const end = this.worldToScreen(world.ship.x, world.ship.y),
            ease = 1 - Math.pow(1 - u, 3);
          for (let i = 0; i < 8; i++) {
            const a = clamp(ease - i * 0.05, 0, 1),
              xx = mix(q.x, end.x, a),
              yy = mix(q.y, end.y, a) - Math.sin(a * Math.PI) * 24 * S;
            px.blend(g, alpha * 0.8, "add", () => px.disc(g, xx, yy, (3 - i * 0.22) * S, col));
          }
          this._ring(g, q.x, q.y, (20 + u * 75) * S, "#92d6db", 1);
          if (u < 0.7)
            E.font.text(g, "SECURED", q.x, q.y - 30 * S - u * 20 * S, col, {
              align: "center",
              scale: Math.max(1, Math.round(S * 1.6)),
              outline: false,
              shadow: "#112536",
            });
        } else if (warp) {
          const a = Math.atan2(
            finite(fx.dy, world.ship.driveY),
            finite(fx.dx, world.ship.driveX ?? 1),
          );
          for (let i = 0; i < 7; i++) {
            const offset = (i - 3) * 5 * S,
              xx = q.x - Math.sin(a) * offset,
              yy = q.y + Math.cos(a) * offset;
            px.blend(g, alpha * 0.6, "add", () =>
              px.line(
                g,
                xx - Math.cos(a) * u * 85 * S,
                yy - Math.sin(a) * u * 85 * S,
                xx + Math.cos(a) * 12 * S,
                yy + Math.sin(a) * 12 * S,
                col,
                Math.max(1, S),
              ),
            );
          }
        } else {
          this._glow(g, q.x, q.y, (20 + u * 50) * S, col, alpha * 0.8);
          this._ring(
            g,
            q.x,
            q.y,
            (8 + u * (collapse ? 100 : 45)) * S,
            col,
            Math.max(1, (1 - u) * 2 * S),
          );
        }
        if (!warp)
          for (let i = 0; i < (rescue ? 10 : collapse ? 18 : 12); i++) {
            const a = seed + i * 2.3999,
              dist = (rescue ? 12 : 18) + u * (collapse ? 100 : 55) * (1 + (i % 3) * 0.2),
              xx = q.x + Math.cos(a) * dist * S,
              yy = q.y + Math.sin(a) * dist * S;
            const trail = (1 - u) * 8 * S;
            px.blend(g, alpha, "normal", () =>
              px.line(
                g,
                xx,
                yy,
                xx - Math.cos(a) * trail,
                yy - Math.sin(a) * trail,
                i % 3 ? col : "#fff0ca",
                Math.max(1, S),
              ),
            );
          }
      }
    }
  }
  F.Presentation = Presentation;
})();
