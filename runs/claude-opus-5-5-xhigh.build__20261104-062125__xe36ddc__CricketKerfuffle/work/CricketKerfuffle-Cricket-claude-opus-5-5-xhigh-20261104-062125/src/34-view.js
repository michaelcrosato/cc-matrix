/* ---- THE MATCH VIEW: four fixed orthographic cameras, cut like TV (never a zoom tween: each zoom would re-bake the
 * floor). broadcast (behind the bowler, telephoto: every delivery), wide (follows the ball round the ground), review
 * (side-on, for the third umpire and run-out replays) and close (wickets, celebrations, signals). The director picks a
 * named shot from the ball's state; every in-match change is a hard cut. This file also draws the match: the ground,
 * the far-end panorama, props, the crowd, the players' rigs, the ball and its trail, the stumps and the effects. ---- */
const Views = {
  v: {},
  make() {
    this.v.broadcast = new E.View('broadcast', 'Broadcast', 0, T('camPitch'), T('camScale'), 1);
    this.v.wide = new E.View('wide', 'Wide', 0, 55, T('wideScale'), 1);
    this.v.review = new E.View('review', 'Side-on', 90, 10, 2.2, 1);
    this.v.close = new E.View('close', 'Close-up', 0, 24, 2.4, 1);
    this.v.story = new E.View('story', 'Three-quarter', 0, 50, 1.6, 1.25);
    return this.v;
  },
  rebuild(which) { const v = this.v[which]; if (!v) return; if (which === 'broadcast') v.set(0, T('camPitch'), T('camScale'), 1); if (which === 'wide') v.set(0, 55, T('wideScale'), 1); }
};
/* the recorder: the last 10 s at 30 Hz (each actor's pose inputs, the ball, the stumps), for instant replays and the
 * results screen's highlights */
