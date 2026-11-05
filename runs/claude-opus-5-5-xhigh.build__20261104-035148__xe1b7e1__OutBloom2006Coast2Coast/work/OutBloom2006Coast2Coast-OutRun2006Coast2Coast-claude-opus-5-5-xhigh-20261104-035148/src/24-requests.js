/* OutBloom — Love in Bloom: the passenger's requests. Each stage has two or three slots; a request is introduced (the
 * passenger turns to you and says it, a card shows it), its objects appear ahead, it runs for its window, then it is
 * rated Perfect, Great, Good or Miss for 5 / 3 / 2 / 0 petals (x1.2 for a type she loves). Fork preferences, penalties
 * for crashes, bumps and the verge, the mood face and the grade (AAA "Full Bloom" to E) that picks the ending's mood. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E, SEG = OB.SEG;
const UI = OB.UI, C = UI.COL;
const sgn = v => v < 0 ? -1 : 1;
const OBJ_DRAW = {
  balloon(g, o, sx, sy, sc, t) { if (o.hit) return; const s = sc * 500, y = sy - (700 + Math.sin(t * 3 + o.id) * 60) * sc, r = Math.max(1, 22 * s / 100); const c = ['#ff3a6a', '#ff7ab8', '#c84ae8'][o.id % 3];
    px.line(g, Math.round(sx), Math.round(sy - 120 * sc), Math.round(sx), Math.round(y + r), '#ffffff', 1); px.disc(g, Math.round(sx - r * .45), Math.round(y - r * .2), Math.round(r * .6), c); px.disc(g, Math.round(sx + r * .45), Math.round(y - r * .2), Math.round(r * .6), c); px.poly(g, [[sx - r, y], [sx + r, y], [sx, y + r * 1.1]], c); if (r > 3) px.rect(g, Math.round(sx - r * .5), Math.round(y - r * .5), Math.max(1, Math.round(r * .3)), Math.max(1, Math.round(r * .3)), '#ffffff'); },
  gnome(g, o, sx, sy, sc, t) { const s = sc * 500, h = 46 * s / 100 * (o.hit ? 1 : 1), fly = o.hit ? o.flyT : 0; if (fly > 1.2) return; const x = sx + fly * o.flyDir * 300 * sc * 40, y = sy - fly * 420 * sc * 30 + fly * fly * 300 * sc * 30;
    const w = Math.max(1, h * .5); px.rect(g, Math.round(x - w / 2), Math.round(y - h * .45), Math.round(w), Math.round(h * .45), '#3a5ab0'); px.disc(g, Math.round(x), Math.round(y - h * .58), Math.max(1, Math.round(w * .42)), '#f0d0b0'); px.rect(g, Math.round(x - w * .4), Math.round(y - h * .52), Math.round(w * .8), Math.max(1, Math.round(h * .12)), '#ffffff');
    px.poly(g, [[x - w * .5, y - h * .66], [x + w * .5, y - h * .66], [x + Math.sin(t * 4 + o.id) * w * .15, y - h * 1.15]], '#e83a3a'); if (o.hit && w > 4) { px.disc(g, Math.round(x - w * .2), Math.round(y - h * .62), Math.max(1, Math.round(w * .15)), '#ffffff'); px.disc(g, Math.round(x + w * .2), Math.round(y - h * .62), Math.max(1, Math.round(w * .15)), '#ffffff'); } },
  bee(g, o, sx, sy, sc, t) { const s = sc * 500, r = Math.max(1, 9 * s / 100), y = sy - 500 * sc; for (let k = 0; k < 5; k++) { const a = t * 9 + k * 1.3 + o.id, bx = sx + Math.cos(a) * r * 2.5, by = y + Math.sin(a * 1.3) * r * 1.5; px.rect(g, Math.round(bx - r * .5), Math.round(by - r * .35), Math.max(1, Math.round(r)), Math.max(1, Math.round(r * .7)), '#ffd23a'); if (r > 2) px.rect(g, Math.round(bx), Math.round(by - r * .35), 1, Math.max(1, Math.round(r * .7)), '#2a2010'); px.rect(g, Math.round(bx - r * .2), Math.round(by - r * .8), Math.max(1, Math.round(r * .5)), Math.max(1, Math.round(r * .3)), '#e8f8ff'); } },
  cone(g, o, sx, sy, sc) { const s = sc * 500, h = 40 * s / 100, w = h * .6; if (o.hit) { px.poly(g, [[sx - h * .6, sy - w * .2], [sx + h * .5, sy - w * .5], [sx + h * .5, sy]], '#ff7a1a'); return; }
    px.poly(g, [[sx - w / 2, sy], [sx + w / 2, sy], [sx, sy - h]], '#ff7a1a'); px.rect(g, Math.round(sx - w * .3), Math.round(sy - h * .5), Math.max(1, Math.round(w * .6)), Math.max(1, Math.round(h * .12)), '#ffffff'); px.rect(g, Math.round(sx - w * .6), Math.round(sy - 2), Math.round(w * 1.2), 2, '#3a3a3a');
    if (h > 8) { const ax = sx + o.side * w * 1.4, ay = sy - h * .5; px.poly(g, [[ax, ay - h * .2], [ax + o.side * h * .35, ay], [ax, ay + h * .2]], o.done ? '#8a8a8a' : '#5ae07a'); } },
  arch(g, o, sx, sy, sc, t) { const s = sc * 500, half = .3 * OB.ROADW * sc, H = 1100 * sc, post = Math.max(1, 70 * sc); if (o.hit) return;
    for (const sd of [-1, 1]) px.rect(g, Math.round(sx + sd * half - post / 2), Math.round(sy - H), Math.round(post), Math.round(H), '#3a9a4a');
    for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10, ax = sx - Math.cos(a) * half, ay = sy - H - Math.sin(a) * H * .28 + Math.sin(t * 2 + k) * 2 * sc * 30; px.disc(g, Math.round(ax), Math.round(ay), Math.max(1, Math.round(post * 1.1)), ['#ff7ab8', '#ffd23a', '#ffffff'][k % 3]); } },
  bouquet(g, o, sx, sy, sc, t) { if (o.hit) return; const s = sc * 500, r = Math.max(1, 14 * s / 100), y = sy - 260 * sc - Math.abs(Math.sin(t * 3 + o.id)) * 60 * sc; px.poly(g, [[sx - r * .6, y], [sx + r * .6, y], [sx, y + r * 1.6]], '#3a9a4a');
    for (let k = 0; k < 5; k++) px.disc(g, Math.round(sx + Math.cos(k * 1.26 + t) * r * .6), Math.round(y - r * .2 + Math.sin(k * 1.26 + t) * r * .4), Math.max(1, Math.round(r * .45)), ['#ff3a6a', '#ffd23a', '#ff9ac8', '#ffffff', '#c84ae8'][k]); if (r > 3 && Math.floor(t * 6 + o.id) % 3 === 0) px.rect(g, Math.round(sx + r), Math.round(y - r), 1, 1, '#ffffff'); },
  gate(g, o, sx, sy, sc, t) { const half = .3 * OB.ROADW * sc, H = 1000 * sc, post = Math.max(1, 80 * sc), col = OB.MEMORY_COLORS[o.color][1]; if (o.hit) return;
    for (const sd of [-1, 1]) px.rect(g, Math.round(sx + sd * half - post / 2), Math.round(sy - H), Math.round(post), Math.round(H), col);
    px.rect(g, Math.round(sx - half), Math.round(sy - H), Math.round(half * 2), Math.max(1, Math.round(H * .15)), col); if (half > 18) OB.Art.icon(g, OB.MEMORY_COLORS[o.color][2], sx - 3, sy - H - 2, 1); },
  photographer(g, o, sx, sy, sc, t) { const rig = OB.Cast.rig('juni', 2.4); /* a photographer at the roadside, a camera raised */ const S = sc * 500; if (S < 6) return; px.rect(g, Math.round(sx - 4 * S / 40), Math.round(sy - 50 * S / 40), Math.max(1, Math.round(8 * S / 40)), Math.round(30 * S / 40), '#3a3a4a'); px.disc(g, Math.round(sx), Math.round(sy - 56 * S / 40), Math.max(1, Math.round(6 * S / 40)), '#f0c8a0'); px.rect(g, Math.round(sx - 6 * S / 40), Math.round(sy - 58 * S / 40), Math.max(1, Math.round(12 * S / 40)), Math.max(1, Math.round(7 * S / 40)), '#2a2a32'); if (o.flash > 0) { const a = g.globalAlpha; g.globalAlpha = o.flash; px.disc(g, Math.round(sx), Math.round(sy - 56 * S / 40), Math.round(20 * S / 40), '#ffffff'); g.globalAlpha = a; } }
};
OB.MEMORY_COLORS = [['RED', '#ff3a4a', 'heart'], ['YELLOW', '#ffd23a', 'sun'], ['BLUE', '#3a8ae8', 'drift'], ['WHITE', '#f4f4f4', 'star'], ['PURPLE', '#b04ae8', 'flower']];
OB.OBJ_DRAW = OBJ_DRAW;
/** a road object for drawing: the road calls draw(g, sx, sy, scale, t) */
const mkObj = (o) => { o.draw = (g, sx, sy, sc, t) => OBJ_DRAW[o.kind] && OBJ_DRAW[o.kind](g, o, sx, sy, sc, t); return o; };
OB.mkObj = mkObj;
/** hit tests for objects against a driver as it passes them (shared by requests and missions) */
OB.objPass = (race, d, list, onPass) => {
  const z0 = d.prevZ, z1 = d.car.z, ax = d.absX();
  for (const o of list) { if (o.done || o.stage !== d.stage) continue; if (o.kind === 'bee') continue; if (z0 < o.z && z1 >= o.z) { o.done = true; onPass(o, ax - o.x); } }
};

