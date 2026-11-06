// "The Bean Bazaar": the AI Hub shared-world round on a 32x24 Fair Green. Host-authoritative; guests send positions and action requests.
import { THREE, PALETTE, applySky, skyAt } from '../engine.js';
import { Actor } from '../actors/actor.js';
import { Grid } from '../world/collide.js';
import { part, buildTree, buildFlower, buildStall, buildBeanBag } from '../world/scenery.js';
import { groundMat, registerTextures } from '../art/textures.js';
import { W, H } from '../ui/controls.js';
import { textWidth } from '../ui/draw.js';
import { songNamed } from '../audio/composer.js';
import { avatarSpec } from '../actors/player.js';
const SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700']; const SEAT_COL = ['red', 'blue', 'lime', 'sand'];
const AW = 32, AD = 24; const BELL_MS = 300000; const STALL = [16, 12];
const ORDERS = [['pear', 'Dorrit'], ['fish', 'Tavi'], ['flower', 'Yolanda'], ['beans', 'Ozzie'], ['pear', 'Nib']];
const VALUE = { pear: 100, flower: 120, beans: 300, fishS: 200, fishM: 500, fishL: 900, golden: 1800 };
const LABEL = { pear: 'Pear', flower: 'Flower', beans: 'Beans', fishS: 'Sprat', fishM: 'Perch', fishL: 'Pike', golden: 'Golden carp' };
export class Round {
  constructor(g, info) {
    this.g = g; this.info = info; this.AIHub = window.AIHub; this.me = info.me; this.isHost = info.isHost; this.server = !!info.server; this.players = {}; this.t = -3; this.started = false; this.ended = false; this.over = false; this.cardData = { left: 20000, ready: [], asked: false }; this.sendT = 0; this.stT = 0; this.mayor = { x: 3, z: 9, hit: {} }; this.orders = []; this.log = []; this.stats = {}; this.spawnT = 0;
    this.seed = info.seed; this.rng = (l) => this.AIHub.rng(l);
  }
  build() {
    const g = this.g; registerTextures(); const grp = new THREE.Group(); this.group = grp; g.ctx.scene.add(grp); g.town.group.visible = false; g.npcs.group.visible = false; if (g.player) g.player.actor.show(false);
    const ground = new THREE.Mesh(new THREE.BoxGeometry(AW, 0.4, AD), groundMat('lawn1')); ground.position.set(AW / 2, -0.2, AD / 2); const uv = ground.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * AW / 4, uv.getY(i) * AD / 4); grp.add(ground);
    part(grp, 'box', [AW + 2, 0.3, 1], [AW / 2, -0.1, -0.5], 'teal'); part(grp, 'box', [AW + 2, 0.3, 1], [AW / 2, -0.1, AD + 0.5], 'teal');
    // plaza stones, pond and river strip
    part(grp, 'box', [6, 0.05, 6], [STALL[0] + 0.5, 0.02, STALL[1] + 0.5], 'mist'); part(grp, 'box', [9, 0.06, 7], [24.5, 0.03, 4.5], 'sky'); part(grp, 'box', [AW, 0.06, 2], [AW / 2, 0.03, AD - 1], 'blue');
    this.grid = new Grid(AW, AD); const bl = new Uint8Array(AW * AD); for (let x = 0; x < AW; x++) { bl[x] = 0; } const mark = (x0, z0, w, d) => { for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && x < AW && z >= 0 && z < AD) bl[z * AW + x] = 1; }; mark(0, AD - 2, AW, 2); mark(20, 1, 9, 7);
    const stall = buildStall('red'); stall.position.set(STALL[0] + 0.5, 0, STALL[1] - 1); grp.add(stall); mark(STALL[0] - 1, STALL[1] - 2, 3, 2);
    this.res = { trees: [], cracks: [], flowers: [], fish: [], };
    [[5, 4], [9, 4], [5, 8], [9, 8]].forEach(([x, z], i) => { const t = buildTree({ kind: 'pear', stage: 3 }, 0); t.obj.position.set(x + 0.5, 0, z + 0.5); grp.add(t.obj); mark(x, z, 1, 1); this.res.trees.push({ id: i, x: x + 0.5, z: z + 0.5, fruit: 3, cd: 0, mesh: t.obj }); });
    [[4, 15], [8, 17], [13, 18], [26, 14]].forEach(([x, z], i) => { const m = new THREE.Group(); const c = part(m, 'cyl', [0.9, 0.04, 0.9], [0, 0.03, 0], 'orange'); m.position.set(x + 0.5, 0, z + 0.5); grp.add(m); this.res.cracks.push({ id: i, x: x + 0.5, z: z + 0.5, on: true, cd: 0, mesh: m }); });
    for (let i = 0; i < 6; i++) { const x = 10 + (i % 3), z = 13 + Math.floor(i / 3) * 1.2; const f = buildFlower({ sp: i % 4, col: i % 4 }); f.position.set(x + 0.5, 0, z + 0.5); grp.add(f); this.res.flowers.push({ id: i, x: x + 0.5, z: z + 0.5, on: true, cd: 0, mesh: f }); }
    [[21.5, 7.5], [27.5, 7.5], [24.5, 8.2]].forEach(([x, z], i) => { const b = part(grp, 'cyl', [0.5, 0.1, 0.5], [x, 0.06, z], 'ink'); this.res.fish.push({ id: i, x, z, cd: 0, golden: false, mesh: b }); });
    this.mayorMesh = new Actor({ species: 'snail', c: 'lime', a: 'red', name: 'Mayor' }); grp.add(this.mayorMesh.root); this.mayorMesh.play('Slide');
    for (let x = 0; x < AW; x += 3) { const t = buildTree({ kind: x % 2 ? 'pine' : 'oak', stage: 3 }, 0); t.obj.position.set(x + 1.5, 0, -1.5); t.obj.scale.setScalar(1.3); grp.add(t.obj); }
    this.grid.set(bl); applySky(g.engine, skyAt(11)); g.ctx.audio.playMusic(songNamed('round'), 'round'); g.musicName = 'round';
    for (const p of this.info.players) this.addPlayer(p.id, p.name, p.color);
    const spawn = (i) => [STALL[0] - 2 + i * 1.3, STALL[1] + 3];
    this.info.players.forEach((p, i) => { const s = spawn(i); const pl = this.players[p.id]; pl.x = s[0]; pl.z = s[1]; });
  }
  addPlayer(id, name, color) {
    if (this.players[id]) return; const idx = this.info.players.findIndex(p => p.id === id); const col = SEAT_COL[idx % 4] ?? 'red';
    const a = new Actor({ ...avatarSpec({ hair: ['plum', 'ink', 'orange', 'sand'][idx % 4], hairStyle: idx, skin: 'sand', outfit: 'tee_red' }), outfit: col, name }); this.group.add(a.root);
    this.players[id] = { id, name: String(name).slice(0, 14), color, col, actor: a, x: 0, z: 0, yaw: 0, vx: 0, vz: 0, pockets: [], bank: 0, lock: 0, act: '', stats: { fish: 0, pears: 0, sold: 0, apologies: 0 }, tx: null, tz: null, snapT: 0, hist: [] };
  }
  removePlayer(id) { const p = this.players[id]; if (!p) return; this.group.remove(p.actor.root); delete this.players[id]; }
  // --- local input ---
  readLocal(dt) {
    const g = this.g, i = g.ctx.input; const me = this.players[this.me]; if (!me || this.server || this.ended) return; const a = i.moveAxis(); const yaw = (45 * Math.PI) / 180; const f = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, r = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    if (me.lock > 0 || this.t < 0) { me.lock -= dt; return; }
    let dx = a.x * r.x + a.y * f.x, dz = a.x * r.z + a.y * f.z; const mag = Math.min(1, Math.hypot(a.x, a.y)); if (mag > 0.1) { const l = Math.hypot(dx, dz) || 1; const sp = i.isDown('ShiftLeft', 'PadCircle') ? 6 : 4.2; const px = me.x, pz = me.z; const p = { x: me.x, z: me.z }; this.grid.move(p, dx / l * sp * mag * dt, dz / l * sp * mag * dt, 0.3); me.x = Math.max(0.5, Math.min(AW - 0.5, p.x)); me.z = Math.max(0.5, Math.min(AD - 0.5, p.z)); me.yaw = Math.atan2(dx, dz); me.speed = Math.hypot(me.x - px, me.z - pz) / dt; } else me.speed = 0;
    if (g.ctx.input.wasPressed('Enter', 'PadCross', 'KeyE', 'Space') && !this.pressed) this.actionPressed = true;
  }
  // --- host world ---
  nearest(list, p, r) { let b = null, bd = r; for (const o of list) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd) { bd = d; b = o; } } return b; }
  tryAction(pid) {
    const p = this.players[pid]; if (!p || p.lock > 0 || this.t < 0 || this.over) return null; const R = this.res;
    if (Math.hypot(p.x - STALL[0] - 0.5, p.z - STALL[1] - 0.5) < 3.2 && p.pockets.length) return this.sell(p);
    const tr = this.nearest(R.trees.filter(t => t.fruit > 0), p, 1.9); if (tr) { if (p.pockets.length >= 5) return this.full(p); const n = Math.min(tr.fruit, 5 - p.pockets.length); tr.fruit -= n; for (let i = 0; i < n; i++) p.pockets.push('pear'); p.lock = 0.6; this.ev({ e: 'act', id: p.id, a: 'shake', i: tr.id }); p.stats.pears += n; return 'pear'; }
    const cr = this.nearest(R.cracks.filter(c => c.on), p, 1.6); if (cr) { if (p.pockets.length >= 5) return this.full(p); cr.on = false; cr.cd = 14; p.pockets.push('beans'); p.lock = 0.7; this.ev({ e: 'act', id: p.id, a: 'dig', i: cr.id }); return 'beans'; }
    const fl = this.nearest(R.flowers.filter(f => f.on), p, 1.5); if (fl) { if (p.pockets.length >= 5) return this.full(p); fl.on = false; fl.cd = 12; p.pockets.push('flower'); p.lock = 0.4; this.ev({ e: 'act', id: p.id, a: 'pick', i: fl.id }); return 'flower'; }
    const fs = this.nearest(R.fish, p, 2.2); if (fs && !p.fishing) { if (p.pockets.length >= 5) return this.full(p); p.fishing = { t: 2.2 + this.rng('fish')() * 1.5, spot: fs.id }; p.lock = 99; this.ev({ e: 'act', id: p.id, a: 'cast', i: fs.id }); return 'cast'; }
    const my = Math.hypot(p.x - this.mayor.x, p.z - this.mayor.z) < 1.6; if (my && !this.mayor.hit[pid]) { this.mayor.hit[pid] = 1; p.bank += 100; p.stats.apologies++; this.ev({ e: 'bump', id: pid }); return 'mayor'; }
    return null;
  }
  full(p) { this.ev({ e: 'full', id: p.id }); return null; }
  sell(p) { let total = 0; for (const it of p.pockets) { let v = VALUE[it] ?? 100; const oi = this.orders.findIndex(o => o.item === (it.startsWith('fish') || it === 'golden' ? 'fish' : it)); if (oi >= 0) { v *= 2; this.orders.splice(oi, 1); this.ev({ e: 'orderDone', id: p.id }); } total += v; } p.bank += total; p.stats.sold += p.pockets.length; p.pockets = []; p.lock = 0.4; this.ev({ e: 'sell', id: p.id, v: total }); return 'sell'; }
  hostStep(dt) {
    const R = this.res; for (const g of [...R.trees, ...R.cracks, ...R.flowers]) { if (g.cd > 0) { g.cd -= dt; if (g.cd <= 0) { if ('fruit' in g) g.fruit = 3; else g.on = true; } } }
    for (const p of Object.values(this.players)) { if (p.fishing) { p.fishing.t -= dt; if (p.fishing.t <= 0) { const spot = R.fish[p.fishing.spot]; let it = spot.golden ? 'golden' : ['fishS', 'fishM', 'fishL'][Math.min(2, Math.floor(this.rng('catch')() * 3.4))]; if (spot.golden) { spot.golden = false; } p.pockets.push(it); p.stats.fish++; p.fishing = null; p.lock = 0.3; this.ev({ e: 'catch', id: p.id, it }); } } }
    this.mayor.x = Math.min(AW - 2, 3 + this.t * 0.07); const T = this.t; if (!this.golden1 && T > 90) { this.golden1 = true; R.fish[1].golden = true; this.ev({ e: 'golden', k: 'fish' }); } if (!this.golden2 && T > 180) { this.golden2 = true; R.trees[0].fruit = 3; R.trees.forEach(t => t.fruit = 3); this.ev({ e: 'golden', k: 'tree' }); }
    this.orderT = (this.orderT ?? 25) - dt; if (this.orderT <= 0 && this.orders.length < 3) { this.orderT = 38; const o = ORDERS[Math.floor(this.rng('orders')() * ORDERS.length)]; this.orders.push({ item: o[0], who: o[1] }); this.ev({ e: 'order', o }); }
  }
  ev(e) { this.applyEv(e); if (this.isHost) this.AIHub.send({ t: 'ev', ...e }); }
  applyEv(e) {
    const g = this.g; const p = this.players[e.id]; const c = e.id === this.me;
    if (e.e === 'act' && p) { p.anim = { shake: 'ShakeTree', dig: 'Dig', pick: 'PickUp', cast: 'Cast' }[e.a]; p.animT = e.a === 'cast' ? 2.4 : 0.6; if (c) g.sfx(e.a === 'dig' ? 'dig' : e.a === 'shake' ? 'shake' : e.a === 'cast' ? 'cast' : 'pick'); }
    if (e.e === 'sell') { this.flash(`${p?.name}: +${e.v}`); if (c) g.sfx('cash'); } if (e.e === 'catch' && c) { g.sfx('reveal'); this.flash(`You caught ${LABEL[e.it]}!`); } if (e.e === 'golden') { g.sfx('bell'); this.flash(e.k === 'fish' ? 'A bell rings: a golden carp at the pond!' : 'A bell rings: every tree is heavy with pears!'); } if (e.e === 'bump') { this.flash(`${p?.name} apologised to the Mayor (+100)`); g.sfx('stomp'); } if (e.e === 'full' && c) this.flash('Pockets full. Sell at the stall.'); if (e.e === 'order') { this.flash(`${e.o[1]} wants a ${e.o[0]}: double beans!`); } if (e.e === 'orderDone') { if (c) g.sfx('coin'); }
  }
  flash(t) { this.msg = { t, life: 3 }; }
  // --- messages ---
  attach() {
    const H = this.AIHub; const g = this.g;
    H.on('card', (c) => { this.cardData = c; }); H.on('start', () => { this.started = true; });
    H.on('message', (d, from) => this.onMessage(d, from));
    H.on('leave', ({ id }) => { this.removePlayer(id); });
    H.on('time-up', () => { if (this.isHost) this.finish(); });
    H.on('end', () => { this.ended = true; this.over = true; g.ctx.audio.stopMusic(); g.ctx.audio.stopLoops(); });
    if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => { if (!this.started && this.AIHub.time() < 0 && (e.key === 'Enter')) H.answer('ready'); if (e.key === 'm' || e.key === 'M') { if (!this.started) H.answer('more'); } });
  }
  onMessage(d, from) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'me' && this.isHost) { const p = this.players[from]; if (p) { p.x = +d.x; p.z = +d.z; p.yaw = +d.f; p.speed = +d.s; } }
    else if (d.t === 'do' && this.isHost) { const r = this.tryAction(from); }
    else if (d.t === 'snap' && !this.isHost) { for (const a of d.p) { const p = this.players[a[0]]; if (!p) continue; if (a[0] === this.me) continue; p.hist.push([performance.now(), a[1], a[2], a[3], a[4]]); if (p.hist.length > 6) p.hist.shift(); } this.mayor.x = d.m; this.t = Math.max(this.t, d.t - 0.2); }
    else if (d.t === 'st' && !this.isHost) { d.tr.forEach((v, i) => this.res.trees[i].fruit = v); d.cr.forEach((v, i) => this.res.cracks[i].on = !!v); d.fl.forEach((v, i) => this.res.flowers[i].on = !!v); this.res.fish.forEach((f, i) => f.golden = d.go === i); this.orders = d.or.map(o => ({ item: o[0], who: o[1] })); for (const s of d.sc) { const p = this.players[s[0]]; if (p) { p.bank = s[1]; p.pockets = s[2]; } } }
    else if (d.t === 'ev' && !this.isHost) { this.applyEv(d); }
  }
  sendTick(dt) {
    this.sendT += dt; this.stT += dt; const H = this.AIHub;
    if (this.sendT >= 0.1) { this.sendT = 0; if (this.isHost) H.send({ t: 'snap', t: this.t, p: Object.values(this.players).map(p => [p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), p.speed ? 1 : 0]), m: +this.mayor.x.toFixed(2) }, { reliable: false }); else if (!this.server) { const me = this.players[this.me]; if (me) H.send({ t: 'me', x: +me.x.toFixed(2), z: +me.z.toFixed(2), f: +me.yaw.toFixed(2), s: me.speed ? 1 : 0 }, { reliable: false, to: this.info.host }); } }
    if (this.isHost && this.stT >= 1) { this.stT = 0; const R = this.res; H.send({ t: 'st', tr: R.trees.map(t => t.fruit), cr: R.cracks.map(c => c.on ? 1 : 0), fl: R.flowers.map(f => f.on ? 1 : 0), go: R.fish.findIndex(f => f.golden), or: this.orders.map(o => [o.item, o.who]), sc: Object.values(this.players).map(p => [p.id, p.bank, p.pockets]) }); }
  }
  finish() {
    if (this.over) return; this.over = true; const ids = Object.keys(this.players).map(Number).filter(id => this.info.players.some(p => p.id === id) && (this.AIHub.players.some(q => q.id === id)));
    const score = (p) => p.bank + Math.floor(p.pockets.reduce((a, it) => a + (VALUE[it] ?? 100), 0) / 2); const rows = ids.map(id => ({ id, s: score(this.players[id]) })).sort((a, b) => b.s - a.s); const standings = []; for (const r of rows) { const last = standings[standings.length - 1]; if (last && score(this.players[last[0]]) === r.s) last.push(r.id); else standings.push([r.id]); }
    const scores = {}; const stats = {}; for (const r of rows) { scores[r.id] = r.s; const st = this.players[r.id].stats; stats[r.id] = { Fish: st.fish, Pears: st.pears, Sold: st.sold }; }
    const awards = []; if (rows.length) { const top = (k, title, detail) => { const b = rows.slice().sort((a, c) => this.players[c.id].stats[k] - this.players[a.id].stats[k])[0]; if (b && this.players[b.id].stats[k] > 0) awards.push({ id: b.id, title, detail: detail(this.players[b.id].stats[k]) }); }; top('fish', 'Most Fish Apologised To', (n) => `${n} fish, each with a heartfelt note`); top('pears', 'Shakiest Hands', (n) => `${n} pears relocated`); top('apologies', 'Mayor Whisperer', () => 'One respectful bump'); }
    this.AIHub.finish({ standings, scores, stats, awards });
  }
  update(dt) {
    const g = this.g; if (!this.started && this.AIHub.time() > -Infinity) this.started = true; const now = this.AIHub.time(); if (now !== -Infinity) this.t = Math.max(this.t, now / 1000); if (this.isHost && this.t >= 0) { /* host owns the clock */ }
    this.readLocal(dt); if (this.actionPressed && !this.ended) { this.actionPressed = false; if (this.isHost) this.tryAction(this.me); else this.AIHub.send({ t: 'do' }, { to: this.info.host }); }
    if (this.isHost && this.t >= 0 && !this.over) { this.hostStep(dt); const limit = Math.min(BELL_MS, (this.info.limitMs || BELL_MS) - 5000) / 1000; if (this.t >= limit) this.finish(); }
    if (!this.ended) this.sendTick(dt);
    // pockets of the local player render; remote interpolation 120 ms behind
    const nowMs = performance.now();
    for (const p of Object.values(this.players)) {
      if (p.id !== this.me && p.hist.length) { const tt = nowMs - 120; let a = p.hist[0], b = p.hist[p.hist.length - 1]; for (let i = 0; i < p.hist.length - 1; i++) if (p.hist[i][0] <= tt && p.hist[i + 1][0] >= tt) { a = p.hist[i]; b = p.hist[i + 1]; } const u = b[0] === a[0] ? 1 : Math.max(0, Math.min(1, (tt - a[0]) / (b[0] - a[0]))); const nx = a[1] + (b[1] - a[1]) * u, nz = a[2] + (b[2] - a[2]) * u; if (Math.hypot(nx - p.x, nz - p.z) > 3) { p.x = nx; p.z = nz; } else { p.x += (nx - p.x) * 0.5; p.z += (nz - p.z) * 0.5; } p.yaw = b[3]; p.speed = b[4] ? 3 : 0; }
      if (p.animT > 0) { p.animT -= dt; p.actor.play(p.anim ?? 'Idle', { once: true }); } else { p.anim = null; p.actor.locomote(p.speed || 0, 'jog'); }
      if (this.isHost && p.id !== this.me) { /* host positions come from messages */ }
      p.actor.setPos(p.x, p.z); p.actor.yaw = p.yaw; p.actor.update(dt, g.t);
    }
    this.mayorMesh.setPos(this.mayor.x, this.mayor.z); this.mayorMesh.yaw = Math.PI / 2; this.mayorMesh.update(dt, g.t);
    for (const t of this.res.trees) { if (t.shown !== t.fruit) { t.shown = t.fruit; const pos = t.mesh.position.clone(); this.group.remove(t.mesh); t.mesh = buildTree({ kind: 'pear', stage: 3, fruit: t.fruit }, 0).obj; t.mesh.position.copy(pos); this.group.add(t.mesh); } } for (const c of this.res.cracks) c.mesh.visible = c.on; for (const f of this.res.flowers) f.mesh.visible = f.on; for (const f of this.res.fish) { f.mesh.scale.setScalar(f.golden ? 1.8 + Math.sin(g.t * 6) * 0.2 : 1); }
    if (this.msg) { this.msg.life -= dt; if (this.msg.life <= 0) this.msg = null; }
    const me = this.players[this.me]; const tgt = me && !this.server ? [me.x, me.z] : [AW / 2, AD / 2]; g.target.lerp(new THREE.Vector3(tgt[0], 0.8, tgt[1]), Math.min(1, dt * 5)); if (this.server) { g.zoomOverride = 1.0; }
    if (this.msg == null && this.t > 0 && this.t < 3) { }
  }
  draw(d) {
    const g = this.g; const H_ = this.AIHub; const now = H_.time();
    if (!this.started || now < 0 && this.t < -0.1) { this.drawCard(d); return; }
    const left = Math.max(0, Math.min(BELL_MS, (this.info.limitMs || BELL_MS) - 5000) / 1000 - Math.max(0, this.t)); d.rect(160, 8, 160, 14, 'night'); d.text(240, 11, `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, 'sand', { align: 'center' });
    Object.values(this.players).forEach((p, i) => { const x = 12 + i * 112; d.rect(x, 26, 108, 22, 'night'); d.rect(x, 26, 4, 22, p.col); d.text(x + 8, 29, p.name, 'white'); d.text(x + 8, 38, `${p.bank}  (${p.pockets.length}/5)`, 'sand'); });
    const me = this.players[this.me]; if (me && !this.server) { me.pockets.forEach((it, i) => { d.rect(12 + i * 20, H - 28, 18, 18, 'night'); d.rect(14 + i * 20, H - 26, 14, 14, it === 'pear' || it === 'flower' ? 'lime' : it === 'beans' ? 'sand' : it === 'golden' ? 'orange' : 'sky'); }); d.text(12, H - 40, 'Pockets', 'white'); }
    this.orders.forEach((o, i) => { d.rect(W - 142, 28 + i * 14, 130, 13, 'night'); d.text(W - 138, 31 + i * 14, `${o.who}: ${o.item}  x2`, 'sky'); });
    if (this.msg) { d.rect(100, H - 60, 280, 14, 'night'); d.text(240, H - 57, this.msg.t, 'white', { align: 'center' }); }
    if (now < 0) { const n = Math.ceil(-now / 1000); d.hud.text(W / 2, 90, n > 0 ? String(n) : 'GO', { anchor: 'top', scale: 5, color: 'sand', shadow: 'ink' }); }
    if (this.ended) { d.rect(120, 110, 240, 30, 'night'); d.text(240, 120, 'The bell has rung', 'sand', { align: 'center' }); }
    if (me && !this.server) { const ui = g.ui; const label = Math.hypot(me.x - STALL[0] - 0.5, me.z - STALL[1] - 0.5) < 3.2 && me.pockets.length ? 'Sell at the stall' : 'Do the thing'; ui.prompt('confirm', label); ui.drawPrompts?.(); }
  }
  drawCard(d) {
    const g = this.g, H_ = this.AIHub; d.rect(0, 0, W, H, 'night'); d.hud.text(W / 2, 14, 'THE BEAN BAZAAR', { anchor: 'top', scale: 3, color: 'sand', shadow: 'navy' }); d.text(W / 2, 48, 'Creditor Creek: a five-minute fair', 'white', { align: 'center' });
    this.info.players.forEach((p, i) => { const x = 60 + i * 96, y = 100; d.rect(x, y, 84, 52, 'plum'); d.rect(x, y, 84, 4, SEAT_COL[i]); d.text(x + 42, y + 12, String(p.name).slice(0, 12), 'white', { align: 'center' }); d.text(x + 42, y + 30, (this.cardData.ready ?? []).includes(p.id) ? 'READY' : '...', (this.cardData.ready ?? []).includes(p.id) ? 'lime' : 'mist', { align: 'center' }); });
    d.para(60, 66, 'How to win: bank the most beans before the last bell. Unbanked value counts half.', 360, 'white'); d.para(60, 164, 'Controls: stick or WASD to move. Cross or E to do the thing: shake, dig, pick, fish, sell at the stall. Hold Circle or Shift to run.', 360, 'sky');
    const left = this.cardData.left == null ? '...' : Math.ceil(this.cardData.left / 1000) + 's'; d.text(W / 2, 214, `Ready: Enter or Cross.  More time: Triangle or M.   Starts in ${left}`, 'sand', { align: 'center' });
    d.text(W / 2, 230, this.cardData.asked ? 'You asked for more time.' : '', 'lime', { align: 'center' });
  }
}
/** Pad / pointer answers on the card (called each frame by the game). */
export function cardInput(round, g) {
  const i = g.ctx.input; const H = round.AIHub; if (round.started && H.time() >= -3000) return;
  if (i.wasPressed('PadCross') || i.wasPressed('MouseLeft')) H.answer('ready'); if (i.wasPressed('PadTriangle')) H.answer('more');
}
