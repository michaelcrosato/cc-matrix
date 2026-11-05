// Navigation (A* over standable voxel cells) and the residents: schedules, needs, jobs, helping, fighting, talk.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;

// ---- A* ----
class Heap { constructor() { this.a = []; } push(n, f) { const a = this.a; a.push([f, n]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top[1]; } get size() { return this.a.length; } }
const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]];
DQ.Nav = {
  // path from [x, y, L] to [x, y, L] (or within `near` cells of it): [[x, y, L], ...] or null. o: { kind, max, breaker, near }
  path(w, from, to, o = {}) {
    const kind = o.kind || 'npc', max = o.max || 3000, near = o.near || 0, brk = !!o.breaker;
    const key = (x, y, l) => (y * w.W + x) * 32 + l;
    const st = DQ.Nav.snap(w, from, kind); if (!st) return null;
    const open = new Heap(), g = new Map(), came = new Map(), h = (x, y, l) => { const dx = Math.abs(x - to[0]), dy = Math.abs(y - to[1]); return Math.max(dx, dy) + .41 * Math.min(dx, dy) + Math.abs(l - to[2]) * .5; };
    const sk = key(...st); g.set(sk, 0); open.push(st, h(...st)); let n = 0, best = st, bestH = h(...st);
    while (open.size && n++ < max) {
      const c = open.pop(), ck = key(...c), cg = g.get(ck), hc = h(...c);
      if (hc < bestH) { bestH = hc; best = c; }
      if (Math.max(Math.abs(c[0] - to[0]), Math.abs(c[1] - to[1])) <= near && Math.abs(c[2] - to[2]) <= 1) return DQ.Nav._build(came, c, key);
      for (const [dx, dy, cost] of D8) {
        const nx = c[0] + dx, ny = c[1] + dy;
        if (dx && dy && (DQ.Nav._wall(w, c[0] + dx, c[1], c[2], kind) || DQ.Nav._wall(w, c[0], c[1] + dy, c[2], kind))) continue;
        for (const dl of [0, 1, -1, -2, -3]) {
          const nl = c[2] + dl; let extra = 0;
          if (!w.standable(nx, ny, nl, kind)) {
            if (!brk || dl !== 0 || dx && dy) continue;
            // a breaker walks through walls (cost 8 a block) and doors (4)
            if (!w.solidAt(nx, ny, nl - 1)) continue;
            const o2 = w.objAt(nx, ny, nl); let ok = true;
            for (const l of [nl, nl + 1]) { const id = w.get(nx, ny, l); if (id && DQ.BLOCKS[id].tier >= 99) ok = false; else if (id && DQ.BLOCKS[id].solid) extra += 8; }
            if (o2 && o2.def.door) extra += 4; else if (o2 && o2.def.solid) extra += 6;
            if (!ok || !extra) continue;
          }
          if (dl === 1 && w.solidAt(c[0], c[1], c[2] + 2)) continue;
          const nk = key(nx, ny, nl), ng = cg + cost + (dl > 0 ? 1 : dl < 0 ? .5 : 0) + extra;
          if (ng < (g.has(nk) ? g.get(nk) : 1e9)) { g.set(nk, ng); came.set(nk, c); open.push([nx, ny, nl], ng + h(nx, ny, nl)); }
          break;
        }
      }
    }
    return o.partial ? DQ.Nav._build(came, best, key) : null;
  },
  _wall(w, x, y, l, kind) { return w.blocks(x, y, l, kind, l * T, 2) || w.blocks(x, y, l + 1, kind, l * T, 2); },
  _build(came, c, key) { const out = [c]; let k = key(...c); while (came.has(k)) { c = came.get(k); out.unshift(c); k = key(...c); } return out; },
  // the standable node a body is on (or the nearest one under it)
  snap(w, p, kind) { const [x, y, l] = p; for (const dl of [0, 1, -1, 2, -2]) if (w.standable(x, y, l + dl, kind)) return [x, y, l + dl]; return null; },
  nodeOf(body) { return [Math.floor(body.x / T), Math.floor(body.y / T), Math.floor((body.z + 1) / T)]; }
};

