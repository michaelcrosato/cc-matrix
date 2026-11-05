// The sim: state, rail graph, walker, camera director, area loading, triggers. Pure maths, no DOM and no three.js.
const st = S7.st = {};
const sim = S7.sim = {};

S7.newState = (opts = {}) => {
  for (const k of Object.keys(st)) delete st[k];
  const roster = {};
  for (const id of S7.ROSTER) roster[id] = { hp: 1, frozen: false, unlocked: false, ammo: null, reload: 0, cool: 0 };
  Object.assign(st, {
    area: null, mode: 'rail', edge: null, s: 0, dir: 1, speed: 0, node: null, x: 0, y: 0, z: 0, yaw: 0, face: 0, turnT: 0, jLock: false, sel: 0, options: [], blocked: null,
    persona: 'rurik', roster, switchT: 0, ringSel: null, red: 40, rime: 0, items: {}, pins: [], dossier: [], upg: {}, flags: {}, gates: {}, done: {}, collected: {}, bosses: {},
    enemies: [], projectiles: [], pickups: [], fx: [], mines: [], marks: [], nextId: 1,
    aim: { yaw: 0, pitch: 0, zoom: false }, scanCd: 0, scanT: 0, flare: 0, tuck: 0, skillCd: 0, hurtT: 0, healAcc: 0, time: 0, playTime: 0,
    cam: { x: 0, y: 0, z: 3, lx: 0, ly: 0, lz: 1, fov: 58, mode: 'fixed', seg: -1, key: '' }, camBlend: 0,
    talk: null, cards: [], toasts: [], objective: '', hint: '', cut: null, beat: null, boss: null, wave: { alive: 0 }, queueSpawn: [],
    stats: { kills: 0, crits: 0, damage: 0, shots: 0, hits: 0, freezes: 0, t: 0 }, results: {}, over: false, rescue: null,
    run: { t0: 0 }, echo: null, cheats: { god: false, infRed: false, infAmmo: false, ghost: false, fast: false }, difficulty: opts.difficulty || 'normal', lastSave: null, music: ''
  });
  for (const id of ['rurik', 'anselma', 'gustav', 'jodl']) st.roster[id].unlocked = true;
  for (const id of S7.ROSTER) { const p = S7.reg.personas[id]; st.roster[id].hp = personaMax(id); st.roster[id].ammo = S7.reg.weapons[p.weapon].mag; }
  S7.resetStreams();
};
const upgLv = id => st.upg[id] || 0;
const personaMax = id => Math.round(S7.reg.personas[id].hp * S7.T('hpMax') * (1 + .15 * upgLv('fur')));
const redMax = () => 100 + 40 * upgLv('pocket');
Object.assign(sim, { upgLv, personaMax, redMax });

