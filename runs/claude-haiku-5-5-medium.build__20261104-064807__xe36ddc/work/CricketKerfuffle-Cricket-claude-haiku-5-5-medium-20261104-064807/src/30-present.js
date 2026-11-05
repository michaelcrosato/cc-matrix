/* ---- PRESENTATION: the ground (a TileMap baked from the ground's recipe), the stands and the crowd, the stumps, the
 * players (Humanoid rigs with cricket kit and bats), the ball and its shadow and trail, the umpire, and the glyph prompts.
 * It reads the match and never changes it. ---- */
G.buildMap = (ground) => {
  // the map: 72 x 72 cells of 16 units. Grass inside the boundary, the pitch down the middle, the surround outside
  const N = 72, rows = [];
  const bs = ground.boundary * G.T('boundaryScale');
  for (let cy = 0; cy < N; cy++) {
    let s = '';
    for (let cx = 0; cx < N; cx++) {
      const x = cx * 16 + 8, y = cy * 16 + 8;
      const ex = (x - G.W.PX) / (G.W.RX * bs), ey = (y - G.W.CY) / (G.W.RY * bs);
      const onPitch = Math.abs(x - G.W.PX) <= 26 && y >= G.W.SY - 8 && y <= G.W.BY + 8;
      s += onPitch ? 'p' : ex * ex + ey * ey <= 1.06 ? '.' : 'o';
    }
    rows.push(s);
  }
  return rows;
};
G.floorTexFor = ground => (x, y, tag) => {
  const n = E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - 0.5, m = E.noise2(x * 0.05, y * 0.05) * 0.5;
  if (tag === 'out') { const v = 150 + n * 14; return [v * 0.9, v * 0.85, v * 0.78]; }   // the surround: pavement and stone
  const bs = ground.boundary * G.T('boundaryScale');
  if (tag === 'pitch') {
    // the pitch and its creases (1-unit white lines), worn at the ends
    const wear = Math.abs(y - G.W.SY) < 40 || Math.abs(y - G.W.BY) < 40 ? 0.9 : 1;
    const cr = (Math.abs(y - G.W.BAT_CREASE) < 1 || Math.abs(y - G.W.BOWL_CREASE) < 1) && Math.abs(x - G.W.PX) < 24;
    const ret = (Math.abs(x - (G.W.PX - 21)) < 1 || Math.abs(x - (G.W.PX + 21)) < 1) && Math.abs(y - G.W.SY) < 20;
    if (cr || ret) return [236, 236, 228];
    const v = (ground.pitch === '#c9b98a' ? [201, 185, 138] : [212, 196, 154]);
    return v.map(c => c * wear * (0.96 + n * 0.08 + m * 0.06));
  }
  // grass: mown stripes 32 units wide, and the rope where the boundary is
  const ex = (x - G.W.PX) / (G.W.RX * bs), ey = (y - G.W.CY) / (G.W.RY * bs);
  const rr = Math.sqrt(ex * ex + ey * ey);
  if (rr > 0.985 && rr < 1.0) return [240, 240, 236];
  const stripe = Math.floor(x / 32) % 2 ? 1 : 0;
  const g = ground.grass, d = ground.grassDark;
  const c = stripe ? g : d;
  const hx = parseInt(c.slice(1, 3), 16), hy = parseInt(c.slice(3, 5), 16), hz = parseInt(c.slice(5, 7), 16);
  const k = 0.94 + n * 0.12 + m * 0.1;
  return [hx * k, hy * k, hz * k];
};
G.makeWorld = () => {
  const ground = G.match ? G.match.ground : G.GROUNDS.green;
  G.mapGround = ground;
  G.map = new E.TileMap({ rows: G.buildMap(ground), legend: { '.': { floor: 'grass' }, p: { floor: 'pitch' }, o: { floor: 'out' } },
    floorTex: G.floorTexFor(ground), outside: '#8a8478', ao: 0 });
  G.mapOwner = ground.id;
};

