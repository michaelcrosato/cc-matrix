/* 24-objects: shootable things in the world: breakables (crates, windows, paper lanterns, market goods, signs),
 * explosive barrels and tanks (chain reactions), life rings (1UP), intel bottles, the sluice locks, training
 * targets. Each has a local mesh (built once per kind) and a box for rays. Explosions hurt enemies only. */
const OBJ = {
  barrel: { hp: 2, box: [-6, -6, 0, 6, 6, 17], explode: 56, dmg: 8, score: 300, impact: 'metal',
    build: G => { G.cyl('hull-red', 0, 0, 0, 6, 17, { seg: 10, top: 'steel-dk' }); G.cyl('hazard', 0, 0, 7, 6.3, 3, { seg: 10, caps: false }); } },
  tank: { hp: 3, box: [-9, -9, 0, 9, 9, 30], explode: 70, dmg: 9, score: 500, impact: 'metal', vapor: true,
    build: G => { G.cyl('hull-white', 0, 0, 0, 9, 26, { seg: 12 }); G.lathe('hull-white', 0, 0, 26, [[9, 0], [6, 3], [0, 4]], { seg: 12 }); G.cyl('hazard', 0, 0, 10, 9.3, 3, { seg: 12, caps: false }); } },
  generator: { hp: 3, box: [-10, -7, 0, 10, 7, 18], explode: 70, dmg: 9, score: 500, impact: 'metal',
    build: G => { G.box('hull-red', -10, -7, 0, 10, 7, 14, { top: 'steel-dk' }); G.cyl('steel-dk', -5, 0, 14, 3, 4); G.box('hazard', -10.2, -7.2, 5, 10.2, 7.2, 7); } },
  fuel: { hp: 3, box: [-7, -7, 0, 7, 7, 18], explode: 60, dmg: 10, score: 300, impact: 'metal',
    build: G => { G.cyl('paint-orange', 0, 0, 0, 7, 18, { seg: 10 }); G.cyl('hazard', 0, 0, 8, 7.3, 2.5, { seg: 10, caps: false }); } },
  crate: { hp: 3, box: [-8, -8, 0, 8, 8, 15], score: 50, impact: 'wood', debris: 'wood', blocks: true, build: G => G.box('crate', -8, -8, 0, 8, 8, 15, { solid: false }) },
  lantern: { hp: 1, box: [-3, -3, -6, 3, 3, 1], score: 50, impact: 'cloth', debris: 'fire', hang: true,
    build: G => { G.lathe('paper-lantern', 0, 0, -6, [[0, 0], [2.6, .8], [3.2, 3], [2.6, 5.2], [0, 6]], { seg: 8 }); } },
  lanternR: { hp: 1, box: [-3, -3, -6, 3, 3, 1], score: 50, impact: 'cloth', debris: 'fire', hang: true,
    build: G => { G.lathe('lantern-red', 0, 0, -6, [[0, 0], [2.6, .8], [3.2, 3], [2.6, 5.2], [0, 6]], { seg: 8 }); } },
  goods: { hp: 1, box: [-6, -3, 0, 6, 3, 7], score: 50, impact: 'glass', debris: 'glass',
    build: G => { for (let i = -2; i <= 2; i++) G.cyl(i % 2 ? 'glass' : 'paint-green', i * 2.4, 0, 0, 1, 5 + (i & 1) * 1.5, { seg: 6 }); } },
  window: { hp: 1, box: [-1, -9, 0, 1, 9, 14], score: 50, impact: 'glass', debris: 'glass', blocks: true,
    build: G => G.box('glass-lit', -.5, -9, 0, .5, 9, 14, { solid: false }) },
  sign: { hp: 2, box: [-1, -10, 0, 1, 10, 8], score: 50, impact: 'wood', debris: 'wood', swing: true,
    build: G => G.box('plywood', -.5, -10, 0, .5, 10, 8, { solid: false }) },
  lifering: { hp: 1, box: [-6, -2, -6, 6, 2, 6], score: 2000, impact: 'cloth', bonus: 'life',
    build: G => { for (let i = 0; i < 12; i++) { const a0 = i / 12 * TAU, a1 = (i + 1) / 12 * TAU; G.tube(i % 3 === 0 ? 'cloth-red' : 'canvas', [0, Math.cos(a0) * 5, Math.sin(a0) * 5], [0, Math.cos(a1) * 5, Math.sin(a1) * 5], 1.4, { seg: 6, caps: false }); } } },
  intel: { hp: 1, box: [-2.5, -2.5, 0, 2.5, 2.5, 9], score: 2000, impact: 'glass', bonus: 'intel', debris: 'glass',
    build: G => { G.lathe('paint-green', 0, 0, 0, [[0, 0], [2, 0], [2.2, 4.5], [.9, 6.5], [.8, 8.5], [0, 9]], { seg: 8 }); G.box('canvas', -.6, -.6, 2, .6, .6, 4); } },
  lock: { hp: 6, box: [-6, -6, -6, 6, 6, 6], score: 1500, impact: 'metal', objective: true,
    build: G => { G.box('panel-dark', -6, -5, -6, 6, 5, 6); G.box('glow-amber', -6.4, -3, -2, 6.4, 3, 2, { solid: false }); } },
  target: { hp: 1, box: [-6, -1, 0, 6, 1, 26], score: 500, impact: 'wood', debris: 'wood', popup: true,
    build: G => { G.box('plywood', -6, -.6, 0, 6, .6, 18); G.box('plywood', -3, -.6, 18, 3, .6, 26); G.box('glow-red', -3, -.8, 13, 3, -.6, 16, { solid: false }); } },
  civtarget: { hp: 1, box: [-6, -1, 0, 6, 1, 26], score: 0, impact: 'wood', debris: 'wood', popup: true, civ: true,
    build: G => { G.box('plaster-blue', -6, -.6, 0, 6, .6, 18); G.box('plaster-blue', -3, -.6, 18, 3, .6, 26); G.box('glow-green', -3, -.8, 13, 3, -.6, 16, { solid: false }); } },
  qmtarget: { hp: 1, box: [-6, -1, 0, 6, 1, 26], score: 500, impact: 'wood', debris: 'wood', popup: true, drop: 'mg',
    build: G => { G.box('paint-orange', -6, -.6, 0, 6, .6, 18); G.box('paint-orange', -3, -.6, 18, 3, .6, 26); } },
  shieldtarget: { hp: 1, box: [-7, -1, 0, 7, 1, 26], score: 800, impact: 'metal', popup: true, needs: ['sg', 'gl'],
    build: G => { G.box('panel-steel', -7, -.8, 0, 7, .8, 24); G.box('glass', -4, -1, 16, 4, -.8, 22, { solid: false }); } },
  dronetarget: { hp: 2, box: [-5, -5, -3, 5, 5, 3], score: 500, impact: 'metal', fly: true,
    build: G => { G.box('steel-dk', -4, -4, -2, 4, 4, 2); for (const [x, y] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) G.cyl('rubber', x, y, 2, 2.6, .5, { seg: 8 }); G.box('glow-red', 4, -1, -1, 4.6, 1, 1, { solid: false }); } },
  stack: { hp: 4, box: [-12, -10, 0, 12, 10, 26], score: 800, impact: 'wood', debris: 'wood', needs: ['gl'],
    build: G => { G.box('crate', -12, -10, 0, 0, 0, 13); G.box('crate', 0, -10, 0, 12, 0, 13); G.box('crate', -12, 0, 0, 0, 10, 13); G.box('crate', 0, 0, 0, 12, 10, 13); G.box('crate', -6, -6, 13, 6, 6, 26); } },
  barricade: { hp: 6, box: [-24, -5, 0, 24, 5, 22], score: 1000, impact: 'metal', debris: 'metal', needs: ['gl'], blocks: true,
    build: G => { G.box('hazard', -24, -4, 0, 24, 4, 18); G.box('steel-dk', -26, -5, 0, -22, 5, 22); G.box('steel-dk', 22, -5, 0, 26, 5, 22); G.box('panel-steel', -20, -3, 18, 20, 3, 22); } }
};
TC.OBJ = OBJ;
const OBJ_MESH = new Map();
function objMesh(kind) { let m = OBJ_MESH.get(kind); if (!m) { const G = new Builder({ local: true, maxEdge: 64 }); OBJ[kind].build(G); m = G.mesh(); OBJ_MESH.set(kind, m); } return m; }
TC.objMesh = objMesh;

