// Residents: daily schedules (wake, job, supper, socialise, sleep), jobs (gather, guard, cook, help build Patterns, farm
// lint), needs that give Cheer bubbles, request balloons, fighting in sieges, arrival walks, the stuck rule.
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const SOLID = DQ.SOLID;
class Resident {
  constructor(ctx, id, o = {}) {
    this.ctx = ctx; this.id = id; this.def = DQ.NPCS[id]; this.name = this.def.name; this.kind = 'npc';
    this.body = new DQ.VoxelBody({ x: o.x || 0, y: o.y || 0, z: o.z || 0, r: 4.5, h: 26, gravity: 800 });
    this.rig = this.def.blob ? new E.Blob(Object.assign({}, this.def.rig)) : new E.Humanoid(Object.assign({}, this.def.rig));
    this.walker = new DQ.Walker(this, {});
    this.facing = Math.PI / 2; this.state = 'idle'; this.mood = 1; this.hp = 30; this.faint = 0; this.balloon = null; this.balloonT = 0;
    this.needDay = { sleep: -1, meal: -1, comfort: -1 }; this.giftDay = -1; this.cookT = 0; this.task = null; this.taskT = 0; this.atk = null; this.fightCd = 0;
    this.anim = null; this.idleT = 0; this.wanderT = 0; this.bedObj = null; this.sleeping = false; this.follow = false; this.talking = false; this.hidden = false; this.speech = null;
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; } get r() { return this.body.r; }
  get cx() { return Math.floor(this.x / T); } get cy() { return Math.floor(this.y / T); } get L() { return Math.floor((this.z + 1) / T); }
  get dead() { return false; }
  place(x, y, L) { const b = this.body; b.x = x * T + 8; b.y = y * T + 8; b.z = L * T; b.vx = b.vy = b.vz = 0; b.onGround = true; b.lastSafe = [b.x, b.y, b.z]; }
  say(text, t = 2.5) { this.speech = { text: DQ.safe(text), t }; }
  setBalloon(kind, t = 3) { this.balloon = kind; this.balloonT = t; }
  hurt(dmg, from) {
    if (this.faint > 0) return; this.hp -= dmg; this.flashT = .2; if (from) E.knockback(from, this.body, 80, 30); DQ.sfx('npcHurt', { vol: .4 });
    if (this.hp <= 0) { this.faint = 20; this.hp = 30; this.walker.stop(); this.say('Oof...', 2); }
  }
  // ---------------------------------------------------------------- update
  update(dt) {
    const ctx = this.ctx, clock = ctx.clock, town = ctx.town, b = this.body, h = clock ? clock.hour : 12, day = clock ? clock.day : 1;
    this.balloonT = Math.max(0, this.balloonT - dt); if (this.balloonT <= 0 && this.balloon !== 'sleep') this.balloon = null;
    if (this.speech) { this.speech.t -= dt; if (this.speech.t <= 0) this.speech = null; }
    this.flashT = Math.max(0, (this.flashT || 0) - dt); this.fightCd = Math.max(0, this.fightCd - dt);
    if (this.anim) { this.anim.t += dt; if (this.anim.t >= this.anim.dur) this.anim = null; }
    let vx = 0, vy = 0, hop = false;
    if (this.faint > 0) { this.faint -= dt; this.state = 'faint'; this.body.vx = this.body.vy = 0; b.update(dt, ctx.world); this.rigUpdate(dt, 0, 0); return; }
    if (this.talking || this.scripted) { b.vx *= .8; b.vy *= .8; b.update(dt, ctx.world); this.rigUpdate(dt, 0, 0); return; }
    // the schedule picks a goal
    const goal = this.follow ? this.followGoal() : this.think(dt, h, day);
    if (goal && goal.pos) {
      if (!this.walker.goal || this.walker.goal.x !== goal.pos[0] || this.walker.goal.y !== goal.pos[1]) this.walker.to(goal.pos[0], goal.pos[1], goal.pos[2], { radius: goal.radius === undefined ? .6 : goal.radius });
      const st = this.walker.steer(dt, (goal.run ? 62 : 40) * (this.def.speedK || 1));
      vx = st.vx; vy = st.vy; hop = st.hop;
      if (st.stuck) this.unstick(goal);
      if (st.arrived && goal.arrive) goal.arrive();
    } else this.walker.stop();
    const k = Math.exp(-12 * dt); b.vx = vx || b.vx * k; b.vy = vy || b.vy * k;
    if (hop && b.onGround) b.jump(215);
    if (Math.hypot(b.vx, b.vy) > 5) this.facing = E.approachAng(this.facing, Math.atan2(b.vy, b.vx), 10 * dt);
    b.update(dt, ctx.world);
    if (b.fell) { b.toSafe(); }
    this.fight(dt);
    this.rigUpdate(dt, b.vx, b.vy);
  }
  unstick(goal) {
    const g = goal.pos, on = DQ.game.r ? DQ.game.r.visible(this.x, this.y, this.z, 20) : false;
    if (!on || this.walker.failed) { this.place(g[0], g[1], g[2]); DQ.game.particles.dust(this.x, this.y, this.z, 6); this.walker.stop(); }
  }
  followGoal() {
    const b = this.ctx.builder; if (!b) return null;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (d > 26 * T || Math.abs(b.z - this.z) > 8 * T) { const bx = b.cx, by = b.cy; this.place(bx, by + 1 < this.ctx.world.D ? by + 1 : by, this.ctx.world.topZ(bx, by + 1) || b.L); DQ.sfx('poof', { vol: .3 }); return null; }
    if (d < 30) return null;
    return { pos: [b.cx, b.cy, b.L], radius: 1.5, run: d > 80 };
  }
  /** the schedule: what this resident wants to do now; returns a goal { pos: [x, y, L], arrive } or null */
  think(dt, h, day) {
    const ctx = this.ctx, town = ctx.town, rooms = ctx.rooms; if (!town || !town.planted) return null;
    const siege = ctx.siege && ctx.siege.fighting;
    if (siege) return this.siegeGoal();
    // sleep 21-6
    if (h >= 21 || h < 6) {
      if (!this.sleeping) { this.bedObj = this.findBed(); }
      if (this.bedObj && !this.bedObj.gone) {
        const bo = this.bedObj;
        if (Math.hypot(this.x - (bo.x * T + 8), this.y - (bo.y * T + 8)) < 10) { this.sleeping = true; this.balloon = 'sleep'; this.body.x = bo.x * T + 8; this.body.y = bo.y * T + 8; this.body.z = bo.z * T + 6; return null; }
        return { pos: [bo.x, bo.y, bo.z], radius: .3 };
      }
      // no bed: sleep on the ground beside the Banner
      const gx = town.x + ((DQ.hash(this.id.length) % 3) - 1) * 2, gy = town.y + 2;
      if (Math.hypot(this.x - (gx * T + 8), this.y - (gy * T + 8)) < 14) { this.sleeping = true; this.balloon = 'sleep'; this.noBed = true; return null; }
      return { pos: [gx, gy, ctx.world.topZ(gx, gy)], radius: .8 };
    }
    if (this.sleeping) this.wake(day);
    // supper 18-20 at a Mess Hall stool
    if (h >= 18 && h < 20) {
      const mh = rooms && rooms.list.find(r => r.type === 'messHall' && r.inTown);
      if (mh) { const st = mh.objs.find(o => o.def.seat) || mh.objs[0]; if (st) { if (Math.hypot(this.x - (st.x * T + 8), this.y - (st.y * T + 8)) < 14) { if (this.needDay.meal !== day) { this.needDay.meal = day; this.bubble('meal'); this.anim = { kind: 'eat', t: 0, dur: 2 }; } return null; } return { pos: [st.x, st.y, st.z], radius: 1 }; } }
    }
    // socialise 20-21 near the Banner
    if (h >= 20) { const a = DQ.hash(this.id.charCodeAt(0)) / 4294967296 * Math.PI * 2; const gx = Math.round(town.x + Math.cos(a) * 3), gy = Math.round(town.y + Math.sin(a) * 3); if (DQ.h01(Math.floor(DQ.game.time), this.id.length, 3) < .01) this.setBalloon(DQ.h01(day, this.id.length) < .5 ? 'note' : 'dots', 2); return { pos: [gx, gy, ctx.world.topZ(gx, gy)], radius: 1.2 }; }
    // comfort: the favourite room exists (checked at noon)
    if (h >= 12 && this.needDay.comfort !== day && this.hasFav()) { this.needDay.comfort = day; this.bubble('comfort'); }
    // 6-8 wake and go to the plaza; 8-18 the job
    if (h < 8) return { pos: [town.x + 1, town.y + 2, town.L], radius: 2.5 };
    return this.job(dt, h, day);
  }
  wake(day) {
    this.sleeping = false; this.balloon = null;
    if (this.bedObj && !this.noBed && this.needDay.sleep !== day) { this.needDay.sleep = day; this.bubble('sleep'); this.mood = Math.min(2, this.mood + 1); }
    if (this.noBed) { this.mood = Math.max(0, this.mood - 1); this.setBalloon('dots', 4); this.say('No bed... my back!', 3); }
    this.noBed = false; this.anim = { kind: 'wave', t: 0, dur: 1.2 };
    const b = this.body; b.z = Math.max(b.z, this.ctx.world.groundAt(b.x, b.y, b.r, b.z + 16, 16));
  }
  findBed() {
    const ctx = this.ctx, taken = new Set(ctx.npcs.list.filter(n => n !== this && n.bedObj).map(n => n.bedObj.uid));
    const beds = ctx.objects.list.filter(o => o.def.bed && !o.gone && !taken.has(o.uid) && ctx.rooms && ctx.rooms.roomAt(o.x, o.y, o.z));
    if (this.id === 'lintwick') { const fb = beds.find(o => { const r = ctx.rooms.roomAt(o.x, o.y, o.z); return r && r.felt; }); if (fb) return fb; }
    let best = null, bd = 1e9; for (const o of beds) { const d = DQ.d2(o.x, o.y, this.cx, this.cy); if (d < bd) { bd = d; best = o; } } return best;
  }
  hasFav() { const r = this.ctx.rooms; if (!r) return false; if (this.def.fav === 'bedroomFelt') return r.list.some(x => x.type === 'bedroom' && x.felt && x.inTown); return r.has(this.def.fav); }
  bubble(need) { this.ctx.npcs.bubbles.push({ x: this.x, y: this.y, z: this.z + 34, owner: this, need, t: 0, fly: null }); DQ.sfx('bubbleUp', { vol: .3 }); this.ctx.events.emit('bubble', { npc: this.id, need }); }
  /** the day job: help build a Pattern, cook, guard, gather, wander */
  job(dt, h, day) {
    const ctx = this.ctx, town = ctx.town, tc = town.townChest();
    // morning gifts into the Town Chest
    if (h >= 8 && this.giftDay !== day && tc) {
      this.giftDay = day; const R = DQ.rng('gift' + this.id + day, ctx.seed);
      if (this.id === 'wren') for (let i = 0; i < 3; i++) tc.data.store.add(['straw', 'branch', 'cotton'][Math.floor(R() * 3)], 1);
      if (this.id === 'lintwick') tc.data.store.add('lint', 2);
      if (this.id === 'wren' || this.id === 'lintwick') { this.setBalloon('note', 2); ctx.events.emit('gift', { npc: this.id }); }
    }
    // cooking (Marigold, with a Kitchen): twice a day from the Town Chest
    if (this.id === 'marigold' && ctx.rooms && ctx.rooms.has('kitchen') && tc) {
      const slot = h >= 15 ? 2 : h >= 9 ? 1 : 0; if (slot && this.cookT !== day * 10 + slot) {
        const pot = ctx.objects.list.find(o => o.def.station === 'hearth' && !o.gone);
        if (pot) { if (Math.hypot(this.x - (pot.x * T + 8), this.y - (pot.y * T + 8)) < 22) { this.cookT = day * 10 + slot; const S = tc.data.store; let dish = null; if (S.count('puffball') >= 2 && S.count('thimbleberry') >= 1 && S.count('grain') >= 1) { S.remove('puffball', 2); S.remove('thimbleberry', 1); S.remove('grain', 1); dish = 'stew'; } else if (S.count('thimbleberry') >= 2 && S.count('grain') >= 1) { S.remove('thimbleberry', 2); S.remove('grain', 1); dish = 'bun'; } else dish = DQ.h01(day, slot) < .5 ? 'roastPuffball' : 'bun'; S.add(dish, 1); this.anim = { kind: 'stir', t: 0, dur: 3 }; this.say('Mmm! A ' + DQ.ITEMS[dish].name + ' for the Town Chest!', 3); ctx.events.emit('cooked', { dish }); } else return { pos: [pot.x, pot.y + 1, pot.z], radius: 1 }; }
      }
    }
    // helpers build the active Pattern from the Town Chest
    if (this.def.helper && (this.id !== 'mortimer' || h < 18)) {
      const p = town.active();
      if (p) {
        if (this.task && (this.task.cell.done || this.task.pattern.done)) { this.task.cell.claimed = false; this.task = null; }
        if (!this.task) { const t = town.helperTask(this); if (t && t.cell) { if (tc.data.store.remove(t.item, 1)) { t.cell.claimed = true; this.task = t; this.taskT = 0; } } else if (t && t.need && this.balloonT <= 0) { this.setBalloon('need', 3); this.needItem = t.need; } }
        if (this.task) {
          const c = this.task.cell; this.taskT += dt;
          const near = Math.hypot(this.x - (c.x * T + 8), this.y - (c.y * T + 8)) < 30 && Math.abs(this.z - c.z * T) < 40;
          const per = 60 / Math.max(.01, DQ.tune('helperRate'));
          if (near && this.taskT >= per) {
            const w = ctx.world;
            if (c.block) { if (!SOLID[w.get(c.x, c.y, c.z)] && !this.blockedByBody(c)) { w.set(c.x, c.y, c.z, c.block, { by: this, town: true }); DQ.sfx('tok', { vol: .3 }); DQ.game.particles.glints(c.x * T + 8, c.y * T + 8, c.z * T + 8, 3); } else if (w.get(c.x, c.y, c.z) !== c.block && SOLID[w.get(c.x, c.y, c.z)]) { const old = w.get(c.x, c.y, c.z); w.set(c.x, c.y, c.z, 0, { by: this }); const ob = DQ.BLOCKS[old]; if (ob && ob.drop) tc.data.store.add(typeof ob.drop === 'string' ? ob.drop : Array.isArray(ob.drop) ? ob.drop[0] : 'earth', 1); this.taskT = per * .5; return { pos: [c.x, c.y, c.z], radius: 1.6 }; } }
            else if (!ctx.objects.canPlace(c.obj, c.x, c.y, c.z, c.facing)) { ctx.objects.add(c.obj, c.x, c.y, c.z, c.facing, { by: this }); DQ.sfx('tok', { vol: .3 }); }
            c.claimed = false; this.task = null; this.anim = { kind: 'hammer', t: 0, dur: .6 }; town.markDirty(c.x, c.y);
            return null;
          }
          return { pos: [c.x, c.y, Math.min(c.z, ctx.world.topZ(c.x, c.y))], radius: 1.6, dz: 3 };
        }
      }
    }
    // the guard stands watch at his Guard Post by day, patrols the border by night (handled in sleep hours) or wanders
    if (this.id === 'mortimer' && ctx.rooms) { const gp = ctx.rooms.list.find(r => r.type === 'guardPost' && r.inTown); if (gp) { const c = gp.list[0]; return { pos: [c[0], c[1], gp.L], radius: 1.2 }; } }
    if (this.id === 'professor' && ctx.rooms) { const ws = ctx.rooms.list.find(r => r.type === 'workshop' && r.inTown); if (ws) { const c = ws.list[ws.list.length >> 1]; if (Math.hypot(this.x - (c[0] * T + 8), this.y - (c[1] * T + 8)) < 14) { if (!this.anim) this.anim = { kind: 'read', t: 0, dur: 4 }; return null; } return { pos: [c[0], c[1], ws.L], radius: .8 }; } }
    // wander inside the border
    this.wanderT -= dt;
    if (this.wanderT <= 0 || !this._wander) {
      this.wanderT = 6 + DQ.h01(Math.floor(DQ.game.time), this.id.length) * 8;
      const R = DQ.h01(Math.floor(DQ.game.time * 10), this.id.charCodeAt(0)), R2 = DQ.h01(this.id.charCodeAt(1), Math.floor(DQ.game.time * 10)), r = Math.max(2, town.radius - 2);
      const gx = Math.round(town.x + (R * 2 - 1) * r), gy = Math.round(town.y + (R2 * 2 - 1) * r);
      this._wander = [gx, gy, ctx.world.topZ(gx, gy)];
      if (this.id === 'lintwick' && this.mood >= 2) this.anim = { kind: 'dance', t: 0, dur: 2.5 };
    }
    return { pos: this._wander, radius: 1.5 };
  }
  blockedByBody(c) { const all = [].concat(this.ctx.builders || [], this.ctx.npcs.list); return all.some(a => a.body.aabbHits && a.body.aabbHits(c.x, c.y, c.z)); }
  siegeGoal() {
    const ctx = this.ctx, town = ctx.town;
    if (this.id === 'professor') { const hall = ctx.rooms && ctx.rooms.list.find(r => r.type === 'hall'); const c = hall ? hall.list[hall.list.length >> 1] : [town.x - 3, town.y - 3]; return { pos: [c[0], c[1], hall ? hall.L : town.L], radius: 1 }; }
    const m = this.nearestMonster(this.def.fighter ? (this.def.fighter.range + 60) : 80);
    if (m) { const d = Math.hypot(m.x - this.x, m.y - this.y), want = this.def.fighter ? this.def.fighter.range * .8 : 30; if (d > want) return { pos: [Math.floor(m.x / T), Math.floor(m.y / T), Math.floor((m.z + 1) / T)], radius: want / T, run: true }; return null; }
    return { pos: [town.x + (this.id.length % 3) - 1, town.y + 1, town.L], radius: 2 };
  }
  nearestMonster(range) { const ms = this.ctx.monsters ? this.ctx.monsters.list : []; let best = null, bd = range * range; for (const m of ms) { if (m.dead) continue; const d = DQ.d2(m.x, m.y, this.x, this.y); if (d < bd && (!this.ctx.town || this.ctx.town.inside(Math.floor(m.x / T), Math.floor(m.y / T), 2) || (this.ctx.siege && this.ctx.siege.fighting))) { bd = d; best = m; } } return best; }
  /** residents defend the town: Wren's slingshot, Mortimer's club, Marigold's pies, Lintwick rolls */
  fight(dt) {
    const f = this.def.fighter, ctx = this.ctx; if (!f || this.fightCd > 0 || this.sleeping) return;
    if (!(ctx.siege && ctx.siege.fighting) && !(this.id === 'mortimer' && ctx.clock && ctx.clock.isNight)) { if (!(this.id === 'mortimer')) return; }
    const m = this.nearestMonster(f.range); if (!m) return;
    const d = Math.hypot(m.x - this.x, m.y - this.y); if (d > f.range + (m.r || 5)) return;
    this.facing = Math.atan2(m.y - this.y, m.x - this.x); this.fightCd = f.every;
    if (f.kind === 'melee' || f.kind === 'roll') { this.atk = new E.Attack(f.kind === 'melee' ? 'overhead' : 'bash'); this.atk.start(); this.pendingHit = { m, dmg: f.dmg }; if (f.kind === 'roll') { this.rig.kick && this.rig.kick(.4); E.knockback(this, this.body, -60, 0); } }
    else ctx.combat.throwAt(this, m, { kind: f.kind === 'pie' ? 'pie' : 'pebble', dmg: f.dmg });
  }
  rigUpdate(dt, vx, vy) {
    const b = this.body;
    if (this.atk) { const ph = this.atk.update(dt); if (ph === 'active' && this.pendingHit) { const { m, dmg } = this.pendingHit; if (!m.dead && Math.hypot(m.x - this.x, m.y - this.y) < 30) { this.ctx.combat.damageMonster(m, dmg, this, { kb: this.id === 'lintwick' ? 140 : 100 }); DQ.sfx(this.id === 'lintwick' ? 'boing' : 'thwack', { vol: .4 }); } this.pendingHit = null; } if (!this.atk.busy) this.atk = null; }
    if (this.def.blob) {
      const a = this.anim, t = DQ.game.time, hopK = Math.hypot(vx, vy) > 5 ? Math.abs(Math.sin(t * 10)) : 0, dance = a && a.kind === 'dance';
      this.rig.update(dt, { squash: dance ? Math.sin(t * 12) * .3 : (hopK - .5) * .25, look: [Math.cos(this.facing), Math.sin(this.facing)], walk: Math.min(1, Math.hypot(vx, vy) / 40), squint: this.sleeping ? 1 : 0 });
      this.hopZ = dance ? Math.abs(Math.sin(t * 6)) * 5 : hopK * 3;
      if (dance) this.facing += dt * 4;
      return;
    }
    let pose, expr, attack = this.atk ? this.atk.state : null; const a = this.anim;
    if (a) {
      if (a.kind === 'wave') pose = 'wave'; else if (a.kind === 'cheer') { pose = 'cheer'; expr = 'smile'; } else if (a.kind === 'read') pose = 'kneel';
      else if (a.kind === 'hammer') { const u = (a.t % .3) / .3; attack = E.move('hammer', u, u < .45 ? 'wind' : u < .6 ? 'active' : 'recover'); }
      else if (a.kind === 'stir') { const u = (a.t % .5) / .5; attack = E.move('stir', u, 'active'); expr = 'smile'; }
      else if (a.kind === 'eat') { const u = (a.t % .35) / .35; attack = E.move('eat', u, u < .3 ? 'wind' : 'active'); expr = 'smile'; }
      else if (a.kind === 'cower') pose = 'crouch';
    }
    if (this.talking) { pose = pose || (Math.floor(DQ.game.time * 1.5) % 4 === 0 ? 'wave' : this.id === 'marigold' ? 'hips' : undefined); expr = 'smile'; }
    if (!pose && !attack && Math.hypot(vx, vy) < 5) { if (this.id === 'marigold') pose = 'hips'; }
    const down = this.sleeping || this.faint > 0 ? 1 : 0;
    if (this.mood <= 0 && !expr) expr = 'wince';
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx, vy, facing: this.facing, air: !b.onGround, attack, pose, expr, down, hurt: this.flashT > 0 ? 1 : 0, stance: this.def.rig.stance, run: this.id === 'wren' && Math.hypot(vx, vy) > 30 ? 1 : 0 });
  }
  draw(r) {
    if (this.hidden) return;
    const b = this.body, hz = this.hopZ || 0;
    r.shadow(b.x, b.y, 4.5, .4, '#000', Math.max(0, b.groundZ));
    r.actor(b.x, b.y, b.z + hz, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { flash: this.flashT > 0 ? '#ffffff' : undefined, pick: this, every: 1 });
    // the balloon over the head: ! request, ? done, sleep, note, dots, need
    const bl = this.ctx.quests ? this.ctx.quests.balloonFor(this.id) : null, kind = bl || this.balloon;
    if (kind || this.speech) r.queue(b.x, b.y, b.z + 40, g => {
      const p = r.w(b.x, b.y, b.z + (this.def.blob ? 24 : 36) + hz), x = Math.round(p[0]), y = Math.round(p[1]) - Math.round(Math.abs(Math.sin(DQ.game.real * 4)) * 2);
      if (kind) DQ.Hud.balloon(g, kind, x, y, this.needItem);
      if (this.speech) DQ.Hud.speech(g, this.speech.text, x, y - (kind ? 14 : 2));
    }, { bias: .05 });
  }
  portrait(g, x, y, s) {
    if (this.def.blob) { E.ui.box(g, x, y, s, s, { bg: '#2a2350', border: '#f1e6c8' }); const save = this.rig; save.draw(g, x + s / 2, y + s - 6, Object.assign(Object.create(E.VIEWS.iso), { scale: 3.2 })); return; }
    this.rig.drawPortrait(g, x, y, s, { bg: '#2a2350', border: '#f1e6c8', shadow: false });
  }
  serialize() { return { id: this.id, x: this.x, y: this.y, z: this.z, mood: this.mood, needDay: this.needDay, giftDay: this.giftDay, follow: this.follow, cookT: this.cookT }; }
}
DQ.Resident = Resident;