/* ---- drawing helpers: all pixel primitives in screen space; the world goes through r.w ---- */
G.box = (g, r, x, y, z, w, d, h, c) => {
  const T = G.tonesOf(c);
  const p = (dx, dy, dz) => r.w(x + dx, y + dy, z + dz);
  const b = p(w / 2, -d / 2, 0), cc = p(w / 2, d / 2, 0), dd = p(-w / 2, d / 2, 0);
  const at = p(-w / 2, -d / 2, h), bt = p(w / 2, -d / 2, h), ct = p(w / 2, d / 2, h), dt = p(-w / 2, d / 2, h);
  px.poly(g, [dd, cc, ct, dt], T.sh);     // front face
  px.poly(g, [cc, b, bt, ct], T.deep);    // right face
  px.poly(g, [at, bt, ct, dt], T.lt);     // top
  px.line(g, dt[0], dt[1], ct[0], ct[1], T.hi, 1);
};
G.tonesOf = hex => {
  if (!G._tones) G._tones = {};
  if (!G._tones[hex]) G._tones[hex] = E.tones(hex);
  return G._tones[hex];
};
G.stick = (g, r, x, y, z0, z1, col) => {
  const a = r.w(x, y, z0), b = r.w(x, y, z1);
  px.line(g, a[0], a[1], b[0], b[1], col, 1);
};
// the stumps at one end: three ash sticks, two bails across the top
G.drawStumps = (r, y) => {
  const split = G.match && G.match.sawnSplit && y === G.W.SY ? 4 : 0;   // Sawn in Half: the outer stumps fly apart
  r.queue(G.W.PX, y, 0, g => {
    for (const dx of [-3, 0, 3]) G.stick(g, r, G.W.PX + dx + (dx ? Math.sign(dx) * split : 0), y, 0, G.W.STUMP_H, '#e8d8a8');
    const a = r.w(G.W.PX - 3, y, G.W.STUMP_H), b = r.w(G.W.PX + 3, y, G.W.STUMP_H);
    px.line(g, a[0], a[1] - 1, b[0], b[1] - 1, '#f4ecc0', 1);
  }, { bias: 0 });
};
// the stands: a pavilion behind the far end, a scoreboard and the sight screen, boundary boards
G.drawScenery = (r, match) => {
  const ground = G.mapGround;
  r.queue(G.W.PX, 150, 0, g => {
    G.box(g, r, G.W.PX, 150, 0, 170, 60, 44, '#e8e0d0');
    G.box(g, r, G.W.PX, 150, 44, 180, 66, 10, '#8a2a2a');
    G.box(g, r, G.W.PX - 84, 150, 0, 22, 20, 80, '#f6f2e6');
  }, { bias: -1, solid: false });
  // the scoreboard hut, with its live numbers drawn on top
  r.queue(G.W.PX + 120, 140, 0, g => {
    G.box(g, r, G.W.PX + 120, 140, 0, 60, 26, 44, '#2f6b3a');
    const p = r.w(G.W.PX + 120, 140, 44);
    if (match && match.I) {
      const I = match.I;
      E.font.text(g, match.battingSide === 0 ? G.TEAMS[match.cfg.teams[0]].id : G.TEAMS[match.cfg.teams[1]].id, p[0] - 22, p[1] - 6, '#ffe08a', { outline: '#0b0814' });
      E.font.text(g, I.runs + '/' + I.wkts, p[0] - 22, p[1] + 3, '#ffffff', { outline: '#0b0814' });
    }
  }, { bias: -1 });
  // the boundary boards: a band round the rope, drawn as ground-level strips
};
G.drawCrowd = (r, match, t) => {
  const bs = G.mapGround.boundary * G.T('boundaryScale');
  const n = 140, cheer = match && match.fire && (match.fire[0] || match.fire[1]) ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (i % 3) * 0.02;
    const rad = 1.10 + (i % 4) * 0.035;
    const x = G.W.PX + Math.cos(a) * G.W.RX * bs * rad, y = G.W.CY + Math.sin(a) * G.W.RY * bs * rad;
    const h = E.hash2(i, 9);
    const col = ['#eef0f6', '#2a5ab8', '#c8502a', '#f0d070', '#7aa0c8', '#3a2a22'][Math.floor(h * 6)];
    const jump = cheer ? Math.abs(Math.sin(t * 6 + i)) * 3 : Math.sin(t * 1.4 + i) * 0.4;
    r.queue(x, y, 0, g => {
      const p = r.w(x, y, 0);
      px.rect(g, p[0] - 2, p[1] - 9 - jump, 4, 6, col);
      px.rect(g, p[0] - 2, p[1] - 3 - jump, 4, 3, '#2a2030');
    }, { bias: -2 });
  }
};
// the cow, and the bees and bells and seagulls as chaos props (drawn when they are on the ground)
G.drawChaos = (r, match) => {
  if (!match || !match.chaos) return;
  if (match.chaos === 'cow') r.sprite(G.W.PX + 170, G.W.CY - 40, 0, G.COW, { anchor: 'bottom' });
};
G.COW = E.sprite(['..........', '.wwwwwwwww.', 'wwbbwwwwwwp', 'wwbbwwwwwwp', 'wwwwwwwwwww', '.wwwwwwwww.', '.wlw...wlw.', '.wlw...wlw.'], { w: '#f4f4f0', b: '#2a2a30', l: '#3a2a22', p: '#f0a0a0' }, 2);

