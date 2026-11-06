(() => {
  const G = globalThis.Edge;
  class Pilot {
    constructor({ approach = 12, tolerance = 3.3 } = {}) {
      this.approach = approach;
      this.tolerance = tolerance;
      this.memory = new Map();
    }
    action(w, p) {
      const a = G.blankAction();
      if (w.status === "transition") {
        a.advance = w.phaseTime > 1.5;
        return a;
      }
      if (!p.alive || p.gone || w.status !== "playing") return a;
      let m = this.memory.get(p.id);
      if (!m) {
        m = { edge: p.lastEdge, evadeUntil: 0, evadeY: 0 };
        this.memory.set(p.id, m);
      }
      const go = (x, y, tolerance = 2) => {
        const dx = x - p.x,
          dy = G.wrapDy(y, p.y),
          d = Math.hypot(dx, dy);
        if (d > tolerance) {
          a.mx = dx / Math.max(d, this.approach);
          a.my = dy / Math.max(d, this.approach);
        }
        return d;
      };
      const aim = (x, y) => {
        const dx = x - p.x,
          dy = G.wrapDy(y, p.y),
          d = Math.hypot(dx, dy) || 1;
        a.ax = dx / d;
        a.ay = dy / d;
      };
      m.edge = Math.max(m.edge, p.lastEdge || 0);
      const c = w.core,
        final = w.sector === 2 && w.phase === 2;
      if (w.time < m.evadeUntil) {
        go(150, m.evadeY);
        return a;
      }
      // Dodge close guided threats before committing to another bite or lane.
      const threat = w.pursuers.find((q) => q.grace <= 0 && G.distance(p, q) < 46);
      if (threat && p.inv < 0.1) {
        const angle = Math.atan2(G.wrapDy(p.y, threat.y), p.x - threat.x) + 0.45;
        a.mx = Math.cos(angle);
        a.my = Math.sin(angle);
        aim(c.x, c.y);
        a.fire = true;
        return a;
      }
      if (p.charge < w.tuning.charge) {
        const cells = w.cells.filter((v) => v.alive);
        if (final || !cells.length) {
          if (c.mode === "dock") {
            go(c.x, c.y, 1);
            aim(c.x, c.y);
          } else {
            go(365, 40 + p.shape * 45);
            aim(c.x, c.y);
          }
        } else {
          const nearest = cells.reduce((best, v) => {
            const pos = w.cellPosition(v),
              score = G.distance(p, pos) + Math.abs(G.wrapDy(pos.y, 140)) * 0.1;
            return !best || score < best.score ? { v, pos, score } : best;
          }, null);
          go(nearest.pos.x - 2, nearest.pos.y, 1);
          aim(nearest.pos.x, nearest.pos.y);
        }
        return a;
      }
      if (c.mode === "break") {
        go(355, 70);
        return a;
      }
      let lane = c.y,
        eligible = c.mode === "dock",
        flight = false;
      const speed = w.tuning.cannonSpeed,
        wind = w.tuning.cannonWind;
      if (c.mode === "flight" || c.mode === "windup") {
        const wait = c.mode === "windup" ? c.timer : 0,
          T = (c.x - 34 + speed * wind - c.vx * wait) / (speed - c.vx);
        if (T > wait + 0.08 && T - wait < 3.4) {
          lane = G.wrap(c.y + c.vy * (T - wait));
          eligible = (c.mode === "flight" && c.x > 230) || (c.mode === "windup" && c.timer < 0.6);
          flight = true;
        }
      } else if (w.sector === 2 && w.phase === 1)
        lane = 140 + Math.sin((w.sectorTime + (550 - 34) / speed + wind) * 0.48) * 58;
      if (final && !flight) eligible = false;
      const firingX = final || flight ? 150 + p.shape * 18 : 355 + p.shape * 18;
      const d = go(firingX, lane, 1.2);
      aim(600, lane);
      const blocking = w.cells
        .filter((v) => v.alive && Math.abs(G.wrapDy(w.cellPosition(v).y, lane)) < 10.5)
        .sort((x, y) => x.x - y.x);
      if (blocking.length) {
        const target = w.cellPosition(blocking[0]);
        aim(target.x, target.y);
        a.fire = true;
      } else if (eligible && d < this.tolerance) {
        a.cannon = ++m.edge;
        m.evadeUntil = w.time + 1.45;
        m.evadeY = G.wrap(lane + (p.y > 140 ? -72 : 72));
        a.my = p.y > 140 ? -1 : 1;
      }
      return a;
    }
    actions(w) {
      return w.players.map((p) => this.action(w, p));
    }
  }
  class ShowcasePilot extends Pilot {
    action(w, p) {
      if (w.demo && w.sector === 1 && !w.stats.reflections && w.status === "playing") {
        const a = G.blankAction();
        if (w.time < (this.reflectWait || 0)) {
          a.my = 1;
          return a;
        }
        if (p.charge < w.tuning.charge) return super.action(w, p);
        const cell = w.cells.find((c) => c.alive && c.material === 1 && c.x === 414);
        if (cell) {
          const plate = w.plates[cell.plate],
            arrival = (cell.x - 34) / w.tuning.cannonSpeed + w.tuning.cannonWind;
          const y = G.wrap(
            cell.y +
              Math.sin(((w.sectorTime + arrival) * Math.PI * 2) / plate.period + plate.phase) *
                plate.amplitude,
          );
          const dx = 150 - p.x,
            dy = G.wrapDy(y, p.y),
            n = Math.hypot(dx, dy);
          a.mx = dx / Math.max(n, 12);
          a.my = dy / Math.max(n, 12);
          if (n < 3) {
            a.cannon = p.lastEdge + 1;
            this.reflectWait = w.time + 3.3;
          }
          return a;
        }
      }
      return super.action(w, p);
    }
  }
  G.Pilot = Pilot;
  G.ShowcasePilot = ShowcasePilot;
})();
