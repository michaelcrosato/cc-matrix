/* THE CAMERA (section 6.14): a TV director. Focus: the ball plus 0.3 s of its flight, pulled toward the human's
 * player, raised with lofted balls; zoom by context (set pieces, corners, goals, the super strike, the shootout);
 * slow motion, hit-stop, shake and flashes (the engine's, which follow the comfort settings). */
EF.Camera = {
  z: 1, want: 1, yaw: 0, wantYaw: 0, shake: 0,
  reset(m, map) {
    const c = game.cam; c.smooth = .15; c.bounds = v => map.bounds(v); c.frame && c.frame(null);
    this.z = 1; this.want = 1; this.yaw = 0; this.wantYaw = 0; game.resetCamera(); game.setZoom(1);
    if (m) { const b = m.ball; game.focus(b.x, b.y, 0); }
  },
  view() { const v = EF.CAMERAS[game.settings.camera] || 'broadcast'; return v; },
  update(dt, m, src) {
    const b = src.ball, T = game.timeScale || 1, real = dt / Math.max(.05, T);
    let fx = b.x + (b.vx || 0) * .3, fy = b.y + (b.vy || 0) * .3, fz = (b.z || 0) * .4, zoom = 1, yaw = 0;
    const h = m.humans.find(q => q.fb && !q.cpu && !q.remote);
    if (h && h.fb && !src.replay) { fx = lerp(fx, h.fb.body.x, .25); fy = lerp(fy, h.fb.body.y, .25); }
    const SP = m.setpiece, mode = m.mode;
    if (src.replay) { zoom = 1.18; yaw = src.replay.yaw; fx = b.x; fy = b.y; }
    else if (mode === 'shootout' || (SP && SP.pen)) { const pk = m.shootout ? m.shootout.kick : SP.pen; if (pk) { fx = lerp(pk.spot.x, pk.gx, .45); fy = P.CY; zoom = 1.25; } }
    else if (SP && SP.kind === 'corner' && !SP.taken) { fx = lerp(b.x, SP.info.gx + SP.into * 70, .6); fy = lerp(b.y, P.CY, .55); zoom = .92; }
    else if (SP && !SP.taken && SP.kind === 'freekick' && SP.shootable) { const gx = m.goalX(SP.side); fx = lerp(b.x, gx, .5); fy = lerp(b.y, P.CY, .5); zoom = .95; }
    else if (SP && !SP.taken && SP.stage !== 'setup' && SP.kind !== 'kickoff') { zoom = 1.12; }
    else if (mode === 'goal' || mode === 'celebrate') { const c = m.celebration; if (c) { fx = c.who.body.x; fy = c.who.body.y; } zoom = 1.2; }
    else if (m.superSeq) { fx = m.superSeq.who.body.x; fy = m.superSeq.who.body.y; zoom = 1.15; }
    else if (m.duel) { const k = m.duel.keeper; fx = lerp(b.x, k.body.x, .6); fy = lerp(b.y, k.body.y, .6); zoom = 1.18; }
    else if (mode === 'card' && m.cardNow) { fx = m.cardNow.who.body.x; fy = m.cardNow.who.body.y; zoom = 1.12; }
    else if (mode === 'kickoff') { fx = P.CX; fy = P.CY; zoom = 1.05; }
    // co-op and versus: when humans are far apart, widen toward them
    const hs = m.humans.filter(q => q.fb && !q.cpu && !q.remote);
    if (hs.length > 1 && !src.replay) { let span = 0; for (const q of hs) span = Math.max(span, H.d(q.fb.body, b)); zoom = Math.min(zoom, clamp(1.15 - (span - 120) / 600, .82, 1)); }
    this.want = zoom; this.wantYaw = yaw;
    this.z = approach(this.z, this.want, real * 1.2 * Math.max(.2, Math.abs(this.want - this.z) * 4));
    if (Math.abs(game.zoomGame || 0) !== this.z) game.setZoom(this.z), game.zoomGame = this.z;
    if (this.yaw !== this.wantYaw) { const d = this.wantYaw - this.yaw; game.rotateView(d); this.yaw = this.wantYaw; }
    game.focus(fx, fy, fz);
  }
};