/* ---- players: rigs, cached per player. The kit, the look and the bat ---- */
G.rigOf = (key, side, idx) => {
  G._rigs = G._rigs || {};
  if (G._rigs[key]) return G._rigs[key];
  const team = G.TEAMS[G.match.cfg.teams[side]];
  const look = G.PLAYER_LOOK[idx % G.PLAYER_LOOK.length];
  const hatOpt = look.hat ? (look.hat === 'cap' ? { style: 'cap', color: team.kit.cap } : look.hat === 'helmet' ? { style: 'helmet', color: '#f2ead8' } : look.hat) : null;
  const rig = new E.Humanoid({
    size: 1.1, build: look.build, hair: look.hair, hat: hatOpt, weapon: null, sleeves: 'short',
    colors: Object.assign({ skin: look.skin, hair: look.hairColor, cloth: team.kit.cloth, pants: team.kit.pants, trim: team.kit.trim, belt: team.kit.belt, boot: team.kit.boot, glove: '#f4f4f0' }, {})
  });
  G._rigs[key] = rig;
  return rig;
};
// the stance: the bat grounded across the batter's front (it reads side-on in the broadcast view); the swing sweeps it
G.batAngleNow = () => G.swingPose ? G.swingPose.angle : 0.3;
G.batLiftNow = () => G.swingPose ? G.swingPose.lift : -3;
G.umpireRig = () => G._umpire || (G._umpire = new E.Humanoid({ size: 1.15, build: 'heroic', hair: 'short', hat: { style: 'brim', color: '#f4f4f0' }, weapon: null, outfit: 'coat',
  colors: { skin: '#e0b090', hair: '#8a8a8a', cloth: '#f4f4f0', coat: '#f4f4f0', pants: '#2a2a30', trim: '#22305a', boot: '#1a1a1e' } }));
