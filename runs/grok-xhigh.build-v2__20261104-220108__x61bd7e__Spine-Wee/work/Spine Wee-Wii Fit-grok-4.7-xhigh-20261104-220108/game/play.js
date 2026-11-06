/* Every activity. One session walks the card, the demo, the count, the play, and the stamp. */
var G = G || {};
(function () {
  'use strict';
  const E = My3D2dge;
  const DT = 1 / 120;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LEAD = { poor: -0.4, average: 0.05, good: 0.14, expert: 0.2 };
  const STEP_OFF = { poor: 0.1, average: 0.03, good: 0.015, expert: 0.008 };
  const EFFORT = { poor: 0.28, average: 0.5, good: 0.62, expert: 0.72 };

  function skillName(seat) {
    if (G.dev && G.dev.on && G.dev.bot && seat && seat.local && G.BOTS[G.dev.bot]) return G.dev.bot;
    const d = G.driver && G.driver !== 'human' ? G.driver : (seat && seat.skill);
    if (!d || d === 'passive' || d === 'human') return null;
    return G.BOTS[d] ? d : null;
  }

  /* The lean that belongs to this seat. Seat 0 is G.lean, so a solo session is unchanged. */
  function leanFor(seat) {
    const i = seat && typeof seat.pi === 'number' && seat.pi >= 0 ? seat.pi : 0;
    if (G.leans && G.leans[i]) return G.leans[i];
    return G.lean;
  }

  function seatInput(seat) {
    const ps = G.game && G.game.players;
    const i = seat && typeof seat.pi === 'number' && seat.pi >= 0 ? seat.pi : 0;
    if (ps && ps[i]) return ps[i];
    return G.game ? G.game.input : null;
  }

  function arm(bal, skill) {
    if (!bal) return;
    if (!skill) { bal.skill = null; bal.bot = null; return; }
    if (bal.skill === skill && bal.bot) return;
    bal.skill = skill;
    const br = E.rng((bal.seed ^ 0x9e3779b9) >>> 0);
    const b = G.BOTS[skill];
    bal.bnx = function (t) { return (Math.sin(t * .35 + 1.1) + .6 * Math.sin(t * .35 * 1.73 + 2.2)) / 1.6; };
    bal.bny = function (t) { return (Math.sin(t * .41 + 0.4) + .6 * Math.sin(t * .41 * 1.17 + 1.7)) / 1.6; };
    void br;
    bal.bot = b;
  }

  /* A seat's hands. A named skill drives the activity bots. A hold skill is applied on the balance itself. */
  function drive(seat, fam, dt) {
    const skill = skillName(seat);
    const human = !skill && !(G.driver === 'passive' || (seat && seat.skill === 'passive'));
    if (human && seat && seat.local) {
      const L = leanFor(seat);
      seat.ux = L.ux; seat.uy = L.uy;
      seat.breath = L.breath; seat.effort = L.effort;
      seat.jump = L.jump; seat.catchL = L.catchL; seat.catchR = L.catchR;
      seat.paceL = L.paceL; seat.paceR = L.paceR;
      if (Math.hypot(seat.ux, seat.uy) > 0.05 || seat.breath > 0.05) seat.moved = true;
      return;
    }
    seat.ux = 0; seat.uy = 0; seat.breath = 0; seat.effort = 0;
    seat.jump = false; seat.catchL = false; seat.catchR = false; seat.paceL = false; seat.paceR = false;
    if (!skill) return;
    const kind = fam && fam.kind;
    if (kind === 'rep') {
      const lead = LEAD[skill];
      const bead = fam.bead, vel = fam.beadVel || 0;
      const sign = vel > 0.002 ? 1 : vel < -0.002 ? -1 : 0;
      /* Expert servos onto the bead. A fixed lead sits well on tier 1 and misses tier 2's fast rise. */
      let target = bead + lead * sign;
      const bal = seat.bal;
      if (skill === 'expert' && bal) {
        const depth = fam.axis === 'x' ? (fam.side > 0 ? bal.px : -bal.px) : -bal.py;
        const rate = fam.axis === 'x' ? (fam.side > 0 ? bal.vx : -bal.vx) : -bal.vy;
        const P = 2.6, D = 0.35;
        target = bead + P * (bead - depth) + D * (vel - rate);
      }
      target = clamp(target, -0.2, 1.25);
      if (fam.axis === 'x') {
        seat.ux = fam.side * target;
        seat.uy = skill === 'expert' && bal ? clamp(-bal.py * 1.6, -0.6, 0.6) : 0;
      } else {
        seat.uy = -target;
        seat.ux = skill === 'expert' && bal ? clamp(-bal.px * 1.6, -0.6, 0.6) : 0;
      }
    } else if (kind === 'sun') {
      seat.breath = fam.guide;
    } else if (kind === 'hoop') {
      const w = skill === 'poor' ? 4.2 : 9;
      seat.botPh = (seat.botPh || 0) + w * dt * (fam.otherWay ? -1 : 1);
      seat.ux = Math.cos(seat.botPh); seat.uy = Math.sin(seat.botPh);
      if (fam.toss && Math.abs(fam.toss.eta) < 0.12) {
        if (fam.toss.side < 0) seat.catchL = true; else seat.catchR = true;
      }
    } else if (kind === 'jog') {
      const hz = skill === 'poor' ? 1.4 : 3.0;
      fam.footT = (fam.footT || 0) + dt;
      if (fam.footT >= 1 / hz) { fam.footT = 0; fam.foot = !fam.foot; fam.stepEdge = fam.foot ? 'L' : 'R'; }
      seat.paceL = fam.stepEdge === 'L'; seat.paceR = fam.stepEdge === 'R';
      const cup = fam.nextCup;
      seat.ux = cup ? clamp((cup.x - fam.x) / 1.2, -1, 1) : 0;
      seat.uy = 0.2;
    } else if (kind === 'slalom') {
      const gate = fam.nextGate;
      const err = gate ? gate.x - fam.x : 0;
      const steer = skill === 'poor' ? 0.25 : skill === 'average' ? 0.85 : 1;
      seat.ux = clamp(err / 36, -1, 1) * steer;
      seat.uy = 0;
    } else if (kind === 'tray') {
      const aim = skill === 'poor' ? 0.25 : skill === 'average' ? 0.7 : 0.95;
      seat.ux = aim; seat.uy = 0.02;
    } else if (kind === 'laundry') {
      seat.effort = EFFORT[skill] || 0.5;
      const pin = fam.pinAhead;
      seat.jump = !!(pin && pin.dist < 1.2 && pin.dist > 0.08);
    }
  }

  function setOf(act, tier, gentle) {
    const name = act.set ? act.set[tier - 1] : null;
    let s = name && G.SETS[name] ? G.SETS[name] : { k: 14, c: 7, s: 4, A: 1.2, nf: 1, R: .3, push: null };
    if (gentle) s = G.gentleSet(s, true);
    return s;
  }

  function repSet(axis) {
    const o = { k: 16, c: 8, s: 0, A: 0.35, nf: 0.7, R: 0.55, push: null, kx: 16, ky: 16, cx: 8, cy: 8 };
    if (axis === 'x') { o.sx = 0; o.sy = 8; }
    else { o.sx = 8; o.sy = 0; }
    return o;
  }

  function holdCenter(t) {
    const i = Math.floor(t / 12);
    const a = i * 2.4;
    return { x: Math.cos(a) * 0.06, y: Math.sin(a * 1.3) * 0.05 };
  }

  function beadOf(t, tier) {
    if (tier >= 2) {
      const u = t % 5;
      if (u < 3) return u / 3;
      if (u < 4) return 1;
      return 1 - (u - 4);
    }
    const u = t % 4;
    return u < 2 ? u / 2 : 1 - (u - 2) / 2;
  }

  function guideOf(t) {
    const u = (t % 8) / 4;
    return u < 1 ? u : 2 - u;
  }

  /* ---- families ---- */
  function beginFamily(sess) {
    const act = sess.act, tier = sess.tier, seat = sess.seats[0];
    const gentle = !!(G.game && G.game.settings && G.game.settings.gentle);
    const skill = skillName(seat);
    const fam = { kind: act.family, t: 0, fx: 0, fy: 0 };
    if (act.family === 'hold' || act.family === 'sun' || act.family === 'candle' || act.family === 'laundry') {
      const set = act.family === 'rep' ? repSet('y') : setOf(act, tier, gentle);
      sess.seats.forEach(function (q, i) {
        const sk = skillName(q);
        q.bal = new G.Balance(set, (sess.seed + i * 17) >>> 0, { skill: (act.family === 'laundry' ? sk : (act.family === 'hold' || act.family === 'sun' || act.family === 'candle') ? sk : null), cheat: !!sess.cheat });
      });
    }
    if (act.family === 'rep') {
      fam.axis = act.axis || 'y';
      fam.reps = act.reps[tier - 1];
      fam.planned = fam.reps;
      fam.doneReps = 0;
      fam.scores = [];
      fam.err = 0; fam.samples = 0; fam.form = 0;
      fam.bead = 0; fam.prevBead = 0; fam.beadVel = 0; fam.side = 1;
      fam.cycle = tier >= 2 ? 5 : 4;
      sess.seats.forEach(function (q, i) {
        q.bal = new G.Balance(repSet(fam.axis), (sess.seed + i * 19) >>> 0, { cheat: !!sess.cheat });
      });
      sess.limit = fam.planned * fam.cycle + 1.5;
    }
    if (act.family === 'sun') { fam.poseI = 0; fam.guide = 0; fam.match = 0; fam.matchN = 0; }
    if (act.family === 'candle') { fam.flame = 1; fam.flameSum = 0; fam.relit = false; fam.dead = false; fam.untouched = 0; fam.thought = 0; }
    if (act.family === 'step') fam.rh = null;
    if (act.family === 'hoop') { fam.omega = 0; fam.ang = 0; fam.band = 0; fam.out = 0; fam.hoops = 1; fam.caught = 0; fam.drops = 0; fam.score = 0; fam.otherWay = false; fam.toss = null; fam.tossT = 2; }
    if (act.family === 'jog') { fam.x = 0; fam.z = 0; fam.cad = 0; fam.hist = []; fam.zone = 0; fam.cups = 0; fam.cupN = 4; fam.stitch = 0; fam.sprint = 0; fam.steps = 0; fam.lastStep = 0; }
    if (act.family === 'slalom') {
      fam.x = 0; fam.z = 0; fam.pen = 0; fam.missed = {}; fam.tumble = 0; fam.done = false;
      fam.half = tier >= 2 ? 26 : 40;
      fam.finish = G.GATES[G.GATES.length - 1].z + 500;
    }
    if (act.family === 'tray') { fam.trayI = 0; fam.got = 0; fam.total = 0; fam.world = null; fam.cleared = 0; G.TRAYS.forEach(function (t) { fam.total += t.olives.length; }); }
    if (act.family === 'laundry') { fam.x = 0; fam.falls = 0; fam.post = 0; fam.len = 55; fam.done = false; fam.gustT = 2.2; fam.gust = 0; fam.air = 0; }
    sess.fam = fam;
    if (act.family === 'step') startStep(sess);
    if (act.family === 'tray') loadTray(sess);
  }

  function startStep(sess) {
    const tier = sess.tier;
    const chart = G.CHARTS[tier >= 2 ? 't2' : 't1'];
    const song = tier >= 2 ? G.SONGS.stepB : G.SONGS.stepA;
    const lanes = sess.classMode ? ['left', 'down', 'up', 'right'] : ['stepL', 'stepD', 'stepU', 'stepR'];
    const scale = G.dev && G.dev.on ? G.dev.v.rhythm : 1;
    const rh = new E.Rhythm(G.game, {
      song: song, chart: chart, lanes: lanes, life: 4,
      windows: { perfect: 45 * scale, great: 90 * scale, good: 135 * scale }
    });
    try { rh.start(); } catch (e) { /* the clock still moves once music has a song */ }
    try { G.game.audio.onBeat(function () { try { G.game.audio.sfx('tick'); } catch (err) { /* quiet */ } }); } catch (e) { /* no bus yet */ }
    sess.fam.rh = rh;
    const parts = String(chart.order).trim().split(/\s+/).length;
    const bpm = tier >= 2 ? 120 : 100;
    sess.limit = Math.min(sess.limit, parts * 16 * (60 / bpm / 4) + 0.4);
  }

  function loadTray(sess) {
    const fam = sess.fam;
    const spec = G.TRAYS[fam.trayI];
    if (!spec) { fam.world = null; return; }
    const world = new E.Physics({ gravity: [0, 0], sleep: false, substeps: 2, iterations: 6 });
    world.segment([8, 16], [250, 16]);
    world.segment([8, 184], [250, 184]);
    world.segment([8, 16], [8, 184]);
    world.segment([248, 16], [248, 184]);
    spec.bumps.forEach(function (b) { world.circle(b.x, b.y, b.r, { type: 'static', bounce: 0.4, friction: 0.2 }); });
    const glass = spec.glasses[0];
    const gx = glass.x, gy = glass.y;
    /* The drawn glass is small. The catch spans the tray's height so a sideways tilt lands every lane. */
    const sensor = world.circle(gx, gy, 72, { type: 'static', sensor: true });
    sensor._glass = true;
    if (spec.gecko) fam.gecko = world.circle(78, gy, 7, { type: 'kinematic', bounce: 0.05, friction: 0.05 });
    spec.olives.forEach(function (o) {
      const b = world.circle(o.x, o.y, 6, { friction: 0.12, damping: 1.6, bounce: 0.05, density: 0.02, bullet: true });
      b._olive = true;
    });
    world.on.enter = function (sensorBody, other) {
      if (!other || !other._olive || other._caught) return;
      if (!sensorBody || !sensorBody._glass) return;
      other._caught = true;
      fam.got++;
      try { other.off = true; } catch (e) { /* it has arrived */ }
      try { G.game.audio.sfx('plop'); } catch (e) { /* quiet */ }
    };
    fam.world = world;
    fam.trayOlives = spec.olives.length;
    fam.trayGot0 = fam.got;
  }

  function stepFamily(sess, dt) {
    const fam = sess.fam, act = sess.act;
    if (!fam) return;
    fam.t += dt;
    const seat = sess.seats[0];
    drive(seat, fam, dt);
    sess.seats.forEach(function (q, i) { if (i > 0) drive(q, fam, dt); });
    if (act.family === 'hold') stepHold(sess, dt);
    else if (act.family === 'sun') stepSun(sess, dt);
    else if (act.family === 'candle') stepCandle(sess, dt);
    else if (act.family === 'rep') stepRep(sess, dt);
    else if (act.family === 'step') stepStep(sess, dt);
    else if (act.family === 'hoop') stepHoop(sess, dt);
    else if (act.family === 'jog') stepJog(sess, dt);
    else if (act.family === 'slalom') stepSlalom(sess, dt);
    else if (act.family === 'tray') stepTray(sess, dt);
    else if (act.family === 'laundry') stepLaundry(sess, dt);
    const bal = seat.bal;
    if (bal) {
      sess.leanX = bal.px; sess.leanY = bal.py;
      if (seat.local) { G.lean.ux = seat.ux; G.lean.uy = seat.uy; }
    }
  }

  function stepHold(sess, dt) {
    const fam = sess.fam;
    const c = holdCenter(fam.t);
    fam.c = c;
    let fx = 0;
    const gull = Math.floor(fam.t / 12);
    const gph = fam.t % 12;
    if (gull > 0 && gph < 0.28) fx = (gull % 2 ? 1 : -1) * 0.7;
    fam.fx = fx;
    const many = !!(sess.classMode && sess.seats.length > 1);
    const list = many ? sess.seats : [sess.seats[0]];
    for (let i = 0; i < list.length; i++) {
      const seat = list[i], bal = seat && seat.bal;
      if (!bal) continue;
      arm(bal, skillName(seat));
      bal.step(dt, seat.ux, seat.uy, fx, 0, c);
      const pct = clamp(bal.steadiness - 0.05 * bal.falls, 0, 1);
      if (i === 0) {
        sess.pct = pct;
        if (sess.tier >= 2 && bal.px) fam.eyes = true;
      }
      if (many) seat.pct = pct;
    }
  }

  function stepSun(sess, dt) {
    const fam = sess.fam, seat = sess.seats[0], bal = seat.bal;
    fam.guide = guideOf(fam.t);
    arm(bal, skillName(seat));
    if (skillName(seat)) seat.breath = fam.guide;
    bal.step(dt, seat.ux, seat.uy, 0, 0, { x: 0, y: 0 });
    const breath = seat.local && !skillName(seat) ? leanFor(seat).breath : seat.breath;
    fam.matchN++;
    if (Math.abs(breath - fam.guide) <= 0.25) fam.match++;
    fam.poseI = Math.min(G.SUN_POSES.length - 1, Math.floor(fam.t / 16));
    sess.pct = clamp(0.6 * bal.steadiness + 0.4 * (fam.match / fam.matchN), 0, 1);
    if (fam.t >= 80) sess.ended = true;
  }

  function stepCandleOne(sess, seat, box, rng, dt, primary) {
    const bal = seat.bal;
    if (!bal) return;
    arm(bal, skillName(seat));
    let fx = 0, fy = 0;
    box.thought -= dt;
    if (box.thought <= 0) {
      box.thought = 4.5 + (rng() * 2);
      const ang = rng() * Math.PI * 2;
      box.tx = Math.cos(ang) * 0.85;
      box.ty = Math.sin(ang) * 0.85;
      box.tleft = 1.1;
      if (sess.tier >= 2 && rng() > 0.5) { box.tx *= 1.3; box.ty *= 1.3; }
    }
    if (box.tleft > 0) { box.tleft -= dt; fx = box.tx; fy = box.ty; }
    bal.step(dt, seat.ux, seat.uy, fx, fy, { x: 0, y: 0 });
    const sp = Math.hypot(bal.vx, bal.vy);
    const inside = bal.stumble <= 0 && Math.hypot(bal.px, bal.py) < (bal.set.R || 0.2);
    if (sp > 0.55) box.flame -= 0.4 * dt;
    else if (inside) box.flame += 0.12 * dt;
    else box.flame -= 0.055 * dt;
    box.flame = clamp(box.flame, 0, 1);
    if (box.flame <= 0 && !box.relit) { box.relit = true; box.flame = 0.15; }
    else if (box.flame <= 0 && box.relit) box.dead = true;
    box.flameSum += box.flame;
    const moved = Math.hypot(seat.ux, seat.uy) > 0.05 || seat.breath > 0.05;
    if (!moved) box.untouched += dt; else box.untouched = 0;
    if (primary && box.untouched > 20 && !box.said) { box.said = true; G.subtitle = G.LINES.tare.filter(function (s) { return s.indexOf('controller') >= 0; })[0] || ''; }
    const mean = box.flameSum / Math.max(1, bal.frames);
    const pct = clamp(0.6 * bal.steadiness + 0.4 * mean, 0, 1);
    if (primary) {
      sess.pct = pct;
      if (box.dead) sess.ended = true;
    }
    if (sess.classMode) seat.pct = pct;
  }

  function stepCandle(sess, dt) {
    const many = !!(sess.classMode && sess.seats.length > 1);
    const list = many ? sess.seats : [sess.seats[0]];
    for (let i = 0; i < list.length; i++) {
      const seat = list[i];
      const box = i === 0 ? sess.fam : (seat._candle || (seat._candle = { flame: 1, flameSum: 0, relit: false, dead: false, untouched: 0, thought: 0, tleft: 0, tx: 0, ty: 0, said: false }));
      const rng = i === 0 ? sess.rng : (seat._rng || (seat._rng = E.rng((sess.seed + i * 101) >>> 0)));
      stepCandleOne(sess, seat, box, rng, dt, i === 0);
    }
  }

  function stepRepOne(sess, seat, store, dt, primary) {
    const fam = sess.fam, bal = seat.bal;
    if (!bal) return;
    drive(seat, fam, dt);
    if (store.doneReps === Math.floor(fam.planned * 0.6) && !store.fatigued) {
      store.fatigued = true;
      const mul = G.dev && G.dev.on ? G.dev.v.fatigue / 1.5 : 1;
      bal.set = Object.assign({}, bal.set, { A: bal.set.A * 1.5 * mul, k: bal.set.k * 0.8, kx: 16 * 0.8, ky: 16 * 0.8 });
    }
    bal.step(dt, seat.ux, seat.uy, 0, 0, { x: 0, y: 0 });
    const depth = fam.axis === 'x' ? clamp(fam.side > 0 ? bal.px : -bal.px, 0, 1) : clamp(-bal.py, 0, 1);
    const tol = G.dev && G.dev.on ? G.dev.v.repTol : 0.08;
    store.err += Math.abs(depth - fam.bead);
    store.form += fam.axis === 'x' ? Math.abs(bal.py) : Math.abs(bal.px);
    store.samples++;
    const cyc = Math.floor(fam.t / fam.cycle);
    if (cyc > store.doneReps) {
      const meanErr = store.err / Math.max(1, store.samples);
      let sc = meanErr <= tol ? 1 : meanErr >= 0.35 ? 0 : (0.35 - meanErr) / (0.35 - tol);
      store.scores.push(sc);
      store.err = 0; store.samples = 0;
      store.doneReps = cyc;
      if (primary && store.doneReps === fam.planned && !fam.extra) {
        const mean = store.scores.reduce(function (a, b) { return a + b; }, 0) / store.scores.length;
        if (mean > 0.8) { fam.extra = true; fam.planned += 2; sess.limit += fam.cycle * 2; }
      }
    }
    const form = store.form / Math.max(1, bal.frames);
    const pen = clamp(form * 0.45, 0, 0.3);
    const mean = store.scores.length ? store.scores.reduce(function (a, b) { return a + b; }, 0) / store.scores.length : 0;
    const pct = clamp(mean * (1 - pen), 0, 1);
    if (primary) sess.pct = pct;
    if (sess.classMode) seat.pct = pct;
    if (primary && store.doneReps >= fam.planned && store.scores.length >= fam.planned) sess.ended = true;
  }

  function stepRep(sess, dt) {
    const fam = sess.fam;
    const prev = fam.bead;
    fam.bead = beadOf(fam.t, sess.tier);
    fam.beadVel = (fam.bead - prev) / dt;
    fam.side = (Math.floor(fam.t / fam.cycle) % 2 === 0) ? 1 : -1;
    const many = !!(sess.classMode && sess.seats.length > 1);
    const list = many ? sess.seats : [sess.seats[0]];
    for (let i = 0; i < list.length; i++) {
      const seat = list[i];
      const store = i === 0 ? fam : (seat._rep || (seat._rep = { err: 0, samples: 0, form: 0, scores: [], doneReps: 0, fatigued: false }));
      stepRepOne(sess, seat, store, dt, i === 0);
    }
  }

  function chartOf(sess) {
    const tier = sess.tier;
    const chart = G.CHARTS[tier >= 2 ? 't2' : 't1'];
    const song = tier >= 2 ? G.SONGS.stepB : G.SONGS.stepA;
    const lanes = sess.classMode ? ['left', 'down', 'up', 'right'] : ['stepL', 'stepD', 'stepU', 'stepR'];
    const scale = G.dev && G.dev.on ? G.dev.v.rhythm : 1;
    const rh = new E.Rhythm(G.game, {
      song: song, chart: chart, lanes: lanes, life: 4,
      windows: { perfect: 45 * scale, great: 90 * scale, good: 135 * scale }
    });
    return rh;
  }

  function chartMiss(rh) {
    if (!rh || !rh.started || rh.done) return;
    const A = rh.game.audio, s = A.pos.step, spb = rh._spb();
    for (let i = 0; i < rh.notes.length; i++) {
      const n = rh.notes[i];
      if (n.step > s + 8 * rh.song.steps) break;
      if (n.call) continue;
      if (!n.j && (s - n.step) * spb * 1000 > rh.windows.good) rh._judge(n, 'miss', 0);
      if (rh.done) return;
    }
    const p = A.pos;
    if (!p.playing && p.t > 0) rh.done = true;
  }

  function stepSeatChart(sess, seat) {
    if (!seat._rh) {
      seat._rh = chartOf(sess);
      seat._rh.started = true;
    }
    const rh = seat._rh;
    const I = seatInput(seat);
    const skill = skillName(seat);
    if (skill) {
      const off = STEP_OFF[skill] || 0.02;
      const pos = G.game.audio.pos;
      const spb = 60 / (pos.bpm || 100) / 4;
      for (let i = 0; i < rh.notes.length; i++) {
        const n = rh.notes[i];
        if (n.j || n.call || n._bot) continue;
        const ahead = (n.step - pos.step) * spb;
        if (ahead <= off) { n._bot = true; rh.hit(n.lane); }
      }
    } else if (I) {
      rh.lanes.forEach(function (a, i) { if (I.pressed(a)) rh.hit(i); });
    }
    chartMiss(rh);
    const judged = rh.counts.perfect + rh.counts.great + rh.counts.good + rh.counts.miss;
    return judged ? rh.accuracy : 0;
  }

  function stepStep(sess, dt) {
    const fam = sess.fam, rh = fam.rh, seat = sess.seats[0];
    if (!rh) return;
    const skill = skillName(seat);
    if (skill && !sess.classMode) {
      const off = STEP_OFF[skill] || 0.02;
      const pos = G.game.audio.pos;
      const spb = 60 / (pos.bpm || 100) / 4;
      for (let i = 0; i < rh.notes.length; i++) {
        const n = rh.notes[i];
        if (n.j || n.call || n._bot) continue;
        const ahead = (n.step - pos.step) * spb;
        if (ahead <= off) { n._bot = true; rh.hit(n.lane); }
      }
    }
    rh.update();
    const judged = rh.counts.perfect + rh.counts.great + rh.counts.good + rh.counts.miss;
    sess.pct = judged ? rh.accuracy : 0;
    if (sess.classMode) {
      seat.pct = sess.pct;
      for (let i = 1; i < sess.seats.length; i++) {
        const q = sess.seats[i];
        if (q.scoring === false) { q.pct = 0; continue; }
        q.pct = stepSeatChart(sess, q);
      }
    }
    if (rh.done) sess.ended = true;
    void dt;
  }

  function stepHoopOne(sess, seat, box, rng, dt, primary) {
    const clock = sess.fam.t;
    const ux = seat.ux || 0, uy = seat.uy || 0;
    const mag = Math.hypot(ux, uy);
    let omega = 0;
    if (mag > 0.55) {
      const ang = Math.atan2(uy, ux);
      let d = ang - (box.ang || 0);
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (box.haveAng) omega = d / dt;
      box.ang = ang; box.haveAng = true;
    } else box.haveAng = false;
    box.omega = omega;
    const lo = G.dev && G.dev.on ? G.dev.v.hoopLo : 7;
    const hi = G.dev && G.dev.on ? G.dev.v.hoopHi : 11;
    const dir = box.otherWay ? -1 : 1;
    const inBand = Math.abs(omega) >= lo && Math.abs(omega) <= hi && omega * dir > 0;
    if (inBand) { box.band += dt; box.out = 0; box.score += dt * (1 + box.hoops * 0.15); }
    else if (mag > 0.2) { box.out += dt; if (box.out > 1.5 && box.hoops > 1) { box.hoops--; box.drops++; box.out = 0; } }
    if (!box.otherWay && clock >= sess.limit * 0.5) box.otherWay = true;
    box.tossT -= dt;
    if (box.tossT <= 0) {
      box.tossT = 8;
      box.toss = { side: rng() < 0.5 ? -1 : 1, eta: 1.1 };
    }
    if (box.toss) {
      box.toss.eta -= dt;
      const hit = box.toss.side < 0 ? seat.catchL : seat.catchR;
      if (hit && Math.abs(box.toss.eta) <= 0.25) { box.caught++; box.hoops = Math.min(6, box.hoops + 1); box.toss = null; }
      else if (box.toss.eta < -0.25) box.toss = null;
    }
    const best = sess.limit * 1.4;
    const pct = clamp(box.score / best, 0, 1);
    if (primary) {
      sess.pct = pct;
      sess.fam.omega = box.omega;
      sess.fam.otherWay = box.otherWay;
    }
    if (sess.classMode) seat.pct = pct;
  }

  function stepHoop(sess, dt) {
    const many = !!(sess.classMode && sess.seats.length > 1);
    const list = many ? sess.seats : [sess.seats[0]];
    for (let i = 0; i < list.length; i++) {
      const seat = list[i];
      const box = i === 0 ? sess.fam : (seat._hoop || (seat._hoop = { omega: 0, ang: 0, band: 0, out: 0, hoops: 1, caught: 0, drops: 0, score: 0, otherWay: false, toss: null, tossT: 2, haveAng: false }));
      const rng = i === 0 ? sess.rng : (seat._rng || (seat._rng = E.rng((sess.seed + i * 131) >>> 0)));
      stepHoopOne(sess, seat, box, rng, dt, i === 0);
    }
  }

  function stepJog(sess, dt) {
    const fam = sess.fam, seat = sess.seats[0];
    const edgeL = seat.paceL && !fam.prevL;
    const edgeR = seat.paceR && !fam.prevR;
    fam.prevL = seat.paceL; fam.prevR = seat.paceR;
    if (edgeL || edgeR) { fam.steps++; fam.hist.push(fam.t); }
    while (fam.hist.length && fam.t - fam.hist[0] > 1) fam.hist.shift();
    fam.cad = fam.hist.length;
    const lo = G.dev && G.dev.on ? G.dev.v.jogLo : 2.6;
    const hi = G.dev && G.dev.on ? G.dev.v.jogHi : 3.4;
    const zoned = fam.cad >= lo && fam.cad <= hi && fam.stitch <= 0;
    if (zoned) fam.zone += dt;
    if (fam.cad > 4.2) fam.sprint += dt; else fam.sprint = 0;
    if (fam.sprint > 2 && fam.stitch <= 0) fam.stitch = 3;
    if (fam.stitch > 0) fam.stitch -= dt;
    const speed = (G.dev && G.dev.on ? G.dev.v.jogSpeed : 1) * (zoned ? 8 : 3);
    fam.z += speed * dt;
    fam.x += (seat.ux || 0) * 1.6 * dt;
    const cups = [12, 28, 44, 58];
    for (let i = 0; i < cups.length; i++) {
      if (fam.gotCup && fam.gotCup[i]) continue;
      if (fam.z >= cups[i] && fam.z - speed * dt < cups[i]) {
        const cx = (i % 2 ? 0.8 : -0.8);
        if (Math.abs(fam.x - cx) < 0.45) { fam.cups++; fam.gotCup = fam.gotCup || {}; fam.gotCup[i] = true; }
      }
    }
    fam.nextCup = null;
    for (let i = 0; i < cups.length; i++) if (!(fam.gotCup && fam.gotCup[i]) && fam.z < cups[i]) { fam.nextCup = { x: (i % 2 ? 0.8 : -0.8), z: cups[i] }; break; }
    const share = fam.t > 0 ? fam.zone / fam.t : 0;
    sess.pct = clamp(0.7 * share + 0.3 * (fam.cups / fam.cupN), 0, 1);
  }

  function stepSlalom(sess, dt) {
    const fam = sess.fam, seat = sess.seats[0];
    if (fam.done) return;
    if (fam.tumble > 0) { fam.tumble -= dt; return; }
    const base = G.dev && G.dev.on ? G.dev.v.skiSpeed : 220;
    const turn = G.dev && G.dev.on ? G.dev.v.skiTurn : 1.6;
    let spd = base;
    if (seat.uy > 0.3) spd *= 1.35;
    if (seat.uy < -0.3) spd *= 0.6;
    fam.z += spd * dt;
    fam.x += (seat.ux || 0) * 78 * turn / 1.6 * dt;
    const gates = G.GATES;
    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      if (fam.missed[i]) continue;
      if (fam.z >= g.z && fam.z - spd * dt < g.z) {
        fam.missed[i] = Math.abs(fam.x - g.x) > fam.half;
        if (fam.missed[i]) fam.pen += 3;
      }
    }
    for (let i = 0; i < G.OBSTACLES.length; i++) {
      const o = G.OBSTACLES[i];
      if (fam.hitO && fam.hitO[i]) continue;
      if (Math.abs(fam.z - o.z) < 80 && Math.abs(fam.x - o.x) < 16) {
        fam.hitO = fam.hitO || {}; fam.hitO[i] = true; fam.tumble = 1.2; fam.pen += 1.2;
      }
    }
    let next = null;
    for (let i = 0; i < gates.length; i++) if (gates[i].z > fam.z - 20) { next = gates[i]; break; }
    fam.nextGate = next;
    if (fam.z >= fam.finish) {
      fam.done = true;
      const par = 58, worst = 90;
      const time = fam.t + fam.pen;
      sess.pct = clamp((worst - time) / (worst - par), 0, 1);
      sess.ended = true;
    }
  }

  function stepTray(sess, dt) {
    const fam = sess.fam, seat = sess.seats[0];
    if (!seat.bal) {
      seat.bal = new G.Balance({ k: 14, c: 8, s: 1, A: 0.5, nf: 0.8, R: 0.4, push: null }, sess.seed, {});
    }
    const sk = skillName(seat);
    if (sk) {
      const aim = sk === 'poor' ? 0.25 : sk === 'average' ? 0.7 : 0.95;
      seat.ux = aim; seat.uy = 0.02;
    }
    seat.bal.step(dt, seat.ux, seat.uy, 0, 0, { x: 0, y: 0 });
    const Gv = G.dev && G.dev.on ? G.dev.v.trayG : 420;
    const fr = G.dev && G.dev.on ? G.dev.v.trayFric : 3;
    if (fam.world) {
      if (G.dev && G.dev.on && fam.world.bodies) {
        const mu = 0.04 * fr;
        fam.world.bodies.forEach(function (b) { if (b && b._olive) b.friction = mu; });
      }
      if (fam.gecko) fam.gecko.moveTo(78, 100 + Math.sin(fam.t * 0.55) * 36, 0, 22, 0);
      fam.world.gravity = [seat.bal.px * Gv, -seat.bal.py * Gv];
      fam.world.wake();
      fam.world.step(dt);
      const spec = G.TRAYS[fam.trayI];
      const need = spec ? spec.olives.length : 0;
      const gotHere = fam.got - fam.trayGot0;
      if (gotHere >= need) {
        fam.trayI++;
        if (fam.trayI >= G.TRAYS.length) { fam.world = null; sess.ended = true; }
        else loadTray(sess);
      }
    } else if (fam.trayI >= G.TRAYS.length) sess.ended = true;
    const share = sess.limit > 0 ? clamp((sess.limit - fam.t) / sess.limit, 0, 1) : 0;
    const base = fam.total ? fam.got / fam.total : 0;
    sess.pct = sess.ended || fam.t > 1 ? clamp(base * (0.8 + 0.2 * (sess.ended ? share : share)), 0, 1) : base;
    if (sess.ended) sess.pct = clamp(base * (0.8 + 0.2 * share), 0, 1);
  }

  function stepLaundry(sess, dt) {
    const fam = sess.fam, seat = sess.seats[0], bal = seat.bal;
    const skill = skillName(seat);
    if (skill) seat.effort = EFFORT[skill] || 0.5;
    arm(bal, skill);
    const effort = clamp(seat.local && !skill ? leanFor(seat).effort : seat.effort, 0, 1);
    const spd = effort * 2.2;
    if (!fam.rope) fam.rope = Object.assign({}, bal.set);
    /* Faster walking sways the rope. The set on the balance is a copy, so the band table stays put.
       ropeS is the dev slider for that instability. At its default it matches the laundry set. */
    const baseS = G.dev && G.dev.on ? G.dev.v.ropeS : fam.rope.s;
    bal.set = Object.assign({}, fam.rope, { s: baseS + effort * 4 });
    fam.air -= dt;
    const pins = [8, 19, 30, 41, 50];
    let ahead = null;
    for (let i = 0; i < pins.length; i++) {
      const d = pins[i] - fam.x;
      if (d > 0.04) { ahead = { dist: d, x: pins[i] }; break; }
    }
    fam.pinAhead = ahead;
    /* One jump per pin, long enough to land past it. Air freezes the plate, not the walker. */
    if (seat.jump && fam.air <= 0 && ahead && fam.cleared !== ahead.x && ahead.dist < 0.95) {
      fam.air = Math.min(0.85, ahead.dist / Math.max(0.45, spd) + 0.12);
      fam.cleared = ahead.x;
    }
    bal.holdP = fam.air > 0;
    fam.gust -= dt;
    fam.gustT -= dt;
    let fx = 0;
    if (fam.gustT <= 0) { fam.gustT = 4.5; fam.gust = 0.35; fam.gustSign = sess.rng() < 0.5 ? -1 : 1; }
    if (fam.gust > 0 && fam.air <= 0) {
      const g = G.dev && G.dev.on ? G.dev.v.gust : 9;
      fx = fam.gustSign * Math.min(g, 2.4);
    }
    bal.step(dt, seat.ux, seat.uy, fx, 0, { x: 0, y: 0 });
    /* A plate stumble is the rope moving under you. Only missing a pin walks you back to the post.
       The laundry set's average bot cannot stay up for a whole line; the band table says so, and that table stays. */
    let fell = false;
    if (ahead && ahead.dist < 0.18 && fam.air <= 0) fell = true;
    if (fell) { fam.falls++; fam.x = fam.post; fam.cleared = -1; }
    const posts = [0, 18, 36, 55];
    for (let i = 0; i < posts.length; i++) if (fam.x >= posts[i]) fam.post = posts[i];
    if (!fell) fam.x += spd * dt;
    if (fam.x >= fam.len) {
      fam.done = true;
      const par = 58, worst = 95;
      const time = fam.t;
      let pct = time <= par ? 1 : clamp((worst - time) / (worst - par), 0, 1);
      pct = clamp(pct - 0.06 * fam.falls, 0, 1);
      sess.pct = pct;
      sess.ended = true;
    }
  }

  function scoreNow(sess) {
    const act = sess.act, fam = sess.fam;
    if (!fam) return;
    if (act.family === 'hold') {
      sess.seats.forEach(function (q, i) {
        if (!q.bal) return;
        const p = clamp(q.bal.steadiness - 0.05 * q.bal.falls, 0, 1);
        if (i === 0) sess.pct = p;
        if (sess.classMode) q.pct = p;
      });
    }
    if (act.family === 'slalom' && !fam.done) sess.pct = 0;
    if (act.family === 'laundry' && !fam.done) sess.pct = 0;
    if (act.family === 'jog') {
      const share = fam.t > 0 ? fam.zone / fam.t : 0;
      sess.pct = clamp(0.7 * share + 0.3 * (fam.cups / fam.cupN), 0, 1);
    }
  }

  function Session(opts) {
    opts = opts || {};
    this.act = G.ACTS[opts.id] || G.ACTS.stork;
    this.tier = opts.tier || 1;
    this.trial = !!opts.trial;
    this.cheat = !!opts.cheat;
    this.classMode = !!opts.classMode;
    this.seed = (opts.seed || 1) >>> 0;
    this.rng = E.rng(this.seed);
    this.phase = opts.skipToPlay ? 'count' : 'card';
    this.t = 0;
    this.playTime = 0;
    this.limit = opts.limit || this.act.dur[this.tier - 1] || 45;
    if (this.phase === 'count') this.t = 0;
    this.countT = opts.skipToPlay ? 0.4 : 3;
    this.demoT = 3;
    this.pct = 0;
    this.stars = 0;
    this.ended = false;
    this.awarded = false;
    this.seats = opts.seats || [{ name: (G.profile && G.profile.name) || 'You', color: '#ff7a59', local: true, human: true, skill: opts.driver || null }];
    if (opts.driver) this.seats[0].skill = opts.driver;
    this.driver = opts.driver || null;
    this.autoNext = !!opts.autoNext;
    this.fam = null;
    this.line = (G.LINES.tare[this.seed % G.LINES.tare.length]) || '';
    G.subtitle = '';
  }

  Session.prototype.update = function (dt) {
    if (G.driver && G.driver !== 'human') {
      this.driver = G.driver;
      if (this.seats[0] && this.seats[0].local) this.seats[0].skill = G.driver;
    }
    if (this.phase === 'card') {
      G.phase = 'menu'; G.left = 0;
      return;
    }
    if (this.phase === 'demo') {
      this.demoT -= dt;
      G.phase = 'auto'; G.left = Math.max(0, this.demoT);
      if (this.demoT <= 0) { this.phase = 'count'; this.countT = 3; }
      return;
    }
    if (this.phase === 'count') {
      this.countT -= dt;
      G.phase = 'auto'; G.left = Math.max(0, this.countT);
      if (this.countT <= 0) { this.phase = 'play'; this.playTime = 0; this.ended = false; beginFamily(this); }
      return;
    }
    if (this.phase === 'play') {
      G.phase = 'play';
      this.playTime += dt;
      stepFamily(this, dt);
      G.left = Math.max(0, this.limit - this.playTime);
      const timed = this.act.family !== 'rep' && this.act.family !== 'slalom' && this.act.family !== 'laundry' && this.act.family !== 'tray' && this.act.family !== 'step';
      if (this.ended || this.playTime >= this.limit || (timed && this.playTime >= this.limit)) this.finish();
      if (this.act.family === 'step' && this.fam && this.fam.rh && this.fam.rh.done) this.finish();
      if (this.act.family === 'rep' && this.ended) this.finish();
      if (this.act.family === 'slalom' && (this.ended || this.playTime >= this.limit)) this.finish();
      if (this.act.family === 'laundry' && (this.ended || this.playTime >= this.limit)) this.finish();
      if (this.act.family === 'tray' && (this.ended || this.playTime >= this.limit)) this.finish();
      if (this.act.family === 'candle' && this.fam && this.fam.dead) this.finish();
      return;
    }
    if (this.phase === 'results') { G.phase = 'menu'; G.left = 0; }
  };

  Session.prototype.finish = function () {
    if (this.phase === 'results') return;
    scoreNow(this);
    if (this.act.family === 'slalom' && this.fam && !this.fam.done) this.pct = 0;
    if (this.act.family === 'laundry' && this.fam && !this.fam.done) this.pct = 0;
    this.pct = clamp(this.pct || 0, 0, 1);
    this.stars = G.starsOf(this.pct, this.act.stars);
    this.phase = 'results';
    G.phase = 'menu'; G.left = 0;
    if (this.classMode) {
      this.seats.forEach(function (q) {
        const sk = skillName(q);
        let p = typeof q.pct === 'number' ? q.pct : this.pct;
        if (q.scoring === false) p = 0;
        else if (!q.local && !sk && !(q.human && q.moved)) p = 0;
        else if (q.human && !q.local) p = q.moved ? p : 0;
        q.pct = p;
        q.score = q.scoring === false ? 0 : clamp(Math.round(p * 1000), 0, 1000);
      }, this);
    } else {
      this.seats.forEach(function (q) { q.pct = this.pct; q.score = clamp(Math.round(this.pct * 1000), 0, 1000); }, this);
    }
    if (!this.trial && !G.attracting && !G.inSession) G.award(this.act.id, this.tier, this.stars, this.pct);
    try {
      const n = this.stars;
      G.sting(n >= 3 ? 'star3' : n === 2 ? 'star2' : n === 1 ? 'star1' : null);
    } catch (e) { /* quiet */ }
  };

  Session.prototype.begin = function () { if (this.phase === 'card') { this.phase = 'demo'; this.demoT = 3; } };
  Session.prototype.again = function () {
    const id = this.act.id, tier = this.tier, trial = this.trial, driver = this.driver, limit = this.limit, seats = this.seats, classMode = this.classMode, seed = (this.seed + 1) >>> 0;
    const next = new Session({ id: id, tier: tier, trial: trial, driver: driver, limit: limit, seats: seats, classMode: classMode, seed: seed, skipToPlay: false, cheat: this.cheat });
    G.session = next;
  };

  G.Session = Session;
  G.skillName = skillName;

  G.drawActivity = function (r, sess) {
    if (!r || !sess) return;
    const fam = sess.fam;
    G.paintRoom(r, sess.act && sess.act.id === 'slalom' ? 'dusk' : 'day');
    if (sess.phase === 'play' || sess.phase === 'results' || sess.phase === 'demo' || sess.phase === 'count') {
      try {
        if (!sess._rig && G.makeRig) {
          const look = G.lookColors ? G.lookColors(G.profile) : null;
          sess._rig = G.makeRig(G.playerOpts(look, 2.1));
        }
        if (sess._rig && (sess.phase === 'play' || sess.phase === 'demo')) {
          const pose = sess.act.family === 'sun' ? G.SUN_POSES[(fam && fam.poseI) || 0] : sess.act.pose;
          if (sess.phase === 'demo') G.poseRig(sess._rig, pose || 'idle', sess.demoT, [0, 0]);
          else if (fam && sess.seats[0].bal) {
            const b = sess.seats[0].bal;
            sess._rig.wob = [b.py, b.px];
            if (sess.act.family === 'lunge' || sess.act.id === 'lunge') sess._rig.body = G.sideLunge(b.px);
            else if (sess.act.id === 'hoop') sess._rig.body = G.hula(fam.ang || 0);
            else G.poseRig(sess._rig, pose || 'idle', fam.t, [b.py, b.px]);
          }
          G.stepRig(sess._rig, DT, 0, 0);
          r.actor(0, 8, 0, function (g, ox, oy) { sess._rig.draw(g, ox, oy, r.view); G.drawJoints(g, sess._rig, ox, oy); });
        }
      } catch (e) { /* a painted room still reads */ }
    }
    r.overlay(function (g) {
      const W = r.W, H = r.H;
      if (sess.phase === 'card') {
        G.text(g, sess.act.name, W / 2, 28, '#20404c', 2, 'center');
        G.text(g, sess.act.blurb, 16, 52, '#20404c', 1, 'left');
        const gates = sess.act.stars;
        G.text(g, 'Stars  ' + gates[0] + '   ' + gates[1] + '   ' + gates[2], 16, 78, '#5f7f8a', 1);
        const best = G.bestText ? G.bestText(sess.act.id, sess.tier) : '';
        if (best) G.text(g, best, 16, 94, '#14a8c8', 1);
        G.text(g, 'Tier ' + sess.tier, W - 70, 28, '#14a8c8', 1);
      } else if (sess.phase === 'demo') {
        G.text(g, sess.line, 16, 36, '#20404c', 1);
        G.text(g, 'Watch', W / 2, H / 2 - 20, '#14a8c8', 2, 'center');
      } else if (sess.phase === 'count') {
        const n = Math.max(1, Math.ceil(sess.countT));
        E.font.title(g, String(n), W / 2, H / 2 - 20, { scale: 4, align: 'center', colors: ['#ffffff', '#8fd3f4', '#14a8c8'] });
        G.text(g, 'Breathe in', W / 2, H / 2 + 18, '#20404c', 1, 'center');
      } else if (sess.phase === 'results') {
        G.text(g, sess.act.name, W / 2, 24, '#20404c', 2, 'center');
        G.drawStars(g, W / 2 - 18, 48, sess.stars);
        G.text(g, Math.round(sess.pct * 100) + '%', W / 2, 70, '#20404c', 2, 'center');
        const remark = (G.LINES.stars[sess.stars] || G.LINES.stars[0])[0];
        G.text(g, remark, 12, 96, '#20404c', 1);
      } else if (fam) {
        G.text(g, sess.act.name, 8, 6, '#20404c', 1);
        G.text(g, Math.ceil(Math.max(0, sess.limit - sess.playTime)) + 's', W - 36, 6, '#5f7f8a', 1);
        if (sess.act.family === 'hoop') {
          const label = Math.abs(fam.omega) < 7 ? 'Too slow' : Math.abs(fam.omega) > 11 ? 'Too eager' : 'Just right';
          G.text(g, label, W / 2, 24, '#14a8c8', 1, 'center');
          if (fam.otherWay) G.text(g, 'Other way!', W / 2, 40, '#e0553a', 1, 'center');
        }
        if (sess.act.family === 'jog') G.text(g, 'Cadence ' + fam.cad.toFixed(1), 8, 20, '#20404c', 1);
        if (sess.act.family === 'candle') G.text(g, 'Flame ' + Math.round(fam.flame * 100), 8, 20, '#e0553a', 1);
        if (sess.act.family === 'slalom') G.text(g, 'Time ' + (fam.t + fam.pen).toFixed(1), 8, 20, '#20404c', 1);
        if (G.subtitle) G.text(g, G.subtitle, 8, H - 52, '#20404c', 1);
      }
    });
    if (sess.phase === 'play' && sess.seats[0].bal) {
      const hide = sess.act.id === 'stork' && sess.tier >= 2;
      G.drawPlate(r, sess.seats[0].bal, { hide: hide, c: fam && fam.c, trace: G.dev && G.dev.trace });
    }
    if (sess.phase === 'play' && fam && fam.rh && fam.rh.draw) {
      try { fam.rh.draw(r, { arrows: true, y: r.H - 78, len: 90 }); } catch (e) { /* highway can sit this one out */ }
    }
    if (sess.phase === 'play') G.prompt(null, r, 'lean', '');
  };
})();
