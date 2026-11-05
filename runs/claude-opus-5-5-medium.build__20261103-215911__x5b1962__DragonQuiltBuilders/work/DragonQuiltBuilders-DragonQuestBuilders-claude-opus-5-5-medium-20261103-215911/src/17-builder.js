// The Builder: the only one left with the Knack. Movement, combat, breaking and placing, eating, KO.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = 16, tun = k => DQ.tuning.get(k);
Object.assign(E.MOVES, {
  place: { rel: true, hand: 'both', a0: -.2, a1: .15, z0: -2, z1: -8, reach: 7, wind: .05, active: .05, recover: .12, lunge: 1.5, blade: 0 },
  eat: { rel: true, hand: 'L', a0: .3, a1: .1, z0: -7, z1: 2, reach: 3, wind: .08, active: .1, recover: .1, blade: 0 },
  stir: { rel: true, a0: -.4, a1: .4, z0: -6, z1: -6, reach: 7, wind: .1, active: .2, recover: .1, blade: 0 },
  chop: { rel: true, plane: 'side', a0: 2.2, a1: -1.4, reach: 7, wind: .1, active: .08, recover: .2, lunge: 1.5, crouch: .3, lean: .35 }
});
const DIR8 = a => { const k = Math.round(a / (Math.PI / 4)); const d = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]; return d[((k % 8) + 8) % 8]; };
DQ.DIR8 = DIR8;
const LOOKS = {
  A: { hair: 'spiky', hat: { style: 'band', color: '#c8443a' }, outfit: 'tunic' },
  B: { hair: 'ponytail', hat: null, outfit: 'robe' }
};
const PALETTES = [
  { cloth: '#3a5f9a', trim: '#e8c870', hair: '#5a3a22', pants: '#4a3a5a' },
  { cloth: '#4a8a5a', trim: '#f0d8a0', hair: '#c86a2a', pants: '#3a4a3a' },
  { cloth: '#a04a6a', trim: '#f0e0c0', hair: '#2a2028', pants: '#4a2a3a' },
  { cloth: '#c88a3a', trim: '#5a3a22', hair: '#e8d090', pants: '#5a4a3a' }
];
DQ.LOOKS = LOOKS; DQ.PALETTES = PALETTES;
DQ.makeBuilderRig = (look = 'A', pal = 0, color) => {
  const L = LOOKS[look] || LOOKS.A, P = PALETTES[pal] || PALETTES[0];
  const colors = { skin: '#f2c39a', hair: P.hair, cloth: color || P.cloth, coat: color || P.cloth, trim: P.trim, pants: P.pants, boot: '#5a3a22', belt: '#8a5a32', metal: '#c8c8d8' };
  const rig = new E.Humanoid({ size: 1, build: 'chibi', hair: L.hair, hat: L.hat || undefined, outfit: L.outfit, weapon: 'sword', face: { eyes: 'big' }, colors });
  rig.o.tool = 'stick'; return rig;
};

