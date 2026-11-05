// The Autopilot: one task runner for the attract mode, the scripted playthrough and Bee bots. Tasks are generators that
// write an intent each step, so the AI plays through the real builder, physics, crafting and UI code. Cheats (god,
// teleport, infinite materials, fast placing) are applied by the autopilot, never by the systems.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
const SOLID = DQ.SOLID;
class Autopilot {
  constructor(ctx, builder, o = {}) {
    this.ctx = ctx; this.b = builder; this.cheats = o.cheats || {}; this.ui = !!o.ui; this.autoTalk = o.autoTalk === undefined ? 0 : o.autoTalk; if (this.autoTalk === 0) this.autoTalk = false; this._talkT = 0; this.want = DQ.Controls.blank(); this.fails = []; this.script = null; this.name = o.name || 'ap';
    if (this.cheats.god) builder.cheatGod = true; if (this.cheats.infinite) { builder.bag.infinite = true; builder.cheatInfinite = true; } if (this.cheats.oneHit) builder.cheatOneHit = true;
    if (this.cheats.fastPlace) this.ctx.cheats.fastPlace = true;
  }
  /** the intent for this step (one-shot presses are cleared after reading) */
  intent() { const w = this.want, out = Object.assign({}, w); w.swing = false; w.place = false; w.interact = false; w.jump = false; w.hotStep = 0; w.hotSlot = null; w.swingReleased = false; return out; }
  /** run a task (a generator); returns its script */
  run(task) { this.stop(); const ap = this; this.script = DQ.game.script(function* () { try { yield* task; } finally { ap.want.move = [0, 0]; ap.want.cursor = null; ap.want.swingHeld = false; } }); return this.script; }
  stop() { if (this.script) this.script.cancel(); this.script = null; this.want = DQ.Controls.blank(); }
  get done() { return !this.script || this.script.done; }
  fail(task, reason) { const f = { task, reason, at: [this.b.cx, this.b.cy, this.b.L] }; this.fails.push(f); this.ctx.events.emit('apFail', f); }
  // ------------------------------------------------------------ tasks
  *wait(s) { this.want.move = [0, 0]; yield s; }
  *until(fn, timeout = 10) { let t = 0; while (!fn() && t < timeout) { yield; t += DQ.game.o.step; } return fn(); }
  *face(x, y) { const b = this.b; b.targetFacing = Math.atan2(y - b.y, x - b.x); yield .1; }
  teleport(x, y, L) { const b = this.b; DQ.game.particles.smoke(b.x, b.y, b.z + 6, 6, { color: '#d8d0e8' }); b.teleportCell(x, y, L); DQ.game.cam.snap = true; DQ.game.particles.glints(b.x, b.y, b.z + 10, 8); }
  /** walk to a cell with the nav graph (hopping steps); a long or failed path becomes a teleport with cheats */
  *walkTo(x, y, L, o = {}) {
    const ctx = this.ctx, b = this.b, rad = o.radius === undefined ? 1 : o.radius, nav = ctx.nav;
    if (L === undefined) L = ctx.world.topZ(x, y);
    const far = Math.hypot(b.cx - x, b.cy - y);
    if (this.cheats.teleport && far > (o.tpOver || 40)) { this.teleport(...(this.standNear(x, y, L, rad) || [x, y, L])); yield .15; return true; }
    let path = nav.path(b.cx, b.cy, b.L, x, y, L, { radius: rad, partial: true, loose: true, cap: 4000 });
    if (!path && this.cheats.teleport) { this.teleport(...(this.standNear(x, y, L, rad) || [x, y, L])); yield .15; return true; }
    if (!path) { this.fail('walkTo', 'no path'); return false; }
    let i = 1, t = 0, stuck = 0, last = 1e9;
    while (i < path.length && t < (o.timeout || 30)) {
      const n = path[i], tx = n[0] * T + 8, ty = n[1] * T + 8, dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
      if (d < 4 && Math.abs(b.L - n[2]) <= 1) { i++; continue; }
      const s = Math.min(1, d / 10 + .35); this.want.move = [dx / (d || 1) * s, dy / (d || 1) * s]; this.want.sprint = !!o.sprint;
      if (n[2] > b.L && d < 16 && b.body.onGround) this.want.jump = true;
      yield; t += DQ.game.o.step;
      const gd = Math.hypot(b.x - (x * T + 8), b.y - (y * T + 8)); if (gd < last - 1) { last = gd; stuck = 0; } else stuck += DQ.game.o.step;
      if (stuck > 1.2 && b.body.onGround) { this.want.jump = true; }
      if (stuck > 3) { if (this.cheats.teleport) { this.teleport(...(this.standNear(x, y, L, rad) || [x, y, L])); break; } path = nav.path(b.cx, b.cy, b.L, x, y, L, { radius: rad, partial: true, loose: true }); i = 1; stuck = 0; if (!path) break; }
    }
    this.want.move = [0, 0]; this.want.sprint = false;
    const ok = Math.hypot(b.cx - x, b.cy - y) <= rad + 1.5;
    if (!ok && this.cheats.teleport) { this.teleport(...(this.standNear(x, y, L, rad) || [x, y, L])); yield .1; return true; }
    if (!ok) this.fail('walkTo', 'did not arrive');
    return ok;
  }
  standNear(x, y, L, rad = 1) {
    const nav = this.ctx.nav, w = this.ctx.world; let best = null, bd = 1e9;
    for (let r = Math.max(0, Math.floor(rad)); r <= 4; r++) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; for (const l of [L, L + 1, L - 1, w.topZ(X, Y)]) if (nav.standable(X, Y, l) && !w.objIdx.get(w.idx(X, Y, l))) { const d = dx * dx + dy * dy + (l !== L ? .5 : 0) + (l >= L && l > w.topZ(X, Y) - 1 && DQ.OPAQUE[w.get(X, Y, l - 1)] && l - 1 > 0 && !DQ.SOLID[w.get(X, Y, l - 2)] ? 0 : 0) + (l >= L + 1 ? 4 : 0) + (DQ.SOLID[w.get(X, Y, l - 1)] && l - 1 >= L - 1 && w.get(X, Y, l - 1) !== w.get(X, Y, l - 2) ? 1.5 : 0); if (d < bd && (dx || dy || rad < 1)) { bd = d; best = [X, Y, l]; } } } if (best) return best; }
    return best;
  }
  /** stand within reach of a cell (outside it) */
  *reach(x, y, z) {
    const b = this.b, R = DQ.tune('reach') * T - 6, inR = () => Math.hypot(x * T + 8 - b.x, y * T + 8 - b.y, z * T + 8 - (b.z + 16)) <= R && !(b.cx === x && b.cy === y);
    if (inR()) return true;
    const s = this.standNear(x, y, z, 1); if (!s) { this.fail('reach', 'no spot'); return false; }
    yield* this.walkTo(s[0], s[1], s[2], { radius: .5 });
    if (!inR() && this.cheats.teleport) { this.teleport(...s); yield .1; }
    return inR();
  }
  /** break a block (or harvest an object) */
  *breakAt(x, y, z, o = {}) {
    const w = this.ctx.world, gone = () => !SOLID[w.get(x, y, z)] && !w.objIdx.get(w.idx(x, y, z));
    if (gone()) return true; if (!(yield* this.reach(x, y, z))) { this.fail('breakAt', 'out of reach ' + [x, y, z]); return false; }
    let t = 0; this.want.cursor = { x, y, z };
    while (!gone() && t < (o.timeout || 8)) { this.want.cursor = { x, y, z }; if (!this.b.combo.busy && !(this.b.breakAtk && this.b.breakAtk.busy)) this.want.swing = true; yield; t += DQ.game.o.step; }
    this.want.cursor = null; yield .05;
    if (!gone()) this.fail('breakAt', 'still there ' + [x, y, z] + ' ' + ((DQ.BLOCKS[w.get(x, y, z)] || {}).key || (w.objIdx.get(w.idx(x, y, z)) || {}).id) + ' from ' + [this.b.cx, this.b.cy, this.b.L]);
    if (o.collect !== false) yield* this.collect(6);
    return gone();
  }
  /** walk over the drops nearby to pick them up */
  *collect(rad = 6) {
    const b = this.b, ctx = this.ctx; yield .5;
    for (let k = 0; k < 8; k++) {
      const d = ctx.drops.list.filter(q => !q.netOnly && Math.hypot(q.x - b.x, q.y - b.y) < rad * T && b.bag.room(q.id) > 0).sort((p, q) => DQ.d2(p.x, p.y, b.x, b.y) - DQ.d2(q.x, q.y, b.x, b.y))[0];
      if (!d) break;
      const x = Math.floor(d.x / T), y = Math.floor(d.y / T);
      yield* this.walkTo(x, y, Math.max(1, Math.floor((d.z + 2) / T)), { radius: .4, timeout: 4 });
      yield .4;
    }
  }
  /** select an item on the hotbar (adding it there) */
  select(item) { const bag = this.b.bag; let i = bag.hotbar.indexOf(item); if (i < 0) { i = bag.hotbar.indexOf(null); if (i < 0) i = 7; bag.hotbar[i] = item; } this.b.hot = i; }
  /** place an item (block or object) into a cell */
  *placeAt(x, y, z, item, o = {}) {
    const w = this.ctx.world, it = DQ.ITEMS[item], b = this.b, ok = () => it.kind === 'block' ? w.get(x, y, z) === it.block : !!(w.objIdx.get(w.idx(x, y, z)) && w.objIdx.get(w.idx(x, y, z)).id === it.obj);
    if (ok()) return true;
    if (this.cheats.infinite && b.bag.realCount(item) < 1) b.bag.add(item, 5);
    if (b.bag.count(item) < 1) { this.fail('placeAt', 'no ' + item); return false; }
    if (!o.noWalk) yield* this.reach(x, y, z);
    this.select(item);
    if (it.kind === 'obj' && o.facing !== undefined) { const f = DQ.OBJECTS[it.obj].door ? o.facing : (o.facing + 2) % 4; b.facing = f * Math.PI / 2; b.targetFacing = null; }
    let t = 0;
    while (!ok() && t < (o.timeout || 6)) { this.want.cursor = { x, y, z, place: { x, y, z } }; if (b.placeCd <= 0) this.want.place = true; yield; t += DQ.game.o.step; if (it.kind === 'obj' && o.facing !== undefined) { b.facing = (DQ.OBJECTS[it.obj].door ? o.facing : (o.facing + 2) % 4) * Math.PI / 2; b.targetFacing = null; } }
    this.want.cursor = null;
    if (!ok()) { const why = it.kind === 'block' ? b.canPlaceBlock(x, y, z) : this.ctx.objects.canPlace(it.obj, x, y, z, o.facing || 0, b), who = b.bodiesIn(x, y, z); this.fail('placeAt', 'not placed ' + item + ' at ' + x + ',' + y + ',' + z + ' (' + why + (who ? ' ' + (who.id || who.kind) : '') + ', from ' + [b.cx, b.cy, b.L] + (b.cursor.plcFar ? ' far' : '') + ' held ' + b.held + ' modal ' + this.ctx.modal + ' anim ' + (b.anim && b.anim.kind) + ' plc ' + b.cursor.plc + ' cd ' + b.placeCd.toFixed(2) + ' placing ' + !!(this.ctx.town.placing) + ')'); } return ok();
  }
  /** build a list of cells [{ x, y, z, block | obj, facing }] bottom-up, near to far */
  *buildStamp(cells, o = {}) {
    const b = this.b, list = cells.slice().sort((p, q) => p.z - q.z || DQ.d2(p.x, p.y, b.cx, b.cy) - DQ.d2(q.x, q.y, b.cx, b.cy));
    for (const c of list) { const item = c.block ? DQ.BLOCKS[c.block].key : c.obj; yield* this.placeAt(c.x, c.y, c.z, item, { facing: c.facing }); if (o.rate) yield o.rate; }
  }
  /** craft at a station (walks there; with ui: true it opens the screen and drives it) */
  *craft(recipe, n = 1, o = {}) {
    const ctx = this.ctx, r = DQ.recipe(recipe), b = this.b; if (!r) { this.fail('craft', 'no recipe'); return false; }
    if (!ctx.crafting.knows(r.id)) ctx.crafting.learn(r.id, { silent: !!o.silentNotion });
    let st = null;
    if (r.station !== 'pocket') { st = ctx.objects.list.filter(q => q.def.station === r.station && !q.gone).sort((p, q) => DQ.d2(p.x, p.y, b.cx, b.cy) - DQ.d2(q.x, q.y, b.cx, b.cy))[0]; if (!st) { this.fail('craft', 'no ' + r.station); return false; } yield* this.walkTo(st.x, st.y, st.z, { radius: 1.2 }); }
    const before = b.bag.realCount(r.out) + (DQ.ITEMS[r.out].kind === 'key' ? 0 : 0);
    if (this.ui) {
      DQ.Menus.openCraft(ctx, r.station, st); const s = ctx.ui.top; yield .4;
      const L = s.list(), want = L.indexOf(r); for (let k = 0; k < 12 && s.i !== want; k++) { s.i += s.i < want ? 1 : -1; DQ.sfx('uiMove'); yield .18; }
      s.qty = 0; for (let k = 0; k < n; k++) { s.make(); yield .3; } yield .4; ctx.ui.closeAll();
    } else ctx.crafting.craft(r.id, n, b, { station: st });
    yield .2;
    const ok = b.bag.realCount(r.out) > before || b.bag.infinite; if (!ok) this.fail('craft', 'nothing made: ' + recipe); return ok;
  }
  /** talk to a resident; choices picked by index; every page read */
  *talk(npcId, choices = []) {
    const ctx = this.ctx, n = ctx.npcs.get(npcId); if (!n) { this.fail('talk', 'no ' + npcId); return false; }
    yield* this.walkTo(n.cx, n.cy, n.L, { radius: 1.2 });
    ctx.quests.talkTo(n); yield* this.readDialog(choices);
    return true;
  }
  /** read an open dialog page by page (autoTalk: seconds a page shows, true for at once) */
  readTalk() {
    const tk = this.ctx.talk; if (!tk.open || !tk.modal) { this._talkT = 0; return; }
    this._talkT += DQ.game.o.step; const wait = this.autoTalk === true ? 0 : this.autoTalk; const it = tk.cur, len = tk.pageText.replace(/\n/g, '').length;
    if (tk.shown < len) { if (wait === 0) tk.shown = len; return; }
    if (this._talkT < wait) return; this._talkT = 0;
    if (tk.page < it.pages.length - 1) { tk.page++; tk.shown = 0; } else { if (it.choices) tk.choice = 0; tk.close(); }
  }
  *readDialog(choices = []) {
    const tk = this.ctx.talk; let k = 0, guard = 0;
    while (tk.open && guard++ < 400) {
      const it = tk.cur, len = tk.pageText.replace(/\n/g, '').length;
      if (tk.shown < len) { tk.shown = len; yield .05; continue; }
      const last = tk.page >= it.pages.length - 1;
      if (!last) { tk.page++; tk.shown = 0; yield .05; continue; }
      if (it.choices) tk.choice = choices[k++] || 0;
      tk.close(); yield .05;
    }
  }
  /** fight monsters near: approach, combo, spin when crowded, step back from a wind-up */
  *fight(o = {}) {
    const ctx = this.ctx, b = this.b; let t = 0;
    const list = () => ctx.monsters.list.filter(m => !m.dead && (!o.filter || o.filter(m)) && Math.hypot(m.x - b.x, m.y - b.y) < (o.range || 14) * T);
    while (list().length && t < (o.timeout || 60)) {
      const ms = list().sort((p, q) => DQ.d2(p.x, p.y, b.x, b.y) - DQ.d2(q.x, q.y, b.x, b.y)), m = ms[0], d = Math.hypot(m.x - b.x, m.y - b.y);
      b.targetFacing = Math.atan2(m.y - b.y, m.x - b.x);
      const crowd = ms.filter(q => Math.hypot(q.x - b.x, q.y - b.y) < 2 * T).length;
      if (m.move && m.move.phase === 'wind' && d < 30 && !this.cheats.god) { this.want.move = [-(m.x - b.x) / d, -(m.y - b.y) / d]; }
      else if (d > 18) { this.want.move = [(m.x - b.x) / d, (m.y - b.y) / d]; if (m.z > b.z + 10 && b.body.onGround) this.want.jump = true; }
      else { this.want.move = [0, 0];
        if (o.spin !== false && crowd >= 2 && ctx.flags.spinStitch) { this.want.swingHeld = true; this.want.swing = !b.charging; yield .7; this.want.swingHeld = false; yield .5; }
        else if (!b.combo.busy || b.combo.current.phase === 'recover') this.want.swing = true; }
      yield; t += DQ.game.o.step;
    }
    this.want.move = [0, 0]; return !list().length;
  }
  /** man a ballista and fire at a target until it is Tangled or gone */
  *manBallista(ob, target, o = {}) {
    const ctx = this.ctx, b = this.b; yield* this.walkTo(ob.x, ob.y + 1, ob.z, { radius: 1.2 });
    ctx.ballista.mount(b, ob); yield .2; let t = 0;
    while (target && !target.dead && t < (o.timeout || 20) && !(o.untilTangled && target.tangled > 0)) {
      const a = Math.atan2(target.y - (ob.y * T + 8), target.x - (ob.x * T + 8)); this.want.move = [Math.cos(a), Math.sin(a)];
      if (ob.data.reload <= 0 && Math.abs(E.angDiff(ob.data.aim, a)) < .12) this.want.swing = true;
      yield; t += DQ.game.o.step;
    }
    this.want.move = [0, 0]; this.want.interact = true; yield .1; if (b.mounted) ctx.ballista.dismount(b);
  }
}
DQ.Autopilot = Autopilot;
})();
