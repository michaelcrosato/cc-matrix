(() => {
  "use strict";
  const G = globalThis.Edge;
  const q = (n) => Math.round(n * 10) / 10;
  const maskOf = (cells) => {
    let s = "";
    for (let i = 0; i < cells.length; i += 4) {
      let n = 0;
      for (let k = 0; k < 4; k++) if (cells[i + k]?.alive) n |= 1 << k;
      s += n.toString(16);
    }
    return s;
  };
  const compact = (w) => ({
    t: "s",
    k: w.tick,
    z: w.sector,
    h: w.phase,
    u: q(w.sectorTime),
    st: w.status,
    pt: q(w.phaseTime),
    o: w.outcome,
    sc: w.score,
    ch: q(w.chain),
    r: w.reserves,
    m: maskOf(w.cells),
    of: w.plates.map((p) => q(p.offset)),
    re: [+w.refuge.active, +w.refuge.warning, q(w.refuge.cycle)],
    c: [
      q(w.core.x),
      q(w.core.y),
      w.core.hits,
      w.core.mode,
      q(w.core.timer),
      q(w.core.vx),
      q(w.core.vy),
      w.core.phaseEpoch,
      q(w.core.targetY),
    ],
    p: w.players
      .filter((p) => !p.gone)
      .map((p) => [
        p.id,
        q(p.x),
        q(p.y),
        q(p.vx),
        q(p.vy),
        q(p.ax),
        q(p.ay),
        +p.alive,
        p.charge,
        q(p.inv),
        q(p.respawn),
        p.cannonAck,
        q(p.biteGlow),
        q(p.blocked),
      ]),
    b: w.bullets.map((b) => [b.id, b.owner, q(b.x), q(b.y), q(b.vx), q(b.vy)]),
    a: w.cannons.map((b) => [b.id, b.owner, q(b.x), q(b.y), b.mode, q(b.timer), q(b.vx), +b.reflected]),
    d: w.pursuers.map((p) => [p.id, q(p.x), q(p.y), q(p.angle), p.kind, q(p.grace)]),
    ev: w.events.slice(-3).map((e) => [e.id, e.type, q(e.x || 0), q(e.y || 0), e.player ?? -1]),
    le: w.lessons,
    br: w.breakdown,
  });
  class Online {
    constructor(app) {
      this.app = app;
      this.hub = globalThis.AIHub;
      this.info = null;
      this.ended = false;
      this.started = false;
      this.finished = false;
      this.frames = new Map();
      this.sequences = new Map();
      this.seq = 0;
      this.edge = 0;
      this.pending = 0;
      this.lastSnapshot = -1;
      this.sendClock = -Infinity;
      this.snapshotClock = -Infinity;
      this.fullClock = -Infinity;
      this.timer = null;
      this.stats = {
        sent: 0,
        received: 0,
        rejected: 0,
        dropped: 0,
        maxBytes: 0,
        unreliableMax: 0,
        maxPerSecond: 0,
        finishes: 0,
      };
      this.rng = null;
      this.sendTimes = [];
      if (!this.hub) return;
      this.hub.on("start", () => {
        this.started = true;
      });
      this.hub.on("message", (m, from) => this.receive(m, from));
      this.hub.on("leave", ({ id }) => {
        if (this.info?.isHost) {
          app.world?.leave(id);
          this.frames.delete(id);
        }
        this.members = this.members?.filter((p) => p.id !== id);
      });
      this.hub.on("time-up", () => this.finish(false));
      this.hub.on("end", ({ reason }) => this.end(reason));
    }
    async connect() {
      if (!this.hub) return false;
      const info = await this.hub.connect({ mode: "shared-world", seats: [1, 2] });
      if (!info) return false;
      this.info = info;
      this.members = info.players.map((p) => ({ ...p }));
      this.rng = this.hub.rng("edge-combat");
      this.app.startRun({ online: true, players: info.players, seed: Math.floor(this.rng() * 4294967295) });
      this.app.game.o.autoPause = false;
      this.app.game.live = true;
      this.app.game.allowJoin(false);
      this.app.ui.hide();
      this.app.ui._o.screens.pause = { kicker: "LOCAL MENU / THE SWARM FLIES ON", title: "Flight controls" };
      this.app.game.o.menu.quit = false;
      this.app.game.input.clear();
      if (info.server) {
        this.app.game.screen.canvas.style.visibility = "hidden";
        this.app.game.stop();
      }
      // The host's clock is independent of rendering, tab focus, and whether it has an avatar.
      this.timer = setInterval(() => this.pump(), 1000 / 120);
      const release = () => {
        this.latest = G.blankAction();
        this.app.controls?.clear();
      };
      addEventListener("blur", release);
      addEventListener("visibilitychange", () => {
        if (document.hidden) release();
      });
      this.hub.ready();
      return true;
    }
    receive(m, from) {
      if (this.ended || !this.info || !m || typeof m !== "object") return;
      this.stats.received++;
      if (this.info.isHost && m.t === "i") this.accept(m, from);
      else if (!this.info.isHost && from === this.info.host && m.t === "s") this.apply(m);
      else this.stats.rejected++;
    }
    accept(m, from) {
      const member = this.members?.some((p) => p.id === from),
        w = this.app.world,
        old = this.sequences.get(from) || 0;
      if (
        !member ||
        !w ||
        !Number.isSafeInteger(m.n) ||
        m.n <= old ||
        m.n > old + 10000 ||
        !Number.isFinite(m.at) ||
        Math.abs(m.at - this.hub.time()) > 2500 ||
        !Array.isArray(m.v) ||
        m.v.length !== 4 ||
        !m.v.every((v) => Number.isInteger(v) && Math.abs(v) <= 127) ||
        !Number.isSafeInteger(m.c) ||
        m.c < 0 ||
        m.c > 1000000 ||
        ![0, 1].includes(m.f)
      ) {
        this.stats.rejected++;
        return false;
      }
      const last = this.frames.get(from),
        lastEdge = last?.cannon || 0;
      if (m.c > lastEdge + 64) {
        this.stats.rejected++;
        return false;
      }
      this.sequences.set(from, m.n);
      this.frames.set(from, {
        mx: m.v[0] / 127,
        my: m.v[1] / 127,
        ax: m.v[2] / 127,
        ay: m.v[3] / 127,
        fire: !!m.f,
        cannon: m.c,
        heard: this.hub.time(),
      });
      return true;
    }
    local(a) {
      if (!this.info || this.ended || this.info.server) return;
      if (a?.cannon) this.pending = Math.max(this.pending, a.cannon);
      this.latest = { ...(a || G.blankAction()), cannon: this.pending };
    }
    send(data, opts) {
      if (this.ended) return false;
      const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
      this.stats.maxBytes = Math.max(this.stats.maxBytes, bytes);
      if (opts?.reliable === false && bytes > 1180) opts = { ...opts, reliable: true };
      if (bytes > 16384) {
        this.stats.rejected++;
        return false;
      }
      const ok = this.hub.send(data, opts);
      if (ok) {
        this.stats.sent++;
        const time = this.hub.time();
        this.sendTimes = this.sendTimes.filter((t) => time - t < 1000);
        this.sendTimes.push(time);
        this.stats.maxPerSecond = Math.max(this.stats.maxPerSecond, this.sendTimes.length);
        if (opts?.reliable === false) this.stats.unreliableMax = Math.max(this.stats.unreliableMax, bytes);
      } else this.stats.dropped++;
      return ok;
    }
    pump() {
      if (this.ended || !this.info) return;
      const now = this.hub.time();
      if (!this.started || !Number.isFinite(now) || now < 0) return;
      const w = this.app.world;
      if (this.info.isHost) {
        const me = w.players.find((p) => p.id === this.info.me);
        if (me && this.pending <= me.cannonAck) this.pending = 0;
      }
      if (!this.info.server && now - this.sendClock >= 100) {
        const a = this.latest || G.blankAction();
        const m = {
          t: "i",
          n: ++this.seq,
          at: Math.round(now),
          v: [a.mx, a.my, a.ax, a.ay].map((v) => Math.round(G.clamp(Number(v) || 0, -1, 1) * 127)),
          f: a.fire ? 1 : 0,
          c: this.pending,
        };
        if (this.info.isHost) {
          this.accept(m, this.info.me);
          this.sendClock = now;
        } else {
          this.send(m, { to: this.info.host, reliable: this.pending > 0 });
          this.sendClock = now;
        }
      }
      if (this.info.isHost && !this.finished) {
        const target = Math.max(0, Math.floor(now / 1000 / G.DT));
        while (w.tick < target && !w.outcome) {
          const actions = w.players.map((p) => {
            const f = this.frames.get(p.id);
            return f && now - f.heard < 450 ? f : G.blankAction();
          });
          w.step(actions);
        }
        if (now - this.snapshotClock >= 100) {
          const m = compact(w),
            reliable = now - this.fullClock >= 2000;
          this.snapshotClock = now;
          if (this.send(m, { reliable })) {
            if (reliable) this.fullClock = now;
          }
        }
        if (w.outcome) this.finish(w.outcome === "victory");
      }
    }
    apply(m) {
      if (!Number.isInteger(m.k) || m.k <= this.lastSnapshot || !Array.isArray(m.p) || m.z < 0 || m.z > 2)
        return;
      this.lastSnapshot = m.k;
      const app = this.app,
        w = app.world;
      if (w.sector !== m.z) w.loadSector(m.z);
      w.tick = m.k;
      w.time = m.k * G.DT;
      w.sector = m.z;
      w.phase = m.h;
      w.sectorTime = m.u;
      w.status = m.st;
      w.phaseTime = m.pt;
      w.outcome = m.o;
      w.score = m.sc;
      w.chain = m.ch;
      w.reserves = m.r;
      w.cells.forEach((c, i) => {
        c.alive = !!(parseInt(m.m[Math.floor(i / 4)] || "0", 16) & (1 << (i % 4)));
      });
      w.plates.forEach((p, i) => {
        p.offset = m.of[i] || 0;
      });
      [w.refuge.active, w.refuge.warning, w.refuge.cycle] = m.re.map((v, i) => (i < 2 ? !!v : v));
      [
        w.core.x,
        w.core.y,
        w.core.hits,
        w.core.mode,
        w.core.timer,
        w.core.vx,
        w.core.vy,
        w.core.phaseEpoch,
        w.core.targetY,
      ] = m.c;
      w.players.forEach((p) => {
        const a = m.p.find((a) => a[0] === p.id);
        if (!a) {
          p.gone = true;
          p.alive = false;
          return;
        }
        const old = { x: p.x, y: p.y };
        [
          p.id,
          p.x,
          p.y,
          p.vx,
          p.vy,
          p.ax,
          p.ay,
          p.alive,
          p.charge,
          p.inv,
          p.respawn,
          p.cannonAck,
          p.biteGlow,
          p.blocked,
        ] = a;
        p.alive = !!p.alive;
        p.refuge = w.inRefuge(p);
        if (p.id === this.info.me) {
          this.pending = this.pending <= p.cannonAck ? 0 : this.pending;
          this.authority = { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
          if (!this.predicted || G.distance(this.predicted, p) > 45 || !p.alive)
            this.predicted = { ...this.authority };
        } else {
          this.previous = this.previous || new Map();
          this.previous.set(p.id, old);
        }
      });
      w.bullets = m.b.map((a) => ({ id: a[0], owner: a[1], x: a[2], y: a[3], vx: a[4], vy: a[5] }));
      w.cannons = m.a.map((a) => ({
        id: a[0],
        owner: a[1],
        x: a[2],
        y: a[3],
        mode: a[4],
        timer: a[5],
        vx: a[6],
        reflected: !!a[7],
      }));
      w.pursuers = m.d.map((a) => ({
        id: a[0],
        x: a[1],
        y: a[2],
        angle: a[3],
        kind: a[4],
        grace: a[5],
        r: 5,
      }));
      w.lessons = m.le;
      w.breakdown = m.br;
      for (const a of m.ev)
        if (a[0] > w.eventId) {
          w.events.push({ id: a[0], type: a[1], x: a[2], y: a[3], player: a[4], tick: m.k });
          w.eventId = a[0];
        }
      w.events = w.events.slice(-80);
    }
    view(dt) {
      const s = this.app.world.snapshot();
      if (this.info?.isHost) return s;
      for (const p of s.players) {
        if (p.id === this.info.me && this.predicted && p.alive) {
          const pred = this.predicted,
            a = this.latest || G.blankAction(),
            speed = s.tuning.speed;
          pred.vx = My3D2dge.approach(pred.vx, a.mx * speed, dt * 1550);
          pred.vy = My3D2dge.approach(pred.vy, a.my * speed, dt * 1550);
          pred.x = G.clamp(pred.x + pred.vx * dt, 50, G.W - 24);
          pred.y = G.wrap(pred.y + pred.vy * dt);
          const auth = this.authority;
          if (auth) {
            pred.x += (auth.x - pred.x) * Math.min(1, dt * 4);
            pred.y = G.wrap(pred.y + G.wrapDy(auth.y, pred.y) * Math.min(1, dt * 4));
          }
          p.x = pred.x;
          p.y = pred.y;
        } else if (this.previous?.has(p.id)) {
          const prev = this.previous.get(p.id);
          prev.x += (p.x - prev.x) * Math.min(1, dt * 14);
          prev.y = G.wrap(prev.y + G.wrapDy(p.y, prev.y) * Math.min(1, dt * 14));
          p.x = prev.x;
          p.y = prev.y;
        }
      }
      return s;
    }
    finish(won) {
      if (!this.info?.isHost || this.finished || this.ended) return;
      this.finished = true;
      this.stats.finishes++;
      const ids = this.members.map((p) => p.id),
        w = this.app.world;
      this.send(compact(w), { reliable: true });
      this.hub.finish({
        standings: [ids],
        scores: Object.fromEntries(ids.map((id) => [id, w.score])),
        won: !!won,
        stats: Object.fromEntries(
          ids.map((id) => [
            id,
            { Sectors: w.sector + (won ? 1 : 0), Bites: w.stats.bites, "Airborne hits": w.stats.intercepts },
          ]),
        ),
      });
    }
    end(reason) {
      if (this.ended) return;
      this.ended = true;
      this.reason = reason;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.frames.clear();
      this.latest = G.blankAction();
      this.app.controls?.clear();
      this.app.sound?.dispose();
      this.app.game?.stop();
      this.app.game?.input.clear();
      this.app.controls && (this.app.controls.dead = true);
      this.app.game?.dispose();
      if (this.app.hud) this.app.hud.hidden = true;
    }
    dispose() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    }
  }
  G.compact = compact;
  G.Online = Online;
})();
