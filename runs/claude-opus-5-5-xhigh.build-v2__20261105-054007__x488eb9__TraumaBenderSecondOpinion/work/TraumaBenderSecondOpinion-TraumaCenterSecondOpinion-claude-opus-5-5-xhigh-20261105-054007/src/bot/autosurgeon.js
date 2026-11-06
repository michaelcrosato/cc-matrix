// One bot, three jobs (19.4): attract mode (cheats on), the scripted playthrough (cheats off), balance runs. It plays through a
// virtual device fed to Cursor.update and Wheel.update, the same path as a pad. Each object type gives a plan as a generator.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, OBJ = G.OBJ;
const Bot = G.Bot = {
  plans: {},    // type -> function*(o, S, B)
  /** skill: speed (u/s), react (s), aim (u of error), chain (keeps its plan going), breathAt etc. */
  create(S, handI, o = {}) {
    const skill = Object.assign({ speed: 330, react: 0, aim: 0, iv: 38, seed: 77, gifts: true }, o);
    const B = { S, i: handI, c: G.Cursor.make(213, 116), skill, plan: null, planObj: 0, wait: 0, trigV: 0, stick: [0, 0], digit: -1, fine: false, gift: false, consult: false, cancel: false, shock: false, rng: skill.seed * 2654435761 >>> 0, tx: 213, ty: 116, stuck: 0, jobId: 0, lastRewinds: 0 };
    Object.assign(B, botApi(B));
    return B;
  },
  /** one step: returns the sim input for this hand */
  step(B, S, dt) {
    B.S = S; const h = S.hands[B.i];
    B.stick = [0, 0]; B.digit = -1; B.gift = false; B.consult = false; B.cancel = false; B.fine = false;
    if (S.status === 'code') { B.plan = null; Bot.code(B, S); }
    else if (S.status === 'closing') { B.plan = null; Bot.closing(B, S); }
    else if (S.status === 'play') {
      if (S.stats.rewinds !== B.lastRewinds) { B.lastRewinds = S.stats.rewinds; B.plan = null; B.trigV = 0; }
      Bot.think(B, S, h, dt);
    } else { B.trigV = 0; }
    const dev = { stick: B.stick, fine: B.fine, assist: B.skill.assist ?? .6, speed: B.skill.speed / T.curSpeed };
    if (S.status === 'play' && h) G.Cursor.update(B.c, dev, S, h, dt); else if (B.moving) G.Cursor.update(B.c, dev, null, null, dt);
    G.Wheel.update(B.c, { digit: B.digit, step: 0, wheelStick: null, mouseHold: false }, dt);
    return { x: B.c.x, y: B.c.y, tool: B.c.tool, trig: B.trigV, fine: B.fine, gift: B.gift, consult: B.consult, cancel: B.cancel, shock: B.shock };
  },
  code(B, S) { const c = S.code, peak = c.k * T.codeEvery; B.shock = Math.abs(c.t - peak) < .02; },
  closing(B, S) { const c = S.close; if (!c.done) { B.trigV = Math.abs(c.r - 12) < 1.2 ? 1 : 0; } else B.trigV = 0; B.shock = false; },
  think(B, S, h, dt) {
    B.shock = false;
    if (B.wait > 0) { B.wait -= dt; return; }
    // gifts, when they are asked for or when things are bad
    if (B.skill.gifts) {
      if (S.prompt === 'breath' && S.steady >= T.breathCost && !S.breath) B.gift = true;
      else if (S.prompt === 'look' && G.Op.canLook(S)) B.gift = true;
      else if (S.prompt === 'consult') B.consult = true;
      else if (S.breath && !S.prompt && S.steady < 8) B.gift = true;
    }
    if (B.plan) {
      const r = B.plan.next();
      if (r.done) { B.plan = null; B.trigV = 0; if (B.skill.react) B.wait = B.skill.react; }
      else return;
    }
    // panic button: the IV
    if (S.vitals < B.skill.iv && !S.crash && !h.held && !h.stroke && !h.stitch) { B.plan = planIV(B, S); return; }
    const job = G.Op.nextJob(S, h);
    if (!job) { if (S.tut && S.tut.tool === 'syringe') B.plan = planIV(B, S); else if (S.phs && G.Op.phaseDef(S).clear && G.Op.phaseDef(S).clear.vitals && S.vitals < G.Op.phaseDef(S).clear.vitals) B.plan = planIV(B, S); else B.trigV = 0; return; }
    const planFn = (job.plan && Bot.plans[job.plan]) || OBJ[job.o.type].bot || Bot.plans[job.tool + ':' + job.o.type] || Bot.plans[job.tool];
    B.plan = planFn ? planFn(job.o, S, B, job) : null; B.jobId = job.o.id;
  },
};

