/* ---- THE ARCADE LAYER: power-ups thrown by the crowd, each venue's hazard, the wind ---- */
TT.arc = {};
const FLAME_GRATES = (() => { const g = []; for (const side of [0, 1]) for (let i = 0; i < 8; i++) g.push({ x: G.X0 + 70 + i * 126, y: side ? G.Y1 - 32 : G.Y0 + 32 }); return g; })();
TT.FLAME_GRATES = FLAME_GRATES;

TT.arc.idle = dt => { stepHazards(dt, false); };
TT.arc.step = dt => {
  if (M.drill && !M.drill.arcade) { stepPowerup(dt, true); return; }
  stepPowerup(dt, false);
  stepHazards(dt, true);
  stepWind(dt);
};

/* ---- power-ups ---- */
function stepPowerup(dt, only) {
  const pu = M.pu;
  if (!pu) {
    if (only) return;
    M.puT += dt;
    const every = TUNE.v.powerupEvery;
    if (!M.puNext) M.puNext = every + U(-10, 10);
    if (M.puT > Math.max(5, M.puNext)) { M.puT = 0; M.puNext = every + U(-10, 10); spawnPowerup(TT.POWERUP_IDS[Math.floor(rnd() * TT.POWERUP_IDS.length)]); }
    return;
  }
  pu.t += dt;
  if (!pu.landed) {
    const u = clamp(pu.t / pu.dur, 0, 1);
    pu.x = lerp(pu.x0, pu.tx, u); pu.y = lerp(pu.y0, pu.ty, u); pu.z = lerp(60, 0, u) + Math.sin(u * PI) * 60;
    if (u >= 1) { pu.landed = true; pu.t = 0; emit('powerupLand', { kind: pu.kind }); }
    return;
  }
  if (pu.t > 15) { M.pu = null; emit('powerupGone', {}); return; }
  for (const p of M.players) if (standing(p) && isFree(p) && Math.hypot(p.x - pu.x, p.y - pu.y) < 11) { takePowerup(p, pu.kind); M.pu = null; return; }
}
function spawnPowerup(kind, at) {
  const b = M.ball;
  let tx, ty, tries = 0;
  do { tx = U(G.X0 + 60, G.X1 - 60); ty = U(G.Y0 + 60, G.Y1 - 60); tries++; } while (Math.hypot(tx - b.x, ty - b.y) < 80 && tries < 20);
  if (at) { tx = at[0]; ty = at[1]; }
  M.pu = { kind, x0: clamp(tx + U(-80, 80), G.X0, G.X1), y0: G.Y0 - 50, tx, ty, x: tx, y: G.Y0 - 50, z: 60, t: 0, dur: at && at[2] === 0 ? .01 : 1.1, landed: false };
  emit('powerupThrow', { kind });
}
TT.arc.spawnPowerup = (k, at) => spawnPowerup(k, at);
function takePowerup(p, kind) {
  const def = TT.POWERUPS[kind];
  if (kind === 'horn') addHype(p.team, 40);
  else if (kind === 'boot') M.megaBoot[p.team] = def.time;
  else { p.power = { kind, t: def.time }; if (kind === 'pie') p.turbo = 1; }
  emit('powerupTake', { pid: p.id, kind });
}
TT.arc.takePowerup = (p, k) => takePowerup(p, k);

/* ---- the wind: a new strength and direction every 15-25 s ---- */
function stepWind(dt) {
  if (!(M.weather === 'wind' || M.weather === 'storm')) return;
  M.wind.t -= dt;
  if (M.wind.t <= 0) { M.wind.t = U(15, 25); M.wind.a = U(0, TAU); M.wind.s = U(.2, 1) * (M.weather === 'storm' ? .6 : 1); emit('windShift', { a: M.wind.a, s: M.wind.s }); }
}

