// The Autopilot: one task runner for the attract mode, the scripted playthrough, Bee bots and cutscene walks.
// It only emits intents, so the AI plays through the real builder, physics, crafting and UI code.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = 16;
class Autopilot {
  constructor(ctx, builder, o = {}) { this.ctx = ctx; this.b = builder; this.cheats = Object.assign({ god: false, teleport: false, infinite: false, fastPlace: false }, o.cheats); this.ui = o.ui !== false; this.it = DQ.Controls.blank(); this.fails = []; this.hold = {}; this.log = o.log || null; }
  tap(a) { const I = this.ctx.game.input, dev = I.lastDevice; I.tap(a); I.lastDevice = dev; I._apTap = I.clock; }
  intent() { const it = this.it; this.it = Object.assign(DQ.Controls.blank(), { move: [0, 0], cursor: it.cursor, swingHeld: this.hold.swing || false, sprint: this.hold.sprint || false, jumpHeld: false }); return it; }
  fail(task, reason) { const f = { task, reason, at: [Math.floor(this.b.body.x / T), Math.floor(this.b.body.y / T), this.b.L0] }; this.fails.push(f); this.ctx.events.emit('apFail', f); if (this.log) this.log('apFail ' + task + ': ' + reason); return false; }
  run(task) { return this.ctx.game.script(task, { keep: true }); }
  dismount() { const b = this.b; if (b.seat) { b.seat.manned = false; b.seat = null; } }
  _cheat() { if (this.cheats.god) this.b.invuln = true; if (this.cheats.infinite) this.b.bag.infinite = true; if (this.cheats.god) { this.b.hp = this.b.maxHp; this.b.belly = 100; } }
  teleport(x, y, z) { const b = this.b.body; b.x = (x + .5) * T; b.y = (y + .5) * T; b.z = (z === undefined ? this.ctx.world.topZ(x, y) : z) * T; b.vx = b.vy = b.vz = 0; this.ctx.world.escape(b); b.lastSafe = [b.x, b.y, b.z]; if (this.b.local) this.ctx.game.cam.snap = true; if (this.ctx.mode === 'attract') this.ctx.swirl = .5; }
  // ---- tasks (generators: yield* ap.walkTo(...)) ----
  *wait(s) { const t0 = this.ctx.game.time; while (this.ctx.game.time - t0 < s) { this._cheat(); yield; } }
  *until(fn, timeout = 30) { const t0 = this.ctx.game.time; while (!fn()) { if (this.ctx.game.time - t0 > timeout) return this.fail('until', 'timeout'); this._cheat(); yield; } return true; }
  *walkTo(x, y, z, o = {}) {
    this.dismount();
    const w = this.ctx.world, r = o.radius === undefined ? 1 : o.radius, b = this.b.body, t0 = this.ctx.game.time;
    const goalL = z === undefined || z === null ? w.topZ(x, y) : z;
    const dist = () => Math.hypot(b.x / T - (x + .5), b.y / T - (y + .5));
    if (dist() <= r + .3) return true;
    let path = DQ.Nav.path(w, DQ.Nav.nodeOf(b), [x, y, goalL], { kind: 'npc', near: Math.floor(r), max: o.max || 4000 });
    if ((!path || path.length > 40) && this.cheats.teleport) { if (w.standable(x, y, goalL)) { this.teleport(x, y, goalL); yield; return true; } let tx = x, ty = y, tz; for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1]]) { for (const L of [goalL, w.topZ(x + dx, y + dy)]) if (w.standable(x + dx, y + dy, L)) { tx = x + dx; ty = y + dy; tz = L; break; } if (tz !== undefined) break; } this.teleport(tx, ty, tz); yield; return true; }
    if (!path) path = DQ.Nav.path(w, DQ.Nav.nodeOf(b), [x, y, goalL], { kind: 'npc', near: Math.floor(r) + 2, partial: true, max: o.max || 4000 });
    if (!path) return this.fail('walkTo', 'no path to ' + x + ',' + y);
    path.shift();
    let stuck = 0, last = [b.x, b.y];
    while (dist() > r + .3) {
      if (this.ctx.game.time - t0 > (o.timeout || 30)) { if (this.cheats.teleport) { this.teleport(x, y, w.standable(x, y, goalL) ? goalL : undefined); return true; } return this.fail('walkTo', 'timeout'); }
      this._cheat();
      const n = path[0] || [x, y, goalL], tx = (n[0] + .5) * T, ty = (n[1] + .5) * T, dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
      if (d < 5 && path.length) { path.shift(); continue; }
      this.it.move = [dx / (d || 1), dy / (d || 1)]; this.it.sprint = !!o.sprint;
      if ((n[2] * T > b.z + 4 && d < 22) || (b.hitWall && b.onGround)) this.it.jump = true;
      stuck += this.ctx.game.time - (this._lt || this.ctx.game.time); this._lt = this.ctx.game.time;
      if (Math.hypot(b.x - last[0], b.y - last[1]) > 8) { stuck = 0; last = [b.x, b.y]; }
      if (stuck > 3) { stuck = 0; path = DQ.Nav.path(w, DQ.Nav.nodeOf(b), [x, y, goalL], { kind: 'npc', near: Math.floor(r) + 1, partial: true }) || path; if (path) path.shift(); if (this.cheats.teleport && dist() > 2) { this.teleport(x, y, w.standable(x, y, goalL) ? goalL : undefined); return true; } }
      yield;
    }
    this._lt = 0; return true;
  }
  *face(x, y) { const b = this.b.body; b.facing = Math.atan2((y + .5) * T - b.y, (x + .5) * T - b.x); yield; }
  // stand somewhere within reach of a cell (outside it), never on it
  *approach(x, y, z) {
    const b = this.b, w = this.ctx.world, R = DQ.tuning.get('reach') - .3;
    const here = () => Math.floor(b.body.x / T) === x && Math.floor(b.body.y / T) === y;
    if (b.inReach({ x, y, z }) && !here() && b.body.onGround) return true;
    const cands = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      for (const L of [z, z + 1, z - 1, z + 2, z - 2, z + 3, w.topZ(nx, ny)]) {
        if (!w.standable(nx, ny, L)) continue;
        if (Math.hypot(dx, dy, (z + .5) - (L + 1)) > R) continue;
        cands.push([nx, ny, L, Math.abs(L - z) * 3 + Math.hypot(nx + .5 - b.body.x / T, ny + .5 - b.body.y / T) * .2 + (Math.abs(dx) + Math.abs(dy) < 2 ? 1 : 0)]); break;
      }
    }
    cands.sort((p, q) => p[3] - q[3]);
    for (const [nx, ny, L] of cands.slice(0, 4)) { const ok = yield* this.walkTo(nx, ny, L, { radius: .45, timeout: 12 }); if (ok && b.inReach({ x, y, z })) return true; }
    if (cands.length && this.cheats.teleport) { const [nx, ny, L] = cands[0]; this.teleport(nx, ny, L); yield; return true; }
    return this.fail('approach', 'no spot in reach of ' + x + ',' + y + ',' + z);
  }
  *breakAt(x, y, z) {
    this.dismount();
    const w = this.ctx.world, breakable = o => o && (!o.def.fixed || o.id === 'cage'); if (!w.get(x, y, z) && !breakable(w.objAt(x, y, z))) return true;
    yield* this.approach(x, y, z);
    const t0 = this.ctx.game.time;
    while (w.get(x, y, z) || breakable(w.objAt(x, y, z))) {
      if (this.ctx.game.time - t0 > 8) return this.fail('breakAt', 'timeout at ' + x + ',' + y + ',' + z + ' (block ' + w.get(x, y, z) + ', weapon ' + this.b.equip.weapon + ', hint ' + (this.ctx.hud ? this.ctx.hud.hintS : '') + ', target ' + JSON.stringify(this.b.target.brk) + ' ' + this.b.target.inBrk + ')');
      this._cheat(); const pests = this.ctx.monsters.list.filter(m => !m.dead && Math.hypot(m.body.x - this.b.body.x, m.body.y - this.b.body.y) < 30); if (pests.length) { yield* this.fight({ filter: m => pests.includes(m), timeout: 8, soft: true }); yield* this.approach(x, y, z); }
      this.it.cursor = { x, y, z, n: [0, 0, 1] }; yield* this.face(x, y);
      if (!this.b.combo.busy) this.it.swing = true;
      yield;
    }
    this.it.cursor = null; return true;
  }
  select(item) { const b = this.b; let k = b.hotbar.indexOf(item); if (k < 0) { k = b.hotbar.indexOf(null); if (k < 0) k = 7; b.hotbar[k] = item; } this.it.hot = { slot: k }; }
  *placeAt(x, y, z, item, o = {}) {
    this.dismount();
    const w = this.ctx.world, b = this.b, it = DQ.ITEMS[item];
    const done = () => it.kind === 'block' ? w.get(x, y, z) === DQ.blockId(it.block) : !!w.objAt(x, y, z);
    if (done()) return true;
    if (this.cheats.infinite && b.bag.real(item) < 1) b.bag.add(item, 5);
    if (b.bag.count(item) < 1) return this.fail('placeAt', 'no ' + item);
    if ((w.get(x, y, z) && !DQ.BLOCKS[w.get(x, y, z)].liquid) || (w.objAt(x, y, z) && !w.objAt(x, y, z).def.fixed)) yield* this.breakAt(x, y, z);
    yield* this.approach(x, y, z);
    const t0 = this.ctx.game.time;
    while (!done()) {
      if (this.ctx.game.time - t0 > 6) return this.fail('placeAt', 'timeout ' + item + ' at ' + x + ',' + y + ',' + z + ' (have ' + b.bag.count(item) + ', hint ' + (this.ctx.hud ? this.ctx.hud.hintS : '') + ', plc ' + JSON.stringify(b.target.plc) + ' in ' + b.target.inPlc + ' mode ' + b.target.mode + ' modal ' + this.ctx.ui.modal + ' talk ' + this.ctx.talk.open + ' cut ' + !!this.ctx.cutscene + ' seat ' + !!b.seat + ' obj ' + (w.objAt(x, y, z) ? w.objAt(x, y, z).id : '-') + ' body ' + b.blockedByBody(x, y, z, 1) + ')');
      this._cheat(); this.select(item); yield;
      // a solid neighbour to aim at: the cell below, else beside
      let cur = null; for (const [dx, dy, dz] of [[0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1]]) { if (w.solidAt(x + dx, y + dy, z + dz)) { cur = { x: x + dx, y: y + dy, z: z + dz, n: [-dx, -dy, -dz] }; break; } }
      if (!cur) return this.fail('placeAt', 'nothing to build against at ' + x + ',' + y + ',' + z);
      this.it.cursor = cur; if (o.facing !== undefined) b.body.facing = o.facing; else yield* this.face(x, y);
      this.it.cursor = cur; if (o.facing !== undefined) b.body.facing = o.facing;
      if (b.placeCool <= 0) this.it.place = true;
      yield;
      if (!done() && b.blockedByBody(x, y, z, 1)) { for (const q of [...this.ctx.npcs.list, ...this.ctx.monsters.list]) { const nb = q.body, qx = E.clamp(nb.x, x * T, x * T + T), qy = E.clamp(nb.y, y * T, y * T + T); if (Math.hypot(qx - nb.x, qy - nb.y) < nb.r + 1) { nb.x = (x + .5) * T + (nb.x >= (x + .5) * T ? 2.5 : -2.5) * T; nb.vx = nb.vy = 0; if (q.path) q.path = null; this.ctx.world.escape(nb); } } const me = b.body, mx = E.clamp(me.x, x * T, x * T + T), my = E.clamp(me.y, y * T, y * T + T);
        if (Math.hypot(mx - me.x, my - me.y) < me.r + 1) { let ax = me.x - (x + .5) * T, ay = me.y - (y + .5) * T; const l = Math.hypot(ax, ay) || 1; for (let k = 0; k < 12; k++) { this.it.move = [ax / l, ay / l]; yield; } if (this.cheats.teleport && Math.hypot(E.clamp(me.x, x * T, x * T + T) - me.x, E.clamp(me.y, y * T, y * T + T) - me.y) < me.r + 1) { me.x = (x + .5) * T + ax / l * 22; me.y = (y + .5) * T + ay / l * 22; this.ctx.world.escape(me); } }
        else yield* this.wait(.3); }
    }
    this.it.cursor = null; if (this.cheats.fastPlace) b.placeCool = 0; return true;
  }
  // a room: walls 2 high around a w x d interior, a door on the south side, then the furniture inside
  *buildRoom(x0, y0, w, d, o = {}) {
    const W = this.ctx.world, L = o.L || W.topZ(x0, y0), mat = o.mat || 'planks', cells = [];
    for (let y = y0 - 1; y <= y0 + d; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const edge = x === x0 - 1 || y === y0 - 1 || x === x0 + w || y === y0 + d; if (!edge) continue; const door = x === x0 + (w >> 1) && y === y0 + d; for (let l = 0; l < 2; l++) if (!door) cells.push([x, y, L + l]); }
    // clear the floor of plants and bumps first
    for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) for (const l of [L, L + 1]) if (W.get(x, y, l) || (W.objAt(x, y, l) && !W.objAt(x, y, l).def.fixed)) yield* this.breakAt(x, y, l);
    cells.sort((a, b) => a[2] - b[2]);
    for (const c of cells) { if (!(yield* this.placeAt(c[0], c[1], c[2], mat))) return false; }
    yield* this.placeAt(x0 + (w >> 1), y0 + d, L, o.door || 'latticeDoor');
    let k = 0; for (const item of o.items || []) { const x = x0 + (k % w), y = y0 + Math.floor(k / w); k++; yield* this.placeAt(x, y, L, item); }
    return true;
  }
  *craft(recipe, n = 1) {
    const ctx = this.ctx, r = DQ.recipe(recipe), b = this.b; if (!r) return this.fail('craft', 'no recipe ' + recipe);
    if (this.cheats.infinite) b.bag.infinite = true;
    if (!ctx.crafting.knows(recipe)) ctx.crafting.know(recipe);
    if (r.station !== 'pocket') {
      const st = ctx.objects.filter(o => o.def.station === r.station).sort((a, c) => Math.hypot(a.x - b.body.x / T, a.y - b.body.y / T) - Math.hypot(c.x - b.body.x / T, c.y - b.body.y / T))[0];
      if (!st) return this.fail('craft', 'no ' + r.station);
      yield* this.approach(st.x, st.y, st.z);
      if (this.ui) {
        yield* this.face(st.x, st.y); this.it.interact = true; yield; yield;
        const s = ctx.ui.top; if (s && s.name === 'craft') { const L = s.list(); s.focus = Math.max(0, L.findIndex(q => q.id === recipe)); yield* this.wait(.5); for (let i = 0; i < n; i++) { this.tap('confirm'); yield* this.wait(.25); } this.tap('cancel'); yield; yield; return (ctx.crafting.crafted[r.out] || 0) > 0; }
      }
    }
    const made = ctx.crafting.craft(recipe, n, b.bag, { by: b }); if (!made) return this.fail('craft', 'could not craft ' + recipe); const oit = DQ.ITEMS[r.out]; if (oit.kind === 'weapon' && (oit.tier || 1) >= (b.weapon.tier || 1)) b.setEquip('weapon', r.out); if (oit.kind === 'body' || oit.kind === 'shield') b.setEquip(oit.kind, r.out);
    b.act = new E.Attack('bash'); b.act.start(); ctx.audioX && ctx.audioX.sfx('craft'); yield* this.wait(.3);
    return true;
  }
  *talk(npc, choices = []) {
    const ctx = this.ctx, n = ctx.npcs.get(npc); if (!n) return this.fail('talk', 'no ' + npc);
    const t0 = ctx.game.time;
    while (Math.hypot(n.body.x - this.b.body.x, n.body.y - this.b.body.y) > 22) { if (ctx.game.time - t0 > 20) { this.teleport(Math.floor(n.body.x / T) + 1, Math.floor(n.body.y / T)); break; } yield* this.walkTo(Math.floor(n.body.x / T), Math.floor(n.body.y / T), undefined, { radius: .5, timeout: 6 }); yield; }
    this.b.body.facing = Math.atan2(n.body.y - this.b.body.y, n.body.x - this.b.body.x); yield;
    ctx.npcs.talk(n, this.b); yield; yield;
    let ci = 0; const t1 = ctx.game.time;
    while (ctx.talk.open) { if (ctx.game.time - t1 > 30) return this.fail('talk', 'stuck in dialog'); const c = ctx.talk.cur; if (c.choices && c.i >= c.pages.length - 1) { c.shown = 999; c.choice = choices[ci++] || 0; } this.tap('confirm'); yield* this.wait(.12); }
    return true;
  }
  *fight(o = {}) {
    const ctx = this.ctx, b = this.b, t0 = ctx.game.time, filter = o.filter || (() => true);
    for (;;) {
      this._cheat();
      if (ctx.game.time - t0 > (o.timeout || 60)) return o.soft ? false : this.fail('fight', 'timeout');
      const rng = (o.range || 24) * T, ms = ctx.monsters.list.filter(m => !m.dead && filter(m) && (m.awake !== false) && (o.filter || Math.hypot(m.body.x - b.body.x, m.body.y - b.body.y) < rng)); if (!ms.length) return true;
      ms.sort((a, c) => Math.hypot(a.body.x - b.body.x, a.body.y - b.body.y) - Math.hypot(c.body.x - b.body.x, c.body.y - b.body.y));
      const m = ms[0]; if (this._ft !== m) { this._ft = m; this._fhp = m.hp; this._fT = ctx.game.time; } if (m.hp !== this._fhp) { this._fhp = m.hp; this._fT = ctx.game.time; }
      if (this.cheats.teleport && ctx.game.time - this._fT > 4) { this._fT = ctx.game.time; const tb = b.body; tb.x = m.body.x - 14; tb.y = m.body.y; tb.z = m.body.z; ctx.world.escape(tb); }
      const dx = m.body.x - b.body.x, dy = m.body.y - b.body.y, d = Math.hypot(dx, dy);
      if (d > 26 * T) { yield* this.walkTo(Math.floor(m.body.x / T), Math.floor(m.body.y / T), undefined, { radius: 2, timeout: 8 }); continue; }
      b.body.facing = Math.atan2(dy, dx);
      const near = ms.filter(q => Math.hypot(q.body.x - b.body.x, q.body.y - b.body.y) < 2 * T).length;
      if (m.state === 'wind' && d < 26 && !this.cheats.god) { this.it.move = [-dx / d, -dy / d]; yield; continue; }
      if (d > 16 + m.body.r) { this.it.move = [dx / d, dy / d]; if (b.body.hitWall && b.body.onGround) this.it.jump = true; yield; continue; }
      if (o.spin !== false && b.spinUnlocked && near >= 2 && !b.combo.busy) { this.hold.swing = true; yield* this.wait(.7); this.hold.swing = false; this.it.swingReleased = true; yield; yield* this.wait(.3); continue; }
      if (!b.combo.busy || b.combo.current.phase === 'recover') this.it.swing = true;
      yield;
    }
  }
  *manBallista(o, target, until) {
    const ctx = this.ctx, b = this.b, t0 = ctx.game.time;
    yield* this.approach(o.x, o.y, o.z); b.body.facing = Math.atan2((o.y + .5) * T - b.body.y, (o.x + .5) * T - b.body.x); yield;
    if (!b.seat) { b.target.use = o; DQ.useObject(ctx, o, b); }
    while (!(until ? until() : (target.dead || target.tangled > 0))) {
      if (ctx.game.time - t0 > 40) { b.seat = null; o.manned = false; return this.fail('manBallista', 'timeout'); }
      this._cheat();
      if (!b.seat) { if (o.broken) return false; yield* this.approach(o.x, o.y, o.z); DQ.useObject(ctx, o, b); yield; }
      const a = Math.atan2(target.body.y - (o.y + .5) * T, target.body.x - (o.x + .5) * T); this.it.move = [Math.cos(a), Math.sin(a)];
      if (o.reload <= 0 && Math.abs(E.angDiff(o.aim, a)) < .15) this.it.swing = true;
      yield;
    }
    this.it.interact = true; yield; yield; return true;
  }
}
DQ.Autopilot = Autopilot;
})();
