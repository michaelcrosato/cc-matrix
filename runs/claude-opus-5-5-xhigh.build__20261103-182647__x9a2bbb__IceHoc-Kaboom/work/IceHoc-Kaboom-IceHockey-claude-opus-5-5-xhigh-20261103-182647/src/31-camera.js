/* ---- CAM (7.15): the broadcast director. Play: the puck (or its carrier) plus a lead, pulled toward a lone human far
 * from it, framing several local humans; Broadcast (threequarter) or Overhead (topdown), cycled by R3 / V and saved.
 * Fights, celebrations, intros and replays cut to ice level (brawler). Zoom levels are few and discrete (each one is a
 * floor bake) ---- */
const Cam = (() => {
  let fx = Rink.C.x, fy = Rink.C.y, mode = 'play', want = null, free = null;
  const DIST = { near: .86, normal: .72, far: .62 };   // (the broadcast views draw at 1.5x: .72 is about 1:1)
  const playView = () => S('camera') === 'overhead' ? 'topdown' : 'threequarter';
  const baseZoom = () => DIST[S('camDist')] || 1;
  function set(view, zoom) {
    if (game.view.id !== view) game.setView(view);
    const z = Math.round(zoom * 20) / 20; if (Math.abs((game._zoomBase || 1) - z) > .01) game.setZoom(z);
  }
  function cycle() { const v = S('camera') === 'overhead' ? 'broadcast' : 'overhead'; game.settings.set('camera', v); game.note(v === 'overhead' ? 'OVERHEAD CAMERA' : 'BROADCAST CAMERA'); }
  /** each step: where the camera looks and through which lens */
  function update(m, dt, o = {}) {
    let tx = fx, ty = fy, tz = 8, view = playView(), zoom = baseZoom();
    const pk = m.puck, humans = m.humans.filter(h => h.kind === 'local' && h.skater && !h.skater.offIce);
    if (free) { const I = game.input, mv = I.move(); free.x += mv[0] * 320 * dt / game.zoom; free.y += mv[1] * 320 * dt / game.zoom; if (I.down('turbo')) free.z = Math.min(2.2, free.z + dt); if (I.down('switch')) free.z = Math.max(.6, free.z - dt); set(view, free.z); game.focus(free.x, free.y, 0); return; }
    if (Replay.on) { const f = Replay.focus(); tx = f[0]; ty = f[1]; view = 'brawler'; zoom = 1; }
    else if (m.phase === 'fight' && m.fight) { tx = m.fight.x; ty = m.fight.y; tz = 14; view = 'brawler'; zoom = 1.3; }
    else if (m.phase === 'intro' && m.intro) { const s = m.intro.focus; tx = s ? s.x : Rink.C.x; ty = s ? s.y : Rink.C.y; view = 'brawler'; zoom = 1; tz = 14; }
    else if (m.phase === 'goal' && m.lastGoal && m.phaseT > -2.6) { const s = m.byId(m.lastGoal.by); tx = s ? s.x : pk.x; ty = s ? s.y : pk.y; view = 'brawler'; zoom = 1; tz = 12; }
    else if (m.phase === 'final' || m.phase === 'periodEnd') { tx = Rink.C.x; ty = Rink.C.y; }
    else {
      const src = pk.owner || pk; tx = src.x + (pk.owner ? pk.owner.vx : pk.vx) * .25; ty = src.y + (pk.owner ? pk.owner.vy : pk.vy) * .25;
      if (pk.inNet >= 0) { tx = pk.x; ty = pk.y; }
      if (humans.length === 1) { const h = humans[0].skater; if (U.dist(h, src) > 220) { tx = lerp(tx, h.x, .25); ty = lerp(ty, h.y, .25); } }
      else if (humans.length > 1) { let x0 = tx, x1 = tx, y0 = ty, y1 = ty; for (const h of humans) { x0 = Math.min(x0, h.skater.x); x1 = Math.max(x1, h.skater.x); y0 = Math.min(y0, h.skater.y); y1 = Math.max(y1, h.skater.y); } tx = lerp(tx, (x0 + x1) / 2, .5); ty = lerp(ty, (y0 + y1) / 2, .5); if (x1 - x0 > 260) zoom = Math.min(zoom, .62); }
      if (m.phase === 'shootout' || m.phase === 'so_result') { const sh = m.so && m.so.att && m.byId(m.so.att.shooter); if (sh) { tx = lerp(sh.x, Rink.goalX(m.attackNet(sh.team)), .45); ty = Rink.C.y; } }
      if (o.lead) { tx += o.lead[0]; ty += o.lead[1]; }
    }
    if (o.view) view = o.view; if (o.zoom) zoom = o.zoom;
    set(view, zoom);
    const k = 1 - Math.exp(-dt / Math.max(.02, game.view.id === 'brawler' ? .12 : .15));
    fx += (tx - fx) * k; fy += (ty - fy) * k;
    game.cam.smooth = 0; game.focus(fx, fy, tz);
  }
  function snap(x, y) { fx = x; fy = y; game.cam.snap = true; game.focus(fx, fy, 8); }
  /** the world point under the mouse (on the ice) */
  function mouseWorld() {
    const I = game.input, ms = I.mouseScreen && I.mouseScreen(); if (!ms || !game.view.inv) return null;
    const r = game.r; if (!r || !r.w) return null;
    // invert the projection around the camera's focus: the focus sits at the screen's center
    const c = r.w(fx, fy, 0), d = game.view.toGround(ms[0] - c[0], ms[1] - c[1]);
    return d ? [fx + d[0], fy + d[1]] : null;
  }
  return { update, cycle, snap, mouseWorld, playView, baseZoom, set, toggleFree() { free = free ? null : { x: fx, y: fy, z: game.zoom || 1 }; return !!free; }, lookAt(x, y, z) { free = { x, y, z: z || (free ? free.z : .72) }; fx = x; fy = y; }, get free() { return !!free; }, get focus() { return [fx, fy]; } };
})();