// ---------------------------------------------------------------- graph
let G = null;   // the loaded area's graph (rebuilt by loadArea)
S7.graph = () => G;
function groundZ(A, x, y) { return A.height ? A.height(x, y) : (A.floorZ || 0); }
function buildGraph(A) {
  const g = { A, nodes: {}, edges: {}, eorder: [] };
  const nd = typeof A.nodes === 'function' ? A.nodes() : A.nodes;
  for (const id in nd) { const n = nd[id]; g.nodes[id] = { id, x: n.t[0], y: n.t[1], z: n.t[2] !== undefined ? n.t[2] : groundZ(A, n.t[0], n.t[1]), kind: n.kind || '', to: n.to, needs: n.needs, edges: [] }; }
  for (const e of A.edges) {
    const a = g.nodes[e.a], b = g.nodes[e.b];
    const raw = [[a.x, a.y], ...(e.via || []), [b.x, b.y]];
    const lift = e.kind === 'lift' ? 5.2 : 0;
    const pts = raw.map(p => ({ x: p[0], y: p[1], z: groundZ(A, p[0], p[1]) + lift }));
    // sample terrain edges finely so the walker follows the hill
    let fine = pts;
    if (A.height) {
      // catmull-ish smoothing through the via points, then dense sampling
      const sm = []; const n = pts.length;
      for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
        const seg = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 4));
        for (let k = 0; k < seg; k++) { const t = k / seg, t2 = t * t, t3 = t2 * t; const f = (a0, a1, a2, a3) => .5 * ((2 * a1) + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t2 + (-a0 + 3 * a1 - 3 * a2 + a3) * t3); sm.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) }); }
      }
      sm.push({ x: pts[n - 1].x, y: pts[n - 1].y });
      fine = sm.map(p => ({ x: p.x, y: p.y, z: groundZ(A, p.x, p.y) + lift }));
    }
    const cum = [0];
    for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i].x - fine[i - 1].x, fine[i].y - fine[i - 1].y));
    const ed = { id: e.id, a: e.a, b: e.b, kind: e.kind || 'walk', pts: fine, cum, len: cum[cum.length - 1], gate: e.gate || null, gateS: 3.2, steep: !!e.steep, locked: e.locked || null, arc: !!e.arc };
    g.edges[e.id] = ed; g.eorder.push(e.id); a.edges.push(ed); b.edges.push(ed);
  }
  return g;
}
function edgePos(e, s, out) {
  s = S7.clamp(s, 0, e.len); const c = e.cum; let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const p0 = e.pts[lo], p1 = e.pts[hi], t = c[hi] - c[lo] > 1e-6 ? (s - c[lo]) / (c[hi] - c[lo]) : 0;
  out.x = p0.x + (p1.x - p0.x) * t; out.y = p0.y + (p1.y - p0.y) * t; out.z = p0.z + (p1.z - p0.z) * t; out.ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  return out;
}
const _p = {}; const _q = {};
sim.edgePos = edgePos;

// ---------------------------------------------------------------- level grid (line of sight)
function solidAt(x, y) {
  const A = G.A; if (!A.rows) return false;
  const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= A.w || cy >= A.h) return true;
  const ch = A.rows[cy][cx]; return ch === '#' || ch === 'P';
}
function losClear(ax, ay, az, bx, by, bz) {
  if (G.A.terrain || !G.A.rows) return true;
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / .35));
  for (let i = 1; i < n; i++) { const t = i / n; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; if (solidAt(x, y) && az + (bz - az) * t < 3.2) return false; }
  return true;
}
function rayWallDist(ox, oy, oz, dx, dy, dz, maxd) {
  if (G.A.terrain) return maxd;
  for (let d = .4; d < maxd; d += .4) { const x = ox + dx * d, y = oy + dy * d, z = oz + dz * d; if (z < 0) return d; if (solidAt(x, y) && z < 3.2) return d; }
  return maxd;
}
Object.assign(sim, { solidAt, losClear, rayWallDist });

