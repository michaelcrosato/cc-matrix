/* BASKETBLAM - the court, drawing, camera and effects */

/* ---- the court map: floor painted by floorTex, stands as tiered walls ---- */
const MAPC = 48, MAPR = 28, T16 = 16;
const courtMaps = {};
function courtRows() {
  const rows = [];
  for (let r = 0; r < MAPR; r++) {
    let s = '';
    for (let c = 0; c < MAPC; c++) {
      const inC = c >= 4 && c < 44;
      if (r === 0) s += c >= 2 && c < 46 ? '#' : ',';
      else if (r >= 1 && r <= 4) s += c >= 2 && c < 46 ? String(r) : ',';
      else if (r >= 7 && r < 25 && inC) s += '.';
      else s += c >= 2 && c < 46 && r < 27 ? 'a' : ',';
    }
    rows.push(s);
  }
  return rows;
}
function courtFloor(cd, courtId) {
  const f0 = E.hex(cd.floor[0]), f1 = E.hex(cd.floor[1]), ln = E.hex(cd.line), pt = E.hex(cd.paint), ap = E.hex(cd.apron);
  return (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
    if (tag === 'out') return [10 + n * 6, 8 + n * 6, 16 + n * 6];
    if (tag === 'apron') { const k = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? 1 : 0; return [ap[0] * (.92 + k * .12) + n * 6, ap[1] * (.92 + k * .12) + n * 6, ap[2] * (.92 + k * .12) + n * 6]; }
    let lx = x - OX, ly = y - OY;
    const plank = Math.floor(ly / 6) % 2 ? f0 : f1, grain = E.noise2(lx * .04, ly * 1.2) * 10 + n * 8;
    let col = [plank[0] + grain, plank[1] + grain, plank[2] + grain];
    const mx = lx > CW / 2 ? CW - lx : lx;    // mirrored distance from the nearest baseline
    const rim = { x: 52, y: 144 };
    const dR = Math.hypot(mx - rim.x, ly - rim.y);
    // painted key and arcs
    const inKey = mx < 152 && ly > 96 && ly < 192;
    if (inKey) col = [pt[0] * .8 + grain, pt[1] * .8 + grain, pt[2] * .8 + grain];
    const L = [ln[0], ln[1], ln[2]]; let line = false;
    if (lx < 1.5 || lx > CW - 1.5 || ly < 1.5 || ly > CH - 1.5) line = true;
    if (Math.abs(lx - CW / 2) < 1) line = true;
    if (Math.abs(Math.hypot(lx - CW / 2, ly - CH / 2) - 40) < 1) line = true;
    if (Math.abs(mx - 152) < 1 && ly > 96 && ly < 192) line = true;
    if (Math.abs(ly - 96) < 1 && mx < 152) line = true; if (Math.abs(ly - 192) < 1 && mx < 152) line = true;
    if (Math.abs(Math.hypot(mx - 152, ly - 144) - 48) < 1 && mx > 152) line = true;
    if (Math.abs(dR - THREE_R) < 1.1 && mx > 108 + 0 && ly > 20 && ly < 268) line = true;
    if ((Math.abs(ly - 20) < 1 || Math.abs(ly - 268) < 1) && mx < 108) line = true;
    if (Math.hypot(mx - 52, ly - 144) < 4 && false) line = true;
    // centre logo burst
    const cr = Math.hypot(lx - CW / 2, ly - CH / 2);
    if (cr < 34) { const ang = Math.atan2(ly - CH / 2, lx - CW / 2); const spike = .55 + .45 * Math.abs(Math.sin(ang * 6)); if (cr < 30 * spike + 4) col = [pt[0] * 1.1 + 30, pt[1] * 1.1 + 20, pt[2] * 1.1 + 10]; }
    if (cr < 14) col = [250, 220, 120];
    if (line) return [L[0], L[1], L[2]];
    return col;
  };
}
function getCourtMap(id) {
  if (courtMaps[id]) return courtMaps[id];
  const cd = COURTS[id], st = cd.stands, wl = E.hex(cd.wallTop);
  const map = new E.TileMap({
    rows: courtRows(), outside: '#05040a', ao: 3,
    legend: { '#': 9, 1: 4, 2: 3, 3: 2, 4: 1, '.': { floor: 'court' }, a: { floor: 'apron' }, ',': { floor: 'out' } },
    floorTex: courtFloor(cd, id),
    types: {
      9: { h: 70, side: cd.wall, top: cd.wallTop, face: 'plaster' },
      4: { h: 58, side: st[0], top: cd.wallTop, face: 'stone' }, 3: { h: 44, side: st[1], top: cd.wallTop, face: 'stone' },
      2: { h: 30, side: st[0], top: cd.wallTop, face: 'stone' }, 1: { h: 16, side: st[1], top: cd.wallTop, face: 'stone' }
    }
  });
  courtMaps[id] = map; return map;
}