class Director {
  constructor(race, o = {}) {
    Object.assign(this, { race, o, passenger: o.passenger || race.p1.passenger || 'marisol', petals: 0, max: 0, history: [], cur: null, objs: [], done: new Set(), moodLog: [], penT: 0, offT: 0, prefStated: {}, rnd: OB.rand.stream('love', race.seed) });
    race.req = this;
  }
  /** what the bot should aim for: objects to hit, to avoid, a box to stop in */
  targets(d) {
    const r = this.cur, out = []; if (!r) return out; const z = d.car.z;
    for (const o of r.objs) { if (!o.kind || o.done || o.stage !== d.stage) continue; const dz = o.z - z;
      if (['balloon', 'gnome', 'bouquet', 'arch'].includes(o.kind)) out.push({ kind: 'hit', dz, x: o.x });
      else if (o.kind === 'bee') out.push({ kind: 'avoid', dz, x: o.x });
      else if (o.kind === 'cone') { out.push({ kind: 'hit', dz, x: o.x + o.side * .36 }); out.push({ kind: 'slow', dz, x: o.x, v: 150 }); } }
    for (const o of r.objs) if (o.ribbon && o.ribbon.pair && o.ribbon.ribbon && !o.ribbon.ribbon.snapped) { const v = o.ribbon; out.push({ kind: 'hit', dz: v.z - z, x: (v.x + v.pair.x) / 2 }); }
    if (r.box && !r.shot) out.push({ kind: 'stop', dz: r.box.z0 + 120 - z, x: 0 });
    if (r.type === 'speed') out.push({ kind: 'fast', dz: 0, x: 0 });
    return out;
  }
  get loves() { return (OB.CAST[this.passenger] || {}).loves || []; }
  onStart() {}
  /** the slots on a stage: its own, or (the Finale) types rotated so every type appears across a run */
  slots(stageId) {
    const S = OB.STAGES[stageId], road = OB.World.stage(stageId); let list = S.requests.map(r => Object.assign({}, r));
    if (this.o.allTypes) { const i0 = (S.row - 1) * 3 + S.col; list = [0, 1].map(k => { const t = OB.REQ_ORDER[(i0 * 2 + k * 7) % OB.REQ_ORDER.length]; return { at: [.2, .6][k], type: t }; }); }
    return list.map((r, i) => ({ key: stageId + ':' + i, stage: stageId, z: Math.max(130, Math.floor(r.at * road.stageLen)) * SEG, type: r.type, n: r.n, drift: r.drift }));
  }
  onStep(race, dt) {
    const d = race.p1; if (race.phase !== 'race' || d.finished) { if (this.cur && race.phase !== 'race') this.cur.t += 0; return; }
    // the next slot on this stage
    if (!this.cur) for (const s of this.slots(d.stage)) { if (this.done.has(s.key)) continue; if (d.car.z >= s.z - 2600 && d.car.z < s.z + 1000) { this.start(s); break; } }
    if (this.cur) this.stepReq(dt);
    // the fork preference, some 600 segments before the decision
    if (d.road.junctionAt && !this.prefStated[d.stage] && d.car.z > d.road.junctionAt - 600 * SEG && !race.fixed) {
      this.prefStated[d.stage] = true; const side = this.rnd() < .5 ? -1 : 1; race.forkPref = { side, stage: d.stage };
      OB.Talk.say(this.passenger, OB.line(this.passenger, side < 0 ? 'fork_left' : 'fork_right'), { mood: 'excited', prio: 1 }); OB.Cast.pose('pass', null, 'shout', 2.2, { point: true, look: side * .9, aim: .2 });
      this.max += 2; race.emit('fork:pref', { car: d.id, side });
    }
    // penalties: more than 2 s off the road costs a petal
    if (d.car.offroad) { this.offT += dt; if (this.offT > 2) { this.offT = -1e9; this.penalty(1, 'offroad'); } } else if (this.offT > 0 || this.offT < 0) this.offT = 0;
    if (this.penT > 0) this.penT -= dt;
    this.moodLog = this.moodLog.filter(m => race.t - m.t < 20);
  }
  start(s) {
    const race = this.race, d = race.p1, def = OB.REQUESTS[s.type], k = OB.tune('requestDifficulty');
    const r = { slot: s, type: s.type, def, state: 'intro', t: 0, z0: d.car.z + 1800, progress: 0, total: 0, measure: 0, rating: null, objs: [], hits: 0, timeIn: 0, timeAbove: 0, contacts: 0, drift: 0, draft: 0, count: 0 };
    r.z1 = r.z0 + def.window * SEG;
    const rnd = this.rnd, lanes = d.road.seg(r.z0).lanes || 3, lx = i => OB.laneX(clamp(i, 0, lanes - 1), lanes);
    const nOf = () => Math.round((s.n || (def.n ? def.n[0] + Math.floor(rnd() * (def.n[1] - def.n[0] + 1)) : 0)) * (def.measure === 'ratio' || def.measure === 'hits' ? k : k));
    switch (s.type) {
      case 'balloons': case 'gnomes': case 'bouquets': {
        const n = Math.max(6, nOf()), kind = { balloons: 'balloon', gnomes: 'gnome', bouquets: 'bouquet' }[s.type];
        for (let i = 0; i < n; i++) { const z = r.z0 + 500 + i * (r.z1 - r.z0 - 1500) / n, pat = Math.floor(i / 4) % 3; let x = pat === 0 ? lx(1) + Math.sin(i * 1.1) * .5 : pat === 1 ? lx(i % lanes) : (i % 2 ? .45 : -.45);
          if (s.type === 'bouquets') x = clamp(-d.road.curveAt(z) * .1 + (rnd() - .5) * 1.2, -.85, .85);
          r.objs.push(mkObj({ id: i, kind, stage: d.stage, z, x: clamp(x, -.85, .85), drift: s.drift ? (rnd() < .5 ? -1 : 1) * .25 : 0 })); }
        r.total = n; break; }
      case 'bees': { const n = Math.max(4, nOf()); for (let i = 0; i < n; i++) r.objs.push(mkObj({ id: i, kind: 'bee', stage: d.stage, z: r.z0 + 600 + i * (r.z1 - r.z0 - 1600) / n, x: 0, x0: (rnd() - .5) * .8, amp: .55 + rnd() * .3, w: 1.2 + rnd() * .8, ph: rnd() * 6 })); r.total = n; break; }
      case 'cones': { const n = Math.max(6, nOf()), lane = lx(Math.floor(lanes / 2)); for (let i = 0; i < n; i++) r.objs.push(mkObj({ id: i, kind: 'cone', stage: d.stage, z: r.z0 + 900 + i * 1500, x: lane, side: i % 2 ? 1 : -1 })); r.total = n; r.z1 = Math.max(r.z1, r.z0 + 900 + n * 1500 + 800); break; }
      case 'arches': { const n = Math.max(5, nOf()); let lane = Math.floor(lanes / 2); for (let i = 0; i < n; i++) { r.objs.push(mkObj({ id: i, kind: 'arch', stage: d.stage, z: r.z0 + 700 + i * (r.z1 - r.z0 - 1800) / n, x: lx(lane) })); lane = clamp(lane + (rnd() < .5 ? -1 : 1), 0, lanes - 1); } r.total = n; break; }
      case 'ribbons': { const n = Math.max(3, nOf()); for (let i = 0; i < n; i++) { const v = race.traffic.spawnRibbon(d.stage, r.z0 + 1500 + i * (r.z1 - r.z0 - 2000) / n); if (v) r.objs.push({ ribbon: v }); } r.total = r.objs.length; break; }
      case 'photo': { const pz = Math.max(r.z0 + 1500, d.road.photoZ > d.car.z + 2500 && d.road.photoZ < r.z1 ? d.road.photoZ : r.z0 + 2500); r.box = { z0: pz, z1: pz + 2 * SEG, x: 0, half: .5 }; r.objs.push(mkObj({ id: 0, kind: 'photographer', stage: d.stage, z: pz + SEG, x: 1.35, flash: 0 })); r.total = 1; r.z1 = pz + 2 * SEG + 1800; break; }
      case 'pass': case 'close': r.total = nOf(); break;
      case 'drift': r.total = Math.round(def.target * k); break;
      case 'speed': r.v = Math.round((def.v[0] + rnd() * (def.v[1] - def.v[0])) * (OB.setting('units') === 'mph' ? 1 / .6214 : 1)); r.total = 1; break;
      case 'draft': r.total = Math.round(def.secs * k); break;
      case 'clean': r.total = 0; break;
    }
    if (def.traffic) race.traffic.mul = def.traffic;
    this.cur = r;
    const vars = { n: r.total, v: Math.round(r.v ? (OB.setting('units') === 'mph' ? r.v * .6214 : r.v) : 0) };
    r.callout = OB.CALLOUTS[s.type].replace('{n}', vars.n).replace('{v}', vars.v);
    OB.Talk.say(this.passenger, OB.line(this.passenger, 'req_' + s.type, vars), { mood: 'excited', prio: 2 });
    OB.Cast.pose('pass', null, 'shout', 1.6, { point: true, look: -.7 });
    race.emit('req:start', { car: d.id, type: s.type, total: r.total });
  }
  stepReq(dt) {
    const race = this.race, d = race.p1, r = this.cur, car = d.car; r.t += dt;
    if (r.state === 'intro' && r.t > 1.6) r.state = 'active';
    const inWin = car.z >= r.z0 - 300 && car.z <= r.z1, cheat = OB.cheats.perfectRequests;
    // objects: bees fly, balloons drift in the wind, objects come to the car (the attract mode's cheat)
    for (const o of r.objs) {
      if (o.kind === 'bee') { o.x = clamp(o.x0 + Math.sin(race.t * o.w + o.ph) * o.amp, -1, 1); if (cheat && Math.abs(o.z - car.z) < 1600) o.x = car.x > 0 ? -.9 : .9; }
      if (o.drift && !o.done) o.x = clamp(o.x + o.drift * dt * .4 * Math.sin(race.t * .7 + o.id), -.9, .9);
      if (cheat && !o.done && ['balloon', 'gnome', 'bouquet', 'arch'].includes(o.kind) && o.z - car.z < 1800 && o.z > car.z) o.x += (d.absX() - o.x) * Math.min(1, dt * 6);
      if (o.flyT !== undefined) o.flyT += dt;
      if (o.flash > 0) o.flash -= dt * 2;
    }
    const ax = d.absX();
    OB.objPass(race, d, r.objs.filter(o => o.kind), (o, dx) => {
      const near = Math.abs(dx);
      if (o.kind === 'balloon' && near < .32) { o.hit = true; r.progress++; race.emit('obj:pop', { car: d.id }); this.fx('pop', o); }
      else if (o.kind === 'gnome' && near < .3) { o.hit = true; o.flyT = 0; o.flyDir = dx > 0 ? -1 : 1; r.progress++; race.emit('obj:bonk', { car: d.id }); this.fx('bonk', o); }
      else if (o.kind === 'bouquet' && near < .32) { o.hit = true; r.progress++; race.emit('obj:bouquet', { car: d.id }); this.fx('bouquet', o); }
      else if (o.kind === 'arch' && near < .3) { o.hit = true; r.progress++; race.emit('obj:arch', { car: d.id }); this.fx('arch', o); }
      else if (o.kind === 'cone') { const right = sgn(dx) === o.side && near > .12; if (near < .16) { o.hit = true; race.emit('obj:cone', { car: d.id, hit: true }); } else if (right || cheat) { r.progress++; race.emit('obj:cone', { car: d.id, ok: true }); } }
    });
    for (const o of r.objs) if (o.kind === 'bee' && !o.done && Math.abs(o.z - car.z) < 260) { if (Math.abs(o.x - ax) < .26 && !cheat) { o.done = true; r.hits++; car.vx += (this.rnd() - .5) * 2.4; race.emit('obj:sting', { car: d.id }); OB.Cast.pose('pass', 'guard', 'wince', 1); this.mood(-1); } else if (o.z < car.z) o.done = true; }
    if (r.type === 'ribbons') r.progress = r.objs.filter(q => q.ribbon && q.ribbon.ribbon && q.ribbon.ribbon.snapped).length;
    if (inWin && r.state !== 'intro') {
      if (r.type === 'speed') { r.timeIn += dt; const v = OB.setting('units') === 'mph' ? car.v * .6214 : car.v, need = OB.setting('units') === 'mph' ? r.v * .6214 : r.v; if (v >= need * (OB.setting('units') === 'mph' ? 1 : 1) || cheat) r.timeAbove += dt; r.progress = r.timeAbove / Math.max(.01, r.timeIn); }
      if (r.type === 'draft' && (car.slip > .5 || cheat)) { r.draft += dt; r.progress = r.draft; }
      if (r.type === 'drift' && car.drift.on) { r.progress = r.drift + car.drift.score; }
    }
    if (r.box) {   // the photo box: stop in it
      const b = r.box, inside = car.z >= b.z0 + OB.CAR_LEN / 2 && car.z <= b.z1 && Math.abs(ax - b.x) < b.half - OB.PLAYER_HW * .5, nearBox = car.z > b.z0 - 3000 && car.z < b.z1 + 300;
      if (nearBox && car.v < 150) r.slowT = (r.slowT || 0) + dt;
      if (car.z >= b.z0 && car.z <= b.z1 + 200) r.minV = Math.min(r.minV === undefined ? 999 : r.minV, car.v);
      if (inside && car.v < 5) { r.stopT = (r.stopT || 0) + dt; if (r.stopT > .5 && !r.shot) { r.shot = true; r.photo = (r.slowT || 0) < 3 + 1.5 ? 3 : 2; this.flash(); } }
      if (!r.shot && car.z > b.z1 + 100) { r.shot = true; r.photo = cheat ? 3 : (r.minV !== undefined && r.minV < 100) ? 1 : 0; if (r.photo) this.flash(); }
      if (cheat && !r.shot && car.z > b.z0) { r.shot = true; r.photo = 3; this.flash(); }
      r.progress = r.photo || 0;
    }
    if (car.z > r.z1 || (r.box && r.shot && r.t > 1)) this.rate();
  }
  fx(kind, o) {
    const p = this.race.p1; const pr = OB.World.stage(o.stage).project(o.z, o.x, kind === 'balloon' ? 700 : 200);
    if (pr) OB.FX.emit(kind === 'bonk' ? 'star' : 'confetti', pr[0], pr[1], kind === 'arch' ? 24 : 12, { colors: ['#ff7ab8', '#ffd23a', '#ffffff', '#5ae0ff'], speed: 90, life: .9, grav: 120, size: 2 });
    OB.sfx && OB.sfx({ pop: 'pop', bonk: 'boink', bouquet: 'chime', arch: 'harp' }[kind]);
  }
  flash() { const o = this.cur.objs.find(q => q.kind === 'photographer'); if (o) o.flash = 1; OB.game.flash('#ffffff', .1, .6); OB.sfx && OB.sfx('shutter'); this.race.emit('obj:photo', { car: this.race.p1.id, rating: this.cur.photo }); }
  /** the rating: Perfect, Great, Good or Miss from the request's measure */
  rate() {
    const race = this.race, r = this.cur, def = r.def, d = race.p1; let rating = 'Miss', val = 0;
    const tiers = def.tiers;
    switch (def.measure) {
      case 'ratio': val = r.total ? r.progress / r.total : 0; break;
      case 'count': val = r.total ? r.count / r.total : 0; r.progress = r.count; break;
      case 'drift': val = r.total ? (r.drift) / r.total : 0; r.progress = r.drift; break;
      case 'share': val = r.timeIn > 0 ? r.timeAbove / r.timeIn : 0; break;
      case 'draft': val = r.total ? r.draft / r.total : 0; break;
    }
    if (def.measure === 'hits') rating = r.hits <= tiers[0] ? 'Perfect' : r.hits <= tiers[1] ? 'Great' : r.hits <= tiers[2] ? 'Good' : 'Miss';
    else if (def.measure === 'contacts') rating = r.contacts === 0 ? 'Perfect' : r.contacts <= 1 ? 'Good' : 'Miss';
    else if (def.measure === 'photo') rating = r.photo >= 3 ? 'Perfect' : r.photo === 2 ? 'Great' : r.photo === 1 ? 'Good' : 'Miss';
    else rating = val >= tiers[0] - 1e-9 ? 'Perfect' : val >= tiers[1] ? 'Great' : val >= tiers[2] ? 'Good' : 'Miss';
    if (OB.cheats.perfectRequests) rating = 'Perfect';
    const loved = this.loves.includes(r.type), base = OB.PETALS[rating], pet = Math.ceil(base * (loved ? 1.2 : 1) * OB.tune('petalScale'));
    this.max += Math.ceil(5 * (loved ? 1.2 : 1) * OB.tune('petalScale'));
    this.petals += pet; d.petals = this.petals; r.rating = rating; r.petals = pet; r.state = 'rated';
    this.history.push({ type: r.type, rating, petals: pet, stage: r.slot.stage });
    this.done.add(r.slot.key);
    race.traffic.mul = 1;
    const ev = rating.toLowerCase();
    OB.Talk.say(this.passenger, OB.line(this.passenger, ev), { mood: rating === 'Miss' ? 'sad' : rating === 'Perfect' ? 'excited' : 'happy', prio: 2 });
    OB.Cast.pose('pass', rating === 'Miss' ? 'hips' : 'cheer', rating === 'Miss' ? 'angry' : 'smile', 1.8);
    this.mood(rating === 'Miss' ? -2 : rating === 'Perfect' ? 2 : 1);
    if (rating !== 'Miss') OB.FX.emit('petal', OB.game.W / 2, OB.game.H * .6, 18, { colors: ['#ffb0d0', '#ff7ab8', '#ffffff'], speed: 120, life: 1.4, grav: 60, size: 3 });
    OB.HUD.banner(d.id, rating.toUpperCase() + '!', { color: rating === 'Miss' ? '#c8a0b0' : rating === 'Perfect' ? '#ff7ab8' : '#ffd23a', sub: '+' + pet + ' PETALS', life: 2 });
    race.emit('req:end', { car: d.id, type: r.type, rating, petals: pet });
    race.emit('petals', { car: d.id, delta: pet, reason: r.type });
    this.lastRated = r; this.cur = null;
  }
  penalty(n, why) { if (OB.cheats.invincibleMood) return; this.petals = Math.max(0, this.petals - n); this.race.p1.petals = this.petals; this.mood(-1); this.race.emit('petals', { car: this.race.p1.id, delta: -n, reason: why }); }
  mood(v) { this.moodLog.push({ t: this.race.t, v }); }
  moodFace() { const s = this.moodLog.reduce((a, m) => a + m.v, 0); return s > 1 ? 'happy' : s < -1 ? 'pouty' : 'neutral'; }
  onEvent(race, name, e) {
    if (!e || e.car !== race.p1.id) return;
    const r = this.cur;
    switch (name) {
      case 'overtake': if (r && r.type === 'pass' && r.state !== 'intro' && race.p1.car.z <= r.z1) r.count++, r.progress = r.count; break;
      case 'nearmiss': if (r && r.type === 'close' && r.state !== 'intro') r.count++, r.progress = r.count; this.mood(1); break;
      case 'drift:end': if (r && r.type === 'drift' && r.state !== 'intro') { r.drift += e.score; r.progress = r.drift; } break;
      case 'car:crash': if (r) r.contacts++; this.penalty(2, 'crash'); break;
      case 'car:bump': if (r) r.contacts++; if (this.penT <= 0) { this.penT = 3; this.penalty(1, 'bump'); } break;
      case 'car:scrape': if (r) r.contacts++; break;
      case 'fork:choose': { const pf = race.forkPref; if (pf && pf.stage === race.p1.stage) { if (e.side === pf.side) { this.petals += 2; race.p1.petals = this.petals; OB.Talk.say(this.passenger, OB.line(this.passenger, 'fork_yes'), { mood: 'happy', prio: 1 }); this.mood(2); race.emit('petals', { car: e.car, delta: 2, reason: 'fork' }); }
        else { this.penalty(1, 'fork'); OB.Talk.say(this.passenger, OB.line(this.passenger, 'fork_no'), { mood: 'angry', prio: 1 }); OB.Cast.pose('pass', 'hips', 'angry', 2); } race.forkPref = null; } break; }
    }
  }
  ratio() { return this.max > 0 ? this.petals / this.max : 0; }
  grade() { return OB.gradeOf(this.ratio()); }
  state() { const r = this.cur; return r ? { type: r.type, state: r.state, progress: Math.round(r.progress * 100) / 100, total: r.total } : null; }
  result() { return { petals: this.petals, maxPetals: this.max, grade: this.grade(), mood: OB.moodOfGrade(this.grade()), requests: this.history.slice() }; }
  objectsOn(stageId) { const r = this.cur || this.lastRated; return r ? r.objs.filter(o => o.kind && o.stage === stageId && !(o.hit && o.kind !== 'gnome' && o.kind !== 'cone')) : []; }
  /** the photo box on the asphalt */
  paint(g, seg, p1, p2, road) {
    const r = this.cur; if (!r || !r.box || road.id !== r.slot.stage) return;
    if (seg.z + SEG <= r.box.z0 || seg.z >= r.box.z1) return;
    const W = road.o.width * seg.w, h1 = r.box.half * W * p1.scale, h2 = r.box.half * W * p2.scale;
    px.poly(g, [[p1.x - h1, p1.y], [p1.x + h1, p1.y], [p2.x + h2, p2.y], [p2.x - h2, p2.y]], Math.floor(OB.game.time * 3) % 2 ? '#ff7ab8' : '#ffffff');
    px.poly(g, [[p1.x - h1 * .9, p1.y - 1], [p1.x + h1 * .9, p1.y - 1], [p2.x + h2 * .9, p2.y + 1], [p2.x - h2 * .9, p2.y + 1]], '#7a5a8a');
  }
  /** the passenger panel (portrait, mood, petal ring, count) and the request card above it */
  hud(g, race, d, vp) {
    const X = vp.x + 6, Y = vp.y + vp.h - 52, face = this.moodFace();
    OB.Cast.portrait(g, this.passenger, X, Y, 40, { mood: face, outfit: d.outfit });
    const ratio = this.ratio(), n = 12;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; OB.Art.icon(g, i < Math.round(ratio * n) ? 'petal' : 'flowerOff', X + 20 + Math.cos(a) * 25 - 2, Y + 20 + Math.sin(a) * 25 - 2, 1); }
    UI.text(g, this.petals + ' PETALS', X + 50, Y + 18, { color: C.pink });
    UI.text(g, 'GRADE ' + this.grade(), X + 50, Y + 28, { color: C.sun });
    const r = this.cur || (this.lastRated && race.t - 0 < 0 ? this.lastRated : null);
    if (r) {
      const cy = Y - 34, w = 170; UI.panel(g, X, cy, w, 30, { alpha: .88, border: r.state === 'intro' && Math.floor(race.t * 6) % 2 ? C.sun : C.border });
      OB.Art.icon(g, r.def.icon, X + 5, cy + 6, 2);
      UI.text(g, r.callout, X + 26, cy + 4, { color: C.sun });
      let prog = '';
      if (r.def.measure === 'ratio' || r.def.measure === 'count') prog = r.progress + ' / ' + r.total;
      else if (r.def.measure === 'hits') prog = 'STINGS ' + r.hits;
      else if (r.def.measure === 'contacts') prog = r.contacts ? 'SCRATCHED: ' + r.contacts : 'CLEAN';
      else if (r.def.measure === 'share') prog = Math.round(r.progress * 100) + '%';
      else if (r.def.measure === 'draft') prog = r.draft.toFixed(1) + ' / ' + r.total + ' s';
      else if (r.def.measure === 'drift') prog = Math.round(r.progress) + ' / ' + r.total;
      else if (r.def.measure === 'photo') prog = r.shot ? ['MISSED', 'GOOD', 'GREAT', 'PERFECT'][r.photo || 0] : 'STOP IN THE BOX';
      UI.text(g, prog, X + 26, cy + 15, { color: '#ffffff' });
      const u = clamp((d.car.z - r.z0) / Math.max(1, r.z1 - r.z0), 0, 1); px.rect(g, X + 4, cy + 25, w - 8, 2, '#3a2a4a'); px.rect(g, X + 4, cy + 25, Math.round((w - 8) * (1 - u)), 2, C.pink);
    }
  }
}
OB.Requests = { Director, director: o => race => new Director(race, o || {}) };
})();