// ---------------------------------------------------------------- loading an area
sim.loadArea = function (id, nodeId, opts = {}) {
  const A = S7.reg.areas[id]; if (!A) throw new Error('unknown area ' + id);
  const from = st.area;
  G = buildGraph(A); st.area = id; st.enemies.length = 0; st.projectiles.length = 0; st.mines.length = 0; st.fx.length = 0; st.queueSpawn.length = 0; st.wave = { alive: 0 };
  st.boss = null; st.cut = null; st.talk = null; st.beat = null; st.card = null; st.mode = 'rail'; st.frozenAt = null; st.blocked = null; st.atEnd = null; st.camSeg = -1; st.scanT = 0; st.flare = 0; st.cam.key = '';
  // pickups
  st.pickups = [];
  for (const sp of A.spots) if (sp.kind === 'pickup' && !st.collected[id + ':' + sp.id]) sim.addSpotPickup(sp);
  const n = G.nodes[nodeId || Object.keys(G.nodes)[0]];
  st.node = n.id; st.x = n.x; st.y = n.y; st.z = n.z;
  // stand on an incident edge, facing away from the node when there is somewhere to go
  const inc = n.edges;
  if (inc.length >= 3) { st.mode = 'junction'; st.jLock = true; sim.setupJunction(n, null); st.edge = inc[0].id; st.s = inc[0].a === n.id ? 0 : inc[0].len; st.dir = inc[0].a === n.id ? 1 : -1; }
  else if (inc.length) { const e = inc[0]; st.edge = e.id; if (e.a === n.id) { st.s = 0; st.dir = 1; } else { st.s = e.len; st.dir = -1; } if (e.kind === 'lift') st.mode = 'lift'; else if (e.kind === 'ski') st.mode = 'ski'; }
  st.speed = 0; st.blocked = null;
  sim.placeHero();
  if (opts.edge) { const e = G.edges[opts.edge]; if (e) { st.edge = e.id; st.s = opts.s || 0; st.dir = opts.dir || 1; st.mode = e.kind === 'lift' ? 'lift' : e.kind === 'ski' ? 'ski' : 'rail'; st.node = null; sim.placeHero(); } }
  if (A.boss) st.flags['boss_' + A.boss + '_seen'] = st.flags['boss_' + A.boss + '_seen'] || false;
  st.hint = ''; sim.updateObjective();
  if (from !== id) { S7.bus.emit('area', { from, to: id }); }
  sim.directCamera(0, true);
  sim.fireTriggers('node', n.id);
  return A;
};
sim.placeHero = function () {
  const e = G.edges[st.edge]; if (!e) return;
  edgePos(e, st.s, _p); st.x = _p.x; st.y = _p.y; st.z = _p.z;
  const ang = _p.ang + (st.dir < 0 ? Math.PI : 0); st.face = ang;
};
sim.setupJunction = function (n, fromEdge) {
  const opts = [];
  for (const e of n.edges) {
    if (fromEdge && e.id === fromEdge) continue;
    const atA = e.a === n.id; const s0 = atA ? Math.min(2.2, e.len) : Math.max(0, e.len - 2.2); edgePos(e, s0, _q);
    const ang = Math.atan2(_q.y - n.y, _q.x - n.x);
    opts.push({ edge: e.id, dir: atA ? 1 : -1, s: atA ? 0 : e.len, ang, x: n.x + Math.cos(ang) * 1.9, y: n.y + Math.sin(ang) * 1.9, gate: e.gate, label: S7.edgeLabel(e) });
  }
  st.options = opts; st.sel = Math.min(st.sel, Math.max(0, opts.length - 1));
};
S7.edgeLabel = e => {
  const A = G.A, t = e.b === 'elev' || (G.nodes[e.b] && G.nodes[e.b].kind === 'exit') ? 'EXIT' : '';
  if (e.gate && A.gates && A.gates[e.gate]) return A.gates[e.gate].label;
  return t;
};

// ---------------------------------------------------------------- the walker
const isOpen = gateId => !!st.gates[st.area + ':' + gateId];
sim.gateOpen = isOpen;
function gateBlocked(e, s, ns) {
  if (!e.gate || isOpen(e.gate)) return false;
  return s <= e.gateS - .55 && ns > e.gateS - .55;   // blocked only when walking from the a-end toward b
}
function steerDot(angle) {   // the stick vector against a world angle seen from the current camera: returns [right, up]
  const cy = Math.atan2(st.cam.ly - st.cam.y, st.cam.lx - st.cam.x), dx = Math.cos(angle), dy = Math.sin(angle);
  return [dx * -Math.sin(cy) + dy * Math.cos(cy), dx * Math.cos(cy) + dy * Math.sin(cy)];
}
sim.steerDot = steerDot;
sim.walkSpeed = () => S7.T('walkSpeed') * (st.tuck > 0 ? 1.9 : 1) * (st.cheats.fast ? 1.8 : 1);

