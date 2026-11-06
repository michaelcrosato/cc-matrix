// The bot plays the game through the same Intent a human fills. Plans live per area: goto, kill, interact,
// shop, command, qte and so on. It computes yaw and pitch to heads, reloads, heals below 40%, kicks prompts
// and runs when surrounded. It's used by the playthrough test and, with cheats, by the attract mode.
import { THREE } from '../../pixel-engine.js';
import { app } from '../core/app.js';
import { angleDiff } from './enemy.js';
import { ITEMS } from '../data/items.js';
import { buyItem, shopStock, tannoyPayouts, tuneWeapon } from '../screens/shop.js';
import { TUNE_STAT_IDS, statsOf } from '../data/weapons.js';
import { ALL_PLANS } from '../data/botPlans.js';

const { Vector3 } = THREE;
const aimV = new Vector3();
const rayFrom = new THREE.Vector3(); const rayDir = new THREE.Vector3();
const flow = [0, 0];

export class Bot {
  constructor(o = {}) {
    this.o = o;
    this.cheat = !!o.cheat;
    this.log = o.log ?? [];
    this.report = o.report ?? {};
    this.noMenus = true;
    this.aimError = o.aimError ?? 0.022;
    this.stuckLimit = o.stuckLimit ?? 60;
    this.reaction = o.reaction ?? 0.25;
    this.deaths = 0;
    this.seed = o.seed ?? 1234;
  }

  attach(area) {
    this.area = area;
    // After a death it plays differently, as a player would: the same seed must not mean the same mistake.
    this.rand = area.ctx.random.fork(`bot${this.deaths}`);
    this.aimError = (this.o.aimError ?? 0.022) * Math.max(0.5, 1 - this.deaths * 0.05);
    this.stepI = 0;
    this.stuckT = 0;
    this.lastX = 0; this.lastZ = 0;
    this.fleeT = 0; this.fleeDir = [0, 1];
    this.qteT = 0;
    this.wantShop = false;
    this.plan = (this.o.plan ?? ALL_PLANS[area.id] ?? []).map((s) => ({ ...s }));
    this.waitT = 0;
    this.noGoalT = 0;
    this.targetLock = null;
    this.aimHold = 0;
    this.areaTime = 0;
    this.yawOut = area.cam.yaw;
    this.pitchOut = -0.05;
    return this;
  }

  note(msg) { if (this.o.verbose) console.log(`[bot ${this.area.id} ${this.areaTime.toFixed(0)}s] ${msg}`); }

  // ---- The main decision, once per fixed step ----
  fill(it, dt, ctx) {
    const { area } = this;
    this.areaTime += dt;
    it.moveX = 0; it.moveY = 0; it.aim = false; it.fire = false; it.run = false; it.setYaw = null; it.setPitch = null; it.dodgeHeld = false; it.actionHeld = false;
    if (!this.cheat) this.handleScreens(ctx);
    if (app.stack.length) return;
    const P = area.player;
    if (!P || !P.alive) return;
    if (this.cheat) this.applyCheats(P);
    if (area.cut) {
      // Cutscenes: watch a moment, then hold the skip.
      area.cutSeen = (area.cutSeen ?? 0) + dt;
      if (area.cutSeen > (this.o.watchCut ?? 0.2)) { area.cut.skip(); area.cutSeen = 0; }
      return;
    }
    if (area.qte.active) { this.answerQte(it, dt); return; }
    if (P.state === 'grabbed') { if (this.rand.chance(0.35)) it.action = true; return; }
    if (area.crypt?.hidden) { if (!area.crypt.knights.some((e) => Math.hypot(e.x - P.x, e.z - P.z) < 3)) it.action = true; return; }
    if (P.state !== 'free') return;
    if (area.talk.speaking && this.o.watchCut === undefined) area.talk.advance();
    if (this.area.def.botReflex?.(this, it, dt)) return;
    // Upkeep.
    if (P.hp < P.maxHp * 0.4 && this.hasHerb(P)) { it.heal = true; }
    // And between fights, top up: nobody walks into the next room at half cover with herbs in the case.
    else if (P.hp < P.maxHp * 0.75 && this.hasHerb(P) && !area.enemies.some((e) => !e.dead && Math.hypot(e.x - P.x, e.z - P.z) < 10)) { it.heal = true; }
    // Standing in a fire: get out, along the way we were going if we can.
    const burning = area.fires.find((f) => !f.friendly && Math.hypot(f.x - P.x, f.z - P.z) < f.r + 0.3);
    this.burnT = burning ? (this.burnT ?? 0) + dt : 0;
    if (burning && this.burnT < 1.2) {
      const step = this.currentStep();
      if (step?.goto) this.steerTo(it, area.level.info.x(step.goto[0]), area.level.info.z(step.goto[1]), true, dt);
      else {
        const dx = P.x - burning.x; const dz = P.z - burning.z; const d = Math.hypot(dx, dz) || 1;
        const nav = area.level.nav;
        if (nav.walkable(P.x + (dx / d) * 2, P.z + (dz / d) * 2)) this.moveDir(it, dx / d, dz / d, true);
        else { this.pickFlee(P, this.threats(P)); this.moveDir(it, this.fleeDir[0], this.fleeDir[1], true); }
      }
      return;
    }
    if (!this.currentStep()?.ignoreEnemies && this.dodgeIncoming(it, P, ['bottle'])) { this.applyLook(it, dt); return; }
    const threats = this.threats(P);
    if (!threats.length && P.mag < P.weapon.mag * 0.5 && P.store.case.count(P.weapon.ammo) > 0 && P.reloadT <= 0) it.reload = true;
    if (!threats.length) this.mixHerbs(P, dt);
    const handled = this.combat(it, dt, P, threats);
    if (!handled) this.followPlan(it, dt, P, threats);
    this.applyLook(it, dt);
    this.checkStuck(it, dt, P);
  }

