// ---- pickups: cash, prizes, keys, capsules, bombs, encores, the statuette; collection, magnet, expiry, drop caps ----
const PICKUPS = MT.PICKUPS = {
  bill: { cash: 100, spr: 'bill', cashy: true }, stack: { cash: 500, spr: 'stack', cashy: true }, gold: { cash: 1000, spr: 'gold', cashy: true }, case: { cash: 5000, spr: 'case', cashy: true },
  prize: { spr: 'boxR' }, key: { spr: 'key', placed: true }, capsule: { spr: 'tv' }, bomb: { spr: 'bulb' }, life: { spr: 'star' }, statue: { spr: 'statue', placed: true },
};
let PID = 1;
/** a pickup on the floor (or flying in an arc to it: vz) */
function makePickup(kind, x, y, o = {}) {
  const p = Object.assign({ id: PID++, kind, x, y, z: o.z || 0, vx: 0, vy: 0, vz: 0, ttl: o.placed || PICKUPS[kind].placed ? Infinity : 9, t: 0, dead: false }, o);
  if (kind === 'capsule' && !p.wpn) p.wpn = rpick(RNG.drops, CAPSULES);
  if (kind === 'prize' && p.box === undefined) p.box = Math.floor(RNG.drops() * 3);
  return p;
}
MT.makePickup = makePickup;
MT.resetPickupIds = () => { PID = 1; };
/** each step: arcs land, belts carry, the magnet pulls cash after a clear, contestants collect, old ones expire */
MT.stepPickups = (world, dt) => {
  const magnet = world.phase === 'CLEAR' || world.phase === 'EXIT';
  for (const p of world.pickups) {
    if (p.dead) continue;
    p.t += dt;
    if (p.z > 0 || p.vz) { p.vz -= 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx = p.vy = 0; clampInterior(p, 8); } continue; }
    const belt = world.arena.beltAt(p.x, p.y);
    if (belt) { p.x += belt * dt; if (p.kind === 'key' && p.belt) { if (p.x < AR.X0 + 2) p.x = AR.X1 - 2; if (p.x > AR.X1 - 2) p.x = AR.X0 + 2; } else clampInterior(p, 4); }
    if (p.rise !== undefined && p.rise < 1) { p.rise = Math.min(1, p.rise + dt * 1.2); }
    if (magnet && PICKUPS[p.kind].cashy) { const c = MT.nearestContestant(world, p, 60); if (c) { const a = angTo(p, c); p.x += Math.cos(a) * 120 * dt; p.y += Math.sin(a) * 120 * dt; } }
    if (p.ttl !== Infinity) { p.ttl -= dt; if (p.ttl <= 0) { p.dead = true; continue; } }
    if (world.cosmetic) continue;
    if (p.locked && p.locked()) continue;
    for (const c of world.contestants) {
      if (!c.targetable || c.ctl === 'remote') continue;
      if (dist2(c, p) < (c.r + 7) ** 2) { world.collect(c, p); break; }
    }
  }
  E.prune(world.pickups, p => p.dead);
};
/** roll an enemy's drop table (dropMul), with floor caps: at most 3 capsules and 25 cash pickups */
MT.rollDrops = (world, e) => {
  const A = ENEMIES[e.kind] || TARGETS[e.kind]; if (!A) return;
  const D = A.drops || {}, mul = MT.T.dropMul * (world.room && world.room.cashRoom && D.bill ? 1 : 1);
  const caps = world.pickups.filter(p => p.kind === 'capsule').length, cash = world.pickups.filter(p => PICKUPS[p.kind].cashy).length;
  for (const k in D) {
    let ch = D[k] * mul; if (k === 'bill' && world.room && world.room.cashRoom) ch *= 2;
    if (RNG.drops() >= ch) continue;
    if (k === 'capsule' && caps >= 3) continue;
    if (PICKUPS[k] && PICKUPS[k].cashy && cash >= 25) continue;
    if (k === 'key') continue;
    world.addPickup(makePickup(k, e.x, e.y));
  }
};
/** draw: bobbing sprites with a glow; capsules show their letter; the last 2.5 s blink */
MT.drawPickups = (r, world, t) => {
  for (const p of world.pickups) {
    if (p.ttl < 2.5 && Math.floor(t * 10) % 2) continue;
    const bob = p.z > 0 ? 0 : 2 + Math.sin(t * 4 + p.id) * 2, z = p.z + bob + (p.rise !== undefined ? (p.rise - 1) * 20 : 0) + (p.pedestal ? 12 : 0);
    if (p.pedestal) { r.shape('mt:pedestal', p.x, p.y, 0, { facing: t * 1.5 }); game.lights.add(p.x, p.y, 20, 36, .7, { color: '#fff6d0' }); }
    if (p.rise !== undefined && p.rise <= 0) continue;
    r.shadow(p.x, p.y, 5, .35);
    if (p.kind === 'capsule') {
      const W = WEAPONS[p.wpn] || WEAPONS.spread;
      r.sprite(p.x, p.y, z, SPR.tv, { glow: .5, scale: unzoom(r) });
      r.queue(p.x, p.y, z + 6, g => { const [sx, sy] = r.w(p.x, p.y, z + 7); E.font.text(g, W.letter, sx + 1, sy - 3, Math.floor(t * 6) % 2 ? W.color : '#ffffff', { align: 'center', outline: false }); }, { emissive: true, bias: 1 });
      game.lights.add(p.x, p.y, 6, 24, .5, { color: W.color });
    } else if (p.kind === 'statue') {
      r.sprite(p.x, p.y, z, SPR.statue, { glow: 1, scale: unzoom(r) }); game.lights.add(p.x, p.y, 10, 60, .9, { color: '#ffe080' });
      if (Math.random() < .2 && game.particles) game.particles.glints(p.x, p.y, 16, 1, '#fff6c0', 12);
    } else {
      const spr = p.kind === 'prize' ? [SPR.boxR, SPR.boxB, SPR.boxG][p.box || 0] : SPR[PICKUPS[p.kind].spr];
      r.sprite(p.x, p.y, z, spr, { glow: p.kind === 'key' ? 1 : .4, scale: unzoom(r) });
      if (p.kind === 'key') { game.lights.add(p.x, p.y, 8, 40, .8, { color: '#ffd84a' }); if (Math.random() < .15 && game.particles) game.particles.glints(p.x, p.y, 10, 1, '#fff6c0', 8); }
      if (p.kind === 'gold' || p.kind === 'case') if (Math.random() < .05 && game.particles) game.particles.glints(p.x, p.y, 8, 1, '#fff6c0', 6);
    }
  }
};
