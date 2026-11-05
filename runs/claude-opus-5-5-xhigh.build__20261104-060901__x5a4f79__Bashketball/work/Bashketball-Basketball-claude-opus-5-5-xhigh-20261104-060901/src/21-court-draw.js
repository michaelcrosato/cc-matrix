/* 21-court-draw: the arena as it is drawn and as it moves: the backdrop and each court's silhouettes, the floor and the
 * stands, the crowd (about 260 fans who bob, jump, slump and flash cameras), the props, the hoops (padded stanchion, a
 * glass board cheated 30 degrees toward the camera, a rim in two halves that bends, a net of springs) and the lights. */
const ARENA = { id: null, court: null, map: null, bg: null, crowd: [], hoops: [], t: 0, cheer: 0, slump: 0, flashes: [], bob: 0, gull: null, dog: null, jumbo: null, pyro: 0, erupt: 0, carDrop: 0, rimGlow: [0, 0] };
const CROWD_TIERS = [{ y: 9, z: 30 }, { y: 25, z: 20 }, { y: 41, z: 10 }];
function makeHoop(i) {
  const rim = RIMS[i], strands = [];
  for (let s = 0; s < 10; s++) {
    const a = (s + .5) / 10 * TAU, nodes = [];
    for (const [rr, z] of [[7.8, 75], [6.6, 70.5], [5.5, 66]]) nodes.push({ rx: Math.cos(a) * rr, ry: Math.sin(a) * rr, rz: z, ox: 0, oy: 0, oz: 0, vx: 0, vy: 0, vz: 0 });
    strands.push({ a, nodes });
  }
  return { i, rim, strands, bend: 0, bendV: 0, glass: true, shards: [], swish: 0, perch: i === 0 };
}
/** the Blam Dome's jumbotron: the score, the last scorer live, BLAM! after a basket, OVERCLOCK in red, the Commissioner in the story */
function jumbotron(g, x, y, w, h) {
  const M = S.match, t = ARENA.t;
  if (!M) { drawPortrait(g, 'gigawatt', x + w / 2 - 13, y + 2, 26, { frame: false, expr: 'smile' }); return; }
  if (TWIST.overclocked > 0 && Math.floor(t * 3) % 2) { px.rect(g, x, y, w, h, '#3a0808'); E.font.text(g, 'OVERCLOCK', x + w / 2, y + h / 2 - 4, '#ff4a3a', { align: 'center', outline: false }); return; }
  const last = M.lastScorer, recent = last && M.gameT - M.lastScoreT < 3;
  if (recent) { drawPortrait(g, last.def.id, x + 2, y + 2, h - 4, { frame: false, expr: 'shout' }); E.font.title(g, 'BLAM!', x + w / 2 + 12, y + 4, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk }); E.font.text(g, M.score[0] + '-' + M.score[1], x + w / 2 + 12, y + h - 10, '#fff', { align: 'center', outline: false }); return; }
  const T0 = get('team', S.teams[0].id), T1 = get('team', S.teams[1].id);
  px.sprite(g, LOGOS[T0.logo].spr, x + 4, y + 3); px.sprite(g, LOGOS[T1.logo].spr, x + w - 16, y + 3);
  E.font.text(g, String(M.score[0]), x + 22, y + 4, '#fff', { outline: false }); E.font.text(g, String(M.score[1]), x + w - 22, y + 4, '#fff', { align: 'right', outline: false });
  E.font.text(g, mmss(Math.ceil(M.clock)), x + w / 2, y + h - 11, UIC.gold, { align: 'center', outline: false });
}
/** set the arena up for a court: its map, backdrop, crowd, hoops and weather */
function setupArena(id) {
  const court = get('court', id);
  ARENA.id = id; ARENA.court = court; ARENA.map = courtMap(id); ARENA.bg = new E.Backdrop(court.backdrop);
  ARENA.crowd = []; ARENA.flashes = []; ARENA.cheer = 0; ARENA.slump = 0;
  const h = (a, b) => E.hash2(a * 13 + 7, b * 29 + 3);
  CROWD_TIERS.forEach((tier, row) => {
    for (let c = 2; c <= 45; c++) for (const dx of [4, 12]) {
      const k = h(c * 2 + dx, row + id.length), empty = k > .93;
      if (empty) continue;
      ARENA.crowd.push({ x: c * 16 + dx, y: tier.y, z: tier.z, row, shirt: court.crowd[Math.floor(k * 97) % court.crowd.length], skin: court.skins[Math.floor(k * 53) % court.skins.length],
        ph: k * 9, hat: k > .8, sign: k < .03, home: k < .6, jump: 0 });
    }
  });
  ARENA.hoops = [makeHoop(0), makeHoop(1)];
  ARENA.gull = court.wind ? { x: BOARD_X[0], y: CMY, z: 102, vx: 0, vz: 0, flying: false, t: 0, blob: new E.Blob({ R: 3, wings: true, colors: { dk: '#8a8a92', base: '#f4f4f0', lt: '#ffffff', spec: '#ffffff', eye: '#141414', pupil: '#141414' } }) } : null;
  ARENA.dog = court.dog ? { x: 742, y: 330, bark: 0, blob: new E.Blob({ R: 5, ears: 'cat', tail: true, feet: true, colors: { dk: '#5a3a1a', base: '#8a5a2a', lt: '#b07a40', spec: '#ffffff', eye: '#141414', pupil: '#141414' } }) } : null;
  game.weather = court.weather ? Object.assign({}, court.weather) : null;
  ARENA.jumbo = id === 'dome' ? jumbotron : null;
  ARENA.bot = ARENA.bot || new E.Blob({ R: 5, feet: true, colors: { dk: '#4a5262', base: '#9aa6b8', lt: '#d8e0ea', spec: '#ffffff', eye: '#3ad8ff', pupil: '#0a2a3a' } });
}
/** the arena's own motion, every step: net and rim springs, the crowd's mood, the gull, the dog */
function updateArena(dt, wind = 0) {
  ARENA.t += dt; ARENA.cheer = Math.max(0, ARENA.cheer - dt * .45); ARENA.slump = Math.max(0, ARENA.slump - dt * .5); ARENA.bob = Math.max(0, ARENA.bob - dt * .2);
  for (const f of ARENA.flashes) f.t -= dt; E.prune(ARENA.flashes, f => f.t <= 0);
  const b = S.ball;
  for (const H of ARENA.hoops) {
    H.bendV += (-260 * H.bend - 12 * H.bendV) * dt; H.bend += H.bendV * dt; H.swish = Math.max(0, H.swish - dt);
    for (const st of H.strands) for (let k = 0; k < st.nodes.length; k++) {
      const n = st.nodes[k], stiff = 140 - k * 20;
      n.vx += (-stiff * n.ox - 6 * n.vx + wind * 18 * (k + 1)) * dt; n.vy += (-stiff * n.oy - 6 * n.vy) * dt; n.vz += (-stiff * n.oz - 6 * n.vz) * dt;
      if (b) {   // the ball pushes the knots it passes through
        const nx = H.rim.x + n.rx + n.ox, ny = H.rim.y + n.ry + n.oy, nz = n.rz + n.oz, dx = nx - b.x, dy = ny - b.y, dz = nz - b.z, d = Math.hypot(dx, dy, dz);
        if (d < BALL_R + 1.2 && d > .01) { const push = (BALL_R + 1.2 - d); n.ox += dx / d * push * .6; n.oy += dy / d * push * .6; n.oz += dz / d * push * .3; n.vx += dx / d * 40; n.vy += dy / d * 40; n.vz += (b.vz || 0) * .15; }
      }
      n.ox += n.vx * dt; n.oy += n.vy * dt; n.oz += n.vz * dt;
    }
  }
  for (const f of ARENA.crowd) f.jump = Math.max(0, f.jump - dt);
  // a Supernova lights the rim its team attacks
  if (S.players && S.players.length) for (let i = 0; i < 2; i++) ARENA.rimGlow[i] = S.players.some(p => p.isNova() && RIMS.indexOf(attackRim(p.team)) === i) ? 1 : 0;
  const G = ARENA.gull;
  if (G) {
    G.t += dt;
    if (G.flying) { G.x += G.vx * dt; G.z += G.vz * dt; G.vz = approach(G.vz, 30, dt * 40); if (G.z > 260 || G.x < -100 || G.x > 900) { G.flying = false; G.t = 0; G.x = BOARD_X[0]; G.z = 102; G.vx = 0; } }
    G.blob.update(dt, { flap: G.flying ? 1 : 0, look: [G.vx >= 0 ? 1 : -1, 0], squash: 0 });
  }
  if (ARENA.dog) { ARENA.dog.bark = Math.max(0, ARENA.dog.bark - dt); ARENA.dog.blob.update(dt, { squash: ARENA.dog.bark > 0 ? Math.sin(ARENA.t * 30) * .2 : 0, look: [-1, .3], walk: 0 }); }
}
/** a crowd reaction: 'cheer' (dunks, shatters), 'slump' (a home miss), 'flash' (cameras) */
function crowdReact(kind, k = 1) {
  if (kind === 'cheer') { ARENA.cheer = Math.min(1.6, ARENA.cheer + k); for (const f of ARENA.crowd) if (S.fx() < .6 * k) f.jump = .4 + S.fx() * .5; }
  if (kind === 'slump') ARENA.slump = Math.min(1, ARENA.slump + k);
  if (kind === 'flash') for (let i = 0; i < 14 * k; i++) { const f = pickF(ARENA.crowd); if (f) ARENA.flashes.push({ x: f.x + fxr(-3, 3), y: f.y, z: f.z + 8, t: .15 + S.fx() * .25 }); }
  if (ARENA.dog && kind === 'cheer') { ARENA.dog.bark = .8; sfx('bark'); }
}
function hoopHit(i, power) { const H = ARENA.hoops[i]; if (!H) return; H.bendV -= 60 * power; const G = ARENA.gull; if (G && i === 0 && !G.flying) { G.flying = true; G.vx = -60; G.vz = 60; sfx('gull'); } }