class Residents {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.bubbles = []; this.arriving = null; }
  get(id) { return this.list.find(n => n.id === id) || null; }
  add(id, x, y, L) { if (this.get(id)) return this.get(id); const n = new Resident(this.ctx, id); n.place(x, y, L); this.list.push(n); return n; }
  remove(id) { this.list = this.list.filter(n => n.id !== id); }
  /** a resident arrives: walks in along the east road to the plaza */
  arrive(id, o = {}) {
    const t = this.ctx.town, w = this.ctx.world, sx = Math.min(w.W - 4, t.x + t.radius + 5), sy = t.y;
    const n = this.add(id, sx, sy, w.topZ(sx, sy));
    if (!o.quiet) this.ctx.events.emit('npcArrived', { id, npc: n });
    return n;
  }
  update(dt) {
    const ctx = this.ctx;
    for (const n of this.list) n.update(dt);
    // waiting arrivals come at dawn, or now if it is day
    const t = ctx.town; if (t && t.arrivals.length && ctx.clock && ctx.clock.isDay && !ctx.modal && !(ctx.siege && ctx.siege.active)) { const id = t.arrivals.shift(); if (!this.get(id)) this.arrive(id); }
    // Cheer bubbles: they bob until a builder walks near, then fly to the banner badge
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bb = this.bubbles[i]; bb.t += dt;
      if (!bb.fly) { if (bb.owner && !bb.owner.sleeping) { bb.x = E.lerp(bb.x, bb.owner.x, dt * 3); bb.y = E.lerp(bb.y, bb.owner.y, dt * 3); bb.z = E.lerp(bb.z, bb.owner.z + 36, dt * 3); }
        for (const b of ctx.builders || []) if (!b.ko && Math.hypot(b.x - bb.x, b.y - bb.y) < 2 * T && Math.abs(b.z + 16 - bb.z) < 48) { bb.fly = 1e-6; DQ.sfx("bubble"); if (ctx.town) ctx.town.addCheer(5, "bubble"); ctx.events.emit('bubbleCollected', { need: bb.need }); break; } }
      else { bb.fly += dt; if (bb.fly > .8) this.bubbles.splice(i, 1); }
    }
  }
  draw(r) {
    for (const n of this.list) n.draw(r);
    for (const bb of this.bubbles) {
      if (bb.fly) continue;
      r.queue(bb.x, bb.y, bb.z, g => { const p = r.w(bb.x, bb.y, bb.z + Math.sin(bb.t * 3) * 2), x = Math.round(p[0]), y = Math.round(p[1]); DQ.Hud.heart(g, x, y, 1 + (Math.sin(bb.t * 6) > .7 ? .2 : 0)); }, { bias: .08, emissive: true });
    }
  }
  flyingBubbles() { return this.bubbles.filter(b => b.fly); }
  serialize() { return { list: this.list.map(n => n.serialize()), bubbles: this.bubbles.filter(b => !b.fly).map(b => [b.owner ? b.owner.id : null, b.need]) }; }
  load(d) {
    this.list = []; this.bubbles = [];
    for (const s of (d && d.list) || []) { const n = new Resident(this.ctx, s.id); n.body.x = s.x; n.body.y = s.y; n.body.z = s.z; n.body.lastSafe = [s.x, s.y, s.z]; n.mood = s.mood; n.needDay = s.needDay || n.needDay; n.giftDay = s.giftDay; n.follow = !!s.follow; n.cookT = s.cookT || 0; this.list.push(n); }
    for (const [id, need] of (d && d.bubbles) || []) { const o = this.get(id); if (o) this.bubbles.push({ x: o.x, y: o.y, z: o.z + 34, owner: o, need, t: 0, fly: null }); }
  }
}
DQ.Residents = Residents;
})();