function arrive(nodeId, fromEdge) {
  const n = G.nodes[nodeId]; st.node = n.id; st.x = n.x; st.y = n.y; st.z = n.z; st.speed = 0;
  S7.bus.emit('arrive', { node: n.id });
  if (n.kind === 'exit' && n.to) {
    if (n.needs && !st.items[n.needs]) { st.hint = 'LOCKED: you need the ' + (S7.reg.items[n.needs] ? S7.reg.items[n.needs].name : n.needs); S7.bus.emit('gate', { ok: false, text: st.hint }); return; }
    const A = G.A;
    if (A.boss && !st.bosses[A.boss] && n.kind === 'exit' && !(A.boss && st.bosses[A.boss])) { /* exits in boss rooms are behind a locked edge */ }
    sim.leaveArea(n.to[0], n.to[1]); return;
  }
  sim.fireTriggers('node', n.id);
  if (st.mode === 'talk' || st.mode === 'cutscene') return;
  const inc = n.edges.filter(e => e.id !== fromEdge);
  if (n.edges.length >= 3) { st.mode = 'junction'; st.jLock = true; st.sel = 0; sim.setupJunction(n, fromEdge); sim.pickDefaultOption(); }
  else if (inc.length === 1 && n.kind !== 'exit' && !n.stop) {
    const e = inc[0]; st.edge = e.id; if (e.a === n.id) { st.s = 0; st.dir = 1; } else { st.s = e.len; st.dir = -1; }
    st.mode = e.kind === 'lift' ? 'lift' : e.kind === 'ski' ? 'ski' : 'rail';
  } else { st.mode = n.edges.length && G.edges[st.edge] && G.edges[st.edge].kind === 'ski' ? 'ski' : 'rail'; st.speed = 0; st.atEnd = n.id; }
}
sim.pickDefaultOption = function () {
  // prefer the option that continues the way we were heading, from the camera's view: the one nearest "up"
  let best = 0, bv = -9;
  st.options.forEach((o, i) => { const v = steerDot(o.ang)[1] - (o.gate && !isOpen(o.gate) ? .3 : 0); if (v > bv) { bv = v; best = i; } });
  st.sel = best;
};
sim.chooseOption = function (i) {
  const o = st.options[i]; if (!o) return false;
  const e = G.edges[o.edge]; st.edge = e.id; st.s = o.s; st.dir = o.dir; st.node = null; st.mode = e.kind === 'lift' ? 'lift' : e.kind === 'ski' ? 'ski' : 'rail';
  st.speed = e.kind === 'ski' ? 3 : 0; st.options = []; S7.bus.emit('branch', { edge: e.id });
  sim.placeHero(); return true;
};

sim.leaveArea = function (to, node) {
  S7.bus.emit('leave', { to, node });
  st.pendingArea = { to, node }; st.mode = 'transition'; st.transT = .5;
};