  applyCheats(P) {
    P.hp = P.maxHp;
    if (this.area.dame) this.area.dame.hp = this.area.dame.maxHp;
    P.mag = Math.max(P.mag, P.weapon.mag);
    P.reloadT = 0;
  }

  /** A quiet moment: mix what's in the Case, as anyone would. Samphire and Dulse heal in full, three Samphire likewise. */
  mixHerbs(P, dt) {
    this.mixT = (this.mixT ?? 0) - dt;
    if (this.mixT > 0) return;
    this.mixT = 1;
    const grid = P.store.case;
    const one = (id, not = null) => grid.items.find((i) => i.id === id && i !== not);
    for (const [a, b] of [['samphire', 'dulse'], ['mixSD', 'holly'], ['mixS2', 'samphire']]) {
      const x = one(a); const y = one(b, x);
      if (x && y && grid.combine(x, y)?.ok !== false) return;
    }
    // Two Samphire make one 60%, which only helps by making room for a third.
    if (grid.items.filter((i) => i.id === 'samphire').length >= 3) { const x = one('samphire'); const y = one('samphire', x); if (x && y) grid.combine(x, y); }
  }

  hasHerb(P) {
    return P.store.case.items.some((i) => ITEMS[i.id].kind === 'herb' && ITEMS[i.id].heal);
  }

  /** Forms, deaths, boxes: press through them as a player would. */
  handleScreens() {
    const top = app.top;
    if (!top) return;
    if (top.name === 'form') { top.advance(); return; }
    if (top.name === 'denied') { this.deaths++; this.report.deaths = (this.report.deaths ?? 0) + 1; this.note('died'); top.continue(); return; }
    if (top.name === 'shop') { this.shopScript(); app.close(top); this.area.applyMusic(this.area.musicName); return; }
    if (top.name === 'case') { app.close(top); }
  }

  shopScript() {
    const { area } = this;
    const { run } = area;
    tannoyPayouts(run);
    const wants = this.o.shop ?? ['scatter', 'caseMedium', 'rifle', 'tin', 'ammoPistol', 'ammoShells', 'ammoRifle', 'ammoBolts', 'samphire', 'depth', 'flare'];
    // Sell treasure: it's only worth anything here.
    for (const [id, n] of Object.entries(run.valuables)) {
      if (['pearl', 'blackPearl', 'amber'].includes(id) && run.valuables.reliquary) continue;
      for (let i = 0; i < n; i++) run.money += 0;
    }
    for (const id of ['goldTooth', 'seaGlass', 'scrimshaw', 'pearl', 'amber', 'blackPearl', 'reliquary', 'reliquaryFull']) {
      while (run.valuables[id]) {
        run.valuables[id]--;
        if (!run.valuables[id]) delete run.valuables[id];
        run.money += ({ goldTooth: 150, seaGlass: 400, scrimshaw: 900, pearl: 500, amber: 700, blackPearl: 1500, reliquary: 1200, reliquaryFull: 8000 })[id];
      }
    }
    // What counts as a stock grows as the fights do. The Armoury is the last shelf before the Commodore: empty the purse there.
    const stockMags = area.id === 'abbey' ? 6 : run.chapter >= 2 ? 4 : 2.5;
    // Staying alive before anything shiny: two herbs, and a box of rounds if she's under a magazine or two, then the guns.
    for (const [id, enough] of [['samphire', 1], ['samphire', 2], ['ammoPistol', run.weaponStats('pistol').mag * (run.chapter >= 2 ? 2 : 1)]]) {
      if (shopStock(run).includes(id) && run.case.count(id) < enough && buyItem(area, id).ok) this.note(`bought first ${id}`);
    }
    for (const id of wants) {
      const stock = shopStock(run);
      if (!stock.includes(id)) continue;
      const isAmmo = ITEMS[id]?.kind === 'ammo';
      if (isAmmo) {
        const forW = ITEMS[id].for;
        if (!run.ownsWeapon(forW)) continue;
        if (run.case.count(id) + ITEMS[id].pickup * 2 > run.weaponStats(forW).mag * stockMags) continue;
      }
      if (ITEMS[id]?.kind === 'herb' && run.case.count(id) >= 2) continue;
      if (ITEMS[id]?.kind === 'grenade' && run.case.count(id) >= 2) continue;
      const res = buyItem(area, id);
      if (res.ok) this.note(`bought ${id}`);
      else if (res.why === 'room') { run.case.arrange(); const again = buyItem(area, id); if (again.ok) this.note(`bought ${id}`); }
    }
    // Whatever's left goes on staying alive: rounds for what we carry and something to heal with. Until the scattergun
    // is bought only what can't wait, or there'd never be 900 to buy it with.
    for (let round = 0; round < 4; round++) {
      for (const id of ['samphire', 'ammoPistol', 'ammoShells', 'ammoRifle']) {
        const stock = shopStock(run);
        if (!stock.includes(id)) continue;
        if (!run.ownsWeapon('scatter') && !(id === 'samphire' && run.case.count('samphire') < 1) && !(id === 'ammoPistol' && run.case.count('ammoPistol') < 24)) continue;
        if (ITEMS[id].kind === 'ammo' && !run.ownsWeapon(ITEMS[id].for)) continue;
        // More than a stock is money that could have tuned a gun. A shop box is two pickups.
        if (ITEMS[id].kind === 'ammo' && run.case.count(id) + ITEMS[id].pickup * 2 > run.weaponStats(ITEMS[id].for).mag * stockMags) continue;
        if (ITEMS[id].kind === 'herb' && run.case.count(id) >= 3) continue;
        if (buyItem(area, id).ok) this.note(`bought extra ${id}`);
      }
    }
    // Then a couple of tunes on what's equipped.
    for (const w of run.ownedWeapons().reverse()) {
      for (const k of TUNE_STAT_IDS) {
        if (run.money > 900 && tuneWeapon(area, w, k).ok) { this.note(`tuned ${w} ${k}`); }
      }
    }
    this.wantShop = false;
  }

