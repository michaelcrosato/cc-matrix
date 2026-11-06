// The eight tools, each a gesture on the state (section 5.5). Analog input only ever gives more control: a key counts as a full press.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U;
const OBJ = G.OBJ;
const tol = (S, h) => T.tolX + (S.k ? S.k.assist * .5 : 0);    // assist only widens tolerances a little

const Tools = G.Tools = {
  /** hand-time reach of a tool on an object */
  reach(S, h, tool, o) {
    const spec = OBJ[o.type], extra = (spec.reach !== undefined ? (typeof spec.reach === 'function' ? spec.reach(o, tool, S) : spec.reach) : o.r || 0);
    switch (tool) { case 'forceps': return T.gripR + extra; case 'scalpel': return T.cutPressR + extra; case 'suture': return T.sewPressR; case 'syringe': return T.doseR + extra; case 'cautery': return T.beam + extra; case 'salve': return T.salveBrush + extra; case 'suction': return T.suckR + extra; default: return 10 + extra; }
  },

  // ---------------------------------------------------------------- forceps
  forceps(S, h, dt) {
    const Op = G.Op;
    if (h.pressed && !h.held) {
      const o = Op.nearest(S, 'forceps', h.x, h.y, h);
      if (o) {
        h.held = o.id; h.gx = h.x; h.gy = h.y; h.pa = 0; h.pv = 0; h.heldT = 0; if (o.pull) h.p0 = o.pull.prog;
        const spec = OBJ[o.type]; if (spec.grip) spec.grip(S, h, o);
        S.ev.push(['grip', h.x, h.y, h.id]);
      } else S.ev.push(['snip', h.x, h.y, h.id]);
    }
    if (!h.held) return;
    const o = Op.byId(S, h.held);
    if (!o || o.done) { h.held = 0; return; }
    const spec = OBJ[o.type];
    if (!h.down) { Tools.letGo(S, h, o); return; }
    h.heldT += dt;
    if (spec.hold) spec.hold(S, h, o, dt); else Tools.pullStep(S, h, o, dt);
  },
  letGo(S, h, o) {
    const spec = OBJ[o.type], Op = G.Op; h.held = 0;
    if (spec.release) { spec.release(S, h, o); return; }
    if (o.pull && o.free) {
      const far = U.dist(o.x, o.y, o.ox, o.oy) >= Math.min(T.dishR, o.pull.depth - 1) || !U.inCavity(o.x, o.y, 4);
      if (far) {
        S.ev.push(['dish', o.x, o.y, h.id]);
        const p = o.pull, g = p.tears === 0 && p.t <= p.par * T.tolX ? 'Textbook' : p.tears <= 1 ? 'Clean' : 'Sloppy';
        Op.finishObj(S, o, h, g, spec.worth || 100, 'forceps');
      } else S.ev.push(['drop', o.x, o.y, h.id]);
    }
  },
  /** the embedded pull: progress is travel along the axis; too fast or off axis tears */
  pullStep(S, h, o, dt) {
    const p = o.pull, Op = G.Op;
    if (o.free) { o.x = h.x; o.y = h.y; return; }
    if (o.lockedBy && OBJ[o.type].pullBlocked && OBJ[o.type].pullBlocked(o, S)) return;
    const dx = h.x - h.gx, dy = h.y - h.gy, along = dx * p.ax + dy * p.ay, off = Math.abs(-dx * p.ay + dy * p.ax), v = dt > 0 ? (along - h.pa) / dt : 0;
    h.pa = along; h.pv += (v - h.pv) * Math.min(1, dt / .08); p.t += dt;
    p.prog = Math.max(p.prog, h.p0 + along);
    o.x = o.ox + p.ax * Math.max(0, Math.min(p.prog, p.depth)); o.y = o.oy + p.ay * Math.max(0, Math.min(p.prog, p.depth));
    S.tension = Math.max(S.tension || 0, h.pv / (p.max || T.tearSpeed));
    const spec = OBJ[o.type];
    const blocked = spec.pullBlocked && spec.pullBlocked(o, S);
    if ((blocked && along > 4) || h.pv > (p.max || T.tearSpeed) * tol(S, h) || off > T.tearOff * tol(S, h)) { Tools.tear(S, h, o); return; }
    if (p.prog >= p.depth) {
      o.free = true; S.ev.push(['free', o.x, o.y, h.id]);
      if (spec.freed) spec.freed(S, h, o);
    }
  },
  tear(S, h, o) {
    const p = o.pull, Op = G.Op, Score = G.Score;
    p.tears++; p.prog = Math.max(0, p.prog - p.depth * T.tearBack);
    o.x = o.ox + p.ax * p.prog; o.y = o.oy + p.ay * p.prog; h.held = 0;
    Score.slip(S, h, o.x, o.y, T.tearVitals, 'tear'); S.stats.tears++;
    S.ev.push(['tear', o.x, o.y, h.id]);
    if (U.inCavity(o.x, o.y, 8)) Op.spawn(S, { type: 'laceration', x: o.x + p.ay * 8, y: o.y - p.ax * 8, r: 8, req: false, ang: Math.atan2(p.ay, p.ax) });
    const spec = OBJ[o.type]; if (spec.torn) spec.torn(S, h, o);
  },

  // ---------------------------------------------------------------- scalpel
  scalpel(S, h, dt) {
    const Op = G.Op, Score = G.Score, moved = U.dist(h.x, h.y, h.px, h.py), speed = dt > 0 ? moved / dt : 0;
    if (h.pressed && !h.stroke) {
      const g = Op.nearest(S, 'scalpel', h.x, h.y, h, o => o.type === 'guide');
      if (g) { h.stroke = g.id; h.offT = 0; S.ev.push(['cutStart', h.x, h.y, h.id]); }
      h.bare = 0;
    }
    if (!h.down) { h.stroke = 0; h.bare = 0; return; }
    if (speed > 0) S.ev.push(['blade', h.x, h.y, Math.min(1, speed / 220)]);
    // slash: any stroke crossing a slashable target fast enough
    let anySlash = false;
    for (const o of S.objs) {
      if (o.done || !OBJ[o.type].slashed || !Op.valid(S, o, 'scalpel', h)) continue;
      anySlash = true;
      if (speed >= T.slashSpeed && U.seg(o.x, o.y, h.px, h.py, h.x, h.y).d <= (o.r || 4) + 3) { OBJ[o.type].slashed(S, h, o); S.ev.push(['slash', o.x, o.y, h.id]); }
    }
    // no-touch anatomy
    Tools.nerveCheck(S, h);
    if (h.stroke) {
      const g = Op.byId(S, h.stroke);
      if (!g || g.done) { h.stroke = 0; return; }
      const n = U.polyNear(g.pts, h.x, h.y, Math.max(0, g.prog - 12), g.prog + 26);
      if (n.d > T.cutOff * tol(S, h)) {
        h.offT += dt;
        if (h.offT >= T.cutOffT) { h.offT = -.6; Score.slip(S, h, h.x, h.y, T.cutSlip, 'cut'); if (U.inCavity(h.x, h.y, 6)) Op.spawn(S, { type: 'laceration', x: h.x, y: h.y, r: 7, req: false, ang: 0 }); }
      } else {
        if (h.offT > 0) h.offT = 0; else if (h.offT < 0) h.offT = Math.min(0, h.offT + dt);
        if (g.beatLock && S.beatV > .3) {
          if (speed > 16) { if (S.rt - (h.beatSlip || -9) > .7) { h.beatSlip = S.rt; Score.slip(S, h, h.x, h.y, g.beatSlip || 2, 'beat'); } }
        } else if (n.s > g.prog) {
          const ds = n.s - g.prog; g.sum += n.d * ds; g.prog = n.s; g.t = (g.t || 0) + dt;
        }
        if (g.prog >= g.len - 1.5) {
          const mean = g.sum / Math.max(1, g.len), gr = mean <= T.cutTb * T.tolX ? 'Textbook' : mean <= T.cutClean * T.tolX ? 'Clean' : 'Sloppy';
          h.stroke = 0; S.ev.push(['cutDone', g.x, g.y, h.id]);
          Op.finishObj(S, g, h, gr, 100 + g.len * .6, 'scalpel');
        }
      }
    } else if (!anySlash && U.inCavity(h.x, h.y, 2)) {
      const near = S.objs.some(o => o.type === 'guide' && !o.done && Op.valid(S, o, 'scalpel', h) && U.polyNear(o.pts, h.x, h.y).d < 12);
      if (!near) { h.bare += moved; if (h.bare >= T.bareDrag * 3) { h.bare = 0; Score.slip(S, h, h.x, h.y, T.cutSlip, 'bare'); Op.spawn(S, { type: 'laceration', x: h.x, y: h.y, r: 6, req: false, ang: 0 }); } }
    }
  },
  nerveCheck(S, h) {
    if (S.rt - (h.nerveT ?? -9) < .7) return;
    for (const o of S.objs) {
      if (o.type !== 'nerve' || o.done) continue;
      for (let i = 1; i < o.pts.length; i++) {
        const a = o.pts[i - 1], b = o.pts[i];
        if (U.seg(h.x, h.y, a[0], a[1], b[0], b[1]).d < (o.w || 2) + .5) { h.nerveT = S.rt; G.Score.slip(S, h, h.x, h.y, T.nerveHit, 'nerve'); S.ev.push(['nerve', h.x, h.y, h.id]); return; }
      }
    }
  },

  // ---------------------------------------------------------------- suture
  suture(S, h, dt) {
    const Op = G.Op, Score = G.Score, bonus = S.doctor === 'sokolova' ? 1 : 0;
    if (h.pressed && !h.stitch) {
      let best = null, bd = 1e9;
      for (const o of S.objs) {
        if (o.done || !OBJ[o.type].sewable || !Op.valid(S, o, 'suture', h)) continue;
        const st = Op.nextStitch(S, o); if (!st) continue;
        const da = U.dist(h.x, h.y, st.a[0], st.a[1]), db = U.dist(h.x, h.y, st.b[0], st.b[1]), R = T.sewPressR * tol(S, h) + bonus;
        if (da <= R && da < bd) { bd = da; best = { o, far: st.b, from: 'a' }; }
        if (db <= R && db < bd) { bd = db; best = { o, far: st.a, from: 'b' }; }
      }
      if (best) { h.stitch = { id: best.o.id, i: best.o.sewn, t: 0, from: best.from }; S.ev.push(['needle', h.x, h.y, h.id]); }
      else S.ev.push(['snip', h.x, h.y, h.id]);
    }
    if (!h.stitch) return;
    const o = Op.byId(S, h.stitch.id);
    if (!o || o.done || o.sewn !== h.stitch.i) { h.stitch = null; return; }
    h.stitch.t += dt;
    if (h.down) return;
    const st = Op.nextStitch(S, o), far = h.stitch.from === 'a' ? st.b : st.a, d = U.dist(h.x, h.y, far[0], far[1]), ok = d <= T.sewEndR * tol(S, h) + bonus, t = h.stitch.t;
    h.stitch = null;
    if (o.beatOnly && S.beatV > .3) { Score.hurt(S, T.sewLoose); S.ev.push(['loose', h.x, h.y, h.id, 'beat']); return; }
    if (!ok) { Score.hurt(S, T.sewLoose); S.flow = 0; S.ev.push(['loose', h.x, h.y, h.id]); S.ev.push(['say', 'loose']); return; }
    o.sewn++; S.stats.stitches++; h.stitches++;
    const gr = t <= T.sewTb * T.tolX ? 'Textbook' : t <= T.sewClean * T.tolX ? 'Clean' : 'Sloppy';
    o.gsum += gr === 'Textbook' ? 2 : gr === 'Clean' ? 1 : 0;
    S.ev.push(['stitch', h.x, h.y, h.id]); if (S.tut && S.tut.tool === 'suture') { S.ev.push(['tutDone', 'suture']); S.tut = null; }
    Score.award(S, h, h.x, h.y, gr, 35, { steady: .5 });
    if (o.sewn >= o.n) { const m = o.gsum / o.n, g2 = m >= 1.5 ? 'Textbook' : m >= .75 ? 'Clean' : 'Sloppy'; Op.finishObj(S, o, h, g2, 60 + o.n * 10, 'suture'); }
  },

  // ---------------------------------------------------------------- salve
  salve(S, h, dt) {
    if (!h.down) return;
    const Op = G.Op; S.ev.push(['salve', h.x, h.y, h.id]);
    for (const o of S.objs) {
      if (o.done || !Op.valid(S, o, 'salve', h)) continue;
      if (o.cells) {
        const c = o.cells, cs = 4, x0 = o.x - c.w * cs / 2, y0 = o.y - c.h * cs / 2, br = T.salveBrush;
        if (U.dist(h.x, h.y, o.x, o.y) > o.r + br + 4) continue;
        for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) {
          const k = j * c.w + i; if (c.g[k] !== 0) continue;
          if (U.dist(x0 + (i + .5) * cs, y0 + (j + .5) * cs, h.x, h.y) <= br) { c.g[k] = 1; c.got++; }
        }
        o.salveT = (o.salveT || 0) + dt;
        if (c.got / c.n >= T.salveNeed) Op.healed(S, o, h);
      } else if (OBJ[o.type].coat && U.dist(h.x, h.y, o.x, o.y) <= (o.r || 0) + T.salveBrush) OBJ[o.type].coat(S, h, o, dt);
    }
  },

  // ---------------------------------------------------------------- syringe
  syringe(S, h, dt) {
    const Op = G.Op, Score = G.Score;
    if (h.cool > 0) { h.cool -= dt; h.fill = 0; h.over = 0; h.filling = false; return; }
    if (h.pressed) { h.filling = true; h.fill = 0; h.over = 0; S.ev.push(['plunge', h.x, h.y, h.id]); }
    if (!h.filling) return;
    if (h.down) { h.fill = Math.min(1, h.fill + dt / T.fillT); if (h.fill >= 1) h.over += dt; return; }
    const fill = h.fill, air = h.over >= T.doseOver; h.filling = false; h.fill = 0; h.over = 0; h.cool = T.syrCool;
    const o = Op.nearest(S, 'syringe', h.x, h.y, h);
    if (o) {
      const q = air ? 'Sloppy' : fill >= T.doseFull ? 'Textbook' : 'Clean';
      S.ev.push(['inject', o.x, o.y, h.id]);
      OBJ[o.type].dose(S, h, o, q, air ? fill * .5 : fill);
      if (air) S.ev.push(['bubble', o.x, o.y, h.id]);
    } else {
      const k = T.ivDose / 18 * (S.k ? S.k.iv : 18);
      Score.heal(S, k * fill * (S.crash ? .1 : 1)); S.ev.push(['iv', h.x, h.y, h.id, fill]); if (S.tut && S.tut.tool === 'syringe') { S.ev.push(['tutDone', 'syringe']); S.tut = null; }
    }
  },

  // ---------------------------------------------------------------- cautery
  cautery(S, h, dt) {
    const Op = G.Op, Score = G.Score;
    if (h.lock > 0) { h.lock -= dt; h.heat = Math.max(0, h.heat - T.heatCool * dt); return; }
    if (!h.down) { h.heat = Math.max(0, h.heat - T.heatCool * dt); h.charT = 0; h.charSlip = false; h.idleB = (h.idleB || 0) + dt; if (h.idleB > .5) h.dirty = false; return; }
    h.idleB = 0; h.heat += T.cauteryHeat * dt;
    if (h.heat >= 1) { h.heat = 1; h.lock = T.heatLock; h.dirty = true; S.ev.push(['lock', h.x, h.y, h.id]); S.ev.push(['say', 'lock']); return; }
    S.ev.push(['burnOn', h.x, h.y, h.id]);
    const o = Op.nearest(S, 'cautery', h.x, h.y, h);
    if (o) {
      h.charT = 0; h.charSlip = false; o.burnT = (o.burnT || 0) + dt; S.ev.push(['burn', o.x, o.y, h.id]);
      const spec = OBJ[o.type], need = S.dev && S.dev.oneHit ? Math.min(.02, spec.burnNeed ? spec.burnNeed(o, S) : .02) : (spec.burnNeed ? spec.burnNeed(o, S) : T.burnPolyp);
      if (spec.burning) spec.burning(S, h, o, dt);
      if (o.burnT >= need) {
        S.stats.burns++; h.burns++; const gr = h.dirty ? 'Clean' : 'Textbook'; h.dirty = false;
        if (spec.burned) spec.burned(S, h, o, gr); else Op.finishObj(S, o, h, gr, spec.worth || 60, 'cautery');
      }
    } else if (U.inCavity(h.x, h.y, 2)) {
      Tools.nerveCheck(S, h);
      h.charT += dt;
      if (h.charT >= T.charT) {
        Score.hurt(S, T.charDrain * dt); h.dirty = true;
        if (S.marks.length < 60 && (!S.marks.length || U.dist(S.marks[S.marks.length - 1][1], S.marks[S.marks.length - 1][2], h.x, h.y) > 3)) S.marks.push(['char', h.x, h.y, 5]);
      }
      if (h.charT >= T.charSlip && !h.charSlip) { h.charSlip = true; Score.slip(S, h, h.x, h.y, 1, 'char'); }
    }
  },

  // ---------------------------------------------------------------- suction
  suction(S, h, dt) {
    if (!h.down) return;
    const Op = G.Op; S.ev.push(['suck', h.x, h.y, h.id]);
    for (const o of S.objs) {
      if (o.type !== 'pool' || o.done || !Op.valid(S, o, 'suction', h)) continue;
      const d = U.dist(h.x, h.y, o.x, o.y) - Op.poolR(o);
      if (d > T.suckR) continue;
      const take = Math.min(o.vol, T.suctionRate * dt); o.vol -= take; S.stats.sucked += take; h.sucked += take;
      const k = Math.min(1, dt * 1.2); o.x += (h.x - o.x) * k * .35; o.y += (h.y - o.y) * k * .35;
      if (o.vol <= 0.01) { S.ev.push(['drained', o.x, o.y, h.id]); S.score += 10; h.score += 10; Op.finishObj(S, o, h, null, 0, 'suction'); }
    }
  },

  // ---------------------------------------------------------------- sonar
  sonar(S, h, dt) {
    h.lens = 0; if (!h.down) return;
    const r = T.sonarR * (S.doctor === 'vale' ? 1.25 : 1); h.lens = r; let near = 1e9, nx = 0;
    for (const o of S.objs) {
      if (o.done) continue;
      const isHidden = o.hidden, sings = OBJ[o.type].sings, d = U.dist(h.x, h.y, o.x, o.y);
      if (isHidden || sings) { if (d < near) { near = d; nx = o.x; } }
      if (isHidden && d <= r + (o.r || 0)) { if (!(o.marked > 0)) { S.ev.push(['found', o.x, o.y, h.id]); S.ev.push(['say', 'found']); if (!o.everFound) { o.everFound = true; S.flags.foundN = (S.flags.foundN || 0) + 1; G.Score.charge(S, 2); } if (S.tut && S.tut.tool === 'sonar') { S.ev.push(['tutDone', 'sonar']); S.tut = null; } } o.marked = T.sonarMark; }
    }
    S.ev.push(['sonar', h.x, h.y, h.id, near, nx]);
  },
};
})();