// a cricket bat in the batter's hand: a willow blade from the hand, the angle of the swing
G.batInto = (g, r, rig, angle, lift, local) => {
  // a willow bat from the right hand: a handle, the blade with its edge line, and the sticker band. local() maps a
  // world point into the figure's own drawing space (an actor draws in its own small buffer)
  const h = rig.hand('R');
  const L = 15;
  const a = local(h[0], h[1], h[2]);
  const b = local(h[0] + Math.cos(angle) * L, h[1] + Math.sin(angle) * L, h[2] + lift);
  const c = local(h[0] + Math.cos(angle) * (L * 0.55), h[1] + Math.sin(angle) * (L * 0.55), h[2] + lift * 0.5);
  px.line(g, a[0], a[1], c[0], c[1], '#4a2f18', 2);
  px.line(g, c[0], c[1], b[0], b[1], '#f0dca8', 4);
  px.line(g, c[0], c[1] + 1, b[0], b[1] + 1, '#b89a60', 1);
  px.dot(g, b[0], b[1], '#ffffff');
};
// the bowler's ball in the hand until release
// the bowler's marker on the pitch, while the human bowls; and the dev toggle's predicted path
G.drawMarker = (r, match) => {
  if (!match || match.phase !== 'setup' || !match.humanBowls() || G.setting('marker') !== 'On') return;
  const mk = G.marker;
  r.queue(mk.x, mk.y, 0, g => {
    const p = r.w(mk.x, mk.y, 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; px.disc(g, p[0] + Math.cos(a) * 4, p[1] + Math.sin(a) * 2, 0.6, '#ffe08a'); }
  }, { bias: -2 });
};
G.drawTrajectory = (r, match) => {
  const b = match.ball;
  if (!G.devFlags.trajectory || !b || match.phase !== 'flight') return;
  const c = G.clone(b);
  for (let k = 0; k < 480; k++) {
    G.stepBall(c, match.env, null);
    if (k % 8) continue;
    const p = r.w(c.x, c.y, c.z);
    r.overlay(g => px.rect(g, p[0], p[1], 1, 1, '#7ad0ff'));
  }
};
G.ballFx = (r, match) => {
  const b = match.ball;
  if (!b || match.phase === 'end') return;
  // Triple Threat: two holograms ride beside the real ball, on other lines (only the real one is simulated)
  if (b.triple && b.phase === 'delivery') {
    for (const dx of [-11, 11]) {
      const hp = r.w(b.x + dx, b.y, b.z);
      r.queue(b.x + dx, b.y, b.z, g => px.blend(g, 0.5, 'normal', () => px.disc(g, hp[0], hp[1], 2, (Math.floor(G.game.time * 20) % 2) ? '#7ad0ff' : '#c8f0ff')), { bias: 3 });
    }
  }
  if (b.vanish && b.phase === 'delivery' && b.age > 0.35 && b.age < 0.62) {
    // the Vanishing Ball: the ball is gone, a puff of smoke marks it, and the shadow is still drawn
    r.shadow(b.x, b.y, 3.5, 0.25, undefined, 0);
    r.queue(b.x, b.y, b.z, g => { const p = r.w(b.x, b.y, b.z); px.disc(g, p[0], p[1], 3 + Math.sin(b.age * 30) * 1, '#8a6aa8'); }, { bias: 3 });
    return;
  }
  if (b.phase === 'held' && match.phase !== 'dead') return;
  const pos = r.w(b.x, b.y, b.z);
  // the shadow: on the ground under the ball
  r.shadow(b.x, b.y, 3.5, b.z > 6 ? 0.25 : 0.45, undefined, 0);
  // the trail
  if (b.trail && b.trail.length > 1) {
    r.queue(b.x, b.y, b.z, g => {
      for (let i = 1; i < b.trail.length; i++) {
        const p = b.trail[i - 1], q = b.trail[i];
        const a = r.w(p.x, p.y, p.z), c = r.w(q.x, q.y, q.z);
        px.line(g, a[0], a[1], c[0], c[1], i > b.trail.length - 4 ? '#ffffff' : '#c8c8d0', 1);
      }
    }, { bias: 2 });
  }
  r.queue(b.x, b.y, b.z, g => {
    const ph = pos;
    const rad = b.speed > 300 ? 2 : 2;
    px.disc(g, ph[0], ph[1], rad + 1, '#2a0808');
    px.disc(g, ph[0], ph[1], rad, b.delivery === 'bouncer' ? '#ffb0a0' : '#c8202a');
    px.dot(g, ph[0] - 1, ph[1] - 1, '#ffffff');
  }, { bias: 3, emissive: true });
};
// the batter, the bowler, the fielders and the umpire: every rig drawn in the scene
G.drawPlayers = (r, match) => {
  const pl = G.playersNow(match);
  for (const p of pl) {
    const rig = G.rigOf(p.key, p.side, p.idx);
    r.shadow(p.x, p.y, 6, 0.35, undefined, 0);
    const w0 = r.w(p.x, p.y, 0);
    r.actor(p.x, p.y, 0, (g, ox, oy) => {
      rig.draw(g, ox, oy, r.view);
      if (p.bat) G.batInto(g, r, rig, G.batAngleNow(), G.batLiftNow(), (x, y, z) => { const w = r.w(x, y, z); return [ox + w[0] - w0[0], oy + w[1] - w0[1]]; });
    }, p.ghost ? { alpha: p.intangible ? 0.25 : 0.6 } : {});
  }
  const u = G.umpireRig();
  r.actor(G.W.PX + 30, G.W.BOWL_CREASE + 24, 0, (g, ox, oy) => u.draw(g, ox, oy, r.view));
};
G.playersNow = match => {
  const out = [];
  if (!match) return out;
  const I = match.I;
  const bat = match.striker, nst = match.nonStriker;
  for (const bt of [bat, nst]) {
    if (!bt || bt.out) continue;
    const isStriker = bt === bat;
    out.push({ key: 'bat' + (isStriker ? 0 : 1), side: match.battingSide, idx: bt.p, x: G.W.PX + (isStriker ? 8 : -8), y: bt.y,
      facing: PI / 2, bat: isStriker, role: 'bat' });
  }
  // the bowler: running in from behind his crease during the run-up, then at the crease
  const D = match.delivery;
  const bowlY = match.phase === 'runup' && D ? G.W.RELEASE_Y + (1 - Math.min(1, D.t / D.dur)) * 120 : G.W.RELEASE_Y + 6;
  out.push({ key: 'bowl', side: match.bowlingSide, idx: I.bowler, x: G.W.PX - 4, y: bowlY, facing: -PI / 2, bowl: true, role: 'bowl' });
  for (const f of match.fielders) {
    if (f.keeper) out.push({ key: 'keeper', side: match.bowlingSide, idx: 3, x: f.x, y: f.y, facing: PI / 2, role: 'keeper' });
    else out.push({ key: 'f' + f.id, side: match.bowlingSide, idx: (f.id * 2 + 1) % 11, x: f.x, y: f.y, facing: Math.atan2(G.W.CY - f.y, G.W.PX - f.x), role: 'field', ghost: !!f.ghost, intangible: !!f.intangible });
  }
  return out;
};
// the rigs take their poses from the simulation each step: the run, the stance, the swing of the batter
G.tickRigs = (dt, match) => {
  if (!match || dt <= 0) return;
  G._prev = G._prev || {};
  G.umpireTick(dt, match);
  for (const p of G.playersNow(match)) {
    const rig = G.rigOf(p.key, p.side, p.idx);
    const prev = G._prev[p.key] || { x: p.x, y: p.y };
    const vx = (p.x - prev.x) / dt, vy = (p.y - prev.y) / dt;
    G._prev[p.key] = { x: p.x, y: p.y };
    let attack = null;
    if (p.role === 'bat' && p.bat && G.swingState) attack = E.move('slash', G.swingState.u, 'active');
    // the bowler's action: the arm comes over in the last third of the run-up and the release
    if (p.role === 'bowl' && match.delivery && match.phase === 'runup' && match.delivery.t > match.delivery.dur - 0.35) attack = E.move('throw', clamp((match.delivery.t - (match.delivery.dur - 0.35)) / 0.35, 0, 1), 'active');
    // a fielder celebrates a catch with both arms up
    if (p.role !== 'bat' && G.celebrate && G.celebrate.key === p.key && G.celebrate.t > 0) attack = E.move('cast', clamp(1 - G.celebrate.t, 0, 1), 'active');
    rig.update(dt, { x: p.x, y: p.y, z: 0, vx, vy, facing: p.facing, attack, stance: p.role === 'bat' ? 'ready' : undefined });
  }
};