/* ---- the crowd ---- */
let crowdFans = [], crowdFor = '';
function buildCrowd(id) {
  if (crowdFor === id) return; crowdFor = id; crowdFans = [];
  const cd = COURTS[id], hs = [58, 44, 30, 16];
  for (let tier = 0; tier < 4; tier++) for (let c = 2; c < 46; c++) for (const dx of [4, 12]) {
    const h = E.hash2(c * 3 + dx, tier * 7 + 1);
    crowdFans.push({ x: c * 16 + dx, y: (tier + 1) * 16 + 8, z: hs[tier], shirt: cd.crowd[(h * 30 | 0) % 3], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 50 | 0) % 4], ph: h * 9, side: c < 24 ? 0 : 1 });
  }
}

/* ---- backdrops ---- */
const backdrops = {};
const getBackdrop = id => backdrops[id] || (backdrops[id] = new E.Backdrop(COURTS[id].backdrop));

/* ---- the hoop ---- */
function drawHoop(r, h) {
  const bx = h.x - h.dir * 12, shake = (h.shake || 0), sh = Math.sin(game.time * 60) * shake * 1.2;
  // stanchion pole and arm (behind the baseline)
  const poleX = h.x - h.dir * 34;
  r.queue(poleX, h.y - 2, 0, g => {
    const [x0, y0] = r.w(poleX, h.y, 0), [x1, y1] = r.w(poleX, h.y, 74), [ax, ay] = r.w(bx, h.y, 76);
    px.rect(g, Math.round(x0) - 2, Math.round(y1), 4, Math.round(y0 - y1), '#5a5e70'); px.rect(g, Math.round(x0) - 2, Math.round(y1), 1, Math.round(y0 - y1), '#8a90a8');
    px.line(g, Math.round(x0), Math.round(y1) + 1, Math.round(ax), Math.round(ay), '#6a6e82', 3);
    px.rect(g, Math.round(x0) - 6, Math.round(y0) - 3, 12, 5, '#3a3c4a');
  });
  // backboard: a vertical panel at x = bx, y +/- 24, z 72..100
  r.queue(bx, h.y - 1, 40, g => {
    const sk = yy => bx + (yy - h.y) * h.dir * .55;   // cheated: the panel is skewed so its face reads from the broadcast camera
    const pts = [[sk(h.y - 24), h.y - 24, 72], [sk(h.y + 24), h.y + 24, 72], [sk(h.y + 24), h.y + 24, 102], [sk(h.y - 24), h.y - 24, 102]].map(p => r.w(p[0], p[1], p[2]));
    if (h.broken > 0) {
      if (h.broken > 3.8 && !(Math.floor(game.time * 20) % 2)) px.poly(g, pts, '#bfe8ff');
      // frame only
      px.line(g, pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#d8dce8', 1); px.line(g, pts[2][0], pts[2][1], pts[3][0], pts[3][1], '#d8dce8', 1);
      return;
    }
    px.poly(g, pts, '#c9e4f4'); px.line(g, pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#ffffff', 1); px.line(g, pts[3][0], pts[3][1], pts[2][0], pts[2][1], '#ffffff', 1);
    px.line(g, pts[0][0], pts[0][1], pts[3][0], pts[3][1], '#e8f4ff', 1); px.line(g, pts[1][0], pts[1][1], pts[2][0], pts[2][1], '#9ab8cc', 1);
    const sq = [[sk(h.y - 9), h.y - 9, 80], [sk(h.y + 9), h.y + 9, 80], [sk(h.y + 9), h.y + 9, 92], [sk(h.y - 9), h.y - 9, 92]].map(p => r.w(p[0], p[1], p[2]));
    px.line(g, sq[0][0], sq[0][1], sq[1][0], sq[1][1], '#ff5040', 1); px.line(g, sq[1][0], sq[1][1], sq[2][0], sq[2][1], '#ff5040', 1); px.line(g, sq[2][0], sq[2][1], sq[3][0], sq[3][1], '#ff5040', 1); px.line(g, sq[3][0], sq[3][1], sq[0][0], sq[0][1], '#ff5040', 1);
  });
  const ring = (a0, a1, col) => {
    const pts = []; for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; const p = r.w(h.x + Math.cos(a) * RIM_R, h.y + Math.sin(a) * RIM_R, RIM_Z + sh * .3); pts.push(p); }
    for (let i = 0; i < 14; i++) px.line(g_, Math.round(pts[i][0]), Math.round(pts[i][1]), Math.round(pts[i + 1][0]), Math.round(pts[i + 1][1]), col, 2);
  };
  let g_ = null;
  // back half of the rim + net back
  r.queue(h.x, h.y - 3, RIM_Z, g => { g_ = g; ring(PI, TAU, '#c8381a'); });
  // net and front half
  r.queue(h.x, h.y + 3, RIM_Z - 8, g => {
    g_ = g;
    const sway = (h.net || 0) * 3 * Math.sin(game.time * 30), n = 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, a2 = (i + .5) / n * TAU;
      const top = r.w(h.x + Math.cos(a) * RIM_R, h.y + Math.sin(a) * RIM_R, RIM_Z), bot = r.w(h.x + Math.cos(a) * (RIM_R * .55) + sway, h.y + Math.sin(a) * (RIM_R * .55), RIM_Z - 15 - (h.net || 0) * 4);
      const mid = r.w(h.x + Math.cos(a2) * (RIM_R * .78), h.y + Math.sin(a2) * (RIM_R * .78), RIM_Z - 8);
      px.line(g, Math.round(top[0]), Math.round(top[1]), Math.round(bot[0]), Math.round(bot[1]), '#f4f4f4', 1);
      px.line(g, Math.round(top[0]), Math.round(top[1]), Math.round(mid[0]), Math.round(mid[1]), '#d0d0d8', 1);
    }
    ring(0, PI, '#ff5a30');
  });
}

