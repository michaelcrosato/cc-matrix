/* SET PIECES: LAWINE! (the avalanche chase on 01C), the Himmelsbahn ride (01D), the summit's cameras (01F), and the
 * machinery they draw with the pen. Sim parts first (deterministic, headless), then the pictures (THINGS3D). */

/* ---------------- LAWINE! ---------------- */
S7.lawineUpdate = (sim, dt) => {
  const L = sim.lawine; if (!L) return;
  L.t += dt;
  const W = sim.W, avV = .92 * 260 * sim.diff().avalanche;
  const v = W.air ? 420 : W.edge ? W.v : 0;
  L.gap += (v - avV) * dt;
  L.gap = Math.min(L.gap, 40 * M);
  if (W.edge === 'f2-vb' || (W.node && W.node === 'f2')) { sim.lawine = null; sim.st.flags.lawineDone = 1; sim.emit('lawine', { on: false }); sim.say('Out of the white.', { who: 'dagny' }); return; }
  if (L.gap <= 0 && !CHEAT.god && !sim.o.attract) {
    sim.lawine = null; sim.st.flags.lawineDone = 1; sim.emit('lawine', { on: false, caught: true });
    sim.freezePersona();
    const f2 = sim.rails.nodes.f2, ps = sim.st.roster[sim.st.persona === 'ansel' ? sim.st.lastPersona : sim.st.persona] || sim.pstate();
    for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; if (r.frozen && r.statue && r.statue.area === '01C') r.statue.at = [f2.x + 6, f2.y, f2.z]; }
    void ps;
  }
};
S7.lawineCamera = (sim, h) => {
  if (!sim.lawine || sim.aim.on) return null;
  const W = sim.W, e = W.edge && sim.rails.edges[W.edge]; if (!e) return null;
  const ahead = e.path.at(Math.min(e.length, W.s + 9 * M));
  return sim.cam._aim([ahead.x + 2 * M, ahead.y, ahead.z + 2.6 * M], [h.x, h.y, h.z + 1.4 * M], 64);
};
/** a statue on a node makes the walker stop there (the Sweep must reach it) */
Sim.prototype.statueAtNode = function (id) {
  const n = this.rails.nodes[id]; if (!n) return false;
  for (const pid of PERSONA_ORDER) { const s = this.st.roster[pid].statue; if (this.st.roster[pid].frozen && s && s.area === this.st.area && Math.hypot(s.at[0] - n.x, s.at[1] - n.y) < 2 * M) return true; }
  return false;
};

