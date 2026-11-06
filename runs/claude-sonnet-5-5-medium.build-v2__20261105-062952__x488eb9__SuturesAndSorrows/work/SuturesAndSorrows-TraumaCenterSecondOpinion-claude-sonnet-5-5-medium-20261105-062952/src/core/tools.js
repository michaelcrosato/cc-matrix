// The eight tools. Each is a gesture on the sim's state; grades come from the gesture, not from luck.
(() => {
const G = (window.GAME ||= {}), T = G.T, Op = G.Op, OBJ = G.OBJ, { clamp, hyp } = G.OpHelpers, geo = G.geo, ev = Op.ev;
const down = p => p.trig > .3, pressed = p => p.trig > .3 && p.pt <= .3, released = p => p.trig <= .3 && p.pt > .3;
const tol = () => T('tol');
const spd = p => hyp(p.vx, p.vy);
Op.tool = (S, p, dt, def) => {
  if (p.swap > 0) p.swap -= dt; if (p.cd > 0) p.cd -= dt;
  // cautery heat cools whenever it isn't firing
  if (!(p.tool === 'cautery' && down(p))) { p.heat = Math.max(0, p.heat - .6 * dt); } if (p.lock > 0) { p.lock -= dt; }
  p.son = p.tool === 'sonar' && down(p) ? { x: p.x, y: p.y, r: 38 * (S.doc === 'vale' && def.consult ? 1.25 : 1) } : null;
  p.suck = false; p.fire = false;
  if (p.cancel && p.g) { Op.drop(S, p); }
  if (p.swap > 0 && p.g == null) { return; }
  if (Op.domeAt && Op.domeAt(S, p.x, p.y)) { if (p.g && p.g.k !== 'grip') p.g = null; return; }
  const f = TOOLFN[p.tool]; if (f) f(S, p, dt);
  if (!down(p) && p.tool !== 'syringe' && p.g && p.g.k !== 'cut' && p.g.k !== 'grip' && p.g.k !== 'st') p.g = null;
};
Op.drop = (S, p) => { const g = p.g; if (g && g.k === 'grip') { const o = Op.byId(S, g.id); if (o) { o.prog = 0; o.free = false; o.x = o.x0; o.y = o.y0; } } p.g = null; };
const TOOLFN = {};
// ---------------- Forceps
TOOLFN.forceps = (S, p, dt) => {
  if (pressed(p) && !p.g) {
    const o = Op.near(S, p.x, p.y, 12 * (1 + (T('assist') - .6) * .3), o => OBJ[o.type].grip && OBJ[o.type].grip(S, o));
    if (o) { p.g = { k: 'grip', id: o.id, tears: 0, t0: S.rt, ang: Math.atan2(p.y - o.y, p.x - o.x), turns: 0, ox: p.x, oy: p.y }; ev(S, 'grip', o.x, o.y); }
  }
  const g = p.g; if (!g || g.k !== 'grip') return;
  const o = Op.byId(S, g.id); if (!o || o.done) { p.g = null; return; }
  const sp = OBJ[o.type];
  if (!down(p)) { // release
    if (o.free) { if (sp.release) sp.release(S, o, p, g); else Op.catchObj(S, o, p, g); }
    else { if (sp.letgo) sp.letgo(S, o, p, g); o.prog = Math.max(0, o.prog * .5); if (o.ax) { o.x = o.x0 + o.ax[0] * o.prog; o.y = o.y0 + o.ax[1] * o.prog; } }
    p.g = null; return;
  }
  if (o.free) { o.x = p.x; o.y = p.y; if (sp.carry) sp.carry(S, o, p, dt); return; }
  if (sp.hold) return;
  if (sp.rot) { // turn the stick or mouse around the object
    const a = Math.atan2(p.y - o.y, p.x - o.x); let d = a - g.ang; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; g.ang = a; if (hyp(p.x - o.x, p.y - o.y) > 6) { o.prog += Math.abs(d) / 6.283 / o.turns; o.spin = (o.spin || 0) + d; } if (o.prog >= 1) { o.free = true; o.prog = 1; ev(S, 'free', o.x, o.y); } return;
  }
  const ax = o.ax || [1, 0], rel = (p.x - o.x0) * ax[0] + (p.y - o.y0) * ax[1], lat = Math.abs(-(p.x - o.x0) * ax[1] + (p.y - o.y0) * ax[0]), pull = rel - o.prog;
  const limit = (o.maxSpeed || 120) * tol(), s = spd(p);
  if (rel > o.prog) {
    if (s > limit || lat > 8 * tol() || (o.barbed && !o.cut)) { // tear
      if (!(p.tearCd > S.rt)) { p.tearCd = S.rt + .4; g.tears++; o.prog = Math.max(0, o.prog * .7 - 2); Op.slip(S, p, o.x, o.y, o.tearDmg || 4, 'tear'); ev(S, 'tear', o.x, o.y); if (sp.onTear) sp.onTear(S, o, p); }
    } else { o.prog = Math.min(o.depth, rel); }
  }
  o.x = o.x0 + ax[0] * o.prog; o.y = o.y0 + ax[1] * o.prog; o.tens = clamp(s / limit, 0, 1.5);
  if (sp.pulling) sp.pulling(S, o, p, dt);
  if (o.prog >= o.depth && !o.free && !o.held) { o.free = true; ev(S, 'free', o.x, o.y); }
};
Op.catchObj = (S, o, p, g) => {
  const far = hyp(o.x - o.x0, o.y - o.y0) >= 24 || !Op.inCav(o.x, o.y, 4);
  const zone = S.zones.find(z => hyp(z.x - o.x, z.y - o.y) < z.r);
  if (zone && OBJ[o.type].zoneOK) { OBJ[o.type].zoneOK(S, o, p, g, zone); return; }
  if (!far && !OBJ[o.type].catchAnywhere) { // dropped too near: it settles back
    o.free = false; o.prog = Math.max(0, o.depth - 14); o.x = o.x0 + (o.ax ? o.ax[0] * o.prog : 0); o.y = o.y0 + (o.ax ? o.ax[1] * o.prog : 0); ev(S, 'drop', o.x, o.y); return;
  }
  const par = o.par || 3, took = S.rt - g.t0, grade = g.tears === 0 && took <= par ? 'Textbook' : g.tears <= 1 ? 'Clean' : 'Sloppy';
  o.done = true; ev(S, 'caught', o.x, o.y, o.type); Op.award(S, p, o.x, o.y, grade, o.pts || 100); if (OBJ[o.type].onDone) OBJ[o.type].onDone(S, o, p, grade);
};
// ---------------- Scalpel
TOOLFN.scalpel = (S, p, dt) => {
  const s = spd(p);
  if (pressed(p) && !p.g) {
    for (const c of S.objs) if ((c.type === 'incision' || c.type === 'spiral') && !c.cut && Op.visible(S, c)) {
      const head = geo.polyAt(c.pts, c.prog), st = hyp(p.x - head[0], p.y - head[1]);
      if (st < (c.prog > 0 ? 6 : 8) * tol() + (T('assist') - .6) * 2) { p.g = { k: 'cut', id: c.id, off: 0, t0: S.rt, dsum: 0, dn: 0, rec: c.prog > 0 }; ev(S, 'cutstart', head[0], head[1]); break; }
    }
  }
  const g = p.g;
  if (g && g.k === 'cut') {
    const o = Op.byId(S, g.id); if (!o || o.cut || !down(p)) { if (g) { if (o && !down(p)) o.stroke = false; } p.g = (o && !o.cut && down(p)) ? g : null; if (!down(p)) p.g = null; return; }
    const nr = geo.polyNear(o.pts, p.x, p.y), L = o.len; o.stroke = true;
    // guide-follow: the part of the push across the guide is already scaled in Cursor; here the tracing is judged
    if (o.spiral && !G.beatWindow(S)) { if (s > 10 && !(p.spCd > S.rt)) { p.spCd = S.rt + .5; Op.slip(S, p, p.x, p.y, 3, 'onbeat'); } }
    else if (nr.s <= o.prog + 14) { if (nr.s > o.prog) { o.prog = Math.min(L, nr.s); } }
    g.dsum += nr.d * dt; g.dn += dt;
    if (nr.d > 9 * tol()) { g.off += dt; if (g.off >= .12) { g.off = -.5; o.slips = (o.slips || 0) + 1; Op.slip(S, p, p.x, p.y, 3, 'slip'); ev(S, 'cutslip', p.x, p.y); } } else if (g.off > 0) g.off = Math.max(0, g.off - dt * 2); else if (g.off < 0) g.off += dt;
    ev2(S, 'cutting', p.x, p.y, s);
    if (o.prog >= L - 2) { const mean = g.dsum / Math.max(.05, g.dn), grade = mean <= 1.8 * tol() && !o.slips ? 'Textbook' : mean <= 4 * tol() ? 'Clean' : 'Sloppy'; o.cut = true; o.done = !o.slur; (S.cuts ||= []).push({ pts: o.pts, ring: !!o.ring }); if (o.ring) o.cutDone = true; ev(S, 'cutdone', p.x, p.y); Op.award(S, p, p.x, p.y, grade, o.pts || 120); if (OBJ.incision.onDone) OBJ.incision.onDone(S, o); p.g = null; }
    return;
  }
  // slash targets: any stroke crossing at >=60 u/s
  if (down(p) && s >= 60 && p.px != null) {
    for (const o of S.objs) { const sp = OBJ[o.type]; if (!sp.slash || !Op.visible(S, o) || o.cut) continue; if (!sp.slash(S, o)) continue; const [qx, qy] = geo.ptSeg(o.x, o.y, p.px, p.py, p.x, p.y); if (hyp(qx - o.x, qy - o.y) <= (o.sr || 9)) { o.cut = true; ev(S, 'slash', o.x, o.y); if (sp.onSlash) sp.onSlash(S, o, p); else Op.award(S, p, o.x, o.y, s > 90 ? 'Textbook' : 'Clean', 100); } }
  }
  // nerves: crossing costs 12 and always counts as a slip
  if (down(p)) for (const o of S.objs) if (o.type === 'nerve' && !o.done && geo.polyNear(o.pts, p.x, p.y).d < 4) { if (!(p.nerveCd > S.rt)) { p.nerveCd = S.rt + 1; Op.slip(S, p, p.x, p.y, 12, 'nerve'); S.learn = false; } }
  // dragging the blade over healthy tissue with no guide
  if (down(p) && !p.g && !S.learn) { const onSomething = S.objs.some(o => Op.visible(S, o) && (o.type === 'incision' || OBJ[o.type].slash) && (Array.isArray(o.pts) ? geo.polyNear(o.pts, p.x, p.y).d : hyp(o.x - p.x, o.y - p.y)) < 22); if (!onSomething && p.px != null) { p.drag += hyp(p.x - p.px, p.y - p.py); if (p.drag > 6 && !(p.dragCd > S.rt)) { p.dragCd = S.rt + .8; p.drag = 0; Op.slip(S, p, p.x, p.y, 2, 'healthy'); } } } else p.drag = 0;
};
const ev2 = (S, ...a) => { S.ev.push(a); if (S.ev.length > 400) S.ev.length = 400; };
// ---------------- Suture
TOOLFN.suture = (S, p, dt) => {
  if (pressed(p) && !p.g) for (const o of S.objs) if (o.st && Op.visible(S, o) && !o.sealed) { const i = o.st.findIndex(s => !s.done); if (i < 0) continue; const s = o.st[i]; if (hyp(p.x - s.a[0], p.y - s.a[1]) < 9 * tol() + (T('assist') - .6) * 2) { p.g = { k: 'st', id: o.id, i, t0: S.rt }; ev(S, 'stpick', s.a[0], s.a[1]); break; } }
  const g = p.g; if (!g || g.k !== 'st') return;
  const o = Op.byId(S, g.id); if (!o) { p.g = null; return; } const s = o.st[g.i];
  if (!down(p)) {
    if (hyp(p.x - s.b[0], p.y - s.b[1]) < 6 * tol() + (T('assist') - .6) * 1.5 && !(o.beatOnly && !G.beatWindow(S))) { s.done = true; const t = S.rt - g.t0, grade = t <= .6 ? 'Textbook' : t <= 1.2 ? 'Clean' : 'Sloppy'; s.g = grade; p.st = (p.st || 0) + 1; o.sc = (o.sc || 0) + 1; o.gsum = (o.gsum || 0) + (grade === 'Textbook' ? 2 : grade === 'Clean' ? 1 : 0); Op.award(S, p, (s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, grade, 80); ev(S, 'stitch', s.a[0], s.a[1], grade);
      if (o.st.every(q => q.done)) { o.sealed = true; o.done = true; o.keep = S.t + 6; o.closed = true; Op.heal(S, 1); ev(S, 'woundclosed', o.x, o.y); if (OBJ.wound.onDone) OBJ.wound.onDone(S, o); } }
    else { Op.slip(S, p, p.x, p.y, 1, 'loose'); ev(S, 'loose', p.x, p.y); }
    p.g = null;
  }
};
// ---------------- Salve
TOOLFN.salve = (S, p, dt) => {
  if (!down(p)) return;
  for (const o of S.objs) { if (!o.cells || o.done || !Op.visible(S, o) || o.open === false || o.dead) continue; if (hyp(o.x - p.x, o.y - p.y) > o.r + 12) continue; let n = 0; const br = 10 + (T('assist') - .6) * 3; for (let k = 0; k < o.cells.length; k++) { if (o.cells[k]) continue; const cx = o.x + (k % o.cw) * 4 - o.cw * 2 + 2, cy = o.y + Math.floor(k / o.cw) * 4 - o.cw * 2 + 2; if ((cx - p.x) ** 2 + (cy - p.y) ** 2 <= br * br) { o.cells[k] = 1; n++; } } o.cov = (o.cov || 0) + n; p.fire = true; o.t1 = o.t1 || S.rt;
    const tot = o.cells.reduce((a, b) => a + (b < 0 ? 0 : 1), 0), cov = o.cells.reduce((a, b) => a + (b > 0 ? 1 : 0), 0); o.frac = cov / tot;
    if (o.frac >= .9) { o.done = true; Op.heal(S, 2); const t = S.rt - o.t1, grade = t <= (o.par || 1.6) ? 'Textbook' : t <= (o.par || 1.6) * 2 ? 'Clean' : 'Sloppy'; Op.award(S, p, o.x, o.y, grade, 70); ev(S, 'healed', o.x, o.y); if (OBJ[o.type].onDone) OBJ[o.type].onDone(S, o, p, grade); } }
};
// ---------------- Syringe
TOOLFN.syringe = (S, p, dt) => {
  if (down(p) && p.cd <= 0) { p.fill = Math.min(1.6, p.fill + dt / .55); p.fire = p.fill < 1; if (p.fill > 1.55) { p.fill = 1.55; } }
  else if (released(p) || (!down(p) && p.fill > 0)) {
    if (p.fill > .08 && p.cd <= 0) {
      const f = Math.min(1, p.fill), bubble = p.fill > 1.3, o = Op.near(S, p.x, p.y, 10 * tol(), o => OBJ[o.type].sed && OBJ[o.type].sed(S, o, p));
      if (o) { const grade = bubble ? 'Sloppy' : f >= .9 ? 'Textbook' : 'Clean'; if (f > .35) { ev(S, 'dose', o.x, o.y, grade); const e = bubble ? .5 : 1; OBJ[o.type].dose(S, o, p, grade, e); } else ev(S, 'dosefail', o.x, o.y); }
      else { const iv = G.DIFF[S.diff].iv * f * T('heal') * (T('syringe') / 18); S.vitals = clamp(S.vitals + iv, 0, 99); S.stats.iv = (S.stats.iv || 0) + 1; ev(S, 'iv', p.x, p.y, Math.round(iv)); }
      p.cd = .35; }
    p.fill = 0;
  } else if (!down(p)) p.fill = 0;
};
// ---------------- Cautery
TOOLFN.cautery = (S, p, dt) => {
  const hot = down(p) && p.lock <= 0;
  if (!hot) { return; }
  p.fire = true;
  const o = Op.near(S, p.x, p.y, 6 * tol() + (T('assist') - .6) * 2, o => OBJ[o.type].burn && OBJ[o.type].burn(S, o, p) > 0 && (o.open !== false || o.type === 'lobe'));
  p.heat = Math.min(1, p.heat + T('heat') * dt);
  if (o) {
    const need = OBJ[o.type].burn(S, o, p); o.bp = (o.bp || 0) + dt / need * (o.heatMul || 1); o.hit = S.rt; p.char = 0; if (o.bp > .02 && !o.bt0) o.bt0 = S.rt; if (OBJ[o.type].burning) OBJ[o.type].burning(S, o, p, dt);
    if (o.bp >= 1 && OBJ[o.type].partial) { /* the object handles its own bp */ } else if (o.bp >= 1) { o.done = true; const clean = !(p.lockedDuring) ; const grade = !p.charDuring && !p.lockedDuring ? 'Textbook' : 'Clean'; p.charDuring = p.lockedDuring = false; p.burn = (p.burn || 0) + 1; Op.award(S, p, o.x, o.y, grade, o.pts || 90); ev(S, 'burned', o.x, o.y, o.type); if (OBJ[o.type].onDone) OBJ[o.type].onDone(S, o, p, grade); }
  } else {
    const blocked = Op.near(S, p.x, p.y, 8, o => OBJ[o.type].burn && o.open === false); // armour closed: the beam splashes
    p.char += dt; if (p.char > .25 && !blocked && Op.inCav(p.x, p.y)) { S.vitals = Math.max(0, S.vitals - .8 * dt * T('slip')); p.charDuring = true; if (S.chars.length < 80 && !(p.charCd > S.rt)) { p.charCd = S.rt + .15; S.chars.push([p.x | 0, p.y | 0]); } if (p.char > .6 && !(p.charSlip > S.rt)) { p.charSlip = S.rt + 1.2; Op.slip(S, p, p.x, p.y, 0, 'char'); S.stats.slips; ev(S, 'char', p.x, p.y); } }
    for (const q of S.objs) if (q.type === 'nerve' && !q.done && geo.polyNear(q.pts, p.x, p.y).d < 4 && !(p.nerveCd > S.rt)) { p.nerveCd = S.rt + 1; Op.slip(S, p, p.x, p.y, 12, 'nerve'); }
  }
  if (p.heat >= 1 && p.lock <= 0) { p.lock = 1.2; p.heat = 1; p.lockedDuring = true; ev(S, 'overheat', p.x, p.y); }
};
// ---------------- Suction
TOOLFN.suction = (S, p, dt) => {
  if (!down(p)) return;
  const o = Op.near(S, p.x, p.y, 14 + (T('assist') - .6) * 3, o => o.type === 'pool'); p.suck = true;
  if (o) { const take = Math.min(o.vol, T('suction') * dt); o.vol -= take; p.suc += take; S.stats.suc = (S.stats.suc || 0) + take; o.x += (p.x - o.x) * Math.min(1, dt * 3); o.y += (p.y - o.y) * Math.min(1, dt * 3); if (o.vol <= 0) { o.done = true; ev(S, 'drained', o.x, o.y); } }
};
// ---------------- Sonar
TOOLFN.sonar = (S, p, dt) => {
  if (!p.son) return; let near = 1e9;
  for (const o of S.objs) if (o.hid && !o.done) { const d = hyp(o.x - p.x, o.y - p.y); near = Math.min(near, d); if (d < p.son.r) { if (!(o.mk > S.rt)) ev(S, 'found', o.x, o.y); o.mk = S.rt + 4; } }
  p.son.near = near;
};
})();