function addObject(sim, kind, at, o = {}) {
  const K = OBJ[kind]; if (!K) throw new Error('unknown object ' + kind);
  const ob = { id: sim.nid(), kind, K, at: at.slice(), yaw: o.yaw || 0, hp: K.hp, alive: true, t: 0, flash: 0, o, up: K.popup ? (o.up === undefined ? 0 : o.up) : 1, chain: 0, scene: o.scene || null };
  const b = K.box, c = Math.cos(ob.yaw), s = Math.sin(ob.yaw), xs = [], ys = [];
  for (const [x, y] of [[b[0], b[1]], [b[3], b[1]], [b[3], b[4]], [b[0], b[4]]]) { xs.push(at[0] + x * c - y * s); ys.push(at[1] + x * s + y * c); }
  ob.box = [Math.min(...xs), Math.min(...ys), at[2] + b[2], Math.max(...xs), Math.max(...ys), at[2] + b[5]];
  ob.col = { box: ob.box, yaw: 0, cx: 0, cy: 0, impact: K.impact, alive: true, obj: ob };
  sim.objects.push(ob);
  return ob;
}
TC.addObject = addObject;
function objectsStep(sim, dt) {
  for (const ob of sim.objects) {
    ob.t += dt; ob.flash = Math.max(0, ob.flash - dt * 8);
    if (ob.K.popup) { const want = ob.alive && ob.raised ? 1 : 0; ob.up += (want - ob.up) * Math.min(1, dt * 10); }
    if (ob.K.fly && ob.alive && ob.path) { ob.ph = (ob.ph || 0) + dt * 1.2; ob.at[0] = ob.path[0] + Math.cos(ob.ph) * ob.path[3]; ob.at[1] = ob.path[1] + Math.sin(ob.ph * 1.4) * ob.path[3]; ob.at[2] = ob.path[2] + Math.sin(ob.ph * 2) * 6; const b = ob.K.box; ob.box = [ob.at[0] + b[0], ob.at[1] + b[1], ob.at[2] + b[2], ob.at[0] + b[3], ob.at[1] + b[4], ob.at[2] + b[5]]; ob.col.box = ob.box; }
    if (ob.chain > 0) { ob.chain -= dt; if (ob.chain <= 0 && ob.alive) breakObject(sim, ob, ob.chainBy); }
    if (!ob.alive && ob.K.hang && ob.fall !== undefined) { ob.fall += dt; ob.at[2] = Math.max(ob.floor || 0, ob.at[2] - ob.fall * ob.fall * 160 * dt); }
  }
}
TC.objectsStep = objectsStep;
function hitObject(sim, ob, p, dmg, w) {
  if (!ob.alive || (ob.K.popup && ob.up < .6)) return { kind: 'obj', scoring: false };
  if (ob.K.needs && !(w && ob.K.needs.includes(w))) { ob.flash = .5; sim.ev({ type: 'impact', at: null, mat: ob.K.impact, ob: ob.id }); return { kind: 'deflect', scoring: false }; }
  ob.hp -= dmg; ob.flash = 1;
  if (ob.hp <= 0) breakObject(sim, ob, p);
  return { kind: 'obj', scoring: !!(ob.K.bonus || ob.K.score >= 500), bonus: !!ob.K.bonus };
}
TC.hitObject = hitObject;
function breakObject(sim, ob, p) {
  if (!ob.alive) return;
  ob.alive = false; ob.col.alive = false; ob.hp = 0;
  const K = ob.K, mid = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, (ob.box[2] + ob.box[5]) / 2];
  if (p && K.score) addScore(sim, p, K.score, mid);
  if (K.hang) { ob.fall = 0; ob.floor = ob.o.floor || 0; }
  if (K.explode) sim.explode(mid, K.explode, K.dmg, p ? p.id : -1, false, ob.kind);
  if (K.bonus === 'life' && p) { p.lives++; sim.ev({ type: '1up', p: p.id, ring: true }); }
  if (K.bonus === 'intel' && p) sim.ev({ type: 'intel', p: p.id, n: ob.o.n || 0 });
  if (K.drop && p) givePickup(sim, p, K.drop, 30);
  if (K.civ && p) { addScore(sim, p, -2000, mid, true); if (p.score < 0) p.score = 0; sim.ev({ type: 'civhit', p: p.id, range: true }); }
  sim.ev({ type: 'break', ob: ob.id, kind: ob.kind, at: mid, debris: K.debris || K.impact, vapor: !!K.vapor });
  if (ob.o.onBreak) sim.cue(ob.o.onBreak, ob);
}
TC.breakObject = breakObject;

