// BotIntent: plays the game through the same Intent the human uses. Used by attract mode and the scripted playthrough test.
import { newIntent } from '../core/intent.js';
import { S } from './enemy.js';
import { angleDiff, clamp, turnToward } from './geom.js';
import { TUNING } from '../data/tuning.js';
import { ShopScreen, shopStock } from '../screens/shopScreen.js';
import { WEAPONS, WEAPON_ORDER } from '../data/weapons.js';

const ACT_LABELS = ['TEAR OPEN THE HATCH', 'TURN LAMP', 'KICK DOOR', 'VAULT', 'KICK', 'TAKEDOWN', 'PICK UP', 'OPEN', 'OPEN GATE'];
import { ITEMS } from '../data/items.js';
const require_kind = (id) => ITEMS[id]?.kind;
export class Bot {
  constructor(opts = {}) {
    this.opts = { cheat: false, teleportStuck: false, aimErr: 0.004, turnRate: 7, ...opts };
    this.i = newIntent(); this.look = { yaw: null, pitch: null }; this.stuckT = 0; this.last = null; this.goalI = 0; this.log = []; this.stat = { stuck: 0 };
    this.fireWait = 0; this.t = 0; this.healWait = 0; this.noGoalT = 0; this.waitT = 0;
  }
  attach(area) { area.opts.intentSource = (a, dt) => this.step(a, dt); area.opts.lookSource = (a, dt) => this.lookStep(a, dt); this.area = area; area.bot = this; return this; }
  headPoint(e) { const z = e.zones; if (!z) return { x: e.x, y: 1.3, z: e.z }; return { x: z.head.x, y: z.head.y, z: z.head.z }; }
  bodyPoint(e) { const z = e.zones; if (!z) return { x: e.x, y: 1.0, z: e.z }; return { x: (z.torso.a.x + z.torso.b.x) / 2, y: (z.torso.a.y + z.torso.b.y) / 2, z: (z.torso.a.z + z.torso.b.z) / 2 }; }
  step(a, dt) {
    const i = this.i = newIntent(); const p = a.player; this.t += dt;
    this.look.yaw = null; this.look.pitch = null;
    if (!p || p.dead) return i;
    if (this.opts.cheat) { a.dev.god = true; a.oneHit = true; a.run.mags[a.run.equipped] = Math.max(a.run.mags[a.run.equipped] ?? 0, 1); }
    const run = a.run, w = p.weapon;
    // scripted blocking states: dialogue, cutscene, qte
    if (a.scripts.dlg) { i.actionPressed = this.t % 0.5 < dt; return i; }
    if (a.scripts.qte) { i.qteAction = this.t % 0.25 < dt; i.qteDodge = true; return i; }
    if (a.cutsceneActive) return i;
    if (a.control === 'dame' && a.crypt) return this.cryptStep(a, i, dt);
    if (!this.opts.cheat) this.pickWeapon(a, p);
    // get out of burning oil
    const fire = a.combat.fires.find((f) => Math.hypot(f.x - p.x, f.z - p.z) < f.r + 0.8);
    if (fire) { this.moveToward(a, i, p.x + (p.x - fire.x) * 4, p.z + (p.z - fire.z) * 4, true, true); i.run = true; return i; }
    // targets
    const hostile = a.enemies.filter((e) => !e.dead && e.state !== S.SEA && e.state !== S.WAIT && e.state !== S.RISE && !e.stub && (e.awake || Math.hypot(e.x - p.x, e.z - p.z) < 16));
    if (a.control === 'dame') hostile.length = 0;
    const lv = a.level;
    for (const e of hostile) e._d = Math.hypot(e.x - p.x, e.z - p.z);
    hostile.sort((x, y) => x._d - y._d);
    const near = hostile.filter((e) => e._d < 3.2);
    const hp = run.hp / run.maxHp;
    if (hp < 0.4 && run.case.items.some((e) => ['samphire', 'mix60', 'mix100', 'mix100h', 'tin'].includes(e.id)) && this.t > this.healWait && !near.length) { i.heal = true; this.healWait = this.t + 1.5; }
    // prompts that matter
    if (a.def.botCommand?.(a)) i.command = true;
    const pr = a.prompt;
    if (pr && ACT_LABELS.includes(pr.label)) {
      if ((pr.label === 'KICK' || pr.label === 'TAKEDOWN') || !hostile.length || near.length === 0) { if (this.t % 0.3 < dt) i.actionPressed = true; }
    }
    if (p.grabbed || p.limpets.length) { i.actionPressed = this.t % 0.12 < dt; i.knife = !i.actionPressed; return i; }
    // grenade vs crowds
    // reload
    const mag = run.mags[w.id] ?? 0;
    if (mag === 0 && run.ammo(w.id) > 0 && !p.reloading && (!near.length || p.aiming === false)) i.reload = true;
    if (mag === 0 && run.ammo(w.id) === 0) { const other = run.weapons().find((x) => (run.mags[x] ?? 0) > 0 || run.ammo(x) > 0); if (other && other !== run.equipped) i.weaponSlot = run.weapons().indexOf(other) + 1; }
    // keep away from a boss's reach: they hit hard up close
    const bb = a.boss; if (bb && !bb.dead && bb.phase !== 3 && bb.barName === 'THE BOSUN' && !this.opts.cheat) { const bd = Math.hypot(bb.x - p.x, bb.z - p.z); if (bb.mode !== 'kneel' && (bd < 2.6 || (bd < 6 && ['sweep', 'stomp', 'grab'].includes(bb.mode)))) { this.moveToward(a, i, p.x + (p.x - bb.x) * 3, p.z + (p.z - bb.z) * 3, true, true); i.run = true; return i; } }
    // pick the target we can shoot
    let tgt = null; this.ignore = this.ignore || new Map();
    for (const e of hostile) {
      if ((this.ignore.get(e.id) || 0) > this.t) continue; if (e._d > 24) break; if (lv.nav.lineOfSight(p.x, p.z, e.x, e.z) || e._d < 6) { tgt = e; break; } }
    const bossT = hostile.find((e) => e.weak && e.weak.length && e.weak.some((w) => !w.dead && w.visible()));
    if (bossT && !(hostile[0] && hostile[0]._d < 1.6 && hostile[0] !== bossT) && (this.ignore.get(bossT.id) || 0) <= this.t) tgt = bossT;
    // give up on a target that soaks shots without losing health
    const hpOf = (e) => (e.weak && e.weak.length ? e.weak.reduce((q, w) => q + Math.max(0, w.hp), 0) : e.hp);
    if (tgt) { const g = this.eng; if (!g || g.id !== tgt.id) this.eng = { id: tgt.id, hp: hpOf(tgt), t: this.t }; else if (hpOf(tgt) < g.hp - 0.5) { g.hp = hpOf(tgt); g.t = this.t; } else if (this.t - g.t > 8) { this.ignore.set(tgt.id, this.t + 25); this.eng = null; tgt = null; } }
    const swarm = near.length >= 3;
    if (tgt && !swarm && !p.reloading && mag > 0 && !(tgt._d < 0.5)) {
      const hpt = this.headPoint(tgt); const bpt = (tgt.def.headOnlyStagger || tgt.type === 'monk' || tgt.type === 'knight') ? hpt : (tgt.state === S.STUN ? this.bodyPoint(tgt) : hpt);
      const wp = tgt.weak && tgt.weak.find((w) => !w.dead && w.visible());
      const armPt = tgt.type === 'monk' && tgt.shieldUp && tgt.zones ? { x: tgt.zones.armL[2].x, y: tgt.zones.armL[2].y, z: tgt.zones.armL[2].z } : null;
      const aimPt = wp ? wp.pos() : armPt || (tgt.type === 'limpet' ? this.bodyPoint(tgt) : bpt);
      const dx = aimPt.x - a.camPos.x, dy = aimPt.y - a.camPos.y, dz = aimPt.z - a.camPos.z;
      const ty = Math.atan2(dx, dz), tp = Math.asin(dy / Math.hypot(dx, dy, dz));
      this.look.yaw = ty; this.look.pitch = tp;
      i.aim = true;
      const ey = Math.abs(angleDiff(a.cam.yaw, ty)), ep = Math.abs(tp - a.cam.pitch);
      if (p.aiming && ey < 0.012 && ep < 0.012 && p.fireCd <= 0) { i.firePressed = true; i.fire = true; }
      // stand still while aiming; stagger opens kicks
      return i;
    }
    // melee range: kick stunned, else retreat or knife
    if (near.length) {
      const c = near.reduce((acc, e) => ({ x: acc.x + e.x / near.length, z: acc.z + e.z / near.length }), { x: 0, z: 0 });
      if (swarm || hp < 0.5 || (near[0]._d < 1.6 && (p.reloading || mag === 0))) { this.moveToward(a, i, p.x + (p.x - c.x) * 3, p.z + (p.z - c.z) * 3, true, true); i.run = true; return i; }
      if (near[0]._d < 1.4) { i.knife = this.t % 0.45 < dt; }
    }
    // navigate
    let goal = this.goal(a);
    // loot nearby when it is calm: coins, ammo and herbs
    if (!this.opts.cheat && !near.length && !hostile.some((e) => e._d < 6)) { let bp = null, bd = 12; for (const k of a.pickups) { if (k.kind === 'chest' && !k.opened) { const dd = Math.hypot(k.x - p.x, k.z - p.z); if (dd < bd) { bd = dd; bp = k; } continue; } if (k.kind === 'chest' || !(k.kind === 'coin' || (k.kind === 'item' && ['ammo', 'herb', 'grenade'].includes(require_kind(k.id))))) continue; const dd = Math.hypot(k.x - p.x, k.z - p.z); if (dd < bd && lv.nav.walkable(k.x, k.z)) { bd = dd; bp = k; } } if (bp) goal = { x: bp.x, z: bp.z, r: bp.kind === 'chest' ? 1.2 : 0.5, act: bp.kind === 'chest' }; }
    if (goal) {
      const d = Math.hypot(goal.x - p.x, goal.z - p.z);
      if (goal.cmd && d < (goal.r ?? 1.2) + 1 && this.t % 1 < dt) i.command = true;
      if (goal.act && d < (goal.r ?? 1.2) + 0.6 && this.t % 0.5 < dt) i.actionPressed = true;
      if (d < (goal.r ?? 1.2) && !goal.hold?.(a)) { if (goal.shop) this.doShop(a); this.goalI++; this.stuckT = 0; goal.onReach?.(a); if (goal.wait) this.waitT = this.t + goal.wait; }
      else { this.moveToward(a, i, goal.x, goal.z, false, !hostile.length); i.run = d > 6 && a.control !== 'dame'; }
    }
    // stuck detection
    if (this.last && Math.hypot(p.x - this.last.x, p.z - this.last.z) < 0.02 * dt * 60 && goal && !a.scripts.busy && Math.hypot(goal.x - p.x, goal.z - p.z) > (goal.r ?? 1.2) + 0.3) this.stuckT += dt; else { this.stuckT = 0; this.last = { x: p.x, z: p.z }; }
    if (this.stuckT > 1.5 && this.stuckT <= 3 && goal && !this.opts.teleportStuck) { // wiggle out of a pocket the way a person would
      const side = (Math.floor(this.t / 0.8) % 2 ? 1 : -1); i.mx = side; i.my = -0.6; i.run = false; }
    if (this.stuckT > 3 && goal) { this.stat.stuck++; this.stuckT = this.opts.teleportStuck || this.opts.cheat ? 0 : 1.4; if (this.opts.teleportStuck || this.opts.cheat) { p.teleport(goal.x, goal.z); this.goalI++; } }
    this.last = { x: p.x, z: p.z };
    return i;
  }
  /** Visit Mr. Fathom: sell treasure, then buy ammo, herbs and the next gun through the shop's own actions. */
  doShop(a) {
    const run = a.run, shop = new ShopScreen(shopStock(a.def.chapter ?? 0)), ctx = a.ctx;
    shop.tab = 1; for (let n = 0; n < 20; n++) { const rows = shop.sellRows(run).filter((r) => r.kind === 'valuable'); if (!rows.length) break; shop.activate(rows[0], run, ctx); }
    shop.tab = 0;
    const want = (row) => {
      if (row.kind === 'weapon') return true;
      if (row.kind === 'item') { const d = row.id; if (d.startsWith('ammo_')) { const w = WEAPON_ORDER.find((q) => WEAPONS[q].ammo === d); return !!w && run.owns(w) && run.case.count(d) < WEAPONS[w].mag * 5; } if (d === 'samphire') return run.case.count('samphire') < 4; if (d === 'flare') return run.case.count('flare') < 2; return false; }
      return row.kind === 'case' && false;
    };
    for (let pass = 0; pass < 40; pass++) {
      const rows = shop.buyRows(run).filter(want).sort((x, y) => (x.kind === 'weapon' ? -1 : 0) - (y.kind === 'weapon' ? -1 : 0) || x.price - y.price);
      const row = rows.find((r) => r.price <= run.doubloons); if (!row) break;
      const before = run.doubloons; shop.activate(row, run, ctx); if (run.doubloons === before) break;
    }
    for (const w of run.weapons()) if ((run.mags[w] ?? 0) < run.magSize(w)) run.reload(w);
  }
  pickWeapon(a, p) {
    if (this.t < (this.swWait || 0) || p.reloading || p.aiming && p.fireCd > 0) return;
    const run = a.run; const near = a.enemies.filter((e) => !e.dead && e.awake && Math.hypot(e.x - p.x, e.z - p.z) < 7).length;
    const far = a.enemies.filter((e) => !e.dead && e.awake && Math.hypot(e.x - p.x, e.z - p.z) > 11).length;
    const has = (w) => run.owns(w) && ((run.mags[w] ?? 0) > 0 || run.ammo(w) > 0);
    let w = 'pistol'; if (near >= 2 && has('scatter')) w = 'scatter'; else if (far && !near && has('rifle')) w = 'rifle'; else if (!has('pistol')) w = ['scatter', 'rifle', 'harpoon'].find(has) || 'pistol';
    if (a.boss && has('harpoon') && false) w = 'harpoon';
    if (w !== run.equipped) { p.equip(w); this.swWait = this.t + 1.5; }
  }
  cryptStep(a, i, dt) {
    const c = a.crypt, d = a.dame, lv = a.level; this.look.yaw = null;
    let nd = 1e9; for (const k of c.knights) if (!k.dead) nd = Math.min(nd, Math.hypot(k.x - d.x, k.z - d.z));
    if (d.hidden) { i.actionPressed = true; return i; }
    const lx = lv.wx(3), lz = lv.wz(33); const dl = Math.hypot(lx - d.x, lz - d.z);
    if (dl < 1.6) { i.actionPressed = this.t % 0.5 < dt; return i; }
    if (nd < 2.0 && c.whackCd <= 0 && dl >= 1.6) { i.actionPressed = true; return i; }
    this.moveToward(a, i, lx, lz, false, true); i.run = false; return i;
  }
  goal(a) {
    if (this.t < this.waitT) return null;
    const plan = a.def.botPlan?.(a);
    if (!plan) return null;
    this.goalI = Math.min(this.goalI, plan.length);
    // skip waypoints whose guard says so
    while (this.goalI < plan.length && plan[this.goalI].skip?.(a)) this.goalI++;
    const g = plan[this.goalI];
    if (!g) { const rem = a.enemies.filter((e) => !e.dead && !e.stub && e.state !== S.WAIT && e.state !== S.SEA && !e.elev && e.type !== 'harpooner'); if (rem.length) { const p = a.player; rem.sort((x, y) => Math.hypot(x.x - p.x, x.z - p.z) - Math.hypot(y.x - p.x, y.z - p.z)); return { x: rem[0].x, z: rem[0].z, r: 5 }; } const lastPt = plan[plan.length - 1]; return lastPt ? { ...lastPt, hold: undefined, skip: undefined } : null; }
    if (g.until && !g.until(a)) { return g.x !== undefined ? g : null; }
    return g;
  }
  moveToward(a, i, tx, tz, flee, avoid) {
    const p = a.player, nav = a.level.nav; const out = [0, 0];
    let dx, dz;
    nav.flowTo(tx, tz);
    if (nav.flowDirection(p.x, p.z, out) && !flee) { dx = out[0]; dz = out[1]; } else { dx = tx - p.x; dz = tz - p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    if (flee) { // pick the open direction away from threats
      let best = null, bs = -1e9;
      for (let k = 0; k < 16; k++) { const ang = k / 16 * Math.PI * 2, ux = Math.sin(ang), uz = Math.cos(ang); const nx = p.x + ux * 2.5, nz = p.z + uz * 2.5; if (!nav.walkable(nx, nz)) continue; let s = ux * dx + uz * dz; if (!nav.lineOfSight(p.x, p.z, nx, nz)) s -= 2; if (s > bs) { bs = s; best = [ux, uz]; } }
      if (best) { dx = best[0]; dz = best[1]; }
    }
    const cy = a.cam.yaw; const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
    i.my = dx * fx + dz * fz; i.mx = dx * rx + dz * rz;
    if (!avoid) { /* keep moving */ }
    // face the direction of travel with the camera (so explore turning is natural)
    this.look.yaw = Math.atan2(dx, dz); this.look.pitch = 0.05;
    this.look.soft = true;
  }
  lookStep(a, dt) {
    const L = this.look; if (L.yaw === null) { return { dyaw: 0, dpitch: 0 }; }
    const c = a.cam; const rate = L.soft ? 3.2 : this.opts.turnRate * 1.0;
    L.soft = false;
    const dyaw = clamp(angleDiff(c.yaw, L.yaw), -rate * dt, rate * dt);
    const dpitch = clamp(L.pitch - c.pitch, -rate * 0.8 * dt, rate * 0.8 * dt);
    return { dyaw, dpitch };
  }
}

/** The launch: aim at the nearest target ahead and fire; kick limpets. */
export class LaunchBot {
  attach(l) { l.opts.intentSource = (g, dt) => this.step(g, dt); l.opts.lookSource = (g, dt) => this.look(g, dt); this.l = l; this.t = 0; this.want = { x: 0, y: 0.05 }; return this; }
  step(g, dt) {
    const i = newIntent(); this.t += dt;
    if (g.scripts.dlg) { i.actionPressed = true; return i; }
    if (g.scripts.qte) { i.qteAction = true; i.qteDodge = true; return i; }
    if (g.frozen) return i;
    const w = g.gun, run = g.run;
    if ((run.mags[w.id] ?? 0) === 0 && run.ammo(w.id) > 0) i.reload = true;
    let best = null; for (const t of g.targets) if (t.alive && t.kind !== 'limpet' && t.z > g.z + 4) { if (!best || t.z < best.z) best = t; }
    if (g.targets.some((t) => t.alive && t.kind === 'limpet')) i.actionPressed = true;
    if (best) {
      const cam = g.camPos; const dx = best.x - cam.x, dy = best.y - cam.y, dz = best.z - cam.z;
      // reticle in NDC from a simple pinhole model (fov 52, aspect 16:9)
      const f = 1 / Math.tan(52 * Math.PI / 360); const ndcX = (dx / dz) * f / (16 / 9) * -1 * -1, ndcY = (dy / dz) * f;
      this.want = { x: clamp(-ndcX * -1, -0.9, 0.9), y: clamp(ndcY, -0.5, 0.8) };
      if (Math.abs(g.reticle.x - this.want.x) < 0.06 && Math.abs(g.reticle.y - this.want.y) < 0.08 && g.fireCd <= 0) i.firePressed = true;
    }
    return i;
  }
  look(g, dt) { return { dyaw: clamp((g.reticle.x - this.want.x) / 0.55, -0.1, 0.1) * 1, dpitch: clamp((this.want.y - g.reticle.y) / 0.9, -0.1, 0.1) }; }
}
