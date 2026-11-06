(function (M) {
  "use strict";
  // Legal-intent player: reads the visible board, chooses an interception point and avoids imminent threats.
  // No health, speed, food or position mutation. Attract enables its own isolated invulnerability in World.
  class Bot {
    constructor(seat = 0) {
      this.seat = seat;
      this.target = null;
      this.lastPlan = -1;
      this.dir = -1;
      this.lastRev = 0;
      this.plans = 0;
    }
    intent(w, p) {
      if (w.phase !== "playing" || p.hit) return { d: -1, a: false };
      const b = w.board,
        m = p.m;
      if (m.moving) return { d: this.dir, a: w.data.reveal.kind !== "none" && p.chirp <= 0 };
      const threats = w.predators.filter((e) => e.state === "hunting"),
        near = (e) => b.distance([m.cx, m.cy], [e.m.cx, e.m.cy]);
      const threatened = threats.some((e) => near(e) < 6);
      const choices = b.edges(m.cx, m.cy);
      if (!choices.length) return { d: -1, a: false };
      // Make separate co-op targets when possible. Predict several cells ahead along a snack's committed route.
      const targets = w.food
        .filter((f) => f.alive)
        .map((f) => {
          let predicted = [f.m.cx, f.m.cy];
          const dist = b.distance([m.cx, m.cy], predicted);
          const lead = Math.min(7, Math.max(1, Math.floor(dist * M.foodRatio(w.remaining) * 0.55)));
          let d = f.m.d;
          for (let i = 0; i < lead; i++) {
            let e = b.neighbor(...predicted, d);
            if (!e || b.inPen(e.x, e.y) || b.gateIndex(e.x, e.y) >= 0) {
              const path = f.goal
                ? b.path(predicted, f.goal, {
                    avoid: (x, y) => b.inPen(x, y) || b.gateIndex(x, y) >= 0,
                  })
                : [];
              if (path.length < 2) break;
              d = b.direction(path[0], path[1]);
              e = b.neighbor(...predicted, d);
            }
            if (!e) break;
            predicted = [e.x, e.y];
          }
          const path = b.path([m.cx, m.cy], predicted, {
            avoid: (x, y) =>
              threats.some((e) => b.distance([x, y], [e.m.cx, e.m.cy]) < 2.3) &&
              !(x === m.cx && y === m.cy),
          });
          let score =
            (path.length || 999) +
            (threatened && f.power ? -7 : 0) +
            (this.target === f.id ? -1.8 : 0);
          const other = w.players.find((q) => q.id !== p.id);
          if (other && b.distance([other.m.cx, other.m.cy], [f.m.cx, f.m.cy]) + 2 < dist)
            score += 3;
          return { f, path, score, predicted };
        })
        .sort((a, c) => a.score - c.score || a.f.id.localeCompare(c.f.id));
      let best = targets.find((t) => t.path.length > 1);
      if (best) {
        this.target = best.f.id;
        this.dir = b.direction(best.path[0], best.path[1]);
      } else {
        const dist = (e) =>
          Math.min(...threats.map((t) => b.distance([e.x, e.y], [t.m.cx, t.m.cy])), 99);
        choices.sort((a, c) => dist(c) - dist(a) || a.d - c.d);
        this.dir = choices[0].d;
      }
      // When a target is on this cell, stepping toward it rather than idling lets swept encounters finish the catch.
      this.lastPlan = w.tick;
      this.lastRev = w.revision;
      this.plans++;
      return { d: this.dir, a: w.data.reveal.kind !== "none" && p.chirp <= 0 };
    }
  }
  M.Bot = Bot;
})(globalThis.Mix);
