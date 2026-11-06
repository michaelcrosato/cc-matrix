// The bot: plays the whole game through the same Intent a player uses. Attract mode and the playthrough test share it.
import { THREE } from '../../pixel-engine.js';
import { ITEMS } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';
import { buy, tune } from '../screens/shop.js';
import { ammoOf, arrange, bestHerb, ownedWeapons, sellTreasure, statsOf } from '../core/run.js';
const o = new THREE.Vector3(), d = new THREE.Vector3();
const doorOf = (a, id) => a.level.doors.find((x) => x.id === id);
export class Bot {
  constructor(a, opt = {}) { this.a = a; this.opt = opt; this.stuck = 0; this.last = new THREE.Vector3(); this.pressCD = 0; this.path = null; this.pathT = 0; this.turn = 0; this.log = []; this.shopDone = new Set(); this.goalT = 0; this.t = 0; this.strafe = 0; }
  fixed(dt, i) {
    const a = this.a, P = a.player; this.t += dt; this.pressCD -= dt; this.pathT -= dt;
    for (const k of Object.keys(i)) { if (typeof i[k] === 'boolean') i[k] = false; } i.moveX = i.moveY = 0; i.slot = -1; i.absYaw = i.absPitch = null;
    if (P.dead || a.gameOverT) return;
    if (a.qte.active) { if (a.qte.owner === P) this.qte(a.qte, i); return; }
    if (P.locked || a.cutscene) return;
    if (P.action) return;
    // Upkeep
    const run = a.run; if ((run.health < run.maxHealth * 0.4 || (a.dame?.active && a.dame.hp < a.dame.maxHp * 0.3)) && bestHerb(run)) { i.heal = true; }
    if (!P.dameMode) { const W = P.stats, st = P.wstate; if (st.ammo === 0 && P.reloadT <= 0 && (ammoOf(run, run.weapon) > 0 || a.infiniteAmmo)) i.reload = true; else if (st.ammo === 0 && ammoOf(run, run.weapon) === 0) { const list = ownedWeapons(run).filter((w) => (run.weapons[w].ammo > 0 || ammoOf(run, w) > 0)); if (list[0]) P.setWeapon(list[0]); } else this.pickWeapon(P, run); }
    // Kick prompts come first.
    const best = a.interact.best; if (best?.enemy && this.pressCD <= 0) { i.action = true; this.pressCD = 0.4; return; }
    if (P.dameMode) return this.crypt(dt, i);
    for (const f of a.fires) { const dx = P.pos.x - f.pos.x, dz = P.pos.z - f.pos.z, L = Math.hypot(dx, dz); if (L < f.r + 0.6) { this.moveDir(dx / (L || 1), dz / (L || 1), i, true); return; } }
    for (const q of a.projectiles) { if (q.kind !== 'bottle' && q.kind !== 'anchor' && q.kind !== 'glob') continue; const fall = (q.life > 0 ? q.life : 0); const lx = q.pos.x + q.vel.x * fall, lz = q.pos.z + q.vel.z * fall; const dx = P.pos.x - lx, dz = P.pos.z - lz, L = Math.hypot(dx, dz); if (L < 2.4) { this.moveDir((dx || 1) / (L || 1), dz / (L || 1), i, true); return; } }
    if (a.boss?.overZone && !a.boss.dead && a.boss.reload <= 0 && a.boss.overZone() && Math.hypot(a.boss.pos.x - a.boss.px, a.boss.pos.z - a.boss.railZ) < 2.3) i.command = true;
    if (a.boss?.locks && a.boss.phase === 2 && a.boss.locks.every((l) => l.dead)) { this.pursue({ x: a.boss.pos.x, z: a.boss.pos.z + 3.2, r: 2.6, press: true, pressAny: true }, dt, i); return; }
    if (a.boss?.locks && a.boss.phase === 3) { const c = a.enemies.find((x) => x.crawler && !x.dead && !x.latched && x.pos.distanceTo(P.pos) < 7); if (c) { this.fight({ enemy: c, aim: c.zones.head, dist: c.pos.distanceTo(P.pos) }, dt, i); return; } }
    if (a.id === 'yard' && !a.boss && !this.opt.attract) { const v0 = this.visit('y0'); if (v0) { this.pursue(v0, dt, i); return; } }
    const B = a.boss; if (B && !B.dead && B.pos && B.phase !== 3) { const dB = B.pos.distanceTo(P.pos); if (B.state === 'CHARGEWIND' || B.state === 'CHARGE' || (B.state === 'THROW')) { const fx = Math.sin(B.yaw), fz = Math.cos(B.yaw), side = (P.pos.x - B.pos.x) * -fz + (P.pos.z - B.pos.z) * fx >= 0 ? 1 : -1; let mx = -fz * side, mz = fx * side; if (!a.level.enemyCanStand(P.pos.x + mx * 1.2, P.pos.z + mz * 1.2, 0)) { mx = -mx; mz = -mz; } this.moveDir(mx, mz, i, true); return; } }
    { const h = run.health < run.maxHealth * 0.55 ? a.drops.find((d) => d.id && ITEMS[d.id]?.kind === 'herb' && !d.skip) : null; if (h) { h.tries = (h.tries ?? 0) + 1; if (h.tries > 300) h.skip = true; this.pursue({ x: h.x, z: h.z, r: 1.4, drop: h }, dt, i); return; } }
    const rushing = a.tide && a.tide.gate; const tgt = this.hasAmmo() && !rushing ? this.chooseTarget() : null; const lootFirst = !this.hasAmmo() && this.lootGoal(); if (lootFirst) { this.pursue(lootFirst, dt, i); return; } if (tgt) { this.fight(tgt, dt, i); return; } if (!this.hasAmmo() && a.enemies.some((x) => !x.dead && x.pos.distanceTo(P.pos) < 5)) { this.flee(dt, i); return; }
    const lootG = this.opt.attract || (this.bossy() && this.hasAmmo()) ? null : this.lootGoal(); if (lootG) { this.pursue(lootG, dt, i); return; }
    const g = a.def.botGoal?.(a, this) ?? BOT_GOALS[a.id]?.(a, this) ?? (this.opt.attract ? this.wander() : null); if (g) this.pursue(g, dt, i);
  }
  pickWeapon(P, run) { const owned = ownedWeapons(run); const a = this.a; const pick = (id) => { if (owned.includes(id) && (run.weapons[id].ammo > 0 || ammoOf(run, id) > 0) && run.weapon !== id) P.setWeapon(id); }; if (this.bossy()) { if (owned.includes('rifle')) pick('rifle'); else if (owned.includes('scatter')) pick('scatter'); return; } const near = a.enemies.filter((e) => !e.dead && e.pos.distanceTo(P.pos) < 5).length; if (near >= 3 && owned.includes('scatter') && (run.weapons.scatter.ammo > 0 || ammoOf(run, 'scatter') > 0)) pick('scatter'); else if (near < 2) pick('pistol'); }
  lootGoal() { const a = this.a, P = a.player; let best = null, bd = 14; for (const it of a.interact.items) { if (it.verb !== 'OPEN' || it.floor !== P.floor) continue; const k = Math.hypot(it.x - P.pos.x, it.z - P.pos.z); if (k < bd) { const c = a.navOf(P.floor, 0).path([P.pos.x, 0, P.pos.z], [it.x, 0, it.z]); if (c) { bd = k; best = { x: it.x, z: it.z, it }; } } } if (best) { best.it.tries = (best.it.tries ?? 0) + 1; if (best.it.tries < 400) return { x: best.x, z: best.z, r: 1.1, press: true, pressAny: true }; } best = null; for (const d of a.drops) { if (d.floor !== P.floor || d.id === 'ammo_bolts') continue; const k = Math.hypot(d.x - P.pos.x, d.z - P.pos.z); if (k >= bd || d.skip) continue; if (!d.money && !a.level.enemyCanStand(d.x, d.z, P.floor)) continue; best = d; bd = k; } if (!best) return null; best.tries = (best.tries ?? 0) + 1; if (best.tries > 240) { best.skip = true; return null; } return { x: best.x, z: best.z, r: best.money ? 1.2 : 1.4, press: !best.money, pressAny: false, drop: best }; }
  kite() { const a = this.a, P = a.player; if (!this.wp || P.pos.distanceTo(this.wp) < 3 || this.t > this.wpT) { const pts = [[20, 16], [35, 15], [47, 22], [36, 29], [20, 30], [18, 15]]; this.ki = ((this.ki ?? -1) + 1) % pts.length; const [c, r] = pts[this.ki]; this.wp = new THREE.Vector3(a.level.wx(c), 0, a.level.wz(r)); this.wpT = this.t + 12; } return { x: this.wp.x, z: this.wp.z, r: 1.5 }; }
  /** Walk to Mr. Fathom and talk. The test harness shops through the same functions the Shop uses. */
  visit(key) { const a = this.a, P = a.player, f = a.fathoms[0]; if (!f || this.shopDone.has(key)) return null; this.shopKey = key; return { x: f.x, z: f.z, r: 2, press: true, pressAny: true }; }
  onShop() { if (this.shopKey) this.shopDone.add(this.shopKey); botShop(this.a, this); }
  hasAmmo() { const a = this.a, r = a.run; return a.infiniteAmmo || ownedWeapons(r).some((w) => r.weapons[w].ammo > 0 || ammoOf(r, w) > 0); }
  bossy() { const b = this.a.boss; return b && !b.dead; }
  chooseTarget() {
    const a = this.a, P = a.player; let best = null, bs = -1e9;
    if (this.bossy() && a.boss.botTarget !== null) { const parts = this.bossPart(); if (parts) return parts; }
    for (const s of a.shootables) { if (s.dead) continue; if (s.kind === 'mine' || s.kind === 'rock' || s.kind === 'glob') { const dd = s.pos.distanceTo(P.pos); if (dd < 30 && 40 - dd > bs) { bs = 40 - dd; best = { aim: s.pos, shootable: s, dist: dd }; } } }
    if (best) return best;
    for (const e of a.enemies) { if (e.dead || e.floor !== P.floor) continue; const dist = e.pos.distanceTo(P.pos); if (dist > (a.tide ? 8 : 22)) continue; if (!a.los(P.pos, e.pos, P.floor)) continue; if (e.state === 'WORK' && dist > 10) continue; let s = -dist; if (e.type === 'carrier') s += 30; if (e.def.saw) s += 6; if (s > bs) { bs = s; best = e; } }
    return best ? { enemy: best, aim: this.aimPoint(best), dist: best.pos.distanceTo(P.pos) } : null;
  }
  aimPoint(e) { const z = e.zones; if (e.crawler) return z.head; if (e.type === 'knight') return z.head; if (e.hasShield) return z.armLb ?? z.head; return z.head; }
  bossPart() { const a = this.a, b = a.boss, P = a.player; if (b.sacs) { if (b.state !== 'KNEEL') return null; const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw); if ((P.pos.x - b.pos.x) * fx + (P.pos.z - b.pos.z) * fz > -1) return null; const s = b.sacs.find((x) => !x.dead); return s ? { aim: s.pos, part: true, boss: true, dist: b.pos.distanceTo(P.pos) } : null; } if (b.valves) { if (b.phase === 1) { let bv = null; for (const v of b.valves) if (!v.dead && (!bv || v.hp < bv.hp)) bv = v; return bv ? { aim: bv.pos, part: true, boss: true, dist: bv.pos.distanceTo(P.pos) } : null; } if (b.phase === 2) { const l = b.locks.find((x) => !x.dead); if (l) return { aim: l.pos, part: true, boss: true, dist: l.pos.distanceTo(P.pos) }; return null; } if (b.phase === 3) { const q = !b.mic.dead ? b.mic : b.eye; return { aim: q.pos, part: true, boss: true, dist: q.pos.distanceTo(P.pos) }; } } return null; }
  fight(t, dt, i) {
    const a = this.a, P = a.player, A = t.aim; const dist = t.dist; const e = t.enemy;
    // Back off if crowded. Knife limpets. Run when surrounded.
    const close = a.enemies.filter((x) => !x.dead && !x.crawler && x.state !== 'STUN' && x.state !== 'KNEEL' && x.pos.distanceTo(P.pos) < 2.6).length;
    if (P.limpets > 0 && a.interact.best) { i.action = true; return; }
    const stun = a.enemies.find((x) => !x.dead && (x.kickable() || x.takedownable()) && x.pos.distanceTo(P.pos) < 6);
    if (stun && !close) { const L = Math.hypot(stun.pos.x - P.pos.x, stun.pos.z - P.pos.z) || 1; this.moveDir((stun.pos.x - P.pos.x) / L, (stun.pos.z - P.pos.z) / L, i, true); return; }
    if (close >= 1 || (e && e.def.saw && dist < 4.5) || (a.boss && a.boss.pos && !a.boss.dead && a.boss.pos.distanceTo(P.pos) < 5.5 && !['KNEEL', 'SAG', 'MOTHER'].includes(a.boss.state))) { this.flee(dt, i); return; }
    this.aimAt(A, i); i.aim = true; const P2 = P; P2.aimRay(o, d); const to = A.clone().sub(o), L = to.length(); to.normalize(); const dot = to.dot(d); const tol = 1 - ((t.part ? 0.22 : 0.13) / Math.max(1, L)) ** 2 / 2; if (P.aiming && dot > tol && P.fire <= 0 && P.reloadT <= 0) { i.fire = true; i.firePressed = true; }
    if (P.wstate.ammo === 0) i.aim = false;
    this.stuck = 0;
  }
  aimAt(p, i) { const P = this.a.player; const base = P.rigPos ?? P.pos; const dx = p.x - base.x, dz = p.z - base.z, dy = p.y - base.y, h = Math.hypot(dx, dz); const yaw = Math.atan2(dx, dz); const pitch = Math.atan2(dy, h); let ddy = yaw - P.camYaw; while (ddy > Math.PI) ddy -= 2 * Math.PI; while (ddy < -Math.PI) ddy += 2 * Math.PI; const rate = this.opt.attract ? 0.3 : 0.25; i.absYaw = P.camYaw + ddy * rate; i.absPitch = P.camPitch + (Math.max(-0.7, Math.min(0.7, pitch)) - P.camPitch) * rate; }
  flee(dt, i) {
    const a = this.a, P = a.player; let sx = 0, sz = 0; for (const e of a.enemies) { if (e.dead) continue; const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, L = Math.hypot(dx, dz); if (L < 7 && L > 0.01) { sx += dx / (L * L); sz += dz / (L * L); } } if (a.boss?.pos) { const dx = P.pos.x - a.boss.pos.x, dz = P.pos.z - a.boss.pos.z, L = Math.hypot(dx, dz); if (L < 8) { sx += (dx / (L * L)) * 3; sz += (dz / (L * L)) * 3; } }
    let L = Math.hypot(sx, sz) || 1; sx /= L; sz /= L; for (const ang of [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2]) { const c = Math.cos(ang), s = Math.sin(ang), rx = sx * c - sz * s, rz = sx * s + sz * c; if (a.level.enemyCanStand(P.pos.x + rx * 1.2, P.pos.z + rz * 1.2, P.floor)) { sx = rx; sz = rz; break; } } this.moveDir(sx, sz, i, true);
  }
  moveDir(dx, dz, i, run) { const a = this.a, P = a.player, want = Math.atan2(dx, dz); let dy = want - P.camYaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; i.absYaw = P.camYaw + dy * 0.15; i.absPitch = P.camPitch * 0.9; const fx = Math.sin(P.camYaw), fz = Math.cos(P.camYaw), rx = -Math.cos(P.camYaw), rz = Math.sin(P.camYaw); i.moveY = dx * fx + dz * fz; i.moveX = dx * rx + dz * rz; i.run = !!run; }
  pursue(g, dt, i) {
    const a = this.a, P = a.player; this.lastGoal = g; if (g.wait) return; const dx = g.x - P.pos.x, dz = g.z - P.pos.z, dist = Math.hypot(dx, dz);
    if (g.command && dist < (g.r ?? 2.2)) { if (this.pressCD <= 0) { i.command = true; this.pressCD = 1; } return; }
    if (g.drop && dist < 1.45 && this.pressCD <= 0 && !g.drop.money) { this.pressCD = 0.5; a.takeDrop(g.drop); return; }
    if (dist < (g.r ?? 1) && (!g.press || (a.interact.best && a.interact.best.verb !== 'VAULT') || dist < 0.25)) { if (g.press && this.pressCD <= 0 && a.interact.best && a.interact.best.verb !== 'VAULT') { i.action = true; this.pressCD = 0.7; } return; }
    const floorMatch = (g.floor ?? 0) === P.floor; if (this.pathT <= 0 || !this.path) { this.path = a.navOf(P.floor, 0).path([P.pos.x, 0, P.pos.z], [g.x, 0, g.z]); this.pathI = 1; this.pathT = 0.5; }
    let tx = g.x, tz = g.z; if (this.path && this.pathI < this.path.length) { const w = this.path[this.pathI]; tx = w[0]; tz = w[2]; if (Math.hypot(tx - P.pos.x, tz - P.pos.z) < 0.5) this.pathI++; }
    const L = Math.hypot(tx - P.pos.x, tz - P.pos.z) || 1; this.moveDir((tx - P.pos.x) / L, (tz - P.pos.z) / L, i, dist > 5);
    // A door or crate in the way.
    const best = a.interact.best; const crossing = () => { const w = best.win; return w.passX ? Math.sign(tx - w.x) !== Math.sign(P.pos.x - w.x) : Math.sign(tz - w.z) !== Math.sign(P.pos.z - w.z); }; if (best && (best.verb === 'VAULT' ? crossing() : (best.door || g.pressAny)) && this.pressCD <= 0) { i.action = true; this.pressCD = 0.6; }
    if (P.pos.distanceTo(this.last) < 0.01) { this.stuck += dt; if (this.stuck > 1.5) { const near = a.shootables.find((s) => s.kind === 'crate' && !s.dead && s.pos.distanceTo(P.pos) < 2); if (near) { this.aimAt(near.pos, i); i.knife = true; } this.stuck = 0; this.path = null; if (this.opt.attract) { P.teleport(g.x, g.z, g.floor ?? P.floor); } } } else this.stuck = 0; this.last.copy(P.pos);
  }
  qte(q, i) { const o2 = q.opt; if (this.opt.failQTE) return; if (o2.type === 'press') { if (q.t < q.max * 0.7) { if (o2.button === 'dodge') i.dodge = true; else i.action = true; } } else if (o2.type === 'alternate') { if (q.want === 0) i.action = true; else i.dodge = true; } else { this.mash = !this.mash; if (this.mash) i.action = true; } }
  wander() { const a = this.a, L = a.level, P = a.player; if (!this.wp || P.pos.distanceTo(this.wp) < 2 || this.t > this.wpT) { const cells = L.markers.a; let tries = 0, c, r; do { c = a.cosmetic.int(1, L.W - 2); r = a.cosmetic.int(1, L.H - 2); } while (!a.navOf(0, 0).isOpen(c, r) && tries++ < 40); this.wp = new THREE.Vector3(L.wx(c), 0, L.wz(r)); this.wpT = this.t + 8; } return { x: this.wp.x, z: this.wp.z, r: 1.5 }; }
  crypt(dt, i) {
    const a = this.a, L = a.level, C = a.crypt, P = a.player; if (!C) return; const lp = L.markers.l[0]; const g = C.lever ? { x: L.wx(9), z: L.wz(30.5), r: 0.5 } : { x: lp.x, z: lp.z - 1, r: 0.9, press: true };
    const k = C.knights.reduce((best, n) => (n.state === 'BLIND' ? best : Math.min(best, n.pos.distanceTo(P.pos))), 99);
    if (k < 1.7 && C.cool <= 0) { i.knife = true; return; }
    if (k > 4.2) { this.pursue(g, dt, i); i.run = !!this.opt.attract; return; }
    // Steer round them: pull to the goal, push from every knight.
    if (this.pathT <= 0 || !this.path) { this.path = a.navOf(0, 0).path([P.pos.x, 0, P.pos.z], [g.x, 0, g.z]); this.pathI = 1; this.pathT = 0.4; }
    const w = this.path?.[Math.min(this.pathI ?? 1, (this.path?.length ?? 1) - 1)] ?? [g.x, 0, g.z]; let dx = w[0] - P.pos.x, dz = w[2] - P.pos.z, Lw = Math.hypot(dx, dz) || 1; dx /= Lw; dz /= Lw; if (Lw < 0.5 && this.path) this.pathI++;
    for (const n of C.knights) { const ox = P.pos.x - n.pos.x, oz = P.pos.z - n.pos.z, d2 = ox * ox + oz * oz; if (d2 < 20) { dx += (ox / d2) * 3.2; dz += (oz / d2) * 3.2; } }
    let Lt = Math.hypot(dx, dz) || 1; dx /= Lt; dz /= Lt; for (const ang of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) { const c = Math.cos(ang), sn = Math.sin(ang), rx = dx * c - dz * sn, rz = dx * sn + dz * c; if (L.enemyCanStand(P.pos.x + rx * 0.9, P.pos.z + rz * 0.9, 0)) { dx = rx; dz = rz; break; } } this.moveDir(dx, dz, i, true);
  }
}
export function botShop(a, bot) {
  const run = a.run; for (const id of [...run.valuables]) if (id !== 'reliquary') sellTreasure(run, id);
  const buyN = (id, n) => { for (let k = 0; k < n; k++) { const d = ITEMS[id]; if ((d.price ?? 0) > run.money) return; if (buy(run, id) !== 'ok') return; } };
  const herbs = run.items.filter((x) => ITEMS[x.id].kind === 'herb' && ITEMS[x.id].heal).length;
  if (run.chapter >= 2 && run.money > 1600) buyN('firstaid', 1); if (run.chapter >= 3 && run.money > 1600) buyN('firstaid', 1); if (run.health < run.maxHealth * 0.7 && run.money > 800 && !run.items.some((x) => x.id === 'firstaid')) buyN('firstaid', 1);
  buyN('samphire', Math.max(0, 3 - herbs));
  const st = (w) => WEAPONS[w].price; if (!run.items.some((x) => x.id === 'scatter') && run.money >= st('scatter') + 200) { arrange(run); buy(run, 'scatter'); }
  if (!run.items.some((x) => x.id === 'rifle') && run.chapter >= 2 && run.money >= st('rifle') + 300) { if (run.grid.w < 12 && run.money >= 1500) buy(run, 'case1'); arrange(run); buy(run, 'rifle'); }
  if (run.grid.w < 12 && run.money >= 2500) buy(run, 'case1');
  for (const [w, id] of [['pistol', 'ammo_pistol'], ['scatter', 'ammo_shells'], ['rifle', 'ammo_rifle']]) { if (!run.items.some((x) => x.id === w)) continue; let g = 0; while (ammoOf(run, w) < WEAPONS[w].mag * (run.chapter >= 3 ? 5 : 2.5) && run.money > ITEMS[id].price && g++ < 6 && buy(run, id) === 'ok'); }
  if (run.money > 2500) { tune(run, 'pistol', 'power'); if (run.items.some((x) => x.id === 'scatter')) tune(run, 'scatter', 'power'); }
  if (bot) bot.log.push(`shop money ${run.money}`);
}
const GO = (a, col, row, o = {}) => ({ x: a.level.wx(col), z: a.level.wz(row), ...o });
const nearChest = (a) => null;
export const BOT_GOALS = {
  quay(a, b) {
    const P = a.player, door = doorOf(a, '41,30'), st = a.stage;
    if (st === 'after') { const v = b.visit('q2'); if (v) return v; return GO(a, 2, 8.5, { r: 0.8 }); }
    if (a.foghornStarted) return { wait: true };
    if (st === 'siege') { if (a.siege) return b.kite(); return GO(a, 28, 18, { r: 2 }); }
    if (st !== 'cottage') { if (!door.open && P.pos.z > a.level.wz(35)) return GO(a, 50, 30, { r: 2 }); return GO(a, 41.5, 29, { r: 0.7, press: true }); }
    if (!door.open) return GO(a, 41.5, 29, { r: 0.7, press: true });
    if (!a.menderE) return GO(a, 42, 34, { r: 1 });
    if (!a.menderE.dead) return GO(a, 42, 34, { r: 3 });
    if (P.pos.x < a.level.wx(47) && P.pos.z > a.level.wz(30)) return GO(a, 47.5, 34.4, { r: 0.6 });
    if (P.pos.z > a.level.wz(21)) return GO(a, 47.8, 20, { r: 1 }); const v = b.visit('q1'); if (v) return v; return GO(a, 28, 18, { r: 2 });
  },
  road(a, b) { if (a.player.pos.z > a.level.wz(36)) return GO(a, 10.5, 35, { r: 1 }); if (a.player.pos.z > a.level.wz(24)) return GO(a, 10.5, 23, { r: 1 }); if (a.player.pos.z < a.level.wz(22) && a.enemies.filter((e) => !e.dead && !e.perch).length === 0) { const v = b.visit('r'); if (v) return v; } return GO(a, 10.5, 1.2, { r: 1.2, press: true }); },
  cannery(a, b) {
    const P = a.player, L = a.level; { const v0 = P.pos.z > L.wz(26) ? b.visit('c0') : null; if (v0) return v0; } if (a.beltDone) return GO(a, 24, 1.5, { r: 0.6 });
    if (a.winch && a.winch.pct >= 100) return GO(a, 24, 12, { r: 1 });
    if (a.winch?.on) return GO(a, 9, 11, { r: 2 }); if (a.boostDone && a.carrierE && !a.carrierE.dead) return GO(a, 12, 12, { r: 3 });
    if (a.boostDone) return GO(a, 9.5, 8, { r: 1 });
    if (a.run.flags.dameFree) return GO(a, 12, 11, { r: 2, command: true });
    if (a.run.keys.includes('coldkey')) { if (!doorOf(a, '37,9').open) return GO(a, 37.5, 10.5, { r: 1.2, press: true }); return GO(a, 39, 6, { r: 1 }); }
    if (a.drops.some((d) => d.id === 'coldkey')) { const dr = a.drops.find((d) => d.id === 'coldkey'); if (dr) return { x: dr.x, z: dr.z, r: 0.9, press: true, pressAny: true }; }
    if (P.pos.z > L.wz(26)) return GO(a, 24, 24, { r: 1 });
    return GO(a, 24, 19.8, { r: 3 });
  },
  yard(a, b) {
    const boss = a.boss, P = a.player; if (!boss) { const v0 = b.visit('y0'); if (v0) return v0; return GO(a, 17, 26, { r: 1 }); } if (!boss.dead) {
      if (boss.state === 'KNEEL') return { x: boss.pos.x - Math.sin(boss.yaw) * 7, z: boss.pos.z - Math.cos(boss.yaw) * 7, r: 2 };
      const zx = Math.abs(boss.pos.x - boss.zoneX[0]) < Math.abs(boss.pos.x - boss.zoneX[1]) ? boss.zoneX[0] : boss.zoneX[1], rz = boss.railZ; const side = P.pos.z > rz ? 1 : -1; const dBoss = boss.pos.distanceTo(P.pos);
      return { x: zx, z: rz + side * (dBoss < 4 ? -5 : 5.5), r: 1.2 };
    }
    const v = b.visit('y'); if (v) return v; return GO(a, 17.5, 2.5, { r: 0.6 });
  },
  causeway(a, b) { const S = a.tide; if (S?.gate) return GO(a, 7.5, 0.8, { r: 0.4 }); if (a.player.pos.z < a.level.wz(70)) { const v = b.visit('c'); if (v) return v; } return GO(a, 7.5, 4, { r: 1 }); },
  abbey(a, b) { const P = a.player, L = a.level; if (!a.lensSolved) { if (P.pos.z > L.wz(32)) return GO(a, 22, 31, { r: 1 }); const s = a.statues.find((x) => x.step !== x.target); if (s) return { x: s.m.x, z: s.m.z + 1.6, r: 1.2, press: true }; } if (!a.cryptDone) { if (a.cryptOn) return { wait: true }; return GO(a, 22, 11, { r: 1 }); } { const v = b.visit('a'); if (v) return v; } if (L.row(P.pos.z) > 7) return GO(a, 21.5, 6, { r: 1 }); if (doorOf(a, '21,0').open) return GO(a, 21.5, 0.6, { r: 0.3 }); return GO(a, 21.5, 1.4, { r: 0.4, press: true }); },
  nave(a, b) { const boss = a.boss, P = a.player, L = a.level; if (!boss) return GO(a, 13.5, 38, { r: 1 }); if (!boss.dead) { if (boss.phase === 2 && boss.locks.every((l) => l.dead)) return { x: boss.pos.x, z: boss.pos.z + 3.4, r: 2.6, press: true, pressAny: true }; if (boss.phase === 3) return GO(a, 14, 24, { r: 1 }); const dd = boss.pos.distanceTo(P.pos); if (dd < 8) return { x: P.pos.x + (P.pos.x - boss.pos.x), z: P.pos.z + (P.pos.z - boss.pos.z), r: 1 }; return { wait: true }; } return GO(a, 25, 6, { r: 0.4 }); },
  launch(a, b) { return { wait: true }; },
};