function stepWalker(dt, I) {
  const e = G.edges[st.edge]; if (!e) return;
  const mode = st.mode === 'aim' ? (st.preAim === 'lift' || st.preAim === 'ski' ? st.preAim : null) : st.mode;
  if (!mode) return;
  st.aimMove = st.mode === 'aim';
  if (mode === 'junction') {
    const stk = I.stick || [0, 0], mag = Math.hypot(stk[0], stk[1]);
    if (I.branch !== undefined && I.branch !== null && I.branch >= 0 && I.branch < st.options.length) { st.sel = I.branch; if (sim.chooseOption(st.sel)) return; }
    if (I.hover !== undefined && I.hover !== null && I.hover < st.options.length && I.hover !== st.sel) { st.sel = I.hover; S7.bus.emit('select', {}); }
    if (st.jLock) { if (mag < .3 && !I.go) st.jLock = false; return; }
    if (st.options.length) {
      if (mag > .45) {
        let best = st.sel, bv = -9; st.options.forEach((o, i) => { const v = steerDot(o.ang), d = v[0] * stk[0] + v[1] * (-stk[1]); if (d > bv) { bv = d; best = i; } });
        if (best !== st.sel) { st.sel = best; S7.bus.emit('select', {}); }
      }
      if (I.branch !== undefined && I.branch !== null && I.branch >= 0 && I.branch < st.options.length) { st.sel = I.branch; if (sim.chooseOption(st.sel)) return; }
      if (I.cycle) { st.sel = (st.sel + I.cycle + st.options.length) % st.options.length; S7.bus.emit('select', {}); }
      if (I.go || (mag > .6 && I.stickCommit !== false)) { sim.chooseOption(st.sel); }
    }
    if (I.turn && e) { const n = G.nodes[st.node]; /* about-face from a junction goes back where we came from */ if (st.backEdge) { const be = G.edges[st.backEdge]; const i = st.options.findIndex(o => o.edge === be.id); if (i >= 0) sim.chooseOption(i); } }
    return;
  }
  if (mode === 'ski') return stepSki(dt, I, e);
  if (mode === 'lift') return stepLift(dt, I, e);
  // ---- rail: hold go to run, tap turn to about-face
  if (st.turnT > 0) { st.turnT -= dt; st.speed = 0; return; }
  if (I.turn) { st.dir = -st.dir; st.turnT = S7.T('turnTime'); S7.bus.emit('turn', {}); st.node = st.node; sim.placeHero(); return; }
  const target = I.go ? sim.walkSpeed() : 0;
  st.speed = S7.approach(st.speed, target, (I.go ? 18 : 30) * dt);
  if (st.speed < .01) return;
  const ns = st.s + st.dir * st.speed * dt;
  if (gateBlocked(e, st.s, ns)) { st.s = e.gateS - .55; st.speed = 0; if (st.blocked !== e.gate) { st.blocked = e.gate; sim.onGateBlocked(e); } sim.placeHero(); return; }
  st.blocked = null; st.node = null; st.atEnd = null;
  if (e.locked && !st.bosses[G.A.boss] && ((st.dir > 0 && ns >= e.len - .3) )) { st.s = e.len - .3; st.speed = 0; st.hint = 'THE WAY OUT OPENS WHEN THE BOSS IS DOWN'; return; }
  if (ns >= e.len) { st.s = e.len; arriveFrom(e, e.b, e.id); }
  else if (ns <= 0) { st.s = 0; arriveFrom(e, e.a, e.id); }
  else { st.s = ns; sim.placeHero(); }
}
sim.stepWalker = stepWalker;
function arriveFrom(e, nodeId, edgeId) { st.backEdge = edgeId; st.prevDir = st.dir; sim.placeHero(); arrive(nodeId, edgeId); if (st.mode === 'rail' && st.node) { /* standing at a node */ } }

// ---- skiing: automatic downhill with momentum, hockey stop, tuck
function stepSki(dt, I, e) {
  const A = G.A, steep = e.steep ? 1.25 : 1;
  const top = S7.T('skiSpeed') * steep * (I.go ? 1.12 : 1) * (st.tuck > 0 ? 1.18 : 1);
  if (I.turn) { st.braking = true; } else if (I.go || (I.stick && Math.hypot(I.stick[0], I.stick[1]) > .5)) st.braking = false;
  if (st.aimMove) { st.speed = S7.approach(st.speed, Math.min(top * .4, 6), 10 * dt); }
  else if (st.braking) st.speed = S7.approach(st.speed, 0, 30 * dt);
  else st.speed = S7.approach(st.speed, top, S7.T('skiAccel') * dt * (I.go ? 1.3 : 1));
  const ns = st.s + st.dir * st.speed * dt;
  if (ns >= e.len) { st.s = e.len; arriveFrom(e, e.b, e.id); if (st.mode === 'ski' || st.mode === 'rail') {} }
  else if (ns <= 0) { st.s = 0; arriveFrom(e, e.a, e.id); }
  else { st.s = ns; sim.placeHero(); }
  if (st.echo) sim.echoTick(dt);
}
function stepLift(dt, I, e) {
  st.speed = S7.approach(st.speed, 5.5, 8 * dt);
  const ns = st.s + st.dir * st.speed * dt;
  if (ns >= e.len) { st.s = e.len; arriveFrom(e, e.b, e.id); }
  else if (ns <= 0) { st.s = 0; arriveFrom(e, e.a, e.id); }
  else { st.s = ns; sim.placeHero(); }
}