/* ---- the glyph prompts: PlayStation shapes (or the Xbox letters) for a controller, keycaps for a keyboard,
 * a mouse button for the mouse. The prompt follows the device used last. ---- */
G.GLYPH = {
  cross: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'],
  circle: ['.ooo.', 'o...o', 'o...o', 'o...o', '.ooo.'],
  square: ['ooooo', 'o...o', 'o...o', 'o...o', 'ooooo'],
  triangle: ['..o..', '.o.o.', 'o...o', 'o...o', 'ooooo'],
  l1: ['LL'], r1: ['RR']
};
G.GLYPH_COL = { cross: '#7aa7ff', circle: '#ff6b6b', square: '#ff8ad8', triangle: '#5fd38a' };
G.XBOX = { shot: ['A', '#5fd38a'], loft: ['B', '#ff6b6b'], block: ['X', '#7aa7ff'], special: ['Y', '#ffd23a'], run: ['RB', '#f4f4f0'], back: ['LB', '#f4f4f0'], charge: ['RT', '#f4f4f0'] };
G.PS = { shot: 'cross', loft: 'square', block: 'circle', special: 'triangle', run: 'r1', back: 'l1', charge: 'r1' };
// the letter an Xbox-style prompt shows for an action (A B X Y, LB, RB, RT)
G.xboxGlyph = action => (G.XBOX[action] || ['?'])[0];
// draws the prompt for an action at (x, y) in screen pixels; returns its width
G.prompt = (g, action, x, y, word, opts = {}) => {
  const dev = game.input.lastDevice;
  let w = 0;
  if (dev === 'gamepad') {
    const xbox = G.setting('buttons') !== 'PlayStation';
    if (xbox) {
      const letter = G.xboxGlyph(action), col = (G.XBOX[action] || [0, '#ffffff'])[1];
      px.disc(g, x + 5, y + 5, 5, '#0b0814');
      px.disc(g, x + 5, y + 5, 4, col);
      E.font.text(g, letter, x + 5 - E.font.width(letter) / 2, y + 2, '#0b0814');
      w = 11;
    } else {
      const k = G.PS[action] || 'cross';
      if (k === 'l1' || k === 'r1') {
        const txt = k === 'l1' ? 'L1' : 'R1';
        px.rect(g, x, y, 12, 9, '#2a2634'); E.font.text(g, txt, x + 1, y + 1, '#f4f4f0', { font: 'tiny' });
        w = 13;
      } else {
        const rows = G.GLYPH[k], col = G.GLYPH_COL[k];
        for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
          const ch = rows[j][i];
          if (ch === 'x' || ch === 'o') px.rect(g, x + i + 1, y + j + 1, 1, 1, col);
        }
        w = 7;
      }
    }
  } else if (dev === 'mouse') {
    const key = action === 'shot' ? 'LMB' : action === 'loft' ? 'RMB' : (game.input.label(action) || '').toUpperCase();
    E.font.text(g, key, x, y, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    w = E.font.width(key, { font: 'tiny' });
  } else {
    const key = game.input.label(action) || '?';
    const kw = E.font.width(key, { font: 'tiny' }) + 4;
    px.rect(g, x, y, kw, 8, '#2a2634'); px.rect(g, x, y + 6, kw, 2, '#0b0814');
    E.font.text(g, key, x + 2, y + 1, '#f4f4f0', { font: 'tiny' });
    w = kw;
  }
  if (word) { E.font.text(g, word, x + w + 3, y + 1, opts.color || '#f4f4f0', { font: 'tiny', outline: '#0b0814' }); w += 4 + E.font.width(word, { font: 'tiny' }); }
  return w;
};
G.promptRow = (g, items, x, y) => {
  let cx = x;
  for (const [a, word] of items) cx += G.prompt(g, a, cx, y, word) + 8;
  return cx - x;
};

