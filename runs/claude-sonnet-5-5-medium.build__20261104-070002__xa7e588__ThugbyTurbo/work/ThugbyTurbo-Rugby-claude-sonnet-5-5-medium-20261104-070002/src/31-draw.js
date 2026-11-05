/* THUGBY TURBO — world drawing. */
const SEAT_COL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
function presentStep(dt) {
  V.t += dt;
  for (const p of S.players) { const rig = V.rigs[p.id]; if (p.off) continue; rig.update(dt, rigArgs(p, dt)); }
  V.refRig.update(dt, { x: S.ref.x, y: S.ref.y, z: 0, vx: S.ref.vx, vy: S.ref.vy, facing: S.ref.facing, pose: S.ref.down > 0 ? 'down' : (S.ref.sigT > 0 ? 'cheer' : undefined) });
  if (S.chicken) V.chickRig.update(dt, { squash: Math.sin(V.t * 18) * .2, walk: 1, flap: 1, look: [0, S.chicken.dir] });
  S.players.forEach(p => { if (p.st === 'celebrate' || p.st === 'stun') p.smoke = p.smoke; });
  // fx text
  camUpdate(dt);
}
function drawCrowd(r) {
  const t = V.t, ex = S.counts.try ? 1 : 0, wave = V.crowdWave = Math.max(0, V.crowdWave - .016);
  const tiers = [[16, 34], [0, 44], [-16, 54]];
  for (let ti = 0; ti < 3; ti++) {
    const [oy, z] = tiers[ti], y = 32 + oy - 4;
    r.queue(700, y, z + 1, g => {
      for (let x = 24; x < 1424; x += 6) {
        const [sx, sy] = r.w(x, y + 8, z); if (sx < -8 || sx > r.bw + 8) continue;
        const h = E.hash2(x, ti * 17 + 3), col = ['#e8443a', '#3b82f6', '#f5b700', '#f2f2f2', '#22c55e', '#b05ad8', '#e87a3a'][Math.floor(h * 7)];
        const bob = Math.sin(t * (3 + h * 3) + x) * (1 + wave * 3);
        px.rect(g, sx, sy - 5 + bob, 4, 4, col); px.rect(g, sx, sy - 8 + bob, 3, 3, h > .5 ? '#f0c8a0' : '#a8703a');
      }
    }, { bias: 0 });
  }
}
function drawPosts(r) {
  for (const x of [G.X0, G.X1]) {
    for (const y of [G.CY - G.POST, G.CY + G.POST]) r.queue(x, y, 0, g => { const [x0, y0] = r.w(x, y, 0), [x1, y1] = r.w(x, y, G.UPR), [q0, q1] = r.w(x, y, 20); px.rect(g, Math.round(x0) - 1, Math.round(y1), 3, Math.round(y0 - y1), '#f4f4f0'); px.rect(g, Math.round(x0) - 1, Math.round(y1), 1, Math.round(y0 - y1), '#c8c8d0'); px.rect(g, Math.round(x0) - 2, Math.round(q1), 5, Math.round(y0 - q1), S.teams[x < G.CX ? 0 : 1].c1); });
    r.queue(x, G.CY, G.CROSS, g => { const [x0, y0] = r.w(x, G.CY - G.POST, G.CROSS), [x1, y1] = r.w(x, G.CY + G.POST, G.CROSS); px.rect(g, Math.round(x0) - 1, Math.round(y0) - 1, Math.round(x1 - x0) + 3, 3, '#f4f4f0'); });
    for (const cy of [G.Y0, G.Y1]) r.queue(x, cy, 0, g => { const [a, b] = r.w(x, cy, 0), [c, d] = r.w(x, cy, 16); px.rect(g, Math.round(a), Math.round(d), 1, Math.round(b - d), '#e8e8e8'); px.rect(g, Math.round(c) + 1, Math.round(d), 5, 3, '#f2c230'); });
  }
}
function drawBall(r) {
  const b = S.ball; if (b.st === 'dead' && false) return;
  r.shadow(b.x, b.y, 3, .35, '#0c0818', 0);
  const ang = b.holder ? b.holder.facing : b.rot;
  r.queue(b.x, b.y, b.z, g => { const [sx, sy] = r.w(b.x, b.y, b.z); const rot = b.st === 'held' || b.holder ? 0 : b.rot; const ca = Math.cos(ang), sa = Math.sin(ang);
    const pts = [[-4, -2], [-1.5, -3], [1.5, -3], [4, -2], [4, 2], [1.5, 3], [-1.5, 3], [-4, 2]].map(([x, y]) => [sx + Math.round(x * Math.cos(rot * .5) - y * Math.sin(rot * .5) * .6), sy + Math.round(y * Math.cos(rot * .5) + x * Math.sin(rot * .5) * .5)]);
    px.poly(g, pts, '#a8582a'); px.line(g, sx - 2, sy, sx + 2, sy, '#f0e8d8', 1); px.dot(g, sx - 3, sy - 1, '#c87a44'); }, { emissive: false });
}
function drawPlayer(r, p) {
  if (p.off) return; const rig = V.rigs[p.id], T = S.teams[p.team];
  if (p.st === 'binned') return;
  const ctl = p.ctl >= 0, car = S.ball.holder === p;
  r.shadow(p.x, p.y, p.immovable ? 9 : 6, .4, '#0c0818', 0);
  if (ctl) { const c = SEAT_COL[(S.seats[p.ctl] && S.seats[p.ctl].slot !== undefined ? S.seats[p.ctl].slot : p.ctl) % 4]; r.decal(() => { r.groundRing(p.x, p.y, 9, c, .9); r.groundRing(p.x, p.y, 10, '#ffffff', .4); }); }
  const opts = { xray: (ctl || car) ? { actors: true, color: ctl ? SEAT_COL[p.ctl % 4] : '#ffffff' } : undefined, pick: p.id };
  if (p.superKind || p.onFire > 0) opts.ghost = { color: p.onFire > 0 ? '#ff8020' : '#ffe060', life: .25, alpha: .5, owner: p };
  if (p.burn > 0) { opts.flash = '#202020'; opts.flashMix = .6; }
  if (p.grease > 0) { opts.flash = '#ff90ff'; opts.flashMix = .25; }
  if (p.iron > 0) { opts.flash = '#c0c8e0'; opts.flashMix = .25; }
  if (p.xHold > .18 && p.xHold < 1.2) { opts.flash = '#ffffff'; opts.flashMix = .15 + (V.t * 8 % 1) * .2; } else if (p.xHold >= 1.2) { opts.flash = '#ff2020'; opts.flashMix = .4; }
  if (p.reactT > 0 && false) opts.alpha = .8;
  r.actor(p.x, p.y, p.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), opts);
  if (p.onFire > 0 || p.burn > 0) { TT.game.lights.add(p.x, p.y, 14, 44, .7, { color: '#ff8030' }); if (V.t % .08 < .02) TT.game.particles.fire(p.x, p.y, 6, 1, { size: 1.5 }); }
  if (p.bolt > 0) { p.bolt -= 1 / 60; }
  if (p.burn > 0) p.burn -= 1 / 60;
}
function drawWorld(r) {
  const g = TT.game; r.sky && 0;
  V.map.drawFloor(r);
  // ground marks
  const b = S.ball;
  if (S.kickInfo && (b.st === 'kick') && b.z > 4) { const k = S.kickInfo, pul = 6 + Math.sin(V.t * 8) * 2; r.decal(() => { r.groundRing(k.x, k.y, pul + 4, '#ffffff', .6); r.groundRing(k.x, k.y, pul, '#ffe070', .8); }); }
  if (TT.settings.refView && S.ref.down <= 0 && S.phase === 'play') { const R = S.ref; r.decal(() => { const pts = [[R.x, R.y]]; for (let i = -4; i <= 4; i++) { const a = R.facing + i / 4 * TUNE.v.refFov / 2; pts.push([R.x + Math.cos(a) * TUNE.v.refRange, R.y + Math.sin(a) * TUNE.v.refRange]); } const P = pts.map(p => r.w(p[0], p[1], 0)); px.polyDither(r.tgt, P, '#ffffe0', .06, r.ix, r.iy); }); }
  for (const j of S.jets) if (j.st) { r.decal(() => r.groundDisc(j.x, j.y, 12, j.st === 1 ? '#ff9020' : '#ff3010', j.st === 1 ? .5 + Math.sin(V.t * 20) * .2 : .9)); if (j.st === 2) { g.lights.add(j.x, j.y, 20, 70, 1, { color: '#ff7020' }); if (V.t % .05 < .018) g.particles.fire(j.x, j.y, 2, 2, { size: 2.5 }); } }
  if (S.strike) { const s = S.strike; r.decal(() => { r.groundRing(s.x, s.y, 36, s.t < 1.4 ? '#c0e0ff' : '#ffffff', s.t < 1.4 ? .5 + Math.sin(V.t * 30) * .3 : .9); r.groundRing(s.x, s.y, 24, '#ffffff', .4); }); if (s.t > 1.4) { r.queue(s.x, s.y, 0, gg => { const [a, bb] = r.w(s.x, s.y, 0); px.line(gg, a, bb, a + 4, bb - 120, '#ffffff', 3); px.line(gg, a + 4, bb - 120, a - 6, bb - 180, '#c0e0ff', 2); }, { emissive: true }); g.lights.add(s.x, s.y, 30, 140, 1.2, { color: '#c0d8ff' }); } }
  if (S.sp && S.sp.type === 'ruck') { const s = S.sp; r.decal(() => { r.groundRing(s.x, s.y, 18, '#ffffff', .5); r.groundArc(s.x, s.y, 16, 19, -Math.PI / 2, -Math.PI / 2 + TAU * clamp((s.bar + 1.2) / 2.4, 0, 1), s.bar >= 0 ? '#80ff80' : '#ff6060', .9); }); }
  if (S.useIt > 0 && b.holder) { const k = S.useIt / 3; r.decal(() => r.groundArc(b.holder.x, b.holder.y, 9, 12, -Math.PI / 2, -Math.PI / 2 + TAU * k, '#ff6060', .9)); }
  drawCrowd(r); V.map.queueWalls(r); drawPosts(r);
  // sin bin
  r.queue(G.CX + 70, G.Y1 + 30, 0, gg => { const [x, y] = r.w(G.CX + 70, G.Y1 + 30, 0), [x2, y2] = r.w(G.CX + 70, G.Y1 + 30, 22); px.rect(gg, x - 18, y2, 36, y - y2, '#2e8a4a'); px.rect(gg, x - 20, y2 - 3, 40, 4, '#1f6a38'); E.font.text(gg, 'SIN BIN', x, y2 + 4, '#ffffff', { align: 'center', font: 'tiny' }); });
  for (const p of S.players) drawPlayer(r, p);
  // referee
  const R = S.ref; r.shadow(R.x, R.y, 5, .4); r.actor(R.x, R.y, 0, (gg, ox, oy) => V.refRig.draw(gg, ox, oy, r.view));
  if (R.call) r.overlay(gg => { const [sx, sy] = r.w(R.x, R.y, 46); E.font.text(gg, R.call, sx, sy, '#ffffff', { align: 'center', outline: '#000', shadow: '#000' }); });
  drawBall(r);
  if (S.chicken) { const c = S.chicken; r.shadow(c.x, c.y, 9, .4); r.actor(c.x, c.y, 0, (gg, ox, oy) => V.chickRig.draw(gg, ox, oy, r.view)); }
  for (const u of S.powerups) { const pu = POWERUPS[u.kind]; if (u.landed && u.life < 3 && Math.floor(V.t * 8) % 2) continue; r.shadow(u.x, u.y, 5, .4);
    r.queue(u.x, u.y, u.z + 8, gg => { const [sx, sy] = r.w(u.x, u.y, u.z + 8 + Math.sin(V.t * 4) * 2); px.disc(gg, sx, sy, 7, '#101018'); px.disc(gg, sx, sy, 6, pu.color); px.rect(gg, sx - 3, sy - 1, 6, 3, '#fff'); E.font.text(gg, pu.name[0], sx, sy - 3, '#000', { align: 'center', font: 'tiny' }); }, { emissive: true }); g.lights.add(u.x, u.y, 10, 38, .6, { color: pu.color }); }
  // hover marker
  if (V.hover >= 0 && S.players[V.hover]) { const h = S.players[V.hover]; r.decal(() => r.groundRing(h.x, h.y, 11, V.hoverLegal ? '#60ff60' : '#ff6060', .9)); }
  // marker arrows for off-screen ball
  if (!r.visible(b.x, b.y, 0, -20, 0, 0) && r.marker) r.marker(b.x, b.y, 0, { label: '' });
  // sin-bin and pole labels
  if (S.dev && S.dev.showIds) for (const p of S.players) r.textAt(p.x, p.y, 40, p.id + p.st, '#fff', { font: 'tiny' });
}
