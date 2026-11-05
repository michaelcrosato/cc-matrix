/* ---- Cam: the broadcast director. Follows the puck with a lead; brawler view for fights, replays and intros (PLAN 7.15) ---- */
const Cam = (() => {
  let zoom = 1, fx = 560, fy = 400, free = null;
  const DIST = { Near: .85, Normal: .7, Far: .58 };
  const playView = () => S().camera === 'Overhead' ? 'topdown' : 'threequarter';
  function apply(view, z) {
    if (!game.view || game.view.id !== view) game.setView(view);
    z = Math.round(z * 20) / 20;   // a few zoom steps: each one bakes the floor once
    if (Math.abs(z - zoom) > .001 || Math.abs(game.zoom - z) > .02) { zoom = z; game.setZoom(z); }
  }
  function update(dt) {
    if (!M) return;
    const ph = M.phase, p = M.puck, base = DIST[S().camDist] || 1;
    let v = playView(), z = base, tx = p.x, ty = p.y, tz = 0;
    if (free) { free.x += free.mx * 300 * dt; free.y += free.my * 300 * dt; return game.focus(free.x, free.y, 0); }
    if (ph === 'fight' && M.fight) { v = 'brawler'; z = 1.15; tx = M.fight.mx; ty = M.fight.my; tz = 14; }
    else if (ph === 'replay') { v = 'brawler'; z = .95; const f = Replay.focus(); tx = f[0]; ty = f[1]; tz = 6; }
    else if (ph === 'intro') { v = 'brawler'; z = 1.05; const s = M.skaters[Math.max(0, M.introI)] || M.skaters[0]; tx = s.x; ty = s.y + 10; tz = 14; }
    else if (ph === 'goal' && M.phaseT > .4 && M.lastGoal) { z = base * 1.3; const s = M.byId[M.lastGoal.by]; if (s) { tx = s.x; ty = s.y; } }
    else if (ph === 'final') { z = base * 1.15; tx = Rink.C.x; ty = Rink.C.y; }
    else if (ph === 'faceoff') { z = base * 1.1; tx = M.foDot[0]; ty = M.foDot[1]; }
    else {
      const c = p.owner || p, lead = .25;
      tx = c.x + (p.owner ? p.owner.vx : p.vx) * lead; ty = c.y + (p.owner ? p.owner.vy : p.vy) * lead;
      const hs = M.humans.filter(h => h.s && !h.remote && !h.local === false);
      const locals = M.humans.filter(h => h.s && !h.remote);
      if (locals.length === 1) { const s = locals[0].s, d = Math.hypot(s.x - tx, s.y - ty); if (d > 220) { tx += (s.x - tx) * .25; ty += (s.y - ty) * .25; } }
      else if (locals.length > 1) {
        let x0 = tx, x1 = tx, y0 = ty, y1 = ty; for (const h of locals) { x0 = Math.min(x0, h.s.x); x1 = Math.max(x1, h.s.x); y0 = Math.min(y0, h.s.y); y1 = Math.max(y1, h.s.y); }
        tx = (x0 + x1) / 2; ty = (y0 + y1) / 2; const span = Math.max((x1 - x0) / 380, (y1 - y0) / 220); z = Math.max(.5, base * clamp(1 / Math.max(1, span), .78, 1));
      }
      if (Math.hypot(p.vx, p.vy) > 400 && !p.owner) z = Math.max(.5, Math.min(z, base * .9));
      void hs;
    }
    fx += (tx - fx) * Math.min(1, dt * 7); fy += (ty - fy) * Math.min(1, dt * 7);
    apply(v, z);
    game.focus(fx, fy, tz);
  }
  return { update, apply, playView, reset() { zoom = 0; }, get free() { return free; }, set free(v) { free = v; }, snap(x, y) { fx = x; fy = y; } };
})();

/* ---- Replay: an 8 s ring buffer recorded at 60 Hz; goal replays at half speed, big-hit and KABOOM clips at the next stoppage,
 * and the run's best clips for the end credits (PLAN 7.16) ---- */
