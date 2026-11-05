/* ---- COURT DRAWING (plan §9.3, §9.6): the hoops (the glass as a panel turned 30 degrees toward the camera, the rim as two
 * halves queued at different depths, the net as ten springy strands, the stanchion behind the board), the ball's sprite,
 * the crowd on the stands, and the lights. All world units, projected through r.w(). ---- */
const HOOP_ANG = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => i / 10 * TAU);
const HOOP_STATE = [0, 1].map(() => ({ bend: 0, bendV: 0, knot: HOOP_ANG.map(() => [0, 0, 0]) }));

/** a point on a hoop's ring at angle a (z 80), its front bent down by the spring */
const rimPoint = (side, a) => {
  const rm = RIMW[side], st = HOOP_STATE[side], sinA = Math.sin(a);
  return [rm.x + Math.cos(a) * RIM_R, rm.y + sinA * RIM_R, rm.z - st.bend * Math.max(0, sinA) * .8];
};
/** the hoops' springs (a hit bends the front of the ring; the knots of the net come back to rest) */
const stepHoops = dt => {
  for (const st of HOOP_STATE) {
    st.bendV += (-st.bend * 220 - st.bendV * 10) * dt; st.bend = clamp(st.bend + st.bendV * dt, -4, 4);
    for (const kn of st.knot) { kn[0] -= kn[0] * 30 * dt; kn[1] -= kn[1] * 30 * dt; kn[2] *= Math.exp(-6 * dt); }
  }
};
/** the ball pushes the net: a swish ripples the strand it passes */
const pushHoopNet = (side, x, y, strength) => {
  const rm = RIMW[side], st = HOOP_STATE[side], dx = x - rm.x, dy = y - rm.y;
  if (Math.hypot(dx, dy) > 9.5) return;
  const a = Math.atan2(dy, dx), k = Math.round(((a + TAU) % TAU) / TAU * HOOP_ANG.length) % HOOP_ANG.length, kn = st.knot[k];
  kn[2] -= strength; kn[0] += Math.cos(a) * strength * .4; kn[1] += Math.sin(a) * strength * .4;
};
on('goal', ev => pushHoopNet(ev.rim, ev.x, ev.y, 12));
on('rim', ev => { if (ev.rim !== undefined) HOOP_STATE[ev.rim].bendV += (ev.speed || 80) * .02; });

/** the glass: the point on the board at t (-1 far edge .. 1 near edge) and z, in world units. The board's plane is x = bx;
 * its near edge sits 12 toward the camera's side (x) and 20.8 toward it (y): a panel turned 30 degrees */
const glassPt = (side, t, z) => [BOARD_PLANE[side] + (side ? 12 : -12) * t, RIMW[side].y + 20.8 * t, z];

/** the ring's half from the front (sin > 0) or the back, drawn as a 2-pixel orange line with a light tip */
const drawRimHalf = (r, g, side, front) => {
  let prev = null;
  for (let i = 0; i <= 16; i++) {
    const a = i / 16 * TAU, sinA = Math.sin(a);
    if (front ? sinA < 0 : sinA >= 0) { prev = null; continue; }
    const q = r.w(...rimPoint(side, a));
    if (prev) px.line(g, prev[0], prev[1], q[0], q[1], '#ff7a2a', 2);
    if (front) px.dot(g, q[0], q[1] - 1, '#ffb060');
    prev = q;
  }
};
/** the net strands on one half: from the ring to the lower ring (radius 5.5, z 66), a knot in the middle, pushed by the ball */
const drawHoopNet = (r, g, side, front) => {
  const rm = RIMW[side], st = HOOP_STATE[side];
  HOOP_ANG.forEach((a, k) => {
    if (front ? Math.sin(a) < 0 : Math.sin(a) >= 0) return;
    const top = rimPoint(side, a), bot = [rm.x + Math.cos(a) * 5.5, rm.y + Math.sin(a) * 5.5, 66], kn = st.knot[k];
    const mid = [(top[0] + bot[0]) / 2 + kn[0], (top[1] + bot[1]) / 2 + kn[1], (top[2] + bot[2]) / 2 + kn[2]];
    const p0 = r.w(...top), p1 = r.w(...mid), p2 = r.w(...bot);
    px.line(g, p0[0], p0[1], p1[0], p1[1], '#f4f4f8', 1);
    px.line(g, p1[0], p1[1], p2[0], p2[1], '#f4f4f8', 1);
  });
};

/** a hoop: the stanchion behind the board, the glass (screen blend, a white frame, the shooter's orange square), the rim
 * and the net in back and front halves, so the ball sorts between them (a ball at the ring's centre is between) */