class Builder {
  constructor(ctx, o = {}) {
    this.ctx = ctx; this.local = o.local !== false; this.id = o.id || 0; this.name = o.name || 'Patch'; this.color = o.color || null;
    this.look = o.look || 'A'; this.pal = o.pal || 0;
    this.body = new DQ.VoxelBody({ x: o.x || 0, y: o.y || 0, z: o.z || 0, kind: 'builder', r: 5, h: 28, step: 2, gravity: tun('gravity') });
    this.rig = DQ.makeBuilderRig(this.look, this.pal, this.color);
    this.bag = new DQ.Bag(40); this.hotbar = new Array(8).fill(null); this.sel = 0;
    this.equip = { weapon: 'darningStick', body: null, shield: null };
    this.hearts = 0; this.hp = this.maxHp; this.belly = 100;
    this.combo = new E.Combo(['slash', 'backslash'], { window: .3 }); this.act = null; this.charge = 0; this.iframe = 0;
    this.placeCool = 0; this.ko = 0; this.coyote = 0; this.jumpBuf = 0; this.hopT = 0; this.eatT = 0; this.mood = null; this.moodT = 0;
    this.target = { brk: null, plc: null, obj: null, npc: null, inReach: false };
    this.eye = { on: false, x: 0, y: 0, z: 0, rep: 0 };
    this.spinUnlocked = false; this.seat = null; this.sleeping = false; this.notionT = 0;
    this.stats = { blocks: 0, kills: 0, gathered: 0 };
    this._bellyWarn = 0; this._starve = 0; this._step = 0; this.stepSound = 0;
  }
  get maxHp() { return Math.round(tun('maxHpBase') + this.hearts * 10); }
  get weapon() { return DQ.ITEMS[this.equip.weapon] || DQ.ITEMS.darningStick; }
  get def() { return (this.equip.body ? DQ.ITEMS[this.equip.body].def : 0) + (this.equip.shield ? DQ.ITEMS[this.equip.shield].def : 0); }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  get L0() { return Math.floor((this.body.z + 1) / T); }
  get held() { const id = this.hotbar[this.sel]; return id && (this.bag.count(id) > 0) ? id : null; }
  setEquip(slot, id) { this.equip[slot] = id; if (slot === 'weapon') this.rig.o.tool = (DQ.ITEMS[id] && DQ.ITEMS[id].rig) === 'sword' ? null : (DQ.ITEMS[id] ? DQ.ITEMS[id].rig : 'stick'); }
  // the item lands in the bag (pickups, rewards, crafts)
  take(id, n, o = {}) {
    const left = this.bag.add(id, n), got = n - left;
    if (got <= 0) return 0;
    this.stats.gathered += got;
    const it = DQ.ITEMS[id];
    if (this.local) {
      if (this.ctx.hud && !o.quiet) this.ctx.hud.toast('+' + got + ' ' + it.name, 'item', id);
      if (this.ctx.audioX && !o.quiet) this.ctx.audioX.sfx('pickup');
      // a new placeable or usable item fills an empty hotbar slot
      if (['block', 'object', 'food', 'use'].includes(it.kind) && !this.hotbar.includes(id)) { const k = this.hotbar.indexOf(null); if (k >= 0) this.hotbar[k] = id; }
      if (it.kind === 'weapon' && (it.atk > this.weapon.atk || it.tier > this.weapon.tier) && !o.noEquip) this.setEquip('weapon', id);
      if ((it.kind === 'body' || it.kind === 'shield') && !this.equip[it.kind]) this.setEquip(it.kind, id);
    }
    this.ctx.events.emit('itemGained', { id, n: got, by: this, drop: o.drop });
    return got;
  }
  // ---- the step ----
  update(dt, it) {
    const ctx = this.ctx, w = ctx.world, b = this.body, game = ctx.game;
    b.gravity = tun('gravity');
    if (this.iframe > 0) this.iframe -= dt;
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = null; }
    if (this.notionT > 0) this.notionT -= dt;
    if (this.ko > 0) { this._koStep(dt); return; }
    if (this.sleeping) { this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, facing: b.facing, down: 1 }); return; }
    if (this.seat) { this._seated(dt, it); return; }
    // hotbar
    if (it.hot !== null && it.hot !== undefined && !this.eye.on) {
      if (typeof it.hot === 'object') this.sel = it.hot.slot; else this.sel = (this.sel + it.hot + 8) % 8;
      if (this.local && ctx.audioX) ctx.audioX.sfx('uiMove');
    }
    // movement (Builder's Eye holds still and moves its cursor instead)
    const eye = it.eye && !it.mouse;
    if (eye && !this.eye.on) { const t = this._autoTarget(); this.eye.on = true; const c = t.plc || t.brk || { x: Math.floor(b.x / T), y: Math.floor(b.y / T), z: this.L0 }; Object.assign(this.eye, { x: c.x, y: c.y, z: c.z, rep: 0 }); }
    if (!eye) this.eye.on = false;
    let mx = it.move[0], my = it.move[1];
    if (this.eye.on) { this._eyeStep(dt, it); mx = my = 0; }
    const busy = this.combo.busy && this.combo.current.phase !== 'recover';
    const fly = DQ.dev.fly && this.local;
    b.fly = fly;
    let sp = tun('walk') * (it.sprint && !this.eye.on ? tun('sprint') : 1) * (busy ? .45 : 1) * (this.charge > 0 ? .5 : 1) * (b.inWater ? 1 : 1);
    const len = Math.hypot(mx, my);
    const tx = mx * sp, ty = my * sp, acc = (b.onGround || fly ? 900 : 900 * .6) * dt;
    if (len > .05) { b.vx = E.approach(b.vx, tx, acc); b.vy = E.approach(b.vy, ty, acc); if (!busy) b.facing = E.approachAng(b.facing, Math.atan2(my, mx), dt * 14); }
    else { const f = Math.max(0, 1 - 10 * dt); b.vx *= f; b.vy *= f; if (Math.abs(b.vx) < 1) b.vx = 0; if (Math.abs(b.vy) < 1) b.vy = 0; }
    if (fly) { b.vz = it.jumpHeld ? 140 : it.sprint ? -140 : 0; }
    // jump: coyote time and a buffer
    this.coyote = b.onGround ? .08 : Math.max(0, this.coyote - dt);
    if (it.jump && !this.eye.on) this.jumpBuf = .12; else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.jumpBuf > 0 && this.coyote > 0 && !fly) { b.jump(tun('jump')); this.jumpBuf = 0; this.coyote = 0; if (ctx.audioX && this.local) ctx.audioX.sfx('jump'); }
    // auto-hop: walking into a 1-block ledge with room above
    if ((game.settings.dqAutoHop !== false) && b.onGround && len > .3 && !fly) {
      const ax = Math.floor((b.x + Math.cos(b.facing) * (b.r + 3)) / T), ay = Math.floor((b.y + Math.sin(b.facing) * (b.r + 3)) / T), L = this.L0;
      if (w.solidAt(ax, ay, L) && !w.solidAt(ax, ay, L + 1) && !w.solidAt(ax, ay, L + 2) && !w.solidAt(Math.floor(b.x / T), Math.floor(b.y / T), L + 2) && b.hitWall) { this.hopT += dt; if (this.hopT > .08) { b.jump(tun('jump')); b.vx += Math.cos(b.facing) * 20; b.vy += Math.sin(b.facing) * 20; this.hopT = 0; } }
      else this.hopT = 0;
    }
    b.update(dt, w);
    if (b.landed && ctx.audioX && this.local) ctx.audioX.sfx('land');
    if (b.fellOut) this._unravelRespawn();
    // footsteps by material
    if (b.onGround && len > .2 && this.local) { this._step += dt * (it.sprint ? 1.4 : 1); if (this._step > .28) { this._step = 0; const id = w.get(Math.floor(b.x / T), Math.floor(b.y / T), this.L0 - 1); ctx.audioX && ctx.audioX.step(b.inWater ? 'water' : (DQ.BLOCKS[id] && DQ.BLOCKS[id].step) || 'grass'); } }
    // targets
    this._target(it);
    // actions
    this._actions(dt, it);
    this.placeCool = Math.max(0, this.placeCool - dt);
    // hunger
    this._hunger(dt, it);
    // the rig
    const atk = this.act ? this.act.state : this.combo.state;
    if (this.act && !this.act.busy) this.act = null;
    if (this.act) this.act.update(dt);
    const pose = this.notionT > .6 ? 'kneel' : this.notionT > 0 ? 'cheer' : this.mood === 'cheer' ? 'cheer' : this.mood === 'wave' ? 'wave' : this.charge > .15 ? 'crouch' : undefined;
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: b.facing, air: !b.onGround && !fly, attack: atk, hurt: this.iframe > .5, pose, expr: this.eatT > 0 ? 'smile' : this.iframe > .4 ? 'wince' : undefined, sprint: it.sprint && len > .3 });
    if (this.eatT > 0) this.eatT -= dt;
  }
  _autoTarget() {
    const w = this.ctx.world, b = this.body, L0 = this.L0, [dx, dy] = DIR8(b.facing);
    const bx = Math.floor(b.x / T), by = Math.floor(b.y / T), cx = bx + dx, cy = by + dy;
    let brk = null, obj = null;
    for (const l of [L0, L0 + 1, L0 - 1]) { const o = w.objAt(cx, cy, l); if (o) { obj = o; break; } }
    if (!obj) for (const l of [L0, L0 + 1, L0 - 1]) if (w.get(cx, cy, l) && !DQ.BLOCKS[w.get(cx, cy, l)].liquid) { brk = { x: cx, y: cy, z: l }; break; }
    let plc = null;
    for (const l of [L0 - 1, L0, L0 + 1, L0 + 2]) { const id = w.get(cx, cy, l); if ((!id || DQ.BLOCKS[id].liquid) && !w.objAt(cx, cy, l)) { if (l === L0 - 1 || w.solidAt(cx, cy, l - 1) || l > L0) { plc = { x: cx, y: cy, z: l }; break; } } }
    return { brk, plc, obj };
  }
  _eyeStep(dt, it) {
    const e = this.eye, I = this.ctx.game.input, m = it.move;
    e.rep -= dt;
    const fixed = (this.ctx.game.view.yawDeg % 360 + 360) % 360;
    if (Math.hypot(m[0], m[1]) > .4 && e.rep <= 0) {
      const [dx, dy] = DIR8(Math.atan2(m[1], m[0])); e.x += dx; e.y += dy; e.rep = .16;
    } else if (Math.hypot(m[0], m[1]) <= .4) e.rep = 0;
    if (it.jump) e.z++;
    if (it.sprint && !this._eyeSprint) e.z--;
    this._eyeSprint = it.sprint;
    const b = this.body, R = tun('reach');
    const ccx = b.x / T, ccy = b.y / T, ccz = (b.z + 16) / T;
    const d = Math.hypot(e.x + .5 - ccx, e.y + .5 - ccy, e.z + .5 - ccz);
    if (d > R) { const k = R / d; e.x = Math.round(ccx + (e.x + .5 - ccx) * k - .5); e.y = Math.round(ccy + (e.y + .5 - ccy) * k - .5); e.z = Math.round(ccz + (e.z + .5 - ccz) * k - .5); }
    e.z = E.clamp(e.z, 1, this.ctx.world.H - 1);
  }
  inReach(c) { if (!c) return false; const b = this.body; return Math.hypot(c.x + .5 - b.x / T, c.y + .5 - b.y / T, c.z + .5 - (b.z + 16) / T) <= tun('reach') + .01; }
  _target(it) {
    const w = this.ctx.world, t = this.target;
    t.npc = null; t.monster = null;
    if (it.cursor && !this.eye.on) {
      const c = it.cursor, o = c.obj || w.objAt(c.x, c.y, c.z);
      t.obj = o || (it.cursorObj && it.cursorObj.def ? it.cursorObj : null); t.brk = o ? null : { x: c.x, y: c.y, z: c.z };
      const n = c.n || [0, 0, 1]; t.plc = { x: c.x + n[0], y: c.y + n[1], z: c.z + n[2] };
      if (o && !o.def.solid) t.plc = { x: c.x, y: c.y, z: c.z + (o.def.tall ? 2 : 1) };
      if (w.solidAt(t.plc.x, t.plc.y, t.plc.z)) t.plc = null;
      t.mode = 'mouse';
      if (it.cursorActor) { if (it.cursorActor.npc) t.npc = it.cursorActor; }
    } else if (this.eye.on) {
      const e = this.eye, o = w.objAt(e.x, e.y, e.z), id = w.get(e.x, e.y, e.z);
      t.obj = o; t.brk = !o && id && !DQ.BLOCKS[id].liquid ? { x: e.x, y: e.y, z: e.z } : null; t.plc = !o && (!id || DQ.BLOCKS[id].liquid) ? { x: e.x, y: e.y, z: e.z } : null; t.mode = 'eye';
    } else { const a = this._autoTarget(); t.brk = a.brk; t.plc = a.plc; t.obj = a.obj; t.mode = 'auto'; }
    t.inBrk = this.inReach(t.brk || (t.obj && { x: t.obj.x, y: t.obj.y, z: t.obj.z })); t.inPlc = this.inReach(t.plc);
    // who is in front to talk to
    const b = this.body;
    if (!t.npc && this.ctx.npcs) { let best = null, bd = 30; for (const n of this.ctx.npcs.list) { if (n.away) continue; const d = Math.hypot(n.body.x - b.x, n.body.y - b.y); if (d < bd && Math.abs(n.body.z - b.z) < 24) { const a = Math.abs(E.angDiff(b.facing, Math.atan2(n.body.y - b.y, n.body.x - b.x))); if (a < 1.5 || d < 14) { bd = d; best = n; } } } t.npc = best; }
    // an object to use: the target, or the nearest usable one close by
    t.use = null;
    const usable = o => o && (o.def.station || o.def.chest || o.def.bed || o.def.ballista || o.def.portal || o.def.banner || o.def.bundle || o.def.collect || o.def.supply || o.def.seat || o.id === 'cage');
    if (usable(t.obj) && (t.inBrk || t.mode === 'mouse' && this.inReach({ x: t.obj.x, y: t.obj.y, z: t.obj.z }))) t.use = t.obj;
    else if (this.ctx.objects) { let bd = 26; for (const o of this.ctx.objects.near(b.x, b.y, b.z, 2.2, usable)) { const [ox, oy] = this.ctx.objects.pos(o), d = Math.hypot(ox - b.x, oy - b.y); if (d < bd) { bd = d; t.use = o; } } }
  }
  _actions(dt, it) {
    const ctx = this.ctx, w = ctx.world, t = this.target, b = this.body;
    // a modal UI open: no actions
    if (ctx.ui && ctx.ui.modal) return;
    // pattern placement mode eats place and swing
    if (ctx.town && ctx.town.placing && this.local) { ctx.town.placingStep(it, this); return; }
    // face the mouse target while acting
    const faceTo = c => { if (it.mouse && c) b.facing = Math.atan2((c.y + .5) * T - b.y, (c.x + .5) * T - b.x); };
    // Spin Stitch: hold swing (unlocked by Mortimer)
    if (this.spinUnlocked && it.swingHeld && !(this.act && this.act.busy)) { this.charge += dt; if (this.charge > .2 && this.local && ctx.audioX) ctx.audioX.charge(this.charge); }
    if (it.swingReleased && this.charge >= .6 && this.spinUnlocked) { this.charge = 0; this.combo.cancel(); this._spin(); return; }
    if (!it.swingHeld) this.charge = 0;
    if (it.swing) { faceTo(t.brk || (t.obj && { x: t.obj.x, y: t.obj.y })); if (this.combo.press()) { this.swung = false; if (ctx.audioX && this.local) ctx.audioX.sfx('swing'); } }
    const ph = this.combo.update(dt * (1 / (this.weapon.speed || 1)));
    if (this.combo.busy && this.combo.current.active && !this.swung && this.combo.current.u >= .35) { this.swung = true; this._strike(); }
    if (it.interact) { if (this.interact()) return; }
    if (it.place && this.placeCool <= 0) { faceTo(t.plc); this.place(); }
  }
  // the swing connects: monsters in the arc first, else the block or object targeted
  _strike() {
    const ctx = this.ctx, b = this.body, hits = ctx.monsters ? ctx.monsters.inArc(b, b.facing, 22, 70 * Math.PI / 360, 14) : [];
    if (hits.length) { for (const m of hits) ctx.combat.builderHits(this, m, 1); return; }
    const t = this.target;
    if (t.obj && t.inBrk) { this.hitObject(t.obj); return; }
    if (t.brk && t.inBrk) this.hitBlock(t.brk.x, t.brk.y, t.brk.z);
  }
  _spin() {
    const ctx = this.ctx, b = this.body;
    this.act = new E.Attack('spin'); this.act.start();
    if (ctx.audioX && this.local) ctx.audioX.sfx('spinRelease');
    const hits = ctx.monsters ? ctx.monsters.inArc(b, b.facing, 26, Math.PI, 16) : [];
    for (const m of hits) ctx.combat.builderHits(this, m, 1.5, { spin: true, kb: 180 });
    ctx.game.particles.ring(b.x, b.y, 4, 26, '#f1e6c8', .3);
    ctx.events.emit('spin', { by: this, hits: hits.length });
  }
  hitBlock(x, y, z) {
    const ctx = this.ctx, w = ctx.world, id = w.get(x, y, z); if (!id) return false;
    const bk = DQ.BLOCKS[id], wp = this.weapon, tier = wp.tier || 1;
    if (bk.tier > tier || bk.tier >= 99) {
      if (this.local) { ctx.audioX && ctx.audioX.sfx('clink'); ctx.hud && ctx.hud.hint(bk.tier >= 99 ? 'That cannot be broken.' : 'Too tough for your ' + wp.name + '!'); }
      ctx.game.particles.sparks((x + .5) * T, (y + .5) * T, (z + .5) * T, 4, b0 => 0);
      return false;
    }
    if (ctx.netClient && !ctx.netClient.local) { ctx.netClient.act(['break', x, y, z]); return true; }
    const i = w.idx(x, y, z), m = w.meta.get(i) || {};
    let dmg = wp.blockDmg * tun('blockDmg') * (wp.ripper && id === 12 ? 4 : 1);
    if (DQ.dev.instantBreak && this.local) dmg = 1e6;
    m.hp = (m.hp || 0) + dmg; m.t = ctx.game.time; w.meta.set(i, m); w.colVer[y * w.W + x]++;
    if (this.local) { ctx.audioX && ctx.audioX.sfxAt(bk.hp > 15 ? 'hitHard' : 'hitSoft', x * T, y * T); ctx.game.input.rumble(.15, .05); }
    if (m.hp >= bk.hp) { this.breakBlock(x, y, z); return true; }
    ctx.game.particles.bits((x + .5) * T, (y + .5) * T, (z + 1) * T, 3, [bk.col, bk.side || bk.col]);
    return true;
  }
  breakBlock(x, y, z, o = {}) {
    const ctx = this.ctx, w = ctx.world, id = w.get(x, y, z), bk = DQ.BLOCKS[id];
    if (!id) return;
    const meta = w.metaAt(x, y, z);
    if (meta && meta.gate && !ctx.flags.gateCut) { ctx.events.emit('gateHit', { x, y, z, by: this }); }
    w.set(x, y, z, 0, { by: this.id });
    ctx.game.particles.bits((x + .5) * T, (y + .5) * T, (z + .5) * T, 10, [bk.col, E.tones(bk.col).lt, bk.side || bk.col]);
    ctx.game.particles.dust((x + .5) * T, (y + .5) * T, z * T + 4, 4);
    if (ctx.audioX) ctx.audioX.sfxAt(bk.key === 'tangle' || bk.key === 'frayed' ? 'crumble' : 'rip', x * T, y * T);
    if (this.local) ctx.game.input.rumble(.15, .06);
    ctx.stats.blocksBroken++; this.stats.blocks++;
    if (bk.drop && !o.noDrop) { const ch = bk.dropChance === undefined ? 1 : bk.dropChance * tun('dropRate'); if (DQ.rng('drops')() < ch) ctx.drops.spawn(bk.drop, bk.dropN || 1, (x + .5) * T, (y + .5) * T, z * T + 4, { owner: this.id }); }
    // things standing on it fall too (plants and furniture pop off)
    const above = w.objAt(x, y, z + 1); if (above && !above.def.fixed && !above.def.tall) this.hitObject(above, true);
    if (above && above.def.tall && !above.def.fixed) this.hitObject(above, true);
  }
  hitObject(o, force) {
    const ctx = this.ctx, d = o.def, [x, y, z] = ctx.objects.pos(o);
    if (ctx.netClient && !ctx.netClient.local && this.local) { ctx.netClient.act(['hitobj', o.uid]); return true; }
    if (d.plant) {
      ctx.objects.remove(o, { by: this.id });
      for (const k in d.plant) { const [a, bb, ch] = d.plant[k]; if (ch !== undefined && DQ.rng('drops')() > ch * tun('dropRate')) continue; const n = a + Math.floor(DQ.rng('drops')() * (bb - a + 1)); if (n > 0) ctx.drops.spawn(k, n, x, y, z + 4, { owner: this.id }); }
      ctx.game.particles.bits(x, y, z + 4, 8, ['#8ab040', '#d8b850', '#f4f0f8']); ctx.audioX && ctx.audioX.sfxAt('rip', x, y);
      ctx.stats.blocksBroken++; return true;
    }
    if (o.id === 'cage') {
      const wp = this.weapon; if ((wp.tier || 1) < d.tier) { if (this.local) { ctx.audioX && ctx.audioX.sfx('clink'); ctx.hud && ctx.hud.hint('Too tough for your ' + wp.name + '!'); } return false; }
      o.hp -= wp.blockDmg * tun('blockDmg'); ctx.game.particles.bits(x, y, z + 10, 4, ['#2a1a3a', '#5a3a6a']); ctx.audioX && ctx.audioX.sfx('hitHard');
      if (o.hp <= 0) { ctx.objects.remove(o, { by: this.id }); ctx.events.emit('cageBroken', { obj: o }); ctx.game.particles.bits(x, y, z + 10, 14, ['#2a1a3a', '#5a3a6a']); }
      return true;
    }
    if (d.fixed && !force) { if (this.local && ctx.hud && !d.plant) ctx.hud.hint(d.name + ' stays put.'); return false; }
    if (d.fixed) return false;
    if (ctx.siege && ctx.siege.active && d.ballista && !force) return false;
    // furniture comes back into the bag
    if (o.items && Object.keys(o.items).length && !force) { if (this.local && ctx.hud) ctx.hud.hint('Empty the chest first!'); return false; }
    ctx.objects.remove(o, { by: this.id });
    const item = Object.keys(DQ.ITEMS).find(k => DQ.ITEMS[k].obj === o.id);
    if (item && !o.broken) ctx.drops.spawn(item, 1, x, y, z + 4, { owner: this.id });
    ctx.audioX && ctx.audioX.sfxAt('hitSoft', x, y); ctx.game.particles.dust(x, y, z + 2, 5);
    return true;
  }
  // place / use the held item
  place() {
    const ctx = this.ctx, w = ctx.world, id = this.held, t = this.target;
    if (!id) { if (this.local && ctx.hud && this.hotbar[this.sel]) ctx.hud.hint("You don't have any more of those."); return false; }
    const it = DQ.ITEMS[id];
    if (it.kind === 'food') return this.eat(id);
    if (it.kind === 'use') return this.use(id);
    if (it.kind === 'weapon' || it.kind === 'body' || it.kind === 'shield') { this.setEquip(it.kind === 'weapon' ? 'weapon' : it.kind, id); if (this.local && ctx.hud) ctx.hud.hint('Equipped: ' + it.name); return true; }
    if (it.kind !== 'block' && it.kind !== 'object') return false;
    const c = t.plc;
    if (!c || !t.inPlc) { if (this.local && ctx.hud && c) ctx.hud.hint('Too far!'); return false; }
    if (!w.inside(c.x, c.y, c.z) || c.z < 1) return false;
    if (this.blockedByBody(c.x, c.y, c.z, it.kind === 'object' && DQ.OBJECTS[it.obj].tall ? 2 : 1, it.kind === 'object' && !DQ.OBJECTS[it.obj].solid)) { if (this.local && ctx.hud) ctx.hud.hint("Something's in the way!"); return false; }
    if (it.kind === 'block') {
      const bid = DQ.blockId(it.block), bk = DQ.BLOCKS[bid];
      if (w.get(c.x, c.y, c.z) && !DQ.BLOCKS[w.get(c.x, c.y, c.z)].liquid) return false;
      if (w.objAt(c.x, c.y, c.z)) return false;
      const rot = bk.shape === 'stair' ? ((Math.round(this.body.facing / (Math.PI / 2)) % 4) + 4) % 4 : undefined;
      if (ctx.netClient && !ctx.netClient.local) { ctx.netClient.act(['place', c.x, c.y, c.z, bid, rot || 0]); this.bag.remove(id, 1); }
      else { this.bag.remove(id, 1); w.set(c.x, c.y, c.z, bid, { by: this.id, rot, town: ctx.town && ctx.town.inBorder(c.x, c.y) }); }
      ctx.stats.blocksPlaced++;
      ctx.game.particles.glints((c.x + .5) * T, (c.y + .5) * T, (c.z + 1) * T, 4, '#f1e6c8');
      if (ctx.renderer) ctx.renderer.pop = { x: c.x, y: c.y, z: c.z, t: .12 };
      ctx.audioX && ctx.audioX.sfxAt('stitch', c.x * T, c.y * T);
    } else {
      const def = DQ.OBJECTS[it.obj];
      if (!w.solidAt(c.x, c.y, c.z - 1)) { if (this.local && ctx.hud) ctx.hud.hint('It needs solid ground.'); return false; }
      if (w.get(c.x, c.y, c.z) && !DQ.BLOCKS[w.get(c.x, c.y, c.z)].liquid) return false;
      // doors face along the wall; everything else faces the builder
      let facing = ((Math.round((this.body.facing + Math.PI) / (Math.PI / 2)) % 4) + 4) % 4;
      if (def.door) { const ew = w.solidAt(c.x - 1, c.y, c.z) || w.solidAt(c.x + 1, c.y, c.z); facing = ew ? 1 : 0; }
      if (ctx.netClient && !ctx.netClient.local) { ctx.netClient.act(['obj', it.obj, c.x, c.y, c.z, facing]); this.bag.remove(id, 1); }
      else { const ob = ctx.objects.add({ id: it.obj, x: c.x, y: c.y, z: c.z, facing, town: ctx.town && ctx.town.inBorder(c.x, c.y) }, { by: this.id }); if (!ob) return false; this.bag.remove(id, 1); }
      ctx.audioX && ctx.audioX.sfxAt('stitch', c.x * T, c.y * T);
      ctx.game.particles.glints((c.x + .5) * T, (c.y + .5) * T, (c.z + 1) * T, 6, '#f1e6c8');
    }
    this.placeCool = DQ.dev.creative ? .12 : .18;
    this.act = new E.Attack('place'); this.act.start();
    return true;
  }
  blockedByBody(x, y, z, h, soft) {
    if (soft) return false;
    const ctx = this.ctx, bodies = [...ctx.builders.map(b => b.body), ...(ctx.npcs ? ctx.npcs.list.map(n => n.body) : []), ...(ctx.monsters ? ctx.monsters.list.filter(m => !m.dead).map(m => m.body) : [])];
    for (const b of bodies) {
      if (!b) continue;
      const qx = E.clamp(b.x, x * T, x * T + T), qy = E.clamp(b.y, y * T, y * T + T);
      if (Math.hypot(qx - b.x, qy - b.y) < b.r - .5 && b.z < (z + h) * T - .5 && b.z + b.h > z * T + .5) return true;
    }
    return false;
  }
  eat(id) {
    const it = DQ.ITEMS[id], ctx = this.ctx; if (!it.food) return false;
    if (this.belly >= 100 && this.hp >= this.maxHp) { if (this.local && ctx.hud) ctx.hud.hint("You're full!"); return false; }
    this.bag.remove(id, 1); this.belly = Math.min(100, this.belly + it.food.belly); this.heal(it.food.hp);
    this.act = new E.Attack('eat'); this.act.start(); this.eatT = .9;
    ctx.audioX && ctx.audioX.sfx('eat'); ctx.events.emit('itemUsed', { id, by: this });
    return true;
  }
  heal(n) { const was = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); if (this.hp > was && this.ctx.game.particles) this.ctx.game.particles.text(this.body.x, this.body.y, this.body.z + 30, '+' + (this.hp - was), '#6ae06a', { bounce: false }); }
  use(id) {
    const ctx = this.ctx;
    if (id === 'heartpatch') { this.bag.remove(id, 1); this.hearts++; this.hp = this.maxHp; ctx.audioX && ctx.audioX.jingle('item'); ctx.hud && ctx.hud.popup('Max HP up!', 'Your Heartpatch is stitched on. Max HP ' + this.maxHp + '.'); ctx.game.particles.glints(this.body.x, this.body.y, this.body.z + 20, 12, '#ff8ab0'); ctx.events.emit('itemUsed', { id, by: this }); return true; }
    if (id === 'banner') return ctx.town ? ctx.town.tryPlant(this) : false;
    if (id === 'hallPattern') return ctx.town ? ctx.town.startPlacing('hall', this) : false;
    return false;
  }
  interact() {
    const ctx = this.ctx, t = this.target;
    if (t.npc && ctx.npcs) { ctx.npcs.talk(t.npc, this); return true; }
    if (t.use) return ctx.useObject ? ctx.useObject(t.use, this) : false;
    return false;
  }
  _seated(dt, it) {
    const ctx = this.ctx, o = this.seat, b = this.body;
    if (it.interact || !ctx.objects.byId.has(o.uid) || o.broken) { this.seat = null; o.manned = false; if (ctx.camEase) ctx.camEase = null; return; }
    // aim within +-60 degrees of the ballista's facing, with aim assist toward monsters
    const base = o.facing * Math.PI / 2;
    let want = o.aim;
    if (it.mouse && it.cursor) want = Math.atan2((it.cursor.y + .5) * T - (o.y + .5) * T, (it.cursor.x + .5) * T - (o.x + .5) * T);
    else if (Math.hypot(it.move[0], it.move[1]) > .3) want = Math.atan2(it.move[1], it.move[0]);
    const d = E.clamp(E.angDiff(base, want), -Math.PI * .75, Math.PI * .75); o.aim = E.approachAng(o.aim, base + d, dt * 4);
    if (ctx.monsters) { let best = null, bd = 12 * Math.PI / 180; for (const m of ctx.monsters.list) { if (m.dead) continue; const a = Math.atan2(m.body.y - (o.y + .5) * T, m.body.x - (o.x + .5) * T), dd = Math.abs(E.angDiff(o.aim, a)); if (dd < bd) { bd = dd; best = a; } } if (best !== null) o.aim = E.approachAng(o.aim, best, dt * 2); }
    if (it.swing && o.reload <= 0) ctx.objects.fire(o, true, 30);
    if (o.reload > 0 && o.reload < .3 && !o._clack) { o._clack = true; ctx.audioX && ctx.audioX.sfx('ballistaReload'); } if (o.reload <= 0) o._clack = false;
    b.x = (o.x + .5) * T - Math.cos(o.aim) * 12; b.y = (o.y + .5) * T - Math.sin(o.aim) * 12; b.vx = b.vy = 0; b.facing = o.aim;
    b.z = ctx.world.groundAt(b.x, b.y, 3, b.z + 8, 8); if (b.z === -Infinity) b.z = o.z * T;
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, facing: o.aim, pose: 'crouch' });
  }
  // ---- hurt, KO, respawn ----
  hurt(dmg, from = {}) {
    const ctx = this.ctx;
    if (this.ko > 0 || this.iframe > 0) return false;
    if ((DQ.dev.god && this.local) || this.invuln) dmg = 0;
    const diff = { Relaxed: .5, Normal: 1, Hard: 1.4 }[ctx.game.settings.dqDifficulty || 'Normal'] || 1;
    dmg = Math.max(dmg > 0 ? 1 : 0, Math.round(dmg * diff));
    this.hp = Math.max(0, this.hp - dmg); this.iframe = .8;
    if (from.x !== undefined) { const a = Math.atan2(this.body.y - from.y, this.body.x - from.x); this.body.push(Math.cos(a) * 90, Math.sin(a) * 90, 60); }
    if (this.local) { ctx.game.input.rumble(.35, .12); ctx.audioX && ctx.audioX.sfx('builderHurt'); if (dmg > 0) ctx.game.flash('#ff2040', .08, .25); }
    if (dmg > 0) ctx.game.particles.text(this.body.x, this.body.y, this.body.z + 30, String(dmg), '#ff6a6a', { bounce: true });
    ctx.events.emit('builderHurt', { by: this, dmg, from });
    if (dmg > 0 && this.seat) { this.seat.manned = false; this.seat = null; }
    if (this.hp <= 0) this._ko();
    return true;
  }
  _ko() {
    const ctx = this.ctx; this.ko = 2.6; this.combo.cancel(); this.charge = 0;
    ctx.events.emit('builderKO', { by: this });
    if (this.local) { ctx.audioX && ctx.audioX.jingle('undone'); }
  }
  _koStep(dt) {
    const ctx = this.ctx, b = this.body, was = this.ko; this.ko -= dt;
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, facing: b.facing, pose: 'die' });
    if (was > 1.6 && this.ko <= 1.6) DQ.FX.unravel(ctx, b.x, b.y, b.z, 60);
    if (this.ko <= 0) { this.ko = 0; if (ctx.onBuilderKO) ctx.onBuilderKO(this); else this.respawn(); }
  }
  respawn(at) {
    const ctx = this.ctx, b = this.body, p = at || (ctx.town && ctx.town.planted ? ctx.town.spawnPoint() : ctx.startPoint);
    if (p) { b.x = p[0]; b.y = p[1]; b.z = p[2]; } b.vx = b.vy = b.vz = 0; ctx.world.escape(b);
    this.hp = this.maxHp; this.belly = Math.max(this.belly, 60); this.iframe = 1.5;
    if (this.local) ctx.game.cam.snap = true;
  }
  _unravelRespawn() {
    const ctx = this.ctx, b = this.body; DQ.FX.unravel(ctx, b.x, b.y, Math.max(0, b.z), 30);
    b.respawnSafe(); ctx.world.escape(b);
    if (this.local) { ctx.audioX && ctx.audioX.sfx('warp'); ctx.hud && ctx.hud.hint('You fell into the Unravel!'); ctx.game.cam.snap = true; }
    this.hurt(4);
  }
  _hunger(dt, it) {
    const ctx = this.ctx; if (DQ.dev.noHunger || !this.local || ctx.mode === 'bee') return;
    const fight = ctx.monsters && ctx.monsters.list.some(m => !m.dead && m.aggro && Math.hypot(m.body.x - this.body.x, m.body.y - this.body.y) < 120);
    const rate = tun('belly') * (it.sprint && Math.hypot(it.move[0], it.move[1]) > .2 ? 1.5 : 1) * (fight ? 1.2 : 1) / 9;
    const was = this.belly; this.belly = Math.max(0, this.belly - rate * dt);
    if (was > 25 && this.belly <= 25) ctx.hud && ctx.hud.hint('Your belly is rumbling!');
    if (was > 10 && this.belly <= 10) ctx.hud && ctx.hud.hint('Your belly is rumbling! Eat something soon.');
    if (this.belly <= 0) { this._starve += dt; if (this._starve >= 4) { this._starve = 0; this.hp = Math.max(0, this.hp - 1); ctx.hud && ctx.hud.hint('Your belly is empty! Eat something!'); if (this.hp <= 0) this._ko(); } }
  }
  // ---- draw ----
  draw(r) {
    const b = this.body, ko = this.ko;
    if (ko > 0 && ko < 1.4) return;   // unravelled
    if (this.seat === undefined) return;
    DQ.FX.shadow(r, this.ctx.world, b.x, b.y, b.z, 6);
    const flash = this.iframe > 0 && Math.floor(this.iframe * 16) % 2 === 0;
    r.actor(b.x, b.y, b.z, (g, ox, oy) => {
      this.rig.draw(g, ox, oy, r.view);
      if (this.color && !this.local) { E.font.text(g, this.name, ox - Math.round(E.font.width(this.name) / 2), oy - 44, this.color, { outline: '#000' }); }
    }, { xray: { color: this.color || '#8fe3ff', actors: false }, flash: flash ? '#ffffff' : undefined, pick: this });
    if (this.combo.busy || (this.act && this.act.busy)) this.rig.drawSmear(r);
    if (this.charge > .15) { const k = Math.min(1, this.charge / .6); r.queue(b.x, b.y, b.z + 10, g => { const [sx, sy] = r.w(b.x, b.y, b.z + 14); r.glowDisc(g, sx, sy, 6 + k * 8, k >= 1 ? '#fff0a0' : '#c8a0ff', .3); }, { emissive: true, bias: .02 }); }
    if (this.notionT > 0) DQ.FX.thought(r, b.x, b.y, b.z + 40, this.notionItem);
  }
  serialize() { return { x: this.body.x, y: this.body.y, z: this.body.z, facing: this.body.facing, hp: this.hp, belly: this.belly, hearts: this.hearts, equip: Object.assign({}, this.equip), bag: this.bag.serialize(), hotbar: this.hotbar.slice(), sel: this.sel, spin: this.spinUnlocked, name: this.name, look: this.look, pal: this.pal, stats: Object.assign({}, this.stats) }; }
  load(d) {
    Object.assign(this.body, { x: d.x, y: d.y, z: d.z, facing: d.facing || 0, vx: 0, vy: 0, vz: 0 }); this.body.lastSafe = [d.x, d.y, d.z];
    this.hearts = d.hearts || 0; this.hp = d.hp; this.belly = d.belly; this.bag.load(d.bag); this.hotbar = (d.hotbar || []).slice(0, 8); while (this.hotbar.length < 8) this.hotbar.push(null);
    this.sel = d.sel || 0; this.spinUnlocked = !!d.spin; this.name = d.name || this.name; this.look = d.look || 'A'; this.pal = d.pal || 0; this.stats = Object.assign(this.stats, d.stats || {});
    this.rig = DQ.makeBuilderRig(this.look, this.pal, this.color);
    for (const k of ['weapon', 'body', 'shield']) this.setEquip(k, d.equip ? d.equip[k] : (k === 'weapon' ? 'darningStick' : null));
  }
}
DQ.Builder = Builder;