const Replay = (() => {
  const MAX = 480, buf = [];
  let tick = 0, play = null, goalMark = null, pending = [];
  const FX_EVENTS = { goal: 1, hit: 1, glass: 1, post: 1, save: 1, blast: 1, kaboom_shot: 1, shot: 1 };
  let evq = [];
  Bus.on('*', e => { if (FX_EVENTS[e.type] && !play) evq.push(e); });
  function reset() { buf.length = 0; tick = 0; play = null; goalMark = null; pending = []; evq = []; }
  function frame() {
    const f = { t: M.t, ev: evq, p: [M.puck.x, M.puck.y, M.puck.z, M.puck.onFire ? 1 : 0, M.puck.inNet ? 1 : 0], s: [], g: [] }; evq = [];
    for (const s of M.skaters) f.s.push([s.x, s.y, s.vx, s.vy, s.facing, s.state, s.stateT, s.act ? s.act.kind : null, s.act ? s.act.t : 0, s.winding, s.charge, s.phaseA, s.holdTurbo, s.celebrate, s.off, s.spinA || 0]);
    for (const g of M.goalies) f.g.push([g.x, g.y, g.facing, g.state, g.stateT, g.vy || 0]);
    return f;
  }
  function record() {
    if (!M || play) return;
    if ((tick++ & 1) === 0) { buf.push(frame()); if (buf.length > MAX) buf.shift(); }
    for (let i = pending.length - 1; i >= 0; i--) { const c = pending[i]; if (M.t >= c.at + 1) { pending.splice(i, 1); const frames = buf.filter(f => f.t >= c.at - 2 && f.t <= c.at + 1); if (frames.length > 20) { M.clips.push({ kind: c.kind, score: c.score, frames }); M.pendingReplay = true; keepHighlight({ kind: c.kind, score: c.score, frames }); } } }
  }
  function markClip(kind, score) { if (!M || play || M.attract) return; if (pending.some(c => M.t - c.at < 2)) return; pending.push({ kind, at: M.t, score }); }
  function markGoal() { if (!M) return; goalMark = M.t; }
  let highlights = [];
  function keepHighlight(c) { if (!M || !M.cfg.chapter) return; c.cfg = { home: M.cfg.home, away: M.cfg.away, arena: M.cfg.arena }; highlights.push(c); highlights.sort((a, b) => b.score - a.score); highlights = highlights.slice(0, 3); }
  function start(frames, speed) { if (!frames.length) return false; play = { frames, i: 0, u: 0, speed, t: 0 }; return true; }
  function playGoal(sec) {
    const t0 = (goalMark || M.t) - sec, frames = buf.filter(f => f.t >= t0 && f.t <= (goalMark || M.t) + .8);
    if (M.lastGoal && M.cfg.chapter) keepHighlight({ kind: 'goal', score: 400 + (M.lastGoal.kind === 'kaboom' ? 200 : 0), frames: frames.slice() });
    if (!start(frames, .5)) return; play.kind = 'goal';
  }
  function playClip() { const c = M.clips.sort((a, b) => b.score - a.score)[0]; M.clips = []; if (!c || !start(c.frames, .5)) { play = null; return; } play.kind = c.kind; }
  function apply(f, dt) {
    M.puck.x = f.p[0]; M.puck.y = f.p[1]; M.puck.z = f.p[2]; M.puck.onFire = !!f.p[3]; M.puck.inNet = !!f.p[4]; M.puck.owner = null; M.puck.held = false;
    M.skaters.forEach((s, i) => { const a = f.s[i]; if (!a) return; [s.x, s.y, s.vx, s.vy, s.facing, s.state, s.stateT] = a; s.act = a[7] ? { kind: a[7], t: a[8] } : null; s.winding = a[9]; s.charge = a[10]; s.phaseA = a[11]; s.holdTurbo = a[12]; s.celebrate = a[13]; s.off = a[14]; s.spinA = a[15]; Match.rigStep(s, dt); });
    M.goalies.forEach((g, i) => { const a = f.g[i]; if (!a) return; [g.x, g.y, g.facing, g.state, g.stateT, g.vy] = a; g.rig.hk = g.rig.hk || { mode: 'goalie' }; g.rig.hk.state = g.state; g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: g.vy, facing: g.facing, down: g.state === 'blasted' ? Math.min(1, g.stateT * 3) : 0 }); });
    for (const e of f.ev) Fx.event(e, true);
  }
  function step(dt) {
    if (!play) return;
    play.t += dt;
    if (UI.anyPressed('confirm') || UI.anyPressed('pass') || (M.cfg.session && play.t > 3.2)) { game.players.forEach(p => p.consumeAll()); play.i = play.frames.length; return; }
    play.u += dt * 60 * play.speed;
    while (play.u >= 1 && play.i < play.frames.length) { play.u -= 1; apply(play.frames[play.i], 1 / 60 * play.speed); play.i++; }
    Cam.update(dt);
  }
  const done = () => !play || play.i >= play.frames.length;
  function stop() { play = null; }
  const focus = () => [M.puck.x, M.puck.y];
  /** the end credits: a highlight's frames played back on a match built for them */
  return { reset, record, markClip, markGoal, playGoal, playClip, step, done, stop, focus, start, apply, get playing() { return !!play; }, get kind() { return play && play.kind; }, get highlights() { return highlights; }, clearHighlights() { highlights = []; } };
})();