/* ---------------- the Himmelsbahn ---------------- */
S7.gondolaUpdate = (sim, dt) => {
  const G = sim.gondola || (sim.gondola = { t: 0, passT: 7, crawlT: 10, climbed: 0, swing: 0, cabins: [], climbers: [] });
  G.t += dt; G.swing = Math.max(0, G.swing - dt * .12);
  const h = sim.hero, W = sim.W, moving = W.edge && sim.rails.edges[W.edge].kind === 'lift';
  sim.cabinPos = () => [sim.hero.x, sim.hero.y, sim.hero.z + 3.4 * M];
  // a cabin passes on the down cable every 15 s with a Snowballer leaning out
  G.passT -= dt;
  if (G.passT <= 0 && moving) {
    G.passT = 15;
    const c = { y: h.y - 160 * M, x: h.x + 12 * M };
    c.e = sim.spawnEnemy('snowballer', [c.x, c.y], { reveal: 0 }); c.e.fly = true; c.e.fixed = true;
    G.cabins.push(c);
  }
  for (const c of G.cabins) {
    c.y += 200 * dt;   // the down cabins come toward us and pass behind
    const z = S7.cableZ(c.y / M) * M;
    if (c.e && c.e.alive) { c.e.x = c.x + 1.6 * M; c.e.y = c.y; c.e.z = z + .2 * M; }
    c.z = z;
  }
  G.cabins = G.cabins.filter(c => { if (c.y - h.y > 160 * M) { if (c.e && c.e.alive) { c.e.alive = false; c.e.gone = true; } return false; } return true; });
  // Cable Crawlers: hand over hand along our cable toward the cabin
  G.crawlT -= dt;
  if (G.crawlT <= 0 && moving) {
    G.crawlT = 11;
    for (let k = 0; k < 2; k++) {
      const ny = h.y - (38 + k * 9) * M, e = sim.spawnEnemy('crawler', [h.x, ny], { reveal: 0 });
      e.fly = true; e.z = S7.cableZ(ny / M) * M + 4.4 * M; e.hover = 0;
    }
  }
  // climbers at the windows (twice on the ride): they climb up over 6 s and burst in
  const u = W.edge === 'gs-mid' ? W.s / sim.rails.edges['gs-mid'].length * .55 : W.edge === 'mid-gl' ? .55 + W.s / sim.rails.edges['mid-gl'].length * .45 : W.node === 'mid' ? .55 : 0;
  if ((u > .25 && G.climbed === 0) || (u > .75 && G.climbed === 1)) {
    G.climbed++;
    for (const sd of [-1, 1]) { const e = sim.spawnEnemy('climber', [h.x + sd * 1.6 * M, h.y], { reveal: 0 }); e.fly = true; G.climbers.push({ e, sd, t: 0 }); }
  }
  for (const C of G.climbers) {
    if (!C.e.alive) continue; C.t += dt;
    C.e.x = h.x + C.sd * 1.7 * M; C.e.y = h.y + 6; C.e.z = h.z - 2.4 * M + Math.min(1, C.t / 6) * 2.6 * M; C.e.facing = C.sd > 0 ? Math.PI : 0;
    if (C.t > 6.4) sim.burst(C.e);
  }
  G.climbers = G.climbers.filter(C => C.e.alive);
  // the insulators: all three shot and the power comes back
  const f = sim.st.flags;
  if (f.ins1 && f.ins2 && f.ins3 && !f.powerBack && !sim.beats.some(b => b.id === 'power_back')) sim.startBeat('power_back');
  if (W.node === 'gl' || f.gondolaDone) f.gondolaDone = 1;
};
S7.gondolaCamera = (sim, h) => {
  if (sim.aim.on || sim.camOverride) return null;
  const G = sim.gondola || { t: 0, swing: 0 }, k = Math.floor((G.t || 0) / 6) % 3, roll = Math.sin((G.t || 0) * 2.2) * .08 * G.swing;
  let p;
  if (k === 0) p = sim.cam._aim([h.x + 1.6 * M, h.y + 1.8 * M, h.z + 2.2 * M], [h.x, h.y - 1 * M, h.z + 1.4 * M], 66);
  else if (k === 1) p = sim.cam._aim([h.x - 6 * M, h.y + 3 * M, h.z + 1.5 * M], [h.x, h.y, h.z + 1.6 * M], 54);
  else p = sim.cam._aim([h.x + 8 * M, h.y - 12 * M, h.z - 4 * M], [h.x, h.y, h.z + 2 * M], 50);
  p.roll = roll;
  return p;
};
/* ---------------- the summit ---------------- */
S7.summitCamera = (sim, h) => {
  const B = sim.boss; if (!B || sim.aim.on || sim.camOverride) return null;
  if (B.phase === 1 && sim.W.node && sim.W.node[0] === 'p') {   // over the shoulder toward the Avalaugh
    const c = [1000 * M, 290 * M], d = Math.atan2(c[1] - h.y, c[0] - h.x);
    return sim.cam.aimSafe(h, [h.x - Math.cos(d) * 7 * M + Math.cos(d + Math.PI / 2) * 2.4 * M, h.y - Math.sin(d) * 7 * M + Math.sin(d + Math.PI / 2) * 2.4 * M, h.z + 3.2 * M], [c[0], c[1], sim.grid.floorAt(c[0], c[1]) + 6 * M], 58);
  }
  return null;
};