// ---- small shared effects ----
DQ.FX = {
  threads: [],
  shadow(r, w, x, y, z, rad) {
    const g0 = w.groundAt(x, y, 2, z + 2, 2), gz = g0 === -Infinity ? null : g0; if (gz === null) return;
    const k = E.clamp(1 - (z - gz) / 80, .4, 1);
    r.queue(x, y, gz + .6, g => { const pts = r.groundPts(x, y, rad * k, 12, gz + .5); E.px.polyDither(g, pts, '#100818', .45, r.ix, r.iy); }, { bias: -.005 });
  },
  // the unravel effect: thread particles peel up and away
  unravel(ctx, x, y, z, n) {
    const cols = ['#f1e6c8', '#c8443a', '#3a5f9a', '#e8c870', '#a050c0'];
    for (let i = 0; i < n; i++) DQ.FX.threads.push({ x: x + (DQ.fx() - .5) * 14, y: y + (DQ.fx() - .5) * 14, z: z + DQ.fx() * 28, vz: 20 + DQ.fx() * 40, vx: (DQ.fx() - .5) * 20, vy: (DQ.fx() - .5) * 20, life: 1.2 + DQ.fx() * .8, t: 0, c: cols[i % cols.length], ph: DQ.fx() * 6 });
    ctx.audioX && ctx.audioX.sfx('unravel');
  },
  update(dt) { const L = DQ.FX.threads; for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.t > p.life) L.splice(i, 1); } },
  draw(r) {
    for (const p of DQ.FX.threads) r.queue(p.x, p.y, p.z, g => { const [sx, sy] = r.w(p.x, p.y, p.z), s = Math.sin(r.game.real * 6 + p.ph) * 2; E.px.line(g, sx, sy, sx + s, sy + 5, p.c); }, { emissive: true });
  },
  thought(r, x, y, z, item) {
    r.queue(x, y, z, g => {
      const [sx, sy] = r.w(x, y, z); const X = Math.round(sx), Y = Math.round(sy) - 6;
      E.px.disc(g, X - 6, Y + 12, 1.5, '#f8f4ec'); E.px.disc(g, X - 3, Y + 8, 2, '#f8f4ec');
      E.px.disc(g, X, Y, 9, '#3a3050'); E.px.disc(g, X, Y, 8, '#f8f4ec'); E.px.disc(g, X - 5, Y + 2, 5, '#f8f4ec'); E.px.disc(g, X + 5, Y + 2, 5, '#f8f4ec');
      const ic = DQ.Icons.get(item, 12); if (ic) g.drawImage(ic, X - 6, Y - 6);
    }, { bias: .05 });
  }
};
})();
