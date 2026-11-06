// Context actions: one prompt at a time, with the best target within reach. Priority: Kick/Takedown > door > window > push > pick up > talk > telegraph.
import { THREE } from '../../pixel-engine.js';
import { S } from './enemy.js';
import { angleDiff } from './geom.js';
import { ITEMS } from '../data/items.js';
import { app } from '../core/app.js';

const { Vector3 } = THREE;
export class Interact {
  constructor(area) { this.area = area; this.pushing = null; }
  facing(x, z, maxAngle = 1.2) { const p = this.area.player; return Math.abs(angleDiff(p.yaw, Math.atan2(x - p.x, z - p.z))) < maxAngle; }
  dist(x, z) { const p = this.area.player; return Math.hypot(x - p.x, z - p.z); }
  candidates() {
    const a = this.area, p = a.player, lv = a.level, c = [];
    if (p.state !== 'free' || p.dead) return c;
    // kick / takedown
    let bestK = null;
    for (const e of a.enemies) {
      if (e.dead || (e.state !== S.STUN && e.state !== S.KNEEL)) continue;
      const d = this.dist(e.x, e.z); if (d > 2.6 || !this.facing(e.x, e.z, 1.05)) continue;
      if (!bestK || d < bestK.d) bestK = { e, d };
    }
    if (bestK) { const e = bestK.e; c.push({ prio: 0, label: e.state === S.KNEEL ? 'TAKEDOWN' : 'KICK', verb: 'action', run: () => (e.state === S.KNEEL ? a.combat.takedown(e) : a.combat.kick(e)) }); }
    // doors
    for (const d of lv.doors) {
      if (d.open) continue;
      let bd = 1e9; for (const [cc, rr] of d.cells) bd = Math.min(bd, this.dist(lv.wx(cc), lv.wz(rr)));
      if (bd > 1.7 || !this.facing(d.x, d.z, 1.4)) continue;
      if (d.locked) c.push({ prio: 2, label: 'LOCKED', verb: 'action', run: () => a.audio('uiNo') });
      else if (d.kind === 'D') c.push({ prio: 2, label: 'KICK DOOR', verb: 'action', run: () => this.kickDoor(d) });
      else if (d.kind === 'G' && d.unlockable) c.push({ prio: 2, label: 'OPEN GATE', verb: 'action', run: () => a.openDoor(d) });
    }
    for (const w of lv.windows) {
      if (this.dist(w.x, w.z) > 1.5 || !this.facing(w.x, w.z, 1.0)) continue;
      c.push({ prio: 3, label: 'VAULT', verb: 'action', run: () => this.vault(w) });
    }
    for (const w of lv.pushables) {
      if (this.dist(w.x, w.z) > 1.45 || !this.facing(w.x, w.z, 1.0)) continue;
      c.push({ prio: 4, label: 'PUSH', verb: 'action', hold: true, run: () => {}, push: w });
    }
    for (const k of a.pickups) {
      if (k.kind === 'chest' && !k.opened && this.dist(k.x, k.z) < 1.8) c.push({ prio: 5, label: 'OPEN', verb: 'action', run: () => this.openChest(k) });
      else if (k.kind !== 'chest' && k.kind !== 'coin' && !(k.kind === 'item' && ITEMS[k.id].kind !== 'key') && this.dist(k.x, k.z) < 1.5) c.push({ prio: 5, label: 'PICK UP', verb: 'action', run: () => { if (a.collect(k)) { k.mesh?.removeFromParent(); a.pickups.splice(a.pickups.indexOf(k), 1); } } });
      else if (k.kind === 'item' && this.dist(k.x, k.z) < 1.5 && ITEMS[k.id].kind === 'item') c.push({ prio: 5, label: 'PICK UP', verb: 'action', run: () => { if (a.collect(k)) { k.mesh?.removeFromParent(); a.pickups.splice(a.pickups.indexOf(k), 1); } } });
    }
    const fa = lv.fathomActor;
    if (fa && this.dist(fa.root.position.x, fa.root.position.z) < 2.6) c.push({ prio: 6, label: 'TRADE', verb: 'action', run: () => a.openShop?.() });
    for (const m of lv.markers.t || []) if (this.dist(m.x, m.z) < 1.9) c.push({ prio: 7, label: 'TELEGRAPH', verb: 'action', run: () => a.openTelegraph?.(m) });
    for (const m of lv.markers.n || []) if (a.def.mender && !a.hasFlag('mender-done') && this.dist(m.x, m.z) < 2.2) c.push({ prio: 6, label: 'TALK', verb: 'action', run: () => a.def.mender(a) });
    if (a.def.contexts) for (const x of a.def.contexts(a) || []) c.push(x);
    return c.sort((x, y) => x.prio - y.prio);
  }
  update(intent, dt) {
    const a = this.area, p = a.player;
    const list = this.candidates();
    const best = list[0] || null;
    a.prompt = best && !a.cutsceneActive && !a.scripts.qte ? { label: best.label, verb: best.verb || 'action' } : null;
    if (p.grabbed || p.limpets.length) { a.prompt = { label: 'MASH TO BREAK FREE', verb: 'action' }; return; }
    // push: hold action
    const pushC = list.find((c) => c.push);
    if (pushC && best === pushC && intent.action) this.pushWardrobe(pushC.push, dt); else this.stopPush();
    if (best && intent.actionPressed && !best.hold) best.run();
    if (a.def.interactTick) a.def.interactTick(a, intent, dt);
  }
  kickDoor(d) {
    const a = this.area, p = a.player; p.doMelee('door', 0.5); a.audio('whoosh');
    a.later(0.2, () => { a.openDoor(d, false); a.ctx.engine.shake.add(0.25); a.run.stats.kicks++; });
  }
  vault(w) {
    const a = this.area, p = a.player, lv = a.level;
    // go straight through to the other side
    let dx = w.x - p.x, dz = w.z - p.z;
    if (Math.abs(dx) > Math.abs(dz)) { dx = Math.sign(dx); dz = 0; } else { dz = Math.sign(dz); dx = 0; }
    const tx = w.x + dx * 1.1, tz = w.z + dz * 1.1;
    a.breakWindow(w);
    p.startTraverse('vault', tx, tz, 0.7, () => { a.onVault?.(w); });
  }
  openChest(k) {
    const a = this.area; k.opened = true; a.audio('pickup'); k.obj.rotation.x = -0.4;
    const gifts = a.def.chestLoot?.[k.id] || null;
    const rnd = a.rng;
    const pick = gifts || (rnd.chance(0.6) ? { kind: 'valuable', id: rnd.pick(['pearl', 'seaglass', 'amber', 'scrimshaw', 'goldtooth']) } : { kind: 'coin', count: Math.round(rnd.range(150, 400)) });
    if (pick.kind === 'valuable') { a.run.addValuable(pick.id); a.showHint('FOUND: ' + pick.id.toUpperCase(), 3); } else { a.run.doubloons += pick.count; a.moneyShow = 3; a.audio('coin'); }
    a.run.flags['chest:' + k.id] = true;
  }
  pushWardrobe(w, dt) {
    const a = this.area, p = a.player, lv = a.level;
    if (this.pushing !== w) { this.pushing = w; w.axis = Math.abs(w.x - p.x) > Math.abs(w.z - p.z) ? 'x' : 'z'; w.dir = Math.sign(w[w.axis] - p[w.axis]) || 1; }
    const nx = w.axis === 'x' ? w.x + w.dir * dt : w.x, nz = w.axis === 'z' ? w.z + w.dir * dt : w.z;
    const [nc, nr] = lv.cellOf(nx + (w.axis === 'x' ? w.dir * 0.5 : 0), nz + (w.axis === 'z' ? w.dir * 0.5 : 0));
    const [oc, or] = lv.cellOf(w.x, w.z);
    if (!lv.nav.isOpen(nc, nr) && !(nc === oc && nr === or)) return;
    if (!w.moved) { w.moved = true; lv.nav.setOpen(oc, or, false); }
    w.x = nx; w.z = nz; w.object.position.set(w.x, 0, w.z);
    a.ctx.physics.remove(w.collider); w.collider = a.ctx.physics.addStaticBox({ position: [w.x, 1, w.z], halfExtents: [0.45, 1, 0.45] });
    const [cc, cr] = lv.cellOf(w.x, w.z); if (cc !== oc || cr !== or) { lv.nav.setOpen(oc, or, true); lv.nav.setOpen(cc, cr, false); }
    p.yaw = Math.atan2(w.x - p.x, w.z - p.z);
  }
  stopPush() { this.pushing = null; }
  command() {
    const a = this.area, d = a.dame, p = a.player, lv = a.level;
    if (!d || !d.alive) return;
    if (d.hidden) { d.unhide(); return; }
    for (const m of lv.markers.h || []) if (Math.hypot(m.x - d.x, m.z - d.z) < 3 && a.def.dameHide !== false) { d.hide(m); return; }
    if (a.def.dameCommand?.(a)) return;
    d.command();
  }
}