const Recorder = {
  frames: [], max: 300, acc: 0,
  reset() { this.frames = []; this.acc = 0; },
  push(m, dt) {
    this.acc += dt; if (this.acc < 1 / 30) return; this.acc = 0;
    const A = []; for (const a of m.fielders.concat(m.batters)) A.push({ id: a.id, x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, anim: Object.assign({}, a.anim), down: a.down, hand: a.hand });
    this.frames.push({ t: m.time, A, ball: { x: m.ball.x, y: m.ball.y, z: m.ball.z, phase: m.ball.phase, hidden: m.ball.hidden }, stumps: MatchView.stumpsState ? MatchView.stumpsState.slice() : null });
    if (this.frames.length > this.max) this.frames.shift();
  },
  /** the frames of the last `seconds` before now (a replay's window) */
  window(seconds) { const n = Math.round(seconds * 30); return this.frames.slice(Math.max(0, this.frames.length - n)); }
};
/* a seagull, wings up and wings down (white, grey wingtips, an orange beak) */
const GULL_UP = E.sprite(['k.....k', 'kw...wk', '.wwbww.', '..www..'], { k: '#5a5a62', w: '#f4f4f0', b: '#ffb030' }, 2);
const GULL_DOWN = E.sprite(['..www..', '.wwbww.', 'kw...wk', 'k.....k'], { k: '#5a5a62', w: '#f4f4f0', b: '#ffb030' }, 2);
const MatchView = {
  B: null, m: null, shot: 'broadcastSetup', cam: 'broadcast', shotT: 0, trail: [], bails: [], fxList: [], replay: null, stumpsState: [0, 0], flashT: 0, lastBallPhase: null, cutAt: 0,
  attach(m) {
    this.m = m; this.B = Ground.get(m.ground.id); this.trail = []; this.bails = []; this.fxList = []; this.replay = null; this.stumpsState = [0, 0]; this.cam = 'broadcast'; this.shot = 'broadcastSetup'; this.shotT = 0;
    Recorder.reset();
    K.view = Views.v.broadcast;
    this.setCam('broadcast');
  },
  setCam(id) { this.cam = id; K.game.setView(Views.v[id]); K.view = Views.v[id]; },
  night() { return this.m && this.m.timeOfDay === 'night'; },
  /** the director: choose a shot from what the ball is doing */
  direct(dt) {
    const m = this.m, g = K.game, B = this.B; if (!m) return;
    this.shotT += dt;
    const b = m.ball, want = (() => {
      if (this.replay) return this.replay.cam;
      if (m.decision && m.decision.reviewing && m.decision.kind === 'lbw') return 'broadcast';
      if (m.decision && m.decision.kind === 'third' && m.decision.pending) return 'review';
      if (m.phase === 'inPlay' || (m.phase === 'dead' && (m.cur.boundary || m.ballFlying > 0))) {
        if (m.cur.stumpChance) return 'broadcast';
        const c = m.contact, lofted = c && c.launch > 18, outOfFrame = this.leavesFrame();
        if ((lofted || outOfFrame || !c) && m.pt > .12) return 'wide';
        if (this.cam === 'wide') return 'wide';
        return 'broadcast';
      }
      if (m.phase === 'dead' && m.cur.wicket && !m.decision && m.pt < 1.6) return m.pt < .9 ? (this.cam === 'wide' ? 'wide' : 'close') : 'close';
      if (m.phase === 'dead' && this.cam === 'wide' && m.pt < 1.2) return 'wide';
      if (m.phase === 'dead' && m.decision && m.decision.pending) return 'close';
      return 'broadcast';
    })();
    if (want !== this.cam) { this.setCam(want); this.shotT = 0; coverage.mark('cam:' + want); }
    // the camera's point
    const cam = g.cam; cam.smooth = 0;
    if (this.cam === 'broadcast') {
      const by = Views.v.broadcast.by || .3, H = g.H || 240, yf = 20 + .1 * H / by;   // the striker's feet at 40% of the screen's height
      g.focus(B.OX, B.OY + yf, 0);
    } else if (this.cam === 'wide') {
      cam.smooth = .22;
      const lead = m.chaser && m.chaser.chase && !m.holder ? m.chaser.chase : null, fx = lead ? (b.x + lead.x) / 2 : b.x, fy = lead ? (b.y + lead.y) / 2 : b.y;
      const src = this.replay ? this.replay.ball : b;
      g.focus(B.OX + (this.replay ? src.x : fx), B.OY + (this.replay ? src.y : fy), 0);
    } else if (this.cam === 'close') {
      const w = m.cur.wicket, catcher = w && w.catcher ? m.fielders.find(f => f.id === w.catcher) : null;
      const t = m.decision && m.decision.pending ? m.umpires[0] : catcher || (m.cur.stumpsBroken ? { x: 0, y: 0 } : m.striker) || m.striker;
      g.focus(B.OX + (t ? t.x : 0), B.OY + (t ? t.y : 0), 14);
    } else if (this.cam === 'review') { g.focus(B.OX + 0, B.OY + (m.cur.wicket && m.cur.wicket.end === 'bowler' ? G.BOWL_Y : 0), 10); }
  },
  /** will the ball leave the broadcast frame within 0.8 s (past the panorama, or the screen's edges)? */
  leavesFrame() {
    const m = this.m, s = m.samples; if (!s || !s.length) return false;
    const v = Views.v.broadcast, W = K.game.W || 427;
    for (const p of s) { if (p.t > .8) break; if (p.y < -185 || Math.abs(p.x * v.ax) > W / 2 - 10 || p.y > 520) return true; }
    return false;
  },
  /* ---- the rigs: posed each step from the simulation (or from a replay's frame) ---- */
  rigFor(a, m) {
    if (a.role === 'umpire') return Cast.umpire(a.u);
    const role = a.role === 'batter' ? 'bat' : a === m.keeper ? 'keep' : 'field';
    return Cast.rig(a.p, role);
  },
  updateRigs(dt) {
    const m = this.m, B = this.B; if (!m) return;
    const frame = this.replay ? this.replayFrame() : null;
    const list = m.fielders.concat(m.batters);
    for (const a of list) {
      const src = frame ? (frame.A.find(f => f.id === a.id) || a) : a, rig = this.rigFor(a, m);
      if (a.p && a.p.machine) continue;
      const role = a.role === 'batter' ? 'bat' : a === m.bowler ? 'bowl' : a === m.keeper ? 'keep' : 'field';
      const st = Anim.state(Object.assign({}, a, src, { anim: src.anim || a.anim }), B, frame ? null : m, role);
      rig.oneHand = !!a.oneHand && role === 'bat';
      rig.o.batScale = role === 'bat' && m.flags.giantBat > 0 ? 1.6 : 1;
      rig.update(dt, st);
    }
    for (const u of m.umpires) {
      const rig = Cast.umpire(u.u), an = u.anim || {};
      if (an.kind === 'signal') { rig.sig = an.sig; rig.sigT = an.t; if (an.t > 3.2) { u.anim = { kind: 'idle', t: 0 }; rig.sig = null; } } else rig.sig = null;
      rig.update(dt, { x: u.x + B.OX, y: u.y + B.OY, z: 0, vx: 0, vy: 0, facing: u.facing, crouch: m.phase === 'runup' || m.phase === 'flight' ? .3 : 0, expr: an.sig === 'out' ? 'angry' : null });
    }
    // the trail and effects
    const b = frame ? frame.ball : m.ball;
    if (b.phase !== 'held' && !(b.phase === 'dead' && !m.ballFlying)) { this.trail.push([b.x, b.y, b.z]); if (this.trail.length > 12) this.trail.shift(); } else if (this.trail.length) this.trail.shift();
    for (const p of this.bails) { p.vz -= 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt; if (p.z < 0) { p.z = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; p.vr *= .5; } p.t += dt; }
    this.bails = this.bails.filter(p => p.t < 4);
    for (const f of this.fxList) f.t += dt; this.fxList = this.fxList.filter(f => f.t < f.life);
    if (!frame) Recorder.push(m, dt);
    if (this.replay) { this.replay.t += dt * this.replay.speed; if (this.replay.t >= this.replay.len) this.replay = null; }
  },
  /* ---- replays: re-pose the rigs from the recorded frames at half speed with a REPLAY bug ---- */
  startReplay(seconds, cam) {
    const fr = Recorder.window(seconds); if (fr.length < 10) return false;
    this.replay = { frames: fr, t: 0, len: fr.length / 30, speed: .5, cam: cam || 'broadcast', ball: fr[0].ball };
    this.trail = []; coverage.mark('replay');
    return true;
  },
  replayFrame() { const R = this.replay, i = clamp(Math.floor(R.t * 30), 0, R.frames.length - 1), f = R.frames[i]; R.ball = f.ball; return f; },
  skipReplay() { this.replay = null; },
  /* ---- events that make effects ---- */
  onEvent(type, d) {
    const m = this.m, P = K.game.particles, B = this.B; if (!m || d.match !== m) return;
    const W = (x, y) => [x + B.OX, y + B.OY];
    if (type === 'bat:contact') {
      const [x, y] = W(m.ball.x, m.ball.y);
      P.bits(x, y, m.ball.z, d.grade === 'perfect' ? 10 : 5, ['#e2c890', '#c8a868', '#fff4d8']);
      if (d.grade === 'perfect' && d.kind === 'clean') { P.impact && P.impact(x, y, m.ball.z, 1.2, '#fff6c0'); K.game.shake(1); }
      if (d.special) P.glints(x, y, m.ball.z, 12, '#ffe060');
    }
    if (type === 'stumps:broken') {
      const sy = d.end === 'B' ? G.BOWL_Y : 0, [x, y] = W(0, sy), big = d.how === 'bowled' || d.how === 'sawn' || m.special;
      this.stumpsState[d.end === 'B' ? 1 : 0] = d.sawn ? 2 : 1;
      for (const s of [-1, 1]) this.bails.push({ x: s * 1.3, y: sy, z: 12.5, vx: s * 40 + (RNG.cosmetic() - .5) * 30, vy: (d.end === 'B' ? 1 : -1) * (40 + RNG.cosmetic() * 60), vz: 90 + RNG.cosmetic() * 80 + (big ? 80 : 0), rot: 0, vr: (RNG.cosmetic() - .5) * 30, t: 0 });
      P.dust(x, y, 2, 10); K.game.shake(big ? 2 : 1);
    }
    if (type === 'boundary' && d.n === 6 && this.night()) { for (let i = 0; i < 3; i++) K.game.after(.2 + i * .25, () => { const [x, y] = W(d.x + (RNG.cosmetic() - .5) * 200, d.y + 100); P.explosion(x, y, 90 + RNG.cosmetic() * 60, .6, { shake: 0, freeze: false, debris: false }); }); coverage.mark('fireworks'); }
    if (type === 'target:hit') { const t = m.ground.targets.find(q => q.id === d.id), p = m.targetPos(t), [x, y] = W(p[0], p[1]); P.explosion(x, y, p[2], .7, { shake: 2, freeze: false }); P.glints(x, y, p[2], 20, '#ffffff'); this.fxList.push({ kind: 'target', id: d.id, t: 0, life: 99 }); K.game.timeScale = .4 * T('timeScale'); K.game.after(.4 * .4, () => { K.game.timeScale = T('timeScale'); }); }
    if (type === 'wicket' && !d.freeHit) { K.game.timeScale = .35 * T('timeScale'); K.game.after(.8 * .35, () => { K.game.timeScale = T('timeScale'); }); }
    if (type === 'catch:screamer') { K.game.timeScale = .3 * T('timeScale'); K.game.after(.6 * .3, () => { K.game.timeScale = T('timeScale'); }); }
    if (type === 'fx:vanish') { const [x, y] = W(m.ball.x, m.ball.y); P.smoke(x, y, m.ball.z, 8, { color: '#8a4ab0' }); }
    if (type === 'ball:dead' && d.why === 'boundary') { const g = this.nearestGroup(m.ball.x, m.ball.y); if (g) g.scatter = 1.5; }
    if (type === 'crowd:catch') { const g = this.nearestGroup(d.x, d.y); if (g) { g.scatter = 0; g.catchT = 2.6; let bi = 0, bd = 1e9; g.list.forEach((c, i) => { const dd = hyp(c.x - d.x, c.y - d.y); if (dd < bd) { bd = dd; bi = i; } }); g.catcher = bi; } }
    if (type === 'six:land') { const g = this.nearestGroup(d.x, d.y); if (g) g.scatter = 2; const [x, y] = W(d.x, d.y); if (this.m.ground.id === 'bay' && d.x < -this.m.ground.rx) { P.smoke(x, y, 2, 10, { color: '#bfe8ff' }); } else P.dust(x, y, d.z, 6); }
    if (type === 'ball:setup') { this.stumpsState = [0, 0]; this.trail = []; this.fxList = this.fxList.filter(f => f.kind === 'target'); }
    if (type === 'match:start') this.fxList = [];
    if (type === 'fire:on') K.game.flash('#ff8a2a', .15, .4);
  },
  nearestGroup(x, y) { let best = null, bd = 1e9; for (const g of this.B.groups) { const d = hyp(g.x - x, g.y - y); if (d < bd) { bd = d; best = g; } } return bd < 400 ? best : null; },
  /** the fog: a ball more than 260 units from the batter can't be seen unless it is lit (aflame, holy light, steam) */
  ballVisible(m, b) { if (!(m.fog > .3) || !m.striker) return 1; const lit = b.fx === 'fire' || b.fx === 'holy' || b.fx === 'steam' || m.fire.bowl > 0 || m.fire.bat > 0; if (lit) return 1; const d = hyp(b.x - m.striker.x, b.y - m.striker.y); return d <= 220 ? 1 : d >= 260 ? 0 : (260 - d) / 40; },
  /** a seagull's place: circling over the outfield, or (during a swoop) diving onto the ball, then carrying it off */
  gullPose(c, i, t) {
    const S = c.data.swoop, a = t * .5 + i * 2.1, cx = Math.cos(a) * (240 + i * 40), cy = G.MID_Y + Math.sin(a) * (180 + i * 30);
    if (S && i === 0 && S.t < 2.2) { const k = S.t; if (k < .7) { const u = k / .7; return { x: lerp(cx, S.x0, u), y: lerp(cy, S.y0, u), z: lerp(70, 6, u), flap: false, carry: false }; } if (k < 1.6) { const u = (k - .7) / .9; return { x: lerp(S.x0, S.x1, u), y: lerp(S.y0, S.y1, u), z: 6 + Math.sin(u * Math.PI) * 26, flap: true, carry: true }; } const u = (k - 1.6) / .6; return { x: lerp(S.x1, cx, u), y: lerp(S.y1, cy, u), z: lerp(10, 70, u), flap: true, carry: false }; }
    return { x: cx, y: cy, z: 64 + Math.sin(t * 2 + i) * 6, flap: Math.floor(t * 6 + i) % 4 < 2, carry: false };
  },
  /* ---- drawing the match ---- */
  draw(r) {
    const m = this.m, B = this.B, g = K.game; if (!m) return;
    const W = (x, y) => [x + B.OX, y + B.OY], vid = r.view.id, night = this.night(), frame = this.replay ? this.replayFrame() : null, ready = !!m.inn;
    // light
    const L = g.lights; L.enabled = true;
    L.ambient = night ? .42 : m.timeOfDay === 'dusk' ? .7 : m.weather === 'overcast' || m.weather === 'rain' ? .78 : .95;
    if (m.rain || m.weather === 'rain') L.ambient = Math.min(L.ambient, .68);
    if (night) for (const [fx, fy] of [[-820, -380], [820, -380], [-820, 720], [820, 720]]) { const [x, y] = W(fx, fy); L.add(x, y, 220, 1100, .75, { color: '#fff4dc' }); }
    else if (m.timeOfDay === 'dusk') { const [x, y] = W(-600, -300); L.add(x, y, 300, 1600, .3, { color: '#ffb070' }); }
    // the ground
    r.sky(night ? ['#05050f', '#0a0a1e', '#141030'] : m.ground.pal.sky);
    B.map.drawFloor(r);
    // floor marks: the tide's water edge, the covers, the length bands, the marker, the aim arrow, shadows
    if (m.boundaryShrink > 0 && m.ground.seaSide) r.decal(gg => { for (let yy = -300; yy <= 620; yy += 6) { const ex = -m.boundaryAt(-1, yy - G.MID_Y) * 0 - Math.sqrt(Math.max(0, 1 - ((yy - G.MID_Y) / m.ground.ry) ** 2)) * m.ground.rx * (1 - m.boundaryShrink); const [ax, ay] = r.w(...W(ex - 12, yy)), [bx] = r.w(...W(-m.ground.rx * 1.1, yy)); px.rect(gg, Math.min(ax, bx), ay, Math.abs(ax - bx), 2, '#3a9ad8'); px.rect(gg, ax - 1, ay, 3, 2, '#e8f4ff'); } });
    if (ready) this.drawMarks(r, W, frame);
    B.map.queueWalls(r);
    // props, targets, sight screens, scoreboard and stumps
    // the broadcast camera stands behind the bowler: whatever is south of it (y > 520) is behind the lens, not drawn
    const behindLens = (y, h) => vid === 'broadcast' && y > 520 && h > 6;
    for (const [id, x, y, f] of m.ground.props) { if (behindLens(y, 20)) continue; const [mx, my] = W(x, y); K.drawProp(r, id, mx, my, f); }
    for (const t of m.ground.targets) {
      const p = m.targetPos(t), [mx, my] = W(p[0], p[1]), broken = m.targetsHit[t.id];
      if (behindLens(p[1], t.size[2])) continue;
      if (t.shape) { const params = t.shape.endsWith('ferrisWheel') ? { angle: Math.floor(g.time * 2) % 16 } : undefined; r.shape(t.shape, mx, my, t.id === 'balloon' || t.id === 'shark' ? p[2] - 20 : 0, { facing: t.face || 0, params }); }
      if (broken) r.queue(mx, my, p[2], gg => { const [sx, sy] = r.w(mx, my, p[2]); for (let i = 0; i < 6; i++) px.dot(gg, sx + Math.sin(i * 2.3) * 6, sy + Math.cos(i * 1.7) * 5, '#ffffff'); }, { bias: 1 });
      if (m.kerfuffle && !broken && vid === 'wide') r.queue(mx, my, p[2] + t.size[2] / 2 + 8, gg => { const [sx, sy] = r.w(mx, my, p[2] + t.size[2] / 2 + 8); if (Math.floor(g.time * 2) % 2) E.font.text(gg, '+' + t.bonus, sx, sy, '#ffe060', { align: 'center', outline: '#000' }); }, { emissive: true, bias: 2 });
    }
    for (const sy of [-m.boundaryAt(0, -1) + G.MID_Y - 50, G.MID_Y + m.boundaryAt(0, 1) + 50]) { if (behindLens(sy, 40)) continue; const [mx, my] = W(0, sy); r.shape('KERFUFFLE:sightscreen', mx, my, 0, { facing: sy < 0 ? Math.PI / 2 : -Math.PI / 2 }); }
    const stS = W(0, 0), stB = W(0, G.BOWL_Y);
    r.shape(this.stumpsState[0] ? 'KERFUFFLE:stumpsDown' : 'KERFUFFLE:stumps', stS[0], stS[1], 0, { facing: Math.PI / 2 });
    if (m.bowlerFamily() !== 'machine' || true) r.shape(this.stumpsState[1] ? 'KERFUFFLE:stumpsDown' : 'KERFUFFLE:stumps', stB[0], stB[1], 0, { facing: Math.PI / 2 });
    for (const p of this.bails) { const [mx, my] = W(p.x, p.y); r.queue(mx, my, p.z, gg => { const [sx, sy] = r.w(mx, my, p.z), c = Math.cos(p.rot), s = Math.sin(p.rot); px.line(gg, sx - c * 2, sy - s * 2, sx + c * 2, sy + s * 2, '#d8c8a0', 1); }); }
    if (m.rain || m.phase === 'rainDelay') { const [mx, my] = W(0, G.MID_Y); r.shape('KERFUFFLE:covers', mx, my, 0, { params: { spread: Math.min(1, m.pt / 2) } }); }
    if (ready && m.bowlerFamily() === 'machine' && m.bowler) { const [mx, my] = W(m.bowler.x, Math.max(m.bowler.y, G.BOWL_Y + 12)); r.shape('KERFUFFLE:thrumptonator', mx, my, 0, { facing: -Math.PI / 2, params: { angle: Math.floor(g.time * (m.phase === 'runup' ? 24 : 4)) % 16 } }); if (Math.floor(g.time * 6) % 3 === 0) g.particles.smoke(mx, my - 10, 38, 1, { color: '#e8e8f0' }); }
    // the crowd
    this.drawCrowd(r, W);
    // the Nets' net walls: posts at the corners, a dithered mesh between them
    if (m.ground.netPanels) for (const [x0, y0, x1, y1] of m.ground.netPanels) {
      for (const [px0, py0] of [[x0, y0], [x1, y1]]) { const [mx, my] = W(px0, py0); r.shape('KERFUFFLE:netPost', mx, my, 0); }
      const [ax, ay] = W(x0, y0), [bx2, by2] = W(x1, y1);
      r.queue((ax + bx2) / 2, (ay + by2) / 2, 0, gg => {
        const p0 = r.w(ax, ay, 0), p1 = r.w(bx2, by2, 0), p2 = r.w(bx2, by2, 50), p3 = r.w(ax, ay, 50);
        px.polyDither(gg, [p0, p1, p2, p3], '#1e3a24', .35, r.ix, r.iy);
        for (let k = 0; k <= 10; k++) { const u = k / 10, q0 = [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u)], q1 = [lerp(p3[0], p2[0], u), lerp(p3[1], p2[1], u)]; px.line(gg, q0[0], q0[1], q1[0], q1[1], '#2a4a30'); }
        for (let k = 0; k <= 6; k++) { const u = k / 6; px.line(gg, lerp(p0[0], p3[0], u), lerp(p0[1], p3[1], u), lerp(p1[0], p2[0], u), lerp(p1[1], p2[1], u), '#2a4a30'); }
        px.line(gg, p3[0], p3[1], p2[0], p2[1], '#5a6a5a');
      }, { bias: .1 });
    }
    // the players
    const list = m.fielders.concat(m.batters);
    for (const a of list) {
      if (a.p && a.p.machine) continue;
      const src = frame ? (frame.A.find(f => f.id === a.id) || a) : a, rig = this.rigFor(a, m), [mx, my] = W(src.x, src.y);
      const ghost = a.ghost, phased = m.flags.ghostPhase && m.flags.ghostPhase.id === a.id;
      r.shadow(mx, my, 5, .35);
      const fogged = m.fog > .3 && m.striker && hyp(src.x - m.striker.x, src.y - m.striker.y) > 400;   // fog: fielders far from the batter fade
      r.actor(mx, my, src.z || 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), ghost ? { alpha: phased ? .25 : fogged ? .4 : .6, ghost: { color: '#a8e0ff', life: .3, alpha: .3, owner: src } } : fogged ? { alpha: .5 } : { xray: true });
      if (a.role === 'batter' && a === m.striker && (m.fire.bat > 0 || m.cfg.cheat.alwaysFire) && Math.floor(g.time * 30) % 2 === 0) { const h = rig.tip(); g.particles.fire(h[0], h[1], h[2], 1, { size: .6 }); }
      if (rig.trail && rig.trail.length > 1 && a.role === 'batter') rig.drawSmear(r, ['#fff8e0', '#ffe8a0', '#e8c870', '#c8a050']);
    }
    for (const u of m.umpires) { const rig = Cast.umpire(u.u), [mx, my] = W(u.x, u.y); r.shadow(mx, my, 5, .3); r.actor(mx, my, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view)); }
    // chaos actors
    for (const c of m.chaos) {
      if (c.id === 'cow' && c.pos) { const [mx, my] = W(c.pos[0], c.pos[1]); r.shape('KERFUFFLE:cow', mx, my, 0, { facing: c.facing || 0, params: { step: Math.floor(g.time * 8) % 16 } }); }
      if (c.id === 'peacocks' && c.pos) { const [mx, my] = W(c.pos[0], c.pos[1]); r.shape('KERFUFFLE:peacock', mx, my, 0, { facing: g.time * .3 }); }
      if (c.id === 'mascot' && c.pos) { const mr = Cast.extra('mascot'), sr = Cast.extra('steward'), [mx, my] = W(c.pos[0], c.pos[1]); mr.update(1 / 60, { x: mx, y: my, z: 0, vx: 60, vy: 0, facing: 0, run: 1 }); r.actor(mx, my, 0, (gg, ox, oy) => mr.draw(gg, ox, oy, r.view)); sr.update(1 / 60, { x: mx - 40, y: my, z: 0, vx: 60, vy: 0, facing: 0, run: 1 }); r.actor(mx - 40, my, 0, (gg, ox, oy) => sr.draw(gg, ox, oy, r.view)); }
      if (c.id === 'bees' && c.data.who) { const a = c.data.who, [mx, my] = W(a.x, a.y); r.queue(mx, my, 24, gg => { const [sx, sy] = r.w(mx, my, 26); for (let i = 0; i < 8; i++) px.dot(gg, sx + Math.sin(g.time * 9 + i * 2) * 7, sy + Math.cos(g.time * 11 + i) * 4, i % 2 ? '#ffe040' : '#2a2a2a'); }, { bias: 2 }); }
      if (c.id === 'gulls') for (let i = 0; i < 3; i++) { const p = this.gullPose(c, i, c.t), [gx, gy] = W(p.x, p.y); r.shadow(gx, gy, 3, .2); r.sprite(gx, gy, p.z, p.flap ? GULL_UP : GULL_DOWN, { anchor: 'center', flip: Math.cos(c.t * .5 + i * 2.1) > 0 }); if (p.carry) r.queue(gx, gy, p.z - 3, gg => { const [sx, sy] = r.w(gx, gy, p.z - 3); px.disc(gg, sx, sy, 1.6, '#b8202a'); }, { bias: .3 }); }
      if (c.id === 'dustdevil') { const [mx, my] = W(Math.sin(c.t * .4) * 300, G.MID_Y + Math.cos(c.t * .3) * 200); if (Math.floor(g.time * 20) % 2 === 0) g.particles.dust(mx, my, 4 + RNG.cosmetic() * 30, 1); }
      if (c.id === 'rabbits') { for (let i = 0; i < 3; i++) { const [mx, my] = W(-440 + c.t * 90 + i * 20, 650 - c.t * 40 + i * 9); r.queue(mx, my, 0, gg => { const [sx, sy] = r.w(mx, my, Math.abs(Math.sin(c.t * 9 + i)) * 4); px.rect(gg, sx - 2, sy - 3, 4, 3, '#f4f0e8'); px.rect(gg, sx - 1, sy - 6, 1, 3, '#f4f0e8'); px.rect(gg, sx + 1, sy - 6, 1, 3, '#f4f0e8'); }); } }
    }
    // item tokens
    for (const t of m.tokens) { const [mx, my] = W(t.x, t.y), bob = Math.sin(t.t * 3) * 3; r.queue(mx, my, t.z + bob, gg => this.drawToken(gg, r, mx, my, t.z + bob, t.id), { emissive: true }); r.shadow(mx, my, 4, .25); }
    // the ball, its shadow and its trail (and the Triple Threat's holograms)
    if (ready) this.drawBall(r, W, frame);
    // the far-end panorama (broadcast only): drawn in front of everything north of y -190
    if (vid === 'broadcast') {
      const P = Ground.pano(B, m.over % 2 ? 'B' : 'S', night);
      if (P) { const [mx, my] = W(0, -190); r.queue(mx, my, 0, gg => { const [sx, sy] = r.w(mx, my, 0), par = (K.game.cam.x || 0) * -.3 % 1; const top = Math.round(sy - P.h + 2); if (top > 0) px.rect(gg, 0, 0, r.W, top, night ? '#05050f' : m.ground.pal.sky[0]); gg.drawImage(P.cv, Math.round(sx - P.w / 2 + par), top); this.drawScoreboard(gg, Math.round(sx - P.w / 2 + par), Math.round(sy - P.h + 2), P); }, { bias: -1, emissive: night }); }
    }
    // weather: fog (our own overlay, thicker with distance from the camera's focus)
    if (m.fog > 0) r.overlay(gg => { const k = m.fog, c1 = night ? '#3a4a66' : '#b8c8d8', c2 = night ? '#2a3a52' : '#a8b8c8'; px.blend(gg, (night ? .1 : .18) + k * (night ? .3 : .35), 'normal', () => px.rect(gg, 0, 0, r.W, r.H * .5, c1)); px.blend(gg, k * (night ? .14 : .25), 'normal', () => px.rect(gg, 0, r.H * .5, r.W, r.H * .5, c2)); if (vid === 'wide') px.blend(gg, k * .2, 'normal', () => px.rect(gg, 0, 0, r.W, r.H, c1)); });
  },
  drawMarks(r, W, frame) {
    const m = this.m, g = K.game, b = frame ? frame.ball : m.ball;
    const humanBowl = m.bowlerInput() && !m.cfg.cheat.autoBowl, humanBat = m.strikerInput() && !m.cfg.cheat.autoBat;
    // the length bands, faintly, in the first overs for a human bowler
    if (humanBowl && (m.phase === 'setup' || m.phase === 'runup') && m.inn.balls < 12 && r.view.id === 'broadcast') r.decal(gg => {
      for (const [y0, y1, c, label] of [[20, 44, '#ff6a6a', 'YORKER'], [44, 90, '#ffd36a', 'FULL'], [90, 150, '#6aff8a', 'GOOD'], [150, 200, '#6ac8ff', 'SHORT'], [200, 230, '#c86aff', 'BOUNCER']]) {
        const [ax, ay] = r.w(...W(-24, y0)), [bx, by2] = r.w(...W(24, y1));
        px.blend(gg, .14, 'normal', () => px.rect(gg, ax, Math.min(ay, by2), bx - ax, Math.abs(by2 - ay), c));
        E.font.text(gg, label, bx + 3, Math.min(ay, by2), c, { font: 'tiny', shadow: '#000' });
      }
    });
    // the bowler's pitch marker
    if (humanBowl && (m.phase === 'setup' || m.phase === 'runup') && !(m.flags.fogMarker && false)) { const [mx, my] = W(m.marker[0], m.marker[1]); r.decal(() => { r.groundRing(mx, my, 6, '#ffe060'); r.groundRing(mx, my, 3, '#ffffff'); }); }
    // the batter's pitch marker (where the ball will land), unless a Fog Machine hides it
    if (humanBat && m.phase === 'flight' && K.settings('pitchMarker') && !m.flags.fogMarker && b.phase === 'delivery' && !b.pitched) {
      const s = Ball.predict(b, 2, m.env, 2, c => c.pitched), l = s[s.length - 1];
      if (l && l.pitched) { const [mx, my] = W(l.x, l.y); r.decal(() => r.groundRing(mx, my, 4, '#ff5a3a')); }
    }
    // the aim arrow at the batter's feet
    if (humanBat && (m.phase === 'flight' || m.phase === 'runup' || m.phase === 'setup') && K.batAim) {
      const aim = K.batAim(m.strikerInput(), m);
      if (aim) { const s = m.striker, [mx, my] = W(s.x - m.hand * 4, s.y + 6); r.decal(gg => { const [sx, sy] = r.w(mx, my), [ex, ey] = r.w(mx + aim[0] * 26, my + aim[1] * 26); px.line(gg, sx, sy, ex, ey, '#fff6c0', 2); px.disc(gg, ex, ey, 2, '#ffe060'); }); }
    }
    // Statistical Certainty: the exact timing ring closing on the bat
    if (m.batSpecialArmed === 'certainty' && m.phase === 'flight') { const t = m.idealPress('shot'); if (t !== null) { const s = m.striker, [mx, my] = W(s.x, s.y); r.decal(() => { r.groundRing(mx, my, 4 + t * 40, '#6ae8ff'); r.groundRing(mx, my, 4, '#ffffff'); }); } }
    // Owl-Eye (a review, or dev mode's live trajectory)
    if ((m.decision && m.decision.reviewing && m.decision.owl) || K.dev && K.dev.toggles.trajectory) this.drawOwl(r, W);
  },
  drawOwl(r, W) {
    const m = this.m, d = m.decision, owl = d && d.owl;
    const path = owl ? owl.path : Ball.predict(m.ball, 1.5, m.env, 3).map(p => [p.x, p.y, p.z]);
    const prog = d && d.reviewing ? clamp(d.rt / 3, 0, 1) : 1, n = Math.floor(path.length * prog);
    r.queue(W(0, 0)[0], W(0, 0)[1], 0, gg => {
      for (let i = 1; i < n; i++) { const [ax, ay] = r.w(...W(path[i - 1][0], path[i - 1][1]), path[i - 1][2]), [bx, by] = r.w(...W(path[i][0], path[i][1]), path[i][2]); px.blend(gg, .6, 'normal', () => px.line(gg, ax, ay, bx, by, i < path.length * .5 ? '#ff6a3a' : '#6ae8ff', 3)); }
      if (owl && owl.pitch) { const [sx, sy] = r.w(...W(owl.pitch[0], owl.pitch[1]), 0); px.disc(gg, sx, sy, 3, '#ffe060'); }
      if (owl) { const [sx, sy] = r.w(...W(owl.impact[0], owl.impact[1]), owl.impact[2]); px.disc(gg, sx, sy, 3, '#ff3a3a'); }
    }, { bias: 3, emissive: true });
  },
  drawBall(r, W, frame) {
    const m = this.m, g = K.game, b = frame ? frame.ball : m.ball;
    if (b.phase === 'held' && m.phase !== 'runup') { if (m.phase === 'setup' || m.phase === 'dead' || m.phase === 'between') return; }
    let bx = b.x, by = b.y, bz = b.z;
    if (m.phase === 'runup' && b.phase === 'held') { const h = m.bowler; if (!h || (h.p && h.p.machine)) return; const rig = Cast.rig(h.p, 'field'), w = rig.hand(); const [mx, my] = W(0, 0); bx = w[0] - mx; by = w[1] - my; bz = w[2]; }
    if (m.holder && m.phase === 'inPlay') { const rig = this.rigFor(m.holder, m), w = rig.hand(); const [mx, my] = W(0, 0); bx = w[0] - mx; by = w[1] - my; bz = w[2]; }
    const [mx, my] = W(bx, by), night = this.night(), seen = frame ? 1 : this.ballVisible(m, Object.assign({}, b, { x: bx, y: by })), swoop = m.chaos.find(c => c.id === 'gulls' && c.data.swoop && c.data.swoop.t < 1.6), hidden = b.hidden || seen <= 0 || !!swoop;
    r.shadow(mx, my, 1.6, seen > 0 ? .5 : .15);
    if (hidden) return;
    const fx = b.fx || (m.fire.bowl > 0 && b.phase === 'delivery' ? 'fire' : null);
    const col = m.ground.id === 'dome' ? '#ff8ad8' : night ? '#f4f4f4' : '#b8202a';
    const T2 = this.trail;
    r.queue(mx, my, bz, gg => {
      for (let i = 1; i < T2.length; i++) { const p0 = T2[i - 1], p1 = T2[i], [ax, ay] = r.w(...W(p0[0], p0[1]), p0[2]), [ex, ey] = r.w(...W(p1[0], p1[1]), p1[2]); px.blend(gg, i / T2.length * .55, 'add', () => px.line(gg, ax, ay, ex, ey, fx === 'fire' ? '#ff8a2a' : fx === 'holy' ? '#fff6a0' : fx === 'ghost' ? '#a8e0ff' : fx === 'steam' ? '#e8e8f0' : '#ffffff', i > T2.length - 3 ? 2 : 1)); }
      const [sx, sy] = r.w(mx, my, bz);
      if (seen < 1) { px.blend(gg, seen, 'normal', () => { px.disc(gg, sx, sy, 2, '#2a0a0a'); px.disc(gg, sx, sy, 1.6, col); }); return; }
      px.disc(gg, sx, sy, 2, '#2a0a0a'); px.disc(gg, sx, sy, 1.6, col); px.dot(gg, sx - 1, sy - 1, '#ffffff');
      if (fx === 'fire' && Math.floor(g.time * 30) % 2 === 0) g.particles.fire(mx, my, bz, 1, { size: .5 });
      if (fx === 'grudge') px.blend(gg, .6, 'add', () => px.ddisc ? px.ddisc(gg, sx, sy, 4, '#ff2a2a', .5, r.ix, r.iy) : px.disc(gg, sx, sy, 4, '#ff2a2a'));
    }, { emissive: night || !!fx, bias: .5 });
    if (night) g.lights.add(mx, my, bz, 30, .5, { color: '#ffffff' });
    if (m.triple && !m.contact) for (const h of m.triple) { const [hx, hy] = W(h.x, h.y); if (Math.floor(g.time * 20) % 3) r.queue(hx, hy, h.z, gg => { const [sx, sy] = r.w(hx, hy, h.z); px.blend(gg, .6, 'add', () => px.disc(gg, sx, sy, 2, '#6ae8ff')); }, { emissive: true }); }
  },
  drawToken(gg, r, mx, my, z, id) {
    const [sx, sy] = r.w(mx, my, z), it = ITEMS[id], c = it ? it.color : '#ffffff', t = K.game.time;
    px.disc(gg, sx, sy, 6, '#1a1a2a'); px.disc(gg, sx, sy, 5, c); px.disc(gg, sx - 1, sy - 1, 2, '#ffffff');
    if (Math.floor(t * 4) % 2) px.ring ? px.ring(gg, sx, sy, 8, '#ffffff') : null;
  },
  drawScoreboard(gg, x0, y0, P) {
    const m = this.m, inn = m.inn; if (!inn) return;
    const [bx, by] = P.board, x = x0 + bx, y = y0 + by;
    E.font.text(gg, m.teams[m.bat].code + ' ' + inn.runs + '-' + inn.wkts, x + 55, y + 6, '#ffe060', { align: 'center', font: 'tiny' });
    E.font.text(gg, 'OVERS ' + Rules.oversText(inn.balls), x + 55, y + 16, '#ffffff', { align: 'center', font: 'tiny' });
    if (inn.target) E.font.text(gg, 'TARGET ' + inn.target, x + 55, y + 26, '#ff8a6a', { align: 'center', font: 'tiny' });
  },
  drawCrowd(r, W) {
    const m = this.m, g = K.game, B = this.B, rain = m.rain || m.weather === 'rain', mood = K.crowdMood || 0;
    for (const gp of B.groups) {
      if (gp.scatter > 0) gp.scatter = Math.max(0, gp.scatter - 1 / 60);
      if (gp.catchT > 0) gp.catchT = Math.max(0, gp.catchT - 1 / 60);
      const [mx, my] = W(gp.x, gp.y);
      r.queue(mx, my, 0, gg => {
        for (const c of gp.list) {
          const [cmx, cmy] = W(c.x, c.y), jump = mood > .3 ? Math.max(0, Math.sin(g.time * 12 + c.ph)) * 3 * mood : Math.sin(g.time * 2 + c.ph) * .4;
          const wave = K.crowdWave ? Math.max(0, Math.sin(g.time * 4 - Math.atan2(c.y - G.MID_Y, c.x) * 3)) * 4 : 0, sc = gp.scatter > 0 ? gp.scatter * 6 * Math.sin(c.ph) : 0;
          const [sx, sy] = r.w(cmx + sc, cmy, c.z + jump + wave), h = c.sit ? 4 : 6;
          px.rect(gg, sx - 1, sy - h, 3, h - 1, c.shirt); px.rect(gg, sx - 1, sy - h - 2, 2, 2, c.skin);
          if (c.hat) px.rect(gg, sx - 2, sy - h - 3, 4, 1, c.hat);
          if (rain && c.ph % 3 < 1.4) { px.rect(gg, sx - 3, sy - h - 5, 7, 2, ['#3a6ad8', '#d83a3a', '#2a2a2a'][Math.floor(c.ph) % 3]); px.dot(gg, sx, sy - h - 3, '#2a2a2a'); }
          if (mood > .6 && c.ph % 2 < .5) px.dot(gg, sx + 2, sy - h - 2 - jump, c.skin);
          if (gp.catchT > 0 && gp.list[gp.catcher] === c) { px.rect(gg, sx - 2, sy - h - 6, 1, 4, c.skin); px.rect(gg, sx + 2, sy - h - 6, 1, 4, c.skin); px.disc(gg, sx, sy - h - 8, 1.6, '#b8202a'); px.dot(gg, sx - 1, sy - h - 9, '#ffffff'); }
        }
      }, { bias: -.2 });
    }
  }
};
K.Views = Views; K.MatchView = MatchView; K.Recorder = Recorder;