/* ---- drawing ---- */
const ppt = (r, x, y, z) => { const p = r.w(x, y, z); return [Math.round(p[0]), Math.round(p[1])]; };
function drawSilhouettes(r) {
  const court = ARENA.court, base = r.w(CMX, 0, 30)[1], t = ARENA.t, cx = r.w(CMX, 0, 0)[0];
  const at = (wx, par) => Math.round(cx + (wx - CMX) * par);
  const g = r.ctx, dk = E.shade(court.backdrop.sky[0], -.2);
  const S2 = court.silhouettes;
  if (S2 === 'skyline') {
    const wx = at(140, .55), wy = base;   // the water tower
    px.rect(g, wx - 1, wy - 34, 2, 34, dk); px.rect(g, wx + 13, wy - 34, 2, 34, dk); px.rect(g, wx - 3, wy - 50, 20, 17, '#1a1030'); px.poly(g, [[wx - 4, wy - 50], [wx + 7, wy - 58], [wx + 18, wy - 50]], '#1a1030');
    const bx = at(560, .6), on = Math.sin(t * 7) > -.85 || Math.sin(t * 1.3) > .5;   // the BLAM COLA billboard
    px.rect(g, bx - 2, base - 30, 3, 30, dk); px.rect(g, bx + 40, base - 30, 3, 30, dk); E.ui.box(g, bx - 6, base - 52, 54, 22, { bg: '#1a0c26', border: on ? '#ff3ca6' : '#4a1a3a', gradient: false });
    if (on) { E.font.text(g, 'BLAM', bx + 21, base - 49, '#ff3ca6', { align: 'center', outline: false }); E.font.text(g, 'COLA', bx + 21, base - 40, '#2de2ff', { align: 'center', outline: false }); }
    const hx = Math.round(((t * 22) % 900) - 120 + cx - r.W), hy = base - 70;   // the helicopter and its searchlight
    px.rect(g, hx, hy, 12, 5, '#0a0814'); px.rect(g, hx + 12, hy + 1, 10, 2, '#0a0814'); px.line(g, hx - 6, hy - 2, hx + 18, hy - 2, '#2a2440'); px.dot(g, hx + 2, hy + 5, Math.floor(t * 4) % 2 ? '#ff2a2a' : '#0a0814');
    px.blend(g, .18, 'add', () => px.poly(g, [[hx + 4, hy + 5], [hx - 30, base + 40], [hx + 40, base + 40]], '#fff8d0'));
  } else if (S2 === 'boardwalk') {
    const fx = at(620, .5), fy = base - 34, R = 30;   // the Ferris wheel
    for (let k = 0; k < 8; k++) { const a = t * .2 + k / 8 * TAU; px.line(g, fx, fy, fx + Math.cos(a) * R, fy + Math.sin(a) * R, '#4a2a4a'); px.rect(g, fx + Math.cos(a) * R - 2, fy + Math.sin(a) * R, 4, 4, ['#ff7ab0', '#ffd23a', '#2ad8c8'][k % 3]); }
    px.line(g, fx, fy, fx - 14, base, '#3a1a3a', 2); px.line(g, fx, fy, fx + 14, base, '#3a1a3a', 2);
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; px.dot(g, fx + Math.cos(a) * R, fy + Math.sin(a) * R, Math.floor(t * 6 + k) % 3 ? '#ffd27a' : '#ffffff'); }
    const lx = at(110, .45); px.poly(g, [[lx - 6, base], [lx - 3, base - 44], [lx + 3, base - 44], [lx + 6, base]], '#e8e0d8'); px.rect(g, lx - 3, base - 30, 6, 4, '#d02a2a'); px.rect(g, lx - 4, base - 50, 8, 6, '#3a2a3a'); px.blend(g, .3, 'add', () => { const a = t * 1.5; px.poly(g, [[lx, base - 47], [lx + Math.cos(a) * 90, base - 47 + Math.sin(a) * 10 - 6], [lx + Math.cos(a) * 90, base - 47 + Math.sin(a) * 10 + 6]], '#fff0a0'); });
    const cx0 = at(330, .5);   // the coaster: a hill of track and a car that loops every 12 s
    const track = u => [cx0 - 60 + u * 120, base - 8 - Math.max(0, Math.sin(u * PI * 2)) * 26 - Math.sin(u * PI) * 8];
    for (let u = 0; u < 1; u += .02) { const p = track(u), q = track(u + .02); px.line(g, p[0], p[1], q[0], q[1], '#5a2a3a'); if (Math.round(u * 50) % 5 === 0) px.line(g, p[0], p[1], p[0], base, '#3a1a2a'); }
    const cp = track((t / 12) % 1); px.rect(g, cp[0] - 3, cp[1] - 4, 7, 4, '#ffd23a');
  } else if (S2 === 'junkyard') {
    const kx = at(200, .5), sw = Math.sin(t * .8) * 14;   // the crane and its swinging magnet
    px.line(g, kx, base, kx, base - 60, '#2a1a1a', 3); px.line(g, kx - 10, base - 58, kx + 70, base - 64, '#2a1a1a', 2);
    px.line(g, kx + 60, base - 63, kx + 60 + sw, base - 30, '#1a1414'); px.rect(g, kx + 54 + sw, base - 30, 12, 4, '#3a3434');
    if (ARENA.carDrop > 0) { const k = 1 - ARENA.carDrop; px.rect(g, kx + 52 + sw, base - 26 + k * 40, 16, 7, '#6a3a2a'); }
    for (const [x0, n] of [[440, 3], [560, 4], [640, 2]]) { const xx = at(x0, .55); for (let k = 0; k < n; k++) px.rect(g, xx - 14 + (k % 2) * 3, base - 8 - k * 8, 28, 8, ['#5a3a2a', '#3a4a5a', '#5a5a3a', '#4a2a2a'][k % 4]); }
  } else if (S2 === 'volcano') {
    const vx = at(CMX, .3), top = base - 40, glow = .5 + .5 * Math.sin(t * 2);   // the crater glows and smokes
    px.blend(g, .4 + .2 * glow, 'add', () => px.disc(g, vx, top, 16, '#ff5a1a'));
    px.poly(g, [[vx - 90, base], [vx - 14, top], [vx + 14, top], [vx + 90, base]], '#1a0a0c'); px.rect(g, vx - 12, top, 24, 3, '#ff7a2a');
    for (let k = 0; k < 6; k++) { const u = ((t * .15 + k / 6) % 1); px.blend(g, .35 * (1 - u), 'normal', () => px.disc(g, vx + Math.sin(k * 3 + t) * 10 * u, top - u * 60, 4 + u * 10, '#3a2a2a')); }
    if (ARENA.erupt > 0) px.blend(g, .5, 'add', () => px.poly(g, [[vx - 10, top], [vx, top - 70], [vx + 10, top]], '#ffb030'));
  } else if (S2 === 'arena') {
    // the bowl: rafters, the upper deck's crowd, banners, the jumbotron, laser sweeps
    px.rect(g, 0, 0, r.W, base + 2, '#0a0812');
    for (let k = 0; k < 6; k++) { const y = base - 6 - k * 9; px.rect(g, 0, y, r.W, 1, '#1a1428'); for (let x = (k * 7) % 6; x < r.W; x += 6) { const c = court.crowd[(x * 7 + k * 3) % court.crowd.length]; if (E.hash2(x, k) > .25) { const j = ARENA.cheer > .3 && E.hash2(x, k + 9) > .5 ? -Math.abs(Math.sin(t * 9 + x)) * 2 : 0; px.rect(g, x, y - 4 + j, 3, 3, E.shade(c, -.35)); px.dot(g, x + 1, y - 5 + j, '#6a5048'); } } }
    for (let k = 0; k < 6; k++) { const bx = at(150 + k * 95, .7); px.rect(g, bx, 0, 12, 22, [STREET_TEAMS.map(s => get('team', s).colors.jersey)][0][k % 4]); px.poly(g, [[bx, 22], [bx + 6, 27], [bx + 12, 22]], '#ffd23a'); }
    const jx = at(CMX, .85), jy = Math.max(2, base - 64);
    E.ui.box(g, jx - 40, jy, 80, 34, { bg: '#0a0a14', border: '#5a5a6a', gradient: false });
    if (ARENA.jumbo) ARENA.jumbo(g, jx - 38, jy + 2, 76, 30);
    px.blend(g, .22, 'add', () => { for (let k = 0; k < 4; k++) { const a = Math.sin(t * .7 + k * 1.7) * .9; px.line(g, at(120 + k * 170, .9), 0, at(120 + k * 170, .9) + Math.sin(a) * 200, base + 60, ['#ff3a3a', '#3a8aff', '#3aff8a', '#ffd23a'][k], 1); } });
  }
}
function drawCrowd(r) {
  const t = ARENA.t, cheer = Math.min(1, ARENA.cheer), slump = ARENA.slump, beat = ARENA.bob;
  for (let row = 0; row < 3; row++) {
    const y = CROWD_TIERS[row].y;
    r.queue(CMX, y, CROWD_TIERS[row].z, g => {
      for (const f of ARENA.crowd) {
        if (f.row !== row) continue;
        const up = f.jump > 0 ? Math.sin((1 - f.jump) * PI * 2.2) * 5 : 0, bob = Math.sin(t * (2 + beat * 6) + f.ph) * (.6 + beat * 1.4) - slump * 1.5;
        const [x, yy] = ppt(r, f.x, f.y, f.z + Math.max(0, up) + bob);
        if (x < -6 || x > r.W + 6) continue;
        px.rect(g, x - 2, yy - 6, 5, 6, f.shirt); px.rect(g, x - 2, yy - 6, 5, 1, E.shade(f.shirt, .25));
        px.rect(g, x - 1, yy - 9, 3, 3, f.skin); if (f.hat) px.rect(g, x - 1, yy - 10, 3, 1, f.shirt);
        if (f.jump > 0 || cheer > .6) { px.line(g, x - 3, yy - 6, x - 4, yy - 11, f.skin); px.line(g, x + 3, yy - 6, x + 4, yy - 11, f.skin); }
        if (f.sign) { px.rect(g, x - 4, yy - 16, 9, 5, '#f4f0e0'); px.rect(g, x - 3, yy - 15, 7, 1, '#d02a2a'); px.rect(g, x - 3, yy - 13, 5, 1, '#2a2a8a'); }
      }
    });
  }
  if (ARENA.flashes.length) r.queue(CMX, 40, 30, g => { for (const f of ARENA.flashes) { const [x, y] = ppt(r, f.x, f.y, f.z); px.rect(g, x - 1, y, 3, 1, '#ffffff'); px.rect(g, x, y - 1, 1, 3, '#ffffff'); if (f.t > .25) px.blend(g, .35, 'add', () => px.disc(g, x, y, 2, '#fff8d0')); } }, { emissive: true });
}
/** a hoop: stanchion, glass, the rim's back half, the net's back strands (queued behind the ball), then the front ones */
function drawHoop(r, H) {
  const rim = H.rim, side = rim.side, bx = BOARD_X[H.i], team = S.teams && S.teams[H.i === 1 ? 1 : 0], pad = team ? get('team', team.id).colors.jersey : '#3a3a4a';
  const baseX = side < 0 ? OX - 30 : OX + CW + 30;
  r.queue(baseX, CMY - 2, 0, g => {   // the stanchion: a padded base, a pole and an arm to the board
    r.box(g, baseX - 13, CMY - 10, 0, baseX + 13, CMY + 10, 24, E.shade(pad, .15), E.shade(pad, -.25));
    const top = ppt(r, baseX, CMY, 112), arm = ppt(r, bx - side * 2, CMY, 96), mid = ppt(r, baseX, CMY, 24);
    px.line(g, mid[0], mid[1], top[0], top[1], '#3a3e4a', 4); px.line(g, mid[0] - 1, mid[1], top[0] - 1, top[1], '#6a7080', 1);
    px.line(g, top[0], top[1], arm[0], arm[1], '#3a3e4a', 3); const a2 = ppt(r, bx - side * 2, CMY, 80); px.line(g, mid[0], mid[1] - 30, a2[0], a2[1], '#30343e', 2);
  }, { bias: -2 });
  const nearX = bx + 15 * side, farX = bx - 15 * side, nearY = CMY + 26, farY = CMY - 26, GZ0 = 69, GZ1 = 104;
  r.queue(bx, CMY - 9, GZ0, g => {   // the glass, turned toward the camera so its face shows
    const P = [[farX, farY, GZ0], [farX, farY, GZ1], [nearX, nearY, GZ1], [nearX, nearY, GZ0]].map(p => ppt(r, ...p));
    if (H.glass) {
      px.blend(g, .28, 'screen', () => px.poly(g, P, '#bfe8ff'));
      px.blend(g, .4, 'add', () => { const a = ppt(r, farX + (nearX - farX) * .2, farY + (nearY - farY) * .2, GZ1 - 1), b = ppt(r, farX + (nearX - farX) * .45, farY + (nearY - farY) * .45, GZ0 + 1); px.line(g, a[0], a[1], b[0], b[1], '#ffffff'); });
      for (let k = 0; k < 4; k++) px.line(g, P[k][0], P[k][1], P[(k + 1) % 4][0], P[(k + 1) % 4][1], '#f4f8ff');
      const sq = [[.3, 82], [.3, 92], [.7, 92], [.7, 82]].map(([u, z]) => ppt(r, farX + (nearX - farX) * u, farY + (nearY - farY) * u, z));
      for (let k = 0; k < 4; k++) px.line(g, sq[k][0], sq[k][1], sq[(k + 1) % 4][0], sq[(k + 1) % 4][1], '#ff7a2a');
    } else {
      for (let k = 0; k < 4; k++) { const A2 = P[k], B2 = P[(k + 1) % 4]; for (let u = 0; u < 1; u += .25) { const x = A2[0] + (B2[0] - A2[0]) * u, y = A2[1] + (B2[1] - A2[1]) * u; px.poly(g, [[x, y], [x + 3, y + 1], [x + 1, y + 4]], '#cfeeff'); } px.line(g, A2[0], A2[1], B2[0], B2[1], '#5a6070'); }
    }
  }, { bias: -1 });
  // the rim: 16 points; the front bends down on hits
  const ring = []; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, fy = Math.sin(a), front = Math.max(0, Math.cos(a) * -side) * H.bend; ring.push([rim.x + Math.cos(a) * RIM_R, rim.y + fy * RIM_R, RIM_Z + front * 4]); }
  const rimPart = back => g => {
    const t = E.tones('#ff6a1a');
    for (let k = 0; k < 16; k++) { const a = ring[k], b = ring[(k + 1) % 16], isBack = (a[1] + b[1]) / 2 < rim.y; if (isBack !== back) continue; const p = ppt(r, ...a), q = ppt(r, ...b); px.line(g, p[0], p[1], q[0], q[1], back ? t.sh : t.base, 2); if (!back) px.line(g, p[0], p[1] - 1, q[0], q[1] - 1, t.lt); }
    // the clip to the board
    if (back) { const c0 = ppt(r, rim.x - side * RIM_R, rim.y, RIM_Z), c1 = ppt(r, bx, rim.y, RIM_Z + 1); px.line(g, c0[0], c0[1], c1[0], c1[1], t.sh, 2); }
  };
  const netPart = back => g => {
    const col = '#f4f4f0', dim = '#b8b8c0', N = H.strands, pt = (st, k) => { if (k < 0) { const a = st.a; return ppt(r, rim.x + Math.cos(a) * RIM_R, rim.y + Math.sin(a) * RIM_R, RIM_Z); } const n = st.nodes[k]; return ppt(r, rim.x + n.rx + n.ox, rim.y + n.ry + n.oy, n.rz + n.oz); };
    for (let s = 0; s < N.length; s++) {
      const st = N[s], isBack = Math.sin(st.a) < 0; if (isBack !== back) continue;
      for (let k = -1; k < 2; k++) { const p = pt(st, k), q = pt(st, k + 1); px.line(g, p[0], p[1], q[0], q[1], back ? dim : col); }
      const nx = N[(s + 1) % N.length];
      for (let k = 0; k < 3; k++) { const p = pt(st, k), q = pt(nx, Math.max(0, k - (k % 2 ? 0 : 0))); px.line(g, p[0], p[1], q[0], q[1], back ? dim : col); }
    }
  };
  r.queue(rim.x, rim.y - 6, RIM_Z, g => { netPart(true)(g); rimPart(true)(g); });
  r.queue(rim.x, rim.y + 6, RIM_Z, g => { netPart(false)(g); rimPart(false)(g); });
  if (ARENA.rimGlow && ARENA.rimGlow[H.i]) r.queue(rim.x, rim.y + 6.5, RIM_Z, g => { const c = ppt(r, rim.x, rim.y, RIM_Z); px.blend(g, .45, 'add', () => px.ell(g, c[0], c[1], 13, 5, '#ffb030')); }, { emissive: true });
}
function drawProps(r) {
  for (const [name, x, y, o] of ARENA.court.props) {
    if (name.startsWith('shape:')) r.shape(name.slice(6), x, y, 0, Object.assign({ scale: 1.8, facing: PI / 2, light: true }, o || {}, o && o.color ? { mats: { b: { color: o.color, pattern: 'metal' }, c: { color: o.color, pattern: 'metal' } } } : {}));
    else r.prop(name, x, y, 0, Object.assign({ size: 1.4 }, o || {}));
  }
  const G = ARENA.gull; if (G) r.actor(G.x, G.y, G.z, (g, ox, oy) => G.blob.draw(g, ox, oy, r.view));
  // the cleaning bot rolls out during a sponsor break and fits new glass
  const M = S.match;
  if (M && M.phase === 'sponsor' && M.sponsorPending && ARENA.bot) {
    const i = M.sponsorPending.rim, side = RIMS[i].side, k = clamp(M.phaseT / 1.6, 0, 1), back = clamp((M.phaseT - 3) / 1.1, 0, 1), bx = BOARD_X[i] + side * 60 * (1 - k + back), by = CMY + 34;
    ARENA.bot.update(1 / 60, { walk: k < 1 || back > 0 ? 1 : 0, squash: Math.sin(ARENA.t * 20) * .05, look: [-side, 0] });
    r.actor(bx, by, 0, (g, ox, oy) => ARENA.bot.draw(g, ox, oy, r.view));
    if (k >= 1 && back <= 0) { const [x0, y0] = r.w(bx, by, 10), [x1, y1] = r.w(BOARD_X[i], CMY, 86); r.queue(bx, by, 10, g => { px.line(g, x0, y0, x1, y1, '#9aa6b8', 1); if (Math.floor(ARENA.t * 10) % 2) px.dot(g, x1, y1, '#fff8b0'); }, { emissive: true }); if (S.fx() < .2) P.sparks(BOARD_X[i], CMY, 86, 1, null, { color: '#fff8b0' }); }
  }
  const D = ARENA.dog; if (D) r.actor(D.x, D.y, 0, (g, ox, oy) => D.blob.draw(g, ox, oy, r.view));
}
function arenaLights(r) {
  const court = ARENA.court, Lg = game.lights;
  Lg.enabled = true; Lg.ambient = court.ambient;
  for (const [x, y] of [[OX + 40, OY - 30], [OX + CW - 40, OY - 30], [OX + 40, OY + CH + 30], [OX + CW - 40, OY + CH + 30]]) Lg.add(x, y, 140, 280, .75, { color: court.lightColor });
  Lg.add(CMX, CMY, 160, 260, .5, { color: court.lightColor });
  for (const [col, x, y] of court.glows) Lg.add(x, y, 50, 140, .8, { color: col });
  if (court.spots) for (let k = 0; k < 6; k++) { const a = ARENA.t * .4 + k; Lg.add(CMX + Math.sin(a) * 260, CMY + Math.cos(a * 1.3) * 110, 120, 110, .9, { color: ['#ffffff', '#ffd0a0', '#a0d0ff'][k % 3] }); }
  if (court.id === 'caldera') { for (const x of [OX - 40, OX + CW + 40]) Lg.add(x, CMY, 10, 200, .6 + .15 * Math.sin(ARENA.t * 5), { color: '#ff4a1a' }); }
  if (ARENA.pyro > 0) Lg.add(CMX, CMY, 80, 420, ARENA.pyro, { color: '#ffb050' });
}
/** the whole arena under the players and the ball (they are queued by their own systems) */
function drawArena(r) {
  ARENA.bg.draw(r);
  drawSilhouettes(r);
  ARENA.map.drawFloor(r);
  const south = r.w(0, OY + CH + 48, 0)[1];
  if (south < r.H) {
    if (ARENA.court.id === 'caldera') {   // the lava moat beyond the arena: glowing, bubbling
      const g = r.ctx, y0 = Math.round(south); px.rect(g, 0, y0, r.W + 2, r.H - y0 + 2, '#8a1a0a');
      for (let k = 0; k < 40; k++) { const x = (k * 53 + Math.floor(ARENA.t * 9) * (k % 3)) % (r.W + 2), y = y0 + 3 + (k * 17) % Math.max(4, r.H - y0 - 4); px.rect(g, x, y, 6 + k % 5, 2, k % 2 ? '#ff6a1a' : '#ffb030'); }
      for (let k = 0; k < 6; k++) { const u = (ARENA.t * .7 + k / 6) % 1, x = (k * 97) % (r.W + 2), y = y0 + 6 + (k * 23) % Math.max(4, r.H - y0 - 8); px.disc(g, x, y, 1 + u * 2.5, u > .8 ? '#ffe080' : '#ff8a2a'); }
    } else px.rect(r.ctx, 0, Math.round(south), r.W + 2, r.H - south + 2, E.shade(ARENA.court.floorColors.apron, -.45));
  }
  ARENA.map.queueWalls(r);
  drawCrowd(r); drawProps(r);
  for (const H of ARENA.hoops) drawHoop(r, H);
  arenaLights(r);
}
