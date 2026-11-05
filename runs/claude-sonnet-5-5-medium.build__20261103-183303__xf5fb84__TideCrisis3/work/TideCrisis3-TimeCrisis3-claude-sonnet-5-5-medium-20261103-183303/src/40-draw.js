// 40-draw.js — presentation of a Sim: world, actors (engine rigs as billboards), bosses, projectiles, particles,
// threat rings. Reads sim.* only (plain data). Owns: rigs, particles, camera juice.
const Pres = {
  rigs: new Map(), parts: [], tracers: [], lights: [], rings: [], popups: [], trauma: 0, flashT: 0, scratch: null, prevPos: new Map(), decals: [], shakeKick: 0, zaps: [],
  reset() { this.rigs.clear(); this.parts.length = 0; this.tracers.length = 0; this.lights.length = 0; this.popups.length = 0; this.prevPos.clear(); this.decals.length = 0; this.zaps.length = 0; this.trauma = 0; },
  rig(e) {
    let r = this.rigs.get(e.id); if (r) return r;
    const d = reg('enemy', e.type), look = d && d.look; if (!look) return null;
    const o = Object.assign({}, look); o.colors = Object.assign({ skin: e.skin }, look.colors || {}); r = new E.Humanoid(o); this.rigs.set(e.id, r); return r;
  },
  mkRig(key, opts) { let r = this.rigs.get(key); if (!r) { r = new E.Humanoid(opts); this.rigs.set(key, r); } return r; }
};
const ViewCache = {}; const viewFor = (k, pitch) => { const q = Math.max(1 / 8, Math.round(k * 16) / 16), key = q + ':' + pitch; return ViewCache[key] || (ViewCache[key] = new E.View('fp', 'First person', 0, pitch, q, 1)); };
function addParts(n, fn) { for (let i = 0; i < n; i++) Pres.parts.push(fn(i)); }
const prand = (a, b) => a + (b - a) * cosmetic();
// ---- turn sim events into effects ----
function consumeEvents(sim, ctx) {
  for (const ev of sim.events) {
    switch (ev.type) {
      case 'impact': { const mat = ev.mat; const col = mat === 'steel' || mat === 'metal' ? '#ffe9a8' : mat === 'crate' || mat === 'planks' || mat === 'timber' ? '#c89a5a' : mat === 'ground' ? '#9a8f80' : '#cfcfcf'; addParts(ev.spark ? 8 : 5, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-30, 30) - 40, vy: prand(-40, 40), vz: prand(10, 70), life: prand(.2, .5), col, sz: 1, g: 240, add: !!ev.spark })); Pres.decals.push({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], life: 8 }); if (Pres.decals.length > 60) Pres.decals.shift(); break; }
      case 'hit': addParts(5, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-30, 30), vy: prand(-30, 30), vz: prand(0, 50), life: .3, col: '#ff4a3a', sz: 1, g: 200 })); break;
      case 'kill': Pres.popups.push({ t: 0, pos: ev.pos, text: '+' + ev.score, col: '#ffe48a' }); break;
      case 'explode': { const r = ev.r; addParts(ev.big ? 40 : 22, () => { const a = cosmetic() * TAU, s = prand(20, r * 3); return { x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: Math.cos(a) * s * .6, vy: Math.sin(a) * s, vz: prand(10, s * .8), life: prand(.3, .9), col: cosmetic() < .5 ? '#ffb040' : '#ff6a2a', sz: ev.big ? 3 : 2, g: 100, add: true }; }); addParts(14, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-30, 30), vy: prand(-30, 30), vz: prand(10, 50), life: prand(.8, 1.6), col: '#3a3438', sz: 3, g: -15, smoke: 1 })); Pres.lights.push({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2] + 10, r: r * 3, k: 1.2, life: .35, col: '#ffb060' }); Pres.trauma = Math.min(1, Pres.trauma + (ev.big ? .55 : .25)); break; }
      case 'break': addParts(10, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-50, 50), vy: prand(-50, 50), vz: prand(20, 80), life: prand(.5, 1), col: ev.mat === 'glass' ? '#cfe8ff' : '#9a6a38', sz: 2, g: 260 })); break;
      case 'eshot': { const m = ev.from; Pres.lights.push({ x: m[0], y: m[1], z: m[2], r: 60, k: .8, life: .08, col: '#ffe9a8' }); addParts(3, () => ({ x: m[0], y: m[1], z: m[2], vx: prand(-20, 20) - 30, vy: prand(-20, 20), vz: prand(-10, 20), life: .1, col: '#fff2b0', sz: 2, g: 0, add: true })); break; }
      case 'emiss': Pres.tracers.push({ a: ev.from, b: ev.to, life: .12, col: '#ffe9a8' }); break;
      case 'threat': { const e = sim.enemies.find(x => x.id === ev.src); Pres.rings.push({ id: ev.id, src: ev.src, tgt: ev.tgt, t0: sim.t, tel: ev.tel, sp: ev.sp, kind: ev.kind }); break; }
      case 'shot': { const p = sim.players[ev.p]; if (p && ctx && ctx.local && ctx.local.includes(ev.p)) Pres.shakeKick = .1; Pres.lights.push({ x: sim.pose(ev.p).x + 10, y: sim.pose(ev.p).y, z: sim.pose(ev.p).z, r: 70, k: .5, life: .05, col: '#ffe9a8' }); break; }
      case 'hurt': Pres.trauma = Math.min(1, Pres.trauma + .6); break;
      case 'smoke': ctx.smoke = ev.dur; break;
      case 'bigboom': Pres.trauma = 1; break;
    }
  }
}
function stepPres(dt, sim) {
  const P = Pres; P.trauma = Math.max(0, P.trauma - dt * 1.6); P.shakeKick = Math.max(0, P.shakeKick - dt);
  for (const p of P.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= (p.g || 0) * dt; if (p.z < 0 && !p.smoke) { p.z = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } }
  P.parts = P.parts.filter(p => p.life > 0); if (P.parts.length > 900) P.parts.splice(0, P.parts.length - 900);
  for (const t of P.tracers) t.life -= dt; P.tracers = P.tracers.filter(t => t.life > 0);
  for (const l of P.lights) l.life -= dt; P.lights = P.lights.filter(l => l.life > 0);
  for (const d of P.decals) d.life -= dt; P.decals = P.decals.filter(d => d.life > 0);
  for (const q of P.popups) q.t += dt; P.popups = P.popups.filter(q => q.t < 1.1);
  P.rings = P.rings.filter(r => sim.threats.some(t => t.id === r.id) || sim.t - r.t0 < r.tel + .02);
  // actor rigs
  for (const e of sim.enemies) { const rig = P.rig(e); if (!rig) continue; updateRig(rig, e, dt, sim); }
  if (sim.boss) updateBossRigs(sim, dt);
  if (P.rigs.size > 80) { const live = new Set(sim.enemies.map(e => e.id)); for (const k of P.rigs.keys()) if (typeof k === 'number' && !live.has(k)) P.rigs.delete(k); }
}
function updateRig(rig, e, dt, sim) {
  const prev = Pres.prevPos.get(e.id) || [e.x, e.y, e.foot]; const vx = (e.x - prev[0]) / Math.max(dt, 1e-4), vy = (e.y - prev[1]) / Math.max(dt, 1e-4); Pres.prevPos.set(e.id, [e.x, e.y, e.foot]);
  const st = { x: e.x, y: e.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, hurt: e.hurtT > 0 };
  if (e.dead && e.falling) { st.air = true; st.expr = 'wince'; }
  else if (e.dead) { st.pose = e.dt < .9 ? 'die' : 'down'; if (e.dt > .9) st.down = 1; if (e.deathStyle === 'flyback' && e.dt < .5) st.flip = Math.sin(clamp(e.dt / .5, 0, 1) * Math.PI) * .6; st.expr = 'wince'; }
  else {
    switch (e.anim) {
      case 'crouch': st.pose = 'crouch'; break;
      case 'point': st.point = true; st.aim = -.02; break;
      case 'run': st.run = 1; st.vy = 40; st.point = e.st === 'entry' ? false : false; break;
      case 'walk': st.vy = 14; st.point = true; break;
      case 'air': st.air = true; break;
      case 'land': st.land = .9; break;
      case 'roll': st.flip = (e.ent ? e.ent.t / e.ent.dur : 0); break;
      case 'climb': st.climb = true; st.vz = -20; break;
      case 'windup': st.attack = E.move('overhead', .3); break;
      case 'slash': st.attack = E.move('slash', clamp(e.t / .3, 0, 1)); break;
      case 'panic': st.run = 1; st.vy = 30; st.pose = 'cheer'; break;
    }
    if (e.stagger > 0) st.lean = .3; if (e.type === 'civilian' || e.type === 'hostage') st.expr = 'shout';
    if (e.st === 'aim' || e.st === 'fire') st.expr = 'angry';
    if (e.type === 'hostage') { st.pose = 'guard'; }
  }
  rig.update(dt, st);
}
// actor billboard: rig -> scratch canvas -> tinted by fog and flash -> game buffer
function drawActor(g, rig, sx, sy, k, o = {}) {
  if (k < .25) return;
  const S = Pres.scratch || (Pres.scratch = E.mkCanvas(220, 220)); const sg = E.ctx2d(S);
  sg.clearRect(0, 0, 220, 220); E.px.reset(sg); const v = viewFor(k * (o.size || 1), 8);
  rig.draw(sg, 110, 190, v); E.px.reset(sg);
  sg.globalCompositeOperation = 'source-atop';
  if (o.fog > 0) { sg.globalAlpha = o.fog * .7; sg.fillStyle = o.fogCol; sg.fillRect(0, 0, 220, 220); }
  sg.globalAlpha = .22; sg.fillStyle = o.tint || '#0a1430'; sg.fillRect(0, 0, 220, 220);
  if (o.flash) { sg.globalAlpha = .75; sg.fillStyle = '#ffffff'; sg.fillRect(0, 0, 220, 220); }
  sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over';
  g.drawImage(S, Math.round(sx - 110), Math.round(sy - 190)); E.px.reset(g);
}
// ---- boss geometry ----
function bossBoxes(sim, B) {
  const out = [], P = B.pos, id = B.id, bx = (cx, cy, dx, dy, h, mat, z0, o) => out.push(Object.assign({ x0: cx - dx / 2, x1: cx + dx / 2, y0: cy - dy / 2, y1: cy + dy / 2, z0, z1: z0 + h, mat }, o));
  if (id === 'stingray') {
    for (const k of ['turretL', 'turretR']) { const p = B.parts[k]; if (!p.dead) { bx(p.pos[0], p.pos[1], 16, 16, 10, p.flash > 0 ? 'white' : 'steel', 18); bx(p.pos[0] - 14, p.pos[1], 20, 4, 4, 'black', 25); } else bx(p.pos[0], p.pos[1], 14, 14, 3, 'rust', 12); }
    
    
  } else if (id === 'bulldog') {
    const x = P[0], y = P[1];
    bx(x + 10, y, 80, 40, 20, 'steel', 6, { solid: 0 }); bx(x - 22, y, 24, 40, 18, 'hull_w', 8); bx(x + 8, y - 4, 40, 40, 28, 'corr_ochre', 26);
    bx(x - 28, y, 8, 30, 10, 'glass', 22, { glow: 1, edge: false }); for (const sy of [-14, 14]) for (const sx of [-24, 22]) bx(x + sx, y + sy * 1.4, 14, 6, 14, 'black', 0, { edge: false });
    const f = B.parts.fuel, g_ = B.parts.gunner; if (!f.dead) bx(x + 22, y - 6, 18, 26, 26, f.flash > 0 ? 'white' : 'barrel', 6);
    if (!g_.dead) { bx(x, y + 10, 12, 12, 10, g_.flash > 0 ? 'white' : 'black', 38); bx(x - 12, y + 10, 16, 3, 3, 'steel', 44, { edge: false }); }
  } else if (id === 'scylla') {
    const x = P[0], y = P[1], top = B.toppled ? -26 : 0;
    bx(x + 6, y, 70, 110, 24, B.toppled ? 'rust' : 'steel', 40 + top); bx(x - 4, y, 40, 56, 26, 'hull', 62 + top); bx(x - 18, y, 8, 30, 14, 'glass', 64 + top, { glow: 1, edge: false });
    const cp = B.parts.cockpit; if (cp.vulnerable) bx(x - 22, y, 6, 22, 14, cp.flash > 0 ? 'white' : 'neon_y', 66 + top, { glow: 1, edge: false });
    for (let i = 0; i < 6; i++) { const kp = B.parts['knee' + i], ky = y + (i - 2.5) * 30, kx = x + (i % 2) * 14; if (!kp.dead) { bx(kx, ky, 8, 8, 30 + top * .5, 'steel', 12 + top * .5); bx(kx, ky, 12, 12, 12, kp.flash > 0 ? 'white' : 'neon_y', 24 + top * .5, { glow: 1, edge: false }); bx(kx - 6, ky, 6, 6, 14, 'rust', 0); } else { bx(kx, ky, 8, 8, 12, 'rust', 0); } }
    for (const sy of [-1, 1]) { bx(x - 24, y + sy * 52, 22, 20, 18, 'rust', 44 + top); bx(x - 40, y + sy * 52, 18, 6, 6, 'black', 52 + top); bx(x + 6, y + sy * 36, 14, 18, 10, 'steel', 66 + top); }
  } else if (id === 'seawolf') {
    const x = P[0], y = P[1], z = P[2], f = B.parts.body;
    bx(x, y, 40, 18, 16, f && f.flash > 0 ? 'white' : 'black', z - 8); bx(x + 36, y, 36, 6, 6, 'black', z); bx(x + 52, y, 4, 4, 14, 'steel', z - 2); bx(x - 8, y, 14, 14, 8, 'glass', z, { glow: 1, edge: false });
    bx(x, y, 6, 6, 10, 'steel', z + 8); bx(x, y, 10, 90, 2, 'steel', z + 18, { edge: false }); bx(x, y, 90, 10, 2, 'steel', z + 18 + Math.sin(B.t * 40) * .1, { edge: false });
    for (const k of ['podL', 'podR']) { const p = B.parts[k]; if (p && !p.dead) bx(x, y + (k === 'podL' ? -34 : 34), 14, 10, 8, p.flash > 0 ? 'white' : 'steel', z - 14); }
  }
  return out;
}
function updateBossRigs(sim, dt) {
  const B = sim.boss, id = B.id;
  if (id === 'stingray' && B.parts.barracuda && !B.parts.barracuda.hidden) { const rig = Pres.mkRig('barracuda', { build: 'heroic', size: 1.05, outfit: 'coat', hair: 'ponytail', weapon: 'sword', colors: { cloth: '#1d7a8a', coat: '#1d7a8a', hair: '#f4f4f4', pants: '#154a5a', plate: '#5a7a80' }, armor: true }); const p = B.parts.barracuda; rig.update(dt, { x: p.pos[0], y: p.pos[1], z: 0, facing: Math.PI / 2, point: B.phase === 2 && p.vulnerable, pose: B.phase === 2 && !p.vulnerable ? 'crouch' : (B.anim.stagger ? 'kneel' : undefined), attack: B.anim.slash ? E.move('slash', .5) : undefined, expr: 'angry' }); }
  if (id === 'hammerhead') { const rig = Pres.mkRig('hammerhead', { build: 'bulky', size: 1.6, outfit: 'coat', hat: 'helmet', armor: true, weapon: 'gun', colors: { cloth: '#4a4a56', coat: '#4a4a56', plate: '#7a828e', metal: '#9aa0aa', pants: '#2a2a30' } }); const m = B.anim.mode; rig.update(dt, { x: B.pos[0], y: B.pos[1], z: B.pos[2], vx: 0, facing: Math.PI / 2, point: m === 'sweep' || m === 'plant', run: m === 'charge' ? 1 : 0, vy: m === 'charge' ? 50 : m === 'walk' ? 10 : 0, pose: m === 'stagger' ? 'kneel' : undefined, attack: m === 'slam' ? E.move('overhead', .5) : undefined, expr: 'angry' }); }
  if (id === 'krake') { const rig = Pres.mkRig('krake', { build: 'heroic', size: 1.15, outfit: 'coat', hair: 'long', hat: { style: 'cap', color: '#1d2a4a' }, cape: { len: 8, width: 6, seg: 3 }, weapon: 'sword', colors: { cloth: '#1d2a4a', coat: '#1d2a4a', trim: '#d4af37', hair: '#f0f0f0', cape: '#1d2a4a', capeIn: '#8a1e2a', pants: '#10182a' } }); const m = B.anim.mode; rig.update(dt, { x: B.pos[0], y: B.pos[1], z: B.pos[2], facing: Math.PI / 2, point: m === 'idle' || m === 'lunge', flip: m === 'roll' ? (B.t * 2 % 1) : 0, expr: 'angry', pose: B.final ? 'cheer' : undefined }); }
}
// ---- the world draw ----
function drawWorld(g, sim, pid, W, H, t, opts = {}) {
  const sc = sim.scene; if (!sc) return;
  const pose = Object.assign({}, opts.pose || sim.pose(pid)); const tr = Pres.trauma * Pres.trauma * (E.current && E.current.settings && E.current.settings.shake === false ? 0 : 1);
  pose.yaw += Math.sin(t * 31) * tr * .035 + (opts.noise || 0); pose.pitch += Math.sin(t * 27 + 2) * tr * .03 + Pres.shakeKick * .12; pose.roll = (pose.roll || 0) + Math.sin(t * 23) * tr * .03;
  if (sim.players[pid] && sim.players[pid].hurt > 0) pose.roll += sim.players[pid].hurt * .08 * Math.sin(t * 50);
  R3.setCam(pose, W, H);
  const env = Object.assign({}, sc.envData); env.lights = (sc.lights || []).concat(Pres.lights);
  if (sim.boss && sim.boss.smoke > 0) { env.fog = [env.fog[0], 60, 420]; }
  // lightning (storm)
  let flash = 0; if (env.storm) { const ph = (t % 11); if (ph < .18 || (ph > .3 && ph < .38)) flash = .6; if (flash) { env.sky = [R3.mix(env.sky[0], '#ffffff', flash * .6), R3.mix(env.sky[1], '#ffffff', flash * .6), R3.mix(env.sky[2], '#ffffff', flash * .6)]; env.ambient = (env.ambient || .5) + .3; } }
  const hy = R3.drawSky(g, env, t, W, H); R3.drawSea(g, env, t, W, H, hy);
  // gather
  if (!sc._tess) { sc._tess = []; for (const b of sc.boxes) for (const q of (b.floor ? [b] : R3.tess(b))) sc._tess.push(q); }
  const list = []; const C = R3.cam, rail = sim.rail * (sc.lift ? 0 : 1);
  for (const b of sc._tess) { const cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2, czm = (b.z0 + b.z1) / 2; const k = b.floor ? 1e12 - Math.hypot(cxm - C.x, cym - C.y) * 1e6 : R3.sortKey(cxm, cym, czm); list.push({ k, b }); }
  for (let i = 0; i < sim.players.length; i++) { const cb = sim.coverBox(i); list.push({ k: R3.sortKey((cb.x0 + cb.x1) / 2, (cb.y0 + cb.y1) / 2, cb.z1 / 2) - 2000 * 0, b: cb, own: i }); }
  for (const o of sim.objs) { if (o.dead) continue; const mat = o.kind === 'barrel' || o.kind === 'tank' ? o.mat : o.mat; const bb = { x0: o.x - o.rx, x1: o.x + o.rx, y0: o.y - o.ry, y1: o.y + o.ry, z0: o.z, z1: o.z + o.h, mat: o.flash > 0 ? 'white' : mat, glow: o.kind === 'lantern' || o.kind === 'bottle' || o.kind === 'intel' || o.kind === 'lock' ? 1 : 0, edge: o.kind !== 'bottle' }; if (o.kind === 'lifering') { bb.mat = Math.floor(t * 3) % 2 ? 'white' : 'barrel'; bb.glow = 1; } list.push({ k: R3.sortKey(o.x, o.y, o.z), b: bb }); }
  for (const e of sim.enemies) { if (e.gone && e.dt > 3) continue; list.push({ k: R3.sortKey(e.x, e.y, e.foot + 8), e }); }
  if (sim.boss) { for (const q of bossBoxes(sim, sim.boss)) list.push({ k: R3.sortKey((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2), b: q }); const B = sim.boss; const rg = B.id === 'stingray' ? 'barracuda' : B.id; if (Pres.rigs.has(rg) && ((B.id === 'stingray' && !B.parts.barracuda.hidden && !B.parts.barracuda.dead) || B.id === 'hammerhead' || B.id === 'krake')) list.push({ k: R3.sortKey(B.id === 'stingray' ? B.parts.barracuda.pos[0] : B.pos[0], B.id === 'stingray' ? B.parts.barracuda.pos[1] : B.pos[1], 10), boss: rg }); }
  for (const pr of sim.proj) if (!pr.dead) list.push({ k: R3.sortKey(pr.x, pr.y, pr.z), pr });
  for (const p of Pres.parts) list.push({ k: R3.sortKey(p.x, p.y, p.z) - 1, part: p });
  list.sort((a, b) => b.k - a.k);
  const fogC = env.fog[0], fogN = env.fog[1], fogF = env.fog[2];
  for (const it of list) {
    if (it.b) { R3.drawBox(g, env, it.b, t); }
    else if (it.e) drawEnemy(g, sim, it.e, env, t);
    else if (it.boss) { const rig = Pres.rigs.get(it.boss), B = sim.boss, P = it.boss === 'barracuda' ? B.parts.barracuda.pos : B.pos; const pj = R3.proj(P[0], P[1], B.id === 'stingray' ? P[2] - 24 : P[2]); if (pj) drawActor(g, rig, pj[0], pj[1], C.F / pj[2], { fog: clamp((pj[2] - fogN) / (fogF - fogN), 0, 1), fogCol: fogC, size: 1, flash: B.parts[it.boss === 'barracuda' ? 'barracuda' : it.boss === 'hammerhead' ? 'body' : 'krake'].flash > 0 }); if (it.boss === 'hammerhead' && B.shield && !(B.shieldDown > 0)) { const sp = R3.proj(P[0] - 10, P[1], 24); if (sp) { const k = C.F / sp[2]; px.blend(g, .55, 'normal', () => { px.rect(g, sp[0] - 13 * k, sp[1] - 20 * k, 26 * k, 40 * k, '#7a828e'); px.rect(g, sp[0] - 10 * k, sp[1] - 16 * k, 20 * k, 32 * k, '#5a626e'); }); px.rect(g, sp[0] - 13 * k, sp[1] - 20 * k, 26 * k, Math.max(1, k), '#cfd6e0'); } } }
    else if (it.pr) drawProj(g, it.pr, t);
    else if (it.part) drawPart(g, it.part, t);
  }
  // decals and tracers and lasers
  for (const tr of Pres.tracers) { const a = R3.proj(tr.a[0], tr.a[1], tr.a[2]), b = R3.proj(tr.b[0], tr.b[1], tr.b[2]); if (a && b) px.line(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, tr.col, 1); }
  for (const e of sim.enemies) if (!e.dead && reg('enemy', e.type).laser && e.st === 'aim') { const m = sim.muzzle(e), a = R3.proj(m[0], m[1], m[2]), tg = sim.players[sim.threats.find(q => q.src === e.id) ? sim.threats.find(q => q.src === e.id).tgt : 0], pp = R3.proj(tg.aim ? sim.pose(tg.id).x + 8 : 0, sim.pose(tg.id).y, sim.pose(tg.id).z - 3); if (a && pp) { px.blend(g, .8, 'add', () => px.line(g, a[0] | 0, a[1] | 0, pp[0] | 0, pp[1] | 0, '#ff3030', 1)); } }
  if (opts.sea !== false && env.beam) { const bang = t * .8, bx2 = 396 + Math.cos(bang) * 300, by2 = Math.sin(bang) * 300, a = R3.proj(396, 0, 288), bq = R3.proj(bx2, by2, 150); if (a && bq && Math.cos(bang) > -.3) px.blend(g, .35, 'add', () => { px.line(g, a[0] | 0, a[1] | 0, bq[0] | 0, bq[1] | 0, '#ffffd0', 3); }); }
  // rain
  if (env.storm) { const n = 90; for (let i = 0; i < n; i++) { const h = ((i * 2654435761) >>> 0) / 4294967296, h2 = ((i * 40503 + 77) * 2246822519 >>> 0) / 4294967296; const x = (h * W + t * 40) % W, y = ((h2 * H) + t * 520 * (.6 + h)) % H; px.line(g, x | 0, y | 0, (x - 2) | 0, (y + 6) | 0, '#8fb0c8', 1); } }
  if (flash) { px.blend(g, flash * .35, 'add', () => px.rect(g, 0, 0, W, H, '#ffffff')); }
  if (sim.boss && sim.boss.smoke > 0) px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, H, '#6a6a72'));
  // fireworks (stage 1)
  if (env.fireworks) { const n = 3; for (let i = 0; i < n; i++) { const ph = ((t * .5 + i * .37) % 1.6), ang = (i * 1.7 + Math.floor(t * .5 + i * .37 / 1.6) * 2.3), seed = i * 7 + Math.floor((t * .5 + i * .37) / 1.6); const cx = 40 + ((hash32('fw' + seed) % 1000) / 1000) * (W - 80), cy = 28 + ((hash32('fy' + seed) % 100) / 100) * 40; if (ph < 1.1) { const rr = Math.min(1, ph / .6) * 26, a = 1 - ph / 1.1; const col = ['#ff5a5a', '#ffd34a', '#5ad1ff', '#8aff8a'][seed % 4]; px.blend(g, .9 * a, 'add', () => { for (let k = 0; k < 16; k++) { const aa = k / 16 * TAU; px.dot(g, (cx + Math.cos(aa) * rr) | 0, (cy + Math.sin(aa) * rr + ph * ph * 8) | 0, col); } }); } } }
  Pres.fogUsed = fogC;
}
function drawEnemy(g, sim, e, env, t) {
  const d = reg('enemy', e.type); if (!d) return; const C = R3.cam, fogC = env.fog[0], fogN = env.fog[1], fogF = env.fog[2];
  const dead = e.dead; if (dead && e.dt > 1.8 && (e.dt * 10 | 0) % 2) return;
  const sink = dead && e.dt > 1 && e.cover ? (e.dt - 1) * 20 : 0;
  const pj = R3.proj(e.x, e.y, e.foot - sink); if (!pj) return; const k = C.F / pj[2], fog = clamp((pj[2] - fogN) / (fogF - fogN), 0, 1);
  // blob shadow
  const gp = R3.proj(e.x, e.y, e.bz != null && !dead ? Math.max(e.bz, 0) : 0); if (gp && !dead && e.type !== 'drone') px.blend(g, .35, 'normal', () => px.ell(g, gp[0], gp[1], 6 * k, 2.2 * k, '#000000'));
  if (e.type === 'drone') {
    const x = pj[0], y = pj[1], s = Math.max(1, k * 6); px.rect(g, x - s, y - s * .5, s * 2, s, e.flash > 0 ? '#ffffff' : '#2a2f3a'); for (const dx of [-1.6, 1.6]) px.rect(g, x + dx * s - s * .6, y - s * 1.1 + (Math.floor(t * 30) % 2) * .5, s * 1.2, Math.max(1, s * .2), '#8a95a8'); px.blend(g, .9, 'add', () => px.disc(g, x, y + s * .1, Math.max(1, s * .45), e.zapping ? '#ffffff' : '#ff3030')); return;
  }
  const rig = Pres.rigs.get(e.id); if (!rig) return;
  const opts = { fog, fogCol: fogC, flash: e.flash > 0, size: 1 };
  if (e.type === 'jetski') { const x = pj[0], y = pj[1], s = k; px.rect(g, x - 14 * s, y - 2 * s, 28 * s, 6 * s, e.flash > 0 ? '#fff' : '#d83030'); px.rect(g, x - 12 * s, y + 2 * s, 24 * s, 2 * s, '#8a1e1e'); px.rect(g, x - 20 * s, y + 3 * s, 40 * s, 1, '#9fe0ff'); }
  drawActor(g, rig, pj[0], pj[1], k, opts);
  if (e.shield && e.shieldUp) { const sp = R3.proj(e.x - 7, e.y, e.foot + 12); if (sp) { const kk = C.F / sp[2]; px.rect(g, sp[0] - 9 * kk, sp[1] - 12 * kk, 18 * kk, 26 * kk, '#59616f'); px.rect(g, sp[0] - 7 * kk, sp[1] - 10 * kk, 14 * kk, 22 * kk, '#78828f'); px.rect(g, sp[0] - 7 * kk, sp[1] - 3 * kk, 14 * kk, Math.max(1, 3 * kk), '#bfe8ff'); } }
  if (e.type === 'quartermaster' && !dead) { const cp = R3.proj(e.x + 4, e.y, e.foot + 14); if (cp) { const kk = C.F / cp[2]; px.rect(g, cp[0] - 5 * kk, cp[1] - 4 * kk, 10 * kk, 8 * kk, '#e8761e'); px.rect(g, cp[0] - 5 * kk, cp[1] - 4 * kk, 10 * kk, Math.max(1, kk), '#a84a0e'); } }
  if (!dead && e.civ && sim.t % 1 < .5 && false) { }
  if (tune.view.hitVol) for (const v of sim.volumes(e)) if (v.k === 's') { const c = R3.proj(v.c[0], v.c[1], v.c[2]); if (c) px.disc(g, c[0], c[1], v.r * C.F / c[2], v.part === 'head' ? '#ff00ff' : '#00ffff'); }
}
function drawProj(g, pr, t) {
  const p = R3.proj(pr.x, pr.y, pr.z); if (!p) return; const k = R3.cam.F / p[2], s = Math.max(1.5, (pr.r || 5) * k * .8);
  const col = pr.kind === 'grenade' ? '#4a5a3a' : pr.kind === 'rocket' || pr.kind === 'missile' ? '#cfd5df' : pr.kind === 'torpedo' ? '#3a4a5a' : pr.kind === 'flare' ? '#ff8a3a' : pr.kind === 'harpoon' ? '#d8d8d8' : '#ffe9a8';
  if (pr.kind === 'torpedo') { px.rect(g, p[0] - s * 1.8, p[1] - s * .6, s * 3.6, s * 1.2, '#4a5a6a'); px.rect(g, p[0] - s * 3, p[1] + s * .4, s * 2, 1, '#bfe8ff'); }
  else { px.disc(g, p[0], p[1], s, col); if (pr.kind === 'rocket' || pr.kind === 'missile') { for (let i = 1; i < 4; i++) { const q = R3.proj(pr.x - pr.vx * .02 * i, pr.y - pr.vy * .02 * i, pr.z - pr.vz * .02 * i); if (q) px.blend(g, .7 - i * .15, 'add', () => px.disc(g, q[0], q[1], s * (1 - i * .15), '#ffb060')); } } }
  if (pr.kind === 'flare' || pr.team === 'p') px.blend(g, .6, 'add', () => px.disc(g, p[0], p[1], s * 2, pr.team === 'p' ? '#ffd080' : '#ff6a2a'));
}
function drawPart(g, p, t) {
  const q = R3.proj(p.x, p.y, p.z); if (!q) return; const s = Math.max(1, p.sz * R3.cam.F / q[2] * .35 + (p.smoke ? (1.2 - p.life) * 2 : 0));
  if (p.smoke) px.blend(g, clamp(p.life * .35, 0, .45), 'normal', () => px.disc(g, q[0], q[1], s * 1.5, p.col));
  else if (p.add) px.blend(g, clamp(p.life * 2.5, 0, 1), 'add', () => px.rect(g, q[0] - s / 2, q[1] - s / 2, Math.ceil(s), Math.ceil(s), p.col)); else px.rect(g, q[0] - s / 2, q[1] - s / 2, Math.ceil(s), Math.ceil(s), p.col);
}