  answerQte(it, dt) {
    const q = this.area.qte.active;
    this.qteT += dt;
    if (this.qteT < this.reaction * 0.5) return;
    if (q.type === 'press') {
      if (q.key === 'dodge') it.dodge = true; else it.action = true;
      this.qteT = 0;
    } else if (q.type === 'mash') {
      if (this.qteT > 0.07) { if (q.key === 'dodge') it.dodge = true; else it.action = true; this.qteT = this.reaction * 0.5; }
    } else if (this.qteT > 0.1) {
      if (q.next === 'action') it.action = true; else it.dodge = true;
      this.qteT = this.reaction * 0.5;
    }
  }

  threats(P) {
    const { area } = this;
    const out = [];
    for (const e of area.enemies) {
      if (e.dead || e.floor !== P.floor || e.state === 'SEA' || e.state === 'SCRIPT') continue;
      if (e.botIgnore) continue;
      const d = Math.hypot(e.x - P.x, e.z - P.z);
      out.push({ e, d });
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  }

  // ---- Fighting ----
  combat(it, dt, P, threats) {
    const { area } = this;
    if (!threats.length || this.currentStep()?.ignoreEnemies) { this.fleeT = 0; return false; }
    const near = threats[0];
    this.noPickT = Math.max(0, (this.noPickT ?? 0) - dt);
    // Kick or take down anything we can. That's the whole game.
    const cur = area.interact.current;
    if (cur?.prio === 0 && cur.enemy && !cur.enemy.d?.headOnlyStagger) { it.action = true; return true; }
    const saw = threats.find((t) => t.e.type === 'flenser');
    const close = threats.filter((t) => t.d < 3).length;
    const dangerous = threats.filter((t) => t.d < 1.9 && (t.e.state === 'WINDUP' || t.e.state === 'APPROACH')).length;
    const emptyAll = this.noAmmoAtAll(P);
    // Run when surrounded, or from the saw. Don't run forever.
    if (this.fleeT > 0) {
      this.fleeT -= dt;
      // Pinned: nobody runs on the spot while a crowd hits them. Stand and fight, and try running again later.
      this.fleeStuck = Math.hypot(P.x - (this.fleeX ?? P.x), P.z - (this.fleeZ ?? P.z)) < 0.03 ? (this.fleeStuck ?? 0) + dt : 0;
      this.fleeX = P.x; this.fleeZ = P.z;
      if (this.fleeStuck > 0.4) { this.fleeT = 0; this.fleeStuck = 0; this.noFleeT = 2.5; }
      else {
        if (!this.fleeTo || !this.steerTo(it, this.fleeTo[0], this.fleeTo[1], true, dt)) this.moveDir(it, this.fleeDir[0], this.fleeDir[1], true);
        return true;
      }
    }
    this.noFleeT = Math.max(0, (this.noFleeT ?? 0) - dt);
    // A stunned one close by: walk in and kick. Kicks are what clear a crowd.
    const stunned = threats.find((t) => t.e.canKick() && t.d < 4.5 && !t.e.d.headOnlyStagger);
    if (stunned && close < 4) { this.steerTo(it, stunned.e.x, stunned.e.z, true, dt); return true; }
    if (!area.safe && (close >= 3 || dangerous >= 2 || (saw && saw.d < 3.1 && saw.e.state !== 'STUN')) && this.moveCooldown(dt)) {
      this.pickFlee(P, threats);
      this.fleeT = 1.1;
      this.fleeX = P.x; this.fleeZ = P.z; this.fleeStuck = 0;
      if (this.fleeTo) this.fleeT = 1.8;
      if (!this.fleeTo || !this.steerTo(it, this.fleeTo[0], this.fleeTo[1], true, dt)) this.moveDir(it, this.fleeDir[0], this.fleeDir[1], true);
      return true;
    }
    // Low on ammo: a drop close by is worth a detour, if nobody is on top of us.
    const totalAmmo = P.store.ownedWeapons().reduce((n, w) => n + P.store.weapons[w].mag + P.store.case.count(P.store.weaponStats(w).ammo), 0);
    if (totalAmmo < 24 && near.d > 2.4) {
      const cur = area.interact.current;
      if (cur?.kind === 'pick' && cur.dropRef && ITEMS[cur.dropRef.id]?.kind === 'ammo' && this.canCarry(cur.dropRef)) { it.action = true; return true; }
      let best = null; let bd = 9;
      for (const d of area.drops) {
        if (d.kind !== 'item' || ITEMS[d.id]?.kind !== 'ammo' || d.floor !== P.floor || d.botSkip) continue;
        const k = Math.hypot(d.x - P.x, d.z - P.z);
        if (k < bd && this.canCarry(d)) { bd = k; best = d; }
      }
      if (best) {
        // Give up on what can't be reached, or it would stand here wanting it for ever.
        best.chaseT = (best.chaseT ?? 0) + dt;
        if (best.chaseT < 8 && this.steerTo(it, best.x, best.z, true, dt)) return true;
        best.botSkip = true;
      }
    }
    // Reload when nothing is on top of us.
    const s = P.weapon;
    // Empty, with them on top of her, and every hit cancels the reload: a gun that's already loaded is quicker, or failing that the quickest to load.
    if (P.mag <= 0 && near.d < 2.5 && s.reload > 1.6) {
      const list = P.store.ownedWeapons();
      const other = list.filter((w) => w !== P.store.equipped);
      const ready = other.find((w) => P.store.weapons[w].mag > 0)
        ?? other.find((w) => P.store.weaponStats(w).reload <= 1.6 && P.store.case.count(P.store.weaponStats(w).ammo) > 0);
      // And leave it in her hand a while: the choice of gun below would only swap straight back to the empty one.
      if (ready) { it.slot = list.indexOf(ready); this.noPickT = 4; return true; }
    }
    if (P.reloadT > 0) {
      if (near.d < 3.5) {
        // Along the grid, not straight at a pillar: a reload is no time to walk into a wall.
        this.pickFlee(P, threats);
        if (!this.fleeTo || !this.steerTo(it, this.fleeTo[0], this.fleeTo[1], near.d < 2.5, dt)) this.moveDir(it, this.fleeDir[0], this.fleeDir[1], near.d < 2.5);
        return true;
      }
      return false;
    }
    if (P.mag <= 0) {
      if (P.store.case.count(s.ammo) > 0) { it.reload = true; }
      else this.switchWeapon(it, P);
      if (emptyAll && near.d < 2.0 && near.e.isDown()) { it.knife = true; return true; }
      if (near.d < 4) { this.pickFlee(P, threats); if (this.fleeTo) this.steerTo(it, this.fleeTo[0], this.fleeTo[1], true, dt); else this.moveDir(it, this.fleeDir[0], this.fleeDir[1], true); return true; }
      if (emptyAll) return this.grabThings(it, dt, P);
      return false;
    }
    // Pick who to shoot: the nearest one we can see, within range.
    const maxRange = this.currentStep()?.range ?? 17;
    let target = null;
    if (this.targetLock && !this.targetLock.dead && !this.targetLock.isDown() && Math.hypot(this.targetLock.x - P.x, this.targetLock.z - P.z) < maxRange && this.visible(P, this.targetLock)) target = this.targetLock;
    if (!target) {
      for (const t of threats) {
        if (t.d > maxRange) break;
        if (t.e.isDown() || t.e.state === 'STUN') continue;
        if (this.visible(P, t.e)) { target = t.e; break; }
      }
    }
    // A limpet on its way to a corpse is a Re-Salted in a moment: it goes first, unless something's on top of us.
    if (near.d > 2.5) {
      const lim = threats.find((t) => t.e.d?.crawler && !t.e.latched && t.d < 14 && this.visible(P, t.e));
      if (lim) target = lim.e;
    }
    // Right on top of us: the grid's line of sight is conservative beside a statue, the gun isn't.
    if (!target && near.d < 4 && !near.e.isDown() && near.e.state !== 'STUN') target = near.e;
    this.targetLock = target;
    if (!target) {
      // Stunned one nearby: walk up and kick it.
      const st = threats.find((t) => t.e.canKick() && t.d < 6);
      if (st) { this.steerTo(it, st.e.x, st.e.z, false, dt); return true; }
      return false;
    }
    // In her face, the shoulder camera can't line up a shot, and he walks at a third of her speed: a step back and it can.
    const laserOn = P.aimBlend >= 0.9 && area.lastAimHit?.kind === 'enemy';
    if (near.d < 1.3 && !laserOn && !near.e.isDown() && near.e.state !== 'STUN' && !area.safe && this.noFleeT <= 0) {
      // Straight away from him, or as near to that as there's floor: the kiting loop's next waypoint may lie through him.
      const away = Math.atan2(P.x - near.e.x, P.z - near.e.z);
      const { nav } = area.level;
      this.fleeTo = null;
      for (const turn of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) {
        const dx = Math.sin(away + turn); const dz = Math.cos(away + turn);
        if (nav.walkable(P.x + dx * 1.5, P.z + dz * 1.5)) { this.fleeDir = [dx, dz]; break; }
      }
      this.fleeT = 0.5;
      this.fleeX = P.x; this.fleeZ = P.z; this.fleeStuck = 0;
      this.moveDir(it, this.fleeDir[0], this.fleeDir[1], true);
      return true;
    }
    this.pickWeapon(it, P, threats, target);
    // Aim.
    const zone = target.d.crawler ? 'torso' : (target.helmet > 0 ? 'head' : target.shieldUp ? 'arm' : near.d < 4 && this.rand.next() < 0.002 ? 'leg' : 'head');
    it.aim = true;
    this.aimAt(it, target, zone, dt);
    let fired = false;
    if (P.aimBlend >= 0.9) {
      const err = Math.abs(angleDiff(this.wantYaw, this.area.cam.yaw)) + Math.abs(this.wantPitch - this.area.cam.pitch);
      // The laser on them is as good as a sum that settles: near a wall, the squeezed camera may never let it settle.
      const onThem = area.lastAimHit?.kind === 'enemy';
      // Mind the coat: never shoot through the Dame.
      if ((err < 0.05 || onThem) && P.fireT <= 0 && area.lastAimHit?.kind !== 'friendly') { it.fire = true; it.firePressed = true; fired = true; }
    }
    // Backed against something with nowhere to step to: that's what the knife is for.
    this.noShotT = fired || P.fireT > 0 || P.reloadT > 0 ? 0 : (this.noShotT ?? 0) + dt;
    if (near.d < 2 && this.noShotT > 1) { it.aim = false; it.knife = true; this.noShotT = 0; }
    return true;
  }

  moveCooldown() { return (this.noFleeT ?? 0) <= 0; }

  /** Something thrown on its way here: step out of its line, as anyone would. */
  dodgeIncoming(it, P, kinds) {
    const { area } = this;
    const inc = area.projectiles.find((q) => q.alive && kinds.includes(q.kind)
      && Math.hypot(q.pos.x - P.x, q.pos.z - P.z) < 9
      && (q.kind === 'rivet' || Math.hypot(q.targetPos.x - P.x, q.targetPos.z - P.z) < 2.4));
    if (!inc) return false;
    const L = Math.hypot(inc.vel.x, inc.vel.z) || 1;
    inc.dodge = inc.dodge ?? (area.level.nav.walkable(P.x - (inc.vel.z / L) * 2, P.z + (inc.vel.x / L) * 2) ? 1 : -1);
    // Sideways, with the eyes staying on whoever threw it: turning away would cost the next shot.
    const rel = angleDiff(Math.atan2((-inc.vel.z / L) * inc.dodge, (inc.vel.x / L) * inc.dodge), area.cam.yaw);
    it.moveX = -Math.sin(rel); it.moveY = Math.cos(rel); it.run = true;
    return true;
  }

  /** Is the shot we want actually lined up? */
  onTarget(P, tol = 0.05) {
    if (P.aimBlend < 0.9) return false;
    const c = this.area.cam;
    return Math.abs(angleDiff(this.wantYaw, c.yaw)) + Math.abs(this.wantPitch - c.pitch) < tol;
  }

  noAmmoAtAll(P) {
    for (const w of P.store.ownedWeapons()) {
      const st = P.store.weaponStats(w);
      if (P.store.weapons[w].mag > 0 || P.store.case.count(st.ammo) > 0) return false;
    }
    return true;
  }

  switchWeapon(it, P) {
    const list = P.store.ownedWeapons();
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      if (w === P.store.equipped) continue;
      const st = P.store.weaponStats(w);
      if (P.store.weapons[w].mag > 0 || P.store.case.count(st.ammo) > 0) { it.slot = i; return true; }
    }
    return false;
  }

