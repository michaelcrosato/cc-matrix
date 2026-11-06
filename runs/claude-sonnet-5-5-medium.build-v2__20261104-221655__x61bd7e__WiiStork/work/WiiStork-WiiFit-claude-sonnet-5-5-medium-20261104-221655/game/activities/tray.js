// Tray Service (E.Physics)
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C, CELL = 8;
function buildTray(def, run) {
  const world = new E.Physics({ gravity: [0, 0], substeps: 4, iterations: 8, sleep: false }), T = { world, olives: [], glasses: [], bumpers: [], walls: [], gecko: null, def, in: 0, total: 0, W: def.rows[0].length * CELL, H: def.rows.length * CELL, t: 0 };
  def.rows.forEach((row, ry) => { for (let cx = 0; cx < row.length; cx++) { const ch = row[cx], x = cx * CELL + CELL / 2, y = ry * CELL + CELL / 2;
    if (ch === '#') { T.walls.push([cx, ry]); world.box(x, y, CELL, CELL, { type: 'static', bounce: .35 }); }
    else if (ch === 'o') { const o = world.circle(x, y, 3, { bounce: .3, damping: G.DEV.trayFric, friction: .1, bullet: true, data: { olive: true } }); o.alive = true; T.olives.push(o); T.total++; }
    else if (ch === 'G') { const gl = world.circle(x, y, 7, { type: 'static', sensor: true, data: { glass: true } }); T.glasses.push(gl); }
    else if (ch === 'b') { world.bumper(x, y, 4, { kick: 90 }); T.bumpers.push([x, y]); }
    else if (ch === 'k') { T.gecko = world.box(x, y, 12, 5, { type: 'kinematic' }); T.gecko.hx = x; T.gecko.dir = 1; } } });
  world.on = world.on || {}; world.o = world.o || {};
  T.sensorHit = (sensor, body) => { if (body.data && body.data.olive && body.alive && sensor.data && sensor.data.glass) { body.alive = false; world.remove(body); T.in++; run.pop = { x: sensor.x, y: sensor.y, t: 0 }; G.snd('plop'); G.snd('trayclink'); if (G.game.particles) G.game.particles.glints(0, 0, 10, 3, '#6a8f3a'); } };
  return T;
}
G.activity({
  id: 'tray', family: 'tray', discipline: 'Balance', name: 'Tray Service', room: 'juice', view: 'brawler', song: 'tray', demoPose: 'Idle_Subtle', hubEvent: false,
  card: 'Dennis needs olives in cocktail glasses. He cannot say why. Tilt the tray by leaning. Three trays, one minute.',
  how: { pad: 'Left stick tilts the tray.', key: 'WASD nudges the tilt.', mouse: 'Move the mouse to tilt. It is very good with a mouse.' },
  stars: [.35, .65, .90],
  tiers: [{ set: 'tray', dur: 60 }],
  setup(run) {
    run.cs.forEach(c => { c.bal.cheat = true; c.trayIdx = 0; c.tray = null; c.score = 0; c.inTotal = 0; c.totalAll = 0; c.trayT = 0; c.elapsedDone = 0; c.done = false; c.botU = [0, 0]; });
    G.TRAYS.forEach(t => run.cs.forEach(c => { c.totalAll += t.rows.join('').split('o').length - 1; }));
    run.dennis = G.castFigure('dennis', { size: 1.8, x: 84, y: 8, tgt: 1.9 }); run.dennis.set('Idle_Subtle'); run.pop = null; run.said = false;
    run.cs.forEach(c => this.nextTray(run, c));
  },
  nextTray(run, c) { if (c.trayIdx >= G.TRAYS.length) { c.done = true; c.doneT = run.time; return; } c.tray = buildTray(G.TRAYS[c.trayIdx], run); const T = c.tray; T.world.o.on = null; T.world.on = { enter: T.sensorHit }; c.trayT = 0; },
  bot(run, c, bot, dt) {
    const T = c.tray; if (!T) return; const rate = { poor: 1.4, average: 4.5, good: 8, expert: 12 }[bot.skill] || 4, nz = { poor: .5, average: .18, good: .08, expert: .03 }[bot.skill] || .15;
    let o = null, gl = null, bd = 1e9; for (const ol of T.olives) { if (!ol.alive) continue; for (const g of T.glasses) { const d = Math.hypot(g.x - ol.x, g.y - ol.y); if (d < bd) { bd = d; o = ol; gl = g; } } }
    let tx = 0, ty = 0; if (o) { // aim the olive at its glass; walls with a gap: route through the gap row
      let gx = gl.x, gy = gl.y; const gap = T.def.rows.findIndex(r => r.indexOf('#') >= 0 && r.indexOf('.') >= 0 && r.indexOf('#') > 0 && r.indexOf('.') > 0 && r[0] === '#' && r.slice(1, -1).indexOf('.') >= 0 && r.slice(1, -1).indexOf('#') >= 0);
      if (gap >= 0 && o.y > gap * CELL + CELL && gy < gap * CELL) { gx = T.def.rows[gap].indexOf('.', 1) * CELL + CELL / 2; gy = (gap) * CELL - 4; if (Math.abs(o.x - gx) > 6 && o.y > gap * CELL) gy = o.y; }
      const ax = 9 * (gx - o.x) - 3.4 * o.vx, ay = 9 * (gy - o.y) - 3.4 * o.vy; tx = G.clamp(ax / G.DEV.trayG, -1, 1); ty = G.clamp(-ay / G.DEV.trayG, -1, 1); }
    c.botU[0] += (tx - c.botU[0]) * Math.min(1, dt * rate); c.botU[1] += (ty - c.botU[1]) * Math.min(1, dt * rate);
    c.it.ux = G.clamp(c.botU[0] + nz * Math.sin(run.time * 3.1), -1, 1); c.it.uy = G.clamp(c.botU[1] + nz * Math.sin(run.time * 2.3 + 1), -1, 1);
  },
  update(dt, run) {
    run.cs.forEach(c => {
      run.leanStep(c, dt); const T = c.tray; if (c.done || !T) return;
      T.world.gravity[0] = c.bal.p.x * G.DEV.trayG; T.world.gravity[1] = -c.bal.p.y * G.DEV.trayG;
      for (const o of T.olives) if (o.alive) o.damping = G.DEV.trayFric;
      if (T.gecko) { const gk = T.gecko; gk.hx += gk.dir * 14 * dt; if (gk.hx > T.W - 20) gk.dir = -1; if (gk.hx < 20) gk.dir = 1; gk.moveTo(gk.hx, gk.y, 0, 40, 10); }
      T.world.wake && T.world.wake(); T.world.step(dt); c.trayT += dt;
      if (T.in >= T.total || c.trayT >= T.def.time) { c.inTotal += T.in; c.elapsedDone += Math.min(c.trayT, T.def.time); c.trayIdx++; run.cs.length === 1 && G.snd('bell'); this.nextTray(run, c); }
      if (run.pop) run.pop.t += dt;
    });
    run.dennis.update(dt);
  },
  finished(run) { return run.cs.every(c => c.done); },
  hud(r, run) {
    G.drawTimer(r, run); G.nameTags(r, run); const c = run.cs[0];
    r.overlay(g => { G.txt(g, 'Tray ' + Math.min(3, c.trayIdx + 1) + ' / 3', 14, 12, C.INK); G.txt(g, 'Olives ' + (c.inTotal + (c.tray ? c.tray.in : 0)) + ' / ' + c.totalAll, 14, 24, C.ACC2); if (c.tray && !c.done) G.txt(g, Math.ceil(c.tray.def.time - c.trayT) + 's', r.W - 14, 12, C.MUTED, { align: 'right' }); });
  },
  draw(r, run) {
    run.dennis.draw(r);
    run.cs.forEach((c, i) => {
      const T = c.tray; if (!T) return; const n = run.n, sc = n === 1 ? 2.1 : n === 2 ? 1.35 : 1.0, s = run.slot(i), cx = n === 1 ? r.W / 2 - 20 : r.w(s.x, 12, 0)[0], cy = n === 1 ? r.H / 2 + 6 : r.H / 2 + 20;
      const p = c.bal.p, W = T.W, H = T.H;
      r.overlay(g => {
        const P = (x, y, z) => { const nx = (x - W / 2) / (W / 2), ny = (y - H / 2) / (H / 2); const k = 1 + (-p.y) * ny * .07 * -1; return [cx + (x - W / 2) * sc * (1 + p.y * ny * -.08) + p.x * -3 * (z || 0), cy + (y - H / 2) * sc * (1 - .06 * p.y) - p.y * 4 * (z || 0) * -1 + nx * p.x * 0]; };
        const q = [P(0, 0, 0), P(W, 0, 0), P(W, H, 0), P(0, H, 0)];
        px.poly(g, q.map(a => [a[0] + 3, a[1] + 6]), 'rgba(32,64,76,.25)'); px.poly(g, q, '#d9b68a');
        const a = P(2, 2), b = P(W - 2, H - 2); px.poly(g, [P(3, 3), P(W - 3, 3), P(W - 3, H - 3), P(3, H - 3)], '#f3e2c4');
        for (const [wx, wy] of T.walls) { const w = [P(wx * CELL, wy * CELL, 1), P(wx * CELL + CELL, wy * CELL, 1), P(wx * CELL + CELL, wy * CELL + CELL, 1), P(wx * CELL, wy * CELL + CELL, 1)]; if (wx > 0 && wx < 19 && wy > 0 && wy < T.def.rows.length - 1) px.poly(g, w, '#b0896a'); else px.poly(g, w, '#c49a6a'); }
        for (const gl of T.glasses) { const gp = P(gl.x, gl.y, 0); px.disc(g, gp[0], gp[1], 7 * sc, '#cfe6ec'); px.disc(g, gp[0], gp[1], 5.5 * sc, '#f4fbfb'); px.disc(g, gp[0], gp[1], 2 * sc, '#bfe3ea'); px.ell(g, gp[0] - 2 * sc, gp[1] - 3 * sc, 1.5 * sc, .8 * sc, '#ffffff'); }
        for (const [bx, by] of T.bumpers) { const bp = P(bx, by, 2); px.disc(g, bp[0], bp[1], 4.5 * sc, '#ff7a59'); px.disc(g, bp[0], bp[1] - 1, 3 * sc, '#ffb59f'); }
        if (T.gecko) { const gp = P(T.gecko.x, T.gecko.y, 1); px.ell(g, gp[0], gp[1], 7 * sc, 2.6 * sc, '#6cc283'); px.disc(g, gp[0] + 6 * sc * T.gecko.dir, gp[1], 2.4 * sc, '#4fa86a'); for (let k = -1; k <= 1; k += 2) { px.line(g, gp[0] - 3 * sc, gp[1], gp[0] - 5 * sc, gp[1] + k * 3 * sc, '#4fa86a', 1); px.line(g, gp[0] + 3 * sc, gp[1], gp[0] + 5 * sc, gp[1] + k * 3 * sc, '#4fa86a', 1); } px.line(g, gp[0] - 7 * sc * T.gecko.dir, gp[1], gp[0] - 12 * sc * T.gecko.dir, gp[1] - 2, '#4fa86a', 1); }
        for (const o of T.olives) { if (!o.alive) continue; const op = P(o.x, o.y, 2); px.ell(g, op[0] + 1, op[1] + 2.5 * sc, 3 * sc, 1.3 * sc, 'rgba(32,64,76,.35)'); px.disc(g, op[0], op[1], 3 * sc, '#6a8f3a'); px.disc(g, op[0] - .5 * sc, op[1] - .6 * sc, 1.7 * sc, '#8fb64a'); px.dot(g, op[0] - 1 * sc, op[1] - 1.5 * sc, '#e6f5c0'); px.dot(g, op[0] + 1 * sc, op[1], '#c0392b'); }
      });
    });
  },
  result(run, c) { const total = c.totalAll, inn = c.inTotal + (c.tray && !c.done ? c.tray.in : 0), left = Math.max(0, 1 - (c.done ? c.doneT : run.dur) / run.dur); return { pct: G.clamp((inn / total) * (.8 + .2 * left), 0, 1), detail: inn + ' of ' + total + ' olives delivered' }; }
});
})();
