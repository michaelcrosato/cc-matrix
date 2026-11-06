// Shooting, melee, explosions, projectiles. The area owns state; this owns the rules.
import { THREE } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { WEAPONS } from '../data/weapons.js';
import { S } from './enemy.js';
import { angleDiff, raySphere, clamp } from './geom.js';

const { Vector3 } = THREE;
const _o = new Vector3(), _d = new Vector3();

export class Combat {
  constructor(area) { this.area = area; this.projectiles = []; this.fires = []; this.grenades = []; this.pins = []; }
  /** Camera ray with the laser's sway. */
  aimRay(out = {}) {
    const a = this.area, c = a.cam, w = a.player.weapon;
    const k = w.sway * TUNING.laserSway * 0.003;
    const t = a.time;
    const yaw = c.yaw + (a.player.aiming ? Math.sin(t * 1.7) * k + Math.sin(t * 3.1) * k * 0.5 : 0);
    const pitch = c.pitch + (a.player.aiming ? Math.cos(t * 2.3) * k : 0) + a.player.recoil * 0.03;
    out.ox = a.camPos.x; out.oy = a.camPos.y; out.oz = a.camPos.z;
    const cp = Math.cos(pitch);
    out.dx = Math.sin(yaw) * cp; out.dy = Math.sin(pitch); out.dz = Math.cos(yaw) * cp;
    return out;
  }
  /** Nearest thing along a ray: world, enemy zone, shootable. { kind, t, enemy?, zone?, obj? } */
  trace(r, maxT = 80, o = {}) {
    const a = this.area;
    let best = { kind: 'none', t: maxT };
    _o.set(r.ox, r.oy, r.oz); _d.set(r.dx, r.dy, r.dz);
    const hit = a.ctx.physics.castRay(_o, _d, maxT, ['player', 'enemy']);
    if (hit) best = { kind: 'world', t: hit.distance, collider: hit.collider, normal: hit.normal };
    for (const e of a.enemies) {
      if (e.dead && !o.corpses) continue;
      if (e === o.skip || (o.skipSet && o.skipSet.has(e))) continue;
      if (e.state === S.WAIT) continue;
      const z = e.rayZones(r.ox, r.oy, r.oz, r.dx, r.dy, r.dz, best.t);
      if (z && z.t < best.t) best = { kind: 'enemy', t: z.t, enemy: e, zone: z.zone };
    }
    for (const s of a.shootables()) {
      const t = raySphere(r.ox, r.oy, r.oz, r.dx, r.dy, r.dz, s.pos.x, s.pos.y, s.pos.z, s.r);
      if (t >= 0 && t < best.t) best = { kind: 'shootable', t, obj: s };
    }
    if (a.boss?.traceWeak) { const w = a.boss.traceWeak(r, best.t); if (w) best = { kind: 'weak', t: w.t, obj: w }; }
    best.point = new Vector3(r.ox + r.dx * best.t, r.oy + r.dy * best.t, r.oz + r.dz * best.t);
    return best;
  }
  /** The player's shot. */
  firePlayer() {
    const a = this.area, p = a.player, run = a.run, w = p.weapon, st = run.stat(w.id);
    const rate = TUNING.fireRate;
    p.fireCd = st.interval / rate;
    if (!a.dev.ammo) run.mags[w.id] = (run.mags[w.id] ?? 0) - 1; run.stats.shots++;
    const ray = this.aimRay({});
    p.recoil = 1;
    const muz = p.muzzle(new Vector3());
    a.fx.muzzle(muz); a.ctx.engine.shake.add(w.id === 'scatter' ? 0.2 : 0.12);
    a.audio(w.id === 'pistol' ? 'pistol' : w.id === 'scatter' ? 'scatter' : w.id === 'rifle' ? 'rifle' : 'harpoon');
    a.rumble?.(0.4, 0.6, 80);
    const pellets = w.pellets;
    const spread = (w.cone * (st.perk && w.id === 'scatter' ? 1.5 : 1)) * Math.PI / 180;
    let anyHit = false, headHit = false;
    const pierceAll = st.perk && w.id === 'rifle';
    for (let i = 0; i < pellets; i++) {
      let r = ray;
      if (spread > 0) {
        r = { ...ray };
        const ang = a.rng.range(0, Math.PI * 2), rad = Math.sqrt(a.rng.range(0, 1)) * spread;
        // perturb in a plane perpendicular to the ray
        const up = Math.abs(ray.dy) > 0.95 ? [1, 0, 0] : [0, 1, 0];
        const rx = ray.dy * up[2] - ray.dz * up[1], ry = ray.dz * up[0] - ray.dx * up[2], rz = ray.dx * up[1] - ray.dy * up[0];
        const rl = Math.hypot(rx, ry, rz) || 1; const Rx = rx / rl, Ry = ry / rl, Rz = rz / rl;
        const Ux = ray.dy * Rz - ray.dz * Ry, Uy = ray.dz * Rx - ray.dx * Rz, Uz = ray.dx * Ry - ray.dy * Rx;
        r.dx += (Rx * Math.cos(ang) + Ux * Math.sin(ang)) * rad; r.dy += (Ry * Math.cos(ang) + Uy * Math.sin(ang)) * rad; r.dz += (Rz * Math.cos(ang) + Uz * Math.sin(ang)) * rad;
        const l = Math.hypot(r.dx, r.dy, r.dz); r.dx /= l; r.dy /= l; r.dz /= l;
      }
      const skip = new Set();
      let remaining = pierceAll ? 8 : (w.pierce ? 1 + w.pierce : 1);
      for (let k = 0; k < remaining; k++) {
        const hit = this.trace(r, 80, { skipSet: skip });
        const res = this.applyShot(hit, w, st, r, pellets);
        if (res.hit) anyHit = true; if (res.head) headHit = true;
        if (hit.kind === 'enemy') { skip.add(hit.enemy); continue; }
        break;
      }
    }
    if (anyHit) run.stats.hits++;
    if (headHit) { run.stats.heads++; }
    if ((run.mags[w.id] ?? 0) <= 0 && run.ammo(w.id) > 0 && !p.reloading) a.ctx.tweens.call(0.25, () => { if (!p.reloading && (run.mags[w.id] ?? 0) <= 0) p.startReload(); });
  }
  applyShot(hit, w, st, r, pellets) {
    const a = this.area;
    const out = { hit: false, head: false };
    const dmgBase = st.damage * (w.pellets > 1 ? falloff(hit.t) : 1) * (a.oneHit ? 1000 : 1);
    if (hit.kind === 'enemy') {
      const e = hit.enemy;
      const headPop = hit.zone === 'head' && w.id === 'pistol' && a.rng.chance(st.perk ? 0.3 : 0.06);
      const res = e.takeHit({ amount: headPop ? 9999 : dmgBase, zone: hit.zone, fromX: a.player.x, fromZ: a.player.z, pellets: w.pellets > 1, knock: w.id === 'scatter' ? 1.6 : 0.25, headPop, source: w.id });
      out.hit = !res.blocked; out.head = hit.zone === 'head';
      a.audio(hit.zone === 'head' ? 'headhit' : 'hit', e.x, e.z);
      if (res.killed && headPop) a.headPop(e);
      if (hit.zone === 'head' && !res.killed) a.ctx.engine.hitstop(0.03);
      if (res.killed && w.id === 'harpoon') { /* pinned handled below */ }
      if (w.pin && !res.killed) { e.pinned = w.pin; e.setState(S.KNEEL, w.pin); a.dropBolt(hit.point); }
      else if (w.pin) a.dropBolt(hit.point);
      if (w.id === 'scatter' && st.perk) this.pushNear(e, a.player, 3);
    } else if (hit.kind === 'shootable') { hit.obj.onShot?.(hit, w); out.hit = true; }
    else if (hit.kind === 'weak') { a.boss.shootWeak(hit.obj, dmgBase, w); out.hit = true; }
    else if (hit.kind === 'world') {
      a.fx.ctx.particles.burst('spark', hit.point); a.fx.scorch(hit.point, hit.normal ? new Vector3(hit.normal.x, hit.normal.y, hit.normal.z) : undefined);
      const owner = a.colliderOwner.get(hit.collider?.handle); if (owner?.onShot) owner.onShot(hit, w);
      if (w.pin) a.dropBolt(hit.point);
    }
    return out;
  }
  pushNear(e, p, r) {
    for (const o of this.area.enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.z - e.z) < r) o.kx += (o.x - p.x) * 1.2, o.kz += (o.z - p.z) * 1.2;
  }
  /** Context melee: the roundhouse kick. */
  kick(target) {
    const a = this.area, p = a.player;
    if (p.state !== 'free') return;
    p.doMelee('kick', 0.6); p.invuln = Math.max(p.invuln, 0.5);
    a.audio('whoosh');
    a.run.stats.kicks++;
    a.later(0.18, () => {
      const cone = Math.PI / 3, R = TUNING.kickRadius;
      let n = 0;
      for (const e of a.enemies) {
        if (e.dead || e.state === S.WAIT) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z); if (d > R) continue;
        if (Math.abs(angleDiff(p.yaw, Math.atan2(e.x - p.x, e.z - p.z))) > cone && e !== target) continue;
        const dmg = e === target ? 40 : TUNING.kickDamage;
        e.takeHit({ amount: dmg, zone: 'torso', fromX: p.x, fromZ: p.z, raw: true, mult: 1, source: 'kick' });
        if (!e.dead) { e.knockdown(2.2, p.x, p.z); if (e.type === 'monk') { e.shieldUp = false; } }
        n++;
      }
      a.ctx.engine.hitstop(0.05); a.ctx.engine.shake.add(0.35); a.audio('kick'); a.rumble?.(0.8, 0.3, 120);
      if (a.rng.chance(0.5)) a.bark('MAX', a.rng.pick(['DEDUCTIBLE.', 'EXCESS APPLIES.']), 2);
      if (a.dame?.alive && n > 0 && a.rng.chance(0.4)) a.bark('DAME', 'VULGAR. DO IT AGAIN.', 2.5);
    });
  }
  takedown(target) {
    const a = this.area, p = a.player;
    if (p.state !== 'free') return;
    p.doMelee('throw', 0.8); p.invuln = Math.max(p.invuln, 0.6); a.run.stats.kicks++;
    a.later(0.3, () => {
      for (const e of a.enemies) {
        if (e.dead || e.state === S.WAIT) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (e === target) { e.takeHit({ amount: 60, zone: 'torso', fromX: p.x, fromZ: p.z, raw: true, source: 'takedown' }); if (!e.dead) e.knockdown(2.2, p.x, p.z); }
        else if (d < 1.5) { if (!e.dead) e.knockdown(2, p.x, p.z); }
      }
      a.ctx.engine.hitstop(0.05); a.ctx.engine.shake.add(0.3); a.audio('kick');
    });
  }
  knife() {
    const a = this.area, p = a.player;
    p.doMelee('knife', 0.4); a.audio('knife');
    a.later(0.12, () => {
      for (const e of a.enemies) {
        if (e.dead || e.state === S.WAIT) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z); if (d > 2) continue;
        if (Math.abs(angleDiff(p.yaw, Math.atan2(e.x - p.x, e.z - p.z))) > 0.9) continue;
        e.takeHit({ amount: a.oneHit ? 8000 : 8, zone: 'torso', fromX: p.x, fromZ: p.z, raw: true, knife: true, source: 'knife' });
      }
      for (const b of a.level.breakables) if (!b.broken && Math.hypot(b.x - p.x, b.z - p.z) < 1.8) a.breakCrate(b);
    });
  }
  explode(x, z, o = {}) {
    const a = this.area, R = o.radius ?? 3;
    const pt = new Vector3(x, 0.5, z);
    a.fx.boom(pt); a.ctx.engine.shake.add(o.shake ?? 0.5); a.audio(o.brine ? 'barrel' : 'depth', x, z);
    a.fx.scorch(pt);
    a.ctx.lights.request({ position: [x, 1, z], color: 0xffa040, intensity: 14, radius: 9, lifetime: 0.25 });
    for (const e of [...a.enemies]) {
      if (e.dead || e.state === S.WAIT || e === o.owner && !o.hurtOwner) continue;
      const d = Math.hypot(e.x - x, e.z - z); if (d > R) continue;
      if (o.hurtEnemies === false) continue;
      const f = 1 - d / (R * 1.4);
      e.takeHit({ amount: (o.dmg ?? 60) * f, zone: 'torso', fromX: x, fromZ: z, explosive: true, raw: true, knock: 3, source: 'explosion' });
      if (!e.dead && (o.stagger ?? true)) e.knockdown(2, x, z);
    }
    const p = a.player; const dp = Math.hypot(p.x - x, p.z - z);
    if (dp < R && o.hurtPlayer !== false && !(o.owner === 'player')) a.hurtPlayer((o.dmg ?? 60) * (1 - dp / (R * 1.4)) * 0.5, x, z, 'blast');
    else if (dp < R && o.owner === 'player') a.hurtPlayer((o.dmg ?? 60) * (1 - dp / (R * 1.4)) * 0.5, x, z, 'blast');
    if (a.dame?.alive) { const dd = Math.hypot(a.dame.x - x, a.dame.z - z); if (dd < R) a.dame.hurt(20, x, z); }
    for (const b of a.level.breakables) if (!b.broken && Math.hypot(b.x - x, b.z - z) < R) a.ctx.tweens.call(0.1, () => a.breakCrate(b));
    for (const d of a.level.doors) if (!d.open && d.kind === 'D' && Math.hypot(d.x - x, d.z - z) < R) a.openDoor(d, true);
    a.boss?.onExplosion?.(x, z, R);
    if (o.fire) this.fires.push({ x, z, t: 3, r: Math.max(1.4, R * 0.7) });
  }
  spawn(pr) {
    const a = this.area;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...(pr.size || [0.25, 0.25, 0.25])), a.mats.proj[pr.kind] || a.mats.proj.default);
    mesh.position.set(pr.x, pr.y ?? 1.2, pr.z); a.ctx.scene.add(mesh);
    const dx = pr.tx - pr.x, dz = pr.tz - pr.z, dist = Math.hypot(dx, dz) || 1;
    const T = dist / (pr.speed || 8);
    const p = { ...pr, mesh, vx: dx / T, vz: dz / T, t: 0, T, life: 6, y: pr.y ?? 1.2 };
    if (pr.arc) p.vy = (0 - p.y + 4.9 * T * T) / T; else p.vy = 0;
    if (pr.kind === 'harpoon') { p.vy = (1.0 - p.y) / T; }
    this.projectiles.push(p);
    return p;
  }
  update(dt) {
    const a = this.area, p = a.player;
    for (const pr of [...this.projectiles]) {
      pr.t += dt; pr.life -= dt;
      pr.x += pr.vx * dt; pr.z += pr.vz * dt;
      if (pr.arc) { pr.vy -= 9.8 * dt; pr.y += pr.vy * dt; } else pr.y += pr.vy * dt;
      pr.mesh.position.set(pr.x, pr.y, pr.z); pr.mesh.rotation.y += dt * 6;
      let done = false;
      if (pr.fromPlayer) {
        if (pr.t >= pr.fuse) { this.detonate(pr); done = true; }
        else if (pr.y <= 0.15) { pr.y = 0.15; pr.vx *= 0.9; pr.vz *= 0.9; pr.vy = 0; }
      } else if (pr.kind === 'net') {
        if (Math.hypot(pr.x - p.x, pr.z - p.z) < 0.7 && pr.y < 2.2) { p.netT = 3; a.hurtPlayer(6, pr.x, pr.z, 'net'); a.audio('net'); done = true; }
        else if (pr.life <= 0 || !a.level.openAt(pr.x, pr.z) && a.level.charAt(pr.x, pr.z) !== '~') done = true;
      } else if (pr.kind === 'bottle') {
        if (pr.y <= 0.1 || pr.t > pr.T + 0.05) { a.audio('bottleSmash', pr.x, pr.z); this.explode(pr.x, pr.z, { radius: 1.6, dmg: 18, fire: true, shake: 0.2, owner: pr.owner, hurtEnemies: false }); done = true; }
      } else if (pr.kind === 'harpoon') {
        if (Math.hypot(pr.x - p.x, pr.z - p.z) < 0.6 && pr.y < 2) { a.hurtPlayer(22, pr.x, pr.z, 'harpoon'); done = true; }
        else if (pr.life <= 0 || pr.t > pr.T + 0.6) done = true;
      }
      if (done) { pr.mesh.removeFromParent(); this.projectiles.splice(this.projectiles.indexOf(pr), 1); }
    }
    for (const f of [...this.fires]) {
      f.t -= dt;
      if (Math.floor((f.t + dt) * 4) !== Math.floor(f.t * 4)) a.ctx.particles.burst('ember', new Vector3(f.x + a.rng.range(-f.r / 2, f.r / 2), 0.2, f.z + a.rng.range(-f.r / 2, f.r / 2)));
      if (Math.hypot(p.x - f.x, p.z - f.z) < f.r) a.hurtPlayer(15 * dt, f.x, f.z, 'fire', true);
      for (const e of a.enemies) if (!e.dead && e.state !== S.WAIT && Math.hypot(e.x - f.x, e.z - f.z) < f.r) { e.hp -= 15 * dt; if (e.hp <= 0) e.die({ source: 'fire' }); }
      if (f.t <= 0) this.fires.splice(this.fires.indexOf(f), 1);
    }
  }
  /** Shootable projectile targets. */
  projectileTargets() {
    return this.projectiles.filter((p) => !p.fromPlayer).map((p) => ({ pos: new Vector3(p.x, p.y, p.z), r: 0.4, kind: 'proj', onShot: () => this.shootProjectile(p) }));
  }
  shootProjectile(pr) {
    const a = this.area; if (!this.projectiles.includes(pr)) return;
    pr.mesh.removeFromParent(); this.projectiles.splice(this.projectiles.indexOf(pr), 1);
    if (pr.kind === 'bottle') { a.audio('bottleSmash', pr.x, pr.z); this.explode(pr.x, pr.y < 0.5 ? pr.z : pr.z, { radius: 1.6, dmg: 18, fire: true, shake: 0.2, hurtEnemies: true, owner: null }); }
    else a.fx.sparks(new Vector3(pr.x, pr.y, pr.z));
  }
  throwGrenade() {
    const a = this.area, p = a.player, run = a.run;
    const g = run.grenade && run.case.count(run.grenade) > 0 ? run.grenade : run.grenades()[0];
    if (!g || p.state !== 'free') return;
    run.grenade = g; run.case.take(g, 1);
    const ray = this.aimRay({}); const hit = this.trace(ray, 22);
    const m = p.muzzle(new Vector3());
    p.doMelee('throwg', 0.5); a.audio('whoosh');
    const pr = this.spawn({ kind: g, x: m.x, y: m.y, z: m.z, tx: hit.point.x, tz: hit.point.z, speed: 11, arc: true, fromPlayer: true, fuse: g === 'depth' ? 1.5 : g === 'flare' ? 0.9 : 0.8, size: [0.2, 0.3, 0.2] });
    pr.gren = g;
  }
  detonate(pr) {
    const a = this.area;
    if (pr.gren === 'depth') this.explode(pr.x, pr.z, { radius: 4, dmg: 80, owner: 'player', shake: 0.7 });
    else if (pr.gren === 'bottle') { a.audio('bottleSmash', pr.x, pr.z); this.explode(pr.x, pr.z, { radius: 1.8, dmg: 10, fire: true, owner: 'player', hurtPlayer: false, shake: 0.2 }); }
    else if (pr.gren === 'flare') {
      a.audio('flare', pr.x, pr.z); a.ctx.lights.request({ position: [pr.x, 1.2, pr.z], color: 0xffffff, intensity: 18, radius: 12, lifetime: 4 });
      a.fx.ctx.particles.burst('spark', new Vector3(pr.x, 0.6, pr.z), { count: 18 });
      for (const e of a.enemies) {
        if (e.dead || e.state === S.WAIT) continue;
        if (Math.hypot(e.x - pr.x, e.z - pr.z) < 6) { if (e.type === 'limpet') e.die({ source: 'flare' }); else e.blind = 4; }
      }
    }
  }
}
export function falloff(t) { return t <= 9 ? 1 : clamp(1 - (t - 9) / 12, 0.15, 1); }