/* ---- REPLAY (7.16): an 8 s ring buffer of every body's position and rig state (60 Hz); goal replays (the last 4 s at
 * half speed, letterboxed, at ice level), big-hit and KABOOM replays at the next stoppage, highlights for the credits ---- */
const Replay = (() => {
  const RING = 480; let ring = [], clip = null, pend = [], k = 0, on = false, playT = 0, clipLen = 0, label = 'REPLAY', speed = .5, hilites = [];
  const cpHk = hk => hk ? Object.assign({}, hk, { stick: hk.stick ? Object.assign({}, hk.stick) : null }) : null;
  const snapOf = (e, rigArgs) => ({ x: e.x, y: e.y, z: e.z || 0, a: rigArgs ? Object.assign({}, rigArgs) : null, hk: cpHk(e.rig && e.rig.hk), gear: e.rig ? { stick: e.rig.hkGear.stick, helmet: e.rig.hkGear.helmet } : null, hood: e.rig ? e.rig.o.hood : false, off: !!e.offIce, st: e.state });
  function record(m) {
    if (on) return;
    if ((k++ & 1) === 0) return;
    const f = { t: m.t, pk: [m.puck.x, m.puck.y, m.puck.z, m.puck.onFire ? 1 : 0, m.puck.owner ? m.puck.owner.id : -1], sk: m.skaters.map(s => snapOf(s, s.rig._lastArgs)), g: m.goalies.map(g => snapOf(g, g.rig._lastArgs)), ex: m.extras.map(e => [e.x, e.y]), ev: [] };
    ring.push(f); if (ring.length > RING) ring.shift();
    for (const p of pend) if (m.t >= p.until) { p.ready = true; }
    pend = pend.filter(p => { if (!p.ready) return true; const c = ring.filter(fr => fr.t >= p.from && fr.t <= p.until); if (c.length > 20) { m.replayClip = { frames: c, label: p.label, score: p.score }; keep(m, m.replayClip); } return false; });
  }
  /** mark an event in the newest frame (its effects re-fire in the replay) */
  function mark(e) { const f = ring[ring.length - 1]; if (f) f.ev.push(e); }
  /** a big hit or KABOOM: copy its clip a second later, for the next stoppage */
  function want(m, label, score) { if (m.cfg.replays === 'off' || m.cfg.mode === 'attract' && false) return; pend.push({ from: m.t - 2, until: m.t + 1, label, score }); }
  function keep(m, c) { if (m.cfg.mode !== 'story') return; hilites.push(c); hilites.sort((a, b) => b.score - a.score); if (hilites.length > 3) hilites.length = 3; }
  function startGoal(m) {
    if (m.cfg.replays === 'off') return false;
    const t1 = m.t - 2.9, t0 = t1 - (m.cfg.mode === 'session' ? 3 : 3.5); const frames = ring.filter(f => f.t >= t0 && f.t <= t1 + .2);
    if (frames.length < 30) return false;
    const g = m.lastGoal, kind = g ? g.kind : '';
    keep(m, { frames, label: 'GOAL', score: 5 + (kind === 'kaboom' ? 5 : kind === 'onetimer' ? 3 : kind === 'deke' ? 3 : 0) });
    return play(frames, 'REPLAY', .5);
  }
  function play(frames, lab, sp = .5) { clip = frames; on = true; playT = 0; clipLen = frames[frames.length - 1].t - frames[0].t; label = lab; speed = sp; Bus.emit('replay_start', { label: lab }); return true; }
  /** at a stoppage: a pending big-hit / KABOOM clip */
  function atStoppage(m) { if (m.replayClip && m.cfg.replays !== 'off') { const c = m.replayClip; m.replayClip = null; return play(c.frames, c.label, .6); } return false; }
  function frame() { if (!clip) return null; const t = clip[0].t + playT; let i = 0; while (i < clip.length - 1 && clip[i + 1].t < t) i++; return clip[i]; }
  function step(m, dt, skip) {
    if (!on) return;
    playT += dt * speed;
    const f = frame();
    if (f) {
      // re-pose every rig from the frame, re-fire its marks
      m.skaters.forEach((s, i) => apply(s, f.sk[i], dt * speed)); m.goalies.forEach((g, i) => apply(g, f.g[i], dt * speed));
      for (const e of f.ev) if (!e._r || e._r !== f.t + ':' + playT.toFixed(1)) { e._r = f.t + ':' + playT.toFixed(1); Fx.replayEvent(e); }
    }
    if (playT >= clipLen || skip) stop();
  }
  function apply(e, sn, dt) { if (!sn || !e.rig) return; if (sn.hk) e.rig.hk = Object.assign(e.rig.hk, sn.hk, { stick: Object.assign(e.rig.hk.stick || {}, sn.hk.stick || {}) }); if (sn.gear) { e.rig.hkGear.stick = sn.gear.stick; e.rig.hkGear.helmet = sn.gear.helmet; } e.rig.o.hood = sn.hood; if (sn.a) e.rig.update(dt, sn.a); }
  function stop() { on = false; clip = null; Bus.emit('replay_end', {}); }
  function focus() { const f = frame(); if (!f) return [Rink.C.x, Rink.C.y]; const o = f.pk[4]; if (o >= 0) { const s = f.sk[o] || f.sk[0]; return [s.x, s.y]; } return [f.pk[0], f.pk[1]]; }
  /** the position to draw an entity at during a replay (or null when live) */
  const posOf = (kind, i) => { const f = on && frame(); if (!f) return null; return kind === 'pk' ? f.pk : kind === 'g' ? f.g[i] : kind === 'ex' ? f.ex[i] : f.sk[i]; };
  return { record, mark, want, startGoal, atStoppage, step, stop, focus, posOf, play, reset() { ring = []; pend = []; on = false; clip = null; }, clearHilites() { hilites = []; },
    get on() { return on; }, done: () => !on, get label() { return label; }, get hilites() { return hilites; }, get progress() { return clipLen ? playT / clipLen : 0; } };
})();
