// The Builder (the player, remote players, the attract AI, Bee bots): movement, auto-hop, the swing combo and Spin
// Stitch, breaking by tool tier, placing blocks and objects, cursor modes (auto, mouse, Builder's Eye), eating, hurt, KO
// and the Lost Bundle. It reads one intent per step (DQ.Controls.intent or an Autopilot), so every driver plays the same.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
const SOLID = DQ.SOLID, OPAQUE = DQ.OPAQUE, LIQUID = DQ.LIQUID;
// new moves (engine format): placing a block, eating, stirring, cranking, hammering
Object.assign(E.MOVES, {
  place: { rel: true, hand: 'both', a0: -.2, a1: .15, z0: 2, z1: -6, reach: 6, wind: .05, active: .05, recover: .12, lunge: 1.5, blade: 0 },
  eat: { rel: true, hand: 'L', a0: .3, a1: .1, z0: -6, z1: 4, reach: 3, wind: .08, active: .1, recover: .1, blade: 0 },
  stir: { rel: true, a0: -.4, a1: .4, z0: -4, z1: -4, reach: 6, wind: .15, active: .2, recover: .15, blade: 0 },
  crank: { rel: true, hand: 'both', plane: 'side', a0: .8, a1: -.8, reach: 5, wind: .2, active: .3, recover: .2, blade: 0 },
  hammer: { rel: true, plane: 'side', a0: 2.2, a1: -.9, reach: 6, wind: .14, active: .06, recover: .16, lunge: .6, crouch: .2, blade: 0 }
});
DQ.LOOKS = {
  A: { hair: 'spiky', hat: { style: 'band', color: '#c8443a' }, outfit: 'tunic' },
  B: { hair: 'ponytail', hat: null, outfit: 'robe' }
};
DQ.PALETTES = [
  { name: 'Denim', cloth: '#3a5f9a', trim: '#e8c870', hair: '#5a3a22', pants: '#3a3448', band: '#c8443a' },
  { name: 'Clover', cloth: '#4a8a5a', trim: '#f1e6c8', hair: '#c86a2a', pants: '#4a3a2a', band: '#e8c040' },
  { name: 'Berry', cloth: '#b84a6a', trim: '#ffd0e0', hair: '#2a1a1a', pants: '#3a2a3a', band: '#4a6ad0' },
  { name: 'Sunny', cloth: '#d8a030', trim: '#7a3a22', hair: '#e8d090', pants: '#5a4a6a', band: '#5aa04a' }
];
DQ.makeBuilderRig = (look = {}, colorOverride) => {
  const L = DQ.LOOKS[look.style || 'A'] || DQ.LOOKS.A, p = DQ.PALETTES[look.palette || 0] || DQ.PALETTES[0];
  const hat = L.hat ? Object.assign({}, L.hat, { color: colorOverride || p.band }) : null;
  return new E.Humanoid({ size: 1, build: 'chibi', hair: L.hair, hat, outfit: L.outfit, weapon: 'needle', face: { eyes: 'big' },
    colors: { skin: '#f2c39a', hair: p.hair, cloth: colorOverride || p.cloth, trim: p.trim, pants: p.pants, boot: '#4a3426', belt: '#7a5032', metal: '#c8ccd8', hilt: '#8a5a32' } });
};
const FACE = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const quarter = f => ((Math.round(f / (Math.PI / 2)) % 4) + 4) % 4;   // 0 E 1 S 2 W 3 N