const drawHoop = (r, side) => {
  const rm = RIMW[side], bx = BOARD_PLANE[side], poleX = bx + (side ? 8 : -8);
  r.queue(poleX, rm.y, 0, g => {
    const p0 = r.w(poleX, rm.y, 0), p1 = r.w(poleX, rm.y, 72), a1 = r.w(bx, rm.y, 74);
    px.line(g, p0[0], p0[1], p1[0], p1[1], '#8a8c98', 3);
    px.line(g, p1[0], p1[1], a1[0], a1[1], '#b8bcc8', 2);
  }, { bias: -2 });
  r.queue(bx, rm.y, 86, g => {
    const poly = [glassPt(side, 1, 100), glassPt(side, -1, 100), glassPt(side, -1, 72), glassPt(side, 1, 72)].map(p => r.w(...p));
    px.blend(g, .28, 'screen', () => px.poly(g, poly, '#a8e8ff'));
    for (let i = 0; i < 4; i++) { const a = poly[i], b = poly[(i + 1) % 4]; px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 1); }
    const sq = [glassPt(side, .25, 92), glassPt(side, -.25, 92), glassPt(side, -.25, 82), glassPt(side, .25, 82)].map(p => r.w(...p));
    for (let i = 0; i < 4; i++) { const a = sq[i], b = sq[(i + 1) % 4]; px.line(g, a[0], a[1], b[0], b[1], '#ff7a2a', 1); }
  }, { bias: -1 });
  r.queue(rm.x, rm.y - 6, rm.z, g => { drawRimHalf(r, g, side, false); drawHoopNet(r, g, side, false); }, { bias: -3 });
  r.queue(rm.x, rm.y + 6, rm.z, g => { drawRimHalf(r, g, side, true); drawHoopNet(r, g, side, true); }, { bias: 3 });
};

/* ---- THE BALL'S SPRITE: 9 x 9 with seams, four rotation frames advanced by its roll ---- */
const BALL_SPR = [
  E.sprite(['..kkkkk..', '.kooooook.', 'koooOooook', 'koOoOoooko', 'koooooOoko', 'koOooooOko', 'koooOooook', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' }),
  E.sprite(['..kkkkk..', '.kooooook.', 'kooookoook', 'koOkooooko', 'kookkkOoko', 'koOoookooko', 'kooookoook', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' }),
  E.sprite(['..kkkkk..', '.kooooook.', 'kooOooookk', 'kooOokooko', 'koooookooo', 'kkooOokooo', 'koooooooOo', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' }),
  E.sprite(['..kkkkk..', '.kooooook.', 'koookOooook', 'kooookoOko', 'kkookkoooko', 'koOooooooko', 'koooooooOko', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' })
];
const ballSprite = b => BALL_SPR[Math.floor(b.roll / 6) & 3];

/** the crowd on the stands (plan §9.6): one small figure per stand tile and tier, in the court's colors, bobbing */
const buildCrowd = court => {
  const out = [], R = E.rng(court.id.length * 97 + 5);
  const tiers = [{ row: 0, z: 48 }, { row: 1, z: 48 }, { row: 2, z: 36 }, { row: 3, z: 36 }, { row: 4, z: 24 }, { row: 5, z: 12 }];
  for (const t of tiers) for (let c = 2; c < ARENA_COLS - 2; c += 1) {
    if (R() < .18) continue;
    out.push({ x: c * TILE + 4 + R() * 8, y: t.row * TILE + 9, z: t.z, shirt: court.crowd[(R() * court.crowd.length) | 0], skin: court.skin[(R() * court.skin.length) | 0], ph: R() * 6 });
  }
  return out;
};
const crowdSpr = {};
const crowdSprite = (shirt, skin) => {
  const key = shirt + skin; if (crowdSpr[key]) return crowdSpr[key];
  return (crowdSpr[key] = E.sprite(['.hhh.', 'hhhhh', 'shhhs', '.sss.', 'bbbbb', 'bbbbb', 'b.b.b'], { h: '#2a1a14', s: skin, b: shirt }));
};
/** the crowd: each figure's bob comes from the time and its phase; the home side's misses slump, dunks jump (later) */
const drawCrowd = (r, court) => {
  if (!S.crowd) S.crowd = buildCrowd(court);
  const t = game.time || 0;
  for (const f of S.crowd) {
    const bob = Math.round(Math.sin(t * 3 + f.ph) * 1);
    r.sprite(f.x, f.y, f.z, crowdSprite(f.shirt, f.skin), { anchor: 'bottom' });
  }
};

/** the whole court in one draw: the sky, the floor, the stands and walls, the hoops, the crowd, the players and the ball */
const drawCourt = (r, court) => {
  r.sky(court.sky);
  S.map.drawFloor(r);
  S.map.queueWalls(r);
  drawHoop(r, 0); drawHoop(r, 1);
  drawCrowd(r, court);
  for (const p of S.players) {
    if (!p.onCourt) continue;
    r.shadow(p.body.x, p.body.y, 7, .5, '#0c0818', 0);
    r.actor(p.body.x, p.body.y, p.body.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view));
  }
  const b = S.ball;
  r.shadow(b.x, b.y, 4.5, .45, '#0c0818', 0);
  r.sprite(b.x, b.y, b.z, ballSprite(b), { anchor: 'center' });
};
