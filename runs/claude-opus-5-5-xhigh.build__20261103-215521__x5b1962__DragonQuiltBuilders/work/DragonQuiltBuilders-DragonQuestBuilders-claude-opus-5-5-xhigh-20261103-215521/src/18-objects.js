// Objects: furniture, stations, lights, doors, beds, chests, traps, ballistas, portals, plants (they regrow), collectibles,
// the Banner. They are not voxels: each has an anchor cell and occupies it (doors and portals two levels).
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px, T = 16;
const SOLID = DQ.SOLID;
class Objects {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.uid = 1; this.byUid = new Map(); this.t = 0; this._sec = 0; }
  get world() { return this.ctx.world; }
  at(x, y, z) { const w = this.world; return w.inside(x, y, z) ? w.objIdx.get(w.idx(x, y, z)) || null : null; }
  find(id) { return this.list.find(o => o.id === id && !o.gone) || null; }
  all(id) { return this.list.filter(o => o.id === id && !o.gone); }
  _cells(o) { const out = []; for (let k = 0; k < (o.def.cells || 1); k++) out.push([o.x, o.y, o.z + k]); return out; }
  _reg(o, on) { const w = this.world; for (const [x, y, z] of this._cells(o)) { if (!w.inside(x, y, z)) continue; const i = w.idx(x, y, z); if (on) w.objIdx.set(i, o); else if (w.objIdx.get(i) === o) w.objIdx.delete(i); w.colVer[y * w.W + x]++; } }
  add(id, x, y, z, facing = 1, o = {}) {
    const def = DQ.OBJECTS[id]; if (!def) return null;
    const ob = { uid: o.uid || this.uid++, id, def, x, y, z, facing: facing & 3, hp: def.hp || 0, open: 0, isOpen: false, data: Object.assign({}, o.data || {}), gone: false, hidden: false };
    if (o.uid && o.uid >= this.uid) this.uid = o.uid + 1;
    if (def.chest) ob.data.store = ob.data.store || new DQ.Store(20);
    if (def.ballista) Object.assign(ob.data, { reload: 0, aim: facing * Math.PI / 2, broken: false }, o.data || {});
    if (def.portal) ob.data.portal = o.portal || ob.data.portal;
    this.list.push(ob); this.byUid.set(ob.uid, ob); this._reg(ob, true);
    if (!o.silent) this.ctx.events.emit('objectPlaced', { obj: ob, id, x, y, z, by: o.by || null });
    return ob;
  }
  remove(ob, o = {}) {
    if (!ob || ob.gone) return; ob.gone = true; this._reg(ob, false); this.byUid.delete(ob.uid);
    const i = this.list.indexOf(ob); if (i >= 0) this.list.splice(i, 1);
    if (!o.silent) this.ctx.events.emit('objectRemoved', { obj: ob, id: ob.id, x: ob.x, y: ob.y, z: ob.z, by: o.by || null });
  }
  /** why an object can't go here (null: it can) */
  canPlace(id, x, y, z, facing, builder) {
    const w = this.world, def = DQ.OBJECTS[id]; if (!def) return 'Can\'t place that!';
    for (let k = 0; k < (def.cells || 1); k++) {
      const zz = z + k; if (!w.inside(x, y, zz) || zz < 1 || zz >= w.H - 1) return 'Can\'t place that here!';
      if (SOLID[w.get(x, y, zz)] || w.objIdx.get(w.idx(x, y, zz))) return 'Something\'s in the way!';
      if (builder && builder.bodiesIn && def.solidH > 0 && builder.bodiesIn(x, y, zz)) return 'Something\'s in the way!';
    }
    if (!SOLID[w.get(x, y, z - 1)] || DQ.STAIR[w.get(x, y, z - 1)]) return 'It needs solid ground under it!';
    if (DQ.LIQUID[w.get(x, y, z)]) return 'Not in the water!';
    if (this.ctx.canPlaceHere && !this.ctx.canPlaceHere(x, y, z)) return 'You can\'t build here!';
    return null;
  }
  /** a builder's break swing lands on an object */
  hitByBuilder(ob, b) {
    const d = ob.def, G = DQ.game;
    if (d.plant) { if (this.ctx.net && this.ctx.net.client && b.local) { this.ctx.net.sendOp(['harvest', ob.x, ob.y, ob.z]); this.remove(ob, { silent: true }); DQ.sfx('rustle', { vol: .5 }); return; } return this.harvest(ob, b); }
    if (d.cage) return this.damage(ob, b.weapon.weapon.blockDmg * DQ.tune('blockDmg'), b, b.weapon.weapon.tier);
    if (d.removable && d.item) {
      if (ob.data.store && ob.data.store.free() < 20) { if (b.local && this.ctx.hud) this.ctx.hud.toast('Empty the chest first!', 'chest'); return; }
      if (ob.data.townChest) this.ctx.flags.townChest = false;
      if (this.ctx.net && this.ctx.net.client && b.local) this.ctx.net.sendOp(['unobj', ob.x, ob.y, ob.z]);
      this.remove(ob, { by: b });
      const left = b.bag.add(d.item, 1); if (left && this.ctx.drops) this.ctx.drops.spawn(d.item, 1, ob.x * T + 8, ob.y * T + 8, ob.z * T + 6);
      DQ.sfx('pickup'); G.particles.dust(ob.x * T + 8, ob.y * T + 8, ob.z * T + 4, 5);
      if (b.local && this.ctx.hud) this.ctx.hud.toast('Picked up the ' + d.name + '.', d.item);
      return;
    }
    DQ.sfx('clink', { vol: .3 });
  }
  harvest(ob, b) {
    const R = this.ctx.rngDrops || (this.ctx.rngDrops = DQ.rng('drops', this.ctx.seed)), wx = ob.x * T + 8, wy = ob.y * T + 8, wz = ob.z * T + 6;
    for (const [id, a, c, ch] of ob.def.plant) if (R() < Math.min(1, ch * (ch < 1 ? DQ.tune('dropRate') : 1))) { const n = a + Math.floor(R() * (c - a + 1)); if (this.ctx.drops) this.ctx.drops.spawn(id, n, wx, wy, wz); }
    DQ.sfx('rustle', { vol: .5 }); DQ.game.particles.bits(wx, wy, wz, 8, ['#5aa04a', '#8ad06a', '#e0b850']);
    this.ctx.events.emit('harvest', { obj: ob, id: ob.id, by: b });
    // it regrows at its spot after one day, if the cell is still free
    const day = this.ctx.clock ? this.ctx.clock.total : 0;
    this.remove(ob, { by: b, silent: true });
    (this.regrow || (this.regrow = [])).push({ id: ob.id, x: ob.x, y: ob.y, z: ob.z, facing: ob.facing, at: day + 24 });
  }
  /** damage from a monster (doors, ballistas, the Banner, a cage under a builder's swing) */
  damage(ob, dmg, by, tier = 9) {
    const d = ob.def; if (!d.hp || ob.gone) return false;
    if (d.tier && tier < d.tier) { DQ.sfx('clink', { vol: .4 }); if (by && by.local && this.ctx.hud) this.ctx.hud.toast('Too tough for your ' + by.weapon.name + '!', null, 'tough'); return false; }
    if (d.ballista && ob.data.broken) return false;
    ob.hp = Math.max(0, ob.hp - dmg); ob.hitT = .15;
    DQ.game.particles.bits(ob.x * T + 8, ob.y * T + 8, ob.z * T + 10, 4, ['#8a5a32', '#c8955a', '#3a2a1a']);
    DQ.sfx('hitSoft', { vol: .35 });
    this.ctx.events.emit('objectHit', { obj: ob, dmg, by });
    if (ob.hp <= 0) {
      if (d.ballista) { ob.data.broken = true; if (ob.data.mountedBy) ob.data.mountedBy.mounted = null; ob.data.mountedBy = null; DQ.sfx('crumble'); this.ctx.events.emit('ballistaBroken', { obj: ob }); }
      else if (d.banner) { this.ctx.events.emit('bannerDown', { obj: ob }); }
      else { this.remove(ob, { by }); DQ.sfx('crumble'); DQ.game.particles.bits(ob.x * T + 8, ob.y * T + 8, ob.z * T + 10, 12, ['#8a5a32', '#c8955a', '#2a1a3a']); this.ctx.events.emit('objectBroken', { obj: ob, id: ob.id, by }); }
    }
    return true;
  }
  breakLabel(ob, b) {
    const d = ob.def; if (d.plant) return 'Pick ' + (d.plant[0] ? DQ.ITEMS[d.plant[0][0]].name : 'it');
    if (d.cage) return 'Break the ' + d.name; if (d.removable && d.item) return 'Take back the ' + d.name; return null;
  }
  // ---------------------------------------------------------------- update
  update(dt) {
    this.t += dt; const ctx = this.ctx, w = this.world;
    const movers = [].concat(ctx.builders || [], ctx.npcs ? ctx.npcs.list : []);
    for (const o of this.list) {
      const d = o.def; if (o.hitT) o.hitT = Math.max(0, o.hitT - dt);
      if (d.door) {
        const cx = o.x * T + 8, cy = o.y * T + 8; let near = false;
        for (const m of movers) { const b = m.body || m; if (!m.dead && Math.abs(b.x - cx) < 22 && Math.abs(b.y - cy) < 22 && Math.abs(b.z - o.z * T) < 20) { near = true; break; } }
        if (near !== o.isOpen) { o.isOpen = near; DQ.sfx(near ? 'doorOpen' : 'doorClose', { vol: .35 }); }
        o.open = E.approach(o.open, near ? 1 : 0, dt * 5);
      }
      if (d.trap && ctx.monsters) {
        o.data.t = (o.data.t || 0) + dt;
        for (const m of ctx.monsters.list) if (!m.dead && !m.boss && Math.floor(m.x / T) === o.x && Math.floor(m.y / T) === o.y && Math.abs(m.z - o.z * T) < 6) { m.slowK = d.trap.slow; if (o.data.t >= d.trap.every) { ctx.combat.damageMonster(m, d.trap.dmg, { x: m.x, y: m.y, z: m.z }, { src: 'trap' }); DQ.sfx('trap', { vol: .4 }); } }
        if (o.data.t >= d.trap.every) o.data.t = 0;
      }
      if (d.ballista) {
        const B = o.data; B.reload = Math.max(0, B.reload - dt); B.crank = Math.max(0, (B.crank || 0) - dt);
        if (!B.broken && !B.mountedBy && ctx.siege && ctx.siege.active && ctx.monsters && B.reload <= 0) {
          let best = null, bd = 160 * 160;
          for (const m of ctx.monsters.list) { if (m.dead || m.boss) continue; const dd = DQ.d2(m.x, m.y, o.x * T + 8, o.y * T + 8); if (dd < bd) { bd = dd; best = m; } }
          if (best) { B.aim = Math.atan2(best.y - (o.y * T + 8), best.x - (o.x * T + 8)); ctx.combat.fireBolt(o, B.aim, { dmg: 20, auto: true }); B.reload = 5; }
        }
      }
      if (d.portal && ctx.builders) for (const b of ctx.builders) if (b.local && Math.hypot(b.x - (o.x * T + 8), b.y - (o.y * T + 8)) < 24 && !ctx.flags['portal_' + o.data.portal]) { ctx.flags['portal_' + o.data.portal] = true; const p = DQ.WORLD.portals.find(q => q.id === o.data.portal); DQ.sfx('portal'); if (ctx.hud) ctx.hud.popup('portal', 'Portal attuned!', (p ? p.name : 'A portal') + ' Bobbin Portal. Travel between portals you have found.'); ctx.events.emit('portalFound', { id: o.data.portal }); }
    }
    // regrowth, once a second
    this._sec += dt; if (this._sec >= 1 && this.regrow && this.regrow.length && ctx.clock) {
      this._sec = 0; const now = ctx.clock.total;
      for (let i = this.regrow.length - 1; i >= 0; i--) { const g = this.regrow[i]; if (now >= g.at) { if (!w.objIdx.get(w.idx(g.x, g.y, g.z)) && !SOLID[w.get(g.x, g.y, g.z)] && SOLID[w.get(g.x, g.y, g.z - 1)]) this.add(g.id, g.x, g.y, g.z, g.facing, { silent: true }); this.regrow.splice(i, 1); } }
    }
  }
  // ---------------------------------------------------------------- drawing
  draw(r) {
    const w = this.world, G = DQ.game, v = r.view, cut = this.ctx.render;
    const vis = this.ctx.render ? this.ctx.render.visibleCols(r) : [0, 0, w.W, w.D];
    for (const o of this.list) {
      if (o.gone || o.hidden || o.x < vis[0] || o.x > vis[2] || o.y < vis[1] || o.y > vis[3]) continue;
      if (cut && cut.isCut(o.x, o.y, o.z)) continue;
      const d = o.def, wx = o.x * T + 8, wy = o.y * T + 8, wz = o.z * T;
      if (d.light) { const L = d.light, fl = L.flicker ? 1 + Math.sin(G.real * 23 + o.uid) * .05 + Math.sin(G.real * 7.3 + o.uid * 3) * .04 : 1; G.lights.add(wx, wy, wz + L.z, L.r * fl, L.i, { color: L.color }); }
      if (d.draw === 'banner') { this.drawBanner(r, o); continue; }
      if (d.draw === 'portal') { this.drawPortal(r, o); continue; }
      if (d.draw === 'pedestal') { this.drawPedestal(r, o); continue; }
      if (!d.shape) continue;
      let facing = o.facing * Math.PI / 2, params;
      if (d.door) params = { open: Math.round(o.open * 4) / 4 };
      if (d.ballista) facing = o.data.aim + Math.PI;
      const opt = { facing, params, pick: o, flash: o.hitT > 0 ? '#ffffff' : undefined };
      if (d.ballista && o.data.broken) { opt.mats = { w: 'walnut', s: 'rusted', b: 'dqPlum' }; }
      if (d.plant) { opt.shadow = false; }
      r.shape(d.shape, wx, wy, wz, opt);
      if (d.glint && Math.floor(G.real * 1.5 + o.uid) % 3 === 0 && G.real % 1 < .3) G.particles.glints(wx, wy, wz + 10, 1, '#fff8c0', 8);
      if (d.chest && o.data.townChest) r.queue(wx, wy, wz + 14, g => { const p = r.w(wx, wy, wz + 20 + Math.sin(G.real * 3) * 1.5); E.font.text(g, '★', Math.round(p[0]) - 3, Math.round(p[1]) - 4, '#ffe070', { outline: '#3a2a10' }); }, { bias: .01 });
      if (d.ballista && o.data.broken) r.queue(wx, wy, wz + 12, g => { const p = r.w(wx, wy, wz + 22); E.font.text(g, 'BROKEN', Math.round(p[0]) - 14, Math.round(p[1]), '#ff8a8a', { outline: '#1a0a10', font: 'tiny' }); }, { bias: .02 });
    }
  }
  drawBanner(r, o) {
    const G = DQ.game, wx = o.x * T + 8, wy = o.y * T + 8, wz = o.z * T, lv = this.ctx.town ? this.ctx.town.level : 1, planted = !this.ctx.town || this.ctx.town.planted;
    if (!planted) return;
    const rise = o.data.rise === undefined ? 1 : o.data.rise;
    r.shadow(wx, wy, 6, .4, '#000', wz);
    r.queue(wx, wy, wz + .5, g => {
      const b = r.w(wx, wy, wz), t = r.w(wx, wy, wz + 36 * rise), x0 = Math.round(t[0]), y0 = Math.round(t[1]);
      px.line(g, Math.round(b[0]), Math.round(b[1]), x0, y0, '#5a3a22', 2); px.line(g, Math.round(b[0]) - 1, Math.round(b[1]), x0 - 1, y0, '#8a6a3a');
      px.disc(g, x0, y0 - 1, 2, '#ffe070');
      const z = v => r.view.zoom || 1, k = (r.view.scale / Math.SQRT2) * (z() || 1), W = Math.round(16 * k), H = Math.round(14 * k), cols = ['#c84a3a', '#e8c040', '#4a6ad0', '#5aa04a', '#9a5ab0', '#f1e6c8'];
      for (let i = 0; i < W; i++) {
        const fl = Math.round(Math.sin(G.real * 4 - i * .45) * 1.6 * (i / W)), xx = x0 + 1 + i;
        for (let j = 0; j < H; j++) { const band = Math.min(lv, Math.floor(j / H * Math.max(1, lv))), c = j === 0 || j === H - 1 || i === W - 1 ? '#7a2a2a' : cols[band % cols.length]; px.dot(g, xx, y0 + 1 + j + fl, ((i + j) % 4 === 0 && (j === 2 || j === H - 3)) ? '#f1e6c8' : c); }
      }
      // a stitched heart
      const hx = x0 + Math.round(W / 2), hy = y0 + Math.round(H / 2) + Math.round(Math.sin(G.real * 4 - W / 2 * .45) * .8);
      E.font.text(g, '♥', hx - 3, hy - 3, '#fff0f0', { outline: '#7a2a2a' });
      if (o.hitT > 0) px.blend(g, .5, 'add', () => px.rect(g, x0, y0, W, H, '#ffffff'));
    }, { bias: .002, hides: true });
  }
  drawPortal(r, o) {
    const G = DQ.game, wx = o.x * T + 8, wy = o.y * T + 8, wz = o.z * T, ax = o.facing % 2 === 0, dx = ax ? 0 : 7, dy = ax ? 7 : 0;
    const found = this.ctx.flags['portal_' + o.data.portal];
    r.queue(wx, wy, wz + .5, g => {
      for (const s of [-1, 1]) {
        const b = r.w(wx + dx * s, wy + dy * s, wz), t = r.w(wx + dx * s, wy + dy * s, wz + 28);
        px.rect(g, Math.round(b[0]) - 3, Math.round(t[1]), 6, Math.round(b[1] - t[1]), '#7a5a3a');
        for (let k = 0; k < 6; k++) px.rect(g, Math.round(b[0]) - 2, Math.round(t[1]) + 3 + k * 4, 4, 2, ['#c84a3a', '#e8c040', '#4a6ad0'][k % 3]);
        px.rect(g, Math.round(b[0]) - 4, Math.round(t[1]) - 1, 8, 2, '#5a3a22'); px.rect(g, Math.round(b[0]) - 4, Math.round(b[1]) - 2, 8, 2, '#5a3a22');
      }
      const a = r.w(wx - dx, wy - dy, wz + 30), c = r.w(wx + dx, wy + dy, wz + 30); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(c[0]), Math.round(c[1]), '#5a3a22', 2);
    }, { hides: true });
    r.queue(wx, wy, wz + 1, g => {
      const c = r.w(wx, wy, wz + 15), cx = Math.round(c[0]), cy = Math.round(c[1]), t = G.real * (found ? 3 : 1.2);
      px.blend(g, found ? .85 : .45, 'add', () => {
        for (let k = 0; k < 4; k++) for (let i = 0; i < 14; i++) { const a0 = t + k * Math.PI / 2 + i * .16, rr = 2 + i * .5; px.dot(g, Math.round(cx + Math.cos(a0) * rr * .9), Math.round(cy + Math.sin(a0) * rr * 1.3), ['#c8a0ff', '#ffe0ff', '#a080ff', '#ffffff'][k]); }
      });
    }, { emissive: true, bias: .001 });
  }
  drawPedestal(r, o) {
    const G = DQ.game, wx = o.x * T + 8, wy = o.y * T + 8, wz = o.z * T, taken = this.ctx.flags.threadTaken;
    r.shadow(wx, wy, 6, .4, '#000', wz);
    r.box && r.queue(wx, wy, wz + .5, g => { r.box(g, wx - 5, wy - 5, wz, wx + 5, wy + 5, wz + 10, '#8a7a9a', '#5a4a6a'); }, { occluder: false, hides: true });
    if (!taken) r.queue(wx, wy, wz + 11, g => { const p = r.w(wx, wy, wz + 16 + Math.sin(G.real * 2) * 2), x = Math.round(p[0]), y = Math.round(p[1]); px.blend(g, .6, 'add', () => px.disc(g, x, y, 7, '#ffe070')); px.rect(g, x - 3, y - 4, 7, 8, '#c89a10'); px.rect(g, x - 2, y - 3, 5, 6, '#fff0a0'); px.line(g, x - 3, y - 5, x + 3, y - 5, '#8a6a10'); px.line(g, x - 3, y + 4, x + 3, y + 4, '#8a6a10'); }, { emissive: true, bias: .01 });
  }
  // ---------------------------------------------------------------- save
  serialize() {
    return { list: this.list.filter(o => !o.gone).map(o => { const d = {}; if (o.data.store) d.store = o.data.store.serialize(); for (const k of ['townChest', 'portal', 'broken', 'items', 'pattern']) if (o.data[k] !== undefined) d[k] = o.data[k]; return [o.id, o.x, o.y, o.z, o.facing, o.hp, d, o.uid]; }), regrow: this.regrow || [], uid: this.uid };
  }
  load(s) {
    for (const o of this.list.slice()) this.remove(o, { silent: true });
    for (const [id, x, y, z, f, hp, d, uid] of s.list) { const data = Object.assign({}, d); if (d.store) { data.store = new DQ.Store(20); data.store.load(d.store); } const ob = this.add(id, x, y, z, f, { silent: true, data, uid, portal: d.portal }); if (ob && hp) ob.hp = hp; }
    this.regrow = (s.regrow || []).slice(); this.uid = Math.max(this.uid, s.uid || 1);
  }
}
DQ.Objects = Objects;
})();