// ---------------------------------------------------------------- the camera director
// Killer7 cuts hard between fixed shots: each stretch of rail has a shot from the side, high, looking at the hero.
const _c = {};
sim.directCamera = function (dt, snap) {
  const A = G.A, c = st.cam;
  if (st.mode === 'aim') {
    const eye = 1.55, a = st.aim, cp = Math.cos(a.pitch);
    c.mode = 'first'; c.x = st.x; c.y = st.y; c.z = st.z + eye; c.lx = c.x + Math.cos(a.yaw) * cp; c.ly = c.y + Math.sin(a.yaw) * cp; c.lz = c.z + Math.sin(a.pitch);
    c.fov = a.zoom ? 26 : S7.T('aimFov'); return;
  }
  c.mode = 'fixed'; c.fov = A.cam ? A.cam.fov : 58;
  if (st.cut && st.cut.cam) { const k = st.cut.cam; c.x = k.at[0]; c.y = k.at[1]; c.z = k.at[2]; c.lx = k.look[0]; c.ly = k.look[1]; c.lz = k.look[2]; c.fov = k.fov || 55; return; }
  if (A.cam) {
    c.x = A.cam.at[0]; c.y = A.cam.at[1]; c.z = A.cam.at[2];
    if (A.boss) { const b = st.boss; c.lx = (A.cam.look[0] + st.x) / 2; c.ly = (A.cam.look[1] + st.y) / 2 + 1; c.lz = A.cam.look[2]; c.fov = A.cam.fov; }
    else { c.lx = (A.cam.look[0] * .6 + st.x * .4); c.ly = (A.cam.look[1] * .6 + st.y * .4); c.lz = A.cam.look[2]; }
    return;
  }
  const e = G.edges[st.edge]; if (!e) return;
  if (st.mode === 'ski' || st.mode === 'lift') {
    const ahead = Math.min(e.len, st.s + st.dir * 8); edgePos(e, ahead, _c);
    const ang = st.face, back = st.mode === 'lift' ? 0 : 7.5, side = st.mode === 'lift' ? 9 : 1.6, up = st.mode === 'lift' ? 1.0 : 3.1;
    const tx = st.x - Math.cos(ang) * back + Math.cos(ang + Math.PI / 2) * side, ty = st.y - Math.sin(ang) * back + Math.sin(ang + Math.PI / 2) * side;
    const k = snap ? 1 : 1 - Math.pow(.0005, dt);
    const tz = st.mode === 'lift' ? st.z + 2.6 : (A.height ? A.height(tx, ty) : st.z) + up + 1.2;
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * k;
    if (snap) { c.x = tx; c.y = ty; c.z = tz; }
    c.lx = _c.x * .5 + st.x * .5; c.ly = _c.y * .5 + st.y * .5; c.lz = st.z + 1.2; c.fov = st.mode === 'lift' ? 62 : 66; c.seg = -1; return;
  }
  // rail: a fixed shot per stretch of edge
  const seg = 10, k = Math.floor(st.s / seg), key = st.edge + ':' + k;
  if (c.key !== key || snap) {
    c.key = key; const mid = Math.min(e.len, (k + .5) * seg); edgePos(e, mid, _c);
    let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    const side = (h & 1) ? 1 : -1, ang = _c.ang + side * Math.PI / 2, dist = 6.0 + (Math.abs(h) % 3);
    let cx = _c.x + Math.cos(ang) * dist, cy = _c.y + Math.sin(ang) * dist;
    cx = S7.clamp(cx, 1.6, A.w - 1.6); cy = S7.clamp(cy, 1.6, A.h - 1.6);
    c.x = cx; c.y = cy; c.z = (A.height ? A.height(cx, cy) : (A.floorZ || 0)) + 3.6 + (Math.abs(h >> 3) % 3) * .5;
    c.fov = 56 + (Math.abs(h >> 5) % 3) * 4; S7.bus.emit('cut', {});
  }
  c.lx = st.x; c.ly = st.y; c.lz = st.z + 1.1;
};