  pickWeapon(it, P, threats, target) {
    const { store } = P;
    const list = store.ownedWeapons();
    if (list.length < 2 || this.noPickT > 0) return;
    const dist = Math.hypot(target.x - P.x, target.z - P.z);
    const usable = (w) => !!store.weapons[w] && (store.weapons[w].mag > 0 || store.case.count(store.weaponStats(w).ammo) > 0);
    let want = store.equipped;
    const crowd = threats.filter((t) => t.d < 6).length;
    if (target.type === 'flenser' || target.d.armored) want = usable('rifle') ? 'rifle' : usable('harpoon') ? 'harpoon' : usable('scatter') ? 'scatter' : 'pistol';
    else if (crowd >= 2 && dist < 7 && list.includes('scatter') && usable('scatter')) want = 'scatter';
    else if (dist > 13 && list.includes('rifle') && usable('rifle')) want = 'rifle';
    else want = usable('pistol') ? 'pistol' : list.find(usable) ?? 'pistol';
    if (want !== store.equipped && list.includes(want) && usable(want)) it.slot = list.indexOf(want);
  }

  visible(P, e) {
    const { area } = this;
    if (e.y > 0.8 && P.floor === 0) return true;
    aimV.set(e.x - P.x, 0, e.z - P.z);
    const nav = P.floor === 1 ? area.level.upper.nav : area.level.nav;
    return nav.lineOfSight(P.x, P.z, e.x, e.z);
  }

