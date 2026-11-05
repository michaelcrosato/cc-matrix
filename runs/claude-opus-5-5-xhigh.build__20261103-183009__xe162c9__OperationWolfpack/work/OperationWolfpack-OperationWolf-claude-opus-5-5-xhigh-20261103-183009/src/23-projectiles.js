// Projectiles (7.7): enemy grenades, knives, rockets, missiles, mortar and tank shells, flame waves; the player's grenade.
// An enemy projectile flies from its world start to a point just in front of the camera (re-aimed each step, so it
// follows the moving camera), "hits" when it arrives, and can be shot down on the way.
(() => {
const E = My3D2dge, WP = globalThis.WP, BEH = WP.BEH, { clamp, lerp } = WP;
WP.TYPES.proj = { id: 'proj', kind: 'proj', hp: 1 };
WP.TYPES.pgren = { id: 'pgren', kind: 'proj', hp: 1 };

const Proj = WP.Proj = {
  launch(sim, from, kind, pid, at) {
    const S = WP.PROJ[kind]; if (!S) return null;
    const st = at || [from.x, from.y, (from.z || 0) + 20];
    const e = sim.spawn('proj', { x: st[0], y: st[1], z: st[2] });
    e.ptype = kind; e.pid = pid; e.hp = e.maxHp = S.hits; e.T = S.T / WP.T.projectileSpeed; e.u = 0; e.start = st.slice(); e.src = from.id;
    e.endLx = (sim.R.ai() - .5) * (kind === 'grenade' ? 40 : 24); e.endDz = kind === 'grenade' ? 12 : 8;
    e.wob = sim.R.ai() * 6.28; e.offOK = true;
    if (kind === 'flame') { e.start[2] = 0; e.endDz = 10; }
    if (kind === 'mortar') {   // a landing marker on the HUD's top edge
      const p = sim.view.project(st[0], st[1], 0); e.markX = p ? clamp(p[0], 12, WP.W - 12) : WP.W / 2;
      if (sim.perks.campLocated && from.id) { const f = sim.byId(from.id); if (f) f.marker = 1.5; }
    }
    sim.ev('proj', { id: e.id, kind, pid, src: from.id || 0 });
    return e;
  },
  /** the player's grenade, lobbed from the camera's lower front to a world point */
  throwPlayer(sim, p, target) {
    const P = sim.view.P, side = (p.slot - (sim.players.length - 1) / 2) * 30;
    const st = [P.x + P.fx * 8 + P.rx * (8 + side), P.y + P.fy * 8 + P.ry * (8 + side), P.h - 6];
    const e = sim.spawn('pgren', { x: st[0], y: st[1], z: st[2] });
    const dist = Math.hypot(target[0] - st[0], target[1] - st[1]);
    e.ptype = 'pgren'; e.pid = p.pid; e.start = st; e.end = target.slice(); e.T = .55 + .0015 * dist; e.u = 0; e.offOK = true; e.hp = 9999;
    e.apex = Math.max(20, dist * .18);
    sim.ev('pthrow', { pid: p.pid, id: e.id });
    return e;
  }
};

BEH.proj = (sim, e, dt) => {
  e.t2 = (e.t2 || 0) + dt; e.u = clamp(e.t2 / e.T, 0, 1);
  if (e.type === 'pgren') {
    const u = e.u, s = e.start, t = e.end;
    e.x = lerp(s[0], t[0], u); e.y = lerp(s[1], t[1], u); e.z = lerp(s[2], t[2], u) + e.apex * 4 * u * (1 - u);
    if (u >= 1) {
      e.gone = true;
      const W = WP.T;
      sim.explode(t[0], t[1], t[2], W.grenadeRadius, W.grenadeDmg, { by: e.pid, kind: 'pgren' });
    }
    return;
  }
  const S = WP.PROJ[e.ptype], P = sim.view.P, u = e.u;
  // the end point: just in front of the camera, re-aimed every step
  const ex = P.x + P.fx * e.endDz + P.rx * e.endLx, ey = P.y + P.fy * e.endDz + P.ry * e.endLx, ez = S.ground ? 0 : P.h - 8;
  const s = e.start;
  let x = lerp(s[0], ex, u), y = lerp(s[1], ey, u), z = lerp(s[2], ez, u) + (S.apex || 0) * 4 * u * (1 - u);
  if (S.drop) {   // a mortar shell: up and out of sight, then straight down onto a point in front of the camera
    const lx = P.x + P.fx * 46 + P.rx * e.endLx * 2, ly = P.y + P.fy * 46 + P.ry * e.endLx * 2;
    if (u < S.drop) { const v = u / S.drop; x = lerp(s[0], lx, v); y = lerp(s[1], ly, v); z = s[2] + 420 * Math.sin(v * Math.PI / 2); }
    else { const v = (u - S.drop) / (1 - S.drop); x = lx; y = ly; z = 150 * (1 - v); }
  }
  if (S.wobble) { x += Math.sin(e.t * 9 + e.wob) * S.wobble * P.rx; y += Math.sin(e.t * 9 + e.wob) * S.wobble * P.ry; z += Math.cos(e.t * 7 + e.wob) * S.wobble * .6; }
  if (S.home) { x += Math.sin(e.t * 3 + e.wob) * 10 * (1 - u) * P.rx; y += Math.sin(e.t * 3 + e.wob) * 10 * (1 - u) * P.ry; }
  e.vx = (x - e.x) / Math.max(dt, 1e-6); e.vy = (y - e.y) / Math.max(dt, 1e-6); e.vz = (z - e.z) / Math.max(dt, 1e-6);
  e.x = x; e.y = y; e.z = z;
  if (u >= 1) {
    e.gone = true;
    const p = sim.players.find(q => q.pid === e.pid) || sim.livePlayers()[0];
    const lx = sim.view.lateral(s[0], s[1]);
    const dmg = S.dmg * sim.dmgK;
    sim.ev('impact', { kind: e.ptype, pid: p ? p.pid : -1, x, y, z });
    if (e.ptype === 'grenade' || e.ptype === 'rocket' || e.ptype === 'missile' || e.ptype === 'mortar' || e.ptype === 'shell') sim.ev('explode', { x, y, z, r: 30, big: 0, kind: 'cam' });
    if (p) sim.hurtPlayer(p, dmg, { kind: e.ptype, dir: lx < -80 ? -1 : lx > 80 ? 1 : 0 });
  }
};

BEH['shapes:proj'] = (sim, e, out, V) => {
  if (e.type === 'pgren' || e.dead || e.gone) return;
  const S = WP.PROJ[e.ptype]; if (!S || !S.hits) return;
  const p = V.project(e.x, e.y, e.z); if (!p) return;
  const D = V.depth(e.x, e.y);
  out.push({ e, part: 'proj', D: D - 2, kind: 'c', cx: p[0], cy: p[1], r: Math.max(5, S.r * p[2]) });
};

/** a hit on a projectile: shot down when its hits run out */
Proj.hit = (sim, e, p, dmg) => {
  if (e.gone || e.dead) return;
  e.hp -= 1;
  if (e.hp > 0) { sim.ev('projHit', { id: e.id }); return; }
  e.dead = true; e.gone = true;
  const S = WP.PROJ[e.ptype];
  if (p) { p.intercepts++; sim.score(p, S.score, { x: e.x, y: e.y, z: e.z }, { raw: true }); }
  sim.ev('intercept', { id: e.id, kind: e.ptype, by: p ? p.pid : -1, x: e.x, y: e.y, z: e.z });
};
})();
