/* =============================================================================
 * 21-cams: what the player sees. Each step the match becomes a FRAME (a plain
 * snapshot: ball, fielders, runners, batter); rigs animate from frames; the
 * Plate Cam (Mode 7 from behind the catcher), the Broadcast Cam (a ground view
 * over the park's TileMap), the Moonshot Cam (a Mode 7 chase of a home run) and
 * the Replay Cam (recorded frames replayed at half speed in the isometric view)
 * all draw frames. Camera framing, cut-ins and the pointer-to-zone mapping too.
 * ========================================================================== */
BZ.VIEWS = {};
BZ.makeViews = () => {
  BZ.VIEWS.broadcast = E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 52, 1, 1);
  BZ.VIEWS.high = E.VIEWS.high = new E.View('high', 'High', 0, 70, 1, 1);
  BZ.VIEWS.iso = E.VIEWS.iso;
};
BZ.fieldView = () => { const s = BZ.game.settings && BZ.game.settings.fieldCam; return s === 'high' ? 'high' : s === 'iso' ? 'iso' : 'broadcast'; };
const ZOOMS = [.5, .62, .78, 1];

BZ.cams = {
  mode: 'plate', shake: 0, zoomI: 3, focus: { x: 0, y: 0, z: 0 }, replay: null, ring: [], ringT: 0, cut: 0, moon: null,
  /** the frame: everything drawing needs, from the match */
  frame(M) {
    const P = M.park, b = M.ball, S = M.ab, H = P.H;
    const fr = { t: M.clock, ball: { x: b.x, y: b.y, z: b.z, mode: b.mode, inv: b.invisible, zooka: b.boost > 0 || (M.lastBatted && M.lastBatted.zooka && b.mode === 'batted'), laser: b.laser && b.mode === 'thrown', trail: b.trail ? b.trail.slice(-12) : [] }, fielders: [], runners: [], batter: null, phase: M.phase, sub: S && S.sub };
    for (const f of M.fielders) fr.fielders.push({ id: f.player.id, job: f.pos === 'C' ? 'catch' : f.pos === 'P' ? 'pitch' : 'field', pos: f.pos, x: f.x, y: f.y, z: f.z, vx: f.vx || 0, vy: f.vy || 0, facing: f.facing, state: f.state, has: f.has, throwT: f.throwT, human: f.human ? f.human.player : 0, charge: f.charge ? f.charge.t : 0, tag: f.tagT > 0 });
    if (M.phase === 'inPlay' || M.phase === 'playOver' || (M.runners && M.runners.length && M.phase !== 'atBat')) {
      for (const r of M.runners) { if (r.state === 'out' || r.state === 'scored' || r.state === 'cancel') continue; const p = BZ.runnerPos(M, r.p), q = BZ.runnerPos(M, Math.min(4, r.p + .01)); fr.runners.push({ id: r.player.id, x: p.x, y: p.y, facing: Math.atan2(q.y - p.y, q.x - p.x) + (r.goal < r.p ? Math.PI : 0), moving: r.state === 'run', slide: r.slide > 0, head: r.headfirst, turbo: r.turbo, fire: BZ.offense(M).afterburn > 0, human: r.human }); }
    }
    // runners standing on base between pitches
    if (M.phase === 'atBat') for (let i = 0; i < 3; i++) if (M.bases[i]) { const bp = P.base(i + 1), lead = (M.leads[i + 1] ? 24 : 12), nx = P.base(i + 2); const dx = nx.x - bp.x, dy = nx.y - bp.y, d = Math.hypot(dx, dy); fr.runners.push({ id: M.bases[i].id, x: bp.x + dx / d * lead, y: bp.y + dy / d * lead, facing: Math.atan2(H.y - bp.y, H.x - bp.x), moving: false, lead: true }); }
    if (M.phase === 'atBat' || M.phase === 'pregame' || M.phase === 'halfStart') {
      const lefty = (M.batter.bt || 'R/R')[0] === 'L';
      fr.batter = { id: M.batter.id, x: H.x + (lefty ? 18 : -18), y: H.y - 4, facing: lefty ? Math.PI : 0, lefty, swing: S && S.swing ? { type: S.swing.type, t: S.pitch ? S.pitch.t - S.swing.t0 : 0 } : null, bunt: S && S.bunting, zooka: BZ.offense(M).batzookaArmed };
    }
    if (S && S.pitch && (S.sub === 'flight' || S.sub === 'settle')) { const u = S.pitch.u, p = S.pitch.pos(Math.min(u, 1.12)); fr.pitch = { x: H.x + p.x, y: H.y + p.y, z: p.z, u, vis: S.pitch.visible(u), type: S.type, def: S.pitch.def, speed: S.pitch.speed, t: S.pitch.t }; }
    fr.windup = S && S.sub === 'windup' ? { u: S.t / S.windT, t: S.t, windT: S.windT } : null;
    fr.released = S && S.sub === 'flight' ? S.t : -1;
    return fr;
  },
  /** record the last 8 s of frames (60 Hz) for replays */
  record(M, fr, dt) { this.ringT += dt; if (this.ringT < 1 / 60) return; this.ringT = 0; this.ring.push(fr); if (this.ring.length > 480) this.ring.shift(); },
  startReplay(M, seconds = 5) {
    if (!this.ring.length) return false;
    const n = Math.min(this.ring.length, Math.round(seconds * 60));
    this.replay = { frames: this.ring.slice(-n), i: 0, acc: 0 };
    BZ.bus.emit('replay', {});
    return true;
  },
  /* ---- rigs follow frames ---- */
  animate(M, fr, dt) {
    if (!BZ.cosmetic) return;
    const t = fr.t;
    for (const f of fr.fielders) {
      const pl = BZ.get('players', f.id); if (!pl) continue;
      const rig = BZ.rigFor(pl, f.job);
      const s = { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing };
      if (f.pos === 'C' && (fr.phase === 'atBat' || fr.phase === 'halfStart')) { s.pose = 'crouch'; s.vx = s.vy = 0; s.facing = -Math.PI / 2; }
      if (f.pos === 'P' && fr.phase === 'atBat') {
        s.facing = Math.PI / 2;
        if (fr.windup) { const u = fr.windup.u; s.attack = u < .58 ? BZ.atk('knee', 'wind', u / .58) : BZ.atk('throw', 'wind', (u - .58) / .42); }
        else if (fr.released >= 0) s.attack = BZ.motionAt('throw', fr.released, 0, .08, .35);
      }
      if (f.state === 'dive' || f.state === 'prone') { s.down = .75; s.facing = f.facing + Math.PI; }
      if (f.state === 'jump') s.air = true;
      if (f.state === 'climb') { s.climb = true; s.vz = 60; }
      if (f.state === 'down') { s.pose = 'down'; }
      if (f.state === 'throw') s.attack = BZ.atk('throw', 'wind', clamp(1 - f.throwT / .22, 0, 1));
      if (f.tag) s.attack = BZ.atk(BZ.MOTION.tag, 'active', .5);
      if (f.charge) s.attack = BZ.atk('throw', 'wind', Math.min(1, f.charge / .6) * .8);
      if (f.state === 'celebrate') s.pose = 'cheer';
      if (f.state === 'sad') { s.pose = 'kneel'; s.expr = 'wince'; }
      BZ.rigUpdate(rig, dt, s);
    }
    for (const r of fr.runners) {
      const pl = BZ.get('players', r.id); if (!pl) continue;
      const rig = BZ.rigFor(pl, 'run');
      const s = { x: r.x, y: r.y, z: 0, facing: r.facing, vx: r.moving ? Math.cos(r.facing) * 140 : 0, vy: r.moving ? Math.sin(r.facing) * 140 : 0, sprint: r.turbo };
      if (r.slide) { s.down = .7; if (r.head) s.facing = r.facing + Math.PI; }
      if (r.cheer) s.pose = 'cheer';
      BZ.rigUpdate(rig, dt, s);
    }
    if (fr.batter) {
      const pl = BZ.get('players', fr.batter.id), rig = BZ.rigFor(pl, 'bat'), B = fr.batter;
      const s = { x: B.x, y: B.y, z: 0, facing: B.facing, vx: 0, vy: 0 };
      if (B.swing) { const S = BZ.SWINGS[B.swing.type] || BZ.SWINGS.contact, spec = B.swing.type === 'contact' ? BZ.MOTION.swing : BZ.MOTION.power; s.attack = BZ.motionAt(spec, B.swing.t, Math.max(.02, S.delay - .04), .08, .32); }
      else if (B.bunt) s.attack = BZ.atk(BZ.MOTION.bunt, 'active', .5);
      else { rig.sqV += Math.sin(t * 5 + (pl.num || 1)) * .004; }
      BZ.rigUpdate(rig, dt, s);
    }
    const ump = BZ.umpireRig(), H = M.park.H;
    BZ.rigUpdate(ump, dt, { x: H.x, y: H.y + 30, z: 0, facing: -Math.PI / 2, pose: fr.phase === 'atBat' ? 'crouch' : null, attack: M.umpCall ? BZ.motionAt(M.umpCall.spec, M.umpCall.t, .12, .1, .6) : null, expr: M.umpCall && M.umpCall.t < .8 ? 'shout' : null });
    if (M.umpCall) { M.umpCall.t += dt; if (M.umpCall.t > 1) M.umpCall = null; }
  },
  /* ---- the pointer on the strike-zone plane (Mode 7's projection, inverse-interpolated) ---- */
  pointerToZone(p) {
    const M = BZ.M, m7 = M && BZ.mode7(M.parkId); if (!M || !m7 || this.mode !== 'plate' || !BZ.game.r) return null;
    const H = M.park.H, y = H.y - 6, a = m7.project(H.x, y, 0), b = m7.project(H.x + 1, y, 0), c = m7.project(H.x, y, 1);
    if (!a || !b || !c) return null;
    const sx = p[0] * (BZ.game.r.W / BZ.game.r.W), x = (sx - a[0]) / (b[0] - a[0]), z = (p[1] - a[1]) / (c[1] - a[1]);
    return [x, z];
  },
  plateCam(M) {
    const P = M.park, H = P.H, lefty = M.batter && (M.batter.bt || 'R/R')[0] === 'L', side = lefty ? -4 : 4, close = BZ.game.settings && BZ.game.settings.plateCam === 'close';
    return { x: H.x + side, y: H.y + (close ? 60 : TUNE.plateDist), h: close ? 36 : TUNE.plateHeight, angle: -Math.PI / 2, pitch: 9, fov: close ? 40 : TUNE.plateFov };
  },
  /* ---- the camera each step ---- */
  update(M, dt) {
    const g = BZ.game;
    this.shake = Math.max(0, this.shake - dt);
    if (this.replay) return;
    if (this.moon) { this.moon.t += dt; return; }
    const want = (M.phase === 'atBat' || M.phase === 'pregame' && false) ? 'plate' : (M.phase === 'inPlay' || M.phase === 'playOver' || M.phase === 'halfEnd' || M.phase === 'between' || M.phase === 'halfStart' || M.phase === 'rhubarb' || M.phase === 'final' || M.phase === 'pregame' || M.phase === 'boom') ? 'field' : 'plate';
    if (want !== this.mode) { this.mode = want; this.cut = .3; if (want === 'field') { this.zoomI = 3; g.cam.snap = true; } }
    this.cut = Math.max(0, this.cut - dt);
    if (this.mode === 'field') this.frameField(M, dt);
  },
  frameField(M, dt) {
    const g = BZ.game, P = M.park, H = P.H, b = M.ball, pts = [];
    if (M.phase === 'inPlay' || M.phase === 'playOver') {
      if (b.mode !== 'none') pts.push({ x: b.x, y: b.y, z: BZ.displayZ(b.z) });
      const pr = M.play && M.play.pred; if (pr && pr.land && b.mode === 'batted' && !b.bounced) pts.push({ x: pr.land.x, y: pr.land.y, z: 0 });
      const h = BZ.play.holder(M);
      if (h) { pts.push(h); const lt = M.play.lastThrow; if (h.throwBase) pts.push(P.base(h.throwBase)); }
      else if (M.play && M.play.chaser) pts.push(M.play.chaser);
      const lead = M.runners.filter(r => r.state === 'run').sort((a, c) => c.p - a.p)[0]; if (lead && pts.length < 3) pts.push(BZ.runnerPos(M, lead.p));
      if (!pts.length) pts.push({ x: H.x, y: H.y - 200, z: 0 });
    } else if (M.phase === 'rhubarb') { pts.push({ x: H.x - 60, y: H.y - 40 }, { x: H.x + 60, y: H.y + 10 }); }
    else if (M.phase === 'between' && BZ.crowd && BZ.crowd.showFocus) pts.push(...BZ.crowd.showFocus(M));
    else { pts.push({ x: H.x - 230, y: H.y - 470 }, { x: H.x + 230, y: H.y + 10 }); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, zm = 0;
    for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y - (p.z || 0) * .8); y1 = Math.max(y1, p.y); zm = Math.max(zm, p.z || 0); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = (x1 - x0) + 120, h = (y1 - y0) * .8 + 110;
    const r = g.r, W = r ? r.W : 427, Hh = r ? r.H : 240;
    const need = Math.min(W / w, Hh / h) / TUNE.fieldZoom;
    // discrete zoom levels with hysteresis (each level's floor is baked once)
    let zi = this.zoomI;
    while (zi > 0 && ZOOMS[zi] > need * 1.02) zi--;
    while (zi < ZOOMS.length - 1 && ZOOMS[zi + 1] < need * .82) zi++;
    if (zi !== this.zoomI) { this.zoomI = zi; }
    const z = clamp(ZOOMS[this.zoomI] * TUNE.fieldZoom, .5, 2.5);
    if (Math.abs(g.zoom - z) > .001) g.setZoom(z);
    this.focus.x += (cx - this.focus.x) * Math.min(1, dt * 7); this.focus.y += (cy - this.focus.y) * Math.min(1, dt * 7);
    if (this.cut > .25) { this.focus.x = cx; this.focus.y = cy; }
    g.focus(this.focus.x, this.focus.y, 0);
    g.cam.smooth = .12;
  },
  /** the Moonshot Cam: a Mode 7 chase of a home run in slow motion, then the landing */
  startMoonshot(M, then) {
    if (M.fast || !BZ.cosmetic) { then && then(); return; }
    const b = M.ball, v = Math.hypot(b.vx, b.vy) || 1;
    this.moon = { t: 0, x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, boost: b.boost, angle: Math.atan2(b.vy, b.vx), then, landed: false };
    BZ.game.timeScale = .45 * TUNE.gameSpeed;
    BZ.bus.emit('cinematic', { kind: 'moonshot' });
    void v;
  },
  moonStep(M, dt) {
    const m = this.moon; if (!m) return;
    const g = BZ.gravity(M.park), sd = dt;
    if (!m.landed) {
      m.vz -= g * sd; const dr = TUNE.drag * sd; m.vx -= m.vx * dr; m.vy -= m.vy * dr;
      if (m.boost > 0) { const s = Math.hypot(m.vx, m.vy, m.vz) || 1; m.vx += m.vx / s * 900 * sd; m.vy += m.vy / s * 900 * sd; m.vz += m.vz / s * 900 * sd; m.boost -= sd; }
      m.x += m.vx * sd; m.y += m.vy * sd; m.z += m.vz * sd;
      if (BZ.cosmetic && BZ.F() < .5) BZ.game.particles.add({ kind: m.boost > 0 ? 'fire' : 'smoke', x: m.x, y: m.y, z: m.z, life: .6 });
      if (m.z <= 0 || m.t > 3.4) { m.landed = true; m.lt = m.t; BZ.bus.emit('moonLand', { x: m.x, y: m.y }); BZ.game.timeScale = TUNE.gameSpeed; }
    }
    if (m.landed && m.t - m.lt > 1.3) { const cb = m.then; this.moon = null; BZ.game.timeScale = TUNE.gameSpeed; if (cb) cb(); }
  },

  /* ---- drawing: the Plate Cam ---- */
  drawPlate(r, M, fr) {
    const P = M.park, m7 = BZ.mode7(M.parkId), t = r.game.time, hype = BZ.supers.hype(M);
    m7.cam = this.plateCam(M);
    if (this.shake > 0) { m7.cam.x += (BZ.F() - .5) * 2; m7.cam.h += (BZ.F() - .5) * 2; }
    P.feedMode7(m7, t, hype);
    if (BZ.hazard && BZ.hazard.drawM7) BZ.hazard.drawM7(m7, M, t);
    // players: fielders (the catcher in front), runners leading off, the batter
    for (const f of fr.fielders) {
      const pl = BZ.get('players', f.id), rig = BZ.rigFor(pl, f.job); if (!rig) continue;
      // the catcher: drawn smaller and lower than true perspective (as classic baseball games do) so the zone stays clear
      if (f.pos === 'P' && M.derby) { m7.shape('bz_pitchomatic', f.x, f.y, 0, { facing: Math.PI / 2, size: 1.4 }); continue; }   // the Derby's Pitch-O-Matic 3000
      if (f.pos === 'C') { m7.add(f.x, f.y, 0, (g, sx, sy, k) => { const kk = k * .5, H0 = BZ.cams.zoneBottomY || sy; px.blend(g, .9, 'normal', () => rig.draw(g, Math.round(sx), Math.round(Math.max(sy, H0 + 20 * kk * 1.25 + 4)), m7.view(kk))); }); continue; }
      m7.rig(rig, f.x, f.y, f.z);
      m7.add(f.x, f.y, -.5, (g, sx, sy, k) => { px.blend(g, .3, 'multiply', () => px.ell(g, sx, sy, Math.max(1, 6 * k), Math.max(1, 2 * k), '#000')); });
    }
    for (const rn of fr.runners) { const rig = BZ.rigFor(BZ.get('players', rn.id), 'run'); if (rig) m7.rig(rig, rn.x, rn.y, 0); }
    if (fr.batter) {
      const B = fr.batter, rig = BZ.rigFor(BZ.get('players', B.id), 'bat');
      m7.rig(rig, B.x, B.y, 0);
      if (B.zooka) { const T = BZ.offense(M).def; m7.add(B.x, B.y + 1, 0, (g, sx, sy, k) => BZ.drawBatzooka(g, rig, (x, y, z) => m7.project(x, y, z), k, t, T.zookaColors)); }
    }
    // the pitch
    if (fr.pitch && fr.pitch.vis) {
      const p = fr.pitch;
      m7.add(p.x, p.y, 0, (g, sx, sy, k) => {
        const q = m7.project(p.x, p.y, p.z); if (!q) return;
        const rad = Math.max(1.2, 1.6 * q[2] * (p.def.tiny ? .45 : 1));
        BZ.drawPitchTrail(g, m7, p, q, rad, t, M);
        px.ell(g, q[0], sy, Math.max(1, rad), Math.max(.5, rad * .35), '#00000060');
        px.disc(g, q[0], q[1], rad, p.def.tiny ? '#1a0a2a' : '#f8f8f4'); if (rad > 2.5) { px.dot(g, q[0] - rad * .3, q[1] - rad * .3, '#ffffff'); px.line(g, q[0] - rad * .5, q[1] + rad * .2, q[0] + rad * .4, q[1] - rad * .3, '#d83a2a'); }
        if (M.golden || (M.derby && M.derby.golden)) px.blend(g, .6, 'add', () => px.disc(g, q[0], q[1], rad + 1, '#ffd040'));
      });
    } else if (fr.pitch && !fr.pitch.vis) {
      const p = fr.pitch; m7.add(p.x, p.y, 0, (g, sx, sy, k) => { const q = m7.project(p.x, p.y, p.z); if (q && BZ.F() < .4) px.blend(g, .25, 'add', () => px.disc(g, q[0], q[1], 1.6 * q[2], '#a0ffe0')); });
    }
    // the ball in the pitcher's glove / the umpire is not drawn here (he'd fill the screen)
    m7.draw(r, m7.cam);
    { const zb = m7.project(P.H.x, P.H.y - 6, BZ.GEO.zoneLo); this.zoneBottomY = zb ? zb[1] : null; }
    BZ.hud && BZ.hud.plateOverlay(r, M, fr, m7);
  },
  /* ---- drawing: the Broadcast Cam (and replays) ---- */
  drawField(r, M, fr) {
    const P = M.park, t = r.game.time, hype = BZ.supers.hype(M), H = P.H;
    const bd = BZ.backdrop(M.parkId);
    if (bd && r.view.pitchDeg < 60) { /* the sky past the far stands (a ground view's floor runs to the edges) */ }
    P.drawBroadcast(r, t, hype);
    if (BZ.hazard && BZ.hazard.draw) BZ.hazard.draw(r, M, t);
    if (BZ.crowd) BZ.crowd.drawField(r, M, t);
    // players
    const actor = (rig, x, y, z, o) => r.actor(x, y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), o);
    for (const f of fr.fielders) {
      if (f.pos === 'P' && M.derby) { r.shape('bz_pitchomatic', f.x, f.y, 0, { facing: Math.PI / 2, scale: 1.4 }); continue; }
      const rig = BZ.rigFor(BZ.get('players', f.id), f.job); if (!rig) continue;
      r.shadow(f.x, f.y, 6, .4);
      actor(rig, f.x, f.y, f.z, { outline: f.human ? E.PLAYER_COLORS[(f.human - 1) % 4] : undefined, xray: !!f.human });
      if (f.human) BZ.hud && BZ.hud.playerArrow(r, f, f.human);
      if (f.has && f.charge) BZ.hud && BZ.hud.throwMeter(r, f);
    }
    for (const rn of fr.runners) {
      const rig = BZ.rigFor(BZ.get('players', rn.id), 'run'); if (!rig) continue;
      r.shadow(rn.x, rn.y, 6, .4);
      actor(rig, rn.x, rn.y, 0);
      if (rn.fire && rn.moving && BZ.F() < .5) r.game.particles.add({ kind: 'fire', x: rn.x, y: rn.y, z: 2, life: .35 });
      if ((rn.slide || rn.turbo) && rn.moving && BZ.F() < .4) r.game.particles.dust(rn.x, rn.y, 1, 1);
    }
    if (fr.batter) { const rig = BZ.rigFor(BZ.get('players', fr.batter.id), 'bat'); r.shadow(fr.batter.x, fr.batter.y, 6, .4); actor(rig, fr.batter.x, fr.batter.y, 0); }
    const ump = BZ.umpireRig(); r.shadow(H.x, H.y + 30, 6, .4); actor(ump, H.x, H.y + 30, 0);
    // the ball, its shadow, its trail and the landing marker
    const b = fr.ball;
    if (b.mode !== 'none' && b.mode !== 'held' && b.mode !== 'pitch') {
      const dz = BZ.displayZ(b.z);
      r.shadow(b.x, b.y, 2.4, .5);
      if (!b.inv) {
        if (b.trail && b.trail.length > 2 && (b.zooka || b.laser || Math.hypot(M.ball.vx, M.ball.vy) > 500)) r.queue(b.x, b.y, dz, g => { let prev = null; b.trail.forEach((p, i) => { const q = r.w(p[0], p[1], BZ.displayZ(p[2])); if (prev) px.line(g, prev[0], prev[1], q[0], q[1], b.laser ? '#ff3a3a' : b.zooka ? (i % 2 ? '#ffd040' : '#ff6a1a') : '#ffffff80', b.zooka ? 2 : 1); prev = q; }); }, { emissive: b.zooka || b.laser });
        r.queue(b.x, b.y, dz, g => { const q = r.w(b.x, b.y, dz), s = Math.max(1.5, 2.2 * (r.view.scale || 1) * (r.game.zoom || 1)); px.disc(g, q[0], q[1], s, '#ffffff'); px.dot(g, q[0] - 1, q[1] - 1, '#ffffff'); px.dot(g, q[0], q[1] + 1, '#c83a2a'); }, { bias: 4 });
      }
      const pr = M.play && M.play.pred;
      if (pr && pr.land && M.ball.mode === 'batted' && !M.ball.bounced && fr === this.live) {
        const lx = pr.land.x, ly = pr.land.y, pulse = 1 + .25 * Math.sin(t * 10);
        r.decal(g => { r.groundRing(lx, ly, 9 * pulse, '#ffd040'); const a = r.w(lx - 5, ly - 5, 0), c = r.w(lx + 5, ly + 5, 0), d = r.w(lx + 5, ly - 5, 0), e = r.w(lx - 5, ly + 5, 0); px.line(g, a[0], a[1], c[0], c[1], '#ff5a1a', 2); px.line(g, d[0], d[1], e[0], e[1], '#ff5a1a', 2); });
      }
    }
    if (BZ.hud && fr === this.live) BZ.hud.fieldOverlay(r, M, fr);
  },
  /** draw the Moonshot Cam */
  drawMoon(r, M) {
    const m = this.moon, m7 = BZ.mode7(M.parkId), P = M.park, t = r.game.time;
    const cam = { x: m.x - Math.cos(m.angle) * 70, y: m.y - Math.sin(m.angle) * 70, h: Math.max(20, m.z + 14), angle: m.angle, pitch: 14, fov: 60 };
    if (m.landed) { cam.x = m.x - Math.cos(m.angle) * 140; cam.y = m.y - Math.sin(m.angle) * 140; cam.h = 70; cam.pitch = 16; }
    P.feedMode7(m7, t, 1);
    m7.add(m.x, m.y, 0, (g, sx, sy, k) => {
      const q = m7.project(m.x, m.y, m.z); if (!q) return;
      const rad = Math.max(2, 1.6 * q[2]);
      px.blend(g, .7, 'add', () => { px.disc(g, q[0], q[1] + rad * 1.6, rad * 1.4, '#ff8a2a'); px.disc(g, q[0], q[1] + rad * 3, rad, '#ffd040'); });
      px.disc(g, q[0], q[1], rad, '#ffffff'); px.dot(g, q[0], q[1], '#d83a2a');
      px.ell(g, sx, sy, rad, rad * .35, '#00000050');
    });
    m7.draw(r, cam);
  }
};
/** pitch trails: speed lines, fire, a wave, a swirl, a laser, popcorn, a ghost shimmer */
BZ.drawPitchTrail = (g, m7, p, q, rad, t, M) => {
  const tr = p.def.trail; if (!tr || !BZ.cosmetic) return;
  const S = M.ab && M.ab.pitch; if (!S) return;
  const back = (du) => { const u = Math.max(0, p.u - du), pp = S.pos(u); return m7.project(M.park.H.x + pp.x, M.park.H.y + pp.y, pp.z); };
  if (tr === 'lines') { for (let i = 1; i <= 3; i++) { const b = back(i * .05); if (b) px.line(g, b[0], b[1], q[0], q[1], '#ffffff', 1); } }
  else if (tr === 'fire' || tr === 'embers') px.blend(g, .85, 'add', () => { for (let i = 1; i <= 6; i++) { const b = back(i * .025); if (b) px.disc(g, b[0] + (BZ.F() - .5) * 2, b[1] + (BZ.F() - .5) * 2, rad * (1.4 - i * .18), i < 3 ? '#ffd040' : '#ff5a1a'); } });
  else if (tr === 'laser' || tr === 'zap') { const b = back(.3); if (b) px.blend(g, .9, 'add', () => { px.line(g, b[0], b[1], q[0], q[1], tr === 'laser' ? '#ff2a4a' : '#7af0ff', Math.max(1, Math.round(rad))); px.line(g, b[0], b[1], q[0], q[1], '#ffffff', 1); }); }
  else if (tr === 'wave') px.blend(g, .5, 'normal', () => { const b = back(.25); if (b) px.poly(g, [[b[0] - rad * 3, b[1] + rad * 4], [q[0] - rad * 2, q[1] + rad * 2], [q[0] + rad * 2, q[1] + rad * 2], [b[0] + rad * 3, b[1] + rad * 4]], '#3ac8e8'); });
  else if (tr === 'swirl') px.blend(g, .6, 'normal', () => { for (let i = 0; i < 6; i++) { const a = t * 12 + i; px.dot(g, q[0] + Math.cos(a) * rad * 3, q[1] + Math.sin(a) * rad * 3, '#6a2aa8'); } });
  else if (tr === 'popcorn') { for (const pop of S.pops || []) if (p.u > pop.u && p.u < pop.u + .12) px.disc(g, q[0] + 3, q[1] - 3, rad * 1.3, '#fff4c0'); }
  else if (tr === 'ghost' || tr === 'flutter' || tr === 'sparkle' || tr === 'bubbles') px.blend(g, .4, 'add', () => { const b = back(.06); if (b) px.disc(g, b[0], b[1], rad, tr === 'ghost' ? '#a0ffe0' : tr === 'bubbles' ? '#a0e8ff' : '#fff0a0'); });
};
