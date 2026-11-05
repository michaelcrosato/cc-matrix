/* ---- THE AUTOPILOT: it plays the hero by producing intents (never game.input), so attract mode cannot be mistaken
 * for a player. A route is a list of beats: { at, facing } teleport, { goto: [cx, cy], gait } walk a flow field there,
 * { wait }, { until }, { press }, { hold, s }, { grapple: [cx, cy, z] }, { use: tool, at }, { cut: guardId }, { fight: s },
 * { camera }, { say }, { fn }. Each beat gives up after 8 s (or its max) so a loop can never stick ---- */
const Autopilot = { beats: [], i: 0, t: 0, held: {}, log: [], timeouts: 0, name: null };
Autopilot.load = (beats, name) => { Autopilot.beats = beats.slice(); Autopilot.i = 0; Autopilot.t = 0; Autopilot.held = {}; Autopilot.name = name || null; Autopilot.timeouts = 0; Autopilot.started = false; };
Autopilot.done = () => Autopilot.i >= Autopilot.beats.length;
const heroFlowKey = (W, tx, ty) => 'h' + toCell(tx) + ',' + toCell(ty);
/** a flow field for the hero (its own map: water swims, ledges of 30 climb, gaps of 60 leap) */
Autopilot.flow = (W, tx, ty) => {
  const k = heroFlowKey(W, tx, ty); let f = W.flows.get(k);
  if (!f) { f = new E.FlowField(W.map, { climb: 30, drop: 48, jump: 60 }); W.flows.set(k, f); if (W.flows.size > 32) W.flows.delete(W.flows.keys().next().value); }
  f.update(cellC(toCell(tx)), cellC(toCell(ty))); return f;
};
Autopilot.steer = (h, M, tx, ty, speed = 1) => {
  const W = M.world, d = Math.hypot(tx - h.x, ty - h.y); if (d < 5) return { move: [0, 0], jump: false, arrived: true };
  const f = Autopilot.flow(W, tx, ty), nx = f.next(h.x, h.y);
  let gx = nx ? nx.x : tx, gy = nx ? nx.y : ty; if (!nx || (toCell(nx.x) === toCell(tx) && toCell(nx.y) === toCell(ty))) { gx = tx; gy = ty; }
  const l = Math.hypot(gx - h.x, gy - h.y) || 1;
  return { move: [(gx - h.x) / l * speed, (gy - h.y) / l * speed], jump: !!(nx && h.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < h.r + 5), arrived: false };
};
Autopilot.intent = M => {
  const it = B.noIntent(), h = M.hero; if (!h) return it;
  if (!Autopilot.started) { Autopilot.started = true; Autopilot.t = 0; }
  if (Autopilot.done()) return it;
  const b = Autopilot.beats[Autopilot.i], dt = 1 / 120;
  Autopilot.t += dt;
  const next = () => { Autopilot.i++; Autopilot.t = 0; Autopilot.sub = null; };
  if (Autopilot.t > (b.max || (b.fight ? b.fight + 1 : b.wait ? b.wait + 1 : 8))) { Autopilot.timeouts++; Autopilot.log.push('timeout ' + (Autopilot.name || '') + ' #' + Autopilot.i + ' ' + Object.keys(b)[0]); next(); return it; }
  const gait = b.gait || 'run';
  const setCrouch = want => { if (!!h.crouch !== !!want && !h.swim) it.crouchPressed = true; };
  if (b.at) { Object.assign(h, { x: cellC(b.at[0]) + (b.dx || 0), y: cellC(b.at[1]) + (b.dy || 0), z: b.at[2] !== undefined ? b.at[2] : M.world.map.groundAt(cellC(b.at[0]), cellC(b.at[1])), vx: 0, vy: 0, vz: 0, onGround: true, action: null }); if (b.facing !== undefined) h.facing = b.facing * Math.PI / 180; h.swim = false; h.dive = false; game.cam.snap = true; if (b.crouch !== undefined) h.crouch = b.crouch; next(); return it; }
  if (b.wait !== undefined) { if (b.gait) setCrouch(gait === 'crouch'); if (b.focus) it.focusDown = true; if (Autopilot.t >= b.wait) next(); return it; }
  if (b.until) { if (b.until(M)) next(); return it; }
  if (b.fn) { b.fn(M, h); next(); return it; }
  if (b.press) { it[b.press] = true; next(); return it; }
  if (b.interact !== undefined) { it.interactDown = true; if (Autopilot.t <= dt * 1.5) it.interactPressed = true; if (Autopilot.t >= b.interact) next(); return it; }
  if (b.hold) { it[b.hold] = true; if (b.move) it.move = b.move; if (Autopilot.t >= (b.s || .5)) next(); return it; }
  if (b.face !== undefined) { h.facing = b.face * Math.PI / 180; next(); return it; }
  if (b.say) { B.Cutscene.radio(b.say[0], b.say[1], b.say[2] || 3); next(); return it; }
  if (b.camera) { if (b.camera.turn) B.Cam.turn(b.camera.turn); if (b.camera.zoom) B.Cam.cine(b.camera.zoom, b.camera.hold || 2); next(); return it; }
  if (b.goto) {
    const tx = cellC(b.goto[0]) + (b.dx || 0), ty = cellC(b.goto[1]) + (b.dy || 0);
    setCrouch(gait === 'crouch'); if (h.crouch && gait !== 'crouch' && !it.crouchPressed && !h.swim) it.crouchPressed = true;
    if (b.dive && h.swim && !h.dive) it.crouchPressed = true;
    const s = Autopilot.steer(h, M, tx, ty, gait === 'walk' ? .5 : 1); it.move = s.move; it.jumpPressed = s.jump; it.sprint = gait === 'sprint';
    if (s.arrived || Math.hypot(tx - h.x, ty - h.y) < (b.within || 6)) next();
    return it;
  }
  if (b.grapple) {
    const [cx, cy, z] = b.grapple, tx = cellC(cx), ty = cellC(cy);
    if (h.action && h.action.name === 'grapple') return it;
    if (Autopilot.sub === 'fired') { if (!h.action) next(); return it; }
    const list = Grapple.anchors(h, M); let best = null, bd = 1e9; for (const a of list) { const d = Math.hypot(a.x - tx, a.y - ty) + Math.abs(a.z - (z || a.z)) * 2; if (d < bd) { bd = d; best = a; } }
    if (best) { h.facing = Math.atan2(best.y - h.y, best.x - h.x); Grapple.fire(h, best, M); Autopilot.sub = 'fired'; }
    return it;
  }
  if (b.use) {
    const i = h.bento.findIndex(c => c && c.tool === b.use && c.n > 0); if (i < 0) { Hero.give(h, b.use, 1); return it; }
    h.sel = i; if (b.aim) { const x = cellC(b.aim[0]), y = cellC(b.aim[1]); it.aimPoint = { x, y, z: M.world.map.groundAt(x, y) }; it.mouseMode = true; h.facing = Math.atan2(y - h.y, x - h.x); }
    if (b.feet) it.blockDown = true;
    it.usePressed = true; next(); return it;
  }
  if (b.cut) {
    const v = Mission.find(M, b.cut); if (!v || !v.alive) { if (!h.action) next(); return it; }
    if (h.action) return it;
    const c = SilentCut.find(h, M);
    if (c && c.victim === v) { it.attackPressed = true; return it; }
    // approach from behind on the nav map (crouched), or from the water / a roof as the beat says
    const f = v.facing, back = b.from === 'above' ? 30 : 12, tx = v.x - Math.cos(f) * back, ty = v.y - Math.sin(f) * back;
    if (b.from === 'water') { const s = Autopilot.steer(h, M, b.water ? cellC(b.water[0]) : tx, b.water ? cellC(b.water[1]) : ty, .6); it.move = s.move; if (h.swim && !h.dive && b.dive) it.crouchPressed = true; return it; }
    if (b.from === 'above') { const s = Autopilot.steer(h, M, b.spot ? cellC(b.spot[0]) : tx, b.spot ? cellC(b.spot[1]) : ty, .5); it.move = s.move; return it; }
    setCrouch(b.gait !== 'run'); const s = Autopilot.steer(h, M, tx, ty, h.crouch ? 1 : .5); it.move = s.move; it.jumpPressed = s.jump;
    return it;
  }
  if (b.fight) {
    if (Autopilot.t > b.fight || (b.until2 && b.until2(M))) { next(); return it; }
    const foes = Combat.targets(M).filter(e => e.kind !== 'civ' && (e.kind === 'boss' ? e.active && !e.defeated : true)); let tgt = null, bd = 1e9; for (const e of foes) { const d = Math.hypot(e.x - h.x, e.y - h.y) + Math.abs(e.z - h.z) * 4; if (d < bd) { bd = d; tgt = e; } }
    if (h.crouch) it.crouchPressed = true;
    if (!tgt) return it;
    const d = Math.hypot(tgt.x - h.x, tgt.y - h.y), danger = Hud.tele.find(t => t.t < t.max * .5 && Math.hypot(h.x - t.x, h.y - t.y) < t.r + 4 && t.kind !== 'arc');
    const wind = tgt.atk && tgt.atk.busy && tgt.atk.phase === 'wind' ? tgt.atk.u : tgt.move && tgt.move.ph === 'wind' ? tgt.move.u : -1, key = tgt.move || tgt.atk;
    if (Combat.riposteTarget(h, M) && b.style !== 'plain') { it.attackPressed = true; return it; }
    if (wind >= 0 && key !== Autopilot.decided) { Autopilot.decided = key; Autopilot.plan = b.style === 'plain' ? (rand() < .4 ? 'roll' : 'press') : rand() < .55 ? 'parry' : rand() < .5 ? 'roll' : 'press'; }
    if (wind > .72 && d < 34 && Autopilot.plan === 'parry') { it.blockPressed = Autopilot.t % .5 < dt * 1.5; it.blockDown = true; h.facing = Math.atan2(tgt.y - h.y, tgt.x - h.x); return it; }
    if ((wind > .55 && d < 34 && Autopilot.plan === 'roll') || danger) { const a = Math.atan2(h.y - tgt.y, h.x - tgt.x) + .8; it.move = [Math.cos(a), Math.sin(a)]; it.blockDown = true; it.jumpPressed = true; Autopilot.plan = 'press'; return it; }
    if (d > 16 || h.swim) { const s = Autopilot.steer(h, M, tgt.x, tgt.y, 1); it.move = s.move; it.jumpPressed = s.jump || (h.swim && Autopilot.t % .6 < dt * 1.5); return it; }
    h.facing = Math.atan2(tgt.y - h.y, tgt.x - h.x); if (!h.combo.busy || h.combo.current && h.combo.current.phase === 'recover') it.attackPressed = true;
    return it;
  }
  next(); return it;
};
B.Autopilot = Autopilot;