/** an explosion: enemies inside take damage (falling off with distance), objects break or chain, players never */
function explode(sim, at, r, dmg, owner, air, kind) {
  const p = owner >= 0 ? sim.players[owner] : null;
  sim.ev({ type: 'explode', at: at.slice(), r, kind: kind || 'blast', big: r >= 50 });
  if (dmg > 0) {
    let kills = 0;
    for (const e of sim.enemies) {
      if (!e.alive || e.civ || e.ally) continue;
      const d = Math.hypot(e.x - at[0], e.y - at[1], e.z + 14 - at[2]); if (d > r) continue;
      const k = lerp(1, .25, d / r), was = e.alive;
      damageEnemy(sim, e, dmg * k, p, 'blast', { weapon: kind === 'gl' ? 'gl' : null });
      if (was && !e.alive) kills++;
    }
    for (const ob of sim.objects) {
      if (!ob.alive || ob.K.bonus) continue;
      const c = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, (ob.box[2] + ob.box[5]) / 2], d = V3.dist(c, at);
      if (d > r) continue;
      if (ob.K.explode) { if (!ob.chain) { ob.chain = .15; ob.chainBy = p; } }
      else if (!ob.K.popup && !ob.K.needs || (ob.K.needs && kind === 'gl')) { ob.hp -= dmg * .5; if (ob.hp <= 0) breakObject(sim, ob, p); }
    }
    if (sim.boss && sim.boss.blast) sim.boss.blast(sim, at, r, dmg, p, kind);
    if (p && kills >= 2) sim.ev({ type: 'multikill', p: p.id, n: kills });
  }
}
TC.explode = explode;