/* ---------------- pictures ---------------- */
Object.assign(S7.THINGS3D, {
  drift(pen, th, t, w, sim) { if (sim.st.flags.churchBell && !(sim.dropT > 0)) return; pen.ball(0, 0, 10, 44, 34, 30, '#f0f4fc').ball(14, 6, 26, 26, 22, 18, '#ffffff').ball(-16, -4, 22, 22, 18, 16, '#e8eef8'); },
  gateslots(pen, th, t, w, sim) {
    const n = sim.st.flags.gateOpen ? 3 : Math.min(3, sim.st.items.edelweiss || 0);
    pen.box(0, 0, 18, 44, 4, 36, '#2a3448').box(0, 0, 38, 50, 6, 4, '#c8a040');
    for (let i = 0; i < 3; i++) { const x = (i - 1) * 13, on = i < n; pen.ball(x, 3, 22, 4, 1, 4, on ? '#f4f1ea' : '#4a5468'); if (on) pen.glow(x, 4, 22, 2.4, '#fff0c0'); }
  },
  echowall(pen, th, t, w, sim) { const open = sim.st.gates['01B:mirrors']; if (open) return; pen.box(0, 0, 48, 14, 48, 96, '#c8e0f0').box(0, 0, 48, 16, 52, 4, '#e0b040'); pen.glow(0, 0, 50 + Math.sin(t * 2) * 6, 3, '#e8f8ff'); },
  icelock(pen, th, t, w, sim) { if (sim.st.gates['01E:' + th.o.gate]) return; pen.box(0, 0, 30, 30, 10, 60, '#bfeaff').ball(0, 0, 40, 10, 6, 14, '#e8fbff').glow(0, 2, 30, 3, '#9ae0ff'); },
  chessboard(pen, th, t, w, sim) {
    if (!sim.epilogue) return;
    pen.box(0, 0, 0, 22, 22, 2, '#bfeaff');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) pen.box(-9.6 + i * 2.75, -9.6 + j * 2.75, 1.2, 2.6, 2.6, .5, '#7ac0e0');
    for (const [x, y, c] of [[-6, -6, '#f4f8ff'], [-3, -7, '#f4f8ff'], [4, 6, '#1a2a3a'], [6, 3, '#1a2a3a'], [0, 1, '#f4f8ff']]) pen.cone(x, y, 1, x, y, 7, 1.4, c).ball(x, y, 7.5, 1.2, 1.2, 1.2, c);
  },
  pistepoles(pen, th, t, w, sim) {
    if (!sim.rails) return;
    const c = pres3dCam();
    for (const id in sim.rails.edges) {
      const e = sim.rails.edges[id]; if (e.kind !== 'ski') continue;
      for (let s = 0; s < e.length; s += 18 * M) {
        const p = e.path.at(s); if (c && Math.hypot(p.x - c.x, p.y - c.y) > 260 * M) continue;
        const nx = Math.cos(p.yaw + Math.PI / 2) * 9 * M, ny = Math.sin(p.yaw + Math.PI / 2) * 9 * M;
        const col = e.label === 'BLUE' || id.startsWith('bl') ? '#2a6ad8' : '#f06a1e';
        pen.at(p.x + nx, p.y + ny, sim.grid.floorAt(p.x + nx, p.y + ny)).tube(0, 0, 0, 0, 0, 26, 1, col);
        pen.at(p.x - nx, p.y - ny, sim.grid.floorAt(p.x - nx, p.y - ny)).tube(0, 0, 0, 0, 0, 26, 1, col);
      }
    }
  },
  avalanche(pen, th, t, w, sim) {
    const L = sim.lawine; if (!L) return;
    const h = sim.hero, yaw = sim.W.yaw, bx = h.x - Math.cos(yaw) * L.gap, by = h.y - Math.sin(yaw) * L.gap, bz = sim.grid.floorAt(bx, by);
    for (let i = -6; i <= 6; i++) {
      const ox = Math.cos(yaw + Math.PI / 2) * i * 22, oy = Math.sin(yaw + Math.PI / 2) * i * 22, s = 26 + Math.sin(t * 4 + i) * 6;
      pen.at(bx + ox, by + oy, bz).ball(0, 0, s, s * 1.2, s * 1.2, s, '#f4f8ff').ball(-20, 0, s * 1.6, s, s, s * .9, '#e0e8f4').glow(Math.sin(t * 7 + i) * 10, 0, s * 1.4, 6, '#e8f4ff');
      if (i % 3 === 0) pen.box(Math.cos(yaw) * s, Math.sin(yaw) * s, s * 1.2, 8, 3, 2, '#08080c');   // a laughing face in the wall
    }
  },
  cablecar(pen, th, t, w, sim) {
    const A = S7.CABLE, h = sim.hero, c = pres3dCam(), G = sim.gondola || { swing: 0, cabins: [], t: 0 };
    // the cables: ours and the down cable beside it, in segments near the camera
    for (let n = A.a[1]; n > A.b[1]; n -= 40) {
      if (c && Math.abs(n * M - c.y) > 600 * M) continue;
      const z0 = S7.cableZ(n) * M + 4.5 * M, z1 = S7.cableZ(n - 40) * M + 4.5 * M;
      pen.at().tube(A.a[0] * M, n * M, z0, A.a[0] * M, (n - 40) * M, z1, .8, '#2a2a30').tube(A.a[0] * M + 12 * M, n * M, z0, A.a[0] * M + 12 * M, (n - 40) * M, z1, .8, '#2a2a30');
    }
    // pylons every 200 m, the next one's insulators frozen until shot
    for (let n = A.a[1] - 100; n > A.b[1]; n -= 200) {
      if (c && Math.abs(n * M - c.y) > 900 * M) continue;
      const z = S7.cableZ(n) * M + 4.5 * M, g = sim.grid.floorAt(A.a[0] * M + 6 * M, n * M);
      pen.at(A.a[0] * M + 6 * M, n * M, g).box(0, 0, (z - g) / 2, 6, 6, z - g, '#5a6068').box(0, 0, z - g + 2, 30 * M / 16, 8, 6, '#5a6068');
    }
    const iy = (1880 - 1760 * .55 - 80);
    for (const [k, dx, dz] of [['ins1', -3, 1.5], ['ins2', 3, 1.5], ['ins3', 0, 4]]) if (!sim.st.flags[k]) pen.at(A.a[0] * M + dx * M, iy * M, S7.cableZ(iy) * M + dz * M).ball(0, 0, 0, 10, 10, 14, '#bfeaff').glow(0, 0, 0, 2, '#e0f8ff');
    // our cabin round the hero (it swings at the power cut)
    const sw = Math.sin((G.t || 0) * 2.2) * .12 * G.swing;
    pen.at(h.x, h.y, h.z, 0, 1, 0, sw);
    pen.box(0, 0, -2, 46, 34, 4, '#c81e1e').box(0, 0, 50, 46, 34, 4, '#c81e1e');
    for (const [x, y] of [[-21, -15], [21, -15], [-21, 15], [21, 15]]) pen.box(x, y, 24, 4, 4, 50, '#a01818');
    pen.box(0, -17, 8, 46, 1, 14, '#a01818').box(0, 17, 8, 46, 1, 14, '#a01818').box(-23, 0, 8, 1, 34, 14, '#a01818').box(23, 0, 8, 1, 34, 14, '#a01818');
    pen.tube(0, 0, 52, 0, 0, 72, 1.2, '#3a3a40').box(0, 0, 72, 10, 6, 6, '#3a3a40').glow(0, 0, 46, 2.2, '#ffe8c0');
    // the other cabins on the down cable
    for (const cb of G.cabins || []) { pen.at(cb.x, cb.y, cb.z).box(0, 0, 24, 44, 32, 50, '#2a5ac8').box(0, 0, 0, 46, 34, 4, '#1a3a8a').tube(0, 0, 50, 0, 0, 72, 1.2, '#3a3a40'); }
  },
  slalomgates(pen, th, t, w, sim) {
    const A = S7.AREAS['01F'], B = sim.boss;
    if (!sim.slalomPath) sim.slalomPath = new RailPath(A.hansiPath.map(p => [p[0] * M, p[1] * M, null]), (x, y) => sim.grid.floorAt(x, y), false);
    const P = sim.slalomPath;
    A.slalomGates.forEach((g, i) => {
      const p = P.at(g * P.length), flash = B && B.phase === 2 && B.window > 0 && B.gi === i + 1, c = flash && Math.floor(t * 12) % 2 ? '#ff2030' : null;
      for (const sd of [-1, 1]) { const x = p.x + Math.cos(p.yaw + Math.PI / 2) * sd * 2.2 * M, y = p.y + Math.sin(p.yaw + Math.PI / 2) * sd * 2.2 * M, z = sim.grid.floorAt(x, y); pen.at(x, y, z).tube(0, 0, 0, 0, 0, 30, 1, '#c8c8d0').box(0, sd * 5, 22, 1, 10, 8, c || (i % 2 ? '#2a5ac8' : '#d81e2a')); }
    });
  },
  avalaugh(pen, th, t, w, sim) {
    const B = sim.boss; if (!B || B.id !== 'hansi' || !(B.phase >= 1 && B.phase < 2) && B.rise === undefined) return;
    if (B.phase >= 2) return;
    const rise = B.phase >= 1 ? 1 : clamp((B.rise = (B.rise || 0) + 1 / 150), 0, 1), sink = B.sinkZ || 0, z0 = th.z + sim.grid.floorAt(th.x, th.y) - sink - (1 - rise) * 12 * M;
    const melt = B.melt || [0, 0, 0, 0, 0], bob = Math.sin(t * 1.4) * 4;
    pen.at(th.x, th.y, z0);
    pen.ball(0, 0, 3 * M, 5 * M, 5 * M, 3.4 * M, '#f0f4fc').ball(0, 0, 7.4 * M + bob * .3, 3.6 * M, 3.6 * M, 2.8 * M, '#f4f8ff').ball(0, 0, 10.6 * M + bob, 2.4 * M, 2.4 * M, 2.2 * M, '#ffffff');
    // pine-trunk arms
    const sw = Math.sin(t * 2) * .4;
    pen.tube(-3 * M, 0, 8 * M, -7 * M, Math.sin(sw) * 2 * M, 10.5 * M + Math.cos(sw) * M, 8, '#4a3020').tube(3 * M, 0, 8 * M, 7 * M, -Math.sin(sw) * 2 * M, 10.5 * M + Math.cos(sw) * M, 8, '#4a3020');
    // the coal grin, the coal eyes (warm spots 3, 4), three gold medals (warm spots 0, 1, 2)
    pen.box(0, 2.3 * M, 10.1 * M + bob, 2.6 * M, 6, 10, '#08080c');
    const eyes = [[-22, 26, 10.9 * M], [22, 26, 10.9 * M]];
    eyes.forEach(([x, y, z], k) => { const m = melt[3 + k]; if (m < 1) pen.ball(x, y + 8, z + bob, 9 * (1 - m), 6, 9 * (1 - m), '#101014').glow(x, y + 12, z + bob, 2.4 * (1 - m), '#ff6a1e'); });
    const med = [[-34, 30, 8 * M], [0, 34, 7.2 * M], [34, 30, 8 * M]];
    med.forEach(([x, y, z], k) => { const m = melt[k]; if (m < 1) pen.tube(x, y - 4, z + 30, x, y, z + 8, 1, '#d81e2a').ball(x, y, z, 10 * (1 - m), 3, 10 * (1 - m), '#f0c030').glow(x, y + 3, z, 2.6 * (1 - m), '#ffe080'); });
    for (let k = 0; k < 5; k++) if (melt[k] > 0) pen.ball((k - 2) * 30, 40, 6 * M - melt[k] * 4 * M, 5, 5, 8, '#c8e8ff');   // drips
    if (B.thaw) w.arc(th.x, th.y, sim.grid.floorAt(th.x, th.y) + 1, 0, (1 - B.thaw.t / 40) * 22 * M, 0, TAU, '#7ac8ff', .5);
  },
  chairlift(pen, th, t, w, sim) {
    const n = sim.rails && sim.rails.nodes.chair; if (!n) return;
    const sw = Math.sin(t * .7) * .05;
    pen.at(n.x, n.y, n.z, 0, 1, 0, sw);
    pen.box(0, 0, -4, 46, 18, 3, '#3a3a40').box(0, -9, 8, 46, 2, 24, '#3a3a40').box(-22, 0, 4, 2, 18, 16, '#4a4a52').box(22, 0, 4, 2, 18, 16, '#4a4a52');
    pen.tube(0, 0, 20, 0, 0, 90, 1.2, '#4a4a52').tube(-400, 0, 92, 400, 0, 92, 1, '#2a2a30');
  }
});
let _presCam = null;
const pres3dCam = () => _presCam;
S7.setPresCam = (c) => { _presCam = c; };