/* ---- players, ball ---- */
const BALLC = { base: '#e8742a', dark: '#a8480e', seam: '#2a1408', hi: '#ffb070' };
function drawBall(r, B) {
  const M = S.match;
  if (B.state === 'tip' || B.state === 'dead' && false) { }
  const gold = B.gold || (B.owner && B.owner.pu === 'gold') || (B.shot && B.shot.shooter.pu === 'gold');
  const big = S.cheats.big;
  // trail
  if (B.trail.length > 2 && (B.state === 'shot' || B.state === 'pass')) {
    r.queue(B.x, B.y, B.z, g => { B.trail.forEach((t, i) => { const [x, y] = r.w(t[0], t[1], t[2]); px.disc(g, Math.round(x), Math.round(y), 1, i % 2 ? '#ffd8a0' : '#ff9a50'); }); }, { emissive: true });
  }
  r.shadow(B.x, B.y, 4 - Math.min(2, B.z * .02), .4);
  const nova = (B.owner && novaOf(B.owner)) || (B.shot && novaOf(B.shot.shooter));
  r.queue(B.x, B.y + 1, B.z, g => {
    const [x, y] = r.w(B.x, B.y, B.z), X = Math.round(x), Y = Math.round(y - 4), rr = 5;
    px.disc(g, X, Y, rr + 1, '#1a0a02');
    if (nova) { px.disc(g, X, Y, 6, '#ff7a20'); }
    px.disc(g, X, Y, rr, gold ? '#e8b020' : BALLC.dark); px.disc(g, X - 1, Y - 1, rr - 1, gold ? '#ffd23a' : BALLC.base);
    const sp = Math.round(B.roll) % 4; // seams
    px.line(g, X - rr, Y, X + rr, Y, BALLC.seam, 1); px.line(g, X, Y - rr, X, Y + rr, BALLC.seam, 1);
    if (sp & 1) { px.dot(g, X - 2, Y - 2, BALLC.seam); px.dot(g, X + 2, Y + 2, BALLC.seam); } else { px.dot(g, X + 2, Y - 2, BALLC.seam); px.dot(g, X - 2, Y + 2, BALLC.seam); }
    px.dot(g, X - 2, Y - 3, gold ? '#fff6c0' : BALLC.hi);
  });
}
function rigState(p) {
  const st = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, air: p.z > 1.5 };
  const a = p.act;
  if (p.stun > .25) { st.down = clamp((p.stun - .2) * 3, 0, 1) * .0 + (p.stun > .35 ? 1 : .5); st.hurt = true; }
  else if (p.frozen > 0) { st.pose = 'guard'; st.vx = 0; st.vy = 0; }
  else if (a) {
    if (a.type === 'shot') { st.pose = 'cast'; st.air = true; st.expr = 'shout'; }
    else if (a.type === 'dunk') {
      const u = clamp(a.t / a.T, 0, 1); st.air = true; st.expr = 'shout';
      if (u > .5) st.attack = E.move(a.dunk.move, clamp((u - .5) / .5, 0, .99)); else st.pose = 'cast';
    }
    else if (a.type === 'swipe') st.attack = E.move('jab', clamp(a.t / a.dur, 0, .99));
    else if (a.type === 'shove') st.attack = E.move('bash', clamp(a.t / a.dur, 0, .99));
    else if (a.type === 'spin') { st.run = 1; st.air = false; }
    else if (a.type === 'jump') { st.pose = 'cast'; st.air = true; }
    else if (a.type === 'oopwait') { st.run = 1; }
  } else if (p.cheer > 0) { st.pose = 'cheer'; st.expr = 'smile'; }
  else if (p.tauntT > 0) { st.pose = 'hips'; st.expr = 'smile'; }
  if (p.hasBall && !a && !st.pose) st.stance = 'ready';
  if (p.boost) st.sprint = true;
  return st;
}
function drawPlayer(r, p) {
  const M = S.match, view = E.charView(r.view);
  r.shadow(p.x, p.y, 7, .38);
  const nova = novaOf(p), flash = p.frozen > 0 ? '#9ae6ff' : nova ? '#ff6a20' : (p.pu === 'gold' ? '#ffd23a' : null);
  const bigscale = S.cheats.big ? 1.5 : 1;
  r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view), flash ? { flash, flashMix: p.frozen > 0 ? .55 : .22 + .1 * Math.sin(game.time * 14) } : undefined);
  // indicator
  const hud = p.input || S.mode === 'camp';
  r.queue(p.x, p.y + 2, p.z + 64, g => {
    const [x, y] = r.w(p.x, p.y, p.z + 62), X = Math.round(x), Y = Math.round(y);
    if (p.input) {
      const col = E.PLAYER_COLORS[(p.input.player || 1) - 1] || '#ffe08a';
      px.poly(g, [[X - 4, Y - 7], [X + 4, Y - 7], [X, Y - 1]], col);
      E.font.text(g, 'P' + (p.input.player || 1), X, Y - 16, col, { align: 'center', font: 'tiny', outline: '#000' });
      E.ui.bar(g, X - 9, Y - 9, 18, 3, p.turbo, p.turbo < .2 ? '#ff4a3a' : '#5ae0ff');
    } else if (!p.input && S.dev.overlay) {
      E.font.text(g, p.name, X, Y - 10, '#ffffff', { align: 'center', font: 'tiny', outline: '#000' });
    }
    if (p.hasBall && !p.input) px.rect(g, X - 1, Y - 3, 3, 3, '#ffb060');
    if (p.act && p.act.type === 'shot' && !p.act.released) {   // the release meter: fills toward the top of the jump; green is the perfect window
      const s = Math.abs(p.vz) / p.act.V, fill = clamp(1 - s, 0, 1), good = s < .2;
      px.rect(g, X + 11, Y - 12, 4, 18, '#10101a'); px.rect(g, X + 12, Y - 11, 2, 3, '#2a8a3a'); px.rect(g, X + 12, Y + 5 - Math.round(fill * 16), 2, Math.round(fill * 16), good ? '#5aff6a' : '#ffd36a');
    }
  }, { emissive: true });
  if (nova) {
    try { if (Math.random() < .5) P.fire(p.x - Math.cos(p.facing) * 4, p.y, p.z + 20 + Math.random() * 30, 1); } catch (e) { }
  }
  if (p.pu === 'rocket' && Math.random() < .4) try { P.sparks(p.x, p.y, p.z + 2, 1, null, { color: '#ff9a30' }); } catch (e) { }
  if (p.boost && p.z <= 0 && Math.random() < .25) try { P.dust(p.x, p.y, 0, 1); } catch (e) { }
}
function drawPowerups(r) {
  for (const u of S.powerups) {
    const d = POWERUPS.find(q => q.id === u.id), bob = Math.sin(u.t * 4) * 3 + 12;
    r.shadow(u.x, u.y, 6, .3);
    r.queue(u.x, u.y, bob, g => {
      const [x, y] = r.w(u.x, u.y, bob), X = Math.round(x), Y = Math.round(y);
      px.disc(g, X, Y, 8, '#10101a'); px.disc(g, X, Y, 7, d.color); px.disc(g, X - 1, Y - 1, 5, '#ffffffaa'.slice(0, 7));
      px.disc(g, X, Y, 4, d.color);
      E.font.text(g, d.id === 'rocket' ? 'R' : d.id === 'gold' ? '$' : d.id === 'giant' ? 'G' : 'I', X, Y - 3, '#10101a', { align: 'center', font: 'tiny', outline: false });
    }, { emissive: true });
  }
}
function drawTwists(r) {
  const kind = courtDef().twist;
  if (kind === 'jackpot') {
    const sp = S.twist.spot, pulse = .6 + .4 * Math.sin(game.time * 5);
    r.decal && r.decal(g => { r.groundDisc && r.groundDisc(sp.x, sp.y, 26, '#ffd23a', .35 + .2 * pulse); r.groundRing && r.groundRing(sp.x, sp.y, 26, '#fff2a0'); });
    r.queue(sp.x, sp.y, 0, g => { const [x, y] = r.w(sp.x, sp.y, 0); E.font.text(g, '+2', Math.round(x), Math.round(y) - 3, '#fff2a0', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true, bias: -50 });
  }
  if (kind === 'puddle') for (const q of S.twist.puddles) r.decal && r.decal(g => { r.groundDisc && r.groundDisc(q.x, q.y, q.r, '#6aa8d8', .45); r.groundRing && r.groundRing(q.x, q.y, q.r, '#b0d8f0'); });
  if (kind === 'wind') {
    const w = S.twist.wind, y = COURT.y0 - 4;
    for (const fx of [COURT.x0 + 40, COURT.cx, COURT.x1 - 40]) r.queue(fx, y, 70, g => {
      const [x, yy] = r.w(fx, y, 0), [, top] = r.w(fx, y, 62);
      px.line(g, Math.round(x), Math.round(yy), Math.round(x), Math.round(top), '#c8c8d0', 1);
      for (let i = 0; i < 4; i++) px.rect(g, Math.round(x + 1 + i * 3 * Math.sign(w || 1)), Math.round(top) + i, 3, 2, i % 2 ? '#ff5a3a' : '#ffffff');
    });
  }
}

/* ---- the camera ---- */
function cameraStep(dt) {
  const M = S.match, B = S.ball; if (!M) return;
  let tx = B.x, ty = COURT.cy + 4;
  const dir = M.possession === 0 ? 1 : -1;
  if (B.owner) tx = B.owner.x + dir * 40; else tx = B.x;
  if (M.phase === 'tip') tx = COURT.cx;
  const xs = S.players.map(p => p.x); const span = Math.max(...xs) - Math.min(...xs);
  let zoom = clamp((game.W || 427) / (span + 160), .72, 1.1);
  if (game.baseView && game.baseView.pitch > 40) zoom = Math.min(zoom, .86);
  S.camera.zoom = approach(S.camera.zoom, zoom, dt * .6);
  let punch = 1;
  if (S.fx.cam > 0) { S.fx.cam -= dt; punch = 1 + .2 * clamp(S.fx.cam, 0, 1); tx = lerp(tx, S.fx.camX, .6); }
  const zz = S.camera.zoom * punch, halfW = (game.W || 427) / 2 / zz;
  tx = clamp(tx, halfW + 2, 768 - halfW - 2);
  S.camera.x = lerp(S.camera.x, tx, 1 - Math.exp(-dt * 5));
  S.camera.x = clamp(S.camera.x, halfW + 2, 768 - halfW - 2);
  game.setZoom(zz);
  game.focus(S.camera.x, ty, 18);
}
function fxStep(dt) {
  S.fx.flash = Math.max(0, S.fx.flash - dt * 1.6); S.fx.shake = Math.max(0, S.fx.shake - dt * 14);
  for (const b of S.fx.banners) b.t += dt; S.fx.banners = S.fx.banners.filter(b => b.t < b.life);
}

/* ---- the whole match scene: draw ---- */
function drawMatch(r) {
  const M = S.match; if (!M) return;
  const cd = courtDef(), map = getCourtMap(S.court);
  getBackdrop(S.court).draw(r);
  map.drawFloor(r); map.queueWalls(r);
  drawTwists(r);
  buildCrowd(S.court);
  const exc = M.excite;
  for (const f of crowdFans) {
    const up = Math.max(0, Math.sin(game.time * (4 + exc * 8) + f.ph)) * (1 + exc * 4) * (exc > .1 ? 1 : .2);
    r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); });
  }
  for (const h of HOOPS) drawHoop(r, h);
  drawPowerups(r);
  for (const p of S.players) drawPlayer(r, p);
  drawBall(r, S.ball);
  r.overlay(g => { drawHud(g, r); drawWorldHover(g, r); });
}
// the mouse over things in the world: a player under the pointer gets a name card with their ratings
function drawWorldHover(g, r) {
  const m = mouseHud(); if (!m || S.dev.open || S.mode === 'attract') return;
  let best = null, bd = 18;
  for (const p of S.players) { const [x, y] = r.w(p.x, p.y, p.z + 28), d = Math.hypot(m[0] - x, m[1] - y); if (d < bd) { bd = d; best = { p, x, y }; } }
  if (!best) return; const p = best.p, w = 92, x = clamp(Math.round(best.x - w / 2), 2, r.W - w - 2), y = clamp(Math.round(best.y - 74), 34, r.H - 60);
  panel(g, x, y, w, 40, { border: p.tdef.color });
  txt(g, p.name + (p.input ? ' P' + (p.input.player || 1) : ''), x + 4, y + 3, '#fff', { font: 'tiny' });
  ['zoom', 'slam', 'deep', 'swipe'].forEach((k, i) => { const cx = x + 4 + (i % 2) * 44, cy = y + 13 + Math.floor(i / 2) * 12; txt(g, RICON[k], cx, cy, '#9a9ac8', { font: 'tiny', outline: false }); ratingPips(g, p.r[k], cx, cy + 6); });
}