/* ---- hazards: the chicken, the flame jets, lightning (and the mud, which just sits there) ---- */
function stepHazards(dt, live) {
  const hz = M.venue.hazard, k = TUNE.v.hazardEvery;
  // live hazards run on
  for (const h of M.hazards.slice()) {
    h.t += dt;
    if (h.kind === 'chicken') {
      const u = h.t / h.dur, P = h.path; if (u >= 1) { M.hazards.splice(M.hazards.indexOf(h), 1); continue; }
      h.x = lerp(P[0], P[2], u); h.y = lerp(P[1], P[3], u) + Math.sin(u * 12) * 20;
      for (const p of M.players) if (standing(p) && !h.hit[p.id] && Math.hypot(p.x - h.x, p.y - h.y) < 16) { h.hit[p.id] = 1; knockDown(p, 1.1, null); p.vx = (p.x - h.x) * 6; p.vy = (p.y - h.y) * 6; emit('clucked', { pid: p.id }); }
      if (M.ref.down <= 0 && !h.refHit && Math.hypot(M.ref.x - h.x, M.ref.y - h.y) < 16) { h.refHit = 1; refDown(); }
    } else if (h.kind === 'flame') {
      if (h.t > h.warn && h.t < h.warn + 1.2) {
        if (!h.lit) { h.lit = 1; emit('flame', { x: h.x, y: h.y }); }
        for (const p of M.players) if (standing(p) && !h.hit[p.id] && Math.hypot(p.x - h.x, p.y - h.y) < 14) { h.hit[p.id] = 1; toast(p, 'toasted'); }
      }
      if (h.t > h.warn + 1.3) M.hazards.splice(M.hazards.indexOf(h), 1);
    } else if (h.kind === 'lightning') {
      if (h.t > 1.4 && !h.struck) {
        h.struck = 1; emit('lightning', { x: h.x, y: h.y });
        for (const p of M.players) if (onField(p) && p.st !== 'binned' && Math.hypot(p.x - h.x, p.y - h.y) < 36) toast(p, 'zapped');
        if (Math.hypot(M.ref.x - h.x, M.ref.y - h.y) < 36 && M.ref.down <= 0) refDown();
        M.scorch = (M.scorch || []).concat([[h.x, h.y]]).slice(-8);
      }
      if (h.t > 2) M.hazards.splice(M.hazards.indexOf(h), 1);
    }
  }
  if (!live || k <= 0) return;
  M.hazT.a -= dt * k;
  if (M.hazT.a > 0) return;
  if (hz === 'chicken') { M.hazT.a = U(50, 70); triggerHazard('chicken'); }
  else if (hz === 'flames') { M.hazT.a = U(9, 15); triggerHazard('flames'); }
  else if (hz === 'lightning') { M.hazT.a = U(20, 30); triggerHazard('lightning'); }
  else if (hz === 'mud') { M.hazT.a = U(25, 40); emit('mudCall', {}); }
  else M.hazT.a = 30;
}
function toast(p, how) {
  if (how === 'toasted') p.toasted = 1.5; else p.zapped = .5;
  knockDown(p, how === 'toasted' ? 1.2 : 1.5, null); p.st = 'stunned';
  emit(how, { pid: p.id });
}
/** a hazard now (the dev panel's and the attract director's too): any venue's */
function triggerHazard(kind) {
  const b = M.ball;
  if (kind === 'chicken') {
    const x = clamp(b.x + U(-60, 60), G.X0 + 40, G.X1 - 40), top = rnd() < .5;
    M.hazards.push({ kind: 'chicken', t: 0, dur: 6, path: [x - 80, top ? G.Y0 - 30 : G.Y1 + 30, x + 80, top ? G.Y1 + 30 : G.Y0 - 30], x, y: top ? G.Y0 - 30 : G.Y1 + 30, hit: {} });
    emit('chicken', {});
  } else if (kind === 'flames') {
    const near = FLAME_GRATES.slice().sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) { const g = near[i * 2 % near.length]; M.hazards.push({ kind: 'flame', t: 0, warn: 1 + i * .25, x: g.x, y: g.y, hit: {} }); }
    emit('flameWarn', {});
  } else if (kind === 'lightning') {
    const a = U(0, TAU), d = U(60, 200);
    M.hazards.push({ kind: 'lightning', t: 0, x: clamp(b.x + Math.cos(a) * d, G.X0 + 20, G.X1 - 20), y: clamp(b.y + Math.sin(a) * d, G.Y0 + 20, G.Y1 - 20), hit: {} });
    emit('lightningWarn', {});
  } else if (kind === 'mud') {
    const p = holder() || M.players[0];
    M.mud.push({ x: p.x + dirOf(p.team) * 30, y: p.y, r: 50, k: 1 });
    emit('mudCall', {});
  }
}
TT.arc.trigger = k => triggerHazard(k);
