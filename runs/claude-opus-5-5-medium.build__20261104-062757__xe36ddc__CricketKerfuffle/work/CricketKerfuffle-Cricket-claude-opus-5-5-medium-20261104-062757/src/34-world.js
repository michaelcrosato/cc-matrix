// ---- the match on screen: four fixed views cut like TV (5.11), the camera director, the ground and its props, the
// crowd, the actors, the ball with its trail and effects, the marker and aim arrow, the catch ring, Owl-Eye, critters,
// lights, fog and weather. Draw order: floor, decals, the depth-sorted queue, lighting, overlays (the HUD is 44-hud.js).
const VIEWS = {};
function makeViews() {
  VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, T('camPitch'), T('camScale'), 1);
  VIEWS.wide = new E.View('wide', 'Wide', 0, 52, T('wideScale'), 1);
  VIEWS.close = new E.View('close', 'Close-up', 0, 24, 2.3, 1);
  VIEWS.side = new E.View('sideon', 'Side-on', 90, 12, 2.1, 1);
  VIEWS.story = new E.View('story', 'Three-quarter', 0, 40, .9, 1);
  VIEWS._k = [T('camPitch'), T('camScale'), T('wideScale')].join();
}
const WORLD = { map: null, gid: null, props: [], crowd: [], pano: {}, shot: 'broadcast', shotT: 0, focus: [0, 70, 0] };
function useGround(gid, m) {
  if (WORLD.gid !== gid || !WORLD.map) { WORLD.map = buildGround(gid); WORLD.gid = gid; WORLD.crowd = makeCrowd(gid); }
  WORLD.props = groundProps(gid, m);
  if (!VIEWS.broadcast || VIEWS._k !== [T('camPitch'), T('camScale'), T('wideScale')].join()) makeViews();
}
function makeCrowd(gid) {
  const G = GROUNDS[gid], R = E.rng(gid.length * 31 + 7), out = [], k = T('boundaryScale'), rx = G.rx * k, ry = G.ry * k;
  const n = Math.round(160 + G.crowd * 260);
  for (let i = 0; i < n; i++) {
    const t = R() * TAU, d = 1.05 + R() * (G.surround === 'dome' ? .2 : .12);
    let x = Math.cos(t) * rx * d, y = 160 + Math.sin(t) * ry * d, z = 0;
    if (G.surround === 'dome') z = d > 1.15 ? 64 : 34;
    if (G.surround === 'beach' && x < -rx) continue;
    if (Math.abs(x) < 50 && Math.abs(y - 160) > ry) continue;   // the sight screens
    out.push({ x, y, z, c: pick(['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#f4f4f0', '#ff8ad8', '#8a5ad8', '#e8803a'], R), s: pick(['#f2c8a0', '#c88a5a', '#7a4a2a', '#e8b890'], R), h: pick(['#1a1a22', '#6a4020', '#d8b060', '#8a8a8a'], R), ph: R() * TAU, um: R() < .4 });
  }
  return out;
}
const SPR = {};
function spr() {
  if (SPR.ball) return SPR;
  SPR.ball = E.sprite(['.rr.', 'rRRr', 'rRRr', '.rr.'], { r: '#9a1a22', R: '#d83a3a' });
  SPR.ballW = E.sprite(['.ww.', 'wWWw', 'wWWw', '.ww.'], { w: '#d8d8d0', W: '#ffffff' });
  SPR.ballP = E.sprite(['.pp.', 'pPPp', 'pPPp', '.pp.'], { p: '#d8508a', P: '#ff8ad8' });
  SPR.holo = E.sprite(['.cc.', 'cCCc', 'cCCc', '.cc.'], { c: '#3ad8ff', C: '#c8f8ff' });
  SPR.peacock = [E.sprite(['..b.', '.bb.', 'bbbg', '.gg.', '.k.k'], { b: '#2a6ad8', g: '#2a9a5a', k: '#8a6a3a' }), E.sprite(['g.g.g.g', '.gbgbg.', '..bbb..', '..bbg..', '...g...', '..k.k..'], { b: '#2a6ad8', g: '#2a9a5a', k: '#8a6a3a' })];
  SPR.gull = [E.sprite(['w...w', '.wwww', '..ww.'], { w: '#f4f4f0' }), E.sprite(['.....', 'wwwww', '..ww.'], { w: '#f4f4f0' })];
  SPR.rabbit = E.sprite(['w.w', 'www', 'www'], { w: '#c8b8a8' });
  SPR.chicken = [E.sprite(['..rr', '.yyy', 'yyyy', 'yyyy', '.o.o'], { r: '#e03a2a', y: '#ffe060', o: '#e8a030' }), E.sprite(['..rr', '.yyy', 'yyyy', 'yyyy', 'o..o'], { r: '#e03a2a', y: '#ffe060', o: '#e8a030' })];
  SPR.bee = E.sprite(['yk', 'ky'], { y: '#ffd23a', k: '#1a1a1a' });
  const tok = (c, l) => E.sprite(['.dddddd.', 'dccccccd', 'dcllllcd', 'dclcclcd', 'dcllllcd', 'dccccccd', '.dddddd.'], { d: E.shade(c, -.4), c, l });
  for (const id in ITEMS) SPR['tok_' + id] = tok(ITEMS[id].color, '#ffffff');
  const fan = ['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#f4f4f0', '#ff8ad8', '#8a5ad8', '#e8803a'];
  SPR.fan = fan.map(c => [E.sprite(['.h.', 'hsh', 'ccc', 'ccc'], { h: '#3a2a1a', s: '#f2c8a0', c }), E.sprite(['c.c', 'hsh', 'ccc', 'ccc'], { h: '#3a2a1a', s: '#f2c8a0', c })]);
  SPR.umb = E.sprite(['.uuu.', 'uuuuu', '..k..'], { u: '#2a5ad8', k: '#1a1a1a' });
  return SPR;
}
// ---- the camera director (5.11.2)
function director(m, dt) {
  const s = m.state, b = m.ball, H = game.H || 240;
  let shot = 'broadcast';
  if (s === 'inPlay' || (s === 'dead' && (m.boundaryHit || m.deadWhy === 'caught' || m.deadWhy === 'runout' || m.deadWhy === 'settled' || m.deadWhy === 'cap'))) {
    const far = hyp(b.x, b.y - 80) > 150 || b.z > 50 || (m.contact && m.contact.speed > 300 && m.st > .12) || b.phase === 'throw';
    if (WORLD.shot === 'wide' || far) shot = 'wide';
  }
  if (s === 'dead' && m.ballRec && m.ballRec.wicket && m.st < 1.4 && !m.replay) shot = 'close';
  if (m.review && m.review.t < 3.9) shot = 'side';
  if (m.third && !m.third.done) shot = 'side';
  if (m.replay && m.replay.on) shot = m.replay.shot || (m.boundaryHit ? 'wide' : 'broadcast');
  if (m.rain && !m.rain.done) shot = 'wide';
  if (s === 'break' || s === 'over') shot = 'wide';
  if (WORLD.forceShot) shot = WORLD.forceShot;
  if (shot !== WORLD.shot) { WORLD.shot = shot; WORLD.shotT = 0; game.setView(VIEWS[shot]); emit('cam', { shot }); cover('cam:' + shot); }
  WORLD.shotT += dt;
  const v = VIEWS[shot], k = v.scale * Math.sin(v.pitchDeg * DEG);
  let fx = 0, fy = 70, fz = 0, smooth = 0;
  if (shot === 'broadcast') { fy = 14 + (.5 - .46) * H / k; fx = 0; }
  if (shot === 'wide') {
    const bb = m.replay && m.replay.on ? (m.replayFrame && m.replayFrame.ball) || [b.x, b.y, b.z] : [b.x, b.y, b.z];
    let tx = bb[0], ty = bb[1];
    if (!m.replay && m.intercept && s === 'inPlay') { tx = (b.x * 2 + m.intercept.x) / 3; ty = (b.y * 2 + m.intercept.y) / 3; }
    if (s === 'break' || s === 'over' || (m.rain && !m.rain.done)) { tx = 0; ty = 160; }
    fx = tx; fy = ty; fz = Math.min(40, bb[2] * .3); smooth = .22;
  }
  if (shot === 'close') { const r = m.ballRec; let tx = 0, ty = 10; if (r && r.wicket && r.wicket.how === 'caught' && m.catcher) { tx = m.catcher.x; ty = m.catcher.y; } if (r && r.wicket && r.wicket.how === 'run out' && m.runout) { ty = m.runout.end ? 310 : 10; } fx = tx; fy = ty; fz = 10; }
  if (shot === 'side') { fx = 0; fy = m.third ? (m.runout && m.runout.end ? 300 : 20) : 20; fz = 10; }
  if (WORLD.focusOverride) [fx, fy, fz] = WORLD.focusOverride;
  game.cam.smooth = smooth;
  WORLD.focus = [fx, fy, fz];
  game.focus(OX + fx, OY + fy, fz);
}
// ---- drawing the match world
const FRAME_ACTORS = [];
function drawWorld(r, m, dt) {
  const S_ = spr(), G = m.g, rf = m.replay && m.replay.on ? replayFrame(m) : null; m.replayFrame = rf;
  // lights by the time of day
  const L = game.lights; L.enabled = true;
  const amb = { day: .97, dusk: .72, night: .48 }[m.time] || .95;
  L.ambient = m.weather === 'overcast' ? Math.min(amb, .82) : m.weather === 'rain' ? Math.min(amb, .7) : amb;
  if (WORLD.shot === 'broadcast') drawPanoramaBack(r, m);
  WORLD.map.drawFloor(r); WORLD.map.queueWalls(r);
  if (WORLD.shot === 'broadcast') r.queue(OX, OY - 182, 0, g => drawPanorama(g, r, m), { bias: -1 });
  for (const [id, x, y, o] of WORLD.props) {
    if (E.SHAPES[id]) r.shape(id, OX + x, OY + y, 0, Object.assign({ light: m.time === 'night' }, o));
    else r.prop(id, OX + x, OY + y, 0, o);
  }
  // targets: broken ones show it
  for (const tg of G.targets) {
    const at = m.targetPos(tg), hit = m.targetsHit.includes(tg.id);
    if (tg.id === 'balloon') r.shape('ck_balloon', OX + at[0], OY + at[1], at[2] - 30, {});
    if (hit) r.queue(OX + at[0], OY + at[1], at[2], g => { const p = r.w(OX + at[0], OY + at[1], at[2]); if (Math.floor(game.time * 4) % 2) E.font.text(g, 'SMASHED', p[0], p[1] - 16, '#ffd23a', { align: 'center', shadow: '#000' }); }, { bias: 2 });
  }
  // the machine bowls in place of a rig
  const bw = m.bowler(), mach = bw && bw.p.machine;
  // stumps at both ends
  for (const e of [0, 1]) {
    const down = m.stumpsDown && m.stumpsDown[1] === e && (!rf || rf.t >= m.stumpsDown[0]);
    const sawn = down && m.stumpsDown[2] === 'sawn';
    if (sawn) {   // Sawn in Half: the stumps cut through, the top halves sliding apart, sawdust in the air
      const u = clamp((game.time - (m.sawnAt || (m.sawnAt = game.time))) / .6, 0, 1);
      r.shape('ck_stumps', OX, OY + e * 320, 0, { facing: Math.PI / 2, scale: 1.12, params: {} });
      r.queue(OX, OY + e * 320, 8, g => { const p = r.w(OX, OY + e * 320, 7); px.rect(g, p[0] - 8, p[1] - 1, 16, 2, '#4a3020'); for (const sd of [-1, 1]) { const ox = Math.round(sd * u * 7), oy = -Math.round(u * 4); px.rect(g, p[0] + ox - (sd < 0 ? 7 : 0), p[1] - 8 + oy, 7, 7, '#e8dcb8'); px.rect(g, p[0] + ox - (sd < 0 ? 7 : 0), p[1] - 8 + oy, 7, 1, '#f4ecd0'); } px.line(g, p[0] - 10, p[1] - 2, p[0] + 10, p[1] - 2, '#ffd23a'); }, { bias: 1 });
      if (Math.random() < .3) game.particles.bits(OX, OY + e * 320, 7, 2, ['#d8b880', '#f4e0b0']);
    } else { m.sawnAt = null; r.shape(down ? 'ck_stumpsDown' : 'ck_stumps', OX, OY + e * 320, 0, { facing: Math.PI / 2, scale: 1.12 }); }
  }
  // the crowd: fans round the rope and on the stands; they jump for boundaries, umbrellas in the rain
  const cheer = WORLD.cheer > 0, rain = m.weather === 'rain';
  for (const f of WORLD.crowd) {
    const bob = cheer ? Math.max(0, Math.sin(game.time * 12 + f.ph)) * 4 : Math.sin(game.time * 2 + f.ph) > .97 ? 1 : 0;
    const sp = rain && f.um ? S_.umb : S_.fan[(f.c.charCodeAt(2) + f.c.charCodeAt(4)) % S_.fan.length][cheer && Math.sin(game.time * 12 + f.ph) > 0 ? 1 : 0];
    r.sprite(OX + f.x, OY + f.y, f.z + bob, sp, { anchor: 'bottom' });
  }
  // critters
  for (const k of m.critters || []) {
    if (k.kind === 'cow') r.shape('ck_cow', OX + k.x, OY + k.y, 0, { facing: k.vx > 0 ? 0 : Math.PI, params: { step: Math.floor(k.t * 8) % 16 } });
    else if (k.kind === 'peacock') r.sprite(OX + k.x, OY + k.y, 0, S_.peacock[k.fan > .6 ? 1 : 0], { anchor: 'bottom', scale: 2 });
    else if (k.kind === 'gull') r.sprite(OX + k.x, OY + k.y, k.z, S_.gull[Math.floor(k.t * 5) % 2], { scale: 2 });
    else if (k.kind === 'rabbit') r.sprite(OX + k.x, OY + k.y, Math.abs(Math.sin(k.t * 9)) * 4, S_.rabbit, { anchor: 'bottom', scale: 2 });
    else if (k.kind === 'chicken') r.sprite(OX + k.x, OY + k.y, Math.abs(Math.sin(k.t * 10)) * 3, S_.chicken[Math.floor(k.t * 8) % 2], { anchor: 'bottom', scale: 4 });
    else if (k.kind === 'steward' || k.kind === 'fortescue') { const rig = rigFor({ id: k.kind, team: k.kind === 'fortescue' ? 'gen' : 'ker', look: k.kind === 'fortescue' ? TEAM.gen.stars[1].look : { build: 'bulky', colors: { cloth: '#f8d020' } } }, 'field'); rig._k = null; rig.update(dt, { x: OX + k.x, y: OY + k.y, z: 0, vx: k.vx, vy: k.vy, facing: Math.atan2(k.vy, k.vx), pose: k.tray ? 'cast' : null }); r.shadow(OX + k.x, OY + k.y, 6, .3); r.actor(OX + k.x, OY + k.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
    else if (k.kind === 'devil') { if (Math.floor(game.time * 30) % 3 === 0) game.particles.dust(OX + k.x + Math.cos(game.time * 9) * 10, OY + k.y + Math.sin(game.time * 9) * 10, Math.random() * 40, 2); }
  }
  if (m.tide > 0) { const b = m.boundary(); r.decal(() => { for (let a = Math.PI * .55; a < Math.PI * 1.45; a += .05) { const x0 = Math.cos(a) * b.rx * (1 - m.tide), y0 = 160 + Math.sin(a) * b.ry; for (let k = 0; k < 3; k++) { const f = 1 + k * .02 + Math.sin(game.time * 1.5 + a * 9) * .01; r.groundDisc(OX + x0 * f - 6, OY + y0, 14, k ? '#5ab8f0' : '#f4f8ff', k ? .55 : .7); } } }); }
  // the item token
  if (m.token) { const t = m.token; r.sprite(OX + t.x, OY + t.y, t.z + Math.sin(game.time * 3) * 3, S_['tok_' + t.id], { glow: .6, scale: WORLD.shot === 'broadcast' ? 1 : 2 }); r.shadow(OX + t.x, OY + t.y, 5, .25); }
  // actors (live, or from the recorder in a replay)
  const list = [...m.batters, ...m.fielders, ...m.umps];
  for (let i = 0; i < list.length; i++) {
    let a = list[i];
    if (rf) { const q = rf.a[i]; if (!q) continue; a = Object.assign(FRAME_ACTORS[i] || (FRAME_ACTORS[i] = {}), { p: a.p, role: a.role, x: q[0], y: q[1], z: q[2], facing: q[3], anim: q[4], animT: q[5], sw: q[6], signal: q[7], expr: q[8], dive: q[9], hasBall: q[10], vx: 0, vy: 0 }); }
    if (!a.p) continue;
    if (a.role === 'parked') { r.shape('ck_machine', OX + a.x, OY + a.y, 0, { facing: 0, params: { a: game.time } }); continue; }
    if (a.role === 'bowler' && mach) { r.shape('ck_machine', OX + 6, OY + 318, 0, { facing: -Math.PI / 2, params: { a: game.time * (m.state === 'runup' ? 14 : 2) }, scale: 1.2 }); if (Math.random() < .3) game.particles.smoke(OX + 6, OY + 322, 46, 1, { size: 1 }); continue; }
    const rig = rigFor(a.p, gearOf(a));
    poseRig(rig, a, rf ? null : m, dt);
    const ghost = a.p.ghost, alpha = (ghost ? (.5 + .2 * Math.sin(game.time * 5 + i)) : 1) * (a.phantom > 0 ? .3 : 1);
    if (m.fogLevel && m.fogLevel() > .3 && hyp(a.x - WORLD.focus[0], a.y - WORLD.focus[1]) > 400) continue;
    r.shadow(OX + a.x, OY + a.y, 6, .3);
    const fire = m.fire.batOn && a.role === 'bat' && a === m.batters[0];
    r.actor(OX + a.x, OY + a.y, a.z || 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { alpha: alpha < 1 ? alpha : undefined, ghost: ghost ? { color: '#a8e0ff', life: .2, alpha: .3, owner: a } : undefined, outline: a.role === 'field' && m.catchQTE && m.catchQTE.f === a ? '#ffd23a' : undefined });
    if (fire && Math.random() < .5) { const tp = rig.tip(); game.particles.fire(tp[0], tp[1], tp[2], 1, { size: .8 }); }
    if (a.bees && Math.random() < .4) game.particles.add({ kind: 'spark', x: OX + a.x + (Math.random() - .5) * 16, y: OY + a.y + (Math.random() - .5) * 16, z: 20 + Math.random() * 14, vx: 0, vy: 0, vz: 0, life: .2, color: '#ffd23a' });
    if (a.hasBall && !rf) r.queue(OX + a.x, OY + a.y, 14, g => { const p = r.w(OX + m.ball.x, OY + m.ball.y, m.ball.z); px.rect(g, p[0] - 1, p[1] - 1, 2, 2, '#c82a32'); }, { bias: 1 });
  }
  // the ball (and Triple Threat's holograms)
  const b = rf ? { x: rf.ball[0], y: rf.ball[1], z: rf.ball[2], phase: rf.ball[3], fx: rf.ball[4] } : m.ball;
  if (b.phase !== 'held' && b.phase !== 'carried') drawBall(r, m, b, S_, rf);
  for (const hb of m.holos) if (hb.phase === 'delivery' && Math.floor(game.time * 20) % 3) { r.sprite(OX + hb.x, OY + hb.y, hb.z, S_.holo, { anchor: 'center', glow: .7 }); }
  // the marker (a human bowler) and the aim arrow (a human batter)
  const st = m.state;
  if (!rf && (st === 'setup' || st === 'runup') && m.isHuman('bowl')) {
    const mk = m.marker; r.decal(() => { r.groundRing(OX + mk.x, OY + mk.y, 7, '#ffd23a', .9); r.groundRing(OX + mk.x, OY + mk.y, 3.5, '#ffffff', .8); });
    if (Math.floor(m.I.legal / 6) < 2) r.decal(() => { for (const [y0, y1, c] of [[20, 44, '#ff6a6a'], [44, 90, '#ffd23a'], [90, 150, '#7ae07a'], [150, 240, '#7ad0ff']]) r.groundDisc(OX, OY + (y0 + y1) / 2, 2, c, .5); });
  }
  if (!rf && (st === 'flight' || st === 'runup' || st === 'setup') && m.isHuman('bat') && m.aim !== null && m.aim !== undefined) {
    const b0 = m.batters[0], h = m.strikerHand(), w = dirOf(m.aim, h);
    r.decal(() => { for (let k = 1; k <= 6; k++) r.groundDisc(OX + b0.x + w[0] * (8 + k * 7), OY + b0.y + w[1] * (8 + k * 7), k === 6 ? 2.6 : 1.4, '#ffd23a', .85); });
  }
  if (!rf && m.effects && !m.effects.fog && S('marker') && m.isHuman('bat') && st === 'flight' && m.ball.phase === 'delivery' && !m.ball.pitched && m.cfg.mode !== 'attract') {
    const a = m._predPitch || (m._predPitch = arrival(m.ball, 30, m.env));
    if (a && a.pitchY) r.decal(() => r.groundRing(OX + a.pitchX, OY + a.pitchY, 3, '#ffffff', .5));
  }
  if (st !== 'flight') m._predPitch = null;
  // Statistical Certainty: a ring closing on the bat at the perfect moment
  if (!rf && m.batSpecial === 'stats' && st === 'flight' && !m.swing) { const cy = m.contactY(), a = arrival(m.ball, cy.y, m.env); if (a) { const tt = a.t - SHOT.straightDrive.at, b0 = m.batters[0]; r.decal(() => r.groundRing(OX + b0.x, OY + b0.y, 4 + Math.max(0, tt) * 60, '#7ae0ff', .9)); } }
  // the catch ring
  if (!rf && m.catchQTE && m.t >= m.catchQTE.start - .3) {
    const q = m.catchQTE, u = clamp((q.tCatch - m.t) / T('catchRing'), 0, 1), f = q.f;
    r.decal(() => { r.groundRing(OX + f.x, OY + f.y, 8, '#ffffff', .9); r.groundRing(OX + f.x, OY + f.y, 8 + u * 30, '#ffd23a', .9); });
  }
  // the throw picker over the stumps (a human fielding side holding the ball)
  // Owl-Eye: the ball's path, the pitching and impact discs (a review)
  if (m.review) drawOwlEye(r, m);
  // the rain covers
  if (m.rain && !m.rain.done) r.shape('ck_covers', OX, OY + 160 - 160, 0, { params: { spread: clamp(m.rain.t / 2, 0, 1) } });
  // night: floodlights and a glow on the ball
  if (m.time === 'night') { for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.add(OX + sx * (G.rx + 90), OY + 160 + sy * (G.ry + 90), 120, 900, .6, { color: '#fff4dc' }); L.add(OX, OY + 160, 30, 500, .35, { color: '#fff8e8' }); }
  if (m.time === 'dusk') L.add(OX - 400, OY - 300, 200, 1200, .25, { color: '#ffb060' });
  // fog: a stepped translucency, thicker toward the top of the screen (the far end), and in the wide shot all over
  const fogL = m.fogLevel ? m.fogLevel() : 0;
  if (fogL > 0) { cover('fog'); r.overlay(g => { const H = r.H, W = r.W; for (let y = 0; y < H; y += 8) { const k = WORLD.shot === 'broadcast' ? clamp(1 - y / (H * .9), 0, 1) : .55 + .25 * Math.sin(y * .05 + game.time * .3); const a = Math.round(fogL * k * 6) / 8; if (a > .05) px.blend(g, a, 'normal', () => px.rect(g, 0, y, W, 8, '#b8c4d4')); } }); }
  // fireworks and the weather
  if (m.fireworks > 0 && Math.random() < .12) { const x = OX + (Math.random() - .5) * 800, y = OY + 160 + (Math.random() - .5) * 600; game.particles.explosion(x, y, 160 + Math.random() * 80, .6, { debris: false, freeze: false, shake: 0 }); }
  const wantRain = m.weather === 'rain' || (m.rain && !m.rain.done);
  if (wantRain && (!game.weather || game.weather.kind !== 'rain')) game.weather = { kind: 'rain', amount: .8, wind: .2, lightning: G.storm ? .2 : 0 };
  else if (!wantRain && G.id === 'downs' && (!game.weather || game.weather.kind !== 'sand')) game.weather = { kind: 'sand', amount: .15, wind: .5 };
  else if (!wantRain && game.weather && game.weather.kind === 'rain') game.weather = null;
}
function drawBall(r, m, b, S_, rf) {
  const vanish = m.effects && m.effects.vanish && b.phase === 'delivery' && !rf, flight = vanish ? clamp((300 - b.y) / 300, 0, 1) : 0;
  r.shadow(OX + b.x, OY + b.y, b.z > 40 ? 3 : 2, .45);
  if (vanish && flight > .4 && flight < .65) { if (Math.random() < .3) game.particles.smoke(OX + b.x, OY + b.y, b.z, 1, { color: '#8a3aff', size: .8 }); return; }
  const sp = m.time === 'night' ? (m.g.id === 'dome' ? S_.ballP : S_.ballW) : S_.ball, fx = b.fx;
  const live = !rf;
  if (live) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 12) b.trail.shift(); }
  const trail = live ? b.trail.slice() : [];
  const tc = { fire: '#ff8a2a', steam: '#e8f4ff', holy: '#fff8b0', feather: '#f4e8d0', haze: '#ffb060', grudge: '#ff3a3a', ecto: '#a8e0ff', croquet: '#7ae07a', glint: '#ffffff', dust: '#d8c8a0', wobble: '#ffd23a' }[fx] || '#f4f0e0';
  r.queue(OX + b.x, OY + b.y, b.z, g => {
    for (let k = 1; k < trail.length; k++) { const p0 = r.w(OX + trail[k - 1][0], OY + trail[k - 1][1], trail[k - 1][2]), p1 = r.w(OX + trail[k][0], OY + trail[k][1], trail[k][2]); px.blend(g, .15 + k / trail.length * .45, fx ? 'add' : 'normal', () => px.line(g, p0[0], p0[1], p1[0], p1[1], tc)); }
    const p = r.w(OX + b.x, OY + b.y, b.z);
    if (fx === 'grudge') px.disc(g, p[0], p[1], 3, '#ff3a3a');
    if (fx || m.time === 'night') r.glowDisc(g, p[0], p[1], fx ? 7 : 5, tc, .6);
    px.sprite(g, sp, p[0] - 2, p[1] - 2);
  }, { emissive: !!fx || m.time === 'night' });
  if (live && fx && Math.random() < .5) {
    if (fx === 'fire') game.particles.fire(OX + b.x, OY + b.y, b.z, 1, { size: .7 });
    else if (fx === 'steam') game.particles.smoke(OX + b.x, OY + b.y, b.z, 1, { color: '#f4f8ff', size: .7 });
    else if (fx === 'ecto' || fx === 'holy' || fx === 'glint') game.particles.glints(OX + b.x, OY + b.y, b.z, 1, tc);
  }
}
function replayFrame(m) {
  const rq = m.replay, idx = Math.min(rq.to, rq.from + Math.floor(rq.t * 60 * .5));
  return m.rec[idx] || m.rec[m.rec.length - 1];
}
function drawOwlEye(r, m) {
  const rv = m.review, tr = rv.tr, p = m.padHit; if (!p) return;
  const path = (m.rec || []).filter(f => f.t >= (m.releaseT || 0) && f.t <= (m.releaseT || 0) + 3 && (f.ball[3] === 'delivery')).map(f => f.ball);
  const u = clamp(rv.t / 1.6, 0, 1);
  r.queue(OX, OY + 160, 0, g => {
    const pts = path.slice(0, Math.max(2, Math.floor(path.length * u))).map(q => r.w(OX + q[0], OY + q[1], q[2]));
    for (let k = 1; k < pts.length; k++) px.line(g, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], '#ff4a4a', 3);
    if (rv.t > 1.6) { const c = tr.path.slice(0, Math.floor(tr.path.length * clamp((rv.t - 1.6) / .9, 0, 1))).map(q => r.w(OX + q.x, OY + q.y, q.z)); for (let k = 1; k < c.length; k++) px.line(g, c[k - 1][0], c[k - 1][1], c[k][0], c[k][1], '#3ad8ff', 3); }
  }, { bias: 3 });
  r.decal(() => { if (p.pitchX !== null) r.groundDisc(OX + p.pitchX, OY + p.pitchY, 3, tr.pitched === 'outside leg' ? '#ff4a4a' : '#5fd38a', .9); r.groundDisc(OX + p.x, OY + p.y, 3, tr.impact === 'outside off' ? '#ff4a4a' : '#5fd38a', .9); });
}
// ---- the far-end panorama (broadcast only): sky, far scenery, the stands and crowd, the sight screen, the scoreboard
function panoramaFor(gid) {
  if (WORLD.pano[gid] || HEADLESS) return WORLD.pano[gid];
  const G = GROUNDS[gid], W = 760, Hh = 170, c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const g = c.getContext('2d'), R = E.rng(gid.length * 13 + 1);
  const sky = G.sky, rows = Hh - 40;
  for (let y = 0; y < rows; y++) { const t = y / rows, c0 = t < .5 ? sky[0] : sky[1], c1 = t < .5 ? sky[1] : sky[2], k = t < .5 ? t * 2 : (t - .5) * 2; px.rect(g, 0, y, W, 1, E.mix ? E.mix(c0, c1, k) : (k < .5 ? c0 : c1)); }
  if (G.id === 'dome') for (let k = 0; k < 90; k++) px.dot(g, Math.floor(R() * W), Math.floor(R() * (rows - 20)), R() < .3 ? '#ffffff' : '#8a8ac8');
  // far scenery
  const hz = Hh - 46;
  const hill = (col, amp, base, f) => { for (let x = 0; x < W; x++) { const h = base + Math.sin(x * f + R() * .02) * amp + Math.sin(x * f * 2.7) * amp * .4; px.rect(g, x, hz - h, 1, h + 4, col); } };
  if (G.surround === 'village' || G.surround === 'hall') { hill(E.shade(G.grass[1], -.25), 8, 22, .012); hill(E.shade(G.grass[1], -.12), 6, 12, .02); for (let k = 0; k < 18; k++) { const x = R() * W, h = 10 + R() * 14; px.disc(g, x, hz - 12 - h * .5, h * .5, E.shade('#3f7a32', -.1 - R() * .2)); } }
  if (G.surround === 'village') { px.rect(g, W / 2 + 200, hz - 70, 14, 58, '#8a8478'); for (let k = 0; k < 8; k++) px.rect(g, W / 2 + 200 + k, hz - 70 - (7 - k) * 3, 14 - 2 * k, 3, '#4a4a58'); px.rect(g, W / 2 - 260, hz - 36, 60, 26, '#8a2a2a'); px.rect(g, W / 2 - 264, hz - 42, 68, 7, '#5a3a2a'); }
  if (G.surround === 'hall') { px.rect(g, W / 2 - 120, hz - 52, 240, 44, '#c8bfa8'); px.rect(g, W / 2 - 120, hz - 56, 240, 5, '#8a8478'); for (let k = 0; k < 12; k++) px.rect(g, W / 2 - 110 + k * 19, hz - 44, 8, 12, '#3a4a5a'); px.rect(g, W / 2 - 14, hz - 74, 28, 22, '#c8bfa8'); }
  if (G.surround === 'beach') { px.rect(g, 0, hz - 18, W, 18, '#2a8ad0'); for (let x = 0; x < W; x += 9) px.rect(g, x + (R() * 4 | 0), hz - 18 + (R() * 14 | 0), 4, 1, '#bff0ff'); px.disc(g, 120, hz - 50, 28, '#e04a3a'); px.disc(g, 120, hz - 50, 24, sky[1]); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; px.line(g, 120, hz - 50, 120 + Math.cos(a) * 26, hz - 50 + Math.sin(a) * 26, '#f4f4f0'); } }
  if (G.surround === 'downs') { hill('#b88a5a', 16, 26, .008); hill('#a07a4a', 10, 12, .015); px.rect(g, W - 160, hz - 70, 8, 52, '#5a4a3a'); px.rect(g, W - 170, hz - 90, 28, 22, '#8a6a4a'); px.rect(g, 140, hz - 40, 30, 30, '#1a1a22'); px.rect(g, 130, hz - 12, 50, 4, '#1a1a22'); }
  if (G.surround === 'dome') { for (let k = 0; k < 6; k++) { const x = 60 + k * 130; px.line(g, x, hz, x + 40, 0, k % 2 ? '#7a3aff' : '#ff3aff'); } px.rect(g, W / 2 - 70, hz - 64, 140, 50, '#24243a'); px.rect(g, W / 2 - 66, hz - 60, 132, 42, '#1a2a4a'); }
  // the stands with their crowd, the sight screen, the boards, the rope, a sliver of outfield
  const sH = 34, sTop = Hh - 12 - sH;
  px.rect(g, 0, sTop, W, sH, G.id === 'dome' ? '#24243a' : G.id === 'hall' ? '#8a8478' : '#6a5a4a');
  for (let y = sTop + 3; y < sTop + sH - 2; y += 4) for (let x = 0; x < W; x += 3) if (R() < .82) { px.dot(g, x + (R() * 2 | 0), y, pick(['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#f4f4f0', '#ff8ad8', '#e8803a', '#1a1a22'], R)); px.dot(g, x + 1, y - 1, pick(['#f2c8a0', '#c88a5a', '#7a4a2a'], R)); }
  if (G.id !== 'dome') px.rect(g, 0, sTop - 4, W, 4, G.accent);
  px.rect(g, W / 2 - 46, sTop - 10, 92, sH + 10, '#f4f4ee'); px.rect(g, W / 2 - 46, sTop - 10, 92, 1, '#ffffff'); px.rect(g, W / 2 - 46, sTop + sH - 2, 92, 2, '#b8b8b0');
  const bd = sTop + sH;
  for (let x = 0; x < W; x += 44) { const cc = ['#2f6b3a', '#c8402a', '#22305a', '#d8a03a'][(x / 44) % 4]; if (Math.abs(x + 22 - W / 2) > 60) { px.rect(g, x, bd, 43, 6, cc); px.rect(g, x + 6, bd + 2, 30, 1, '#f4f4f0'); } }
  px.rect(g, 0, bd + 6, W, 1, G.rope);
  px.rect(g, 0, bd + 7, W, Hh - bd - 7, G.grass[1]);
  // the scoreboard frame (numbers drawn live)
  px.rect(g, W / 2 + 120, sTop - 46, 110, 44, '#1a1a1a'); px.rect(g, W / 2 + 122, sTop - 44, 106, 40, '#2a3a2a');
  WORLD.pano[gid] = { c, W, H: Hh, sb: [W / 2 + 122, sTop - 44] };
  return WORLD.pano[gid];
}
function drawPanoramaBack(r, m) { r.sky([m.g.sky[0], m.g.sky[1], m.g.sky[2]]); }
function drawPanorama(g, r, m) {
  const P = panoramaFor(m.g.id); if (!P) return;
  const base = r.w(OX, OY - 182, 0), off = (WORLD.focus[0] || 0) * .3;
  const x0 = Math.round(base[0] - P.W / 2 - off), y0 = Math.round(base[1] - P.H + 3);
  g.drawImage(P.c, x0, y0);
  if (y0 > 0) px.rect(g, 0, 0, r.W, y0, m.g.sky[0]);
  const I = m.I, sx = x0 + P.sb[0], sy = y0 + P.sb[1];
  E.font.text(g, m.teams[I.bat].code + ' ' + I.runs + '-' + I.wkts, sx + 4, sy + 4, '#ffd23a');
  E.font.text(g, 'OVERS ' + m.overStr(), sx + 4, sy + 14, '#f4f4f0');
  if (m.target()) E.font.text(g, 'TARGET ' + m.target(), sx + 4, sy + 24, '#7ae07a');
}