  /** Solve yaw and pitch from the camera to a point. */
  aimAt(it, e, zone, dt) {
    const { area } = this;
    const p = e.aimPoint(zone, aimV);
    this.aimAtPoint(it, p, dt);
  }

  aimAtPoint(it, p, dt) {
    const { area } = this;
    const cam = area.ctx.camera.camera.position;
    const c = area.cam;
    // The camera sits off the shoulder; solve from where the ray really starts.
    const dx = p.x - cam.x; const dy = p.y - cam.y; const dz = p.z - cam.z;
    const flat = Math.hypot(dx, dz) || 0.01;
    let yaw = Math.atan2(dx, dz);
    let pitch = Math.atan2(dy, flat);
    const noise = this.aimError;
    yaw += this.rand.range(-noise, noise);
    pitch += this.rand.range(-noise, noise) * 0.7;
    this.wantYaw = yaw; this.wantPitch = pitch;
    const rate = (this.o.turnRate ?? 2.1) * dt;
    const dy2 = angleDiff(yaw, c.yaw);
    it.setYaw = c.yaw + Math.max(-rate, Math.min(rate, dy2));
    const dp = pitch - c.pitch;
    it.setPitch = Math.max(-0.7, Math.min(0.7, c.pitch + Math.max(-rate, Math.min(rate, dp))));
  }

