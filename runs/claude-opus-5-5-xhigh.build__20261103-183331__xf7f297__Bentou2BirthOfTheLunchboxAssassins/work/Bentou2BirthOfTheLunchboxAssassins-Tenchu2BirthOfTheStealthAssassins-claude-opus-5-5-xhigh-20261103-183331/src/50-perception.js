/* ---- PERCEPTION: noise and hearing, exposure (light x cover x motion x crouch), sight with a look-up limit and smoke,
 * hound smell, and the hero's own senses: Shadow Sight (guards the ninja can't see are hidden unless the Ki senses them)
 * and the Ki Gauge (0..99 for the nearest sensed guard, colored by awareness) ---- */
const Perception = { sightT: 0, ki: 0, kiState: 'calm', lightNow: 0, exp: 1 };
const SEE_MIN = .18;   // below this exposure a guard cannot make the shape out
const AWARE_COLOR = { calm: '#5ad8c8', notice: '#f0d050', search: '#f09040', alert: '#ff4a3a' };
const AWARE_RANK = { calm: 0, notice: 1, search: 2, alert: 3 };
/** a noise in the world: every guard, hound and civilian that hears it reacts (sleepers wake at .5) */
B.noise = (x, y, z, loud, kind = 'noise', src = null) => {
  const M = B.M; if (!M || loud <= 0) return;
  M.noises.push({ x, y, z, loud, kind, t: .8 });
  const n = { x, y, z, loud };
  for (const g of M.guards.concat(M.civs)) {
    if (!g.alive || g.cutBy || g.kind === 'boss' || g === src) continue;
    let s = E.hears(g, n, M.world.map) * T('hearing') * (g.A && g.A.hear || 1);
    if (s <= .15) continue;
    B.Brain.hear(g, s, n, kind, M);
  }
  B.emit('noise', { x, y, z, loud, kind });
};
/** the hero's exposure for guards' eyes: light x cover x motion x the crouch, 0 while diving */
Perception.exposure = (h, M) => {
  const W = M.world;
  if (M.cheats.invisible) return 0;
  if (h.dive) return 0;
  const L = W.lightAt(h.x, h.y, h.z); Perception.lightNow = L;
  const lightF = lerp(1 - T('darkness'), 1, L);
  let cover = 1;
  if (W.isHide(h.x, h.y, h.z)) cover = h.crouch ? .15 : .6;
  if (h.hug) cover = Math.min(cover, .6);
  if (h.swim) cover = Math.min(cover, .8);
  const sp = Math.hypot(h.vx, h.vy), motion = sp < 4 ? .75 : h.sprinting ? 1.3 : sp > 70 ? 1.15 : 1;
  let e = lightF * cover * motion * (h.crouch ? T('crouchVis') / .6 : 1);
  if (h.cloakT > 0 && !h.sprinting && !h.combo.busy) e *= .15;
  if (W.flash > 0) e = Math.min(1, e * 2);
  return clamp(e, 0, 1);
};
/** does guard g see body t now? { seen, exposure, d } with the look-up limit and smoke clouds */
Perception.sees = (g, t, M, o = {}) => {
  const W = M.world, heightened = M.heightened > 0 ? 1.2 : 1, range = T('sightRange') * (g.sightMul || 1) * heightened * (o.rangeMul || 1);
  const res = E.sees(g, t, { map: W.map, range, fov: T('sightFov') * (g.fovMul || 1), eye: g.eye });
  if (!res.seen) return res;
  // the look-up limit: a hero well above a guard's eyes, steeply, is out of view (archers and ninja look up)
  if (!(g.A && g.A.looksUp)) { const dz = (t.z || 0) + 22 - ((g.z || 0) + 30), d = Math.max(1, res.d); if (dz > 16 && Math.atan2(dz, d) > T('lookUp') * Math.PI / 180) return { seen: false, exposure: 0, d: res.d }; }
  // too faint to make out: a shape in the dark is not a ninja (yet)
  if (res.exposure < SEE_MIN) return { seen: false, exposure: 0, d: res.d };
  for (const c of M.clouds) if (segCircle(g.x, g.y, t.x, t.y, c.x, c.y, c.r * .85) || Math.hypot(g.x - c.x, g.y - c.y) < c.r * .85) return { seen: false, exposure: 0, d: res.d };
  return res;
};
const segCircle = (x0, y0, x1, y1, cx, cy, r) => { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, u = clamp(((cx - x0) * dx + (cy - y0) * dy) / l2, 0, 1), px2 = x0 + dx * u - cx, py2 = y0 + dy * u - cy; return px2 * px2 + py2 * py2 < r * r; };
/** the hero's senses, 20 times a second: each guard visible, sensed (the Ki) or hidden; the Ki number and its color */
Perception.update = (dt, M) => {
  const h = M.hero; if (!h) return;
  h.exposure = Perception.exposure(h, M); Perception.exp = h.exposure;
  Perception.sightT -= dt; if (Perception.sightT > 0) return; Perception.sightT = .05;
  const W = M.world, focus = !!M.focus, kiR = (focus ? 220 : T('kiRange')), reveal = game.settings.showAll || M.cheats.reveal || M.mode === 'attract';
  const eye = h.peek ? { x: h.x + h.peek[0] * 10, y: h.y + h.peek[1] * 10, z: h.z, eye: h.crouch ? 18 : 30 } : { x: h.x, y: h.y, z: h.drawZ !== undefined ? Math.max(0, h.drawZ + 8) : h.z, eye: h.crouch ? 18 : 30 };
  let K = 0, KS = 'calm';
  for (const g of M.guards.concat(M.civs, M.bosses)) {
    if (!g.alive && !Actor.isBody(g)) { g.vis = 'visible'; continue; }
    const d = Math.hypot(g.x - h.x, g.y - h.y);
    let vis = 'hidden';
    if (reveal || g.kind === 'boss') vis = 'visible';
    else if (d < 200 && W.map.sight(eye, g, { eye: eye.eye })) vis = 'visible';
    else if (d < 26) vis = 'visible';
    else if (d < kiR && g.alive) vis = 'sensed';
    g.vis = vis;
    if (g.alive && g.kind !== 'civ' && vis !== 'hidden' && d < kiR) {
      const k = Math.round(99 * (1 - d / kiR)); if (k > K) K = k;
      const st = g.mind ? g.mind.state : 'calm'; if (AWARE_RANK[st] > AWARE_RANK[KS]) KS = st;
    }
  }
  Perception.ki = K; Perception.kiState = KS;
};
Perception.COLOR = AWARE_COLOR; Perception.RANK = AWARE_RANK;
B.Perception = Perception;
