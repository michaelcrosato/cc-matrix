/* ---- THE GRAPPLING HOOK (kaginawa): the only way onto the roofs. Anchors are the edges of tops 16..96 above the feet
 * within 112 (the sliders), with a clear rope line and room to land, plus the level's tree anchors (a swing to a landing).
 * The best one in a 70° cone glints; tap R1 / G fires; hold to aim in slow motion; the mouse picks the one under it ---- */
const Grapple = { cands: [], best: null, scanT: 0, holdT: 0, aiming: false, cd: 0, rope: null };
/** the anchors in reach of a body: [{ x, y, z (the hook), land: { x, y, z }, d, tree }] */
Grapple.anchors = (h, M) => {
  const W = M.world, map = W.map, range = T('grappleRange'), rise = 96, out = [], cx0 = toCell(h.x), cy0 = toCell(h.y), R = Math.ceil(range / 16) + 1;
  const hand = { x: h.x, y: h.y, z: h.z + 28 };
  for (let cy = cy0 - R; cy <= cy0 + R; cy++) for (let cx = cx0 - R; cx <= cx0 + R; cx++) {
    if (cx < 0 || cy < 0 || cx >= W.w || cy >= W.h) continue;
    const ch = W.rows[cy][cx]; if (!WALLTYPES[ch] || ch === 'H' || ch === 'F' || ch === 'P') continue;
    const top = map.height(cx, cy); if (top - h.z < 16 || top - h.z > rise) continue;
    for (const [nx, ny] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {   // a face toward a lower neighbour, facing the hero
      const nh = map.height(cx + nx, cy + ny); if (nh >= top - 8) continue;
      const ex = cellC(cx) + nx * 8, ey = cellC(cy) + ny * 8;
      if ((h.x - ex) * nx + (h.y - ey) * ny < 0) continue;
      const d = Math.hypot(ex - h.x, ey - h.y); if (d > range || d < 6) continue;
      const land = { x: ex - nx * 6, y: ey - ny * 6, z: top };
      if (!map.standable(land.x, land.y, top, 4)) continue;
      const hook = { x: ex + nx * 1.5, y: ey + ny * 1.5, z: top + 2 };
      if (!map.ray(hand, hook).clear) continue;
      out.push({ x: ex, y: ey, z: top, land, d, nx, ny, cx, cy });
    }
  }
  for (const a of W.anchors) {   // a tree crown: the rope swings the hero to its landing
    const d = Math.hypot(a.x - h.x, a.y - h.y); if (d > range || a.z - h.z < 16) continue;
    const land = a.land || { x: a.x, y: a.y + 24, z: 0 };
    out.push({ x: a.x, y: a.y, z: a.z, land: { x: land.x, y: land.y, z: map.groundAt(land.x, land.y) }, d, tree: true });
  }
  return out;
};
/** pick the best anchor: the cursor's (mouse mode), else by angle to the facing (or aim) and distance, within 70° */
Grapple.pick = (h, it, list) => {
  if (!list.length) return null;
  if (it && it.mouseMode && game.input.pointer()) {
    const [px0, py0] = game.input.pointer(); let best = null, bd = 30;
    for (const a of list) if (a.sx !== undefined) { const d = Math.hypot(a.sx - px0, a.sy - py0); if (d < bd) { bd = d; best = a; } }
    if (best) return best;
  }
  let f = h.facing; const mv = it && it.move; if (mv && Math.hypot(mv[0], mv[1]) > .3) f = Math.atan2(mv[1], mv[0]);
  let best = null, bs = 1e9;
  for (const a of list) { const da = Math.abs(E.angDiff(f, Math.atan2(a.y - h.y, a.x - h.x))); if (da > 1.22) continue; const s = da * 60 + a.d * .5; if (s < bs) { bs = s; best = a; } }
  return best;
};
Grapple.update = (h, it, dt, M) => {
  Grapple.cd = Math.max(0, Grapple.cd - dt);
  if (h.swim || h.drag || h.dead || h.action) { Grapple.aiming = false; Grapple.cands = []; Grapple.best = null; return; }
  Grapple.scanT -= dt; if (it.grapplePressed) Grapple.scanT = 0;
  if (Grapple.scanT <= 0 || Grapple.aiming) { Grapple.scanT = .1; const old = Grapple.cands; Grapple.cands = Grapple.anchors(h, M); for (const a of Grapple.cands) { const o = old.find(q => q.x === a.x && q.y === a.y && q.z === a.z); if (o) { a.sx = o.sx; a.sy = o.sy; } } Grapple.best = Grapple.pick(h, it, Grapple.cands); }
  if (it.grapplePressed) { Grapple.holdT = 0; Grapple.down = true; }
  if (Grapple.down && it.grappleDown !== false && (it.grappleDown || !it.player)) { Grapple.holdT += dt / Math.max(.05, game.timeScale); if (Grapple.holdT > .22 && !Grapple.aiming && it.player) { Grapple.aiming = true; game.timeScale = .5; } }
  const release = Grapple.down && (it.grappleReleased || (!it.grappleDown && !Grapple.aiming));
  if (Grapple.aiming) Grapple.best = Grapple.pick(h, it, Grapple.cands);
  if (release) {
    Grapple.down = false;
    if (Grapple.aiming) { Grapple.aiming = false; if (!SilentCut.slowT) game.timeScale = (B.Dev && B.Dev.timeScale) || 1; }
    if (Grapple.best && Grapple.cd <= 0) Grapple.fire(h, Grapple.best, M);
  }
};
Grapple.fire = (h, a, M) => {
  const dist = Math.hypot(a.x - h.x, a.y - h.y, a.z - h.z), pull = Math.max(.15, dist / (T('grappleSpeed') * (h.C.pull || 1)));
  h.combo.cancel(); Hero.unhug(h); h.crouch = false;
  const act = h.play('grapple', { to: a, pull, map: M.world.map });
  Grapple.cd = .3; Au.sfx('grappleThrow');
  B.emit('grapple', { at: a });
  return act;
};
E.ACTIONS.grapple = {
  beats: [['throw', .16], ['pull', .5], ['mantle', .2]],
  setup(A) {
    const a = A.o.to; A.beats = [['throw', .16], ['pull', A.o.pull], [a.tree ? 'drop' : 'mantle', a.tree ? .35 : .2]];
    A.facing = Math.atan2(a.y - A.start.y, a.x - A.start.x); A.hook = { x: a.x + (a.nx || 0) * 1.5, y: a.y + (a.ny || 0) * 1.5, z: a.z + 2 };
    A.hang = a.tree ? { x: a.x, y: a.y, z: a.z - 22 } : { x: a.x + (a.nx || 0) * 5, y: a.y + (a.ny || 0) * 5, z: a.z - 22 };
    A.land = a.land; A.tree = !!a.tree; A.clinked = false;
  },
  post(A) { return A.beat === 'pull' ? Rigs.handsUp(1) : null; },
  at(A, b, u) {
    if (b === 'throw') return { x: A.start.x, y: A.start.y, z: A.start.z, state: { facing: A.facing, attack: E.move('throw', u) } };
    if (b === 'pull') {
      if (!A.clinked) { A.clinked = true; Au.sfx('grappleClink'); Au.sfx('grappleZip'); B.noise(A.hook.x, A.hook.y, A.hook.z, 30, 'hook'); }
      const p0 = A.start, p2 = A.hang, c = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2, z: Math.max(p0.z, p2.z) + 10 }, k = E.ease.inOutQuad(u), m = 1 - k;
      return { x: m * m * p0.x + 2 * m * k * c.x + k * k * p2.x, y: m * m * p0.y + 2 * m * k * c.y + k * k * p2.y, z: m * m * p0.z + 2 * m * k * c.z + k * k * p2.z, state: { facing: A.facing, air: true } };
    }
    if (b === 'drop') { const p = lp(A.hang, A.land, u); p.z = lerp(A.hang.z, A.land.z, u * u) + Math.sin(u * Math.PI) * 6; return Object.assign(p, { state: { facing: A.facing, air: true } }); }
    const up = Math.min(1, u * 1.6), p = lp(A.hang, A.land, E.ease.outQuad(u));
    p.z = lerp(A.hang.z, A.land.z, E.ease.outQuad(up));
    return Object.assign(p, { state: { facing: A.facing, hang: u < .45, hangZ: 22 * (1 - up), crouch: u >= .45 } });
  }
};
/** draw the rope (while thrown and pulling), the anchor glints and the aim mode's anchors */
Grapple.draw = (r, h) => {
  const a = h.action;
  if (a && a.name === 'grapple' && (a.beat === 'throw' || a.beat === 'pull')) {
    const hand = h.rig.hand('R'), hk = a.hook, u = a.beat === 'throw' ? a.t / .16 : 1;
    const end = { x: lerp(hand[0], hk.x, u), y: lerp(hand[1], hk.y, u), z: lerp(hand[2], hk.z, u) };
    r.queue((hand[0] + end.x) / 2, (hand[1] + end.y) / 2, Math.max(hand[2], end.z), g => {
      const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8, sag = Math.sin(k * Math.PI) * (a.beat === 'throw' ? 2 : 4) * (1 - (a.beat === 'pull' ? Math.min(1, (a.t - .16) / .25) : 0)); pts.push(r.w(lerp(hand[0], end.x, k), lerp(hand[1], end.y, k), lerp(hand[2], end.z, k) - sag)); }
      for (let i = 0; i < 8; i++) { px.line(g, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, '#2a2018'); px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#c8b080'); }
      const q = pts[8]; px.dot(g, q[0], q[1], '#ffffff'); px.dot(g, q[0] + 1, q[1] - 1, '#d8dce8');
    }, { bias: 2 });
  }
  if (h.action || h.dead) return;
  const show = Grapple.aiming ? Grapple.cands : Grapple.best ? [Grapple.best] : [];
  for (const c of Grapple.cands) { const p = r.w(c.x, c.y, c.z); c.sx = p[0]; c.sy = p[1]; }
  for (const c of show) {
    const best = c === Grapple.best, s = best ? 3 + Math.round(Math.sin(game.real * 8)) : 2;
    r.queue(c.x, c.y, c.z + 1, g => { const p = r.w(c.x, c.y, c.z + 1), col = best ? '#ffe08a' : '#b8a060'; px.line(g, p[0] - s, p[1], p[0], p[1] - s, col); px.line(g, p[0], p[1] - s, p[0] + s, p[1], col); px.line(g, p[0] + s, p[1], p[0], p[1] + s, col); px.line(g, p[0], p[1] + s, p[0] - s, p[1], col); if (best) px.dot(g, p[0], p[1], '#ffffff'); }, { emissive: true, bias: 3 });
  }
};
B.Grapple = Grapple;
