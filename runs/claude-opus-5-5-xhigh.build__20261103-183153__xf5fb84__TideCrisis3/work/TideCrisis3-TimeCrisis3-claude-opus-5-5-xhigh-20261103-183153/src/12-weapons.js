/* 12-weapons: the weapon registry (def('weapon', ...)) and the player's firing: hitscan rays, shotgun pellets,
 * grenade-launcher rounds, ammo, magazines, the machine gun's bloom, switching. Numbers read tune.weapons live.
 * Reads the Sim (shots resolve through sim.resolveRay); emits 'shot', 'empty', 'switch' events. */
def('weapon', 'hg', { slot: 1, name: 'P9 MARLIN', kind: 'HANDGUN', icon: 'hg', mag: 9, rate: 6, auto: 3.5, sw: .20, recoil: .6, sfx: 'hg',
  dmg: () => tune.weapons.hgDamage, pellets: () => 1, spread: () => 0 });
def('weapon', 'mg', { slot: 2, name: 'RIPTIDE', kind: 'MACHINE GUN', icon: 'mg', pool: 240, pickup: 60, full: true, sw: .25, recoil: .25, sfx: 'mg',
  rate: () => tune.weapons.mgRate, dmg: () => tune.weapons.mgDamage, pellets: () => 1, spread: p => .6 + p.bloom * 2.4 });
def('weapon', 'sg', { slot: 3, name: 'BREAKWATER', kind: 'SHOTGUN', icon: 'sg', pool: 36, pickup: 8, rate: 1.5, sw: .30, recoil: 2.2, sfx: 'sg',
  dmg: () => .45, pellets: () => Math.round(tune.weapons.sgPellets), spread: () => tune.weapons.sgSpread, stagger: true, knock: true });
def('weapon', 'gl', { slot: 4, name: 'SQUALL', kind: 'GRENADE LAUNCHER', icon: 'gl', pool: 6, pickup: 2, rate: 1, sw: .35, recoil: 1.5, sfx: 'gl', projectile: true,
  dmg: () => tune.weapons.glDamage, pellets: () => 1, spread: () => 0 });
const WEAPONS = ['hg', 'mg', 'sg', 'gl'];
TC.WEAPONS = WEAPONS;

function hasAmmo(p, w) { return w === 'hg' || p.ammo[w] > 0; }
function cycleWeapon(sim, p, dir) {
  let i = WEAPONS.indexOf(p.weapon);
  for (let k = 0; k < 4; k++) { i = (i + dir + 4) % 4; if (hasAmmo(p, WEAPONS[i]) || sim.cheat(p, 'ammo')) { if (WEAPONS[i] !== p.weapon) selectWeapon(sim, p, WEAPONS[i]); return; } }
}
function selectWeapon(sim, p, w) {
  if (p.weapon === w || (!hasAmmo(p, w) && !sim.cheat(p, 'ammo'))) return false;
  p.weapon = w; p.switchT = reg('weapon', w).sw; p.stripT = .8; p.bloom = 0;
  sim.ev({ type: 'switch', p: p.id, w });
  return true;
}
TC.cycleWeapon = cycleWeapon;

/** the player's trigger this step (called by the Sim with the player's command) */
function weaponStep(sim, p, cmd, dt) {
  p.cool = Math.max(0, p.cool - dt); p.switchT = Math.max(0, p.switchT - dt); p.stripT = Math.max(0, p.stripT - dt);
  p.bloom = Math.max(0, p.bloom - dt * 2.2);
  if (cmd.select) selectWeapon(sim, p, WEAPONS[cmd.select - 1]);
  if (cmd.next) cycleWeapon(sim, p, 1);
  if (cmd.prev) cycleWeapon(sim, p, -1);
  const W = reg('weapon', p.weapon);
  if (p.c > .2) {   // in cover: no firing; a trigger pull switches to the next weapon with ammo (one-trigger players)
    if (cmd.firePressed && p.c >= .5) cycleWeapon(sim, p, 1);
    return;
  }
  if (p.switchT > 0 || p.cool > 0) return;
  const inf = sim.cheat(p, 'ammo');
  if (p.weapon === 'hg') {
    const auto = TC.autoFire !== false && cmd.fireDown && !cmd.firePressed && p.heldT > .18;
    if (!cmd.firePressed && !auto) return;
    if (p.mag <= 0 && !inf) { if (cmd.firePressed) { sim.ev({ type: 'empty', p: p.id }); p.cool = .15; } return; }
    if (!inf) p.mag--;
    p.cool = cmd.firePressed ? 1 / W.rate : 1 / W.auto;
    fireRound(sim, p, W);
  } else {
    const held = W.full ? cmd.fireDown : (cmd.firePressed || (cmd.fireDown && p.heldT > .1));
    if (!held) return;
    if (p.ammo[p.weapon] <= 0 && !inf) { sim.ev({ type: 'empty', p: p.id }); selectWeapon(sim, p, 'hg'); return; }
    if (!inf) p.ammo[p.weapon]--;
    p.cool = 1 / (typeof W.rate === 'function' ? W.rate() : W.rate);
    fireRound(sim, p, W);
    if (!inf && p.ammo[p.weapon] <= 0) { p.switchBack = .3; }
  }
}
TC.weaponStep = weaponStep;

/** one trigger pull: rays (or a launched round) from the player's camera through the aim */
function fireRound(sim, p, W) {
  const cam = sim.cameraFor(p.id), n = W.pellets(), spread = W.spread(p) * DEG, results = [];
  p.stats.shots++; p.recoil = W.recoil;
  if (W.projectile) {
    const ray = aimRay(cam, p.aim[0], p.aim[1]);
    sim.launch({ kind: 'pgl', owner: p.id, pos: V3.add(ray.o, V3.mul(ray.d, 6)), vel: V3.add(V3.mul(ray.d, 640), [0, 0, 40]), gravity: 240, life: 1.4, r: 2 });
    sim.ev({ type: 'shot', p: p.id, w: p.weapon, from: [cam.x, cam.y, cam.z - 3], to: V3.add(ray.o, V3.mul(ray.d, 80)), hits: [] });
    return;
  }
  let anyHit = false;
  for (let k = 0; k < n; k++) {
    let ax = p.aim[0], ay = p.aim[1];
    if (spread > 0) { const a = sim.rng('spread') * TAU, r = Math.sqrt(sim.rng('spread')) * Math.tan(spread) / Math.tan(cam.fov * DEG / 2); ax += Math.cos(a) * r; ay += Math.sin(a) * r; }
    const ray = aimRay(cam, ax, ay), res = sim.resolveRay(ray, p, W, k === 0);
    results.push(res); if (res && res.scoring) anyHit = true;
  }
  if (p.weapon === 'mg') p.bloom = Math.min(1, p.bloom + .18);
  if (!anyHit) { if (p.chain > 0) sim.ev({ type: 'chainbreak', p: p.id }); p.chain = 0; }
  sim.ev({ type: 'shot', p: p.id, w: p.weapon, from: [cam.x, cam.y, cam.z - 4], to: results.map(r => r ? r.at : null), hits: results.map(r => r && r.kind) });
}
TC.fireRound = fireRound;
