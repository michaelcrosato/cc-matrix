// The eight tools' gestures, one per tool, on the sim's plain state. A press is trig crossing .3; analog gives control, never power.
(() => {
const G = (window.GAME ||= {}), { clamp, ev, polyNearest, polyAt, segDist } = G, T = G.T;
const O = o => G.OBJ[o.type];
const tolAdd = (S, p) => (S.doc === 'soko' ? 1 : 0) + (p.tolPlus || 0);
const nearest = (S, x, y, r, f) => { let best = null, bd = r; for (const o of S.objs) if (!o.dead && f(o)) { const a = (O(o).aim ? O(o).aim(o, S) : [o.x, o.y]), d = Math.hypot(a[0] - x, a[1] - y); if (d < bd) { bd = d; best = o; } } return best; };
const nerveCheck = (S, p, x, y) => { if (p.nerveT > 0) return; for (const o of S.objs) if (o.type === 'nerve' && !o.dead) { const [, d] = polyNearest(o.pts, x, y); if (d < 3.5) { p.nerveT = .9; G.slip(S, p, x, y, 12, 'nerve'); return; } } };

const forceps = {
  step(S, p, press, down, rel, h) {
    if (!p.hold) { if (press) {
      const o = nearest(S, p.x, p.y, 12 + tolAdd(S, p), q => G.canTouch(S, q) && (q.pull || O(q).grip) && (!O(q).canGrip || O(q).canGrip(q, S)));
      if (o) { const d = O(o); if (d.gripGate && !d.gripGate(o, S, p)) return; if (d.grip) { if (d.grip(o, S, p)) G.didVerb(S, 'grip'); return; } p.hold = { k: 'pull', id: o.id, gx: p.x, gy: p.y, p0: o.pull.prog, last: 0, v: 0 }; ev(S, 'grip', Math.round(o.x), Math.round(o.y)); } } return; }
    const o = G.getObj(S, p.hold.id); if (!o) { p.hold = null; return; } const d = O(o);
    if (rel || !down) { if (d.release) d.release(o, S, p); else releasePull(S, p, o); p.hold = null; p.tension = 0; return; }
    if (d.held) d.held(o, S, p, h); else heldPull(S, p, o, h);
  },
};
function heldPull(S, p, o, h) { const P = o.pull, H = p.hold; P.t += h; if (P.free) { o.x = p.x; o.y = p.y; p.tension = 0; return; }
  const ax = Math.cos(P.a), ay = Math.sin(P.a), dx = p.x - H.gx, dy = p.y - H.gy, along = dx * ax + dy * ay, off = Math.abs(-dx * ay + dy * ax), v = (along - H.last) / h; H.last = along; H.v = H.v * .86 + v * .14; const lim = P.maxV * T.gradeTol; p.tension = clamp(H.v / lim, 0, 1.3);
  if (H.v > lim || off > P.off * T.gradeTol + 2 + S.assistTol) { P.tears++; G.slip(S, p, o.x, o.y, 4, 'tear'); ev(S, 'tear', Math.round(o.x), Math.round(o.y)); G.addLac(S, o.x + 8, o.y + 6); P.prog *= .7; o.x = o.bx + ax * P.prog; o.y = o.by + ay * P.prog; p.hold = null; p.tension = 0; return; }
  const np = H.p0 + Math.max(0, along); if (np > P.prog) { P.prog = np; o.x = o.bx + ax * P.prog; o.y = o.by + ay * P.prog; if (O(o).pulling) O(o).pulling(o, S, p); }
  if (P.prog >= P.depth) { P.free = true; ev(S, 'free', Math.round(o.x), Math.round(o.y)); if (O(o).onFree) O(o).onFree(o, S, p); } }
function releasePull(S, p, o) { const P = o.pull; if (!P.free) return; if (Math.hypot(o.x - o.bx, o.y - o.by) >= 24 || !G.inCavity(o.x, o.y)) caught(S, p, o); else { P.loose = true; ev(S, 'dropit', Math.round(o.x), Math.round(o.y)); } }
function caught(S, p, o) { const P = o.pull, g = P.tears === 0 && P.t <= P.par * (1 + (T.gradeTol - 1)) ? 'textbook' : P.tears <= 1 ? 'clean' : 'sloppy'; G.grade(S, p, o.x, o.y, g, 'forceps'); ev(S, 'clink', Math.round(o.x), Math.round(o.y)); if (O(o).caught) O(o).caught(o, S, p); G.kill(S, o); }
G.caughtObj = caught;

const scalpel = {
  step(S, p, press, down, rel, h) {
    const seg = Math.hypot(p.x - p.lastX, p.y - p.lastY);
    if (p.hold) { const o = G.getObj(S, p.hold.id); if (!o) { p.hold = null; return; } if (!down) { p.hold = null; return; }
      const [s, d] = polyNearest(o.pts, p.x, p.y, Math.max(0, o.prog - 5), o.prog + 24), tol = 9 * T.gradeTol + S.assistTol;
      if (d <= tol) { p.hold.off = 0; p.hold.slipped = false; if (s > o.prog) { const ds = s - o.prog;
          if (o.between && G.beatHot(S) && !p.hold.bs) { p.hold.bs = true; G.slip(S, p, p.x, p.y, 3, 'beat'); }
          else if (!G.beatHot(S)) p.hold.bs = false;
          if (!(o.between && G.beatHot(S))) { o.prog = s; o.sum += d * ds; o.n += ds; ev2(S, p, 'cutting', ds); } }
        if (o.prog >= o.len - 2) finishCut(S, p, o); }
      else { p.hold.off += h; if (p.hold.off >= .12 && !p.hold.slipped) { p.hold.slipped = true; G.slip(S, p, p.x, p.y, 3, 'lac'); G.addLac(S, p.x, p.y); } }
      nerveCheck(S, p, p.x, p.y); return; }
    if (press) { const o = nearest(S, p.x, p.y, (p.resume ? 8 : 8) + tolAdd(S, p) + S.assistTol, q => q.type === 'guide' && G.canTouch(S, q)); if (o) { p.hold = { k: 'cut', id: o.id, off: 0 }; ev(S, 'cutstart', Math.round(p.x), Math.round(p.y)); p.drag = 0; return; } p.drag = 0; }
    if (down) { nerveCheck(S, p, p.x, p.y);
      let any = false, hit = false; for (const o of S.objs) if (!o.dead && O(o).slashable && O(o).slashable(o, S)) { if (!G.canTouch(S, o)) continue; any = true; if (p.spd >= 60 && segDist(p.lastX, p.lastY, p.x, p.y, o.x, o.y) < (o.r || 7) + 2) { O(o).slash(o, S, p); ev(S, 'slash', Math.round(o.x), Math.round(o.y)); hit = true; } }
      if (!any && !hit) { let guideNear = false; for (const q of S.objs) if (q.type === 'guide' && !q.dead) guideNear = true; p.drag += seg; if (p.drag >= (guideNear ? 14 : 6)) { p.drag = -30; G.slip(S, p, p.x, p.y, 3, 'lac'); G.addLac(S, p.x, p.y); } } }
    else p.drag = 0;
  },
};
const ev2 = (S, p, k, ds) => { p.cutting = .1; };
function finishCut(S, p, o) { const mean = o.n ? o.sum / o.n : 0, tol = T.gradeTol, g = mean <= 1.8 * tol ? 'textbook' : mean <= 4 * tol ? 'clean' : 'sloppy'; G.grade(S, p, p.x, p.y, g, 'scalpel'); p.hold = null; if (o.link !== undefined) { const q = G.getObj(S, o.link); if (q && O(q).linked) O(q).linked(q, S, o, p); } ev(S, 'cutdone', Math.round(p.x), Math.round(p.y)); if (o.after) for (const sp of o.after) G.spawn(S, sp); G.kill(S, o); if (o.flag) S.flags[o.flag] = true; }

const stitchable = (S, q) => q.st && q.si < q.st.length && G.canTouch(S, q);
const suture = {
  step(S, p, press, down, rel, h) {
    if (!p.hold) { if (press) { let best = null, bd = 9 + tolAdd(S, p) + S.assistTol, flip = false; for (const o of S.objs) if (!o.dead && stitchable(S, o)) { const q = G.stPts(o, S, o.si), a = Math.hypot(q[0] - p.x, q[1] - p.y), b = Math.hypot(q[2] - p.x, q[3] - p.y); if (a < bd) { bd = a; best = o; flip = false; } if (b < bd) { bd = b; best = o; flip = true; } }
        if (best) { p.hold = { k: 'stitch', id: best.id, i: best.si, t: 0, flip }; ev(S, 'needle', Math.round(p.x), Math.round(p.y)); } } return; }
    const o = G.getObj(S, p.hold.id); if (!o) { p.hold = null; return; } p.hold.t += h;
    if (!down) { const q = G.stPts(o, S, p.hold.i), fx = p.hold.flip ? q[0] : q[2], fy = p.hold.flip ? q[1] : q[3], tol = 6 * T.gradeTol + tolAdd(S, p) + S.assistTol; const d = Math.hypot(fx - p.x, fy - p.y), t = p.hold.t; p.hold = null;
      if (d > tol || (o.between && G.beatHot(S))) { G.hurt(S, 1 * T.slipX); S.flow = 0; S.slips += 0; ev(S, 'loose', Math.round(p.x), Math.round(p.y)); return; }
      const g = t <= .6 * T.gradeTol ? 'textbook' : t <= 1.2 * T.gradeTol ? 'clean' : 'sloppy'; o.si++; o.times.push(g === 'textbook' ? 2 : g === 'clean' ? 1 : 0); p.stats.stitches++; ev(S, 'stitch', Math.round(fx), Math.round(fy), g, o.id); G.grade(S, p, fx, fy, g, 'suture', 6); S.marks.push(['st', Math.round(q[0]), Math.round(q[1]), Math.round(q[2]), Math.round(q[3])]);
      if (o.si >= o.st.length) { const m = o.times.reduce((a, b) => a + b, 0) / o.times.length, wg = m >= 1.6 ? 'textbook' : m >= .8 ? 'clean' : 'sloppy'; G.grade(S, p, o.x, o.y, wg, 'wound'); S.marks.push(['scar', Math.round(o.x), Math.round(o.y), o.a || 0, o.len || 22]); if (O(o).closed) O(o).closed(o, S, p); G.kill(S, o); } }
  },
};
const salve = {
  step(S, p, press, down, rel, h) { if (!down) return; p.salving = true;
    for (const o of S.objs) { if (o.dead || !o.cov || !G.canTouch(S, o) || (O(o).salveOk && !O(o).salveOk(o, S))) continue; const R = o.r, dx = p.x - o.x, dy = p.y - o.y; if (Math.hypot(dx, dy) > R + 10) continue; if (!o.st0) o.st0 = S.ht;
      const N = o.covW; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; if (o.cov[k]) continue; const cx = o.x + (i + .5) * 4 - R, cy = o.y + (j + .5) * 4 - R; if (Math.hypot(cx - p.x, cy - p.y) <= 10 + S.assistTol) { o.cov[k] = 1; o.covN++; } }
      if (o.covN >= o.covTotal * .9) { const t = S.ht - o.st0; G.heal(S, 2); ev(S, 'healed', Math.round(o.x), Math.round(o.y)); G.grade(S, p, o.x, o.y, t <= .5 + R * .05 ? 'textbook' : 'clean', 'salve', 5); if (O(o).salved) O(o).salved(o, S, p); else G.kill(S, o); } }
  },
};
const syringe = {
  step(S, p, press, down, rel, h) { if (p.coolT > 0) { p.fill = 0; return; }
    if (down) { if (p.fill < 1) p.fill = Math.min(1, p.fill + h / .55); else p.overT += h; return; }
    if (rel && p.fill > .05) { const f = p.fill, over = p.overT; p.fill = 0; p.overT = 0; p.coolT = .35;
      const o = nearest(S, p.x, p.y, 10 + tolAdd(S, p) + S.assistTol, q => q && O(q).dosed && (q.dose !== false) && G.canTouch(S, q) && (!O(q).doseOk || true));
      if (o) { const g = over >= .3 ? 'sloppy' : f >= .9 ? 'textbook' : 'clean', half = over >= .3; ev(S, 'inject', Math.round(o.x), Math.round(o.y)); O(o).dosed(o, S, p, g, half); return; }
      if (!S.noIV) G.heal(S, S.diff.iv * f * T.syringeDose); ev(S, 'iv', f); G.didVerb(S, 'iv'); S.flags.iv = (S.flags.iv || 0) + 1; } else if (!down) { p.fill = 0; p.overT = 0; }
  },
};
const cautery = {
  step(S, p, press, down, rel, h) { if (p.lockT > 0) { p.firing = false; return; } p.firing = down; if (!down) { p.bareT = 0; p.bareSlip = false; p.burnHeat = false; return; }
    p.heat += T.cauteryHeat * h; if (p.heat >= 1) { p.heat = 1; p.lockT = 1.2; p.burnLocked = true; ev(S, 'lock', Math.round(p.x), Math.round(p.y)); return; }
    nerveCheck(S, p, p.x, p.y);
    let hit = null, bd = 9 + tolAdd(S, p) + S.assistTol; for (const o of S.objs) if (!o.dead && o.burn > 0 && G.canTouch(S, o) && (!O(o).burnOk || O(o).burnOk(o, S))) { const d = Math.hypot(o.x - p.x, o.y - p.y) - (o.r || 0); if (d < bd) { bd = d; hit = o; } }
    if (hit) { const k = G.CHEATS.oneHit ? 99 : 1; if (hit.burn0 === hit.burn) { p.burnClean = true; } hit.burn -= h * k; p.bareT = 0; p.hitting = hit.id; if (p.burnedBare) p.burnClean = false;
      if (hit.burn <= 0) { const g = p.burnClean && !p.burnLocked ? 'textbook' : 'clean'; p.stats.burns++; ev(S, 'burned', Math.round(hit.x), Math.round(hit.y)); if (O(hit).burned) O(hit).burned(hit, S, p, g); else { G.grade(S, p, hit.x, hit.y, g, 'cautery'); G.kill(S, hit); } p.burnLocked = false; p.burnedBare = false; } return; }
    p.hitting = 0; p.bareT += h; if (p.bareT > .25) { p.burnedBare = true; G.hurt(S, .8 * h); if (!p.charAt || Math.hypot(p.charAt[0] - p.x, p.charAt[1] - p.y) > 6) { p.charAt = [p.x, p.y]; S.marks.push(['char', Math.round(p.x), Math.round(p.y)]); if (S.marks.length > 200) S.marks.shift(); } }
    if (p.bareT > .6 && !p.bareSlip) { p.bareSlip = true; G.slip(S, p, p.x, p.y, 1, 'char'); }
  },
};
const suction = {
  step(S, p, press, down, rel, h) { p.sucking = 0; if (!down) return; for (const o of S.objs) if (o.type === 'pool' && !o.dead && !G.inDome(S, o.x, o.y)) { const R = G.poolR(o); if (Math.hypot(o.x - p.x, o.y - p.y) < 14 + R * .8 + S.assistTol) { const n = Math.min(o.vol, T.suctionRate * h); o.vol -= n; p.stats.suction += n; p.sucking = o.vol; G.didVerb(S, 'suction'); o.x += (p.x - o.x) * h * .5; o.y += (p.y - o.y) * h * .5; if (o.vol <= 2) { ev(S, 'drained', Math.round(o.x), Math.round(o.y)); G.kill(S, o); } break; } } },
};
const sonar = {
  step(S, p, press, down, rel, h) { p.sonar = down; if (!down) { p.near = 0; return; } const R = 38 * (S.doc === 'vale' ? 1.25 : 1); let near = 0; for (const o of S.objs) { if (o.dead || !o.hidden) continue; const d = Math.hypot(o.x - p.x, o.y - p.y); near = Math.max(near, 1 - d / 150); if (d < R) { if (!(o.mark > 0)) { ev(S, 'marked', Math.round(o.x), Math.round(o.y)); G.didVerb(S, 'sonar'); if (O(o).marked) O(o).marked(o, S); } o.mark = o.stayMarked ? 9e9 : 4; } } p.near = Math.max(0, near); },
};
G.TOOL_FN = { forceps, scalpel, suture, salve, syringe, cautery, suction, sonar };
const releaseHold = (S, p) => { if (!p.hold) return; const o = G.getObj(S, p.hold.id); if (o && p.hold.k === 'pull' && o.pull && !O(o).release) releasePull(S, p, o); else if (o && O(o).release && p.hold.k !== 'cut' && p.hold.k !== 'stitch') O(o).release(o, S, p); p.hold = null; p.tension = 0; };
G.releaseHold = releaseHold;
G.toolStep = (S, p, inp, dt) => {
  p.lastX = p.x; p.lastY = p.y; p.x = inp.x; p.y = inp.y; const seg = Math.hypot(p.x - p.lastX, p.y - p.lastY); p.spd = p.spd * .8 + (seg / dt) * .2;
  if (p.nerveT > 0) p.nerveT -= dt; if (p.coolT > 0) p.coolT -= dt; if (p.lockT > 0) { p.lockT -= dt; if (p.lockT <= 0) p.heat = .4; }
  if (p.tool !== 'cautery' || !p.firing) p.heat = Math.max(0, p.heat - .6 * dt);
  p.firing = false; p.salving = false; p.sucking = 0; p.sonar = false; p.cutting = Math.max(0, (p.cutting || 0) - dt);
  if (inp.tool && inp.tool !== p.toolNext) { releaseHold(S, p); p.toolNext = inp.tool; p.swapT = .12; ev(S, 'swap', inp.tool, p.id); }
  if (p.swapT > 0) { p.swapT -= dt; p.trigPrev = 0; if (p.swapT <= 0) p.tool = p.toolNext; return; }
  if (inp.cancel) { releaseHold(S, p); p.fill = 0; p.overT = 0; }
  const down = inp.trig >= .3, press = down && p.trigPrev < .3, rel = !down && p.trigPrev >= .3; p.trigPrev = inp.trig;
  if (G.inDome(S, p.x, p.y)) { if (p.hold) releaseHold(S, p); p.inDome = true; return; } p.inDome = false;
  G.TOOL_FN[p.tool].step(S, p, press, down, rel, dt);
};
})();