/* ---- the Megadome, the sea, the peacock, the fireworks, the sightscreen, the vanishing ball, the Owl-Eye review ---- */
// the sightscreen: a white boarded screen on a scaffold behind the striker, for the bowler to aim at
G.drawSightscreen = r => {
  r.queue(G.W.PX, G.W.SY - 66, 0, g => {
    G.box(g, r, G.W.PX, G.W.SY - 66, 0, 60, 4, 30, '#f4f4f0');
    G.box(g, r, G.W.PX, G.W.SY - 66, 0, 4, 4, 6, '#6a4a2a');
  }, { bias: -1 });
};
// the sea: the boundary's rope moves in as the tide comes in, drawn as a line of surf on the sand
G.drawTide = (r, match) => {
  if (!match || !match.tide) return;
  const bs = G.mapGround.boundary * G.T('boundaryScale');
  const k = 1 - match.tide;
  r.decal(g => {
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * TAU;
      const x = G.W.PX + Math.cos(a) * G.W.RX * bs * k, y = G.W.CY + Math.sin(a) * G.W.RY * bs * k;
      const p = r.w(x, y, 0);
      px.rect(g, p[0], p[1], 2, 2, (i + Math.floor(G.game.time * 4)) % 3 ? '#e8faff' : '#7ad0ff');
    }
  });
};
G.PEACOCK = E.sprite(['...bb...', '..bBb..', '.bBBBb..', 'bBBbBbBb', '.bBBBb..', '..bbb...', '..yyy...', '..y.y...'], { b: '#2a6ab0', B: '#3ad0a0', y: '#e8c040' }, 2);
G.drawPeacock = (r, match) => {
  if (!match || match.chaos !== 'peacock') return;
  r.sprite(G.W.PX + 70, G.W.CY + 60, 0, G.PEACOCK, { anchor: 'bottom' });
};
// the fog banks: a dithered translucency over the outfield, stronger for the fog chaos
G.drawFog = (r, match) => {
  if (!G.mapGround || !G.mapGround.fog) return;
  const a = 0.10 + (match && match.chaos === 'fog' ? 0.12 : 0) + 0.03 * Math.sin(G.game.time * 0.5);
  r.overlay(g => px.blend(g, clamp(a, 0, 0.3), 'normal', () => {
    for (let k = 0; k < 4; k++) px.rect(g, 0, Math.round(r.H * (0.3 + k * 0.14)), r.W, Math.round(r.H * 0.12), '#9aa8c8');
  }));
};
// the floodlights of the night ground: four pylons at the corners of the field, each lighting the outfield
G.drawNightLights = (r, match) => {
  if (!G.mapGround || G.mapGround.light !== 'night') return;
  const spots = [[G.W.PX - 320, G.W.SY - 160], [G.W.PX + 320, G.W.SY - 160], [G.W.PX - 320, G.W.BY + 160], [G.W.PX + 320, G.W.BY + 160]];
  for (const [x, y] of spots) {
    r.queue(x, y, 0, g => {
      const p = r.w(x, y, 0), q = r.w(x, y, 90);
      px.line(g, p[0], p[1], q[0], q[1], '#3a3a4a', 3);
      px.rect(g, q[0] - 5, q[1] - 3, 10, 5, '#fff4dc');
    }, { bias: -1 });
    game.lights.add(x, y, 90, 220, 0.75, { color: '#fff4dc' });
  }
};
// fireworks: bursts of sparks in the sky over the ground, for a six at night and the fireworks chaos
G.fireworks = [];
G.addFirework = (x, y) => G.fireworks.push({ x, y, t: 1.6, col: ['#ffd23a', '#ff6b6b', '#7ad0ff', '#ffffff'][Math.floor(G.rng.cosmetic() * 4)] });
G.drawFireworks = r => {
  for (const f of G.fireworks) {
    const k = 1 - f.t / 1.6, p = r.w(f.x, f.y, 60 + 40 * Math.sin(k * PI));
    r.overlay(g => {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU, d = 4 + 14 * k;
        px.rect(g, p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d * 0.6, 1, 1, f.col);
      }
    });
  }
};
// the Owl-Eye: the ball's recorded path as a tube of dots, the pitching and impact markers, and the three lights
G.drawOwlEye = (r, match) => {
  const rv = match && match.reviewable;
  if (!rv || match.phase !== 'dead' || !match.path || !match.path.length) return;
  const path = match.path, pitch = match.pitchAt;
  const lit = {
    pitching: !!pitch && Math.abs(pitch.x - G.W.PX) <= 14,
    impact: rv.truth === 'out',
    wickets: rv.call === 'out'
  };
  r.overlay(g => {
    for (let i = 0; i < path.length; i += 2) {
      const p = r.w(path[i].x, path[i].y, path[i].z);
      px.rect(g, p[0], p[1], 2, 2, i > path.length - 20 ? '#ffffff' : '#7ad0ff');
    }
    if (pitch) { const p = r.w(pitch.x, pitch.y, 0); px.disc(g, p[0], p[1], 3, '#ffd23a'); }
    E.ui.box(g, 6, 40, 92, 52, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.9 });
    E.font.text(g, 'OWL-EYE', 12, 44, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    [['PITCHING', lit.pitching], ['IMPACT', lit.impact], ['WICKETS', lit.wickets]].forEach(([label, on], k) => {
      px.disc(g, 14, 58 + k * 10, 3, on ? '#5fd38a' : '#ff6b6b');
      E.font.text(g, label, 22, 55 + k * 10, '#e8e0f0', { font: 'tiny', outline: '#0b0814' });
    });
    E.font.text(g, rv.call === 'out' ? 'THE CALL: OUT' : 'THE CALL: NOT OUT', 12, 84, '#ffffff', { font: 'tiny', outline: '#0b0814' });
  });
};
// the umpire's signal, a move from the engine, for a wicket (the arm up) or a boundary (a sweep, or both arms for a six)
G.umpireSignal = null;
G.signalFor = ev => {
  if (ev === 'wicket') G.umpireSignal = { move: 'overhead', t: 1.1 };
  else if (ev === 'six') G.umpireSignal = { move: 'cast', t: 1.1 };
  else if (ev === 'four') G.umpireSignal = { move: 'cross', t: 1.0 };
};

// the umpire's own rig: his signals (the engine's moves) and his stance in between
G.umpireTick = (dt, match) => {
  const u = G.umpireRig();
  let attack = null;
  if (G.umpireSignal) {
    G.umpireSignal.t -= dt;
    if (G.umpireSignal.t <= 0) G.umpireSignal = null;
    else attack = E.move(G.umpireSignal.move, clamp(1 - G.umpireSignal.t / 1.1, 0, 1), 'active');
  }
  u.update(dt, { x: G.W.PX + 30, y: G.W.BOWL_CREASE + 24, z: 0, vx: 0, vy: 0, facing: PI / 2, attack });
};
