// Object instances: doors, lights, beds, stations, chests, traps, ballistas, portals, plants (regrowth), collectibles.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;
let NEXT = 1;
class Objects {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.byId = new Map(); this.regrow = []; this.bolts = []; this.discovered = new Set(); }
  get world() { return this.ctx.world; }
  // place an object: { id, x, y, z, facing (0..3 quarter turns), ...extra }. Returns it or null when the cell is taken
  add(spec, o = {}) {
    const def = DQ.OBJECTS[spec.id]; if (!def) return null;
    const w = this.world; if (!w.inside(spec.x, spec.y, spec.z)) return null;
    if (!o.force && (w.objAt(spec.x, spec.y, spec.z) || w.solidAt(spec.x, spec.y, spec.z) || (def.tall && (w.objAt(spec.x, spec.y, spec.z + 1) || w.solidAt(spec.x, spec.y, spec.z + 1))))) return null;
    const ob = Object.assign({ uid: spec.uid || NEXT++, facing: 1, open: 0, hp: def.door || def.ballista || def.hp || 0, def }, spec);
    ob.def = def; if (ob.uid >= NEXT) NEXT = ob.uid + 1;
    if (def.chest && !ob.items) ob.items = {};
    if (def.ballista) { ob.aim = ob.facing * Math.PI / 2; ob.reload = 0; ob.cool = 0; }
    this.list.push(ob); this.byId.set(ob.uid, ob); w._objIndex(ob, true);
    if (!o.silent) this.ctx.events.emit('objectPlaced', { obj: ob, by: o.by });
    return ob;
  }
  remove(ob, o = {}) {
    const i = this.list.indexOf(ob); if (i < 0) return;
    this.list.splice(i, 1); this.byId.delete(ob.uid); this.world._objIndex(ob, false);
    if (ob.def.plant && !o.noRegrow) this.regrow.push({ id: ob.id, x: ob.x, y: ob.y, z: ob.z, at: this.ctx.clock ? this.ctx.clock.total + 24 : 0 });
    if (!o.silent) this.ctx.events.emit('objectRemoved', { obj: ob, by: o.by });
  }
  at(x, y, z) { return this.world.objAt(x, y, z); }
  find(fn) { return this.list.find(fn) || null; }
  filter(fn) { return this.list.filter(fn); }
  near(x, y, z, r, fn) { return this.list.filter(o => Math.hypot(o.x + .5 - x / T, o.y + .5 - y / T) <= r && Math.abs(o.z - z / T) <= 2 && (!fn || fn(o))); }
  // world-unit centre of an object's cell
  pos(o) { return [o.x * T + T / 2, o.y * T + T / 2, o.z * T]; }
  // the generated objects are rebuilt from the seed: a save holds only what differs (added, removed, changed) and the regrowth list
  markGenerated() { this.genMax = NEXT - 1; this.genUids = new Set(this.list.map(o => o.uid)); }
  serialize() {
    const pack = o => { const s = { uid: o.uid, id: o.id, x: o.x, y: o.y, z: o.z, facing: o.facing }; for (const k of ['hp', 'items', 'town', 'portalId', 'buttonId', 'broken', 'contents', 'townChest']) if (o[k] !== undefined) s[k] = o[k]; return s; };
    const gen = this.genUids || new Set(), here = new Set(this.list.map(o => o.uid));
    return { v: 2, removed: [...gen].filter(u => !here.has(u)), added: this.list.filter(o => !gen.has(o.uid)).map(pack), changed: this.list.filter(o => gen.has(o.uid) && (o.townChest || o.broken || (o.items && Object.keys(o.items).length) || (o.def.banner && o.hp !== 300))).map(pack), regrow: this.regrow.map(g => [g.id, g.x, g.y, g.z, +g.at.toFixed(2)]) };
  }
  load(d) {
    if (Array.isArray(d)) { for (const o of this.list.slice()) this.remove(o, { silent: true, noRegrow: true }); for (const s of d) this.add(Object.assign({}, s), { force: true, silent: true }); this.regrow = []; return; }
    const rm = new Set(d.removed || []); for (const o of this.list.slice()) if (rm.has(o.uid)) this.remove(o, { silent: true, noRegrow: true });
    for (const s of d.changed || []) { const o = this.byId.get(s.uid); if (o) Object.assign(o, s, { def: o.def }); }
    for (const s of d.added || []) { const o = this.byId.get(s.uid); if (o) this.remove(o, { silent: true, noRegrow: true }); this.add(Object.assign({}, s), { force: true, silent: true }); }
    this.regrow = (d.regrow || []).map(([id, x, y, z, at]) => ({ id, x, y, z, at }));
  }
  update(dt) {
    const ctx = this.ctx, w = this.world, t = ctx.clock ? ctx.clock.total : 0;
    const walkers = [...(ctx.builders || []), ...((ctx.npcs && ctx.npcs.list) || [])];
    for (const o of this.list) {
      const d = o.def;
      if (d.door) {
        const near = walkers.some(b => b.body && Math.abs(b.body.x - (o.x * T + 8)) < 22 && Math.abs(b.body.y - (o.y * T + 8)) < 22 && Math.abs(b.body.z - o.z * T) < 20);
        const was = o.open > .5; o.open = E.approach(o.open, near && !o.broken ? 1 : 0, dt * 5);
        if ((o.open > .5) !== was && ctx.audioX) ctx.audioX.sfxAt(o.open > .5 ? 'doorOpen' : 'doorClose', o.x * T, o.y * T);
      }
      if (d.trap && ctx.monsters) {
        o.cool = (o.cool || 0) - dt;
        for (const m of ctx.monsters.list) {
          if (m.dead || Math.floor(m.body.x / T) !== o.x || Math.floor(m.body.y / T) !== o.y || Math.abs(m.body.z - o.z * T) > 6) continue;
          m.slow = .6;
          if (o.cool <= 0) { o.cool = .8; ctx.combat.hitMonster(m, 8, { src: 'trap', kx: 0, ky: 0 }); if (ctx.audioX) ctx.audioX.sfxAt('trap', o.x * T, o.y * T); }
        }
      }
      if (d.ballista && !o.broken) this._ballista(o, dt);
      if (d.portal && ctx.builder && !this.discovered.has(o.portalId)) {
        const b = ctx.builder.body; if (Math.hypot(b.x - (o.x * T + 8), b.y - (o.y * T + 8)) < 24 && Math.abs(b.z - o.z * T) < 24) this.discover(o.portalId);
      }
    }
    // plants grow back after a day if their cell is free
    for (let i = this.regrow.length - 1; i >= 0; i--) {
      const g = this.regrow[i]; if (t < g.at) continue;
      if (!w.get(g.x, g.y, g.z) && !w.objAt(g.x, g.y, g.z) && w.solidAt(g.x, g.y, g.z - 1)) this.add({ id: g.id, x: g.x, y: g.y, z: g.z }, { silent: true });
      this.regrow.splice(i, 1);
    }
    // ballista bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 6) b.trail.shift();
      let gone = b.life <= 0 || w.solidAt(Math.floor(b.x / T), Math.floor(b.y / T), Math.floor(b.z / T));
      if (!gone && ctx.monsters) for (const m of ctx.monsters.list) {
        if (m.dead || b.hit.has(m)) continue;
        const rr = (m.def.boss ? 14 : 7);
        if (Math.hypot(m.body.x - b.x, m.body.y - b.y) < rr && b.z > m.body.z - 4 && b.z < m.body.z + (m.def.boss ? 60 : 30)) {
          b.hit.add(m); ctx.combat.hitMonster(m, b.dmg, { src: 'ballista', manned: b.manned, kx: b.vx / 260 * 60, ky: b.vy / 260 * 60 });
          if (this.ctx.game.particles) this.ctx.game.particles.bits(b.x, b.y, b.z, 8, ['#e8dcc0', '#c8443a', '#fff']);
          if (b.hit.size > b.pierce) { gone = true; break; }
        }
      }
      if (gone) this.bolts.splice(i, 1);
    }
  }
  discover(id) {
    if (this.discovered.has(id)) return; this.discovered.add(id);
    const p = DQ.WORLD.portals.find(q => q.id === id);
    if (this.ctx.hud && p) this.ctx.hud.toast('Portal attuned: ' + p.name, 'portal');
    if (this.ctx.audioX) this.ctx.audioX.jingle('item');
    this.ctx.events.emit('portal', { id });
  }
  _ballista(o, dt) {
    const ctx = this.ctx; o.reload = Math.max(0, o.reload - dt);
    if (o.manned) return;
    if (!(ctx.siege && ctx.siege.active) && ctx.mode !== 'bee') return;
    o.cool = (o.cool || 0) - dt; if (o.cool > 0 || !ctx.monsters) return;
    const [x, y, z] = this.pos(o); let best = null, bd = 10 * T;
    for (const m of ctx.monsters.list) { if (m.dead || m.def.boss) continue; const d = Math.hypot(m.body.x - x, m.body.y - y); if (d < bd) { bd = d; best = m; } }
    if (!best) return;
    o.cool = 5; o.aim = Math.atan2(best.body.y - y, best.body.x - x); this.fire(o, false, 20);
  }
  fire(o, manned, dmg) {
    const [x, y, z] = this.pos(o), a = o.aim, sp = 260;
    this.bolts.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10, z: z + 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2.4, dmg: dmg || 30, pierce: 1, hit: new Set(), manned, trail: [] });
    o.reload = manned ? DQ.tuning.get('ballistaReload') : 0; o.recoil = 1;
    if (this.ctx.audioX) this.ctx.audioX.sfxAt('ballistaFire', x, y);
    this.ctx.events.emit('ballistaFire', { obj: o, manned });
  }
  // ---- drawing ----
  draw(r) {
    const game = r.game, t = game.real, lights = game.lights;
    const v = r.view, cutW = this.world.cut;
    for (const o of this.list) {
      const [x, y, z] = this.pos(o), d = o.def;
      const [sx, sy] = r.w(x, y, z); if (sx < -60 || sx > r.W + 60 || sy < -80 || sy > r.H + 60) continue;
      if (cutW && o.z >= cutW.z && Math.hypot(o.x + .5 - cutW.x, o.y + .5 - cutW.y) < cutW.r) continue;
      const facing = o.facing * Math.PI / 2;
      if (d.plant) { const sw = Math.sin(t * 3 + o.x + o.y) > .6 ? 1 : 0; r.shape(d.shape, x + sw * .5, y, z, { facing, pick: o }); continue; }
      if (d.door) { this._drawDoor(r, o, x, y, z); continue; }
      if (d.banner) { this._drawBanner(r, o, x, y, z); }
      else if (d.portal) { this._drawPortal(r, o, x, y, z); }
      else if (d.ballista) { this._drawBallista(r, o, x, y, z); }
      else if (d.shape) r.shape(d.shape, x, y, z, { facing, pick: o });
      if (d.light && lights.on) { const fl = d.shape === 'dqTorch' ? Math.sin(t * 20 + o.uid) * 4 : 0; lights.add(x, y, z + 12, d.light[0] + fl, 1, { color: d.light[1] }); }
      if (o.townChest) r.queue(x, y, z + 16, g => { const [qx, qy] = r.w(x, y, z + 15); E.font.text(g, '★', Math.round(qx) - 3, Math.round(qy) - 4 + Math.round(Math.sin(t * 3)), '#ffd84a', { outline: '#3a2a10' }); }, { bias: .01 });
      if (d.collect && !o.taken) r.queue(x, y, z + 6, g => { if ((t * 1.3 + o.uid) % 2 < .2) { const [qx, qy] = r.w(x, y, z + 10); px.rect(g, qx - 1, qy - 4, 2, 8, '#fff8d0'); px.rect(g, qx - 4, qy - 1, 8, 2, '#fff8d0'); } }, { bias: .02, emissive: true });
    }
    for (const b of this.bolts) {
      r.queue(b.x, b.y, b.z, g => {
        for (let i = 1; i < b.trail.length; i++) { const a = r.w(...b.trail[i - 1]), c = r.w(...b.trail[i]); px.line(g, a[0], a[1], c[0], c[1], '#f1e6c8'); }
        const [qx, qy] = r.w(b.x, b.y, b.z); px.disc(g, qx, qy, 2.5, '#c8443a'); px.rect(g, qx - 1, qy - 3, 2, 6, '#e8dcc0');
      }, { emissive: true });
    }
  }
  _drawDoor(r, o, x, y, z) {
    const d = o.def, plank = o.id === 'plankDoor', a = o.facing % 2 ? 0 : Math.PI / 2, ang = a + o.open * 1.5;
    const tn = E.tones(plank ? '#b07a48' : '#8a6a42');
    r.queue(x, y, z, g => {
      // the frame posts and the swinging leaf, drawn as boxes in world space
      const ex = Math.cos(a) * 8, ey = Math.sin(a) * 8, hx = x - ex, hy = y - ey;
      r.box(g, hx - 1.2, hy - 1.2, z, hx + 1.2, hy + 1.2, z + 30, tn.sh, tn.deep);
      r.box(g, x + ex - 1.2, y + ey - 1.2, z, x + ex + 1.2, y + ey + 1.2, z + 30, tn.sh, tn.deep);
      const lx = Math.cos(ang) * 14, ly = Math.sin(ang) * 14, nx = -Math.sin(ang) * 1, ny = Math.cos(ang) * 1;
      const P = (u, h) => r.w(hx + lx * u, hy + ly * u, z + h);
      const quad = [P(0, 1), P(1, 1), P(1, 29), P(0, 29)];
      if (o.broken) return;
      px.poly(g, quad, tn.base);
      if (plank) { for (let k = 1; k < 4; k++) { const a1 = P(k / 4, 1), b1 = P(k / 4, 29); px.line(g, a1[0], a1[1], b1[0], b1[1], tn.sh); } const hc = P(.5, 18); E.font.text(g, '♥', Math.round(hc[0]) - 2, Math.round(hc[1]) - 3, '#d04a4a', false); }
      else { for (let k = 0; k < 4; k++) { const a1 = P(0, 4 + k * 7), b1 = P(1, 8 + k * 7), c1 = P(1, 4 + k * 7), d1 = P(0, 8 + k * 7); px.line(g, a1[0], a1[1], b1[0], b1[1], tn.lt); px.line(g, c1[0], c1[1], d1[0], d1[1], tn.sh); } }
      for (const [p0, p1] of [[quad[0], quad[1]], [quad[1], quad[2]], [quad[2], quad[3]], [quad[3], quad[0]]]) px.line(g, p0[0], p0[1], p1[0], p1[1], tn.deep);
      const top1 = r.w(hx, hy, z + 31), top2 = r.w(x + ex, y + ey, z + 31); px.line(g, top1[0], top1[1], top2[0], top2[1], tn.deep);
    }, { hides: true, top: z + 32, pick: o });
  }
  _drawBanner(r, o, x, y, z) {
    const t = r.game.real, lv = this.ctx.town ? this.ctx.town.level : 1, cols = ['#d04a4a', '#4a6ad0', '#e8c040', '#5aa04a', '#a050c0'];
    r.queue(x, y, z, g => {
      const base = r.w(x, y, z), top = r.w(x, y, z + 44);
      px.rect(g, Math.round(base[0]) - 1, Math.round(top[1]), 3, Math.round(base[1] - top[1]), '#8a5a32'); px.rect(g, Math.round(base[0]), Math.round(top[1]), 1, Math.round(base[1] - top[1]), '#c89a62');
      px.disc(g, base[0] + .5, top[1] - 1, 2.5, '#ffd84a');
      // the cloth: a sine flutter, a stripe per town level
      for (let i = 0; i < 16; i++) {
        const fl = Math.sin(t * 4 - i * .5) * 2 * (i / 16), hgt = 20 - i * .3;
        for (let j = 0; j < hgt; j++) {
          const stripe = Math.floor(j / (hgt / Math.max(1, lv)));
          px.rect(g, Math.round(base[0]) + 2 + i, Math.round(top[1] + 2 + j + fl), 1, 1, j < 1 || j > hgt - 2 ? '#f1e6c8' : cols[Math.min(stripe, cols.length - 1)]);
        }
      }
      if (this.ctx.siege && this.ctx.siege.active && o.hp < 300) { const bw = 20; px.rect(g, base[0] - 10, top[1] - 8, bw, 3, '#200810'); px.rect(g, base[0] - 10, top[1] - 8, bw * o.hp / 300, 3, '#e04848'); }
    }, { hides: true, top: z + 44, pick: o });
  }
  _drawPortal(r, o, x, y, z) {
    const t = r.game.real, on = this.discovered.has(o.portalId);
    r.queue(x, y, z, g => {
      const c = r.w(x, y, z + 15);
      for (let k = 0; k < 2; k++) { const base = r.w(x + (k ? 7 : -7), y, z); px.rect(g, Math.round(base[0]) - 2, Math.round(base[1]) - 30, 4, 30, '#8a5a32'); px.rect(g, Math.round(base[0]) - 3, Math.round(base[1]) - 33, 6, 4, '#c89a62'); px.rect(g, Math.round(base[0]) - 3, Math.round(base[1]) - 3, 6, 3, '#c89a62'); }
      for (let i = 0; i < 18; i++) {
        const a = t * (on ? 3 : 1) + i * .35, rr = 3 + (i % 6) * 1.3;
        px.rect(g, Math.round(c[0] + Math.cos(a) * rr), Math.round(c[1] + Math.sin(a) * rr * 1.5), 1, 1, i % 3 ? (on ? '#c8a0ff' : '#6a5a8a') : '#f1e6c8');
      }
    }, { emissive: on, top: z + 32, pick: o });
  }
  _drawBallista(r, o, x, y, z) {
    const a = o.aim || 0, tn = E.tones('#a07040'), rec = (o.recoil = Math.max(0, (o.recoil || 0) - .05));
    r.queue(x, y, z, g => {
      r.box(g, x - 6, y - 6, z, x + 6, y + 6, z + 6, tn.base, tn.sh);
      const ca = Math.cos(a), sa = Math.sin(a), P = (u, s, h) => r.w(x + ca * u - sa * s, y + sa * u + ca * s, z + h);
      const back = P(-9 + rec * 3, 0, 10), tip = P(11, 0, 11);
      px.line(g, back[0], back[1], tip[0], tip[1], tn.deep, 3); px.line(g, back[0], back[1] - 1, tip[0], tip[1] - 1, tn.lt);
      const l = P(6, -9, 11), rr = P(6, 9, 11), m = P(-4 + rec * 3, 0, 11);
      px.line(g, l[0], l[1], rr[0], rr[1], tn.deep, 2); px.line(g, l[0], l[1], m[0], m[1], '#d8d8e0'); px.line(g, rr[0], rr[1], m[0], m[1], '#d8d8e0');
      if (o.reload <= 0) { const s = P(2, 0, 12); px.disc(g, s[0], s[1], 2.5, '#c8443a'); px.rect(g, s[0] - 1, s[1] - 3, 3, 6, '#e8dcc0'); }
      if (o.broken) { E.font.text(g, 'x', Math.round(m[0]) - 2, Math.round(m[1]) - 10, '#ff6a6a', { outline: '#000' }); }
      if (o.hp < o.def.ballista && !o.broken) { const p = r.w(x, y, z + 22); px.rect(g, p[0] - 8, p[1], 16, 2, '#200810'); px.rect(g, p[0] - 8, p[1], 16 * o.hp / o.def.ballista, 2, '#e8c040'); }
    }, { hides: true, top: z + 14, pick: o });
  }
}
DQ.Objects = Objects;
DQ.Objects.resetUids = () => { NEXT = 1; };
})();