// a walker that follows a path (residents, monsters on breaker paths, the autopilot)
DQ.followPath = (body, path, speed, dt) => {
  if (!path || !path.length) return true;
  const n = path[0], tx = (n[0] + .5) * T, ty = (n[1] + .5) * T, dx = tx - body.x, dy = ty - body.y, d = Math.hypot(dx, dy);
  if (d < 4 && Math.abs(body.z - n[2] * T) < 10) { path.shift(); return !path.length; }
  body.vx = dx / (d || 1) * speed; body.vy = dy / (d || 1) * speed; body.facing = Math.atan2(dy, dx);
  if (n[2] * T > body.z + 4 && body.onGround && d < 22) body.jump(215);
  return false;
};

// ---- residents ----
const BALLOONS = { '!': '#ffd84a', '?': '#8ad8ff', note: '#ffb0d0', dots: '#c8c8d8', heart: '#ff7aa8', zzz: '#b8c8ff', need: '#ff9a6a' };
class Resident {
  constructor(ctx, id, x, y, z) {
    this.ctx = ctx; this.id = id; this.def = DQ.NPCS[id]; this.npc = true; this.name = this.def.name;
    this.body = new DQ.VoxelBody({ x, y, z, kind: 'npc', r: id === 'lintwick' ? 4 : 5, h: id === 'lintwick' ? 14 : 28 });
    this.rig = DQ.makeNpcRig(id);
    this.state = 'idle'; this.path = null; this.goal = null; this.wait = 0; this.stuck = 0; this.balloon = null; this.balloonT = 0;
    this.mood = 0; this.needs = { sleep: -1, meal: -1, comfort: -1 }; this.bed = null; this.task = null; this.atk = null; this.cool = 0; this.anim = null; this.hp = 30; this.away = false;
    this.say = null; this.sayT = 0; this.follow = null;
  }
  get x() { return this.body.x; } get y() { return this.body.y; }
  node() { return DQ.Nav.nodeOf(this.body); }
  goTo(x, y, l, o = {}) {
    const w = this.ctx.world, p = DQ.Nav.path(w, this.node(), [x, y, l === undefined ? w.topZ(x, y) : l], { kind: 'npc', near: o.near || 0, max: 2500, partial: true });
    this.path = p ? p.slice(1) : null; this.goal = [x, y, l]; this.stuck = 0; this._last = [this.body.x, this.body.y];
    return !!p;
  }
  emote(kind, t = 2.5) { this.balloon = kind; this.balloonT = t; }
  speak(text, t = 3) { this.say = text; this.sayT = t; }
  update(dt) {
    const b = this.body, ctx = this.ctx, w = ctx.world;
    if (this.balloonT > 0) { this.balloonT -= dt; if (this.balloonT <= 0 && !['!', '?'].includes(this.balloon)) this.balloon = null; }
    if (this.sayT > 0) this.sayT -= dt;
    this.cool -= dt;
    const sp = (this.def.style === 'bouncy' ? 56 : this.def.style === 'ready' ? 38 : 46) * (this.state === 'flee' ? 1.4 : 1);
    if (this.state === 'sleep' || this.state === 'arrive-wait') { b.vx = b.vy = 0; }
    else if (this.path && this.path.length) {
      const done = DQ.followPath(b, this.path, sp, dt);
      // stuck: no progress for 8 s -> off screen teleport, on screen hop then re-path
      this.stuck += dt;
      if (Math.hypot(b.x - this._last[0], b.y - this._last[1]) > 6) { this.stuck = 0; this._last = [b.x, b.y]; }
      if (this.stuck > 2 && b.onGround) b.jump(215);
      if (this.stuck > 8 && this.goal) { const [gx, gy, gl] = this.goal; const p = ctx.game.r ? ctx.game.r.w((gx + .5) * T, (gy + .5) * T, (gl || w.topZ(gx, gy)) * T) : [-999, -999]; b.x = (gx + .5) * T; b.y = (gy + .5) * T; b.z = (gl || w.topZ(gx, gy)) * T; w.escape(b); ctx.game.particles.smoke(b.x, b.y, b.z + 8, 6); this.path = null; this.stuck = 0; }
      if (done) this.path = null;
    } else { b.vx *= .8; b.vy *= .8; }
    if (this.follow) { const f = this.follow.body, d = Math.hypot(f.x - b.x, f.y - b.y); if (d > 40) { b.vx = (f.x - b.x) / d * 70; b.vy = (f.y - b.y) / d * 70; b.facing = Math.atan2(f.y - b.y, f.x - b.x); if (b.hitWall && b.onGround) b.jump(215); } if (d > 260) { b.x = f.x - 16; b.y = f.y; b.z = f.z; w.escape(b); } }
    b.update(dt, w);
    if (b.fellOut) { const s = ctx.town ? ctx.town.spawnPoint() : [b.x, b.y, 200]; b.x = s[0]; b.y = s[1]; b.z = s[2]; w.escape(b); }
    if (this.anim) { this.anim.update(dt); if (!this.anim.busy) this.anim = null; }
    const pose = this.state === 'sleep' ? null : this.pose;
    if (this.def.blob) this.rig.update(dt, { squash: this.state === 'dance' ? Math.sin(ctx.game.time * 12) * .3 : (Math.hypot(b.vx, b.vy) > 5 ? Math.sin(ctx.game.time * 14) * .25 : 0), walk: Math.min(1, Math.hypot(b.vx, b.vy) / 40), look: [Math.cos(b.facing), Math.sin(b.facing)] });
    else this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: b.facing, attack: this.anim ? this.anim.state : null, pose: this.state === 'sleep' ? undefined : pose, down: this.state === 'sleep' ? 1 : 0, expr: this.mood < 0 ? 'wince' : this.state === 'talk' ? 'smile' : undefined, stance: this.def.style === 'ready' ? 'ready' : undefined, lean: this.def.style === 'lean' ? .25 : 0 });
  }
  draw(r) {
    const b = this.body, ctx = this.ctx; if (this.away) return;
    DQ.FX.shadow(r, ctx.world, b.x, b.y, b.z, this.def.blob ? 5 : 6);
    const z = b.z + (this.state === 'sleep' && this.bed ? 6 : 0);
    r.actor(b.x, b.y, z, (g, ox, oy) => {
      this.rig.draw(g, ox, oy, r.view);
      if (this.def.blob) { const s = r.view.zoom || 1; px.disc(g, ox - 2.5 * s, oy - 9 * s, 1.6 * s, '#3a2a40'); px.disc(g, ox + 2.5 * s, oy - 9 * s, 1.6 * s, '#3a2a40'); px.dot(g, ox - 3 * s, oy - 9.5 * s, '#ffffff'); }
    }, { pick: this, xray: false });
    const top = this.def.blob ? 22 : 40;
    if (this.balloon) r.queue(b.x, b.y, z + top, g => DQ.drawBalloon(g, r, b.x, b.y, z + top, this.balloon, r.game.real), { bias: .06 });
    if (this.say && this.sayT > 0) r.queue(b.x, b.y, z + top + 4, g => { const [sx, sy] = r.w(b.x, b.y, z + top + 8), w2 = E.font.width(this.say) + 8; E.ui.box(g, Math.round(sx - w2 / 2), Math.round(sy - 12), w2, 12, { bg: '#f8f4ec', border: '#3a3050', gradient: false }); E.font.text(g, this.say, Math.round(sx - w2 / 2 + 4), Math.round(sy - 10), '#2a2440', false); }, { bias: .07 });
    if (this.state === 'sleep' && Math.floor(r.game.real * 1.5) % 2 === 0) r.queue(b.x, b.y, z + 20, g => { const [sx, sy] = r.w(b.x, b.y, z + 16 + (r.game.real % 1) * 10); E.font.text(g, 'z', Math.round(sx + 6), Math.round(sy), '#b8c8ff', { outline: '#202040' }); }, { bias: .05 });
  }
}
DQ.drawBalloon = (g, r, x, y, z, kind, t) => {
  const [sx, sy] = r.w(x, y, z), X = Math.round(sx), Y = Math.round(sy + Math.sin(t * 5) * 1.5) - 6, c = BALLOONS[kind] || '#ffffff';
  E.ui.box(g, X - 6, Y - 6, 13, 12, { bg: '#f8f4ec', border: '#3a3050', gradient: false }); px.poly(g, [[X - 2, Y + 5], [X + 2, Y + 5], [X, Y + 8]], '#f8f4ec');
  if (kind === '!' || kind === '?') E.font.text(g, kind, X - 1, Y - 4, kind === '!' ? '#e0a020' : '#3a8ad0', false);
  else if (kind === 'heart') E.font.text(g, '♥', X - 3, Y - 4, '#ff5a8a', false);
  else if (kind === 'note') E.font.text(g, '♪', X - 3, Y - 4, '#d04a8a', false);
  else if (kind === 'zzz') E.font.text(g, 'z', X - 2, Y - 4, '#4a6ad0', false);
  else if (kind === 'need') E.font.text(g, '!', X - 1, Y - 4, '#e05a2a', false);
  else { px.rect(g, X - 4, Y, 2, 2, '#6a6480'); px.rect(g, X - 1, Y, 2, 2, '#6a6480'); px.rect(g, X + 2, Y, 2, 2, '#6a6480'); }
};
DQ.makeNpcRig = id => {
  const d = DQ.NPCS[id];
  if (d.blob) return new E.Blob({ R: 7, colors: { base: '#cfcad6', dk: '#9a94a8', lt: '#f0eef4' }, feet: true, mouth: true, face: 'front' });
  const o = Object.assign({ size: d.size || 1, build: d.build || 'chibi', weapon: d.weapon === 'club' ? 'sword' : null, face: { eyes: 'big' } }, d.rig);
  o.colors = Object.assign({ skin: '#f2c39a', boot: '#5a3a22', belt: '#8a5a32' }, (d.rig || {}).colors);
  const rig = new E.Humanoid(o); if (d.weapon === 'club') rig.o.tool = 'club'; return rig;
};
DQ.Resident = Resident;

