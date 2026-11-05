/* 23-projectiles: grenades, rockets, harpoons, torpedoes, missiles, flares and the player's grenade-launcher rounds.
 * Every enemy projectile is shootable (shot down in the air: +1,000) and carries its threat; explosions hurt enemies
 * only (never players: their damage comes from threats). Reads the Sim; emits 'explode', 'shotdown' events. */
const PROJ = {
  pgl: { r: 2, color: '#d8e0e8' },
  grenade: { r: 3.5, hp: 1, color: '#3a4a2a', blast: 40 },
  rocket: { r: 4, hp: 1, color: '#c8ccd4', trail: true, blast: 30 },
  harpoon: { r: 4, hp: 2, color: '#c8c0b0', rope: true },
  torpedo: { r: 7, hp: 2, color: '#3a3e48', wake: true, blast: 40 },
  missile: { r: 4.5, hp: 1, color: '#d8d8d8', trail: true, blast: 34 },
  flare: { r: 5, hp: 1, color: '#ff7a2a', glow: true, blast: 24 }
};
TC.PROJ = PROJ;
function launch(sim, o) {
  const P = PROJ[o.kind] || {};
  const pr = Object.assign({ id: sim.nid(), alive: true, t: 0, gravity: 0, hp: P.hp || 1, r: P.r || 3, life: 3, owner: -1 }, o);
  pr.vel = pr.vel.slice(); pr.pos = pr.pos.slice();
  sim.projectiles.push(pr);
  sim.ev({ type: 'launch', id: pr.id, kind: pr.kind, at: pr.pos.slice() });
  return pr;
}
TC.launch = launch;
function projectilesStep(sim, dt) {
  for (const pr of sim.projectiles) {
    if (!pr.alive) continue;
    pr.t += dt; const prev = pr.pos.slice();
    if (pr.home && pr.th && !pr.th.done) {   // aim the rest of the flight at the landing point, arriving at the threat's time
      const left = Math.max(.02, pr.th.T - sim.t), tgt = pr.land; pr.vel = [(tgt[0] - pr.pos[0]) / left, (tgt[1] - pr.pos[1]) / left, (tgt[2] - pr.pos[2]) / left + (pr.gravity ? .5 * pr.gravity * left : 0)];
    }
    pr.vel[2] -= pr.gravity * dt;
    pr.pos[0] += pr.vel[0] * dt; pr.pos[1] += pr.vel[1] * dt; pr.pos[2] += pr.vel[2] * dt;
    if (pr.kind === 'pgl') {
      const d = V3.sub(pr.pos, prev), L = V3.len(d) || 1, ray = { o: prev, d: V3.mul(d, 1 / L) };
      const hit = sim.rayWorld(ray, L, true);
      const hitE = sim.rayEnemies(ray, L), hb = sim.boss && !sim.boss.dead && sim.boss.rayTest ? sim.boss.rayTest(sim, ray) : null, hitB = hb && hb.t <= L ? hb : null;
      if (hitE || hit || hitB || pr.pos[2] < sim.waterZ() || pr.t > pr.life) {
        const tt = Math.min(hitE ? hitE.t : 1e9, hit ? hit.t : 1e9, hitB ? hitB.t : 1e9), at = tt < 1e9 ? V3.add(prev, V3.mul(ray.d, tt)) : pr.pos;
        pr.alive = false; sim.explode(at, tune.weapons.glRadius, tune.weapons.glDamage, pr.owner, false, 'gl');
      }
      continue;
    }
    if (pr.t >= pr.life || (pr.th && pr.th.done)) {   // it arrived: the threat resolves on its own clock; the blast is spectacle
      pr.alive = false;
      const P = PROJ[pr.kind] || {};
      if (P.blast) sim.ev({ type: 'explode', at: (pr.land || pr.pos).slice(), r: Math.min(18, P.blast), small: true, kind: pr.kind, arrival: true });
    }
  }
  sim.projectiles = sim.projectiles.filter(p => p.alive);
}
TC.projectilesStep = projectilesStep;
/** a projectile shot (by player p): hp down; at 0 it bursts in the air (its threat is cancelled) */
function shootProjectile(sim, pr, p, dmg) {
  pr.hp -= dmg; sim.ev({ type: 'phit', id: pr.id, at: pr.pos.slice() });
  if (pr.hp > 0) return 100;
  pr.alive = false;
  if (pr.th && !pr.th.done) { pr.th.done = true; pr.th.cancelled = true; sim.ev({ type: 'threatoff', th: pr.th.id }); }
  const P = PROJ[pr.kind] || {};
  sim.explode(pr.pos, P.blast || 30, pr.kind === 'grenade' ? 8 : 4, p ? p.id : -1, true, 'shotdown');
  sim.ev({ type: 'shotdown', p: p ? p.id : -1, kind: pr.kind, at: pr.pos.slice() });
  if (pr.onShot) pr.onShot(p);
  return p ? addScore(sim, p, 1000, pr.pos.slice()) : 0;
}
TC.shootProjectile = shootProjectile;