/** the boss's machinery: Grau's car and its cable; the band's instruments */
S7.BOSS3D = {
  grau(pen, B, t, sim) {
    const C = B.car; if (!C) return;
    pen.at(8 * M, 3.7 * M, C.z);
    pen.box(0, 0, -2, 48, 34, 4, '#3a1a1a').box(0, 0, 50, 48, 34, 4, '#3a1a1a').box(-23, 0, 24, 2, 34, 50, '#5a2a2a').box(23, 0, 24, 2, 34, 50, '#5a2a2a').box(0, -16, 24, 48, 2, 50, '#5a2a2a');
    pen.box(-14, 17, 24, 18, 2, 46, '#c8a040').box(14, 17, 24, 18, 2, 46, '#c8a040');
    pen.glow(0, 0, 46, 2.4, '#ffe0b0').ball(0, 16, 56, 3, 3, 3, B.phase >= 2 ? '#ff2020' : '#ffe0a0');
    if (B.phase < 2) pen.tube(0, 0, 52, 0, 0, 500, 1, '#2a2a2a'); else pen.tube(0, 0, 52, 4, 2, 120 + Math.sin(t * 8) * 6, 1, '#2a2a2a');
    if (B.cyc === 'hat') pen.glow(0, 24, 46, 1.6, '#fff0a0');
  },
  band(pen, B, t, sim) {
    for (const a of B.actors) {
      if (!B.alive[a.who]) continue;
      pen.at(a.x, a.y, a.z);
      const pump = a.on ? 1 + Math.sin(t * 12) * .15 : 1;
      if (a.who === 'tuba') pen.tube(4, 6, 14, 4, 6, 40, 4, '#d8b040').cone(4, 6, 40, 6, 9, 52, 9 * pump, '#e8c050');
      if (a.who === 'accordion') pen.box(0, 7, 20, 14 * pump, 6, 12, '#c81e2a').box(-8 * pump, 7, 20, 2, 7, 13, '#f4f1ea').box(8 * pump, 7, 20, 2, 7, 13, '#f4f1ea');
      if (a.who === 'trumpet') pen.tube(2, 6, 30, 2, 18, 30, 1.2, '#e0b040').cone(2, 18, 30, 2, 22, 30, 3 * pump, '#f0c050');
      if (a.who === 'snare') pen.box(0, 8, 16, 12, 12, 5, '#f4f1ea').box(0, 8, 13.5, 12.4, 12.4, 1, '#d81e2a').tube(-3, 6, 24, -1, 9, 18 + Math.sin(t * 16) * 2, .6, '#8a6a4a').tube(3, 6, 24, 1, 9, 18 + Math.cos(t * 16) * 2, .6, '#8a6a4a');
      if (a.on) pen.glow(0, 10, 50, 1.4, '#ffe080');
    }
  },
  hansi() {}
};
/** set pieces on the HUD: the avalanche's distance */
S7.drawAreaHud = (g, r, S, sim) => {
  if (sim.lawine) {
    const k = clamp(sim.lawine.gap / (40 * M), 0, 1);
    UI.title(g, 'LAWINE!', r.W / 2, S.y0 + 40, 3, { colors: ['#ffffff', '#c8d8f0', '#8aa8d8'] });
    UI.rect(g, r.W / 2 - 60, S.y0 + 72, 120, 5, '#3a3438'); UI.rect(g, r.W / 2 - 60, S.y0 + 72, 120 * k, 5, k < .3 ? '#ff2030' : '#f4f1ea');
    UI.text(g, Math.round(sim.lawine.gap / M) + ' M BEHIND YOU', r.W / 2, S.y0 + 80, MUTED, { align: 'center' });
    UI.prompt(g, [['move', 'TUCK']], r.W / 2, S.y1 - 10, { align: 'center', scale: 2 });
  }
};