class Residents {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.helpT = {}; this.lastHour = -1; this.day = -1; this.arrivals = []; }
  get(id) { return this.list.find(n => n.id === id) || null; }
  add(id, x, y, z) { if (this.get(id)) return this.get(id); const n = new Resident(this.ctx, id, x, y, z); this.list.push(n); this.ctx.world.escape(n.body); return n; }
  // a resident moves in: walks in along the east road (or appears at the banner)
  arrive(id, o = {}) {
    if (this.get(id)) return this.get(id);
    const ctx = this.ctx, t = ctx.town, w = ctx.world;
    const sx = o.at ? o.at[0] : t.bx + 14, sy = o.at ? o.at[1] : t.by, z = w.topZ(sx, sy) * T;
    const n = this.add(id, (sx + .5) * T, (sy + .5) * T, z);
    n.goTo(t.bx + 2, t.by + 2, undefined, { near: 1 });
    ctx.events.emit('npcArrived', { id });
    if (!o.quiet) { ctx.hud && ctx.hud.banner(n.name + ' has moved into Thimbleton!'); ctx.audioX && ctx.audioX.jingle('arrive'); }
    return n;
  }
  update(dt) {
    const ctx = this.ctx, clock = ctx.clock; if (!clock) return;
    const hour = clock.hour, day = clock.day;
    for (const n of this.list) { this._think(n, dt, hour, day); n.update(dt); }
    // daily jobs at set hours
    const hi = Math.floor(hour);
    if (hi !== this.lastHour) { this.lastHour = hi; this._hourly(hi, day); }
  }
  _hourly(h, day) {
    const ctx = this.ctx, chest = this.townChest();
    if (h === 7) {
      if (this.get('wren') && chest) { for (const k of ['straw', 'branch', 'cotton']) DQ.Chest.add(chest, k, 1 + Math.floor(DQ.rng('npc')() * 2)); this.get('wren').emote('note'); }
      if (this.get('lintwick') && chest && ctx.flags.lintGifts) { DQ.Chest.add(chest, 'lint', 2); this.get('lintwick').emote('heart'); }
      // comfort: their favourite room
      for (const n of this.list) if (this._favourite(n) && n.needs.comfort !== day) { n.needs.comfort = day; ctx.town.addBubble(n, 'comfort'); }
    }
    if ((h === 8 || h === 17) && this.get('marigold') && ctx.rooms && ctx.rooms.has('kitchen') && chest) {
      if (DQ.Chest.count(chest, 'puffball') >= 2 && DQ.Chest.count(chest, 'thimbleberry') >= 1 && DQ.Chest.count(chest, 'grain') >= 1) { DQ.Chest.take(chest, 'puffball', 2); DQ.Chest.take(chest, 'thimbleberry', 1); DQ.Chest.take(chest, 'grain', 1); DQ.Chest.add(chest, 'stew', 1); }
      else if (DQ.Chest.count(chest, 'thimbleberry') >= 2 && DQ.Chest.count(chest, 'grain') >= 1) { DQ.Chest.take(chest, 'thimbleberry', 2); DQ.Chest.take(chest, 'grain', 1); DQ.Chest.add(chest, 'bun', 1); }
      else if (DQ.Chest.count(chest, 'puffball') >= 1) { DQ.Chest.take(chest, 'puffball', 1); DQ.Chest.add(chest, 'roastPuffball', 1); }
      else DQ.Chest.add(chest, 'roastPuffball', 1);   // she forages a little herself
      this.get('marigold').emote('note');
    }
    if (h === 19 && ctx.rooms && ctx.rooms.has('messHall')) for (const n of this.list) if (n.needs.meal !== day && (ctx.rooms.has('kitchen') || !this.get('marigold'))) { n.needs.meal = day; ctx.town.addBubble(n, 'meal'); }
    if (h === 6) for (const n of this.list) if (n.bed && n.needs.sleep !== day) { n.needs.sleep = day; ctx.town.addBubble(n, 'sleep'); }
    if (h === 21) this._assignBeds();
  }
  townChest() { return this.ctx.objects ? this.ctx.objects.find(o => o.townChest) : null; }
  _favourite(n) {
    const R = this.ctx.rooms; if (!R) return false;
    if (n.def.favourite === 'bedroomFelt') return R.has('bedroom', r => r.felt);
    if (n.id === 'professor') return R.has('workshop') || R.has('hall');
    return R.has(n.def.favourite);
  }
  _assignBeds() {
    const ctx = this.ctx, beds = ctx.objects.filter(o => o.id === 'strawBed' && ctx.rooms && ctx.rooms.list.some(r => r.type === 'bedroom' && r.inBorder && r.cells.some(c => c[0] === o.x && c[1] === o.y) && r.L === o.z));
    const order = ['wren', 'lintwick', 'marigold', 'professor', 'mortimer'];
    for (const n of this.list) n.bed = null;
    // lintwick wants the felt bedroom
    for (const id of order) { const n = this.get(id); if (!n) continue; const free = beds.filter(b => !this.list.some(m => m.bed === b)); if (!free.length) break; n.bed = (id === 'lintwick' && free.find(b => ctx.rooms.list.some(r => r.felt && r.cells.some(c => c[0] === b.x && c[1] === b.y)))) || free[0]; }
  }
  _think(n, dt, hour, day) {
    const ctx = this.ctx, t = ctx.town, w = ctx.world;
    if (!t || !t.planted || n.state === 'arrive' || n.follow) return;
    n.wait -= dt;
    // a quest to give or to turn in
    if (ctx.quests) { const q = ctx.quests.balloonFor(n.id); if (q) { if (n.balloon !== q) n.emote(q, 999); } else if (n.balloon === '!' || n.balloon === '?') n.balloon = null; }
    // sieges: fight or hide
    if (ctx.siege && ctx.siege.active) { this._fight(n, dt); return; }
    // night guard
    if (n.id === 'mortimer' && (hour >= 20 || hour < 6) && ctx.monsters) { const m = ctx.monsters.list.find(m => !m.dead && t.inBorder(Math.floor(m.body.x / T), Math.floor(m.body.y / T))); if (m) { this._fight(n, dt, m); return; } }
    const sleeping = hour >= 21 || hour < 6;
    if (sleeping) {
      if (n.state !== 'sleep' && n.state !== 'tobed') {
        n.state = 'tobed';
        if (n.id === 'mortimer' && ctx.rooms && ctx.rooms.has('guardPost') && hour < 24 && hour >= 21) { const gp = ctx.rooms.list.find(r => r.type === 'guardPost'); n.goTo(Math.round(gp.cx), Math.round(gp.cy), gp.L); n.state = 'watch'; return; }
        if (n.bed) n.goTo(n.bed.x, n.bed.y, n.bed.z, { near: 1 }); else n.goTo(t.bx + 1 + (this.list.indexOf(n) % 3), t.by + 2, undefined, { near: 1 });
      }
      if (n.state === 'tobed' && !n.path) { n.state = 'sleep'; if (n.bed) { n.body.x = (n.bed.x + .5) * T; n.body.y = (n.bed.y + .5) * T; } else { n.mood = -1; n.emote('dots'); n.speak('No bed...', 3); } }
      return;
    }
    if (n.state === 'sleep' || n.state === 'tobed' || n.state === 'watch') { n.state = 'idle'; n.mood = n.bed ? 1 : 0; n.pose = 'wave'; n.wait = 1.5; return; }
    n.pose = undefined;
    // helpers build the Pattern from the Town Chest
    const P = t.pattern;
    if (P && !P.done && ['professor', 'wren', 'mortimer'].includes(n.id) && hour >= 8 && hour < 18 && DQ.tuning.get('helperRate') > 0) { if (this._help(n, dt, P)) return; }
    if (hour >= 18 && hour < 20 && ctx.rooms && ctx.rooms.has('messHall')) {
      if (n.state !== 'supper') { n.state = 'supper'; const mh = ctx.rooms.list.find(r => r.type === 'messHall'); const stools = ctx.objects.filter(o => o.id === 'stool' && mh.cells.some(c => c[0] === o.x && c[1] === o.y)); const s = stools[this.list.indexOf(n) % Math.max(1, stools.length)]; if (s) n.goTo(s.x, s.y, s.z, { near: 1 }); else n.goTo(Math.round(mh.cx), Math.round(mh.cy), mh.L); }
      if (!n.path) { n.pose = 'kneel'; if (n.wait < 0) { n.wait = 4; n.emote('note', 1.5); } }
      return;
    }
    if (hour >= 20 && hour < 21) { if (n.state !== 'social') { n.state = 'social'; n.goTo(t.bx + ((this.list.indexOf(n) % 3) - 1) * 2, t.by + 2, undefined, { near: 1 }); } if (!n.path && n.wait < 0) { n.wait = 3 + DQ.rng('npc')() * 3; n.emote(DQ.rng('npc')() < .5 ? 'note' : 'dots', 1.6); n.anim = new E.Attack(DQ.rng('npc')() < .5 ? 'stir' : 'place'); n.anim.start(); } return; }
    // the day: jobs and wandering inside the border
    n.state = n.state === 'talk' ? 'talk' : 'day';
    if (n.state === 'talk') return;
    if (!n.path && n.wait < 0) {
      n.wait = 3 + DQ.rng('npc')() * 5;
      const job = this._jobSpot(n);
      if (job) { n.goTo(job[0], job[1], job[2], { near: 1 }); n.task = job[3]; }
      else { const r = t.radius - 2, x = t.bx + Math.round((DQ.rng('npc')() * 2 - 1) * r), y = t.by + Math.round((DQ.rng('npc')() * 2 - 1) * r); n.goTo(x, y, undefined, { near: 1 }); n.task = null; }
    }
    if (!n.path && n.task) { if (!n.anim && DQ.rng('npc')() < dt * 2) { n.anim = new E.Attack(n.task); n.anim.start(); } }
    if (n.id === 'lintwick' && n.mood > 0 && !n.path) n.state = 'dance';
  }
  _jobSpot(n) {
    const ctx = this.ctx, R = ctx.rooms; if (!R) return null;
    const objIn = (type, oid) => { const r = R.list.find(q => q.type === type); if (!r) return null; const o = ctx.objects.find(q => q.id === oid && r.cells.some(c => c[0] === q.x && c[1] === q.y)); return o ? [o.x, o.y, o.z, null] : [Math.round(r.cx), Math.round(r.cy), r.L, null]; };
    if (n.id === 'marigold') { const s = objIn('kitchen', 'hearthPot'); if (s) return [s[0], s[1], s[2], 'stir']; }
    if (n.id === 'professor') { const s = objIn('workshop', 'bench') || objIn('hall', 'lantern'); if (s && DQ.rng('npc')() < .6) return [s[0], s[1], s[2], 'bash']; }
    if (n.id === 'mortimer') { const s = objIn('guardPost', 'weaponRack'); if (s && DQ.rng('npc')() < .5) return [s[0], s[1], s[2], 'overhead']; }
    if (n.id === 'wren' && DQ.rng('npc')() < .3) { const c = this.townChest(); if (c) return [c.x, c.y, c.z, 'place']; }
    return null;
  }
  _help(n, dt, P) {
    const ctx = this.ctx, chest = this.townChest(); if (!chest) { if (n.wait < 0) { n.wait = 6; n.emote('dots'); n.speak('Need a Town Chest!', 2.5); } return false; }
    const rate = DQ.tuning.get('helperRate'); this.helpT[n.id] = (this.helpT[n.id] || 0) + dt;
    if (!n.helpCell || n.helpCell.ok) {
      const cands = P.cells.filter(c => !c.ok && !c.claimed && !c.clear && (c.block ? DQ.Chest.count(chest, DQ.BLOCKS[c.block].key) > 0 : DQ.Chest.count(chest, Object.keys(DQ.ITEMS).find(k => DQ.ITEMS[k].obj === c.obj)) > 0) && !ctx.world.get(c.x, c.y, c.z));
      if (!cands.length) { const need = Object.keys(P.need)[0]; if (n.wait < 0 && need) { n.wait = 7; n.emote('need'); n.speak('Need ' + (DQ.ITEMS[need] ? DQ.ITEMS[need].name : need) + '!', 2.5); } return false; }
      cands.sort((a, b) => a.z - b.z || Math.hypot(a.x - n.body.x / T, a.y - n.body.y / T) - Math.hypot(b.x - n.body.x / T, b.y - n.body.y / T));
      n.helpCell = cands[0]; n.helpCell.claimed = n.id; n.goTo(n.helpCell.x, n.helpCell.y, undefined, { near: 2 });
    }
    const c = n.helpCell;
    if (this.helpT[n.id] >= 60 / rate && (!n.path || Math.hypot(c.x - n.body.x / T, c.y - n.body.y / T) < 3.5)) {
      this.helpT[n.id] = 0; c.claimed = null; n.helpCell = null;
      const item = c.block ? DQ.BLOCKS[c.block].key : Object.keys(DQ.ITEMS).find(k => DQ.ITEMS[k].obj === c.obj);
      if (ctx.world.get(c.x, c.y, c.z) || ctx.world.objAt(c.x, c.y, c.z)) return true;
      if (ctx.builders.some(b => b.blockedByBody(c.x, c.y, c.z, 1))) return true;
      if (!DQ.Chest.take(chest, item, 1)) return true;
      if (c.block) ctx.world.set(c.x, c.y, c.z, c.block, { by: 'npc', town: true }); else ctx.objects.add({ id: c.obj, x: c.x, y: c.y, z: c.z, facing: c.facing, town: true });
      n.anim = new E.Attack('bash'); n.anim.start(); n.body.facing = Math.atan2((c.y + .5) * T - n.body.y, (c.x + .5) * T - n.body.x);
      ctx.audioX && ctx.audioX.sfxAt('tok', c.x * T, c.y * T); ctx.game.particles.glints((c.x + .5) * T, (c.y + .5) * T, (c.z + 1) * T, 3, '#f1e6c8');
      ctx.events.emit('helperPlaced', { by: n.id, cell: c });
    }
    return true;
  }
  _fight(n, dt, target) {
    const ctx = this.ctx, f = n.def.fight; if (!f || !ctx.monsters) return;
    n.state = 'fight';
    if (f.kind === 'hide') { const hall = ctx.rooms && ctx.rooms.list.find(r => r.type === 'hall' || r.type === 'workshop'); if (hall && !n.path && n.wait < 0) { n.wait = 5; n.goTo(Math.round(hall.cx), Math.round(hall.cy), hall.L); } n.pose = 'crouch'; return; }
    const ms = ctx.monsters.list.filter(m => !m.dead && !m.def.boss), b = n.body;
    let m = target; if (!m) { let bd = 1e9; for (const q of ms) { const d = Math.hypot(q.body.x - b.x, q.body.y - b.y); if (d < bd) { bd = d; m = q; } } }
    if (!m) { if (!n.path && n.wait < 0) { n.wait = 3; n.goTo(ctx.town.bx + 1, ctx.town.by + 3, undefined, { near: 2 }); } return; }
    const d = Math.hypot(m.body.x - b.x, m.body.y - b.y), range = f.range * T;
    b.facing = Math.atan2(m.body.y - b.y, m.body.x - b.x);
    if (d > range) { if (!n.path || n.wait < 0) { n.wait = 1; n.goTo(Math.floor(m.body.x / T), Math.floor(m.body.y / T), undefined, { near: Math.max(1, f.range - 1) }); } return; }
    n.path = null; b.vx = b.vy = 0;
    if (n.cool <= 0) {
      n.cool = f.cool; n.anim = new E.Attack(f.kind === 'club' ? 'overhead' : 'throw'); n.anim.start();
      ctx.audioX && ctx.audioX.sfxAt(f.kind === 'club' ? 'swing' : 'whoosh', b.x, b.y);
      if (f.kind === 'club' || f.kind === 'roll') ctx.combat.hitMonster(m, f.dmg, { src: n.id, kx: Math.cos(b.facing) * 80, ky: Math.sin(b.facing) * 80 });
      else ctx.combat.lob(n, m, f.dmg, f.kind);
    }
  }
  // talk: quests first, then idle lines
  talk(n, builder) {
    const ctx = this.ctx; if (!ctx.talk) return;
    n.body.facing = Math.atan2(builder.body.y - n.body.y, builder.body.x - n.body.x); n.state = 'talk'; n.path = null;
    const done = () => { if (n.state === 'talk') n.state = 'idle'; };
    if (ctx.quests && ctx.quests.talkTo(n.id, builder, done)) return;
    ctx.talk.say(this.idleLine(n), { who: n.id, onDone: done });
    ctx.events.emit('talk', { npc: n.id });
  }
  idleLine(n) {
    const ctx = this.ctx, L = DQ.IDLE[n.id] || [[null, '...']], h = ctx.clock ? ctx.clock.hour : 12, b = ctx.builder;
    const ok = c => !c || (c === 'night' && (h >= 19 || h < 5)) || (c === 'morning' && h >= 5 && h < 10) || (c === 'evening' && h >= 17 && h < 20) || (c === 'hungry' && b && b.belly < 30) || (c === 'lv3' && ctx.town.level >= 3) || (c === 'lv4' && ctx.town.level >= 4) || (c === 'nobed' && !n.bed && ctx.clock && ctx.clock.day > 1) || (c === 'happy' && n.mood > 0) || (c === 'hall' && ctx.town.hallDone) || (ctx.rooms && ['bedroom', 'kitchen', 'guardPost'].includes(c) && ctx.rooms.has(c));
    const pool = L.filter(([c]) => c && ok(c)); const all = pool.length && DQ.rng('talk')() < .7 ? pool : L.filter(([c]) => ok(c));
    n._line = ((n._line || 0) + 1 + Math.floor(DQ.rng('talk')() * 2)) % all.length;
    return [all[n._line][1]];
  }
  serialize() { return this.list.map(n => ({ id: n.id, x: n.body.x, y: n.body.y, z: n.body.z, needs: n.needs, mood: n.mood, follow: !!n.follow })); }
  load(list) { this.list = []; for (const d of list) { const n = this.add(d.id, d.x, d.y, d.z); n.needs = d.needs || n.needs; n.mood = d.mood || 0; if (d.follow && this.ctx.builder) n.follow = this.ctx.builder; } }
  draw(r) { for (const n of this.list) n.draw(r); }
}
DQ.Residents = Residents;
})();
