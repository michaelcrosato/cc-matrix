/* ---------- the match scene: controls, animation, camera, effects and drawing around the simulation ---------- */
let MS = null;   // the running match session { M, mode, cfg, ... }
const ZB = 1, ZW = .66, CAMY = 462;   // broadcast zoom and the wide cut
const DEVFLAGS = { god: false, slow: false, debugDraw: false };

const inpOf = c => (c === 'p1' ? game.players[0] : c === 'p2' ? (game.players[1] || null) : null);
function aimFromInput(inp, from) {
  if (inp.aimSource === 'mouse') {
    const mg = game.mouseGround();
    if (mg) { const dx = mg[0] - from.x, dy = mg[1] - from.y, l = hyp(dx, dy); if (l > 6) return [dx / l, dy / l]; }
  }
  const mv = inp.move();
  if (hyp(mv[0], mv[1]) > .3) { const d = game.view.screenDirToGround(mv[0], mv[1]), l = hyp(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; }
  return [0, 1];
}
function batIntent(inp, M) {
  const it = newIntent(); if (!inp) return it;
  it.aim = aimFromInput(inp, M.striker());
  if (inp.pressed('ground')) it.shot = 'ground'; else if (inp.pressed('loft')) it.shot = 'loft'; else if (inp.pressed('defend')) it.shot = 'defend';
  it.run = inp.pressed('run'); it.runHeld = inp.down('run'); it.special = inp.pressed('special');
  return it;
}
function bowlIntent(inp, M) {
  const it = newIntent(); if (!inp) return it;
  it.human = true;
  const mv = inp.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
  it.mx = d[0]; it.my = d[1];
  if (inp.aimSource === 'mouse') { const mg = game.mouseGround(); if (mg) it.aimPoint = mg; }
  const g = inp.pressed('ground'), l = inp.pressed('loft'), s = inp.pressed('defend'), f = inp.pressed('special');
  if (M.ph === 'setup') { if (g) it.bowl = 'pace'; else if (l) it.bowl = 'swing'; else if (s) it.bowl = 'spin'; else if (f && M.sideBowl().hype >= 100) it.bowl = 'fire'; }
  if (g || l || s || f) it.release = true;
  it.cycle = inp.pressed('cycle'); it.dive = inp.pressed('run');
  return it;
}

function startMatch(data) {
  RNG.play = mkrng((data.seed || (Date.now() & 0xffffff)) | 1);
  game.go('match', data);
}

const matchScene = {
  get pausable() { return !!MS && !MS.attract && !MS.ended && !DEV.open; },
  enter(data) {
    tuningReset(); if (data.tune) Object.assign(TV, data.tune);
    const hub = !!data.hub, attract = !!data.attract;
    const cfg = { mode: data.mode, overs: data.overs || 2, wickets: data.wickets || 3, diff: data.diff == null ? 1 : data.diff, ground: data.ground || 'green',
      teamA: 'kerf', teamB: data.opp || 'witt', ctrlA: attract ? null : 'p1', ctrlB: data.mode === 'versus' ? 'p2' : null,
      chaos: data.chaos || 'all', cheat: attract, attract, hub, single: !!data.single, batFirst: data.batFirst || 0, golden: true };
    if (hub) {
      cfg.overs = 1; cfg.wickets = 2; cfg.chaos = 'none'; cfg.diff = 1;
      cfg.rngBall = n => AIHub.rng('over' + n); cfg.rngF = n => AIHub.rng('field' + n);
    }
    const M = createMatch(cfg);
    MS = { M, cfg, mode: data.mode, data, attract, hub, endT: 0, ended: false, cam: { x: CX, y: CAMY, z: ZB, wide: false }, offs: [], idle: 0, mouseT: null, ump: 0, flashT: 0, slowT: 0, ch: data.ch || 0, hubScore: -1, over: false };
    M.cheerT = 0;
    buildMap(cfg.ground); buildRigs(TEAMS[M.sideBat().team] && M.sideBat().team, M.sideBowl().team);
    game.setView('broadcast'); game.setZoom(ZB);
    game.lights.enabled = M.ground.night; game.lights.ambient = M.ground.night ? .52 : .85;
    game.weather = null; game.cam.smooth = 0;
    wireEvents(MS);
    MS.cam.x = CX; MS.cam.y = CAMY; game.focus(CX, CAMY, 0);
    playMusic(attract ? 'title' : M.ground.music, 0.4);
    M.start();
    if (!attract) say('welcome', 0, true);
    if (hub && AIHub.active) { /* the hub's clock decides when play starts */ M.holdForHub = true; M.t = -1e9; }
  },
  exit() { if (MS) { for (const o of MS.offs) o(); } game.timeScale = 1; game.lights.enabled = false; game.weather = null; DEVFLAGS.slow = false; },
  update(dt) {
    const M = MS.M; if (!M) return;
    if (devUpdate(dt)) return;
    if (MS.attract && attractExit()) return;
    // hub: wait for the round clock
    if (MS.hub && AIHub.active && AIHub.time() < 0) { game.cam.smooth = 0; animate(dt); camera(dt); return; }
    const sb = M.sideBat(), sw = M.sideBowl();
    const ib = inpOf(sb.ctrl), iw = inpOf(sw.ctrl);
    const human = { bat: ib ? batIntent(ib, M) : null, bowl: iw ? bowlIntent(iw, M) : null };
    M.god = DEVFLAGS.god;
    M.step(dt, human);
    if (M.cheerT > 0) M.cheerT -= dt;
    if (M.ph === 'done' && !MS.ended) { MS.ended = true; MS.endT = 3.2; }
    if (MS.ended) { MS.endT -= dt; if (MS.endT <= 0) finishMatch(); }
    animate(dt); camera(dt); commentUpdate(dt);
    if (MS.slowT > 0) { MS.slowT -= dt / Math.max(.2, game.timeScale); if (MS.slowT <= 0) game.timeScale = DEVFLAGS.slow ? .25 : 1; }
    if (M.wet !== MS.wasWet) { MS.wasWet = M.wet; game.weather = M.wet ? { kind: 'rain', amount: .7, wind: .15, lightning: 0 } : null; }
    if (MS.hub && AIHub.active && M.ballNo !== MS.lastProg) { MS.lastProg = M.ballNo; AIHub.progress({ score: sb.score, label: sb.score + '/' + sb.wkts }); }
    if (M.sideBat().fire > 0 && (M.ph === 'flight' || M.ph === 'setup') && RNG.cos() < .6) { const tp = rigs.bat[M.sIdx].tip(); game.particles.fire(tp[0], tp[1], tp[2], 1, { size: 1.2 }); }
    if (M.sideBat().fire > 0 && M.ph === 'inplay' && M.ball.phase === 'live' && RNG.cos() < .5) game.particles.fire(M.ball.x, M.ball.y, M.ball.z, 1, { size: 1.4 });
    if (DEVFLAGS.slow && MS.slowT <= 0) game.timeScale = .25;
  },
  draw(r) { drawMatch(r); },
};

function attractExit() {
  const I = game.input;
  if (MS.idle < .6) { MS.idle += 1 / 120; MS.mouseT = I.mouse.t; return false; }
  if (I.anyPressed() || I.clicked() || I.mouse.t !== MS.mouseT || hyp(...I.move()) > .5) { game.go('title'); return true; }
  return false;
}

function finishMatch() {
  const M = MS.M;
  if (MS.attract) { startMatch({ mode: 'attract', attract: true, overs: 2, wickets: 3, opp: rpick(['witt', 'gumb', 'mega'], RNG.cos), ground: rpick(['green', 'cow', 'dome'], RNG.cos), seed: (RNG.cos() * 1e6) | 0 }); return; }
  if (MS.hub) { if (AIHub.active && !MS.hubDone) { MS.hubDone = true; AIHub.result({ score: M.sides[0].score, stats: { 'Sixes': M.sides[0].sixes, 'Fours': M.sides[0].fours, 'Wickets lost': M.sides[0].wkts } }); } return; }
  game.go('results', { mode: MS.mode, M: M.snapshot(), result: M.result, sides: M.sides.map(s => ({ team: s.team, score: s.score, wkts: s.wkts, balls: s.balls, fours: s.fours, sixes: s.sixes })), ch: MS.ch, data: MS.data, single: M.single });
}

/* ----- events -> sound, particles, commentary ----- */
function wireEvents(S) {
  const M = S.M, add = (t, f) => S.offs.push(on(t, f));
  const spawnFx = (x, y, z) => ({ x, y, z });
  add('swing', () => sfx('swish'));
  add('release', d => { sfx('release'); if (d.fire) sfx('fireup'); if (d.over) { sfx('noball'); } });
  add('pitched', () => sfx('bounce'));
  add('bounce', () => { if (M.ball.z < 1 && hyp(M.ball.vx, M.ball.vy) > 60) sfx('bounce', { vol: .4 }); });
  add('pad', () => { sfx('thud'); });
  add('keeper', () => { sfx('pop'); });
  add('pickup', () => sfx('pop', { vol: .5 }));
  add('throw', () => sfx('swish', { vol: .6 }));
  add('contact', d => {
    const b = M.ball;
    sfx(d.perfect ? 'crackP' : 'crack');
    game.particles.sparks(b.x, b.y, 14, d.perfect ? 12 : 5, d.err > 0 ? 0 : Math.PI);
    if (d.perfect) { game.freeze(.09); game.shake(3); game.flash('#ffffff', .08, .35); game.particles.ring(b.x, b.y, 4, 26, '#ffe880', .25); game.particles.text(b.x, b.y, 28, 'PERFECT!', '#ffe880', { scale: 1, bounce: true }); }
    else game.freeze(.03);
    if (d.fire) game.particles.fire(b.x, b.y, 10, 8, { size: 2 });
    game.input.rumble(d.perfect ? .8 : .35, .15);
  });
  add('boundary', d => {
    M.cheerT = 2.6; sfx('cheer'); S.ump = 2.4; S.umpSig = d.n === 6 ? 'cheer' : 'wave';
    say(d.n === 6 ? 'six' : 'four', 3);
    const b = M.ball;
    game.particles.bits(b.x, b.y, 10, d.n === 6 ? 30 : 14, ['#ffd040', '#ff4060', '#40c0ff', '#60e060']);
    if (d.n === 6) { game.flash('#fff0b0', .14, .5); game.shake(4); }
    game.input.rumble(.6, .25);
  });
  add('target', d => {
    sfx(d.t.id === 'window' ? 'glass' : 'ding'); sfx('cheer');
    if (d.t.id === 'window') SET_BROKEN.window = true;
    game.particles.bits(d.x, d.y, 20, 30, d.t.id === 'window' ? ['#bfe8ff', '#ffffff', '#7ac0e0'] : [d.t.col, '#ffffff']);
    game.particles.explosion(d.x, d.y, 18, 2.2, { shake: 3 });
    say(d.t.id === 'window' ? 'window' : d.t.id === 'urn' ? 'tea' : 'six', 5, true);
  });
  add('wicket', d => {
    S.ump = 2.6; S.umpSig = 'cheer'; sfx(d.how === 'caught' ? 'pop' : 'stumps'); if (d.how !== 'caught') game.shake(5);
    const ourSide = d.side === 0 && M.sideBat().ctrl === 'p1';
    sfx(ourSide ? 'groan' : 'cheer'); say(d.how === 'runout' ? 'runout' : d.how, 5, true); sfx('appeal');
    for (const f of M.fielders) f.celeb = 1.6;
    if (d.how === 'bowled') { game.timeScale = .35; S.slowT = .55; }
    game.flash('#ff4030', .12, .3);
    if (M.sideBowl().ctrl === 'p1') game.input.rumble(.6, .3);
  });
  add('stumps', d => { M.stumpEnd = d.end; });
  add('dropped', () => { sfx('dropped'); say('dropped', 4, true); });
  add('extra', d => { say(d.kind === 'wide' ? 'wide' : 'noball', 2, true); sfx(d.kind === 'wide' ? 'appeal' : 'noball'); S.ump = 1.5; S.umpSig = 'wave'; });
  add('runs', d => { say(d.n === 0 ? 'dot' : d.n === 1 ? 'one' : d.n === 2 ? 'two' : 'three', 1); if (d.n >= 2) sfx('cheer', { vol: .5 }); });
  add('run', () => sfx('run'));
  add('fire:on', d => { sfx('fireup'); say('fire', 4, true); game.flash('#ff8020', .2, .5); game.shake(4); if (d.side === M.bat) playMusic('fire', .2); });
  add('fire:off', () => playMusic(M.ground.music, .5));
  add('hype:full', d => { sfx('ding'); if (M.sides[d.side].ctrl) game.particles.text(CX, SY + 40, 40, 'HYPE FULL!', '#ffb020', { scale: 1.5, bounce: true }); });
  add('chaos', d => {
    if (d.id === 'cow') { say('cow', 3, true); sfx('moo'); } else if (d.id === 'rain') { say('rain', 3, true); } else if (d.id === 'golden') { say('golden', 3, true); sfx('golden'); }
  });
  add('cowstop', () => { sfx('moo'); say('cowstop', 5, true); });
  add('overthrow', () => { });
  add('over:end', () => sfx('ding'));
  add('innings:end', d => { say('hat', 0); });
  add('match:end', d => { M.cheerT = 4; sfx('cheer'); const w = d.winner; say(w === 0 ? 'win' : 'lose', 5, true); });
  add('ball:end', d => { if (d.kind === 'wicket' && !d.out) sfx('ding'); });
}

/* ----- animation: rigs follow the simulation ----- */
function animate(dt) {
  const M = MS.M, t = game.time;
  const bk = M.sideBat().team + ':' + M.sideBowl().team; if (rigs.key !== bk) buildRigs(M.sideBat().team, M.sideBowl().team);
  const ball = M.ball, face = f => Math.atan2(ball.y - f.y, ball.x - f.x);
  M.batters.forEach((b, i) => {
    const rig = rigs.bat[i], striker = i === M.sIdx && !b.moving;
    const st = { x: b.x, y: b.y, z: 0, vx: 0, vy: b.vy, facing: b.moving ? b.face : (striker ? Math.PI / 2 : -Math.PI / 2), stance: 'ready' };
    if (b.swingT >= 0 && i === M.sIdx) { const nm = b.swingType === 'loft' ? 'rising' : b.swingType === 'defend' ? 'twohand' : 'backslash'; st.attack = E.move(nm, clamp(b.swingT / SWING_DUR, 0, 1)); }
    else if (M.ph === 'between' && M.last) { if (M.last.kind === 'boundary' || (M.last.runs >= 3)) st.pose = 'cheer'; else if (M.last.how && i === M.sIdx) st.pose = 'kneel'; }
    if (!b.moving && M.ph === 'flight' && striker) st.facing = Math.PI / 2 + .35;
    rig.update(dt, st);
  });
  M.fielders.forEach((f, i) => {
    const rig = rigs.field[i];
    const st = { x: f.x, y: f.y, z: 0, vx: f.vx, vy: f.vy, facing: hyp(f.vx, f.vy) > 12 ? f.face : (i === 0 && M.ph !== 'inplay' ? -Math.PI / 2 : face(f)) };
    if (i === 0 && M.ph === 'flight' && M.t < .4) st.attack = E.move('throw', M.t / .4);
    else if (f.throwT > 0) st.attack = E.move('throw', 1 - f.throwT / .35);
    else if (f.celeb > 0) st.pose = 'cheer';
    else if (f.hasBall && f.holdT < .25) st.pose = 'crouch';
    else if (f.dive > 0) st.pose = 'kneel';
    else if (f.drop > 0) st.pose = 'hips';
    if (f.id === M.active && M.ph === 'inplay') st.sprint = 1;
    rig.update(dt, st);
  });
  if (MS.ump > 0) MS.ump -= dt;
  rigs.umpire.update(dt, { x: CX + 30, y: BY + 4, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2 - .3, pose: MS.ump > 0 ? MS.umpSig || 'cheer' : undefined });
}

/* ----- camera director: the broadcast view down the pitch, then a wide cut that follows the ball ----- */
function camera(dt) {
  const M = MS.M, c = MS.cam;
  if (M.ph === 'inplay' && M.hit) c.wide = true;
  else if (M.ph === 'between') { if (M.t > 1.2) c.wide = false; }
  else c.wide = false;
  let tx = CX, ty = CAMY, tz = ZB;
  if (c.wide) { const b = M.ball; tx = clamp(CX + (b.x - CX) * .65, CX - 260, CX + 260); ty = clamp(MY + (b.y - MY) * .6, MY - 230, MY + 230); tz = ZW; if (M.ph === 'between') { tx = c.x; ty = c.y; } }
  const k = 1 - Math.pow(.0008, dt);
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  if (c.z !== tz) { c.z = tz; game.setZoom(tz); }
  game.focus(c.x, c.y, 0);
}

/* ----- drawing ----- */
function drawMatch(r) {
  const M = MS.M, t = game.time;
  r.sky(M.ground.sky);
  map.drawFloor(r);
  drawSet(r, M);
  drawCrowd(r, M, t);
  // the pitching marker, the timing ring and the shadow of where the ball will land
  r.decal(() => {
    const ph = M.ph;
    if (M.sideBowl().ctrl && (ph === 'setup' || ph === 'runup')) {
      const k = .6 + .4 * Math.sin(t * 6);
      r.groundRing(M.marker[0], M.marker[1], 7 + k * 2, '#ffd860', 1); r.groundRing(M.marker[0], M.marker[1], 3, '#ff6040', .9);
      r.groundDisc(M.marker[0], M.marker[1], 4, '#ff4030', .3);
      const bands = [[372, 'YORKER'], [410, 'FULL'], [455, 'GOOD'], [510, 'SHORT']];
      for (const [by] of bands) { const a = r.w(CX - 28, by, 0), b = r.w(CX + 28, by, 0); px.line(r.tgt, a[0], a[1], b[0], b[1], '#ffffff', 1); }
    }
    if (ph === 'flight' && M.sideBat().ctrl && !M.swing) {
      const b = M.ball, bat = M.striker(); const pr = predictPlane(b, YHIT), tl = pr.t;
      const win = T('window') * (M.sideBat().fire > 0 ? 1.5 : 1), ready = Math.abs(tl - SWING_DELAY) < win;
      const rad = 5 + clamp(tl - SWING_DELAY + win, 0, 1.2) * 38;
      for (const k of [0, .8, 1.6]) r.groundRing(bat.x, YHIT, rad + k, ready ? '#58ff70' : '#ffffff', 1); r.groundRing(bat.x, YHIT, 6, ready ? '#58ff70' : '#ffd860', 1); r.groundDisc(bat.x, YHIT, 5, ready ? '#58ff70' : '#ffd860', .35);
    }
    if (ph === 'inplay' && MS.M.landing && M.ball.carried && M.ball.z > 4) r.groundRing(M.landing[0], M.landing[1], 6 + Math.sin(t * 10) * 1.5, '#ffe040', .9);
    if (ph === 'inplay' && M.sideBowl().ctrl && M.fielders[M.active]) { const f = M.fielders[M.active]; r.groundRing(f.x, f.y, 9, '#ffe040', 1); }
    if (DEVFLAGS.debugDraw) for (const f of M.fielders) r.groundRing(f.x, f.y, 10, '#ff00ff', .5);
  });
  drawStumps(r, SY, M); drawStumps(r, BY, M);
  r.shadow(CX + 30, BY + 4, 6, .35);
  r.actor(CX + 30, BY + 4, 0, (g, ox, oy) => rigs.umpire.draw(g, ox, oy, r.view));
  M.fielders.forEach((f, i) => { r.shadow(f.x, f.y, 7, .35); r.actor(f.x, f.y, 0, (g, ox, oy) => rigs.field[i].draw(g, ox, oy, r.view)); });
  M.batters.forEach((b, i) => {
    r.shadow(b.x, b.y, 7, .35);
    r.actor(b.x, b.y, 0, (g, ox, oy) => { rigs.bat[i].draw(g, ox, oy, r.view); });
    if (b.swingT >= 0 && i === M.sIdx) r.queue(b.x, b.y, 30, g => rigs.bat[i].drawSmear && rigs.bat[i].drawSmear(r));
  });
  if (M.cow) drawCow(r, M.cow, t);
  drawBall(r, M, t);
  if (M.ground.night) { for (const [lx, ly] of [[CX - 330, MY - 360], [CX + 330, MY - 360], [CX - 330, MY + 360], [CX + 330, MY + 360]]) game.lights.add(lx, ly, 90, 520, .75, { color: '#fff4d0' }); game.lights.add(CX, MY, 40, 260, .5, { color: '#fff4d0' }); }
  if (M.sideBat().fire > 0) game.lights.add(M.striker().x, M.striker().y, 20, 70, .9, { color: '#ff7a20' });
  hudAll(r, M, { bat: !!inpOf(M.sideBat().ctrl), bowl: !!inpOf(M.sideBowl().ctrl) });
  devDraw(r);
  if (MS.hub) hubOverlay(r);
  if (MS.attract) r.overlay(g => { const y = r.H - 38; dark(g, 0, y, r.W, 22, .6); E.font.text(g, 'DEMO - PRESS ANY BUTTON', r.W / 2, y + 7, Math.floor(game.real * 2) % 2 ? GOLD : INK, { align: 'center', outline: false, shadow: '#000' }); });
}