/** the plan API: moves through the virtual stick, with the human-like error in skill.aim */
function botApi(B) { return {
  *tool(id) { const i = G.TOOLS.indexOf(id); while (B.c.tool !== id || (B.S.hands[B.i] && B.S.hands[B.i].swap > 0)) { B.digit = i; yield; } },
  /** steer toward a point (a moving target if x is a function) */
  *moveTo(x, y, speed, tol = 1.5) { const err = B.skill.aim; let ex = 0, ey = 0; if (err) { const a = botRand(B) * Math.PI * 2, r = botRand(B) * err; ex = Math.cos(a) * r; ey = Math.sin(a) * r; } let guard = 0; for (;;) { const tx = (typeof x === 'function' ? x() : x) + ex, ty = (typeof y === 'function' ? y() : y) + ey, dx = tx - B.c.x, dy = ty - B.c.y, d = Math.hypot(dx, dy); if (d <= tol + err * .3 || guard++ > 480) return; B.steer(dx, dy, d, speed); yield; } },
  steer(dx, dy, d, speed) { const v = Math.min(speed ?? B.skill.speed, d * 16), full = T.curSpeed * (B.skill.speed / T.curSpeed), m = Math.pow(Math.min(1, v / Math.max(1, full)), 1 / T.curve); B.stick = [dx / (d || 1) * m, dy / (d || 1) * m]; },
  /** straight line at a speed, for strokes and pulls: press first */
  *line(x, y, speed) { let guard = 0; for (;;) { const dx = x - B.c.x, dy = y - B.c.y, d = Math.hypot(dx, dy); if (d < 1.2 || guard++ > 900) return; B.steer(dx, dy, d, speed); yield; } },
  *hold(secs) { let t = secs; while (t > 0) { t -= 1 / 120; yield; } },
  press() { B.trigV = 1; },
  release() { B.trigV = 0; },
}; }
function botRand(B) { B.rng = (B.rng + 0x6D2B79F5) | 0; let t = Math.imul(B.rng ^ (B.rng >>> 15), 1 | B.rng); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function* planIV(B, S) { yield* B.tool('syringe'); B.press(); yield* B.hold(T.fillT + .03); B.release(); yield* B.hold(T.syrCool + .02); }

const P = Bot.plans;
const alive = (B, o) => { const q = G.Op.byId(B.S, o.id); return q && !q.done ? q : null; };
/** the embedded pull */
function* pull(o, S, B) {
  yield* B.tool('forceps'); const q = alive(B, o); if (!q) return;
  yield* B.moveTo(() => q.x, () => q.y);
  B.press(); yield;
  const p = q.pull, sp = Math.min(90, (p.max || T.tearSpeed) * .62);
  if (!q.free) { const left = p.depth - p.prog + 3; yield* B.line(B.c.x + p.ax * left, B.c.y + p.ay * left, sp); yield; }
  // carry it to the dish
  const dx = q.x - (q.ox ?? q.x), dy = q.y - (q.oy ?? q.y), l = Math.hypot(dx, dy) || 1; const need = T.dishR + 3 - l;
  if (need > 0) yield* B.line(B.c.x + dx / l * need, B.c.y + dy / l * need, 170);
  yield; B.release(); yield; yield;
}
P.forceps = pull;
P.scalpel = function* (o, S, B) {
  yield* B.tool('scalpel'); const g = alive(B, o); if (!g) return;
  if (g.type === 'guide') {
    const a = U.polyAt(g.pts, g.prog); yield* B.moveTo(a.x, a.y); B.press(); yield;
    let guard = 0;
    while (alive(B, g) && guard++ < 3000) {
      if (g.beatLock && (B.S.beatV > .1 || B.S.beatP > .84)) { yield; continue; }
      const q = U.polyAt(g.pts, Math.min(g.len, g.prog + (g.beatLock ? 5 : 9))); const dx = q.x - B.c.x, dy = q.y - B.c.y, d = Math.hypot(dx, dy); B.steer(dx, dy, d, g.beatLock ? 70 : 210); yield;
    }
    B.release(); yield;
  } else yield* slash(g, B);
};
function* slash(o, B) {
  const q = alive(B, o); if (!q) return; const ang = q.slashAng ?? (q.id || 1) * 2.1, dirX = Math.cos(ang), dirY = Math.sin(ang), r = (q.r || 4) + 18;
  yield* B.moveTo(() => q.x - dirX * r, () => q.y - dirY * r, undefined, 3); B.press(); yield;
  const ex = q.x + dirX * r, ey = q.y + dirY * r; yield* B.line(ex, ey, 240); B.release(); yield; yield;
}
Bot.slash = slash;
P.suture = function* (o, S, B) {
  yield* B.tool('suture');
  let guard = 0;
  while (alive(B, o) && guard++ < 40) {
    const st = G.Op.nextStitch(B.S, o); if (!st) break;
    yield* B.moveTo(() => G.Op.nextStitch(B.S, o) ? G.Op.nextStitch(B.S, o).a[0] : B.c.x, () => G.Op.nextStitch(B.S, o) ? G.Op.nextStitch(B.S, o).a[1] : B.c.y, 240, 2); if (!alive(B, o)) break;
    if (o.beatOnly) { while (B.S.beatP > .05 && B.S.beatP < .9) yield; }
    B.press(); yield;
    const end = () => G.Op.nextStitch(B.S, o); let g2 = 0;
    for (;;) { const e = end(); if (!e || g2++ > 200) break; const dx = e.b[0] - B.c.x, dy = e.b[1] - B.c.y, d = Math.hypot(dx, dy); if (d < 1.8) break; B.steer(dx, dy, d, 130); yield; }
    if (o.beatOnly) { let w = 0; while (B.S.beatV > .25 && w++ < 240) yield; }
    B.release(); yield; yield;
  }
};
P.salve = function* (o, S, B) {
  yield* B.tool('salve'); const q = alive(B, o); if (!q) return;
  const r = q.r || 8; yield* B.moveTo(q.x - r * .6, q.y - r * .6); B.press(); yield;
  let guard = 0, row = 0;
  while (alive(B, q) && guard++ < 600) {
    if (q.cells) {
      // go to the nearest cell left
      const c = q.cells, x0 = q.x - c.w * 2, y0 = q.y - c.h * 2; let bx = 0, by = 0, bd = 1e9; for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) if (c.g[j * c.w + i] === 0) { const x = x0 + (i + .5) * 4, y = y0 + (j + .5) * 4, d = U.dist(x, y, B.c.x, B.c.y); if (d < bd) { bd = d; bx = x; by = y; } }
      if (bd > 1e8) break; const dx = bx - B.c.x, dy = by - B.c.y; if (bd > 1) B.steer(dx, dy, bd, 190);
    } else { const dx = q.x - B.c.x, dy = q.y - B.c.y; B.steer(dx, dy, Math.hypot(dx, dy), 90); }
    yield;
  }
  B.release(); yield;
};
P.syringe = function* (o, S, B) {
  yield* B.tool('syringe'); const q = alive(B, o); if (!q) return;
  yield* B.moveTo(() => q.x, () => q.y);
  if (OBJ[q.type].doseWindow) { let w = 0; for (; w < 360; w++) { const per = 60 / (B.S.bpm || 80), left = (1 - B.S.beatP) * per; if (left <= T.fillT + .05 && left > T.fillT - .05) break; yield; } }
  B.press(); yield* B.hold(T.fillT + .02);
  if (OBJ[q.type].doseWindow) { let w = 0; while (!OBJ[q.type].doseWindow(q, B.S) && w++ < 300) { const dx = q.x - B.c.x, dy = q.y - B.c.y, d = Math.hypot(dx, dy); if (d > 1) B.steer(dx, dy, d, 200); yield; } }
  B.release(); yield; yield* B.hold(T.syrCool + .02);
};
P.cautery = function* (o, S, B) {
  yield* B.tool('cautery'); const q = alive(B, o); if (!q) return;
  yield* B.moveTo(() => q.x, () => q.y); const h = () => B.S.hands[B.i];
  while (h().lock > 0 || h().heat > .8) yield;
  B.press(); let guard = 0;
  while (alive(B, q) && guard++ < 720) {
    if (!G.Op.valid(B.S, q, 'cautery', h()) && !OBJ[q.type].burnThrough) { if (h().down) break; }
    const dx = q.x - B.c.x, dy = q.y - B.c.y, d = Math.hypot(dx, dy); if (d > .6) B.steer(dx, dy, d, 300);
    if (h().heat > .92) { B.release(); yield* B.hold(.4); B.press(); }
    yield;
  }
  B.release(); yield;
};
P.holdHandle = function* (o, S, B) { yield* B.tool('forceps'); const q = alive(B, o); if (!q) return; yield* B.moveTo(q.x, q.y); B.press(); let w = 0; while (alive(B, q) && w++ < 4800 && B.S.objs.some(x => x.type === 'windowed' && !x.done)) yield; B.release(); yield; };
P.suction = function* (o, S, B) {
  yield* B.tool('suction'); const q = alive(B, o); if (!q) return;
  yield* B.moveTo(() => q.x, () => q.y, undefined, 4); B.press(); let guard = 0;
  while (alive(B, q) && guard++ < 1200) { const dx = q.x - B.c.x, dy = q.y - B.c.y, d = Math.hypot(dx, dy); if (d > 3) B.steer(dx, dy, d, 120); yield; }
  B.release(); yield;
};
P.sonar = function* (o, S, B) {
  yield* B.tool('sonar'); const q = alive(B, o); if (!q) return;
  B.press(); yield* B.moveTo(() => q.x, () => q.y, 260, 12); let guard = 0;
  while (alive(B, q) && !(q.marked > 2) && guard++ < 120) yield;
  B.release(); yield;
};
})();