class Builder {
  constructor(ctx, o = {}) {
    this.ctx = ctx; this.id = o.id === undefined ? 0 : o.id; this.name = DQ.safe(o.name || 'Patch'); this.look = o.look || { style: 'A', palette: 0 }; this.color = o.color || null;
    this.kind = 'builder'; this.isBuilder = true; this.local = o.local !== false;
    this.body = new DQ.VoxelBody({ x: o.x || 0, y: o.y || 0, z: o.z || 0, r: 5, h: 28, step: 2, gravity: 800 });
    this.rig = DQ.makeBuilderRig(this.look, this.color);
    this.heartpatches = 0; this.hp = this.maxHp; this.belly = 100;
    this.bag = new DQ.Bag(); this.equip = { weapon: 'darningStick', body: null, shield: null };
    this.hot = 0; this.facing = Math.PI / 2;
    this.combo = new E.Combo([new E.Attack('slash'), new E.Attack('backslash')], { window: .3 });
    this.breakAtk = null; this.spinAtk = null; this.charge = 0; this.charging = false; this.swingCell = null;
    this.placeCd = 0; this.iframes = 0; this.flashT = 0; this.ko = null; this.anim = null; this.notionT = 0; this.thought = null;
    this.cursor = { mode: 'auto', brk: null, plc: null, obj: null, eye: null, eyeRep: 0, ok: false, why: '' };
    this.jumpBuf = 0; this.coyote = 0; this.pushT = 0; this.hungerT = 0; this.starveT = 0; this.warned = 0;
    this.mounted = null; this.sleeping = false; this.dead = false; this.stepT = 0;
    this.intent = DQ.Controls.blank(); this.prompts = [];
    this.netHeld = null;   // remote players: the item they hold
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  set x(v) { this.body.x = v; } set y(v) { this.body.y = v; } set z(v) { this.body.z = v; }
  get r() { return this.body.r; }
  get vx() { return this.body.vx; } get vy() { return this.body.vy; }
  get maxHp() { return Math.round(DQ.tune('maxHpBase') + this.heartpatches * 10); }
  get weapon() { return DQ.ITEMS[this.equip.weapon] || DQ.ITEMS.darningStick; }
  /** the weapon's attack, +2 while carrying the Golden Thimble */
  get atk() { return (this.weapon.weapon.atk + 1 + (this.bag.realCount('goldenThimble') ? 2 : 0)) * DQ.tune('builderAtk'); }
  get def() { let d = 0; for (const k of ['body', 'shield']) { const it = DQ.ITEMS[this.equip[k]]; if (it && it.def) d += it.def; } return d; }
  get held() { return this.bag.hotbar[this.hot] || null; }
  get cx() { return Math.floor(this.x / T); } get cy() { return Math.floor(this.y / T); } get L() { return Math.floor((this.z + 1) / T); }
  get god() { return this.ctx.dev.god || this.cheatGod; }
  place3(x, y, z) { this.body.x = x; this.body.y = y; this.body.z = z; this.body.vx = this.body.vy = this.body.vz = 0; this.body.onGround = true; this.body.lastSafe = [x, y, z]; }
  teleportCell(cx, cy, L) { this.place3(cx * T + 8, cy * T + 8, L * T); }
  // ---------------------------------------------------------------- update
  update(dt, intent) {
    const ctx = this.ctx, w = ctx.world, b = this.body;
    this.intent = intent = intent || DQ.Controls.blank();
    this.iframes = Math.max(0, this.iframes - dt); this.flashT = Math.max(0, this.flashT - dt); this.placeCd = Math.max(0, this.placeCd - dt);
    this.notionT = Math.max(0, this.notionT - dt);
    if (this.ko) return this.updateKO(dt);
    if (this.mounted) { this.rigUpdate(dt); return; }
    if (this.sleeping) { this.rigUpdate(dt); return; }
    this.hunger(dt);
    if (this.anim) { this.anim.t += dt; if (this.anim.t >= this.anim.dur) { const a = this.anim; this.anim = null; if (a.done) a.done(); } }
    const busy = !!(this.anim && this.anim.lock);
    // ---- movement
    const fly = ctx.dev.fly && this.local; b.fly = fly;
    let mv = intent.move; if (intent.eye || busy) mv = [0, 0];
    const water = b.inWater ? .55 : 1, spd = DQ.tune('walk') * (intent.sprint ? DQ.tune('sprintMul') : 1) * water * (this.slowK || 1);
    const tx = mv[0] * spd, ty = mv[1] * spd, acc = (b.onGround || fly ? 900 : 900 * .6) * dt, mag = Math.hypot(mv[0], mv[1]);
    if (mag > .05) { b.vx = E.approach(b.vx, tx, acc); b.vy = E.approach(b.vy, ty, acc); }
    else { const k = Math.exp(-10 * dt); b.vx *= k; b.vy *= k; if (Math.abs(b.vx) < 1) b.vx = 0; if (Math.abs(b.vy) < 1) b.vy = 0; }
    if (mag > .1 && !this.targetFacing) this.facing = E.approachAng(this.facing, Math.atan2(mv[1], mv[0]), 14 * dt);
    if (this.targetFacing !== undefined && this.targetFacing !== null) { this.facing = E.approachAng(this.facing, this.targetFacing, 16 * dt); this.targetFacing = null; }
    // jump: buffered, with coyote time
    this.jumpBuf = intent.jump && !intent.eye ? .12 : Math.max(0, this.jumpBuf - dt);
    this.coyote = b.onGround ? .08 : Math.max(0, this.coyote - dt);
    b.gravity = DQ.tune('gravity');
    if (fly) { b.vz = intent.jumpHeld ? 140 : intent.sprint ? -140 : 0; }
    else if (this.jumpBuf > 0 && (b.onGround || this.coyote > 0) && !busy) { b.onGround = true; b.jump(DQ.tune('jump')); this.rig.kick(.35); this.jumpBuf = 0; this.coyote = 0; DQ.sfx('jump', { vol: .5 }); }
    // auto-hop: walking into a 1-block ledge with room above
    if (!fly && b.onGround && mag > .3 && (DQ.game.settings.autoHop !== false || !this.local) && !busy) {
      const nx = Math.floor((b.x + Math.cos(Math.atan2(mv[1], mv[0])) * 9) / T), ny = Math.floor((b.y + Math.sin(Math.atan2(mv[1], mv[0])) * 9) / T), L0 = this.L;
      const ledge = (nx !== this.cx || ny !== this.cy) && SOLID[w.get(nx, ny, L0)] && !DQ.STAIR[w.get(nx, ny, L0)] && !SOLID[w.get(nx, ny, L0 + 1)] && !SOLID[w.get(nx, ny, L0 + 2)] && !SOLID[w.get(this.cx, this.cy, L0 + 2)];
      if (ledge && (b.hitWall || this.pushT > 0)) { this.pushT += dt; if (this.pushT > .08) { b.jump(215); b.vx += Math.cos(this.facing) * 20; b.vy += Math.sin(this.facing) * 20; this.pushT = 0; } }
      else if (ledge) this.pushT += dt * .5; else this.pushT = 0;
    }
    const wasAir = !b.onGround;
    b.update(dt, w);
    if (b.landed && wasAir && b.fallV > 180) { DQ.sfx('land', { vol: .4 }); this.rig.land(E.clamp((b.fallV - 120) / 320, .3, 1.2)); DQ.game.particles.dust(b.x, b.y, b.z, 4); }
    if (b.fell && !fly) this.unravelRespawn();
    // footsteps
    if (b.onGround && Math.hypot(b.vx, b.vy) > 20) { this.stepT -= dt; if (this.stepT <= 0) { this.stepT = .28; this.footstep(); } }
    // ---- hotbar
    if (intent.hotStep) { this.hot = (this.hot + (intent.hotStep > 0 ? 1 : 7)) % 8; DQ.sfx('uiMove', { vol: .25 }); }
    if (intent.hotSlot !== null && intent.hotSlot !== undefined) { this.hot = intent.hotSlot; DQ.sfx('uiMove', { vol: .25 }); }
    // ---- targets
    this.target(dt, intent);
    // ---- actions
    if (!busy) this.actions(dt, intent);
    this.rigUpdate(dt);
  }
  footstep() {
    const w = this.ctx.world, id = w.get(this.cx, this.cy, this.L - 1), b = DQ.BLOCKS[id], st = this.body.inWater ? 'water' : b ? b.step : 'soft';
    DQ.sfx('step_' + st, { vol: this.local ? .22 : .1 });
  }
  hunger(dt) {
    if (this.ctx.dev.noHunger || this.god || this.ctx.mode !== 'story') return;
    const k = DQ.tune('bellyDrain') * (this.intent.sprint && Math.hypot(this.body.vx, this.body.vy) > 30 ? 1.5 : 1) * (this.combat > 0 ? 1.2 : 1);
    this.combat = Math.max(0, (this.combat || 0) - dt);
    this.belly = Math.max(0, this.belly - dt / 9 * k);
    if (this.belly <= 25 && this.warned < 1) { this.warned = 1; this.ctx.hud && this.ctx.hud.toast('Your belly is rumbling!', 'bun'); }
    if (this.belly <= 10 && this.warned < 2) { this.warned = 2; this.ctx.hud && this.ctx.hud.toast('You\'re famished! Eat something!', 'bun'); }
    if (this.belly > 30) this.warned = 0;
    if (this.belly <= 0) { this.starveT += dt; if (this.starveT >= 4) { this.starveT = 0; this.hurt(1, null, { starve: true }); if (this.ctx.hud) this.ctx.hud.toast('Your belly is empty! Eat something!', 'bun'); } }
  }
  // ---------------------------------------------------------------- targeting
  target(dt, intent) {
    const ctx = this.ctx, w = ctx.world, c = this.cursor, L0 = this.L, reach = DQ.tune('reach') * T;
    c.brk = null; c.plc = null; c.obj = null; c.ok = false; c.why = ''; c.npc = null;
    const chest = [this.x, this.y, this.z + 16], inReach = (x, y, z) => Math.hypot(x * T + 8 - chest[0], y * T + 8 - chest[1], z * T + 8 - chest[2]) <= reach;
    const cut = ctx.render ? (x, y, z) => ctx.render.isCut(x, y, z) : null;
    if (intent.cursor) {   // an explicit cell (AI, net, tests): break it if solid, else place there
      c.mode = 'ai'; const q = intent.cursor;
      if (SOLID[w.get(q.x, q.y, q.z)] || w.objIdx.get(w.idx(q.x, q.y, q.z))) { c.brk = [q.x, q.y, q.z]; c.obj = w.objIdx.get(w.idx(q.x, q.y, q.z)) || null; }
      c.plc = [q.x, q.y, q.z]; if (q.place) c.plc = [q.place.x, q.place.y, q.place.z];
      this.targetFacing = Math.atan2(q.y * T + 8 - this.y, q.x * T + 8 - this.x);
    } else if (intent.eye) {
      c.mode = 'eye';
      if (!c.eye) { const a = this.autoTarget(); c.eye = a.plc ? a.plc.slice() : [this.cx + FACE[0][0], this.cy, L0]; }
      c.eyeRep = Math.max(0, c.eyeRep - dt);
      const m = intent.move; if (Math.hypot(m[0], m[1]) > .4 && c.eyeRep <= 0) { const a = Math.atan2(m[1], m[0]), d = FACE[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; const n = [c.eye[0] + d[0], c.eye[1] + d[1], c.eye[2]]; if (inReach(n[0], n[1], n[2])) c.eye = n; c.eyeRep = .16; }
      if (intent.eyeUp && inReach(c.eye[0], c.eye[1], c.eye[2] + 1)) c.eye[2]++;
      if (intent.eyeDown && c.eye[2] > 1) c.eye[2]--;
      const [x, y, z] = c.eye; if (SOLID[w.get(x, y, z)] || w.objIdx.get(w.idx(x, y, z))) { c.brk = [x, y, z]; c.obj = w.objIdx.get(w.idx(x, y, z)) || null; }
      c.plc = [x, y, z]; this.targetFacing = Math.atan2(y * T + 8 - this.y, x * T + 8 - this.x);
    } else if (intent.mouse && DQ.game.view.inv) {
      c.mode = 'mouse'; c.eye = null;
      const p = DQ.game.input.pointer(), g = DQ.game, ix = DQ.lastIX !== undefined ? DQ.lastIX : Math.floor(g.cam.x), iy = DQ.lastIY !== undefined ? DQ.lastIY : Math.floor(g.cam.y);
      const hit = p ? w.pickScreen(g.view, p[0] + ix + .5, p[1] + iy + .5, cut) : null;
      c.npc = p && ctx.pickActor ? ctx.pickActor(p[0], p[1]) : null;
      if (hit) {
        c.brk = [hit.x, hit.y, hit.z]; c.obj = hit.obj;
        const pl = [hit.x + hit.n[0], hit.y + hit.n[1], hit.z + hit.n[2]]; c.plc = pl;
        if (hit.obj && !hit.n[2]) c.plc = null;
        this.targetFacing = Math.atan2(hit.y * T + 8 - this.y, hit.x * T + 8 - this.x);
        if (Math.hypot(hit.x * T + 8 - this.x, hit.y * T + 8 - this.y) < 10) this.targetFacing = null;
      }
    } else { c.mode = 'auto'; c.eye = null; const a = this.autoTarget(); c.brk = a.brk; c.plc = a.plc; c.obj = a.obj; }
    c.brkFar = !!(c.brk && !inReach(...c.brk));
    if (c.plc && !inReach(...c.plc)) c.plcFar = true; else c.plcFar = false;
  }
  /** the cell in front: break the first solid at feet, then chest, then below; place to fill a hole, then feet, chest, head */
  autoTarget() {
    const w = this.ctx.world, f = FACE[((Math.round(this.facing / (Math.PI / 4)) % 8) + 8) % 8], x = this.cx + f[0], y = this.cy + f[1], L0 = this.L;
    let brk = null, obj = null, plc = null;
    for (const z of [L0, L0 + 1, L0 - 1]) { const o = w.objIdx.get(w.inside(x, y, z) ? w.idx(x, y, z) : -1); if (o && !o.def.door && !o.def.portal) { obj = o; brk = [x, y, o.z]; break; } if (SOLID[w.get(x, y, z)]) { brk = [x, y, z]; break; } }
    if (!obj) { const o = w.objIdx.get(w.inside(this.cx, this.cy, L0) ? w.idx(this.cx, this.cy, L0) : -1); if (o && o.def.plant) { obj = o; brk = [this.cx, this.cy, L0]; } }
    const free = z => z >= 1 && z < w.H - 1 && !SOLID[w.get(x, y, z)] && !w.objIdx.get(w.idx(x, y, z));
    for (const z of [L0 - 1, L0, L0 + 1, L0 + 2]) if (w.inside(x, y, z) && free(z) && (z !== L0 + 2 || SOLID[w.get(x, y, z - 1)])) { plc = [x, y, z]; break; }
    return { brk, plc, obj };
  }
  // ---------------------------------------------------------------- actions
  actions(dt, intent) {
    const ctx = this.ctx, w = ctx.world, c = this.cursor;
    // swing: monsters in the arc first, else the break target
    const busy = this.combo.busy || (this.breakAtk && this.breakAtk.busy) || (this.spinAtk && this.spinAtk.busy);
    if (intent.swing && !busy) {
      const mons = this.monstersInArc();
      if (mons.length || !c.brk || c.brkFar) { this.combo.press(); this.swingCell = null; DQ.sfx('swing', { vol: .35 }); this.combat = 3; }
      else { const low = c.brk[2] <= this.L - 1 || (c.brk[2] === this.L && c.obj); this.breakAtk = new E.Attack(low ? 'overhead' : 'slash', low ? { wind: .1, active: .08, recover: .2 } : {}); this.breakAtk.start(); this.swingCell = { cell: c.brk.slice(), obj: c.obj }; }
      this.charge = 0; this.charging = true;
    }
    // Spin Stitch: hold to charge, release to spin
    if (this.charging) {
      if (intent.swingHeld && ctx.flags.spinStitch) { const was = this.charge; this.charge += dt; if (was < .6 && this.charge >= .6) DQ.sfx('spinCharge', { vol: .4 }); }
      if (!intent.swingHeld) { if (this.charge >= .6 && ctx.flags.spinStitch) this.spinStitch(); this.charging = false; this.charge = 0; }
    }
    const ph = this.combo.update(dt);
    if (this.combo.active) this.combo.hits(this.monsterTargets(), m => this.inArc(m, 22, .61), m => ctx.combat.builderHits(this, m, {}));
    if (ph === 'active' && this.ctx.objects) this.hitObjectsInArc();
    if (this.breakAtk) { const p2 = this.breakAtk.update(dt); if (p2 === 'active' && this.swingCell) this.strike(this.swingCell); if (!this.breakAtk.busy) this.breakAtk = null; }
    if (this.spinAtk) { this.spinAtk.update(dt); if (this.spinAtk.active) this.spinAtk.hits(this.monsterTargets(), m => E.dist(this, m) < 26 + (m.r || 5) && Math.abs(m.z - this.z) < 20, m => ctx.combat.builderHits(this, m, { mult: 1.5, kb: 180, spin: true })); if (!this.spinAtk.busy) this.spinAtk = null; }
    // place / use the held item
    if (intent.place && this.placeCd <= 0) this.useHeld();
    // interact
    if (intent.interact && ctx.interact) ctx.interact(this);
    this.prompts = this.contextPrompts();
  }
  monsterTargets() { const m = this.ctx.monsters ? this.ctx.monsters.list : []; return this.ctx.bossTargets ? m.concat(this.ctx.bossTargets()) : m; }
  inArc(m, range, half) { return E.inArc(this, this.facing, m, range + (m.r || 5), half, 14 + (m.tall || 0)); }
  monstersInArc() { return this.monsterTargets().filter(m => !m.dead && this.inArc(m, 22, .61)); }
  hitObjectsInArc() {
    // a combo swing at furniture-free air still knocks a ballista or door? no: only cages take hits from the arc
    for (const o of this.ctx.objects.list) if (o.def.cage && !o.gone && Math.hypot(o.x * T + 8 - this.x, o.y * T + 8 - this.y) < 26 && this.inArc({ x: o.x * T + 8, y: o.y * T + 8, z: o.z * T }, 22, .8)) this.ctx.objects.damage(o, this.weapon.weapon.blockDmg, this);
  }
  /** the break swing lands: a block (damage by tier), a plant (harvest), furniture (back into the bag), a cage */
  strike(sc) {
    const ctx = this.ctx, w = ctx.world, [x, y, z] = sc.cell, wx = x * T + 8, wy = y * T + 8, wz = z * T + 8, G = DQ.game;
    const o = sc.obj && !sc.obj.gone ? sc.obj : w.objIdx.get(w.idx(x, y, z));
    if (o) { ctx.objects.hitByBuilder(o, this); return; }
    const id = w.get(x, y, z), b = DQ.BLOCKS[id]; if (!b || !SOLID[id]) return;
    const wp = this.weapon.weapon;
    if (b.tier > wp.tier && !ctx.dev.instantBreak) {
      DQ.sfx('clink', { vol: .5 }); G.particles.sparks(wx, wy, wz, 6, null, { color: '#fff0c0' });
      if (this.local && ctx.hud) ctx.hud.toast(b.tier >= 99 ? 'Nothing can break that!' : 'Too tough for your ' + this.weapon.name + '!', null, 'tough');
      ctx.events.emit('tooTough', { x, y, z, id, by: this }); return;
    }
    let dmg = wp.blockDmg * DQ.tune('blockDmg') * (wp.knot && (b.key === 'knot' || b.key === 'tangle') ? wp.knot : 1);
    if (ctx.dev.instantBreak || this.ctx.cheats.instantBreak) dmg = 1e9;
    const res = w.damage(x, y, z, dmg, G.time);
    DQ.sfx(b.hp > 15 ? 'hitHard' : 'hitSoft', { vol: .45 });
    const tn = E.tones(b.top[1]);
    G.particles.bits(wx, wy, wz, 3, [tn.base, tn.lt, tn.sh]);
    if (this.local && G.input.lastDevice === 'gamepad') G.input.rumble(.15, .05);
    if (res.broke) this.breakBlock(x, y, z, id);
  }
  breakBlock(x, y, z, id) {
    const ctx = this.ctx, w = ctx.world, b = DQ.BLOCKS[id], G = DQ.game, wx = x * T + 8, wy = y * T + 8, wz = z * T + 8;
    if (ctx.net && ctx.net.client && this.local) { ctx.net.sendOp(['break', x, y, z]); }
    w.set(x, y, z, 0, { by: this });
    const tn = E.tones(b.top[1]);
    G.particles.bits(wx, wy, wz, 12, [tn.deep, tn.sh, tn.base, tn.lt, b.thread]); G.particles.dust(wx, wy, wz - 6, 4);
    DQ.sfx(b.key === 'tangle' || b.key === 'frayed' ? 'crumble' : 'rip', { vol: .55 });
    this.ctx.stats.broken++;
    if (!(ctx.net && ctx.net.client)) DQ.dropsFor(ctx, b.drop, wx, wy, wz, this);
  }
  spinStitch() {
    this.spinAtk = new E.Attack('spin', { active: .3 }); this.spinAtk.start(); this.combo.cancel(); this.breakAtk = null;
    DQ.sfx('spinRelease', { vol: .6 }); DQ.game.particles.ring(this.x, this.y, 4, 30, '#fff0a0', .35, this.z + 4); this.ctx.events.emit('spinStitch', { by: this });
  }
  /** use the held item: place a block or an object, eat food, sew on a Heartpatch, plant the Banner, place a Pattern */
  useHeld() {
    const ctx = this.ctx, id = this.held, it = DQ.ITEMS[id]; if (!it) return;
    if (this.bag.count(id) <= 0) { if (this.local && ctx.hud) ctx.hud.toast('You have no ' + it.name + ' left!', id); return; }
    if (it.kind === 'block') return this.placeBlock(id);
    if (it.kind === 'obj') return this.placeObject(id);
    if (it.kind === 'food') return this.eat(id);
    if (it.kind === 'use') return this.useItem(id);
    if (it.kind === 'weapon' || it.kind === 'body' || it.kind === 'shield') return this.equipItem(id);
    if (it.kind === 'key' && ctx.useKey) return ctx.useKey(this, id);
  }
  bodiesIn(x, y, z) {
    const all = [].concat(this.ctx.builders || [], this.ctx.npcs ? this.ctx.npcs.list : [], this.ctx.monsters ? this.ctx.monsters.list : []);
    for (const a of all) { const bd = a.body || a; if (!a.dead && bd.aabbHits && bd.aabbHits(x, y, z)) return a; }
    return null;
  }
  canPlaceBlock(x, y, z) {
    const w = this.ctx.world;
    if (!w.inside(x, y, z) || z < 1 || z >= w.H - 1) return 'Can\'t place that here!';
    const cur = w.get(x, y, z); if (SOLID[cur]) return 'Something\'s in the way!';
    if (w.objIdx.get(w.idx(x, y, z))) return 'Something\'s in the way!';
    if (this.bodiesIn(x, y, z)) return 'Something\'s in the way!';
    if (this.ctx.canPlaceHere && !this.ctx.canPlaceHere(x, y, z)) return 'You can\'t build here!';
    return null;
  }
  placeBlock(id) {
    const ctx = this.ctx, w = ctx.world, c = this.cursor, it = DQ.ITEMS[id];
    if (!c.plc) return; if (c.plcFar) { if (this.local && ctx.hud) ctx.hud.toast('Too far!', null, 'far'); return; }
    const [x, y, z] = c.plc, why = this.canPlaceBlock(x, y, z);
    if (why) { if (this.local && ctx.hud) ctx.hud.toast(why, null, 'why'); DQ.sfx('uiCancel', { vol: .3 }); return; }
    const rot = DQ.STAIR[it.block] ? quarter(this.facing) : 0, town = ctx.town && ctx.town.inside(x, y);
    if (ctx.net && ctx.net.client && this.local) ctx.net.sendOp(['place', x, y, z, it.block, rot]);
    w.set(x, y, z, it.block, { by: this, rot, town });
    if (!(ctx.dev.creative || this.cheatInfinite)) this.bag.remove(id, 1);
    this.placeCd = this.ctx.cheats.fastPlace ? .15 : .16;
    this.combo.cancel(); this.anim = { kind: 'place', t: 0, dur: .22, atk: (() => { const a = new E.Attack('place'); a.start(); return a; })() };
    DQ.game.particles.glints(x * T + 8, y * T + 8, z * T + 8, 4, '#fff6d0'); DQ.sfx('stitch', { vol: .5 }); ctx.stats.placed++;
    if (ctx.render) ctx.render.pop = { x, y, z, t: DQ.game.real };
  }
  placeObject(id) {
    const ctx = this.ctx, c = this.cursor, it = DQ.ITEMS[id];
    if (!c.plc) return; if (c.plcFar) { if (this.local && ctx.hud) ctx.hud.toast('Too far!', null, 'far'); return; }
    const [x, y, z] = c.plc, def = DQ.OBJECTS[it.obj], facing = def.door ? quarter(this.facing) : (quarter(this.facing) + 2) % 4;
    const why = ctx.objects.canPlace(it.obj, x, y, z, facing, this);
    if (why) { if (this.local && ctx.hud) ctx.hud.toast(why, null, 'why'); DQ.sfx('uiCancel', { vol: .3 }); return; }
    if (ctx.net && ctx.net.client && this.local) ctx.net.sendOp(['obj', it.obj, x, y, z, facing]);
    ctx.objects.add(it.obj, x, y, z, facing, { by: this });
    if (!(ctx.dev.creative || this.cheatInfinite)) this.bag.remove(id, 1);
    this.placeCd = .25; this.anim = { kind: 'place', t: 0, dur: .22, atk: (() => { const a = new E.Attack('place'); a.start(); return a; })() };
    DQ.sfx('stitch', { vol: .5 }); DQ.sfx('thunk', { vol: .4 }); ctx.stats.placed++;
  }
  eat(id) {
    const it = DQ.ITEMS[id], f = it.food;
    if (!this.bag.remove(id, 1)) return;
    this.belly = Math.min(100, this.belly + f.belly); this.hp = Math.min(this.maxHp, this.hp + (f.hp >= 999 ? this.maxHp : f.hp));
    this.anim = { kind: 'eat', t: 0, dur: .9, lock: false };
    DQ.sfx('eat', { vol: .5 }); this.placeCd = .6;
    if (this.local && this.ctx.hud) this.ctx.hud.toast('Munch! ' + it.name + (f.hp ? '  HP +' + Math.min(f.hp, 999) : '') + '  Belly +' + f.belly, id);
    this.ctx.events.emit('itemUsed', { id, by: this });
  }
  useItem(id) {
    if (id === 'heartpatch') {
      if (!this.bag.remove(id, 1)) return;
      this.heartpatches++; this.hp = this.maxHp; if (!this.bag.realCount(id)) { const j = this.bag.hotbar.indexOf(id); if (j >= 0) this.bag.hotbar[j] = null; } DQ.sfx('heartpatch'); DQ.game.particles.glints(this.x, this.y, this.z + 16, 14, '#ff8aa8', 16);
      if (this.ctx.hud) this.ctx.hud.popup('heart', 'Max HP up!', 'You sewed on a Heartpatch. Max HP is now ' + this.maxHp + '!');
      this.ctx.events.emit('itemUsed', { id, by: this });
    }
  }
  equipItem(id) {
    const it = DQ.ITEMS[id], slot = it.kind === 'weapon' ? 'weapon' : it.kind;
    this.equip[slot] = id; DQ.sfx('equip');
    if (slot === 'weapon') { this.rig.o.weapon = it.weapon.rig; this.rig.C.metal = it.weapon.color; }
    if (this.local && this.ctx.hud) this.ctx.hud.toast('Equipped the ' + it.name + '!', id);
    this.ctx.events.emit('equip', { id, by: this });
  }
  applyEquipLook() { const it = this.weapon; this.rig.o.weapon = it.weapon.rig; this.rig.C.metal = it.weapon.color; }
  // ---------------------------------------------------------------- prompts
  contextPrompts() {
    const c = this.cursor, w = this.ctx.world, out = [];
    if (this.ctx.interactLabel) { const l = this.ctx.interactLabel(this); if (l) out.push('{btn:interact} ' + l); }
    if (c.brk && !c.brkFar) {
      if (c.obj) { const l = this.ctx.objects ? this.ctx.objects.breakLabel(c.obj, this) : null; if (l) out.push('{btn:swing} ' + l); }
      else { const id = w.get(...c.brk), b = DQ.BLOCKS[id]; if (b) out.push('{btn:swing} ' + (b.tier > this.weapon.weapon.tier ? 'Too tough!' : 'Break ' + b.name)); }
    }
    const it = DQ.ITEMS[this.held];
    if (it && this.bag.count(it.id) > 0) {
      const verb = it.kind === 'food' ? 'Eat' : it.kind === 'use' ? 'Use' : it.kind === 'block' || it.kind === 'obj' ? 'Place' : ['weapon', 'body', 'shield'].includes(it.kind) ? 'Equip' : it.id === 'banner' ? 'Plant' : it.id === 'hallPattern' ? 'Lay out' : null;
      if (verb && !((it.kind === 'block' || it.kind === 'obj') && (!c.plc || c.plcFar))) out.push('{btn:place} ' + verb + ' ' + it.name);
    }
    return out.slice(0, 3);
  }
  // ---------------------------------------------------------------- hurt, KO
  hurt(dmg, from, o = {}) {
    if (this.ko || this.dead) return false;
    if (this.remote && this.ctx.net && this.ctx.net.host) { if (this.iframes > 0) return false; this.iframes = .8; this.ctx.net.event(['hurt', this.id, Math.max(1, Math.round(dmg - this.def / 2)), Math.round(from ? from.x : this.x), Math.round(from ? from.y : this.y)]); return true; }
    if (!o.starve && (this.iframes > 0 || this.god)) return false;
    const diff = DQ.game.settings.difficulty || 'Normal', dk = diff === 'Relaxed' ? .5 : diff === 'Hard' ? 1.4 : 1;
    const d = o.starve ? dmg : Math.max(1, Math.round((dmg - this.def / 2) * dk));
    this.hp = Math.max(0, this.hp - d); this.combat = 4;
    if (!o.starve) {
      this.iframes = .8; this.flashT = .2;
      if (from) E.knockback(from, this.body, o.kb === undefined ? 90 : o.kb, 40);
      DQ.sfx('builderHurt', { vol: .6 }); if (this.local) { DQ.game.shake(3); if (DQ.game.input.lastDevice === 'gamepad') DQ.game.input.rumble(.35, .15); if (DQ.game.settings.flashes > 0) DQ.game.flash('#ff3040', .1, .35); }
      DQ.game.particles.text(this.x, this.y, this.z + 30, String(d), '#ff8a8a', { bounce: true });
    }
    this.ctx.events.emit('builderHurt', { by: from, dmg: d, builder: this });
    if (this.hp <= 0) this.knockOut();
    return true;
  }
  knockOut() {
    this.ko = { t: 0, phase: 'die' }; this.combo.cancel(); this.breakAtk = null; this.mounted = null;
    DQ.sfx('comeUndone'); this.ctx.events.emit('builderKO', { builder: this });
  }
  updateKO(dt) {
    const k = this.ko; k.t += dt;
    if (k.t > .7 && !k.unravel) { k.unravel = true; for (let i = 0; i < 50; i++) DQ.game.particles.add({ kind: 'spark', x: this.x + (Math.random() - .5) * 10, y: this.y + (Math.random() - .5) * 10, z: this.z + Math.random() * 26, vx: (Math.random() - .5) * 20, vy: (Math.random() - .5) * 20, vz: 30 + Math.random() * 60, g: -10, drag: 1, max: 1.2 + Math.random(), color: ['#f1e6c8', this.rig.C.cloth, this.rig.C.trim, '#ffffff'][i & 3] }); if (this.local && this.ctx.say) this.ctx.say('granny', ['Oh, dearie, you\'ve come undone!', 'Never mind. I\'ll stitch you right back together.'], { auto: 1.6, modal: false }); }
    if (k.t > 2.4 && !k.handled) { k.handled = true; if (this.ctx.onKO) this.ctx.onKO(this); else this.respawn(); }
    this.rigUpdate(dt);
  }
  respawn(at) {
    const ctx = this.ctx, p = at || (ctx.town && ctx.town.respawnPoint ? ctx.town.respawnPoint() : null) || ctx.spawnPoint;
    if (p) this.place3(p[0], p[1], p[2]);
    this.hp = this.maxHp; this.belly = Math.max(this.belly, 60); this.ko = null; this.iframes = 2; this.rig.kick(.3);
    ctx.events.emit('builderRespawn', { builder: this });
  }
  unravelRespawn() {
    const b = this.body, G = DQ.game;
    for (let i = 0; i < 20; i++) G.particles.add({ kind: 'spark', x: b.x, y: b.y, z: b.z + Math.random() * 20, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40, vz: 40, max: .8, color: '#f1e6c8' });
    b.toSafe(); if (!b.lastSafe && this.ctx.spawnPoint) this.place3(...this.ctx.spawnPoint);
    this.hurt(4, null, { starve: true }); DQ.sfx('unravel'); if (this.local && this.ctx.hud) this.ctx.hud.toast('You fell into the Unravel!', null, 'fell');
  }
  // ---------------------------------------------------------------- rig and drawing
  rigUpdate(dt) {
    const b = this.body; let attack = null, pose, expr, down;
    if (this.spinAtk && this.spinAtk.busy) attack = this.spinAtk.state;
    else if (this.breakAtk && this.breakAtk.busy) attack = this.breakAtk.state;
    else if (this.combo.busy) attack = this.combo.state;
    else if (this.anim) {
      const a = this.anim;
      if (a.kind === 'place' && a.atk) { a.atk.update(dt); attack = a.atk.state; }
      else if (a.kind === 'eat') { const u = (a.t % .3) / .3; attack = E.move('eat', u, u < .3 ? 'wind' : u < .6 ? 'active' : 'recover'); expr = 'smile'; }
      else if (a.kind === 'craft' || a.kind === 'hammer') { const u = (a.t % .32) / .32; attack = E.move('hammer', u, u < .45 ? 'wind' : u < .6 ? 'active' : 'recover'); }
      else if (a.kind === 'notion') pose = a.t < .4 ? 'kneel' : 'cheer';
      else if (a.kind === 'cheer' || a.kind === 'plant') pose = 'cheer';
      else if (a.kind === 'wave') pose = 'wave';
      if (a.kind === 'cheer' || a.kind === 'notion') expr = 'smile';
    }
    if (this.charging && this.charge > .15 && this.ctx.flags.spinStitch) pose = 'crouch';
    if (this.ko) pose = 'die';
    if (this.sleeping) down = 1;
    if (this.mounted) pose = 'crouch';
    if (this.flashT > 0) expr = 'wince';
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z + (this.sleeping ? 6 : 0), vx: this.mounted ? 0 : b.vx, vy: this.mounted ? 0 : b.vy, facing: this.facing, air: !b.onGround && !b.fly, attack, pose, expr, down, run: this.intent.sprint ? 1 : 0, hurt: this.flashT > 0 ? 1 : 0 });
  }
  draw(r, o = {}) {
    if (this.hidden) return;
    const b = this.body, shade = this.ko && this.ko.t > 1.4 ? Math.max(0, 1 - (this.ko.t - 1.4) / .8) : 1; if (shade <= 0) return;
    r.shadow(b.x, b.y, 5, .45, '#000', Math.max(0, b.groundZ));
    r.actor(b.x, b.y, b.z, (g, ox, oy) => { this.rig.draw(g, ox, oy, r.view); }, { xray: o.xray === false ? undefined : { color: this.color || '#8fe3ff', actors: false }, flash: this.flashT > 0 ? '#ffffff' : undefined, alpha: shade < 1 ? shade : (this.iframes > 0 && !this.ko && Math.floor(DQ.game.real * 16) % 2 ? .6 : undefined), pick: this });
    if (this.charging && this.charge > .2 && this.ctx.flags.spinStitch) { const k = Math.min(1, this.charge / .6); r.queue(b.x, b.y, b.z + 2, g => { const p = r.w(b.x, b.y, b.z + 12); E.px.blend(g, .3 + .4 * k, 'add', () => E.px.disc(g, Math.round(p[0]), Math.round(p[1]), 6 + 6 * k, k >= 1 ? '#fff0a0' : '#a0c8ff')); }, { emissive: true, bias: .01 }); }
    if (this.spinAtk && this.spinAtk.busy) this.rig.drawSmear(r);
    if (this.combo.busy) this.rig.drawSmear(r);
  }
}
DQ.Builder = Builder;
DQ.FACE8 = FACE; DQ.quarter = quarter;

/** roll a block's or a monster's drop spec into drop entities: 'id' | [id, n] | { id: chance } */
DQ.dropsFor = (ctx, spec, x, y, z, by) => {
  if (!spec || !ctx.drops) return;
  const R = ctx.rngDrops || (ctx.rngDrops = DQ.rng('drops', ctx.seed)), k = DQ.tune('dropRate');
  if (typeof spec === 'string') ctx.drops.spawn(spec, 1, x, y, z);
  else if (Array.isArray(spec)) ctx.drops.spawn(spec[0], spec[1], x, y, z);
  else for (const id in spec) { const ch = spec[id], n = typeof ch === 'object' ? ch : null; if (n) { if (R() < Math.min(1, n.p * k)) ctx.drops.spawn(id, n.n || 1, x, y, z); } else if (R() < Math.min(1, ch * k)) ctx.drops.spawn(id, 1, x, y, z); }
};
})();