  pickFlee(P, threats) {
    const { area } = this;
    const nav = P.floor === 1 ? area.level.upper.nav : area.level.nav;
    // A kiting loop from the plan: the waypoint farthest from trouble, without running through it.
    const loop = this.currentStep()?.loop;
    this.fleeTo = null;
    if (loop && P.floor === 0) {
      const { info } = area.level;
      let bestS = -Infinity;
      for (const [c, r] of loop) {
        const x = info.x(c); const z = info.z(r);
        const dist = Math.hypot(x - P.x, z - P.z);
        if (dist < 5) continue;
        const ux = (x - P.x) / dist; const uz = (z - P.z) / dist;
        let score = -dist * 0.15 + this.rand.next() * 1.5;
        for (const t of threats) {
          if (t.d > 16) break;
          const ex = t.e.x - x; const ez = t.e.z - z;
          score += Math.min(Math.hypot(ex, ez), 14) * 0.1;
          const along = ((t.e.x - P.x) * ux + (t.e.z - P.z) * uz) / Math.max(0.1, t.d);
          if (along > 0.5 && t.d < 8) score -= (8 - t.d) * along * (t.e.type === 'flenser' ? 3 : 1);
        }
        if (score > bestS) { bestS = score; this.fleeTo = [x, z]; }
      }
      if (this.fleeTo) return;
    }
    let best = this.fleeDir; let bs = -Infinity;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const dx = Math.sin(a); const dz = Math.cos(a);
      const free = nav.castWall(P.x, P.z, dx, dz, 8);
      if (free < 1.2) continue;
      let score = free * 0.5 + this.rand.next() * 2;
      for (const t of threats) {
        if (t.d > 10) break;
        const ex = t.e.x - P.x; const ez = t.e.z - P.z;
        const along = (ex * dx + ez * dz) / Math.max(0.1, t.d);
        score -= along * (10 - t.d) * (t.e.type === 'flenser' ? 3 : 1);
      }
      if (score > bs) { bs = score; best = [dx, dz]; }
    }
    this.fleeDir = best;
  }

  moveDir(it, dx, dz, run) {
    // Point the camera the way we go and push the stick forward: it's what a player does.
    const yaw = Math.atan2(dx, dz);
    it.moveX = 0; it.moveY = 1; it.run = run;
    const c = this.area.cam;
    it.setYaw = c.yaw + angleDiff(yaw, c.yaw) * 0.25;
    it.setPitch = c.pitch + (-0.06 - c.pitch) * 0.1;
    // Off-axis: move relative to the camera so the turn doesn't lag the feet.
    const rel = angleDiff(yaw, c.yaw);
    it.moveX = -Math.sin(rel); it.moveY = Math.cos(rel);
  }

  /** Walk toward a world point on the flow field. */
  steerTo(it, x, z, run, dt) {
    const { area } = this;
    const P = area.player;
    const nav = P.floor === 1 ? area.level.upper.nav : area.navByKey('bot');
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < 1.0 && nav.lineOfSight(P.x, P.z, x, z)) {
      this.moveDir(it, (x - P.x) / Math.max(0.01, d), (z - P.z) / Math.max(0.01, d), run);
      return true;
    }
    nav.flowTo(x, z);
    if (nav.flowDirection(P.x, P.z, flow)) {
      this.moveDir(it, flow[0], flow[1], run);
      return true;
    }
    // Standing on a cell the grid calls blocked, at the edge of a column say, there's no flow to read:
    // step off onto the open cell nearest the way we want to go.
    if (!nav.walkable(P.x, P.z)) {
      let best = -1; let bestD = Infinity; let widest = -1; let widestD = 0;
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4; const nx = P.x + Math.sin(a) * 1.2; const nz = P.z + Math.cos(a) * 1.2;
        // Open on the grid isn't enough: the prop she's leaning on may be in that direction. And she's as wide as her shoulders,
        // so three rays: a gap one ray fits through may be a gap she'd push at for ever.
        let free = 3;
        for (const side of [0, 0.28, -0.28]) {
          const hit = area.ctx.physics.castRay(rayFrom.set(P.x - Math.cos(a) * side, P.y + 0.4, P.z + Math.sin(a) * side), rayDir.set(Math.sin(a), 0, Math.cos(a)), 3, ['player', 'enemy']);
          if (hit) free = Math.min(free, hit.distance);
        }
        if (free > widestD) { widestD = free; widest = a; }
        if (free < 0.7 || !nav.walkable(nx, nz)) continue;
        const left = Math.hypot(nx - x, nz - z);
        if (left < bestD) { bestD = left; best = a; }
      }
      // Failing that, whichever way has the most room: anything but standing still in it.
      if (best < 0) best = widest;
      if (best >= 0) { this.moveDir(it, Math.sin(best), Math.cos(best), run); return true; }
    }
    return false;
  }

  currentStep() { return this.plan[this.stepI]; }
  nextStep() { this.stepI++; this.waitT = 0; this.stuckT = 0; const s = this.plan[this.stepI]; if (s?.note) this.note(s.note); }

  /** Run through the plan's steps. */
  followPlan(it, dt, P, threats) {
    const s = this.currentStep();
    if (!s) { this.grabThings(it, dt, P); return; }
    this.waitT += dt;
    const { area } = this;
    const { info } = area.level;
    if (s.skipIf?.(area, this)) { this.nextStep(); return; }
    if (s.goto) {
      if (!threats.length && !s.run && !s.noGrab && this.grabThings(it, dt, P)) return;
      const x = info.x(s.goto[0]); const z = info.z(s.goto[1]);
      const d = Math.hypot(x - P.x, z - P.z);
      const within = s.within ?? 1.1;
      if (d < within) { this.nextStep(); return; }
      this.useContextOnWay(it, P);
      if (!this.steerTo(it, x, z, s.run ?? d > 6, dt)) this.steerDirect(it, x, z, P);
      return;
    }
    if (s.until) {
      if (s.until(area, this)) { this.nextStep(); return; }
      if ((s.noGrab || !this.grabThings(it, dt, P)) && s.gotoIdle) {
        const x = info.x(s.gotoIdle[0]); const z = info.z(s.gotoIdle[1]);
        if (Math.hypot(x - P.x, z - P.z) > 0.5) this.steerTo(it, x, z, false, dt);
      }
      if (s.timeout && this.waitT > s.timeout) this.nextStep();
      return;
    }
    if (s.wait !== undefined) { if (this.waitT >= s.wait) this.nextStep(); return; }
    if (s.use) {
      // Walk to a thing and press Action on it: door, window, chest, talk, by interact kind or label.
      const cur = area.interact.current;
      const match = cur && (cur.kind === s.use || cur.label === s.use);
      if (match) { it.action = true; this.pressed = true; if (s.then !== 'stay') this.nextStep(); return; }
      if (s.at) {
        const x = info.x(s.at[0]); const z = info.z(s.at[1]);
        const d = Math.hypot(x - P.x, z - P.z);
        if (d > 0.5) this.steerDirect(it, x, z, P);
        else if (s.look) { const y = Math.atan2(info.x(s.look[0]) - x, info.z(s.look[1]) - z); P.facing = y; it.setYaw = y; }
      }
      if (s.timeout && this.waitT > s.timeout) this.nextStep();
      return;
    }
    if (s.command) { it.command = true; this.nextStep(); return; }
    if (s.run) { s.run(area, this, it); this.nextStep(); return; }
    if (s.do) { if (s.do(area, this, it, dt)) this.nextStep(); return; }
    this.nextStep();
  }

  /** Walk straight at a point (no nav), for the last metre to a door. */
  steerDirect(it, x, z, P) {
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < 0.05) return;
    this.moveDir(it, (x - P.x) / d, (z - P.z) / d, false);
  }

  /** On the way: kick doors and vault windows in the way, walk through crates. */
  useContextOnWay(it, P) {
    const cur = this.area.interact.current;
    if (!cur) return;
    if (cur.kind === 'door' && !cur.label?.startsWith('LOCK')) it.action = true;
    if (cur.kind === 'window' && P.floor === 0 && this.inWayOfGoal(cur, P)) it.action = true;
  }
  inWayOfGoal() { return true; }

  /** With nothing better to do: pick things up, collect money. */
  grabThings(it, dt, P) {
    const { area } = this;
    const cur = area.interact.current;
    if (cur?.kind === 'pick' && (!cur.dropRef || this.canCarry(cur.dropRef))) { it.action = true; return true; }
    if (cur?.kind === 'chest') { it.action = true; return true; }
    let best = null; let bd = this.currentStep()?.dropRange ?? 14;
    if (this.dropTarget) {
      this.dropT = (this.dropT ?? 0) + dt;
      // A chest can be a whole map away; a drop at her feet can't.
      if (this.dropT > (this.dropTarget.c !== undefined ? 30 : 9)) { this.dropTarget.botSkip = true; this.dropTarget = null; this.dropT = 0; }
    }
    // Finish going to what she set off for: two things just in range either side of a door would have her pace between them for ever.
    const T = this.dropTarget;
    if (T && this.dropArea === area && !T.botSkip && (T.c !== undefined ? !T.opened : area.drops.includes(T) && T.floor === P.floor && (T.kind !== 'item' || this.canCarry(T)))) {
      const away = Math.hypot(T.x - P.x, T.z - P.z);
      if (this.steerTo(it, T.x, T.z, away > 5, dt)) return true;
    }
    for (const d of area.drops) {
      if (d.floor !== P.floor || d.botSkip) continue;
      if (d.kind === 'item' && !this.canCarry(d)) continue;
      const k = Math.hypot(d.x - P.x, d.z - P.z);
      if (k < bd) { bd = k; best = d; }
    }
    if (!best) {
      for (const c of area.level.chests) {
        if (c.opened || c.botSkip || P.floor !== 0) continue;
        const k = Math.hypot(area.level.info.x(c.c) - P.x, area.level.info.z(c.r) - P.z);
        if (k < (this.currentStep()?.chestRange ?? 16)) { best = c; best.x = area.level.info.x(c.c); best.z = area.level.info.z(c.r); bd = k; break; }
      }
    }
    if (best) {
      if (best !== this.dropTarget) { this.dropTarget = best; this.dropArea = area; this.dropT = 0; }
      this.steerTo(it, best.x, best.z, bd > 5, dt);
      return true;
    }
    return false;
  }

  canCarry(d) {
    const run = this.area.run;
    const def = ITEMS[d.id];
    if (!def) return false;
    if (def.max && run.case.count(d.id) > 0) {
      const room = run.case.all(d.id).reduce((n, i) => n + (def.max - i.qty), 0);
      if (room >= d.qty) return true;
    }
    return !!run.case.findSpot({ id: d.id, rot: false, x: -1, y: -1, qty: 1 });
  }

  applyLook() {}

  checkStuck(it, dt, P) {
    const moved = Math.hypot(P.x - this.lastX, P.z - this.lastZ);
    if (moved > 0.02 || it.aim) { this.lastX = P.x; this.lastZ = P.z; this.stuckT = 0; return; }
    const moving = it.moveX || it.moveY;
    if (!moving) return;
    this.stuckT += dt;
    if (this.stuckT > 1.2 && this.stuckT < 1.3) { it.action = true; }
    if (this.stuckT > 2.5) {
      this.jiggleT = (this.jiggleT ?? 0) + dt;
      const a = this.jiggleT * 3;
      it.moveX = Math.sin(a); it.moveY = Math.cos(a);
      if (this.cheat && this.stuckT > 3) {
        const s = this.currentStep();
        if (s?.goto) P.teleport(this.area.level.info.x(s.goto[0]), P.y, this.area.level.info.z(s.goto[1]));
        this.stuckT = 0;
      }
    }
    this.totalStuck = (this.totalStuck ?? 0) + dt;
  }
}
export { statsOf };
